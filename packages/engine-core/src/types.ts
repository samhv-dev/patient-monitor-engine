// Public engine types. Names and shapes are copied from DESIGN-BRIEF §7.1–§7.3.
// The unions below list a SUBSET of the Command variants, EngineEvent variants and MonitorEngine members of §7.
import type { HemoCommandBody, HemoEvent, NibpDeviceAction, SensorId } from './types-hemo.ts';
import type { AlarmDeviceAction, AlarmLevel, DeviceClinicalEvent, DeviceEvent, MonitorDeviceAction } from './types-device.ts';
import type { RespCommandBody, RespEvent } from './types-resp.ts';
import type { EndoClinicalEvent, EndoEvent, EndoProfileInput } from './types-endo.ts';
import type { BloodCommandBody, BloodEvent, BloodProfile } from './types-blood.ts';
import type { OrganCommandBody, OrganNumericId, OrgansEvent } from './types-organs.ts';
import type { CircClinicalEvent, CircDeviceAction, CircEvent, ProfileCondition, TeachingChannel } from './types-circ.ts';
import type { LungCommandBody, LungConditionSpec } from './types-lung.ts';
import type { DrugsEvent, DrugWarningEvent, PkClinicalEvent } from './types-pk.ts';
import type { TruthEvent } from './types-truth.ts';
import type { NeuroCommandBody, NeuroDeviceAction, NeuroEvent, NeuroNumericId, NeuroProfile } from './types-neuro.ts';

export type Tick = number; // integer; 1 tick = 20 ms of sim time
export type SimSeconds = number;
export type ChannelId =
  | 'ecgI' | 'ecgII' | 'ecgIII' | 'aVR' | 'aVL' | 'aVF' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6'
  | 'vcgX' | 'vcgY' | 'vcgZ' | 'abp' | 'cvp' | 'pap' | 'pleth' | 'co2' | 'resp'
  | TeachingChannel
  | 'icp';
export type NumericId =
  | 'hr' | 'pr' | 'prAbp' | 'spo2' | 'pi' | 'abpSys' | 'abpDia' | 'abpMean' | 'cvpMean' | 'papSys' | 'papDia' | 'papMean'
  | 'nibpSys' | 'nibpDia' | 'nibpMean' | 'etco2' | 'imco2' | 'awrr' | 'rr' | 'tempCore' | 'tempSite' | 'stII' | 'qtc'
  | NeuroNumericId
  | OrganNumericId;
export type StateVar =
  | 'hr' | 'sbp' | 'dbp' | 'cvp' | 'papSys' | 'papDia' | 'pawp' | 'spo2' | 'pi' | 'rr' | 'vt' | 'etco2' | 'fio2'
  | 'shunt' | 'tempCore' | 'contractility' | 'svr' | 'k' | 'qtc' | 'volumeStatus' | 'paceThresholdMa';
export type Ramp = { durationS: number; curve?: 'linear' | 'exp' | 'sigmoid'; delayS?: number };

/** The 12 ECG lead channels (a subset of ChannelId). */
export type LeadId = 'ecgI' | 'ecgII' | 'ecgIII' | 'aVR' | 'aVL' | 'aVF' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';
export const LEAD_IDS: readonly LeadId[] = [
  'ecgI', 'ecgII', 'ecgIII', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
];

export type {
  ArtefactSpec, BbbKind, BurstSpec, CprSpec, Modifiers, ModifiersPatch, PacerFault, PacerOpts, PacSpec, PjcSpec,
  PvcPattern, PvcSpec, RhythmGroup, RhythmId, RhythmOpts, ShockSpec, StSpec, StTerritory, TcpSpec,
} from './l2/ecg/api-types.ts';
import type { ModifiersPatch, RhythmId, RhythmOpts } from './l2/ecg/api-types.ts';

/** A subset of the brief's PatientProfile (same shape as the scenario JSON `patient`, §7.4). */
export interface PatientProfile {
  baseline?: Partial<Record<StateVar, number>>; // Every StateVar
  rhythm?: { id: RhythmId; opts?: RhythmOpts };
  sensors?: Partial<Record<SensorId, string>>; // Brief §7.4 patient.sensors
  ageY?: number; // Gas-exchange scaling (brief §7.4 patient.ageY)
  weightKg?: number; // Brief §7.4 patient.weightKg
  heightCm?: number; // Ideal body weight and obesity
  sex?: 'M' | 'F'; // Brief §7.4 patient.sex
  endo?: EndoProfileInput; // types-endo.ts
  blood?: BloodProfile; // Baseline blood chemistry (tables §1.1, §5b)
  conditions?: ProfileCondition[]; // e.g. [{ id: 'as', grade: 'severe' }]
  lungConditions?: LungConditionSpec[]; // Catalogue conditions on the patient
  neuro?: NeuroProfile; // Neuromuscular profile, cholinesterase, MH susceptibility, Mg
}

export interface EngineOptions {
  seed?: number; // uint32
  mode?: 'manual' | 'modeled'; // default 'manual'
  patient?: PatientProfile;
  device?: { skin?: string; ageBand?: 'adult' | 'paediatric' | 'neonatal'; mainsHz?: 50 | 60 };
  lookaheadS?: number; // default 0.100; must be a whole number of 20 ms ticks
  /** Emit the read-only `truth` event this often (0 = never, the default; at most 2 Hz). */
  truthHz?: number;
}

type CommandBase = { id: string; issuedBy: string; atTick?: Tick; stageGroup?: string };

/**
 * Brief §7.2 DeviceAction. The ecg member:
 *   { device:'ecg', action:'filter', value: EcgFilterMode }
 *   { device:'ecg', action:'lead', value: LeadId, lane: 0 | 1 | 2 }
 */
