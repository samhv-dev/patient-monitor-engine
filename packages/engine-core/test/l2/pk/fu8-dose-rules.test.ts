// FU-8 Task B1 (review pack defect list): explicit routes, refused curve-row infusions and the documented
// maximum-dose warning. Through the engine's public API, seed 7.
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '../../../src/index.ts';

const eng = () => createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
const drug = (e: ReturnType<typeof eng>, event: Record<string, unknown>) => e.dispatch({ id: `d${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', route: 'iv', ...event } } as never);

describe('FU-8 B1: routes and infusions the engine cannot honour are refused, not given as IV', () => {
  it('intramuscular adrenaline is refused with the reason; IO and central are accepted; nebulised salbutamol is accepted', () => {
    const e = eng();
    const im = drug(e, { drugId: 'epinephrine', dose: 0.5, unit: 'mg', route: 'im' });
    expect(im).toMatchObject({ accepted: false, reason: expect.stringMatching(/^epinephrine: route im is not modelled/) });
    expect(drug(e, { drugId: 'epinephrine', dose: 10, unit: 'mcg', route: 'io' }).accepted).toBe(true);
    expect(drug(e, { drugId: 'salbutamol', dose: 10, unit: 'mg', route: 'neb' }).accepted).toBe(true);
    expect(drug(e, { drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'neb' }).accepted).toBe(false);
  });
  it('an amiodarone infusion (a curve row with no infusion reference) is refused; its bolus is accepted', () => {
    const e = eng();
    expect(drug(e, { drugId: 'amiodarone', dose: 0.6, unit: 'mg/min', infusion: true })).toMatchObject({ accepted: false, reason: expect.stringMatching(/no infusion model/) });
    expect(drug(e, { drugId: 'amiodarone', dose: 300, unit: 'mg' }).accepted).toBe(true);
  });
});

describe('FU-8 B1: a documented maximum raises a warning, never a clamp', () => {
  it('lidocaine 3 + 2 mg/kg: the second bolus crosses the cumulative 4.5 mg/kg (315 mg) → one drugWarning; both doses are logged', () => {
    const e = eng();
    const warn: string[] = [];
    e.on((x: EngineEvent) => { if (x.type === 'drugWarning') warn.push(x.text); }, ['drugWarning']);
    drug(e, { drugId: 'lidocaine', dose: 3, unit: 'mg/kg' });
    e.advanceTo(5);
    expect(warn).toEqual([]);
    drug(e, { drugId: 'lidocaine', dose: 2, unit: 'mg/kg' });
    e.advanceTo(10);
    expect(warn).toEqual(['Lidocaine: cumulative 350 mg exceeds the maximum 315 mg (M10 ch. 25 Table 25.6, plain)']);
  });
});
