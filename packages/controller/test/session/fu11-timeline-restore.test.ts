// FU-11 Tasks E3–E4 (external review F04, F09; browser audit BA04, BA05; showcase-hotfix notes): ONE timeline mechanism —
// the hotfix's `timeline` event — now also marks a bookmark restore. Controllers' clocks go back with the engine (the
// scenario run continues); a viewer drops its old anchor and resyncs; a restart also clears the old engine's ECG chrome.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'TLB234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());

function rig() {
  const a = createEngine({ seed: 7 });
  const b = createEngine({ seed: 7 });
  a.advanceTo(1);
  const hub = createInProcessHub();
  const t: HostTarget = { dispatch: (c) => a.dispatch(c), snapshot: () => a.snapshot(), restore: (s) => a.restore(s), on: (f) => a.on(f), now: () => a.now(), time: () => undefined };
  hs = new HostSession({ session: S, target: t, stateIntervalMs: 0, wallNow: () => 0 });
  hs.addTransport(hub.connect());
  const raw = collect(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), wallNow: () => 0 });
  const viewer = new ViewerSync({
    session: S, transport: hub.connect(), engineVersion: b.version, wallNow: () => 0,
    target: { restore: (s) => b.restore(s), dispatch: (c) => b.dispatch(c), on: (f, ty) => b.on(f, ty), renderT: () => b.now().simT, tick: () => b.now().tick, setRate: () => undefined, setPaused: () => undefined, jumpTo: (x) => b.advanceTo(x) },
  });
  return { a, b, hs, raw, ctl, viewer };
}

describe('FU-11 E3: a bookmark restore is a new timeline (F04, F09; BA04, BA05)', () => {
  it('controller and viewer adopt the restored time; the old anchor does not pull the viewer forward', async () => {
    const r = rig();
    await waitFor(() => r.viewer.status === 'synced');
    await r.hs.submit({ id: 'mark', issuedBy: 'test', type: 'scenario', action: 'bookmark', target: 'one' });
    r.a.advanceTo(5);
    r.hs.emitState();
    r.hs.flush();
    await waitFor(() => (r.ctl.simT ?? 0) >= 5);
    await r.hs.submit({ id: 'back', issuedBy: 'test', type: 'scenario', action: 'restoreBookmark', target: 'one' });
    await waitFor(() => r.viewer.resyncs > 0 && r.viewer.status === 'synced');
    r.viewer.follow();
    expect(r.b.now().simT).toBeLessThan(2);
    expect(r.ctl.simT).toBeLessThan(2);
    const ev = r.raw.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body);
    expect(ev.find((e) => e.type === 'timeline')).toMatchObject({ type: 'timeline', cause: 'restore', tick: 50 });
    r.ctl.close();
    r.viewer.close();
  });
});

describe('FU-11 E3 (R50 F5): a reloaded host is a new host — its speed, not the old one\'s', () => {
  it('a viewer that followed a ×4 host runs at ×1 after a new host (that never set a speed) says hello', async () => {
    const hub = createInProcessHub();
    const tx = hub.connect();
    const rates: number[] = [];
    const b = createEngine({ seed: 7 });
    const viewer = new ViewerSync({
      session: S, transport: hub.connect(), engineVersion: b.version, wallNow: () => 0, delayS: 0,
      target: { restore: (s) => b.restore(s), dispatch: (c) => b.dispatch(c), on: (f, ty) => b.on(f, ty), renderT: () => b.now().simT, tick: () => b.now().tick, setRate: (k) => rates.push(k), setPaused: () => undefined, jumpTo: () => undefined },
    });
    const old = createStamper(S, 'host-old');
    const scale: WireEvent = { type: 'commandApplied', commandId: 'x4', tick: 0, resolved: { command: { id: 'x4', issuedBy: 'i', type: 'time', action: 'scale', value: 4 }, replay: true } };
    tx.send(old({ kind: 'event', body: [scale] }));
    tx.send(old({ kind: 'snapshot', body: b.snapshot() }));
    await waitFor(() => viewer.status === 'synced');
    tx.send(old({ kind: 'event', body: [{ type: 'state', t: 0, tick: 0, mode: 'manual', values: {}, control: {} } as unknown as WireEvent] }));
    await new Promise((r) => setTimeout(r, 0));
    viewer.follow();
    expect(rates.at(-1)).toBeGreaterThan(3); // following the ×4 host
    const fresh = createStamper(S, 'host-new'); // the instructor reloaded: same code, a new host, no speed set
    tx.send(fresh({ kind: 'hello', role: 'host' }));
    tx.send(fresh({ kind: 'snapshot', body: b.snapshot() }));
    await waitFor(() => viewer.status === 'synced');
    tx.send(fresh({ kind: 'event', body: [{ type: 'state', t: 0, tick: 0, mode: 'manual', values: {}, control: {} } as unknown as WireEvent] }));
    await new Promise((r) => setTimeout(r, 0));
    viewer.follow();
    expect(rates.at(-1)).toBeLessThan(1.2);
    viewer.close();
  });
});

describe('FU-11 E4: the timeline cause decides what ends', () => {
  const host = createStamper(S, 'host-1');
  const loaded: WireEvent = { type: 'commandApplied', commandId: 'load', tick: 0, resolved: { command: { id: 'load', issuedBy: 'i', type: 'scenario', action: 'load', doc: { id: 'D', version: 1, title: 'D', initialState: 'a', states: [{ id: 'a' }] } } } };
  it('restore keeps the scenario run; restart (or no cause) ends it', async () => {
    const hub = createInProcessHub();
    const tx = hub.connect();
    const ctl = new ControllerSession({ session: S, transport: hub.connect() });
    tx.send(host({ kind: 'event', body: [loaded, { type: 'scenario', t: 0, stateId: 'a' }, { type: 'timeline', t: 0, tick: 0, cause: 'restore' }] }));
    await waitFor(() => ctl.simT === 0);
    expect(ctl.scenario.doc?.id).toBe('D');
    tx.send(host({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0 }] }));
    await waitFor(() => ctl.scenario.doc === null);
    ctl.close();
  });
  it('a restart forgets the old engine\'s lead and filter for late joiners; a restore keeps them', async () => {
    const e = createEngine({ seed: 3 });
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined }, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: S, transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    expect((await ctl.send({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V5', lane: 0 } } as never)).accepted).toBe(true);
    const late = async () => {
      const t = hub.connect();
      const got = collect(t);
      t.send(createStamper(S, `late-${Math.random()}`)({ kind: 'hello', role: 'viewer' }));
      await waitFor(() => got.some((m) => m.kind === 'snapshot'));
      return got.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body).filter((x) => x.type === 'commandApplied');
    };
    hs.newTimeline('restore');
    expect((await late()).length).toBe(1);
    hs.newTimeline('restart');
    expect((await late()).length).toBe(0);
    ctl.close();
  });
});
