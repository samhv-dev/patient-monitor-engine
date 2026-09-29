// Coverage run NN — brain, ICP, LAST and the not-expressible cells (research/12 §5.3 NN-25 … NN-32). The TBI rig is
// the 7d engine tests' check-19 rig (organs-tbi.test.ts): profile `tbi` severity 1 (PVI 20, ICP0 12, autoregulation
// index 0.3, CSF reserve 10 mL), intubated, VCV 12 × 500, PEEP 5, FiO2 0.4 (PaCO2 38.5 on this main), no sedation, so
// every treatment effect is its own. "TBI ICP 25" is a 17.5 mL mass set at 60 s: ICP ≈ 25 at the 1200 s intervention
// (calibration probe: 15 mL → 20.1, 20 mL → 31.7 at 1200 s, after CSF buffering).
import { A, firstT, type ArmResult, type Row, type Step } from './runner.ts';
import {
  add, after, afterMin, AW, avg, d, dAt, dMax, dMin, G, m, mn, mx, pctMin, r1f, raw, stim, tci, TBI, v, vap, XA, XEH,
} from './spec.ts';

const ventT = (rr: number, fio2 = 0.4): Step => [1, A.vent({ rr, vtMl: 500, fio2, peep: 5 }), `VCV ${rr}×500 FiO2 ${fio2}`];
const tbiArm = (steps: Step[], tEnd: number, extra: Record<string, unknown> = {}) => ({ patient: TBI, steps: [[1, A.device('ett'), 'ETT'] as Step, ventT(12), ...steps], tEnd, dt: 5, ...extra });

// ---- NN-25 TBI, expanding haematoma 1 mL/min (tables §7 check 19) --------------------------------------------------
const TH = 300;
const haem = tbiArm([[TH, A.brain({ massRateMlPerMin: 1 }), 'haematoma 1 mL/min']], TH + 2700);
const haemCtl = tbiArm([], TH + 2700);
add({
  id: 'NN-25a', tier: 'P1', ctx: 'TBI (severity 1) intubated, VCV 12 × 500', state: 'expanding haematoma 1 mL/min', intv: 'time course of ICP', sys: 'BRN',
  arms: { i: haem },
  measure: (R) => { const i = R.i!.rows; return m({ icp0: r1f(v(i, 'icp', TH)), paco2: r1f(v(i, 'paco2', TH)), t20Min: afterMin(i, TH, (r) => (r.icp as number) >= 20), t40Min: afterMin(i, TH, (r) => (r.icp as number) >= 40), icpAtCpp60: r1f((i.find((r) => (r.t as number) > TH && (r.cppBr as number) < 60)?.icp as number) ?? NaN) }); },
  expect: [
    { m: 't20Min', lo: 10, hi: 15, invert: true, src: 'research/12 NN-25 / tables §7 check 19: ICP 12 → 20 by ~10–15 min' },
    { m: 't40Min', lo: 20, hi: 25, invert: true, src: 'research/12 NN-25 / tables §7 check 19: → 40 by ~20–25 min' },
  ],
  owner: '7d brain',
});
add({
  id: 'NN-25b', tier: 'P1', ctx: 'TBI intubated', state: 'expanding haematoma 1 mL/min', intv: 'Cushing response at CPP < 40: MAP ↑, HR ↓', sys: 'BRN, CIRC',
  arms: { i: haem, c: haemCtl },
  measure: (R) => { const i = R.i!.rows; const tc = firstT(i, TH, (r) => r.cushOn === true); const map0 = avg(i, 'map', TH - 60, TH); const hr0 = avg(i, 'hr', TH - 60, TH); return m({ cushOnMin: r1f((tc - TH) / 60), dMap: Number.isFinite(tc) ? r1f(avg(i, 'map', tc + 50, tc + 70) - map0) : NaN, hr0: r1f(hr0), hrSurge: Number.isFinite(tc) ? r1f(avg(i, 'hr', tc + 50, tc + 70)) : NaN, hrDropPct: Number.isFinite(tc) ? r1f(100 * (avg(i, 'hr', tc + 50, tc + 70) / hr0 - 1)) : NaN, hrNadir5Pct: Number.isFinite(tc) ? r1f(100 * (mn(i, 'hr', tc, tc + 300) / hr0 - 1)) : NaN, hrAt40Pct: r1f(100 * (avg(i, 'hr', TH + 2370, TH + 2400) / hr0 - 1)) }); },
  expect: [
    { m: 'dMap', lo: 30, hi: 50, src: 'research/12 NN-25 / tables §7 check 19 and §5.1: Cushing MAP +30–50 over 30–60 s' },
    { m: 'hrDropPct', lo: -40, hi: -20, src: 'tables §5.1 Cushing: HR −20–40 % with the surge (check 19: HR 80 → 45–55) — read over the same 50–70 s window as the MAP' },
  ],
  owner: '7d cushing.ts / 7a',
});
add({
  id: 'NN-25c', tier: 'P1', ctx: 'TBI intubated', state: 'expanding haematoma 1 mL/min, untreated 45 min', intv: 'herniation', sys: 'BRN, CIRC, RHY',
  arms: { i: haem },
  measure: (R) => { const i = R.i!.rows; const th = firstT(i, TH, (r) => r.herniated === true); return m({ herniated: Number.isFinite(th), herniationMin: r1f((th - TH) / 60), cppMin: mn(i, 'cppBr', TH, TH + 2700), icpMax: r1f(mx(i, 'icp', TH, TH + 2700)), lowCppLongestS: longestRun(i, TH, (r) => (r.cppBr as number) <= 10), pupil: v(i, 'pupil', TH + 2700), mapEnd: r1f(v(i, 'map', TH + 2700)), hrEnd: r1f(v(i, 'hr', TH + 2700)), rhythms: R.i!.rhythms.map(([t, x]) => `${t}s ${x}`).join(',') }); },
  expect: [{ m: 'herniated', event: true, src: 'research/12 NN-25: untreated expanding haematoma → herniation (tables §5.1; BTF)' }],
  owner: '7d brain',
});

