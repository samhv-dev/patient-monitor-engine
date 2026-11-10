// The phase editor's model (docs/plans/scenario-builder.md §5.3, piece B3): what a phase rule may read and how it reads
// in words, the rule tree's edits, where a phase sits in the card's course, and a phase id's rename. Pure, no DOM.
//
// What the editor offers is what the validator accepts, from the format's own lists: the variables are the schema's
// `truthVar` enum (read from the schema, so a variable the format adds is offered, in its own name, until it has words
// here: phases.test.ts holds the two lists equal) and DC1's `cp:`/`ce:` concentrations of the drugs whose row the
// controller's `concentrationVar` accepts, each in the drug panel row's own unit (`concUnit`, through it). The leaves are
// the five the schema has (value, slope, unchanged, visited, signal) and the combinators all, any and not; there is no
// press, event or timer leaf to choose. The sentence beside a rule is Instructor v2's own (`phaseRuleWords`, `phaseRowsOf`),
// never rewritten here.
//
// Lossless: every edit changes the node it names in place (a leaf's field keeps its place in its object; a new optional
// field comes last), and nothing is written while the phases are only read.
import { DRUGS } from '@pme/engine-core';
import { concentrationVar, SCENARIO_SCHEMA_V2, type PhaseRule, type ScenarioDocV2 } from '@pme/controller/scenario';
import { phaseRowsOf, phaseRuleWords } from '../card-read.ts';

type Rec = Record<string, unknown>;
type Phase = Rec & { id?: unknown; label?: unknown; initial?: unknown; enter?: unknown; holdS?: unknown; next?: unknown; cue?: unknown };

/** The schema's `truthVar` enum, in its order. */
export const TRUTH_VARS: readonly string[] = ((SCENARIO_SCHEMA_V2 as { definitions: { truthVar: { enum: string[] } } }).definitions.truthVar.enum);

export interface VarChoice { v: string; words: string; unit: string; group: string }

/** Each truth variable in the clinician's words with the unit the ENGINE reads it in (a rule's number is compared with the
 *  engine's truth as it is: FiO₂ and the shunt are fractions, SVR is in mmHg·s/mL), grouped as the Vitals sheet groups
 *  them; units from the engine's state schema (l1/state.ts STATE_SCHEMA, its header line), the stateSignals of
 *  engine.ts and types-hemo.ts (MAP, the MH model, the dantrolene effect, set minute ventilation) and the labs (mmol/L,
 *  types.ts). [ENG: ui] the words and the grouping are the builder's (the glossary's long names, shortened to fit a
 *  picker); the units are the engine's. */
export const RULE_VARS: readonly VarChoice[] = [
  ['hr', 'Heart rate', '/min', 'Circulation'], ['sbp', 'Systolic pressure', 'mmHg', 'Circulation'], ['dbp', 'Diastolic pressure', 'mmHg', 'Circulation'],
  ['map', 'Mean arterial pressure', 'mmHg', 'Circulation'], ['cvp', 'Central venous pressure', 'mmHg', 'Circulation'],
  ['papSys', 'Pulmonary artery systolic', 'mmHg', 'Circulation'], ['papDia', 'Pulmonary artery diastolic', 'mmHg', 'Circulation'],
  ['pawp', 'Wedge pressure', 'mmHg', 'Circulation'], ['qtc', 'QTc', 'ms', 'Circulation'],
  ['spo2', 'SpO₂', '%', 'Oxygenation and ventilation'], ['pi', 'Perfusion index', '%', 'Oxygenation and ventilation'],
  ['etco2', 'EtCO₂', 'mmHg', 'Oxygenation and ventilation'], ['rr', 'Respiratory rate', '/min', 'Oxygenation and ventilation'],
  ['vt', 'Tidal volume', 'mL', 'Oxygenation and ventilation'], ['fio2', 'FiO₂', 'fraction, 0.21–1', 'Oxygenation and ventilation'],
  ['shunt', 'Shunt fraction', 'fraction, 0–0.5', 'Oxygenation and ventilation'],
  ['setMinuteVentilationLMin', 'Set minute ventilation (the ventilator’s)', 'L/min', 'Oxygenation and ventilation'],
  ['tempCore', 'Core temperature', '°C', 'Temperature, labs and MH'], ['ph', 'pH', 'no unit', 'Temperature, labs and MH'],
  ['lactate', 'Lactate', 'mmol/L', 'Temperature, labs and MH'], ['k', 'Potassium', 'mmol/L', 'Temperature, labs and MH'],
  ['mhActivity', 'MH activity', '0–1', 'Temperature, labs and MH'], ['mhExcess', 'MH metabolic excess', '1 untreated, falls with dantrolene', 'Temperature, labs and MH'],
  ['dantroleneE', 'Dantrolene effect', '0–1', 'Temperature, labs and MH'],
  ['contractility', 'Contractility', '× baseline', 'Model inputs'], ['svr', 'Systemic vascular resistance', 'mmHg·s/mL', 'Model inputs'],
  ['volumeStatus', 'Volume status', '0–1, 1 = normovolaemic', 'Model inputs'], ['paceThresholdMa', 'Pacing capture threshold', 'mA', 'Model inputs'],
].map(([v, words, unit, group]) => ({ v: v!, words: words!, unit: unit!, group: group! }));

