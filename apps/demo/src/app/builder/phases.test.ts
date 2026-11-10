// The phase editor's model (scenario builder B3, docs/plans/scenario-builder.md §5.3): the editor offers only what the
// validator accepts (every variable, operator, leaf kind and signal it offers makes a card the validator takes, with no
// warning); the tree's edits keep the rule one the schema accepts and change only the node they name (an edit undone is
// the card's own text again); the course's warnings; a phase rename follows every mention and undoes byte for byte; the
// words beside a rule are Instructor v2's own. The findings about `phaseRuleWords` are written down as tests.
import { describe, expect, it } from 'vitest';
import { RHYTHM_IDS } from '@pme/engine-core';
import { validateScenario, type ScenarioDocV2 } from '@pme/controller/scenario';
import { phaseRuleWords } from '../card-read.ts';
import mhCard from '../showcase/showcase-mh-v2.json';
import haemCard from '../showcase/showcase-haemorrhage-v2.json';
import { docOf, formOf } from './form.ts';
import {
  CONC_VARS, courseWarnings, draftLeaf, editsAt, flowOf, idFromLabel, idProblem, instructorWords, LEAF_KINDS, leafComplete, mentionsOf, nodeAt, numProblem,
  NUM, OPS, rawNames, renamePhase, RULE_VARS, SLOPE_OPS, tree, TRUTH_VARS, varChoice,
} from './phases.ts';

type Rec = Record<string, unknown>;
const MH = mhCard as unknown as ScenarioDocV2;
const fresh = (): Rec => JSON.parse(JSON.stringify(MH)) as Rec;
const phasesOf = (d: Rec) => d.phases as Rec[];
const EARLY = MH.phases.findIndex((p) => p.id === 'earlySigns');
/** The card is one the validator takes, with no warning (the rhythm list the engine draws given). */
const clean = (d: Rec) => {
  const r = validateScenario(d, { rhythms: RHYTHM_IDS });
  return { ok: r.ok, errors: r.ok ? [] : r.errors, warnings: r.warnings };
};
const withRule = (enter: Rec): Rec => {
  const d = fresh();
  phasesOf(d)[EARLY]!.enter = enter;
  return d;
};

