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
import { paPressure, radialPressure, restState, stepCirculation, type CircInputs } from './circulation.ts';
import { createCvpState, cvpAt, cvpOnBeat, cvpOnP, cvpWavesAt, pruneCvp, type CvpState } from './cvp.ts';
import { makePulse, prunePulses, type Pulse } from './ejection.ts';
import { applyLineEvent, createLineState, displaySample, lineActive, lineInput, LINE_SENSOR_STATES, setLineSensor, stepTransducer, validateLineEvent, type LineState } from './line.ts';
import {
  ARREST_AFTER_S, BACKFLOW_FRAC, EJECTION_SKEW, FS_CARRY, RADIAL_DELAY_S, CPR_DUTY, CPR_QUALITY_DEFAULT, CPR_SV_FRAC, CPR_THORACIC_MMHG, ejectionFactor, G_MAX, gainCeiling,
  gHyp, HEMO_RATE, H_S, KAPPA, lvetS, pepS, pmsf, PULSELESS_RHYTHMS, respFactor, RV_LVET_EXTRA_S, RV_PEP_LEAD_S,
  SUBSTEPS, SV_REF_ML, VENOUS_TAU_S,
} from './params.ts';
import { createTracker, isReferenceBeat, trackBeat, type TrackerState } from './tracker.ts';

export const HEMO_CHANNELS = ['abp', 'cvp', 'pap', 'pleth'] as const satisfies readonly ChannelId[];
export type HemoChannel = (typeof HEMO_CHANNELS)[number];
const DT = 1 / HEMO_RATE;
const SYS_LIMITS = { gMin: 0.1, gMax: G_MAX, rMin: 0.3, rMax: 4 };
const PA_LIMITS = { gMin: 0.1, gMax: 3, rMin: 0.02, rMax: 0.6 };
const WEDGE_TAU_S = 0.7; // crossfade within 1–2 beats (brief §4.2 PAP)
const SPO2_SITES: readonly string[] = ['leftFinger', 'rightFinger', 'ear', 'forehead', 'finger'];
const ABP_SITES: readonly string[] = ['leftRadial', 'rightRadial', 'femoral'];
const NIBP_SITES: readonly string[] = ['rightArm', 'leftArm', 'leg'];

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
}

