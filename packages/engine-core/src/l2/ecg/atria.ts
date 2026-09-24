// Atrial clock handlers (brief §4.1 "Rhythm engine": atria × AV node; research 03 §1.5).
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';
import { prMs } from './intervals.ts';
import { makeEvent } from './kernels.ts';
import { sinusRR } from './hrv.ts';
import { DEFAULT_FLUTTER_ATRIAL_BPM, RHYTHMS, type AtrialMode, type RhythmDef } from './rhythms.ts';
import { pWaveKernels } from './templates.ts';
import { WPW_PR_MS } from './beat-templates.ts';
import { HOOKS, NEVER, pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import { applyPMorphology, prDeltaMs } from './morphology/index.ts';

// --- constants (sources in comments) -------------------------------------------------------------
const MOBITZ1_DELTA_S = 0.1; // Δ 60–120 ms [03 §1.5]
const MOBITZ1_R = 0.5; // r = 0.5 [03 §1.5]
export const AVB1_DEFAULT_PR_MS = 280; // PR > 200 ms (brief §5) [ENG value]
const FLUTTER_FR_S = 0.26; // F-wave → QRS conduction time [ENG]
const AF_IMPULSE_MEAN_S = 0.2; // atrial impulses, Poisson at 5/s [03 §1.5, Lian 2007]
const AF_IMPULSE_MIN_S = 0.05; // truncation of the Poisson process [ENG]
const AF_DV_MV = 15; // each impulse raises the junction potential by 15 mV [03 §1.5]
const AF_SLOPE_MV_S = 30; // phase-4 depolarisation 30 mV/s [03 §1.5]
/**
 * Rate control [ENG, calibrated by simulation in Stage 1 Task 9]. For a target ventricular rate hr (RR = 60/hr):
 *   threshold θ = AF_THETA_K · RR²; mean wait W ≈ θ / (slope + ΔV·impulseRate); refractory τ_R = RR − W.
 */
const AF_THETA_K = 80;
const AF_DRIVE_MV_S = AF_SLOPE_MV_S + AF_DV_MV / AF_IMPULSE_MEAN_S;
const AF_RATE_CORRECTION = 0.95;
const AF_AV_S = 0.06; // junction → QRS onset [ENG]
const AF_MIN_REFRACTORY_S = 0.25; // RR_min 0.25–0.30 s (brief §4.1 AF fallback) [ENG]
/**
 * AV-node effective refractory period, P to P (Stage 1.1 review H1: "≈250–300 ms"; the low end, so 1:1 conduction
 * holds up to 240/min) [ENG]. Supraventricular impulses are filtered HERE, not by ventricular refractoriness.
 */
export const AV_NODE_ERP_S = 0.25;
/**
 * AF rate calibration (Stage 1.1 review M1) [ENG]: pairs [target bpm, command bpm] — the command fed to the
 * threshold/refractory formulas that yields the target mean ventricular rate (simulated, 600 s × seeds 11–13).
 */
const AF_RATE_CAL: ReadonlyArray<readonly [number, number]> = [
  [20, 30], [40, 45.1], [50, 51.8], [60, 59.1], [70, 68.8], [80, 79.1], [90, 89.0], [100, 101.5], [110, 110.1],
  [120, 116.6], [130, 124.9], [140, 141.3], [150, 160.5], [160, 189.1], [170, 230.8], [180, 274.0],
];

export function atrialRate(st: RhythmState, d: RhythmDef, t: number, ctx: RhythmCtx): number {
  if (d.atria === 'flutter') return st.opts.atrialRateBpm ?? DEFAULT_FLUTTER_ATRIAL_BPM;
  if (d.rateDrives === 'sinus') return rhythmRate(st, t, ctx);
  return st.opts.atrialRateBpm ?? d.atrialDefaultBpm;
}

export function flutterRatio(st: RhythmState, s: Sfc32State): number {
  const r = st.opts.ratio ?? 2;
  if (r === 'variable') return uniform(s) < 0.5 ? 2 : 4;
  return r;
}

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
export function afRefractoryS(hr: number, minRefractoryS = AF_MIN_REFRACTORY_S): number {
  const rr = (60 * AF_RATE_CORRECTION) / afCommandBpm(hr);
  return Math.max(minRefractoryS, rr - (AF_THETA_K * rr * rr) / AF_DRIVE_MV_S);
}

export function junctionSpontT(st: RhythmState, ctx: RhythmCtx): number {
  const j = st.junction;
  return Math.max(j.vT, j.refUntil) + (afThresholdMv(rhythmRate(st, j.vT, ctx)) - j.v) / AF_SLOPE_MV_S;
}

export function fireJunction(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  pushPending(st, { t: t + AF_AV_S, origin: 'atrial', template: d.conductedTemplate, prMs: null, pvc: false, coupling: 0, bypass: true });
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

function onFib(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const conducted = junctionImpulse(st, t, ctx);
  st.records.push({ type: 'atrial', t, kind: 'fib', conducted });
  st.atria.nextT = t + AF_IMPULSE_MIN_S - (AF_IMPULSE_MEAN_S - AF_IMPULSE_MIN_S) * Math.log(1 - uniform(ctx.rng.conduction));
}

function onFlutter(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  // The F wave itself is the continuous sawtooth in st.fwaves (Stage 1.1, ruling R18); this event only drives conduction.
  const conducted = st.atria.groupPos === 0;
  st.atria.groupPos++;
  if (st.atria.groupPos >= st.atria.groupRatio) {
    st.atria.groupPos = 0;
    st.atria.groupRatio = flutterRatio(st, ctx.rng.conduction);
  }
  if (conducted) pushPending(st, { t: t + FLUTTER_FR_S, origin: 'atrial', template: d.conductedTemplate, prMs: FLUTTER_FR_S * 1000, pvc: false, coupling: 0, bypass: false });
  st.records.push({ type: 'atrial', t, kind: 'flutter', conducted });
  st.atria.nextT = t + 60 / atrialRate(st, d, t, ctx);
}

/**
 * AV-node decision for a P wave at time t (brief §4.1 "AV-node sub-models"). Returns the PR in ms, or null when
 * the P is not conducted. Advances the group counter for Wenckebach / Mobitz II / fixed-ratio blocks.
 */
export function conductP(st: RhythmState, rate: number, ctx: RhythmCtx): number | null {
  const d = RHYTHMS[st.id];
  const basePr = (): number => {
    if (st.opts.prMs !== undefined) return st.opts.prMs;
    if (ctx.mods.overrides.prMs !== undefined) return ctx.mods.overrides.prMs;
    if (st.id === 'avb1') return AVB1_DEFAULT_PR_MS;
    if (d.conductedTemplate === 'wpw') return WPW_PR_MS;
    return prMs(rate) + prDeltaMs(ctx.mods);
  };
  // Paced rhythms with conduction underneath (PacerOpts.intrinsic = 'conducted') conduct every P.
  if (d.pacing !== 'none' && st.opts.pacer?.intrinsic === 'conducted') return basePr();
  switch (d.av) {
    case 'conducted':
      return basePr();
    case 'wenckebach': {
      const n = st.opts.groupSize ?? 4;
      const pos = st.atria.groupPos;
      st.atria.groupPos = (pos + 1) % n;
      if (pos >= n - 1) return null;
      // PR_n = PR_1 + Δ·(1 − r^(n−1))/(1 − r)  (brief §4.1), n = pos + 1
      return basePr() + 1000 * MOBITZ1_DELTA_S * ((1 - MOBITZ1_R ** pos) / (1 - MOBITZ1_R));
    }
    default:
      return null;
  }
}

/**
 * conductP plus the AV-node and ventricular gates (Stage 1.1): a P inside the AV node's refractory period is
 * blocked (review H1); after an ectopic beat (PVC, escape) a P whose QRS would land in the ventricle's refractory
 * period is concealed (brief §4.1). A conducted P restarts the AV-node refractory period.
 */
export function conductAt(st: RhythmState, t: number, rate: number, ctx: RhythmCtx): number | null {
  let pr = conductP(st, rate, ctx);
  if (pr !== null) {
    if (t < st.avRefUntil) pr = null;
    else if (st.respectRefractory && !st.lastConducted && t + pr / 1000 < st.refractoryUntil) pr = null;
  }
  if (pr !== null) st.avRefUntil = t + AV_NODE_ERP_S;
  return pr;
}

/** sinusArrhythmia: RSA depth at least 2.5 (A_RSA 150 ms at RR 1 s → phasic PP swing > 120 ms, research 03 §1.5) [ENG]. */
const SINUS_ARRHYTHMIA_RSA = 2.5;

/** Next sinus P time after a P at t (HRV, sinus arrhythmia, sinus pause). */
function nextSinusT(st: RhythmState, t: number, rate: number, ctx: RhythmCtx): number {
  const m = st.id === 'sinusArrhythmia'
    ? { rsa: Math.max(ctx.mods.rsa, SINUS_ARRHYTHMIA_RSA), hrvScale: Math.max(1, ctx.mods.hrvScale) }
    : ctx.mods;
  const next = t + sinusRR(60 / rate, t, ctx.hrv, m, ctx.rng.hrv);
  if (st.id === 'sinusPause') {
    const every = st.opts.pauseEveryS ?? 12; // [ENG]
    const k0 = Math.floor((t - st.startT) / every);
    const k1 = Math.floor((next - st.startT) / every);
    if (k1 > k0 && k0 >= 0) return t + (st.opts.pauseS ?? 3); // sinus arrest: not a multiple of PP
  }
  return next;
}

function onSinus(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  const rate = atrialRate(st, d, t, ctx);
  st.events.push(makeEvent(t, applyPMorphology(pWaveKernels(), ctx.mods)));
  const pr = conductAt(st, t, rate, ctx);
  if (pr !== null) pushPending(st, { t: t + pr / 1000, origin: 'sinus', template: d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
  st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
  st.atria.lastT = t;
  st.atria.nextT = nextSinusT(st, t, rate, ctx);
  for (const h of HOOKS.onP) h(st, t, ctx);
}

export type AtrialHandler = (st: RhythmState, t: number, ctx: RhythmCtx) => void;

/** One handler per atrial mode. Later tasks add 'ectopic' and 'multifocal'. */
export const ATRIAL_HANDLERS: Partial<Record<AtrialMode, AtrialHandler>> = {
  sinus: onSinus,
  flutter: onFlutter,
  fib: onFib,
};

export function onAtrial(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const h = ATRIAL_HANDLERS[RHYTHMS[st.id].atria];
  if (h) h(st, t, ctx);
  else st.atria.nextT = NEVER;
}
