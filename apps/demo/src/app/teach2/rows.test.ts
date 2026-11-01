// teach2/rows.ts on fixtures built from the two demo cards (plan IP6; answers 6, 7, 8, 20): each look of the design's
// row-state table — current, ready, condition not met, overdue, taken (and out of order), failed, met, automatic pending
// and fired — the folds' contents, and the A row's bar with and without IP1's hold accessor.
import type { ScenarioDoc } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { drugWords } from '../glossary.ts';
import type { ClinicalLogEntry } from '../link.ts';
import { emptyRun, type Row as RecRow, type RunData, type Sample } from '../record.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import { classify, firstT, type HoldLike, type LiveRow, type Source } from './rows.ts';

const MH = showcaseDoc('showcase-mh') as ScenarioDoc;
const HAEM = showcaseDoc('showcase-haemorrhage') as ScenarioDoc;
type H = Source['history'][number];

function src(doc: ScenarioDoc, stateId: string, o: Partial<Source> = {}): Source {
  const history = o.history ?? [];
  return {
    doc, stateId, history, enteredT: history.at(-1)?.t ?? 0, simT: 0, inState: 0, paused: false, log: [], record: null,
    values: undefined, holds: null, base: new Map(), ...o,
  };
}
function record(doc: ScenarioDoc, rows: Array<Partial<RecRow> & { t: number }>, samples: Array<Partial<Sample> & { t: number }> = []): RunData {
  const d = emptyRun('test', 80, 0);
  d.doc = doc;
  d.rows = rows.map((r) => ({ kind: 'scenario', text: '', ...r }) as RecRow);
  const nul = { hr: null, map: null, spo2: null, etco2: null, rr: null, temp: null, k: null, lactate: null, ph: null, glucose: null, tcore: null };
  d.samples = samples.map((s) => ({ ...nul, ...s }) as Sample);
  return d;
}
const titled = (rows: readonly LiveRow[], start: string) => rows.find((r) => r.row.title.startsWith(start));
const looks = (rows: readonly LiveRow[]) => rows.map((r) => [r.row.kind === 'auto' ? 'A' : r.row.n, r.look]);

/** MH from the start to the treatment stage: the crisis called from early signs at 100, dantrolene at 150. */
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

describe('rows.ts: the open looks', () => {
  it('MH treating, nothing taken yet: the first ready step is current, the rest ready, the judged objective and the two A rows follow', () => {
    const b = classify(src(MH, 'treating', { history: TO_TREATING, simT: 160 }));
    expect(b.stage?.id).toBe('treating');
    expect(looks(b.list)).toEqual([[1, 'current'], [2, 'ready'], [3, 'ready'], [4, 'ready'], [5, 'ready'], ['A', 'pending'], ['A', 'pending']]);
    expect(b.list.every((r) => r.overdue === null)).toBe(true);
  });

  it('condition not met (answer 6): the potassium step waits for K⁺ above 5.5 on the host\'s record, faded and pressable, with the value now', () => {
    const rec = record(MH, [{ t: 100, ev: 'state:triggerOff' }, { t: 150, ev: 'drug:dantrolene' }], [{ t: 159, k: 4.3 }]);
    const b = classify(src(MH, 'treating', { history: TO_TREATING, simT: 160, record: rec }));
    const k = titled(b.list, 'Potassium') as LiveRow;
    expect(k.look).toBe('unmet');
    expect(k.subtitle).toContain('the card expects it after K⁺ above 5.5');
    expect(k.subtitle).toContain('pressable now');
    expect(k.right).toBe('K⁺ 4.3');
    // K⁺ past 5.5: ready, and the treatment's own 300-s window now runs
    rec.samples.push({ ...(rec.samples[0] as Sample), t: 170, k: 5.8 });
    const b2 = classify(src(MH, 'treating', { history: TO_TREATING, simT: 200, record: rec }));
    const k2 = titled(b2.list, 'Potassium') as LiveRow;
    expect(k2.look).toBe('ready');
    expect(k2.right).toBe('due in 04:30');
  });

  it('a follower has no record: no step is "condition not met" (it cannot see K⁺), every step stays a row', () => {
    const b = classify(src(MH, 'treating', { history: TO_TREATING, simT: 160 }));
    expect(b.list.filter((r) => r.look === 'unmet')).toEqual([]);
    expect(b.list.filter((r) => r.row.kind === 'step')).toHaveLength(4);
  });

  it('due, then overdue (answer 7): the dantrolene window runs from the crisis call and burns at 300 s; the step stays pressable', () => {
    const at = (simT: number) => classify(src(MH, 'triggerOff', { history: TO_TREATING.slice(0, 7), simT, record: record(MH, [{ t: 100, ev: 'state:triggerOff' }]) }));
    const due = titled(at(350).list, 'Dantrolene') as LiveRow;
    expect([due.look, due.right, due.overdue]).toEqual(['current', 'due in 00:50', null]);
    expect(due.subtitle).toContain('due in 00:50');
    const late = titled(at(550).list, 'Dantrolene') as LiveRow;
    expect([late.look, late.right, late.overdue]).toEqual(['current', 'overdue 02:30', 150]);
    expect(late.subtitle).toContain('still pressable');
    // the follower reads the same window from the states it saw
    const f = titled(classify(src(MH, 'triggerOff', { history: TO_TREATING.slice(0, 7), simT: 550 })).list, 'Dantrolene') as LiveRow;
    expect(f.right).toBe('overdue 02:30');
    // given: the window closes (no timer)
    const given = titled(classify(src(MH, 'triggerOff', { history: TO_TREATING.slice(0, 7), simT: 450, record: record(MH, [{ t: 100, ev: 'state:triggerOff' }, { t: 200, ev: 'drug:dantrolene' }]) })).list, 'Dantrolene') as LiveRow;
    expect([given.overdue, given.right]).toEqual([null, 'ready']);
  });
});

