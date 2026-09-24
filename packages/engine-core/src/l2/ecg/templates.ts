// Beat templates built from the brief §4.1 seed table (lead II at 60 bpm, τ from QRS onset):
//   P  τ −PR+45 σ 22 a 0.15 | Q τ 12 σ 8 a −0.08 | R τ 40 σ 10 a 1.1 | S τ 62 σ 9 a −0.25
//   T  τ QT−2σ_fall (= QT−60) σ 45 rise / 30 fall a 0.30 | U τ QT+70 σ 35 a 0.03
// (The seed table's T peak at QT−110 drew a tangent-method QT 50 ms short, review H4; see T_SIGMA_FALL_S.)
// Each wave's VCG vector (X, Y, Z in mV) was fitted in Stage 1 so that, through the Dower rows (vcg.ts),
// lead II reproduces the seed amplitudes exactly and lead I is 70% / lead III 30% of II (ProSim ratios,
// research 01 §4.16). Z was chosen by least squares against a normal precordial R progression
// (V1 rS, transition V3–V4). The PTB-XL refit is Stage 5.
import { K_STRIDE, WAVE, kernel, qrsSpanMs } from './kernels.ts';
import type { Vec3 } from './vcg.ts';

export const VEC: Readonly<Record<'P' | 'Q' | 'R' | 'S' | 'T' | 'U', Vec3>> = {
  P: [0.165, 0.105, 0.007],
  Q: [-0.097, -0.058, -0.033],
  R: [1.521, 0.708, 0.091],
  S: [-0.319, -0.089, 0.609],
  T: [0.394, 0.181, -0.111],
  U: [0.04, 0.017, -0.016],
};

/**
 * Wide ventricular complex (PVC, VT, ventricular escape) [ENG]: LBBB-like, upright in II, discordant T.
 * Scaled ×1.2 in Stage 1.1 so R in II is 1.63× the normal beat (brief §5: 1.5–2× amplitude; review L12).
 */
const WIDE_GAIN = 1.2;
export const WIDE_VEC: Readonly<Record<'R' | 'S' | 'T', Vec3>> = {
  R: [0.9 * WIDE_GAIN, 1.3 * WIDE_GAIN, 0.8 * WIDE_GAIN],
  S: [-0.3 * WIDE_GAIN, -0.4 * WIDE_GAIN, -0.2 * WIDE_GAIN],
  T: [-0.4 * WIDE_GAIN, -0.45 * WIDE_GAIN, -0.3 * WIDE_GAIN],
};

/** Retrograde P (AVNRT), negative in II, buried at the end of the QRS [ENG, research 03 §1.5]. */
export const RETRO_P_VEC: Vec3 = [-0.05, -0.12, 0.02];

/**
 * Flutter F-wave direction (lead II gain 1): large in II/III/aVF, small in I, small upright in V1 [ENG, 03 §1.5].
 * Research 03 §1.5 (rhythm table): typical flutter shows a continuous negative "sawtooth" in II/III/aVF, ~0.1–0.3 mV,
 * with no isoelectric line (Gate 1 ruling R18).
 */
export const FLUTTER_DIR: Vec3 = [0.1 / 0.996, 0.9 / 0.996, -0.1 / 0.996];
/** F-wave peak-to-peak in lead II, mV: the top of research 03 §1.5's 0.1–0.3 mV (the Gate 1 trace was too faint). */
export const FLUTTER_PP_MV = 0.3;
/** Fraction of each flutter cycle spent on the slow descending ramp; the rest is the fast return [ENG, review §4]. */
export const FLUTTER_FALL_FRACTION = 0.7;
const FLUTTER_HARMONICS = 4; // first 4 Fourier terms of the sawtooth (review §4) [ENG]

/**
 * Fourier series of an asymmetric triangle (sawtooth) of period 1 that falls linearly from +1 at φ = 0 to −1 at
 * φ = d and rises back to +1 at φ = 1 (derived by integrating the series of its piecewise-constant derivative):
 *   x(φ) = −Σ_k c_k · sin(2πk(φ − d/2)),   c_k = 2·sin(πkd) / (π²k²·d·(1 − d)).
 */
function sawtoothCoefficient(k: number, d: number): number {
  return (2 * Math.sin(Math.PI * k * d)) / (Math.PI * Math.PI * k * k * d * (1 - d));
}

/** Peak-to-peak of the truncated series (so the drawn wave is scaled to FLUTTER_PP_MV exactly). */
const FLUTTER_SERIES_PP = (() => {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < 2000; i++) {
    const phi = i / 2000;
    let x = 0;
    for (let k = 1; k <= FLUTTER_HARMONICS; k++) x -= sawtoothCoefficient(k, FLUTTER_FALL_FRACTION) * Math.sin(2 * Math.PI * k * (phi - FLUTTER_FALL_FRACTION / 2));
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return hi - lo;
})();

/**
 * Flutter F waves as a sum of sinusoids sin(2π·f·s + ph)·a (absolute time s), phase-locked so that each F event
 * (at anchor + k·cycle) is the top of a cycle: a slow descent over 70% of the cycle, then a fast return.
 */
