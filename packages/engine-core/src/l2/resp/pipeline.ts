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
import { CMH2O_TO_MMHG, P_PL0, T_IT } from '../circ/params.ts'; // Stage 7b (Task 26)
import { HEALTHY } from '../../../data/lung-pathology.ts'; // Stage 7b (Task 26)
import { createCo2State, etco2Mixed, lowFlowFactor, stepCo2, vaForPaco2, type Co2State } from '../gas/co2.ts'; // Stage 7b: etco2Mixed
import { createDelay, delayStep, siteDelay, type DelayLine } from '../gas/delay.ts';
import { o2Steady, solveShunt, type O2Inputs, type O2State } from '../gas/o2.ts';
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, CO_REF_LPM, GA_METABOLIC, GAS_DT_S, gasPatient, PA_ET_GRADIENT, tempFactor, type GasPatient } from '../gas/params.ts';
import type { HemoState, RhythmView } from '../hemo/pipeline.ts';
import { createTemp, MH_VCO2_FACTOR, mhFactor, setCoreTarget, stepTemp, type TempState } from '../temp/temp.ts';
import { resolveLung } from '../lung/conditions.ts'; // Stage 7b
import { blockedSides, capnoTerms, createLung, lungGasStep, lungMechStep, shuntFraction, staticCompliance, type LungState, type Mainstem } from '../lung/lung.ts'; // Stage 7b
import { circPtx, circSideFlows, writeCircPvr } from '../lung/circ-link.ts'; // Stage 7b
import { mechParams } from '../lung/side.ts'; // Stage 7b
import { lungStatePayload } from '../lung/state-event.ts'; // Stage 7b
import { LUNG_CONDITION_IDS, type LungClinicalEvent, type LungConditionSpec } from '../../types-lung.ts'; // Stage 7b
import {
  alveolarVentilation, breathSignal, chestVolume, checkDrive, createDriver, cycleAt, frameAt, nominalRate,
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
  lungCore: string; // Stage 7b: the seven Stage 3 fields of the last emission
  lungT: number; // Stage 7b: time of the last emission
  // Stage 7b: the lung module (R43) and what configures it
  lung: LungState;
  lungSpecs: LungConditionSpec[];
  rawEvent: number; // bronchospasm airway multiplier (Q20)
  mainstemCmd: Mainstem | null; // explicit `mainstem` command or Stage 3 endobronchial airway; null = from conditions
  recruit: { p: number; until: number } | null; // sustained-inflation manoeuvre in progress
  circPtx: number; // Stage 7b (Task 26): 7a's own ext.pPtx (mmHg), read at 10 Hz, for the max-combined pleural pressure
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
    beats: [], beatSeq: -1, shownCo2: 0, lungKey: '', lungCore: '', lungT: -1e12, out: [],
    lung: createLung(resolveLung(profile?.lungConditions ?? [], pat.ibwKg).lp, pat.frcGaMl, 0.14, 140), // Stage 7b
    lungSpecs: [...(profile?.lungConditions ?? [])], rawEvent: 1, mainstemCmd: null, recruit: null, circPtx: 0,
  };
  applyLungSpecs(rs); // Stage 7b: mainstem from the profile's conditions
  return rs;
}

// --- helpers ----------------------------------------------------------------------------------------------
function driverCtx(rs: RespState, l1: L1State, t: number): DriverCtx {
  return { rr: l1Target(l1, 'rr', t), vt: l1Target(l1, 'vt', t), fio2: l1Target(l1, 'fio2', t), etco2: rs.etco2, complianceMl: compliance(rs) };
}
function compliance(rs: RespState): number {
  return staticCompliance(rs.lung); // Stage 7b: the lung module (endobronchial ×0.5 now emerges from the mainstem block)
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
  return a === 'bronchospasm' ? 0.05 * rs.driver.severity : 0; // research 03 §8.7 [ENG]; Stage 7b: endobronchial shunt emerges (mainstem block)
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

/** Stage 7b: re-resolve the lung from its condition specs, the bronchospasm multiplier and the mainstem state. */
export function applyLungSpecs(rs: RespState): void {
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.rawEvent);
  const ls = rs.lung;
  ls.lp = r.lp;
  ls.mainstem = rs.mainstemCmd ?? (r.blocked.includes('L') ? 'right' : r.blocked.includes('R') ? 'left' : 'both');
  ls.mp = mechParams(r.lp, ls.aer, blockedSides(ls.mainstem));
}

