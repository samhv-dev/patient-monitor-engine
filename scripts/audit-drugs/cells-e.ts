// DI group E — drug disposition: TCI and infusions with flow-dependent PK, onset/offset per class against the textbook,
// context-sensitive half-times, antagonists, and the placeholder rows (matrix DI-06 companion cells plus the brief's
// "TCI/infusions with CO-dependent PK", "timing/onset/offset per class", "tachyphylaxis", "context-sensitive
// half-times", "tranexamic acid, heparin/protamine, oxytocin" items).
import { A } from './runner.ts';
import { add, apnoeic, anyR, CL3, d, dMax, dMin, hemo, inf, m, mn, mx, pctMin, SP, T, TB, V, vap, XA } from './spec.ts';
import type { Row } from './runner.ts';

const firstAt = (rows: Row[], t0: number, f: (r: Row) => boolean): number => { for (const r of rows) if ((r.t as number) >= t0 && f(r)) return (r.t as number) - t0; return NaN; };
const peakOf = (rows: Row[], k: string, t0: number, t1: number) => { let b = { v: -Infinity, t: NaN as number }; for (const r of rows) { const t = r.t as number; if (t > t0 && t <= t1 && Number.isFinite(r[k] as number) && (r[k] as number) > b.v) b = { v: r[k] as number, t }; } return b; };

// ---- flow-dependent PK (haemorrhage, low output) ----------------------------------------------------------------------
add({ id: 'DI-66', tier: 'P1', ctx: 'X-A vent, class III bleed vs normovolaemia', state: 'class III haemorrhage (CO ≈ 3 L/min)', intv: 'propofol 2 mg/kg: peak Ce and MAP fall vs the same dose at normal CO', sys: 'PK CIRC',
  arms: { i: V([...CL3, d(TB, 'propofol', 2, 'mg/kg')], 2100), c: V(CL3, 2100), ri: V([d(TB, 'propofol', 2, 'mg/kg')], 2100), rc: V([], 2100) },
  measure: (R) => m({ coBleed: Math.round(mn(R.c!.rows, 'co', TB - 60, TB) * 100) / 100, coNormal: Math.round(mn(R.rc!.rows, 'co', TB - 60, TB) * 100) / 100,
    cePeakBleed: Math.round(mx(R.i!.rows, 'c_propofol', TB, TB + 600) * 100) / 100, cePeakNormal: Math.round(mx(R.ri!.rows, 'c_propofol', TB, TB + 600) * 100) / 100,
    ceRatio: Math.round((mx(R.i!.rows, 'c_propofol', TB, TB + 600) / mx(R.ri!.rows, 'c_propofol', TB, TB + 600)) * 100) / 100,
    mapPctBleed: pctMin(R.i!.rows, R.c!.rows, 'map', TB, TB + 600), mapPctNormal: pctMin(R.ri!.rows, R.rc!.rows, 'map', TB, TB + 600),
    diMinBleed: mn(R.i!.rows, 'di', TB, TB + 600), diMinNormal: mn(R.ri!.rows, 'di', TB, TB + 600) }),
  expect: [{ m: 'ceRatio', lo: 1.3, hi: 2.2, src: 'Kazama 2002 / Johnson 2003: a low cardiac output raises the propofol peak Ce ≥ 1.3× (FU-4 Task 14 target: S6b ratio ≥ 1.3)' },
    { m: 'mapPctBleed', dir: -1, tol: 15, src: 'the same dose must hurt more in hypovolaemia (R53; INTUBE)' }],
  owner: 'FU-4 G10 (flow-dependent distribution)', fu4: true });
