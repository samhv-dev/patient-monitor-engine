// `pme-validation/1` — segment validation documents (R40 borrow #1; method after Pulse's segment validation,
// re-implemented, no code copied — NOTICES N-P01/N-P02). A document runs one `pme-scenario/1` scenario headless,
// cuts the run into time segments and checks typed targets on any series the run produced.
import type { DocCommand } from '@pme/controller/scenario';

/** `state:<StateVar>` (1 Hz truth; derived `state:map`, `state:pp`), `numeric:<NumericId>` (displayed, valid only),
 *  `breath:etco2True` (per breath), `alarm:<id>` (1 raised / 0 otherwise), `scenario` (entry into `stateId`),
 *  `event:<type>` (one point per event). */
export type SeriesRef = string;
/** firstTBelow/firstTAbove: seconds after the segment start until the series first crosses `threshold`. */
export type Reduce = 'mean' | 'min' | 'max' | 'first' | 'last' | 'firstT' | 'count' | 'firstTBelow' | 'firstTAbove';
export type Ref = number | { segment: string; factor?: number; offset?: number };

export type Target = {
  id: string;
  series: SeriesRef;
  reduce: Reduce;
  /** Evidence row this target encodes (tables §7 check, gate acceptance, R39 item…). Printed in the report. */
  source: string;
  /** For `scenario`: the state whose entry time is measured. */
  stateId?: string;
  /** For firstTBelow / firstTAbove. */
  threshold?: number;
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
  /** Informational: the stages whose modules the document needs (e.g. ["7a", "7g"]). */
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
}

/** A command the engine refused because a later stage owns it: the whole document is "not measurable" (decision 8). */
export interface Unsupported { t: number; type: string; reason: string }
