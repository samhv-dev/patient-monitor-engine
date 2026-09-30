// FU-8 Task A17 (Stage 9 R-S9-1a): after a resize/reset the first frame redraws the last lane-width of samples (less
// the erase gap) instead of starting one sample back — a view change no longer blanks the sweep.
import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const cfg: LaneConfig = {
  x: 0, y: 0, width: 400, height: 100, baseline: 0.5, rate: 500, mmPerS: 25, pxPerMm: 4, gainMmPerMv: 10,
  color: '#0f0', background: '#000', lineWidth: 1.5, eraseGapPx: 16,
};

describe('FU-8 A17: the sweep backfills after a reset', () => {
  it('first frame at t = 30 s reads from one lane-width back (400 px − 16 px gap = 3.84 s at 100 px/s): 1 921 samples', () => {
    const reads: Array<[number, number]> = [];
    const src = (from: number, out: Float32Array) => {
      reads.push([from, out.length]);
      out.fill(0.1);
      return out.length;
    };
    const lane = new SweepLane(cfg, 1);
    lane.draw(new FakeCtx(), 30, src);
    expect(reads[0]).toEqual([15000 - 1920, 1921]); // samples 13 080 … 15 000
    expect(lane.lastDrawnIndex).toBe(15000);
  });
  it('near the start of the run it reads from sample 0', () => {
    const reads: number[] = [];
    const lane = new SweepLane(cfg, 1);
    lane.draw(new FakeCtx(), 1, (from, out) => (reads.push(from), out.fill(0), out.length));
    expect(reads[0]).toBe(0);
  });
});
