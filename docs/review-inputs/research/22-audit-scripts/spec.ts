// Coverage run BF (blood, fluids, electrolytes, acid–base, transfusion; research/12 §5.10): the cell type, the rigs,
// the contexts and the measure helpers, copied from research/14-audit-scripts/spec.ts and adapted. A cell names its
// arms (`i` = intervention, `c` = its control at the same sim time, plus reference arms), a `measure` over the arms'
// rows, and `expect` items the grader turns into a verdict. Bands are PROPOSALS for Ali with their source
// (research/12 §2.2) and are never widened to fit (R45).
import { A, VENTED_GA, at, diffExtreme, maxOf, mean, minOf, r1, r2, r3, type Arm, type ArmResult, type Lab, type Row, type Step } from './runner.ts';

export type Verdict = 'PL' | 'TW' | 'TS' | 'WR' | 'MI' | 'IN' | 'NE' | 'NM';
export interface Expect {
  m: string; // measure key
  lo?: number; hi?: number; // band (signed)
  dir?: 1 | -1; // direction only
  tol?: number; // a direction check needs |value| > tol; a quiet check needs |value| ≤ tol
  quiet?: boolean;
  event?: boolean; // the measure is boolean; the expected value
  invert?: boolean; // a band where a LOWER value is the stronger effect: TW/TS swap
  src: string;
}
export interface Cell {
  id: string; tier: 'P1' | 'P2' | 'P3'; ctx: string; state: string; intv: string; sys: string;
  arms: Record<string, Arm>;
  measure?: (R: Record<string, ArmResult>) => Record<string, number | boolean | string>;
  expect: Expect[];
  owner: string;
  fu4?: boolean; // FU-4 already owns this mechanism (its plan / rulings; FU-4 is not merged on this branch)
  known?: string; // another stage or audit already owns the fix (e.g. 'audit 09 R11'): reported as "<known> pending"
  hand?: { verdict: Verdict; why: string }; // the auditor's confirmation overrides the automatic verdict (research/12 §2.2)
  ne?: string; // not expressible: the reason. Arms, when given, still run as a PROBE of what exists (verdict stays NE)
  dirOnly?: boolean; // graded direction-only (no sourced band; listed in the questions)
}

export const T = 300; // when an intervention is given in a plain rig
export const CELLS: Cell[] = [];
export const add = (c: Cell): void => { CELLS.push(c); };

// ---- contexts (research/12 §1.4) ------------------------------------------------------------------------------------
export const XA: Record<string, unknown> = {};
export const HF = { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] };
export const MRs = { ageY: 60, conditions: [{ id: 'mr', grade: 'severe' }] };
export const COPD3 = { lungConditions: [{ id: 'copd', severity: 0.75 }] };
export const blood = (b: Record<string, number>, extra: Record<string, unknown> = {}): Record<string, unknown> => ({ blood: b, ...extra });
export const AKI = { conditions: [{ id: 'aki' }] };

// ---- states ---------------------------------------------------------------------------------------------------------
export const TB = 960; // after a 10-min bleed started at 60 s
export const TS = 1260; // after the 7e sepsis ramp
export const CL2: Step[] = [[60, A.bleed(1000, 600), 'bleed 1000 mL / 10 min (class II)']];
export const CL3: Step[] = [[60, A.bleed(1500, 600), 'bleed 1500 mL / 10 min (class III)']];
export const CL4: Step[] = [[60, A.bleed(2100, 600), 'bleed 2100 mL / 10 min (class IV, 43 % BV)']];
export const SEPW: Step[] = [[60, A.cond('sepsis', 1, { phase: 'warm' }), 'septic shock warm']];

