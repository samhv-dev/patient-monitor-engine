// ET group C — P2/P3: therapeutic and accidental hypothermia (ET-08, ET-09), septic fever (ET-12), thyroid storm and
// hypothyroidism (ET-13, ET-14), adrenal insufficiency (ET-15), hypoglycaemia under GA (ET-21), D50 (ET-22), DKA and RSI
// (ET-23), phaeochromocytoma/carcinoid (ET-24/25, NE), septic phases (ET-26), vasoplegia (ET-28), and the added cells:
// overwarming (ET-30), epidural blunting of the stress response (ET-32, NE), opioids and the shivering threshold (ET-33),
// etomidate and cortisol (ET-34).
import { A, ADRENAL, FLAG, GA, H, HYPO, T, V, SP, XA, MG, a2, a3, add, anyR, at, first, m, mn, mx, rh, w, r2, r3, d, inf } from './spec.ts';
import type { ArmResult, Row } from './runner.ts';

// ---- ET-08 therapeutic hypothermia 32 / 34 °C (the MODELED core target = the instructor's cooling device) ---------------
const TGT = (c: number, t = T + 60): [number, any, string] => [t, A.target('tempCore', c, 900), `core target ${c} °C over 15 min (instructor cooling)`];
const TC = T + 1500; // cooling finished (T + 60 + 900) and settled
add({ id: 'ET-08a', tier: 'P2', ctx: 'X-A ventilated, sevoflurane 2 % GA', state: 'core 32 °C (instructor target) vs 36.8', intv: 'the same sevoflurane dial: MAC requirement per °C', sys: 'NEU',
  arms: { h: V([...GA(), TGT(32)], TC + 1800, XA, { dt: 30 }), n: V(GA(), TC + 1800, XA, { dt: 30 }) },
  measure: (R) => { const h = R.h!.rows, n = R.n!.rows; const tt = TC + 1200; const macF = at(h, 'macF', tt) as number, tc = at(h, 'tc', tt) as number;
    return m({ tc: r2(tc), macF: r3(macF), macRedPerC: r2((100 * (1 - macF)) / (36.8 - tc)), diHypo: a2(h, 'di', tt), diNormo: a2(n, 'di', tt), etMacHypo: a2(h, 'mac', tt), etMacNormo: a2(n, 'mac', tt) }); },
  expect: [{ m: 'macRedPerC', lo: 4, hi: 6, src: 'Vitez TS, White PF, Eger EI, Anesthesiology 1974;41:80; Eger EI 2001 (MAC falls ≈ 5 % per °C of hypothermia); tables §5.3 macFactor' }],
  owner: '7e thermal/metabolic.ts cascade.macF → 7f' });
add({ id: 'ET-08b', tier: 'P2', ctx: 'X-A ventilated, sevoflurane GA, no NMB at induction', state: 'core 32 °C vs 36.8', intv: 'rocuronium 0.6 mg/kg after cooling: time to T1 25 % recovery (ratio hypothermic / normothermic)', sys: 'NEU PK',
  arms: { h: V([...GA(T, { nmb: 'none' }), TGT(32), d(TC, 'rocuronium', 0.6, 'mg/kg')], TC + 4 * H, XA, { dt: 30 }), n: V([...GA(T, { nmb: 'none' }), d(TC, 'rocuronium', 0.6, 'mg/kg')], TC + 4 * H, XA, { dt: 30 }) },
  measure: (R) => { const t25 = (r: Row[]) => { const t0 = first(r, TC + 60, (x) => (x.t1 as number) < 0.05); const t = first(r, Number.isFinite(t0) ? t0 : TC, (x) => (x.t1 as number) >= 0.25); return Number.isFinite(t) ? r2((t - TC) / 60) : NaN; };
    const h = t25(R.h!.rows), n = t25(R.n!.rows); return m({ t25HypoMin: h, t25NormoMin: n, ratio: r2(h / n), ceRocHypoAt30: a3(R.h!.rows, 'ce_rocuronium', TC + 1800), ceRocNormoAt30: a3(R.n!.rows, 'ce_rocuronium', TC + 1800) }); },
  expect: [{ m: 'ratio', lo: 1.5, hi: 3, src: 'Heier T, Caldwell JE et al., Anesthesiology 1991;74:815 (core −2 °C doubles vecuronium duration); Beaufort AM 1995 (rocuronium prolonged in hypothermia) [VERIFY]; research/12 ET-08 (NMB duration ↑)' }],
  owner: '7g PK clFactor (temperature) / 7f nmb EC50 (temperature)' });
add({ id: 'ET-08c', tier: 'P2', ctx: 'X-A ventilated, GA flag, no volatile', state: 'core 34 °C vs 36.8', intv: 'propofol 100 µg/kg/min for 60 min after cooling: plasma concentration ratio', sys: 'PK',
  arms: { h: V([FLAG(), TGT(34), inf(TC, 'propofol', 100, 'mcg/kg/min')], TC + H, XA, { dt: 30 }), n: V([FLAG(), inf(TC, 'propofol', 100, 'mcg/kg/min')], TC + H, XA, { dt: 30 }) },
  measure: (R) => m({ cpHypo: a3(R.h!.rows, 'p_propofol', TC + H), cpNormo: a3(R.n!.rows, 'p_propofol', TC + H), ratio: r3((at(R.h!.rows, 'p_propofol', TC + H) as number) / (at(R.n!.rows, 'p_propofol', TC + H) as number)), tc: a2(R.h!.rows, 'tc', TC + H), coHypo: a2(R.h!.rows, 'co', TC + H), coNormo: a2(R.n!.rows, 'co', TC + H) }),
  expect: [{ m: 'ratio', lo: 1.15, hi: 1.4, src: 'Leslie K, Sessler DI et al., Anesth Analg 1995;80:1007 (propofol plasma concentration ≈ 28 % higher at 34 °C during a fixed infusion)' }],
  hand: { verdict: 'TW', why: 'Cp +5 % at 34 °C after 60 min (Leslie +28 %): temperature scales only the ELIMINATION clearance (pk/pipeline.ts:157, −5 %/°C → −14 %), which at 60 min of infusion is still a minor share of the concentration; Leslie attributed most of the rise to a smaller intercompartmental clearance, which the engine keeps at its normothermic value' },
  owner: '7g pk/pipeline.ts clFactor (−5 %/°C)' });
