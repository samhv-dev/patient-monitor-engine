// Defibrillator plan R1 (docs/plans/defibrillator-zoll-m2.md §5.1, §4.3; DQ6 = A, ruled 12 November 2026): a `defib`
// socket whose hello carries the LEARNER PIN is held PENDING, as the learner remote and the pump are, until the host's
// grant; nothing it commands reaches the host before. Granted, it may send the ZOLL M2's own controls (LEARNER_DEFIB_M2,
// learnerDefibM2May) and nothing else, under a cap derived from the face's fastest legitimate use. Until piece R2 the
// host grants no `defib` hello, so here the host is a raw socket whose hand-made `grant` stands in for R2's. A `defib`
// hello with no PIN is today's window, unchanged (relay-defib.test.ts). Every relay here runs on a fake clock (`now`).
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, type Role } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'DFM234';
let relay: RelayHandle | null = null;
let clock = 1_000_000;
let logs: string[] = [];
const closers: Array<() => void> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) c();
  await relay?.close();
  relay = null;
  clock = 1_000_000;
  logs = [];
});
const start = async (o: RelayOptions = {}) =>
  (relay = await startRelay({
    port: 0, host: '127.0.0.1', heartbeatMs: 60_000, takenCheckMs: 300, remoteRoles: 'viewer',
    isLocal: (_a, req) => !req?.url?.includes('e2e-remote'),
    now: () => clock,
    log: (l) => logs.push(l),
    ...o,
  }));

interface Sock {
  ws: WebSocket;
  raw: string[];
  got: Array<Record<string, unknown>>;
  closeCode: number | null;
  send: (body: Record<string, unknown>) => string;
}
async function sock(from: string): Promise<Sock> {
  const ws = new WebSocket(`ws://127.0.0.1:${relay!.port}/${from.startsWith('host') ? '' : '?e2e-remote'}`);
  const stamp = createStamper(SESSION, from);
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
async function join(from: string, role: Role, extra: Record<string, unknown> = {}) {
  const s = await sock(from);
  s.send({ kind: 'hello', role, ...extra });
  await waitFor(() => s.got.some((f) => f.relay === 'peers') || s.closeCode !== null, 2000, `${from} admitted or closed`);
  return s;
}
const errors = (s: Sock) => s.got.filter((f) => f.relay === 'error') as Array<{ code: string; message: string }>;
const commandsAt = (host: Sock) => host.got.filter((m) => m.kind === 'command');
const settled = () => sleep(150);
const command = (id: string, body: Record<string, unknown>) => ({ kind: 'command', body: { id, issuedBy: 'defib', ...body } });
const defibEv = (id: string, event: Record<string, unknown>) => command(id, { type: 'applyEvent', event: { kind: 'defib', ...event } });
const dev = (id: string, action: string, value?: unknown) => command(id, { type: 'device', action: { device: 'defib', action, ...(value === undefined ? {} : { value }) } });
/** One Trim Knob step of the pacer's output (§4.3: 2 mA steps [G 16-5]). */
const knob = (id: string, mA: number) => command(id, { type: 'applyEvent', event: { kind: 'pacer', mode: 'fixed', ratePpm: 70, mA } });
const PIN = '4729';

/** The laptop's host, a learner's phone and the defibrillator screen with the learner PIN, both from another device. */
async function room(ro: RelayOptions = {}) {
  await start(ro);
  const host = await join('host-h1', 'host');
  const viewer = await join('view-v1', 'viewer', { show: 'learner', device: 'phone0001' });
  const defib = await join('defib-d1', 'defib', { pin: PIN, show: 'defib', device: 'window0001' });
  await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === 'defib-d1'), 2000, 'defib hello at the host');
  return { host, viewer, defib };
}
/** The host's grant (what R2's HostSession will send once it has verified the PIN): consumed by the relay, told to the screen. */
async function grant(host: Sock, defib: Sock, granted = true) {
  host.send({ kind: 'grant', to: 'defib-d1', granted });
  await waitFor(() => defib.got.some((m) => m.kind === 'grant') || defib.closeCode !== null, 2000, 'the grant at the screen');
}

