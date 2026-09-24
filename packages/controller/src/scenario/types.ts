// `pme-scenario/1` document types (DESIGN-BRIEF §7.4). The JSON Schema in scenarios/pme-scenario-1.schema.json is
// the contract; these types mirror it. Commands in a document carry no id/issuedBy/atTick/stageGroup: the driver
// stamps them, and every onExit+onEnter list runs as ONE stage group (one tick, "stage then commit", brief §4.9).
import type { Ramp, StateVar } from '@pme/engine-core';
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
  /** Seeds the runner's `scenario` PRNG stream (the engine keeps the host's own seed). */
  seed?: number;
  mode?: 'manual' | 'modeled';
  patient?: ScenarioPatient;
  device?: { skin?: string; layout?: string };
  initialState: string;
  states: ScenarioState[];
  bookmarks?: DocBookmark[];
}
