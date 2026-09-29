// Coverage run NN (neuro, NMB, depth, brain; research/12 §5.3): the cell type, the rigs, the contexts and the measure
// helpers, copied from research/22-audit-scripts/spec.ts (run BF) and adapted. A cell names its arms (`i` =
// intervention, `c` = its control at the same sim time, plus reference arms), a `measure` over the arms' rows, and
// `expect` items the grader turns into a verdict. Bands are PROPOSALS for Ali with their source (research/12 §2.2) and
// are never widened to fit (R45).
import { A, VENTED, at, diffExtreme, firstT, maxOf, mean, minOf, r1, r2, r3, type Arm, type ArmResult, type Row, type Step } from './runner.ts';

export type Verdict = 'PL' | 'TW' | 'TS' | 'WR' | 'MI' | 'IN' | 'NE' | 'NM';
export interface Expect {
  m: string; // measure key
  lo?: number; hi?: number; // band (signed)
  dir?: 1 | -1; // direction only
  tol?: number; // a direction check needs |value| > tol; a quiet check needs |value| ≤ tol
  quiet?: boolean;
  event?: boolean; // the measure is boolean; the expected value
  invert?: boolean; // a band where a LOWER value is the stronger/faster effect (an onset time, a nadir): TW/TS swap
  src: string;
}
export interface Cell {
  id: string; tier: 'P1' | 'P2' | 'P3'; ctx: string; state: string; intv: string; sys: string;
  arms: Record<string, Arm>;
  measure?: (R: Record<string, ArmResult>) => Record<string, number | boolean | string>;
  expect: Expect[];
  owner: string;
  known?: string; // another stage or audit already owns the fix (e.g. 'FU-7 T6'): reported as "<known> pending"
  hand?: { verdict: Verdict; why: string }; // the auditor's confirmation overrides the automatic verdict (research/12 §2.2)
  ne?: string; // not expressible: the reason. Arms, when given, still run as a PROBE of what exists (verdict stays NE)
  dirOnly?: boolean; // graded direction-only (no sourced band; listed in the questions)
}

export const CELLS: Cell[] = [];
export const add = (c: Cell): void => { CELLS.push(c); };

// ---- contexts (research/12 §1.4) ------------------------------------------------------------------------------------
export const XA: Record<string, unknown> = {}; // 40 y, M, 70 kg, 175 cm
export const XE = { ageY: 80 };
export const XEH = { ageY: 75, conditions: [{ id: 'htn' }] }; // tables §7 check 18: 75 y hypertensive (cbfLL 75)
export const TBI = { conditions: [{ id: 'tbi', severity: 1 }] }; // PVI 20, ICP0 12, AR 0.3 (brain/params.ts)

// ---- rigs -----------------------------------------------------------------------------------------------------------
/** TIVA: propofol effect-site TCI 3 µg/mL from 1 s, intubated, VCV 12 × 600, PEEP 5, FiO2 0.5. */
export const TIVA: Step[] = [...VENTED, [1, A.tci('propofol', 3), 'propofol TCI Ce 3']];
/** Sevoflurane ≈ 1 MAC (dial 2.4 %, FGF 2) from 1 s, intubated and ventilated. The brain equilibrates by ≈ 10–15 min. */
export const SEVO1: Step[] = [...VENTED, [1, A.vap('sevoflurane', 2.4, 2), 'sevoflurane 2.4 %']];
/** The plain ventilated rig with an arbitrary step list and patient. */
export const G = (steps: Step[], tEnd: number, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED, ...steps], tEnd, ...extra });
/** Awake, no airway device, spontaneous breathing (room air unless FiO2 given). */
export const AW = (steps: Step[], tEnd: number, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps, tEnd, ...extra });
export const d = (t: number, id: string, dose: number, unit: string, extra: Record<string, unknown> = {}): Step => [t, A.drug(id, dose, unit, extra), `${id} ${dose} ${unit}`];
export const inf = (t: number, id: string, rate: number, unit: string): Step => [t, A.infusion(id, rate, unit), `${id} ${rate} ${unit}`];
export const tci = (t: number, id: string, target: number): Step => [t, A.tci(id, target), `${id} TCI Ce ${target}`];
export const vap = (t: number, pct: number, agent = 'sevoflurane', fgf = 2): Step => [t, A.vap(agent, pct, fgf), `${agent} ${pct} %`];
export const stim = (t: number, i: number): Step => [t, A.stim(i), `stimulus ${i}`];
export const ven = (t: number, o: { rr?: number; vtMl?: number; peep?: number; fio2?: number }): Step => [t, A.vent(o), `VCV ${JSON.stringify(o)}`];
/** A probe that should be REJECTED (NE cells): dispatches the raw event body so the rejection reason is recorded. */
export const raw = (t: number, event: Record<string, unknown>, label: string): Step => [t, { type: 'applyEvent', event }, label];