describe('a `defib` hello with the learner PIN is pending until the host grants it', () => {
  it('admitted from another device; its hello (with the PIN) reaches the host; the host lists it ungranted', async () => {
    const { host, defib, viewer } = await room();
    expect(defib.closeCode).toBeNull();
    expect(host.got.find((m) => m.kind === 'hello' && m.from === 'defib-d1')).toMatchObject({ role: 'defib', pin: PIN, device: 'window0001' });
    expect(viewer.raw.some((r) => r.includes(PIN))).toBe(false); // the PIN goes to the host only
    const table = host.got.filter((f) => f.relay === 'peers').at(-1)!.devices as Array<Record<string, unknown>>;
    expect(table.find((d) => d.id === 'defib-d1')).toMatchObject({ role: 'defib', granted: false });
  });

  it('pending, nothing it commands reaches the host, not even a bare Charge; the relay logs each refusal', async () => {
    const { host, defib } = await room();
    for (const [k, m] of [defibEv('p1', { action: 'charge' }), defibEv('p2', { action: 'shock' }), dev('p3', 'selector', 'pacer')].entries()) {
      clock += 1000;
      defib.send(m);
      await waitFor(() => errors(defib).length === k + 1, 2000, `refused ${k}`);
    }
    expect(errors(defib).map((e) => e.message)).toEqual(Array(3).fill('the defibrillator is not signed in'));
    await settled();
    expect(commandsAt(host)).toEqual([]);
    expect(logs.filter((l) => l.startsWith('defib defib-d1: refused'))).toHaveLength(3);
  });

  it('denied: the socket is told and closed (`denied`), and the wrong PIN counts against its address', async () => {
    const { host, defib } = await room();
    await grant(host, defib, false);
    await waitFor(() => defib.closeCode !== null, 2000, 'closed');
    expect(defib.closeCode).toBe(RELAY_CLOSE.denied);
    expect(logs).toContain(`room ${SESSION}: defib defib-d1 denied`);
  });

  it('five wrong PINs from one address block its next PIN hello as a defibrillator, as for the other PIN roles', async () => {
    await start();
    const host = await join('host-h1', 'host');
    for (let k = 1; k <= 5; k++) {
      const d = await join(`defib-w${k}`, 'defib', { pin: PIN });
      await waitFor(() => host.got.some((m) => m.kind === 'hello' && m.from === `defib-w${k}`), 2000, `hello ${k}`);
      host.send({ kind: 'grant', to: `defib-w${k}`, granted: false });
      await waitFor(() => d.closeCode !== null, 2000, `denied ${k}`);
    }
    const blocked = await join('defib-w6', 'defib', { pin: PIN });
    expect(blocked.closeCode).toBe(RELAY_CLOSE.tooManyTries);
  });

  it('a socket keeps how its first hello was admitted: a PIN hello on a no-PIN window, or the reverse, is forbidden', async () => {
    await start();
    const host = await join('host-h1', 'host');
    const plain = await join('defib-a', 'defib');
    const pinned = await join('defib-b', 'defib', { pin: PIN });
    plain.send({ kind: 'hello', role: 'defib', pin: PIN });
    pinned.send({ kind: 'hello', role: 'defib' });
    await waitFor(() => errors(plain).length === 1 && errors(pinned).length === 1, 2000, 'both refused');
    expect(errors(plain)[0]).toMatchObject({ code: 'forbidden' });
    expect(errors(pinned)[0]).toMatchObject({ code: 'forbidden' });
    await settled();
    expect(host.got.filter((m) => m.kind === 'hello' && (m.from === 'defib-a' || m.from === 'defib-b'))).toHaveLength(2);
  });
});

