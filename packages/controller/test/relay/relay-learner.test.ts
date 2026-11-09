// Plan learner-action-remote.md L3 (§4 D2, D7, D9; LQ1 ruled 9 November): the classroom relay admits a `learner` socket (the
// learner action remote) from another device with the LEARNER PIN, in a learner's place (counted under maxPeersPerRoom),
// PENDING until the host's `grant` and under the same per-address wrong-PIN limits as an instructor; pending, its every
// command is `forbidden`; granted, exactly LEARNER_COMMANDS reach the host and any other shape is `forbidden`; more than 6
// commands a second close it. It receives what a viewer receives, granted or not, plus the host's `prep` events that name
// it. The host is a raw socket with hand-made frames (the host's own PIN check and its re-check are L4). Every relay here
// runs on a fake clock (`now`).
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, type Role } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'RMT234'; // a valid code: no I, L, O, 0, 1
const LEARNER_PIN = '582913';
const INSTRUCTOR_PIN = '4729';
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
const learnerHello = (device = 'remote0001') => ({ show: 'learner', device, pin: LEARNER_PIN });
const errors = (s: Sock) => s.got.filter((f) => f.relay === 'error') as Array<{ code: string; message: string }>;
const commandsAt = (host: Sock) => host.got.filter((m) => m.kind === 'command');
const settled = () => sleep(150);
const command = (id: string, body: Record<string, unknown>) => ({ kind: 'command', body: { id, issuedBy: 'learner', ...body } });
const stage = (id: string, prep: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  command(id, { type: 'prep', action: 'stage', prep: { id: 'p0000001', components: [{ productId: 'propofol1pct20ml', amount: 20, unit: 'mL' }], ...prep }, ...extra });
const deliver = (id: string, extra: Record<string, unknown> = {}) => command(id, { type: 'prep', action: 'deliver', prepId: 'p0000001', volumeMl: 5, route: 'iv', ...extra });
const grant = (host: Sock, to: string, granted = true, reason?: string) => host.send({ kind: 'grant', to, granted, ...(reason ? { reason } : {}) });

/** §4 D2's shapes, each one command (`id` = its name). */
const SHAPES: Array<[string, Record<string, unknown>]> = [
  ['stage', stage('stage', { diluent: { id: 'sodiumChloride09', volumeMl: 30 }, container: 'syringe50ml' })],
  ['discard', command('discard', { type: 'prep', action: 'discard', prepId: 'p0000002' })],
  ['deliver', deliver('deliver')],
  ['tray', deliver('tray', { volumeMl: 'all', overS: 30, stageGroup: 'g1', batch: { id: 'g1', n: 2 } })],
  ['infuse', command('infuse', { type: 'prep', action: 'infuse', prepId: 'p0000001', rateMlH: 12 })],
  ['infusion', command('infusion', { type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 0 })],
  ['abg', command('abg', { type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } })],
];

/** The laptop's host, a learner's phone and the learner remote, both from another device; `granted`: the host grants it. */
async function room(granted = true, ro: RelayOptions = {}) {
  await start(ro);
  const host = await join('host-h1', 'host');
  const viewer = await join('view-v1', 'viewer', { show: 'learner', device: 'phone0001' });
  const learner = await join('lrn-l1', 'learner', learnerHello());
  await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'lrn-l1'), 2000, 'learner hello at the host');
  if (granted) {
    grant(host, 'lrn-l1');
    await waitFor(() => learner.got.some((m) => m.kind === 'grant'), 2000, 'the grant at the learner');
  }
  return { host, viewer, learner };
}

