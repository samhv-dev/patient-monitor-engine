// Coverage run NN — neuromuscular block cells (research/12 §5.3 NN-01 … NN-14). Rig: TIVA (propofol effect-site TCI
// 3 µg/mL from 1 s; the NMB PD is independent of propofol), intubated, VCV 12 × 600, PEEP 5, FiO2 0.5; the NMB dose at
// 300 s. Readouts are the 1 Hz `anaesthesia` truth (TOF count/ratio/PTC/T1 at the adductor pollicis, block at the
// diaphragm) and, where the monitor is graded, the TOF stimulator's `tof` events (15 s trains).
// Timed reversal doses (NN-05, NN-06, NN-07, NN-08) are given at the sim time the CONTROL arm first shows the named
// TOF state (calibration probe, 2026-09-29, seed 7); each measure re-checks that state at the dose time and reports it.
import { A, type ArmResult, type Row } from './runner.ts';
import {
  add, after, afterMin, avg, d, dMax, G, m, markAfter, marksOf, mn, mx, r1f, tofRecovered, v, vap, XA,
} from './spec.ts';

const T = 300; // NMB dose
const TOF: [number, ReturnType<typeof A.tof>, string] = [T - 10, A.tof('start', 15), 'TOF stimulator every 15 s'];
const tiva = (steps: Parameters<typeof G>[0], tEnd: number, patient: Record<string, unknown> = XA, dt = 5) => G([[1, A.tci('propofol', 3), 'propofol TCI Ce 3'], TOF, ...steps], tEnd, patient, { dt });
const roc = (dose: number, t = T) => d(t, 'rocuronium', dose, 'mg/kg');
const sux = (dose: number, t = T) => d(t, 'succinylcholine', dose, 'mg/kg');
/** Seconds after t0 to the first TOF count 0 (truth). */
const tTof0 = (rows: Row[], t0: number) => after(rows, t0, (r) => (r.tofC as number) === 0);
/** Minutes after t0 to T1 ≥ x on the way back (after the nadir). */
const tT1 = (rows: Row[], t0: number, x: number) => { const tn = after(rows, t0, (r) => (r.t1 as number) <= 0.05); return Number.isFinite(tn) ? afterMin(rows, t0 + tn, (r) => (r.t1 as number) >= x) + r1f(tn / 60) : NaN; };
/** Seconds after t0 to the maximum thumb block (first sample within 0.005 of the peak: T1's floor). */
const tMaxBlock = (rows: Row[], t0: number) => { const pk = mx(rows, 'blockTh', t0, t0 + 900); return after(rows, t0, (r) => (r.blockTh as number) >= pk - 0.005); };
/** The stimulator's first reported count 0 (DEV). */
const devTof0 = (R: ArmResult, t0: number) => { const x = R.tofs.find((q) => q.t >= t0 && q.count === 0); return x ? x.t - t0 : NaN; };

// ---- NN-01 rocuronium 0.6 mg/kg ------------------------------------------------------------------------------------
const roc06 = tiva([roc(0.6)], T + 7500, XA, 2);
add({
  id: 'NN-01a', tier: 'P1', ctx: 'X-A TIVA vent', state: 'anaesthetised (propofol Ce 3)', intv: 'rocuronium 0.6 mg/kg: onset (TOF count 0)', sys: 'NEU, DEV',
  arms: { i: roc06 },
  measure: (R) => { const i = R.i!.rows; return m({ tTof0S: tTof0(i, T), tMaxBlockS: tMaxBlock(i, T), devTof0S: devTof0(R.i!, T), devLagS: devTof0(R.i!, T) - tTof0(i, T), diaAt60: v(i, 'blockDia', T + 60), thumbAt60: v(i, 'blockTh', T + 60) }); },
  expect: [
    { m: 'tTof0S', lo: 90, hi: 120, invert: true, src: 'research/12 NN-01: TOF 0 at 1.5–2 min (Naguib)' },
    { m: 'tMaxBlockS', lo: 92, hi: 124, invert: true, src: 'tables §5d / §7 check 25: rocuronium 0.6 max block 1.8 min (Roc-label; ±15 %)' },
    { m: 'devLagS', lo: 0, hi: 15, src: 'DEV: the TOF stimulator (15 s trains) reports count 0 within one train of the truth (research/12 §2.2)' },
  ],
  owner: '7f nmb.ts / 7g roc PK',
});
add({
  id: 'NN-01b', tier: 'P1', ctx: 'X-A TIVA vent', state: 'anaesthetised (propofol Ce 3)', intv: 'rocuronium 0.6 mg/kg: clinical duration (T1 25 %) and spontaneous TOFR 0.9', sys: 'NEU',
  arms: { i: roc06 },
  measure: (R) => { const i = R.i!.rows; return m({ t1_25Min: tT1(i, T, 0.25), tofr09Min: afterMin(i, T + 600, tofRecovered) + 10, diaRecMin: afterMin(i, T + 300, (r) => (r.blockDia as number) < 0.1) + 5 }); },
  expect: [
    { m: 't1_25Min', lo: 30, hi: 40, src: 'research/12 NN-01 (T1 25 % at 30–40 min); tables §5d / §7 check 25: 31 min (Roc-label); Naguib' },
  ],
  owner: '7f nmb.ts / 7g roc PK',
});

