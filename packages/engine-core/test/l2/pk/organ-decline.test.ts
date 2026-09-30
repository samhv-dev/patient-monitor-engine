import { describe, expect, it } from 'vitest';
import { onsetChain } from '../../../src/l2/pk/gamma.ts';
import { clFactor, gammaDeclineRate, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

/** FU-7 (research/13 H9, RH amendment): the fallback-curve rows follow liver and kidney function. */
describe('gamma rows follow organ function (research/13 H9)', () => {
  const row = (id: string) => DRUGS[id] as DrugRow;
  const g = (id: string, ctx = NEUTRAL_PK_CTX) => gammaDeclineRate(row(id), clFactor(row(id), ctx));
  it('a neutral context changes no row: every decline rate is exactly 1', () => {
    for (const r of Object.values(DRUGS) as DrugRow[]) expect(gammaDeclineRate(r, clFactor(r, NEUTRAL_PK_CTX)), r.id).toBe(1);
  });
  it('hepatic failure slows only the ELIMINATION share of midazolam\'s decline (redistribution unchanged)', () => {
    const pk = row('midazolam').pk as { tpS: number; t10S: number };
    const phi = Math.LN2 / 7740 / onsetChain(pk.tpS, pk.t10S).ke;
    expect(phi).toBeGreaterThan(0.1);
    expect(phi).toBeLessThan(0.16);
    const ctx = { ...NEUTRAL_PK_CTX, hepFn: 0.36 }; // hepaticFailure 0.8 (RH-12a: core liver 0.36)
    expect(g('midazolam', ctx)).toBeCloseTo(1 - phi * (1 - 0.36), 9);
  });
  it('renal failure (tables §1.5 ckd: renal drug clearance ×0.3) slows the renally cleared rows only', () => {
    const ckd = { ...NEUTRAL_PK_CTX, renal: 0.3 };
    for (const id of ['neostigmine', 'glycopyrrolate', 'morphine']) expect(g(id, ckd), id).toBeLessThan(1);
    expect(g('glycopyrrolate', ckd)).toBeCloseTo(0.44, 2); // φ 1: 0.8 renal share × 0.3 + 0.2
    for (const id of ['midazolam', 'ketamine', 'dexmedetomidine', 'thiopental', 'etomidate']) expect(g(id, ckd), id).toBe(1);
  });
  it('the redistribution-limited induction agents barely move (thiopental, etomidate: φ < 0.01)', () => {
    const ctx = { ...NEUTRAL_PK_CTX, hepFn: 0.36 };
    for (const id of ['thiopental', 'etomidate']) expect(g(id, ctx), id).toBeGreaterThan(0.99);
  });
  it('furosemide keeps its curve (no t12S: its effect site is the tubular lumen, not plasma)', () => {
    expect(row('furosemide').elim?.t12S).toBeUndefined();
    expect(g('furosemide', { ...NEUTRAL_PK_CTX, renal: 0.3, hepFn: 0.36 })).toBe(1);
  });
});
