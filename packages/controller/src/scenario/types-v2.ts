// `pme-scenario/2` document types (docs/plans/scenario-format-v2.md §3). The JSON Schema in
// scenarios/pme-scenario-2.schema.json is the contract; these types mirror it. The header is /1's, whole; `give` and
// `script` commands are /1's DocCommand. The phase runner (phase-runner.ts) is F2's; the administration record and
// grade() are F3's. The shared types at the end are fixed here so F2 and F3 can be built in parallel.
import type { PkRoute } from '@pme/engine-core';
import type { RunnerInput } from './runner.ts';
import type { DocCommand, Op, ScenarioDoc, VitalVar } from './types.ts';

type C = { $comment?: string };

/** A value a phase rule reads on engine truth (rank 3): the StateVars, the beat MAP, the labs pH and lactate, the
 *  endocrine MH activity and F4's engine signals (the dantrolene effect, the set minute ventilation). */
export type TruthVar =
  | 'hr' | 'sbp' | 'dbp' | 'cvp' | 'papSys' | 'papDia' | 'pawp' | 'spo2' | 'pi' | 'rr' | 'vt' | 'etco2' | 'fio2'
  | 'shunt' | 'tempCore' | 'contractility' | 'svr' | 'k' | 'qtc' | 'volumeStatus' | 'paceThresholdMa'
  | 'map' | 'ph' | 'lactate' | 'mhActivity' | 'dantroleneE' | 'setMinuteVentilationLMin';

/** `pulseLoss`, `rosc`, or `rhythm:<id>` (the rhythm id the engine draws). */
export type PhaseSignal = 'pulseLoss' | 'rosc' | `rhythm:${string}`;

/** A rule on engine truth (§4): one leaf or combinator. No manual, event or afterS leaf (the schema refuses them). */
export type PhaseRule =
  | { value: { var: TruthVar; op: Op; value: number; forS?: number } }
  | { slope: { var: TruthVar; op: '<' | '<=' | '>' | '>='; perMin: number; overS: number } }
  | { unchanged: { var: TruthVar; withinPct: number; overS: number } }
  | { visited: string }
  | { signal: PhaseSignal }
  | { all: PhaseRule[] }
  | { any: PhaseRule[] }
  | { not: PhaseRule };

/** A rule on the displayed numerics (rank 2): a judged row's clock (§7). */
export type DisplayRule =
  | { value: { var: VitalVar; op: Op; value: number; forS?: number } }
  | { all: DisplayRule[] }
  | { any: DisplayRule[] }
  | { not: DisplayRule };

/** Where a window starts: 'start', 'pulseLoss', 'rosc', `phase:<id>` (its entry), `action:<id>` (its first taking), or
 *  the first second a rule holds. */
export type Anchor = 'start' | 'pulseLoss' | 'rosc' | `phase:${string}` | `action:${string}` | { rule: PhaseRule };

/** A prescribed value and what is accepted: `value` (± `tolerance`) and/or a `min`/`max` range. */
export interface Amount { value?: number; tolerance?: number; min?: number; max?: number }
export interface Dose extends Amount { unit: string }
/** Settings by name (ventilator rr, vtMlPerKg, fio2, peep; defib energyJ; cpr rate; vaporiser dialPct, fgfLpm). */
export type Settings = Record<string, Amount | string>;

export interface DrugCriteria {
  /** Identity: exactly one of a drug id, a class (`cls`) or alternatives, each with its own dose. */
  id?: string;
  cls?: string;
  alternatives?: Array<{ id: string; dose?: Dose }>;
  dose?: Dose;
  cumulative?: { min?: number; max?: number; unit: string; windowS?: number };
  route?: { set: PkRoute[]; preferred?: PkRoute };
  rate?: { bolus: true } | { overS: Amount } | { infusion: Dose };
}

