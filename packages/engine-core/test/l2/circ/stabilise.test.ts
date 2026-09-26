import { describe, expect, it } from 'vitest';
import { resolveProfile } from '../../../src/l2/circ/profile.ts';
import { stabilise } from '../../../src/l2/circ/stabilise.ts';

describe('profile stabilisation (audit #3, A19)', () => {
  it('the default adult converges to 120/80, CVP 5 at HR 70 with H1-range resting values', () => {
    const st = stabilise(resolveProfile());
    expect(st.converged).toBe(true);
    expect(st.ledger.length).toBeLessThanOrEqual(30);
    expect(Math.abs(st.ref.sbp - 120)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(st.ref.dbp - 80)).toBeLessThanOrEqual(1);
    expect(st.ref.cvp).toBeGreaterThan(4.6);
    expect(st.ref.cvp).toBeLessThan(5.4);
    expect(st.ref.co).toBeGreaterThan(4.5); // H1 CO 5–6 (4.9–5.6 measured)
    expect(st.ref.co).toBeLessThan(6.5);
    expect(st.ref.pcwp).toBeGreaterThan(5); // H1 PCWP 6–12
    expect(st.ref.pcwp).toBeLessThan(12);
    expect(st.ref.lvedp).toBeGreaterThan(5);
    expect(st.ref.lvedp).toBeLessThan(13);
    expect(st.params.eesLv).toBe(resolveProfile().params.eesLv); // Emax is never tuned (decision 4)
  });
  it('is cached and deterministic: two calls return equal, independent copies', () => {
    const a = stabilise(resolveProfile());
    const b = stabilise(resolveProfile());
    expect(a).toEqual(b);
    a.s[0] = -1;
    expect(stabilise(resolveProfile()).s[0]).not.toBe(-1);
  });
  it.each([
    ['elderly + HTN', { ageY: 75, sex: 'M' as const, weightKg: 75, conditions: [{ id: 'htn' as const }] }],
    ['75 y AS + CAD + HTN', { ageY: 75, sex: 'M' as const, weightKg: 75, conditions: [{ id: 'htn' as const }, { id: 'as' as const, grade: 'severe' }, { id: 'cad' as const, grade: 'severe' }] }],
    ['HFrEF', { ageY: 60, sex: 'M' as const, weightKg: 80, conditions: [{ id: 'hfref' as const }] }],
    ['50 kg woman', { ageY: 30, sex: 'F' as const, weightKg: 50, conditions: [] }],
    ['6 y child', { ageY: 6, sex: 'M' as const, weightKg: 20, conditions: [] }],
  ])('%s converges within 30 windows', (_n, prof) => {
    const r = resolveProfile(prof);
    const st = stabilise(r);
    expect(st.converged).toBe(true);
    expect(st.ledger.length).toBeLessThanOrEqual(30);
    expect(Math.abs(st.ref.sbp - r.targets.sbp)).toBeLessThanOrEqual(0.02 * r.targets.sbp);
  });
  it('R45(c): the compensated AS + CAD + HTN profile rests at LVEDP 15–20 (tables §3 worked example 18), not 40', () => {
    const st = stabilise(resolveProfile({ ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] }));
    expect(st.ref.lvedp).toBeGreaterThanOrEqual(15);
    expect(st.ref.lvedp).toBeLessThanOrEqual(20);
    expect(st.ref.cvp).toBeGreaterThan(4.5); // the CVP 5 target is kept (no CVP 3 work-around)
  });
});
