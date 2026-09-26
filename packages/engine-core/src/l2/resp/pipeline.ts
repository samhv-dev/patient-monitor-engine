// Stage 3 respiratory pipeline: the per-tick work the engine calls BEFORE the haemodynamics (brief §3.3 order):
//   driver cycles → 10 Hz gas exchange (O2 store/ODC/shunt, 2-compartment CO2, circulatory delay, SpO2 chain),
//   1 Hz temperature → 62.5 Hz co2 (sampled capnogram) and resp (impedance) samples → L3 numerics → events
//   (breath, lungState, measurement, alarm) and L1 coupled truths (spo2, etco2, rr, vt, fio2, shunt, tempCore,
//   and the mean-airway-pressure coupling on cvp/sbp/dbp/volumeStatus).
// Reads Stage 2's HemoState (CO, pleth feet, PI, cuff, CPR) and never writes it. All state is plain data.
import { l1Target, setL1Target, type L1State } from '../../l1/state.ts';
import type { RampState } from '../../l1/ramp.ts';
import { co2NumStep, co2Numerics, createCo2Num, type Co2Num } from '../../l3/co2-numerics/co2-numerics.ts';
import { createImpNum, impedanceSample, impRr, impStep, type ImpNum } from '../../l3/resp/impedance.ts';
import { createSpo2, spo2Measured, stepSpo2, type Spo2State } from '../../l3/spo2/spo2.ts';
import { createTempNum, tempMeasured, tempNumStep, type TempNum } from '../../l3/temp/temp-numerics.ts';
import { piNumeric } from '../../l3/pressure-numerics/numerics.ts';
import { normal, seedStream } from '../../rng/sfc32.ts';
import type { AirwayState, RespClinicalEvent, TempSite, VentSource } from '../../types-resp.ts';
import type { VentFrameExt } from '../../types-vent-link.ts'; // Stage V
import type { ChannelId, Command, EngineEvent, NumericId, Measured, PatientProfile } from '../../types.ts';
import { airwayCo2, createSampler, CO2_RATE, sampleCo2, type CapnoCtx, type SamplerState } from '../co2/capno.ts';
import { cardiacOutput } from '../gas/coupling.ts';
import { pleuralPressureMmHg } from '../circ/pleural.ts'; // Stage 7a
import { createCo2State, etco2True, lowFlowFactor, stepCo2, vaForPaco2, type Co2State } from '../gas/co2.ts';
import { createDelay, delayStep, siteDelay, type DelayLine } from '../gas/delay.ts';
import { o2Steady, solveShunt, stepO2, type O2Inputs, type O2State } from '../gas/o2.ts';
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, CO_REF_LPM, GA_METABOLIC, GAS_DT_S, gasPatient, PA_ET_GRADIENT, tempFactor, type GasPatient } from '../gas/params.ts';
import type { HemoState, RhythmView } from '../hemo/pipeline.ts';
import { createTemp, MH_VCO2_FACTOR, mhFactor, setCoreTarget, stepTemp, type TempState } from '../temp/temp.ts';
import {
  alveolarVentilation, breathSignal, chestVolume, checkDrive, createDriver, cycleAt, nominalRate,
  onVentFrame, planCycles, preoxActive, pruneCycles, replan, type DriverCtx, type DriverState,
} from './driver.ts';

export const RESP_CHANNELS = ['co2', 'resp'] as const satisfies readonly ChannelId[];
export type RespChannel = (typeof RESP_CHANNELS)[number];
export const RESP_RATE = CO2_RATE; // 62.5 Hz
const DT = 1 / RESP_RATE;
const PLAN_AHEAD_S = 0.6; // cycles exist this far ahead: Stage 2 plans beats ≈ 0.25 s ahead and reads u(t)
const KEEP_S = 15; // history kept for the sidestream delay, u(t − 2·RR) and the 10 s EtCO2 window
const CO2_WARMUP_S = 10; // brief §6.2 [ENG]
const AIRWAYS: readonly AirwayState[] = ['patent', 'obstructed', 'apnoea', 'disconnected', 'oesophageal', 'endobronchial', 'bronchospasm'];
const SOURCES: readonly VentSource[] = ['spontaneous', 'bvm', 'ventilator', 'none'];
const TEMP_SITES: readonly TempSite[] = ['oesophageal', 'nasopharyngeal', 'tympanic', 'bladder', 'rectal', 'axilla'];
const LOSS: readonly AirwayState[] = ['obstructed', 'disconnected', 'oesophageal'];

