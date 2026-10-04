// DI group A — induction agents × comorbidity, and hypnotic/opioid/benzodiazepine synergy (matrix DI-01, DI-02, DI-03,
// DI-07, DI-21, DI-22, DI-31, DI-32, DI-36, DI-44 plus the induction grid the run brief adds).
import { A } from './runner.ts';
import { add, apnoeic, anyR, arrestIn, ASx, BB, CL3, COPD3, d, dMin, dMax, HF, hemo, inf, m, mn, mx, pctMin, SEPC, SP, T, TB, V, vap, XA, XE, type Expect } from './spec.ts';

const pro = (t: number, mgkg = 2) => d(t, 'propofol', mgkg, 'mg/kg');
const rem = (t: number, ugkg = 1) => d(t, 'remifentanil', ugkg, 'mcg/kg');
const NOARREST: Expect = { m: 'arrest', event: false, src: 'FU-4 rule: the healthy/compensated counterpart must not arrest' };

// ---- DI-01: propofol ± remifentanil ---------------------------------------------------------------------------------
add({ id: 'DI-01a', tier: 'P1', ctx: 'X-A vent', state: 'GA, no comorbidity', intv: 'propofol 2 mg/kg', sys: 'CIRC',
  arms: { i: V([pro(T)]), c: V([]) }, measure: (R) => m(hemo(R.i!.rows, R.c!.rows, T)),
  expect: [{ m: 'mapPct', lo: -40, hi: -25, src: 'Miller 10e ch. 21 p. 519: MAP −25–40 % after 2–2.5 mg/kg' }, NOARREST],
  owner: 'FU-4 G2', fu4: true });
add({ id: 'DI-01b', tier: 'P1', ctx: 'X-A vent', state: 'GA', intv: 'remifentanil 1 µg/kg bolus', sys: 'CIRC RHY',
  arms: { i: V([rem(T)]), c: V([]) }, measure: (R) => m(hemo(R.i!.rows, R.c!.rows, T)),
  expect: [{ m: 'hrDown', lo: -25, hi: -9, src: 'FU-4 S15 target from Miller ch. 22: remifentanil 1 µg/kg HR −15 to −30 %' },
    { m: 'mapPct', lo: -18, hi: -5, src: 'tables §6.3 opioid row: SVR −5–15 %, HR −10–20 %' }],
  owner: 'FU-4 G7', fu4: true });
add({ id: 'DI-01c', tier: 'P1', ctx: 'X-A vent', state: 'GA', intv: 'propofol 2 mg/kg + remifentanil 1 µg/kg vs each alone', sys: 'CIRC',
  arms: { i: V([pro(T), rem(T)]), p: V([pro(T)]), r: V([rem(T)]), c: V([]) },
  measure: (R) => {
    const both = pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 600);
    const sum = pctMin(R.p!.rows, R.c!.rows, 'map', T, T + 600) + pctMin(R.r!.rows, R.c!.rows, 'map', T, T + 600);
    return m({ mapPctBoth: both, mapPctSumAlone: Math.round(sum * 10) / 10, excessPct: Math.round((both - sum) * 10) / 10, hrDown: dMin(R.i!.rows, R.c!.rows, 'hr', T, T + 600), arrest: arrestIn(R.i!.rows, T, T + 600) });
  },
  expect: [{ m: 'excessPct', dir: -1, tol: 2, src: 'hypnotic + opioid act on one response surface: the pair is more than additive (Bouillon 2004; Miller ch. 22)' }, NOARREST],
  owner: '7g combine.ts' });
