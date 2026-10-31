// Instructor v2, the ACTION rows classified live (design §3.4, §3.5; answers 4–8, 20). Pure: no DOM. It reads the card
// through card-read.ts (`rowsOf`, `objectivesOf`, `conditionNotMet`, `reachable`), the scenario's own history (which
// transition fired, when) and, on the host, the debrief's run record (when an objective's events happened). A follower
// has no record: its rows know what the history says (states entered) and nothing more, so they never read overdue or
// "condition not met" from events they cannot see.
//
// Which untaken step an objective asks for, its window and "failed" are card-read.ts `standingOf` / `untakenStatus`, the
// one reading the Debrief's steps table (debrief.ts `steps`) also uses, so the two agree by construction.
//
// The rows of the list are the CURRENT stage's (its own state's rows; a hop shows the stage it folds into). Every step
// of the stage stays in the list whatever its look, so nothing the card offers is hidden: a step taken that the card
// still offers (the treatment fan-out loops back into its stage) stays a pressable green row. Rows the case has left
// move to "Finished": the taken, failed and fired rows of the stages passed, and the judged objectives met.
// Nothing here ever disables a row: the look is all a status changes.
import type { ScenarioDoc, Transition } from '@pme/controller';
import type { RunEventId } from '@pme/controller/scenario';
import { conditionNotMet, objectivesOf, phaseRowsOf, rowsOf, stagesOf, standingOf, untakenStatus, type Evidence, type Row, type Stage } from '../card-read.ts';
import { grade, type Administration, type Grade, type Grades, type PhaseEntry, type PhaseHold, type RuleEdge, type ScenarioDocV2 } from '@pme/controller/scenario';
import { eventWords, isEvent, mmss, trendMeta, verdict } from '../debrief.ts';
import { drugWords } from '../glossary.ts';
import type { ClinicalLogEntry } from '../link.ts';
import type { RunData, ValueKey } from '../record.ts';
import { showVital, vitalOf } from '../vitals.ts';
import type { StateVar } from '@pme/engine-core';

/** The five looks of the design's row-state table (§3.5), with the A rows' two and the judged objective's "met". */
export type Look = 'current' | 'ready' | 'unmet' | 'taken' | 'met' | 'failed' | 'pending' | 'fired';

export interface LiveRow {
  row: Row;
  /** The stage the row belongs to. */
  stage: string;
  look: Look;
  /** The subtitle with the live part (a timer, a condition) appended. */
  subtitle: string;
  /** The right-hand label ("due in 1:00", "overdue 2:10", "08:16", "36.8 → 38.5"). */
  right: string;
  /** Seconds past the linked objective's window (answer 7), else null. Overdue is a ring on any open look. */
  overdue: number | null;
  /** Taken after a step with a higher array index of the same stage was taken (answer 7). */
  outOfOrder: boolean;
  /** When it was taken, met, fired or failed (sim seconds), else null. */
  at: number | null;
  /** An A row's bar, 0–1 (answer 8), else null. */
  progress: number | null;
  /** A /2 action's live grade (grade.ts, final: false); absent for a /1 row and for an action the card does not grade. */
  grade?: Grade;
}

export interface Board {
  stage: Stage | null;
  /** The current stage's rows in IP3's order (steps, judged objectives numbered on, automatic rows). */
  list: LiveRow[];
  /** Every taken, failed, fired or met row the case has left, in time order. */
  finished: LiveRow[];
  /** The off-card actions taken in this stage, from the log (answer 20). */
  offCard: ClinicalLogEntry[];
  /** A /2 phase's rows not due now (its "Not due now" fold, still rows of ACTION, pressable): a graded action not
   *  applicable and not given, an ungraded one given in an earlier phase. Absent for /1. */
  later?: LiveRow[];
}

/** One `vital` rule as the host-side runner reads it (`ScenarioDriver.vitalHolds()`, @pme/controller `VitalHold`). */
export interface HoldLike {
  transitionId: string;
  key: string;
  met: boolean;
  fraction: number;
}

