import { describe, expect, it } from 'vitest';
import { combine, NEUTRAL_FX, type PdContext } from '../../../src/l2/pk/combine.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const base = { amountUnit: 'mcg', doses: '', onset: '', ir: '?', src: 'test', tag: 'ENG' } as const;
const PHE: DrugRow = { ...base, id: 'phe', name: 'phe', cls: 'alpha1', pk: { kind: 'gamma', refDose: 1, perKg: false, tpS: 60, t10S: 600 }, pd: [{ target: 'svr', emax: 1, ec50: 0.25, catecholamine: true }] };
const NE: DrugRow = { ...base, id: 'ne', name: 'ne', cls: 'alpha1', pk: PHE.pk, pd: [{ target: 'svr', emax: 1.5, ec50: 0.15, catecholamine: true }] };
const DOBU: DrugRow = { ...base, id: 'dobu', name: 'dobu', cls: 'betaAgonist', pk: PHE.pk, pd: [{ target: 'ees', emax: 0.8, ec50: 7, beta: true, catecholamine: true }] };
const ESMO: DrugRow = { ...base, id: 'esmo', name: 'esmo', cls: 'betaBlocker', pk: PHE.pk, pd: [{ target: 'betaBlock', emax: 0.9, ec50: 100 }, { target: 'hr', emax: -0.35, ec50: 100 }] };
const PROP: DrugRow = { ...base, id: 'propofol', name: 'prop', cls: 'hypnotic', pk: PHE.pk, pd: [{ target: 'svr', emax: -0.45, ec50: 3.5 }], cns: { hypC50: 3.08, hypC50AgeK: 0.00635 } };
const CTX: PdContext = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 35, macBrain: 0 };

describe('combination rules', () => {
  it('nothing active → neutral', () => {
    const r = combine([], CTX);
    expect(r.fx).toEqual(NEUTRAL_FX);
    expect(r.bus.antagonist).toEqual({ opioid: 1, benzodiazepine: 1 });
  });
  it('same class adds in potency units (Loewe): phe at EC50 + NE at EC50 = one drug at 2·EC50 with the larger Emax', () => {
    const r = combine([{ row: PHE, c: 0.25 }, { row: NE, c: 0.15 }], CTX);
    expect(r.fx.svr).toBeCloseTo(1 + (1.5 * 2) / 3, 9);
  });
  it('different classes multiply', () => {
    const a = combine([{ row: PHE, c: 0.25 }], CTX).fx.svr;
    const b = combine([{ row: PROP, c: 3.5 }], CTX).fx.svr;
    expect(combine([{ row: PHE, c: 0.25 }, { row: PROP, c: 3.5 }], CTX).fx.svr).toBeCloseTo(a * b, 9);
  });
  it('β-blocker occupancy competes with a β-agonist; acidosis blunts catecholamines', () => {
    const free = combine([{ row: DOBU, c: 7 }], CTX).fx.ees;
    const blocked = combine([{ row: DOBU, c: 7 }, { row: ESMO, c: 1e6 }], CTX).fx.ees;
    expect(blocked - 1).toBeLessThan((free - 1) * 0.2);
    const acid = combine([{ row: PHE, c: 0.25 }], { ...CTX, ph: 7.2 }).fx.svr;
    expect(acid - 1).toBeCloseTo(0.5 * 0.5, 9);
  });
  it('naloxone competitively antagonises opioids: remifentanil-equivalent falls; the EC50 multiplier is on the bus for 7f', () => {
    const REMI: DrugRow = { ...base, id: 'remi', name: 'remi', cls: 'opioid', pk: PHE.pk, pd: [], cns: { remiEq: 1 } };
    const NAL: DrugRow = { ...base, id: 'nal', name: 'nal', cls: 'opioidAntagonist', pk: PHE.pk, pd: [], antagonises: { cls: 'opioid', ec50: 1, emax: 0.98 } };
    const on = combine([{ row: REMI, c: 3 }], CTX).bus;
    const rev = combine([{ row: REMI, c: 3 }, { row: NAL, c: 2 }], CTX).bus;
    expect(rev.cns.opioidCeRemiEq).toBeLessThan(on.cns.opioidCeRemiEq / 2);
    expect(rev.antagonist.opioid).toBeCloseTo(on.cns.opioidCeRemiEq / rev.cns.opioidCeRemiEq, 9);
    expect(rev.antagonist.benzodiazepine).toBe(1);
  });
  it('the bus carries CNS potency units; the propofol C50 falls with age (Eleveld, R51 addendum 11)', () => {
    const r = combine([{ row: PROP, c: 3.08 }], CTX);
    expect(r.bus.cns.propCe).toBeCloseTo(3.08, 9);
    expect(r.bus.cns.uHyp).toBeCloseTo(1, 9);
    const old = combine([{ row: PROP, c: 3.08 }], { ...CTX, ageY: 75 });
    expect(old.bus.cns.uHyp).toBeCloseTo(Math.exp(0.00635 * 40), 9); // Ce50 2.39 at 75 y → uHyp 1.29
  });
  it('R51 §2: no drive or NMB PD on the bus; agents/volatiles/doses are left for the pipeline', () => {
    const r = combine([{ row: PROP, c: 3 }], CTX).bus;
    expect('resp' in r).toBe(false);
    expect(r.nmb).toEqual({ achGain: 1 });
    expect(r.agents).toEqual({});
    expect(r.doses).toEqual([]);
  });
});
