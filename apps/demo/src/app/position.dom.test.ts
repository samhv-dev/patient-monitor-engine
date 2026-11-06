// @vitest-environment happy-dom
// fix-reload-keeps-case: the position a reload comes back to — kept in this tab's sessionStorage, read back only under the
// same session code, build and engine and within MAX_AGE_MS (anything else is dropped), and the Debrief's record going on
// from the restored moment with one row saying so. The stage marks go with it (the owner's report of 30 October: after a
// refresh the past stages could no longer be returned to): kept beside the position with the snapshots they hold, placed
// again on the reloaded page with the course's history, so the strip's past stages have their time and their return.
import { createEngine, engineKey, type Command } from '@pme/engine-core';
import { ScenarioView, type ScenarioCommand, type WireEvent } from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, type Action, type PhaseRunnerState, type ScenarioDocV2, type StageMarkPosition } from '@pme/controller/scenario';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import mh from './showcase/showcase-mh.json';
import type { Link } from './link.ts';
import { APP_BUILD, clearPosition, keepPositions, MAX_AGE_MS, readPosition, readStageMarks, RELOAD_MARK, restorePosition, savePosition, saveStageMarks, type Position } from './position.ts';
import { report3 } from './debrief.ts';
import { RunRecord } from './record.ts';
import { scenarioById, type ScenarioCard } from './scenarios.ts';
import type { AppSession } from './session.ts';
import type { Teach2Ctx } from './teach2/ctx.ts';
import { mount as mountStrip, stageMarks } from './teach2/strip.ts';

const NOW = 1_800_000_000_000;
const position = (o: Partial<Position> = {}): Position => ({
  schema: 'pme-position/1', code: 'KKQB2N', build: APP_BUILD, engine: engineKey, savedAt: NOW - 1000, cardId: 'showcase-mh', title: 'Malignant hyperthermia',
  stateId: 'intubated', simT: 511.2, speed: 4, paused: false, learner: false,
  run: { snapshot: { schema: 'pme-snapshot/1', engineVersion: engineKey, seed: 7, tick: 25560, state: { any: 'json' } }, seed: 0, runner: { stateId: 'intubated' } as never },
  record: new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 })).keep(),
  ...o,
});
const read = (code = 'KKQB2N', now = NOW) => readPosition({ code, now });

describe('the position a reload comes back to', () => {
  beforeEach(() => sessionStorage.clear());

  it('survives JSON in sessionStorage and reads back whole under the same session code', () => {
    const p = position();
    expect(savePosition(p)).toBe(true);
    expect(read()).toEqual(p);
    expect(read()).toEqual(p); // reading keeps it (a second reload comes back too)
    clearPosition();
    expect(read()).toBeNull();
  });

  it('is dropped under another session code, another build or engine, a day later, or unreadable', () => {
    const cases: Array<[string, () => void]> = [
      ['another session code', () => void savePosition(position())],
      ['another app build', () => void savePosition(position({ build: 'deadbeef 2026-10-23' }))],
      ['another engine', () => void savePosition(position({ engine: '1.0.0-rc.2+dev' }))],
      ['a snapshot of another engine', () => void savePosition(position({ run: { ...position().run, snapshot: { ...position().run.snapshot, engineVersion: 'old' } } }))],
      ['another day', () => void savePosition(position({ savedAt: NOW - MAX_AGE_MS - 1 }))],
      ['unreadable', () => sessionStorage.setItem('pme.position', '{not json')],
    ];
    for (const [what, put] of cases) {
      put();
      expect(read(what === 'another session code' ? 'ZZZZZZ' : 'KKQB2N'), what).toBeNull();
      expect(sessionStorage.getItem('pme.position'), `${what}: dropped`).toBeNull();
    }
  });

  it('a storage that refuses it keeps nothing (never an older position)', () => {
    savePosition(position({ simT: 100 }));
    const full = { setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: (k: string) => sessionStorage.removeItem(k), getItem: (k: string) => sessionStorage.getItem(k) } as unknown as Storage;
    expect(savePosition(position({ simT: 500 }), full)).toBe(false);
    expect(read()).toBeNull();
  });

  it('the Debrief record goes on from the restored moment: later rows and samples dropped, one row says so', () => {
    const a = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }));
    a.wire({ type: 'commandApplied', commandId: 'l', tick: 0, resolved: { command: { id: 'l', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: mh } } } as WireEvent);
    a.wire({ type: 'scenario', t: 305, stateId: 'intubated' } as WireEvent);
    a.engine({ type: 'measurement', t: 509, values: { hr: { value: 69, flag: 'ok' } } } as never);
    a.engine({ type: 'measurement', t: 512, values: { hr: { value: 70, flag: 'ok' } } } as never);
    const kept = JSON.parse(JSON.stringify(a.keep())) as ReturnType<RunRecord['keep']>;
    const b = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 })); // the reloaded page's fresh record
    b.wire({ type: 'commandApplied', commandId: 'r', tick: 25550, resolved: { command: { id: 'r', issuedBy: 'instructor', type: 'scenario', action: 'restoreBookmark', target: RELOAD_MARK } } } as WireEvent);
    b.resume(kept, 511);
    b.wire({ type: 'scenario', t: 305, stateId: 'intubated' } as WireEvent); // the restore's re-publish of the state
    expect(b.data.doc?.id).toBe('showcase-mh');
    expect(b.data.patient).toBe('M 35 y 80 kg');
    expect(b.data.rows.map((r) => `${r.t} ${r.kind} ${r.text}`)).toEqual([
      '0 scenario Scenario loaded: Malignant hyperthermia',
      '305 scenario Scenario state: Intubated: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 % at 2 L/min',
      '511 restore Restored after a reload of the page',
    ]);
    expect(b.data.samples.map((s) => s.t)).toEqual([509]);
  });
});

