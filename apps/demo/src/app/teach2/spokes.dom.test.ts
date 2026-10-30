// @vitest-environment happy-dom
// Instructor v2 reads a /1 card's spoke states as actions of their hub stage (the clinical owner's three reports of 30
// October on the MH card: a completed step "becomes green but stays in the action pane"; the Cool step "turned amber,
// indicating that it is an automatic task, is it really?"; "the phase keeps repeating"). A spoke is a state whose only
// exit is a short `afterS` back to its hub (card-read.ts `isHop`, the controller's one rule): pressing its row keeps the
// hub current (no chip, the hub's entry time, "entered by your button"), the pressed row is green and in "Finished
// steps · n" at once, the hub's other rows keep their state; a rule firing is amber and in the fold; a press of a step
// with no rule of its own is never amber, whatever the record's attribution says; the A rows show as today. The strip,
// the cue box and ACTION are mounted together on one fake host Link, on the real MH card and on a small synthetic card.
import { beforeEach, describe, expect, it } from 'vitest';
import { ScenarioView, type ScenarioDoc } from '@pme/controller';
import type { Link } from '../link.ts';
import { emptyRun, type Row as RecRow } from '../record.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { mount as mountAction } from './action.ts';
import type { Teach2Ctx } from './ctx.ts';
import { mount as mountCue } from './cue.ts';
import { mount as mountStrip } from './strip.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;

/** A hub with two spokes, a step that is a press or its own rule into a third spoke, and a rule out of the hub. */
const HUB: ScenarioDoc = {
  schema: 'pme-scenario/1', id: 'spoke-test', title: 'Spokes', initialState: 'start',
  states: [
    { id: 'start', label: 'Start', transitions: [{ id: 'begin', to: 'hub', when: { manual: { label: 'Begin' } } }] },
    {
      id: 'hub', label: 'Hub stage', transitions: [
        { id: 'a', to: 'spokeA', when: { manual: { label: 'Give A' } } },
        { id: 'b', to: 'spokeB', when: { manual: { label: 'Give B' } } },
        { id: 'c', to: 'spokeC', when: { any: [{ manual: { label: 'Give C' } }, { vital: { var: 'etco2', op: '<', value: 30, forS: 5 } }] } },
        { id: 'done', to: 'done', when: { vital: { var: 'etco2', op: '<', value: 20, forS: 10 } } },
      ],
    },
    { id: 'spokeA', label: 'A given', transitions: [{ id: 'backA', to: 'hub', when: { afterS: 2 } }] },
    { id: 'spokeB', label: 'B given', transitions: [{ id: 'backB', to: 'hub', when: { afterS: 2 } }] },
    { id: 'spokeC', label: 'C given', transitions: [{ id: 'backC', to: 'hub', when: { afterS: 2 } }] },
    { id: 'done', label: 'Done' },
  ],
} as unknown as ScenarioDoc;

type H = { t: number; stateId: string; transitionId?: string };
/** A state row of the host's record (record.ts): how each state was entered, `by` a press or a rule. */
const st = (t: number, stateId: string, tr?: string, by?: 'press' | 'rule'): Partial<RecRow> & { t: number } => ({ t, kind: 'scenario', text: '', ev: `state:${stateId}`, ...(tr ? { tr } : {}), ...(by ? { by } : {}) });