// ---- NN-26 TBI ICP 25: seven interventions ------------------------------------------------------------------------
const TX = 1200;
const MASS: Step = [60, A.brain({ massMl: 17.5 }), 'haematoma 17.5 mL (ICP ≈ 25)'];
const icp25 = (steps: Step[], tEnd = TX + 2700) => tbiArm([MASS, ...steps], tEnd);
const icpCtl = icp25([]);
/** Longest continuous run (s) after t0 in which pred holds, on the sample grid. */
const longestRun = (rows: Row[], t0: number, f: (r: Row) => boolean): number => { let best = 0, cur = 0, last = NaN; for (const r of rows) { if ((r.t as number) <= t0) continue; if (f(r)) { cur += Number.isFinite(last) ? (r.t as number) - last : 0; best = Math.max(best, cur); } else cur = 0; last = r.t as number; } return best; };
const pctAt = (i: Row[], c: Row[], t: number) => r1f(100 * (v(i, 'icp', t) / v(c, 'icp', t) - 1));
add({
  id: 'NN-26a', tier: 'P1', ctx: 'TBI, ICP 25', state: 'raised ICP (mass)', intv: 'hyperventilation to a sustained PaCO2 ≈ 30 (RR 12 → 16)', sys: 'BRN, LUNG',
  // resume fix (2026-09-29): the first rig (RR 30, read when PaCO2 first crossed 30) read ICP 18 s after the change,
  // before the τ 10 s vascular response and the CBV followed (−14 %); at RR 30 PaCO2 then fell to 19 (−47 % at 10 min).
  arms: { i: icp25([[TX, A.vent({ rr: 16, vtMl: 500, fio2: 0.4, peep: 5 }), 'RR 16']]), c: icpCtl, hv: icp25([[TX, A.vent({ rr: 30, vtMl: 500, fio2: 0.4, peep: 5 }), 'RR 30']]) },
  measure: (R) => { const i = R.i!.rows; return m({ icpPre: r1f(v(i, 'icp', TX)), paco2At2: r1f(v(i, 'paco2', TX + 120)), paco2At10: r1f(v(i, 'paco2', TX + 600)), dIcpPctAt2: pctAt(i, R.c!.rows, TX + 120), dIcpPctAt10: pctAt(i, R.c!.rows, TX + 600), dCbfPctAt10: r1f(100 * (v(i, 'cbf', TX + 600) / v(R.c!.rows, 'cbf', TX + 600) - 1)), rr30Paco2At10: r1f(v(R.hv!.rows, 'paco2', TX + 600)), rr30DIcpPctAt10: pctAt(R.hv!.rows, R.c!.rows, TX + 600) }); },
  expect: [{ m: 'dIcpPctAt2', lo: -30, hi: -25, src: 'research/12 NN-26 (ICP −25 %); tables §7 check 19: hyperventilation to PaCO2 30, ICP −25–30 % in 1–2 min (BTF; Miller neuro)' }],
  owner: '7d brain',
});
add({
  id: 'NN-26b', tier: 'P1', ctx: 'TBI, ICP 25', state: 'raised ICP', intv: 'mannitol 0.5 g/kg: ICP at 20–40 min', sys: 'BRN, KID',
  arms: { i: icp25([d(TX, 'mannitol', 0.5, 'g/kg')]), c: icpCtl },
  measure: (R) => m({ icpPre: r1f(v(R.i!.rows, 'icp', TX)), dIcpPctMin20_40: pctMin(R.i!.rows, R.c!.rows, 'icp', TX + 1200, TX + 2400), dIcpPctAt30: pctAt(R.i!.rows, R.c!.rows, TX + 1800), tNadirMin: r1f((R.i!.rows.filter((r) => (r.t as number) > TX).reduce((b, r) => ((r.icp as number) - v(R.c!.rows, 'icp', r.t as number) < b.d ? { d: (r.icp as number) - v(R.c!.rows, 'icp', r.t as number), t: r.t as number } : b), { d: Infinity, t: NaN }).t - TX) / 60) }),
  expect: [{ m: 'dIcpPctMin20_40', lo: -30, hi: -25, src: 'research/12 NN-26: mannitol 0.5 g/kg ICP −25–30 % at 20–40 min (BTF; Miller neuro; tables §5.1 mannitol row)' }],
  owner: '7d brain (osmotherapy)',
});
add({
  id: 'NN-26c', tier: 'P1', ctx: 'TBI, ICP 25', state: 'raised ICP', intv: '3 % saline 250 mL: ICP (similar to mannitol)', sys: 'BRN, BLD',
  arms: { i: icp25([d(TX, 'hypertonicSaline', 250, 'mL', { concentrationPct: 3 })]), c: icpCtl },
  measure: (R) => m({ dIcpPctMin20_40: pctMin(R.i!.rows, R.c!.rows, 'icp', TX + 1200, TX + 2400), dIcpPctAt10: pctAt(R.i!.rows, R.c!.rows, TX + 600), dNaMax: r1f(dMax(R.i!.rows, R.c!.rows, 'na', TX, TX + 2400)) }),
  expect: [{ m: 'dIcpPctMin20_40', lo: -30, hi: -25, src: 'research/12 NN-26: HTS similar to mannitol (BTF; Miller neuro) — the mannitol band −25–30 %' }],
  owner: '7d brain (osmotherapy)',
});
add({
  id: 'NN-26d', tier: 'P1', ctx: 'TBI, ICP 25', state: 'raised ICP', intv: 'head-up 30°: ICP and CPP', sys: 'BRN',
  arms: { i: icp25([[TX, A.position(30), 'head-up 30°']]), c: icpCtl },
  measure: (R) => m({ dIcp: r1f(dAt(R.i!.rows, R.c!.rows, 'icp', TX + 300)), dCpp: r1f(dAt(R.i!.rows, R.c!.rows, 'cppBr', TX + 300)), dMap: r1f(dAt(R.i!.rows, R.c!.rows, 'map', TX + 300)) }),
  expect: [{ m: 'dIcp', lo: -7, hi: -5, src: 'research/12 NN-26: head-up 30° ICP −5–7 mmHg (BTF); tables §5.1 −5.6 (−3 to −8; HeadUp-meta 2024)' }],
  owner: '7d brain',
});
add({
  id: 'NN-26e', tier: 'P1', ctx: 'TBI, ICP 25', state: 'raised ICP', intv: 'propofol 1.5 mg/kg bolus: ICP ↓ with CPP risk', sys: 'BRN, CIRC',
  arms: { i: icp25([d(TX, 'propofol', 1.5, 'mg/kg')]), c: icpCtl },
  measure: (R) => m({ dIcpMin: dMin(R.i!.rows, R.c!.rows, 'icp', TX, TX + 900), dCppMin: dMin(R.i!.rows, R.c!.rows, 'cppBr', TX, TX + 900), dMapMin: dMin(R.i!.rows, R.c!.rows, 'map', TX, TX + 900), cppNadir: mn(R.i!.rows, 'cppBr', TX, TX + 900) }),
  expect: [
    { m: 'dIcpMin', dir: -1, tol: 1, src: 'research/12 NN-26: propofol lowers ICP (CMRO2–CBF coupling; Miller neuro) — direction' },
    { m: 'dCppMin', dir: -1, tol: 5, src: 'research/12 NN-26: with CPP risk (MAP falls more than ICP; BTF CPP 60–70) — direction' },
  ],
  dirOnly: true,
  owner: '7d brain / 7g',
});
add({
  id: 'NN-26f', tier: 'P1', ctx: 'TBI, ICP 25', state: 'raised ICP', intv: 'sevoflurane 1 vs 2 MAC: CBF and ICP', sys: 'BRN',
  arms: { s1: icp25([vap(TX, 2.16, 'sevoflurane', 6)]), s2: icp25([vap(TX, 4.3, 'sevoflurane', 6)]), c: icpCtl },
  measure: (R) => { const w0 = TX + 1200, w1 = TX + 1500; return m({ mac1: r1f(100 * avg(R.s1!.rows, 'macBrain', w0, w1)) / 100, mac2: r1f(100 * avg(R.s2!.rows, 'macBrain', w0, w1)) / 100, icp1: r1f(avg(R.s1!.rows, 'icp', w0, w1)), icp2: r1f(avg(R.s2!.rows, 'icp', w0, w1)), icpCtl: r1f(avg(R.c!.rows, 'icp', w0, w1)), dIcp2vs1: r1f(avg(R.s2!.rows, 'icp', w0, w1) - avg(R.s1!.rows, 'icp', w0, w1)), dCbf2vs1: r1f(100 * (avg(R.s2!.rows, 'cbf', w0, w1) - avg(R.s1!.rows, 'cbf', w0, w1))) / 100, map1: r1f(avg(R.s1!.rows, 'map', w0, w1)), map2: r1f(avg(R.s2!.rows, 'map', w0, w1)) }); },
  expect: [
    { m: 'dIcp2vs1', dir: 1, tol: 0.5, src: 'research/12 NN-26: sevoflurane above 1 MAC raises ICP (direct vasodilation; Matta 1999 Anesthesiology 91:677; Miller neuro) — direction' },
    { m: 'dCbf2vs1', dir: 1, tol: 0.02, src: 'research/12 NN-26: … and CBF (Matta 1999: MCA velocity +4 % at 0.5, +17 % at 1.5 MAC) — direction' },
  ],
  dirOnly: true,
  owner: '7d flow.ts / 7g cbfVaso',
});
add({
  id: 'NN-26g', tier: 'P1', ctx: 'TBI, ICP 25, ventilated', state: 'raised ICP', intv: 'ketamine 1 mg/kg: no ICP rise under controlled ventilation', sys: 'BRN',
  arms: { i: icp25([d(TX, 'ketamine', 1, 'mg/kg')]), c: icpCtl },
  measure: (R) => m({ dIcpMax: dMax(R.i!.rows, R.c!.rows, 'icp', TX, TX + 900), dCbfMax: r1f(100 * dMax(R.i!.rows, R.c!.rows, 'cbf', TX, TX + 900)) / 100, dMapMax: dMax(R.i!.rows, R.c!.rows, 'map', TX, TX + 900) }),
  expect: [{ m: 'dIcpMax', quiet: true, tol: 2, src: 'research/12 NN-26: ketamine does not raise ICP when ventilated (BTF; Himmelseher & Durieux 2005 A&A 101:524; Miller neuro) — quiet ±2 mmHg' }],
  dirOnly: true,
  owner: '7d flow.ts / 7g cbfVaso',
});

