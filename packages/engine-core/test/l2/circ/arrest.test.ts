// FU-4 G1/G3/G12 (Task 6): the arrest state machine's decisions — declaration (flow share, no flow, hazards), the onset
// draw (taken only when needed), and ROSC of an engine-declared organised arrest.
import { describe, expect, it } from 'vitest';
import { arrestStep, CPP_ROSC, K_ISCH_ARREST, MAP_NO_FLOW, M_ROSC, NO_FLOW_S, PEA_ASYSTOLE_MEAN_S, PEA_IDIO_M, PEA_IDIO_RATE, PEA_RATE_M_FULL, PEA_RATE_MIN, peaDecayStep, ROSC_HOLD_S, roscStep, vfShare } from '../../../src/l2/circ/arrest.ts';
import { P_ASYSTOLE_ONSET, P_VF_ONSET } from '../../../src/l2/circ/hypoxic-arrest.ts';
import { createCircModel } from '../../../src/l2/circ/model.ts';

const counter = (x = 0.5) => {
  const d = { n: 0, u: () => { d.n++; return x; } };
  return d;
};

describe('FU-4: arrest declaration', () => {
  it('a perfused heart with normal K and temperature takes no draw and requests nothing', () => {
    const m = createCircModel();
    const d = counter();
    for (let i = 0; i < 120; i++) expect(arrestStep(m, 'sinus', false, 75, d.u, 1)).toBeNull();
    expect(d.n).toBe(0);
  });
  it('flow share ≤ K_ISCH_ARREST (LV or RV): PEA on the running organised rhythm at its rate', () => {
    const m = createCircModel();
    m.cor.kIsch = K_ISCH_ARREST;
    expect(arrestStep(m, 'sinusTachy', false, 131.6, counter(0.9).u, 1)).toEqual({ id: 'sinusTachy', opts: { pulseless: true, rateBpm: 132 }, cause: 'lowFlow' });
    const r = createCircModel();
    r.cor.kIschRv = 0.05;
    expect(arrestStep(r, 'afib', false, 120, counter(0.9).u, 1)?.opts.pulseless).toBe(true);
  });
  it(`no flow: MAP below ${MAP_NO_FLOW} for ${NO_FLOW_S} s declares (MANUAL's route, kIsch floored at 0.2)`, () => {
    const m = createCircModel();
    m.mapNow = MAP_NO_FLOW - 1;
    m.cor.kIsch = 0.2;
    let req = null;
    let s = 0;
    for (; s < 120 && !req; s++) req = arrestStep(m, 'sinus', false, 80, counter(0.9).u, 1);
    expect(s).toBe(NO_FLOW_S);
  });
  it('onset draw: VF share 0.1 at no risk, rising with K, cold and catecholamines (capped 0.6); asystole 2/30', () => {
    expect(vfShare({ kEcg: 4.2, tempC: 37, cat: 0 })).toBeCloseTo(P_VF_ONSET, 9);
    expect(vfShare({ kEcg: 8, tempC: 37, cat: 0 })).toBeCloseTo(0.2, 9);
    expect(vfShare({ kEcg: 4.2, tempC: 37, cat: 10 })).toBe(0.6);
    const m = createCircModel();
    m.cor.kIsch = 0;
    expect(arrestStep(m, 'sinus', false, 60, counter(P_VF_ONSET - 1e-3).u, 1)?.id).toBe('vfCoarse');
    expect(arrestStep(m, 'sinus', false, 60, counter(P_VF_ONSET + P_ASYSTOLE_ONSET - 1e-3).u, 1)?.id).toBe('asystole');
  });
  it('hazards: K 9.5 (membrane-effective) and core 26 °C draw each second; VF or asystole', () => {
    const m = createCircModel();
    m.ext.kEcg = 9.5;
    const d = counter(0);
    expect(arrestStep(m, 'sinus', false, 70, d.u, 1)?.cause).toBe('hyperkalaemia');
    const c = createCircModel();
    c.ext.tempC = 26;
    expect(arrestStep(c, 'sinusBrady', false, 40, counter(0).u, 1)).toEqual({ id: 'vfCoarse', opts: {}, cause: 'hypothermia' });
  });
  it('no second declaration while pulseless or in VF/asystole', () => {
    const m = createCircModel();
    m.cor.kIsch = 0;
    expect(arrestStep(m, 'sinus', true, 40, counter().u, 1)).toBeNull();
    expect(arrestStep(m, 'vfCoarse', false, 0, counter().u, 1)).toBeNull();
  });
});

