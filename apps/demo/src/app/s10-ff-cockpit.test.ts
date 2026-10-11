// Stage 10 Task 5 (owner's decision 6: the Ventilator view supports the fast-forward): the bronchospasm showcase case on
// the cockpit, run twice from one seed — once stepped (0.5 s steps, the cockpit's frames produced before each step, the
// scenario polled after it), once with a 300 s fast-forward in the middle. The truth of every second, the scenario's
// path, the commands it applied, the final state and the cockpit's frames (one on every tick of the span) are identical.
import { ControllerSession, createInProcessHub, HostSession, type AppliedResolution, type HostTarget, type ScenarioEvent, type WireEvent } from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { attachMonitorToLink, createLocalPortPair, createVentDriver } from '@pme/ventilator';
import { afterEach, describe, expect, it } from 'vitest';
import bronchospasm from './showcase/showcase-bronchospasm.json';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});
const yieldIo = () => new Promise((r) => setTimeout(r, 0));

async function run(withFastForward: boolean) {
  const v = validateScenario(bronchospasm);
  if (!v.ok) throw new Error(v.errors.join('; '));
  const eo = engineOptionsOf(v.doc, 7);
  const e = createEngine({ ...eo, truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } });
  const step = (n: number) => e.advanceTo((e.now().tick + n) * 0.02 + 1e-9);
  // the cockpit, linked to the engine as the app's Ventilator view is (frames stamped with their engine tick)
  const [ventPort, monPort] = createLocalPortPair();
  const framed = new Set<number>();
  const mon = {
    dispatch: (c: Command): DispatchResult => {
      const r = e.dispatch(c);
      if (c.type === 'externalDrive' && r.accepted) framed.add(r.tick);
      return r;
    },
    on: (fn: (x: EngineEvent) => void) => e.on(fn),
  };
  const link = attachMonitorToLink(mon, monPort);
  const cockpit = createVentDriver(ventPort, 'normal');
  let k = 0;
  const target: HostTarget = {
    dispatch: (c) => e.dispatch(c),
    snapshot: () => e.snapshot(),
    restore: (s) => e.restore(s),
    on: (fn) => e.on(fn),
    now: () => e.now(),
    time: () => {},
    // the app's step (session.ts): the cockpit's frames of the step first, then the monitor runs it
    fastForwardStep: async (n) => {
      if (++k % 100 === 0) await yieldIo();
      if (n > 0) await link.runTo(e.now().tick + n);
      step(n);
      return e.now();
    },
  };
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (x: ScenarioEvent) => hs?.publish(x) });
  hs = new HostSession({ session: 'CKP234', target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const seen: WireEvent[] = [];
  hub.connect().onMessage((m) => void (m.kind === 'event' && seen.push(...m.body)));
  const ctl = new ControllerSession({ session: 'CKP234', transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close(), () => link());
  const truth: EngineEvent[] = [];
  e.on((x) => void (x.type === 'truth' && truth.push(x)));
  while (!ctl.hostOnline) await yieldIo();
  expect((await ctl.send({ type: 'scenario', action: 'load', doc: v.doc })).accepted).toBe(true);
  // 10 s with the cockpit on its (fake) wall clock: it links (learns its offset) and ventilates
  cockpit.frame(0);
  for (let i = 1; i <= 500; i++) {
    cockpit.frame(i * 20);
    step(1);
    if (i % 25 === 0) driver.poll();
    await Promise.resolve();
  }
  const stepTo = async (toS: number) => {
    while (e.now().tick < Math.round(toS * 50)) {
      const n = Math.min(25, Math.round(toS * 50) - e.now().tick);
      await link.runTo(e.now().tick + n);
      step(n);
      driver.poll();
      await yieldIo();
    }
  };
  await ctl.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' } }); // the treatment, before the span
  const from = e.now().tick;
  if (withFastForward) {
    expect((await ctl.send({ type: 'time', action: 'jump', value: 300 })).accepted).toBe(true);
    while (ctl.lastFastForward === null) await yieldIo();
  } else await stepTo(from * 0.02 + 300);
  expect(e.now().tick).toBe(from + 15_000);
  let gaps = 0;
  for (let t = from + 1; t <= from + 15_000; t++) if (!framed.has(t)) gaps++;
  await stepTo(e.now().simT + 20);
  const applied = seen.flatMap((x) => (x.type === 'commandApplied' ? [(x.resolved as AppliedResolution).command] : [])).filter((c) => c.issuedBy === 'scenario');
  return { truth, gaps, applied, history: driver.runner?.history ?? [], state: e.snapshot().state };
}

describe('Stage 10: a fast-forward with the Ventilator view ventilating gives the same patient as running the span', () => {
  it('same seed, same actions: identical truth every second, scenario path, applied commands, state; a frame on every tick', async () => {
    const a = await run(false);
    const b = await run(true);
    expect(a.gaps).toBe(0);
    expect(b.gaps).toBe(0); // the cockpit ventilated the patient through every tick of the span
    expect(a.truth.length).toBeGreaterThanOrEqual(325);
    expect(a.history.map((h) => h.stateId)).toEqual(['spasm', 'treated']);
    expect(b.truth).toEqual(a.truth);
    expect(b.history).toEqual(a.history);
    expect(b.applied).toEqual(a.applied);
    expect(b.state).toEqual(a.state);
  }, 300_000);
});
