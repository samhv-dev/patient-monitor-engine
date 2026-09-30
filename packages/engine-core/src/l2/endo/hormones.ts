// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// EndocrineModel.cpp and data/Data.xlsx (Substances: Epinephrine, Norepinephrine), Copyright 2018-2025 Kitware, Inc.
// and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under
// the Apache License, Version 2.0; modified: re-expressed in TypeScript and simplified for the monitor tick (basal
// plasma concentrations and clearance only; the stress, nociception, hypoglycaemia and hypoxia drives are ours: see
// NOTICES N-P18).
//
// Stress hormones (tables §5c; annex B3). Three time scales:
//   symp  neural sympathetic STRESS activity (0–3): noxious × (1 − antinociception) + condition/MH/hypoglycaemia
//         drives; onset τ 25 s, offset τ 3 min (tables: response to laryngoscopy). It acts on the circulation
//         directly (effects.ts) — the baroreflex/chemoreflex stay 7a's, this is the NON-baroreflex stress path.
//   epi   ENDOGENOUS plasma epinephrine (pg/mL): C_ss = basal × (1 + 3·adrenal drive); first-order with Pulse's
//         clearance over Vd 0.2 L/kg (t½ ≈ 2 min). Exogenous epinephrine is Stage 7g's (R51 §1): its plasma-equivalent
//         level arrives as an input (`epiExoPgMl`) and is stored in `epiExo` for the β2/metabolic effects only.
//   ne    NE = basal × (1 + 1.5·symp) spillover (readout; its haemodynamic effect is the `symp` path).
//   cort  cortisol (nmol/L): toward 400·(1 + 2.75·surgical drive) with τ 1.5 h (> 1500 by 4–6 h after incision).
import {
  HUM_DEADBAND_MMHG, HUM_EC50_MMHG, HUM_MAX, HUM_OFF_TAU_S, HUM_ON_TAU_S,
  CORT_BASAL, CORT_GAIN, CORT_TAU_S, DRIVE_HYPERCAPNIA_PER_MMHG, DRIVE_HYPOGLY_PER_MGDL, DRIVE_HYPOTENSION_PER_MMHG,
  DRIVE_HYPOXIA_PER_SAT, EPI_ADRENAL_GAIN, EPI_BASAL_PG_ML, EPI_CL_ML_MIN_KG, EPI_VD_L_KG, HYPO_EPI_THRESHOLD_MGDL,
  NE_BASAL_PG_ML, NE_CL_ML_MIN_KG, NE_SPILL_GAIN, NE_VD_L_KG, SYMP_MAX, SYMP_OFF_TAU_S, SYMP_ON_TAU_S,
  CAT_RESERVE_FLOOR, CAT_RESERVE_SYMP_REF, CAT_RESERVE_TAU_DOWN_S, CAT_RESERVE_TAU_UP_S,
} from './params.ts';

export interface HormoneState {
  symp: number;
  /** FU-4 F2(a): the humoral vasoconstrictor arm (AVP + angiotensin II), 0–1. Propofol does not suppress it. */
  hum: number;
  epi: number; // endogenous plasma epinephrine, pg/mL
  epiExo: number; // exogenous (7g) plasma-equivalent epinephrine, pg/mL — β2 and metabolic effects only
  ne: number;
  cort: number;
  cortDrive: number; // the slow surgical-stress drive integrated for cortisol
  catReserve: number; // FU-7 (audit D9): releasable catecholamine store, 0–1 (1 = replete)
}

/** Inputs of one hormone step (all optional sources resolved by the adapters; neutral values = a resting patient). */
export interface HormoneInputs {
  noxious: number; // 0 none … 1 incision … 1.5 laryngoscopy/sternotomy (tables `noxious`)
  antinoc: number; // 0–1 antinociception (7f; fallback ANTINOC_GA_FALLBACK under GA)
  extraSymp: number; // MH, thyroid storm, sepsis, awareness … (0–3)
  glucoseMgDl: number;
  mapMmHg: number;
  sao2: number; // 0–1
  paco2: number; // mmHg
  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)
  epiExoPgMl: number; // 7g's epinephrine as plasma pg/mL (0 without 7g)
  mapSetMmHg: number; // FU-4 F2(a): the patient's own mean-pressure set point — the humoral arm's unloading reference
}

