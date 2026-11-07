// R15 (classroom): under load the instructor's own engine applied a two-command stage group on two ticks. The host
// dispatched a group's commands one at a time, each after the previous one's round trip to the monitor's worker; when
// the engine ran past the group's tick during a round trip (STAGE_LEAD_TICKS = 3 ticks = 60 ms; a loaded laptop's worker
// round trip is longer), the next command of the group landed on a later tick. PR #145 made the phones mirror the split
// faithfully; here the host no longer splits: a stage group goes to the monitor in ONE dispatch (HostTarget
// dispatchGroup, the worker's one message), whether the scenario runner sent it or a controller's staged delivery did.
// The target here is a real engine behind a "loaded" round trip: the engine runs LAG ticks after each dispatch before
// its answer comes back, as a busy worker does while the page waits for it.
import { describe, expect, it } from 'vitest';
import type { Command, DispatchResult } from '@pme/engine-core';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { BATCH_HOLD_MS, HostSession, STAGE_LEAD_TICKS } from '../../src/session/host-session.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import type { WireMessage } from '../../src/protocol.ts';
import { manualHost, type ManualHost } from '../fakes/manual-host.ts';
import { sleep, waitFor } from '../helpers.ts';

/** Ticks the engine runs during one round trip: more than the group's lead, as under load. */
const LAG = STAGE_LEAD_TICKS + 2;

/** A real engine whose answers come back after it has run LAG more ticks (a loaded worker). */
function loaded(): ManualHost {
  const h = manualHost({ seed: 7 });
  const run = () => h.engine.advanceTo(h.engine.now().simT + LAG * 0.02 + 1e-9);
  return Object.assign(h, {
    dispatch: async (c: Command): Promise<DispatchResult> => {
      const r = h.engine.dispatch(c);
      await Promise.resolve();
      run();
      return r;
    },
    dispatchGroup: async (cs: Command[]): Promise<DispatchResult[]> => {
      const rs = cs.map((c) => h.engine.dispatch(c)); // one message: the worker dispatches them in one task
      await Promise.resolve();
      run();
      return rs;
    },
  });
}

const CPR_OFF = { type: 'applyEvent', event: { kind: 'cpr', active: false } };
const VF = { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' };

describe('R15: the host applies a stage group on one tick under load', () => {
  it("the scenario runner's two-command group (cpr off + VF, E126's rhythm check) lands on one tick", async () => {
    const host = loaded();
    host.engine.advanceTo(3);
    const hs = new HostSession({ session: 'HSG234', target: host, stateIntervalMs: 0 });
    const a = hs.submit({ ...CPR_OFF, id: 'g-0', issuedBy: 'scenario', stageGroup: 'check-1' } as never);
    const b = hs.submit({ ...VF, id: 'g-1', issuedBy: 'scenario', stageGroup: 'check-1' } as never);
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.accepted && rb.accepted).toBe(true);
    expect(rb.tick).toBe(ra.tick);
    hs.close();
  });

  it('through the ScenarioDriver: a state whose onEnter is two commands applies both on one tick', async () => {
    const host = loaded();
    host.engine.advanceTo(3);
    const ticks: number[] = [];
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c) });
    hs = new HostSession({ session: 'HSG235', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const tap = hub.connect();
    tap.onMessage((m: WireMessage) => {
      if (m.kind !== 'event') return;
      for (const e of m.body) if (e.type === 'commandApplied' && e.commandId.startsWith('scenario-')) ticks.push(e.tick);
    });
    const r = driver.load({
      schema: 'pme-scenario/1', id: 'r15-check', title: 'R15', initialState: 'check',
      states: [{ id: 'check', label: 'Rhythm check', onEnter: [CPR_OFF, VF] }],
    });
    expect(r.ok).toBe(true);
    await waitFor(() => ticks.length === 2, 2000, 'both commands applied');
    expect(ticks[1]).toBe(ticks[0]);
    hs.close();
  });

  it("a controller's staged delivery (one stageGroup, batch of 2) lands on one tick", async () => {
    const host = loaded();
    host.engine.advanceTo(3);
    const hs = new HostSession({ session: 'HSG236', target: host, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: 'HSG236', transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    const batch = { id: 'cache-1', n: 2 };
    const [ra, rb] = await Promise.all([
      ctl.send({ ...CPR_OFF, stageGroup: 'cache-1', batch } as never),
      ctl.send({ ...VF, stageGroup: 'cache-1', batch } as never),
    ]);
    expect(ra.accepted && rb.accepted).toBe(true);
    expect((rb as { tick: number }).tick).toBe((ra as { tick: number }).tick);
    hs.close();
    ctl.close();
  });

  it('an item of a staged delivery that never arrives does not hold the rest past BATCH_HOLD_MS', async () => {
    const host = loaded();
    host.engine.advanceTo(3);
    const hs = new HostSession({ session: 'HSG237', target: host, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: 'HSG237', transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    const t0 = Date.now();
    const r = await ctl.send({ ...CPR_OFF, stageGroup: 'cache-2', batch: { id: 'cache-2', n: 2 } } as never); // the second is lost
    expect(r.accepted).toBe(true);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(BATCH_HOLD_MS - 20);
    await sleep(10);
    hs.close();
    ctl.close();
  });

  it('an item of a staged delivery refused on arrival (the drug lock) is answered at once; the rest does not wait for it', async () => {
    const host = loaded();
    host.engine.advanceTo(3);
    const hs = new HostSession({ session: 'HSG238', target: host, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: 'HSG238', transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    const EPI = { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } };
    expect((await ctl.send(EPI as never)).accepted).toBe(true);
    const batch = { id: 'cache-3', n: 2 };
    const t0 = Date.now();
    const [ra, rb] = await Promise.all([
      ctl.send({ ...EPI, stageGroup: 'cache-3', batch } as never), // the same drug again within 10 s: refused `recent`
      ctl.send({ ...VF, stageGroup: 'cache-3', batch } as never),
    ]);
    expect(ra.accepted).toBe(false);
    expect(ra.reason).toMatch(/^given \d+ s ago/);
    expect(rb.accepted).toBe(true);
    expect(Date.now() - t0, 'not held for the refused item').toBeLessThan(BATCH_HOLD_MS);
    hs.close();
    ctl.close();
  });

  it('a target without dispatchGroup still applies every command of the group (one by one)', async () => {
    const host = manualHost({ seed: 7 });
    host.engine.advanceTo(3);
    const hs = new HostSession({ session: 'HSG238', target: host, stateIntervalMs: 0 });
    const [ra, rb] = await Promise.all([
      hs.submit({ ...CPR_OFF, id: 'h-0', issuedBy: 'scenario', stageGroup: 'g' } as never),
      hs.submit({ ...VF, id: 'h-1', issuedBy: 'scenario', stageGroup: 'g' } as never),
    ]);
    expect(ra.accepted && rb.accepted).toBe(true);
    expect(rb.tick).toBe(ra.tick); // no load: the round trip is inside the lead
    hs.close();
  });
});