add({ id: 'ET-08d', tier: 'P2', ctx: 'X-A', state: 'core 32 °C', intv: 'hypothermic coagulopathy (PT/aPTT, platelet function, bleeding)', sys: 'COAG',
  arms: {}, expect: [], owner: '7i (R58/R60 v1.1)', ne: 'no coagulation model: 7e publishes `endo.cascade.coagF` (−10 %/°C below 35 °C) and nothing reads it (research/11 B47); 7i owns it (v1.1)' });

// ---- ET-09 28 °C ----------------------------------------------------------------------------------------------------
add({ id: 'ET-09a', tier: 'P2', ctx: 'X-A ventilated, sevoflurane GA', state: 'core 28 °C (instructor target)', intv: 'HR and the ECG (Osborn J waves) at 28 °C', sys: 'RHY CIRC',
  arms: { h: V([...GA(), TGT(28)], TC + H, XA, { dt: 30 }), n: V(GA(), TC + H, XA, { dt: 30 }) },
  measure: (R) => m({ tc: a2(R.h!.rows, 'tc', TC + 1800), hr28: a2(R.h!.rows, 'hr', TC + 1800), hrNormo: a2(R.n!.rows, 'hr', TC + 1800), map28: a2(R.h!.rows, 'map', TC + 1800), co28: a2(R.h!.rows, 'co', TC + 1800), ecgTempC: a2(R.h!.rows, 'ecgTempC', TC + 1800),
    osborn: (at(R.h!.rows, 'ecgTempC', TC + 1800) as number) < 33, rhythms: rh(R.h!) }),
  expect: [{ m: 'hr28', lo: 40, hi: 50, src: 'research/12 ET-09; ERC 2021 special circumstances (moderate hypothermia: bradycardia) / Danzl DF, Pozos RS NEJM 1994;331:1756' }, { m: 'osborn', event: true, src: 'ERC 2021 / Danzl 1994: Osborn (J) waves below ≈ 32–33 °C (ECG generator: electrolytes.ts, from 33 °C)' }],
  owner: '7e metabolic.ts tempHrF / ECG electrolytes.ts' });
add({ id: 'ET-09b', tier: 'P2', ctx: 'X-A ventilated, sevoflurane GA', state: 'core 28 °C', intv: 'atrial fibrillation', sys: 'RHY',
  arms: { h: V([...GA(), TGT(28)], TC + H, XA, { dt: 30 }) }, measure: (R) => m({ af: anyR(R.h!.rows, T, TC + H, (x) => String(x.rhythm).startsWith('af')), rhythms: rh(R.h!) }),
  expect: [{ m: 'af', event: true, src: 'ERC 2021 / Danzl 1994: AF is common below 32 °C and reverts on rewarming' }],
  hand: { verdict: 'MI', why: 'no hypothermic AF: arrest.ts carries only the VF hazard below 28 °C; the rhythm stays sinus at 28 °C (A08-G4b, measured again, not re-reported)' },
  known: 'A08-G4b (FU-4 G12)', owner: 'FU-4 G12 → arrest.ts has the VF hazard only (no AF hazard)' });
add({ id: 'ET-09c', tier: 'P2', ctx: 'X-A ventilated, sevoflurane GA', state: 'core 25 °C (instructor target)', intv: 'spontaneous VF within 60 min', sys: 'RHY',
  arms: { h: V([...GA(), TGT(25)], TC + H, XA, { dt: 10 }) }, measure: (R) => m({ vf: anyR(R.h!.rows, T, TC + H, (x) => x.arrest !== ''), arrestS: first(R.h!.rows, T, (x) => x.arrest !== '') - T, rhythms: rh(R.h!) }),
  expect: [{ m: 'vf', event: true, src: 'ERC 2021 (the risk of VF is high below 28 °C; below 24 °C spontaneous arrest); research/12 ET-09 (VF risk)' }],
  owner: 'FU-4 G12 (arrest.ts T_HAZARD)' });

// ---- ET-12 septic fever ---------------------------------------------------------------------------------------------
const TSE = 60 + 90 * 60;
add({ id: 'ET-12', tier: 'P2', ctx: 'X-A ventilated (fixed MV), GA flag', state: 'sepsis (7e `condition sepsis`, phase sepsis) from 60 s', intv: 'the febrile state at 90 min: VO2 and HR per °C, EtCO2 at fixed MV', sys: 'END LUNG CIRC',
  arms: { i: V([FLAG(), [60, A.cond('sepsis', 1, { phase: 'sepsis' }), 'sepsis']], TSE, XA, { dt: 30 }), c: V([FLAG()], TSE, XA, { dt: 30 }) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows; const dT = (at(i, 'tc', TSE) as number) - (at(c, 'tc', TSE) as number);
    return m({ tc: a2(i, 'tc', TSE), dT: r2(dT), vo2PctPerC: r2((100 * ((at(i, 'vo2Dem', TSE) as number) / (at(c, 'vo2Dem', TSE) as number) - 1)) / dT), hrPerC: r2(((at(i, 'hr', TSE) as number) - (at(c, 'hr', TSE) as number)) / dT),
      dEtco2: r2((at(i, 'etco2', TSE) as number) - (at(c, 'etco2', TSE) as number)), vo2F: a3(i, 'vo2F', TSE), dMap: r2((at(i, 'map', TSE) as number) - (at(c, 'map', TSE) as number)), tcAt30: a2(i, 'tc', 60 + 1800) }); },
  expect: [{ m: 'vo2PctPerC', lo: 10, hi: 13, src: 'research/12 ET-12 (VO2 +10–13 %/°C; Miller 9e)' }, { m: 'hrPerC', lo: 8, hi: 10, src: 'tables §5c (HR +8–10 bpm/°C); research/12 ET-12 (+10/°C)' }, { m: 'dEtco2', dir: 1, tol: 1, src: 'research/12 ET-12 (EtCO2 ↑ at fixed MV)' }],
  hand: { verdict: 'TW', why: "the rig is confounded and the per-°C figures are not the fever's: under GA at 21 °C the septic patient cannot mount a fever (core 36.86 against the flag control's 35.42; the set-point shift 2.2 °C needs heat the anaesthetised, vasodilated patient does not make), so the +35 % VO2 is the sepsis row's own hypermetabolism (vo2F 1.2, conditions.ts:32) × the temperature factor, and the HR includes the baroreflex answer to MAP −12. The temperature coefficient itself is Stage 3's tempFactor 7.5 %/°C (gas/params.ts:179–181), below the classical 10–13 %/°C of fever (research/12 ET-12); EtCO2 +7 at fixed MV is right" },
  owner: '7e conditions.ts SEPSIS vo2F + Stage 3 tempFactor' });

