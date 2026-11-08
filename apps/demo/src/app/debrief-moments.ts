// The key moments and the key times of a run, computed from the run record alone (`record.ts` `RunData`): the scenario's
// states after the first (each the team's, the patient's or the scenario's as the record's `by` says), the pulse lost
// and back (the model), and the team's drugs, fluids, shocks and CPR; each with
// what the monitor's trend held at that second (and, in a record of Debrief 2, the systolic/diastolic and CVP, a cuff
// reading with its age) and the alarms raised since the moment before (with when each ended and was acknowledged). The key times are the
// intervals the facilitator reads first: the recognition (one reading, `recognitionAt`: a /2 card's timed action, a /1
// card's tick or the instructor's press), the first team action, each objective's
// measured interval, the pulse loss to CPR, the time without a pulse and the hands-off time within it (with the
// compression fraction). Every number traces to a row or a sample; an
// absent one is null, never a guess. Read on the KEPT course, as the debrief's rules are. No DOM.
import { asV1, isV2, type ScenarioDoc } from '@pme/controller';
import type { Grade, ScenarioDocV2 } from '@pme/controller/scenario';
import { endOf, first, gradesOf, isEvent, objectives, report3, stringAnchorAt, type DebriefExport, type Pressure } from './debrief.ts';
import type { Row, RunData, Sample, StateBy } from './record.ts';

export type Who = 'team' | 'patient' | 'scenario';
export type KeyMoment = DebriefExport['keyMoments'][number];
export type KeyTime = DebriefExport['keyTimes'][number];

const kept = (d: RunData): Row[] => d.rows.filter((r) => r.undone === undefined);
const STATE = 'Scenario state: ';
/** Two patient moments this close (s) are one moment [ENG: ui; the pulse loss and the state it causes come ≈ 1 s apart]. */
const MERGE_S = 3;
/** A moment's value may come from this many seconds after it when its own second has none [ENG: ui]. */
const LOOK_S = 3;
/** An alarm counts for a moment when raised up to this long after it [ENG: ui; the alarm table's 1 Hz evaluation]. */
const ALARM_S = 0.5;
const MAX_TILES = 6;

/** Who moved the scenario from state `prev` into `id`: its transitions there all manual → the team; any other kind →
 *  the patient; none (an instructor's jump) → the scenario. */
export function whoOf(d: RunData, prev: string, id: string): Who {
  const ts = (asV1(d.doc)?.states.find((s) => s.id === prev)?.transitions ?? []).filter((x) => x.to === id || x.else === id);
  if (!ts.length) return 'scenario';
  return ts.every((x) => 'manual' in x.when) ? 'team' : 'patient';
}

/** The who of each way a state is entered (record.ts `Row.by`, the runner's own account): the instructor's press of the
 *  team's step → the team; the transition's own rule (every pme-scenario/2 phase) → the patient; a jump → the scenario. */
const BY: Readonly<Record<StateBy, Who>> = { press: 'team', rule: 'patient', goto: 'scenario' };
/** Who moved the scenario into the state of `row` from state `prev` (D4): the record's `by` first, read, never matched;
 *  a row without one (a record made before Instructor v2 IP8 kept none) falls back to the card's transitions
 *  (`whoOf`), so an old export prints as it did. */
export function whoAt(d: RunData, row: Row, prev: string): Who {
  return (row.by ? BY[row.by as StateBy] : undefined) ?? whoOf(d, prev, (row.ev ?? '').slice('state:'.length));
}

/** The pulseless spans of the kept course, [from, to]: a kept pulse loss to the next kept return of circulation; a span
 *  with no return runs to the end of the record (E60). */
export function pulselessSpans(d: RunData): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let lost: number | null = null;
  for (const r of kept(d)) {
    if (r.ev === 'pulseLoss' && lost === null) lost = r.t;
    else if (r.ev === 'rosc' && lost !== null) (out.push([lost, r.t]), (lost = null));
  }
  if (lost !== null) out.push([lost, endOf(d)]);
  return out;
}
/** Whether simulated second `t` lies in a pulseless span, both ends included (E60). */
export const pulselessAt = (d: RunData, t: number, spans = pulselessSpans(d)): boolean => spans.some(([a, b]) => a <= t && t <= b);

