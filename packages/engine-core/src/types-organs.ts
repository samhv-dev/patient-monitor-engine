// Organ public types (brain, kidney, liver), kept in their own file so parallel modules do not collide in types.ts.
// types.ts adds each to its union with one line. The organ model owns NO drug ids: mannitol, hypertonic saline and
// furosemide are the drug model's library rows; the organs observe the drug model's `bus.doses`.
import type { SimSeconds } from './types.ts';

/** attachSensor ids the organ model implements (state 'on' | 'off'). */
export type OrganSensorId = 'icp' | 'pbto2' | 'urometer';
/** Numerics the organ model adds: ICP mean and CPP (mmHg), PbtO2 (mmHg), urine output (mL/h, rolling 60 min). */
export type OrganNumericId = 'icpMean' | 'cpp' | 'pbto2' | 'uop';

/** Brief §7.2 ClinicalEvent members the organ model implements. */
export type OrganClinicalEvent =
  | {
      kind: 'brain';
      /** Mass lesion volume (mL, set) and growth rate (mL/min) — an expanding haematoma. */
      massMl?: number;
      massRateMlPerMin?: number;
      /** Oedema volume, mL (set). */
      oedemaMl?: number;
    }
  | { kind: 'position'; headUpDeg: number }
  | {
      kind: 'renal';
      catheter?: 'foley' | 'none';
      /** Empty the urometer bag (the cumulative total keeps counting). */
      emptyBag?: boolean;
      /** KDIGO window compression for teaching (Q40): 12 → a 30 min window counts as 6 h. */
      timeScale?: number;
      iapMmHg?: number;
    }
  | { kind: 'condition'; id: 'tbi' | 'hepaticFailure' | 'aki'; severity: number };

export type OrganCommandBody = { type: 'applyEvent'; event: OrganClinicalEvent };

export interface BrainSummary {
  icp: number; cpp: number; mapHead: number;
  cbf: number; // relative to 50 mL/100 g/min
  cbvMl: number; cmro2: number; pbto2: number; sjvo2: number; elastance: number;
  paco2: number; // The PaCO2 the brain saw (truth), for the scenario tests
  state: 'normal' | 'raisedIcp' | 'cushing' | 'herniated';
  cushing: number; // drive 0–1
}
export interface KidneySummary {
  rbf: number; gfr: number; gfrRel: number; uopMlKgH: number; uop1hMlKgH: number; cumMl: number; bagMl: number; bladderMl: number;
  oliguria: boolean; akiStage: 0 | 1 | 2 | 3;
}
export interface LiverSummary {
  hbfRel: number; kLacPerH: number; lactate: number; tempF: number; liverFn: number; inr: number;
}
/** 1 Hz organ truth summary (like the circulation model's `circ`). */
export type OrgansEvent = { type: 'organs'; t: SimSeconds; brain: BrainSummary; kidney: KidneySummary; liver: LiverSummary };
