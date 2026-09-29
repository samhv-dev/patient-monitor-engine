// DI group B — volatiles × NMB × reversal, succinylcholine hazards, anticholinergics, magnesium/calcium × NMB
// (matrix DI-17, DI-18, DI-19, DI-20, DI-25, DI-29, DI-37, DI-45 plus the NMB timing cells the brief adds).
import { A } from './runner.ts';
import { add, anyR, arrestIn, d, dMax, dMin, hemo, m, mn, mx, pctMin, secOf, T, V, vap, XA, type Expect } from './spec.ts';
import type { Row } from './runner.ts';

const roc = (t: number, mgkg = 0.6) => d(t, 'rocuronium', mgkg, 'mg/kg');
const firstAt = (rows: Row[], t0: number, f: (r: Row) => boolean): number => { for (const r of rows) if ((r.t as number) >= t0 && f(r)) return (r.t as number) - t0; return NaN; };
const NOARREST: Expect = { m: 'arrest', event: false, src: 'FU-4 rule: the healthy counterpart must not arrest' };

// ---- volatile potentiation of a non-depolariser ---------------------------------------------------------------------
add({ id: 'DI-50', tier: 'P1', ctx: 'X-A vent', state: 'GA', intv: 'rocuronium 0.6 mg/kg alone: onset and T1 25 % recovery', sys: 'NEU PK',
  arms: { i: V([roc(T)], T + 3000, XA, { dt: 5 }) },
  measure: (R) => m({ onsetS: firstAt(R.i!.rows, T, (r) => (r.t1 as number) <= 0.01), t1_25minutes: Math.round((firstAt(R.i!.rows, T + 300, (r) => (r.t1 as number) >= 0.25) / 60) * 10) / 10, tofrAt45min: Math.round((mn(R.i!.rows, 'tofR', T + 2600, T + 2700)) * 100) / 100 }),
  expect: [{ m: 'onsetS', lo: 60, hi: 150, invert: true, src: 'rocuronium 0.6 mg/kg (2×ED95): maximum block at 1.8 min (label; Miller ch. 24 Table 24.3)' },
    { m: 't1_25minutes', lo: 24, hi: 40, src: 'clinical duration (T1 25 %) 30–35 min (label; 7g gate measured 30.0)' }],
  owner: '7f nmb.ts / 7g PK' });
add({ id: 'DI-51', tier: 'P1', ctx: 'X-A vent, sevoflurane ≈ 1 MAC', state: 'GA volatile maintenance', intv: 'rocuronium 0.6 mg/kg under sevoflurane vs TIVA (potentiation)', sys: 'NEU',
  // resume fix: the first run's 50-min window ended before the volatile arm recovered (a NaN, not a finding)
  arms: { i: V([vap(60, 'sevoflurane', 2.5, 4), roc(1200)], 1200 + 7200, XA, { dt: 10 }), c: V([roc(1200)], 1200 + 7200, XA, { dt: 10 }) },
  measure: (R) => { const tv = firstAt(R.i!.rows, 1500, (r) => (r.t1 as number) >= 0.25) + 300; const tt = firstAt(R.c!.rows, 1500, (r) => (r.t1 as number) >= 0.25) + 300;
    return m({ macAtDose: Math.round(mx(R.i!.rows, 'macBrain', 1150, 1200) * 100) / 100, t25_volatile: Math.round((tv / 60) * 10) / 10, t25_tiva: Math.round((tt / 60) * 10) / 10, prolongPct: Math.round(((100 * (tv - tt)) / tt) * 10) / 10 }); },
  expect: [{ m: 'prolongPct', lo: 25, hi: 80, src: 'potent volatiles at ≈ 1 MAC prolong non-depolarising block ≈ 30–50 % vs propofol (Miller ch. 24; 7f interactions.ts EC50 ÷ (1 + 0.5·MAC))' }],
  owner: '7f interactions.ts' });
