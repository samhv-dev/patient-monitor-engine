// CM group B — coronary disease (CM-04), severe aortic stenosis + CAD + HTN (CM-05), HFrEF (CM-06). Each comorbid
// arm is read against the healthy reference of the same age at the same sim time.
import { A } from './runner.ts';
import { add, arrestIn, ASx, base, baseR, BLEED1L, CADM, CADS, d, dMax, dMin, hemo, HF, inf, m, mn, mx, pctMax, pctMin, SP, T, V, X60, X65, X75, type Expect } from './spec.ts';
import { mean, r1, r2, type Row, type Step } from './runner.ts';

const pro = (t: number, mgkg = 2) => d(t, 'propofol', mgkg, 'mg/kg');
const NOARREST: Expect = { m: 'arrest', event: false, src: 'FU-4 rule: a compensated comorbid patient must not arrest on a standard induction' };
export const HR = (t: number, v: number): Step => [t, { type: 'setTarget', variable: 'hr', value: v }, `HR held at ${v} (instructor rate: the atrial-pacing stress test)`];
const stMin = (rows: Row[], t0: number, t1: number) => mn(rows, 'stMv', t0, t1);

// ---- CM-04 coronary artery disease ----------------------------------------------------------------------------------
add({ id: 'CM-04a', tier: 'P1', ctx: 'cad severe (3-vessel, CFR 1.4) and recent MI vs 65 y healthy, ventilated', state: 'GA, resting', intv: 'HR 70 → 110 held for 10 min', sys: 'CIRC RHY',
  arms: { s: V([HR(T, 110)], T + 600, CADS), m: V([HR(T, 110)], T + 600, CADM), a: V([HR(T, 110)], T + 600, X65), air: SP([HR(T, 110)], T + 600, CADS) },
  measure: (R) => m({ stMinSevere: stMin(R.s!.rows, T, T + 600), stMinMI: stMin(R.m!.rows, T, T + 600), stMinHealthy: stMin(R.a!.rows, T, T + 600),
    stMinSevereAwakeAir: stMin(R.air!.rows, T, T + 600), kIschSevereAwakeAir: r2(mn(R.air!.rows, 'kIsch', T, T + 600)), supDemAwakeAir: r2(mean(R.air!.rows, 'supDem', T + 300, T + 600)),
    kIschSevere: r2(mn(R.s!.rows, 'kIsch', T, T + 600)), kIschMI: r2(mn(R.m!.rows, 'kIsch', T, T + 600)), supDemSevere: r2(mean(R.s!.rows, 'supDem', T + 300, T + 600)), supDemHealthy: r2(mean(R.a!.rows, 'supDem', T + 300, T + 600)),
    mapSevere: r1(mean(R.s!.rows, 'map', T + 300, T + 600)), hrSevere: r1(mean(R.s!.rows, 'hr', T + 300, T + 600)) }),
  expect: [{ m: 'stMinSevere', lo: -0.3, hi: -0.1, src: 'tables §3 / §7 check 10: ischaemia (ST ↓ ≥ 1 mm) when demand exceeds the CFR-limited supply; ACC/AHA exercise testing: 3-vessel disease is ischaemic at HR ≈ 100–110' },
    { m: 'stMinMI', lo: -0.3, hi: -0.1, src: 'tables §1.5 cad recent MI (CFR 1.4, Ees ×0.8)' },
    { m: 'stMinHealthy', quiet: true, tol: 0.049, src: 'quiet: a healthy 65 y heart at HR 110 has no ischaemia (CFR 3.5)' }],
  owner: '7a coronary.ts',
  hand: { verdict: 'IN', why: 'the ischaemia is computed twice and the two disagree: contractility falls 14–20 % (kIsch 0.80–0.86, a low-pass of the flow deficit, τ 20 s; coronary.ts:159–162) while ST stays 0 — the ST timer counts only CONTINUOUS seconds of δ > 0.1 and resets on any dip (coronary.ts:180–181); δ is read from the last beat once a second and swings 0–0.27 (mean 0.064, 28 % of seconds > 0.1, longest run 3 s vs the 45 s lag; probe on 0fd5397), so ST never appears in any CAD rig'} });