describe('rows.ts: taken, failed, fired, met and the folds', () => {
  it('taken (answer 7): a step of the treatment fan-out (a spoke) goes green into Finished at once with its time; "out of order" when a later step came first', () => {
    const h: H[] = [...TO_TREATING,
      { t: 200, stateId: 'potassium', transitionId: 'kTreat-treating' }, { t: 202, stateId: 'treating', transitionId: 'back-potassium' },
      { t: 250, stateId: 'dantrolene', transitionId: 'dant-treating' }, { t: 252, stateId: 'treating', transitionId: 'back' }];
    const b = classify(src(MH, 'treating', { history: h, simT: 260 }));
    const k = titled(b.finished.filter((r) => r.stage === 'treating'), 'Potassium') as LiveRow;
    const d = titled(b.finished.filter((r) => r.stage === 'treating'), 'Dantrolene') as LiveRow;
    expect([k.look, k.at, k.right, k.outOfOrder]).toEqual(['taken', 200, '03:20', false]);
    expect([d.look, d.at, d.outOfOrder]).toEqual(['taken', 250, true]);
    expect(d.subtitle).toContain('taken, out of order');
    // the open list keeps the steps not yet taken, the first of them current
    expect(looks(b.list).slice(0, 2)).toEqual([[2, 'current'], [4, 'ready']]);
    expect(b.list.some((r) => r.look === 'taken')).toBe(false);
  });

  it('Finished: the stages passed give their taken steps (green) and their fired A rows (amber); a branch not chosen is dropped', () => {
    const b = classify(src(MH, 'treating', { history: TO_TREATING, simT: 160 }));
    const fin = b.finished.map((r) => [r.stage, r.row.kind, r.look, r.at]);
    expect(fin).toEqual([
      ['awake', 'step', 'taken', 10], // Preoxygenate (no objective on it) was not chosen: dropped, not failed
      ['premedicated', 'step', 'taken', 20],
      ['induced', 'step', 'taken', 30],
      ['intubated', 'step', 'taken', 40],
      ['surgery', 'auto', 'fired', 80],
      ['earlySigns', 'step', 'taken', 100],
      ['triggerOff', 'step', 'taken', 150],
    ]);
    // "MH crisis" was not pressed in induced, intubated or surgery, but the crisis was called (from early signs): what
    // those steps lead to happened, so they are not failed
    expect(b.finished.filter((r) => r.row.title.startsWith('MH crisis')).map((r) => [r.stage, r.look])).toEqual([['earlySigns', 'taken']]);
    expect(b.finished.some((r) => r.look === 'failed')).toBe(false);
  });

  it('an alternative branch not chosen is not a failure: premedicate without pre-oxygenation, after pre-oxygenating, is not shown and not failed', () => {
    const h: H[] = [
      { t: 0, stateId: 'awake' },
      { t: 10, stateId: 'preoxygenated', transitionId: 'preox' },
      { t: 20, stateId: 'premedicated', transitionId: 'premed' },
      { t: 30, stateId: 'induced', transitionId: 'induce' },
      { t: 40, stateId: 'intubated', transitionId: 'intubate' },
    ];
    const b = classify(src(MH, 'intubated', { history: h, simT: 50 }));
    const all = [...b.list, ...b.finished];
    expect(all.some((r) => r.row.kind === 'step' && r.row.tr.id === 'premed-air')).toBe(false);
    expect(b.finished.map((r) => [r.stage, r.look])).toEqual([['awake', 'taken'], ['preoxygenated', 'taken'], ['premedicated', 'taken'], ['induced', 'taken']]);
  });

  it('failed (red): a step a linked objective asked for whose stage has passed and whose target cannot be reached', () => {
    // the crisis never called: MH runs from surgery to early signs, established MH and cardiac arrest by its rules
    const h: H[] = [...TO_TREATING.slice(0, 6), { t: 120, stateId: 'established', transitionId: 'established' }, { t: 200, stateId: 'arrest', transitionId: 'arrest' }];
    const b = classify(src(MH, 'arrest', { history: h, simT: 210 }));
    const failed = b.finished.filter((r) => r.look === 'failed');
    // the "MH crisis" step (the objective "call the MH crisis within 120 s of early signs" rides on it) of the stages
    // passed once that objective asked for it: from early signs on. IP9 (ruling 1) folded this onto the Debrief's
    // reading (card-read.ts `untakenStatus`): before early signs the objective asked for nothing, so the crisis buttons
    // of induced, intubated and surgery are not failed (IP6 had listed them; the Debrief's steps table never did)
    expect(failed.map((r) => [r.stage, r.row.kind === 'step' && r.row.tr.id, r.at])).toEqual([
      ['earlySigns', 'crisis-earlySigns', 120], ['established', 'crisis-established', 200],
    ]);
    expect(failed[0]?.right).toBe('failed 02:00');
    expect(failed[0]?.subtitle).toContain('its stage has passed');
    // Preoxygenate, a branch not chosen with no objective on it: not failed, not shown
    expect(b.finished.some((r) => r.row.title.startsWith('Preoxygenate'))).toBe(false);
  });

  it('a judged objective ticked: "met" in Finished with the tick\'s time; unticked: a ready row, "press when met"', () => {
    const text = (MH.objectives?.[0] as { text: string }).text;
    const open = classify(src(MH, 'earlySigns', { history: TO_TREATING.slice(0, 6) }));
    const j = open.list.find((r) => r.row.kind === 'judged') as LiveRow;
    expect([j.look, j.right, j.row.kind === 'judged' && j.row.n]).toEqual(['ready', 'press when met', 2]);
    const log: ClinicalLogEntry[] = [{ simT: 95, kind: 'marker', text: `Objective met: ${drugWords(text)}` }];
    const met = classify(src(MH, 'earlySigns', { history: TO_TREATING.slice(0, 6), log }));
    expect(met.list.find((r) => r.row.kind === 'judged')).toBeUndefined();
    expect(met.finished.filter((r) => r.row.kind === 'judged').map((r) => [r.look, r.at, r.right])).toEqual([['met', 95, '01:35']]);
  });

  it('Off the card (answer 20): this stage\'s instructor and learner actions from the log; not the steps, the clock, marks or refusals', () => {
    const log: ClinicalLogEntry[] = [
      { simT: 140, kind: 'instructor', text: 'Ondansetron 4 mg IV' }, // before the stage began
      { simT: 155, kind: 'instructor', text: 'Scenario event' }, // a step's press
      { simT: 156, kind: 'instructor', text: 'Speed ×4' },
      { simT: 157, kind: 'instructor', text: 'Bookmark: Bookmark 1 at 02:37' },
      { simT: 158, kind: 'instructor', text: 'Epinephrine 10 µg IV', refused: 'no' },
      { simT: 159, kind: 'instructor', text: 'Phenylephrine 100 µg IV' },
      { simT: 159.5, kind: 'learner', text: 'Charge 150 J' },
      { simT: 159.8, kind: 'alarm', text: 'HR high' },
    ];
    const b = classify(src(MH, 'treating', { history: TO_TREATING, simT: 160, log }));
    expect(b.offCard.map((x) => x.text)).toEqual(['Phenylephrine 100 µg IV', 'Charge 150 J']);
  });
});

