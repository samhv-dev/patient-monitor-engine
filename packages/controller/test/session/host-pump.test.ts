// Plan pump-rack-tci.md C2 (§4 D2, D7, D9, D12; §7, §8; PQ3 = A, PQ8 = A) and finding N99. The host grants a `pump`
// socket on the LEARNER PIN, checks every pump command again (no relay in between: an in-process transport stands for
// it), resolves what a channel loads (a preparation of the room's remotes, or a stock syringe) to its TRUE contents,
// checks each shape against the channel's kind (Room setup's rack) and the reference device's profile (the shipped
// pump-devices/: every range and device word on a refusal is the profile's), resolves the bolus and purge rates onto
// the event, and applies the engine's `pump` event through command() with `issuedBy: 'pump'`, `by` = the device key and
// the value it replaced. A remote's `infusion set` and the Drug sheet change a drug that runs on one channel on that
// channel and are refused on two (D9). A mismatch of contents and programme reaches the instructor at once and the pump
// only when the instructor shows the notice (PQ8 = A). Each line of the plan's "Tests first" list is its own case.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { HostSession, PUMP_REASONS, UNKNOWN_ROLE, type HostSessionOptions, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, LEARNER_ISSUED_BY, PUMP_ISSUED_BY, type AppliedResolution, type ManagedTransport, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { loadFormulary } from '../../src/formulary/load.ts';
import type { Formulary, FormularyFiles } from '../../src/formulary/types.ts';
import { loadPumpDevices, type PumpDevices } from '../../src/pump-devices.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'PMC234';
const LEARNER_PIN = '582913';
const INSTRUCTOR_PIN = '4729';
const PUMP_KEY = 'pumptab0001';
const REMOTE_KEY = 'remote0001';

/** The shipped layers, read as their CI source checks read them (formulary/, pump-devices/). */
const here = (p: string) => resolve(fileURLToPath(new URL(p, import.meta.url)));
const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const readFolder = (dir: string, skip: string[] = []): Record<string, unknown> =>
  Object.fromEntries(walk(dir).filter((f) => f.endsWith('.json') && !skip.includes(relative(dir, f))).map((f) => [relative(dir, f).split('\\').join('/'), JSON.parse(readFileSync(f, 'utf8')) as unknown]));
const shipped = loadFormulary(readFolder(here('../../formulary')) as FormularyFiles);
if (!shipped.ok) throw new Error('the shipped formulary breaks §5');
const SHIPPED: Formulary = shipped.formulary;
const dev = loadPumpDevices(readFolder(here('../../pump-devices'), ['schema.json']));
if (!dev.ok) throw new Error('the shipped pump device profiles break their source rules');
const DEVICES: PumpDevices = dev.devices;

/** A target on a clock the test moves (`at(s)`); it accepts every command and keeps what reached it. */
function fakeTarget() {
  let tick = 0;
  const got: Command[] = [];
  const fns: Array<(e: EngineEvent) => void> = [];
  const t: HostTarget = {
    dispatch: (c): DispatchResult => (got.push(c), { accepted: true, tick: Math.max(tick, c.atTick ?? 0) }),
    snapshot: () => ({ schema: 'x', tick } as never),
    restore: () => undefined,
    on: (fn) => (fns.push(fn), () => undefined),
    now: () => ({ tick, simT: tick * 0.02 }),
    time: () => undefined,
  };
  return { t, got, at: (s: number) => void (tick = Math.round(s / 0.02)), emit: (e: EngineEvent) => fns.forEach((f) => f(e)) };
}

const hosts: HostSession[] = [];
afterEach(() => {
  for (const h of hosts.splice(0)) h.close();
  vi.restoreAllMocks();
});
type Ack = Extract<WireMessage, { kind: 'ack' }>;
type Grant = Extract<WireMessage, { kind: 'grant' }>;
type Prep = Extract<WireEvent, { type: 'prep' }>;

/** A host with both PINs, a rack of `rack`, the shipped profiles and formulary, one transport for the relay and the laptop's panel. */
function setup(o: Partial<HostSessionOptions> & { rack?: Array<'syringe' | 'drip'> } = {}) {
  const tg = fakeTarget();
  const { rack = ['syringe', 'syringe', 'drip', 'syringe'], ...rest } = o;
  const host = new HostSession({
    session: S, target: tg.t, stateIntervalMs: 0, instructorPin: () => INSTRUCTOR_PIN, learnerPin: () => LEARNER_PIN,
    formulary: () => SHIPPED, pumpRack: () => rack, pumpDevices: () => DEVICES, ...rest,
  });
  hosts.push(host);
  const hub = createInProcessHub();
  host.addTransport(hub.connect());
  const relay = hub.connect();
  const got = collect(relay);
  const panelHub = createInProcessHub();
  host.addTransport(panelHub.connect());
  const panelT = panelHub.connect();
  const panelGot = collect(panelT);
  const laptop = peer(panelT, 'panel-1', 'controller', 'instructor');
  laptop.hello();
  return { host, tg, relay, got, laptop, panelGot };
}
function peer(t: ManagedTransport, from: string, role: string, issuedBy: string = from) {
  const st = createStamper(S, from);
  let n = 0;
  return {
    from,
    hello: (extra: Record<string, unknown> = {}) => t.send(st({ kind: 'hello', role, ...extra } as never)),
    command: (body: Record<string, unknown>, id = `${from}-${++n}`) => {
      t.send(st({ kind: 'command', body: { id, issuedBy, ...body } as never }));
      return id;
    },
  };
}
const grants = (got: WireMessage[], to: string) => got.filter((m): m is Grant => m.kind === 'grant' && m.to === to);
const ackOf = (got: WireMessage[], id: string) => got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id);
const events = (got: WireMessage[]) => got.flatMap((m) => (m.kind === 'event' ? m.body : []));
const applied = (got: WireMessage[], id: string) =>
  (events(got).find((e) => e.type === 'commandApplied' && e.commandId === id) as { resolved: AppliedResolution } | undefined)?.resolved.command as Record<string, unknown> | undefined;
