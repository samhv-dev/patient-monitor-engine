// The same drug is not given twice within 10 s of simulated time, from any device (the owner's ruling of 5 November
// 2026: a guard against two hands entering one event). The host refuses the second bolus with reason code `recent`, the
// seconds and the device; the refused press never reaches the target (so neither the engine nor the scenario driver,
// which wraps the target's dispatch and keeps the /2 administration record, sees it) and no commandApplied goes out.
import { afterEach, describe, expect, it } from 'vitest';
import type { Command, DispatchResult } from '@pme/engine-core';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { RecentGives, SAME_DRUG_LOCK_S } from '../../src/session/drug-lock.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { type AckResult, createStamper, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

const S = 'DRG234';
const PIN = '4729';
type Ack = Extract<WireMessage, { kind: 'ack' }>;

/** A target on a clock the test moves (`at(s)`); it accepts every command and counts what reached it. */
function fakeTarget() {
  let tick = 0;
  const got: Command[] = [];
  const t: HostTarget = {
    dispatch: (c): DispatchResult => (got.push(c), { accepted: true, tick: Math.max(tick, c.atTick ?? 0) }),
    snapshot: () => ({ schema: 'x', tick } as never),
    restore: () => undefined,
    on: () => () => undefined,
    now: () => ({ tick, simT: tick * 0.02 }),
    time: () => undefined,
  };
  return { t, got, at: (s: number) => void (tick = Math.round(s / 0.02)) };
}

const hosts: HostSession[] = [];
afterEach(() => {
  for (const h of hosts.splice(0)) h.close();
});

/** A host with the laptop's panel (a controller, issuedBy 'instructor') and a granted instructor phone. */
async function setup() {
  const tg = fakeTarget();
  const host = new HostSession({ session: S, target: tg.t, stateIntervalMs: 0, instructorPin: () => PIN });
  hosts.push(host);
  const wire = (from: string, issuedBy: string, role: 'controller' | 'instructor') => {
    const hub = createInProcessHub();
    host.addTransport(hub.connect());
    const end: ManagedTransport = hub.connect();
    const got = collect(end);
    const st = createStamper(S, from);
    let n = 0;
    end.send(st({ kind: 'hello', role, ...(role === 'instructor' ? { pin: PIN } : {}) }));
    const send = (body: Record<string, unknown>) => {
      const id = `${from}-${++n}`;
      end.send(st({ kind: 'command', body: { id, issuedBy, ...body } as never }));
      return id;
    };
    const ack = async (id: string) => {
      await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === id));
      return got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id) as Ack;
    };
    const applied = (id: string) => got.some((m) => m.kind === 'event' && m.body.some((e) => e.type === 'commandApplied' && e.commandId === id));
    return { send, ack, applied, got };
  };
  const laptop = wire('panel-1', 'instructor', 'controller');
  const phone = wire('ph.1', 'ph.1', 'instructor');
  await waitFor(() => phone.got.some((m) => m.kind === 'grant' && m.granted));
  return { host, tg, laptop, phone };
}

const epi = { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } };
const epiHalf = { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 0.5, unit: 'mg', route: 'io' } };
const amio = { type: 'applyEvent', event: { kind: 'drug', drugId: 'amiodarone', dose: 300, unit: 'mg', route: 'iv' } };
const noradInfusion = { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 0.05, unit: 'mcg/kg/min', route: 'iv', infusion: true } };
const tci = { type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 } };

