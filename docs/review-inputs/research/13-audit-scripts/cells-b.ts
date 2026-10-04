// RH group B — the P2/P3 cells (research/12 §5.1 RH-06…14, RH-17…20, RH-22…25) and RH-26 (PEEP → HBF/UO, the brief).
import { A } from './runner.ts';
import type { Row } from './runner.ts';
import { add, AKI, avg, CIRR, CKD, d, dWin, fl, G, H, HEP, iap, inf, m, mn, mx, pctWin, ratio, raw, SEPW, T, TB, TS, tgt, tx, uoKgH, urineMl, v, ven, XA } from './spec.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const r1 = (x: number) => Math.round(x * 10) / 10;

// ---- RH-06: intra-abdominal hypertension 15 / 20 / 25 mmHg ------------------------------------------------------------
{
  const tE = T + 2400;
  const mk = (p: number) => G(p ? [iap(T, p)] : [], tE, XA, { dt: 30, mech: [T + 1800] });
  const arms = { i15: mk(15), i20: mk(20), i25: mk(25), c: mk(0) };
  const w = [T + 1200, tE] as const;
  const uo = (R: Record<string, { rows: Row[] }>, a: string) => uoKgH(R[a]!.rows, ...w);
  add({ id: 'RH-06a', tier: 'P2', ctx: 'X-A GA vent', state: 'IAP 15 / 20 / 25 mmHg (renal event iapMmHg) from 300 s', intv: 'urine output 20–40 min after the IAP step', sys: 'KID',
    arms, measure: (R) => m({ uo0: uo(R, 'c'), uo15: uo(R, 'i15'), uo20: uo(R, 'i20'), uo25: uo(R, 'i25'), uo15Pct: r1(100 * (uo(R, 'i15') / uo(R, 'c') - 1)),
      gfr25: r1(avg(R.i25!.rows, 'gfr', ...w)), rbf25Pct: pctWin(R.i25!.rows, R.c!.rows, 'rbf', ...w), gfr15Pct: pctWin(R.i15!.rows, R.c!.rows, 'gfr', ...w) }),
    expect: [{ m: 'uo15Pct', dir: -1, tol: 15, src: 'WSACS 2013 (Kirkpatrick, Intensive Care Med 39:1190): oliguria from IAP ≈ 15; Barash 9e ch. laparoscopy (renal perfusion ↓ with pneumoperitoneum)' },
      { m: 'uo25', lo: 0, hi: 0.1, src: 'research/12 RH-06 / WSACS: anuria at IAP > 25 (renal filtration gradient MAP − 2·IAP ≈ 45)' }],
    owner: '7d renal/kidney.ts (IAP → renal vein and Bowman)' });
  add({ id: 'RH-06b', tier: 'P2', ctx: 'X-A GA vent', state: 'IAP 15 / 20 / 25 mmHg', intv: 'circulation: cardiac output, SVR, CVP', sys: 'CIRC',
    arms, measure: (R) => m({ co15Pct: pctWin(R.i15!.rows, R.c!.rows, 'co', ...w), co25Pct: pctWin(R.i25!.rows, R.c!.rows, 'co', ...w), svr25Pct: pctWin(R.i25!.rows, R.c!.rows, 'svr', ...w),
      dCvp25: r2(dWin(R.i25!.rows, R.c!.rows, 'cvp', ...w)), dMap25: r2(dWin(R.i25!.rows, R.c!.rows, 'map', ...w)) }),
    expect: [{ m: 'co25Pct', dir: -1, tol: 10, src: 'Barash 9e (laparoscopy / IAH): CO falls (IVC compression, venous return ↓) and SVR rises; WSACS 2013; tables §5.2 `iap` row ("venous return ↓")' },
      { m: 'svr25Pct', dir: 1, tol: 10, src: 'Barash 9e: SVR ↑ with IAP (aortic/splanchnic compression, catecholamines, vasopressin)' }],
    owner: 'new: 7a (IAP → venous return / SVR)' });
  add({ id: 'RH-06c', tier: 'P2', ctx: 'X-A GA vent', state: 'IAP 15 / 20 / 25 mmHg', intv: 'lung mechanics: peak airway pressure and compliance', sys: 'LUNG',
    arms, measure: (R) => m({ dPpeak20: r1(v(R.i20!.rows, 'ppeak', T + 1830) - v(R.c!.rows, 'ppeak', T + 1830)), dPpeak25: r1(v(R.i25!.rows, 'ppeak', T + 1830) - v(R.c!.rows, 'ppeak', T + 1830)),
      crs20Pct: pctWin(R.i20!.rows, R.c!.rows, 'crs', ...w), frc20Pct: pctWin(R.i20!.rows, R.c!.rows, 'frcGa', ...w), ppeak0: r1(v(R.c!.rows, 'ppeak', T + 1830)) }),
    expect: [{ m: 'crs20Pct', dir: -1, tol: 15, src: 'Barash 9e (pneumoperitoneum): respiratory compliance −30–50 %, Ppeak ↑; tables §5.2 `iap` row ("compliance ↓"); WSACS' },
      { m: 'dPpeak20', dir: 1, tol: 3, src: 'as above (Ppeak ↑ at fixed VT)' }],
    owner: 'new: 7b (IAP → chest-wall elastance, FRC)' });
  add({ id: 'RH-06d', tier: 'P2', ctx: 'X-A GA vent', state: 'IAP 20 / 25 mmHg', intv: 'hepatic blood flow', sys: 'LIV',
    arms, measure: (R) => m({ hbf20Pct: pctWin(R.i20!.rows, R.c!.rows, 'hbfRel', ...w), hbf25Pct: pctWin(R.i25!.rows, R.c!.rows, 'hbfRel', ...w), kLac25Pct: pctWin(R.i25!.rows, R.c!.rows, 'kLac', ...w) }),
    expect: [{ m: 'hbf20Pct', dir: -1, tol: 15, src: 'Diebel 1992 J Trauma 33:279 (IAP 20: hepatic arterial and portal flow fall); WSACS 2013 (hepatic hypoperfusion in IAH)' }],
    owner: 'new: 7c hbfRel / 7d liver (IAP term)' });
}