// ---- NN-27 tables §7 check 18 (MODELED): 75 y HTN under GA at MAP 65, then PaCO2 25 ---------------------------------
const T27L = 600, T27H = 1500;
// resume fix (2026-09-29): the first rig (RR 13, bleed 1400 mL) missed the premise — PaCO2 33, MAP 69.5 (CBF 0.90).
const c18 = { patient: XEH, dt: 5, tEnd: 3000, steps: [[1, A.device('ett'), 'ETT'], ventT(10, 0.25), tci(1, 'propofol', 3), [T27L, A.bleed(1500, 300), 'bleed 1500 mL / 5 min (MAP → 65)'], [T27H, A.vent({ rr: 40, vtMl: 500, fio2: 0.25, peep: 5 }), 'RR 40']] as Step[] };
add({
  id: 'NN-27a', tier: 'P1', ctx: 'X-E 75 y + HTN (cbfLL 75), TIVA, VCV 13 × 500', state: 'GA at MAP ≈ 65 (haemorrhage as the pure pressure change)', intv: 'CBF from pressure alone', sys: 'BRN, CIRC',
  arms: { i: c18 },
  measure: (R) => { const i = R.i!.rows; const b = avg(i, 'cbf', T27L - 60, T27L); return m({ mapBase: r1f(avg(i, 'map', T27L - 60, T27L)), paco2Base: r1f(avg(i, 'paco2', T27L - 60, T27L)), mapLow: r1f(avg(i, 'map', T27H - 60, T27H)), cppLow: r1f(avg(i, 'cppBr', T27H - 60, T27H)), paco2Low: r1f(avg(i, 'paco2', T27H - 60, T27H)), icpLow: r1f(avg(i, 'icp', T27H - 60, T27H)), cvpLow: r1f(avg(i, 'cvp', T27H - 60, T27H)), cbfLowRel: r1f(100 * avg(i, 'cbf', T27H - 60, T27H) / b) / 100 }); },
  expect: [{ m: 'cbfLowRel', lo: 0.6, hi: 0.8, invert: true, src: 'research/12 NN-27 / tables §7 check 18: CBF ≈ 70 % (±15 %) of the anaesthetised baseline from pressure alone' }],
  owner: '7d brain',
});
add({
  id: 'NN-27b', tier: 'P1', ctx: 'X-E 75 y + HTN, TIVA', state: 'GA at MAP ≈ 65', intv: 'hyperventilation PaCO2 40 → 25: CBF and PbtO2', sys: 'BRN, LUNG',
  arms: { i: c18 },
  measure: (R) => { const i = R.i!.rows; const b = avg(i, 'cbf', T27L - 60, T27L); const t25 = firstT(i, T27H, (r) => (r.paco2 as number) <= 25); return m({ tPaco2_25Min: r1f((t25 - T27H) / 60), cbfHypoRel: r1f(100 * v(i, 'cbf', t25) / b) / 100, pbto2: r1f(v(i, 'pbto2', t25)), pbto2Base: r1f(avg(i, 'pbto2', T27L - 60, T27L)), mapAt: r1f(v(i, 'map', t25)) }); },
  expect: [
    { m: 'cbfHypoRel', lo: 0.35, hi: 0.4, invert: true, src: 'research/12 NN-27 / tables §7 check 18: ≈ 35–40 % after hypocapnia' },
    { m: 'pbto2', lo: 10, hi: 15, invert: true, src: 'tables §7 check 18: PbtO2 25 → 10–15 (below the 20 threshold)' },
  ],
  owner: '7d brain',
});

