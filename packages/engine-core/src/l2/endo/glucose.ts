// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// EndocrineModel.cpp (insulin synthesis line) and TissueModel.cpp (liver glucose release threshold 85 mg/dL),
// Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research
// Associates, Inc.; licensed under the Apache License, Version 2.0; modified: re-expressed in TypeScript; the glucose
// disposal is the Bergman minimal model (ours, tables §5c), not Pulse's (see NOTICES N-P18).
//
// Glucose–insulin (tables §5c; annex B3 "Glucose disposal: ours (Bergman), using Pulse's insulin secretion as I(t)"):
//   dG/dt = −(SG + X)·G + SG·Gb·egp + Ra/VG                    G mg/dL, Ra mg/min (dextrose, gut, counter-regulation)
//   dX/dt = −p2·X + p2·SI·si·(I − Ib)                           remote insulin action (/min)
//   dI/dt = −n·I + (sec(G)·secF·beta + exo)/VI                  I µU/mL; exo insulin µU/min (7g boluses/infusions, basal)
//   dIexo/dt = −n·Iexo + exo/VI                                 the exogenous part, so the SECRETED part I − Iexo is known
//   sec(G) = sec0·(5.357·G − 328.56)/(5.357·Gb − 328.56) for G ≥ 80 mg/dL (Pulse), else 0; sec0 = n·VI·Ib
// `egp` multiplies the endogenous production term SG·Gb (stress, glucagon-like counter-regulation below 70 mg/dL,
// liver function from 7d), `si` the insulin sensitivity (stress, cortisol, type 2), `beta` the β-cell capacity
// (type 1: 0, type 2: 0.6). Integrated with 1 s explicit steps (all τ ≥ 2 min). Plain data.
import {
  EGP_DEFICIT_TAU_S, EGP_INSULIN_SUPP, GB_MGDL, GLUCAGON_EGP_PER_MGDL, GUT_BIOAVAIL, GUT_TAU_S, HYPO_L1_MGDL, IB_UU_ML, INS_N_PER_MIN, P2_PER_MIN, PULSE_SEC_INTERCEPT,
  PULSE_SEC_MIN_MGDL, PULSE_SEC_SLOPE, SG_PER_MIN, SI_PER_MIN_PER_UU, UU_PER_UNIT, VG_DL_KG, VI_ML_KG,
} from './params.ts';

export interface GlucoseState {
  g: number; // mg/dL
  x: number; // /min
  i: number; // µU/mL (total)
  iExo: number; // µU/mL of it from exogenous insulin (7g doses, the type 1 basal insulin)
  gb: number; // basal glucose of this patient (profile: type 2 higher)
  gutMg: number; // carbohydrate in the stomach, mg
  gut2Mg: number; // carbohydrate in the intestine, mg
  dexMgMin: number; // IV dextrose infusion, mg/min
  insUuMin: number; // IV insulin infusion, µU/min
  basalExoUuMin: number; // long-acting basal insulin (type 1 profile), µU/min
  egpDef: number; // slow insulinopenic release of hepatic output (0–1)
}

export interface GlucoseInputs {
  weightKg: number;
  egpF: number; // × endogenous production (stress, liver)
  siF: number; // × SI (stress, cortisol, type 2)
  secF: number; // × secretion (α2 suppression)
  beta: number; // β-cell capacity 0–1
  glucagon: number; // counter-regulatory glucagon response 0–1 (type 1: 0)
  dt: number; // s
}

export function createGlucose(gb = GB_MGDL): GlucoseState {
  return { g: gb, x: 0, i: IB_UU_ML, iExo: 0, gb, gutMg: 0, gut2Mg: 0, dexMgMin: 0, insUuMin: 0, basalExoUuMin: 0, egpDef: 0 };
}

