// The one grading function of a pme-scenario/2 run (docs/plans/scenario-format-v2.md §6–§8.3; plan F3). PURE: the card,
// the phase timeline, the administration record and the rule edges the runner logs (Q17) in, the grades out; no DOM, no
// session, no engine. The panel calls it every second (live), the debrief once (`final`).
// - Matching by identity, never a card-set act: a drug action takes a `drug`/`infusion` record of its id, its class or
//   one of its alternatives (with the alternative's own dose), in the prescribed form (`rate.infusion`: an infusion
//   record only; `rate.bolus`: a bolus only); a device action the record of its device kind (CPR only
//   while active, a defibrillator only its shock); a decision the record of one of its effects' kinds (graded on that
//   effect's settings); a physical measure a `fluid` record (cooling is the cold fluid); a fluid action a `fluid` record
//   of its types; a procedure, sample or communication the record stamped with its own action id (the scenario `record`
//   action, Q19). A drug record by a route outside the set, or one the engine refused, does not satisfy: the action
//   stays open and the reason prints as a line ("route im not allowed", "route not modelled", "refused: …").
// - The administration graded is the first satisfying one; for a device or a decision the first whose settings are all
//   in range, else the first (the ventilator and the vaporiser are set many times for other reasons: the intubation's
//   12 × 500 is not the hyperventilation).
// - An action without a window counts the records from its opening (the first entry of one of its phases, §5) and is
//   "not applicable" if none of its phases occurred.
// - Precedence failed > overdue > due > deviation > met; a late, wrongly sized dose is overdue with the deviation line
//   under it; repeats are graded each and the action takes the worst. `graded: false` actions are left out.
// - Repeats: `repeatWhile` only (Q13: due from the later of the previous dose + intervalS.min and the condition's first
//   true EDGE at or after the previous dose, within intervalS.max − min; a condition already true at the dose that never
//   falls and rises again makes no repeat row). NOT graded yet: `order`, the unconditional
//   `repeat`, `cumulative.min` and `cumulative.windowS` (the ceiling is summed over the whole run), and a decision with
//   several effects is graded on the first effect of the record's kind.
import type { Action, Administration, Amount, Anchor, Dose, PhaseEntry, PhaseRule, RuleEdge, ScenarioDocV2, Settings } from './types-v2.ts';

export type Grade = 'met' | 'deviation' | 'overdue' | 'failed' | 'due' | 'not applicable';
export interface RepeatGrade { n: number; grade: Grade; dueT?: number; t?: number; lines: string[] }
export interface ActionGrade {
  id: string;
  label: string;
  /** The worst of the first administration's row and its repeats. */
  grade: Grade;
  /** The first administration's own grade (before the repeats). */
  firstGrade: Grade;
  lines: string[];
  /** When the window opened (the anchor), and its length; `dueT + windowS` is the deadline. */
  dueT?: number;
  windowS?: number;
  /** The time of the administration graded. */
  givenT?: number;
  /** The conditional repeats, from n = 2. */
  repeats: RepeatGrade[];
  /** The row's live string: "due m:ss", "overdue m:ss", "met mm:ss", "deviation: <line>", "failed", "not applicable". */
  live: string;
  /** The seqs of every record matching the action's identity (refused and wrong-route ones included). */
  admin: number[];
}
export interface OutcomeGrade { id: string; text: string; grade: 'reached' | 'not reached' | 'pending'; t?: number }
export interface Violation { t: number; seq: number; action: string; text: string; harm: 'modelled' | 'not modelled' }
export interface JudgedRow { id: string; text: string; kind: 'recognition' | 'communication'; fromT?: number }
export interface Grades { actions: ActionGrade[]; outcomes: OutcomeGrade[]; violations: Violation[]; judged: JudgedRow[] }

const EPS = 1e-6;
const RANK: Record<Grade, number> = { 'not applicable': 0, met: 1, deviation: 2, due: 3, overdue: 4, failed: 5 };
const n2 = (x: number) => String(Math.round(x * 100) / 100);
const pad = (x: number) => String(x).padStart(2, '0');
/** A clock time, mm:ss. */
const clock = (t: number) => `${pad(Math.floor(Math.round(t) / 60))}:${pad(Math.round(t) % 60)}`;
/** A duration, m:ss. */
const dur = (s: number) => `${Math.floor(Math.max(0, Math.round(s)) / 60)}:${pad(Math.max(0, Math.round(s)) % 60)}`;

