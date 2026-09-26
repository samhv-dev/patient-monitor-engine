import { describe, expect, it } from 'vitest';
import { createO2Lung, stepO2Lung, type O2LungInputs } from '../../../src/l2/lung/mix-o2.ts';

const base: O2LungInputs = {
  va: 4.2, vent: [0.45, 0, 0.55, 0], perf: [2.2, 0, 2.7, 0], vdAlv: [0.075, 0.075, 0.075, 0.075], qLow: [0.05, 0.05], qShunt: 0.1,
  fio2: 0.4, massFlowFio2: null, blocked: [false, false], vo2: 210, paco2: 40, pA: [40, 40, 40, 40], tempC: 37,
  frcSide: [630, 770], bloodL: 4.9, dl: [1, 1], coRatio: 1,
};
const settle = (x: O2LungInputs, s = 600) => {
  const st = createO2Lung(0.5, 150);
  for (let t = 0; t < s; t += 0.1) stepO2Lung(st, x, 0.1);
  return st;
};

describe('O2 mixing point, two stores (R43; tables §4.1, §4.5)', () => {
  it('healthy on FiO2 0.4: SaO2 > 0.99, both stores alike', () => {
    const st = settle(base);
    expect(st.sa).toBeGreaterThan(0.99);
    expect(Math.abs((st.fa[0] as number) - (st.fa[1] as number))).toBeLessThan(0.01);
  });
  it('true shunt is FiO2-resistant, low V/Q is FiO2-responsive', () => {
    const shunt = (f: number) => settle({ ...base, fio2: f, qShunt: 1.5 }).pao2;
    const lowvq = (f: number) => settle({ ...base, fio2: f, qLow: [0.75, 0.75] }).pao2;
    expect(lowvq(1) / lowvq(0.3)).toBeGreaterThan(shunt(1) / shunt(0.3));
  });
  it('a blocked lung keeps oxygenating its blood until its store is spent', () => {
    const st = settle(base);
    const x = { ...base, fio2: 0.5, blocked: [true, false], vent: [0, 0, 1, 0] };
    const fa0 = st.fa[0] as number;
    for (let t = 0; t < 60; t += 0.1) stepO2Lung(st, x, 0.1);
    expect(st.fa[0]).toBeLessThan(fa0);
    expect(st.sa).toBeGreaterThan(0.95);
  });
});
