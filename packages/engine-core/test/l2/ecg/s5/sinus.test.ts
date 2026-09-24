import { describe, expect, it } from 'vitest';
import { respSin } from '../../../../src/l2/ecg/hrv.ts';
import { diffs, mean, run5 } from '../../../helpers/s5.ts';

describe('Stage 5 rhythms: sinus', () => {
  it('sinusArrhythmia: phasic PP swing > 120 ms that follows respiration', () => {
    const { atrial, ctx } = run5('sinusArrhythmia', 60, { mods: { hrvScale: 1 } });
    const t = atrial.map((a) => a.t);
    const pp = diffs(t);
    expect(Math.max(...pp) - Math.min(...pp)).toBeGreaterThan(0.12);
    const r = respSin;
    const x = pp.map((_, i) => r(t[i]!, ctx.hrv));
    const mx = mean(x), my = mean(pp);
    const cov = x.reduce((a, xi, i) => a + (xi - mx) * (pp[i]! - my), 0);
    const corr = cov / Math.sqrt(x.reduce((a, xi) => a + (xi - mx) ** 2, 0) * pp.reduce((a, y) => a + (y - my) ** 2, 0));
    expect(corr).toBeGreaterThan(0.7);
  });

  it('sinusPause: a 3 s sinus arrest every ~12 s, not a multiple of PP, no escape inside it', () => {
    const { atrial, beats } = run5('sinusPause', 60, { mods: { hrvScale: 0 } });
    const pp = diffs(atrial.map((a) => a.t));
    const pauses = pp.filter((x) => x > 2);
    expect(pauses.length).toBeGreaterThanOrEqual(4);
    for (const p of pauses) expect(p).toBeCloseTo(3, 6);
    expect(beats.every((b) => b.origin === 'sinus')).toBe(true);
  });
});
