// FU-10 E-FU10-14 (orchestrator ruling after PR #37's DI-26 regression; reverses plan decision D6): the insulin of the
// combined insulin–dextrose row lowers K⁺ through 7g's insulin pharmacodynamics — the plain insulin row's mechanism —
// and 7c retires its empirical whole-effect curve whenever 7g is present, as it already does for salbutamol. Without
// 7g (no `kShiftExt`) the legacy curve stays (core.test.ts keeps its −0.6 to −1.0 test for that path).
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore, type BloodCore } from '../../../src/l2/blood/core.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const run = (bc: BloodCore, from: number, to: number, kShiftExt?: number) => {
  for (let k = Math.round(from * 10); k < Math.round(to * 10); k++) {
    stepBloodCore(bc, { t: k / 10, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245, ...(kShiftExt !== undefined ? { kShiftExt } : {}) }, 0.1);
  }
};

describe('FU-10 E-FU10-14: one source for the insulin–dextrose row\'s K⁺ shift', () => {
  it('with 7g present (kShiftExt given) 7c\'s own insulin–dextrose curve is off: the dose alone moves no K⁺', () => {
    const dosed = createBloodCore(MAN, 5.25, 40);
    const ctl = createBloodCore(MAN, 5.25, 40);
    dosed.doses.push({ id: 'insulinDextrose', t0: 0, amount: 10 });
    run(dosed, 0, 3600, 0);
    run(ctl, 0, 3600, 0);
    expect(Math.abs(dosed.out.k - ctl.out.k)).toBeLessThan(0.01);
  });
  it('without 7g the legacy curve still acts (the no-7g configuration)', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    bc.doses.push({ id: 'insulinDextrose', t0: 0, amount: 10 });
    run(bc, 0, 3600);
    expect(4.2 - bc.out.k).toBeGreaterThanOrEqual(0.6);
  });
  it('7g: the combined row\'s insulin has the plain insulin row\'s PK and K⁺ PD, and 7c still reads the dose', () => {
    const id = DRUGS.insulinDextrose!;
    const ins = DRUGS.insulin!;
    expect(id.shared).toBe('blood');
    expect(id.pk).toEqual(ins.pk);
    expect(id.pd.find((p) => p.target === 'kShift')).toEqual(ins.pd.find((p) => p.target === 'kShift'));
  });
});
