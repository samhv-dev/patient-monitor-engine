// Stage 2 waveform lanes (brief §3.5, §6.8 colours): ABP red, pleth cyan, CVP blue, PAP yellow, drawn by the
// existing SweepLane at 125 Hz. SweepLane maps "mV" to y through baseline + gainMmPerMv; a pressure lane maps
// mmHg instead, so the scale range [lo, hi] becomes baseline = hi/(hi − lo) and gain = height/((hi − lo)·pxPerMm).
// The pleth is auto-scaled (brief §4.3: "the display is auto-scaled; PI is kept as a number").
export type WaveLaneId = 'abp' | 'pleth' | 'cvp' | 'pap';

export interface WaveStyle {
  label: string;
  color: string;
  /** Fixed scale in mmHg, or null for auto-scale (pleth). */
  range: readonly [number, number] | null;
}

/** Philips-like defaults (brief §6.8): ABP scale 150 adult; CVP (blue, OR option); PAP yellow. */
export const WAVE_STYLE: Readonly<Record<WaveLaneId, WaveStyle>> = {
  abp: { label: 'ABP', color: '#ff3b3b', range: [0, 150] },
  pleth: { label: 'Pleth', color: '#00e5ff', range: null },
  cvp: { label: 'CVP', color: '#3d8bff', range: [-5, 20] },
  pap: { label: 'PAP', color: '#ffe14d', range: [0, 40] },
};

/** SweepLane baseline and gain that map [lo, hi] onto a lane of `height` CSS px. */
export function scaleFor(lo: number, hi: number, height: number, pxPerMm: number): { baseline: number; gainMmPerMv: number } {
  return { baseline: hi / (hi - lo), gainMmPerMv: height / ((hi - lo) * pxPerMm) };
}

/** Pleth auto-scale [ENG]: the last 4 s fill 80% of the lane, centred; flat traces keep a 0.1 % span. */
export function autoRange(samples: ArrayLike<number>, count: number): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < count; i++) {
    const v = samples[i] as number;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo)) return [-0.05, 0.05];
  const span = Math.max(0.1, hi - lo) / 0.8;
  const mid = (hi + lo) / 2;
  return [mid - span / 2, mid + span / 2];
}
