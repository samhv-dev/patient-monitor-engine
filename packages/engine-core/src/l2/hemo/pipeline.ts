// Stage 2 haemodynamic pipeline: the per-tick work the engine calls after the ECG (brief §3.3 tick order):
//   L1 targets (l1/state.ts) → per-beat core (beat records → LV/RV ejections, CVP waves, pleth pulses; M1–M3)
//   → circulation RK4 at 2 ms (circulation.ts) → lines/transducers (line.ts) → 125 Hz ring-buffer samples
//   → L3: pulse detection, pressure numerics, PI/PR, NIBP cycle → events (measurement, state, nibp, alarm).
// Reads the rhythm engine ONLY through its beat/atrial records (never edits l2/ecg). All state is plain data.
import { l1Flags, l1Value, pinVar, releaseVar, setL1Target, STATE_SCHEMA, STATE_VARS, validateTarget, type L1State } from '../../l1/state.ts';
import { rampValue, type RampState } from '../../l1/ramp.ts';
import { createNibpState, nibpCommand, nibpNextIn, nibpOnPulse, nibpStep, AUTO_INTERVALS_MIN, type NibpOut, type NibpState } from '../../l3/nibp/nibp.ts';
import { createWaveNumerics, numericsStep, piNumeric, pressureNumerics, prNumeric, type WaveNumerics } from '../../l3/pressure-numerics/numerics.ts';
import { prSource } from '../../l3/pulse/detector.ts';
import type { Sfc32State, StreamName } from '../../rng/sfc32.ts';
import type { AbpSite, HemoClinicalEvent, LineSensorState, NibpSite, PressureChannel, Spo2Site } from '../../types-hemo.ts';
import type { ChannelId, Command, EngineEvent, Measured, NumericId, PatientProfile, Ramp, StateVar } from '../../types.ts';
import { addPlethPulse, createPlethState, plethAt, plethDelayS, prunePleth, setPlethSensor, type PlethState } from '../pleth/pleth.ts';
import { createCvpState, cvpOnBeat, cvpOnP, pruneCvp, type CvpState } from './cvp.ts';
import { applyLineEvent, createLineState, displaySample, lineActive, lineInput, LINE_SENSOR_STATES, setLineSensor, stepTransducer, validateLineEvent, type LineState } from './line.ts';
import { ARREST_AFTER_S, CPR_DUTY, CPR_SV_FRAC, G_MAX, gainCeiling, HEMO_RATE, H_S, PULSELESS_RHYTHMS, SUBSTEPS, SV_REF_ML } from './params.ts';
import { createTracker, isReferenceBeat, trackBeat, type TrackerState } from './tracker.ts';
import { createOut, type CircOut } from '../circ/circuit.ts'; // Stage 7a
import { circOnAtrial, circOnBeat, createCircModel, stepCircModel, type CircBeat, type CircEnv, type CircModelState } from '../circ/model.ts'; // Stage 7a
import { DEFAULT_PROFILE, type CircProfile, type ConditionId } from '../circ/profile.ts'; // Stage 7a
import { H_S as CIRC_H, P_PL0 } from '../circ/params.ts'; // Stage 7a

export const HEMO_CHANNELS = ['abp', 'cvp', 'pap', 'pleth'] as const satisfies readonly ChannelId[];
export type HemoChannel = (typeof HEMO_CHANNELS)[number];
const DT = 1 / HEMO_RATE;
const SYS_LIMITS = { gMin: 0.1, gMax: G_MAX, rMin: 0.3, rMax: 4 };
const PA_LIMITS = { gMin: 0.1, gMax: 3, rMin: 0.02, rMax: 0.6 };
const WEDGE_TAU_S = 0.7; // crossfade within 1–2 beats (brief §4.2 PAP)
const SPO2_SITES: readonly string[] = ['leftFinger', 'rightFinger', 'ear', 'forehead', 'finger'];
const ABP_SITES: readonly string[] = ['leftRadial', 'rightRadial', 'femoral'];
const NIBP_SITES: readonly string[] = ['rightArm', 'leftArm', 'leg'];
if (H_S !== CIRC_H) throw new Error('hemo and circ steps differ');

/** Stage 7a: aortic root → radial transport delay as a 2 ms delay line (Stage 2 RADIAL_DELAY_S 0.045 → 22 steps). */
export const RAD_DELAY_STEPS = 22;

