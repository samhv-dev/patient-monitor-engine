// IBP1 (arterial) and IBP2 (venous) lane scales, owner ruling E130 (2026-10-26): per channel the skin's fixed scale, a
// range the instructor types within 0–200 mmHg, or AUTO from discrete ranges, re-judged on a timer and never beat by beat.
//
// AUTO's cadence and ranges. No vendor manual read for this states an interval (scratch/reviews research, 2026-10-30):
// Philips IntelliVue MP/MX IFU ch. 12 "Optimizing the Waveform" makes Optimum Scale a one-shot command; Mindray ePM
// Operator's Manual §13.6.5 offers Scale "Auto" with no interval; GE's B105/B125 guide and the CARESCAPE PDM sheet list
// fixed scales only; no Saadat manual was reachable. By the ruling's rule (15 s or 30 s, 30 s when unsettled) AUTO is
// judged every 30 s of sim time. The upper values are the GE CARESCAPE PDM "display scale selections" (0–30, 0–40, 0–60,
// 0–100, 0–160, 0–200, 0–300 mmHg) up to the ruled 0–200; 0–160 is also Mindray's arterial default. The venous set starts
// at −10–30, the Saadat-like skin's own CVP scale (a spontaneous breath takes the CVP below zero).
import type { ChannelId } from '@pme/engine-core';

export type IbpChannel = 'IBP1' | 'IBP2';
export type IbpScale = { mode: 'fixed' } | { mode: 'custom'; lower: number; upper: number } | { mode: 'auto' };
/** The scale per channel; a channel left out is the skin's fixed scale. */
export type IbpScales = Partial<Record<IbpChannel, IbpScale>>;

/** A typed range lies within these bounds (mmHg, the ruling). */
export const IBP_SCALE_LIMITS = [0, 200] as const;
/** AUTO is judged at every multiple of this many sim seconds, over the two windows before it [DOC: see the header]. */
export const IBP_AUTO_EVERY_S = 30;
/** AUTO's discrete ranges per channel, smallest first [DOC: GE PDM display scales ≤ 200; Saadat-like CVP −10–30]. */
export const IBP_AUTO_RANGES: Readonly<Record<IbpChannel, ReadonlyArray<readonly [number, number]>>> = {
  IBP1: [[0, 60], [0, 100], [0, 160], [0, 200]],
  IBP2: [[-10, 30], [0, 60], [0, 100], [0, 160], [0, 200]],
};
/** The window's peak stays this share of the range's span under its top [ENG]. */
export const IBP_AUTO_HEADROOM = 0.1;
/** Up to this many one-second blocks of a window above (or below) the rest are outliers, a flush or an odd beat [ENG]. */
export const IBP_AUTO_OUTLIER_BLOCKS = 2;

/** The instructor channel of an engine channel: the arterial line is IBP1, the venous one IBP2. */
export function ibpChannelOf(ch: ChannelId | null): IbpChannel | null {
  return ch === 'abp' ? 'IBP1' : ch === 'cvp' ? 'IBP2' : null;
}

/** Why a scale is refused, or null when it is accepted. */
export function ibpScaleError(s: IbpScale): string | null {
  if (s?.mode === 'fixed' || s?.mode === 'auto') return null;
  if (s?.mode !== 'custom') return 'unknown scale mode';
  const [min, max] = IBP_SCALE_LIMITS;
  if (!Number.isFinite(s.lower) || !Number.isFinite(s.upper)) return 'the lower and upper values must be numbers';
  if (s.lower < min || s.upper > max) return `the range must lie within ${min}–${max} mmHg`;
  if (s.lower >= s.upper) return 'the lower value must be below the upper';
  return null;
}

/** The window's [low, high] without its outliers: the (OUTLIER+1)-th lowest one-second minimum and highest maximum. */
function robust(samples: ArrayLike<number>, from: number, to: number, rate: number): [number, number] | null {
  const mins: number[] = [];
  const maxs: number[] = [];
  // blocks counted back from the window's end, which is a boundary in sim time, so every reader cuts the same blocks
  for (let end = to; end - from >= rate; end -= rate) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = end - rate; k < end; k++) {
      const v = samples[k] as number;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    mins.push(lo);
    maxs.push(hi);
  }
  if (maxs.length === 0) return null;
  mins.sort((a, b) => a - b);
  maxs.sort((a, b) => b - a);
  const k = Math.min(IBP_AUTO_OUTLIER_BLOCKS, maxs.length - 1);
  return [mins[k] as number, maxs[k] as number];
}

/**
 * AUTO's range for the samples of the two windows before a boundary (the last `n` samples end at it). Each window is
 * judged on its own; the range must hold both, so it steps up as soon as one window needs it and down only when two
 * in a row fit the smaller range (hysteresis). The smallest range whose bottom holds the low and whose top holds the
 * high with IBP_AUTO_HEADROOM; else the smallest whose top holds it; else the largest. null under a second of signal.
 */
export function autoIbpRange(samples: ArrayLike<number>, n: number, rate: number, ch: IbpChannel): [number, number] | null {
  const win = Math.round(IBP_AUTO_EVERY_S * rate);
  const last = robust(samples, Math.max(0, n - win), n, rate);
  if (!last) return null;
  const before = n > win ? robust(samples, Math.max(0, n - 2 * win), n - win, rate) : null;
  const lo = Math.min(last[0], before?.[0] ?? Infinity);
  const hi = Math.max(last[1], before?.[1] ?? -Infinity);
  const ranges = IBP_AUTO_RANGES[ch];
  const tops = (r: readonly [number, number]) => hi <= r[1] - IBP_AUTO_HEADROOM * (r[1] - r[0]);
  const pick = ranges.find((r) => lo >= r[0] && tops(r)) ?? ranges.find(tops) ?? (ranges[ranges.length - 1] as readonly [number, number]);
  return [pick[0], pick[1]];
}

/** The scales as they travel and are kept: IBP1 then IBP2, only the accepted ones that are not the fixed default. */
export function normalIbpScales(s: IbpScales | null | undefined): IbpScales {
  const out: IbpScales = {};
  for (const ch of ['IBP1', 'IBP2'] as const) {
    const v = s?.[ch];
    if (!v || ibpScaleError(v) !== null || v.mode === 'fixed') continue;
    out[ch] = v.mode === 'custom' ? { mode: 'custom', lower: v.lower, upper: v.upper } : { mode: 'auto' };
  }
  return out;
}