describe('FU-4: ROSC of an engine-declared PEA', () => {
  it(`needs CPP ≥ ${CPP_ROSC} and kIsch·(1 − hyp) ≥ ${M_ROSC} held ${ROSC_HOLD_S} s; then the same rhythm with a pulse`, () => {
    const m = createCircModel();
    m.arrest = { cause: 'lowFlow', t: 0, from: 'sinus', roscS: 0, rate0: 60, rateNow: 60 };
    m.cor.kIsch = 0.5;
    expect(roscStep(m, 'sinus', true, CPP_ROSC - 1, 1)).toBeNull();
    let back = null;
    let s = 0;
    for (; s < 120 && !back; s++) back = roscStep(m, 'sinus', true, 25, 1);
    expect(s).toBe(ROSC_HOLD_S);
    expect(back).toEqual({ id: 'sinus', opts: {} });
    expect(m.arrest).toBeNull();
  });
  it('VF waits for a shock; a pulse returned another way clears the record', () => {
    const m = createCircModel();
    m.arrest = { cause: 'hyperkalaemia', t: 0, from: 'sinus', roscS: 0, rate0: 60, rateNow: 60 };
    m.cor.kIsch = 1;
    for (let i = 0; i < 120; i++) expect(roscStep(m, 'vfCoarse', false, 40, 1)).toBeNull();
    expect(roscStep(m, 'sinus', false, 40, 1)).toBeNull();
    expect(m.arrest).toBeNull();
  });
});

describe('FU-4 F5: the PEA decays', () => {
  const pea = (ms: number, rate0 = 60, rateNow = 60) => {
    const m = createCircModel();
    m.arrest = { cause: 'lowFlow', t: 0, from: 'sinus', roscS: 0, rate0, rateNow };
    m.cor.kIsch = ms;
    m.cor.hyp = 0;
    return m;
  };
  it('the rate follows kIsch·(1 − hyp) below PEA_RATE_M_FULL and never goes below PEA_RATE_MIN', () => {
    const u = () => 0.99;
    expect(peaDecayStep(pea(PEA_RATE_M_FULL), 'sinus', true, 0, u, 1)).toBeNull(); // full state: the onset rate
    const half = peaDecayStep(pea(PEA_RATE_M_FULL / 2), 'sinus', true, 0, u, 1);
    expect(half?.id).toBe('sinus');
    expect(half?.opts).toEqual({ pulseless: true, rateBpm: 30 });
    const low = peaDecayStep(pea(0.05), 'sinus', true, 0, u, 1);
    expect(low?.opts.rateBpm).toBe(PEA_RATE_MIN);
  });
  it(`below PEA_IDIO_M the rhythm becomes a pulseless idioventricular (agonal) one at ${PEA_IDIO_RATE}/min`, () => {
    const r = peaDecayStep(pea(PEA_IDIO_M / 2), 'sinus', true, 0, () => 0.99, 1);
    expect(r).toEqual({ id: 'agonal', opts: { pulseless: true, rateBpm: PEA_IDIO_RATE }, cause: 'lowFlow' });
  });
  it('from agonal, asystole is a hazard with mean PEA_ASYSTOLE_MEAN_S', () => {
    const m = pea(0);
    expect(peaDecayStep(m, 'agonal', true, 0, () => 0.5 / PEA_ASYSTOLE_MEAN_S, 1)?.id).toBe('asystole');
    expect(peaDecayStep(m, 'agonal', true, 0, () => 2 / PEA_ASYSTOLE_MEAN_S, 1)).toBeNull();
  });
  it('an effective CPP (≥ CPP_ROSC) suspends the decay at every stage', () => {
    expect(peaDecayStep(pea(0.1), 'sinus', true, CPP_ROSC, () => 0, 1)).toBeNull();
    expect(peaDecayStep(pea(0), 'agonal', true, CPP_ROSC, () => 0, 1)).toBeNull();
  });
  it('roscStep from the idioventricular phase returns the rhythm the PEA decayed from', () => {
    const m = pea(1);
    let back = null;
    for (let i = 0; i < ROSC_HOLD_S + 1 && !back; i++) back = roscStep(m, 'agonal', true, CPP_ROSC + 5, 1);
    expect(back).toEqual({ id: 'sinus', opts: {} });
    expect(m.arrest).toBeNull();
  });
});
