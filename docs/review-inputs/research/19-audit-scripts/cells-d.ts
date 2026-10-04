// CM group D — CKD proxy (CM-08), diabetes ± autonomic neuropathy (CM-09), cirrhosis proxy (CM-10), asthma (CM-11),
// OSA (CM-12), pacemaker-dependent (CM-16), smoker (CM-17), chronic anaemia (CM-18), plus CM-15c (the AF-ischaemia
// quiet check this run adds after CM-15b arrested).
import { A } from './runner.ts';
import { add, ANAEM, arrestIn, ASTH, base, baseR, BLEED1L, CIRR, CKD, d, DM2, m, mn, mx, pctMin, SMK, SP, T, V, X55, X60, X70, XA, type Expect } from './spec.ts';
import { mean, r1, r2, type Row, type Step } from './runner.ts';

const pro = (t: number, mgkg = 2) => d(t, 'propofol', mgkg, 'mg/kg');
const NOARREST: Expect = { m: 'arrest', event: false, src: 'FU-4 rule: a compensated comorbid patient must not arrest on a standard intervention' };
const w = (rows: Row[], k: string, t0: number, t1: number) => r1(mean(rows, k, t0, t1));
/** Minutes from t0 to T1 25 % recovery after the block (first sample with t1 ≥ 0.25 after the nadir). */
const t25 = (rows: Row[], t0: number): number => { const nad = rows.find((r) => (r.t as number) > t0 && (r.t as number) < t0 + 600 && (r.t1 as number) < 0.05); if (!nad) return NaN; const r = rows.find((x) => (x.t as number) > (nad.t as number) && (x.t1 as number) >= 0.25); return r ? r2(((r.t as number) - t0) / 60) : NaN; };

// ---- CM-08 CKD 5 (aki proxy + tables §1.5 ckd chemistry) ------------------------------------------------------------
add({ id: 'CM-08a', tier: 'P2', ctx: 'CKD proxy (aki + blood K 5.5, Hb 10, HCO3 20) vs X-A, ventilated', state: 'pre-dialysis chronic renal failure', intv: 'none (resting chemistry)', sys: 'BLD KID',
  arms: { k: V([], T + 60, CKD), a: V([], T + 60) },
  measure: (R) => m({ k: baseR(R.k!.rows, 'k'), hb: base(R.k!.rows, 'hb'), hco3: base(R.k!.rows, 'hco3'), ph: baseR(R.k!.rows, 'ph'), uop: base(R.k!.rows, 'uop'), uopA: base(R.a!.rows, 'uop'), gfr: base(R.k!.rows, 'gfr'), gfrA: base(R.a!.rows, 'gfr'), qrs: base(R.k!.rows, 'qrs') }),
  expect: [{ m: 'k', lo: 5.2, hi: 5.8, src: 'tables §1.5 ckd: K 5.0 (4.5–6.0 pre-dialysis) — profile 5.5' }, { m: 'hco3', lo: 18, hi: 22, src: 'tables §1.5 ckd: HCO3 20' },
    { m: 'ph', lo: 7.28, hi: 7.38, src: 'CKD-BJAEd: compensated metabolic acidosis of renal failure' }],
  owner: '7c blood profile / 7d aki proxy' });

add({ id: 'CM-08b', tier: 'P2', ctx: 'CKD proxy vs X-A, ventilated', state: 'renal failure', intv: 'rocuronium 0.6 mg/kg: time to T1 25 %', sys: 'NEU PK',
  arms: { k: V([d(T, 'rocuronium', 0.6, 'mg/kg')], T + 4200, CKD, { dt: 10 }), a: V([d(T, 'rocuronium', 0.6, 'mg/kg')], T + 4200, XA, { dt: 10 }) },
  measure: (R) => { const k = t25(R.k!.rows, T); const a = t25(R.a!.rows, T); return m({ t25CKD: k, t25Healthy: a, ratio: r2(k / a) }); },
  expect: [{ m: 'ratio', lo: 1.1, hi: 1.6, src: 'Miller 10e ch. 24 / Cooper 1993: rocuronium clearance −33–39 % in renal failure, clinical duration ×1.3–1.5 (research/12 CM-08)' }],
  owner: '7g PK (renal clearance of rocuronium)' });

