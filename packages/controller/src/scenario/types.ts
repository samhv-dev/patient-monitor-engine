// `pme-scenario/1` document types (DESIGN-BRIEF §7.4). The JSON Schema in scenarios/pme-scenario-1.schema.json is
// the contract; these types mirror it. Commands in a document carry no id/issuedBy/atTick/stageGroup: the driver
// stamps them, and every onExit+onEnter list runs as ONE stage group (one tick, "stage then commit", brief §4.9).
import type { BloodProfile, EndoProfileInput, LungConditionSpec, NeuroProfile, ProfileCondition, Ramp, StateVar } from '@pme/engine-core';
import type { ClinicalEvent, ModelInput, SensorId } from '../protocol.ts';

export type Op = '<' | '<=' | '>' | '>=' | '==' | '!=';
/** A StateVar, a NumericId, or `map` (brief §7.1 names; measured ids such as nibpSys are allowed too). */
export type VitalVar = string;

/** `event` trigger: `kind` plus filters. minJ/minDose/minVolumeMl/minMa are lower bounds; any other key must match exactly. */
export type EventFilter = { kind: ClinicalEvent['kind'] } & { [key: string]: string | number | boolean };

export type When =
  | { afterS: number }
  | { atScenarioS: number }
  | { vital: { var: VitalVar; op: Op; value: number; forS?: number } }
  | { event: EventFilter }
  | { sensor: { sensor: SensorId; state: string } }
  | { manual: { label: string } }
  | { all: When[] }
  | { any: When[] };

type C = { $comment?: string };
export type DocCommand = C &
  (
    | { type: 'setTarget'; variable: StateVar; value: number; ramp?: Ramp }
    | { type: 'pin'; variable: StateVar; value?: number; ramp?: Ramp }
    | { type: 'release'; variable: StateVar | 'all'; ramp?: Ramp }
    | { type: 'setFactor'; input: ModelInput; factor: number; ramp?: Ramp }
    | { type: 'setMode'; mode: 'manual' | 'modeled' }
    | { type: 'setRhythm'; rhythm: string; opts?: Record<string, unknown>; when?: 'now' | 'nextBeat'; respectRefractory?: boolean }
    | { type: 'setModifiers'; modifiers: Record<string, unknown>; ramp?: Ramp }
    | { type: 'applyEvent'; event: ClinicalEvent }
    | { type: 'attachSensor'; sensor: SensorId; state: string; site?: string; leadSet?: 3 | 5 | 12; sampling?: 'sidestream' | 'mainstream' }
    | { type: 'device'; action: { device: 'nibp' | 'alarm' | 'ecg' | 'display'; action: string; [k: string]: unknown } }
  );

export interface Transition extends C {
  id: string;
  label?: string;
  to: string;
  when: When;
  /** Rolled once on the `scenario` PRNG stream when `when` holds: success → `to`, failure → `else` (absent: stay). */
  probability?: number;
  else?: string;
}

export interface ScenarioState extends C {
  id: string;
  /** FU-8 (R-S9-4): the schema requires it in every document — the clinical name the panel, the remote and the
   * transition text print; in-code objects built by hosts and tests may still omit it (the view falls back to the id). */
  label?: string;
  notes?: string;
  onEnter?: DocCommand[];
  onExit?: DocCommand[];
  /** Priority order: the first transition whose condition holds fires; at most one per tick. */
  transitions?: Transition[];
}

export interface ScenarioPatient {
  ageY?: number;
  sex?: 'M' | 'F';
  weightKg?: number;
  heightCm?: number;
  ageBand?: 'adult' | 'paediatric' | 'neonatal';
  baseline?: Partial<Record<StateVar, number>>;
  rhythm?: { id: string; opts?: Record<string, unknown> };
  sensors?: Partial<Record<SensorId, string>>;
  /** Stage 7f's neuro block and Stage 7c's blood block (in the schema since 7f), passed to the engine as they are. */
  neuro?: NeuroProfile;
  blood?: BloodProfile;
  /** R22 patient profile (FU-3 item 9): the engine's PatientProfile `conditions` and `lungConditions`, 1:1. */
  profile?: ScenarioProfile;
  /** FU-8 (research/19 §5): Stage 7e's endocrine profile (diabetes, thyroid, adrenal insufficiency), 1:1. */
  endo?: EndoProfileInput;
}

