import { describe, expect, it } from 'vitest';
import { diffs, mean, run5, sd } from '../../../helpers/s5.ts';
import { beatQrsMs } from '../../../../src/l2/ecg/beat-templates.ts';

describe('Stage 5 rhythms: SVT family and junctional', () => {
  it.each([
    ['junctionalEscape', 40, 60],
    ['junctionalAccel', 60, 100],
    ['junctionalTachy', 100, 180],
  ] as const)('%s: narrow, regular, rate %i–%i, inverted retrograde P 80 ms before the QRS', (id, lo, hi) => {
    const { beats, atrial } = run5(id, 60);
    const rate = 60 / mean(diffs(beats.map((b) => b.t)));
    expect(rate).toBeGreaterThanOrEqual(lo);
    expect(rate).toBeLessThanOrEqual(hi);
    expect(beats.every((b) => b.origin === 'junctional' && b.qrsMs < 120)).toBe(true);
    expect(atrial.every((a) => a.kind === 'retrograde')).toBe(true);
    // P′ onset precedes QRS onset (beat.t − 40 ms) by 80 ms: PR < 120 ms
    for (const b of beats.slice(1)) {
      const p = atrial.filter((a) => a.t <= b.t).at(-1)!;
      expect(b.t - 0.04 - p.t).toBeCloseTo(0.08, 6);
    }
  });

  it("junctional retroP 'after': P′ follows the QRS", () => {
    const { beats, atrial } = run5('junctionalEscape', 30, { rhythmOpts: { retroP: 'after' } });
    const b = beats[3]!;
    const p = atrial.find((a) => a.t > b.t - 0.04)!;
    expect(p.t - (b.t - 0.04)).toBeCloseTo(0.1, 6);
  });

  it('svtAvrt: narrow, regular 150–250, retrograde P with RP > 70 ms (AVNRT RP < 70 ms)', () => {
    const { beats, atrial } = run5('svtAvrt', 30);
    const rr = diffs(beats.map((b) => b.t));
    expect(60 / mean(rr)).toBeGreaterThanOrEqual(150);
    expect(sd(rr)).toBeLessThan(0.01);
    for (const b of beats.slice(0, -1)) {
      const p = atrial.find((a) => a.t > b.t)!;
      expect(p.t - b.t).toBeGreaterThan(0.07);
    }
    const n = run5('svtAvnrt', 30);
    for (const b of n.beats.slice(0, -1)) {
      const p = n.atrial.find((a) => a.t >= b.t - 0.04)!;
      expect(p.t - b.t).toBeLessThan(0.07);
    }
  });

  it('wpwSinus: PR < 120 ms, delta wave, QRS 110–130 ms', () => {
    const { beats } = run5('wpwSinus', 30);
    expect(beats.every((b) => b.prMs! < 120)).toBe(true);
    expect(beats.every((b) => b.qrsMs >= 110 && b.qrsMs <= 130)).toBe(true);
    expect(beatQrsMs('wpw')).toBeGreaterThan(beatQrsMs('narrow') + 20);
  });

  it('preexcitedAf: irregular, fast (junction RR ≥ 0.2 s; R-to-R ≥ 0.15 s with the varying delta), varying QRS width', () => {
    const { beats } = run5('preexcitedAf', 120);
    const rr = diffs(beats.map((b) => b.t));
    expect(Math.min(...rr)).toBeGreaterThanOrEqual(0.15);
    expect(sd(rr) / mean(rr)).toBeGreaterThan(0.12);
    expect(60 / mean(rr)).toBeGreaterThan(150);
    const q = beats.map((b) => b.qrsMs);
    expect(sd(q)).toBeGreaterThan(8);
    expect(Math.max(...q)).toBeGreaterThanOrEqual(130);
  });
});
