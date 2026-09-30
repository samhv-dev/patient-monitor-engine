// CM group A — elderly (CM-01), obese (CM-02), hypertension (CM-03). research/12 §5.7 battery: (a) awake baseline,
// (b) induction, (c) laryngoscopy, (d) vasopressor rescue, (e) bleed 1 L, (f) PEEP / apnoea. Every comorbid arm is
// read against the healthy reference at the same sim time (R53, the audit 08 §K method).
import { A } from './runner.ts';
import {
  add, APNOEA, arrestIn, base, baseR, BLEED1L, d, dMax, dMin, hemo, HTNT, HTNU, m, minToSat, mn, mx, pctMin, SP, T, TAP, V, XA, XE, XO, XOp, type Expect,
} from './spec.ts';
import { mean, maxOf, r1, r2, type Row, type Step } from './runner.ts';

const pro = (t: number, mgkg = 2) => d(t, 'propofol', mgkg, 'mg/kg');
const NOARREST: Expect = { m: 'arrest', event: false, src: 'FU-4 rule: a compensated comorbid patient must not arrest on a standard induction' };
const GA: Step = [1, A.thermal({ anaesthesia: 'general' }), 'thermal GA (audit 09 switch; FU-6 R4 removes it)'];
const pp = (rows: Row[]) => r1(mean(rows, 'sbp', T - 60, T) - mean(rows, 'dbp', T - 60, T));

// ---- CM-01 elderly 80 y (no HTN) ------------------------------------------------------------------------------------
add({ id: 'CM-01a', tier: 'P1', ctx: 'X-E 80 y vs X-A, awake, room air', state: 'awake baseline', intv: 'none (resting values)', sys: 'CIRC LUNG',
  arms: { e: SP([], T + 60, XE), a: SP([], T + 60) },
  measure: (R) => m({ mapE: base(R.e!.rows, 'map'), mapA: base(R.a!.rows, 'map'), hrE: base(R.e!.rows, 'hr'), hrA: base(R.a!.rows, 'hr'), ppE: pp(R.e!.rows), ppA: pp(R.a!.rows),
    dPP: r1(pp(R.e!.rows) - pp(R.a!.rows)), coE: baseR(R.e!.rows, 'co'), coA: baseR(R.a!.rows, 'co'), pao2E: base(R.e!.rows, 'pao2'), pao2A: base(R.a!.rows, 'pao2'), spo2E: base(R.e!.rows, 'spo2') }),
  expect: [{ m: 'mapE', lo: 90, hi: 105, src: 'tables §1.1 elderly MAP set point 90–100 (PALS/B §4.9)' },
    { m: 'hrE', lo: 55, hi: 90, src: 'tables §1.1 elderly resting HR 65 (55–90)' },
    { m: 'dPP', dir: 1, tol: 5, src: 'tables §1.1 arterial compliance ×0.4–0.6: isolated systolic hypertension, wider pulse pressure (RVAS 2010)' },
    { m: 'pao2E', lo: 65, hi: 85, invert: true, src: 'tables §1.1 shunt row: PaO2 ≈ 100 − 0.3·age on air (Sorbini 1968) = 76 at 80 y' }],
  owner: '7a profile / 7b' });

add({ id: 'CM-01b', tier: 'P1', ctx: 'X-E 80 y vs X-A, ventilated', state: 'elderly, GA', intv: 'propofol 1.5 mg/kg', sys: 'CIRC',
  arms: { i: V([pro(T, 1.5)], T + 900, XE), c: V([], T + 900, XE), ia: V([pro(T, 1.5)], T + 900), ca: V([], T + 900) },
  measure: (R) => { const h = hemo(R.i!.rows, R.c!.rows, T); const a = pctMin(R.ia!.rows, R.ca!.rows, 'map', T, T + 600);
    return m({ ...h, mapBase: base(R.c!.rows, 'map'), mapPctA: a, extraFall: r1((h.mapPct as number) - a) }); },
  expect: [{ m: 'mapPct', lo: -45, hi: -25, src: 'research/12 CM-01: elderly induction −30–45 % (Reich 2005: age > 50 and propofol predict post-induction hypotension); tables §1.5' },
    { m: 'extraFall', dir: -1, tol: 2, src: 'R53 state-dependence: the same dose falls further in the elderly (reduced sympathetic gains ×0.6, stiff arteries; tables §1.1)' }, NOARREST],
  owner: 'FU-4 G2 (done) / 7a profile' });