function rig(doc: ScenarioDoc, history: H[], rows: Array<Partial<RecRow> & { t: number }>, simT: number) {
  const sv = new ScenarioView();
  sv.doc = doc;
  sv.docVersion = 1;
  const record = emptyRun('test', 80, 0);
  record.doc = doc;
  const ctl = { scenario: sv, bookmarks: [], simT, hostPaused: false, state: null, send: async () => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }) };
  const host = { record: { data: record }, driver: { stageMarks: () => [], vitalHolds: () => [] }, onBriefing: () => () => undefined };
  const link = { ctl, host, log: [], ramps: new Map(), get simT() { return ctl.simT; }, send: ctl.send, note: () => undefined } as unknown as Link;
  const ctx = { link, keys: { digit: () => undefined, letter: () => undefined, escape: () => () => undefined }, dock: {}, openSheet: () => undefined } as unknown as Teach2Ctx;
  const strip = document.createElement('nav');
  const cue = document.createElement('div');
  const action = document.createElement('div');
  document.body.append(strip, cue, action);
  const slots = [mountStrip(strip, ctx), mountCue(cue, ctx), mountAction(action, ctx)];
  /** Move the run on: the history, the record's state rows and the clock as the host's view has them now. */
  const at = (h: H[], r: Array<Partial<RecRow> & { t: number }>, t: number) => {
    sv.history = h;
    const last = h.at(-1) as H;
    // ScenarioView keeps the entry time of the state it is in (a hop's return is a new state: its own time)
    sv.stateId = last.stateId;
    sv.enteredT = last.t;
    record.rows = r.map((x) => ({ kind: 'scenario', text: '', ...x }) as RecRow);
    ctl.simT = t;
    for (const s of slots) s.refresh();
  };
  at(history, rows, simT);
  const text = (el: Element, s: string) => (el.querySelector(s)?.textContent ?? '').trim();
  const open = () => [...action.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-row')].map((p) => `${(p as HTMLElement).dataset.look} ${text(p, '.ip2-key')} ${text(p, '.ip2-row-title')}`);
  const fin = () => [...action.querySelectorAll('.ip2-finished-list .ip2-row')].map((p) => `${(p as HTMLElement).dataset.look} ${text(p, '.ip2-key')} ${text(p, '.ip2-row-title')} ${text(p, '.ip2-row-right')}`);
  const chips = () => [...strip.querySelectorAll('.ip2-chips > .ip2-chip')].map((c) => c.textContent);
  return { at, strip, cue, action, open, fin, chips, count: () => text(action, '.ip2-finished summary'), how: () => text(cue, '.ip2-cue-how'), current: () => text(strip, '.ip2-current') };
}

beforeEach(() => document.body.replaceChildren());

/** The MH course to the treatment stage (the crisis called from Established MH, dantrolene from Trigger off). */
const MH_TO_TREATING: H[] = [
  { t: 0, stateId: 'awake' }, { t: 60, stateId: 'premedicated', transitionId: 'premed' }, { t: 120, stateId: 'induced', transitionId: 'induce-premed' },
  { t: 180, stateId: 'intubated', transitionId: 'intubate' }, { t: 240, stateId: 'surgery', transitionId: 'surgery' },
  { t: 420, stateId: 'earlySigns', transitionId: 'early' }, { t: 470, stateId: 'established', transitionId: 'established' },
  { t: 496, stateId: 'triggerOff', transitionId: 'crisis-established' },
  { t: 520, stateId: 'dantrolene', transitionId: 'dant' }, { t: 522, stateId: 'treating', transitionId: 'back' },
];
const MH_ROWS = [
  st(0, 'awake'), st(60, 'premedicated', 'premed', 'press'), st(120, 'induced', 'induce-premed', 'press'), st(180, 'intubated', 'intubate', 'press'),
  st(240, 'surgery', 'surgery', 'press'), st(420, 'earlySigns', 'early', 'rule'), st(470, 'established', 'established', 'rule'),
  st(496, 'triggerOff', 'crisis-established', 'press'), st(520, 'dantrolene', 'dant', 'press'), st(522, 'treating', 'back', 'rule'),
];

