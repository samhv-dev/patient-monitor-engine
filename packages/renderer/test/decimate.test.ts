import { describe, expect, it } from 'vitest';
import { sweepPxPerS, sweepX } from '../src/calibration.ts';
import { columnOf, decimateMinMax } from '../src/decimate.ts';

describe('decimate + sweep maths (acceptance 12)', () => {
  it('x-velocity is 94.5 ± 0.1 CSS px/s at 25 mm/s and 3.78 px/mm, at any frame rate', () => {
    for (const fps of [30, 60, 120]) {
      const t0 = 1.234;
      const frames = fps * 5; // 5 s, no wrap in a 1000 px lane
      let x = sweepX(t0, 25, 3.78, 1000);
      let travelled = 0;
      for (let i = 1; i <= frames; i++) {
        const nx = sweepX(t0 + i / fps, 25, 3.78, 1000);
        travelled += nx >= x ? nx - x : nx + 1000 - x;
        x = nx;
      }
      expect(Math.abs(travelled / 5 - 94.5)).toBeLessThanOrEqual(0.1);
    }
  });

  it('keeps the R-peak maximum exactly, in the column that holds the peak sample (within 1 sample)', () => {
    const rate = 500;
    const pxPerS = sweepPxPerS(25, 3.78);
    for (const dpr of [1, 2, 3]) {
      for (const peakAt of [1000, 1001, 1003, 1007]) {
        const n0 = 900;
        const s = new Float32Array(300);
        for (let i = 0; i < s.length; i++) s[i] = 1.1 * Math.exp(-(((n0 + i - peakAt) / 5) ** 2) / 2); // σ = 10 ms
        const cols = decimateMinMax(s, s.length, n0, rate, pxPerS, dpr);
        const best = cols.reduce((a, c) => (c.max > a.max ? c : a));
        expect(best.max).toBe(Math.max(...s));
        expect(Math.abs(best.maxIndex - peakAt)).toBeLessThanOrEqual(1);
        expect(best.col).toBe(columnOf(peakAt, rate, pxPerS, dpr));
      }
    }
  });

  it('gives 94.5·dpr columns per second, each covering ≈ 5.3/dpr samples', () => {
    const s = new Float32Array(500);
    const cols = decimateMinMax(s, 500, 0, 500, 94.5, 2);
    expect(cols.length).toBeGreaterThanOrEqual(188);
    expect(cols.length).toBeLessThanOrEqual(190);
  });
});
