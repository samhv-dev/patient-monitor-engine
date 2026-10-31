// ScenarioDriver against a real engine (headless, per-tick): the wrapped target, stand-ins, the ACLS scenario
// end to end, bookmarks (engine snapshot + runner state) and replay identity (brief §3.3).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Command, EngineEvent } from '@pme/engine-core';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { PhaseRunner } from '../../src/scenario/phase-runner.ts';
import { replayRunLog, runLog } from '../../src/scenario/replay.ts';
import { resolveRhythm } from '../../src/scenario/standins.ts';
import { BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import type { ScenarioEvent } from '../../src/protocol.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';
import type { RunnerInput, ScenarioRunner } from '../../src/scenario/runner.ts';
import type { RunnerInputV2 } from '../../src/scenario/types-v2.ts';
import { engineOptionsOf } from '../../src/scenario/patient.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { doc } from './fixtures.ts';
import { minimalV2 } from './fixtures-v2.ts';

// Each test steps the engine tick by tick for 1–10 sim-minutes (≈ 0.2–2.5 s each on a laptop). CI rule: tests that run
// the engine past ~1 sim-minute take a 300 s timeout (the 2-vCPU runner needs > 30 s for the 4 × 320 sim-s seed test).
const SLOW = 300_000;

type Learner = Map<number, Command[]>; // tick → commands the learner sends on that tick
let nL = 0;
const learner = (event: object): Command => ({ id: `L${++nL}`, issuedBy: 'learner', type: 'applyEvent', event } as unknown as Command);
const SHOCK = { kind: 'defib', action: 'shock', energyJ: 200 };
// Stage 4b: the engine models the defibrillator, so a shock needs a charge first (200 J charges in 7 s [ENG]).
const CHARGE = { kind: 'defib', action: 'charge', energyJ: 200 };
const CHARGE_LEAD_S = 9;

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
  for (let t = fromS; t <= untilS; t += 120) {
    m.set(Math.round((t - CHARGE_LEAD_S) * 50), [learner(CHARGE)]);
    m.set(Math.round(t * 50), [learner(SHOCK)]);
  }
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

  it('a charged shock is delivered by the engine and fed to the runner', async () => {
    const { driver, run } = rig();
    expect(driver.load('acls-vf-witnessed').ok).toBe(true);
    await run(3001); // VF at 60 s
    expect(driver.runner?.stateId).toBe('vf');
    expect((driver.host.dispatch(learner(CHARGE)) as { accepted: boolean }).accepted).toBe(true);
    await run(3001 + 50 * CHARGE_LEAD_S);
    const r = driver.host.dispatch(learner(SHOCK)) as { accepted: boolean; reason?: string };
    expect(r.accepted).toBe(true); // Stage 4b: the engine delivers the shock itself (no longer scenario-only)
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
  }, SLOW);

  it('bookmark = engine snapshot + runner state: restoring and replaying the same inputs is identical', async () => {
    const { driver, events, run, samples, host } = rig();
    driver.load('acls-vf-witnessed');
    await run(50 * 65);
    expect((await driver.hook({ type: 'scenario', action: 'bookmark', target: 'vf', id: 'b1', issuedBy: 't' })).accepted).toBe(true);
    events.length = 0;
    const script: Learner = new Map([[50 * (70 - CHARGE_LEAD_S), [learner(CHARGE)]], [50 * 70, [learner(SHOCK)]]]);
    await run(50 * 200, script);
    const first = { events: events.splice(0).map((e) => `${e.t}:${e.stateId}`), ecg: samples(66, 199) };
    const r = await driver.hook({ type: 'scenario', action: 'restoreBookmark', target: 'vf', id: 'b2', issuedBy: 't' });
    expect(r).toMatchObject({ accepted: true, tick: 50 * 65 });
    expect(host.engine.now().tick).toBe(50 * 65);
    expect(driver.runner?.stateId).toBe('vf');
    expect(events.splice(0).map((e) => `${e.t}:${e.stateId}`)).toEqual(['60:vf']); // the restore republishes the state
    await run(50 * 200, new Map([[50 * (70 - CHARGE_LEAD_S), [learner(CHARGE)]], [50 * 70, [learner(SHOCK)]]]));
    expect(events.map((e) => `${e.t}:${e.stateId}`)).toEqual(first.events);
    expect(samples(66, 199)).toEqual(first.ecg);
  }, SLOW);

  it('IP2 marks: the bookmark hook returns kind and note on its applied command; restoreBookmark needs only the label', async () => {
    const { driver, run, host } = rig();
    expect(driver.load('acls-vf-witnessed').ok).toBe(true);
    await run(250);
    const a = await driver.hook({ id: 'm1', issuedBy: 'panel', type: 'scenario', action: 'bookmark', kind: 'good', note: 'clear closed-loop call' });
    expect(a).toMatchObject({ accepted: true, applied: { action: 'bookmark', target: 'Bookmark 1', kind: 'good', note: 'clear closed-loop call' } });
    const b = await driver.hook({ id: 'm2', issuedBy: 'panel', type: 'scenario', action: 'bookmark', target: 'plain' });
    expect(b.applied).toEqual({ id: 'm2', issuedBy: 'panel', type: 'scenario', action: 'bookmark', target: 'plain' }); // no kind: as before
    await run(3500);
    expect(driver.runner?.stateId).toBe('vf');
    const r = await driver.hook({ id: 'm3', issuedBy: 'panel', type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1' });
    expect(r).toEqual({ accepted: true, tick: 250 });
    expect(host.engine.now().tick).toBe(250);
    expect(driver.runner?.stateId).toBe('stable');
  });

  it('vitalHolds(): value, threshold and hold fraction of each vital rule of the current state, read-only, as the rule decides', async () => {
    const { driver, run, host } = rig();
    expect(driver.vitalHolds()).toEqual([]); // no scenario
    const d = doc([
      { id: 'tachy', to: 'b', when: { any: [{ vital: { var: 'hr', op: '>', value: 100, forS: 10 } }, { manual: { label: 'Call it' } }] } },
      { id: 'desat', to: 'c', when: { vital: { var: 'spo2', op: '<', value: 50 } } },
    ]);
    expect(driver.load(d).ok).toBe(true);
    await run(100);
    expect(driver.vitalHolds()).toMatchObject([
      { transitionId: 'tachy', key: 'tachy.0', variable: 'hr', op: '>', threshold: 100, value: 80, met: false, heldS: 0, forS: 10, fraction: 0 },
      { transitionId: 'desat', key: 'desat', variable: 'spo2', op: '<', threshold: 50, met: false, heldS: 0, forS: 0, fraction: 0 },
    ]);
    driver.host.dispatch({ id: 'x1', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 130 } as Command);
    await run(400);
    const h = driver.vitalHolds()[0]!;
    expect(h).toMatchObject({ value: 130, met: true });
    expect(h.value).toBe(driver.runner?.value('hr'));
    expect(h.heldS).toBeGreaterThan(3);
    expect(h.fraction).toBeCloseTo(h.heldS / 10, 9);
    // Read-only: reading changes nothing, and a caller's edits do not reach the runner
    const before = driver.runner?.getState();
    h.heldS = 99;
    driver.vitalHolds().length = 0;
    expect(driver.runner?.getState()).toEqual(before);
    expect(driver.vitalHolds()[0]?.heldS).toBe(before?.trueFor['tachy.0']);
    // The bar agrees with the rule: the state stays while fraction < 1 and leaves on the tick the hold completes
    let last = driver.vitalHolds()[0]!;
    while (driver.runner?.stateId === 'a') {
      last = driver.vitalHolds()[0]!;
      expect(last.fraction).toBeLessThan(1);
      await run(host.engine.now().tick + 1);
    }
    expect(driver.runner?.stateId).toBe('b');
    expect(last.heldS + 0.02).toBeGreaterThanOrEqual(10 - 1e-6);
    expect(driver.vitalHolds()).toEqual([]); // b has no vital rule
  });

  it('a position kept across a reload (JSON, a new engine and driver) restores like a bookmark', async () => {
    const a = rig();
    a.driver.load('acls-vf-witnessed');
    await a.run(50 * 65);
    const kept = JSON.parse(JSON.stringify(await a.driver.position())) as NonNullable<Awaited<ReturnType<ScenarioDriver['position']>>>;
    expect(kept.runner.stateId).toBe('vf');
    a.events.length = 0;
    const script = () => new Map([[50 * (70 - CHARGE_LEAD_S), [learner(CHARGE)]], [50 * 70, [learner(SHOCK)]]]) as Learner;
    await a.run(50 * 200, script());
    // the reloaded page: a fresh engine on the same options, the same document loaded, then the kept position
    const b = rig();
    b.driver.load('acls-vf-witnessed');
    await b.run(10);
    expect(b.driver.hold('Before the reload', { ...kept, runner: { ...kept.runner, docId: 'another-case' } })).toBe(false);
    expect(b.driver.hold('Before the reload', kept)).toBe(true);
    b.events.length = 0;
    expect(await b.driver.hook({ type: 'scenario', action: 'restoreBookmark', target: 'Before the reload', id: 'r1', issuedBy: 't' })).toMatchObject({ accepted: true, tick: 50 * 65 });
    expect(b.host.engine.now().tick).toBe(50 * 65);
    expect(b.events.splice(0).map((e) => `${e.t}:${e.stateId}`)).toEqual(['60:vf']);
    await b.run(50 * 200, script());
    expect(b.events.map((e) => `${e.t}:${e.stateId}`)).toEqual(a.events.map((e) => `${e.t}:${e.stateId}`));
    expect(b.samples(66, 199)).toEqual(a.samples(66, 199));
  }, SLOW);

  it('position(): none without a scenario, nor while a state\'s commands are on their way to the monitor', async () => {
    const host = manualHost({ seed: 42 });
    const answers: Array<() => void> = [];
    const driver = new ScenarioDriver({ target: host, submit: (c) => new Promise((res) => void answers.push(() => res(host.dispatch(c) as never))) });
    expect(await driver.position()).toBeNull();
    driver.load('acls-vf-witnessed');
    expect(await driver.position()).toBeNull(); // the start batch is unanswered
    expect(answers.length).toBeGreaterThan(0);
    for (const a of answers.splice(0)) a();
    await new Promise<void>((res) => setImmediate(res));
    const p = await driver.position();
    expect(p?.runner.stateId).toBe(driver.runner?.stateId);
    expect(p?.snapshot.tick).toBe(host.engine.now().tick);
  });

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
  }, SLOW);

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

// Plan F1: a valid pme-scenario/2 document is refused by load until F2's phase runner; a /1 load is unchanged.
describe('ScenarioDriver and a pme-scenario/2 document (F1)', () => {
  // F2 removed F1's refusal ("pme-scenario/2 cards run from F2 on"): a valid /2 document now runs (F2's block below).
  it('load runs a valid /2 document in place of the /1 run loaded before', () => {
    const { driver } = rig();
    expect(driver.load('acls-vf-witnessed').ok).toBe(true);
    expect(driver.load(minimalV2())).toMatchObject({ ok: true });
    expect(driver.runner).toBeNull();
    expect(driver.phaseRunner?.doc.id).toBe('mh2');
  });

  it('a scenario load command with a /2 document is accepted', async () => {
    const { driver } = rig();
    const r = await driver.hook({ id: 'c1', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: minimalV2() });
    expect(r).toMatchObject({ accepted: true });
    expect(driver.phaseRunner?.stateId).toBe('baseline');
  });

  it('an invalid /2 document is refused with its validation errors, as a /1 one is', () => {
    const { driver } = rig();
    const bad = minimalV2();
    bad.phases[0].next = ['nowhere'];
    expect(driver.load(bad)).toEqual({ ok: false, reason: 'invalid scenario: /phases/0/next/0: no phase "nowhere"' });
  });
});

// Plan F2: the driver chooses a PhaseRunner for a /2 document; phases go out as today's `scenario` event (stateId = the
// phase id, transitionId = `enter:<phaseId>`, Q20); one stage mark per phase entry; a restore rewinds the timeline; a
// script entry anchored on a press goes out in the press's own stage group, on its tick.
describe('ScenarioDriver and a pme-scenario/2 document (F2)', () => {
  const CARD = {
    schema: 'pme-scenario/2', id: 'beat2', title: 'Beat (format 2)',
    phases: [
      { id: 'calm', label: 'Calm', initial: true, next: ['beating'] },
      { id: 'beating', label: 'Beating', enter: { value: { var: 'hr', op: '>', value: 0 } }, next: ['settled'] },
      { id: 'settled', label: 'Settled', enter: { value: { var: 'hr', op: '>', value: 0, forS: 10 } } },
    ],
    actions: [{
      id: 'induce', label: 'Induce', kind: 'procedure', phases: ['calm', 'beating', 'settled'],
      give: [{ type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } }],
    }],
    script: [{ id: 'tachy', on: 'action:induce#1', commands: [{ type: 'setRhythm', rhythm: 'sinusTachy' }] }],
  };
  /** The rig with stage marks on and every dispatch the engine answered (command, accepted, applied tick). */
  function rig2() {
    const host = manualHost({ seed: 42 });
    const sent: Array<{ cmd: Command; accepted: boolean; tick: number }> = [];
    const target = { ...host, dispatch: (c: Command) => { const r = host.dispatch(c) as { accepted: boolean; tick: number }; sent.push({ cmd: c, accepted: r.accepted, tick: r.tick }); return r; } };
    const events: ScenarioEvent[] = [];
    const driver = new ScenarioDriver({ target, publish: (e) => events.push(e), stageMarks: true });
    const run = (s: number) => {
      const end = host.engine.now().tick + Math.round(s * 50);
      for (let tick = host.engine.now().tick + 1; tick <= end; tick++) {
        host.engine.advanceTo(tick * 0.02);
        driver.poll();
      }
    };
    const settle = () => new Promise<void>((r) => setImmediate(r)); // the stage mark's snapshot is awaited
    return { host, driver, events, sent, run, settle };
  }
  const press = (id: string, group: string, drugId: string) =>
    ({ id, issuedBy: 'instructor', type: 'applyEvent', event: { kind: 'drug', drugId, dose: 1, unit: 'mg/kg', route: 'iv' }, stageGroup: group, actionId: 'induce' }) as unknown as Command;

  it('a /2 card loads into a PhaseRunner and publishes its phases as scenario events', () => {
    const { driver, events, run } = rig2();
    const r = driver.load(CARD);
    expect(r.ok).toBe(true);
    expect(driver.phaseRunner).toBeInstanceOf(PhaseRunner);
    expect(driver.runner).toBeNull();
    run(15);
    expect(events.map((e) => [e.stateId, e.transitionId])).toEqual([['calm', undefined], ['beating', 'enter:beating'], ['settled', 'enter:settled']]);
    const [, beating, settled] = events as [ScenarioEvent, ScenarioEvent, ScenarioEvent];
    expect(settled.t - beating.t).toBeGreaterThanOrEqual(10 - 0.02); // hr > 0 held 10 s (from its first truth value)
    expect(driver.phaseRunner?.phases.map((p) => p.id)).toEqual(['calm', 'beating', 'settled']);
    expect(driver.welcomeEvents()[0]).toEqual({ type: 'scenario', t: settled.t, stateId: 'settled' });
  });

  it('one stage mark per phase entry; a restore to one rewinds the phase, the timeline and the edges, and the run goes on', async () => {
    const { driver, events, run, settle } = rig2();
    expect(driver.load(CARD).ok).toBe(true);
    driver.poll(); // the initial phase's mark is placed before the run moves on
    await settle();
    for (let i = 0; i < 16; i++) {
      run(1);
      await settle();
    }
    const marks = driver.stageMarks();
    expect(marks.map((m) => m.note)).toEqual(['calm', 'beating', 'settled']);
    expect(marks.every((m) => m.kind === 'stage')).toBe(true);
    const pr = driver.phaseRunner as PhaseRunner;
    const beatingT = pr.phases[1]!.t;
    const r = await driver.hook({ id: 'r1', issuedBy: 'instructor', type: 'scenario', action: 'restoreBookmark', target: marks[1]!.target });
    expect(r.accepted).toBe(true);
    expect(driver.phaseRunner?.stateId).toBe('beating');
    expect(driver.phaseRunner?.phases).toEqual([{ id: 'calm', t: 0, exitT: beatingT, rule: 'initial' }, { id: 'beating', t: beatingT, rule: 'enter:beating' }]);
    expect(driver.phaseRunner?.edges.every((e) => e.t <= (marks[1]!.atTick as number) * 0.02 + 1e-9)).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'scenario', t: beatingT, stateId: 'beating' });
    expect(driver.stageMarks().map((m) => m.note)).toEqual(['calm', 'beating']);
    for (let i = 0; i < 12; i++) {
      run(1);
      await settle();
    }
    expect(driver.phaseRunner?.stateId).toBe('settled');
    expect(driver.stageMarks().map((m) => m.note)).toEqual(['calm', 'beating', 'settled']);
    // a run position holds the /2 runner state, and hold() takes it back on the same card
    const p = await driver.position();
    expect(p?.runner.schema).toBe('pme-scenario-runner/2');
    expect(driver.hold('kept', p!)).toBe(true);
  });

  it('a script entry on an action\'s first taking goes out in the press\'s stage group, on the press\'s tick, card-set', () => {
    const { driver, sent, run } = rig2();
    expect(driver.load(CARD).ok).toBe(true);
    run(2);
    const from = sent.length;
    driver.host.dispatch(press('p1', 'press-1', 'propofol'));
    driver.host.dispatch(press('p2', 'press-1', 'succinylcholine'));
    run(1);
    driver.host.dispatch(press('p3', 'press-2', 'propofol')); // the second taking: no entry
    run(1);
    const got = sent.slice(from).map((s) => ({ id: s.cmd.id, issuedBy: s.cmd.issuedBy, group: s.cmd.stageGroup, type: s.cmd.type, accepted: s.accepted, tick: s.tick }));
    const t0 = got[0]!.tick;
    expect(got).toEqual([
      { id: 'p1', issuedBy: 'instructor', group: 'press-1', type: 'applyEvent', accepted: true, tick: t0 },
      { id: expect.stringMatching(/^card-set-\d+-0$/), issuedBy: 'scenario', group: 'press-1', type: 'setRhythm', accepted: true, tick: t0 },
      { id: 'p2', issuedBy: 'instructor', group: 'press-1', type: 'applyEvent', accepted: true, tick: t0 },
      { id: 'p3', issuedBy: 'instructor', group: 'press-2', type: 'applyEvent', accepted: true, tick: t0 + 50 },
    ]);
    const log = driver.phaseRunner!.log;
    expect(log.filter((l) => l.op === 'take').map((l) => (l as { actionId: string }).actionId)).toEqual(['induce', 'induce']);
    expect(log.filter((l) => l.op === 'script')).toEqual([{ op: 'script', t: expect.any(Number), scriptId: 'tachy', anchor: 'action:induce#1' }]);
    expect(log.filter((l) => l.op === 'dispatch' && (l as { cardSet?: true }).cardSet)).toHaveLength(1);
  });

  it('goto and trigger are refused on a /2 card (a phase is entered by its own rule); pause and resume work', async () => {
    const { driver } = rig2();
    expect(driver.load(CARD).ok).toBe(true);
    expect(await driver.hook({ id: 'g', issuedBy: 'instructor', type: 'scenario', action: 'goto', target: 'settled' })).toMatchObject({ accepted: false, reason: 'a pme-scenario/2 phase is entered by its own rule, never by goto' });
    expect(await driver.hook({ id: 't', issuedBy: 'instructor', type: 'scenario', action: 'trigger', target: 'x' })).toMatchObject({ accepted: false });
    expect((await driver.hook({ id: 'p', issuedBy: 'instructor', type: 'scenario', action: 'pause' })).accepted).toBe(true);
    expect(driver.phaseRunner?.paused).toBe(true);
    expect((await driver.hook({ id: 'r', issuedBy: 'instructor', type: 'scenario', action: 'resume' })).accepted).toBe(true);
  });

  it('a /1 card\'s runner still receives only today\'s input kinds (the rhythm feed is for a PhaseRunner only)', async () => {
    const { driver, run } = rig();
    expect(driver.load('acls-vf-witnessed').ok).toBe(true);
    await run(150);
    const kinds = new Set(driver.runner!.log.flatMap((l) => (l.op === 'advance' ? l.inputs.map((i) => i.kind) : [])));
    expect([...kinds].every((k) => k === 'values' || k === 'clinical' || k === 'sensor')).toBe(true);
    expect(kinds.has('values')).toBe(true);
  });
});

