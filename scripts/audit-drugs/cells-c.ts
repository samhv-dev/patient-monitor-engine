// DI group C — vasopressors × β-blockade × volatile × acidosis, vasodilators × preload-dependent states, inotropes
// (matrix DI-04, DI-05, DI-09a, DI-10, DI-11, DI-12, DI-33, DI-34, DI-35, DI-41, DI-42 plus the acidosis and
// tachyphylaxis cells the brief adds).
import { A } from './runner.ts';
import { add, tMin, arrestIn, ASx, BB, CL2, CL3, COPD3, d, dMax, dMin, HF, hemo, inf, m, mn, mx, MSx, pctMax, pctMin, pctWin, RVF, SEPW, T, TB, TS, V, vap, XA, type Expect } from './spec.ts';

const eph = (t: number) => d(t, 'ephedrine', 10, 'mg');
const phe = (t: number) => d(t, 'phenylephrine', 100, 'mcg');
const epi = (t: number) => d(t, 'epinephrine', 100, 'mcg');
const NE = (t: number, r = 0.1) => inf(t, 'norepinephrine', r, 'mcg/kg/min');

// ---- DI-04: β-blockade × ephedrine / phenylephrine / class III -------------------------------------------------------
add({ id: 'DI-04a', tier: 'P1', ctx: 'betaBlocked vs X-A', state: 'GA ventilated', intv: 'ephedrine 10 mg', sys: 'CIRC',
  arms: { i: V([eph(T)], T + 900, BB), c: V([], T + 900, BB), ri: V([eph(T)]), rc: V([]) },
  measure: (R) => { const bb = pctMax(R.i!.rows, R.c!.rows, 'map', T, T + 600); const xa = pctMax(R.ri!.rows, R.rc!.rows, 'map', T, T + 600);
    return m({ mapRiseBB: bb, mapRiseXA: xa, ratio: Math.round((bb / xa) * 100) / 100, hrRiseBB: dMax(R.i!.rows, R.c!.rows, 'hr', T, T + 600), hrRiseXA: dMax(R.ri!.rows, R.rc!.rows, 'hr', T, T + 600) }); },
  expect: [{ m: 'mapRiseXA', lo: 8, hi: 25, src: 'tables §6.2: ephedrine 10 mg MAP/SVR +10–15 %, HR +10–15 %' },
    { m: 'ratio', lo: 0.3, hi: 0.7, src: 'tables §1.5 / §7 17b: ephedrine response ×0.5 when chronically β-blocked' }],
  owner: '7g combine.ts betaBlunt' });
add({ id: 'DI-04b', tier: 'P1', ctx: 'betaBlocked vs X-A', state: 'GA ventilated', intv: 'phenylephrine 100 µg', sys: 'CIRC',
  arms: { i: V([phe(T)], T + 900, BB), c: V([], T + 900, BB), ri: V([phe(T)]), rc: V([]) },
  measure: (R) => { const bb = pctMax(R.i!.rows, R.c!.rows, 'map', T, T + 600); const xa = pctMax(R.ri!.rows, R.rc!.rows, 'map', T, T + 600);
    return m({ mapRiseBB: bb, mapRiseXA: xa, ratio: Math.round((bb / xa) * 100) / 100, hrDropBB: dMin(R.i!.rows, R.c!.rows, 'hr', T, T + 600), hrDropXA: dMin(R.ri!.rows, R.rc!.rows, 'hr', T, T + 600) }); },
  expect: [{ m: 'mapRiseXA', lo: 15, hi: 30, src: 'tables §7 check 1 / 7g gate: phenylephrine 100 µg MAP +15–25 mmHg (here as %)' },
    { m: 'ratio', lo: 0.85, hi: 1.3, src: 'the α1 response is intact under β-blockade (tables §1.5; Miller ch. 14)' }],
  owner: '7g' });
