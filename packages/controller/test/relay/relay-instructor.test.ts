// Plan instructor-peer-role.md P4: the classroom relay admits an instructor's socket PENDING, routes its commands only
// after the host's grant, filters what learners' phones receive, and limits PIN guessing per address. The host here is a
// raw socket with hand-made frames (the host's own half is P3). A phone marks itself with `?e2e-remote` (the
// request-aware `isLocal(address, req)` seam the e2e uses); 127.0.0.1 and [::1] are two addresses.
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket as WsClient } from 'ws';
import { createEngine } from '@pme/engine-core';
import { createStamper, type Role, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { RELAY_CLOSE, RELAY_RETRY_CLOSE } from '../../src/transport/relay-frames.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { collect, sleep, waitFor, waitStatus } from '../helpers.ts';

const SESSION = 'NPS234';
const PIN = '4729';
let relay: RelayHandle | null = null;
let relayLog: string[] = [];
let clock = 1_000_000;
const closers: Array<() => void> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) c();
  await relay?.close();
  relay = null;
  relayLog = [];
  clock = 1_000_000;
});

const start = async (o: RelayOptions = {}) =>
  (relay = await startRelay({
    port: 0, host: '::', heartbeatMs: 60_000, takenCheckMs: 300, remoteRoles: 'viewer',
    isLocal: (_address, req) => !req?.url?.includes('e2e-remote'),
    now: () => clock,
    log: (l) => relayLog.push(l),
    ...o,
  }));

interface Sock {
  ws: WebSocket;
  raw: string[];
  got: Array<Record<string, unknown>>;
  closeCode: number | null;
  hello: (extra?: { seq?: number }) => void;
  send: (body: Record<string, unknown>) => string;
}
/** A raw socket. `phone`: another device (`?e2e-remote`); `v6`: from [::1] instead of 127.0.0.1 (another address). */
async function sock(from: string, role: Role, o: { phone?: boolean; v6?: boolean; pin?: string } = {}): Promise<Sock> {
  const phone = o.phone ?? role !== 'host';
  const ws = new WebSocket(`ws://${o.v6 ? '[::1]' : '127.0.0.1'}:${relay!.port}/${phone ? '?e2e-remote' : ''}`);
  const stamp = createStamper(SESSION, from);
  const s: Sock = {
    ws,
    raw: [],
    got: [],
    closeCode: null,
    hello: () => void s.send({ kind: 'hello', role, ...(o.pin !== undefined ? { pin: o.pin } : role === 'instructor' ? { pin: PIN } : {}) }),
    send: (body) => {
      const data = JSON.stringify(stamp(body as never));
      ws.send(data);
      return data;
    },
  };
  ws.onmessage = (e) => {
    s.raw.push(String(e.data));
    s.got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
  };
  ws.onclose = (e) => (s.closeCode = e.code);
  await new Promise((ok) => (ws.onopen = ok));
  closers.push(() => ws.close());
  return s;
}
/** Say hello and wait for the relay's `peers` frame (admitted) or a close. */
async function join(from: string, role: Role, o: Parameters<typeof sock>[2] = {}) {
  const s = await sock(from, role, o);
  s.hello();
  await waitFor(() => s.got.some((f) => f.relay === 'peers') || s.closeCode !== null, 2000, `${from} admitted or closed`);
  return s;
}
const events = (s: Sock) => s.got.filter((m) => m.kind === 'event').flatMap((m) => m.body as WireEvent[]);
const applied = (s: Sock) => events(s).filter((e): e is Extract<WireEvent, { type: 'commandApplied' }> => e.type === 'commandApplied').map((e) => (e.resolved as { command: { type: string } }).command.type);
const errorOf = (s: Sock) => s.got.find((f) => f.relay === 'error') as { code: string; message: string } | undefined;
const command = (id: string) => ({ kind: 'command', body: { id, issuedBy: 'remote', type: 'time', action: 'pause' } });
const SNAPSHOT = { kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 0 } };
/** A host frame with everything a learner must not see beside what it needs. */
const MIXED: WireEvent[] = [
  { type: 'state', t: 1, tick: 50, mode: 'manual', values: {}, control: {} } as unknown as WireEvent,
  { type: 'instructorView', t: 1, body: { rows: ['dantrolene'] } },
  { type: 'commandApplied', commandId: 'b1', tick: 50, resolved: { command: { id: 'b1', issuedBy: 'instructor', type: 'scenario', action: 'bookmark', target: 'discuss', note: 'missed the K+' } } } as unknown as WireEvent,
  { type: 'commandApplied', commandId: 'n1', tick: 50, resolved: { command: { id: 'n1', issuedBy: 'remote', type: 'note', kind: 'marker', text: 'judged: called for help' } } } as unknown as WireEvent,
  { type: 'commandApplied', commandId: 't1', tick: 50, resolved: { command: { id: 't1', issuedBy: 'instructor', type: 'time', action: 'pause' } } } as unknown as WireEvent,
];

