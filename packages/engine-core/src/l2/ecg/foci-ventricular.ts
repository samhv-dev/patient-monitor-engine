// Ventricular foci (research 03 §1.5): idioventricular / AIVR, polymorphic VT, torsades de pointes (brief §4.1
// "Torsades: envelope cos(2πt/T_twist), T_twist 5–20 beats") and agonal rhythm.
import { normal, uniform } from '../../rng/sfc32.ts';
import { pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';

const IVR_JITTER_S = 0.01; // [ENG]
const POLY_RR_CV = 0.08; // polymorphic VT: irregular [ENG]
const POLY_AXIS_STEP_RAD = 0.15; // beat-to-beat axis step, radians [ENG, Stage 5.1: was an unbounded 0.6 walk]
const POLY_AXIS_KEEP = 0.7; // mean reversion per beat: stationary SD 0.15/√(1−0.49) = 0.21 rad (12°) [ENG, Stage 5.1]
const TORSADES_RR_CV = 0.05; // [ENG]
const TORSADES_AXIS_RAD = 0.35; // axis wobble ±20° over a twist [ENG]
const AGONAL_RR_MIN_S = 3; // agonal < 20/min, irregular (research 03 §1.5)
const AGONAL_RR_SPAN_S = 4.5;
const AGONAL_DECAY_S = 120; // decaying amplitude [ENG]

function jitter(ctx: RhythmCtx, s: number): number {
  return s * (2 * uniform(ctx.rng.ectopy) - 1);
}

export function onIdioventricular(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true });
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + jitter(ctx, IVR_JITTER_S);
}

export function onVtPoly(st: RhythmState, t: number, ctx: RhythmCtx): void {
  // Stage 5.1: a mean-reverting walk, so the axis never parks for seconds perpendicular to V1 (G5-obs: V1 flat ~2 s)
  st.focusAxis = POLY_AXIS_KEEP * st.focusAxis + POLY_AXIS_STEP_RAD * normal(ctx.rng.ectopy);
  const scale = 0.4 + uniform(ctx.rng.ectopy); // Stage 5.1: 0.4–1.4 (was 0.6–1.2) keeps the beat-to-beat amplitude spread with the bounded axis walk
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true, scale, twistRad: st.focusAxis });
  const rr = (60 / rhythmRate(st, t, ctx)) * Math.max(0.7, 1 + POLY_RR_CV * normal(ctx.rng.ectopy));
  st.focusNextT = t + rr;
}

/** Torsades: QRS amplitude and polarity follow cos(2π·n/T_twist) (brief §4.1), T_twist 5–20 beats. */
export function onTorsades(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const n = st.focusN;
  const twist = Math.min(20, Math.max(5, st.opts.twistBeats ?? 12));
  const ph = (2 * Math.PI * n) / twist;
  const scale = 1.1 * Math.cos(ph);
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true, scale, twistRad: TORSADES_AXIS_RAD * Math.sin(ph) });
  const rr = (60 / rhythmRate(st, t, ctx)) * Math.max(0.8, 1 + TORSADES_RR_CV * normal(ctx.rng.ectopy));
  st.focusNextT = t + rr;
}

export function onAgonal(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const scale = Math.max(0.25, Math.exp(-(t - st.startT) / AGONAL_DECAY_S));
  pushPending(st, { t, origin: 'ventricular', template: 'agonal', prMs: null, pvc: false, coupling: 0, bypass: true, scale });
  st.focusNextT = t + AGONAL_RR_MIN_S + AGONAL_RR_SPAN_S * uniform(ctx.rng.ectopy);
}
