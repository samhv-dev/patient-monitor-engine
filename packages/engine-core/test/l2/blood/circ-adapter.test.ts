import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { applyL1Fallback, chemistryContractility, circOf, lungWaterStep, pulmCapPressure, pushCircVolume, setCircChemistry, volumeCoFactor } from '../../../src/l2/blood/circ-adapter.ts';

describe('circulation adapter (plan decision 10)', () => {
  it('finds a Stage 7a CircModelState by duck typing, pushes 100 ms volume events and writes ext.kChem unconditionally', () => {
    expect(circOf({})).toBeNull();
    expect(circOf({ circ: { t: 1 } })).toBeNull();
    // 7a's ext initialiser omits the optional kChem key (R51 addendum 14): 7c must still write it
    const hemo = { circ: { t: 12.3, vol: [] as { rate: number; until: number }[], ext: { kLv: 1 } as Record<string, unknown>, ref: { co: 5.4 } } };
    const c = circOf(hemo);
    expect(c).not.toBeNull();
    expect(c?.ref?.co).toBe(5.4);
    pushCircVolume(c!, -17.5, 0.1);
    expect(hemo.circ.vol).toEqual([{ rate: -175, until: 12.4 - 1e-6 }]);
    setCircChemistry(c!, 0.8);
    expect(hemo.circ.ext.kChem).toBe(0.8);
    setCircChemistry(c!, 1);
    expect(hemo.circ.ext.kChem).toBe(1);
  });
  it('fallback (unit rigs without a circuit): CO factor 1 to 10 % loss, 0.6 at 35 %; volumeStatus and contractility coupled truths', () => {
    expect(volumeCoFactor(0.95)).toBe(1);
    expect(volumeCoFactor(0.65)).toBeCloseTo(0.6, 6);
    const l1 = createL1State();
    applyL1Fallback(l1, 0, 0.8, 1);
    expect(l1.coupled?.volumeStatus).toBeCloseTo(1 - 0.2 / 0.35, 6);
    expect(l1.coupled?.contractility).toBeUndefined();
    applyL1Fallback(l1, 0, 0.8, 0.7);
    expect(l1.coupled?.contractility).toBeCloseTo(0.7, 6);
  });
  it('chemistry → contractility: ×(1 − 1.5·(7.2 − pH)) below 7.2 (Q44), ×(iCa/1.1)^1.5 below 1.1 (Q46)', () => {
    expect(chemistryContractility(7.4, 1.2)).toBe(1);
    expect(chemistryContractility(7.0, 1.2)).toBeCloseTo(0.7, 6);
    expect(chemistryContractility(7.4, 0.9)).toBeCloseTo((0.9 / 1.1) ** 1.5, 6);
  });
  it('lung water (G7b ruling 8): none below COP − 2; +10 mL/kg at steady state 10 mmHg above it; a leak lowers the threshold', () => {
    expect(pulmCapPressure({})).toBeNull();
    expect(pulmCapPressure({ circOut: { pPv: 9 } })).toBe(9);
    const run = (pCap: number, cop: number, kf: number, sig: number, min: number) => {
      let w = 0;
      for (let t = 0; t < min * 60; t += 0.1) w = lungWaterStep(w, pCap, cop, kf, sig, 0.1);
      return w;
    };
    expect(run(9, 22.4, 1, 1, 120)).toBe(0); // normal: pCap 9 < 20.4
    expect(run(30.4, 22.4, 1, 1, 600)).toBeCloseTo(10, 0); // PCWP 30: EVLWI 7 → 17
    expect(run(30.4, 22.4, 1, 1, 60)).toBeGreaterThan(5); // most of it within the hour
    expect(run(12, 22.4, 3, 0.5, 600)).toBeGreaterThan(5); // sepsis leak: oedema at a normal PCWP
    expect(run(12, 12, 1, 1, 600)).toBeGreaterThan(1); // hypoalbuminaemia (COP 12): threshold 10
  });
});
