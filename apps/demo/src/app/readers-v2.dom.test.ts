// @vitest-environment happy-dom
// Plan F1: every reader of a card learns that a card may have no states. Given a pme-scenario/2 document, each /1
// reader of the app gives the empty answer (no states, no objectives, no steps) and does not throw; its /1 path is
// unchanged (the existing tests). F6 and F7 make them read phases and actions.
import { afterEach, describe, expect, it } from 'vitest';
import { ControllerSession, createInProcessHub, createStamper, ScenarioView, type AnyScenarioDoc, type CommandInput, type Transition, type WireEvent } from '@pme/controller';
import { objectivesOf, reachable, rowsOf, stageOf, stagesOf, standingOf, untakenStatus, withStart, type Evidence } from './card-read.ts';
import { eventWords, judged, objectives, steps } from './debrief.ts';
import { keyMoments, keyTimes, whoOf } from './debrief-moments.ts';
import { emptyRun, RunRecord, type RunData } from './record.ts';
import { cardOf, type ScenarioCard } from './scenarios.ts';
import { transitionText } from './triggers.ts';
import { historyOf } from './teach2/course.ts';
import { stageEntries, stripModel } from './teach2/strip.ts';
import { Link } from './link.ts';
import { scenarioTab } from './panel/scenario.ts';
import type { PanelCtx } from './panel/ctx.ts';
import { AppSession } from './session.ts';
import { mountSessionBar } from './sessionbar.ts';
import { mount as mountAction } from './teach2/action.ts';
import { pinnedSteps } from './teach2/drug-sheet.ts';
import { mount as mountCue } from './teach2/cue.ts';
import { mount as mountStrip } from './teach2/strip.ts';
import type { Teach2Ctx } from './teach2/ctx.ts';
import { debriefView } from './views/debrief.ts';
import { scenariosView } from './views/scenarios.ts';

/** A pme-scenario/2 card, as packages/controller/test/scenario/fixtures-v2.ts has it (two phases, one judged row). */
const V2 = {
  schema: 'pme-scenario/2', id: 'showcase-mh', title: 'MH (format 2)', story: 'A 30-year-old for a knee arthroscopy.', durationMin: 40,
  patient: { ageY: 30, sex: 'M', weightKg: 80 },
  phases: [
    { id: 'baseline', label: 'Baseline', initial: true, next: ['early'] },
    { id: 'early', label: 'Early signs', enter: { value: { var: 'etco2', op: '>', value: 45, forS: 20 } } },
  ],
  actions: [{ id: 'callHelp', label: 'Call for help', kind: 'communication', phases: ['early'] }],
  judged: [{ id: 'nameMh', text: 'Names MH from the monitor', kind: 'recognition' }],
} as unknown as AnyScenarioDoc;
const TR = { id: 'go', to: 'early', when: { manual: { label: 'Go' } } } as Transition;
const EV: Evidence = { first: () => 0, met: () => false };
const HISTORY = [{ t: 0, stateId: 'baseline' }, { t: 30, stateId: 'early', transitionId: 'enter:early' }];
const run = (): RunData => {
  const d = emptyRun('M 30 y 80 kg', 80, 0);
  d.doc = V2;
  d.rows = [{ t: 0, kind: 'scenario', text: 'Scenario loaded' }, { t: 30, kind: 'scenario', text: 'Scenario state: next state', ev: 'state:early', tr: 'enter:early', by: 'rule' }];
  return d;
};

describe('card-read.ts and a pme-scenario/2 card', () => {
  it('no stages, no rows, no linked objectives, nothing reachable, no standing, the history as it is', () => {
    expect(stagesOf(V2)).toEqual([]);
    expect(stageOf(V2, 'early')).toBeNull();
    expect(rowsOf(V2, 'early')).toEqual([]);
    expect(objectivesOf(V2, TR)).toEqual([]);
    expect(reachable(V2, 'baseline', 'early')).toBe(false);
    expect(standingOf(V2, TR, { dueT: 0, leftT: null, now: 60 }, EV)).toEqual({ asked: false, dueS: null });
    expect(untakenStatus(V2, TR, { stateId: 'baseline', current: 'early', dueT: 0, leftT: 30, now: 60 }, EV)).toBeNull();
    expect(withStart(V2, HISTORY.slice(1), 0)).toEqual(HISTORY.slice(1));
  });
});

