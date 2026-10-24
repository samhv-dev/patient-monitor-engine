// Respiratory public types (brief §7.2–§7.3), in their own file so parallel modules do not collide in
// types.ts. types.ts adds `RespCommandBody` and `RespEvent` to its unions with one line each.
import type { SimSeconds } from './types.ts';
import type { LungStateExt } from './types-lung.ts';

/** Brief §7.2 VentFrame: one ventilator sample, ≤ 50 Hz (vent → engine). */
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

/** Brief §7.2 ClinicalEvent members the respiratory pipeline implements, plus two documented extensions. */
export type RespClinicalEvent =
  | { kind: 'airway'; state: AirwayState; severity?: number }
  | {
      kind: 'ventilation'; source: VentSource; rr?: number; vtMl?: number; fio2?: number; peep?: number; ie?: number;
      /** Extension: inspired CO2 in mmHg (exhausted absorbent → rebreathing baseline). */
      fico2?: number;
      /** Extension: 0–1 spontaneous diaphragmatic effort during mechanical breaths (curare cleft). */
      effort?: number;
      /** The ventilator's pressure limit in volume control, cmH2O (10–80; default VCV_PMAX_DEFAULT 40). */
      pmax?: number;
      /** Extension (E121b), words only: how a spontaneously breathing patient's oxygen is given ('none' = room air),
       *  for the log and the Debrief. The physiology reads `fio2` alone. */
      o2Device?: 'none' | 'nasal' | 'mask';
      /** Extension (E121b), words only: the oxygen flow in L/min (0–15) that goes with `o2Device`. */
      o2FlowLpm?: number;
    }
  | { kind: 'preoxygenate'; fio2: number; durationS: number }
  | { kind: 'condition'; id: 'mh'; severity: number }
  /** Anaesthetic thermal state, forced-air warming and ambient temperature. */
  | { kind: 'thermal'; anaesthesia?: 'none' | 'general' | 'neuraxial'; warming?: boolean; ambientC?: number; warmAirC?: 32 | 38 | 43 }; // Blanket air temperature

/** Respiratory command variants (brief §7.2). attachSensor co2/temp reuse the haemodynamics' attachSensor variant. */
export type RespCommandBody =
  | { type: 'applyEvent'; event: RespClinicalEvent }
  | { type: 'externalDrive'; source: 'ventilator'; frame: VentFrame };

/** Respiratory event variants: brief §7.3 `breath` and `lungState` (engine → ventilator). */
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
    } & Partial<LungStateExt>; // Additive per-lung fields
