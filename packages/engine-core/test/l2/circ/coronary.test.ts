import { describe, expect, it } from 'vitest';
import { createCoronary, stepCoronary, stPatchOf, P_ZF } from '../../../src/l2/circ/coronary.ts';
import type { CircBeat } from '../../../src/l2/circ/model.ts';

const ref = { hr: 70, sbp: 120, dbp: 80, map: 93, cvp: 5, lvedv: 125, lvedp: 9, lvsp: 118, sv: 80, co: 5.6, pcwp: 7 };
const beat = (o: Partial<CircBeat>): CircBeat => ({
  t: 0, sbp: 120, dbp: 80, map: 93, aoSys: 115, aoDia: 80, sv: 80, svRv: 80, lvedv: 125, lvesv: 50, lvedp: 9, lvsp: 118,
  avOpen: 0.08, avClose: 0.37, dur: 60 / 70, ...o,
});

describe('coronary supply/demand (R23, tables §3)', () => {
  it('at rest the supply/demand ratio equals the CFR (normal 3.5): no ischaemia', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 60; i++) stepCoronary(c, [beat({})], 3.5, 1, 70);
    expect(c.ratio).toBeCloseTo(3.5, 1);
    expect(c.kIsch).toBe(1);
    expect(stPatchOf(c)).toBeNull();
  });
  it('AS + 3-vessel CAD (CFR 1.4) after induction (DBP 45, LVEDP 25, HR 72): deficit > 0.1, contractility falls (τ 20 s), ST depression appears after the lag', () => {
    const c = createCoronary(ref);
    const low = beat({ aoDia: 45, dbp: 45, lvedp: 25, lvsp: 140 });
    for (let i = 0; i < 120; i++) stepCoronary(c, [low], 1.4, 1, 72);
    expect(c.delta).toBeGreaterThan(0.1);
    expect(c.kIsch).toBeLessThan(0.85);
    expect(stPatchOf(c)?.ischaemicDepressionMv ?? 0).toBeLessThanOrEqual(-0.05);
    // rescue: back to rest pressures → kIsch recovers with τ 60 s, ST clears
    for (let i = 0; i < 240; i++) stepCoronary(c, [beat({})], 1.4, 1, 64);
    expect(c.kIsch).toBeGreaterThan(0.97);
    expect(stPatchOf(c)).toBeNull();
    expect(P_ZF).toBe(15);
  });
});
