// Environment heat exchange (annex B3; Pulse forms with consistent units).
import { describe, expect, it } from 'vitest';
import { bsaM2, calibrateInsulation, convectiveH, dryW, infusionW, ivInflow, radiativeH, respiratoryW, satMgL } from '../../../src/l2/thermal/environment.ts';

describe('environment terms', () => {
  it('Du Bois BSA 1.85 m² at 70 kg / 175 cm; h_r ≈ 4.3 and h_c ≈ 3.3 W/m²/°C in a still theatre', () => {
    expect(bsaM2(70, 175)).toBeCloseTo(1.85, 2);
    expect(radiativeH(32.5, 21)).toBeCloseTo(4.25, 1);
    expect(convectiveH(0.15)).toBeCloseTo(3.30, 1);
  });

  it('water vapour: saturated 18.3 mg/L at 21 °C and 37.7 at 34 °C', () => {
    expect(satMgL(21)).toBeCloseTo(18.3, 1);
    expect(satMgL(34)).toBeCloseTo(37.7, 1);
  });

  it('respiratory loss ≈ 10 W awake (7 L/min room air), more with dry gas, halved by an HME', () => {
    const awake = respiratoryW({ veLpm: 7, dryGas: false, hme: false }, 21);
    const dry = respiratoryW({ veLpm: 7, dryGas: true, hme: false }, 21);
    expect(awake).toBeGreaterThan(8);
    expect(awake).toBeLessThan(12);
    expect(dry).toBeGreaterThan(awake);
    expect(respiratoryW({ veLpm: 7, dryGas: true, hme: true }, 21)).toBeCloseTo(dry / 2, 9);
  });

  it('the insulation calibration reproduces the requested dry loss exactly', () => {
    const bsa = bsaM2(70, 175);
    const rIns = calibrateInsulation(bsa, 32.5, 21, 0.15, 60);
    expect(dryW({ bsa, rIns }, 32.5, 21, 0.15, 1)).toBeCloseTo(60, 6);
  });

  it('1 L of 21 °C fluid removes ≈ 66 kJ from a 36.8 °C core; a warmer (37 °C) removes nothing', () => {
    expect(infusionW(1000 / 60, 21, 36.8) * 3600).toBeCloseTo(-66_044, -2);
    expect(infusionW(100, 37, 37)).toBeCloseTo(0, 12);
  });

  it('IV inflow (E-7e-1): crystalloid at room temperature, an unwarmed unit at 4 °C, haemorrhage ignored, finished lines ignored', () => {
    const saline = { rate: 60, until: 1e9, comp: { citrate: 0 } };
    const rbc = { rate: 56, until: 1e9, leftMl: 200, comp: { citrate: 55.7 } };
    const bleed = { rate: 100, until: 1e9, comp: null };
    expect(ivInflow([saline, bleed], false, 10, 21)).toEqual({ mlPerMin: 60, tempC: 21 });
    expect(ivInflow([rbc], true, 10, 21)).toEqual({ mlPerMin: 56, tempC: 4 });
    expect(ivInflow([rbc], false, 10, 21).tempC).toBe(37);
    expect(ivInflow([{ ...rbc, leftMl: 0 }, { ...saline, until: 5 }], true, 10, 21)).toEqual({ mlPerMin: 0, tempC: 21 });
    // one 280 mL unit at 4 °C: ≈ 0.24 °C of a 70 kg core (the tables' 0.25 °C per unit)
    expect((-infusionW(56, 4, 36.8) * 300) / (3500 * 70 * (2 / 3))).toBeCloseTo(0.235, 2);
  });
});
