// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/controller/
// SetupCircuitsAndCompartments.cpp (tissue branch, lines 2085–2865) and src/cpp/engine/common/system/physiology/
// RenalModel.cpp (Landis–Pappenheimer relation, lines 1634–1640), Copyright 2018-2025 Kitware, Inc. and Contributors,
// itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under the Apache License,
// Version 2.0; modified: the per-organ vascular → R_t → extracellular → lymph topology is collapsed to ONE whole-body
// plasma ↔ interstitium exchange with the colloid-osmotic source switched ON (Pulse leaves it at 0) and a lymph
// return (Pulse's is 0), re-expressed in TypeScript and fitted to Hahn's crystalloid kinetics (see NOTICES N-P23).
//
// Compartments (tables §5b.4): plasma Vp, interstitium Visf, cells Vicf (mL); red cells as Hb mass (g, MCHC 1/3 g/mL).
// Starling exchange, plasma → interstitium (mL/min):
//   J = Kf·kfMult·[ΔPc − Pisf − σ·((πp − πp0) − (πisf − πisf0))]      ΔPc = PC_PER_ML·(V_blood − V_blood0)
//   πp = scaled Nitta(albumin + colloid, globulins) (FU-9 F8)   Pisf = ΔVisf/(C·Visf0)   πisf = πisf0·Visf0/Visf
//   lymph (extra) = LYMPH_GAIN·max(−2, Pisf)                          elimination = kEl·max(0, V_blood − V_blood0)
import { ALB_RESTORE_TAU_MIN, CISF_PER_ML, COLLOID_T12_MIN, GLOBULIN_GL, K_EL_AWAKE, K_EL_GA_FACTOR, KF_ML_MIN_MMHG, LYMPH_GAIN, MCHC_G_PER_ML, OSM_TAU_MIN, PC_PER_ML, PI_ISF0, SIGMA_PROTEIN, type BloodPatient, type Composition } from './params.ts';

export interface Flow {
  rate: number; // mL/min (whole fluid / whole blood)
  until: number; // sim s (1e9 = until changed)
  /** Volume still to run (bolus orders): delivery stops at exactly the ordered volume whatever the grid phase. */
  leftMl?: number;
  comp: Composition | null; // null = haemorrhage (whole blood out)
}

export interface FluidState {
  vp: number;
  visf: number;
  vicf: number;
  hbG: number; // haemoglobin mass
  albG: number; // plasma albumin mass
  globG: number; // plasma globulin mass (g) — FU-9 F8: constant unless bled or given, so it dilutes but never follows albumin
  colloidG: number; // synthetic colloid (albumin-equivalent) mass
  ref: { vp: number; visf: number; vicf: number; bv: number; pi0: number; albGL: number };
  flows: Flow[];
  kfMult: number; // capillary leak multiplier (sepsis/anaphylaxis/burns: 7f sets it) — 1 normal
  sigma: number; // protein reflection coefficient (leak lowers it)
  anaesthesia: boolean; // elimination ×0.2 under GA (tables `t12El`)
  // outputs of the last step (mL/min) for tests and the lung-water hook
  jFilt: number;
  refill: number;
}

/** Landis–Pappenheimer colloid osmotic pressure (mmHg) of total protein TP (g/dL): 2.1·TP + 0.16·TP² + 0.009·TP³. */
export function landis(tpGdl: number): number {
  return 2.1 * tpGdl + 0.16 * tpGdl ** 2 + 0.009 * tpGdl ** 3;
}