/** Round to 1 decimal (alias kept for the cell files). */
export const r1f = r1;

// ---- measure helpers ------------------------------------------------------------------------------------------------
export const pctMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1(diffExtreme(i, c, k, t0, t1, 'min', true).v);
export const pctMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1(diffExtreme(i, c, k, t0, t1, 'max', true).v);
export const dMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r2(diffExtreme(i, c, k, t0, t1, 'min').v);
export const dMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r2(diffExtreme(i, c, k, t0, t1, 'max').v);
/** Mean difference i − c over (t0, t1]. */
export const dWin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r3(mean(i, k, t0, t1) - mean(c, k, t0, t1));
export const avg = (rows: Row[], k: string, t0: number, t1: number): number => r3(mean(rows, k, t0, t1));
export const anyR = (rows: Row[], t0: number, t1: number, f: (r: Row) => boolean): boolean => rows.some((r) => (r.t as number) > t0 && (r.t as number) <= t1 && f(r));
export const arrestIn = (rows: Row[], t0: number, t1: number): boolean => anyR(rows, t0, t1, (r) => r.pulseless === true || r.noEject === true);
export const mx = (rows: Row[], k: string, t0: number, t1: number): number => r3(maxOf(rows, k, t0, t1).v);
export const mn = (rows: Row[], k: string, t0: number, t1: number): number => r3(minOf(rows, k, t0, t1).v);
export const tOfMin = (rows: Row[], k: string, t0: number, t1: number): number => minOf(rows, k, t0, t1).t - t0;
export const tOfMax = (rows: Row[], k: string, t0: number, t1: number): number => maxOf(rows, k, t0, t1).t - t0;
export const m = (x: Record<string, number | boolean | string>): Record<string, number | boolean | string> => x;
export const ratio = (a: number, b: number): number => r2(a / b);
/** Value at the sample nearest t, rounded to 3 decimals. */
export const v = (rows: Row[], k: string, t: number): number => r3(at(rows, k, t));
/** i − c at the sample nearest t. */
export const dAt = (i: Row[], c: Row[], k: string, t: number): number => r3(at(i, k, t) - at(c, k, t));
/** Seconds from t0 until pred first holds (NaN if never within the arm). */
export const after = (rows: Row[], t0: number, pred: (r: Row) => boolean): number => { const t = firstT(rows, t0, pred); return Number.isFinite(t) ? t - t0 : NaN; };
/** Minutes from t0 until pred first holds, 1 decimal (NaN if never). */
export const afterMin = (rows: Row[], t0: number, pred: (r: Row) => boolean): number => r1(after(rows, t0, pred) / 60);
/** The first neuro mark of a kind at/after t0 (seconds from t0; NaN if none). */
export const markAfter = (R: ArmResult, kind: string, t0: number): number => { const x = R.marks.find(([t, k]) => k === kind && t >= t0); return x ? x[0] - t0 : NaN; };
export const marksOf = (R: ArmResult, t0 = 0): string => R.marks.filter(([t]) => t >= t0).map(([t, k]) => `${t}s ${k}`).join(', ') || 'none';
export const tofRecovered = (r: Row): boolean => (r.tofC as number) === 4 && (r.tofR as number) >= 0.9;