/** Stage 7a: PatientProfile → CircProfile (R22 minimal layer; unknown condition ids are ignored). */
export function circProfileOf(profile: PatientProfile | undefined): CircProfile {
  const known: readonly string[] = ['hfref', 'hfpef', 'htn', 'as', 'ar', 'mr', 'ms', 'tr', 'cad', 'betaBlocked', 'rvFailure', 'ph'];
  return {
    ageY: profile?.ageY ?? DEFAULT_PROFILE.ageY,
    sex: profile?.sex ?? DEFAULT_PROFILE.sex,
    weightKg: profile?.weightKg ?? DEFAULT_PROFILE.weightKg,
    conditions: (profile?.conditions ?? []).filter((c) => known.includes(c.id)).map((c) => ({ ...c, id: c.id as ConditionId })),
  };
}

/** What the pipeline reads from the rhythm engine (structural, so l2/ecg stays untouched). */
export interface RhythmView {
  id: string;
  records: readonly EngineEvent[];
}

export interface HemoCtx {
  l1: L1State;
  hr: RampState;
  rhythm: RhythmView;
  rng: Record<StreamName, Sfc32State>;
  phi: number; // respiratory phase shared with the ECG's RSA (hrv.phi)
  u?: (t: number) => number; // Stage 3 seam: the respiratory driver's breath signal (replaces breathU when present)
  pIt?: (t: number) => number; // Stage 7a: continuous pleural pressure (mmHg); absent → resting −4
  requestHr?: (bpm: number) => void; // Stage 7a: MODELED mode drives the rhythm engine's rate (Task 15)
}

export interface SiteBeatStat {
  t: number;
  sbp: number;
  dbp: number;
  map: number;
  ref: boolean; // may drive the M2 tracker
  cpr: boolean; // a chest compression, not a heartbeat
  sv: number;
  dur: number;
}

export interface HemoState {
  m: number; // next 125 Hz sample index to generate
  circ: CircModelState; // Stage 7a: the circulation (L1-owned integrator, audit A4)
  circOut: CircOut; // Stage 7a: algebraic outputs at the last 2 ms step
  radQ: number[]; // Stage 7a: radial delay line (RAD_DELAY_STEPS + 1 values)
  beatT: number; // Stage 7a: onset time of the last CircBeat turned into a site beat
  sys: TrackerState;
  pul: TrackerState;
  prevRef: boolean; // the previous beat was a reference beat
  pv: number; // venous (CVP mean truth) = systemic P_floor
  pla: number; // pulmonary outflow pressure (PAWP truth)
  beatSeq: number;
  lastPT: number;
  lastBeatT: number;
  lastRR: number;
  lastEjT: number;
  lastSite: SiteBeatStat;
  siteBeats: SiteBeatStat[]; // last 16 completed site beats (tests, NIBP truth)
  cvp: CvpState;
  pleth: PlethState;
  lines: Record<PressureChannel, LineState>;
  abpSite: AbpSite;
  cpr: { active: boolean; rate: number; quality: number; nextT: number };
  wedge: { on: boolean; w: number };
  num: { abp: WaveNumerics; pap: WaveNumerics; pleth: WaveNumerics; cvpAvg: number };
  nibp: NibpState;
  out: EngineEvent[];
}

function lineStateOf(v: string | undefined): LineSensorState {
  return v && (LINE_SENSOR_STATES as readonly string[]).includes(v) ? (v as LineSensorState) : 'none';
}
function spo2Site(site: string | undefined): Spo2Site | undefined {
  if (site === undefined) return undefined;
  return site === 'finger' ? 'leftFinger' : (site as Spo2Site);
}