add({ id: 'DI-04c', tier: 'P1', ctx: 'betaBlocked vs X-A', state: 'class III haemorrhage (30 %)', intv: 'bleed 1500 mL / 10 min (the state itself)', sys: 'CIRC',
  arms: { i: V(CL3, 1800, BB), ri: V(CL3, 1800) },
  measure: (R) => m({ hrPeakBB: mx(R.i!.rows, 'hr', 600, 1800), hrPeakXA: mx(R.ri!.rows, 'hr', 600, 1800), sbpMinBB: mn(R.i!.rows, 'sbp', 600, 1800), sbpMinXA: mn(R.ri!.rows, 'sbp', 600, 1800),
    coMinBB: Math.round(mn(R.i!.rows, 'co', 600, 1800) * 100) / 100, coMinXA: Math.round(mn(R.ri!.rows, 'co', 600, 1800) * 100) / 100, lactBB: mx(R.i!.rows, 'lact', 600, 1800) }),
  expect: [{ m: 'hrPeakBB', lo: 80, hi: 99, src: 'tables §7 17b: HR 80–95 (shock index < 1 despite shock)' },
    { m: 'sbpMinBB', lo: 65, hi: 82, invert: true, src: 'tables §7 17b: SBP 65–80, hypotension earlier than 17a' },
    { m: 'hrPeakXA', lo: 115, hi: 145, src: 'tables §7 17a: HR 120–140 without β-blockade' }],
  owner: '7a baroreflex (β-blocked profile)' });
add({ id: 'DI-05', tier: 'P2', ctx: 'betaBlocked vs X-A', state: 'GA ventilated', intv: 'adrenaline 100 µg IV', sys: 'CIRC RHY',
  arms: { i: V([epi(T)], T + 600, BB), c: V([], T + 600, BB), ri: V([epi(T)], T + 600), rc: V([], T + 600) },
  measure: (R) => { const bb = pctMax(R.i!.rows, R.c!.rows, 'map', T, T + 300); const xa = pctMax(R.ri!.rows, R.rc!.rows, 'map', T, T + 300);
    return m({ mapRiseBB: bb, mapRiseXA: xa, excessPct: Math.round((bb - xa) * 10) / 10, hrMinBB: dMin(R.i!.rows, R.c!.rows, 'hr', T, T + 300), hrMaxBB: dMax(R.i!.rows, R.c!.rows, 'hr', T, T + 300), hrMaxXA: dMax(R.ri!.rows, R.rc!.rows, 'hr', T, T + 300) }); },
  expect: [{ m: 'excessPct', dir: 1, tol: 2, src: 'unopposed α under non-selective β-blockade: a larger pressor response (Miller ch. 14)' },
    { m: 'hrMinBB', dir: -1, tol: 2, src: 'reflex bradycardia accompanies the unopposed α rise (Miller ch. 14)' }],
  owner: '7g combine.ts' });

// ---- vasopressor × volatile and × acidosis --------------------------------------------------------------------------
add({ id: 'DI-55', tier: 'P1', ctx: 'X-A vent, sevoflurane ≈ 1 MAC', state: 'GA volatile', intv: 'phenylephrine 100 µg under sevoflurane vs TIVA-free baseline', sys: 'CIRC',
  arms: { i: V([vap(60, 'sevoflurane', 2.5, 4), phe(1200)], 1800), c: V([vap(60, 'sevoflurane', 2.5, 4)], 1800), ri: V([phe(1200)], 1800), rc: V([], 1800) },
  measure: (R) => m({ macBrain: Math.round(mx(R.c!.rows, 'macBrain', 1150, 1200) * 100) / 100, mapRiseVolatile: pctMax(R.i!.rows, R.c!.rows, 'map', 1200, 1500), mapRiseAwake: pctMax(R.ri!.rows, R.rc!.rows, 'map', 1200, 1500),
    hrDropVolatile: dMin(R.i!.rows, R.c!.rows, 'hr', 1200, 1500), hrDropAwake: dMin(R.ri!.rows, R.rc!.rows, 'hr', 1200, 1500),
    reflexRatio: Math.round((dMin(R.i!.rows, R.c!.rows, 'hr', 1200, 1500) / dMin(R.ri!.rows, R.rc!.rows, 'hr', 1200, 1500)) * 100) / 100 }),
  expect: [{ m: 'reflexRatio', lo: 0.2, hi: 0.7, src: 'Nagasaki 2001: sevoflurane 2 % lowers pressor baroreflex sensitivity 50–60 %, so the reflex bradycardia is ≈ 0.4× awake (7g volatile gvHr comment)' },
    { m: 'mapRiseVolatile', lo: 15, hi: 40, src: 'the α1 pressor effect itself is not volatile-dependent (tables §6.2)' }],
  owner: '7g / 7a baroreflex' });
