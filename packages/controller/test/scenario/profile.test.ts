// FU-3 item 9 (G8a ruling, FU-3 addition 9; R22): `patient.profile` in pme-scenario/1 is optional (every existing
// scenario still validates) and maps 1:1 onto the engine's PatientProfile `conditions` (7a circulation, 7d brain/
// organs) and `lungConditions` (7b; pregnancy is the catalogue's `pregnancy`, term = severity 1). The body is fixed
// when the host creates its engine, so `engineOptionsOf` is the one mapping every host uses; the engine reports it.
import { readFileSync, readdirSync } from 'node:fs';
import { createEngine, LUNG_CONDITION_IDS } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import schema from '../../scenarios/pme-scenario-1.schema.json';
import { engineOptionsOf } from '../../src/scenario/patient.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';
import { validateScenario } from '../../src/scenario/validate.ts';

const doc = (patient: Record<string, unknown>) => ({
  schema: 'pme-scenario/1', id: 'p', title: 'P', mode: 'modeled', initialState: 'a', states: [{ id: 'a' }], patient,
}) as unknown as ScenarioDoc;
const errs = (d: unknown) => {
  const r = validateScenario(d);
  if (r.ok) throw new Error('expected invalid');
  return r.errors;
};
const ASCAD = { conditions: [{ id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }, { id: 'htn' }] };

describe('pme-scenario/1 patient.profile (schema)', () => {
  it('accepts circulation/organ conditions with grades and severities, and lung conditions incl. pregnancy', () => {
    const r = validateScenario(doc({ ageY: 75, profile: { ...ASCAD, lungConditions: [{ id: 'pregnancy', severity: 1 }] } }));
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(validateScenario(doc({ profile: { conditions: [{ id: 'tbi', severity: 1 }, { id: 'mr', grade: 'severe', severity: 0.4 }, { id: 'betaBlocked' }] } })).ok).toBe(true);
  });

  it('is optional: every scenario file in scenarios/ still validates', () => {
    const dir = new URL('../../scenarios/', import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.endsWith('.schema.json'));
    expect(files.length).toBeGreaterThanOrEqual(11);
    for (const f of files) {
      const r = validateScenario(JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
      expect(r.ok ? [] : r.errors, f).toEqual([]);
    }
  });

  it.each([
    ['an event-only condition (rvInfarct is an applyEvent, not a profile)', { conditions: [{ id: 'rvInfarct' }] }, '/patient/profile/conditions/0/id: must be one of'],
    ['a grade the condition does not have', { conditions: [{ id: 'mr', grade: 'critical' }] }, '/patient/profile/conditions/0/grade: must be one of "mild", "moderate", "severe"'],
    ['severity above 1', { conditions: [{ id: 'hfref', severity: 1.5 }] }, '/patient/profile/conditions/0/severity: must be <= 1'],
    ['a lung condition without severity', { lungConditions: [{ id: 'pregnancy' }] }, '/patient/profile/lungConditions/0: missing required property "severity"'],
    ['an unknown lung condition', { lungConditions: [{ id: 'pregnant', severity: 1 }] }, '/patient/profile/lungConditions/0/id: must be one of'],
    ['an unknown profile key', { pregnancyWeeks: 39 }, '/patient/profile: unexpected property "pregnancyWeeks"'],
  ])('rejects %s', (_, profile, msg) => {
    expect(errs(doc({ profile })).some((e) => e.startsWith(msg))).toBe(true);
  });

  it("the schema's lung condition ids are the engine's catalogue (drift guard)", () => {
    const defs = (schema as unknown as { definitions: Record<string, { properties: { id: { enum: string[] } } }> }).definitions;
    expect(defs.lungCondition?.properties.id.enum).toEqual([...LUNG_CONDITION_IDS]);
  });
});

describe('engineOptionsOf: the scenario patient → the engine at t = 0', () => {
  it('without a profile the options carry exactly the body the hosts passed before (no condition keys)', () => {
    const o = engineOptionsOf(doc({ ageY: 6, weightKg: 20, heightCm: 115, sex: 'F', ageBand: 'paediatric', baseline: { hr: 100 }, sensors: { spo2: 'on' } }), 3);
    expect(o).toEqual({ seed: 3, patient: { ageY: 6, weightKg: 20, heightCm: 115, sex: 'F', baseline: { hr: 100 } }, device: { ageBand: 'paediatric' } });
  });

  it('maps profile.conditions / lungConditions 1:1 and the engine reports them in its state', () => {
    const o = engineOptionsOf(doc({ ageY: 75, profile: { conditions: [...ASCAD.conditions, { id: 'betaBlocked' }, { id: 'tbi', severity: 1 }], lungConditions: [{ id: 'pregnancy', severity: 1 }] } }));
    expect(o.patient?.conditions).toEqual([...ASCAD.conditions, { id: 'betaBlocked' }, { id: 'tbi', severity: 1 }]);
    expect(o.patient?.lungConditions).toEqual([{ id: 'pregnancy', severity: 1 }]);
    const st = (createEngine(o).snapshot().state as { st: Record<string, any> }).st; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(st.hemo.circ.prof.band).toBe('elderly'); // 7a profile: age
    expect(st.hemo.circ.prof.cfr).toBe(1.4); // 7a: CAD severe (tables §1.5 CFR 1.4)
    expect(st.hemo.circ.prof.betaBlock).toBeCloseTo(0.8, 6); // 7a: chronic β-blockade (g_hs ×0.2)
    expect(st.hemo.circ.prof.lvedpTarget).toBe(18); // 7a: severe AS sets LVEDP 18
    expect(st.resp.lungSpecs).toEqual([{ id: 'pregnancy', severity: 1 }]); // 7b: term pregnancy
    expect(st.organs.conds).toContainEqual({ id: 'tbi', severity: 1 }); // 7d: TBI brain parameters
  });

  it('carries 7c blood and 7f neuro (already in the schema) through to the engine', () => {
    const o = engineOptionsOf(doc({ blood: { burns: 0.5 }, neuro: { cholinesterase: 'homozygous', mhSusceptible: true } }));
    expect(o.patient).toEqual({ blood: { burns: 0.5 }, neuro: { cholinesterase: 'homozygous', mhSusceptible: true } });
  });
});
