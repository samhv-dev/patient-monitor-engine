// Run in place (docs/plans/scenario-builder.md §6, mock-up 04-run-in-place; piece B6): the two pure parts of the run
// panel, DOM-free so B7's twin run and a headless harness can read them too.
//
// `whatFired`: the "What fired, and why" log, read from the runner's own records and nothing else: each phase entry
// with the leaves of the rule that fired as the runner read them on that tick (`PhaseEntry.why`, filled by the runner
// itself, so a fast-forward that crosses phases between two page polls loses none), each action that opened, came due,
// was given and graded (grade(), the controller's pure function, on the runner's phases, record and edges), and each
// script entry with the time it fired (`firedT`). Nothing is recomputed here: values are formatted, never derived.
//
// `markCompatible`: whether "Apply from this phase's mark" may restore the mark of the current phase with the edited
// card. The mark holds the engine's snapshot and the runner's state of the card that ran, so the edit must leave both
// meaningful: the same card id, the same patient (body, sensors, seed, mode, device: the snapshot is that patient's
// physiology), every phase and action the run has named, and every rule's leaves in the same places (the runner's holds
// are kept by leaf position). A threshold changed in place keeps the place: its accumulated hold is reset, so the hold
// starts again under the edited threshold rather than carrying time held under the old one.
import { namedRules, walkLeaves, type Grades, type LeafRead, type PhaseRunnerState, type ScenarioDocV2 } from '@pme/controller/scenario';

/** One line of the log; `t` the sim time it happened at. */
export interface RunLine {
  t: number;
  kind: 'phase' | 'action' | 'script';
  /** 'entered' (a phase entry), 'open', 'due' (its window passed, not given), 'met', 'missed' (any other grade). */
  tone: 'entered' | 'open' | 'due' | 'met' | 'missed' | 'script';
  head: string;
  /** The leaves of the rule that fired, one line each (a phase entry), or the commands (a script entry). */
  detail: string[];
}

const mmss = (s: number): string => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const num = (v: number): string => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1).replace(/\.0$/, '') : v.toFixed(2).replace(/\.?0+$/, ''));
const signed = (v: number): string => `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v))}`;
const OP: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '=': '=', '!=': '≠' };
const mark = (ok: boolean) => (ok ? '✓' : '✗');

/** A leaf as the runner read it, in words: the value it read, its threshold, the hold or window, and whether it held. */
export function leafWords(l: LeafRead, label: (phaseId: string) => string = (x) => x): string {
  const op = OP[l.op ?? ''] ?? l.op ?? '';
  const read = l.value === undefined ? 'no value yet' : null;
  // under a `not` the rule needs the leaf false: the mark is the negation's
  const ok = l.not ? !l.met : l.met;
  const not = l.not ? 'not: ' : '';
  switch (l.leaf) {
    case 'value': {
      const held = l.forS !== undefined ? `, held ${num(l.heldS ?? 0)} of ${num(l.forS)} s` : '';
      return `${not}${l.variable} ${read ?? num(l.value as number)} ${op} ${num(l.threshold ?? 0)}${held} ${mark(ok)}`;
    }
    case 'slope':
      return `${not}${l.variable} slope ${read ?? `${signed(l.value as number)} /min`} ${op} ${num(l.threshold ?? 0)} /min over ${num(l.forS ?? 0)} s ${mark(ok)}`;
    case 'unchanged':
      return `${not}${l.variable} within ${num(l.threshold ?? 0)} %${l.forS !== undefined ? ` over ${num(l.forS)} s` : ' of the phase’s start'} (moved ${read ?? `${num(l.value as number)} %`}) ${mark(ok)}`;
    case 'hold':
      return `held ${num(l.value ?? 0)} of ${num(l.threshold ?? 0)} s without a break${l.latched ? ' (kept running by the team’s change, D1)' : ''} ${mark(ok)}`;
    case 'visited':
    case 'phaseEntered':
      return `${not}${label(l.variable)} entered before ${mark(ok)}`;
    case 'signal':
      return `${not}${l.variable === 'pulseLoss' ? 'pulse lost' : l.variable === 'rosc' ? 'pulse back after a loss' : `rhythm ${l.variable.replace(/^rhythm:/, '')}`} ${mark(ok)}`;
  }
}

/** The runner state's parts the log reads. */
export type LogState = Pick<PhaseRunnerState, 'phases' | 'fired' | 'firedT'>;

/** The log, newest first. `now`: the sim time the grades were taken at (an action's window that ends later has not come
 *  due yet). */
