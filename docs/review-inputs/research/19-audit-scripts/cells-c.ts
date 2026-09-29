// CM group C — COPD GOLD 3 (CM-07), pulmonary hypertension / RV failure (CM-13), mitral stenosis (CM-14), permanent
// AF (CM-15). Each comorbid arm is read against the healthy reference of the same age at the same sim time.
import { A } from './runner.ts';
import { AFP, add, arrestIn, base, baseR, COPD3, d, dMax, dMin, dWin, inf, m, MSx, mn, mx, pctMin, PHS, SP, T, V, X55, X65, X70, type Expect } from './spec.ts';
import { HR } from './cells-b.ts';
import { mean, r1, r2, type Row, type Step } from './runner.ts';

const pro = (t: number, mgkg = 2) => d(t, 'propofol', mgkg, 'mg/kg');
const NOARREST: Expect = { m: 'arrest', event: false, src: 'FU-4 rule: a compensated comorbid patient must not arrest on a standard induction' };
const w = (rows: Row[], k: string, t0: number, t1: number) => r1(mean(rows, k, t0, t1));

// ---- CM-07 COPD GOLD 3 (65 y) --------------------------------------------------------------------------------------
add({ id: 'CM-07a', tier: 'P1', ctx: 'copd GOLD 3 (lung copd 0.75) vs 65 y healthy, awake, room air', state: 'stable chronic COPD', intv: 'none (resting values)', sys: 'LUNG BLD',
  arms: { c: SP([], T + 60, COPD3), a: SP([], T + 60, X65) },
  measure: (R) => m({ paco2: base(R.c!.rows, 'paco2'), paco2A: base(R.a!.rows, 'paco2'), hco3: base(R.c!.rows, 'hco3'), ph: baseR(R.c!.rows, 'ph'), pao2: base(R.c!.rows, 'pao2'), pao2A: base(R.a!.rows, 'pao2'), spo2: base(R.c!.rows, 'spo2'), rr: base(R.c!.rows, 'rrSp'), hb: base(R.c!.rows, 'hb') }),
  expect: [{ m: 'paco2', lo: 43, hi: 52, src: 'tables §1.5 copd GOLD 3: PaCO2 45 (chronic CO2 retention)' },
    { m: 'hco3', lo: 26, hi: 32, src: 'tables §1.5 copd: HCO3 renally compensated (≈ +3.5 per 10 mmHg chronic PaCO2 rise)' },
    { m: 'pao2', lo: 55, hi: 75, invert: true, src: 'GOLD 2024 / tables §1.5 V/Q admixture 0.12: resting PaO2 55–75 on air in GOLD 3' }],
  owner: '7b copd / 7c acid–base' });

add({ id: 'CM-07b', tier: 'P1', ctx: 'copd GOLD 3 vs 65 y healthy, ventilated (thermal GA)', state: 'induced and ventilated, VCV 600 mL, PEEP 5', intv: 'RR 12 → 20 at T (auto-PEEP); Pa–EtCO2 gap', sys: 'LUNG CIRC',
  arms: { c: V([[1, A.thermal({ anaesthesia: 'general' }), 'thermal GA'], [T, A.vent({ rr: 20 }), 'RR 20']], T + 600, COPD3, { mech: [T - 30, T + 540] }),
    a: V([[1, A.thermal({ anaesthesia: 'general' }), 'thermal GA'], [T, A.vent({ rr: 20 }), 'RR 20']], T + 600, X65, { mech: [T - 30, T + 540] }) },
  measure: (R) => { const at = (x: string, k: string, t: number) => r1(R[x]!.rows.find((r) => r.t === t)![k] as number);
    return m({ autoPeep12: r1(mean(R.c!.rows, 'peepTot', T - 60, T) - 5), autoPeep20: r1(mean(R.c!.rows, 'peepTot', T + 300, T + 600) - 5), autoPeep20A: r1(mean(R.a!.rows, 'peepTot', T + 300, T + 600) - 5),
      ppeak12: at('c', 'ppeak', T - 25), ppeak20: at('c', 'ppeak', T + 545), pplat20: at('c', 'pplat', T + 545), gap: r1(mean(R.c!.rows, 'paco2', T - 60, T) - mean(R.c!.rows, 'etco2', T - 60, T)), gapA: r1(mean(R.a!.rows, 'paco2', T - 60, T) - mean(R.a!.rows, 'etco2', T - 60, T)),
      mapPct20: pctMin(R.c!.rows, R.a!.rows, 'map', T, T + 600), cvp20: w(R.c!.rows, 'cvp', T + 300, T + 600), cvp20A: w(R.a!.rows, 'cvp', T + 300, T + 600) }); },
  expect: [{ m: 'autoPeep20', lo: 3, hi: 12, src: 'tables §1.5 copd (tauSlow, R ×2.5): auto-PEEP at high RR (Barash, obstructive disease; A09-F2 GOLD 4)' },
    { m: 'gap', lo: 8, hi: 20, src: 'tables §1.5 copd: VD/VT 0.50 at GOLD 3 → wide Pa–EtCO2 gap (COPD-VD)' }],
  owner: '7b mechanics / dead space' });

