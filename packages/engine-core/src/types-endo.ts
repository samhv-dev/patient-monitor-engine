// Endocrine public types (tables §5c/§5e): endocrine/thermal clinical events, the 1 Hz `endo` event and the patient
// profile's endocrine block. Kept in their own file so parallel modules do not collide in types.ts. The endocrine
// model owns NO drug ids: dantrolene, dextrose, insulin and epinephrine are the drug model's library rows.
import type { SimSeconds } from './types.ts';

/** The ONE `stimulus` shape is declared in types-neuro.ts: the endocrine model consumes it, the neuro model observes it. */
import type { StimulusEvent } from './types-neuro.ts';

/** Brief §7.2 ClinicalEvent members the endocrine model implements. */
export type EndoClinicalEvent =
  | StimulusEvent
  | {
      kind: 'condition';
      id: 'sepsis' | 'anaphylaxis' | 'sirs' | 'hypermetabolic' | 'thyroidStorm';
      severity: number; // 0–1
      phase?: 'sirs' | 'sepsis' | 'warm' | 'cold'; // sepsis only (default 'warm')
      rampS?: number; // sepsis transition τ, s (default 600)
    }
  | { kind: 'meal'; carbohydrateG: number }
  | {
      kind: 'thermal7e';
      exposure?: 'draped' | 'exposed' | 'prep';
      airSpeedMs?: number;
      fluidWarmer?: boolean; // Every IV line (the blood model's fluids and blood) enters at 37 °C
      hme?: boolean;
    };

/** 1 Hz endocrine/thermal summary (truth; `stressIndex` is instructor-only). */
export type EndoEvent = {
  type: 'endo';
  t: SimSeconds;
  glucoseMgDl: number;
  glucoseMmolL: number;
  insulinUuMl: number;
  epinephrinePgMl: number; // Endogenous + the drug model's
  norepinephrinePgMl: number;
  cortisolNmolL: number;
  stressIndex: number;
  mhActivity: number;
  shivering: boolean;
  sweating: boolean;
  vasoconstricted: boolean;
  tempPeriphC: number;
};

/**
 * PatientProfile.endo (optional; defaults: no diabetes, euthyroid, normal adrenals). β-blockade is the circulation
 * model's profile.
 */
export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';
  /** Type 1 only — `false` OMITS the long-acting basal insulin (the missed-dose case: ketosis within hours).
   * Default `true` (older profiles keep their behaviour). `pme-scenario/1` carries it. */
  basalInsulin?: boolean;
  thyroid?: 'normal' | 'hypo' | 'hyper';
  adrenalInsufficiency?: boolean;
}
