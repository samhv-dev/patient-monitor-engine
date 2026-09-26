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
import type { CircEvent } from '../../types-circ.ts'; // Stage 7a
import type { DeviceAction } from '../../types.ts'; // Stage 7a
import type { ChannelId, Command, EngineEvent, Measured, NumericId, PatientProfile, Ramp, StateVar } from '../../types.ts';
import { addPlethPulse, createPlethState, plethAt, plethDelayS, prunePleth, setPlethSensor, type PlethState } from '../pleth/pleth.ts';
import { createCvpState, cvpOnBeat, cvpOnP, pruneCvp, type CvpState } from './cvp.ts';
import { applyLineEvent, createLineState, displaySample, lineActive, lineInput, LINE_SENSOR_STATES, setLineSensor, stepTransducer, validateLineEvent, type LineState } from './line.ts';
import { ARREST_AFTER_S, CPR_DUTY, CPR_QUALITY_DEFAULT, G_MAX, K_OPEN, gainCeiling, HEMO_RATE, H_S, PULSELESS_RHYTHMS, SUBSTEPS, SV_REF_ML } from './params.ts';
import { createTracker, isReferenceBeat, trackBeat, type TrackerState } from './tracker.ts';
import { createOut, type CircOut } from '../circ/circuit.ts'; // Stage 7a
import { createBaro } from '../circ/baroreflex.ts'; // Stage 7a
import { applyCircCondition, CIRC_CONDITIONS, type CircConditionId } from '../circ/conditions.ts'; // Stage 7a
import { DRUGS, type DrugId } from '../circ/drugs.ts'; // Stage 7a
import { stepCoronary, stPatchOf } from '../circ/coronary.ts'; // Stage 7a
import { createIabp, createLvad, iabpFlow, iabpOnBeat, iabpStop, lvadFlow, lvadNumerics, type IabpState, type LvadState } from '../circ/devices.ts'; // Stage 7a
import { circCardiacOutput, circGiveDrug, circOnAtrial, circOnBeat, circVolume, createCircModel, stepCircModel, type CircBeat, type CircEnv, type CircModelState } from '../circ/model.ts'; // Stage 7a
import { DEFAULT_PROFILE, type CircProfile, type ConditionId } from '../circ/profile.ts'; // Stage 7a
import { CPR_CARDIAC_MMHG, CPR_THORACIC_MMHG as CPR_THORACIC_7A, H_S as CIRC_H, P_PL0 } from '../circ/params.ts'; // Stage 7a

export const HEMO_CHANNELS = ['abp', 'cvp', 'pap', 'pleth'] as const satisfies readonly ChannelId[];
export type HemoChannel = (typeof HEMO_CHANNELS)[number];
/** Stage 7a: PV-loop teaching channels (truth, no transducer), present only while the 'pv' sensor is on. */
export const HEMO_TEACHING = ['lvp', 'lvv', 'lap', 'rap', 'rvp', 'pat'] as const satisfies readonly ChannelId[];
export type HemoTeachingChannel = (typeof HEMO_TEACHING)[number];
const DT = 1 / HEMO_RATE;
const SYS_LIMITS = { gMin: 0.1, gMax: G_MAX, rMin: 0.3, rMax: 4 };
const PA_LIMITS = { gMin: 0.1, gMax: 3, rMin: 0.02, rMax: 0.6 };
const WEDGE_TAU_S = 0.7; // crossfade within 1–2 beats (brief §4.2 PAP)
const SPO2_SITES: readonly string[] = ['leftFinger', 'rightFinger', 'ear', 'forehead', 'finger'];
const ABP_SITES: readonly string[] = ['leftRadial', 'rightRadial', 'femoral'];
const NIBP_SITES: readonly string[] = ['rightArm', 'leftArm', 'leg'];
if (H_S !== CIRC_H) throw new Error('hemo and circ steps differ');
const DRUG_IDS = Object.keys(DRUGS) as DrugId[]; // Stage 7a

