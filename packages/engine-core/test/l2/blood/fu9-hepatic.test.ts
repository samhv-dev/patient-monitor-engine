// FU-9 Task A12 (H3; research/13): hepatic blood flow = CO/CO0 × 7d's splanchnic/outflow factor (7d's `hbfFactor`, dead
// code with 7c present before FU-9), the (CO/CO0)² fallback without 7d.
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { hbfFactor, type LiverInputs } from '../../../src/l2/liver/liver.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const L: LiverInputs = { coLpm: 5.6, co0Lpm: 5.6, bvRel: 1, alphaE: 0, volatileMac: 0, tempC: 37, gfrRel: 1, do2MlKgMin: 14 };

describe('FU-9 H3: one hepatic flow with 7d\'s splanchnic and outflow factor', () => {
  it('7d factor: 1 at rest; sevoflurane 1 MAC × 0.8; class III (bvRel 0.7) × 0.6; CVP 10 × 0.9; IAP 20 × 0.7', () => {
    expect(hbfFactor(L)).toBe(1);
    expect(hbfFactor({ ...L, volatileMac: 1 })).toBeCloseTo(0.8, 9);
    expect(hbfFactor({ ...L, bvRel: 0.7 })).toBeCloseTo(0.6, 9);
    expect(hbfFactor({ ...L, outflowMmHg: 10 })).toBeCloseTo(0.9, 9);
    expect(hbfFactor({ ...L, outflowMmHg: 20 })).toBeCloseTo(0.7, 9);
  });
  it('7c: hbfRel = CO/CO0 × the factor 7d writes (0.8 × 0.8 = 0.64); without 7d the (CO/CO0)² fallback (0.64 too at CO 0.8)', () => {
    const a = createBloodCore(MAN, 5.25, 40);
    (a as unknown as { hbfFactor: number }).hbfFactor = 0.8;
    stepBloodCore(a, { t: 0, coLpm: 0.8 * 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    expect(a.out.hbfRel).toBeCloseTo(0.64, 9);
    const b = createBloodCore(MAN, 5.25, 40);
    (b as unknown as { hbfFactor: number }).hbfFactor = 1;
    stepBloodCore(b, { t: 0, coLpm: 0.8 * 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    expect(b.out.hbfRel).toBeCloseTo(0.8, 9); // the per-breath CO swing is no longer squared
  });
});
