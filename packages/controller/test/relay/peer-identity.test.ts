// Peer identity (verification 2026-10-29, scratch/reviews/verify-relay-peer-identity.md): a second socket that says
// hello with the laptop panel's peer id must not block the panel's commands. The host keys its peer state by
// (transport, from) and updates the viewer set only after the sequence check; the relay binds one open socket per id.
// The phones are told apart from the laptop by address: the relay listens on '::'; the laptop connects to 127.0.0.1
// (::ffff:127.0.0.1), the phones to [::1], so the classroom role gate is real (a phone may only say `viewer`).
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, type ManagedTransport, type Role, type WireMessage } from '../../src/protocol.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { RELAY_CLOSE, RELAY_RETRY_CLOSE } from '../../src/transport/relay-frames.ts';
import { WebSocket as WsClient } from 'ws';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, sleep, waitFor, waitStatus } from '../helpers.ts';

const SESSION = 'VPD234';
let relay: RelayHandle | null = null;
let hs: HostSession | null = null;
let relayLog: string[] = [];
const closers: Array<() => void> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) c();
  hs?.close();
  hs = null;
  await relay?.close();
  relay = null;
  relayLog = [];
});

const startClassroomRelay = async () =>
  (relay = await startRelay({ port: 0, host: '::', heartbeatMs: 60_000, remoteRoles: 'viewer', isLocal: (a) => a !== '::1', log: (l) => relayLog.push(l) }));

/** A raw socket with hand-made frames (so the id and the seq can be chosen). `phone`: another device ([::1]). */
async function socket(from: string, opts: { phone?: boolean; role?: Role } = {}) {
  const ws = new WebSocket(opts.phone === false ? `ws://127.0.0.1:${relay!.port}/` : `ws://[::1]:${relay!.port}/`);
  const got: Array<Record<string, unknown>> = [];
  const s = {
    ws,
    got,
    closeCode: null as number | null,
    hello: (seq: number) => ws.send(JSON.stringify({ v: 1, session: SESSION, from, seq, sentAt: Date.now(), kind: 'hello', role: opts.role ?? 'viewer' })),
  };
  ws.onmessage = (e) => got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
  ws.onclose = (e) => (s.closeCode = e.code);
  await new Promise((ok) => (ws.onopen = ok));
  closers.push(() => ws.close());
  return s;
}
const applied = (got: Array<Record<string, unknown>>) =>
  got
    .filter((m) => m.kind === 'event')
    .flatMap((m) => m.body as Array<{ type: string; commandId?: string; resolved?: { replay?: boolean } }>)
    .filter((e) => e.type === 'commandApplied' && !e.resolved?.replay)
    .map((e) => e.commandId!);

/** A host on the classroom relay, the panel on the in-process hub (the app's Monitor panel) or the relay (a Remote). */
async function setup(via: 'direct' | 'relay') {
  await startClassroomRelay();
  const laptop = `ws://127.0.0.1:${relay!.port}/`;
  hs = new HostSession({ session: SESSION, target: manualHost(), stateIntervalMs: 0 });
  const hostWs = createWebSocketTransport({ url: laptop });
  closers.push(() => hostWs.close());
  hs.addTransport(hostWs);
  await waitStatus(hostWs, 'open');
  await waitFor(() => relay!.room(SESSION)?.hostOnline === true, 2000, 'host on relay');
  let panelT: ManagedTransport & { dropForTest?: () => void };
  if (via === 'direct') {
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    panelT = hub.connect();
  } else {
    panelT = createWebSocketTransport({ url: laptop });
    closers.push(() => panelT.close());
  }
  const panel = new ControllerSession({ session: SESSION, transport: panelT, issuedBy: 'instructor', resendMs: 300, answerTimeoutMs: 1500 });
  closers.push(() => panel.close());
  if (via === 'relay') await waitStatus(panelT, 'open');
  const viewer = await socket('view-legit1');
  viewer.hello(1);
  await waitFor(() => viewer.got.some((m) => m.kind === 'snapshot'), 2000, 'legit viewer snapshot');
  /** The panel sends one command: the host's answer, and whether the legitimate phone saw it applied. */
  const step = async (value: number) => {
    const r = await panel.send({ type: 'setTarget', variable: 'hr', value } as never);
    await waitFor(() => !r.accepted || applied(viewer.got).includes(r.commandId), 1000, 'commandApplied at the viewer').catch(() => undefined);
    return { accepted: r.accepted, reason: r.reason, seen: applied(viewer.got).includes(r.commandId) };
  };
  return { panel, panelT, viewer, step };
}
const OK = { accepted: true, seen: true };

