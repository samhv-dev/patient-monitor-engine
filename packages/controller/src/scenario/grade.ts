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
// - Decision D3 (review B2): a rule anchor, `pulseLoss` and `rosc` open the window at their first true edge AFTER the
//   action's opening (or at the opening when the rule holds across it): a rule that held before any of the action's
//   phases (the EtCO₂ of a premedicated patient on room air, before the induction) opens nothing. A device or a decision
//   is credited only with a record made once its own window opened (the call's 20 × 600 is not the second dose's). A
//   precondition ("given before X") is met when X held at any time from the opening to the press, so the line's words
//   are true.
// - Precedence failed > overdue > due > deviation > met; a late, wrongly sized dose is overdue with the deviation line
//   under it; repeats are graded each and the action takes the worst. `graded: false` and `preparation` actions are
//   left out (a preparation step is recorded with its time, no verdict: the owner's ruling of 5 November).
// - `window.failAfterS` (owner, 5 November: CPR within 30 s of the pulse loss met, 30 s to 2 min overdue, after 2 min
//   failed though started): an administration later than anchor + failAfterS is failed, with its time as a line; with
//   none, the row is failed live from that moment (not "overdue").
// - `repeat` (unconditional; owner, 5 November: "a repeat's window runs from the previous dose as given"): each next
//   matching administration given while one of the action's phases holds is due from the previous one + intervalS min
//   to + max (min/max, or value ± tolerance): sooner is a deviation ("interval 178 s, 180–300 s asked"), later overdue,
//   none failed at the end; no repeat is due once the action's phases have ended before its deadline (the arrest ended
//   in ROSC before the next epinephrine was due). `maxCount` caps the rows.
// - Conditional repeats, `repeatWhile` (Q13: due from the later of the previous dose + intervalS.min and the condition's
//   first true EDGE at or after the previous dose, within intervalS.max − min; a condition already true at the dose that
//   never falls and rises again makes no repeat row). NOT graded yet: `order`, `cumulative.min` and `cumulative.windowS` (the ceiling is summed over the whole run), and a decision with
//   several effects is graded on the first effect of the record's kind.
// - Plan learner-action-remote.md §6 (L5): a card's `drug.diluent` is one more criterion (a deviation line); a sample
//   action with `sample` takes a `sample` record of a listed panel, a learner's or the instructor's, as a drug action
//   takes a drug record; the formulary grades every preparation, independent of any card (LQ14): staged with a diluent
//   the stocked product's label does not list, or as an admixture the source calls incompatible, it is a deviation
//   (`preparations`); delivered (any volume, an accepted give), a violation of source 'formulary', its harm 'modelled'
//   when the source's figures reduced the active amount (`remaining` < 1), else 'not modelled'. A card that uses none of
//   it, in a run that staged nothing, grades exactly as before: no `preparations` key, no violation `source`.
import type { Finding } from '../formulary/findings.ts';
import type { Action, Administration, Amount, AnyRule, Dose, PhaseEntry, PhaseRule, RuleEdge, ScenarioDocV2, Settings, StagedPrep, WindowAnchor } from './types-v2.ts';

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
/** A violation: a card's contraindication (`action` its action's id), or, `source: 'formulary'`, a delivered preparation
 *  the formulary finds wrong (`action` = `prep:<id>`), or, `source: 'pump'` (pump-rack-tci.md §8), a pump channel that
 *  delivered while its contents and programme differed (`action` = `pump:<channel>`). Absent `source`: the card's. */
export interface Violation { t: number; seq: number; action: string; text: string; harm: 'modelled' | 'not modelled'; source?: 'card' | 'formulary' | 'pump' }
/** A preparation as the formulary grades it (§6): `deviation` staged wrong, `violation` delivered wrong, else `ok`. */
export interface PrepGrade { prepId: string; t: number; by: string; drugId: string; findings: Finding[]; delivered: boolean; grade: 'ok' | 'deviation' | 'violation' }
/** The grades of a run: the actions (a team act the instructor observes is a record action among them: judged rows are
 *  retired, the owner's ruling of 5 November), the outcomes and the violations; the preparations when the run made any. */
