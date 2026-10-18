// Stage 10 Task 3 (brief: "same seed, same actions → same outcome whether or not fast-forward was used"): the hypovolaemic
// PEA case run twice from one seed — once stepped (0.5 s steps, the scenario polled after each, as the fast-forward does),
// once with a 300 s fast-forward in the middle — with the same instructor actions before and after. The truth values of
// every second, the scenario's path and rolls and the commands the scenario applied are identical.
import { afterEach, describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { FF_STEP_TICKS, HostSession } from '../../src/session/host-session.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { engineOptionsOf } from '../../src/scenario/patient.ts';
import { validateScenario } from '../../src/scenario/validate.ts';
import { BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import type { AppliedResolution, ScenarioEvent, WireEvent } from '../../src/protocol.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'DET234';
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});
const yieldIo = () => new Promise((r) => setTimeout(r, 0));
const STEP = 25; // the host's FF_STEP_TICKS: the reference run steps and polls exactly as the fast-forward does

async function run(withFastForward: boolean) {
  const v = validateScenario(BUILTIN_SCENARIOS['acls-pea-hypovolaemia']);
  if (!v.ok) throw new Error(v.errors.join('; '));
  const doc: ScenarioDoc = v.doc;
  const eo = engineOptionsOf(doc, 7);
  const host = manualHost({ ...eo, truthHz: 1, patient: { ...eo.patient, ...(doc.patient?.sensors ? { sensors: doc.patient.sensors } : {}) } });
  const step = (n: number) => host.engine.advanceTo((host.engine.now().tick + n) * 0.02 + 1e-9);
  let k = 0;
  const target = Object.assign(host, {
    fastForwardStep: async (n: number) => {
      if (++k % 100 === 0) await yieldIo(); // let the test runner breathe once per 50 s of sim
      step(n);
      return host.engine.now();
    },
  });
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
  hs = new HostSession({ session: S, target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const watcher = collect(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close());
  const truth: EngineEvent[] = [];
  host.engine.on((e) => void (e.type === 'truth' && truth.push(e)));
  /** Run to `toS` the way the fast-forward does: a step of FF_STEP_TICKS, a poll, the scenario's commands applied. */
  const stepTo = async (toS: number) => {
    while (host.engine.now().tick < Math.round(toS * 50)) {
      step(Math.min(STEP, Math.round(toS * 50) - host.engine.now().tick));
      driver.poll();
      await yieldIo();
    }
  };
  await waitFor(() => ctl.hostOnline);
  expect((await ctl.send({ type: 'scenario', action: 'load', doc })).accepted).toBe(true);
  await stepTo(20);
  await ctl.send({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 250, overS: 60 } }); // an action before
  if (withFastForward) {
    expect((await ctl.send({ type: 'time', action: 'jump', value: 300 })).accepted).toBe(true);
    await waitFor(() => ctl.lastFastForward !== null, 120_000, 'fast-forward end');
  } else await stepTo(320);
  expect(host.engine.now().tick).toBe(16_000);
  // the actions after it: the case's ROSC rule (500 mL and epinephrine, probability 0.6) rolls the scenario stream
  await ctl.send({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 30 } });
  await ctl.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } });
  await stepTo(350);
  const applied = watcher
    .flatMap((m): WireEvent[] => (m.kind === 'event' ? m.body : []))
    .flatMap((e) => (e.type === 'commandApplied' ? [(e.resolved as AppliedResolution).command] : []))
    .filter((c) => c.issuedBy === 'scenario');
  const decisions = (driver.runner?.log ?? []).filter((e) => e.op === 'enter' || e.op === 'roll');
  return { truth, applied, decisions, history: driver.runner?.history ?? [], state: host.engine.snapshot().state };
}

describe('a fast-forward gives the same patient as running the span', () => {
  it('same seed, same actions: identical truth every second, scenario path, rolls and applied commands', async () => {
    expect(FF_STEP_TICKS).toBe(STEP);
    const a = await run(false);
    const b = await run(true);
    expect(a.truth.length).toBeGreaterThanOrEqual(349);
    expect(a.history.map((h) => h.stateId)).toContain('pea'); // the span holds the case's own transition (afterS 150)
    expect(a.decisions.some((d) => d.op === 'roll')).toBe(true);
    expect(b.truth).toEqual(a.truth);
    expect(b.history).toEqual(a.history);
    expect(b.decisions).toEqual(a.decisions);
    expect(b.applied).toEqual(a.applied);
    expect(b.state).toEqual(a.state);
  }, 300_000);
});