add({ id: 'DI-56', tier: 'P1', ctx: 'X-A vent, metabolic acidosis (HCl load 2 mmol/kg)', state: 'acidaemia pH ≈ 7.2', intv: 'noradrenaline 0.1 µg/kg/min in acidosis vs normal pH', sys: 'CIRC BLD',
  // resume fix: 560 mmol gave pH 6.5; 140 mmol (2 mmol/kg) gives pH 7.22 on 3ff2fb0 (probe4)
  arms: { i: V([[60, A.metabolic({ acidMmol: 140, overS: 600 }), 'HCl 140 mmol / 10 min'], NE(900)], 2100), c: V([[60, A.metabolic({ acidMmol: 140, overS: 600 }), 'HCl 140 mmol / 10 min']], 2100), ri: V([NE(900)], 2100), rc: V([], 2100) },
  measure: (R) => m({ phAcid: Math.round(mn(R.c!.rows, 'ph', 850, 900) * 100) / 100, dMapAcid: dMax(R.i!.rows, R.c!.rows, 'map', 900, 1500), dMapNormal: dMax(R.ri!.rows, R.rc!.rows, 'map', 900, 1500),
    ratio: Math.round((dMax(R.i!.rows, R.c!.rows, 'map', 900, 1500) / dMax(R.ri!.rows, R.rc!.rows, 'map', 900, 1500)) * 100) / 100,
    svrPctAcid: pctWin(R.i!.rows, R.c!.rows, 'svr', 1300, 1500), svrPctNormal: pctWin(R.ri!.rows, R.rc!.rows, 'svr', 1300, 1500) }),
  expect: [{ m: 'phAcid', lo: 7.1, hi: 7.3, src: 'the rig aims at pH 7.2 (tables §5b.1 mineral-acid load)' },
    { m: 'ratio', lo: 0.4, hi: 0.85, src: 'catecholamine efficacy falls in acidaemia: ×(1 − 2.5·(7.4 − pH)) → ≈ 0.5 at pH 7.2 (tables §5b.1/§6.2; 7g pd.ts acidosisFactor)' }],
  owner: '7g pd.ts acidosisFactor' });
add({ id: 'DI-57', tier: 'P1', ctx: 'X-A vent, class II bleed', state: 'class II haemorrhage', intv: 'ephedrine 10 mg ×3 at 5-min intervals (tachyphylaxis)', sys: 'CIRC PK',
  arms: { i: V([...CL2, eph(TB), eph(TB + 300), eph(TB + 600)], 2400), c: V(CL2, 2400) },
  // resume fix: each dose's INCREMENT over the residual of the previous ones (the first run compared cumulative levels)
  measure: (R) => { const lvl = (t: number) => dMax(R.i!.rows, R.c!.rows, 'map', t - 10, t); const inc = (t: number) => Math.round((dMax(R.i!.rows, R.c!.rows, 'map', t, t + 240) - lvl(t)) * 10) / 10;
    return m({ rise1: inc(TB), rise2: inc(TB + 300), rise3: inc(TB + 600), ratio21: Math.round((inc(TB + 300) / inc(TB)) * 100) / 100, ratio31: Math.round((inc(TB + 600) / inc(TB)) * 100) / 100 }); },
  expect: [{ m: 'rise1', lo: 5, hi: 30, src: 'ephedrine 10 mg raises MAP 10–15 % (tables §6.2)' },
    { m: 'ratio21', lo: 0.4, hi: 0.95, invert: true, src: 'tachyphylaxis: each repeat ×0.7 (tables §6.2; 7g gate SVR increments 0.120/0.029/0.012)' }],
  owner: '7g tachy()' });

