// The action editor's model (piece B4): every list it offers is its source's, proved against the validator; an amount
// the editor writes is one the schema accepts (a seeded property run against validateScenario); a rename follows every
// mention and back gives the card's own text; "How it grades" is grade()'s own output on the MH card; the builder's
// warnings on the MH card; and the findings about grade() and Instructor v2's words, pinned so a change to them shows here.
import { LEARNER_LAB_PANELS } from '@pme/controller';
import { SCENARIO_SCHEMA_V2, validateScenario, type ScenarioDocV2 } from '@pme/controller/scenario';
import { DRUGS } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { actionWords } from '../card-read.ts';
import { doseUnits, DRUG_LIST, rateUnits } from '../drugs.ts';
import mhCard from '../showcase/showcase-mh-v2.json';
import {
  actionIdFromLabel, actionMentions, actionWarnings, amountProblem, BLOCKS, blockMissing, CLASSES, DEVICE_KINDS, draftBlock, DRUG_CHOICES, gradeExamples, instructorRow,
  KIND_INFO, KINDS, PANELS, renameAction, ROUTE_WORDS, ROUTES, routeState, setKind, SETTINGS, unitsFor,
} from './actions.ts';

type Rec = Record<string, unknown>;
const MH = mhCard as unknown as ScenarioDocV2;
const copy = (): Rec => JSON.parse(JSON.stringify(MH)) as Rec;
const DEFS = (SCENARIO_SCHEMA_V2 as { definitions: Record<string, Rec> }).definitions;
const acts = (d: Rec) => d.actions as Rec[];
const at = (d: Rec, id: string) => acts(d).find((a) => a.id === id)!;
/** The MH card with one more action, `a`. */
const withAction = (a: Rec): Rec => {
  const d = copy();
  acts(d).push(a);
  return d;
};
const base = { id: 'probe', label: 'Probe', phases: ['latent'] };

describe('the lists are the schema\'s and the engine\'s', () => {
  it('the kinds are the schema\'s, and each kind owns exactly the block the validator asks for', () => {
    expect(KINDS).toEqual((DEFS.action as { properties: { kind: { enum: string[] } } }).properties.kind.enum);
    expect(Object.keys(KIND_INFO).sort()).toEqual([...KINDS].sort());
    for (const k of KINDS) {
      const a: Rec = { ...base, kind: k };
      const b = draftBlock(k);
      if (b) {
        expect(validateScenario(withAction(a)).ok, `${k} without its block`).toBe(false);
        // a block made complete as the add form makes it
        if (k === 'drug') b.id = 'dantrolene';
        if (k === 'device' || k === 'decision') b.settings = { rr: { value: 12 } };
        if (k === 'decision') b.kind = 'ventilation';
        if (k === 'fluid') b.type = ['saline'];
        if (k === 'physical') b.measure = 'cooling';
        expect(blockMissing(k, b)).toBeNull();
      }
      setKind(a, k, b);
      const v = validateScenario(withAction(a));
      expect(v.ok ? [] : v.errors, k).toEqual([]);
      // any other block on this kind is refused
      for (const other of BLOCKS.filter((x) => x !== KIND_INFO[k]!.block && !(x === 'sample' && k === 'sample'))) {
        expect(validateScenario(withAction({ ...a, [other]: other === 'effect' ? [{ kind: 'cpr', settings: { rate: { value: 110 } } }] : other === 'sample' ? { panel: ['abg'] } : other === 'drug' ? { id: 'dantrolene' } : other === 'device' ? { kind: 'cpr', settings: { rate: { value: 110 } } } : other === 'fluid' ? { type: ['saline'] } : { measure: 'cooling' } })).ok, `${k} with ${other}`).toBe(false);
      }
    }
  });

  it('the routes are the schema\'s; each route\'s state for each drug is the validator\'s warning, exactly', () => {
    expect(ROUTES).toEqual((DEFS.route as { enum: string[] }).enum);
    expect(Object.keys(ROUTE_WORDS)).toEqual([...ROUTES]);
    for (const d of DRUG_CHOICES) {
      const v = validateScenario(withAction({ ...base, kind: 'drug', drug: { id: d.id, route: { set: [...ROUTES] } } }));
      expect(v.ok, d.id).toBe(true);
      const warned = new Set(v.warnings.filter((w) => w.includes(`: ${d.id}: route `)).map((w) => /route (\w+) is judged/.exec(w)![1]));
      for (const r of ROUTES) expect(routeState(d.id, r) === 'not modelled', `${d.id} ${r}`).toBe(warned.has(r));
    }
    // dantrolene IM: a route model with no systemic absorption (F = 0), the mock-up's "modelled: no systemic effect"
    expect(routeState('dantrolene', 'im')).toBe('local');
    expect(routeState('dantrolene', 'iv')).toBe('modelled');
    expect(routeState('dantrolene', 'inh')).toBe('not modelled');
  });

  it('the drugs are the engine\'s rows the Drug sheet lists, less the vaporiser agents; every one, and every class, is accepted', () => {
    const want = Object.values(DRUGS).filter((r) => r.cls !== 'placeholder' && r.cls !== 'volatile').map((r) => r.id).sort();
    expect(DRUG_CHOICES.map((d) => d.id).sort()).toEqual(want);
    expect(CLASSES.map((c) => c.cls).sort()).toEqual([...new Set(Object.values(DRUGS).map((r) => r.cls as string))].sort());
    for (const c of CLASSES) expect(validateScenario(withAction({ ...base, kind: 'drug', drug: { cls: c.cls } })).ok, c.cls).toBe(true);
    // the units are the Drug sheet's own lists
    for (const d of DRUG_LIST) {
      expect(unitsFor(d.id, false)).toEqual(doseUnits(d));
      expect(unitsFor(d.id, true)).toEqual(rateUnits(d));
    }
  });

  it('the device kinds are the schema\'s; every setting the builder offers is accepted on its device; the panels are the engine\'s', () => {
    expect(DEVICE_KINDS).toEqual((DEFS.deviceKind as { enum: string[] }).enum);
    expect(Object.keys(SETTINGS).sort()).toEqual([...DEVICE_KINDS].sort());
    for (const k of DEVICE_KINDS) for (const s of SETTINGS[k]!) {
      const v = validateScenario(withAction({ ...base, kind: 'device', device: { kind: k, settings: { [s.k]: s.word ? s.word[0] : { min: 1, max: 2 } } } }));
      expect(v.ok, `${k}.${s.k}`).toBe(true);
    }
    expect(PANELS).toEqual([...LEARNER_LAB_PANELS]);
  });
});

