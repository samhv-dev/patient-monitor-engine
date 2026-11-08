// `pme-validation/1` — segment validation documents (R40 borrow #1; method after Pulse's segment validation,
// re-implemented, no code copied — NOTICES N-P01/N-P02). A document runs one `pme-scenario/1` scenario headless,
// cuts the run into time segments and checks typed targets on any series the run produced.
import type { DocCommand } from '@pme/controller/scenario';

/** `state:<StateVar>` (1 Hz truth; derived `state:map`, `state:pp`), `numeric:<NumericId>` (displayed, valid only),
 *  `breath:etco2True` (per breath), `alarm:<id>` (1 raised / 0 otherwise), `scenario` (entry into `stateId`),
 *  `circ:<field>` (the circulation event: co, sv, lvedv, …), `event:<type>` (one point per event). */
export type SeriesRef = string;
/** firstTBelow/firstTAbove: seconds after the segment start until the series first crosses `threshold`. */
export type Reduce = 'mean' | 'min' | 'max' | 'first' | 'last' | 'firstT' | 'count' | 'firstTBelow' | 'firstTAbove';
/** A segment's value of the same series, or of `series` when given (same reduction and threshold), × factor + offset. */
export type Ref = number | { segment: string; series?: SeriesRef; factor?: number; offset?: number };

/** A row whose band a named mechanism, not yet built, is expected to miss (brief 84). The band itself is never changed.
 *  The report counts the row in its own class, never as green, and the gate fails if the row starts to pass, so a landed
 *  mechanism forces the mark off and the row back to a real pass. `id` is the row's entry in
 *  docs/guides/known-deviations.md ("Validation gate: expected failures"); `measured` is the value when it was marked. */
export interface ExpectedMiss { id: string; mechanism: string; since: string; measured: string }

export type Target = {
  id: string;
  series: SeriesRef;
  reduce: Reduce;
  /** Evidence row this target encodes (tables §7 check, gate acceptance). Printed in the report. */
  source: string;
  /** For `scenario`: the state whose entry time is measured. */
  stateId?: string;
  /** For firstTBelow / firstTAbove. */
  threshold?: number;
  expectedMiss?: ExpectedMiss;
} & (
  | { type: 'EqualTo'; value: Ref; tolPct?: number }
  | { type: 'GreaterThan'; value: Ref }
  | { type: 'LessThan'; value: Ref }
  | { type: 'Range'; min: Ref; max: Ref }
  /** The segment's last 10 % approaches `value` (closer than the first 10 %) and ends within tolPct (default 10). */
  | { type: 'TrendsTo'; value: Ref; tolPct?: number }
);

export interface Segment {
  id: string;
  fromS: number;
  toS: number;
  targets: Target[];
}

export interface ValidationDoc {
  schema: 'pme-validation/1';
  id: string;
  title: string;
  /** A built-in scenario id (packages/controller/scenarios) or an inline pme-scenario/1 document. */
  scenario: string | Record<string, unknown>;
  seed?: number;
  durationS: number;
  /** Timed actions on top of the scenario: commands (as in a scenario document) or manual transition triggers. */
  actions?: Array<{ t: number; command?: DocCommand; trigger?: string }>;
  segments: Segment[];
  /** Informational: the stages whose modules the document needs (e.g. ["7a", "7g"]). The patient profile (conditions,
   *  pregnancy) rides in the scenario's `patient.profile`. */
  requires?: string[];
}

export type Grade = 'green' | 'yellow' | 'red';
export interface TargetResult {
  doc: string;
  segment: string;
  target: string;
  type: Target['type'];
  series: string;
  source: string;
  measured: number;
  expected: string;
  errPct: number;
  grade: Grade;
  pass: boolean;
  expectedMiss?: ExpectedMiss;
}

/** A row that compares two documents' runs (e.g. the β-blocked against the unblocked bleed). `measure` reads any series of
 *  either run, reduced by mean over [fromS, toS); the row is graded like a segment target and is skipped when one of
 *  its documents is not measurable or was not run. */
export interface CrossTarget {
  doc: string;
  segment: string;
  target: string;
  docs: string[];
  source: string;
  measure: (mean: (doc: string, series: SeriesRef, fromS: number, toS: number) => number) => number;
  type: 'LessThan';
  value: number;
  expectedMiss?: ExpectedMiss;
}

/** A command the engine refused because a later stage owns it: the whole document is "not measurable" (decision 8). */
export interface Unsupported { t: number; type: string; reason: string }