const prepsTo = (got: WireMessage[], to: string) => events(got).filter((e): e is Prep => e.type === 'prep' && e.to === to);
async function ack(got: WireMessage[], id: string): Promise<Ack> {
  await waitFor(() => ackOf(got, id) !== undefined, 2000, `ack ${id}`);
  return ackOf(got, id) as Ack;
}
/** The pump tablet on the relay's transport, signed in with the learner PIN and its device key. */
async function pumpIn(x: ReturnType<typeof setup>, from = 'pump.1', device = PUMP_KEY) {
  const p = peer(x.relay, from, 'pump', 'pump-page');
  p.hello({ device, pin: LEARNER_PIN });
  await waitFor(() => grants(x.got, from).length > 0);
  expect(grants(x.got, from).at(-1)?.granted).toBe(true);
  return { ...p, send: async (body: Record<string, unknown>) => ack(x.got, p.command({ type: 'pump', ...body })) };
}
async function remoteIn(x: ReturnType<typeof setup>, from = 'lr.1', device = REMOTE_KEY) {
  const p = peer(x.relay, from, 'learner', 'learner-page');
  p.hello({ show: 'learner', device, pin: LEARNER_PIN });
  await waitFor(() => grants(x.got, from).length > 0);
  return { ...p, send: async (body: Record<string, unknown>) => ack(x.got, p.command(body)) };
}
const pumpEvents = (got: Command[]) => got.filter((c) => c.type === 'applyEvent' && (c as { event: { kind: string } }).event.kind === 'pump') as unknown as Array<Record<string, unknown> & { event: Record<string, unknown> }>;
/** A channel loaded with the shipped stock propofol 10 mg/mL, 50 mL (stock-syringes.json), programmed as `prog`, at a rate. */
async function propofolChannel(p: Awaited<ReturnType<typeof pumpIn>>, ch = 1, prog: Record<string, unknown> = { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } }) {
  expect((await p.send({ action: 'load', ch, syringe: { stock: 'propofol-10mg-ml-50ml' } })).accepted).toBe(true);
  expect((await p.send({ action: 'program', ch, ...prog })).accepted).toBe(true);
}

