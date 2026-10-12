// FX-1: the app's Ventilator view talks to its own cockpit iframe over window.postMessage. On CI's Linux WebKit the
// BroadcastChannel link delivered the app's messages to the cockpit seconds late or never (PR #58's diagnostic run
// 38203086536: a speed change lost in 4 of 18 tries; `clock` messages stopped for 20 s, so the cockpit froze at its last
// limit and the patient went apnoeic after "Return here"). Also: a linked cockpit drawn at ≈ 5 frames/s keeps the pace,
// and a burst of late frames moves the link's offset once, not once per frame.
import { describe, expect, it } from 'vitest';
import type { Command, DispatchResult, EngineEvent } from '@pme/engine-core';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, createWindowPort, LINK_TICK_S, type LinkMsg, type LinkPort, type PortWindow } from '../src/index.ts';

/** Two fake same-origin windows: `w.postMessage` fires a `message` event on `w` whose `source` is the other window. */
function windows(origin = 'http://127.0.0.1:5173') {
  const mk = () => {
    const fns = new Set<(e: MessageEvent) => void>();
    const w = {
      location: { origin },
      fns,
      peer: null as unknown,
      postMessage(data: unknown, target: string) {
        if (target !== origin) return;
        const ev = { data: structuredClone(data), origin, source: w.peer } as unknown as MessageEvent;
        for (const fn of [...fns]) fn(ev);
      },
      addEventListener: (_t: 'message', fn: (e: MessageEvent) => void) => void fns.add(fn),
      removeEventListener: (_t: 'message', fn: (e: MessageEvent) => void) => void fns.delete(fn),
    };
    return w;
  };
  const top = mk();
  const ifr = mk();
  top.peer = ifr;
  ifr.peer = top;
  return { top, ifr };
}

describe('FX-1 window port', () => {
  it('carries link messages both ways between a page and its iframe', () => {
    const { top, ifr } = windows();
    const app = createWindowPort('vabc', () => ifr, top as unknown as PortWindow);
    const cockpit = createWindowPort('vabc', () => top, ifr as unknown as PortWindow);
    const atCockpit: LinkMsg[] = [];
    const atApp: LinkMsg[] = [];
    cockpit.onMessage((m) => atCockpit.push(m));
    app.onMessage((m) => atApp.push(m));
    app.post({ v: 1, kind: 'time', action: 'scale', value: 4 });
    cockpit.post({ v: 1, kind: 'cmds', tick: 7, cmds: [] });
    expect(atCockpit).toEqual([{ v: 1, kind: 'time', action: 'scale', value: 4 }]);
    expect(atApp).toEqual([{ v: 1, kind: 'cmds', tick: 7, cmds: [] }]);
  });

  it('takes only its peer, its origin and its session; close stops it', () => {
    const { top, ifr } = windows();
    const got: LinkMsg[] = [];
    const cockpit = createWindowPort('vabc', () => top, ifr as unknown as PortWindow);
    cockpit.onMessage((m) => got.push(m));
    const msg = { v: 1, kind: 'time', action: 'pause' } as const;
    const send = (data: unknown, o: { origin?: string; source?: unknown } = {}) => {
      for (const fn of [...ifr.fns]) fn({ data, origin: o.origin ?? top.location.origin, source: 'source' in o ? o.source : top } as unknown as MessageEvent);
    };
    send({ ch: 'pme-vent/vabc', m: msg }, { source: {} }); // another window
    send({ ch: 'pme-vent/vabc', m: msg }, { origin: 'https://elsewhere.example' }); // another origin
    send({ ch: 'pme-vent/vother', m: msg }); // another session
    send({ ch: 'pme-vent/vabc', m: { hello: 1 } }); // not a link message
    send({ __pme: 1, m: msg }); // the controller's postMessage envelope
    expect(got).toEqual([]);
    send({ ch: 'pme-vent/vabc', m: msg });
    expect(got).toEqual([msg]);
    cockpit.close();
    send({ ch: 'pme-vent/vabc', m: msg });
    expect(got).toHaveLength(1);
    expect(ifr.fns.size).toBe(0);
  });

  it('a post with no peer window (the iframe between documents) is dropped, not thrown', () => {
    const { top } = windows();
    const app = createWindowPort('vabc', () => null, top as unknown as PortWindow);
    expect(() => app.post({ v: 1, kind: 'time', action: 'scale', value: 2 })).not.toThrow();
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
