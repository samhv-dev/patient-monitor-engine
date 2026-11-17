// Room setup's defibrillator model and depth-of-anaesthesia device: the host refuses a change that would remove or
// replace a device in use, with the words that say why and what to do; an idle device, or none attached, takes it.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type Command, type DeviceEvent } from '@pme/engine-core';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { ROOM_REFUSALS } from '../../src/session/room-refusal.ts';
import { channelName, createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { loadFormulary } from '../../src/formulary/load.ts';
import type { FormularyFiles } from '../../src/formulary/types.ts';
import { loadPumpDevices } from '../../src/pump-devices.ts';
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

describe("a same-computer farewell only stops counting what the peer was showing: it signs nothing out and releases nothing", () => {
  const here = (p: string) => resolve(fileURLToPath(new URL(p, import.meta.url)));
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  const readFolder = (dir: string, skip: string[] = []): Record<string, unknown> =>
    Object.fromEntries(walk(dir).filter((f) => f.endsWith('.json') && !skip.some((x) => f.endsWith(x))).map((f) => [relative(dir, f), JSON.parse(readFileSync(f, 'utf8'))]));
  const shipped = loadFormulary(readFolder(here('../../formulary')) as FormularyFiles);
  if (!shipped.ok) throw new Error('the shipped formulary breaks its source rules');
  const FORMULARY = shipped.formulary;
  const dev = loadPumpDevices(readFolder(here('../../pump-devices'), ['schema.json']));
  if (!dev.ok) throw new Error('the shipped pump device profiles break their source rules');
  const DEVICES = dev.devices;
  const S = 'FWL234';
  const LEARNER_PIN = '582913';
  const INSTRUCTOR_PIN = '4729';
  type Ack = Extract<WireMessage, { kind: 'ack' }>;

  /** A host on this computer's channel; each page has its own link to it; `forge` posts a farewell naming any id. */
  function room() {
    const got: Command[] = [];
    const tg: HostTarget = {
      dispatch: (c) => (got.push(c), { accepted: true, tick: 0 }), snapshot: () => ({ schema: 'x', tick: 0 }) as never, restore: () => undefined,
      on: () => () => undefined, now: () => ({ tick: 0, simT: 0 }), time: () => undefined,
    };
    const seen = { instructors: 0, ventilator: null as string | null, vent: [] as string[] };
    const host = new HostSession({
      session: S, target: tg, stateIntervalMs: 0, instructorPin: () => INSTRUCTOR_PIN, learnerPin: () => LEARNER_PIN,
      formulary: () => FORMULARY, pumpRack: () => ['syringe', 'syringe'], pumpDevices: () => DEVICES,
      onInstructors: (n) => void (seen.instructors = n), onVentilator: (from) => void (seen.ventilator = from), onVent: (from) => void seen.vent.push(from),
    });
    hosts.push(host);
    const hostLink = createBroadcastChannelTransport(S);
    host.addTransport(hostLink);
    const farewells: string[] = [];
    hostLink.onFarewell?.((id) => void farewells.push(id)); // after the host's own: its handling is queued first
    links.push(hostLink);
    const page = (from: string, role: string) => {
      const t = createBroadcastChannelTransport(S);
      links.push(t);
      const heard = collect(t);
      const st = createStamper(S, from);
      let n = 0;
      return {
        t, from,
        hello: (extra: Record<string, unknown> = {}) => t.send(st({ kind: 'hello', role, ...extra } as never)),
        vent: () => t.send(st({ kind: 'vent', body: { v: 1, kind: 'clock', ventTick: ++n } } as never)),
        granted: () => waitFor(() => heard.some((m) => m.kind === 'grant' && m.to === from && m.granted), 2000, `${from}'s grant`),
        welcomed: (k = 1) => waitFor(() => heard.filter((m) => m.kind === 'snapshot').length >= k, 2000, `${from}'s welcome`),
        send: async (body: Record<string, unknown>): Promise<Ack> => {
          const id = `${from}-${++n}`;
          t.send(st({ kind: 'command', body: { id, issuedBy: from, ...body } as never }));
          await waitFor(() => heard.some((m) => m.kind === 'ack' && m.commandId === id), 2000, `the ack of ${id}`);
          return heard.find((m): m is Ack => m.kind === 'ack' && m.commandId === id) as Ack;
        },
      };
    };
    const raw = new BroadcastChannel(channelName(S));
    const forge = async (ids: string[]) => {
      const k = farewells.length + ids.length;
      for (const id of ids) raw.postMessage({ relay: 'peer-left', id });
      await waitFor(() => farewells.length === k, 2000, 'the farewells');
    };
    return { host, got, seen, page, forge, close: () => raw.close() };
  }
  const name = () => null;

  it('(a, b, c) a learner remote, a pump tablet, a defibrillator window, the ventilator and the instructor phone named in farewells stay signed in, held and applied as before', async () => {
    const x = room();
    const lr = x.page('lr.1', 'learner');
    lr.hello({ show: 'learner', device: 'remote0001', pin: LEARNER_PIN });
    const pump = x.page('pump.1', 'pump');
    pump.hello({ device: 'pumptab0001', pin: LEARNER_PIN });
    const defib = x.page('defib.1', 'defib');
    defib.hello({ show: 'defib', device: 'bed2defib01', pin: LEARNER_PIN });
    const vent = x.page('vent.1', 'ventilator');
    vent.hello({ pin: INSTRUCTOR_PIN });
    const phone = x.page('ip.1', 'instructor');
    phone.hello({ pin: INSTRUCTOR_PIN });
    await Promise.all([lr.granted(), pump.granted(), vent.granted(), phone.granted(), defib.welcomed()]);
    expect([x.host.learnerRemotes(), x.host.pumpTablets(), x.seen.instructors, x.seen.ventilator]).toEqual([1, 1, 1, 'vent.1']);

    // each page's command, once before the farewells and once after: the same answer, the same filing
    const act = async () => {
      const acks = [
        await lr.send({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } }),
        await pump.send({ type: 'pump', action: 'load', ch: 1, syringe: { stock: 'propofol-10mg-ml-50ml' } }),
        await defib.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } }),
      ];
      const { issuedBy, by, event } = x.got.at(-1) as unknown as Record<string, unknown>;
      const filed = { issuedBy, by, event };
      acks.push(await phone.send({ type: 'setRhythm', rhythm: 'sinus', when: 'now' }));
      const k = x.seen.vent.length;
      vent.vent();
      await waitFor(() => x.seen.vent.length === k + 1, 2000, "the ventilator's link message");
      return { accepted: acks.map((a) => a.accepted), filed };
    };
    const before = await act();
    expect(before.accepted).toEqual([true, true, true, true]);
    expect(before.filed).toEqual({ issuedBy: 'learner', by: 'bed2defib01', event: { kind: 'defib', action: 'charge' } });
    await pump.send({ type: 'pump', action: 'unload', ch: 1 });

    await x.forge(['lr.1', 'pump.1', 'defib.1', 'vent.1', 'ip.1']);

    expect([x.host.learnerRemotes(), x.host.pumpTablets(), x.seen.instructors, x.seen.ventilator]).toEqual([1, 1, 1, 'vent.1']);
    expect(await act()).toEqual(before);
    expect(x.seen.vent).toEqual(['vent.1', 'vent.1']);
    expect([x.seen.instructors, x.seen.ventilator]).toEqual([1, 'vent.1']);
    x.close();
  });

  it("(d) a depth window named in a forged farewell while still open: its next command is treated as before; it counts again from its next hello", async () => {
    const x = room();
    const win = x.page('view.d', 'viewer');
    win.hello({ show: 'depth', device: 'deptwin0001' });
    await win.welcomed();
    const before = await win.send({ type: 'note', kind: 'marker', text: 'x' });
    expect(x.host.depthRefusal(name)).toBe(ROOM_REFUSALS.depth([ROOM_REFUSALS.here]));

    await x.forge(['view.d']);

    expect(x.host.depthRefusal(name)).toBeNull(); // until its next hello, the depth device can be switched off under it
    const after = await win.send({ type: 'note', kind: 'marker', text: 'x' });
    expect([after.accepted, after.reason]).toEqual([before.accepted, before.reason]);
    expect(before.reason).toBe('a viewer cannot command');
    win.hello({ show: 'depth', device: 'deptwin0001' }); // a resync says it again
    await win.welcomed(2);
    expect(x.host.depthRefusal(name)).toBe(ROOM_REFUSALS.depth([ROOM_REFUSALS.here]));
    x.close();
  });

  it('(e) the depth window really closes: the refusal lifts', async () => {
    const x = room();
    const win = x.page('view.e', 'viewer');
    win.hello({ show: 'depth' });
    await win.welcomed();
    expect(x.host.depthRefusal(name)).not.toBeNull();
    win.t.close();
    await waitFor(() => x.host.depthRefusal(name) === null, 2000, 'the closed window to stop counting');
    x.close();
  });
});