// ---- RH-07: furosemide 20 / 40 mg -----------------------------------------------------------------------------------
{
  const tE = T + 3 * H;
  const arms = { f20: G([d(T, 'furosemide', 20, 'mg')], tE, XA, { dt: 30 }), f40: G([d(T, 'furosemide', 40, 'mg')], tE, XA, { dt: 30 }), c: G([], tE, XA, { dt: 30 }) };
  const onset = (R: Record<string, { rows: Row[] }>, a: string) => { for (const r of R[a]!.rows) { if ((r.t as number) <= T) continue; const c = R.c!.rows.find((x) => x.t === r.t); if (c && (r.uopKgH as number) > 2 * (c.uopKgH as number)) return (r.t as number) - T; } return NaN; };
  add({ id: 'RH-07a', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'furosemide 20 and 40 mg IV at 300 s: diuresis time course', sys: 'KID',
    arms, measure: (R) => m({ onset40S: onset(R, 'f40'), peakT40Min: r1((R.f40!.rows.reduce((b, r) => ((r.uopKgH as number) > (b.uopKgH as number) ? r : b)).t as number - T) / 60),
      peakUo40MlMin: r2((mx(R.f40!.rows, 'uopKgH', T, tE) * 70) / 60), peakUo20MlMin: r2((mx(R.f20!.rows, 'uopKgH', T, tE) * 70) / 60),
      extra2h40: r1(urineMl(R.f40!.rows, T, T + 2 * H) - urineMl(R.c!.rows, T, T + 2 * H)), extra2h20: r1(urineMl(R.f20!.rows, T, T + 2 * H) - urineMl(R.c!.rows, T, T + 2 * H)) }),
    expect: [{ m: 'onset40S', lo: 120, hi: 600, src: 'Miller 10e ch. 17 (renal pharmacology) / furosemide label: IV diuresis within 5 min (onset 5–10 min in research/12)' },
      { m: 'peakT40Min', lo: 15, hi: 45, src: 'label / Miller: peak ≈ 30 min after IV' },
      { m: 'extra2h40', dir: 1, tol: 300, src: 'direction (dose-dependent natriuresis; 40 mg IV in normal kidneys ≈ 1 L in 2–3 h: Brater 1998 NEJM 339:387 — band a proposal)' }],
    owner: '7d renal/model.ts + 7g furosemide row', dirOnly: false });
  add({ id: 'RH-07b', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'furosemide 40 mg: plasma K⁺ at 3 h', sys: 'BLD KID',
    arms, measure: (R) => m({ dK3h: r3x(v(R.f40!.rows, 'k', tE) - v(R.c!.rows, 'k', tE)), dNa3h: r2(v(R.f40!.rows, 'na', tE) - v(R.c!.rows, 'na', tE)), dHco3: r2(v(R.f40!.rows, 'hco3', tE) - v(R.c!.rows, 'hco3', tE)) }),
    expect: [{ m: 'dK3h', dir: -1, tol: 0.1, src: 'Miller 10e ch. 17: loop diuretics cause kaliuresis (K ↓ ≈ 0.3–0.5 after a single dose; Brater 1998) — direction' }],
    owner: '7d organs/pipeline.ts renalSeam (FU-9 A6)', known: 'FU-9 A6 (F6)' });
  add({ id: 'RH-07c', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'furosemide 40 mg: circulating volume and filling pressure', sys: 'CIRC BLD',
    arms, measure: (R) => m({ dBvMl2h: r1(v(R.f40!.rows, 'bv', T + 2 * H) - v(R.c!.rows, 'bv', T + 2 * H)), dCvp2h: r2(dWin(R.f40!.rows, R.c!.rows, 'cvp', T + 5400, T + 7200)),
      dCvp10: r2(dWin(R.f40!.rows, R.c!.rows, 'cvp', T + 300, T + 900)), dMap2h: r2(dWin(R.f40!.rows, R.c!.rows, 'map', T + 5400, T + 7200)), dHb2h: r2(v(R.f40!.rows, 'hb', T + 2 * H) - v(R.c!.rows, 'hb', T + 2 * H)) }),
    expect: [{ m: 'dBvMl2h', dir: -1, tol: 100, src: 'Miller: diuresis contracts the ECF/plasma volume (haemoconcentration)' },
      { m: 'dCvp10', dir: -1, tol: 0.3, src: 'Dikshit 1973 NEJM 288:1087: furosemide venodilates within 5–15 min, before the diuresis (filling pressure ↓)' }],
    owner: '7d renal / 7c fluids / 7g furosemide v0Frac' });
}
const r3x = (x: number) => Math.round(x * 1000) / 1000;

// ---- RH-08: mannitol 1 g/kg ---------------------------------------------------------------------------------------------
{
  const tE = T + 3 * H;
  const arms = { i: G([d(T, 'mannitol', 70000, 'mg')], tE, XA, { dt: 30 }), c: G([], tE, XA, { dt: 30 }) };
  add({ id: 'RH-08a', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'mannitol 1 g/kg IV at 300 s: blood volume course', sys: 'BLD CIRC',
    arms, measure: (R) => m({ dBvPeak: r1(Math.max(...R.i!.rows.filter((r) => (r.t as number) > T && (r.t as number) <= T + H).map((r) => (r.bv as number) - (R.c!.rows.find((x) => x.t === r.t)?.bv as number)))),
      dBv3h: r1(v(R.i!.rows, 'bv', tE) - v(R.c!.rows, 'bv', tE)), dCvpPeak: r2(Math.max(...[T + 300, T + 600, T + 900].map((t) => v(R.i!.rows, 'cvp', t) - v(R.c!.rows, 'cvp', t)))) }),
    expect: [{ m: 'dBvPeak', dir: 1, tol: 100, src: 'Miller 10e ch. 17 / neuro-anaesthesia: mannitol expands the plasma volume transiently (water drawn from cells) before the diuresis' },
      { m: 'dBv3h', dir: -1, tol: 50, src: 'then the osmotic diuresis contracts it (research/12 RH-08)' }],
    owner: '7c fluids (mannitol osmoles) / 7d renal' });
  add({ id: 'RH-08b', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'mannitol 1 g/kg: osmotic diuresis', sys: 'KID',
    arms, measure: (R) => m({ extra1h: r1(urineMl(R.i!.rows, T, T + H) - urineMl(R.c!.rows, T, T + H)), extra3h: r1(urineMl(R.i!.rows, T, tE) - urineMl(R.c!.rows, T, tE)),
      peakUoMlMin: r2((mx(R.i!.rows, 'uopKgH', T, tE) * 70) / 60), mannitolG1h: r1(v(R.i!.rows, 'mannitolG', T + H)) }),
    expect: [{ m: 'extra3h', dir: 1, tol: 500, src: 'Miller 10e ch. 17: mannitol is freely filtered and not reabsorbed; 1 g/kg obligates ≈ 1–1.5 L of urine over 2–3 h (≈ 14–20 mL/g) — direction, band a proposal' }],
    owner: '7d renal/model.ts mannitol', dirOnly: true });
  add({ id: 'RH-08c', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'mannitol 1 g/kg: plasma Na⁺ and osmolality (dilution, then concentration)', sys: 'BLD',
    arms, measure: (R) => m({ dNa15: r2(v(R.i!.rows, 'na', T + 900) - v(R.c!.rows, 'na', T + 900)), dNa3h: r2(v(R.i!.rows, 'na', tE) - v(R.c!.rows, 'na', tE)),
      dOsm15: r2(v(R.i!.rows, 'osm', T + 900) - v(R.c!.rows, 'osm', T + 900)), dOsm3h: r2(v(R.i!.rows, 'osm', tE) - v(R.c!.rows, 'osm', tE)) }),
    expect: [{ m: 'dNa15', dir: -1, tol: 1, src: 'translocational hyponatraemia (Na ↓ ≈ 1.6 per 100 mg/dL mannitol; Miller / Manninen); research/12 RH-08 ("Na dilution then rise")' },
      { m: 'dOsm15', dir: 1, tol: 5, src: 'measured osmolality rises with mannitol (≈ +20–30 mOsm/kg after 1 g/kg; osmolal gap)' },
      { m: 'dNa3h', dir: 1, tol: 0.5, src: 'later Na ↑ as free water is lost in excess of Na (osmotic diuresis) — research/12 RH-08' }],
    owner: '7c solutes (mannitol as an osmole) / 7d renal' });
}

