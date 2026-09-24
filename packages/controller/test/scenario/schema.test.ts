// pme-scenario/1 validation (brief §7.4; BUILD-PLAN Stage 6 acceptance 6: path-level error messages).
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../src/scenario/validate.ts';

const base = () => ({
  schema: 'pme-scenario/1', id: 'x', title: 'X', initialState: 'a',
  states: [{ id: 'a', transitions: [{ id: 't1', to: 'b', when: { afterS: 5 } }] }, { id: 'b' }],
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
