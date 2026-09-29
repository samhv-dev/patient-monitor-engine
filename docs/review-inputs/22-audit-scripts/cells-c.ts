// BF group C — P2 and P3 cells (matrix BF-09…12, BF-14, BF-15, BF-18…23, BF-27, BF-28, BF-31), the carbon-monoxide
// cells the run brief adds (BF-32), and two MANUAL twins (BF-M1/M2). Order inside P2 follows the brief: fluids and
// acid–base first, then the coagulation NE cells, then the electrolyte extremes and poisoning; P3 (MetHb) last.
import { A } from './runner.ts';
import type { Row } from './runner.ts';
import { add, AW, bl, CL3, d, dAt, dMax, dMin, fl, G, HF, lab, m, mn, MRs, mx, raw, SEPW, T, TB, TS, v, XA } from './spec.ts';

const H = 3600;
const pct = (a: number, b: number) => Math.round((1000 * (a - b)) / b) / 10;
const firstAt = (rows: Row[], t0: number, f: (r: Row) => boolean) => { for (const r of rows) if ((r.t as number) >= t0 && f(r)) return (r.t as number) - t0; return NaN; };

// ---- BF-12: 7.5 % saline 250 mL ----------------------------------------------------------------------------------------
add({ id: 'BF-12', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic', intv: '7.5 % saline 250 mL (7g hypertonicSaline, runs over 15 min): Na 30 min after the end', sys: 'BLD BRN',
  arms: { i: G([d(T, 'hypertonicSaline', 250, 'mL', { concentrationPct: 7.5 })], T + 2 * H, XA, { dt: 15 }), c: G([], T + 2 * H, XA, { dt: 15 }) },
  measure: (R) => m({ dNa45: dAt(R.i!.rows, R.c!.rows, 'na', T + 2700), dNaPeak: dMax(R.i!.rows, R.c!.rows, 'na', T, T + 2 * H), dNa2h: dAt(R.i!.rows, R.c!.rows, 'na', T + 2 * H), dOsm45: dAt(R.i!.rows, R.c!.rows, 'osm', T + 2700), dBv45: Math.round(v(R.i!.rows, 'bv', T + 2700) - v(R.c!.rows, 'bv', T + 2700)), dIcp: dMin(R.i!.rows, R.c!.rows, 'icp', T, T + 2 * H) }),
  expect: [{ m: 'dNa45', lo: 4, hi: 7, src: 'research/12 BF-12 (Na +4–6); Adrogué & Madias 2000 NEJM 342:1581 formula: (1283 − 140)/(42 + 1) × 0.25 = +6.6' }],
  owner: '7c pipeline.ts observeDoses' });

// ---- BF-14: 5 L saline -------------------------------------------------------------------------------------------------
add({ id: 'BF-14', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: '0.9 % saline 5 L over 2 h (≈ 36 mL/kg/h): BE and Cl at the end', sys: 'BLD',
  arms: { i: G([fl(T, 'saline', 5000, 2 * H)], T + 2 * H, XA, { dt: 30 }), c: G([], T + 2 * H, XA, { dt: 30 }) },
  measure: (R) => m({ dBE: dAt(R.i!.rows, R.c!.rows, 'be', T + 2 * H), dCl: dAt(R.i!.rows, R.c!.rows, 'cl', T + 2 * H), dPh: dAt(R.i!.rows, R.c!.rows, 'ph', T + 2 * H), dAlb: dAt(R.i!.rows, R.c!.rows, 'alb', T + 2 * H), dHb: dAt(R.i!.rows, R.c!.rows, 'hb', T + 2 * H), retained: Math.round(v(R.i!.rows, 'bv', T + 2 * H) - v(R.c!.rows, 'bv', T + 2 * H)), evlwiExtra: v(R.i!.rows, 'evlwi', T + 2 * H) }),
  expect: [{ m: 'dBE', lo: -8, hi: -4, src: 'Scheingraber 1999 Anesthesiology 90:1265 (saline 30 mL/kg/h × 2 h: BE ≈ −7, Cl ≈ 115); research/12 BF-14 (BE −5)' },
    { m: 'dCl', lo: 6, hi: 12, src: 'Scheingraber 1999 (Cl 105 → 115)' }],
  owner: '7c solutes.ts / 7d renal' });