add({ id: 'DI-01d', tier: 'P1', ctx: 'X-A spontaneous, FiO2 0.5', state: 'awake', intv: 'propofol 2 mg/kg ± remifentanil 1 µg/kg: apnoea', sys: 'LUNG NEU',
  arms: { i: SP([[1, A.spont(0.5), 'spontaneous FiO2 0.5'], pro(T), rem(T)], T + 600), p: SP([[1, A.spont(0.5), 'spontaneous'], pro(T)], T + 600), c: SP([[1, A.spont(0.5), 'spontaneous']], T + 600) },
  measure: (R) => {
    // resume: apnoea = spontaneous VE < 1 L/min (the 7f flag stays set while the chemoreflex breathes, DI-89)
    const ap = (x: { rows: import('./runner.ts').Row[] }) => x.rows.filter((r) => (r.t as number) > T && apnoeic(r)).length * 5;
    return m({ apnoeaS_both: ap(R.i!), apnoeaS_prop: ap(R.p!), vePctBoth: pctMin(R.i!.rows, R.c!.rows, 'veSp', T, T + 300), vePctProp: pctMin(R.p!.rows, R.c!.rows, 'veSp', T, T + 300), paco2Peak: mx(R.i!.rows, 'paco2', T, T + 600), spo2Min: mn(R.i!.rows, 'spo2', T, T + 600) });
  },
  expect: [{ m: 'apnoeaS_both', lo: 60, hi: 600, src: 'propofol + remifentanil induction: apnoea in nearly all, minutes long (Miller ch. 22)' },
    { m: 'apnoeaS_prop', lo: 30, hi: 300, src: 'propofol 2 mg/kg alone: apnoea 30–60 s typical (Miller ch. 21)' }],
  owner: '7f drive.ts / neuro/spont.ts', hand: { verdict: 'TW', why: 'propofol 2 mg/kg alone lowers spontaneous VE 76 % but never below 1 L/min (0 s of real apnoea; the 7f flag claims 220 s, DI-89); the pair gives 260 s — the chemoreflex in neuro/spont.ts buffers the drug depression' } });

// ---- DI-02 / DI-03: benzodiazepine co-induction and opioid–benzodiazepine respiratory synergy ------------------------
add({ id: 'DI-02', tier: 'P1', ctx: 'X-A vent', state: 'GA', intv: 'midazolam 0.03 mg/kg 2 min before propofol 1.4 mg/kg vs propofol 1.4 alone', sys: 'NEU CIRC',
  arms: { i: V([d(T - 120, 'midazolam', 0.03, 'mg/kg'), pro(T, 1.4)]), p: V([pro(T, 1.4)]), z: V([d(T - 120, 'midazolam', 0.03, 'mg/kg')]), c: V([]) },
  measure: (R) => {
    const di = (x: { rows: import('./runner.ts').Row[] }) => mn(x.rows, 'di', T, T + 300);
    const loc = (x: { rows: import('./runner.ts').Row[] }) => anyR(x.rows, T, T + 300, (r) => r.conscious === false);
    const both = pctMin(R.i!.rows, R.c!.rows, 'map', T - 120, T + 600);
    const sum = pctMin(R.p!.rows, R.c!.rows, 'map', T, T + 600) + pctMin(R.z!.rows, R.c!.rows, 'map', T - 120, T + 600);
    return m({ diMinBoth: di(R.i!), diMinProp: di(R.p!), diDelta: Math.round((di(R.i!) - di(R.p!)) * 10) / 10, locBoth: loc(R.i!), locProp: loc(R.p!), mapPctBoth: both, mapPctSum: Math.round(sum * 10) / 10 });
  },
  expect: [{ m: 'diDelta', dir: -1, tol: 2, src: 'co-induction synergy: midazolam 0.02–0.05 mg/kg cuts the propofol induction dose 20–50 % (Short & Chui 1991; Miller ch. 21)' },
    { m: 'locBoth', event: true, src: 'the reduced propofol dose still loses consciousness after midazolam' }],
  owner: '7f depth.ts' });