// ---- RH-09: AKI · stored RBC 4 u: K⁺ load and its excretion -----------------------------------------------------------
{
  const tE = T + 3 * H;
  const rig = (p: Record<string, unknown>) => G([tx(T, 'rbc', 4, 1200, { storageDays: 35 })], tE, p, { dt: 60 });
  const arms = { aki: rig(AKI(1)), ok: rig(XA), akiC: G([], tE, AKI(1), { dt: 60 }), okC: G([], tE, XA, { dt: 60 }) };
  const dk = (R: Record<string, { rows: Row[] }>, a: string, c: string, t: number) => r3x(v(R[a]!.rows, 'k', t) - v(R[c]!.rows, 'k', t));
  add({ id: 'RH-09a', tier: 'P2', ctx: 'AKI (aki 1) vs X-A, GA vent', state: 'AKI proxy, normal starting K', intv: '4 u RBC (35 d) over 20 min: peak ΔK⁺', sys: 'BLD KID',
    arms, measure: (R) => m({ dKpeakAki: r3x(Math.max(...[T + 600, T + 1200, T + 1500].map((t) => dk(R, 'aki', 'akiC', t)))), dKpeakOk: r3x(Math.max(...[T + 600, T + 1200, T + 1500].map((t) => dk(R, 'ok', 'okC', t)))),
      gfrAki: r1(avg(R.akiC!.rows, 'gfr', T, tE)), uoAki: uoKgH(R.akiC!.rows, T, tE), uoOk: uoKgH(R.okC!.rows, T, tE) }),
    expect: [{ m: 'dKpeakAki', lo: 0.3, hi: 1.5, src: 'Miller 10e ch. 49 (transfusion): 4 u of 35-day RBC (≈ 5–7 mmol K each) raise K ≈ 0.5–1; tables §5.2 (excretion)' }],
    owner: '7c transfusion K', dirOnly: true });
  add({ id: 'RH-09b', tier: 'P2', ctx: 'AKI (aki 1) vs X-A, GA vent', state: 'AKI proxy', intv: '4 u RBC (35 d): ΔK⁺ at 3 h (renal excretion of the load)', sys: 'BLD KID',
    arms, measure: (R) => m({ dK3hAki: dk(R, 'aki', 'akiC', tE), dK3hOk: dk(R, 'ok', 'okC', tE), akiMinusOk: r3x(dk(R, 'aki', 'akiC', tE) - dk(R, 'ok', 'okC', tE)) }),
    expect: [{ m: 'akiMinusOk', dir: 1, tol: 0.05, src: 'Miller 10e ch. 17/49: the kidney excretes ≈ 90 % of a K load over hours; in AKI the load persists (research/12 RH-09 "slower excretion")' }],
    owner: '7d renalSeam K / 7c set point (FU-9 A6)', known: 'FU-9 A6 (F6)' });
}

// ---- RH-10: CKD proxy · rocuronium 0.6 → sugammadex 2 mg/kg ---------------------------------------------------------
{
  const tE = T + 2 * H;
  const t25 = (rows: Row[]) => { let dropped = false; for (const r of rows) { if ((r.t as number) <= T) continue; const t1 = r.t1 as number; if (t1 < 0.1) dropped = true; if (dropped && t1 >= 0.25) return r2(((r.t as number) - T) / 60); } return NaN; };
  const armsR = { ckd: G([d(T, 'rocuronium', 0.6, 'mg/kg')], tE, CKD, { dt: 15 }), ok: G([d(T, 'rocuronium', 0.6, 'mg/kg')], tE, XA, { dt: 15 }) };
  add({ id: 'RH-10a', tier: 'P2', ctx: 'CKD proxy (aki 1 + K 5.5, Hb 10, HCO3 20) vs X-A, GA vent', state: 'renal failure (proxy for CKD 5)', intv: 'rocuronium 0.6 mg/kg: time to T1 25 %', sys: 'PK NEU',
    arms: armsR, measure: (R) => m({ t25Ckd: t25(R.ckd!.rows), t25Ok: t25(R.ok!.rows), ratio: ratio(t25(R.ckd!.rows), t25(R.ok!.rows)), fCkd: r2(avg(R.ckd!.rows, 'f_rocuronium', T, T + H)), gfrRelCkd: r2(avg(R.ckd!.rows, 'gfrRel', T, T + H)) }),
    expect: [{ m: 'ratio', lo: 1.3, hi: 1.5, src: 'research/12 RH-10 (×1.3–1.5); Miller 10e ch. 27 (NMB): rocuronium clearance −33–39 % in renal failure (Cooper 1993 BJA 71:222), duration prolonged' }],
    owner: '7g clFactor (renal share 0.3 of rocuronium) / 7d aki GFR' });
  // resume fix: the first run sent a TOF `device` command, which main rejects (as BF-09 found); T1/TOF come from the
  // 1 Hz `anaesthesia` truth event without it
  const tS = T + 1500; // sugammadex at ≈ T2 reappearance
  const armsS = { ckd: G([d(T, 'rocuronium', 0.6, 'mg/kg'), d(tS, 'sugammadex', 2, 'mg/kg')], tS + 2 * H, CKD, { dt: 10 }),
    ok: G([d(T, 'rocuronium', 0.6, 'mg/kg'), d(tS, 'sugammadex', 2, 'mg/kg')], tS + 2 * H, XA, { dt: 10 }) };
  const t90 = (rows: Row[]) => { const r = rows.find((x) => (x.t as number) > tS && (x.tofR as number) >= 0.9); return r ? r2(((r.t as number) - tS) / 60) : NaN; };
  const recur = (rows: Row[]) => { const i = rows.findIndex((x) => (x.t as number) > tS && (x.tofR as number) >= 0.9); return i >= 0 && rows.slice(i).some((x) => Number.isFinite(x.tofR as number) && (x.tofR as number) < 0.85); };
  add({ id: 'RH-10b', tier: 'P2', ctx: 'CKD proxy vs X-A, GA vent', state: 'renal failure; rocuronium 0.6 mg/kg 25 min before', intv: 'sugammadex 2 mg/kg: time to TOFR 0.9 and re-curarisation over 2 h', sys: 'PK NEU',
    arms: armsS, measure: (R) => m({ t90Ckd: t90(R.ckd!.rows), t90Ok: t90(R.ok!.rows), ratio: ratio(t90(R.ckd!.rows), t90(R.ok!.rows)), recurCkd: recur(R.ckd!.rows), recurOk: recur(R.ok!.rows),
      tofCountAtS: v(R.ckd!.rows, 'tofC', tS), tofRend: v(R.ckd!.rows, 'tofR', tS + 2 * H) }),
    expect: [{ m: 'ratio', lo: 1.0, hi: 1.5, src: 'Panhuizen 2015 BJA 114:777 (sugammadex 2 mg/kg in severe renal impairment: TOFR 0.9 in ≈ 2.0 vs 1.6 min); Staals 2008 BJA 101:492' },
      { m: 'recurCkd', event: false, src: 'Staals 2010 / Panhuizen 2015: no recurarisation although the complex is not cleared' }],
    owner: '7g nmb.ts (sugammadex binding, renal clearance)' });
  add({ id: 'RH-10c', tier: 'P2', ctx: 'CKD 5', state: 'renal failure', intv: 'morphine 10 mg: M6G/M3G accumulation', sys: 'PK', arms: {}, expect: [],
    owner: 'FU-7 (active metabolites; DI-38)', ne: 'no active-metabolite model: morphine is a gamma effect curve with no renal term (research/14 DI-38 NE; research/11 §3)' });
}

