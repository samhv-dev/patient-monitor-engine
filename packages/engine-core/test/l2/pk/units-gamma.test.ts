import { describe, expect, it } from 'vitest';
import { toAmount, toRate } from '../../../src/l2/pk/units.ts';
import { gammaConc, gammaShape } from '../../../src/l2/pk/gamma.ts';

describe('units', () => {
  it('bolus units convert to the drug amount unit', () => {
    expect(toAmount(2, 'mg/kg', 'mg', 70)).toBe(140);
    expect(toAmount(100, 'mcg', 'mg', 70)).toBeCloseTo(0.1, 12);
    expect(toAmount(1, 'mcg/kg', 'mcg', 80)).toBe(80);
    expect(toAmount(1, 'g', 'mg', 70)).toBe(1000);
    expect(toAmount(10, 'mL', 'mg', 70, 10)).toBe(100); // 10 mL of 10 mg/mL
    expect(typeof toAmount(1, 'units', 'mg', 70)).toBe('string'); // incompatible → error text
    expect(toAmount(1.5, 'mL/kg', 'mL', 70)).toBeCloseTo(105, 12); // a drug dosed in mL (lipid 20 %): no concentration needed (Task 23)
    expect(toRate(0.25, 'mL/kg/min', 'mL', 70)).toBeCloseTo(17.5, 12);
  });
  it('rate units convert to amount/min', () => {
    expect(toRate(0.1, 'mcg/kg/min', 'mcg', 70)).toBeCloseTo(7, 12);
    expect(toRate(6, 'mg/kg/h', 'mg', 70)).toBeCloseTo(7, 12);
    expect(toRate(20, 'mL/h', 'mg', 70, 10)).toBeCloseTo(20 * 10 / 60, 12);
    expect(toRate(0.04, 'units/min', 'units', 70)).toBeCloseTo(0.04, 12);
  });
});

describe('gamma fallback (brief §4.9)', () => {
  it('peaks at 1 at tp and repeats add', () => {
    expect(gammaShape(60, 60, 2)).toBeCloseTo(1, 12);
    expect(gammaShape(0, 60, 2)).toBe(0);
    expect(gammaShape(30, 60, 2)).toBeLessThan(1);
    expect(gammaConc([{ t: 0, scale: 1 }, { t: 0, scale: 0.5 }], 60, 60, 2)).toBeCloseTo(1.5, 12);
  });
});