/** The hands-off time inside the pulseless spans, and the compression fraction `1 − handsOff / pulseless` (D3).
 *  Hands-off is the time inside the pulseless spans when compressions were not active. Compressions run from a kept
 *  `cpr` row (the team's, a Remote's or the card's command; a second start while compressing changes the rate) to the
 *  next kept `cprStop` row, or to the end of the record. Null without a pulse loss, and for a record whose `keeps` lacks
 *  'cprStop' (made before D3: its stops have no event, so the time cannot be read, and is not guessed from the starts
 *  alone). */
export function handsOff(d: RunData): { handsOffS: number; pulselessS: number; fraction: number } | null {
  const spans = pulselessSpans(d);
  if (!d.keeps?.includes('cprStop') || !spans.length) return null;
  const on: Array<[number, number]> = [];
  let from: number | null = null;
  for (const r of kept(d).filter((x) => x.ev === 'cpr' || x.ev === 'cprStop').sort((a, b) => a.t - b.t)) {
    if (r.ev === 'cpr') from ??= r.t;
    else if (from !== null) (on.push([from, r.t]), (from = null));
  }
  if (from !== null) on.push([from, endOf(d)]);
  const pulselessS = spans.reduce((a, [f, t]) => a + t - f, 0);
  const pressed = spans.reduce((a, [f, t]) => a + on.reduce((b, [x, y]) => b + Math.max(0, Math.min(t, y) - Math.max(f, x)), 0), 0);
  const handsOffS = pulselessS - pressed;
  return { handsOffS, pulselessS, fraction: pulselessS > 0 ? 1 - handsOffS / pulselessS : 0 };
}

