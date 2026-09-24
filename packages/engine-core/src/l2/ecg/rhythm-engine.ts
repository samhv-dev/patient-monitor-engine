// Rhythm engine (brief §4.1 "Rhythm engine", §4.8 k_rhythm; research 03 §1.5). Separate atrial and
// ventricular clocks with an AV-node state machine, after Squiggler's atria × cadence × ventricle layering.
// It is a discrete-event planner: planUntil(T) processes every internal event up to T and appends kernel
// events (for the sample generator) and beat/atrial records (for the event stream). All state is plain
// JSON-safe data so the engine can clone it every tick (look-ahead) and snapshot it.
import { normal, uniform, type Sfc32State, type StreamName } from '../../rng/sfc32.ts';
import type { BeatOrigin, EngineEvent, Modifiers, RhythmId, RhythmOpts } from '../../types.ts';
import { lvetMs, prMs, qtFridericiaMs } from './intervals.ts';
import { makeEvent, type EcgEvent } from './kernels.ts';
import { respSin, sinusRR, type HrvPhase } from './hrv.ts';
import {
  DEFAULT_DISSOCIATED_ATRIAL_BPM,
  DEFAULT_FLUTTER_ATRIAL_BPM,
  RHYTHMS,
  type RhythmDef,
} from './rhythms.ts';
import {
  FLUTTER_DIR,
  FWAVE_DIR,
  fiducialS,
  flutterHarmonics,
  kernelQtMs,
  pWaveKernels,
  templateKernels,
  templateQrsMs,
  type TemplateId,
} from './templates.ts';

/** JSON-safe stand-in for ±Infinity. */
export const NEVER = 1e12;

// --- constants (sources in comments) -------------------------------------------------------------
const MOBITZ1_DELTA_S = 0.1; // Δ 60–120 ms [03 §1.5]
const MOBITZ1_R = 0.5; // r = 0.5 [03 §1.5]
const AVB1_DEFAULT_PR_MS = 280; // PR > 200 ms (brief §5) [ENG value]
const FLUTTER_FR_S = 0.26; // F-wave → QRS conduction time [ENG]
const AF_IMPULSE_MEAN_S = 0.2; // atrial impulses, Poisson at 5/s [03 §1.5, Lian 2007]
const AF_IMPULSE_MIN_S = 0.05; // truncation of the Poisson process [ENG]
const AF_DV_MV = 15; // each impulse raises the junction potential by 15 mV [03 §1.5]
const AF_SLOPE_MV_S = 30; // phase-4 depolarisation 30 mV/s [03 §1.5]
/**
 * Rate control [ENG, calibrated by simulation in Task 9]. For a target ventricular rate hr (RR = 60/hr):
 *   threshold θ = AF_THETA_K · RR²  (so the first-passage spread, ∝ √θ, stays ≈ 0.2·RR → RR CV ≈ 0.2)
 *   mean wait  W ≈ θ / (slope + ΔV·impulseRate) = θ / 105 mV/s
 *   refractory τ_R = RR − W   ("the refractory period is the rate-control knob", brief §4.1)
 */
const AF_THETA_K = 80;
const AF_DRIVE_MV_S = AF_SLOPE_MV_S + AF_DV_MV / AF_IMPULSE_MEAN_S;
/** Simulated mean rate is ~5% below target (impulse truncation, minimum refractoriness); aim 5% high. */
const AF_RATE_CORRECTION = 0.95;
const AF_AV_S = 0.06; // junction → QRS onset [ENG]
const AF_MIN_REFRACTORY_S = 0.25; // RR_min 0.25–0.30 s (brief §4.1 AF fallback) [ENG]
const VT_JITTER_S = 0.004; // ±4 ms cycle-length jitter [ENG]
const ESCAPE_JITTER_SD_S = 0.01; // [ENG]
const PVC_COUPLING_MIN = 0.55; // PVC coupling 40–80% of RR (brief §5); Stage 1 draws 55–65% [ENG]
const PVC_COUPLING_SPAN = 0.1;
const PVC_NO_EJECTION_BELOW = 0.45; // no ejection at coupling < ~45% of RR (brief §4.8)
const REFRACTORY_QT_FRACTION = 0.8; // refractoryUntil = t + QRS + 0.8·QT (brief §4.1) [ENG]
/**
 * AV-node effective refractory period, P to P (review H1: "≈250–300 ms"; the low end, so 1:1 conduction holds up
 * to 240/min, above sinusTachy's 220 ceiling even with HRV) [ENG]. Supraventricular impulses are filtered HERE,
 * not by ventricular refractoriness: a conducted beat after a conducted beat is never concealed by the ventricle.
 */