add({ id: 'DI-03', tier: 'P1', ctx: 'X-A awake spontaneous, room air', state: 'awake', intv: 'fentanyl 2 µg/kg + midazolam 0.05 mg/kg (Bailey 1990)', sys: 'LUNG NEU',
  arms: { i: SP([d(T, 'fentanyl', 2, 'mcg/kg'), d(T, 'midazolam', 0.05, 'mg/kg')], T + 1200), f: SP([d(T, 'fentanyl', 2, 'mcg/kg')], T + 1200), z: SP([d(T, 'midazolam', 0.05, 'mg/kg')], T + 1200), c: SP([], T + 1200) },
  measure: (R) => m({ spo2MinBoth: mn(R.i!.rows, 'spo2', T, T + 1200), spo2MinFent: mn(R.f!.rows, 'spo2', T, T + 1200), spo2MinMidaz: mn(R.z!.rows, 'spo2', T, T + 1200),
    apnoeaBoth: anyR(R.i!.rows, T, T + 1200, apnoeic), apnoeaFent: anyR(R.f!.rows, T, T + 1200, apnoeic), apnoeaFlagBoth: anyR(R.i!.rows, T, T + 1200, (r) => r.apnoea === true),
    vePctBoth: pctMin(R.i!.rows, R.c!.rows, 'veSp', T, T + 1200), vePctFent: pctMin(R.f!.rows, R.c!.rows, 'veSp', T, T + 1200), vePctMidaz: pctMin(R.z!.rows, R.c!.rows, 'veSp', T, T + 1200), paco2Peak: mx(R.i!.rows, 'paco2', T, T + 1200) }),
  expect: [{ m: 'spo2MinBoth', lo: 70, hi: 89, src: 'Bailey 1990: fentanyl 2 µg/kg + midazolam 0.05 mg/kg → SpO2 < 90 % in 11/12' },
    { m: 'apnoeaBoth', event: true, src: 'Bailey 1990: apnoea in 6/12' },
    { m: 'spo2MinMidaz', lo: 93, hi: 100, src: 'Bailey 1990: midazolam alone caused no hypoxaemia' }],
  owner: '7f drive.ts' });

// ---- the induction grid: agent × comorbidity ------------------------------------------------------------------------
const grid: [string, string, Record<string, unknown>, string, [number, number]][] = [
  ['DI-46', 'X-E 80 y HTN', XE, 'propofol 2 mg/kg', [-50, -30]],
  ['DI-47', 'HFrEF', HF, 'propofol 2 mg/kg', [-40, -20]],
  ['DI-48', 'severe AS + CAD 75 y', ASx, 'propofol 1.5 mg/kg', [-45, -30]],
  ['DI-49', 'COPD GOLD 3', COPD3, 'propofol 2 mg/kg', [-40, -25]],
];
for (const [id, ctx, pt, intv, band] of grid)
  add({ id, tier: 'P1', ctx, state: 'comorbid, ventilated', intv, sys: 'CIRC',
    arms: { i: V([pro(T, intv.includes('1.5') ? 1.5 : 2)], T + 900, pt), c: V([], T + 900, pt) },
    measure: (R) => m({ ...hemo(R.i!.rows, R.c!.rows, T), kIschMin: mn(R.i!.rows, 'kIsch', T, T + 600), cppMin: mn(R.i!.rows, 'cppCor', T, T + 600) }),
    expect: [{ m: 'mapPct', lo: band[0], hi: band[1], src: id === 'DI-46' ? 'elderly hypertensive: induction fall 40 % vs 30 % healthy (tables §1.5 HTN row; INTUBE 2021 instability 42.6 %)' : id === 'DI-48' ? 'tables §7 check 10: MAP 103 → 60–65 at 2 min after 1.5 mg/kg' : 'tables §1.5 (HFrEF afterload-sensitive; COPD auto-PEEP compounds)' }, NOARREST],
    owner: 'FU-4 G2', fu4: true });
