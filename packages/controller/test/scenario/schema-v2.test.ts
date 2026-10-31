// pme-scenario/2 validation (plan F1; design §3, §4, §5.1, §7, §8.4): the schema's shape rules and the cross-checks,
// each error with its JSON path. A /1 document validates exactly as before (schema.test.ts, untouched).
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../src/scenario/validate.ts';
import { isV2 } from '../../src/scenario/types.ts';
import { BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import { minimalV2 } from './fixtures-v2.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Every block and criterion of §3 and §5.1 once. */
const fullV2 = () => {
  const d = minimalV2();
  Object.assign(d, {
    $comment: 'every field', notes: 'n', category: 'Crisis', story: 'A 30-year-old for a knee arthroscopy.', durationMin: 40, takeHome: ['Call it early.'],
    seed: 3, mode: 'modeled', device: { skin: 'philips' },
    patient: { ageY: 30, weightKg: 80, neuro: { mhSusceptible: true }, sensors: { ecg: 'attached' } },
  });
  d.phases.push(
    { id: 'recrudescence', label: 'Recrudescence', enter: { all: [{ visited: 'treated' }, { slope: { var: 'mhActivity', op: '>', perMin: 0, overS: 120 } }, { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, overS: 120 } }] }, next: ['treated', 'arrest'] },
    { id: 'arrest', label: 'Arrest', enter: { any: [{ signal: 'pulseLoss' }, { signal: 'rhythm:vfCoarse' }] }, next: ['rosc'] },
    { id: 'rosc', label: 'ROSC', enter: { not: { signal: 'pulseLoss' } } },
  );
  d.phases[2].next = ['recrudescence', 'arrest'];
  d.actions[0].repeatWhile = { rule: { all: [{ slope: { var: 'etco2', op: '>', perMin: 0.2, overS: 120 } }, { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, overS: 120 } }] }, intervalS: { min: 300, max: 600 } };
  d.actions[0].drug.cumulative = { max: 10, unit: 'mg/kg' };
  d.actions[0].drug.rate = { bolus: true };
  d.actions[0].contraindications = [{ text: 'IM dantrolene', match: { route: ['im'] }, harm: 'notModelled' }, { text: 'A calcium-channel blocker with dantrolene', match: { cls: 'antiarrhythmic' }, afterAction: 'dantrolene' }];
  d.actions.push(
    { id: 'callHelp', label: 'Call for help', kind: 'communication', phases: ['early'], window: { anchor: 'phase:early', withinS: 120 } },
    { id: 'stopTrigger', label: 'Stop the trigger', kind: 'decision', phases: ['early'], effect: [{ kind: 'vaporiser', settings: { dialPct: { max: 0 }, fgfLpm: { min: 10 } } }], order: { before: ['dantrolene'] } },
    { id: 'hyperventilate', label: 'Hyperventilate', kind: 'device', phases: ['early', 'treated'], device: { kind: 'ventilation', settings: { rr: { min: 18, max: 24 }, vtMlPerKg: { min: 6, max: 8 }, fio2: { value: 1 }, peep: { value: 5, tolerance: 0 } } } },
    { id: 'calcium', label: 'Calcium', kind: 'drug', phases: ['treated'], precondition: { value: { var: 'k', op: '>', value: 5.5 } },
      drug: { alternatives: [{ id: 'calciumChloride', dose: { value: 10, unit: 'mg/kg' } }, { id: 'calciumGluconate', dose: { value: 30, unit: 'mg/kg' } }] },
      window: { anchor: { rule: { value: { var: 'k', op: '>', value: 5.5 } } }, withinS: 300, notBeforeS: 0 } },
    { id: 'pressor', label: 'A vasopressor', kind: 'drug', phases: ['arrest'], drug: { cls: 'alpha1', rate: { infusion: { min: 0.05, max: 0.5, unit: 'mcg/kg/min' } } }, repeat: { intervalS: { min: 180, max: 300 }, maxCount: 5 }, window: { anchor: 'pulseLoss', withinS: 120 } },
    { id: 'cool', label: 'Cool', kind: 'physical', phases: ['treated'], physical: { measure: 'coldSaline', settings: { volumeMlPerKg: { value: 20 } } } },
    { id: 'blood', label: 'Blood', kind: 'fluid', phases: ['arrest'], fluid: { type: ['blood'], volumeMl: { min: 1200 }, rateMlMin: { min: 300 } }, order: { after: ['callHelp'] } },
    { id: 'gas', label: 'Arterial gas', kind: 'sample', phases: ['early'], window: { anchor: 'action:callHelp', withinS: 600 } },
    { id: 'intubate', label: 'Intubate', kind: 'procedure', phases: ['baseline'], window: { anchor: 'start', withinS: 600 } },
  );
  d.outcomes = [{ id: 'etco2Down', text: 'EtCO₂ below 40 within 10 min of the first dantrolene dose', rule: { value: { var: 'etco2', op: '<', value: 40 } }, anchor: 'action:dantrolene', withinS: 600 }];
  d.judged = [{ id: 'nameMh', text: 'Names MH from the monitor', kind: 'recognition', display: { value: { var: 'etco2', op: '>', value: 45 } } }, { id: 'brief', text: 'Briefs the team', kind: 'communication' }];
  d.script = [
    { id: 'vf', on: 'phase:arrest', commands: [{ type: 'setRhythm', rhythm: 'vfCoarse' }] },
    { id: 'bleed', on: { atScenarioS: 0 }, commands: [{ type: 'applyEvent', event: { kind: 'bleed', volumeMl: 2500, overS: 600 } }] },
    { id: 'afterSecond', on: 'action:dantrolene#2', commands: [{ type: 'setTarget', variable: 'hr', value: 90 }] },
  ];
  return d;
};
const errs = (d: unknown) => {
  const r = validateScenario(d);
  if (r.ok) throw new Error('expected invalid');
  return r.errors;
};