export function createHemoState(profile: PatientProfile | undefined, l1: L1State, hr0: number): HemoState {
  const sbp = l1Value(l1, 'sbp', 0);
  const dbp = l1Value(l1, 'dbp', 0);
  const cvp = l1Value(l1, 'cvp', 0);
  const pawp = l1Value(l1, 'pawp', 0);
  const pas = l1Value(l1, 'papSys', 0);
  const pad = l1Value(l1, 'papDia', 0);
  const map = dbp + 0.4 * (sbp - dbp);
  const pam = pad + 0.4 * (pas - pad);
  const flow = (SV_REF_ML * Math.max(30, hr0)) / 60;
  const sens = profile?.sensors ?? {};
  const spo2 = sens.spo2 === 'off' || sens.spo2 === 'motion' ? sens.spo2 : 'on';
  const circ = createCircModel(circProfileOf(profile)); // Stage 7a
  return {
    m: 0,
    circ, circOut: createOut(), radQ: new Array<number>(RAD_DELAY_STEPS + 1).fill(circ.s[0] as number), beatT: -1,
    sys: createTracker(Math.min(4, Math.max(0.3, (map - cvp) / flow))),
    pul: createTracker(Math.min(0.6, Math.max(0.02, (pam - pawp) / flow))),
    prevRef: true, pv: cvp, pla: pawp,
    beatSeq: -1, lastPT: -1e12, lastBeatT: -1, lastRR: 60 / Math.max(30, hr0), lastEjT: 0,
    lastSite: { t: 0, sbp, dbp, map, ref: true, cpr: false, sv: SV_REF_ML, dur: 60 / Math.max(30, hr0) }, siteBeats: [],
    cvp: createCvpState(),
    pleth: createPlethState(spo2),
    lines: { abp: createLineState(lineStateOf(sens.abp)), cvp: createLineState(lineStateOf(sens.cvp)), pap: createLineState(lineStateOf(sens.pap)) },
    abpSite: 'leftRadial',
    cpr: { active: false, rate: 110, quality: 1, nextT: 0 },
    wedge: { on: false, w: 0 },
    num: { abp: createWaveNumerics(3), pap: createWaveNumerics(1.5), pleth: createWaveNumerics(0.03), cvpAvg: cvp },
    nibp: createNibpState(sens.nibp === 'off' ? 'off' : 'on'),
    out: [],
  };
}

/** Channels that currently have a trace (brief §6.2: 'none' = no trace; pleth is flat when the probe is off). */
export function hemoChannelActive(hs: HemoState, ch: HemoChannel): boolean {
  return ch === 'pleth' ? true : lineActive(hs.lines[ch]);
}

function isArrested(hs: HemoState, t: number): boolean {
  return t - hs.circ.lastEjT > Math.max(ARREST_AFTER_S, 2.2 * hs.lastRR); // Stage 7a: from the aortic valve
}

function sameLimb(a: AbpSite | Spo2Site, cuff: NibpSite): boolean {
  return ((a === 'leftRadial' || a === 'leftFinger') && cuff === 'leftArm') || ((a === 'rightRadial' || a === 'rightFinger') && cuff === 'rightArm');
}

/** Fraction of the pulse that passes a cuff at pressure `cuff` (1 = no occlusion) [ENG]. */
function passFraction(hs: HemoState, cuff: number): number {
  const s = hs.lastSite;
  return Math.min(1, Math.max(0, (s.sbp - cuff) / Math.max(1, s.sbp - s.dbp)));
}

// --- per-beat core ------------------------------------------------------------------------------------
/** Stage 7a: the beat schedules a ventricular activation; SV, PP, PESP and AF effects emerge (decisions 11/13). */
function onBeat(hs: HemoState, ctx: HemoCtx, b: Extract<EngineEvent, { type: 'beat' }>): void {
  const rr = hs.lastBeatT >= 0 ? Math.max(0.15, b.t - hs.lastBeatT) : hs.lastRR;
  const perfused = !PULSELESS_RHYTHMS.has(ctx.rhythm.id) && b.mech.perfused;
  circOnBeat(hs.circ, b.t, 60 / rr, b.origin, perfused);
  hs.lastBeatT = b.t;
  hs.lastRR = rr;
  cvpOnBeat(hs.cvp, b.t, b.qrsMs, b.qtMs, rr);
}

function intake(hs: HemoState, ctx: HemoCtx): void {
  for (const r of ctx.rhythm.records) {
    if (r.type === 'atrial') {
      if ((r.kind === 'p' || r.kind === 'retrograde' || r.kind === 'paced') && r.t > hs.lastPT) {
        hs.lastPT = r.t;
        cvpOnP(hs.cvp, r.t);
        circOnAtrial(hs.circ, r.t); // Stage 7a: atrial kick; AF ('fib') and flutter records give none
      }
    } else if (r.type === 'beat' && r.seq > hs.beatSeq) {
      hs.beatSeq = r.seq;
      onBeat(hs, ctx, r);
    }
  }
}