// ---- BF-18 / BF-19: acute isovolaemic anaemia (awake) and ANH (GA) -----------------------------------------------------
{
  // exchange: bleed and albumin 5 % at the same rate. Awake: 3.7 L over 60 min (Hb 15 → ≈ 7); GA: 1.5 L over 30 min
  const ex = (ml: number, s: number) => [bl(T, ml, s), fl(T, 'albumin5', ml, s)];
  const arms = { i: AW(ex(3700, H), T + H + 900, XA, { dt: 10 }), c: AW([], T + H + 900, XA, { dt: 10 }) };
  const te = T + H + 600;
  add({ id: 'BF-18a', tier: 'P2', ctx: 'X-A awake spontaneous, room air', state: 'acute isovolaemic haemodilution to Hb ≈ 7', intv: 'exchange 3.7 L blood for albumin 5 % over 60 min: heart rate', sys: 'CIRC BLD',
    arms, measure: (R) => m({ hbEnd: v(R.i!.rows, 'hb', te), dBv: Math.round(v(R.i!.rows, 'bv', te) - v(R.c!.rows, 'bv', te)), dHr: Math.round(v(R.i!.rows, 'hr', te) - v(R.c!.rows, 'hr', te)), dMap: Math.round(v(R.i!.rows, 'map', te) - v(R.c!.rows, 'map', te)) }),
    expect: [{ m: 'dHr', lo: 10, hi: 20, src: 'Weiskopf 1998 JAMA 279:217 (awake isovolaemic haemodilution: HR rises linearly as Hb falls; research/12 BF-18 +10–20 at Hb 7)' }],
    owner: '7a / 7c (anaemia → CO)', known: 'audit 09 R11' });
  add({ id: 'BF-18b', tier: 'P2', ctx: 'X-A awake spontaneous, room air', state: 'acute isovolaemic haemodilution to Hb ≈ 7', intv: 'the same exchange: cardiac output, DO2, SvO2', sys: 'CIRC BLD',
    arms, measure: (R) => m({ coPct: pct(v(R.i!.rows, 'co', te), v(R.c!.rows, 'co', te)), do2Pct: pct(v(R.i!.rows, 'do2', te), v(R.c!.rows, 'do2', te)), svo2: v(R.i!.rows, 'svo2', te), svo2Ctl: v(R.c!.rows, 'svo2', te), lact: v(R.i!.rows, 'lact', te), svrPct: pct(v(R.i!.rows, 'svr', te), v(R.c!.rows, 'svr', te)) }),
    expect: [{ m: 'coPct', lo: 20, hi: 60, src: 'Weiskopf 1998 JAMA 279:217 (CI 2.9 → 4.8 L/min/m² at Hb 5, linear: ≈ +45 % at Hb 7; research/12 BF-18 "CO ↑")' }],
    owner: '7a / 7c (anaemia → CO)', known: 'audit 09 R11' });
  add({ id: 'BF-19', tier: 'P2', ctx: 'X-A GA vent', state: 'acute normovolaemic haemodilution (ANH)', intv: 'exchange 1.5 L blood for albumin 5 % over 30 min (Hb 15 → ≈ 11): DO2 kept by CO', sys: 'CIRC BLD',
    arms: { i: G(ex(1500, 1800), T + 2400, XA, { dt: 10 }), c: G([], T + 2400, XA, { dt: 10 }) },
    measure: (R) => m({ hbEnd: v(R.i!.rows, 'hb', T + 2100), coPct: pct(v(R.i!.rows, 'co', T + 2100), v(R.c!.rows, 'co', T + 2100)), do2Pct: pct(v(R.i!.rows, 'do2', T + 2100), v(R.c!.rows, 'do2', T + 2100)), dHr: Math.round(v(R.i!.rows, 'hr', T + 2100) - v(R.c!.rows, 'hr', T + 2100)), svo2: v(R.i!.rows, 'svo2', T + 2100) }),
    expect: [{ m: 'coPct', lo: 10, hi: 40, src: 'Messmer 1975 / Habler & Messmer 1997 (ANH to Hct 25–30: CO rises by lower viscosity and venous return, DO2 kept)' },
      { m: 'do2Pct', lo: -15, hi: 5, src: 'DO2 maintained during ANH down to Hct ≈ 25 % (Habler 1997; research/12 BF-19)' }],
    owner: '7a / 7c (anaemia → CO)', known: 'audit 09 R11' });
}