describe('an amount the editor writes is one the schema accepts', () => {
  it('a seeded run of 400 random doses and amounts: amountProblem says null exactly when the validator accepts', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const pick = () => (rnd() < 0.35 ? undefined : [-1, 0, 0.5, 2, 3, 10][Math.floor(rnd() * 6)]);
    for (let n = 0; n < 400; n++) {
      const a: Rec = {};
      for (const k of ['value', 'tolerance', 'min', 'max']) {
        const x = pick();
        if (x !== undefined) a[k] = x;
      }
      const dose = { ...a, unit: 'mg/kg' };
      const vd = validateScenario(withAction({ ...base, kind: 'drug', drug: { id: 'dantrolene', dose } }));
      expect(amountProblem(dose, 'dose') === null, JSON.stringify(dose)).toBe(vd.ok);
      const va = validateScenario(withAction({ ...base, kind: 'device', device: { kind: 'cpr', settings: { rate: a } } }));
      expect(amountProblem(a, 'amount') === null, JSON.stringify(a)).toBe(va.ok);
      const cum = { ...(a.min !== undefined ? { min: a.min } : {}), ...(a.max !== undefined ? { max: a.max } : {}), unit: 'mg/kg' };
      const vc = validateScenario(withAction({ ...base, kind: 'drug', drug: { id: 'dantrolene', cumulative: cum } }));
      expect(amountProblem(cum, 'cumulative') === null, JSON.stringify(cum)).toBe(vc.ok);
    }
  });
});

describe('an action id', () => {
  it('a rename follows every mention (a window\'s action anchor), and back gives the card\'s own text', () => {
    const d = copy();
    expect(actionMentions(d, 'callCrisis')).toEqual(['/actions/8/window/anchor']);
    const i = acts(d).findIndex((a) => a.id === 'callCrisis');
    expect(renameAction(d, i, 'dantrolene')).toBe(false); // taken
    expect(renameAction(d, i, 'callMh')).toBe(true);
    expect((at(d, 'dantrolene').window as Rec).anchor).toBe('action:callMh');
    expect(renameAction(d, i, 'callCrisis')).toBe(true);
    expect(JSON.stringify(d)).toBe(JSON.stringify(MH));
    // each:action and a script's action:<id>#n follow too
    const e = copy();
    (e.script as Rec[]).push({ id: 'x', on: 'action:cpr#2', commands: [{ type: 'setMode', mode: 'modeled' }] });
    at(e, 'nameMh').window = { anchor: 'each:action:cpr', withinS: 10 };
    renameAction(e, acts(e).findIndex((a) => a.id === 'cpr'), 'compressions');
    expect((e.script as Rec[]).at(-1)!.on).toBe('action:compressions#2');
    expect((at(e, 'nameMh').window as Rec).anchor).toBe('each:action:compressions');
    const ve = validateScenario(e);
    expect(ve.ok ? [] : ve.errors).toEqual([]);
    expect(actionIdFromLabel(d, 'Dantrolene')).toBe('dantrolene2');
  });
});

