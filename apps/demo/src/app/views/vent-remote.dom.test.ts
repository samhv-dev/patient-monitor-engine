// @vitest-environment happy-dom
// Plan room-and-instruments.md R8c: the host drives its engine from a GRANTED remote cockpit exactly as the in-window
// Ventilator view does (attachMonitorToLink on session.linked: the engine is the master clock, frames stamped on the
// host, mirrored to a same-browser viewer, every network follower holding), one cockpit at a time, and hands the patient
// to the engine's own ventilator with the cockpit's last settings when it is hidden, closed, revoked or silent for 1 s.
// The real AppSession, HostSession, desk and a real cockpit (its link driver over the relay port) on a fake relay that
// passes every frame through the real guard; the monitor is a real engine on the fake clock (no worker, no canvas).
import type { ManagedTransport, TransportStatus, WireEvent, WireMessage } from '@pme/controller';
import type { EngineEvent, PatientSnapshot } from '@pme/engine-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Fake = ManagedTransport & { id: string; muted: boolean; got: WireMessage[] };
const net = vi.hoisted(() => ({
  relay: [] as Array<{ peer: unknown; fns: Array<(m: unknown) => void>; left: Array<(id: string) => void> }>,
  bc: [] as Array<{ fns: Array<(m: unknown) => void> }>,
  engines: [] as unknown[],
  dispatched: [] as Array<{ id: string; type: string; tick: number; accepted: boolean; event?: Record<string, unknown> }>,
  dropped: 0,
}));

vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  /** One end of a fake link: what it sends reaches every other end of the same list, as JSON, through the real guard. */
  const end = (list: Array<{ fns: Array<(m: unknown) => void>; left?: Array<(id: string) => void> }>, kind: 'websocket' | 'broadcastChannel'): ManagedTransport => {
    const me = { fns: [] as Array<(m: unknown) => void>, left: [] as Array<(id: string) => void>, muted: false };
    list.push(me);
    const t = {
      kind, status: 'open' as TransportStatus,
      get muted() {
        return me.muted;
      },
      set muted(v: boolean) {
        me.muted = v;
      },
      send: (m: WireMessage) => {
        if (me.muted) return;
        const copy = real.parseWireMessage(JSON.stringify(m));
        if (!copy) return void net.dropped++;
        for (const p of [...list]) if (p !== me && !(p as { muted?: boolean }).muted) for (const fn of [...p.fns]) fn(JSON.parse(JSON.stringify(copy)));
      },
      onMessage: (fn: (m: WireMessage) => void) => (me.fns.push(fn as (m: unknown) => void), () => void me.fns.splice(me.fns.indexOf(fn as (m: unknown) => void), 1)),
      onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => {}),
      onPeerLeft: (fn: (id: string) => void) => (me.left.push(fn), () => void me.left.splice(me.left.indexOf(fn), 1)),
      close: () => void list.splice(list.indexOf(me), 1),
    };
    (me as { peer?: unknown }).peer = t;
    return t as unknown as ManagedTransport;
  };
  return {
    ...real,
    createWebSocketTransport: () => end(net.relay as never, 'websocket'),
    createBroadcastChannelTransport: () => end(net.bc, 'broadcastChannel'),
    __end: end,
  };
});
vi.mock('@pme/renderer', async () => {
  const { resolveSkin } = await import('@pme/skins');
  const { createEngine } = await import('@pme/engine-core');
  return {
    version: '0.0.0-test',
    normalIbpScales: (s: unknown) => s ?? {},
    // The host's monitor: a real engine, advanced every 20 ms of (fake) wall time at the session's speed
    mountMonitor: (el: HTMLElement, o: { skin: string; engine: Parameters<typeof createEngine>[0] }) => {
      const e = createEngine(o.engine);
      net.engines.push(e);
      let scale = 1;
      let paused = false;
      const fns = new Set<(x: EngineEvent) => void>();
      e.on((x) => {
        for (const fn of [...fns]) fn(x);
      });
      const timer = setInterval(() => void (!paused && e.advanceTo((e.now().tick + scale) * 0.02 + 1e-9)), 20);
      el.append(Object.assign(document.createElement('div'), { className: 'pme-monitor' }));
      return {
        skin: resolveSkin(o.skin),
        ibpFixed: {},
        dispatch: (c: { id: string; type: string; event?: Record<string, unknown> }) => {
          const r = e.dispatch(c as never);
          net.dispatched.push({ id: c.id, type: c.type, tick: r.tick, accepted: r.accepted, ...(c.event ? { event: c.event } : {}) });
          return Promise.resolve(r);
        },
        on: (fn: (x: EngineEvent) => void) => (fns.add(fn), () => void fns.delete(fn)),
        snapshot: () => Promise.resolve(e.snapshot()),
        restore: (s: PatientSnapshot) => Promise.resolve(e.restore(s)),
        advance: (n: number) => Promise.resolve((e.advanceTo((e.now().tick + n) * 0.02 + 1e-9), e.now())),
        setTimeScale: (k: number) => void (scale = k),
        pause: () => void (paused = true),
        resume: () => void (paused = false),
        enableSound: () => Promise.resolve(),
        disableSound: () => {},
        setSkin: () => Promise.resolve(),
        setIbpScales: () => {},
        destroy: () => clearInterval(timer),
      };
    },
  };
});

