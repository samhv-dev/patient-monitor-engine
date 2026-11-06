// The same drug is not given twice within 10 s of simulated time, from any device (the owner's ruling of 5 November
// 2026: a guard against two hands entering one event). The host refuses the second bolus with reason code `recent`, the
// seconds and the device; the refused press never reaches the target (so neither the engine nor the scenario driver,
// which wraps the target's dispatch and keeps the /2 administration record, sees it) and no commandApplied goes out.
import { afterEach, describe, expect, it } from 'vitest';
import type { Command, DispatchResult } from '@pme/engine-core';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { RecentGives, SAME_DRUG_LOCK_S } from '../../src/session/drug-lock.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

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
