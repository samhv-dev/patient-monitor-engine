import { describe, expect, it } from 'vitest';
import { capnoTerms } from '../../../src/l2/lung/lung.ts';
import { lungRig, rigOut, runRig } from '../../helpers/lung.ts';

const V = { vt: 490, rr: 14, peep: 5, ie: 2, fio2: 0.4 };
describe('lung module, stand-alone rig (prototype numbers)', { timeout: 300_000 }, () => {
  it('healthy: gap 3, SpO2 ≥ 99 % on FiO2 0.4, no auto-PEEP', () => {
    const r = lungRig([], V);
    runRig(r, 300);
    const o = rigOut(r);
    expect(o.gap).toBeGreaterThan(2.5);
    expect(o.gap).toBeLessThan(3.8);
    expect(o.spo2).toBeGreaterThan(99);
    expect(o.peepTot).toBeCloseTo(5, 0);
    expect(capnoTerms(r.ls).tauII).toBeLessThan(0.01);
  });
  it('COPD GOLD 3: gap 5–15, capnogram τ term 0.15–0.3 s', () => {
    const r = lungRig([{ id: 'copd', severity: 0.75 }], { ...V, vt: 560 });
    runRig(r, 600);
    const o = rigOut(r);
    expect(o.gap).toBeGreaterThan(5);
    expect(o.gap).toBeLessThan(15);
    expect(capnoTerms(r.ls).tauII).toBeGreaterThan(0.15);
    expect(capnoTerms(r.ls).tauII).toBeLessThanOrEqual(0.3);
  });
  it('OLV at FiO2 0.5: SpO2 nadir 88–96 % within 4–12 min, then ≥ 1 % recovery by 60 min; flow to the isolated lung ≤ 0.3', () => {
    const r = lungRig([{ id: 'olv', severity: 1 }], { ...V, fio2: 0.5 });
    r.ls.mainstem = 'both';
    runRig(r, 600);
    r.ls.mainstem = 'right';
    r.vent.vt = 350;
    let nadir = 101;
    let tN = 0;
    for (let m = 0; m < 60; m++) runRig(r, 60, (x) => { const s = x.ls.o2.sa * 100; if (s < nadir) { nadir = s; tN = x.t - 600; } });
    expect(nadir).toBeGreaterThan(88);
    expect(nadir).toBeLessThan(96);
    expect(tN / 60).toBeGreaterThan(4);
    expect(tN / 60).toBeLessThan(12);
    expect(rigOut(r).spo2 - nadir).toBeGreaterThan(1);
    expect(rigOut(r).fL).toBeLessThan(0.3);
  });
});
