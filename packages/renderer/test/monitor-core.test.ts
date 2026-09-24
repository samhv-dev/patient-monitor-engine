import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { MonitorCore } from '../src/monitor-core.ts';
import type { ClockAnchor } from '../src/protocol.ts';
import { FakeCtx } from './fake-ctx.ts';

function make(fps: 60 | 30 = 60) {
  const ctx = new FakeCtx();
  const canvas = { width: 0, height: 0 };
  const posts: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [];
  const core = new MonitorCore(canvas, ctx, { cssW: 1056, cssH: 300, dpr: 2 }, { engine: { seed: 1 }, fps }, (anchor, events) =>
    posts.push({ anchor, events }),
  );
  return { core, ctx, canvas, posts };
}

describe('MonitorCore', () => {
  it('sizes the backing store to CSS size × DPR and draws labels and a calibration bar once', () => {
    const { canvas, ctx } = make();
    expect(canvas).toEqual({ width: 2112, height: 600 });
    expect(ctx.texts).toEqual(['II  M', 'V5  M']);
  });

  it('sim time follows wall time at 60 and at 30 fps', () => {
    for (const fps of [60, 30] as const) {
      const { core } = make(fps);
      const t0 = 1_000_000;
      for (let f = 0; f <= 600; f++) core.frame(t0 + (f * 1000) / 60);
      expect(core.clock.renderT).toBeGreaterThan(9.9);
      expect(core.clock.renderT).toBeLessThanOrEqual(10.0001);
    }
  });

  it('posts engine events with a clock anchor, and measurements arrive about once per second', () => {
    const { core, posts } = make();
    for (let f = 0; f <= 600; f++) core.frame(5000 + (f * 1000) / 60);
    const events = posts.flatMap((p) => p.events);
    expect(events.some((e) => e.type === 'beat')).toBe(true);
    expect(events.some((e) => e.type === 'tone')).toBe(true);
    expect(events.filter((e) => e.type === 'measurement').length).toBeGreaterThanOrEqual(9);
    const a = posts[posts.length - 1]!.anchor;
    expect(a.timeScale).toBe(1);
    expect(a.epochMs).toBeCloseTo(15000, 6);
  });

  it('a filter command updates the chrome letter', () => {
    const { core, ctx } = make();
    ctx.texts = [];
    const r = core.command({ id: 'f', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'diagnostic' } });
    expect(r.accepted).toBe(true);
    expect(ctx.texts).toEqual(['II  D', 'V5  D']);
  });
});

describe('MonitorCore hidden-tab catch-up', () => {
  it('advances by the full hidden time in bulk, without the 250 ms clamp', () => {
    const { core } = make();
    core.frame(1000);
    core.frame(1016);
    core.catchUp(61_016);
    expect(core.clock.simT).toBeGreaterThanOrEqual(59.98);
    expect(core.clock.simT).toBeLessThanOrEqual(60.02);
    expect(core.engine.now().simT).toBe(core.clock.simT);
  });
});
