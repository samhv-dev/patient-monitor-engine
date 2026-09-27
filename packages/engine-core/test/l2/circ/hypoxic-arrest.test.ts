// FU-3 item 16 unit tests: the O2 content in the coronary supply (coronary.ts) and the arrest request
// (hypoxic-arrest.ts). The engine sequence and its bands are test/engine/circ-hypoxic-arrest.test.ts.
import { describe, expect, it } from 'vitest';
import { createCoronary, stepCoronary, TAU_HYP_S } from '../../../src/l2/circ/coronary.ts';
import { HYP_ARREST, hypoxicArrestRequest, P_ASYSTOLE_ONSET, P_VF_ONSET } from '../../../src/l2/circ/hypoxic-arrest.ts';
import { createCircModel, type CircBeat } from '../../../src/l2/circ/model.ts';

const ref = { hr: 70, sbp: 120, dbp: 80, map: 93, cvp: 5, lvedv: 125, lvedp: 9, lvsp: 118, sv: 80, co: 5.6, pcwp: 7 };
const beat = (o: Partial<CircBeat> = {}): CircBeat => ({
  t: 0, sbp: 120, dbp: 80, map: 93, aoSys: 115, aoDia: 80, sv: 80, svRv: 80, lvedv: 125, lvesv: 50, lvedp: 9, lvsp: 118,
  avOpen: 0.08, avClose: 0.37, dur: 60 / 70, ...o,
});

describe('FU-3 item 16: hypoxaemic myocardial depression', () => {
  it('o2Rel defaults to 1: the R23 flow-only supply and no hypoxic depression (MANUAL path unchanged)', () => {
    const a = createCoronary(ref);
    const b = createCoronary(ref);
    for (let i = 0; i < 60; i++) {
      stepCoronary(a, [beat()], 3.5, 1, 70);
      stepCoronary(b, [beat()], 3.5, 1, 70, 1);
    }
    expect(a.ratio).toBeCloseTo(b.ratio, 12);
    expect(a.hyp).toBe(0);
  });
  it('normoxic hypotensive ischaemia is not hypoxic: hyp stays 0 while kIsch falls', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 120; i++) stepCoronary(c, [beat({ aoDia: 45, dbp: 45, lvedp: 25, lvsp: 140 })], 1.4, 1, 72);
    expect(c.kIsch).toBeLessThan(0.85);
    expect(c.hyp).toBe(0);
  });
  it('the flow reserve covers a moderate desaturation (SaO2 50 %: supply 3.5 × 0.52 > demand) — no depression', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 120; i++) stepCoronary(c, [beat()], 3.5, 1, 70, 0.5 / 0.97);
    expect(c.delta).toBe(0);
    expect(c.hyp).toBe(0);
  });
  it('anoxaemia (o2Rel 0) drives hyp to 1 with τ TAU_HYP_S; reoxygenation clears it with τ 60 s', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < TAU_HYP_S; i++) stepCoronary(c, [beat()], 3.5, 1, 70, 0);
    expect(c.hyp).toBeGreaterThan(0.6); // 1 − e^−1
    expect(c.hyp).toBeLessThan(0.66);
    for (let i = 0; i < 300; i++) stepCoronary(c, [beat()], 3.5, 1, 70, 1);
    expect(c.hyp).toBeLessThan(0.01);
  });
});

describe('FU-3 item 16: the arrest request', () => {
  const at = (hyp: number) => {
    const m = createCircModel();
    m.cor.hyp = hyp;
    return m;
  };
  it('nothing below HYP_ARREST, on a pulseless or non-sinus rhythm, and no draw is taken', () => {
    let draws = 0;
    const u = () => { draws++; return 0.5; };
    expect(hypoxicArrestRequest(at(HYP_ARREST - 0.01), 'sinus', false, 30, u)).toBeNull();
    expect(hypoxicArrestRequest(at(0.99), 'sinus', true, 30, u)).toBeNull();
    expect(hypoxicArrestRequest(at(0.99), 'afib', false, 30, u)).toBeNull();
    expect(draws).toBe(0);
  });
  it('onset rhythm by one uniform draw: VF, asystole, else the organised rhythm pulseless at the current rate', () => {
    expect(hypoxicArrestRequest(at(0.95), 'sinus', false, 30, () => P_VF_ONSET / 2)?.id).toBe('vfCoarse');
    expect(hypoxicArrestRequest(at(0.95), 'sinus', false, 30, () => P_VF_ONSET + P_ASYSTOLE_ONSET / 2)?.id).toBe('asystole');
    expect(hypoxicArrestRequest(at(0.95), 'sinusBrady', false, 30.4, () => 0.9)).toEqual({ id: 'sinusBrady', opts: { pulseless: true, rateBpm: 30 } });
  });
});
