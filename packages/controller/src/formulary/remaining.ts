// Plan learner-action-remote.md L2 and §7: how much of the drug is still intact at a preparation's age, r(age), read
// from the source's own stability points for that drug, diluent, container and temperature. Linear between the
// source's points, from 1 at age 0 (the points are fractions of the initial amount); never extrapolated: past the last
// point it is the last point's value, flagged. No kinetic model, no interpolation across containers or temperatures.
// The two owner rulings that decide what happens without a quantity are one switch each (RULINGS), at their ruled value.
// Rows that differ only in the concentration they were measured at are told apart by their `concentration` (brief 127):
// the row whose stated concentration covers the preparation's, else a row stating none; never the nearest row
// (a row at another concentration is not the same statement: ruling C1, 10 November).
import type { Concentration, DrugEntry, Stability } from './types.ts';

export interface Rulings {
  /** LQ8, incompatible with no quantity: A the full amount ("loss not modelled"), B none, C it cannot be given. */
  LQ8: 'A' | 'B' | 'C';
  /** LQ9, "at least x for T h": A 100 % within T, B the bound x within T; beyond T both hold the value, flagged. */
  LQ9: 'A' | 'B';
}

/** The owner's rulings of 9 November: LQ8 A, LQ9 A. */
export const RULINGS: Readonly<Rulings> = Object.freeze({ LQ8: 'A', LQ9: 'A' });

export interface Remaining {
  /** The fraction of the nominal amount still intact (0–1). */
  r: number;
  /** Where r comes from: measured points, a "stable" statement, or no figure. */
  basis: 'measured' | 'stable' | 'none';
  /** True past the source's last point (or past T): r is the last value, not a figure for this age. */
  beyondData: boolean;
  /** Said in the record where the source gives no quantity. */
  note: null | 'loss not known' | 'loss not modelled' | 'all lost' | 'cannot be given';
  /** False only under LQ8 C. */
  deliverable: boolean;
  /** The stability row's source; null when no row applies. */
  src: string | null;
}

/** Seconds in an hour: the points are in hours, the age in seconds [ENG: conversion]. */
const S_PER_H = 3600;
/** A mass unit in mg [ENG: conversion]. */
const MASS_MG: Readonly<Record<string, number>> = { g: 1000, mg: 1, mcg: 0.001, 'µg': 0.001, ng: 0.000001 };
/** An insulin unit is an international unit: one count, two spellings. */
const COUNT = new Set(['IU', 'units']);
/** A concentration's volume in mL [ENG: conversion]. */
const PER_ML: Readonly<Record<string, number>> = { mL: 1, L: 1000 };
/** Two concentrations computed in floating point are the same within this relative difference [ENG: numerics]. */
const REL_TOL = 1e-9;

/** A drug amount's unit as [dimension, size]: mass in mg, a count, or any other unit (mmol, mEq) only as itself. */
const dim = (unit: string): [string, number] => (unit in MASS_MG ? ['mass', MASS_MG[unit]!] : COUNT.has(unit) ? ['count', 1] : [unit, 1]);

/** True when `perMl` (`unit` per mL, as prepare gives it) is the row's stated concentration, or inside its stated range. */
export function covers(c: Concentration, perMl: number, unit: string): boolean {
  const m = /^(.+)\/(mL|L)$/.exec(c.unit);
  if (!m) return false;
  const [d, size] = dim(m[1]!);
  const [pd, psize] = dim(unit);
  if (d !== pd) return false;
  const k = size / PER_ML[m[2]!]! / psize;
  const lo = c.amount * k;
  const hi = (c.max ?? c.amount) * k;
  return perMl >= lo * (1 - REL_TOL) && perMl <= hi * (1 + REL_TOL);
}

/** The preparation's concentration, as prepare's `Active` gives it. */
export interface AtConcentration {
  perMl: number;
  unit: string;
}

/** Indexes of `entry`'s stability rows for `diluent` and `container` (any temperature) that state `concentration` or
 *  state none; every row for the pair when no concentration is given. */
export function stabilityRows(entry: DrugEntry, diluent: string, container: Stability['container'], concentration?: AtConcentration): number[] {
  return entry.stability.flatMap((s, i) =>
    s.diluent === diluent && s.container === container && (!concentration || !s.concentration || covers(s.concentration, concentration.perMl, concentration.unit)) ? [i] : []);
}

/**
 * r at `ageS` seconds for `entry` in `diluent`, `container`, `tempC` (exact match). With the preparation's
 * `concentration`, the row whose stated concentration covers it, else a row that states none; without it, the first
 * row for the diluent, container and temperature. `incompatible` overrides the entry's own diluent verdict (the caller
 * passes an admixture finding).
 * @throws RangeError on a negative or non-finite age.
 */
export function remaining(
  entry: DrugEntry, diluent: string, container: Stability['container'], tempC: number, ageS: number,
  opts: { incompatible?: boolean; rulings?: Rulings; concentration?: AtConcentration } = {},
): Remaining {
  if (!Number.isFinite(ageS) || ageS < 0) throw new RangeError(`a preparation's age is a non-negative number of seconds, not ${ageS}`);
  const rulings = opts.rulings ?? RULINGS;
  const rows = stabilityRows(entry, diluent, container, opts.concentration).map((i) => entry.stability[i]!).filter((s) => s.tempC === tempC);
  const row = rows.find((s) => opts.concentration && s.concentration) ?? rows[0];
  if (!row) {
    const incompatible = opts.incompatible ?? entry.diluents.some((d) => d.id === diluent && d.compat?.verdict === 'incompatible');
    const none = { basis: 'none' as const, beyondData: false, src: null };
    if (!incompatible) return { r: 1, note: 'loss not known', deliverable: true, ...none };
    if (rulings.LQ8 === 'B') return { r: 0, note: 'all lost', deliverable: true, ...none };
    if (rulings.LQ8 === 'C') return { r: 1, note: 'cannot be given', deliverable: false, ...none };
    return { r: 1, note: 'loss not modelled', deliverable: true, ...none };
  }
  const h = ageS / S_PER_H;
  const pts = [...row.points].sort((a, b) => a[0] - b[0]);
  const at = (r: number, beyondData: boolean): Remaining => ({ r, basis: row.kind === 'stable' ? 'stable' : 'measured', beyondData, note: null, deliverable: true, src: row.src });
  if (row.kind === 'stable') {
    const [T, bound] = pts[pts.length - 1]!;
    const inside = rulings.LQ9 === 'B' ? bound : 1;
    return at(h === 0 ? 1 : inside, h > T);
  }
  const curve: Array<[number, number]> = [[0, 1], ...pts.filter(([t]) => t > 0)];
  const last = curve[curve.length - 1]!;
  if (h > last[0]) return at(last[1], true);
  const k = curve.findIndex(([t]) => t >= h);
  if (k === 0) return at(1, false);
  const [t0, r0] = curve[k - 1]!;
  const [t1, r1] = curve[k]!;
  return at(r0 + ((r1 - r0) * (h - t0)) / (t1 - t0), false);
}
