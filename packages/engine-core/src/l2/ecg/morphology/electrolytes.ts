// Potassium and temperature (brief §5 "Electrolytes from state k", "Temperature"; research 03 §1.6).
// HyperK ordering: K 5.5–6.5 peaked T (σ −40%, a ×2.5) → 6.5–7.5 P flattens, PR +40 ms → ≥ 7 QRS +20–100% →
// > 8 sine wave (QRS merges into T). HypoK: U up to 0.28 mV, T flattening, slight ST depression.
// Hypothermia: Osborn J at the J point (σ 12/20 ms), largest in V3–V4, 0.4 mV at 28 °C; QRS/QT/PR prolonged.
import { WAVE, K_STRIDE } from '../kernels.ts';
import type { Modifiers } from '../../../types.ts';
import type { Vec3 } from '../vcg.ts';
import type { MorphStage, PStage, PrTerm } from './index.ts';
import { ISCHAEMIA_DIR } from './st.ts';
import { addShaped, jPointS, mainT, scaleWaves, stretchQrs } from './ops.ts';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const hyperK = (k: number) => ({
  s1: clamp01((k - 5.5) / 1), // peaked T
  s2: clamp01((k - 6.5) / 1), // P flattening, PR↑
  s3: clamp01((k - 7) / 1.5), // QRS widening
  s4: clamp01((k - 8) / 1), // sine wave
});
export const hypoK = (k: number) => clamp01((3.5 - k) / 1.5);
export const coldness = (tempC: number) => clamp01((34 - tempC) / 6);
/** Osborn direction: V3 1.48, V4 1.16, II 0.60 per unit [ENG]. */
export const OSBORN_DIR: Vec3 = [0.55, 0.35, -0.75];

export const potassiumStage: MorphStage = (k, _info, mods) => {
  const { s1, s3, s4 } = hyperK(mods.k);
  const lo = hypoK(mods.k);
  const t = mainT(k);
  if (s1 > 0 && t >= 0) {
    k[t + 1] = (k[t + 1] as number) * (1 - 0.4 * s1);
    k[t + 2] = (k[t + 2] as number) * (1 - 0.4 * s1);
    for (let j = 3; j < 6; j++) k[t + j] = (k[t + j] as number) * (1 + 1.5 * s1);
  }
  if (s3 > 0 || s4 > 0) stretchQrs(k, 1 + s3 + s4);
  if (s4 > 0 && t >= 0) {
    k[t] = (k[t] as number) - 0.2 * s4; // T pulled into the widened QRS: the ST segment disappears [ENG]
    k[t + 1] = (k[t + 1] as number) * (1 + 3 * s4);
  }
  if (lo > 0) {
    scaleWaves(k, WAVE.U, 1 + 8.3 * lo);
    scaleWaves(k, WAVE.T, 1 - 0.6 * lo);
    const j = jPointS(k);
    addShaped(k, j + 0.04, 0.015, 0.08, ISCHAEMIA_DIR, 'ecgII', -0.05 * lo, j + 0.06, WAVE.ST);
  }
  return k;
};

export const temperatureStage: MorphStage = (k, _info, mods) => {
  const cold = Math.max(0, 37 - mods.tempC);
  if (cold === 0) return k;
  stretchQrs(k, 1 + 0.015 * cold);
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T || k[i + 6] === WAVE.U) k[i] = (k[i] as number) * (1 + 0.02 * cold);
  const c = coldness(mods.tempC);
  if (c > 0) {
    const j = jPointS(k);
    addShaped(k, j - 0.005, 0.012, 0.02, OSBORN_DIR, 'V3', 0.4 * c, j - 0.005, WAVE.J);
  }
  return k;
};

/** P flattening with hyperkalaemia (P lost from K ≈ 7.8) and low voltage. */
export const pPotassiumStage: PStage = (k, mods: Modifiers) => {
  const { s2 } = hyperK(mods.k);
  const f = mods.k >= 7.8 ? 0 : 1 - 0.8 * s2;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    k[i + 2] = (k[i + 2] as number) * (1 + 0.5 * s2);
    for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * f * mods.lowVoltage;
  }
  return k;
};

export const prPotassium: PrTerm = (mods) => 40 * hyperK(mods.k).s2;
export const prTemperature: PrTerm = (mods) => 3 * Math.max(0, 35 - mods.tempC);
