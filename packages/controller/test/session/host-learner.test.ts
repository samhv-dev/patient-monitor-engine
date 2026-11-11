// Plan learner-action-remote.md L4 (§4 D2, D3, D7, D8, D9; §7.1; LQ1, LQ3, LQ4): the host grants a `learner` socket on
// the LEARNER PIN only, re-checks every learner command itself (no relay in between: an in-process transport stands for
// it), keeps the table of staged preparations, turns a delivered preparation into the instructor's own `applyEvent drug`
// with the amount computed HERE (volume × the formulary's concentration × r at the preparation's age), lets any remote
// change or stop any running infusion with the replaced rate recorded, and files every give with `by` (the device) and
// `prepId`. Each line of the plan's "Tests first" list is its own case below (the tray of three is in
// host-drug-lock.test.ts beside #337's). The preparations use the L2 fixture layer (TEST DATA ONLY: invented drugs and
// numbers [ENG: test]) where a figure is pinned, and the shipped layer where the real engine must accept the give.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type Command, type DispatchResult } from '@pme/engine-core';
import { HostSession, LEARNER_REASONS, type HostSessionOptions, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, LEARNER_ISSUED_BY, type AppliedResolution, type ManagedTransport, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { loadFormulary } from '../../src/formulary/load.ts';
import type { Formulary, FormularyFiles } from '../../src/formulary/types.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import type { StagedPrep } from '../../src/scenario/types-v2.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { BENCH_IDS, benchFiles } from '../formulary/fixtures/bench.fixture.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

const S = 'RMW234'; // a valid room code (no I, L, O, 0, 1): the relay test needs one
const LEARNER_PIN = '582913';
const INSTRUCTOR_PIN = '4729';
const KEY = 'remote0001';
const KEY2 = 'remote0002';

const fixture = loadFormulary(benchFiles(), BENCH_IDS);
if (!fixture.ok) throw new Error('the L2 fixture layer breaks §5');
const BENCH: Formulary = fixture.formulary;
/** The shipped layer, read as the CI's source check reads it (packages/controller/formulary/). */
const FOLDER = resolve(fileURLToPath(new URL('../../formulary', import.meta.url)));
const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const shippedFiles: FormularyFiles = Object.fromEntries(walk(FOLDER).filter((f) => f.endsWith('.json')).map((f) => [relative(FOLDER, f).split('\\').join('/'), JSON.parse(readFileSync(f, 'utf8')) as unknown]));
const shipped = loadFormulary(shippedFiles);
if (!shipped.ok) throw new Error('the shipped formulary breaks §5');
const SHIPPED: Formulary = shipped.formulary;

/** A target on a clock the test moves (`at(s)`); it accepts every command and keeps what reached it. */
function fakeTarget() {
  let tick = 0;
  const got: Command[] = [];
  const groups: Command[][] = [];
  const t: HostTarget = {
    dispatch: (c): DispatchResult => (got.push(c), { accepted: true, tick: Math.max(tick, c.atTick ?? 0) }),
    dispatchGroup: (cs) => (groups.push(cs), cs.map((c) => t.dispatch(c) as DispatchResult)),
    snapshot: () => ({ schema: 'x', tick } as never),
    restore: () => undefined,
    on: () => () => undefined,
    now: () => ({ tick, simT: tick * 0.02 }),
    time: () => undefined,
  };
  return { t, got, groups, at: (s: number) => void (tick = Math.round(s / 0.02)) };
}

const hosts: HostSession[] = [];
const closers: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const h of hosts.splice(0)) h.close();
  for (const c of closers.splice(0)) await c();
});
type Ack = Extract<WireMessage, { kind: 'ack' }>;
type Grant = Extract<WireMessage, { kind: 'grant' }>;
type Prep = Extract<WireEvent, { type: 'prep' }>;