export interface RespCtx {
  l1: L1State;
  hemo: HemoState;
  rhythm: RhythmView;
  hr: RampState;
}

export interface RespState {
  m: number; // next 62.5 Hz sample index
  gasK: number; // next gas step (time gasK·0.1 s)
  pat: GasPatient;
  driver: DriverState;
  o2: O2State;
  co2: Co2State;
  delay: DelayLine;
  temp: TempState;
  shunt: number; // model shunt (MANUAL-calibrated or the `shunt` input)
  etco2: number; // current true EtCO2
  coRatio: number;
  seen: { spo2: number; etco2: number; shunt: number; tempCore: number }; // last targets acted on
  sampler: SamplerState;
  co2Sensor: 'off' | 'warmup' | 'on';
  warmUntil: number;
  tempSensor: 'off' | 'on';
  tempSite: TempSite;
  num: { co2: Co2Num; imp: ImpNum; spo2: Spo2State; temp: TempNum };
  beats: number[];
  beatSeq: number;
  shownCo2: number;
  lungKey: string;
  out: EngineEvent[];
}

export function createRespState(profile: PatientProfile | undefined, l1: L1State, seed: number): RespState {
  const pat = gasPatient(profile);
  const rng = seedStream(seed, 'resp'); // its own stream: drawing here never shifts Stage 1/2 streams (brief §3.3)
  const sens = profile?.sensors ?? {};
  const t0 = l1Target(l1, 'tempCore', 0);
  const rs: RespState = {
    m: 0, gasK: 0, pat, driver: createDriver(rng),
    o2: { fa: 0.14, cv: 140, sa: 0.97, pao2: 95 },
    co2: createCo2State(l1Target(l1, 'etco2', 0) + PA_ET_GRADIENT),
    delay: createDelay(l1Target(l1, 'spo2', 0) / 100),
    temp: createTemp(t0, pat.effKg),
    shunt: l1Target(l1, 'shunt', 0), etco2: l1Target(l1, 'etco2', 0), coRatio: 1,
    seen: { spo2: Number.NaN, etco2: Number.NaN, shunt: l1Target(l1, 'shunt', 0), tempCore: t0 },
    sampler: createSampler('sidestream', (profile?.ageY ?? 40) < 28 / 365),
    co2Sensor: sens.co2 === 'on' || sens.co2 === 'warmup' ? 'on' : 'off', warmUntil: 0,
    tempSensor: sens.temp === 'off' ? 'off' : 'on', tempSite: 'axilla',
    num: {
      co2: createCo2Num(), imp: createImpNum(),
      spo2: createSpo2(l1Target(l1, 'spo2', 0) / 100, Math.max(-2, Math.min(2, normal(rng)))), // bias ±2–3 % RMS [ENG]
      temp: createTempNum(t0),
    },
    beats: [], beatSeq: -1, shownCo2: 0, lungKey: '', out: [],
  };
  return rs;
}

// --- helpers ----------------------------------------------------------------------------------------------
function driverCtx(rs: RespState, l1: L1State, t: number): DriverCtx {
  return { rr: l1Target(l1, 'rr', t), vt: l1Target(l1, 'vt', t), fio2: l1Target(l1, 'fio2', t), etco2: rs.etco2, complianceMl: compliance(rs) };
}
function compliance(rs: RespState): number {
  return rs.pat.complianceMl * (rs.driver.airway === 'endobronchial' ? 0.5 : 1);
}
function deadSpace(rs: RespState): number {
  const mech = rs.driver.source !== 'spontaneous' && rs.driver.source !== 'none';
  return rs.pat.deadSpaceMl + (mech ? apparatusDeadSpaceMl(rs.pat.weightKg) : 0) + rs.co2.vdExtraMl;
}
function extraGradient(rs: RespState): number {
  return rs.driver.airway === 'bronchospasm' ? 8 * rs.driver.severity : 0; // Pa − Et widens with obstruction [ENG]
}
function extraShunt(rs: RespState): number {
  const a = rs.driver.airway;
  return a === 'endobronchial' ? 0.25 : a === 'bronchospasm' ? 0.05 * rs.driver.severity : 0; // research 03 §8.7 [ENG]
}
function currentFio2(rs: RespState, l1: L1State, t: number): number {
  const d = rs.driver;
  if (preoxActive(d, t)) return (d.preox as { fio2: number }).fio2;
  if (d.source === 'external' && d.ext) return d.ext.fio2;
  const c = cycleAt(d, t);
  return c ? c.fio2 : l1Target(l1, 'fio2', t);
}
function sameLimbCuff(h: HemoState): boolean {
  const s = h.pleth.site;
  return h.nibp.cuff > 0 && ((s === 'leftFinger' && h.nibp.site === 'leftArm') || (s === 'rightFinger' && h.nibp.site === 'rightArm'));
}