add({ id: 'CM-08c', tier: 'P2', ctx: 'CKD proxy vs X-A, ventilated', state: 'renal failure', intv: 'Ringer\'s lactate 1 L over 15 min', sys: 'CIRC KID LUNG',
  arms: { k: V([[T, A.fluid('rl', 1000, 900), 'RL 1 L / 15 min']], T + 2400, CKD), kc: V([], T + 2400, CKD), a: V([[T, A.fluid('rl', 1000, 900), 'RL 1 L / 15 min']], T + 2400), ac: V([], T + 2400) },
  measure: (R) => m({ uopGainCKD: r1(mean(R.k!.rows, 'uop', T + 900, T + 2400) - mean(R.kc!.rows, 'uop', T + 900, T + 2400)), uopGainA: r1(mean(R.a!.rows, 'uop', T + 900, T + 2400) - mean(R.ac!.rows, 'uop', T + 900, T + 2400)),
    dCvpCKD: r1(mean(R.k!.rows, 'cvp', T + 1800, T + 2400) - mean(R.kc!.rows, 'cvp', T + 1800, T + 2400)), dCvpA: r1(mean(R.a!.rows, 'cvp', T + 1800, T + 2400) - mean(R.ac!.rows, 'cvp', T + 1800, T + 2400)),
    evlwiGainCKD: r2(mean(R.k!.rows, 'evlwi', T + 1800, T + 2400) - mean(R.kc!.rows, 'evlwi', T + 1800, T + 2400)) }),
  expect: [{ m: 'uopGainCKD', lo: -5, hi: 10, src: 'tables §1.5 ckd / CKD-BJAEd: the failed kidney cannot excrete a load — little diuresis (mL/h)' },
    { m: 'dCvpCKD', dir: 1, tol: 0.5, src: 'tables §1.5 ckd: the retained load raises filling pressures (oedema threshold lower) — direction only' }],
  owner: '7d renal / 7c fluid' });

add({ id: 'CM-08d', tier: 'P2', ctx: 'CKD proxy (K 5.5) vs X-A, ventilated', state: 'renal failure, K 5.5', intv: 'succinylcholine 1.5 mg/kg', sys: 'BLD RHY',
  arms: { k: V([d(T, 'succinylcholine', 1.5, 'mg/kg')], T + 900, CKD), a: V([d(T, 'succinylcholine', 1.5, 'mg/kg')], T + 900) },
  measure: (R) => m({ dK: r2(mx(R.k!.rows, 'k', T, T + 900) - mean(R.k!.rows, 'k', T - 60, T)), kPeak: r2(mx(R.k!.rows, 'k', T, T + 900)), dKHealthy: r2(mx(R.a!.rows, 'k', T, T + 900) - mean(R.a!.rows, 'k', T - 60, T)), qrsPeak: mx(R.k!.rows, 'qrs', T, T + 900), arrest: arrestIn(R.k!.rows, T, T + 900) }),
  expect: [{ m: 'dK', lo: 0.3, hi: 0.9, src: 'Thapa & Brull 2000 / Miller ch. 24: stable renal failure has the NORMAL +0.5 rise; the hazard is the starting K' },
    { m: 'kPeak', lo: 5.8, hi: 6.6, src: 'tables §1.5 ckd: 5.5 + 0.5' }, NOARREST],
  owner: '7c succinylcholine K' });

add({ id: 'CM-08e', tier: 'P2', ctx: 'CKD 5 / dialysis', state: 'the `ckd` profile of tables §1.5', intv: 'profile: β ×1.3, renal drug clearance ×0.3, AV fistula CO +10 %, post-dialysis hypovolaemia', sys: 'CIRC PK',
  arms: {}, expect: [], owner: 'FU-7 profile (ckd)', ne: 'no `ckd` condition: the aki proxy lowers GFR but carries no LV stiffness, no fistula shunt, no post-dialysis volume state and no drug-clearance factor beyond 7g\'s GFR scaling (research/12 §5.11 missing profiles)' });

