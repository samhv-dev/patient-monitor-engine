// The driver inside a HostSession: controllers load/trigger/pause over the wire, runner commands reach viewers
// as commandApplied, late joiners get the doc and the current state, bookmarks carry the runner state.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession, STAGE_LEAD_TICKS } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { StageBuffer } from '../../src/panel/staging.ts';
import type { AppliedResolution, ScenarioEvent, WireEvent } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'SCN234';
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

function setup() {
  const host = manualHost({ seed: 42 });
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
  hs = new HostSession({ session: S, target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close());
  /** Advance sim time tick by tick, polling the driver like a frame loop would. */
  const run = async (toS: number) => {
    for (let tick = host.engine.now().tick + 1; tick <= Math.round(toS * 50); tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
      // Yield once per sim-minute so long runs do not starve the Vitest worker RPC on slow CI.
      if (tick % 3000 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    }
  };
  return { host, hs: hs as HostSession, driver, hub, ctl, run };
}

describe('scenario over a HostSession', () => {
  it('a controller loads a built-in by id; its view gets the doc and follows the state', async () => {
    const { ctl, run } = setup();
    await waitFor(() => ctl.hostOnline);
    const ack = await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    expect(ack.accepted).toBe(true);
    await waitFor(() => ctl.scenario.doc?.id === 'acls-vf-witnessed');
    expect(ctl.scenario.stateLabel()).toBe('Stable in PACU');
    await run(60.02);
    await waitFor(() => ctl.scenario.stateId === 'vf');
    expect(ctl.log.some((l) => l.kind === 'scenario' && l.text === '→ vf (arrest)')).toBe(true);
    expect(ctl.scenario.next().map((n) => n.manual)).toEqual([null, null, null, 'ROSC now']);
  });

  it('runner commands go through the host: stats, one stage group on one tick, commandApplied for viewers', async () => {
    const { ctl, hub, hs, run, host } = setup();
    const watcher = hub.connect();
    const got = collect(watcher);
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    await run(60.02);
    await waitFor(() => got.some((m) => m.kind === 'event' && m.body.some((e) => e.type === 'commandApplied' && (e.resolved as AppliedResolution).command.issuedBy === 'scenario' && (e.resolved as AppliedResolution).command.type === 'setRhythm' && ((e.resolved as AppliedResolution).command as { rhythm: string }).rhythm === 'vfCoarse')));
    const applied = got.flatMap((m) => (m.kind === 'event' ? m.body : [])).filter((e): e is Extract<WireEvent, { type: 'commandApplied' }> => e.type === 'commandApplied');
    const setup0 = applied.filter((e) => (e.resolved as AppliedResolution).command.stageGroup === 'scenario-1');
    expect(new Set(setup0.map((e) => e.tick)).size).toBe(1); // one stage group → one tick
    expect(hs.stats.applied).toBeGreaterThanOrEqual(3);
    expect(host.engine.now().tick).toBe(3001);
  });

  it('manual trigger from a controller fires at once; an unknown transition is refused', async () => {
    const { ctl, run } = setup();
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    await run(1);
    expect((await ctl.send({ type: 'scenario', action: 'trigger', target: 'nope' })).reason).toBe('no transition nope in state stable');
    expect((await ctl.send({ type: 'scenario', action: 'trigger', target: 'arrest' })).accepted).toBe(true);
    await waitFor(() => ctl.scenario.stateId === 'vf');
  });

  // For the record (plan IP1, answer 11 keeps card steps out of the cache, so nothing depends on this). What a scenario
  // `trigger` staged in one batch with a bolus does today:
  // - the bolus lands on the batch's tick (arrival + STAGE_LEAD_TICKS); the trigger is applied AT ONCE, on the arrival
  //   tick (scenario commands go to the hook, which has no stage groups), and the state changes on that tick;
  // - the new state's onEnter goes out in its OWN stage group (`scenario-n`, no batch stamp), STAGE_LEAD_TICKS after the
  //   press. Here that is the batch's tick too, only because both groups opened on the same host tick (nothing ran
  //   between the two arrivals); it is a separate group, so nothing ties it there (plan R4);
  // - the controller's log names the trigger as an item of the batch's one line; its commandApplied keeps the stamp.
  it('RECORD (IP1, Q11): a scenario trigger inside a staged batch is applied at once, outside the batch tick', async () => {
    const { ctl, hub, run, host } = setup();
    const watcher = hub.connect();
    const got = collect(watcher);
    const applied = () => got.flatMap((m) => (m.kind === 'event' ? m.body : [])).filter((e): e is Extract<WireEvent, { type: 'commandApplied' }> => e.type === 'commandApplied').map((e) => ({ tick: e.tick, c: (e.resolved as AppliedResolution).command }));
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    await waitFor(() => applied().some((a) => a.c.stageGroup === 'scenario-1')); // the setup batch is in
    await run(2);
    const t1 = host.engine.now().tick;
    const b = new StageBuffer(ctl.peerId);
    b.stage({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 0.01, unit: 'mg', route: 'iv' } }, 'drug');
    b.stage({ type: 'scenario', action: 'trigger', target: 'arrest' }, 'step');
    const acks = await b.commit((c) => ctl.send(c), { batch: true });
    await waitFor(() => applied().some((a) => (a.c as { rhythm?: string }).rhythm === 'vfCoarse'));
    const batchId = `${ctl.peerId}-sg1`;
    expect(acks.map((a) => [a.accepted, a.tick])).toEqual([[true, t1 + STAGE_LEAD_TICKS], [true, t1]]);
    const bolus = applied().find((a) => a.c.type === 'applyEvent')!;
    const trigger = applied().find((a) => a.c.type === 'scenario' && a.c.action === 'trigger')!;
    const onEnter = applied().find((a) => (a.c as { rhythm?: string }).rhythm === 'vfCoarse')!;
    expect(bolus).toMatchObject({ tick: t1 + STAGE_LEAD_TICKS, c: { stageGroup: batchId, batch: { id: batchId, n: 2 } } });
    expect(trigger).toMatchObject({ tick: t1, c: { stageGroup: batchId, batch: { id: batchId, n: 2 } } });
    expect(trigger.c.atTick).toBeUndefined(); // the hook does not resolve the stage group
    expect(ctl.scenario.enteredT).toBeCloseTo(t1 * 0.02, 6); // the state changed on the press tick
    expect(onEnter.c.stageGroup).toMatch(/^scenario-\d+$/);
    expect(onEnter.c.batch).toBeUndefined();
    expect(onEnter.tick).toBe(t1 + STAGE_LEAD_TICKS);
    expect(ctl.log.filter((l) => l.commandId === batchId).map((l) => l.text)).toEqual(['staged ×2: event drug epinephrine 0.01 mg iv · scenario trigger arrest']);
  });

  it('an invalid document is refused with the path-level reason', async () => {
    const { ctl } = setup();
    await waitFor(() => ctl.hostOnline);
    const r = await ctl.send({ type: 'scenario', action: 'load', doc: { schema: 'pme-scenario/1', id: 'x', title: 'x', initialState: 'a', states: [{ id: 'a', transitions: [{ id: 't', to: 'a', when: {} }] }] } });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('invalid scenario: /states/0/transitions/0/when: a trigger must have exactly one of afterS, atScenarioS, vital, event, sensor, manual, all, any');
  });

  it('a late joiner gets the doc (sticky load) and the current state (welcome event)', async () => {
    const { ctl, hub, run } = setup();
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    await run(61);
    await ctl.send({ type: 'scenario', action: 'pause' });
    const late = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'remote' });
    cleanup.push(() => late.close());
    await waitFor(() => late.scenario.stateId === 'vf');
    expect(late.scenario.doc?.id).toBe('acls-vf-witnessed');
    expect(late.scenario.enteredT).toBe(60);
    expect(late.scenario.paused).toBe(true);
  });

  it('bookmarks through the host restore the runner state too', async () => {
    const { ctl, run, driver, host } = setup();
    await waitFor(() => ctl.hostOnline);
    await ctl.send({ type: 'scenario', action: 'load', target: 'acls-vf-witnessed' });
    await run(30);
    await ctl.send({ type: 'scenario', action: 'bookmark', target: 'calm' });
    await waitFor(() => ctl.bookmarks.includes('calm'));
    await run(65);
    expect(driver.runner?.stateId).toBe('vf');
    expect((await ctl.send({ type: 'scenario', action: 'restoreBookmark', target: 'calm' })).accepted).toBe(true);
    expect(host.engine.now().tick).toBe(1500);
    expect(driver.runner?.stateId).toBe('stable');
    await waitFor(() => ctl.scenario.stateId === 'stable');
  });
});
