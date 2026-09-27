import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { labPanel, LAB_TURNAROUND_S } from '../../../src/l2/blood/labs.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const X = { paco2: 40, pao2: 95, tempC: 37, vco2: 200, coLpm: 5.25 };

describe('lab panel (plan decision 13)', () => {
  it('ABG at rest: pH 7.40, PCO2 40, HCO3 24.4, BE 0, AG 12, K 4.2, glucose placeholder 100', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    const v = labPanel(bc, X, 'abg');
    expect(v.ph).toBeCloseTo(7.4, 2);
    expect(v.pco2).toBe(40);
    expect(v.hco3).toBeCloseTo(24.4, 1);
    expect(Math.abs(v.be)).toBeLessThanOrEqual(0.1);
    expect(v.ag).toBe(12);
    expect(v.k).toBeCloseTo(4.2, 1);
    expect(v.glucose).toBe(100);
    expect(LAB_TURNAROUND_S).toBe(120);
  });
  it('VBG: higher PCO2 (+ VCO2/(Q·4.5) ≈ 8.5), lower pH, venous PO2 from SvO2', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    const a = labPanel(bc, X, 'abg');
    const v = labPanel(bc, X, 'vbg');
    expect(v.pco2 - a.pco2).toBeGreaterThanOrEqual(8);
    expect(v.ph).toBeLessThan(a.ph);
    expect(v.po2).toBeGreaterThan(30);
    expect(v.po2).toBeLessThan(50);
  });
  it('COHb shows on the co-oximeter: SO2 is fractional', () => {
    const bc = createBloodCore({ ...MAN, blood: { cohb: 0.2 } }, 5.25, 40);
    stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    const v = labPanel(bc, X, 'abg');
    expect(v.cohb).toBe(20);
    expect(v.so2).toBeLessThan(80);
  });
});