describe('the lists the editor offers are the format\'s own, and each makes a card the validator takes', () => {
  it('the variables are the schema\'s truthVar enum, each once, with words and the engine\'s unit', () => {
    expect(RULE_VARS.map((x) => x.v).sort()).toEqual([...TRUTH_VARS].sort());
    expect(new Set(RULE_VARS.map((x) => x.v)).size).toBe(RULE_VARS.length);
    for (const x of RULE_VARS) expect(x.words && x.unit, x.v).toBeTruthy();
    expect(varChoice('fio2').unit).toBe('fraction, 0.21–1'); // the engine compares a fraction, not the monitor's %
  });

  it('the concentrations are the drugs with a compartment (DC1), plasma and effect site, in the row\'s unit', () => {
    expect(CONC_VARS.length).toBeGreaterThan(10);
    expect(varChoice('cp:propofol')).toMatchObject({ words: 'Plasma propofol', unit: 'µg/mL' });
    expect(varChoice('ce:remifentanil')).toMatchObject({ words: 'Effect-site remifentanil', unit: 'ng/mL' });
    // the effect-curve rows have no concentration to read: not offered (the validator would refuse them)
    for (const id of ['midazolam', 'ketamine', 'dexmedetomidine']) expect(CONC_VARS.some((x) => x.v === `cp:${id}`), id).toBe(false);
  });

  it('every variable, in a value, a slope and an unchanged leaf, is accepted', () => {
    for (const { v } of [...RULE_VARS, ...CONC_VARS]) {
      for (const leaf of [{ value: { var: v, op: '>', value: 1 } }, { slope: { var: v, op: '<', perMin: -1, overS: 60 } }, { unchanged: { var: v, withinPct: 5, since: 'phaseStart' } }]) {
        expect(clean(withRule(leaf)), `${v} ${Object.keys(leaf)[0]}`).toEqual({ ok: true, errors: [], warnings: [] });
      }
    }
  });

  it('every operator of the value and the slope leaf, every signal and every phase a visited leaf may name, is accepted', () => {
    for (const [op] of OPS) expect(clean(withRule({ value: { var: 'hr', op, value: 100 } })).ok, op).toBe(true);
    for (const [op] of SLOPE_OPS) expect(clean(withRule({ slope: { var: 'hr', op, perMin: 1, overS: 60 } })).ok, op).toBe(true);
    for (const s of ['pulseLoss', 'rosc', ...RHYTHM_IDS.map((id) => `rhythm:${id}`)]) expect(clean(withRule({ signal: s })), s).toEqual({ ok: true, errors: [], warnings: [] });
    for (const p of MH.phases) expect(clean(withRule({ visited: p.id })).ok, p.id).toBe(true);
  });

  it('a new leaf of each kind is incomplete until its numbers are typed, and then accepted', () => {
    for (const [kind] of LEAF_KINDS) {
      const leaf = draftLeaf(kind, 'latent');
      const inner = leaf[kind] as Rec | string;
      if (kind === 'value') expect(leafComplete(leaf)).toBe(false), ((inner as Rec).value = 45);
      if (kind === 'slope') expect(leafComplete(leaf)).toBe(false), Object.assign(inner as Rec, { perMin: 0.2, overS: 120 });
      if (kind === 'unchanged') expect(leafComplete(leaf)).toBe(false), ((inner as Rec).withinPct = 5);
      expect(leafComplete(leaf), kind).toBe(true);
      expect(clean(withRule(leaf)).ok, kind).toBe(true);
    }
  });

  it('a number the schema refuses is named, never written (overS 0, withinPct 0, a negative hold)', () => {
    expect(numProblem(NUM['slope/overS']!, 0)).toBe('more than 0');
    expect(numProblem(NUM['unchanged/withinPct']!, 0)).toBe('more than 0');
    expect(numProblem(NUM.holdS!, -1)).toBe('at least 0');
    expect(numProblem(NUM.holdS!, undefined)).toBeNull(); // optional: emptied, the field is left out
    expect(numProblem(NUM['value/value']!, undefined)).toBe('a number is needed');
    expect(numProblem(NUM['value/value']!, -3.5)).toBeNull();
  });
});

