// @vitest-environment happy-dom
// IP8 (Instructor v2): the Debrief's one new section, the card's steps with their status; a mark's kind and note in
// Bookmarks; a staged delivery on one timeline line while the record and Drugs and fluids keep one row per item. A
// record without the new fields (a free run, a record made before them) draws the report as before.
import type { WireEvent } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import type { AppSession } from '../session.ts';
import type { Link } from '../link.ts';
import { RunRecord } from '../record.ts';
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
    record.wire(applied(0, { type: 'scenario', action: 'load', doc: induction }));
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
    expect(stepRows).toEqual([
      [`${label('awake')} · 00:00`, '1', 'Induce now', '00:10 (1)', '✓ taken'],
      [`${label('induced')} · 00:10`, '1', 'Intubate and ventilate', '–', '✗ failed'], // Desaturating cannot go back to Induced's "Ventilated"
      ['', '2', 'Bag-mask ventilate, FiO₂ 1.0', '–', '– not done'], // Rescued (bag-mask) is still reachable
      [`${label('desaturating')} · 00:40`, '1', 'Intubate and ventilate, FiO₂ 1.0', '–', '– not done'],
      ['', '2', 'Bag-mask ventilate, FiO₂ 1.0', '–', '– not done'],
    ]);
    expect([...el.querySelectorAll('#db-steps tbody tr')].map((tr) => tr.getAttribute('data-status'))).toEqual(['taken', 'failed', 'not done', 'not done', 'not done']);
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
