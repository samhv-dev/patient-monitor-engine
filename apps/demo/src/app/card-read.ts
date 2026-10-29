// Reading a scenario card for Instructor v2 (E127, docs/plans/instructor-panel-redesign.md §3.2, §3.4, §7): the stages of
// the strip (hop states folded in), the rows of the ACTION list for a state (steps, automatic rows, judged objectives),
// the command a step sends, the objectives that ride on a step, and reachability on the card graph. One module for the
// panel and the debrief, so both read the card the same way. Pure: no DOM, no session; it reads `pme-scenario/1` as the
// cards already carry it.
import { manualLabel, type CommandInput, type ScenarioDoc, type ScenarioState, type Transition, type When } from '@pme/controller';
import type { ObjectiveRule, RunEventId } from '@pme/controller/scenario';
import { drugWords } from './glossary.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { objectiveText } from './scenarios.ts';
import { whenText } from './triggers.ts';

/** A hop lasts at most this long: a state whose only exit is `afterS` ≤ HOP_S (the 2-second treatment states). */
export const HOP_S = 2;

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

/** Whether `s` is a hop: its only exit is `afterS` ≤ HOP_S (answer 2). */
export function isHop(s: ScenarioState): boolean {
  const t = s.transitions ?? [];
  return t.length === 1 && 'afterS' in (t[0] as Transition).when && ((t[0] as Transition).when as { afterS: number }).afterS <= HOP_S;
}

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