/** A host on the fake clock with both PINs, one transport standing for the relay, and the laptop's own panel. */
function setup(o: Partial<HostSessionOptions> & { formulary?: () => Formulary | null } = {}) {
  const tg = fakeTarget();
  let learnerPin: string | null = LEARNER_PIN;
  const host = new HostSession({
    session: S, target: tg.t, stateIntervalMs: 0, instructorPin: () => INSTRUCTOR_PIN, learnerPin: () => learnerPin, formulary: () => BENCH, ...o,
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
  return { host, tg, relay, got, laptop, panelGot, setLearnerPin: (p: string | null) => void (learnerPin = p) };
}
/** A peer on `t`: its hello and its commands, stamped under one id as a real page's are. */
function peer(t: ManagedTransport, from: string, role: 'learner' | 'instructor' | 'controller' | 'viewer', issuedBy: string = from) {
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
  events(got).find((e) => e.type === 'commandApplied' && e.commandId === id) as { resolved: AppliedResolution } | undefined;
const preps = (got: WireMessage[]) => events(got).filter((e): e is Prep => e.type === 'prep');
async function ack(got: WireMessage[], id: string): Promise<Ack> {
  await waitFor(() => ackOf(got, id) !== undefined, 2000, `ack ${id}`);
  return ackOf(got, id) as Ack;
}
/** A learner remote on the relay's transport, signed in with the learner PIN (and its device key). */
async function signIn(x: ReturnType<typeof setup>, from = 'lr.1', device = KEY) {
  const p = peer(x.relay, from, 'learner', 'learner-page');
  p.hello({ show: 'learner', device, pin: LEARNER_PIN });
  await waitFor(() => grants(x.got, from).length > 0);
  expect(grants(x.got, from).at(-1)?.granted).toBe(true);
  return { ...p, send: async (body: Record<string, unknown>) => ack(x.got, p.command(body)) };
}

// The L2 fixture's powder: 20 mg a vial, reconstituted with 10 mL of water (2 mg/mL), 120 s to prepare; in water in a PP
// syringe at 25 °C it keeps 50 % at 4 h, linear from 1 at 0 h (so r = 0.75 at 2 h)
const POWDER = { productId: 'fixture-powder-vial', amount: 1, unit: 'vial' };
const stage = (id: string, extra: Record<string, unknown> = {}) =>
  ({ type: 'prep', action: 'stage', prep: { id, components: [POWDER], diluent: { id: 'water', volumeMl: 0 }, container: 'syringe-pp', ...extra } });
const deliver = (prepId: string, volumeMl: number | 'all' = 5, extra: Record<string, unknown> = {}) => ({ type: 'prep', action: 'deliver', prepId, volumeMl, route: 'iv', ...extra });
const drugsAt = (got: Command[]) => got.map((c) => (c as unknown as { event: Record<string, unknown> }).event);

describe('a learner\'s prep stage then prep deliver lands as the instructor\'s applyEvent drug, with the amount computed on the host', () => {
  it('5 mL at 2 h of age: 5 mL × 2 mg/mL × r 0.75 = 7.5 mg, issuedBy learner, by the device, prepId; the prepared and the active amounts both on record', async () => {
    const x = setup();
    const lr = await signIn(x);
    x.tg.at(100);
    expect((await lr.send(stage('p0000001'))).accepted).toBe(true);
    expect(x.tg.got).toHaveLength(0); // a stage never reaches the engine
    x.tg.at(100 + 2 * 3600);
    const id = lr.command(deliver('p0000001', 5));
    expect((await ack(x.got, id)).accepted).toBe(true);
    expect(drugsAt(x.tg.got)).toEqual([{ kind: 'drug', drugId: 'benchpowder', dose: 7.5, unit: 'mg', route: 'iv' }]);
    expect(x.tg.got[0]).toMatchObject({ id, issuedBy: LEARNER_ISSUED_BY, by: KEY, prepId: 'p0000001' });
    expect(applied(x.panelGot, id)?.resolved.command).toMatchObject({ issuedBy: 'learner', by: KEY, prepId: 'p0000001' });
    const rec = x.host.preparation(KEY, 'p0000001');
    expect(rec).toMatchObject({ id: 'p0000001', drugId: 'benchpowder', productId: 'fixture-powder-vial', diluent: 'water', volumeMl: 10, remaining: 0.75, activeAmount: 7.5, unit: 'mg' });
    expect(rec?.concentration).toEqual({ amount: 20, unit: 'mg', perMl: 2 });
  });

  it('"all" takes what is left; a second push of more than is left is refused with the volume left', async () => {
    const x = setup();
    const lr = await signIn(x);
    await lr.send(stage('p0000002'));
    x.tg.at(200);
    expect((await lr.send(deliver('p0000002', 4))).accepted).toBe(true);
    x.tg.at(220);
    expect(await lr.send(deliver('p0000002', 7))).toMatchObject({ accepted: false, reason: 'only 6 mL is left in the preparation' });
    expect((await lr.send(deliver('p0000002', 'all'))).accepted).toBe(true);
    expect(drugsAt(x.tg.got).map((e) => e.dose)).toEqual([8 * (1 - (0.5 * 200) / (4 * 3600)), 12 * (1 - (0.5 * 220) / (4 * 3600))]);
    x.tg.at(240);
    expect(await lr.send(deliver('p0000002', 1))).toMatchObject({ accepted: false, reason: 'the preparation is empty' });
  });

  it('on the real engine, the shipped fentanyl (50 mcg/mL, undiluted): 2 mL is 100 mcg, accepted by the engine as the panel\'s bolus would be', async () => {
    const engine = createEngine({ seed: 7 });
    const t: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => undefined };
    const x = setup({ target: t, formulary: () => SHIPPED });
    const lr = await signIn(x);
    expect((await lr.send({ type: 'prep', action: 'stage', prep: { id: 'f0000001', components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }] } })).accepted).toBe(true);
    const id = lr.command(deliver('f0000001', 'all'));
    expect((await ack(x.got, id)).accepted).toBe(true);
    expect(applied(x.panelGot, id)?.resolved.command).toMatchObject({ type: 'applyEvent', event: { kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' }, by: KEY, prepId: 'f0000001' });
  });

  it('the scenario driver files the give as the learner\'s with its preparation (the host supplies the lookup; recordPreparation sees the stage)', async () => {
    const tg = fakeTarget();
    const staged: StagedPrep[] = [];
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: tg.t, submit: (c) => (hs as HostSession).submit(c), publish: () => undefined, preparation: (by, id, drugId) => hs?.preparation(by, id, drugId) });
    const spy = driver.recordPreparation.bind(driver);
    driver.recordPreparation = (p) => (staged.push(p), spy(p));
    hs = new HostSession({ session: S, target: driver.host, scenario: driver.hook, stateIntervalMs: 0, learnerPin: () => LEARNER_PIN, formulary: () => BENCH, onPreparation: (p) => driver.recordPreparation(p) });
    hosts.push(hs);
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const relay = hub.connect();
    const got = collect(relay);
    const lr = peer(relay, 'lr.1', 'learner');
    lr.hello({ show: 'learner', device: KEY, pin: LEARNER_PIN });
    await waitFor(() => grants(got, 'lr.1').some((g) => g.granted));
    expect((await ack(got, lr.command(stage('p0000003')))).accepted).toBe(true);
    expect(staged).toEqual([expect.objectContaining({ id: 'p0000003', by: KEY, drugId: 'benchpowder', volumeMl: 10, findings: [] })]);
    tg.at(300);
    expect((await ack(got, lr.command(deliver('p0000003', 1)))).accepted).toBe(true);
    expect(hs.preparation(KEY, 'p0000003', 'benchpowder')).toMatchObject({ activeAmount: 2 * (1 - (0.5 * 300) / (4 * 3600)), remaining: 1 - (0.5 * 300) / (4 * 3600) });
  });
});

describe('a preparation of two drugs (the shipped fentanyl and midazolam in one syringe): one give of each, whole or not at all', () => {
  const mix = { type: 'prep', action: 'stage', prep: { id: 'm0000001', components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }, { productId: 'hypnovel-5mg-ml', amount: 2, unit: 'mL' }], diluent: { id: 'saline', volumeMl: 6 } } };
  it('5 mL of the 10 mL: 50 mcg of fentanyl and 5 mg of midazolam, one stage group (one tick), each filed with its own drug\'s record', async () => {
    const x = setup({ formulary: () => SHIPPED });
    const lr = await signIn(x);
    expect((await lr.send(mix)).accepted).toBe(true);
    const id = lr.command(deliver('m0000001', 5));
    expect((await ack(x.got, id)).accepted).toBe(true);
    await ack(x.got, `${id}.2`);
    expect(x.tg.got.map((c) => [c.id, (c as unknown as { event: unknown }).event, c.stageGroup])).toEqual([
      [id, { kind: 'drug', drugId: 'fentanyl', dose: 50, unit: 'mcg', route: 'iv' }, `prep-${id}`],
      [`${id}.2`, { kind: 'drug', drugId: 'midazolam', dose: 5, unit: 'mg', route: 'iv' }, `prep-${id}`],
    ]);
    expect(new Set(x.tg.got.map((c) => c.atTick)).size).toBe(1);
    expect(x.host.preparation(KEY, 'm0000001', 'fentanyl')).toMatchObject({ drugId: 'fentanyl', concentration: { amount: 100, unit: 'mcg', perMl: 10 }, activeAmount: 50 });
    expect(x.host.preparation(KEY, 'm0000001', 'midazolam')).toMatchObject({ drugId: 'midazolam', concentration: { amount: 10, unit: 'mg', perMl: 1 }, activeAmount: 5 });
  });
  it('one of its drugs locked → the whole delivery is refused, nothing given; in a tray it is refused (a tray counts one item per preparation)', async () => {
    const x = setup({ formulary: () => SHIPPED });
    const lr = await signIn(x);
    await lr.send(mix);
    expect((await ack(x.panelGot, x.laptop.command({ type: 'applyEvent', event: { kind: 'drug', drugId: 'midazolam', dose: 1, unit: 'mg', route: 'iv' } }))).accepted).toBe(true);
    x.tg.at(3);
    expect(await lr.send(deliver('m0000001', 5))).toMatchObject({ accepted: false, code: 'recent', reason: 'given 3 s ago from the laptop', recent: { drugId: 'midazolam', by: 'laptop' } });
    expect(x.tg.got).toHaveLength(1); // the laptop's own
    x.tg.at(20);
    expect((await lr.send(deliver('m0000001', 5, { stageGroup: 'tray', batch: { id: 'tray', n: 2 } }))).reason).toBe('a preparation of two drugs is delivered on its own, not in a tray');
  });
});

