// Learner remote L14 (the owner's ruling on finding N117, 12 November: B): while the case is paused, a learner device's
// command that gives a drug to the patient (a bolus from a preparation, starting an infusion from one, changing or stopping
// a running infusion) is REFUSED at the host with its own reason and code, `paused`: nothing reaches the engine's queue,
// nothing is recorded as given, and the host tells its own screens (onNotGiven) what was not given, by whom, so the Log and
// the record show the attempt. Preparing a drug does not act on the patient and stays allowed. After the resume the same
// give is accepted and acts as before. The pause is the host's own `time pause`, the one place the patient's clock stops.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { HostSession, type HostSessionOptions, type HostTarget, type NotGiven } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, PAUSED_REFUSAL, type ManagedTransport, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { loadFormulary } from '../../src/formulary/load.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { BENCH_IDS, benchFiles } from '../formulary/fixtures/bench.fixture.ts';
import { collect, waitFor } from '../helpers.ts';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FormularyFiles } from '../../src/formulary/types.ts';

const S = 'RMW234';
const LEARNER_PIN = '582913';
const KEY = 'remote0001';
const fixture = loadFormulary(benchFiles(), BENCH_IDS);
if (!fixture.ok) throw new Error('the L2 fixture layer breaks §5');
const BENCH = fixture.formulary;
const FOLDER = resolve(fileURLToPath(new URL('../../formulary', import.meta.url)));
const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const shipped = loadFormulary(Object.fromEntries(walk(FOLDER).filter((f) => f.endsWith('.json')).map((f) => [relative(FOLDER, f).split('\\').join('/'), JSON.parse(readFileSync(f, 'utf8')) as unknown])) as FormularyFiles);
if (!shipped.ok) throw new Error('the shipped formulary breaks §5');
const SHIPPED = shipped.formulary;

type Ack = Extract<WireMessage, { kind: 'ack' }>;
const hosts: HostSession[] = [];
afterEach(() => void hosts.splice(0).forEach((h) => h.close()));

/** A target on a clock the test moves; it accepts every command, keeps what reached it, and records its pause. */
function fakeTarget() {
  let tick = 0;
  const got: Command[] = [];
  const t: HostTarget & { paused: boolean } = {
    paused: false,
    dispatch: (c): DispatchResult => (got.push(c), { accepted: true, tick: Math.max(tick, c.atTick ?? 0) }),
    dispatchGroup: (cs) => cs.map((c) => t.dispatch(c) as DispatchResult),
    snapshot: () => ({ schema: 'x', tick } as never),
    restore: () => undefined,
    on: () => () => undefined,
    now: () => ({ tick, simT: tick * 0.02 }),
    time: (a) => void (a === 'pause' ? (t.paused = true) : a === 'resume' ? (t.paused = false) : undefined),
  };
  return { t, got, at: (s: number) => void (tick = Math.round(s / 0.02)) };
}
function peer(t: ManagedTransport, from: string, role: string, issuedBy = from) {
  const st = createStamper(S, from);
  let n = 0;
  return {
    hello: (extra: Record<string, unknown> = {}) => t.send(st({ kind: 'hello', role, ...extra } as never)),
    command: (body: Record<string, unknown>, id = `${from}-${++n}`) => (t.send(st({ kind: 'command', body: { id, issuedBy, ...body } as never })), id),
  };
}
const ackOf = (got: WireMessage[], id: string) => got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id);
async function ack(got: WireMessage[], id: string): Promise<Ack> {
  await waitFor(() => ackOf(got, id) !== undefined, 2000, `ack ${id}`);
  return ackOf(got, id) as Ack;
}
const events = (got: WireMessage[]) => got.flatMap((m) => (m.kind === 'event' ? m.body : []));
const appliedIds = (got: WireMessage[]) => events(got).filter((e) => e.type === 'commandApplied').map((e) => (e as Extract<WireEvent, { type: 'commandApplied' }>).commandId);
const prepNews = (got: WireMessage[]) => events(got).filter((e): e is Extract<WireEvent, { type: 'prep' }> => e.type === 'prep').map((e) => (e.body as { news: string }).news);