/** A classroom: the laptop's host (local) and one learner's phone, both admitted. */
async function room(o: RelayOptions = {}) {
  await start(o);
  const host = await join('host-h1', 'host');
  const viewer = await join('view-v1', 'viewer');
  await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'view-v1'), 2000, 'viewer hello at the host');
  return { host, viewer };
}
/** The host answers the instructor's hello: grant, then its welcome (replays) and snapshot, as P3 orders them. */
const answer = (host: Sock, to: string, granted: boolean, reason?: string) => {
  host.send({ kind: 'grant', to, granted, ...(reason ? { reason } : {}) });
  if (granted) {
    host.send({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'x2', tick: 0, resolved: { command: { id: 'x2', issuedBy: 'i', type: 'time', action: 'scale', value: 2 }, replay: true } }] });
    host.send(SNAPSHOT);
  }
};

describe('an instructor socket is admitted pending', () => {
  it("from another device under remoteRoles 'viewer' (isLocal: () => false): admitted, and its command is forbidden", async () => {
    await start({ isLocal: () => false });
    const ins = await join('ins-a.1', 'instructor');
    expect(ins.closeCode).toBeNull();
    ins.send(command('k1'));
    await waitFor(() => errorOf(ins) !== undefined, 2000, 'forbidden');
    expect(errorOf(ins)).toMatchObject({ code: 'forbidden' });
    expect(ins.closeCode).toBeNull();
  });

  it('pending: its hello (with the PIN) reaches the host only; it gets the lean copy, and its command never reaches the host', async () => {
    const { host, viewer } = await room();
    const ins = await join('ins-a.1', 'instructor');
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-a.1'), 2000, 'instructor hello at the host');
    expect(host.got.find((m) => m.kind === 'hello' && m.from === 'ins-a.1')).toMatchObject({ role: 'instructor', pin: PIN });
    expect(viewer.raw.some((r) => r.includes(PIN))).toBe(false);
    host.send({ kind: 'event', body: MIXED });
    await waitFor(() => events(ins).length > 0 && events(viewer).length > 0, 2000, 'copies');
    expect(events(ins).map((e) => e.type)).toEqual(['state', 'commandApplied']);
    expect(applied(ins)).toEqual(['time']);
    ins.send(command('k1'));
    await waitFor(() => errorOf(ins) !== undefined, 2000, 'forbidden');
    expect(errorOf(ins)).toMatchObject({ code: 'forbidden' });
    await sleep(50);
    expect(host.got.some((m) => m.kind === 'command')).toBe(false);
    expect(relayLog.join('\n')).not.toContain(PIN);
  });
});

