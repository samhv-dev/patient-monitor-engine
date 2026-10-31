// What the debrief states from a run record — each objective met / not met / not assessable from its rule (types.ts
// `ObjectiveRule`), with the reason and the simulated times in one line, and the facts the engine can measure. Both
// read the KEPT course (a return to a bookmark undoes what came after it: the retry is what is judged). Labels come
// from the glossary and the alarm table. Also the one-row-per-minute table, the card's steps with their status, the
// instructor's judged objectives and the marks (Instructor v2, IP8), and the export's shape (written by
// `debrief-export.ts`). A pme-scenario/2 run (plan F7) has no objectives and no steps: its report is the grade()
// of the controller on the inputs the record copied (the panel's function), as actions, outcomes, violations and judged
// rows (`pme-debrief/3`). No DOM.
import { asV1, isV2, manualLabel, type MarkKind } from '@pme/controller';
import { grade, ruleWords, type Anchor, type Grade, type Grades, type ObjectiveRule, type PhaseEntry, type PhaseRule, type RunEventId, type ScenarioDocV2 } from '@pme/controller/scenario';
import { FIXED_ALARM_WORDS } from './alarms.ts';
import { untakenStatus, type Evidence } from './card-read.ts';
import { CONDITIONS } from './describe.ts';
import { drugName, drugWords, labelOf, lookup, unitOf } from './glossary.ts';
import { LAB_KEYS, LABS, TREND, TREND_KEYS, type LabKey, type Row, type RunData, type Sample, type TrendKey, type ValueKey } from './record.ts';
import { objectiveText } from './scenarios.ts';

export type Status = 'met' | 'not met' | 'not assessable';
export interface Verdict {
  status: Status;
  why: string;
  /** An `eventWithin` verdict that found both events: the times its reason line prints, and the seconds asked. */
  measure?: { fromT: number; toT: number; askedS: number };
}
/** An objective's verdict in the report: `tickedT`, the instructor's tick (seconds), only on a rule-less objective. */
export type ObjectiveVerdict = Verdict & { tickedT?: number };

/** mm:ss of simulated time (the session bar's clock). */
export const mmss = (t: number): string => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
/** A span: "40 s", "2 min 05 s". Rounded to whole seconds before the split, so 119.7 s is "2 min 00 s", never "1 min 60 s" (FX-13). */
export const span = (s: number): string => {
  const t = Math.round(s);
  return t < 60 ? `${t} s` : `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, '0')} s`;
};

const kept = (d: RunData): Row[] => d.rows.filter((r) => r.undone === undefined);
/** An event id matches itself and its own longer ids up to a hyphen ('alarm:apnoea' ⊃ 'alarm:apnoea-co2'). */
export const isEvent = (id: string | undefined, want: RunEventId): boolean => !!id && (id === want || id.startsWith(`${want}-`));
const VALUE = /^value:(hr|map|spo2|etco2|rr|temp|k|lactate|ph|glucose|tcore)([<>])(\d+(?:\.\d+)?)$/;
/** The first kept row of `want` (or of any of a list) at or after `from`, or null. 'start' is the run's first second; a
 *  'value:' event is the first sample past its limit. */
function first(d: RunData, want: RunEventId | RunEventId[], from = -Infinity): Row | null {
  if (Array.isArray(want)) return want.map((w) => first(d, w, from)).filter((r): r is Row => r !== null).sort((a, b) => a.t - b.t)[0] ?? null;
  if (want === 'start') return { t: 0, kind: 'scenario', text: 'the start' };
  const v = VALUE.exec(want);
  if (v) {
    const k = v[1] as ValueKey;
    const lim = Number(v[3]);
    const s = d.samples.find((x) => x.t >= from && x[k] !== null && (v[2] === '<' ? (x[k] as number) < lim : (x[k] as number) > lim));
    return s ? { t: s.t, kind: 'patient', text: '' } : null;
  }
  return kept(d).find((r) => r.t >= from && isEvent(r.ev, want)) ?? null;
}
/** Whether `want` could be seen from `from` on: a row event always; a value event only when its trend or lab was
 *  measured then (a value never measured is "not assessable", never "did not happen"). A list: any of them. */