// ---- CM-09 diabetes type 2 ± cardiac autonomic neuropathy ----------------------------------------------------------
add({ id: 'CM-09a', tier: 'P2', ctx: 'diabetes + cardiac autonomic neuropathy', state: 'awake baseline', intv: 'resting HR 90–100, fixed; baroreflex G_v ×0.3', sys: 'CIRC',
  arms: {}, expect: [], owner: 'FU-7 profile (dan)', ne: 'no `dan` condition (tables §1.5: G_v ×0.3, sympathetic gains ×0.4, HR 90–100 fixed); the engine\'s `endo.diabetes` is metabolic only' });
add({ id: 'CM-09b', tier: 'P2', ctx: 'diabetes + cardiac autonomic neuropathy', state: 'GA', intv: 'propofol induction: exaggerated hypotension with no HR response', sys: 'CIRC',
  arms: {}, expect: [], owner: 'FU-7 profile (dan)', ne: 'no `dan` condition (Burgos 1989: diabetics with autonomic neuropathy need vasopressors after induction far more often)' });
const STRESS: Step[] = [[T, A.stim(1), 'incision / surgical stimulus 1.0 for 60 min']];
add({ id: 'CM-09c', tier: 'P2', ctx: 'diabetes type 2 (engine API `endo.diabetes`; not in pme-scenario/1) vs 60 y, ventilated', state: 'GA, no insulin', intv: 'surgical stress (stimulus 1.0) for 60 min', sys: 'END',
  arms: { dm: V(STRESS, T + 3600, DM2, { dt: 10 }), a: V(STRESS, T + 3600, X60, { dt: 10 }) },
  measure: (R) => m({ gluBaseDM: baseR(R.dm!.rows, 'gluMmol'), gluMaxDM: r2(mx(R.dm!.rows, 'gluMmol', T, T + 3600)), gluBaseA: baseR(R.a!.rows, 'gluMmol'), gluMaxA: r2(mx(R.a!.rows, 'gluMmol', T, T + 3600)),
    dGluDM: r2(mx(R.dm!.rows, 'gluMmol', T, T + 3600) - mean(R.dm!.rows, 'gluMmol', T - 60, T)), dGluA: r2(mx(R.a!.rows, 'gluMmol', T, T + 3600) - mean(R.a!.rows, 'gluMmol', T - 60, T)) }),
  expect: [{ m: 'gluMaxDM', lo: 8, hi: 12, src: 'research/12 CM-09 / tables §1.5; JBDS 2023 perioperative diabetes: type 2 glucose 8–12 mmol/L under surgical stress' },
    { m: 'gluMaxA', lo: 6.5, hi: 8.5, src: 'research/12 ET-17 / Desborough 2000: non-diabetic 5.5 → 7–8 mmol/L' }],
  owner: '7e glucose (diabetes)' });
add({ id: 'CM-09d', tier: 'P2', ctx: 'diabetes (gastroparesis)', state: 'RSI', intv: 'aspiration risk at induction', sys: 'AIR LUNG',
  arms: {}, expect: [], owner: 'FU-7 / SP run (aspiration as a risk state)', ne: 'aspiration exists only as an instructor-fired lung event; no gastric-content or delayed-emptying state makes it more likely' });

// ---- CM-10 cirrhosis Child C (hepaticFailure 0.8 + albumin 25) ------------------------------------------------------
add({ id: 'CM-10a', tier: 'P2', ctx: 'hepaticFailure 0.8 + albumin 25 (Child C proxy) vs 55 y, ventilated', state: 'end-stage liver disease', intv: 'none (resting haemodynamics)', sys: 'CIRC LIV',
  arms: { c: V([], T + 60, CIRR), a: V([], T + 60, X55) },
  measure: (R) => m({ coPct: r1(100 * (mean(R.c!.rows, 'co', T - 60, T) / mean(R.a!.rows, 'co', T - 60, T) - 1)), svrPct: r1(100 * (mean(R.c!.rows, 'svr', T - 60, T) / mean(R.a!.rows, 'svr', T - 60, T) - 1)),
    map: base(R.c!.rows, 'map'), mapA: base(R.a!.rows, 'map'), liverFn: baseR(R.c!.rows, 'liverFn'), lact: baseR(R.c!.rows, 'lact') }),
  expect: [{ m: 'coPct', lo: 20, hi: 60, src: 'Miller 10e ch. on hepatic disease: cirrhosis has a hyperdynamic circulation (CO ↑, SVR ↓)' },
    { m: 'svrPct', lo: -50, hi: -20, src: 'Miller: splanchnic vasodilation (NO), low SVR in Child C' }],
  owner: 'FU-7 profile (cirrhosis) / 7a',
  hand: { verdict: 'NE', why: 'no cirrhosis profile (research/12 blocker "missing profiles"): the hepaticFailure proxy acts on the liver only — CO and SVR are identical to the healthy 55 y (measured), so the hyperdynamic circulation cannot be expressed' } });
