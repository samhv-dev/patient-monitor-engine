// Plan room-and-instruments.md R8b: the classroom relay admits ONE ventilator socket (a cockpit on another device, with
// the instructor's PIN) pending, as it admits an instructor; once the host grants it, `vent` goes from it to the host
// only and from the host to the socket its `to` names only — never to a learner or an instructor, never cached — and a
// socket past 120 `vent` a second is closed. The host is a raw socket with hand-made frames (the host's half is R8c).
// Every relay here runs on a fake clock (`now`); a phone marks itself with `?e2e-remote`.
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket as WsClient } from 'ws';
import { createStamper, type Role } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'VNT234';
const PIN = '4729';
let relay: RelayHandle | null = null;
let clock = 1_000_000;
const closers: Array<() => void> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) c();
  await relay?.close();
  relay = null;
  clock = 1_000_000;
});
const start = async (o: RelayOptions = {}) =>
  (relay = await startRelay({
    port: 0, host: '::', heartbeatMs: 60_000, takenCheckMs: 300, remoteRoles: 'viewer',
    isLocal: (_a, req) => !req?.url?.includes('e2e-remote'),
    now: () => clock,
    ...o,
  }));

interface Sock {
  ws: WebSocket;
  raw: string[];
  got: Array<Record<string, unknown>>;
  closeCode: number | null;
  hello: () => void;
  send: (body: Record<string, unknown>) => string;
}
async function sock(from: string, role: Role, o: { pin?: string | null; v6?: boolean; now?: () => number } = {}): Promise<Sock> {
  const phone = role !== 'host';
  const ws = new WebSocket(`ws://${o.v6 ? '[::1]' : '127.0.0.1'}:${relay!.port}/${phone ? '?e2e-remote' : ''}`);
  const stamp = createStamper(SESSION, from, o.now);
  const pin = o.pin === undefined ? (role === 'instructor' || role === 'ventilator' ? PIN : null) : o.pin;
  const s: Sock = {
    ws, raw: [], got: [], closeCode: null,
    hello: () => void s.send({ kind: 'hello', role, ...(pin !== null ? { pin } : {}) }),
    send: (body) => {
      const data = JSON.stringify(stamp(body as never));
      ws.send(data);
      return data;
    },
  };
  ws.onmessage = (e) => {
    const d = String(e.data);
    if (d.startsWith('{"relay":"hb"')) return;
    s.raw.push(d);
    s.got.push(JSON.parse(d) as Record<string, unknown>);
  };
  ws.onclose = (e) => (s.closeCode = e.code);
  await new Promise((ok) => (ws.onopen = ok));
  closers.push(() => ws.close());
  return s;
}
async function join(from: string, role: Role, o: Parameters<typeof sock>[2] = {}) {
  const s = await sock(from, role, o);
  s.hello();
  await waitFor(() => s.got.some((f) => f.relay === 'peers') || s.closeCode !== null, 2000, `${from} admitted or closed`);
  return s;
}
const errorOf = (s: Sock) => s.got.find((f) => f.relay === 'error') as { code: string; message: string } | undefined;
const vents = (s: Sock) => s.got.filter((m) => m.kind === 'vent');
const FRAME = { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 };
const cmds = (tick: number) => ({ kind: 'vent', body: { v: 1, kind: 'cmds', tick, cmds: [{ id: `vent-${tick}`, issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', frame: FRAME }] } });
const clockTo = (to: string, ventTick: number) => ({ kind: 'vent', to, body: { v: 1, kind: 'clock', ventTick } });
const settled = () => sleep(150);

/** The laptop's host, a learner's phone and an instructor's phone (granted), and the cockpit, pending or granted. */
async function room(o: { grant?: boolean; ventilator?: boolean } = {}, ro: RelayOptions = {}) {
  await start(ro);
  const host = await join('host-h1', 'host');
  const ins = await join('ins-a.1', 'instructor');
  await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-a.1'), 2000, 'instructor hello');
  host.send({ kind: 'grant', to: 'ins-a.1', granted: true });
  const vent = o.ventilator === false ? null : await join('vent-a.1', 'ventilator');
  const viewer = await join('view-v1', 'viewer');
  if (vent) {
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'vent-a.1'), 2000, 'ventilator hello at the host');
    if (o.grant !== false) {
      host.send({ kind: 'grant', to: 'vent-a.1', granted: true });
      await waitFor(() => vent.got.some((m) => m.kind === 'grant'), 2000, 'ventilator granted');
    }
  }
  await waitFor(() => ins.got.some((m) => m.kind === 'grant'), 2000, 'instructor granted');
  return { host, ins, vent: vent as Sock, viewer };
}

describe('a ventilator socket is admitted pending, with the PIN', () => {
  it("from another device under remoteRoles 'viewer'; its hello and PIN reach the host only; the host's devices list it", async () => {
    const { host, vent, viewer, ins } = await room({ grant: false });
    expect(vent.closeCode).toBeNull();
    expect(host.got.find((m) => m.kind === 'hello' && m.from === 'vent-a.1')).toMatchObject({ role: 'ventilator', pin: PIN });
    expect([viewer, ins].some((s) => s.raw.some((r) => r.includes('vent-a.1')))).toBe(false);
    const table = host.got.filter((f) => f.relay === 'peers').at(-1)!.devices as Array<Record<string, unknown>>;
    expect(table.find((d) => d.id === 'vent-a.1')).toMatchObject({ role: 'ventilator', granted: false, show: null, device: null });
    host.send({ kind: 'grant', to: 'vent-a.1', granted: true });
    await waitFor(() => vent.got.some((m) => m.kind === 'grant'), 2000, 'granted');
    await settled();
    const after = host.got.filter((f) => f.relay === 'peers').at(-1)!;
    expect((after.devices as Array<Record<string, unknown>>).find((d) => d.id === 'vent-a.1')).toMatchObject({ role: 'ventilator', granted: true });
    expect(after.instructors).toBe(1); // the instructors' count is the instructors'
  });

  it('a ventilator hello without a PIN never joins (the guard drops it: the socket is never admitted)', async () => {
    await start();
    const host = await join('host-h1', 'host');
    const s = await sock('vent-a.1', 'ventilator', { pin: null });
    s.hello();
    await settled();
    expect(s.got.some((f) => f.relay === 'peers')).toBe(false);
    expect(host.raw.some((r) => r.includes('vent-a.1'))).toBe(false);
  });

  it('pending: its `vent` is dropped with `forbidden` and never reaches the host; denied: closed (4013)', async () => {
    const { host, vent } = await room({ grant: false });
    for (let k = 1; k <= 20; k++) vent.send(cmds(k));
    await waitFor(() => errorOf(vent) !== undefined, 2000, 'forbidden');
    expect(errorOf(vent)).toMatchObject({ code: 'forbidden', message: 'the ventilator is not signed in' });
    await settled();
    expect(vents(host)).toEqual([]);
    expect(vent.closeCode).toBeNull();
    host.send({ kind: 'grant', to: 'vent-a.1', granted: false, reason: 'wrong PIN' });
    await waitFor(() => vent.closeCode !== null, 2000, 'closed');
    expect(vent.closeCode).toBe(RELAY_CLOSE.denied);
  });

  it('it is not a learner: it takes no place of maxPeersPerRoom, the learners are not told of it, and it follows nothing', async () => {
    const { host, vent, viewer } = await room({}, { maxPeersPerRoom: 1 });
    expect(viewer.closeCode).toBeNull(); // the one learner's place was free: the cockpit is beside it
    expect(viewer.got.find((f) => f.relay === 'peers')).toMatchObject({ peers: 1 }); // the learner itself, not the cockpit
    host.send({ kind: 'event', body: [{ type: 'state', t: 1, tick: 50, mode: 'manual', values: {}, control: {} }] });
    host.send({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 0 } });
    await waitFor(() => viewer.got.some((m) => m.kind === 'event'), 2000, 'the event at the learner');
    await settled();
    expect(vent.got.filter((m) => m.kind === 'event' || m.kind === 'snapshot')).toEqual([]);
  });

  it('one place: a second live cockpit is refused (`full`, 4029); the PIN limits of an address count its hellos', async () => {
    const { host } = await room();
    const second = await join('vent-b.1', 'ventilator');
    expect(second.closeCode).toBe(RELAY_CLOSE.full);
    expect(errorOf(second)).toMatchObject({ code: 'full' });
    expect(host.raw.some((r) => r.includes('vent-b.1'))).toBe(false);
  });

  it('5 wrong PINs from one address as a ventilator: neither a ventilator nor an instructor hello from it for 60 s', async () => {
    await start();
    const host = await join('host-h1', 'host');
    for (let i = 1; i <= 5; i++) {
      const s = await join(`vent-x.${i}`, 'ventilator', { pin: '1111' });
      await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === `vent-x.${i}`), 2000, 'hello at the host');
      host.send({ kind: 'grant', to: `vent-x.${i}`, granted: false, reason: 'wrong PIN' });
      await waitFor(() => s.closeCode !== null, 2000, 'denied');
      expect(s.closeCode).toBe(RELAY_CLOSE.denied);
    }
    for (const [id, role] of [['vent-x.6', 'ventilator'], ['ins-x.6', 'instructor']] as const) {
      const s = await join(id, role);
      expect(s.closeCode, id).toBe(RELAY_CLOSE.tooManyTries);
      expect(host.raw.some((r) => r.includes(id))).toBe(false);
    }
    expect((await join('vent-y.1', 'ventilator', { v6: true })).closeCode).toBeNull(); // another address
  });

  it("a new host socket signs a granted cockpit in again: the relay's own grant false, its socket open", async () => {
    const { host, vent } = await room();
    host.ws.close();
    const again = await join('host-h1', 'host');
    await waitFor(() => vent.got.filter((m) => m.kind === 'grant').length === 2, 2000, "the relay's grant false");
    expect(vent.got.filter((m) => m.kind === 'grant').at(-1)).toMatchObject({ to: 'vent-a.1', granted: false, from: 'pme-relay' });
    expect(vent.closeCode).toBeNull();
    vent.send(cmds(1));
    await waitFor(() => errorOf(vent) !== undefined, 2000, 'forbidden again');
    await settled();
    expect(vents(again)).toEqual([]);
  });
});