export type DeviceKind = 'ventilation' | 'cpr' | 'defib' | 'vaporiser' | 'airway';
export interface AdminFilter { kind?: string; drugId?: string; cls?: string; route?: PkRoute[]; dose?: Dose }
export interface Contraindication extends C {
  text: string;
  match: AdminFilter;
  inPhases?: string[];
  afterAction?: string;
  when?: PhaseRule;
  harm?: 'notModelled';
}

export type ActionKind = 'drug' | 'device' | 'procedure' | 'fluid' | 'physical' | 'sample' | 'communication' | 'decision';
export interface Action extends C {
  id: string;
  label: string;
  notes?: string;
  kind: ActionKind;
  /** The action opens when one of them is entered. */
  phases: string[];
  /** The commands an A press sends. */
  give?: DocCommand[];
  drug?: DrugCriteria;
  device?: { kind: DeviceKind; settings: Settings };
  fluid?: { type?: string[]; volumeMl?: Amount; rateMlMin?: Amount };
  physical?: { measure: string; settings?: Settings };
  /** A decision is graded on its engine-visible effect. */
  effect?: Array<{ kind: DeviceKind; settings: Settings }>;
  window?: { anchor: Anchor; withinS: number; notBeforeS?: number };
  order?: { after?: string[]; before?: string[] };
  repeat?: { intervalS: Amount; maxCount?: number };
  /** Conditional repeat: again while the rule holds. */
  repeatWhile?: { rule: PhaseRule; intervalS: Amount };
  precondition?: PhaseRule;
  contraindications?: Contraindication[];
}

export interface Phase extends C {
  id: string;
  label: string;
  /** The Say line. */
  notes?: string;
  initial?: true;
  /** Absent only on the initial phase. */
  enter?: PhaseRule;
  next?: string[];
}

export interface Outcome extends C { id: string; text: string; rule: PhaseRule; anchor: Anchor; withinS: number }
export interface Judged extends C { id: string; text: string; kind: 'recognition' | 'communication'; display?: DisplayRule }
export interface ScriptEntry extends C {
  id: string;
  /** `phase:<id>` (its entry), `action:<id>#<n>` (the nth taking), or a scenario time. */
  on: `phase:${string}` | `action:${string}#${number}` | { atScenarioS: number };
  commands: DocCommand[];
}

/** The /1 header, whole (§3 and the plan's Q32). */
type Header = Pick<ScenarioDoc, '$comment' | '$schema' | 'id' | 'title' | 'notes' | 'category' | 'story' | 'durationMin' | 'takeHome' | 'seed' | 'mode' | 'patient' | 'device'>;

export interface ScenarioDocV2 extends Header {
  schema: 'pme-scenario/2';
  phases: Phase[];
  actions: Action[];
  outcomes?: Outcome[];
  judged?: Judged[];
  script?: ScriptEntry[];
}

// --- shared by F2 (the phase runner) and F3 (the record and grade()) ---------------------------------------------

/** One entry of the phase timeline: the phase, when it was entered and left, and the rule that fired ('initial' for the
 *  initial phase). */
export interface PhaseEntry { id: string; t: number; exitT?: number; rule: string }

/** A true/false edge of a named rule (a phase rule, an anchor, a precondition, a conditional repeat, an outcome, a
 *  judged display rule): grade() reads these instead of the values' history. */
export interface RuleEdge { rule: string; t: number; value: boolean }

/** One clinical act as the driver saw it, accepted or refused (plan F3). F3 may only ADD fields. */
export interface Administration {
  seq: number;
  /** The applied tick × 0.02 s (a staged batch: its own tick). */
  t: number;
  source: 'action' | 'sheet' | 'cache' | 'remote' | 'panel' | 'script';
  /** An A press (F6 stamps it on the command). */
  actionId?: string;
  kind: 'drug' | 'infusion' | 'tci' | 'vaporiser' | 'fluid' | 'ventilation' | 'cpr' | 'defib' | 'airway' | 'procedure' | 'sample' | 'communication' | 'physical';
  drugId?: string;
  cls?: string;
  dose?: number;
  unit?: string;
  perKg?: number;
  route?: PkRoute;
  overS?: number;
  rate?: number;
  rateUnit?: string;
  /** Ventilator rr, vtMl, fio2, peep; defib energyJ; cpr rate; vaporiser dialPct, fgfLpm. */
  settings?: Record<string, number | string>;
  fluid?: { type: string; volumeMl: number; rateMlMin: number };
  result: { accepted: true } | { accepted: false; reason: string; routeNotModelled: boolean };
  /** A script entry's command: never graded. */
  cardSet?: true;
}

