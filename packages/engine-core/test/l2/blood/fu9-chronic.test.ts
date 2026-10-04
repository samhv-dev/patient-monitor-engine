// FU-9 Task B2 (F7): a COPD retainer starts at its own resting PaCO2 with its chronic renal compensation.
import { describe, expect, it } from 'vitest';
import { createBloodCore } from '../../../src/l2/blood/core.ts';
import { CHRONIC_HCO3_PER_MMHG } from '../../../src/l2/blood/params.ts';
import { gasPatient, PACO2_REST_MMHG, restingPaco2 } from '../../../src/l2/gas/params.ts';

const MAN = { ageY: 65, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const copd = (severity: number) => ({ ...MAN, lungConditions: [{ id: 'copd' as const, severity }] });

describe('FU-9 F7: chronic hypercapnia (tables §1.5, §5b.1; Brackett 1965)', () => {
  it('resting PaCO2 by GOLD grade 40 / 40 / 45 / 55; a healthy patient 40', () => {
    expect(restingPaco2(MAN)).toBe(PACO2_REST_MMHG);
    expect(restingPaco2(copd(0.25))).toBe(40);
    expect(restingPaco2(copd(0.5))).toBe(40);
    expect(restingPaco2(copd(0.75))).toBeCloseTo(45, 9);
    expect(restingPaco2(copd(1))).toBeCloseTo(55, 9);
    expect(gasPatient(copd(0.75)).paco2Rest).toBeCloseTo(45, 9);
  });
  it('GOLD 3 at PaCO2 45: HCO3 +3.5 per 10 mmHg (26.15), pH ≥ 7.37; a profile HCO3 is honoured', () => {
    const c = createBloodCore(copd(0.75), 5.25, 45);
    expect(CHRONIC_HCO3_PER_MMHG).toBe(0.35);
    expect(c.ab.hco3).toBeCloseTo(24.4 + 0.35 * 5, 1);
    expect(c.ab.ph).toBeGreaterThanOrEqual(7.37);
    expect(createBloodCore({ ...copd(0.75), blood: { hco3: 30 } }, 5.25, 45).ab.hco3).toBeCloseTo(30, 1);
    expect(createBloodCore(MAN, 5.25, 40).ab.hco3).toBeCloseTo(24.4, 2);
  });
});
