// Patient scaling for gas exchange (research 03 §8.9; brief §4.3–§4.4).
import { describe, expect, it } from 'vitest';
import { ageBand, apparatusDeadSpaceMl, gasPatient, tempFactor } from '../../../src/l2/gas/params.ts';

describe('gas patient scaling', () => {
  it('70 kg 175 cm man: IBW 70.6 kg, FRC 30/20 mL/kg awake/GA, VO2 245, VCO2 196, dead space 155 mL', () => {
    const p = gasPatient({ ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' });
    expect(p.ibwKg).toBe(70);
    expect(p.frcMl).toBeCloseTo(2100, 0);
    expect(p.frcGaMl).toBeCloseTo(1400, 0);
    expect(p.vo2).toBeCloseTo(245, 0);
    expect(p.vco2).toBeCloseTo(196, 0);
    expect(p.deadSpaceMl).toBeCloseTo(154, 0);
  });
  it('obesity shrinks FRC 3.5 %/BMI point above 25 and adjusted weight drives VO2; children use their own table', () => {
    const o = gasPatient({ ageY: 40, weightKg: 127, heightCm: 175, sex: 'M' });
    expect(o.frcGaMl / (20 * o.ibwKg)).toBeCloseTo(1 - 0.035 * (127 / 1.75 ** 2 - 25), 6);
    expect(o.effKg).toBeCloseTo(o.ibwKg + 0.4 * (127 - o.ibwKg), 6);
    const c = gasPatient({ ageY: 4, weightKg: 16 });
    expect(ageBand(4)).toBe('child');
    expect(c.frcGaMl).toBeCloseTo(128, 0);
    expect(c.vo2).toBeCloseTo(80, 0);
    expect(apparatusDeadSpaceMl(3.5)).toBeCloseTo(5.25, 6);
  });
  it('VO2/VCO2 fall 7.5 %/°C below 37 °C', () => {
    expect(tempFactor(36)).toBeCloseTo(0.925, 6);
  });
});
