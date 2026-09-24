// Relay integration tests: a real `ws` server on a random port, raw WebSocket clients (Node's global).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStamper, type Role, type WireMessage } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'RQY234';
let relay: RelayHandle;
let url: string;
beforeEach(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000, roomTtlMs: 1000 });
  url = `ws://127.0.0.1:${relay.port}/`;
});
afterEach(async () => relay.close());

interface Client {
  ws: WebSocket;
  got: Array<Record<string, unknown>>;
  closeCode: number | null;
  send(b: Parameters<ReturnType<typeof createStamper>>[0]): WireMessage;
  wire(kind: WireMessage['kind']): WireMessage[];
}

async function client(id: string, role: Role, session = SESSION): Promise<Client> {
  const ws = new WebSocket(url);
  const stamp = createStamper(session, id);
  const c: Client = {
    ws,
    got: [],
    closeCode: null,
    send(b) {
      const m = stamp(b);
      ws.send(JSON.stringify(m));
      return m;
    },
    wire: (kind) => c.got.filter((m) => m.kind === kind) as unknown as WireMessage[],
  };
  ws.onmessage = (e) => c.got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
  ws.onclose = (e) => (c.closeCode = e.code);
  await new Promise((r) => (ws.onopen = r));
  c.send({ kind: 'hello', role });
  await sleep(20);
  return c;
}

const snap = { schema: 'pme-snapshot/1' as const, engineVersion: '0.0.0', seed: 1, tick: 500, state: { x: 1 } };

describe('relay', () => {
  it('fans host events to every peer and never back to the host', async () => {
    const host = await client('h', 'host');
    const c = await client('c', 'controller');
    const v = await client('v', 'viewer');
    host.send({ kind: 'event', body: [{ type: 'measurement', t: 1, values: {} }] });
    await waitFor(() => c.wire('event').length === 1 && v.wire('event').length === 1);
    await sleep(20);
    expect(host.wire('event')).toEqual([]);
  });

  it('routes controller commands only to the host, and the ack only to the issuer', async () => {
    const host = await client('h', 'host');
    const c1 = await client('c1', 'controller');
    const c2 = await client('c2', 'controller');
    const v = await client('v', 'viewer');
    c1.send({ kind: 'command', body: { id: 'k1', issuedBy: 'c1', type: 'setTarget', variable: 'hr', value: 90 } });
    await waitFor(() => host.wire('command').length === 1);
    host.send({ kind: 'ack', commandId: 'k1', accepted: true, tick: 5 });
    await waitFor(() => c1.wire('ack').length === 1);
    await sleep(20);
    expect(c2.wire('command').length + c2.wire('ack').length + v.wire('command').length + v.wire('ack').length).toBe(0);
  });

  it('host authority: a viewer command is refused, peer events are dropped, spoofed from is dropped', async () => {
    const host = await client('h', 'host');
    const v = await client('v', 'viewer');
    const c = await client('c', 'controller');
    v.send({ kind: 'command', body: { id: 'x', issuedBy: 'v', type: 'setTarget', variable: 'hr', value: 30 } });
    c.send({ kind: 'event', body: [{ type: 'measurement', t: 1, values: {} }] });
    c.ws.send(JSON.stringify(createStamper(SESSION, 'h')({ kind: 'event', body: [] }))); // pretends to be the host
    await waitFor(() => v.got.some((f) => f.relay === 'error'));
    await sleep(30);
    expect(host.wire('command')).toEqual([]);
    expect(v.wire('event')).toEqual([]);
    expect(relay.stats().dropped).toBeGreaterThanOrEqual(3);
  });

  it('refuses a second host and a bad first frame', async () => {
    await client('h', 'host');
    const h2 = await client('h2', 'host');
    await waitFor(() => h2.closeCode !== null);
    expect(h2.closeCode).toBe(RELAY_CLOSE.hostExists);
    const ws = new WebSocket(url);
    await new Promise((r) => (ws.onopen = r));
    const closed = new Promise<number>((r) => (ws.onclose = (e) => r(e.code)));
    ws.send(JSON.stringify(createStamper(SESSION, 'z')({ kind: 'event', body: [] })));
    expect(await closed).toBe(RELAY_CLOSE.badHello);
  });

  it('sends a host snapshot only to peers that said hello since their last one, and caches it', async () => {
    const host = await client('h', 'host');
    const v1 = await client('v1', 'viewer');
    await waitFor(() => host.wire('hello').length === 1); // v1's hello reached the host
    host.send({ kind: 'snapshot', body: snap });
    await waitFor(() => v1.wire('snapshot').length === 1);
    const v2 = await client('v2', 'viewer');
    host.send({ kind: 'snapshot', body: { ...snap, tick: 900 } });
    await waitFor(() => v2.wire('snapshot').length === 1);
    await sleep(20);
    expect(v1.wire('snapshot').length).toBe(1); // v1 did not ask again
    expect(relay.room(SESSION)?.hasSnapshot).toBe(true);
  });

  it('serves the cached snapshot to a late joiner while the host is offline, and re-announces a returning host', async () => {
    const host = await client('h', 'host');
    const v1 = await client('v1', 'viewer');
    host.send({ kind: 'snapshot', body: snap });
    await waitFor(() => v1.wire('snapshot').length === 1);
    host.ws.close();
    await waitFor(() => relay.room(SESSION)?.hostOnline === false);
    const v2 = await client('v2', 'viewer');
    await waitFor(() => v2.wire('snapshot').length === 1);
    expect(v2.got.some((f) => f.relay === 'peers' && f.hostOnline === false)).toBe(true);
    await client('h', 'host');
    await waitFor(() => v1.wire('hello').length === 1 && v2.wire('hello').length === 1);
  });

  it('expires an empty room after roomTtlMs, and terminates sockets that miss a heartbeat', async () => {
    const v = await client('v', 'viewer');
    v.ws.close();
    await waitFor(() => relay.stats().sockets === 0);
    relay.sweep(Date.now() + 2000);
    expect(relay.room(SESSION)).toBeUndefined();
    const c = await client('c', 'controller', 'RQY235');
    relay.sweep(); // marks, pings and sends {relay:'hb'}
    await waitFor(() => c.got.some((f) => f.relay === 'hb'));
    expect(c.closeCode).toBeNull(); // Node's WebSocket answers pings, so it survives the next sweep
    relay.sweep();
    await sleep(30);
    expect(c.closeCode).toBeNull();
  });
});
