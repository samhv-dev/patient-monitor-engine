// Plan room-and-instruments.md R5d: the host applies a `defib` peer's Charge and Shock through the same path as the
// instructor's press (one `applyEvent` into the engine, the engine's own validation, defib.ts validateDefib), with the
// room's energy (no `energyJ`), and files it as the learner's (`issuedBy: 'learner'`, the device key of its hello as
// `by`), as P3 files an instructor phone's as `remote`. Every other shape is refused HERE too, with no relay in between
// (an in-process transport stands for the relay: nothing filters on the way).
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type DeviceEvent } from '@pme/engine-core';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, LEARNER_ISSUED_BY, type AppliedResolution, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'LDF234';
const KEY = 'bed2defib01';
type Engine = ReturnType<typeof createEngine>;
const target = (e: Engine): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
const hosts: HostSession[] = [];
afterEach(() => {
  for (const h of hosts.splice(0)) h.close();
});
type Ack = Extract<WireMessage, { kind: 'ack' }>;
type Status = NonNullable<Extract<DeviceEvent, { type: 'deviceStatus' }>['defib']>;

/** A host on its own engine, one transport (no relay: nothing filters), and the defibrillator's last status. */
function setup(seed = 7) {
  const engine = createEngine({ seed });
  const host = new HostSession({ session: S, target: target(engine), stateIntervalMs: 0 });
  hosts.push(host);
  const hub = createInProcessHub();
  host.addTransport(hub.connect());
  const wire = hub.connect();
  const got = collect(wire);
  let defib: Status | null = null;
  engine.on((e) => void (e.type === 'deviceStatus' && e.defib && (defib = e.defib)));
  return { engine, host, wire, got, defib: () => defib };
}
/** A peer on `t`: its hello (role, device key) and its commands, stamped under one id as a real page's are. */
const peer = (t: ManagedTransport, from: string, role: 'defib' | 'viewer' | 'controller', device?: string) => {
  const st = createStamper(S, from);
  let n = 0;
  return {
    hello: () => t.send(st({ kind: 'hello', role, ...(device ? { show: 'defib' as const, device } : {}) })),
    command: (body: Record<string, unknown>, id = `${from}-${++n}`) => {
      t.send(st({ kind: 'command', body: { id, issuedBy: from, ...body } as never }));
      return id;
    },
  };
};
const ackOf = (got: WireMessage[], id: string) => got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id);
const applied = (got: WireMessage[], id: string) =>
  got.flatMap((m) => (m.kind === 'event' ? m.body : [])).find((e) => e.type === 'commandApplied' && e.commandId === id) as { resolved: AppliedResolution } | undefined;
