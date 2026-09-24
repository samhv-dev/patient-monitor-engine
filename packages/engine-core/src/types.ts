// Public engine types. Names and shapes are copied from DESIGN-BRIEF §7.1–§7.3.
// Stage 1 implements a SUBSET: the unions below list only what Stage 1 handles. Later stages add
// the remaining Command variants, EngineEvent variants and MonitorEngine members listed in §7.

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

/** Rhythm IDs implemented in Stage 1 (brief §5 lists the full v1 set; Stage 5 adds the rest). */
export type RhythmId =
  | 'sinus' | 'sinusBrady' | 'sinusTachy' | 'afib' | 'aflutter' | 'svtAvnrt' | 'avb1' | 'avb2Mobitz1'
  | 'avb3Narrow' | 'avb3Wide' | 'vtMono' | 'asystole';

/** Per-rhythm options (defined here; the brief names the type but not its fields). */
export interface RhythmOpts {
  /** Flutter conduction ratio (brief §5): 2, 3, 4 or 'variable' (random 2:1/4:1 mix). Default 2. */
  ratio?: 2 | 3 | 4 | 'variable';
  /** Atrial rate for aflutter (default 300) and for the dissociated atria of avb3Narrow/avb3Wide (default 80). */
  atrialRateBpm?: number;
  /** avb1 PR (default 280 ms). */
  prMs?: number;
  /** avb2Mobitz1 group size in P waves: 3 → 3:2 … 6 → 6:5 (default 4 → 4:3). */
  groupSize?: 3 | 4 | 5 | 6;
  /** Sets the 'hr' target when the rhythm starts (default: the rhythm's default rate, see RHYTHMS). */
  rateBpm?: number;
}

/** PVC ectopy (brief §5 modifiers). Stage 1 implements patterns 'single' and 'bigeminy'. */
export interface PvcSpec {
  /** 'single': each sinus beat is followed by a PVC with this probability (0–0.9). Ignored for bigeminy. */
  probability: number;
  pattern: 'single' | 'bigeminy';
}

/** Modifiers subset for Stage 1 (brief §5). Later stages add the rest of the table. */
export interface Modifiers {
  pvc: PvcSpec | null;
  /** RSA depth 0–1 (1 = A_RSA 60 ms at RR 1 s). Default 0.67. */
  rsa: number;
  /** Multiplies every HRV term (0 = HRV off). Default 1. */
  hrvScale: number;
  /** QTc for Fridericia, ms (300–650). Default 400. */
  qtc: number;
  /** Artefact levels. Stage 1 has only additive white noise: 1 = 0.025 mV SD (brief §5 artefacts), 0 = off. */
  artefact: { noise: number };
}

/** Stage 1 subset of the brief's PatientProfile (same shape as the scenario JSON `patient`, §7.4). */
export interface PatientProfile {
  baseline?: { hr?: number };
  rhythm?: { id: RhythmId; opts?: RhythmOpts };
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
export type DeviceAction = {
  device: 'ecg';
  action: 'filter' | 'lead' | 'capture12' | 'arrhythmiaAnalysis';
  value?: string | boolean;
  lane?: number;
};

export type EcgFilterMode = 'monitor' | 'diagnostic';

export type Command = CommandBase &
  (
    | { type: 'setTarget'; variable: StateVar; value: number; ramp?: Ramp }
    | { type: 'setRhythm'; rhythm: RhythmId; opts?: RhythmOpts; when?: 'now' | 'nextBeat'; respectRefractory?: boolean }
    | { type: 'setModifiers'; modifiers: Partial<Modifiers>; ramp?: Ramp }
    | { type: 'device'; action: DeviceAction }
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
  | { type: 'measurement'; t: SimSeconds; values: Partial<Record<NumericId, Measured>> }
  | {
      type: 'tone'; t: SimSeconds; id: string;
      kind: 'qrs' | 'pulse' | 'alarmBurst' | 'charge' | 'chargeReady' | 'shock' | 'nibpDone';
      freqHz?: number; priority?: 'high' | 'medium' | 'low';
    }
  | { type: 'toneCancel'; after: SimSeconds };

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
