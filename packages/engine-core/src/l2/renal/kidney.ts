// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// RenalModel.cpp (glomerular filtration 518–578, tubuloglomerular feedback 1823–1978, reabsorption permeability
// 1983–2071) and SetupCircuitsAndCompartments.cpp (renal circuit 1316–1720), Copyright 2018-2025 Kitware, Inc. and
// Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under the
// Apache License, Version 2.0; modified: the 14-node circuit collapsed to one algebraic kidney (series resistances,
// glomerular pressure from the divider), TGF as a first-order controller on R_aff, the reabsorption quadratic used as
// an excreted-fraction curve, plus ADH/stress, volume, PEEP, vasopressor, sepsis and angiotensin terms Pulse lacks
// (see NOTICES N-P19 and docs/plans/stage-7d-organs.md decisions).
import {
  ALBUMIN0_G_L, ANG_GAIN, KF_PER_KIDNEY, LP_A, LP_B, LP_C, NATRIURESIS_EXP, P_BOWMAN, PI_GLOM0, R_AFF, R_AFF_MAX, R_AFF_MIN, R_ART,
  R_EFF, R_GLOM, R_PT, R_RV, FF_REF, HCT_REF,
} from './params.ts';

/** Pulse's tubular reabsorption permeability at renal arterial pressure p (annex B2; minimum at ≈ 200 mmHg). */
export function lpReab(p: number): number {
  const q = Math.min(160, Math.max(20, p)); // above 160 the curve is held (Guyton's plateau region) [ENG]
  return LP_A * q * q + LP_B * q + LP_C;
}

/** Pressure natriuresis: excreted-fraction multiplier relative to pRef (1 at pRef). */
export function natriuresis(p: number, pRef: number): number {
  return (lpReab(pRef) / lpReab(p)) ** NATRIURESIS_EXP;
}

export interface RenalHaemo {
  rbf: number; // mL/min, both kidneys
  pgc: number; // glomerular capillary pressure, mmHg
  gfr: number; // mL/min
}

/**
 * One algebraic kidney (both kidneys in parallel, so resistances ÷ 2): RBF = (Pa − Pv)/ΣR; P_gc from the divider;
 * GFR = Kf·(P_gc − P_B − π_gc)+. `k` scales every resistance (calibration to the resting RBF), `rAff` is the TGF state
 * (per kidney), `effF` the efferent (angiotensin) multiplier, `kfF` the filtration-coefficient multiplier, `pb` Bowman's
 * pressure — raised to the intra-abdominal pressure when that is higher (parenchymal compression: the WSACS filtration
 * gradient MAP − 2·IAP [TXT]; without it IAP 25 still filtered at RPP 38 because it only raised the venous back-pressure).
 */
export function renalHaemo(pa: number, pv: number, k: number, rAff: number, effF: number, kfF: number, albuminGL: number, pb = P_BOWMAN, hct = HCT_REF): RenalHaemo {
  const pre = (k * (R_ART + rAff + R_GLOM / 2)) / 2;
  const post = (k * (R_GLOM / 2 + R_EFF * effF + R_PT + R_RV)) / 2;
  const rbf = Math.max(0, pa - pv) / (pre + post);
  const pgc = pv + rbf * post;
  return { rbf, pgc, gfr: filtration(pgc, pb, 2 * KF_PER_KIDNEY * kfF, albuminGL, rbf * (1 - hct)) };
}

/**
 * FU-9 H2 (research/13): filtration equilibrium. The glomerular oncotic pressure rises along the capillary as protein-free
 * fluid leaves it; its mean is π̄ = π_a·(1 + 1/(1 − FF))/2 with FF = GFR/RPF (Deen, Robertson & Brenner 1972 Am J Physiol
 * 223:1178). π_a follows the albumin as before, normalised at the tables' resting FF so the healthy reference keeps GFR
 * 125. GFR is the root of G = Kf·(P_gc − P_B − π̄(G/RPF)), found by bisection (monotone), so FF saturates near 0.3–0.35
 * and GFR now falls when the plasma flow does (class III, PEEP) instead of being held at any RBF.
 */
export function filtration(pgc: number, pb: number, kf: number, albuminGL: number, rpf: number): number {
  const piA = (PI_GLOM0 * (albuminGL / ALBUMIN0_G_L)) / meanOncotic(FF_REF);
  if (rpf <= 0 || kf * (pgc - pb - piA) <= 0) return 0;
  let lo = 0;
  let hi = Math.min(kf * (pgc - pb - piA), 0.95 * rpf);
  for (let i = 0; i < 30; i++) {
    const g = 0.5 * (lo + hi);
    if (kf * (pgc - pb - piA * meanOncotic(g / rpf)) - g > 0) lo = g;
    else hi = g;
  }
  return 0.5 * (lo + hi);
}
/** Mean ÷ afferent glomerular oncotic pressure at a filtration fraction ff (linear protein concentration profile). */
export const meanOncotic = (ff: number): number => (1 + 1 / (1 - Math.min(0.95, Math.max(0, ff)))) / 2;

/** The R_aff (per kidney) that would restore GFR to gfrSet at these pressures — TGF's target — clamped to Pulse's range. */
export function tgfTarget(pa: number, pv: number, k: number, effF: number, kfF: number, albuminGL: number, gfrSet: number, pb = P_BOWMAN, hct = HCT_REF): number {
  const post = (k * (R_GLOM / 2 + R_EFF * effF + R_PT + R_RV)) / 2;
  const piA = (PI_GLOM0 * (albuminGL / ALBUMIN0_G_L)) / meanOncotic(FF_REF);
  // FU-9 H2: the oncotic pressure the target GFR meets depends on the plasma flow the target resistance gives — a
  // short fixed point from the resting filtration fraction (converges in 3–4 steps)
  let rAff = R_AFF;
  let ff = FF_REF;
  for (let i = 0; i < 4; i++) {
    const pgcStar = gfrSet / (2 * KF_PER_KIDNEY * kfF) + pb + piA * meanOncotic(ff);
    if (pgcStar <= pv + 1e-6 || pa <= pgcStar) return R_AFF_MIN;
    const q = (pgcStar - pv) / post;
    rAff = Math.min(R_AFF_MAX, Math.max(R_AFF_MIN, (2 * (pa - pgcStar)) / (q * k) - R_ART - R_GLOM / 2));
    const rbf = Math.max(1e-6, pa - pv) / ((k * (R_ART + rAff + R_GLOM / 2)) / 2 + post);
    ff = gfrSet / Math.max(1e-6, rbf * (1 - hct));
  }
  return rAff;
}

/** Angiotensin/efferent activation 0–1 [ENG]: RPP below 80 (0 → 1 over 80 → 40) or effective volume loss (1 at −20 %);
 *  the volume term fades out between RPP 80 and 110 — high renal perfusion pressure suppresses renin release (without
 *  it a low-CO, high-MAP state kept the efferent tone on and GFR reached 550 mL/min at MAP 187 in the engine). */
export function angiotensin(rpp: number, eabv: number): number {
  const vol = ((1 - eabv) / 0.2) * Math.min(1, Math.max(0, (110 - rpp) / 30));
  return Math.min(1, Math.max(0, (80 - rpp) / 40, vol));
}
export const effFactor = (ang: number): number => 1 + ANG_GAIN * ang;
export { R_AFF };