// ---- NN-02 rocuronium 1.2 mg/kg (RSI) -----------------------------------------------------------------------------
add({
  id: 'NN-02', tier: 'P1', ctx: 'X-A TIVA vent', state: 'anaesthetised', intv: 'rocuronium 1.2 mg/kg (RSI): intubating conditions at 60 s; duration', sys: 'NEU',
  arms: { i: tiva([roc(1.2)], T + 6600, XA, 2) },
  measure: (R) => { const i = R.i!.rows; return m({ diaAt60: v(i, 'blockDia', T + 60), thumbAt60: v(i, 'blockTh', T + 60), tTof0S: tTof0(i, T), tMaxBlockS: tMaxBlock(i, T), t1_25Min: tT1(i, T, 0.25) }); },
  expect: [
    { m: 'diaAt60', lo: 0.9, hi: 1, src: 'research/12 NN-02: intubating conditions at 60 s (Miller NMB) — laryngeal/diaphragm block ≥ 90 % (tables §5d: larynx/diaphragm drive the airway)' },
    { m: 'tMaxBlockS', lo: 51, hi: 69, invert: true, src: 'tables §5d roc 1.2 mg/kg max block 1.0 min (Roc-label; ±15 % tables §7 convention)' },
    { m: 't1_25Min', lo: 57, hi: 77, src: 'tables §5d roc 1.2 mg/kg clinical duration 67 min (Roc-label; ±15 %)' },
  ],
  owner: '7f nmb.ts / 7g roc PK',
});

// ---- NN-03 succinylcholine 1 mg/kg --------------------------------------------------------------------------------
const sux1 = tiva([sux(1)], T + 1500, XA, 2);
const ctl = tiva([], T + 1500, XA, 2);
add({
  id: 'NN-03a', tier: 'P1', ctx: 'X-A TIVA vent', state: 'anaesthetised', intv: 'succinylcholine 1 mg/kg: fasciculation before the block', sys: 'NEU',
  arms: { i: sux1 },
  measure: (R) => { const i = R.i!.rows; const f = markAfter(R.i!, 'fasciculation', T); return m({ fascS: f, fascBeforeTof0: Number.isFinite(f) && f <= tTof0(i, T), marks: marksOf(R.i!, T) }); },
  expect: [{ m: 'fascBeforeTof0', event: true, src: 'research/12 NN-03 (fasciculation; Miller NMB): fasciculations precede the block' }],
  owner: '7f pipeline.ts (marks)',
});
add({
  id: 'NN-03b', tier: 'P1', ctx: 'X-A TIVA vent', state: 'anaesthetised', intv: 'succinylcholine 1 mg/kg: onset, recovery T1 90 %, no fade (phase I)', sys: 'NEU',
  arms: { i: sux1 },
  measure: (R) => { const i = R.i!.rows; const onset = i.filter((r) => (r.t as number) > T && (r.t as number) < T + 60 && (r.tofC as number) === 4); return m({ tTof0S: tTof0(i, T), t1_10Min: tT1(i, T, 0.1), t1_90Min: tT1(i, T, 0.9), minTofrOnset: onset.length ? Math.min(...onset.map((r) => r.tofR as number)) : NaN }); },
  expect: [
    { m: 'tTof0S', lo: 45, hi: 75, invert: true, src: 'research/12 NN-03 onset 60 s (Miller NMB); tables §5d block ~1 min (Sux-label)' },
    { m: 't1_90Min', lo: 8, hi: 10, src: 'research/12 NN-03 T1 90 % at 8–10 min (Miller NMB); the tables §5d label value is 10.9 min (Sux-label) — both quoted' },
    { m: 'minTofrOnset', lo: 0.9, hi: 1, src: 'tables §5d: succinylcholine phase I, no fade, TOFR ≈ 1 at any T1' },
  ],
  owner: '7f nmb.ts / 7g sux PK',
});
add({
  id: 'NN-03c', tier: 'P1', ctx: 'X-A TIVA vent', state: 'anaesthetised', intv: 'succinylcholine 1 mg/kg: plasma K⁺ rise vs control', sys: 'BLD',
  arms: { i: sux1, c: ctl },
  measure: (R) => m({ dKPeak: dMax(R.i!.rows, R.c!.rows, 'k', T, T + 1200), tPeakMin: r1f((R.i!.rows.reduce((b, r) => ((r.t as number) > T && (r.k as number) > (b.k as number) ? r : b), R.i!.rows[0]!).t as number - T) / 60) }),
  expect: [{ m: 'dKPeak', lo: 0.43, hi: 0.58, src: 'research/12 NN-03 (K +0.5, Miller NMB); tables §5c "Succinylcholine K rise +0.5" (B §4.9) — ±15 %' }],
  owner: '7c treatments.ts',
});