describe('the tree\'s edits', () => {
  const early = () => {
    const d = fresh();
    return { d, p: phasesOf(d)[EARLY]! };
  };

  it('what each node allows: no removal of the root or of a group\'s last child; ungroup only a one-child group or a NOT', () => {
    const { p } = early();
    expect(editsAt(p.enter, '')).toEqual({ remove: false, ungroup: false });
    expect(editsAt(p.enter, '/all/0')).toEqual({ remove: true, ungroup: false });
    expect(tree.remove(p, '')).toBe(false);
    expect(tree.ungroup(p, '')).toBe(false);
  });

  it('an edit undone is the card\'s own text again: wrap and ungroup, ALL → ANY → ALL, NOT and its removal', () => {
    const text = JSON.stringify(MH);
    const { d, p } = early();
    expect(tree.wrap(p, '/all/1', 'all')).toBe(true);
    expect(nodeAt(p.enter, '/all/1')).toEqual({ all: [(MH.phases[EARLY]!.enter as { all: unknown[] }).all[1]] });
    expect(clean(d).ok).toBe(true);
    expect(tree.ungroup(p, '/all/1')).toBe(true);
    expect(JSON.stringify(d)).toBe(text);
    expect(tree.setGroup(p, '', 'any')).toBe(true);
    expect(Object.keys(p.enter as Rec)).toEqual(['any']);
    expect(clean(d).ok).toBe(true);
    tree.setGroup(p, '', 'all');
    expect(JSON.stringify(d)).toBe(text);
    tree.wrap(p, '/all/3', 'not');
    expect(clean(d).ok).toBe(true);
    expect(phaseRuleWords(p.enter as never, d as never)).toBe('EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and not (HR rising)');
    tree.ungroup(p, '/all/3');
    expect(JSON.stringify(d)).toBe(text);
  });

  it('add: a complete leaf only; into a group it is appended, at a leaf the two become an ALL in its place', () => {
    const { d, p } = early();
    expect(tree.add(p, '', draftLeaf('value', ''))).toBe(false); // no threshold yet
    expect(tree.add(p, '', { value: { var: 'cp:propofol', op: '>', value: 4 } })).toBe(true);
    expect((nodeAt(p.enter, '') as { all: unknown[] }).all).toHaveLength(5);
    expect(clean(d).ok).toBe(true);
    const lat = phasesOf(d)[MH.phases.findIndex((x) => x.id === 'treated')]!; // a one-leaf rule
    expect(tree.add(lat, '', { signal: 'rosc' })).toBe(true);
    expect(lat.enter).toEqual({ all: [MH.phases.find((x) => x.id === 'treated')!.enter, { signal: 'rosc' }] });
    expect(clean(d).ok).toBe(true);
  });

  it('any sequence of the edits the editor offers keeps the card one the validator takes (400 seeded steps)', () => {
    const { d, p } = early();
    let seed = 7;
    const rnd = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) % n);
    const paths = (r: unknown, at = ''): string[] => {
      const n = r as Rec;
      const k = Object.keys(n)[0]!;
      return [at, ...(k === 'all' || k === 'any' ? (n[k] as unknown[]).flatMap((c, j) => paths(c, `${at}/${k}/${j}`)) : k === 'not' ? paths(n.not, `${at}/not`) : [])];
    };
    const leaves = [{ value: { var: 'etco2', op: '>', value: 45 } }, { signal: 'pulseLoss' }, { visited: 'latent' }, { unchanged: { var: 'hr', withinPct: 5, overS: 60 } }];
    for (let s = 0; s < 400; s++) {
      const ps = paths(p.enter);
      const at = ps[rnd(ps.length)]!;
      const e = editsAt(p.enter, at);
      const op = rnd(6);
      if (op === 0 && e.remove) tree.remove(p, at);
      else if (op === 1) tree.wrap(p, at, (['all', 'any', 'not'] as const)[rnd(3)]!);
      else if (op === 2 && e.ungroup) tree.ungroup(p, at);
      else if (op === 3) tree.setGroup(p, at, rnd(2) ? 'all' : 'any');
      else if (op === 4 && ps.length < 30) tree.add(p, at, JSON.parse(JSON.stringify(leaves[rnd(leaves.length)])) as Rec);
      expect(clean(d), `step ${s}: ${JSON.stringify(p.enter)}`).toMatchObject({ ok: true });
    }
  });
});

describe('the course', () => {
  it('the MH card: where Early signs sits; no phase it cannot reach', () => {
    const f = formOf(MH).fields as Rec;
    expect(flowOf(f, EARLY)).toEqual({ from: [1], to: ['established', 'treated', 'arrest'] });
    expect(courseWarnings(f)).toEqual([]);
    expect(courseWarnings(formOf(haemCard).fields as Rec)).toEqual([]);
  });

  it('a phase no phase leads to, and one the start cannot reach, are the builder\'s warnings on that phase', () => {
    const d = fresh();
    for (const p of phasesOf(d)) if (Array.isArray(p.next)) p.next = (p.next as string[]).filter((x) => x !== 'recovering');
    const rec = MH.phases.findIndex((p) => p.id === 'recovering');
    expect(courseWarnings(d)).toEqual([`/phases/${rec}: no phase leads to Recovering: the case never enters it`]);
    const e = fresh();
    phasesOf(e)[0]!.next = ['latent']; // baseline no longer leads to arrest, but arrest leads to rosc and rosc back
    expect(courseWarnings(e)).toEqual([]);
    phasesOf(e)[1]!.next = ['earlySigns'];
    phasesOf(e)[EARLY]!.next = ['established'];
    phasesOf(e)[3]!.next = ['established'];
    const lost = ['treated', 'recovering', 'recrudescence', 'arrest', 'rosc'].map((id) => MH.phases.findIndex((p) => p.id === id));
    expect(courseWarnings(e)).toEqual(lost.map((i) => `/phases/${i}: ${MH.phases[i]!.label} cannot be reached from the starting phase, Baseline`));
  });
});