/** The seam Stage 2 reads: u(t) (see driver.breathSignal). */
export function respBreathU(rs: RespState, t: number): number {
  return breathSignal(rs.driver, t, compliance(rs));
}

/** Stage 7a seam: continuous pleural pressure (mmHg) for the circulation (audit R-B). */
export function respPleural(rs: RespState, t: number): number {
  return pleuralPressureMmHg(rs.driver, t, compliance(rs));
}

/** Metabolic factor: temperature, MH and general anaesthesia (brief §4.3, §4.9 conditions). */
function metabolic(rs: RespState, t: number): number {
  return tempFactor(rs.temp.tc) * mhFactor(rs.temp, t, MH_VCO2_FACTOR) * (rs.temp.anaesthesia === 'general' ? GA_METABOLIC : 1);
}

function o2Inputs(rs: RespState, l1: L1State, t: number, vaLpm: number): O2Inputs {
  const a = rs.driver.airway;
  const open = a === 'patent' || a === 'apnoea' || a === 'disconnected' || a === 'bronchospasm' || a === 'endobronchial';
  const ga = rs.temp.anaesthesia === 'general';
  return {
    vaLpm, fio2: currentFio2(rs, l1, t),
    massFlowFio2: vaLpm > 0 || !open ? null : preoxActive(rs.driver, t) ? (rs.driver.preox as { fio2: number }).fio2 : 0.21,
    qLpm: rs.coRatio * CI_LPM_PER_KG * rs.pat.effKg, vo2: rs.pat.vo2 * metabolic(rs, t), shunt: Math.min(0.9, rs.shunt + extraShunt(rs)),
    paco2: rs.co2.pf, tempC: rs.temp.tc, frcMl: ga ? rs.pat.frcGaMl : rs.pat.frcMl, bloodL: rs.pat.bloodL,
  };
}

/** Nominal alveolar ventilation of the current settings (MANUAL calibration). */
function nominalVa(rs: RespState, l1: L1State, t: number): number {
  const n = nominalRate(rs.driver, driverCtx(rs, l1, t));
  return (n.rr * Math.max(0, n.vt - deadSpace(rs))) / 1000;
}