for (const via of ['direct', 'relay'] as const) {
  describe(`a phone claims the panel's peer id — panel on the ${via === 'direct' ? 'in-process hub (the app Monitor panel)' : 'relay (a laptop Remote)'}`, () => {
    for (const [name, seq] of [['(a) with an ordinary seq', 1], ['(b) with a seq far above the panel', 1_000_000_000]] as const) {
      it(`${name}: the panel's commands are still applied and acked`, async () => {
        const { panel, viewer, step } = await setup(via);
        expect(await step(90)).toMatchObject(OK);
        // The id is ordinary wire data: the phone reads it from the commandApplied command id
        expect(applied(viewer.got)[0]!.replace(/-\d+$/, '')).toBe(panel.peerId);
        const evil = await socket(panel.peerId);
        evil.hello(seq);
        await sleep(150);
        expect(await step(110)).toMatchObject(OK);
        if (via === 'relay') expect(evil.closeCode).toBe(RELAY_RETRY_CLOSE.idTaken); // the id is bound to the panel's live socket
        evil.ws.close();
        await sleep(100);
        expect(await step(130)).toMatchObject(OK);
      }, 20_000);
    }

    it("(c) control: a phone claims the HOST's id with a seq far above — the panel is unaffected", async () => {
      const { step } = await setup(via);
      expect(await step(90)).toMatchObject(OK);
      const evil = await socket(hs!.peerId);
      evil.hello(1_000_000_000);
      await sleep(150);
      expect(await step(110)).toMatchObject(OK);
    }, 20_000);
  });
}

