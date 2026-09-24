import { describe, expect, it } from 'vitest';
import { detectOn, score } from '../helpers/ecg.ts';
import type { RhythmId, RhythmOpts } from '../../src/types.ts';

const CASES: Array<[RhythmId, number, RhythmOpts?]> = [
  ['sinus', 60],
  ['sinus', 150],
  ['sinusBrady', 40],
  ['sinusTachy', 200],
  ['afib', 100],
  ['afib', 150],
  ['aflutter', 150, { ratio: 2 }],
  ['aflutter', 75, { ratio: 4 }],
  ['svtAvnrt', 220],
  ['vtMono', 170],
  ['vtMono', 240],
  ['avb3Narrow', 45],
  ['avb3Wide', 32],
  ['avb2Mobitz1', 75],
];

describe('l3/qrs detector on the displayed lead II (monitor filter)', () => {
  for (const [id, hr, ro] of CASES) {
    it(`${id} @ ${hr}: every QRS found, no false detections, R located within 10 ms`, () => {
      const r = detectOn(id, hr, 90, { rhythmOpts: ro ?? {} });
      const s = score(r, 90);
      expect(s.beats).toBeGreaterThan(20);
      expect(s.tp).toBe(s.beats);
      expect(s.fp).toBe(0);
      for (const e of s.errors) expect(Math.abs(e)).toBeLessThanOrEqual(0.01);
    });
  }

  it('PVC bigeminy and random PVCs are all counted', () => {
    for (const pvc of [{ pattern: 'bigeminy', probability: 0 }, { pattern: 'single', probability: 0.3 }] as const) {
      const s = score(detectOn('sinus', 75, 90, { mods: { pvc } }), 90);
      expect(s.tp).toBe(s.beats);
      expect(s.fp).toBe(0);
    }
  });

  it('works in diagnostic mode too', () => {
    const s = score(detectOn('sinus', 75, 60, { mode: 'diagnostic' }), 60);
    expect(s.tp).toBe(s.beats);
    expect(s.fp).toBe(0);
  });

  it('asystole: no detections in 2 minutes of noise and wander', () => {
    expect(detectOn('asystole', 0, 120).detections).toHaveLength(0);
  });

  it('narrow-complex detections arrive ≤ 120 ms after the R (the look-ahead is 100 ms; tones need R + 40 ms)', () => {
    const r = detectOn('sinus', 75, 60);
    const late = r.latencies.slice(3);
    expect(Math.max(...late)).toBeLessThanOrEqual(0.12);
  });
});