/** A page of the app as position.ts sees it: an engine on the card's patient, the host's driver with stage marks on (as
 *  Instructor v2 turns them on), the panel's scenario view fed by the driver's events, the panel's sends going to the
 *  driver's hook, and the app's Load (session.ts loadScenario: it forgets the kept position). */
function page(code = 'KKQB2N', cardId = 'showcase-mh') {
  const card = scenarioById(cardId) as ScenarioCard;
  const eo = engineOptionsOf(card.doc, 7);
  const engine = createEngine({ ...eo, mode: card.doc.mode ?? 'modeled', truthHz: 1 } as never);
  const sv = new ScenarioView();
  // the session's record (session.ts): the host's phase runner's grade inputs, its engine events and the wire's events
  let driver: ScenarioDriver | null = null;
  const record = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }), Date.now, () => driver?.phaseRunner ?? null);
  engine.on((e) => record.engine(e as never));
  driver = new ScenarioDriver({
    target: { dispatch: (c: Command) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (x) => engine.restore(x), on: (fn) => engine.on(fn), now: () => engine.now(), time: () => undefined },
    publish: (e) => (sv.onEvent(e), record.wire(e as WireEvent)),
    stageMarks: true,
  });
  let n = 0;
  const send = async (c: Record<string, unknown>) => {
    const cmd = { ...c, id: `c${++n}`, issuedBy: 'instructor' } as ScenarioCommand;
    if (cmd.type !== 'scenario') return { accepted: true, tick: engine.now().tick, commandId: cmd.id, rttMs: 0 };
    const r = await driver.hook(cmd);
    const applied = { type: 'commandApplied', commandId: cmd.id, tick: r.tick, resolved: { command: r.applied ?? cmd } } as WireEvent;
    if (r.accepted && cmd.action === 'load') sv.onEvent(applied);
    if (r.accepted) record.wire(applied);
    return { ...r, commandId: cmd.id, rttMs: 0 };
  };
  const s = {
    code, driver, restoring: false, fastForwarding: false, host: { fastForwarding: false }, timeScale: 1, paused: false, learner: false,
    lastLoad: Promise.resolve({ accepted: false }), panel: { send, scenario: sv }, record,
    setLearner: () => undefined,
  };
  const load = (c: ScenarioCard) => (clearPosition(), (s.lastLoad = send({ type: 'scenario', action: 'load', doc: c.doc })), true);
  /** `secs` of sim time, polled every tick like a frame loop, yielding so the marks' snapshots land. */
  const run = async (secs: number) => {
    const end = engine.now().tick + Math.round(secs * 50);
    for (let tick = engine.now().tick + 1; tick <= end; tick++) {
      engine.advanceTo(tick * 0.02);
      driver.poll();
      if (tick % 10 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  };
  const goto = async (target: string) => (expect((await send({ type: 'scenario', action: 'goto', target })).accepted, target).toBe(true), await run(1));
  /** An A press of a /2 card (teach2/press.ts pressAction): the action's `give`, every command stamped with its id. */
  let g = 0;
  const press = async (actionId: string) => {
    const act = (card.doc as unknown as ScenarioDocV2).actions.find((a) => a.id === actionId) as Action;
    const stageGroup = `press-${++g}`;
    for (const c of act.give ?? []) {
      const { $comment: _drop, ...cmd } = c as typeof c & { $comment?: string };
      expect((await driver.host.dispatch({ ...cmd, id: `p${g}`, issuedBy: 'instructor', stageGroup, actionId } as unknown as Command)).accepted, actionId).toBe(true);
    }
    await run(1);
  };
  return { card, engine, sv, driver, record, s: s as unknown as AppSession, load, run, goto, send, press };
}

/** The latest stage mark of each stage, in the order they were placed (the one the strip returns to). */
const latestPerStage = (marks: readonly ScenarioCommand[]) => marks.filter((m, i) => !marks.slice(i + 1).some((x) => x.note === m.note));

describe('stage marks across a reload (the owner\'s report of 30 October)', () => {
  beforeEach(() => sessionStorage.clear());

  it('a reload mid-card brings the course\'s stage marks back with its history: each past stage has its time and its return to that mark', async () => {
    const a = page();
    a.load(a.card);
    await a.run(1);
    for (const st of ['preoxygenated', 'premedicated', 'induced', 'intubated', 'surgery', 'earlySigns', 'established', 'triggerOff', 'treating', 'triggerOff', 'treating']) await a.goto(st);
    const before = a.driver.stageMarks();
    expect(before.filter((m) => m.note === 'triggerOff')).toHaveLength(2);
    const stop = keepPositions(a.s, 5);
    for (let i = 0; i < 200 && !(sessionStorage.getItem('pme.position') && sessionStorage.getItem('pme.position.marks')); i++) await new Promise((r) => setTimeout(r, 5));
    stop();
    const kept = readPosition({ code: 'KKQB2N' }) as Position;
    expect(kept.stateId).toBe('treating');

    // the reloaded page
    const b = page();
    expect(await restorePosition(kept, b.s, b.load)).toBe(true);
    expect(b.driver.runner?.stateId).toBe('treating');
    // the course's marks are back (the latest of each stage: the one the strip returns to), with their labels
    expect(b.driver.stageMarks().map((m) => m.target)).toEqual(latestPerStage(before).map((m) => m.target));
    expect(b.driver.stageMarks().map((m) => m.note)).toEqual(['awake', 'preoxygenated', 'premedicated', 'induced', 'intubated', 'surgery', 'earlySigns', 'established', 'triggerOff', 'treating']);
    // …and the course's history, so the strip has each past stage's entry
    expect(b.sv.history.slice(0, a.driver.runner?.history.length)).toEqual(a.driver.runner?.history);

    // the strip on the reloaded page: Trigger off has its time and an enabled return to its kept mark
    const link = { ctl: { scenario: b.sv, bookmarks: [], simT: b.engine.now().simT, hostPaused: false, send: b.send }, host: { driver: b.driver, record: { data: { rows: [] } } }, simT: b.engine.now().simT, send: b.send, note: () => undefined } as unknown as Link;
    const el = document.createElement('nav');
    document.body.append(el);
    mountStrip(el, { link, keys: { digit: () => undefined, letter: () => undefined, escape: () => () => undefined } } as unknown as Teach2Ctx);
    const chip = el.querySelector('button.ip2-past[aria-label^="Stage Trigger off"]') as HTMLButtonElement;
    expect(chip.classList.contains('ip2-skipped')).toBe(false);
    chip.click();
    const back = el.querySelector('.ip2-pop button') as HTMLButtonElement;
    expect(back?.textContent).toBe('Return to its start');
    expect(back?.getAttribute('aria-label')).toBe('Return to the start of Trigger off');
    expect(back.disabled).toBe(false);
    const entry = { stage: 'triggerOff', stateId: 'triggerOff', t: 0 };
    expect(stageMarks.of(link, entry)).toBe(before.filter((m) => m.note === 'triggerOff').at(-1)?.target);

    // the mark restores the physiology it held: the same engine state as the first page returning to it
    const mark = before.filter((m) => m.note === 'triggerOff').at(-1) as ScenarioCommand;
    for (const p of [a, b]) {
      expect(await p.send({ type: 'scenario', action: 'restoreBookmark', target: mark.target })).toMatchObject({ accepted: true, tick: mark.atTick });
      await p.run(3);
    }
    expect(b.engine.snapshot()).toEqual(a.engine.snapshot());
    el.remove();
  }, 60_000);

  it('kept only beside a position of the same session, build, engine and card; a new body (clearPosition) forgets them', () => {
    const m = { mark: { id: 'stage-mark-1', issuedBy: 'scenario', type: 'scenario', action: 'bookmark', target: 'stage:awake:1', kind: 'stage', note: 'awake', atTick: 5 }, run: position().run } as StageMarkPosition;
    expect(saveStageMarks(position(), [m])).toBe(true);
    expect(readStageMarks(position())).toEqual([m]);
    expect(readStageMarks(position({ code: 'ZZZZZZ' }))).toEqual([]);
    expect(readStageMarks(position({ cardId: 'showcase-haemorrhage' }))).toEqual([]);
    expect(readStageMarks(position({ build: 'deadbeef 2026-10-23' }))).toEqual([]);
    saveStageMarks(position(), [m]);
    clearPosition();
    expect(sessionStorage.getItem('pme.position.marks')).toBeNull();
  });

  it('the marks never cost the case: a storage too full for both drops the marks and keeps the position', () => {
    const m = { mark: { id: 'm', issuedBy: 'scenario', type: 'scenario', action: 'bookmark', target: 'stage:awake:1', kind: 'stage', note: 'awake', atTick: 5 }, run: position().run } as StageMarkPosition;
    saveStageMarks(position(), [m]);
    let refused = 0;
    // refuses the position while the marks are kept, then takes it
    const tight = { setItem: (k: string, v: string) => (sessionStorage.getItem('pme.position.marks') !== null && (refused++, true) ? (() => { throw new Error('QuotaExceededError'); })() : sessionStorage.setItem(k, v)), removeItem: (k: string) => sessionStorage.removeItem(k), getItem: (k: string) => sessionStorage.getItem(k) } as unknown as Storage;
    expect(savePosition(position({ simT: 500 }), tight)).toBe(true);
    expect(refused).toBe(1);
    expect(read()?.simT).toBe(500);
    expect(sessionStorage.getItem('pme.position.marks')).toBeNull();
    // marks the storage refuses are not kept (never a stale set)
    const full = { setItem: () => { throw new Error('QuotaExceededError'); }, removeItem: (k: string) => sessionStorage.removeItem(k), getItem: (k: string) => sessionStorage.getItem(k) } as unknown as Storage;
    saveStageMarks(position(), [m]);
    expect(saveStageMarks(position(), [m, m], full)).toBe(false);
    expect(sessionStorage.getItem('pme.position.marks')).toBeNull();
  });
});

// Brief 50 (research/41 row 55): a /2 card came back from a reload at its start — keepPositions read only the /1 runner
// (ScenarioDriver.runner), so no position of a /2 run was ever kept. The /2 phase runner now goes through the same path:
// its position (the engine snapshot and PhaseRunnerState: the phase, its entry time, the takings, the holds, the record of
// administrations) is taken with the rest, and restorePosition returns to it through the same RELOAD_MARK bookmark. The
// Debrief's /2 report is grade() on the record's copy of the runner's facts, so it reads the same after the reload; the
// restore records no taking a second time.
describe('a /2 card across a reload (brief 50)', () => {
  let stop = () => undefined as void;
  beforeEach(() => sessionStorage.clear());
  afterEach(() => stop());
  const kept = () => readPosition({ code: 'KKQB2N' });
  /** Until the kept position satisfies `ok` (keepPositions takes one every 5 ms here). */
  const until = async (ok: (p: Position | null) => boolean) => {
    for (let i = 0; i < 400 && !ok(kept()); i++) await new Promise((r) => setTimeout(r, 5));
    return kept();
  };
  const state = (p: Position | null) => p?.run.runner as PhaseRunnerState | undefined;

  it('its position is kept after each phase entry and each taking, and the reload returns to it with the same report', async () => {
    const a = page('KKQB2N', 'showcase-mh-v2');
    a.load(a.card);
    await a.run(1);
    stop = keepPositions(a.s, 5);
    // a taking: kept with its count and its administration
    await a.press('dantrolene');
    let p = await until((x) => state(x)?.takings.dantrolene === 1);
    expect(p?.cardId).toBe('showcase-mh-v2');
    expect(state(p)?.schema).toBe('pme-scenario-runner/2');
    expect(state(p)?.admin.filter((x) => x.actionId === 'dantrolene')).toHaveLength(1);
    // a phase entry (Arrest, by the model's pulse loss: no hold; a pulseless electrical rhythm carries the arrest state,
    // an instructor's VF does not): kept with its entry time
    expect((await a.driver.host.dispatch({ id: 'vf', issuedBy: 'instructor', type: 'setRhythm', rhythm: 'sinus', opts: { pulseless: true } } as unknown as Command)).accepted).toBe(true);
    for (let i = 0; i < 30 && a.driver.phaseRunner?.stateId !== 'arrest'; i++) await a.run(1);
    expect(a.driver.phaseRunner?.stateId).toBe('arrest');
    p = await until((x) => x?.stateId === 'arrest');
    expect(state(p)?.enteredT).toBe(a.driver.phaseRunner?.enteredT);
    expect(state(p)?.phases.map((x) => x.id)).toEqual(['baseline', 'arrest']);
    // a second taking in that phase
    await a.press('cpr');
    p = await until((x) => state(x)?.takings.cpr === 1);
    expect(p?.stateId).toBe('arrest');
    // a moment later, the position and the record as one (the record copies the runner's facts once a sim second)
    await a.run(2);
    const at = a.engine.now().tick;
    p = await until((x) => x?.run.snapshot.tick === at);
    stop();
    const pos = p as Position;
    const before = report3(a.record.data);
    expect(before?.actions.find((x) => x.id === 'dantrolene')?.admin).toHaveLength(1);
    expect(report3(pos.record.data)).toEqual(before);

    // the reloaded page
    const b = page('KKQB2N', 'showcase-mh-v2');
    expect(await restorePosition(JSON.parse(JSON.stringify(pos)) as Position, b.s, b.load)).toBe(true);
    expect(b.driver.phaseRunner?.getState()).toEqual(pos.run.runner);
    expect(b.driver.phaseRunner?.stateId).toBe('arrest');
    expect(b.sv.history.slice(0, a.driver.phaseRunner?.history.length)).toEqual(a.driver.phaseRunner?.history);
    expect(report3(b.record.data), 'the same report: no taking recorded a second time').toEqual(before);
    expect(b.record.data.rows.at(-1)?.text).toBe('Restored after a reload of the page');
    // the case's stage marks come back with it, as a /1 card's do
    expect(b.driver.stageMarks().map((m) => m.note)).toEqual(a.driver.stageMarks().map((m) => m.note));
    // …and the run goes on from there as the first page's does
    for (const x of [a, b]) await x.run(3);
    expect(b.driver.phaseRunner?.getState()).toEqual(a.driver.phaseRunner?.getState());
    expect(report3(b.record.data)).toEqual(report3(a.record.data));
  }, 60_000);
});