describe("the host's grant", () => {
  it('granted: the grant reaches that socket before the welcome; full copies; commands routed; acks back', async () => {
    const { host } = await room();
    const ins = await join('ins-a.1', 'instructor');
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-a.1'), 2000, 'hello at host');
    answer(host, 'ins-a.1', true);
    await waitFor(() => ins.got.some((m) => m.kind === 'snapshot'), 2000, 'snapshot');
    const order = ins.got.filter((m) => m.kind !== undefined).map((m) => m.kind);
    expect(order.slice(0, 3)).toEqual(['grant', 'event', 'snapshot']);
    expect(ins.got.find((m) => m.kind === 'grant')).toMatchObject({ to: 'ins-a.1', granted: true });
    const sent = host.send({ kind: 'event', body: MIXED });
    await waitFor(() => ins.raw.includes(sent), 2000, 'the host frame byte for byte');
    ins.send(command('k1'));
    await waitFor(() => host.got.some((m) => m.kind === 'command'), 2000, 'command at the host');
    host.send({ kind: 'ack', commandId: 'k1', accepted: true, tick: 60 });
    await waitFor(() => ins.got.some((m) => m.kind === 'ack'), 2000, 'ack back');
    expect(ins.got.find((m) => m.kind === 'ack')).toMatchObject({ commandId: 'k1', accepted: true });
    expect(errorOf(ins)).toBeUndefined();
  });

  it('denied: the relay says `denied` with the reason and closes 4013 (fatal: the page asks again)', async () => {
    const { host } = await room();
    const ins = await join('ins-a.1', 'instructor', { pin: '0000' });
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-a.1'), 2000, 'hello at host');
    answer(host, 'ins-a.1', false, 'wrong PIN');
    await waitFor(() => ins.closeCode !== null, 2000, 'closed');
    expect(ins.closeCode).toBe(RELAY_CLOSE.denied);
    expect(errorOf(ins)).toEqual({ relay: 'error', code: 'denied', message: 'wrong PIN' });
    expect(relay!.room(SESSION)?.peers).toBe(1);
  });

  it('a grant goes only to its socket: another pending instructor and the viewers stay lean and never see it', async () => {
    const { host, viewer } = await room();
    const a = await join('ins-a.1', 'instructor');
    const b = await join('ins-b.1', 'instructor', { v6: true });
    await waitFor(() => host.got.filter((m) => m.kind === 'hello' && String(m.from).startsWith('ins-')).length === 2, 2000, 'hellos');
    host.send({ kind: 'grant', to: 'ins-a.1', granted: true });
    await waitFor(() => a.got.some((m) => m.kind === 'grant'), 2000, 'grant at a');
    host.send({ kind: 'event', body: MIXED });
    await waitFor(() => events(a).length > 0 && events(b).length > 0 && events(viewer).length > 0, 2000, 'copies');
    expect(events(a)).toHaveLength(MIXED.length);
    expect(events(b).map((e) => e.type)).toEqual(['state', 'commandApplied']);
    expect([b, viewer].some((s) => s.got.some((m) => m.kind === 'grant'))).toBe(false);
    b.send(command('kb'));
    await waitFor(() => errorOf(b) !== undefined, 2000, 'b forbidden');
    expect(errorOf(b)).toMatchObject({ code: 'forbidden' });
  });

  it('a grant naming a viewer or an unknown id grants nothing', async () => {
    const { host, viewer } = await room();
    host.send({ kind: 'grant', to: 'view-v1', granted: true });
    host.send({ kind: 'grant', to: 'nobody', granted: true });
    await sleep(50);
    expect(viewer.got.some((m) => m.kind === 'grant')).toBe(false);
    viewer.send(command('kv'));
    await waitFor(() => errorOf(viewer) !== undefined, 2000, 'viewer forbidden');
    expect(host.got.some((m) => m.kind === 'command')).toBe(false);
  });

  it('a new host socket starts every instructor pending again: a grant is the granting host\'s', async () => {
    const { host } = await room();
    const ins = await join('ins-a.1', 'instructor');
    host.send({ kind: 'grant', to: 'ins-a.1', granted: true });
    await waitFor(() => ins.got.some((m) => m.kind === 'grant'), 2000, 'grant');
    host.ws.close();
    await waitFor(() => relay!.room(SESSION)?.hostOnline === false, 2000, 'host left');
    const host2 = await join('host-h2', 'host');
    ins.send(command('k2'));
    await waitFor(() => errorOf(ins) !== undefined, 2000, 'forbidden after the new host');
    expect(host2.got.some((m) => m.kind === 'command')).toBe(false);
  });
});

