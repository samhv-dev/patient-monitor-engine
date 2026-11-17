// The relay and the sign-in ticket (session/sign-in-book.ts): a hello that proves a ticket instead of a PIN is admitted as
// a PIN hello is (pending until the host's grant, under the same per-address limits); it reaches the host alone; the
// host's grant with the next ticket reaches that socket alone; a refused ticket counts with the wrong PINs; and after a
// new host socket, a granted device that stayed says its ticket again on the host's hello and is granted on its socket.
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, REJOINED, RELAY_PEER, type Role } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'RMT234';
const TICKET = `ABCDEFGH.${'a'.repeat(22)}`;
const NEXT = `ABCDEFGH.${'b'.repeat(22)}`;
let relay: RelayHandle | null = null;
const closers: Array<() => void> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) c();
  await relay?.close();
  relay = null;
});
const start = async () => (relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000, takenCheckMs: 300, remoteRoles: 'viewer', isLocal: (_a, req) => !req?.url?.includes('e2e-remote') }));

interface Sock {
  raw: string[];
  got: Array<Record<string, unknown>>;
  closeCode: number | null;
  send: (body: Record<string, unknown>) => void;
  close: () => void;
}
async function join(from: string, role: Role, extra: Record<string, unknown> = {}): Promise<Sock> {
  const ws = new WebSocket(`ws://127.0.0.1:${relay!.port}/${role === 'host' ? '' : '?e2e-remote'}`);
  const stamp = createStamper(SESSION, from);
  const s: Sock = { raw: [], got: [], closeCode: null, send: (body) => ws.send(JSON.stringify(stamp(body as never))), close: () => ws.close() };
  ws.onmessage = (e) => {
    const d = String(e.data);
    if (d.startsWith('{"relay":"hb"')) return;
    s.raw.push(d);
    s.got.push(JSON.parse(d) as Record<string, unknown>);
  };
  ws.onclose = (e) => (s.closeCode = e.code);
  await new Promise((ok) => (ws.onopen = ok));
  closers.push(() => ws.close());
  s.send({ kind: 'hello', role, ...extra });
  await waitFor(() => s.got.some((f) => f.relay === 'peers') || s.closeCode !== null, 2000, `${from} admitted or closed`);
  return s;
}
const helloAt = (host: Sock, from: string) => host.got.filter((m) => m.kind === 'hello' && m.from === from);

describe('a ticket hello at the relay', () => {
  for (const [role, extra] of [['learner', { show: 'learner', device: 'remote0001' }], ['pump', { device: 'tablet0001' }], ['instructor', {}], ['ventilator', {}]] as const) {
    it(`${role}: pending until the host's grant; its ticket reaches the host alone; the next ticket reaches that socket alone`, async () => {
      await start();
      const host = await join('host-h1', 'host');
      const other = await join('lm-1', 'viewer', { show: 'learner', device: 'monitor0001' });
      const d = await join('d-1', role, { ...extra, ticket: TICKET });
      await waitFor(() => helloAt(host, 'd-1').length === 1, 2000, 'hello at the host');
      expect(helloAt(host, 'd-1')[0]).toMatchObject({ ticket: TICKET });
      d.send({ kind: 'command', body: { id: 'c1', issuedBy: 'x', type: 'time', action: 'pause' } });
      await waitFor(() => d.got.some((f) => f.relay === 'error'), 2000, 'forbidden while pending');
      expect(d.got.find((f) => f.relay === 'error')).toMatchObject({ code: 'forbidden' });
      host.send({ kind: 'grant', to: 'd-1', granted: true, ticket: NEXT });
      await waitFor(() => d.got.some((m) => m.kind === 'grant'), 2000, 'grant at the device');
      expect(d.got.find((m) => m.kind === 'grant')).toMatchObject({ granted: true, ticket: NEXT });
      await sleep(100);
      expect(other.raw.some((r) => r.includes(TICKET) || r.includes(NEXT))).toBe(false);
      expect(host.raw.filter((r) => r.includes(NEXT))).toHaveLength(0); // the host's own grant is not echoed back
    });
  }

  it('a refused ticket is a wrong PIN: the fifth from one address within the minute closes it, too-many-tries', async () => {
    await start();
    const host = await join('host-h1', 'host');
    const socks: Sock[] = [];
    for (let i = 1; i <= 5; i++) {
      const d = await join(`lr-${i}`, 'learner', { show: 'learner', device: 'remote0001', ticket: TICKET });
      await waitFor(() => helloAt(host, `lr-${i}`).length === 1, 2000, `hello ${i}`);
      host.send({ kind: 'grant', to: `lr-${i}`, granted: false, reason: 'this sign-in was already used or is not known' });
      await waitFor(() => d.closeCode !== null, 2000, `closed ${i}`);
      expect(d.closeCode).toBe(RELAY_CLOSE.denied);
      socks.push(d);
    }
    const sixth = await join('lr-6', 'learner', { show: 'learner', device: 'remote0001', ticket: TICKET });
    expect(sixth.closeCode).toBe(RELAY_CLOSE.tooManyTries);
  });

  it("a new host socket: the granted device is told the relay's notice, stays, and its ticket hello on the new host's hello is granted on the same socket", async () => {
    await start();
    const host1 = await join('host-h1', 'host');
    const d = await join('lr-1', 'learner', { show: 'learner', device: 'remote0001', ticket: TICKET });
    host1.send({ kind: 'grant', to: 'lr-1', granted: true, ticket: NEXT });
    await waitFor(() => d.got.some((m) => m.kind === 'grant'), 2000, 'granted');
    host1.close(); // the laptop's page reloads: a new page, a new host id
    await sleep(100);
    const host2 = await join('host-h2', 'host');
    await waitFor(() => d.got.filter((m) => m.kind === 'grant').length === 2, 2000, 'the notice');
    expect(d.got.filter((m) => m.kind === 'grant')[1]).toMatchObject({ from: RELAY_PEER, granted: false, reason: REJOINED });
    expect(d.closeCode).toBeNull();
    d.send({ kind: 'hello', role: 'learner', show: 'learner', device: 'remote0001', ticket: NEXT });
    await waitFor(() => helloAt(host2, 'lr-1').length === 1, 2000, 're-hello at the new host');
    host2.send({ kind: 'grant', to: 'lr-1', granted: true, ticket: TICKET });
    await waitFor(() => d.got.filter((m) => m.kind === 'grant').length === 3, 2000, 'granted again');
    expect(d.closeCode).toBeNull();
    // the Room page's table: the same socket, one row, granted again
    const rows = () => (host2.got.filter((m) => m.relay === 'peers' && Array.isArray(m.devices)).at(-1)?.devices ?? []) as Array<{ id: string; granted: boolean }>;
    await waitFor(() => rows().some((x) => x.id === 'lr-1' && x.granted), 2000, 'granted row');
    expect(rows().filter((x) => x.id === 'lr-1')).toHaveLength(1);
  });
});
