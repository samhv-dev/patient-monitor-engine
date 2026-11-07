// Plan room-and-instruments.md R2 (§3.3, §4 D2): the relay measures each device's round trip at its heartbeat sweep and
// tells the HOST only, as `devices` in the host's `peers` frame. The ping is the relay↔device hop.
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket as WsClient } from 'ws';
import { createStamper, type WireBody } from '../../src/protocol.ts';
import type { RelayFrame } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'DVS234';
type Peers = Extract<RelayFrame, { relay: 'peers' }>;
let relay: RelayHandle | null = null;
let clock = 1_000_000;
afterEach(async () => {
  await relay?.close();
  relay = null;
});
const start = async () => (relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 3_600_000, now: () => clock }));

/** A socket of the `ws` library, so a test can stop it answering pings (`autoPong: false`). */
async function client(r: RelayHandle, id: string, hello: Record<string, unknown>, o: { autoPong?: boolean } = {}) {
  const ws = new WsClient(`ws://127.0.0.1:${r.port}/`, { autoPong: o.autoPong ?? true });
  const got: Array<Record<string, unknown>> = [];
  const raw: string[] = [];
  ws.on('message', (d) => {
    raw.push(String(d));
    got.push(JSON.parse(String(d)) as Record<string, unknown>);
  });
  await new Promise((ok) => ws.once('open', ok));
  ws.send(JSON.stringify({ ...createStamper(SESSION, id)({ kind: 'hello', role: 'viewer' } as WireBody), ...hello }));
  await sleep(20);
  const peers = () => got.filter((f): f is Peers & Record<string, unknown> => f.relay === 'peers') as unknown as Peers[];
  return { ws, got, raw, peers, last: () => peers().at(-1) as Peers };
}

