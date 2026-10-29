// The driver's automatic stage marks (owner's ruling on answer 3, Instructor v2): opt-in (IP9 review M1: off unless the
// v2 view turns them on), a bookmark of kind `stage` at every entry of a state that is a stage (not a hop: answer 2's
// fold rule; a return from the stage's own hop is no new entry), restorable like any bookmark, pruned to the kept
// course on a restore, replayed to late joiners, and kept out of the instructor's bookmark list. On the MH showcase
// card, through a HostSession.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { isHop, ScenarioDriver } from '../../src/scenario/driver.ts';
import { createStamper, type AppliedResolution, type ScenarioCommand, type ScenarioEvent, type WireEvent } from '../../src/protocol.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const MH = JSON.parse(readFileSync(new URL('../../../../apps/demo/src/app/showcase/showcase-mh.json', import.meta.url), 'utf8')) as ScenarioDoc;
const S = 'STG234';
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

function setup(stageMarks = true) {
  const host = manualHost({ seed: 42 });
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e), stageMarks });
  hs = new HostSession({ session: S, target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close());
  /** Advance `s` sim seconds tick by tick, polling like a frame loop, yielding so the host's command chain runs. */
  const run = async (s: number) => {
    const end = host.engine.now().tick + Math.round(s * 50);
    for (let tick = host.engine.now().tick + 1; tick <= end; tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
      if (tick % 5 === 0) await new Promise<void>((r) => setImmediate(r));
    }
  };
  const press = async (target: string) => {
    expect((await ctl.send({ type: 'scenario', action: 'trigger', target })).accepted, target).toBe(true);
    await run(3); // a hop's 2 s pass, and the next stage's mark is placed
  };
  return { host, hub, ctl, driver, run, press };
}

/** The state ENTRIES of a run, from the runner's log (an `enter` by a transition of the state itself is a stay). */
function entries(driver: ScenarioDriver): string[] {
  const doc = driver.runner!.doc;
  return driver.runner!.log.flatMap((l) => {
    if (l.op !== 'enter') return [];
    const own = doc.states.find((s) => s.id === l.stateId)?.transitions?.some((t) => t.id === l.transitionId?.replace(/:else$/, ''));
    return own ? [] : [l.stateId];
  });
}

/** Through every kind of stage entry the card has: presses, two treatment hops, a goto, a second-dose hop. */
async function course(r: ReturnType<typeof setup>) {
  await waitFor(() => r.ctl.hostOnline);
  expect((await r.ctl.send({ type: 'scenario', action: 'load', doc: MH })).accepted).toBe(true);
  await r.run(2);
  for (const t of ['premed', 'preox', 'induce', 'intubate', 'surgery', 'crisis-surgery', 'dant', 'cool-treating']) await r.press(t);
  expect((await r.ctl.send({ type: 'scenario', action: 'goto', target: 'recovering' })).accepted).toBe(true);
  await r.run(2);
  for (const t of ['normo', 'dant-normoventilated']) await r.press(t);
}

