// Coverage run CM (comorbidity profiles; copied from run DI): the cell type, the shared rigs and the measure helpers.
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

// ---- contexts (research/12 §1.4; the comorbidity profiles of §5.7) --------------------------------------------------
export const XA: Record<string, unknown> = {}; // 40 y, M, 70 kg, 175 cm (the reference)
export const XE = { ageY: 80 }; // elderly without HTN (CM-01 isolates age)
export const XEH = { ageY: 80, conditions: [{ id: 'htn' }] }; // research/08's "80 y hypertensive"
export const XO = { weightKg: 127, heightCm: 175, lungConditions: [{ id: 'obesity', severity: 1 }] }; // BMI 41 (§1.4 X-O)
export const XOp = { weightKg: 127, heightCm: 175 }; // BMI 41, profile only (no lung `obesity`) — the double-count check
export const HTNU = { conditions: [{ id: 'htn', severity: 1 }] }; // untreated (+20 MAP set point)
export const HTNT = { conditions: [{ id: 'htn', severity: 0.5 }] }; // treated (+10)
export const CADS = { ageY: 65, conditions: [{ id: 'cad', grade: 'severe' }] }; // 3-vessel / LM (CFR 1.4)
export const CADM = { ageY: 65, conditions: [{ id: 'cad', grade: 'recentMI' }] }; // recent MI (CFR 1.4, Ees ×0.8)
export const X65 = { ageY: 65 };
export const HF = { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] };
export const X60 = { ageY: 60, weightKg: 80 };
export const ASx = { ageY: 75, weightKg: 75, conditions: [{ id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }, { id: 'htn' }] };
export const X75 = { ageY: 75, weightKg: 75 };
export const MSx = { ageY: 55, conditions: [{ id: 'ms', grade: 'severe' }] };
export const X55 = { ageY: 55 };
export const COPD3 = { ageY: 65, lungConditions: [{ id: 'copd', severity: 0.75 }] };
export const CKD = { conditions: [{ id: 'aki' }], blood: { k: 5.5, hb: 10, hco3: 20 } }; // the aki proxy + tables §1.5 ckd chemistry
export const DM2 = { ageY: 60, endo: { diabetes: 'type2' } }; // engine API only (no `endo` in pme-scenario/1)
export const CIRR = { ageY: 55, conditions: [{ id: 'hepaticFailure', severity: 0.8 }], blood: { albuminGL: 25 } }; // Child C proxy
export const ASTH = { lungConditions: [{ id: 'asthma', severity: 0.5 }] }; // poorly controlled (catalogue severity 0.5)
export const PHS = { ageY: 55, conditions: [{ id: 'ph', severity: 1 }] }; // severe PH (PVR ×3, RV Ees ×1.6)
export const PHRV = { ageY: 55, conditions: [{ id: 'ph', severity: 1 }, { id: 'rvFailure' }] };
export const AFP = { ageY: 70, rhythm: { id: 'afib', opts: { rateBpm: 80 } } }; // permanent AF, controlled (profile rhythm)
export const X70 = { ageY: 70 };
export const SMK = { blood: { cohb: 0.08 } }; // heavy smoker, COHb 8 %
export const ANAEM = { blood: { hb: 8 } }; // chronic anaemia Hb 8 (profile Hb only: no chronic SVR/P50 adaptation input)

// ---- rigs -----------------------------------------------------------------------------------------------------------
/** Intubated, VCV 12 × 600, PEEP 5, FiO2 0.5 (audit 08's rig). */
export const V = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED, ...steps], tEnd, ...extra });
/** No airway device, spontaneous breathing (the awake rigs). */
export const SP = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = XA, extra: Partial<Arm> = {}): Arm => ({ patient, steps, tEnd, ...extra });
export const d = (t: number, id: string, dose: number, unit: string, extra: Record<string, unknown> = {}): Step => [t, A.drug(id, dose, unit, extra), `${id} ${dose} ${unit}`];
export const inf = (t: number, id: string, rate: number, unit: string): Step => [t, A.infusion(id, rate, unit), `${id} ${rate} ${unit}`];
export const vap = (t: number, agent: string, pct: number, fgf = 2, n2o = 0): Step => [t, A.vap(agent, pct, fgf, n2o), `${agent} ${pct} % FGF ${fgf}${n2o ? ` N2O ${n2o}` : ''}`];
/** CM battery item (e): bleed 1 L over 10 min from T. */
export const BLEED1L = (t: number): Step => [t, A.bleed(1000, 600), 'bleed 1000 mL / 10 min'];
/** CM apnoea rig: thermal GA at 1 s (audit 09's switch, isolating FU-6 R4), preox FiO2 1 × 180 s from 60 s, propofol 2 +
 * rocuronium 0.6 at 240 s, ventilation source none (open airway) at 240 s. */
export const APNOEA: Step[] = [[1, A.thermal({ anaesthesia: 'general' }), 'thermal GA (audit 09 switch)'], [60, A.preox(1, 180), 'preox FiO2 1 × 180 s'],
  [240, A.drug('propofol', 2, 'mg/kg'), 'propofol 2 mg/kg'], [240, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6 mg/kg'], [240, A.none(), 'apnoea (source none)']];
export const TAP = 240;
/** Minutes from t0 to the first sample with truth SaO2 < thr (NaN if never). */
export const minToSat = (rows: Row[], t0: number, thr = 90): number => { const r = rows.find((x) => (x.t as number) > t0 && (x.sao2 as number) < thr); return r ? r2(((r.t as number) - t0) / 60) : NaN; };

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
/** Awake/pre-intervention baseline: the mean of k over (T − 60, T]. */
export const base = (rows: Row[], k: string, t = T): number => r1(mean(rows, k, t - 60, t));
export const baseR = (rows: Row[], k: string, t = T): number => r2(mean(rows, k, t - 60, t));