// ---- NN-28 CO2 and O2 reactivity ---------------------------------------------------------------------------------
const T28 = 1500;
const co2Arm = (rr: number) => G([tci(1, 'propofol', 3), [300, A.vent({ rr, vtMl: 500 }), `RR ${rr}`]], T28, XA, { dt: 10 });
add({
  id: 'NN-28a', tier: 'P2', ctx: 'X-A TIVA, VCV × 500', state: 'GA', intv: 'PaCO2 ≈ 20 → 80 by respiratory rate (RR 30 / 20 / 12 / 8 / 5)', sys: 'BRN',
  arms: { r30: co2Arm(30), r20: co2Arm(20), r12: co2Arm(12), r8: co2Arm(8), r5: co2Arm(5) },
  measure: (R) => { const w = (k: string, key: string) => avg(R[k]!.rows, key, T28 - 120, T28); const slope = 100 * (w('r8', 'cbf') - w('r20', 'cbf')) / w('r12', 'cbf') / (w('r8', 'paco2') - w('r20', 'paco2')); return m({ paco2: ['r30', 'r20', 'r12', 'r8', 'r5'].map((k) => r1f(w(k, 'paco2'))).join('/'), cbf: ['r30', 'r20', 'r12', 'r8', 'r5'].map((k) => r1f(100 * w(k, 'cbf')) / 100).join('/'), icp: ['r30', 'r20', 'r12', 'r8', 'r5'].map((k) => r1f(w(k, 'icp'))).join('/'), slopePctPerMmHg: r1f(10 * slope) / 10 }); },
  expect: [{ m: 'slopePctPerMmHg', lo: 2, hi: 4, src: 'research/12 NN-28: CBF 2–4 %/mmHg PaCO2 in the 20–80 range (Miller, neurophysiology); tables §5.1 kCO2 0.02–0.04' }],
  owner: '7d flow.ts',
});
add({
  id: 'NN-28b', tier: 'P2', ctx: 'X-A TIVA, VCV 12 × 500', state: 'GA', intv: 'hypoxaemia (FiO2 0.1): CBF rises below PaO2 50', sys: 'BRN, LUNG',
  // resume fix (2026-09-29): the first rig (ventilator FiO2 0.10) was rejected — "fio2 must be a finite number in
  // 0.21–1"; hypoxaemia is made instead by shunt: FiO2 0.21 + lung condition ARDS at two severities.
  arms: {
    i: G([tci(1, 'propofol', 3), [600, A.vent({ fio2: 0.21, rr: 20 }), 'FiO2 0.21, RR 20 (normocapnia)'], [600, A.lung('ards', 0.7), 'ARDS 0.7']], 1500, XA, { dt: 10 }),
    j: G([tci(1, 'propofol', 3), [600, A.vent({ fio2: 0.21, rr: 20 }), 'FiO2 0.21, RR 20'], [600, A.lung('ards', 1), 'ARDS 1.0']], 1500, XA, { dt: 10 }),
    c: G([tci(1, 'propofol', 3), [600, A.vent({ fio2: 0.21 }), 'FiO2 0.21']], 1500, XA, { dt: 10 }),
  },
  measure: (R) => { const w = (k: string, key: string) => avg(R[k]!.rows, key, 1200, 1500); const hyp = w('j', 'pao2') < w('i', 'pao2') ? 'j' : 'i'; return m({ pao2Ctl: r1f(w('c', 'pao2')), pao2Ards07: r1f(w('i', 'pao2')), pao2Ards10: r1f(w('j', 'pao2')), paco2Hyp: r1f(w(hyp, 'paco2')), paco2Ctl: r1f(w('c', 'paco2')), dCbfPct: r1f(100 * (w(hyp, 'cbf') / w('c', 'cbf') - 1)), dIcp: r1f(w(hyp, 'icp') - w('c', 'icp')), sjvo2: r1f(w(hyp, 'sjvo2')) }); },
  expect: [{ m: 'dCbfPct', dir: 1, tol: 10, src: 'research/12 NN-28: CBF rises steeply below PaO2 50 (Miller neurophysiology; tables §5.1 O(): ×2 at PaO2 30) — direction, beyond 10 %' }],
  dirOnly: true,
  owner: '7d flow.ts',
});