// ---- BF-20: septic capillary leak and 30 mL/kg ------------------------------------------------------------------------
{
  const arms = { i: G([...SEPW, fl(TS, 'saline', 2100, 1800)], TS + 1800 + H, XA, { dt: 10 }), c: G([...SEPW], TS + 1800 + H, XA, { dt: 10 }),
    ri: G([fl(TS, 'saline', 2100, 1800)], TS + 1800 + H, XA, { dt: 10 }), rc: G([], TS + 1800 + H, XA, { dt: 10 }) };
  add({ id: 'BF-20a', tier: 'P2', ctx: 'X-A GA vent, FiO2 0.5', state: 'septic shock warm (7e sepsis 1: kfMult × leak)', intv: '0.9 % saline 30 mL/kg over 30 min: lung water and PaO2 (vs the same load healthy)', sys: 'LUNG BLD',
    arms, measure: (R) => m({ kf: v(R.c!.rows, 'kf', TS), dEvlwiSepsis: dAt(R.i!.rows, R.c!.rows, 'evlwi', TS + 1800 + H), dEvlwiHealthy: dAt(R.ri!.rows, R.rc!.rows, 'evlwi', TS + 1800 + H),
      dPao2Sepsis: Math.round(v(R.i!.rows, 'pao2', TS + 1800 + H) - v(R.c!.rows, 'pao2', TS + 1800 + H)), dPao2Healthy: Math.round(v(R.ri!.rows, 'pao2', TS + 1800 + H) - v(R.rc!.rows, 'pao2', TS + 1800 + H)),
      dVisfSepsis: Math.round(v(R.i!.rows, 'visf', TS + 1800 + H) - v(R.c!.rows, 'visf', TS + 1800 + H)), dVisfHealthy: Math.round(v(R.ri!.rows, 'visf', TS + 1800 + H) - v(R.rc!.rows, 'visf', TS + 1800 + H)) }),
    expect: [{ m: 'dEvlwiSepsis', dir: 1, tol: 1, src: 'capillary leak: a fluid load raises extravascular lung water in sepsis (Sakka 2002 Chest 122:2080; tables §5e)' },
      { m: 'dPao2Sepsis', dir: -1, tol: 5, src: 'lung water lowers PaO2 at fixed FiO2 (tables §5e; research/12 BF-20)' }],
    owner: '7c circ-adapter.ts lungWaterStep / 7b' });
  add({ id: 'BF-20b', tier: 'P2', ctx: 'X-A GA vent', state: 'septic shock warm', intv: '30 mL/kg saline: MAP gain at the end and 60 min later (transient)', sys: 'CIRC',
    arms, measure: (R) => { const p = dMax(R.i!.rows, R.c!.rows, 'map', TS, TS + 1800); const l = dAt(R.i!.rows, R.c!.rows, 'map', TS + 1800 + H); return m({ mapBase: Math.round(v(R.c!.rows, 'map', TS)), dMapPeak: p, dMap60After: Math.round(l * 10) / 10, keptFrac: Math.round((l / p) * 100) / 100, dCoPeak: dMax(R.i!.rows, R.c!.rows, 'co', TS, TS + 1800) }); },
    expect: [{ m: 'dMapPeak', lo: 3, hi: 15, src: 'fluid bolus in septic shock: MAP +5–10 mmHg (Glassford 2014 Crit Care 18:696)' },
      { m: 'keptFrac', lo: 0, hi: 0.5, src: 'the MAP gain dissipates within 60 min (Glassford 2014; Nunes 2014 Ann Intensive Care 4:25)' }],
    owner: '7c fluids.ts (leak) / 7d renal' });
}