describe('the same drug twice within 10 s of sim time', () => {
  it('laptop at 0 s, phone at 4 s → the phone is refused `recent`, "given 4 s ago from the laptop"; the target never sees it', async () => {
    const { tg, laptop, phone, host } = await setup();
    tg.at(100);
    const a = laptop.send(epi);
    expect(await laptop.ack(a)).toMatchObject({ accepted: true });
    tg.at(104);
    const b = phone.send(epiHalf); // any dose, any route
    const ack = await phone.ack(b);
    expect(ack).toMatchObject({ accepted: false, code: 'recent', reason: 'given 4 s ago from the laptop', recent: { drugId: 'epinephrine', agoS: 4, by: 'laptop' } });
    expect(tg.got.filter((c) => (c as { event?: { drugId?: string } }).event?.drugId === 'epinephrine')).toHaveLength(1);
    await new Promise((r) => setTimeout(r, 20));
    expect(phone.applied(b) || laptop.applied(b)).toBe(false); // no commandApplied: nothing of it reaches the record
    expect(host.stats).toMatchObject({ applied: 1, rejected: 1 });
  });

  it('phone at 0 s, laptop at 4 s → the laptop is refused, "given 4 s ago from the phone"', async () => {
    const { tg, laptop, phone } = await setup();
    tg.at(10);
    expect(await phone.ack(phone.send(epi))).toMatchObject({ accepted: true });
    tg.at(14);
    expect(await laptop.ack(laptop.send(epi))).toMatchObject({ accepted: false, code: 'recent', reason: 'given 4 s ago from the phone', recent: { by: 'phone' } });
  });

  it("the laptop's own double press at 4 s → refused too", async () => {
    const { tg, laptop } = await setup();
    tg.at(0);
    expect(await laptop.ack(laptop.send(epi))).toMatchObject({ accepted: true });
    tg.at(4);
    expect(await laptop.ack(laptop.send(epi))).toMatchObject({ accepted: false, code: 'recent', reason: 'given 4 s ago from the laptop' });
  });

  it('at 11 s → applied; exactly 10 s → applied (the lock is the 10 s before)', async () => {
    const { tg, laptop, phone } = await setup();
    tg.at(0);
    await laptop.ack(laptop.send(epi));
    tg.at(11);
    expect(await phone.ack(phone.send(epi))).toMatchObject({ accepted: true });
    tg.at(11 + SAME_DRUG_LOCK_S);
    expect(await laptop.ack(laptop.send(epi))).toMatchObject({ accepted: true });
  });

  it('a different drug at 4 s → applied; an infusion change and a TCI change at 4 s → applied (not a bolus)', async () => {
    const { tg, laptop, phone } = await setup();
    tg.at(0);
    await laptop.ack(laptop.send(epi));
    tg.at(4);
    expect(await phone.ack(phone.send(amio))).toMatchObject({ accepted: true });
    expect(await phone.ack(phone.send(noradInfusion))).toMatchObject({ accepted: true });
    expect(await laptop.ack(laptop.send(tci))).toMatchObject({ accepted: true });
    tg.at(5);
    expect(await laptop.ack(laptop.send(amio))).toMatchObject({ accepted: false, reason: 'given 1 s ago from the phone' });
  });

  it("a drug the card's script gave (host.submit) locks a press: \"by the card\"; the script itself is never refused", async () => {
    const { tg, laptop, host } = await setup();
    tg.at(0);
    expect((await host.submit({ id: 'card-1', issuedBy: 'scenario', ...epi } as never)).accepted).toBe(true);
    tg.at(3);
    expect((await host.submit({ id: 'card-2', issuedBy: 'scenario', ...epi } as never)).accepted).toBe(true);
    tg.at(6);
    expect(await laptop.ack(laptop.send(epi))).toMatchObject({ accepted: false, reason: 'given 3 s ago by the card' });
  });

  it('a new timeline (restart, restore) clears the lock: its clock starts again', async () => {
    const { tg, laptop, host } = await setup();
    tg.at(50);
    await laptop.ack(laptop.send(epi));
    tg.at(0);
    host.newTimeline('restore');
    tg.at(2);
    expect(await laptop.ack(laptop.send(epi))).toMatchObject({ accepted: true });
  });
});

describe('RecentGives (the one table, on the host and on every device)', () => {
  it('locks a bolus for SAME_DRUG_LOCK_S, counts down, and ignores infusions', () => {
    const g = new RecentGives();
    g.note({ id: 'a', issuedBy: 'remote', ...epi } as never, 20);
    g.note({ id: 'b', issuedBy: 'instructor', ...noradInfusion, event: { ...noradInfusion.event, drugId: 'norepinephrine' } } as never, 20);
    expect(g.lock('epinephrine', 24)).toEqual({ drugId: 'epinephrine', agoS: 4, leftS: 6, by: 'phone' });
    expect(g.lock('epinephrine', 30)).toBeNull();
    expect(g.lock('norepinephrine', 21)).toBeNull();
  });
});