interface Win {
  t0: number;
  ref: boolean;
  cpr: boolean;
  sv: number;
  max: number;
  min: number;
  sum: number;
  n: number;
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

type Open = { t: number; ref: boolean; cpr: boolean; sv: number };

export interface HemoState {
  m: number; // next 125 Hz sample index to generate
  circ: number[];
  sys: TrackerState;
  pul: TrackerState;
  lv: Pulse[];
  rv: Pulse[];
  thorArt: Pulse[];
  thorCen: Pulse[];
  opens: Open[];
  opensPa: Open[];
  win: Win | null;
  winPa: Win | null;
  missed: number; // mL the previous beat failed to eject (Frank–Starling carry-over)
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
  return {
    m: 0,
    circ: restState(map, pam),
    sys: createTracker(Math.min(4, Math.max(0.3, (map - cvp) / flow))),
    pul: createTracker(Math.min(0.6, Math.max(0.02, (pam - pawp) / flow))),
    lv: [], rv: [], thorArt: [], thorCen: [], opens: [], opensPa: [],
    win: null, winPa: null,
    missed: 0, prevRef: true, pv: cvp, pla: pawp,
    beatSeq: -1, lastPT: -1e12, lastBeatT: -1, lastRR: 60 / Math.max(30, hr0), lastEjT: 0,
    lastSite: { t: 0, sbp, dbp, map, ref: true, cpr: false, sv: SV_REF_ML, dur: 60 / Math.max(30, hr0) }, siteBeats: [],
    cvp: createCvpState(),
    pleth: createPlethState(spo2),
    lines: { abp: createLineState(lineStateOf(sens.abp)), cvp: createLineState(lineStateOf(sens.cvp)), pap: createLineState(lineStateOf(sens.pap)) },
    abpSite: 'leftRadial',
    cpr: { active: false, rate: 110, quality: CPR_QUALITY_DEFAULT, nextT: 0 },
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
  return t - hs.lastEjT > Math.max(ARREST_AFTER_S, 2.2 * hs.lastRR);
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
function onBeat(hs: HemoState, ctx: HemoCtx, b: Extract<EngineEvent, { type: 'beat' }>): void {
  const t = b.t;
  const rr = hs.lastBeatT >= 0 ? Math.max(0.15, t - hs.lastBeatT) : hs.lastRR;
  hs.lastBeatT = t;
  hs.lastRR = rr;
  cvpOnBeat(hs.cvp, t, b.qrsMs, b.qtMs, rr);
  // M1: rhythm → pulse. PEA/VF/asystole have no mechanical output; E(k) maps k_rhythm to ejection.
  const k = PULSELESS_RHYTHMS.has(ctx.rhythm.id) || !b.mech.perfused ? 0 : b.mech.kSV;
  const e = ejectionFactor(k);
  const resp = respFactor(t, rr, ctx.phi, gHyp(l1Value(ctx.l1, 'volumeStatus', t)), ctx.u); // M6 (PPV); Stage 3 seam: ctx.u
  const nominal = SV_REF_ML * hs.sys.g * resp; // what a normal beat would eject now
  if (e <= 0) {
    hs.missed = nominal; // no upstroke: pulse deficit (brief §4.8); the volume stays for the next beat
    hs.prevRef = false;
    return;
  }
  const carry = e * FS_CARRY * hs.missed; // the residual raises EDV; the beat ejects its usual fraction of it
  const sv = nominal * e + carry;
  const steady = isReferenceBeat(e, carry, nominal, b.origin === 'ventricular');
  const ref = hs.prevRef && steady; // two steady beats in a row
  hs.prevRef = steady;
  hs.missed = Math.max(0, nominal - sv);
  const hr = 60 / rr;
  const pep = pepS(hr); // M3: PEP and LVET follow HR
  const lvet = Math.max(lvetS(hr), b.mech.lvetMs / 1000);
  const kappa = KAPPA * Math.min(1.5, Math.max(0.5, l1Value(ctx.l1, 'contractility', t)));
  const t0 = t + pep + RADIAL_DELAY_S; // radial time: aortic valve opening + transport delay
  hs.lv.push(makePulse(t0, lvet, sv, kappa, BACKFLOW_FRAC, EJECTION_SKEW));
  hs.opens.push({ t: t0, ref, cpr: false, sv });
  hs.lastEjT = t0;
  const t0p = t + pep - RV_PEP_LEAD_S;
  const svp = (sv * hs.pul.g) / hs.sys.g; // RV SV follows the LV beat (same E, resp, carry-over)
  hs.rv.push(makePulse(t0p, lvet + RV_LVET_EXTRA_S, svp, 1, BACKFLOW_FRAC, EJECTION_SKEW));
  hs.opensPa.push({ t: t0p, ref, cpr: false, sv: svp });
  addPlethPulse(hs.pleth, t + pep + plethDelayS(hs.pleth.site), (l1Value(ctx.l1, 'pi', t) * sv) / (SV_REF_ML * hs.sys.g), lvet, hs.sys.R);
}

function intake(hs: HemoState, ctx: HemoCtx): void {
  for (const r of ctx.rhythm.records) {
    if (r.type === 'atrial') {
      if (r.kind === 'p' && r.t > hs.lastPT) {
        hs.lastPT = r.t;
        cvpOnP(hs.cvp, r.t);
      }
    } else if (r.type === 'beat' && r.seq > hs.beatSeq) {
      hs.beatSeq = r.seq;
      onBeat(hs, ctx, r);
    }
  }
}

/** CPR pump (brief §4.2 "Compressions"): flow into the arterial AND venous compartments + thoracic pressure. */
function planCompressions(hs: HemoState, ctx: HemoCtx, until: number): void {
  const c = hs.cpr;
  while (c.active && c.nextT <= until) {
    const tc = c.nextT;
    const dur = (CPR_DUTY * 60) / c.rate;
    const sv = SV_REF_ML * CPR_SV_FRAC * c.quality;
    hs.lv.push({ ...makePulse(tc + RADIAL_DELAY_S, dur, sv, 1, 0), cpr: true });
    hs.rv.push({ ...makePulse(tc, dur, sv, 1, 0), cpr: true });
    hs.thorArt.push({ t0: tc + RADIAL_DELAY_S, dur, qpk: CPR_THORACIC_MMHG * c.quality, kappa: 1, skew: 1, back: 0, cpr: true });
    hs.thorCen.push({ t0: tc, dur, qpk: CPR_THORACIC_MMHG * c.quality, kappa: 1, skew: 1, back: 0, cpr: true });
    hs.opens.push({ t: tc + RADIAL_DELAY_S, ref: false, cpr: true, sv });
    addPlethPulse(hs.pleth, tc + plethDelayS(hs.pleth.site), l1Value(ctx.l1, 'pi', tc) * CPR_SV_FRAC * c.quality, dur, hs.sys.R);
    c.nextT += 60 / c.rate;
  }
}

// --- site beats (true radial) → M2 tracker and NIBP --------------------------------------------------
function closeWin(hs: HemoState, ctx: HemoCtx, t: number): void {
  const w = hs.win;
  if (!w || w.n < 10) return;
  const beat: SiteBeatStat = { t: w.t0, sbp: w.max, dbp: w.min, map: w.sum / w.n, ref: w.ref, cpr: w.cpr, sv: w.sv, dur: t - w.t0 };
  hs.lastSite = beat;
  hs.siteBeats.push(beat);
  if (hs.siteBeats.length > 16) hs.siteBeats.shift();
  const target = { sbp: l1Value(ctx.l1, 'sbp', w.t0), dbp: l1Value(ctx.l1, 'dbp', w.t0) };
  trackBeat(hs.sys, beat, target, hs.pv, SYS_LIMITS, gainCeiling(hs.lastRR));
  nibpOnPulse(hs.nibp, t, beat, hs.cpr.active || beat.cpr, ctx.rng.measurement);
}

function closeWinPa(hs: HemoState, ctx: HemoCtx, t: number): void {
  const w = hs.winPa;
  if (!w || w.n < 10) return;
  const beat = { t: w.t0, sbp: w.max, dbp: w.min, map: w.sum / w.n, ref: w.ref, sv: w.sv, dur: t - w.t0 };
  trackBeat(hs.pul, beat, { sbp: l1Value(ctx.l1, 'papSys', w.t0), dbp: l1Value(ctx.l1, 'papDia', w.t0) }, hs.pla, PA_LIMITS, gainCeiling(hs.lastRR));
}

const newWin = (o: Open): Win => ({ t0: o.t, ref: o.ref, cpr: o.cpr, sv: o.sv, max: -Infinity, min: Infinity, sum: 0, n: 0 });

function accumulate(w: Win | null, p: number): void {
  if (!w) return;
  if (p > w.max) w.max = p;
  if (p < w.min) w.min = p;
  w.sum += p;
  w.n++;
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
  values.svr = hs.sys.R;
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
  const s = hs.circ;
  const ab = hs.lines.abp;
  const cv = hs.lines.cvp;
  const pa = hs.lines.pap;
  const nouts: NibpOut[] = [];
  for (; hs.m <= mEnd; hs.m++) {
    const m = hs.m;
    const t1 = m / HEMO_RATE;
    const t0 = t1 - DT;
    const arrested = isArrested(hs, t1);
    const vs = l1Value(ctx.l1, 'volumeStatus', t1);
    const relax = 1 - Math.exp(-DT / VENOUS_TAU_S);
    hs.pv += ((arrested ? pmsf(vs) : l1Value(ctx.l1, 'cvp', t1)) - hs.pv) * relax;
    hs.pla += ((arrested ? pmsf(vs) : l1Value(ctx.l1, 'pawp', t1)) - hs.pla) * relax;
    hs.wedge.w += ((hs.wedge.on ? 1 : 0) - hs.wedge.w) * (1 - Math.exp(-DT / WEDGE_TAU_S));
    const cuff = hs.nibp.cuff;
    const abpPass = cuff > 0 && sameLimb(hs.abpSite, hs.nibp.site) ? passFraction(hs, cuff) : 1;
    const atCatheter = (p: number) => (abpPass >= 1 ? p : abpPass * p + (1 - abpPass) * Math.min(cuff, hs.lastSite.map));
    const wedged = (p: number, t: number) => (hs.wedge.w < 1e-3 ? p : (1 - hs.wedge.w) * p + hs.wedge.w * (hs.pla + 1.3 * cvpWavesAt(hs.cvp, t)));
    const x: CircInputs = { lv: hs.lv, rv: hs.rv, thor: hs.thorArt, pFloor: hs.pv, pawp: hs.pla, R: hs.sys.R, Rp: hs.pul.R };
    if (m > 0) {
      for (let j = 0; j < SUBSTEPS; j++) {
        const ta = t0 + j * H_S;
        const tb = ta + H_S;
        const pr0 = ab.sensor !== 'none' ? radialPressure(s, ta, x) : 0;
        const pa0 = pa.sensor !== 'none' ? paPressure(s, ta, x) : 0;
        stepCirculation(s, ta, H_S, x);
        if (ab.sensor !== 'none') stepTransducer(ab, lineInput(ab, atCatheter(pr0), ta), lineInput(ab, atCatheter(radialPressure(s, tb, x)), tb), H_S);
        if (pa.sensor !== 'none') stepTransducer(pa, lineInput(pa, wedged(pa0, ta), ta), lineInput(pa, wedged(paPressure(s, tb, x), tb), tb), H_S);
        if (cv.sensor !== 'none') {
          stepTransducer(cv, lineInput(cv, cvpAt(hs.cvp, ta, hs.pv, ctx.phi, hs.thorCen, ctx.u), ta), lineInput(cv, cvpAt(hs.cvp, tb, hs.pv, ctx.phi, hs.thorCen, ctx.u), tb), H_S); // Stage 3 seam: ctx.u
        }
      }
    }
    // true site beats: a window per ejection (radial time), for the M2 tracker and the NIBP oscillations
    while (hs.opens.length > 0 && (hs.opens[0] as { t: number }).t <= t1) {
      const o = hs.opens.shift() as Open;
      closeWin(hs, ctx, t1);
      hs.win = newWin(o);
    }
    if (hs.win && t1 - hs.win.t0 > 3) hs.win = null; // arrest: stop measuring a flat line
    accumulate(hs.win, radialPressure(s, t1, x));
    while (hs.opensPa.length > 0 && (hs.opensPa[0] as { t: number }).t <= t1) {
      const o = hs.opensPa.shift() as Open;
      closeWinPa(hs, ctx, t1);
      hs.winPa = newWin(o);
    }
    if (hs.winPa && t1 - hs.winPa.t0 > 3) hs.winPa = null;
    accumulate(hs.winPa, paPressure(s, t1, x));
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
  hs.lv = prunePulses(hs.lv, tNow - 0.1);
  hs.rv = prunePulses(hs.rv, tNow - 0.1);
  hs.thorArt = prunePulses(hs.thorArt, tNow - 0.1);
  hs.thorCen = prunePulses(hs.thorCen, tNow - 0.1);
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
          hs.cpr = { active: true, rate: c.rate ?? 110, quality: c.quality ?? CPR_QUALITY_DEFAULT, nextT: was ? hs.cpr.nextT : t };
        } else {
          hs.cpr.active = false;
          const keep = (p: Pulse) => !(p.cpr && p.t0 > t);
          hs.lv = hs.lv.filter(keep);
          hs.rv = hs.rv.filter(keep);
          hs.thorArt = hs.thorArt.filter(keep);
          hs.thorCen = hs.thorCen.filter(keep);
          hs.opens = hs.opens.filter((o) => !(o.cpr && o.t > t));
        }
        return true;
      }
      return false;
    }
    case 'attachSensor': {
      const { sensor, state, site } = cmd;
      if (sensor === 'abp' || sensor === 'cvp' || sensor === 'pap') {
        if (sensor === 'abp' && site !== undefined) hs.abpSite = site as AbpSite;
        const pNow = sensor === 'abp' ? (hs.circ[0] as number) : sensor === 'cvp' ? hs.pv : (hs.circ[4] as number);
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
