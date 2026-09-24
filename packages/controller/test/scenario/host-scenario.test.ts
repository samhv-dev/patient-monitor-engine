// The driver inside a HostSession: controllers load/trigger/pause over the wire, runner commands reach viewers
// as commandApplied, late joiners get the doc and the current state, bookmarks carry the runner state.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
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
  const run = (toS: number) => {
    for (let tick = host.engine.now().tick + 1; tick <= Math.round(toS * 50); tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
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
    run(60.02);
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
    run(60.02);
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
    run(1);
    expect((await ctl.send({ type: 'scenario', action: 'trigger', target: 'nope' })).reason).toBe('no transition nope in state stable');
    expect((await ctl.send({ type: 'scenario', action: 'trigger', target: 'arrest' })).accepted).toBe(true);
    await waitFor(() => ctl.scenario.stateId === 'vf');
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
    run(61);
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
    run(30);
    await ctl.send({ type: 'scenario', action: 'bookmark', target: 'calm' });
    await waitFor(() => ctl.bookmarks.includes('calm'));
    run(65);
    expect(driver.runner?.stateId).toBe('vf');
    expect((await ctl.send({ type: 'scenario', action: 'restoreBookmark', target: 'calm' })).accepted).toBe(true);
    expect(host.engine.now().tick).toBe(1500);
    expect(driver.runner?.stateId).toBe('stable');
    await waitFor(() => ctl.scenario.stateId === 'stable');
  });
});