add({ id: 'DI-17', tier: 'P1', ctx: 'X-A vent', state: 'residual block at TOF 2', intv: 'neostigmine 0.05 mg/kg with atropine 1 mg vs with glycopyrrolate 0.4 mg vs alone', sys: 'NEU RHY CIRC',
  arms: { a: V([roc(60), d(1800, 'neostigmine', 0.05, 'mg/kg'), d(1800, 'atropine', 1, 'mg')], 2700), g: V([roc(60), d(1800, 'neostigmine', 0.05, 'mg/kg'), d(1800, 'glycopyrrolate', 0.4, 'mg')], 2700), n: V([roc(60), d(1800, 'neostigmine', 0.05, 'mg/kg')], 2700), c: V([roc(60)], 2700) },
  measure: (R) => m({ hrNeoAlone: dMin(R.n!.rows, R.c!.rows, 'hr', 1800, 2400), hrAtropinePeak: dMax(R.a!.rows, R.c!.rows, 'hr', 1800, 1980), tAtropinePeakS: 0,
    hrAtropineLate: dMax(R.a!.rows, R.c!.rows, 'hr', 2100, 2400), hrGlycoPeak: dMax(R.g!.rows, R.c!.rows, 'hr', 1800, 2400), hrGlycoEarly: dMax(R.g!.rows, R.c!.rows, 'hr', 1800, 1920),
    tofrNeo15min: Math.round(mx(R.n!.rows, 'tofR', 2600, 2700) * 100) / 100, tofrCtl: Math.round(mx(R.c!.rows, 'tofR', 2600, 2700) * 100) / 100 }),
  expect: [{ m: 'hrNeoAlone', lo: -40, hi: -12, src: 'FU-4 S15 target from Miller ch. 24: neostigmine without an antimuscarinic HR −25 to −40 %' },
    { m: 'hrAtropinePeak', lo: 10, hi: 45, src: 'atropine 1 mg: HR +20–40, onset < 1 min — faster than neostigmine (tables §6.2; Miller ch. 24)' },
    { m: 'hrGlycoEarly', lo: 0, hi: 12, src: 'glycopyrrolate onset 2–3 min: matched to neostigmine, so no early tachycardia (tables §6.2)' }],
  owner: 'FU-4 G7 (vagal) + 7g', fu4: true });
add({ id: 'DI-52', tier: 'P1', ctx: 'X-A vent', state: 'deep block (PTC 1–2)', intv: 'sugammadex 4 mg/kg vs neostigmine 0.05 mg/kg at the same depth', sys: 'NEU',
  // resume fix: the first run reversed at PTC 0 (rocuronium 1.2 at +14 min), not at the label's 1–2 PTC; rocuronium 0.6 at
  // 60 s reaches PTC 2 at ≈ 1200 s on 3ff2fb0 (probe4), and the windows now run to 90 min so neostigmine can finish
  arms: { s: V([roc(60), d(1200, 'sugammadex', 4, 'mg/kg')], 1200 + 5400, XA, { dt: 5 }), n: V([roc(60), d(1200, 'neostigmine', 0.05, 'mg/kg')], 1200 + 5400, XA, { dt: 5 }), c: V([roc(60)], 1200 + 5400, XA, { dt: 5 }) },
  measure: (R) => m({ ptcBefore: Math.round(mx(R.c!.rows, 'ptc', 1180, 1200)), sgxMinutesToTofr09: Math.round((firstAt(R.s!.rows, 1200, (r) => (r.tofR as number) >= 0.9) / 60) * 100) / 100,
    neoMinutesToTofr09: Math.round((firstAt(R.n!.rows, 1200, (r) => (r.tofR as number) >= 0.9) / 60) * 100) / 100,
    ctlMinutesToTofr09: Math.round((firstAt(R.c!.rows, 1200, (r) => (r.tofR as number) >= 0.9) / 60) * 100) / 100 }),
  expect: [{ m: 'sgxMinutesToTofr09', lo: 2.1, hi: 4.3, invert: true, src: 'sugammadex 4 mg/kg at 1–2 PTC: TOFR 0.9 in 2.7 min (label; 7g gate 2.22)' },
    { m: 'neoMinutesToTofr09', lo: 15, hi: 90, src: 'neostigmine cannot reverse deep block: recovery stays long, its ceiling needs TOF ≥ 2 (Miller ch. 24 p. 716)' }],
  owner: '7f neostigmine.ts' });
add({ id: 'DI-29', tier: 'P2', ctx: 'X-A vent', state: 'after sugammadex 4 mg/kg', intv: 'rocuronium 0.6 mg/kg re-dose 5 min after sugammadex', sys: 'NEU PK',
  arms: { i: V([roc(60), d(900, 'sugammadex', 4, 'mg/kg'), roc(1200)], 3000), c: V([roc(1200)], 3000) },
  measure: (R) => m({ blockAfterRedose: Math.round(mn(R.i!.rows, 't1', 1200, 1500) * 100) / 100, blockFresh: Math.round(mn(R.c!.rows, 't1', 1200, 1500) * 100) / 100,
    onsetSredose: firstAt(R.i!.rows, 1200, (r) => (r.t1 as number) <= 0.05), onsetSfresh: firstAt(R.c!.rows, 1200, (r) => (r.t1 as number) <= 0.05) }),
  expect: [{ m: 'blockAfterRedose', dir: 1, tol: 0.05, src: 'free sugammadex binds the re-dose: resistance for hours after 4 mg/kg (Naguib; Miller ch. 24 pp. 728–731)' }],
  owner: '7g nmb.ts binding' });
