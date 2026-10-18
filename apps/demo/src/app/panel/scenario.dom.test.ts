// @vitest-environment happy-dom
// A scenario card's manual-trigger button pressed as the case changes state (WebKit: "MH crisis" pressed the instant
// the case reached "Established" did nothing). The panel repaints ≤ 2 Hz, so a button can be the one drawn for the
// previous state: the press resolves its label against the CURRENT state, and a press the current state cannot take is
// said in a toast and not logged as an instructor action.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScenarioView, type AckResult, type CommandInput, type ScenarioDoc } from '@pme/controller';
import type { Link } from '../link.ts';
import type { PanelCtx } from './ctx.ts';
import { throttle } from '../ui.ts';
import { scenarioTab } from './scenario.ts';

const DOC = {
  schema: 'pme-scenario/1', id: 'test-stale-press', title: 'Stale press', initialState: 'onset',
  states: [
    { id: 'onset', label: 'Onset', transitions: [
      { id: 'onset-crisis', to: 'established', when: { manual: { label: 'MH crisis' } } },
      { id: 'onset-help', to: 'established', when: { manual: { label: 'Call for help' } } },
    ] },
    { id: 'established', label: 'Established', transitions: [{ id: 'established-crisis', to: 'treated', when: { manual: { label: 'MH crisis' } } }] },
    { id: 'treated', label: 'Treated' },
  ],
} as ScenarioDoc;

function rig(reply: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 }, during: (sv: ScenarioView) => void = () => undefined, repaint: (fn: () => void) => () => void = (fn) => fn, paintNow = true) {
  const sv = new ScenarioView();
  sv.doc = DOC;
  sv.docVersion = 1;
  sv.stateId = 'onset';
  const sent: CommandInput[] = [];
  const logged: string[] = [];
  const send = async (c: CommandInput) => (sent.push(c), during(sv), reply);
  // the real Link.send logs every command it sends (a refusal too, marked "not applied"): the fake does the same
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT: 0, send },
    host: null,
    simT: 0,
    send: async (c: CommandInput, kind = 'instructor') => (logged.push(kind), send(c)),
    note: (_text: string, kind = 'note') => void logged.push(kind),
  } as unknown as Link;
  let refresh = () => undefined as void;
  const ctx = { link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = repaint(fn)), goTab: () => undefined } as unknown as PanelCtx;
  const el = scenarioTab(ctx);
  document.body.append(el);
  if (paintNow) refresh();
  const buttonFor = (label: string) => [...el.querySelectorAll('ul.next button')].find((b) => b.textContent === label) as HTMLButtonElement;
  return { sv, el, sent, logged, refresh: () => refresh(), buttonFor };
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);
const targets = (sent: CommandInput[]) => sent.map((c) => (c as { target?: string }).target);

describe('scenario panel: a manual-trigger button drawn for the previous state', () => {
  beforeEach(() => document.body.replaceChildren());

  it('sends the current state\'s transition when the same label exists there', async () => {
    const { sv, sent, logged, buttonFor } = rig();
    const stale = buttonFor('MH crisis'); // drawn in "Onset"
    sv.stateId = 'established'; // the case moves on before the next repaint
    stale.click();
    await settle();
    expect(targets(sent)).toEqual(['established-crisis']);
    expect(logged).toEqual(['instructor']);
    expect(toasts()).toEqual([]);
  });

  it('a label the current state does not have: a toast naming the state, nothing sent, nothing logged', async () => {
    const { sv, sent, logged, buttonFor } = rig();
    const stale = buttonFor('Call for help');
    sv.stateId = 'established';
    stale.click();
    await settle();
    expect(sent).toEqual([]);
    expect(logged).toEqual([]);
    expect(toasts()).toEqual(['Not available now: the case has moved to Established.']);
  });

  it('a refusal from the scenario runner: a toast in clinical words (no state id), nothing logged', async () => {
    // the runner moved on before the panel's view heard of it; its state event arrives with the refusal
    const { sent, logged, buttonFor } = rig({ accepted: false, tick: 0, commandId: 'c1', rttMs: 0, reason: 'no transition onset-crisis in state established' }, (sv) => (sv.stateId = 'established'));
    buttonFor('MH crisis').click();
    await settle();
    expect(targets(sent)).toEqual(['onset-crisis']);
    expect(logged).toEqual([]);
    expect(toasts()).toEqual(['Not available now: the case has moved to Established.']);
  });
});

// F-CW3-1 (fix-ci-webkit-3): "Choose another scenario" pressed before the tab's first throttled repaint (a timer, then
// a frame) was undone by it: the panel read the first repaint as a new scenario document and closed the library.
describe('scenario panel: "Choose another scenario" and the throttled repaint', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame', 'performance'] });
  });
  afterEach(() => vi.useRealTimers());

  const shown = (el: HTMLElement, name: string) => !(el.querySelector(`section[aria-label="${name}"]`) as HTMLElement).hidden;

  it('the library stays open through repaints with no new document, and closes when a scenario is loaded', () => {
    const { sv, el, refresh } = rig(undefined, undefined, (fn) => throttle(fn, 500), false);
    refresh(); // the tab opens: its first repaint is queued, not yet run
    const choose = [...el.querySelectorAll('button')].find((b) => b.textContent === 'Choose another scenario') as HTMLButtonElement;
    choose.click();
    expect(shown(el, 'Scenario library')).toBe(true);
    // the throttle timer and a frame: the first repaint runs, then more of them, with the same document
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(600);
      vi.advanceTimersToNextFrame();
      refresh();
    }
    vi.advanceTimersByTime(600);
    vi.advanceTimersToNextFrame();
    expect(shown(el, 'Scenario library')).toBe(true);
    expect(shown(el, 'Running scenario')).toBe(false);

    // a scenario is loaded: a new document version closes the library and shows the run
    sv.doc = { ...DOC, id: 'test-next', title: 'Next case' } as ScenarioDoc;
    sv.docVersion++;
    refresh();
    vi.advanceTimersByTime(600);
    vi.advanceTimersToNextFrame();
    expect(shown(el, 'Scenario library')).toBe(false);
    expect(shown(el, 'Running scenario')).toBe(true);
    expect(el.querySelector('section[aria-label="Running scenario"] h3')?.textContent).toBe('Next case');
  });
});
