// @vitest-environment happy-dom
// Instructor v2 with no case loaded (the owner's board "Empty 5", approved 30 October): the header reads the default
// patient and "No case loaded"; the strip holds one dashed chip, with the status line under it; STATE's cue box is the
// default patient's; ACTION holds three cards (Free roam, Scenario library, Debrief archive) with Room setup and the
// Scenario builder under them, and the foot line. 1–3 choose a card; Browse lists the library's cards (the two
// demonstrations first), a row loads its card through the app's one load and ACTION becomes its steps; Esc returns.
// With a card loaded none of it shows.
import { ScenarioView, type AckResult, type CommandInput } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import type { Link } from '../link.ts';
import { LIBRARY, type ScenarioCard } from '../scenarios.ts';
import { DEFAULT_SITE } from '../site.ts';
import { DEMO_CARDS } from '../views/scenarios.ts';
import { teach2View, type Teach2View } from '../views/teach2.ts';

const SPEC = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, comorbid: [], attached: true };

function rig(o: { loaded?: ScenarioCard } = {}) {
  const sent: CommandInput[] = [];
  const loads: string[] = [];
  const fns = new Set<() => void>();
  const reply: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };
  const sv = new ScenarioView();
  const ctl = { scenario: sv, state: { mode: 'modeled', values: {}, control: {} }, timeScale: 1, hostPaused: false, fastForward: null, simT: 192, bookmarks: [] };
  const link = {
    ctl, simT: 192, conditions: new Map(), alarms: null, alarmSummary: { level: null, n: 0, top: null }, log: [], ramps: new Map(),
    host: { spec: SPEC, mode: 'modeled', record: { data: { rows: [] } }, driver: { markStages: () => undefined, stageMarks: () => [], vitalHolds: () => [] } },
    send: async (c: CommandInput) => (sent.push(structuredClone(c)), reply),
    note: () => undefined,
    onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)),
  } as unknown as Link;
  /** What the app's one load does, as the controller sees it: the card's document arrives, at its initial state. */
  const arrive = (c: ScenarioCard) => {
    sv.doc = c.doc;
    sv.docVersion++;
    sv.stateId = c.doc.initialState;
    sv.enteredT = 0;
    sv.history = [{ t: 0, stateId: c.doc.initialState }];
  };
  if (o.loaded) arrive(o.loaded);
  const loadScenario = (c: ScenarioCard): boolean => (loads.push(c.id), arrive(c), true);
  const v = teach2View(link, { site: DEFAULT_SITE, weightKg: () => 70, loadScenario });
  document.body.append(v.el);
  v.enter?.('');
  const q = <T extends Element = HTMLElement>(s: string) => v.el.querySelector(s) as T | null;
  const all = (s: string) => [...v.el.querySelectorAll<HTMLElement>(s)];
  const text = (s: string) => q(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
  const shown = (s: string) => { const e = q(s); return !!e && !e.closest('[hidden]'); };
  const key = (k: string) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  return { v, link, sv, sent, loads, q, all, text, shown, key };
}

let open: Teach2View | null = null;
const use = <T extends { v: Teach2View }>(r: T): T => ((open = r.v), r);
afterEach(() => {
  open?.destroy();
  open = null;
  document.body.replaceChildren();
  location.hash = '';
});

const MH = LIBRARY.find((c) => c.id === 'showcase-mh') as ScenarioCard;
const cardsShown = (r: ReturnType<typeof rig>) => r.all('.ip2-begin-card').filter((c) => !c.closest('[hidden]'));