// ---- NN-29 VF 5 min → ROSC (instructor) --------------------------------------------------------------------------
const TVF = 300, TROSC = 600;
const vf = (mode: 'modeled' | 'manual' = 'modeled') => G([tci(1, 'propofol', 3), [TVF, A.rhythm('vfCoarse'), 'VF'], [TROSC, A.rhythm('sinus'), 'sinus (instructor ROSC)']], TROSC + 900, XA, { dt: 5, mode });
export const vfArm = vf;
add({
  id: 'NN-29a', tier: 'P2', ctx: 'X-A TIVA, ventilated', state: 'VF untreated 5 min', intv: 'brain in no-flow: CBF, PbtO2, SjvO2', sys: 'BRN',
  arms: { i: vf() },
  measure: (R) => { const i = R.i!.rows; return m({ cbfMin: mn(i, 'cbf', TVF, TROSC), pbto2Pre: r1f(v(i, 'pbto2', TVF - 5)), pbto2End: r1f(v(i, 'pbto2', TROSC - 5)), dPbto2: r1f(v(i, 'pbto2', TROSC - 5) - v(i, 'pbto2', TVF - 5)), sjvo2Pre: r1f(v(i, 'sjvo2', TVF - 5)), sjvo2Min: r1f(mn(i, 'sjvo2', TVF, TROSC)), cbf0: mn(i, 'cbf', TVF, TROSC) <= 0.1 }); },
  expect: [
    { m: 'cbf0', event: true, src: 'research/12 NN-29: CBF 0 in untreated VF (FU-4 G4)' },
    { m: 'dPbto2', dir: -1, tol: 10, src: 'research/12 NN-29: PbtO2 falling in arrest — direction, beyond 10 mmHg' },
    { m: 'sjvo2Min', lo: 0, hi: 30, invert: true, src: 'research/12 NN-29: SjvO2 → 0 in no-flow (stagnant venous blood desaturates) — ≤ 30 % direction-only bound' },
  ],
  owner: '7d brain (flow.ts brainOxygen)',
});
add({
  id: 'NN-29b', tier: 'P2', ctx: 'X-A TIVA, ventilated', state: 'VF 5 min → ROSC (instructor sinus)', intv: 'post-ROSC cerebral hyperaemia', sys: 'BRN, CIRC',
  // resume fix (2026-09-29): after 5 min of UNTREATED VF the instructor's sinus gave no pulse (MAP 12 → agonal 690 s →
  // asystole 840 s), so the hyperaemia question could not be asked; the graded arm is TREATED: CPR from +1 min,
  // adrenaline 1 mg at +3 min, sinus at +5 min (FU-4's "VF + CPR + adrenaline → ROSC").
  arms: { i: G([tci(1, 'propofol', 3), [TVF, A.rhythm('vfCoarse'), 'VF'], [TVF + 60, A.cpr({ active: true, quality: 1 }), 'CPR'], d(TVF + 180, 'epinephrine', 1, 'mg'), [TROSC, A.cpr({ active: false }), 'CPR stop'], [TROSC, A.rhythm('sinus'), 'sinus (ROSC)']], TROSC + 900, XA, { dt: 5 }), u: vf() },
  measure: (R) => { const i = R.i!.rows; const pre = avg(i, 'cbf', TVF - 60, TVF); return m({ roscUntreated: !R.u!.rows.some((r) => (r.t as number) > TROSC + 60 && (r.t as number) <= TROSC + 300 && (r.pulseless === true || r.noEject === true)), cbfCprMean: r1f(100 * avg(i, 'cbf', TVF + 90, TROSC) / pre) / 100, rosc: !i.some((r) => (r.t as number) > TROSC + 60 && (r.t as number) <= TROSC + 300 && (r.pulseless === true || r.noEject === true)), mapPost: r1f(avg(i, 'map', TROSC + 60, TROSC + 300)), cbfPeakRel: r1f(100 * mx(i, 'cbf', TROSC, TROSC + 600) / pre) / 100, hyperaemia: r1f(100 * (mx(i, 'cbf', TROSC, TROSC + 600) / pre - 1)) / 100 }); },
  expect: [{ m: 'hyperaemia', dir: 1, tol: 0.1, src: 'research/12 NN-29: reactive hyperaemia after ROSC (then delayed hypoperfusion) (Miller neurophysiology; Sterz 1990) — direction, beyond +10 %' }],
  dirOnly: true,
  owner: '7d brain (post-ischaemic flow)',
});

