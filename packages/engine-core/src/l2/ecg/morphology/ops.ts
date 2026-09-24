// Kernel-list helpers for the morphology stages. Kernel layout (kernels.ts): [τ, σRise, σFall, ax, ay, az, wave].
import { K_STRIDE, WAVE } from '../kernels.ts';
import { DOWER, type Vec3 } from '../vcg.ts';
import type { LeadId } from '../../../types.ts';

export const QRS_WAVES: ReadonlySet<number> = new Set([WAVE.Q, WAVE.R, WAVE.S, WAVE.DELTA]);

export function isWave(k: readonly number[], i: number, waves: ReadonlySet<number> | number): boolean {
  const w = k[i + 6] as number;
  return typeof waves === 'number' ? w === waves : waves.has(w);
}

/** Multiply the vectors of the selected waves by f. */
export function scaleWaves(k: number[], waves: ReadonlySet<number> | number, f: number): number[] {
  for (let i = 0; i < k.length; i += K_STRIDE) if (isWave(k, i, waves)) for (let j = 3; j < 6; j++) k[i + j] = (k[i + j] as number) * f;
  return k;
}

/** Stretch the QRS in time about its onset (τ and σ × f). T/U stay where they are (the ST segment absorbs it). */
export function stretchQrs(k: number[], f: number): number[] {
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (!isWave(k, i, QRS_WAVES)) continue;
    k[i] = (k[i] as number) * f;
    k[i + 1] = (k[i + 1] as number) * f;
    k[i + 2] = (k[i + 2] as number) * f;
  }
  return k;
}

/** End of the QRS (J point), s from onset: latest QRS τ + 2.5σ. */
export function jPointS(k: readonly number[]): number {
  let hi = 0;
  for (let i = 0; i < k.length; i += K_STRIDE) if (isWave(k, i, QRS_WAVES)) hi = Math.max(hi, (k[i] as number) + 2.5 * (k[i + 2] as number));
  return hi;
}

/** Start of the QRS, s from onset: earliest QRS τ − 2.5σ (can be slightly negative). */
export function qrsOnsetS(k: readonly number[]): number {
  let lo = Infinity;
  for (let i = 0; i < k.length; i += K_STRIDE) if (isWave(k, i, QRS_WAVES)) lo = Math.min(lo, (k[i] as number) - 2.5 * (k[i + 1] as number));
  return lo;
}

/** Index of the first (main) T kernel, or −1. */
export function mainT(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T) return i;
  return -1;
}

/** Projection of a VCG vector onto a lead (Dower rows + Einthoven/Goldberger). */
export function leadOf(v: Vec3, lead: LeadId): number {
  const d = (r: Vec3) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2];
  const I = d(DOWER.ecgI);
  const II = d(DOWER.ecgII);
  switch (lead) {
    case 'ecgIII': return II - I;
    case 'aVR': return -(I + II) / 2;
    case 'aVL': return I - II / 2;
    case 'aVF': return II - I / 2;
    default: return d(DOWER[lead]);
  }
}

/** Add one kernel whose value at `atS` (s from onset) projects to `mv` in `lead` along direction `dir`. */
export function addShaped(k: number[], tau: number, sRise: number, sFall: number, dir: Vec3, lead: LeadId, mv: number, atS: number, wave: number): number[] {
  const d = atS - tau;
  const s = d < 0 ? sRise : sFall;
  const g = Math.exp((-d * d) / (2 * s * s));
  const a = mv / (leadOf(dir, lead) * g);
  k.push(tau, sRise, sFall, dir[0] * a, dir[1] * a, dir[2] * a, wave);
  return k;
}

/** Rotate the selected kernels' vectors about the Y axis (the X–Z, horizontal plane) by rad. */
export function rotateY(k: number[], rad: number, waves: ReadonlySet<number>): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (!isWave(k, i, waves)) continue;
    const x = k[i + 3] as number;
    const z = k[i + 5] as number;
    k[i + 3] = c * x + s * z;
    k[i + 5] = -s * x + c * z;
  }
  return k;
}

/** Rotate the selected kernels' vectors about the Z axis (frontal plane) by rad. */
export function rotateZSel(k: number[], rad: number, waves: ReadonlySet<number>): number[] {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (!isWave(k, i, waves)) continue;
    const x = k[i + 3] as number;
    const y = k[i + 4] as number;
    k[i + 3] = c * x - s * y;
    k[i + 4] = s * x + c * y;
  }
  return k;
}

/** Net area (mV·s) of the selected waves in a lead: Σ a_lead · σ̄ · √(2π). */
export function netArea(k: readonly number[], lead: LeadId, waves: ReadonlySet<number>): number {
  let a = 0;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    if (!isWave(k, i, waves)) continue;
    const v = leadOf([k[i + 3] as number, k[i + 4] as number, k[i + 5] as number], lead);
    a += v * (((k[i + 1] as number) + (k[i + 2] as number)) / 2) * Math.sqrt(2 * Math.PI);
  }
  return a;
}

/** Frontal QRS axis in degrees from the net QRS areas in I and aVF. */
export function frontalAxisDeg(k: readonly number[]): number {
  return (Math.atan2(netArea(k, 'aVF', QRS_WAVES), netArea(k, 'ecgI', QRS_WAVES)) * 180) / Math.PI;
}
