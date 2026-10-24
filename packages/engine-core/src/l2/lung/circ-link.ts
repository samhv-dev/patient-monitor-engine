// Circulation adapter ("the lungs consume per-lung flow and write PVR"). This file reads the circulation's
// seams by DUCK TYPING so the lungs compile and run with or without it:
//   read  hemo.circOut.qLungL / qLungR (mL/s)               → per-lung pulmonary flow for the mixing point
//   write hemo.circ.ext.pvrLungL / pvrLungR (×, lung-owned) → per-lung PVR multipliers (HPV, collapse), read by the
//         circulation's control() in its pvrL/pvrR lines; the circulation's own ext.pvr (PE) is never touched.
// Fallback when the circulation is absent: the side split comes from perfusion.ts conductances and CO from the
// respiratory signal model.
interface CircLike {
  circOut?: { qLungL?: unknown; qLungR?: unknown };
  circ?: { ext?: Record<string, unknown> };
}

/**
 * Per-lung flows in L/min from the circulation, or null when the circulation model is not present (or not yet flowing).
 */
export function circSideFlows(hemo: unknown): number[] | null {
  const o = (hemo as CircLike | null)?.circOut;
  if (!o || typeof o.qLungL !== 'number' || typeof o.qLungR !== 'number') return null;
  const l = Math.max(0, o.qLungL) * 0.06;
  const r = Math.max(0, o.qLungR) * 0.06;
  return l + r > 0.05 ? [l, r] : null;
}

/** Hand the per-lung PVR multipliers to the circulation when it exists; returns true when written. */
export function writeCircPvr(hemo: unknown, pvrMult: readonly number[], global = 1): boolean {
  const ext = (hemo as CircLike | null)?.circ?.ext;
  if (!ext || typeof ext !== 'object') return false;
  ext.pvrLung = global; // The lungs' global PVR multiplier (COPD, PH group 3, OLV)
  ext.pvrLungL = pvrMult[0] ?? 1;
  ext.pvrLungR = pvrMult[1] ?? 1;
  return true;
}

/**
 * The tamponade effort's input (circ/conditions.ts tamponadeSwingF): the circulation's diastolic pericardial pressure
 * (its septal operating point), mmHg — 0 when the circulation is absent or has declared an arrest (the effort is the
 * perfused patient's; agonal gasps keep their own pattern).
 */
export function circPericardial(hemo: unknown): number {
  const c = (hemo as { circ?: { sept?: { peri?: unknown }; arrest?: unknown } } | null)?.circ;
  const v = c?.sept?.peri;
  return c?.arrest == null && typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** The circulation model's own pleural pressure from its tension-pneumothorax condition (mmHg), 0 when absent. */
export function circPtx(hemo: unknown): number {
  const v = (hemo as CircLike | null)?.circ?.ext?.pPtx;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