/** Stage 7b: induction-atelectasis factor by body size (catalogue §10: atel 0.11 at BMI 40 vs 0.06 lean) [ENG]. */
export function inductionFactor(pat: GasPatient): number {
  const bmi = pat.weightKg / (pat.ibwKg > 0 ? (pat.ibwKg / 22) : 1); // ≈ BMI from IBW at BMI 22
  return Math.min(3, 1 + 0.05 * Math.max(0, bmi - 25));
}

/**
 * Stage 7b: how the breath driver drives the lung units at time t. Positive-pressure inspiration and spontaneous
 * inspiration are flow sources (the driver's volume curve); expiration returns to PEEP (ventilator) or 0; a
 * recruitment manoeuvre holds its pressure; external frames: Task 19.
 */
export function lungDrive(rs: RespState, t: number): { mode: 'flow' | 'pressure'; x: number } {
  const d = rs.driver;
  const peep = d.source === 'ventilator' ? d.vent.peep : d.source === 'external' && d.ext ? d.ext.peep : 0;
  if (rs.recruit && t < rs.recruit.until) return { mode: 'pressure', x: rs.recruit.p };
  if (d.source === 'external' && d.ext) {
    const dt = 0.016;
    const q = (frameAt(d.ext, t, 2) - frameAt(d.ext, t - dt, 2)) / dt; // mL/s from the frames' volume
    return q > 50 ? { mode: 'flow', x: q } : { mode: 'pressure', x: d.ext.peep };
  }
  const c = cycleAt(d, t);
  if (!c || !c.exch || t >= c.cutAt || !(c.vt > 0)) return { mode: 'pressure', x: peep };
  const u = t - c.t0;
  if (u >= c.ti) return { mode: 'pressure', x: c.mech ? peep : 0 };
  if (c.mech) return { mode: 'flow', x: c.vt / Math.max(1e-3, c.ti) };
  return { mode: 'flow', x: ((c.vt * Math.PI) / (2 * c.ti)) * Math.sin((Math.PI * u) / c.ti) };
}

