// FX-25: attaching the CO2 sampling line painted the capnogram lane from its left edge to the sweep cursor within a
// second (with the Saadat-like fill, a solid block that stayed until the sweep came round). The engine creates the CO2
// buffer at the attach, and a read from before its first sample returns that first sample as if it were the one asked
// for; the lane's backfill read a lane-width back, so it drew the few samples since the attach over and over, side by
// side, until it caught up with the clock. The lane now starts at the first sample the engine holds: blank left of the
// attach point, the capnogram from there on at the sweep speed. Same for a skin whose capnogram is an unfilled line.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { MonitorCore } from '../src/monitor-core.ts';
import { renderPlan, type RenderPlan } from '../src/skin-plan.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const FRAME_MS = 1000 / 60;
const SIZE = { cssW: 1056, cssH: 500, dpr: 1 };
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;

/** Run 20 s without the line, attach it (and swap the plan, as mountMonitor does), then check 2.5 s of frames. */
function attachAndWatch(skin: string, before: RenderPlan, after: RenderPlan): void {
  const ctx = new FakeCtx();
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, SIZE, { engine: { seed: 1, device: { skin } }, plan: before }, () => {});
  let ms = 0;
  for (; ms <= 20_000; ms += FRAME_MS) core.frame(1_000_000 + ms);
  expect(core.engine.latestSampleIndex('co2')).toBe(-1); // the default patient breathes without the line (O4)
  const r = core.command({ id: 'co2-on', issuedBy: 'test', type: 'attachSensor', sensor: 'co2', state: 'on' });
  expect(r.accepted).toBe(true);
  if (after !== before) core.setPlan(after);
  const i = after.lanes.findIndex((l) => l.channel === 'co2');
  expect(i).toBeGreaterThanOrEqual(0);
  const attach = Math.floor(r.tick * 0.02 * 62.5); // the first CO2 sample index, within a sample
  ctx.clear();
  let prev = Number.NaN;
  const t0 = ms;
  for (; ms <= t0 + 2500; ms += FRAME_MS) {
    core.frame(1_000_000 + ms);
    const l = lanes(core)[i] as SweepLane;
    if (l.lastDrawnIndex < 0) continue; // no CO2 sample yet
    // nothing is drawn as if it came before the attach …
    expect(l.lastDrawnIndex, `${skin} +${(ms - t0).toFixed(0)} ms`).toBeGreaterThanOrEqual(attach - 2);
    // … and each frame draws what the clock advanced (≈ 1 sample at 62.5 Hz), not a lane's worth
    if (!Number.isNaN(prev)) expect(l.lastDrawnIndex - prev, `${skin} +${(ms - t0).toFixed(0)} ms`).toBeLessThanOrEqual(Math.ceil(62.5 * (FRAME_MS / 1000)) + 1);
    prev = l.lastDrawnIndex;
  }
  expect(prev).toBeGreaterThan(attach); // the capnogram was drawn
  // Every trace point in the CO2 lane lies between the attach point and the cursor (the lane left of it stays blank).
  const l = lanes(core)[i] as SweepLane;
  const c = l.cfg;
  const x0 = (l.xOf(attach) % c.width) + c.x; // the lane's own left edge (pass 2: the Saadat-like gutter, 18 px)
  const reach = l.xOf(prev) - l.xOf(attach);
  let pts = 0;
  for (const call of ctx.calls) {
    if (call.op !== 'lineTo') continue;
    const [x, y] = call.args as [number, number];
    if (x < c.x || y < c.y || y > c.y + c.height) continue; // another lane, or the chrome
    pts++;
    const d = ((((x - x0 + 3) % c.width) + c.width) % c.width) - 3; // distance right of the attach point, round the wrap
    expect(d, `${skin}: a point at x ${x.toFixed(1)}, attach point ${x0.toFixed(1)}`).toBeLessThanOrEqual(reach + 3); // ± a column
  }
  expect(pts).toBeGreaterThan(20);
}

describe('FX-25: the CO2 lane after the sampling line is attached', () => {
  it('Saadat-like (the CO2 waveform takes the RESP lane, filled): drawn only from the attach point on', () => {
    attachAndWatch('saadat-like', renderPlan(resolveSkin('saadat-like')), renderPlan(resolveSkin('saadat-like', { sensors: { co2: true } })));
  });

  it('a skin whose capnogram is an unfilled line (zoll-like): the same', () => {
    const p = renderPlan(resolveSkin('zoll-like'));
    expect(p.lanes.find((l) => l.channel === 'co2')?.fill).toBe(false);
    attachAndWatch('zoll-like', p, p);
  });
});