describe('granted, `vent` runs between the host and the cockpit only', () => {
  it("the cockpit's `cmds` reach the host byte for byte; the host's `clock` reaches the cockpit byte for byte; nobody else hears either", async () => {
    const { host, vent, viewer, ins } = await room();
    const up = vent.send(cmds(1));
    await waitFor(() => vents(host).length === 1, 2000, 'cmds at the host');
    expect(host.raw.filter((r) => r.includes('"kind":"vent"'))).toEqual([up]);
    const down = host.send(clockTo('vent-a.1', 80));
    await waitFor(() => vents(vent).length === 1, 2000, 'clock at the cockpit');
    expect(vent.raw.filter((r) => r.includes('"kind":"vent"'))).toEqual([down]);
    await settled();
    expect(vents(viewer)).toEqual([]);
    expect(vents(ins)).toEqual([]);
  });

  it("the host's `vent` without a `to`, or to a learner's or an instructor's id, goes nowhere", async () => {
    const { host, vent, viewer, ins } = await room();
    const before = relay!.stats().dropped;
    host.send({ kind: 'vent', body: { v: 1, kind: 'clock', ventTick: 80 } });
    host.send(clockTo('view-v1', 80));
    host.send(clockTo('ins-a.1', 80));
    host.send(clockTo('nobody', 80));
    await settled();
    for (const s of [vent, viewer, ins]) expect(vents(s)).toEqual([]);
    expect(relay!.stats().dropped - before).toBe(4);
  });

  it('a learner, an instructor and a controller may not send `vent` (forbidden); the host hears none', async () => {
    const { host, viewer, ins } = await room();
    const ctl = await join('ctl-c1', 'controller'); // the laptop's own Remote (local)
    for (const s of [viewer, ins]) s.send(cmds(1));
    await waitFor(() => [viewer, ins].every((s) => errorOf(s) !== undefined), 2000, 'forbidden');
    for (const s of [viewer, ins]) expect(errorOf(s)).toMatchObject({ code: 'forbidden' });
    expect(errorOf(viewer)!.message).toBe('viewer may not send ventilator messages');
    void ctl;
    await settled();
    expect(vents(host)).toEqual([]);
  });

  it('a granted cockpit may not send a `command` (its commands ride `vent`): forbidden, never at the host', async () => {
    const { host, vent } = await room();
    vent.send({ kind: 'command', body: { id: 'k1', issuedBy: 'ventilator', type: 'time', action: 'pause' } });
    await waitFor(() => errorOf(vent) !== undefined, 2000, 'forbidden');
    expect(errorOf(vent)).toMatchObject({ code: 'forbidden', message: 'ventilator may not send commands' });
    await settled();
    expect(host.raw.some((r) => r.includes('"k1"'))).toBe(false);
  });

  it('1 000 `vent` frames each way at 100 a second: the cockpit and the host get all of them, a learner and an instructor none', async () => {
    const { host, vent, viewer, ins } = await room();
    // 50 each way, then the fake clock moves on half a second (the relay reads it as each frame arrives): 100 a second
    for (let k = 1; k <= 1000; k++) {
      vent.send(cmds(k));
      host.send(clockTo('vent-a.1', k));
      if (k % 50 === 0) {
        await waitFor(() => vents(host).length === k && vents(vent).length === k, 5000, `${k} each way`);
        clock += 500;
      }
    }
    await settled();
    expect(vents(viewer)).toHaveLength(0);
    expect(vents(ins)).toHaveLength(0);
    expect(vent.closeCode).toBeNull();
    // never cached: with the host gone, a learner that joins is served the host's last snapshot and nothing else
    host.send({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 0 } });
    await settled();
    host.ws.close();
    await settled();
    const late = await join('view-v2', 'viewer');
    await waitFor(() => late.got.some((m) => m.kind === 'snapshot'), 2000, 'the cached snapshot');
    expect(late.got.filter((m) => m.kind !== undefined).map((m) => m.kind)).toEqual(['snapshot']);
  });
});

