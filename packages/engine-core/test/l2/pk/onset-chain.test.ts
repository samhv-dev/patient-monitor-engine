import { describe, expect, it } from 'vitest';
import { chainShape, gammaN, onsetChain, ONSET_N_MIN } from '../../../src/l2/pk/gamma.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';

/** FU-7 (addendum 19): every fallback-curve row rises from ZERO slope and keeps its peak time and 10 % time. */
describe('onset chain (R51 addendum 19)', () => {
  const rows = Object.values(DRUGS).filter((r) => r.pk.kind === 'gamma');
  it('the chain has zero value AND zero slope at t = 0, and peaks at 1 exactly at tp', () => {
    const c = onsetChain(60, 900); // ketamine
    expect(chainShape(0, c)).toBe(0);
    expect(chainShape(0.001, c) / 0.001).toBeLessThan(1e-3); // slope → 0
    expect(chainShape(60, c)).toBeCloseTo(1, 6);
    for (const t of [30, 45, 90]) expect(chainShape(t, c)).toBeLessThan(1);
  });
  it('the three corrected rows carry their sourced PEAK / redistribution data (review F7, D20)', () => {
    expect((DRUGS.atropine!.pk as { tpS: number }).tpS).toBe(150);
    expect((DRUGS.midazolam!.pk as { tpS: number }).tpS).toBe(240);
    expect((DRUGS.ketamine!.pk as { t10S: number }).t10S).toBe(2700);
  });
  it('every row with t10/tp ≥ 8 reproduces its own t10 within 2 s and its peak within 0.1 %', () => {
    for (const r of rows) {
      const { tpS, t10S } = r.pk as { tpS: number; t10S: number };
      if (gammaN(tpS, t10S) >= ONSET_N_MIN) continue;
      const c = onsetChain(tpS, t10S);
      expect(chainShape(tpS, c)).toBeCloseTo(1, 3);
      let t10 = Number.NaN;
      for (let t = tpS; t < 30 * t10S; t += 1) if (chainShape(t, c) <= 0.1) { t10 = t; break; }
      expect(Math.abs(t10 - t10S), `${r.id} t10 ${t10} vs ${t10S}`).toBeLessThanOrEqual(2);
    }
  });
  it('the step onset is gone: no row reaches 60 % of its peak within 0.1·tp (research/14 D2 measured 19 that did)', () => {
    for (const r of rows) {
      const { tpS, t10S } = r.pk as { tpS: number; t10S: number };
      const n = gammaN(tpS, t10S);
      if (n >= ONSET_N_MIN) continue; // adenosine: n 7.5, already zero-slope
      expect(chainShape(0.1 * tpS, onsetChain(tpS, t10S)), r.id).toBeLessThan(0.6);
    }
  });
  it('adenosine keeps the gamma (n ≥ 1, its own 15 s peak and 30 s offset)', () => {
    expect(gammaN(15, 30)).toBeGreaterThan(ONSET_N_MIN);
  });
});
