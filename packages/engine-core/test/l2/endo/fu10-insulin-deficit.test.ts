// FU-10 Task A7 (E7; ruling R-2): insulin deficiency — the type 1 basal insulin can be omitted; a NET ketone rate
// (production from the current deficit, insulin-dependent utilisation); K⁺ out of the cells in insulinopenia only.
import { describe, expect, it } from 'vitest';
import { createEndoCore, DEFAULT_ENDO_PROFILE, glucoseProfile, insulinopenia, NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../../src/l2/endo/core.ts';
import { dextroseBolus, insulinInfusion } from '../../../src/l2/endo/glucose.ts';

const T1 = { ...DEFAULT_ENDO_PROFILE, diabetes: 'type1' as const };
const run = (c: ReturnType<typeof createEndoCore>, s: number) => { for (let i = 0; i < s; i++) stepEndoCore(c, { ...NEUTRAL_ENDO_INPUTS }, 1); };

describe('FU-10 E7: insulin deficiency (JBDS-IP 2023; JBDS DKA 2023; Kitabchi 2009)', () => {
  it('a type 1 patient has its basal insulin unless it is omitted', () => {
    expect(glucoseProfile(T1).basalExo).toBe(true);
    expect(glucoseProfile({ ...T1, basalInsulin: false }).basalExo).toBe(false);
  });
  it('omitted: within 1 h the deficit drives ketone production and K⁺ out; on its basal insulin nothing moves', () => {
    const off = createEndoCore({ ...T1, basalInsulin: false });
    const on = createEndoCore(T1);
    run(off, 3600);
    run(on, 3600);
    expect(off.out.ketoMmolMin).toBeGreaterThan(0.25);
    expect(off.out.kShift).toBeGreaterThan(0.5);
    expect(on.out.ketoMmolMin).toBe(0);
    expect(on.out.kShift).toBeCloseTo(0, 6);
  });
  it('insulin restores utilisation (the pool clears) and stops production', () => {
    const c = createEndoCore({ ...T1, basalInsulin: false });
    run(c, 3600);
    insulinInfusion(c.glucose, 7);
    run(c, 2 * 3600);
    expect(c.out.ketoMmolMin).toBeLessThan(0.05);
    expect(c.out.ketoUtilPerMin).toBeGreaterThan(0.001);
  });
  it('the instructor\'s `dka` severity is insulinopenia; a dextrose bolus in a patient WITH insulin shifts no K⁺ out (review F17)', () => {
    const c = createEndoCore();
    stepEndoCore(c, { ...NEUTRAL_ENDO_INPUTS, dkaSeverity: 1 }, 1);
    expect(insulinopenia(c)).toBe(1);
    const h = createEndoCore();
    dextroseBolus(h.glucose, 25, 70);
    stepEndoCore(h, { ...NEUTRAL_ENDO_INPUTS }, 1);
    expect(h.out.kShift).toBeLessThanOrEqual(0);
  });
});
