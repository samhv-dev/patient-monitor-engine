// Public engine types. Names and shapes are copied from DESIGN-BRIEF §7.1–§7.3.
// Stage 1 implements a SUBSET: the unions below list only what Stage 1 handles. Later stages add
// the remaining Command variants, EngineEvent variants and MonitorEngine members listed in §7.
import type { HemoCommandBody, HemoEvent, NibpDeviceAction, SensorId } from './types-hemo.ts';
import type { AlarmDeviceAction, AlarmLevel, DeviceClinicalEvent, DeviceEvent, MonitorDeviceAction } from './types-device.ts'; // Stage 4b
import type { RespCommandBody, RespEvent } from './types-resp.ts'; // Stage 3

export type Tick = number; // integer; 1 tick = 20 ms of sim time
export type SimSeconds = number;
export type ChannelId =
  | 'ecgI' | 'ecgII' | 'ecgIII' | 'aVR' | 'aVL' | 'aVF' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6'
  | 'vcgX' | 'vcgY' | 'vcgZ' | 'abp' | 'cvp' | 'pap' | 'pleth' | 'co2' | 'resp';
export type NumericId =
  | 'hr' | 'pr' | 'spo2' | 'pi' | 'abpSys' | 'abpDia' | 'abpMean' | 'cvpMean' | 'papSys' | 'papDia' | 'papMean'
  | 'nibpSys' | 'nibpDia' | 'nibpMean' | 'etco2' | 'imco2' | 'awrr' | 'rr' | 'tempCore' | 'tempSite' | 'stII' | 'qtc';
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

/** Stage 1 subset of the brief's PatientProfile (same shape as the scenario JSON `patient`, §7.4). */
export interface PatientProfile {
  baseline?: Partial<Record<StateVar, number>>; // Stage 2: every StateVar (was { hr?: number })
  rhythm?: { id: RhythmId; opts?: RhythmOpts };
  sensors?: Partial<Record<SensorId, string>>; // Stage 2 (brief §7.4 patient.sensors)
  ageY?: number; // Stage 3 (brief §7.4 patient.ageY): gas-exchange scaling
  weightKg?: number; // Stage 3 (brief §7.4 patient.weightKg)
  heightCm?: number; // Stage 3: ideal body weight and obesity (plan decision 9)
  sex?: 'M' | 'F'; // Stage 3 (brief §7.4 patient.sex)
}

export interface EngineOptions {
  seed?: number; // uint32
  mode?: 'manual' | 'modeled'; // default 'manual'; Stage 1 accepts only 'manual'
  patient?: PatientProfile;
  device?: { skin?: string; ageBand?: 'adult' | 'paediatric' | 'neonatal'; mainsHz?: 50 | 60 };
  lookaheadS?: number; // default 0.100; must be a whole number of 20 ms ticks
}

type CommandBase = { id: string; issuedBy: string; atTick?: Tick; stageGroup?: string };

/**
 * Brief §7.2 DeviceAction, ecg member only (Stage 1). Stage 1 implements:
 *   { device:'ecg', action:'filter', value: EcgFilterMode }
 *   { device:'ecg', action:'lead', value: LeadId, lane: 0 | 1 | 2 }
 * 'capture12' and 'arrhythmiaAnalysis' are rejected until Stage 4.
 */
export type DeviceAction =
  | {
      device: 'ecg';
      action: 'filter' | 'lead' | 'capture12' | 'arrhythmiaAnalysis';
      value?: string | boolean;
      lane?: number;
    }
  | NibpDeviceAction // Stage 2
  | AlarmDeviceAction // Stage 4b
  | MonitorDeviceAction; // Stage 4b

/** 'monitor' 0.5–40 Hz + notch, 'diagnostic' 0.05–150 Hz, or any skin band 'band:<lo>-<hi>' (Stage 4b, request E-4a-1). */
export type EcgFilterMode = 'monitor' | 'diagnostic' | `band:${number}-${number}`;

export type Command = CommandBase &
  (
    | { type: 'setTarget'; variable: StateVar; value: number; ramp?: Ramp }
    | { type: 'setRhythm'; rhythm: RhythmId; opts?: RhythmOpts; when?: 'now' | 'nextBeat'; respectRefractory?: boolean }
    | { type: 'setModifiers'; modifiers: ModifiersPatch; ramp?: Ramp }
    | { type: 'device'; action: DeviceAction }
    | HemoCommandBody // Stage 2 (types-hemo.ts)
    | { type: 'applyEvent'; event: DeviceClinicalEvent } // Stage 4b (types-device.ts)
    | RespCommandBody // Stage 3 (types-resp.ts)
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
      /** Stage 4b (request E-4a-3): 1 = highest; set on every alarm the device layer emits. */
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
  | HemoEvent // Stage 2 (types-hemo.ts)
  | DeviceEvent // Stage 4b (types-device.ts)
  | RespEvent; // Stage 3 (types-resp.ts)

export type EngineEventType = EngineEvent['type'];

/** JSON-safe engine state (brief §7.1 `snapshot()`); Stage 1 carries engine state only. */
export interface PatientSnapshot {
  schema: 'pme-snapshot/1';
  engineVersion: string;
  seed: number;
  tick: Tick;
  state: unknown;
}

/** Stage 1 subset of brief §7.1 MonitorEngine. Stage 2+ adds load, commandLog, vocabulary, setL1Backend. */
export interface MonitorEngine {
  readonly version: string;
  start(): void;
  pause(): void;
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
