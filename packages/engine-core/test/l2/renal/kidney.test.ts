import { describe, expect, it } from 'vitest';
import { angiotensin, lpReab, natriuresis, renalHaemo, tgfTarget } from '../../../src/l2/renal/kidney.ts';
import { R_AFF, R_AFF_MAX, R_AFF_MIN } from '../../../src/l2/renal/params.ts';

describe('ported renal haemodynamics (annex B2)', () => {
  it('Pulse topology at rest (k = 0.879 calibrates RBF to 17 % of CO 5.6): RBF 952, P_gc ≈ 57.6', () => {
    const h = renalHaemo(93, 5, 0.879, R_AFF, 1, 1, 42);
    expect(h.rbf).toBeCloseTo(952, -1);
    expect(h.pgc).toBeCloseTo(57.6, 0);
  });
  // Named miss (research/44 L2-26). Bowman's pressure is the sourced 18 mmHg (M10 Fig. 15.8, p. 334), no longer the
  // 17.1 fitted to this target. The Pulse divider gives P_gc 57.6 where the figure has 60, so the net filtration
  // pressure is 7.6, not 10. Kf stays Pulse's 14.7: the 16.4 that would restore 125 has no source (Guyton & Hall: 12.5).
  it.fails('rest GFR ≈ 125 mL/min (M10 ch. 15 p. 335: about 180 L/day): measured 117 (P_gc 57.6 vs 60)', () => {
    expect(renalHaemo(93, 5, 0.879, R_AFF, 1, 1, 42).gfr).toBeCloseTo(125, -1);
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