// --- 10 Hz gas step ----------------------------------------------------------------------------------------
function gasStep(rs: RespState, ctx: RespCtx, t: number): void {
  const l1 = ctx.l1;
  const h = ctx.hemo;
  const d = rs.driver;
  checkDrive(d, t);
  rs.coRatio = cardiacOutput(h, t) / CO_REF_LPM;
  // temperature at 1 Hz; MANUAL tempCore target places the model (plan decision 2)
  if (rs.gasK % 10 === 0) {
    const tc = l1Target(l1, 'tempCore', t);
    if (tc !== rs.seen.tempCore) {
      setCoreTarget(rs.temp, tc);
      rs.seen.tempCore = tc;
    }
    stepTemp(rs.temp, t, 1);
    tempNumStep(rs.num.temp, rs.temp.sites, rs.tempSite, 1);
  }
  const vco2 = rs.pat.vco2 * metabolic(rs, t);
  // MANUAL etco2 target → physiological dead space that holds it at the current settings (decision 2)
  const etT = l1Target(l1, 'etco2', t);
  if (etT !== rs.seen.etco2) {
    rs.seen.etco2 = etT;
    const n = nominalRate(d, driverCtx(rs, l1, t));
    rs.co2.flow = lowFlowFactor(rs.coRatio); // calibrate against the settled low-flow factor
    const pf = etT / Math.max(0.05, rs.co2.flow) + PA_ET_GRADIENT + extraGradient(rs);
    if (n.rr > 0) {
      const base = deadSpace(rs) - rs.co2.vdExtraMl;
      const need = n.vt - (vaForPaco2(vco2, pf) * 1000) / n.rr;
      rs.co2.vdExtraMl = Math.min(0.8 * n.vt, Math.max(-0.5 * rs.pat.deadSpaceMl, need - base));
    }
    rs.co2.pf = pf;
    rs.co2.ps = pf;
  }
  const va = alveolarVentilation(d, t, deadSpace(rs));
  stepCo2(rs.co2, { vaLpm: va, vco2, coRatio: rs.coRatio, cf: rs.pat.cf, cs: rs.pat.cs, kfs: rs.pat.kfs, extraGradient: extraGradient(rs) }, GAS_DT_S);
  rs.etco2 = etco2True(rs.co2, extraGradient(rs));
  // MANUAL shunt input and spo2 target (spo2 wins when both change; decision 2)
  const sh = l1Target(l1, 'shunt', t);
  if (sh !== rs.seen.shunt) {
    rs.seen.shunt = sh;
    rs.shunt = sh;
  }
  const spT = l1Target(l1, 'spo2', t);
  if (spT !== rs.seen.spo2) {
    rs.seen.spo2 = spT;
    const x = o2Inputs(rs, l1, t, Math.max(0.3, nominalVa(rs, l1, t)));
    rs.shunt = Math.max(0, solveShunt(x, spT / 100) - extraShunt(rs));
    const ss = o2Steady({ ...x, shunt: rs.shunt + extraShunt(rs) }, rs.shunt + extraShunt(rs));
    if (ss && (va > 0 || rs.gasK === 0)) Object.assign(rs.o2, ss);
  }
  stepO2(rs.o2, o2Inputs(rs, l1, t, va), GAS_DT_S);
  const pinned = l1.pinned.includes('spo2');
  const sa = pinned ? spT / 100 : rs.o2.sa; // M5: an instructor pin on spo2 disables autoDesat
  const piM = piNumeric(h.num.pleth, t);
  const siteSa = delayStep(rs.delay, sa, siteDelay(h.pleth.site, rs.coRatio, piM.value), GAS_DT_S);
  stepSpo2(rs.num.spo2, {
    siteSa, probe: h.pleth.state, lastFootT: h.num.pleth.feet[h.num.pleth.feet.length - 1] ?? -1e12,
    pi: piM.value, cuffOnLimb: sameLimbCuff(h), cpr: h.cpr.active,
  }, t);
  // coupled truths (brief §4.9: the `state` event shows truth; flags show 'override' when it departs from target)
  // Stage 7a: heart–lung interaction is emergent through respPleural(); the MANUAL mean-Paw coupling is retired
  // (decision 8). Clear any coupled truths a restored pre-7a snapshot might carry.
  const c = (l1.coupled ??= {});
  delete c.cvp;
  delete c.sbp;
  delete c.dbp;
  delete c.volumeStatus;
  const n = nominalRate(d, driverCtx(rs, l1, t));
  c.spo2 = sa * 100;
  c.etco2 = rs.etco2;
  c.fio2 = currentFio2(rs, l1, t);
  c.shunt = Math.min(0.9, rs.shunt + extraShunt(rs));
  c.tempCore = rs.temp.tc;
  if (d.source === 'spontaneous' && d.airway !== 'apnoea') {
    delete c.rr; // the spontaneous driver breathes at the rr/vt targets
    delete c.vt;
  } else {
    const breathing = d.source !== 'none' && d.source !== 'spontaneous';
    c.rr = breathing ? n.rr : 0;
    c.vt = breathing ? n.vt : 0;
  }
  lungStateEvent(rs, t);
  if (rs.gasK % 10 === 0 && rs.gasK > 0) emitSecond(rs, t);
}