// ---- ET-13 thyroid storm --------------------------------------------------------------------------------------------
const TST = 60 + H;
const stormU = V([FLAG(), [60, A.cond('thyroidStorm', 1), 'thyroid storm']], TST + 1200, XA, { dt: 20 });
add({ id: 'ET-13a', tier: 'P2', ctx: 'X-A ventilated, GA flag', state: 'thyroid storm (7e `condition thyroidStorm 1`) from 60 s', intv: 'the storm at 1 h, then esmolol 0.5 mg/kg + 150 µg/kg/min', sys: 'CIRC END',
  arms: { i: V([FLAG(), [60, A.cond('thyroidStorm', 1), 'thyroid storm'], d(TST, 'esmolol', 0.5, 'mg/kg'), inf(TST, 'esmolol', 150, 'mcg/kg/min')], TST + 1200, XA, { dt: 20 }), u: stormU, c: V([FLAG()], TST + 1200, XA, { dt: 20 }) },
  measure: (R) => { const i = R.i!.rows, u = R.u!.rows, c = R.c!.rows; return m({ hrStorm: a2(u, 'hr', TST), tcStorm: a2(u, 'tc', TST), coStorm: a2(u, 'co', TST), coCtrl: a2(c, 'co', TST), mapStorm: a2(u, 'map', TST),
    hrPctEsmolol: r2(100 * ((at(i, 'hr', TST + 600) as number) / (at(u, 'hr', TST + 600) as number) - 1)), tcStorm80: a2(u, 'tc', TST + 1200) }); },
  expect: [{ m: 'hrStorm', lo: 140, hi: 180, src: 'research/12 ET-13 (HR 140+); Burch–Wartofsky; Miller 9e endocrine' }, { m: 'tcStorm', lo: 38.5, hi: 41, src: 'thyroid.ts header / tables §5c (core 38.5–41 °C)' },
    { m: 'hrPctEsmolol', dir: -1, tol: 15, src: 'research/12 ET-13 (β-blockade controls the rate); Miller 9e' }],
  hand: { verdict: 'TW', why: "HR 155 and esmolol −28 % are right, but the storm is afebrile under GA (core 36.6 at 1 h; expected 38.5–41): the set-point shift (+1.8 °C) needs heat the vasodilated anaesthetised patient does not make, and the storm's metabolic heat is extraX 1.4 × m0 (thyroid.ts STORM vo2F 1.4) ≈ +32 W against a 21 °C room" },
  owner: '7e thyroid.ts STORM' });
add({ id: 'ET-13b', tier: 'P2', ctx: 'X-A ventilated, GA flag', state: 'thyroid storm', intv: 'atrial fibrillation in the storm', sys: 'RHY',
  arms: { u: stormU }, measure: (R) => m({ af: anyR(R.u!.rows, 60, TST + 1200, (x) => String(x.rhythm).startsWith('af')) }),
  expect: [{ m: 'af', event: true, src: 'research/12 ET-13 (AF); Klein I, Ojamaa K, NEJM 2001;344:501 (AF in 10–25 % of thyrotoxicosis) [VERIFY]' }],
  hand: { verdict: 'MI', why: 'no thyroid → rhythm path: the storm scales HR as a sinus rate factor (thyroid.ts STORM hrF 1.8); no AF hazard exists (the same gap as hypothermic AF, ET-09b / A08-G4b)' },
  owner: 'new: 7e → Stage 5 rhythm hazard (AF in storm/hypothermia)' });

// ---- ET-14 hypothyroidism (P3) ---------------------------------------------------------------------------------------
const hyArm = (p: Record<string, unknown>) => V([...GA(), [T + H, A.vap('sevoflurane', 0, 6), 'sevoflurane off FGF 6']], T + H + 1800, p, { dt: 10 });
add({ id: 'ET-14', tier: 'P3', ctx: 'hypothyroid (engine API `endo.thyroid hypo`) vs euthyroid', state: 'untreated hypothyroidism', intv: 'resting values; propofol 2 mg/kg + sevoflurane induction; emergence after 1 h', sys: 'CIRC END NEU',
  arms: { h: hyArm(HYPO), n: hyArm(XA) },
  measure: (R) => { const h = R.h!.rows, n = R.n!.rows; const emerg = (r: Row[]) => { const t = first(r, T + H + 10, (x) => x.conscious === true); return Number.isFinite(t) ? r2((t - T - H) / 60) : NaN; };
    const drop = (r: Row[]) => r2(100 * (mn(r, 'map', T, T + 600) / w(r, 'map', T - 60, T) - 1));
    return m({ hrHypo: a2(h, 'hr', T - 10), hrNormo: a2(n, 'hr', T - 10), dHrRest: r2((at(h, 'hr', T - 10) as number) - (at(n, 'hr', T - 10) as number)), mapDropHypo: drop(h), mapDropNormo: drop(n), extraDrop: r2(drop(h) - drop(n)),
      emergeHypoMin: emerg(h), emergeNormoMin: emerg(n), dEmerge: r2(emerg(h) - emerg(n)), dTc1h: r2((at(h, 'tc', T + H) as number) - (at(n, 'tc', T + H) as number)) }); },
  expect: [{ m: 'dHrRest', dir: -1, tol: 5, src: 'tables §1.5 / research/12 ET-14 (bradycardia)' }, { m: 'extraDrop', dir: -1, tol: 3, src: 'research/12 ET-14 (exaggerated hypotension at induction); Miller 9e endocrine' },
    { m: 'dEmerge', dir: 1, tol: 2, src: 'research/12 ET-14 (delayed emergence)' }, { m: 'dTc1h', dir: -1, tol: 0.1, src: 'research/12 ET-14 (hypothermia: low BMR)' }],
  hand: { verdict: 'WR', why: "hypothyroid bradycardia (−18) and a colder core (−0.31) are there, but propofol's MAP fall is not exaggerated (−22 % vs −23 %) and emergence is 0.7 min later only: the thyroid row scales HR/Ees/SVR/VO2 (thyroid.ts:19) and reaches neither the drug disposition (7g clearance) nor the baroreflex or depth" },
  owner: '7e thyroid.ts ROW.hypo' });

