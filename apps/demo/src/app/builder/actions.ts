// The action editor's model (docs/plans/scenario-builder.md §5.4, piece B4): what an action may say and how it is graded.
// Pure, no DOM. Every list is the format's own or the engine's: the kinds and the routes are read from the /2 schema, the
// drugs and their classes from the engine's `DRUGS`, each route's state for a drug from `routeHonoured` and the row's
// route models (the validator's own warning source), the dose and rate units from the Drug sheet's own lists
// (drugs.ts). actions.test.ts holds every table equal to its source. An amount, a dose and a window are checked against
// the schema's own bounds before a number is written, so no control writes what the validator refuses.
//
// "How it grades": the examples beside an action are `grade()`'s own output (controller grade.ts, unchanged) on a short
// synthetic course the builder writes: the action's first phase entered at 1:00, its anchor at 1:30 (a rule-like anchor's
// rule, the pulse loss or ROSC true then; an `action:` anchor's action pressed then), and the gives below. The records
// are written in the shape the driver records a give in (driver.ts `administrationOf`, which is not exported: a finding).
//
// Lossless: every edit changes the node it names in place; a new field comes last in its object; nothing is written
// while an action is only read.
import { LEARNER_LAB_PANELS } from '@pme/controller';
import { grade, SCENARIO_SCHEMA_V2, type Action, type ActionGrade, type Administration, type PhaseEntry, type RuleEdge, type ScenarioDocV2 } from '@pme/controller/scenario';
import { DRUGS, routeHonoured, type PkRoute } from '@pme/engine-core';
import { phaseRowsOf } from '../card-read.ts';
import { DRUG_LIST, doseUnits, PRESETS, rateUnits, unitText, type DrugItem } from '../drugs.ts';
import { drugName } from '../glossary.ts';

type Rec = Record<string, unknown>;
const DEFS = (SCENARIO_SCHEMA_V2 as { definitions: Record<string, Rec> }).definitions;
const actionProps = (DEFS.action as { properties: Record<string, Rec> }).properties;

// ------------------------------------------------------------------------------------------------------------ kinds

/** The schema's action kinds, in its order. */
export const KINDS: readonly string[] = (actionProps.kind as { enum: string[] }).enum;
/** Each kind in the author's words, the block that holds its criteria (the validator's own table, validate.ts
 *  KIND_BLOCK: a kind with none is matched by its own press or the `record` command), and how it is matched. [ENG: ui]
 *  the words are the builder's, from the guide's "How a press is recorded"; the blocks are the validator's
 *  (actions.test.ts proves each against validateScenario). */
export const KIND_INFO: Readonly<Record<string, { words: string; block: string | null; matched: string }>> = {
  drug: { words: 'A drug', block: 'drug', matched: 'by the drug given (its id, its class or an alternative), whoever gave it' },
  device: { words: 'A device setting', block: 'device', matched: 'by the device’s settings reaching the engine, whatever sent them' },
  procedure: { words: 'A procedure', block: null, matched: 'by its own press' },
  fluid: { words: 'A fluid', block: 'fluid', matched: 'by a fluid of its types reaching the engine' },
  physical: { words: 'A physical measure', block: 'physical', matched: 'by a fluid or physical record (cooling is the cold fluid)' },
  sample: { words: 'A sample', block: null, matched: 'by its own press, or a lab sample of a listed panel' },
  communication: { words: 'A team act the instructor observes', block: null, matched: 'by its own press (the instructor presses it when the team does it)' },
  decision: { words: 'A decision, graded on its effect', block: 'effect', matched: 'by one of its effects reaching the engine' },
};
/** Every block a kind may own (the validator refuses each on another kind). */
export const BLOCKS: readonly string[] = ['drug', 'device', 'fluid', 'physical', 'effect', 'sample'];

// ----------------------------------------------------------------------------------------------------------- routes

/** The schema's routes, in its order. */
export const ROUTES: readonly PkRoute[] = (DEFS.route as { enum: PkRoute[] }).enum;
/** A route in words. [ENG: ui] the builder's words for the schema's eight ids. */
export const ROUTE_WORDS: Readonly<Record<string, string>> = { iv: 'IV', io: 'IO', im: 'IM', inh: 'inhaled', neb: 'nebulised', sc: 'SC', perineural: 'perineural', central: 'central line' };
export type RouteState = 'modelled' | 'local' | 'not modelled';
/** How the engine takes a dose of `drugId` by `route`: its kinetics (`routeHonoured`), a route model with no systemic
 *  absorption (dantrolene IM: F = 0, a local effect only), or not at all (the validator's warning, the run's "route not
 *  modelled"). */
export function routeState(drugId: string, route: string): RouteState {
  if (!routeHonoured(drugId, route as PkRoute)) return 'not modelled';
  const m = (DRUGS[drugId] as { routeModels?: Record<string, { F?: number }> } | undefined)?.routeModels?.[route];
  return m && m.F === 0 ? 'local' : 'modelled';
}
/** A route's state in words. [ENG: ui] */
export const ROUTE_STATE_WORDS: Readonly<Record<RouteState, string>> = { modelled: 'modelled', local: 'modelled: no systemic effect', 'not modelled': 'not modelled' };

// ------------------------------------------------------------------------------------------------------------ drugs