// ---- NN-04 cholinesterase variants --------------------------------------------------------------------------------
add({
  id: 'NN-04a', tier: 'P1', ctx: 'X-A TIVA vent · plasma cholinesterase heterozygous (`neuro.cholinesterase`)', state: 'heterozygous atypical cholinesterase', intv: 'succinylcholine 1 mg/kg: block duration (T1 90 %)', sys: 'NEU, PK',
  arms: { i: tiva([sux(1)], T + 3600, { neuro: { cholinesterase: 'heterozygous' } }, 5), n: sux1 },
  measure: (R) => m({ t1_90Min: tT1(R.i!.rows, T, 0.9), t1_90NormalMin: tT1(R.n!.rows, T, 0.9), ratio: r1f(tT1(R.i!.rows, T, 0.9) / tT1(R.n!.rows, T, 0.9)) }),
  expect: [{ m: 't1_90Min', lo: 20, hi: 30, src: 'research/12 NN-04 (heterozygous 20–30 min; Miller); tables §5d "heterozygous ×2" (Lee 2009)' }],
  owner: '7g PK (PCHE_CL_MULT)',
});
add({
  id: 'NN-04b', tier: 'P1', ctx: 'X-A TIVA vent · cholinesterase homozygous atypical', state: 'homozygous atypical cholinesterase', intv: 'succinylcholine 1 mg/kg: block duration (T1 90 %)', sys: 'NEU, PK',
  arms: { i: tiva([sux(1)], T + 10 * 3600, { neuro: { cholinesterase: 'homozygous' } }, 60) },
  measure: (R) => { const i = R.i!.rows; return m({ t1_90H: r1f(tT1(i, T, 0.9) / 60), t1_10H: r1f(tT1(i, T, 0.1) / 60), phase2Fade: mn(i.filter((r) => (r.tofC as number) === 4), 'tofR', T, T + 36000) }); },
  expect: [{ m: 't1_90H', lo: 4, hi: 8, src: 'research/12 NN-04 (homozygous 4–8 h; Miller); tables §5d "homozygous 4–8 h" (Sux-label; Lee 2009)' }],
  owner: '7g PK (PCHE_CL_MULT)',
});