/** Stage 7a: aortic root → radial transport delay as a 2 ms delay line (Stage 2 RADIAL_DELAY_S 0.045 → 22 steps). */
export const RAD_DELAY_STEPS = 22;
/** Stage 7a: the rhythm engine's k_rhythm of a VT ≤ 150/min — the reference for ventricular-rhythm efficiency. */
export const VT_K_REF = 0.6;

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
  pIt?: (t: number) => number; // Stage 7a: continuous pleural pressure (mmHg) from Stage 3's breath driver; absent → resting −4
  /**
   * R46 (7b): an external pleural source (alveolar pressure × per-condition airway-to-pleura transmission). When it
   * returns a number that value is the intrathoracic pressure; undefined → the Stage 3 path (pIt) is the fallback.
   */
  pItExternal?: (t: number) => number | undefined;
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
  stPatch: { ischaemicDepressionMv: number } | null; // Stage 7a: ST modifier patch for the engine to apply (R23)
  stApplied: number; // Stage 7a: the ischaemic ST depression last handed to the ECG, mV
  iabp: IabpState; // Stage 7a: intra-aortic balloon pump (R28, tables §8.1)
  iabpAug: number; // Stage 7a: peak aortic pressure of the last assisted beat (diastolic augmentation), mmHg
  lvad: LvadState; // Stage 7a: continuous-flow LVAD (R28, tables §8.2)
  pvOn: boolean; // Stage 7a: teaching channels on
  /**
   * Stage 7a MANUAL set-and-hold: the volume/PVR tracker (active, okS) and the per-beat pressure tracker (pActive,
   * pOkS) run while an INSTRUCTOR action is being met (a target, the HR or the rhythm changed) and stop once it holds;
   * physiological perturbations (PEEP, bleeding, drugs, conditions) then act on top of the instructor's picture.
   */
  manHold: { cvpT: number; pamT: number; active: boolean; okS: number; runS: number; key: string; pActive: boolean; pOkS: number; sbpAvg: number; dbpAvg: number };
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
    circ, circOut: createOut(), radQ: new Array<number>(RAD_DELAY_STEPS + 1).fill(circ.s[0] as number), beatT: -1, stPatch: null, stApplied: 0, iabp: createIabp(), iabpAug: 0, lvad: createLvad(), pvOn: false,
    // the volume tracker starts only if the instructor's initial CVP differs from the stabilised profile by > 1 mmHg
    // (the L1 default 6 vs a stabilised 5 is not an instruction) (see HemoState.manHold)
    manHold: manHoldInit(cvp, l1Value(l1, 'volumeStatus', 0), pad + (pas - pad) / 3, sbp, dbp),
    sys: createTracker(Math.min(4, Math.max(0.3, (map - cvp) / flow))),
    pul: createTracker(Math.min(0.6, Math.max(0.02, (pam - pawp) / flow))),
    prevRef: true, pv: cvp, pla: pawp,
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
  // ventricular beats (PVCs included: mechanical restitution makes a premature beat weak): the rhythm engine's k_rhythm (brief §4.8, shared by both modes) sets the
  // dyssynchronous contraction's efficiency — full at a VT ≤ 150/min (k 0.6), none at or below Stage 2's K_OPEN 0.25
  // (VT > 200, torsades: the contraction cannot open the aortic valve → pulseless, as in Stage 2)
  const eff = b.origin === 'ventricular' && b.template !== 'pvc' ? Math.min(1, Math.max(0, (b.mech.kSV - K_OPEN) / (VT_K_REF - K_OPEN))) : 1;
  circOnBeat(hs.circ, b.t, 60 / rr, b.origin, perfused && eff > 0, eff);
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