const CONC_GROUP = 'Drug concentrations in the patient';
/** The concentration variables the validator accepts: for every engine drug row with a compartment, its plasma and its
 *  effect-site concentration, in the row's own unit, in the engine's row order. */
export const CONC_VARS: readonly VarChoice[] = Object.keys(DRUGS).flatMap((id) => (['cp', 'ce'] as const).flatMap((site) => {
  const c = concentrationVar(`${site}:${id}`);
  return c?.ok ? [{ v: `${site}:${id}`, words: c.words.charAt(0).toUpperCase() + c.words.slice(1), unit: c.unit, group: CONC_GROUP }] : [];
}));

/** A rule variable's choice: a known one, else (a card's own value the lists lack) its own name, no unit. */
export const varChoice = (v: string): VarChoice =>
  RULE_VARS.find((x) => x.v === v) ?? CONC_VARS.find((x) => x.v === v) ?? { v, words: v, unit: '', group: 'Other' };

/** The value leaf's operators (the schema's `op`) and the slope's (its four), in words. [ENG: ui] */
export const OPS: ReadonlyArray<[op: string, words: string]> = [['>', 'above'], ['>=', 'at or above'], ['<', 'below'], ['<=', 'at or below'], ['==', 'equal to'], ['!=', 'not equal to']];
export const SLOPE_OPS: ReadonlyArray<[op: string, words: string]> = [['>', 'more than'], ['>=', 'at least'], ['<', 'less than'], ['<=', 'at most']];

// ------------------------------------------------------------------------------------------------------------ leaves

export type LeafKind = 'value' | 'slope' | 'unchanged' | 'visited' | 'signal';
export type GroupKind = 'all' | 'any' | 'not';
/** The schema's five leaves in the author's words, in the order a rule is usually read. [ENG: ui] the words are the
 *  builder's; the five are the schema's `phaseRule` leaves, no other. */
export const LEAF_KINDS: ReadonlyArray<[LeafKind, string]> = [
  ['value', 'A measured value against a threshold'], ['slope', 'A value rising or falling'], ['unchanged', 'A value held unchanged'],
  ['visited', 'After another phase'], ['signal', 'A pulse or a rhythm'],
];
/** The combinators in words. [ENG: ui] */
export const GROUP_WORDS: Record<GroupKind, string> = { all: 'All of', any: 'Any of', not: 'Not' };

export const kindOf = (r: Rec): LeafKind | GroupKind | null => {
  const k = Object.keys(r)[0];
  return k === 'value' || k === 'slope' || k === 'unchanged' || k === 'visited' || k === 'signal' || k === 'all' || k === 'any' || k === 'not' ? k : null;
};

