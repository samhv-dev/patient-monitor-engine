// @vitest-environment happy-dom
// Instructor v2's stage strip (plan IP5; answers 2 and 3, the owner's ruling of 29 October): the stages of both demo
// cards with hops folded in, the owner's ruling for IP9 (exactly five chips with full names: two before the current
// stage, the current one, the next two; "‹ n earlier" and "n later ›" arrows page the window; "back to now" recentres;
// the future ordered from the current stage, two stages of one step reading "or"), entry times from the history,
// "auto"; a press on a stage opens its inline box, and the box's button is the confirmation (the owner's report of 30
// October: no dialog): a future stage's "Jump to <stage>" sends what today's jump sends (both mounted on one fake Link,
// compared deep-equal); a past stage's box shows its entry time and a disabled return until IP2's stage marks exist,
// then "Return to the start of <stage>" restores the mark.
// The status line under the chips (the owner's choice of 31 October): while a card's Case briefing runs it reads
// "Case briefing on every screen · 0:48 left" with End briefing; the chips' row carries no briefing element.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { epochNow, ScenarioView, type AckResult, type CommandInput, type ScenarioDoc } from '@pme/controller';
import { stagesOf } from '../card-read.ts';
import type { Link } from '../link.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { scenarioTab } from '../panel/scenario.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import type { Teach2Ctx } from './ctx.ts';
import { KEEP_NEXT, KEEP_PAST, mount, stageMarks, stageNames, stripModel, WINDOW } from './strip.ts';

const MH = showcaseDoc('showcase-mh');
const HAEM = showcaseDoc('showcase-haemorrhage');
const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };

