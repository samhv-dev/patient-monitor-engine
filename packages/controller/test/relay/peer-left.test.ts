// R29 (roadmap "Peer-left frame from the relay", the known gap of #183): while a peer's socket is down, the host kept
// that relay peer's last sequence number and role. A hand-written hello with a Remote's id and a high seq, sent while
// the Remote reconnected, made the host drop the Remote's frames as duplicates (or refuse it as a viewer) until its
// page reloaded. The relay now tells the host `{relay:'peer-left', id}` when a non-host socket leaves the room, and the
// host forgets that (transport, id): the next socket under the id starts fresh.
// Addresses as in peer-identity.test.ts: the laptop on 127.0.0.1, the phones on [::1] (the classroom gate is real).
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket as WsClient } from 'ws';
import { createStamper, type ManagedTransport, type Role, type WireMessage } from '../../src/protocol.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, sleep, waitFor, waitStatus } from '../helpers.ts';

const SESSION = 'VPD567';
let relay: RelayHandle | null = null;
let hs: HostSession | null = null;
const closers: Array<() => void> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) c();
  hs?.close();
  hs = null;
  await relay?.close();
  relay = null;
});

const startClassroomRelay = async () =>
  (relay = await startRelay({ port: 0, host: '::', heartbeatMs: 60_000, remoteRoles: 'viewer', isLocal: (a) => a !== '::1', log: () => undefined }));

/** A raw socket with hand-made frames. `phone`: another device ([::1]). */
async function socket(from: string, opts: { phone?: boolean; role?: Role } = {}) {
  const ws = new WebSocket(opts.phone === false ? `ws://127.0.0.1:${relay!.port}/` : `ws://[::1]:${relay!.port}/`);
  const got: Array<Record<string, unknown>> = [];
  const s = {
    ws,
    got,
    hello: (seq: number) => ws.send(JSON.stringify({ v: 1, session: SESSION, from, seq, sentAt: Date.now(), kind: 'hello', role: opts.role ?? 'viewer' })),
  };
  ws.onmessage = (e) => got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
  await new Promise((ok) => (ws.onopen = ok));
  closers.push(() => ws.close());
  return s;
}

/** A socket that stops answering pings (half-open). */
async function silent(from: string, role: Role) {
  const ws = new WsClient(`ws://[::1]:${relay!.port}/`, { autoPong: false });
  const s = { closed: false };
  ws.on('close', () => (s.closed = true));
  ws.on('error', () => undefined);
  await new Promise((ok) => ws.once('open', ok));
  ws.send(JSON.stringify({ v: 1, session: SESSION, from, seq: 1, sentAt: Date.now(), kind: 'hello', role }));
  closers.push(() => ws.terminate());
  return s;
}