/** Stage 7a: CPR as pressures on the circuit arrives in Task 17; this keeps the cycle clock and the pleth pulses. */
function planCompressions(hs: HemoState, ctx: HemoCtx, until: number): void {
  const c = hs.cpr;
  while (c.active && c.nextT <= until) {
    const dur = (CPR_DUTY * 60) / c.rate;
    addPlethPulse(hs.pleth, c.nextT + plethDelayS(hs.pleth.site), l1Value(ctx.l1, 'pi', c.nextT) * CPR_SV_FRAC * c.quality, dur, hs.circ.p.rSys);
    c.nextT += 60 / c.rate;
  }
}

const zeroFn = () => 0;
/** Stage 7a: the circulation's environment for one sample (pleural input; CPR and devices arrive in Tasks 17, 20–21). */
function circEnv(hs: HemoState, ctx: HemoCtx): CircEnv {
  void hs;
  return { pIt: ctx.pIt ?? (() => P_PL0), cprCardiac: zeroFn, cprThoracic: zeroFn, qVad: () => 0, qAortaSrc: zeroFn, modeled: ctx.l1.mode === 'modeled' };
}

/** Stage 7a: a completed CircBeat → site beat (tracker, NIBP), pleth pulse (Task 13 fills this in). */
function onCircBeat(hs: HemoState, ctx: HemoCtx, cb: CircBeat, t: number): void {
  const beat: SiteBeatStat = { t: cb.t, sbp: cb.sbp, dbp: cb.dbp, map: cb.map, ref: false, cpr: false, sv: cb.sv, dur: cb.dur };
  hs.lastSite = beat;
  hs.siteBeats.push(beat);
  if (hs.siteBeats.length > 16) hs.siteBeats.shift();
  void ctx;
  void t;
}

// --- events -------------------------------------------------------------------------------------------
function nibpEvents(hs: HemoState, outs: NibpOut[], t: number): void {
  for (const o of outs) {
    if (o.kind === 'failed') {
      hs.out.push({ type: 'alarm', t, id: 'nibp-failed', priority: 'low', category: 'technical', state: 'raised', text: o.text });
    } else if (o.kind === 'cuff') {
      hs.out.push({ type: 'nibp', t, phase: o.phase, cuffMmHg: Math.round(o.cuff) });
    } else {
      const e: EngineEvent = { type: 'nibp', t, phase: o.phase, cuffMmHg: Math.round(o.cuff) };
      if (o.nextInS !== undefined) e.nextInS = o.nextInS;
      if (o.result) {
        e.result = { sys: o.result.sys, dia: o.result.dia, map: o.result.map, pr: o.result.pr };
        hs.out.push(e);
        hs.out.push({
          type: 'measurement', t,
          values: {
            nibpSys: { value: o.result.sys, flag: 'valid', at: t },
            nibpDia: { value: o.result.dia, flag: 'valid', at: t },
            nibpMean: { value: o.result.map, flag: 'valid', at: t },
          },
        });
        continue;
      }
      hs.out.push(e);
    }
  }
}

function overrides(hs: HemoState, t: number): StateVar[] {
  const out: StateVar[] = [];
  const arrested = isArrested(hs, t);
  if (arrested || hs.sys.saturated || (hs.lastBeatT >= 0 && t - hs.sys.lastRefT > 5)) out.push('sbp', 'dbp');
  if (arrested) out.push('cvp', 'pi');
  if (arrested || hs.pul.saturated) out.push('papSys', 'papDia');
  return out;
}