export type DeviceAction =
  | {
      device: 'ecg';
      action: 'filter' | 'lead' | 'capture12' | 'arrhythmiaAnalysis';
      value?: string | boolean;
      lane?: number;
    }
  | NibpDeviceAction
  | AlarmDeviceAction
  | MonitorDeviceAction
  | CircDeviceAction
  | NeuroDeviceAction;

/** 'monitor' 0.5–40 Hz + notch, 'diagnostic' 0.05–150 Hz, or any skin band 'band:<lo>-<hi>'. */
export type EcgFilterMode = 'monitor' | 'diagnostic' | `band:${number}-${number}`;

export type Command = CommandBase &
  (
    | { type: 'setTarget'; variable: StateVar; value: number; ramp?: Ramp }
    | { type: 'setRhythm'; rhythm: RhythmId; opts?: RhythmOpts; when?: 'now' | 'nextBeat'; respectRefractory?: boolean }
    /** Modifiers apply at once in version 1.0 — a `ramp` with a delay or a duration is refused. */
    | { type: 'setModifiers'; modifiers: ModifiersPatch; ramp?: Ramp }
    | { type: 'device'; action: DeviceAction }
    | HemoCommandBody // types-hemo.ts
    | { type: 'applyEvent'; event: DeviceClinicalEvent } // types-device.ts
    | { type: 'applyEvent'; event: CircClinicalEvent }
    | { type: 'applyEvent'; event: PkClinicalEvent }
    | RespCommandBody // types-resp.ts
    | { type: 'applyEvent'; event: EndoClinicalEvent } // types-endo.ts
    | BloodCommandBody // types-blood.ts
    | OrganCommandBody // types-organs.ts
    | LungCommandBody // types-lung.ts
    | NeuroCommandBody // types-neuro.ts
  );

export type DispatchResult = { accepted: boolean; tick: Tick; reason?: string };

export type Measured = { value: number | null; flag: 'valid' | 'questionable' | 'invalid' | 'stale'; at: SimSeconds };

export type BeatOrigin = 'sinus' | 'atrial' | 'junctional' | 'ventricular' | 'paced' | 'fusion' | 'aberrant';

export type EngineEvent =
  | {
      type: 'beat'; t: SimSeconds; seq: number; origin: BeatOrigin;
      template: string; qrsMs: number; qtMs: number; prMs?: number;
      mech: { perfused: boolean; kSV: number; svMl: number; lvetMs: number };
    }
  | { type: 'atrial'; t: SimSeconds; kind: 'p' | 'flutter' | 'fib' | 'retrograde' | 'paced'; conducted: boolean }
  | { type: 'rhythmSegment'; t: SimSeconds; rhythm: RhythmId; seed: number; templateId?: string }
  | {
      type: 'marker'; t: SimSeconds; kind: 'paceSpike' | 'syncR' | 'shock' | 'chargeStart' | 'chargeReady' | 'disarm';
      data?: Record<string, number | boolean>;
    }
  | {
      type: 'alarm'; t: SimSeconds; id: string; priority: 'high' | 'medium' | 'low'; category: 'physiological' | 'technical';
      state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'; text: string;
      /** 1 = highest; set on every alarm the device layer emits. */
      level?: AlarmLevel;
    }
  | { type: 'measurement'; t: SimSeconds; values: Partial<Record<NumericId, Measured>> }
  | {
      type: 'tone'; t: SimSeconds; id: string;
      kind: 'qrs' | 'pulse' | 'alarmBurst' | 'charge' | 'chargeReady' | 'shock' | 'nibpDone';
      freqHz?: number; priority?: 'high' | 'medium' | 'low';
      /** Sim time of the event the tone marks (the detected R for 'qrs'); lets the audio side judge staleness. */
      refT?: SimSeconds;
      /** 'charge' only (request E-4a-3): how long the charge takes, s. */
      chargeS?: number;
    }
  /** Revoke tones: those listed in `ids` when present (the engine's normal case), else every tone with t > after. */
  | { type: 'toneCancel'; after: SimSeconds; ids?: string[] }
  | HemoEvent // types-hemo.ts
  | TruthEvent // types-truth.ts
  | DeviceEvent // types-device.ts
  | RespEvent // types-resp.ts
  | CircEvent // types-circ.ts
  | DrugsEvent // types-pk.ts
  | DrugWarningEvent
  | BloodEvent // types-blood.ts
  | NeuroEvent // types-neuro.ts
  | EndoEvent // types-endo.ts
  | OrgansEvent; // types-organs.ts

export type EngineEventType = EngineEvent['type'];

/** JSON-safe engine state (brief §7.1 `snapshot()`); it carries engine state only. */
export interface PatientSnapshot {
  schema: 'pme-snapshot/1';
  engineVersion: string;
  seed: number;
  tick: Tick;
  state: unknown;
}

/** A subset of brief §7.1 MonitorEngine (no load, commandLog, vocabulary, setL1Backend). */
export interface MonitorEngine {
  readonly version: string;
  start(): void;
  pause(): void;
  /** End start()'s interval (idempotent; start() may follow). */
  stop(): void;
  resume(): void;
  setTimeScale(k: number): void;
  step(ticks?: number): void;
  advanceTo(simT: SimSeconds): void;
  now(): { tick: Tick; simT: SimSeconds };
  dispatch(cmd: Command): DispatchResult;
  on(fn: (e: EngineEvent) => void, types?: EngineEventType[]): () => void;
  readSamples(ch: ChannelId, fromIndex: number, out: Float32Array): number;
  latestSampleIndex(ch: ChannelId): number;
  sampleRate(ch: ChannelId): 500 | 125 | 62.5;
  snapshot(): PatientSnapshot;
  restore(s: PatientSnapshot): void;
}
