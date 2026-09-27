import { describe, expect, it } from 'vitest';
import { bloodPatient, FLUIDS, MOLAR_MASS, PRODUCTS, storedK } from '../../../src/l2/blood/params.ts';

describe('7c constants and patient scaling (tables §1.1–1.3, §5b.4)', () => {
  it('70 kg man: BV 70 mL/kg, Hb 15, TBW 0.6 L/kg; woman 65 mL/kg, Hb 13.5, TBW 0.5; obese BV by Lemmens', () => {
    const m = bloodPatient({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 });
    expect(m.bvMl).toBeCloseTo(70 * 70 * Math.min(1, 1 / Math.sqrt(22.86 / 22)), -1);
    expect(m.hb).toBe(15);
    expect(m.plasmaMl + m.isfMl + m.icfMl).toBeCloseTo(42000, -1);
    const f = bloodPatient({ ageY: 40, sex: 'F', weightKg: 60, heightCm: 165 });
    expect(f.hb).toBe(13.5);
    expect(f.icfMl).toBeCloseTo(20000, -1);
    const o = bloodPatient({ ageY: 40, sex: 'M', weightKg: 127, heightCm: 175 });
    expect(o.bvMl / 127).toBeLessThan(55); // BMI 41.5 → 51 mL/kg (tables §1.3: 50–55)
    expect(bloodPatient({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, blood: { hb: 9 } }).hb).toBe(9);
    expect(bloodPatient({ ageY: 0.01 }).hb).toBe(17);
  });
  it('molar masses (K 39.098) and compositions', () => {
    expect(MOLAR_MASS.k).toBe(39.098);
    expect(FLUIDS.saline.na - FLUIDS.saline.cl).toBe(0);
    expect(FLUIDS.balanced.na + FLUIDS.balanced.k + 2 * FLUIDS.balanced.mg - FLUIDS.balanced.cl - FLUIDS.balanced.xa).toBe(27); // acetate
    expect(PRODUCTS.rbc.ml * PRODUCTS.rbc.comp.hct).toBeCloseTo(168, 6);
    expect(storedK(35)).toBe(35);
    expect(storedK(60)).toBe(50);
  });
});
