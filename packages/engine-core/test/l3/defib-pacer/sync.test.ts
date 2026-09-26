// The sync detector marks every R within 20 ms of the true R (4b acceptance) and reports it quickly.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/engine.ts';
import { createSyncState, syncStep } from '../../../src/l3/defib-pacer/sync.ts';
import type { EngineEvent, RhythmId } from '../../../src/types.ts';

function run(rhythm: RhythmId, seconds: number) {
  const e = createEngine({ seed: 3, patient: { rhythm: { id: rhythm } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(seconds);
  const n = Math.round(seconds * 500);
  const X = new Float32Array(n);
  const Y = new Float32Array(n);
  const Z = new Float32Array(n);
  e.readSamples('vcgX', 0, X);
  e.readSamples('vcgY', 0, Y);
  e.readSamples('vcgZ', 0, Z);
  const st = createSyncState(0);
  const det = syncStep(st, n - 1, (i) => [X[i] as number, Y[i] as number, Z[i] as number]);
  const beats = ev.filter((x): x is Extract<EngineEvent, { type: 'beat' }> => x.type === 'beat' && x.t > 2 && x.t < seconds - 0.5);
  return { det, beats };
}

describe('sync detector', () => {
  for (const [rhythm, s] of [['sinus', 20], ['svtAvnrt', 15], ['aflutter', 15], ['afib', 20], ['vtMono', 15]] as const) {
    it(`${rhythm}: one marker per beat, within 20 ms of R, reported ≤ 40 ms after it`, () => {
      const { det, beats } = run(rhythm, s);
      expect(beats.length).toBeGreaterThan(10);
      for (const b of beats) {
        const m = det.find((d) => Math.abs(d.r / 500 - b.t) < 0.1);
        expect(m, `R at ${b.t.toFixed(3)}`).toBeDefined();
        expect(Math.abs(m!.r / 500 - b.t)).toBeLessThanOrEqual(0.02);
        expect((m!.at - m!.r) / 500).toBeLessThanOrEqual(0.04 + 1e-9);
      }
      const inWindow = det.filter((d) => d.r / 500 > 2 && d.r / 500 < s - 0.5);
      expect(inWindow.length).toBe(beats.length);
    });
  }

  it('asystole: no markers', () => {
    expect(run('asystole', 10).det.filter((d) => d.r > 1000)).toEqual([]);
  });
});
