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

describe('MonitorCore lane changes (review L3)', () => {
  const laneClears = (ctx: FakeCtx) =>
    ctx.calls.filter((c) => c.op === 'fillRect' && c.args[0] === 56 && c.args[2] === 1000).map((c) => c.args[1]);

  it('a filter change redraws only the chrome and keeps every trace', () => {
    const { core, ctx } = make();
    for (let f = 0; f <= 120; f++) core.frame(5000 + (f * 1000) / 60);
    ctx.clear();
    ctx.texts = [];
    core.command({ id: 'f', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'diagnostic' } });
    expect(laneClears(ctx)).toEqual([]);
    expect(ctx.texts).toEqual(['II  D', 'V5  D']);
  });

  it('a lead change clears only that lane', () => {
    const { core, ctx } = make();
    for (let f = 0; f <= 120; f++) core.frame(5000 + (f * 1000) / 60);
    ctx.clear();
    ctx.texts = [];
    core.command({ id: 'l', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } });
    expect(laneClears(ctx)).toEqual([150]);
    expect(ctx.texts).toEqual(['V1  M']);
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

  it('carries the fractional tick across hidden pumps, so sim time does not fall behind (review L1)', () => {
    const { core } = make();
    core.frame(1000);
    for (let k = 1; k <= 60; k++) core.catchUp(1000 + k * 1010); // 1 Hz hidden pump with 10 ms of jitter
    expect(core.clock.renderT).toBeCloseTo(60.6, 1);
    expect(Math.abs(core.clock.renderT - 60.6)).toBeLessThan(0.021);
  });

  it('posts the events generated while hidden instead of letting the batch grow (review L2)', () => {
    const { core, posts } = make();
    core.frame(1000);
    const before = posts.length;
    core.catchUp(11_000);
    expect(posts.length).toBe(before + 1);
    expect(posts[posts.length - 1]!.events.some((e) => e.type === 'beat')).toBe(true);
  });
});

describe('MonitorCore Stage 2 waveform lanes', () => {
  it('adds ABP and pleth lanes below the ECG lanes with label and scale chrome, and draws them in their colours', () => {
    const ctx = new FakeCtx();
    const canvas = { width: 0, height: 0 };
    const core = new MonitorCore(
      canvas,
      ctx,
      { cssW: 1056, cssH: 400, dpr: 1 },
      { engine: { seed: 1, patient: { sensors: { abp: 'connected' } } }, waves: ['abp', 'pleth'] },
      () => {},
    );
    expect(ctx.texts).toEqual(['II  M', 'V5  M', 'ABP', '150', '0', 'Pleth']);
    ctx.clear();
    for (let f = 0; f <= 180; f++) core.frame(1000 + (f * 1000) / 60);
    const styles = new Set(ctx.calls.filter((c) => c.op === 'stroke').map((c) => c.style));
    expect(styles.has('#ff3b3b')).toBe(true);
    expect(styles.has('#00e5ff')).toBe(true);
  });

  it('a lane whose sensor is none draws nothing', () => {
    const ctx = new FakeCtx();
    const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 800, cssH: 300, dpr: 1 }, { engine: { seed: 1 }, waves: ['cvp'] }, () => {});
    ctx.clear();
    for (let f = 0; f <= 60; f++) core.frame(1000 + (f * 1000) / 60);
    expect(ctx.calls.some((c) => c.op === 'stroke' && c.style === '#3d8bff')).toBe(false);
  });

  it('a lead change on lane 1 does not touch the wave lanes, and the filter letter redraw keeps the wave labels', () => {
    const ctx = new FakeCtx();
    const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH: 400, dpr: 1 }, { engine: { seed: 1 }, waves: ['pleth'] }, () => {});
    ctx.texts = [];
    core.command({ id: 'l', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 1 } });
    expect(ctx.texts).toEqual(['V1  M']);
  });
});