describe('nothing a phone sends is trusted as a quantity: a forged field is refused on the host (no relay in between)', () => {
  it.each([
    ['a concentration on the preparation', stage('p0000004', { concentration: { amount: 100, unit: 'mg', perMl: 1 } }), 'prep.concentration'],
    ['a concentration on a component', stage('p0000004', { components: [{ ...POWDER, concentration: 50 }] }), 'prep.components[0].concentration'],
    ['a finding', stage('p0000004', { findings: [] }), 'prep.findings'],
    ['a dose on a delivery', deliver('p0000004', 5, { dose: 40 }), 'dose'],
    ['a fraction on a delivery', deliver('p0000004', 5, { remaining: 1 }), 'remaining'],
    ['an atTick on a delivery', deliver('p0000004', 5, { atTick: 1 }), 'atTick'],
  ])('%s → refused, nothing staged or given', async (_w, body, field) => {
    const x = setup();
    const lr = await signIn(x);
    if ((body as { action: string }).action === 'deliver') await lr.send(stage('p0000004'));
    x.tg.at(500);
    const a = await lr.send(body);
    expect(a.accepted).toBe(false);
    expect(a.reason).toContain(field);
    expect(x.tg.got).toHaveLength(0);
  });
  it('a raw applyEvent drug, a clock or a scenario command from a learner → refused', async () => {
    const x = setup();
    const lr = await signIn(x);
    for (const body of [{ type: 'applyEvent', event: { kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' } }, { type: 'time', action: 'pause' }, { type: 'scenario', action: 'goto', target: 'x' }]) {
      expect((await lr.send(body)).reason).toBe("The learner remote sends its preparations, an infusion's rate and a sample only.");
    }
    expect(x.tg.got).toHaveLength(0);
  });
  it('a product the formulary does not hold, an unknown container, a remote\'s own id twice → refused', async () => {
    const x = setup();
    const lr = await signIn(x);
    expect((await lr.send(stage('p0000005', { components: [{ productId: 'no-such-vial', amount: 1, unit: 'vial' }] }))).reason).toBe('the formulary has no product "no-such-vial"');
    expect((await lr.send(stage('p0000005', { container: 'syringe50ml' }))).reason).toBe('a preparation is in a vial, syringe-pp, bag-pvc, bag-polyolefin, not "syringe50ml"');
    expect((await lr.send(stage('p0000005'))).accepted).toBe(true);
    expect((await lr.send(stage('p0000005'))).reason).toBe('this remote already has a preparation p0000005');
    expect((await lr.send(deliver('p0000099'))).reason).toBe('this remote has no preparation p0000099');
  });
  it('a remote that signs in again on a new socket keeps its preparations (they are its device\'s), and their news follows it', async () => {
    const x = setup();
    const a = await signIn(x, 'lr.1', KEY);
    await a.send(stage('p0000017'));
    const again = await signIn(x, 'lr.1b', KEY); // the same phone after a reload: a new peer id, its own device key
    x.tg.at(500);
    expect((await again.send(deliver('p0000017', 1))).accepted).toBe(true);
    await waitFor(() => preps(x.got).some((e) => e.to === 'lr.1b'));
    expect(preps(x.got).filter((e) => (e.body as { news: string }).news === 'delivered').map((e) => e.to)).toEqual(['lr.1b', x.host.peerId]);
  });
  it("one remote cannot deliver another remote's preparation: the table is keyed by the device", async () => {
    const x = setup();
    const a = await signIn(x, 'lr.1', KEY);
    const b = await signIn(x, 'lr.2', KEY2);
    await a.send(stage('p0000006'));
    x.tg.at(500);
    expect((await b.send(deliver('p0000006'))).reason).toBe('this remote has no preparation p0000006');
    expect((await a.send(deliver('p0000006'))).accepted).toBe(true);
  });
});

describe('the two PIN statements (§4 D9, LQ1): the safety of the whole feature', () => {
  it('the learner PIN grants `learner` only: the same PIN said as an instructor is a wrong PIN, and a learner command needs the grant', async () => {
    const x = setup();
    const ph = peer(x.relay, 'ph.1', 'instructor');
    ph.hello({ pin: LEARNER_PIN });
    await waitFor(() => grants(x.got, 'ph.1').length > 0);
    expect(grants(x.got, 'ph.1')).toEqual([expect.objectContaining({ granted: false, reason: 'wrong PIN' })]);
    expect(x.host.instructorDenials()).toBe(1);
    // and a learner that never signed in: refused, whatever it sends
    const lr = peer(x.relay, 'lr.9', 'learner');
    expect((await ack(x.got, lr.command(stage('p0000007')))).reason).toBe(LEARNER_REASONS.notSignedIn);
  });
  it("the instructor's PIN does not grant `learner`: a wrong learner PIN, counted; its commands are refused", async () => {
    const x = setup();
    const lr = peer(x.relay, 'lr.1', 'learner');
    lr.hello({ show: 'learner', device: KEY, pin: INSTRUCTOR_PIN });
    await waitFor(() => grants(x.got, 'lr.1').length > 0);
    expect(grants(x.got, 'lr.1')).toEqual([expect.objectContaining({ granted: false, reason: 'wrong PIN' })]);
    expect(x.host.learnerDenials()).toBe(1);
    expect(x.host.instructorDenials()).toBe(0);
    expect((await ack(x.got, lr.command(stage('p0000008')))).reason).toBe(LEARNER_REASONS.notSignedIn);
  });
  it('no learner PIN set: every learner is denied; a learner without a device key is denied (its gives would name nobody)', async () => {
    const x = setup();
    x.setLearnerPin(null);
    const a = peer(x.relay, 'lr.1', 'learner');
    a.hello({ show: 'learner', device: KEY, pin: LEARNER_PIN });
    await waitFor(() => grants(x.got, 'lr.1').length > 0);
    expect(grants(x.got, 'lr.1')[0]).toMatchObject({ granted: false, reason: LEARNER_REASONS.noRemote });
    x.setLearnerPin(LEARNER_PIN);
    const b = peer(x.relay, 'lr.2', 'learner');
    b.hello({ show: 'learner', pin: LEARNER_PIN });
    await waitFor(() => grants(x.got, 'lr.2').length > 0);
    expect(grants(x.got, 'lr.2')[0]).toMatchObject({ granted: false, reason: LEARNER_REASONS.noDevice });
  });
  it("the two PINs equal (an app that failed to keep them apart): neither role is granted on it, so the learner PIN never opens the instructor's role", async () => {
    const x = setup({ instructorPin: () => LEARNER_PIN });
    const lr = peer(x.relay, 'lr.1', 'learner');
    lr.hello({ show: 'learner', device: KEY, pin: LEARNER_PIN });
    const ph = peer(x.relay, 'ph.1', 'instructor');
    ph.hello({ pin: LEARNER_PIN });
    await waitFor(() => grants(x.got, 'lr.1').length > 0 && grants(x.got, 'ph.1').length > 0);
    expect(grants(x.got, 'lr.1')[0]).toMatchObject({ granted: false, reason: LEARNER_REASONS.samePins });
    expect(grants(x.got, 'ph.1')[0]).toMatchObject({ granted: false, reason: LEARNER_REASONS.samePins });
  });
  it('a learner may not sign in under the host\'s own peer id (the id the instructor\'s copy of a preparation is addressed to): never granted', async () => {
    const x = setup();
    const lr = peer(x.relay, x.host.peerId, 'learner');
    lr.hello({ show: 'learner', device: KEY, pin: LEARNER_PIN });
    await sleep(50);
    expect(grants(x.got, x.host.peerId).filter((g) => g.granted)).toEqual([]);
    expect(x.host.learnerRemotes()).toBe(0);
  });
  it('a new learner PIN revokes every granted remote (each is told); their commands are refused until they sign in with the new one', async () => {
    const x = setup();
    const a = await signIn(x, 'lr.1', KEY);
    const b = await signIn(x, 'lr.2', KEY2);
    expect(x.host.learnerRemotes()).toBe(2);
    x.setLearnerPin('774411');
    x.host.learnerPinChanged();
    await waitFor(() => ['lr.1', 'lr.2'].every((id) => grants(x.got, id).length === 2));
    for (const id of ['lr.1', 'lr.2']) expect(grants(x.got, id).at(-1)).toMatchObject({ granted: false, reason: LEARNER_REASONS.pinChanged });
    expect(x.host.learnerRemotes()).toBe(0);
    expect((await a.send(stage('p0000009'))).reason).toBe(LEARNER_REASONS.notSignedIn);
    expect((await b.send(stage('p0000009'))).reason).toBe(LEARNER_REASONS.notSignedIn);
    // the old PIN no longer grants; the new one does
    peer(x.relay, 'lr.3', 'learner').hello({ show: 'learner', device: 'remote0003', pin: LEARNER_PIN });
    await waitFor(() => grants(x.got, 'lr.3').length > 0);
    expect(grants(x.got, 'lr.3')[0]).toMatchObject({ granted: false, reason: 'wrong PIN' });
    peer(x.relay, 'lr.4', 'learner').hello({ show: 'learner', device: 'remote0004', pin: '774411' });
    await waitFor(() => grants(x.got, 'lr.4').length > 0);
    expect(grants(x.got, 'lr.4')[0]).toMatchObject({ granted: true });
  });
  it('a PIN changed without learnerPinChanged() is caught at the remote\'s next command; the instructor phone is untouched by either', async () => {
    const x = setup();
    const ph = peer(x.relay, 'ph.1', 'instructor');
    ph.hello({ pin: INSTRUCTOR_PIN });
    const lr = await signIn(x);
    await waitFor(() => grants(x.got, 'ph.1').some((g) => g.granted));
    x.setLearnerPin('774411');
    expect((await lr.send(stage('p0000010'))).reason).toBe(LEARNER_REASONS.notSignedIn);
    expect(grants(x.got, 'lr.1').at(-1)).toMatchObject({ granted: false, reason: LEARNER_REASONS.pinChanged });
    expect(grants(x.got, 'ph.1').at(-1)).toMatchObject({ granted: true });
    x.host.instructorPinChanged(); // the instructor's change revokes the phone, not the learners (and vice versa)
    await waitFor(() => grants(x.got, 'ph.1').at(-1)?.granted === false);
    expect(grants(x.got, 'lr.1').filter((g) => g.granted)).toHaveLength(1);
  });
});

describe('infusions from a preparation, and LQ4: any remote changes or stops any running infusion', () => {
  it("prep infuse starts an infusion at the pump's mL/h with the preparation's concentration × r at its start", async () => {
    const x = setup();
    const lr = await signIn(x);
    await lr.send(stage('p0000011'));
    x.tg.at(3600); // 1 h of age (staged at 0 s): r = 1 − 0.5 × (3600 / 14 400) = 0.875
    expect((await lr.send({ type: 'prep', action: 'infuse', prepId: 'p0000011', rateMlH: 6 })).accepted).toBe(true);
    expect(drugsAt(x.tg.got)).toEqual([{ kind: 'infusion', drugId: 'benchpowder', rate: 6, unit: 'mL/h', concentration: { amount: 2 * 0.875, unit: 'mg', perMl: 1 } }]);
    expect(x.tg.got[0]).toMatchObject({ issuedBy: 'learner', by: KEY, prepId: 'p0000011' });
  });

  it("infusion set from ANY remote changes, then stops, an infusion the instructor started, keeping its concentration; the record holds the device and the rate replaced", async () => {
    const x = setup();
    const b = await signIn(x, 'lr.2', KEY2);
    const conc = { amount: 40, unit: 'mcg', perMl: 1 };
    const id0 = x.laptop.command({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 3, unit: 'mL/h', concentration: conc } });
    expect((await ack(x.panelGot, id0)).accepted).toBe(true);
    const id1 = b.command({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 5 });
    expect((await ack(x.got, id1)).accepted).toBe(true);
    expect(x.tg.got.at(-1)).toMatchObject({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 5, unit: 'mL/h', concentration: conc }, issuedBy: 'learner', by: KEY2, replaced: { rate: 3, rateUnit: 'mL/h', by: 'laptop' } });
    expect(applied(x.panelGot, id1)?.resolved.command).toMatchObject({ by: KEY2, replaced: { rate: 3, rateUnit: 'mL/h', by: 'laptop' } });
    const id2 = b.command({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 0 });
    expect((await ack(x.got, id2)).accepted).toBe(true);
    expect(x.tg.got.at(-1)).toMatchObject({ event: { rate: 0, concentration: conc }, replaced: { rate: 5, rateUnit: 'mL/h', by: KEY2 } });
    expect(await b.send({ type: 'infusion', action: 'set', drugId: 'norepinephrine', rateMlH: 2 })).toMatchObject({ accepted: false, reason: 'no norepinephrine infusion is running' });
  });

  it("another remote's infusion, and an instructor's rate-unit infusion (no syringe of its own: the engine's row syringe stays)", async () => {
    const x = setup();
    const a = await signIn(x, 'lr.1', KEY);
    const b = await signIn(x, 'lr.2', KEY2);
    await a.send(stage('p0000012'));
    x.tg.at(200);
    expect((await a.send({ type: 'prep', action: 'infuse', prepId: 'p0000012', rateMlH: 4 })).accepted).toBe(true);
    expect((await b.send({ type: 'infusion', action: 'set', drugId: 'benchpowder', rateMlH: 8 })).accepted).toBe(true);
    expect(x.tg.got.at(-1)).toMatchObject({ by: KEY2, event: { rate: 8, concentration: (x.tg.got.at(-2) as unknown as { event: { concentration: unknown } }).event.concentration }, replaced: { rate: 4, rateUnit: 'mL/h', by: KEY } });
    const id = x.laptop.command({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 0.05, unit: 'mcg/kg/min', route: 'iv', infusion: true } });
    expect((await ack(x.panelGot, id)).accepted).toBe(true);
    expect((await b.send({ type: 'infusion', action: 'set', drugId: 'epinephrine', rateMlH: 2 })).accepted).toBe(true);
    const last = x.tg.got.at(-1) as unknown as { event: Record<string, unknown>; replaced: unknown };
    expect(last.event).toEqual({ kind: 'infusion', drugId: 'epinephrine', rate: 2, unit: 'mL/h' });
    expect(last.replaced).toEqual({ rate: 0.05, rateUnit: 'mcg/kg/min', by: 'laptop' });
  });

  it('the scenario driver\'s record of a learner\'s infusion change holds the device and the rate replaced (LQ4, the /2 record)', async () => {
    const tg = fakeTarget();
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: tg.t, submit: (c) => (hs as HostSession).submit(c), publish: () => undefined });
    hs = new HostSession({ session: S, target: driver.host, scenario: driver.hook, stateIntervalMs: 0, learnerPin: () => LEARNER_PIN, formulary: () => BENCH });
    hosts.push(hs);
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const relay = hub.connect();
    const got = collect(relay);
    const ctl = peer(relay, 'panel-1', 'controller', 'instructor');
    ctl.hello();
    const lr = peer(relay, 'lr.1', 'learner');
    lr.hello({ show: 'learner', device: KEY, pin: LEARNER_PIN });
    await waitFor(() => grants(got, 'lr.1').some((g) => g.granted));
    expect((await ack(got, ctl.command({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'propofol', rate: 20, unit: 'mL/h', concentration: { amount: 10, unit: 'mg', perMl: 1 } } }))).accepted).toBe(true);
    const id = lr.command({ type: 'infusion', action: 'set', drugId: 'propofol', rateMlH: 12 });
    expect((await ack(got, id)).accepted).toBe(true);
    expect(applied(got, id)?.resolved.command).toMatchObject({ by: KEY, replaced: { rate: 20, rateUnit: 'mL/h', by: 'laptop' } });
  });
});