/** The first true edge of `rule` at or after `from`. */
const firstTrue = (edges: readonly RuleEdge[], rule: string, from = -Infinity) => edges.find((e) => e.rule === rule && e.value && e.t >= from - EPS)?.t;
/** The rule's value at `t` (its last edge at or before `t`; false before any). */
function heldAt(edges: readonly RuleEdge[], rule: string, t: number): boolean {
  let v = false;
  for (const e of edges) if (e.rule === rule && e.t <= t + EPS) v = e.value;
  return v;
}
/** The first time at or after `t` the rule holds. */
const trueFrom = (edges: readonly RuleEdge[], rule: string, t: number) => (heldAt(edges, rule, t) ? t : firstTrue(edges, rule, t));

/** A rule in words ("k > 5.5", "etco2 > 45 for 20 s"). */
export function ruleWords(r: PhaseRule): string {
  if ('value' in r) return `${r.value.var} ${r.value.op} ${r.value.value}${r.value.forS ? ` for ${r.value.forS} s` : ''}`;
  if ('slope' in r) return `${r.slope.var} slope ${r.slope.op} ${r.slope.perMin}/min over ${r.slope.overS} s`;
  if ('unchanged' in r) return `${r.unchanged.var} unchanged within ${r.unchanged.withinPct} %${r.unchanged.since ? ' since the phase start' : ` over ${r.unchanged.overS} s`}`;
  if ('visited' in r) return `${r.visited} visited`;
  if ('signal' in r) return r.signal;
  if ('all' in r) return r.all.map(ruleWords).join(' and ');
  if ('any' in r) return r.any.map(ruleWords).join(' or ');
  return `not (${ruleWords(r.not)})`;
}

/** In the amount: a `min`/`max` range when one is given, else `value` ± `tolerance` (0). */
function inAmount(x: number, a: Amount): boolean {
  if (a.min !== undefined || a.max !== undefined) return (a.min === undefined || x >= a.min - EPS) && (a.max === undefined || x <= a.max + EPS);
  return a.value === undefined || Math.abs(x - a.value) <= (a.tolerance ?? 0) + EPS;
}
function asked(a: Amount): string {
  if (a.value !== undefined) return n2(a.value);
  if (a.min !== undefined && a.max !== undefined) return `${n2(a.min)}–${n2(a.max)}`;
  return a.min !== undefined ? `≥ ${n2(a.min)}` : `≤ ${n2(a.max ?? NaN)}`;
}
/** The record's dose in `unit`: as given, or converted between mass and mass per kg with the card's weight. */
function doseIn(a: Administration, unit: string, w?: number): number | undefined {
  if (a.dose === undefined || !a.unit) return undefined;
  if (a.unit === unit) return a.dose;
  if (unit === `${a.unit}/kg`) return a.perKg ?? (w ? a.dose / w : undefined);
  if (a.unit === `${unit}/kg`) return w ? a.dose * w : undefined;
  return undefined;
}

