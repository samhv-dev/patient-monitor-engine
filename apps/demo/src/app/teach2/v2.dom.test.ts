// @vitest-environment happy-dom
// Plan F6: Instructor v2 reads a pme-scenario/2 card (the MH card in phases, F8). The strip lists the PHASES (entry times
// from the scenario history; a future phase does not jump: no goto, Q5); the cue box names the phase, "entered by its own
// rule", the learners' cue and the phase's Say line; ACTION lists the open actions (the current phase's) and the judged
// row once its clock has started, numbered, and the A rows are the rules out of the phase with their 60-s hold's bar (vitalHolds, leaf 'hold'); an A
// press sends the action's `give` as ONE staged batch, each command stamped with the action's id, and moves nothing.
import { describe, expect, it } from 'vitest';
import { ScenarioView, type AnyScenarioDoc, type CommandInput } from '@pme/controller';
import type { Administration, PhaseEntry, PhaseHold, RuleEdge } from '@pme/controller/scenario';
import type { Link } from '../link.ts';
import { anyShowcaseDoc } from '../showcase/harness.ts';
import { mount as mountAction } from './action.ts';
import { mount as mountCue } from './cue.ts';
import { mount as mountStrip } from './strip.ts';
import type { Teach2Ctx } from './ctx.ts';
import { drugWords } from '../glossary.ts';

const MH2 = anyShowcaseDoc('showcase-mh-v2') as AnyScenarioDoc;

/** The phase runner's grade inputs (F3) for a rig: its timeline, administration record and rule edges. */
interface Run { phases?: PhaseEntry[]; admin?: Administration[]; edges?: RuleEdge[] }

function rig(o: { holds?: PhaseHold[]; takings?: Record<string, number>; simT?: number; run?: Run } = {}) {
  const sv = new ScenarioView();
  sv.doc = MH2;
  sv.docVersion = 1;
  sv.stateId = 'latent';
  sv.enteredT = 377;
  sv.history = [{ t: 0, stateId: 'baseline' }, { t: 377, stateId: 'latent', transitionId: 'enter:latent' }];
  const sent: CommandInput[][] = [];
  const single: CommandInput[] = [];
  const digits = new Map<number, (() => void) | null>();
  const simT = o.simT ?? 400;
  const phaseRunner = {
    takings: o.takings ?? {}, vitalHolds: () => o.holds ?? [],
    phases: o.run?.phases ?? [{ id: 'baseline', t: 0, rule: 'start' }, { id: 'latent', t: 377, rule: 'enter:latent' }], admin: o.run?.admin ?? [], edges: o.run?.edges ?? [],
  };
  const link = {
    ctl: { scenario: sv, bookmarks: [], simT, state: { values: { etco2: 44 } }, hostPaused: false },
    host: { driver: { vitalHolds: () => o.holds ?? [], phaseRunner, stageMarks: () => [] }, record: { data: null } },
    simT, log: [],
    send: async (c: CommandInput) => (single.push(c), { accepted: true, tick: 0, commandId: 'c', rttMs: 0 }),
    sendBatch: async (cs: CommandInput[]) => (sent.push(cs), cs.map(() => ({ accepted: true, tick: 0, commandId: 'c', rttMs: 0 }))),
    note: () => undefined,
  } as unknown as Link;
  const ctx = { link, keys: { digit: (n: number, fn: (() => void) | null) => digits.set(n, fn), letter: () => undefined, escape: () => () => undefined }, dock: {}, openSheet: () => undefined, site: {}, weightKg: () => 80 } as unknown as Teach2Ctx;
  return { sv, link, ctx, sent, single, digits };
}