describe('pme-scenario/2: a valid document', () => {
  it('accepts a minimal document, typed as /2', () => {
    const r = validateScenario(minimalV2());
    expect(r).toMatchObject({ ok: true, warnings: [] });
    expect(r.ok && isV2(r.doc)).toBe(true);
  });
  it('accepts every block and every criterion of the catalogue', () => {
    const r = validateScenario(fullV2(), { rhythms: ['sinus', 'vfCoarse'] });
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('a /1 document still validates as /1, and isV2 says so', () => {
    for (const raw of Object.values(BUILTIN_SCENARIOS)) {
      const r = validateScenario(raw);
      expect(r.ok && !isV2(r.doc)).toBe(true);
    }
  });
});

describe('pme-scenario/2: the shape rules, each with its path', () => {
  it.each([
    ['a /1 field in the header', (d: any) => (d.objectives = ['x']), '/: unexpected property "objectives"'],
    ['a /1 bookmark list', (d: any) => (d.bookmarks = []), '/: unexpected property "bookmarks"'],
    ['no phases', (d: any) => delete d.phases, '/: missing required property "phases"'],
    ['no actions', (d: any) => delete d.actions, '/: missing required property "actions"'],
    ['an empty phase list', (d: any) => (d.phases = []), '/phases: must NOT have fewer than 1 items'],
    ['a phase without a label', (d: any) => delete d.phases[1].label, '/phases/1: missing required property "label"'],
    ['a phase that is neither initial nor entered by a rule', (d: any) => delete d.phases[1].enter, '/phases/1: missing required property "enter"'],
    ['initial: false', (d: any) => (d.phases[1].initial = false), '/phases/1/initial: must be true'],
    ['a manual leaf in a phase rule', (d: any) => (d.phases[1].enter = { manual: { label: 'Go' } }), '/phases/1/enter: unexpected property "manual"'],
    ['an event leaf in a phase rule', (d: any) => (d.phases[1].enter = { event: { kind: 'drug' } }), '/phases/1/enter: unexpected property "event"'],
    ['an afterS leaf in a phase rule', (d: any) => (d.phases[1].enter = { afterS: 60 }), '/phases/1/enter: unexpected property "afterS"'],
    ['a manual leaf nested in all', (d: any) => (d.phases[2].enter.all[1] = { manual: { label: 'Go' } }), '/phases/2/enter/all/1: unexpected property "manual"'],
    ['a manual leaf in an action precondition', (d: any) => (d.actions[0].precondition = { manual: { label: 'Go' } }), '/actions/0/precondition: unexpected property "manual"'],
    ['two leaves in one rule', (d: any) => (d.phases[1].enter = { visited: 'baseline', signal: 'rosc' }),
      '/phases/1/enter: a phase rule must have exactly one of value, slope, unchanged, visited, signal, all, any, not'],
    ['an empty rule', (d: any) => (d.phases[1].enter = {}), '/phases/1/enter: a phase rule must have exactly one of value, slope, unchanged, visited, signal, all, any, not'],
    ['a displayed-only id in a truth rule', (d: any) => (d.phases[1].enter.value.var = 'nibpSys'), '/phases/1/enter/value/var: must be one of'],
    ['a slope without its window', (d: any) => (d.phases[2].enter.all[1].slope.overS = undefined, delete d.phases[2].enter.all[1].slope.overS), '/phases/2/enter/all/1/slope: missing required property "overS"'],
    ['an unknown signal', (d: any) => (d.phases[1].enter = { signal: 'arrest' }), '/phases/1/enter/signal: must be one of "pulseLoss", "rosc"'],
    ['an unknown action kind', (d: any) => (d.actions[0].kind = 'medication'), '/actions/0/kind: must be one of'],
    ['an action open in no phase', (d: any) => (d.actions[0].phases = []), '/actions/0/phases: must NOT have fewer than 1 items'],
    ['an unknown give command', (d: any) => (d.actions[0].give = [{ type: 'explode' }]), '/actions/0/give/0/type: unknown command type "explode"'],
    ['a give command with an id', (d: any) => (d.actions[0].give[0].id = 'x'), '/actions/0/give/0: unexpected property "id"'],
    ['an unknown route', (d: any) => (d.actions[0].drug.route.set = ['oral']), '/actions/0/drug/route/set/0: must be one of'],
    ['a drug with two identities', (d: any) => (d.actions[0].drug.cls = 'dantrolene'), '/actions/0/drug: must match exactly one schema in oneOf'],
    ['a dose without a unit', (d: any) => delete d.actions[0].drug.dose.unit, '/actions/0/drug/dose: missing required property "unit"'],
    ['a window without withinS', (d: any) => delete d.actions[0].window.withinS, '/actions/0/window: missing required property "withinS"'],
    ['a malformed anchor', (d: any) => (d.actions[0].window.anchor = 'phase early'), '/actions/0/window/anchor: must match pattern'],
    ['an outcome without withinS', (d: any) => (d.outcomes = [{ id: 'o', text: 'x', rule: { value: { var: 'etco2', op: '<', value: 40 } }, anchor: 'start' }]), '/outcomes/0: missing required property "withinS"'],
    ['an outcome on a displayed value', (d: any) => (d.outcomes = [{ id: 'o', text: 'x', rule: { value: { var: 'abpMean', op: '>', value: 65 } }, anchor: 'start', withinS: 60 }]), '/outcomes/0/rule/value/var: must be one of'],
    ['an unknown judged kind', (d: any) => (d.judged = [{ id: 'j', text: 'x', kind: 'technical' }]), '/judged/0/kind: must be one of "recognition", "communication"'],
    ['a judged clock on a manual press', (d: any) => (d.judged = [{ id: 'j', text: 'x', kind: 'recognition', display: { manual: { label: 'x' } } }]), '/judged/0/display: unexpected property "manual"'],
    ['a malformed script anchor', (d: any) => (d.script = [{ id: 's', on: 'action:dantrolene', commands: [{ type: 'setRhythm', rhythm: 'sinus' }] }]), '/script/0/on: must match pattern'],
    ['a script entry with no commands', (d: any) => (d.script = [{ id: 's', on: 'phase:early', commands: [] }]), '/script/0/commands: must NOT have fewer than 1 items'],
  ])('rejects %s', (_name, mutate, message) => {
    const d = minimalV2();
    mutate(d);
    expect(errs(d).some((e) => e.startsWith(message)), errs(d).join('\n')).toBe(true);
  });
});

describe('pme-scenario/2: the cross-checks (§8.4), each with its path', () => {
  it.each([
    ['a duplicate phase id', (d: any) => d.phases.push({ id: 'early', label: 'Again', enter: { signal: 'rosc' } }), '/phases/3/id: duplicate phase id "early"'],
    ['no initial phase', (d: any) => (delete d.phases[0].initial, (d.phases[0].enter = { signal: 'rosc' })), '/phases: no initial phase (exactly one has "initial": true)'],
    ['two initial phases', (d: any) => (d.phases[1].initial = true), '/phases/1/initial: a second initial phase (the first is "baseline")'],
    ['a next target that does not exist', (d: any) => (d.phases[0].next = ['nowhere']), '/phases/0/next/0: no phase "nowhere"'],
    ['a visited phase that does not exist', (d: any) => (d.phases[1].enter = { visited: 'nowhere' }), '/phases/1/enter/visited: no phase "nowhere"'],
    ['a nested visited phase that does not exist', (d: any) => (d.phases[2].enter.all[0] = { visited: 'q' }), '/phases/2/enter/all/0/visited: no phase "q"'],
    ['a duplicate action id', (d: any) => d.actions.push({ ...d.actions[0] }), '/actions/1/id: duplicate action id "dantrolene"'],
    ['an action phase that does not exist', (d: any) => (d.actions[0].phases = ['early', 'q']), '/actions/0/phases/1: no phase "q"'],
    ['a drug id the engine lacks', (d: any) => (d.actions[0].drug.id = 'dantrolen'), '/actions/0/drug/id: no drug "dantrolen" in the engine'],
    ['a drug class the engine lacks', (d: any) => (d.actions[0].drug = { cls: 'beta1' }), '/actions/0/drug/cls: no drug class "beta1" in the engine'],
    ['an alternative the engine lacks', (d: any) => (d.actions[0].drug = { alternatives: [{ id: 'calciumChloride' }, { id: 'calciumLactate' }] }), '/actions/0/drug/alternatives/1/id: no drug "calciumLactate" in the engine'],
    ['a give drug the engine lacks', (d: any) => (d.actions[0].give[0].event.drugId = 'dantrium'), '/actions/0/give/0/event/drugId: no drug "dantrium" in the engine'],
    ['a contraindication drug the engine lacks', (d: any) => (d.actions[0].contraindications = [{ text: 'x', match: { drugId: 'nifedipine' } }]), '/actions/0/contraindications/0/match/drugId: no drug "nifedipine" in the engine'],
    ['a drug action without its criteria', (d: any) => delete d.actions[0].drug, '/actions/0: a drug action needs "drug"'],
    ['drug criteria on a device action', (d: any) => (d.actions[0].kind = 'device', (d.actions[0].device = { kind: 'ventilation', settings: { rr: { value: 20 } } })), '/actions/0/drug: only a drug action has "drug"'],
    ['a device action without settings', (d: any) => d.actions.push({ id: 'v', label: 'V', kind: 'device', phases: ['early'] }), '/actions/1: a device action needs "device"'],
    ['a decision without its effect', (d: any) => d.actions.push({ id: 'v', label: 'V', kind: 'decision', phases: ['early'] }), '/actions/1: a decision action needs "effect"'],
    ['an order on an action that does not exist', (d: any) => (d.actions[0].order = { after: ['callHelp'] }), '/actions/0/order/after/0: no action "callHelp"'],
    ['a window anchored on a missing phase', (d: any) => (d.actions[0].window.anchor = 'phase:q'), '/actions/0/window/anchor: no phase "q"'],
    ['a window anchored on a missing action', (d: any) => (d.actions[0].window.anchor = 'action:q'), '/actions/0/window/anchor: no action "q"'],
    ['a contraindication in a missing phase', (d: any) => (d.actions[0].contraindications = [{ text: 'x', match: { route: ['im'] }, inPhases: ['q'] }]), '/actions/0/contraindications/0/inPhases/0: no phase "q"'],
    ['an outcome anchored on a missing action', (d: any) => (d.outcomes = [{ id: 'o', text: 'x', rule: { value: { var: 'etco2', op: '<', value: 40 } }, anchor: 'action:q', withinS: 60 }]), '/outcomes/0/anchor: no action "q"'],
    ['a duplicate outcome id', (d: any) => (d.outcomes = [0, 1].map(() => ({ id: 'o', text: 'x', rule: { signal: 'rosc' }, anchor: 'start', withinS: 60 }))), '/outcomes/1/id: duplicate outcome id "o"'],
    ['a duplicate judged id', (d: any) => (d.judged = [0, 1].map(() => ({ id: 'j', text: 'x', kind: 'recognition' }))), '/judged/1/id: duplicate judged id "j"'],
    ['a script entry on a missing phase', (d: any) => (d.script = [{ id: 's', on: 'phase:q', commands: [{ type: 'setRhythm', rhythm: 'sinus' }] }]), '/script/0/on: no phase "q"'],
    ['a script entry on a missing action', (d: any) => (d.script = [{ id: 's', on: 'action:q#1', commands: [{ type: 'setRhythm', rhythm: 'sinus' }] }]), '/script/0/on: no action "q"'],
    ['a duplicate script id', (d: any) => (d.script = [0, 1].map(() => ({ id: 's', on: { atScenarioS: 1 }, commands: [{ type: 'setRhythm', rhythm: 'sinus' }] }))), '/script/1/id: duplicate script id "s"'],
  ])('rejects %s', (_name, mutate, message) => {
    const d = minimalV2();
    mutate(d);
    expect(errs(d).some((e) => e.startsWith(message)), errs(d).join('\n')).toBe(true);
  });

  it('warns (does not fail) on rhythm ids this engine lacks, in a signal leaf, a give list and the script', () => {
    const d = minimalV2();
    d.phases[2].enter = { signal: 'rhythm:vfCoarse' };
    d.actions[0].give.push({ type: 'setRhythm', rhythm: 'vfCoarse' });
    d.script = [{ id: 's', on: 'phase:early', commands: [{ type: 'setRhythm', rhythm: 'vfCoarse' }] }];
    const r = validateScenario(d, { rhythms: ['sinus'] });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([
      '/phases/2/enter/signal: "vfCoarse" is not in this engine',
      '/actions/0/give/1/rhythm: "vfCoarse" is not in this engine',
      '/script/0/commands/0/rhythm: "vfCoarse" is not in this engine',
    ]);
  });
});

// The owner's rulings of 31 October and the MH card's needs (F8): a phase's 60-s boundary hold (`holdS`) and the
// learner's cue shown beside its rule (`cue`); "unchanged set ventilation" against the value at the phase's start
// (`since: 'phaseStart'`); setup actions that are offered and recorded but not graded (`graded: false`: the induction
// sequence, the orchestrator's call); and #211's learner-facing `briefing` block, the same shape as /1's there.
describe('pme-scenario/2: holdS, cue, unchanged since the phase start, graded: false, briefing', () => {
  const withAll = () => {
    const d: any = minimalV2();
    d.phases[1].holdS = 60;
    d.phases[1].cue = 'EtCO₂ climbing, HR up';
    d.phases[2].enter = { all: [d.phases[2].enter, { unchanged: { var: 'setMinuteVentilationLMin', withinPct: 5, since: 'phaseStart' } }] };
    d.actions.push({ id: 'premed', label: 'Premedicate', kind: 'procedure', phases: ['baseline'], graded: false });
    d.briefing = { text: 'You are the resident.', estimatedMinutes: 25, durationS: 60, lang: 'en' };
    return d;
  };
  it('accepts them', () => {
    const r = validateScenario(withAll());
    expect(r.ok ? [] : r.errors).toEqual([]);
  });
  it.each([
    ['a negative hold', (d: any) => (d.phases[1].holdS = -1), '/phases/1/holdS: must be >= 0'],
    ['an empty cue', (d: any) => (d.phases[1].cue = ''), '/phases/1/cue: must NOT have fewer than 1 characters'],
    ['an unchanged leaf with neither window nor since', (d: any) => delete d.phases[2].enter.all[1].unchanged.since, '/phases/2/enter/all/1/unchanged'],
    ['an unknown since', (d: any) => (d.phases[2].enter.all[1].unchanged.since = 'start'), '/phases/2/enter/all/1/unchanged'],
    ['graded: true written out', (d: any) => (d.actions[1].graded = true), '/actions/1/graded: must be false'],
    ['a briefing without text', (d: any) => delete d.briefing.text, '/briefing: missing required property "text"'],
  ])('refuses %s', (_name, mutate, want) => {
    const d = withAll();
    mutate(d);
    const r = validateScenario(d);
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.errors.join('\n')).toContain(want);
  });
});