// ---- ET-15 adrenal insufficiency -----------------------------------------------------------------------------------
const aiArm = (p: Record<string, unknown>) => V([...GA(), [T + 600, A.stim(1.0), 'incision'], d(T + 1200, 'phenylephrine', 100, 'mcg')], T + 2400, p, { dt: 10 });
add({ id: 'ET-15a', tier: 'P2', ctx: 'adrenal insufficiency (engine API `endo.adrenalInsufficiency`) vs normal', state: 'no steroid cover', intv: 'induction + surgery; phenylephrine 100 µg at +20 min: hypotension refractory to vasopressor', sys: 'CIRC END',
  arms: { ai: aiArm(ADRENAL), n: aiArm(XA) },
  measure: (R) => { const a = R.ai!.rows, n = R.n!.rows; const pe = (r: Row[]) => r2(mx(r, 'map', T + 1200, T + 1500) - w(r, 'map', T + 1140, T + 1200));
    return m({ mapPostIndAI: mn(a, 'map', T, T + 600), mapPostIndN: mn(n, 'map', T, T + 600), mapSurgAI: w(a, 'map', T + 900, T + 1200), mapSurgN: w(n, 'map', T + 900, T + 1200), dMapSurg: r2(w(a, 'map', T + 900, T + 1200) - w(n, 'map', T + 900, T + 1200)),
      pePressorAI: pe(a), pePressorN: pe(n), peRatio: r2(pe(a) / pe(n)), cortAI: a2(a, 'cort', T + 1200), cortN: a2(n, 'cort', T + 1200), vasoRespAI: a3(a, 'vasoResp', T + 1200) }); },
  expect: [{ m: 'dMapSurg', dir: -1, tol: 5, src: 'research/12 ET-15 (refractory hypotension without steroid cover); Miller 9e endocrine (adrenal crisis under anaesthesia)' }, { m: 'peRatio', lo: 0, hi: 0.8, src: 'research/12 ET-15 (vasopressor-refractory: cortisol is permissive for catecholamine responsiveness) — magnitude a proposal' }],
  hand: { verdict: 'TW', why: 'adrenal insufficiency changes nothing at rest or after induction (MAP 73.7 in both; surgical MAP −0.8) and blunts phenylephrine to 0.79 of normal: `cortResponse` 0.5 halves only the stress RISE of cortisol (hormones.ts:84) and vasoResp reads cortisol/basal (effects.ts:64), so the basal state is normal — no glucocorticoid-deficient vasoplegia, no mineralocorticoid volume deficit, no hypoglycaemia' },
  owner: '7e effects.ts vasoResp (cortisol permissive term)' });
add({ id: 'ET-15b', tier: 'P2', ctx: 'adrenal insufficiency', state: 'refractory hypotension', intv: 'hydrocortisone 100 mg IV (steroid cover / rescue)', sys: 'CIRC END',
  arms: { p: V([...GA(), d(T + 600, 'hydrocortisone', 100, 'mg')], T + 900, ADRENAL, { dt: 10 }) }, expect: [], owner: 'FU-7 D13 request (hydrocortisone needs 7e cortisol-replacement semantics)',
  ne: 'hydrocortisone is not in the library (rejected: "unknown drug hydrocortisone"); FU-7 D13 records it as a request, not a task' });

// ---- ET-21 hypoglycaemia under GA ----------------------------------------------------------------------------------
const TH = T + 300;
const hgArms = { ga: V([...GA(), d(TH, 'insulin', 10, 'units')], TH + 3 * H, XA, { dt: 20 }), gac: V(GA(), TH + 3 * H, XA, { dt: 20 }),
  aw: SP([d(TH, 'insulin', 10, 'units')], TH + 3 * H, XA, { dt: 20 }), awc: SP([], TH + 3 * H, XA, { dt: 20 }) };
const hgMeasure = (R: Record<string, ArmResult>) => { const g = R.ga!.rows, gc = R.gac!.rows, a = R.aw!.rows, ac = R.awc!.rows;
  const dHr = (r: Row[], c: Row[]) => r2(Math.max(...[1200, 1800, 2400, 3000, 3600, 4800].map((s) => (at(r, 'hr', TH + s) as number) - (at(c, 'hr', TH + s) as number))));
  return { gluNadirGA: r2(mn(g, 'glu', TH, TH + 3 * H) / MG), gluNadirAwake: r2(mn(a, 'glu', TH, TH + 3 * H) / MG), dHrGA: dHr(g, gc), dHrAwake: dHr(a, ac), masking: r2(dHr(g, gc) - dHr(a, ac)),
    epiPeakGA: mx(g, 'epi', TH, TH + 3 * H), epiPeakAwake: mx(a, 'epi', TH, TH + 3 * H), sweatAwake: anyR(a, TH, TH + 3 * H, (x) => x.sweating === true), diMinGA: mn(g, 'di', TH, TH + 3 * H), diCtrl: w(gc, 'di', TH + 1800, TH + 3600), glycoGA: mx(g, 'glyco', TH, TH + 3 * H) }; };
