import { describe, expect, it } from 'vitest';
import { lungRig, runRig } from '../helpers/lung.ts';
import { respOf } from '../helpers/lung.ts';
import { ev3, rig3 } from '../helpers/resp.ts';
import { LONGRUN_HOURS } from '../helpers/longrun.ts';

describe('lung module: determinism, CPU, 24 h', { timeout: 600_000 }, () => {
  it('the same seed and script give identical lung state; snapshot → restore → identical continuation', () => {
    const go = () => {
      const r = rig3({ seed: 11, patient: { lungConditions: [{ id: 'copd', severity: 0.75 }, { id: 'pneumonia', severity: 0.4, side: 'R' }] } });
      r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 500, peep: 5, ie: 2, fio2: 0.5 }));
      r.e.advanceTo(120);
      return r;
    };
    const a = go();
    const b = go();
    expect(JSON.stringify(respOf(a.e).lung)).toBe(JSON.stringify(respOf(b.e).lung));
    const snap = a.e.snapshot();
    a.e.advanceTo(180);
    b.e.restore(snap);
    b.e.advanceTo(180);
    expect(JSON.stringify(respOf(b.e).lung)).toBe(JSON.stringify(respOf(a.e).lung));
  });
  it('CPU: the lung module costs ≤ 0.1 ms per 20 ms tick (stand-alone, COPD, 1 h)', () => {
    const r = lungRig([{ id: 'copd', severity: 0.75 }], { vt: 490, rr: 14, peep: 5, ie: 2, fio2: 0.4 });
    runRig(r, 60);
    const t0 = performance.now();
    runRig(r, 3600);
    const perTick = (performance.now() - t0) / (3600 / 0.02);
    console.log(`lung module: ${perTick.toFixed(4)} ms per tick`);
    expect(perTick).toBeLessThan(0.1);
  });
  it(`${LONGRUN_HOURS} h ventilated ARDS: no drift (volumes, stores and PaCO2 bounded), yielding per sim-minute (24 h locally, 6 h on CI)`, async () => {
    const r = rig3({ patient: { lungConditions: [{ id: 'ards', severity: 0.5 }] } });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 18, vtMl: 450, peep: 8, ie: 2, fio2: 0.5 }));
    let first = NaN;
    for (let m = 1; m <= LONGRUN_HOURS * 60; m++) {
      r.e.advanceTo(60 * m);
      if (m === 60) first = respOf(r.e).co2.pf;
      await new Promise((res) => setImmediate(res));
    }
    const rs = respOf(r.e);
    for (const v of rs.lung.mech.v) expect(Math.abs(v)).toBeLessThan(3000);
    expect(Math.abs(rs.co2.pf - first)).toBeLessThan(1);
    expect(rs.lung.o2.fa.every((f) => f > 0.1 && f < 1)).toBe(true);
  });
});
