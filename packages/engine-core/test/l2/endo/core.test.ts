// The 1 Hz endocrine core (EndoOut) — resting identity, sepsis bundle, MH tachycardia, DKA (7c's severity), hypoglycaemia.
import { describe, expect, it } from 'vitest';
import { createEndoCore, NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../../src/l2/endo/core.ts';
import { insulinInfusion } from '../../../src/l2/endo/glucose.ts';

const X = NEUTRAL_ENDO_INPUTS;
const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false } as const;

describe('endocrine core', { timeout: 60_000 }, () => {
  it('rest: every haemodynamic/metabolic multiplier is exactly 1 for 24 h (Stage 1–3 outputs untouched)', () => {
    const c = createEndoCore();
    for (let s = 0; s < 86_400; s++) stepEndoCore(c, X, 1);
    const o = c.out;
    expect([o.hrF, o.feverHrF, o.svrF, o.eesF, o.vo2F, o.kfMult, o.vasoResp]).toEqual([1, 1, 1, 1, 1, 1, 1]);
    expect(o.dV0Frac).toBe(0);
    expect(o.setShiftC).toBe(0);
    expect(o.kShift).toBeCloseTo(0, 12);
    expect(o.anaphLung).toBe(0);
    expect(o.glucoseMgDl).toBeCloseTo(100, 6);
    expect(o.stressIndex).toBe(0);
  });

  it('warm septic shock (MANUAL composite): HR × 1.4–1.7 (the stress path adds to the row), SVR × 0.35–0.6 at 60 min', () => {
    const c = createEndoCore();
    c.cond.sepsis.target = 3;
    for (let s = 0; s < 3600; s++) stepEndoCore(c, X, 1);
    const manualHr = c.out.hrF * c.out.condHrF; // MANUAL composite (MODELED: 7a's reflex supplies the condition's part)
    expect(manualHr).toBeGreaterThanOrEqual(1.4);
    expect(manualHr).toBeLessThanOrEqual(1.7);
    expect(c.out.svrF).toBeGreaterThanOrEqual(0.35);
    expect(c.out.svrF).toBeLessThanOrEqual(0.6);
  });

  it('MH activity 1: HR +30–50 bpm from 75 (× 1.4–1.67) through the sympathoadrenal drive; K efflux +1 mmol/L', () => {
    const c = createEndoCore();
    for (let s = 0; s < 1800; s++) stepEndoCore(c, { ...X, mhActivity: 1 }, 1);
    expect(c.out.hrF).toBeGreaterThanOrEqual(1.4);
    expect(c.out.hrF).toBeLessThanOrEqual(1.67);
    expect(c.out.kShift).toBeGreaterThan(0.5); // efflux minus the endogenous-epinephrine β2 uptake
  });

  it('fever HR is a temperature term apart from the β-mediated hrF: 39 °C → × 1.18 even with full 7a β-blockade', () => {
    const c = createEndoCore();
    stepEndoCore(c, { ...X, tempC: 39, betaBlock: 1, betaBlockC: 1 }, 1);
    expect(c.out.feverHrF).toBeCloseTo(1.18, 9);
    expect(c.out.hrF).toBe(1);
  });

  it('DKA (7c publishes the severity): glucose > 250 mg/dL within 2 h', () => {
    const c = createEndoCore(T1);
    for (let s = 0; s < 2 * 3600; s++) stepEndoCore(c, { ...X, dkaSeverity: 1 }, 1);
    expect(c.out.glucoseMgDl).toBeGreaterThan(250);
  });

  it('type 1 on basal insulin + insulin 20 U/h under GA: glucose < 65 mg/dL and HR × ≥ 1.2; the exogenous insulin adds no 7e K shift', () => {
    const c = createEndoCore(T1);
    insulinInfusion(c.glucose, 20); // the "wrong infusion" (10× a 2 U/h sliding scale)
    let hr = 1;
    let gmin = 999;
    for (let s = 0; s < 3 * 3600; s++) {
      stepEndoCore(c, { ...X, noxious: 0.5, antinoc: 0.6 }, 1);
      hr = Math.max(hr, c.out.hrF);
      gmin = Math.min(gmin, c.out.glucoseMgDl);
    }
    expect(gmin).toBeLessThan(65);
    expect(hr).toBeGreaterThanOrEqual(1.2);
    expect(c.out.kShift - c.out.stress.kShift).toBeCloseTo(0, 9); // insulin term 0: 7g's bus.metabolic.kShift carries it
  });

  it('anaphylaxis grade III → 7b severity 0.6 (its grade III) at the mediator plateau; 7g bronchodilation relieves it', () => {
    const c = createEndoCore();
    c.cond.anaph.target = 0.75;
    for (let s = 0; s < 1800; s++) stepEndoCore(c, X, 1);
    expect(c.out.anaphLung).toBeGreaterThan(0.45); // the endogenous epinephrine surge relieves a little
    expect(c.out.anaphLung).toBeLessThanOrEqual(0.6);
    stepEndoCore(c, { ...X, bronchoDilExt: 1 }, 1);
    expect(c.out.anaphLung).toBeLessThan(0.3);
  });
});