export function flutterHarmonics(anchor: number, atrialRateBpm: number): { f: number[]; ph: number[]; a: number[] } {
  const f0 = atrialRateBpm / 60;
  const d = FLUTTER_FALL_FRACTION;
  const scale = FLUTTER_PP_MV / FLUTTER_SERIES_PP;
  const f: number[] = [];
  const ph: number[] = [];
  const a: number[] = [];
  for (let k = 1; k <= FLUTTER_HARMONICS; k++) {
    f.push(k * f0);
    ph.push(-2 * Math.PI * k * f0 * anchor - Math.PI * k * d + Math.PI); // −sin(θ) = sin(θ + π)
    a.push(scale * sawtoothCoefficient(k, d));
  }
  return { f, ph, a };
}

/** AF f-wave VCG direction (lead II gain ≈ 1) [ENG]. */
export const FWAVE_DIR: Vec3 = [0.2, 0.9, -0.35];
/** Respiratory baseline-wander direction (lead II gain ≈ 1) [ENG]. */
export const WANDER_DIR: Vec3 = [0.3, 0.9, 0.2];

/** T wave half-Gaussian widths (brief §4.1 seed table: 45 ms rise / 30 ms fall; wide complexes 60 / 40 [ENG]). */
const T_SIGMA_RISE_S = 0.045;
const T_SIGMA_FALL_S = 0.03;
const WIDE_T_SIGMA_RISE_S = 0.06;
const WIDE_T_SIGMA_FALL_S = 0.04;
/**
 * Where the drawn T ends. The tangent through the steepest point of a half-Gaussian's falling limb (τ + σ, value
 * a·e^−½, slope −a·e^−½/σ) meets the baseline at τ + 2σ. So the T peak is placed 2σ_fall before the target QT and
 * the tangent-method QT on screen equals the Fridericia QT (review H4; measured by the waveform test).
 */
export function tEndAfterPeakS(sigmaFall: number): number {
  return 2 * sigmaFall;
}
/** Wide complexes: QT is longer by 60 ms [ENG]. */
export const WIDE_QT_EXTRA_MS = 60;

export type TemplateId = 'narrow' | 'wide' | 'narrowRetroP';

/** P wave kernels relative to P onset (the atrial event time): peak 45 ms after onset. */
export function pWaveKernels(scale = 1): number[] {
  return kernel(0.045, 0.022, 0.022, VEC.P, WAVE.P, scale);
}

/** Narrow (supraventricular) QRS-T relative to QRS onset. rScale modulates QRS amplitude (respiration). */
export function narrowKernels(qtMs: number, rScale = 1): number[] {
  const tPeak = qtMs / 1000 - tEndAfterPeakS(T_SIGMA_FALL_S);
  return [
    ...kernel(0.012, 0.008, 0.008, VEC.Q, WAVE.Q, rScale),
    ...kernel(0.04, 0.01, 0.01, VEC.R, WAVE.R, rScale),
    ...kernel(0.062, 0.009, 0.009, VEC.S, WAVE.S, rScale),
    ...kernel(tPeak, T_SIGMA_RISE_S, T_SIGMA_FALL_S, VEC.T, WAVE.T),
    ...kernel(qtMs / 1000 + 0.07, 0.035, 0.035, VEC.U, WAVE.U),
  ];
}

/** Wide ventricular QRS-T relative to QRS onset. qtMs is the supraventricular QT; WIDE_QT_EXTRA_MS is added. */
export function wideKernels(qtMs: number, scale = 1): number[] {
  const qt = (qtMs + WIDE_QT_EXTRA_MS) / 1000;
  return [
    // R τ 50 σ 22 ms and S τ 110 σ 20 ms: a slurred ~165 ms QRS, inside brief §5's 120–200 ms for PVC/VT [ENG]
    ...kernel(0.05, 0.022, 0.022, WIDE_VEC.R, WAVE.R, scale),
    ...kernel(0.11, 0.02, 0.02, WIDE_VEC.S, WAVE.S, scale),
    ...kernel(qt - tEndAfterPeakS(WIDE_T_SIGMA_FALL_S), WIDE_T_SIGMA_RISE_S, WIDE_T_SIGMA_FALL_S, WIDE_VEC.T, WAVE.T, scale),
  ];
}

export function templateKernels(id: TemplateId, qtMs: number, scale = 1): number[] {
  if (id === 'wide') return wideKernels(qtMs, scale);
  const k = narrowKernels(qtMs, scale);
  // Retrograde P 70 ms after QRS onset (σ 20 ms): at the end of the QRS, the "pseudo-r'/pseudo-S" of typical AVNRT
  // (research 03 §1.5) [ENG timing]
  if (id === 'narrowRetroP') k.push(...kernel(0.07, 0.02, 0.02, RETRO_P_VEC, WAVE.RETRO_P));
  return k;
}

/** Fiducial (R-peak) offset from QRS onset, seconds. `beat.t` = QRS onset + this. */
export function fiducialS(id: TemplateId): number {
  return id === 'wide' ? 0.05 : 0.04;
}

/** QRS duration of a template, ms (rate-independent, brief §4.1 "QRS width changes by ≤5%"). */
export function templateQrsMs(id: TemplateId): number {
  return qrsSpanMs(templateKernels(id, 400));
}

/** QT of a beat as drawn (tangent T end): T peak τ + 2σ_fall (for wide templates this includes WIDE_QT_EXTRA_MS). */
export function kernelQtMs(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (k[i + 6] === WAVE.T) return ((k[i] as number) + tEndAfterPeakS(k[i + 2] as number)) * 1000;
  }
  return Number.NaN;
}