/** The drugs a drug action may name: the engine's rows the Drug sheet lists, by name, without the vaporiser agents (a
 *  volatile row takes no drug dose: `routeHonoured` is false for every route) and the placeholder rows (no drug). The
 *  validator accepts any row's id; a card's own id outside this list is kept and named. */
export const DRUG_CHOICES: readonly DrugItem[] = DRUG_LIST.filter((d) => d.cls !== 'volatile');
/** The engine's drug classes (a `cls` criterion), each with the drugs it holds, in the engine's row order. */
export const CLASSES: ReadonlyArray<{ cls: string; members: string[] }> = (() => {
  const m = new Map<string, string[]>();
  for (const r of Object.values(DRUGS)) {
    if (!m.has(r.cls)) m.set(r.cls, []);
    m.get(r.cls)!.push(r.id);
  }
  return [...m].map(([cls, members]) => ({ cls, members }));
})();
/** A class in words: the names of its drugs ("Phenylephrine, Metaraminol"). */
export const classWords = (cls: string): string => {
  const c = CLASSES.find((x) => x.cls === cls);
  return c ? c.members.map((id) => drugName(id)).join(', ') : cls;
};
const item = (id: string): DrugItem | undefined => DRUG_LIST.find((d) => d.id === id);
/** The units a dose of `id` may be written in (the Drug sheet's own): a bolus's, or an infusion's rate. The card's own
 *  unit is kept by the page when it is not among them. */
export const unitsFor = (id: string | undefined, rate: boolean): string[] => {
  const d = id ? item(id) : undefined;
  return d ? (rate ? rateUnits(d) : doseUnits(d)) : [];
};
/** The drug a criterion names first: its id, its class's first drug, its first alternative. */
export const drugOf = (d: Rec | undefined): string | undefined =>
  typeof d?.id === 'string' ? d.id : typeof d?.cls === 'string' ? CLASSES.find((c) => c.cls === d.cls)?.members[0] : Array.isArray(d?.alternatives) ? String((d.alternatives as Rec[])[0]?.id ?? '') || undefined : undefined;

// ---------------------------------------------------------------------------------------------- amounts and doses

/** The schema's two number blocks: a `dose` (value > 0, min and max ≥ 0, a unit) and an `amount` (any value; a window
 *  of seconds, a setting, a volume). Both need one of value, min, max; a tolerance needs a value and is ≥ 0. */
export type AmountKind = 'dose' | 'amount' | 'cumulative';
/** Why `a` is not a block the schema accepts, or null. [ENG: ui] the schema's own bounds (definitions dose and amount),
 *  copied so a field can say why a number is not written; the validator stays the judge. */
export function amountProblem(a: Rec, kind: AmountKind): string | null {
  const num = (k: string) => a[k] === undefined || (typeof a[k] === 'number' && Number.isFinite(a[k]));
  if (!['value', 'tolerance', 'min', 'max'].every(num)) return 'not a number';
  if (kind === 'cumulative') {
    // drugCriteria.cumulative: min or max, each at least 0, a unit (windowS is kept as the card has it)
    if (a.min === undefined && a.max === undefined) return 'the highest or the lowest is needed';
    if ((typeof a.min === 'number' && a.min < 0) || (typeof a.max === 'number' && a.max < 0)) return 'at least 0';
    return typeof a.unit === 'string' && a.unit ? null : 'a unit is needed';
  }
  if (a.value === undefined && a.min === undefined && a.max === undefined) return 'one of the value, the lowest or the highest is needed';
  if (a.tolerance !== undefined && a.value === undefined) return 'a tolerance needs the value';
  if (typeof a.tolerance === 'number' && a.tolerance < 0) return 'a tolerance is at least 0';
  if (kind === 'dose') {
    if (typeof a.value === 'number' && a.value <= 0) return 'a dose is more than 0';
    if ((typeof a.min === 'number' && a.min < 0) || (typeof a.max === 'number' && a.max < 0)) return 'a dose is at least 0';
    if (typeof a.unit !== 'string' || !a.unit) return 'a unit is needed';
  }
  return null;
}
/** `a` with field `k` set to `n` (undefined: removed), in place when the schema accepts it; else why not, unchanged. */
export function setAmount(a: Rec, k: string, n: number | undefined, kind: AmountKind): string | null {
  const next: Rec = { ...a, [k]: n };
  if (n === undefined) delete next[k];
  const p = amountProblem(next, kind);
  if (p !== null) return p;
  if (n === undefined) delete a[k];
  else a[k] = n;
  return null;
}
/** An amount in words, as the grader asks for it ("2–3", "≥ 10", "20 ± 2"). */
export function amountWords(a: Rec | undefined, unit = ''): string {
  if (!a) return '';
  const u = unit ? ` ${unitText(unit)}` : '';
  if (typeof a.min === 'number' && typeof a.max === 'number') return `${a.min}–${a.max}${u}`;
  if (typeof a.min === 'number') return `at least ${a.min}${u}`;
  if (typeof a.max === 'number') return `at most ${a.max}${u}`;
  if (typeof a.value === 'number') return `${a.value}${typeof a.tolerance === 'number' && a.tolerance ? ` ± ${a.tolerance}` : ''}${u}`;
  return '';
}
/** Every number of an amount in words, for "the card keeps …" ("2.5 mg/kg, accepted 2–3"). */
export function amountAll(a: Rec, unit = ''): string {
  const u = unit ? ` ${unitText(unit)}` : '';
  const v = typeof a.value === 'number' ? `${a.value}${typeof a.tolerance === 'number' && a.tolerance ? ` ± ${a.tolerance}` : ''}${u}` : '';
  const r = typeof a.min === 'number' || typeof a.max === 'number' ? amountWords({ min: a.min, max: a.max }, v ? '' : unit) : '';
  return v && r ? `${v}, accepted ${r}` : v || r;
}
/** The prescribed number of an amount: its value, else the middle of its range, else its one bound. */
export const prescribed = (a: Rec | undefined): number | undefined =>
  !a ? undefined : typeof a.value === 'number' ? a.value : typeof a.min === 'number' && typeof a.max === 'number' ? (a.min + a.max) / 2 : typeof a.min === 'number' ? a.min : typeof a.max === 'number' ? a.max : undefined;

