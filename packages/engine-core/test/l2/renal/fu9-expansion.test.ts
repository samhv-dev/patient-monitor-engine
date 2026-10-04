// FU-9 Task A1 (F1, H1): the kidney excretes an EXPANDED circulation (ANP / ADH suppression), through the same chain that
// already carries general anaesthesia (S_GA) and depletion (vNh), so GA and a bled patient retain more; and it reads the
// cardiac output against the body's DEMAND, so an anaesthetised patient is not oliguric at a normal MAP (research/13 H1).
import { describe, expect, it } from 'vitest';
import { expansionFactor } from '../../../src/l2/renal/model.ts';
import { V_EXP_MAX } from '../../../src/l2/renal/params.ts';
import { RENAL_BASE, renalHold, uopMlKgH } from '../../helpers/fu9-renal.ts';

describe('FU-9 F1: renal excretion of an expanded circulation (Hahn 2010; Norberg 2007; Drobin & Hahn 1999)', () => {
  it('expansionFactor: 1 at and below normovolaemia, 1 + 90 per unit excess, capped', () => {
    expect(expansionFactor(1)).toBe(1);
    expect(expansionFactor(0.8)).toBe(1);
    expect(expansionFactor(1.05)).toBeCloseTo(5.5, 9);
    expect(expansionFactor(1.5)).toBe(V_EXP_MAX);
  });
  it('+5 % blood volume awake: UOP ≈ 5× basal within 10 min; general anaesthesia keeps the S_GA share; a normovolaemic kidney is unchanged', () => {
    const up = { ...RENAL_BASE, bvRel: 1.05 };
    const awake = uopMlKgH(renalHold(up, 600, 0, { ...up, bvRel: 1 }));
    const gaUp = { ...up, anaesthesia: 'general' as const };
    const ga = uopMlKgH(renalHold(gaUp, 600, 0, { ...gaUp, bvRel: 1 }));
    console.log(`FU-9 F1 renal: +5 % BV → ${awake.toFixed(2)} mL/kg/h awake, ${ga.toFixed(2)} under GA`);
    expect(awake).toBeGreaterThan(4.5);
    expect(awake).toBeLessThan(6.5);
    expect(ga / awake).toBeCloseTo(0.6, 2); // S_GA
    expect(uopMlKgH(renalHold(RENAL_BASE, 600))).toBeCloseTo(1.0, 2);
  });
});

describe('FU-9 H1: output referenced to demand (research/13 H1)', () => {
  it('GA: CO −15 % with demand −15 % reads "full" — UOP 0.6 mL/kg/h (S_GA only; was 0.35); the same CO fall at normal demand still reads underfilled', () => {
    const ga = { ...RENAL_BASE, anaesthesia: 'general' as const, coLpm: 0.85 * 5.6 };
    const full = uopMlKgH(renalHold({ ...ga, demandRel: 0.85 }, 1800));
    const under = uopMlKgH(renalHold(ga, 1800));
    console.log(`FU-9 H1: GA UOP ${full.toFixed(2)} (demand 0.85) vs ${under.toFixed(2)} (demand 1)`);
    expect(full).toBeCloseTo(0.6, 2);
    expect(under).toBeLessThan(full);
  });
});