// ---- NN-30 LAST: bupivacaine 2 mg/kg IV → lipid ------------------------------------------------------------------
const TB = 300, TL = 360;
const last = (lipid: boolean, drug = true) => AW([...(drug ? [d(TB, 'bupivacaine', 2, 'mg/kg')] : []), ...(lipid ? [d(TL, 'lipidEmulsion', 1.5, 'mL/kg')] : [])], TB + 1800, XA, { dt: 2 });
const onset = (rows: Row[], k: string, f: (r: Row) => boolean) => after(rows, TB, f);
add({
  id: 'NN-30a', tier: 'P2', ctx: 'X-A awake, spontaneous, air', state: 'accidental IV bupivacaine 2 mg/kg (LAST)', intv: 'CNS toxicity: seizure first, and its physiology', sys: 'NEU, BRN, LUNG',
  arms: { i: last(false), r: last(false, false) },
  measure: (R) => { const i = R.i!.rows; const ts = onset(i, 'seizure', (r) => r.seizure === true); const tcv = onset(i, 'cvE', (r) => (r.cvE as number) >= 0.5 || r.pulseless === true || (r.map as number) < 50); return m({ seizureS: ts, cvS: tcv, seizureFirst: Number.isFinite(ts) && (!Number.isFinite(tcv) || ts < tcv), cPeak: r1f(10 * mx(i, 'p_bupivacaine', TB, TB + 600)) / 10, dCmro2Seizure: Number.isFinite(ts) ? r1f(100 * (v(i, 'cmro2', TB + ts + 10) - v(R.r!.rows, 'cmro2', TB + ts + 10))) / 100 : NaN, dLactate: r1f(10 * dMax(i, R.r!.rows, 'lact', TB, TB + 900)) / 10 }); },
  expect: [
    { m: 'seizureFirst', event: true, src: 'research/12 NN-30: CNS toxicity (seizure) precedes cardiovascular collapse (ASRA 2020 LAST advisory; AAGBI 2010)' },
    { m: 'dCmro2Seizure', dir: 1, tol: 0.2, src: 'research/12 NN-31 context: a seizure raises CMRO2 (Miller neurophysiology: +200–300 % in status) — direction' },
  ],
  owner: '7g LAST_THRESHOLDS; seizure physiology: FU-7 (research/12 blocker "no seizure state")',
});
add({
  id: 'NN-30b', tier: 'P2', ctx: 'X-A awake, spontaneous, air', state: 'IV bupivacaine 2 mg/kg', intv: 'cardiovascular toxicity: collapse / ventricular arrhythmia', sys: 'CIRC, RHY',
  arms: { i: last(false), r: last(false, false) },
  measure: (R) => { const i = R.i!.rows; return m({ mapMin: mn(i, 'map', TB, TB + 1800), dMapMinPct: pctMin(i, R.r!.rows, 'map', TB, TB + 1800), cvEMax: r1f(100 * mx(i, 'cvE', TB, TB + 1800)) / 100, qrsNote: 'no QRS readout in this runner', arrest: i.some((r) => (r.t as number) > TB && (r.pulseless === true || r.noEject === true)), collapse: i.some((r) => (r.t as number) > TB && ((r.map as number) < 50 || r.pulseless === true)), rhythms: R.i!.rhythms.map(([t, x]) => `${t}s ${x}`).join(',') }); },
  expect: [{ m: 'collapse', event: true, src: 'research/12 NN-30: CV collapse / VF after a large IV bupivacaine dose (ASRA 2020; AAGBI 2010; tables LAST_THRESHOLDS cv 4 µg/mL)' }],
  owner: '7g LAST / 7a',
});
add({
  id: 'NN-30c', tier: 'P2', ctx: 'X-A awake, spontaneous, air', state: 'IV bupivacaine 2 mg/kg', intv: 'lipid emulsion 20 % 1.5 mL/kg at +1 min vs no lipid', sys: 'CIRC, PK',
  arms: { i: last(true), c: last(false) },
  measure: (R) => m({ dMapMin: dMin(R.i!.rows, R.c!.rows, 'map', TL, TL + 1200), dMapMax: dMax(R.i!.rows, R.c!.rows, 'map', TL, TL + 1200), dMapAt5: r1f(dAt(R.i!.rows, R.c!.rows, 'map', TL + 300)), dCvE: r1f(100 * dMin(R.i!.rows, R.c!.rows, 'cvE', TL, TL + 1200)) / 100, dPlasma: r1f(10 * dMin(R.i!.rows, R.c!.rows, 'p_bupivacaine', TL, TL + 600)) / 10 }),
  expect: [{ m: 'dCvE', dir: -1, tol: 0.05, src: 'research/12 NN-30: lipid rescue lowers the cardiotoxic effect (lipid sink; ASRA 2020; AAGBI 2010) — direction' }],
  dirOnly: true,
  owner: '7g lipid row',
});

