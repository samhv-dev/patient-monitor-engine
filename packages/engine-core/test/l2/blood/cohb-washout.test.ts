import { describe, expect, it } from 'vitest';
import { cohbWashout } from '../../../src/l2/blood/core.ts';

describe('FU-6 R11: COHb washout (Weaver 2009: t½ 320 min on air, 74 min on FiO2 1)', () => {
  it('halves in 320 min at PaO2 95 and in ≈ 74 min at PaO2 600', () => {
    let a = 0.3;
    let b = 0.3;
    for (let t = 0; t < 320 * 60; t++) a = cohbWashout(a, 95, 1);
    for (let t = 0; t < 74 * 60; t++) b = cohbWashout(b, 600, 1);
    expect(a).toBeCloseTo(0.15, 3);
    expect(b).toBeGreaterThan(0.14);
    expect(b).toBeLessThan(0.16);
  });
});
