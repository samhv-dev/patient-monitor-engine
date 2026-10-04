// Coverage run DI (drug–drug and drug–disease interactions): the cell type, the shared rigs and the measure helpers.
// A cell names its arms (`i` = intervention, `c` = its control at the same sim time, plus reference arms), a `measure`
// over the arms' rows, and `expect` items the grader turns into a verdict. Bands are PROPOSALS for Ali with their
// source (research/12 §2.2) and are never widened to fit (R45).
import { A, VENTED, diffExtreme, maxOf, mean, minOf, r1, r2, type Arm, type ArmResult, type Row, type Step } from './runner.ts';

export type Verdict = 'PL' | 'TW' | 'TS' | 'WR' | 'MI' | 'IN' | 'NE' | 'NM';
export interface Expect {
  m: string; // measure key
  lo?: number; hi?: number; // band (signed)
  dir?: 1 | -1; // direction only
  tol?: number; // a direction check needs |value| > tol; a quiet check needs |value| ≤ tol
  quiet?: boolean;
  event?: boolean; // the measure is boolean; the expected value
  invert?: boolean; // a band where a LOWER value is the stronger effect (an absolute minimum, a time to onset): TW/TS swap
  src: string;
}
export interface Cell {
  id: string; tier: 'P1' | 'P2' | 'P3'; ctx: string; state: string; intv: string; sys: string;
  arms: Record<string, Arm>;
  measure?: (R: Record<string, ArmResult>) => Record<string, number | boolean | string>;
  expect: Expect[];
  owner: string;
  fu4?: boolean; // FU-4 already owns this mechanism (its plan / the 9th-cap review rulings)
  known?: string; // another stage already owns the fix (e.g. 'FU-6 R2'): reported as "<known> pending"
  hand?: { verdict: Verdict; why: string }; // the auditor's confirmation overrides the automatic verdict (research/12 §2.2)
  ne?: string; // not expressible: the reason (no arms are run)
}
/** Spontaneous VE below 1 L/min: the breathing that actually happens (the 7f `apnoea` flag is drug-drive only, see DI-89). */
export const apnoeic = (r: Row): boolean => Number.isFinite(r.veSp as number) && (r.veSp as number) < 1;

export const T = 300; // when an intervention is given in a plain rig
export const TB = 960; // after a 10-min bleed started at 60 s
export const TS = 1260; // after the 7e sepsis ramp
export const CELLS: Cell[] = [];
export const add = (c: Cell): void => { CELLS.push(c); };

// ---- contexts (research/12 §1.4) ------------------------------------------------------------------------------------
export const XA: Record<string, unknown> = {};
export const XE = { ageY: 80, conditions: [{ id: 'htn' }] };
export const HF = { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] };
export const ASx = { ageY: 75, weightKg: 75, conditions: [{ id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }, { id: 'htn' }] };
export const MSx = { ageY: 55, conditions: [{ id: 'ms', grade: 'severe' }] };
export const BB = { conditions: [{ id: 'betaBlocked' }] };
export const RVF = { conditions: [{ id: 'rvFailure' }] };
export const COPD3 = { lungConditions: [{ id: 'copd', severity: 0.75 }] };
export const AKI = { conditions: [{ id: 'aki' }] };

// ---- rigs -----------------------------------------------------------------------------------------------------------
/** Intubated, VCV 12 × 600, PEEP 5, FiO2 0.5 (audit 08's rig). */
export const V = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED, ...steps], tEnd, ...extra });
/** No airway device, spontaneous breathing (the awake rigs). */
export const SP = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps, tEnd, ...extra });
export const d = (t: number, id: string, dose: number, unit: string, extra: Record<string, unknown> = {}): Step => [t, A.drug(id, dose, unit, extra), `${id} ${dose} ${unit}`];
export const inf = (t: number, id: string, rate: number, unit: string): Step => [t, A.infusion(id, rate, unit), `${id} ${rate} ${unit}`];
export const vap = (t: number, agent: string, pct: number, fgf = 2, n2o = 0): Step => [t, A.vap(agent, pct, fgf, n2o), `${agent} ${pct} % FGF ${fgf}${n2o ? ` N2O ${n2o}` : ''}`];
export const CL3: Step[] = [[60, A.bleed(1500, 600), 'bleed 1500 mL / 10 min (class III)']];
export const CL2: Step[] = [[60, A.bleed(1000, 600), 'bleed 1000 mL / 10 min (class II)']];
export const SEPW: Step[] = [[60, A.cond('sepsis', 1, { phase: 'warm' }), 'septic shock warm']];
export const SEPC: Step[] = [[60, A.cond('sepsis', 1, { phase: 'cold' }), 'septic shock cold']];

// ---- measure helpers ------------------------------------------------------------------------------------------------
export const pctMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1(diffExtreme(i, c, k, t0, t1, 'min', true).v);
export const pctMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1(diffExtreme(i, c, k, t0, t1, 'max', true).v);
export const dMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1(diffExtreme(i, c, k, t0, t1, 'min').v);
export const dMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1(diffExtreme(i, c, k, t0, t1, 'max').v);
export const tMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => diffExtreme(i, c, k, t0, t1, 'min').t - t0;
export const tMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => diffExtreme(i, c, k, t0, t1, 'max').t - t0;
export const dWin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r2(mean(i, k, t0, t1) - mean(c, k, t0, t1));
export const pctWin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1((100 * (mean(i, k, t0, t1) - mean(c, k, t0, t1))) / mean(c, k, t0, t1));
export const anyR = (rows: Row[], t0: number, t1: number, f: (r: Row) => boolean): boolean => rows.some((r) => (r.t as number) > t0 && (r.t as number) <= t1 && f(r));
export const arrestIn = (rows: Row[], t0: number, t1: number): boolean => anyR(rows, t0, t1, (r) => r.pulseless === true || r.noEject === true);
export const secOf = (rows: Row[], t0: number, t1: number, f: (r: Row) => boolean): number => rows.filter((r) => (r.t as number) > t0 && (r.t as number) <= t1 && f(r)).length * 5;
export const mx = (rows: Row[], k: string, t0: number, t1: number): number => r1(maxOf(rows, k, t0, t1).v);
export const mn = (rows: Row[], k: string, t0: number, t1: number): number => r1(minOf(rows, k, t0, t1).v);
export const m = (x: Record<string, number | boolean | string>): Record<string, number | boolean | string> => x;
/** Standard haemodynamic read-out of one intervention against its control over (t0, t0 + w]. */
export const hemo = (i: Row[], c: Row[], t0: number, w = 600): Record<string, number | boolean> => ({
  mapPct: pctMin(i, c, 'map', t0, t0 + w), mapMin: mn(i, 'map', t0, t0 + w), nadirS: tMin(i, c, 'map', t0, t0 + w),
  hrUp: dMax(i, c, 'hr', t0, t0 + w), hrDown: dMin(i, c, 'hr', t0, t0 + w), coPct: pctMin(i, c, 'co', t0, t0 + w),
  svrPct: pctMin(i, c, 'svr', t0, t0 + w), arrest: arrestIn(i, t0, t0 + w),
});
