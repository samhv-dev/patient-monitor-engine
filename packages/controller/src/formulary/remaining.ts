// Plan learner-action-remote.md L2 and §7: how much of the drug is still intact at a preparation's age, r(age), read
// from the source's own stability points for that drug, diluent, container and temperature. Linear between the
// source's points, from 1 at age 0 (the points are fractions of the initial amount); never extrapolated: past the last
// point it is the last point's value, flagged. No kinetic model, no interpolation across containers or temperatures.
// The two owner rulings that decide what happens without a quantity are one switch each (RULINGS), at their ruled value.
import type { DrugEntry, Stability } from './types.ts';

/**
 * A stability row. `kind: 'stable'` is a statement "at least x retained for T h" (points `[[T, x]]`): LQ9 decides the
 * fraction inside T. Absent or `'measured'`: the points are measured fractions. The field is read here only; the
 * files' JSON Schema does not admit it yet (the first entry that needs it adds it there).
 */
export type StabilityRow = Stability & { kind?: 'measured' | 'stable' };

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

/**
 * r at `ageS` seconds for `entry` in `diluent`, `container`, `tempC` (exact match; the first matching row).
 * `incompatible` overrides the entry's own diluent verdict (the caller passes an admixture finding).
 * @throws RangeError on a negative or non-finite age.
 */
export function remaining(
  entry: DrugEntry, diluent: string, container: Stability['container'], tempC: number, ageS: number,
  opts: { incompatible?: boolean; rulings?: Rulings } = {},
): Remaining {
  if (!Number.isFinite(ageS) || ageS < 0) throw new RangeError(`a preparation's age is a non-negative number of seconds, not ${ageS}`);
  const rulings = opts.rulings ?? RULINGS;
  const row = (entry.stability as StabilityRow[]).find((s) => s.diluent === diluent && s.container === container && s.tempC === tempC);
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