describe('rows.ts: automatic rows (answers 5, 8)', () => {
  const surgery = TO_TREATING.slice(0, 5);
  it('a vital rule: value against threshold from where the stage began, the right label "now → threshold"; frozen while paused', () => {
    const base = new Map<string, number>();
    classify(src(MH, 'surgery', { history: surgery, values: { etco2: 40 }, base }));
    const b = classify(src(MH, 'surgery', { history: surgery, values: { etco2: 42.5 }, base }));
    const a = b.list.find((r) => r.row.kind === 'auto') as LiveRow;
    expect([a.look, a.progress, a.right]).toEqual(['pending', 0.35, '43 → 45']); // half-way to the threshold: half of the value's 70 %
    expect(classify(src(MH, 'surgery', { history: surgery, values: { etco2: 42.5 }, base, paused: true })).list.find((r) => r.row.kind === 'auto')?.right).toBe('frozen');
  });

  it('one bar that only grows (answer 8): the value fills 70 % until the threshold is met, then the hold (IP1\'s accessor, PR pending) fills the last 30 %', () => {
    const base = new Map([[`40|early`, 40]]);
    const bar = (etco2: number, holds: HoldLike[] | null) => (classify(src(MH, 'surgery', { history: surgery, values: { etco2 }, base, holds })).list.find((r) => r.row.kind === 'auto') as LiveRow).progress as number;
    // short of the threshold: the value part only, with or without the accessor
    expect(bar(42.5, null)).toBeCloseTo(0.35);
    expect(bar(42.5, [{ transitionId: 'early', key: 'early', met: false, fraction: 0 }])).toBeCloseTo(0.35);
    // met: 70 % plus the hold's share of the last 30 %
    expect(bar(46, [{ transitionId: 'early', key: 'early', met: true, fraction: 0 }])).toBeCloseTo(0.7);
    expect(bar(46, [{ transitionId: 'early', key: 'early', met: true, fraction: 0.5 }])).toBeCloseTo(0.85);
    expect(bar(46, [{ transitionId: 'early', key: 'early', met: true, fraction: 1 }])).toBeCloseTo(1);
    // without the accessor (a follower, or the host before IP1 merges) a met rule's bar is full
    expect(bar(46, null)).toBe(1);
    // it only grows: value 0 → threshold → hold 0 → hold 1
    const seq = [bar(40, [{ transitionId: 'early', key: 'early', met: false, fraction: 0 }]), bar(44, [{ transitionId: 'early', key: 'early', met: false, fraction: 0 }]),
      bar(45.1, [{ transitionId: 'early', key: 'early', met: true, fraction: 0 }]), bar(45.1, [{ transitionId: 'early', key: 'early', met: true, fraction: 0.6 }]), bar(46, [{ transitionId: 'early', key: 'early', met: true, fraction: 1 }])];
    expect(seq.every((x, i) => i === 0 || x >= (seq[i - 1] as number))).toBe(true);
  });

  it('fired: the A row that moved the case moves to Finished, faint amber, with its time', () => {
    const b = classify(src(MH, 'earlySigns', { history: TO_TREATING.slice(0, 6) }));
    expect(b.finished.filter((r) => r.look === 'fired').map((r) => [r.row.title, r.at, r.right])).toEqual([['Early signs: EtCO₂ rising at unchanged ventilation, heart rate rising', 80, '01:20']]);
  });

  it('an event rule (answer 5): an A row "when a shock is given (from the Defib sheet)", its bar empty until it fires', () => {
    const b = classify(src(HAEM, 'vf', { history: [{ t: 0, stateId: 'bleeding' }, { t: 300, stateId: 'vf', transitionId: 'x' }] }));
    expect(b.list.map((r) => [r.row.kind, r.look, r.progress])).toEqual([['judged', 'ready', null], ['auto', 'pending', 0]]);
    expect(b.list[1]?.subtitle).toBe('when a shock is given (from the Defib sheet)');
  });

  it('haemorrhage PEA: 1 step, the judged objective, 1 A row; the mixed junctional step of the ventilated stage is a step', () => {
    expect(looks(classify(src(HAEM, 'pea')).list)).toEqual([[1, 'current'], [2, 'ready'], ['A', 'pending']]);
    const v = classify(src(HAEM, 'ventilated')).list[0] as LiveRow;
    expect([v.row.kind, v.look]).toEqual(['step', 'current']);
    expect(v.subtitle).toContain('or by itself when');
  });
});

describe('rows.ts: firstT reads the record as the debrief does, else the states of the history', () => {
  it('rows, values and lists; undone rows do not count', () => {
    const rec = record(MH, [{ t: 10, ev: 'drug:dantrolene', undone: 1 }, { t: 20, ev: 'drug:dantrolene' }, { t: 30, ev: 'alarm:apnoea-co2' }], [{ t: 5, k: 5.0 }, { t: 6, k: 5.7 }]);
    const s = { record: rec, history: [] };
    expect(firstT(s, 'drug:dantrolene')).toBe(20);
    expect(firstT(s, 'alarm:apnoea')).toBe(30);
    expect(firstT(s, 'value:k>5.5')).toBe(6);
    expect(firstT(s, ['alarm:apnoea', 'drug:dantrolene'])).toBe(20);
    expect(firstT(s, 'start')).toBe(0);
    expect(firstT({ record: null, history: [{ t: 7, stateId: 'pea' }] }, 'state:pea')).toBe(7);
    expect(firstT({ record: null, history: [] }, 'drug:dantrolene')).toBeNull();
  });
});