/** A builder warning (§5.5, never a block) about an amount no number can satisfy: its lowest above its highest, or its
 *  prescribed value outside its own range (grade() reads the range: the value is then never what is graded). */
export function amountWarning(a: Rec | undefined, what: string): string | null {
  if (!a) return null;
  if (typeof a.min === 'number' && typeof a.max === 'number' && a.min > a.max) return `no ${what} can satisfy ${a.min}–${a.max}: the lowest is above the highest`;
  if (typeof a.value === 'number' && ((typeof a.min === 'number' && a.value < a.min) || (typeof a.max === 'number' && a.value > a.max))) return `the ${what} ${a.value} is outside the accepted ${amountWords(a)}: grade() reads the range`;
  return null;
}

// ----------------------------------------------------------------------------------------------------- settings

/** The settings a device record carries, by device kind, as the driver records them (driver.ts administrationOf: the
 *  ventilator's rr, vtMl, fio2, peep and source; the vaporiser's agent, dial and fresh gas; CPR's rate; the
 *  defibrillator's action and energy; the airway's device; `vtMlPerKg` is grade()'s per-kg reading of vtMl), each in words
 *  with its unit and whether it is a word (a string the record must match). [ENG: ui] read off administrationOf and
 *  grade.ts deviations(); the words are the builder's. */
export const SETTINGS: Readonly<Record<string, ReadonlyArray<{ k: string; words: string; unit: string; word?: readonly string[] }>>> = {
  ventilation: [
    { k: 'rr', words: 'Rate', unit: '/min' }, { k: 'vtMl', words: 'Tidal volume', unit: 'mL' }, { k: 'vtMlPerKg', words: 'Tidal volume per kg', unit: 'mL/kg' },
    { k: 'fio2', words: 'FiO₂', unit: 'fraction, 0.21–1' }, { k: 'peep', words: 'PEEP', unit: 'cmH₂O' }, { k: 'source', words: 'Source', unit: '', word: ['ventilator', 'bvm'] },
  ],
  vaporiser: [{ k: 'dialPct', words: 'Dial', unit: '%' }, { k: 'fgfLpm', words: 'Fresh gas flow', unit: 'L/min' }, { k: 'agent', words: 'Agent', unit: '', word: ['sevoflurane', 'isoflurane', 'desflurane'] }],
  cpr: [{ k: 'rate', words: 'Compression rate', unit: '/min' }],
  defib: [{ k: 'energyJ', words: 'Energy', unit: 'J' }, { k: 'action', words: 'Action', unit: '', word: ['shock'] }],
  airway: [{ k: 'device', words: 'Device', unit: '', word: ['ett', 'lma', 'mask'] }],
};
/** The schema's device kinds, in its order. */
export const DEVICE_KINDS: readonly string[] = (DEFS.deviceKind as { enum: string[] }).enum;
/** A device kind in words. [ENG: ui] */
export const DEVICE_WORDS: Readonly<Record<string, string>> = { ventilation: 'Ventilation', cpr: 'CPR', defib: 'Defibrillator', vaporiser: 'Vaporiser', airway: 'Airway device' };
/** The fluids a fluid action may name: the ids the Drug sheet's Fluids group and the circulation and blood models give
 *  (physiology-console/actions.ts FLUID_IDS). [ENG: ui] */
export { FLUID_IDS } from '../../physiology-console/actions.ts';
/** The lab panels a sample action may list: the ones the engine draws (the validator warns on any other). */
export const PANELS: readonly string[] = [...LEARNER_LAB_PANELS];

/** The record kinds a violation's `match.kind` may name (types-v2 Administration's kinds), in words. [ENG: ui] */
export const RECORD_KINDS: ReadonlyArray<[string, string]> = [
  ['drug', 'a drug bolus'], ['infusion', 'a drug infusion'], ['tci', 'a TCI'], ['vaporiser', 'the vaporiser'], ['fluid', 'a fluid'], ['ventilation', 'ventilation'],
  ['cpr', 'CPR'], ['defib', 'the defibrillator'], ['airway', 'an airway device'], ['procedure', 'a procedure'], ['sample', 'a sample'], ['communication', 'a team act'], ['physical', 'a physical measure'],
];

// --------------------------------------------------------------------------------------------------------- anchors

export type AnchorKind = 'start' | 'phase' | 'action' | 'pulseLoss' | 'rosc' | 'rule' | 'each' | 'display' | 'first';
/** The window anchors of the guide's table, in words. `display` and `first` are read and kept; the builder does not
 *  write a new one (see the action editor's note). [ENG: ui] */
