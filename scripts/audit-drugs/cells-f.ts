// DI group F — added on resume (2026-09-28, after the weekly-cap kill): the brief's items groups A–E left thin.
// Induction agents in sepsis / β-blockade / hypovolaemia / AS (the grid's missing rows), inotropes × β-blockade × sepsis,
// TCI in low output, true context-sensitive decrements after 1 h and 3 h infusions, volatile emergence, opioid and
// benzodiazepine onset (time to peak effect), rocuronium dose–onset, and the MANUAL subset research/12 §2.2 requires
// for P1 haemodynamic cells (graded direction-only: Ali's Q9 on MANUAL physiology is open).
import { A, type Row } from './runner.ts';
import { add, apnoeic, anyR, arrestIn, ASx, BB, CL3, d, dMax, dMin, HF, hemo, inf, m, mn, mx, pctMax, pctMin, pctWin, SEPW, SP, T, TB, TS, V, vap, XA, type Expect } from './spec.ts';

const firstAt = (rows: Row[], t0: number, f: (r: Row) => boolean): number => { for (const r of rows) if ((r.t as number) >= t0 && f(r)) return (r.t as number) - t0; return NaN; };
const peakT = (rows: Row[], k: string, t0: number, t1: number): number => { let b = { v: -Infinity, t: NaN }; for (const r of rows) { const t = r.t as number; if (t > t0 && t <= t1 && Number.isFinite(r[k] as number) && (r[k] as number) > b.v) b = { v: r[k] as number, t }; } return b.t - t0; };
const minT = (rows: Row[], k: string, t0: number, t1: number): number => { let b = { v: Infinity, t: NaN }; for (const r of rows) { const t = r.t as number; if (t > t0 && t <= t1 && Number.isFinite(r[k] as number) && (r[k] as number) < b.v) b = { v: r[k] as number, t }; } return b.t - t0; };
/** Minutes for key k to fall to half its value at tStop. */
const halfMin = (rows: Row[], k: string, tStop: number): number => { const v0 = mx(rows, k, tStop - 20, tStop); return Math.round((firstAt(rows, tStop, (r) => (r[k] as number) <= 0.5 * v0) / 60) * 10) / 10; };
const pro = (t: number, mgkg = 2) => d(t, 'propofol', mgkg, 'mg/kg');
const MAN = { mode: 'manual' as const };

// ---- induction agents × comorbidity: the rows the grid lacked ---------------------------------------------------------
add({ id: 'DI-78', tier: 'P1', ctx: 'X-A vent, septic shock warm (7e sepsis 1)', state: 'septic shock, vasodilated', intv: 'propofol 2 mg/kg in sepsis vs the same dose healthy at the same sim time', sys: 'CIRC',
  arms: { i: V([...SEPW, pro(TS)], TS + 900), c: V(SEPW, TS + 900), ri: V([pro(TS)], TS + 900), rc: V([], TS + 900) },
  measure: (R) => m({ mapBaseSeptic: mn(R.c!.rows, 'map', TS - 60, TS), mapPctSeptic: pctMin(R.i!.rows, R.c!.rows, 'map', TS, TS + 600), mapMinSeptic: mn(R.i!.rows, 'map', TS, TS + 600),
    mapPctHealthy: pctMin(R.ri!.rows, R.rc!.rows, 'map', TS, TS + 600),
    extraFall: Math.round((pctMin(R.i!.rows, R.c!.rows, 'map', TS, TS + 600) - pctMin(R.ri!.rows, R.rc!.rows, 'map', TS, TS + 600)) * 10) / 10,
    hrUpSeptic: dMax(R.i!.rows, R.c!.rows, 'hr', TS, TS + 600), arrest: arrestIn(R.i!.rows, TS, TS + 600) }),
  expect: [{ m: 'extraFall', dir: -1, tol: 2, src: 'sepsis is the strongest predictor of post-induction collapse (INTUBE 2021; R53 state-dependence: vasodilated + preload-dependent)' },
    { m: 'mapPctSeptic', lo: -50, hi: -30, src: 'septic induction: MAP ≈ 80 falls to 40–55 and needs a vasopressor (INTUBE 2021: instability 42.6 %)' }],
  owner: 'FU-4 G2 (sympatholysis as a gain scale)', fu4: true });