describe('a `learner` socket joins with the learner PIN', () => {
  it("from another device under remoteRoles 'viewer'; its hello (with the PIN) reaches the host; the host's devices list it pending", async () => {
    const { host, learner, viewer } = await room(false);
    expect(learner.closeCode).toBeNull();
    expect(host.got.find((m) => m.kind === 'hello' && m.from === 'lrn-l1')).toMatchObject({ role: 'learner', show: 'learner', device: 'remote0001', pin: LEARNER_PIN });
    expect(viewer.raw.some((r) => r.includes('lrn-l1') || r.includes(LEARNER_PIN))).toBe(false);
    const table = host.got.filter((f) => f.relay === 'peers').at(-1)!.devices as Array<Record<string, unknown>>;
    expect(table.find((d) => d.id === 'lrn-l1')).toMatchObject({ role: 'learner', granted: false, show: 'learner', device: 'remote0001' });
  });

  it('a learner hello without a PIN is refused: dropped, never at the host, no place in the room', async () => {
    await start();
    const host = await join('host-h1', 'host');
    const s = await sock('lrn-l1');
    s.send({ kind: 'hello', role: 'learner', show: 'learner', device: 'remote0001' });
    await settled();
    expect(s.got.some((f) => f.relay === 'peers')).toBe(false);
    expect(host.got.some((m) => m.from === 'lrn-l1')).toBe(false);
    expect(relay!.room(SESSION)).toMatchObject({ peers: 0 });
    s.send(stage('s1')); // still not a peer: its first frame must be a hello
    await waitFor(() => s.closeCode !== null, 2000, 'closed');
    expect(s.closeCode).toBe(RELAY_CLOSE.badHello);
  });

  it('it is counted with the learners under maxPeersPerRoom, and never takes an instructor place', async () => {
    await start({ maxPeersPerRoom: 1 });
    const host = await join('host-h1', 'host');
    const viewer = await join('view-v1', 'viewer');
    const learner = await join('lrn-l1', 'learner', learnerHello());
    expect(viewer.closeCode).toBeNull();
    expect(learner.closeCode).toBe(RELAY_CLOSE.full);
    expect(errors(learner)[0]).toMatchObject({ code: 'full' });
    const ins = await join('ins-i1', 'instructor', { pin: INSTRUCTOR_PIN }); // a full room of learners keeps the instructor's place
    expect(ins.closeCode).toBeNull();
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-i1'), 2000, 'instructor hello at the host');
  });

  it("it counts among the peers that follow: its own peers frame and the host's say 2, no instructor", async () => {
    const { learner, host } = await room(false);
    expect(learner.raw.filter((r) => r.startsWith('{"relay":"peers"'))).toEqual(['{"relay":"peers","hostOnline":true,"peers":2}']);
    expect(host.got.filter((f) => f.relay === 'peers').at(-1)).toMatchObject({ peers: 2, instructors: 0 });
  });
});

describe('pending until the host grants it', () => {
  it('a pending learner cannot command: every command, its own shapes included, is `forbidden` and never reaches the host', async () => {
    const { host, learner } = await room(false);
    for (const [what, m] of SHAPES) {
      clock += 1000;
      const before = errors(learner).length;
      learner.send(m);
      await waitFor(() => errors(learner).length === before + 1, 2000, `refused while pending: ${what}`);
      expect(errors(learner).at(-1), what).toEqual({ relay: 'error', code: 'forbidden', message: 'the learner remote is not signed in' });
    }
    await settled();
    expect(commandsAt(host)).toEqual([]);
    expect(learner.closeCode).toBeNull();
  });

  it("after the host's grant, every shape of §4 D2 reaches the host byte for byte; the acks route back to the learner only", async () => {
    const { host, learner, viewer } = await room();
    const up: string[] = [];
    for (const [what, m] of SHAPES) {
      clock += 1000; // one a second: the rate limit is not what this test is about
      up.push(learner.send(m));
      await waitFor(() => commandsAt(host).length === up.length, 2000, `at the host: ${what}`);
    }
    expect(host.raw.filter((r) => r.includes('"kind":"command"'))).toEqual(up);
    host.send({ kind: 'ack', commandId: 'stage', accepted: true, tick: 60 });
    host.send({ kind: 'ack', commandId: 'deliver', accepted: false, tick: 61, reason: 'not ready yet (0:20)' });
    await waitFor(() => learner.got.filter((m) => m.kind === 'ack').length === 2, 2000, 'both acks at the learner');
    await settled();
    expect(viewer.got.some((m) => m.kind === 'ack')).toBe(false);
    expect(errors(learner)).toEqual([]);
  });

  it("a host's grant false to a pending learner is a wrong PIN: `denied`, closed 4013", async () => {
    const { host, learner } = await room(false);
    grant(host, 'lrn-l1', false, "the instructor's computer refused the learner PIN");
    await waitFor(() => learner.closeCode !== null, 2000, 'closed');
    expect(learner.closeCode).toBe(RELAY_CLOSE.denied);
    expect(errors(learner).at(-1)).toMatchObject({ code: 'denied', message: "the instructor's computer refused the learner PIN" });
  });
});