/** What a record matched: the dose and settings it is held to. */
interface Ident { dose?: Dose; settings?: Settings }
function identity(act: Action, a: Administration): Ident | null {
  const live = a.settings?.active !== 0 && (a.kind !== 'defib' || a.settings?.action === 'shock');
  switch (act.kind) {
    case 'drug': {
      const d = act.drug;
      if (!d || (a.kind !== 'drug' && a.kind !== 'infusion')) return null;
      // the form is part of the identity: a propofol bolus (the induction's) is not the propofol infusion prescribed
      if (d.rate && ('infusion' in d.rate ? a.kind !== 'infusion' : 'bolus' in d.rate && a.kind !== 'drug')) return null;
      if ((d.id && a.drugId === d.id) || (d.cls && a.cls === d.cls)) return d.dose ? { dose: d.dose } : {};
      const alt = d.alternatives?.find((x) => x.id === a.drugId);
      const dose = alt?.dose ?? d.dose;
      return alt ? (dose ? { dose } : {}) : null;
    }
    case 'device':
      return act.device && a.kind === act.device.kind && live ? { settings: act.device.settings } : null;
    case 'decision': {
      const e = live ? act.effect?.find((x) => x.kind === a.kind) : undefined;
      return e ? { settings: e.settings } : null;
    }
    case 'physical':
      return a.kind === 'fluid' || a.kind === 'physical' ? (act.physical?.settings ? { settings: act.physical.settings } : {}) : null;
    case 'fluid':
      return a.kind === 'fluid' && (!act.fluid?.type || act.fluid.type.includes(a.fluid?.type ?? '')) ? {} : null;
    default:
      return a.actionId === act.id ? {} : null;
  }
}
/** Why a matching record does not satisfy the action ([]: it does). */
function blockers(act: Action, a: Administration): string[] {
  const out: string[] = [];
  const set = act.drug?.route?.set;
  const route = a.route ?? 'iv';
  if (act.kind === 'drug' && set && !set.includes(route)) out.push(`route ${route} not allowed`);
  if (!a.result.accepted) out.push(a.result.routeNotModelled ? 'route not modelled' : `refused: ${a.result.reason}`);
  return out;
}
/** The criteria a satisfying record is off (dose, route preferred, rate, settings, fluid). */
function deviations(act: Action, a: Administration, id: Ident, w?: number): string[] {
  const out: string[] = [];
  const d = act.drug;
  if (id.dose && a.kind === 'drug') {
    const x = doseIn(a, id.dose.unit, w);
    if (x === undefined) out.push(`dose in ${a.unit ?? 'no unit'}, ${id.dose.unit} asked`);
    else if (!inAmount(x, id.dose)) out.push(`dose ${n2(x)} ${id.dose.unit}, ${asked(id.dose)} asked`);
  }
  const route = a.route ?? 'iv';
  if (act.kind === 'drug' && d?.route?.preferred && route !== d.route.preferred) out.push(`route ${route}, ${d.route.preferred} preferred`);
  const rate = d?.rate;
  if (rate && 'infusion' in rate) {
    if (a.rateUnit !== rate.infusion.unit) out.push(`rate in ${a.rateUnit ?? 'no unit'}, ${rate.infusion.unit} asked`);
    else if (!inAmount(a.rate ?? NaN, rate.infusion)) out.push(`rate ${n2(a.rate ?? NaN)} ${a.rateUnit}, ${asked(rate.infusion)} asked`);
  } else if (rate && 'overS' in rate) {
    if (!inAmount(a.overS ?? 0, rate.overS)) out.push(`over ${n2(a.overS ?? 0)} s, ${asked(rate.overS)} s asked`);
  } else if (rate && 'bolus' in rate) {
    if ((a.overS ?? 0) > 0) out.push(`over ${n2(a.overS ?? 0)} s, bolus asked`);
  }
  for (const [k, amt] of Object.entries(id.settings ?? {})) {
    let v = a.settings?.[k];
    if (k === 'vtMlPerKg' && v === undefined && typeof a.settings?.vtMl === 'number' && w) v = a.settings.vtMl / w;
    if (typeof amt === 'string') {
      if (v !== amt) out.push(`${k} ${v ?? 'not set'}, ${amt} asked`);
    } else if (typeof v !== 'number') out.push(`${k} not set, ${asked(amt)} asked`);
    else if (!inAmount(v, amt)) out.push(`${k} ${n2(v)}, ${asked(amt)} asked`);
  }
  if (act.kind === 'fluid' && a.fluid) {
    if (act.fluid?.volumeMl && !inAmount(a.fluid.volumeMl, act.fluid.volumeMl)) out.push(`volume ${n2(a.fluid.volumeMl)} mL, ${asked(act.fluid.volumeMl)} asked`);
    if (act.fluid?.rateMlMin && !inAmount(a.fluid.rateMlMin, act.fluid.rateMlMin)) out.push(`rate ${n2(a.fluid.rateMlMin)} mL/min, ${asked(act.fluid.rateMlMin)} asked`);
  }
  return out;
}

/** A row while it is graded: its deviations kept apart, for the live "deviation: <first>". */
interface Row { grade: Grade; lines: string[]; devs: string[]; dueT?: number; windowS?: number; givenT?: number }

/**
 * Grade the run at sim time `t`: every graded action, the outcomes, the violations and the judged rows' clocks. `final`
 * (the debrief): an open action is failed rather than due or overdue, an outcome not reached rather than pending.
 */