function measured(d: RunData, want: RunEventId | RunEventId[], from = -Infinity): boolean {
  if (Array.isArray(want)) return want.some((w) => measured(d, w, from));
  const v = VALUE.exec(want);
  return !v || d.samples.some((s) => s.t >= from && s[v[1] as ValueKey] !== null);
}
/** "SpO₂ was not measured …" for the value events of `want`. */
const unmeasured = (want: RunEventId | RunEventId[], tail: string): string =>
  `${[want].flat().map((w) => VALUE.exec(w)?.[1]).filter((k): k is ValueKey => !!k).map((k) => trendMeta(k).label).join(' or ')} was not measured ${tail}.`;
/** The run's last simulated second on the kept course. */
export const endOf = (d: RunData): number => Math.max(0, ...kept(d).map((r) => r.t), ...d.samples.map((s) => s.t));

/** An event in words, for a reason line ("the alarm Apnoea (no CO₂ breaths)", "epinephrine", "SpO₂ below 90 %"). */
export function eventWords(want: RunEventId | RunEventId[], d: RunData): string {
  if (Array.isArray(want)) return want.map((w) => eventWords(w, d)).join(' or ');
  const v = VALUE.exec(want);
  if (v) return `${trendMeta(v[1] as ValueKey).label} ${v[2] === '<' ? 'below' : 'above'} ${fmt(v[1] as ValueKey, Number(v[3]))}`;
  const [k = '', id = ''] = want.split(':');
  if (k === 'state') return `the state "${asV1(d.doc)?.states.find((s) => s.id === id)?.label ?? 'named in the rule'}"`;
  if (k === 'alarm') {
    const w = FIXED_ALARM_WORDS[id] ?? Object.entries(FIXED_ALARM_WORDS).find(([a]) => a.startsWith(`${id}-`))?.[1];
    return `the alarm ${w ?? 'named in the rule'}`;
  }
  if (k === 'drug') return drugName(id);
  if (k === 'condition') return CONDITIONS[id] ?? 'the condition';
  if (k === 'airway') return 'the airway change';
  const words: Record<string, string> = { start: 'the start', fluid: 'fluid', cpr: 'CPR', shock: 'a shock', ventilation: 'ventilated breaths', pulseLoss: 'the pulse loss', rosc: 'the return of circulation' };
  return words[k] ?? 'the event';
}

const DIGITS: Partial<Record<ValueKey, number>> = { temp: 1, k: 1, lactate: 1, ph: 2, glucose: 1, tcore: 1 };
const isLab = (k: ValueKey): k is LabKey => k in LABS;
/** A trend's or a lab's label and unit from the glossary ("ART M / NIBP M", "mmHg"; "K⁺", "mmol/L"). */
export function trendMeta(k: ValueKey): { label: string; unit: string; digits: number } {
  const keys = isLab(k) ? [LABS[k]] : TREND[k].map((id) => `mon.${id}`);
  const l = lookup(keys[0] as string);
  return { label: keys.map((key) => labelOf(key) ?? '').filter(Boolean).join(' / '), unit: l ? unitOf(l.e) : '', digits: DIGITS[k] ?? 0 };
}
/** The least span of a trend chart's axis, so a few-point wobble is not drawn at
 *  full height; RR has no floor (± 1 when flat, as before). */
const AXIS_FLOOR: Partial<Record<TrendKey, number>> = { spo2: 20, hr: 40, map: 40, etco2: 20, temp: 2 };
/** The axis of one trend chart: the data's own range, or the floor centred on the data (SpO₂ never above 100, and never
 *  below zero when the data are not). */
export function axisRange(k: TrendKey, lo: number, hi: number): [number, number] {
  const floor = AXIS_FLOOR[k];
  if (floor === undefined) return hi - lo < 2 ? [lo - 1, hi + 1] : [lo, hi];
  if (hi - lo >= floor) return [lo, hi];
  let a = (lo + hi) / 2 - floor / 2;
  if (k === 'spo2' && a + floor > 100) a = 100 - floor;
  if (a < 0 && lo >= 0) a = 0;
  return [a, a + floor];
}
const fmt = (k: ValueKey, v: number): string => {
  const m = trendMeta(k);
  return `${v.toFixed(m.digits)} ${m.unit}`.trim();
};