add({ id: 'DI-67', tier: 'P1', ctx: 'X-A vent', state: 'GA, TCI', intv: 'propofol TCI Ce 3 µg/mL (Eleveld) — time to target and overshoot', sys: 'PK NEU',
  arms: { i: V([[60, A.tci('propofol', 3, 'effect', 'eleveld'), 'TCI Ce 3 (Eleveld)']], 1800, XA, { dt: 5 }), c: V([], 1800, XA, { dt: 5 }) },
  measure: (R) => m({ tTo95pctS: firstAt(R.i!.rows, 60, (r) => (r.c_propofol as number) >= 2.85), cePeak: Math.round(mx(R.i!.rows, 'c_propofol', 60, 1800) * 1000) / 1000,
    ceAt25min: Math.round(mn(R.i!.rows, 'c_propofol', 1500, 1560) * 1000) / 1000, diAt25min: mn(R.i!.rows, 'di', 1500, 1800), mapPct: pctMin(R.i!.rows, R.c!.rows, 'map', 60, 1800) }),
  expect: [{ m: 'tTo95pctS', lo: 100, hi: 200, invert: true, src: '7g gate: TCI Eleveld Ce 3 reaches 95 % at 2.35 min (band 2.1–2.6 min)' },
    { m: 'cePeak', lo: 2.99, hi: 3.01, src: 'an effect-site TCI must not overshoot the target (7g gate: max Ce 3.0005)' },
    { m: 'diAt25min', lo: 35, hi: 60, src: 'depth index 40–60 at propofol Ce 3 (7f depth; BIS convention)' }],
  owner: '7g tci.ts' });
add({ id: 'DI-68', tier: 'P2', ctx: 'X-A vent', state: 'GA maintenance', intv: 'remifentanil 0.25 µg/kg/min for 60 min: offset (context-insensitive) vs fentanyl 250 µg bolus', sys: 'PK NEU',
  arms: { r: V([inf(60, 'remifentanil', 0.25, 'mcg/kg/min'), [3660, A.infusion('remifentanil', 0, 'mcg/kg/min'), 'stop remifentanil']], 4800, XA, { dt: 10 }),
    f: V([d(60, 'fentanyl', 250, 'mcg')], 4800, XA, { dt: 10 }) },
  measure: (R) => m({ remiCeSteady: Math.round(mx(R.r!.rows, 'c_remifentanil', 3500, 3660) * 100) / 100,
    remiHalfMin: Math.round((firstAt(R.r!.rows, 3660, (r) => (r.c_remifentanil as number) <= 0.5 * mx(R.r!.rows, 'c_remifentanil', 3500, 3660)) / 60) * 10) / 10,
    fentPeak: Math.round(mx(R.f!.rows, 'c_fentanyl', 60, 900) * 100) / 100,
    fentHalfMin: Math.round((firstAt(R.f!.rows, 300, (r) => (r.c_fentanyl as number) <= 0.5 * mx(R.f!.rows, 'c_fentanyl', 60, 900)) / 60) * 10) / 10 }),
  expect: [{ m: 'remiHalfMin', lo: 1.5, hi: 5, src: 'remifentanil 50 % decrement 2–4 min whatever the context (Kapila 1995; 7g gate CSHT 2.1 min flat)' },
    { m: 'fentHalfMin', lo: 10, hi: 90, src: 'fentanyl context-sensitive half-time 17.8 min at 1 h and rises steeply (Miller ch. 22 p. 588; 7g gate)' }],
  owner: '7g csht.ts' });