add({ id: 'DI-45', tier: 'P2', ctx: 'X-A vent', state: 'GA', intv: 'sugammadex 16 mg/kg (rare marked bradycardia / anaphylaxis)', sys: 'RHY',
  arms: { i: V([roc(T, 1.2), d(T + 180, 'sugammadex', 16, 'mg/kg')], T + 900), c: V([roc(T, 1.2)], T + 900) },
  measure: (R) => m({ hrDown: dMin(R.i!.rows, R.c!.rows, 'hr', T + 180, T + 480), mapPct: pctMin(R.i!.rows, R.c!.rows, 'map', T + 180, T + 480),
    minutesToT1_10: Math.round((firstAt(R.i!.rows, T + 180, (r) => (r.t1 as number) >= 0.1) / 60) * 100) / 100 }),
  expect: [{ m: 'minutesToT1_10', lo: 0.6, hi: 2.0, invert: true, src: 'sugammadex 16 mg/kg 3 min after rocuronium 1.2: T1 10 % in 1.2 min (label; 7g gate 1.80)' },
    { m: 'hrDown', lo: -30, hi: -5, src: 'marked bradycardia is a recognised (rare) sugammadex reaction — the MISSING mechanism is the point of the cell (Miller ch. 24; MHRA)' }],
  owner: 'FU-7 (no sugammadex cardiac/anaphylaxis hazard)', hand: { verdict: 'MI', why: 'the sugammadex row has pd: [] (rows-cardiovascular.ts:18): no bradycardia or anaphylaxis path exists — a missing mechanism, not an opposite sign' } });

// ---- succinylcholine hazards ----------------------------------------------------------------------------------------
add({ id: 'DI-37a', tier: 'P1', ctx: 'X-A vent, burns severity 1 (profile blood.burns)', state: 'burns > 48 h', intv: 'succinylcholine 1.5 mg/kg', sys: 'BLD RHY CIRC',
  arms: { i: V([d(T, 'succinylcholine', 1.5, 'mg/kg')], T + 900, { blood: { burns: 1 } }), c: V([], T + 900, { blood: { burns: 1 } }), ri: V([d(T, 'succinylcholine', 1.5, 'mg/kg')]), rc: V([]) },
  measure: (R) => m({ kPeakBurns: mx(R.i!.rows, 'k', T, T + 600), dkBurns: Math.round((mx(R.i!.rows, 'k', T, T + 600) - mn(R.c!.rows, 'k', T - 60, T)) * 100) / 100,
    dkNormal: Math.round((mx(R.ri!.rows, 'k', T, T + 600) - mn(R.rc!.rows, 'k', T - 60, T)) * 100) / 100,
    qrsPeak: mx(R.i!.rows, 'qrs', T, T + 600), arrest: arrestIn(R.i!.rows, T, T + 900), rhythmChange: (R.i!.rhythms.length > 1) }),
  expect: [{ m: 'dkBurns', lo: 3, hi: 7, src: 'Miller ch. 24: succinylcholine after burns/denervation raises K 3–7 mmol/L' },
    { m: 'dkNormal', lo: 0.3, hi: 0.8, src: 'normal patient +0.5 mmol/L (tables §5b.2)' },
    { m: 'arrest', event: true, src: 'FU-4 prototype: burns + sux → VF at +3.7 min, prevented by calcium (9th-cap ruling; Miller: hyperkalaemic arrest)' }],
  owner: 'FU-4 G3 (potassium)', fu4: true });