add({ id: 'CM-07c', tier: 'P1', ctx: 'copd GOLD 3 vs 65 y healthy, awake spontaneous', state: 'chronic hypercapnia on air', intv: 'FiO2 0.21 → 1.0 for 30 min (uncontrolled oxygen)', sys: 'LUNG BLD',
  arms: { c: SP([[T, A.spont(1.0), 'FiO2 1.0']], T + 1800, COPD3), a: SP([[T, A.spont(1.0), 'FiO2 1.0']], T + 1800, X65) },
  measure: (R) => m({ dPaco2: r1(mean(R.c!.rows, 'paco2', T + 1500, T + 1800) - mean(R.c!.rows, 'paco2', T - 60, T)), dPaco2A: r1(mean(R.a!.rows, 'paco2', T + 1500, T + 1800) - mean(R.a!.rows, 'paco2', T - 60, T)),
    dVe: r1(mean(R.c!.rows, 'veSp', T + 1500, T + 1800) - mean(R.c!.rows, 'veSp', T - 60, T)), phEnd: r2(mean(R.c!.rows, 'ph', T + 1500, T + 1800)) }),
  expect: [{ m: 'dPaco2', lo: 3, hi: 20, src: 'research/12 CM-07 / Aubier 1980 (ARRD 122:747): high FiO2 in hypercapnic COPD raises PaCO2 +5–20 (Haldane, lost HPV, reduced drive)' },
    { m: 'dPaco2A', quiet: true, tol: 3, src: 'quiet: a healthy subject\'s PaCO2 barely moves on 100 % O2' }],
  owner: '7b V/Q + HPV / Stage 3 drive', known: 'FU-6 (drive)' });

add({ id: 'CM-07d', tier: 'P2', ctx: 'copd GOLD 3 vs 65 y healthy, ventilated (thermal GA), RR 12', state: 'GA', intv: 'bronchospasm (lung bronchospasm 0.5) at T', sys: 'LUNG CIRC',
  arms: { c: V([[1, A.thermal({ anaesthesia: 'general' }), 'thermal GA'], [T, A.lung('bronchospasm', 0.5), 'bronchospasm 0.5']], T + 600, COPD3, { mech: [T - 30, T + 540] }),
    a: V([[1, A.thermal({ anaesthesia: 'general' }), 'thermal GA'], [T, A.lung('bronchospasm', 0.5), 'bronchospasm 0.5']], T + 600, X65, { mech: [T - 30, T + 540] }) },
  measure: (R) => { const at = (x: string, k: string, t: number) => R[x]!.rows.find((r) => r.t === t)![k] as number;
    const dc = r1(at('c', 'ppeak', T + 545) - at('c', 'ppeak', T - 25)); const da = r1(at('a', 'ppeak', T + 545) - at('a', 'ppeak', T - 25));
    return m({ dPpeakCOPD: dc, dPpeakHealthy: da, ratio: r2(dc / da), autoPeepCOPD: r1(mean(R.c!.rows, 'peepTot', T + 300, T + 600) - 5), autoPeepHealthy: r1(mean(R.a!.rows, 'peepTot', T + 300, T + 600) - 5),
      spo2MinCOPD: mn(R.c!.rows, 'spo2', T, T + 600), mapMinCOPD: mn(R.c!.rows, 'map', T, T + 600), mapMinHealthy: mn(R.a!.rows, 'map', T, T + 600) }); },
  expect: [{ m: 'ratio', lo: 1.1, hi: 5, src: 'Barash, obstructive disease: the same bronchoconstriction on an obstructed, slow-emptying lung gives more peak pressure and hyperinflation (direction; band proposed)' },
    { m: 'autoPeepCOPD', dir: 1, tol: 2, src: 'tables §1.5 copd: bronchospasm on COPD → dynamic hyperinflation (auto-PEEP)' }],
  owner: '7b mechanics' });