add({ id: 'ET-21a', tier: 'P2', ctx: 'X-A ventilated, sevoflurane GA vs awake', state: 'insulin 10 units → hypoglycaemia', intv: 'the autonomic warning (HR) under GA vs awake', sys: 'CIRC END',
  arms: hgArms, measure: (R) => m(hgMeasure(R)),
  expect: [{ m: 'masking', dir: -1, tol: 3, src: 'research/12 ET-21 (GA masks the autonomic signs: tachycardia, sweating blunted); Miller 9e (hypoglycaemia under anaesthesia is recognised late)' }],
  dirOnly: true, hand: { verdict: 'WR', why: 'under GA the hypoglycaemic HR rise is LARGER than awake (+26 vs +16): the hypoglycaemic sympathetic drive enters `extraSymp` (core.ts:168–171), which antinociception and depth do not blunt, while the anaesthetised baseline HR is lower. Adrenaline peaks identical (558 pg/mL); depth index 46 → 36 from neuroglycopenia is the only masking-type sign' },
  owner: '7e hormones.ts (hypoglycaemic drive is not blunted by antinociception/depth)' });
add({ id: 'ET-21b', tier: 'P2', ctx: 'X-A awake and under GA', state: 'glucose ≈ 2 mmol/L', intv: 'sweating (awake), neuroglycopenia on the depth index, seizure risk', sys: 'END NEU',
  arms: hgArms, measure: (R) => m(hgMeasure(R)),
  expect: [{ m: 'sweatAwake', event: true, src: 'Cryer PE (neurogenic symptoms of hypoglycaemia: sweating, tremor, palpitations; cholinergic sweating from ≈ 3 mmol/L)' }],
  hand: { verdict: 'MI', why: 'sweating is thermal only (thresholds.ts sweatW: core above the sweat threshold); no cholinergic hypoglycaemic sweating, and no seizure state (research/12 §5.3 NE list); 7e does publish `neuroglycopenia` into 7f\'s depth index (see diMinGA)' },
  owner: '7e (sympathetic sweating) / FU-7 (seizures)' });

// ---- ET-22 D50 ---------------------------------------------------------------------------------------------------------
add({ id: 'ET-22', tier: 'P2', ctx: 'X-A awake, non-diabetic', state: 'normoglycaemia', intv: 'dextrose 50 % 50 mL (25 g) IV: glucose rise and its course', sys: 'END',
  arms: { i: SP([d(T, 'dextrose', 25000, 'mg')], T + 2 * H, XA, { dt: 10 }), c: SP([], T + 2 * H, XA, { dt: 10 }) },
  measure: (R) => { const g = (s: number) => r2(((at(R.i!.rows, 'glu', T + s) as number) - (at(R.c!.rows, 'glu', T + s) as number)) / MG); return m({ dGlu5: g(300), dGlu15: g(900), dGlu30: g(1800), dGlu60: g(3600), dGlu120: g(7200), dGluPeak: r2((mx(R.i!.rows, 'glu', T, T + 600) - (at(R.c!.rows, 'glu', T) as number)) / MG) }); },
  expect: [{ m: 'dGlu5', lo: 3, hi: 5, src: 'research/12 ET-22 (+3–5 mmol/L transiently). Balentine JR et al., J Emerg Med 1998;16:763: D50 25 g raised glucose by a mean 166 mg/dL (9.2 mmol/L, range 2–20) [VERIFY] — the sources disagree; Q for Ali' }],
  hand: { verdict: 'PL', why: "+10.2 mmol/L at 5 min, +3.5 at 30, back to baseline by 60 min: the 25 g enters a 1.7 dL/kg glucose space at once (glucose.ts:88–90). research/12's +3–5 has no citation; the primary paper (Balentine 1998: mean +9.2, range 2–20 mmol/L) contains the model — graded on the primary source, Q for Ali" },
  owner: '7e glucose.ts dextroseBolus (VG 1.7 dL/kg)' });

// ---- ET-23 DKA and RSI -----------------------------------------------------------------------------------------------
const TR = 1800;
const RSI = (vent: { rr: number; vtMl: number }): [number, any, string][] => [d(TR, 'propofol', 1.5, 'mg/kg'), d(TR, 'rocuronium', 1, 'mg/kg'), [TR + 60, A.device('ett'), 'ETT'], [TR + 60, A.vent({ ...vent, peep: 5, fio2: 0.5 }), `VCV ${vent.rr} × ${vent.vtMl}`]];
const dkaArm = (vent: { rr: number; vtMl: number }, dka = true) => SP([...(dka ? [[60, A.cond('dka', 1), 'DKA 1'] as [number, any, string]] : []), ...RSI(vent)], TR + 1800, XA, { dt: 10 });
const dkaArms = { n: dkaArm({ rr: 12, vtMl: 500 }), h: dkaArm({ rr: 28, vtMl: 500 }), x: dkaArm({ rr: 12, vtMl: 500 }, false) };
const dkaMeasure = (R: Record<string, ArmResult>) => { const n = R.n!.rows, h = R.h!.rows, x = R.x!.rows; const hco3 = at(n, 'hco3', TR - 10) as number;
  const drop = (r: Row[]) => 100 * (mn(r, 'map', TR, TR + 600) / w(r, 'map', TR - 60, TR) - 1);
  return { phPre: a2(n, 'ph', TR - 10), hco3Pre: r2(hco3), paco2Pre: a2(n, 'paco2', TR - 10), winter: r2(1.5 * hco3 + 8), kussmaulMinusWinter: r2((at(n, 'paco2', TR - 10) as number) - (1.5 * hco3 + 8)), veSpPre: a2(n, 'veSp', TR - 10), veSpHealthy: a2(x, 'veSp', TR - 10),
    dPh15: r2((at(n, 'ph', TR + 960) as number) - (at(n, 'ph', TR - 10) as number)), dPh15HighMv: r2((at(h, 'ph', TR + 960) as number) - (at(h, 'ph', TR - 10) as number)), paco2Post15: a2(n, 'paco2', TR + 960),
    kPre: a2(n, 'k', TR - 10), kHealthy: a2(x, 'k', TR - 10), dK15: r2((at(n, 'k', TR + 960) as number) - (at(n, 'k', TR - 10) as number)), dKvsHealthy: r2((at(n, 'k', TR - 10) as number) - (at(x, 'k', TR - 10) as number)),
    mapDropDka: r2(drop(n)), mapDropHealthy: r2(drop(x)), extraDrop: r2(drop(n) - drop(x)), bvRelDka: a3(n, 'bvRel', TR - 10), gluPre: r2((at(n, 'glu', TR - 10) as number) / MG) }; };