describe("every device reads the host's lock from the commandApplied it receives (ControllerSession.gives)", () => {
  it('a laptop panel and a phone session both see the drug locked, with who gave it, and a new timeline clears it', async () => {
    const { ControllerSession } = await import('../../src/session/controller-session.ts');
    const tg = fakeTarget();
    const host = new HostSession({ session: S, target: tg.t, stateIntervalMs: 0 });
    hosts.push(host);
    const mk = (issuedBy: string) => {
      const hub = createInProcessHub();
      host.addTransport(hub.connect());
      return new ControllerSession({ session: S, transport: hub.connect(), issuedBy });
    };
    const laptop = mk('instructor');
    const phone = mk('remote');
    await waitFor(() => laptop.hostOnline && phone.hostOnline);
    tg.at(30);
    expect((await phone.send(epi as never)).accepted).toBe(true);
    await waitFor(() => laptop.gives.lock('epinephrine', 33) !== null);
    expect(laptop.gives.lock('epinephrine', 33)).toMatchObject({ agoS: 3, by: 'phone' });
    expect(phone.gives.lock('epinephrine', 33)).toMatchObject({ agoS: 3, by: 'phone' });
    tg.at(33);
    const r = await laptop.send(epi as never);
    expect(r).toMatchObject({ accepted: false, reason: 'given 3 s ago from the phone' });
    host.newTimeline('restart');
    await waitFor(() => laptop.gives.lock('epinephrine', 33) === null);
  });
});

describe("a /1 card step whose onEnter gives a locked drug: the TRIGGER is refused (the orchestrator's ruling, reversible by the owner)", () => {
  // The card's script is never altered: the press is refused with the same ack, and the instructor presses again after
  // the lock. A step whose onEnter gives a different drug is applied.
  const card = {
    schema: 'pme-scenario/1', id: 'lock-card', title: 'lock card', seed: 1, initialState: 'a',
    states: [
      { id: 'a', transitions: [{ id: 'giveEpi', to: 'epi', when: { manual: { label: 'Epinephrine 1 mg' } } }, { id: 'giveAmio', to: 'amio', when: { manual: { label: 'Amiodarone 300 mg' } } }] },
      { id: 'epi', onEnter: [epi], transitions: [{ id: 'back', to: 'a', when: { manual: { label: 'Back' } } }] },
      { id: 'amio', onEnter: [amio], transitions: [{ id: 'back2', to: 'a', when: { manual: { label: 'Back' } } }] },
    ],
  };
  async function withCard() {
    const { manualHost } = await import('../fakes/manual-host.ts');
    const { ScenarioDriver } = await import('../../src/scenario/driver.ts');
    const mh = manualHost({ seed: 4 });
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: mh, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: S, target: driver.host, stateIntervalMs: 0, scenario: driver.hook, scenarioGives: (c) => driver.triggerGives(c) });
    hosts.push(hs);
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const end = hub.connect();
    const got = collect(end);
    const st = createStamper(S, 'panel-1');
    let n = 0;
    const send = async (body: Record<string, unknown>) => {
      const id = `panel-1-${++n}`;
      end.send(st({ kind: 'command', body: { id, issuedBy: 'instructor', ...body } as never }));
      await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === id));
      return got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id) as Ack;
    };
    const to = (s: number) => {
      mh.engine.advanceTo(s);
      driver.poll();
    };
    const state = () => driver.runner?.stateId;
    expect(await send({ type: 'scenario', action: 'load', doc: card })).toMatchObject({ accepted: true });
    to(1);
    return { send, to, state, driver };
  }
  const press = (target: string) => ({ type: 'scenario', action: 'trigger', target });

  it("a step press at 4 s after the laptop's bolus → refused `recent`, the card does not move; at 11 s → applied", async () => {
    const c = await withCard();
    expect(await c.send(epi)).toMatchObject({ accepted: true });
    c.to(5);
    expect(await c.send(press('giveEpi'))).toMatchObject({ accepted: false, code: 'recent', reason: 'given 4 s ago from the laptop', recent: { drugId: 'epinephrine', agoS: 4, by: 'laptop' } });
    c.to(5.1);
    expect(c.state()).toBe('a'); // the card did not move; its script is unchanged
    c.to(12);
    expect(await c.send(press('giveEpi'))).toMatchObject({ accepted: true });
    c.to(12.2);
    expect(c.state()).toBe('epi');
  });

  it('a step whose onEnter gives a different drug at 4 s → applied', async () => {
    const c = await withCard();
    expect(await c.send(epi)).toMatchObject({ accepted: true });
    c.to(5);
    expect(await c.send(press('giveAmio'))).toMatchObject({ accepted: true });
    c.to(5.2);
    expect(c.state()).toBe('amio');
  });

  it('triggerGives reads the current state: a transition not in it, or a /1 runner absent, gives nothing', async () => {
    const c = await withCard();
    expect(c.driver.triggerGives(press('giveEpi') as never)).toEqual(['epinephrine']);
    expect(c.driver.triggerGives(press('back') as never)).toEqual([]);
    expect(c.driver.triggerGives({ type: 'scenario', action: 'goto', target: 'epi' } as never)).toEqual([]);
  });
});

