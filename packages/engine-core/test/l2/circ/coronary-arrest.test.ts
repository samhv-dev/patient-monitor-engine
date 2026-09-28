// FU-4 G1/G4 (Task 4): the coronary step as the myocardial state of the arrest machine — the flow share has no floor in
// MODELED (R23's 0.2 stays in MANUAL), CPP is taken on the absolute LV end-diastolic pressure, the demand keeps basal
// and excitation–contraction shares, and with no beat to read it uses the continuous CPP and loses contractility slowly.
import { describe, expect, it } from 'vitest';
import { createCoronary, D_BASAL, D_EC, K_ISCH_MIN_MANUAL, stepCoronary, TAU_ISCH_ARREST_S } from '../../../src/l2/circ/coronary.ts';
import type { CircBeat } from '../../../src/l2/circ/model.ts';

const ref = { hr: 70, sbp: 120, dbp: 80, map: 93, cvp: 5, lvedv: 125, lvedp: 9, lvsp: 118, sv: 80, co: 5.6, pcwp: 7 };
const beat = (o: Partial<CircBeat> = {}): CircBeat => ({
  t: 0, sbp: 120, dbp: 80, map: 93, aoSys: 115, aoDia: 80, sv: 80, svRv: 80, lvedv: 125, lvesv: 50, lvedp: 9, lvsp: 118,
  avOpen: 0.08, avClose: 0.37, dur: 60 / 70, pItEd: -4, ...o,
});
/** Class IV haemorrhage at the audit's C4 nadir: DBP 20, HR 186, LVSP 25, LVEDV 30. */
const shock = beat({ aoDia: 20, dbp: 20, map: 22, lvsp: 25, lvedv: 30, lvedp: 1, avClose: 0.2 });

describe('FU-4 G1: coronary myocardial state', () => {
  it('rest is unchanged: ratio ≈ CFR, kIsch 1 (the absolute basis cancels at the resting pleural pressure)', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 60; i++) stepCoronary(c, [beat()], 3.5, 1, 70);
    expect(c.ratio).toBeCloseTo(3.5, 1);
    expect(c.kIsch).toBe(1);
  });
  it('MODELED: class IV shock drives kIsch through 0.1 within 90 s (no floor); MANUAL (R23 balance) parks at 0.2', () => {
    const m = createCoronary(ref);
    const n = createCoronary(ref);
    let tCross = -1;
    for (let i = 1; i <= 180; i++) {
      stepCoronary(m, [shock], 3.5, 1, 186);
      stepCoronary(n, [shock], 3.5, 1, 186, 1, undefined, false);
      if (tCross < 0 && m.kIsch <= 0.1) tCross = i;
    }
    expect(tCross).toBeGreaterThan(0);
    expect(tCross).toBeLessThanOrEqual(90);
    expect(n.kIsch).toBeCloseTo(K_ISCH_MIN_MANUAL, 2);
  });
  it('the basal and E–C shares make a fast, empty, low-pressure heart ischaemic (demand ≥ 0.35 of rest)', () => {
    const c = createCoronary(ref);
    stepCoronary(c, [shock], 3.5, 1, 186);
    expect(D_BASAL + D_EC).toBeCloseTo(0.35, 6);
    expect(c.ratio).toBeLessThan(0.5);
  });
  it('PEEP/tension PTX: the pleural pressure at end-diastole lowers CPP one for one (absolute LVEDP)', () => {
    const a = createCoronary(ref);
    const b = createCoronary(ref);
    stepCoronary(a, [beat({ aoDia: 45, dbp: 45 })], 3.5, 1, 90);
    stepCoronary(b, [beat({ aoDia: 45, dbp: 45, pItEd: 16 })], 3.5, 1, 90);
    expect(a.cpp - b.cpp).toBeCloseTo(20, 6);
  });
  it('no beat: the continuous CPP is used, demand DEMAND_ARREST, and the loss runs at τ TAU_ISCH_ARREST_S', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < TAU_ISCH_ARREST_S; i++) stepCoronary(c, [beat()], 3.5, 1, 70, 1, { cpp: 3, dtf: 1 });
    expect(c.cpp).toBe(3);
    expect(c.kIsch).toBeGreaterThan(0.36); // e^−1 of the way to 0
    expect(c.kIsch).toBeLessThan(0.38);
    // CPR relaxation CPP 30 over half the cycle recovers it (supply > DEMAND_ARREST)
    for (let i = 0; i < 180; i++) stepCoronary(c, [], 3.5, 1, 70, 1, { cpp: 30, dtf: 0.5 });
    expect(c.ratio).toBeGreaterThan(1); // supply > DEMAND_ARREST
    expect(c.kIsch).toBeGreaterThan(0.9);
  });
});
