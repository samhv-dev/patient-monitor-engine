// Ectopic atrial rhythms (research 03 §1.5): focal atrial tachycardia (one abnormal P′, regular) and multifocal
// atrial tachycardia (≥ 3 P′ shapes, varying PR, irregular PP).
import { normal, uniform } from '../../rng/sfc32.ts';
import { WAVE, kernel, makeEvent } from './kernels.ts';
import { RHYTHMS } from './rhythms.ts';
import { applyPMorphology } from './morphology/index.ts';
import { atrialRate, conductAt } from './atria.ts';
import { HOOKS, pushPending, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { Vec3 } from './vcg.ts';

/** Focal AT P′: low-atrial origin, inverted in II (−0.13 mV) [ENG]. */
export const ECTOPIC_P_VEC: Vec3 = [0.02, -0.12, 0.03];
/** MAT foci: normal-axis, inverted and flat P′ (II +0.15 / −0.13 / +0.05 mV), each with its own PR offset [ENG]. */
export const MAT_FOCI: ReadonlyArray<{ vec: Vec3; prOffsetMs: number }> = [
  { vec: [0.165, 0.105, 0.007], prOffsetMs: 0 },
  { vec: [0.02, -0.12, 0.03], prOffsetMs: -25 },
  { vec: [0.2, 0.02, 0.1], prOffsetMs: 35 },
];
const AT_JITTER_S = 0.003; // focal AT is regular [ENG]
const MAT_RR_CV = 0.15; // "irregular" PP [ENG]

function emitP(st: RhythmState, t: number, vec: Vec3, prOffsetMs: number, rate: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  st.events.push(makeEvent(t, applyPMorphology(kernel(0.045, 0.022, 0.022, vec, WAVE.P), ctx.mods)));
  const pr0 = conductAt(st, t, rate, ctx);
  const pr = pr0 === null ? null : Math.max(90, pr0 + prOffsetMs);
  if (pr !== null) pushPending(st, { t: t + pr / 1000, origin: 'atrial', template: d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
  st.records.push({ type: 'atrial', t, kind: 'p', conducted: pr !== null });
  st.atria.lastT = t;
  for (const h of HOOKS.onP) h(st, t, ctx);
}

export function onEctopic(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const rate = atrialRate(st, RHYTHMS[st.id], t, ctx);
  emitP(st, t, ECTOPIC_P_VEC, 0, rate, ctx);
  st.atria.nextT = t + 60 / rate + AT_JITTER_S * (2 * uniform(ctx.rng.hrv) - 1);
}

export function onMultifocal(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const rate = atrialRate(st, RHYTHMS[st.id], t, ctx);
  const f = MAT_FOCI[Math.floor(uniform(ctx.rng.ectopy) * MAT_FOCI.length) % MAT_FOCI.length] as (typeof MAT_FOCI)[number];
  emitP(st, t, f.vec, f.prOffsetMs, rate, ctx);
  const rr = (60 / rate) * Math.min(1.5, Math.max(0.6, 1 + MAT_RR_CV * normal(ctx.rng.hrv)));
  st.atria.nextT = t + rr;
}