it("the refusal's code reaches the pressing device's ControllerSession ack (AckResult.code)", async () => {
  const { ControllerSession } = await import('../../src/session/controller-session.ts');
  const tg = fakeTarget();
  const host = new HostSession({ session: S, target: tg.t, stateIntervalMs: 0 });
  hosts.push(host);
  const hub = createInProcessHub();
  host.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'instructor' });
  await waitFor(() => ctl.hostOnline);
  await ctl.send(epi as never);
  tg.at(2);
  expect(await ctl.send(epi as never)).toMatchObject({ accepted: false, code: 'recent', reason: 'given 2 s ago from the laptop' });
});

describe("a staged delivery (one stageGroup, `batch` of n) is checked against the lock in the delivery's order", () => {
  // Brief 83: the items of a staged delivery were all checked against the lock on arrival, BEFORE any of them was
  // recorded as given (they are held until all n are in), so a delivery carrying the same bolus twice applied both,
  // where the one-at-a-time path refuses the second. Each item is now checked against the lock as the delivery's
  // earlier items have set it.
  async function staged(withGroup: boolean) {
    const { ControllerSession } = await import('../../src/session/controller-session.ts');
    const tg = fakeTarget();
    const groups: Command[][] = [];
    const t: HostTarget = withGroup ? { ...tg.t, dispatchGroup: (cs) => (groups.push(cs), cs.map((c) => tg.t.dispatch(c) as DispatchResult)) } : tg.t;
    const host = new HostSession({ session: S, target: t, stateIntervalMs: 0 });
    hosts.push(host);
    const hub = createInProcessHub();
    host.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'instructor' });
    await waitFor(() => ctl.hostOnline);
    tg.at(20);
    const deliver = (id: string, a: Record<string, unknown>, b: Record<string, unknown>) =>
      Promise.all([a, b].map((c) => ctl.send({ ...c, stageGroup: id, batch: { id, n: 2 } } as never))) as Promise<[AckResult, AckResult]>;
    return { tg, groups, ctl, deliver };
  }
  const reached = (got: Command[], drugId: string) => got.filter((c) => (c as { event?: { drugId?: string } }).event?.drugId === drugId);

  it('the same bolus twice → the first applied, the second refused with the one-at-a-time refusal; the log reads one give, one refusal, in order', async () => {
    // the one-at-a-time path, on the same clock: its refusal of the second press is the reference
    const one = await staged(false);
    expect((await one.ctl.send(epi as never)).accepted).toBe(true);
    const ref = await one.ctl.send(epi as never);
    expect(ref).toMatchObject({ accepted: false, code: 'recent' });
    one.ctl.close();

    const s = await staged(true);
    const [ra, rb] = await s.deliver('cache-e', epi, epi);
    expect(ra.accepted).toBe(true);
    expect(rb).toMatchObject({ accepted: false, code: 'recent', reason: ref.reason });
    expect(rb.reason).toBe('given 0 s ago from the laptop');
    expect(reached(s.tg.got, 'epinephrine')).toHaveLength(1); // one dose reached the engine
    expect(s.ctl.log.filter((l) => l.commandId === 'cache-e').map((l) => l.text)).toEqual([
      'staged ×2: event drug epinephrine 1 mg iv · event drug epinephrine 1 mg iv (refused: given 0 s ago from the laptop)',
    ]);
    s.ctl.close();
  });

  it('two different drugs → both applied, in one dispatch', async () => {
    const s = await staged(true);
    const [ra, rb] = await s.deliver('cache-d', epi, amio);
    expect(ra.accepted && rb.accepted).toBe(true);
    expect(s.groups).toHaveLength(1);
    expect(s.groups[0]?.map((c) => (c as { event?: { drugId?: string } }).event?.drugId)).toEqual(['epinephrine', 'amiodarone']);
    expect(s.ctl.log.filter((l) => l.commandId === 'cache-d').map((l) => l.text)).toEqual(['staged ×2: event drug epinephrine 1 mg iv · event drug amiodarone 300 mg iv']);
    s.ctl.close();
  });

  it('a bolus given while the delivery is held locks its held item: the lock is read when the delivery is applied', async () => {
    const s = await staged(true);
    const id = 'cache-h';
    const first = s.ctl.send({ ...amio, stageGroup: id, batch: { id, n: 2 } } as never); // held: its second item is late
    await sleep(10);
    expect((await s.ctl.send(amio as never)).accepted).toBe(true); // a press of the same drug meanwhile, applied
    const second = s.ctl.send({ ...epi, stageGroup: id, batch: { id, n: 2 } } as never);
    const [ra, rb] = await Promise.all([first, second]);
    expect(ra).toMatchObject({ accepted: false, code: 'recent', reason: 'given 0 s ago from the laptop' });
    expect(rb.accepted).toBe(true);
    expect(reached(s.tg.got, 'amiodarone')).toHaveLength(1);
    s.ctl.close();
  });
});