// ---- BF-21: 1.5 L crystalloid in HFrEF and severe MR (awake) -----------------------------------------------------------
{
  const arms = { h: AW([fl(T, 'saline', 1500, 1800)], T + 1800 + H, HF, { dt: 10 }), hc: AW([], T + 1800 + H, HF, { dt: 10 }),
    r: AW([fl(T, 'saline', 1500, 1800)], T + 1800 + H, MRs, { dt: 10 }), rc: AW([], T + 1800 + H, MRs, { dt: 10 }) };
  const W = T + 1800 + H;
  add({ id: 'BF-21a', tier: 'P2', ctx: 'HFrEF 60 y 80 kg (and severe MR 60 y) awake, room air', state: 'compensated HFrEF / chronic severe MR', intv: '0.9 % saline 1.5 L over 30 min: PAWP', sys: 'CIRC',
    arms, measure: (R) => m({ pawpBaseHF: Math.round(v(R.hc!.rows, 'pawp', T)), pawpPeakHF: Math.round(mx(R.h!.rows, 'pawp', T, W)), pawpBaseMR: Math.round(v(R.rc!.rows, 'pawp', T)), pawpPeakMR: Math.round(mx(R.r!.rows, 'pawp', T, W)) }),
    expect: [{ m: 'pawpPeakHF', lo: 25, hi: 40, src: 'tables §7 check 11 (HFrEF/MR + 1.5 L: PAWP 15 → > 25); research/12 BF-21' }],
    owner: '7a circ / 7c' });
  add({ id: 'BF-21b', tier: 'P2', ctx: 'HFrEF awake', state: 'compensated HFrEF', intv: '1.5 L saline: extravascular lung water (7c extra EVLWI above the 7b baseline ≈ 7 mL/kg)', sys: 'LUNG',
    arms, measure: (R) => m({ evlwiExtraHF: mx(R.h!.rows, 'evlwi', T, W), evlwiExtraMR: mx(R.r!.rows, 'evlwi', T, W), copEnd: v(R.h!.rows, 'cop', T + 1800) }),
    expect: [{ m: 'evlwiExtraHF', lo: 3, hi: 15, src: 'tables §7 check 11 (EVLWI > 10 mL/kg from a normal ≈ 7: Sakka 2002 Chest 122:2080)' }],
    owner: '7c circ-adapter.ts lungWaterStep' });
  add({ id: 'BF-21c', tier: 'P2', ctx: 'HFrEF awake, room air', state: 'compensated HFrEF', intv: '1.5 L saline: SpO2', sys: 'LUNG DEV',
    arms, measure: (R) => m({ spo2BaseHF: v(R.hc!.rows, 'spo2', T), spo2MinHF: mn(R.h!.rows, 'spo2', T, W), spo2MinMR: mn(R.r!.rows, 'spo2', T, W), rrMaxHF: mx(R.h!.rows, 'rrSp', T, W) }),
    expect: [{ m: 'spo2MinHF', lo: 89, hi: 92, src: 'tables §7 check 11 (SpO2 96 → 89–92)' }],
    owner: '7b lung water → gas exchange' });
}

// ---- BF-22: hypoalbuminaemia 20 g/L -----------------------------------------------------------------------------------
{
  const arms = { i: G([d(T, 'propofol', 2, 'mg/kg')], T + 600, { blood: { albuminGL: 20 } }), c: G([d(T, 'propofol', 2, 'mg/kg')], T + 600) };
  add({ id: 'BF-22a', tier: 'P2', ctx: 'X-A GA vent, profile albumin 20 g/L', state: 'hypoalbuminaemia', intv: 'baseline: plasma COP and the lung-oedema threshold (COP − 2)', sys: 'BLD LUNG',
    arms, measure: (R) => m({ cop: v(R.i!.rows, 'cop', T - 10), copNormal: v(R.c!.rows, 'cop', T - 10), oedemaThreshold: Math.round((v(R.i!.rows, 'cop', T - 10) - 2) * 10) / 10 }),
    expect: [{ m: 'cop', lo: 11, hi: 17, src: 'Weil 1979 Crit Care Med 7:113 / Mangialardi 2000 J Trauma 48:37 (COP ≈ 12–16 mmHg at albumin 20 g/L; normal 22–25)' }],
    owner: '7c fluids.ts copPlasma' });
  add({ id: 'BF-22b', tier: 'P2', ctx: 'X-A GA vent, profile albumin 20 g/L', state: 'hypoalbuminaemia', intv: 'baseline: anion gap and base excess (Figge)', sys: 'BLD',
    arms, measure: (R) => m({ ag: v(R.i!.rows, 'ag', T - 10), agNormal: v(R.c!.rows, 'ag', T - 10), dAg: dAt(R.i!.rows, R.c!.rows, 'ag', T - 10), dBE: dAt(R.i!.rows, R.c!.rows, 'be', T - 10), dHco3: dAt(R.i!.rows, R.c!.rows, 'hco3', T - 10) }),
    expect: [{ m: 'dAg', lo: -6.5, hi: -3.5, src: 'Figge 1998 Crit Care Med 26:1807 (AG falls 2.5 mmol/L per 10 g/L albumin fall)' }],
    owner: '7c core.ts createBloodCore (calibrateXa)' });
  add({ id: 'BF-22c', tier: 'P2', ctx: 'X-A GA vent, profile albumin 20 g/L', state: 'hypoalbuminaemia', intv: 'propofol 2 mg/kg: free (unbound) drug fraction and effect', sys: 'PK',
    arms, measure: (R) => m({ dMapPct: pct(mn(R.i!.rows, 'map', T, T + 600), mn(R.c!.rows, 'map', T, T + 600)), cePropMaxLowAlb: mx(R.i!.rows, 'c_propofol', T, T + 600), cePropMaxNormal: mx(R.c!.rows, 'c_propofol', T, T + 600) }),
    expect: [{ m: 'freeFraction', lo: 1.2, hi: 3, src: 'free fraction of highly bound drugs rises in hypoalbuminaemia (Miller 10e ch. 20; research/12 BF-22)' }],
    owner: '7g (no protein binding)' });
}

