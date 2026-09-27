import { describe, expect, it } from 'vitest';
import { createL1State, setL1Target } from '../../../src/l1/state.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
import { bloodCore, circExt, readDrugView, readOrganView } from '../../../src/l2/organs/inputs.ts';

const base = () => {
  const l1 = createL1State();
  return { l1, hemo: createHemoState(undefined, l1, 75), resp: createRespState(undefined, l1, 1) };
};

describe('organ input adapter', () => {
  it('reads the Stage 2/3/7a/7b truths with physiological defaults; no 7c/7g → neutral', () => {
    const c = base();
    const v = readOrganView(c, 0);
    expect(v.map).toBeGreaterThan(85);
    expect(v.map).toBeLessThan(100);
    expect(v.cvp).toBeGreaterThan(2);
    expect(v.cvp).toBeLessThan(10);
    expect(v.coLpm).toBeGreaterThan(3);
    expect(v.paco2).toBeGreaterThan(35);
    expect(v.sao2).toBeGreaterThan(0.9);
    expect(v.tempC).toBeCloseTo(36.8, 1);
    expect([v.hb, v.albuminGL, v.bvRel, v.hbfRel, v.lactate]).toEqual([14, 42, 1, null, null]);
    expect(v.anaesthesia).toBe('none');
    expect(v.drugs.present).toBe(false);
    expect([v.drugs.cmro2Mult, v.drugs.cbfVaso, v.drugs.furoCe, v.drugs.doses.length]).toEqual([1, 1, undefined, 0]);
    expect(v.blood).toBe(false);
    expect(circExt(c.hemo) === null).toBe(!v.circ);
  });
  it('without 7c, blood volume comes from MANUAL volumeStatus (0 → −40 %)', () => {
    const c = base();
    setL1Target(c.l1, 'volumeStatus', 0, 0);
    expect(readOrganView(c, 1).bvRel).toBeCloseTo(0.6, 9);
  });
  it('without 7c, MODELED blood volume is 7a\'s circulating volume ÷ the profile\'s (≈ 1 at rest)', () => {
    const c = base();
    c.l1.mode = 'modeled';
    expect(readOrganView(c, 0).bvRel).toBeCloseTo(1, 1);
  });
  it('7c present (duck-typed, addendum 14 names): Hb, albuminGL, bvRel, hbfRel, lactate and the core seam', () => {
    const blood = { core: { liver: 1 }, out: { hb: 9, albuminGL: 30, bvRel: 0.8, hbfRel: 0.7, lactate: 3.1, gluconate: 2 } };
    const v = readOrganView({ ...base(), blood }, 0);
    expect([v.blood, v.hb, v.albuminGL, v.bvRel, v.hbfRel, v.lactate, v.gluconate]).toEqual([true, 9, 30, 0.8, 0.7, 3.1, 2]);
    expect(bloodCore(blood)?.liver).toBe(1);
    expect(bloodCore(undefined)).toBeNull();
  });
  it('7c created but not yet stepped (its `out` all zeros, the engine\'s t = 0 rebaseline): the fallbacks, not Hb 0 / albumin 0 (gate §10)', () => {
    const blood = { core: { liver: 1 }, out: { hb: 0, albuminGL: 0, bvRel: 1, hbfRel: 1, lactate: 0, gluconate: 0 } };
    const v = readOrganView({ ...base(), blood }, 0);
    expect([v.blood, v.hb, v.albuminGL, v.bvRel, v.hbfRel, v.lactate]).toEqual([true, 14, 42, 1, null, null]);
    expect(bloodCore(blood)?.liver).toBe(1); // the seam itself is live from t = 0
  });
  it('7g/7f/7e present: CMRO2 (7f wins), cbfVaso, volatile MAC without N2O, hypnotic → GA, furosemide, α load, sepsis, doses', () => {
    const pk = {
      bus: {
        cns: { cmro2Mult: 0.7, cbfVaso: 1.2, propCe: 3, macBrain: 0, ketamineCe: 0 },
        volatiles: { sevoflurane: { macFrac: 0.8 }, n2o: { macFrac: 0.4 } },
        agents: { furosemide: { brain: 1.5 }, norepinephrine: { brain: 0.1 }, phenylephrine: { brain: 1 } },
        doses: [{ agent: 'hypertonicSaline', mgPerKg: null, amount: 250, amountUnit: 'mL', concentrationPct: 3, t: 1 }, { agent: 'bogus' }],
      },
    };
    const d = readDrugView({ pk, neuro: { outputs: { cmro2Mult: 0.6 } }, endo: { core: { cond: { sepsis: { cur: 2 } } } } });
    expect([d.present, d.cmro2Mult, d.cbfVaso, d.volatileMac, d.hypnotic, d.furoCe, d.sepsis]).toEqual([true, 0.6, 1.2, 0.8, true, 1.5, 0.5]);
    expect(d.alphaNe).toBeCloseTo(0.2, 9);
    expect(d.doses).toEqual([{ agent: 'hypertonicSaline', amount: 250, amountUnit: 'mL', concentrationPct: 3, t: 1 }]);
    expect(readDrugView({ pk: { bus: { cns: { cmro2Mult: 1 } } } }).cmro2Mult).toBe(1);
    expect(readOrganView({ ...base(), pk }, 0).anaesthesia).toBe('general'); // drugs raise Stage 3's 'none'
  });
});