export function createHormones(): HormoneState {
  return { symp: 0, hum: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0, catReserve: 1 };
}

/** Adrenal (humoral) drive: stress activity plus the metabolic emergencies the baroreflex does not cover. */
export function adrenalDrive(h: HormoneState, x: HormoneInputs): number {
  return (
    h.symp +
    Math.max(0, 65 - x.mapMmHg) * DRIVE_HYPOTENSION_PER_MMHG +
    Math.max(0, 0.85 - x.sao2) * DRIVE_HYPOXIA_PER_SAT +
    Math.max(0, x.paco2 - 50) * DRIVE_HYPERCAPNIA_PER_MMHG +
    Math.max(0, HYPO_EPI_THRESHOLD_MGDL - x.glucoseMgDl) * DRIVE_HYPOGLY_PER_MGDL
  );
}

export function stepHormones(h: HormoneState, x: HormoneInputs, dtS: number): void {
  const target = Math.min(SYMP_MAX, Math.max(0, x.noxious * (1 - Math.min(1, Math.max(0, x.antinoc))) + x.extraSymp));
  const tau = target > h.symp ? SYMP_ON_TAU_S : SYMP_OFF_TAU_S;
  h.symp += (target - h.symp) * (1 - Math.exp(-dtS / tau));
  // FU-7 (audit D9): the releasable store falls with sustained sympathetic drive and refills slowly (`?? 1`: a snapshot
  // written before FU-7 is replete)
  const rTarget = Math.max(CAT_RESERVE_FLOOR, 1 - (1 - CAT_RESERVE_FLOOR) * Math.min(1, h.symp / CAT_RESERVE_SYMP_REF));
  const r0 = h.catReserve ?? 1;
  h.catReserve = r0 + (rTarget - r0) * (1 - Math.exp(-dtS / (rTarget < r0 ? CAT_RESERVE_TAU_DOWN_S : CAT_RESERVE_TAU_UP_S)));
  // FU-4 F2(a): the humoral arm follows baroreceptor UNLOADING with a minutes time constant and is not suppressed by
  // an anaesthetic (Schadt & Ludbrook 1991). The unloading signal is the fall of mean pressure below the set point.
  const u = Math.max(0, x.mapSetMmHg - x.mapMmHg - HUM_DEADBAND_MMHG);
  const hTgt = (HUM_MAX * u) / (u + HUM_EC50_MMHG);
  h.hum += (hTgt - h.hum) * (1 - Math.exp(-dtS / (hTgt > h.hum ? HUM_ON_TAU_S : HUM_OFF_TAU_S)));
  const kE = EPI_CL_ML_MIN_KG / (EPI_VD_L_KG * 1000) / 60; // /s
  const kN = NE_CL_ML_MIN_KG / (NE_VD_L_KG * 1000) / 60;
  const drive = adrenalDrive(h, x);
  const epiSs = EPI_BASAL_PG_ML * (1 + EPI_ADRENAL_GAIN * drive);
  h.epi = epiSs + (h.epi - epiSs) * Math.exp(-kE * dtS);
  h.epiExo = Math.max(0, x.epiExoPgMl);
  const neSs = NE_BASAL_PG_ML * (1 + NE_SPILL_GAIN * h.symp);
  h.ne = neSs + (h.ne - neSs) * Math.exp(-kN * dtS);
  // cortisol: the drive is surgical stress (noxious, not blunted by anaesthesia — Desborough 2000) + adrenal drive
  h.cortDrive = Math.min(2, x.noxious + 0.3 * drive);
  const cSs = CORT_BASAL * (1 + CORT_GAIN * h.cortDrive * x.cortResponse);
  h.cort = cSs + (h.cort - cSs) * Math.exp(-dtS / CORT_TAU_S);
}