describe('granted (the stand-in for R2), the screen sends the M2 table and nothing else', () => {
  const ALLOWED: Array<[string, Record<string, unknown>]> = [
    ['selectEnergy', defibEv('a1', { action: 'selectEnergy', energyJ: 150 })],
    ['charge', defibEv('a2', { action: 'charge' })],
    ['shock (bare)', defibEv('a3', { action: 'shock' })],
    ['disarm', defibEv('a4', { action: 'disarm' })],
    ['syncOn', defibEv('a5', { action: 'syncOn' })],
    ['syncOff', defibEv('a6', { action: 'syncOff' })],
    ['pacer', knob('a7', 60)],
    ['selector', dev('a8', 'selector', 'pacer')],
    ['patientType', dev('a9', 'patientType', 'adult')],
    ['defibMode', dev('a10', 'defibMode', { mode: 'aed' })],
    ['shockButton', dev('a11', 'shockButton', { phase: 'down', button: 'panel' })],
    ['analyze', dev('a12', 'analyze')],
    ['fourToOne', dev('a13', 'fourToOne', { phase: 'down' })],
    ['alarmControl', dev('a14', 'alarmControl', { phase: 'down' })],
    ['alarmLimit', dev('a15', 'alarmLimit', { param: 'SpO2', low: 90 })],
    ['setting', dev('a16', 'setting', { spo2Averaging: 'high' })],
    ['nibp', dev('a17', 'nibp', 'press')],
    ['co2', dev('a18', 'co2', 'on')],
    ['codeMarker', dev('a19', 'codeMarker', { label: 'Adrenaline' })],
    ['print', dev('a20', 'print', 'press')],
    ['connect', dev('a21', 'connect', { ecgCable: '3' })],
  ];
  const REFUSED: Array<[string, Record<string, unknown>]> = [
    ['preselect', defibEv('r1', { action: 'preselect', outcome: 'sinus' })],
    ['pacer fault', command('r2', { type: 'applyEvent', event: { kind: 'pacer', mode: 'demand', fault: 'failureToSense' } })],
    ['pacer pause', command('r3', { type: 'applyEvent', event: { kind: 'pacer', mode: 'fixed', pause: true } })],
    ['setTarget', command('r4', { type: 'setTarget', variable: 'hr', value: 80 })],
    ['time pause', command('r5', { type: 'time', action: 'pause' })],
    ['time scale', command('r6', { type: 'time', action: 'scale', value: 8 })],
    ['scenario trigger', command('r7', { type: 'scenario', action: 'trigger', target: 't1' })],
    ['drug', command('r8', { type: 'applyEvent', event: { kind: 'drug', drugId: 'adrenaline', dose: 1, unit: 'mg', route: 'iv' } })],
    ['device defib model', dev('r9', 'model', 'generic')],
    ['device defib config', dev('r10', 'config', { readyTimeoutS: 30 })],
    ["the bedside monitor's alarms", command('r11', { type: 'device', action: { device: 'alarm', action: 'ack' } })],
  ];

  it('every allowed shape reaches the host byte for byte; its acks route back to the screen only', async () => {
    const { host, defib, viewer } = await room();
    await grant(host, defib);
    const up: string[] = [];
    for (const [what, m] of ALLOWED) {
      clock += 1000;
      up.push(defib.send(m));
      await waitFor(() => commandsAt(host).length === up.length, 2000, `at the host: ${what}`);
    }
    expect(host.raw.filter((r) => r.includes('"kind":"command"'))).toEqual(up);
    host.send({ kind: 'ack', commandId: 'a8', accepted: true, tick: 60 });
    await waitFor(() => defib.got.some((m) => m.kind === 'ack'), 2000, 'the ack at the screen');
    await settled();
    expect(viewer.got.some((m) => m.kind === 'ack')).toBe(false);
    expect(errors(defib)).toEqual([]);
  });

  it('preselect, a pacer fault or pause, setTarget, time, scenario, drug, the model and the configuration are refused and never reach the host', async () => {
    const { host, defib } = await room();
    await grant(host, defib);
    for (const [what, m] of REFUSED) {
      clock += 1000;
      const before = errors(defib).length;
      defib.send(m);
      await waitFor(() => errors(defib).length === before + 1, 2000, `refused: ${what}`);
      expect(errors(defib).at(-1), what).toMatchObject({ code: 'forbidden' });
    }
    await settled();
    expect(commandsAt(host)).toEqual([]);
    expect(defib.closeCode).toBeNull();
    expect(logs.filter((l) => l.startsWith('defib defib-d1: refused'))).toHaveLength(REFUSED.length);
  });

  it('granted, it still follows as a viewer does (the lean copy), never the host\'s frames whole', async () => {
    const { host, defib, viewer } = await room();
    await grant(host, defib);
    const ev = host.send({ kind: 'event', body: [
      { type: 'state', t: 1, tick: 50, mode: 'manual', values: {}, control: {} },
      { type: 'instructorView', t: 1, body: { rows: [] } },
    ] });
    await waitFor(() => defib.got.some((m) => m.kind === 'event') && viewer.got.some((m) => m.kind === 'event'), 2000, 'the event at both');
    const lean = (s: Sock) => s.raw.filter((r) => r.includes('"kind":"event"'));
    expect(lean(defib)).toEqual(lean(viewer));
    expect(lean(defib)[0]).not.toBe(ev);
  });

  it('a new host socket revokes its grant (the relay\'s own grant false): it must prove the PIN again', async () => {
    const { host, defib } = await room();
    await grant(host, defib);
    host.ws.close();
    await waitFor(() => relay!.room(SESSION)?.hostOnline === false, 2000, 'host gone');
    const host2 = await join('host-h2', 'host');
    await waitFor(() => defib.got.filter((m) => m.kind === 'grant').length === 2, 2000, 'the revocation');
    expect(defib.got.filter((m) => m.kind === 'grant').at(-1)).toMatchObject({ granted: false });
    clock += 1000;
    defib.send(defibEv('after', { action: 'charge' }));
    await waitFor(() => errors(defib).length === 1, 2000, 'refused again');
    expect(errors(defib)[0]).toMatchObject({ code: 'forbidden', message: 'the defibrillator is not signed in' });
    expect(commandsAt(host2)).toEqual([]);
  });
});