function emitSecond(hs: HemoState, ctx: HemoCtx, t: number): void {
  const v: Partial<Record<NumericId, Measured>> = {};
  if (lineActive(hs.lines.abp)) {
    const p = pressureNumerics(hs.num.abp, t);
    v.abpSys = p.sys;
    v.abpDia = p.dia;
    v.abpMean = p.mean;
  }
  if (lineActive(hs.lines.pap)) {
    const p = pressureNumerics(hs.num.pap, t);
    v.papSys = p.sys;
    v.papDia = p.dia;
    v.papMean = p.mean;
  }
  if (lineActive(hs.lines.cvp)) v.cvpMean = { value: hs.num.cvpAvg, flag: 'valid', at: t };
  const src = prSource(hs.pleth.state, lineActive(hs.lines.abp));
  v.pr = src === 'pleth' ? prNumeric(hs.num.pleth, t) : src === 'abp' ? prNumeric(hs.num.abp, t) : { value: null, flag: 'invalid', at: t };
  v.pi = hs.pleth.state === 'on' ? piNumeric(hs.num.pleth, t) : { value: null, flag: 'invalid', at: t };
  hs.out.push({ type: 'measurement', t, values: v });

  const values: Partial<Record<StateVar, number>> = {};
  for (const s of STATE_VARS) values[s] = s === 'hr' ? rampValue(ctx.hr, t) : l1Value(ctx.l1, s, t);
  values.svr = hs.circ.p.rSys; // Stage 7a
  hs.out.push({ type: 'state', t, tick: Math.round(t * 50), mode: 'manual', values, control: l1Flags(ctx.l1, t, ctx.hr, overrides(hs, t)) });
  if (hs.nibp.phase === 'idle') {
    const next = nibpNextIn(hs.nibp, t);
    if (next !== undefined) hs.out.push({ type: 'nibp', t, phase: 'idle', nextInS: Math.round(next) });
  }
}

// --- the tick -----------------------------------------------------------------------------------------
/**
 * Generate 125 Hz samples up to and including absolute index `mEnd` (= floor(ECG end index / 4)), so sample m
 * belongs to time m/125 exactly like the ECG's absolute indexing (brief §3.3). `write(ch, m, v)` stores a
 * displayed sample in the engine's ring buffer.
 */
export function advanceHemo(hs: HemoState, ctx: HemoCtx, mEnd: number, write: (ch: HemoChannel, m: number, v: number) => void): void {
  if (mEnd < hs.m) return;
  intake(hs, ctx);
  planCompressions(hs, ctx, mEnd / HEMO_RATE + 0.3);
  const ab = hs.lines.abp;
  const cv = hs.lines.cvp;
  const pa = hs.lines.pap;
  const nouts: NibpOut[] = [];
  for (; hs.m <= mEnd; hs.m++) {
    const m = hs.m;
    const t1 = m / HEMO_RATE;
    const t0 = t1 - DT;
    hs.wedge.w += ((hs.wedge.on ? 1 : 0) - hs.wedge.w) * (1 - Math.exp(-DT / WEDGE_TAU_S));
    const cuff = hs.nibp.cuff;
    const abpPass = cuff > 0 && sameLimb(hs.abpSite, hs.nibp.site) ? passFraction(hs, cuff) : 1;
    const atCatheter = (p: number) => (abpPass >= 1 ? p : abpPass * p + (1 - abpPass) * Math.min(cuff, hs.lastSite.map));
    const wedged = (p: number) => (hs.wedge.w < 1e-3 ? p : (1 - hs.wedge.w) * p + hs.wedge.w * hs.circOut.pPv); // Stage 7a: wedge = pulmonary venous (LA) pressure
    if (m > 0) {
      const env = circEnv(hs, ctx);
      for (let j = 0; j < SUBSTEPS; j++) {
        const ta = t0 + j * H_S;
        const tb = ta + H_S;
        const o = hs.circOut;
        const pr0 = hs.radQ[0] as number;
        const pa0 = o.pPaRoot;
        const cv0 = o.pRa;
        stepCircModel(hs.circ, tb, env, o);
        hs.radQ.push(o.pRad);
        hs.radQ.shift();
        const pr1 = hs.radQ[0] as number;
        if (ab.sensor !== 'none') stepTransducer(ab, lineInput(ab, atCatheter(pr0), ta), lineInput(ab, atCatheter(pr1), tb), H_S);
        if (pa.sensor !== 'none') stepTransducer(pa, lineInput(pa, wedged(pa0), ta), lineInput(pa, wedged(o.pPaRoot), tb), H_S);
        if (cv.sensor !== 'none') stepTransducer(cv, lineInput(cv, cv0, ta), lineInput(cv, o.pRa, tb), H_S);
      }
      hs.pv = hs.circOut.pRa; // Stage 7a: the Stage 2 consumers' venous/PAWP truths come from the chambers
      hs.pla = hs.circOut.pPv;
    }
    // Stage 7a: completed CircBeats → site beats (tracker, NIBP, pleth)
    for (const cb of hs.circ.beats) {
      if (cb.t <= hs.beatT) continue;
      hs.beatT = cb.t;
      onCircBeat(hs, ctx, cb, t1);
    }
    // displayed samples + L3
    if (ab.sensor !== 'none') {
      const v = displaySample(ab);
      write('abp', m, v);
      numericsStep(hs.num.abp, m, v);
    }
    if (pa.sensor !== 'none') {
      const v = displaySample(pa);
      write('pap', m, v);
      numericsStep(hs.num.pap, m, v);
    }
    if (cv.sensor !== 'none') {
      const v = displaySample(cv);
      write('cvp', m, v);
      hs.num.cvpAvg += (v - hs.num.cvpAvg) * (1 - Math.exp(-DT / 2)); // 2 s mean [ENG]
    }
    const plethPass = cuff > 0 && sameLimb(hs.pleth.site, hs.nibp.site) ? passFraction(hs, cuff) : 1;
    const pl = plethAt(hs.pleth, t1, plethPass, l1Value(ctx.l1, 'pi', t1));
    write('pleth', m, pl);
    if (hs.pleth.state !== 'off') numericsStep(hs.num.pleth, m, pl);
    // NIBP cuff
    nouts.length = 0;
    nibpStep(hs.nibp, t1, DT, ctx.rng.measurement, nouts);
    if (nouts.length) nibpEvents(hs, nouts, t1);
    if (m > 0 && m % HEMO_RATE === 0) emitSecond(hs, ctx, t1);
  }
  const tNow = mEnd / HEMO_RATE;
  prunePleth(hs.pleth, tNow - 0.1);
  pruneCvp(hs.cvp, tNow - 0.1, isArrested(hs, tNow));
}