add({ id: 'ET-23a', tier: 'P2', ctx: 'X-A awake, spontaneous', state: 'DKA (7c `condition dka 1`)', intv: 'Kussmaul compensation before induction (Winter\'s formula)', sys: 'LUNG BLD',
  arms: dkaArms, measure: (R) => m(dkaMeasure(R)), expect: [{ m: 'kussmaulMinusWinter', lo: -2, hi: 2, src: 'Albert MS, Dell RB, Winter RW, Ann Intern Med 1967;66:312 (expected PaCO2 = 1.5·HCO3 + 8 ± 2)' }], hand: { verdict: 'TW', why: "Kussmaul breathing doubles VE (12.1 vs 6.6 L/min) but PaCO2 is 18.3 at HCO3 4.3 (Winter 14.5 ± 2): under-compensated by 3.9 mmHg. neuro/spont.ts paco2SetPoint follows Winter, so the shortfall is the drive's gain/ceiling at pH 6.99 — close; FU-9 A7 edits the same set point (alkalosis side)" },
  owner: '7f neuro/spont.ts paco2SetPoint (Winter)' });
add({ id: 'ET-23b', tier: 'P2', ctx: 'X-A, DKA', state: 'RSI (propofol 1.5 + rocuronium 1) then VCV 12 × 500 vs 28 × 500', intv: 'pH 15 min after intubation at a normal minute ventilation', sys: 'BLD LUNG',
  arms: dkaArms, measure: (R) => m(dkaMeasure(R)), expect: [{ m: 'dPh15', dir: -1, tol: 0.05, src: 'JBDS DKA 2023 / research/12 ET-23 (the Kussmaul compensation is lost after intubation: pH falls unless the minute ventilation is matched)' }], owner: '7c acid–base / Stage 3' });
add({ id: 'ET-23c', tier: 'P2', ctx: 'X-A, DKA', state: 'DKA', intv: 'K⁺ at presentation and after intubation', sys: 'BLD',
  arms: dkaArms, measure: (R) => m(dkaMeasure(R)), expect: [{ m: 'dKvsHealthy', dir: 1, tol: 0.3, src: 'JBDS DKA 2023 (K often high at presentation despite a total-body deficit: acidosis and insulinopenia shift K out)' }, { m: 'dK15', dir: 1, tol: 0.1, src: 'research/12 ET-23 (the acidosis after intubation shifts K further out)' }], hand: { verdict: 'WR', why: "DKA presents HYPOkalaemic relative to the healthy twin (3.70 vs 4.18) and intubation's pH fall moves K +0.04: 7c's `dka` is a ketoacid load only — organic acidosis correctly shifts little K, but the two DKA causes of hyperkalaemia, insulin deficiency and hyperosmolality (glucose only 9.3 mmol/L here), have no K path; 7e's β-cell term goes to zero with dka yet the K shift reads only SECRETED insulin above basal (core.ts:147), never a deficit" },
  owner: '7c core.ts kSet (pH) / 7e insulin' });
add({ id: 'ET-23d', tier: 'P2', ctx: 'X-A, DKA vs healthy', state: 'DKA (osmotic diuresis: 5–7 L deficit)', intv: 'propofol 1.5 mg/kg induction: MAP fall vs healthy', sys: 'CIRC',
  arms: dkaArms, measure: (R) => m(dkaMeasure(R)), expect: [{ m: 'extraDrop', dir: -1, tol: 3, src: 'JBDS DKA 2023 (fluid deficit ≈ 100 mL/kg); research/12 ET-23 (hypovolaemic induction response)' }], owner: '7c `dka` condition (chemistry only: no volume deficit)' });

// ---- ET-24 / ET-25 NE -----------------------------------------------------------------------------------------------
add({ id: 'ET-24', tier: 'P3', ctx: 'X-A', state: 'phaeochromocytoma', intv: 'tumour handling; venous ligation', sys: 'CIRC RHY END', arms: {}, expect: [], owner: 'FU-7 (state)', ne: 'no phaeochromocytoma state: research/12 §5.11 FU-7 missing-mechanism list (expected: paroxysmal 250/130, arrhythmia; hypotension after vein ligation)' });
add({ id: 'ET-25', tier: 'P3', ctx: 'X-A', state: 'carcinoid crisis', intv: 'tumour handling; octreotide', sys: 'CIRC LUNG', arms: {}, expect: [], owner: 'FU-7 (state, drug)', ne: 'no carcinoid state and no octreotide (research/12 §5.11; expected: flushing, bronchospasm, hypotension; octreotide 50–100 µg)' });

