// Plan room-and-instruments.md R8a: the `ventilator` role signs in with the PIN, and a `vent` message carries one of the
// ventilator link's messages and nothing else. Tests first, on the bodies a real cockpit and a real engine exchange
// (test/vent-capture.ts: the code vent-hamilton.html runs, on a fake wall clock).
import { beforeAll, describe, expect, it } from 'vitest';
import { createLocalPortPair, createVentDriver, PROFILES, type LinkMsg, type ProfileId } from '../../ventilator/src/index.ts';
import { findSampleLeak, parseWireMessage, VENT_LIMITS, WIRE_LIMITS } from '../src/guard.ts';
import { createStamper, type VentLinkBody, type WireMessage } from '../src/protocol.ts';
import { captureLink } from './vent-capture.ts';

const fromVent = createStamper('ABC234', 'vent-a.1');
const fromHost = createStamper('ABC234', 'host-1');
const vent = (body: unknown): WireMessage => fromVent({ kind: 'vent', body: body as VentLinkBody });
const toVent = (body: unknown): WireMessage => fromHost({ kind: 'vent', to: 'vent-a.1', body: body as VentLinkBody });
const bytes = (x: unknown) => Buffer.byteLength(JSON.stringify(x));

let normal: Awaited<ReturnType<typeof captureLink>>;
let shock: Awaited<ReturnType<typeof captureLink>>;
beforeAll(async () => {
  normal = await captureLink('normal');
  shock = await captureLink('anaphylaxis-bronchospasm', 1);
}, 60_000);
const kinds = (ms: LinkMsg[]) => [...new Set(ms.map((m) => m.kind))].sort();
const cmds = (ms: LinkMsg[]) => ms.filter((m): m is Extract<LinkMsg, { kind: 'cmds' }> => m.kind === 'cmds');
const types = (m: Extract<LinkMsg, { kind: 'cmds' }>) => m.cmds.map((c) => c.type).join(',');

describe('the captured link (what the guard is tested on)', () => {
  it('holds every kind both sides send: cmds from the cockpit; lungState, clock, run and time from the monitor', () => {
    expect(kinds(normal.fromVent)).toEqual(['cmds']);
    expect(kinds(normal.toVent)).toEqual(['clock', 'lungState', 'run', 'time']);
    expect(new Set(cmds(normal.fromVent).map(types))).toEqual(new Set(['externalDrive', 'applyEvent,externalDrive']));
    expect(types(cmds(shock.fromVent)[0]!)).toBe('setTarget,setTarget,setTarget,setTarget,externalDrive');
  });

  it(`VENT_LIMITS.cmds (${VENT_LIMITS.cmds}) is the most commands the link core builds on one tick, over every profile`, () => {
    let most = 0;
    for (const id of Object.keys(PROFILES) as ProfileId[]) {
      const [a, b] = createLocalPortPair();
      const got: LinkMsg[] = [];
      b.onMessage((m) => got.push(m));
      const d = createVentDriver(a, id);
      d.vs.circuit = 'disconnected'; // a circuit change on the first tick too: its airway command
      d.frame(0);
      d.frame(100);
      for (const m of cmds(got)) most = Math.max(most, m.cmds.length);
    }
    expect(most).toBe(VENT_LIMITS.cmds);
  });
});

describe('the guard passes every captured body inside a `vent`', () => {
  it("each of the cockpit's `cmds` (steady, the circuit's airway, the shock profile's 4 stand-ins) from the ventilator", () => {
    const all = [...cmds(normal.fromVent), ...cmds(shock.fromVent)];
    expect(all.length).toBeGreaterThan(150);
    for (const m of all) expect(parseWireMessage(JSON.stringify(vent(m))), types(m)).not.toBeNull();
    // the sample rule unchanged: a VentFrame carries one value per signal per tick, never a sample array
    for (const m of all) expect(findSampleLeak(vent(m))).toBeNull();
    const largest = Math.max(...all.map(bytes));
    expect(largest).toBeLessThan(VENT_LIMITS.bytes / 4); // measured: 0.8 KB, the shock profile's first tick
  });

  it("each of the monitor's lungState, clock, run and time, from the host `to` the ventilator", () => {
    for (const m of normal.toVent) expect(parseWireMessage(JSON.stringify(toVent(m))), m.kind).not.toBeNull();
    for (const m of normal.toVent) expect(findSampleLeak(toVent(m))).toBeNull();
  });

  it("the cockpit's settings (its real VentConfig) and a control patch", () => {
    const settings = { v: 1, kind: 'settings', cfg: normal.cfg };
    expect(parseWireMessage(JSON.stringify(vent(settings)))).toMatchObject({ kind: 'vent', body: { kind: 'settings' } });
    expect(bytes(settings)).toBeLessThan(VENT_LIMITS.bytes);
    expect(parseWireMessage(toVent({ v: 1, kind: 'control', patch: { peep: 8 }, circuit: 'disconnected', profile: 'ards-mild' }))).not.toBeNull();
  });
});