// ---- RH-11: AKI proxy (normal K) · succinylcholine ------------------------------------------------------------------
{
  const tE = T + 1800;
  const arms = { aki: G([d(T, 'succinylcholine', 1.5, 'mg/kg')], tE, AKI(1), { dt: 15 }), ok: G([d(T, 'succinylcholine', 1.5, 'mg/kg')], tE, XA, { dt: 15 }) };
  add({ id: 'RH-11', tier: 'P2', ctx: 'AKI (aki 1, K 4.2) vs X-A, GA vent', state: 'renal failure without neuropathy, normal K', intv: 'succinylcholine 1.5 mg/kg: peak ΔK⁺', sys: 'BLD RHY',
    arms, measure: (R) => { const pk = (a: string) => r3x(mx(R[a]!.rows, 'k', T, tE) - v(R[a]!.rows, 'k', T - 5)); return m({ dKAki: pk('aki'), dKOk: pk('ok'), akiMinusOk: r3x(pk('aki') - pk('ok')), k0Aki: v(R.aki!.rows, 'k', T - 5) }); },
    expect: [{ m: 'dKAki', lo: 0.3, hi: 0.9, src: 'Thapa & Brull 2000 Anesth Analg 91:237: renal failure has the normal +0.5 rise (not exaggerated)' },
      { m: 'akiMinusOk', quiet: true, tol: 0.2, src: 'as above (state-dependence: none)' }],
    owner: '7c succinylcholine K' });
}

// ---- RH-12: hepatic failure 0.8 · 2 h GA -------------------------------------------------------------------------------
{
  const tE = 2 * H;
  const arms = { hf: G([], tE, HEP(0.8), { dt: 60 }), ok: G([], tE, XA, { dt: 60 }) };
  add({ id: 'RH-12a', tier: 'P2', ctx: 'hepaticFailure 0.8 vs X-A, GA vent', state: 'hepatic failure (7d condition 0.8)', intv: 'GA 2 h: lactate and its clearance', sys: 'LIV BLD',
    arms, measure: (R) => m({ lactHf: r2(v(R.hf!.rows, 'lact', tE)), lactOk: r2(v(R.ok!.rows, 'lact', tE)), lactHf0: r2(v(R.hf!.rows, 'lact', 60)), kLacHf: r2(avg(R.hf!.rows, 'kLac', H, tE)), kLacOk: r2(avg(R.ok!.rows, 'kLac', H, tE)),
      liverFn: r2(v(R.hf!.rows, 'liverFn', tE)), coreLiver: r2(v(R.hf!.rows, 'coreLiver', tE)) }),
    expect: [{ m: 'lactHf', lo: 1.5, hi: 3.5, src: 'tables §5.3 `kLac` (×0.3 in liver failure → steady lactate ≈ 3.3; the split row → ≈ 1.7); Miller 10e ch. 16 (liver disease: impaired lactate clearance, hyperlactataemia)' }],
    owner: '7c oxygen.ts stepLactate / 7d liver' });
  add({ id: 'RH-12b', tier: 'P2', ctx: 'hepaticFailure 0.8 vs X-A, GA vent', state: 'hepatic failure, fasting', intv: 'GA 2 h: plasma glucose', sys: 'LIV END',
    arms, measure: (R) => m({ gluHf: r2(v(R.hf!.rows, 'gluMmol', tE)), gluOk: r2(v(R.ok!.rows, 'gluMmol', tE)), glucoseF: r2(v(R.hf!.rows, 'glucoseF', tE)) }),
    expect: [{ m: 'gluHf', lo: 2.5, hi: 4.5, invert: true, src: 'tables §5.3 / Miller 10e ch. 16: failing gluconeogenesis and glycogen stores → fasting hypoglycaemia in fulminant/Child C failure' }],
    owner: '7e glucose (liverF) / 7d glucoseF', known: 'CM C11' });
  add({ id: 'RH-12c', tier: 'P2', ctx: 'hepaticFailure 0.8', state: 'hepatic failure', intv: 'INR / coagulopathy', sys: 'COAG', arms: { hf: arms.hf }, measure: (R) => m({ inr: r2(v(R.hf!.rows, 'inr', tE)) }), expect: [],
    owner: '7i (v1.1)', ne: 'the liver INR is the placeholder 1 + 2·failure and nothing reads it (research/11 §4.9); no coagulation model — 7i (R58/R60 v1.1)' });
  const tD = T; const tR = T + H;
  const armsD = { mHf: G([d(tD, 'midazolam', 0.05, 'mg/kg')], tR + 60, HEP(0.8), { dt: 30 }), mOk: G([d(tD, 'midazolam', 0.05, 'mg/kg')], tR + 60, XA, { dt: 30 }),
    fHf: G([d(tD, 'fentanyl', 2, 'mcg/kg')], tR + 60, HEP(0.8), { dt: 30 }), fOk: G([d(tD, 'fentanyl', 2, 'mcg/kg')], tR + 60, XA, { dt: 30 }) };
  add({ id: 'RH-12d', tier: 'P2', ctx: 'hepaticFailure 0.8 vs X-A, GA vent', state: 'hepatic failure', intv: 'midazolam 0.05 mg/kg: level at 60 min (low-extraction hepatic clearance)', sys: 'PK LIV',
    arms: armsD, measure: (R) => m({ ce60Ratio: ratio(v(R.mHf!.rows, 'c_midazolam', tR), v(R.mOk!.rows, 'c_midazolam', tR)), ce20Ratio: ratio(v(R.mHf!.rows, 'c_midazolam', tD + 1200), v(R.mOk!.rows, 'c_midazolam', tD + 1200)), fHf: v(R.mHf!.rows, 'f_midazolam', tR) }),
    expect: [{ m: 'ce60Ratio', lo: 1.3, hi: 2.5, src: 'MacGilchrist 1986 Gut 27:190 (cirrhosis: midazolam clearance ≈ halved, t½ doubled); Miller 10e ch. 16/23' }],
    owner: '7g gamma rows (no clearance factor)' });
  add({ id: 'RH-12e', tier: 'P2', ctx: 'hepaticFailure 0.8 vs X-A, GA vent', state: 'hepatic failure', intv: 'fentanyl 2 µg/kg: level at 60 min (high extraction: flow-, not function-limited)', sys: 'PK LIV',
    arms: armsD, measure: (R) => m({ ce60Ratio: ratio(v(R.fHf!.rows, 'c_fentanyl', tR), v(R.fOk!.rows, 'c_fentanyl', tR)), fHf: r2(avg(R.fHf!.rows, 'f_fentanyl', tD, tR)), fOk: r2(avg(R.fOk!.rows, 'f_fentanyl', tD, tR)), ce60RatioM1: NaN }),
    expect: [{ m: 'ce60Ratio', lo: 0.85, hi: 1.25, src: 'Haberer 1982 BJA 54:1267 (fentanyl PK unchanged in cirrhosis: high extraction, flow-limited); Miller 10e ch. 16' }],
    owner: '7g clFactor (highExtraction → hepFlow only)' });
}

