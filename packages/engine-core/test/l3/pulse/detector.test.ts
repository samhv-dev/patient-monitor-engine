import { describe, expect, it } from 'vitest';
import { createPulseDet, prSource, pulseRate, pulseStep } from '../../../src/l3/pulse/detector.ts';

/** A crude arterial-like wave: fast rise, slow fall, a dicrotic bump; period RR s. */
function wave(t: number, rr: number): number {
  const u = (t % rr) / rr;
  const up = u < 0.12 ? u / 0.12 : Math.exp(-(u - 0.12) * 3);
  const bump = 0.25 * Math.exp(-(((u - 0.4) / 0.05) ** 2));
  return 80 + 40 * (up + bump);
}

describe('l3/pulse detector (slope sum, Zong 2003)', () => {
  it('finds one foot per beat, near the true foot, and ignores the dicrotic wave', () => {
    const st = createPulseDet(3);
    const feet: number[] = [];
    for (let n = 0; n < 125 * 20; n++) {
      const f = pulseStep(st, wave(n / 125, 0.8));
      if (f >= 0) feet.push(f / 125);
    }
    expect(feet.length).toBeGreaterThanOrEqual(24);
    expect(feet.length).toBeLessThanOrEqual(25);
    for (const f of feet.slice(2)) expect(Math.abs(f - Math.round(f / 0.8) * 0.8)).toBeLessThan(0.03);
    expect(pulseRate(feet)).toBeCloseTo(75, 0);
  });

  it('a flat line gives no pulses; PR source rule', () => {
    const st = createPulseDet(3);
    for (let n = 0; n < 1000; n++) expect(pulseStep(st, 12)).toBe(-1);
    expect(prSource('on', true)).toBe('pleth');
    expect(prSource('off', true)).toBe('abp');
    expect(prSource('motion', false)).toBeNull();
  });
});
