// Room setup's defibrillator model and depth-of-anaesthesia device: the host refuses a change that would remove or
// replace a device in use, with the words that say why and what to do; an idle device, or none attached, takes it.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type Command, type DeviceEvent } from '@pme/engine-core';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { ROOM_REFUSALS } from '../../src/session/room-refusal.ts';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type ManagedTransport } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

type Engine = ReturnType<typeof createEngine>;
type Status = Extract<DeviceEvent, { type: 'deviceStatus' }>;
const target = (e: Engine): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
const hosts: HostSession[] = [];
const links: ManagedTransport[] = [];
afterEach(() => {
  for (const t of links.splice(0)) t.close();
  for (const h of hosts.splice(0)) h.close();
});

function setup(session: string) {
  const engine = createEngine({ seed: 7 });
  const host = new HostSession({ session, target: target(engine), stateIntervalMs: 0 });
  hosts.push(host);
  let status: Status | null = null;
  engine.on((e) => void (e.type === 'deviceStatus' && (status = e)));
  const run = (c: Command) => {
    expect(engine.dispatch(c).accepted).toBe(true);
    engine.step(1);
  };
  /** Steps the engine half a second at a time, at most `n` times, until the defibrillator reports `state`. */
  const until = (state: string, n = 40) => {
    for (let i = 0; i < n && status?.defib?.state !== state; i++) engine.step(25);
    expect(status?.defib?.state).toBe(state);
  };
  return { engine, host, run, until };
}

const defib = (action: string) => ({ type: 'applyEvent', event: { kind: 'defib', action } }) as Command;
const pacer = (mode: string) => ({ type: 'applyEvent', event: { kind: 'pacer', mode } }) as Command;
const m2 = (action: string, value: unknown) => ({ type: 'device', action: { device: 'defib', action, value } }) as Command;

describe("Room setup's defibrillator model is refused while the device is in use", () => {
  it('idle: taken; charging, then charged: refused with the words; disarmed: taken again', () => {
    const x = setup('RDF234');
    x.engine.step(50);
    expect(x.host.defibModelRefusal()).toBeNull();
    x.run(defib('charge'));
    expect(x.host.defibModelRefusal()).toBe(ROOM_REFUSALS.charging);
    expect(ROOM_REFUSALS.charging).toBe('The defibrillator is charging: disarm it first.');
    x.until('ready');
    expect(x.host.defibModelRefusal()).toBe('The defibrillator is charged: disarm it first.');
    x.run(defib('disarm'));
    expect(x.host.defibModelRefusal()).toBeNull();
  });

  it('pacing: refused; the pacer off: taken', () => {
    const x = setup('RDF235');
    x.run(pacer('fixed'));
    expect(x.host.defibModelRefusal()).toBe('The pacer is pacing: stop it first.');
    x.run(pacer('off'));
    expect(x.host.defibModelRefusal()).toBeNull();
  });

  it("the M2 switched on at its own screen: refused; turned to OFF: taken", () => {
    const x = setup('RDF236');
    x.run(m2('model', 'zoll-m2'));
    expect(x.host.defibModelRefusal()).toBeNull();
    x.run(m2('selector', 'monitor'));
    expect(x.host.defibModelRefusal()).toBe('The defibrillator is switched on: turn it off first.');
    x.run(m2('selector', 'off'));
    expect(x.host.defibModelRefusal()).toBeNull();
  });

  it('a new patient ends the old engine\'s device', () => {
    const x = setup('RDF237');
    x.run(pacer('fixed'));
    expect(x.host.defibModelRefusal()).not.toBeNull();
    x.host.newTimeline('restart');
    expect(x.host.defibModelRefusal()).toBeNull();
  });
});

describe("Room setup's depth device is refused while a depth window reads it", () => {
  const stamps = new Map<string, ReturnType<typeof createStamper>>();
  const hello = (t: ManagedTransport, session: string, from: string, show: 'depth' | 'monitor', device?: string) => {
    if (!stamps.has(from)) stamps.set(from, createStamper(session, from));
    t.send((stamps.get(from) as ReturnType<typeof createStamper>)({ kind: 'hello', role: 'viewer', show, ...(device ? { device } : {}) }));
  };
  const names: Record<string, string> = { bed3depth01: 'Bed 3' };
  const name = (key: string) => names[key] ?? null;

  it('a window on this computer is named by where it is, a named one by its name; one that closes lets the change through', async () => {
    const S = 'RDP234';
    const x = setup(S);
    const hostLink = createBroadcastChannelTransport(S);
    x.host.addTransport(hostLink);
    const win = createBroadcastChannelTransport(S);
    const named = createBroadcastChannelTransport(S);
    links.push(hostLink, win, named);
    const gotWin = collect(win);
    expect(x.host.depthRefusal(name)).toBeNull();
    hello(win, S, 'view-a', 'depth');
    await waitFor(() => gotWin.some((m) => m.kind === 'snapshot'), 2000, "the host's welcome");
    expect(x.host.depthRefusal(name)).toBe('The Depth of anaesthesia window on this computer is reading the EEG: close it first.');
    const gotNamed = collect(named);
    hello(named, S, 'view-b', 'depth', 'bed3depth01');
    await waitFor(() => gotNamed.some((m) => m.kind === 'snapshot'), 2000, "the host's welcome");
    expect(x.host.depthRefusal(name)).toBe('2 Depth of anaesthesia windows are reading the EEG (on this computer and "Bed 3"): close them first.');
    win.close();
    await waitFor(() => x.host.depthRefusal(name) === ROOM_REFUSALS.depth(['"Bed 3"']), 2000, 'the closed window to leave');
    expect(x.host.depthRefusal(name)).toBe('The Depth of anaesthesia window "Bed 3" is reading the EEG: close it first.');
    named.close();
    await waitFor(() => x.host.depthRefusal(name) === null, 2000, 'the named window to leave');
  });

  it('a window over the relay is a phone or tablet; a monitor window is not a depth window', async () => {
    const S = 'RDP235';
    const x = setup(S);
    const hub = createInProcessHub();
    x.host.addTransport(hub.connect());
    const phone = hub.connect();
    const got = collect(phone);
    hello(phone, S, 'view-m', 'monitor');
    await waitFor(() => got.some((m) => m.kind === 'snapshot'), 2000, "the host's welcome");
    expect(x.host.depthRefusal(name)).toBeNull();
    hello(phone, S, 'view-d', 'depth');
    await waitFor(() => got.filter((m) => m.kind === 'snapshot').length === 2, 2000, "the host's second welcome");
    expect(x.host.depthRefusal(name)).toBe('The Depth of anaesthesia window on a phone or tablet is reading the EEG: close it first.');
    hello(phone, S, 'view-d', 'monitor');
    await waitFor(() => got.filter((m) => m.kind === 'snapshot').length === 3, 2000, "the host's third welcome");
    expect(x.host.depthRefusal(name)).toBeNull();
  });
});
