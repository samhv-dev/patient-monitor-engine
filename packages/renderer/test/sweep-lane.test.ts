import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';
import { Raster } from './raster.ts';

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
    // A re-stroked point outside the stroke's clip (the band erased this frame) leaves no ink; only the visible
    // span counts: the clip must start ≤ 3 px behind the previous cursor and points inside it must not pass the cursor.
    const lane = new SweepLane(CFG, 2);
    const ctx = new FakeCtx();
    let prevCursor = lane.draw(ctx, 0, sine);
    for (let f = 1; f <= 60 * 25; f++) {
      ctx.clear();
      const cursor = lane.draw(ctx, f / 60, sine);
      const wrapped = cursor < prevCursor;
      let pts: number[] = [];
      for (const c of ctx.calls) {
        if (c.op === 'lineTo' || c.op === 'moveTo') pts.push(c.args[0]! - CFG.x);
        if (c.op !== 'stroke') continue;
        const clip = c.clip!.map(([x, , w]) => [x! - CFG.x, x! - CFG.x + w!] as const);
        for (const [a, b] of clip) {
          expect(a).toBeGreaterThanOrEqual(0);
          expect(b).toBeLessThanOrEqual(CFG.width + 1e-9);
        }
        if (!wrapped) expect(clip[0]![0]).toBeGreaterThanOrEqual(prevCursor - 3); // later rects: the gap wrapping to x 0
        for (const lx of pts) {
          const visible = clip.some(([a, b]) => lx >= a && lx <= b);
          const previousLap = cursor < 20 && lx > CFG.width - 20; // just after the wrap: the band's right-end part
          if (visible && !wrapped && !previousLap) expect(lx).toBeLessThanOrEqual(cursor + 1);
        }
        pts = [];
      }
      prevCursor = cursor;
    }
  });

  it('clips every stroke to the lane (to the band just erased), so line width and round caps never spill past the erased area (wrap ghost)', () => {
    // Gate 1 visual check: without the clip, the ~1 px of a 1.75 px stroke left of the lane start was never
    // erased and built up a faint vertical ghost column at the wrap.
    const lane = new SweepLane(CFG, 2);
    const ctx = new FakeCtx();
    for (let f = 0; f <= 60 * 12; f++) lane.draw(ctx, f / 60, sine);
    const strokes = ctx.calls.filter((c) => c.op === 'stroke');
    expect(strokes.length).toBeGreaterThan(0);
    for (const s of strokes) {
      expect(s.clip!.length).toBeGreaterThan(0);
      for (const [x, y, w, h] of s.clip!) {
        expect(x!).toBeGreaterThanOrEqual(CFG.x);
        expect(x! + w!).toBeLessThanOrEqual(CFG.x + CFG.width + 1e-9);
        expect([y, h]).toEqual([CFG.y, CFG.height]);
      }
    }
    expect(ctx.clipRect).toBeNull(); // restored after drawing
  });

  it('DPR 1 (and 1.5, 2): drawing a steep QRS frame by frame leaves no column of it erased (review H2)', () => {
    // Synthetic R wave every 0.8 s: 1.5 mV, σ 8 ms, with an S wave, so a column holds a near-vertical stroke.
    const qrs = (from: number, out: Float32Array) => {
      for (let i = 0; i < out.length; i++) {
        const t = (from + i) / 500;
        const d = ((t + 0.4) % 0.8) - 0.4;
        out[i] = 1.5 * Math.exp(-(d * d) / (2 * 0.008 ** 2)) - 0.4 * Math.exp(-((d - 0.025) ** 2) / (2 * 0.008 ** 2));
      }
      return out.length;
    };
    const cfg = { ...CFG, lineWidth: 1.75 };
    for (const dpr of [1, 1.5, 2]) {
    const run = (frames: number[]) => {
      const lane = new SweepLane(cfg, dpr);
      const ctx = new FakeCtx();
      let cursor = 0;
      for (const t of frames) cursor = lane.draw(ctx, t, qrs);
      const r = new Raster(cfg.x + cfg.width, cfg.height, dpr);
      r.apply(ctx.calls, cfg.background, cfg.lineWidth);
      return { r, cursor };
    };
    const T = 2.5;
    const byFrame = run(Array.from({ length: Math.round(T * 60) + 1 }, (_, f) => f / 60));
    const oneShot = run([0, T]); // a single draw of the whole span: nothing can be erased
    let worst = 0;
    let steep = 0;
    for (let col = Math.ceil((cfg.x + 2) * dpr); col < (cfg.x + byFrame.cursor - 3) * dpr; col++) {
      const ref = oneShot.r.column(col);
      if (ref.length > 6) steep++;
      const got = new Set(byFrame.r.column(col));
      worst = Math.max(worst, ref.filter((y) => !got.has(y)).length);
    }
    expect(steep).toBeGreaterThan(10); // the test really covers steep QRS columns
    expect(worst, `DPR ${dpr}`).toBeLessThanOrEqual(1); // ≤ 1 px of antialiasing difference, never an erased run
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