add({ id: 'CM-01c', tier: 'P1', ctx: 'X-E 80 y vs X-A, ventilated', state: 'elderly', intv: 'propofol PK: 1.5 mg/kg bolus (peak Ce and its time) and Eleveld effect-site TCI 3 µg/mL for 10 min (dose delivered)', sys: 'PK NEU',
  arms: { be: V([pro(T, 1.5)], T + 600, XE), ba: V([pro(T, 1.5)], T + 600), te: V([[T, A.tci('propofol', 3, 'effect', 'eleveld'), 'TCI Ce 3 Eleveld']], T + 600, XE), ta: V([[T, A.tci('propofol', 3, 'effect', 'eleveld'), 'TCI Ce 3 Eleveld']], T + 600) },
  measure: (R) => { const pk = (rows: Row[]) => maxOf(rows, 'ce_propofol', T, T + 600);
    const e = pk(R.be!.rows); const a = pk(R.ba!.rows);
    const cum = (rows: Row[]) => mx(rows, 'cum_propofol', T, T + 600);
    return m({ cePeakE: r2(e.v), cePeakA: r2(a.v), cePeakRatio: r2(e.v / a.v), tPeakE: e.t - T, tPeakA: a.t - T, dTPeak: e.t - a.t,
      tciDoseE: cum(R.te!.rows), tciDoseA: cum(R.ta!.rows), tciDoseRatio: r2(cum(R.te!.rows) / cum(R.ta!.rows)), diMinE: mn(R.be!.rows, 'di', T, T + 300), diMinA: mn(R.ba!.rows, 'di', T, T + 300),
      diTciE: r1(mean(R.te!.rows, 'di', T + 300, T + 600)), diTciA: r1(mean(R.ta!.rows, 'di', T + 300, T + 600)), dDiTci: r1(mean(R.te!.rows, 'di', T + 300, T + 600) - mean(R.ta!.rows, 'di', T + 300, T + 600)) }); },
  expect: [{ m: 'cePeakRatio', lo: 1.1, hi: 1.7, src: 'Schnider 1999 / Eleveld 2018: age shrinks V1 and clearance, so the same mg/kg gives a higher peak Ce in the elderly' },
    { m: 'dTPeak', dir: 1, tol: 4, src: 'research/12 CM-01: slower onset in the elderly (Ce peak later; slower circulation, Upton 1999)' },
    { m: 'dDiTci', dir: -1, tol: 3, src: 'Eleveld 2018 PD: Ce50 = 3.08·exp(−0.00635·(age − 35)) → 2.3 µg/mL at 80 y vs 3.0 at 40 y, so the same Ce 3 is deeper in the elderly — the PD half of "30–50 % less propofol" (Miller 10e ch. 21); the PK half is tciDoseRatio (reported, not graded: research/12 put the whole reduction on "the same Ce", which the sources do not support)' }],
  owner: '7g PK (Eleveld/age)' });

add({ id: 'CM-01d', tier: 'P1', ctx: 'X-E 80 y vs X-A, ventilated', state: 'post-induction hypotension (propofol 1.5 mg/kg at T)', intv: 'phenylephrine 100 µg at T + 120 s', sys: 'CIRC',
  arms: { i: V([pro(T, 1.5), d(T + 120, 'phenylephrine', 100, 'mcg')], T + 600, XE), c: V([pro(T, 1.5)], T + 600, XE), ia: V([pro(T, 1.5), d(T + 120, 'phenylephrine', 100, 'mcg')], T + 600), ca: V([pro(T, 1.5)], T + 600) },
  measure: (R) => { const t0 = T + 120; const hrE = dMin(R.i!.rows, R.c!.rows, 'hr', t0, t0 + 300); const hrA = dMin(R.ia!.rows, R.ca!.rows, 'hr', t0, t0 + 300);
    return m({ mapRiseE: dMax(R.i!.rows, R.c!.rows, 'map', t0, t0 + 300), mapRiseA: dMax(R.ia!.rows, R.ca!.rows, 'map', t0, t0 + 300), hrDropE: hrE, hrDropA: hrA, hrDropRatio: r2(hrE / hrA) }); },
  expect: [{ m: 'mapRiseE', dir: 1, tol: 8, src: 'tables §6.2: phenylephrine 100 µg MAP +15–25 % (the elderly respond at least as much)' },
    { m: 'hrDropRatio', lo: 0.2, hi: 0.7, src: 'tables §1.1 baroreflex vagal gain elderly 5–8 vs adult 15 ms/mmHg (Gribbin 1971; DM-BRS): smaller reflex bradycardia' }],
  owner: '7a baroreflex (profile G_v)' });