// F4 (plan F4, Q21/Q22): the engine's `state.signals`, the labs pH/lactate/K⁺ and the endocrine MH activity reach a /2
// runner as rank-3 inputs, and ONLY a /2 runner: the /1 runner's take() would throw on a `signals` input, and a rank-3
// `k` from the labs (or a `map`) would shadow a /1 card's vital vars. (On the integration branch the /2 runner is F2's
// PhaseRunner; F4's stand-in is gone.)
describe('ScenarioDriver: engine truth for a /2 runner only (F4)', () => {
  const SHOWCASE = (f: string) => JSON.parse(readFileSync(new URL(`../../../../apps/demo/src/app/showcase/${f}`, import.meta.url), 'utf8')) as ScenarioDoc;

  /** The inputs today's onEngine adds for an engine event: rank 2 from a measurement, rank 3 from the state's values. */
  const today = (e: EngineEvent): RunnerInput[] => {
    if (e.type === 'measurement') {
      const values: Record<string, number> = {};
      for (const [k, m] of Object.entries(e.values)) if (m && m.value !== null) values[k] = m.value;
      return Object.keys(values).length ? [{ kind: 'values', rank: 2, values }] : [];
    }
    if (e.type === 'state') {
      const values: Record<string, number> = {};
      for (const [k, v] of Object.entries(e.values)) if (typeof v === 'number') values[k] = v;
      return [{ kind: 'values', rank: 3, values }];
    }
    return [];
  };

  it('a /2 runner is fed rank-3 signals (mhActivity among them, not the endo event\'s rounded copy) and labs ph/lactate/k, with truthHz 0', async () => {
    const host = manualHost({ seed: 7 }); // truthHz 0: the truth tree is off, as for an embedder (R4)
    const driver = new ScenarioDriver({ target: host });
    const fed: RunnerInputV2[] = [];
    expect(driver.load(minimalV2()).ok).toBe(true);
    const pr = driver.phaseRunner!;
    const advance = pr.advance.bind(pr);
    pr.advance = (t: number, inputs: RunnerInputV2[] = []) => (fed.push(...inputs), advance(t, inputs));
    const seen: EngineEvent[] = [];
    host.on((e) => seen.push(e));
    for (let tick = 1; tick <= 30 * 50; tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
    }
    expect(seen.some((e) => e.type === 'truth')).toBe(false);
    const states = seen.filter((e): e is Extract<EngineEvent, { type: 'state' }> => e.type === 'state');
    const labs = seen.filter((e): e is Extract<EngineEvent, { type: 'labs' }> => e.type === 'labs');
    const endo = seen.filter((e) => e.type === 'endo') as unknown as { mhActivity: number }[];
    expect(states.length).toBeGreaterThanOrEqual(29);
    expect(labs.length).toBeGreaterThanOrEqual(2);
    expect(endo.length).toBeGreaterThanOrEqual(29);
    // exactly the engine's own values, in the engine's order, after today's inputs for the same event
    const want: RunnerInputV2[] = seen.flatMap((e): RunnerInputV2[] => {
      if (e.type === 'state') return [...today(e), ...(e.rhythm?.id ? [{ kind: 'rhythm', id: e.rhythm.id } as const] : []), { kind: 'signals', signals: e.signals! }];
      if (e.type === 'labs') return [{ kind: 'values', rank: 3, values: { ph: e.values.ph, lactate: e.values.lactate, k: e.values.k } }];
      return today(e);
    });
    expect(fed).toEqual(want);
    const sig = fed.filter((i) => i.kind === 'signals');
    expect(sig).toHaveLength(states.length);
    expect(Object.keys(sig[0]!.signals).sort()).toEqual(['dantroleneE', 'map', 'mhActivity', 'pulse', 'setMinuteVentilationLMin']);
    expect(pr.value('mhActivity')).toBe(sig.at(-1)!.signals.mhActivity); // the rule's truth is the unrounded signal
  });

  /** A /1 demo card through the driver, its own manual transitions pressed as they come up: what its runner is fed. */
  async function oneCard(file: string, presses: string[], untilS: number) {
    const doc = SHOWCASE(file);
    const eo = engineOptionsOf(doc, 7);
    const sensors = (doc.patient as { sensors?: Record<string, string> } | undefined)?.sensors;
    const host = manualHost({ ...eo, mode: doc.mode ?? 'modeled', patient: { ...eo.patient, ...(sensors ? { sensors } : {}) } } as never);
    const driver = new ScenarioDriver({ target: host });
    expect(driver.load(doc).ok).toBe(true);
    const r = driver.runner as ScenarioRunner;
    const fed: RunnerInput[] = [];
    const advance = r.advance.bind(r);
    r.advance = (t, inputs = []) => (fed.push(...inputs), advance(t, inputs));
    const want: RunnerInput[] = [];
    host.on((e) => want.push(...today(e)));
    const left = [...presses];
    let pressed = 0;
    for (let tick = host.engine.now().tick + 1; tick <= untilS * 50; tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
      if (tick % 500 === 0) {
        const ids = new Set((r.state().transitions ?? []).filter((x) => 'manual' in x.when).map((x) => x.id));
        const i = left.findIndex((p) => ids.has(p));
        if (i >= 0) {
          const target = left.splice(0, i + 1).at(-1) as string;
          expect((await driver.hook({ id: `p${++pressed}`, issuedBy: 'instructor', type: 'scenario', action: 'trigger', target })).accepted, target).toBe(true);
        }
      }
      if (tick % 3000 === 0) await new Promise<void>((res) => setImmediate(res));
    }
    return { fed, want, pressed, states: r.log.filter((l) => l.op === 'enter').map((l) => l.stateId) };
  }

  const checkToday = (o: Awaited<ReturnType<typeof oneCard>>) => {
    // today's kinds only; no signals; the engine-derived inputs (rank 2 and 3) exactly today's rule, so no rank-3 k
    // from the labs, no mhActivity from the endocrine event, no map
    expect(new Set(o.fed.map((i) => i.kind))).toEqual(new Set(['clinical', 'sensor', 'values']));
    expect(o.fed.some((i) => (i as { kind: string }).kind === 'signals')).toBe(false);
    expect(o.fed.filter((i) => i.kind === 'values' && i.rank >= 2)).toEqual(o.want);
    for (const i of o.fed) if (i.kind === 'values' && i.rank === 3) for (const k of ['map', 'ph', 'lactate', 'mhActivity', 'dantroleneE', 'setMinuteVentilationLMin']) expect(k in i.values, k).toBe(false);
    expect(o.fed.filter((i) => i.kind === 'clinical').length).toBeGreaterThan(5); // the card's commands did reach it
  };

  it('a /1 card\'s runner receives exactly today\'s input kinds and values: the MH demo card\'s command stream', async () => {
    const o = await oneCard('showcase-mh.json', ['premed', 'preox', 'induce', 'intubate', 'surgery', 'crisis-earlySigns', 'crisis-established', 'dant', 'cool-treating', 'normo'], 1200);
    expect(o.pressed).toBeGreaterThanOrEqual(7);
    expect(o.states).toContain('triggerOff');
    checkToday(o);
  }, SLOW);

  it('a /1 card\'s runner receives exactly today\'s input kinds and values: the haemorrhage demo card\'s command stream', async () => {
    const o = await oneCard('showcase-haemorrhage.json', ['oxygen', 'intubate-o2', 'cpr-pea', 'cpr', 'volume', 'epi-running', 'rhythmCheck1-running'], 1200);
    expect(o.pressed).toBeGreaterThanOrEqual(3);
    expect(o.states).toContain('pea');
    checkToday(o);
  }, SLOW);
});