/** A host with the learner PIN, a transport standing for the relay, the laptop's own panel, and a learner signed in. */
async function setup(o: Partial<HostSessionOptions> = {}) {
  const tg = fakeTarget();
  const notGiven: NotGiven[] = [];
  const host = new HostSession({ session: S, target: tg.t, stateIntervalMs: 0, learnerPin: () => LEARNER_PIN, formulary: () => BENCH, onNotGiven: (n) => void notGiven.push(n), ...o });
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
  const lr = peer(relay, 'lr.1', 'learner', 'learner-page');
  lr.hello({ show: 'learner', device: KEY, pin: LEARNER_PIN });
  await waitFor(() => got.some((m) => m.kind === 'grant' && m.to === 'lr.1' && m.granted));
  const time = async (action: 'pause' | 'resume') => expect((await ack(panelGot, laptop.command({ type: 'time', action }))).accepted).toBe(true);
  const send = (body: Record<string, unknown>) => ack(got, lr.command(body));
  return { host, tg, got, panelGot, laptop, lr, time, send, notGiven };
}
const POWDER = { productId: 'fixture-powder-vial', amount: 1, unit: 'vial' };
const stage = (id: string) => ({ type: 'prep', action: 'stage', prep: { id, components: [POWDER], diluent: { id: 'water', volumeMl: 0 }, container: 'syringe-pp' } });
const deliver = (prepId: string, volumeMl: number | 'all' = 5) => ({ type: 'prep', action: 'deliver', prepId, volumeMl, route: 'iv' });
const drugCmds = (got: Command[]) => got.filter((c) => c.type === ('applyEvent' as Command['type']));

describe('L14: a learner device gives no drug while the case is paused', () => {
  it('a bolus from a preparation: refused at the host with the `paused` code and its words; nothing to the engine, no commandApplied, the preparation keeps its volume', async () => {
    const x = await setup();
    expect((await x.send(stage('p0000001'))).accepted).toBe(true);
    x.tg.at(200); // past the fixture powder's 120 s
    await x.time('pause');
    expect(x.host.paused).toBe(true);
    const id = x.lr.command(deliver('p0000001', 5));
    const a = await ack(x.got, id);
    expect(a).toMatchObject({ accepted: false, code: 'paused', reason: PAUSED_REFUSAL });
    expect(drugCmds(x.tg.got)).toEqual([]); // never dispatched: the engine's queue holds nothing
    expect(appliedIds(x.got)).not.toContain(id);
    expect(appliedIds(x.panelGot)).not.toContain(id);
    expect(prepNews(x.got)).toEqual(['made']); // no `delivered`: the phone is never told "Given"
    expect(x.host.preparation(KEY, 'p0000001')?.givenAt ?? null).toBeNull();
    // the host's own screens hear what was not given, who tried, and the dose the host computed
    expect(x.notGiven).toEqual([expect.objectContaining({ from: 'lr.1', reason: PAUSED_REFUSAL, t: 200, command: expect.objectContaining({ type: 'applyEvent', issuedBy: 'learner', by: KEY, prepId: 'p0000001', event: expect.objectContaining({ kind: 'drug', drugId: 'benchpowder', dose: 10 * (1 - (0.5 * 200) / (4 * 3600)), unit: 'mg' }) }) })]);
    // a resend of the same command keeps its answer (idempotent), even after the resume: it was not given
    await x.time('resume');
    x.lr.command(deliver('p0000001', 5), id);
    await waitFor(() => x.got.filter((m) => m.kind === 'ack' && m.commandId === id).length === 2);
    expect(x.got.filter((m): m is Ack => m.kind === 'ack' && m.commandId === id).map((m) => m.accepted)).toEqual([false, false]);
    expect(drugCmds(x.tg.got)).toEqual([]);
  });

  it('starting an infusion from a preparation, changing and stopping a running one: each refused while paused; nothing to the engine', async () => {
    const x = await setup();
    expect((await x.send(stage('p0000002'))).accepted).toBe(true);
    x.tg.at(200);
    expect((await x.send({ type: 'prep', action: 'infuse', prepId: 'p0000002', rateMlH: 10 })).accepted).toBe(true);
    const before = drugCmds(x.tg.got).length;
    await x.time('pause');
    for (const body of [
      { type: 'prep', action: 'infuse', prepId: 'p0000002', rateMlH: 12 },
      { type: 'infusion', action: 'set', drugId: 'benchpowder', rateMlH: 20 },
      { type: 'infusion', action: 'set', drugId: 'benchpowder', rateMlH: 0 },
    ]) expect(await x.send(body), JSON.stringify(body)).toMatchObject({ accepted: false, code: 'paused', reason: PAUSED_REFUSAL });
    expect(drugCmds(x.tg.got)).toHaveLength(before);
    expect(x.notGiven.map((n) => (n.command as { event: { kind: string; rate?: number } }).event)).toEqual([
      expect.objectContaining({ kind: 'infusion', rate: 12 }), expect.objectContaining({ kind: 'infusion', rate: 20 }), expect.objectContaining({ kind: 'infusion', rate: 0 }),
    ]);
  });

  it('a preparation of two drugs is one refusal (the first item\'s id), and each drug is named to the host\'s screens', async () => {
    const x = await setup({ formulary: () => SHIPPED });
    const mix = { type: 'prep', action: 'stage', prep: { id: 'm0000001', components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }, { productId: 'hypnovel-5mg-ml', amount: 2, unit: 'mL' }], diluent: { id: 'saline', volumeMl: 6 } } };
    expect((await x.send(mix)).accepted).toBe(true);
    await x.time('pause');
    expect(await x.send(deliver('m0000001', 5))).toMatchObject({ accepted: false, code: 'paused' });
    expect(drugCmds(x.tg.got)).toEqual([]);
    expect(x.notGiven.map((n) => (n.command as { event: { drugId: string } }).event.drugId)).toEqual(['fentanyl', 'midazolam']);
  });

  it('preparing stays allowed while paused: a stage and a discard are answered as before', async () => {
    const x = await setup();
    await x.time('pause');
    expect((await x.send(stage('p0000003'))).accepted).toBe(true);
    expect((await x.send({ type: 'prep', action: 'discard', prepId: 'p0000003' })).accepted).toBe(true);
    expect(prepNews(x.got)).toEqual(['made', 'discarded']);
    expect(x.notGiven).toEqual([]);
  });

  it("the instructor's own commands are not changed by this piece: the laptop's bolus during the pause is accepted as before", async () => {
    const x = await setup();
    await x.time('pause');
    const id = x.laptop.command({ type: 'applyEvent', event: { kind: 'drug', drugId: 'ephedrine', dose: 6, unit: 'mg', route: 'iv' } });
    expect((await ack(x.panelGot, id)).accepted).toBe(true);
    expect(drugCmds(x.tg.got)).toHaveLength(1);
  });

  it('the scenario driver records the refused attempt as an administration NOT accepted, with the reason (never as a given dose)', async () => {
    const tg = fakeTarget();
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: tg.t, submit: (c) => (hs as HostSession).submit(c), publish: () => undefined, preparation: (by, id, drugId) => hs?.preparation(by, id, drugId) });
    const admin: unknown[] = [];
    // the driver records only on a /2 card's runner; the test reads what it is handed
    driver.recordNotGiven = (c, reason) => void admin.push({ c, reason });
    hs = new HostSession({ session: S, target: driver.host, scenario: driver.hook, stateIntervalMs: 0, learnerPin: () => LEARNER_PIN, formulary: () => BENCH, onNotGiven: (n) => driver.recordNotGiven(n.command, n.reason) });
    hosts.push(hs);
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const relay = hub.connect();
    const got = collect(relay);
    const lr = peer(relay, 'lr.1', 'learner');
    lr.hello({ show: 'learner', device: KEY, pin: LEARNER_PIN });
    await waitFor(() => got.some((m) => m.kind === 'grant' && m.to === 'lr.1' && m.granted));
    expect((await ack(got, lr.command(stage('p0000004')))).accepted).toBe(true);
    tg.at(200);
    const panelHub = createInProcessHub();
    hs.addTransport(panelHub.connect());
    const panelT = panelHub.connect();
    const panelGot = collect(panelT);
    const laptop = peer(panelT, 'panel-1', 'controller', 'instructor');
    laptop.hello();
    expect((await ack(panelGot, laptop.command({ type: 'time', action: 'pause' }))).accepted).toBe(true);
    expect((await ack(got, lr.command(deliver('p0000004', 1)))).accepted).toBe(false);
    expect(admin).toEqual([{ c: expect.objectContaining({ type: 'applyEvent', by: KEY, prepId: 'p0000004' }), reason: PAUSED_REFUSAL }]);
  });
});

