// Per-patient morphology fingerprint (brief §5 "Individuality: patientSeed, morphologyVariation"; research 04 §5).
// A stable function of patientSeed: per-wave frontal/horizontal rotations (±20°·mv), amplitude scales (±25%·mv),
// T timing (±25 ms·mv) and QRS width (±10%·mv). mv = 0 leaves the textbook morphology untouched.
import { createRngState, uniform } from '../../../rng/sfc32.ts';
import { K_STRIDE, WAVE } from '../kernels.ts';
import type { Modifiers } from '../../../types.ts';
import type { MorphStage, PStage } from './index.ts';
import { stretchQrs } from './ops.ts';

interface Fingerprint {
  rotZ: number[]; // per wave code 0..5 (P Q R S T U), radians at mv = 1
  rotY: number[];
  amp: number[];
  tShiftS: number;
  qrsF: number;
}

const cache = new Map<number, Fingerprint>();

export function fingerprint(seed: number): Fingerprint {
  let f = cache.get(seed);
  if (!f) {
    const s = createRngState(seed).scenario; // a private copy: never touches the engine's streams
    const u = () => 2 * uniform(s) - 1;
    const deg = Math.PI / 180;
    f = {
      rotZ: Array.from({ length: 6 }, () => 20 * deg * u()),
      rotY: Array.from({ length: 6 }, () => 20 * deg * u()),
      amp: Array.from({ length: 6 }, () => 0.25 * u()),
      tShiftS: 0.025 * u(),
      qrsF: 0.1 * u(),
    };
    cache.set(seed, f);
  }
  return f;
}

function perturb(k: number[], fp: Fingerprint, mv: number): void {
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const w = k[i + 6] as number;
    const c = w === WAVE.DELTA ? WAVE.R : w;
    if (c > WAVE.U) continue;
    const az = (fp.rotZ[c] as number) * mv;
    const ay = (fp.rotY[c] as number) * mv;
    let x = k[i + 3] as number;
    let y = k[i + 4] as number;
    let z = k[i + 5] as number;
    [x, y] = [Math.cos(az) * x - Math.sin(az) * y, Math.sin(az) * x + Math.cos(az) * y];
    [x, z] = [Math.cos(ay) * x + Math.sin(ay) * z, -Math.sin(ay) * x + Math.cos(ay) * z];
    const a = 1 + (fp.amp[c] as number) * mv;
    k[i + 3] = x * a;
    k[i + 4] = y * a;
    k[i + 5] = z * a;
    if (w === WAVE.T || w === WAVE.U) k[i] = (k[i] as number) + fp.tShiftS * mv;
  }
}

export const individualityStage: MorphStage = (k, _info, mods) => {
  const mv = mods.morphologyVariation;
  if (mv === 0) return k;
  const fp = fingerprint(mods.patientSeed);
  perturb(k, fp, mv);
  return stretchQrs(k, 1 + fp.qrsF * mv);
};

export const pIndividualityStage: PStage = (k, mods: Modifiers) => {
  if (mods.morphologyVariation === 0) return k;
  perturb(k, fingerprint(mods.patientSeed), mods.morphologyVariation);
  return k;
};