describe('one transport: the viewer set changes only after the sequence check accepts the hello', () => {
  it("(a) a stale-seq viewer hello carrying the panel's id does not make the panel a viewer", async () => {
    const hub = createInProcessHub();
    hs = new HostSession({ session: SESSION, target: manualHost(), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const peer = hub.connect();
    const got = collect(peer);
    const stamp = createStamper(SESSION, 'ctl-panel1');
    const ack = (id: string) => got.find((m): m is Extract<WireMessage, { kind: 'ack' }> => m.kind === 'ack' && m.commandId === id);
    peer.send(stamp({ kind: 'hello', role: 'controller' })); // seq 1
    peer.send(stamp({ kind: 'command', body: { id: 'k1', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 90 } as never })); // seq 2
    await waitFor(() => ack('k1') !== undefined);
    // A hand-made frame with the panel's id and a seq the host has already seen: a duplicate, dropped whole
    peer.send({ v: 1, session: SESSION, from: 'ctl-panel1', seq: 2, sentAt: Date.now(), kind: 'hello', role: 'viewer' } as WireMessage);
    peer.send(stamp({ kind: 'command', body: { id: 'k2', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 110 } as never })); // seq 3
    await waitFor(() => ack('k2') !== undefined);
    expect(ack('k1')).toMatchObject({ accepted: true });
    expect(ack('k2')).toMatchObject({ accepted: true });
    expect(hs.stats.applied).toBe(2);
  });
});

describe('relay: one open socket per peer id in a room', () => {
  it('(d) refuses a second socket claiming a live id, for a viewer and for a controller (retryable), and logs it', async () => {
    await startClassroomRelay();
    const host = await socket('host-h1', { phone: false, role: 'host' });
    host.hello(1);
    const ctl = await socket('ctl-c1', { phone: false, role: 'controller' });
    ctl.hello(1);
    const view = await socket('view-v1');
    view.hello(1);
    await waitFor(() => relay!.room(SESSION)?.peers === 2, 2000, 'two peers');
    const asViewer = await socket('ctl-c1'); // a phone takes the controller's id
    asViewer.hello(5);
    const asController = await socket('view-v1', { phone: false, role: 'controller' }); // the laptop takes the viewer's id
    asController.hello(5);
    const asViewerOfHost = await socket('host-h1'); // a phone takes the host's id
    asViewerOfHost.hello(5);
    await waitFor(() => asViewer.closeCode !== null && asController.closeCode !== null && asViewerOfHost.closeCode !== null, 2000, 'refusals');
    expect([asViewer.closeCode, asController.closeCode, asViewerOfHost.closeCode]).toEqual([RELAY_RETRY_CLOSE.idTaken, RELAY_RETRY_CLOSE.idTaken, RELAY_RETRY_CLOSE.idTaken]);
    // No error frame: a follower would show it as a refusal for good, and this one is retried
    expect(asViewer.got.some((f) => f.relay === 'error')).toBe(false);
    expect(relayLog.filter((l) => /refused: peer id .* is taken by a live socket/.test(l))).toHaveLength(3);
    // The owners keep their sockets, and the host heard none of the claims
    expect([host.closeCode, ctl.closeCode, view.closeCode]).toEqual([null, null, null]);
    expect(relay!.room(SESSION)).toMatchObject({ hostOnline: true, peers: 2 });
    expect(host.got.filter((m) => m.kind === 'hello').map((m) => m.from)).toEqual(['ctl-c1', 'view-v1']);
  });

  it('(e) a peer that reconnects with its id after its socket closed is accepted', async () => {
    await startClassroomRelay();
    const host = await socket('host-h1', { phone: false, role: 'host' });
    host.hello(1);
    for (const [id, phone, role] of [['view-v1', true, 'viewer'], ['ctl-c1', false, 'controller']] as const) {
      const first = await socket(id, { phone, role });
      first.hello(1);
      await waitFor(() => relay!.room(SESSION)?.peers === 1, 2000, `${id} joined`);
      first.ws.close();
      await waitFor(() => relay!.room(SESSION)?.peers === 0, 2000, `${id} left`);
      const again = await socket(id, { phone, role });
      again.hello(2);
      await waitFor(() => relay!.room(SESSION)?.peers === 1, 2000, `${id} rejoined`);
      await sleep(50);
      expect(again.closeCode).toBeNull();
      again.ws.close();
      await waitFor(() => relay!.room(SESSION)?.peers === 0, 2000, `${id} left again`);
    }
    expect(host.got.filter((m) => m.kind === 'hello').map((m) => `${m.from}#${m.seq}`)).toEqual(['view-v1#1', 'view-v1#2', 'ctl-c1#1', 'ctl-c1#2']);
  });

  it('(e) the laptop Remote whose socket dropped reconnects with its id and its commands are applied', async () => {
    const { panelT, step } = await setup('relay');
    expect(await step(90)).toMatchObject(OK);
    panelT.dropForTest!();
    await sleep(50);
    await waitStatus(panelT, 'open', 5000);
    expect(await step(120)).toMatchObject(OK);
  }, 20_000);

  it('(d) a live host cannot be replaced: the same id is refused (retryable), another id as a second host (fatal)', async () => {
    await startClassroomRelay();
    const host = await socket('host-h1', { phone: false, role: 'host' });
    host.hello(1);
    await waitFor(() => relay!.room(SESSION)?.hostOnline === true, 2000, 'host');
    const sameId = await socket('host-h1', { phone: false, role: 'host' });
    sameId.hello(9);
    const otherId = await socket('host-h2', { phone: false, role: 'host' });
    otherId.hello(1);
    await waitFor(() => sameId.closeCode !== null && otherId.closeCode !== null, 2000, 'refusals');
    expect([sameId.closeCode, otherId.closeCode]).toEqual([RELAY_RETRY_CLOSE.idTaken, RELAY_CLOSE.hostExists]);
    expect(host.closeCode).toBeNull();
  });

  it("(d) the follower's transport keeps retrying a taken id and gets in once the holder leaves", async () => {
    await startClassroomRelay();
    const host = await socket('host-h1', { phone: false, role: 'host' });
    host.hello(1);
    const holder = await socket('view-v9');
    holder.hello(1);
    await waitFor(() => relay!.room(SESSION)?.peers === 1, 2000, 'holder joined');
    const t = createWebSocketTransport({ url: `ws://[::1]:${relay!.port}/`, backoff: { baseMs: 50, maxMs: 100, jitter: 0 } });
    closers.push(() => t.close());
    const stamp = createStamper(SESSION, 'view-v9');
    const statuses: string[] = [];
    t.onStatus((st) => {
      statuses.push(st);
      if (st === 'open') t.send(stamp({ kind: 'hello', role: 'viewer' }));
    });
    await waitFor(() => relayLog.filter((l) => l.includes('view-v9 refused')).length >= 2, 3000, 'two refusals');
    expect(t.status).not.toBe('error');
    holder.ws.close();
    await waitFor(() => host.got.filter((m) => m.kind === 'hello' && m.from === 'view-v9').length === 2, 3000, "the newcomer's hello at the host");
    await sleep(150);
    expect(t.status).toBe('open');
    expect(statuses).not.toContain('error');
    expect(relay!.room(SESSION)?.peers).toBe(1);
  });
});

/** A socket that stops answering pings (half-open: its network dropped, nothing told the relay). */
async function silent(from: string, role: Role, phone: boolean) {
  const ws = new WsClient(phone ? `ws://[::1]:${relay!.port}/` : `ws://127.0.0.1:${relay!.port}/`, { autoPong: false });
  const s = { ws, closed: false };
  ws.on('close', () => (s.closed = true));
  ws.on('error', () => undefined);
  await new Promise((ok) => ws.once('open', ok));
  ws.send(JSON.stringify({ v: 1, session: SESSION, from, seq: 1, sentAt: Date.now(), kind: 'hello', role }));
  closers.push(() => ws.terminate());
  return s;
}

describe('relay: a half-open socket gives its id up within about 3 s', () => {
  it('(f) a phone whose old socket is silent reconnects with its id', async () => {
    await startClassroomRelay();
    const host = await socket('host-h1', { phone: false, role: 'host' });
    host.hello(1);
    const old = await silent('view-v1', 'viewer', true);
    await waitFor(() => relay!.room(SESSION)?.peers === 1, 2000, 'old joined');
    const t0 = Date.now();
    const again = await socket('view-v1');
    again.hello(2);
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'view-v1' && m.seq === 2), 5000, 'the reconnect reached the host');
    const took = Date.now() - t0;
    expect(took).toBeGreaterThanOrEqual(2900);
    expect(took).toBeLessThan(4000);
    await waitFor(() => old.closed, 2000, 'the silent socket closed');
    expect(again.closeCode).toBeNull();
    expect(relay!.room(SESSION)?.peers).toBe(1);
    expect(relayLog.some((l) => /viewer view-v1 did not answer within 3000 ms/.test(l))).toBe(true);
  }, 10_000);

  it('(f) a host whose old socket is silent: the same id and a reloaded page (a new id) both get in', async () => {
    await startClassroomRelay();
    const view = await socket('view-v1');
    view.hello(1);
    for (const id of ['host-h1', 'host-h2']) {
      const old = await silent('host-h1', 'host', false);
      await waitFor(() => relay!.room(SESSION)?.hostOnline === true, 2000, 'old host');
      const t0 = Date.now();
      const fresh = await socket(id, { phone: false, role: 'host' });
      fresh.hello(2);
      await waitFor(() => view.got.some((m) => m.kind === 'hello' && m.from === id && m.seq === 2), 5000, `${id}: the new host's hello reached the viewer`);
      expect(Date.now() - t0).toBeLessThan(4000);
      await waitFor(() => old.closed, 2000, 'the silent host closed');
      expect(fresh.closeCode).toBeNull();
      expect(relay!.room(SESSION)?.hostOnline).toBe(true);
      fresh.ws.close();
      await waitFor(() => relay!.room(SESSION)?.hostOnline === false, 2000, 'host left');
    }
  }, 15_000);
});