add({ id: 'CM-01e', tier: 'P1', ctx: 'X-E 80 y vs X-A, ventilated', state: 'GA (no drug), normovolaemic', intv: 'bleed 1 L over 10 min', sys: 'CIRC BLD KID',
  arms: { i: V([BLEED1L(T)], T + 900, XE), c: V([], T + 900, XE), ia: V([BLEED1L(T)], T + 900), ca: V([], T + 900) },
  measure: (R) => { const w = (x: string, y: string, k: string) => dMin(R[x]!.rows, R[y]!.rows, k, T, T + 900);
    const hE = dMax(R.i!.rows, R.c!.rows, 'hr', T, T + 900); const hA = dMax(R.ia!.rows, R.ca!.rows, 'hr', T, T + 900);
    return m({ mapDropE: w('i', 'c', 'map'), mapDropA: w('ia', 'ca', 'map'), extraDrop: r1(w('i', 'c', 'map') - w('ia', 'ca', 'map')), hrRiseE: hE, hrRiseA: hA, hrRiseRatio: r2(hE / hA),
      uopE: r1(mean(R.i!.rows, 'uop', T + 600, T + 900)), lactPeakE: mx(R.i!.rows, 'lact', T, T + 900), arrest: arrestIn(R.i!.rows, T, T + 900) }); },
  expect: [{ m: 'extraDrop', dir: -1, tol: 2, src: 'tables §1.1 sympathetic gains ×0.6 in the elderly: the same loss drops MAP further (ATLS 10e geriatric trauma)' },
    { m: 'hrRiseRatio', lo: 0.3, hi: 0.8, src: 'tables §1.1 (g ×0.6); ATLS 10e: the elderly may not mount a tachycardia' }, NOARREST],
  owner: '7a baroreflex (profile gSymp)' });

add({ id: 'CM-01f', tier: 'P1', ctx: 'X-E 80 y vs X-A, awake → induced apnoea', state: 'preoxygenated 3 min, propofol + rocuronium, open airway', intv: 'apnoea: time to SaO2 90 %', sys: 'LUNG',
  arms: { e: { patient: XE, steps: APNOEA, tEnd: TAP + 1200, dt: 2 }, a: { patient: XA, steps: APNOEA, tEnd: TAP + 1200, dt: 2 } },
  measure: (R) => m({ minE: minToSat(R.e!.rows, TAP), minA: minToSat(R.a!.rows, TAP), dMin: r2(minToSat(R.e!.rows, TAP) - minToSat(R.a!.rows, TAP)),
    frcGaE: base(R.e!.rows, 'frcGa', TAP), frcGaA: base(R.a!.rows, 'frcGa', TAP), vo2E: base(R.e!.rows, 'vo2', TAP), vo2A: base(R.a!.rows, 'vo2', TAP), pao2PreE: base(R.e!.rows, 'pao2', TAP) }),
  expect: [{ m: 'dMin', dir: -1, tol: 0.3, src: 'research/12 CM-01 (direction only — no sourced band): closing capacity exceeds the supine FRC from ≈ 44 y (tables §1.1 FRC row, BJAEd closing capacity), so the elderly desaturate sooner despite a lower VO2' }],
  owner: '7b / Stage 3 (profile FRC and closing capacity)' });