describe('N99: a command from a role the host does not know is refused and logged; each known role only through its own branch', () => {
  it('a pump hello the host has not granted (no rack on this computer): its bolus is refused, never applied as a controller\'s', async () => {
    const x = setup({ pumpRack: () => null });
    const p = peer(x.relay, 'pump.1', 'pump');
    p.hello({ device: PUMP_KEY, pin: LEARNER_PIN });
    await waitFor(() => grants(x.got, 'pump.1').length > 0);
    expect(grants(x.got, 'pump.1').at(-1)).toMatchObject({ granted: false, reason: PUMP_REASONS.noPump });
    const id = p.command({ type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' } });
    expect(await ack(x.got, id)).toMatchObject({ accepted: false });
    expect(x.tg.got).toEqual([]);
  });

  it('a role the guard admits but no branch of the host serves (a second "host") is refused with UNKNOWN_ROLE and logged', async () => {
    // (a hello naming a role no build knows never arrives: the guard drops it, guard.ts ROLES)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const x = setup();
    const p = peer(x.relay, 'host.9', 'host');
    p.hello();
    const id = p.command({ type: 'setTarget', variable: 'hr', value: 140 });
    expect(await ack(x.got, id)).toMatchObject({ accepted: false, reason: UNKNOWN_ROLE });
    expect(x.tg.got).toEqual([]);
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([expect.stringMatching(/host\.9, role host, refused/)]);
  });

  it('each known role takes its own branch: controller as sent; instructor filed remote; learner and defib filed learner; pump filed pump; viewer and ventilator refused', async () => {
    const x = setup({ onVent: () => undefined });
    const say = (role: string, from: string, extra: Record<string, unknown> = {}) => {
      const p = peer(x.relay, from, role, `${role}-page`);
      p.hello(extra);
      return p;
    };
    const hr = { type: 'setTarget', variable: 'hr', value: 90 };
    const ctl = x.laptop.command(hr);
    expect(await ack(x.panelGot, ctl)).toMatchObject({ accepted: true });
    await waitFor(() => applied(x.panelGot, ctl) !== undefined);
    expect(applied(x.panelGot, ctl)).toMatchObject({ issuedBy: 'instructor' });
    const inst = say('instructor', 'in.1', { pin: INSTRUCTOR_PIN });
    await waitFor(() => grants(x.got, 'in.1').some((g) => g.granted));
    const i = inst.command(hr);
    expect(await ack(x.got, i)).toMatchObject({ accepted: true });
    expect(applied(x.got, i)).toMatchObject({ issuedBy: 'remote' });
    const lr = await remoteIn(x);
    expect((await lr.send(hr)).accepted).toBe(false); // learnerMay: not a learner's shape
    const lab = lr.command({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } });
    expect(await ack(x.got, lab)).toMatchObject({ accepted: true });
    expect(applied(x.got, lab)).toMatchObject({ issuedBy: LEARNER_ISSUED_BY, by: REMOTE_KEY });
    const df = say('defib', 'df.1', { show: 'defib', device: 'defibwin01' });
    const d = df.command({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } });
    expect(await ack(x.got, d)).toMatchObject({ accepted: true });
    expect(applied(x.got, d)).toMatchObject({ issuedBy: LEARNER_ISSUED_BY, by: 'defibwin01' });
    const p = await pumpIn(x);
    expect(await p.send({ action: 'load', ch: 1, syringe: { stock: 'propofol-10mg-ml-50ml' } })).toMatchObject({ accepted: true });
    const v = say('viewer', 'v.1').command(hr);
    expect(await ack(x.got, v)).toMatchObject({ accepted: false, reason: 'a viewer cannot command' });
    const vent = say('ventilator', 've.1', { pin: INSTRUCTOR_PIN }).command(hr);
    expect((await ack(x.got, vent)).accepted).toBe(false);
    // what reached the engine: the controller's, the instructor's, the defibrillator's and the pump's, each as its branch filed it
    expect(x.tg.got.map((c) => c.issuedBy)).toEqual(['instructor', 'remote', LEARNER_ISSUED_BY, LEARNER_ISSUED_BY, PUMP_ISSUED_BY]);
  });
});