// ---- sepsis: noradrenaline, vasopressin, inotropes ------------------------------------------------------------------
add({ id: 'DI-10', tier: 'P1', ctx: 'X-A vent', state: 'septic shock warm (7e condition sepsis 1)', intv: 'noradrenaline 0.1 µg/kg/min; then + vasopressin 0.04 U/min', sys: 'CIRC',
  arms: { i: V([...SEPW, NE(TS)], TS + 1500), iv: V([...SEPW, NE(TS), inf(TS + 600, 'vasopressin', 0.04, 'units/min')], TS + 1500), c: V(SEPW, TS + 1500), ri: V([NE(TS)], TS + 1500), rc: V([], TS + 1500) },
  measure: (R) => m({ mapSepticBase: mn(R.c!.rows, 'map', TS - 120, TS), hrSepticBase: mx(R.c!.rows, 'hr', TS - 120, TS), coSepticBase: Math.round(mx(R.c!.rows, 'co', TS - 120, TS) * 100) / 100, svrSepticBase: Math.round(mn(R.c!.rows, 'svr', TS - 120, TS)),
    dMapNEseptic: dMax(R.i!.rows, R.c!.rows, 'map', TS, TS + 600), dMapNEhealthy: dMax(R.ri!.rows, R.rc!.rows, 'map', TS, TS + 600),
    respRatio: Math.round((dMax(R.i!.rows, R.c!.rows, 'map', TS, TS + 600) / dMax(R.ri!.rows, R.rc!.rows, 'map', TS, TS + 600)) * 100) / 100,
    dMapVasopressinAdded: dMax(R.iv!.rows, R.i!.rows, 'map', TS + 600, TS + 1500) }),
  expect: [{ m: 'respRatio', lo: 0.3, hi: 0.85, src: 'reduced catecholamine responsiveness in septic shock (tables §5e vasoResp; Levy 2018)' },
    { m: 'dMapVasopressinAdded', lo: 5, hi: 25, src: 'vasopressin 0.04 U/min adds ≈ +40 % SVR and is not blunted by vasoplegia/acidosis (VASST 2008; tables §6.2)' }],
  owner: '7g / 7e' });
add({ id: 'DI-12', tier: 'P2', ctx: 'class III bleed vs HFrEF', state: 'hypovolaemia vs low-output failure', intv: 'dobutamine 5 µg/kg/min', sys: 'CIRC',
  arms: { hb: V([...CL3, inf(TB, 'dobutamine', 5, 'mcg/kg/min')], 2400), hbc: V(CL3, 2400), hf: V([inf(T, 'dobutamine', 5, 'mcg/kg/min')], T + 900, HF), hfc: V([], T + 900, HF) },
  measure: (R) => m({ coPctHFrEF: pctWin(R.hf!.rows, R.hfc!.rows, 'co', T + 480, T + 900), hrDHFrEF: dMax(R.hf!.rows, R.hfc!.rows, 'hr', T, T + 900), mapPctHFrEF: pctWin(R.hf!.rows, R.hfc!.rows, 'map', T + 480, T + 900),
    coPctBleed: pctWin(R.hb!.rows, R.hbc!.rows, 'co', TB + 480, TB + 900), hrDBleed: dMax(R.hb!.rows, R.hbc!.rows, 'hr', TB, TB + 900), mapPctBleed: pctWin(R.hb!.rows, R.hbc!.rows, 'map', TB + 480, TB + 900) }),
  expect: [{ m: 'coPctHFrEF', lo: 20, hi: 45, src: 'tables §7 check 20 / §6.2: dobutamine 5 µg/kg/min CO +20–40 % in low output' },
    { m: 'mapPctBleed', dir: -1, tol: 1, src: 'in hypovolaemia the β2 vasodilation drops MAP while HR rises (tables §7 check 20 companion; Miller ch. 14)' }],
  owner: '7g NR-7g-2 (inotrope venous return)' });
add({ id: 'DI-11', tier: 'P2', ctx: 'rvFailure profile', state: 'chronic RV failure', intv: 'milrinone 50 µg/kg over 10 min then 0.5 µg/kg/min; + noradrenaline 0.05 at +20 min', sys: 'CIRC',
  arms: { i: V([d(T, 'milrinone', 50, 'mcg/kg', { overS: 600 }), inf(T + 600, 'milrinone', 0.5, 'mcg/kg/min')], T + 2400, RVF, { dt: 10 }),
    n: V([d(T, 'milrinone', 50, 'mcg/kg', { overS: 600 }), inf(T + 600, 'milrinone', 0.5, 'mcg/kg/min'), NE(T + 1800, 0.05)], T + 2400, RVF, { dt: 10 }),
    c: V([], T + 2400, RVF, { dt: 10 }) },
  measure: (R) => m({ pvrPct: pctWin(R.i!.rows, R.c!.rows, 'pvr', T + 1500, T + 1800), svrPct: pctWin(R.i!.rows, R.c!.rows, 'svr', T + 1500, T + 1800),
    coPct: pctWin(R.i!.rows, R.c!.rows, 'co', T + 1500, T + 1800), mapPct: pctWin(R.i!.rows, R.c!.rows, 'map', T + 1500, T + 1800),
    mapPctWithNE: pctWin(R.n!.rows, R.c!.rows, 'map', T + 2100, T + 2400), svrPctWithNE: pctWin(R.n!.rows, R.c!.rows, 'svr', T + 2100, T + 2400), cvpPct: pctWin(R.i!.rows, R.c!.rows, 'cvp', T + 1500, T + 1800) }),
  expect: [{ m: 'pvrPct', lo: -60, hi: -20, src: 'tables §6.2: milrinone PVR ×0.75 and SVR −21 % at 0.5 µg/kg/min (label)' },
    { m: 'coPct', lo: 10, hi: 45, src: 'inodilation raises RV output in RV failure (label +30 % at 0.5)' },
    { m: 'mapPctWithNE', dir: 1, tol: 1, src: 'noradrenaline restores the systemic pressure the inodilator dropped (Miller ch. 14)' }],
  owner: '7g / 7a RV' });

