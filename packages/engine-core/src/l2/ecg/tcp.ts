// Transcutaneous pacing as seen on the ECG (brief §6.5; research 03 §1.7): a wide, blunt 20–40 ms artefact per
// pulse plus a pace marker; electrical capture (wide QRS, broad T) iff mA ≥ threshold and the ventricle is not
// refractory. Stage 4's pacer device writes Modifiers.tcp; the engine only draws what the pads do.
import { WAVE, kernel, makeEvent } from './kernels.ts';
import { HOOKS, NEVER, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { Vec3 } from './vcg.ts';

/** Pad artefact direction: anterior–posterior pads, large in V leads and II [ENG]. */
export const TCP_ART_DIR: Vec3 = [0.25, 0.6, -0.9];
/** Artefact amplitude (mV along TCP_ART_DIR): 1.5 + 2.5·mA/140, capped at 4 [ENG]. */
export function tcpArtefactMv(mA: number): number {
  return Math.min(4, 1.5 + (2.5 * mA) / 140);
}

export const tcpClock = {
  next(st: RhythmState, ctx: RhythmCtx): number {
    const m = ctx.mods.tcp;
    if (!m) {
      st.tcpNextT = undefined;
      return NEVER;
    }
    if (st.tcpNextT === undefined) st.tcpNextT = st.planT + 0.05;
    return st.tcpNextT;
  },
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void {
    const m = ctx.mods.tcp;
    if (!m) return;
    const iv = 60 / m.ratePpm;
    // Demand mode: an intrinsic (non-paced) beat within the last interval inhibits the pulse.
    if (m.mode === 'demand' && t - st.lastVT < iv - 1e-9) {
      st.tcpNextT = st.lastVT + iv;
      return;
    }
    st.tcpNextT = t + iv;
    // 40 ms blunt deflection: rise σ 8 ms, fall σ 14 ms, peak 12 ms after the pulse starts [ENG].
    st.events.push(makeEvent(t, kernel(0.012, 0.008, 0.014, TCP_ART_DIR, WAVE.ART, tcpArtefactMv(m.mA) / Math.hypot(...TCP_ART_DIR))));
    const captured = m.mA >= m.thresholdMa && !(t < st.refractoryUntil);
    st.records.push({ type: 'marker', t, kind: 'paceSpike', data: { chamber: 2, captured, tcp: true, mA: m.mA } });
    if (captured) HOOKS.activate(st, { t: t + 0.02, origin: 'paced', template: 'pacedV', prMs: null, pvc: false, coupling: 0, bypass: true }, ctx);
  },
};
