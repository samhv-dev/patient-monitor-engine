// Instructor v2, the ACTION rows classified live (design §3.4, §3.5; answers 4–8, 20). Pure: no DOM. It reads the card
// through card-read.ts (`rowsOf`, `objectivesOf`, `conditionNotMet`, `reachable`), the scenario's own history (which
// transition fired, when) and, on the host, the debrief's run record (when an objective's events happened). A follower
// has no record: its rows know what the history says (states entered) and nothing more, so they never read overdue or
// "condition not met" from events they cannot see.
//
// The rows of the list are the CURRENT stage's (its own state's rows; a hop shows the stage it folds into). Every step
// of the stage stays in the list whatever its look, so nothing the card offers is hidden: a step taken that the card
// still offers (the treatment fan-out loops back into its stage) stays a pressable green row. Rows the case has left
// move to "Finished": the taken, failed and fired rows of the stages passed, and the judged objectives met.
// Nothing here ever disables a row: the look is all a status changes.
import type { ScenarioDoc, Transition } from '@pme/controller';
import type { RunEventId } from '@pme/controller/scenario';
import { conditionNotMet, objectivesOf, reachable, rowsOf, stagesOf, type Row, type Stage } from '../card-read.ts';
import { eventWords, isEvent, trendMeta } from '../debrief.ts';
import { drugWords } from '../glossary.ts';
import type { ClinicalLogEntry } from '../link.ts';
import type { RunData, ValueKey } from '../record.ts';
import { clock } from '../ui.ts';
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
}

export interface Board {
  stage: Stage | null;
  /** The current stage's rows in IP3's order (steps, judged objectives numbered on, automatic rows). */
  list: LiveRow[];
  /** Every taken, failed, fired or met row the case has left, in time order. */
  finished: LiveRow[];
  /** The off-card actions taken in this stage, from the log (answer 20). */
  offCard: ClinicalLogEntry[];
}

/** One `vital` rule as the host-side runner reads it (IP1's `ScenarioDriver.vitalHolds()`, PR pending). */
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
  /** The runner's hold progress, host only, once IP1's accessor lands; null without it. */
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
/** How near an A row is (answer 8): its value against the threshold, from where the stage began, times the runner's
 *  hold fraction on the host. */
