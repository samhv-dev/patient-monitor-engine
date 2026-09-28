// FU-4 G5 (Task 5): the RV's own coronary balance — perfused through systole and diastole (MAP − RV mean pressure),
// demand from RV pressure work; `kIschRv` multiplies RV contractility (MODELED only).
import { describe, expect, it } from 'vitest';
import { createCoronary, stepCoronary } from '../../../src/l2/circ/coronary.ts';
import type { CircBeat } from '../../../src/l2/circ/model.ts';

const ref = { hr: 70, sbp: 120, dbp: 80, map: 93, cvp: 5, lvedv: 125, lvedp: 9, lvsp: 118, sv: 80, co: 5.6, pcwp: 7 };
const beat = (o: Partial<CircBeat> = {}): CircBeat => ({
  t: 0, sbp: 120, dbp: 80, map: 93, aoSys: 115, aoDia: 80, sv: 80, svRv: 80, lvedv: 125, lvesv: 50, lvedp: 9, lvsp: 118,
  avOpen: 0.08, avClose: 0.37, dur: 60 / 70, pItEd: -4, rvsp: 25, rvMean: 10, ...o,
});

describe('FU-4 G5: RV coronary balance', () => {
  it('the first beat is the reference; at rest kIschRv stays 1', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 60; i++) stepCoronary(c, [beat()], 3.5, 1, 70);
    expect(c.rv0).toEqual({ perf: 83, rvsp: 25 });
    expect(c.kIschRv).toBe(1);
  });
  it('massive PE shape (RVSP 60, RV mean 32, MAP 55, HR 130): RV ischaemia while the LV is still perfused', () => {
    const c = createCoronary(ref);
    stepCoronary(c, [beat()], 3.5, 1, 70);
    const pe = beat({ map: 55, aoDia: 48, dbp: 48, lvsp: 70, lvedv: 70, lvedp: 6, avClose: 0.25, rvsp: 60, rvMean: 32 });
    for (let i = 0; i < 120; i++) stepCoronary(c, [pe], 3.5, 1, 130);
    expect(c.kIschRv).toBeLessThan(0.5);
    expect(c.kIsch).toBeGreaterThan(0.9);
  });
  it('MANUAL (modeled = false) never moves kIschRv', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 120; i++) stepCoronary(c, [beat({ map: 55, rvsp: 60, rvMean: 32 })], 3.5, 1, 130, 1, undefined, false);
    expect(c.kIschRv).toBe(1);
    expect(c.rv0).toBeNull();
  });
});
