// Stage 5 beat templates, layered on the Stage 1 ones in templates.ts (which stays untouched).
// Vectors are VCG (X, Y, Z) in mV through the Dower rows (vcg.ts). Values are [ENG] unless cited; the lead
// projections quoted in comments are what the numbers produce and what the tests check.
import { K_STRIDE, WAVE, kernel, qrsSpanMs } from './kernels.ts';
import { narrowKernels, templateKernels, tEndAfterPeakS, WIDE_QT_EXTRA_MS, VEC, type TemplateId } from './templates.ts';
import type { Vec3 } from './vcg.ts';

export type BeatTemplateId = TemplateId | 'wpw' | 'aberrant' | 'pacedV' | 'pvc2' | 'pvc3' | 'agonal';

/** RBBB terminal R′ (V1 +0.51 mV, I −0.25 mV) at τ 85 ms, σ 16 ms → QRS ≈ 133 ms (brief §5 RBBB 133). */
export const RBBB_RPRIME_VEC: Vec3 = [-0.35, 0.05, -0.35];
/** PR (P onset → delta onset) for pre-excited conduction (research 03 §1.5: PR < 120 ms). */
export const WPW_PR_MS = 100;
/** Delta wave: 35 ms of slurred upstroke at full pre-excitation (research 03 §1.5: 30–60 ms). */
export const DELTA_S = 0.035;

/** RV-apical paced QRS: superior axis (II −0.83), I +0.81, QS in V1 (−1.15), QRS 150 ms (research 03 §1.7: 140–180). */
const PACED_VEC: Readonly<Record<'R' | 'S' | 'T', Vec3>> = {
  R: [0.9, -0.9, 0.6],
  S: [-0.15, 0.1, -0.1],
  T: [-0.35, 0.3, -0.25],
};
/** Second and third PVC foci (multifocal PVCs, research 03 §1.5): LV origin (RBBB-like, V1 +1.28) and superior axis (II −1.05). */
const PVC_FOCI: Readonly<Record<'pvc2' | 'pvc3', Readonly<Record<'R' | 'S' | 'T', Vec3>>>> = {
  pvc2: { R: [-0.5, 1.2, -0.9], S: [0.2, -0.3, 0.2], T: [0.25, -0.4, 0.35] },
  pvc3: { R: [0.8, -1.1, 0.5], S: [-0.2, 0.3, -0.1], T: [-0.3, 0.45, -0.2] },
};
/** Agonal complex: very wide (≈ 300 ms), low, bizarre (research 03 §1.5 "Agonal"). */
const AGONAL_VEC: Readonly<Record<'R' | 'S' | 'T', Vec3>> = {
  R: [0.45, 0.7, 0.4],
  S: [-0.2, -0.3, -0.15],
  T: [-0.2, -0.25, -0.15],
};

function wideFrom(v: Readonly<Record<'R' | 'S' | 'T', Vec3>>, qtMs: number, scale: number, r: [number, number], s: [number, number], tSig: [number, number]): number[] {
  const qt = (qtMs + WIDE_QT_EXTRA_MS) / 1000;
  return [
    ...kernel(r[0], r[1], r[1], v.R, WAVE.R, scale),
    ...kernel(s[0], s[1], s[1], v.S, WAVE.S, scale),
    ...kernel(qt - tEndAfterPeakS(tSig[1]), tSig[0], tSig[1], v.T, WAVE.T, scale),
  ];
}

/** Pre-excited QRS-T: a delta kernel from QRS onset, then the narrow complex shifted by DELTA_S·pre. pre 0.4–1.8. */
export function wpwKernels(qtMs: number, scale = 1, pre = 1): number[] {
  const d = DELTA_S * pre;
  const k = narrowKernels(qtMs, scale);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    k[i] = (k[i] as number) + d;
    if (k[i + 6] === WAVE.T) for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * (1 - 0.3 * Math.min(1, pre)); // secondary ST-T [ENG]
  }
  k.push(...kernel(d, d / 2.5, 0.012, VEC.R, WAVE.DELTA, 0.25 * scale * Math.min(1.5, pre)));
  return k;
}

/** Beat kernels relative to QRS onset. `pre` is used by 'wpw' only. */
export function beatKernels(id: BeatTemplateId, qtMs: number, scale = 1, pre = 1): number[] {
  switch (id) {
    case 'wpw':
      return wpwKernels(qtMs, scale, pre);
    case 'aberrant':
      return [...narrowKernels(qtMs, scale), ...kernel(0.085, 0.016, 0.016, RBBB_RPRIME_VEC, WAVE.S, scale)];
    case 'pacedV':
      return wideFrom(PACED_VEC, qtMs, scale, [0.055, 0.022], [0.115, 0.014], [0.07, 0.045]);
    case 'pvc2':
    case 'pvc3':
      return wideFrom(PVC_FOCI[id], qtMs, scale, [0.05, 0.022], [0.11, 0.02], [0.06, 0.04]);
    case 'agonal':
      return wideFrom(AGONAL_VEC, qtMs + 80, scale, [0.1, 0.045], [0.2, 0.035], [0.09, 0.07]);
    default:
      return templateKernels(id, qtMs, scale);
  }
}

/** R-peak offset from QRS onset (s): τ of the R kernel with the largest vector amplitude. */
export function fiducialOf(k: readonly number[]): number {
  let best = -1;
  let tau = 0.04;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (k[i + 6] !== WAVE.R) continue;
    const a = Math.hypot(k[i + 3] as number, k[i + 4] as number, k[i + 5] as number);
    if (a > best) {
      best = a;
      tau = k[i] as number;
    }
  }
  return tau;
}

/** T peak of a kernel list (τ of the first T kernel, s from QRS onset); 0.3 s if there is none. */
export function tPeakS(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T) return k[i] as number;
  return 0.3;
}

/** QRS width of a template as drawn (ms). */
export function beatQrsMs(id: BeatTemplateId, pre = 1): number {
  return qrsSpanMs(beatKernels(id, 400, 1, pre));
}

/** Rotate every kernel vector about the VCG Z axis (the X–Y, i.e. frontal, plane) by rad, in place. */
export function rotateZ(k: number[], rad: number): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const x = k[i + 3] as number;
    const y = k[i + 4] as number;
    k[i + 3] = c * x - s * y;
    k[i + 4] = s * x + c * y;
  }
  return k;
}