/** What the rows are read from: the card, the scenario view, the clock, the log, and the host's record and holds. */
export interface Source {
  doc: ScenarioDoc;
  stateId: string;
  history: ReadonlyArray<{ t: number; stateId: string; transitionId?: string }>;
  /** The scenario view's entry time of the current state, for a run whose history is empty. */
  enteredT: number;
  simT: number;
  /** Time in the current state (pauses excluded): the `afterS` rows' clock. */
  inState: number;
  paused: boolean;
  log: readonly ClinicalLogEntry[];
  /** The host's run record (null on a follower). */
  record: RunData | null;
  /** The engine's state values (the 1 Hz `state` event): what a `vital` rule reads. */
  values: Partial<Record<string, number>> | undefined;
  /** The runner's hold progress (`ScenarioDriver.vitalHolds()`), host only; null on a follower. */
  holds: readonly HoldLike[] | null;
  /** The value each A row's bar starts from, kept by the caller across refreshes (key: stage entry time and row). */
  base: Map<string, number>;
}

// ---- the card's stages, once per document ----
const HOME = new WeakMap<ScenarioDoc, { stages: Stage[]; home: Map<string, string> }>();
function stagesFor(doc: ScenarioDoc) {
  let m = HOME.get(doc);
  if (!m) {
    const stages = stagesOf(doc);
    m = { stages, home: new Map(stages.flatMap((g) => g.states.map((s) => [s, g.id] as [string, string]))) };
    HOME.set(doc, m);
  }
  return m;
}

// ---- when an event happened: the host's record, else the scenario history (states only) ----
const VALUE = /^value:(hr|map|spo2|etco2|rr|temp|k|lactate|ph|glucose|tcore)([<>])(\d+(?:\.\d+)?)$/;
/** The first time `want` (or any of a list) happened at or after `from`, as the debrief reads it; null: not (yet). */
export function firstT(src: Pick<Source, 'record' | 'history'>, want: RunEventId | readonly RunEventId[], from = -Infinity): number | null {
  if (Array.isArray(want)) {
    const ts = want.map((w) => firstT(src, w, from)).filter((t): t is number => t !== null);
    return ts.length ? Math.min(...ts) : null;
  }
  const w = want as RunEventId;
  if (w === 'start') return 0;
  const d = src.record;
  if (!d) {
    if (!w.startsWith('state:')) return null;
    return src.history.find((e) => e.t >= from && `state:${e.stateId}` === w)?.t ?? null;
  }
  const v = VALUE.exec(w);
  if (v) {
    const k = v[1] as ValueKey;
    const lim = Number(v[3]);
    return d.samples.find((x) => x.t >= from && x[k] !== null && (v[2] === '<' ? (x[k] as number) < lim : (x[k] as number) > lim))?.t ?? null;
  }
  return d.rows.find((r) => r.undone === undefined && r.t >= from && isEvent(r.ev, w))?.t ?? null;
}

// ---- the stage visits, from the scenario history ----
interface Visit {
  stage: string;
  t0: number;
  /** The transitions fired in the visit, its leaving one included. */
  fired: Array<{ id: string; t: number }>;
  end: number | null;
}
/** The run as stage visits: a new visit when the stage changes, or when time goes back (a return to a bookmark). */
function visitsOf(src: Source, home: Map<string, string>): Visit[] {
  const out: Visit[] = [];
  let lastT = -Infinity;
  for (const e of src.history) {
    const stage = home.get(e.stateId) ?? e.stateId;
    const cur = out.at(-1);
    const back = e.t < lastT - 1e-6;
    lastT = e.t;
    if (cur && stage === cur.stage && !back) {
      if (e.transitionId !== undefined) cur.fired.push({ id: e.transitionId, t: e.t });
      continue;
    }
    if (cur) {
      if (e.transitionId !== undefined && !back) cur.fired.push({ id: e.transitionId, t: e.t });
      cur.end = e.t;
    }
    out.push({ stage, t0: e.t, fired: [], end: null });
  }
  const stage = home.get(src.stateId) ?? src.stateId;
  if (out.at(-1)?.stage !== stage) {
    const cur = out.at(-1);
    if (cur) cur.end = src.enteredT;
    out.push({ stage, t0: src.enteredT, fired: [], end: null });
  }
  return out;
}

const firedAt = (v: Visit, id: string): number | null => v.fired.find((f) => f.id === id)?.t ?? null;
/** Whether the host's record says transition `id`, fired at `t`, was fired by its own rule, not by a press (IP8's `by`;
 *  a follower has no record and cannot tell, so its mixed steps read taken). The Debrief's steps table reads the same
 *  field: such a step is not taken there either. */
