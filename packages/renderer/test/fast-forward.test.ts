// Stage 10 Task 2 (the owner's fast-forward, 22 Oct demonstration): MonitorCore runs a fast-forward in steps without
// drawing, posts every step's events, holds its clock between steps, and gives the clock back as it found it; after it the
// lanes run on with no mark at the jump (FX-23); above ×4 the beat tones are off (owner's decision 4).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { MonitorCore } from '../src/monitor-core.ts';
import { BEAT_TONE_MAX_SCALE, beatToneAt } from '../src/mount.ts';
import type { ClockAnchor } from '../src/protocol.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const make = (posts: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [], ctx = new FakeCtx()) =>
  new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH: 300, dpr: 1 }, { engine: { seed: 1, truthHz: 1, patient: { sensors: { spo2: 'on' } } }, waves: ['pleth'] }, (anchor, events) => posts.push({ anchor, events }));
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
const frames = (c: MonitorCore, fromMs: number, toMs: number) => {
  for (let ms = fromMs; ms <= toMs; ms += 1000 / 60) c.frame(1_000_000 + ms);
};

describe('MonitorCore.advance (fast-forward steps)', () => {
  it('runs exactly the asked ticks, posts their events, and draws nothing while the fast-forward holds the clock', () => {
    const posts: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [];
    const c = make(posts);
    frames(c, 0, 1000);
    const t0 = c.engine.now().tick;
    const drawn = lanes(c).map((l) => l.lastDrawnIndex);
    posts.length = 0;
    expect(c.advance(250, false)).toEqual({ tick: t0 + 250, simT: (t0 + 250) * 0.02 });
    expect(posts).toHaveLength(1);
    expect(posts[0]!.events.some((e) => e.type === 'measurement')).toBe(true); // 5 s of the engine's events
    frames(c, 1000, 3000); // 2 s of frames during the fast-forward: no tick, no drawing
    expect(c.engine.now().tick).toBe(t0 + 250);
    expect(lanes(c).map((l) => l.lastDrawnIndex)).toEqual(drawn);
    c.advance(250, true);
    expect(c.engine.now().tick).toBe(t0 + 500);
    frames(c, 3000, 3100); // the first frames after it: the clock runs from the new time, the lanes backfill there
    expect(c.engine.now().tick - (t0 + 500)).toBeLessThan(10); // not the 2 s of wall time the fast-forward took
    for (const l of lanes(c)) expect(l.lastDrawnIndex).toBeGreaterThan(Math.floor((t0 + 500) * 0.02 * l.cfg.rate) - 1);
  });

  it('a session paused before the fast-forward is still paused after it', () => {
    const c = make();
    frames(c, 0, 500);
    c.clock.pause();
    c.advance(100, false);
    c.advance(100, true);
    const t = c.engine.now().tick;
    frames(c, 500, 1500);
    expect(c.clock.paused).toBe(true);
    expect(c.engine.now().tick).toBe(t);
  });

  it('a hidden-tab catch-up during the fast-forward adds nothing (the span is the span)', () => {
    const c = make();
    frames(c, 0, 500);
    const t0 = c.engine.now().tick;
    c.advance(50, false);
    c.catchUp(1_000_000 + 500 + 5000); // the window was hidden for 5 s meanwhile
    c.catchUp(1_000_000 + 500 + 10_000);
    c.advance(50, true);
    expect(c.engine.now().tick).toBe(t0 + 100);
  });

  it('steps give the same engine as frames (determinism): same tick, same truth', () => {
    const a = make();
    const b = make();
    frames(a, 0, 1000);
    frames(b, 0, 1000);
    const end = a.engine.now().tick + 1500; // 30 s
    for (let k = a.engine.now().tick; k < end; k += 25) a.advance(Math.min(25, end - k), k + 25 >= end);
    b.engine.advanceTo(end * 0.02);
    expect(a.engine.now().tick).toBe(b.engine.now().tick);
    expect(a.engine.snapshot().state).toEqual(b.engine.snapshot().state);
  });

  // yields to the event loop between chunks: a 46 s synchronous block on a loaded CI runner starved vitest's progress
  // messages ("Timeout calling onTaskUpdate", run 38181144224); the same steps, the same 300 s at ×4
  it('the NIBP cycle runs through the span: the same results at the same times as without a fast-forward', async () => {
    const yieldToLoop = () => new Promise((r) => setTimeout(r, 0));
    const results = (posts: Array<{ events: EngineEvent[] }>) =>
      posts.flatMap((p) => p.events).flatMap((e) => (e.type === 'nibp' && e.result ? [{ t: e.t, ...e.result }] : []));
    const pa: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [];
    const pb: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [];
    const a = make(pa);
    const b = make(pb);
    for (const c of [a, b]) c.command({ id: 'nibp', issuedBy: 't', type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 1 } });
    for (let k = 0; k < 15_000; k += 25) {
      a.advance(25, k + 25 >= 15_000); // 300 s fast-forwarded
      if (k % 500 === 0) await yieldToLoop();
    }
    b.clock.timeScale = 4;
    for (let from = 0; from <= 300_000 / 4 + 100; from += 5000) {
      frames(b, from, Math.min(from + 5000 - 1, 300_000 / 4 + 100)); // the same 300 s at ×4, drawn (5 s of frames a chunk)
      await yieldToLoop();
    }
    expect(b.engine.now().tick).toBeGreaterThanOrEqual(15_000);
    const ra = results(pa);
    const rb = results(pb).filter((r) => r.t <= 300);
    expect(ra.length).toBeGreaterThanOrEqual(4); // one a minute
    expect(ra).toEqual(rb);
  }, 180_000); // pure CPU comparison of 300 s at two speeds: 43 s on a loaded CI runner (run 38169697950), 4 s alone

  // FX-23 (owner's review of rc.2): a fast-forward used to leave a thin line and a "05:08" label on every lane, each at
  // that lane's own sweep cursor. The lanes now look like a monitor that simply ran on.
  const fastForward = (c: MonitorCore, ticks: number) => {
    const end = c.engine.now().tick + ticks;
    for (let k = c.engine.now().tick; k < end; k += 25) c.advance(Math.min(25, end - k), k + 25 >= end);
  };

  it('after a fast-forward no mark is queued and none is drawn: no time label, no full-height line on any lane', () => {
    const ctx = new FakeCtx();
    const c = make([], ctx);
    frames(c, 0, 1000);
    fastForward(c, 15_000); // 5 min
    expect((c as unknown as { overlays: { due(t: number): unknown[] } }).overlays.due(Infinity)).toEqual([]);
    ctx.calls.length = 0;
    ctx.texts.length = 0;
    frames(c, 1000, 13_000); // 12 s of frames after the span (the old mark stayed a lap)
    expect(ctx.texts.filter((x) => /^\d\d:\d\d$/.test(x))).toEqual([]);
    for (const l of lanes(c)) {
      const { x, y, width, height } = l.cfg;
      const tall = ctx.calls.filter((k, i) => {
        const prev = ctx.calls[i - 1];
        return k.op === 'lineTo' && prev?.op === 'moveTo' && prev.args[0] === k.args[0] && k.args[0]! >= x && k.args[0]! <= x + width && Math.abs(k.args[1]! - prev.args[1]!) >= 0.9 * height && Math.min(k.args[1]!, prev.args[1]!) >= y - 1;
      });
      expect(tall).toEqual([]);
    }
  });

  it('after a fast-forward every lane is backfilled across its width at once: no gap is left at the jump', () => {
    const c = make();
    frames(c, 0, 1000);
    fastForward(c, 6000); // 2 min
    const reads: Array<{ ch: string; from: number; n: number }> = [];
    const read = c.engine.readSamples.bind(c.engine);
    c.engine.readSamples = (ch, from, out) => (reads.push({ ch, from, n: out.length }), read(ch, from, out));
    frames(c, 1000, 1000); // the first frame after the span
    for (const l of lanes(c)) {
      const { width, eraseGapPx, rate } = l.cfg;
      const endIdx = l.lastDrawnIndex;
      const span = ((width - eraseGapPx) / l.pxPerS) * rate;
      expect(reads.some((r) => r.from <= endIdx - 0.95 * span && r.from + r.n - 1 >= endIdx)).toBe(true);
    }
  });
});

describe('the beat tone above ×4 (owner: at ×8 it would beep ≈ 10 times a second)', () => {
  it('QRS beep and pulse tone play up to ×4 and are off above it; alarms and device tones always play', () => {
    expect(BEAT_TONE_MAX_SCALE).toBe(4);
    for (const k of [1, 2, 4]) expect(['qrs', 'pulse'].map((kind) => beatToneAt(kind, k))).toEqual([true, true]);
    expect(['qrs', 'pulse'].map((kind) => beatToneAt(kind, 8))).toEqual([false, false]);
    for (const kind of ['alarmBurst', 'charge', 'chargeReady', 'shock', 'nibpDone']) expect(beatToneAt(kind, 8)).toBe(true);
  });
});