describe('C2: each D2 shape lands as one `applyEvent pump`, filed by the pump, with the value it replaced', () => {
  it('a syringe channel: load (stock), program, rate, start, rate again, bolus, purge, stop, TCI, unload', async () => {
    const x = setup();
    const p = await pumpIn(x);
    const sent: string[] = [];
    const go = async (body: Record<string, unknown>) => {
      const id = p.command({ type: 'pump', ...body });
      sent.push(id);
      expect(await ack(x.got, id), JSON.stringify(body)).toMatchObject({ accepted: true });
      return applied(x.panelGot, id) as Record<string, unknown>;
    };
    expect(await go({ action: 'load', ch: 1, syringe: { stock: 'propofol-10mg-ml-50ml' } })).toMatchObject({
      type: 'applyEvent', issuedBy: PUMP_ISSUED_BY, by: PUMP_KEY,
      event: { kind: 'pump', action: 'load', ch: 1, channel: 'syringe', contents: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 }, volumeMl: 50 }, syringeMl: 50 },
      pump: { ch: 1, origin: { stock: 'propofol-10mg-ml-50ml' } },
    });
    expect(await go({ action: 'program', ch: 1, drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } })).toMatchObject({ event: { action: 'program', drugId: 'propofol' } });
    expect((await go({ action: 'rate', ch: 1, rate: 20, unit: 'mL/h' })).pump).toMatchObject({ ch: 1 });
    expect((await go({ action: 'start', ch: 1 })).pump).toMatchObject({ infusion: { rate: 20, unit: 'mL/h' } });
    // the second rate names the first and who had set it (this tablet's key)
    expect((await go({ action: 'rate', ch: 1, rate: 30, unit: 'mL/h' })).pump).toMatchObject({ replaced: [{ what: 'rate', rate: 20, unit: 'mL/h', by: PUMP_KEY }], infusion: { rate: 30 } });
    // bolus and purge at the SP-500's rapid rate for a 50 mL syringe: approx. 800 mL/h (sp-500.json, SP-10); 2 mL = 20 mg in 9 s
    const bolus = await go({ action: 'bolus', ch: 1, volumeMl: 2 });
    expect(bolus).toMatchObject({ event: { action: 'bolus', volumeMl: 2, rateMlH: 800 }, pump: { gives: 'propofol', bolus: { volumeMl: 2, dose: 20, unit: 'mg' } } });
    expect((bolus.pump as { bolus: { seconds: number } }).bolus.seconds).toBeCloseTo(9, 9);
    expect((await go({ action: 'purge', ch: 1, volumeMl: 1 })).event).toMatchObject({ action: 'purge', volumeMl: 1, rateMlH: 800 });
    expect((await go({ action: 'stop', ch: 1 })).pump).toMatchObject({ infusion: { rate: 0 } });
    const patient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };
    expect(await go({ action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 3, patient: { ...patient, opioids: true } })).toMatchObject({
      event: { action: 'tci', setId: 'eleveld', mode: 'effect', target: 3, patient, opioids: true },
    });
    expect(applied(x.panelGot, sent.at(-1) as string)?.event).not.toHaveProperty('maxRateMlH'); // the SP5's ceiling is a gap: the engine's holds
    expect((await go({ action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 4, patient: { ...patient, opioids: true } })).pump).toMatchObject({ replaced: [{ what: 'tci', target: 3, by: PUMP_KEY }] });
    await go({ action: 'unload', ch: 1 });
    // one engine event per press, each the pump's
    expect(pumpEvents(x.tg.got)).toHaveLength(sent.length);
    expect(pumpEvents(x.tg.got).every((c) => c.issuedBy === PUMP_ISSUED_BY && c.by === PUMP_KEY)).toBe(true);
  });

  it('a drip channel: a preparation in a bag, programmed with its IV set, a drops/min rate and a volume limit, purged at the OT-701\'s rate', async () => {
    const x = setup();
    x.tg.at(10);
    const lr = await remoteIn(x);
    expect((await lr.send({ type: 'prep', action: 'stage', prep: { id: 'b0000001', components: [{ productId: 'fentanyl-50mcg-ml', amount: 10, unit: 'mL' }], diluent: { id: 'saline', volumeMl: 40 }, container: 'bag-pvc' } })).accepted).toBe(true);
    x.tg.at(600);
    const p = await pumpIn(x);
    const load = p.command({ type: 'pump', action: 'load', ch: 3, bag: { prep: { device: REMOTE_KEY, id: 'b0000001' } } });
    expect(await ack(x.got, load)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, load)).toMatchObject({ event: { action: 'load', ch: 3, channel: 'drip', contents: { drugId: 'fentanyl', volumeMl: 50 } }, pump: { origin: { prep: { device: REMOTE_KEY, id: 'b0000001' } } } });
    expect(applied(x.panelGot, load)?.event).not.toHaveProperty('syringeMl');
    // 500 mcg in 50 mL = 10 mcg/mL (× the fraction intact at the load, the formulary's own)
    expect(((applied(x.panelGot, load)?.event as { contents: { concentration: { amount: number } } }).contents.concentration.amount)).toBeCloseTo(10, 1);
    expect((await p.send({ action: 'program', ch: 3, drugId: 'fentanyl', concentration: { amount: 10, unit: 'mcg', perMl: 1 }, set: 20 })).accepted).toBe(true);
    expect((await p.send({ action: 'rate', ch: 3, rate: 60, unit: 'drops/min', limitMl: 25 })).accepted).toBe(true);
    const purge = p.command({ type: 'pump', action: 'purge', ch: 3, volumeMl: 2 });
    expect(await ack(x.got, purge)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, purge)?.event).toMatchObject({ action: 'purge', rateMlH: 450 }); // OT-14: "more than 450 mL/h", its stated floor
    // the preparation left its maker's tray (it is in the pump now): the remote is told, and the bench cannot give it again
    expect(prepsTo(x.got, 'lr.1').map((e) => (e.body as { news: string }).news)).toContain('loaded');
    expect((await lr.send({ type: 'prep', action: 'deliver', prepId: 'b0000001', volumeMl: 1, route: 'iv' })).accepted).toBe(false);
  });

  it('on the real engine, every syringe shape the host builds is accepted (the device numbers it resolves are the engine\'s fields)', async () => {
    const engine = createEngine({ seed: 7 });
    const t: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => undefined };
    const x = setup({ target: t });
    const p = await pumpIn(x);
    const patient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };
    for (const body of [
      { action: 'load', ch: 1, syringe: { stock: 'propofol-10mg-ml-50ml' } },
      { action: 'program', ch: 1, drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
      { action: 'rate', ch: 1, rate: 6, unit: 'mg/kg/h', weightKg: 70 },
      { action: 'start', ch: 1 },
      { action: 'bolus', ch: 1, dose: { amount: 20, unit: 'mg' } },
      { action: 'stop', ch: 1 },
      { action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 3, patient },
      { action: 'tci', ch: 1, setId: 'eleveld', mode: 'effect', target: 0, patient },
      { action: 'purge', ch: 1, volumeMl: 0.5 },
      { action: 'unload', ch: 1 },
    ]) {
      // the engine applies a command on its next tick: a press a few ticks after the last, as a hand presses (the engine
      // validates each against the channel as applied)
      expect(await p.send(body), JSON.stringify(body)).toMatchObject({ accepted: true });
      engine.advanceTo(engine.now().simT + 0.2);
    }
  });
});

