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
  objectives?: string[];
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
