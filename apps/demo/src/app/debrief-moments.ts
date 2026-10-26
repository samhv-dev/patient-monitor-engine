// The key moments and the key times of a run, computed from the run record alone (`record.ts` `RunData`): the scenario's
// states after the first, the pulse lost and back (the model), and the team's drugs, fluids, shocks and CPR; each with
// what the monitor's trend held at that second and the alarms raised since the moment before. The key times are the
// intervals the facilitator reads first: the instructor's recognition tick, the first team action, each objective's
// measured interval, the pulse loss to CPR and the time without a pulse. Every number traces to a row or a sample; an
// absent one is null, never a guess. Read on the KEPT course, as the debrief's rules are. No DOM.
import { endOf, isEvent, objectives, type DebriefExport } from './debrief.ts';
import type { Row, RunData, Sample } from './record.ts';

export type Who = 'team' | 'patient' | 'scenario';
export type KeyMoment = DebriefExport['keyMoments'][number];
export type KeyTime = DebriefExport['keyTimes'][number];

const kept = (d: RunData): Row[] => d.rows.filter((r) => r.undone === undefined);
const STATE = 'Scenario state: ';
/** Two patient moments this close (s) are one moment [ENG: the pulse loss and the state it causes come ≈ 1 s apart]. */
const MERGE_S = 3;
/** A moment's value may come from this many seconds after it when its own second has none [ENG]. */
const LOOK_S = 3;
/** An alarm counts for a moment when raised up to this long after it [ENG: the alarm table's 1 Hz evaluation]. */
const ALARM_S = 0.5;
const MAX_TILES = 6;

/** Who moved the scenario from state `prev` into `id`: its transitions there all manual → the team; any other kind →
 *  the patient; none (an instructor's jump) → the scenario. */
export function whoOf(d: RunData, prev: string, id: string): Who {
  const ts = (d.doc?.states.find((s) => s.id === prev)?.transitions ?? []).filter((x) => x.to === id || x.else === id);
  if (!ts.length) return 'scenario';
  return ts.every((x) => 'manual' in x.when) ? 'team' : 'patient';
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

/** The value of `k` at second ⌊t⌋, else the first measured in the next three seconds, else null. */
function valueAt(at: Map<number, Sample>, k: 'hr' | 'map' | 'spo2' | 'etco2', t: number): number | null {
  const f = Math.floor(t);
  for (let s = f; s <= f + LOOK_S; s++) {
    const v = at.get(s)?.[k];
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

/** The key moments of the kept course in time order, numbered 1…n. Values as recorded (unrounded) — what the monitor
 *  showed: SpO₂ is null where the oximeter showed its dash (pulseless without compressions) and the number it showed
 *  during CPR (E126; E60 blanked every pulseless row). `pulseless` marks the rows the footnote explains. A state's own
 *  set-up rows are not moments. */
export function keyMoments(d: RunData): KeyMoment[] {
  const raw: Array<{ t: number; who: Who; text: string }> = [];
  let prev: string | undefined;
  for (const r of kept(d)) {
    if (r.ev?.startsWith('state:')) {
      const id = r.ev.slice('state:'.length);
      if (prev !== undefined) raw.push({ t: r.t, who: whoOf(d, prev, id), text: r.text.startsWith(STATE) ? r.text.slice(STATE.length) : r.text });
      prev = id;
    } else if (r.ev === 'pulseLoss' || r.ev === 'rosc') raw.push({ t: r.t, who: 'patient', text: r.text });
    else if ((r.kind === 'action' || r.kind === 'remote') && (r.ev?.startsWith('drug:') || r.ev === 'fluid' || r.ev === 'shock' || r.ev === 'cpr')) raw.push({ t: r.t, who: 'team', text: r.text });
  }
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
  return merged.map((m, i) => {
    const from = i ? (merged[i - 1] as { t: number }).t : -Infinity;
    const pulseless = pulselessAt(d, m.t, spans);
    return {
      n: i + 1, t: m.t, who: m.who, text: m.text,
      values: { hr: valueAt(at, 'hr', m.t), map: valueAt(at, 'map', m.t), spo2: valueAt(at, 'spo2', m.t), etco2: valueAt(at, 'etco2', m.t) },
      pulseless,
      alarms: alarms.filter((a) => from < a.t && a.t <= m.t + ALARM_S).map((a) => a.text),
    };
  });
}

/** Where the recognition interval starts (UI review #18): the moment the sign became recognisable, not Load. That is the
 *  first state the card's own timed rules count from (an `eventWithin` whose `after` is `state:…`: the MH card's "call
 *  the crisis within 120 s of the early signs") which the patient enters (a transition into it that is not manual),
 *  reached on the kept course at or before the tick. A card with no such state shows its signs from Load (tamponade
 *  "within 180 s of arrival", bronchospasm), and so does a tick before the state: the start. Its label is the state's
 *  label up to the first colon ("Early signs: EtCO₂ rising …" → "early signs"). */
function recognitionFrom(d: RunData, tick: number | undefined): { t: number; label: string } {
  const doc = d.doc;
  const named = new Set((doc?.objectives ?? []).flatMap((o) => (typeof o !== 'string' && o.rule?.kind === 'eventWithin' ? [o.rule.after].flat() : []))
    .filter((a) => a.startsWith('state:')).map((a) => a.slice('state:'.length)));
  const byPatient = (id: string) => (doc?.states ?? []).some((s) => (s.transitions ?? []).some((x) => (x.to === id || x.else === id) && !('manual' in x.when)));
  const idOf = (r: Row) => (r.ev?.startsWith('state:') ? r.ev.slice('state:'.length) : '');
  const r = kept(d).find((x) => (tick === undefined || x.t <= tick) && named.has(idOf(x)) && byPatient(idOf(x)));
  if (!r) return { t: 0, label: 'start' };
  const head = (doc?.states.find((s) => s.id === idOf(r))?.label ?? idOf(r)).split(':')[0] as string;
  return { t: r.t, label: /^.[a-z]/.test(head) ? head.charAt(0).toLowerCase() + head.slice(1) : head };
}

/** The key times, in order: recognition, the first team action, the objectives' measured intervals (document order),
 *  the pulse loss to CPR, the time pulseless; at most six that print a tile. A `noneAfter` interval prints none (the
 *  view drops it), so it does not count toward the six (R-B N1). A generic interval equal to an objective's is left
 *  out (the objective's is kept). */
export function keyTimes(d: RunData, moments: KeyMoment[] = keyMoments(d)): KeyTime[] {
  const objs = objectives(d);
  const docObjs = d.doc?.objectives ?? [];
  const out: KeyTime[] = [];
  const ri = docObjs.findIndex((o) => typeof o !== 'string' && o.debrief === 'recognition');
  if (ri >= 0) {
    const tk = objs[ri]?.verdict.tickedT;
    const from = recognitionFrom(d, tk);
    out.push({ id: 'recognition', label: "Recognition (instructor's tick)", fromT: from.t, fromLabel: from.label, toT: tk ?? null, state: tk === undefined ? 'notTicked' : 'measured' });
  }
  const team = moments.find((m) => m.who === 'team');
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
  }
  const same = (a: KeyTime) => objTiles.some((o) => o !== a && o.fromT === a.fromT && o.toT === a.toT);
  let drawn = 0;
  return out.filter((k) => k.id.startsWith('objective:') || !same(k)).filter((k) => k.state === 'noneAfter' || ++drawn <= MAX_TILES);
}
