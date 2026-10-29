// Reading a scenario card for Instructor v2 (E127, docs/plans/instructor-panel-redesign.md §3.2, §3.4, §7): the stages of
// the strip (hop states folded in), the rows of the ACTION list for a state (steps, automatic rows, judged objectives),
// the command a step sends, the objectives that ride on a step, and reachability on the card graph. One module for the
// panel and the debrief, so both read the card the same way. Pure: no DOM, no session; it reads `pme-scenario/1` as the
// cards already carry it.
import { manualLabel, type CommandInput, type ScenarioDoc, type ScenarioState, type Transition, type When } from '@pme/controller';
import { HOP_MAX_S, isHop, type ObjectiveRule, type RunEventId } from '@pme/controller/scenario';
import { drugWords } from './glossary.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { objectiveText } from './scenarios.ts';
import { whenText } from './triggers.ts';

/** A hop lasts at most this long: the controller's rule (one hop rule for the driver's stage marks and this module). */
export const HOP_S = HOP_MAX_S;

/** A stage of the strip: a state that is not a hop, with the hops that lead back into it. */
export interface Stage {
  id: string;
  label: string;
  /** The stage's own state first, then the hops folded into it, in document order. */
  states: readonly string[];
  /** A rule can enter it without a press (from another stage): the strip's "auto". */
  byRule: boolean;
}

export type Row =
  /** A manual transition of the state (or a mixed `any`/`all` with a manual inside), numbered in the card's order. */
  | { kind: 'step'; n: number; index: number; tr: Transition; label: string; title: string; subtitle: string }
  /** A transition no press makes: `vital`, `afterS`, `event` and every other rule-only trigger. Not pressable. */
  | { kind: 'auto'; index: number; tr: Transition; trigger: 'vital' | 'afterS' | 'event' | 'other'; title: string; subtitle: string }
  /** An objective with no rule: the instructor judges it; `objective` is its index in the card's objectives list. */
  | { kind: 'judged'; n: number; objective: number; text: string; title: string; subtitle: string };

/** An objective linked to a step (answer 6), with the `value:` events its `after` waits for (null: no such condition). */
export interface LinkedObjective {
  index: number;
  text: string;
  rule: ObjectiveRule;
  condition: readonly RunEventId[] | null;
}

const stateOf = (doc: ScenarioDoc, id: string): ScenarioState | undefined => doc.states.find((s) => s.id === id);
const nameOf = (doc: ScenarioDoc, id: string): string => stateOf(doc, id)?.label ?? 'next state';

/** Whether `s` is a hop: its only exit is `afterS` ≤ HOP_S (answer 2); the controller's `isHop` (IP9 review L3). */
export { isHop };

/** Whether `w` can hold without a press: false for a manual, and for an `all` with a manual inside. */
function byItself(w: When): boolean {
  if ('manual' in w) return false;
  if ('all' in w) return w.all.every(byItself);
  if ('any' in w) return w.any.some(byItself);
  return true;
}

/** The stage a hop folds into: the state its exit leads to, followed through further hops (a loop ends where it began). */
function foldOf(doc: ScenarioDoc, s: ScenarioState): string {
  let cur = s;
  const seen = new Set<string>();
  while (isHop(cur) && !seen.has(cur.id)) {
    seen.add(cur.id);
    const next = stateOf(doc, (cur.transitions?.[0] as Transition).to);
    if (!next) break;
    cur = next;
  }
  return cur.id;
}

/** The stages of the card: its states that are not hops, in document order, each with its hops (answer 2). */
export function stagesOf(doc: ScenarioDoc): Stage[] {
  const home = new Map(doc.states.map((s) => [s.id, foldOf(doc, s)]));
  return doc.states.filter((s) => !isHop(s)).map((s) => {
    const states = [s.id, ...doc.states.filter((x) => x.id !== s.id && home.get(x.id) === s.id).map((x) => x.id)];
    const byRule = doc.states.some((x) => home.get(x.id) !== s.id && (x.transitions ?? []).some((t) => home.get(t.to) === s.id && byItself(t.when)));
    return { id: s.id, label: s.label ?? 'State', states, byRule };
  });
}

