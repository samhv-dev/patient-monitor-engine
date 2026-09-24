// Beat templates built from the brief §4.1 seed table (lead II at 60 bpm, τ from QRS onset):
//   P  τ −PR+45 σ 22 a 0.15 | Q τ 12 σ 8 a −0.08 | R τ 40 σ 10 a 1.1 | S τ 62 σ 9 a −0.25
//   T  τ QT−110 σ 45 rise / 30 fall a 0.30 | U τ QT+70 σ 35 a 0.03
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

/** Wide ventricular complex (PVC, VT, ventricular escape) [ENG]: LBBB-like, upright in II, discordant T. */
export const WIDE_VEC: Readonly<Record<'R' | 'S' | 'T', Vec3>> = {
  R: [0.9, 1.3, 0.8],
  S: [-0.3, -0.4, -0.2],
  T: [-0.4, -0.45, -0.3],
};

/** Retrograde P (AVNRT), negative in II, buried at the end of the QRS [ENG, research 03 §1.5]. */
export const RETRO_P_VEC: Vec3 = [-0.05, -0.12, 0.02];

/** Flutter F-wave: sharp negative limb then slow recovery; negative sawtooth in II/III/aVF [ENG, 03 §1.5]. */
export const FLUTTER_VEC: Readonly<Record<'down' | 'up', Vec3>> = {
  down: [-0.03, -0.18, 0.02],
  up: [0.01, 0.07, -0.01],
};

/** AF f-wave VCG direction (lead II gain ≈ 1) [ENG]. */
export const FWAVE_DIR: Vec3 = [0.2, 0.9, -0.35];
/** Respiratory baseline-wander direction (lead II gain ≈ 1) [ENG]. */
export const WANDER_DIR: Vec3 = [0.3, 0.9, 0.2];

/** T end is 110 ms after the T peak (seed table: T peak = QT − 110), so QT = τ_T + 110 ms. */
export const T_END_AFTER_PEAK_S = 0.11;
/** Wide complexes: QT is longer by 60 ms [ENG]. */
export const WIDE_QT_EXTRA_MS = 60;

export type TemplateId = 'narrow' | 'wide' | 'narrowRetroP';

/** P wave kernels relative to P onset (the atrial event time): peak 45 ms after onset. */
export function pWaveKernels(scale = 1): number[] {
  return kernel(0.045, 0.022, 0.022, VEC.P, WAVE.P, scale);
}

/** Flutter wave kernels relative to the flutter event time [ENG]. */
export function flutterKernels(): number[] {
  return [
    ...kernel(0.04, 0.018, 0.018, FLUTTER_VEC.down, WAVE.F),
    ...kernel(0.12, 0.045, 0.045, FLUTTER_VEC.up, WAVE.F),
  ];
}

/** Narrow (supraventricular) QRS-T relative to QRS onset. rScale modulates QRS amplitude (respiration). */
export function narrowKernels(qtMs: number, rScale = 1): number[] {
  const tPeak = qtMs / 1000 - T_END_AFTER_PEAK_S;
  return [
    ...kernel(0.012, 0.008, 0.008, VEC.Q, WAVE.Q, rScale),
    ...kernel(0.04, 0.01, 0.01, VEC.R, WAVE.R, rScale),
    ...kernel(0.062, 0.009, 0.009, VEC.S, WAVE.S, rScale),
    ...kernel(tPeak, 0.045, 0.03, VEC.T, WAVE.T),
    ...kernel(qtMs / 1000 + 0.07, 0.035, 0.035, VEC.U, WAVE.U),
  ];
}

/** Wide ventricular QRS-T relative to QRS onset. qtMs is the supraventricular QT; WIDE_QT_EXTRA_MS is added. */
export function wideKernels(qtMs: number, scale = 1): number[] {
  const qt = (qtMs + WIDE_QT_EXTRA_MS) / 1000;
  return [
    ...kernel(0.05, 0.022, 0.022, WIDE_VEC.R, WAVE.R, scale),
    ...kernel(0.11, 0.02, 0.02, WIDE_VEC.S, WAVE.S, scale),
    ...kernel(qt - T_END_AFTER_PEAK_S, 0.06, 0.04, WIDE_VEC.T, WAVE.T, scale),
  ];
}

export function templateKernels(id: TemplateId, qtMs: number, scale = 1): number[] {
  if (id === 'wide') return wideKernels(qtMs, scale);
  const k = narrowKernels(qtMs, scale);
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

/** QT of a beat as drawn: T peak τ + 110 ms (for wide templates this includes WIDE_QT_EXTRA_MS). */
export function kernelQtMs(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (k[i + 6] === WAVE.T) return ((k[i] as number) + T_END_AFTER_PEAK_S) * 1000;
  }
  return Number.NaN;
}