export function grade(doc: ScenarioDocV2, phases: readonly PhaseEntry[], admin: readonly Administration[], edges: readonly RuleEdge[], t: number, opts: { final?: boolean } = {}): Grades {
  const final = opts.final ?? false;
  const w = doc.patient?.weightKg;
  const byId = new Map(doc.actions.map((a) => [a.id, a]));
  const done = new Map<string, { row: ActionGrade; given?: Administration }>();
  const busy = new Set<string>();
  const team = admin.filter((a) => !a.cardSet);

  const anchorT = (an: Anchor, rule: string): number | undefined => {
    if (an === 'start') return 0;
    if (an === 'pulseLoss' || an === 'rosc') return firstTrue(edges, an);
    if (typeof an !== 'string') return firstTrue(edges, rule);
    if (an.startsWith('phase:')) return phases.find((p) => p.id === an.slice(6))?.t;
    return gradeOf(an.slice(7))?.given?.t;
  };
  const anchorWords = (an: Anchor): string =>
    typeof an !== 'string' ? `${ruleWords(an.rule)} never held` : an.startsWith('phase:') ? `phase ${an.slice(6)} never entered` : an.startsWith('action:') ? `action ${an.slice(7)} never given` : `${an} never happened`;

  function gradeOf(id: string): { row: ActionGrade; given?: Administration } | undefined {
    const act = byId.get(id);
    if (!act || busy.has(id)) return undefined; // an anchor cycle: never happened
    const memo = done.get(id);
    if (memo) return memo;
    busy.add(id);
    const out = gradeAction(act);
    busy.delete(id);
    done.set(id, out);
    return out;
  }

  function gradeAction(act: Action): { row: ActionGrade; given?: Administration } {
    const matched = team.flatMap((a) => {
      const id = identity(act, a);
      return id ? [{ a, id }] : [];
    });
    const sat = matched.filter((m) => blockers(act, m.a).length === 0);
    const settled = act.kind === 'device' || act.kind === 'decision';
    /** The administration graded among `ms`: the first; for a device or a decision the first with its settings in range. */
    const pick = (ms: typeof sat) => (settled ? (ms.find((m) => deviations(act, m.a, m.id, w).length === 0) ?? ms[0]) : ms[0]);
    const blocked = [...new Set(matched.flatMap((m) => blockers(act, m.a)))];
    const opening = phases.find((p) => act.phases.includes(p.id))?.t;
    const pre = act.precondition ? `action:${act.id}:precondition` : undefined;
    const open = (deadline?: number): Grade => (final ? 'failed' : deadline === undefined || t <= deadline + EPS ? 'due' : 'overdue');
    const na = (line: string): Row => ({ grade: 'not applicable', lines: [line], devs: [] });
    let row: Row;
    let given: (typeof sat)[number] | undefined;

    if (pre && firstTrue(edges, pre) === undefined) row = na(`precondition never held: ${ruleWords(act.precondition as PhaseRule)}`);
    else if (act.window) {
      const { anchor, withinS, notBeforeS } = act.window;
      const at = anchorT(anchor, `action:${act.id}:anchor`);
      given = pick(sat);
      if (at === undefined) {
        row = na(`anchor never happened: ${anchorWords(anchor)}`);
        if (given) row.lines.push(`given ${clock(given.a.t)} without its anchor`);
        given = undefined;
      } else {
        const deadline = at + withinS;
        row = { grade: open(deadline), lines: [], devs: [], dueT: at, windowS: withinS };
        if (given) {
          const g = given.a.t;
          row.givenT = g;
          row.grade = g <= deadline + EPS ? 'met' : 'overdue';
          if (g < at - EPS) row.lines.push('given before the window opened');
          row.devs = deviations(act, given.a, given.id, w);
          if (notBeforeS && g >= at - EPS && g < at + notBeforeS - EPS) row.devs.push(`given ${n2(g - at)} s after the anchor, not before ${notBeforeS} s`);
        }
      }
    } else if (opening === undefined) row = na('none of its phases occurred');
    else {
      const from = sat.filter((m) => m.a.t >= opening - EPS);
      given = pre ? (pick(from.filter((m) => heldAt(edges, pre, m.a.t))) ?? pick(from)) : pick(from);
      row = { grade: open(), lines: [], devs: [] };
      if (given) {
        row.givenT = given.a.t;
        row.grade = 'met';
        row.devs = deviations(act, given.a, given.id, w);
        if (pre && !heldAt(edges, pre, given.a.t)) row.devs.unshift(`given before: ${ruleWords(act.precondition as PhaseRule)}`);
      }
    }

    const cum = act.drug?.cumulative;
    if (given && cum?.max !== undefined) {
      const sum = sat.reduce((s, m) => s + (doseIn(m.a, cum.unit, w) ?? 0), 0);
      if (sum > cum.max + EPS) row.devs.push(`cumulative ${n2(sum)} ${cum.unit}, ≤ ${n2(cum.max)} asked`);
    }
    if (row.grade === 'met' && row.devs.length) row.grade = 'deviation';

    const repeats: Array<Row & { n: number }> = [];
    const rw = act.repeatWhile;
    if (given && rw) {
      const name = `action:${act.id}:repeatWhile`;
      const span = (rw.intervalS.max ?? rw.intervalS.min ?? 0) - (rw.intervalS.min ?? 0);
      let prev = given.a.t;
      for (let n = 2; ; n++) {
        const ct = firstTrue(edges, name, prev); // a RISE at or after the previous dose (the orchestrator's spec, Q13)
        if (ct === undefined) break;
        const due = Math.max(prev + (rw.intervalS.min ?? 0), ct);
        const next = sat.find((m) => m.a.t > prev + EPS);
        const r: Row & { n: number } = { n, grade: open(due + span), lines: [], devs: [], dueT: due, windowS: span };
        repeats.push(r);
        if (!next) break;
        r.givenT = next.a.t;
        r.grade = next.a.t <= due + span + EPS ? 'met' : 'overdue';
        if (next.a.t < due - EPS) r.lines.push('given before due');
        r.devs = deviations(act, next.a, next.id, w);
        if (r.grade === 'met' && r.devs.length) r.grade = 'deviation';
        prev = next.a.t;
      }
    }

    const worst = [row, ...repeats].reduce((b, r) => (RANK[r.grade] > RANK[b.grade] ? r : b), row);
    const deadline = worst.dueT !== undefined ? worst.dueT + (worst.windowS ?? 0) : undefined;
    const live =
      worst.grade === 'due' ? (deadline === undefined ? 'due' : `due ${dur(deadline - t)}`)
      : worst.grade === 'overdue' ? `overdue ${dur((worst.givenT ?? t) - (deadline ?? t))}`
      : worst.grade === 'met' ? `met ${clock(worst.givenT ?? t)}`
      : worst.grade === 'deviation' ? `deviation: ${worst.devs[0] ?? ''}`
      : worst.grade;
    const opt = (r: Row) => ({ ...(r.dueT !== undefined ? { dueT: r.dueT } : {}), ...(r.windowS !== undefined ? { windowS: r.windowS } : {}), ...(r.givenT !== undefined ? { givenT: r.givenT } : {}) });
    return {
      row: {
        id: act.id, label: act.label, grade: worst.grade, firstGrade: row.grade, lines: [...row.lines, ...row.devs, ...blocked], ...opt(row),
        repeats: repeats.map((r) => ({ n: r.n, grade: r.grade, ...(r.dueT !== undefined ? { dueT: r.dueT } : {}), ...(r.givenT !== undefined ? { t: r.givenT } : {}), lines: [...r.lines, ...r.devs] })),
        live, admin: matched.map((m) => m.a.seq),
      },
      ...(given ? { given: given.a } : {}),
    };
  }

  const actions = doc.actions.filter((a) => a.graded !== false).map((a) => (gradeOf(a.id) as { row: ActionGrade }).row);

  const phaseAt = (at: number) => phases.filter((p) => p.t <= at + EPS).at(-1)?.id;
  const violations: Violation[] = [];
  for (const act of doc.actions) {
    act.contraindications?.forEach((c, i) => {
      for (const a of team) {
        const f = c.match;
        if ((f.kind && a.kind !== f.kind) || (f.drugId && a.drugId !== f.drugId) || (f.cls && a.cls !== f.cls)) continue;
        if (f.route && !(a.route && f.route.includes(a.route))) continue;
        if (f.dose) {
          const x = doseIn(a, f.dose.unit, w);
          if (x === undefined || !inAmount(x, f.dose)) continue;
        }
        if (c.inPhases && !c.inPhases.includes(phaseAt(a.t) ?? '')) continue;
        if (c.afterAction) {
          const g = gradeOf(c.afterAction)?.given;
          if (!g || a.t < g.t - EPS) continue;
        }
        if (c.when && !heldAt(edges, `action:${act.id}:contraindication:${i}`, a.t)) continue;
        violations.push({ t: a.t, seq: a.seq, action: act.id, text: c.text, harm: c.harm === 'notModelled' ? 'not modelled' : 'modelled' });
      }
    });
  }
  violations.sort((x, y) => x.t - y.t || x.seq - y.seq);

  const outcomes: OutcomeGrade[] = (doc.outcomes ?? []).map((o) => {
    const base = { id: o.id, text: o.text };
    const at = anchorT(o.anchor, `outcome:${o.id}:anchor`);
    if (at === undefined) return { ...base, grade: final ? 'not reached' : 'pending' };
    const end = at + o.withinS;
    const rt = trueFrom(edges, `outcome:${o.id}`, at); // holding at the anchor counts: the rule need not rise inside the window
    if (rt !== undefined && rt <= end + EPS) return { ...base, grade: 'reached', t: rt };
    return { ...base, grade: !final && t < end - EPS ? 'pending' : 'not reached' };
  });

  const judged: JudgedRow[] = (doc.judged ?? []).map((j) => {
    const fromT = firstTrue(edges, `judged:${j.id}`);
    return { id: j.id, text: j.text, kind: j.kind, ...(fromT !== undefined ? { fromT } : {}) };
  });

  return { actions, outcomes, violations, judged };
}