// Plan §4.3: the face sends the Trim Knob's value at most every 250 ms while turning, plus the final one on press, and
// Shock is held down and let go (two `shockButton` events). In any one second: 1000 / 250 = 4 knob steps + 1 final value
// + 2 Shock events = 7 (relay/server.ts DEFIB_M2_PER_S). The no-PIN window keeps its 4 (relay-defib.test.ts).
describe('the cap of an admitted screen: 7 commands a second, derived from the face', () => {
  const PER_S = 1000 / 250 + 1 + 2;
  it('turning the knob while pressing Shock, for five seconds, stays under the cap: every command reaches the host', async () => {
    expect(PER_S).toBe(7);
    const { host, defib } = await room();
    await grant(host, defib);
    let n = 0;
    let mA = 40;
    const at = async (t: number, m: Record<string, unknown>) => {
      clock = t;
      defib.send(m);
      n++;
      await waitFor(() => commandsAt(host).length === n, 2000, `command ${n}`);
    };
    const t0 = clock;
    for (let s = 0; s < 5; s++) {
      const base = t0 + 1000 * s;
      await at(base, knob(`k${s}a`, (mA += 2)));
      await at(base + 250, knob(`k${s}b`, (mA += 2)));
      await at(base + 500, knob(`k${s}c`, (mA += 2)));
      await at(base + 600, dev(`sd${s}`, 'shockButton', { phase: 'down', button: 'panel' }));
      await at(base + 750, knob(`k${s}d`, (mA += 2)));
      await at(base + 900, knob(`k${s}e`, mA)); // the final value, on the knob's press
      await at(base + 950, dev(`su${s}`, 'shockButton', { phase: 'up', button: 'panel' }));
    }
    expect(n).toBe(35);
    expect(defib.closeCode).toBeNull();
    expect(errors(defib)).toEqual([]);
  });

  it('one command above the derived rate (8 in one second) closes the socket (`too-many-tries`) and never reaches the host', async () => {
    const { host, defib } = await room();
    await grant(host, defib);
    for (let k = 1; k <= 8; k++) defib.send(knob(`o${k}`, 40 + 2 * k)); // the fake clock stands still
    await waitFor(() => defib.closeCode !== null, 2000, 'closed');
    expect(defib.closeCode).toBe(RELAY_CLOSE.tooManyTries);
    await settled();
    expect(commandsAt(host)).toHaveLength(7);
    expect(logs).toContain('defib defib-d1: more than 7 commands a second: closed');
  });

  it('a pending screen is under the same cap: its 8th refused command in a second closes it', async () => {
    const { defib } = await room();
    for (let k = 1; k <= 8; k++) defib.send(defibEv(`q${k}`, { action: 'charge' }));
    await waitFor(() => defib.closeCode !== null, 2000, 'closed');
    expect(errors(defib).map((e) => e.code)).toEqual([...Array(7).fill('forbidden'), 'too-many-tries']);
  });
});