add({ id: 'CM-10b', tier: 'P2', ctx: 'Child C proxy vs 55 y, ventilated', state: 'end-stage liver disease', intv: 'propofol 2 mg/kg', sys: 'CIRC PK',
  arms: { i: V([pro(T)], T + 1800, CIRR), c: V([], T + 1800, CIRR), ia: V([pro(T)], T + 1800, X55), ca: V([], T + 1800, X55) },
  measure: (R) => { const i = pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 600); const a = pctMin(R.ia!.rows, R.ca!.rows, 'map', T, T + 600);
    const wake = (rows: Row[]) => { const r = rows.find((x) => (x.t as number) > T + 120 && x.conscious === true); return r ? r1(((r.t as number) - T) / 60) : NaN; };
    return m({ mapPct: i, mapPctHealthy: a, extraFall: r1(i - a), wakeMin: wake(R.i!.rows), wakeMinHealthy: wake(R.ia!.rows) }); },
  expect: [{ m: 'extraFall', dir: -1, tol: 2, src: 'Miller hepatic disease: low SVR and hypoalbuminaemia (higher free fraction) exaggerate induction hypotension (direction only)' }],
  owner: 'FU-7 profile (cirrhosis) / 7g protein binding',
  hand: { verdict: 'NE', why: 'inherits CM-10a: the proxy has no low-SVR state, and 7g has no protein-binding (free-fraction) term for propofol at albumin 25 — the fall and the emergence time equal the healthy 55 y exactly (measured)' } });
add({ id: 'CM-10c', tier: 'P2', ctx: 'Child C proxy (albumin 25 g/L) vs X-A', state: 'hypoalbuminaemia', intv: 'plasma colloid osmotic pressure', sys: 'BLD',
  arms: { c: V([], T + 60, CIRR), a: V([], T + 60) },
  measure: (R) => m({ cop: base(R.c!.rows, 'cop'), copA: base(R.a!.rows, 'cop'), alb: base(R.c!.rows, 'alb') }),
  expect: [{ m: 'cop', lo: 13, hi: 18, src: 'Landis–Pappenheimer (tables §5b.4): albumin 25 g/L → COP ≈ 15 mmHg (normal 25)' }],
  owner: '7c COP' });
add({ id: 'CM-10d', tier: 'P2', ctx: 'Child C proxy', state: 'coagulopathy of liver failure', intv: 'INR / bleeding', sys: 'COAG LIV',
  arms: { c: V([], T + 60, CIRR) }, measure: (R) => m({ inr: baseR(R.c!.rows, 'inr') }),
  expect: [{ m: 'inr', lo: 1.7, hi: 3, src: 'Child–Pugh C: INR > 2.3 (Pugh 1973)' }], owner: '7i (v1.1)',
  hand: { verdict: 'NE', why: 'blocked by 7i (R60 v1.1): the liver INR is the placeholder 1 + 2·failure and nothing reads it (research/11 §4.9); no coagulation model' } });