function autoBar(src: Source, visit: Visit, tr: Transition): { progress: number | null; right: string } {
  const w = tr.when;
  if ('afterS' in w) return { progress: Math.min(1, src.inState / Math.max(w.afterS, 1e-6)), right: src.paused ? 'frozen' : `in ${clock(Math.max(0, w.afterS - src.inState))}` };
  if ('atScenarioS' in w) return { progress: Math.min(1, src.simT / Math.max(w.atScenarioS, 1e-6)), right: src.paused ? 'frozen' : `in ${clock(Math.max(0, w.atScenarioS - src.simT))}` };
  if (!('vital' in w)) return { progress: 0, right: '' };
  const { var: name, op, value: thr } = w.vital;
  const v = src.values?.[name];
  if (v === undefined || !Number.isFinite(v)) return { progress: 0, right: `→ ${show(name, thr)}` };
  const key = `${visit.t0}|${tr.id}`;
  if (!src.base.has(key)) src.base.set(key, v);
  const v0 = src.base.get(key) as number;
  const met = (OP_MET[op] ?? (() => false))(v, thr);
  const valueFrac = met ? 1 : thr === v0 ? 0 : Math.max(0, Math.min(1, (v - v0) / (thr - v0)));
  // TODO(IP1, PR pending): `src.holds` comes from IP1's `ScenarioDriver.vitalHolds()` once it merges; until then it is
  // null and the bar is the value against the threshold only, as a follower's always is. While the value is short of
  // the threshold the hold has not begun (the accessor's fraction is 0), so the hold factor counts only once it is met.
  const hold = src.holds?.find((x) => x.transitionId === tr.id && x.key === tr.id) ?? null;
  const holdFrac = hold && hold.met ? hold.fraction : 1;
  return { progress: valueFrac * holdFrac, right: src.paused ? 'frozen' : `${show(name, v)} → ${show(name, thr)}` };
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
  const isTrue = (e: RunEventId) => firstT(src, e) !== null;
  const lives: LiveRow[] = [];
  const finished: LiveRow[] = [];
  const base = (row: Row): LiveRow => ({ row, stage: visit.stage, look: 'ready', subtitle: row.subtitle, right: '', overdue: null, outOfOrder: false, at: null, progress: null });

  let expected = false;
  for (const row of rows) {
    const live = base(row);
    if (row.kind === 'judged') {
      const said = `Objective met: ${drugWords(row.text)}`;
      const met = src.log.find((x) => x.kind === 'marker' && x.text === said);
      if (met) finished.push({ ...live, look: 'met', at: met.simT, right: clock(met.simT), subtitle: 'you judged it' });
      else lives.push({ ...live, right: 'press when met', subtitle: 'you judge it · for the debrief only, the patient does not change' });
      continue;
    }
    if (row.kind === 'auto') {
      const t = firedAt(visit, row.tr.id);
      if (t !== null) finished.push({ ...live, look: 'fired', at: t, right: clock(t), subtitle: `${row.subtitle} · fired, the case moved by itself` });
      else lives.push({ ...live, look: 'pending', ...autoBar(src, visit, row.tr) });
      continue;
    }
    const taken = firedAt(visit, row.tr.id);
    if (taken !== null) {
      const ooo = outOfOrder(visit, rows, row, taken);
      lives.push({ ...live, look: 'taken', at: taken, outOfOrder: ooo, right: clock(taken), subtitle: `${row.subtitle} · taken${ooo ? ', out of order' : ''}` });
      continue;
    }
    if (src.stateId !== visit.stage && !reachable(doc, src.stateId, row.tr.to)) {
      finished.push({ ...live, look: 'failed', at: src.simT, right: `failed ${clock(src.simT)}` });
      continue;
    }
    const linked = objectivesOf(doc, row.tr);
    const unmet = conditionNotMet(linked, isTrue);
    // the linked objective's eventWithin window (answer 7): from its `after`, unless its `event` has come since
    let due: number | null = null;
    for (const o of linked) {
      if (o.rule.kind !== 'eventWithin') continue;
      const a = firstT(src, o.rule.after);
      if (a === null || firstT(src, o.rule.event, a) !== null) continue;
      const left = a + o.rule.withinS - src.simT;
      due = due === null ? left : Math.min(due, left);
    }
    const parts = [row.subtitle];
    if (unmet) {
      const cond = linked.find((o) => o.condition !== null)?.condition ?? [];
      parts.push(`the card expects it after ${eventWords([...cond], d)}`, 'pressable now');
    }
    if (due !== null && due >= 0) parts.push(`due in ${clock(due)}`);
    const overdue = due !== null && due < 0 ? -due : null;
    if (overdue !== null) parts.push('still pressable');
    const look: Look = unmet ? 'unmet' : expected ? 'ready' : 'current';
    if (look === 'current') expected = true;
    const right = overdue !== null ? `overdue ${clock(overdue)}` : due !== null ? `due in ${clock(due)}` : unmet ? conditionNow(src, linked.find((o) => o.condition)?.condition ?? []) : 'ready';
    lives.push({ ...live, look, overdue, subtitle: parts.join(' · '), right });
  }

  // the stages passed: their taken, failed and fired rows
  const failedSeen = new Set<string>();
  for (const v of visits.slice(0, -1).reverse()) {
    const vr = rowsOf(doc, v.stage);
    const name = stages.find((g) => g.id === v.stage)?.label ?? 'Stage';
    for (const row of vr) {
      if (row.kind === 'judged') continue;
      const t = firedAt(v, row.tr.id);
      const live: LiveRow = { ...base(row), stage: v.stage };
      if (row.kind === 'auto') {
        if (t !== null) finished.push({ ...live, look: 'fired', at: t, right: clock(t), subtitle: `${name} · fired, the case moved by itself` });
      } else if (t !== null) {
        const ooo = outOfOrder(v, vr, row, t);
        finished.push({ ...live, look: 'taken', at: t, outOfOrder: ooo, right: clock(t), subtitle: `${name} · taken${ooo ? ', out of order' : ''}` });
      } else if (!failedSeen.has(row.tr.id) && !reachable(doc, src.stateId, row.tr.to)) {
        failedSeen.add(row.tr.id);
        const at = v.end ?? src.simT;
        finished.push({ ...live, look: 'failed', at, right: `failed ${clock(at)}`, subtitle: `${name} · its stage has passed` });
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