describe('PIN guessing is limited per address', () => {
  const deny = async (host: Sock, id: string, v6 = false) => {
    const s = await join(id, 'instructor', { pin: '1111', v6 });
    if (s.closeCode !== null) return s;
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === id), 2000, `${id} hello at host`);
    host.send({ kind: 'grant', to: id, granted: false, reason: 'wrong PIN' });
    await waitFor(() => s.closeCode !== null, 2000, `${id} closed`);
    return s;
  };

  it('5 denials from one address: that address may not say instructor for 60 s (4028); another address and its viewers are unaffected', async () => {
    const { host } = await room();
    for (let i = 1; i <= 5; i++) expect((await deny(host, `ins-x.${i}`)).closeCode).toBe(RELAY_CLOSE.denied);
    const sixth = await join('ins-x.6', 'instructor');
    expect(sixth.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(errorOf(sixth)).toMatchObject({ code: 'too-many-tries' });
    expect(host.got.some((m) => m.kind === 'hello' && m.from === 'ins-x.6')).toBe(false); // the PIN never reached the host
    const other = await join('ins-y.1', 'instructor', { v6: true }); // another phone
    expect(other.closeCode).toBeNull();
    const learner = await join('view-v2', 'viewer'); // the blocked address may still follow
    expect(learner.closeCode).toBeNull();
    clock += 59_000;
    expect((await join('ins-x.7', 'instructor')).closeCode).toBe(RELAY_CLOSE.tooManyTries);
    clock += 2_000;
    relay!.sweep(clock);
    const again = await join('ins-x.8', 'instructor');
    expect(again.closeCode).toBeNull();
  });

  it('denials older than 60 s are forgotten; a revoked grant is not a wrong PIN', async () => {
    const { host } = await room();
    for (let i = 1; i <= 4; i++) await deny(host, `ins-x.${i}`);
    clock += 61_000;
    relay!.sweep(clock);
    for (let i = 5; i <= 8; i++) expect((await deny(host, `ins-x.${i}`)).closeCode).toBe(RELAY_CLOSE.denied);
    // a granted phone revoked (the PIN was changed, taken over) does not count
    const held = await join('ins-x.9', 'instructor');
    host.send({ kind: 'grant', to: 'ins-x.9', granted: true });
    await waitFor(() => held.got.some((m) => m.kind === 'grant'), 2000, 'granted');
    host.send({ kind: 'grant', to: 'ins-x.9', granted: false, reason: 'taken over' });
    await waitFor(() => held.closeCode !== null, 2000, 'revoked');
    expect(held.closeCode).toBe(RELAY_CLOSE.denied);
    expect(errorOf(held)).toMatchObject({ code: 'denied', message: 'taken over' });
    expect((await join('ins-x.10', 'instructor')).closeCode).toBeNull();
  });
});

/** A socket that stops answering pings (its network dropped; nothing told the relay). */
async function silent(from: string, role: Role) {
  const ws = new WsClient(`ws://127.0.0.1:${relay!.port}/?e2e-remote`, { autoPong: false });
  const s = { ws, closed: false, raw: [] as string[] };
  ws.on('message', (d) => s.raw.push(String(d)));
  ws.on('close', () => (s.closed = true));
  ws.on('error', () => undefined);
  await new Promise((ok) => ws.once('open', ok));
  ws.send(JSON.stringify({ v: 1, session: SESSION, from, seq: 1, sentAt: Date.now(), kind: 'hello', role, ...(role === 'instructor' ? { pin: PIN } : {}) }));
  closers.push(() => ws.terminate());
  return s;
}

describe('one open socket per id (#183): a live id is refused, a dead one is replaced, and a grant never carries over', () => {
  it('a second socket with a LIVE instructor id is refused 4010 (retryable); the holder keeps its grant', async () => {
    const { host } = await room();
    const ins = await join('ins-a.1', 'instructor');
    host.send({ kind: 'grant', to: 'ins-a.1', granted: true });
    await waitFor(() => ins.got.some((m) => m.kind === 'grant'), 2000, 'grant');
    const claim = await sock('ins-a.1', 'instructor', { v6: true });
    claim.hello();
    await waitFor(() => claim.closeCode !== null, 2000, 'claim refused');
    expect(claim.closeCode).toBe(RELAY_RETRY_CLOSE.idTaken);
    ins.send(command('k1'));
    await waitFor(() => host.got.some((m) => m.kind === 'command'), 2000, 'the holder still commands');
  });

  it('a second socket with a DEAD granted instructor id is admitted PENDING: lean copies, commands forbidden', async () => {
    const { host } = await room();
    const old = await silent('ins-a.1', 'instructor');
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-a.1'), 2000, 'old hello');
    host.send({ kind: 'grant', to: 'ins-a.1', granted: true });
    await waitFor(() => old.raw.some((r) => r.includes('"grant"')), 2000, 'old granted');
    const fresh = await sock('ins-a.1', 'instructor', { v6: true });
    fresh.hello();
    await waitFor(() => fresh.got.some((f) => f.relay === 'peers'), 3000, 'fresh admitted');
    await waitFor(() => old.closed, 2000, 'the dead socket closed');
    expect(fresh.closeCode).toBeNull();
    host.send({ kind: 'event', body: MIXED });
    await waitFor(() => events(fresh).length > 0, 2000, 'copy');
    expect(events(fresh).map((e) => e.type)).toEqual(['state', 'commandApplied']);
    fresh.send(command('k9'));
    await waitFor(() => errorOf(fresh) !== undefined, 2000, 'forbidden');
    expect(errorOf(fresh)).toMatchObject({ code: 'forbidden' });
    expect(host.got.some((m) => m.kind === 'command')).toBe(false);
  });

  it('a viewer that reconnects past its dead socket keeps following', async () => {
    await start();
    const host = await join('host-h1', 'host');
    const old = await silent('view-v1', 'viewer');
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'view-v1'), 2000, 'old hello');
    const again = await sock('view-v1', 'viewer');
    again.hello();
    await waitFor(() => again.got.some((f) => f.relay === 'peers'), 3000, 'admitted');
    await waitFor(() => old.closed, 2000, 'dead socket closed');
    host.send(SNAPSHOT);
    host.send({ kind: 'event', body: MIXED });
    await waitFor(() => again.got.some((m) => m.kind === 'snapshot') && events(again).length > 0, 2000, 'following');
    expect(events(again).map((e) => e.type)).toEqual(['state', 'commandApplied']);
  });
});