// ---- CM-02 obese BMI 41 (127 kg, 175 cm) ----------------------------------------------------------------------------
add({ id: 'CM-02a', tier: 'P1', ctx: 'X-O BMI 41 (+ lung obesity) vs X-A, awake, room air', state: 'awake baseline', intv: 'none (resting values); the profile-only twin checks double counting', sys: 'CIRC LUNG BLD',
  arms: { o: SP([], T + 60, XO), op: SP([], T + 60, XOp), a: SP([], T + 60) },
  measure: (R) => m({ coO: baseR(R.o!.rows, 'co'), coA: baseR(R.a!.rows, 'co'), coRatio: r2(mean(R.o!.rows, 'co', T - 60, T) / mean(R.a!.rows, 'co', T - 60, T)),
    bvMlKg: r1((R.o!.rows.at(-1)!.bvMl as number) / 127), bvMl: r1(R.o!.rows.at(-1)!.bvMl as number), frcGaRatio: r2(base(R.o!.rows, 'frcGa') / base(R.a!.rows, 'frcGa')), frcGaRatioProfileOnly: r2(base(R.op!.rows, 'frcGa') / base(R.a!.rows, 'frcGa')),
    crsO: base(R.o!.rows, 'crs'), crsOp: base(R.op!.rows, 'crs'), crsA: base(R.a!.rows, 'crs'), pao2O: base(R.o!.rows, 'pao2'), pao2Op: base(R.op!.rows, 'pao2'), mapO: base(R.o!.rows, 'map') }),
  expect: [{ m: 'coRatio', lo: 1.2, hi: 1.5, src: 'tables §1.3 BMI ≥ 40: resting CO ×1.35 (emerges from VO2 and blood volume)' },
    { m: 'bvMlKg', lo: 48, hi: 57, src: 'tables §1.3 / Lemmens 2006: 70/√(BMI/22) = 51 mL/kg actual weight at BMI 41' },
    { m: 'frcGaRatio', lo: 0.4, hi: 0.6, src: 'tables §1.3 FRC factor 0.5 at BMI ≥ 40 (floor 0.4) — one factor, not profile × lung condition' }],
  owner: '7a/7c profile + Stage 3 gasPatient + 7b obesity',
  hand: { verdict: 'IN', why: 'one patient, two blood volumes: 7a sizes the circulation on total body weight (70 mL/kg × 127 kg = 8.89 L; circ/profile.ts:94, 110 — every volume and compliance ×W/70, so CO ×1.85), while 7c and Stage 3 use the adjusted weight (6.48 L and 6.52 L; gas/params.ts:152, 159). Lemmens gives 6.5 L. The FRC factor is applied once (no double count with lung `obesity`)' } });

add({ id: 'CM-02b', tier: 'P1', ctx: 'X-O BMI 41 vs X-A, awake → induced apnoea', state: 'preoxygenated 3 min, propofol + rocuronium', intv: 'apnoea: time to SaO2 90 %', sys: 'LUNG',
  arms: { o: { patient: XO, steps: APNOEA, tEnd: TAP + 900, dt: 2 }, a: { patient: XA, steps: APNOEA, tEnd: TAP + 900, dt: 2 } },
  measure: (R) => m({ minO: minToSat(R.o!.rows, TAP), minA: minToSat(R.a!.rows, TAP), frcGaO: base(R.o!.rows, 'frcGa', TAP) }),
  expect: [{ m: 'minO', lo: 2.0, hi: 3.5, invert: true, src: 'Benumof 1997 (Anesthesiology 87:979): 127 kg adult, SaO2 90 % at 2.7 min after full preoxygenation; Jense 1991' }],
  owner: 'Stage 3 / 7b (FRC); FU-6 R4 removes the switch',
  hand: { verdict: 'IN', why: 'two commands for one body habitus stack: with the profile alone (127 kg, 175 cm) the time is 2.7 min — Benumof exactly, the value gasPatient was tuned to (gas/params.ts:142–143, FRC ×0.43); adding research/12 X-O\'s lung `obesity` 1 raises the pre-apnoea shunt 0.04 → 0.07 and cuts compliance 54 → 35, halving the time to 1.43 min with the SAME FRC (598 mL). The catalogue condition re-applies what the profile already models (probe on 0fd5397)'} });

