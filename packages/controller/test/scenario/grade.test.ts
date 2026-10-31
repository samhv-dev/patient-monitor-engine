// Plan F3: grade() on SYNTHETIC documents, administration records and rule edges (no engine, no runner). One row per
// catalogue item the orchestrator's F3 spec names: identity, dose, route, a refused dose, infusion rate, each anchor kind,
// before the anchor, precondition, conditional repeat (Q13), cumulative ceiling, contraindication, device settings, a
// decision on its effect, not applicable, live against final, and the owner's IM-dantrolene example.
import { describe, expect, it } from 'vitest';
import { grade, type ActionGrade } from '../../src/scenario/grade.ts';
import type { Action, Administration, PhaseEntry, RuleEdge, ScenarioDocV2 } from '../../src/scenario/types-v2.ts';

/** A card of two phases (`base` initial, `early`) for an 80-kg patient, with these actions (id `x` unless given). */
const card = (actions: Array<Partial<Action>>, extra: Partial<ScenarioDocV2> = {}): ScenarioDocV2 => ({
  schema: 'pme-scenario/2', id: 'syn', title: 'Synthetic', patient: { weightKg: 80 },
  phases: [{ id: 'base', label: 'Base', initial: true, next: ['early'] }, { id: 'early', label: 'Early' }],
  actions: actions.map((a) => ({ id: 'x', label: 'X', kind: 'drug', phases: ['early'], ...a }) as Action),
  ...extra,
});
/** The timeline: `base` from 0, `early` from 100. */
const PH: PhaseEntry[] = [{ id: 'base', t: 0, exitT: 100, rule: 'initial' }, { id: 'early', t: 100, rule: 'enter:early' }];
let seq = 0;
const adm = (t: number, x: Partial<Administration>): Administration => ({ seq: ++seq, t, source: 'action', kind: 'drug', result: { accepted: true }, ...x });
const dan = (t: number, x: Partial<Administration> = {}) => adm(t, { drugId: 'dantrolene', dose: 2.5, unit: 'mg/kg', perKg: 2.5, route: 'iv', ...x });
const vent = (t: number, settings: Record<string, number>) => adm(t, { kind: 'ventilation', settings });
const on = (rule: string, t: number, off?: number): RuleEdge[] => [{ rule, t, value: true }, ...(off !== undefined ? [{ rule, t: off, value: false }] : [])];

/** Dantrolene 2.5 mg/kg (2–3), iv or central (iv preferred), within 300 s of the `early` entry. */
const DAN: Partial<Action> = {
  drug: { id: 'dantrolene', dose: { value: 2.5, min: 2, max: 3, unit: 'mg/kg' }, cumulative: { max: 10, unit: 'mg/kg' }, route: { set: ['iv', 'central'], preferred: 'iv' } },
  window: { anchor: 'phase:early', withinS: 300 },
};
const K = { value: { var: 'k' as const, op: '>' as const, value: 5.5 } };

interface Case {
  name: string;
  actions: Array<Partial<Action>>;
  admin: Administration[];
  edges?: RuleEdge[];
  t?: number;
  final?: boolean;
  /** The graded action (`x` unless given). */
  id?: string;
  want: Partial<Pick<ActionGrade, 'grade' | 'givenT' | 'dueT' | 'live'>> & { lines?: string[]; noLines?: string[] };
}

