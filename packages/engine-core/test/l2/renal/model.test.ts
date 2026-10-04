import { describe, expect, it } from 'vitest';
import { renalHaemo } from '../../../src/l2/renal/kidney.ts';
import { createRenal, giveFurosemide, stepRenal, uopOver, volumeFactor, type RenalInputs, type RenalState } from '../../../src/l2/renal/model.ts';

const W = 70;
const BASE: RenalInputs = { map: 93, cvp: 5, iap: 0, coLpm: 5.6, bvRel: 1, albuminGL: 42, anaesthesia: 'none', pawExcessCmH2O: 0, alphaExcess: 0, sepsis: 0 };
const mlKgH = (s: RenalState) => (s.uopMlMin * 60) / W;
function hold(s: RenalState, inp: RenalInputs, secs: number): RenalState {
  for (let i = 0; i < secs; i++) stepRenal(s, inp, 1);
  return s;
}

describe('kidney (Pulse-ported haemodynamics + tables §5.2 output)', () => {
  it('rest: RBF 17 % of CO, P_gc ≈ 58, GFR ≈ 130, UOP 1.0 mL/kg/h awake, 0.6 under GA', () => {
    const s = createRenal(BASE, W);
    expect(s.rbf).toBeCloseTo(952, -1);
    expect(s.pgc).toBeGreaterThan(55);
    expect(s.pgc).toBeLessThan(60);
    expect(s.gfr).toBeCloseTo(125, 0); // tables/annex 180 L/day
    expect(mlKgH(hold(s, BASE, 600))).toBeCloseTo(1.0, 2);
    const ga = { ...BASE, anaesthesia: 'general' as const };
    expect(mlKgH(hold(createRenal(ga, W), ga, 600))).toBeCloseTo(0.6, 2);
  });
  it('UOP–MAP curve (awake, CVP 5, 30 min per step): 0 at RPP ≤ 50, rising through 65–80, 3× at 150', () => {
    const at = (map: number) => mlKgH(hold(createRenal(BASE, W), { ...BASE, map }, 1800));
    expect(at(50)).toBe(0);
    expect(at(65)).toBeGreaterThan(0.15); // prototype 0.24 — [ENG] regression band on Pulse's curve (decision 8); the tables' linear U is Task 20's it.fails
    expect(at(65)).toBeLessThan(0.4);
    expect(at(80)).toBeGreaterThan(0.6); // prototype 0.76
    expect(at(80)).toBeLessThan(0.9);
    expect(at(150) / at(100)).toBeGreaterThanOrEqual(3 * 0.85); // prototype 3.0 (tables U: 3× at 150 vs 100, ±15 %)
    expect(at(150) / at(100)).toBeLessThanOrEqual(3 * 1.15);
    for (const map of [85, 120, 180]) expect(hold(createRenal(BASE, W), { ...BASE, map }, 1800).rbf / 952).toBeGreaterThan(0.97); // plateau RPP 80–180 (tables)
    expect(hold(createRenal(BASE, W), { ...BASE, map: 180 }, 1800).rbf / 952).toBeLessThan(1.03); // TGF + myogenic
  });
  it('tables §7 check 20: HFrEF MAP 65 / CVP 12 / CO 3.5 → UOP 0.1–0.15; dobutamine (MAP 72, CVP 10, CO +30 %) → 0.2–0.3 within 30–60 min', () => {
    const s = hold(createRenal(BASE, W), { ...BASE, map: 65, cvp: 12, coLpm: 3.5 }, 3600);
    expect(mlKgH(s)).toBeGreaterThanOrEqual(0.1);
    expect(mlKgH(s)).toBeLessThanOrEqual(0.15); // prototype 0.114
    const dobu = { ...BASE, map: 72, cvp: 10, coLpm: 4.55 };
    hold(s, dobu, 1800);
    expect(mlKgH(s)).toBeGreaterThanOrEqual(0.2); // prototype 0.233 at 30 min
    expect(mlKgH(s)).toBeLessThanOrEqual(0.3);
    hold(s, dobu, 1800);
    expect(mlKgH(s)).toBeLessThanOrEqual(0.3); // prototype 0.284 at 60 min (neurohumoral washout τ 45 min)
  });
  it('class III haemorrhage → oliguria < 0.3 (tables 17a); fluids restore > 0.5 by 60 min [ENG band: gradual, washout τ 45 min]', () => {
    const s = hold(createRenal(BASE, W), { ...BASE, map: 65, cvp: 2, coLpm: 3.4, bvRel: 0.65 }, 1800);
    expect(mlKgH(s)).toBeLessThan(0.3); // prototype 0.046
    hold(s, { ...BASE, map: 85, cvp: 6, coLpm: 5.2, bvRel: 0.95 }, 3600);
    expect(mlKgH(s)).toBeGreaterThan(0.5); // prototype 0.533 at 60 min (hourly mean 0.36)
    expect(uopOver(s, 60)).toBeLessThan(mlKgH(s)); // still rising
  });
  it('filtration fraction rises in low flow (angiotensin keeps GFR while RBF falls)', () => {
    const s = hold(createRenal(BASE, W), { ...BASE, map: 70, cvp: 5, coLpm: 4 }, 1800);
    const ff = s.gfr / (0.55 * s.rbf);
    expect(ff).toBeGreaterThan(0.25);
    expect(renalHaemo(93, 5, s.p.k, s.rAff, 1, 1, 42).gfr).toBeGreaterThan(0);
  });
  it('furosemide 40 mg IV: peak 6–9 mL/min at 15–30 min, ≈ 1–1.3 L over 4 h', () => {
    const s = createRenal(BASE, W);
    giveFurosemide(s, 40);
    let tot = 0;
    let peak = 0;
    for (let i = 0; i < 4 * 3600; i++) {
      stepRenal(s, BASE, 1);
      tot += s.uopMlMin / 60;
      peak = Math.max(peak, s.uopMlMin);
    }
    expect(peak).toBeGreaterThan(6);
    expect(peak).toBeLessThan(9);
    expect(tot).toBeGreaterThan(900);
    expect(tot).toBeLessThan(1400);
  });
  it('calibrated on the healthy reference, settled at the start: a patient who starts in shock is oliguric at t = 0 (no NaN)', () => {
    const s = createRenal({ ...BASE, map: 55, cvp: 12, coLpm: 3.5 }, W);
    expect(s.p.gfrSet).toBeCloseTo(125, 0);
    // FU-9 H2 (E-FU9-4): with filtration equilibrium the oncotic pressure at zero filtration is the AFFERENT one (27.7, the
    // mean 32 only at the resting FF), so a shocked kidney still filters a little: GFR 18 (was exactly 0), urine 0.03
    // mL/kg/h. The property — oliguric at t = 0, calibrated on the healthy reference — is asserted, not the zero.
    expect(s.gfr).toBeLessThan(0.2 * s.p.gfrSet);
    expect((s.uopMlMin * 60) / W).toBeLessThan(0.05);
    stepRenal(s, { ...BASE, map: 55, cvp: 12, coLpm: 3.5 }, 1);
    expect(Number.isFinite(s.uopMlMin)).toBe(true);
  });
  it('volume factor V: 0.5 at −15 %, 0.2 at −30 %', () => {
    expect(volumeFactor(0.85)).toBeCloseTo(0.5, 9);
    expect(volumeFactor(0.7)).toBeCloseTo(0.2, 9);
  });
  it('KDIGO: 6 h below 0.5 mL/kg/h → stage 1; teaching compression 12× reaches it in 30 min (Q40)', () => {
    const low = { ...BASE, map: 62 };
    const real = hold(createRenal(BASE, W), low, 6 * 3600 + 700);
    expect(real.akiStage).toBe(1);
    const fast = createRenal(BASE, W);
    fast.timeScale = 12;
    hold(fast, low, 1900);
    expect(fast.akiStage).toBeGreaterThanOrEqual(1);
  });
});