const { createStamper } = await import('@pme/controller');
const ctl = (await import('@pme/controller')) as unknown as { __end: (l: unknown, k: string) => Fake };
const { createEngine } = await import('@pme/engine-core');
const { createLocalPortPair, createRelayPort, createVentDriver, ventWireOver } = await import('@pme/ventilator');
const { AppSession } = await import('../session.ts');
const { cockpitDesk, COCKPIT_SILENCE_MS, engineVentilation, serveRemoteCockpit } = await import('./vent.ts');
const { VENTILATOR_REASONS } = await import('@pme/controller');

const CODE = 'VNTH2K';
const PIN = '4729';
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };
const settle = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};
const events = (got: WireMessage[]) => got.flatMap((m) => (m.kind === 'event' ? m.body : []));
const cockpitNotices = (got: WireMessage[]) => events(got).filter((e): e is Extract<WireEvent, { type: 'cockpit' }> => e.type === 'cockpit');
const handOvers = () => net.dispatched.filter((d) => d.type === 'applyEvent' && d.event?.kind === 'ventilation' && d.accepted);
const frames = (tag: string) => net.dispatched.filter((d) => d.type === 'externalDrive' && d.accepted && d.id.startsWith(tag));
/** Every 1 Hz `state` the host's engine emitted from `from` on: who breathed for the patient. */
const sources = (from: number) => (hostEvents.filter((e) => e.type === 'state' && (e as { t: number }).t >= from) as Array<{ breathing?: { source: string } }>).map((e) => e.breathing?.source);

let s: InstanceType<typeof AppSession>;
let hostEvents: EngineEvent[];
const stops: Array<() => void> = [];

/** A tag in front of each frame's id, so the test tells two cockpits' frames apart on the host. */
function tagged<P extends { post(m: never): void }>(port: P, tag: string): P {
  const post = port.post.bind(port) as (m: { kind: string; cmds?: Array<{ id: string }> }) => void;
  (port as { post: unknown }).post = (m: { kind: string; cmds?: Array<{ id: string }> }) => {
    if (m.kind === 'cmds') for (const c of m.cmds ?? []) c.id = `${tag}${c.id}`;
    post(m);
  };
  return port;
}

/** A remote cockpit on another device: its socket to the relay, its hello with `pin`, and after its grant the cockpit. */
async function remote(id: string, pin = PIN) {
  const sock = ctl.__end(net.relay, 'websocket');
  const got: WireMessage[] = [];
  sock.onMessage((m) => got.push(m));
  const st = createStamper(CODE, id);
  sock.send(st({ kind: 'hello', role: 'ventilator', pin }));
  await vi.advanceTimersByTimeAsync(20);
  const granted = got.some((m) => m.kind === 'grant' && m.to === id && m.granted);
  let d: ReturnType<typeof createVentDriver> | null = null;
  const port = tagged(createRelayPort(ventWireOver(sock as never, st as never, { self: id }), { settings: () => (d ? { cfg: d.vs.cfg, measured: { RR: d.vs.p.measured.RR, VTE: d.vs.p.measured.VTE } } : null) }), id);
  d = createVentDriver(port, 'normal');
  const timer = setInterval(() => (d as NonNullable<typeof d>).frame(performance.now()), 1000 / 60);
  const stop = () => {
    clearInterval(timer);
    port.close();
    d?.dispose();
  };
  stops.push(stop);
  return { id, sock, got, granted, d, port, stop };
}

