// Sweep geometry (brief §3.5). Lane x-position comes from sim time, never from frame counts:
//   x = (simT · mm_s · px_mm) mod laneWidth
// Default calibration: 96 CSS px per inch = 3.78 CSS px/mm [05 §3.1] until the user calibrates.

export const DEFAULT_PX_PER_MM = 96 / 25.4;
export const SWEEP_SPEEDS_MM_S = [6.25, 12.5, 25, 50] as const;
export type SweepSpeed = (typeof SWEEP_SPEEDS_MM_S)[number];

/** Trace speed in CSS px per sim second. 25 mm/s at 3.78 px/mm = 94.5 px/s. */
export function sweepPxPerS(mmPerS: number, pxPerMm: number = DEFAULT_PX_PER_MM): number {
  return mmPerS * pxPerMm;
}

/** Unwrapped x (CSS px) of sim time t. */
export function sweepXUnwrapped(t: number, mmPerS: number, pxPerMm: number = DEFAULT_PX_PER_MM): number {
  return t * mmPerS * pxPerMm;
}

/** Cursor x (CSS px) inside a lane of the given width. */
export function sweepX(t: number, mmPerS: number, pxPerMm: number, laneWidthPx: number): number {
  const x = sweepXUnwrapped(t, mmPerS, pxPerMm) % laneWidthPx;
  return x < 0 ? x + laneWidthPx : x;
}