add({ id: 'DI-69', tier: 'P1', ctx: 'X-A vent', state: 'GA', intv: 'onset/offset of each induction agent (time to the MAP nadir and to recovery)', sys: 'PK CIRC NEU',
  arms: { p: V([d(T, 'propofol', 2, 'mg/kg')], T + 1200), t: V([d(T, 'thiopental', 4, 'mg/kg')], T + 1200), e: V([d(T, 'etomidate', 0.3, 'mg/kg')], T + 1200), k: V([d(T, 'ketamine', 1.5, 'mg/kg')], T + 1200), c: V([], T + 1200) },
  measure: (R) => m({ propLocS: firstAt(R.p!.rows, T, (r) => r.conscious === false), thioLocS: firstAt(R.t!.rows, T, (r) => r.conscious === false), etomLocS: firstAt(R.e!.rows, T, (r) => r.conscious === false), ketLocS: firstAt(R.k!.rows, T, (r) => r.conscious === false),
    propEmergenceS: firstAt(R.p!.rows, T + 60, (r) => r.conscious === true), thioEmergenceS: firstAt(R.t!.rows, T + 60, (r) => r.conscious === true), etomEmergenceS: firstAt(R.e!.rows, T + 60, (r) => r.conscious === true), ketEmergenceS: firstAt(R.k!.rows, T + 60, (r) => r.conscious === true),
    mapPctThio: pctMin(R.t!.rows, R.c!.rows, 'map', T, T + 600), mapPctEtom: pctMin(R.e!.rows, R.c!.rows, 'map', T, T + 600), mapPctKet: pctMin(R.k!.rows, R.c!.rows, 'map', T, T + 600), hrKet: dMax(R.k!.rows, R.c!.rows, 'hr', T, T + 600) }),
  expect: [{ m: 'propLocS', lo: 20, hi: 120, invert: true, src: 'propofol TTPE 90–100 s, loss of consciousness in one arm–brain circulation (Miller ch. 21 p. 515)' },
    { m: 'thioEmergenceS', lo: 240, hi: 900, src: 'thiopental: awakening 5–10 min by redistribution (Miller ch. 21 Table 21.1)' },
    { m: 'etomEmergenceS', lo: 150, hi: 600, src: 'etomidate: duration 3–5 min after 0.3 mg/kg (Miller ch. 21 p. 541)' },
    { m: 'mapPctThio', lo: -35, hi: -12, src: 'tables §6.3: thiopental SVR −20 %, Ees −15 %' },
    { m: 'hrKet', lo: 8, hi: 35, src: 'tables §6.3: ketamine HR +15–20 %' }],
  owner: '7f depth.ts (+7g gamma shapes)', hand: { verdict: 'MI', why: 'thiopental and etomidate never produce unconsciousness: 7f depth() reads only propofol, volatile, midazolam and ketamine (neuro/depth.ts:71, :80), although 7g publishes both in uHyp (combine.ts:88); ketamine LOC at 5 s is too fast (gamma shape)' } });
add({ id: 'DI-70', tier: 'P2', ctx: 'X-A vent', state: 'GA volatile', intv: 'desflurane step 3 % → 12 % (sympathetic surge) vs sevoflurane step', sys: 'CIRC PK',
  arms: { i: V([vap(60, 'desflurane', 3, 4), vap(900, 'desflurane', 12, 4)], 1800), s: V([vap(60, 'sevoflurane', 1, 4), vap(900, 'sevoflurane', 4, 4)], 1800), c: V([vap(60, 'desflurane', 3, 4)], 1800) },
  measure: (R) => m({ macBeforeDes: Math.round(mx(R.c!.rows, 'macBrain', 840, 900) * 100) / 100, macAfterDes: Math.round(mx(R.i!.rows, 'macBrain', 1100, 1200) * 100) / 100,
    hrSurgeDes: dMax(R.i!.rows, R.c!.rows, 'hr', 900, 1500), mapSurgeDes: dMax(R.i!.rows, R.c!.rows, 'map', 900, 1500),
    hrSevoStep: dMax(R.s!.rows, R.c!.rows, 'hr', 900, 1500), mapPctSevoStep: pctMin(R.s!.rows, R.c!.rows, 'map', 900, 1500) }),
  expect: [{ m: 'hrSurgeDes', lo: 8, hi: 35, src: 'tables §6.3: a rapid desflurane rise above 1 MAC gives HR +20–30 %, MAP +20 % for 2–4 min' },
    { m: 'mapPctSevoStep', dir: -1, tol: 2, src: 'a sevoflurane step deepens the hypotension instead (tables §6.3 Malan 1995)' }],
  owner: '7g pipeline.ts desSurge' });
add({ id: 'DI-71', tier: 'P1', ctx: 'X-A spontaneous', state: 'opioid overdose (fentanyl 5 µg/kg, air)', intv: 'naloxone 0.4 mg', sys: 'LUNG NEU PK',
  arms: { i: SP([d(T, 'fentanyl', 5, 'mcg/kg'), d(T + 300, 'naloxone', 0.4, 'mg')], T + 1800), c: SP([d(T, 'fentanyl', 5, 'mcg/kg')], T + 1800) },
  measure: (R) => m({ apnoeaSecondsNoNaloxone: R.c!.rows.filter((r) => (r.t as number) > T && apnoeic(r)).length * 5,
    apnoeaSecondsNaloxone: R.i!.rows.filter((r) => (r.t as number) > T && apnoeic(r)).length * 5,
    spo2MinNoNaloxone: mn(R.c!.rows, 'spo2', T, T + 1800), spo2MinNaloxone: mn(R.i!.rows, 'spo2', T, T + 1800),
    veRecoveryPct: Math.round(((100 * (mx(R.i!.rows, 'veSp', T + 300, T + 900) - mx(R.c!.rows, 'veSp', T + 300, T + 900))) / Math.max(0.1, mx(R.c!.rows, 'veSp', T + 300, T + 900))) * 10) / 10,
    reversalS: firstAt(R.i!.rows, T + 300, (r) => (r.drvOp as number) < 0.5 * mx(R.c!.rows, 'drvOp', T + 300, T + 600)) }),
  expect: [{ m: 'veRecoveryPct', dir: 1, tol: 5, src: 'naloxone 0.4 mg reverses opioid ventilatory depression in 1–2 min (label; 7g gate: antagonist.opioid ≥ 1.4)' },
    { m: 'reversalS', lo: 30, hi: 180, invert: true, src: 'naloxone IV onset 1–2 min (label; Miller ch. 22)' }],
  owner: '7g antagonists / 7f drive' });