add({ id: 'DI-79', tier: 'P1', ctx: 'betaBlocked vs X-A, ventilated', state: 'chronic β-blockade', intv: 'propofol 2 mg/kg', sys: 'CIRC',
  arms: { i: V([pro(T)], T + 900, BB), c: V([], T + 900, BB), ri: V([pro(T)]), rc: V([]) },
  measure: (R) => m({ mapPctBB: pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 600), mapPctXA: pctMin(R.ri!.rows, R.rc!.rows, 'map', T, T + 600),
    extraFall: Math.round((pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 600) - pctMin(R.ri!.rows, R.rc!.rows, 'map', T, T + 600)) * 10) / 10,
    hrUpBB: dMax(R.i!.rows, R.c!.rows, 'hr', T, T + 600), hrUpXA: dMax(R.ri!.rows, R.rc!.rows, 'hr', T, T + 600) }),
  expect: [{ m: 'extraFall', dir: -1, tol: 2, src: 'chronic β-blockade removes the chronotropic buffer, so induction hypotension is larger (tables §1.5 betaBlocked; Miller ch. 14)' },
    { m: 'hrUpBB', lo: 0, hi: 8, src: 'no reflex tachycardia under β-blockade (tables §7 17b: HR stays < 100)' }],
  owner: 'FU-4 G2 + 7a baroreflex', fu4: true });
add({ id: 'DI-80', tier: 'P1', ctx: 'X-A vent, class III bleed', state: 'class III haemorrhage', intv: 'ketamine 1.5 mg/kg vs propofol 2 mg/kg at +11 min', sys: 'CIRC',
  arms: { k: V([...CL3, d(TB, 'ketamine', 1.5, 'mg/kg')], 2100), p: V([...CL3, pro(TB)], 2100), c: V(CL3, 2100) },
  measure: (R) => m({ mapPctKet: pctMin(R.k!.rows, R.c!.rows, 'map', TB, TB + 600), mapRiseKet: dMax(R.k!.rows, R.c!.rows, 'map', TB, TB + 600), mapPctProp: pctMin(R.p!.rows, R.c!.rows, 'map', TB, TB + 600),
    hrKet: dMax(R.k!.rows, R.c!.rows, 'hr', TB, TB + 600), arrestKet: arrestIn(R.k!.rows, TB, TB + 600) }),
  expect: [{ m: 'mapPctKet', lo: -15, hi: 5, src: 'ketamine preserves MAP in haemorrhage while sympathetic reserve lasts (Miller ch. 21; tables §6.3); falls only when catecholamine-depleted' },
    { m: 'arrestKet', event: false, src: 'ketamine induction in class III must not arrest (FU-4 rule)' }],
  owner: '7g (ketamine indirect arm)' });
add({ id: 'DI-81', tier: 'P1', ctx: 'severe AS + CAD 75 y', state: 'fixed LV outflow, coronary disease', intv: 'etomidate 0.3 mg/kg', sys: 'CIRC',
  arms: { i: V([d(T, 'etomidate', 0.3, 'mg/kg')], T + 900, ASx), c: V([], T + 900, ASx) },
  measure: (R) => m({ ...hemo(R.i!.rows, R.c!.rows, T), kIschMin: mn(R.i!.rows, 'kIsch', T, T + 600), cppMin: mn(R.i!.rows, 'cppCor', T, T + 600) }),
  expect: [{ m: 'mapPct', lo: -15, hi: 0, src: 'etomidate is the stable induction in severe AS (Miller ch. 21; tables §6.3 MAP −0–10 %)' }, { m: 'arrest', event: false, src: 'FU-4 rule' }],
  owner: '7g' });