add({ id: 'CM-04b', tier: 'P1', ctx: 'cad severe 65 y, ventilated', state: 'post-induction hypotension (propofol 2 mg/kg at T)', intv: 'phenylephrine 100 µg vs ephedrine 10 mg at T + 120 s', sys: 'CIRC RHY',
  arms: { p: V([pro(T), d(T + 120, 'phenylephrine', 100, 'mcg')], T + 600, CADS), e: V([pro(T), d(T + 120, 'ephedrine', 10, 'mg')], T + 600, CADS), c: V([pro(T)], T + 600, CADS) },
  measure: (R) => { const t0 = T + 120; const sd = (x: string) => r2(mean(R[x]!.rows, 'supDem', t0 + 30, t0 + 240));
    return m({ supDemPhe: sd('p'), supDemEph: sd('e'), supDemNone: sd('c'), dSupDem: r2(sd('p') - sd('e')), hrPhe: dMin(R.p!.rows, R.c!.rows, 'hr', t0, t0 + 240), hrEph: dMax(R.e!.rows, R.c!.rows, 'hr', t0, t0 + 240),
      mapPhe: dMax(R.p!.rows, R.c!.rows, 'map', t0, t0 + 240), mapEph: dMax(R.e!.rows, R.c!.rows, 'map', t0, t0 + 240), kIschNone: r2(mn(R.c!.rows, 'kIsch', T, T + 600)), stNone: stMin(R.c!.rows, T, T + 600) }); },
  expect: [{ m: 'mapPhe', dir: 1, tol: 8, src: 'tables §6.2: phenylephrine 100 µg MAP +15–25 %' },
    { m: 'dSupDem', dir: 1, tol: 0.02, src: 'tables §7 check 10 / Miller ch. on ischaemic heart disease: phenylephrine restores diastolic pressure without tachycardia, so supply/demand is better than after ephedrine' }],
  owner: '7a coronary / 7g' });

add({ id: 'CM-04c', tier: 'P1', ctx: 'cad severe vs 65 y healthy, ventilated', state: 'GA (no drug)', intv: 'bleed 1 L over 10 min', sys: 'CIRC RHY',
  arms: { s: V([BLEED1L(T)], T + 900, CADS), a: V([BLEED1L(T)], T + 900, X65) },
  measure: (R) => m({ stMinSevere: stMin(R.s!.rows, T, T + 900), stMinHealthy: stMin(R.a!.rows, T, T + 900), kIschSevere: r2(mn(R.s!.rows, 'kIsch', T, T + 900)), hrPeakSevere: mx(R.s!.rows, 'hr', T, T + 900),
    mapMinSevere: mn(R.s!.rows, 'map', T, T + 900), cppMinSevere: mn(R.s!.rows, 'cppCor', T, T + 900), supDemMinSevere: r2(mn(R.s!.rows, 'supDem', T, T + 900)) }),
  expect: [{ m: 'stMinSevere', lo: -0.3, hi: -0.05, src: 'tables §3: haemorrhage lowers diastolic pressure and raises HR — subendocardial ischaemia in 3-vessel disease (Miller ch. on ischaemic heart disease)' },
    { m: 'stMinHealthy', quiet: true, tol: 0.049, src: 'quiet: 1 L in a healthy 65 y causes no ischaemia' }],
  owner: '7a coronary.ts',
  hand: { verdict: 'TW', why: 'no ischaemia at all (kIsch 1, supply/demand ≥ 1.1): 1 L under GA keeps MAP ≈ 98 and HR ≤ 96 in this profile, so the demand never crosses the CFR-1.4 supply; direction only (the ST band is the tables\' teaching, not a measured incidence)' } });