describe('C2: the device is not trusted', () => {
  it('a forged syringe is refused: a preparation no remote made, another remote\'s id, a stock item not listed, a concentration or a `pump` field of its own', async () => {
    const x = setup();
    const p = await pumpIn(x);
    expect(await p.send({ action: 'load', ch: 1, syringe: { prep: { device: REMOTE_KEY, id: 'nope0000' } } })).toMatchObject({ accepted: false, reason: 'no preparation nope0000 of that remote' });
    expect((await p.send({ action: 'load', ch: 1, syringe: { stock: 'remifentanil-50mcg-ml' } })).reason).toMatch(/^no stock syringe "remifentanil-50mcg-ml"/);
    expect((await p.send({ action: 'load', ch: 1, syringe: { stock: 'propofol-10mg-ml-50ml' }, concentration: { amount: 20, unit: 'mg', perMl: 1 } })).reason).toMatch(/concentration is not the pump's/);
    expect((await p.send({ action: 'load', ch: 1, syringe: { stock: 'propofol-10mg-ml-50ml' }, pump: { ch: 1, gives: 'x' } })).reason).toMatch(/pump is not the pump's/);
    expect((await p.send({ action: 'bolus', ch: 1, volumeMl: 2, by: 'someoneelse1' })).reason).toMatch(/by is not the pump's/);
    expect(x.tg.got).toEqual([]);
  });

  it('the rack\'s kinds and size are the room\'s: a bag on a syringe channel, a syringe on a drip one, a ninth channel', async () => {
    const x = setup();
    const p = await pumpIn(x);
    expect((await p.send({ action: 'load', ch: 3, syringe: { stock: 'propofol-10mg-ml-50ml' } })).reason).toBe('channel 3 is a drip channel (JMS OT-701): it takes a bag');
    expect((await p.send({ action: 'load', ch: 1, bag: { stock: 'x' } })).reason).toBe('channel 1 is a syringe channel (JMS SP-500): it takes a syringe');
    expect((await p.send({ action: 'rate', ch: 5, rate: 5, unit: 'mL/h' })).reason).toBe('this rack has channels 1–4');
  });

  it('a TCI or a bolus on a drip channel, and an SP-500 rate outside its range or step, are refused with the profile\'s words', async () => {
    const x = setup();
    const p = await pumpIn(x);
    const patient = { ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' };
    expect((await p.send({ action: 'tci', ch: 3, setId: 'eleveld', mode: 'effect', target: 3, patient })).reason).toBe('the JMS OT-701 has no TCI');
    expect((await p.send({ action: 'bolus', ch: 3, volumeMl: 2 })).reason).toBe('the JMS OT-701 has no bolus');
    await propofolChannel(p);
    // a 50 mL syringe: 0.1–300 mL/h in 0.1 mL/h steps (sp-500.json SP-05, SP-06)
    expect((await p.send({ action: 'rate', ch: 1, rate: 301, unit: 'mL/h' })).reason).toBe('301 mL/h: the JMS SP-500 runs 0.1–300 mL/h with a 50 mL syringe, in 0.1 mL/h steps');
    expect((await p.send({ action: 'rate', ch: 1, rate: 0.05, unit: 'mL/h' })).reason).toBe('0.05 mL/h: the JMS SP-500 runs 0.1–300 mL/h with a 50 mL syringe, in 0.1 mL/h steps');
    expect((await p.send({ action: 'rate', ch: 1, rate: 20.05, unit: 'mL/h' })).reason).toBe('20.05 mL/h: the JMS SP-500 runs 0.1–300 mL/h with a 50 mL syringe, in 0.1 mL/h steps');
    // a dose rate is converted with the PROGRAMMED concentration first: 50 mg/kg/h × 70 kg ÷ 10 mg/mL = 350 mL/h
    expect((await p.send({ action: 'rate', ch: 1, rate: 50, unit: 'mg/kg/h', weightKg: 70 })).reason).toBe('350 mL/h: the JMS SP-500 runs 0.1–300 mL/h with a 50 mL syringe, in 0.1 mL/h steps');
    expect((await p.send({ action: 'rate', ch: 1, rate: 300, unit: 'mL/h' })).accepted).toBe(true);
    // a 20 mL syringe: the same 0.1–300 mL/h (SP-05); the drip channel's own range is the OT-701's per set (OT-06)
    expect((await p.send({ action: 'rate', ch: 1, rate: 5, unit: 'mL/h', limitMl: 100 })).reason).toBe('a volume limit belongs to a drip channel, not the JMS SP-500');
    const lr = await remoteIn(x);
    expect((await lr.send({ type: 'prep', action: 'stage', prep: { id: 'b0000002', components: [{ productId: 'fentanyl-50mcg-ml', amount: 10, unit: 'mL' }], diluent: { id: 'saline', volumeMl: 40 }, container: 'bag-pvc' } })).accepted).toBe(true);
    x.tg.at(600);
    expect((await p.send({ action: 'rate', ch: 3, rate: 5, unit: 'mL/h' })).accepted).toBe(false); // nothing loaded on it
    expect((await p.send({ action: 'load', ch: 3, bag: { prep: { device: REMOTE_KEY, id: 'b0000002' } } })).accepted).toBe(true);
    expect((await p.send({ action: 'rate', ch: 3, rate: 5, unit: 'mL/h' })).reason).toBe('program the IV set first: the JMS OT-701\'s rates are per set (15, 20 and 60 drops/mL)');
    expect((await p.send({ action: 'program', ch: 3, drugId: 'fentanyl', concentration: { amount: 10, unit: 'mcg', perMl: 1 }, set: 30 })).reason).toBe('the JMS OT-701 takes 15, 20 and 60 drops/mL sets');
    expect((await p.send({ action: 'program', ch: 3, drugId: 'fentanyl', concentration: { amount: 10, unit: 'mcg', perMl: 1 }, set: 20 })).accepted).toBe(true);
    expect((await p.send({ action: 'rate', ch: 3, rate: 451, unit: 'mL/h' })).reason).toBe('451 mL/h: the JMS OT-701 runs 1–450 mL/h with a 20 drops/mL set, in 1 mL/h steps');
    expect((await p.send({ action: 'rate', ch: 3, rate: 101, unit: 'drops/min' })).reason).toBe('101 drops/min: the JMS OT-701 runs 1–100 drops/min with a 20 drops/mL set');
    expect((await p.send({ action: 'rate', ch: 3, rate: 50, unit: 'mL/h', limitMl: 10000 })).reason).toBe('the JMS OT-701\'s volume limit is 1–9999 mL, or none');
  });

  it('a 10 mL syringe of fentanyl from a remote\'s preparation: the SP-500\'s 10 mL range (0.1–200 mL/h, SP-04) and rapid rate (approx. 200 mL/h, SP-07)', async () => {
    const x = setup();
    const lr = await remoteIn(x);
    expect((await lr.send({ type: 'prep', action: 'stage', prep: { id: 's0000001', components: [{ productId: 'fentanyl-50mcg-ml', amount: 10, unit: 'mL' }], container: 'syringe-pp' } })).accepted).toBe(true);
    x.tg.at(600);
    const p = await pumpIn(x);
    const load = p.command({ type: 'pump', action: 'load', ch: 2, syringe: { prep: { device: REMOTE_KEY, id: 's0000001' } } });
    expect(await ack(x.got, load)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, load)?.event).toMatchObject({ syringeMl: 10, contents: { drugId: 'fentanyl', volumeMl: 10 } });
    expect((await p.send({ action: 'program', ch: 2, drugId: 'fentanyl', concentration: { amount: 50, unit: 'mcg', perMl: 1 } })).accepted).toBe(true);
    expect((await p.send({ action: 'rate', ch: 2, rate: 201, unit: 'mL/h' })).reason).toBe('201 mL/h: the JMS SP-500 runs 0.1–200 mL/h with a 10 mL syringe, in 0.1 mL/h steps');
    const b = p.command({ type: 'pump', action: 'bolus', ch: 2, volumeMl: 1 });
    expect(await ack(x.got, b)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, b)?.event).toMatchObject({ rateMlH: 200 });
  });
});

describe('C2, D9: a remote and the Drug sheet change a drug on its one channel, never on two', () => {
  async function twoChannels() {
    const x = setup();
    const p = await pumpIn(x);
    await propofolChannel(p, 1);
    expect((await p.send({ action: 'rate', ch: 1, rate: 20, unit: 'mL/h' })).accepted).toBe(true);
    expect((await p.send({ action: 'start', ch: 1 })).accepted).toBe(true);
    return { x, p };
  }

  it('a remote\'s `infusion set` of a drug running on exactly one channel changes THAT channel, filed as the remote\'s, with the rate it replaced', async () => {
    const { x } = await twoChannels();
    const lr = await remoteIn(x);
    const id = lr.command({ type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: 25 });
    expect(await ack(x.got, id)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, id)).toMatchObject({
      type: 'applyEvent', issuedBy: LEARNER_ISSUED_BY, by: REMOTE_KEY,
      event: { kind: 'pump', action: 'rate', ch: 1, rate: 25, unit: 'mL/h' },
      pump: { ch: 1, replaced: [{ what: 'rate', rate: 20, unit: 'mL/h', by: PUMP_KEY }] },
    });
    // at 0 it stops that channel
    const stop = lr.command({ type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: 0 });
    expect(await ack(x.got, stop)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, stop)?.event).toMatchObject({ kind: 'pump', action: 'stop', ch: 1 });
  });

  it('on two channels it is refused, with the channels named, and nothing reaches the engine', async () => {
    const { x, p } = await twoChannels();
    await propofolChannel(p, 2);
    expect((await p.send({ action: 'rate', ch: 2, rate: 5, unit: 'mL/h' })).accepted).toBe(true);
    expect((await p.send({ action: 'start', ch: 2 })).accepted).toBe(true);
    const before = x.tg.got.length;
    const lr = await remoteIn(x);
    expect(await lr.send({ type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: 25 })).toMatchObject({ accepted: false, reason: 'running on pumps 1 and 2: change it on the pump' });
    const sheet = x.laptop.command({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' } });
    expect(await ack(x.panelGot, sheet)).toMatchObject({ accepted: false, reason: 'running on pumps 1 and 2: change it on the pump' });
    expect(x.tg.got.length).toBe(before);
  });

  it('the Drug sheet\'s infusion of a drug on one channel becomes that channel\'s rate (a dose rate, converted by the pump with its programme); a drug on no channel is unchanged', async () => {
    const { x } = await twoChannels();
    const sheet = x.laptop.command({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 6, unit: 'mg/kg/h' } });
    expect(await ack(x.panelGot, sheet)).toMatchObject({ accepted: false, reason: 'a per-kg dose rate needs weightKg, the weight typed into the pump' });
    const ml = x.laptop.command({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 30, unit: 'mL/h' } });
    expect(await ack(x.panelGot, ml)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, ml)).toMatchObject({ issuedBy: 'instructor', event: { kind: 'pump', action: 'rate', ch: 1, rate: 30 }, pump: { replaced: [{ what: 'rate', rate: 20, by: PUMP_KEY }] } });
    const other = x.laptop.command({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' } });
    expect(await ack(x.panelGot, other)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, other)?.event).toEqual({ kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' });
  });

  it('a channel stopped by the engine (End) no longer counts as running the drug', async () => {
    const { x } = await twoChannels();
    x.tg.emit({ type: 'pumpAlarm', t: 10, ch: 1, channel: 'syringe', alarm: 'end', programmed: 'propofol' } as never);
    const lr = await remoteIn(x);
    expect(await lr.send({ type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: 25 })).toMatchObject({ accepted: false, reason: 'no propofol infusion is running' });
  });
});

describe('C2, §8 and PQ8 = A: the mismatch finding reaches the instructor, and the pump only with the notice', () => {
  it('propofol 10 mg/mL programmed as phenylephrine: a finding to the instructor\'s screens at once; the pump hears of it when the instructor shows it', async () => {
    const x = setup();
    const p = await pumpIn(x);
    await propofolChannel(p, 2, { drugId: 'phenylephrine', concentration: { amount: 100, unit: 'mcg', perMl: 1 } });
    const host = x.host.peerId;
    await waitFor(() => prepsTo(x.got, host).length > 0);
    expect(prepsTo(x.got, host).map((e) => e.body)).toEqual([expect.objectContaining({
      news: 'pumpMismatch', ch: 2, kind: 'syringe', device: PUMP_KEY,
      contents: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } }, programmed: { drugId: 'phenylephrine', concentration: { amount: 100, unit: 'mcg', perMl: 1 } }, notice: null,
    })]);
    expect(prepsTo(x.got, 'pump.1').filter((e) => (e.body as { news: string }).news === 'mismatch')).toEqual([]);
    expect(x.host.showPumpNotice(2)).toBe(true);
    await waitFor(() => prepsTo(x.got, 'pump.1').some((e) => (e.body as { news: string }).news === 'mismatch'));
    expect(prepsTo(x.got, 'pump.1').find((e) => (e.body as { news: string }).news === 'mismatch')?.body).toEqual({ news: 'mismatch', ch: 2, words: 'syringe and programme differ' });
    expect(x.host.showPumpNotice(2)).toBe(false); // once
    expect(x.host.showPumpNotice(1)).toBe(false); // no finding there
    // a delivery made under it carries the mismatch for the record and the grade
    expect((await p.send({ action: 'rate', ch: 2, rate: 5, unit: 'mL/h' })).accepted).toBe(true);
    const start = p.command({ type: 'pump', action: 'start', ch: 2 });
    expect(await ack(x.got, start)).toMatchObject({ accepted: true });
    expect(applied(x.panelGot, start)).toMatchObject({ pump: { mismatch: true } });
  });

  it('a concentration that differs from the label (20 mg/mL programmed for a 10 mg/mL syringe) is a mismatch; the same strength in other units is not', async () => {
    const x = setup();
    const p = await pumpIn(x);
    await propofolChannel(p, 1, { drugId: 'propofol', concentration: { amount: 10000, unit: 'mcg', perMl: 1 } });
    await propofolChannel(p, 2, { drugId: 'propofol', concentration: { amount: 20, unit: 'mg', perMl: 1 } });
    await waitFor(() => prepsTo(x.got, x.host.peerId).length > 0);
    expect(prepsTo(x.got, x.host.peerId).map((e) => (e.body as { ch: number }).ch)).toEqual([2]);
  });

  it('a drip channel\'s notice says "bag and programme differ"; correcting the programme clears the finding for the instructor', async () => {
    const x = setup();
    const lr = await remoteIn(x);
    expect((await lr.send({ type: 'prep', action: 'stage', prep: { id: 'b0000003', components: [{ productId: 'fentanyl-50mcg-ml', amount: 10, unit: 'mL' }], diluent: { id: 'saline', volumeMl: 40 }, container: 'bag-pvc' } })).accepted).toBe(true);
    x.tg.at(600);
    const p = await pumpIn(x);
    expect((await p.send({ action: 'load', ch: 3, bag: { prep: { device: REMOTE_KEY, id: 'b0000003' } } })).accepted).toBe(true);
    expect((await p.send({ action: 'program', ch: 3, drugId: 'fentanyl', concentration: { amount: 50, unit: 'mcg', perMl: 1 }, set: 20 })).accepted).toBe(true);
    expect(x.host.showPumpNotice(3)).toBe(true);
    await waitFor(() => prepsTo(x.got, 'pump.1').some((e) => (e.body as { news: string }).news === 'mismatch'));
    expect(prepsTo(x.got, 'pump.1').find((e) => (e.body as { news: string }).news === 'mismatch')?.body).toMatchObject({ words: 'bag and programme differ' });
    expect((await p.send({ action: 'program', ch: 3, drugId: 'fentanyl', concentration: { amount: 10, unit: 'mcg', perMl: 1 }, set: 20 })).accepted).toBe(true);
    await waitFor(() => prepsTo(x.got, x.host.peerId).some((e) => (e.body as { news: string }).news === 'pumpMismatchCleared'));
  });
});

