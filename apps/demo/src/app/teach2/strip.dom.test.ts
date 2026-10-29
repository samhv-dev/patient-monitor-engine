// @vitest-environment happy-dom
// Instructor v2's stage strip (plan IP5; answers 2 and 3, the owner's ruling of 29 October): the stages of both demo
// cards with hops folded in, the fold rule (passed stages beyond the two before the current one become "… n earlier";
// the current stage and every future stage stay), entry times from the history, "auto" and "or"; a future stage sends
// what today's jump sends behind the same confirm (both mounted on one fake Link, compared deep-equal); a past stage
// shows its entry time and a disabled return until IP2's stage marks exist, then restores the mark behind one confirm.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScenarioView, type AckResult, type CommandInput, type ScenarioDoc } from '@pme/controller';
import { stagesOf } from '../card-read.ts';
import type { Link } from '../link.ts';
import type { PanelCtx } from '../panel/ctx.ts';
import { scenarioTab } from '../panel/scenario.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import type { Teach2Ctx } from './ctx.ts';
import { KEEP_PAST, mount, stageMarks, stageNames, stripModel } from './strip.ts';

const MH = showcaseDoc('showcase-mh');
const HAEM = showcaseDoc('showcase-haemorrhage');
const OK: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };

function rig(doc: ScenarioDoc, stateId: string, history: Array<{ t: number; stateId: string; transitionId?: string }> = [], simT = 600) {
  const sv = new ScenarioView();
  sv.doc = doc;
  sv.docVersion = 1;
  sv.stateId = stateId;
  sv.enteredT = history.at(-1)?.t ?? 0;
  sv.history = history;
  const sent: CommandInput[] = [];
  const send = async (c: CommandInput) => (sent.push(structuredClone(c)), OK);
  const link = { ctl: { scenario: sv, bookmarks: [], simT, hostPaused: false, send }, host: null, simT, send, note: () => undefined } as unknown as Link;
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

  it('MH at the start: the current stage and all 13 future stages, nothing folded', () => {
    const r = rig(MH, 'awake', [{ t: 0, stateId: 'awake' }], 10);
    expect(r.el.querySelectorAll('.ip2-current')).toHaveLength(1);
    expect(r.el.querySelectorAll('.ip2-future')).toHaveLength(13);
    expect(r.el.querySelector('.ip2-fold')).toBeNull();
    expect(r.el.querySelector('.ip2-current')?.textContent).toBe('Awake on the table00:00 · 1 open');
  });

  it('MH at treating: 7 earlier folded, the 2 before it with their entry times, the current with its 4 open steps, auto on rule-entered stages', () => {
    const r = rig(MH, 'treating', MH_TO_TREATING);
    expect(chipTexts(r.el)).toEqual([
      '… 7 earlier', 'Established MH07:50', 'Trigger off08:16', 'MH treatment under way08:40 · 4 open',
      'Recoveringauto', 'Ventilation back to 12 × 500', 'Cardiac arrestauto', 'CPR',
    ]);
    // the stage's entry is the hop that began it (dantrolene at 08:40), not the return from it
    expect(r.el.querySelector('.ip2-current')?.getAttribute('aria-current')).toBe('step');
    // the fold expands on a press, and folds back
    (r.el.querySelector('.ip2-fold') as HTMLButtonElement).click();
    expect(r.el.querySelectorAll('.ip2-past')).toHaveLength(9);
    expect(r.el.querySelectorAll('.ip2-future')).toHaveLength(4);
    (r.el.querySelector('.ip2-fold') as HTMLButtonElement).click();
    expect(r.el.querySelectorAll('.ip2-past')).toHaveLength(KEEP_PAST);
  });

  it('a stage the run skipped shows no time; a discarded course (a restore) is not shown', () => {
    // induced → crisis straight to triggerOff: intubated…established never entered; then a restore back to 05:00
    const hist = [{ t: 0, stateId: 'awake' }, { t: 240, stateId: 'induced', transitionId: 'induce-premed' }, { t: 280, stateId: 'triggerOff', transitionId: 'crisis' }, { t: 250, stateId: 'induced' }];
    const r = rig(MH, 'induced', hist, 300);
    r.sv.enteredT = 250;
    expect(chipTexts(r.el).slice(0, 4)).toEqual(['… 1 earlier', 'Midazolam 2 mg and fentanyl 100 µg given', 'Preoxygenating', 'Induced04:00 · 2 open']);
    expect(r.el.querySelectorAll('.ip2-skipped')).toHaveLength(2);
  });

  it('haemorrhage at PEA: 2 earlier folded, every future stage visible, side branches read "or"', () => {
    const hist = [{ t: 0, stateId: 'bleeding' }, { t: 30, stateId: 'ventilated', transitionId: 'intubate' }, { t: 200, stateId: 'junctional', transitionId: 'junctional' }, { t: 290, stateId: 'pea', transitionId: 'pea' }];
    const r = rig(HAEM, 'pea', hist, 320);
    const items = stripModel(HAEM, 'pea', []);
    expect(items[0]).toEqual({ kind: 'fold', n: 2 });
    expect(r.el.querySelectorAll('.ip2-future')).toHaveLength(15 - 5);
    expect(r.el.querySelector('.ip2-current')?.textContent).toBe('PEA04:50 · 1 open');
    const or = r.el.querySelector('.ip2-or') as HTMLElement;
    expect([or.previousElementSibling?.textContent, or.nextElementSibling?.textContent]).toEqual(['Shocked againauto', 'CPR continuing after the first shock']);
  });
});

