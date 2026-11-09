// Plan room-and-instruments.md R8c: the host takes a remote cockpit (a `ventilator` signed in with the instructor's
// PIN) in its own single place, option B within that role only (the newest right PIN takes over, the first is told);
// an instructor phone's grant is untouched by it. Only the granted ventilator's `vent` reaches the app (`onVent`), a
// ventilator's `command` is refused even when granted, and the PIN change revokes it as it revokes the phone.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { HostSession, INSTRUCTOR_REASONS, VENTILATOR_REASONS, type HostSessionOptions, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type ManagedTransport, type VentLinkBody, type WireMessage } from '../../src/protocol.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

const S = 'HVN234';
const PIN = '4729';
const target = (e = createEngine({ seed: 3 })): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
const hosts: HostSession[] = [];
afterEach(() => {
  for (const h of hosts.splice(0)) h.close();
});
type Grant = Extract<WireMessage, { kind: 'grant' }>;
type Ack = Extract<WireMessage, { kind: 'ack' }>;
const grants = (got: WireMessage[], to: string) => got.filter((m): m is Grant => m.kind === 'grant' && m.to === to);
const ackOf = (got: WireMessage[], id: string) => got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id);

function setup(o: Partial<HostSessionOptions> = {}) {
  const vents: Array<{ from: string; body: VentLinkBody }> = [];
  const holders: Array<string | null> = [];
  let pin: string | null = PIN;
  const host = new HostSession({
    session: S, target: target(), stateIntervalMs: 0, instructorPin: () => pin,
    onVent: (from, body) => void vents.push({ from, body }), onVentilator: (from) => void holders.push(from), ...o,
  });
  hosts.push(host);
  const link = () => {
    const hub = createInProcessHub();
    const detach = host.addTransport(hub.connect());
    const relay = hub.connect();
    return { relay, got: collect(relay), detach };
  };
  return { host, vents, holders, setPin: (p: string | null) => void (pin = p), link, ...link() };
}
const device = (relay: ManagedTransport, from: string, role: 'ventilator' | 'instructor' = 'ventilator') => {
  const st = createStamper(S, from);
  let n = 0;
  return {
    hello: (p?: string) => relay.send(st({ kind: 'hello', role, ...(p !== undefined ? { pin: p } : {}) })),
    vent: (body: VentLinkBody) => relay.send(st({ kind: 'vent', body })),
    command: (body: Record<string, unknown>, id = `${from}-${++n}`) => {
      relay.send(st({ kind: 'command', body: { id, issuedBy: from, ...body } as never }));
      return id;
    },
  };
};
/** The host's socket to a relay: the test hands it frames and says a peer left, as the relay does (R29). */
class FakeRelaySocket extends TransportBase {
  readonly kind = 'websocket' as const;
  readonly sent: WireMessage[] = [];
  constructor() {
    super();
    this.setStatus('open');
  }
  hear(m: WireMessage): void {
    this.deliver(m);
  }
  left(from: string): void {
    this.peerLeft(from);
  }
  protected write(m: WireMessage): void {
    this.sent.push(m);
  }
  protected teardown(): void {}
}
const cmds = (tick: number): VentLinkBody => ({ v: 1, kind: 'cmds', tick, cmds: [] });
const settle = () => sleep(10);