/** Stage 7a seam: continuous pleural pressure (mmHg) for the circulation (audit R-B). */
export function respPleural(rs: RespState, t: number): number {
  // Stage 7b (Task 26, R45/R46): 7a's continuous pleural shape, carried by the lung module — the condition's own
  // airway-to-pleura transmission (tIt relative to the healthy 0.4, so a healthy lung keeps 7a's calibrated T_IT 0.65;
  // Q78, catalogue §5/§6/§10), the trapped-gas pressure (auto-PEEP) on the internal ventilator, and the lungs' pleural
  // pressure (effusion, haemothorax, pneumothorax) max-combined with 7a's own ext.pPtx so a scenario that sends both
  // commands (plan decision 14) does not count it twice. External frames already carry the ventilator's alveolar
  // pressure (Stage V palv), so no auto-PEEP term is added there.
  const d = rs.driver;
  const lp = rs.lung.lp;
  const k = lp.tIt / HEALTHY.tIt;
  const base = pleuralPressureMmHg(d, t, compliance(rs));
  let p = P_PL0 + k * (base - P_PL0);
  if (d.source === 'ventilator') p += k * T_IT * Math.max(0, rs.lung.peepTot - d.vent.peep) * CMH2O_TO_MMHG;
  return p + Math.max(0, lp.pPtx - rs.circPtx);
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
  // Stage 7b: the lung module's 10 Hz step (recruitment, HPV, perfusion, CO2 mix, O2 stores) before the CO2 store.
  // Executor deviation (Task 14): it runs BEFORE the MANUAL etco2 calibration, so the calibration at t = 0 already
  // sees the profile's own mixing-point ratios (g, e) rather than the healthy defaults.
  const va0 = alveolarVentilation(d, t, deadSpace(rs));
  const x = o2Inputs(rs, l1, t, va0);
  const ga = rs.temp.anaesthesia === 'general';
  rs.lung.frcGaMl = ga ? rs.pat.frcGaMl : rs.pat.frcMl;
  const side = circSideFlows(h);
  lungGasStep(rs.lung, {
    va: va0, q: side ? (side[0] as number) + (side[1] as number) : x.qLpm, baseShunt: x.shunt, fio2: x.fio2, massFlowFio2: x.massFlowFio2,
    vo2: x.vo2, vco2, paco2: rs.co2.pf, tempC: x.tempC, bloodL: x.bloodL, coRatio: rs.coRatio, ga, indFactor: inductionFactor(rs.pat), volatileMac: 0, sideFlow: side,
    qRef: CI_LPM_PER_KG * rs.pat.effKg, // Stage 7b: reference flow for the CO2 mix (low flow stays Stage 3's φ)
  }, GAS_DT_S);
  writeCircPvr(h, rs.lung.perf.pvrMult, rs.lung.lp.pvr); // Stage 7b: per-lung + global lung PVR (7a R46 seams, duck-typed)
  rs.circPtx = circPtx(h); // Stage 7b (Task 26)
  // MANUAL etco2 target → physiological dead space that holds it at the current settings (decision 2)
  const etT = l1Target(l1, 'etco2', t);
  if (etT !== rs.seen.etco2) {
    rs.seen.etco2 = etT;
    const n = nominalRate(d, driverCtx(rs, l1, t));
    rs.co2.flow = lowFlowFactor(rs.coRatio); // calibrate against the settled low-flow factor
    const pf = (etT / Math.max(0.05, rs.co2.flow) + extraGradient(rs)) / Math.max(0.5, rs.lung.co2.g); // Stage 7b: the mixing point's gap
    if (n.rr > 0) {
      const base = deadSpace(rs) - rs.co2.vdExtraMl;
      const need = n.vt - (vaForPaco2(vco2, pf) / Math.max(0.3, rs.lung.co2.e) * 1000) / n.rr; // Stage 7b: ÷ the lung's elimination efficiency
      rs.co2.vdExtraMl = Math.min(0.8 * n.vt, Math.max(-0.5 * rs.pat.deadSpaceMl, need - base));
    }
    rs.co2.pf = pf;
    rs.co2.ps = pf;
  }
  const va = alveolarVentilation(d, t, deadSpace(rs));
  stepCo2(rs.co2, { vaLpm: va * rs.lung.co2.e, vco2, coRatio: rs.coRatio, cf: rs.pat.cf, cs: rs.pat.cs, kfs: rs.pat.kfs, extraGradient: extraGradient(rs) }, GAS_DT_S);
  rs.etco2 = etco2Mixed(rs.co2, rs.lung.co2.g, extraGradient(rs));
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
    if (ss && (va > 0 || rs.gasK === 0)) { rs.lung.o2.fa = [ss.fa, ss.fa]; rs.lung.o2.cv = ss.cv; } // Stage 7b: place both stores
  }
  // Stage 7b: the O2 truth is the lung's two stores (stepped inside lungGasStep); rs.o2 mirrors it for Stage 3 readers
  const lo = rs.lung.o2;
  rs.o2.sa = lo.sa;
  rs.o2.pao2 = lo.pao2;
  rs.o2.cv = lo.cv;
  rs.o2.fa = (lo.fa[0] as number) * 0.45 + (lo.fa[1] as number) * 0.55;
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
  c.shunt = shuntFraction(rs.lung, Math.min(0.9, rs.shunt + extraShunt(rs))); // Stage 7b
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
  const ev = lungStatePayload(rs.lung, {
    deadSpaceMl: deadSpace(rs), frcMl: rs.temp.anaesthesia === 'general' ? rs.pat.frcGaMl : rs.pat.frcMl,
    effort: d.source === 'spontaneous' ? 1 : d.cleft, peep: d.source === 'ventilator' ? d.vent.peep : d.ext ? d.ext.peep : 0,
    baseShunt: Math.min(0.9, rs.shunt + extraShunt(rs)), specs: rs.lungSpecs,
  }); // Stage 7b: absolute + per-lung fields (decision 15)
  const key = JSON.stringify(ev);
  if (key === rs.lungKey) return;
  // the per-lung fields move slowly but continuously: emit at most once per second unless a Stage 3 field changed
  const core = JSON.stringify([ev.complianceMlPerCmH2O, ev.resistanceCmH2OPerLps, ev.effort, ev.autoPeepTendency, ev.shunt, ev.deadSpaceMl, ev.frcMl]);
  if (core === rs.lungCore && t - rs.lungT < 1) return;
  rs.lungKey = key;
  rs.lungCore = core;
  rs.lungT = t;
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
  // Stage 7b: stamp newly planned cycles with the lung's expiratory τ and capnogram terms
  const ct = capnoTerms(rs.lung);
  for (const c of rs.driver.cycles) {
    if (c.tauE !== undefined) continue;
    c.tauE = Math.max(0.1, rs.lung.tauBar);
    c.lungTauII = ct.tauII;
    c.lungRiseIII = ct.riseIII;
  }
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
    const ld = lungDrive(rs, t); // Stage 7b: mechanics at 250 Hz (4 sub-steps per sample)
    lungMechStep(rs.lung, ld.mode, ld.x, DT);
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
  const ev = cmd.event as RespClinicalEvent | LungClinicalEvent | { kind: string }; // Stage 7b
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
    // Stage 7b (plan decision 11)
    case 'lungCondition': {
      const c = ev as Extract<LungClinicalEvent, { kind: 'lungCondition' }>;
      if (!(LUNG_CONDITION_IDS as readonly string[]).includes(c.id)) return `lungCondition id must be one of ${LUNG_CONDITION_IDS.join(', ')}`;
      if (c.side !== undefined && c.side !== 'L' && c.side !== 'R') return "side must be 'L' or 'R'";
      return num('severity', c.severity, 0, 1) ?? num('recruitFrac', c.recruitFrac, 0, 1) ?? (c.severity === undefined ? 'severity is required' : undefined);
    }
    case 'mainstem': {
      const m = ev as Extract<LungClinicalEvent, { kind: 'mainstem' }>;
      return ['both', 'left', 'right'].includes(m.ventilated) ? undefined : "ventilated must be 'both', 'left' or 'right'";
    }
    case 'recruit': {
      const p = ev as Extract<LungClinicalEvent, { kind: 'recruit' }>;
      return num('pressureCmH2O', p.pressureCmH2O, 20, 60) ?? num('durationS', p.durationS, 1, 60) ?? (p.pressureCmH2O === undefined || p.durationS === undefined ? 'recruit needs pressureCmH2O and durationS' : undefined);
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
  const ev = cmd.event as RespClinicalEvent | LungClinicalEvent | { kind: string }; // Stage 7b
  switch (ev.kind) {
    case 'airway': {
      const a = ev as Extract<RespClinicalEvent, { kind: 'airway' }>;
      if (a.state === 'oesophageal' && d.airway !== 'oesophageal') d.gastricN = 0;
      d.airway = a.state;
      d.severity = a.severity ?? 1;
      // Stage 7b: endobronchial is a mainstem block (its shunt/compliance emerge); bronchospasm raises airway R (Q20)
      rs.mainstemCmd = a.state === 'endobronchial' ? 'right' : rs.mainstemCmd === 'right' ? null : rs.mainstemCmd;
      rs.rawEvent = a.state === 'bronchospasm' ? 1 + 5 * Math.min(1, d.severity) ** 1.5 : 1;
      applyLungSpecs(rs);
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
    case 'lungCondition': {
      const c = ev as Extract<LungClinicalEvent, { kind: 'lungCondition' }>;
      const same = (s: { id: string; side?: string }) => s.id === c.id && (s.side ?? null) === (c.side ?? null);
      const next = { id: c.id, severity: c.severity, ...(c.side ? { side: c.side } : {}), ...(c.recruitFrac !== undefined ? { recruitFrac: c.recruitFrac } : {}) };
      const i = rs.lungSpecs.findIndex(same);
      if (c.severity <= 0) rs.lungSpecs = rs.lungSpecs.filter((s) => !same(s));
      else if (i >= 0) rs.lungSpecs[i] = next;
      else rs.lungSpecs.push(next);
      applyLungSpecs(rs);
      return true;
    }
    case 'mainstem': {
      const m = ev as Extract<LungClinicalEvent, { kind: 'mainstem' }>;
      rs.mainstemCmd = m.ventilated === 'both' ? null : m.ventilated;
      applyLungSpecs(rs);
      return true;
    }
    case 'recruit': {
      const p = ev as Extract<LungClinicalEvent, { kind: 'recruit' }>;
      rs.recruit = { p: p.pressureCmH2O, until: t + p.durationS };
      return true;
    }
    default:
      return false;
  }
}