export const ANCHORS: ReadonlyArray<[AnchorKind, string]> = [
  ['start', 'the start of the case'], ['phase', 'a phase’s first entry'], ['action', 'an action’s administration'], ['pulseLoss', 'the model’s pulse loss'],
  ['rosc', 'the return of circulation'], ['rule', 'the first second a truth rule holds'], ['each', 'each taking of an action (one window per taking)'],
  ['display', 'the first second a rule on the displayed numerics holds'], ['first', 'the earliest of several anchors'],
];
export function anchorKind(a: unknown): AnchorKind | null {
  if (typeof a === 'string') {
    if (a === 'start' || a === 'pulseLoss' || a === 'rosc') return a;
    if (a.startsWith('phase:')) return 'phase';
    if (a.startsWith('each:action:')) return 'each';
    if (a.startsWith('action:')) return 'action';
    return null;
  }
  if (a && typeof a === 'object') return 'rule' in a ? 'rule' : 'display' in a ? 'display' : 'first' in a ? 'first' : null;
  return null;
}

// ---------------------------------------------------------------------------------------------------- the card

const actionsOf = (F: Rec): Rec[] => (Array.isArray(F.actions) ? (F.actions as Rec[]) : []);
const phasesOf = (F: Rec): Rec[] => (Array.isArray(F.phases) ? (F.phases as Rec[]) : []);
const ID = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