add({ id: 'DI-82', tier: 'P1', ctx: 'X-A vent, septic shock warm', state: 'septic shock', intv: 'etomidate 0.3 vs ketamine 1.5 mg/kg (KETASED comparison)', sys: 'CIRC',
  arms: { e: V([...SEPW, d(TS, 'etomidate', 0.3, 'mg/kg')], TS + 900), k: V([...SEPW, d(TS, 'ketamine', 1.5, 'mg/kg')], TS + 900), c: V(SEPW, TS + 900) },
  measure: (R) => m({ mapPctEtom: pctMin(R.e!.rows, R.c!.rows, 'map', TS, TS + 600), mapPctKet: pctMin(R.k!.rows, R.c!.rows, 'map', TS, TS + 600), mapRiseKet: dMax(R.k!.rows, R.c!.rows, 'map', TS, TS + 600) }),
  expect: [{ m: 'mapPctEtom', lo: -20, hi: 0, src: 'KETASED (Jabre 2009): etomidate and ketamine give similar, modest haemodynamic change in the critically ill' },
    { m: 'mapPctKet', lo: -20, hi: 5, src: 'KETASED (Jabre 2009); tables §6.3' }],
  owner: '7g' });

// ---- inotropes × β-blockade × sepsis -----------------------------------------------------------------------------------
add({ id: 'DI-83', tier: 'P2', ctx: 'betaBlocked / septic warm vs X-A', state: 'chronic β-blockade; septic shock', intv: 'dobutamine 5 µg/kg/min', sys: 'CIRC',
  arms: { b: V([inf(T, 'dobutamine', 5, 'mcg/kg/min')], T + 900, BB), bc: V([], T + 900, BB), x: V([inf(T, 'dobutamine', 5, 'mcg/kg/min')], T + 900), xc: V([], T + 900),
    s: V([...SEPW, inf(TS, 'dobutamine', 5, 'mcg/kg/min')], TS + 900), sc: V(SEPW, TS + 900) },
  measure: (R) => {
    const xa = pctWin(R.x!.rows, R.xc!.rows, 'co', T + 480, T + 900);
    const bb = pctWin(R.b!.rows, R.bc!.rows, 'co', T + 480, T + 900);
    const se = pctWin(R.s!.rows, R.sc!.rows, 'co', TS + 480, TS + 900);
    return m({ coPctXA: xa, coPctBB: bb, coPctSeptic: se, ratioBB: Math.round((bb / xa) * 100) / 100, ratioSeptic: Math.round((se / xa) * 100) / 100,
      hrXA: dMax(R.x!.rows, R.xc!.rows, 'hr', T, T + 900), hrBB: dMax(R.b!.rows, R.bc!.rows, 'hr', T, T + 900) });
  },
  expect: [{ m: 'ratioBB', lo: 0.2, hi: 0.8, src: 'β-blockade shifts the dobutamine dose–response right (competitive; Miller ch. 14; tables decision 7 EC50 shift)' },
    { m: 'ratioSeptic', lo: 0.3, hi: 0.9, src: 'β-adrenergic hyporesponsiveness in septic shock (tables §5e vasoResp; Levy 2018)' }],
  owner: '7g combine.ts (betaOcc, vasoResp)' });