/** The value of `k` at second ⌊t⌋, else the first measured in the next three seconds, else null. */
function valueAt(at: Map<number, Sample>, k: 'hr' | 'map' | 'spo2' | 'etco2' | 'cvp', t: number): number | null {
  const f = Math.floor(t);
  for (let s = f; s <= f + LOOK_S; s++) {
    const v = at.get(s)?.[k];
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

/** A moment's systolic and diastolic (D6; the owner's cuff rule of 5 November, DQ1). The arterial line reports every
 *  second and the cuff only in its cycle's second (record.ts `PRESSURES`), so a reading whose seconds on both sides
 *  hold none is a cuff cycle. A line value: the first in ⌊t⌋…⌊t⌋+3 s (as `valueAt`). Else the LAST cuff reading at or
 *  before ⌊t⌋, with its age `t − its second` (a cuff after the moment is never borrowed). Else null. */
function pressureAt(at: Map<number, Sample>, t: number): { sys: Pressure; dia: Pressure } {
  const has = (s: number) => typeof at.get(s)?.sys === 'number';
  const cuff = (s: number) => has(s) && !has(s - 1) && !has(s + 1);
  const f = Math.floor(t);
  for (let s = f; s <= f + LOOK_S; s++) if (has(s) && !cuff(s)) return { sys: at.get(s)?.sys ?? null, dia: at.get(s)?.dia ?? null };
  for (let s = f; s >= 0; s--) {
    if (!cuff(s)) continue;
    const x = at.get(s) as Sample;
    const ageS = t - s;
    return { sys: { v: x.sys as number, ageS }, dia: typeof x.dia === 'number' ? { v: x.dia, ageS } : null };
  }
  return { sys: null, dia: null };
}

/** The key moments of the kept course in time order, numbered 1…n. Values as recorded (unrounded) — what the monitor
 *  showed: SpO₂ is null where the oximeter showed its dash (pulseless without compressions) and the number it showed
 *  during CPR (E126; E60 blanked every pulseless row). `pulseless` marks the rows the footnote explains. A state's own
 *  set-up rows are not moments. */
export function keyMoments(d: RunData): KeyMoment[] {
  const raw: Array<{ t: number; who: Who; text: string; recognised?: true }> = [];
  let prev: string | undefined;
  for (const r of kept(d)) {
    if (r.ev?.startsWith('state:')) {
      const id = r.ev.slice('state:'.length);
      if (prev !== undefined) raw.push({ t: r.t, who: whoAt(d, r, prev), text: r.text.startsWith(STATE) ? r.text.slice(STATE.length) : r.text });
      prev = id;
    } else if (r.ev === 'pulseLoss' || r.ev === 'rosc') raw.push({ t: r.t, who: 'patient', text: r.text });
    else if ((r.kind === 'action' || r.kind === 'remote' || r.kind === 'learner') && (r.ev?.startsWith('drug:') || r.ev === 'fluid' || r.ev === 'shock' || r.ev === 'cpr')) raw.push({ t: r.t, who: 'team', text: r.text });
  }
  // the recognition, a team moment (D5): a /2 card's marked action as pressed; a /1 tick or press only in a record that
  // keeps 'recognised' (made with the press), so an older export's moments stay as they were
  const rec = recognitionAt(d);
  if (rec && rec.t !== null && (rec.source === 'action' || d.keeps?.includes('recognised'))) raw.push({ t: rec.t, who: 'team', text: RECOGNISED[rec.source].moment, recognised: true });
  raw.sort((a, b) => a.t - b.t);
  const merged: typeof raw = [];
  for (const m of raw) {
    const last = merged.at(-1);
    if (last && last.who === 'patient' && m.who === 'patient' && m.t - last.t <= MERGE_S) last.text += ` · ${m.text.split(':')[0]}`;
    else merged.push({ ...m });
  }
  const at = new Map(d.samples.map((s) => [s.t, s]));
  const alarms = kept(d).filter((r) => r.kind === 'alarm');
  const spans = pulselessSpans(d);
  const pressures = !!d.keeps?.includes('pressures');
  const ends = !!d.keeps?.includes('alarmEnd');
  return merged.map((m, i) => {
    const from = i ? (merged[i - 1] as { t: number }).t : -Infinity;
    const pulseless = pulselessAt(d, m.t, spans);
    const raised = alarms.filter((a) => from < a.t && a.t <= m.t + ALARM_S);
    return {
      n: i + 1, t: m.t, who: m.who, text: m.text,
      values: {
        hr: valueAt(at, 'hr', m.t), map: valueAt(at, 'map', m.t), spo2: valueAt(at, 'spo2', m.t), etco2: valueAt(at, 'etco2', m.t),
        ...(pressures ? { ...pressureAt(at, m.t), cvp: valueAt(at, 'cvp', m.t) } : {}),
      },
      pulseless,
      alarms: raised.map((a) => a.text),
      ...(ends ? { alarmTimes: raised.map((a) => ({ t: a.t, endT: a.endT ?? null, ackT: a.ackT ?? null })) } : {}),
      ...(m.recognised ? { recognised: true as const } : {}),
    };
  });
}

/** The states whose entry makes a /1 card's sign recognisable: those the card's own timed rules count from (an
 *  `eventWithin` whose `after` is `state:…`) which the patient enters (a transition into it that is not manual). The
 *  Debrief's recognition clock starts at the first one entered (`recognitionFrom`), and Instructor v2 offers the judged
 *  recognition row from then (teach2/rows.ts): one reading, so the row is never there before its clock can start. Empty:
 *  the card shows its signs from Load. */
export function signStates(doc: ScenarioDoc): Set<string> {
  const named = new Set((doc.objectives ?? []).flatMap((o) => (typeof o !== 'string' && o.rule?.kind === 'eventWithin' ? [o.rule.after].flat() : []))
    .filter((a) => a.startsWith('state:')).map((a) => a.slice('state:'.length)));
  const byPatient = (id: string) => doc.states.some((s) => (s.transitions ?? []).some((x) => (x.to === id || x.else === id) && !('manual' in x.when)));
  return new Set([...named].filter(byPatient));
}

/** Where the recognition interval starts (UI review #18): the moment the sign became recognisable, not Load. That is the
 *  first state the card's own timed rules count from (an `eventWithin` whose `after` is `state:…`: the MH card's "call
 *  the crisis within 120 s of the early signs") which the patient enters (a transition into it that is not manual),
 *  reached on the kept course at or before the tick. A card with no such state shows its signs from Load (tamponade
 *  "within 180 s of arrival", bronchospasm), and so does a tick before the state: the start. Its label is the state's
 *  label up to the first colon ("Early signs: EtCO₂ rising …" → "early signs"). */
function recognitionFrom(d: RunData, tick: number | undefined): { t: number; label: string } {
  const doc = asV1(d.doc); // a pme-scenario/2 card: no states, no objectives (F7)
  const signs = doc ? signStates(doc) : new Set<string>();
  const idOf = (r: Row) => (r.ev?.startsWith('state:') ? r.ev.slice('state:'.length) : '');
  const r = kept(d).find((x) => (tick === undefined || x.t <= tick) && signs.has(idOf(x)));
  if (!r) return { t: 0, label: 'start' };
  return { t: r.t, label: headOf(doc?.states.find((s) => s.id === idOf(r))?.label ?? idOf(r)) };
}
/** A state's or phase's label as the tile names it: up to the first colon, a capital lowered unless it is an acronym
 *  ("Early signs: EtCO₂ rising …" → "early signs"). */
function headOf(label: string): string {
  const head = label.split(':')[0] as string;
  return /^.[a-z]/.test(head) ? head.charAt(0).toLowerCase() + head.slice(1) : head;
}

/** The recognition of a run, read ONE way (D5; plan Decision 3, the owner's ruling of 5 November): `t` when the team
 *  named the problem as the instructor recorded it (null: not yet), counted from `fromT`.
 *  - a pme-scenario/2 run: the card's action marked `recognition: true` (at most one, the validator says), as
 *    `report3` grades it: its window's opening (`dueT`, named by its anchor phase) and length, its press (`givenT`) and
 *    its first grade. Read by the field, never by a label; no note is read. None when the card marks none (a card made
 *    before the field, such as an archived /3 export with the retired judged rows) or the window never opened.
 *  - a /1 card with a recognition objective (`debrief: 'recognition'`): its first kept tick (the Scenario tab's
 *    checkbox, Instructor v2's row, or the Recognised press, which sends the same note), from the sign state
 *    (`recognitionFrom`); `t` null when not ticked.
 *  - any other /1 card or a free run: the first kept note with `ev: 'recognised'` (the Recognised press), from the sign
 *    state; none when the record keeps no 'recognised' (made before the press) or nobody pressed.
 *  An undone press or tick is not counted (the kept course). The tile, the key moments and the swimlane read this. */
export type Recognition =
  | { source: 'action'; actionId: string; fromT: number; fromLabel: string; t: number | null; windowS: number | null; grade: Grade }
  | { source: 'tick' | 'press'; fromT: number; fromLabel: string; t: number | null };
export function recognitionAt(d: RunData): Recognition | null {
  if (d.doc && isV2(d.doc)) {
    const doc: ScenarioDocV2 = d.doc;
    const act = doc.actions.find((a) => a.recognition);
    const g = act ? report3(d)?.actions.find((a) => a.id === act.id) : undefined;
    if (!act || !g || g.dueT === null) return null;
    const an = act.window?.anchor;
    const phase = typeof an === 'string' && an.startsWith('phase:') ? doc.phases.find((p) => p.id === an.slice(6)) : undefined;
    const fromLabel = phase ? headOf(phase.label) : g.dueT === 0 ? 'start' : 'its window';
    return { source: 'action', actionId: act.id, fromT: g.dueT, fromLabel, t: g.givenT, windowS: g.windowS, grade: g.firstGrade };
  }
  const ri = (asV1(d.doc)?.objectives ?? []).findIndex((o) => typeof o !== 'string' && o.debrief === 'recognition');
  if (ri >= 0) {
    const tk = objectives(d)[ri]?.verdict.tickedT;
    const from = recognitionFrom(d, tk);
    return { source: 'tick', fromT: from.t, fromLabel: from.label, t: tk ?? null };
  }
  const press = d.keeps?.includes('recognised') ? kept(d).find((r) => r.kind === 'note' && r.ev === 'recognised') : undefined;
  if (!press) return null;
  const from = recognitionFrom(d, press.t);
  return { source: 'press', fromT: from.t, fromLabel: from.label, t: press.t };
}
/** Each reading's words: the tile's caption and the key moment's text. */
export const RECOGNISED: Readonly<Record<Recognition['source'], { tile: string; moment: string }>> = {
  action: { tile: 'Recognition (timed action)', moment: 'Recognised (timed action, recorded by the instructor)' },
  tick: { tile: "Recognition (instructor's tick)", moment: "Recognised (instructor's tick)" },
  press: { tile: "Recognition (instructor's press)", moment: 'Recognised (instructor)' },
};

/** The key times, in order: recognition (`recognitionAt`), the first team action, the objectives' measured intervals (document order),
 *  the pulse loss to CPR, the time pulseless, the hands-off time (`handsOff`); at most six that print a tile. A `noneAfter` interval prints none (the
 *  view drops it), so it does not count toward the six (R-B N1). A generic interval equal to an objective's is left
 *  out (the objective's is kept). */
export function keyTimes(d: RunData, moments: KeyMoment[] = keyMoments(d)): KeyTime[] {
  const objs = objectives(d);
  const out: KeyTime[] = [];
  const rec = recognitionAt(d);
  if (rec) {
    out.push({
      id: 'recognition', label: RECOGNISED[rec.source].tile, fromT: rec.fromT, fromLabel: rec.fromLabel, toT: rec.t,
      ...(rec.source === 'action' ? { ...(rec.windowS !== null ? { askedS: rec.windowS } : {}), grade: rec.grade } : {}),
      state: rec.t === null ? 'notTicked' : 'measured',
    });
  }
  const team = moments.find((m) => m.who === 'team' && !m.recognised); // naming the problem is not the first action
  if (team) out.push({ id: 'firstTeam', label: 'Start → first team action', fromT: 0, toT: team.t, state: 'measured' });
  const objTiles: KeyTime[] = [];
  objs.forEach((o, i) => {
    const m = o.verdict.measure;
    if (m) objTiles.push({ id: `objective:${i}`, label: o.text, fromT: m.fromT, toT: m.toT, askedS: m.askedS, state: 'measured' });
  });
  out.push(...objTiles);
  const rows = kept(d);
  const loss = rows.find((r) => r.ev === 'pulseLoss');
  if (loss) {
    const cpr = rows.find((r) => r.t >= loss.t && isEvent(r.ev, 'cpr'));
    out.push(cpr ? { id: 'pulseLostToCpr', label: 'Pulse lost → CPR', fromT: loss.t, toT: cpr.t, state: 'measured' } : { id: 'pulseLostToCpr', label: 'Pulse lost → CPR', fromT: loss.t, toT: null, state: 'noneAfter' });
    // the same sum as facts()' "Pulseless … in all"
    const off = pulselessSpans(d).reduce((a, [f, t]) => a + t - f, 0);
    out.push({ id: 'pulseless', label: 'Pulseless in all', fromT: loss.t, toT: null, totalS: off, state: 'measured' });
    const ho = handsOff(d);
    if (ho) out.push({ id: 'handsOff', label: 'Hands-off time', fromT: loss.t, toT: null, totalS: ho.handsOffS, fraction: ho.fraction, state: 'measured' });
  }
  const same = (a: KeyTime) => objTiles.some((o) => o !== a && o.fromT === a.fromT && o.toT === a.toT);
  let drawn = 0;
  return out.filter((k) => k.id.startsWith('objective:') || !same(k)).filter((k) => k.state === 'noneAfter' || ++drawn <= MAX_TILES);
}

/** The card author's openers (D9) on this run: each opener whose anchor happened on the kept course, in the card's order,
 *  with the anchor's time and the number of the key moment at that second (the nearest within MERGE_S; null when no key
 *  moment is there, e.g. a value crossing or the start), and how many were left out because their anchor did not
 *  happen. The anchor is read as the rules read it: a /1 run event by the same `first()` the objectives use; a /2 anchor
 *  by `report3`'s reading (`stringAnchorAt`). Null when the card has no openers. The text is the card's, never
 *  interpolated (Decision 8). */
export function openersAt(d: RunData, moments: KeyMoment[] = keyMoments(d)): { shown: Array<{ text: string; t: number; n: number | null }>; left: number } | null {
  const openers = d.doc?.debriefHints?.openers;
  if (!d.doc || !openers?.length) return null;
  const at = hintAnchorReader(d);
  const shown: Array<{ text: string; t: number; n: number | null }> = [];
  for (const o of openers) {
    const t = at(o.at);
    if (t === undefined) continue;
    const near = moments.filter((m) => Math.abs(m.t - t) <= MERGE_S).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    shown.push({ text: o.text, t, n: near?.n ?? null });
  }
  return { shown, left: openers.length - shown.length };
}

/** When a card hint's anchor happened on the kept course (the openers' reading, D9; the handout's questions, D16), or
 *  undefined: a /1 run event by the objectives' `first()`, a /2 anchor by `report3`'s (`stringAnchorAt`). */
function hintAnchorReader(d: RunData): (a: string) => number | undefined {
  const g = d.doc && isV2(d.doc) ? gradesOf(d) : null;
  return (a) => (d.doc && isV2(d.doc) ? (g ? stringAnchorAt(d, g, a as Parameters<typeof stringAnchorAt>[2]) : undefined) : first(d, a as Parameters<typeof first>[1])?.t);
}

/** The card's handout questions (D16) whose anchor happened on the kept course, in the card's order, each with its
 *  anchor's time; the text is the card's, never interpolated. Empty when the card has none (the fixed prompts print). */
export function handoutQuestionsAt(d: RunData): Array<{ text: string; t: number }> {
  const qs = d.doc?.debriefHints?.handoutQuestions ?? [];
  if (!qs.length) return [];
  const at = hintAnchorReader(d);
  return qs.flatMap((q) => {
    const t = at(q.at);
    return t === undefined ? [] : [{ text: q.text, t }];
  });
}
