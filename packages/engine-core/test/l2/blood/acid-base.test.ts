import { describe, expect, it } from 'vitest';
import { anionGap, baseExcess, chargeResidual, hco3Of, PH_MAX, PH_MIN, solvePh } from '../../../src/l2/blood/acid-base.ts';

const N = { sid: 38.1, albGL: 40, piMmolL: 1.1, hb: 15 };

describe('Figge/Stewart charge balance, bounded pH search (tables §5b.1; audit #5/A13)', () => {
  it('normal SID gives pH ≈ 7.40, HCO3 ≈ 24.4–25, BE ≈ 0, in ≤ 16 bisection steps with zero residual', () => {
    const a = solvePh(40, N);
    expect(a.ph).toBeGreaterThan(7.38);
    expect(a.ph).toBeLessThan(7.42);
    expect(a.hco3).toBeGreaterThan(24);
    expect(a.hco3).toBeLessThan(25.5);
    expect(Math.abs(a.be)).toBeLessThan(1);
    expect(a.iter).toBeLessThanOrEqual(16);
    expect(a.atBound).toBe(false);
    expect(Math.abs(chargeResidual(a.ph, 40, N))).toBeLessThan(0.01);
  });
  it('acute respiratory compensation: HCO3 +0.7–1.2 per 10 mmHg PaCO2 rise (tables row), BE stays ≈ 0', () => {
    const lo = solvePh(40, N);
    const hi = solvePh(60, N);
    const slope = (hi.hco3 - lo.hco3) / 2;
    expect(slope).toBeGreaterThanOrEqual(0.7);
    expect(slope).toBeLessThanOrEqual(1.2);
    expect(Math.abs(hi.be - lo.be)).toBeLessThan(1);
  });
  it('acute respiratory alkalosis: HCO3 falls 0.12–0.2 per mmHg PaCO2 fall (40 → 30; tables 0.2) — measured, [ENG] deviation', () => {
    const slope = (solvePh(40, N).hco3 - solvePh(30, N).hco3) / 10;
    console.log(`falling-PaCO2 slope ${slope.toFixed(3)} mmol/L per mmHg (tables 0.2)`);
    expect(slope).toBeGreaterThanOrEqual(0.12);
    expect(slope).toBeLessThanOrEqual(0.2);
  });
  // R45: the tables' 0.2 per mmHg needs cellular H+ release/alkalosis-driven lactate, which the one-pool Figge
  // balance does not have (plan deviation list). Kept visible until Ali's calibration pass decides the mechanism.
  it.fails('acute respiratory alkalosis reaches the tables’ 0.2 mmol/L per mmHg (40 → 30)', () => {
    expect((solvePh(40, N).hco3 - solvePh(30, N).hco3) / 10).toBeGreaterThanOrEqual(0.18);
  });
  it('HCO3 is consistent with pH and PCO2 (Henderson–Hasselbalch) within 0.5 mmol/L everywhere', () => {
    for (const pco2 of [10, 20, 40, 80, 120]) for (const sid of [15, 25, 38, 50, 60]) {
      const a = solvePh(pco2, { ...N, sid });
      const hh = 0.03 * pco2 * 10 ** (a.ph - 6.1); // the tables' 0.03 form
      expect(Math.abs(a.hco3 - hh)).toBeLessThan(0.5 + 0.03 * a.hco3); // 0.0307 vs 0.03: 2.3 % by definition
      expect(a.hco3).toBeCloseTo(hco3Of(a.ph, pco2), 9);
    }
  });
  it('pH stays within 6.5–7.9 (audit A13) for ANY inputs; outside the bracket the bound is returned with atBound and the residual — never folded into HCO3', () => {
    for (const pco2 of [0, 5, 40, 150, 400]) for (const sid of [-20, 0, 20, 40, 80, 200]) for (const alb of [0, 40, 80]) {
      const a = solvePh(pco2, { sid, albGL: alb, piMmolL: 1.1, hb: 15 });
      expect(a.ph).toBeGreaterThanOrEqual(PH_MIN);
      expect(a.ph).toBeLessThanOrEqual(PH_MAX);
      expect(Number.isFinite(a.hco3)).toBe(true);
      expect(a.hco3).toBeCloseTo(hco3Of(a.ph, Math.max(1, pco2)), 9);
      if (!a.atBound) expect(a.residual).toBe(0);
    }
    const low = solvePh(40, { ...N, sid: 0 });
    expect(low.atBound).toBe(true);
    expect(low.residual).toBeLessThan(0);
  });
  it('lactate and chloride lower pH 1:1 through SID; albumin dilution raises it (Stewart)', () => {
    const a = solvePh(40, N);
    const lac = solvePh(40, { ...N, sid: N.sid - 5 });
    expect(a.be - lac.be).toBeGreaterThan(4);
    expect(a.be - lac.be).toBeLessThan(5.5);
    expect(solvePh(40, { ...N, albGL: 25 }).ph).toBeGreaterThan(a.ph);
  });
  it('BE (Van Slyke) and anion gap', () => {
    expect(baseExcess(7.4, 24.4)).toBeCloseTo(0, 9);
    expect(anionGap(140, 104, 24.4)).toBeCloseTo(11.6, 9);
  });
});
