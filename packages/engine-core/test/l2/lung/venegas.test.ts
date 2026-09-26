import { describe, expect, it } from 'vitest';
import { complianceAt, pressureAt, sigmoidFor, volumeAt } from '../../../src/l2/lung/venegas.ts';

describe('Venegas sigmoid on the lung (N-P12)', () => {
  const s = sigmoidFor(2000, 34);
  it('passes through the FRC state and has the requested compliance at c', () => {
    expect(volumeAt(s, 0)).toBeCloseTo(0, 6);
    expect(complianceAt(s, volumeAt(s, s.c))).toBeCloseTo(34, 3);
  });
  it('pressure is the inverse of volume', () => {
    for (const p of [-5, 0, 5, 12, 25, 35]) expect(pressureAt(s, volumeAt(s, p))).toBeCloseTo(p, 6);
  });
  it('over-distends: compliance at 35 cmH2O is below 60 % of the maximum', () => {
    expect(complianceAt(s, volumeAt(s, 35)) / 34).toBeLessThan(0.6);
  });
});
