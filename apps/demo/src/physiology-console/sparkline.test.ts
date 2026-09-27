import { describe, expect, it } from 'vitest';
import { drawSpark, pushHist, SPARK_N, sparkPoints, sparkRange, sparkY } from './sparkline.ts';

describe('sparkline', () => {
  it('keeps the last 60 samples', () => {
    const h: number[] = [];
    for (let i = 0; i < 75; i++) pushHist(h, i);
    expect(h).toHaveLength(SPARK_N);
    expect(h[0]).toBe(15);
    expect(h.at(-1)).toBe(74);
  });
  it('range covers the samples and the baseline, skipping non-finite values', () => {
    expect(sparkRange([2, Number.NaN, 5], 1)).toEqual([1, 5]);
    expect(sparkRange([Number.NaN])).toBeNull();
  });
  it('newest sample at the right edge, min at the bottom, max at the top, flat line mid-height', () => {
    const pts = sparkPoints([0, 10], 64, 14);
    expect(pts[1]).toEqual([63, 1]);
    expect(pts[0]?.[1]).toBe(13);
    expect(pts[0]?.[0]).toBeCloseTo(63 - 62 / 59);
    expect(sparkPoints([3, 3, 3], 64, 14).map((p) => p[1])).toEqual([7, 7, 7]);
    expect(sparkY(5, 14, [0, 10])).toBe(7);
  });
  it('drawing without a 2D context is a no-op', () => {
    expect(() => drawSpark(null, [1, 2], 64, 14, '#fff', 1)).not.toThrow();
  });
});
