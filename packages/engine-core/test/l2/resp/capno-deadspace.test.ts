import { describe, expect, it } from 'vitest';
import { alveolarFraction } from '../../../src/l2/resp/driver.ts';

describe('FU-6 R5: the sampled plateau is the mixed-expirate share (Fowler; D10)', () => {
  it('0 below 0.6 of the series dead space, 1 above 1.4×, linear between', () => {
    expect(alveolarFraction(80, 150)).toBe(0);
    expect(alveolarFraction(90, 150)).toBe(0);
    expect(alveolarFraction(150, 150)).toBeCloseTo(0.5, 12);
    expect(alveolarFraction(210, 150)).toBe(1);
    expect(alveolarFraction(500, 265)).toBe(1); // the ventilated adult's normal breath is untouched
    expect(alveolarFraction(500, 0)).toBe(1);
  });
});