describe('Instructor v2 reads a pme-scenario/2 card (F6)', () => {
  it('the strip: the phases, the current one with its entry time; a future phase is "auto" and its click sends no goto', () => {
    const { ctx, single } = rig();
    const el = document.createElement('nav');
    document.body.append(el);
    mountStrip(el, ctx).refresh();
    const names = [...el.querySelectorAll('.ip2-chip .ip2-chip-name')].map((x) => x.textContent);
    expect(names.slice(0, 3)).toEqual(['Baseline', 'Latent', 'Early signs']);
    expect(el.querySelector('.ip2-current .ip2-chip-t')?.textContent).toMatch(/^06:17/);
    const future = el.querySelector('.ip2-future') as HTMLButtonElement | null;
    expect(future?.querySelector('.ip2-auto')?.textContent).toBe('auto');
    future?.click();
    expect(single).toEqual([]);
    el.remove();
  });

  it('the cue box: the phase, "entered by its own rule", the learners\' cue and the Say line', () => {
    const { ctx } = rig();
    const el = document.createElement('div');
    mountCue(el, ctx).refresh();
    expect(el.querySelector('.ip2-cue-name')?.textContent).toBe('Latent');
    expect(el.textContent).toContain('entered by its own rule');
    expect(el.textContent).toContain('Learners see: the monitor looks normal');
    expect(el.textContent).toContain('masseter rigidity');
  });

  it('ACTION: the phase\'s actions, numbered (the judged row not before its clock starts); the A rows are the rules out of the phase, with the hold\'s bar', () => {
    const hold: PhaseHold = { transitionId: 'enter:earlySigns', key: 'phase:earlySigns:hold', leaf: 'hold', variable: 'earlySigns', op: '>=', threshold: 60, value: 30, met: true, heldS: 30, forS: 60, fraction: 0.5 };
    const { ctx } = rig({ holds: [hold], takings: { intubate: 1 } });
    const el = document.createElement('div');
    mountAction(el, ctx).refresh();
    const rows = [...el.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-row')] as HTMLElement[];
    const titles = rows.map((r) => r.querySelector('.ip2-row-title')?.textContent);
    expect(titles).toContain('MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate');
    expect(titles).toContain('Start surgery: rocuronium 0.6 mg/kg');
    expect(titles.some((t) => /^Name malignant hyperthermia/.test(t ?? ''))).toBe(false); // offered from Early signs (below)
    expect(titles).not.toContain('Premedicate: midazolam 2 mg, fentanyl 100 µg'); // a Baseline action
    const intubate = rows.find((r) => r.querySelector('.ip2-row-title')?.textContent?.startsWith('Intubate'));
    expect(intubate?.dataset.look).toBe('taken');
    const autos = rows.filter((r) => r.dataset.kind === 'auto');
    expect(autos.map((r) => r.querySelector('.ip2-row-title')?.textContent)).toEqual(['Early signs', 'Treated', 'Arrest']);
    expect((autos[0]?.querySelector('.ip2-bar-fill') as HTMLElement).style.width).toBe('50%');
    expect(autos[0]?.querySelector('.ip2-row-right')?.textContent).toBe('held 0:30 of 1:00');
    expect(autos[0]?.querySelector('.ip2-row-sub')?.textContent).toContain('EtCO₂ climbing, HR up');
  });

  it('an A press sends the action\'s give as one batch, every command stamped with the action\'s id; digits press the numbered rows', async () => {
    const { ctx, sent, digits } = rig();
    const el = document.createElement('div');
    mountAction(el, ctx).refresh();
    const btn = [...el.querySelectorAll('button.ip2-row')].find((b) => b.querySelector('.ip2-row-title')?.textContent?.startsWith('MH crisis')) as HTMLButtonElement;
    btn.click();
    await Promise.resolve();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.map((c) => (c as { actionId?: string }).actionId)).toEqual(['callCrisis', 'callCrisis', 'callCrisis']);
    expect(sent[0]!.map((c) => (c as { event?: { kind: string } }).event?.kind)).toEqual(['vaporiser', 'infusion', 'ventilation']);
    expect(sent[0]!.every((c) => !('$comment' in c))).toBe(true);
    const n = Number(btn.querySelector('.ip2-key')?.textContent);
    digits.get(n)?.();
    await Promise.resolve();
    expect(sent).toHaveLength(2);
  });
});

// ---- the live grade on the rows (F11's finding: classifyV2 counted presses and never called grade()) ----
/** The call pressed at 08:12 (its three records, stamped with its id), its anchor (EtCO₂ > 45 held 20 s) true at 07:50. */
const CALL: Administration[] = [
  { seq: 1, t: 492, source: 'action', actionId: 'callCrisis', kind: 'vaporiser', settings: { dialPct: 0, fgfLpm: 10 }, result: { accepted: true } },
  { seq: 2, t: 492, source: 'action', actionId: 'callCrisis', kind: 'infusion', drugId: 'propofol', rate: 100, rateUnit: 'mcg/kg/min', route: 'iv', result: { accepted: true } },
  { seq: 3, t: 492, source: 'action', actionId: 'callCrisis', kind: 'ventilation', settings: { rr: 20, vtMl: 600, peep: 5, fio2: 1 }, result: { accepted: true } },
];
const ANCHOR: RuleEdge[] = [{ rule: 'action:callCrisis:anchor', t: 470, value: true }];
const DANT_1: Administration = { seq: 4, t: 520, source: 'action', actionId: 'dantrolene', kind: 'drug', drugId: 'dantrolene', dose: 1, unit: 'mg/kg', perKg: 1, route: 'iv', result: { accepted: true } };

