import { describe, expect, it } from 'vitest';
import { prMs } from '../../../../src/l2/ecg/intervals.ts';
import { diffs, run5 } from '../../../helpers/s5.ts';

describe('Stage 5 ectopy: PACs and PJCs', () => {
  it('PAC: premature P′ at 60–85% of PP resets the SA clock (pause < compensatory); blocked and aberrant variants', () => {
    const { atrial, beats } = run5('sinus', 120, { hr: 60, mods: { hrvScale: 0, pac: { probability: 0.2 } } });
    const t = atrial.map((a) => a.t);
    const pp = diffs(t);
    const early = pp.map((x, i) => [x, i] as const).filter(([x]) => x < 0.9);
    expect(early.length).toBeGreaterThan(5);
    for (const [x, i] of early) {
      expect(x).toBeGreaterThanOrEqual(0.6 - 1e-9);
      expect(x).toBeLessThanOrEqual(0.85 + 1e-9);
      if (i + 1 < pp.length && pp[i + 1]! >= 0.9) {
        expect(pp[i + 1]).toBeCloseTo(1, 6); // SA reset: next PP is a full cycle from the P′
        expect(x + pp[i + 1]!).toBeLessThan(2); // less than compensatory
      }
    }
    expect(beats.some((b) => b.origin === 'atrial' && b.prMs === prMs(60) + 20)).toBe(true);
    const blocked = run5('sinus', 120, { hr: 60, mods: { hrvScale: 0, pac: { probability: 0.2, blocked: true } } });
    expect(blocked.atrial.filter((a) => !a.conducted).length).toBeGreaterThan(5);
    const ab = run5('sinus', 120, { hr: 60, mods: { hrvScale: 0, pac: { probability: 0.2, aberrant: true } } });
    const aberr = ab.beats.filter((b) => b.origin === 'atrial');
    expect(aberr.length).toBeGreaterThan(5);
    expect(aberr.every((b) => b.template === 'aberrant' && b.qrsMs >= 120)).toBe(true);
  });

  it('PJC: premature narrow junctional beats with a retrograde P', () => {
    const { beats } = run5('sinus', 120, { hr: 60, mods: { hrvScale: 0, pjc: { probability: 0.15 } } });
    const j = beats.filter((b) => b.origin === 'junctional');
    expect(j.length).toBeGreaterThan(5);
    expect(j.every((b) => b.qrsMs < 120 && b.template === 'narrowRetroP')).toBe(true);
  });
});