describe('a phase id: its mentions and its rename', () => {
  it('every mention outside the next lists is found (rules, actions, contraindications, windows, script, debrief)', () => {
    const f = formOf(MH).fields as Rec;
    const m = mentionsOf(f, 'earlySigns');
    expect(m.length).toBeGreaterThan(0);
    expect(m.every((x) => !/^\/phases\/\d+\/next\//.test(x))).toBe(true);
    for (const path of m) {
      const v = path.split('/').slice(1).reduce<unknown>((o, k) => (o as Rec)[k], f);
      expect(v === 'earlySigns' || v === 'phase:earlySigns', path).toBe(true);
    }
  });

  it('a rename follows every mention, the card stays valid, and renaming back is the card\'s own text', () => {
    const text = JSON.stringify(MH);
    const d = fresh();
    const before = mentionsOf(d, 'treated');
    expect(renamePhase(d, MH.phases.findIndex((p) => p.id === 'treated'), 'onDantrolene')).toBe(true);
    expect(clean(d)).toMatchObject({ ok: true, errors: [] });
    expect(mentionsOf(d, 'treated')).toEqual([]);
    expect(mentionsOf(d, 'onDantrolene')).toEqual(before);
    expect(JSON.stringify(d)).not.toContain('"treated"');
    renamePhase(d, MH.phases.findIndex((p) => p.id === 'treated'), 'treated');
    expect(JSON.stringify(d)).toBe(text);
  });

  it('a rename the validator would refuse is not made: a taken id, a malformed one', () => {
    const d = fresh();
    expect(idProblem(d, EARLY, 'latent')).toBe('another phase has this id');
    expect(idProblem(d, EARLY, '2nd')).toMatch(/^an id starts with a letter/);
    expect(renamePhase(d, EARLY, 'latent')).toBe(false);
    expect(JSON.stringify(d)).toBe(JSON.stringify(MH));
    expect(idFromLabel(d, 'Late signs')).toBe('lateSigns');
    expect(idFromLabel(d, 'Latent')).toBe('latent2');
    expect(idFromLabel(d, '2 min')).toBe('phase2Min');
  });
});

describe('Instructor v2\'s words beside the rule', () => {
  it('Early signs reads as ACTION and the cue box read it (the plan\'s §5.3 sentence)', () => {
    expect(instructorWords(MH, EARLY)).toEqual({
      row: { title: 'Early signs', subtitle: 'EtCO₂ climbing, HR up · when EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and HR rising, held 20 s' },
      cue: 'entered by its own rule (EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and HR rising, held 20 s)',
      rule: 'EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and HR rising',
    });
    expect(instructorWords(MH, 0)).toEqual({ row: null, cue: 'the case starts here', rule: null });
    const d = docOf(formOf(withRule({ value: { var: 'cp:propofol', op: '>', value: 4 } })));
    expect(instructorWords(d, EARLY).rule).toBe('plasma propofol > 4 µg/mL');
  });

  it('finding: phaseRuleWords prints these truth variables by their format name, and a rhythm by its id', () => {
    const named = TRUTH_VARS.filter((v) => rawNames({ value: { var: v, op: '>', value: 1 } }, MH, phaseRuleWords({ value: { var: v, op: '>', value: 1 } } as never, MH)).length);
    expect(named).toEqual(['dbp', 'cvp', 'papSys', 'papDia', 'pawp', 'pi', 'rr', 'vt', 'fio2', 'shunt', 'contractility', 'svr', 'qtc', 'volumeStatus', 'paceThresholdMa']);
    const r = { signal: 'rhythm:vfCoarse' };
    expect(phaseRuleWords(r as never, MH)).toBe('rhythm vfCoarse');
    expect(rawNames(r, MH, 'rhythm vfCoarse')).toEqual(['vfCoarse']);
    // and a slope's or an unchanged leaf's numbers are not in its words: "EtCO₂ rising" for > 0.2 /min over 120 s
    expect(phaseRuleWords({ slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 120 } } as never)).toBe('EtCO₂ rising');
  });
});
