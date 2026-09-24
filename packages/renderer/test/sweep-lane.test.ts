import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const CFG: LaneConfig = {
  x: 50, y: 0, width: 1000, height: 150, baseline: 0.6, rate: 500, mmPerS: 25, pxPerMm: 3.78,
  gainMmPerMv: 10, color: '#0f0', background: '#000', lineWidth: 1.5, eraseGapPx: 16,
};

/** A source that returns a sine for any index (as the engine's ring buffer would). */
const sine = (from: number, out: Float32Array) => {
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * (from + i)) / 500);
  return out.length;
};

describe('SweepLane', () => {
  it('cursor position depends only on sim time, not on the frame rate', () => {
    for (const fps of [30, 60]) {
      const lane = new SweepLane(CFG, 2);
      const ctx = new FakeCtx();
      let x = 0;
      for (let f = 0; f <= 3 * fps; f++) x = lane.draw(ctx, f / fps, sine);
      expect(x).toBeCloseTo((3 * 94.5) % 1000, 6);
    }
  });

  it('clears the erase gap (16 px) just ahead of the cursor on every frame', () => {
    const lane = new SweepLane(CFG, 2);
    const ctx = new FakeCtx();
    lane.draw(ctx, 1, sine);
    ctx.clear();
    lane.draw(ctx, 1 + 1 / 60, sine);
    const clears = ctx.calls.filter((c) => c.op === 'fillRect');
    expect(clears).toHaveLength(1);
    const [x, , w] = clears[0]!.args as [number, number, number, number];
    const cursorLocal = ((Math.floor((1 + 1 / 60) * 500) / 500) * 94.5) % 1000;
    expect(x - CFG.x).toBeLessThanOrEqual(cursorLocal);
    expect(x - CFG.x + w).toBeGreaterThanOrEqual(cursorLocal + 16 - 1);
    expect(w).toBeLessThan(16 + 4);
  });

  it('never draws ahead of the cursor or behind the previous frame (no ghost trail), including at wrap', () => {
    const lane = new SweepLane(CFG, 2);
    const ctx = new FakeCtx();
    let prevCursor = lane.draw(ctx, 0, sine);
    for (let f = 1; f <= 60 * 25; f++) {
      ctx.clear();
      const cursor = lane.draw(ctx, f / 60, sine);
      for (const c of ctx.calls.filter((k) => k.op === 'lineTo' || k.op === 'moveTo')) {
        const lx = c.args[0]! - CFG.x;
        expect(lx).toBeGreaterThanOrEqual(0);
        expect(lx).toBeLessThanOrEqual(CFG.width);
        const wrapped = cursor < prevCursor;
        if (!wrapped) {
          expect(lx).toBeGreaterThanOrEqual(prevCursor - 3); // tail re-stroke reaches ≤ 2 points back
          expect(lx).toBeLessThanOrEqual(cursor + 1);
        }
      }
      prevCursor = cursor;
    }
  });

  it('a jump longer than one lane redraws from a clean lane', () => {
    const lane = new SweepLane(CFG, 1);
    const ctx = new FakeCtx();
    lane.draw(ctx, 1, sine);
    ctx.clear();
    lane.draw(ctx, 60, sine);
    const full = ctx.calls.find((c) => c.op === 'fillRect' && c.args[2] === CFG.width);
    expect(full).toBeDefined();
  });

  it('maps 1 mV to 10 mm (37.8 px) above the baseline', () => {
    const lane = new SweepLane({ ...CFG, x: 0 }, 1);
    const ctx = new FakeCtx();
    lane.draw(ctx, 0, () => 0);
    lane.draw(ctx, 0.5, (from, out) => {
      out.fill(1);
      return out.length;
    });
    const ys = ctx.calls.filter((c) => c.op === 'lineTo').map((c) => c.args[1]!);
    expect(Math.min(...ys)).toBeCloseTo(0.6 * 150 - 37.8, 6);
  });
});