function rig(doc: ScenarioDoc, stateId: string, history: Array<{ t: number; stateId: string; transitionId?: string }> = [], simT = 600, host: unknown = null) {
  const sv = new ScenarioView();
  sv.doc = doc;
  sv.docVersion = 1;
  sv.stateId = stateId;
  sv.enteredT = history.at(-1)?.t ?? 0;
  sv.history = history;
  const sent: CommandInput[] = [];
  const send = async (c: CommandInput) => (sent.push(structuredClone(c)), OK);
  const link = { ctl: { scenario: sv, bookmarks: [], simT, hostPaused: false, send }, host, simT, send, note: () => undefined } as unknown as Link;
  const escapes: Array<() => boolean> = [];
  const ctx = { link, keys: { digit: () => undefined, letter: () => undefined, escape: (fn: () => boolean) => (escapes.push(fn), () => undefined) } } as unknown as Teach2Ctx;
  const el = document.createElement('nav');
  document.body.append(el);
  const slot = mount(el, ctx);
  return { sv, el, sent, link, slot, escapes };
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const chipTexts = (el: Element) => [...el.querySelectorAll('.ip2-chips > .ip2-chip')].map((c) => c.textContent);
/** Press the button of the open confirm dialog named `action`. */
async function answer(action: string) {
  await settle();
  const d = document.querySelector('dialog[open]') as HTMLDialogElement;
  expect(d, 'a confirm is open').toBeTruthy();
  const b = [...d.querySelectorAll('button')].find((x) => x.textContent === action) as HTMLButtonElement;
  b.click();
  await settle();
  await settle();
  return d.querySelector('h2')?.textContent;
}

let restoreMarks = stageMarks.of;
beforeEach(() => {
  document.body.replaceChildren();
  restoreMarks = stageMarks.of;
});
afterEach(() => void (stageMarks.of = restoreMarks));

/** A course through the MH card to `treating`: the states entered, with the hops, at these times. */
const MH_TO_TREATING = [
  { t: 0, stateId: 'awake' }, { t: 60, stateId: 'premedicated', transitionId: 'premed' }, { t: 120, stateId: 'preoxygenated', transitionId: 'preox' },
  { t: 240, stateId: 'induced', transitionId: 'induce' }, { t: 300, stateId: 'intubated', transitionId: 'intubate' }, { t: 360, stateId: 'surgery', transitionId: 'surgery' },
  { t: 420, stateId: 'earlySigns', transitionId: 'early' }, { t: 470, stateId: 'established', transitionId: 'established' }, { t: 496, stateId: 'triggerOff', transitionId: 'crisis-established' },
  { t: 520, stateId: 'dantrolene', transitionId: 'dant' }, { t: 522, stateId: 'treating', transitionId: 'back' },
];

describe('stage strip: the stages and the fold rule', () => {
  it('the MH card has 14 stages and the haemorrhage card 15, hops folded in', () => {
    expect(stagesOf(MH)).toHaveLength(14);
    expect(stagesOf(HAEM)).toHaveLength(15);
    // short names are distinct on both cards (the chips and the cue box read them)
    for (const d of [MH, HAEM]) expect(new Set(stageNames(stagesOf(d)).values()).size).toBe(stagesOf(d).length);
  });

  /** The stage chips (not the arrows nor "back to now"). */
  const stageChips = (el: Element) => [...el.querySelectorAll('.ip2-chips > :is(.ip2-past, .ip2-current, .ip2-future)')];

  it('MH at the start (the owner\'s ruling for IP9): exactly five chips with full names, the current and the next four; "9 later ›"; an arrow pages, "back to now" recentres', () => {
    const r = rig(MH, 'awake', [{ t: 0, stateId: 'awake' }], 10);
    expect(stageChips(r.el)).toHaveLength(WINDOW);
    expect(chipTexts(r.el)).toEqual(['Awake on the table00:00 · 1 open', 'Midazolam 2 mg and fentanyl 100 µg given', 'Preoxygenating', 'Induced', 'Intubated', '9 later ›']);
    // the future ordered from the current stage: premedicated leads to both, so "Preoxygenating or Induced"
    expect(r.el.querySelector('.ip2-or')?.previousElementSibling?.textContent).toBe('Preoxygenating');
    expect(r.el.querySelector('.ip2-earlier')).toBeNull();
    expect(r.el.querySelector('.ip2-now')).toBeNull();
    // no name is cut
    expect(r.el.style.getPropertyValue('--ip2-cap')).toBe('');
    // the later arrow pages five stages on; "back to now" appears and recentres
    (r.el.querySelector('.ip2-later') as HTMLButtonElement).click();
    expect(stageChips(r.el)).toHaveLength(WINDOW);
    expect(r.el.querySelector('.ip2-earlier')?.textContent).toBe('‹ 5 earlier');
    expect(r.el.querySelector('.ip2-later')?.textContent).toBe('4 later ›');
    expect(r.el.querySelector('.ip2-current')).toBeNull();
    (r.el.querySelector('.ip2-later') as HTMLButtonElement).click();
    expect(r.el.querySelector('.ip2-earlier')?.textContent).toBe('‹ 9 earlier');
    expect(r.el.querySelector('.ip2-later')).toBeNull();
    (r.el.querySelector('.ip2-now') as HTMLButtonElement).click();
    expect(chipTexts(r.el).at(-1)).toBe('9 later ›');
    expect(r.el.querySelector('.ip2-current')?.textContent).toBe('Awake on the table00:00 · 1 open');
    expect(r.el.querySelector('.ip2-now')).toBeNull();
  });

  it('MH at treating: "‹ 7 earlier", the 2 before it with their entry times, the current with its 4 open steps, "Recovering or Cardiac arrest", "2 later ›"', () => {
    const r = rig(MH, 'treating', MH_TO_TREATING);
    expect(stageChips(r.el)).toHaveLength(WINDOW);
    expect(chipTexts(r.el)).toEqual([
      '‹ 7 earlier', 'Established MH07:50', 'Trigger off08:16', 'MH treatment under way08:40 · 4 open', 'Recoveringauto', 'Cardiac arrestauto', '2 later ›',
    ]);
    // the next stages from the current one: "Recovering or Cardiac arrest" (the branch read from the current stage)
    const or = r.el.querySelector('.ip2-or') as HTMLElement;
    expect([or.previousElementSibling?.textContent, or.nextElementSibling?.textContent]).toEqual(['Recoveringauto', 'Cardiac arrestauto']);
    // the stage's entry is the hop that began it (dantrolene at 08:40), not the return from it
    expect(r.el.querySelector('.ip2-current')?.getAttribute('aria-current')).toBe('step');
    expect(r.el.querySelectorAll('.ip2-past')).toHaveLength(KEEP_PAST);
    // the earlier arrow pages back (the current stage leaves the view; "back to now" brings it back)
    (r.el.querySelector('.ip2-earlier') as HTMLButtonElement).click();
    expect(r.el.querySelector('.ip2-earlier')?.textContent).toBe('‹ 2 earlier');
    expect(r.el.querySelector('.ip2-later')?.textContent).toBe('7 later ›');
    expect(r.el.querySelectorAll('.ip2-past')).toHaveLength(WINDOW);
    (r.el.querySelector('.ip2-earlier') as HTMLButtonElement).click();
    expect(r.el.querySelector('.ip2-earlier')).toBeNull();
    expect(chipTexts(r.el)[0]).toBe('Awake on the table00:00');
    (r.el.querySelector('.ip2-now') as HTMLButtonElement).click();
    expect(chipTexts(r.el)[0]).toBe('‹ 7 earlier');
    expect(r.el.querySelector('.ip2-current')).not.toBeNull();
    expect(r.el.querySelector('.ip2-now')).toBeNull();
  });

  it('a stage the run skipped shows no time; a discarded course (a restore) is not shown', () => {
    // induced → crisis straight to triggerOff: intubated…established never entered; then a restore back to 05:00
    const hist = [{ t: 0, stateId: 'awake' }, { t: 240, stateId: 'induced', transitionId: 'induce-premed' }, { t: 280, stateId: 'triggerOff', transitionId: 'crisis' }, { t: 250, stateId: 'induced' }];
    const r = rig(MH, 'induced', hist, 300);
    r.sv.enteredT = 250;
    expect(chipTexts(r.el).slice(0, 4)).toEqual(['‹ 1 earlier', 'Midazolam 2 mg and fentanyl 100 µg given', 'Preoxygenating', 'Induced04:00 · 2 open']);
    expect(r.el.querySelectorAll('.ip2-skipped')).toHaveLength(2);
  });

  it('haemorrhage at PEA: "‹ 2 earlier", five chips ("Asystole or CPR" from PEA), "8 later ›"', () => {
    const hist = [{ t: 0, stateId: 'bleeding' }, { t: 30, stateId: 'ventilated', transitionId: 'intubate' }, { t: 200, stateId: 'junctional', transitionId: 'junctional' }, { t: 290, stateId: 'pea', transitionId: 'pea' }];
    const r = rig(HAEM, 'pea', hist, 320);
    const items = stripModel(HAEM, 'pea', []);
    expect(items[0]).toEqual({ kind: 'fold', n: 2 });
    expect(items.at(-1)).toEqual({ kind: 'later', n: 8 });
    expect(stageChips(r.el)).toHaveLength(WINDOW);
    expect(r.el.querySelectorAll('.ip2-future')).toHaveLength(KEEP_NEXT);
    expect(r.el.querySelector('.ip2-current')?.textContent).toBe('PEA04:50 · 1 open');
    const or = r.el.querySelector('.ip2-or') as HTMLElement;
    expect([or.previousElementSibling?.textContent, or.nextElementSibling?.textContent]).toEqual(['Asystoleauto', 'CPR']);
    expect(r.el.querySelector('.ip2-later')?.textContent).toBe('8 later ›');
  });

  it('at the end of a card the window slides to keep five: MH at CPR shows the four before it, "‹ 9 earlier", nothing later', () => {
    expect(stripModel(MH, 'cpr', []).map((x) => x.kind)).toEqual(['fold', 'past', 'past', 'past', 'past', 'current']);
    expect(stripModel(MH, 'cpr', [])[0]).toEqual({ kind: 'fold', n: 9 });
  });
});

describe('stage strip: clicks', () => {
  it('a future stage (the owner\'s report of 30 October): its inline box "Jump to <stage>" is the confirmation; its click sends what today\'s jump sends, with the same toast, and no dialog', async () => {
    const r = rig(MH, 'treating', MH_TO_TREATING);
    // today's Scenario tab on the same Link: its jump, behind its own confirm
    let refresh = () => undefined as void;
    const today = scenarioTab({ link: r.link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx);
    document.body.append(today);
    refresh();
    const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);
    (today.querySelector('button[aria-label="Jump to Cardiac arrest"]') as HTMLButtonElement).click();
    expect(await answer('Jump')).toBe('Jump to this state?');
    const v1 = { sent: [...r.sent], toasts: toasts() };
    r.sent.splice(0);
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    today.remove();
    // the strip: the chip opens its box, nothing sent yet
    const chip = r.el.querySelector('button.ip2-future[aria-label^="Stage Cardiac arrest"]') as HTMLButtonElement;
    expect(chip.getAttribute('aria-label')).toBe('Stage Cardiac arrest, entered by a rule: show its jump');
    chip.click();
    await settle();
    expect(r.sent).toEqual([]);
    expect(document.querySelector('dialog[open]')).toBeNull();
    const pop = r.el.querySelector('.ip2-pop') as HTMLElement;
    expect(pop.getAttribute('aria-label')).toBe('Stage Cardiac arrest');
    const go = pop.querySelector('button') as HTMLButtonElement;
    expect(go.textContent).toBe('Jump to Cardiac arrest');
    go.click();
    await settle();
    await settle();
    expect(document.querySelector('dialog[open]')).toBeNull();
    expect(r.el.querySelector('.ip2-pop')).toBeNull();
    expect({ sent: [...r.sent], toasts: toasts() }).toEqual(v1);
    expect(v1).toEqual({ sent: [{ type: 'scenario', action: 'goto', target: 'arrest' }], toasts: ['Scenario: Cardiac arrest'] });
    // a second press on the chip closes its box; Esc closes it too; neither sends
    chip.click();
    expect(r.el.querySelector('.ip2-pop')).not.toBeNull();
    chip.click();
    expect(r.el.querySelector('.ip2-pop')).toBeNull();
    chip.click();
    expect(r.escapes.some((f) => f())).toBe(true);
    expect(r.el.querySelector('.ip2-pop')).toBeNull();
    expect(r.sent).toHaveLength(1);
  });

  it('the hint names both boxes and no longer says "asks once"', () => {
    const r = rig(MH, 'treating', MH_TO_TREATING);
    const hint = r.el.querySelector('.ip2-strip-hint')?.textContent ?? '';
    expect(hint).toBe('past: return to its start · future: jump to it');
    expect(r.el.innerHTML).not.toContain('asks once');
  });

  it('a past stage shows its entry time and a disabled "Return to the start of …" until IP2\'s stage marks exist', async () => {
    const r = rig(MH, 'treating', MH_TO_TREATING);
    (r.el.querySelector('button.ip2-past[aria-label^="Stage Trigger off"]') as HTMLButtonElement).click();
    const pop = r.el.querySelector('.ip2-pop') as HTMLElement;
    expect(pop.querySelector('.ip2-pop-time')?.textContent).toBe('Entered at 08:16');
    const back = pop.querySelector('button') as HTMLButtonElement;
    expect(back.textContent).toBe('Return to the start of Trigger off');
    expect(back.disabled).toBe(true);
    back.click();
    await settle();
    expect(document.querySelector('dialog[open]')).toBeNull();
    expect(r.sent).toEqual([]);
    // Esc closes it (the view's Esc chain), and a second press on the same chip closes it too
    expect(r.escapes.some((f) => f())).toBe(true);
    expect(r.el.querySelector('.ip2-pop')).toBeNull();
    const chip = r.el.querySelector('button.ip2-past[aria-label^="Stage Trigger off"]') as HTMLButtonElement;
    chip.click();
    expect(r.el.querySelector('.ip2-pop')).not.toBeNull();
    chip.click();
    expect(r.el.querySelector('.ip2-pop')).toBeNull();
  });

  it('with a stage mark (the owner\'s report of 30 October): the box\'s "Return to the start of …" is the confirmation; its click restores that mark, no dialog', async () => {
    const seen: unknown[] = [];
    stageMarks.of = (_l, e) => (seen.push(e), `stage:${e.stage}@${e.t}`);
    const r = rig(MH, 'treating', MH_TO_TREATING);
    (r.el.querySelector('button.ip2-past[aria-label^="Stage Trigger off"]') as HTMLButtonElement).click();
    expect(seen).toEqual([{ stage: 'triggerOff', stateId: 'triggerOff', t: 496, transitionId: 'crisis-established' }]);
    expect(r.sent).toEqual([]);
    const back = r.el.querySelector('.ip2-pop button') as HTMLButtonElement;
    expect(back.disabled).toBe(false);
    back.click();
    await settle();
    await settle();
    expect(document.querySelector('dialog[open]')).toBeNull();
    expect(r.el.querySelector('.ip2-pop')).toBeNull();
    expect(r.sent).toEqual([{ type: 'scenario', action: 'restoreBookmark', target: 'stage:triggerOff@496' }]);
    // the box closed without its button (a second press, Esc) sends nothing
    const chip = r.el.querySelector('button.ip2-past[aria-label^="Stage Trigger off"]') as HTMLButtonElement;
    chip.click();
    chip.click();
    chip.click();
    expect(r.escapes.some((f) => f())).toBe(true);
    expect(r.sent).toHaveLength(1);
  });

  it('no scenario: says so (board "Empty 5"), and a load redraws from the start', () => {
    const r = rig(MH, 'treating', MH_TO_TREATING);
    r.sv.doc = null;
    r.slot.refresh();
    expect(r.el.textContent).toContain('No case loaded · the stages appear here when one is');
    r.sv.doc = HAEM;
    r.sv.docVersion = 2;
    r.sv.stateId = 'bleeding';
    r.sv.history = [{ t: 0, stateId: 'bleeding' }];
    r.slot.refresh();
    expect(r.el.querySelector('.ip2-current')?.textContent).toBe('Bleeding 2.5 L over 10 min00:00 · 2 open');
  });
});

describe('stage strip: the status line while a Case briefing runs', () => {
  /** The host's briefing as the session gives it (session.ts onBriefing / endBriefing), on a clock we move. */
  function fakeHost() {
    type B = { text: string; durationS: number; startedAt: number; lang: 'en' } | null;
    const fns = new Set<(b: unknown) => void>();
    const h: { cur: B; ended: number; record: unknown; onBriefing(fn: (b: unknown) => void): () => void; endBriefing(): void; set(b: B): void; start(): void; fns: typeof fns } = {
      cur: null,
      ended: 0,
      record: { data: { rows: [] } }, // the run record course.ts reads: its initial state at 0
      onBriefing: (fn: (b: unknown) => void) => (fns.add(fn), fn(h.cur), () => void fns.delete(fn)),
      endBriefing: () => (h.ended++, h.set(null)),
      set: (b) => ((h.cur = b), fns.forEach((fn) => fn(b))),
      start: () => h.set({ text: 'x', durationS: 60, startedAt: epochNow(), lang: 'en' }),
      fns,
    };
    return h;
  }
  beforeEach(() => void vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] }));
  afterEach(() => void vi.useRealTimers());
  const status = (el: Element) => el.querySelector<HTMLElement>('.ip2-status');
  const line = (el: Element) => el.querySelector('.ip2-status-text')?.textContent ?? '';
  const end = (el: Element) => [...(status(el)?.querySelectorAll('button') ?? [])].find((b) => b.textContent === 'End briefing');

  it('no briefing: no status line shown, nothing in the strip changes', () => {
    const host = fakeHost();
    const r = rig(MH, 'treating', MH_TO_TREATING, 600, host);
    const plain = rig(MH, 'treating', MH_TO_TREATING); // a follower: no host, no briefing
    for (const x of [r, plain]) {
      expect(status(x.el)?.hidden ?? true).toBe(true);
      expect(x.el.hasAttribute('data-briefing')).toBe(false);
      expect(x.el.querySelector('.cb-end')).toBeNull();
      expect((x.el.querySelector('.ip2-strip-hint') as HTMLElement).hidden).toBe(false);
    }
    expect(chipTexts(r.el)).toEqual(chipTexts(plain.el));
  });

  it('while it runs: the sentence with the time left and End briefing; the chips and the hint as without it', async () => {
    const host = fakeHost();
    const r = rig(MH, 'treating', MH_TO_TREATING, 600, host);
    const before = chipTexts(r.el);
    host.start();
    expect(r.el.hasAttribute('data-briefing')).toBe(true);
    expect(status(r.el)?.hidden).toBe(false);
    expect(line(r.el)).toBe('Case briefing on every screen · 1:00 left');
    expect(end(r.el)).toBeTruthy();
    expect(r.el.querySelector('.cb-end'), 'no briefing element in the chips\' row').toBeNull();
    expect([...r.el.querySelectorAll('.ip2-chips *')].some((n) => /briefing/i.test(n.textContent ?? ''))).toBe(false);
    r.slot.refresh();
    expect(chipTexts(r.el)).toEqual(before);
    expect((r.el.querySelector('.ip2-strip-hint') as HTMLElement).hidden, 'the hint stays').toBe(false);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(line(r.el)).toBe('Case briefing on every screen · 0:48 left');
    // End briefing: the session's end (every screen), and the line goes
    end(r.el)?.click();
    expect(host.ended).toBe(1);
    expect(status(r.el)?.hidden).toBe(true);
    expect(r.el.hasAttribute('data-briefing')).toBe(false);
  });

  it('ends by itself: the line goes; destroy lets go of the session', async () => {
    const host = fakeHost();
    const r = rig(MH, 'treating', MH_TO_TREATING, 600, host);
    host.start();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(line(r.el)).toBe('Case briefing on every screen · 0:30 left');
    host.set(null);
    expect(status(r.el)?.hidden).toBe(true);
    expect(r.el.hasAttribute('data-briefing')).toBe(false);
    r.slot.destroy();
    expect(host.fns.size).toBe(0);
  });
});