/** The verdict of one rule on a run (no rule: not assessable). */
export function verdict(rule: ObjectiveRule | undefined, d: RunData): Verdict {
  const no = (why: string): Verdict => ({ status: 'not assessable', why });
  if (!rule) return no('This objective has no rule: the instructor judges it.');
  const end = endOf(d);
  // `from` — the rule's events count only at or after the first `from` ("after the crisis was called")
  const fromEv = rule.kind === 'stayed' ? undefined : rule.from;
  const start = fromEv ? first(d, fromEv) : null;
  if (fromEv && !start) return no(`${cap(eventWords(fromEv, d))} did not happen.`);
  const since = fromEv ? ` after ${eventWords(fromEv, d)}` : '';
  const t0 = start?.t ?? -Infinity;
  const tail = start ? `${since.trim()} at ${mmss(t0)}` : 'during the run';
  if (rule.kind === 'occurred' || rule.kind === 'never') {
    const r = first(d, rule.event, t0);
    if (!r && !measured(d, rule.event, t0)) return no(unmeasured(rule.event, tail));
    const w = `${eventWords(rule.event, d)}${since}`;
    const happened = r ? `${w} at ${mmss(r.t)}` : `${w}: did not happen`;
    return { status: (r !== null) === (rule.kind === 'occurred') ? 'met' : 'not met', why: happened.charAt(0).toUpperCase() + happened.slice(1) };
  }
  if (rule.kind === 'eventWithin') {
    const a = first(d, rule.after, t0);
    if (!a) return no(measured(d, rule.after, t0) ? `${cap(eventWords(rule.after, d))}${since} did not happen.` : unmeasured(rule.after, tail));
    const b = first(d, rule.event, a.t);
    const aw = `${eventWords(rule.after, d)}${since}`;
    const bw = eventWords(rule.event, d);
    if (!b && !measured(d, rule.event, a.t)) return no(unmeasured(rule.event, `after ${aw} at ${mmss(a.t)}`));
    if (b) return { status: b.t - a.t <= rule.withinS ? 'met' : 'not met', why: `${cap(bw)} ${span(b.t - a.t)} after ${aw} (${mmss(a.t)} → ${mmss(b.t)}; within ${span(rule.withinS)} asked).`, measure: { fromT: a.t, toT: b.t, askedS: rule.withinS } };
    if (end - a.t >= rule.withinS) return { status: 'not met', why: `No ${bw} within ${span(rule.withinS)} of ${aw} at ${mmss(a.t)}.` };
    return no(`The run ended ${span(end - a.t)} after ${aw} at ${mmss(a.t)}, before ${span(rule.withinS)} had passed.`);
  }
  const m = trendMeta(rule.value);
  const limit = [rule.above !== undefined ? `above ${fmt(rule.value, rule.above)}` : '', rule.below !== undefined ? `below ${fmt(rule.value, rule.below)}` : ''].filter(Boolean).join(' and ');
  if (rule.kind === 'heldThen') {
    // E22: the first `event` from `from` on, judged against the first moment the value had stayed past the limit for forS
    const inside = (v: number | null) => v !== null && (rule.above === undefined || v > rule.above) && (rule.below === undefined || v < rule.below);
    const e = first(d, rule.event, t0);
    let run: number | null = null; // the start of the current unbroken stretch inside the limit
    let held: [number, number] | null = null; // the first stretch of forS: [start, end]
    let atE: number | null | undefined; // the stretch's start at the event (null: outside the limit then)
    for (const s of d.samples) {
      if (s.t < t0) continue;
      if (e && atE === undefined && s.t > e.t) atE = run;
      run = inside(s[rule.value]) ? (run ?? s.t) : null;
      if (!held && run !== null && s.t - run >= rule.forS) held = [run, s.t];
    }
    if (e && atE === undefined) atE = run;
    const ew = eventWords(rule.event, d);
    const hw = `${m.label} had stayed ${limit} for ${span(rule.forS)}`;
    if (e && (!held || e.t < held[1])) {
      const when = atE != null ? `had been ${limit} for ${span(e.t - atE)}` : `was not ${limit}`;
      return { status: 'not met', why: `${cap(ew)} at ${mmss(e.t)}, when ${m.label} ${when} (${span(rule.forS)} asked).` };
    }
    if (e && held) return { status: 'met', why: `${cap(ew)} at ${mmss(e.t)}, after ${hw} (${mmss(held[0])} → ${mmss(held[1])}).` };
    if (held) return { status: 'not met', why: `${cap(ew)} did not happen; ${hw} by ${mmss(held[1])}.` };
    if (!d.samples.some((s) => s.t >= t0 && s[rule.value] !== null)) return no(`${m.label} was not measured ${tail}.`);
    return no(`The run ended before ${hw}${since}${start ? ` at ${mmss(t0)}` : ''}; ${ew} had not happened.`);
  }
  // stayed
  const from = rule.after ? first(d, rule.after) : { t: 0 };
  if (!from) return no(`${cap(eventWords(rule.after ?? 'start', d))} did not happen.`);
  const to = rule.forS ? from.t + rule.forS : end;
  const xs = d.samples.filter((s): s is Sample => s.t >= from.t && s.t <= to && s[rule.value] !== null);
  if (!xs.length) return no(`${m.label} was not measured${rule.after ? ` after ${eventWords(rule.after, d)}` : ''}.`);
  const bad = xs.find((s) => {
    const v = s[rule.value] as number;
    return (rule.above !== undefined && !(v > rule.above)) || (rule.below !== undefined && !(v < rule.below));
  });
  if (bad) return { status: 'not met', why: `${m.label} ${fmt(rule.value, bad[rule.value] as number)} at ${mmss(bad.t)} (asked: ${limit}).` };
  if (rule.forS && end < to) return no(`The run ended before the ${span(rule.forS)} window closed; ${m.label} stayed ${limit} until then.`);
  const lo = xs.reduce((b, s) => ((rule.above !== undefined ? (s[rule.value] as number) < (b[rule.value] as number) : (s[rule.value] as number) > (b[rule.value] as number)) ? s : b));
  return { status: 'met', why: `${m.label} stayed ${limit} (${rule.above !== undefined ? 'lowest' : 'highest'} ${fmt(rule.value, lo[rule.value] as number)} at ${mmss(lo.t)}).` };
}
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Every objective of the run's scenario with its verdict, in the document's order; a not-assessable one ticked in
 *  the Scenario tab says so (the tick is the instructor's judgement, not a rule's). A rule-less objective's tick is
 *  also kept as `tickedT`; a `debrief: 'discuss'` objective carries `discuss: true` (its status is unchanged). */