/** The live rows by title start: look, grade, the right label, the subtitle, the overdue ring. */
function graded(o: Parameters<typeof rig>[0]) {
  const { ctx } = rig(o);
  const el = document.createElement('div');
  mountAction(el, ctx).refresh();
  const rows = [...el.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-row')] as HTMLElement[];
  return (start: string) => {
    const r = rows.find((x) => x.querySelector('.ip2-row-title')?.textContent?.startsWith(start)) as HTMLElement;
    return { look: r.dataset.look, grade: r.dataset.grade, right: r.querySelector('.ip2-row-right')?.textContent, sub: r.querySelector('.ip2-row-sub')?.textContent ?? '', overdue: r.dataset.overdue === 'true' };
  };
}

describe('Instructor v2 grades the /2 rows live (grade(), final: false; design §6, §10)', () => {
  it('met, due and not applicable: the call met at 08:12; dantrolene due within 5 min of it; calcium not applicable, its line under the prescription', () => {
    const row = graded({ simT: 600, takings: { callCrisis: 1 }, run: { admin: CALL, edges: ANCHOR } });
    expect(row('MH crisis')).toMatchObject({ grade: 'met', right: 'met 08:12', look: 'taken' });
    expect(row('Dantrolene 2.5')).toMatchObject({ grade: 'due', right: 'due 3:12', look: 'current', overdue: false });
    const ca = row('Potassium: calcium');
    expect(ca).toMatchObject({ grade: 'not applicable', right: 'not applicable' });
    expect(ca.sub).toContain('anchor never happened: k > 5.5 never held');
    expect(ca.look).not.toBe('current');
  });

  it('overdue: dantrolene not given 5 min after the call reads "overdue m:ss" with the ring, still pressable', () => {
    const row = graded({ simT: 900, takings: { callCrisis: 1 }, run: { admin: CALL, edges: ANCHOR } });
    expect(row('Dantrolene 2.5')).toMatchObject({ grade: 'overdue', right: 'overdue 1:48', overdue: true });
  });

  it('deviation: dantrolene 1 mg/kg reads "deviation: <the criterion>" on the given look, the line under the prescription', () => {
    const row = graded({ simT: 600, takings: { callCrisis: 1, dantrolene: 1 }, run: { admin: [...CALL, DANT_1], edges: ANCHOR } });
    const d = row('Dantrolene 2.5');
    expect(d).toMatchObject({ grade: 'deviation', right: 'deviation: dose 1 mg/kg, 2.5 asked', look: 'taken' });
    expect(d.sub).toContain('dose 1 mg/kg, 2.5 asked');
  });

  it('an action the card does not grade keeps its press count; a follower reads "graded on the host"', () => {
    const row = graded({ simT: 600, takings: { intubate: 1 } });
    expect(row('Intubate')).toMatchObject({ look: 'taken', right: 'given' });
    expect(row('Intubate').grade).toBeUndefined();
  });
});

// F11 found hyperventilate and the propofol infusion reading "press to give" after the call's press, although grade()
// counts that press's ventilator and infusion records for them: the given look came from the row's own press count.
describe('Instructor v2: a /2 row\'s given look follows the graded administration, not the press count', () => {
  it('the call\'s press gives hyperventilate and the propofol infusion: both rows read given (green), with their grade', () => {
    // the three share the call's anchor rule; the runner logs it under each action's name
    const edges: RuleEdge[] = ['callCrisis', 'hyperventilate', 'propofolInfusion'].map((id) => ({ rule: `action:${id}:anchor`, t: 470, value: true }));
    const row = graded({ simT: 600, takings: { callCrisis: 1 }, run: { admin: CALL, edges } });
    for (const t of ['Hyperventilate', 'Propofol infusion']) {
      expect(row(t).look, t).toBe('taken');
      expect(row(t).right, t).toBe('met 08:12');
    }
  });

  it('dantrolene pressed once, its repeat now due: the row reads due again (blue), not given', () => {
    const DANT: Administration = { ...DANT_1, dose: 2.5, perKg: 2.5, t: 500 };
    const edges: RuleEdge[] = [...ANCHOR, { rule: 'action:dantrolene:repeatWhile', t: 600, value: true }];
    const row = graded({ simT: 850, takings: { callCrisis: 1, dantrolene: 1 }, run: { admin: [...CALL, DANT], edges } });
    expect(row('Dantrolene 2.5')).toMatchObject({ grade: 'due', right: 'due 4:10', look: 'current' });
  });
});

// F11's fit (teach2-fit.e2e.ts): at Latent the MH card opens 11 actions and ACTION scrolled at 1440 × 900. The rows not
// due now — a graded action not applicable and not given, an action the card does not grade given in an earlier phase —
// sit in a "Not due now" fold of ACTION: still rows, numbered, pressable and on their digits; never a due, overdue or
// given graded action, never the judged row.
describe('Instructor v2: a /2 phase\'s rows not due now are folded, still rows of ACTION', () => {
  it('Latent after the induction: intubate and start surgery (setup, given in Baseline) and the K⁺ rows (not applicable) fold; the call and the A rows stay', () => {
    const setup: Administration[] = [
      { seq: 1, t: 300, source: 'action', actionId: 'intubate', kind: 'airway', result: { accepted: true } },
      { seq: 2, t: 360, source: 'action', actionId: 'startSurgery', kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', perKg: 0.6, route: 'iv', result: { accepted: true } },
    ];
    const { ctx, digits } = rig({ simT: 400, takings: { intubate: 1, startSurgery: 1 }, run: { admin: setup, edges: ANCHOR } });
    const el = document.createElement('div');
    mountAction(el, ctx).refresh();
    const title = (r: Element) => r.querySelector('.ip2-row-title')?.textContent ?? '';
    const folded = [...el.querySelectorAll('.ip2-later-list .ip2-row')].map(title);
    const shown = [...el.querySelectorAll('.ip2-rows:not(.ip2-later-list):not(.ip2-finished-list) .ip2-row')].map(title);
    expect(folded.some((t) => t.startsWith('Intubate'))).toBe(true);
    expect(folded.some((t) => t.startsWith('Start surgery'))).toBe(true);
    expect(folded.some((t) => t.startsWith('Potassium: calcium'))).toBe(true);
    expect(shown.some((t) => t.startsWith('MH crisis'))).toBe(true); // due: never folded
    expect(shown.some((t) => /^Name malignant hyperthermia/.test(t))).toBe(false); // the judged row: not before Early signs
    expect(shown.filter((t) => ['Early signs', 'Treated', 'Arrest'].includes(t))).toHaveLength(3);
    const fold = el.querySelector('details.ip2-later') as HTMLDetailsElement;
    expect(fold.hidden).toBe(false);
    expect(fold.open).toBe(false);
    expect(fold.querySelector('summary')?.textContent).toBe(`Not due now · ${folded.length}`);
    // every action of the phase is a row, none disabled; a folded row keeps its digit
    const steps = [...el.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-row[data-kind="step"]')];
    expect(steps).toHaveLength((MH2 as unknown as { actions: Array<{ phases: string[] }> }).actions.filter((a) => a.phases.includes('latent')).length);
    expect(el.querySelectorAll('.ip2-row[disabled]').length).toBe(0);
    const n1 = [...el.querySelectorAll('.ip2-later-list button.ip2-row')].find((r) => title(r).startsWith('Intubate'))?.querySelector('.ip2-key')?.textContent;
    expect(digits.get(Number(n1))).toBeTypeOf('function');
  });
});

// The owner's ruling of 1 November: the judged row "Name malignant hyperthermia from the monitor … (press when met)" was
// in ACTION from Baseline, before any sign existed ("visible from the beginning … makes no sense"). It is offered from
// the moment its Debrief clock starts — its display rule's first true second (`phaseEntered: earlySigns`, grade()'s
// `fromT`) — and stays until met; then it is in Finished. One reading: the clock and the offer are the same edge.
describe('Instructor v2: the /2 judged row is offered from its clock\'s start (the owner\'s ruling of 1 November)', () => {
  const EARLY: PhaseEntry[] = [{ id: 'baseline', t: 0, rule: 'start' }, { id: 'latent', t: 377, exitT: 483, rule: 'enter:latent' }, { id: 'earlySigns', t: 483, rule: 'enter:earlySigns' }];
  const CLOCK: RuleEdge[] = [{ rule: 'judged:nameMh', t: 483, value: true }];
  /** The rig in `phaseId` (entered at `t`), the board read: the open rows' titles and right labels, the finished titles. */
  function board(o: Parameters<typeof rig>[0] & { phaseId?: string; t?: number; history?: Array<{ t: number; stateId: string }>; follower?: boolean; ticked?: boolean }) {
    const r = rig(o);
    if (o.phaseId) (r.sv.stateId = o.phaseId), (r.sv.enteredT = o.t ?? 0);
    if (o.history) r.sv.history = o.history;
    if (o.follower) (r.link as unknown as { host: null }).host = null;
    const text = (MH2 as unknown as { judged: Array<{ text: string }> }).judged[0]!.text;
    if (o.ticked) r.link.log.push({ kind: 'marker', text: `Objective met: ${drugWords(text)}`, simT: 492 });
    const el = document.createElement('div');
    mountAction(el, r.ctx).refresh();
    const title = (x: Element) => x.querySelector('.ip2-row-title')?.textContent ?? '';
    const open = [...el.querySelectorAll('.ip2-rows:not(.ip2-finished-list) .ip2-row')];
    const judged = open.find((x) => /^Name malignant hyperthermia/.test(title(x)));
    return {
      judged: judged ? { right: judged.querySelector('.ip2-row-right')?.textContent, key: judged.querySelector('.ip2-key')?.textContent } : null,
      finished: [...el.querySelectorAll('.ip2-finished-list .ip2-row')].map(title).filter((t) => /^Name malignant hyperthermia/.test(t)),
    };
  }

  it('Baseline and Latent, no sign yet: the judged row is absent (not greyed, not folded), on the host and on a follower', () => {
    expect(board({ phaseId: 'baseline', t: 0, simT: 100, history: [{ t: 0, stateId: 'baseline' }], run: { phases: [{ id: 'baseline', t: 0, rule: 'start' }] } }).judged).toBeNull();
    expect(board({ simT: 470 }).judged).toBeNull();
    expect(board({ simT: 470, follower: true }).judged).toBeNull();
  });

  it('Early signs entered (the clock\'s edge at 08:03): the row is offered, "press when met", numbered after the actions; still there phases later', () => {
    const at = board({ phaseId: 'earlySigns', t: 483, simT: 490, run: { phases: EARLY, edges: CLOCK } });
    expect(at.judged?.right).toBe('press when met');
    expect(Number(at.judged?.key)).toBe((MH2 as unknown as { actions: Array<{ phases: string[] }> }).actions.filter((a) => a.phases.includes('earlySigns')).length + 1);
    const later: PhaseEntry[] = [...EARLY.slice(0, 2), { id: 'earlySigns', t: 483, exitT: 600, rule: 'enter:earlySigns' }, { id: 'established', t: 600, rule: 'enter:established' }];
    expect(board({ phaseId: 'established', t: 600, simT: 640, run: { phases: later, edges: CLOCK } }).judged?.right).toBe('press when met');
  });

  it('a follower (no grades) reads the clock\'s phase from the history: offered in Early signs and after it', () => {
    const h = [{ t: 0, stateId: 'baseline' }, { t: 377, stateId: 'latent' }, { t: 483, stateId: 'earlySigns' }];
    expect(board({ phaseId: 'earlySigns', t: 483, simT: 490, history: h, follower: true }).judged?.right).toBe('press when met');
    expect(board({ phaseId: 'established', t: 600, simT: 640, history: [...h, { t: 600, stateId: 'established' }], follower: true }).judged?.right).toBe('press when met');
    // a return to a bookmark in Latent drops the Early signs entry after it: not offered again until it is re-entered
    expect(board({ simT: 420, history: [...h, { t: 400, stateId: 'latent' }], follower: true }).judged).toBeNull();
  });

  it('after the tick: in Finished, no longer an open row', () => {
    const r = board({ phaseId: 'earlySigns', t: 483, simT: 500, run: { phases: EARLY, edges: CLOCK }, ticked: true });
    expect(r.judged).toBeNull();
    expect(r.finished).toHaveLength(1);
  });
});