describe('stage marks (driver, host side)', () => {
  it('the hop rule of answer 2 on the MH card: the five treatment states are hops, nothing else is', () => {
    expect(MH.states.filter(isHop).map((s) => s.id)).toEqual(['dantrolene', 'dantroleneAgain', 'cooling', 'potassium', 'bicarbonate']);
  });

  it('opt-in (IP9 review M1): without the option, or after markStages(false), the driver takes no stage mark', async () => {
    const r = setup(false);
    await course(r);
    expect(r.driver.stageMarks()).toEqual([]);
    expect(r.driver.bookmarks()).toEqual([]);
    // turned on later: the next stage entry is marked, the stage already running is not
    r.driver.markStages(true);
    expect((await r.ctl.send({ type: 'scenario', action: 'goto', target: 'arrest' })).accepted).toBe(true);
    await r.run(2);
    expect(r.driver.stageMarks().map((m) => m.note)).toEqual(['arrest']);
    r.driver.markStages(false);
    await r.press('cpr');
    expect(r.driver.stageMarks().map((m) => m.note)).toEqual(['arrest']);
  }, 120_000);

  it('(a) every stage entry on the MH card gives exactly one stage mark with its state id; hops and the returns from them give none', async () => {
    const r = setup();
    await course(r);
    const all = entries(r.driver);
    expect(all).toEqual(expect.arrayContaining(['dantrolene', 'cooling', 'dantroleneAgain'])); // the hops were entered
    const hops = new Set(MH.states.filter(isHop).map((s) => s.id));
    const marks = r.driver.stageMarks();
    // one per stage entry, in order: a state entered right after itself through its own hop is the same stage entry
    expect(marks.map((m) => m.note)).toEqual(all.filter((id) => !hops.has(id)).filter((id, i, xs) => xs[i - 1] !== id));
    expect(marks.map((m) => m.note)).toEqual(['awake', 'premedicated', 'preoxygenated', 'induced', 'intubated', 'surgery', 'triggerOff', 'treating', 'recovering', 'normoventilated', 'treating']);
    expect(marks.every((m) => m.kind === 'stage' && m.action === 'bookmark' && m.target === `stage:${m.note}:${marks.indexOf(m) + 1}`)).toBe(true);
    expect(r.driver.bookmarks()).toEqual(expect.arrayContaining(marks.map((m) => m.target as string)));
    expect(r.ctl.bookmarks).toEqual([]); // not the instructor's bookmarks
  }, 120_000);

  it('(b) restoreBookmark on a stage mark returns to the start of that stage, as on any bookmark', async () => {
    const r = setup();
    await course(r);
    const mark = r.driver.stageMarks().find((m) => m.note === 'triggerOff') as ScenarioCommand;
    expect(r.driver.runner?.stateId).toBe('treating');
    const ack = await r.ctl.send({ type: 'scenario', action: 'restoreBookmark', target: mark.target });
    expect(ack).toMatchObject({ accepted: true, tick: mark.atTick });
    expect(r.host.engine.now().tick).toBe(mark.atTick);
    expect(r.driver.runner?.stateId).toBe('triggerOff');
    expect(r.driver.runner?.stateT).toBeLessThan(0.5); // its start: placed a few ticks after the entry
    await waitFor(() => r.ctl.scenario.stateId === 'triggerOff');
    // …and the run goes on from there like after any return: a press works, the next stage gets its mark
    await r.press('dant');
    expect(r.driver.runner?.stateId).toBe('treating');
    // the discarded course's marks went with it (IP9 review M1): the kept course's, then the new treating
    expect(r.driver.stageMarks().map((m) => m.note)).toEqual(['awake', 'premedicated', 'preoxygenated', 'induced', 'intubated', 'surgery', 'triggerOff', 'treating']);
    expect(r.driver.bookmarks().filter((b) => b.startsWith('stage:'))).toEqual(r.driver.stageMarks().map((m) => m.target));
  }, 120_000);

  it('a snapshot that fails while a mark is placed is logged, never an unhandled rejection; the run goes on', async () => {
    const r = setup();
    await waitFor(() => r.ctl.hostOnline);
    expect((await r.ctl.send({ type: 'scenario', action: 'load', doc: MH })).accepted).toBe(true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const snap = r.host.snapshot;
    r.host.snapshot = () => Promise.reject(new Error('snapshot failed'));
    await r.run(1);
    r.host.snapshot = snap;
    expect(warn.mock.calls.some((c) => String(c[0]).includes('stage mark not placed'))).toBe(true);
    warn.mockRestore();
    await r.run(1);
    expect(r.driver.stageMarks().map((m) => m.note)).toEqual(['awake']);
  }, 60_000);

  it('(c) a late joiner is replayed the stage marks (kind and note), and its bookmark list leaves them out', async () => {
    const r = setup();
    await course(r);
    expect((await r.ctl.send({ type: 'scenario', action: 'bookmark', target: 'mine', kind: 'good' })).accepted).toBe(true);
    const watcher = r.hub.connect();
    const got = collect(watcher);
    watcher.send(createStamper(S, 'late-raw')({ kind: 'hello', role: 'controller' }));
    await waitFor(() => got.some((m) => m.kind === 'snapshot'));
    const replayed = got.flatMap((m) => (m.kind === 'event' ? m.body : [])).filter((e): e is Extract<WireEvent, { type: 'commandApplied' }> => e.type === 'commandApplied' && !!(e.resolved as AppliedResolution).replay).map((e) => (e.resolved as AppliedResolution).command as ScenarioCommand).filter((c) => c.action === 'bookmark');
    expect(replayed.filter((c) => c.kind === 'stage')).toEqual(r.driver.stageMarks());
    expect(replayed.find((c) => c.target === 'mine')).toMatchObject({ kind: 'good' });
    const late = new ControllerSession({ session: S, transport: r.hub.connect(), issuedBy: 'remote' });
    cleanup.push(() => late.close());
    await waitFor(() => late.bookmarks.includes('mine'));
    expect(late.bookmarks).toEqual(['mine']);
  }, 120_000);
});
