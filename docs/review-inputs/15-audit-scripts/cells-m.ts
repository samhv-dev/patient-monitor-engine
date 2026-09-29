// Coverage run NN — MANUAL twins (research/12 §2.2: every arrest cell and every P1 haemodynamic cell also runs in
// MANUAL). Q9 (reflex-free physiology vs the instructor's targets) is still open, so these are graded DIRECTION-ONLY,
// as runs BF and CM did.
import { A, firstT, type Step } from './runner.ts';
import { add, avg, dWin, G, m, mn, r1f, tci, TBI, v, XA } from './spec.ts';

const STEP = 600;
add({
  id: 'NN-M1', tier: 'P1', ctx: 'X-A intubated, ventilated, MANUAL', state: 'awake', intv: 'propofol TCI 2 → 4 → 6 → 8 µg/mL: MAP falls with Ce (twin of NN-15b)', sys: 'CIRC, NEU',
  arms: {
    i: G([tci(60, 'propofol', 2), tci(60 + STEP, 'propofol', 4), tci(60 + 2 * STEP, 'propofol', 6), tci(60 + 3 * STEP, 'propofol', 8)], 60 + 4 * STEP, XA, { dt: 5, mode: 'manual' }),
    c: G([], 60 + 4 * STEP, XA, { dt: 5, mode: 'manual' }),
  },
  measure: (R) => { const w = (k: number) => [60 + (k + 1) * STEP - 120, 60 + (k + 1) * STEP] as const; return m({ dMapCe2: r1f(dWin(R.i!.rows, R.c!.rows, 'map', ...w(0))), dMapCe8: r1f(dWin(R.i!.rows, R.c!.rows, 'map', ...w(3))), diCe4: r1f(avg(R.i!.rows, 'di', ...w(1))) }); },
  expect: [{ m: 'dMapCe8', dir: -1, tol: 3, src: 'research/12 NN-15 in MANUAL: the drug still lowers MAP (Q9 open: direction only)' }],
  dirOnly: true,
  owner: '7g PD in MANUAL (Q9)',
});
const TH = 300;
add({
  id: 'NN-M2', tier: 'P1', ctx: 'TBI intubated, VCV 13 × 500, MANUAL', state: 'expanding haematoma 1 mL/min', intv: 'Cushing: MAP ↑, HR ↓ (twin of NN-25b)', sys: 'BRN, CIRC',
  arms: { i: { patient: TBI, mode: 'manual', dt: 5, tEnd: TH + 2700, steps: [[1, A.device('ett'), 'ETT'], [1, A.vent({ rr: 13, vtMl: 500, fio2: 0.4, peep: 5 }), 'VCV 13×500'], [TH, A.brain({ massRateMlPerMin: 1 }), 'haematoma 1 mL/min']] as Step[] } },
  measure: (R) => { const i = R.i!.rows; const tc = firstT(i, TH, (r) => r.cushOn === true); const map0 = avg(i, 'map', TH - 60, TH); const hr0 = avg(i, 'hr', TH - 60, TH); return m({ t20Min: r1f((firstT(i, TH, (r) => (r.icp as number) >= 20) - TH) / 60), cushOnMin: r1f((tc - TH) / 60), dMap: Number.isFinite(tc) ? r1f(avg(i, 'map', tc + 50, tc + 70) - map0) : NaN, hrDropPct: r1f(100 * (avg(i, 'hr', TH + 2550, TH + 2700) / hr0 - 1)) }); },
  expect: [
    { m: 'dMap', dir: 1, tol: 10, src: 'tables §7 check 19 in MANUAL (the 7d MANUAL test measured +41.7) — direction' },
    { m: 'hrDropPct', dir: -1, tol: 10, src: 'tables §7 check 19 in MANUAL — direction' },
  ],
  dirOnly: true,
  owner: '7d cushing.ts in MANUAL',
});
add({
  id: 'NN-M3', tier: 'P2', ctx: 'X-A TIVA, ventilated, MANUAL', state: 'VF untreated 5 min', intv: 'brain in no-flow (twin of NN-29a)', sys: 'BRN',
  arms: { i: G([tci(1, 'propofol', 3), [300, A.rhythm('vfCoarse'), 'VF'], [600, A.rhythm('sinus'), 'sinus']], 1500, XA, { dt: 5, mode: 'manual' }) },
  measure: (R) => { const i = R.i!.rows; return m({ cbfMin: mn(i, 'cbf', 300, 600), cbf0: mn(i, 'cbf', 300, 600) <= 0.1, dPbto2: r1f(v(i, 'pbto2', 595) - v(i, 'pbto2', 295)), cbfAfter: r1f(100 * avg(i, 'cbf', 700, 900)) / 100 }); },
  expect: [{ m: 'cbf0', event: true, src: 'research/12 NN-29 in MANUAL: no flow in VF (arrest cell; FU-4 G4)' }],
  dirOnly: true,
  owner: '7d brain in MANUAL',
});