describe('the host grants one remote ventilator (R8c)', () => {
  it('an ungranted ventilator\'s `vent` never reaches the app; a granted one\'s does, from its id; it is sent no welcome', async () => {
    const { relay, got, vents, holders } = setup({ welcomeEvents: () => [{ type: 'scenario', t: 0, stateId: 'welcome' }] });
    const v = device(relay, 'vent-a.1');
    v.vent(cmds(1)); // no hello
    v.hello('0000'); // wrong PIN
    await waitFor(() => grants(got, 'vent-a.1').length === 1);
    expect(grants(got, 'vent-a.1')[0]).toMatchObject({ granted: false, reason: INSTRUCTOR_REASONS.wrongPin });
    v.vent(cmds(2));
    await settle();
    expect(vents).toEqual([]);
    expect(holders).toEqual([]);
    v.hello(PIN);
    await waitFor(() => grants(got, 'vent-a.1').length === 2);
    expect(grants(got, 'vent-a.1')[1]).toMatchObject({ granted: true });
    v.vent(cmds(3));
    await waitFor(() => vents.length === 1);
    expect(vents).toEqual([{ from: 'vent-a.1', body: cmds(3) }]);
    expect(holders).toEqual(['vent-a.1']);
    expect(got.some((m) => m.kind === 'snapshot')).toBe(false); // it follows nothing
  });

  it('no PIN set, or an app that takes no remote ventilator (no onVent): every ventilator is denied', async () => {
    const off = setup();
    off.setPin(null);
    device(off.relay, 'vent-a.1').hello(PIN);
    await waitFor(() => grants(off.got, 'vent-a.1').length === 1);
    expect(grants(off.got, 'vent-a.1')[0]).toMatchObject({ granted: false, reason: VENTILATOR_REASONS.noVentilator });
    const old = setup({ onVent: undefined });
    device(old.relay, 'vent-a.1').hello(PIN);
    await waitFor(() => grants(old.got, 'vent-a.1').length === 1);
    expect(grants(old.got, 'vent-a.1')[0]).toMatchObject({ granted: false, reason: VENTILATOR_REASONS.noVentilator });
  });

  it('a granted ventilator\'s `command` is refused (its frames ride its link)', async () => {
    const { relay, got } = setup();
    const v = device(relay, 'vent-a.1');
    v.hello(PIN);
    await waitFor(() => grants(got, 'vent-a.1').length === 1);
    const id = v.command({ type: 'setTarget', variable: 'hr', value: 150 });
    await waitFor(() => ackOf(got, id) !== undefined);
    expect(ackOf(got, id)).toMatchObject({ accepted: false, reason: VENTILATOR_REASONS.noCommands });
  });

  it('the host\'s `vent` goes to the granted ventilator only, addressed to it; with none granted it is not sent', async () => {
    const { host, relay, got } = setup();
    expect(host.ventPost({ v: 1, kind: 'clock', ventTick: 80 })).toBe(false);
    expect(got.some((m) => m.kind === 'vent')).toBe(false);
    device(relay, 'vent-a.1').hello(PIN);
    await waitFor(() => grants(got, 'vent-a.1').length === 1);
    expect(host.ventilator).toBe('vent-a.1');
    expect(host.ventPost({ v: 1, kind: 'clock', ventTick: 80 })).toBe(true);
    await waitFor(() => got.some((m) => m.kind === 'vent'));
    expect(got.filter((m) => m.kind === 'vent')).toMatchObject([{ kind: 'vent', to: 'vent-a.1', body: { kind: 'clock', ventTick: 80 } }]);
  });

  it('the second granted ventilator takes over and the first is told; an instructor phone\'s grant is untouched', async () => {
    const { relay, got, vents, holders } = setup();
    const phone = device(relay, 'ph.1', 'instructor');
    phone.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1);
    const a = device(relay, 'vent-a.1');
    a.hello(PIN);
    await waitFor(() => grants(got, 'vent-a.1').length === 1);
    const b = device(relay, 'vent-b.1');
    b.hello(PIN);
    await waitFor(() => grants(got, 'vent-b.1').length === 1);
    expect(grants(got, 'vent-a.1')).toMatchObject([{ granted: true }, { granted: false, reason: INSTRUCTOR_REASONS.takenOver }]);
    expect(grants(got, 'vent-b.1')).toMatchObject([{ granted: true }]);
    expect(holders).toEqual(['vent-a.1', 'vent-b.1']);
    a.vent(cmds(1));
    b.vent(cmds(2));
    await waitFor(() => vents.length === 1);
    await settle();
    expect(vents).toEqual([{ from: 'vent-b.1', body: cmds(2) }]);
    // the phone was never told anything, and still commands
    expect(grants(got, 'ph.1')).toHaveLength(1);
    const id = phone.command({ type: 'setTarget', variable: 'hr', value: 110 });
    await waitFor(() => ackOf(got, id) !== undefined);
    expect(ackOf(got, id)).toMatchObject({ accepted: true });
    // and a second phone taking the instructor's place leaves the ventilator granted
    device(relay, 'ph.2', 'instructor').hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 2);
    b.vent(cmds(3));
    await waitFor(() => vents.length === 2);
    expect(grants(got, 'vent-b.1')).toHaveLength(1);
  });

  it('the PIN change revokes the ventilator as it revokes the phone; a PIN changed unannounced is caught at its next `vent`', async () => {
    const { host, relay, got, vents, holders, setPin } = setup();
    const v = device(relay, 'vent-a.1');
    v.hello(PIN);
    device(relay, 'ph.1', 'instructor').hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1);
    setPin('5555');
    host.instructorPinChanged();
    await waitFor(() => grants(got, 'ph.1').length === 2);
    expect(grants(got, 'vent-a.1').at(-1)).toMatchObject({ granted: false, reason: INSTRUCTOR_REASONS.pinChanged });
    expect(grants(got, 'ph.1').at(-1)).toMatchObject({ granted: false, reason: INSTRUCTOR_REASONS.pinChanged });
    expect(holders).toEqual(['vent-a.1', null]);
    v.hello('5555');
    await waitFor(() => grants(got, 'vent-a.1').length === 3);
    setPin('6666'); // unannounced
    v.vent(cmds(1));
    await waitFor(() => grants(got, 'vent-a.1').length === 4);
    expect(grants(got, 'vent-a.1').at(-1)).toMatchObject({ granted: false, reason: INSTRUCTOR_REASONS.pinChanged });
    expect(vents).toEqual([]);
    expect(holders).toEqual(['vent-a.1', null, 'vent-a.1', null]);
  });

  it('its socket leaving (peer-left) or its transport closing ends the grant: the app is told at once', async () => {
    const { link, holders } = setup();
    const one = link();
    device(one.relay, 'vent-a.1').hello(PIN);
    await waitFor(() => holders.length === 1);
    one.detach();
    expect(holders).toEqual(['vent-a.1', null]);
    const sock = new FakeRelaySocket();
    const seen: Array<string | null> = [];
    const h2 = new HostSession({ session: S, target: target(), stateIntervalMs: 0, instructorPin: () => PIN, onVent: () => {}, onVentilator: (f) => void seen.push(f) });
    hosts.push(h2);
    h2.addTransport(sock);
    sock.hear(createStamper(S, 'vent-a.1')({ kind: 'hello', role: 'ventilator', pin: PIN }));
    await waitFor(() => seen.length === 1);
    sock.left('vent-a.1');
    await waitFor(() => seen.length === 2);
    expect(seen).toEqual(['vent-a.1', null]);
  });
});

