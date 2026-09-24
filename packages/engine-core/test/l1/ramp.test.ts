import { describe, expect, it } from 'vitest';
import { constantRamp, rampValue, retarget } from '../../src/l1/ramp.ts';

describe('l1/ramp', () => {
  it('a zero-duration ramp steps immediately', () => {
    const r = retarget(constantRamp(80), 10, 120);
    expect(rampValue(r, 9.99)).toBe(80);
    expect(rampValue(r, 10.001)).toBe(120);
  });

  it('linear ramp hits the midpoint halfway and the target at the end', () => {
    const r = retarget(constantRamp(60), 0, 120, { durationS: 30 });
    expect(rampValue(r, 15)).toBeCloseTo(90, 9);
    expect(rampValue(r, 30)).toBe(120);
    expect(rampValue(r, 100)).toBe(120);
  });

  it('exp and sigmoid are monotonic and end exactly on target', () => {
    for (const curve of ['exp', 'sigmoid'] as const) {
      const r = retarget(constantRamp(100), 0, 50, { durationS: 10, curve });
      let prev = Infinity;
      for (let t = 0; t <= 10; t += 0.1) {
        const v = rampValue(r, t);
        expect(v).toBeLessThanOrEqual(prev + 1e-12);
        prev = v;
      }
      expect(rampValue(r, 10)).toBeCloseTo(50, 9);
    }
  });

  it('honours delayS and retargets mid-ramp from the current value', () => {
    const r = retarget(constantRamp(60), 0, 120, { durationS: 10, delayS: 5 });
    expect(rampValue(r, 5)).toBe(60);
    expect(rampValue(r, 10)).toBeCloseTo(90, 9);
    const r2 = retarget(r, 10, 60, { durationS: 10 });
    expect(rampValue(r2, 10)).toBeCloseTo(90, 9);
    expect(rampValue(r2, 20)).toBe(60);
  });
});

describe('l1/ramp exp curve (Stage 2, brief §4.9: τ = duration/3)', () => {
  it('reaches 1 − e^(−1) of the normalised change at one third of the duration', () => {
    const r = retarget(constantRamp(0), 0, 1, { durationS: 30, curve: 'exp' });
    expect(rampValue(r, 10)).toBeCloseTo((1 - Math.exp(-1)) / (1 - Math.exp(-3)), 9);
  });
});
