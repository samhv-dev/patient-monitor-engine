import { describe, expect, it } from 'vitest';
import { activationAt, activationPeriodS, doubleHill, DH_PEAK } from '../../../src/l2/circ/activation.ts';
import { lvetS, pepS } from '../../../src/l2/hemo/params.ts';

describe('double-Hill activation (Stergiopulos 1996)', () => {
  it('is 0 outside (0, 1), peaks at exactly 1, and the raw peak is near Pulse’s 0.598 normaliser', () => {
    expect(doubleHill(0)).toBe(0);
    expect(doubleHill(1)).toBe(0);
    let mx = 0;
    for (let i = 1; i < 1000; i++) mx = Math.max(mx, doubleHill(i / 1000));
    expect(mx).toBeGreaterThan(0.999);
    expect(mx).toBeLessThanOrEqual(1 + 1e-9);
    expect(DH_PEAK).toBeGreaterThan(0.55);
    expect(DH_PEAK).toBeLessThan(0.65);
  });
  it('period follows Weissler PEP + LVET (× 2.1), not RR', () => {
    expect(activationPeriodS(75)).toBeCloseTo(2.1 * (pepS(75) + lvetS(75)), 12);
    expect(activationPeriodS(120)).toBeLessThan(activationPeriodS(60));
  });
  it('overlapping activations never exceed their largest amplitude', () => {
    const list = [{ t0: 0, T: 0.8, amp: 1 }, { t0: 0.3, T: 0.8, amp: 0.85 }];
    for (let t = 0; t < 1.2; t += 0.01) expect(activationAt(list, t)).toBeLessThanOrEqual(1);
  });
});
