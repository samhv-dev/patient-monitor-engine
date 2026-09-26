import { describe, expect, it } from 'vitest';
import { createBaro, stepBaro, RESET_HOLD_S, SYMP_SAT } from '../../../src/l2/circ/baroreflex.ts';

const g = { gVagal: 15, gSymp: 1, betaBlock: 0, weightScale: 1, pinnedSet: false };
const run = (b: ReturnType<typeof createBaro>, map: number, s: number, gg = g) => {
  let o = stepBaro(b, map, gg);
  for (let i = 1; i < s * 10; i++) o = stepBaro(b, map, gg);
  return o;
};

describe('baroreflex', () => {
  it('at the set point every effector is neutral', () => {
    const o = run(createBaro(90), 90, 30);
    expect(o.rrMs).toBeCloseTo(0, 9);
    expect(o.hrF).toBeCloseTo(1, 9);
    expect(o.svrF).toBeCloseTo(1, 9);
  });
  it('the vagal limb acts within ~2 s, the sympathetic limb takes > 10 s (delay 2.5 s, τ 10 s)', () => {
    const b = createBaro(90);
    const fast = run(b, 110, 2);
    expect(fast.rrMs).toBeGreaterThan(20);
    expect(fast.svrF).toBeGreaterThan(0.97);
    const slow = run(b, 110, 40);
    expect(slow.svrF).toBeLessThan(fast.svrF);
  });
  it('hypotension: HR, SVR and contractility rise, venous V0 falls; saturation caps each factor', () => {
    const o = run(createBaro(90), 10, 120);
    expect(o.hrF).toBeCloseTo(1 + SYMP_SAT, 9);
    expect(o.svrF).toBeCloseTo(1 + SYMP_SAT, 9);
    expect(o.dV0).toBeLessThan(-500);
    expect(o.rrMs).toBe(-200); // vagal withdrawal saturates
  });
  it('β-blockade removes most of the HR and contractility response but not SVR', () => {
    const a = run(createBaro(90), 70, 60);
    const b = run(createBaro(90), 70, 60, { ...g, betaBlock: 0.6 });
    expect(b.hrF - 1).toBeCloseTo((a.hrF - 1) * 0.4, 6);
    expect(b.svrF).toBeCloseTo(a.svrF, 9);
  });
  it('resetting: a 10 % offset held 420 s moves the set point 35 % of the way (A5); a pinned set point never moves', () => {
    const b = createBaro(100);
    run(b, 110, RESET_HOLD_S + 2);
    expect(b.set).toBeGreaterThan(103);
    expect(b.set).toBeLessThan(104);
    const c = createBaro(100);
    run(c, 110, RESET_HOLD_S + 2, { ...g, pinnedSet: true });
    expect(c.set).toBe(100);
  });
});