// --- commands -----------------------------------------------------------------------------------------
/** Validation hook. Returns a rejection reason, undefined (accepted) or null (not a Stage 2 command). */
export function validateHemoCommand(cmd: Command, hs: HemoState): string | undefined | null {
  switch (cmd.type) {
    case 'setTarget':
      return cmd.variable === 'hr' ? null : validateTarget(cmd.variable, cmd.value, cmd.ramp);
    case 'pin':
      return validateTarget(cmd.variable, cmd.value, cmd.ramp);
    case 'release':
      return cmd.variable === 'all' || cmd.variable in STATE_SCHEMA ? undefined : `unknown state variable ${String(cmd.variable)}`;
    case 'setMode':
      return cmd.mode === 'manual' ? undefined : 'MODELED mode arrives in Stage 7';
    case 'applyEvent': {
      const ev = cmd.event as { kind: string };
      if (ev.kind === 'line') return validateLineEvent(cmd.event as Extract<HemoClinicalEvent, { kind: 'line' }>);
      if (ev.kind === 'cpr') {
        const c = cmd.event as Extract<HemoClinicalEvent, { kind: 'cpr' }>;
        if (c.rate !== undefined && !(c.rate >= 60 && c.rate <= 150)) return 'cpr rate must be 60–150/min';
        if (c.quality !== undefined && !(c.quality >= 0 && c.quality <= 1.5)) return 'cpr quality must be 0–1.5';
        return undefined;
      }
      return null;
    }
    case 'attachSensor': {
      const { sensor, state, site } = cmd;
      if (sensor === 'abp' || sensor === 'cvp' || sensor === 'pap') {
        if (!(LINE_SENSOR_STATES as readonly string[]).includes(state)) return `${sensor} state must be ${LINE_SENSOR_STATES.join(', ')}`;
        if (site !== undefined && (sensor !== 'abp' || !ABP_SITES.includes(site))) return `site must be one of ${ABP_SITES.join(', ')} (abp only)`;
        return undefined;
      }
      if (sensor === 'spo2') {
        if (!['on', 'off', 'motion'].includes(state)) return 'spo2 state must be on, off or motion';
        return site === undefined || SPO2_SITES.includes(site) ? undefined : `spo2 site must be one of ${SPO2_SITES.join(', ')}`;
      }
      if (sensor === 'nibp') {
        if (!['on', 'off'].includes(state)) return 'nibp state must be on or off';
        return site === undefined || NIBP_SITES.includes(site) ? undefined : `nibp site must be one of ${NIBP_SITES.join(', ')}`;
      }
      return `${sensor} sensor is not implemented until Stage ${sensor === 'ecg' ? 4 : 3}`;
    }
    case 'device': {
      const a = cmd.action;
      if (a.device !== 'nibp') return null;
      if (!['start', 'stat', 'stop', 'auto'].includes(a.action)) return 'nibp action must be start, stat, stop or auto';
      if (a.action !== 'stop' && hs.nibp.sensor !== 'on') return 'cuff not connected';
      if (a.intervalMin !== undefined && !(AUTO_INTERVALS_MIN as readonly number[]).includes(a.intervalMin)) {
        return `intervalMin must be one of ${AUTO_INTERVALS_MIN.join(', ')}`;
      }
      return undefined;
    }
    default:
      return null;
  }
}