/** Chronic conditions of the body (fixed at engine creation). Acute events stay applyEvent commands. */
export interface ScenarioProfile {
  /** 7a circulation (hfref, hfpef, htn, as, ar, mr, ms, tr, cad, betaBlocked, rvFailure, ph) and 7d organs (tbi, hepaticFailure, aki). */
  conditions?: ProfileCondition[];
  /** 7b lung catalogue conditions; pregnancy is `{ id: 'pregnancy', severity }` (term = 1). */
  lungConditions?: LungConditionSpec[];
}

/**
 * Stage 13: a run event a debrief rule names. 'start' (the run's first second); 'state:<stateId>' (the scenario entered
 * it); 'alarm:<alarmId>' (the monitor raised it; 'alarm:apnoea' also matches 'alarm:apnoea-co2' — an id matches its own
 * prefix up to a hyphen); 'drug:<drugId>' (a bolus, infusion or TCI of it); 'fluid'; 'cpr' (started); 'shock';
 * 'condition:<id>' (started); 'airway:<state>'; 'ventilation' (mechanical or bag-mask breaths began after ≥ 15 s without
 * one); 'pulseLoss' and 'rosc' (the model's circulation stopped / returned); 'value:<trend><op><n>' (the first second a
 * trended value or lab was below or above n, e.g. 'value:spo2<90', 'value:map>65', 'value:k>5.5'; as `TrendValue`).
 */
export type RunEventId = string;
/** The six trended numerics a `stayed` rule reads (ART M, else NIBP M, for `map`; awRR, else RR, for `rr`; T1, else T2,
 *  for `temp`) and the model's five labs (K⁺, lactate, pH, glucose in mmol/L, core temperature). */
export type TrendValue = 'hr' | 'map' | 'spo2' | 'etco2' | 'rr' | 'temp' | 'k' | 'lactate' | 'ph' | 'glucose' | 'tcore';
/**
 * Stage 13: how the debrief judges an objective. `eventWithin`: `event` within `withinS` s after the FIRST `after` (a later
 * one is not judged again) (ROSC within N s of pulse loss = `{ after: 'pulseLoss', event: 'rosc' }`). `occurred` /
 * `never`. `from` (R50): the `after` (or the `event` of occurred / never) counts only at or after the first `from` —
 * "EtCO₂ falling below 40 after the crisis was called" = `{ from: 'state:triggerOff', after: 'value:etco2<40', … }`, as a
 * value event alone is the first second past the limit from the start. A list of events means any one of them
 * (`['drug:phenylephrine', 'drug:ephedrine']`). `stayed`: every value above/below the limit, over the run or the `forS` s
 * after the first `after`.
 */
export type ObjectiveRule =
  | { kind: 'eventWithin'; after: RunEventId | RunEventId[]; event: RunEventId | RunEventId[]; withinS: number; from?: RunEventId | RunEventId[] }
  | { kind: 'occurred'; event: RunEventId | RunEventId[]; from?: RunEventId | RunEventId[] }
  | { kind: 'never'; event: RunEventId | RunEventId[]; from?: RunEventId | RunEventId[] }
  | { kind: 'stayed'; value: TrendValue; above?: number; below?: number; after?: RunEventId | RunEventId[]; forS?: number };
export interface Objective extends C {
  text: string;
  /** Absent: the debrief lists the objective as not assessable. */
  rule?: ObjectiveRule;
}

/** An authored jump point shown in the timeline; choosing it is a `goto` to `state`. */
export interface DocBookmark {
  id: string;
  label?: string;
  state: string;
}

export interface ScenarioDoc extends C {
  $schema?: string;
  schema: 'pme-scenario/1';
  id: string;
  title: string;
  notes?: string;
  /** FU-8 (Stage 9 R-S9-4): library group, learner-facing story, objectives and expected minutes (all optional). */
  category?: string;
  story?: string;
  objectives?: Array<string | Objective>;
  durationMin?: number;
  /** Seeds the runner's `scenario` PRNG stream (the engine keeps the host's own seed). */
  seed?: number;
  mode?: 'manual' | 'modeled';
  patient?: ScenarioPatient;
  device?: { skin?: string; layout?: string };
  initialState: string;
  states: ScenarioState[];
  bookmarks?: DocBookmark[];
}
