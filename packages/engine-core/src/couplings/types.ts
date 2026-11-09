// The coupling registry's schema (docs/plans/mechanism-tree.md §4 D1–D3, piece R1). A row DESCRIBES one edge the code
// computes today: what it reads, what it writes, its sign and form, its delay, time constant and saturation, what
// blocks it, and the constants it uses. A row NAMES constants and never copies a value: a number lives in one place,
// the code, and its value, unit and tag are read from there by scripts/model-docs.ts's `extract()`. The edge's
// honesty class is COMPUTED from those tags (scripts/couplings.ts `classify`), never written in a row.
// Nothing in the engine reads this registry: it changes no computation.

/** D3: what a node is. `state`: a path in the truth tree; `effector`: a parameter assembled from factors (declared in
 *  nodes.ts with the function that computes it); `trigger`: a command or clinical event; `observable`: a monitor numeric. */
export type NodeKind = 'trigger' | 'state' | 'effector' | 'observable';

/** A seam of the census (scripts/coupling-seams.ts) as `<module> <kind> <field>`, exactly as the census lists it. */
export type SeamKey = `${string} ${'ctx' | 'ext' | 'endo-write' | 'bus-read'} ${string}`;

export interface NodeRef {
  kind: NodeKind;
  /** state: a truth-tree path (`hemo.circ.baro.es`); effector: a declared path (`circ.baro.svrF`); trigger:
   *  `trigger.<event kind>[.<id>]`; observable: `mon.<NumericId>`. */
  path: string;
  /** The census seams this node is carried across (the seam check: every seam is on a row, or unregistered). */
  seams?: readonly SeamKey[];
}

/**
 * An exported constant, by file and identifier: `'<path from packages/engine-core/src/>#<IDENT>'`
 * (`'l2/circ/baroreflex.ts#G_HS'`). Two further forms name a data row and a non-numeric export, because some edges
 * are sized by them and not by a numeric constant:
 *   `'<file>#<TABLE>.<id>'`  the row whose `id` is <id> in the exported table <TABLE> (a drug row, a lung condition):
 *                            its tag and source are the row's own `src`/`tag` fields;
 *   `'<file>#<IDENT>'` of an exported object (a PD effect): its tag and source are its comment's.
 */
export type ConstRef = `${string}.ts#${string}`;

/** An audit finding of research/44 (`research/44 L2-01`): the mechanism the engine lacks. */
export type AuditRef = `research/44 ${'L2' | 'X' | 'T' | 'DEV'}-${string}`;

export type Sign = '+' | '−' | '±';
/** factor: × on the target; term: + on the target; gain: scales another edge; threshold: acts past a level; state: the
 *  target integrates or tracks the input (a filter, a pool, a handoff of the value itself). */
export type Form = 'factor' | 'term' | 'gain' | 'threshold' | 'state';

export interface Coupling {
  /** Unique, `<module>.<name>`. */
  id: string;
  /** The module of scripts/model-modules.ts whose code computes `to`. */
  module: string;
  from: readonly NodeRef[];
  to: NodeRef;
  sign: Sign;
  form: Form;
  delay?: ConstRef;
  tau?: ConstRef;
  saturation?: ConstRef;
  blockedBy?: NodeRef;
  /** The constants the code uses on this edge. Empty: the edge's size is set by no exported constant (a handoff, or
   *  numbers written inline in the code: the note says which). */
  params: readonly ConstRef[];
  /** Set: the engine does NOT have this mechanism; the row draws the edge a real one would, with no params. */
  absent?: AuditRef;
  note: string;
}

/** D2's computed class: ABSENT if `absent`; else FIT if any constant is tagged FIT; else ENG if any is tagged ENG; else
 *  SOURCED if every constant (at least one) has a source; else UNTAGGED. */
export type EdgeClass = 'SOURCED' | 'FIT' | 'ENG' | 'ABSENT' | 'UNTAGGED';