// ---- TCI in low output -------------------------------------------------------------------------------------------------
add({ id: 'DI-84', tier: 'P1', ctx: 'X-A vent, class III bleed vs normovolaemia', state: 'haemorrhage, CO ≈ 3 L/min', intv: 'propofol TCI Ce 3 µg/mL (Eleveld): delivered dose and achieved concentration', sys: 'PK CIRC NEU',
  arms: { i: V([...CL3, [TB, A.tci('propofol', 3, 'effect', 'eleveld'), 'TCI Ce 3']], TB + 900, XA, { dt: 5 }), c: V(CL3, TB + 900, XA, { dt: 5 }),
    ri: V([[TB, A.tci('propofol', 3, 'effect', 'eleveld'), 'TCI Ce 3']], TB + 900, XA, { dt: 5 }), rc: V([], TB + 900, XA, { dt: 5 }) },
  measure: (R) => m({ ceBleed10: Math.round(mx(R.i!.rows, 'c_propofol', TB + 540, TB + 600) * 100) / 100, ceNormal10: Math.round(mx(R.ri!.rows, 'c_propofol', TB + 540, TB + 600) * 100) / 100,
    ceRatio: Math.round((mx(R.i!.rows, 'c_propofol', TB + 540, TB + 600) / mx(R.ri!.rows, 'c_propofol', TB + 540, TB + 600)) * 100) / 100,
    mapPctBleed: pctMin(R.i!.rows, R.c!.rows, 'map', TB, TB + 900), mapPctNormal: pctMin(R.ri!.rows, R.rc!.rows, 'map', TB, TB + 900), diBleed: mn(R.i!.rows, 'di', TB + 300, TB + 900), diNormal: mn(R.ri!.rows, 'di', TB + 300, TB + 900) }),
  expect: [{ m: 'ceRatio', lo: 1.2, hi: 2, src: 'a TCI model assumes a normal circulation: in haemorrhage the real concentration exceeds the target (Kurita 2002; Johnson 2003; FU-4 Task 14 S6b ratio ≥ 1.3)' }],
  owner: 'FU-4 G10 (flow-dependent distribution)', fu4: true });

// ---- context-sensitive decrements and emergence -----------------------------------------------------------------------
add({ id: 'DI-85', tier: 'P2', ctx: 'X-A vent', state: 'TIVA maintenance', intv: 'propofol plasma TCI 3 µg/mL (Eleveld) for 1 h vs 3 h, then off: 50 % plasma decrement and time to consciousness', sys: 'PK NEU',
  // resume: plasma TCI (constant Cp, Hughes' definition) rather than a constant rate
  arms: { h1: V([[60, A.tci('propofol', 3, 'plasma', 'eleveld'), 'TCI Cp 3'], [3660, A.tci('propofol', 0, 'plasma', 'eleveld'), 'off']], 3660 + 3600, XA, { dt: 10 }),
    h3: V([[60, A.tci('propofol', 3, 'plasma', 'eleveld'), 'TCI Cp 3'], [10860, A.tci('propofol', 0, 'plasma', 'eleveld'), 'off']], 10860 + 3600, XA, { dt: 10 }) },
  measure: (R) => m({ cp1h: Math.round(mx(R.h1!.rows, 'p_propofol', 3600, 3660) * 100) / 100, cp3h: Math.round(mx(R.h3!.rows, 'p_propofol', 10800, 10860) * 100) / 100,
    csht1hMin: halfMin(R.h1!.rows, 'p_propofol', 3660), csht3hMin: halfMin(R.h3!.rows, 'p_propofol', 10860),
    wake1hMin: Math.round((firstAt(R.h1!.rows, 3660, (r) => r.conscious === true) / 60) * 10) / 10, wake3hMin: Math.round((firstAt(R.h3!.rows, 10860, (r) => r.conscious === true) / 60) * 10) / 10 }),
  expect: [{ m: 'wake1hMin', lo: 4, hi: 20, src: 'emergence after propofol-only anaesthesia 5–15 min (Miller ch. 21; Hughes 1992 CSHT context)' },
    { m: 'wake3hMin', lo: 5, hi: 25, src: 'emergence lengthens little with duration for propofol (Hughes 1992: CSHT < 25 min up to 3 h)' }],
  owner: '7g csht / 7f depth' });
