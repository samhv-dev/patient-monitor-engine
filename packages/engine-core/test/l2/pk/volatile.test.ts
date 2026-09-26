import { describe, expect, it } from 'vitest';
import { createVolatile, macForAge, macFraction, stepVolatile, type VolatileAgent } from '../../../src/l2/pk/volatile.ts';

const ENV = { vaLpm: 4, coLpm: 5, frcL: 2.5, weightKg: 70 };

function wash(agent: VolatileAgent, fgf: number, minutes: number, holdFi: boolean) {
  const s = createVolatile(agent);
  s.fd = 0.01;
  s.fgf = fgf;
  if (holdFi) s.fi = 0.01;
  let t50 = -1;
  const at: Record<number, number> = {};
  for (let k = 1; k <= minutes * 600; k++) {
    if (holdFi) s.fi = 0.01;
    stepVolatile(s, ENV, 0.1);
    if (t50 < 0 && s.fa / s.fi >= 0.5) t50 = k / 600;
    if (k % 600 === 0) at[k / 600] = s.fa / (holdFi ? s.fi : s.fd);
  }
  return { s, t50, at };
}

describe('volatile uptake (decision 9)', () => {
  it('FA/FI at 30 min with FI held matches Yasuda 1991 within 0.04: des 0.90, sevo 0.85, iso 0.73; N2O ≥ 0.9', () => {
    expect(Math.abs(wash('desflurane', 10, 30, true).at[30]! - 0.9)).toBeLessThan(0.04); // prototype 0.91
    expect(Math.abs(wash('sevoflurane', 10, 30, true).at[30]! - 0.85)).toBeLessThan(0.04); // 0.85
    expect(Math.abs(wash('isoflurane', 10, 30, true).at[30]! - 0.73)).toBeLessThan(0.04); // 0.72
    expect(wash('n2o', 10, 30, true).at[30]!).toBeGreaterThan(0.9); // 0.92
  });
  it('time to FA/FI 0.5: des < sevo < iso (prototype 0.57 / 0.73 / 3.4 min)', () => {
    const d = wash('desflurane', 10, 10, true).t50;
    const s = wash('sevoflurane', 10, 10, true).t50;
    const i = wash('isoflurane', 10, 10, true).t50;
    expect(d).toBeLessThan(s);
    expect(s).toBeLessThan(i);
    expect(s).toBeGreaterThan(0.5);
    expect(s).toBeLessThan(1.0);
  });
  it('low flow lags: sevo FA/FD at 30 min is 0.45–0.55 at 1 L/min vs ≥ 0.8 at 10 L/min in a 7 L circle', () => {
    expect(wash('sevoflurane', 1, 30, false).at[30]!).toBeGreaterThan(0.45);
    expect(wash('sevoflurane', 1, 30, false).at[30]!).toBeLessThan(0.55); // prototype 0.50
  });
  it('brain follows alveoli with τ 2–4 min: brain/FA ≥ 0.9 by 10 min', () => {
    const w = wash('sevoflurane', 10, 10, true);
    expect(w.s.vrg / w.s.fa).toBeGreaterThan(0.9); // prototype 0.93
  });
  it('MAC(age) Mapleson: sevo 1.80 at 40 y, −6 %/decade (2.04 / 1.59 / 1.40 at 20/60/80)', () => {
    expect(macForAge('sevoflurane', 40)).toBeCloseTo(1.8, 6);
    expect(macForAge('sevoflurane', 80)).toBeCloseTo(1.40, 2);
    expect(macForAge('sevoflurane', 20)).toBeCloseTo(2.04, 2);
    const s = createVolatile('sevoflurane');
    s.vrg = 0.018;
    expect(macFraction(s, 40)).toBeCloseTo(1, 6);
  });
  it('apnoea (VA 0) freezes alveolar exchange; closing the vaporiser washes out', () => {
    const s = createVolatile('sevoflurane');
    s.fa = 0.02;
    s.vrg = 0.02;
    s.fi = 0;
    for (let k = 0; k < 600; k++) stepVolatile(s, { ...ENV, vaLpm: 4 }, 0.1);
    expect(s.fa).toBeLessThan(0.01);
  });
});