const OBV = (vt: number, extra: Step[] = []): Step[] => [GA, [1, A.device('ett'), 'ETT'], [1, A.vent({ vtMl: vt, rr: 14, peep: 5, fio2: 0.5 }), `VCV 14 × ${vt} PEEP 5 FiO2 0.5`], ...extra];
add({ id: 'CM-02c', tier: 'P1', ctx: 'X-O BMI 41 vs X-A, ventilated (thermal GA)', state: 'GA, VCV 14/min, PEEP 5', intv: 'VT 6 mL/kg PBW (423 mL) vs 6 mL/kg TBW (762 mL)', sys: 'LUNG',
  arms: { p: { patient: XO, steps: OBV(423), tEnd: T + 360, mech: [T + 300] }, t: { patient: XO, steps: OBV(762), tEnd: T + 360, mech: [T + 300] }, a: { patient: XA, steps: OBV(423), tEnd: T + 360, mech: [T + 300] } },
  measure: (R) => { const at = (x: string, k: string) => r1(R[x]!.rows.find((r) => r.t === T + 305)![k] as number);
    return m({ pplatPBW: at('p', 'pplat'), pplatTBW: at('t', 'pplat'), dPplat: r1(at('t', 'pplat') - at('p', 'pplat')), ppeakPBW: at('p', 'ppeak'), pplatA: at('a', 'pplat'),
      crsO: at('p', 'crs'), crsA: at('a', 'crs'), crsRatio: r2(at('p', 'crs') / at('a', 'crs')), paco2PBW: at('p', 'paco2'), pao2PBW: at('p', 'pao2') }); },
  expect: [{ m: 'pplatPBW', lo: 10, hi: 30, src: 'ARDSNet / lung-protective ventilation: VT by predicted body weight keeps Pplat ≤ 30 in the obese' },
    { m: 'dPplat', lo: 5, hi: 25, src: 'Pelosi 1998: total-body-weight VT in a stiff obese respiratory system raises Pplat several cmH2O' },
    { m: 'crsRatio', lo: 0.5, hi: 0.8, src: 'tables §1.3 respiratory compliance ×0.65 at BMI ≥ 40 (Pelosi 1998: Crs −30–40 %)' }],
  owner: '7b mechanics (obesity)' });

add({ id: 'CM-02d', tier: 'P1', ctx: 'X-O BMI 41 vs X-A, ventilated (thermal GA), VT 6 mL/kg PBW', state: 'induction atelectasis', intv: 'PEEP 5 → 10 plus a recruitment manoeuvre 40 cmH2O × 30 s at T', sys: 'LUNG CIRC',
  arms: { i: { patient: XO, steps: OBV(423, [[T, A.recruit(40, 30), 'RM 40 × 30 s'], [T + 31, A.vent({ vtMl: 423, rr: 14, peep: 10, fio2: 0.5 }), 'PEEP 10']]), tEnd: T + 900 }, c: { patient: XO, steps: OBV(423), tEnd: T + 900 },
    ia: { patient: XA, steps: OBV(423, [[T, A.recruit(40, 30), 'RM 40 × 30 s'], [T + 31, A.vent({ vtMl: 423, rr: 14, peep: 10, fio2: 0.5 }), 'PEEP 10']]), tEnd: T + 900 }, ca: { patient: XA, steps: OBV(423), tEnd: T + 900 } },
  measure: (R) => { const pc = (x: string, y: string) => r1((100 * (mean(R[x]!.rows, 'pao2', T + 600, T + 900) - mean(R[y]!.rows, 'pao2', T + 600, T + 900))) / mean(R[y]!.rows, 'pao2', T + 600, T + 900));
    return m({ pao2PreO: base(R.c!.rows, 'pao2'), pao2PctO: pc('i', 'c'), pao2PctA: pc('ia', 'ca'), shuntPreO: baseR(R.c!.rows, 'shunt'), shuntPostO: r2(mean(R.i!.rows, 'shunt', T + 600, T + 900)), mapPctO: pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 900) }); },
  expect: [{ m: 'pao2PctO', dir: 1, tol: 10, src: 'Reinius 2009 (Anesthesiology 111:979) / Futier 2011: a recruitment manoeuvre + PEEP 10 raises PaO2 and cuts atelectasis in BMI > 40' },
    { m: 'pao2PctO', lo: 15, hi: 150, src: 'Pelosi 1999 / Reinius 2009: PaO2/FiO2 rises ≈ 20–100 % in the morbidly obese after RM + PEEP' }],
  owner: '7b recruitment (obesity atelectasis)', known: 'FU-6 R14' });