add({ id: 'DI-86', tier: 'P2', ctx: 'X-A vent', state: 'opioid infusion', intv: 'fentanyl plasma TCI 2 ng/mL (Shafer) for 1 h vs 3 h, then off: 50 % plasma decrement (Hughes 1992 definition: constant Cp)', sys: 'PK',
  // resume: Hughes' CSHT holds the PLASMA concentration constant; a constant-RATE infusion (first version) loads the
  // periphery less and gives 13.3 / 37 min — the TCI arm reproduces the definition
  arms: { h1: V([[60, A.tci('fentanyl', 2, 'plasma', 'shafer'), 'TCI Cp 2'], [3660, A.tci('fentanyl', 0, 'plasma', 'shafer'), 'off']], 3660 + 7200, XA, { dt: 20 }),
    h3: V([[60, A.tci('fentanyl', 2, 'plasma', 'shafer'), 'TCI Cp 2'], [10860, A.tci('fentanyl', 0, 'plasma', 'shafer'), 'off']], 10860 + 14400, XA, { dt: 20 }) },
  measure: (R) => { const a = halfMin(R.h1!.rows, 'p_fentanyl', 3660); const b = halfMin(R.h3!.rows, 'p_fentanyl', 10860); return m({ cp1h: Math.round(mx(R.h1!.rows, 'p_fentanyl', 3600, 3660) * 100) / 100, csht1hMin: a, csht3hMin: b, ratio3to1: Math.round((b / a) * 100) / 100 }); },
  expect: [{ m: 'csht1hMin', lo: 12, hi: 40, src: 'fentanyl CSHT ≈ 20 min at 1 h (Hughes 1992; Shafer model 17.8, 7g gate)' },
    { m: 'ratio3to1', lo: 3, hi: 8, src: 'fentanyl CSHT rises steeply: 3 h > 3 × 1 h (Hughes 1992; 7g gate decision 3: 17.8 → 70)' }],
  owner: '7g csht.ts' });
add({ id: 'DI-87', tier: 'P2', ctx: 'X-A vent', state: 'volatile maintenance 1 MAC for 60 min', intv: 'dial off at FGF 6 L/min: desflurane vs sevoflurane vs isoflurane emergence', sys: 'PK NEU',
  // dials set so each agent's BRAIN MAC is ≈ 1.0 at 60 min (a 1-MAC dial gives 0.9 / 0.8 / 0.6 brain MAC on this commit)
  arms: { des: V([vap(60, 'desflurane', 7.3, 4), vap(3660, 'desflurane', 0, 6)], 3660 + 1800, XA, { dt: 5 }), sev: V([vap(60, 'sevoflurane', 2.25, 4), vap(3660, 'sevoflurane', 0, 6)], 3660 + 1800, XA, { dt: 5 }),
    iso: V([vap(60, 'isoflurane', 1.95, 4), vap(3660, 'isoflurane', 0, 6)], 3660 + 1800, XA, { dt: 5 }) },
  measure: (R) => { const w = (x: { rows: Row[] }) => Math.round((firstAt(x.rows, 3660, (r) => r.conscious === true) / 60) * 10) / 10;
    return m({ macDes: Math.round(mx(R.des!.rows, 'macBrain', 3600, 3660) * 100) / 100, macSev: Math.round(mx(R.sev!.rows, 'macBrain', 3600, 3660) * 100) / 100, macIso: Math.round(mx(R.iso!.rows, 'macBrain', 3600, 3660) * 100) / 100,
      wakeDesMin: w(R.des!), wakeSevMin: w(R.sev!), wakeIsoMin: w(R.iso!), desToSev: Math.round((w(R.des!) / w(R.sev!)) * 100) / 100, isoToSev: Math.round((w(R.iso!) / w(R.sev!)) * 100) / 100 }); },
  expect: [{ m: 'desToSev', lo: 0.5, hi: 0.95, src: 'desflurane emergence is faster than sevoflurane (Macario 2005 meta-analysis; Miller ch. 19: b/g 0.45 vs 0.65)' },
    { m: 'isoToSev', lo: 1.05, hi: 2.5, src: 'isoflurane (b/g 1.46) emerges slowest (Miller ch. 19)' },
    { m: 'wakeSevMin', lo: 4, hi: 20, src: 'eye opening 5–15 min after 1 h of ≈ 1 MAC sevoflurane without adjuncts (Miller ch. 19)' }],
  owner: '7g volatile.ts / 7f depth' });