// ---- RH-13: hepatic failure · Ringer's lactate 2 L ------------------------------------------------------------------------
{
  const tE = T + 1800 + 1800;
  const arms = { hf: G([fl(T, 'rl', 2000, 1800)], tE, HEP(0.8), { dt: 30 }), hfC: G([], tE, HEP(0.8), { dt: 30 }), ok: G([fl(T, 'rl', 2000, 1800)], tE, XA, { dt: 30 }), okC: G([], tE, XA, { dt: 30 }) };
  const dl = (R: Record<string, { rows: Row[] }>, a: string, c: string, t: number) => r2(v(R[a]!.rows, 'lact', t) - v(R[c]!.rows, 'lact', t));
  add({ id: 'RH-13', tier: 'P2', ctx: 'hepaticFailure 0.8 vs X-A, GA vent', state: 'hepatic failure', intv: "Ringer's lactate 2 L over 30 min: lactate at the end of the infusion", sys: 'LIV BLD',
    arms, measure: (R) => m({ dLactHf: dl(R, 'hf', 'hfC', T + 1800), dLactOk: dl(R, 'ok', 'okC', T + 1800), dLactHf60: dl(R, 'hf', 'hfC', tE), hfMinusOk: r2(dl(R, 'hf', 'hfC', T + 1800) - dl(R, 'ok', 'okC', T + 1800)) }),
    expect: [{ m: 'dLactHf', lo: 0.5, hi: 1.0, src: 'research/12 RH-13 (lactate +0.5–1: the lactate load is not cleared); Miller 10e ch. 16' },
      { m: 'hfMinusOk', dir: 1, tol: 0.1, src: 'the same load is cleared by a healthy liver (Didwania 1997 CCM 25:1851: RL does not raise lactate in health)' }],
    owner: '7c fluids (RL lactate) / oxygen.ts stepLactate' });
}

// ---- RH-14: cirrhosis Child C · propofol (NE: no cirrhosis profile; CM-10a/b probes) ----------------------------------
{
  const tE = T + 900;
  const arms = { hf: G([d(T, 'propofol', 2, 'mg/kg')], tE, CIRR, { dt: 5 }), ok: G([d(T, 'propofol', 2, 'mg/kg')], tE, { ageY: 55 }, { dt: 5 }) };
  add({ id: 'RH-14a', tier: 'P2', ctx: 'Child C proxy (hepaticFailure 0.8 + albumin 25, 55 y) vs 55 y', state: 'cirrhosis Child C', intv: 'none: resting circulation (hyperdynamic, low SVR)', sys: 'CIRC',
    arms, measure: (R) => m({ coPct: pctWin(R.hf!.rows, R.ok!.rows, 'co', 60, T), svrPct: pctWin(R.hf!.rows, R.ok!.rows, 'svr', 60, T) }), expect: [],
    owner: 'FU-7 profile (cirrhosis) — research/19 C10', ne: 'no cirrhosis profile: the hepaticFailure proxy leaves CO and SVR unchanged (research/19 CM-10a; research/12 §5.11 missing profiles)' });
  add({ id: 'RH-14b', tier: 'P2', ctx: 'Child C proxy vs 55 y', state: 'cirrhosis Child C', intv: 'propofol 2 mg/kg: MAP fall vs healthy', sys: 'CIRC PK',
    arms, measure: (R) => m({ mapPctHf: r1(100 * (mn(R.hf!.rows, 'map', T, tE) / v(R.hf!.rows, 'map', T - 5) - 1)), mapPctOk: r1(100 * (mn(R.ok!.rows, 'map', T, tE) / v(R.ok!.rows, 'map', T - 5) - 1)) }), expect: [],
    owner: 'FU-7 profile (cirrhosis) / 7g protein binding', ne: 'no cirrhosis profile and no protein binding (free fraction) in 7g (research/19 CM-10b; research/22 F13b)' });
}

// ---- RH-17: warm septic shock 2 h: AKI and lactate --------------------------------------------------------------------
{
  // resume fix: the first run stopped at 2 h, when 1.75 h of anuria × time scale 3 = 5.25 KDIGO-hours (< 6): the arms now
  // run 3 h so the stage can be read against the KDIGO clock (the 2-h readouts are unchanged)
  const tE = 3 * H + 60;
  const arms = { s: G([[1, A.renal({ timeScale: 3 }), 'KDIGO time scale 3'], ...SEPW], tE, XA, { dt: 60 }), c: G([[1, A.renal({ timeScale: 3 }), 'KDIGO time scale 3']], tE, XA, { dt: 60 }) };
  const t2 = 2 * H + 60;
  add({ id: 'RH-17a', tier: 'P2', ctx: 'X-A GA vent (KDIGO windows ÷ 3)', state: 'septic shock warm (7e sepsis 1 warm at 60 s)', intv: '2 h untreated: UO, GFR, KDIGO stage', sys: 'KID',
    arms, measure: (R) => m({ uoH2: uoKgH(R.s!.rows, H + 60, t2), uoCtlH2: uoKgH(R.c!.rows, H + 60, t2), gfrPct: pctWin(R.s!.rows, R.c!.rows, 'gfr', H, t2), rbfPct: pctWin(R.s!.rows, R.c!.rows, 'rbf', H, t2),
      akiStage2h: v(R.s!.rows, 'aki', t2), akiStage: v(R.s!.rows, 'aki', tE), tStage1Min: (() => { const r = R.s!.rows.find((x) => (x.aki as number) >= 1); return r ? r1((r.t as number) / 60) : NaN; })(),
      firstOligMin: (() => { const r = R.s!.rows.find((x) => (x.t as number) > 600 && (x.uopKgH as number) < 0.5 && (x.map as number) < 65); return r ? r1((r.t as number) / 60) : NaN; })(),
      akiStageCtl: v(R.c!.rows, 'aki', tE), map: r1(avg(R.s!.rows, 'map', H, t2)), co: r2(avg(R.s!.rows, 'co', H, t2)), sepStage: v(R.s!.rows, 'sepStage', t2) }),
    expect: [{ m: 'akiStage', lo: 1, hi: 2, src: 'research/12 RH-17 (AKI stage 1–2 develops); KDIGO 2012 UO criterion (< 0.5 mL/kg/h ≥ 6 h = stage 1; teaching time scale 3)' },
      { m: 'gfrPct', dir: -1, tol: 20, src: 'Langenberg 2005 Kidney Int (septic AKI: GFR falls even when RBF is preserved or high); Sepsis-3' },
      { m: 'akiStageCtl', quiet: true, tol: 0, src: 'the healthy GA control must not reach a KDIGO stage (quiet)' }],
    owner: '7d renal (sepsis term) / RH-01 GA baseline' });
  add({ id: 'RH-17b', tier: 'P2', ctx: 'X-A GA vent', state: 'septic shock warm', intv: '2 h untreated: lactate and lactate clearance', sys: 'LIV BLD',
    arms, measure: (R) => m({ lact60: r2(v(R.s!.rows, 'lact', H)), lact120: r2(v(R.s!.rows, 'lact', t2)), kLacPct: pctWin(R.s!.rows, R.c!.rows, 'kLac', H, t2), hbfPct: pctWin(R.s!.rows, R.c!.rows, 'hbfRel', H, t2) }),
    expect: [{ m: 'lact60', lo: 3, hi: 4, src: 'tables §7 check 16 (warm septic shock lactate 3–4); Sepsis-3 (septic shock lactate > 2)' },
      { m: 'kLacPct', dir: -1, tol: 10, src: 'research/12 RH-17 (lactate clearance ↓ in sepsis: Levraut 1998 AJRCCM 157:1021)' }],
    owner: '7e sepsis → 7c lactate / hbfRel' });
}

