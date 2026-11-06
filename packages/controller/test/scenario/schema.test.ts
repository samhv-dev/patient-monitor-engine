// pme-scenario/1 validation (brief §7.4; BUILD-PLAN Stage 6 acceptance 6: path-level error messages).
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../src/scenario/validate.ts';

const base = () => ({
  schema: 'pme-scenario/1', id: 'x', title: 'X', initialState: 'a',
  // FU-8 (R-S9-4, E-FU8-2): the fixture's states carry labels — an unlabelled state is now a validation warning
  states: [{ id: 'a', label: 'A', transitions: [{ id: 't1', to: 'b', when: { afterS: 5 } }] }, { id: 'b', label: 'B' }],
}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const errs = (d: unknown) => {
  const r = validateScenario(d);
  if (r.ok) throw new Error('expected invalid');
  return r.errors;
};

describe('validateScenario', () => {
  it('accepts a minimal document', () => {
    expect(validateScenario(base()).ok).toBe(true);
  });

  it('warns (does not fail) on rhythm ids this engine lacks', () => {
    const d = base();
    d.states[1].onEnter = [{ type: 'setRhythm', rhythm: 'vfCoarse' }];
    const r = validateScenario(d, { rhythms: ['sinus'] });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(['/states/1/onEnter/0/rhythm: "vfCoarse" is not in this engine']);
  });

  it.each([
    ['wrong schema tag', (d: any) => (d.schema = 'pme-scenario/2'), '/schema: must be "pme-scenario/1"'],
    ['missing states', (d: any) => delete d.states, '/: missing required property "states"'],
    ['unknown top-level key', (d: any) => (d.colour = 'red'), '/: unexpected property "colour"'],
    ['two triggers in one when', (d: any) => (d.states[0].transitions[0].when = { afterS: 1, manual: { label: 'x' } }),
      '/states/0/transitions/0/when: a trigger must have exactly one of afterS, atScenarioS, vital, event, sensor, manual, all, any'],
    ['unknown trigger', (d: any) => (d.states[0].transitions[0].when = { soon: 1 }), '/states/0/transitions/0/when: unexpected property "soon"'],
    ['nested bad trigger', (d: any) => (d.states[0].transitions[0].when = { all: [{ afterS: 1 }, {}] }),
      '/states/0/transitions/0/when/all/1: a trigger must have exactly one of afterS, atScenarioS, vital, event, sensor, manual, all, any'],
    ['bad vital op', (d: any) => (d.states[0].transitions[0].when = { vital: { var: 'hr', op: '=>', value: 1 } }),
      '/states/0/transitions/0/when/vital/op: must be one of "<", "<=", ">", ">=", "==", "!="'],
    ['probability > 1', (d: any) => (d.states[0].transitions[0].probability = 1.5), '/states/0/transitions/0/probability: must be <= 1'],
    ['else without probability', (d: any) => (d.states[0].transitions[0].else = 'a'), '/states/0/transitions/0: "else" needs "probability"'],
    ['unknown command type', (d: any) => (d.states[0].onEnter = [{ type: 'explode' }]), '/states/0/onEnter/0/type: unknown command type "explode"'],
    ['command with an id', (d: any) => (d.states[0].onEnter = [{ type: 'setTarget', variable: 'hr', value: 90, id: 'x' }]), '/states/0/onEnter/0: unexpected property "id"'],
    ['bad state var', (d: any) => (d.states[0].onEnter = [{ type: 'setTarget', variable: 'bp', value: 90 }]), '/states/0/onEnter/0/variable: must be one of'],
    ['ramp too long', (d: any) => (d.states[0].onEnter = [{ type: 'setTarget', variable: 'hr', value: 90, ramp: { durationS: 901 } }]), '/states/0/onEnter/0/ramp/durationS: must be <= 900'],
    ['dangling to', (d: any) => (d.states[0].transitions[0].to = 'nowhere'), '/states/0/transitions/0/to: no state "nowhere"'],
    ['dangling initialState', (d: any) => (d.initialState = 'z'), '/initialState: no state "z"'],
    ['duplicate state', (d: any) => d.states.push({ id: 'a' }), '/states/2/id: duplicate state id "a"'],
    ['duplicate transition id', (d: any) => (d.states[1].transitions = [{ id: 't1', to: 'a', when: { afterS: 1 } }]),
      '/states/1/transitions/0/id: duplicate transition id "t1" (ids are unique per document)'],
    ['bookmark to nowhere', (d: any) => (d.bookmarks = [{ id: 'bm', state: 'q' }]), '/bookmarks/0/state: no state "q"'],
  ])('rejects %s with a path-level message', (_name, mutate, message) => {
    const d = base();
    mutate(d);
    expect(errs(d).some((e) => e.startsWith(message)), errs(d).join('\n')).toBe(true);
  });

  it('reports several errors at once, each with its path', () => {
    const d = base();
    d.states[0].transitions[0].probability = 2;
    d.states[0].onEnter = [{ type: 'nope' }];
    expect(errs(d)).toHaveLength(2);
  });
});

describe('the scenario card fields and the endocrine profile', () => {
  it('accepts category, story, objectives, durationMin and patient.endo; warns on an unlabelled state', () => {
    const d = base();
    Object.assign(d, { category: 'Induction', story: 'A 58-year-old for a laparotomy.', objectives: ['Recognise hypotension'], durationMin: 15 });
    d.patient = { endo: { diabetes: 'type2' } };
    expect(validateScenario(d)).toMatchObject({ ok: true, warnings: [] });
    delete d.states[1].label;
    expect(validateScenario(d)).toMatchObject({ ok: true, warnings: ['/states/1/label: state "b" has no label (its id is shown)'] });
    expect(errs({ ...base(), durationMin: 0 }).join()).toMatch(/durationMin/);
  });
});

describe('the Debrief fields (Debrief redesign A)', () => {
  const withObjective = (o: unknown) => ({ ...base(), objectives: [o] });
  it('accepts an objective flagged recognition or discuss', () => {
    expect(validateScenario(withObjective({ text: 'Name it', debrief: 'recognition' })).ok).toBe(true);
    expect(validateScenario(withObjective({ text: 'Better', debrief: 'discuss', rule: { kind: 'never', event: 'pulseLoss' } })).ok).toBe(true);
  });
  it('refuses an unknown debrief value', () => {
    expect(errs(withObjective({ text: 'Name it', debrief: 'structural' })).join()).toMatch(/debrief/);
  });
  it('accepts up to four takeHome lines and refuses five (B5a; four since E132, the MH aftercare line)', () => {
    expect(validateScenario({ ...base(), takeHome: ['One.', 'Two.', 'Three.', 'Four.'] }).ok).toBe(true);
    expect(errs({ ...base(), takeHome: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'] }).join()).toMatch(/takeHome/);
    expect(errs({ ...base(), takeHome: [''] }).join()).toMatch(/takeHome/);
  });
  it('accepts debriefHints: up to four show lines and openers anchored on a run event (D8)', () => {
    const d = { ...base(), debriefHints: { show: ['One.', 'Two.', 'Three.', 'Four.'], openers: [{ at: 'state:b', text: 'What did you see first?' }, { at: 'drug:phenylephrine', text: 'Why that drug?' }, { at: 'start', text: 'How did it begin?' }] } };
    const r = validateScenario(d);
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(validateScenario({ ...base(), debriefHints: { show: ['Only show.'] } }).ok).toBe(true);
    expect(validateScenario({ ...base(), debriefHints: { openers: [{ at: 'state:a', text: 'Only openers.' }] } }).ok).toBe(true);
  });
  it('refuses debriefHints with an opener on a state the card does not have, five show lines, five openers, empty or unknown keys (D8)', () => {
    expect(errs({ ...base(), debriefHints: { openers: [{ at: 'state:deteriorating', text: 'What did you see?' }] } })).toEqual(['/debriefHints/openers/0/at: no state "deteriorating"']);
    expect(errs({ ...base(), debriefHints: { show: ['1', '2', '3', '4', '5'] } }).join()).toMatch(/^\/debriefHints\/show: /);
    const o = { at: 'start', text: 'x' };
    expect(errs({ ...base(), debriefHints: { openers: [o, o, o, o, o] } }).join()).toMatch(/^\/debriefHints\/openers: /);
    expect(errs({ ...base(), debriefHints: { show: [''] } }).join()).toMatch(/debriefHints\/show\/0/);
    expect(errs({ ...base(), debriefHints: { openers: [{ at: 'state:b', text: '' }] } }).join()).toMatch(/debriefHints\/openers\/0\/text/);
    expect(errs({ ...base(), debriefHints: { openers: [{ at: 'soon', text: 'x' }] } }).join()).toMatch(/debriefHints\/openers\/0\/at/);
    expect(errs({ ...base(), debriefHints: { openers: [{ text: 'x' }] } }).join()).toMatch(/missing required property "at"/);
    expect(errs({ ...base(), debriefHints: { pearls: [] } }).join()).toMatch(/unexpected property "pearls"/);
    expect(errs({ ...base(), debriefHints: {} }).join()).toMatch(/debriefHints/);
  });
  it('accepts debriefHints.handoutQuestions: up to three, anchored as the openers are (D16)', () => {
    const q = [{ at: 'state:b', text: 'What did you see here?' }, { at: 'drug:phenylephrine', text: 'Why then?' }, { at: 'start', text: 'What did you notice first?' }];
    const r = validateScenario({ ...base(), debriefHints: { handoutQuestions: q } });
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(validateScenario({ ...base(), debriefHints: { openers: [{ at: 'state:a', text: 'x' }], handoutQuestions: [{ at: 'value:map<60', text: 'y' }] } }).ok).toBe(true);
  });
  it('refuses handoutQuestions on a state the card does not have, four questions, an unknown anchor form, an empty text (D16)', () => {
    expect(errs({ ...base(), debriefHints: { handoutQuestions: [{ at: 'state:deteriorating', text: 'What did you see?' }] } })).toEqual(['/debriefHints/handoutQuestions/0/at: no state "deteriorating"']);
    const q = { at: 'start', text: 'x' };
    expect(errs({ ...base(), debriefHints: { handoutQuestions: [q, q, q, q] } }).join()).toMatch(/^\/debriefHints\/handoutQuestions: /);
    expect(errs({ ...base(), debriefHints: { handoutQuestions: [{ at: 'phase:early', text: 'x' }] } }).join()).toMatch(/debriefHints\/handoutQuestions\/0\/at/);
    expect(errs({ ...base(), debriefHints: { handoutQuestions: [{ at: 'start', text: '' }] } }).join()).toMatch(/debriefHints\/handoutQuestions\/0\/text/);
  });
});
