// Metabolic scaling and cascade outputs (tables §5c/§5.3).
import { describe, expect, it } from 'vitest';
import { createThermal, stepThermal } from '../../../src/l2/thermal/heat.ts';
import { cascade, mhO2Demand, oxyKjPerL, thermalMetabolic } from '../../../src/l2/thermal/metabolic.ts';
import { MH_VO2_PEAK_X } from '../../../src/l2/thermal/params.ts';

describe('thermal metabolism and cascade', () => {
  it('at rest every factor is exactly 1 (no drift into the haemodynamic and respiratory outputs)', () => {
    const st = createThermal(36.8, 70);
    stepThermal(st, 1, 1);
    expect(thermalMetabolic(st, 1)).toEqual({ shiverF: 1, mhX: 0, mhActivity: 0 });
    expect(mhO2Demand(st, 1, 245)).toBe(0);
    const c = cascade(st);
    expect(c.hrF).toBe(1);
    expect(c.coagF).toBe(1);
    expect(c.stage).toBe(0);
  });

  it('E131 the one MH rate: at activity 1 the muscle adds (MH_VO2_PEAK_X − 1) × the resting VO2, and it follows the activity', () => {
    const st = createThermal(36.8, 70);
    st.anaesthesia = 'general';
    st.mh = { severity: 1, t0: 0 };
    stepThermal(st, 1, 1);
    expect(mhO2Demand(st, 900, 245)).toBeCloseTo((MH_VO2_PEAK_X - 1) * 245, 9);
    expect(mhO2Demand(st, 450, 245)).toBeCloseTo(0.5 * (MH_VO2_PEAK_X - 1) * 245, 9); // half-way up the onset ramp
    st.mh.s = 0.2; // dantrolene-suppressed: the same rate falls, so everything derived from it falls together
    expect(mhO2Demand(st, 900, 245)).toBeCloseTo(0.2 * (MH_VO2_PEAK_X - 1) * 245, 9);
  });

  it('E131 Weir: 20.2 kJ per L O2 at RQ 0.8, 21.1 at RQ 1.0 (Weir 1949)', () => {
    expect(oxyKjPerL(0.8)).toBeCloseTo(20.19, 2);
    expect(oxyKjPerL(1)).toBeCloseTo(21.12, 2);
  });

  it('shivering raises VO2 in proportion to its heat (× 2–3 at 0.5–1 °C below threshold)', () => {
    const st = createThermal(35.2, 70);
    st.setShift = 0; // thresholds at the normal set point: 0.8 °C below the awake shivering threshold
    stepThermal(st, 1, 1);
    const m = thermalMetabolic(st, 1);
    expect(m.shiverF).toBeGreaterThanOrEqual(2);
    expect(m.shiverF).toBeLessThanOrEqual(3);
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