/** The stage `stateId` belongs to (a hop: the stage it folds into), or null. */
export function stageOf(doc: ScenarioDoc, stateId: string): Stage | null {
  return stagesOf(doc).find((g) => g.states.includes(stateId)) ?? null;
}

/** The card's objectives as the Scenario tab lists them (the document's own, else scenario-meta.ts's). */
const objectivesOfCard = (doc: ScenarioDoc) => doc.objectives ?? SCENARIO_META[doc.id]?.objectives ?? [];

/** The sheet an `event` trigger is given from (design §3.6 tools), for the automatic row's subtitle. */
const SHEET: Record<string, string> = { defib: 'Defib', cpr: 'Defib', drug: 'Drug', fluid: 'Drug', airway: 'Airway', ventilation: 'Airway' };

/** "when a shock is given (from the Defib sheet)" (answer 5). */
function eventLine(w: Extract<When, { event: unknown }>): string {
  const t = whenText(w);
  const said = t.includes(' given') ? t.replace(' given', ' is given') : t.startsWith('a shock') ? `${t} is given` : t;
  const sheet = SHEET[w.event.kind];
  return `when ${said}${sheet ? ` (from the ${sheet} sheet)` : ''}`;
}

/** The rule part of a mixed step in words: the children that are not a press. */
function ruleOfMixed(w: When): string | null {
  if (!('any' in w) && !('all' in w)) return null;
  const rest = ('any' in w ? w.any : w.all).filter((c) => manualLabel(c) === null);
  if (!rest.length) return null;
  const words = rest.map(whenText).join('any' in w ? ' or ' : ' and ');
  // answer 4: "or by itself when <rule>"; an `all` needs the press AND the rule (no card has one today)
  return 'any' in w ? `or by itself when ${words}` : `only when ${words}`;
}

/**
 * The ACTION list of `stateId`: its steps (manual and mixed transitions) numbered in the card's array order, then the
 * card's judged objectives numbered on from the steps, then its automatic rows, in array order. Every step stays a row
 * whatever its condition (design §2 anti-goals); classifying a row live is the panel's (IP6).
 */
export function rowsOf(doc: ScenarioDoc, stateId: string): Row[] {
  const trs = stateOf(doc, stateId)?.transitions ?? [];
  const steps: Row[] = [];
  const autos: Row[] = [];
  trs.forEach((tr, index) => {
    const label = manualLabel(tr.when);
    if (label !== null) {
      const mixed = ruleOfMixed(tr.when);
      steps.push({ kind: 'step', n: steps.length + 1, index, tr, label, title: label, subtitle: `→ ${nameOf(doc, tr.to)}${mixed ? ` · ${mixed}` : ''}` });
      return;
    }
    const w = tr.when;
    const trigger = 'vital' in w ? 'vital' : 'afterS' in w ? 'afterS' : 'event' in w ? 'event' : 'other';
    const subtitle = 'event' in w ? eventLine(w) : 'afterS' in w || 'atScenarioS' in w ? whenText(w) : `when ${whenText(w)}`;
    autos.push({ kind: 'auto', index, tr, trigger, title: nameOf(doc, tr.to), subtitle });
  });
  const judged: Row[] = [];
  objectivesOfCard(doc).forEach((o, objective) => {
    if (typeof o !== 'string' && o.rule) return;
    const text = objectiveText(o);
    judged.push({ kind: 'judged', n: steps.length + judged.length + 1, objective, text, title: drugWords(text), subtitle: 'you judge it' });
  });
  return [...steps, ...judged, ...autos];
}

/** The command a press of `label` sends in `state`, resolved as today's Scenario tab resolves it (panel/scenario.ts
 *  `press`): the label against the CURRENT state, the first transition whose manual label it is; null: not available. */
export function stepCommand(state: ScenarioState | null | undefined, label: string): CommandInput | null {
  const tr = state?.transitions?.find((x) => manualLabel(x.when) === label);
  return tr ? { type: 'scenario', action: 'trigger', target: tr.id } : null;
}

