// Junctional foci (research 03 §1.5): junctional escape / accelerated / tachycardia with a retrograde P′ before,
// within or after the QRS, and orthodromic AVRT (retrograde P′ with RP > 70 ms).
import { uniform } from '../../rng/sfc32.ts';
import { WAVE, kernel, makeEvent } from './kernels.ts';
import { pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { Vec3 } from './vcg.ts';

/** Junctional/AVRT retrograde P′: inverted in II (−0.12 mV) (research 03 §1.5) [ENG]. */
export const RETRO_JUNCTIONAL_P_VEC: Vec3 = [-0.03, -0.105, 0.02];
const JUNCTIONAL_PR_S = 0.08; // retrograde P before the QRS: short PR < 120 ms (research 03 §1.5)
const JUNCTIONAL_RP_S = 0.1; // retrograde P after the QRS [ENG]
export const AVRT_RP_ONSET_S = 0.13; // AVRT: P′ onset 130 ms after QRS onset → RP > 70 ms (research 03 §1.5)
const FOCUS_JITTER_S = 0.004; // [ENG]

function retroP(st: RhythmState, t: number): void {
  st.events.push(makeEvent(t, kernel(0.045, 0.022, 0.022, RETRO_JUNCTIONAL_P_VEC, WAVE.RETRO_P)));
  st.records.push({ type: 'atrial', t, kind: 'retrograde', conducted: false });
}

function jitter(ctx: RhythmCtx, s: number): number {
  return s * (2 * uniform(ctx.rng.ectopy) - 1);
}

export function onJunctional(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const where = st.opts.retroP ?? 'before';
  if (where === 'before') {
    retroP(st, t);
    pushPending(st, { t: t + JUNCTIONAL_PR_S, origin: 'junctional', template: 'narrow', prMs: null, pvc: false, coupling: 0, bypass: true });
  } else {
    pushPending(st, { t, origin: 'junctional', template: 'narrow', prMs: null, pvc: false, coupling: 0, bypass: true });
    retroP(st, where === 'hidden' ? t : t + JUNCTIONAL_RP_S);
  }
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + jitter(ctx, FOCUS_JITTER_S);
}

export function onAvrt(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t, origin: 'junctional', template: 'narrow', prMs: null, pvc: false, coupling: 0, bypass: true });
  retroP(st, t + AVRT_RP_ONSET_S);
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + jitter(ctx, FOCUS_JITTER_S);
}
