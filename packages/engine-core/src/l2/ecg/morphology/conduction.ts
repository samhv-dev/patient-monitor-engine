// Conduction and voltage modifiers (brief §5; research 03 §1.5–1.6): bundle-branch block, axis, precordial
// transition, low voltage, LVH, QRS override and electrical alternans.
import { WAVE } from '../kernels.ts';
import { RBBB_RPRIME_VEC } from '../beat-templates.ts';
import type { Vec3 } from '../vcg.ts';
import type { BeatInfo, MorphStage } from './index.ts';
import { QRS_WAVES, frontalAxisDeg, isWave, jPointS, mainT, qrsOnsetS, rotateY, rotateZSel, scaleWaves, stretchQrs } from './ops.ts';
import { K_STRIDE } from '../kernels.ts';

/**
 * LBBB (Stage 5.1): no septal q; two leftward R kernels 60 ms apart — LBBB_R1 (V1 −0.15, V6 +0.70) then LBBB_R2
 * (V1 −1.00, V6 +0.90, posterior) — so V6/I show a broad notched monophasic R and V1 a broad QS with a slurred
 * downstroke (one trough: the first kernel is only a shoulder there). Vectors solved on the Dower rows [ENG].
 */
export const LBBB_R1_VEC: Vec3 = [0.903, 0.25, -0.301];
export const LBBB_R2_VEC: Vec3 = [0.893, 0.2, 0.623];
/** RBBB (Stage 5.1): the LV's S forces halve and a late broad R′ (τ 100 ms) points right-anterior. */
export const RBBB_S_SCALE = 0.5;
export const RBBB_RPRIME_TAU_S = 0.1;
export const RBBB_RPRIME_SIGMA_S: readonly [number, number] = [0.02, 0.022];
export const QRS_T: ReadonlySet<number> = new Set([WAVE.Q, WAVE.R, WAVE.S, WAVE.DELTA, WAVE.T]);

export const bbbStage: MorphStage = (k, info, mods) => {
  if (mods.bbb === 'none' || !info.supra) return k;
  if (mods.bbb === 'rbbb') {
    let rScale = 1;
    for (let i = 0; i < k.length; i += K_STRIDE) {
      if (k[i + 6] === WAVE.S) for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * RBBB_S_SCALE;
      if (k[i + 6] === WAVE.R) rScale = Math.hypot(k[i + 3] as number, k[i + 4] as number, k[i + 5] as number) / 1.68;
    }
    // terminal R′ in V1 (rSR′), broad slurred S in I/V6; follows R amplitude (respiration, low voltage) [ENG]
    k.push(RBBB_RPRIME_TAU_S, RBBB_RPRIME_SIGMA_S[0], RBBB_RPRIME_SIGMA_S[1], ...RBBB_RPRIME_VEC.map((v) => v * rScale), WAVE.S);
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
  out.push(0.05, 0.022, 0.022, ...LBBB_R1_VEC.map((v) => v * rScale), WAVE.R);
  out.push(0.11, 0.024, 0.024, ...LBBB_R2_VEC.map((v) => v * rScale), WAVE.R);
  const t = mainT(out);
  if (t >= 0) {
    const sum = [0, 1, 2].map((j) => (LBBB_R1_VEC[j] as number) + (LBBB_R2_VEC[j] as number));
    const n = Math.hypot(...sum);
    const amp = Math.hypot(out[t + 3] as number, out[t + 4] as number, out[t + 5] as number);
    for (let j = 0; j < 3; j++) out[t + 3 + j] = (-(sum[j] as number) / n) * amp; // discordant T
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
