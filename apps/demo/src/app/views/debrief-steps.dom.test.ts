// @vitest-environment happy-dom
// IP8 (Instructor v2): the Debrief's one new section, the card's steps with their status; a mark's kind and note in
// Bookmarks; a staged delivery on one timeline line while the record and Drugs and fluids keep one row per item. A
// record without the new fields (a free run, a record made before them) draws the report as before.
import type { WireEvent } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import type { AppSession } from '../session.ts';
import type { Link } from '../link.ts';
import type { Administration, PhaseEntry, RuleEdge, ScenarioDocV2 } from '@pme/controller/scenario';
import { emptyRun, RunRecord, type RunData } from '../record.ts';
import mhV2 from '../showcase/showcase-mh-v2.json';
import induction from '../showcase/showcase-induction.json';
import { debriefView } from './debrief.ts';

const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;
const state = (t: number, stateId: string, transitionId?: string): WireEvent => ({ type: 'scenario', t, stateId, ...(transitionId ? { transitionId } : {}) }) as WireEvent;
const cells = (el: HTMLElement, sel: string) => [...el.querySelectorAll(`${sel} tbody tr`)].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));

describe('Debrief: steps, marks and staged deliveries (IP8)', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));
  const show = (record: RunRecord): HTMLElement => {
    const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
    const view = debriefView({ record } as unknown as AppSession, link);
    document.body.append(view.el);
    view.enter?.('');
    leave = view.leave;
    return view.el;
  };

  it('draws the steps of each stage entered, a mark with its kind and note, and one line per staged delivery', () => {
    const record = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => 1_000);
    // one objective that asks for a step: the tube within a minute of induction
    const doc = { ...induction, objectives: [{ text: 'Intubate within 60 s of induction', rule: { kind: 'eventWithin', after: 'state:induced', event: 'state:ventilated', withinS: 60 } }] };
    record.wire(applied(0, { type: 'scenario', action: 'load', doc }));
    record.wire(state(0, 'awake'));
    record.wire(state(10, 'induced', 'induce'));
    record.wire(applied(500, { type: 'scenario', action: 'trigger', target: 'induce' })); // 00:10, pressed
    record.wire(applied(1000, { type: 'scenario', action: 'bookmark', target: 'Mark 1 at 00:20', kind: 'good', note: 'calm induction' }));
    record.wire(applied(1100, { type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:22' }));
    const batch = { id: 'sg-1', n: 2 };
    record.wire(applied(1500, { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' }, batch }));
    record.wire(applied(1500, { type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 }, batch }));
    record.wire(state(40, 'desaturating', 'desat')); // its rule
    const el = show(record);
    const stepRows = cells(el, '#db-steps');
    const label = (id: string) => induction.states.find((x) => x.id === id)?.label;
    // the taken step, and the untaken one the objective asks for; the alternatives no objective asks for are left out
    expect(stepRows).toEqual([
      [`${label('awake')} · 00:00`, '1', 'Induce now', '00:10 (1)', '✓ taken'],
      [`${label('induced')} · 00:10`, '1', 'Intubate and ventilate', '–', '✗ failed'], // Desaturating cannot go back to Induced's "Ventilated"
    ]);
    expect([...el.querySelectorAll('#db-steps tbody tr')].map((tr) => tr.getAttribute('data-status'))).toEqual(['taken', 'failed']);
    expect([...el.querySelectorAll('#db-bookmarks li')].map((li) => li.textContent)).toEqual(['00:20 Bookmark: Mark 1 at 00:20 · good: “calm induction”', '00:22 Bookmark: Bookmark 1 at 00:22']);
    const timeline = cells(el, '#db-timeline');
    expect(timeline.filter((r) => r[2]?.startsWith('Delivered together'))).toEqual([['00:30', 'Action', 'Delivered together: Epinephrine 1 mg IV; Crystalloid 500 mL over 5 min']]);
    expect(timeline.filter((r) => r[2] === 'Epinephrine 1 mg IV')).toEqual([]); // folded into the delivery's line
    expect(record.data.rows.filter((r) => r.batch).map((r) => r.ev)).toEqual(['drug:epinephrine', 'fluid']); // the record keeps each item
    expect(cells(el, '#db-drugs').map((r) => r[1])).toEqual(['Epinephrine 1 mg IV', 'Crystalloid 500 mL over 5 min']);
    // the steps section sits between Drugs and fluids and the Timeline, on the page they share
    expect([...el.querySelectorAll('#db-live-2 > section')].map((s) => s.id)).toEqual(['db-trends', 'db-drugs', 'db-steps', 'db-timeline', 'db-bookmarks', 'db-minutes']);
  });

  it('a free run and a record made before IP8 have no steps section; their bookmarks read as before', () => {
    const free = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => 1_000);
    free.wire(applied(1000, { type: 'scenario', action: 'bookmark', target: 'Bookmark 1 at 00:20' }));
    let el = show(free);
    expect(el.querySelector('#db-steps')).toBeNull();
    expect([...el.querySelectorAll('#db-bookmarks li')].map((li) => li.textContent)).toEqual(['00:20 Bookmark: Bookmark 1 at 00:20']);
    leave?.();
    document.body.replaceChildren();
    const old = new RunRecord(() => ({ patient: 'M 40 y 70 kg', weightKg: 70 }), () => 1_000);
    old.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
    old.wire(state(0, 'awake'));
    old.wire(state(10, 'induced', 'induce'));
    for (const r of old.data.rows) (delete r.tr, delete r.by); // as an rc.3 record holds it
    el = show(old);
    expect(el.querySelector('#db-steps')).toBeNull();
  });
});

// F11 found the /2 action table printing an action's WORST grade on its row: dantrolene read "overdue" although its first
// dose was met (the repeat was late). The row prints the first administration's own grade (F3's ActionGrade.firstGrade);
// each repeat keeps its own grade on its own row.
describe('Debrief: a /2 run\'s action row prints its first administration\'s grade, the repeats theirs', () => {
  afterEach(() => document.body.replaceChildren());
  it('dantrolene: the first dose met at 08:20 ("✓ met"), the repeat given late ("! overdue") on its own row', () => {
    const phases: PhaseEntry[] = [{ id: 'baseline', t: 0, exitT: 400, rule: 'start' }, { id: 'latent', t: 400, rule: 'enter:latent' }];
    const dose = (seq: number, t: number): Administration => ({ seq, t, source: 'action', actionId: 'dantrolene', kind: 'drug', drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', perKg: 2.5, route: 'iv', result: { accepted: true } });
    const admin: Administration[] = [{ seq: 1, t: 470, source: 'action', actionId: 'callCrisis', kind: 'vaporiser', settings: { dialPct: 0, fgfLpm: 10 }, result: { accepted: true } }, dose(2, 500), dose(3, 1200)];
    // the call's anchor at 07:00; EtCO₂ climbing again at unchanged ventilation from 10:00: the repeat due 13:20 to 18:20
    const edges: RuleEdge[] = [{ rule: 'action:callCrisis:anchor', t: 420, value: true }, { rule: 'action:dantrolene:repeatWhile', t: 600, value: true }];
    const sample = (t: number) => ({ t, hr: 80, map: 80, spo2: 98, etco2: 38, rr: 12, temp: 36.8, k: null, lactate: null, ph: null, glucose: null, tcore: null });
    const data: RunData = { ...emptyRun('M 35 y 80 kg', 80, 0), doc: mhV2 as unknown as ScenarioDocV2, format: 2, phases, admin, edges, rows: [{ t: 0, kind: 'scenario', text: 'Scenario loaded: MH' }], samples: [sample(0), sample(1500)] };
    const record = new RunRecord(() => ({ patient: 'M 35 y 80 kg', weightKg: 80 }), () => 1_000);
    record.data = data;
    const link = { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link;
    const view = debriefView({ record } as unknown as AppSession, link);
    document.body.append(view.el);
    view.enter?.('');
    const rows = [...view.el.querySelectorAll('#db-actions tbody tr')] as HTMLElement[];
    const i = rows.findIndex((r) => r.querySelector('td')?.textContent?.startsWith('Dantrolene 2.5 mg/kg') && r.classList.contains('db-act'));
    const act = rows[i] as HTMLElement;
    const repeat = rows[i + 1] as HTMLElement;
    expect(act.dataset.grade).toBe('met');
    expect(act.querySelectorAll('td')[3]?.textContent).toBe('✓ met');
    expect(repeat.classList.contains('db-repeat')).toBe(true);
    expect(repeat.querySelector('td')?.textContent).toBe('repeat 2');
    expect(repeat.dataset.grade).toBe('overdue');
    expect(repeat.querySelectorAll('td')[3]?.textContent).toBe('! overdue');
    view.leave?.();
  });
});
