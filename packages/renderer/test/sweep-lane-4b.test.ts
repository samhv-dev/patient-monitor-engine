// RR-3 cursor line and RR-4 grid painter on the erase bar.
import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const cfg = (extra: Partial<LaneConfig>): LaneConfig => ({
  x: 0, y: 0, width: 400, height: 100, baseline: 0.5, rate: 500, mmPerS: 25, pxPerMm: 4, gainMmPerMv: 10,
  color: '#0f0', background: '#fff8f4', lineWidth: 1.5, eraseGapPx: 16, ...extra,
});
const flat = (_from: number, out: Float32Array) => {
  out.fill(0);
  return out.length;
};

describe('SweepLane 4b options', () => {
  it('grid: every cleared rect is repainted with minor and major lines in the theme colours', () => {
    const ctx = new FakeCtx();
    const lane = new SweepLane(cfg({ grid: { minorMm: 1, majorMm: 5, minor: '#FAE2E2', major: '#F4C4C4' } }), 1);
    lane.reset(ctx);
    const styles = ctx.calls.filter((c) => c.op === 'stroke').map((c) => c.style);
    expect(styles).toEqual(['#FAE2E2', '#F4C4C4']);
    ctx.clear();
    lane.draw(ctx, 0.5, flat);
    lane.draw(ctx, 0.6, flat);
    const strokes = ctx.calls.filter((c) => c.op === 'stroke').map((c) => c.style);
    expect(strokes.filter((s) => s === '#F4C4C4').length).toBeGreaterThanOrEqual(1); // grid inside the new band
    expect(strokes).toContain('#0f0'); // then the trace
  });

  it('no grid: nothing but the background fill (Stage 1 behaviour)', () => {
    const ctx = new FakeCtx();
    new SweepLane(cfg({}), 1).reset(ctx);
    expect(ctx.calls.filter((c) => c.op === 'stroke')).toEqual([]);
  });

  it('cursor line: a 1-px bar in the trace colour at the leading edge of the gap', () => {
    const ctx = new FakeCtx();
    const lane = new SweepLane(cfg({ cursorLine: true }), 1);
    lane.draw(ctx, 0.2, flat);
    ctx.clear();
    lane.draw(ctx, 0.3, flat);
    const bar = ctx.calls.filter((c) => c.op === 'fillRect' && c.style === '#0f0');
    expect(bar).toHaveLength(1);
    expect(bar[0]!.args[0]).toBeCloseTo(((150 / 500) * 100 + 16 - 1) % 400, 6);
    expect(bar[0]!.args[2]).toBe(1);
    expect(lane.lastDrawnIndex).toBe(150);
  });
});