// F3 (plan F3, §8.2): the driver records every clinical act of a /2 card in the runner's state, ACCEPTED OR REFUSED: an
// A press (commands stamped `actionId`), an instructor's panel command, a refused dose with the engine's reason; and the
// record rewinds with a bookmark restore (Q18).
describe('ScenarioDriver: the administration record of a /2 card (F3)', () => {
  const GIVE = { kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'iv' };
  const CARD = {
    schema: 'pme-scenario/2', id: 'rec2', title: 'Record (format 2)', patient: { weightKg: 80 },
    phases: [{ id: 'calm', label: 'Calm', initial: true }],
    actions: [{ id: 'dantrolene', label: 'Dantrolene', kind: 'drug', phases: ['calm'], give: [{ type: 'applyEvent', event: GIVE }], drug: { id: 'dantrolene' } }],
  };
  function rig3() {
    const host = manualHost({ seed: 42 });
    const driver = new ScenarioDriver({ target: host });
    const run = (s: number) => {
      const end = host.engine.now().tick + Math.round(s * 50);
      for (let tick = host.engine.now().tick + 1; tick <= end; tick++) {
        host.engine.advanceTo(tick * 0.02);
        driver.poll();
      }
    };
    expect(driver.load(CARD).ok).toBe(true);
    return { host, driver, run };
  }
  const cmd = (id: string, event: object, extra: object = {}) => ({ id, issuedBy: 'instructor', type: 'applyEvent', event, ...extra }) as unknown as Command;

  it('an A press is recorded with source "action", the sim time, the dose per kg and the result; a panel command as "panel"', () => {
    const { host, driver, run } = rig3();
    run(2);
    const t = host.engine.now().simT;
    driver.host.dispatch(cmd('a1', GIVE, { actionId: 'dantrolene', stageGroup: 'press-1' }));
    driver.host.dispatch(cmd('p1', { kind: 'drug', drugId: 'dantrolene', dose: 200, unit: 'mg', route: 'iv' }));
    driver.host.dispatch(cmd('p2', { kind: 'ventilation', source: 'ventilator', rr: 20, vtMl: 600, fio2: 1, peep: 5 }));
    driver.host.dispatch(cmd('p3', { kind: 'surgical', action: 'diathermy', on: true })); // not a clinical act: not recorded
    const admin = driver.phaseRunner!.admin;
    expect(admin).toEqual([
      { seq: 1, t, source: 'action', actionId: 'dantrolene', kind: 'drug', drugId: 'dantrolene', cls: 'dantrolene', dose: 2.5, unit: 'mg/kg', perKg: 2.5, route: 'iv', result: { accepted: true } },
      { seq: 2, t, source: 'panel', kind: 'drug', drugId: 'dantrolene', cls: 'dantrolene', dose: 200, unit: 'mg', perKg: 2.5, route: 'iv', result: { accepted: true } },
      { seq: 3, t, source: 'panel', kind: 'ventilation', settings: { source: 'ventilator', rr: 20, vtMl: 600, fio2: 1, peep: 5 }, result: { accepted: true } },
    ]);
  });

  it('an IM dantrolene through driver.host is refused by the engine and still recorded, with its reason and routeNotModelled', () => {
    const { driver, run } = rig3();
    run(1);
    const r = driver.host.dispatch(cmd('im1', { ...GIVE, route: 'im' })) as { accepted: boolean; reason?: string };
    expect(r.accepted).toBe(false);
    const a = driver.phaseRunner!.admin.at(-1);
    expect(a).toMatchObject({ kind: 'drug', drugId: 'dantrolene', route: 'im', result: { accepted: false, reason: r.reason, routeNotModelled: true } });
  });

  it('the record rewinds with a bookmark restore', async () => {
    const { driver, run } = rig3();
    run(1);
    driver.host.dispatch(cmd('a1', GIVE, { actionId: 'dantrolene', stageGroup: 'press-1' }));
    expect((await driver.hook({ id: 'b', issuedBy: 'instructor', type: 'scenario', action: 'bookmark', target: 'one' })).accepted).toBe(true);
    run(1);
    driver.host.dispatch(cmd('a2', GIVE, { actionId: 'dantrolene', stageGroup: 'press-2' }));
    expect(driver.phaseRunner!.admin.map((a) => a.seq)).toEqual([1, 2]);
    expect((await driver.hook({ id: 'r', issuedBy: 'instructor', type: 'scenario', action: 'restoreBookmark', target: 'one' })).accepted).toBe(true);
    expect(driver.phaseRunner!.admin.map((a) => a.seq)).toEqual([1]);
  });
});

