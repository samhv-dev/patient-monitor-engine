// The path → field map (scenario builder B1, docs/plans/scenario-builder.md §5.1): every path the validator can report
// lands on a field of the form, or on the heading of its block when no field matches. Proven three ways: on every path of
// every node of every library card (an ajv error's path is one of them, or its parent's); on every cross-check of
// validateV2, each elicited from a real card by one change and read from the validator's own output; and on every rule
// leaf the schema lists (the rule map reads no leaf name, so a leaf the format adds needs no change here).
import { routeHonoured } from '@pme/engine-core';
import { SCENARIO_SCHEMA_V2, validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../scenarios.ts';
import { fieldOf, type FieldRef } from './fields.ts';
import { DOC_KEYS } from './form.ts';

type Doc = Record<string, any>; // a card under test, mutated freely
const card = (id: string): Doc => JSON.parse(JSON.stringify(LIBRARY.find((c) => c.id === id)!.doc)) as Doc;
const MH = 'showcase-mh-v2';
const HAEM = 'showcase-haemorrhage-v2';

describe('fieldOf: the plan\'s example and the block headings', () => {
  it('/phases/2/next/0 is phase 3, its "may be followed by" list, row 1', () => {
    expect(fieldOf('/phases/2/next/0')).toEqual({ section: 'phases', block: 'phases', entry: 2, field: 'next', row: 0, path: '/phases/2/next/0', heading: false });
  });
  it('a path that matches no field shows at its block\'s (or its entry\'s) heading', () => {
    expect(fieldOf('/')).toEqual({ section: 'document', path: '/', heading: true });
    expect(fieldOf('')).toEqual({ section: 'document', path: '/', heading: true });
    expect(fieldOf('/phases')).toMatchObject({ section: 'phases', path: '/phases', heading: true });
    expect(fieldOf('/actions/3')).toMatchObject({ section: 'actions', entry: 3, path: '/actions/3', heading: true });
    expect(fieldOf('/judged')).toMatchObject({ section: 'carried', block: 'judged', path: '/judged', heading: true });
    expect(fieldOf('/states/1/transitions/0/to')).toMatchObject({ section: 'carried', block: 'states', path: '/states', heading: true });
  });
  it('a header field, a list row of it, a block field, the two debrief lists', () => {
    expect(fieldOf('/title')).toEqual({ section: 'header', block: 'title', field: 'title', path: '/title', heading: false });
    expect(fieldOf('/takeHome/2')).toMatchObject({ section: 'header', field: 'takeHome', row: 2, path: '/takeHome/2' });
    expect(fieldOf('/patient/sensors/abp')).toMatchObject({ section: 'patient', block: 'patient', field: 'sensors', part: 'abp', path: '/patient/sensors' });
    expect(fieldOf('/device/model')).toMatchObject({ section: 'patient', block: 'device', field: 'model' });
    expect(fieldOf('/briefing/text')).toMatchObject({ section: 'briefing', field: 'text', path: '/briefing/text' });
    expect(fieldOf('/debriefHints/openers/1/at')).toMatchObject({ section: 'debrief', field: 'openers', row: 1, part: 'at', path: '/debriefHints/openers/1' });
    expect(fieldOf('/debriefHints/handoutQuestions/0/text')).toMatchObject({ section: 'handout', field: 'handoutQuestions', row: 0, part: 'text' });
  });
  it('a rule: its root field, the node a message names, the leaf, the leaf\'s part', () => {
    expect(fieldOf('/phases/1/enter')).toMatchObject({ field: 'enter', rule: { root: '/phases/1/enter', node: '' }, path: '/phases/1/enter' });
    expect(fieldOf('/phases/3/enter/any/1/all/0/value/var')).toMatchObject({
      section: 'phases', entry: 3, field: 'enter', rule: { root: '/phases/3/enter', node: '/any/1/all/0', leaf: 'value' }, part: 'var', path: '/phases/3/enter/any/1/all/0',
    });
    expect(fieldOf('/actions/8/contraindications/0/when/not/visited')).toMatchObject({
      field: 'contraindications', row: 0, rule: { root: '/actions/8/contraindications/0/when', node: '/not', leaf: 'visited' },
    });
    expect(fieldOf('/actions/4/window/anchor/first/1/display/any/0/all/1/value/op')).toMatchObject({
      field: 'window', rule: { root: '/actions/4/window/anchor/first/1/display', node: '/any/0/all/1', leaf: 'value' }, part: 'op',
    });
    expect(fieldOf('/outcomes/0/anchor/rule/signal')).toMatchObject({ section: 'outcomes', field: 'anchor', rule: { root: '/outcomes/0/anchor/rule', node: '', leaf: 'signal' } });
  });
  it('decodes a JSON pointer\'s escapes', () => {
    expect(fieldOf('/patient/a~1b~0c')).toMatchObject({ field: 'a/b~c' });
  });
});

describe('every path of every card lands on a field (an ajv error names one of these paths, or its parent)', () => {
  const pointers = (v: unknown, at = ''): string[] =>
    v !== null && typeof v === 'object'
      ? [at, ...Object.entries(v).flatMap(([k, x]) => pointers(x, `${at}/${k.replace(/~/g, '~0').replace(/\//g, '~1')}`))]
      : [at];
  const isPrefix = (p: string, of: string) => of === p || of.startsWith(`${p}/`);
  for (const c of LIBRARY) {
    it(`${c.id}: each path maps inside itself; below an entry it is never a heading`, () => {
      const all = pointers(c.doc).slice(1);
      expect(all.length).toBeGreaterThan(50);
      for (const p of all) {
        const f: FieldRef = fieldOf(p);
        expect(isPrefix(f.path, p), p).toBe(true);
        const block = p.split('/')[1]!;
        const depth = p.split('/').length - 1;
        if (!DOC_KEYS.includes(block)) expect(f, p).toMatchObject({ section: 'carried', heading: true, path: `/${block}` });
        else if (['phases', 'actions', 'outcomes', 'script'].includes(block)) expect(f.heading, p).toBe(depth <= 2);
        else if (['patient', 'device', 'briefing', 'debriefHints'].includes(block)) expect(f.heading, p).toBe(depth === 1);
        else expect(f.heading, p).toBe(false);
      }
    });
  }
});

describe('the rule map is generic over the schema\'s own leaf list', () => {
  const defs = (SCENARIO_SCHEMA_V2 as { definitions: Record<string, { properties: object }> }).definitions;
  const leaves = (d: string) => Object.keys(defs[d]!.properties).filter((k) => !['all', 'any', 'not'].includes(k));
  it.each([...leaves('phaseRule'), 'aLeafTheFormatAddsLater'])('phase-rule leaf %s', (leaf) => {
    expect(fieldOf(`/phases/2/enter/all/1/not/${leaf}/x`)).toMatchObject({ rule: { root: '/phases/2/enter', node: '/all/1/not', leaf }, part: 'x', path: '/phases/2/enter/all/1/not' });
    expect(fieldOf(`/actions/0/precondition/${leaf}`)).toMatchObject({ rule: { root: '/actions/0/precondition', node: '', leaf } });
  });
  it.each(leaves('displayRule'))('display-rule leaf %s', (leaf) => {
    expect(fieldOf(`/actions/0/window/anchor/display/any/0/${leaf}`)).toMatchObject({ rule: { root: '/actions/0/window/anchor/display', node: '/any/0', leaf } });
  });
  it('the schema lists the leaves the plan names (§5.3)', () => {
    expect(leaves('phaseRule')).toEqual(expect.arrayContaining(['value', 'slope', 'unchanged', 'visited', 'signal']));
    expect(leaves('displayRule')).toEqual(expect.arrayContaining(['value', 'phaseEntered']));
  });
});

describe("every check of validateV2 lands on its field (each elicited from a library card, read from the validator's own line)", () => {
  // a route the engine does not model for propofol: the warning's source
  const unmodelled = ((SCENARIO_SCHEMA_V2 as { definitions: { route: { enum: string[] } } }).definitions.route.enum).find((r) => !routeHonoured('propofol', r as never))!;
  const outcome = (o: Doc) => ({ id: 'o1', text: 'an outcome', rule: { signal: 'rosc' }, anchor: 'start', withinS: 60, ...o });
  const CASES: Array<[string, string, (d: Doc) => void, string, Partial<FieldRef> & Record<string, unknown>]> = [
    ['duplicate phase id', MH, (d) => { d.phases[2].id = 'latent'; }, '/phases/2/id', { section: 'phases', entry: 2, field: 'id' }],
    ['duplicate action id', MH, (d) => { d.actions[3].id = 'induce'; }, '/actions/3/id', { section: 'actions', entry: 3, field: 'id' }],
    ['duplicate outcome id', MH, (d) => { d.outcomes = [outcome({}), outcome({})]; }, '/outcomes/1/id', { section: 'outcomes', entry: 1, field: 'id' }],
    ['duplicate script id', MH, (d) => { d.script.push(d.script[0]); }, '/script/1/id', { section: 'script', entry: 1, field: 'id' }],
    ['a visited leaf names no phase', MH, (d) => { d.phases[1].enter.all[1] = { visited: 'nope' }; }, '/phases/1/enter/all/1/visited', { entry: 1, field: 'enter', rule: { root: '/phases/1/enter', node: '/all/1', leaf: 'visited' } }],
    ['a rhythm signal the engine lacks (warning)', MH, (d) => { d.phases[7].enter = { signal: 'rhythm:zzz' }; }, '/phases/7/enter/signal', { field: 'enter', rule: { root: '/phases/7/enter', node: '', leaf: 'signal' } }],
    ['a second initial phase', MH, (d) => { d.phases[1].initial = true; }, '/phases/1/initial', { entry: 1, field: 'initial' }],
    ['next names no phase', MH, (d) => { d.phases[2].next[0] = 'nope'; }, '/phases/2/next/0', { entry: 2, field: 'next', row: 0 }],
    ['no initial phase', MH, (d) => { delete d.phases[0].initial; d.phases[0].enter = { signal: 'rosc' }; }, '/phases', { section: 'phases', heading: true }],
    ["an action's phase that does not exist", MH, (d) => { d.actions[3].phases[0] = 'nope'; }, '/actions/3/phases/0', { entry: 3, field: 'phases', row: 0 }],
    ['a drug action without its drug block', MH, (d) => { delete d.actions[7].drug; }, '/actions/7', { entry: 7, heading: true }],
    ["another kind's block", MH, (d) => { d.actions[3].device = d.actions[6].device; }, '/actions/3/device', { entry: 3, field: 'device' }],
    ['a drug the engine lacks', MH, (d) => { d.actions[7].drug.id = 'nope'; }, '/actions/7/drug/id', { field: 'drug', part: 'id' }],
    ['a drug class the engine lacks', MH, (d) => { delete d.actions[7].drug.id; d.actions[7].drug.cls = 'nope'; }, '/actions/7/drug/cls', { field: 'drug', part: 'cls' }],
    ['an alternative the engine lacks', MH, (d) => { delete d.actions[7].drug.id; d.actions[7].drug.alternatives = [{ id: 'propofol' }, { id: 'nope' }]; }, '/actions/7/drug/alternatives/1/id', { field: 'drug', part: 'alternatives/1/id' }],
    ['a route the engine does not model (warning)', MH, (d) => { d.actions[7].drug.route = { set: [unmodelled] }; }, '/actions/7/drug/route/set/0', { field: 'drug', part: 'route/set/0' }],
    ['a give command: a rhythm the engine lacks (warning)', MH, (d) => { d.actions[15].give.push({ type: 'setRhythm', rhythm: 'zzz' }); }, `/actions/15/give/RHYTHM/rhythm`, { field: 'give', part: 'rhythm' }],
    ['a give command: a drug event on a drug the engine lacks', MH, (d) => { d.actions[7].give.push({ type: 'applyEvent', event: { kind: 'drug', drugId: 'nope' } }); }, '/actions/7/give/LAST/event/drugId', { field: 'give', part: 'event/drugId' }],
    ['a window anchored on no action', MH, (d) => { d.actions[8].window.anchor = 'action:nope'; }, '/actions/8/window/anchor', { field: 'window', part: 'anchor' }],
    ['a window anchored on a rule visiting no phase', MH, (d) => { d.actions[5].window.anchor = { rule: { visited: 'nope' } }; }, '/actions/5/window/anchor/rule/visited', { field: 'window', rule: { root: '/actions/5/window/anchor/rule', node: '', leaf: 'visited' } }],
    ['a display anchor on a phase with no entry rule', MH, (d) => { d.actions[5].window.anchor = { display: { phaseEntered: 'baseline' } }; }, '/actions/5/window/anchor/display/phaseEntered', { field: 'window', rule: { root: '/actions/5/window/anchor/display', node: '', leaf: 'phaseEntered' } }],
    ['first: a display anchor on no phase', HAEM, (d) => { d.actions[4].window.anchor.first[1] = { display: { phaseEntered: 'nope' } }; }, '/actions/4/window/anchor/first/1/display/phaseEntered', { field: 'window', rule: { root: '/actions/4/window/anchor/first/1/display', node: '', leaf: 'phaseEntered' } }],
    ['first: an anchor on no phase', HAEM, (d) => { d.actions[4].window.anchor.first[0] = 'phase:nope'; }, '/actions/4/window/anchor/first/0', { field: 'window', part: 'anchor/first/0' }],
    ['first: a rule anchor visiting no phase', HAEM, (d) => { d.actions[4].window.anchor.first[0] = { rule: { visited: 'nope' } }; }, '/actions/4/window/anchor/first/0/rule/visited', { field: 'window', rule: { root: '/actions/4/window/anchor/first/0/rule', node: '', leaf: 'visited' } }],
    ['each: an action that does not exist', HAEM, (d) => { d.actions[11].window.anchor = 'each:action:nope'; }, '/actions/11/window/anchor', { field: 'window', part: 'anchor' }],
    ['each: with failAfterS', HAEM, (d) => { d.actions[11].window.failAfterS = 20; }, '/actions/11/window/failAfterS', { field: 'window', part: 'failAfterS' }],
    ['failAfterS not beyond withinS', MH, (d) => { d.actions[15].window.failAfterS = 10; }, '/actions/15/window/failAfterS', { entry: 15, field: 'window', part: 'failAfterS' }],
    ['a second recognition', MH, (d) => { d.actions[5].recognition = true; }, '/actions/16/recognition', { entry: 16, field: 'recognition' }],
    ['a preparation step with a window', MH, (d) => { d.actions[5].preparation = true; }, '/actions/5/window', { entry: 5, field: 'window' }],
    ['repeat and repeatWhile', MH, (d) => { d.actions[8].repeat = { intervalS: { value: 300 } }; }, '/actions/8/repeat', { field: 'repeat' }],
    ['a repeat without its shortest interval', HAEM, (d) => { d.actions[6].repeat.intervalS = { max: 300 }; }, '/actions/6/repeat/intervalS', { field: 'repeat', part: 'intervalS' }],
    ['order after no action', MH, (d) => { d.actions[8].order = { after: ['nope'] }; }, '/actions/8/order/after/0', { field: 'order', part: 'after/0' }],
    ['order before no action', MH, (d) => { d.actions[8].order = { before: ['nope'] }; }, '/actions/8/order/before/0', { field: 'order', part: 'before/0' }],
    ['repeatWhile visiting no phase', MH, (d) => { d.actions[8].repeatWhile.rule = { visited: 'nope' }; }, '/actions/8/repeatWhile/rule/visited', { field: 'repeatWhile', rule: { root: '/actions/8/repeatWhile/rule', node: '', leaf: 'visited' } }],
    ['a precondition visiting no phase', MH, (d) => { d.actions[9].precondition = { any: [{ signal: 'rosc' }, { visited: 'nope' }] }; }, '/actions/9/precondition/any/1/visited', { field: 'precondition', rule: { root: '/actions/9/precondition', node: '/any/1', leaf: 'visited' } }],
    ['a violation: a drug the engine lacks', MH, (d) => { d.actions[8].contraindications[0].match.drugId = 'nope'; }, '/actions/8/contraindications/0/match/drugId', { field: 'contraindications', row: 0, part: 'match/drugId' }],
    ['a violation: a class the engine lacks', MH, (d) => { d.actions[8].contraindications[0].match.cls = 'nope'; }, '/actions/8/contraindications/0/match/cls', { field: 'contraindications', row: 0, part: 'match/cls' }],
    ['a violation: in no phase', MH, (d) => { d.actions[8].contraindications[0].inPhases = ['nope']; }, '/actions/8/contraindications/0/inPhases/0', { field: 'contraindications', row: 0, part: 'inPhases/0' }],
    ['a violation: after no action', MH, (d) => { d.actions[8].contraindications[0].afterAction = 'nope'; }, '/actions/8/contraindications/0/afterAction', { field: 'contraindications', row: 0, part: 'afterAction' }],
    ['a violation: when visiting no phase', MH, (d) => { d.actions[8].contraindications[0].when = { visited: 'nope' }; }, '/actions/8/contraindications/0/when/visited', { field: 'contraindications', row: 0, rule: { root: '/actions/8/contraindications/0/when', node: '', leaf: 'visited' } }],
    ['an outcome rule visiting no phase', MH, (d) => { d.outcomes = [outcome({ rule: { not: { visited: 'nope' } } })]; }, '/outcomes/0/rule/not/visited', { section: 'outcomes', field: 'rule', rule: { root: '/outcomes/0/rule', node: '/not', leaf: 'visited' } }],
    ['an outcome anchored on no phase', MH, (d) => { d.outcomes = [outcome({ anchor: 'phase:nope' })]; }, '/outcomes/0/anchor', { section: 'outcomes', field: 'anchor' }],
    ['an outcome anchored on a rule visiting no phase', MH, (d) => { d.outcomes = [outcome({ anchor: { rule: { visited: 'nope' } } })]; }, '/outcomes/0/anchor/rule/visited', { field: 'anchor', rule: { root: '/outcomes/0/anchor/rule', node: '', leaf: 'visited' } }],
    ['an opener at no phase', MH, (d) => { d.debriefHints = { openers: [{ at: 'phase:nope', text: 'What did you see?' }] }; }, '/debriefHints/openers/0/at', { section: 'debrief', field: 'openers', row: 0, part: 'at' }],
    ['a handout question at no action', MH, (d) => { d.debriefHints = { handoutQuestions: [{ at: 'action:nope', text: 'When?' }] }; }, '/debriefHints/handoutQuestions/0/at', { section: 'handout', field: 'handoutQuestions', row: 0, part: 'at' }],
    ['a script entry on no phase', MH, (d) => { d.script[0].on = 'phase:nope'; }, '/script/0/on', { section: 'script', entry: 0, field: 'on' }],
    ['a script entry on no action', MH, (d) => { d.script[0].on = 'action:nope#1'; }, '/script/0/on', { section: 'script', entry: 0, field: 'on' }],
    ['a script command: a rhythm the engine lacks (warning)', MH, (d) => { d.script[0].commands.push({ type: 'setRhythm', rhythm: 'zzz' }); }, '/script/0/commands/1/rhythm', { section: 'script', field: 'commands', row: 1, part: 'rhythm' }],
    ["the patient's rhythm the engine lacks (warning)", MH, (d) => { d.patient.rhythm = { id: 'zzz' }; }, '/patient/rhythm/id', { section: 'patient', field: 'rhythm', part: 'id' }],
    // the schema's own errors (ajv), in the validator's words
    ['a retired judged block', MH, (d) => { d.judged = []; }, '/judged', { section: 'carried', heading: true }],
    ['a property the phase does not have', MH, (d) => { d.phases[1].manual = true; }, '/phases/1', { entry: 1, heading: true }],
    ['a phase rule with two leaves', MH, (d) => { d.phases[4].enter = { signal: 'rosc', visited: 'latent' }; }, '/phases/4/enter', { field: 'enter', rule: { root: '/phases/4/enter', node: '' } }],
    ['a missing title', MH, (d) => { delete d.title; }, '/', { section: 'document', heading: true }],
    ['an unknown action kind', MH, (d) => { d.actions[3].kind = 'nope'; }, '/actions/3/kind', { field: 'kind' }],
    ['a handout question over 92 characters', MH, (d) => { d.debriefHints = { handoutQuestions: [{ at: 'start', text: 'x'.repeat(93) }] }; }, '/debriefHints/handoutQuestions/0/text', { section: 'handout', row: 0, part: 'text' }],
    ['a briefing over 4000 characters', MH, (d) => { d.briefing.text = 'x'.repeat(4001); }, '/briefing/text', { section: 'briefing', field: 'text' }],
    ["a patient's weight that is not a number", MH, (d) => { d.patient.weightKg = 'heavy'; }, '/patient/weightKg', { section: 'patient', field: 'weightKg' }],
  ];
  const RHYTHMS = ['sinus'];
  it.each(CASES)('%s', (_what, id, change, at, want) => {
    const doc = card(id);
    change(doc);
    const path = at.replace('RHYTHM', String(doc.actions?.[15]?.give?.length - 1)).replace('LAST', String(doc.actions?.[7]?.give?.length - 1));
    const r = validateScenario(doc, { rhythms: RHYTHMS });
    const lines = [...(r.ok ? [] : r.errors), ...r.warnings];
    const line = lines.find((l) => l.startsWith(`${path}: `));
    expect(line, lines.join('\n')).toBeDefined();
    expect(fieldOf(path)).toMatchObject(want);
    // and every other line the change caused lands too: inside its own path, never on the document unless it is "/"
    for (const l of lines) {
      const p = l.slice(0, l.indexOf(': '));
      const f = fieldOf(p);
      expect(p === f.path || p.startsWith(`${f.path}/`), l).toBe(true);
      if (p !== '/') expect(f.section, l).not.toBe('document');
    }
  });
  it('the two library /2 cards pass as they are (the table changes them, never the library)', () => {
    for (const id of [MH, HAEM]) expect(validateScenario(card(id)).ok).toBe(true);
  });
});