/** The drug ids `state`'s onEnter gives (a bolus, an infusion or a TCI: any applyEvent with a drug id). */
const drugsOnEnter = (state: ScenarioState | undefined): string[] =>
  (state?.onEnter ?? []).flatMap((c) => (c.type === 'applyEvent' && typeof (c.event as { drugId?: unknown }).drugId === 'string' ? [(c.event as { drugId: string }).drugId] : []));

/**
 * The objectives that ride on step `tr` (answer 6): an objective whose `event` (or one of its events) is `state:<to>`
 * of the step, or `drug:<id>` for a drug in `<to>`'s onEnter. In the card's order; empty: the step is "ready".
 */
export function objectivesOf(doc: ScenarioDoc, tr: Transition): LinkedObjective[] {
  const want = new Set([`state:${tr.to}`, ...drugsOnEnter(stateOf(doc, tr.to)).map((d) => `drug:${d}`)]);
  const out: LinkedObjective[] = [];
  objectivesOfCard(doc).forEach((o, index) => {
    if (typeof o === 'string' || !o.rule || !('event' in o.rule)) return;
    if (![o.rule.event].flat().some((e) => want.has(e))) return;
    const after = 'after' in o.rule && o.rule.after !== undefined ? [o.rule.after].flat() : [];
    const condition = after.length && after.every((e) => e.startsWith('value:')) ? after : null;
    out.push({ index, text: o.text, rule: o.rule, condition });
  });
  return out;
}

/** "Condition not met" (answer 6): a linked objective's `value:` condition that no event of has come true yet
 *  (`isTrue` answers from the run's record). False with no linked condition: the step is "ready". */
export function conditionNotMet(linked: readonly LinkedObjective[], isTrue: (event: RunEventId) => boolean): boolean {
  return linked.some((o) => o.condition !== null && !o.condition.some(isTrue));
}

/** Whether `to` can still be reached from `from` on the card graph (`to` and `else` of every transition; a state reaches
 *  itself), for "failed" (answer 7). */
export function reachable(doc: ScenarioDoc, from: string, to: string): boolean {
  const seen = new Set([from]);
  const todo = [from];
  while (todo.length) {
    const id = todo.pop() as string;
    if (id === to) return true;
    for (const t of stateOf(doc, id)?.transitions ?? [])
      for (const next of [t.to, t.else])
        if (next !== undefined && !seen.has(next)) {
          seen.add(next);
          todo.push(next);
        }
  }
  return false;
}

// ---- a step's standing: the one reading for the ACTION list (teach2/rows.ts) and the Debrief's steps (debrief.ts) ----

/** What a step's standing is read from: when the run's events happened, and whether a rule is already met. The
 *  Debrief reads both from its record; the panel from the host's live record, or a follower's history (states only). */
export interface Evidence {
  /** The first time `want` (or any of a list) happened at or after `from`; null: not (yet), or not seen here. */
  first(want: RunEventId | readonly RunEventId[], from?: number): number | null;
  /** Whether `rule` is met on the run so far (false where this reader cannot judge it: a follower has no record). */
  met(rule: ObjectiveRule): boolean;
}

/** The rule kinds that ask for their `event` (answer 7 as the coordinator refined it); `never` and `stayed` ask for none. */
const ASKING = new Set<ObjectiveRule['kind']>(['eventWithin', 'occurred', 'heldThen']);
/** Seconds within which two run times are the same instant. */
const SAME_T = 1e-6;

/** Where a step stands (answers 6 and 7 as refined): `asked`, an objective linked to it asks for it; `dueS`, the
 *  seconds left of the earliest window of an asking `eventWithin` (negative: overdue by that much; null: no window). */
export interface Standing {
  asked: boolean;
  dueS: number | null;
}