// ---- vasodilators in preload-dependent states -----------------------------------------------------------------------
add({ id: 'DI-33', tier: 'P2', ctx: 'recent-MI profile (RV-infarct proxy: condition rvInfarct)', state: 'RV infarct', intv: 'GTN 400 µg then fluid 500 mL', sys: 'CIRC',
  arms: { i: V([[60, A.cond('rvInfarct', 1), 'RV infarct'], d(T + 300, 'nitroglycerin', 400, 'mcg'), [T + 900, A.fluid('balanced', 500, 300), 'fluid 500 mL / 5 min']], T + 1800),
    c: V([[60, A.cond('rvInfarct', 1), 'RV infarct']], T + 1800) },
  measure: (R) => m({ cvpBase: mx(R.c!.rows, 'cvp', T, T + 300), pawpBase: mn(R.c!.rows, 'pawp', T, T + 300), mapBase: mn(R.c!.rows, 'map', T, T + 300),
    mapPctGtn: pctMin(R.i!.rows, R.c!.rows, 'map', T + 300, T + 900), mapDeltaFluid: dMax(R.i!.rows, R.c!.rows, 'map', T + 900, T + 1500), arrest: arrestIn(R.i!.rows, T, T + 1800) }),
  expect: [{ m: 'mapPctGtn', lo: -35, hi: -20, src: 'tables §7 check 15: NTG 400 µg → MAP −20–30 % in RV infarct' },
    { m: 'mapDeltaFluid', lo: 5, hi: 15, src: 'tables §7 check 15: 500 mL fluid → MAP +5–10' }],
  owner: '7a (RV infarct) / 7g' });
add({ id: 'DI-34', tier: 'P2', ctx: 'severe MS 55 y and severe AS 75 y', state: 'fixed-orifice valve lesion', intv: 'GTN 1 µg/kg/min for 10 min', sys: 'CIRC',
  arms: { ms: V([inf(T, 'nitroglycerin', 1, 'mcg/kg/min')], T + 900, MSx), msc: V([], T + 900, MSx), as: V([inf(T, 'nitroglycerin', 1, 'mcg/kg/min')], T + 900, ASx), asc: V([], T + 900, ASx), ra: V([inf(T, 'nitroglycerin', 1, 'mcg/kg/min')], T + 900), rc: V([], T + 900) },
  measure: (R) => m({ mapPctMS: pctMin(R.ms!.rows, R.msc!.rows, 'map', T, T + 600), coPctMS: pctMin(R.ms!.rows, R.msc!.rows, 'co', T, T + 600),
    mapPctAS: pctMin(R.as!.rows, R.asc!.rows, 'map', T, T + 600), cppPctAS: pctMin(R.as!.rows, R.asc!.rows, 'cppCor', T, T + 600), kIschAS: mn(R.as!.rows, 'kIsch', T, T + 600),
    mapPctHealthy: pctMin(R.ra!.rows, R.rc!.rows, 'map', T, T + 600), extraFallAS: Math.round((pctMin(R.as!.rows, R.asc!.rows, 'map', T, T + 600) - pctMin(R.ra!.rows, R.rc!.rows, 'map', T, T + 600)) * 10) / 10 }),
  expect: [{ m: 'mapPctHealthy', lo: -25, hi: -8, src: 'tables §6.2: GTN 1 µg/kg/min SVR ×0.85 with venodilation +10–15 % of V' },
    { m: 'extraFallAS', dir: -1, tol: 2, src: 'preload/afterload-dependent lesions collapse further than a normal heart with a vasodilator (Barash, valvular disease; R53 state-dependence)' }],
  owner: 'FU-4 G2 (state-dependence)', fu4: true });