// ---- ET-26 septic phases ---------------------------------------------------------------------------------------------
const TS2 = 1260;
const sepArm = (phase: string, extra: [number, any, string][] = []) => V([FLAG(), [60, A.cond('sepsis', 1, { phase }), `sepsis ${phase}`], ...extra], TS2 + 1200, XA, { dt: 20 });
add({ id: 'ET-26a', tier: 'P2', ctx: 'X-A ventilated, GA flag', state: 'septic shock warm vs cold (7e phases)', intv: 'the cold phase: CO, SvO2, lactate vs the warm phase at +20 min', sys: 'CIRC BLD',
  arms: { w: sepArm('warm'), c: sepArm('cold') },
  measure: (R) => { const wr = R.w!.rows, cr = R.c!.rows; const t = TS2; return m({ coWarm: a2(wr, 'co', t), coCold: a2(cr, 'co', t), svo2Warm: a2(wr, 'svo2', t), svo2Cold: a2(cr, 'svo2', t), lactWarm: a2(wr, 'lact', t), lactCold: a2(cr, 'lact', t), mapWarm: a2(wr, 'map', t), mapCold: a2(cr, 'map', t),
    dCo: r2((at(cr, 'co', t) as number) - (at(wr, 'co', t) as number)), dSvo2: r2((at(cr, 'svo2', t) as number) - (at(wr, 'svo2', t) as number)), dLact: r2((at(cr, 'lact', t) as number) - (at(wr, 'lact', t) as number)) }); },
  expect: [{ m: 'dCo', dir: -1, tol: 0.5, src: 'tables §5e / research/12 ET-26 (cold septic shock: low CO)' }, { m: 'dSvo2', dir: -1, tol: 3, src: 'tables §5e (cold phase: SvO2 ↓)' }, { m: 'dLact', dir: 1, tol: 0.3, src: 'tables §5e (cold phase: lactate ↑)' }],
  hand: { verdict: 'TW', why: "the cold phase lowers CO only 5.1 → 4.3 L/min, SvO2 79 → 77 %, lactate 1.00 → 1.01 — and warm septic SHOCK itself has lactate 1.0 (Sepsis-3 requires > 2). The sepsis rows raise VO2 (vo2F) but carry no impaired extraction or aerobic-glycolysis lactate term (conditions.ts:29–35 'erMax/shunt are not seams'); CO is still normal because 7e's cold row (Ees × 0.5) is compensated by the baroreflex" },
  owner: '7e conditions.ts SEPSIS rows' });
add({ id: 'ET-26b', tier: 'P2', ctx: 'X-A ventilated, GA flag', state: 'warm septic shock vs healthy', intv: 'noradrenaline 0.1 µg/kg/min: pressor response (catecholamine hyporesponsiveness)', sys: 'CIRC',
  arms: { s: sepArm('warm', [inf(TS2, 'norepinephrine', 0.1, 'mcg/kg/min')]), su: sepArm('warm'), h: V([FLAG(), inf(TS2, 'norepinephrine', 0.1, 'mcg/kg/min')], TS2 + 1200, XA, { dt: 20 }), hu: V([FLAG()], TS2 + 1200, XA, { dt: 20 }) },
  measure: (R) => { const t = TS2 + 600; const dS = (at(R.s!.rows, 'map', t) as number) - (at(R.su!.rows, 'map', t) as number), dH = (at(R.h!.rows, 'map', t) as number) - (at(R.hu!.rows, 'map', t) as number);
    return m({ dMapSeptic: r2(dS), dMapHealthy: r2(dH), ratio: r2(dS / dH), mapSepticBase: a2(R.su!.rows, 'map', TS2), vasoResp: a3(R.su!.rows, 'vasoResp', TS2) }); },
  expect: [{ m: 'ratio', lo: 0, hi: 0.8, src: 'tables §5e (septic vasoResp 0.6); Levy B et al. 2018 (vasoplegia: adrenergic hyporesponsiveness) — magnitude a proposal' }], owner: '7e vasoResp → 7g' });
add({ id: 'ET-26c', tier: 'P2', ctx: 'X-A ventilated, GA flag', state: 'cold septic shock', intv: 'dobutamine 5 µg/kg/min: CO response', sys: 'CIRC',
  arms: { i: sepArm('cold', [inf(TS2, 'dobutamine', 5, 'mcg/kg/min')]), u: sepArm('cold') },
  measure: (R) => m({ dCo: r2((at(R.i!.rows, 'co', TS2 + 600) as number) - (at(R.u!.rows, 'co', TS2 + 600) as number)), coBase: a2(R.u!.rows, 'co', TS2), dSvo2: r2((at(R.i!.rows, 'svo2', TS2 + 600) as number) - (at(R.u!.rows, 'svo2', TS2 + 600) as number)) }),
  expect: [{ m: 'dCo', dir: 1, tol: 0.3, src: 'tables §5e / Surviving Sepsis Campaign 2021 (dobutamine in low-output septic shock raises CO)' }], owner: '7g dobutamine / 7e eesF' });

// ---- ET-28 vasoplegia / vasopressin ---------------------------------------------------------------------------------
const vpArm = (sirs: boolean, drug: 'vasopressin' | 'norepinephrine' | null) => V([FLAG(), ...(sirs ? [[60, A.cond('sirs', 1), 'SIRS 1'] as [number, any, string]] : []), ...(drug === 'vasopressin' ? [d(TS2, 'vasopressin', 1, 'units')] : drug === 'norepinephrine' ? [d(TS2, 'norepinephrine', 10, 'mcg')] : [])], TS2 + 900, XA, { dt: 5 });
add({ id: 'ET-28', tier: 'P2', ctx: 'X-A ventilated, GA flag', state: 'SIRS vasoplegia (7e `sirs 1`) vs healthy', intv: 'vasopressin 1 unit vs noradrenaline 10 µg bolus: pressor response and its preservation in vasoplegia', sys: 'CIRC',
  arms: { sv: vpArm(true, 'vasopressin'), sn: vpArm(true, 'norepinephrine'), su: vpArm(true, null), hv: vpArm(false, 'vasopressin'), hn: vpArm(false, 'norepinephrine'), hu: vpArm(false, null) },
  measure: (R) => { const pk = (a: Row[], u: Row[]) => r2(Math.max(...[30, 60, 90, 120, 180, 240, 300].map((s) => (at(a, 'map', TS2 + s) as number) - (at(u, 'map', TS2 + s) as number))));
    const vS = pk(R.sv!.rows, R.su!.rows), vH = pk(R.hv!.rows, R.hu!.rows), nS = pk(R.sn!.rows, R.su!.rows), nH = pk(R.hn!.rows, R.hu!.rows);
    return m({ mapSirs: a2(R.su!.rows, 'map', TS2), dMapVpSirs: vS, dMapVpHealthy: vH, dMapNeSirs: nS, dMapNeHealthy: nH, keptVp: r2(vS / vH), keptNe: r2(nS / nH), sparing: r2(vS / vH - nS / nH) }); },
  expect: [{ m: 'dMapVpSirs', dir: 1, tol: 5, src: 'tables §5e / research/12 ET-28 (vasopressin raises MAP in vasoplegia)' }, { m: 'sparing', dir: 1, tol: 0.1, src: 'Landry DW et al., Circulation 1997;95:1122; tables §5e (V1 action is preserved where catecholamine responsiveness is lost: catecholamine sparing)' }],
  hand: { verdict: 'TW', why: "vasopressin raises MAP +12.5 in SIRS (PL) but keeps 0.77 of its healthy effect against noradrenaline's 0.71: the `sirs` row has no vasopressor-hyporesponsiveness (vasoResp 1, conditions.ts:44) and the condition leaves MAP at 88.6 — SIRS 1 is not vasoplegic in MODELED, so catecholamine sparing cannot show" },
  owner: '7g vasopressin row / 7e vasoResp' });