// ---- BF-15: metabolic alkalosis ----------------------------------------------------------------------------------------
add({ id: 'BF-15a', tier: 'P2', ctx: 'X-A awake', state: 'metabolic alkalosis from vomiting / NG loss', intv: 'the state: an alkali-gaining (H+ and Cl loss) event', sys: 'BLD',
  arms: { p: AW([raw(T, { kind: 'fluidLoss', type: 'gastric', volumeMl: 2000, overS: 3600 }, 'gastric loss 2 L')], T + 60) }, measure: () => m({}),
  expect: [], ne: 'no gastric/alkali-loss event; the state exists only as a profile HCO3 (research/12 §5.10 "P 2")', owner: 'FU-7 (7c event)' });
add({ id: 'BF-15b', tier: 'P2', ctx: 'X-A awake spontaneous, room air, profile HCO3 34', state: 'metabolic alkalosis HCO3 34 (profile proxy)', intv: 'baseline: compensatory hypoventilation', sys: 'LUNG BLD',
  arms: { i: AW([], 1800, { blood: { hco3: 34 } }, { dt: 10 }), c: AW([], 1800, XA, { dt: 10 }) },
  measure: (R) => m({ paco2: v(R.i!.rows, 'paco2', 1800), ph: v(R.i!.rows, 'ph', 1800), hco3: v(R.i!.rows, 'hco3', 1800), dPaco2: dAt(R.i!.rows, R.c!.rows, 'paco2', 1800), dVe: dAt(R.i!.rows, R.c!.rows, 'veSp', 1800), iCa: v(R.i!.rows, 'iCa', 1800), k: v(R.i!.rows, 'k', 1800) }),
  expect: [{ m: 'dPaco2', lo: 5, hi: 9, src: 'Javaheri 1982 / "Boston rules": PaCO2 +0.7 per 1 mmol/L HCO3 rise (+7 ± 2 for HCO3 34)' }],
  owner: '7f neuro/spont.ts (Winter shift only for acidosis)' });

// ---- BF-27 / BF-28 / BF-31: coagulation and temperature correction (7i) — NE with probes ------------------------------
{
  const hep = G([raw(T, { kind: 'drug', drugId: 'heparin', dose: 300, unit: 'units/kg', route: 'iv' }, 'heparin 300 u/kg'), raw(T + 600, { kind: 'drug', drugId: 'protamine', dose: 3, unit: 'mg/kg', route: 'iv' }, 'protamine 3 mg/kg')], T + 900);
  for (const [id, what] of [['BF-27a', 'ACT > 480 s after heparin 300 u/kg'], ['BF-27b', 'protamine: systemic hypotension'], ['BF-27c', 'protamine: pulmonary hypertension (type III reaction)']] as const) {
    add({ id, tier: 'P2', ctx: 'X-A GA vent', state: 'cardiac-surgery anticoagulation', intv: what, sys: id === 'BF-27a' ? 'COAG' : 'COAG CIRC', arms: { p: hep }, measure: () => m({}),
      expect: [], ne: 'no heparin or protamine in the library, no ACT (7i, R58/R60 v1.1)', owner: '7i' });
  }
  const dic = G([raw(T, { kind: 'condition', id: 'dic', severity: 1 }, 'DIC')], T + 60);
  for (const [id, what] of [['BF-28a', 'platelets ↓, fibrinogen ↓'], ['BF-28b', 'D-dimer ↑, microvascular bleeding']] as const) {
    add({ id, tier: 'P2', ctx: 'X-A GA vent', state: 'sepsis / AFE → DIC', intv: what, sys: 'COAG', arms: { p: dic }, measure: () => m({}),
      expect: [], ne: 'no DIC state or coagulation readouts (7i, R58/R60 v1.1)', owner: '7i' });
  }
  add({ id: 'BF-31', tier: 'P2', ctx: 'X-A GA vent', state: 'core 32 °C', intv: 'ABG reported α-stat (37 °C) vs temperature-corrected (pH-stat)', sys: 'BLD DEV',
    arms: { p: G([[T, A.lab('abg'), 'ABG']], T + 300) }, measure: (R) => m({ labKeys: Object.keys(lab(R.p!, 'abg')?.values ?? {}).join(',') }),
    expect: [], ne: 'the lab panel has no patient-temperature field or corrected values (7i, R58)', owner: '7i' });
}

