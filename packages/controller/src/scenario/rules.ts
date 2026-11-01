// The leaves of a pme-scenario/2 rule (docs/plans/scenario-format-v2.md §4; plan F2). Pure functions over what the phase
// runner keeps: two value stores (truth, rank 3, for every phase, outcome and anchor rule; displayed numerics, rank 2,
// for a judged row's clock only, Q22), the hold counters of `forS`, the 1 Hz slope rings, the rhythm id and the pulse.
// - value: `var op value`, held for `forS` (a counter of sim seconds, reset when the leaf is false, as /1's vital leaf).
// - slope: the least-squares slope (per minute) of the variable's 1 Hz samples over the last `overS` seconds; false
//   until the ring spans the whole window.
// - unchanged: every sample of the last `overS` seconds within ± `withinPct` % of the newest; false until the ring
//   spans the window. A missing value (F4's set minute ventilation is null without a ventilator) empties the ring.
//   With `since: 'phaseStart'` (the owner's "unchanged set ventilation", 31 October): the value within ± `withinPct` % of
//   its value at the current phase's entry.
// - visited: the phase is in the timeline. signal: `pulseLoss` (no pulse), `rosc` (a pulse after a loss), `rhythm:<id>`
//   (the rhythm id the engine draws: VF is told from VT and asystole from PEA by the id, never by RHYTHMS[id].group).
// - phaseRule (a judged row's display rule only): the named phase's entry rule, evaluated as the phase evaluates it (its
//   key `phase:<id>`, truth): true exactly when `phase:<id>` is, so a recognition clock is the phase's rule, written once.
import { compare } from './runner.ts';
import type { AnyRule, PhaseRule, ScenarioDocV2 } from './types-v2.ts';

/** Comparison slack for clocks and windows (sim seconds), as the /1 runner's [ENG]. */
export const EPS = 1e-6;

/** A rule of the card by the name its edges are logged under, and the store it reads. */
export interface NamedRule {
  name: string;
  rule: AnyRule;
  rank: 2 | 3;
}

/**
 * Every rule named anywhere in the card (Q17), in a fixed order: phase entry rules `phase:<id>`; per action its rule
 * anchor `action:<id>:anchor`, `action:<id>:precondition`, `action:<id>:repeatWhile`, `action:<id>:contraindication:<i>`;
 * `outcome:<id>` and its rule anchor `outcome:<id>:anchor`; a judged row's display rule `judged:<id>` (rank 2); and the
 * two anchors every card may name, `pulseLoss` and `rosc`.
 */
export function namedRules(doc: ScenarioDocV2): NamedRule[] {
  const out: NamedRule[] = [];
  const add = (name: string, rule: AnyRule | undefined, rank: 2 | 3 = 3) => {
    if (rule) out.push({ name, rule, rank });
  };
  for (const p of doc.phases) add(`phase:${p.id}`, p.enter);
  for (const a of doc.actions) {
    if (a.window && typeof a.window.anchor !== 'string') add(`action:${a.id}:anchor`, a.window.anchor.rule);
    add(`action:${a.id}:precondition`, a.precondition);
    add(`action:${a.id}:repeatWhile`, a.repeatWhile?.rule);
    a.contraindications?.forEach((c, i) => add(`action:${a.id}:contraindication:${i}`, c.when));
  }
  for (const o of doc.outcomes ?? []) {
    add(`outcome:${o.id}`, o.rule);
    if (typeof o.anchor !== 'string') add(`outcome:${o.id}:anchor`, o.anchor.rule);
  }
  for (const j of doc.judged ?? []) add(`judged:${j.id}`, j.display, 2);
  add('pulseLoss', { signal: 'pulseLoss' });
  add('rosc', { signal: 'rosc' });
  return out;
}

/** Visit every leaf with its key: `<key>`, then `.i` per all/any member and `.0` under a not. */
export function walkLeaves(r: AnyRule, key: string, fn: (leaf: AnyRule, key: string) => void): void {
  if ('all' in r) r.all.forEach((c, i) => walkLeaves(c, `${key}.${i}`, fn));
  else if ('any' in r) r.any.forEach((c, i) => walkLeaves(c, `${key}.${i}`, fn));
  else if ('not' in r) walkLeaves(r.not, `${key}.0`, fn);
  else fn(r, key);
}

