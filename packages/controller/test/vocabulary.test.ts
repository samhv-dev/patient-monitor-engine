import { describe, expect, it } from 'vitest';
import { createEngine, RHYTHM_IDS } from '@pme/engine-core';
import { stage1Vocabulary, vocabularyOf, type Vocabulary } from '../src/vocabulary.ts';

describe('vocabulary', () => {
  it('describes exactly what the Stage 1 engine accepts', () => {
    const e = createEngine({ seed: 1 });
    const v = vocabularyOf(e);
    expect(v.schema).toBe('pme-vocabulary/1');
    expect(v.rhythms.map((r) => r.id)).toEqual(RHYTHM_IDS);
    let n = 0;
    for (const spec of v.variables) {
      const r = e.dispatch({ id: `v${n++}`, issuedBy: 't', type: 'setTarget', variable: spec.id, value: spec.normal, ramp: { durationS: 5 } });
      expect(r.accepted, spec.id).toBe(true);
    }
    for (const r of v.rhythms) expect(e.dispatch({ id: `r${n++}`, issuedBy: 't', type: 'setRhythm', rhythm: r.id }).accepted).toBe(true);
    for (const d of v.devices) for (const o of d.options) {
      const action = { device: d.device, action: d.action, value: o.value, ...(d.lanes ? { lane: 0 } : {}) };
      expect(e.dispatch({ id: `d${n++}`, issuedBy: 't', type: 'device', action }).accepted, `${d.id}=${o.value}`).toBe(true);
    }
  });

  it("prefers the engine's own vocabulary() when it reports one (Stage 5+)", () => {
    const own: Vocabulary = { ...stage1Vocabulary('9.9.9'), variables: [] };
    expect(vocabularyOf({ version: '9.9.9', vocabulary: () => own })).toBe(own);
    expect(vocabularyOf({ version: '1.0.0', vocabulary: () => ({ something: 'else' }) }).engineVersion).toBe('1.0.0');
  });
});