// emergence: propofol TIVA from 1 s, off at 1800 s, extubated to spontaneous FiO2 0.4 at 2400 s
const EMERGE: Step[] = [[1, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100 µg/kg/min'], [1800, A.infusion('propofol', 0, 'mcg/kg/min'), 'propofol off'],
  [2400, A.device('none'), 'extubated'], [2400, A.spont(0.4), 'spontaneous FiO2 0.4']];
add({ id: 'CM-07e', tier: 'P1', ctx: 'copd GOLD 3 vs 65 y healthy, TIVA 30 min, ventilated', state: 'emergence', intv: 'extubation to FiO2 0.4 at 40 min', sys: 'LUNG BLD NEU',
  arms: { c: V(EMERGE, 3300, COPD3), a: V(EMERGE, 3300, X65) },
  measure: (R) => m({ paco2MaxCOPD: mx(R.c!.rows, 'paco2', 2400, 3300), paco2MaxHealthy: mx(R.a!.rows, 'paco2', 2400, 3300), dPaco2: r1(mx(R.c!.rows, 'paco2', 2400, 3300) - mx(R.a!.rows, 'paco2', 2400, 3300)),
    spo2MinCOPD: mn(R.c!.rows, 'spo2', 2400, 3300), spo2MinHealthy: mn(R.a!.rows, 'spo2', 2400, 3300), veCOPD: w(R.c!.rows, 'veSp', 2700, 3300), rrCOPD: w(R.c!.rows, 'rrSp', 2700, 3300), phMinCOPD: r2(mn(R.c!.rows, 'ph', 2400, 3300)), consciousAt2400: R.c!.rows.find((r) => r.t === 2400)!.conscious as boolean }),
  expect: [{ m: 'dPaco2', dir: 1, tol: 3, src: 'tables §1.5 / GOLD: after extubation the COPD patient retains more CO2 (fatigue-prone, high VD/VT) — direction only' },
    { m: 'paco2MaxCOPD', lo: 50, hi: 70, src: 'GOLD 2024 / Barash: post-extubation hypercapnic respiratory failure risk in GOLD 3 (PaCO2 > 50) — band proposed' }],
  owner: '7b / Stage 3 drive', known: 'FU-6 (drive, fatigue)' });

// ---- CM-13 pulmonary hypertension (severe) / RV failure -------------------------------------------------------------
add({ id: 'CM-13a', tier: 'P1', ctx: 'ph severe (PVR ×3, RV Ees ×1.6) vs 55 y healthy, ventilated', state: 'compensated PH', intv: 'propofol 2 mg/kg', sys: 'CIRC',
  arms: { i: V([pro(T)], T + 900, PHS), c: V([], T + 900, PHS), ia: V([pro(T)], T + 900, X55), ca: V([], T + 900, X55) },
  measure: (R) => { const p = pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 600); const a = pctMin(R.ia!.rows, R.ca!.rows, 'map', T, T + 600);
    return m({ papMeanBase: base(R.c!.rows, 'papMean'), pvrWU: r1((mean(R.c!.rows, 'papMean', T - 60, T) - mean(R.c!.rows, 'pla', T - 60, T)) / mean(R.c!.rows, 'co', T - 60, T)), mapPct: p, mapPctHealthy: a, extraFall: r1(p - a),
      kIschRvMin: r2(mn(R.i!.rows, 'kIschRv', T, T + 900)), mapMin: mn(R.i!.rows, 'map', T, T + 900), arrest: arrestIn(R.i!.rows, T, T + 900) }); },
  expect: [{ m: 'papMeanBase', lo: 35, hi: 60, src: 'ESC/ERS 2022 PH (tables §1.5 ph severe, PVR 10 WU): mPAP typically 40–60 in severe PH' },
    { m: 'extraFall', dir: -1, tol: 3, src: 'Barash / Miller ch. on PH: induction hypotension lowers RV coronary perfusion — the RV ischaemia spiral; the fall is larger than in health (R53)' },
    { m: 'kIschRvMin', lo: 0.3, hi: 0.95, invert: true, src: 'research/12 CM-13: RV ischaemia after induction (FU-4 G5 RV perfusion term)' }, NOARREST],
  owner: '7a PH profile / FU-4 G5' });