/** Stage 7a: compressions are pressures on the circuit (decision 12); this keeps the cycle clock for the pleth/EtCO2. */
function planCompressions(hs: HemoState, ctx: HemoCtx, until: number): void {
  const c = hs.cpr;
  while (c.active && c.nextT <= until) {
    const dur = (CPR_DUTY * 60) / c.rate;
    addPlethPulse(hs.pleth, c.nextT + plethDelayS(hs.pleth.site), l1Value(ctx.l1, 'pi', c.nextT) * 0.2 * c.quality, dur, hs.circ.p.rSys);
    c.nextT += 60 / c.rate;
  }
}

/** Unit half-sine compression profile at time t (0 outside the compression phase), × quality. */
export function cprPressure(c: HemoState['cpr'], t: number): number {
  if (!c.active) return 0;
  const T = 60 / c.rate;
  const start = c.nextT - Math.ceil((c.nextT - t) / T) * T; // the last compression start ≤ t
  const u = t - start;
  const dur = CPR_DUTY * T;
  return u >= 0 && u < dur ? c.quality * Math.sin((Math.PI * u) / dur) : 0;
}

const zeroFn = () => 0;
/** R46: the pleural input — the external (7b) source when it has a value, else the Stage 3 breath driver, else rest. */
export function pleuralSource(ctx: Pick<HemoCtx, 'pIt' | 'pItExternal'>): (t: number) => number {
  const base = ctx.pIt ?? (() => P_PL0);
  const ext = ctx.pItExternal;
  if (!ext) return base;
  return (t) => ext(t) ?? base(t);
}
/** Stage 7a: the circulation's environment for one sample (pleural input; CPR and devices arrive in Tasks 17, 20–21). */
function circEnv(hs: HemoState, ctx: HemoCtx): CircEnv {
  return {
    pIt: pleuralSource(ctx),
    cprCardiac: (t) => CPR_CARDIAC_MMHG * cprPressure(hs.cpr, t),
    cprThoracic: (t) => CPR_THORACIC_7A * cprPressure(hs.cpr, t), qVad: (lvp, aop) => lvadFlow(hs.lvad, lvp, aop, hs.circ.s[10] as number), qAortaSrc: (t) => iabpFlow(hs.iabp, t), modeled: ctx.l1.mode === 'modeled' };
}

/** Stage 7a: a completed CircBeat → site beat (tracker in MANUAL, NIBP oscillations), pleth pulse. */
function onCircBeat(hs: HemoState, ctx: HemoCtx, cb: CircBeat, t: number): void {
  const ejected = cb.avOpen >= 0 && cb.sv > 1;
  // a reference beat: ejected, with no big stroke-volume swing against the previous beat (brief §4.9 M2)
  const prev = hs.siteBeats[hs.siteBeats.length - 1];
  // ventricular beats (PVCs, VT, idioventricular) neither drive nor get cancelled by the tracker (Stage 2 M2 rule)
  const steady = ejected && cb.origin !== 'ventricular' && (!prev || Math.abs(cb.sv - prev.sv) <= 0.25 * Math.max(1, prev.sv));
  const ref = hs.prevRef && steady;
  hs.prevRef = steady;
  const beat: SiteBeatStat = { t: cb.t, sbp: cb.sbp, dbp: cb.dbp, map: cb.map, ref, cpr: hs.cpr.active, sv: cb.sv, dur: cb.dur };
  hs.lastSite = beat;
  hs.siteBeats.push(beat);
  if (hs.siteBeats.length > 16) hs.siteBeats.shift();
  if (ejected) hs.lastEjT = cb.t + cb.avOpen;
  if (hs.iabp.on) {
    hs.iabpAug = cb.aoSys;
    iabpOnBeat(hs.iabp, cb.t + cb.dur, cb.dur, cb.avClose > 0 ? cb.avClose : 0.3); // pressure trigger: the last notch
  }
  // Task 14 MANUAL tracker; frozen while a device reshapes the waveform (its targets describe the native heart)
  if (ctx.l1.mode !== 'modeled' && !hs.iabp.on && !hs.lvad.on) trackCircBeat(hs, ctx, beat);
  nibpOnPulse(hs.nibp, t, beat, hs.cpr.active || beat.cpr, ctx.rng.measurement);
}

