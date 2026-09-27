// Stage 7e public types (tables §5c/§5e): endocrine/thermal clinical events, the 1 Hz `endo` event and the patient
// profile's endocrine block. Kept in their own file so parallel stages do not collide in types.ts. Stage 7e owns NO
// drug ids (R51 §3): dantrolene, dextrose, insulin and epinephrine are Stage 7g's library rows.
import type { SimSeconds } from './types.ts';

/** The ONE `stimulus` shape (R51 addendum 12): nociception 0 none … 1 incision … 1.5 laryngoscopy/sternotomy … 2 max. 7f observes it. */
export type StimulusEvent = { kind: 'stimulus'; intensity: number };

/** Brief §7.2 ClinicalEvent members Stage 7e implements. */
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
      fluidWarmer?: boolean; // every IV line (7c's fluids and blood) enters at 37 °C
      hme?: boolean;
    };

/** 1 Hz endocrine/thermal summary (truth; `stressIndex` is instructor-only). */
export type EndoEvent = {
  type: 'endo';
  t: SimSeconds;
  glucoseMgDl: number;
  glucoseMmolL: number;
  insulinUuMl: number;
  epinephrinePgMl: number; // endogenous + 7g's
  norepinephrinePgMl: number;
  cortisolNmolL: number;
  stressIndex: number;
  mhActivity: number;
  shivering: boolean;
  sweating: boolean;
  vasoconstricted: boolean;
  tempPeriphC: number;
};

/** PatientProfile.endo (optional; defaults: no diabetes, euthyroid, normal adrenals). β-blockade is 7a's profile. */
export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';
  thyroid?: 'normal' | 'hypo' | 'hyper';
  adrenalInsufficiency?: boolean;
}