add({ id: 'DI-88', tier: 'P2', ctx: 'X-A vent / spontaneous', state: 'GA / sedation', intv: 'time to peak effect: fentanyl 2 µg/kg, remifentanil 1 µg/kg, midazolam 0.05 mg/kg, rocuronium 1.2 mg/kg', sys: 'PK NEU',
  arms: { f: V([d(T, 'fentanyl', 2, 'mcg/kg')], T + 900, XA, { dt: 5 }), r: V([d(T, 'remifentanil', 1, 'mcg/kg')], T + 600, XA, { dt: 5 }), z: SP([d(T, 'midazolam', 0.05, 'mg/kg')], T + 900, XA, { dt: 5 }),
    k: V([d(T, 'rocuronium', 1.2, 'mg/kg')], T + 600, XA, { dt: 5 }) },
  measure: (R) => m({ fentTtpeS: peakT(R.f!.rows, 'c_fentanyl', T, T + 900), remiTtpeS: peakT(R.r!.rows, 'c_remifentanil', T, T + 600), midazDiNadirS: minT(R.z!.rows, 'di', T, T + 900), midazCePeakS: peakT(R.z!.rows, 'c_midazolam', T, T + 900),
    roc12OnsetS: firstAt(R.k!.rows, T, (r) => (r.t1 as number) <= 0.01) }),
  expect: [{ m: 'fentTtpeS', lo: 180, hi: 270, invert: true, src: 'fentanyl time to peak effect 3.6 min (Shafer & Varvel 1991; Miller ch. 22)' },
    { m: 'remiTtpeS', lo: 60, hi: 120, invert: true, src: 'remifentanil TTPE 1.4–1.6 min (Minto 1997)' },
    { m: 'midazDiNadirS', lo: 120, hi: 420, invert: true, src: 'midazolam: T½ke0 2–3 min, peak 3–5 min (Miller ch. 21 p. 532)' },
    { m: 'roc12OnsetS', lo: 45, hi: 90, invert: true, src: 'rocuronium 1.2 mg/kg: maximum block ≈ 1.0 min (label; Miller ch. 24)' }],
  owner: '7g models / 7f nmb' });

// ---- MANUAL subset (research/12 §2.2: every P1 haemodynamic cell also runs in MANUAL; graded direction-only, Q9 open) ---
const NOARR: Expect = { m: 'arrest', event: false, src: 'FU-4 rule, MANUAL too (audit 08 G9: MANUAL must share the arrest pathway)' };
add({ id: 'DI-M1', tier: 'P1', ctx: 'X-A vent MANUAL', state: 'GA', intv: 'propofol 2 mg/kg (MANUAL; MODELED twin DI-01a)', sys: 'CIRC',
  arms: { i: V([pro(T)], T + 900, XA, MAN), c: V([], T + 900, XA, MAN) }, measure: (R) => m(hemo(R.i!.rows, R.c!.rows, T)),
  expect: [{ m: 'mapPct', dir: -1, tol: 5, src: 'propofol lowers MAP (Miller ch. 21); the MANUAL size is Q9' }, NOARR], owner: 'Q9 (MANUAL physiology) / FU-4 G9', fu4: true });
