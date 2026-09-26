import { validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { GATE_DOCS } from '../../suites/gates/gate-docs.ts';
import { runValidationDoc } from '../../src/segments/run.ts';

describe('gate regression documents', () => {
  it('validate against pme-scenario/1', () => {
    for (const d of GATE_DOCS) expect(validateScenario(d.scenario).ok, d.id).toBe(true);
  });
  it('the asystole alarm delay on philips-like is 4 ± 1 s', { timeout: 60_000 }, async () => {
    const r = await runValidationDoc(GATE_DOCS.find((d) => d.id === 'g4b-asystole-philips-like')!);
    expect(r.results.map((x) => x.grade)).toEqual(['green']);
  });
});
