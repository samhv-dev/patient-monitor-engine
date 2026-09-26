// Transcutaneous pacing as seen on the ECG (brief §6.5; research 03 §1.7): a wide, blunt 20–40 ms artefact per
// pulse plus a pace marker; electrical capture (wide QRS, broad T) iff mA ≥ threshold and the ventricle is not
// refractory. Stage 4's pacer device writes Modifiers.tcp; the engine only draws what the pads do.
import { WAVE, kernel, makeEvent } from './kernels.ts';
import { HOOKS, NEVER, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { Vec3 } from './vcg.ts';

/** Pad artefact direction: anterior–posterior pads, large in V leads and II [ENG]. */
export const TCP_ART_DIR: Vec3 = [0.25, 0.6, -0.9];
/** Artefact amplitude (mV along TCP_ART_DIR): 3 + 3·mA/140, capped at 6 [ENG]. */
export function tcpArtefactMv(mA: number): number {
  return Math.min(6, 3 + (3 * mA) / 140); // Stage 5.1: 3–6 mV (was 1.5–4) so the spike towers over any QRS
}
/**
 * Stage 5.1 artefact shape: a tall, short spike (rise σ 2.5 ms, fall σ 4 ms: FWHM ≈ 8 ms) plus a slow
 * opposite-polarity polarisation tail (−12 %, rise σ 10 ms, fall σ 90 ms). The spike reads as an artefact and
 * never as a QRS (G5-obs); the pace MARKER (below) is what monitors draw at the pulse [ENG, research 03 §1.7].
 */
export const TCP_SPIKE_SIGMA_S: readonly [number, number] = [0.0025, 0.004];
export const TCP_TAIL: { tau: number; sigma: readonly [number, number]; frac: number } = { tau: 0.02, sigma: [0.01, 0.09], frac: -0.12 };
/** After its own pulse the pacer ignores the ventricle for this long (so its own captured beat never inhibits it) [ENG]. */
export const TCP_SENSE_REFRACTORY_S = 0.3;

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
    // Demand mode: a SENSED beat within the last interval inhibits the pulse. Beats inside the pacer's own sensing
    // refractory period after a pulse are not sensed (R-4b-2 / R30: the captured beat used to inhibit the next
    // pulse, so 70 ppm paced at 68.4).
    const sensed = st.lastVT > (st.tcpLastPulseT ?? -NEVER) + TCP_SENSE_REFRACTORY_S ? st.lastVT : -NEVER;
    if (m.mode === 'demand' && t - sensed < iv - 1e-9) {
      st.tcpNextT = sensed + iv;
      return;
    }
    st.tcpNextT = t + iv;
    st.tcpLastPulseT = t;
    const a = tcpArtefactMv(m.mA) / Math.hypot(...TCP_ART_DIR);
    st.events.push(makeEvent(t, [
      ...kernel(0.004, TCP_SPIKE_SIGMA_S[0], TCP_SPIKE_SIGMA_S[1], TCP_ART_DIR, WAVE.ART, a),
      ...kernel(TCP_TAIL.tau, TCP_TAIL.sigma[0], TCP_TAIL.sigma[1], TCP_ART_DIR, WAVE.ART, a * TCP_TAIL.frac),
    ]));
    const captured = m.mA >= m.thresholdMa && !(t < st.refractoryUntil);
    st.records.push({ type: 'marker', t, kind: 'paceSpike', data: { chamber: 2, captured, tcp: true, mA: m.mA } });
    if (captured) HOOKS.activate(st, { t: t + 0.02, origin: 'paced', template: 'pacedV', prMs: null, pvc: false, coupling: 0, bypass: true }, ctx);
  },
};
