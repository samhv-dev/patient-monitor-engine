// Metabolic scaling and cascade outputs (tables §5c/§5.3).
import { describe, expect, it } from 'vitest';
import { createThermal, stepThermal } from '../../../src/l2/thermal/heat.ts';
import { cascade, thermalMetabolic } from '../../../src/l2/thermal/metabolic.ts';

describe('thermal metabolism and cascade', () => {
  it('at rest every factor is exactly 1 (no drift into Stage 1–3 outputs)', () => {
    const st = createThermal(36.8, 70);
    stepThermal(st, 1, 1);
    expect(thermalMetabolic(st, 1)).toEqual({ vo2F: 1, vco2F: 1, mhActivity: 0 });
    const c = cascade(st);
    expect(c.hrF).toBe(1);
    expect(c.coagF).toBe(1);
    expect(c.stage).toBe(0);
  });

  it('MH at activity 1: VO2 × 2.5, VCO2 × 3', () => {
    const st = createThermal(36.8, 70);
    st.anaesthesia = 'general';
    st.mh = { severity: 1, t0: 0 };
    stepThermal(st, 1, 1);
    const m = thermalMetabolic(st, 900);
    expect(m.vo2F).toBeCloseTo(2.5, 9);
    expect(m.vco2F).toBeCloseTo(3, 9);
  });

  it('shivering raises VO2 in proportion to its heat (× 2–3 at 0.5–1 °C below threshold)', () => {
    const st = createThermal(35.2, 70);
    st.setShift = 0; // thresholds at the normal set point: 0.8 °C below the awake shivering threshold
    stepThermal(st, 1, 1);
    const m = thermalMetabolic(st, 1);
    expect(m.vo2F).toBeGreaterThanOrEqual(2);
    expect(m.vo2F).toBeLessThanOrEqual(3);
  });

  it('hypothermia: clearance −10 %/°C, MAC −5 %/°C, coagulation placeholder and stages; fever HR +12 %/°C above 37.5', () => {
    const st = createThermal(36.8, 70);
    st.tc = 33;
    const c = cascade(st);
    expect(c.clearanceF).toBeCloseTo(0.6, 9);
    expect(c.macF).toBeCloseTo(0.8, 9);
    expect(c.coagF).toBeCloseTo(0.8, 9);
    expect(c.stage).toBe(1);
    st.tc = 30;
    expect(cascade(st).stage).toBe(2);
    st.tc = 39.5;
    expect(cascade(st).hrF).toBeCloseTo(1.24, 9);
  });
});
