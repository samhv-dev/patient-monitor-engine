// Plan pump-rack-tci.md C1 (§4 D1, D2, §7; the owner's rulings §11): the classroom relay admits a `pump` socket (the
// infusion-pump rack on a tablet) exactly as it admits the learner action remote (learner-action-remote.md L3): from another
// device with the LEARNER PIN, in a learner's place (counted under maxPeersPerRoom), PENDING until the host's `grant`, under
// the same per-address wrong-PIN limits; pending, its every command is `forbidden`; granted, exactly PUMP_COMMANDS (D2)
// reach the host and D2's complement is `forbidden`, shape by shape; more than 6 commands a second close it. It receives what
// a viewer receives, granted or not, plus the host's `prep` events that name it (§7: its preparation labels). The host is a
// raw socket with hand-made frames (the host's own PIN check, its re-check and the channel table are C2). Every relay here
// runs on a fake clock (`now`).
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, type Role } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'PMP234'; // a valid code: no I, L, O, 0, 1
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

const pumpHello = (device = 'tablet0001') => ({ device, pin: LEARNER_PIN });
const pump = (id: string, action: string, extra: Record<string, unknown> = {}) => command(id, { type: 'pump', action, ch: 1, ...extra });
const conc = { amount: 10, unit: 'mg', perMl: 1 };
const patient = { ageY: 45, weightKg: 70, heightCm: 170, sex: 'f' };

/** D2's shapes, each one command (`id` = its name). */
const SHAPES: Array<[string, Record<string, unknown>]> = [
  ['load', pump('load', 'load', { syringe: { prep: { device: 'remote0001', id: 'p0000001' } } })],
  ['bag', pump('bag', 'load', { ch: 2, bag: { stock: 'sodiumChloride09bag500' } })],
  ['program', pump('program', 'program', { drugId: 'propofol', concentration: conc })],
  ['rate', pump('rate', 'rate', { ch: 2, rate: 40, unit: 'drops/min', limitMl: 500 })],
  ['tci', pump('tci', 'tci', { setId: 'eleveld', mode: 'effect', target: 3, patient })],
  ['bolus', pump('bolus', 'bolus', { volumeMl: 2 })],
  ['start', pump('start', 'start')],
  ['stop', pump('stop', 'stop')],
  ['purge', pump('purge', 'purge', { volumeMl: 1 })],
  ['unload', pump('unload', 'unload')],
];

/** The laptop's host, a learner's phone and the pump tablet, both from another device; `granted`: the host grants it. */
async function room(granted = true, ro: RelayOptions = {}) {
  await start(ro);
  const host = await join('host-h1', 'host');
  const viewer = await join('view-v1', 'viewer', { show: 'learner', device: 'phone0001' });
  const tablet = await join('pmp-p1', 'pump', pumpHello());
  await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'pmp-p1'), 2000, 'pump hello at the host');
  if (granted) {
    grant(host, 'pmp-p1');
    await waitFor(() => tablet.got.some((m) => m.kind === 'grant'), 2000, 'the grant at the pump');
  }
  return { host, viewer, tablet };
}