// ---- RH-18, RH-19, RH-24: not expressible (probes record the rejection) -------------------------------------------------
add({ id: 'RH-18', tier: 'P3', ctx: 'X-A', state: 'crush / rhabdomyolysis', intv: 'the state: K ↑, AKI, myoglobinuria', sys: 'BLD KID',
  arms: { p: G([raw(T, { kind: 'condition', id: 'rhabdomyolysis', severity: 1 }, 'condition rhabdomyolysis')], T + 60, XA, { dt: 30 }) }, measure: () => ({}), expect: [],
  owner: '7i / FU-7', ne: 'no rhabdomyolysis state (condition id rejected; no myoglobin, no creatinine) — research/12 blocker' });
add({ id: 'RH-19', tier: 'P3', ctx: 'cirrhosis', state: 'hepatorenal physiology', intv: 'oliguria with normal volume (renal vasoconstriction)', sys: 'KID',
  arms: { p: G([raw(T, { kind: 'condition', id: 'hepatorenal', severity: 1 }, 'condition hepatorenal')], T + 60, XA, { dt: 30 }) }, measure: () => ({}), expect: [],
  owner: 'FU-7 (cirrhosis profile)', ne: 'no hepatorenal state or cirrhosis profile (condition id rejected)' });
for (const [id, what] of [['RH-24a', 'KDIGO creatinine criterion (≥ 1.5× baseline / +26.5 µmol/L in 48 h)'], ['RH-24b', 'creatinine lags the GFR fall by hours (Moran & Myers)']] as const) {
  add({ id, tier: 'P2', ctx: 'AKI (aki 1)', state: 'AKI over 24 h', intv: what, sys: 'KID BLD', arms: {}, expect: [],
    owner: '7i (v1.1)', ne: 'no creatinine or urea (research/11 §2.9 "absent"; B30) — 7i (R58/R60 v1.1)' });
}

// ---- RH-20: core 33 °C ----------------------------------------------------------------------------------------------
{
  const tE = T + 2 * H;
  const cool = tgt(T - 240, 'tempCore', 33, 600);
  const arms = { h: G([cool, d(T + 600, 'fentanyl', 2, 'mcg/kg')], tE, XA, { dt: 30 }), n: G([d(T + 600, 'fentanyl', 2, 'mcg/kg')], tE, XA, { dt: 30 }) };
  const w = [T + 600, T + 2400] as const;
  add({ id: 'RH-20a', tier: 'P2', ctx: 'X-A GA vent', state: 'core 33 °C (setTarget tempCore over 10 min) vs normothermic GA', intv: 'fentanyl 2 µg/kg at 900 s: clearance factor and level at 60 min', sys: 'PK',
    arms, measure: (R) => { const dT = avg(R.h!.rows, 'temp', ...w) - avg(R.n!.rows, 'temp', ...w); const f = avg(R.h!.rows, 'f_fentanyl', ...w) / avg(R.n!.rows, 'f_fentanyl', ...w);
      return m({ dTempC: r2(dT), fRatio: r2(f), pctPerC: r1((100 * (f - 1)) / -dT), ce60Ratio: ratio(v(R.h!.rows, 'c_fentanyl', T + 600 + H), v(R.n!.rows, 'c_fentanyl', T + 600 + H)) }); },
    expect: [{ m: 'pctPerC', lo: -10, hi: -7, src: 'research/12 RH-20 / tables §5.3 `clearTemp` (−10 %/°C; range −7 to −22 %/°C, Tortorici 2007 Crit Care Med 35:2196)' }],
    owner: '7g clFactor temperature term (−5 %/°C) × hbfRel' });
  add({ id: 'RH-20b', tier: 'P2', ctx: 'X-A GA vent', state: 'core 33 °C vs normothermic GA', intv: 'lactate clearance', sys: 'LIV BLD',
    arms, measure: (R) => m({ kLacPct: pctWin(R.h!.rows, R.n!.rows, 'kLac', ...w), tempF: r2(avg(R.h!.rows, 'tempF', ...w)), dLact2h: r2(v(R.h!.rows, 'lact', tE) - v(R.n!.rows, 'lact', tE)), coreLiverRatio: r2(avg(R.h!.rows, 'coreLiver', ...w) / avg(R.n!.rows, 'coreLiver', ...w)) }),
    expect: [{ m: 'kLacPct', dir: -1, tol: 15, src: 'tables §5.3 `clearTemp` (−10 %/°C on hepatic clearance); research/12 RH-20 (lactate clearance ↓)' }],
    owner: '7d liver tempF → 7c core.liver' });
  add({ id: 'RH-20c', tier: 'P2', ctx: 'X-A GA vent', state: 'core 33 °C vs normothermic GA', intv: 'urine output (cold diuresis)', sys: 'KID',
    arms, measure: (R) => m({ uoCold: uoKgH(R.h!.rows, ...w), uoNorm: uoKgH(R.n!.rows, ...w), uoPct: r1(100 * (uoKgH(R.h!.rows, ...w) / uoKgH(R.n!.rows, ...w) - 1)), dMap: r2(dWin(R.h!.rows, R.n!.rows, 'map', ...w)), coPct: pctWin(R.h!.rows, R.n!.rows, 'co', ...w) }),
    expect: [{ m: 'uoPct', dir: 1, tol: 10, src: 'Miller 10e ch. (thermoregulation) / Polderman 2009 Crit Care Med 37:S186: mild hypothermia causes cold diuresis (tubular dysfunction, ADH resistance, central volume shift)' }],
    owner: 'new: 7d renal (no temperature input)' });
}