function lungStateEvent(rs: RespState, t: number): void {
  const d = rs.driver;
  const sev = d.severity;
  const ev = {
    complianceMlPerCmH2O: Math.round(compliance(rs)),
    resistanceCmH2OPerLps: Math.round(rs.pat.resistance * (d.airway === 'bronchospasm' ? 1 + 3 * sev : 1)),
    effort: d.source === 'spontaneous' ? 1 : Math.round(d.cleft * 100) / 100,
    autoPeepTendency: d.airway === 'bronchospasm' ? Math.round(80 * sev) / 100 : 0,
    shunt: Math.round(Math.min(0.9, rs.shunt + extraShunt(rs)) * 100) / 100,
    deadSpaceMl: Math.round(deadSpace(rs)),
    frcMl: Math.round(rs.temp.anaesthesia === 'general' ? rs.pat.frcGaMl : rs.pat.frcMl),
  };
  const key = JSON.stringify(ev);
  if (key === rs.lungKey) return;
  rs.lungKey = key;
  rs.out.push({ type: 'lungState', t, ...ev });
}

function emitSecond(rs: RespState, t: number): void {
  const v: Partial<Record<NumericId, Measured>> = { spo2: spo2Measured(rs.num.spo2, t) };
  if (rs.co2Sensor === 'on') Object.assign(v, co2Numerics(rs.num.co2, t, rs.shownCo2));
  else if (rs.co2Sensor === 'warmup') for (const k of ['etco2', 'imco2', 'awrr'] as const) v[k] = { value: null, flag: 'invalid', at: t };
  v.rr = impRr(rs.num.imp, t);
  v.tempCore = tempMeasured(rs.num.temp.t1, rs.tempSensor === 'on', t);
  v.tempSite = tempMeasured(rs.num.temp.t2, rs.tempSensor === 'on', t);
  rs.out.push({ type: 'measurement', t, values: v });
}

function alarm(rs: RespState, t: number, id: string, raised: boolean, text: string): void {
  rs.out.push({ type: 'alarm', t, id, priority: 'high', category: 'physiological', state: raised ? 'raised' : 'cleared', text });
}

// --- the tick ----------------------------------------------------------------------------------------------
/**
 * Generate 62.5 Hz samples up to and including absolute index `mEnd` (= floor(ECG end index / 8)); sample m
 * belongs to time m/62.5 (brief §3.3). `write(ch, m, v)` stores a displayed sample.
 */
export function advanceResp(rs: RespState, ctx: RespCtx, mEnd: number, write: (ch: RespChannel, m: number, v: number) => void): void {
  if (mEnd < rs.m) return;
  for (const r of ctx.rhythm.records) {
    if (r.type === 'beat' && r.seq > rs.beatSeq) {
      rs.beatSeq = r.seq;
      if (r.mech.perfused) rs.beats.push(r.t);
    }
  }
  const tEnd = mEnd / RESP_RATE;
  planCycles(rs.driver, driverCtx(rs, ctx.l1, tEnd), tEnd + PLAN_AHEAD_S);
  for (const c of rs.driver.cycles) {
    const ext = rs.driver.source === 'external' && rs.driver.ext?.inInsp && c === rs.driver.cycles[rs.driver.cycles.length - 1];
    if (!c.emitted && c.exch && c.vt > 0 && !ext) {
      c.emitted = true;
      rs.out.push({ type: 'breath', t: c.t0, seq: c.seq, kind: c.kind, tiS: c.ti, teS: c.te, vtMl: Math.round(c.vt), etco2True: Math.round(rs.etco2 * 10) / 10 });
    }
  }
  const h = ctx.hemo;
  const cap: CapnoCtx = { etco2: rs.etco2, beats: rs.beats, cpr: { active: h.cpr.active, rate: h.cpr.rate, quality: h.cpr.quality, anchor: h.cpr.nextT } };
  const air = (t: number) => airwayCo2(rs.driver, t, cap);
  for (; rs.m <= mEnd; rs.m++) {
    const m = rs.m;
    const t = m / RESP_RATE;
    while (rs.gasK * GAS_DT_S <= t + 1e-9) {
      gasStep(rs, ctx, rs.gasK * GAS_DT_S);
      rs.gasK++;
      cap.etco2 = rs.etco2;
    }
    if (rs.co2Sensor !== 'off') {
      if (rs.co2Sensor === 'warmup' && t >= rs.warmUntil) rs.co2Sensor = 'on';
      const y = sampleCo2(rs.sampler, t, air);
      const shown = rs.co2Sensor === 'on' ? y : 0;
      rs.shownCo2 = shown;
      write('co2', m, shown);
      if (rs.co2Sensor === 'on') {
        const ev = co2NumStep(rs.num.co2, t, shown, DT);
        if (ev === 'apnoea') alarm(rs, t, 'apnoea-co2', true, 'APNEA');
        else if (ev === 'resumed') alarm(rs, t, 'apnoea-co2', false, 'APNEA');
      }
    }
    const imp = impedanceSample(chestVolume(rs.driver, t), t, rs.beats);
    write('resp', m, imp);
    const ie = impStep(rs.num.imp, t, imp, DT);
    if (ie === 'apnoea') alarm(rs, t, 'apnoea-resp', true, 'APNEA (RESP)');
    else if (ie === 'resumed') alarm(rs, t, 'apnoea-resp', false, 'APNEA (RESP)');
  }
  pruneCycles(rs.driver, tEnd - KEEP_S);
  while (rs.beats.length > 0 && (rs.beats[0] as number) < tEnd - 5) rs.beats.shift();
}

