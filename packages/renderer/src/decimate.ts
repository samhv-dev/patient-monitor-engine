// Min/max decimation per DEVICE-pixel column (brief §3.5): 500 Hz at 25 mm/s is 5.3 samples per CSS px
// (2.65 per device px at DPR 2), so each column keeps its first, last, min and max sample. That preserves
// QRS and VF crests exactly (no sample is averaged away).

export interface Column {
  /** Unwrapped device-pixel column index: floor(x_css · dpr), x_css = n / rate · pxPerS. */
  col: number;
  first: number;
  last: number;
  min: number;
  max: number;
  /** Absolute sample index of the max and the min (for tests and overlays). */
  maxIndex: number;
  minIndex: number;
}

/** Unwrapped device column of absolute sample n. */
export function columnOf(n: number, rate: number, pxPerS: number, dpr: number): number {
  return Math.floor(((n / rate) * pxPerS * dpr) + 1e-9);
}

/**
 * Decimate `count` samples (samples[0] is absolute index `startIndex`) into columns, appended to `out`.
 * Returns `out`.
 */
export function decimateMinMax(
  samples: ArrayLike<number>,
  count: number,
  startIndex: number,
  rate: number,
  pxPerS: number,
  dpr: number,
  out: Column[] = [],
): Column[] {
  let cur: Column | null = null;
  for (let i = 0; i < count; i++) {
    const n = startIndex + i;
    const v = samples[i] as number;
    const col = columnOf(n, rate, pxPerS, dpr);
    if (cur === null || col !== cur.col) {
      cur = { col, first: v, last: v, min: v, max: v, maxIndex: n, minIndex: n };
      out.push(cur);
    } else {
      cur.last = v;
      if (v > cur.max) {
        cur.max = v;
        cur.maxIndex = n;
      }
      if (v < cur.min) {
        cur.min = v;
        cur.minIndex = n;
      }
    }
  }
  return out;
}