describe('of what a granted learner sends, only §4 D2 reaches the host', () => {
  // The plan's list (L3, Tests first), plus forged values a device might try (the host recomputes them all, D3)
  const REFUSED: Array<[string, Record<string, unknown>]> = [
    ['applyEvent drug (raw)', command('r1', { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' } })],
    ['applyEvent drug with a forged by', command('r2', { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' }, by: 'phone0001' })],
    ['applyEvent infusion (raw)', command('r3', { type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 10, unit: 'mL/h' } })],
    ['applyEvent defib charge', command('r4', { type: 'applyEvent', event: { kind: 'defib', action: 'charge' } })],
    ['time pause', command('r5', { type: 'time', action: 'pause' })],
    ['scenario goto', command('r6', { type: 'scenario', action: 'goto', target: 's2' })],
    ['setRhythm', command('r7', { type: 'setRhythm', rhythm: 'vf' })],
    ['device', command('r8', { type: 'device', action: { device: 'alarm', action: 'ack' } })],
    ['note', command('r9', { type: 'note', kind: 'note', text: 'gave it' })],
    ['pin', command('r10', { type: 'pin', variable: 'hr', value: 30 })],
    ['prep deliver with atTick', deliver('r11', { atTick: 5000 })],
    ['prep stage with a concentration field', stage('r12', {}, { concentration: { amount: 10, unit: 'mg', perMl: 1 } })],
    ['prep stage with a concentration inside', stage('r13', { concentration: 10 })],
    ['prep stage with a finding', stage('r14', { findings: [] })],
    ['prep deliver with a forged by', deliver('r15', { by: 'phone0001' })],
    ['infusion set with a concentration', command('r16', { type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 4, concentration: { amount: 4, unit: 'mg', perMl: 50 } })],
    ['applyEvent lab with a turnaroundS', command('r17', { type: 'applyEvent', event: { kind: 'lab', panel: 'abg', turnaroundS: 30 } })],
    ['scenario bookmark', command('r18', { type: 'scenario', action: 'bookmark', target: 'm', kind: 'good' })],
    ['setTarget', command('r19', { type: 'setTarget', variable: 'hr', value: 80 })],
    ['time jump', command('r20', { type: 'time', action: 'jump', value: 60 })],
  ];
  it('every other shape, and any extra field on these, is answered `forbidden` and never reaches the host; the socket stays open', async () => {
    const { host, learner } = await room();
    for (const [what, m] of REFUSED) {
      clock += 1000; // one a second: the rate limit is not what refuses them
      const before = errors(learner).length;
      learner.send(m);
      await waitFor(() => errors(learner).length === before + 1, 2000, `refused: ${what}`);
      expect(errors(learner).at(-1), what).toMatchObject({ code: 'forbidden' });
    }
    await settled();
    expect(commandsAt(host)).toEqual([]);
    expect(learner.closeCode).toBeNull();
    clock += 1000;
    learner.send(stage('ok')); // still its own shapes
    await waitFor(() => commandsAt(host).length === 1, 2000, 'a prep stage after the refusals');
  });

  it('a `vent` message is forbidden and never reaches the host', async () => {
    const { host, learner } = await room();
    learner.send({ kind: 'vent', body: { v: 1, kind: 'clock', ventTick: 1 } });
    await waitFor(() => errors(learner).length === 1, 2000, 'forbidden');
    expect(errors(learner)[0]).toMatchObject({ code: 'forbidden', message: 'learner may not send ventilator messages' });
    await settled();
    expect(host.got.some((m) => m.kind === 'vent')).toBe(false);
  });

  it('a hello as another role on the same socket is forbidden and never reaches the host: with the instructor PIN it is still a learner', async () => {
    const { host, learner } = await room();
    const hellos = () => host.got.filter((m) => m.kind === 'hello' && m.from === 'lrn-l1').length;
    for (const [role, extra] of [['controller', {}], ['viewer', {}], ['host', {}], ['defib', {}], ['instructor', { pin: INSTRUCTOR_PIN }], ['ventilator', { pin: INSTRUCTOR_PIN }]] as const) {
      const before = errors(learner).length;
      learner.send({ kind: 'hello', role, ...extra });
      await waitFor(() => errors(learner).length === before + 1, 2000, `refused: a hello as ${role}`);
      expect(errors(learner).at(-1)).toMatchObject({ code: 'forbidden', message: 'this socket said hello as learner' });
    }
    await settled();
    expect(hellos()).toBe(1);
    clock += 1000;
    learner.send(command('t1', { type: 'time', action: 'pause' })); // an instructor's command: still forbidden
    await waitFor(() => errors(learner).length === 7, 2000, 'still forbidden');
    expect(commandsAt(host)).toEqual([]);
    learner.send({ kind: 'hello', role: 'learner', ...learnerHello() }); // its own role again: at the host
    await waitFor(() => hellos() === 2, 2000, 'its own re-hello at the host');
  });

  it("a viewer's and a defibrillator window's commands are unchanged: a learner's shape is `forbidden` from either", async () => {
    const { host, viewer } = await room();
    const defib = await join('defib-d1', 'defib', { show: 'defib', device: 'window0001' });
    viewer.send(stage('v1'));
    defib.send(stage('d1'));
    defib.send(command('d2', { type: 'applyEvent', event: { kind: 'defib', action: 'charge' } }));
    await waitFor(() => errors(viewer).length === 1 && errors(defib).length === 1, 2000, 'forbidden at both');
    expect(errors(viewer)[0]).toEqual({ relay: 'error', code: 'forbidden', message: 'viewer may not send commands' });
    expect(errors(defib)[0]).toEqual({ relay: 'error', code: 'forbidden', message: 'The defibrillator window sends Charge and Shock only.' });
    await waitFor(() => commandsAt(host).length === 1, 2000, "the window's charge");
    expect(commandsAt(host)[0]).toMatchObject({ from: 'defib-d1', body: { id: 'd2' } });
  });
});

describe('the PIN rules (§4 D9; the host checks the PIN itself, L4)', () => {
  it('a granted learner is not an instructor: it gets a viewer\'s frames, never the host\'s whole ones', async () => {
    const { host, learner, viewer } = await room();
    const ins = await join('ins-i1', 'instructor', { pin: INSTRUCTOR_PIN });
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-i1'), 2000, 'instructor hello');
    grant(host, 'ins-i1');
    await waitFor(() => ins.got.some((m) => m.kind === 'grant'), 2000, 'instructor granted');
    const ev = host.send({ kind: 'event', body: [
      { type: 'state', t: 1, tick: 50, mode: 'manual', values: {}, control: {} },
      { type: 'measurement', t: 1, values: { hr: { value: 70, flag: 'valid', at: 1 } } },
      { type: 'instructorView', t: 1, body: { rows: [] } },
      { type: 'commandApplied', commandId: 'n1', tick: 50, resolved: { command: { id: 'n1', issuedBy: 'remote', type: 'note', kind: 'note', text: 'late' } } },
    ] });
    const events = (s: Sock) => s.raw.filter((r) => r.includes('"kind":"event"'));
    await waitFor(() => events(learner).length === 1 && events(viewer).length === 1 && events(ins).length === 1, 2000, 'the event at all three');
    expect(events(ins)).toEqual([ev]);
    expect(events(learner)).toEqual(events(viewer));
    expect((learner.got.find((m) => m.kind === 'event')!.body as Array<{ type: string }>).map((e) => e.type)).toEqual(['state']);
    expect(host.got.filter((f) => f.relay === 'peers').at(-1)).toMatchObject({ instructors: 1, peers: 2 });
  });

  it('a grant false revokes: the host sends it to every granted learner (a new learner PIN) and each is closed `denied`; the rest stay', async () => {
    const { host, learner, viewer } = await room();
    const second = await join('lrn-l2', 'learner', learnerHello('remote0002'));
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'lrn-l2'), 2000, 'second learner hello');
    grant(host, 'lrn-l2');
    const ins = await join('ins-i1', 'instructor', { pin: INSTRUCTOR_PIN });
    await waitFor(() => second.got.some((m) => m.kind === 'grant') && host.got.some((m) => m.from === 'ins-i1'), 2000, 'second granted, instructor in');
    grant(host, 'ins-i1');
    for (const id of ['lrn-l1', 'lrn-l2']) grant(host, id, false, 'the learner PIN was changed');
    await waitFor(() => learner.closeCode !== null && second.closeCode !== null, 2000, 'both learners closed');
    expect([learner.closeCode, second.closeCode]).toEqual([RELAY_CLOSE.denied, RELAY_CLOSE.denied]);
    expect(errors(second).at(-1)).toMatchObject({ code: 'denied', message: 'the learner PIN was changed' });
    await settled();
    expect(viewer.closeCode).toBeNull();
    expect(ins.closeCode).toBeNull();
    clock += 1000;
    ins.send(command('i1', { type: 'time', action: 'pause' })); // the instructor's grant held
    await waitFor(() => commandsAt(host).some((m) => (m.body as { id: string }).id === 'i1'), 2000, "the instructor's command");
    // a revocation of a GRANTED learner is not a wrong PIN: the address may sign in again at once with the new PIN
    const again = await join('lrn-l3', 'learner', learnerHello());
    expect(again.closeCode).toBeNull();
  });

  it('5 wrong learner PINs from one address: neither a learner nor an instructor hello from it for 60 s; then both again', async () => {
    await start();
    const host = await join('host-h1', 'host');
    for (let k = 1; k <= 5; k++) {
      const s = await join(`lrn-w${k}`, 'learner', { pin: '000000' });
      await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === `lrn-w${k}`), 2000, `wrong PIN ${k} at the host`);
      grant(host, `lrn-w${k}`, false);
      await waitFor(() => s.closeCode !== null, 2000, `denied ${k}`);
    }
    const learner = await join('lrn-x', 'learner', learnerHello());
    const ins = await join('ins-x', 'instructor', { pin: INSTRUCTOR_PIN });
    expect([learner.closeCode, ins.closeCode]).toEqual([RELAY_CLOSE.tooManyTries, RELAY_CLOSE.tooManyTries]);
    expect(errors(learner)[0]).toMatchObject({ code: 'too-many-tries' });
    const viewer = await join('view-x', 'viewer'); // a learner's phone from the same address still follows
    expect(viewer.closeCode).toBeNull();
    clock += 60_000;
    const later = await join('lrn-y', 'learner', learnerHello());
    expect(later.closeCode).toBeNull();
  });

  it('5 wrong instructor PINs from one address block its learner hello too (one count per address)', async () => {
    await start();
    const host = await join('host-h1', 'host');
    for (let k = 1; k <= 5; k++) {
      const s = await join(`ins-w${k}`, 'instructor', { pin: '0000' });
      await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === `ins-w${k}`), 2000, `wrong PIN ${k}`);
      grant(host, `ins-w${k}`, false);
      await waitFor(() => s.closeCode !== null, 2000, `denied ${k}`);
    }
    const learner = await join('lrn-x', 'learner', learnerHello());
    expect(learner.closeCode).toBe(RELAY_CLOSE.tooManyTries);
  });

  it('more than 20 learner hellos from one address in a minute close the socket (`too-many-tries`), whatever the host answers', async () => {
    const { learner } = await room(false);
    for (let k = 0; k < 20; k++) learner.send({ kind: 'hello', role: 'learner', ...learnerHello() }); // the first was 1 of 20
    await waitFor(() => learner.closeCode !== null, 2000, 'closed');
    expect(learner.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(errors(learner).at(-1)).toMatchObject({ code: 'too-many-tries', message: 'too many learner remote sign-ins from this device: wait a minute' });
  });

  it("a learner's own grant naming itself grants nothing: only the host's grant counts", async () => {
    const { host, learner } = await room(false);
    learner.send({ kind: 'grant', to: 'lrn-l1', granted: true });
    clock += 1000;
    learner.send(stage('s1'));
    await waitFor(() => errors(learner).length === 1, 2000, 'forbidden');
    expect(errors(learner)[0]).toMatchObject({ code: 'forbidden', message: 'the learner remote is not signed in' });
    await settled();
    expect(host.got.some((m) => m.kind === 'grant' || m.kind === 'command')).toBe(false);
  });

  it('a new host socket: a granted learner is told grant false (not a denial: it stays open) and must be granted again', async () => {
    const { host, learner } = await room();
    host.ws.close();
    await waitFor(() => host.closeCode !== null, 2000, 'old host gone');
    const host2 = await join('host-h2', 'host');
    await waitFor(() => learner.got.some((m) => m.kind === 'grant' && m.granted === false), 2000, "the relay's grant false");
    expect(learner.got.find((m) => m.kind === 'grant' && m.granted === false)).toMatchObject({ from: 'pme-relay', to: 'lrn-l1' });
    expect(learner.closeCode).toBeNull();
    clock += 1000;
    learner.send(stage('s1'));
    await waitFor(() => errors(learner).length === 1, 2000, 'forbidden until granted again');
    expect(errors(learner)[0]).toMatchObject({ message: 'the learner remote is not signed in' });
    grant(host2, 'lrn-l1');
    await waitFor(() => learner.got.filter((m) => m.kind === 'grant' && m.granted === true).length === 2, 2000, 'granted again');
    clock += 1000;
    learner.send(stage('s2'));
    await waitFor(() => commandsAt(host2).length === 1, 2000, 'its prep at the new host');
  });
});

