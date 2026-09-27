import { describe, expect, it } from 'vitest';
import { contentDB, hillN, ODC_DEFAULT, p50, satDB } from '../../../src/l2/blood/odc.ts';

describe('Dash–Bassingthwaighte ODC (tables §5b.3; audit #6/A14)', () => {
  it('P50 is 26.8 mmHg at pH 7.4, PCO2 40, 37 °C, DPG 4.65, no CO; S(P50) = 0.5; Hill n 2.7', () => {
    expect(p50(ODC_DEFAULT, 40, 37)).toBeCloseTo(26.8, 1);
    expect(satDB(p50(ODC_DEFAULT, 40, 37), 40, 37, ODC_DEFAULT)).toBeCloseTo(0.5, 6);
    expect(hillN(ODC_DEFAULT)).toBe(2.7);
    expect(satDB(100, 40, 37, ODC_DEFAULT)).toBeGreaterThan(0.965);
    expect(satDB(60, 40, 37, ODC_DEFAULT)).toBeGreaterThan(0.88);
    expect(satDB(40, 40, 37, ODC_DEFAULT)).toBeCloseTo(0.75, 1);
  });
  it('shifts: acidosis, hypercapnia, fever and 2,3-DPG right; alkalosis, hypothermia and CO left', () => {
    const base = p50(ODC_DEFAULT, 40, 37);
    expect(p50({ ...ODC_DEFAULT, ph: 7.2 }, 40, 37) - base).toBeGreaterThan(4); // Bohr: 31.4
    expect(p50({ ...ODC_DEFAULT, ph: 7.6 }, 40, 37) - base).toBeLessThan(-3.5); // 22.9
    expect(p50(ODC_DEFAULT, 60, 37)).toBeGreaterThan(base);
    expect(p50(ODC_DEFAULT, 40, 39)).toBeCloseTo(29.9, 0);
    expect(p50(ODC_DEFAULT, 40, 33)).toBeCloseTo(21.4, 0);
    expect(p50({ ...ODC_DEFAULT, dpgMmolL: 7 }, 40, 37)).toBeCloseTo(28.5, 0); // tables: +2–5 in chronic anaemia
    expect(p50({ ...ODC_DEFAULT, cohb: 0.2 }, 40, 37)).toBeCloseTo(22.8, 0); // 26.8 − 20·S_CO
    expect(hillN({ ...ODC_DEFAULT, cohb: 0.2 })).toBeCloseTo(2.48, 6);
  });
  it('content: 13.4·Hb·S·(1 − COHb − MetHb) + 0.03·PO2 mL/L', () => {
    const s = satDB(100, 40, 37, ODC_DEFAULT);
    expect(contentDB(100, 40, 37, ODC_DEFAULT)).toBeCloseTo(13.4 * 15 * s + 3, 6);
    expect(contentDB(100, 40, 37, { ...ODC_DEFAULT, cohb: 0.2 })).toBeLessThan(0.82 * contentDB(100, 40, 37, ODC_DEFAULT));
    expect(satDB(0, 40, 37, ODC_DEFAULT)).toBe(0);
  });
});