/** A number the schema accepts for a leaf's field: `min` inclusive, `above` exclusive. NUM is the schema's own bounds
 *  (`forS` minimum 0, `overS` and `withinPct` exclusiveMinimum 0, `holdS` minimum 0). [ENG: ui] copied from
 *  pme-scenario-2.schema.json so a field can say why a number is not written; the validator stays the judge. */
export interface NumSpec { min?: number; above?: number; optional?: boolean }
export const NUM: Record<string, NumSpec> = {
  'value/value': {}, 'value/forS': { min: 0, optional: true }, 'slope/perMin': {}, 'slope/overS': { above: 0 },
  'unchanged/withinPct': { above: 0 }, 'unchanged/overS': { above: 0 }, holdS: { min: 0, optional: true },
};
/** Why a typed number is not written, or null when it is one the schema accepts. */
export function numProblem(spec: NumSpec, n: number | undefined): string | null {
  if (n === undefined) return spec.optional ? null : 'a number is needed';
  if (!Number.isFinite(n)) return 'not a number';
  if (spec.min !== undefined && n < spec.min) return `at least ${spec.min}`;
  if (spec.above !== undefined && n <= spec.above) return `more than ${spec.above}`;
  return null;
}

/** A leaf being written in the "add a condition" form: complete when every field the schema requires is set. */
export function leafComplete(r: Rec): boolean {
  const k = kindOf(r);
  const x = r[k ?? ''] as Rec | string | undefined;
  if (k === 'visited' || k === 'signal') return typeof x === 'string' && x.length > 0;
  if (!x || typeof x !== 'object') return false;
  const ok = (f: string) => numProblem(NUM[`${k}/${f}`]!, x[f] as number | undefined) === null;
  if (k === 'value') return typeof x.var === 'string' && typeof x.op === 'string' && ok('value') && ok('forS');
  if (k === 'slope') return typeof x.var === 'string' && typeof x.op === 'string' && ok('perMin') && ok('overS');
  if (k === 'unchanged') return typeof x.var === 'string' && ok('withinPct') && (x.since === 'phaseStart' ? !('overS' in x) : ok('overS'));
  return false;
}

/** A new leaf of `kind` as the add form starts it: the lists' first choices, the numbers left for the author. */
export function draftLeaf(kind: LeafKind, firstPhase: string): Rec {
  if (kind === 'value') return { value: { var: 'hr', op: '>' } };
  if (kind === 'slope') return { slope: { var: 'hr', op: '>' } };
  if (kind === 'unchanged') return { unchanged: { var: 'hr', since: 'phaseStart' } };
  if (kind === 'visited') return { visited: firstPhase };
  return { signal: 'pulseLoss' };
}

// ------------------------------------------------------------------------------------------------------- the tree

/** A node's place under the rule's root, as the validator's paths write it (fieldOf's `node`): '' the root, '/all/1',
 *  '/all/1/not'. */
export type NodePath = string;
const steps = (p: NodePath): Array<string | number> => p.split('/').slice(1).map((s) => (/^\d+$/.test(s) ? Number(s) : s));

/** The node at `p` under `root`, or undefined. */
export function nodeAt(root: unknown, p: NodePath): Rec | undefined {
  let n: unknown = root;
  for (const s of steps(p)) n = n && typeof n === 'object' ? (n as Rec)[s as string] : undefined;
  return n && typeof n === 'object' && !Array.isArray(n) ? (n as Rec) : undefined;
}
/** The parent of `p`: its group node, the child's index in it (or 'not'), and the group's path. */
function parentOf(p: NodePath): { path: NodePath; key: 'all' | 'any' | 'not'; i?: number } | null {
  const s = steps(p);
  if (!s.length) return null;
  if (s.at(-1) === 'not') return { path: `/${s.slice(0, -1).join('/')}`.replace(/^\/$/, ''), key: 'not' };
  return { path: `/${s.slice(0, -2).join('/')}`.replace(/^\/$/, ''), key: s.at(-2) as 'all' | 'any', i: s.at(-1) as number };
}

