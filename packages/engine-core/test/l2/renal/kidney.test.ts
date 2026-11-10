import { describe, expect, it } from 'vitest';
import { angiotensin, lpReab, natriuresis, renalHaemo, tgfTarget } from '../../../src/l2/renal/kidney.ts';
import { createRenal, stepRenal } from '../../../src/l2/renal/model.ts';
import { KF_PER_KIDNEY, R_AFF, R_AFF_MAX, R_AFF_MIN } from '../../../src/l2/renal/params.ts';

const REST = { map: 93, cvp: 5, iap: 0, coLpm: 5.6, bvRel: 1, albuminGL: 42, anaesthesia: 'none' as const, pawExcessCmH2O: 0, alphaExcess: 0, sepsis: 0 };

describe('ported renal haemodynamics (annex B2)', () => {
  it('Pulse topology at rest (k = 0.879 calibrates RBF to 17 % of CO 5.6): RBF 952, P_gc ≈ 57.6', () => {
    const h = renalHaemo(93, 5, 0.879, R_AFF, 1, 1, 42);
    expect(h.rbf).toBeCloseTo(952, -1);
    expect(h.pgc).toBeCloseTo(57.6, 0);
  });
  // Control for the brief-136 re-records (research/44 L2-26): Pulse's Kf 14.7 and the constant R_AFF on the Pulse
  // divider reproduce the previous engine's resting GFR 117.1 (P_gc 57.6) — the old fixture.
  it('control: Pulse Kf 14.7 with the constant R_AFF reproduces the old resting GFR 117.1', () => {
    expect(renalHaemo(93, 5, 0.8793, R_AFF, 1, (3.67647 * 2 * 2) / (2 * KF_PER_KIDNEY), 42).gfr).toBeCloseTo(117.1, 0);
  });
  // Was a named miss (measured 117). Cause of the pass (brief 136, research/44 L2-26): the set point TGF defends is the
  // sourced 125 (M10 ch. 15 p. 334: about 180 L/day), Kf is the sourced 12.5 (Fig. 15.8: GFR 125 ÷ net 10), and the
  // resting afferent tone is the feedback's equilibrium, no longer Pulse's constant R_AFF.
  it('rest GFR ≈ 125 mL/min (M10 ch. 15 p. 334: about 180 L/day)', () => {
    expect(createRenal(REST, 70).gfr).toBeCloseTo(125, 0);
  });
  // Predictions, nothing fitted to them: P_gc against M10 Table 15.2 (p. 334; Guyton & Hall 13e: glomerular capillaries
  // 60 at the start, 59 at the end, at renal artery 100) and Fig. 15.8 (60); FF against Guyton & Hall 14e ch. 27 (≈ 0.2;
  // the validation band 0.15–0.25, RH-01c) and the engine's reference FF_REF 0.239.
  it('predicted P_gc at rest is the figure\'s 60 (Table 15.2: 60 → 59); filtration fraction 0.239 within 0.15–0.25', () => {
    const s = createRenal(REST, 70);
    expect(s.pgc).toBeGreaterThanOrEqual(59);
    expect(s.pgc).toBeLessThanOrEqual(60 + 1e-6);
    const ff = s.gfr / (0.55 * s.rbf);
    expect(ff).toBeCloseTo(0.239, 3);
    expect(ff).toBeGreaterThanOrEqual(0.15);
    expect(ff).toBeLessThanOrEqual(0.25);
  });
  it('the resting afferent tone is the TGF equilibrium, inside the clamps with room (1.74 × R_AFF_MIN, 0.115 × R_AFF_MAX), and stays there', () => {
    const s = createRenal(REST, 70);
    expect(s.rAff / R_AFF_MIN).toBeGreaterThan(1.5);
    expect(s.rAff / R_AFF_MAX).toBeLessThan(0.2);
    const r0 = s.rAff;
    for (let i = 0; i < 1800; i++) stepRenal(s, REST, 1);
    expect(s.rAff).toBeCloseTo(r0, 6);
    expect(s.rbf).toBeCloseTo(952, 3); // resting RBF unchanged by construction (k calibrates the equilibrium to 17 % of CO)
  });
  it('R_AFF_MIN puts the plateau knee at the lower limit of autoregulation, RPP 80 (tables §5.2 rblLL)', () => {
    const at = (map: number) => { const s = createRenal(REST, 70); for (let i = 0; i < 1800; i++) stepRenal(s, { ...REST, map }, 1); return s; };
    expect(at(85).gfr).toBeCloseTo(125, 0); // MAP 85 at CVP 5 = RPP 80
    expect(at(85).rAff / R_AFF_MIN).toBeCloseTo(1, 2);
    expect(at(82).gfr).toBeLessThan(124);
  });
  it('filtration stops when P_gc < P_Bowman + π; albumin loss raises GFR', () => {
    expect(renalHaemo(55, 5, 0.879, R_AFF, 1, 1, 42).gfr).toBe(0);
    expect(renalHaemo(93, 5, 0.879, R_AFF, 1, 1, 30).gfr).toBeGreaterThan(renalHaemo(93, 5, 0.879, R_AFF, 1, 1, 42).gfr);
    expect(renalHaemo(63, 25, 0.879, R_AFF, 1, 1, 42, 25).gfr).toBe(0); // IAP 25: RPP 38 and Bowman ≈ IAP (WSACS MAP − 2·IAP)
  });
  it('TGF + myogenic target restores the set GFR up to MAP 180 and stays inside the R_aff range', () => {
    const r = tgfTarget(180, 5, 0.879, 1, 1, 42, 125);
    expect(renalHaemo(180, 5, 0.879, r, 1, 1, 42).gfr).toBeCloseTo(125, 0);
    expect(tgfTarget(260, 5, 0.879, 1, 1, 42, 125)).toBe(R_AFF_MAX);
    expect(tgfTarget(50, 5, 0.879, 1, 1, 42, 125)).toBe(R_AFF_MIN);
  });
  it('pressure natriuresis: U(150)/U(100) = 3, U(80)/U(100) ≈ 0.67 (tables U); curve held above 160', () => {
    expect(natriuresis(150, 100)).toBeCloseTo(3, 1);
    expect(natriuresis(80, 100)).toBeCloseTo(0.66, 1);
    expect(lpReab(180)).toBe(lpReab(160));
  });
  it('angiotensin: 0 at RPP 80 and normal volume, 1 at RPP 40 or −20 % effective volume (at RPP ≤ 80)', () => {
    expect(angiotensin(85, 1)).toBe(0);
    expect(angiotensin(40, 1)).toBe(1);
    expect(angiotensin(75, 0.8)).toBeCloseTo(1, 9);
    expect(angiotensin(95, 0.8)).toBeCloseTo(0.5, 9); // the volume term fades over RPP 80–110 (renin suppressed)
    expect(angiotensin(130, 0.5)).toBe(0);
  });
});