// ---- BF-09: hypokalaemia 2.5 -------------------------------------------------------------------------------------------
{
  const P = { blood: { k: 2.5 } };
  const roc = (p: Record<string, unknown>) => G([[1, { type: 'device', action: { kind: 'tofStart', intervalS: 15 } }, 'TOF'], d(T, 'rocuronium', 0.6, 'mg/kg')], T + 3600, p, { dt: 10 });
  const arms = { i: roc(P), c: roc(XA) };
  const t25 = (rows: Row[]) => Math.round(firstAt(rows, T + 300, (r) => (r.t1 as number) >= 0.25) / 6) / 10 + 5;
  add({ id: 'BF-09a', tier: 'P2', ctx: 'X-A GA vent, profile K 2.5', state: 'hypokalaemia 2.5', intv: 'the state: ECG (U waves, T flattening) and ectopy', sys: 'RHY BLD',
    arms, measure: (R) => m({ k: v(R.i!.rows, 'k', T), ecgK: v(R.i!.rows, 'ecgK', T), qrs: v(R.i!.rows, 'qrs', T), rhythms: R.i!.rhythms.map(([t, id]) => `${t}s ${id}`).join(',') }),
    expect: [{ m: 'ecgK', lo: 2.2, hi: 2.8, src: 'K 2.5: U waves, T flattening, ST depression (Mattu 2000; Stage 5.1 morphology from K < 3.5)' }],
    owner: '7c pipeline.ts bloodEcgTargets (profile K)', hand: { verdict: 'WR', why: 'the ECG shows K 4.2 for a plasma K of 2.5: bloodEcgTargets pushes only the CHANGE from the profile set point (blood/pipeline.ts:210, engine.ts:855–866), so a profile hypo/hyperkalaemia never reaches the ECG; no ectopy mechanism exists either' } });
  add({ id: 'BF-09b', tier: 'P2', ctx: 'X-A GA vent, profile K 2.5', state: 'hypokalaemia 2.5', intv: 'rocuronium 0.6 mg/kg: clinical duration (T1 25 %) vs normokalaemia', sys: 'NEU',
    arms, measure: (R) => { const a = t25(R.i!.rows); const b = t25(R.c!.rows); return m({ t25LowK: a, t25Normal: b, dMin: Math.round((a - b) * 10) / 10 }); },
    expect: [{ m: 'dMin', dir: 1, tol: 1, src: 'hypokalaemia potentiates and prolongs non-depolarising block (Miller 10e ch. 27; research/12 BF-09)' }],
    owner: '7f neuro/interactions.ts (no K term)' });
}

// ---- BF-10: hypomagnesaemia and torsades → MgSO4 2 g --------------------------------------------------------------------
{
  const P = { blood: { mg: 0.5 } };
  const arms = { i: G([[T, A.rhythm('torsades'), 'torsades'], d(T + 60, 'magnesium', 2, 'g', { overS: 120 })], T + 1200, P), c: G([[T, A.rhythm('torsades'), 'torsades']], T + 1200, P) };
  add({ id: 'BF-10a', tier: 'P2', ctx: 'X-A GA vent, profile Mg 0.5', state: 'hypomagnesaemia with torsades de pointes', intv: 'magnesium sulfate 2 g over 2 min: termination', sys: 'RHY CIRC',
    arms, measure: (R) => m({ rhythmsI: R.i!.rhythms.map(([t, id]) => `${t}s ${id}`).join(','), rhythmsC: R.c!.rhythms.map(([t, id]) => `${t}s ${id}`).join(','),
      convertedS: (() => { const s = R.i!.rhythms.find(([t, id]) => t > T + 60 && (id === 'sinus' || id === 'sinusTachy')); return s ? s[0] - (T + 60) : NaN; })() }),
    expect: [{ m: 'convertedS', lo: 5, hi: 300, src: 'MgSO4 2 g terminates torsades within minutes (ERC 2021 ALS; research/12 BF-10)' }],
    owner: '7g hooks.ts' });
  add({ id: 'BF-10b', tier: 'P2', ctx: 'X-A GA vent, profile Mg 0.5', state: 'hypomagnesaemia', intv: 'magnesium sulfate 2 g: plasma Mg at 15 min', sys: 'BLD',
    arms, measure: (R) => m({ mgBase: v(R.c!.rows, 'mg', T), dMg15: dAt(R.i!.rows, R.c!.rows, 'mg', T + 60 + 900), dMgPeak: dMax(R.i!.rows, R.c!.rows, 'mg', T, T + 1200) }),
    expect: [{ m: 'dMg15', lo: 0.3, hi: 0.8, src: '2 g MgSO4 = 8.1 mmol into ≈ 14 L ECF → +0.58, then redistribution (Miller 10e ch. 47; research/12 BF-10)' }],
    dirOnly: true, owner: '7c pipeline.ts observeDoses' });
}