// ---- rigs -----------------------------------------------------------------------------------------------------------
/** Intubated, VCV 12 × 600, PEEP 5, FiO2 0.5, general anaesthesia flag (Stage 3 `thermal`). */
export const G = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED_GA, ...steps], tEnd, ...extra });
/** Awake, no airway device, spontaneous breathing on room air (the engine's own chemoreflex). */
export const AW = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps, tEnd, ...extra });
export const d = (t: number, id: string, dose: number, unit: string, extra: Record<string, unknown> = {}): Step => [t, A.drug(id, dose, unit, extra), `${id} ${dose} ${unit}`];
export const fl = (t: number, fluid: string, ml: number, overS: number): Step => [t, A.fluid(fluid, ml, overS), `${fluid} ${ml} mL / ${overS} s`];
export const bl = (t: number, ml: number, overS: number): Step => [t, A.bleed(ml, overS), `bleed ${ml} mL / ${overS} s`];
export const tx = (t: number, product: string, units: number, overS: number, extra: Record<string, unknown> = {}): Step => [t, A.transfusion(product, units, overS, extra), `${product} ${units} u / ${overS} s ${JSON.stringify(extra)}`];

// ---- measure helpers ------------------------------------------------------------------------------------------------
export const pctMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1(diffExtreme(i, c, k, t0, t1, 'min', true).v);
export const pctMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1(diffExtreme(i, c, k, t0, t1, 'max', true).v);
export const dMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r2(diffExtreme(i, c, k, t0, t1, 'min').v);
export const dMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r2(diffExtreme(i, c, k, t0, t1, 'max').v);
/** Mean difference i − c over (t0, t1]. */
export const dWin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r3(mean(i, k, t0, t1) - mean(c, k, t0, t1));
export const pctWin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1((100 * (mean(i, k, t0, t1) - mean(c, k, t0, t1))) / mean(c, k, t0, t1));
export const avg = (rows: Row[], k: string, t0: number, t1: number): number => r3(mean(rows, k, t0, t1));
export const anyR = (rows: Row[], t0: number, t1: number, f: (r: Row) => boolean): boolean => rows.some((r) => (r.t as number) > t0 && (r.t as number) <= t1 && f(r));
export const arrestIn = (rows: Row[], t0: number, t1: number): boolean => anyR(rows, t0, t1, (r) => r.pulseless === true || r.noEject === true);
export const mx = (rows: Row[], k: string, t0: number, t1: number): number => r3(maxOf(rows, k, t0, t1).v);
export const mn = (rows: Row[], k: string, t0: number, t1: number): number => r3(minOf(rows, k, t0, t1).v);
export const tOfMin = (rows: Row[], k: string, t0: number, t1: number): number => minOf(rows, k, t0, t1).t - t0;
export const m = (x: Record<string, number | boolean | string>): Record<string, number | boolean | string> => x;
export const rh = (R: { rhythms: [number, string][] }): string => R.rhythms.map(([t, id]) => `${t}s ${id}`).join(',') || 'unchanged';
export const ratio = (a: number, b: number): number => r2(a / b);
/** Value at the sample nearest t, rounded to 3 decimals. */
export const v = (rows: Row[], k: string, t: number): number => r3(at(rows, k, t));
/** i − c at the sample nearest t. */
export const dAt = (i: Row[], c: Row[], k: string, t: number): number => r3(at(i, k, t) - at(c, k, t));
/** The first lab result of a panel (optionally drawn at/after t0). */
export const lab = (R: { labs: Lab[] }, panel: 'abg' | 'vbg', t0 = 0): Lab | undefined => R.labs.find((x) => x.panel === panel && x.drawnAt >= t0 - 1e-6);
export const inf = (t: number, id: string, rate: number, unit: string): Step => [t, A.infusion(id, rate, unit), `${id} ${rate} ${unit}`];
export const ven = (t: number, o: { rr?: number; vtMl?: number; peep?: number; fio2?: number }): Step => [t, A.vent(o), `VCV ${JSON.stringify(o)}`];
/** A probe that should be REJECTED (NE cells): dispatches the raw event body so the rejection reason is recorded. */
export const raw = (t: number, event: Record<string, unknown>, label: string): Step => [t, { type: 'applyEvent', event }, label];