add({ id: 'CM-04d', tier: 'P1', ctx: 'cad severe 65 y, ventilated', state: 'tachycardia after atropine 1 mg at T', intv: 'esmolol 1 mg/kg at T + 180 s vs none', sys: 'CIRC RHY',
  arms: { i: V([d(T, 'atropine', 1, 'mg'), d(T + 180, 'esmolol', 1, 'mg/kg')], T + 600, CADS), c: V([d(T, 'atropine', 1, 'mg')], T + 600, CADS) },
  measure: (R) => { const t0 = T + 180;
    return m({ hrAtropine: r1(mean(R.c!.rows, 'hr', T + 60, t0)), hrDrop: dMin(R.i!.rows, R.c!.rows, 'hr', t0, t0 + 300), supDemGain: r2(mean(R.i!.rows, 'supDem', t0 + 60, t0 + 300) - mean(R.c!.rows, 'supDem', t0 + 60, t0 + 300)),
      kIschAtropine: r2(mn(R.c!.rows, 'kIsch', T, T + 600)), kIschEsmolol: r2(mn(R.i!.rows, 'kIsch', t0 + 60, t0 + 300)), stAtropine: stMin(R.c!.rows, T, T + 600), mapDrop: dMin(R.i!.rows, R.c!.rows, 'map', t0, t0 + 300) }); },
  expect: [{ m: 'hrDrop', lo: -30, hi: -10, src: 'tables §6.2: esmolol 0.5–1 mg/kg HR −10–20 % (from ≈ 100)' },
    { m: 'supDemGain', dir: 1, tol: 0.02, src: 'tables §7 check 10 / Miller: β-blockade relieves demand ischaemia (longer diastole, lower HR)' }],
  owner: '7g esmolol / 7a coronary' });

// ---- CM-05 severe AS + severe CAD + HTN, 75 y -----------------------------------------------------------------------
add({ id: 'CM-05a', tier: 'P1', ctx: 'AS severe + CAD severe + HTN 75 y vs 75 y healthy, ventilated', state: 'compensated', intv: 'propofol 1.5 mg/kg', sys: 'CIRC RHY',
  arms: { i: V([pro(T, 1.5)], T + 900, ASx), c: V([], T + 900, ASx), ia: V([pro(T, 1.5)], T + 900, X75), ca: V([], T + 900, X75) },
  measure: (R) => { const h = hemo(R.i!.rows, R.c!.rows, T); const a = pctMin(R.ia!.rows, R.ca!.rows, 'map', T, T + 600);
    return m({ ...h, mapBase: base(R.c!.rows, 'map'), mapAt2min: r1(mean(R.i!.rows, 'map', T + 100, T + 140)), mapPctA: a, extraFall: r1((h.mapPct as number) - a), stMin: stMin(R.i!.rows, T, T + 900), kIschMin: r2(mn(R.i!.rows, 'kIsch', T, T + 900)) }); },
  expect: [{ m: 'mapMin', lo: 55, hi: 70, invert: true, src: 'tables §7 check 10: severe AS, propofol 1.5 mg/kg → MAP 103 → 60–65 at 2 min' },
    { m: 'stMin', lo: -0.3, hi: -0.1, src: 'tables §7 check 10: ST depression follows the induction fall in AS + CAD' },
    { m: 'kIschMin', lo: 0.3, hi: 0.75, invert: true, src: 'tables §7 check 10: Ees falls ≥ 25 % (the ischaemic spiral), recoverable' }, NOARREST],
  owner: 'FU-4 G2 (done) / 7a coronary' });