add({ id: 'DI-37b', tier: 'P1', ctx: 'X-A vent, burns 1', state: 'burns > 48 h', intv: 'succinylcholine 1.5 mg/kg then calcium chloride 1 g at the ECG change', sys: 'BLD RHY',
  arms: { i: V([d(T, 'succinylcholine', 1.5, 'mg/kg'), d(T + 120, 'calciumChloride', 1, 'g')], T + 900, { blood: { burns: 1 } }), c: V([d(T, 'succinylcholine', 1.5, 'mg/kg')], T + 900, { blood: { burns: 1 } }) },
  measure: (R) => m({ kPeakWithCa: mx(R.i!.rows, 'k', T, T + 600), kEcgWithCa: mx(R.i!.rows, 'kEcg', T, T + 600), kEcgNoCa: mx(R.c!.rows, 'kEcg', T, T + 600),
    qrsWithCa: mx(R.i!.rows, 'qrs', T, T + 600), qrsNoCa: mx(R.c!.rows, 'qrs', T, T + 600), iCaPeak: mx(R.i!.rows, 'iCa', T, T + 600),
    arrestWithCa: arrestIn(R.i!.rows, T, T + 900), arrestNoCa: arrestIn(R.c!.rows, T, T + 900) }),
  expect: [{ m: 'qrsWithCa', lo: 80, hi: 110, src: 'calcium narrows the QRS within 1–3 min without lowering K (UK Renal Association; 7c gate: QRS 93 → 126 → 93)' },
    { m: 'arrestWithCa', event: false, src: 'calcium prevents the hyperkalaemic arrest (FU-4 prototype)' }],
  owner: '7c treatments.ts', fu4: true });
add({ id: 'DI-37c', tier: 'P1', ctx: 'X-A vent, nm profile denervation', state: 'denervation (upregulated receptors)', intv: 'succinylcholine 1.5 mg/kg', sys: 'BLD NEU',
  arms: { i: V([[1, A.neuroProfile({ nm: 'denervation' }), 'nm denervation'], d(T, 'succinylcholine', 1.5, 'mg/kg')], T + 900), c: V([[1, A.neuroProfile({ nm: 'denervation' }), 'nm denervation']], T + 900) },
  measure: (R) => m({ dk: Math.round((mx(R.i!.rows, 'k', T, T + 600) - mn(R.c!.rows, 'k', T - 60, T)) * 100) / 100, kPeak: mx(R.i!.rows, 'k', T, T + 600),
    t1Min: Math.round(mn(R.i!.rows, 't1', T, T + 600) * 100) / 100, arrest: arrestIn(R.i!.rows, T, T + 900) }),
  expect: [{ m: 'dk', lo: 3, hi: 7, src: 'Miller ch. 24: denervation/immobilisation gives the same K surge as burns' }],
  owner: '7c (burns severity is the only K path; the 7f nm profile does not reach it)', hand: { verdict: 'IN', why: 'two commands for one disease disagree: neuroProfile nm "burn"/"denervation" (7f, neuro/pipeline.ts:118) changes the NMB response but not the succinylcholine K⁺ rise, which only profile blood.burns (7c) drives' } });
add({ id: 'DI-37d', tier: 'P1', ctx: 'X-A vent, CKD proxy: profile K 5.5 + aki', state: 'renal failure, K 5.5', intv: 'succinylcholine 1.5 mg/kg', sys: 'BLD RHY',
  arms: { i: V([d(T, 'succinylcholine', 1.5, 'mg/kg')], T + 900, { blood: { k: 5.5 }, conditions: [{ id: 'aki' }] }), c: V([], T + 900, { blood: { k: 5.5 }, conditions: [{ id: 'aki' }] }) },
  measure: (R) => m({ kPeak: mx(R.i!.rows, 'k', T, T + 600), dk: Math.round((mx(R.i!.rows, 'k', T, T + 600) - mn(R.c!.rows, 'k', T - 60, T)) * 100) / 100, qrsPeak: mx(R.i!.rows, 'qrs', T, T + 600), arrest: arrestIn(R.i!.rows, T, T + 900) }),
  expect: [{ m: 'dk', lo: 0.3, hi: 0.9, src: 'Miller ch. 24: stable renal failure has the NORMAL +0.5 response (the hazard is the starting K, not a bigger rise)' },
    { m: 'kPeak', lo: 5.8, hi: 6.6, src: 'starting K 5.5 + 0.5 (tables §1.5 CKD row)' }],
  owner: '7c' });