add({ id: 'CM-13b', tier: 'P1', ctx: 'ph severe vs 55 y healthy, ventilated', state: 'GA', intv: 'hypoventilation: VT 600 → 300 at T (PaCO2 ≈ 60)', sys: 'CIRC LUNG',
  arms: { i: V([[T, A.vent({ vtMl: 300 }), 'VT 300']], T + 900, PHS), c: V([], T + 900, PHS), ia: V([[T, A.vent({ vtMl: 300 }), 'VT 300']], T + 900, X55), ca: V([], T + 900, X55) },
  measure: (R) => m({ paco2End: w(R.i!.rows, 'paco2', T + 600, T + 900), dPap: r1(mean(R.i!.rows, 'papMean', T + 600, T + 900) - mean(R.c!.rows, 'papMean', T + 600, T + 900)), dPapHealthy: r1(mean(R.ia!.rows, 'papMean', T + 600, T + 900) - mean(R.ca!.rows, 'papMean', T + 600, T + 900)),
    dMap: r1(mean(R.i!.rows, 'map', T + 600, T + 900) - mean(R.c!.rows, 'map', T + 600, T + 900)), kIschRvMin: r2(mn(R.i!.rows, 'kIschRv', T, T + 900)), phEnd: r2(mean(R.i!.rows, 'ph', T + 600, T + 900)) }),
  expect: [{ m: 'dPap', dir: 1, tol: 3, src: 'Barash PH / Balanos 2003: hypercapnia and acidosis raise PVR (PaCO2 60 → mPAP +5–10 in PH)' }],
  owner: '7b HPV / 7a PVR', known: 'FU-6 (hypercapnic PVR, A09-F6)' });

add({ id: 'CM-13c', tier: 'P1', ctx: 'ph severe 55 y, ventilated', state: 'post-induction hypotension (propofol 2 mg/kg at T)', intv: 'noradrenaline 0.1 vs phenylephrine 1 µg/kg/min from T + 120 s', sys: 'CIRC',
  arms: { n: V([pro(T), inf(T + 120, 'norepinephrine', 0.1, 'mcg/kg/min')], T + 900, PHS), p: V([pro(T), inf(T + 120, 'phenylephrine', 1, 'mcg/kg/min')], T + 900, PHS), c: V([pro(T)], T + 900, PHS) },
  measure: (R) => { const rat = (x: string) => r2(mean(R[x]!.rows, 'papMean', T + 420, T + 900) / mean(R[x]!.rows, 'map', T + 420, T + 900));
    return m({ ratioNA: rat('n'), ratioPE: rat('p'), ratioNone: rat('c'), dRatio: r2(rat('n') - rat('p')), mapNA: w(R.n!.rows, 'map', T + 420, T + 900), mapPE: w(R.p!.rows, 'map', T + 420, T + 900),
      coNA: r2(mean(R.n!.rows, 'co', T + 420, T + 900)), coPE: r2(mean(R.p!.rows, 'co', T + 420, T + 900)), kIschRvNA: r2(mn(R.n!.rows, 'kIschRv', T + 120, T + 900)), kIschRvPE: r2(mn(R.p!.rows, 'kIschRv', T + 120, T + 900)) }); },
  expect: [{ m: 'dRatio', dir: -1, tol: 0.01, src: 'Kwak 2002 (Anaesthesia 57:9) / Barash PH: noradrenaline lowers the PAP/SAP ratio more than phenylephrine, which raises PVR — noradrenaline preferred (direction only)' }],
  owner: '7g α/β rows on the pulmonary circuit' });