describe("R29: the relay tells the host a peer left, so a forged hello in a Remote's reconnection window blocks nothing", () => {
  for (const seq of [1_000_000_000, 1]) {
    it(`a phone says hello with the Remote's id (seq ${seq}) while the Remote is down, then leaves: the reconnected Remote commands`, async () => {
      await startClassroomRelay();
      const laptop = `ws://127.0.0.1:${relay!.port}/`;
      hs = new HostSession({ session: SESSION, target: manualHost(), stateIntervalMs: 0 });
      const hostWs = createWebSocketTransport({ url: laptop });
      closers.push(() => hostWs.close());
      hs.addTransport(hostWs);
      await waitStatus(hostWs, 'open');
      await waitFor(() => relay!.room(SESSION)?.hostOnline === true, 2000, 'host on relay');
      // The laptop Remote, with a reconnect delay long enough to open the window deterministically (1.5 s, no jitter)
      const remoteT = createWebSocketTransport({ url: laptop, backoff: { baseMs: 1500, maxMs: 1500, jitter: 0 } });
      closers.push(() => remoteT.close());
      const remote = new ControllerSession({ session: SESSION, transport: remoteT, issuedBy: 'instructor', resendMs: 300, answerTimeoutMs: 3000 });
      closers.push(() => remote.close());
      await waitStatus(remoteT, 'open');
      const step = async (value: number) => {
        const r = await remote.send({ type: 'setTarget', variable: 'hr', value } as never);
        return { accepted: r.accepted, reason: r.reason };
      };
      expect(await step(90)).toMatchObject({ accepted: true });
      remoteT.dropForTest();
      await waitFor(() => relay!.room(SESSION)?.peers === 0, 1000, 'the Remote left');
      // The id is ordinary wire data (every commandApplied carries it): a phone claims it while the Remote is away
      const evil = await socket(remote.peerId);
      evil.hello(seq);
      await waitFor(() => relay!.room(SESSION)?.peers === 1, 1000, 'the forger joined');
      await sleep(100); // its hello reaches the host
      evil.ws.close();
      await waitFor(() => relay!.room(SESSION)?.peers === 0, 1000, 'the forger left');
      await waitStatus(remoteT, 'open', 5000);
      expect(await step(120)).toMatchObject({ accepted: true });
      expect(hs.stats.applied).toBe(2);
    }, 20_000);
  }

  it("the host hears `peer-left` for a learner's socket and for a Remote's, never for its own, and learners never hear it", async () => {
    await startClassroomRelay();
    const host = await socket('host-h1', { phone: false, role: 'host' });
    host.hello(1);
    const view = await socket('view-v1');
    view.hello(1);
    const other = await socket('view-v2');
    other.hello(1);
    const ctl = await socket('ctl-c1', { phone: false, role: 'controller' });
    ctl.hello(1);
    await waitFor(() => relay!.room(SESSION)?.peers === 3, 2000, 'three peers');
    view.ws.close();
    ctl.ws.close();
    await waitFor(() => host.got.filter((f) => f.relay === 'peer-left').length === 2, 2000, 'two peer-left frames');
    expect(host.got.filter((f) => f.relay === 'peer-left').map((f) => String(f.id)).sort()).toEqual(['ctl-c1', 'view-v1']); // the two closes race
    expect(other.got.some((f) => f.relay === 'peer-left')).toBe(false);
  });

  it("a half-open socket replaced by its own id's reconnect: `peer-left` reaches the host BEFORE the new hello, and only once", async () => {
    await startClassroomRelay();
    const host = await socket('host-h1', { phone: false, role: 'host' });
    host.hello(1);
    const old = await silent('view-v1', 'viewer');
    await waitFor(() => relay!.room(SESSION)?.peers === 1, 2000, 'old joined');
    const again = await socket('view-v1');
    again.hello(2);
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'view-v1' && m.seq === 2), 5000, 'the reconnect reached the host');
    await waitFor(() => old.closed, 2000, 'the silent socket closed');
    await sleep(150); // the terminated socket's close event has run
    const seen = host.got.filter((f) => f.relay === 'peer-left' || (f.kind === 'hello' && f.from === 'view-v1')).map((f) => (f.relay === 'peer-left' ? `left ${String(f.id)}` : `hello #${String(f.seq)}`));
    expect(seen).toEqual(['hello #1', 'left view-v1', 'hello #2']);
  }, 10_000);
});

describe('the host forgets a peer on peer-left, on that transport only', () => {
  /** A transport double that reports peer-left (the relay's link does; the in-process hub does not). */
  function withPeerLeft(t: ManagedTransport) {
    const fns = new Set<(id: string) => void>();
    const out = Object.assign(Object.create(t) as ManagedTransport, {
      onPeerLeft: (fn: (id: string) => void) => (fns.add(fn), () => void fns.delete(fn)),
    });
    return { t: out, left: (id: string) => fns.forEach((fn) => fn(id)) };
  }

  it("after peer-left the id's next hello starts fresh: a forged seq and role no longer apply; another transport's peer is untouched", async () => {
    const hub = createInProcessHub();
    hs = new HostSession({ session: SESSION, target: manualHost(), stateIntervalMs: 0 });
    const relayed = withPeerLeft(hub.connect());
    hs.addTransport(relayed.t);
    const otherHub = createInProcessHub();
    hs.addTransport(otherHub.connect());
    const peer = hub.connect();
    const got = collect(peer);
    const sideways = otherHub.connect();
    const gotSide = collect(sideways);
    const ack = (g: WireMessage[], id: string) => g.find((m): m is Extract<WireMessage, { kind: 'ack' }> => m.kind === 'ack' && m.commandId === id);
    const cmd = (id: string) => ({ kind: 'command', body: { id, issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 90 } }) as never;
    // The same id on another transport, which hears no peer-left: it keeps its state
    const side = createStamper(SESSION, 'ctl-r1');
    sideways.send({ v: 1, session: SESSION, from: 'ctl-r1', seq: 1_000_000_000, sentAt: Date.now(), kind: 'hello', role: 'viewer' } as WireMessage);
    // The forger on the relayed transport, then it leaves
    peer.send({ v: 1, session: SESSION, from: 'ctl-r1', seq: 1_000_000_000, sentAt: Date.now(), kind: 'hello', role: 'viewer' } as WireMessage);
    await sleep(20);
    relayed.left('ctl-r1');
    // The Remote's fresh socket: its own seq from 1
    const stamp = createStamper(SESSION, 'ctl-r1');
    peer.send(stamp({ kind: 'hello', role: 'controller' }));
    peer.send(stamp(cmd('k1')));
    await waitFor(() => ack(got, 'k1') !== undefined, 2000, 'ack k1');
    expect(ack(got, 'k1')).toMatchObject({ accepted: true });
    sideways.send(side(cmd('k2'))); // seq 1 ≤ 1e9 on the transport that heard no peer-left: dropped as before
    await sleep(50);
    expect(ack(gotSide, 'k2')).toBeUndefined();
  });
});