/** A same-browser learner monitor on the second screen: its own engine from the host's snapshot, every applied command. */
function viewer() {
  const t = ctl.__end(net.bc, 'broadcastChannel');
  const e = createEngine({ seed: 7 });
  let snap: number | null = null;
  const early: Array<{ atTick?: number }> = [];
  t.onMessage((m) => {
    if (m.kind === 'snapshot') {
      e.restore(m.body);
      snap = m.body.tick;
      for (const c of early.splice(0)) if ((c.atTick ?? 0) > m.body.tick) e.dispatch(c as never);
    }
    if (m.kind !== 'event') return;
    for (const x of m.body) {
      if (x.type !== 'commandApplied') continue;
      const c = (x.resolved as { command?: { atTick?: number; type?: string }; replay?: boolean } | undefined);
      if (!c?.command || c.replay || c.command.type === 'time' || c.command.type === 'scenario') continue;
      if (snap === null) early.push(c.command);
      else e.dispatch(c.command as never);
    }
  });
  t.send(createStamper(CODE, 'view-2nd')({ kind: 'hello', role: 'viewer' }));
  return { e, snapTick: () => snap };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
  net.relay.length = 0;
  net.bc.length = 0;
  net.engines.length = 0;
  net.dispatched.length = 0;
  net.dropped = 0;
  document.body.replaceChildren();
  const el = document.createElement('div');
  document.body.append(el);
  s = new AppSession(el, { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: CODE, relay: 'ws://relay.test/', instructorPin: () => PIN });
  hostEvents = [];
  s.onEvent((e) => void hostEvents.push(e));
  stops.push(serveRemoteCockpit(s));
  await settle();
  await vi.advanceTimersByTimeAsync(1000);
});
afterEach(() => {
  for (const f of stops.splice(0)) f();
  s.destroy();
  vi.useRealTimers();
});

/** A learner's phone on the relay (a network follower): what the host tells it. */
function phone() {
  const t = ctl.__end(net.relay, 'websocket');
  const got: WireMessage[] = [];
  t.onMessage((m) => got.push(m));
  t.send(createStamper(CODE, 'phone-1')({ kind: 'hello', role: 'viewer' }));
  return got;
}
const simNow = () => (net.engines.at(-1) as { now(): { simT: number } }).now().simT;

