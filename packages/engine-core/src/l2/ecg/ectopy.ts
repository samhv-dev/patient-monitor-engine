// Ectopy drawn per supraventricular beat (brief §4.1 "per sinus beat: draw ectopy"; brief §5 modifiers;
// research 03 §1.5): PVC patterns (single, bigeminy, trigeminy, couplet, triplet, run, multifocal, R-on-T),
// PACs (SA reset, blocked, aberrant) and PJCs.
import { uniform } from '../../rng/sfc32.ts';
import { RHYTHMS } from './rhythms.ts';
import { atrialRate } from './atria.ts';
import type { BeatTemplateId } from './beat-templates.ts';
import { pushPending, rhythmRate, type PendingV, type RhythmCtx, type RhythmState } from './rhythm-state.ts';

const PVC_COUPLING_MIN = 0.55; // PVC coupling 40–80% of RR (brief §5); drawn 55–65% [ENG]
const PVC_COUPLING_SPAN = 0.1;
export const PVC_RUN_RATE_BPM = 160; // consecutive PVCs "at a VT rate" (research 03 §1.5) [ENG value]
const PVC_FOCI: readonly BeatTemplateId[] = ['wide', 'pvc2', 'pvc3'];
const PAC_COUPLING_MIN = 0.6; // PAC coupling 60–85% of PP (brief §4.1)
const PAC_COUPLING_SPAN = 0.25;
const PJC_COUPLING_MIN = 0.7; // [ENG]
const PJC_COUPLING_SPAN = 0.15;

/** The prevailing supraventricular RR (s) at time t. */
export function prevailingRR(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return 60 / Math.max(20, atrialRate(st, d, t, ctx) || rhythmRate(st, t, ctx) || 60);
}

function pvcCount(st: RhythmState, ctx: RhythmCtx): number {
  const pvc = ctx.mods.pvc;
  if (!pvc) return 0;
  st.ectopyCount++;
  switch (pvc.pattern) {
    case 'bigeminy':
      return 1;
    case 'trigeminy':
      return st.ectopyCount >= 2 ? 1 : 0;
    case 'couplet':
      return uniform(ctx.rng.ectopy) < pvc.probability ? 2 : 0;
    case 'triplet':
      return uniform(ctx.rng.ectopy) < pvc.probability ? 3 : 0;
    case 'run':
      return uniform(ctx.rng.ectopy) < pvc.probability ? (pvc.runLength ?? 5) : 0;
    default:
      return uniform(ctx.rng.ectopy) < pvc.probability ? 1 : 0;
  }
}

/** Called after every activated supraventricular beat p (QRS onset t; T peak tPeakS after onset). */
export function afterSupraBeat(st: RhythmState, _p: PendingV, t: number, ctx: RhythmCtx, tPeakS = 0.3): void {
  const pvc = ctx.mods.pvc;
  const n = pvcCount(st, ctx);
  if (pvc && n > 0) {
    st.ectopyCount = 0;
    const rr = prevailingRR(st, t, ctx);
    const frac = PVC_COUPLING_MIN + PVC_COUPLING_SPAN * uniform(ctx.rng.ectopy);
    // R-on-T: the PVC starts on the T peak of this beat (coupling < QT), so it bypasses refractoriness.
    const rOnT = pvc.rOnT === true;
    const tp = rOnT ? t + tPeakS : Math.max(t + frac * rr, st.refractoryUntil + 0.005);
    for (let i = 0; i < n; i++) {
      const template = pvc.multifocal ? (PVC_FOCI[Math.floor(uniform(ctx.rng.ectopy) * PVC_FOCI.length) % PVC_FOCI.length] as BeatTemplateId) : 'wide';
      const ti = tp + (i * 60) / PVC_RUN_RATE_BPM;
      pushPending(st, { t: ti, origin: 'ventricular', template, prMs: null, pvc: true, coupling: (ti - t) / rr, bypass: rOnT || i > 0 });
    }
  }
  const pac = ctx.mods.pac;
  const d = RHYTHMS[st.id];
  if (pac && d.atria === 'sinus' && st.atria.pac === null && uniform(ctx.rng.ectopy) < pac.probability) {
    const pp = prevailingRR(st, t, ctx);
    const tPac = st.atria.lastT + (PAC_COUPLING_MIN + PAC_COUPLING_SPAN * uniform(ctx.rng.ectopy)) * pp;
    if (tPac > t + 0.05 && tPac < st.atria.nextT) {
      st.atria.nextT = tPac;
      st.atria.pac = { blocked: pac.blocked === true, aberrant: pac.aberrant === true };
    }
  }
  const pjc = ctx.mods.pjc;
  if (pjc && uniform(ctx.rng.ectopy) < pjc.probability) {
    const rr = prevailingRR(st, t, ctx);
    const tj = Math.max(t + (PJC_COUPLING_MIN + PJC_COUPLING_SPAN * uniform(ctx.rng.ectopy)) * rr, st.refractoryUntil + 0.005);
    pushPending(st, { t: tj, origin: 'junctional', template: 'narrowRetroP', prMs: null, pvc: false, coupling: 0, bypass: false });
  }
}