describe('the run record, the Debrief and its key moments, and a pme-scenario/2 card', () => {
  it('record.ts: the load keeps the doc; a phase entry is a state row named "next state" (no throw on doc.states)', () => {
    const rec = new RunRecord(() => ({ patient: 'M 30 y 80 kg', weightKg: 80 }), () => 0);
    rec.wire({ type: 'commandApplied', commandId: 'c1', tick: 0, resolved: { command: { id: 'c1', issuedBy: 'host', type: 'scenario', action: 'load', doc: V2 } } } as WireEvent);
    rec.wire({ type: 'scenario', t: 30, stateId: 'early', transitionId: 'enter:early' } as WireEvent);
    expect(rec.data.doc).toBe(V2);
    expect(rec.data.rows.at(-1)).toMatchObject({ t: 30, kind: 'scenario', text: 'Scenario state: next state', ev: 'state:early' });
  });
  it('debrief.ts: no objectives, no steps, no judged rows; a state event in words is "named in the rule"', () => {
    const d = run();
    expect(objectives(d)).toEqual([]);
    expect(steps(d)).toEqual([]);
    expect(judged(d)).toEqual([]);
    expect(eventWords('state:early', d)).toBe('the state "named in the rule"');
  });
  it('debrief-moments.ts: a phase change is the scenario\'s; no recognition key time; the moments read without a state', () => {
    const d = run();
    expect(whoOf(d, 'baseline', 'early')).toBe('scenario');
    expect(keyTimes(d).some((k) => k.id === 'recognition')).toBe(false);
    expect(() => keyMoments(d)).not.toThrow();
  });
});

describe('the library, the trigger words and Instructor v2\'s course and strip, and a pme-scenario/2 card', () => {
  it('scenarios.ts cardOf: the header (title, story, minutes, patient); the case details are the judged rows and the graded actions (F6)', () => {
    expect(cardOf(V2)).toMatchObject({ id: 'showcase-mh', title: 'MH (format 2)', story: 'A 30-year-old for a knee arthroscopy.', minutes: 40, patient: 'M 30 y 80 kg', objectives: ['Names MH from the monitor', 'Call for help'], doc: V2 });
  });
  it('triggers.ts transitionText: the target has no state label ("next state")', () => {
    expect(transitionText(TR, V2)).toBe('You press "Go": next state');
  });
  it('teach2 course.ts historyOf: the history as it is; strip.ts: no stage entries, no strip items', () => {
    const link = { ctl: { scenario: { doc: V2, history: HISTORY } }, host: { record: { data: run() } } } as unknown as Link;
    expect(historyOf(link)).toBe(HISTORY);
    expect(stageEntries(V2, HISTORY, { stateId: 'early', enteredT: 30 }, 60)).toEqual([]);
    expect(stripModel(V2, 'early', [], 0)).toEqual([]);
  });
});

// ---- the views: each draws a pme-scenario/2 card's empty answer and does not throw ----------------------------------
afterEach(() => document.body.replaceChildren());
const settle = () => new Promise((r) => setTimeout(r, 0));
/** A scenario view with the /2 card loaded and its second phase current (as F2 will publish it). */
function view(): ScenarioView {
  const sv = new ScenarioView();
  sv.doc = V2;
  sv.docVersion = 1;
  sv.stateId = 'early';
  sv.enteredT = 30;
  sv.history = HISTORY;
  return sv;
}
function fakeLink(sv: ScenarioView): Link {
  const send = async (_c: CommandInput) => ({ accepted: true, tick: 0, commandId: 'c1', rttMs: 0 });
  return { ctl: { scenario: sv, bookmarks: [], simT: 60, send, state: null, hostPaused: false }, host: null, simT: 60, log: [], ramps: new Map(), send, note: () => undefined } as unknown as Link;
}