describe('Instructor v2\'s row and grade()\'s examples on the MH card', () => {
  const i = MH.actions.findIndex((a) => a.id === 'dantrolene');
  it('the row is phaseRowsOf\'s, whose subtitle is actionWords\'', () => {
    const r = instructorRow(MH, i);
    expect(r).toEqual({ title: 'Dantrolene 2.5 mg/kg', subtitle: actionWords(MH.actions[i]!), phase: 'latent' });
    expect((r as { subtitle: string }).subtitle).toBe('2–3 mg/kg · IV/CENTRAL · within 5 min of the "callCrisis" action · again every 5–10 min while after recrudescence');
  });

  it('dantrolene: met as prescribed, a deviation under the dose and by central, the row left open with a violation by IM, overdue late, failed if never', () => {
    const g = gradeExamples(MH, i);
    expect(g.due).toBe('due 5:00');
    expect(g.examples.map((e) => [e.give, e.grade, e.live, e.lines, e.violations])).toEqual([
      ['As the press gives it', 'met', 'met 02:30', [], []],
      ['Dantrolene 2.5 mg/kg IV', 'met', 'met 02:30', [], []],
      ['Dantrolene 0.8 mg/kg IV (under the accepted dose)', 'deviation', 'deviation: dose 0.8 mg/kg, 2.5 asked', ['dose 0.8 mg/kg, 2.5 asked'], []],
      ['The same dose central line (allowed, not preferred)', 'deviation', 'deviation: route central, iv preferred', ['route central, iv preferred'], []],
      ['The same dose IM (outside the route set)', 'due', 'due 3:59', ['route im not allowed'], ['Dantrolene IM: no effect on the MH, and the solution (pH about 9.5) injures the tissue (harm not modelled)']],
      ['Dantrolene 2.5 mg/kg IV, after the window closed', 'overdue', 'overdue 0:30', [], []],
      ['Nothing, by the end of the run', 'failed', 'failed', [], []],
    ]);
  });

  it('a setup action has no examples: grade() leaves it out', () => {
    expect(gradeExamples(MH, MH.actions.findIndex((a) => a.id === 'induce'))).toMatchObject({ examples: [], due: null });
  });

  it('the builder\'s warnings on the MH card: its calcium press is IV while the card prefers central', () => {
    expect(actionWarnings(MH, copy())).toEqual(['/actions/11/give: the press as written is graded deviation by grade(), not met: route iv, central preferred']);
    // a range no dose satisfies, and an action open in no reachable phase
    const d = copy();
    ((at(d, 'dantrolene').drug as Rec).dose as Rec).min = 4;
    acts(d).push({ ...base, id: 'lost', kind: 'communication', phases: ['nowhere'] });
    (d.phases as Rec[]).push({ id: 'nowhere', label: 'Nowhere', enter: { signal: 'rosc' } });
    expect(actionWarnings(d as unknown as ScenarioDocV2, d)).toEqual(expect.arrayContaining([
      '/actions/8/drug/dose: no dose can satisfy 4–3: the lowest is above the highest',
      `/actions/${acts(d).length - 1}/phases: open in no phase the case can reach from its start: its row is never offered`,
    ]));
  });
});

describe('findings, reported (grade() and Instructor v2 unchanged)', () => {
  it('grade() writes the value as what is "asked" for a dose that has both a value and a range, though it grades the range', () => {
    // dantrolene 2.5 mg/kg (2–3 accepted): 0.8 is "2.5 asked"; 2.2 (inside 2–3) is met
    const ex = gradeExamples(MH, MH.actions.findIndex((a) => a.id === 'dantrolene')).examples[2]!;
    expect(ex.lines).toEqual(['dose 0.8 mg/kg, 2.5 asked']);
  });

  it('Instructor v2\'s row words throw on a display anchor with a phaseEntered leaf (the builder shows the error, never a row)', () => {
    const d = copy();
    at(d, 'nameMh').window = { anchor: { display: { phaseEntered: 'earlySigns' } }, withinS: 120 };
    expect(validateScenario(d).ok).toBe(true);
    const doc = d as unknown as ScenarioDocV2;
    expect(() => actionWords(doc.actions.find((a) => a.id === 'nameMh')!)).toThrow();
    expect(instructorRow(doc, doc.actions.findIndex((a) => a.id === 'nameMh'))).toHaveProperty('error');
  });
});