add({ id: 'CM-10e', tier: 'P2', ctx: 'Child C proxy vs 55 y, ventilated', state: 'tense ascites (IAP 15) and fasting', intv: 'IAP 15 mmHg for 2 h; glucose course', sys: 'KID END LIV',
  arms: { i: V([[T, A.renal({ iapMmHg: 15 }), 'IAP 15']], T + 7200, CIRR, { dt: 20 }), a: V([[T, A.renal({ iapMmHg: 15 }), 'IAP 15']], T + 7200, X55, { dt: 20 }), c: V([], T + 7200, CIRR, { dt: 20 }) },
  measure: (R) => m({ uopIAP: w(R.i!.rows, 'uop', T + 1800, T + 7200), uopNoIAP: w(R.c!.rows, 'uop', T + 1800, T + 7200), uopHealthyIAP: w(R.a!.rows, 'uop', T + 1800, T + 7200),
    gluEnd: r2(mean(R.c!.rows, 'gluMmol', T + 6600, T + 7200)), gluEndHealthy: r2(mean(R.a!.rows, 'gluMmol', T + 6600, T + 7200)), lactEnd: r2(mean(R.c!.rows, 'lact', T + 6600, T + 7200)) }),
  expect: [{ m: 'gluEnd', lo: 2.5, hi: 4.5, invert: true, src: 'tables §5.3 / Miller hepatic: failing gluconeogenesis → fasting hypoglycaemia in Child C' },
    { m: 'uopIAP', lo: 0, hi: 30, invert: true, src: 'WSACS 2013: IAP 15 in a low-SVR cirrhotic reduces renal perfusion → oliguria (< 0.5 mL/kg/h)' }],
  owner: '7e glucose (liverFn) / 7d renal IAP' });

// ---- CM-11 asthma, poorly controlled -------------------------------------------------------------------------------
const INTUB: Step[] = [pro(T), d(T, 'rocuronium', 0.6, 'mg/kg'), [T + 90, A.stim(1.5), 'laryngoscopy'], [T + 90, A.device('ett'), 'ETT'], [T + 90, A.vent({ rr: 12, vtMl: 500 }), 'VCV 12 × 500'], [T + 150, A.stim(0), 'stimulus off']];
add({ id: 'CM-11a', tier: 'P2', ctx: 'asthma (lung asthma 0.5) vs X-A, seeds 7/8/9', state: 'awake → induction', intv: 'laryngoscopy and intubation (airway instrumentation)', sys: 'LUNG AIR',
  arms: { s7: SP(INTUB, T + 600, ASTH, { mech: [T + 400] }), s8: SP(INTUB, T + 600, ASTH, { mech: [T + 400], seed: 8 }), s9: SP(INTUB, T + 600, ASTH, { mech: [T + 400], seed: 9 }), a: SP(INTUB, T + 600, XA, { mech: [T + 400] }) },
  measure: (R) => { const p = (x: string) => r1(R[x]!.rows.find((r) => r.t === T + 405)!.ppeak as number);
    return m({ ppeak7: p('s7'), ppeak8: p('s8'), ppeak9: p('s9'), ppeakHealthy: p('a'), spread: r1(Math.max(p('s7'), p('s8'), p('s9')) - Math.min(p('s7'), p('s8'), p('s9'))) }); },
  expect: [{ m: 'spread', dir: 1, tol: 3, src: 'tables §1.5 asthma: bronchospasm at airway instrumentation with probability 0.1–0.2 in poorly controlled asthma (Asthma-BJA) — some seeds must bronchospasm' }],
  owner: 'FU-7 profile (bronchial reactivity)',
  hand: { verdict: 'MI', why: 'no bronchial-reactivity state: instrumentation never triggers bronchospasm (identical Ppeak across seeds) — research/12 CM-11 "no reactivity model"' } });
add({ id: 'CM-11b', tier: 'P2', ctx: 'asthma 0.5 + lung bronchospasm 0.5, ventilated (thermal GA)', state: 'intra-operative bronchospasm', intv: 'sevoflurane 2 % (≈ 1 MAC)', sys: 'LUNG',
  arms: { i: V([[1, A.thermal({ anaesthesia: 'general' }), 'thermal GA'], [120, A.lung('bronchospasm', 0.5), 'bronchospasm 0.5'], [T, A.vap('sevoflurane', 2, 4), 'sevo 2 %']], T + 900, ASTH, { mech: [T - 30, T + 840] }),
    c: V([[1, A.thermal({ anaesthesia: 'general' }), 'thermal GA'], [120, A.lung('bronchospasm', 0.5), 'bronchospasm 0.5']], T + 900, ASTH, { mech: [T - 30, T + 840] }) },
  measure: (R) => { const at = (x: string, t: number) => R[x]!.rows.find((r) => r.t === t)!.ppeak as number;
    return m({ ppeakBefore: r1(at('i', T - 25)), ppeakSevo: r1(at('i', T + 845)), ppeakCtl: r1(at('c', T + 845)), ppeakPct: r1(100 * (at('i', T + 845) / at('c', T + 845) - 1)), mac: r2(mean(R.i!.rows, 'mac', T + 600, T + 900)) }); },
  expect: [{ m: 'ppeakPct', lo: -35, hi: -10, src: 'tables §1.5 asthma / Rooke 1997 (Anesthesiology 86:1294): sevoflurane ≈ 1 MAC lowers respiratory resistance ≈ 15–30 %' }],
  owner: 'FU-6 R2 (bronchodilation)', known: 'FU-6 R2' });