add({ id: 'DI-22', tier: 'P1', ctx: 'X-A vent, class III bleed', state: 'class III haemorrhage', intv: 'etomidate 0.3 vs propofol 2 mg/kg at +11 min', sys: 'CIRC',
  arms: { e: V([...CL3, d(TB, 'etomidate', 0.3, 'mg/kg')], 2100), p: V([...CL3, pro(TB)], 2100), c: V([...CL3], 2100) },
  measure: (R) => m({ mapPctEtom: pctMin(R.e!.rows, R.c!.rows, 'map', TB, TB + 600), mapPctProp: pctMin(R.p!.rows, R.c!.rows, 'map', TB, TB + 600),
    mapMinEtom: mn(R.e!.rows, 'map', TB, TB + 600), mapMinProp: mn(R.p!.rows, 'map', TB, TB + 600),
    arrestEtom: arrestIn(R.e!.rows, TB, TB + 600), arrestProp: arrestIn(R.p!.rows, TB, TB + 600) }),
  expect: [{ m: 'mapPctEtom', lo: -15, hi: 0, src: 'etomidate preserves MAP (tables §6.3: MAP −0–10 %)' },
    { m: 'mapPctProp', lo: -50, hi: -25, src: 'propofol in hypovolaemia falls further (Miller ch. 21; INTUBE)' },
    { m: 'arrestProp', event: false, src: 'FU-4 9th-cap ruling 2: class III + propofol must reach MAP 30–50 without arrest in 5 min (INTUBE arrest 3.1 %)' }],
  owner: 'FU-4 G2 + humoral arm', fu4: true });
add({ id: 'DI-32', tier: 'P1', ctx: 'HFrEF', state: 'HFrEF', intv: 'etomidate 0.3 vs propofol 2 mg/kg; then dobutamine 5 µg/kg/min', sys: 'CIRC',
  arms: { e: V([d(T, 'etomidate', 0.3, 'mg/kg')], T + 900, HF), p: V([pro(T)], T + 900, HF), pd: V([pro(T), inf(T + 300, 'dobutamine', 5, 'mcg/kg/min')], T + 1200, HF), c: V([], T + 1200, HF) },
  measure: (R) => m({ mapPctEtom: pctMin(R.e!.rows, R.c!.rows, 'map', T, T + 600), mapPctProp: pctMin(R.p!.rows, R.c!.rows, 'map', T, T + 600),
    svPctProp: pctMin(R.p!.rows, R.c!.rows, 'sv', T, T + 600), coPctProp: pctMin(R.p!.rows, R.c!.rows, 'co', T, T + 600),
    coPctDobuVsProp: Math.round(((100 * (Math.max(...R.pd!.rows.filter((r) => (r.t as number) > T + 500 && (r.t as number) <= T + 1200).map((r) => r.co as number)) - Math.max(...R.p!.rows.filter((r) => (r.t as number) > T + 500).map((r) => r.co as number)))) / Math.max(...R.p!.rows.filter((r) => (r.t as number) > T + 500).map((r) => r.co as number))) * 10) / 10 }),
  expect: [{ m: 'mapPctEtom', lo: -15, hi: 0, src: 'etomidate is the stable induction in HFrEF (Miller ch. 21)' },
    { m: 'coPctDobuVsProp', lo: 20, hi: 45, src: 'tables §7 check 20 / T6.2: dobutamine 5 µg/kg/min CO +20–40 % in a failing ventricle' }],
  owner: '7g (NR-7g-2 inotrope venous return)' });
add({ id: 'DI-21', tier: 'P1', ctx: 'X-A vent', state: 'prolonged septic shock, cold phase (catecholamine-depleted proxy)', intv: 'ketamine 1 mg/kg', sys: 'CIRC',
  arms: { i: V([...SEPC, d(1260, 'ketamine', 1, 'mg/kg')], 2400), c: V([...SEPC], 2400), ri: V([d(1260, 'ketamine', 1, 'mg/kg')], 2400), rc: V([], 2400) },
  measure: (R) => m({ mapPctSeptic: pctMin(R.i!.rows, R.c!.rows, 'map', 1260, 1860), mapRiseSeptic: dMax(R.i!.rows, R.c!.rows, 'map', 1260, 1860),
    mapPctHealthy: pctMin(R.ri!.rows, R.rc!.rows, 'map', 1260, 1860), mapRiseHealthy: dMax(R.ri!.rows, R.rc!.rows, 'map', 1260, 1860),
    hrSeptic: dMax(R.i!.rows, R.c!.rows, 'hr', 1260, 1860), arrest: arrestIn(R.i!.rows, 1260, 1860) }),
  expect: [{ m: 'mapRiseHealthy', lo: 5, hi: 25, src: 'tables §6.3: ketamine raises MAP 15–25 % through sympathetic drive in a catecholamine-replete patient' },
    { m: 'mapPctSeptic', dir: -1, tol: 3, src: 'direct myocardial depression unmasked when catecholamine-depleted (Miller ch. 21; tables §6.3 "direct Ees ×0.9 unmasked")' }],
  owner: '7g combine.ts (ketamine indirect arm)' });