export const MANUAL_CVP_GAIN = 0.3; // Stage 7a [ENG]: dV0 −= gain·(CVP* − CVP)·cSv per second
export const MANUAL_HOLD_S = 8; // Stage 7a [ENG]: a MANUAL tracker stops after its target has held this long
/** Stage 7a [ENG]: the volume tracker gives up after this long (a CVP the physiology cannot reach, e.g. under PEEP). */
export const MANUAL_TRACK_MAX_S = 60;
export const MANUAL_HOLD_MMHG = 1; // Stage 7a [ENG]: SBP/DBP hold tolerance of the per-beat pressure tracker
/** Decision 9: hypovolaemia (volumeStatus < 1) lowers the CVP the tracker aims for, so stressed volume falls. */
export function volumeStatusCvp(cvpTarget: number, vs: number): number {
  return cvpTarget - 0.8 * cvpTarget * (1 - Math.min(1, Math.max(0, vs)));
}
const CIRC_LIMITS = { gMin: 0.3, gMax: 2.5, rMin: 0.3, rMax: 4 };

/** Initial MANUAL hold state: both trackers start active (the L1 targets are met first), then hold. */
function manHoldInit(cvp: number, vs: number, pamT: number, sbp: number, dbp: number): HemoState['manHold'] {
  return { cvpT: volumeStatusCvp(cvp, vs), pamT, active: true, okS: 0, runS: 0, key: '', pActive: true, pOkS: 0, sbpAvg: sbp, dbpAvg: dbp };
}