describe('a silence hand-over revokes the cockpit id (R8c/R8d hand-over contract)', () => {
  it('revokeVentilator(id) tells that id it is revoked (silent), releases its place, and its late `vent` never reaches the app but is refused again', async () => {
    const { host, relay, got, vents, holders } = setup();
    const v = device(relay, 'vent-a.1');
    v.hello(PIN);
    await waitFor(() => grants(got, 'vent-a.1').some((g) => g.granted));
    v.vent(cmds(1));
    await waitFor(() => vents.length === 1);
    expect(host.revokeVentilator('vent-a.1', VENTILATOR_REASONS.silent)).toBe(true);
    await settle();
    expect(grants(got, 'vent-a.1').at(-1)).toMatchObject({ granted: false, reason: VENTILATOR_REASONS.silent });
    expect(holders.at(-1)).toBeNull();
    expect(host.ventilator).toBeNull();
    // the frames the device's browser held while it was away arrive late, from the revoked id
    const before = grants(got, 'vent-a.1').length;
    v.vent({ v: 1, kind: 'batch', msgs: [{ v: 1, kind: 'cmds', tick: 2, cmds: [] }] } as never);
    v.vent({ v: 1, kind: 'settings', cfg: { mode: 'VC' } as never } as never);
    await settle();
    expect(vents).toHaveLength(1); // nothing more reached the app: it never re-takes the patient
    expect(grants(got, 'vent-a.1').length).toBeGreaterThan(before); // answered: it signs in again
    expect(grants(got, 'vent-a.1').at(-1)).toMatchObject({ granted: false, reason: VENTILATOR_REASONS.silent });
  });

  it('only the holder named is revoked; a fresh sign-in (a new socket id) is granted and drives', async () => {
    const { host, relay, got, vents } = setup();
    const v1 = device(relay, 'vent-a.1');
    v1.hello(PIN);
    await waitFor(() => grants(got, 'vent-a.1').some((g) => g.granted));
    expect(host.revokeVentilator('vent-zz.9', VENTILATOR_REASONS.silent)).toBe(false);
    expect(host.ventilator).toBe('vent-a.1');
    host.revokeVentilator('vent-a.1', VENTILATOR_REASONS.silent);
    const v2 = device(relay, 'vent-a.2');
    v2.hello(PIN);
    await waitFor(() => grants(got, 'vent-a.2').some((g) => g.granted));
    v2.vent(cmds(5));
    await waitFor(() => vents.some((x) => x.from === 'vent-a.2'));
    expect(host.ventilator).toBe('vent-a.2');
  });
});
