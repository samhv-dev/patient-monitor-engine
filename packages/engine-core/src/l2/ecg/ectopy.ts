// Ectopy drawn per supraventricular beat (brief §4.1 "per sinus beat: draw ectopy"). This is the Stage 1 PVC
// behaviour (single, bigeminy) moved out of the rhythm engine; Task 7 replaces this file with the full set.
import { uniform } from '../../rng/sfc32.ts';
import { RHYTHMS } from './rhythms.ts';
import { atrialRate } from './atria.ts';
import { pushPending, rhythmRate, type PendingV, type RhythmCtx, type RhythmState } from './rhythm-state.ts';

const PVC_COUPLING_MIN = 0.55; // PVC coupling 40–80% of RR (brief §5); drawn 55–65% [ENG]
const PVC_COUPLING_SPAN = 0.1;

/** The prevailing supraventricular RR (s) at time t. */
export function prevailingRR(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return 60 / Math.max(20, atrialRate(st, d, t, ctx) || rhythmRate(st, t, ctx) || 60);
}

/** Called after every activated supraventricular beat p (QRS onset t; T peak tPeakS after onset, used by Task 7). */
export function afterSupraBeat(st: RhythmState, _p: PendingV, t: number, ctx: RhythmCtx, _tPeakS = 0.3): void {
  const pvc = ctx.mods.pvc;
  if (!pvc) return;
  const fire = pvc.pattern === 'bigeminy' || uniform(ctx.rng.ectopy) < pvc.probability;
  if (!fire) return;
  const rr = prevailingRR(st, t, ctx);
  const frac = PVC_COUPLING_MIN + PVC_COUPLING_SPAN * uniform(ctx.rng.ectopy);
  // Never inside the refractory period of the beat that triggered it: 5 ms after it ends at the earliest [ENG]
  const tp = Math.max(t + frac * rr, st.refractoryUntil + 0.005);
  pushPending(st, { t: tp, origin: 'ventricular', template: 'wide', prMs: null, pvc: true, coupling: (tp - t) / rr, bypass: false });
}