describe('at most 6 commands a second per `learner` socket', () => {
  it('6 in one second pass; the 7th closes the socket (`too-many-tries`, 4028) and never reaches the host', async () => {
    const { host, learner, viewer } = await room();
    for (let k = 1; k <= 7; k++) learner.send(deliver(`d${k}`)); // the fake clock stands still
    await waitFor(() => learner.closeCode !== null, 2000, 'closed');
    expect(learner.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(errors(learner).at(-1)).toMatchObject({ code: 'too-many-tries' });
    await settled();
    expect(commandsAt(host)).toHaveLength(6);
    expect(host.closeCode).toBeNull();
    expect(viewer.closeCode).toBeNull();
  });

  it('refused commands count too, and so do a pending learner\'s: 7 in a second close it', async () => {
    const { learner } = await room(false);
    for (let k = 1; k <= 7; k++) learner.send(stage(`s${k}`));
    await waitFor(() => learner.closeCode !== null, 2000, 'closed');
    expect(errors(learner).map((e) => e.code)).toEqual([...Array(6).fill('forbidden'), 'too-many-tries']);
  });

  it('a sliding second: 6, a second later 6 more, all pass', async () => {
    const { host, learner } = await room();
    for (let k = 1; k <= 6; k++) learner.send(deliver(`a${k}`));
    await waitFor(() => commandsAt(host).length === 6, 2000, 'the first 6');
    clock += 1000;
    for (let k = 1; k <= 6; k++) learner.send(deliver(`b${k}`));
    await waitFor(() => commandsAt(host).length === 12, 2000, 'the next 6');
    expect(learner.closeCode).toBeNull();
  });
});

describe("a preparation's news reaches its own learner only (§4 D7)", () => {
  it("the host's `prep` event naming a learner rides in that learner's copy; every other learner, viewer and window gets the viewer's", async () => {
    const { host, learner, viewer } = await room();
    const other = await join('lrn-l2', 'learner', learnerHello('remote0002'));
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'lrn-l2'), 2000, 'second learner hello');
    grant(host, 'lrn-l2');
    const pending = await join('lrn-l3', 'learner', learnerHello('remote0003'));
    const defib = await join('defib-d1', 'defib', { show: 'defib', device: 'window0001' });
    const ins = await join('ins-i1', 'instructor', { pin: INSTRUCTOR_PIN });
    await waitFor(() => other.got.some((m) => m.kind === 'grant') && host.got.some((m) => m.from === 'ins-i1'), 2000, 'all in');
    grant(host, 'ins-i1');
    await waitFor(() => ins.got.some((m) => m.kind === 'grant'), 2000, 'instructor granted');
    const prep = { type: 'prep', t: 2, to: 'lrn-l1', body: { id: 'p0000001', made: true, findings: [{ kind: 'wrongDiluent' }] } };
    const toPending = { type: 'prep', t: 2, to: 'lrn-l3', body: { id: 'p0000009' } };
    const state = { type: 'state', t: 2, tick: 100, mode: 'manual', values: {}, control: {} };
    const ev = host.send({ kind: 'event', body: [state, prep, toPending] });
    const events = (s: Sock) => s.raw.filter((r) => r.includes('"kind":"event"'));
    await waitFor(() => [learner, other, pending, viewer, defib, ins].every((s) => events(s).length === 1), 2000, 'the event at every socket');
    expect(learner.got.find((m) => m.kind === 'event')!.body).toEqual([state, prep]);
    expect(events(ins)).toEqual([ev]); // a granted instructor gets the host's frame whole (its phone shows the card, D7)
    for (const s of [other, pending, defib]) expect(events(s)).toEqual(events(viewer));
    expect(viewer.got.find((m) => m.kind === 'event')!.body).toEqual([state]);
    // a message with only a learner's prep: nothing at all for the rest
    host.send({ kind: 'event', body: [prep] });
    await waitFor(() => events(learner).length === 2, 2000, 'the prep alone at its learner');
    await settled();
    for (const s of [other, pending, viewer, defib]) expect(events(s)).toHaveLength(1);
  });
});