/**
 * Whether an objective asks for untaken step `tr` of a stage current from `dueT` until it was left at `leftT` (null:
 * still current), at run time `now`. An objective linked to the step (answer 6: its event is `state:<to>`, or
 * `drug:<id>` for a drug in `<to>`'s onEnter) asks for it when:
 *  - its rule asks for an event (`eventWithin`, `occurred`, `heldThen`) and is not met;
 *  - its anchor (the first `from`, then for `eventWithin` the first `after`) happened before the stage was left;
 *  - and the linked event did not happen anyway from the step's due time and the anchor on (another button, or the
 *    card's own rule, gave it).
 * An alternative branch not chosen is therefore never asked for. `dueS` is the earliest asking `eventWithin`'s window:
 * from its anchor, `withinS` long (overdue once `now - anchor ≥ withinS`, as the Debrief's verdict reads it).
 */
export function standingOf(doc: ScenarioDoc, tr: Transition, at: { dueT: number; leftT: number | null; now: number }, ev: Evidence): Standing {
  const links = new Set([`state:${tr.to}`, ...drugsOnEnter(stateOf(doc, tr.to)).map((d) => `drug:${d}`)]);
  const out: Standing = { asked: false, dueS: null };
  for (const o of objectivesOf(doc, tr)) {
    const rule = o.rule;
    if (!ASKING.has(rule.kind) || !('event' in rule) || ev.met(rule)) continue;
    const linked = [rule.event].flat().filter((e) => links.has(e));
    const fromEv = 'from' in rule ? rule.from : undefined;
    const from = fromEv ? ev.first(fromEv) : null;
    if (fromEv && from === null) continue; // it never began to ask
    const anchor = rule.kind === 'eventWithin' ? ev.first(rule.after, from ?? -Infinity) : from;
    // an anchor at the instant the stage was left is the next stage's, not this one's
    if ((rule.kind === 'eventWithin' && anchor === null) || (anchor !== null && at.leftT !== null && anchor >= at.leftT - SAME_T)) continue;
    if (ev.first(linked, Math.max(at.dueT, anchor ?? -Infinity)) !== null) continue; // given another way
    out.asked = true;
    if (rule.kind === 'eventWithin' && anchor !== null) {
      const left = anchor + rule.withinS - at.now;
      out.dueS = out.dueS === null ? left : Math.min(out.dueS, left);
    }
  }
  return out;
}

/** An untaken step's status (answer 7 as refined): null, not listed (no objective asks for it: an alternative not
 *  chosen); `failed`, its stage is not the current state and the card can no longer reach the state it leads to;
 *  `overdue`, an asking window has passed; else `not done`. `current` is the current state (a hop counts as its own). */
export function untakenStatus(doc: ScenarioDoc, tr: Transition, at: { stateId: string; current: string; dueT: number; leftT: number | null; now: number }, ev: Evidence): { status: 'failed' | 'overdue' | 'not done'; dueS: number | null } | null {
  const s = standingOf(doc, tr, at, ev);
  if (!s.asked) return null;
  if (at.stateId !== at.current && !reachable(doc, at.current, tr.to)) return { status: 'failed', dueS: s.dueS };
  return { status: s.dueS !== null && s.dueS <= 0 ? 'overdue' : 'not done', dueS: s.dueS };
}

/** A scenario history as ScenarioView keeps it: `{ t, stateId, transitionId? }`, oldest first. */
export type History = ReadonlyArray<{ t: number; stateId: string; transitionId?: string }>;

/**
 * The history with the card's start in front. A load publishes its first state before its own commandApplied, and
 * ScenarioView's history restarts on that commandApplied, so the history begins at the first transition and the
 * initial state's entry is missing (record.ts keeps it the same way: `held`). This puts it back at `startT` (the run
 * record's entry of the initial state on the host), so the strip gives the first stage its time and ACTION's Finished
 * its taken step. Unchanged when the history is empty or already begins at the start.
 */
export function withStart(doc: ScenarioDoc, history: History, startT: number): History {
  const h0 = history[0];
  if (!h0 || (h0.stateId === doc.initialState && h0.transitionId === undefined) || h0.t < startT) return history;
  return [{ t: startT, stateId: doc.initialState }, ...history];
}
