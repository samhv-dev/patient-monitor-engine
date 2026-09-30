// Coverage run ET (endocrine and thermal; research/12 §5.2): the cell type, contexts, rigs and measure helpers, copied
// from runs CM/DV and adapted. A cell names its arms, a `measure` over the arms' results and `expect` items the grader
// turns into a verdict. Bands are PROPOSALS for Ali with their source (research/12 §2.2) and are never widened to fit
// (R45). `[VERIFY]` marks a figure quoted from memory of a paper, to be checked before it becomes a test.
import { A, VENTED, at, firstT, maxOf, mean, minOf, r1, r2, r3, type Arm, type ArmResult, type Row, type Step } from './runner.ts';

export type Verdict = 'PL' | 'TW' | 'TS' | 'WR' | 'MI' | 'IN' | 'NE' | 'NM';
export interface Expect {
  m: string; lo?: number; hi?: number; dir?: 1 | -1; tol?: number; quiet?: boolean; event?: boolean; invert?: boolean; src: string;
}
export interface Cell {
  id: string; tier: 'P1' | 'P2' | 'P3'; ctx: string; state: string; intv: string; sys: string;
  arms: Record<string, Arm>;
  measure?: (R: Record<string, ArmResult>) => Record<string, number | boolean | string>;
  expect: Expect[];
  owner: string;
  known?: string; // another stage already owns the fix: reported as "<known> pending"
  hand?: { verdict: Verdict; why: string };
  ne?: string; // not expressible: the reason (probe arms, when given, still run; the verdict stays NE)
  dirOnly?: boolean;
}
export const CELLS: Cell[] = [];
export const add = (c: Cell): void => { CELLS.push(c); };

// ---- contexts (research/12 §1.4) -------------------------------------------------------------------------------------
export const XA: Record<string, unknown> = {}; // 40 y, M, 70 kg, 175 cm
export const XE = { ageY: 80 }; // elderly
export const XC = { ageY: 4, weightKg: 16, heightCm: 102 }; // child 4 y
export const T1DM = { endo: { diabetes: 'type1' } }; // engine API only (no `endo` in pme-scenario/1 until FU-8 A16)
export const T2DM = { ageY: 60, endo: { diabetes: 'type2' } };
export const HYPO = { endo: { thyroid: 'hypo' } };
export const ADRENAL = { endo: { adrenalInsufficiency: true } };
export const MHS = { neuro: { mhSusceptible: true } };

// ---- rigs -----------------------------------------------------------------------------------------------------------
export const T = 300; // induction / intervention time in the plain rigs
/** Drug GA: propofol 2 mg/kg + rocuronium 0.6 mg/kg at t, sevoflurane 2 % FGF 2 L/min from t (≈ 0.9 MAC by 1 h). */
export const GA = (t = T, o: { nmb?: 'roc' | 'sux' | 'none'; sevo?: number } = {}): Step[] => [
  [t, A.drug('propofol', 2, 'mg/kg'), 'propofol 2 mg/kg'],
  ...(o.nmb === 'none' ? [] : o.nmb === 'sux' ? [[t, A.drug('succinylcholine', 1.5, 'mg/kg'), 'succinylcholine 1.5 mg/kg'] as Step] : [[t, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6 mg/kg'] as Step]),
  [t, A.vap('sevoflurane', o.sevo ?? 2, 2), `sevoflurane ${o.sevo ?? 2} % FGF 2`],
];
/** Stage 3's GA flag (the hidden switch: GA metabolic factor, GA thresholds) — the BF/CM rigs' "GA". */
export const FLAG = (t = 1): Step => [t, A.thermal({ anaesthesia: 'general' }), 'thermal GA flag'];
export const V = (steps: Step[], tEnd: number, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED, ...steps], tEnd, ...extra });
export const SP = (steps: Step[], tEnd: number, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps, tEnd, ...extra });
export const d = (t: number, id: string, dose: number, unit: string, extra: Record<string, unknown> = {}): Step => [t, A.drug(id, dose, unit, extra), `${id} ${dose} ${unit}`];
export const inf = (t: number, id: string, rate: number, unit: string): Step => [t, A.infusion(id, rate, unit), `${id} ${rate} ${unit}`];
export const H = 3600;

// ---- measure helpers ------------------------------------------------------------------------------------------------
export const m = (x: Record<string, number | boolean | string>): Record<string, number | boolean | string> => x;
export const w = (rows: Row[], k: string, t0: number, t1: number): number => r1(mean(rows, k, t0, t1));
export const w2 = (rows: Row[], k: string, t0: number, t1: number): number => r2(mean(rows, k, t0, t1));
export const w3 = (rows: Row[], k: string, t0: number, t1: number): number => r3(mean(rows, k, t0, t1));
export const mx = (rows: Row[], k: string, t0: number, t1: number): number => r2(maxOf(rows, k, t0, t1).v);
export const mn = (rows: Row[], k: string, t0: number, t1: number): number => r2(minOf(rows, k, t0, t1).v);
export const tMax = (rows: Row[], k: string, t0: number, t1: number): number => maxOf(rows, k, t0, t1).t;
export const tMin = (rows: Row[], k: string, t0: number, t1: number): number => minOf(rows, k, t0, t1).t;
export const a2 = (rows: Row[], k: string, t: number): number => r2(at(rows, k, t) as number);
export const a3 = (rows: Row[], k: string, t: number): number => r3(at(rows, k, t) as number);
/** Mean body temperature (core 2/3, periphery 1/3: the engine's own compartments). */
export const mbt = (rows: Row[], t: number): number => r3((2 / 3) * (at(rows, 'tc', t) as number) + (1 / 3) * (at(rows, 'tp', t) as number));
export const first = firstT;
export const anyR = (rows: Row[], t0: number, t1: number, f: (r: Row) => boolean): boolean => rows.some((r) => (r.t as number) > t0 && (r.t as number) <= t1 && f(r));
export const rh = (R: ArmResult): string => R.rhythms.map(([t, id]) => `${t}s ${id}`).join(', ');
export const MG = 18.016; // mg/dL per mmol/L
export { A, at, r1, r2, r3 };