export const rbcMl = (f: FluidState): number => f.hbG / MCHC_G_PER_ML;
export const bloodMl = (f: FluidState): number => f.vp + rbcMl(f);
export const hbOf = (f: FluidState): number => (100 * f.hbG) / bloodMl(f); // g/dL
export const albGL = (f: FluidState): number => (1000 * f.albG) / f.vp;
export const ecfMl = (f: FluidState): number => f.vp + f.visf;
/**
 * Plasma colloid osmotic pressure (mmHg). FU-9 F8 (R50 ruling R2): albumin and globulins each by their own polynomial
 * (Nitta S et al. Tohoku J Exp Med 1981;135:43–9: albumin 2.8C + 0.18C² + 0.012C³, globulin 0.9C + 0.12C² + 0.004C³,
 * C in g/dL), scaled by COP_SCALE so that the tables' normal plasma (albumin 40, globulins 24 g/L: Landis–Pappenheimer at
 * TP 6.4 = 22.35 mmHg; the globulin mass is GLOBULIN_GL, params.ts) is exactly unchanged. Albumin then carries ≈ 80 % of the COP: hypoalbuminaemia keeps the
 * globulins' share (albumin 20 → 11.7 mmHg; Weil 1979: 12–16) and 5 % albumin is iso-oncotic (≈ 25 mmHg). Synthetic
 * colloid counts as albumin-equivalent grams (Stage 7c's convention).
 */
const nittaAlb = (c: number): number => 2.8 * c + 0.18 * c ** 2 + 0.012 * c ** 3;
const nittaGlob = (c: number): number => 0.9 * c + 0.12 * c ** 2 + 0.004 * c ** 3;
export const COP_SCALE = landis(6.4) / (nittaAlb(4) + nittaGlob(2.4));
export function copPlasma(f: FluidState): number {
  return COP_SCALE * (nittaAlb((100 * (f.albG + f.colloidG)) / f.vp) + nittaGlob((100 * f.globG) / f.vp)); // g/dL
}

export function createFluids(p: BloodPatient, albumin: number): FluidState {
  const albG = (albumin * p.plasmaMl) / 1000;
  const f: FluidState = {
    vp: p.plasmaMl, visf: p.isfMl, vicf: p.icfMl, hbG: (p.hb * p.bvMl) / 100, albG, globG: (GLOBULIN_GL * p.plasmaMl) / 1000, colloidG: 0,
    ref: { vp: p.plasmaMl, visf: p.isfMl, vicf: p.icfMl, bv: p.bvMl, pi0: 0, albGL: albumin },
    flows: [], kfMult: 1, sigma: SIGMA_PROTEIN, anaesthesia: false, jFilt: 0, refill: 0,
  };
  f.ref.pi0 = copPlasma(f);
  return f;
}

/**
 * FU-9 F4: the protein reflection coefficient of a leaky endothelium. Inflammation opens LARGE pores, which carry most of
 * the extra hydraulic conductance and most of the protein flux (two-pore theory, the DIRECTION: Rippe & Haraldsson 1994
 * Physiol Rev 74:163). That the non-reflected share (1 − σ) grows with the same factor as the whole Kf is an assumption
 * [ENG]: σ = 1 − (1 − σ0)·kfMult, floor SIGMA_LEAK_FLOOR [ENG]. Normal (kfMult 1) → 0.9; warm septic shock (kfMult 2.6)
 * → 0.74; kfMult 3 → 0.7. It applies to every writer of `fl.kfMult` — 7e's sepsis, anaphylaxis and burns alike.
 */
export const SIGMA_LEAK_FLOOR = 0.3;
export function leakSigma(kfMult: number): number {
  return Math.max(SIGMA_LEAK_FLOOR, 1 - (1 - SIGMA_PROTEIN) * Math.max(1, kfMult));
}

/** Plasma ↔ interstitium exchange J (mL/min, positive = filtration out of plasma) and extra lymph (mL/min). */
export function starling(f: FluidState): { j: number; lymph: number; pisf: number } {
  const dPc = PC_PER_ML * (bloodMl(f) - f.ref.bv);
  const pisf = (f.visf - f.ref.visf) / (CISF_PER_ML * f.ref.visf);
  const dPiP = copPlasma(f) - f.ref.pi0;
  const dPiI = PI_ISF0 * (f.ref.visf / f.visf - 1);
  const j = KF_ML_MIN_MMHG * f.kfMult * (dPc - pisf - f.sigma * (dPiP - dPiI));
  return { j, lymph: LYMPH_GAIN * Math.max(-2, pisf), pisf };
}