describe('L14 on the real engine: paused, the drug is not in the engine; resumed, the same give is', () => {
  it('the shipped fentanyl 2 mL: refused while paused (the engine reports no fentanyl after 2 s of run), accepted after the resume (the engine reports it)', async () => {
    const engine = createEngine({ seed: 7 });
    const dispatched: Command[] = [];
    let drugs: string[] = [];
    engine.on((e: EngineEvent) => void (e.type === 'drugs' && (drugs = e.drugs.map((d) => d.id))));
    const t: HostTarget = { dispatch: (c) => (dispatched.push(c), engine.dispatch(c)), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => undefined };
    const x = await setup({ target: t, formulary: () => SHIPPED });
    expect((await x.send({ type: 'prep', action: 'stage', prep: { id: 'f0000001', components: [{ productId: 'fentanyl-50mcg-ml', amount: 2, unit: 'mL' }] } })).accepted).toBe(true);
    await x.time('pause');
    expect(await x.send(deliver('f0000001', 1))).toMatchObject({ accepted: false, code: 'paused' });
    expect(dispatched.filter((c) => c.type === ('applyEvent' as Command['type']))).toEqual([]);
    engine.advanceTo(engine.now().simT + 2); // even if the clock ran, nothing is queued to act
    expect(drugs).not.toContain('fentanyl');
    await x.time('resume');
    const id = x.lr.command(deliver('f0000001', 1));
    expect((await ack(x.got, id)).accepted).toBe(true);
    expect(prepNews(x.got)).toContain('delivered');
    engine.advanceTo(engine.now().simT + 2);
    expect(drugs).toContain('fentanyl');
    expect(x.notGiven).toHaveLength(1); // only the paused attempt
  });
});