// ---- BF-11: hyponatraemia from glycine absorption ------------------------------------------------------------------------
{
  const arms = { i: AW([fl(T, 'glycine', 3000, 1800)], T + 1800 + 2 * H, XA, { dt: 15 }), c: AW([], T + 1800 + 2 * H, XA, { dt: 15 }) };
  add({ id: 'BF-11a', tier: 'P2', ctx: 'X-A awake (TURP under spinal)', state: 'glycine 1.5 % absorption 3 L in 30 min', intv: 'the state: plasma Na and osmolality', sys: 'BLD CIRC',
    arms, measure: (R) => m({ naMin: mn(R.i!.rows, 'na', T, T + 1800 + 2 * H), naEnd: v(R.i!.rows, 'na', T + 1800), osmEnd: v(R.i!.rows, 'osm', T + 1800), osm2h: v(R.i!.rows, 'osm', T + 1800 + 2 * H), dMapPeak: dMax(R.i!.rows, R.c!.rows, 'map', T, T + 1800), dHrMin: dMin(R.i!.rows, R.c!.rows, 'hr', T, T + 1800) }),
    expect: [{ m: 'naMin', lo: 115, hi: 125, src: 'TURP syndrome: 3 L glycine absorbed → Na ≈ 120 (Hahn 2006 BJA 96:8; research/12 RH-23)' }],
    owner: '7c fluids.ts / solutes.ts' });
  add({ id: 'BF-11b', tier: 'P2', ctx: 'X-A awake', state: 'glycine absorption 3 L', intv: 'the same: CNS signs (brain water, ICP, consciousness)', sys: 'BRN NEU',
    arms, measure: (R) => m({ dIcp2h: dAt(R.i!.rows, R.c!.rows, 'icp', T + 1800 + 2 * H), dIcpMax: dMax(R.i!.rows, R.c!.rows, 'icp', T, T + 1800 + 2 * H), osm2h: v(R.i!.rows, 'osm', T + 1800 + 2 * H) }),
    expect: [{ m: 'dIcpMax', dir: 1, tol: 1, src: 'hypo-osmolality swells the brain: confusion, seizures, raised ICP (Hahn 2006; Barash TURP syndrome)' }],
    owner: '7d brain/model.ts (reads osmotherapy only)', hand: { verdict: 'MI', why: 'the brain model reads only mannitol/hypertonic-saline doses (brain/model.ts:81–95), never plasma osmolality or Na, so hyponatraemic brain swelling and its CNS signs do not exist' } });
}

// ---- BF-32: carbon monoxide poisoning (added by the run brief; P2) --------------------------------------------------------
{
  const P = { blood: { cohb: 0.3 } };
  const arms = { i: AW([[T, A.spont(1.0), 'face mask FiO2 1.0'], [T, A.lab('abg', 30), 'ABG 0'], [T + H, A.lab('abg', 30), 'ABG 60 min']], T + H + 120, P, { dt: 10 }),
    c: AW([[T, A.spont(1.0), 'face mask FiO2 1.0']], T + H + 120, XA, { dt: 10 }) };
  add({ id: 'BF-32a', tier: 'P2', ctx: 'X-A awake spontaneous', state: 'CO poisoning, COHb 30 % (profile)', intv: 'pulse oximetry vs co-oximetry; O2 content', sys: 'DEV BLD',
    arms, measure: (R) => { const L = R.i!.labs.filter((x) => x.panel === 'abg'); return m({ spo2: v(R.i!.rows, 'spo2', T - 10), so2Fractional: L[0]?.values.so2 ?? NaN, cohb0: L[0]?.values.cohb ?? NaN, cao2Ratio: Math.round((v(R.i!.rows, 'cao2', T - 10) / v(R.c!.rows, 'cao2', T - 10)) * 100) / 100, lact: v(R.i!.rows, 'lact', T + H) }); },
    expect: [{ m: 'spo2', lo: 94, hi: 100, src: 'Barker & Tremper 1987 Anesthesiology 66:677 (SpO2 ≈ HbO2 + COHb: the oximeter over-reads)' },
      { m: 'cao2Ratio', lo: 0.6, hi: 0.8, src: 'COHb 30 % removes ≈ 30 % of the O2-carrying Hb (Hampson 2012 AJRCCM 186:1095)' }],
    owner: '7c odc.ts / FU-5 pulse oximetry' });
  add({ id: 'BF-32b', tier: 'P2', ctx: 'X-A awake spontaneous, FiO2 1.0', state: 'CO poisoning, COHb 30 %', intv: 'normobaric O2 for 60 min: COHb elimination', sys: 'BLD',
    arms, measure: (R) => { const L = R.i!.labs.filter((x) => x.panel === 'abg'); const a = L[0]?.values.cohb ?? NaN; const b = L[1]?.values.cohb ?? NaN; return m({ cohb0: a, cohb60: b, ratio60: Math.round((b / a) * 100) / 100 }); },
    expect: [{ m: 'ratio60', lo: 0.4, hi: 0.65, src: 'COHb t½ 74 ± 25 min on FiO2 1.0 (Weaver 2000 Chest 117:801): 60 min → 0.4–0.65 of the start' }],
    owner: '7c odc.ts / 3 gas (no CO kinetics)', known: 'audit 09 R11' });
}

