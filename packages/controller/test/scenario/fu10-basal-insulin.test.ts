// FU-10 Task A7 (E-FU10-9, ruling R-10): the scenario schema carries the type 1 `basalInsulin` option 1:1 to the engine.
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../src/scenario/validate.ts';

const doc = (endo: Record<string, unknown>) => ({
  schema: 'pme-scenario/1', id: 'x', title: 'X', initialState: 'a', patient: { endo },
  states: [{ id: 'a', label: 'A', transitions: [{ id: 't1', to: 'b', when: { afterS: 5 } }] }, { id: 'b', label: 'B' }],
});

describe('FU-10 E7: patient.endo.basalInsulin', () => {
  it('accepts a type 1 patient whose basal insulin is omitted, and rejects a non-boolean', () => {
    expect(validateScenario(doc({ diabetes: 'type1', basalInsulin: false })).ok).toBe(true);
    expect(validateScenario(doc({ diabetes: 'type1', basalInsulin: 'no' })).ok).toBe(false);
  });
});
