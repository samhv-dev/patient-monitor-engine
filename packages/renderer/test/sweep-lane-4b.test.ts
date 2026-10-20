// RR-3 cursor line and RR-4 grid painter on the erase bar.
import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { scaleFor } from '../src/wave-lanes.ts';
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

  it('no grid: nothing but the background fill', () => {
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

  const capCfg = (extra: Partial<LaneConfig>): LaneConfig =>
    cfg({ rate: 62.5, mmPerS: 6, color: '#F0F030', ...scaleFor(0, 50, 100, 4), ...extra });
  const const40 = (_from: number, out: Float32Array) => {
    out.fill(40);
    return out.length;
  };

  it('a filled lane fills under the trace down to the zero line, clipped to the band, in the lane colour', () => {
    const ctx = new FakeCtx();
    const lane = new SweepLane(capCfg({ fill: true }), 1);
    lane.draw(ctx, 0.5, const40);
    lane.draw(ctx, 1, const40);
    const fills = ctx.calls.filter((c) => c.op === 'fill');
    expect(fills.length).toBeGreaterThanOrEqual(1);
    for (const f of fills) {
      expect(f.style).toBe('#F0F030');
      expect(f.clip).not.toBeNull();
    }
    const c = lane.cfg;
    expect(ctx.calls.some((k) => k.op === 'lineTo' && k.args[1] === c.y + c.height)).toBe(true);
    // the stroke comes after the fill, so the line stays on top
    const ops = ctx.calls.map((k) => k.op);
    expect(ops.lastIndexOf('stroke')).toBeGreaterThan(ops.lastIndexOf('fill'));
  });

  // A synthetic capnogram at 62.5 Hz: 0 mmHg for 1 s, then a 38 mmHg plateau with a 50 ms cardiogenic bump at 1.6 Hz;
  // `cleft` adds a 5 mmHg curare cleft at 4 s (a feature the smoothing must keep).
  const RATE = 62.5;
  const capno = (cleft: boolean) => (from: number, out: Float32Array) => {
    for (let k = 0; k < out.length; k++) {
      const t = (from + k) / RATE;
      let v = t < 1 ? 0 : 38;
      if (t >= 1) for (let j = 0; j < 16; j++) v += 0.5 * Math.exp(-(((t - (1.3 + j / 1.6)) / 0.05) ** 2));
      if (cleft) v -= 5 * Math.exp(-(((t - 4) / 0.12) ** 2));
      out[k] = v;
    }
    return out.length;
  };
  /** Draw 8 s in 0.1 s frames; return the stroke points and the `from` of every read. */
  const run = (extra: Partial<LaneConfig>, cleft = false) => {
    const ctx = new FakeCtx();
    const lane = new SweepLane(capCfg({ width: 400, ...extra }), 1);
    const froms: number[] = [];
    const src = capno(cleft);
    for (let f = 1; f <= 80; f++) lane.draw(ctx, f / 10, (from, out) => (froms.push(from), src(from, out)));
    const pts = ctx.calls.filter((k) => k.op === 'lineTo' || k.op === 'moveTo').map((k) => [k.args[0]!, k.args[1]!] as const);
    return { lane, pts, froms };
  };
  type P = readonly (readonly [number, number])[];
  const plateauDev = (pts: P, x0: number) => {
    const ys = pts.filter(([x]) => x >= x0).map(([, y]) => y).sort((a, b) => a - b);
    const med = ys[Math.floor(ys.length / 2)]!;
    return Math.max(...ys.map((y) => Math.abs(y - med)));
  };
  const M2 = { smoothN: 20, smoothGate: [1.5, 3] as const }; // saadat-like: 320 ms at 62.5 Hz, gate in mmHg

  it('smoothing halves a 50 ms plateau ripple; the 0→38 mmHg upstroke is drawn as it is', () => {
    const raw = run({});
    const sm = run(M2);
    const pxPerS = raw.lane.pxPerS;
    const x0 = raw.lane.cfg.x + 1.5 * pxPerS; // the plateau, past the upstroke
    const devRaw = plateauDev(raw.pts, x0);
    expect(devRaw).toBeGreaterThan(0.5); // ≈ 1 px: the ripple is there to begin with
    expect(plateauDev(sm.pts, x0)).toBeLessThanOrEqual(0.5 * devRaw);
    const y90 = raw.lane.cfg.y + raw.lane.cfg.height * (1 - (0.9 * 38) / 50);
    const xUp = (pts: P) => Math.min(...pts.filter(([, y]) => y <= y90).map(([x]) => x));
    expect(xUp(sm.pts)).toBe(xUp(raw.pts));
  });

  it('a change larger than the gate is drawn unsmoothed: a 5 mmHg curare cleft keeps its depth', () => {
    const deepest = (pts: P) => Math.max(...pts.filter(([x]) => x > 3 * 24 && x < 5 * 24).map(([, y]) => y));
    const raw = deepest(run({}, true).pts);
    expect(Math.abs(deepest(run(M2, true).pts) - raw)).toBeLessThanOrEqual(0.5);
    expect(raw - deepest(run({ smoothN: 20 }, true).pts)).toBeGreaterThan(2); // an ungated average would fill it in
  });

  it('no smoothN: the sample reads and the drawn points are unchanged', () => {
    const plain = run({});
    for (const extra of [{ smoothN: 0 }, { smoothN: 1 }, { smoothGate: [1.5, 3] as const }]) {
      const r = run(extra);
      expect(r.froms).toEqual(plain.froms);
      expect(r.pts).toEqual(plain.pts);
    }
  });

  it('fill omitted: no fill call (every other lane and skin is unchanged)', () => {
    const ctx = new FakeCtx();
    const lane = new SweepLane(capCfg({}), 1);
    lane.draw(ctx, 0.5, const40);
    lane.draw(ctx, 1, const40);
    expect(ctx.calls.filter((c) => c.op === 'fill')).toEqual([]);
  });
});