export function objectives(d: RunData): Array<{ text: string; discuss?: true; verdict: ObjectiveVerdict }> {
  return (asV1(d.doc)?.objectives ?? []).map((o) => {
    const text = drugWords(objectiveText(o));
    const ruleLess = typeof o === 'string' || !o.rule;
    const v = verdict(typeof o === 'string' ? undefined : o.rule, d);
    const tick = v.status === 'not assessable' ? kept(d).find((r) => r.kind === 'note' && r.text === `Objective met: ${text}`) : undefined;
    const verdictOut: ObjectiveVerdict = tick ? { ...v, why: `${v.why} The instructor ticked it at ${mmss(tick.t)}.`, ...(ruleLess ? { tickedT: tick.t } : {}) } : v;
    return { text, ...(typeof o !== 'string' && o.debrief === 'discuss' ? { discuss: true as const } : {}), verdict: verdictOut };
  });
}

/** A step's status at the end of the record (answer 7 as the coordinator revised it for IP8): `taken` = its
 *  transition fired by a press; `out of order` = taken after a step later in the card's order of the same stage was
 *  taken. An untaken step is listed only when an objective asks for it (`steps`), and then reads `failed` (its stage
 *  has passed and the card can no longer reach the state it leads to), else `overdue` (the window of a linked
 *  `eventWithin` objective has passed), else `not done` (never taken by the end, still reachable). */
export type StepStatus = 'taken' | 'out of order' | 'failed' | 'overdue' | 'not done';
export interface Step {
  /** The transition and its stage (the state it leaves). */
  id: string;
  stateId: string;
  /** The order it was due: its place among the stage's steps in the card's order (the panel's key, from 1). */
  n: number;
  /** Its button's words. */
  label: string;
  /** When it was first due: the stage's first entry on the kept course. */
  dueT: number;
  /** Its first press that fired it, and that press's place among the stage's taken steps (from 1). */
  takenT: number | null;
  order: number | null;
  /** A mixed step (`any` with a manual) its own rule fired, with no press. */
  ruleT?: number;
  status: StepStatus;
}