/** Stage 7a MANUAL M2: the Stage 2 tracker algorithm, its gain acting on LV Emax and its R on systemic resistance. */
function trackCircBeat(hs: HemoState, ctx: HemoCtx, b: SiteBeatStat): void {
  const target = { sbp: l1Value(ctx.l1, 'sbp', b.t), dbp: l1Value(ctx.l1, 'dbp', b.t) };
  const tr = hs.manHold;
  if (!tr.pActive) return; // set-and-hold (see HemoState.manHold)
  if (b.ref) {
    // the hold test uses ≈ 8-beat averages so ventilator-driven beat-to-beat swings (PPV) do not keep it running
    tr.sbpAvg += (b.sbp - tr.sbpAvg) / 8;
    tr.dbpAvg += (b.dbp - tr.dbpAvg) / 8;
    tr.pOkS = Math.abs(tr.sbpAvg - target.sbp) <= MANUAL_HOLD_MMHG && Math.abs(tr.dbpAvg - target.dbp) <= MANUAL_HOLD_MMHG ? tr.pOkS + b.dur : 0;
    if (tr.pOkS >= MANUAL_HOLD_S) tr.pActive = false;
  }
  hs.sys.g = hs.circ.man.eesF;
  hs.sys.R = hs.circ.man.rSys ?? hs.circ.base.rSys;
  trackBeat(hs.sys, b, target, hs.circOut.pSv, CIRC_LIMITS, CIRC_LIMITS.gMax);
  hs.circ.man.eesF = hs.sys.g;
  hs.circ.man.rSys = hs.sys.R;
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
  // Stage 7a (R23): coronary supply/demand at 1 Hz → contractility (ext.kIsch) and the ST patch
  const c = hs.circ;
  c.chemo = { sao2: l1Value(ctx.l1, 'spo2', t) / 100, paco2: l1Value(ctx.l1, 'etco2', t) + 5 }; // Task 19 chemoreflex inputs
  c.cor.eesF = c.kLv;
  stepCoronary(c.cor, c.beats, c.prof.cfr, 1, 60 / Math.max(0.2, hs.lastRR));
  c.ext.kIsch = c.cor.kIsch;
  const nxt = stPatchOf(c.cor)?.ischaemicDepressionMv ?? 0;
  if (Math.abs(nxt - hs.stApplied) >= 0.01) {
    hs.stPatch = { ischaemicDepressionMv: nxt };
    hs.stApplied = nxt;
  }
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
  const flags = l1Flags(ctx.l1, t, ctx.hr, overrides(hs, t));
  if (ctx.l1.mode === 'modeled') {
    // Stage 7a: the model's truths, flagged 'modeled' unless the instructor pinned them (brief §4.9)
    values.sbp = hs.lastSite.sbp;
    values.dbp = hs.lastSite.dbp;
    values.cvp = hs.circOut.pRa;
    values.pawp = hs.circOut.pPv;
    for (const v of ['sbp', 'dbp', 'cvp', 'papSys', 'papDia', 'pawp', 'svr'] as const) if (!ctx.l1.pinned.includes(v)) flags[v] = 'modeled';
  }
  hs.out.push({ type: 'state', t, tick: Math.round(t * 50), mode: ctx.l1.mode, values, control: flags });
  // Stage 7a: the 1 Hz circulation summary (tables §2.1 step 5, §3)
  const lb = c.beats[c.beats.length - 1];
  const svRvMean = c.beats.length ? c.beats.reduce((a, b) => a + b.svRv, 0) / c.beats.length : 0;
  const ce: CircEvent = {
    type: 'circ', t, co: circCardiacOutput(c), sv: lb?.sv ?? 0, svRv: svRvMean, ef: lb ? (lb.lvedv - lb.lvesv) / Math.max(1, lb.lvedv) : 0,
    lvedv: lb?.lvedv ?? 0, lvesv: lb?.lvesv ?? 0, lvedp: lb?.lvedp ?? 0, lvsp: lb?.lvsp ?? 0,
    pmsf: ((c.s[4] as number) - c.p.v0Sv) / c.p.cSv, pvr: (c.p.pvrL * c.p.pvrR) / (c.p.pvrL + c.p.pvrR), svr: c.p.rSys,
    cpp: lb ? lb.aoDia - lb.lvedp : 0, supplyDemand: c.cor.ratio, kIsch: c.cor.kIsch,
  };
  if (hs.iabp.on) ce.iabp = { ratio: hs.iabp.ratio, augmentation: hs.iabpAug };
  if (hs.lvad.on) ce.lvad = { rpm: hs.lvad.rpm, ...lvadNumerics(hs.lvad), suction: hs.lvad.suction };
  hs.out.push(ce);
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
export function advanceHemo(hs: HemoState, ctx: HemoCtx, mEnd: number, write: (ch: HemoChannel | HemoTeachingChannel, m: number, v: number) => void): void {
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
      // Stage 7a: a pleth pulse per aortic-valve opening, placed when it happens (a CircBeat completes one beat late)
      const c = hs.circ;
      if (c.opens.length > 0 && !hs.cpr.active) {
        const bs = c.beats;
        const svRef = Math.max(1, bs.length >= 4 ? bs.reduce((a, b) => a + b.sv, 0) / bs.length : (c.ref.sv || 70));
        const lb = bs[bs.length - 1];
        const lvet = lb && lb.avClose > lb.avOpen ? lb.avClose - lb.avOpen : 0.3;
        for (const op of c.opens) addPlethPulse(hs.pleth, op.t + plethDelayS(hs.pleth.site), (l1Value(ctx.l1, 'pi', t1) * op.sv) / svRef, lvet, c.p.rSys);
      }
      c.opens.length = 0;
      hs.pv = hs.circOut.pRa; // Stage 7a: the Stage 2 consumers' venous/PAWP truths come from the chambers
      hs.pla = hs.circOut.pPv;
    }
    if (ctx.l1.mode !== 'modeled' && m % 12 === 0 && !isArrested(hs, t1) && !hs.cpr.active) {
      // Stage 7a MANUAL: slow CVP (venous unstressed volume) and PA-mean (PVR) trackers at ≈ 10 Hz
      const c = hs.circ;
      const tr = hs.manHold;
      const cvpT = volumeStatusCvp(l1Value(ctx.l1, 'cvp', t1), l1Value(ctx.l1, 'volumeStatus', t1));
      // the instructor's CVP is the filling state: pleural (PEEP, tension PTX) and pericardial (tamponade) pressure
      // changes still show on top of it, as Stage 3's MANUAL Paw coupling did (decision 8)
      const vh = (c.s[10] as number) + (c.s[6] as number);
      const periFluid = hs.circOut.pPeri - Math.max(0, c.p.periA * (Math.exp(c.p.periLambda * (vh - c.p.v0Peri)) - 1)); // tamponade share
      const cvpNow = hs.circOut.pRa - Math.max(0, hs.circOut.pIt - P_PL0) - periFluid; // spontaneous dips average out
      const pasT = l1Value(ctx.l1, 'papSys', t1);
      const padT = l1Value(ctx.l1, 'papDia', t1);
      const pamT = padT + (pasT - padT) / 3;
      // SET-AND-HOLD: the volume and PVR trackers run when the instructor's target moves and stop once it is met
      // (±0.5 mmHg for 5 s); later perturbations (PEEP, bleeding, tamponade) then act on top — PEEP lowers CO as it
      // did under Stage 3's MANUAL coupling. The Ees/SVR pressure tracker below keeps defending SBP/DBP per beat.
      const key = `${Math.round(l1Value(ctx.l1, 'sbp', t1) * 10)}/${Math.round(l1Value(ctx.l1, 'dbp', t1) * 10)}/${Math.round(rampValue(ctx.hr, t1) * 10)}/${ctx.rhythm.id}`;
      if (key !== tr.key) {
        tr.key = key;
        tr.pActive = true;
        tr.pOkS = 0;
      }
      if (Math.abs(cvpT - tr.cvpT) > 0.05 || Math.abs(pamT - tr.pamT) > 0.05) {
        tr.cvpT = cvpT;
        tr.pamT = pamT;
        tr.active = true;
        tr.okS = 0;
        tr.runS = 0;
      }
      if (tr.active) {
        const err = cvpT - cvpNow;
        c.man.dV0 -= MANUAL_CVP_GAIN * err * c.p.cSv * (12 / HEMO_RATE);
        c.man.dV0 = Math.min(0.5 * c.prof.bloodVolumeMl, Math.max(-0.5 * c.prof.bloodVolumeMl, c.man.dV0));
        const q = hs.circOut.qLungL + hs.circOut.qLungR;
        if (q > 20) {
          const want = Math.max(0.01, (pamT - hs.circOut.pPv) / q);
          const cur = c.man.pvr ?? want;
          c.man.pvr = cur * (want / cur) ** 0.1;
        }
        tr.okS = Math.abs(err) <= 0.5 ? tr.okS + 12 / HEMO_RATE : 0;
        tr.runS += 12 / HEMO_RATE;
        if (tr.okS >= MANUAL_HOLD_S || tr.runS >= MANUAL_TRACK_MAX_S) tr.active = false;
      }
    }
    if (ctx.l1.mode === 'modeled' && m % 12 === 0 && !ctx.l1.pinned.includes('hr') && ctx.requestHr) {
      const want = hs.circ.hrModel; // Stage 7a MODELED: the reflexes drive the rhythm engine's rate
      if (Math.abs(want - rampValue(ctx.hr, t1)) > 0.2) ctx.requestHr(want);
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
    if (hs.pvOn) {
      const o = hs.circOut;
      write('lvp', m, o.pLv);
      write('lvv', m, hs.circ.s[10] as number);
      write('lap', m, o.pLa);
      write('rap', m, o.pRa);
      write('rvp', m, o.pRv);
      write('pat', m, o.pPaRoot);
    }
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
      return cmd.mode === 'manual' || cmd.mode === 'modeled' ? undefined : 'mode must be manual or modeled';
    case 'applyEvent': {
      const ev = cmd.event as { kind: string };
      if (ev.kind === 'line') return validateLineEvent(cmd.event as Extract<HemoClinicalEvent, { kind: 'line' }>);
      if (ev.kind === 'cpr') {
        const c = cmd.event as Extract<HemoClinicalEvent, { kind: 'cpr' }>;
        if (c.rate !== undefined && !(c.rate >= 60 && c.rate <= 150)) return 'cpr rate must be 60–150/min';
        if (c.quality !== undefined && !(c.quality >= 0 && c.quality <= 1.5)) return 'cpr quality must be 0–1.5';
        return undefined;
      }
      // Stage 7a: drug, fluid, bleed and circulation conditions act on the circulation
      if (ev.kind === 'drug') {
        const d = cmd.event as { drugId: string; dose: number; unit: string };
        if (!(DRUG_IDS as readonly string[]).includes(d.drugId)) return `drug ${d.drugId} arrives in Stage 7g`;
        if (!(Number.isFinite(d.dose) && d.dose > 0)) return 'dose must be > 0';
        return ['mcg', 'mg', 'mcg/kg', 'mg/kg'].includes(d.unit) ? undefined : 'unit must be mcg, mg, mcg/kg or mg/kg';
      }
      if (ev.kind === 'bleed' || ev.kind === 'fluid') {
        const b = cmd.event as { volumeMl?: number; overS?: number; rateMlPerMin?: number };
        if (b.rateMlPerMin !== undefined) return Number.isFinite(b.rateMlPerMin) && b.rateMlPerMin >= 0 && b.rateMlPerMin <= 2000 ? undefined : 'rateMlPerMin must be 0–2000';
        return b.volumeMl !== undefined && Number.isFinite(b.volumeMl) && b.volumeMl > 0 && b.volumeMl <= 5000 && Number.isFinite(b.overS ?? 1) && (b.overS ?? 1) > 0
          ? undefined
          : 'volumeMl must be 0–5000 with overS > 0';
      }
      if (ev.kind === 'condition') {
        const c = cmd.event as { id: string; severity: number };
        if (!(CIRC_CONDITIONS as readonly string[]).includes(c.id)) return null;
        return Number.isFinite(c.severity) && c.severity >= 0 && c.severity <= 1 ? undefined : 'severity must be 0–1';
      }
      return null;
    }
    case 'attachSensor': {
      const { sensor, state, site } = cmd;
      if (sensor === 'pv') return state === 'on' || state === 'off' ? undefined : 'pv state must be on or off'; // Stage 7a
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
      if (a.device === 'iabp') {
        const x = a as Extract<DeviceAction, { device: 'iabp' }>;
        if (!['start', 'stop', 'set'].includes(x.action)) return 'iabp action must be start, stop or set';
        if (x.ratio !== undefined && ![1, 2, 3].includes(x.ratio)) return 'ratio must be 1, 2 or 3';
        if (x.volumeMl !== undefined && !(x.volumeMl >= 20 && x.volumeMl <= 50)) return 'volumeMl must be 20–50';
        for (const v of [x.inflateOffsetMs, x.deflateOffsetMs]) if (v !== undefined && !(v >= -200 && v <= 200)) return 'timing offsets must be −200…200 ms';
        return undefined;
      }
      if (a.device === 'lvad') {
        const x = a as Extract<DeviceAction, { device: 'lvad' }>;
        if (!['start', 'stop', 'set'].includes(x.action)) return 'lvad action must be start, stop or set';
        return x.rpm === undefined || (Number.isFinite(x.rpm) && x.rpm >= 3000 && x.rpm <= 9000) ? undefined : 'rpm must be 3000–9000';
      }
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
    case 'setMode': {
      if (cmd.mode === l1.mode) return true;
      const c = hs.circ;
      if (cmd.mode === 'modeled') {
        c.baro = createBaro(hs.lastSite.map, c.baro.cpLp); // no step on entry (brief §4.9): the reflexes start at rest
        c.base.rSys = c.man.rSys ?? c.base.rSys; // the MANUAL solution becomes the model's baseline
        c.base.v0Sv += c.man.dV0;
        c.base.eesLv *= c.man.eesF;
        c.base.eesRv *= c.man.eesRvF;
        if (c.man.pvr !== null) {
          const f = c.man.pvr / ((c.base.pvrL * c.base.pvrR) / (c.base.pvrL + c.base.pvrR));
          c.base.pvrL *= f;
          c.base.pvrR *= f;
        }
        c.man = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null };
      } else {
        setL1Target(l1, 'sbp', t, Math.round(hs.lastSite.sbp)); // freeze outputs as targets
        setL1Target(l1, 'dbp', t, Math.round(hs.lastSite.dbp));
        setL1Target(l1, 'cvp', t, Math.round(hs.circOut.pRa));
      }
      l1.mode = cmd.mode;
      return true;
    }
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
        }
        return true;
      }
      if (ev.kind === 'drug') {
        const d = ev as unknown as { drugId: DrugId; dose: number; unit: string };
        const w = hs.circ.weightKg;
        const mg = d.unit === 'mcg' ? d.dose / 1000 : d.unit === 'mg' ? d.dose : d.unit === 'mcg/kg' ? (d.dose * w) / 1000 : d.dose * w;
        circGiveDrug(hs.circ, d.drugId, mg);
        return true;
      }
      if (ev.kind === 'bleed' || ev.kind === 'fluid') {
        const b = ev as unknown as { volumeMl?: number; overS?: number; rateMlPerMin?: number };
        const sign = ev.kind === 'bleed' ? -1 : 1;
        if (b.rateMlPerMin !== undefined) {
          hs.circ.vol = hs.circ.vol.filter((v) => Math.sign(v.rate) !== sign || v.until < 1e8); // replaces an open-ended rate
          if (b.rateMlPerMin > 0) hs.circ.vol.push({ rate: (sign * b.rateMlPerMin) / 60, until: 1e9 });
        } else circVolume(hs.circ, sign * (b.volumeMl ?? 0), b.overS ?? 1);
        return true;
      }
      if (ev.kind === 'condition') {
        const c = ev as unknown as { id: CircConditionId; severity: number };
        applyCircCondition(hs.circ, c.id, c.severity);
        return true;
      }
      return false;
    }
    case 'attachSensor': {
      const { sensor, state, site } = cmd;
      if (sensor === 'pv') {
        hs.pvOn = state === 'on'; // Stage 7a
        return true;
      }
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
      if (a.device === 'iabp') {
        const x = a as Extract<DeviceAction, { device: 'iabp' }>;
        const d = hs.iabp;
        if (x.action === 'start') d.on = true;
        if (x.action === 'stop') iabpStop(d, t);
        if (x.ratio !== undefined) d.ratio = x.ratio;
        if (x.volumeMl !== undefined) d.volumeMl = x.volumeMl;
        if (x.inflateOffsetMs !== undefined) d.inflateOffsetMs = x.inflateOffsetMs;
        if (x.deflateOffsetMs !== undefined) d.deflateOffsetMs = x.deflateOffsetMs;
        return true;
      }
      if (a.device === 'lvad') {
        const x = a as Extract<DeviceAction, { device: 'lvad' }>;
        if (x.action === 'start') hs.lvad.on = true;
        if (x.action === 'stop') hs.lvad.on = false;
        if (x.rpm !== undefined) hs.lvad.rpm = x.rpm;
        return true;
      }
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