add({ id: 'DI-31', tier: 'P1', ctx: 'severe AS + CAD 75 y', state: 'post-induction hypotension', intv: 'phenylephrine 100 µg vs ephedrine 10 mg', sys: 'CIRC',
  arms: { p: V([pro(T, 1.5), d(T + 150, 'phenylephrine', 100, 'mcg')], T + 900, ASx), e: V([pro(T, 1.5), d(T + 150, 'ephedrine', 10, 'mg')], T + 900, ASx), c: V([pro(T, 1.5)], T + 900, ASx) },
  measure: (R) => m({ mapPhe: mx(R.p!.rows, 'map', T + 150, T + 450), mapEph: mx(R.e!.rows, 'map', T + 150, T + 450), mapNone: mx(R.c!.rows, 'map', T + 150, T + 450),
    hrPhe: dMin(R.p!.rows, R.c!.rows, 'hr', T + 150, T + 450), hrEph: dMax(R.e!.rows, R.c!.rows, 'hr', T + 150, T + 450),
    cppPhe: mn(R.p!.rows, 'cppCor', T + 150, T + 450), cppEph: mn(R.e!.rows, 'cppCor', T + 150, T + 450),
    kIschPhe: mn(R.p!.rows, 'kIsch', T + 150, T + 450), kIschEph: mn(R.e!.rows, 'kIsch', T + 150, T + 450) }),
  expect: [{ m: 'mapPhe', lo: 85, hi: 999, src: 'tables §7 check 10: phenylephrine 100 µg → MAP ≥ 85 within 90 s (a floor; the first run added a 130 ceiling with no source)' },
    { m: 'hrEph', dir: 1, tol: 3, src: 'ephedrine raises HR 10–15 (tables §7 check 10: tachycardia worsens ischaemia in AS)' }],
  owner: '7a coronary / 7g' });
add({ id: 'DI-44', tier: 'P2', ctx: 'X-E 80 y HTN', state: 'GA maintenance', intv: 'propofol 100 µg/kg/min for 60 min (cumulative hypotension, CSHT)', sys: 'CIRC PK',
  arms: { i: V([inf(60, 'propofol', 100, 'mcg/kg/min')], 4200, XE, { dt: 10 }), c: V([], 4200, XE, { dt: 10 }) },
  measure: (R) => m({ mapPct10: Math.round(((100 * (mn(R.i!.rows, 'map', 600, 960) - mn(R.c!.rows, 'map', 600, 960))) / mn(R.c!.rows, 'map', 600, 960)) * 10) / 10,
    mapPct60: Math.round(((100 * (mn(R.i!.rows, 'map', 3600, 3660) - mn(R.c!.rows, 'map', 3600, 3660))) / mn(R.c!.rows, 'map', 3600, 3660)) * 10) / 10,
    ce10: Math.round(mx(R.i!.rows, 'c_propofol', 600, 660) * 100) / 100, ce60: Math.round(mx(R.i!.rows, 'c_propofol', 3600, 3660) * 100) / 100,
    ceRatio: Math.round((mx(R.i!.rows, 'c_propofol', 3600, 3660) / mx(R.i!.rows, 'c_propofol', 600, 660)) * 100) / 100 }),
  expect: [{ m: 'ceRatio', lo: 1.15, hi: 1.8, src: 'a fixed-rate propofol infusion keeps accumulating over the first hour (Eleveld 2018 / Miller ch. 21 Fig. 21-8)' },
    { m: 'mapPct60', dir: -1, tol: 5, src: 'the hypotension deepens as Ce rises in an elderly hypertensive (Miller ch. 21)' }],
  owner: '7g PK', hand: { verdict: 'PL', why: 'the engine reproduces the published Eleveld model to 1e-9 (7g gate); Eleveld itself gives Ce(60 min)/Ce(10 min) = 2.0 at a fixed 100 µg/kg/min in an 80-y patient. The 1.15–1.8 band was read off a Marsh-era figure, so the band, not the model, is off — recorded for Ali (Q-7g-1 family)' } });
