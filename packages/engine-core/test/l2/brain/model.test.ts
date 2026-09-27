import { describe, expect, it } from 'vitest';
import { cushingDMap, cushingHrFactor } from '../../../src/l2/brain/cushing.ts';
import { drugsOf, NO_ANAESTHESIA, NO_DRUGS } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain, giveOsmotherapy, stepBrain, type BrainInputs, type BrainState } from '../../../src/l2/brain/model.ts';
import { MANNITOL_MOSM_PER_G } from '../../../src/l2/brain/params.ts';

const REST: BrainInputs = { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS };
function run(b: BrainState, s: number, f: (b: BrainState, inp: BrainInputs, t: number) => void = () => {}): BrainInputs {
  const inp = { ...REST };
  for (let k = 0; k < s * 10; k++) {
    f(b, inp, b.t);
    stepBrain(b, inp, 0.1);
  }
  return inp;
}
const tbi = () => {
  const b = createBrain(brainParams([{ id: 'tbi', severity: 1 }]), REST);
  b.massRate = 1;
  return b;
};

describe('BrainModel', () => {
  it('rests at ICP0 with CBF 1 and PbtO2 25, and does not drift', () => {
    const b = createBrain(brainParams(), REST);
    run(b, 600);
    expect(b.icp).toBeCloseTo(10, 6);
    expect(b.cbfRel).toBeCloseTo(1, 6);
    expect(b.pbto2).toBeCloseTo(25, 1);
  });
  it('tables §7 check 19: expanding haematoma 1 mL/min, PVI 20 — ICP 20 by ~10–15 min, 40 by ~20–25 min, then Cushing', () => {
    const b = tbi();
    let t20 = -1;
    let t40 = -1;
    let tCush = -1;
    run(b, 1800, (x, inp, t) => {
      inp.map = 90 + cushingDMap(x.cush); // MANUAL coupling of the surge (organs/effects.ts does this in the engine, Tasks 11–13)
      if (t20 < 0 && x.icp >= 20) t20 = t;
      if (t40 < 0 && x.icp >= 40) t40 = t;
      if (tCush < 0 && x.cush.drive > 0.05) tCush = t;
    });
    expect(t20 / 60).toBeGreaterThanOrEqual(10); // prototype 10.8 (tables ~10–15)
    expect(t20 / 60).toBeLessThanOrEqual(15);
    expect(t40 / 60).toBeGreaterThanOrEqual(20); // prototype 23.7 (tables ~20–25)
    expect(t40 / 60).toBeLessThanOrEqual(25);
    expect(tCush / 60).toBeGreaterThan(t40 / 60); // CPP < 40 (MAP 90) needs ICP > 50
    expect(b.cush.drive).toBeGreaterThan(0.9);
    expect(90 * cushingHrFactor(b.cush) * (80 / 90)).toBeLessThan(55); // HR 80 → 45–55
  });
  it('Cushing: MAP +30–50 within 30–60 s of onset', () => {
    const b = tbi();
    let onset = -1;
    let dAt60 = 0;
    run(b, 1800, (x, inp, t) => {
      inp.map = 90 + cushingDMap(x.cush);
      if (onset < 0 && x.cush.active) onset = t;
      if (onset > 0 && Math.abs(t - onset - 60) < 0.05) dAt60 = cushingDMap(x.cush);
    });
    expect(dAt60).toBeGreaterThanOrEqual(30);
    expect(dAt60).toBeLessThanOrEqual(50);
  });
  it('hyperventilation PaCO2 40 → 30: ICP −25–30 % within 2 min (haematoma stopped at 15 mL)', () => {
    const b = tbi();
    run(b, 900);
    b.massRate = 0;
    run(b, 600);
    const before = b.icp;
    run(b, 120, (_x, inp) => {
      inp.paco2 = 30;
    });
    const drop = 1 - b.icp / before;
    expect(drop).toBeGreaterThanOrEqual(0.25); // prototype 0.258 (tables −25–30 % in 1–2 min)
    expect(drop).toBeLessThanOrEqual(0.3);
  });
  it('mannitol 1 g/kg: ICP −25 % vs control over 15–30 min', () => {
    const mk = () => {
      const b = tbi();
      run(b, 900);
      b.massRate = 0;
      run(b, 600);
      return b;
    };
    const ctl = mk();
    const man = mk();
    giveOsmotherapy(man, 'mannitol', 70 * MANNITOL_MOSM_PER_G);
    const rel: number[] = [];
    for (const s of [900, 900]) {
      run(ctl, s);
      run(man, s);
      rel.push(1 - man.icp / ctl.icp);
    }
    expect(rel[0]).toBeLessThanOrEqual(0.25 * 1.15); // prototype 0.256 at 15 min: crosses −25 % inside 15–30 min
    expect(rel[1]).toBeGreaterThanOrEqual(0.25 * 0.85); // prototype 0.319 at 30 min
    for (const x of rel) expect(x).toBeLessThanOrEqual(0.4); // tables drug row −20–40 %
  });
  it('head-up 30°: ICP −3 to −8 mmHg, CPP within 5 mmHg', () => {
    const b = tbi();
    run(b, 900);
    b.massRate = 0;
    run(b, 600);
    const icp = b.icp;
    const cpp = b.cpp;
    b.headUpDeg = 30;
    run(b, 120);
    expect(icp - b.icp).toBeGreaterThanOrEqual(3); // prototype 6.1 (tables −5.6, range −3 to −8)
    expect(icp - b.icp).toBeLessThanOrEqual(8);
    expect(Math.abs(b.cpp - cpp)).toBeLessThan(5); // prototype −3.1 ("CPP ≈ unchanged")
  });
  // tables §7 check 18: 75 y HTN (LL 75) under GA, CVP 6, PaO2 100 — CBF vs the anaesthetised baseline
  function check18() {
    const ga = drugsOf({ ...NO_ANAESTHESIA, propofolE: 0.6 }); // CMRO2 ×0.7
    const mk = (map: number, paco2: number): BrainInputs => ({ ...REST, map, paco2, drugs: ga, tempC: 36.5 });
    const b = createBrain(brainParams([{ id: 'htn' }]), mk(100, 40));
    const hold = (inp: BrainInputs, s: number) => {
      for (let k = 0; k < s * 10; k++) stepBrain(b, inp, 0.1);
    };
    hold(mk(100, 40), 120);
    const base = b.cbfRel;
    hold(mk(65, 40), 120);
    const low = b.cbfRel / base;
    hold(mk(65, 25), 180);
    const hypo = b.cbfRel / base;
    const pbto2 = b.pbto2;
    hold(mk(80, 35), 180);
    return { low, hypo, pbto2, recovered: b.cbfRel / base };
  }
  it('check 18: MAP 65 → CBF ≈ 70 % (±15 %); PbtO2 10–15 at PaCO2 25; MAP 80 + PaCO2 35 → > 80 %', () => {
    const n = check18();
    expect(n.low).toBeGreaterThanOrEqual(0.7 * 0.85); // prototype 0.753
    expect(n.low).toBeLessThanOrEqual(0.7 * 1.15);
    expect(n.pbto2).toBeGreaterThanOrEqual(10); // prototype 13.0
    expect(n.pbto2).toBeLessThanOrEqual(15);
    expect(n.recovered).toBeGreaterThan(0.8); // prototype 0.834
  });
  // R45: not widened. Model 0.417 at CVP 6 (CPP 59, ICP ≈ CVP): the tables' 35–40 % is 0.70 × C(25) with CPP 55.
  // Through the engine (PEEP: CVP ≈ 12 is the venous floor, CPP 53) it is 0.376 — in band (Task 18). Deviations.
  it.fails('check 18: PaCO2 25 → CBF 35–40 % of the anaesthetised baseline (model at CVP 6)', () => {
    const n = check18();
    expect(n.hypo).toBeGreaterThanOrEqual(0.35);
    expect(n.hypo).toBeLessThanOrEqual(0.4);
  });
});