// ---- BF-23: methaemoglobinaemia (P3) ------------------------------------------------------------------------------------
add({ id: 'BF-23', tier: 'P3', ctx: 'X-A awake spontaneous, FiO2 0.5', state: 'methaemoglobinaemia 30 % (profile)', intv: 'methylene blue 2 mg/kg', sys: 'BLD DEV',
  arms: { p: AW([[T - 200, A.spont(0.5), 'FiO2 0.5'], raw(T, { kind: 'drug', drugId: 'methyleneBlue', dose: 2, unit: 'mg/kg', route: 'iv' }, 'methylene blue 2 mg/kg')], T + 600, { blood: { methb: 0.3 } }) },
  measure: (R) => m({ spo2: v(R.p!.rows, 'spo2', T - 10), sao2: v(R.p!.rows, 'sao2', T - 10), pao2: Math.round(v(R.p!.rows, 'pao2', T - 10)) }),
  expect: [], ne: 'methylene blue is not in the library and MetHb has no kinetics (static profile fraction)', owner: 'FU-7 (drug) / 7c odc.ts' });

// ---- MANUAL twins (direction-only; Q9 open) ----------------------------------------------------------------------------
add({ id: 'BF-M1', tier: 'P1', ctx: 'X-A GA vent MANUAL', state: 'class III (1500 mL / 10 min)', intv: "Ringer's lactate 1 L over 30 min (MODELED twin BF-02b)", sys: 'CIRC',
  arms: { i: G([...CL3, fl(TB, 'rl', 1000, 1800)], TB + 2400, XA, { mode: 'manual', dt: 10 }), c: G([...CL3], TB + 2400, XA, { mode: 'manual', dt: 10 }) },
  measure: (R) => m({ mapBase: Math.round(v(R.c!.rows, 'map', TB)), dMap: Math.round(v(R.i!.rows, 'map', TB + 1800) - v(R.c!.rows, 'map', TB + 1800)), dHr: Math.round(v(R.i!.rows, 'hr', TB + 1800) - v(R.c!.rows, 'hr', TB + 1800)), dCvp: dAt(R.i!.rows, R.c!.rows, 'cvp', TB + 1800) }),
  expect: [{ m: 'dMap', dir: 1, tol: 2, src: 'a fluid bolus raises MAP in hypovolaemia (non-reflex physiology; audit 08 Q9)' }],
  dirOnly: true, owner: 'Q9 (MANUAL physiology)' });
add({ id: 'BF-M2', tier: 'P1', ctx: 'X-A GA vent MANUAL', state: 'acute hyperkalaemia ≈ 8.5 (burns 0.633 + succinylcholine)', intv: 'the state (MODELED twin BF-07c): ECG and arrest', sys: 'RHY BLD',
  arms: { i: G([d(T, 'succinylcholine', 1.5, 'mg/kg')], T + 900, { blood: { burns: 0.633 } }, { mode: 'manual', dt: 5 }) },
  measure: (R) => m({ kPeak: mx(R.i!.rows, 'k', T, T + 900), qrsPeak: mx(R.i!.rows, 'qrs', T, T + 900), rhythms: R.i!.rhythms.map(([t, id]) => `${t}s ${id}`).join(',') || 'sinus', arrest: R.i!.rows.some((r) => (r.t as number) > T && (r.pulseless === true || r.noEject === true)) }),
  expect: [{ m: 'qrsPeak', dir: 1, tol: 120, src: 'the K ECG morphology is physiology, shown in MANUAL too (QRS > 120 at K 8.5; Mattu 2000)' }],
  dirOnly: true, owner: 'Q9 / FU-4 G3', fu4: true });