add({ id: 'DI-36', tier: 'P1', ctx: 'COPD GOLD 3', state: 'COPD GOLD 3, RR 20, PEEP 10', intv: 'propofol 2 mg/kg + PEEP 10 at RR 20 (auto-PEEP stacking)', sys: 'CIRC LUNG',
  arms: { i: V([[T, A.vent({ rr: 20, peep: 10 }), 'RR 20 PEEP 10'], pro(T + 60)], T + 900, COPD3), v: V([[T, A.vent({ rr: 20, peep: 10 }), 'RR 20 PEEP 10']], T + 900, COPD3), c: V([], T + 900, COPD3) },
  measure: (R) => m({ mapPctVentOnly: pctMin(R.v!.rows, R.c!.rows, 'map', T, T + 600), mapPctBoth: pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 600),
    mapPctPropAdd: Math.round((pctMin(R.i!.rows, R.c!.rows, 'map', T + 60, T + 600) - pctMin(R.v!.rows, R.c!.rows, 'map', T + 60, T + 600)) * 10) / 10,
    cvpBoth: mx(R.i!.rows, 'cvp', T, T + 600), arrest: arrestIn(R.i!.rows, T, T + 600) }),
  expect: [{ m: 'mapPctBoth', lo: -55, hi: -25, src: 'auto-PEEP at RR 20 plus induction: compounded hypotension (Barash ch. on obstructive disease)' }, NOARREST],
  owner: 'FU-4 G2 + 7b', fu4: true });
add({ id: 'DI-07', tier: 'P1', ctx: 'X-A vent', state: 'GA', intv: 'esmolol 0.5 mg/kg + propofol 2 mg/kg', sys: 'CIRC',
  arms: { i: V([d(T, 'esmolol', 0.5, 'mg/kg'), pro(T)]), e: V([d(T, 'esmolol', 0.5, 'mg/kg')]), p: V([pro(T)]), c: V([]) },
  measure: (R) => {
    const b = pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 600);
    const s = pctMin(R.e!.rows, R.c!.rows, 'map', T, T + 600) + pctMin(R.p!.rows, R.c!.rows, 'map', T, T + 600);
    return m({ mapPctBoth: b, mapPctSum: Math.round(s * 10) / 10, ratioToSum: Math.round((b / s) * 100) / 100, hrEsmolol: dMin(R.e!.rows, R.c!.rows, 'hr', T, T + 600), hrBoth: dMax(R.i!.rows, R.c!.rows, 'hr', T, T + 600), hrProp: dMax(R.p!.rows, R.c!.rows, 'hr', T, T + 600), arrest: arrestIn(R.i!.rows, T, T + 600) });
  },
  expect: [{ m: 'hrEsmolol', lo: -25, hi: -7, src: 'tables §6.2: esmolol 0.5 mg/kg HR −10–20 %' },
    { m: 'ratioToSum', lo: 0.8, hi: 1.6, src: 'β-blockade plus propofol: at least additive hypotension (Miller ch. 14)' }, NOARREST],
  owner: '7g' });
add({ id: 'DI-30', tier: 'P2', ctx: 'opioid-tolerant', state: 'chronic opioid use', intv: 'remifentanil', sys: 'NEU LUNG', arms: {}, expect: [],
  owner: 'FU-7 profile', ne: 'no opioid-tolerant profile: no receptor-density/EC50 shift input (research/11 §2.15)' });
add({ id: 'DI-43', tier: 'P2', ctx: 'OSA', state: 'obstructive sleep apnoea', intv: 'opioid (PCA-equivalent)', sys: 'AIR LUNG', arms: {}, expect: [],
  owner: 'FU-7 profile', ne: 'no OSA profile: tables §1.5 asks for a depth-dependent upper-airway collapse threshold, absent' });