describe('stage strip: clicks', () => {
  it('a future stage sends what today\'s jump sends, behind the same confirm, with the same toast', async () => {
    const r = rig(MH, 'treating', MH_TO_TREATING);
    // today's Scenario tab on the same Link
    let refresh = () => undefined as void;
    const today = scenarioTab({ link: r.link, staging: {}, site: {}, weightKg: () => 70, onRefresh: (fn: () => void) => (refresh = fn), goTab: () => undefined } as unknown as PanelCtx);
    document.body.append(today);
    refresh();
    const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);
    const run = async (press: () => void) => {
      r.sent.splice(0);
      document.querySelectorAll('.toast').forEach((t) => t.remove());
      press();
      const title = await answer('Jump');
      return { title, sent: [...r.sent], toasts: toasts() };
    };
    const v1 = await run(() => (today.querySelector('button[aria-label="Jump to Cardiac arrest"]') as HTMLButtonElement).click());
    const v2 = await run(() => (r.el.querySelector('button.ip2-future[aria-label^="Stage Cardiac arrest"]') as HTMLButtonElement).click());
    expect(v2).toEqual(v1);
    expect(v2).toEqual({ title: 'Jump to this state?', sent: [{ type: 'scenario', action: 'goto', target: 'arrest' }], toasts: ['Scenario: Cardiac arrest'] });
    // "Stay in this state" sends nothing
    (r.el.querySelector('button.ip2-future') as HTMLButtonElement).click();
    await answer('Stay in this state');
    expect(r.sent).toHaveLength(1);
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

  it('with a stage mark: one confirm, then today\'s bookmark restore of that mark', async () => {
    const seen: unknown[] = [];
    stageMarks.of = (_l, e) => (seen.push(e), `stage:${e.stage}@${e.t}`);
    const r = rig(MH, 'treating', MH_TO_TREATING);
    (r.el.querySelector('button.ip2-past[aria-label^="Stage Trigger off"]') as HTMLButtonElement).click();
    expect(seen).toEqual([{ stage: 'triggerOff', stateId: 'triggerOff', t: 496, transitionId: 'crisis-established' }]);
    const back = r.el.querySelector('.ip2-pop button') as HTMLButtonElement;
    expect(back.disabled).toBe(false);
    back.click();
    expect(await answer('Return')).toBe('Return to the start of Trigger off?');
    expect(r.sent).toEqual([{ type: 'scenario', action: 'restoreBookmark', target: 'stage:triggerOff@496' }]);
    // Stay here sends nothing
    (r.el.querySelector('button.ip2-past[aria-label^="Stage Trigger off"]') as HTMLButtonElement).click();
    (r.el.querySelector('.ip2-pop button') as HTMLButtonElement).click();
    await answer('Stay here');
    expect(r.sent).toHaveLength(1);
  });

  it('no scenario: says so, and a load redraws from the start', () => {
    const r = rig(MH, 'treating', MH_TO_TREATING);
    r.sv.doc = null;
    r.slot.refresh();
    expect(r.el.textContent).toContain('No scenario running');
    r.sv.doc = HAEM;
    r.sv.docVersion = 2;
    r.sv.stateId = 'bleeding';
    r.sv.history = [{ t: 0, stateId: 'bleeding' }];
    r.slot.refresh();
    expect(r.el.querySelector('.ip2-current')?.textContent).toBe('Bleeding 2.5 L over 10 min00:00 · 2 open');
  });
});