const byItsRule = (src: Source, id: string, t: number): boolean =>
  !!src.record?.rows.some((r) => r.kind === 'scenario' && r.undone === undefined && r.tr === id && r.by === 'rule' && Math.abs(r.t - t) <= 0.05);
/** Taken after a step with a higher index of the same stage visit was taken. */
function outOfOrder(v: Visit, rows: readonly Row[], r: Extract<Row, { kind: 'step' }>, t: number): boolean {
  return rows.some((o) => o.kind === 'step' && o.index > r.index && (firedAt(v, o.tr.id) ?? Infinity) < t);
}

// ---- the A rows' bar ----
const OP_MET: Record<string, (a: number, b: number) => boolean> = { '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b, '==': (a, b) => a === b, '!=': (a, b) => a !== b };
const show = (v: string, x: number): string => {
  const s = vitalOf(v as StateVar);
  return s ? showVital(s, x) : String(Math.round(x * 10) / 10);
};
/** The share of an A row's bar the value fills before its rule is met; the hold fills the rest (answer 8). */
export const VALUE_PART = 0.7;
/** How near an A row is (answer 8): its value against the threshold, from where the stage began, times the runner's
 *  hold fraction on the host. */
function autoBar(src: Source, visit: Visit, tr: Transition): { progress: number | null; right: string } {
  const w = tr.when;
  if ('afterS' in w) return { progress: Math.min(1, src.inState / Math.max(w.afterS, 1e-6)), right: src.paused ? 'frozen' : `in ${mmss(Math.max(0, w.afterS - src.inState))}` };
  if ('atScenarioS' in w) return { progress: Math.min(1, src.simT / Math.max(w.atScenarioS, 1e-6)), right: src.paused ? 'frozen' : `in ${mmss(Math.max(0, w.atScenarioS - src.simT))}` };
  if (!('vital' in w)) return { progress: 0, right: '' };
  const { var: name, op, value: thr } = w.vital;
  const v = src.values?.[name];
  if (v === undefined || !Number.isFinite(v)) return { progress: 0, right: `→ ${show(name, thr)}` };
  const key = `${visit.t0}|${tr.id}`;
  if (!src.base.has(key)) src.base.set(key, v);
  const v0 = src.base.get(key) as number;
  const met = (OP_MET[op] ?? (() => false))(v, thr);
  const valueFrac = met ? 1 : thr === v0 ? 0 : Math.max(0, Math.min(1, (v - v0) / (thr - v0)));
  // One bar that only grows (the orchestrator's reading of answer 8): the value fills the first VALUE_PART of the width
  // until the threshold is met, then the rule's hold (the host's `vitalHolds()`) fills the rest. Without it (a
  // follower) a met rule's bar is full: value against threshold only.
  const hold = src.holds?.find((x) => x.transitionId === tr.id && x.key === tr.id) ?? null;
  const holdFrac = !met ? 0 : hold ? (hold.met ? hold.fraction : 0) : 1;
  return { progress: met ? VALUE_PART + (1 - VALUE_PART) * holdFrac : VALUE_PART * valueFrac, right: src.paused ? 'frozen' : `${show(name, v)} → ${show(name, thr)}` };
}

// ---- the off-card actions ----
/** The log lines that are not a clinical action: the clock, the scenario's own commands (a step's press is
 *  "Scenario event"), marks and returns (describe.ts `describeCommand`). */
const NOT_AN_ACTION = /^(Simulation (paused|resumed)|Speed ×|Fast-forward|Time changed|Scenario|Bookmark|Returned to bookmark)/;

/** The board of the current stage. */
export function classify(src: Source): Board {
  const { doc } = src;
  const { stages, home } = stagesFor(doc);
  const visits = visitsOf(src, home);
  const visit = visits.at(-1) as Visit;
  const stage = stages.find((g) => g.id === visit.stage) ?? null;
  const rows = rowsOf(doc, visit.stage);
  const d = src.record ?? ({ doc } as RunData); // eventWords reads only the card's state labels
  // a follower cannot see the values a condition names: it never fades a step for one (the step stays "ready")
  const isTrue = (e: RunEventId) => (!src.record && e.startsWith('value:')) || firstT(src, e) !== null;
  // the shared reading's evidence: the host's record (a rule met as the Debrief judges it), else the follower's history
  const rec = src.record;
  const ev: Evidence = { first: (w, from) => firstT(src, w, from), met: (rule) => rec !== null && verdict(rule, rec).status === 'met' };
  const lives: LiveRow[] = [];
  const finished: LiveRow[] = [];
  const base = (row: Row): LiveRow => ({ row, stage: visit.stage, look: 'ready', subtitle: row.subtitle, right: '', overdue: null, outOfOrder: false, at: null, progress: null });

  let expected = false;
  for (const row of rows) {
    const live = base(row);
    if (row.kind === 'judged') {
      const said = `Objective met: ${drugWords(row.text)}`;
      const met = src.log.find((x) => x.kind === 'marker' && x.text === said);
      if (met) finished.push({ ...live, look: 'met', at: met.simT, right: met.simT === null ? '' : mmss(met.simT), subtitle: 'you judged it' });
      else lives.push({ ...live, right: 'press when met', subtitle: 'you judge it · for the debrief only, the patient does not change' });
      continue;
    }
    if (row.kind === 'auto') {
      const t = firedAt(visit, row.tr.id);
      if (t !== null) finished.push({ ...live, look: 'fired', at: t, right: mmss(t), subtitle: `${row.subtitle} · fired, the case moved by itself` });
      else lives.push({ ...live, look: 'pending', ...autoBar(src, visit, row.tr) });
      continue;
    }
    const taken = firedAt(visit, row.tr.id);
    if (taken !== null && byItsRule(src, row.tr.id, taken)) {
      // a mixed step its own rule fired (answer 4's "or by itself"): the case moved by itself, as an A row's would
      lives.push({ ...live, look: 'fired', at: taken, right: mmss(taken), subtitle: `${row.subtitle} · fired by its own rule` });
      continue;
    }
    if (taken !== null) {
      const ooo = outOfOrder(visit, rows, row, taken);
      lives.push({ ...live, look: 'taken', at: taken, outOfOrder: ooo, right: mmss(taken), subtitle: `${row.subtitle} · taken${ooo ? ', out of order' : ''}` });
      continue;
    }
    // in a hop of the stage: failed only under the shared rule (an asking objective, its target out of reach)
    if (untakenStatus(doc, row.tr, { stateId: visit.stage, current: src.stateId, dueT: visit.t0, leftT: null, now: src.simT }, ev)?.status === 'failed') {
      finished.push({ ...live, look: 'failed', at: src.simT, right: `failed ${mmss(src.simT)}` });
      continue;
    }
    const linked = objectivesOf(doc, row.tr);
    const unmet = conditionNotMet(linked, isTrue);
    // the window of an objective asking for the step (answer 7; the shared reading, card-read.ts `standingOf`)
    const due = standingOf(doc, row.tr, { dueT: visit.t0, leftT: null, now: src.simT }, ev).dueS;
    const parts = [row.subtitle];
    if (unmet) {
      const cond = linked.find((o) => o.condition !== null)?.condition ?? [];
      parts.push(`the card expects it after ${eventWords([...cond], d)}`, 'pressable now');
    }
    if (due !== null && due > 0) parts.push(`due in ${mmss(due)}`);
    const overdue = due !== null && due <= 0 ? -due : null;
    if (overdue !== null) parts.push('still pressable');
    const look: Look = unmet ? 'unmet' : expected ? 'ready' : 'current';
    if (look === 'current') expected = true;
    const right = overdue !== null ? `overdue ${mmss(overdue)}` : due !== null ? `due in ${mmss(due)}` : unmet ? conditionNow(src, linked.find((o) => o.condition)?.condition ?? []) : 'ready';
    lives.push({ ...live, look, overdue, subtitle: parts.join(' · '), right });
  }

  // the stages passed: their taken, failed and fired rows. "Failed" (answer 7 as refined) is the shared reading's
  // (card-read.ts `untakenStatus`): a step an objective still asks for (linked by answer 6's rule, its anchor before the
  // stage was left, its event not given another way since) whose target the card can no longer reach. An alternative
  // branch not chosen, with no objective asking for it, is dropped (not in Finished either).
  const failed = new Map<string, LiveRow>(); // by transition: the last visit's
  for (const v of visits.slice(0, -1)) {
    const vr = rowsOf(doc, v.stage);
    const name = stages.find((g) => g.id === v.stage)?.label ?? 'Stage';
    for (const row of vr) {
      if (row.kind === 'judged') continue;
      const t = firedAt(v, row.tr.id);
      const live: LiveRow = { ...base(row), stage: v.stage };
      if (row.kind === 'auto') {
        if (t !== null) finished.push({ ...live, look: 'fired', at: t, right: mmss(t), subtitle: `${name} · fired, the case moved by itself` });
      } else if (t !== null && byItsRule(src, row.tr.id, t)) {
        finished.push({ ...live, look: 'fired', at: t, right: mmss(t), subtitle: `${name} · fired by its own rule` });
      } else if (t !== null) {
        const ooo = outOfOrder(v, vr, row, t);
        finished.push({ ...live, look: 'taken', at: t, outOfOrder: ooo, right: mmss(t), subtitle: `${name} · taken${ooo ? ', out of order' : ''}` });
      } else if (untakenStatus(doc, row.tr, { stateId: v.stage, current: src.stateId, dueT: v.t0, leftT: v.end, now: src.simT }, ev)?.status === 'failed') {
        const at = v.end ?? src.simT;
        const prev = failed.get(row.tr.id);
        if (prev) finished.splice(finished.indexOf(prev), 1);
        const f: LiveRow = { ...live, look: 'failed', at, right: `failed ${mmss(at)}`, subtitle: `${name} · its stage has passed` };
        failed.set(row.tr.id, f);
        finished.push(f);
      }
    }
  }
  finished.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));

  const offCard = src.log.filter((x) => (x.kind === 'instructor' || x.kind === 'learner') && !x.refused && (x.simT ?? -Infinity) >= visit.t0 - 1e-6 && !NOT_AN_ACTION.test(x.text));
  return { stage, list: lives, finished, offCard };
}