add({ id: 'CM-02e', tier: 'P1', ctx: 'X-O BMI 41, ventilated', state: 'GA supine', intv: 'reverse Trendelenburg 30°', sys: 'LUNG CIRC',
  arms: { i: { patient: XO, steps: OBV(423, [[T, A.position({ headUpDeg: 30 }), 'head-up 30° (the only posture input)']]), tEnd: T + 600 }, c: { patient: XO, steps: OBV(423), tEnd: T + 600 } },
  measure: (R) => m({ frcGaPre: base(R.i!.rows, 'frcGa'), frcGaPost: r1(mean(R.i!.rows, 'frcGa', T + 300, T + 600)), dPao2: r1(mean(R.i!.rows, 'pao2', T + 300, T + 600) - mean(R.c!.rows, 'pao2', T + 300, T + 600)),
    dMap: r1(mean(R.i!.rows, 'map', T + 300, T + 600) - mean(R.c!.rows, 'map', T + 300, T + 600)), dCbf: r2(mean(R.i!.rows, 'cbf', T + 300, T + 600) - mean(R.c!.rows, 'cbf', T + 300, T + 600)) }),
  expect: [{ m: 'dPao2', dir: 1, tol: 5, src: 'Perilli 2000 / tables §1.3: reverse Trendelenburg raises FRC and PaO2 in the obese' }],
  owner: 'posture stage (FU-7 "surgical events and posture")',
  hand: { verdict: 'NE', why: 'no whole-body tilt exists: the only posture input (7d `position` headUpDeg) moves cerebral hydrostatics only — FRC, compliance and venous return are unchanged (measured below); research/12 NE blocker "posture"' } });

// ---- CM-03 hypertension untreated / treated -------------------------------------------------------------------------
add({ id: 'CM-03a', tier: 'P1', ctx: 'htn untreated (sev 1) / treated (sev 0.5) vs X-A, awake', state: 'awake baseline', intv: 'none (resting values)', sys: 'CIRC',
  arms: { u: SP([], T + 60, HTNU), t: SP([], T + 60, HTNT), a: SP([], T + 60) },
  measure: (R) => m({ mapU: base(R.u!.rows, 'map'), mapT: base(R.t!.rows, 'map'), mapA: base(R.a!.rows, 'map'), dMapU: r1(base(R.u!.rows, 'map') - base(R.a!.rows, 'map')), dMapT: r1(base(R.t!.rows, 'map') - base(R.a!.rows, 'map')),
    ppU: pp(R.u!.rows), ppA: pp(R.a!.rows), hrU: base(R.u!.rows, 'hr') }),
  expect: [{ m: 'dMapU', lo: 15, hi: 25, src: 'tables §1.5 htn: MAP set point +20 untreated' }, { m: 'dMapT', lo: 5, hi: 15, src: 'tables §1.5 htn: +10 treated' }],
  owner: '7a profile' });

add({ id: 'CM-03b', tier: 'P1', ctx: 'htn untreated vs X-A, ventilated', state: 'GA', intv: 'propofol 2 mg/kg', sys: 'CIRC',
  arms: { i: V([pro(T)], T + 900, HTNU), c: V([], T + 900, HTNU), it: V([pro(T)], T + 900, HTNT), ct: V([], T + 900, HTNT), ia: V([pro(T)], T + 900), ca: V([], T + 900) },
  measure: (R) => { const h = hemo(R.i!.rows, R.c!.rows, T); const a = pctMin(R.ia!.rows, R.ca!.rows, 'map', T, T + 600); const t = pctMin(R.it!.rows, R.ct!.rows, 'map', T, T + 600);
    return m({ ...h, mapPctTreated: t, mapPctA: a, extraFall: r1((h.mapPct as number) - a) }); },
  expect: [{ m: 'mapPct', lo: -50, hi: -30, src: 'tables §1.5 htn: larger induction fall (40 % vs 30 %) (Prys-Roberts 1971; Reich 2005)' },
    { m: 'extraFall', dir: -1, tol: 2, src: 'R53: the hypertensive falls further than the normotensive on the same dose' }, NOARREST],
  owner: 'FU-4 G2 (done) / 7a profile' });