add({ id: 'CM-13d', tier: 'P2', ctx: 'ph severe, ventilated', state: 'RV afterload crisis', intv: 'inhaled nitric oxide 20 ppm', sys: 'CIRC LUNG',
  arms: {}, expect: [], owner: 'FU-7 drug library (missing drug: iNO)', ne: 'no inhaled nitric oxide (or inhaled prostacyclin) in the library (research/12 §5.11 "missing drugs"); expected: PVR −20–40 %, mPAP −5–10 without systemic hypotension (Barash PH)' });

// ---- CM-14 mitral stenosis (severe, MVA 1.2) ------------------------------------------------------------------------
add({ id: 'CM-14a', tier: 'P2', ctx: 'ms severe 55 y vs 55 y healthy, ventilated', state: 'compensated MS', intv: 'HR 70 → 110 held for 10 min', sys: 'CIRC',
  arms: { i: V([HR(T, 110)], T + 600, MSx), a: V([HR(T, 110)], T + 600, X55) },
  measure: (R) => m({ laBase: base(R.i!.rows, 'pla'), la110: w(R.i!.rows, 'pla', T + 300, T + 600), dLa: r1(mean(R.i!.rows, 'pla', T + 300, T + 600) - mean(R.i!.rows, 'pla', T - 60, T)), dLaHealthy: r1(mean(R.a!.rows, 'pla', T + 300, T + 600) - mean(R.a!.rows, 'pla', T - 60, T)),
    papBase: base(R.i!.rows, 'papMean'), pap110: w(R.i!.rows, 'papMean', T + 300, T + 600), coPct: r1(100 * (mean(R.i!.rows, 'co', T + 300, T + 600) / mean(R.i!.rows, 'co', T - 60, T) - 1)) }),
  expect: [{ m: 'dLa', lo: 5, hi: 15, src: 'ACC/AHA 2020 / Gorlin: the transmitral gradient rises with (flow/diastolic filling period)² — HR 70 → 110 roughly doubles it (LAP +5–15)' },
    { m: 'dLaHealthy', quiet: true, tol: 3, src: 'quiet: a normal mitral valve adds no gradient at HR 110' }],
  owner: '7a mitral valve (Gorlin)' });

add({ id: 'CM-14b', tier: 'P2', ctx: 'ms severe 55 y, ventilated', state: 'HR 110 held (CM-14a)', intv: 'lung water and oxygenation after 10 min of tachycardia', sys: 'LUNG BLD',
  arms: { i: V([HR(T, 110)], T + 900, MSx), c: V([], T + 900, MSx) },
  measure: (R) => m({ evlwiGain: r2(mean(R.i!.rows, 'evlwi', T + 600, T + 900) - mean(R.c!.rows, 'evlwi', T + 600, T + 900)), pao2Pct: r1(100 * (mean(R.i!.rows, 'pao2', T + 600, T + 900) / mean(R.c!.rows, 'pao2', T + 600, T + 900) - 1)), pCap: w(R.i!.rows, 'pCap', T + 600, T + 900) }),
  expect: [{ m: 'evlwiGain', dir: 1, tol: 0.2, src: 'ACC/AHA 2020: tachycardia in severe MS precipitates pulmonary oedema (LAP > 25; tables §2 Starling filtration)' },
    { m: 'pao2Pct', dir: -1, tol: 3, src: 'pulmonary oedema widens the A–a gradient (direction only)' }],
  owner: '7c lung water / 7b diffusion' });