const CASES: Case[] = [
  // identity
  { name: 'identity: the drug id', actions: [DAN], admin: [dan(150)], want: { grade: 'met', givenT: 150, live: 'met 02:30' } },
  { name: 'identity: another drug does not satisfy', actions: [DAN], admin: [dan(150, { drugId: 'propofol' })], t: 200, want: { grade: 'due', live: 'due 3:20' } },
  { name: 'identity: an alternative with its own dose', actions: [{ drug: { alternatives: [{ id: 'calciumChloride', dose: { value: 10, unit: 'mg/kg' } }, { id: 'calciumGluconate', dose: { value: 30, unit: 'mg/kg' } }] }, window: { anchor: 'phase:early', withinS: 300 } }],
    admin: [adm(120, { drugId: 'calciumGluconate', dose: 30, unit: 'mg/kg', perKg: 30, route: 'iv' })], want: { grade: 'met' } },
  { name: 'identity: an alternative at the other\'s dose is a deviation', actions: [{ drug: { alternatives: [{ id: 'calciumChloride', dose: { value: 10, unit: 'mg/kg' } }, { id: 'calciumGluconate', dose: { value: 30, unit: 'mg/kg' } }] }, window: { anchor: 'phase:early', withinS: 300 } }],
    admin: [adm(120, { drugId: 'calciumGluconate', dose: 10, unit: 'mg/kg', perKg: 10, route: 'iv' })], want: { grade: 'deviation', lines: ['dose 10 mg/kg, 30 asked'] } },
  { name: 'identity: a class', actions: [{ drug: { cls: 'alpha1' }, window: { anchor: 'phase:early', withinS: 60 } }], admin: [adm(130, { drugId: 'phenylephrine', cls: 'alpha1', dose: 100, unit: 'mcg', route: 'iv' })], want: { grade: 'met' } },
  { name: 'identity: a card-set dose never counts', actions: [DAN], admin: [dan(150, { source: 'script', cardSet: true })], t: 200, want: { grade: 'due' } },
  // dose
  { name: 'dose: within the range', actions: [DAN], admin: [dan(150, { dose: 2.9, perKg: 2.9 })], want: { grade: 'met' } },
  { name: 'dose: outside the range', actions: [DAN], admin: [dan(150, { dose: 1, perKg: 1 })], want: { grade: 'deviation', lines: ['dose 1 mg/kg, 2.5 asked'], live: 'deviation: dose 1 mg/kg, 2.5 asked' } },
  { name: 'dose: value ± tolerance, inside', actions: [{ drug: { id: 'propofol', dose: { value: 2, tolerance: 0.5, unit: 'mg/kg' } }, window: { anchor: 'phase:early', withinS: 60 } }], admin: [adm(110, { drugId: 'propofol', dose: 2.4, unit: 'mg/kg', perKg: 2.4, route: 'iv' })], want: { grade: 'met' } },
  { name: 'dose: value ± tolerance, outside', actions: [{ drug: { id: 'propofol', dose: { value: 2, tolerance: 0.5, unit: 'mg/kg' } }, window: { anchor: 'phase:early', withinS: 60 } }], admin: [adm(110, { drugId: 'propofol', dose: 2.6, unit: 'mg/kg', perKg: 2.6, route: 'iv' })], want: { grade: 'deviation', lines: ['dose 2.6 mg/kg, 2 asked'] } },
  { name: 'dose: mg converted to mg/kg with the weight', actions: [DAN], admin: [dan(150, { dose: 200, unit: 'mg', perKg: 2.5 })], want: { grade: 'met' } },
  { name: 'dose: mg converted, too little', actions: [DAN], admin: [dan(150, { dose: 80, unit: 'mg', perKg: 1 })], want: { grade: 'deviation', lines: ['dose 1 mg/kg, 2.5 asked'] } },
  // route
  { name: 'route: allowed, not preferred', actions: [DAN], admin: [dan(150, { route: 'central' })], want: { grade: 'deviation', lines: ['route central, iv preferred'] } },
  { name: 'route: outside the set leaves the action open', actions: [DAN], admin: [dan(150, { route: 'io' })], t: 200, want: { grade: 'due', lines: ['route io not allowed'] } },
  // refused
  { name: 'a refused dose does not satisfy; its reason is a line', actions: [DAN], admin: [dan(150, { result: { accepted: false, reason: 'dose out of range', routeNotModelled: false } })], t: 200, want: { grade: 'due', lines: ['refused: dose out of range'] } },
  // infusion rate
  { name: 'infusion: rate in range', actions: [{ drug: { id: 'propofol', rate: { infusion: { min: 100, max: 150, unit: 'mcg/kg/min' } } }, window: { anchor: 'phase:early', withinS: 120 } }], admin: [adm(150, { kind: 'infusion', drugId: 'propofol', rate: 120, rateUnit: 'mcg/kg/min' })], want: { grade: 'met' } },
  { name: 'infusion: rate out of range', actions: [{ drug: { id: 'propofol', rate: { infusion: { min: 100, max: 150, unit: 'mcg/kg/min' } } }, window: { anchor: 'phase:early', withinS: 120 } }], admin: [adm(150, { kind: 'infusion', drugId: 'propofol', rate: 50, rateUnit: 'mcg/kg/min' })], want: { grade: 'deviation', lines: ['rate 50 mcg/kg/min, 100–150 asked'] } },
  // anchors
  { name: 'anchor start', actions: [{ ...DAN, window: { anchor: 'start', withinS: 60 } }], admin: [dan(90)], want: { grade: 'overdue', dueT: 0, live: 'overdue 0:30' } },
  { name: 'anchor phase:<id>: in the window', actions: [DAN], admin: [dan(399)], want: { grade: 'met', dueT: 100 } },
  { name: 'anchor phase:<id>: after the window', actions: [DAN], admin: [dan(460)], want: { grade: 'overdue', live: 'overdue 1:00' } },
  { name: 'anchor action:<id>', actions: [{ id: 'call', kind: 'decision', effect: [{ kind: 'vaporiser', settings: { dialPct: { max: 0 } } }] }, { ...DAN, window: { anchor: 'action:call', withinS: 300 } }],
    admin: [adm(200, { kind: 'vaporiser', settings: { dialPct: 0, fgfLpm: 10 } }), dan(450)], want: { grade: 'met', dueT: 200 } },
  { name: 'anchor pulseLoss', actions: [{ kind: 'device', device: { kind: 'cpr', settings: { rate: { min: 100, max: 120 } } }, window: { anchor: 'pulseLoss', withinS: 30 } }],
    edges: on('pulseLoss', 300), admin: [adm(340, { kind: 'cpr', settings: { rate: 110 } })], want: { grade: 'overdue', dueT: 300 } },
  { name: 'anchor rosc', actions: [{ ...DAN, window: { anchor: 'rosc', withinS: 60 } }], edges: on('rosc', 500), admin: [dan(530)], want: { grade: 'met', dueT: 500 } },
  { name: 'anchor { rule }: a value crossing', actions: [{ drug: { id: 'calciumChloride' }, window: { anchor: { rule: K }, withinS: 300 } }],
    edges: on('action:x:anchor', 600), admin: [adm(700, { drugId: 'calciumChloride', dose: 10, unit: 'mg/kg', route: 'iv' })], want: { grade: 'met', dueT: 600 } },
  { name: 'given before the window opened: met, with the line', actions: [{ drug: { id: 'calciumChloride' }, window: { anchor: { rule: K }, withinS: 300 } }],
    edges: on('action:x:anchor', 600), admin: [adm(500, { drugId: 'calciumChloride', dose: 10, unit: 'mg/kg', route: 'iv' })], want: { grade: 'met', lines: ['given before the window opened'] } },
  { name: 'a late, wrongly sized dose is overdue with the deviation under it', actions: [DAN], admin: [dan(460, { dose: 1, perKg: 1 })], want: { grade: 'overdue', lines: ['dose 1 mg/kg, 2.5 asked'] } },
  // not applicable, live against final
  { name: 'anchor never happened: not applicable with the reason', actions: [{ drug: { id: 'calciumChloride' }, window: { anchor: { rule: K }, withinS: 300 } }], admin: [], final: true,
    want: { grade: 'not applicable', lines: ['anchor never happened: k > 5.5 never held'], live: 'not applicable' } },
  { name: 'live: due with the time left', actions: [DAN], admin: [], t: 160, want: { grade: 'due', live: 'due 4:00' } },
  { name: 'live: overdue since the deadline', actions: [DAN], admin: [], t: 430, want: { grade: 'overdue', live: 'overdue 0:30' } },
  { name: 'final: failed', actions: [DAN], admin: [], t: 430, final: true, want: { grade: 'failed', live: 'failed' } },
  // precondition without a window
  { name: 'precondition: given while it held → met', actions: [{ kind: 'device', device: { kind: 'ventilation', settings: { rr: { value: 12 } } }, precondition: K }],
    edges: on('action:x:precondition', 300), admin: [vent(320, { rr: 12 })], want: { grade: 'met' } },
  { name: 'precondition: given while it did not hold → deviation', actions: [{ kind: 'device', device: { kind: 'ventilation', settings: { rr: { value: 12 } } }, precondition: K }],
    edges: on('action:x:precondition', 300), admin: [vent(200, { rr: 12 })], want: { grade: 'deviation', lines: ['given before: k > 5.5'] } },
  { name: 'precondition: held, none given → failed (final)', actions: [{ kind: 'device', device: { kind: 'ventilation', settings: { rr: { value: 12 } } }, precondition: K }],
    edges: on('action:x:precondition', 300), admin: [], final: true, want: { grade: 'failed' } },
  { name: 'precondition: never held → not applicable', actions: [{ kind: 'device', device: { kind: 'ventilation', settings: { rr: { value: 12 } } }, precondition: K }],
    admin: [vent(200, { rr: 12 })], final: true, want: { grade: 'not applicable' } },
  { name: 'precondition with a window, never held → not applicable', actions: [{ ...DAN, precondition: K }], admin: [], final: true, want: { grade: 'not applicable' } },
  // neither window nor precondition
  { name: 'neither: given → met', actions: [{ drug: { id: 'sodiumBicarbonate' } }], admin: [adm(150, { drugId: 'sodiumBicarbonate', dose: 1, unit: 'mmol/kg', route: 'iv' })], final: true, want: { grade: 'met' } },
  { name: 'neither: none given, its phase occurred → failed', actions: [{ drug: { id: 'sodiumBicarbonate' } }], admin: [], final: true, want: { grade: 'failed' } },
  { name: 'neither: none given, its phase never occurred → not applicable', actions: [{ drug: { id: 'sodiumBicarbonate' }, phases: ['late'] }], admin: [], final: true, want: { grade: 'not applicable' } },
  // device settings and a decision on its effect
  { name: 'device: settings in range', actions: [{ kind: 'device', device: { kind: 'ventilation', settings: { rr: { value: 20 }, fio2: { value: 1 } } }, window: { anchor: 'phase:early', withinS: 120 } }],
    admin: [vent(150, { rr: 20, vtMl: 600, fio2: 1 })], want: { grade: 'met' } },
  { name: 'device: a setting off', actions: [{ kind: 'device', device: { kind: 'ventilation', settings: { rr: { value: 20 } } }, window: { anchor: 'phase:early', withinS: 120 } }],
    admin: [vent(150, { rr: 16 })], want: { grade: 'deviation', lines: ['rr 16, 20 asked'] } },
  { name: 'device: the first in-range setting is the one graded (the intubation\'s 12 × 500 before it is not)', actions: [{ kind: 'device', device: { kind: 'ventilation', settings: { rr: { value: 20 } } }, window: { anchor: 'phase:early', withinS: 120 } }],
    admin: [vent(50, { rr: 12 }), vent(150, { rr: 20 })], want: { grade: 'met', givenT: 150 } },
  { name: 'decision: vaporiser 0 % and FGF ≥ 10 however set', actions: [{ kind: 'decision', effect: [{ kind: 'vaporiser', settings: { dialPct: { max: 0 }, fgfLpm: { min: 10 } } }], window: { anchor: 'phase:early', withinS: 120 } }],
    admin: [adm(150, { kind: 'vaporiser', source: 'panel', settings: { dialPct: 0, fgfLpm: 12 } })], want: { grade: 'met' } },
  { name: 'decision: FGF too low', actions: [{ kind: 'decision', effect: [{ kind: 'vaporiser', settings: { dialPct: { max: 0 }, fgfLpm: { min: 10 } } }], window: { anchor: 'phase:early', withinS: 120 } }],
    admin: [adm(150, { kind: 'vaporiser', settings: { dialPct: 0, fgfLpm: 2 } })], want: { grade: 'deviation', lines: ['fgfLpm 2, ≥ 10 asked'] } },
  // cumulative ceiling
  { name: 'cumulative: past the ceiling is a deviation line', actions: [DAN], admin: [dan(150, { dose: 3, perKg: 3 }), dan(200, { dose: 3, perKg: 3 }), dan(250, { dose: 3, perKg: 3 }), dan(300, { dose: 3, perKg: 3 })],
    want: { grade: 'deviation', lines: ['cumulative 12 mg/kg, ≤ 10 asked'] } },
  // the owner's example: IM dantrolene
  { name: 'IM dantrolene: the action stays open (live overdue), the route lines printed', actions: [DAN],
    admin: [dan(150, { route: 'im', result: { accepted: false, reason: 'dantrolene: route im is not modelled', routeNotModelled: true } })], t: 500,
    want: { grade: 'overdue', lines: ['route im not allowed', 'route not modelled'] } },
  { name: 'IM dantrolene: failed at the end', actions: [DAN], admin: [dan(150, { route: 'im', result: { accepted: false, reason: 'dantrolene: route im is not modelled', routeNotModelled: true } })], t: 500, final: true,
    want: { grade: 'failed' } },
];

