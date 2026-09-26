// Per-patient morphology fingerprint (brief §5 "Individuality: patientSeed, morphologyVariation"; research 04 §5,
// Squiggler's "every patient drawn has an ECG fingerprint of their own"). Stage 5.1 bounds (at mv = 1): P, QRS and T
// amplitude ±10 %, P, QRS and T width ±10 %, measured frontal QRS axis ±15° from the textbook beat. A stable
// function of patientSeed (its own PRNG copy, never the engine's streams); mv = 0 leaves the textbook beat untouched.
import { createRngState, uniform } from '../../../rng/sfc32.ts';
import { K_STRIDE, WAVE } from '../kernels.ts';
import type { Modifiers } from '../../../types.ts';
import type { MorphStage, PStage } from './index.ts';
import { QRS_T, solveAxisRad } from './conduction.ts';
import { QRS_WAVES, frontalAxisDeg, rotateZSel, stretchQrs } from './ops.ts';

export const FP_AMP = 0.1;
export const FP_WIDTH = 0.1;
export const FP_AXIS_DEG = 15;

export interface Fingerprint {
  amp: { p: number; qrs: number; t: number }; // fractional, in [−FP_AMP, FP_AMP]
  width: { p: number; qrs: number; t: number }; // fractional, in [−FP_WIDTH, FP_WIDTH]
  axisDeg: number; // in [−FP_AXIS_DEG, FP_AXIS_DEG]
}

const cache = new Map<number, Fingerprint>();

export function fingerprint(seed: number): Fingerprint {
  let f = cache.get(seed);
  if (!f) {
    const s = createRngState(seed).scenario; // a private copy: never touches the engine's streams
    const u = () => 2 * uniform(s) - 1;
    f = {
      amp: { p: FP_AMP * u(), qrs: FP_AMP * u(), t: FP_AMP * u() },
      width: { p: FP_WIDTH * u(), qrs: FP_WIDTH * u(), t: FP_WIDTH * u() },
      axisDeg: FP_AXIS_DEG * u(),
    };
    cache.set(seed, f);
  }
  return f;
}

function scaleVec(k: number[], i: number, a: number): void {
  for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * a;
}

export const individualityStage: MorphStage = (k, _info, mods) => {
  const mv = mods.morphologyVariation;
  if (mv === 0) return k;
  const fp = fingerprint(mods.patientSeed);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const w = k[i + 6] as number;
    if (QRS_WAVES.has(w)) scaleVec(k, i, 1 + fp.amp.qrs * mv);
    else if (w === WAVE.T || w === WAVE.U) {
      scaleVec(k, i, 1 + fp.amp.t * mv);
      if (w === WAVE.T) {
        k[i + 1] = (k[i + 1] as number) * (1 + fp.width.t * mv);
        k[i + 2] = (k[i + 2] as number) * (1 + fp.width.t * mv);
      }
    }
  }
  stretchQrs(k, 1 + fp.width.qrs * mv);
  // ±15° of MEASURED frontal axis (the VCG-rotation → axis map is non-linear, so solve it as axisStage does; ≈ 0.03 ms)
  return rotateZSel(k, solveAxisRad(k, frontalAxisDeg(k) + fp.axisDeg * mv), QRS_T);
};

export const pIndividualityStage: PStage = (k, mods: Modifiers) => {
  const mv = mods.morphologyVariation;
  if (mv === 0) return k;
  const fp = fingerprint(mods.patientSeed);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    scaleVec(k, i, 1 + fp.amp.p * mv);
    k[i + 1] = (k[i + 1] as number) * (1 + fp.width.p * mv);
    k[i + 2] = (k[i + 2] as number) * (1 + fp.width.p * mv);
  }
  return k;
};