add({ id: 'DI-72', tier: 'P2', ctx: 'X-A spontaneous', state: 'benzodiazepine oversedation (midazolam 0.15 mg/kg)', intv: 'flumazenil 0.2 mg ×2', sys: 'NEU LUNG',
  arms: { i: SP([d(T, 'midazolam', 0.15, 'mg/kg'), d(T + 420, 'flumazenil', 0.2, 'mg'), d(T + 480, 'flumazenil', 0.2, 'mg')], T + 1800), c: SP([d(T, 'midazolam', 0.15, 'mg/kg')], T + 1800) },
  measure: (R) => m({ diMinNoFlum: mn(R.c!.rows, 'di', T, T + 1800), diAfterFlum: mx(R.i!.rows, 'di', T + 420, T + 1200), diDelta: Math.round(mx(R.i!.rows, 'di', T + 420, T + 1200) - mx(R.c!.rows, 'di', T + 420, T + 1200)),
    conscRecoveredS: firstAt(R.i!.rows, T + 420, (r) => r.conscious === true), spo2Min: mn(R.i!.rows, 'spo2', T, T + 1800) }),
  expect: [{ m: 'diDelta', dir: 1, tol: 2, src: 'flumazenil reverses benzodiazepine sedation within 1–2 min (label; 7g decision 6 competitive antagonism)' },
    { m: 'conscRecoveredS', lo: 30, hi: 180, invert: true, src: 'flumazenil onset 1–2 min (label)' }],
  owner: '7g antagonists' });
add({ id: 'DI-73', tier: 'P2', ctx: 'X-A vent, class III bleed', state: 'haemorrhage', intv: 'tranexamic acid 1 g (placeholder row)', sys: 'COAG PK',
  arms: { i: V([...CL3, d(TB, 'tranexamicAcid', 1, 'g')], 2100), c: V(CL3, 2100) },
  measure: (R) => m({ txaCe: Math.round(mx(R.i!.rows, 'c_tranexamicAcid', TB, 2100) * 100) / 100, hbDelta: Math.round((mn(R.i!.rows, 'hb', TB, 2100) - mn(R.c!.rows, 'hb', TB, 2100)) * 100) / 100,
    mapDelta: dMax(R.i!.rows, R.c!.rows, 'map', TB, 2100), bvRelDelta: Math.round((mx(R.i!.rows, 'bvRel', TB, 2100) - mx(R.c!.rows, 'bvRel', TB, 2100)) * 1000) / 1000 }),
  expect: [{ m: 'txaCe', dir: 1, tol: 0, src: 'the row exists and takes a dose (7g library), but has no PD: CRASH-2 mortality benefit works through bleeding, which needs 7i coagulation' },
    { m: 'hbDelta', quiet: true, tol: 0.05, src: 'no effect is expected on today\'s main — the cell records the missing mechanism (R58 / 7i)' }],
  owner: '7i (coagulation and fibrinolysis)' });
add({ id: 'DI-74', tier: 'P2', ctx: 'X-A vent', state: 'anticoagulation / reversal', intv: 'heparin, protamine (absent)', sys: 'COAG', arms: {}, expect: [],
  owner: '7i (R58)', ne: 'no heparin or protamine row in the library (research/11 §2.13 "absent"); no coagulation state to act on' });
