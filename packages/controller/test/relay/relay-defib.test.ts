// Plan room-and-instruments.md R5c (Q5 ruled 5 November): the classroom relay admits a `defib` socket from another device
// like a learner (no PIN, counted under maxPeersPerRoom), routes it as a viewer for everything it receives (lean copies),
// forwards to the host only the two commands of LEARNER_DEFIB_COMMANDS (Charge and Shock, bare), answers `forbidden` to
// any other, closes a socket past 4 commands a second (`too-many-tries`), and routes the host's acks back to it. The host
// is a raw socket with hand-made frames (the host's re-check is R5d). Every relay here runs on a fake clock (`now`).
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, type Role } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'DFB234';
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
    port: 0, host: '127.0.0.1', heartbeatMs: 60_000, takenCheckMs: 300, remoteRoles: 'viewer',
    isLocal: (_a, req) => !req?.url?.includes('e2e-remote'),
    now: () => clock,
    ...o,
  }));

interface Sock {
  ws: WebSocket;
  raw: string[];
  got: Array<Record<string, unknown>>;
  closeCode: number | null;
  send: (body: Record<string, unknown>) => string;
}
async function sock(from: string, now?: () => number): Promise<Sock> {
  const ws = new WebSocket(`ws://127.0.0.1:${relay!.port}/${from.startsWith('host') ? '' : '?e2e-remote'}`);
  const stamp = createStamper(SESSION, from, now);
  const s: Sock = {
    ws, raw: [], got: [], closeCode: null,
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
async function join(from: string, role: Role, extra: Record<string, unknown> = {}, now?: () => number) {
  const s = await sock(from, now);
  s.send({ kind: 'hello', role, ...extra });
  await waitFor(() => s.got.some((f) => f.relay === 'peers') || s.closeCode !== null, 2000, `${from} admitted or closed`);
  return s;
}
const errors = (s: Sock) => s.got.filter((f) => f.relay === 'error') as Array<{ code: string; message: string }>;
const commandsAt = (host: Sock) => host.got.filter((m) => m.kind === 'command');
const settled = () => sleep(150);
const charge = (id: string, event: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  ({ kind: 'command', body: { id, issuedBy: 'defib', type: 'applyEvent', event: { kind: 'defib', action: 'charge', ...event }, ...extra } });
const shock = (id: string, event: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  ({ kind: 'command', body: { id, issuedBy: 'defib', type: 'applyEvent', event: { kind: 'defib', action: 'shock', ...event }, ...extra } });
const command = (id: string, body: Record<string, unknown>) => ({ kind: 'command', body: { id, issuedBy: 'defib', ...body } });

/** The laptop's host, a learner's phone and the defibrillator window, both from another device. */
async function room(ro: RelayOptions = {}) {
  await start(ro);
  const host = await join('host-h1', 'host');
  const viewer = await join('view-v1', 'viewer', { show: 'learner', device: 'phone0001' });
  const defib = await join('defib-d1', 'defib', { show: 'defib', device: 'window0001' });
  await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'defib-d1'), 2000, 'defib hello at the host');
  return { host, viewer, defib };
}

describe('a `defib` socket joins like a learner', () => {
  it("from another device under remoteRoles 'viewer', with no PIN; its hello reaches the host; the host's devices list it", async () => {
    const { host, defib, viewer } = await room();
    expect(defib.closeCode).toBeNull();
    expect(host.got.find((m) => m.kind === 'hello' && m.from === 'defib-d1')).toMatchObject({ role: 'defib', show: 'defib', device: 'window0001' });
    expect(viewer.raw.some((r) => r.includes('defib-d1'))).toBe(false);
    const table = host.got.filter((f) => f.relay === 'peers').at(-1)!.devices as Array<Record<string, unknown>>;
    expect(table.find((d) => d.id === 'defib-d1')).toMatchObject({ role: 'defib', granted: false, show: 'defib', device: 'window0001' });
  });

  it('it is counted with the learners under maxPeersPerRoom: one place taken by a learner leaves none for it', async () => {
    await start({ maxPeersPerRoom: 1 });
    await join('host-h1', 'host');
    const viewer = await join('view-v1', 'viewer');
    const defib = await join('defib-d1', 'defib');
    expect(viewer.closeCode).toBeNull();
    expect(defib.closeCode).toBe(RELAY_CLOSE.full);
    expect(errors(defib)[0]).toMatchObject({ code: 'full' });
  });

  it('it counts among the peers that follow (it follows the patient): its own peers frame and the host\'s say 2', async () => {
    const { defib, host } = await room();
    expect(defib.raw.filter((r) => r.startsWith('{"relay":"peers"'))).toEqual(['{"relay":"peers","hostOnline":true,"peers":2}']);
    expect(host.got.filter((f) => f.relay === 'peers').at(-1)).toMatchObject({ peers: 2, instructors: 0 });
  });

  it('it receives as a viewer does: the lean copy of events, the snapshot after its hello, never an instructor view', async () => {
    const { host, defib, viewer } = await room();
    host.send({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 0 } });
    await waitFor(() => defib.got.some((m) => m.kind === 'snapshot'), 2000, 'the snapshot at the defib');
    const ev = host.send({ kind: 'event', body: [
      { type: 'state', t: 1, tick: 50, mode: 'manual', values: {}, control: {} },
      { type: 'measurement', t: 1, values: { hr: { value: 70, flag: 'valid', at: 1 } } },
      { type: 'instructorView', t: 1, body: { rows: [] } },
    ] });
    await waitFor(() => defib.got.some((m) => m.kind === 'event') && viewer.got.some((m) => m.kind === 'event'), 2000, 'the event at both');
    const lean = (s: Sock) => s.raw.filter((r) => r.includes('"kind":"event"'));
    expect(lean(defib)).toEqual(lean(viewer));
    expect(lean(defib)[0]).not.toBe(ev);
    expect((defib.got.find((m) => m.kind === 'event')!.body as Array<{ type: string }>).map((e) => e.type)).toEqual(['state']);
  });
});

describe('of what a `defib` socket sends, only Charge and Shock reach the host', () => {
  it('a bare charge and a bare shock reach the host byte for byte; the host acks route back to the window only', async () => {
    const { host, defib, viewer } = await room();
    const up = [defib.send(charge('c1')), defib.send(shock('s1'))];
    await waitFor(() => commandsAt(host).length === 2, 2000, 'both at the host');
    expect(host.raw.filter((r) => r.includes('"kind":"command"'))).toEqual(up);
    host.send({ kind: 'ack', commandId: 'c1', accepted: true, tick: 60 });
    host.send({ kind: 'ack', commandId: 's1', accepted: false, tick: 61, reason: 'Not charged' });
    await waitFor(() => defib.got.filter((m) => m.kind === 'ack').length === 2, 2000, 'both acks at the window');
    expect(defib.got.filter((m) => m.kind === 'ack')).toMatchObject([{ commandId: 'c1', accepted: true }, { commandId: 's1', accepted: false, reason: 'Not charged' }]);
    await settled();
    expect(viewer.got.some((m) => m.kind === 'ack')).toBe(false);
    expect(errors(defib)).toEqual([]);
  });

  // The plan's list (R5c, Tests first), plus the rest of the defibrillator's actions and a stray field
  const REFUSED: Array<[string, Record<string, unknown>]> = [
    ['defib charge with energyJ 360', charge('r1', { energyJ: 360 })],
    ['defib shock with atTick', shock('r2', {}, { atTick: 5000 })],
    ['defib shock with an outcome', shock('r3', { outcome: 'sinus' })],
    ['defib charge with a stray field', charge('r4', { sync: true })],
    ['defib selectEnergy', command('r5', { type: 'applyEvent', event: { kind: 'defib', action: 'selectEnergy', energyJ: 360 } })],
    ['defib preselect', command('r6', { type: 'applyEvent', event: { kind: 'defib', action: 'preselect', outcome: 'sinus' } })],
    ['defib disarm', command('r7', { type: 'applyEvent', event: { kind: 'defib', action: 'disarm' } })],
    ['defib syncOn', command('r8', { type: 'applyEvent', event: { kind: 'defib', action: 'syncOn' } })],
    ['pacer', command('r9', { type: 'applyEvent', event: { kind: 'pacer', mode: 'fixed', ratePpm: 70, mA: 80 } })],
    ['drug', command('r10', { type: 'applyEvent', event: { kind: 'drug', drugId: 'adrenaline', dose: 1, unit: 'mg', route: 'iv' } })],
    ['cpr', command('r11', { type: 'applyEvent', event: { kind: 'cpr', active: true } })],
    ['time pause', command('r12', { type: 'time', action: 'pause' })],
    ['time resume', command('r13', { type: 'time', action: 'resume' })],
    ['time scale', command('r14', { type: 'time', action: 'scale', value: 8 })],
    ['time jump', command('r15', { type: 'time', action: 'jump', value: 60 })],
    ['scenario', command('r16', { type: 'scenario', action: 'trigger', target: 't1' })],
    ['device', command('r17', { type: 'device', action: { device: 'alarm', action: 'ack' } })],
    ['setTarget', command('r18', { type: 'setTarget', variable: 'hr', value: 80 })],
    ['pin', command('r19', { type: 'pin', variable: 'hr', value: 30 })],
    ['note', command('r20', { type: 'note', kind: 'note', text: 'shocked' })],
  ];
  it('every other command is answered `forbidden` and never reaches the host; the socket stays open and follows', async () => {
    const { host, defib } = await room();
    for (const [what, m] of REFUSED) {
      clock += 1000; // one a second: the rate limit is not what refuses them
      const before = errors(defib).length;
      defib.send(m);
      await waitFor(() => errors(defib).length === before + 1, 2000, `refused: ${what}`);
      expect(errors(defib).at(-1), what).toMatchObject({ code: 'forbidden' });
    }
    await settled();
    expect(commandsAt(host)).toEqual([]);
    expect(defib.closeCode).toBeNull();
    clock += 1000;
    defib.send(charge('ok')); // still the window's own two commands
    await waitFor(() => commandsAt(host).length === 1, 2000, 'a charge after the refusals');
  });

  it('a `vent` message is forbidden and never reaches the host', async () => {
    const { host, defib } = await room();
    defib.send({ kind: 'vent', body: { v: 1, kind: 'clock', ventTick: 1 } });
    await waitFor(() => errors(defib).length === 1, 2000, 'forbidden');
    expect(errors(defib)[0]).toMatchObject({ code: 'forbidden', message: 'defib may not send ventilator messages' });
    await settled();
    expect(host.got.some((m) => m.kind === 'vent')).toBe(false);
  });

  it('a hello as another role on the same socket is forbidden and never reaches the host; the socket stays a `defib`', async () => {
    const { host, defib } = await room();
    const hellos = () => host.got.filter((m) => m.kind === 'hello' && m.from === 'defib-d1').length;
    expect(hellos()).toBe(1);
    for (const role of ['controller', 'viewer', 'host']) {
      const before = errors(defib).length;
      defib.send({ kind: 'hello', role });
      await waitFor(() => errors(defib).length === before + 1, 2000, `refused: a hello as ${role}`);
      expect(errors(defib).at(-1)).toMatchObject({ code: 'forbidden' });
    }
    defib.send({ kind: 'hello', role: 'instructor', pin: '4729' });
    await waitFor(() => errors(defib).length === 4, 2000, 'refused: a hello as instructor');
    await settled();
    expect(hellos()).toBe(1);
    clock += 1000;
    defib.send(command('t1', { type: 'time', action: 'pause' }));
    await waitFor(() => errors(defib).length === 5, 2000, 'still forbidden');
    expect(commandsAt(host)).toEqual([]);
    defib.send({ kind: 'hello', role: 'defib', show: 'defib', device: 'window0001' }); // its own role again: as before
    await waitFor(() => hellos() === 2, 2000, 'its own re-hello at the host');
  });

  it("a viewer's command is still `forbidden` with today's words", async () => {
    const { host, viewer } = await room();
    viewer.send(charge('v1'));
    await waitFor(() => errors(viewer).length === 1, 2000, 'forbidden');
    expect(errors(viewer)[0]).toEqual({ relay: 'error', code: 'forbidden', message: 'viewer may not send commands' });
    await settled();
    expect(commandsAt(host)).toEqual([]);
  });
});

describe('at most 4 commands a second per `defib` socket', () => {
  it('4 in one second pass; the 5th closes the socket (`too-many-tries`, 4028) and never reaches the host', async () => {
    const { host, defib, viewer } = await room();
    for (let k = 1; k <= 5; k++) defib.send(k % 2 ? charge(`c${k}`) : shock(`s${k}`)); // the fake clock stands still
    await waitFor(() => defib.closeCode !== null, 2000, 'closed');
    expect(defib.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(errors(defib).at(-1)).toMatchObject({ code: 'too-many-tries' });
    await settled();
    expect(commandsAt(host)).toHaveLength(4);
    expect(host.closeCode).toBeNull();
    expect(viewer.closeCode).toBeNull();
  });

  it('refused commands count too: 5 forbidden ones in a second close it', async () => {
    const { defib } = await room();
    for (let k = 1; k <= 5; k++) defib.send(command(`t${k}`, { type: 'time', action: 'pause' }));
    await waitFor(() => defib.closeCode !== null, 2000, 'closed');
    expect(defib.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(errors(defib).map((e) => e.code)).toEqual(['forbidden', 'forbidden', 'forbidden', 'forbidden', 'too-many-tries']);
  });

  it('a sliding second: 4, a second later 4 more, all pass', async () => {
    const { host, defib } = await room();
    for (let k = 1; k <= 4; k++) defib.send(charge(`a${k}`));
    await waitFor(() => commandsAt(host).length === 4, 2000, 'the first 4');
    clock += 1000;
    for (let k = 1; k <= 4; k++) defib.send(shock(`b${k}`));
    await waitFor(() => commandsAt(host).length === 8, 2000, 'the next 4');
    expect(defib.closeCode).toBeNull();
  });
});

describe("the learners' traffic is unchanged byte for byte", () => {
  it('a learner receives the same frames whether the defibrillator window is silent or charges, shocks and is refused', async () => {
    const fixed = () => 5_000;
    const hostStamp = createStamper(SESSION, 'host-h1', fixed);
    const script = [
      hostStamp({ kind: 'event', body: [{ type: 'state', t: 1, tick: 50, mode: 'manual', values: { hr: 70 }, control: {} }] }),
      hostStamp({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 50 } as never }),
      hostStamp({ kind: 'event', body: [{ type: 'beat', t: 1.1, seq: 1 } as never] }),
    ].map((m) => JSON.stringify(m));
    const run = async (busy: boolean) => {
      await start();
      const h = await join('host-h1', 'host', {}, fixed);
      const learner = await join('view-v1', 'viewer', {}, fixed);
      const d = await join('defib-d1', 'defib', {}, fixed);
      await waitFor(() => h.got.some((m) => m.from === 'defib-d1'), 2000, 'defib hello');
      for (const [i, data] of script.entries()) {
        h.ws.send(data);
        if (busy) {
          clock += 1000;
          d.send(charge(`c${i}`));
          d.send(shock(`s${i}`));
          d.send(command(`t${i}`, { type: 'time', action: 'pause' }));
          d.send({ kind: 'vent', body: { v: 1, kind: 'clock', ventTick: i } });
          h.send({ kind: 'ack', commandId: `c${i}`, accepted: true, tick: 60 + i });
        }
        await sleep(30);
      }
      await settled();
      const got = [...learner.raw];
      for (const c of closers.splice(0)) c();
      await relay!.close();
      relay = null;
      return got;
    };
    const silent = await run(false);
    const busy = await run(true);
    expect(silent.length).toBeGreaterThan(script.length - 1);
    expect(busy).toEqual(silent);
  });
});
