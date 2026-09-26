// Stage 3 public types (brief §7.2–§7.3; ruling R27), in their own file so parallel stages do not collide in
// types.ts. types.ts adds `RespCommandBody` and `RespEvent` to its unions with one line each.
import type { SimSeconds } from './types.ts';
import type { LungStateExt } from './types-lung.ts'; // Stage 7b

/** Brief §7.2 VentFrame: one ventilator sample, ≤ 50 Hz (R27 vent → engine). */
export type VentFrame = {
  pawCmH2O: number; flowLps: number; volumeMl: number; fio2: number; peepCmH2O: number;
  phase?: 'insp' | 'exp';
};

export type AirwayState = 'patent' | 'obstructed' | 'apnoea' | 'disconnected' | 'oesophageal' | 'endobronchial' | 'bronchospasm';
/** Ventilation sources (brief §4.7). 'external' is set by `externalDrive` frames, never commanded directly. */
export type VentSource = 'spontaneous' | 'bvm' | 'ventilator' | 'none';
export type BreathKind = 'spont' | 'mech' | 'bvm' | 'gasp';
/** Temperature sites (brief §4.6). T1 is always the oesophageal probe; `site` chooses T2. */
export type TempSite = 'oesophageal' | 'nasopharyngeal' | 'tympanic' | 'bladder' | 'rectal' | 'axilla';

/** Brief §7.2 ClinicalEvent members Stage 3 implements, plus two documented extensions (plan decisions 6–7). */
export type RespClinicalEvent =
  | { kind: 'airway'; state: AirwayState; severity?: number }
  | {
      kind: 'ventilation'; source: VentSource; rr?: number; vtMl?: number; fio2?: number; peep?: number; ie?: number;
      /** Stage 3 extension: inspired CO2 in mmHg (exhausted absorbent → rebreathing baseline). */
      fico2?: number;
      /** Stage 3 extension: 0–1 spontaneous diaphragmatic effort during mechanical breaths (curare cleft). */
      effort?: number;
    }
  | { kind: 'preoxygenate'; fio2: number; durationS: number }
  | { kind: 'condition'; id: 'mh'; severity: number }
  /** Stage 3 extension (decision 8): anaesthetic thermal state, forced-air warming and ambient temperature. */
  | { kind: 'thermal'; anaesthesia?: 'none' | 'general' | 'neuraxial'; warming?: boolean; ambientC?: number };

/** Command variants added in Stage 3 (brief §7.2). attachSensor co2/temp reuse Stage 2's attachSensor variant. */
export type RespCommandBody =
  | { type: 'applyEvent'; event: RespClinicalEvent }
  | { type: 'externalDrive'; source: 'ventilator'; frame: VentFrame };

/** Event variants added in Stage 3: brief §7.3 `breath` and R27 `lungState` (engine → ventilator). */
export type RespEvent =
  | { type: 'breath'; t: SimSeconds; seq: number; kind: BreathKind; tiS: number; teS: number; vtMl: number; etco2True: number }
  | {
      type: 'lungState'; t: SimSeconds;
      complianceMlPerCmH2O: number; resistanceCmH2OPerLps: number;
      /** 0–1 spontaneous effort / drive. */
      effort: number;
      /** 0–1 tendency to gas trapping (obstruction). */
      autoPeepTendency: number;
      shunt: number; deadSpaceMl: number; frcMl: number;
    } & Partial<LungStateExt>; // Stage 7b: additive per-lung fields (plan decision 15)