/** Apply hook. Returns true when the command was a Stage 2 command. `setHr` retargets the Stage 1 hr ramp. */
export function applyHemoCommand(
  hs: HemoState,
  l1: L1State,
  cmd: Command,
  t: number,
  setHr: (value: number, ramp?: Ramp) => void,
  rng: Record<StreamName, Sfc32State>,
): boolean {
  switch (cmd.type) {
    case 'setTarget':
      if (cmd.variable === 'hr') return false;
      setL1Target(l1, cmd.variable, t, cmd.value, cmd.ramp);
      return true;
    case 'pin':
      if (cmd.value !== undefined) {
        if (cmd.variable === 'hr') setHr(cmd.value, cmd.ramp);
        else setL1Target(l1, cmd.variable, t, cmd.value, cmd.ramp);
      }
      pinVar(l1, cmd.variable);
      return true;
    case 'release':
      releaseVar(l1, cmd.variable);
      return true;
    case 'setMode':
      return true;
    case 'applyEvent': {
      const ev = cmd.event as HemoClinicalEvent | { kind: string };
      if (ev.kind === 'line') {
        const le = ev as Extract<HemoClinicalEvent, { kind: 'line' }>;
        if (le.action === 'wedge') hs.wedge.on = (le.value ?? 1) !== 0;
        else applyLineEvent(hs.lines[le.line], le, t);
        return true;
      }
      if (ev.kind === 'cpr') {
        const c = ev as Extract<HemoClinicalEvent, { kind: 'cpr' }>;
        if (c.active) {
          const was = hs.cpr.active;
          hs.cpr = { active: true, rate: c.rate ?? 110, quality: c.quality ?? 1, nextT: was ? hs.cpr.nextT : t };
        } else {
          hs.cpr.active = false;
        }
        return true;
      }
      return false;
    }
    case 'attachSensor': {
      const { sensor, state, site } = cmd;
      if (sensor === 'abp' || sensor === 'cvp' || sensor === 'pap') {
        if (sensor === 'abp' && site !== undefined) hs.abpSite = site as AbpSite;
        const pNow = sensor === 'abp' ? (hs.circ.s[0] as number) : sensor === 'cvp' ? hs.circOut.pRa : hs.circOut.pPaRoot; // Stage 7a
        setLineSensor(hs.lines[sensor], state as LineSensorState, t, pNow);
        return true;
      }
      if (sensor === 'spo2') {
        setPlethSensor(hs.pleth, state as PlethState['state'], spo2Site(site), rng.artefact);
        return true;
      }
      if (sensor === 'nibp') {
        hs.nibp.sensor = state as 'on' | 'off';
        if (site !== undefined) hs.nibp.site = site as NibpSite;
        if (state === 'off') {
          const outs: NibpOut[] = [];
          nibpCommand(hs.nibp, 'stop', t, undefined, outs);
          nibpEvents(hs, outs, t);
        }
        return true;
      }
      return false;
    }
    case 'device': {
      const a = cmd.action;
      if (a.device !== 'nibp') return false;
      const outs: NibpOut[] = [];
      nibpCommand(hs.nibp, a.action, t, a.intervalMin, outs);
      nibpEvents(hs, outs, t);
      return true;
    }
    default:
      return false;
  }
}