// ---- NN-05 sugammadex ---------------------------------------------------------------------------------------------
// Dose times from the control roc 0.6 arm (calibration probe): T2 reappears at TT2; PTC 1–2 at TPTC.
export const TT2 = 2080; // roc 0.6 at 300 → TOF count 2 reappears at 2075 s (29.6 min after the dose)
export const TPTC = 1540; // roc 0.6 at 300 → PTC 1 at 1525 s, PTC 2 at 1560 s (20.7 min)
const sgxAt = (tDose: number, mgkg: number, pre: ReturnType<typeof roc>[] = [roc(0.6)]) => tiva([...pre, d(tDose, 'sugammadex', mgkg, 'mg/kg')], tDose + 1800, XA, 2);
add({
  id: 'NN-05a', tier: 'P1', ctx: 'X-A TIVA vent', state: 'roc 0.6, TOF count 2 reappearing', intv: 'sugammadex 2 mg/kg at T2: time to TOFR 0.9', sys: 'NEU',
  arms: { i: sgxAt(TT2, 2) },
  measure: (R) => { const i = R.i!.rows; return m({ tofCAtDose: v(i, 'tofC', TT2 - 2), tofr09Min: afterMin(i, TT2, tofRecovered), recur: markAfter(R.i!, 'recurarisation', TT2 + 60) }); },
  expect: [{ m: 'tofr09Min', lo: 1.9, hi: 2.5, invert: true, src: 'research/12 NN-05 (≈ 2 min; Naguib); tables §5d / §7 check 25: TOFR 0.9 median 2.2 min after sugammadex 2 mg/kg at T2 (Sgx-label; ±15 %)' }],
  owner: '7g sugammadex binding / 7f',
});
add({
  id: 'NN-05b', tier: 'P1', ctx: 'X-A TIVA vent', state: 'roc 0.6, deep block PTC 1–2', intv: 'sugammadex 4 mg/kg at PTC 1–2: time to TOFR 0.9', sys: 'NEU',
  arms: { i: sgxAt(TPTC, 4) },
  measure: (R) => { const i = R.i!.rows; return m({ ptcAtDose: v(i, 'ptc', TPTC - 2), tofCAtDose: v(i, 'tofC', TPTC - 2), tofr09Min: afterMin(i, TPTC, tofRecovered) }); },
  expect: [{ m: 'tofr09Min', lo: 2.1, hi: 4.3, invert: true, src: 'research/12 NN-05 (≈ 3 min; Naguib); tables §5d: sugammadex 4 mg/kg at 1–2 PTC, TOFR 0.9 median 2.7 min, IQR 2.1–4.3 (Sgx-label)' }],
  owner: '7g sugammadex binding / 7f',
});
add({
  id: 'NN-05c', tier: 'P1', ctx: 'X-A TIVA vent', state: 'roc 1.2 (RSI), 3 min', intv: 'sugammadex 16 mg/kg 3 min after roc 1.2 (immediate reversal)', sys: 'NEU',
  arms: { i: sgxAt(T + 180, 16, [roc(1.2)]) },
  measure: (R) => { const i = R.i!.rows; const t0 = T + 180; return m({ t1_10Min: afterMin(i, t0, (r) => (r.t1 as number) >= 0.1), tofr09Min: afterMin(i, t0, tofRecovered), diaAt5: v(i, 'blockDia', t0 + 300) }); },
  expect: [
    { m: 't1_10Min', lo: 1.0, hi: 1.4, invert: true, src: 'tables §5d: sugammadex 16 mg/kg 3 min after roc 1.2, T1 10 % ≈ 1.2 min (Sgx-label; ±15 %)' },
    { m: 'tofr09Min', lo: 1.3, hi: 1.7, invert: true, src: 'research/12 NN-05 (TOFR 0.9 at ≈ 1.5 min; Naguib; ±15 %)' },
  ],
  owner: '7g sugammadex binding / 7f',
});

// ---- NN-06 neostigmine ceiling ------------------------------------------------------------------------------------
export const TTOF1 = 1760; // roc 0.6 at 300 → TOF count 1 reappears at 1755 s (24.3 min)
export const TTOF4 = 2460; // roc 0.6 at 300 → TOF count 4 reappears at 2455 s (35.9 min)
const neoAt = (tDose: number) => tiva([roc(0.6), d(tDose, 'neostigmine', 0.05, 'mg/kg'), d(tDose, 'glycopyrrolate', 0.01, 'mg/kg')], tDose + 2400, XA, 5);
const rocCtl = tiva([roc(0.6)], TTOF4 + 2400, XA, 5);
add({
  id: 'NN-06a', tier: 'P1', ctx: 'X-A TIVA vent', state: 'roc 0.6, TOF count 4 (fade)', intv: 'neostigmine 50 µg/kg + glycopyrrolate 10 µg/kg at TOF 4: TOFR 0.9', sys: 'NEU, CIRC',
  arms: { i: neoAt(TTOF4), c: rocCtl },
  measure: (R) => { const i = R.i!.rows; const c = R.c!.rows; return m({ tofCAtDose: v(i, 'tofC', TTOF4 - 5), tofRAtDose: v(i, 'tofR', TTOF4 - 5), tofr09Min: afterMin(i, TTOF4, tofRecovered), tofr09CtlMin: afterMin(c, TTOF4, tofRecovered), dHrMax: dMax(i, c, 'hr', TTOF4, TTOF4 + 900) }); },
  expect: [{ m: 'tofr09Min', lo: 5, hi: 15, invert: true, src: 'research/12 NN-06 (TOFR 0.9 in 10–15 min from TOF 4; Fuchs-Buder; Kopman); tables §5d neostigmine onset 1–3 min, peak ~10 min' }],
  owner: '7f neostigmine.ts / 7g gamma row',
});
add({
  id: 'NN-06b', tier: 'P1', ctx: 'X-A TIVA vent', state: 'roc 0.6, TOF count 1', intv: 'neostigmine 50 µg/kg + glycopyrrolate at TOF 1: ceiling (no TOFR 0.9 in 15 min)', sys: 'NEU',
  arms: { i: neoAt(TTOF1), c: rocCtl },
  measure: (R) => { const i = R.i!.rows; const c = R.c!.rows; return m({ tofCAtDose: v(i, 'tofC', TTOF1 - 5), tofRAt15: v(i, 'tofR', TTOF1 + 900), tofRAt15Ctl: v(c, 'tofR', TTOF1 + 900), recovered15: i.some((r) => (r.t as number) > TTOF1 && (r.t as number) <= TTOF1 + 900 && tofRecovered(r)), tofr09Min: afterMin(i, TTOF1, tofRecovered) }); },
  expect: [{ m: 'recovered15', event: false, src: 'research/12 NN-06: from TOF 1 neostigmine cannot reach TOFR 0.9 in 10–15 min (ceiling; Fuchs-Buder; Kopman); tables §5d "cannot reverse from TOF count < 2"' }],
  owner: '7f neostigmine.ts',
});