const AV_NODE_ERP_S = 0.25;
const QRS_AMP_RESP_MOD = 0.08; // respiration modulates R by ±5–15% (brief §4.1)
const BASE_SV_ML = 70; // placeholder SV until the Stage 2 haemodynamic core [ENG]

export interface PendingV {
  t: number;
  origin: BeatOrigin;
  template: TemplateId;
  prMs: number | null;
  pvc: boolean;
  coupling: number; // PVC coupling as a fraction of the prevailing RR (0 for non-PVC)
  /** Primary pacemakers that set their own timing (VT/AVNRT focus, AF junction) skip the refractory check. */
  bypass: boolean;
}

/** A continuous atrial wave: Σ a_i·sin(2π·f_i·s + ph_i) along the VCG direction `dir`, between start and end. */
export interface FWave {
  kind: 'fib' | 'flutter';
  start: number;
  end: number;
  f: number[];
  ph: number[];
  a: number[];
  dir: [number, number, number];
  /** Flutter only: the atrial rate it was built for (bpm). */
  rateBpm?: number;
}

export interface RhythmState {
  id: RhythmId;
  opts: RhythmOpts;
  respectRefractory: boolean;
  planT: number;
  atria: { nextT: number; groupPos: number; groupRatio: number };
  junction: { refUntil: number; v: number; vT: number };
  pending: PendingV[];
  focusNextT: number;
  escapeNextT: number;
  refractoryUntil: number;
  /** The AV node conducts no sinus P before this time (AV_NODE_ERP_S after the last conducted P). */
  avRefUntil: number;
  /** Was the last ventricular activation a conducted supraventricular beat (not a PVC/escape/focus beat)? */
  lastConducted: boolean;
  lastVT: number;
  lastSupraT: number;
  lastWasPvc: boolean;
  /** Active and recently ended atrial waves (the generator may still need an ended one for unrendered samples). */
  fwaves: FWave[];
  events: EcgEvent[];
  records: EngineEvent[];
  beatSeq: number;
  pendingSwitch: { id: RhythmId; opts: RhythmOpts; respectRefractory: boolean } | null;
}

export interface RhythmCtx {
  /** The L1 'hr' target at time t (bpm, unclamped). */
  hrAt(t: number): number;
  mods: Modifiers;
  rng: Record<StreamName, Sfc32State>;
  hrv: HrvPhase;
}