describe('a `pump` socket joins with the learner PIN', () => {
  it("from another device under remoteRoles 'viewer'; its hello (with the PIN) reaches the host; the host's devices list it pending", async () => {
    const { host, tablet, viewer } = await room(false);
    expect(tablet.closeCode).toBeNull();
    expect(host.got.find((m) => m.kind === 'hello' && m.from === 'pmp-p1')).toMatchObject({ role: 'pump', device: 'tablet0001', pin: LEARNER_PIN });
    expect(viewer.raw.some((r) => r.includes('pmp-p1') || r.includes(LEARNER_PIN))).toBe(false);
    const table = host.got.filter((f) => f.relay === 'peers').at(-1)!.devices as Array<Record<string, unknown>>;
    expect(table.find((d) => d.id === 'pmp-p1')).toMatchObject({ role: 'pump', granted: false, show: null, device: 'tablet0001' });
  });

  it('a pump hello without a PIN is refused: dropped, never at the host, no place in the room', async () => {
    await start();
    const host = await join('host-h1', 'host');
    const s = await sock('pmp-p1');
    s.send({ kind: 'hello', role: 'pump', device: 'tablet0001' });
    await settled();
    expect(s.got.some((f) => f.relay === 'peers')).toBe(false);
    expect(host.got.some((m) => m.from === 'pmp-p1')).toBe(false);
    expect(relay!.room(SESSION)).toMatchObject({ peers: 0 });
    s.send(pump('s1', 'start')); // still not a peer: its first frame must be a hello
    await waitFor(() => s.closeCode !== null, 2000, 'closed');
    expect(s.closeCode).toBe(RELAY_CLOSE.badHello);
  });

  it('it is counted with the learners under maxPeersPerRoom, and never takes an instructor place', async () => {
    await start({ maxPeersPerRoom: 1 });
    const host = await join('host-h1', 'host');
    const viewer = await join('view-v1', 'viewer');
    const tablet = await join('pmp-p1', 'pump', pumpHello());
    expect(viewer.closeCode).toBeNull();
    expect(tablet.closeCode).toBe(RELAY_CLOSE.full);
    expect(errors(tablet)[0]).toMatchObject({ code: 'full' });
    const ins = await join('ins-i1', 'instructor', { pin: INSTRUCTOR_PIN }); // a full room of learners keeps the instructor's place
    expect(ins.closeCode).toBeNull();
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'ins-i1'), 2000, 'instructor hello at the host');
  });

  it("it counts among the peers that follow: its own peers frame and the host's say 2, no instructor", async () => {
    const { tablet, host } = await room(false);
    expect(tablet.raw.filter((r) => r.startsWith('{"relay":"peers"'))).toEqual(['{"relay":"peers","hostOnline":true,"peers":2}']);
    expect(host.got.filter((f) => f.relay === 'peers').at(-1)).toMatchObject({ peers: 2, instructors: 0 });
  });
});

describe('pending until the host grants it', () => {
  it('a pending pump cannot command: every command, its own shapes included, is `forbidden` and never reaches the host', async () => {
    const { host, tablet } = await room(false);
    for (const [what, m] of SHAPES) {
      clock += 1000;
      const before = errors(tablet).length;
      tablet.send(m);
      await waitFor(() => errors(tablet).length === before + 1, 2000, `refused while pending: ${what}`);
      expect(errors(tablet).at(-1), what).toEqual({ relay: 'error', code: 'forbidden', message: 'the pump is not signed in' });
    }
    await settled();
    expect(commandsAt(host)).toEqual([]);
    expect(tablet.closeCode).toBeNull();
  });

  it("after the host's grant, every shape of D2 reaches the host byte for byte; the acks route back to the pump only", async () => {
    const { host, tablet, viewer } = await room();
    const up: string[] = [];
    for (const [what, m] of SHAPES) {
      clock += 1000; // one a second: the rate limit is not what this test is about
      up.push(tablet.send(m));
      await waitFor(() => commandsAt(host).length === up.length, 2000, `at the host: ${what}`);
    }
    expect(host.raw.filter((r) => r.includes('"kind":"command"'))).toEqual(up);
    host.send({ kind: 'ack', commandId: 'load', accepted: true, tick: 60 });
    host.send({ kind: 'ack', commandId: 'bolus', accepted: false, tick: 61, reason: 'channel 1: load a syringe or a bag first' });
    await waitFor(() => tablet.got.filter((m) => m.kind === 'ack').length === 2, 2000, 'both acks at the pump');
    await settled();
    expect(viewer.got.some((m) => m.kind === 'ack')).toBe(false);
    expect(errors(tablet)).toEqual([]);
  });

  it("a host's grant false to a pending pump is a wrong PIN: `denied`, closed 4013", async () => {
    const { host, tablet } = await room(false);
    grant(host, 'pmp-p1', false, "the instructor's computer refused the learner PIN");
    await waitFor(() => tablet.closeCode !== null, 2000, 'closed');
    expect(tablet.closeCode).toBe(RELAY_CLOSE.denied);
    expect(errors(tablet).at(-1)).toMatchObject({ code: 'denied', message: "the instructor's computer refused the learner PIN" });
  });
});