describe('the preparation time and the lab sample', () => {
  it('a delivery before the ready time is refused "not ready yet (m:ss)"; at the ready time it is given', async () => {
    const x = setup();
    const lr = await signIn(x);
    x.tg.at(100);
    await lr.send(stage('p0000013')); // the powder takes 120 s: ready at 220 s
    x.tg.at(150);
    expect(await lr.send(deliver('p0000013'))).toMatchObject({ accepted: false, reason: 'not ready yet (1:10)' });
    expect(await lr.send({ type: 'prep', action: 'infuse', prepId: 'p0000013', rateMlH: 2 })).toMatchObject({ accepted: false, reason: 'not ready yet (1:10)' });
    x.tg.at(219.5);
    expect(await lr.send(deliver('p0000013'))).toMatchObject({ accepted: false, reason: 'not ready yet (0:01)' });
    x.tg.at(220);
    expect((await lr.send(deliver('p0000013'))).accepted).toBe(true);
  });
  it("a learner's lab sample goes to the engine as the instructor's would, filed as the learner's", async () => {
    const x = setup();
    const lr = await signIn(x);
    const id = lr.command({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } });
    expect((await ack(x.got, id)).accepted).toBe(true);
    expect(x.tg.got[0]).toMatchObject({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' }, issuedBy: 'learner', by: KEY });
  });
  it("brief 164: a learner's lab before and after its Give, and the laptop's own bolus after it, all reach the engine and are applied (the host's chain is not left waiting)", async () => {
    const x = setup();
    const lr = await signIn(x);
    x.tg.at(100);
    expect((await lr.send({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } })).accepted).toBe(true);
    await lr.send(stage('p0000020'));
    x.tg.at(400);
    const give = lr.command(deliver('p0000020', 5));
    expect((await ack(x.got, give)).accepted).toBe(true);
    const lab = lr.command({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } });
    const mine = x.laptop.command({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 10, unit: 'mcg', route: 'iv' } });
    expect((await ack(x.got, lab)).accepted).toBe(true);
    await waitFor(() => ackOf(x.panelGot, mine) !== undefined, 2000, 'the laptop ack');
    expect(ackOf(x.panelGot, mine)?.accepted).toBe(true);
    expect(drugsAt(x.tg.got).map((e) => e.kind === 'lab' ? 'lab' : e.drugId)).toEqual(['lab', 'benchpowder', 'lab', 'epinephrine']);
    for (const id of [give, lab, mine]) expect(applied(x.panelGot, id)).toBeDefined(); // each a commandApplied on the laptop's screens
  });
  it('discard removes the preparation: it can no longer be given, and a new one may take its id', async () => {
    const x = setup();
    const lr = await signIn(x);
    await lr.send(stage('p0000014'));
    expect((await lr.send({ type: 'prep', action: 'discard', prepId: 'p0000014' })).accepted).toBe(true);
    x.tg.at(500);
    expect((await lr.send(deliver('p0000014'))).reason).toBe('this remote has no preparation p0000014');
    expect((await lr.send(stage('p0000014'))).accepted).toBe(true);
  });
});