/** Why `id` cannot be action `i`'s id, or null. */
export function actionIdProblem(F: Rec, i: number, id: string): string | null {
  if (!ID.test(id)) return 'an id starts with a letter, then letters, digits, “.”, “_” or “-”, at most 64';
  if (actionsOf(F).some((a, k) => k !== i && a.id === id)) return 'another action has this id';
  return null;
}
/** An id for a new action from its label, unique among the card's actions. */
export function actionIdFromLabel(F: Rec, label: string): string {
  const words = label.normalize('NFKD').replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  let base = words.map((w, k) => (k ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('').slice(0, 56);
  if (!/^[A-Za-z]/.test(base)) base = `action${base}`;
  const taken = new Set(actionsOf(F).map((a) => a.id));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
}

/** The places that name action `id`: a window's or an outcome's `action:` or `each:action:` anchor (and inside a
 *  `first`), a violation's `afterAction`, an action's `order`, a script entry's `action:<id>#<n>`, a debrief line's
 *  `action:` anchor. Each as `[path, how]`. */
function walkMentions(F: Rec, id: string, rename?: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`^(each:)?action:${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(#\\d+)?$`);
  const walk = (v: unknown, path: string, key: string, parent: Rec | unknown[] | null, pk: string | number) => {
    if (typeof v === 'string') {
      const hit = (['anchor', 'on', 'at', 'first'].includes(key) && re.test(v)) || (key === 'afterAction' && v === id) || ((key === 'after' || key === 'before') && v === id);
      if (hit) {
        out.push(path);
        if (rename !== undefined && parent) (parent as Rec)[pk as string] = key === 'afterAction' || key === 'after' || key === 'before' ? rename : v.replace(`action:${id}`, `action:${rename}`);
      }
    } else if (Array.isArray(v)) v.forEach((x, k) => walk(x, `${path}/${k}`, key, v, k));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}/${k}`, k, v as Rec, k);
  };
  for (const [k, v] of Object.entries(F)) walk(v, `/${k}`, k, F, k);
  return out;
}
export const actionMentions = (F: Rec, id: string): string[] => walkMentions(F, id);
/** Action `i` renamed to `to`, and every mention with it (in place, each string where it was). False when refused. */
export function renameAction(F: Rec, i: number, to: string): boolean {
  const a = actionsOf(F)[i];
  if (!a || actionIdProblem(F, i, to) !== null) return false;
  const from = String(a.id);
  if (from === to) return true;
  walkMentions(F, from, to);
  a.id = to;
  return true;
}

/** The phases the case can reach from its start, by the phases' `next` lists. */
export function reachablePhases(F: Rec): Set<string> {
  const ps = phasesOf(F);
  const seen = new Set<string>();
  const todo = ps.filter((p) => p.initial === true).map((p) => String(p.id));
  while (todo.length) {
    const id = todo.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of (ps.find((p) => p.id === id)?.next as string[] | undefined) ?? []) todo.push(n);
  }
  return seen;
}

// ------------------------------------------------------------------------------------------- a new action, a kind

/** The criteria block a kind starts with, complete enough for the validator once the author has chosen what it needs:
 *  a drug, a device setting, a fluid type, a measure, an effect. Null for a kind without a block. */
export function draftBlock(kind: string): Rec | null {
  if (kind === 'drug') return { id: '' };
  if (kind === 'device') return { kind: 'ventilation', settings: {} };
  if (kind === 'decision') return { kind: 'vaporiser', settings: {} };
  if (kind === 'fluid') return { type: [] };
  if (kind === 'physical') return { measure: '' };
  return null;
}
/** A draft block made complete: what is still missing in words, or null. */
export function blockMissing(kind: string, b: Rec | null): string | null {
  if (kind === 'drug') return typeof b?.id === 'string' && b.id ? null : 'a drug';
  if (kind === 'device' || kind === 'decision') {
    const s = (b?.settings ?? {}) as Rec;
    if (!Object.keys(s).length) return 'a setting with its accepted value';
    return Object.values(s).every((v) => typeof v === 'string' ? v.length > 0 : amountProblem(v as Rec, 'amount') === null) ? null : 'the setting’s accepted value';
  }
  if (kind === 'fluid') return Array.isArray(b?.type) && b.type.length ? null : 'a fluid';
  if (kind === 'physical') return typeof b?.measure === 'string' && ID.test(b.measure) ? null : 'the measure’s name (a letter, then letters or digits)';
  return null;
}
/** Write `block` as kind `kind`'s criteria on `a` (decision: one effect), every other kind's block removed. */
export function setKind(a: Rec, kind: string, block: Rec | null): void {
  for (const b of BLOCKS) if (b !== KIND_INFO[kind]?.block && !(b === 'sample' && kind === 'sample')) delete a[b];
  a.kind = kind;
  const own = KIND_INFO[kind]?.block;
  if (own && block) a[own] = kind === 'decision' ? [block] : block;
}

// --------------------------------------------------------------------------------------------- Instructor v2's row

/** The ACTION row Instructor v2 draws for action `i` in its first phase (`phaseRowsOf`, its own function), or why it
 *  could not be produced (Instructor v2's own words threw: reported, never rewritten here). */
export function instructorRow(doc: ScenarioDocV2, i: number): { title: string; subtitle: string; phase: string } | { error: string } {
  const a = doc.actions[i];
  if (!a) return { error: 'no such action' };
  try {
    for (const p of a.phases) {
      const r = phaseRowsOf(doc, p).find((x) => (x as { actionId?: string }).actionId === a.id) as { title: string; subtitle: string } | undefined;
      if (r) return { title: r.title, subtitle: r.subtitle, phase: p };
    }
    return { error: 'none of its phases is in the card' };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------------------------- How it grades

/** One worked example: the give in words, and `grade()`'s own row for the action then (`live`, its lines) with the
 *  violations the give raised. */
export interface Example {
  give: string;
  /** Seconds after the window opened (no window: after the action opened). */
  afterS: number | null;
  grade: ActionGrade['grade'];
  /** The first give's own grade (before its repeats): the row's grade is the worst of the two. */
  first: ActionGrade['grade'];
  live: string;
  lines: string[];
  violations: string[];
}
/** The course's times. [ENG: ui] the builder's: the first phase at 1:00, the anchor 30 s later; a give in the window
 *  halfway into it (at most a minute), a late one 30 s after it closed. */
export const COURSE = { openS: 60, anchorS: 90, lateS: 30, withinMaxS: 60 } as const;
const mmss = (s: number) => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

type Give = Omit<Administration, 'seq'>;
/** A press's command as the driver records it (administrationOf's shapes, for the commands a card's `give` sends). */
export function recordOf(c: Rec, t: number, w: number | undefined, actionId?: string): Give | null {
  if (c.type !== 'applyEvent') return null;
  const e = (c.event ?? {}) as Rec;
  const base = { t, source: (actionId ? 'action' : 'panel') as Administration['source'], ...(actionId ? { actionId } : {}) };
  const ok = { result: { accepted: true } as Administration['result'] };
  const cls = (id: string) => (DRUGS[id] ? { cls: DRUGS[id]!.cls as string } : {});
  const set = (o: Rec) => ({ settings: Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'number' || typeof v === 'string')) as Record<string, number | string> });
  const id = String(e.drugId);
  switch (e.kind) {
    case 'drug': {
      const unit = String(e.unit);
      const dose = Number(e.dose);
      const route = e.route as PkRoute | undefined;
      const result: Administration['result'] = route && id in DRUGS && !routeHonoured(id, route) ? { accepted: false, reason: `${id}: route ${route} is not modelled`, routeNotModelled: true } : { accepted: true };
      if (e.infusion) return { ...base, kind: 'infusion', drugId: id, ...cls(id), rate: dose, rateUnit: unit, ...(route ? { route } : {}), result };
      const perKg = unit.endsWith('/kg') ? dose : /^(mcg|mg|g)$/.test(unit) && w ? dose / w : undefined;
      return { ...base, kind: 'drug', drugId: id, ...cls(id), dose, unit, ...(perKg !== undefined ? { perKg } : {}), ...(route ? { route } : {}), ...(typeof e.overS === 'number' ? { overS: e.overS } : {}), result };
    }
    case 'infusion': return { ...base, kind: 'infusion', drugId: id, ...cls(id), rate: Number(e.rate), rateUnit: String(e.unit), ...ok };
    case 'vaporiser': return { ...base, kind: 'vaporiser', ...set({ agent: e.agent, dialPct: e.dialPct, fgfLpm: e.fgfLpm }), ...ok };
    case 'fluid': return { ...base, kind: 'fluid', fluid: { type: String(e.fluid), volumeMl: Number(e.volumeMl), rateMlMin: e.overS ? Number(e.volumeMl) / (Number(e.overS) / 60) : Number(e.volumeMl) }, ...ok };
    case 'ventilation': return { ...base, kind: 'ventilation', ...set({ source: e.source, rr: e.rr, vtMl: e.vtMl, fio2: e.fio2, peep: e.peep }), ...ok };
    case 'cpr': return { ...base, kind: 'cpr', ...set({ active: e.active ? 1 : 0, rate: e.rate }), ...ok };
    case 'defib': return { ...base, kind: 'defib', ...set({ action: e.action, energyJ: e.energyJ }), ...ok };
    case 'airwayDevice': return { ...base, kind: 'airway', ...set({ device: e.device }), ...ok };
    case 'preoxygenate': return { ...base, kind: 'procedure', ...set({ fio2: e.fio2, durationS: e.durationS }), ...ok };
  }
  return null;
}

/** The synthetic course for action `act`: the timeline, the rule edges and the records that open its window. */
function courseOf(doc: ScenarioDocV2, act: Action): { phases: PhaseEntry[]; edges: RuleEdge[]; admin: Give[] } {
  const initial = doc.phases.find((p) => p.initial)?.id ?? doc.phases[0]?.id ?? '';
  const phases: PhaseEntry[] = [{ id: initial, t: 0, rule: 'initial' }];
  const enter = (id: string, t: number) => phases.some((p) => p.id === id) || phases.push({ id, t, rule: 'example' });
  const first = act.phases[0] ?? initial;
  if (!act.phases.includes(initial)) enter(first, COURSE.openS);
  const open = act.phases.includes(initial) ? 0 : COURSE.openS;
  const edges: RuleEdge[] = [];
  const truth = (rule: string, t: number) => edges.push({ rule, t, value: true });
  const admin: Give[] = [];
  const at = COURSE.anchorS;
  const prime = (a: Action, t: number) => {
    // its precondition and its violations' conditions hold from its opening; its own rule-like anchor at t
    if (a.precondition) truth(`action:${a.id}:precondition`, open);
    a.contraindications?.forEach((_, k) => truth(`action:${a.id}:contraindication:${k}`, open));
    truth(`action:${a.id}:anchor`, t);
    const an = a.window?.anchor;
    if (an && typeof an === 'object' && 'first' in an) an.first.forEach((_, k) => truth(`action:${a.id}:anchor:${k}`, t));
  };
  prime(act, at);
  const an = act.window?.anchor;
  if (an === 'pulseLoss' || an === 'rosc') truth(an, at);
  if (an && typeof an === 'object' && 'first' in an) for (const x of an.first) if (x === 'pulseLoss' || x === 'rosc') truth(x, at);
  if (typeof an === 'string' && an.startsWith('phase:')) enter(an.slice(6), at);
  const other = typeof an === 'string' && an.startsWith('action:') ? an.slice(7) : typeof an === 'string' && an.startsWith('each:action:') ? an.slice(12) : null;
  const o = other ? doc.actions.find((x) => x.id === other) : undefined;
  if (o) {
    // the anchor's action, pressed at the anchor: its phases opened, its own window open, its press recorded
    if (!o.phases.some((p) => phases.some((e) => e.id === p))) enter(o.phases[0]!, open);
    prime(o, at);
    if (typeof o.window?.anchor === 'string' && o.window.anchor.startsWith('phase:')) enter(o.window.anchor.slice(6), at);
    const recs = (o.give ?? []).map((c) => recordOf(c as unknown as Rec, at, doc.patient?.weightKg, o.id)).filter((x): x is Give => x !== null);
    admin.push(...(recs.length ? recs : [{ t: at, source: 'action', actionId: o.id, kind: o.kind as Administration['kind'], result: { accepted: true } } as Give]));
  }
  return { phases: phases.sort((x, y) => x.t - y.t), edges, admin };
}

/** The give that meets the action's criteria as written (its prescribed dose, its preferred route, its form; its
 *  settings; its fluid), or a press of its own for a kind matched by its press. */
function prescribedGive(doc: ScenarioDocV2, act: Action, t: number): { words: string; rec: Give } | null {
  const w = doc.patient?.weightKg;
  const d = act.drug as Rec | undefined;
  if (act.kind === 'drug' && d) {
    const id = drugOf(d);
    if (!id) return null;
    const alt = Array.isArray(d.alternatives) ? (d.alternatives as Rec[]).find((x) => x.id === id) : undefined;
    const dose = (alt?.dose ?? d.dose) as Rec | undefined;
    const rate = d.rate as Rec | undefined;
    const route = String((d.route as Rec | undefined)?.preferred ?? ((d.route as Rec | undefined)?.set as string[] | undefined)?.[0] ?? 'iv');
    const inf = rate && 'infusion' in rate ? (rate.infusion as Rec) : undefined;
    if (inf) {
      const r = prescribed(inf) ?? 1;
      return { words: `${drugName(id)} infusion ${r} ${unitText(String(inf.unit))}`, rec: recordOf({ type: 'applyEvent', event: { kind: 'infusion', drugId: id, rate: r, unit: inf.unit } }, t, w)! };
    }
    const preset = PRESETS[id]?.bolus?.[0];
    const n = prescribed(dose) ?? preset?.[0] ?? 1;
    const unit = String(dose?.unit ?? preset?.[1] ?? item(id)?.amountUnit ?? 'mg');
    const overS = rate && 'overS' in rate ? prescribed(rate.overS as Rec) : undefined;
    return {
      words: `${drugName(id)} ${n} ${unitText(unit)} ${ROUTE_WORDS[route] ?? route}${overS ? ` over ${overS} s` : ''}`,
      rec: recordOf({ type: 'applyEvent', event: { kind: 'drug', drugId: id, dose: n, unit, route, ...(overS ? { overS } : {}) } }, t, w)!,
    };
  }
  const settled = act.kind === 'device' ? (act.device as unknown as Rec | undefined) : act.kind === 'decision' ? (act.effect?.[0] as unknown as Rec | undefined) : undefined;
  if (settled) {
    const kind = String(settled.kind);
    const s: Record<string, number | string> = {};
    for (const [k, v] of Object.entries((settled.settings ?? {}) as Rec)) {
      const n = typeof v === 'string' ? v : prescribed(v as Rec);
      if (n !== undefined) s[k === 'vtMlPerKg' && w ? 'vtMl' : k] = k === 'vtMlPerKg' && w && typeof n === 'number' ? n * w : n;
    }
    if (kind === 'cpr') s.active = 1;
    if (kind === 'defib') s.action ??= 'shock';
    const words = Object.entries(s).filter(([k]) => k !== 'active').map(([k, v]) => `${SETTINGS[kind]?.find((x) => x.k === k)?.words ?? k} ${v}`).join(', ');
    return { words: `${DEVICE_WORDS[kind] ?? kind}: ${words}`, rec: { t, source: 'panel', kind: (kind === 'airway' ? 'airway' : kind) as Administration['kind'], settings: s, result: { accepted: true } } };
  }
  if (act.kind === 'fluid' || act.kind === 'physical') {
    const f = (act.fluid ?? {}) as Rec;
    const type = String((f.type as string[] | undefined)?.[0] ?? 'saline');
    const vol = prescribed(f.volumeMl as Rec | undefined) ?? 1000;
    const rate = prescribed(f.rateMlMin as Rec | undefined) ?? vol / 15;
    return { words: `${type} ${vol} mL at ${Math.round(rate * 10) / 10} mL/min`, rec: { t, source: 'panel', kind: 'fluid', fluid: { type, volumeMl: vol, rateMlMin: rate }, result: { accepted: true } } };
  }
  if (act.kind === 'sample' && act.sample) return { words: `a ${act.sample.panel[0]} sample drawn`, rec: { t, source: 'panel', kind: 'sample', settings: { panel: act.sample.panel[0]! }, result: { accepted: true } } };
  return { words: 'its own press', rec: { t, source: 'action', actionId: act.id, kind: act.kind as Administration['kind'], result: { accepted: true } } };
}

/** The examples of how grade() grades action `i` of `doc` (§5.4, mock-up 3 "How it grades"). Empty for an action
 *  grade() leaves out (`graded: false`, a preparation step). */
export function gradeExamples(doc: ScenarioDocV2, i: number): { examples: Example[]; anchorS: number | null; note: string; due: string | null } {
  const act = doc.actions[i];
  if (!act || act.graded === false || act.preparation) return { examples: [], anchorS: null, due: null, note: act?.preparation ? 'A preparation step: recorded with its time, no verdict; grade() leaves it out.' : 'Not graded (a setup action): grade() leaves it out.' };
  const base = courseOf(doc, act);
  const run = (gives: Give[], t: number, final = false) => {
    const admin = [...base.admin, ...gives].sort((x, y) => x.t - y.t).map((a, seq) => ({ ...a, seq })) as Administration[];
    const g = grade(doc, base.phases, admin, base.edges, t, { final });
    const row = g.actions.find((x) => x.id === act.id)!;
    const mine = new Set(admin.filter((a) => gives.some((x) => x.t === a.t && x.kind === a.kind)).map((a) => a.seq));
    return { row, violations: g.violations.filter((v) => mine.has(v.seq)).map((v) => `${v.text}${v.harm === 'not modelled' ? ' (harm not modelled)' : ''}`) };
  };
  // the window as grade() opens it on this course, with nothing given
  const probe = run([], COURSE.anchorS + 1).row;
  const opened = probe.dueT ?? (act.window ? null : (base.phases.find((p) => act.phases.includes(p.id))?.t ?? null));
  if (opened === null || probe.grade === 'not applicable') {
    return { examples: [{ give: 'nothing yet', afterS: null, grade: probe.grade, first: probe.firstGrade, live: probe.live, lines: probe.lines, violations: [] }], anchorS: null, due: null, note: 'On the builder’s course the window never opens, so nothing can be graded: grade() says why.' };
  }
  const within = act.window?.withinS ?? COURSE.withinMaxS * 2;
  const notBefore = act.window?.notBeforeS ?? 0;
  const inS = notBefore ? Math.min(within, notBefore + (within - notBefore) / 2) : Math.min(COURSE.withinMaxS, within / 2);
  const out: Example[] = [];
  const add = (words: string, gives: Give[], afterS: number) => {
    const r = run(gives, opened + afterS + 1);
    out.push({ give: words, afterS, grade: r.row.grade, first: r.row.firstGrade, live: r.row.live, lines: r.row.lines, violations: r.violations });
  };
  const t = opened + inS;
  const w = doc.patient?.weightKg;
  const press = (act.give ?? []).map((c) => recordOf(c as unknown as Rec, t, w, act.id)).filter((x): x is Give => x !== null);
  if (press.length) add('As the press gives it', press, inS);
  const ok = prescribedGive(doc, act, t);
  if (ok) add(`${ok.words}`, [ok.rec], inS);
  const d = act.drug as Rec | undefined;
  if (act.kind === 'drug' && ok && d) {
    const rec = ok.rec as Give & Rec;
    const dose = ((Array.isArray(d.alternatives) ? (d.alternatives as Rec[])[0]?.dose : undefined) ?? d.dose) as Rec | undefined;
    const low = dose ? (typeof dose.min === 'number' ? dose.min : typeof dose.value === 'number' ? dose.value - (typeof dose.tolerance === 'number' ? dose.tolerance : 0) : undefined) : undefined;
    if (rec.kind === 'drug' && low !== undefined && low > 0) {
      const n = Math.round(low * 0.4 * 1000) / 1000;
      const r = recordOf({ type: 'applyEvent', event: { kind: 'drug', drugId: rec.drugId, dose: n, unit: dose!.unit, route: rec.route ?? 'iv' } }, t, w)!;
      add(`${drugName(String(rec.drugId))} ${n} ${unitText(String(dose!.unit))} ${ROUTE_WORDS[String(rec.route ?? 'iv')]} (under the accepted dose)`, [r], inS);
    }
    const route = d.route as { set?: string[]; preferred?: string } | undefined;
    const otherAllowed = route?.preferred ? route.set?.find((x) => x !== route.preferred) : undefined;
    const bolus = (r: string) => recordOf({ type: 'applyEvent', event: { kind: 'drug', drugId: rec.drugId, dose: rec.dose ?? 1, unit: rec.unit ?? 'mg', route: r } }, t, w)!;
    if (rec.kind === 'drug' && otherAllowed) add(`The same dose ${ROUTE_WORDS[otherAllowed] ?? otherAllowed} (allowed, not preferred)`, [bolus(otherAllowed)], inS);
    if (rec.kind === 'drug' && route?.set) {
      const named = act.contraindications?.flatMap((c) => c.match.route ?? []).find((x) => !route.set!.includes(x));
      const outside = named ?? ROUTES.find((x) => !route.set!.includes(x) && routeState(String(rec.drugId), x) !== 'not modelled') ?? ROUTES.find((x) => !route.set!.includes(x));
      if (outside) add(`The same dose ${ROUTE_WORDS[outside] ?? outside} (outside the route set)`, [bolus(outside)], inS);
    }
  }
  if (ok && act.window) {
    const late = within + COURSE.lateS;
    add(`${ok.words}, after the window closed`, [{ ...ok.rec, t: opened + late }], late);
  }
  const end = opened + Math.max(within, act.window?.failAfterS ?? 0) + COURSE.lateS;
  const none = run([], end, true).row;
  out.push({ give: 'Nothing, by the end of the run', afterS: null, grade: none.grade, first: none.firstGrade, live: none.live, lines: none.lines, violations: [] });
  const when = act.window ? `${act.window.withinS} s window opened at ${mmss(opened)}` : `opened at ${mmss(opened)}, no window`;
  // the row's live words the second its window opens, nothing given (Instructor v2's "due m:ss")
  const due = run([], opened).row.live;
  return { examples: out, anchorS: opened, due, note: `grade()’s own rows on the builder’s course (the action ${when}); each give ${mmss(inS)} after that unless it says otherwise.` };
}

/** The builder's warnings about the actions (§5.5), as validator-shaped lines (`<path>: <words>`): an amount no number
 *  satisfies, a press that grade() does not grade as met, an action open in no phase the case can reach. Warnings: they
 *  never block a draft. */
export function actionWarnings(doc: ScenarioDocV2, F: Rec): string[] {
  const out: string[] = [];
  const reach = reachablePhases(F);
  doc.actions.forEach((a, i) => {
    const at = `/actions/${i}`;
    const d = a.drug as Rec | undefined;
    const amounts: Array<[string, Rec | undefined, string]> = [
      ['drug/dose', d?.dose as Rec | undefined, 'dose'], ['drug/rate/infusion', (d?.rate as Rec | undefined)?.infusion as Rec | undefined, 'rate'],
      ['drug/rate/overS', (d?.rate as Rec | undefined)?.overS as Rec | undefined, 'time'], ['repeat/intervalS', a.repeat?.intervalS as Rec | undefined, 'interval'],
      ['repeatWhile/intervalS', a.repeatWhile?.intervalS as Rec | undefined, 'interval'],
    ];
    for (const [p, x, what] of amounts) {
      const w = amountWarning(x, what);
      if (w) out.push(`${at}/${p}: ${w}`);
    }
    if (a.phases.length && !a.phases.some((p) => reach.has(p))) out.push(`${at}/phases: open in no phase the case can reach from its start: its row is never offered`);
    if (a.give?.length && a.graded !== false && !a.preparation) {
      const ex = gradeExamples(doc, i).examples.find((e) => e.give === 'As the press gives it');
      if (ex && ex.first !== 'met') out.push(`${at}/give: the press as written is graded ${ex.first} by grade(), not met${ex.lines.length ? `: ${ex.lines.join('; ')}` : ''}`);
    }
  });
  return out;
}

/** The action editor's own lists, for the tests: the schema's kinds and routes as the builder offers them. */
export const SCHEMA_LISTS = { kinds: KINDS, routes: ROUTES, deviceKinds: DEVICE_KINDS };