describe("of what a granted pump sends, only D2 reaches the host: D2's complement is refused shape by shape", () => {
  // The plan's C1 list, one test each: the socket stays open, the host never sees it, and the pump's own shapes still pass
  const COMPLEMENT: Array<[string, Record<string, unknown>]> = [
    ['a raw applyEvent pump', command('c1', { type: 'applyEvent', event: { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', contents: { drugId: 'propofol', concentration: conc, volumeMl: 50 }, syringeMl: 50 } })],
    ['applyEvent drug', command('c2', { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' } })],
    ['prep stage', stage('c3')],
    ['time', command('c4', { type: 'time', action: 'pause' })],
    ['scenario', command('c5', { type: 'scenario', action: 'goto', target: 's2' })],
    ['atTick on a pump command', pump('c6', 'rate', { rate: 5, unit: 'mL/h', atTick: 5000 })],
    ['a pump load that carries a concentration field', pump('c7', 'load', { syringe: { stock: 'propofol1pct50ml' }, concentration: conc })],
  ];
  for (const [what, m] of COMPLEMENT)
    it(`${what}: \`forbidden\`, never at the host; the socket stays open`, async () => {
      const { host, tablet } = await room();
      tablet.send(m);
      await waitFor(() => errors(tablet).length === 1, 2000, `refused: ${what}`);
      expect(errors(tablet)[0]).toMatchObject({ code: 'forbidden' });
      await settled();
      expect(commandsAt(host)).toEqual([]);
      expect(tablet.closeCode).toBeNull();
      clock += 1000;
      tablet.send(pump('ok', 'start')); // still its own shapes
      await waitFor(() => commandsAt(host).length === 1, 2000, 'a pump start after the refusal');
    });

  const REFUSED: Array<[string, Record<string, unknown>]> = [
    ['applyEvent drug with a forged by', command('r1', { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' }, by: 'tablet0002' })],
    ['applyEvent tci (the instructor\'s)', command('r2', { type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'plasma', target: 3 } })],
    ['applyEvent infusion', command('r3', { type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 10, unit: 'mL/h' } })],
    ['infusion set (the learner remote\'s)', command('r4', { type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 4 })],
    ['prep deliver', deliver('r5')],
    ['a concentration inside the syringe', pump('r6', 'load', { syringe: { stock: 'propofol1pct50ml', concentration: conc } })],
    ['contents on the load', pump('r7', 'load', { syringe: { stock: 'propofol1pct50ml' }, contents: { drugId: 'propofol', concentration: conc, volumeMl: 50 } })],
    ['a bolus rate', pump('r8', 'bolus', { volumeMl: 2, rateMlH: 1200 })],
    ['a pump start with a forged by', pump('r9', 'start', { by: 'tablet0002' })],
    ['a TCI naming a model (the instructor\'s event)', pump('r10', 'tci', { setId: 'eleveld', mode: 'plasma', target: 3, patient, model: 'schnider' })],
    ['time jump', command('r11', { type: 'time', action: 'jump', value: 60 })],
    ['setRhythm', command('r12', { type: 'setRhythm', rhythm: 'vf' })],
    ['note', command('r13', { type: 'note', kind: 'note', text: 'set it' })],
  ];
  it('every other shape, and any extra field on these, is answered `forbidden` and never reaches the host; the socket stays open', async () => {
    const { host, tablet } = await room();
    for (const [what, m] of REFUSED) {
      clock += 1000; // one a second: the rate limit is not what refuses them
      const before = errors(tablet).length;
      tablet.send(m);
      await waitFor(() => errors(tablet).length === before + 1, 2000, `refused: ${what}`);
      expect(errors(tablet).at(-1), what).toMatchObject({ code: 'forbidden' });
    }
    await settled();
    expect(commandsAt(host)).toEqual([]);
    expect(tablet.closeCode).toBeNull();
  });

  it('a `vent` message is forbidden and never reaches the host', async () => {
    const { host, tablet } = await room();
    tablet.send({ kind: 'vent', body: { v: 1, kind: 'clock', ventTick: 1 } });
    await waitFor(() => errors(tablet).length === 1, 2000, 'forbidden');
    expect(errors(tablet)[0]).toMatchObject({ code: 'forbidden', message: 'pump may not send ventilator messages' });
    await settled();
    expect(host.got.some((m) => m.kind === 'vent')).toBe(false);
  });

  it('a hello as another role on the same socket is forbidden and never reaches the host: with the learner PIN it is still a pump', async () => {
    const { host, tablet } = await room();
    const hellos = () => host.got.filter((m) => m.kind === 'hello' && m.from === 'pmp-p1').length;
    for (const [role, extra] of [['learner', { pin: LEARNER_PIN }], ['controller', {}], ['viewer', {}], ['host', {}], ['defib', {}], ['instructor', { pin: INSTRUCTOR_PIN }], ['ventilator', { pin: INSTRUCTOR_PIN }]] as const) {
      const before = errors(tablet).length;
      tablet.send({ kind: 'hello', role, ...extra });
      await waitFor(() => errors(tablet).length === before + 1, 2000, `refused: a hello as ${role}`);
      expect(errors(tablet).at(-1)).toMatchObject({ code: 'forbidden', message: 'this socket said hello as pump' });
    }
    await settled();
    expect(hellos()).toBe(1);
    clock += 1000;
    tablet.send(stage('t1')); // the learner remote's command: still forbidden
    await waitFor(() => errors(tablet).length === 8, 2000, 'still forbidden');
    expect(commandsAt(host)).toEqual([]);
    tablet.send({ kind: 'hello', role: 'pump', ...pumpHello() }); // its own role again: at the host
    await waitFor(() => hellos() === 2, 2000, 'its own re-hello at the host');
  });

  it("a learner remote's, a viewer's and a defibrillator window's allow-lists are unchanged: a pump shape is `forbidden` from each", async () => {
    const { host, viewer } = await room();
    const remote = await join('lrn-l1', 'learner', learnerHello());
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'lrn-l1'), 2000, 'learner hello');
    grant(host, 'lrn-l1');
    await waitFor(() => remote.got.some((m) => m.kind === 'grant'), 2000, 'learner granted');
    const defib = await join('defib-d1', 'defib', { show: 'defib', device: 'window0001' });
    viewer.send(pump('v1', 'start'));
    defib.send(pump('d1', 'start'));
    remote.send(pump('l1', 'start'));
    await waitFor(() => [viewer, defib, remote].every((s) => errors(s).length === 1), 2000, 'forbidden at all three');
    expect(errors(viewer)[0]).toEqual({ relay: 'error', code: 'forbidden', message: 'viewer may not send commands' });
    expect(errors(defib)[0]).toEqual({ relay: 'error', code: 'forbidden', message: 'The defibrillator window sends Charge and Shock only.' });
    expect(errors(remote)[0]).toMatchObject({ code: 'forbidden' });
    await settled();
    expect(commandsAt(host)).toEqual([]);
  });
});

describe('the PIN rules: exactly the learner remote\'s (§7 Admission; the host checks the PIN itself, C2)', () => {
  it("a granted pump is not an instructor: it gets a viewer's frames, never the host's whole ones", async () => {
    const { host, tablet, viewer } = await room();
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
    await waitFor(() => events(tablet).length === 1 && events(viewer).length === 1 && events(ins).length === 1, 2000, 'the event at all three');
    expect(events(ins)).toEqual([ev]);
    expect(events(tablet)).toEqual(events(viewer));
    expect(host.got.filter((f) => f.relay === 'peers').at(-1)).toMatchObject({ instructors: 1, peers: 2 });
  });

  it('a grant false revokes (a new learner PIN): the granted pump and learner remote are closed `denied`; the rest stay', async () => {
    const { host, tablet, viewer } = await room();
    const remote = await join('lrn-l1', 'learner', learnerHello());
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'lrn-l1'), 2000, 'learner hello');
    grant(host, 'lrn-l1');
    await waitFor(() => remote.got.some((m) => m.kind === 'grant'), 2000, 'learner granted');
    for (const id of ['pmp-p1', 'lrn-l1']) grant(host, id, false, 'the learner PIN was changed');
    await waitFor(() => tablet.closeCode !== null && remote.closeCode !== null, 2000, 'both closed');
    expect([tablet.closeCode, remote.closeCode]).toEqual([RELAY_CLOSE.denied, RELAY_CLOSE.denied]);
    expect(errors(tablet).at(-1)).toMatchObject({ code: 'denied', message: 'the learner PIN was changed' });
    await settled();
    expect(viewer.closeCode).toBeNull();
    const again = await join('pmp-p2', 'pump', pumpHello()); // a revocation is not a wrong PIN
    expect(again.closeCode).toBeNull();
  });

  it('5 wrong PINs from one address, pump or learner remote: neither, nor an instructor, from it for 60 s; then again', async () => {
    await start();
    const host = await join('host-h1', 'host');
    for (let k = 1; k <= 5; k++) {
      const role = k % 2 ? 'pump' : 'learner';
      const s = await join(`w-${k}`, role, { pin: '000000' });
      await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === `w-${k}`), 2000, `wrong PIN ${k} at the host`);
      grant(host, `w-${k}`, false);
      await waitFor(() => s.closeCode !== null, 2000, `denied ${k}`);
    }
    const tablet = await join('pmp-x', 'pump', pumpHello());
    const remote = await join('lrn-x', 'learner', learnerHello());
    const ins = await join('ins-x', 'instructor', { pin: INSTRUCTOR_PIN });
    expect([tablet.closeCode, remote.closeCode, ins.closeCode]).toEqual([RELAY_CLOSE.tooManyTries, RELAY_CLOSE.tooManyTries, RELAY_CLOSE.tooManyTries]);
    expect(errors(tablet)[0]).toMatchObject({ code: 'too-many-tries' });
    const viewer = await join('view-x', 'viewer'); // a learner's phone from the same address still follows
    expect(viewer.closeCode).toBeNull();
    clock += 60_000;
    const later = await join('pmp-y', 'pump', pumpHello());
    expect(later.closeCode).toBeNull();
  });

  it('more than 20 pump hellos from one address in a minute close the socket (`too-many-tries`), whatever the host answers', async () => {
    const { tablet } = await room(false);
    for (let k = 0; k < 20; k++) tablet.send({ kind: 'hello', role: 'pump', ...pumpHello() }); // the first was 1 of 20
    await waitFor(() => tablet.closeCode !== null, 2000, 'closed');
    expect(tablet.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(errors(tablet).at(-1)).toMatchObject({ code: 'too-many-tries', message: 'too many pump sign-ins from this device: wait a minute' });
  });

  it("a pump's own grant naming itself grants nothing: only the host's grant counts", async () => {
    const { host, tablet } = await room(false);
    tablet.send({ kind: 'grant', to: 'pmp-p1', granted: true });
    clock += 1000;
    tablet.send(pump('s1', 'start'));
    await waitFor(() => errors(tablet).length === 1, 2000, 'forbidden');
    expect(errors(tablet)[0]).toMatchObject({ code: 'forbidden', message: 'the pump is not signed in' });
    await settled();
    expect(host.got.some((m) => m.kind === 'grant' || m.kind === 'command')).toBe(false);
  });

  it('a new host socket: a granted pump is told grant false (not a denial: it stays open) and must be granted again', async () => {
    const { host, tablet } = await room();
    host.ws.close();
    await waitFor(() => host.closeCode !== null, 2000, 'old host gone');
    const host2 = await join('host-h2', 'host');
    await waitFor(() => tablet.got.some((m) => m.kind === 'grant' && m.granted === false), 2000, "the relay's grant false");
    expect(tablet.got.find((m) => m.kind === 'grant' && m.granted === false)).toMatchObject({ from: 'pme-relay', to: 'pmp-p1' });
    expect(tablet.closeCode).toBeNull();
    clock += 1000;
    tablet.send(pump('s1', 'start'));
    await waitFor(() => errors(tablet).length === 1, 2000, 'forbidden until granted again');
    expect(errors(tablet)[0]).toMatchObject({ message: 'the pump is not signed in' });
    grant(host2, 'pmp-p1');
    await waitFor(() => tablet.got.filter((m) => m.kind === 'grant' && m.granted === true).length === 2, 2000, 'granted again');
    clock += 1000;
    tablet.send(pump('s2', 'start'));
    await waitFor(() => commandsAt(host2).length === 1, 2000, 'its start at the new host');
  });
});

describe('at most 6 commands a second per `pump` socket (D2)', () => {
  it('6 in one second pass; the 7th closes the socket (`too-many-tries`, 4028) and never reaches the host', async () => {
    const { host, tablet, viewer } = await room();
    for (let k = 1; k <= 7; k++) tablet.send(pump(`p${k}`, 'rate', { rate: k, unit: 'mL/h' })); // the fake clock stands still
    await waitFor(() => tablet.closeCode !== null, 2000, 'closed');
    expect(tablet.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    expect(errors(tablet).at(-1)).toMatchObject({ code: 'too-many-tries' });
    await settled();
    expect(commandsAt(host)).toHaveLength(6);
    expect(host.closeCode).toBeNull();
    expect(viewer.closeCode).toBeNull();
  });

  it("refused commands count too, and so do a pending pump's: 7 in a second close it", async () => {
    const { tablet } = await room(false);
    for (let k = 1; k <= 7; k++) tablet.send(pump(`s${k}`, 'start'));
    await waitFor(() => tablet.closeCode !== null, 2000, 'closed');
    expect(errors(tablet).map((e) => e.code)).toEqual([...Array(6).fill('forbidden'), 'too-many-tries']);
  });

  it('a sliding second: 6, a second later 6 more, all pass', async () => {
    const { host, tablet } = await room();
    for (let k = 1; k <= 6; k++) tablet.send(pump(`a${k}`, 'stop'));
    await waitFor(() => commandsAt(host).length === 6, 2000, 'the first 6');
    clock += 1000;
    for (let k = 1; k <= 6; k++) tablet.send(pump(`b${k}`, 'start'));
    await waitFor(() => commandsAt(host).length === 12, 2000, 'the next 6');
    expect(tablet.closeCode).toBeNull();
  });
});

describe("a preparation's label reaches the pump it names only (§7)", () => {
  it("the host's `prep` event naming a granted pump rides in that pump's copy; every other device gets the viewer's", async () => {
    const { host, tablet, viewer } = await room();
    const other = await join('pmp-p2', 'pump', pumpHello('tablet0002'));
    await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'pmp-p2'), 2000, 'second pump hello');
    grant(host, 'pmp-p2');
    const pending = await join('pmp-p3', 'pump', pumpHello('tablet0003'));
    await waitFor(() => other.got.some((m) => m.kind === 'grant') && host.got.some((m) => m.from === 'pmp-p3'), 2000, 'all in');
    const label = { type: 'prep', t: 2, to: 'pmp-p1', body: { id: 'p0000001', label: 'propofol 10 mg/mL 50 mL' } };
    const toPending = { type: 'prep', t: 2, to: 'pmp-p3', body: { id: 'p0000009' } };
    const state = { type: 'state', t: 2, tick: 100, mode: 'manual', values: {}, control: {} };
    host.send({ kind: 'event', body: [state, label, toPending] });
    const events = (s: Sock) => s.raw.filter((r) => r.includes('"kind":"event"'));
    await waitFor(() => [tablet, other, pending, viewer].every((s) => events(s).length === 1), 2000, 'the event at every socket');
    expect(tablet.got.find((m) => m.kind === 'event')!.body).toEqual([state, label]);
    for (const s of [other, pending]) expect(events(s)).toEqual(events(viewer));
    expect(viewer.got.find((m) => m.kind === 'event')!.body).toEqual([state]);
  });
});

describe("the learners' traffic is unchanged byte for byte", () => {
  it('a viewer receives the same frames whether the pump is silent or loads, runs, is refused and is granted', async () => {
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
      const p = await join('pmp-p1', 'pump', pumpHello(), fixed);
      await waitFor(() => h.got.some((m) => m.from === 'pmp-p1'), 2000, 'pump hello');
      for (const [i, data] of script.entries()) {
        h.ws.send(data);
        if (busy) {
          clock += 1000;
          if (i === 1) h.ws.send(JSON.stringify(hostStamp({ kind: 'grant', to: 'pmp-p1', granted: true })));
          p.send(pump(`l${i}`, 'load', { syringe: { stock: 'propofol1pct50ml' } }));
          p.send(pump(`r${i}`, 'rate', { rate: 5, unit: 'mL/h' }));
          p.send(command(`t${i}`, { type: 'time', action: 'pause' }));
          h.send({ kind: 'ack', commandId: `l${i}`, accepted: true, tick: 60 + i });
          h.ws.send(JSON.stringify(hostStamp({ kind: 'event', body: [{ type: 'prep', t: 1, to: 'pmp-p1', body: { id: 'p0000001' } } as never] })));
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
