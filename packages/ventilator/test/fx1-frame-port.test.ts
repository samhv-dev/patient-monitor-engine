// FX-1: the app's Ventilator view talks to its own cockpit iframe over a direct frame port. On CI's Linux WebKit messages
// to the hidden cockpit iframe (BroadcastChannel and window.postMessage alike) came seconds late or never (PR #58's
// diagnostic runs 38203086536 and 38207874736: a speed change lost in 4 of 18 and 6 of 24 tries). Also: a linked cockpit
// drawn at ≈ 5 frames/s keeps the pace, and a burst of late frames moves the link's offset once, not once per frame.
import type { Command, DispatchResult, EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createFramePort, createLocalPortPair, createVentDriver, FRAME_PORT_KEY, LINK_TICK_S, type LinkMsg, type LinkPort } from '../src/index.ts';

const tick = async () => { for (let i = 0; i < 3; i++) await Promise.resolve(); };

describe('FX-1 frame port', () => {
  it('carries link messages both ways between a page and its iframe, after the post returns, as copies', async () => {
    const top = {};
    const ifr = {};
    const app = createFramePort('vabc', () => ifr, top);
    const cockpit = createFramePort('vabc', () => top, ifr);
    const atCockpit: LinkMsg[] = [];
    const atApp: LinkMsg[] = [];
    cockpit.onMessage((m) => atCockpit.push(m));
    app.onMessage((m) => atApp.push(m));
    const scale = { v: 1, kind: 'time', action: 'scale', value: 4 } as const satisfies LinkMsg;
    app.post(scale);
    cockpit.post({ v: 1, kind: 'cmds', tick: 7, cmds: [] });
    expect(atCockpit).toEqual([]); // not inside the poster's call
    await tick();
    expect(atCockpit).toEqual([scale]);
    expect(atCockpit[0]).not.toBe(scale); // cloned, as a message would be
    expect(atApp).toEqual([{ v: 1, kind: 'cmds', tick: 7, cmds: [] }]);
  });

  it('only its session; nothing before the peer listens, from a foreign peer, or after close', async () => {
    const top = {};
    const ifr = {};
    const app = createFramePort('vabc', () => ifr, top);
    const msg = { v: 1, kind: 'time', action: 'pause' } as const satisfies LinkMsg;
    app.post(msg); // the cockpit has not loaded yet: dropped
    const got: LinkMsg[] = [];
    const cockpit = createFramePort('vabc', () => top, ifr);
    cockpit.onMessage((m) => got.push(m));
    createFramePort('vother', () => ifr, top).post(msg); // another session
    (ifr as Record<string, Record<string, (m: unknown) => void>>)[FRAME_PORT_KEY]!['pme-vent/vabc']!({ hello: 1 }); // not a link message
    const foreign = createFramePort('vabc', () => { throw new DOMException('cross-origin', 'SecurityError'); }, {});
    expect(() => foreign.post(msg)).not.toThrow();
    await tick();
    expect(got).toEqual([]);
    app.post(msg);
    await tick();
    expect(got).toEqual([msg]);
    cockpit.close();
    app.post(msg);
    await tick();
    expect(got).toHaveLength(1);
    expect(createFramePort('vabc', () => null, top).post(msg)).toBeUndefined(); // the iframe between documents
  });
});

describe('FX-1 linked cockpit at a low frame rate', () => {
  const linked = () => {
    const port: LinkPort & { emit(m: LinkMsg): void } = {
      fns: new Set<(m: LinkMsg) => void>(),
      post: () => {},
      onMessage(fn: (m: LinkMsg) => void) { (this as unknown as { fns: Set<(m: LinkMsg) => void> }).fns.add(fn); return () => {}; },
      close: () => {},
      emit(m: LinkMsg) { for (const fn of (this as unknown as { fns: Set<(m: LinkMsg) => void> }).fns) fn(m); },
    } as unknown as LinkPort & { emit(m: LinkMsg): void };
    const d = createVentDriver(port, 'normal');
    port.emit({ v: 1, kind: 'clock', ventTick: 1e6 }); // the engine allows far ahead: only the frame clamp limits
    port.emit({ v: 1, kind: 'time', action: 'scale', value: 4 });
    return d;
  };

  it('frames 200 ms apart at ×4 run 0.8 s of ventilator time each (was 0.4: half the session speed)', () => {
    const d = linked();
    d.frame(0);
    for (let i = 1; i <= 10; i++) d.frame(i * 200);
    expect(d.simT()).toBeCloseTo(8, 6);
  });

  it('frames ≤ 100 ms apart step exactly as before; a stalled tab still counts at most 0.5 s', () => {
    const d = linked();
    d.frame(0);
    for (let i = 1; i <= 50; i++) d.frame(i * 16);
    expect(d.simT()).toBeCloseTo(Math.floor((50 * 0.016 * 4) / LINK_TICK_S + 1e-9) * LINK_TICK_S, 6);
    const before = d.simT();
    d.frame(50 * 16 + 30_000); // 30 s without a frame
    expect(d.simT() - before).toBeLessThanOrEqual(0.5 * 4 + 1e-9);
  });

  it('free-running (no link) keeps the v1.9 0.1 s clamp', () => {
    const d = createVentDriver(null, 'normal');
    d.frame(0);
    for (let i = 1; i <= 10; i++) d.frame(i * 200);
    expect(d.simT()).toBeCloseTo(1, 6);
  });
});

describe('FX-1 a burst of late frames', () => {
  // PR #58's run 38205628560 (window port in, CI WebKit): `clock` still stopped for 10–30 s. Every frame of a late burst
  // added its own lateness to the offset although all were stamped with the same old one: 40 frames 35 ticks late moved
  // it by ≈ 700 ticks (14 s), the clock limit fell 14 s behind the engine, the cockpit stopped, the 5 s watchdog fired.
  it('moves the offset by the lateness once: the next frame lands just ahead of the engine, the clock keeps up', async () => {
    const [ventPort, monPort] = createLocalPortPair();
    let engTick = 0;
    const sent: Command[] = [];
    const mon = {
      dispatch: (c: Command): DispatchResult => (sent.push(c), { accepted: true, tick: Math.max(c.atTick ?? 0, engTick + 1) }),
      on: (fn: (e: EngineEvent) => void) => ((emit = fn), () => {}),
    };
    let emit: (e: EngineEvent) => void = () => {};
    attachMonitorToLink(mon, monPort);
    const clocks: number[] = [];
    ventPort.onMessage((m) => void (m.kind === 'clock' && clocks.push(m.ventTick)));
    const frame = (k: number) => ventPort.post({ v: 1, kind: 'cmds', tick: k, cmds: [{ id: `f${k}`, issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', frame: {} } as unknown as Command] });
    const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
    frame(1); // the probe: offset = 1 − 1 + LEAD_TICKS
    await settle();
    engTick = 100; // a slow runner: the engine is 2 s on before the cockpit's next animation frame
    for (let k = 2; k <= 41; k++) frame(k); // that frame's burst, all stamped with the old offset, all late
    await settle();
    emit({ type: 'vitals', t: engTick * LINK_TICK_S } as unknown as EngineEvent); // the engine's time reaches the link
    frame(42);
    await settle();
    const at = sent.at(-1)?.atTick as number;
    expect(at).toBeGreaterThan(engTick); // not late any more
    expect(at).toBeLessThanOrEqual(engTick + 41); // and not seconds in the future (was ≈ 840 ticks ahead)
    expect(Math.max(...clocks)).toBeGreaterThan(42); // the clock lets the cockpit (at tick 42) keep running
  });
});