// ---- ET-30 (added) overwarming -------------------------------------------------------------------------------------
add({ id: 'ET-30', tier: 'P2', ctx: 'X-A ventilated, GA flag', state: 'normothermic, draped', intv: 'forced air 43 °C + fluid warmer + ambient 28 °C for 4 h: iatrogenic hyperthermia and the GA sweating defence', sys: 'END',
  arms: { i: V([FLAG(), [T, A.thermal({ warming: true, ambientC: 28 }), 'forced air 43, ambient 28'], [T, A.thermal7e({ fluidWarmer: true }), 'fluid warmer']], T + 4 * H, XA, { dt: 60 }) },
  measure: (R) => { const r = R.i!.rows; const s = r.find((y) => (y.t as number) > T && (y.sweatW as number) > 1); return m({ tc4h: a2(r, 'tc', T + 4 * H), tcMax: mx(r, 'tc', T, T + 4 * H), sweatAny: Boolean(s), sweatOnsetC: s ? r3(s.tc as number) : NaN, hr4h: a2(r, 'hr', T + 4 * H) }); },
  expect: [{ m: 'tcMax', lo: 37.3, hi: 40, src: 'Sessler 2008 (active warming with a high ambient can overheat an anaesthetised patient; direction only — the band marks "above normothermia")' }], dirOnly: true, owner: '7e thermal (the GA sweating threshold 38 °C, tables §5c)' });

// ---- ET-32 (added) epidural blunting of the stress response: NE -----------------------------------------------------
add({ id: 'ET-32', tier: 'P2', ctx: 'X-A', state: 'thoracic epidural (T4–T10 block) + GA', intv: 'incision: the stress response blunted (cortisol, glucose, catecholamines)', sys: 'END CIRC', arms: {}, expect: [], owner: 'FU-7+ (neuraxial block; research/12 I23)',
  ne: 'no neuraxial block: `thermal anaesthesia neuraxial` changes thermoregulation only (research/11 C32; A08-C3). Expected: epidural block of the surgical segments abolishes the cortisol and glucose response to lower-abdominal surgery (Kehlet H, Br J Anaesth 1989;63:189)' });

// ---- ET-33 (added) opioids and the shivering threshold ---------------------------------------------------------------
add({ id: 'ET-33', tier: 'P2', ctx: 'X-A, emergence at ≈ 34.5 °C (ET-05 rig)', state: 'hypothermic emergence', intv: 'pethidine 25 mg / an opioid at emergence: shivering stops (opioids lower the shivering threshold)', sys: 'END',
  arms: {}, expect: [], owner: '7e thermal (shiverShift is declared and never written: heat.ts:81, 120) / FU-7 library (pethidine)',
  ne: 'not expressible as a drug effect: `temp.shiverShift` ("pethidine, opioids: 7f/7g") has no writer anywhere in the engine, and pethidine/meperidine and clonidine are not in the library. Expected: meperidine 25 mg lowers the shivering threshold ≈ 2× more than the vasoconstriction threshold and stops postoperative shivering (Kurz A et al., Anesthesiology 1997;86:1046) [VERIFY]' });

// ---- ET-34 (added) etomidate and the cortisol response ---------------------------------------------------------------
add({ id: 'ET-34', tier: 'P2', ctx: 'X-A ventilated, sevoflurane GA', state: 'incision held 4 h', intv: 'induction with etomidate 0.3 mg/kg vs propofol 2 mg/kg: cortisol at 4 h', sys: 'END',
  arms: { e: V([d(T, 'etomidate', 0.3, 'mg/kg'), d(T, 'rocuronium', 0.6, 'mg/kg'), [T, A.vap('sevoflurane', 2, 2), 'sevo 2'], [T + 600, A.stim(1.0), 'incision']], T + 600 + 4 * H, XA, { dt: 60 }),
    p: V([...GA(), [T + 600, A.stim(1.0), 'incision']], T + 600 + 4 * H, XA, { dt: 60 }) },
  measure: (R) => m({ cortEto4h: a2(R.e!.rows, 'cort', T + 600 + 4 * H), cortProp4h: a2(R.p!.rows, 'cort', T + 600 + 4 * H), ratio: r3((at(R.e!.rows, 'cort', T + 600 + 4 * H) as number) / (at(R.p!.rows, 'cort', T + 600 + 4 * H) as number)) }),
  expect: [{ m: 'ratio', lo: 0, hi: 0.8, src: 'Wagner RL, White PF et al., NEJM 1984;310:1415; Absalom A 1999 (one induction dose of etomidate inhibits 11β-hydroxylase for 6–12 h: the cortisol response to surgery is blunted) — magnitude a proposal' }],
  hand: { verdict: 'MI', why: "etomidate does not touch the adrenal: `cortResponse` is 0.5 only for the adrenal-insufficiency profile (core.ts:118, 173); hormones.ts's header names etomidate but no drug writes it. Cortisol at 4 h 1582 vs 1575 nmol/L" },
  owner: '7e hormones.ts cortResponse (the header names etomidate; nothing sets it)' });