export interface Grades { actions: ActionGrade[]; outcomes: OutcomeGrade[]; violations: Violation[]; preparations?: PrepGrade[] }

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

/** A rule in words ("k > 5.5", "etco2 > 45 for 20 s"). A `phaseEntered` leaf is its phase's label up to the first colon,
 *  lower-cased as a word ("Early signs" → "early signs", the /1 card's recognition start), given the card's phases; the
 *  phase id without them. */
export function ruleWords(r: AnyRule, phases?: ReadonlyArray<{ id: string; label: string }>): string {
  if ('phaseEntered' in r) {
    const head = (phases?.find((p) => p.id === r.phaseEntered)?.label ?? r.phaseEntered).split(':')[0] as string;
    return /^.[a-z]/.test(head) ? head.charAt(0).toLowerCase() + head.slice(1) : head;
  }
  if ('value' in r) return `${r.value.var} ${r.value.op} ${r.value.value}${r.value.forS ? ` for ${r.value.forS} s` : ''}`;
  if ('slope' in r) return `${r.slope.var} slope ${r.slope.op} ${r.slope.perMin}/min over ${r.slope.overS} s`;
  if ('unchanged' in r) return `${r.unchanged.var} unchanged within ${r.unchanged.withinPct} %${r.unchanged.since ? ' since the phase start' : ` over ${r.unchanged.overS} s`}`;
  if ('visited' in r) return `${r.visited} visited`;
  if ('signal' in r) return r.signal;
  if ('all' in r) return r.all.map((x) => ruleWords(x, phases)).join(' and ');
  if ('any' in r) return r.any.map((x) => ruleWords(x, phases)).join(' or ');
  return `not (${ruleWords(r.not, phases)})`;
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
    case 'sample':
      if (a.actionId === act.id) return {};
      return act.sample && a.kind === 'sample' && act.sample.panel.includes(String(a.settings?.panel)) ? {} : null;
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
  const dil = d?.diluent?.set;
  if (act.kind === 'drug' && dil) {
    const want = dil.join(' or ');
    if (!a.prep) out.push(`diluent not recorded, ${want} asked`);
    else if (a.prep.diluent === undefined) out.push(`no diluent, ${want} asked`);
    else if (!dil.includes(a.prep.diluent)) out.push(`diluent ${a.prep.diluent}, ${want} asked`);
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

/** The findings the formulary grades (D5, LQ11): a diluent the label does not list, and what the source calls incompatible.
 *  `conditional` and `notTested` are reported with the preparation, not graded. */
const graded = (f: Finding) => f.kind === 'wrongDiluent' || f.kind === 'incompatible';
/** A graded finding in words. */
function findingWords(f: Finding): string {
  const said = f.statement ? `: ${f.statement}` : '';
  if (f.kind === 'wrongDiluent') return `${f.drugId} prepared in ${f.other}, a diluent its label does not list`;
  return f.against === 'diluent' ? `${f.drugId} incompatible with the diluent ${f.other}${said}` : `${f.drugId} incompatible with ${f.other} in the preparation${said}`;
}

/** A row while it is graded: its deviations kept apart, for the live "deviation: <first>". */
interface Row { grade: Grade; lines: string[]; devs: string[]; dueT?: number; windowS?: number; givenT?: number }

/**
 * Grade the run at sim time `t`: every graded action, the outcomes and the violations. `final`
 * (the debrief): an open action is failed rather than due or overdue, an outcome not reached rather than pending.
 */
export function grade(
  doc: ScenarioDocV2, phases: readonly PhaseEntry[], admin: readonly Administration[], edges: readonly RuleEdge[], t: number,
  opts: { final?: boolean; preparations?: readonly StagedPrep[] } = {},
): Grades {
  const final = opts.final ?? false;
  const w = doc.patient?.weightKg;
  const byId = new Map(doc.actions.map((a) => [a.id, a]));
  const done = new Map<string, { row: ActionGrade; given?: Administration }>();
  const busy = new Set<string>();
  const team = admin.filter((a) => !a.cardSet);
  const phaseAt = (at: number) => phases.filter((p) => p.t <= at + EPS).at(-1)?.id;

  /** When the anchor opens the window; a rule (and pulseLoss, rosc) from `from` on (D3: the action's opening). */
  const anchorT = (an: WindowAnchor, rule: string, from = -Infinity): number | undefined => {
    if (an === 'start') return 0;
    if (typeof an !== 'string' && 'first' in an) {
      // the earliest of several (F9): each member from `from` on, its rule member named `<rule>:<i>`
      const ts = an.first.map((x, i) => anchorT(x, `${rule}:${i}`, from)).filter((x): x is number => x !== undefined);
      return ts.length ? Math.min(...ts) : undefined;
    }
    if (an === 'pulseLoss' || an === 'rosc') return trueFrom(edges, an, from);
    if (typeof an !== 'string') return trueFrom(edges, rule, from);
    if (an.startsWith('phase:')) return phases.find((p) => p.id === an.slice(6))?.t;
    return gradeOf(an.slice(7))?.given?.t;
  };
  const anchorWords = (an: WindowAnchor): string =>
    typeof an !== 'string' ? ('first' in an ? `none of ${an.first.length} anchors happened` : `${ruleWords('display' in an ? an.display : an.rule)} never held`)
    : an.startsWith('each:action:') ? `action ${an.slice(12)} never taken` : an.startsWith('phase:') ? `phase ${an.slice(6)} never entered` : an.startsWith('action:') ? `action ${an.slice(7)} never given` : `${an} never happened`;

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
    /** D3: the precondition held at some time from the opening up to `at` (a press). */
    const preBy = (at: number) => !pre || (trueFrom(edges, pre, opening ?? -Infinity) ?? Infinity) <= at + EPS;
    const open = (deadline?: number): Grade => (final ? 'failed' : deadline === undefined || t <= deadline + EPS ? 'due' : 'overdue');
    const na = (line: string): Row => ({ grade: 'not applicable', lines: [line], devs: [] });
    let row: Row;
    let given: (typeof sat)[number] | undefined;

    const repeats: Array<Row & { n: number }> = [];
    const inPhases = (x: number) => act.phases.includes(phaseAt(x) ?? '');
    /** When the action's phases were left after `x` (Infinity: never, so far). */
    const leftAfter = (x: number) => phases.find((p) => p.t > x + EPS && !act.phases.includes(p.id))?.t ?? Infinity;
    const eachOf = typeof act.window?.anchor === 'string' && act.window.anchor.startsWith('each:action:') ? act.window.anchor.slice(12) : undefined;

    if (pre && trueFrom(edges, pre, opening ?? -Infinity) === undefined) row = na(`precondition never held: ${ruleWords(act.precondition as PhaseRule)}`);
    else if (act.window && eachOf !== undefined) {
      // F9: one window per taking of `eachOf` (resume CPR within 10 s of each rhythm check), while one of this action's
      // phases holds at the taking; each window takes the first satisfying record from its taking to the next taking. A
      // window whose phases end before its deadline with no record is not due (the check found a pulse). The first
      // window is the row, the later ones its repeats (n = 2, 3, …).
      const { withinS } = act.window;
      const takes = [...new Set(team.filter((a) => a.actionId === eachOf).map((a) => a.t))].sort((x, y) => x - y).filter((x) => inPhases(x));
      const rows: Row[] = [];
      takes.forEach((T, i) => {
        const end = T + withinS;
        const next = takes[i + 1] ?? Infinity;
        const m = sat.find((x) => x.a.t >= T - EPS && x.a.t < next - EPS);
        if (!m) {
          if (leftAfter(T) <= Math.min(end, final ? Infinity : t) + EPS) return;
          rows.push({ grade: open(end), lines: [], devs: [], dueT: T, windowS: withinS });
          return;
        }
        const r: Row = { grade: m.a.t <= end + EPS ? 'met' : 'overdue', lines: [], devs: deviations(act, m.a, m.id, w), dueT: T, windowS: withinS, givenT: m.a.t };
        if (r.grade === 'overdue') r.lines.push(`given ${n2(m.a.t - T)} s after the taking of ${eachOf}`);
        if (r.grade === 'met' && r.devs.length) r.grade = 'deviation';
        rows.push(r);
        given ??= m;
      });
      if (!rows.length) row = na(takes.length ? `no window due: the phases ended after each taking of ${eachOf}` : `anchor never happened: ${anchorWords(act.window.anchor)}`);
      else {
        row = rows[0] as Row;
        rows.slice(1).forEach((r, k) => repeats.push({ ...r, n: k + 2 }));
      }
    } else if (act.window) {
      const { anchor, withinS, notBeforeS, failAfterS } = act.window;
      // a rule-like anchor of an action none of whose phases occurred never opens its window (D3)
      const ruleLike = typeof anchor !== 'string' || anchor === 'pulseLoss' || anchor === 'rosc';
      const at = ruleLike && opening === undefined ? undefined : anchorT(anchor, `action:${act.id}:anchor`, opening);
      // D3: a device or a decision takes only the records made once its window opened
      given = pick(settled && at !== undefined ? sat.filter((m) => m.a.t >= at - EPS) : sat);
      if (at === undefined) {
        row = na(`anchor never happened: ${anchorWords(anchor)}`);
        // a dose given anyway is worth the line; a device or a decision set for another reason is not (D3: it is never
        // this action's without its window)
        if (given && !settled) row.lines.push(`given ${clock(given.a.t)} without its anchor`);
        given = undefined;
      } else {
        const deadline = at + withinS;
        const failT = failAfterS !== undefined ? at + failAfterS : undefined;
        row = { grade: !final && failT !== undefined && t > failT + EPS ? 'failed' : open(deadline), lines: [], devs: [], dueT: at, windowS: withinS };
        if (given) {
          const g = given.a.t;
          row.givenT = g;
          row.grade = g <= deadline + EPS ? 'met' : failT !== undefined && g > failT + EPS ? 'failed' : 'overdue';
          if (row.grade === 'failed') row.lines.push(`given ${dur(g - at)} after the anchor, failed after ${dur(failAfterS as number)}`);
          if (g < at - EPS) row.lines.push('given before the window opened');
          row.devs = deviations(act, given.a, given.id, w);
          if (notBeforeS && g >= at - EPS && g < at + notBeforeS - EPS) row.devs.push(`given ${n2(g - at)} s after the anchor, not before ${notBeforeS} s`);
        }
      }
    } else if (opening === undefined) row = na('none of its phases occurred');
    else {
      const from = sat.filter((m) => m.a.t >= opening - EPS);
      given = pre ? (pick(from.filter((m) => preBy(m.a.t))) ?? pick(from)) : pick(from);
      row = { grade: open(), lines: [], devs: [] };
      if (given) {
        row.givenT = given.a.t;
        row.grade = 'met';
        row.devs = deviations(act, given.a, given.id, w);
        if (!preBy(given.a.t)) row.devs.unshift(`given before: ${ruleWords(act.precondition as PhaseRule)}`);
      }
    }

    const cum = act.drug?.cumulative;
    if (given && cum?.max !== undefined) {
      const sum = sat.reduce((s, m) => s + (doseIn(m.a, cum.unit, w) ?? 0), 0);
      if (sum > cum.max + EPS) row.devs.push(`cumulative ${n2(sum)} ${cum.unit}, ≤ ${n2(cum.max)} asked`);
    }
    if (row.grade === 'met' && row.devs.length) row.grade = 'deviation';

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

    const rp = act.repeat;
    if (given && rp) {
      const lo = rp.intervalS.min ?? (rp.intervalS.value ?? 0) - (rp.intervalS.tolerance ?? 0);
      const hi = rp.intervalS.max ?? (rp.intervalS.value !== undefined ? rp.intervalS.value + (rp.intervalS.tolerance ?? 0) : Infinity);
      const t0 = given.a.t;
      const doses = sat.filter((m) => m.a.t > t0 + EPS && inPhases(m.a.t));
      let prev = t0;
      for (let n = 2; rp.maxCount === undefined || n <= rp.maxCount; n++) {
        const due = prev + lo;
        const end = prev + hi;
        const next = doses.find((m) => m.a.t > prev + EPS);
        if (!next) {
          // none given: due only while the action's phases hold through to the window's end (or to now, live)
          if (leftAfter(prev) <= Math.min(end, final ? Infinity : t) + EPS || (final && t < due - EPS)) break;
          repeats.push({ n, grade: open(end), lines: [], devs: [], dueT: due, windowS: hi - lo });
          break;
        }
        const g = next.a.t;
        const r: Row & { n: number } = { n, grade: g <= end + EPS ? 'met' : 'overdue', lines: [], devs: [], dueT: due, windowS: hi - lo, givenT: g };
        const iv = rp.intervalS.value !== undefined && rp.intervalS.tolerance ? `${n2(rp.intervalS.value)} ± ${n2(rp.intervalS.tolerance)}` : asked(rp.intervalS);
        if (g < due - EPS) r.devs.push(`interval ${n2(g - prev)} s, ${iv} s asked`);
        else if (g > end + EPS) r.lines.push(`interval ${n2(g - prev)} s, ${iv} s asked`);
        r.devs.push(...deviations(act, next.a, next.id, w));
        if (r.grade === 'met' && r.devs.length) r.grade = 'deviation';
        repeats.push(r);
        prev = g;
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

  const actions = doc.actions.filter((a) => a.graded !== false && !a.preparation).map((a) => (gradeOf(a.id) as { row: ActionGrade }).row);

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
  // §6: the formulary's violations, one per accepted give from a preparation with a graded finding
  const gives = team.filter((a) => a.prep && a.result.accepted);
  for (const a of gives) {
    const bad = a.prep!.findings.filter(graded);
    if (bad.length) violations.push({ t: a.t, seq: a.seq, action: `prep:${a.prep!.id}`, text: bad.map(findingWords).join('; '), harm: a.prep!.remaining < 1 - EPS ? 'modelled' : 'not modelled', source: 'formulary' });
  }
  // §8 "Grading": a mismatched channel that delivered, one violation per accepted act that gave its contents; the harm is
  // modelled (the engine delivered the true contents, D4)
  for (const a of team) {
    if (!a.mismatch || !a.result.accepted || (a.kind === 'infusion' && !((a.rate ?? 0) > 0))) continue;
    violations.push({ t: a.t, seq: a.seq, action: `pump:${a.channel ?? 0}`, text: `channel ${a.channel ?? 0}: ${a.mismatch.contents} programmed as ${a.mismatch.programmed}`, harm: 'modelled', source: 'pump' });
  }
  violations.sort((x, y) => x.t - y.t || x.seq - y.seq);

  // §6: every preparation, staged (the runner's state) or seen only at its give, graded by its findings
  const rows = new Map<string, PrepGrade>();
  const key = (by: string, id: string) => `${by}\u0000${id}`;
  for (const p of opts.preparations ?? []) rows.set(key(p.by, p.id), { prepId: p.id, t: p.t, by: p.by, drugId: p.drugId, findings: p.findings, delivered: false, grade: 'ok' });
  for (const a of gives) {
    const by = a.by ?? a.source;
    const k = key(by, a.prep!.id);
    const r = rows.get(k) ?? { prepId: a.prep!.id, t: a.t, by, drugId: a.prep!.drugId, findings: a.prep!.findings, delivered: false, grade: 'ok' as const };
    r.delivered = true;
    rows.set(k, r);
  }
  const preparations = [...rows.values()].map((r): PrepGrade => ({ ...r, grade: !r.findings.some(graded) ? 'ok' : r.delivered ? 'violation' : 'deviation' }));

  const outcomes: OutcomeGrade[] = (doc.outcomes ?? []).map((o) => {
    const base = { id: o.id, text: o.text };
    const at = anchorT(o.anchor, `outcome:${o.id}:anchor`);
    if (at === undefined) return { ...base, grade: final ? 'not reached' : 'pending' };
    const end = at + o.withinS;
    const rt = trueFrom(edges, `outcome:${o.id}`, at); // holding at the anchor counts: the rule need not rise inside the window
    if (rt !== undefined && rt <= end + EPS) return { ...base, grade: 'reached', t: rt };
    return { ...base, grade: !final && t < end - EPS ? 'pending' : 'not reached' };
  });

  return { actions, outcomes, violations, ...(preparations.length ? { preparations } : {}) };
}