// ---- RH-22: warm septic shock · noradrenaline -------------------------------------------------------------------------
{
  const tE = TS + H;
  const arms = { c: G([...SEPW], tE, XA, { dt: 30 }), n1: G([...SEPW, inf(TS, 'norepinephrine', 0.1, 'mcg/kg/min')], tE, XA, { dt: 30 }), n3: G([...SEPW, inf(TS, 'norepinephrine', 0.3, 'mcg/kg/min')], tE, XA, { dt: 30 }) };
  const w = [TS + 1200, tE] as const;
  const uo = (R: Record<string, { rows: Row[] }>, a: string) => uoKgH(R[a]!.rows, ...w);
  add({ id: 'RH-22a', tier: 'P2', ctx: 'X-A GA vent', state: 'septic shock warm (MAP < 65)', intv: 'noradrenaline 0.1 µg/kg/min from 1260 s: MAP to ≥ 65 → urine output', sys: 'KID CIRC',
    arms, measure: (R) => m({ mapC: r1(avg(R.c!.rows, 'map', ...w)), mapN1: r1(avg(R.n1!.rows, 'map', ...w)), mapN3: r1(avg(R.n3!.rows, 'map', ...w)), uoC: uo(R, 'c'), uoN1: uo(R, 'n1'), uoN3: uo(R, 'n3'), dUoN1: r2(uo(R, 'n1') - uo(R, 'c')) }),
    expect: [{ m: 'dUoN1', dir: 1, tol: 0.05, src: 'tables §5.2 "Norepinephrine in vasoplegia: UOP recovers as MAP returns to 65–75" (NE-renal, Chest); Redl-Wenzl 1993 Intensive Care Med 19:151' }],
    owner: '7d renal (pressure natriuresis, sepsis term) / 7g noradrenaline' });
  add({ id: 'RH-22b', tier: 'P2', ctx: 'X-A GA vent', state: 'septic shock warm, MAP already ≥ 65', intv: 'noradrenaline 0.3 vs 0.1 µg/kg/min: MAP 65 → higher, urine output', sys: 'KID CIRC',
    arms, measure: (R) => m({ dMapHiLo: r1(avg(R.n3!.rows, 'map', ...w) - avg(R.n1!.rows, 'map', ...w)), dUoHiLo: r2(uo(R, 'n3') - uo(R, 'n1')) }),
    expect: [{ m: 'dUoHiLo', quiet: true, tol: 0.15, src: 'LeDoux 2000 Crit Care Med 28:2729 and Bourgoin 2005 Crit Care Med 33:780: raising MAP 65 → 85 with noradrenaline does not raise UO; SEPSISPAM (Asfar 2014 NEJM 370:1583): benefit only in chronic HTN' }],
    owner: '7d renal natriuresis curve / NE_EXCESS' });
}

// ---- RH-23: glycine 3 L absorbed over 30 min (TURP) --------------------------------------------------------------------
{
  const tE = T + 1800 + 1800;
  const arms = { i: G([fl(T, 'glycine', 3000, 1800)], tE, XA, { dt: 30 }), c: G([], tE, XA, { dt: 30 }) };
  add({ id: 'RH-23a', tier: 'P2', ctx: 'X-A GA vent', state: 'TURP absorption', intv: 'glycine 1.5 % 3 L over 30 min: Na⁺ and the osmolal gap', sys: 'BLD',
    arms, measure: (R) => { const na = v(R.i!.rows, 'na', T + 1800); const osm = v(R.i!.rows, 'osm', T + 1800); const glu = v(R.i!.rows, 'gluMmol', T + 1800);
      return m({ naEnd: r1(na), osmEnd: r1(osm), osmCalc: r1(2 * na + glu + 5), osmGap: r1(osm - (2 * na + glu + 5)), osmGapCtl: r1(v(R.c!.rows, 'osm', T + 1800) - (2 * v(R.c!.rows, 'na', T + 1800) + v(R.c!.rows, 'gluMmol', T + 1800) + 5)) }); },
    expect: [{ m: 'naEnd', lo: 115, hi: 125, invert: true, src: 'research/12 RH-23 (Na → 120); Hahn 2006 BJA 96:8 (TURP syndrome: 3 L glycine → Na ≈ 120)' },
      { m: 'osmGap', dir: 1, tol: 10, src: 'Hahn 2006: glycine is an osmole — measured osmolality falls less than 2·Na predicts (osmolal gap)' }],
    owner: '7c solutes (glycine)' });
  add({ id: 'RH-23b', tier: 'P2', ctx: 'X-A GA vent', state: 'TURP absorption', intv: 'glycine 3 L: circulation (overload: hypertension, bradycardia, then hypotension)', sys: 'CIRC',
    arms, measure: (R) => m({ dMapPeak: dMaxW(R.i!.rows, R.c!.rows, 'map', T, T + 1800), dHrMin: -dMaxW(R.c!.rows, R.i!.rows, 'hrModel', T, T + 1800), dCvpEnd: r2(v(R.i!.rows, 'cvp', T + 1800) - v(R.c!.rows, 'cvp', T + 1800)),
      dMapLate: r1(dWin(R.i!.rows, R.c!.rows, 'map', T + 2700, tE)), dPawp: r2(v(R.i!.rows, 'pawp', T + 1800) - v(R.c!.rows, 'pawp', T + 1800)) }),
    expect: [{ m: 'dMapPeak', dir: 1, tol: 5, src: 'Barash 9e (TURP syndrome): hypertension with volume overload' },
      { m: 'dHrMin', dir: -1, tol: 5, src: 'Barash 9e: reflex bradycardia' },
      { m: 'dCvpEnd', dir: 1, tol: 2, src: 'Barash 9e: CVP ↑ (overload)' }],
    owner: '7a baroreflex / 7c volume' });
  add({ id: 'RH-23c', tier: 'P2', ctx: 'X-A GA vent', state: 'TURP absorption', intv: 'glycine 3 L: urine output (osmotic and volume diuresis)', sys: 'KID',
    arms, measure: (R) => m({ extraUrine1h: r1(urineMl(R.i!.rows, T, T + H) - urineMl(R.c!.rows, T, T + H)), uoEnd: r2(v(R.i!.rows, 'uopKgH', T + 1800)) }),
    expect: [{ m: 'extraUrine1h', dir: 1, tol: 100, src: 'Hahn 1997 (glycine absorption): glycine acts as an osmotic diuretic and the load is excreted over hours' }],
    owner: '7d renal (volume excretion: FU-9 A1)', known: 'FU-9 A1 (F1)', dirOnly: true });
}
function dMaxW(a: Row[], b: Row[], k: string, t0: number, t1: number): number {
  let best = -Infinity; for (const r of a) { const t = r.t as number; if (t <= t0 || t > t1) continue; const q = b.find((x) => x.t === r.t); if (!q) continue; const dd = (r[k] as number) - (q[k] as number); if (dd > best) best = dd; }
  return Math.round(best * 10) / 10;
}