// --- commands ----------------------------------------------------------------------------------------------
const num = (name: string, v: number | undefined, lo: number, hi: number) =>
  v === undefined || (Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be a finite number in ${lo}–${hi}`;

/** Validation hook. Returns a rejection reason, undefined (accepted) or null (not a Stage 3 command). */
export function validateRespCommand(cmd: Command): string | undefined | null {
  if (cmd.type === 'externalDrive') {
    const f = cmd.frame;
    if (cmd.source !== 'ventilator') return "externalDrive source must be 'ventilator'";
    if (!f) return 'externalDrive needs a frame';
    return num('pawCmH2O', f.pawCmH2O, -30, 150) ?? num('flowLps', f.flowLps, -20, 20) ?? num('volumeMl', f.volumeMl, -100, 4000)
      ?? num('fio2', f.fio2, 0.21, 1) ?? num('peepCmH2O', f.peepCmH2O, 0, 40) ?? num('palvCmH2O', (f as VentFrameExt).palvCmH2O, -30, 150) ?? (f.pawCmH2O === undefined || f.flowLps === undefined ? 'frame needs pawCmH2O and flowLps' : undefined);
  }
  if (cmd.type === 'attachSensor') {
    if (cmd.sensor === 'co2') {
      if (!['off', 'warmup', 'on'].includes(cmd.state)) return 'co2 state must be off, warmup or on';
      return cmd.sampling === undefined || cmd.sampling === 'sidestream' || cmd.sampling === 'mainstream' ? undefined : 'sampling must be sidestream or mainstream';
    }
    if (cmd.sensor === 'temp') {
      if (!['off', 'on'].includes(cmd.state)) return 'temp state must be off or on';
      return cmd.site === undefined || (TEMP_SITES as readonly string[]).includes(cmd.site) ? undefined : `temp site must be one of ${TEMP_SITES.join(', ')}`;
    }
    return null;
  }
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as RespClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'airway': {
      const a = ev as Extract<RespClinicalEvent, { kind: 'airway' }>;
      return (AIRWAYS as readonly string[]).includes(a.state) ? num('severity', a.severity, 0, a.state === 'bronchospasm' ? 1.25 : 1) : `airway state must be one of ${AIRWAYS.join(', ')}`; // R39-6: bronchospasm 1–1.25 = near-fatal extreme
    }
    case 'ventilation': {
      const v = ev as Extract<RespClinicalEvent, { kind: 'ventilation' }>;
      if (!(SOURCES as readonly string[]).includes(v.source)) return `source must be one of ${SOURCES.join(', ')}`;
      return num('rr', v.rr, 1, 80) ?? num('vtMl', v.vtMl, 10, 1500) ?? num('fio2', v.fio2, 0.21, 1) ?? num('peep', v.peep, 0, 30)
        ?? num('ie', v.ie, 0.5, 4) ?? num('fico2', v.fico2, 0, 30) ?? num('effort', v.effort, 0, 1);
    }
    case 'preoxygenate': {
      const p = ev as Extract<RespClinicalEvent, { kind: 'preoxygenate' }>;
      return num('fio2', p.fio2, 0.21, 1) ?? num('durationS', p.durationS, 1, 3600) ?? (p.fio2 === undefined || p.durationS === undefined ? 'preoxygenate needs fio2 and durationS' : undefined);
    }
    case 'condition': {
      const c = ev as { id: string; severity: number };
      if (['tamponade', 'pe', 'tensionPtx', 'rvInfarct'].includes(c.id)) return null; // Stage 7a: circulation conditions
      return c.id === 'mh' ? num('severity', c.severity, 0, 1) ?? (c.severity === undefined ? 'severity is required' : undefined) : `condition ${c.id} arrives in Stage 7`;
    }
    case 'thermal': {
      const th = ev as Extract<RespClinicalEvent, { kind: 'thermal' }>;
      if (th.anaesthesia !== undefined && !['none', 'general', 'neuraxial'].includes(th.anaesthesia)) return 'anaesthesia must be none, general or neuraxial';
      return num('ambientC', th.ambientC, 5, 40);
    }
    default:
      return null;
  }
}

/** Apply hook. Returns true when the command was a Stage 3 command. */
export function applyRespCommand(rs: RespState, l1: L1State, cmd: Command, t: number): boolean {
  const d = rs.driver;
  const withdraw = (seqs: number[]) => {
    if (seqs.length) rs.out = rs.out.filter((e) => !(e.type === 'breath' && seqs.includes(e.seq)));
  };
  if (cmd.type === 'externalDrive') {
    const wasExt = d.source === 'external';
    if (!wasExt) withdraw(d.cycles.filter((c) => c.t0 > t).map((c) => c.seq));
    onVentFrame(d, cmd.frame, t);
    return true;
  }
  if (cmd.type === 'attachSensor') {
    if (cmd.sensor === 'co2') {
      if (cmd.sampling) rs.sampler.mode = cmd.sampling;
      rs.co2Sensor = cmd.state === 'warmup' ? 'warmup' : cmd.state === 'on' ? 'on' : 'off';
      rs.warmUntil = t + CO2_WARMUP_S;
      return true;
    }
    if (cmd.sensor === 'temp') {
      rs.tempSensor = cmd.state === 'on' ? 'on' : 'off';
      if (cmd.site) rs.tempSite = cmd.site as TempSite;
      return true;
    }
    return false;
  }
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as RespClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'airway': {
      const a = ev as Extract<RespClinicalEvent, { kind: 'airway' }>;
      if (a.state === 'oesophageal' && d.airway !== 'oesophageal') d.gastricN = 0;
      d.airway = a.state;
      d.severity = a.severity ?? 1;
      withdraw(replan(d, t, LOSS.includes(a.state), false));
      return true;
    }
    case 'ventilation': {
      const v = ev as Extract<RespClinicalEvent, { kind: 'ventilation' }>;
      d.source = v.source;
      d.ext = null;
      if (v.source === 'bvm') d.vent = { rr: v.rr ?? 10, vt: v.vtMl ?? 500, peep: 0, ie: v.ie ?? 2 };
      if (v.source === 'ventilator') d.vent = { rr: v.rr ?? d.vent.rr, vt: v.vtMl ?? d.vent.vt, peep: v.peep ?? d.vent.peep, ie: v.ie ?? d.vent.ie };
      if (v.source === 'spontaneous') {
        if (v.rr !== undefined) setL1Target(l1, 'rr', t, v.rr);
        if (v.vtMl !== undefined) setL1Target(l1, 'vt', t, v.vtMl);
      }
      if (v.fio2 !== undefined) setL1Target(l1, 'fio2', t, v.fio2);
      if (v.fico2 !== undefined) d.fico2 = v.fico2;
      if (v.effort !== undefined) d.cleft = v.effort;
      withdraw(replan(d, t, true, true));
      return true;
    }
    case 'preoxygenate': {
      const p = ev as Extract<RespClinicalEvent, { kind: 'preoxygenate' }>;
      d.preox = { fio2: p.fio2, until: t + p.durationS };
      withdraw(replan(d, t, false, false));
      return true;
    }
    case 'condition': {
      if ((ev as { id: string }).id !== 'mh') return false; // Stage 7a: circulation conditions
      const c = ev as { severity: number };
      rs.temp.mh = c.severity > 0 ? { severity: c.severity, t0: t } : null;
      return true;
    }
    case 'thermal': {
      const th = ev as Extract<RespClinicalEvent, { kind: 'thermal' }>;
      if (th.anaesthesia !== undefined) rs.temp.anaesthesia = th.anaesthesia;
      if (th.warming !== undefined) rs.temp.warming = th.warming;
      if (th.ambientC !== undefined) rs.temp.ta = th.ambientC;
      return true;
    }
    default:
      return false;
  }
}

