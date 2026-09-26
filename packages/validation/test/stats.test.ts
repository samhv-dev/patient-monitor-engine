import { describe, expect, it } from 'vitest';
import { coverage, ksD, pearson, quantile, wasserstein1 } from '../src/stats.ts';

describe('distribution statistics', () => {
  const a = Array.from({ length: 101 }, (_, i) => i);
  it('quantile interpolates and ignores NaN', () => {
    expect(quantile([...a, Number.NaN], 0.5)).toBe(50);
    expect(quantile([0, 10], 0.25)).toBe(2.5);
  });
  it('KS D is 0 for identical and 1 for disjoint samples', () => {
    expect(ksD(a, a)).toBe(0);
    expect(ksD([1, 2, 3], [10, 11])).toBe(1);
  });
  it('Wasserstein-1 of a shifted sample equals the shift', () => {
    expect(wasserstein1(a, a.map((x) => x + 7))).toBeCloseTo(7, 1);
  });
  it('coverage and Pearson', () => {
    expect(coverage(a, 10, 19)).toBeCloseTo(10 / 101);
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });
});