/** Put `node` in place of the node at `p` of `phase.enter` (the root: `enter` keeps its place in the phase). */
function replaceAt(phase: Phase, p: NodePath, node: Rec): void {
  const up = parentOf(p);
  if (!up) {
    phase.enter = node;
    return;
  }
  const g = nodeAt(phase.enter, up.path)!;
  if (up.key === 'not') g.not = node;
  else (g[up.key] as unknown[])[up.i!] = node;
}

/** What an edit may do at a node: the editor offers these and no other. */
export interface NodeEdits {
  /** Take the node out of its group (a group keeps at least one: the schema's minItems; a NOT and the root keep theirs). */
  remove: boolean;
  /** A one-child ALL or ANY, or a NOT, replaced by its child. */
  ungroup: boolean;
}
export function editsAt(root: unknown, p: NodePath): NodeEdits {
  const n = nodeAt(root, p);
  const up = parentOf(p);
  const g = up && up.key !== 'not' ? (nodeAt(root, up.path)?.[up.key] as unknown[] | undefined) : undefined;
  const k = n ? kindOf(n) : null;
  return {
    remove: !!g && g.length > 1,
    ungroup: k === 'not' || ((k === 'all' || k === 'any') && (n![k] as unknown[]).length === 1),
  };
}

/** The edits, each a change in place at `p` of the phase's rule; each refuses (returns false) what the schema would not
 *  accept, so no control can make such a rule. */
export const tree = {
  remove(phase: Phase, p: NodePath): boolean {
    if (!editsAt(phase.enter, p).remove) return false;
    const up = parentOf(p)!;
    (nodeAt(phase.enter, up.path)![up.key] as unknown[]).splice(up.i!, 1);
    return true;
  },
  /** The node inside a new ALL, ANY or NOT of its own, in its place. */
  wrap(phase: Phase, p: NodePath, kind: GroupKind): boolean {
    const n = nodeAt(phase.enter, p);
    if (!n) return false;
    replaceAt(phase, p, kind === 'not' ? { not: n } : { [kind]: [n] });
    return true;
  },
  ungroup(phase: Phase, p: NodePath): boolean {
    const n = nodeAt(phase.enter, p);
    if (!n || !editsAt(phase.enter, p).ungroup) return false;
    const k = kindOf(n)!;
    replaceAt(phase, p, k === 'not' ? (n.not as Rec) : (n[k] as Rec[])[0]!);
    return true;
  },
  /** ALL ↔ ANY: the same children, the group's other word. */
  setGroup(phase: Phase, p: NodePath, kind: 'all' | 'any'): boolean {
    const n = nodeAt(phase.enter, p);
    const k = n ? kindOf(n) : null;
    if (!n || (k !== 'all' && k !== 'any')) return false;
    if (k !== kind) replaceAt(phase, p, { [kind]: n[k] });
    return true;
  },
  /** A complete leaf added to the group at `p`; at a leaf or a NOT, the node and the leaf become an ALL in its place. */
  add(phase: Phase, p: NodePath, leaf: Rec): boolean {
    if (!leafComplete(leaf)) return false;
    const n = nodeAt(phase.enter, p);
    if (!n) return false;
    const k = kindOf(n);
    if (k === 'all' || k === 'any') (n[k] as Rec[]).push(leaf);
    else replaceAt(phase, p, { all: [n, leaf] });
    return true;
  },
};

// --------------------------------------------------------------------------------------------- the card's course

const asPhases = (F: Rec): Phase[] => (Array.isArray(F.phases) ? (F.phases as Phase[]) : []);
const idOf = (p: Phase) => (typeof p.id === 'string' ? p.id : '');
export const labelOf = (p: Phase | undefined): string => (p && typeof p.label === 'string' && p.label ? p.label : p ? idOf(p) : '');
const nextOf = (p: Phase): string[] => (Array.isArray(p.next) ? (p.next as string[]) : []);