add({ id: 'CM-05b', tier: 'P1', ctx: 'AS severe + CAD + HTN 75 y vs 75 y healthy, ventilated', state: 'sinus', intv: 'AF onset at 100/min vs sinus held at 100/min (isolates the atrial kick)', sys: 'CIRC RHY',
  arms: { f: V([[T, A.rhythm('afib', { rateBpm: 100 }), 'AF 100']], T + 600, ASx), s: V([HR(T, 100)], T + 600, ASx), fa: V([[T, A.rhythm('afib', { rateBpm: 100 }), 'AF 100']], T + 600, X75), sa: V([HR(T, 100)], T + 600, X75) },
  measure: (R) => { const w = (x: string, k: string) => mean(R[x]!.rows, k, T + 120, T + 600);
    const sv = r1((100 * (w('f', 'sv') - w('s', 'sv'))) / w('s', 'sv')); const svA = r1((100 * (w('fa', 'sv') - w('sa', 'sv'))) / w('sa', 'sv'));
    return m({ svPctAS: sv, svPctHealthy: svA, extraLoss: r1(sv - svA), mapAF: r1(w('f', 'map')), mapSinus: r1(w('s', 'map')), hrAF: r1(w('f', 'hr')), hrSinus: r1(w('s', 'hr')), stMinAF: stMin(R.f!.rows, T, T + 600), kIschMinAF: r2(mn(R.f!.rows, 'kIsch', T, T + 600)), kIschMinAFHealthy: r2(mn(R.fa!.rows, 'kIsch', T, T + 600)) }); },
  expect: [{ m: 'svPctAS', lo: -35, hi: -15, src: 'tables §1.5 / B §4.8 k_rhythm 0.75–0.85; research/12 CM-05: the stiff hypertrophied LV loses SV −20–30 % without the atrial kick' },
    { m: 'extraLoss', dir: -1, tol: 3, src: 'R53: the atrial contribution is larger in LVH/AS than in a compliant ventricle (Miller, valvular heart disease)' }],
  owner: '7a atria (atrial kick) / Stage 5 AF',
  hand: { verdict: 'IN', why: 'the SV loss lands in band for a partly wrong reason: in AF at 100/min the coronary model makes the ventricle ischaemic (kIsch 0.50 in AS, 0.70 in the healthy 75 y; sinus at 100 keeps 1.0), so contractility loss adds to the lost atrial kick — gap C3 (per-beat LVEDP sampled mid-relaxation on short AF cycles)' } });

add({ id: 'CM-05c', tier: 'P1', ctx: 'AS severe + CAD + HTN 75 y, ventilated', state: 'post-induction hypotension (propofol 1.5 mg/kg at T)', intv: 'phenylephrine 100 µg at T + 120 s', sys: 'CIRC RHY',
  arms: { i: V([pro(T, 1.5), d(T + 120, 'phenylephrine', 100, 'mcg')], T + 600, ASx), c: V([pro(T, 1.5)], T + 600, ASx) },
  measure: (R) => { const t0 = T + 120;
    return m({ mapPeakPhe: mx(R.i!.rows, 'map', t0, t0 + 90), mapNone: r1(mean(R.c!.rows, 'map', t0, t0 + 90)), stAt5Phe: r2(mean(R.i!.rows, 'stMv', t0 + 240, t0 + 300)), stAt5None: r2(mean(R.c!.rows, 'stMv', t0 + 240, t0 + 300)),
      stGain: r2(mean(R.i!.rows, 'stMv', t0 + 240, t0 + 300) - mean(R.c!.rows, 'stMv', t0 + 240, t0 + 300)), hrPhe: dMin(R.i!.rows, R.c!.rows, 'hr', t0, t0 + 240) }); },
  expect: [{ m: 'mapPeakPhe', lo: 85, hi: 999, src: 'tables §7 check 10: phenylephrine 100 µg → MAP ≥ 85 within 90 s' },
    { m: 'stGain', dir: 1, tol: 0.02, src: 'tables §7 check 10: restoring diastolic pressure relieves the ST depression' }],
  owner: '7a coronary / 7g',
  hand: { verdict: 'TW', why: 'the rescue itself is right (MAP ≥ 85 in 90 s); the ST half cannot be tested because CM-05a never produces ischaemia (inherits CM-05a)' } });

add({ id: 'CM-05d', tier: 'P1', ctx: 'AS severe + CAD + HTN 75 y vs 75 y healthy, ventilated', state: 'GA (no induction drug)', intv: 'GTN 1 µg/kg/min for 10 min', sys: 'CIRC RHY',
  arms: { i: V([inf(T, 'nitroglycerin', 1, 'mcg/kg/min')], T + 900, ASx), c: V([], T + 900, ASx), ia: V([inf(T, 'nitroglycerin', 1, 'mcg/kg/min')], T + 900, X75), ca: V([], T + 900, X75) },
  measure: (R) => { const i = pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 900); const a = pctMin(R.ia!.rows, R.ca!.rows, 'map', T, T + 900);
    return m({ mapPctAS: i, mapPctHealthy: a, extraFall: r1(i - a), svPctAS: pctMin(R.i!.rows, R.c!.rows, 'sv', T, T + 900), stMinAS: stMin(R.i!.rows, T, T + 900), kIschMinAS: r2(mn(R.i!.rows, 'kIsch', T, T + 900)) }); },
  expect: [{ m: 'extraFall', dir: -1, tol: 3, src: 'research/12 CM-05 / tables §7 check 10 "GTN harms": with a fixed outflow orifice, venodilation drops SV and pressure far more than in a healthy heart (Miller, valvular heart disease)' },
    { m: 'stMinAS', lo: -0.3, hi: -0.05, src: 'tables §7 check 10: the pressure fall provokes subendocardial ischaemia in AS + CAD' }],
  owner: '7g GTN / 7a' });