describe('the MH card: a spoke press is an action of the treatment stage (the owner\'s reports of 30 October)', () => {
  it('Cool and Potassium pressed in turn: the stage stays current with its entry, they go green into Finished at once, Dantrolene and Bicarbonate stay open', () => {
    const r = rig(MH, MH_TO_TREATING, MH_ROWS, 530);
    const chipsBefore = r.chips();
    expect(r.current()).toBe('MH treatment under way08:40 · 4 open');
    expect(r.how()).toBe('entered by your button at 08:40');
    const finBefore = r.fin().length;
    expect(r.open().slice(0, 4)).toEqual(['current 1 Dantrolene 2.5 mg/kg', 'ready 2 Cool: refrigerated saline 20 mL/kg (1.6 L)', 'unmet 3 Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose', 'ready 4 Sodium bicarbonate 1 mmol/kg']);

    // Cool, the owner's case: the record has the press as 'rule' (the press's acknowledgement came more than a tick
    // after the state it entered); every Cool transition of the card is `manual`, so no rule of its own can fire it
    const h1: H[] = [...MH_TO_TREATING, { t: 540, stateId: 'cooling', transitionId: 'cool-treating' }];
    const r1 = [...MH_ROWS, st(540, 'cooling', 'cool-treating', 'rule')];
    r.at(h1, r1, 541); // during the 2-s spoke
    expect(r.chips()).toEqual(chipsBefore.map((c) => c?.replace('4 open', '3 open')));
    expect(r.how()).toBe('entered by your button at 08:40');
    const h2: H[] = [...h1, { t: 542, stateId: 'treating', transitionId: 'back-cooling' }];
    const r2 = [...r1, st(542, 'treating', 'back-cooling', 'rule')];
    r.at(h2, r2, 550);
    // one chip for the stage, its entry time unchanged, no chip for the spoke, one step fewer open
    expect(r.chips()).toEqual(chipsBefore.map((c) => c?.replace('4 open', '3 open')));
    expect(r.current()).toBe('MH treatment under way08:40 · 3 open');
    expect(r.how()).toBe('entered by your button at 08:40');
    // green, in the fold at once, with its number and time; never amber
    expect(r.fin().slice(finBefore)).toEqual(['taken 2 Cool: refrigerated saline 20 mL/kg (1.6 L) 09:00']);
    expect(r.count()).toBe(`Finished steps · ${finBefore + 1}`);
    expect(r.fin().filter((x) => x.includes('Cool'))).toEqual(['taken 2 Cool: refrigerated saline 20 mL/kg (1.6 L) 09:00']);
    expect(r.open().slice(0, 3)).toEqual(['current 1 Dantrolene 2.5 mg/kg', 'unmet 3 Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose', 'ready 4 Sodium bicarbonate 1 mmol/kg']);

    // Potassium: the same; Cool keeps its state (taken) within the visit
    const h3: H[] = [...h2, { t: 560, stateId: 'potassium', transitionId: 'kTreat-treating' }, { t: 562, stateId: 'treating', transitionId: 'back-potassium' }];
    const r3 = [...r2, st(560, 'potassium', 'kTreat-treating', 'press'), st(562, 'treating', 'back-potassium', 'rule')];
    r.at(h3, r3, 570);
    expect(r.fin().slice(finBefore)).toEqual(['taken 2 Cool: refrigerated saline 20 mL/kg (1.6 L) 09:00', 'taken 3 Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose 09:20']);
    expect(r.count()).toBe(`Finished steps · ${finBefore + 2}`);
    expect(r.current()).toBe('MH treatment under way08:40 · 2 open');
    expect(r.how()).toBe('entered by your button at 08:40');
    // the A rows show as today: pending, with their bars
    expect(r.open()).toEqual(['current 1 Dantrolene 2.5 mg/kg', 'ready 4 Sodium bicarbonate 1 mmol/kg', 'ready 5 Name malignant hyperthermia from the monitor: EtCO₂ rising at unchanged ventilation when it should be falling (42 → 45; without MH it settles 36–39) with a rising heart rate (64 → 80, blunted by fentanyl) (instructor-assessed)', 'pending A Recovering: EtCO₂ below 45', 'pending A Cardiac arrest']);
    expect(r.action.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-bar')).toHaveLength(2);
    // the fold stays folded
    expect((r.action.querySelector('details.ip2-finished') as HTMLDetailsElement).open).toBe(false);
  });

  it('a dose from Recovering: the treatment stage is current again by that press, one chip, "entered by your button"; the Recovering rule shows its bar', () => {
    const toRec: H[] = [...MH_TO_TREATING, { t: 900, stateId: 'recovering', transitionId: 'recover' }];
    const recRows = [...MH_ROWS, st(900, 'recovering', 'recover', 'rule')];
    const r = rig(MH, toRec, recRows, 910);
    expect(r.current()).toBe('Recovering15:00 · 5 open');
    expect(r.how()).toMatch(/^entered by its rule at 15:00/);
    // Dantrolene again: its press recorded as 'rule' (the same acknowledgement race), the spoke returns to treating
    const h: H[] = [...toRec, { t: 960, stateId: 'dantrolene', transitionId: 'dant-recovering' }, { t: 962, stateId: 'treating', transitionId: 'back' }];
    r.at(h, [...recRows, st(960, 'dantrolene', 'dant-recovering', 'rule'), st(962, 'treating', 'back', 'rule')], 970);
    expect(r.current()).toBe('MH treatment under way16:00 · 4 open');
    expect(r.chips().filter((c) => c?.startsWith('MH treatment under way'))).toHaveLength(1);
    expect(r.how()).toBe('entered by your button at 16:00');
    // the press that left Recovering is in the fold, green; the A row "Recovering" is open with its bar, as today
    expect(r.fin().at(-1)).toBe('taken 1 Dantrolene 2.5 mg/kg 16:00');
    expect(r.open()).toContain('pending A Recovering: EtCO₂ below 45');
  });
});

describe('a small card with a hub and two spokes', () => {
  const START: H[] = [{ t: 0, stateId: 'start' }, { t: 10, stateId: 'hub', transitionId: 'begin' }];
  const ROWS = [st(0, 'start'), st(10, 'hub', 'begin', 'press')];

  it('spoke A pressed: the hub stays current with its entry; A is green in the fold at once with the count; B and C keep their state', () => {
    const r = rig(HUB, START, ROWS, 20);
    expect(r.chips()).toEqual(['Start00:00', 'Hub stage00:10 · 3 open', 'Doneauto']);
    expect(r.open()).toEqual(['current 1 Give A', 'ready 2 Give B', 'ready 3 Give C', 'pending A Done']);
    expect(r.count()).toBe('Finished steps · 1');
    const h: H[] = [...START, { t: 30, stateId: 'spokeA', transitionId: 'a' }, { t: 32, stateId: 'hub', transitionId: 'backA' }];
    // the record has A's press as 'rule': a step with no rule of its own is a press all the same
    r.at(h, [...ROWS, st(30, 'spokeA', 'a', 'rule'), st(32, 'hub', 'backA', 'rule')], 40);
    expect(r.chips()).toEqual(['Start00:00', 'Hub stage00:10 · 2 open', 'Doneauto']);
    expect(r.how()).toBe('entered by your button at 00:10');
    expect(r.fin()).toEqual(['taken 1 Begin 00:10', 'taken 1 Give A 00:30']);
    expect(r.count()).toBe('Finished steps · 2');
    expect(r.open()).toEqual(['current 2 Give B', 'ready 3 Give C', 'pending A Done']);
    // B pressed: A stays taken (in the fold), B joins it
    const h2: H[] = [...h, { t: 50, stateId: 'spokeB', transitionId: 'b' }, { t: 52, stateId: 'hub', transitionId: 'backB' }];
    r.at(h2, [...ROWS, st(30, 'spokeA', 'a', 'press'), st(32, 'hub', 'backA', 'rule'), st(50, 'spokeB', 'b', 'press'), st(52, 'hub', 'backB', 'rule')], 60);
    expect(r.fin()).toEqual(['taken 1 Begin 00:10', 'taken 1 Give A 00:30', 'taken 2 Give B 00:50']);
    expect(r.open()).toEqual(['current 3 Give C', 'pending A Done']);
    expect(r.chips()).toEqual(['Start00:00', 'Hub stage00:10 · 1 open', 'Doneauto']);
  });

  it('a rule firing is amber and in the fold at once: the mixed step C by its own rule, then the A row that leaves the hub', () => {
    const r = rig(HUB, START, ROWS, 20);
    const h: H[] = [...START, { t: 30, stateId: 'spokeC', transitionId: 'c' }, { t: 32, stateId: 'hub', transitionId: 'backC' }];
    const rows = [...ROWS, st(30, 'spokeC', 'c', 'rule'), st(32, 'hub', 'backC', 'rule')];
    r.at(h, rows, 40);
    expect(r.fin()).toEqual(['taken 1 Begin 00:10', 'fired 3 Give C 00:30']);
    expect(r.open()).toEqual(['current 1 Give A', 'ready 2 Give B', 'pending A Done']);
    expect(r.how()).toBe('entered by your button at 00:10');
    const h2: H[] = [...h, { t: 80, stateId: 'done', transitionId: 'done' }];
    r.at(h2, [...rows, st(80, 'done', 'done', 'rule')], 90);
    expect(r.fin()).toEqual(['taken 1 Begin 00:10', 'fired 3 Give C 00:30', 'fired A Done 01:20']);
    expect(r.count()).toBe('Finished steps · 3');
  });

  it('the same mixed step pressed: green, never amber', () => {
    const r = rig(HUB, START, ROWS, 20);
    const h: H[] = [...START, { t: 30, stateId: 'spokeC', transitionId: 'c' }, { t: 32, stateId: 'hub', transitionId: 'backC' }];
    r.at(h, [...ROWS, st(30, 'spokeC', 'c', 'press'), st(32, 'hub', 'backC', 'rule')], 40);
    expect(r.fin()).toEqual(['taken 1 Begin 00:10', 'taken 3 Give C 00:30']);
  });
});