add({ id: 'DI-M2', tier: 'P1', ctx: 'X-A vent MANUAL, class III bleed', state: 'class III haemorrhage', intv: 'propofol 2 mg/kg (MANUAL; MODELED twin DI-22)', sys: 'CIRC',
  arms: { i: V([...CL3, pro(TB)], 2100, XA, MAN), c: V(CL3, 2100, XA, MAN) },
  measure: (R) => m({ mapBefore: mn(R.c!.rows, 'map', TB - 60, TB), mapMin: mn(R.i!.rows, 'map', TB, TB + 600), mapPct: pctMin(R.i!.rows, R.c!.rows, 'map', TB, TB + 600), hrBefore: mx(R.c!.rows, 'hr', TB - 60, TB), arrest: arrestIn(R.i!.rows, TB, TB + 600) }),
  expect: [{ m: 'mapPct', dir: -1, tol: 5, src: 'propofol in hypovolaemia (Miller ch. 21)' }, NOARR], owner: 'Q9 / FU-4 G9', fu4: true });
add({ id: 'DI-M3', tier: 'P1', ctx: 'severe AS + CAD 75 y MANUAL', state: 'severe AS', intv: 'propofol 1.5 mg/kg then phenylephrine 100 µg (MANUAL; MODELED twins DI-48, DI-31)', sys: 'CIRC',
  arms: { i: V([pro(T, 1.5), d(T + 150, 'phenylephrine', 100, 'mcg')], T + 900, ASx, MAN), p: V([pro(T, 1.5)], T + 900, ASx, MAN), c: V([], T + 900, ASx, MAN) },
  measure: (R) => m({ mapPctProp: pctMin(R.p!.rows, R.c!.rows, 'map', T, T + 150), mapPhe: mx(R.i!.rows, 'map', T + 150, T + 450), mapNoPhe: mx(R.p!.rows, 'map', T + 150, T + 450), phePressor: dMax(R.i!.rows, R.p!.rows, 'map', T + 150, T + 450), hrPhe: dMin(R.i!.rows, R.p!.rows, 'hr', T + 150, T + 450), arrest: arrestIn(R.i!.rows, T, T + 600) }),
  expect: [{ m: 'mapPctProp', dir: -1, tol: 5, src: 'tables §7 check 10 (direction)' }, { m: 'phePressor', dir: 1, tol: 5, src: 'phenylephrine restores MAP (tables §7 check 10)' }, NOARR], owner: 'Q9', fu4: true });
add({ id: 'DI-M4', tier: 'P1', ctx: 'X-A vent MANUAL', state: 'GA', intv: 'esmolol 0.5 mg/kg; atropine 1 mg; ephedrine 10 mg (chronotropes in MANUAL; MODELED twins DI-07, DI-63, DI-04a)', sys: 'CIRC RHY',
  arms: { e: V([d(T, 'esmolol', 0.5, 'mg/kg')], T + 600, XA, MAN), a: V([d(T, 'atropine', 1, 'mg')], T + 600, XA, MAN), p: V([d(T, 'ephedrine', 10, 'mg')], T + 600, XA, MAN), c: V([], T + 600, XA, MAN) },
  measure: (R) => m({ hrEsmolol: dMin(R.e!.rows, R.c!.rows, 'hr', T, T + 300), hrAtropine: dMax(R.a!.rows, R.c!.rows, 'hr', T, T + 300), hrEphedrine: dMax(R.p!.rows, R.c!.rows, 'hr', T, T + 300),
    hrModelAtropine: dMax(R.a!.rows, R.c!.rows, 'hrModel', T, T + 300), mapEphedrine: pctMax(R.p!.rows, R.c!.rows, 'map', T, T + 300), mapEsmolol: pctMin(R.e!.rows, R.c!.rows, 'map', T, T + 300) }),
  expect: [{ m: 'hrEsmolol', dir: -1, tol: 3, src: 'a direct negative chronotrope lowers HR whatever the mode (tables §6.2); Q9 decides whether MANUAL HR is the instructor’s' },
    { m: 'hrAtropine', dir: 1, tol: 3, src: 'atropine raises HR (tables §6.2); Q9' }, { m: 'mapEphedrine', dir: 1, tol: 2, src: 'ephedrine raises MAP (tables §6.2)' }],
  owner: 'Q9 (MANUAL HR is the instructor’s)' });