describe('the guard refuses', () => {
  const steady = () => structuredClone(cmds(normal.fromVent).at(-1)!);
  const withCmd = (c: Record<string, unknown>) => ({ ...steady(), cmds: [{ id: 'x1', issuedBy: 'ventilator', ...c }] });

  it('a `cmds` with any other command type, or a ventilator command in another shape', () => {
    for (const c of [
      { type: 'time', action: 'pause' },
      { type: 'scenario', action: 'goto', target: 'x' },
      { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' } },
      { type: 'applyEvent', event: { kind: 'ventilation', source: 'none' } },
      { type: 'externalDrive', source: 'bvm', frame: {} },
      { type: 'externalDrive', source: 'ventilator' },
      { type: 'setRhythm', rhythm: 'vf' },
      { type: 'pin', variable: 'hr', value: 30 },
      { type: 'note', kind: 'note', text: 'x' },
      { type: 'setTarget', variable: 'hr' },
    ])
      expect(parseWireMessage(vent(withCmd(c))), JSON.stringify(c)).toBeNull();
    const { id: _id, ...noId } = steady().cmds[0] as unknown as Record<string, unknown>;
    expect(parseWireMessage(vent({ ...steady(), cmds: [noId] }))).toBeNull();
  });

  it(`more than ${VENT_LIMITS.cmds} commands, a tick that is not an integer`, () => {
    const s = steady();
    const c = s.cmds[0]!;
    expect(parseWireMessage(vent({ ...s, cmds: Array.from({ length: VENT_LIMITS.cmds }, (_, i) => ({ ...c, id: `f${i}` })) }))).not.toBeNull();
    expect(parseWireMessage(vent({ ...s, cmds: Array.from({ length: VENT_LIMITS.cmds + 1 }, (_, i) => ({ ...c, id: `f${i}` })) }))).toBeNull();
    for (const tick of [1.5, '12', null, Number.NaN]) expect(parseWireMessage(vent({ ...s, tick })), String(tick)).toBeNull();
  });

  it(`a body over ${VENT_LIMITS.bytes} bytes (the envelope's own limit is ${WIRE_LIMITS.maxBytes})`, () => {
    const pad = (n: number) => ({ v: 1, kind: 'settings', cfg: { ...normal.cfg, note: 'x'.repeat(n) } });
    const room = VENT_LIMITS.bytes - bytes(pad(0));
    expect(parseWireMessage(vent(pad(room)))).not.toBeNull();
    expect(parseWireMessage(vent(pad(room + 1)))).toBeNull();
    expect(parseWireMessage(JSON.stringify(vent(pad(room + 1))))).toBeNull();
  });

  it('anything that is not a link message: another kind, v 2, the wrong fields, a non-string `to`, a sample', () => {
    for (const body of [
      null, [], 'cmds', { v: 1, kind: 'snapshot' }, { v: 2, kind: 'clock', ventTick: 3 }, { v: 1, kind: 'clock', ventTick: 'soon' },
      { v: 1, kind: 'run' }, { v: 1, kind: 'time', action: 'stop' }, { v: 1, kind: 'time', action: 'scale', value: '8' },
      { v: 1, kind: 'lungState', ev: { type: 'state' } }, { v: 1, kind: 'settings', cfg: [1] }, { v: 1, kind: 'control', circuit: 'open' },
    ])
      expect(parseWireMessage(vent(body)), JSON.stringify(body)).toBeNull();
    expect(parseWireMessage({ ...toVent({ v: 1, kind: 'clock', ventTick: 3 }), to: 7 })).toBeNull();
    const s = steady();
    const frame = (s.cmds[0] as unknown as { frame: Record<string, unknown> }).frame;
    expect(parseWireMessage(vent({ ...s, cmds: [{ ...s.cmds[0], frame: { ...frame, samples: [1, 2] } }] }))).toBeNull();
    expect(parseWireMessage(vent({ ...s, cmds: [{ ...s.cmds[0], frame: { ...frame, paw: Array.from({ length: 65 }, () => 5) } }] }))).toBeNull();
  });
});

describe("the ventilator's hello (R8a: the PIN, as an instructor's)", () => {
  const hello = (role: string, extra: Record<string, unknown> = {}) => ({ ...fromVent({ kind: 'hello', role: 'viewer' }), role, ...extra });
  it('a ventilator hello with a PIN passes; without one, or with a malformed one, it is refused', () => {
    expect(parseWireMessage(hello('ventilator', { pin: '4729' }))).toMatchObject({ kind: 'hello', role: 'ventilator', pin: '4729' });
    expect(parseWireMessage(hello('ventilator'))).toBeNull();
    for (const pin of ['47a9', '472', '123456789', 4729, null, '']) expect(parseWireMessage(hello('ventilator', { pin })), JSON.stringify(pin)).toBeNull();
  });
  it("a PIN stays refused on a viewer, a controller and a host; `show` and `device` stay a viewer's", () => {
    for (const role of ['viewer', 'controller', 'host']) expect(parseWireMessage(hello(role, { pin: '4729' })), role).toBeNull();
    expect(parseWireMessage(hello('ventilator', { pin: '4729', show: 'learner' }))).toBeNull();
    expect(parseWireMessage(hello('ventilator', { pin: '4729', device: 'abcdefgh1234' }))).toBeNull();
    expect(parseWireMessage(hello('instructor', { pin: '4729' }))).toMatchObject({ role: 'instructor' });
  });
});

// R8c: the relay port packs the `cmds` of 20 ms of wall time into one `batch` (400 ticks a second at ×8 → ≤ 50 messages,
// under the relay's 120), and the cockpit's settings carry what it measured and whether its page is hidden.
describe('R8c: the relay port\'s bodies', () => {
  const steady = () => structuredClone(cmds(normal.fromVent).at(-1)!);
  it('every body a real cockpit sends through the relay port at ×8 passes the guard inside a `vent`, and leaks no sample', async () => {
    const { createRelayPort, createVentDriver: drive } = await import('../../ventilator/src/index.ts');
    const out: unknown[] = [];
    let d: ReturnType<typeof drive> | null = null; // the cockpit's driver takes the port: its settings follow it
    const port = createRelayPort({ send: (b) => void out.push(JSON.parse(JSON.stringify(b))), onBody: () => () => {} }, { settings: () => (d ? { cfg: d.vs.cfg, measured: { RR: 12, VTE: 480 } } : null) });
    d = drive(port, 'anaphylaxis-bronchospasm');
    d.scale = 8;
    d.frame(0);
    d.frame(100); // 40 ticks in one animation frame: one flush splits them
    port.flush();
    port.setHidden(true);
    port.close();
    expect(out.some((b) => (b as { kind: string }).kind === 'batch')).toBe(true);
    expect(out.some((b) => (b as { kind: string; hidden?: boolean }).kind === 'settings' && (b as { hidden?: boolean }).hidden === true)).toBe(true);
    for (const b of out) expect(parseWireMessage(JSON.stringify(vent(b))), JSON.stringify(b).slice(0, 80)).not.toBeNull();
    for (const b of out) expect(findSampleLeak(vent(b))).toBeNull();
  });
  it(`a batch of at most ${VENT_LIMITS.batch} \`cmds\`, each one a valid \`cmds\`, within ${VENT_LIMITS.bytes} bytes`, () => {
    const s = steady();
    const at = (n: number, c = s.cmds) => Array.from({ length: n }, (_, i) => ({ ...s, tick: s.tick + i, cmds: c }));
    expect(parseWireMessage(vent({ v: 1, kind: 'batch', msgs: at(8) }))).not.toBeNull(); // ×8: the ticks of 20 ms
    expect(parseWireMessage(vent({ v: 1, kind: 'batch', msgs: at(VENT_LIMITS.batch, []) }))).not.toBeNull();
    expect(parseWireMessage(vent({ v: 1, kind: 'batch', msgs: at(Math.ceil(VENT_LIMITS.bytes / bytes(s)) + 1).slice(0, VENT_LIMITS.batch) }))).toBeNull(); // over the bytes
    for (const body of [
      { v: 1, kind: 'batch', msgs: at(VENT_LIMITS.batch + 1, []) }, { v: 1, kind: 'batch', msgs: [] }, { v: 1, kind: 'batch' },
      { v: 1, kind: 'batch', msgs: [{ v: 1, kind: 'clock', ventTick: 3 }] }, { v: 1, kind: 'batch', msgs: [{ ...s, tick: 1.5 }] },
      { v: 1, kind: 'batch', msgs: [{ ...s, cmds: [{ id: 'x', issuedBy: 'ventilator', type: 'time', action: 'pause' }] }] },
      { v: 1, kind: 'batch', msgs: [{ v: 1, kind: 'batch', msgs: at(1) }] },
    ])
      expect(parseWireMessage(vent(body)), JSON.stringify(body).slice(0, 120)).toBeNull();
  });
  it('settings may say what the cockpit measured and that its page is hidden; nothing else in those fields', () => {
    expect(parseWireMessage(vent({ v: 1, kind: 'settings', cfg: normal.cfg, measured: { RR: 14, VTE: 452 }, hidden: true }))).not.toBeNull();
    for (const extra of [{ measured: { RR: '14', VTE: 452 } }, { measured: [14, 452] }, { hidden: 'yes' }])
      expect(parseWireMessage(vent({ v: 1, kind: 'settings', cfg: normal.cfg, ...extra })), JSON.stringify(extra)).toBeNull();
  });
});