/** The kept state rows: one per state entered, with how (record.ts `tr`, `by`). */
const stateRows = (d: RunData): Row[] => kept(d).filter((r) => r.kind === 'scenario' && r.ev?.startsWith('state:'));

/**
 * The card's steps (manual transitions, and `any`/`all` with a manual inside: answer 4) of the stages entered on the
 * kept course, in the card's order, each with the time it was due, the time and order it was taken, and its status
 * (`StepStatus`). Listed: every step taken, and every untaken step an objective asks for. An alternative branch not
 * chosen is not a failure, so an untaken step no objective asks for is left out (the coordinator's rule for IP8).
 * Whether an objective asks for an untaken step, and its status then, is card-read.ts `untakenStatus`: the one
 * reading the ACTION list (teach2/rows.ts) shares, so the list and this table agree by construction.
 * Empty without a scenario, and for a record made before the record kept how each state was entered (nothing to
 * tell a press from a rule by).
 */
export function steps(d: RunData): Step[] {
  const doc = asV1(d.doc); // a pme-scenario/2 card has no steps here (F7)
  const rows = stateRows(d);
  if (!doc || (rows.length > 1 && !rows.some((r) => r.tr !== undefined || r.by !== undefined))) return [];
  const cur = rows.at(-1)?.ev?.slice('state:'.length) ?? doc.initialState;
  // the one reading of an untaken step that the ACTION list shares (card-read.ts `untakenStatus`), on this record
  const ev: Evidence = { first: (w, from) => first(d, [w].flat(), from)?.t ?? null, met: (rule) => verdict(rule, d).status === 'met' };
  const now = endOf(d);
  return doc.states.flatMap((s) => {
    const entered = rows.find((r) => r.ev === `state:${s.id}`);
    if (!entered) return [];
    // when the stage was last left: the state row after its last entry (none: it is current)
    const lastIn = rows.map((r) => r.ev).lastIndexOf(`state:${s.id}`);
    const leftT = rows[lastIn + 1]?.t ?? null;
    const own = (s.transitions ?? []).flatMap((tr, i) => {
      const label = manualLabel(tr.when);
      if (label === null) return [];
      const fired = rows.filter((r) => r.tr === tr.id || r.tr === `${tr.id}:else`);
      const ruleT = fired.find((r) => r.by === 'rule')?.t;
      return [{ tr, i, label, takenT: fired.find((r) => r.by === 'press')?.t ?? null, ...(ruleT !== undefined ? { ruleT } : {}) }];
    });
    const taken = own.filter((x) => x.takenT !== null).sort((a, b) => (a.takenT as number) - (b.takenT as number) || a.i - b.i);
    return own.flatMap((x, k): Step[] => {
      const { tr, i, label, takenT } = x;
      const order = takenT === null ? null : taken.indexOf(x) + 1;
      let status: StepStatus;
      if (takenT !== null) status = taken.some((y) => y.i > i && (y.takenT as number) < takenT) ? 'out of order' : 'taken';
      else {
        const u = untakenStatus(doc, tr, { stateId: s.id, current: cur, dueT: entered.t, leftT, now }, ev);
        if (!u) return []; // an alternative not chosen, or a step no objective asks for
        status = u.status;
      }
      return [{ id: tr.id, stateId: s.id, n: k + 1, label, dueT: entered.t, takenT, order, ...(x.ruleT !== undefined ? { ruleT: x.ruleT } : {}), status }];
    });
  });
}

/** The objectives the instructor judges (no rule: answer 6's "judged objective"), in the card's order: `n` is the
 *  objective's place in the card's list (from 1), `tickedT` the instructor's tick ("Objective met: …"), else null. */
export function judged(d: RunData): Array<{ n: number; text: string; tickedT: number | null }> {
  return (asV1(d.doc)?.objectives ?? []).flatMap((o, i) => {
    if (typeof o !== 'string' && o.rule) return [];
    const text = drugWords(objectiveText(o));
    return [{ n: i + 1, text, tickedT: kept(d).find((r) => r.kind === 'note' && r.text === `Objective met: ${text}`)?.t ?? null }];
  });
}

/** A /2 run's grades: grade() on the copied inputs, final, at the run's end — the panel's function on the panel's
 *  inputs. Null for a /1 run, and for a /2 record made before the record copied them. */
export function gradesOf(d: RunData): Grades | null {
  if (!d.doc || !isV2(d.doc) || d.format !== 2) return null;
  return grade(d.doc, d.phases ?? [], d.admin ?? [], d.edges ?? [], endOf(d), { final: true });
}