// ---- NN-07 neostigmine at full recovery ---------------------------------------------------------------------------
export const TFULL = 7400; // roc 0.6 at 300 → TOFR 0.9 at 7325 s in the control (probe): given at TOFR ≥ 0.9
add({
  id: 'NN-07', tier: 'P2', ctx: 'X-A TIVA vent', state: 'roc 0.6 fully recovered (TOFR ≥ 0.9)', intv: 'neostigmine 50 µg/kg + glycopyrrolate at full recovery', sys: 'NEU',
  arms: { i: tiva([roc(0.6), d(TFULL, 'neostigmine', 0.05, 'mg/kg'), d(TFULL, 'glycopyrrolate', 0.01, 'mg/kg')], TFULL + 1800, XA, 5), c: tiva([roc(0.6)], TFULL + 1800, XA, 5) },
  measure: (R) => { const i = R.i!.rows; const c = R.c!.rows; return m({ tofRAtDose: v(i, 'tofR', TFULL - 5), dTofrMin: r1f(100 * (mn(i, 'tofR', TFULL, TFULL + 1200) - mn(c, 'tofR', TFULL, TFULL + 1200))) / 100, dT1Min: r1f(100 * (mn(i, 't1', TFULL, TFULL + 1200) - mn(c, 't1', TFULL, TFULL + 1200))) / 100 }); },
  expect: [{ m: 'dTofrMin', dir: -1, tol: 0.01, src: 'research/12 NN-07: neostigmine given after full recovery can cause a small fade/weakness (Miller NMB; Caldwell 1995; Herbstreit 2010 genioglossus) — direction only' }],
  dirOnly: true,
  owner: '7f neostigmine.ts',
});

// ---- NN-08 extubation at TOFR 0.6 → hypoxic challenge -------------------------------------------------------------
export const TR06 = 4950; // roc 0.6 at 300 → TOFR 0.6 at 4950 s in the control (probe)
const ext = (withRoc: boolean, hypoxic: boolean) => ({
  patient: XA, dt: 5, tEnd: TR06 + 1500,
  steps: [[1, A.device('ett'), 'ETT'], [1, A.vent(), 'VCV'], [1, A.tci('propofol', 3), 'TCI 3'], ...(withRoc ? [roc(0.6)] : []), [TR06 - 600, A.tci('propofol', 0), 'TCI off (wake-up)'],
    [TR06, A.device('none'), 'extubated'], [TR06, A.spont(0.21), 'spontaneous on air'], ...(hypoxic ? [[TR06 + 600, A.spont(0.12), 'hypoxic challenge FiO2 0.12']] : [])] as any,
});
add({
  id: 'NN-08a', tier: 'P2', ctx: 'X-A', state: 'extubated awake at TOFR ≈ 0.6 (roc 0.6, no reversal)', intv: 'extubation with residual block: upper-airway obstruction', sys: 'NEU, AIR',
  arms: { i: ext(true, false), c: ext(false, false) },
  measure: (R) => { const i = R.i!.rows; const c = R.c!.rows; return m({ tofRAtExt: v(i, 'tofR', TR06), consciousAtExt: v(i, 'conscious', TR06 + 60) as unknown as number, obstr: avg(i, 'obstr', TR06 + 60, TR06 + 600), obstrCtl: avg(c, 'obstr', TR06 + 60, TR06 + 600), dSpo2: r1f(avg(i, 'spo2', TR06 + 300, TR06 + 600) - avg(c, 'spo2', TR06 + 300, TR06 + 600)) }); },
  expect: [{ m: 'obstr', lo: 0.05, hi: 1, src: 'research/12 NN-08: residual block (TOFR < 0.9) impairs pharyngeal function and upper-airway patency (Eriksson 1997 Anesthesiology 87:1035; Eikermann 2003) — obstruction present' }],
  owner: '7f drive.ts (obstruction) → FU-6 airway',
});
add({
  id: 'NN-08b', tier: 'P2', ctx: 'X-A', state: 'extubated awake at TOFR ≈ 0.6', intv: 'hypoxic challenge FiO2 0.12: hypoxic ventilatory response vs no block', sys: 'LUNG, NEU',
  arms: { i: ext(true, true), c: ext(false, true), i0: ext(true, false), c0: ext(false, false) },
  measure: (R) => { const w0 = TR06 + 900, w1 = TR06 + 1500; const hvr = (a: Row[], b: Row[]) => avg(a, 'veSp', w0, w1) - avg(b, 'veSp', w0, w1); const hi = hvr(R.i!.rows, R.i0!.rows); const hc = hvr(R.c!.rows, R.c0!.rows); return m({ dVeBlock: r1f(hi), dVeNoBlock: r1f(hc), hvrRatio: r1f(100 * hi / hc) / 100, spo2Block: r1f(avg(R.i!.rows, 'spo2', w0, w1)), spo2NoBlock: r1f(avg(R.c!.rows, 'spo2', w0, w1)) }); },
  expect: [{ m: 'hvrRatio', lo: 0.6, hi: 0.8, invert: true, src: 'research/12 NN-08: partial block (TOFR 0.7) blunts the hypoxic ventilatory response by ≈ 30 % (Eriksson 1993 Anesthesiology 78:693; carotid-body nicotinic receptors) — ratio 0.7 ± 15 %' }],
  owner: '7b drive.ts (carotid body) / FU-6',
});