add({ id: 'DI-53', tier: 'P2', ctx: 'X-A vent, homozygous atypical cholinesterase', state: 'pseudocholinesterase deficiency', intv: 'succinylcholine 1 mg/kg', sys: 'NEU PK',
  // resume fix: the phenotype is a patient-profile field (`neuro.cholinesterase`, set at creation); the event form is rejected
  arms: { i: V([d(T, 'succinylcholine', 1, 'mg/kg')], T + 3000, { neuro: { cholinesterase: 'homozygous' } }, { dt: 10 }), h: V([d(T, 'succinylcholine', 1, 'mg/kg')], T + 3000, { neuro: { cholinesterase: 'heterozygous' } }, { dt: 10 }), c: V([d(T, 'succinylcholine', 1, 'mg/kg')], T + 3000, XA, { dt: 10 }) },
  measure: (R) => m({ normalMin: Math.round(((firstAt(R.c!.rows, T + 120, (r) => (r.t1 as number) >= 0.25) + 120) / 60) * 10) / 10,
    hetMin: Math.round(((firstAt(R.h!.rows, T + 120, (r) => (r.t1 as number) >= 0.25) + 120) / 60) * 10) / 10,
    homBlockAt45min: Math.round(mn(R.i!.rows, 't1', T + 2400, T + 2700) * 100) / 100 }),
  expect: [{ m: 'normalMin', lo: 5, hi: 12, src: 'succinylcholine 1 mg/kg: T1 25 % at 7–10 min (label; 7g gate 7.2)' },
    { m: 'hetMin', lo: 10, hi: 25, src: 'heterozygous: ×1.5–2 (Miller ch. 24; 7g gate ×1.67)' },
    { m: 'homBlockAt45min', lo: 0, hi: 0.1, src: 'homozygous: block lasts hours (7g gate 310 min)' }],
  owner: '7g PCHE_CL_MULT' });

// ---- volatile-specific interactions ---------------------------------------------------------------------------------
add({ id: 'DI-19', tier: 'P2', ctx: 'X-A vent', state: 'GA induction with a volatile', intv: 'sevoflurane 2 % with 66 % N2O vs without (second-gas effect)', sys: 'PK NEU',
  arms: { i: V([vap(60, 'sevoflurane', 2, 4, 0.66)], 1800, XA, { dt: 10 }), c: V([vap(60, 'sevoflurane', 2, 4, 0)], 1800, XA, { dt: 10 }) },
  measure: (R) => m({ faFi5min_n2o: Math.round(mx(R.i!.rows, 'faFi', 350, 370) * 1000) / 1000, faFi5min_air: Math.round(mx(R.c!.rows, 'faFi', 350, 370) * 1000) / 1000,
    macBrain10min_n2o: Math.round(mx(R.i!.rows, 'macBrain', 650, 670) * 100) / 100, macBrain10min_air: Math.round(mx(R.c!.rows, 'macBrain', 650, 670) * 100) / 100,
    faN2o10min: mx(R.i!.rows, 'faN2o', 650, 670), secondGasDelta: Math.round((mx(R.i!.rows, 'faFi', 350, 370) - mx(R.c!.rows, 'faFi', 350, 370)) * 1000) / 1000 }),
  expect: [{ m: 'secondGasDelta', dir: 1, tol: 0.01, src: 'concentration/second-gas effect: N2O uptake speeds the volatile FA/FI rise (Miller ch. 19 uptake and distribution)' },
    { m: 'macBrain10min_n2o', lo: 1, hi: 1.6, src: 'sevo 2 % ≈ 0.8 MAC + 66 % N2O ≈ 0.63 MAC: total > 1 MAC (tables §6.3; MAC N2O 104 %)' }],
  owner: '7g volatile.ts (no shared alveolar uptake between agents)', hand: { verdict: 'MI', why: 'the two agents step independently (pipeline.ts:357–358, volatile.ts): no concentrating or second-gas term exists; the N2O MAC adds correctly (macBrain 1.1 vs 0.7)' } });
add({ id: 'DI-18', tier: 'P2', ctx: 'X-A vent, sevoflurane 1 MAC', state: 'GA volatile', intv: 'adrenaline 100 µg (arrhythmia threshold under a modern volatile)', sys: 'RHY CIRC',
  arms: { i: V([vap(60, 'sevoflurane', 2.5, 4), d(1200, 'epinephrine', 100, 'mcg')], 1800), c: V([vap(60, 'sevoflurane', 2.5, 4)], 1800) },
  measure: (R) => m({ mapRise: dMax(R.i!.rows, R.c!.rows, 'map', 1200, 1500), hrRise: dMax(R.i!.rows, R.c!.rows, 'hr', 1200, 1500), ectopy: (R.i!.rhythms.length > 1), rhythms: R.i!.rhythms.map(([t, id]) => `${t}s ${id}`).join(',') || 'sinus only' }),
  expect: [{ m: 'ectopy', event: false, src: 'sevoflurane does not sensitise to catecholamines the way halothane did: no arrhythmia at 100 µg (Miller ch. 20; Navarro 1994 sevo threshold > 5 µg/kg s.c.)' },
    { m: 'mapRise', lo: 10, hi: 60, src: 'adrenaline 100 µg IV pressor response (tables §6.2 push-dose 10–20 µg)' }],
  owner: '7g (no catecholamine–volatile arrhythmia hazard: correct for sevoflurane, missing for halothane)' });
