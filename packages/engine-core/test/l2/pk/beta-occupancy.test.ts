import { describe, expect, it } from 'vitest';
import { combine, type Active } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { competitiveEc50 } from '../../../src/l2/pk/pd.ts';

const CTX = { ph: 7.4, betaBlockC: 0.5, vasoResp: 1, ageY: 40, macBrain: 0 };
const act = (id: string, c: number): Active => ({ row: DRUGS[id]!, c });
const svr = (fx: { svr: number }) => fx.svr;

/** FU-7 (addendum 21): chronic β-blockade is receptor occupancy with a selectivity. */
describe('β-receptor occupancy (R51 addendum 21)', () => {
  it('occupancy 0.85 is a dose ratio of ≈ 6.7 on a β-mediated EC50 (the tables\' ×0.5 as competition, D5)', () => {
    expect(competitiveEc50(1, 0.85)).toBeCloseTo(1 + 0.85 / 0.15, 6);
  });
  it('a β1-selective profile blunts dobutamine but NOT salbutamol (β2)', () => {
    const free = combine([act('dobutamine', 10)], { ...CTX, betaOccProfile: 0 }).fx.ees - 1;
    const blocked = combine([act('dobutamine', 10)], { ...CTX, betaOccProfile: 0.85 }).fx.ees - 1;
    expect(blocked).toBeLessThan(0.6 * free);
    const sFree = combine([act('salbutamol', 1)], { ...CTX, betaOccProfile: 0 }).fx.hr - 1;
    const sBlocked = combine([act('salbutamol', 1)], { ...CTX, betaOccProfile: 0.85 }).fx.hr - 1;
    expect(sBlocked).toBeCloseTo(sFree, 6);
  });
  it('non-selective blockade also occupies β2: salbutamol IS blunted and adrenaline\'s dilator arm is removed', () => {
    const sel = combine([act('epinephrine', 0.3)], { ...CTX, betaOccProfile: 0.85, betaNonSel: false }).fx;
    const non = combine([act('epinephrine', 0.3)], { ...CTX, betaOccProfile: 0.85, betaNonSel: true }).fx;
    expect(svr(non)).toBeGreaterThan(svr(sel)); // unopposed α
    const sBlocked = combine([act('salbutamol', 1)], { ...CTX, betaOccProfile: 0.85, betaNonSel: true }).fx.hr - 1;
    const sFree = combine([act('salbutamol', 1)], { ...CTX, betaOccProfile: 0 }).fx.hr - 1;
    expect(sBlocked).toBeLessThan(0.6 * sFree);
  });
  it('an older caller without the field keeps the pre-FU-7 behaviour (betaBlockC as the occupancy)', () => {
    const a = combine([act('dobutamine', 10)], CTX).fx.ees;
    const b = combine([act('dobutamine', 10)], { ...CTX, betaOccProfile: 0.5 }).fx.ees;
    expect(a).toBeCloseTo(b, 9);
  });
});