// ---- CM-06 HFrEF (EF 30 %), 60 y 80 kg ------------------------------------------------------------------------------
add({ id: 'CM-06a', tier: 'P1', ctx: 'hfref 60 y vs 60 y healthy, ventilated', state: 'compensated HFrEF', intv: 'none (resting values)', sys: 'CIRC LUNG',
  arms: { h: V([], T + 60, HF), a: V([], T + 60, X60) },
  measure: (R) => m({ ef: baseR(R.h!.rows, 'ef'), efA: baseR(R.a!.rows, 'ef'), lvedp: base(R.h!.rows, 'lvedpEv'), pla: base(R.h!.rows, 'pla'), map: base(R.h!.rows, 'map'), co: baseR(R.h!.rows, 'co'), coA: baseR(R.a!.rows, 'co'),
    papMean: base(R.h!.rows, 'papMean'), evlwi: baseR(R.h!.rows, 'evlwi'), hr: base(R.h!.rows, 'hr') }),
  expect: [{ m: 'ef', lo: 0.2, hi: 0.4, src: 'tables §1.5 hfref: EF 30 % (ESC HF 2021)' }, { m: 'lvedp', lo: 15, hi: 22, src: 'tables §1.5 hfref: LVEDP 15–20' },
    { m: 'map', lo: 70, hi: 85, src: 'tables §1.5 hfref: MAP set point 75' }],
  owner: '7a profile' });

add({ id: 'CM-06b', tier: 'P1', ctx: 'hfref 60 y vs 60 y healthy, ventilated', state: 'compensated HFrEF', intv: 'etomidate 0.3 mg/kg vs propofol 2 mg/kg', sys: 'CIRC',
  arms: { e: V([d(T, 'etomidate', 0.3, 'mg/kg')], T + 900, HF), p: V([pro(T)], T + 900, HF), c: V([], T + 900, HF), pa: V([pro(T)], T + 900, X60), ca: V([], T + 900, X60) },
  measure: (R) => { const p = pctMin(R.p!.rows, R.c!.rows, 'map', T, T + 600); const a = pctMin(R.pa!.rows, R.ca!.rows, 'map', T, T + 600);
    return m({ mapPctEtom: pctMin(R.e!.rows, R.c!.rows, 'map', T, T + 600), mapPctProp: p, mapPctPropHealthy: a, extraFall: r1(p - a), svPctProp: pctMin(R.p!.rows, R.c!.rows, 'sv', T, T + 600), mapMinProp: mn(R.p!.rows, 'map', T, T + 600), arrest: arrestIn(R.p!.rows, T, T + 900) }); },
  expect: [{ m: 'mapPctEtom', lo: -15, hi: 0, src: 'Miller ch. 21 / tables §6.3: etomidate MAP −0–10 %, the stable induction in HFrEF' },
    { m: 'mapPctProp', lo: -40, hi: -20, src: 'tables §1.5 hfref (afterload-sensitive, blunted reflex G_v ×0.5): propofol falls at least as much as in health' }, NOARREST],
  owner: 'FU-4 G2 (done) / 7g' });