const T32 = 300;

// ---- NN-31 / NN-32 not expressible (probes) ------------------------------------------------------------------------
add({
  id: 'NN-31', tier: 'P3', ctx: 'X-A', state: 'status epilepticus', intv: 'condition probe (seizure state)', sys: 'BRN, LUNG, BLD',
  arms: { i: AW([raw(60, { kind: 'condition', id: 'statusEpilepticus', severity: 1 }, 'condition statusEpilepticus'), raw(60, { kind: 'condition', id: 'seizure', severity: 1 }, 'condition seizure')], 300, XA, { dt: 10 }) },
  measure: (R) => m({ rejected: R.i!.rejected.length }),
  expect: [],
  ne: 'no seizure state: the only seizure is 7g\'s LAST bus flag (`bus.cns.seizure`), read by nothing (research/11 §2.8; research/12 §5.3 blockers). Expected: CMRO2 ↑ 200–300 %, SpO2 ↓, lactate ↑, ICP ↑ (Miller neurophysiology). Owner: FU-7 (missing mechanisms)',
  owner: 'FU-7 (seizure state)',
});
add({
  id: 'NN-32', tier: 'P2', ctx: 'X-A awake → bag-mask', state: 'awake', intv: 'remifentanil 2 µg/kg rapid bolus: chest-wall rigidity probe', sys: 'LUNG, AIR',
  arms: { i: AW([d(T32, 'remifentanil', 2, 'mcg/kg'), [T32 + 60, A.vent({ rr: 12, vtMl: 500, fio2: 1 }), 'ventilated (proxy for BVM)']], T32 + 600, XA, { dt: 5 }), c: AW([[T32 + 60, A.vent({ rr: 12, vtMl: 500, fio2: 1 }), 'ventilated']], T32 + 600, XA, { dt: 5 }) },
  measure: (R) => m({ dCrs: r1f(dAt(R.i!.rows, R.c!.rows, 'crs', T32 + 120)), apnoea: R.i!.rows.some((r) => (r.t as number) > T32 && r.apnoea === true) }),
  expect: [],
  ne: 'no opioid chest-wall rigidity mechanism (research/12 §5.3 blockers); the probe measures Crs unchanged. Expected: Crs ↓, VT ↓ on bag-mask, ventilation difficult until NMB (Miller, opioids). Owner: FU-7',
  owner: 'FU-7 (opioid rigidity)',
});