// ---- NN-09 volatile potentiation ----------------------------------------------------------------------------------
const TV = 900; // roc after 15 min of sevoflurane (brain near equilibrium)
add({
  id: 'NN-09', tier: 'P1', ctx: 'X-A vent', state: 'sevoflurane ≈ 1 MAC (15 min) vs TIVA', intv: 'rocuronium 0.6 mg/kg: clinical duration under sevoflurane vs TIVA', sys: 'NEU',
  arms: { i: G([vap(1, 1.9, 'sevoflurane', 6), roc(0.6, TV)], TV + 5400, XA, { dt: 5 }), c: G([[1, A.tci('propofol', 3), 'TCI 3'], roc(0.6, TV)], TV + 5400, XA, { dt: 5 }) },
  measure: (R) => { const a = tT1(R.i!.rows, TV, 0.25); const b = tT1(R.c!.rows, TV, 0.25); return m({ macBrainAtDose: v(R.i!.rows, 'macBrain', TV), t1_25SevoMin: a, t1_25TivaMin: b, prolongPct: r1f(100 * (a / b - 1)) }); },
  expect: [{ m: 'prolongPct', lo: 20, hi: 30, src: 'research/12 NN-09: duration +20–30 % under a volatile (Miller NMB; tables §5d interactions [TXT direction])' }],
  owner: '7f interactions.ts',
});

// ---- NN-10 magnesium ----------------------------------------------------------------------------------------------
add({
  id: 'NN-10', tier: 'P2', ctx: 'X-A TIVA vent', state: 'MgSO4 4 g IV over 10 min', intv: 'rocuronium 0.6 mg/kg after magnesium: onset and duration vs no magnesium', sys: 'NEU, BLD',
  arms: { i: tiva([[T - 600, A.drug('magnesium', 4, 'g', { overS: 600 }), 'MgSO4 4 g / 10 min'], roc(0.6)], T + 4800, XA, 2), c: tiva([roc(0.6)], T + 4800, XA, 2) },
  measure: (R) => { const i = R.i!.rows; const c = R.c!.rows; return m({ mgPlasma: r1f(10 * v(i, 'mg', T)) / 10, dOnsetS: tTof0(i, T) - tTof0(c, T), dDurMin: r1f(tT1(i, T, 0.25) - tT1(c, T, 0.25)) }); },
  expect: [
    { m: 'dOnsetS', dir: -1, tol: 0, src: 'research/12 NN-10: magnesium shortens onset (tables §5d; 7f interactions; Fuchs-Buder 1995 BJA 74:405 [vecuronium])' },
    { m: 'dDurMin', dir: 1, tol: 1, src: 'research/12 NN-10: magnesium prolongs duration (tables §5d; Kussman 1997 BJA 79:122 [rocuronium])' },
  ],
  dirOnly: true,
  owner: '7f interactions.ts ← 7c plasma Mg',
});