export function whatFired(doc: ScenarioDocV2, st: LogState, grades: Grades, now: number): RunLine[] {
  const label = (id: string) => doc.phases.find((p) => p.id === id)?.label ?? id;
  const out: RunLine[] = [];
  for (const p of st.phases) {
    if (p.rule === 'initial') out.push({ t: p.t, kind: 'phase', tone: 'entered', head: `${label(p.id)}: the card starts here`, detail: [] });
    else out.push({ t: p.t, kind: 'phase', tone: 'entered', head: `${label(p.id)} entered by its rule`, detail: (p.why ?? []).map((l) => leafWords(l, label)) });
  }
  for (const a of grades.actions) {
    if (a.dueT === undefined || a.dueT > now) continue;
    out.push({ t: a.dueT, kind: 'action', tone: 'open', head: `Opened: ${a.label}`, detail: a.windowS !== undefined ? [`due by ${mmss(a.dueT + a.windowS)}`] : [] });
    if (a.givenT !== undefined) out.push({ t: a.givenT, kind: 'action', tone: a.grade === 'met' ? 'met' : 'missed', head: `${a.label}: ${a.grade}`, detail: a.lines });
    else if (a.windowS !== undefined && a.dueT + a.windowS <= now) out.push({ t: a.dueT + a.windowS, kind: 'action', tone: 'due', head: `Came due, not given: ${a.label}`, detail: a.lines });
  }
  for (const id of st.fired) {
    const e = doc.script?.find((x) => x.id === id);
    const t = st.firedT?.[id];
    if (!e || t === undefined) continue; // a state written before B6 kept no time: its entry is not placed on the log
    const on = typeof e.on === 'object' ? `at ${mmss(e.on.atScenarioS)} on the scenario clock` : e.on.startsWith('phase:') ? `on entering ${label(e.on.slice(6))}` : `with ${e.on.slice(7).replace('#', ', taking ')}`;
    out.push({ t, kind: 'script', tone: 'script', head: `Script (card-set) ${e.id}, ${on}`, detail: e.commands.map((c) => commandWords(c as unknown as Record<string, unknown>)) });
  }
  // newest first; at the same second a phase entry above what it opened
  const order = { phase: 0, script: 1, action: 2 } as const;
  return out.sort((x, y) => y.t - x.t || order[x.kind] - order[y.kind]);
}

/** A script command in short words: its type and its own scalar fields. */
function commandWords(c: Record<string, unknown>): string {
  const rest = Object.entries(c).filter(([k, v]) => k !== 'type' && k !== '$comment' && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'));
  return `${String(c.type)}${rest.length ? ` ${rest.map(([k, v]) => `${k} ${String(v)}`).join(', ')}` : ''}`;
}

/** Whether the edited card may take over the run from a mark of the running one, and the holds to start again. */
export type MarkFit = { ok: true; reset: { trueFor: string[]; holdFor: string[] } } | { ok: false; why: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/** Each named rule's leaves by key: its kind and the variable it reads (the place), and the whole leaf (its numbers). */
function leaves(doc: ScenarioDocV2): Map<string, Map<string, { place: string; whole: string }>> {
  const out = new Map<string, Map<string, { place: string; whole: string }>>();
  for (const nr of namedRules(doc)) {
    const m = new Map<string, { place: string; whole: string }>();
    walkLeaves(nr.rule, nr.name, (leaf, key) => {
      const kind = Object.keys(leaf)[0] as string;
      const body = (leaf as Record<string, unknown>)[kind];
      const v = body && typeof body === 'object' ? (body as { var?: unknown }).var : body;
      m.set(key, { place: `${kind}:${String(v)}`, whole: JSON.stringify(leaf) });
    });
    out.set(nr.name, m);
  }
  return out;
}

export function markCompatible(running: ScenarioDocV2, edited: ScenarioDocV2): MarkFit {
  const no = (why: string): MarkFit => ({ ok: false, why });
  if (edited.id !== running.id) return no(`the card’s id changed (${running.id} → ${edited.id})`);
  for (const k of ['patient', 'seed', 'mode', 'device'] as const) {
    if (!same(running[k], edited[k])) return no(`the ${k === 'patient' ? 'patient (body, baseline or sensors)' : k} changed: the mark holds the patient as it ran`);
  }
  for (const p of running.phases) if (!edited.phases.some((q) => q.id === p.id)) return no(`the phase “${p.id}” was renamed or removed`);
  for (const a of running.actions) if (!edited.actions.some((b) => b.id === a.id)) return no(`the action “${a.id}” was renamed or removed: the run’s record names it`);
  const before = leaves(running);
  const after = leaves(edited);
  const reset = { trueFor: [] as string[], holdFor: [] as string[] };
  for (const [name, was] of before) {
    const now = after.get(name);
    if (!now) continue; // a rule the edit removed (an anchor, an outcome): nothing reads its holds again
    const places = (m: typeof was) => [...m].map(([k, x]) => `${k}=${x.place}`).join('|');
    if (places(was) !== places(now)) return no(`the rule “${name}” has leaves added, removed or moved: the run’s holds are kept by a leaf’s place`);
    for (const [key, x] of was) if (now.get(key)?.whole !== x.whole) reset.trueFor.push(key);
  }
  for (const p of running.phases) {
    const q = edited.phases.find((x) => x.id === p.id);
    if (q && (!same(p.enter, q.enter) || (p.holdS ?? 0) !== (q.holdS ?? 0))) reset.holdFor.push(p.id);
  }
  return { ok: true, reset };
}

/** The runner state of a mark, made the edited card's: the reset holds start again (their leaf or hold changed). */
export function refit(st: PhaseRunnerState, reset: { trueFor: string[]; holdFor: string[] }): PhaseRunnerState {
  const out = structuredClone(st);
  for (const k of reset.trueFor) delete out.trueFor[k];
  for (const id of reset.holdFor) {
    if (out.holdFor) delete out.holdFor[id];
    if (out.latched) delete out.latched[id];
  }
  return out;
}