describe("a preparation's prep event reaches the instructor and its own device only (§4 D7)", () => {
  it('on the host: one event to the remote (no findings), one to the host\'s own screens and instructors (findings, device); no commandApplied for a stage', async () => {
    const x = setup();
    const lr = await signIn(x);
    // the powder in saline: the label does not list saline for it, and the source says a haze forms (fixture)
    const id = lr.command(stage('p0000015', { diluent: { id: 'saline', volumeMl: 10 }, container: 'bag-pvc' }));
    expect((await ack(x.got, id)).accepted).toBe(true);
    await waitFor(() => preps(x.got).length >= 2);
    const [mine, theirs] = [preps(x.got).find((e) => e.to === 'lr.1'), preps(x.got).find((e) => e.to === x.host.peerId)];
    expect(mine?.body).toMatchObject({ news: 'made', prep: { id: 'p0000015', volumeMl: 20, leftMl: 20 } });
    expect(JSON.stringify(mine?.body)).not.toContain('findings');
    expect(JSON.stringify(mine?.body)).not.toContain('haze');
    expect(theirs?.body).toMatchObject({ news: 'made', prep: { id: 'p0000015', by: KEY, findings: [expect.objectContaining({ kind: 'wrongDiluent' }), expect.objectContaining({ kind: 'incompatible', statement: 'Fixture: a haze forms.' })] } });
    expect(applied(x.got, id)).toBeUndefined(); // a stage is not an engine command: no follower applies it
  });

  it('through the classroom relay: the remote that staged it and the granted instructor phone get it; another remote, a viewer and the defibrillator window do not', async () => {
    const relay: RelayHandle = await startRelay({ port: 0, host: '::', heartbeatMs: 60_000, remoteRoles: 'viewer', isLocal: (a) => a !== '::1', log: () => undefined });
    closers.push(() => relay.close());
    const host = new HostSession({ session: S, target: fakeTarget().t, stateIntervalMs: 0, instructorPin: () => INSTRUCTOR_PIN, learnerPin: () => LEARNER_PIN, formulary: () => BENCH });
    hosts.push(host);
    const hostWs = createWebSocketTransport({ url: `ws://127.0.0.1:${relay.port}/` });
    host.addTransport(hostWs);
    closers.push(() => hostWs.close());
    await waitFor(() => relay.room(S)?.hostOnline === true, 3000, 'host on the relay');
    const socket = async (from: string, hello: Record<string, unknown>) => {
      const ws = new WebSocket(`ws://[::1]:${relay.port}/`);
      const got: Array<Record<string, unknown>> = [];
      ws.onmessage = (e) => got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
      await new Promise((ok) => (ws.onopen = ok));
      closers.push(() => ws.close());
      const st = createStamper(S, from);
      ws.send(JSON.stringify(st({ kind: 'hello', ...hello } as never)));
      return { got, send: (body: Record<string, unknown>) => ws.send(JSON.stringify(st(body as never))) };
    };
    const mine = await socket('lr.1', { role: 'learner', show: 'learner', device: KEY, pin: LEARNER_PIN });
    const other = await socket('lr.2', { role: 'learner', show: 'learner', device: KEY2, pin: LEARNER_PIN });
    const viewer = await socket('vw.1', { role: 'viewer', show: 'learner', device: 'phone00001' });
    const defib = await socket('df.1', { role: 'defib', show: 'defib', device: 'defib00001' });
    const phone = await socket('ph.1', { role: 'instructor', pin: INSTRUCTOR_PIN });
    const granted = (s: { got: Array<Record<string, unknown>> }) => s.got.some((m) => m.kind === 'grant' && m.granted === true);
    await waitFor(() => granted(mine) && granted(other) && granted(phone), 3000, 'grants');
    mine.send({ kind: 'command', body: { id: 'stage-1', issuedBy: 'learner', ...stage('p0000016') } });
    const prepsOf = (s: { got: Array<Record<string, unknown>> }) =>
      s.got.filter((m) => m.kind === 'event').flatMap((m) => m.body as Array<{ type: string; to?: string }>).filter((e) => e.type === 'prep');
    await waitFor(() => prepsOf(mine).length > 0 && prepsOf(phone).length >= 2, 3000, 'prep events');
    await sleep(100);
    expect(prepsOf(mine).map((e) => e.to)).toEqual(['lr.1']);
    expect(prepsOf(phone).map((e) => e.to).sort()).toEqual([host.peerId, 'lr.1'].sort());
    for (const s of [other, viewer, defib]) expect(prepsOf(s)).toEqual([]);
  });
});