function secRel(g: number, gb: number): number {
  if (g < PULSE_SEC_MIN_MGDL) return 0;
  return (PULSE_SEC_SLOPE * g + PULSE_SEC_INTERCEPT) / (PULSE_SEC_SLOPE * gb + PULSE_SEC_INTERCEPT);
}

/** Glucagon-like counter-regulation below 70 mg/dL (Pulse's liver release threshold is 85: ours starts at ADA L1). */
export function counterRegEgp(g: number): number {
  return 1 + GLUCAGON_EGP_PER_MGDL * Math.max(0, HYPO_L1_MGDL - g);
}

export function stepGlucose(s: GlucoseState, x: GlucoseInputs): void {
  const dtMin = x.dt / 60;
  const vg = VG_DL_KG * x.weightKg; // dL
  const vi = VI_ML_KG * x.weightKg; // mL
  const sec0 = INS_N_PER_MIN * vi * IB_UU_ML; // µU/min that holds Ib at Gb
  const k = 1 - Math.exp(-x.dt / GUT_TAU_S);
  const empty = s.gutMg * k; // stomach → intestine
  const gutRa = s.gut2Mg * k * GUT_BIOAVAIL; // intestine → blood, after first-pass uptake
  s.gutMg -= empty;
  s.gut2Mg += empty - s.gut2Mg * k;
  const ra = s.dexMgMin + gutRa / dtMin; // mg/min
  const deficit = Math.max(0, 1 - s.i / IB_UU_ML); // insulinopenia releases hepatic output, slowly
  s.egpDef += (deficit - s.egpDef) * (1 - Math.exp(-x.dt / EGP_DEFICIT_TAU_S));
  const cr = 1 + (counterRegEgp(s.g) - 1) * x.glucagon;
  const egp = SG_PER_MIN * s.gb * x.egpF * cr * (1 + EGP_INSULIN_SUPP * s.egpDef);
  const dG = -(SG_PER_MIN + s.x) * s.g + egp + ra / vg;
  const dX = -P2_PER_MIN * s.x + P2_PER_MIN * SI_PER_MIN_PER_UU * x.siF * (s.i - IB_UU_ML);
  const sec = sec0 * secRel(s.g, s.gb) * x.secF * x.beta;
  const exo = s.insUuMin + s.basalExoUuMin;
  const dI = -INS_N_PER_MIN * s.i + (sec + exo) / vi;
  const dIexo = -INS_N_PER_MIN * s.iExo + exo / vi;
  s.g = Math.max(10, s.g + dG * dtMin);
  s.x = Math.max(-0.05, s.x + dX * dtMin);
  s.i = Math.max(0, s.i + dI * dtMin);
  s.iExo = Math.min(s.i, Math.max(0, s.iExo + dIexo * dtMin));
}

/** IV dextrose bolus (g) — enters the glucose space at once (D50 25 g). */
export function dextroseBolus(s: GlucoseState, grams: number, weightKg: number): void {
  s.g += (grams * 1000) / (VG_DL_KG * weightKg);
}

/** IV dextrose infusion, g/h (D5 at 100 mL/h = 5 g/h). */
export function dextroseInfusion(s: GlucoseState, gPerH: number): void {
  s.dexMgMin = (Math.max(0, gPerH) * 1000) / 60;
}

/** Oral/enteral carbohydrate (g) into the gut (absorbed with τ GUT_TAU_S). */
export function meal(s: GlucoseState, grams: number): void {
  s.gutMg += Math.max(0, grams) * 1000;
}

/** IV insulin bolus (units) into the insulin space. */
export function insulinBolus(s: GlucoseState, units: number, weightKg: number): void {
  const add = (units * UU_PER_UNIT) / (VI_ML_KG * weightKg);
  s.i += add;
  s.iExo += add;
}

/** IV insulin infusion, units/h. */
export function insulinInfusion(s: GlucoseState, unitsPerH: number): void {
  s.insUuMin = (Math.max(0, unitsPerH) * UU_PER_UNIT) / 60;
}
