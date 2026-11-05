// @vitest-environment happy-dom
// The MH card's treating hub: Potassium (and every other spoke) is a button of each hub state — Trigger off, treating,
// recovering, ventilation back — each its own transition into the same hop. A step pressed in one visit of the hub is
// done: the Debrief does not list it again, overdue, for a later hub state whose window it was pressed before. The card
// says a step repeats by giving it its own state (dantroleneAgain), and that one stays asked.
import type { WireEvent } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import type { AppSession } from '../session.ts';
import type { Link } from '../link.ts';
import { RunRecord } from '../record.ts';
import mh from '../showcase/showcase-mh.json';
import { debriefView } from './debrief.ts';

/** A command the scenario's onEnter applied (a drug of a hop), as the host acknowledges it. */
const given = (t: number, drugId: string): WireEvent =>
  ({ type: 'commandApplied', commandId: `${drugId}${t}`, tick: Math.round(t / 0.02), resolved: { command: { id: `${drugId}${t}`, issuedBy: 'scenario', type: 'applyEvent', event: { kind: 'drug', drugId, dose: 1, unit: 'mg/kg', route: 'iv' } } } }) as WireEvent;
const state = (t: number, stateId: string, transitionId?: string, by?: 'press' | 'rule'): WireEvent => ({ type: 'scenario', t, stateId, ...(transitionId ? { transitionId } : {}), ...(by ? { by } : {}) }) as WireEvent;
const cells = (el: HTMLElement) => [...el.querySelectorAll('#db-steps tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent ?? ''));
const K = 'Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose';

/** The MH card from the call to the hub: early signs, the crisis called, dantrolene, back to treating at 08:40. */
function toTreating(): RunRecord {
  const r = new RunRecord(() => ({ patient: 'M 30 y 80 kg', weightKg: 80 }), () => 1_000);
  r.wire({ type: 'commandApplied', commandId: 'load', tick: 0, resolved: { command: { id: 'load', issuedBy: 'instructor', type: 'scenario', action: 'load', doc: mh } } } as WireEvent);
  r.wire(state(0, 'awake'));
  r.wire(state(489, 'earlySigns', 'early', 'rule'));
  r.wire(state(498, 'triggerOff', 'crisis-earlySigns', 'press'));
  r.wire(state(518, 'dantrolene', 'dant', 'press'));
  r.wire(given(518.1, 'dantrolene'));
  r.wire(state(520, 'treating', 'back', 'rule'));
  return r;
}
/** K⁺ from 08:00 to `end`: 5.4 mmol/L, above 5.5 from `above` on (the model's labs, 1 Hz). */
const potassium = (r: RunRecord, above: number, end: number): void => {
  for (let t = 480; t <= end; t++) r.engine({ type: 'labs', t, values: { k: t >= above ? 5.8 : 5.4, lactate: 4, ph: 7.2 } } as never);
};

describe('Debrief: a step of the MH hub done in an earlier visit stays done', () => {
  let leave: (() => void) | undefined;
  afterEach(() => (leave?.(), document.body.replaceChildren()));
  const show = (record: RunRecord): HTMLElement => {
    const view = debriefView({ record } as unknown as AppSession, { onChange: () => () => undefined, ctl: { scenario: {} } } as unknown as Link);
    document.body.append(view.el);
    view.enter?.('');
    leave = view.leave;
    return view.el;
  };

  it('treating → potassium → treating → recovering → treating: Potassium reads taken once, never overdue', () => {
    const r = toTreating();
    r.wire(state(530, 'potassium', 'kTreat-treating', 'press')); // 08:50, at K⁺ 5.4
    r.wire(given(530.1, 'calciumChloride'));
    r.wire(given(530.1, 'insulinDextrose'));
    r.wire(state(532, 'treating', 'back-potassium', 'rule'));
    r.wire(state(592, 'recovering', 'recover', 'rule'));
    r.wire(state(597, 'cooling', 'cool-recovering', 'press'));
    r.wire(state(599, 'treating', 'back-cooling', 'rule'));
    potassium(r, 560, 1000); // K⁺ still rose past 5.5 after it was given; 5 min on, its window has passed
    const rows = cells(show(r)).filter((c) => c[2] === K);
    expect(rows).toEqual([['MH treatment under way · 08:40', '3', K, '08:50 (1)', '✓ taken']]); // treating's row; none for recovering
  });

  it('a step the card repeats with its own state stays asked: the second dantrolene at "ventilation back"', () => {
    const r = toTreating();
    r.wire(state(592, 'recovering', 'recover', 'rule'));
    r.wire(state(700, 'normoventilated', 'normo', 'press'));
    potassium(r, 2000, 800);
    const rows = cells(show(r)).filter((c) => c[2]?.startsWith('Dantrolene 2.5 mg/kg; hyperventilate again'));
    expect(rows.map((c) => c[4])).toEqual(['– not done']);
  });
});