add({ id: 'CM-03c', tier: 'P1', ctx: 'htn untreated vs X-A, ventilated', state: 'propofol 2 mg/kg at T (no opioid)', intv: 'laryngoscopy stimulus 1.5 for 60 s at T + 120 s', sys: 'CIRC END',
  arms: { i: V([pro(T), [T + 120, A.stim(1.5), 'laryngoscopy 1.5'], [T + 180, A.stim(0), 'stimulus off']], T + 600, HTNU), c: V([pro(T)], T + 600, HTNU),
    ia: V([pro(T), [T + 120, A.stim(1.5), 'laryngoscopy 1.5'], [T + 180, A.stim(0), 'stimulus off']], T + 600), ca: V([pro(T)], T + 600) },
  measure: (R) => { const t0 = T + 120; const u = dMax(R.i!.rows, R.c!.rows, 'map', t0, t0 + 240); const a = dMax(R.ia!.rows, R.ca!.rows, 'map', t0, t0 + 240);
    return m({ dMapU: u, dMapA: a, ratio: r2(u / a), dHrU: dMax(R.i!.rows, R.c!.rows, 'hr', t0, t0 + 240), dHrA: dMax(R.ia!.rows, R.ca!.rows, 'hr', t0, t0 + 240) }); },
  expect: [{ m: 'dMapA', lo: 20, hi: 40, src: 'Miller 10e airway ch.: laryngoscopy after an induction dose raises MAP +20–40 mmHg (Shribman 1987); FU-7 ruling 1' },
    { m: 'ratio', lo: 1.3, hi: 3, src: 'Prys-Roberts 1971 (BJA 43:531): untreated hypertensives show an exaggerated pressor response to laryngoscopy (≈ 2× normotensives)' }],
  owner: '7e stimulus / 7a set point', known: 'FU-7 Task 10' });

const MAN65: Step[] = [[T, { type: 'setTarget', variable: 'sbp', value: 85 }, 'MANUAL target SBP 85'], [T, { type: 'setTarget', variable: 'dbp', value: 55 }, 'MANUAL target DBP 55']];
add({ id: 'CM-03d', tier: 'P1', ctx: 'htn untreated vs X-A, ventilated, MANUAL (the instructor sets the pressure)', state: 'MAP lowered to ≈ 65 by the instructor', intv: 'cerebral blood flow at MAP 65 vs each patient\'s own baseline', sys: 'BRN',
  arms: { u: V(MAN65, T + 600, HTNU, { mode: 'manual' }), a: V(MAN65, T + 600, XA, { mode: 'manual' }) },
  measure: (R) => { const rel = (x: string) => r2(mean(R[x]!.rows, 'cbf', T + 300, T + 600) / mean(R[x]!.rows, 'cbf', T - 60, T));
    return m({ mapU: r1(mean(R.u!.rows, 'map', T + 300, T + 600)), mapA: r1(mean(R.a!.rows, 'map', T + 300, T + 600)), cbfRelU: rel('u'), cbfRelA: rel('a'), dCbf: r2(rel('u') - rel('a')) }); },
  expect: [{ m: 'cbfRelA', lo: 0.9, hi: 1.1, src: 'Lassen 1959 / Miller ch. 11: MAP 65 lies on the normotensive autoregulation plateau' },
    { m: 'cbfRelU', lo: 0.6, hi: 0.9, src: 'tables §1.5 htn: CBF lower limit +15–20 (Strandgaard 1973): below the shifted limit CBF falls' }],
  owner: '7d brain (HTN_LL_SHIFT)' });