describe("the learners' traffic is unchanged byte for byte", () => {
  it('a viewer receives the same frames whether the learner remote is silent or stages, delivers, is refused and is granted', async () => {
    const fixed = () => 5_000;
    const hostStamp = createStamper(SESSION, 'host-h1', fixed);
    const script = [
      hostStamp({ kind: 'event', body: [{ type: 'state', t: 1, tick: 50, mode: 'manual', values: { hr: 70 }, control: {} }] }),
      hostStamp({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', tick: 50 } as never }),
      hostStamp({ kind: 'event', body: [{ type: 'beat', t: 1.1, seq: 1 } as never] }),
      hostStamp({ kind: 'event', body: [{ type: 'state', t: 2, tick: 100, mode: 'manual', values: { hr: 71 }, control: {} }] }),
    ].map((m) => JSON.stringify(m));
    const run = async (busy: boolean) => {
      await start();
      const h = await join('host-h1', 'host', {}, fixed);
      const phone = await join('view-v1', 'viewer', {}, fixed);
      const l = await join('lrn-l1', 'learner', learnerHello(), fixed);
      await waitFor(() => h.got.some((m) => m.from === 'lrn-l1'), 2000, 'learner hello');
      for (const [i, data] of script.entries()) {
        h.ws.send(data);
        if (busy) {
          clock += 1000;
          if (i === 1) h.ws.send(JSON.stringify(hostStamp({ kind: 'grant', to: 'lrn-l1', granted: true })));
          l.send(stage(`s${i}`));
          l.send(deliver(`d${i}`));
          l.send(command(`t${i}`, { type: 'time', action: 'pause' }));
          h.send({ kind: 'ack', commandId: `s${i}`, accepted: true, tick: 60 + i });
          h.ws.send(JSON.stringify(hostStamp({ kind: 'event', body: [{ type: 'prep', t: 1, to: 'lrn-l1', body: { id: 'p0000001' } } as never] })));
        }
        await sleep(30);
      }
      await settled();
      const got = [...phone.raw];
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