describe('Instructor v2 with no case loaded (board "Empty 5")', () => {
  it('the header reads the default patient and "No case loaded"; the clock pill runs', () => {
    const r = use(rig());
    expect(r.text('.ip2-who')).toBe('Adult · 70 kg');
    expect(r.text('.ip2-mode')).toBe('MODELED');
    expect(r.text('.ip2-title')).toBe('No case loaded');
    expect(r.text('.ip2-pill-word')).toBe('RUNNING');
    expect(r.text('.ip2-pill-time')).toBe('03:12');
  });

  it('the strip holds the one dashed chip and the note at its right, the status line under it', () => {
    const r = use(rig());
    expect(r.all('.ip2-strip .ip2-chips > *').map((c) => c.textContent)).toEqual(['No case loaded · the stages appear here when one is']);
    expect(r.q('.ip2-strip .ip2-chip-none')).not.toBeNull();
    expect(r.text('.ip2-strip-note')).toBe('the default patient is on the monitor and running');
    expect(r.shown('.ip2-strip-note')).toBe(true);
    const status = r.q('.ip2-strip [role="status"]');
    expect(status?.querySelector('b')?.textContent).toBe('Ready.');
    expect(r.text('.ip2-status-text')).toBe('The phones can join now (Room code in the header); whatever you load or give next, they follow.');
    expect(r.text('.ip2-status-keys')).toBe('1–3 loads a case · Space pauses');
    expect(r.q('.ip2-strip')?.hasAttribute('data-empty')).toBe(true);
  });

  it("STATE's cue box is the default patient's: four lines, the Say line in italics", () => {
    const r = use(rig());
    expect(r.text('.ip2-cue-name')).toBe('Default patient');
    expect(r.text('.ip2-cue-clock')).toBe('03:12 since the page opened');
    expect(r.text('.ip2-cue-how')).toBe('awake, breathing room air, no case');
    expect(r.text('.ip2-cue-line')).toBe('Adult, 70 kg · every tool below works on this patient, so the room can be set up before the case starts');
    expect(r.shown('.ip2-say')).toBe(true);
    expect(r.text('.ip2-say')).toBe('Pick a case on the right, or run the patient freehand with the tools. The phones follow either way.');
    expect(r.q('.ip2-cue-box')?.classList.contains('ip2-cue-default')).toBe(true);
  });

  it('the Fast forward row is hidden while the cards or the case list show, and back with Free roam or a card', () => {
    const r = use(rig());
    expect(r.shown('.ip2-ff')).toBe(false);
    r.key('2');
    expect(r.shown('.ip2-ff')).toBe(false);
    r.key('Escape');
    r.key('1');
    expect(r.shown('.ip2-ff')).toBe(true);
    r.key('Escape');
    expect(r.shown('.ip2-ff')).toBe(false);
    r.key('2');
    r.key('1');
    expect(r.shown('.ip2-ff')).toBe(true);
    r.v.destroy();
    document.body.replaceChildren();
    const c = use(rig({ loaded: MH }));
    expect(c.shown('.ip2-ff')).toBe(true);
  });

  it('ACTION: the hint, three cards in order with their texts and buttons, the two buttons under the third, the foot line', () => {
    const r = use(rig());
    expect(r.text('.ip2-begin-hint')).toBe('no case: three ways to begin · 1–3 on the keyboard · two shortcuts');
    const cards = cardsShown(r);
    expect(cards.map((c) => c.dataset.way)).toEqual(['free', 'library', 'archive']);
    expect(cards.map((c) => [c.querySelector('.ip2-begin-title')?.textContent, c.querySelector('.ip2-begin-line')?.textContent, c.querySelector('.ip2-begin-btn')?.textContent])).toEqual([
      ['Free roam', 'The default patient with every tool, nothing scripted, nothing graded; the Log and the Debrief still record it all.', 'Start'],
      ['Scenario library', `${LIBRARY.length} cards. Pick one and this pane becomes its stages and steps.`, 'Browse'],
      ['Debrief archive', 'Every saved run: resident, card, time, objectives and score. Open one, print it, or compare residents on the same card.', 'Open'],
    ]);
    expect(cards.map((c) => c.getAttribute('aria-keyshortcuts'))).toEqual(['1', '2', '3']);
    expect(cards[1]?.classList.contains('ip2-begin-primary')).toBe(true);
    // directly under the third card: Room setup and the Scenario builder (disabled, "after the demo")
    const two = r.all('.ip2-begin-two > button');
    expect(two.map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Room setup', 'Scenario builder after the demo']);
    expect((two[1] as HTMLButtonElement).disabled).toBe(true);
    expect(two[1]?.title).toMatch(/pme-scenario\/2 authoring guide/);
    expect(two[1]?.querySelector('.ip2-begin-tag')?.textContent).toBe('after the demo');
    expect(r.q('.ip2-begin-menu')?.lastElementChild).toBe(r.q('.ip2-begin-two'));
    expect(r.text('.ip2-action .ip2-foot')).toBe('A reload keeps whatever is running. A case ends only with “Finish the case” in the dock.');
    // no numbered rows and no folds on the menu
    expect(r.shown('.ip2-action .ip2-rows:not(.ip2-case-list)')).toBe(false);
    expect(r.shown('.ip2-offcard')).toBe(false);
    expect(r.shown('.ip2-finished')).toBe(false);
  });

  it('Free roam (press or 1): the menu closes, the no-card ACTION with "Off the card" open, the strip chip reads "Free roam"', () => {
    for (const how of ['press', 'key'] as const) {
      const r = use(rig());
      if (how === 'press') (cardsShown(r)[0] as HTMLButtonElement).click();
      else r.key('1');
      expect(cardsShown(r)).toHaveLength(0);
      expect(r.shown('.ip2-offcard')).toBe(true);
      expect(r.q<HTMLDetailsElement>('.ip2-offcard')?.open).toBe(true);
      expect(r.text('.ip2-offcard-list')).toBe('Nothing given yet. Whatever a sheet gives is logged here, in the Log and in the Debrief.');
      expect(r.shown('.ip2-action .ip2-rows')).toBe(false);
      expect(r.all('.ip2-action button.ip2-row').filter((b) => !b.closest('[hidden]'))).toHaveLength(0);
      expect(r.all('.ip2-strip .ip2-chips > *').map((c) => c.textContent)).toEqual(['Free roam']);
      // the sheets are reachable: the dock's tools open them over ACTION
      (r.q('.ip2-dock-tools .ip2-tool') as HTMLButtonElement).click();
      expect(r.q('.ip2-sheets .ip2-sheet:not([hidden])')).not.toBeNull();
      open?.destroy();
      open = null;
      document.body.replaceChildren();
    }
  });

  it('Scenario library (Browse or 2): the case list, the two demonstrations first; a row loads its card and the steps appear', () => {
    const r = use(rig());
    (cardsShown(r)[1] as HTMLButtonElement).click();
    expect(cardsShown(r)).toHaveLength(0);
    expect(r.text('.ip2-status-keys')).toMatch(/Esc/);
    const rows = r.all('.ip2-case-list > li > .ip2-row');
    const rest = LIBRARY.filter((c) => !DEMO_CARDS.includes(c.id));
    const order = [...DEMO_CARDS.map((id) => LIBRARY.find((c) => c.id === id) as ScenarioCard), ...rest];
    expect(rows).toHaveLength(order.length + 1);
    expect(rows.slice(0, -1).map((b) => b.querySelector('.ip2-row-title')?.textContent)).toEqual(order.map((c) => `Load ${c.title}`));
    expect(rows.slice(0, 3).map((b) => b.querySelector('.ip2-key')?.textContent)).toEqual(['1', '2', '3']);
    const first = order[0] as ScenarioCard;
    expect(rows[0]?.querySelector('.ip2-row-sub')?.textContent).toBe([first.patient, first.minutes ? `${first.minutes} min` : ''].filter(Boolean).join(' · '));
    expect(rows[0]?.querySelector('.ip2-row-right')?.textContent).toBe((first.doc.mode ?? 'modeled').toUpperCase());
    // the last row opens the Scenarios view
    const whole = rows.at(-1) as HTMLAnchorElement;
    expect(whole.textContent).toContain('The whole library');
    expect(whole.getAttribute('href')).toBe('#/scenarios');
    // a row press: the app's one load (the library's), then ACTION is the card's steps
    (rows[1] as HTMLButtonElement).click();
    expect(r.loads).toEqual([DEMO_CARDS[1]]);
    expect(r.shown('.ip2-begin')).toBe(false);
    expect(r.all('.ip2-action .ip2-rows:not(.ip2-finished-list) .ip2-row[data-kind="step"]').length).toBeGreaterThan(0);
    expect(r.text('.ip2-title')).not.toBe('No case loaded');
  });

  it('2 then a digit loads that row; Esc returns to the three cards', () => {
    const r = use(rig());
    r.key('2');
    expect(r.shown('.ip2-case-list')).toBe(true);
    r.key('Escape');
    expect(cardsShown(r)).toHaveLength(3);
    expect(r.shown('.ip2-case-list')).toBe(false);
    r.key('2');
    r.key('1');
    expect(r.loads).toEqual([DEMO_CARDS[0]]);
    expect(r.all('.ip2-action .ip2-row[data-kind="step"]').length).toBeGreaterThan(0);
  });

  it('Debrief archive (Open or 3) opens the Debrief view; Room setup opens Settings', () => {
    const r = use(rig());
    (cardsShown(r)[2] as HTMLButtonElement).click();
    expect(location.hash).toBe('#/debrief');
    location.hash = '';
    r.key('3');
    expect(location.hash).toBe('#/debrief');
    location.hash = '';
    (r.all('.ip2-begin-two > button')[0] as HTMLButtonElement).click();
    expect(location.hash).toBe('#/settings');
  });

  it('Esc with a sheet open closes the sheet and leaves the case list as it is', () => {
    const r = use(rig());
    r.key('2');
    r.key('d');
    expect(r.q('.ip2-sheets .ip2-sheet:not([hidden])')).not.toBeNull();
    r.key('Escape');
    expect(r.q('.ip2-sheets .ip2-sheet:not([hidden])')).toBeNull();
    expect(r.shown('.ip2-case-list')).toBe(true);
  });

  it('with a card loaded none of it shows', () => {
    const r = use(rig({ loaded: MH }));
    expect(r.shown('.ip2-begin')).toBe(false);
    expect(cardsShown(r)).toHaveLength(0);
    expect(r.text('.ip2-title')).toBe(MH.title);
    expect(r.text('.ip2-who')).toBe('M 40 y 70 kg');
    expect(r.q('.ip2-strip')?.hasAttribute('data-empty')).toBe(false);
    expect(r.shown('.ip2-strip-note')).toBe(false);
    expect(r.shown('.ip2-strip [role="status"]')).toBe(false);
    expect(r.q('.ip2-cue-box')?.classList.contains('ip2-cue-default')).toBe(false);
    expect(r.text('.ip2-cue-name')).not.toBe('Default patient');
    expect(r.text('.ip2-action .ip2-foot')).toMatch(/^No penalty comes from the panel/);
    // the closed "Off the card" fold has no "nothing yet" line from the first paint, as before
    expect(r.q<HTMLDetailsElement>('.ip2-offcard')?.open).toBe(false);
    expect(r.all('.ip2-offcard-list > li')).toHaveLength(0);
    // the digits are the card's rows, not the three cards
    r.key('3');
    expect(location.hash).not.toBe('#/debrief');
  });
});
