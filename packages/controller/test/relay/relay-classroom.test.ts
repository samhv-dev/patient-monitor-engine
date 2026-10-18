// Stage 12: the relay in a classroom — it serves the built app and /pme-relay.json on its own port, another device may
// only follow, a session takes a limited number of phones, and the host hears how many follow.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, type Role } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'CKS234';
let relay: RelayHandle | null = null;
afterEach(async () => relay?.close());
const start = async (o: RelayOptions = {}) => (relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000, ...o }));

async function client(r: RelayHandle, id: string, role: Role) {
  const ws = new WebSocket(`ws://127.0.0.1:${r.port}/`);
  const got: Array<Record<string, unknown>> = [];
  const c = { ws, got, closeCode: null as number | null, send: (b: Parameters<ReturnType<typeof createStamper>>[0]) => ws.send(JSON.stringify(createStamper(SESSION, id)(b))) };
  ws.onmessage = (e) => got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
  ws.onclose = (e) => (c.closeCode = e.code);
  await new Promise((ok) => (ws.onopen = ok));
  c.send({ kind: 'hello', role });
  await sleep(20);
  return c;
}

describe('the classroom relay', () => {
  it('serves the built app and /pme-relay.json over http on the WebSocket port; nothing outside the folder', async () => {
    const dir = mkdtempSync(join(tmpdir(), 's12-app-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>app</title>');
    writeFileSync(join(dir, 'assets/a.js'), 'export {}');
    const r = await start({ staticDir: dir });
    const get = (p: string) => fetch(`http://127.0.0.1:${r.port}${p}`);
    expect(await (await get('/')).text()).toContain('<title>app</title>');
    expect(await (await get('/?join=CKS234')).text()).toContain('<title>app</title>');
    expect((await get('/assets/a.js')).headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect((await get('/%2e%2e/%2e%2e/etc/passwd')).status).toBeGreaterThanOrEqual(403);
    expect((await get('/missing.html')).status).toBe(404);
    const info = (await (await get('/pme-relay.json')).json()) as { relay: string; port: number; addresses: string[]; serves: boolean };
    expect(info).toMatchObject({ relay: 'pme', port: r.port, serves: true });
    expect(Array.isArray(info.addresses) && info.addresses.every((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a) && !a.startsWith('127.'))).toBe(true);
  });

  it('a malformed request, a POST or raw garbage is that request\'s problem: the relay goes on serving', async () => {
    const r = await start({ staticDir: mkdtempSync(join(tmpdir(), 's12-app-')) });
    const base = `http://127.0.0.1:${r.port}`;
    expect((await fetch(`${base}/%E0%A4%A`)).status).toBe(400);
    expect((await fetch(`${base}/`, { method: 'POST', body: 'x' })).status).toBe(405);
    await new Promise<void>((ok) => {
      const s = connect(r.port, '127.0.0.1', () => s.end('\x00\xff NOT HTTP\r\n\r\n'));
      s.resume(); // read the relay's 400, so the socket can close
      s.on('close', () => ok());
      s.on('error', () => ok());
    });
    expect(((await (await fetch(`${base}/pme-relay.json`)).json()) as { relay: string }).relay).toBe('pme');
    const v = await client(r, 'v', 'viewer');
    expect(v.closeCode).toBeNull();
    expect(r.room(SESSION)?.peers).toBe(1);
  });

  it('a port already taken rejects (EADDRINUSE), as before the classroom mode', async () => {
    const r = await start();
    await expect(startRelay({ port: r.port, host: '127.0.0.1' })).rejects.toThrow(/EADDRINUSE/);
  });

  it('without a folder it still answers /pme-relay.json (serves: false) and nothing else', async () => {
    const r = await start();
    expect(((await (await fetch(`http://127.0.0.1:${r.port}/pme-relay.json`)).json()) as { serves: boolean }).serves).toBe(false);
    expect((await fetch(`http://127.0.0.1:${r.port}/`)).status).toBe(404);
  });

  it("remoteRoles 'viewer': another device may follow but not host or command (the code is on the projector)", async () => {
    const r = await start({ remoteRoles: 'viewer', isLocal: () => false });
    const c = await client(r, 'c', 'controller');
    const h = await client(r, 'h', 'host');
    const v = await client(r, 'v', 'viewer');
    await waitFor(() => c.closeCode !== null && h.closeCode !== null);
    expect([c.closeCode, h.closeCode]).toEqual([RELAY_CLOSE.forbiddenRole, RELAY_CLOSE.forbiddenRole]);
    expect(c.got.some((f) => f.relay === 'error' && f.code === 'forbidden')).toBe(true);
    expect(v.closeCode).toBeNull();
    expect(r.room(SESSION)?.peers).toBe(1);
    // nor the WebRTC signalling door (the classroom uses none)
    const sig = new WebSocket(`ws://127.0.0.1:${r.port}/signal?session=${SESSION}&peer=p1`);
    const code = await new Promise<number>((ok) => (sig.onclose = (e) => ok(e.code)));
    expect(code).toBe(RELAY_CLOSE.forbiddenRole);
  });

  it("this machine itself may still host and command (the instructor's laptop)", async () => {
    const r = await start({ remoteRoles: 'viewer', isLocal: () => true });
    const h = await client(r, 'h', 'host');
    const c = await client(r, 'c', 'controller');
    await sleep(30);
    expect([h.closeCode, c.closeCode]).toEqual([null, null]);
  });

  it('a session takes maxPeersPerRoom peers; the next is refused as full (a close code that does not retry)', async () => {
    const r = await start({ maxPeersPerRoom: 2 });
    await client(r, 'h', 'host'); // the host does not count
    const a = await client(r, 'a', 'viewer');
    const b = await client(r, 'b', 'viewer');
    const x = await client(r, 'x', 'viewer');
    await waitFor(() => x.closeCode !== null);
    expect(x.closeCode).toBe(RELAY_CLOSE.full);
    expect(x.got.find((f) => f.relay === 'error')).toMatchObject({ code: 'full', message: `session ${SESSION} is full (2)` });
    expect([a.closeCode, b.closeCode]).toEqual([null, null]);
  });

  it('the host hears how many peers follow, as they come and go', async () => {
    const r = await start();
    const h = await client(r, 'h', 'host');
    const v1 = await client(r, 'v1', 'viewer');
    await client(r, 'v2', 'viewer');
    await waitFor(() => h.got.some((f) => f.relay === 'peers' && f.peers === 2));
    v1.ws.close();
    await waitFor(() => (h.got.filter((f) => f.relay === 'peers').at(-1) as { peers: number }).peers === 1);
  });
});

describe('the addresses the QR code may use', () => {
  it("this Mac's hotspot first, then Wi-Fi or Ethernet, then the rest; never loopback or link-local", async () => {
    const { lanAddresses } = await import('../../relay/http.ts');
    const v4 = (address: string, internal = false) => ({ address, family: 'IPv4' as const, internal, netmask: '255.255.255.0', mac: '00:00:00:00:00:00', cidr: null });
    expect(lanAddresses({ lo0: [v4('127.0.0.1', true)], vmnet1: [v4('172.16.5.1')], en0: [v4('10.0.0.7'), v4('169.254.3.3')], bridge100: [v4('192.168.2.1')] } as never)).toEqual(['192.168.2.1', '10.0.0.7', '172.16.5.1']);
  });
});