describe('room places', () => {
  it('an instructor is admitted with the room at maxPeersPerRoom viewers (its reserved place); a learner is not', async () => {
    await start({ maxPeersPerRoom: 2 });
    const host = await join('host-h1', 'host');
    await join('view-v1', 'viewer');
    await join('view-v2', 'viewer');
    const extra = await join('view-v3', 'viewer');
    expect(extra.closeCode).toBe(RELAY_CLOSE.full);
    const ins = await join('ins-a.1', 'instructor');
    expect(ins.closeCode).toBeNull();
    // A phone taking over (plan §3 option B) gets in while the holder is still connected
    const next = await join('ins-b.1', 'instructor', { v6: true });
    expect(next.closeCode).toBeNull();
    expect(host.got.filter((m) => m.kind === 'hello' && String(m.from).startsWith('ins-')).map((m) => m.from)).toEqual(['ins-a.1', 'ins-b.1']);
  });

  it('an instructor never takes a learner\'s place', async () => {
    await start({ maxPeersPerRoom: 2 });
    await join('host-h1', 'host');
    await join('ins-a.1', 'instructor');
    expect((await join('view-v1', 'viewer')).closeCode).toBeNull();
    expect((await join('view-v2', 'viewer')).closeCode).toBeNull();
  });
});

describe('the peers frame', () => {
  it('`instructors` (granted phones) is in the host\'s frame only; the learners\' frames and counts do not show an instructor', async () => {
    const { host, viewer } = await room();
    const ins = await join('ins-a.1', 'instructor');
    const last = () => host.got.filter((f) => f.relay === 'peers').at(-1);
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-a.1'), 2000, 'hello');
    expect(last()).toEqual({ relay: 'peers', hostOnline: true, peers: 1, instructors: 0 });
    host.send({ kind: 'grant', to: 'ins-a.1', granted: true });
    await waitFor(() => (last() as { instructors?: number }).instructors === 1, 2000, 'instructors 1');
    expect(last()).toEqual({ relay: 'peers', hostOnline: true, peers: 1, instructors: 1 });
    const v2 = await join('view-v2', 'viewer');
    ins.ws.close();
    await waitFor(() => (last() as { instructors?: number }).instructors === 0, 2000, 'instructors 0');
    for (const s of [viewer, v2, ins]) {
      const frames = s.got.filter((f) => f.relay === 'peers');
      expect(frames.length).toBeGreaterThan(0);
      expect(frames.every((f) => !('instructors' in f))).toBe(true);
    }
    expect(v2.got.find((f) => f.relay === 'peers')).toMatchObject({ peers: 2 }); // view-v1 and view-v2: not the instructor
  });
});

