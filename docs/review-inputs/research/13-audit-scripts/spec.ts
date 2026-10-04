// Coverage run RH (renal and hepatic; research/12 §5.1): the cell type, the rigs, the contexts and the measure helpers,
// copied from research/22-audit-scripts/spec.ts (BF) and adapted. A cell names its arms (`i` = intervention, `c` = its
// control at the same sim time, plus reference arms), a `measure` over the arms' rows, and `expect` items the grader
// turns into a verdict. Bands are PROPOSALS for Ali with their source (research/12 §2.2) and are never widened to fit
// (R45).
import { A, VENTED, VENTED_GA, at, diffExtreme, maxOf, mean, minOf, r1, r2, r3, type Arm, type ArmResult, type Row, type Step } from './runner.ts';

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
  fu4?: boolean;
  known?: string; // another stage or plan already owns the fix (e.g. 'FU-9 A1'): reported as "<known> pending"
  hand?: { verdict: Verdict; why: string }; // the auditor's confirmation overrides the automatic verdict (research/12 §2.2)
  ne?: string; // not expressible: the reason. Arms, when given, still run as a PROBE of what exists (verdict stays NE)
  dirOnly?: boolean; // graded direction-only (no sourced band; listed in the questions)
}

export const T = 300; // when an intervention is given in a plain rig
export const H = 3600;
export const CELLS: Cell[] = [];
export const add = (c: Cell): void => { CELLS.push(c); };

// ---- contexts (research/12 §1.4) ------------------------------------------------------------------------------------
export const XA: Record<string, unknown> = {};
export const XEH = { ageY: 80, conditions: [{ id: 'htn' }] }; // research/08's "80 y hypertensive" (CM XEH)
export const HF = { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] };
export const AKI = (sev = 1, extra: Record<string, unknown> = {}): Record<string, unknown> => ({ conditions: [{ id: 'aki', severity: sev }], ...extra });
/** CM's CKD proxy (research/19 CM-08): aki 1 + tables §1.5 ckd chemistry. */
export const CKD = { conditions: [{ id: 'aki', severity: 1 }], blood: { k: 5.5, hb: 10, hco3: 20 } };
export const HEP = (sev = 0.8, extra: Record<string, unknown> = {}): Record<string, unknown> => ({ conditions: [{ id: 'hepaticFailure', severity: sev }], ...extra });
/** CM's Child C proxy (research/19 CM-10): hepaticFailure 0.8 + albumin 25 g/L, 55 y. */
export const CIRR = { ageY: 55, conditions: [{ id: 'hepaticFailure', severity: 0.8 }], blood: { albuminGL: 25 } };

// ---- states ---------------------------------------------------------------------------------------------------------
export const TB = 960; // after a 10-min bleed started at 60 s
export const TS = 1260; // after the 7e sepsis ramp
export const CL2: Step[] = [[60, A.bleed(1000, 600), 'bleed 1000 mL / 10 min (class II, ≈ 20 % BV)']];
export const CL3: Step[] = [[60, A.bleed(1500, 600), 'bleed 1500 mL / 10 min (class III, ≈ 31 % BV)']];
export const SEPW: Step[] = [[60, A.cond('sepsis', 1, { phase: 'warm' }), 'septic shock warm']];

// ---- rigs -----------------------------------------------------------------------------------------------------------
/** Intubated, VCV 12 × 600, PEEP 5, FiO2 0.5, general anaesthesia flag (Stage 3 `thermal`). */
export const G = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED_GA, ...steps], tEnd, ...extra });
/** The same rig without the GA flag (ventilated, no anaesthetic): isolates the GA term. */
export const V = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED, ...steps], tEnd, ...extra });
/** Awake, no airway device, spontaneous breathing on room air. */
export const AW = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps, tEnd, ...extra });
export const d = (t: number, id: string, dose: number, unit: string, extra: Record<string, unknown> = {}): Step => [t, A.drug(id, dose, unit, extra), `${id} ${dose} ${unit}`];
export const inf = (t: number, id: string, rate: number, unit: string): Step => [t, A.infusion(id, rate, unit), `${id} ${rate} ${unit}`];
export const fl = (t: number, fluid: string, ml: number, overS: number): Step => [t, A.fluid(fluid, ml, overS), `${fluid} ${ml} mL / ${overS} s`];
export const bl = (t: number, ml: number, overS: number): Step => [t, A.bleed(ml, overS), `bleed ${ml} mL / ${overS} s`];
export const tx = (t: number, product: string, units: number, overS: number, extra: Record<string, unknown> = {}): Step => [t, A.transfusion(product, units, overS, extra), `${product} ${units} u / ${overS} s ${JSON.stringify(extra)}`];
export const ven = (t: number, o: { rr?: number; vtMl?: number; peep?: number; fio2?: number }): Step => [t, A.vent(o), `VCV ${JSON.stringify(o)}`];
export const vap = (t: number, agent: string, pct: number, fgf = 2): Step => [t, A.vap(agent, pct, fgf), `${agent} ${pct} % FGF ${fgf}`];
export const iap = (t: number, mmHg: number): Step => [t, A.renal({ iapMmHg: mmHg }), `IAP ${mmHg} mmHg`];
export const tgt = (t: number, variable: string, value: number, durationS = 60): Step => [t, { type: 'setTarget', variable, value, ramp: { durationS } }, `target ${variable} ${value}`];
export const raw = (t: number, event: Record<string, unknown>, label: string): Step => [t, { type: 'applyEvent', event }, label];