/** A /2 run's sections of the report and of `pme-debrief/3` (absent times are null). */
export interface Report3 {
  actions: Array<{
    /** `grade`: the worst of the first administration and its repeats (F3); `firstGrade`: the first administration's own,
     *  which the action's row prints (each repeat prints its own on its row). */
    id: string; label: string; kind: string; grade: Grade; firstGrade: Grade; lines: string[]; dueT: number | null; givenT: number | null; windowS: number | null;
    repeats: Array<{ n: number; grade: Grade; t: number | null; lines: string[] }>;
    /** The seqs of every administration matching the action. */
    admin: number[];
  }>;
  outcomes: Array<{ id: string; text: string; status: 'reached' | 'not reached'; t: number | null; why: string }>;
  violations: Array<{ t: number; seq: number; text: string; harm: 'modelled' | 'not modelled' }>;
  /** The instructor's rows: `fromT` the display clock's start (the monitor showed it), `pressedT` the instructor's press. */
  judged: Array<{ id: string; text: string; kind: 'recognition' | 'communication'; fromT: number | null; pressedT: number | null }>;
}

/** The report of a /2 run (null: a /1 run, or no copied inputs). */
export function report3(d: RunData): Report3 | null {
  const g = gradesOf(d);
  if (!g) return null;
  const doc = d.doc as ScenarioDocV2;
  const firstEdge = (rule: string) => (d.edges ?? []).find((e) => e.rule === rule && e.value)?.t;
  const label = (id: string) => doc.actions.find((a) => a.id === id)?.label ?? id;
  const words = (an: Anchor): string =>
    typeof an !== 'string' ? ruleWords(an.rule) : an.startsWith('phase:') ? `the phase "${doc.phases.find((p) => p.id === an.slice(6))?.label ?? an.slice(6)}"`
    : an.startsWith('action:') ? label(an.slice(7)) : ({ start: 'the start', pulseLoss: 'the pulse loss', rosc: 'the return of circulation' } as Record<string, string>)[an] ?? an;
  // when the outcome's anchor happened (grade()'s reading: the first entry, the action's graded dose, the first true edge)
  const anchorAt = (id: string, an: Anchor): number | undefined =>
    an === 'start' ? 0 : typeof an !== 'string' ? firstEdge(`outcome:${id}:anchor`) : an.startsWith('phase:') ? (d.phases ?? []).find((p: PhaseEntry) => p.id === an.slice(6))?.t
    : an.startsWith('action:') ? g.actions.find((a) => a.id === an.slice(7))?.givenT : firstEdge(an);
  const ticks = kept(d).filter((r) => r.kind === 'note');
  return {
    actions: g.actions.map((a) => ({
      id: a.id, label: a.label, kind: doc.actions.find((x) => x.id === a.id)?.kind ?? '', grade: a.grade, firstGrade: a.firstGrade, lines: a.lines,
      dueT: a.dueT ?? null, givenT: a.givenT ?? null, windowS: a.windowS ?? null,
      repeats: a.repeats.map((r) => ({ n: r.n, grade: r.grade, t: r.t ?? null, lines: r.lines })), admin: a.admin,
    })),
    outcomes: g.outcomes.map((o) => {
      const oc = doc.outcomes?.find((x) => x.id === o.id);
      const w = oc ? words(oc.anchor) : 'its anchor';
      const at = oc ? anchorAt(o.id, oc.anchor) : undefined;
      const within = span(oc?.withinS ?? 0);
      const why = o.grade === 'reached' && o.t !== undefined
        ? `Reached at ${mmss(o.t)}${at !== undefined ? `, ${span(o.t - at)} after ${w}` : ''} (within ${within} asked).`
        : at === undefined ? `Not reached: ${w} ${oc && typeof oc.anchor === 'string' && oc.anchor.startsWith('action:') ? 'was never given' : 'did not happen'}.`
        : `Not reached within ${within} of ${w} (from ${mmss(at)}).`;
      return { id: o.id, text: o.text, status: o.grade === 'reached' ? 'reached' as const : 'not reached' as const, t: o.t ?? null, why };
    }),
    violations: g.violations.map((v) => ({ t: v.t, seq: v.seq, text: v.text, harm: v.harm })),
    judged: g.judged.map((j) => ({
      id: j.id, text: j.text, kind: j.kind, fromT: j.fromT ?? null,
      pressedT: ticks.find((r) => r.text === `Objective met: ${drugWords(j.text)}`)?.t ?? null, // teach2/press.ts judge()
    })),
  };
}
/** A judged row's display rule in words ("etco2 > 45"): what its clock starts on. */
export const displayWords = (d: RunData, id: string): string | null => {
  const r = d.doc && isV2(d.doc) ? d.doc.judged?.find((j) => j.id === id)?.display : undefined;
  return r ? ruleWords(r as PhaseRule) : null;
};