/** The value a "condition not met" step waits on, now ("K⁺ 4.3"), from the record's last sample; else "not yet". */
function conditionNow(src: Source, cond: readonly RunEventId[]): string {
  const v = cond.map((c) => VALUE.exec(c)).find((m) => m !== null);
  const last = src.record?.samples.at(-1);
  if (!v || !last) return 'not yet';
  const k = v[1] as ValueKey;
  const x = last[k];
  const m = trendMeta(k);
  return x === null ? 'not yet' : `${m.label} ${x.toFixed(m.digits)}`;
}

// ---- a pme-scenario/2 card (plan F6) ----

/** What a /2 board is read from: the card, the current phase, the log (the judged rows' ticks) and, on the host, the
 *  phase runner's takings, its holds and the live grades (a follower has none: its action rows stay "ready", "graded on
 *  the host", its A rows empty). */
export interface SourceV2 {
  doc: ScenarioDocV2;
  phaseId: string;
  log: readonly ClinicalLogEntry[];
  takings: Readonly<Record<string, number>> | null;
  holds: readonly PhaseHold[] | null;
  paused: boolean;
  /** grade() on the phase runner's inputs now, final: false (`liveGrades`); null on a follower (Q16). */
  grades: Grades | null;
  /** The host's administration record (when an action's own press was given) and the current phase's entry time; a
   *  follower has neither (null): it folds nothing. */
  admin?: readonly Administration[] | null;
  enteredT?: number;
}