describe('the instructor views and a pme-scenario/2 card', () => {
  it("today's Scenario tab (panel/scenario.ts): the title and story, no objectives, no states on its strip, no transitions", () => {
    let refresh = () => undefined as void;
    const ctx = { link: fakeLink(view()), staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx;
    const el = scenarioTab(ctx);
    document.body.append(el);
    expect(() => refresh()).not.toThrow();
    expect(el.textContent).toContain('MH (format 2)');
    expect(el.textContent).toContain('A 30-year-old for a knee arthroscopy.');
    expect(el.querySelectorAll('input[type=checkbox][id^=obj-]').length).toBe(0);
    expect(el.textContent).toContain('This card is pme-scenario/2: run it from Instructor v2.');
    expect(el.querySelectorAll('ul.next li').length).toBe(0);
  });
  it('Instructor v2: the strip has no chips, the cue box no stage, ACTION no rows', () => {
    const link = fakeLink(view());
    const keys = { digit: () => undefined, letter: () => undefined, escape: () => () => undefined };
    const ctx = { link, keys, site: {}, weightKg: () => 70, dock: {}, openSheet: () => undefined } as unknown as Teach2Ctx;
    const strip = document.createElement('nav');
    const cue = document.createElement('div');
    const action = document.createElement('div');
    document.body.append(strip, cue, action);
    expect(() => [mountStrip(strip, ctx), mountCue(cue, ctx), mountAction(action, ctx)].forEach((s) => s.refresh())).not.toThrow();
    expect(strip.querySelectorAll('.ip2-chips > .ip2-chip').length).toBe(0);
    expect(cue.querySelector('.ip2-cue-name')?.textContent).toBe('No scenario running');
    expect(action.querySelectorAll('.ip2-row').length).toBe(0);
  });
  it('link.ts: a phase entry in the clinical log is a scenario state named "next state"', async () => {
    const hub = createInProcessHub();
    const host = hub.connect();
    const t = hub.connect();
    const link = new Link(new ControllerSession({ session: 'LNK234', transport: t }), t, null);
    const stamp = createStamper('LNK234', 'host-1');
    host.send(stamp({ kind: 'event', body: [
      { type: 'commandApplied', commandId: 'c1', tick: 0, resolved: { command: { id: 'c1', issuedBy: 'host', type: 'scenario', action: 'load', doc: V2 } } },
      { type: 'scenario', t: 30, stateId: 'early', transitionId: 'enter:early' },
    ] } as never));
    await settle();
    expect(link.ctl.scenario.doc).toEqual(V2);
    expect(link.log.at(-1)).toMatchObject({ simT: 30, kind: 'scenario', text: 'Scenario state: next state' });
    link.close();
  });
  it('the Debrief view (views/debrief.ts) draws a /2 run with no steps table rows', () => {
    const record = new RunRecord(() => ({ patient: 'M 30 y 80 kg', weightKg: 80 }), () => 0);
    record.wire({ type: 'commandApplied', commandId: 'c1', tick: 0, resolved: { command: { id: 'c1', issuedBy: 'host', type: 'scenario', action: 'load', doc: V2 } } } as WireEvent);
    record.wire({ type: 'scenario', t: 30, stateId: 'early', transitionId: 'enter:early' } as WireEvent);
    const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
    const v = debriefView({ record } as unknown as AppSession, link);
    document.body.append(v.el);
    expect(() => v.enter?.('')).not.toThrow();
    expect(v.el.querySelectorAll('.db-steps tbody tr').length).toBe(0);
    v.leave?.();
  });
});

// Three readers the type checker cannot see (a cast, and two "has the scenario ended" tests that read a missing state as
// the end): each gives a /2 card the empty answer too. F2's ended() answers for both formats; F6 points them at it.
describe('the readers behind a cast or an "ended" test, and a pme-scenario/2 card', () => {
  it('teach2 drug-sheet.ts pinnedSteps: no pinned steps (no throw in classify)', () => {
    expect(pinnedSteps(fakeLink(view()))).toEqual([]);
  });
  it('sessionbar.ts: the title and the phase id, and Debrief is not "ready" (no end is known)', async () => {
    const link = { ...fakeLink(view()), onChange: () => () => undefined, conditions: new Map(), ctl: { ...fakeLink(view()).ctl, timeScale: 1, fastForward: null } } as unknown as Link;
    const bar = document.createElement('header');
    document.body.append(bar);
    const off = mountSessionBar(bar, link);
    await new Promise((r) => setTimeout(r, 100)); // its draw is throttled to a timer and a frame
    expect(bar.querySelector('.scen')?.textContent).toMatch(/^MH \(format 2\): early /);
    expect((bar.querySelector('.sb-debrief') as HTMLElement).dataset.ready).toBe('false');
    off();
  });
  it('views/debrief.ts: no "the scenario has ended" toast for a /2 card', () => {
    let changed = () => undefined as void;
    const sv = view();
    const link = { onChange: (fn: () => void) => ((changed = fn), () => undefined), ctl: { scenario: sv } } as unknown as Link;
    debriefView({ record: new RunRecord(() => ({ patient: '', weightKg: 80 }), () => 0) } as unknown as AppSession, link);
    changed();
    expect([...document.querySelectorAll('.toast')].map((t) => t.textContent).filter((t) => t?.includes('has ended'))).toEqual([]);
  });
});

describe('loading a pme-scenario/2 card in the app (refused until F2)', () => {
  it('session.ts loadScenario refuses it before the patient restarts, with the driver\'s reason', () => {
    const fake = { fastForwarding: false } as unknown as AppSession;
    expect(AppSession.prototype.loadScenario.call(fake, V2)).toEqual({ ok: false, reason: 'pme-scenario/2 cards run from F2 on' });
  });
  it('views/scenarios.ts: an imported /2 file is not loaded and says why', async () => {
    const loaded: string[] = [];
    const v = scenariosView({ session: { live: false }, loadScenario: (c: ScenarioCard) => (loaded.push(c.id), true) } as never);
    document.body.append(v.el);
    v.enter?.('builder');
    const input = v.el.querySelector('#scen-import') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File([JSON.stringify(V2)], 'mh2.json', { type: 'application/json' })], configurable: true });
    input.dispatchEvent(new Event('change'));
    await settle();
    await settle();
    expect(loaded).toEqual([]);
    expect(v.el.querySelector('p.error')?.textContent).toBe('Error: mh2.json is a pme-scenario/2 card; pme-scenario/2 cards run from F2 on.');
  });
});