add({ id: 'DI-75', tier: 'P2', ctx: 'obstetric', state: 'postpartum atony', intv: 'oxytocin / carbetocin / ergometrine / carboprost (absent)', sys: 'OBS CIRC', arms: {}, expect: [],
  owner: '7j (R59)', ne: 'no uterotonic in the library and no uterus/fetus model (research/11 §2.13, §5.15)' });
add({ id: 'DI-76', tier: 'P2', ctx: 'X-A vent', state: 'GA', intv: 'dexamethasone 8 mg and ondansetron 4 mg (placeholder rows: quiet checks)', sys: 'END RHY',
  arms: { i: V([d(T, 'dexamethasone', 8, 'mg'), d(T, 'ondansetron', 4, 'mg')], T + 1800, XA, { dt: 10 }), c: V([], T + 1800, XA, { dt: 10 }) },
  measure: (R) => m({ gluDelta: Math.round(mx(R.i!.rows, 'glu', T, T + 1800) - mx(R.c!.rows, 'glu', T, T + 1800)), mapDelta: dMax(R.i!.rows, R.c!.rows, 'map', T, T + 1800), hrDelta: dMax(R.i!.rows, R.c!.rows, 'hr', T, T + 1800) }),
  expect: [{ m: 'gluDelta', lo: 10, hi: 60, src: 'dexamethasone 8 mg raises glucose ≈ 1–2 mmol/L over an hour (Miller ch. 47; Hans 2006) — the row is declared "no monitor effect in v1"' },
    { m: 'hrDelta', quiet: true, tol: 3, src: 'ondansetron: no HR effect expected; its QTc prolongation is not modelled (row comment)' }],
  owner: '7e (glucose) / FU-7 (QTc)', hand: { verdict: 'MI', why: 'the dexamethasone row is a declared placeholder (rows-other.ts:66, pd: []): the glucose rise is missing, not reversed' } });
add({ id: 'DI-77', tier: 'P1', ctx: 'X-A vent', state: 'GA maintenance, sevoflurane + remifentanil', intv: 'MAC reduction by an opioid (macEff vs macBrain) and the depth interaction', sys: 'NEU PK',
  arms: { i: V([vap(60, 'sevoflurane', 2, 4), inf(900, 'remifentanil', 0.15, 'mcg/kg/min')], 2400, XA, { dt: 10 }), c: V([vap(60, 'sevoflurane', 2, 4)], 2400, XA, { dt: 10 }) },
  measure: (R) => m({ macBrainBefore: Math.round(mx(R.c!.rows, 'macBrain', 840, 900) * 100) / 100, macEffBefore: Math.round(mx(R.c!.rows, 'macEff', 840, 900) * 100) / 100,
    macBrainAfter: Math.round(mx(R.i!.rows, 'macBrain', 2100, 2400) * 100) / 100, macEffAfter: Math.round(mn(R.i!.rows, 'macEff', 2100, 2400) * 100) / 100,
    macEffRise: Math.round((mn(R.i!.rows, 'macEff', 2100, 2400) - mx(R.c!.rows, 'macEff', 2100, 2400)) * 100) / 100,
    macReduction: Math.round((1 - mx(R.i!.rows, 'macBrain', 2100, 2400) / mn(R.i!.rows, 'macEff', 2100, 2400)) * 100) / 100,
    diWithOpioid: mn(R.i!.rows, 'di', 2100, 2400), diWithout: mn(R.c!.rows, 'di', 2100, 2400), mapPct: pctMin(R.i!.rows, R.c!.rows, 'map', 900, 2400) }),
  // macEff is the opioid-adjusted MAC-equivalent DELIVERED (macBrain / (1 − reduction), neuro/depth.ts:68): it RISES with an
  // opioid. The first run graded a fall (a spec error, corrected on resume); the graded quantity is the MAC reduction itself.
  expect: [{ m: 'macReduction', lo: 0.4, hi: 0.7, src: 'remifentanil 0.15 µg/kg/min (Ce ≈ 3.5–4 ng/mL) reduces sevoflurane MAC ≈ 50–60 % (Lang 1996: 1.37 ng/mL halves isoflurane MAC; tables §5d)' },
    { m: 'mapPct', dir: -1, tol: 3, src: 'adding an opioid to a volatile lowers MAP further (tables §6.3)' }],
  owner: '7f depth.ts / 7g' });
