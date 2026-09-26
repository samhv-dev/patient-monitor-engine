// Stage 7a adapter (R45: "7b consumes per-lung flow and writes PVR"). 7a runs on its own branch; this file reads its
// seams by DUCK TYPING so 7b compiles and runs with or without it:
//   read  hemo.circOut.qLungL / qLungR (mL/s, 7a Task 5)   → per-lung pulmonary flow for the mixing point
//   write hemo.circ.ext.pvrLungL / pvrLungR (×, 7b-owned)  → per-lung PVR multipliers (HPV, collapse), read by 7a's
//         control() once Task 26 adds them to its pvrL/pvrR lines; 7a's own ext.pvr (PE) is never touched.
// Fallback when 7a is absent: the side split comes from perfusion.ts conductances and CO from Stage 3.
interface CircLike {
  circOut?: { qLungL?: unknown; qLungR?: unknown };
  circ?: { ext?: Record<string, unknown> };
}

/** Per-lung flows in L/min from the circulation, or null when 7a is not present (or not yet flowing). */
export function circSideFlows(hemo: unknown): number[] | null {
  const o = (hemo as CircLike | null)?.circOut;
  if (!o || typeof o.qLungL !== 'number' || typeof o.qLungR !== 'number') return null;
  const l = Math.max(0, o.qLungL) * 0.06;
  const r = Math.max(0, o.qLungR) * 0.06;
  return l + r > 0.05 ? [l, r] : null;
}

/** Hand the per-lung PVR multipliers to the circulation when it exists; returns true when written. */
export function writeCircPvr(hemo: unknown, pvrMult: readonly number[]): boolean {
  const ext = (hemo as CircLike | null)?.circ?.ext;
  if (!ext || typeof ext !== 'object') return false;
  ext.pvrLungL = pvrMult[0] ?? 1;
  ext.pvrLungR = pvrMult[1] ?? 1;
  return true;
}