/** Where phase `i` sits: the phases that may lead to it, and those it may lead to (in its `next` order). */
export function flowOf(F: Rec, i: number): { from: number[]; to: string[] } {
  const ps = asPhases(F);
  const id = idOf(ps[i]!);
  return { from: ps.flatMap((p, k) => (nextOf(p).includes(id) ? [k] : [])), to: nextOf(ps[i]!) };
}

/** The builder's warnings about the course (§5.3): a phase no phase leads to, or one the case cannot reach from its start.
 *  Each is `<path>: <words>` on the phase. Warnings: they never block a draft. */
export function courseWarnings(F: Rec): string[] {
  const ps = asPhases(F);
  const start = ps.findIndex((p) => p.initial === true);
  const seen = new Set<string>();
  if (start >= 0) {
    const todo = [idOf(ps[start]!)];
    while (todo.length) {
      const id = todo.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const n of nextOf(ps.find((p) => idOf(p) === id) ?? {})) todo.push(n);
    }
  }
  return ps.flatMap((p, i) => {
    if (p.initial === true) return [];
    if (!ps.some((q) => nextOf(q).includes(idOf(p)))) return [`/phases/${i}: no phase leads to ${labelOf(p)}: the case never enters it`];
    if (start >= 0 && !seen.has(idOf(p))) return [`/phases/${i}: ${labelOf(p)} cannot be reached from the starting phase, ${labelOf(ps[start])}`];
    return [];
  });
}

// ------------------------------------------------------------------------------------------- a phase id elsewhere

const ID = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
/** The keys whose value names a phase by its bare id (a rule's `visited`, a display rule's `phaseEntered`), and the
 *  lists of bare ids (a phase's `next`, an action's `phases`, a contraindication's `inPhases`). Every other mention is the
 *  anchor string `phase:<id>` (windows, script, debrief openers and handout questions). */
/** [ENG: ui] the schema's places, listed once. */
const ID_KEYS = new Set(['visited', 'phaseEntered']);
const ID_LISTS = new Set(['next', 'phases', 'inPhases']);
/** The keys an anchor string sits under: a window's or an outcome's `anchor`, a script entry's `on`, a debrief line's
 *  `at`, the anchors of a `first`. */
const ANCHOR_KEYS = new Set(['anchor', 'on', 'at', 'first']);

