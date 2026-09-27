// Stage 7c public types (tables §5b; plan decisions 11–13), in their own file so parallel stages do not collide in
// types.ts. types.ts adds `BloodCommandBody` and `BloodEvent` to its unions and `blood?: BloodProfile` to PatientProfile.
import type { SimSeconds } from './types.ts';

/**
 * `crystalloid` (Stage 7a's name) and a missing `fluid` both mean 0.9 % saline; 7a's `colloid` means 4 % gelatin and
 * its `blood` means whole blood (plan decision 11).
 */
export type BloodFluidId = 'saline' | 'rl' | 'balanced' | 'albumin5' | 'gelatin' | 'd5w' | 'glycine' | 'crystalloid' | 'colloid' | 'blood';
export type BloodProductId = 'rbc' | 'ffp' | 'platelets' | 'wholeBlood';
export type BloodDrugId =
  | 'succinylcholine' | 'insulinDextrose' | 'salbutamol' | 'calciumChloride' | 'calciumGluconate' | 'sodiumBicarbonate' | 'magnesium';

/**
 * Brief §7.2 ClinicalEvent members Stage 7c implements (volumes mL, rates mL/min, times s). The `drug` member is the
 * FALLBACK shape only: with Stage 7g in the engine every `drug` event is 7g's (`PkClinicalEvent`, R51 §3) and 7c
 * observes the accepted doses on `ps.pk.bus.doses` (plan decision 11).
 */
export type BloodClinicalEvent =
  | { kind: 'fluid'; fluid?: BloodFluidId; volumeMl?: number; overS?: number; rateMlPerMin?: number }
  | { kind: 'bleed'; volumeMl?: number; overS?: number; rateMlPerMin?: number }
  | { kind: 'transfusion'; product: BloodProductId; units: number; overS?: number; storageDays?: number; warmed?: boolean }
  | { kind: 'drug'; drugId: BloodDrugId; dose: number; unit: 'mg' | 'g' | 'mcg' | 'mmol' | 'mmol/kg' | 'mg/kg' | 'units'; route?: 'iv' | 'neb' }
  /** Scenario inputs: ketoacid anions (target mmol/L, reached over overS) and a mineral-acid load (HCl/NH4Cl, mmol). */
  | { kind: 'metabolic'; ketoacidsMmolL?: number; acidMmol?: number; overS?: number }
  | { kind: 'condition'; id: 'burns' | 'dka'; severity: number }
  /** Instructor "send ABG/VBG": the panel is frozen now and returned as `labResult` after the turnaround. */
  | { kind: 'lab'; panel: 'abg' | 'vbg'; turnaroundS?: number };

/** Baseline blood chemistry in the patient profile (defaults: tables §1.1, §5b). `burns` 0–1 (sux sensitivity). */
export interface BloodProfile {
  hb?: number; na?: number; k?: number; cl?: number; iCa?: number; mg?: number; lactate?: number; albuminGL?: number;
  hco3?: number; dpgMmolL?: number; cohb?: number; methb?: number; burns?: number;
}

/** The lab panel (mmHg, mmol/L, g/dL, %; glucose mg/dL is a placeholder until 7e). */
export interface LabPanel {
  ph: number; pco2: number; po2: number; hco3: number; be: number;
  so2: number; cohb: number; methb: number; // co-oximetry, % (so2 fractional)
  lactate: number; na: number; k: number; cl: number; iCa: number; mg: number; hb: number; glucose: number;
  ag: number; osm: number;
}

export type BloodEvent =
  | { type: 'labs'; t: SimSeconds; values: LabPanel }
  | { type: 'labResult'; t: SimSeconds; drawnAt: SimSeconds; panel: 'abg' | 'vbg'; values: LabPanel };

export type BloodCommandBody = { type: 'applyEvent'; event: BloodClinicalEvent };