/**
 * One step of dtS seconds (Euler; stable for dt ≤ 1 s: the fastest mode has τ ≈ 3 min). `osmRatio` drives the
 * ISF ↔ cell water shift. `elimMlMin` (7d's urine output, request R-7D-2) replaces the volume-receptor elimination
 * when given. Returns the volumes of whole blood lost and fluid given this step (mL) with their compositions, so
 * solutes.ts can move the matching amounts.
 */
export function stepFluids(f: FluidState, t: number, dtS: number, osmRatio: number, elimMlMin?: number): { bledMl: number; bledPlasmaMl: number; elimMl: number; given: { ml: number; comp: Composition }[] } {
  const dtM = dtS / 60;
  let bled = 0;
  let bledPlasma = 0;
  const given: { ml: number; comp: Composition }[] = [];
  for (const fl of f.flows) {
    if (fl.until <= t - 1e-9) continue;
    const ml = fl.leftMl === undefined ? fl.rate * dtM : Math.min(fl.rate * dtM, fl.leftMl);
    if (fl.comp === null) {
      const hct = rbcMl(f) / bloodMl(f);
      const out = Math.min(ml, 0.5 * bloodMl(f));
      if (fl.leftMl !== undefined) fl.leftMl -= out;
      bled += out;
      bledPlasma += out * (1 - hct);
      f.hbG -= (out * hct) * MCHC_G_PER_ML;
      f.albG -= (f.albG / f.vp) * out * (1 - hct);
      f.globG -= (f.globG / f.vp) * out * (1 - hct);
      f.colloidG -= (f.colloidG / f.vp) * out * (1 - hct);
      f.vp -= out * (1 - hct);
    } else {
      const c = fl.comp;
      if (fl.leftMl !== undefined) fl.leftMl -= ml;
      f.vp += ml * (1 - c.hct);
      f.hbG += ml * c.hct * MCHC_G_PER_ML;
      f.albG += (c.albGL * ml * (1 - c.hct)) / 1000;
      f.globG += (c.globGL * ml * (1 - c.hct)) / 1000;
      f.colloidG += (c.colloidGL * ml) / 1000;
      given.push({ ml, comp: c });
    }
  }
  f.flows = f.flows.filter((fl) => fl.until > t && (fl.leftMl === undefined || fl.leftMl > 1e-9));
  const s = starling(f);
  const kEl = K_EL_AWAKE * (f.anaesthesia ? K_EL_GA_FACTOR : 1);
  const elim = elimMlMin ?? kEl * Math.max(0, bloodMl(f) - f.ref.bv); // volume receptors sense BLOOD volume (so a transfused unit's plasma is shed)
  f.jFilt = s.j;
  f.refill = Math.max(0, -s.j + s.lymph);
  f.vp += (-s.j + s.lymph - elim) * dtM;
  f.visf += (s.j - s.lymph) * dtM;
  // osmotic water shift ISF ↔ cells: cells swell when ECF osmolality falls (osmRatio = osmIcf/osmEcf > 1)
  const vicfEq = f.ref.vicf * osmRatio;
  const w = ((vicfEq - f.vicf) * dtM) / OSM_TAU_MIN;
  f.vicf += w;
  f.visf -= w;
  f.colloidG *= Math.exp((-Math.LN2 * dtM) / COLLOID_T12_MIN);
  const albDef = (f.ref.albGL * f.vp) / 1000 - f.albG; // g below the baseline concentration
  if (albDef > 0) f.albG += (albDef * dtM) / ALB_RESTORE_TAU_MIN;
  return { bledMl: bled, bledPlasmaMl: bledPlasma, elimMl: elim * dtM, given };
}