add({ id: 'CM-14c', tier: 'P2', ctx: 'ms severe 55 y, ventilated', state: 'tachycardia after atropine 1 mg at T', intv: 'esmolol 1 mg/kg at T + 180 s vs none', sys: 'CIRC',
  arms: { i: V([d(T, 'atropine', 1, 'mg'), d(T + 180, 'esmolol', 1, 'mg/kg')], T + 600, MSx), c: V([d(T, 'atropine', 1, 'mg')], T + 600, MSx) },
  measure: (R) => m({ hrAtropine: w(R.c!.rows, 'hr', T + 60, T + 180), hrDrop: dMin(R.i!.rows, R.c!.rows, 'hr', T + 180, T + 480), dLa: dMin(R.i!.rows, R.c!.rows, 'pla', T + 180, T + 480), dMap: dWin(R.i!.rows, R.c!.rows, 'map', T + 240, T + 480) }),
  expect: [{ m: 'dLa', dir: -1, tol: 1, src: 'ACC/AHA 2020 / Miller valvular disease: rate control lengthens diastole and lowers LAP in MS' }],
  owner: '7g esmolol / 7a' });

// ---- CM-15 permanent AF (70 y, ventricular rate 80) -----------------------------------------------------------------
add({ id: 'CM-15a', tier: 'P2', ctx: 'permanent AF 80/min (profile rhythm) vs 70 y sinus, ventilated', state: 'rate-controlled AF', intv: 'propofol 2 mg/kg', sys: 'CIRC RHY',
  arms: { i: V([pro(T)], T + 900, AFP), c: V([], T + 900, AFP), ia: V([pro(T)], T + 900, X70), ca: V([], T + 900, X70) },
  measure: (R) => { const p = pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 600); const a = pctMin(R.ia!.rows, R.ca!.rows, 'map', T, T + 600);
    return m({ rhythmBase: String(R.c!.rows.find((r) => r.t === T)!.rhythm), hrBase: base(R.c!.rows, 'hr'), mapPctAF: p, mapPctSinus: a, extraFall: r1(p - a), hrUpAF: dMax(R.i!.rows, R.c!.rows, 'hr', T, T + 600), hrUpSinus: dMax(R.ia!.rows, R.ca!.rows, 'hr', T, T + 600), kIschMinAFctl: r2(mn(R.c!.rows, 'kIsch', T - 240, T + 900)), kIschMinAFprop: r2(mn(R.i!.rows, 'kIsch', T, T + 900)) }); },
  expect: [{ m: 'extraFall', dir: -1, tol: 2, src: 'tables §1.5 af / Miller: without atrial transport, the preload fall of induction costs more SV (direction only)' }],
  owner: '7a atria / Stage 5 AF' });

add({ id: 'CM-15b', tier: 'P2', ctx: 'AF 70 y, ventilated', state: 'AF with RVR 150/min', intv: 'esmolol 0.5 mg/kg vs none', sys: 'CIRC RHY',
  arms: { e: V([[T, A.rhythm('afib', { rateBpm: 150 }), 'AF 150'], d(T + 120, 'esmolol', 0.5, 'mg/kg')], T + 900, X70), c: V([[T, A.rhythm('afib', { rateBpm: 150 }), 'AF 150']], T + 900, X70) },
  measure: (R) => m({ hrBase: w(R.c!.rows, 'hr', T + 30, T + 120), hrDrop: r1(dWin(R.e!.rows, R.c!.rows, 'hr', T + 150, T + 450)), mapGain: r1(dWin(R.e!.rows, R.c!.rows, 'map', T + 150, T + 450)), svGain: r1(dWin(R.e!.rows, R.c!.rows, 'sv', T + 150, T + 450)), coGain: r2(dWin(R.e!.rows, R.c!.rows, 'co', T + 150, T + 450)) }),
  expect: [{ m: 'hrDrop', lo: -45, hi: -15, src: 'tables §6.2 / ESC AF 2020: esmolol slows AF conduction (HR −15–30 %)' },
    { m: 'mapGain', dir: 1, tol: 2, src: 'tables §1.5 af: rate control lengthens filling, SV rises and MAP improves (direction only)' }],
  owner: '7g esmolol (AV node) / 7a' });