// ---- NN-11/12 myasthenia and Lambert–Eaton: ED95 by peak block over a dose ladder ---------------------------------
const LAD_ROC = [0.05, 0.1, 0.15, 0.2, 0.3, 0.45];
const LAD_SUX = [0.1, 0.2, 0.3, 0.5, 0.8, 1.2];
const ladder = (drug: 'rocuronium' | 'succinylcholine', doses: number[], nm: string): Record<string, ReturnType<typeof G>> =>
  Object.fromEntries(doses.map((x) => [`${nm}${x}`, tiva([d(T, drug, x, 'mg/kg')], T + 600, nm === 'normal' ? XA : { neuro: { nm } }, 5)]));
/** ED95 (mg/kg) by log-linear interpolation of the peak thumb block across the ladder. */
const ed95 = (R: Record<string, ArmResult>, doses: number[], nm: string): number => {
  const pk = doses.map((x) => mx(R[`${nm}${x}`]!.rows, 'blockTh', T, T + 600));
  for (let k = 1; k < doses.length; k++) if (pk[k - 1]! < 0.95 && pk[k]! >= 0.95) { const f = (0.95 - pk[k - 1]!) / (pk[k]! - pk[k - 1]!); return Math.exp(Math.log(doses[k - 1]!) + f * (Math.log(doses[k]!) - Math.log(doses[k - 1]!))); }
  return pk[0]! >= 0.95 ? doses[0]! * 0.5 /* below the ladder */ : NaN;
};
const edCell = (id: string, tier: 'P2' | 'P3', nm: string, state: string, drug: 'rocuronium' | 'succinylcholine', lo: number, hi: number, src: string): void => {
  const doses = drug === 'rocuronium' ? LAD_ROC : LAD_SUX;
  add({
    id, tier, ctx: `X-A TIVA vent · neuro.nm ${nm}`, state, intv: `${drug} dose ladder ${doses.join('/')} mg/kg: ED95 vs normal`, sys: 'NEU',
    arms: { ...ladder(drug, doses, 'normal'), ...ladder(drug, doses, nm) },
    measure: (R) => { const a = ed95(R, doses, nm); const b = ed95(R, doses, 'normal'); return m({ ed95: r1f(1000 * a) / 1000, ed95Normal: r1f(1000 * b) / 1000, ratio: r1f(100 * a / b) / 100 }); },
    expect: [{ m: 'ratio', lo, hi, src }],
    owner: '7f interactions.ts',
  });
};
edCell('NN-11a', 'P2', 'myasthenia', 'myasthenia gravis', 'rocuronium', 0.1, 0.5, 'research/12 NN-11: rocuronium ED95 ×0.1–0.5 in myasthenia (Miller NMB; tables §1.5/§5d)');
edCell('NN-11b', 'P2', 'myasthenia', 'myasthenia gravis', 'succinylcholine', 2.2, 3.0, 'research/12 NN-11: succinylcholine ED95 ×2.6 in myasthenia (Eisenkraft 1988 Anesthesiology 69:760; Miller NMB; ±15 %)');
add({
  id: 'NN-12', tier: 'P3', ctx: 'X-A TIVA vent · neuro.nm lambertEaton', state: 'Lambert–Eaton', intv: 'rocuronium and succinylcholine dose ladders: ED95 vs normal', sys: 'NEU',
  arms: { ...ladder('rocuronium', LAD_ROC, 'normal'), ...ladder('rocuronium', LAD_ROC, 'lambertEaton'), ...Object.fromEntries(Object.entries(ladder('succinylcholine', LAD_SUX, 'normal')).map(([k, a]) => [`s${k}`, a])), ...Object.fromEntries(Object.entries(ladder('succinylcholine', LAD_SUX, 'lambertEaton')).map(([k, a]) => [`s${k}`, a])) },
  measure: (R) => { const S = Object.fromEntries(Object.entries(R).filter(([k]) => k.startsWith('s')).map(([k, x]) => [k.slice(1), x])); const rr = ed95(R, LAD_ROC, 'lambertEaton') / ed95(R, LAD_ROC, 'normal'); const rs = ed95(S, LAD_SUX, 'lambertEaton') / ed95(S, LAD_SUX, 'normal'); return m({ rocRatio: r1f(100 * rr) / 100, suxRatio: r1f(100 * rs) / 100, rocRatioM1: r1f(100 * (rr - 1)) / 100, suxRatioM1: r1f(100 * (rs - 1)) / 100 }); },
  expect: [
    { m: 'rocRatioM1', dir: -1, tol: 0.1, src: 'research/12 NN-12: Lambert–Eaton is sensitive to non-depolarisers (Miller NMB) — direction only' },
    { m: 'suxRatioM1', dir: -1, tol: 0.1, src: 'research/12 NN-12: Lambert–Eaton is sensitive to succinylcholine (Miller NMB) — direction only' },
  ],
  dirOnly: true,
  owner: '7f interactions.ts',
});