describe('the host drives from a granted remote cockpit (R8c)', () => {
  it('an ungranted cockpit never reaches the link; a granted one drives, every network follower holds', async () => {
    const ph = phone();
    const wrong = await remote('vent-x.1', '0000');
    expect(wrong.granted).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(frames('vent-x.1')).toHaveLength(0);
    expect(cockpitDesk(s).driving).toBeNull();
    wrong.stop();
    const v = await remote('vent-a.1');
    expect(v.granted).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(cockpitDesk(s).driving?.remote).toBe(true);
    expect(frames('vent-a.1').length).toBeGreaterThan(100); // ≈ 50 a second, stamped on the host
    expect(sources(simNow() - 1.5)).toEqual(expect.arrayContaining(['external']));
    expect(cockpitNotices(ph).filter((c) => !c.off).length).toBeGreaterThanOrEqual(2); // once a second: the phones hold
    expect(net.dropped).toBe(0); // every frame the cockpit sent passed the guard (batches included)
  });

  it('silent 1 s → ONE hand-over with its last settings; the patient is ventilated throughout; the phones follow at once', async () => {
    const ph = phone();
    const v = await remote('vent-a.1');
    await vi.advanceTimersByTimeAsync(3000);
    v.d.vs.cfg.rate = 16; // a change the host hears (the next batch's settings)
    v.d.vs.cfg.peep = 7;
    await vi.advanceTimersByTimeAsync(1000);
    const cfg = structuredClone(v.d.vs.cfg);
    const measured = { RR: v.d.vs.p.measured.RR, VTE: v.d.vs.p.measured.VTE };
    const t0 = simNow();
    v.sock.muted = true; // the network goes
    const quietAt = Date.now();
    let handedAt = -1;
    while (handOvers().length === 0 && Date.now() - quietAt < 3000) {
      await vi.advanceTimersByTimeAsync(10);
      if (handOvers().length > 0) handedAt = Date.now() - quietAt;
    }
    console.log(`R8c hand-over, silent: ${handedAt} ms after the last message`);
    expect(handedAt).toBeGreaterThanOrEqual(COCKPIT_SILENCE_MS);
    expect(handedAt).toBeLessThanOrEqual(COCKPIT_SILENCE_MS + 20);
    expect(handOvers()).toHaveLength(1);
    expect(handOvers()[0]?.event).toMatchObject({ source: 'ventilator', ...engineVentilation(cfg, measured) });
    expect(handOvers()[0]?.event).toMatchObject({ rr: 16, peep: 7 });
    expect(cockpitNotices(ph).at(-1)).toMatchObject({ off: true });
    const notices = cockpitNotices(ph).length;
    await vi.advanceTimersByTimeAsync(8000); // past the engine's 5 s drive watchdog
    expect(cockpitNotices(ph)).toHaveLength(notices); // the phones follow: no hold since
    expect(handOvers()).toHaveLength(1);
    // it lands after the cockpit's last frame (which ran a few ticks ahead of the engine), at most 1 s of sim later:
    // the external drive held its last frame that long, far inside the engine's 5 s drive watchdog (no apnoea)
    const lastFrame = Math.max(...frames('vent-a.1').map((f) => f.tick));
    const at = handOvers()[0]?.tick ?? 0;
    console.log(`R8c silent: last frame tick ${lastFrame}, hand-over applied on tick ${at} (+${at - lastFrame} ticks)`);
    expect(at).toBeGreaterThan(lastFrame);
    expect(at - lastFrame).toBeLessThanOrEqual(COCKPIT_SILENCE_MS / 20 + 1);
    const who = sources(t0 - 4);
    console.log(`R8c silent: who breathed, 1 Hz from 4 s before the cut: ${who.join(' ')}`);
    expect(who.length).toBeGreaterThanOrEqual(12);
    expect(who).not.toContain('none');
    expect(sources(simNow() - 2)).toEqual(expect.arrayContaining(['ventilator']));
    expect(cockpitDesk(s).driving).toBeNull();
  });

  // The hand-over contract (R8c/R8d, fix after main run 42570518946): a silence hand-over REVOKES that cockpit id. The
  // frames its browser held while the network was gone arrive late from that id: they never re-take the patient, and
  // that id's end hands over nothing (the engine already holds the settings, and the instructor may have changed them
  // since). It takes over again only on a fresh sign-in (a new socket id), from the engine's settings at that moment.
  it("silent → revoked: the id's late frames never re-take the patient and are refused; its end applies nothing", async () => {
    const v = await remote('vent-a.1');
    await vi.advanceTimersByTimeAsync(3000);
    v.d.vs.cfg.rate = 18;
    await vi.advanceTimersByTimeAsync(500);
    v.sock.muted = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(handOvers()).toHaveLength(1);
    expect(v.got.filter((m) => m.kind === 'grant' && m.to === 'vent-a.1').at(-1)).toMatchObject({ granted: false, reason: VENTILATOR_REASONS.silent });
    // the instructor sets the engine's ventilator while the tablet is away
    expect((await s.host.submit({ id: 'set-1', issuedBy: 'panel', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 450, peep: 6, fio2: 0.5 } } as never)).accepted).toBe(true);
    await vi.advanceTimersByTimeAsync(1500);
    expect(s.ventSettings).toMatchObject({ rr: 16, vtMl: 450, peep: 6 });
    // the late frames: the held batch and settings from the revoked id
    const grantsBefore = v.got.filter((m) => m.kind === 'grant').length;
    const before = frames('vent-a.1').length;
    v.sock.muted = false;
    await vi.advanceTimersByTimeAsync(3000);
    expect(cockpitDesk(s).driving, 'the revoked id never re-takes the patient').toBeNull();
    expect(frames('vent-a.1').length - before).toBe(0);
    expect(v.got.filter((m) => m.kind === 'grant').length, 'answered so it signs in again').toBeGreaterThan(grantsBefore);
    // its socket closes: its end hands nothing over
    v.stop();
    v.sock.close();
    await vi.advanceTimersByTimeAsync(2000);
    expect(handOvers()).toHaveLength(2); // the silence hand-over and the instructor's own setting, nothing from its end
    expect(s.ventSettings).toMatchObject({ rr: 16, vtMl: 450, peep: 6 });
    expect(sources(simNow() - 2)).toEqual(expect.arrayContaining(['ventilator']));
  });

  it('a fresh sign-in after the silence (a new socket id) takes over from the engine\'s current settings', async () => {
    const v = await remote('vent-a.1');
    await vi.advanceTimersByTimeAsync(3000);
    v.sock.muted = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(handOvers()).toHaveLength(1);
    await s.host.submit({ id: 'set-1', issuedBy: 'panel', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 450, peep: 6, fio2: 0.5 } } as never);
    await vi.advanceTimersByTimeAsync(1500);
    v.stop();
    const w = await remote('vent-a.2');
    expect(w.granted).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(cockpitDesk(s).driving?.remote).toBe(true);
    expect(frames('vent-a.2').length).toBeGreaterThan(100);
    expect(w.d.vs.cfg).toMatchObject({ mode: 'VC', rate: 16, vt: 450, peep: 6, fio2: 50 });
    expect(s.ventSettings).toMatchObject({ rr: 16, vtMl: 450, peep: 6 }); // nothing from the old id overwrote it
  });

  it('hidden, closed or revoked → the hand-over at once, once each', async () => {
    const timings: Record<string, number> = {};
    const until = async (n: number) => {
      const at = Date.now();
      while (handOvers().length < n && Date.now() - at < 3000) await vi.advanceTimersByTimeAsync(1);
      return Date.now() - at;
    };
    const a = await remote('vent-a.1');
    await vi.advanceTimersByTimeAsync(2000);
    a.port.setHidden(true);
    timings.hidden = await until(1);
    expect(handOvers()).toHaveLength(1);
    a.port.setHidden(false); // shown again: it takes over
    await vi.advanceTimersByTimeAsync(2000);
    expect(cockpitDesk(s).driving?.remote).toBe(true);
    // closed: the relay says its socket left
    a.stop();
    for (const p of net.relay) for (const fn of p.left) fn('vent-a.1');
    timings.closed = await until(2);
    const b = await remote('vent-b.1');
    await vi.advanceTimersByTimeAsync(2000);
    expect(cockpitDesk(s).driving?.remote).toBe(true);
    s.host.instructorPinChanged();
    timings.revoked = await until(3);
    expect(b.got.some((m) => m.kind === 'grant' && m.to === 'vent-b.1' && !m.granted)).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(handOvers()).toHaveLength(3);
    expect(cockpitDesk(s).driving).toBeNull();
    console.log(`R8c hand-over: ${JSON.stringify(timings)} ms (wall, fake clock)`);
    for (const ms of Object.values(timings)) expect(ms).toBeLessThanOrEqual(20);
    expect(sources(0).length).toBeGreaterThanOrEqual(8);
    expect(sources(0)).not.toContain('none');
  });

  it('the second granted cockpit takes over: the first is told and handed over, the second drives', async () => {
    const a = await remote('vent-a.1');
    await vi.advanceTimersByTimeAsync(2000);
    const b = await remote('vent-b.1');
    await vi.advanceTimersByTimeAsync(2000);
    expect(a.got.some((m) => m.kind === 'grant' && m.to === 'vent-a.1' && !m.granted && m.reason === 'taken over')).toBe(true);
    expect(handOvers()).toHaveLength(1);
    const n = frames('vent-a.1').length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(frames('vent-a.1').length).toBe(n);
    expect(frames('vent-b.1').length).toBeGreaterThan(40);
  });

  it('the view and a remote cockpit never drive together: opening one hands the other over first', async () => {
    const desk = cockpitDesk(s);
    const [cockpitSide, hostSide] = createLocalPortPair();
    const local = createVentDriver(tagged(cockpitSide, 'view-'), 'normal');
    const t = setInterval(() => local.frame(performance.now()), 1000 / 60);
    stops.push(() => clearInterval(t));
    const view = { port: hostSide, remote: false, settings: () => ({ cfg: { ...local.vs.cfg } }) };
    await desk.take(view, () => true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(frames('view-').length).toBeGreaterThan(50);
    const r = await remote('vent-a.1'); // the remote opens: the view is handed over first
    await vi.advanceTimersByTimeAsync(3000);
    expect(desk.driving?.remote).toBe(true);
    expect(handOvers()).toHaveLength(1);
    void desk.take(view, () => true); // the view opens again: the remote is handed over first
    await vi.advanceTimersByTimeAsync(3000);
    expect(desk.driving).toBe(view);
    expect(handOvers()).toHaveLength(2);
    const ticks = (tag: string) => new Set(frames(tag).map((f) => f.tick));
    const both = [...ticks('view-')].filter((k) => ticks('vent-a.1').has(k));
    expect(both).toEqual([]);
    expect(ticks('vent-a.1').size).toBeGreaterThan(50);
    expect(sources(0).length).toBeGreaterThanOrEqual(8);
    expect(sources(0)).not.toContain('none');
    r.stop();
  });

  it('the same-browser viewer is sample-identical with the host while a remote cockpit drives (the mirror path)', async () => {
    const v2 = viewer();
    await vi.advanceTimersByTimeAsync(200);
    expect(v2.snapTick()).not.toBeNull();
    await remote('vent-a.1');
    await vi.advanceTimersByTimeAsync(6000);
    const host = net.engines.at(-1) as ReturnType<typeof createEngine>;
    const tick = host.now().tick;
    v2.e.advanceTo(tick * 0.02 + 1e-9);
    expect(v2.e.now().tick).toBe(tick);
    expect(frames('vent-a.1').length).toBeGreaterThan(200);
    expect(v2.e.snapshot()).toEqual(host.snapshot());
  });
});
