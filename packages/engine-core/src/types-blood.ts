// Blood public types (tables §5b), in their own file so parallel modules do not collide in types.ts. types.ts
// adds `BloodCommandBody` and `BloodEvent` to its unions and `blood?: BloodProfile` to PatientProfile.
import type { SimSeconds } from './types.ts';

/**
 * `crystalloid` (the circulation model's name) and a missing `fluid` both mean 0.9 % saline; the circulation model's
 * `colloid` means 4 % gelatin and its `blood` means whole blood.
 */
export type BloodFluidId = 'saline' | 'rl' | 'balanced' | 'albumin5' | 'gelatin' | 'd5w' | 'glycine' | 'crystalloid' | 'colloid' | 'blood';
export type BloodProductId = 'rbc' | 'ffp' | 'platelets' | 'wholeBlood';
export type BloodDrugId =
  | 'succinylcholine' | 'insulinDextrose' | 'salbutamol' | 'calciumChloride' | 'calciumGluconate' | 'sodiumBicarbonate' | 'magnesium';

/**
 * Brief §7.2 ClinicalEvent members the blood model implements (volumes mL, rates mL/min, times s). The `drug` member is
 * the FALLBACK shape only: with the drug model in the engine every `drug` event is the drug model's (`PkClinicalEvent`)
 * and the blood model observes the accepted doses on `ps.pk.bus.doses`.
 */
export type BloodClinicalEvent =
  /** `tempC`: the fluid's temperature, °C (absent: the theatre's; refrigerated 4 °C). `stopAtCoreC`: the team stops the
   * infusion once the core has fallen to it (a cooling infusion; MHAUS: stop cooling at 38 °C). */
  | { kind: 'fluid'; fluid?: BloodFluidId; volumeMl?: number; overS?: number; rateMlPerMin?: number; tempC?: number; stopAtCoreC?: number }
  | { kind: 'bleed'; volumeMl?: number; overS?: number; rateMlPerMin?: number }
  | { kind: 'transfusion'; product: BloodProductId; units: number; overS?: number; storageDays?: number; warmed?: boolean }
  | { kind: 'drug'; drugId: BloodDrugId; dose: number; unit: 'mg' | 'g' | 'mcg' | 'mmol' | 'mmol/kg' | 'mg/kg' | 'units'; route?: 'iv' | 'neb' }
  /** Scenario inputs: ketoacid anions (target mmol/L, reached over overS) and a mineral-acid load (HCl/NH4Cl, mmol). */
  | { kind: 'metabolic'; ketoacidsMmolL?: number; acidMmol?: number; overS?: number }
  | { kind: 'condition'; id: 'burns' | 'dka'; severity: number }
  /**
   * A blood sample (plan learner-action-remote.md L10a): the panel is frozen now and returned as `labResult` after its
   * row's turnaround (l2/blood/analysers.ts: `abg`/`vbg` the room's analyser, `chem`/`coag` the laboratory); a card's
   * `turnaroundS` (30–3600 s) overrides it. `analyser`: the room's analyser row id, filled by the host (absent: the
   * default row); a learner's device cannot send it.
   */
  | { kind: 'lab'; panel: LabPanelId; turnaroundS?: number; analyser?: string };

/** The panels a sample may ask for: the gas panels on the room's analyser, the chemistry and coagulation panels on the laboratory. */
export type LabPanelId = 'abg' | 'vbg' | 'chem' | 'coag';
/**
 * Every analyte an analyser row may name (l2/blood/analysers.ts). A row names what its machine measures or derives; a
 * panel returns only those the engine computes, so ids with no computation yet (creatinine L10b, the coagulation tests
 * L10c, CK L10d, total calcium, bilirubin, HbF, HHb) are named in rows and absent from results until a piece computes them.
 */
export type AnalyteId = keyof LabPanel | 'inr' | 'pt' | 'aptt' | 'fibrinogen' | 'platelets' | 'creatinine' | 'ck' | 'caTotal' | 'tbil' | 'hbf' | 'hhb';
/** A result: the panel's analytes the engine computes, nothing else (never a blank, never a made-up value). INR is a ratio. */
export type LabValues = Partial<Record<AnalyteId, number>>;
/** One analyser's panels: the analytes it reports for them and its own turnaround, each with its source. */
export interface AnalyserSection {
  panels: readonly LabPanelId[];
  analytes: readonly AnalyteId[];
  /** s, from the sample into the machine to the result; the time to carry it there has no source and is not added. */
  turnaroundS: number;
  turnaroundSrc: string;
}
/** A data row: one analyser (or the laboratory), the source of its analyte list, its sections. Another device is another row. */
export interface AnalyserRow {
  id: string;
  name: string;
  kind: 'poc' | 'laboratory';
  /** The document the row is read from. */
  src: string;
  analytesSrc: string;
  sections: readonly AnalyserSection[];
}

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
  /** `analyser`: the id of the row the sample ran on (l2/blood/analysers.ts). */
  | { type: 'labResult'; t: SimSeconds; drawnAt: SimSeconds; panel: LabPanelId; analyser: string; values: LabValues };

export type BloodCommandBody = { type: 'applyEvent'; event: BloodClinicalEvent };
