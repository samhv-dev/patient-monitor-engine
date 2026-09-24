// ScenarioDriver against a real engine (headless, per-tick): the wrapped target, stand-ins, the ACLS scenario
// end to end, bookmarks (engine snapshot + runner state) and replay identity (brief §3.3).
import { describe, expect, it } from 'vitest';
import type { Command } from '@pme/engine-core';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { replayRunLog, runLog } from '../../src/scenario/replay.ts';
import { resolveRhythm } from '../../src/scenario/standins.ts';
import { BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import type { ScenarioEvent } from '../../src/protocol.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';
import { manualHost } from '../fakes/manual-host.ts';

// Each test steps the engine tick by tick for 1–10 sim-minutes (≈ 0.2–2.5 s each on a laptop).
const SLOW = 30_000;

type Learner = Map<number, Command[]>; // tick → commands the learner sends on that tick
let nL = 0;
const learner = (event: object): Command => ({ id: `L${++nL}`, issuedBy: 'learner', type: 'applyEvent', event } as unknown as Command);
const SHOCK = { kind: 'defib', action: 'shock', energyJ: 200 };

/** A driver over a fresh engine; await run(ticks) steps one tick at a time, sends the learner's commands, polls. */
function rig(seed = 42) {
  const host = manualHost({ seed });
  const events: ScenarioEvent[] = [];
  const driver = new ScenarioDriver({ target: host, publish: (e) => events.push(e) });
  const run = async (toTick: number, script: Learner = new Map()) => {
    for (let tick = host.engine.now().tick + 1; tick <= toTick; tick++) {
      host.engine.advanceTo(tick * 0.02);
      for (const c of script.get(tick) ?? []) driver.host.dispatch(c);
      driver.poll();
      // Yield once per sim-minute: a fully synchronous multi-minute run starves the Vitest worker RPC
      // on the 2-vCPU CI runner ("Timeout calling onTaskUpdate"). Determinism is unaffected.
      if (tick % 3000 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    }
  };
  const samples = (fromS: number, toS: number) => {
    const out = new Float32Array(Math.round((toS - fromS) * 500));
    host.engine.readSamples('ecgII', Math.round(fromS * 500), out);
    return Array.from(out);
  };
  return { host, driver, events, run, samples };
}
const everyTwoMin = (fromS: number, untilS: number): Learner => {
  const m: Learner = new Map();
  for (let t = fromS; t <= untilS; t += 120) m.set(Math.round(t * 50), [learner(SHOCK)]);
  return m;
};

describe('ScenarioDriver', () => {
  it('stand-ins: an id the engine lacks becomes the closest one it has; known ids pass through', async () => {
    const known = new Set(['vtMono', 'asystole', 'sinus']);
    expect(resolveRhythm('sinus', undefined, known)).toEqual({ rhythm: 'sinus' });
    expect(resolveRhythm('vfCoarse', { pulseless: true }, known)).toEqual({
      rhythm: 'vtMono', opts: { pulseless: true, rateBpm: 240 }, note: 'vfCoarse: coarse VF shown as VT 240 until Stage 5',
    });
    expect(resolveRhythm('vfCoarse', undefined, new Set(['vfCoarse']))).toEqual({ rhythm: 'vfCoarse' });
  }, SLOW);

  it('the wrapped target accepts applyEvent as scenario-only and feeds it to the runner', async () => {
    const { driver, run } = rig();
    expect(driver.load('acls-vf-witnessed').ok).toBe(true);
    await run(3001); // VF at 60 s
    expect(driver.runner?.stateId).toBe('vf');
    const r = driver.host.dispatch(learner(SHOCK)) as { accepted: boolean; reason?: string };
    expect(r).toMatchObject({ accepted: true, reason: 'scenario only: the engine does not model applyEvent yet' });
    driver.poll();
    expect(driver.runner?.stateId).toBe('rosc'); // seed 42: the first shock's draw is 0.062 < 0.3
  });

  it('a real validation error from the engine stays a rejection', async () => {
    const { driver } = rig();
    const r = driver.host.dispatch({ id: 'x', issuedBy: 't', type: 'setTarget', variable: 'hr', value: 999 }) as { accepted: boolean };
    expect(r.accepted).toBe(false);
  });

  it('load refuses an invalid document with the path-level reason', async () => {
    const { driver } = rig();
    const bad = structuredClone(BUILTIN_SCENARIOS['acls-vf-witnessed']) as ScenarioDoc;
    bad.states[1]!.transitions![0]!.probability = 3;
    expect(driver.load(bad)).toEqual({ ok: false, reason: 'invalid scenario: /states/1/transitions/0/probability: must be <= 1' });
  });

  it('ACLS VF end to end: stable → VF at 60 s → shock → ROSC, every rhythm command accepted', async () => {
    const { driver, events, run, host } = rig();
    driver.load('acls-vf-witnessed');
    await run(50 * 600, everyTwoMin(70, 600));
    expect(events.map((e) => `${e.t}:${e.stateId}${e.transitionId ? `/${e.transitionId}` : ''}`)).toEqual(['0:stable', '60:vf/arrest', '70:rosc/shockVf']);
    const log = driver.runner!.log;
    const rhythm = log.filter((e) => e.op === 'dispatch' && e.type === 'setRhythm');
    expect(rhythm.every((e) => e.op === 'dispatch' && e.accepted)).toBe(true);
    // Stage 5 merged: vfCoarse is a real rhythm now, so no stand-in note is needed for the ACLS path.
    expect(driver.notes.filter((n) => n.startsWith('vfCoarse'))).toEqual([]);
    expect(host.engine.now().simT).toBe(600);
  }, SLOW);

  it('ACLS VF without shocks decays: VF → fine VF at 4 min → asystole 5 min later', async () => {
    const { driver, events, run } = rig();
    driver.load('acls-vf-witnessed');
    await run(50 * 700);
    expect(events.map((e) => `${e.t}:${e.stateId}`)).toEqual(['0:stable', '60:vf', '300:vfFine', '600:asystole']);
  }, SLOW);

  it('a different runner seed takes a different path through the same shocks', async () => {
    const doc = structuredClone(BUILTIN_SCENARIOS['acls-vf-witnessed']) as ScenarioDoc;
    const paths: string[] = [];
    for (const seed of [1, 2, 3, 4]) {
      const { driver, events, run } = rig();
      driver.load({ ...doc, seed });
      await run(50 * 320, everyTwoMin(70, 320));
      paths.push(events.map((e) => `${e.t}:${e.stateId}`).join(' '));
    }
    expect(new Set(paths).size).toBeGreaterThan(1);
  }, 30_000);

  it('bookmark = engine snapshot + runner state: restoring and replaying the same inputs is identical', async () => {
    const { driver, events, run, samples, host } = rig();
    driver.load('acls-vf-witnessed');
    await run(50 * 65);
    expect((await driver.hook({ type: 'scenario', action: 'bookmark', target: 'vf', id: 'b1', issuedBy: 't' })).accepted).toBe(true);
    events.length = 0;
    const script: Learner = new Map([[50 * 70, [learner(SHOCK)]]]);
    await run(50 * 200, script);
    const first = { events: events.splice(0).map((e) => `${e.t}:${e.stateId}`), ecg: samples(66, 199) };
    const r = await driver.hook({ type: 'scenario', action: 'restoreBookmark', target: 'vf', id: 'b2', issuedBy: 't' });
    expect(r).toMatchObject({ accepted: true, tick: 50 * 65 });
    expect(host.engine.now().tick).toBe(50 * 65);
    expect(driver.runner?.stateId).toBe('vf');
    expect(events.splice(0).map((e) => `${e.t}:${e.stateId}`)).toEqual(['60:vf']); // the restore republishes the state
    await run(50 * 200, new Map([[50 * 70, [learner(SHOCK)]]]));
    expect(events.map((e) => `${e.t}:${e.stateId}`)).toEqual(first.events);
    expect(samples(66, 199)).toEqual(first.ecg);
  }, SLOW);

  it('replay identity: same seed + same learner commands → identical samples, dispatches and decisions', async () => {
    const go = async () => {
      nL = 0;
      const g = rig();
      g.driver.load('acls-vf-witnessed');
      await g.run(50 * 400, everyTwoMin(70, 400));
      return { g, ecg: g.samples(0.5, 399), dispatched: g.driver.runner!.log.filter((e) => e.op === 'dispatch') };
    };
    const a = await go();
    const b = await go();
    expect(b.ecg).toEqual(a.ecg);
    expect(b.dispatched).toEqual(a.dispatched);
    const replay = replayRunLog(a.g.driver.runner!.doc, runLog(a.g.driver.runner!));
    expect(replay.ok).toBe(true);
    expect(replay.decisions.length).toBeGreaterThan(2);
  });

  it('a replay with another seed diverges and says where', async () => {
    const { driver, run } = rig();
    const doc = structuredClone(BUILTIN_SCENARIOS['acls-vf-witnessed']) as ScenarioDoc;
    driver.load(doc);
    await run(50 * 400, everyTwoMin(70, 400));
    const log = runLog(driver.runner!);
    let diverged = false;
    for (const seed of [1, 2, 3, 4, 5]) if (!replayRunLog(doc, { ...log, seed }).ok) diverged = true;
    expect(diverged).toBe(true);
  }, SLOW);
});
