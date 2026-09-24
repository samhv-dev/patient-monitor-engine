import { describe, expect, it } from 'vitest';
import { createWaveNumerics, numericsStep, pressureNumerics, prNumeric } from '../../../src/l3/pressure-numerics/numerics.ts';

describe('l3/pressure-numerics (brief §4.2 numerics)', () => {
  it('per-beat max/min and MAP by INTEGRAL, averaged, then the flat-line fallback', () => {
    const wn = createWaveNumerics(3);
    const x = (t: number) => {
      const u = (t % 1) / 1;
      return u < 0.1 ? 80 + 400 * u : 80 + 40 * Math.exp(-(u - 0.1) * 6);
    };
    let sum = 0;
    let n = 0;
    for (let m = 0; m < 125 * 20; m++) {
      const v = x(m / 125);
      numericsStep(wn, m, v);
      if (m >= 125 * 12) {
        sum += v;
        n++;
      }
    }
    const p = pressureNumerics(wn, 20);
    expect(p.sys.flag).toBe('valid');
    expect(Math.abs(p.sys.value! - 120)).toBeLessThan(1.5); // the 125 Hz grid can miss the exact peak
    expect(Math.abs(p.dia.value! - 80)).toBeLessThan(1.5);
    expect(Math.abs(p.mean.value! - sum / n)).toBeLessThan(1);
    expect(prNumeric(wn, 20).value).toBe(60);
    for (let m = 125 * 20; m < 125 * 30; m++) numericsStep(wn, m, 12);
    const flat = pressureNumerics(wn, 30);
    expect(flat.mean.flag).toBe('questionable');
    expect(flat.mean.value).toBeCloseTo(12, 6);
    expect(prNumeric(wn, 30).flag).toBe('invalid');
  });
});