/** F4's engine signals (the `state` event's additive `signals` field), rank 3. The /1 runner never receives them. */
export type SignalsInput = { kind: 'signals'; signals: { pulse: boolean; dantroleneE: number; setMinuteVentilationLMin: number | null; map: number } };
/** The rhythm id the engine draws (the `state` event's `rhythm.id`), rank 3: what a `rhythm:<id>` signal leaf reads
 *  (F2). The /1 runner never receives it. */
export type RhythmInput = { kind: 'rhythm'; id: string };
/** What the phase runner takes: the /1 runner's inputs plus the signals and the rhythm. (The plan names it
 *  `RunnerInput`; that name is the /1 runner's, in runner.ts, which no piece edits.) */
export type RunnerInputV2 = RunnerInput | SignalsInput | RhythmInput;

/**
 * The phase runner's state (plan F2): plain JSON, so a bookmark holds it next to the engine snapshot and a restore
 * rewinds the phase timeline, the administration record and the rule edges with the course.
 */
export interface PhaseRunnerState {
  /** The state's format. */
  schema: 'pme-scenario-runner/2';
  /** The card's id: a state restores only into a runner of the same card. */
  docId: string;
  /** start() has run. */
  started: boolean;
  /** The current phase's id. */
  stateId: string;
  /** The sim time of the last call. */
  lastT: number;
  /** Sim seconds in the current phase, pauses excluded. */
  stateT: number;
  /** Sim seconds on the scenario clock (a script entry's `atScenarioS`), pauses excluded. */
  scenarioT: number;
  /** The scenario is paused: no time is credited and no rule is evaluated. */
  paused: boolean;
  /** Command batches sent (the start's setup and the script's entries); `driver.position()` reads it. */
  batch: number;
  /** The sim time the current phase was entered. */
  enteredT: number;
  /** Engine truth (rank 3) by name, which every phase, outcome and anchor rule reads (Q22). */
  truth: Record<string, { v: number; t: number }>;
  /** The displayed numerics (rank 2) by name, which only a judged row's clock reads (§7). */
  display: Record<string, { v: number; t: number }>;
  /** The rhythm id the engine draws; null until one arrives. */
  rhythm: string | null;
  /** The pulse (F4's `signals.pulse`); null until one arrives. */
  pulse: boolean | null;
  /** The pulse has been lost at some point of the course (`rosc` is a pulse after a loss). */
  pulseLost: boolean;
  /** Sim seconds each value leaf with `forS` has held, by leaf key (`<rule name>`, then `.i` per level). */
  trueFor: Record<string, number>;
  /** The slope rings: 1 Hz samples `[t, v]` of each variable a slope or unchanged leaf reads, as long as its window. */
  rings: Record<string, Array<[number, number]>>;
  /** Each named rule's value at the last evaluation: the state its next edge is read against. */
  ruleNow: Record<string, boolean>;
  /** The /1 shape of the phase entries, for the readers of `history` (at most 200, as /1's). */
  history: Array<{ t: number; stateId: string; transitionId?: string }>;
  /** The phase timeline (at most 500 entries, the oldest dropped). */
  phases: PhaseEntry[];
  /** The administration record: F3 fills it. */
  admin: Administration[];
  /** The true/false edges of every named rule (at most PhaseRunner.EDGES_PER_RULE per rule; its first edge is kept). */
  edges: RuleEdge[];
  /** The script entries fired (ids): each fires once. */
  fired: string[];
  /** How many times each action has been taken (an `action:<id>#<n>` script anchor). */
  takings: Record<string, number>;
}