/** Every place outside the phases' own `next` lists that names phase `id`, as a validator path. */
export function mentionsOf(F: Rec, id: string): string[] {
  const out: string[] = [];
  const walk = (v: unknown, path: string, key: string) => {
    if (typeof v === 'string') {
      if ((ANCHOR_KEYS.has(key) && v === `phase:${id}`) || (ID_KEYS.has(key) && v === id)) out.push(path);
    } else if (Array.isArray(v)) {
      v.forEach((x, k) => {
        if (typeof x === 'string' && ID_LISTS.has(key) && x === id) {
          if (!(key === 'next' && /^\/phases\/\d+\/next$/.test(path))) out.push(`${path}/${k}`);
        } else walk(x, `${path}/${k}`, key);
      });
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}/${k}`, k);
  };
  for (const [k, v] of Object.entries(F)) walk(v, `/${k}`, k);
  return out;
}

/** Why `id` cannot be phase `i`'s id, or null. */
export function idProblem(F: Rec, i: number, id: string): string | null {
  if (!ID.test(id)) return 'an id starts with a letter, then letters, digits, “.”, “_” or “-”, at most 64';
  if (asPhases(F).some((p, k) => k !== i && idOf(p) === id)) return 'another phase has this id';
  return null;
}

/** Phase `i` renamed to `to`, and every mention of its old id with it (the `next` lists, `visited`, `phaseEntered`,
 *  `phases`, `inPhases`, the `phase:<id>` anchors): in place, each string where it was. False when `to` is refused. */
export function renamePhase(F: Rec, i: number, to: string): boolean {
  const ps = asPhases(F);
  const from = idOf(ps[i]!);
  if (idProblem(F, i, to) !== null) return false;
  if (from === to) return true;
  const walk = (v: unknown, key: string): unknown => {
    if (typeof v === 'string') return ANCHOR_KEYS.has(key) && v === `phase:${from}` ? `phase:${to}` : ID_KEYS.has(key) && v === from ? to : v;
    if (Array.isArray(v)) {
      v.forEach((x, k) => (v[k] = typeof x === 'string' && ID_LISTS.has(key) && x === from ? to : walk(x, key)));
      return v;
    }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (v as Rec)[k] = walk(x, k);
    return v;
  };
  for (const [k, v] of Object.entries(F)) walk(v, k);
  ps[i]!.id = to;
  return true;
}

/** An id for a new phase from its label ("Late signs" → "lateSigns"), made unique with a number. */
export function idFromLabel(F: Rec, label: string): string {
  const words = label.normalize('NFKD').replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  let base = words.map((w, k) => (k ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('').slice(0, 56);
  if (!/^[A-Za-z]/.test(base)) base = `phase${base}`;
  const taken = new Set(asPhases(F).map(idOf));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
}

// ------------------------------------------------------------------------------------------- Instructor v2's words

/** What Instructor v2 will show for phase `i`, produced by its own functions: the ACTION row a preceding phase offers
 *  (`phaseRowsOf`, "Early signs" over "EtCO₂ climbing, HR up · when EtCO₂ > 45 and …, held 20 s"), the cue box's line
 *  once entered (cue.ts's words, through `phaseRuleWords`), and the rule's own words. */
export function instructorWords(doc: ScenarioDocV2, i: number): { row: { title: string; subtitle: string } | null; cue: string; rule: string | null } {
  const p = doc.phases[i]!;
  const from = doc.phases.find((q) => q.next?.includes(p.id));
  const row = from ? phaseRowsOf(doc, from.id).find((r) => r.kind === 'auto' && r.tr.to === p.id) : undefined;
  return {
    row: row ? { title: (row as { title: string }).title, subtitle: (row as { subtitle: string }).subtitle } : null,
    cue: p.enter ? `entered by its own rule (${phaseRuleWords(p.enter, doc)}${p.holdS ? `, held ${p.holdS} s` : ''})` : 'the case starts here',
    rule: p.enter ? phaseRuleWords(p.enter, doc) : null,
  };
}

/** The words of one node of a rule (a leaf, a group), as `phaseRuleWords` writes it. */
export const nodeWords = (r: Rec, doc: ScenarioDocV2): string => phaseRuleWords(r as unknown as PhaseRule, doc);

/** The names in a rule's words that are the format's own, not words: a variable `phaseRuleWords` has no words for (it
 *  prints its name: "svr > 1.5"), a rhythm id ("rhythm vfCoarse"), a phase that is not this card's. The page shows them
 *  in `<code>`, and each is a finding against `phaseRuleWords` (its words are not changed here). */
/** Variables whose format name is also their clinical word ("lactate"): not a raw name when the words print it.
 *  [ENG: ui] read off phaseRuleWords' output for every truthVar (phases.test.ts). */
const PLAIN_NAMES: ReadonlySet<string> = new Set(['lactate']);
export function rawNames(r: unknown, doc: ScenarioDocV2, words: string): string[] {
  const out = new Set<string>();
  const has = (w: string) => new RegExp(`(^|[^A-Za-z0-9_.:-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z0-9_.-])`).test(words);
  const walk = (n: unknown) => {
    if (!n || typeof n !== 'object') return;
    const x = n as Rec;
    for (const k of ['value', 'slope', 'unchanged']) {
      const v = (x[k] as Rec | undefined)?.var;
      if (typeof v === 'string' && !PLAIN_NAMES.has(v) && has(v)) out.add(v);
    }
    if (typeof x.signal === 'string' && x.signal.startsWith('rhythm:') && has(x.signal.slice(7))) out.add(x.signal.slice(7));
    if (typeof x.visited === 'string' && !doc.phases.some((p) => p.id === x.visited) && has(x.visited)) out.add(x.visited);
    for (const k of ['all', 'any']) if (Array.isArray(x[k])) (x[k] as unknown[]).forEach(walk);
    walk(x.not);
  };
  walk(r);
  return [...out];
}