describe('ScenarioDriver: "route not modelled" in the record comes from routeHonoured (F5.1b)', () => {
  const GIVE = { kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', route: 'iv' };
  const CARD = {
    schema: 'pme-scenario/2', id: 'rnm2', title: 'Route not modelled (format 2)', patient: { weightKg: 80 },
    phases: [{ id: 'calm', label: 'Calm', initial: true }],
    actions: [{ id: 'dantrolene', label: 'Dantrolene', kind: 'drug', phases: ['calm'], give: [{ type: 'applyEvent', event: GIVE }], drug: { id: 'dantrolene', route: { set: ['iv', 'im'] } } }],
  };
  const cmd = (id: string, event: object) => ({ id, issuedBy: 'instructor', type: 'applyEvent', event }) as unknown as Command;
  function rig() {
    const host = manualHost({ seed: 42 });
    const driver = new ScenarioDriver({ target: host });
    expect(driver.load(CARD).ok).toBe(true);
    host.engine.advanceTo(0.02);
    driver.poll();
    return driver;
  }

  it('the IM dantrolene administration carries the flag', () => {
    const driver = rig();
    driver.host.dispatch(cmd('im1', { ...GIVE, route: 'im' }));
    expect(driver.phaseRunner!.admin.at(-1)).toMatchObject({ drugId: 'dantrolene', route: 'im', result: { accepted: false, routeNotModelled: true } });
  });
  it('an IM dose refused for another reason first still carries the flag: the route is asked of the engine, not read from the sentence', () => {
    const driver = rig();
    driver.host.dispatch(cmd('im2', { ...GIVE, dose: -1, route: 'im' }));
    const a = driver.phaseRunner!.admin.at(-1)!;
    expect(a.result).toMatchObject({ accepted: false, routeNotModelled: true });
    expect(a.result.accepted ? '' : a.result.reason).not.toMatch(/route/);
  });
  it('an IV dose refused for its dose does not carry the flag', () => {
    const driver = rig();
    driver.host.dispatch(cmd('iv1', { ...GIVE, dose: -1 }));
    expect(driver.phaseRunner!.admin.at(-1)!.result).toMatchObject({ accepted: false, routeNotModelled: false });
  });
});