add({ id: 'DI-35', tier: 'P3', ctx: 'HOCM', state: 'dynamic LVOT obstruction', intv: 'vasodilator / inotrope', sys: 'CIRC', arms: {}, expect: [],
  owner: 'FU-7 state', ne: 'no LVOT-obstruction state (research/12 §1.2 "LVOT obstruction (missing)")' });
add({ id: 'DI-58', tier: 'P1', ctx: 'X-A vent, class II bleed', state: 'class II haemorrhage', intv: 'GTN 1 µg/kg/min in hypovolaemia vs normovolaemia', sys: 'CIRC',
  arms: { i: V([...CL2, inf(TB, 'nitroglycerin', 1, 'mcg/kg/min')], 2100), c: V(CL2, 2100), ri: V([inf(TB, 'nitroglycerin', 1, 'mcg/kg/min')], 2100), rc: V([], 2100) },
  measure: (R) => m({ mapPctBleed: pctMin(R.i!.rows, R.c!.rows, 'map', TB, TB + 600), mapPctNormal: pctMin(R.ri!.rows, R.rc!.rows, 'map', TB, TB + 600),
    extraFall: Math.round((pctMin(R.i!.rows, R.c!.rows, 'map', TB, TB + 600) - pctMin(R.ri!.rows, R.rc!.rows, 'map', TB, TB + 600)) * 10) / 10,
    coPctBleed: pctMin(R.i!.rows, R.c!.rows, 'co', TB, TB + 600), arrest: arrestIn(R.i!.rows, TB, TB + 900) }),
  expect: [{ m: 'extraFall', dir: -1, tol: 2, src: 'a venodilator on the steep part of the venous-return curve drops pressure further (R53; Barash)' }],
  owner: 'FU-4 G2', fu4: true });
add({ id: 'DI-59', tier: 'P2', ctx: 'X-A vent, hypertension after a stimulus', state: 'hypertensive response', intv: 'hydralazine 10 mg vs labetalol 10 mg (onset and offset)', sys: 'CIRC PK',
  arms: { h: V([d(T, 'hydralazine', 10, 'mg')], T + 2400, XA, { dt: 10 }), l: V([d(T, 'labetalol', 10, 'mg')], T + 2400, XA, { dt: 10 }), c: V([], T + 2400, XA, { dt: 10 }) },
  measure: (R) => m({ mapPctHydralazine: pctMin(R.h!.rows, R.c!.rows, 'map', T, T + 2400), tNadirHydralazineS: tMin(R.h!.rows, R.c!.rows, 'map', T, T + 2400), // resume fix: the first run matched a rounded minimum (NaN)
    hrHydralazine: dMax(R.h!.rows, R.c!.rows, 'hr', T, T + 2400), mapPctLabetalol: pctMin(R.l!.rows, R.c!.rows, 'map', T, T + 2400), hrLabetalol: dMin(R.l!.rows, R.c!.rows, 'hr', T, T + 2400) }),
  expect: [{ m: 'tNadirHydralazineS', lo: 300, hi: 1500, invert: true, src: 'hydralazine onset 5–20 min, peak 10–20 min (label; tables §6.2)' },
    { m: 'hrHydralazine', dir: 1, tol: 2, src: 'reflex tachycardia after a pure arterial dilator (label; the row notes it "emerges")' },
    { m: 'hrLabetalol', dir: -1, tol: 2, src: 'labetalol lowers HR 10–20 % (tables §6.2)' }],
  owner: '7g rows-cardiovascular.ts' });