add({ id: 'DI-20', tier: 'P2', ctx: 'X-A vent, simple pneumothorax', state: 'closed gas space', intv: 'N2O 66 %', sys: 'LUNG', arms: {}, expect: [],
  owner: 'FU-7 (N2O gas-space expansion)', ne: 'MI: N2O does not diffuse into closed gas spaces; `lungCondition ptxSimple` volume is not a gas compartment (research/11 §2.5)' });

// ---- magnesium and calcium × NMB / rhythm ---------------------------------------------------------------------------
add({ id: 'DI-25', tier: 'P2', ctx: 'X-A vent, Mg loaded (profile 2.5 mmol/L)', state: 'therapeutic hypermagnesaemia', intv: 'rocuronium 0.6 mg/kg; calcium chloride 1 g', sys: 'NEU CIRC BLD',
  arms: { i: V([[1, A.neuroProfile({ mgMmolL: 2.5 }), 'Mg 2.5 mmol/L'], roc(T)], T + 3000, XA, { dt: 10 }), c: V([roc(T)], T + 3000, XA, { dt: 10 }),
    ca: V([[1, A.neuroProfile({ mgMmolL: 2.5 }), 'Mg 2.5'], roc(T), d(T + 600, 'calciumChloride', 1, 'g')], T + 3000, XA, { dt: 10 }) },
  // resume fix: search after the onset (T + 300); the first run found T1 = 1 at the dose instant
  measure: (R) => { const rec = (x: { rows: Row[] }) => firstAt(x.rows, T + 300, (r) => (r.t1 as number) >= 0.25) + 300;
    return m({ t25_mg: Math.round((rec(R.i!) / 60) * 10) / 10, t25_normal: Math.round((rec(R.c!) / 60) * 10) / 10, prolongPct: Math.round(((100 * (rec(R.i!) - rec(R.c!))) / rec(R.c!)) * 10) / 10,
      t25_mgThenCa: Math.round((rec(R.ca!) / 60) * 10) / 10, caShortensMin: Math.round(((rec(R.ca!) - rec(R.i!)) / 60) * 10) / 10 }); },
  expect: [{ m: 'prolongPct', lo: 20, hi: 90, src: 'magnesium potentiates non-depolarisers: vecuronium ED50 −25 % after 40 mg/kg (Miller ch. 24 p. 698)' },
    { m: 'caShortensMin', dir: -1, tol: 0.5, src: 'calcium antagonises the magnesium potentiation (Miller ch. 24) — the Mg + Ca arm minus the Mg arm' }],
  owner: '7f interactions.ts (calcium has no NMB path)', hand: { verdict: 'MI', why: 'the magnesium potentiation is right (+39 %); calcium has no NMB term — 7f ec50Multipliers (neuro/interactions.ts:23–45) reads profile Mg, volatile MAC, temperature and nm profile only' } });
add({ id: 'DI-54', tier: 'P2', ctx: 'X-A vent, torsades', state: 'torsades de pointes', intv: 'magnesium 2 g over 2 min', sys: 'RHY CIRC',
  arms: { i: V([[T, A.rhythm('torsades'), 'torsades'], d(T + 60, 'magnesium', 2, 'g', { overS: 120 })], T + 600), c: V([[T, A.rhythm('torsades'), 'torsades']], T + 600) },
  measure: (R) => m({ mgPeak: mx(R.i!.rows, 'mg', T, T + 600), rhythmsI: R.i!.rhythms.map(([t, id]) => `${t}s ${id}`).join(','), rhythmsC: R.c!.rhythms.map(([t, id]) => `${t}s ${id}`).join(','),
    convertedS: (() => { const s = R.i!.rhythms.find(([t, id]) => t > T + 60 && (id === 'sinus' || id === 'sinusTachy')); return s ? s[0] - (T + 60) : NaN; })(), mapEnd: mn(R.i!.rows, 'map', T + 480, T + 600) }),
  expect: [{ m: 'convertedS', lo: 5, hi: 300, src: 'magnesium 2 g terminates torsades within minutes (ALS; tables §6.2)' }],
  owner: '7g hooks.ts' });