// ---- CM-12 OSA -----------------------------------------------------------------------------------------------------
add({ id: 'CM-12a', tier: 'P2', ctx: 'OSA severe', state: 'sedation', intv: 'opioid (fentanyl 1 µg/kg) under sedation', sys: 'AIR LUNG',
  arms: {}, expect: [], owner: 'FU-7 profile (osa)', ne: 'no `osa` condition (tables §1.5: upper-airway collapse at depth index < 90, opioid ventilatory C50 ×0.6); DI-43 same blocker' });
add({ id: 'CM-12b', tier: 'P2', ctx: 'OSA severe', state: 'emergence', intv: 'extubation with residual opioid', sys: 'AIR LUNG',
  arms: {}, expect: [], owner: 'FU-7 profile (osa)', ne: 'no `osa` condition: post-extubation obstruction cannot be expressed' });

// ---- CM-16 pacemaker-dependent (VVI 70 over complete heart block, profile rhythm) ----------------------------------
// the implanted pacer's settings sit under opts.pacer (api-types PacerOpts); top-level keys are silently ignored
const PM = { rhythm: { id: 'pacedVVI', opts: { pacer: { ratePpm: 70, intrinsic: 'none' } } } };
add({ id: 'CM-16a', tier: 'P2', ctx: 'pacemaker-dependent (VVI 70 over CHB, profile rhythm), ventilated', state: 'paced', intv: 'diathermy: oversensing (inhibition) for 20 s', sys: 'RHY CIRC',
  arms: { i: V([[T, A.rhythm('pacedVVI', { pacer: { ratePpm: 70, intrinsic: 'none', fault: 'oversensing', faultRate: 1 } }), 'oversensing (diathermy)'], [T + 20, A.rhythm('pacedVVI', { pacer: { ratePpm: 70, intrinsic: 'none' } }), 'diathermy off']], T + 300, PM, { dt: 1 }) },
  measure: (R) => m({ hrBase: base(R.i!.rows, 'hr'), hrMin: mn(R.i!.rows, 'hr', T, T + 25), mapMin: mn(R.i!.rows, 'map', T, T + 40), rhythms: R.i!.rhythms.map(([t, id]) => `${t}:${id}`).join(' '), hrRecovered: r1(mean(R.i!.rows, 'hr', T + 120, T + 300)) }),
  expect: [{ m: 'hrMin', lo: 0, hi: 35, src: 'research/12 CM-16: oversensing inhibits pacing → the underlying CHB escape 30–35 or asystole (Barash, CIEDs)' },
    { m: 'mapMin', lo: 0, hi: 60, src: 'no output for the inhibition → pressure falls (direction; band proposed)' }],
  owner: 'Stage 5 pacer faults / DV' });
add({ id: 'CM-16b', tier: 'P2', ctx: 'pacemaker-dependent (VVI 70 over CHB), ventilated', state: 'paced', intv: 'loss of capture (failureToCapture, faultRate 1) for 60 s', sys: 'RHY CIRC',
  arms: { i: V([[T, A.rhythm('pacedVVI', { pacer: { ratePpm: 70, intrinsic: 'none', fault: 'failureToCapture', faultRate: 1 } }), 'failure to capture'], [T + 60, A.rhythm('pacedVVI', { pacer: { ratePpm: 70, intrinsic: 'none' } }), 'capture restored']], T + 300, PM, { dt: 1 }) },
  measure: (R) => m({ hrBase: base(R.i!.rows, 'hr'), hrMin: mn(R.i!.rows, 'hr', T, T + 60), mapMin: mn(R.i!.rows, 'map', T, T + 70), rhythms: R.i!.rhythms.map(([t, id]) => `${t}:${id}`).join(' '), arrestish: arrestIn(R.i!.rows, T, T + 60) }),
  expect: [{ m: 'hrMin', lo: 0, hi: 35, src: 'research/12 CM-16 / tables §1.5 pmDependent: loss of capture exposes the underlying escape 30–35 or asystole' },
    { m: 'mapMin', lo: 0, hi: 60, src: 'direction; band proposed' }],
  owner: 'Stage 5 pacer faults / DV' });

