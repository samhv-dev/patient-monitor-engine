import { describe, expect, it } from 'vitest';
import { NEO_G50, NEO_SMAX, neoEc50Mult } from '../../../src/l2/neuro/neostigmine.ts';

describe('neostigmine EC50 shift from 7g\'s acetylcholine gain (tables §5d Neo row)', () => {
  it('neutral without neostigmine; monotone; bounded by the ceiling; 1.5 at 7g\'s peak gain for 0.05 mg/kg', () => {
    expect(neoEc50Mult(1)).toBe(1);
    expect(neoEc50Mult(0.5)).toBe(1);
    let prev = 1;
    for (const g of [1.5, 2, 2.5, 3, 4, 10, 100]) {
      const m = neoEc50Mult(g);
      expect(m).toBeGreaterThan(prev);
      expect(m).toBeLessThan(1 + NEO_SMAX);
      prev = m;
    }
    expect(neoEc50Mult(2.5)).toBeCloseTo(1 + (NEO_SMAX * 1.5) / (1.5 + NEO_G50), 12);
    expect(neoEc50Mult(2.5)).toBeCloseTo(1.583, 3); // NEO_G50 0.3 fitted on 7g's PK (Task 5)
  });
});