// ---- the 7f apnoea flag against the breathing that happens (found while checking DI-01d) --------------------------------
add({ id: 'DI-89', tier: 'P1', ctx: 'X-A spontaneous, FiO2 0.5', state: 'induction apnoea and its recovery', intv: 'propofol 2 mg/kg + remifentanil 1 µg/kg: 7f apnoea flag vs spontaneous VE', sys: 'LUNG NEU DEV',
  arms: { i: SP([[1, A.spont(0.5), 'spontaneous FiO2 0.5'], pro(T), d(T, 'remifentanil', 1, 'mcg/kg')], T + 1200) },
  measure: (R) => m({ flagSecondsWhileBreathing: R.i!.rows.filter((r) => (r.t as number) > T && r.apnoea === true && (r.veSp as number) >= 3).length * 5,
    veWhileFlagged: mx(R.i!.rows.filter((r) => r.apnoea === true) as Row[], 'veSp', T, T + 1200), apnoeaVeS: R.i!.rows.filter((r) => (r.t as number) > T && apnoeic(r)).length * 5,
    spo2Min: mn(R.i!.rows, 'spo2', T, T + 1200), mapMin: mn(R.i!.rows, 'map', T, T + 1200), arrest: arrestIn(R.i!.rows, T, T + 1200), anyFlag: anyR(R.i!.rows, T, T + 1200, (r) => r.apnoea === true) }),
  expect: [{ m: 'flagSecondsWhileBreathing', quiet: true, tol: 0, src: 'one truth: the apnoea flag (neuroMark "apnoea", drive.apnoea) must not stay set while the patient breathes ≥ 3 L/min (research/12 §2.1 IN)' }],
  owner: '7f drive.ts:64 vs neuro/spont.ts (MODELED chemoreflex)' });

// ---- magnesium sulfate (the drug) × rocuronium: does the 7c blood Mg reach 7f? -------------------------------------------
add({ id: 'DI-90', tier: 'P2', ctx: 'X-A vent', state: 'magnesium sulfate 60 mg/kg (pre-eclampsia / analgesia load)', intv: 'rocuronium 0.6 mg/kg after the Mg load vs alone', sys: 'NEU BLD',
  arms: { i: V([d(T - 240, 'magnesium', 60, 'mg/kg', { overS: 180 }), d(T, 'rocuronium', 0.6, 'mg/kg')], T + 3600, XA, { dt: 10 }), c: V([d(T, 'rocuronium', 0.6, 'mg/kg')], T + 3600, XA, { dt: 10 }) },
  measure: (R) => { const rec = (x: { rows: Row[] }) => firstAt(x.rows, T + 300, (r) => (r.t1 as number) >= 0.25) + 300;
    return m({ mgPeak: mx(R.i!.rows, 'mg', T - 240, T + 600), t25_mgDrug: Math.round((rec(R.i!) / 60) * 10) / 10, t25_normal: Math.round((rec(R.c!) / 60) * 10) / 10, prolongPct: Math.round(((100 * (rec(R.i!) - rec(R.c!))) / rec(R.c!)) * 10) / 10,
      mapPct: pctMin(R.i!.rows, R.c!.rows, 'map', T - 240, T + 600) }); },
  expect: [{ m: 'prolongPct', lo: 20, hi: 90, src: 'magnesium sulfate potentiates non-depolarisers (Miller ch. 24 p. 698: vecuronium ED50 −25 % after 40 mg/kg); DI-25 gives +39 % from the profile Mg' }],
  owner: '7f interactions.ts ← 7c blood Mg', hand: { verdict: 'IN', why: 'blood Mg reaches 2.1 mmol/L but rocuronium is unchanged (+0.5 %), while the profile Mg 2.5 of DI-25 prolongs it +39 %: 7f reads the profile field only (neuro/pipeline.ts:186), not 7c blood.out.mg — two commands for one state disagree' } });