// ---- CM-17 smoker (COHb 8 %) ---------------------------------------------------------------------------------------
add({ id: 'CM-17', tier: 'P3', ctx: 'heavy smoker COHb 8 % vs X-A, awake, room air', state: 'carboxyhaemoglobinaemia', intv: 'none (displayed SpO2 vs true oxygenation)', sys: 'BLD DEV',
  arms: { s: SP([], T + 60, SMK), a: SP([], T + 60) },
  measure: (R) => { const fo2 = (x: string) => r1(mean(R[x]!.rows, 'sao2', T - 60, T) * (1 - mean(R[x]!.rows, 'cohb', T - 60, T) / 100));
    return m({ spo2Shown: base(R.s!.rows, 'spo2'), cohb: base(R.s!.rows, 'cohb'), fo2hb: fo2('s'), overRead: r1(base(R.s!.rows, 'spo2') - fo2('s')), cao2Ratio: r2(mean(R.s!.rows, 'cao2', T - 60, T) / mean(R.a!.rows, 'cao2', T - 60, T)) }); },
  expect: [{ m: 'overRead', lo: 4, hi: 10, src: 'tables §1.5 smoker: displayed SpO2 over-reads by ≈ 1.06·COHb − 2.5 (≈ 6 at 8 %) (Barker & Tremper 1987)' },
    { m: 'cao2Ratio', lo: 0.88, hi: 0.95, invert: true, src: 'tables §1.5 smoker: CaO2 falls by ≈ the COHb fraction' }],
  owner: '7c ODC / L3 pulse oximeter' });

// ---- CM-18 chronic anaemia Hb 8 ------------------------------------------------------------------------------------
add({ id: 'CM-18a', tier: 'P2', ctx: 'chronic anaemia Hb 8 (profile blood.hb) vs X-A, ventilated', state: 'chronic anaemia', intv: 'bleed 1 L over 10 min', sys: 'BLD CIRC',
  arms: { i: V([BLEED1L(T)], T + 1200, ANAEM), c: V([], T + 1200, ANAEM), ia: V([BLEED1L(T)], T + 1200), ca: V([], T + 1200) },
  measure: (R) => m({ coRestPct: r1(100 * (mean(R.c!.rows, 'co', T - 60, T) / mean(R.ca!.rows, 'co', T - 60, T) - 1)), do2Rest: base(R.c!.rows, 'do2'), do2RestA: base(R.ca!.rows, 'do2'),
    do2Min: mn(R.i!.rows, 'do2', T, T + 1200), do2MinA: mn(R.ia!.rows, 'do2', T, T + 1200), do2Ratio: r2(mn(R.i!.rows, 'do2', T, T + 1200) / mn(R.ia!.rows, 'do2', T, T + 1200)),
    dLact: r2(mx(R.i!.rows, 'lact', T, T + 1200) - mean(R.i!.rows, 'lact', T - 60, T)), dLactA: r2(mx(R.ia!.rows, 'lact', T, T + 1200) - mean(R.ia!.rows, 'lact', T - 60, T)), svo2Min: mn(R.i!.rows, 'svo2', T, T + 1200), svo2MinA: mn(R.ia!.rows, 'svo2', T, T + 1200) }),
  expect: [{ m: 'do2Ratio', lo: 0.45, hi: 0.75, invert: true, src: 'tables §1.5 anaemia: DO2 ↓ in proportion to Hb (8/15 = 0.53) with a small chronic CO rise' },
    { m: 'coRestPct', lo: 0, hi: 20, src: 'tables §1.5 anaemia: resting CO rises only when Hb < ≈ 7 (Anaemia-OA); SVR ×0.85 chronic' },
    { m: 'svo2Min', lo: 50, hi: 68, invert: true, src: 'research/12 CM-18: the anaemic patient reaches a low SvO2 sooner on the same bleed (O2ER rises; direction band proposed)' }],
  owner: '7c O2 transport' });
