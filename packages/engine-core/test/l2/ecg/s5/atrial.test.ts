import { describe, expect, it } from 'vitest';
import { WAVE, diffs, mean, run5, sd } from '../../../helpers/s5.ts';

describe('Stage 5 rhythms: atrial', () => {
  it('atrialTach: regular 150–250, 1:1, P′ inverted in II', () => {
    const { atrial, beats, st } = run5('atrialTach', 30);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeGreaterThanOrEqual(150);
    expect(60 / mean(rr)).toBeLessThanOrEqual(250);
    expect(sd(rr)).toBeLessThan(0.01);
    expect(atrial.every((a) => a.conducted)).toBe(true);
    const p = st.events.find((e) => e.k[6] === WAVE.P)!;
    expect(0.235 * p.k[3]! + 1.066 * p.k[4]! - 0.132 * p.k[5]!).toBeLessThan(-0.05);
  });

  it('mat: ≥ 3 P′ shapes, ≥ 3 PR values, irregular, rate 100–150', () => {
    const { beats, st } = run5('mat', 60);
    const pv = new Set(st.events.filter((e) => e.k[6] === WAVE.P).map((e) => e.k[4]!.toFixed(3)));
    expect(pv.size).toBeGreaterThanOrEqual(3);
    expect(new Set(beats.map((b) => b.prMs)).size).toBeGreaterThanOrEqual(3);
    const rr = diffs(beats.map((b) => b.t));
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.08);
    expect(60 / mean(rr)).toBeGreaterThanOrEqual(95);
    expect(60 / mean(rr)).toBeLessThanOrEqual(155);
  });
});
