// Showcase hotfix (rehearsal 2026-10-04): loading another scenario restarts the patient on a NEW engine whose sim time
// starts again at 0, but a controller kept the old high-water time (its clock only moves forward), so the session bar
// and "Time in state" froze. The host now announces the new timeline with a `timeline` event; a controller restarts
// its clock on it and stays monotonic within one timeline.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type MonitorEngine } from '@pme/engine-core';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

class ManualTransport extends TransportBase {
  readonly kind = 'websocket' as const;
  protected write(): void {}
  protected teardown(): void {}
  open(): void {
    this.setStatus('open');
  }
  inject(m: WireMessage): void {
    this.deliver(m);
  }
}

const S = 'TLR234';
const DOC = (id: string) => ({
  id, version: 1, title: id, initialState: 'a',
  states: [{ id: 'a', label: 'A', transitions: [{ id: 'ab', to: 'b', when: { afterS: 60 } }] }, { id: 'b', label: 'B' }],
});
const loaded = (tick: number, id: string): WireEvent => ({
  type: 'commandApplied', commandId: `load-${id}`, tick,
  resolved: { command: { id: `load-${id}`, issuedBy: 'instructor', type: 'scenario', action: 'load', doc: DOC(id) } },
});
const state = (t: number): WireEvent => ({ type: 'state', t, tick: Math.round(t / 0.02), mode: 'modeled', values: {}, control: {} });

describe('timeline reset (patient restart / scenario load)', () => {
  it('a controller restarts its clock and its scenario timer on a timeline event, and stays monotonic within one timeline', () => {
    const t = new ManualTransport();
    const host = createStamper(S, 'host-1');
    const s = new ControllerSession({ session: S, transport: t });
    t.open();
    // scenario A runs to 17:54; its second state was entered at 2:39
    t.inject(host({ kind: 'event', body: [loaded(0, 'A'), { type: 'scenario', t: 0, stateId: 'a' }, { type: 'scenario', t: 159, stateId: 'b', transitionId: 'ab' }, state(1074)] }));
    t.inject(host({ kind: 'event', body: [state(1073.98)] })); // a stale event on the same timeline never rewinds
    expect(s.simT).toBe(1074);
    expect(s.scenario.timeInState(s.simT ?? 0)).toBe(1074 - 159);
    // "Load scenario" B: a new engine (t = 0), then the load, then the body runs 4 s
    t.inject(host({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0 }] }));
    expect(s.simT).toBe(0);
    expect(s.scenario.doc).toBeNull(); // the old run ended with the old body
    t.inject(host({ kind: 'event', body: [loaded(1, 'B'), { type: 'scenario', t: 0.02, stateId: 'a' }, state(4)] }));
    expect(s.simT).toBe(4);
    expect(s.scenario.doc?.id).toBe('B');
    expect(s.scenario.timeInState(s.simT ?? 0)).toBeCloseTo(3.98, 6);
    t.inject(host({ kind: 'event', body: [state(5)] }));
    expect(s.simT).toBe(5);
    s.close();
  });
});

/** A HostTarget whose engine can be replaced, as the app's AppSession does on "Restart patient" and "Load scenario". */
function swappable() {
  let engine: MonitorEngine = createEngine({ seed: 7 });
  const fns = new Set<Parameters<HostTarget['on']>[0]>();
  let off = engine.on((e) => fns.forEach((f) => f(e)));
  const target: HostTarget = {
    dispatch: (c) => engine.dispatch(c),
    snapshot: () => engine.snapshot(),
    restore: (x) => engine.restore(x),
    on: (fn) => (fns.add(fn), () => void fns.delete(fn)),
    now: () => engine.now(),
    time: () => undefined,
  };
  return {
    target,
    advance: (s: number) => engine.advanceTo(engine.now().simT + s + 1e-9),
    replace() {
      off();
      engine = createEngine({ seed: 8 });
      off = engine.on((e) => fns.forEach((f) => f(e)));
    },
  };
}

describe('HostSession.newTimeline', () => {
  let hs: HostSession | null = null;
  afterEach(() => hs?.close());

  it('sends the old timeline first, then a timeline event at the new engine time; a controller follows the new clock', async () => {
    const x = swappable();
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: x.target, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const raw = hub.connect();
    const got = collect(raw);
    const ctl = new ControllerSession({ session: S, transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    for (let i = 0; i < 120; i++) {
      x.advance(1);
      hs.emitState();
    }
    await waitFor(() => (ctl.simT ?? 0) >= 119.9, 2000, 'old timeline at 120 s');
    hs.publish({ type: 'scenario', t: 120, stateId: 'old' }); // queued on the old timeline, not yet flushed
    x.replace();
    hs.newTimeline();
    for (let i = 0; i < 4; i++) {
      x.advance(1);
      hs.emitState();
    }
    await waitFor(() => (ctl.simT ?? 999) < 10, 2000, 'controller clock restarted');
    expect(ctl.simT).toBeGreaterThan(3.9);
    expect(ctl.simT).toBeLessThan(4.1);
    const events = got.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body);
    const iOld = events.findIndex((e) => e.type === 'scenario' && e.stateId === 'old');
    const iNew = events.findIndex((e) => e.type === 'timeline');
    expect(iOld).toBeGreaterThanOrEqual(0);
    expect(iNew).toBeGreaterThan(iOld);
    expect(events[iNew]).toMatchObject({ type: 'timeline', tick: 0, t: 0 });
    ctl.close();
  });
});
