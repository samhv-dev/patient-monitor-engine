// Conduction and voltage modifiers (brief §5; research 03 §1.5–1.6): bundle-branch block, axis, precordial
// transition, low voltage, LVH, QRS override and electrical alternans.
import { WAVE } from '../kernels.ts';
import { RBBB_RPRIME_VEC } from '../beat-templates.ts';
import type { Vec3 } from '../vcg.ts';
import type { BeatInfo, MorphStage } from './index.ts';
import { QRS_WAVES, frontalAxisDeg, isWave, jPointS, mainT, qrsOnsetS, rotateY, rotateZSel, scaleWaves, stretchQrs } from './ops.ts';
import { K_STRIDE } from '../kernels.ts';

/** LBBB: no septal q, broad notched R leftward-posterior (I/V6 +, V1 QS), QRS ≈ 154 ms (brief §5 LBBB 154). */
const LBBB_R_VEC: Vec3 = [1.2, 0.3, 0.8];
const QRS_T: ReadonlySet<number> = new Set([WAVE.Q, WAVE.R, WAVE.S, WAVE.DELTA, WAVE.T]);

export const bbbStage: MorphStage = (k, info, mods) => {
  if (mods.bbb === 'none' || !info.supra) return k;
  if (mods.bbb === 'rbbb') {
    k.push(0.085, 0.016, 0.016, ...RBBB_RPRIME_VEC, WAVE.S); // terminal R′ in V1, broad S in I/V6
    return k;
  }
  // LBBB: drop Q/R/S, add two leftward R kernels (notch), discordant T
  const out: number[] = [];
  let rScale = 1;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (isWave(k, i, QRS_WAVES)) {
      if (k[i + 6] === WAVE.R) rScale = Math.hypot(k[i + 3] as number, k[i + 4] as number, k[i + 5] as number) / 1.68;
      continue;
    }
    out.push(...k.slice(i, i + K_STRIDE));
  }
  out.push(0.045, 0.018, 0.018, ...LBBB_R_VEC.map((v) => v * 0.6 * rScale), WAVE.R);
  out.push(0.104, 0.02, 0.02, ...LBBB_R_VEC.map((v) => v * 0.8 * rScale), WAVE.R);
  const t = mainT(out);
  if (t >= 0) {
    const n = Math.hypot(...LBBB_R_VEC);
    const amp = Math.hypot(out[t + 3] as number, out[t + 4] as number, out[t + 5] as number);
    for (let j = 0; j < 3; j++) out[t + 3 + j] = (-(LBBB_R_VEC[j] as number) / n) * amp;
  }
  return out;
};

/**
 * Rotate QRS and T in the frontal plane so the measured frontal axis (net QRS area in I and aVF) equals
 * mods.axisDeg. The axis-vs-rotation map is monotone but strongly non-linear (the limb leads are not orthogonal
 * in VCG space), so: a 5° grid search, then a ternary refinement of |error|.
 */
export const axisStage: MorphStage = (k, info, mods) => {
  const target = mods.axisDeg;
  if (target === null || !info.supra) return k;
  const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
  const err = (deg: number) => {
    const c = k.slice();
    rotateZSel(c, (deg * Math.PI) / 180, QRS_T);
    return Math.abs(wrap(target - frontalAxisDeg(c)));
  };
  let best = 0;
  let bestErr = Infinity;
  for (let d = -180; d < 180; d += 5) {
    const e = err(d);
    if (e < bestErr) {
      bestErr = e;
      best = d;
    }
  }
  let lo = best - 5;
  let hi = best + 5;
  for (let i = 0; i < 24; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (err(m1) < err(m2)) hi = m2;
    else lo = m1;
  }
  return rotateZSel(k, (((lo + hi) / 2) * Math.PI) / 180, QRS_T);
};

/** Default precordial transition of the Stage 1 template (V3–V4) and the horizontal rotation per lead [ENG]. */
export const DEFAULT_TRANSITION = 3.5;
const DEG_PER_LEAD = 14;
export const transitionStage: MorphStage = (k, info, mods) => {
  if (mods.transitionLead === null || !info.supra) return k;
  // A negative rotation about Y (as rotateY defines it) turns the QRS vector anteriorly → earlier transition.
  return rotateY(k, (-(mods.transitionLead - DEFAULT_TRANSITION) * DEG_PER_LEAD * Math.PI) / 180, QRS_T);
};

/** LVH: R leftward (X) ×1.7, S posterior (Z) ×2 → Sokolow–Lyon ≥ 3.5 mV; lateral strain T [ENG]. */
export const lvhStage: MorphStage = (k, info, mods) => {
  if (!mods.lvh || !info.supra) return k;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (k[i + 6] === WAVE.R) k[i + 3] = (k[i + 3] as number) * 1.7;
    if (k[i + 6] === WAVE.S) k[i + 5] = (k[i + 5] as number) * 2;
  }
  const t = mainT(k);
  if (t >= 0) k[t + 3] = -0.6 * (k[t + 3] as number); // strain: T inverted in I/V5–V6
  return k;
};

export const qrsOverrideStage: MorphStage = (k, info, mods) => {
  const want = mods.overrides.qrsMs;
  if (want === undefined || !info.supra) return k;
  return stretchQrs(k, want / (1000 * (jPointS(k) - qrsOnsetS(k))));
};

export const lowVoltageStage: MorphStage = (k, _info, mods) => (mods.lowVoltage === 1 ? k : scaleWaves(k, new Set([WAVE.Q, WAVE.R, WAVE.S, WAVE.DELTA, WAVE.T, WAVE.U]), mods.lowVoltage));

export const alternansStage: MorphStage = (k, info: BeatInfo, mods) => (mods.alternans > 0 && info.seq % 2 === 1 ? scaleWaves(k, QRS_T, 1 - mods.alternans) : k);