const charge = { type: 'applyEvent', event: { kind: 'defib', action: 'charge' } };
const shock = { type: 'applyEvent', event: { kind: 'defib', action: 'shock' } };
const vf = { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' };
/** Runs the engine `s` seconds (50 ticks a second). */
const run = (e: Engine, s: number) => e.step(Math.round(s * 50));

async function press(x: ReturnType<typeof setup>, p: ReturnType<typeof peer>, body: Record<string, unknown>): Promise<Ack> {
  const id = p.command(body);
  await waitFor(() => ackOf(x.got, id) !== undefined);
  return ackOf(x.got, id) as Ack;
}

describe("R5d: a learner's Charge and Shock land as the instructor's would", () => {
  it('the same applyEvent path, the room\'s energy (no energyJ), the same outcome table: twin engines end identical', async () => {
    // One host takes the presses from the defibrillator window, its twin from the instructor's panel (a controller)
    const a = setup();
    const b = setup();
    const win = peer(a.wire, 'defib-win', 'defib', KEY);
    const panel = peer(b.wire, 'panel', 'controller');
    win.hello();
    panel.hello();
    const vfA = peer(a.wire, 'panel', 'controller');
    vfA.hello();
    for (const [x, p] of [[a, vfA], [b, panel]] as const) {
      expect((await press(x, p, vf)).accepted).toBe(true);
      run(x.engine, 2);
    }
    expect((await press(a, win, charge)).accepted).toBe(true);
    expect((await press(b, panel, charge)).accepted).toBe(true);
    run(a.engine, 1);
    run(b.engine, 1);
    expect(a.defib()?.state).toBe('charging');
    expect(a.defib()?.energyJ).toBe(b.defib()?.energyJ); // the room's energy: the device's own, set by nobody's press
    run(a.engine, 10); // the charge time (defib.ts chargeTimeS) is past at any energy up to 285 J (7 s / 200 J)
    run(b.engine, 10);
    expect(a.defib()?.state).toBe('ready');
    expect((await press(a, win, shock)).accepted).toBe(true);
    expect((await press(b, panel, shock)).accepted).toBe(true);
    run(a.engine, 3);
    run(b.engine, 3);
    expect(a.defib()?.shocks).toBe(1);
    // the shock's outcome is drawn from the same table with the same seed: the two patients are the same patient
    expect(a.defib()?.lastShock).toEqual(b.defib()?.lastShock);
    const snapA = a.engine.snapshot() as unknown as { tick: number };
    const snapB = b.engine.snapshot() as unknown as { tick: number };
    expect(snapA.tick).toBe(snapB.tick);
    expect(JSON.stringify(a.engine.snapshot())).toBe(JSON.stringify(b.engine.snapshot()));
  });

  it('the applied command is the learner\'s: issuedBy overwritten, the device key of its hello as `by`, no energyJ added', async () => {
    const x = setup();
    const win = peer(x.wire, 'defib-win', 'defib', KEY);
    win.hello();
    const id = win.command({ ...charge }, 'c-1');
    await waitFor(() => applied(x.got, id) !== undefined);
    const c = applied(x.got, id)?.resolved.command as unknown as Record<string, unknown>;
    expect(c.issuedBy).toBe(LEARNER_ISSUED_BY);
    expect(c.by).toBe(KEY);
    expect(c.event).toEqual({ kind: 'defib', action: 'charge' });
  });

  it("a shock without a charge comes back refused with the device's reason (defib.ts), and nothing reached the patient", async () => {
    const x = setup();
    const win = peer(x.wire, 'defib-win', 'defib', KEY);
    win.hello();
    const ack = await press(x, win, shock);
    expect(ack).toMatchObject({ accepted: false, reason: 'defibrillator is not charged' });
    run(x.engine, 1);
    expect(x.defib()?.shocks ?? 0).toBe(0);
  });
});

describe("R5d: a defib peer's every other shape is refused at the HOST, with no relay in between", () => {
  const refusals: Array<[string, Record<string, unknown>]> = [
    ['charge with energyJ', { type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 360 } }],
    ['shock with atTick', { ...shock, atTick: 99 }],
    ['shock with outcome', { type: 'applyEvent', event: { kind: 'defib', action: 'shock', outcome: 'sinus' } }],
    ['a forged `by`', { ...charge, by: 'someoneelse1' }],
    ['selectEnergy', { type: 'applyEvent', event: { kind: 'defib', action: 'selectEnergy', energyJ: 200 } }],
    ['preselect', { type: 'applyEvent', event: { kind: 'defib', action: 'preselect', outcome: 'sinus' } }],
    ['disarm', { type: 'applyEvent', event: { kind: 'defib', action: 'disarm' } }],
    ['syncOn', { type: 'applyEvent', event: { kind: 'defib', action: 'syncOn' } }],
    ['pacer', { type: 'applyEvent', event: { kind: 'pacer', mode: 'fixed', ratePpm: 70, mA: 80 } }],
    ['drug', { type: 'applyEvent', event: { kind: 'drug', drugId: 'adrenaline', dose: 1, unit: 'mg', route: 'iv' } }],
    ['cpr', { type: 'applyEvent', event: { kind: 'cpr', active: true } }],
    ['time pause', { type: 'time', action: 'pause' }],
    ['time jump', { type: 'time', action: 'jump', value: 60 }],
    ['scenario', { type: 'scenario', action: 'goto', target: 'x' }],
    ['device', { type: 'device', device: 'defib', action: 'model', model: 'generic' }],
    ['setTarget', { type: 'setTarget', variable: 'hr', value: 30 }],
    ['setRhythm', vf],
    ['pin', { type: 'pin', variable: 'hr', value: 30 }],
    ['note', { type: 'note', kind: 'note', text: 'hello' }],
  ];
  it.each(refusals)('%s is refused with the reason, and nothing is applied', async (_name, body) => {
    const x = setup();
    const win = peer(x.wire, 'defib-win', 'defib', KEY);
    win.hello();
    await waitFor(() => x.got.some((m) => m.kind === 'snapshot'));
    const before = JSON.stringify(x.engine.snapshot());
    const id = win.command(body);
    await waitFor(() => ackOf(x.got, id) !== undefined);
    expect(ackOf(x.got, id)?.accepted).toBe(false);
    expect(ackOf(x.got, id)?.reason).toMatch(/^The (defibrillator window sends Charge and Shock only|room's defibrillator sets the rest)/);
    await Promise.resolve();
    expect(applied(x.got, id)).toBeUndefined();
    expect(JSON.stringify(x.engine.snapshot())).toBe(before);
  });

  it('a viewer still cannot command, whatever it sends (a Charge included)', async () => {
    const x = setup();
    const phone = peer(x.wire, 'phone-1', 'viewer');
    phone.hello();
    const ack = await press(x, phone, charge);
    expect(ack).toMatchObject({ accepted: false, reason: 'a viewer cannot command' });
  });
});