describe("the relay's device table (R2)", () => {
  it('after a sweep and its pongs the host hears one entry per non-host socket: id, role, show, device, granted, rttMs, sinceMs', async () => {
    const r = await start();
    clock = 1_000_000;
    const h = await client(r, 'host-1', { role: 'host' });
    const a = await client(r, 'view-aaa234', { show: 'learner', device: 'k3x9q2m7' });
    const b = await client(r, 'view-bbb234', { show: 'defib', device: '0123456789abcdef' });
    const c = await client(r, 'ctl-ccc234', { role: 'controller' });
    clock = 2_000_000;
    r.sweep(clock);
    clock += 37; // every pong arrives "37 ms later" on the fake clock
    await sleep(50);
    clock += 1000;
    r.sweep(clock); // the frame of this sweep reports the answers to the last one
    await waitFor(() => (h.last().devices?.every((d) => d.rttMs === 37) ?? false) && h.peers().length >= 6);
    const sent = h.peers().at(-1) as Peers;
    expect(sent.devices).toEqual([
      { id: 'view-aaa234', role: 'viewer', show: 'learner', device: 'k3x9q2m7', granted: false, rttMs: 37, sinceMs: 1000 },
      { id: 'view-bbb234', role: 'viewer', show: 'defib', device: '0123456789abcdef', granted: false, rttMs: 37, sinceMs: 1000 },
      { id: 'ctl-ccc234', role: 'controller', show: null, device: null, granted: true, rttMs: 37, sinceMs: 1000 },
    ]);
    void a; void b; void c;
  });

  it('a socket that did not answer the last ping has rttMs null and a growing sinceMs; the next sweep removes it', async () => {
    const r = await start();
    clock = 3_000_000; // every socket joins at this time
    const h = await client(r, 'host-1', { role: 'host' });
    await client(r, 'view-aaa234', { show: 'learner' });
    const quiet = await client(r, 'view-qqq234', { show: 'learner' }, { autoPong: false });
    r.sweep(clock);
    clock += 12;
    await sleep(50);
    // two joins after the sweep: each frame shows the quiet socket unanswered, and longer silent each time
    clock += 4000;
    await client(r, 'view-jjj234', {});
    const first = h.last().devices?.find((d) => d.id === 'view-qqq234');
    clock += 4000;
    await client(r, 'view-kkk234', {});
    const second = h.last().devices?.find((d) => d.id === 'view-qqq234');
    expect(first).toMatchObject({ rttMs: null, sinceMs: 4012 }); // silent since it joined
    expect(second).toMatchObject({ rttMs: null });
    expect((second?.sinceMs ?? 0) - (first?.sinceMs ?? 0)).toBe(4000);
    expect(h.last().devices?.find((d) => d.id === 'view-aaa234')).toMatchObject({ rttMs: 12 });
    // the second sweep since it went silent: terminated (today's rule), and gone from the host's table
    clock += 2000;
    r.sweep(clock);
    await waitFor(() => quiet.ws.readyState === quiet.ws.CLOSED);
    await waitFor(() => !h.last().devices?.some((d) => d.id === 'view-qqq234'));
    expect(h.last().devices?.map((d) => d.id)).toEqual(['view-aaa234', 'view-jjj234', 'view-kkk234']);
  });

  it('a hello without show reports show null; an instructor entry never carries a PIN', async () => {
    const r = await start();
    const h = await client(r, 'host-1', { role: 'host' });
    await client(r, 'view-aaa234', {});
    await client(r, 'ctl-ppp234', { role: 'instructor', pin: '4729' });
    await waitFor(() => (h.last().devices?.length ?? 0) === 2);
    const [v, i] = h.last().devices ?? [];
    expect(v).toMatchObject({ show: null, device: null, rttMs: null });
    expect(i).toMatchObject({ id: 'ctl-ppp234', role: 'instructor', granted: false, show: null, device: null });
    expect(Object.keys(i as object).sort()).toEqual(['device', 'granted', 'id', 'role', 'rttMs', 'show', 'sinceMs']);
    expect(h.raw.filter((s) => s.includes('"relay":"peers"')).some((s) => s.includes('4729'))).toBe(false);
  });

  it('the host hears the table on every sweep, every join and every leave; the learners never do', async () => {
    const r = await start();
    const h = await client(r, 'host-1', { role: 'host' });
    const v = await client(r, 'view-aaa234', { show: 'learner', device: 'k3x9q2m7' });
    const n0 = h.peers().length;
    const w = await client(r, 'view-bbb234', {});
    expect(h.peers().length).toBe(n0 + 1); // join
    r.sweep(clock);
    await waitFor(() => h.peers().length === n0 + 2); // sweep
    w.ws.close();
    await waitFor(() => h.peers().length === n0 + 3); // leave
    expect(h.peers().every((f) => Array.isArray(f.devices))).toBe(true);
    expect(v.peers().length).toBeGreaterThan(0);
    for (const f of v.peers()) expect(Object.keys(f).sort()).toEqual(['hostOnline', 'peers', 'relay']);
  });

  it('with 60 devices the host frame stays within 8 KB', async () => {
    const r = await start();
    const h = await client(r, 'host-1', { role: 'host' });
    for (let i = 0; i < 60; i++) await client(r, `view-${String(i).padStart(6, 'x')}`, { show: 'learner', device: `d${String(i).padStart(15, '0')}` });
    clock += 99_999;
    r.sweep(clock);
    clock += 999; // a 999 ms round trip: three digits, as a slow phone gives
    await sleep(100);
    clock += 99_999;
    r.sweep(clock);
    await waitFor(() => h.last().devices?.length === 60 && h.last().devices?.every((d) => d.rttMs === 999) === true, 5000);
    const bytes = Buffer.byteLength(h.raw.filter((s) => s.includes('"relay":"peers"')).at(-1) as string);
    console.log(`host peers frame with 60 devices: ${bytes} bytes`);
    expect(bytes).toBeLessThanOrEqual(8 * 1024);
  });
});
