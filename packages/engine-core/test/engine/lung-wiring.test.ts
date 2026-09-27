import { describe, expect, it } from 'vitest';
import { respOf as resp } from '../helpers/lung.ts';
import { ev3, rig3 } from '../helpers/resp.ts';

const vent = { kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 490, peep: 5, ie: 2, fio2: 0.4 };

describe('Stage 7b wiring I: the breath driver drives the lung module', { timeout: 300_000 }, () => {
  it('ventilated healthy adult: unit tidal volumes sum to VT, 45 % left, static compliance ≈ 55', () => {
    const r = rig3({ patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' } });
    r.e.dispatch(ev3(vent));
    r.e.advanceTo(60);
    const ls = resp(r.e).lung;
    const vt = ls.tidal.reduce((a, b) => a + b, 0);
    expect(vt).toBeGreaterThan(440);
    expect(vt).toBeLessThan(540);
    expect((ls.tidal[0] as number) / vt).toBeCloseTo(0.45, 1);
    expect(ls.peepTot).toBeCloseTo(5, 0);
  });
  it('a COPD patient stamps the cycles with a long expiratory τ', () => {
    const r = rig3({ patient: { ageY: 60, weightKg: 70, heightCm: 175, sex: 'M', lungConditions: [{ id: 'copd', severity: 0.75 }] } });
    r.e.dispatch(ev3({ ...vent, vtMl: 560 }));
    r.e.advanceTo(90);
    const d = resp(r.e).driver;
    const last = d.cycles[d.cycles.length - 1]!;
    expect(last.tauE ?? 0).toBeGreaterThan(1.5);
    expect(last.lungTauII ?? 0).toBeGreaterThan(0.1);
  });
  it('the state stays JSON-safe', () => {
    const r = rig3();
    r.e.dispatch(ev3(vent));
    r.e.advanceTo(20);
    const ls = resp(r.e).lung;
    expect(JSON.parse(JSON.stringify(ls))).toEqual(ls);
  });
});