describe("what the learners' phones receive", () => {
  it("the lean copy drops `scenario` and `note` commandApplied and `instructorView`; a granted instructor's copy is the host's frame byte for byte", async () => {
    const { host, viewer } = await room();
    const ins = await join('ins-a.1', 'instructor');
    host.send({ kind: 'grant', to: 'ins-a.1', granted: true });
    await waitFor(() => ins.got.some((m) => m.kind === 'grant'), 2000, 'grant');
    const sent = host.send({ kind: 'event', body: MIXED });
    // a welcome (a hello's replays) with a bookmark replay: the learner's copy keeps the time replay only
    const v2 = await join('view-v2', 'viewer');
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'view-v2'), 2000, 'v2 hello');
    host.send({ kind: 'event', body: [
      { type: 'commandApplied', commandId: 'x2', tick: 0, resolved: { command: { id: 'x2', issuedBy: 'i', type: 'time', action: 'scale', value: 2 }, replay: true } },
      { type: 'commandApplied', commandId: 'b0', tick: 0, resolved: { command: { id: 'b0', issuedBy: 'i', type: 'scenario', action: 'bookmark', target: 'one', note: 'discuss: Sara missed it' }, replay: true } },
    ] });
    await waitFor(() => ins.raw.includes(sent) && events(viewer).length > 0 && events(v2).length > 0, 2000, 'copies');
    await sleep(50);
    expect(events(viewer).map((e) => e.type).filter((t) => t !== 'commandApplied')).toEqual(['state']);
    expect(applied(viewer).length).toBeGreaterThan(0);
    expect(applied(viewer).every((t) => t === 'time')).toBe(true);
    expect(applied(v2)).toEqual(['time']);
    for (const s of [viewer, v2]) {
      expect(s.raw.some((r) => /instructorView|"note"|missed|judged|"grant"/.test(r))).toBe(false);
    }
  });

  it('a controller from another device is still refused (4003)', async () => {
    await room();
    const c = await join('ctl-c1', 'controller');
    expect(c.closeCode).toBe(RELAY_CLOSE.forbiddenRole);
    expect(errorOf(c)).toMatchObject({ code: 'forbidden' });
  });

  it('the follower still resyncs across a bookmark restore through the relay', async () => {
    await start();
    const a = createEngine({ seed: 7 });
    const b = createEngine({ seed: 7 });
    a.advanceTo(1);
    const target: HostTarget = { dispatch: (c) => a.dispatch(c), snapshot: () => a.snapshot(), restore: (s) => a.restore(s), on: (f) => a.on(f), now: () => a.now(), time: () => undefined };
    const hs = new HostSession({ session: SESSION, target, stateIntervalMs: 0, wallNow: () => 0 });
    closers.push(() => hs.close());
    const ht = createWebSocketTransport({ url: `ws://127.0.0.1:${relay!.port}/` });
    closers.push(() => ht.close());
    hs.addTransport(ht);
    await waitStatus(ht, 'open');
    await waitFor(() => relay!.room(SESSION)?.hostOnline === true, 2000, 'host on relay');
    const vt = createWebSocketTransport({ url: `ws://127.0.0.1:${relay!.port}/?e2e-remote` });
    closers.push(() => vt.close());
    const heard = collect(vt);
    const viewer = new ViewerSync({
      session: SESSION, transport: vt, engineVersion: b.version, wallNow: () => 0,
      target: { restore: (s) => b.restore(s), dispatch: (c) => b.dispatch(c), on: (f, ty) => b.on(f, ty), renderT: () => b.now().simT, tick: () => b.now().tick, setRate: () => undefined, setPaused: () => undefined, jumpTo: (x) => b.advanceTo(x) },
    });
    closers.push(() => viewer.close());
    await waitFor(() => viewer.status === 'synced', 3000, 'synced');
    await hs.submit({ id: 'mark', issuedBy: 'test', type: 'scenario', action: 'bookmark', target: 'one' });
    a.advanceTo(5);
    hs.emitState();
    hs.flush();
    await sleep(50);
    await hs.submit({ id: 'back', issuedBy: 'test', type: 'scenario', action: 'restoreBookmark', target: 'one' });
    await waitFor(() => viewer.resyncs > 0 && viewer.status === 'synced', 3000, 'resynced');
    viewer.follow();
    expect(b.now().simT).toBeLessThan(2);
    const ev = heard.filter((m): m is Extract<WireMessage, { kind: 'event' }> => m.kind === 'event').flatMap((m) => m.body);
    expect(ev.find((e) => e.type === 'timeline')).toMatchObject({ type: 'timeline', cause: 'restore' });
    expect(ev.some((e) => e.type === 'commandApplied' && (e.resolved as { command: { type: string } }).command.type === 'scenario')).toBe(false);
  });
});