describe('grade(): one action per case', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const g = grade(card(c.actions), PH, c.admin, c.edges ?? [], c.t ?? 1000, { final: c.final ?? false });
      const a = g.actions.find((x) => x.id === (c.id ?? 'x')) as ActionGrade;
      expect(a, JSON.stringify(g.actions)).toBeDefined();
      const { lines, noLines, ...rest } = c.want;
      expect(a).toMatchObject(rest);
      for (const l of lines ?? []) expect(a.lines, JSON.stringify(a)).toContain(l);
      for (const l of noLines ?? []) expect(a.lines).not.toContain(l);
    });
  }
});

describe('grade(): repeats, violations, outcomes, judged rows', () => {
  /** Dantrolene with Q13's conditional repeat: again 300–600 s after, from when the condition holds. */
  const REP: Partial<Action> = { ...DAN, repeatWhile: { rule: K, intervalS: { min: 300, max: 600 } } };
  const rw = (t: number, off?: number) => on('action:x:repeatWhile', t, off);
  const gradeOf = (admin: Administration[], edges: RuleEdge[], t: number, final = false) =>
    grade(card([REP]), PH, admin, edges, t, { final }).actions[0] as ActionGrade;

  it('repeatWhile: due from the later of (first + min) and the condition; in time → met', () => {
    const a = gradeOf([dan(150), dan(1000)], rw(800), 1200, true);
    expect(a.grade).toBe('met');
    expect(a.repeats).toMatchObject([{ n: 2, grade: 'met', dueT: 800, t: 1000 }]);
  });
  it('repeatWhile: condition already true at the first dose → due at first + min', () => {
    const a = gradeOf([dan(150), dan(500)], rw(140), 1200, true);
    expect(a.repeats).toMatchObject([{ n: 2, grade: 'met', dueT: 450, t: 500 }]);
  });
  it('repeatWhile: later than due + (max − min) → overdue, and the action takes the worst', () => {
    const a = gradeOf([dan(150), dan(1150)], rw(800), 1200, true);
    expect(a.repeats[0]?.grade).toBe('overdue');
    expect(a.grade).toBe('overdue');
  });
  it('repeatWhile: given before due → met with the line', () => {
    const a = gradeOf([dan(150), dan(300)], rw(800), 1200, true);
    expect(a.repeats[0]).toMatchObject({ grade: 'met', lines: ['given before due'] });
  });
  it('repeatWhile: none given → live due/overdue, final failed; the condition never true after the first → no row', () => {
    expect(gradeOf([dan(150)], rw(800), 900).repeats[0]?.grade).toBe('due');
    expect(gradeOf([dan(150)], rw(800), 1200).repeats[0]?.grade).toBe('overdue');
    expect(gradeOf([dan(150)], rw(800), 900, true).repeats[0]?.grade).toBe('failed');
    expect(gradeOf([dan(150)], rw(800), 900, true).grade).toBe('failed');
    expect(gradeOf([dan(150)], rw(50, 100), 1200, true).repeats).toEqual([]);
    expect(gradeOf([dan(150)], [], 1200, true)).toMatchObject({ grade: 'met', repeats: [] });
  });

  it('a contraindication matched is a violation (refused or not), never a grade; harm "not modelled" when the card says so', () => {
    const doc = card([{ ...DAN, contraindications: [{ text: 'Dantrolene IM', match: { drugId: 'dantrolene', route: ['im'] }, harm: 'notModelled' }] }]);
    const im = dan(150, { route: 'im', result: { accepted: false, reason: 'dantrolene: route im is not modelled', routeNotModelled: true } });
    const g = grade(doc, PH, [im, dan(160)], [], 1000, { final: true });
    expect(g.violations).toEqual([{ t: 150, seq: im.seq, action: 'x', text: 'Dantrolene IM', harm: 'not modelled' }]);
    expect(g.actions[0]?.grade).toBe('met');
  });
  it('a contraindication with `when` (its rule\'s edge at the dose) and `inPhases`', () => {
    const doc = card([{ id: 'epi', drug: { id: 'epinephrine' }, contraindications: [{ text: 'epi 1 mg in ROSC', match: { drugId: 'epinephrine', dose: { min: 1, unit: 'mg' } }, inPhases: ['early'], when: K }] }]);
    const epi = (t: number, dose = 1) => adm(t, { drugId: 'epinephrine', dose, unit: 'mg', route: 'iv' });
    const edges = on('action:epi:contraindication:0', 300, 400);
    const g = grade(doc, PH, [epi(50), epi(350), epi(360, 0.1), epi(450)], edges, 1000, { final: true });
    expect(g.violations.map((v) => [v.t, v.harm])).toEqual([[350, 'modelled']]);
  });

  it('graded: false actions are left out of the grades', () => {
    const g = grade(card([{ ...DAN, graded: false }]), PH, [], [], 1000, { final: true });
    expect(g.actions).toEqual([]);
  });

  it('outcomes: reached when the rule is true in [anchor, anchor + withinS]; pending live, not reached final', () => {
    const doc = card([DAN], { outcomes: [{ id: 'low', text: 'EtCO₂ below 40', rule: K, anchor: 'action:x', withinS: 600 }] });
    expect(grade(doc, PH, [dan(150)], on('outcome:low', 500), 1000).outcomes).toEqual([{ id: 'low', text: 'EtCO₂ below 40', grade: 'reached', t: 500 }]);
    expect(grade(doc, PH, [dan(150)], on('outcome:low', 900), 1000).outcomes[0]?.grade).toBe('not reached');
    expect(grade(doc, PH, [dan(150)], [], 400).outcomes[0]?.grade).toBe('pending');
    expect(grade(doc, PH, [dan(150)], [], 400, { final: true }).outcomes[0]?.grade).toBe('not reached');
  });

  it('judged rows: the clock from the first true edge of their display rule', () => {
    const doc = card([DAN], { judged: [{ id: 'name', text: 'Name MH', kind: 'recognition', display: { value: { var: 'etco2', op: '>', value: 45 } } }] });
    expect(grade(doc, PH, [], on('judged:name', 222), 1000).judged).toEqual([{ id: 'name', text: 'Name MH', kind: 'recognition', fromT: 222 }]);
  });
});