export function createRhythmState(id: RhythmId, opts: RhythmOpts, t0: number, ctx: RhythmCtx): RhythmState {
  const st: RhythmState = {
    id: 'asystole',
    opts: {},
    respectRefractory: true,
    planT: t0,
    atria: { nextT: NEVER, groupPos: 0, groupRatio: 2 },
    junction: { refUntil: t0, v: 0, vT: t0 },
    pending: [],
    focusNextT: NEVER,
    escapeNextT: NEVER,
    refractoryUntil: -NEVER,
    avRefUntil: -NEVER,
    lastConducted: false,
    lastVT: -NEVER,
    lastSupraT: -NEVER,
    lastWasPvc: false,
    fwaves: [],
    events: [],
    records: [],
    beatSeq: 0,
    pendingSwitch: null,
  };
  applyRhythm(st, id, opts, t0, true, ctx);
  return st;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** The rate this rhythm's primary clock runs at, at time t (bpm). */
export function rhythmRate(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const def = RHYTHMS[st.id];
  return clamp(ctx.hrAt(t), def.rateRange[0], def.rateRange[1]);
}

function atrialRate(st: RhythmState, def: RhythmDef, t: number, ctx: RhythmCtx): number {
  if (def.atria === 'flutter') return st.opts.atrialRateBpm ?? DEFAULT_FLUTTER_ATRIAL_BPM;
  if (def.rateDrives === 'sinus') return rhythmRate(st, t, ctx);
  return st.opts.atrialRateBpm ?? DEFAULT_DISSOCIATED_ATRIAL_BPM;
}

function escapeRate(st: RhythmState, def: RhythmDef, t: number, ctx: RhythmCtx): number {
  if (def.escape === 'none') return 0;
  return def.rateDrives === 'escape' ? rhythmRate(st, t, ctx) : def.backupEscapeBpm;
}

function flutterRatio(st: RhythmState, s: Sfc32State): number {
  const r = st.opts.ratio ?? 2;
  if (r === 'variable') return uniform(s) < 0.5 ? 2 : 4;
  return r;
}

/**
 * Rate calibration (review M1: the formulas alone gave 32.5 bpm at a 40 target and 159.6 at 180) [ENG].
 * Pairs [target bpm, command bpm]: the command fed to afThresholdMv/afRefractoryS that yields the target mean
 * ventricular rate. Made by simulating the model (rhythm engine alone, 600 s × seeds 11–13, commands 30–300 bpm)
 * and inverting the measured rate curve by linear interpolation; the test checks it on an unseen seed.
 * Above ~150 the refractory floor (AF_MIN_REFRACTORY_S) dominates, so the command climbs steeply.
 */
const AF_RATE_CAL: ReadonlyArray<readonly [number, number]> = [
  [20, 30], [40, 45.1], [50, 51.8], [60, 59.1], [70, 68.8], [80, 79.1], [90, 89.0], [100, 101.5], [110, 110.1],
  [120, 116.6], [130, 124.9], [140, 141.3], [150, 160.5], [160, 189.1], [170, 230.8], [180, 274.0],
];

/** The command (bpm) that makes the AF junction's mean rate equal `hr` (piecewise-linear in AF_RATE_CAL). */
export function afCommandBpm(hr: number): number {
  const t = AF_RATE_CAL;
  if (hr <= (t[0] as readonly [number, number])[0]) return (t[0] as readonly [number, number])[1];
  for (let i = 1; i < t.length; i++) {
    const [x1, y1] = t[i] as readonly [number, number];
    if (hr <= x1) {
      const [x0, y0] = t[i - 1] as readonly [number, number];
      return y0 + ((hr - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  return (t[t.length - 1] as readonly [number, number])[1];
}

/** AF junction threshold (mV above reset) for a target ventricular rate `hr`. */
export function afThresholdMv(hr: number): number {
  const rr = (60 * AF_RATE_CORRECTION) / afCommandBpm(hr);
  return AF_THETA_K * rr * rr;
}

/** AF junction refractory period that gives a mean ventricular rate of `hr`. */
export function afRefractoryS(hr: number): number {
  const rr = (60 * AF_RATE_CORRECTION) / afCommandBpm(hr);
  return Math.max(AF_MIN_REFRACTORY_S, rr - (AF_THETA_K * rr * rr) / AF_DRIVE_MV_S);
}

function drawFWave(t0: number, s: Sfc32State): FWave {
  // 3 random-phase sinusoids at 5–9 Hz, 0.03–0.05 mV each (brief §4.1: 2–4 at 5–9 Hz, 0.02–0.15 mV) [ENG]
  const f: number[] = [];
  const ph: number[] = [];
  const a: number[] = [];
  for (let i = 0; i < 3; i++) {
    f.push(5 + 4 * uniform(s));
    ph.push(2 * Math.PI * uniform(s));
    a.push(0.03 + 0.02 * uniform(s));
  }
  return { kind: 'fib', start: t0, end: NEVER, f, ph, a, dir: [...FWAVE_DIR] };
}

/** End every open atrial wave of this kind at t. */
function endFWaves(st: RhythmState, kind: FWave['kind'], t: number): void {
  for (const fw of st.fwaves) if (fw.kind === kind && fw.end >= NEVER) fw.end = t;
}

/**
 * Switch rhythm at time `at` (clamped to the planning frontier, so already-planned beats are kept).
 * Called by createRhythmState, by the engine's setRhythm, and by a deferred 'nextBeat' switch.
 */
export function applyRhythm(
  st: RhythmState,
  id: RhythmId,
  opts: RhythmOpts,
  at: number,
  respectRefractory: boolean,
  ctx: RhythmCtx,
): void {
  const prev = RHYTHMS[st.id];
  const def = RHYTHMS[id];
  const t0 = Math.max(at, st.planT);
  const wasFib = prev.atria === 'fib';
  st.id = id;
  st.opts = { ...opts };
  st.respectRefractory = respectRefractory;
  st.pendingSwitch = null;

  // Atria
  if (def.atria === 'none') st.atria.nextT = NEVER;
  else if (def.atria !== prev.atria || st.atria.nextT >= NEVER) st.atria.nextT = t0 + (def.atria === 'sinus' ? 0.1 : 0);
  st.atria.groupPos = 0;
  st.atria.groupRatio = def.atria === 'flutter' ? flutterRatio(st, ctx.rng.conduction) : 2;

  // AF: f-waves and the integrate-and-fire junction
  if (def.atria === 'fib' && !wasFib) {
    st.fwaves.push(drawFWave(t0, ctx.rng.conduction));
    st.junction = { refUntil: t0, v: 0, vT: t0 };
  }
  if (def.atria !== 'fib' && wasFib) endFWaves(st, 'fib', t0);

  // Flutter: a continuous sawtooth phase-locked to the F events (ruling R18); rebuilt only if the rate changes
  if (def.atria === 'flutter') {
    const rate = atrialRate(st, def, t0, ctx);
    const open = st.fwaves.find((fw) => fw.kind === 'flutter' && fw.end >= NEVER);
    if (!open || open.rateBpm !== rate) {
      const anchor = st.atria.nextT;
      endFWaves(st, 'flutter', anchor);
      st.fwaves.push({ kind: 'flutter', start: anchor, end: NEVER, ...flutterHarmonics(anchor, rate), dir: [...FLUTTER_DIR], rateBpm: rate });
    }
  } else endFWaves(st, 'flutter', t0);

  // Ventricular focus (VT / AVNRT)
  st.focusNextT = def.focus === 'none' ? NEVER : Math.max(t0 + 0.05, st.refractoryUntil + 0.01);

  // Escape timer
  const er = escapeRate(st, def, t0, ctx);
  st.escapeNextT = er > 0 ? Math.max(t0, st.lastVT) + 60 / er : NEVER;
}

function pushPending(st: RhythmState, p: PendingV): void {
  let i = st.pending.length;
  while (i > 0 && (st.pending[i - 1] as PendingV).t > p.t) i--;
  st.pending.splice(i, 0, p);
}

function junctionSpontT(st: RhythmState, ctx: RhythmCtx): number {
  const j = st.junction;
  return Math.max(j.vT, j.refUntil) + (afThresholdMv(rhythmRate(st, j.vT, ctx)) - j.v) / AF_SLOPE_MV_S;
}

function fireJunction(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t: t + AF_AV_S, origin: 'atrial', template: 'narrow', prMs: null, pvc: false, coupling: 0, bypass: true });
  const ref = t + afRefractoryS(rhythmRate(st, t, ctx));
  st.junction = { refUntil: ref, v: 0, vT: ref };
}

/** One AF atrial impulse reaching the junction (Lian 2007 integrate-and-fire, research 03 §1.5). */
function junctionImpulse(st: RhythmState, t: number, ctx: RhythmCtx): boolean {
  const j = st.junction;
  if (t < j.refUntil) return false; // concealed
  const v = j.v + AF_SLOPE_MV_S * (t - Math.max(j.vT, j.refUntil)) + AF_DV_MV;
  if (v >= afThresholdMv(rhythmRate(st, t, ctx))) {
    fireJunction(st, t, ctx);
    return true;
  }
  st.junction = { refUntil: j.refUntil, v, vT: t };
  return false;
}

function onAtrial(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const def = RHYTHMS[st.id];
  if (def.atria === 'fib') {
    const conducted = junctionImpulse(st, t, ctx);
    st.records.push({ type: 'atrial', t, kind: 'fib', conducted });
    st.atria.nextT = t + AF_IMPULSE_MIN_S - (AF_IMPULSE_MEAN_S - AF_IMPULSE_MIN_S) * Math.log(1 - uniform(ctx.rng.conduction));
    return;
  }
  if (def.atria === 'flutter') {
    // The F wave itself is the continuous sawtooth in st.fwaves; this event only drives conduction.
    const conducted = st.atria.groupPos === 0;
    st.atria.groupPos++;
    if (st.atria.groupPos >= st.atria.groupRatio) {
      st.atria.groupPos = 0;
      st.atria.groupRatio = flutterRatio(st, ctx.rng.conduction);
    }
    if (conducted) pushPending(st, { t: t + FLUTTER_FR_S, origin: 'atrial', template: 'narrow', prMs: FLUTTER_FR_S * 1000, pvc: false, coupling: 0, bypass: false });
    st.records.push({ type: 'atrial', t, kind: 'flutter', conducted });
    st.atria.nextT = t + 60 / atrialRate(st, def, t, ctx);
    return;
  }
  // Sinus P wave
  const rate = atrialRate(st, def, t, ctx);
  st.events.push(makeEvent(t, pWaveKernels()));
  let pr: number | null = null;
  if (def.av === 'conducted') {
    pr = st.id === 'avb1' ? (st.opts.prMs ?? AVB1_DEFAULT_PR_MS) : prMs(rate);
  } else if (def.av === 'wenckebach') {
    const n = st.opts.groupSize ?? 4;
    const pos = st.atria.groupPos;
    if (pos < n - 1) {
      // PR_n = PR_1 + Δ·(1 − r^(n−1))/(1 − r)  (brief §4.1), n = pos + 1
      pr = prMs(rate) + 1000 * MOBITZ1_DELTA_S * ((1 - MOBITZ1_R ** pos) / (1 - MOBITZ1_R));
    }
    st.atria.groupPos = (pos + 1) % n;
  }
  if (pr !== null) {
    if (t < st.avRefUntil) pr = null; // AV node still refractory: blocked (review H1)
    // After an ectopic beat (PVC, escape) the ventricle may still be refractory: the P is concealed (brief §4.1).
    else if (st.respectRefractory && !st.lastConducted && t + pr / 1000 < st.refractoryUntil) pr = null;
  }
  if (pr !== null) {
    st.avRefUntil = t + AV_NODE_ERP_S;
    pushPending(st, { t: t + pr / 1000, origin: 'sinus', template: 'narrow', prMs: pr, pvc: false, coupling: 0, bypass: false });
  }
  st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
  st.atria.nextT = t + sinusRR(60 / rate, t, ctx.hrv, ctx.mods, ctx.rng.hrv);
}

function fFill(rr: number): number {
  // f_fill(RR) = 1 − exp(−max(0, RR − t_sys)/τ_fill), t_sys = LVET + 0.08 s, τ_fill 0.18 s,
  // normalised to 1 at RR 1 s (brief §4.8; research 03 §8.2)
  const f = (x: number) => 1 - Math.exp(-Math.max(0, x - (Math.max(150, lvetMs(60 / x)) / 1000 + 0.08)) / 0.18);
  return f(rr) / f(1);
}

/** Stroke-volume factor k_rhythm for one beat (brief §4.8 table). */
function kRhythm(st: RhythmState, p: PendingV, rr: number): number {
  let k: number;
  if (p.pvc) k = p.coupling < PVC_NO_EJECTION_BELOW ? 0 : 0.3; // PVC 0–0.6
  else if (p.origin === 'ventricular') {
    const hr = 60 / rr;
    if (RHYTHMS[st.id].focus === 'vt') k = hr <= 150 ? 0.6 : hr >= 200 ? 0.2 : 0.6 - (0.4 * (hr - 150)) / 50; // VT 0.4–0.6 / 0–0.3
    else k = rr >= 1.5 ? 1.4 : 0.7; // CHB escape ≤40/min: SV × 1.3–1.5; idioventricular 0.6–0.8
  } else if (p.origin === 'junctional') k = RHYTHMS[st.id].focus === 'svt' ? 0.85 * fFill(rr) : 0.85; // junctional 0.8–0.9
  else if (st.id === 'afib') k = 0.8 * fFill(rr); // AF 0.75–0.85 × f_fill
  else if (st.id === 'aflutter') k = 0.85; // flutter 0.8–0.9
  else k = 1.0; // sinus
  if (st.lastWasPvc && !p.pvc) k *= 1.2; // beat after a PVC 1.1–1.3
  return Math.max(0, k);
}

/** A beat conducted from the atria (sinus P, flutter F) rather than a ventricular or junctional pacemaker. */
function isConducted(p: PendingV): boolean {
  return !p.pvc && (p.origin === 'sinus' || p.origin === 'atrial');
}

function activateVentricle(st: RhythmState, p: PendingV, ctx: RhythmCtx): boolean {
  const t = p.t;
  // Concealed if the ventricle is refractory (brief §4.1). Primary pacemakers (p.bypass) are exempt: the
  // VT/AVNRT focus and the AF junction already set their own cycle length [ENG]. A conducted beat that follows a
  // conducted beat is exempt too: the AV node (AV_NODE_ERP_S) is what limits supraventricular conduction, and
  // letting ventricular refractoriness do it locked sinus above ~180/min into 2:1 (review H1).
  const afterConducted = isConducted(p) && st.lastConducted;
  if (st.respectRefractory && !p.bypass && !afterConducted && t < st.refractoryUntil) return false;
  const rate = rhythmRate(st, t, ctx);
  const rr = st.lastVT > -NEVER / 2 ? t - st.lastVT : 60 / Math.max(30, rate || 60);
  const qt = qtFridericiaMs(clamp(rr, 0.25, 2), ctx.mods.qtc);
  const scale = p.template === 'wide' ? (RHYTHMS[st.id].focus === 'vt' ? 0.9 : 1) : 1 + QRS_AMP_RESP_MOD * respSin(t, ctx.hrv);
  const k = templateKernels(p.template, qt, scale);
  st.events.push(makeEvent(t, k));
  const qrsMs = templateQrsMs(p.template);
  const qtDrawn = kernelQtMs(k);
  const kSV = kRhythm(st, p, rr);
  const beat: EngineEvent = {
    type: 'beat',
    t: t + fiducialS(p.template),
    seq: st.beatSeq++,
    origin: p.origin,
    template: p.pvc ? 'pvc' : p.template,
    qrsMs,
    qtMs: Math.round(qtDrawn),
    mech: { perfused: kSV > 0, kSV, svMl: Math.round(BASE_SV_ML * kSV), lvetMs: Math.round(Math.max(150, lvetMs(60 / rr))) },
  };
  if (p.prMs !== null) beat.prMs = Math.round(p.prMs);
  st.records.push(beat);
  st.refractoryUntil = t + qrsMs / 1000 + (REFRACTORY_QT_FRACTION * qtDrawn) / 1000;
  st.lastVT = t;
  const def = RHYTHMS[st.id];
  const er = escapeRate(st, def, t, ctx);
  st.escapeNextT = er > 0 ? t + 60 / er + (def.rateDrives === 'escape' ? ESCAPE_JITTER_SD_S * ctx.mods.hrvScale * normal(ctx.rng.hrv) : 0) : NEVER;

  // Ectopy: decided per supraventricular beat (brief §4.1 "per sinus beat: draw ectopy")
  const supra = !p.pvc && p.template !== 'wide';
  if (supra) st.lastSupraT = t;
  const pvc = ctx.mods.pvc;
  if (supra && pvc) {
    const fire = pvc.pattern === 'bigeminy' || uniform(ctx.rng.ectopy) < pvc.probability;
    if (fire) {
      const rrNow = 60 / Math.max(20, atrialRate(st, def, t, ctx) || rate || 60);
      const frac = PVC_COUPLING_MIN + PVC_COUPLING_SPAN * uniform(ctx.rng.ectopy);
      const tp = Math.max(t + frac * rrNow, st.refractoryUntil + 0.005);
      pushPending(st, { t: tp, origin: 'ventricular', template: 'wide', prMs: null, pvc: true, coupling: (tp - t) / rrNow, bypass: false });
    }
  }
  st.lastWasPvc = p.pvc;
  st.lastConducted = isConducted(p);

  if (st.pendingSwitch) {
    const sw = st.pendingSwitch;
    applyRhythm(st, sw.id, sw.opts, t + 0.001, sw.respectRefractory, ctx);
  }
  return true;
}

function onFocus(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const def = RHYTHMS[st.id];
  const rate = rhythmRate(st, t, ctx);
  const isVt = def.focus === 'vt';
  const ok = activateVentricle(
    st,
    { t, origin: isVt ? 'ventricular' : 'junctional', template: isVt ? 'wide' : 'narrowRetroP', prMs: null, pvc: false, coupling: 0, bypass: true },
    ctx,
  );
  if (ok && !isVt) st.records.push({ type: 'atrial', t: t + 0.07, kind: 'retrograde', conducted: false });
  const next = t + 60 / rate + VT_JITTER_S * (2 * uniform(ctx.rng.ectopy) - 1);
  st.focusNextT = ok ? next : Math.max(next, st.refractoryUntil + 0.01);
}

function onEscape(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const def = RHYTHMS[st.id];
  const origin: BeatOrigin = def.escape === 'ventricular' ? 'ventricular' : 'junctional';
  const ok = activateVentricle(st, { t, origin, template: def.escapeTemplate, prMs: null, pvc: false, coupling: 0, bypass: false }, ctx);
  if (!ok) {
    const er = escapeRate(st, def, t, ctx);
    st.escapeNextT = er > 0 ? Math.max(t, st.refractoryUntil) + 60 / er : NEVER;
  }
}

/** Process every internal rhythm event with time ≤ T. */
export function planUntil(st: RhythmState, T: number, ctx: RhythmCtx): void {
  for (let guard = 0; guard < 1_000_000; guard++) {
    const def = RHYTHMS[st.id];
    const tA = def.atria === 'none' ? NEVER : st.atria.nextT;
    const tP = st.pending.length > 0 ? (st.pending[0] as PendingV).t : NEVER;
    const tF = def.focus === 'none' ? NEVER : st.focusNextT;
    const tE = def.escape === 'none' ? NEVER : st.escapeNextT;
    const tJ = def.av === 'integrateFire' ? junctionSpontT(st, ctx) : NEVER;
    const t = Math.min(tA, tP, tF, tE, tJ);
    if (t > T) break;
    if (t === tA) onAtrial(st, t, ctx);
    else if (t === tJ) fireJunction(st, t, ctx);
    else if (t === tP) activateVentricle(st, st.pending.shift() as PendingV, ctx);
    else if (t === tF) onFocus(st, t, ctx);
    else onEscape(st, t, ctx);
  }
  st.planT = Math.max(st.planT, T);
}