describe('C2: the same-drug bolus lock holds across the pump and the laptop', () => {
  it('a laptop bolus of propofol locks a pump bolus of a propofol syringe for 10 s, and the pump\'s locks the laptop\'s, named "from the pump tablet"', async () => {
    const x = setup();
    const p = await pumpIn(x);
    await propofolChannel(p, 1);
    const bolus = { type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 20, unit: 'mg', route: 'iv' } };
    x.tg.at(100);
    expect((await ack(x.panelGot, x.laptop.command(bolus))).accepted).toBe(true);
    x.tg.at(104);
    expect(await p.send({ action: 'bolus', ch: 1, volumeMl: 2 })).toMatchObject({ accepted: false, code: 'recent', recent: { drugId: 'propofol', by: 'laptop' } });
    x.tg.at(111);
    expect((await p.send({ action: 'bolus', ch: 1, volumeMl: 2 })).accepted).toBe(true);
    x.tg.at(115);
    expect(await ack(x.panelGot, x.laptop.command(bolus))).toMatchObject({ accepted: false, code: 'recent', reason: 'given 4 s ago from the pump tablet', recent: { by: 'pump' } });
  });
});

describe('C2: the pump tablet\'s admission and its news', () => {
  it('granted on the learner PIN only; revoked with it; a pump hello without a device key is refused', async () => {
    const x = setup();
    const wrong = peer(x.relay, 'pump.2', 'pump');
    wrong.hello({ device: PUMP_KEY, pin: INSTRUCTOR_PIN });
    await waitFor(() => grants(x.got, 'pump.2').length > 0);
    expect(grants(x.got, 'pump.2').at(-1)).toMatchObject({ granted: false, reason: 'wrong PIN' });
    const bare = peer(x.relay, 'pump.3', 'pump');
    bare.hello({ pin: LEARNER_PIN });
    await waitFor(() => grants(x.got, 'pump.3').length > 0);
    expect(grants(x.got, 'pump.3').at(-1)).toMatchObject({ granted: false, reason: PUMP_REASONS.noDevice });
    await pumpIn(x);
    expect(x.host.pumpTablets()).toBe(1);
    expect(x.host.learnerRemotes()).toBe(0);
    x.host.learnerPinChanged();
    await waitFor(() => grants(x.got, 'pump.1').at(-1)?.granted === false);
    expect(x.host.pumpTablets()).toBe(0);
  });

  it('the pump hears each change on its channels as a history row (whoever made it), and the labels of the room\'s preparations, never their findings', async () => {
    const x = setup();
    const p = await pumpIn(x);
    await propofolChannel(p, 1);
    expect((await p.send({ action: 'rate', ch: 1, rate: 20, unit: 'mL/h' })).accepted).toBe(true);
    expect((await p.send({ action: 'start', ch: 1 })).accepted).toBe(true);
    const lr = await remoteIn(x);
    expect((await lr.send({ type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: 25 })).accepted).toBe(true);
    await waitFor(() => prepsTo(x.got, 'pump.1').filter((e) => (e.body as { news: string }).news === 'channel').length === 5);
    expect(prepsTo(x.got, 'pump.1').filter((e) => (e.body as { news: string }).news === 'channel').at(-1)?.body).toMatchObject({
      news: 'channel', row: { ch: 1, action: 'rate', by: REMOTE_KEY, replaced: [{ what: 'rate', rate: 20 }] },
    });
    expect((await lr.send({ type: 'prep', action: 'stage', prep: { id: 's0000002', components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }], container: 'syringe-pp' } })).accepted).toBe(true);
    await waitFor(() => prepsTo(x.got, 'pump.1').some((e) => (e.body as { news: string }).news === 'labels' && (e.body as { labels: unknown[] }).labels.length === 1));
    const labels = prepsTo(x.got, 'pump.1').filter((e) => (e.body as { news: string }).news === 'labels').at(-1)?.body as { labels: Array<Record<string, unknown>> };
    expect(labels.labels[0]).toMatchObject({ device: REMOTE_KEY, id: 's0000002', drugId: 'fentanyl', container: 'syringe-pp', volumeMl: 2 });
    expect(labels.labels[0]).not.toHaveProperty('findings');
  });
});
