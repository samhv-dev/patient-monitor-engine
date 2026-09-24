// Ventricular / junctional focus handlers (brief §4.1 "ventricle.focus"; research 03 §1.5). A focus is a primary
// pacemaker: it schedules its own beats (bypassing the refractory check) and its next firing time.
import { uniform } from '../../rng/sfc32.ts';
import { RHYTHMS, type FocusMode } from './rhythms.ts';
import { pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';

export const VT_JITTER_S = 0.004; // ±4 ms cycle-length jitter [ENG]

function onVt(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t, origin: 'ventricular', template: 'wide', prMs: null, pvc: false, coupling: 0, bypass: true, scale: 0.9 });
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + VT_JITTER_S * (2 * uniform(ctx.rng.ectopy) - 1);
}

function onAvnrt(st: RhythmState, t: number, ctx: RhythmCtx): void {
  pushPending(st, { t, origin: 'junctional', template: 'narrowRetroP', prMs: null, pvc: false, coupling: 0, bypass: true });
  st.records.push({ type: 'atrial', t: t + 0.07, kind: 'retrograde', conducted: false });
  st.focusNextT = t + 60 / rhythmRate(st, t, ctx) + VT_JITTER_S * (2 * uniform(ctx.rng.ectopy) - 1);
}

export type FocusHandler = (st: RhythmState, t: number, ctx: RhythmCtx) => void;

/** One handler per focus mode. Later tasks add junctional, avrt, idioventricular, vtPoly, torsades, agonal. */
export const FOCUS_HANDLERS: Partial<Record<FocusMode, FocusHandler>> = {
  vt: onVt,
  svt: onAvnrt,
};

export function onFocus(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const h = FOCUS_HANDLERS[RHYTHMS[st.id].focus];
  st.focusN++;
  if (h) h(st, t, ctx);
  else st.focusNextT = 1e12;
}