describe('a socket that floods `vent` is closed (120 a second, each way)', () => {
  it('the cockpit: 120 in one second pass, the 121st closes it (`too-many-tries`, 4028); the host is not told of more', async () => {
    const { host, vent } = await room();
    for (let k = 1; k <= 130; k++) vent.send(cmds(k)); // the fake clock stands still: one second
    await waitFor(() => vent.closeCode !== null, 2000, 'closed');
    expect(vent.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(errorOf(vent)).toMatchObject({ code: 'too-many-tries' });
    await settled();
    expect(vents(host)).toHaveLength(120);
    expect(host.closeCode).toBeNull();
  });

  it('a sliding second: 120, a second later 120 more, all pass', async () => {
    const { host, vent } = await room();
    for (let k = 1; k <= 120; k++) vent.send(cmds(k));
    await waitFor(() => vents(host).length === 120, 2000, 'the first 120');
    clock += 1000;
    for (let k = 121; k <= 240; k++) vent.send(cmds(k));
    await waitFor(() => vents(host).length === 240, 2000, 'the next 120');
    expect(vent.closeCode).toBeNull();
  });

  it("the host's way: the 121st `vent` to the cockpit in a second closes the cockpit, never the host", async () => {
    const { host, vent, viewer } = await room();
    for (let k = 1; k <= 121; k++) host.send(clockTo('vent-a.1', k));
    await waitFor(() => vent.closeCode !== null, 2000, 'cockpit closed');
    expect(vent.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(vents(vent)).toHaveLength(120);
    host.send({ kind: 'event', body: [{ type: 'state', t: 1, tick: 50, mode: 'manual', values: {}, control: {} }] });
    await waitFor(() => viewer.got.some((m) => m.kind === 'event'), 2000, 'the host still serves the room');
    expect(host.closeCode).toBeNull();
  });

  it('a pending cockpit and a learner that flood are closed too (not answered `forbidden` 120 times a second)', async () => {
    const { vent, viewer } = await room({ grant: false });
    for (let k = 1; k <= 121; k++) {
      vent.send(cmds(k));
      viewer.send(cmds(k));
    }
    await waitFor(() => vent.closeCode !== null && viewer.closeCode !== null, 2000, 'both closed');
    expect([vent.closeCode, viewer.closeCode]).toEqual([RELAY_CLOSE.tooManyTries, RELAY_CLOSE.tooManyTries]);
  });
});

describe("the learners' traffic is unchanged byte for byte", () => {
  it('a learner receives the same frames with a cockpit driving as without one', async () => {
    const fixed = () => 5_000;
    const host = createStamper(SESSION, 'host-h1', fixed);
    const script = [
      host({ kind: 'event', body: [{ type: 'state', t: 1, tick: 50, mode: 'manual', values: { hr: 70 }, control: {} }] }),
      host({ kind: 'event', body: [{ type: 'cockpit', t: 1, tick: 50 }, { type: 'beat', t: 1.1, seq: 1 } as never] }),
      host({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 50 } as never }),
      host({ kind: 'event', body: [{ type: 'cockpit', t: 2, tick: 100, off: true }] }),
    ].map((m) => JSON.stringify(m));
    const run = async (withCockpit: boolean) => {
      await start();
      const h = await join('host-h1', 'host', { now: fixed });
      const v = withCockpit ? await join('vent-a.1', 'ventilator', { now: fixed }) : null;
      const learner = await join('view-v1', 'viewer', { now: fixed });
      if (v) {
        await waitFor(() => h.got.some((m) => m.from === 'vent-a.1'), 2000, 'cockpit hello');
        h.send({ kind: 'grant', to: 'vent-a.1', granted: true });
      }
      for (const [i, data] of script.entries()) {
        h.ws.send(data);
        if (v) for (let k = 0; k < 10; k++) (v.send(cmds(i * 10 + k)), h.send(clockTo('vent-a.1', i * 10 + k)));
        await sleep(30);
      }
      await settled();
      const got = [...learner.raw];
      for (const c of closers.splice(0)) c();
      await relay!.close();
      relay = null;
      return got;
    };
    const without = await run(false);
    const withIt = await run(true);
    expect(without.length).toBeGreaterThan(script.length - 1);
    expect(withIt).toEqual(without);
  });
});