/** Every mark (bookmark) of the run in order, with its kind and note when it has them; an undone one says so. */
export function marks(d: RunData): Array<{ t: number; label: string; kind?: Exclude<MarkKind, 'stage'>; note?: string; undone?: number }> {
  return d.rows.filter((r) => r.kind === 'bookmark').map((r) => ({
    t: r.t, label: r.mark ?? r.text, ...(r.markKind ? { kind: r.markKind } : {}), ...(r.note ? { note: r.note } : {}), ...(r.undone ? { undone: r.undone } : {}),
  }));
}

export interface Fact {
  label: string;
  value: string;
}

/** Bolus totals per drug (mass doses in mg; a per-kg dose × the patient's weight; other units summed as given). */
export function drugTotals(d: RunData): Array<{ drugId: string; n: number; total: string }> {
  const by = new Map<string, { n: number; mg: number; other: Map<string, number> }>();
  for (const r of kept(d)) {
    if (!r.dose) continue;
    const x = by.get(r.dose.drugId) ?? { n: 0, mg: 0, other: new Map<string, number>() };
    const mg = { mg: 1, mcg: 1e-3, 'mg/kg': d.weightKg, 'mcg/kg': d.weightKg * 1e-3 }[r.dose.unit];
    if (mg !== undefined) x.mg += r.dose.dose * mg;
    else x.other.set(r.dose.unit, (x.other.get(r.dose.unit) ?? 0) + r.dose.dose);
    x.n++;
    by.set(r.dose.drugId, x);
  }
  const round = (v: number) => String(+v.toPrecision(3));
  return [...by].map(([drugId, x]) => ({
    drugId, n: x.n,
    total: [x.mg > 0 ? (x.mg < 1 ? `${round(x.mg * 1000)} µg` : `${round(x.mg)} mg`) : '', ...[...x.other].map(([u, v]) => `${round(v)} ${u}`)].filter(Boolean).join(' + '),
  }));
}

function extreme(d: RunData, k: ValueKey, dir: 'min' | 'max'): Sample | null {
  let best: Sample | null = null;
  for (const s of d.samples) {
    const v = s[k];
    if (v !== null && (best === null || (dir === 'min' ? v < (best[k] as number) : v > (best[k] as number)))) best = s;
  }
  return best;
}