// ---- RH-25: 3 % saline 250 mL -------------------------------------------------------------------------------------
{
  const tE = T + 2 * H;
  const arms = { i: G([d(T, 'hypertonicSaline', 250, 'mL', { concentrationPct: 3 })], tE, XA, { dt: 30 }), c: G([], tE, XA, { dt: 30 }) };
  add({ id: 'RH-25a', tier: 'P2', ctx: 'X-A GA vent', state: 'normonatraemic', intv: '3 % saline 250 mL: plasma Na⁺ at 30 min', sys: 'BLD',
    arms, measure: (R) => m({ dNa30: r2(v(R.i!.rows, 'na', T + 1800) - v(R.c!.rows, 'na', T + 1800)), dNa2h: r2(v(R.i!.rows, 'na', tE) - v(R.c!.rows, 'na', tE)) }),
    expect: [{ m: 'dNa30', lo: 2, hi: 4, src: 'research/12 RH-25 (Na +2–4); Adrogué–Madias: 128 mmol into ≈ 42 L total body water → +3' }],
    owner: '7c solutes' });
  add({ id: 'RH-25b', tier: 'P2', ctx: 'X-A GA vent', state: 'normonatraemic', intv: '3 % saline 250 mL: urine output (natriuresis)', sys: 'KID',
    arms, measure: (R) => m({ extraUrine2h: r1(urineMl(R.i!.rows, T, tE) - urineMl(R.c!.rows, T, tE)), dBv2h: r1(v(R.i!.rows, 'bv', tE) - v(R.c!.rows, 'bv', tE)) }),
    expect: [{ m: 'extraUrine2h', dir: 1, tol: 50, src: 'research/12 RH-25 (UO ↑, natriuresis of the Na load)' }],
    owner: '7d renal (volume/Na excretion: FU-9 A1)', known: 'FU-9 A1 (F1)', dirOnly: true });
}

// ---- RH-26: PEEP 5 → 15 — hepatic blood flow and urine (the brief: "HBF and its fall under PEEP") ----------------------
{
  const tE = T + H;
  const arms = { i: G([ven(T, { peep: 15 })], tE, XA, { dt: 30 }), c: G([], tE, XA, { dt: 30 }) };
  const w = [T + 1200, tE] as const;
  add({ id: 'RH-26a', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'PEEP 5 → 15 at 300 s: hepatic blood flow', sys: 'LIV CIRC',
    arms, measure: (R) => m({ hbfPct: pctWin(R.i!.rows, R.c!.rows, 'hbfRel', ...w), coPct: pctWin(R.i!.rows, R.c!.rows, 'co', ...w), dCvp: r2(dWin(R.i!.rows, R.c!.rows, 'cvp', ...w)) }),
    expect: [{ m: 'hbfPct', lo: -35, hi: -10, src: 'Brienza 1995 AJRCCM 152:504 / Matuschak 1987 J Appl Physiol 62:1377: PEEP 15–20 lowers portal and total hepatic flow ≈ 20–35 % (CO fall + hepatic venous back-pressure)' }],
    owner: '7c hbfRel (CO only; no hepatic venous pressure term)' });
  add({ id: 'RH-26b', tier: 'P2', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'PEEP 5 → 15: urine output', sys: 'KID',
    arms, measure: (R) => m({ uoPct: r1(100 * (uoKgH(R.i!.rows, ...w) / uoKgH(R.c!.rows, ...w) - 1)), uoI: uoKgH(R.i!.rows, ...w), uoC: uoKgH(R.c!.rows, ...w), gfrPct: pctWin(R.i!.rows, R.c!.rows, 'gfr', ...w) }),
    expect: [{ m: 'uoPct', lo: -40, hi: -10, src: 'Annat 1983 Anesthesiology 58:136 (PEEP 10: UO, GFR and RPF fall ≈ 20–35 %, ADH ↑); tables §5.2 PEEP row (×0.9 per 10 cmH2O + CVP/CO)' }],
    owner: '7d renal (PEEP_PER_10, CVP)' });
}
void mn; void CKD; void inf; void CIRR; void AKI;

// ---- RH-27: autoregulation plateau and pressure natriuresis (the brief: "GFR and autoregulation"; MANUAL targets) ------
{
  const mk = (sbp: number, dbp: number) => ({ ...G([tgt(T, 'sbp', sbp, 120), tgt(T, 'dbp', dbp, 120)], T + 3000, XA, { dt: 30 }), mode: 'manual' as const });
  const arms = { p90: mk(125, 72), p120: mk(165, 97), p150: mk(205, 122) };
  const w = [T + 1200, T + 3000] as const;
  const a = (R: Record<string, { rows: Row[] }>, k: string, x: string) => avg(R[x]!.rows, k, ...w);
  add({ id: 'RH-27a', tier: 'P2', ctx: 'X-A MANUAL, GA vent', state: 'MAP held at ≈ 90, 120, 150 (instructor targets)', intv: 'RBF and GFR across the autoregulatory range', sys: 'KID',
    arms, measure: (R) => m({ map90: r1(a(R, 'map', 'p90')), map150: r1(a(R, 'map', 'p150')), rbf90: Math.round(a(R, 'rbf', 'p90')), rbf150: Math.round(a(R, 'rbf', 'p150')),
      rbfPct150vs90: r1(100 * (a(R, 'rbf', 'p150') / a(R, 'rbf', 'p90') - 1)), gfrPct150vs90: r1(100 * (a(R, 'gfr', 'p150') / a(R, 'gfr', 'p90') - 1)) }),
    expect: [{ m: 'rbfPct150vs90', lo: -10, hi: 15, src: 'tables §5.2 `rblLL/rblUL` 80–180 (Renal-AR PMC4042104; Guyton & Hall ch. 27: RBF and GFR autoregulated within ≈ 10 % over 80–170 mmHg)' },
      { m: 'gfrPct150vs90', lo: -10, hi: 15, src: 'as above (GFR)' }],
    owner: '7d renal/kidney.ts (TGF + myogenic)' });
  add({ id: 'RH-27b', tier: 'P2', ctx: 'X-A MANUAL, GA vent', state: 'MAP held at ≈ 90, 120, 150', intv: 'pressure natriuresis: urine output at 150 vs 90–100', sys: 'KID',
    arms, measure: (R) => m({ uo90: uoKgH(R.p90!.rows, ...w), uo120: uoKgH(R.p120!.rows, ...w), uo150: uoKgH(R.p150!.rows, ...w), ratio150vs90: ratio(uoKgH(R.p150!.rows, ...w), uoKgH(R.p90!.rows, ...w)) }),
    expect: [{ m: 'ratio150vs90', lo: 2, hi: 4, src: 'tables §5.2 U(): 3× at RPP 150 vs 100 (Guyton renal output curve); Guyton & Hall ch. 19' }],
    owner: '7d renal/kidney.ts natriuresis' });
}
