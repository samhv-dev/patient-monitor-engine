// FU-10 Task A3 (E5, E6): the thresholds read at most the GA row; the GA vasoconstriction threshold is the tables'
// 34.5 °C (ruling R-4); age lowers the cold-defence thresholds under anaesthesia only (ruling R-6).
import { describe, expect, it } from 'vitest';
import { createThermal, currentThresholds, upgradeThermal, type ThermalState } from '../../../src/l2/thermal/heat.ts';
import { THR_SHIVER_AWAKE, THR_SWEAT_AWAKE, THR_VASO_AWAKE, VASOCONSTRICT_C } from '../../../src/l2/thermal/params.ts';
import { ageShiftC, thresholds } from '../../../src/l2/thermal/thresholds.ts';

describe('FU-10 E5/E6: threshold depth cap, the tables\' GA row, the depth-weighted age shift (Kurz 1993; Vassilieff 1995)', () => {
  it('the GA row is the floor: depth 1.5 reads depth 1; depth 0.5 still interpolates; the GA vasoconstriction centre is 34.5 °C', () => {
    expect(VASOCONSTRICT_C).toBe(34.5);
    expect(thresholds(1.5, 0)).toEqual(thresholds(1, 0));
    expect(thresholds(1, 0).vaso).toBeCloseTo(34.5, 9);
    expect(thresholds(0.5, 0).vaso).toBeCloseTo((THR_VASO_AWAKE + 34.5) / 2, 9);
  });
  it('ageShiftC: 0 up to 60 y, −0.5 at 70 y, −1 from 80 y', () => {
    expect(ageShiftC(40)).toBeCloseTo(0, 9);
    expect(ageShiftC(60)).toBeCloseTo(0, 9);
    expect(ageShiftC(70)).toBeCloseTo(-0.5, 9);
    expect(ageShiftC(80)).toBeCloseTo(-1, 9);
    expect(ageShiftC(90)).toBeCloseTo(-1, 9);
  });
  it('the age shift acts under anaesthesia only, on vasoconstriction and shivering, never on sweating', () => {
    const awake80 = thresholds(0, 0, 80);
    expect([awake80.vaso, awake80.shiver, awake80.sweat]).toEqual([THR_VASO_AWAKE, THR_SHIVER_AWAKE, THR_SWEAT_AWAKE]);
    const ga80 = thresholds(1, 0, 80);
    const ga40 = thresholds(1, 0, 40);
    expect(ga80.vaso - ga40.vaso).toBeCloseTo(-1, 9);
    expect(ga80.shiver - ga40.shiver).toBeCloseTo(-1, 9);
    expect(ga80.sweat).toBe(ga40.sweat);
  });
  it('an 80-year-old heat model reports the shifted thresholds; a pre-FU-10 snapshot (no ageY) behaves as 40 y', () => {
    const st = createThermal(36.8, 70, 175, 80);
    st.depth = 1;
    expect(currentThresholds(st).vaso).toBeCloseTo(33.5, 9);
    const old = { ...createThermal(36.8, 70) } as Partial<ThermalState>;
    delete old.ageY;
    const up = upgradeThermal(old as ThermalState);
    up.depth = 1;
    expect(currentThresholds(up).vaso).toBeCloseTo(34.5, 9);
  });
});
