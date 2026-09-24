import { describe, expect, it } from 'vitest';
import { DEFAULT_PX_PER_MM, sweepPxPerS, sweepX } from '../src/calibration.ts';

describe('calibration', () => {
  it('25 mm/s at 3.78 px/mm is 94.5 CSS px/s', () => {
    expect(sweepPxPerS(25, 3.78)).toBeCloseTo(94.5, 9);
    expect(Math.abs(sweepPxPerS(25) - 94.5)).toBeLessThan(0.1);
    expect(DEFAULT_PX_PER_MM).toBeCloseTo(3.7795, 4);
  });

  it('x is a pure function of sim time and wraps at the lane width', () => {
    expect(sweepX(0, 25, 3.78, 1000)).toBe(0);
    expect(sweepX(1, 25, 3.78, 1000)).toBeCloseTo(94.5, 9);
    expect(sweepX(10, 25, 3.78, 1000)).toBeCloseTo(945, 9);
    expect(sweepX(11, 25, 3.78, 1000)).toBeCloseTo(39.5, 9);
  });
});
