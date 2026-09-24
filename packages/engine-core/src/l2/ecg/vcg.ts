// VCG → 12-lead projection (brief §4.1 "Lead projection"; research 03 §1.2).
// Leads I, II and V1–V6 use the Dower matrix rows (Dower 1980, as published in G. D. Clifford's idowerT.m,
// confirmed 2026-09-24 in research 03 §11 item 6). III, aVR, aVL and aVF come from the exact
// Einthoven/Goldberger identities, so they hold for any VCG.
import type { LeadId } from '../../types.ts';

export type Vec3 = readonly [number, number, number];

/** Dower rows: lead = X·r[0] + Y·r[1] + Z·r[2] (mV). */
export const DOWER: Readonly<Record<'ecgI' | 'ecgII' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6', Vec3>> = {
  ecgI: [0.632, -0.235, 0.059],
  ecgII: [0.235, 1.066, -0.132],
  V1: [-0.515, 0.157, -0.917],
  V2: [0.044, 0.164, -1.387],
  V3: [0.882, 0.098, -1.277],
  V4: [1.213, 0.127, -0.601],
  V5: [1.125, 0.127, -0.086],
  V6: [0.831, 0.076, 0.23],
};

function dot(r: Vec3, x: number, y: number, z: number): number {
  return r[0] * x + r[1] * y + r[2] * z;
}

/** One lead from one VCG sample. */
export function projectLead(lead: LeadId, x: number, y: number, z: number): number {
  switch (lead) {
    case 'ecgIII':
      return dot(DOWER.ecgII, x, y, z) - dot(DOWER.ecgI, x, y, z); // III = II − I
    case 'aVR':
      return -(dot(DOWER.ecgI, x, y, z) + dot(DOWER.ecgII, x, y, z)) / 2; // aVR = −(I+II)/2
    case 'aVL':
      return dot(DOWER.ecgI, x, y, z) - dot(DOWER.ecgII, x, y, z) / 2; // aVL = I − II/2
    case 'aVF':
      return dot(DOWER.ecgII, x, y, z) - dot(DOWER.ecgI, x, y, z) / 2; // aVF = II − I/2
    default:
      return dot(DOWER[lead], x, y, z);
  }
}

/** All 12 leads from one VCG sample, in LEAD_IDS order. */
export function projectLeads(x: number, y: number, z: number, out: Float64Array): Float64Array {
  const I = dot(DOWER.ecgI, x, y, z);
  const II = dot(DOWER.ecgII, x, y, z);
  out[0] = I;
  out[1] = II;
  out[2] = II - I;
  out[3] = -(I + II) / 2;
  out[4] = I - II / 2;
  out[5] = II - I / 2;
  out[6] = dot(DOWER.V1, x, y, z);
  out[7] = dot(DOWER.V2, x, y, z);
  out[8] = dot(DOWER.V3, x, y, z);
  out[9] = dot(DOWER.V4, x, y, z);
  out[10] = dot(DOWER.V5, x, y, z);
  out[11] = dot(DOWER.V6, x, y, z);
  return out;
}