// Plan learner-action-remote.md L7 (§4 D7, LQ3 ruled): the host's half of the incompatibility notice, which the remote's
// tray sounds and shows. Until the instructor shows it, the remote's news carries no finding; `showPrepNotice` records
// when (the record's `notice`) and sends that remote its preparation WITH the findings, once; a Give before the notice
// is given all the same, and the record says the notice had not been shown. L9 adds the card and its `prep notice`
// command that call it.
describe('L7: the incompatibility notice reaches the remote that staged the preparation, once, with its findings', () => {
  it('no finding before the notice; after it, a `notice` news to that remote only, with the findings and the time; the record keeps the time', async () => {
    const x = setup();
    const lr = await signIn(x);
    x.tg.at(60);
    expect((await lr.send(stage('p0000020', { diluent: { id: 'saline', volumeMl: 10 }, container: 'bag-pvc' }))).accepted).toBe(true);
    expect(x.host.preparation(KEY, 'p0000020')?.notice).toBeNull();
    x.tg.at(75);
    expect(x.host.showPrepNotice(KEY, 'p0000020')).toBe(true);
    await waitFor(() => preps(x.got).some((e) => (e.body as { news: string }).news === 'notice' && e.to === 'lr.1'));
    const mine = preps(x.got).filter((e) => e.to === 'lr.1');
    expect(JSON.stringify(mine.filter((e) => (e.body as { news: string }).news !== 'notice'))).not.toContain('findings');
    const n = mine.find((e) => (e.body as { news: string }).news === 'notice')!;
    expect(n.body).toMatchObject({ news: 'notice', prep: { id: 'p0000020', notice: { shownAt: 75, findings: [expect.objectContaining({ kind: 'wrongDiluent' }), expect.objectContaining({ kind: 'incompatible', statement: 'Fixture: a haze forms.' })] } } });
    expect(preps(x.got).find((e) => e.to === x.host.peerId && (e.body as { news: string }).news === 'notice')?.body).toMatchObject({ prep: { notice: { shownAt: 75 } } });
    expect(x.host.preparation(KEY, 'p0000020')?.notice).toEqual({ shownAt: 75 });
    expect(x.host.showPrepNotice(KEY, 'p0000020')).toBe(false); // once
    expect(x.host.showPrepNotice(KEY, 'nope0000')).toBe(false);
    expect(x.host.showPrepNotice(KEY2, 'p0000020')).toBe(false); // another device's id space
  });

  it('a Give before the notice is given (LQ3), and the record says no notice had been shown', async () => {
    const x = setup();
    const lr = await signIn(x);
    x.tg.at(60);
    expect((await lr.send(stage('p0000021', { diluent: { id: 'saline', volumeMl: 10 }, container: 'bag-pvc' }))).accepted).toBe(true);
    x.tg.at(60 + 130); // the fixture powder's 120 s
    const id = lr.command(deliver('p0000021', 5));
    expect((await ack(x.got, id)).accepted).toBe(true);
    expect(x.tg.got).toHaveLength(1);
    expect(x.host.preparation(KEY, 'p0000021')?.notice).toBeNull();
  });
});

