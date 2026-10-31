// Instructor v2, the ACTION rows classified live (design §3.4, §3.5; answers 4–8, 20). Pure: no DOM. It reads the card
// through card-read.ts (`rowsOf`, `objectivesOf`, `conditionNotMet`, `reachable`), the scenario's own history (which
// transition fired, when) and, on the host, the debrief's run record (when an objective's events happened). A follower
// has no record: its rows know what the history says (states entered) and nothing more, so they never read overdue or
// "condition not met" from events they cannot see.
//
// Which untaken step an objective asks for, its window and "failed" are card-read.ts `standingOf` / `untakenStatus`, the
// one reading the Debrief's steps table (debrief.ts `steps`) also uses, so the two agree by construction.
//
// The rows of the list are the CURRENT stage's (its own state's rows; a hop shows the stage it folds into). A /1 card's
// spoke (a hop: a state whose only exit is a short `afterS` back to its hub, card-read.ts `isHop`) is an action of its
// hub stage, not a stage: the treatment fan-out's press keeps the hub's visit, its entry time and its other rows' looks.
// A row is open until it is finished; a finished row moves to "Finished" at once, in every stage (the clinical owner's
// report of 30 October): a step taken (green), a rule that fired (amber), a step failed (red), a judged objective met.
// The mark names the transition taken: a step with no rule of its own is a press whenever it fired (card-read.ts
// `byItself`), never "fired by its own rule", whatever the record's attribution; a spoke's return is not a row.
// The look is all a status changes, with one exception: a step the runner would refuse now (a press guarded by a vital in
// its `all`, the MH card's Cool below 38.5 °C core: runner.ts `trigger`) is "waiting" (its subtitle already names the rule, card-read.ts),
// shows the value against it and offers no press until the rule holds.
import type { ScenarioDoc, Transition, When } from '@pme/controller';
import type { RunEventId } from '@pme/controller/scenario';
import { byItself, conditionNotMet, objectivesOf, rowsOf, stagesOf, standingOf, untakenStatus, type Evidence, type Row, type Stage } from '../card-read.ts';
import { eventWords, isEvent, mmss, trendMeta, verdict } from '../debrief.ts';
import { drugWords } from '../glossary.ts';
import type { ClinicalLogEntry } from '../link.ts';
import type { RunData, ValueKey } from '../record.ts';
import { showVital, vitalOf } from '../vitals.ts';
import type { StateVar } from '@pme/engine-core';

/** The five looks of the design's row-state table (§3.5), with the A rows' two and the judged objective's "met". */
export type Look = 'current' | 'ready' | 'unmet' | 'waiting' | 'taken' | 'met' | 'failed' | 'pending' | 'fired';

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
}

export interface Board {
  stage: Stage | null;
  /** The current stage's open rows in IP3's order (steps, judged objectives numbered on, automatic rows). */
  list: LiveRow[];
  /** Every taken, failed, fired or met row, of the stages passed and of the current one, in time order. */
  finished: LiveRow[];
  /** The off-card actions taken in this stage, from the log (answer 20). */
  offCard: ClinicalLogEntry[];
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
/** Whether step `tr`, fired at `t`, was fired by its own rule, not by a press: only a step with a rule of its own can
 *  be (card-read.ts `byItself`: a mixed `any`, answer 4's "or by itself"), and then the host's record says which (IP8's
 *  `by`; a follower has no record and cannot tell, so its mixed steps read taken). A step that is a press only is taken
 *  whatever the record's `by` reads (the owner's report of 30 October: the Cool press read "fired by its own rule"). */
const byItsRule = (src: Source, tr: Transition, t: number): boolean =>
  byItself(tr.when) && !!src.record?.rows.some((r) => r.kind === 'scenario' && r.undone === undefined && r.tr === tr.id && r.by === 'rule' && Math.abs(r.t - t) <= 0.05);
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
/** The vital in a press's `all` that does not hold now, as the runner refuses the press for it (runner.ts `trigger`),
 *  else null. A value not yet seen (no state event) never holds a press back. */
function guardUnmet(w: When, values: Source['values']): Extract<When, { vital: unknown }> | null {
  if (!('all' in w)) return null;
  return (w.all.find((c) => {
    if (!('vital' in c)) return false;
    const v = values?.[c.vital.var];
    return v !== undefined && Number.isFinite(v) && !(OP_MET[c.vital.op] ?? (() => false))(v, c.vital.value);
  }) ?? null) as Extract<When, { vital: unknown }> | null;
}
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
  const here = stage?.label ?? 'Stage';
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
    // a step fired in this visit (a spoke's press, the hub still current): finished, into the fold at once
    const taken = firedAt(visit, row.tr.id);
    if (taken !== null && byItsRule(src, row.tr, taken)) {
      // a mixed step its own rule fired (answer 4's "or by itself"): the case moved by itself, as an A row's would
      finished.push({ ...live, look: 'fired', at: taken, right: mmss(taken), subtitle: `${here} · fired by its own rule` });
      continue;
    }
    if (taken !== null) {
      const ooo = outOfOrder(visit, rows, row, taken);
      finished.push({ ...live, look: 'taken', at: taken, outOfOrder: ooo, right: mmss(taken), subtitle: `${here} · taken${ooo ? ', out of order' : ''}` });
      continue;
    }
    // in a hop of the stage: failed only under the shared rule (an asking objective, its target out of reach)
    if (untakenStatus(doc, row.tr, { stateId: visit.stage, current: src.stateId, dueT: visit.t0, leftT: null, now: src.simT }, ev)?.status === 'failed') {
      finished.push({ ...live, look: 'failed', at: src.simT, right: `failed ${mmss(src.simT)}` });
      continue;
    }
    const guard = guardUnmet(row.tr.when, src.values);
    if (guard) {
      lives.push({ ...live, look: 'waiting', subtitle: `${row.subtitle} · not offered yet`, right: `${show(guard.vital.var, src.values?.[guard.vital.var] as number)} → ${show(guard.vital.var, guard.vital.value)}` });
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
      } else if (t !== null && byItsRule(src, row.tr, t)) {
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