/** The grade inputs a /2 host's phase runner keeps (PhaseRunner `phases`, `admin`, `edges`). */
export interface GradeInputs {
  readonly phases: readonly PhaseEntry[];
  readonly admin: readonly Administration[];
  readonly edges: readonly RuleEdge[];
}
let lastGrades: { doc: ScenarioDocV2; second: number; n: string; grades: Grades } | null = null;
/** The live grades of a /2 run (design §8.3: the panel calls grade() every second, final: false): recomputed when the
 *  sim second, the timeline, the record or the edges change, else the last answer. */
export function liveGrades(doc: ScenarioDocV2, run: GradeInputs, t: number): Grades {
  const second = Math.floor(t);
  const n = `${run.phases.length}|${run.admin.length}|${run.edges.length}`;
  const c = lastGrades;
  if (c && c.doc === doc && c.second === second && c.n === n) return c.grades;
  const grades = grade(doc, run.phases, run.admin, run.edges, second);
  lastGrades = { doc, second, n, grades };
  return grades;
}

const mmssS = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** "overdue 1:48" → 108 (the ring's seconds past the window). */
const overdueS = (live: string): number => {
  const m = /^overdue (\d+):(\d\d)$/.exec(live);
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};

/** The board of a /2 phase: its open actions, each with its live grade at the right and the grade's lines under the
 *  prescription (design §10: "due 3:12", "overdue 0:40", "met 08:16", "deviation: route", "not applicable"; an action
 *  the card does not grade keeps "press to give" / "given ×n"); a taken one stays pressable, green; the judged rows (met
 *  ones move to Finished as on /1), and the rules out of the phase with the 60-s hold's bar.
 *  `later` (F11: the MH card's Latent opens 11 actions and ACTION scrolled at 1440 × 900): the rows not due now — a
 *  graded action not applicable and not given (its anchor or precondition has not happened: design §10 puts "not
 *  applicable" out of the open list), and an action the card does not grade, given in an earlier phase (the induction's
 *  setup carried into Latent). They stay rows of ACTION, numbered and pressable, in a fold; a due, overdue or given graded
 *  action and the judged rows are never folded. */
export function classifyV2(src: SourceV2): Board {
  const list: LiveRow[] = [];
  const later: LiveRow[] = [];
  const finished: LiveRow[] = [];
  /** When the action's own press was last given (the record's actionId stamp), else null. */
  const pressedAt = (id: string): number | null => src.admin?.filter((a) => a.actionId === id && !a.cardSet).at(-1)?.t ?? null;
  const base = (row: Row): LiveRow => ({ row, stage: src.phaseId, look: 'ready', subtitle: row.subtitle, right: '', overdue: null, outOfOrder: false, at: null, progress: null });
  for (const row of phaseRowsOf(src.doc, src.phaseId)) {
    const live = base(row);
    if (row.kind === 'step') {
      const n = (row.actionId !== undefined ? src.takings?.[row.actionId] : 0) ?? 0;
      const g = src.grades?.actions.find((a) => a.id === row.actionId);
      if (g) {
        // the grade's look: due, or overdue and still not given (the first dose or a repeat), the expected blue (overdue
        // with the ring); given, green — by the record grade() graded (another action's press may give it: the call's
        // ventilator and infusion) or the row's own press (deviation: the met look, its label amber; given late: the
        // ring); not applicable, faded. Still pressable whatever the look.
        const worstGiven = g.grade === g.firstGrade ? g.givenT !== undefined : g.repeats.find((r) => r.grade === g.grade)?.t !== undefined;
        const open = (g.grade === 'due' || g.grade === 'overdue') && !worstGiven;
        const given = n > 0 || g.givenT !== undefined;
        const look: Look = open ? 'current' : given ? 'taken' : g.grade === 'not applicable' ? 'unmet' : g.grade === 'failed' ? 'failed' : 'ready';
        (g.grade === 'not applicable' && !given ? later : list).push({ ...live, look, grade: g.grade, right: g.live, subtitle: [row.subtitle, ...g.lines].join(' · '), overdue: g.grade === 'overdue' ? overdueS(g.live) : null, at: g.givenT ?? null });
      } else if (n > 0) {
        const t = row.actionId !== undefined ? pressedAt(row.actionId) : null;
        const earlier = t !== null && src.enteredT !== undefined && t < src.enteredT - 1e-6;
        (earlier ? later : list).push({ ...live, look: 'taken', right: `given${n > 1 ? ` ×${n}` : ''}`, at: t });
      } else list.push({ ...live, right: src.takings ? 'press to give' : 'graded on the host' });
    } else if (row.kind === 'judged') {
      const met = src.log.find((x) => x.kind === 'marker' && x.text === `Objective met: ${drugWords(row.text)}`);
      if (met) finished.push({ ...live, look: 'met', at: met.simT, right: met.simT === null ? '' : mmss(met.simT), subtitle: 'you judged it' });
      else list.push({ ...live, right: 'press when met', subtitle: 'you judge it · for the debrief only, the patient does not change' });
    } else {
      const hold = src.holds?.find((x) => x.transitionId === row.tr.id && x.leaf === 'hold') ?? null;
      const progress = hold ? hold.fraction : 0;
      const right = src.paused ? 'frozen' : hold ? (hold.met ? `held ${mmssS(hold.heldS)} of ${mmssS(hold.forS)}` : 'not met') : '';
      list.push({ ...live, look: 'pending', progress, right });
    }
  }
  return { stage: stagesOf(src.doc).find((g) => g.id === src.phaseId) ?? null, list, finished, offCard: [], later };
}