// ---- NN-13 burns (> 48 h) -----------------------------------------------------------------------------------------
const BURN = { neuro: { nm: 'burn' }, blood: { burns: 1 } };
add({
  id: 'NN-13a', tier: 'P2', ctx: 'X-A TIVA vent · burns > 48 h (`neuro.nm burn` + `blood.burns 1`)', state: 'major burn', intv: 'rocuronium 0.6 mg/kg: resistance (peak block, duration) vs normal', sys: 'NEU',
  arms: { i: tiva([roc(0.6)], T + 3600, BURN, 5), n: roc06 },
  measure: (R) => { const i = R.i!.rows; const n = R.n!.rows; return m({ peakBlock: mx(i, 'blockTh', T, T + 900), peakBlockNormal: mx(n, 'blockTh', T, T + 900), durRatio: r1f(100 * tT1(i, T, 0.25) / tT1(n, T, 0.25)) / 100, shortening: r1f(100 * (1 - tT1(i, T, 0.25) / tT1(n, T, 0.25))) / 100, tTof0S: tTof0(i, T), tTof0NormalS: tTof0(n, T) }); },
  expect: [{ m: 'shortening', dir: 1, tol: 0.1, src: 'research/12 NN-13: burns > 48 h → resistance to non-depolarisers: higher dose needed, shorter duration (Martyn 1992 Anesthesiology 76:822; tables §5d EC50 ×2.5 [TXT]) — direction only (1 − duration ratio > 0)' }],
  dirOnly: true,
  owner: '7f interactions.ts',
});
add({
  id: 'NN-13b', tier: 'P2', ctx: 'X-A TIVA vent · burns > 48 h', state: 'major burn', intv: 'succinylcholine 1 mg/kg: K⁺ rise vs control', sys: 'BLD, RHY',
  arms: { i: tiva([sux(1)], T + 1200, BURN, 5), c: tiva([], T + 1200, BURN, 5) },
  measure: (R) => m({ dKPeak: dMax(R.i!.rows, R.c!.rows, 'k', T, T + 1200), kPeak: mx(R.i!.rows, 'k', T, T + 1200), rhythms: R.i!.rhythms.map(([t, id]) => `${t}s ${id}`).join(',') }),
  expect: [{ m: 'dKPeak', lo: 5, hi: 7, src: 'research/12 NN-13 / tables §5c "Succinylcholine K rise: burns, denervation > 72 h +5–7" (B §4.9) — the upper end of the literature (Gronert 1975: up to +5–10)' }],
  owner: '7c treatments.ts',
});

// ---- NN-14 sugammadex under-dose → recurarisation -----------------------------------------------------------------
const TSU = T + 42 * 60; // Eleveld 2005: sugammadex 0.5 mg/kg 42 min after rocuronium 0.9 mg/kg
add({
  id: 'NN-14', tier: 'P3', ctx: 'X-A TIVA vent', state: 'roc 0.9 mg/kg, deep block at 42 min', intv: 'sugammadex 0.5 mg/kg (under-dose): recurarisation', sys: 'NEU',
  arms: { i: tiva([roc(0.9), d(TSU, 'sugammadex', 0.5, 'mg/kg')], TSU + 3600, XA, 5) },
  measure: (R) => { const i = R.i!.rows; const pk = i.filter((r) => (r.t as number) > TSU && (r.t as number) <= TSU + 1800).reduce((b, r) => ((r.tofR as number) * ((r.tofC as number) === 4 ? 1 : 0) > (b.v) ? { v: (r.tofR as number), t: r.t as number } : b), { v: 0, t: NaN }); const after1 = i.filter((r) => (r.t as number) > pk.t && (r.t as number) <= pk.t + 1800); const low = after1.length ? Math.min(...after1.map((r) => ((r.tofC as number) === 4 ? (r.tofR as number) : 0))) : NaN; return m({ tofrPeak: pk.v, peakMin: r1f((pk.t - TSU) / 60), tofrLowAfter: low, fall: r1f(100 * (pk.v - low)) / 100, recurMark: markAfter(R.i!, 'recurarisation', TSU) }); },
  expect: [{ m: 'fall', lo: 0.1, hi: 1, src: 'research/12 NN-14: after an under-dose TOFR falls again within 10–30 min (Naguib; Eleveld 2005 A&A 101:758: TOFR 0.7 → 0.3)' }],
  owner: '7g sugammadex binding / 7f',
});