add({ id: 'CM-06c', tier: 'P1', ctx: 'hfref 60 y vs 60 y healthy, ventilated', state: 'compensated HFrEF (LVEDP ≈ 18)', intv: 'Ringer\'s lactate 500 mL over 10 min', sys: 'CIRC LUNG BLD',
  arms: { i: V([[T, A.fluid('rl', 500, 600), 'RL 500 mL / 10 min']], T + 900, HF), c: V([], T + 900, HF), ia: V([[T, A.fluid('rl', 500, 600), 'RL 500 mL / 10 min']], T + 900, X60), ca: V([], T + 900, X60) },
  measure: (R) => { const w = (x: string, k: string) => mean(R[x]!.rows, k, T + 540, T + 660);
    return m({ dPlaHF: r1(w('i', 'pla') - w('c', 'pla')), dPlaA: r1(w('ia', 'pla') - w('ca', 'pla')), svPctHF: r1((100 * (w('i', 'sv') - w('c', 'sv'))) / w('c', 'sv')), svPctA: r1((100 * (w('ia', 'sv') - w('ca', 'sv'))) / w('ca', 'sv')),
      evlwiHF: r2(w('i', 'evlwi')), evlwiGainHF: r2(w('i', 'evlwi') - w('c', 'evlwi')), pao2PctHF: r1((100 * (w('i', 'pao2') - w('c', 'pao2'))) / w('c', 'pao2')) }); },
  expect: [{ m: 'dPlaHF', lo: 3, hi: 12, src: 'tables §1.5 hfref (β ×1.3, flat Starling curve): 500 mL raises the filling pressure several mmHg' },
    { m: 'svPctHF', lo: -5, hi: 8, src: 'tables §1.5 hfref / ESC HF 2021: the failing ventricle is on the flat part of its curve — little SV gain' },
    { m: 'evlwiGainHF', dir: 1, tol: 0.1, src: 'research/12 CM-06: fluid raises PAWP → pulmonary oedema (Starling filtration, tables §2)' }],
  owner: '7a EDPVR / 7c lung water' });

add({ id: 'CM-06d', tier: 'P1', ctx: 'hfref 60 y, ventilated', state: 'low-output HFrEF', intv: 'dobutamine 5 µg/kg/min', sys: 'CIRC',
  arms: { i: V([inf(T, 'dobutamine', 5, 'mcg/kg/min')], T + 900, HF), c: V([], T + 900, HF) },
  measure: (R) => m({ coPct: pctMax(R.i!.rows, R.c!.rows, 'co', T, T + 900), svPct: pctMax(R.i!.rows, R.c!.rows, 'sv', T, T + 900), hrUp: dMax(R.i!.rows, R.c!.rows, 'hr', T, T + 900), mapD: dMax(R.i!.rows, R.c!.rows, 'map', T, T + 900), dPla: dMin(R.i!.rows, R.c!.rows, 'pla', T, T + 900) }),
  expect: [{ m: 'coPct', lo: 20, hi: 45, src: 'tables §7 check 20 / T6.2: dobutamine 5 µg/kg/min CO +20–40 % in a failing ventricle' }],
  owner: '7g dobutamine', known: 'FU-7 Task 17' });

add({ id: 'CM-06e', tier: 'P1', ctx: 'hfref 60 y vs 60 y healthy, ventilated', state: 'compensated HFrEF', intv: 'afterload reduction: hydralazine 10 mg IV', sys: 'CIRC',
  arms: { i: V([d(T, 'hydralazine', 10, 'mg')], T + 1200, HF), c: V([], T + 1200, HF), ia: V([d(T, 'hydralazine', 10, 'mg')], T + 1200, X60), ca: V([], T + 1200, X60) },
  measure: (R) => m({ svPctHF: pctMax(R.i!.rows, R.c!.rows, 'sv', T, T + 1200), svPctA: pctMax(R.ia!.rows, R.ca!.rows, 'sv', T, T + 1200), mapPctHF: pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 1200), mapPctA: pctMin(R.ia!.rows, R.ca!.rows, 'map', T, T + 1200),
    svrPctHF: pctMin(R.i!.rows, R.c!.rows, 'svr', T, T + 1200), dPlaHF: dMin(R.i!.rows, R.c!.rows, 'pla', T, T + 1200) }),
  expect: [{ m: 'svPctHF', lo: 8, hi: 40, src: 'Cohn & Franciosa 1977 (NEJM 297:27): arteriolar dilators raise SV in the failing ventricle (afterload-sensitive), tables §1.5' },
    { m: 'mapPctHF', lo: -15, hi: 0, src: 'Cohn 1977: in heart failure the SV rise offsets the SVR fall, so MAP falls little' }],
  owner: '7a (afterload sensitivity) / 7g hydralazine' });
