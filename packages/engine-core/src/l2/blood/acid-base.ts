// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// Saturation.cpp (lines 60–120) and BloodChemistryModel.cpp (line 217), Copyright 2018-2025 Kitware, Inc. and
// Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under the
// Apache License, Version 2.0; modified: re-expressed in TypeScript for one arterial pool; the strong-ion difference is
// computed every step from Na, K, iCa, Mg, Cl, lactate and other anions (Pulse holds it fixed at 40.5); albumin and
// phosphate come from the blood state (Pulse hard-codes 45 g/L); an Hb buffer term is added; pH is found by a
// BOUNDED bisection with no error sink (see NOTICES N-P08). Primary model: Figge, Mydosh & Fencl, J Lab Clin Med
// 1992;120:713; Van Slyke standard base excess.
//
// Electroneutrality (tables §5b.1, annex B1, audit #5/A13), all mEq/L:
//   f(pH) = SID − HCO3(pH, PCO2) − Alb·(0.123·pH − 0.631) − Pi·(0.309·pH − 0.469) − βHb·(pH − 7.4) = 0
//   HCO3  = 0.0307·PCO2·10^(pH − 6.1)          (plasma CO2 solubility 0.0307 mmol/L/mmHg; blood-gas analyser form)
//   βHb   = 1.43·Hb/3                            (the ECF-averaged Hb buffer of the Van Slyke equation, Hb_ECF ≈ Hb/3)
// f is strictly decreasing in pH, so the root is unique; it is bracketed in [6.5, 7.9] (audit A13: survivable
// extremes incl. untreated cardiac arrest) and bisected to 1e-4 pH. A root outside the bracket returns the bound with `atBound` set and the
// residual reported — the residual is never pushed into bicarbonate (audit never-copy list).

export const PH_MIN = 6.5; // audit A13
export const PH_MAX = 7.9;
export const CO2_SOL = 0.0307; // mmol/L/mmHg
export const PH_TOL = 1e-4;
export const PH_MAX_ITER = 40;

export interface Chem {
  sid: number; // mEq/L (dynamic: see solutes.ts `sidOf`)
  albGL: number; // g/L
  piMmolL: number; // mmol/L
  hb: number; // g/dL (buffer term)
}

export interface AcidBase {
  ph: number;
  hco3: number;
  be: number; // standard base excess (Van Slyke), mmol/L
  atot: number; // weak-acid anions (albumin + phosphate + Hb buffer offset), mEq/L
  iter: number;
  atBound: boolean;
  residual: number; // mEq/L at the returned pH (0 unless atBound)
}

export function hco3Of(ph: number, pco2: number): number {
  return CO2_SOL * pco2 * 10 ** (ph - 6.1);
}

function weakAnions(ph: number, c: Chem): number {
  return c.albGL * (0.123 * ph - 0.631) + c.piMmolL * (0.309 * ph - 0.469) + ((1.43 * c.hb) / 3) * (ph - 7.4);
}

/** The charge-balance residual f(pH) (mEq/L); positive means the pH is too low. */
export function chargeResidual(ph: number, pco2: number, c: Chem): number {
  return c.sid - hco3Of(ph, pco2) - weakAnions(ph, c);
}

/** Standard base excess, Van Slyke (tables §5b.1): 0.93·(HCO3 − 24.4 + 14.83·(pH − 7.4)). */
export function baseExcess(ph: number, hco3: number): number {
  return 0.93 * (hco3 - 24.4 + 14.83 * (ph - 7.4));
}

/** Bounded bisection on pH ∈ [6.5, 7.9]; ≤ 40 iterations (converges in 14 to 1e-4). */
export function solvePh(pco2: number, c: Chem): AcidBase {
  const p = Math.max(1, pco2);
  let lo = PH_MIN;
  let hi = PH_MAX;
  const fLo = chargeResidual(lo, p, c);
  const fHi = chargeResidual(hi, p, c);
  let ph: number;
  let iter = 0;
  let atBound = false;
  if (fLo <= 0) {
    ph = lo;
    atBound = true;
  } else if (fHi >= 0) {
    ph = hi;
    atBound = true;
  } else {
    while (hi - lo > PH_TOL && iter < PH_MAX_ITER) {
      const mid = 0.5 * (lo + hi);
      if (chargeResidual(mid, p, c) > 0) lo = mid;
      else hi = mid;
      iter++;
    }
    ph = 0.5 * (lo + hi);
  }
  const hco3 = hco3Of(ph, p);
  return { ph, hco3, be: baseExcess(ph, hco3), atot: weakAnions(ph, c), iter, atBound, residual: atBound ? chargeResidual(ph, p, c) : 0 };
}

/** Anion gap without K (the blood-gas analyser convention): Na − Cl − HCO3. */
export function anionGap(na: number, cl: number, hco3: number): number {
  return na - cl - hco3;
}