// Plan learner-action-remote.md L9 (§4 D2, D7; LQ3 ruled): the instructor's ONE control on a learner's preparation, the
// instructor-only `prep notice {by, prepId}`, sent by the laptop's dock card and by the instructor phone's card. The host
// shows the notice once (showPrepNotice: the record keeps its time), whichever screen pressed first; the second press is
// refused with the time it was shown; a learner can never send it; nothing is removed or blocked.
describe('L9: the instructor-only `prep notice`, from the laptop or the granted instructor phone', () => {
  const notice = (by: string, prepId: string) => ({ type: 'prep', action: 'notice', by, prepId });
  const noticesTo = (got: WireMessage[], to: string) => preps(got).filter((e) => e.to === to && (e.body as { news: string }).news === 'notice');
  /** A host with the driver's record hook and Room setup's names, a learner remote with a preparation that has findings. */
  async function flagged(o: Partial<HostSessionOptions> = {}) {
    const staged: StagedPrep[] = [];
    const x = setup({ onPreparation: (p) => void staged.push(p), deviceName: (k) => (k === KEY ? 'Bed 2' : null), ...o });
    const lr = await signIn(x);
    x.tg.at(60);
    expect((await lr.send(stage('p0000030', { diluent: { id: 'saline', volumeMl: 10 }, container: 'bag-pvc' }))).accepted).toBe(true);
    return { x, lr, staged };
  }
  async function phone(x: ReturnType<typeof setup>, from = 'ph.1') {
    const ph = peer(x.relay, from, 'instructor', 'remote');
    ph.hello({ pin: INSTRUCTOR_PIN });
    await waitFor(() => grants(x.got, from).some((g) => g.granted));
    return ph;
  }

  it("the instructor's copy names the device as Room setup named it, with the findings, at once; the learner's carries neither", async () => {
    const { x } = await flagged();
    await waitFor(() => preps(x.got).length >= 2);
    const mine = preps(x.got).find((e) => e.to === 'lr.1')!;
    const theirs = preps(x.got).find((e) => e.to === x.host.peerId)!;
    expect(theirs.body).toMatchObject({ news: 'made', prep: { id: 'p0000030', by: KEY, name: 'Bed 2', notice: null, findings: [expect.objectContaining({ kind: 'wrongDiluent' }), expect.objectContaining({ kind: 'incompatible' })] } });
    expect(JSON.stringify(mine.body)).not.toMatch(/findings|Bed 2/);
    // the laptop's own panel transport gets the same instructor copy (the host's screens)
    await waitFor(() => preps(x.panelGot).some((e) => e.to === x.host.peerId));
  });

  it('from the laptop: accepted, the learner gets the notice once with its findings, and the record keeps the time (the driver sees the preparation again)', async () => {
    const { x, staged } = await flagged();
    x.tg.at(90);
    const id = x.laptop.command(notice(KEY, 'p0000030'));
    expect((await ack(x.panelGot, id)).accepted).toBe(true);
    await waitFor(() => noticesTo(x.got, 'lr.1').length === 1);
    expect(noticesTo(x.got, 'lr.1')[0]!.body).toMatchObject({ prep: { notice: { shownAt: 90, findings: [expect.anything(), expect.anything()] } } });
    expect(x.host.preparation(KEY, 'p0000030')?.notice).toEqual({ shownAt: 90 });
    expect(staged.map((p) => p.notice)).toEqual([null, { shownAt: 90 }]);
    expect(x.tg.got).toHaveLength(0); // the host's own table: nothing reaches the engine
  });

  it('from the granted phone, then the laptop: the press reaches the remote once; the second is refused with the time it was shown; a resend is the same answer', async () => {
    const { x } = await flagged();
    const ph = await phone(x);
    x.tg.at(75);
    const a = ph.command(notice(KEY, 'p0000030'));
    expect((await ack(x.got, a)).accepted).toBe(true);
    x.tg.at(80);
    const b = x.laptop.command(notice(KEY, 'p0000030'));
    expect(await ack(x.panelGot, b)).toMatchObject({ accepted: false, reason: 'the notice was shown at 01:15' });
    await sleep(50);
    expect(noticesTo(x.got, 'lr.1')).toHaveLength(1);
    expect(x.host.preparation(KEY, 'p0000030')?.notice).toEqual({ shownAt: 75 });
    ph.command(notice(KEY, 'p0000030'), a); // the phone's resend of its own press
    await sleep(50);
    expect(x.got.filter((m) => m.kind === 'ack' && m.commandId === a).map((m) => (m as Ack).accepted)).toEqual([true, true]);
    expect(noticesTo(x.got, 'lr.1')).toHaveLength(1);
  });

  it('a phone not signed in, an unknown preparation, another device\'s id space: refused, nothing shown', async () => {
    const { x } = await flagged();
    const stranger = peer(x.relay, 'ph.9', 'instructor', 'remote');
    stranger.hello({ pin: '0000' });
    await waitFor(() => grants(x.got, 'ph.9').length > 0);
    expect((await ack(x.got, stranger.command(notice(KEY, 'p0000030')))).accepted).toBe(false);
    expect((await ack(x.panelGot, x.laptop.command(notice(KEY, 'nope0000')))).accepted).toBe(false);
    expect((await ack(x.panelGot, x.laptop.command(notice(KEY2, 'p0000030')))).accepted).toBe(false);
    expect(noticesTo(x.got, 'lr.1')).toHaveLength(0);
    expect(x.host.preparation(KEY, 'p0000030')?.notice).toBeNull();
  });

  it('a phone that signs in after the staging (or again, after its page reloaded) gets the instructor copy of what stands, with its given time', async () => {
    const { x, lr } = await flagged();
    x.tg.at(200); // past the fixture powder's 120 s
    expect((await lr.send(deliver('p0000030', 1))).accepted).toBe(true);
    await phone(x, 'ph.late');
    await waitFor(() => preps(x.got).filter((e) => e.to === x.host.peerId).length >= 3);
    const last = preps(x.got).filter((e) => e.to === x.host.peerId).at(-1)!;
    expect(last.body).toMatchObject({ news: 'made', prep: { id: 'p0000030', by: KEY, name: 'Bed 2', givenAt: 200, notice: null } });
  });

  it('a learner remote can never send it: refused on the host (no relay in between), for its own preparation too', async () => {
    const { x, lr } = await flagged();
    const r = await lr.send(notice(KEY, 'p0000030'));
    expect(r.accepted).toBe(false);
    expect(noticesTo(x.got, 'lr.1')).toHaveLength(0);
    expect(x.host.preparation(KEY, 'p0000030')?.notice).toBeNull();
  });

  it("a Give before the notice is given; the give's record says no notice; a notice pressed after it is still shown and recorded", async () => {
    const tg = fakeTarget();
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: tg.t, submit: (c) => (hs as HostSession).submit(c), publish: () => undefined, preparation: (by, id, drugId) => hs?.preparation(by, id, drugId) });
    hs = new HostSession({ session: S, target: driver.host, scenario: driver.hook, stateIntervalMs: 0, learnerPin: () => LEARNER_PIN, formulary: () => BENCH, onPreparation: (p) => driver.recordPreparation(p) });
    hosts.push(hs);
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const relay = hub.connect();
    const got = collect(relay);
    const lr = peer(relay, 'lr.1', 'learner');
    lr.hello({ show: 'learner', device: KEY, pin: LEARNER_PIN });
    await waitFor(() => grants(got, 'lr.1').some((g) => g.granted));
    tg.at(60);
    expect((await ack(got, lr.command(stage('p0000031', { diluent: { id: 'saline', volumeMl: 10 }, container: 'bag-pvc' })))).accepted).toBe(true);
    tg.at(200);
    expect((await ack(got, lr.command(deliver('p0000031', 1)))).accepted).toBe(true);
    const given = hs.preparation(KEY, 'p0000031');
    expect(given?.notice).toBeNull();
    const panelHub = createInProcessHub();
    hs.addTransport(panelHub.connect());
    const panelT = panelHub.connect();
    const panelGot = collect(panelT);
    const laptop = peer(panelT, 'panel-1', 'controller', 'instructor');
    laptop.hello();
    tg.at(230);
    expect((await ack(panelGot, laptop.command(notice(KEY, 'p0000031')))).accepted).toBe(true);
    expect(hs.preparation(KEY, 'p0000031')?.notice).toEqual({ shownAt: 230 });
  });
});
