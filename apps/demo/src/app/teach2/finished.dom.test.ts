// @vitest-environment happy-dom
// Instructor v2's ACTION, "Finished steps · n" grouped by stage (the clinical owner's report of 30 October: several
// stages on, the fold read as a run of steps all numbered 1, the first step of each stage, with nothing saying which
// stage each belonged to). Each stage visit with finished rows gets a small title, the stage's name and the time it was
// entered, in the order the stages were entered; its rows under it keep their own numbers within that stage; the count
// stays; a stage entered twice gives two titles. The rows are classify's (rows.ts), unchanged.
import { describe, expect, it } from 'vitest';
import { ScenarioView, type ScenarioDoc } from '@pme/controller';
import type { Link } from '../link.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { mount } from './action.ts';
import type { Teach2Ctx } from './ctx.ts';
import { classify } from './rows.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
type H = { t: number; stateId: string; transitionId?: string };
/** rows.test.ts's course to treating: premedicate without preoxygenating (the awake patient's second button), induce, intubate, surgery, early signs by
 *  their rule, the crisis called, dantrolene. */
const TO_TREATING: H[] = [
  { t: 0, stateId: 'awake' },
  { t: 10, stateId: 'premedicated', transitionId: 'premed-air' },
  { t: 20, stateId: 'induced', transitionId: 'induce' },
  { t: 30, stateId: 'intubated', transitionId: 'intubate' },
  { t: 40, stateId: 'surgery', transitionId: 'surgery' },
  { t: 80, stateId: 'earlySigns', transitionId: 'early' },
  { t: 100, stateId: 'triggerOff', transitionId: 'crisis-earlySigns' },
  { t: 150, stateId: 'dantrolene', transitionId: 'dant' },
  { t: 152, stateId: 'treating', transitionId: 'back' },
];

function rig(history: H[], simT: number) {
  const sv = new ScenarioView();
  sv.doc = MH;
  sv.docVersion = 1;
  sv.stateId = (history.at(-1) as H).stateId;
  sv.enteredT = (history.at(-1) as H).t;
  sv.history = history;
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT, state: null, hostPaused: false }, host: null, simT, log: [],
    send: async () => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }), note: () => undefined,
  } as unknown as Link;
  const el = document.createElement('div');
  const slot = mount(el, { link, keys: { digit: () => undefined, letter: () => undefined, escape: () => () => undefined }, dock: {}, openSheet: () => undefined } as unknown as Teach2Ctx);
  slot.refresh();
  const board = classify({ doc: MH, stateId: sv.stateId, history, enteredT: sv.enteredT, simT, inState: 0, paused: false, log: [], record: null, values: undefined, holds: null, base: new Map() });
  return { el, slot, sv, board };
}
/** The fold as read: each title, then its rows as "<key> <title>". */
const groups = (el: Element) => [...el.querySelectorAll('.ip2-finished-list > .ip2-fin-group')].map((g) => [
  g.querySelector('.ip2-fin-head')?.textContent,
  ...[...g.querySelectorAll('.ip2-row')].map((r) => `${r.querySelector('.ip2-key')?.textContent} ${r.querySelector('.ip2-row-title')?.textContent}`),
]);

describe('ACTION: finished steps grouped by stage (the owner\'s report of 30 October)', () => {
  it('several stages on: one small title per stage (its name and entry time), in the order entered, each row with its own number in that stage; the count stays', () => {
    const r = rig(TO_TREATING, 160);
    expect(r.el.querySelector('.ip2-finished summary')?.textContent).toBe(`Finished steps · ${r.board.finished.length}`);
    expect(r.board.finished).toHaveLength(7);
    expect(groups(r.el)).toEqual([
      ['Awake on the table · 00:00', '2 Premedicate: midazolam 2 mg, fentanyl 100 µg'], // 1 is Preoxygenate, not chosen
      ['Midazolam 2 mg and fentanyl 100 µg given · 00:10', '1 Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg'],
      ['Induced · 00:20', '1 Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %'],
      ['Intubated · 00:30', '1 Start surgery: rocuronium 0.6 mg/kg'],
      ['Surgery under way · 00:40', 'A Early signs: EtCO₂ rising at unchanged ventilation, heart rate rising'],
      ['Early signs · 01:20', '1 MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate'],
      ['Trigger off · 01:40', '1 Dantrolene 2.5 mg/kg'],
    ]);
    // the title names the stage in full on hover, and is a heading of the fold, not a row
    const head = r.el.querySelector('.ip2-fin-head') as HTMLElement;
    expect(head.title).toBe('Awake on the table, monitoring on, breathing room air');
    expect(r.el.querySelectorAll('.ip2-finished-list .ip2-row')).toHaveLength(7);
    // the open list is not touched: no finished row and no title in it
    expect(r.el.querySelector('.ip2-rows:not(.ip2-finished-list) .ip2-fin-head')).toBeNull();
    expect(r.el.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-row').length).toBe(r.board.list.length);
  });

  it('a stage entered twice gets two titles with their own entry times; a repaint keeps the rows\' elements', () => {
    const again: H[] = [...TO_TREATING, { t: 200, stateId: 'triggerOff' }, { t: 250, stateId: 'dantrolene', transitionId: 'dant' }, { t: 252, stateId: 'treating', transitionId: 'back' }];
    const r = rig(again, 260);
    const heads = groups(r.el).map((g) => g[0]);
    expect(heads.slice(-2)).toEqual(['Trigger off · 01:40', 'Trigger off · 03:20']);
    expect(groups(r.el).slice(-2).map((g) => g.slice(1))).toEqual([['1 Dantrolene 2.5 mg/kg'], ['1 Dantrolene 2.5 mg/kg']]);
    expect(r.el.querySelector('.ip2-finished summary')?.textContent).toBe(`Finished steps · ${r.board.finished.length}`);
    const before = [...r.el.querySelectorAll('.ip2-finished-list .ip2-row')];
    r.slot.refresh();
    expect([...r.el.querySelectorAll('.ip2-finished-list .ip2-row')]).toEqual(before);
    expect([...r.el.querySelectorAll('.ip2-finished-list .ip2-row')].every((x, i) => x === before[i])).toBe(true);
  });

  it('nothing finished yet: no title, "Finished steps · 0"', () => {
    const r = rig([{ t: 0, stateId: 'awake' }], 5);
    expect(r.el.querySelector('.ip2-finished summary')?.textContent).toBe('Finished steps · 0');
    expect(r.el.querySelectorAll('.ip2-fin-group')).toHaveLength(0);
  });
});