add({ id: 'DI-41', tier: 'P1', ctx: 'betaBlocked vs X-A', state: 'anaphylaxis grade III (7e condition)', intv: 'adrenaline 100 µg ×2', sys: 'CIRC LUNG',
  arms: { i: V([[60, A.cond('anaphylaxis', 1), 'anaphylaxis 1'], d(240, 'epinephrine', 100, 'mcg'), d(360, 'epinephrine', 100, 'mcg')], 1500, BB),
    c: V([[60, A.cond('anaphylaxis', 1), 'anaphylaxis 1']], 1500, BB),
    ri: V([[60, A.cond('anaphylaxis', 1), 'anaphylaxis 1'], d(240, 'epinephrine', 100, 'mcg'), d(360, 'epinephrine', 100, 'mcg')], 1500),
    rc: V([[60, A.cond('anaphylaxis', 1), 'anaphylaxis 1']], 1500) },
  measure: (R) => m({ mapNadirBB: mn(R.c!.rows, 'map', 60, 1500), dMapEpiBB: dMax(R.i!.rows, R.c!.rows, 'map', 240, 900), dMapEpiXA: dMax(R.ri!.rows, R.rc!.rows, 'map', 240, 900),
    resistanceRatio: Math.round((dMax(R.i!.rows, R.c!.rows, 'map', 240, 900) / dMax(R.ri!.rows, R.rc!.rows, 'map', 240, 900)) * 100) / 100,
    arrestBB: arrestIn(R.i!.rows, 60, 1500), arrestXA: arrestIn(R.ri!.rows, 60, 1500), arrestUntreated: arrestIn(R.rc!.rows, 60, 1500) }),
  expect: [{ m: 'resistanceRatio', lo: 0.2, hi: 0.8, src: 'adrenaline resistance in β-blocked anaphylaxis (AAGBI/Resuscitation Council guidance; glucagon is the named rescue — absent here)' },
    { m: 'dMapEpiXA', lo: 10, hi: 60, src: 'adrenaline 50–100 µg restores pressure in grade III anaphylaxis (AAGBI)' }],
  owner: '7g / 7e' });
add({ id: 'DI-42', tier: 'P2', ctx: 'X-A vent', state: 'GA', intv: 'morphine 10 mg IV fast (histamine)', sys: 'CIRC AIR',
  arms: { i: V([d(T, 'morphine', 10, 'mg')], T + 1200), c: V([], T + 1200) },
  measure: (R) => m({ ...hemo(R.i!.rows, R.c!.rows, T, 900), histamineBusSeen: 'see report (bus.airway.histamine has no consumer)' }),
  expect: [{ m: 'mapPct', lo: -25, hi: -8, src: 'tables §6.3 / Miller ch. 22: fast morphine 10 mg lowers SVR 10–20 % through histamine release' },
    { m: 'hrUp', lo: 3, hi: 25, src: 'histamine-mediated hypotension raises HR (Miller ch. 22)' }],
  owner: '7g (histamine published, nothing consumes it)' });
add({ id: 'DI-60', tier: 'P2', ctx: 'X-A vent, dexmedetomidine', state: 'GA adjunct', intv: 'dexmedetomidine 1 µg/kg over 10 min then 0.5 µg/kg/h', sys: 'CIRC NEU',
  arms: { i: V([d(T, 'dexmedetomidine', 1, 'mcg/kg', { overS: 600 }), inf(T + 600, 'dexmedetomidine', 0.5, 'mcg/kg/h')], T + 2400, XA, { dt: 10 }), c: V([], T + 2400, XA, { dt: 10 }) },
  measure: (R) => m({ mapEarly: dMax(R.i!.rows, R.c!.rows, 'map', T, T + 300), mapLatePct: pctWin(R.i!.rows, R.c!.rows, 'map', T + 1500, T + 2400), hrLate: dMin(R.i!.rows, R.c!.rows, 'hr', T, T + 2400),
    apnoea: R.i!.rows.some((r) => (r.t as number) > T && r.apnoea === true) }),
  expect: [{ m: 'hrLate', lo: -30, hi: -6, src: 'tables §6.3: dexmedetomidine HR −10–20 %' },
    { m: 'mapLatePct', lo: -25, hi: -5, src: 'tables §6.3: SVR −10–20 % after the load' },
    { m: 'mapEarly', dir: 1, tol: 2, src: 'tables §6.3: biphasic — SVR +15 % during a fast load (noted as "not modelled in v1")' }],
  owner: '7g rows-anaesthetic.ts', hand: { verdict: 'MI', why: 'the early pressor phase is declared "not modelled in v1" in the row (rows-anaesthetic.ts:81): missing, not reversed; the HR fall is also too weak (−1 vs −10–20 %)' } });