// ---- measure helpers ------------------------------------------------------------------------------------------------
export const dMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r2(diffExtreme(i, c, k, t0, t1, 'min').v);
export const dMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r2(diffExtreme(i, c, k, t0, t1, 'max').v);
/** Mean of key over (t0, t1]. */
export const avg = (rows: Row[], k: string, t0: number, t1: number): number => r3(mean(rows, k, t0, t1));
/** Mean difference i − c over (t0, t1]. */
export const dWin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r3(mean(i, k, t0, t1) - mean(c, k, t0, t1));
export const pctWin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => r1((100 * (mean(i, k, t0, t1) - mean(c, k, t0, t1))) / mean(c, k, t0, t1));
export const anyR = (rows: Row[], t0: number, t1: number, f: (r: Row) => boolean): boolean => rows.some((r) => (r.t as number) > t0 && (r.t as number) <= t1 && f(r));
export const arrestIn = (rows: Row[], t0: number, t1: number): boolean => anyR(rows, t0, t1, (r) => r.pulseless === true || r.noEject === true);
export const mx = (rows: Row[], k: string, t0: number, t1: number): number => r3(maxOf(rows, k, t0, t1).v);
export const mn = (rows: Row[], k: string, t0: number, t1: number): number => r3(minOf(rows, k, t0, t1).v);
export const tOfMax = (rows: Row[], k: string, t0: number, t1: number): number => maxOf(rows, k, t0, t1).t - t0;
export const m = (x: Record<string, number | boolean | string>): Record<string, number | boolean | string> => x;
export const v = (rows: Row[], k: string, t: number): number => r3(at(rows, k, t));
export const dAt = (i: Row[], c: Row[], k: string, t: number): number => r3(at(i, k, t) - at(c, k, t));
export const ratio = (a: number, b: number): number => r2(a / b);
/** Urine volume (mL) produced over (t0, t1] from the cumulative counter. */
export const urineMl = (rows: Row[], t0: number, t1: number): number => r1(at(rows, 'cumMl', t1) - at(rows, 'cumMl', t0));
/** Urine rate over (t0, t1] in mL/kg/h from the cumulative counter. */
export const uoKgH = (rows: Row[], t0: number, t1: number, kg = 70): number => r2(((at(rows, 'cumMl', t1) - at(rows, 'cumMl', t0)) / kg) * (3600 / (t1 - t0)));
/** First time ≥ t0 the oliguria flag is on (NaN if never). */
export const firstFlag = (rows: Row[], t0: number): number => { const r = rows.find((x) => (x.t as number) >= t0 && x.oliguria === true); return r ? (r.t as number) : NaN; };
/** Filtration fraction GFR / RPF with Hct from Hb (Hct ≈ 3·Hb/100). */
export const ff = (rows: Row[], t0: number, t1: number): number => r2(mean(rows, 'gfr', t0, t1) / (mean(rows, 'rbf', t0, t1) * (1 - (3 * mean(rows, 'hb', t0, t1)) / 100)));
/** Area under a key over (t0, t1] (value·s), rectangle rule on the sample grid. */
export function auc(rows: Row[], k: string, t0: number, t1: number): number {
  let s = 0; let prev = t0;
  for (const r of rows) { const t = r.t as number; if (t <= t0 || t > t1) continue; const x = r[k] as number; if (Number.isFinite(x)) s += x * (t - prev); prev = t; }
  return s;
}