add({ id: 'CM-18b', tier: 'P2', ctx: 'chronic anaemia Hb 8, ventilated, after a 1 L bleed', state: 'anaemia + haemorrhage', intv: 'RBC 2 units over 20 min', sys: 'BLD CIRC',
  arms: { i: V([BLEED1L(T), [T + 600, A.transfusion({ product: 'rbc', units: 2, overS: 1200 }), 'RBC 2 u / 20 min']], T + 2400, ANAEM), c: V([BLEED1L(T)], T + 2400, ANAEM) },
  measure: (R) => m({ hbBefore: r1(mean(R.i!.rows, 'hb', T + 540, T + 600)), hbAfter: r1(mean(R.i!.rows, 'hb', T + 2100, T + 2400)), dHb: r1(mean(R.i!.rows, 'hb', T + 2100, T + 2400) - mean(R.c!.rows, 'hb', T + 2100, T + 2400)),
    do2GainPct: r1(100 * (mean(R.i!.rows, 'do2', T + 2100, T + 2400) / mean(R.c!.rows, 'do2', T + 2100, T + 2400) - 1)) }),
  expect: [{ m: 'dHb', lo: 1.4, hi: 2.6, src: 'AABB / ATLS: each RBC unit raises Hb ≈ 1 g/dL in an adult' }, { m: 'do2GainPct', dir: 1, tol: 10, src: 'research/12 CM-18: RBC restores DO2' }],
  owner: '7c transfusion' });

// ---- CM-15c (added): AF with a rapid rate must not make a healthy heart ischaemic -----------------------------------
add({ id: 'CM-15c', tier: 'P1', ctx: 'healthy 40 y and 70 y (normal coronaries, CFR 3.5), ventilated', state: 'AF with RVR 150/min for 20 min', intv: 'none (the rhythm itself; quiet check added after CM-15b arrested)', sys: 'CIRC RHY',
  arms: { a: V([[T, A.rhythm('afib', { rateBpm: 150 }), 'AF 150']], T + 1200, XA), e: V([[T, A.rhythm('afib', { rateBpm: 150 }), 'AF 150']], T + 1200, X70), s: V([[T, { type: 'setTarget', variable: 'hr', value: 150 }, 'sinus held at 150']], T + 1200, XA) },
  measure: (R) => m({ kIschMin40: r2(mn(R.a!.rows, 'kIsch', T, T + 1200)), kIschMean40: r2(mean(R.a!.rows, 'kIsch', T + 300, T + 1200)), kIschMin70: r2(mn(R.e!.rows, 'kIsch', T, T + 1200)), kIschSinus150: r2(mn(R.s!.rows, 'kIsch', T, T + 1200)),
    negCppSamples40: R.a!.rows.filter((r) => (r.t as number) > T && (r.cppCor as number) < 0).length, lvedpMax40: mx(R.a!.rows, 'lvedpEv', T, T + 1200), svMean40: w(R.a!.rows, 'sv', T + 300, T + 1200), mapMean40: w(R.a!.rows, 'map', T + 300, T + 1200),
    arrest40: arrestIn(R.a!.rows, T, T + 1200), arrest70: arrestIn(R.e!.rows, T, T + 1200) }),
  expect: [{ m: 'kIschMin40', lo: 0.9, hi: 1, src: 'quiet: AF at 150/min in a heart with normal coronaries causes no global ischaemic contractility loss (CFR 3.5; tables §3; ESC AF 2020 — tachycardia-induced cardiomyopathy takes weeks)' },
    { m: 'arrest40', event: false, src: 'a healthy 40 y does not arrest from 20 min of AF 150 (ESC AF 2020: rapid AF in a normal heart causes symptoms and hypotension, not arrest)' },
    { m: 'arrest70', event: false, src: 'a healthy 70 y does not arrest from 20 min of AF 150' }],
  owner: '7a coronary.ts (per-beat CPP in AF)' });