/** The measured facts of the kept course, in a fixed order; a fact that does not apply to this run is left out. */
export function facts(d: RunData): Fact[] {
  const out: Fact[] = [];
  const ext = (k: ValueKey, dir: 'min' | 'max', word: string) => {
    const s = extreme(d, k, dir);
    if (s) out.push({ label: `${word} ${trendMeta(k).label}`, value: `${fmt(k, s[k] as number)} at ${mmss(s.t)}` });
  };
  ext('spo2', 'min', 'Lowest');
  ext('map', 'min', 'Lowest');
  ext('etco2', 'max', 'Highest');
  ext('temp', 'max', 'Highest');
  const a = first(d, 'alarm:apnoea');
  if (a) {
    const v = first(d, 'ventilation', a.t);
    out.push({ label: `${FIXED_ALARM_WORDS.APNEA} alarm to ventilated breaths`, value: v ? `${span(v.t - a.t)} (${mmss(a.t)} → ${mmss(v.t)})` : `none after the alarm at ${mmss(a.t)}` });
  }
  const p = first(d, 'pulseLoss');
  if (p) {
    let off = 0;
    let lost: number | null = null;
    for (const r of kept(d)) {
      if (r.ev === 'pulseLoss' && lost === null) lost = r.t;
      if (r.ev === 'rosc' && lost !== null) (off += r.t - lost), (lost = null);
    }
    if (lost !== null) off += endOf(d) - lost;
    out.push({ label: 'Pulseless', value: `${span(off)} in all; first lost at ${mmss(p.t)}` });
    const r = first(d, 'rosc', p.t);
    out.push({ label: 'Return of circulation', value: r ? `${span(r.t - p.t)} after the pulse loss (${mmss(r.t)})` : 'not during the run' });
  }
  const epi = drugTotals(d).find((x) => x.drugId === 'epinephrine');
  if (epi) out.push({ label: `${drugName('epinephrine')}, boluses in all`, value: `${epi.total} (${epi.n} ${epi.n === 1 ? 'dose' : 'doses'})` });
  // Q7: the model's labs, last value (lowest–highest) — the model's values at 1 Hz, not samples the instructor drew
  const labs = LAB_KEYS.flatMap((k) => {
    const last = d.samples.filter((s) => s[k] !== null).at(-1);
    const lo = extreme(d, k, 'min');
    const hi = extreme(d, k, 'max');
    if (!last || !lo || !hi) return [];
    const m = trendMeta(k);
    const f = (v: number) => v.toFixed(m.digits);
    return [`${m.label} ${f(last[k] as number)}${m.unit ? ` ${m.unit}` : ''} (${f(lo[k] as number)}–${f(hi[k] as number)})`];
  });
  if (labs.length) out.push({ label: 'Labs (the model): last (lowest–highest)', value: labs.join(' · ') });
  return out;
}

/** Q1: one row per simulated minute of the kept course — each value's first measurement in that minute (none: null). */
export function perMinute(d: RunData): Array<{ t: number; values: Record<ValueKey, number | null> }> {
  const out: Array<{ t: number; values: Record<ValueKey, number | null> }> = [];
  const keys = [...TREND_KEYS, ...LAB_KEYS];
  for (let m = 0; m * 60 <= endOf(d); m++) {
    const xs = d.samples.filter((x) => x.t >= m * 60 && x.t < (m + 1) * 60);
    out.push({ t: m * 60, values: Object.fromEntries(keys.map((k) => [k, xs.find((x) => x[k] !== null)?.[k] ?? null])) as Record<ValueKey, number | null> });
  }
  return out;
}

/** The report as exported (`pme-debrief/2`). Over `/1` it adds the renderer's `version`, `discuss` and the verdicts'
 *  `tickedT` and `measure`, and the key times and key moments of the course (`debrief-moments.ts`). Instructor v2
 *  (IP8) adds `steps`, `judged` and `marks` at the end, and the record's rows their `tr`, `by`, `markKind`, `note` and
 *  `batch`: all additive, so the schema stays `/2` (answer 17). */
export interface DebriefExport {
  schema: 'pme-debrief/2';
  version: string;
  build: string;
  record: RunData;
  objectives: ReturnType<typeof objectives>;
  facts: Fact[];
  keyTimes: Array<{
    id: 'recognition' | 'firstTeam' | `objective:${number}` | 'pulseLostToCpr' | 'pulseless';
    label: string; fromT: number | null; toT: number | null; askedS?: number; totalS?: number;
    /** Recognition only: what `fromT` is ("early signs", the state the card's rules count from; "start" without one). */
    fromLabel?: string;
    state: 'measured' | 'notTicked' | 'noneAfter';
  }>;
  /** Values as recorded, unrounded, except SpO₂: null while pulseless (`pulseless` says why). */
  keyMoments: Array<{
    n: number; t: number; who: 'team' | 'patient' | 'scenario'; text: string;
    values: { hr: number | null; map: number | null; spo2: number | null; etco2: number | null };
    pulseless: boolean; alarms: string[];
  }>;
  minutes: ReturnType<typeof perMinute>;
  steps: Step[];
  judged: ReturnType<typeof judged>;
  marks: ReturnType<typeof marks>;
}
/** A pme-scenario/2 run's export (plan F7, Q10): no objectives and no steps; the phases, then the graded sections of
 *  `Report3`, then the rest as `/2`. A reader of `/2` never receives a `/2` run (R8). */
export type DebriefExport3 = { schema: 'pme-debrief/3'; version: string; build: string; record: RunData; phases: PhaseEntry[] } & Report3
  & Pick<DebriefExport, 'facts' | 'keyTimes' | 'keyMoments' | 'minutes' | 'marks'>;