/** What a rule reads. */
export interface RuleCtx {
  value(name: string, rank: 2 | 3): number | undefined;
  /** Seconds a value leaf has held, by its key. */
  held(key: string): number;
  /** The variable's 1 Hz samples, oldest first. */
  ring(name: string): ReadonlyArray<readonly [number, number]>;
  visited(phaseId: string): boolean;
  /** A `since: 'phaseStart'` variable's value at the current phase's entry. */
  phaseRef(name: string): number | undefined;
  /** A phase's entry rule (a `phaseRule` leaf reads it). */
  enter(phaseId: string): PhaseRule | undefined;
  rhythm: string | null;
  pulse: boolean | null;
  pulseLost: boolean;
}

/** The samples of the last `overS` seconds (up to the newest sample), and how much of the window the ring spans. */
export function windowOf(ring: ReadonlyArray<readonly [number, number]>, overS: number): { full: boolean; coveredS: number; samples: ReadonlyArray<readonly [number, number]> } {
  const last = ring.at(-1);
  if (!last) return { full: false, coveredS: 0, samples: [] };
  const from = last[0] - overS;
  const first = ring[0] as readonly [number, number];
  return { full: first[0] <= from + EPS, coveredS: Math.min(overS, last[0] - first[0]), samples: ring.filter(([t]) => t >= from - EPS) };
}

/** Least-squares slope of the samples, per minute (undefined below two samples). */
export function slopePerMin(samples: ReadonlyArray<readonly [number, number]>): number | undefined {
  const n = samples.length;
  if (n < 2) return undefined;
  let mt = 0;
  let mv = 0;
  for (const [t, v] of samples) {
    mt += t / n;
    mv += v / n;
  }
  let num = 0;
  let den = 0;
  for (const [t, v] of samples) {
    num += (t - mt) * (v - mv);
    den += (t - mt) ** 2;
  }
  return den > 0 ? (num / den) * 60 : undefined;
}

/** The largest distance of a sample from the newest, in % of the newest (undefined without samples). */
export function spreadPct(samples: ReadonlyArray<readonly [number, number]>): number | undefined {
  const ref = samples.at(-1)?.[1];
  if (ref === undefined) return undefined;
  let worst = 0;
  for (const [, v] of samples) worst = Math.max(worst, Math.abs(v - ref));
  return ref === 0 ? (worst === 0 ? 0 : Infinity) : (worst / Math.abs(ref)) * 100;
}

/** Does the rule hold now? `rank` is the store its value leaves read (3 truth, 2 displayed). */
export function holds(r: AnyRule, key: string, rank: 2 | 3, c: RuleCtx): boolean {
  if ('value' in r) {
    const { var: name, op, value, forS = 0 } = r.value;
    const v = c.value(name, rank);
    return v !== undefined && compare(v, op, value) && (forS <= 0 || c.held(key) >= forS - EPS);
  }
  if ('slope' in r) {
    const w = windowOf(c.ring(r.slope.var), r.slope.overS);
    const s = w.full ? slopePerMin(w.samples) : undefined;
    return s !== undefined && compare(s, r.slope.op, r.slope.perMin);
  }
  if ('unchanged' in r) {
    if (r.unchanged.since === 'phaseStart') {
      const v = c.value(r.unchanged.var, rank);
      const ref = c.phaseRef(r.unchanged.var);
      return v !== undefined && ref !== undefined && (spreadPct([[0, v], [1, ref]]) ?? Infinity) <= r.unchanged.withinPct + EPS;
    }
    const w = windowOf(c.ring(r.unchanged.var), r.unchanged.overS);
    const p = w.full ? spreadPct(w.samples) : undefined;
    return p !== undefined && p <= r.unchanged.withinPct + EPS;
  }
  if ('phaseRule' in r) {
    const e = c.enter(r.phaseRule);
    return e !== undefined && holds(e, `phase:${r.phaseRule}`, 3, c);
  }
  if ('visited' in r) return c.visited(r.visited);
  if ('signal' in r) {
    if (r.signal === 'pulseLoss') return c.pulse === false;
    if (r.signal === 'rosc') return c.pulse === true && c.pulseLost;
    return c.rhythm === r.signal.slice('rhythm:'.length);
  }
  if ('all' in r) return r.all.every((x, i) => holds(x, `${key}.${i}`, rank, c));
  if ('any' in r) return r.any.some((x, i) => holds(x, `${key}.${i}`, rank, c));
  return !holds(r.not, `${key}.0`, rank, c);
}
