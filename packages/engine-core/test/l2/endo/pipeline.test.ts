// Stage 7e pipeline: command validation/application and the 1 Hz endo event (engine-independent).
import { describe, expect, it } from 'vitest';
import type { Command } from '../../../src/types.ts';
import { createL1State } from '../../../src/l1/state.ts';
import { advanceEndo, applyEndoCommand, createEndoState, validateEndoCommand } from '../../../src/l2/endo/pipeline.ts';
import { tempFactor } from '../../../src/l2/gas/params.ts';
import { createThermal, stepThermal } from '../../../src/l2/thermal/heat.ts';
import { cascade, thermalMetabolic } from '../../../src/l2/thermal/metabolic.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;
function rig(ps: Record<string, unknown> = {}, profile: Record<string, unknown> = { endo: { diabetes: 'type2' } }) {
  const temp = createThermal(36.8, 70);
  const resp = { temp, o2: { sa: 0.97 }, co2: { pf: 40 }, lungSpecs: [] } as never;
  const es = createEndoState(profile as never, 70);
  return { es, resp: resp as { temp: typeof temp }, ctx: { l1: createL1State(), hemo: {} as never, resp, ps } };
}

describe('Stage 7e pipeline', () => {
  it('validates its own commands and returns null for everything else (every drug, mh, dka, airway)', () => {
    expect(validateEndoCommand(ev({ kind: 'stimulus', intensity: 1.5 }))).toBeUndefined();
    expect(validateEndoCommand(ev({ kind: 'stimulus', intensity: 3 }))).toMatch(/intensity/);
    expect(validateEndoCommand(ev({ kind: 'stimulus' }))).toMatch(/required/);
    expect(validateEndoCommand(ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'cold' }))).toBeUndefined();
    expect(validateEndoCommand(ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'hot' }))).toMatch(/phase/);
    expect(validateEndoCommand(ev({ kind: 'thermal7e', exposure: 'prep', fluidWarmer: true }))).toBeUndefined();
    for (const drugId of ['dantrolene', 'dextrose', 'insulin', 'epinephrine']) {
      expect(validateEndoCommand(ev({ kind: 'drug', drugId, dose: 1, unit: 'mg', route: 'iv' }))).toBeNull(); // 7g's (R51 §3)
    }
    expect(validateEndoCommand(ev({ kind: 'condition', id: 'mh', severity: 1 }))).toBeNull();
    expect(validateEndoCommand(ev({ kind: 'condition', id: 'dka', severity: 1 }))).toBeNull();
    expect(validateEndoCommand(ev({ kind: 'airway', state: 'patent' }))).toBeNull();
  });

  it('profile: type 2 fasting glucose 144 mg/dL in the endo event, 1 Hz', () => {
    const { es, ctx } = rig();
    advanceEndo(es, ctx as never, 5);
    const e = es.out.filter((x) => x.type === 'endo');
    expect(e.map((x) => x.t)).toEqual([1, 2, 3, 4, 5]);
    expect((e[4] as { glucoseMgDl: number }).glucoseMgDl).toBe(144);
  });

  it('applies stimulus, thermal7e and conditions; hands 7g’s dantrolene effect to the heat model every pass', () => {
    const { es, resp, ctx } = rig({ pk: { bus: { metabolic: { dantroleneE: 0.5 } } } });
    const r = resp as never;
    expect(applyEndoCommand(es, r, ev({ kind: 'stimulus', intensity: 1 }), 0)).toBe(true);
    expect(es.noxious).toBe(1);
    expect(applyEndoCommand(es, r, ev({ kind: 'thermal7e', exposure: 'prep', fluidWarmer: true }), 0)).toBe(true);
    expect([resp.temp.exposure, resp.temp.fluidWarmer]).toEqual(['prep', true]);
    expect(applyEndoCommand(es, r, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'cold', rampS: 1200 }), 0)).toBe(true);
    expect(es.core.cond.sepsis).toMatchObject({ target: 4, tauS: 1200 });
    expect(applyEndoCommand(es, r, ev({ kind: 'condition', id: 'dka', severity: 0.8 }), 0)).toBe(false); // 7c's
    advanceEndo(es, ctx as never, 0.5);
    expect(resp.temp.dantE).toBe(0.5);
  });

  it('writes the endocrine heat and fever into the thermal state (thyroid storm → extraX > 1.3, feverShift > 1)', () => {
    const { es, resp, ctx } = rig();
    applyEndoCommand(es, resp as never, ev({ kind: 'condition', id: 'thyroidStorm', severity: 1 }), 0);
    advanceEndo(es, ctx as never, 3600);
    expect(resp.temp.extraX).toBeGreaterThan(1.3);
    expect(resp.temp.feverShift).toBeGreaterThan(1);
  });

  it('thyroid storm with the heat model (awake, 2 h): core 38.5–41 °C, VO2 × 1.3–1.8, HR × 1.47–2.0 (110–150), SVR × 0.55–0.65 (tables §5c)', () => {
    const { es, resp, ctx } = rig({}, {});
    applyEndoCommand(es, resp as never, ev({ kind: 'condition', id: 'thyroidStorm', severity: 1 }), 0);
    for (let s = 1; s <= 7200; s++) {
      stepThermal(resp.temp, s, 1);
      advanceEndo(es, ctx as never, s);
    }
    const o = es.core.out;
    const vo2 = tempFactor(resp.temp.tc) * thermalMetabolic(resp.temp, 7200).vo2F * resp.temp.extraX; // = metabolic(rs, t, 'o2') awake
    expect(resp.temp.tc).toBeGreaterThanOrEqual(38.5);
    expect(resp.temp.tc).toBeLessThanOrEqual(41);
    expect(vo2).toBeGreaterThanOrEqual(1.3);
    expect(vo2).toBeLessThanOrEqual(1.8);
    const hr = o.hrF * o.condHrF * o.feverHrFExcess; // MANUAL composite (the storm row carries its own fever tachycardia)
    expect(hr).toBeGreaterThanOrEqual(110 / 75);
    expect(hr).toBeLessThanOrEqual(2);
    expect(o.svrF).toBeGreaterThanOrEqual(0.55);
    expect(o.svrF).toBeLessThanOrEqual(0.65);
  });

  it('stores cascade(th) on EndoState every second for 7f (R-7f-8): neutral when created, macF < 1 when the core is cold', () => {
    const { es, resp, ctx } = rig();
    expect(es.cascade.macF).toBe(1);
    resp.temp.tc = 34;
    advanceEndo(es, ctx as never, 1);
    expect(es.cascade).toEqual(cascade(resp.temp as never));
    expect(es.cascade.macF).toBeCloseTo(0.85, 9); // tables −5 %/°C below 37
  });
});