// Plan learner-action-remote.md L4: a learner remote's delivery meets the lock exactly as the laptop's gives do. Its
// preparations are made from the L2 fixture layer (TEST DATA ONLY: invented drugs, numbers [ENG: test]); the refusal
// names the device kind, "from a learner's remote" (GivenBy 'learner').
describe("a learner remote's delivery meets the same lock, and a tray of preparations is one staged delivery", () => {
  /** `layer: 'shipped'`: the formulary as shipped (packages/controller/formulary/), read as the source check reads it. */
  async function learnerSetup(layer: 'fixture' | 'shipped' = 'fixture') {
    const { loadFormulary } = await import('../../src/formulary/load.ts');
    const { BENCH_IDS, benchFiles } = await import('../formulary/fixtures/bench.fixture.ts');
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join, relative } = await import('node:path');
    const dir = new URL('../../formulary', import.meta.url).pathname;
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const files = Object.fromEntries(walk(dir).filter((x) => x.endsWith('.json')).map((x) => [relative(dir, x), JSON.parse(readFileSync(x, 'utf8')) as unknown]));
    const f = layer === 'shipped' ? loadFormulary(files) : loadFormulary(benchFiles(), BENCH_IDS);
    if (!f.ok) throw new Error('the L2 fixture layer breaks §5');
    const tg = fakeTarget();
    const groups: Command[][] = [];
    const t: HostTarget = { ...tg.t, dispatchGroup: (cs) => (groups.push(cs), cs.map((c) => tg.t.dispatch(c) as DispatchResult)) };
    const host = new HostSession({ session: S, target: t, stateIntervalMs: 0, learnerPin: () => '582913', formulary: () => f.formulary });
    hosts.push(host);
    const wire = (from: string, role: 'controller' | 'learner', issuedBy: string) => {
      const hub = createInProcessHub();
      host.addTransport(hub.connect());
      const end: ManagedTransport = hub.connect();
      const got = collect(end);
      const st = createStamper(S, from);
      let n = 0;
      end.send(st({ kind: 'hello', role, ...(role === 'learner' ? { show: 'learner', device: 'remote0001', pin: '582913' } : {}) } as never));
      const send = (body: Record<string, unknown>) => {
        const id = `${from}-${++n}`;
        end.send(st({ kind: 'command', body: { id, issuedBy, ...body } as never }));
        return id;
      };
      const ack = async (id: string) => {
        await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === id));
        return got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id) as Ack;
      };
      return { send, ack, got };
    };
    const laptop = wire('panel-1', 'controller', 'instructor');
    const remote = wire('lr.1', 'learner', 'learner');
    await waitFor(() => remote.got.some((m) => m.kind === 'grant' && m.granted));
    const stage = async (id: string, productId = 'fixture-solution') =>
      expect((await remote.ack(remote.send({ type: 'prep', action: 'stage', prep: { id, components: [{ productId, amount: 4, unit: 'mL' }] } }))).accepted).toBe(true);
    return { tg, groups, laptop, remote, stage };
  }
  const bolus = { type: 'applyEvent', event: { kind: 'drug', drugId: 'benchsolution', dose: 10, unit: 'mg', route: 'iv' } };
  const give = (prepId: string, extra: Record<string, unknown> = {}) => ({ type: 'prep', action: 'deliver', prepId, volumeMl: 2, route: 'iv', ...extra });

  it("the learner at 0 s, the laptop at 4 s → the laptop is refused, \"given 4 s ago from a learner's remote\"", async () => {
    const s = await learnerSetup();
    await s.stage('p0000001');
    s.tg.at(30);
    expect((await s.remote.ack(s.remote.send(give('p0000001')))).accepted).toBe(true);
    s.tg.at(34);
    expect(await s.laptop.ack(s.laptop.send(bolus))).toMatchObject({ accepted: false, code: 'recent', reason: "given 4 s ago from a learner's remote", recent: { by: 'learner' } });
  });

  it('the laptop at 0 s, the learner at 4 s → the learner is refused, "given 4 s ago from the laptop"; nothing is taken from the syringe', async () => {
    const s = await learnerSetup();
    await s.stage('p0000002');
    s.tg.at(30);
    expect((await s.laptop.ack(s.laptop.send(bolus))).accepted).toBe(true);
    s.tg.at(34);
    expect(await s.remote.ack(s.remote.send(give('p0000002')))).toMatchObject({ accepted: false, code: 'recent', reason: 'given 4 s ago from the laptop' });
    s.tg.at(45);
    expect((await s.remote.ack(s.remote.send(give('p0000002', { volumeMl: 'all' })))).accepted).toBe(true);
    expect((s.tg.got.at(-1) as unknown as { event: { dose: number } }).event.dose).toBe(20); // the whole 4 mL × 5 mg/mL: the refused push took none
  });

  it("a tray of three preparations in one stageGroup applies in one dispatch and meets the lock item by item (#337's rule)", async () => {
    // the shipped fentanyl (50 mcg/mL) and midazolam (5 mg/mL), drawn undiluted: fentanyl, midazolam, fentanyl again
    const s = await learnerSetup('shipped');
    await s.stage('p0000003', 'fentanyl-50mcg-ml');
    await s.stage('p0000004', 'hypnovel-5mg-ml');
    await s.stage('p0000005', 'fentanyl-50mcg-ml');
    s.tg.at(60);
    const tray = { stageGroup: 'tray-1', batch: { id: 'tray-1', n: 3 } };
    const ids = ['p0000003', 'p0000004', 'p0000005'].map((p) => s.remote.send(give(p, tray)));
    const acks = await Promise.all(ids.map((id) => s.remote.ack(id)));
    expect(acks.map((a) => a.accepted)).toEqual([true, true, false]);
    expect(acks[2]).toMatchObject({ code: 'recent', reason: "given 0 s ago from a learner's remote" });
    expect(s.groups).toHaveLength(1); // one dispatch: the two that passed the lock, on one tick
    expect(s.groups[0]?.map((c) => [(c as unknown as { event: { drugId: string; dose: number; unit: string } }).event, (c as { prepId?: string }).prepId])).toEqual([
      [{ kind: 'drug', drugId: 'fentanyl', dose: 100, unit: 'mcg', route: 'iv' }, 'p0000003'], // 2 mL × 50 mcg/mL × r 1
      [{ kind: 'drug', drugId: 'midazolam', dose: 10, unit: 'mg', route: 'iv' }, 'p0000004'], // 2 mL × 5 mg/mL × r 1
    ]);
    expect(new Set(s.groups[0]?.map((c) => c.atTick)).size).toBe(1);
  });

  it('a tray of three different drugs → all three in ONE dispatch, on one tick, each filed with its own preparation', async () => {
    const s = await learnerSetup();
    await s.stage('p0000006');
    expect((await s.remote.ack(s.remote.send({ type: 'prep', action: 'stage', prep: { id: 'p0000007', components: [{ productId: 'fixture-powder-vial', amount: 1, unit: 'vial' }], diluent: { id: 'water', volumeMl: 0 } } }))).accepted).toBe(true);
    expect((await s.remote.ack(s.remote.send({ type: 'prep', action: 'stage', prep: { id: 'p0000008', components: [{ productId: 'fixture-ampoule', amount: 1, unit: 'mg' }] } }))).reason).toBe("fixture-ampoule's label gives no concentration");
    s.tg.at(600);
    const tray = { stageGroup: 'tray-2', batch: { id: 'tray-2', n: 2 } };
    const acks = await Promise.all([s.remote.send(give('p0000006', tray)), s.remote.send(give('p0000007', tray))].map((id) => s.remote.ack(id)));
    expect(acks.every((a) => a.accepted)).toBe(true);
    expect(s.groups).toHaveLength(1);
    expect(s.groups[0]?.map((c) => [(c as unknown as { event: { drugId: string } }).event.drugId, (c as { prepId?: string }).prepId, c.atTick])).toEqual([
      ['benchsolution', 'p0000006', s.groups[0]?.[0]?.atTick], ['benchpowder', 'p0000007', s.groups[0]?.[0]?.atTick],
    ]);
  });
});
