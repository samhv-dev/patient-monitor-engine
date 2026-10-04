// RH group A — the P1 cells (research/12 §5.1 RH-01…05, RH-15, RH-16, RH-21) and the MANUAL twins RH-M1/M2. Run first.
import { A } from './runner.ts';
import type { Row } from './runner.ts';
import { add, AW, avg, CL2, CL3, d, dWin, ff, firstFlag, fl, G, H, HF, inf, m, mn, mx, pctWin, ratio, T, TB, tgt, tx, uoKgH, urineMl, v, vap, XA, XEH, type Expect } from './spec.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const NOARREST: Expect = { m: 'arrest', event: false, src: 'a renal/hepatic intervention in a perfusing patient must not arrest (research/12 §2.2 quiet rule)' };

// ---- RH-01: GA 4 h — hourly UO, the oliguria flag, resting renal haemodynamics -----------------------------------------
{
  const arms = { g: G([], 4 * H, XA, { dt: 60 }), a: AW([], 4 * H, XA, { dt: 60 }) };
  const hourly = (rows: Row[]) => [0, 1, 2, 3].map((h) => uoKgH(rows, h * H, (h + 1) * H));
  add({ id: 'RH-01a', tier: 'P1', ctx: 'X-A GA vent vs X-A awake', state: 'GA maintained (Stage 3 GA flag), normovolaemic, MAP ≈ 93', intv: 'GA 4 h, VCV 12 × 600, no surgery: hourly urine output', sys: 'KID CIRC',
    arms, measure: (R) => {
      const g = hourly(R.g!.rows); const a = hourly(R.a!.rows);
      return m({ uoGA1: g[0]!, uoGA2: g[1]!, uoGA3: g[2]!, uoGA4: g[3]!, uoGAmin: Math.min(...g), uoAw1: a[0]!, uoAw4: a[3]!,
        mapGA: r2(avg(R.g!.rows, 'map', H, 4 * H)), coGA: r2(avg(R.g!.rows, 'co', H, 4 * H)), coAw: r2(avg(R.a!.rows, 'co', H, 4 * H)),
        vNhGA: r2(avg(R.g!.rows, 'vNh', 3 * H, 4 * H)), vNhAw: r2(avg(R.a!.rows, 'vNh', 3 * H, 4 * H)), angGA: r2(avg(R.g!.rows, 'ang', 3 * H, 4 * H)) });
    },
    expect: [{ m: 'uoGAmin', lo: 0.5, hi: 1.0, invert: true, src: 'tables §5.2 `S` row ("intra-op UOP 0.5–1 despite normal MAP"); Miller 10e ch. 17 (renal physiology: GA lowers UO through ADH/sympathetic tone, not to oliguria at a normal MAP); KDIGO 2012 (oliguria < 0.5 mL/kg/h)' },
      { m: 'uoAw4', lo: 0.5, hi: 1.5, src: 'tables §5.2 `UOP0` 1.0 (0.5–1.5) mL/kg/h awake' }],
    owner: '7d renal/model.ts eabv + S_GA' });
  add({ id: 'RH-01b', tier: 'P1', ctx: 'X-A GA vent', state: 'GA maintained, normovolaemic', intv: 'GA 4 h: OLIGURIA flag and KDIGO stage', sys: 'KID DEV',
    arms, measure: (R) => ({ flagFirstS: firstFlag(R.g!.rows, 0), flagAny: R.g!.rows.some((r) => r.oliguria === true), flagMinutesOn: R.g!.rows.filter((r) => r.oliguria === true).length,
      akiStage4h: v(R.g!.rows, 'aki', 4 * H), flagAwake: R.a!.rows.some((r) => r.oliguria === true) }),
    expect: [{ m: 'flagAny', event: false, src: 'KDIGO 2012: oliguria = UO < 0.5 mL/kg/h for ≥ 6 h (stage 1); a healthy anaesthetised patient at a normal MAP is not oliguric (tables §5.2 alarm row, Q40)' },
      { m: 'flagAwake', event: false, src: 'as above (awake reference)' }],
    owner: '7d organs/pipeline.ts oliguria flag (FU-8 A8) + RH-01a cause' });
  add({ id: 'RH-01c', tier: 'P1', ctx: 'X-A awake vs GA vent', state: 'resting, normovolaemic', intv: 'resting renal haemodynamics: RBF, GFR, filtration fraction', sys: 'KID',
    arms, measure: (R) => {
      const rbfA = avg(R.a!.rows, 'rbf', H, 4 * H); const rbfG = avg(R.g!.rows, 'rbf', H, 4 * H);
      return m({ rbfAw: Math.round(rbfA), rbfGA: Math.round(rbfG), rbfPctCoAw: r2((100 * rbfA) / (1000 * avg(R.a!.rows, 'co', H, 4 * H))), gfrAw: Math.round(avg(R.a!.rows, 'gfr', H, 4 * H)),
        gfrGA: Math.round(avg(R.g!.rows, 'gfr', H, 4 * H)), ffAw: ff(R.a!.rows, H, 4 * H), ffGA: ff(R.g!.rows, H, 4 * H), rbfGAvsAwPct: r2((100 * (rbfG - rbfA)) / rbfA) });
    },
    expect: [{ m: 'rbfPctCoAw', lo: 15, hi: 25, src: 'Guyton & Hall 14e ch. 27: RBF ≈ 1100 mL/min ≈ 20–22 % of CO; tables §5.2 / ICRP-89 17 %' },
      { m: 'ffAw', lo: 0.15, hi: 0.25, src: 'Guyton & Hall 14e ch. 27: filtration fraction ≈ 0.2 (GFR 125 / RPF 650)' },
      { m: 'ffGA', lo: 0.15, hi: 0.3, src: 'Guyton & Hall: FF rises with efferent (AngII) tone but filtration equilibrium caps it (≈ 0.3); Miller 10e ch. 17' },
      { m: 'rbfGAvsAwPct', lo: -30, hi: 0, src: 'Miller 10e ch. 17: anaesthetics lower RBF modestly through MAP/CO; RBF autoregulated over RPP 80–180 (tables §5.2 rblLL) — at MAP ≈ 93 the fall should be small' }],
    owner: '7d renal/kidney.ts (filtration equilibrium) + model.ts eabv' });
}

// ---- RH-02: class II → III haemorrhage (GA vent and awake) -----------------------------------------------------------
{
  const tE = TB + H;
  const arms = { g2: G(CL2, tE, XA, { dt: 30 }), g3: G(CL3, tE, XA, { dt: 30 }), g0: G([], tE, XA, { dt: 30 }),
    a2: AW(CL2, tE, XA, { dt: 30 }), a3: AW(CL3, tE, XA, { dt: 30 }), a0: AW([], tE, XA, { dt: 30 }) };
  const mlH = (rows: Row[]) => r2(urineMl(rows, TB, TB + H));
  add({ id: 'RH-02a', tier: 'P1', ctx: 'X-A awake (and GA vent)', state: 'class II (1000 mL / 10 min) and class III (1500 mL / 10 min)', intv: 'urine output in the hour after the bleed (mL/h)', sys: 'KID CIRC',
    arms, measure: (R) => m({ uoAw2: mlH(R.a2!.rows), uoAw3: mlH(R.a3!.rows), uoAw0: mlH(R.a0!.rows), uoGA2: mlH(R.g2!.rows), uoGA3: mlH(R.g3!.rows), uoGA0: mlH(R.g0!.rows),
      uoGA3kgH30: uoKgH(R.g3!.rows, TB, TB + 1800), mapAw2: r2(avg(R.a2!.rows, 'map', TB, tE)), mapAw3: r2(avg(R.a3!.rows, 'map', TB, tE)), mapGA3: r2(avg(R.g3!.rows, 'map', TB, tE)),
      hrAw3: r2(avg(R.a3!.rows, 'hrModel', TB, tE)), arrest: false }),
    expect: [{ m: 'uoAw2', lo: 20, hi: 30, src: 'ATLS 10e table 3-1: class II (15–30 %) urine 20–30 mL/h' },
      { m: 'uoAw3', lo: 5, hi: 15, src: 'ATLS 10e table 3-1: class III (31–40 %) urine 5–15 mL/h' },
      { m: 'uoGA3kgH30', lo: 0, hi: 0.3, src: 'tables §7 check 17a: class III UOP < 0.3 mL/kg/h by 30 min' }],
    owner: '7d renal/model.ts volumeFactor / natriuresis' });
  add({ id: 'RH-02b', tier: 'P1', ctx: 'X-A GA vent', state: 'class II and class III', intv: 'renal autoregulation: RBF falls before GFR (filtration fraction rises)', sys: 'KID',
    arms, measure: (R) => {
      const pc = (a: string, k: string) => pctWin(R[a]!.rows, R.g0!.rows, k, TB, TB + H);
      return m({ rbfPct2: pc('g2', 'rbf'), gfrPct2: pc('g2', 'gfr'), rbfPct3: pc('g3', 'rbf'), gfrPct3: pc('g3', 'gfr'),
        gfrMinusRbf2: r2(pc('g2', 'gfr') - pc('g2', 'rbf')), gfrMinusRbf3: r2(pc('g3', 'gfr') - pc('g3', 'rbf')), ff0: ff(R.g0!.rows, TB, TB + H), ff2: ff(R.g2!.rows, TB, TB + H), ff3: ff(R.g3!.rows, TB, TB + H),
        map3: r2(avg(R.g3!.rows, 'map', TB, TB + H)) });
    },
    expect: [{ m: 'gfrMinusRbf2', dir: 1, tol: 5, src: 'Guyton & Hall ch. 27 (AngII efferent constriction keeps GFR while RBF falls); research/12 RH-02 ("RBF falls before GFR")' },
      { m: 'rbfPct3', dir: -1, tol: 10, src: 'ATLS 10e / Guyton: class III renal vasoconstriction lowers RBF' },
      { m: 'ff3', lo: 0.2, hi: 0.35, src: 'Guyton & Hall: FF rises in hypovolaemia (efferent AngII) but filtration equilibrium caps it (≈ 0.3–0.35)' }],
    owner: '7d renal/kidney.ts (angiotensin, filtration equilibrium)' });
  add({ id: 'RH-02c', tier: 'P1', ctx: 'X-A GA vent', state: 'class III (1500 mL / 10 min)', intv: 'hepatic blood flow and lactate clearance vs cardiac output', sys: 'LIV BLD CIRC',
    arms, measure: (R) => {
      const coRel = avg(R.g3!.rows, 'co', TB, TB + H) / avg(R.g0!.rows, 'co', TB, TB + H);
      const hbf = avg(R.g3!.rows, 'hbfRel', TB, TB + H) / avg(R.g0!.rows, 'hbfRel', TB, TB + H);
      return m({ coRel: r2(coRel), hbfRel: r2(hbf), hbfOverCo: r2(hbf / coRel), kLacPct: pctWin(R.g3!.rows, R.g0!.rows, 'kLac', TB, TB + H),
        dLact30: r2(v(R.g3!.rows, 'lact', TB + 1800) - v(R.g0!.rows, 'lact', TB + 1800)), hbfRel2: r2(avg(R.g2!.rows, 'hbfRel', TB, TB + H) / avg(R.g0!.rows, 'hbfRel', TB, TB + H)),
        coRel2: r2(avg(R.g2!.rows, 'co', TB, TB + H) / avg(R.g0!.rows, 'co', TB, TB + H)) });
    },
    expect: [{ m: 'hbfOverCo', lo: 0.5, hi: 0.75, src: 'tables §5.3 `hbfFactor` ×0.6 in class III (splanchnic vasoconstriction: HBF falls more than CO; Guyton ch. 16 splanchnic reservoir)' },
      { m: 'kLacPct', dir: -1, tol: 15, src: 'tables §5.3 kLac ×HBF_rel; research/12 RH-02 (lactate clearance falls with HBF)' },
      { m: 'dLact30', lo: 2, hi: 4, src: 'tables §7 check 17a: class III lactate 3–5 by 30 min (from 1.0)' }],
    owner: '7c blood/core.ts hbfRel (HBF_EXP) / 7d liver hbfFactor' });
}

// ---- RH-03: class III → 2 L Ringer's vs 2 u RBC: urine recovery ---------------------------------------------------------
{
  const tF = TB; const tE = TB + 2 * H + 1800;
  const arms = { rl: G([...CL3, fl(tF, 'rl', 2000, 1800)], tE, XA, { dt: 30 }), rbc: G([...CL3, tx(tF, 'rbc', 2, 1200)], tE, XA, { dt: 30 }),
    c: G([...CL3], tE, XA, { dt: 30 }), n: G([], tE, XA, { dt: 30 }) };
  const read = (R: Record<string, { rows: Row[] }>, a: string, end: number) => m({
    uoPre: uoKgH(R[a]!.rows, 0, 60), uoBleed: uoKgH(R[a]!.rows, 660, TB), uo0to30: uoKgH(R[a]!.rows, end, end + 1800), uo30to60: uoKgH(R[a]!.rows, end + 1800, end + 3600),
    uoCtl30to60: uoKgH(R.c!.rows, end + 1800, end + 3600), uoNormGA30to60: uoKgH(R.n!.rows, end + 1800, end + 3600),
    mapEnd: r2(v(R[a]!.rows, 'map', end)), mapNorm: r2(v(R.n!.rows, 'map', end)), coEnd: r2(v(R[a]!.rows, 'co', end)), coNorm: r2(v(R.n!.rows, 'co', end)),
    vNh60: r2(v(R[a]!.rows, 'vNh', end + 3600)), bvRel60: r2(v(R[a]!.rows, 'bvRel', end + 3600)),
    tUo05: (() => { for (let t = end + 600; t <= end + 2 * H; t += 600) if (uoKgH(R[a]!.rows, t - 600, t) >= 0.5) return t - end; return NaN; })(),
  });
  add({ id: 'RH-03a', tier: 'P1', ctx: 'X-A GA vent', state: 'class III (1500 mL / 10 min)', intv: "Ringer's lactate 2 L over 30 min at 960 s: urine recovery", sys: 'KID CIRC',
    arms, measure: (R) => read(R, 'rl', tF + 1800),
    expect: [{ m: 'uo30to60', lo: 0.5, hi: 1.5, src: 'ATLS 10e ch. 3: UO ≥ 0.5 mL/kg/h is the adult resuscitation end point; it recovers within 30–60 min of restoring MAP/CO (research/12 RH-03)' },
      { m: 'tUo05', lo: 0, hi: 3600, src: 'ATLS 10e: urine recovers within 30–60 min of MAP/CO restoration (a 10-min bin ≥ 0.5 mL/kg/h)' }],
    owner: '7d renal/model.ts (vNh washout τ 45 min, eabv)' });
  add({ id: 'RH-03b', tier: 'P1', ctx: 'X-A GA vent', state: 'class III (1500 mL / 10 min)', intv: '2 u RBC over 20 min at 960 s: urine recovery', sys: 'KID CIRC',
    arms, measure: (R) => read(R, 'rbc', tF + 1200),
    expect: [{ m: 'uo30to60', dir: 1, tol: 0, src: 'direction: 2 u (≈ 600 mL) replace 40 % of the loss — partial recovery; the band belongs to full restoration (RH-03a)' },
      { m: 'uo30to60', lo: 0.3, hi: 1.5, src: 'ATLS 10e (as RH-03a) — partial replacement: above the class III 5–15 mL/h (0.07–0.2 mL/kg/h), below the target' }],
    owner: '7d renal/model.ts', dirOnly: true });
}

// ---- RH-04: elderly hypertensive vs healthy at MAP 65 and 80 (MANUAL targets), GA ----------------------------------
{
  // MANUAL: the instructor holds the pressure; the kidney reads the MAP. SBP/DBP pairs for MAP ≈ 65 and ≈ 80.
  const at = (sbp: number, dbp: number) => [tgt(T, 'sbp', sbp, 120), tgt(T, 'dbp', dbp, 120)];
  const mk = (p: Record<string, unknown>, sbp: number, dbp: number) => ({ ...G(at(sbp, dbp), T + 3000, p, { dt: 30 }), mode: 'manual' as const });
  const arms = { h65: mk(XEH, 92, 52), h80: mk(XEH, 112, 64), a65: mk(XA, 92, 52), a80: mk(XA, 112, 64) };
  const w = [T + 1200, T + 3000] as const;
  const uo = (R: Record<string, { rows: Row[] }>, a: string) => uoKgH(R[a]!.rows, w[0], w[1]);
  add({ id: 'RH-04a', tier: 'P1', ctx: 'X-E 80 y + HTN vs X-A, MANUAL, GA vent', state: 'GA; MAP held at 65 vs 80 (instructor targets)', intv: 'urine output at MAP 65 vs 80', sys: 'KID',
    arms, measure: (R) => {
      const h65 = uo(R, 'h65'); const h80 = uo(R, 'h80'); const a65 = uo(R, 'a65'); const a80 = uo(R, 'a80');
      return m({ uoH65: h65, uoH80: h80, uoA65: a65, uoA80: a80, ratioH: ratio(h65, h80), ratioA: ratio(a65, a80), htnMinusHealthy65: r2(h65 - a65),
        mapH65: r2(avg(R.h65!.rows, 'map', ...w)), mapA65: r2(avg(R.a65!.rows, 'map', ...w)), mapH80: r2(avg(R.h80!.rows, 'map', ...w)), mapA80: r2(avg(R.a80!.rows, 'map', ...w)),
        vNhH65: r2(avg(R.h65!.rows, 'vNh', ...w)), vNhA65: r2(avg(R.a65!.rows, 'vNh', ...w)), coH65: r2(avg(R.h65!.rows, 'co', ...w)), coA65: r2(avg(R.a65!.rows, 'co', ...w)), cvpH65: r2(avg(R.h65!.rows, 'cvp', ...w)), cvpA65: r2(avg(R.a65!.rows, 'cvp', ...w)) });
    },
    expect: [{ m: 'htnMinusHealthy65', dir: -1, tol: 0.03, src: 'tables §1.5 htn: renal autoregulation lower limit +10 mmHg ("earlier renal hypoperfusion at a given MAP"); research/12 RH-04' }],
    owner: '7d renal (no htn term: tables §1.5 `renalLowerLimit`)', dirOnly: true });
  add({ id: 'RH-04b', tier: 'P1', ctx: 'X-E 80 y + HTN vs X-A, MANUAL, GA vent', state: 'GA; MAP held at 65', intv: 'RBF and GFR at MAP 65 relative to MAP 80', sys: 'KID',
    arms, measure: (R) => {
      const p = (a: string, b: string, k: string) => r1p(100 * (avg(R[a]!.rows, k, ...w) / avg(R[b]!.rows, k, ...w) - 1));
      return m({ rbfH65vs80: p('h65', 'h80', 'rbf'), rbfA65vs80: p('a65', 'a80', 'rbf'), gfrH65vs80: p('h65', 'h80', 'gfr'), gfrA65vs80: p('a65', 'a80', 'gfr'),
        gfrShiftEffect: r2(p('h65', 'h80', 'gfr') - p('a65', 'a80', 'gfr')), rbfShiftEffect: r2(p('h65', 'h80', 'rbf') - p('a65', 'a80', 'rbf')) });
    },
    expect: [{ m: 'gfrShiftEffect', dir: -1, tol: 2, src: 'tables §1.5 htn (`renalLowerLimit` +10) / Renal-AR PMC4042104: the hypertensive kidney loses GFR at a higher pressure' }],
    owner: '7d renal/kidney.ts tgfTarget (no htn shift)', dirOnly: true });
}
const r1p = (x: number) => Math.round(x * 10) / 10;

// ---- RH-05: HFrEF low output → dobutamine 5 µg/kg/min (tables §7 check 20) ----------------------------------------
{
  const tE = T + 3900;
  const arms = { i: AW([inf(T + 600, 'dobutamine', 5, 'mcg/kg/min')], tE, HF, { dt: 30 }), c: AW([], tE, HF, { dt: 30 }) };
  const t0 = T + 600; const kg = 80;
  add({ id: 'RH-05a', tier: 'P1', ctx: 'HFrEF 60 y 80 kg (profile hfref), awake', state: 'compensated/low-output HFrEF at rest', intv: 'none (the state): urine output in the low-output state', sys: 'KID CIRC',
    arms, measure: (R) => m({ uoPre: uoKgH(R.c!.rows, T - 300 + 600 - 600, t0, kg), uoPreHour: uoKgH(R.c!.rows, t0 - 600, t0 + 3000, kg), map: r2(avg(R.c!.rows, 'map', T, t0)), cvp: r2(avg(R.c!.rows, 'cvp', T, t0)),
      co: r2(avg(R.c!.rows, 'co', T, t0)), vNh: r2(avg(R.c!.rows, 'vNh', T, t0)) }),
    expect: [{ m: 'uoPreHour', lo: 0.1, hi: 0.15, src: 'tables §7 check 20: low-flow HFrEF (MAP 65, CVP 12) UOP 0.1–0.15 mL/kg/h' }],
    owner: '7a hfref profile (state) / 7d renal eabv' });
  add({ id: 'RH-05b', tier: 'P1', ctx: 'HFrEF 60 y 80 kg, awake', state: 'low-output HFrEF', intv: 'dobutamine 5 µg/kg/min from 900 s: urine output at 30–60 min vs control', sys: 'KID CIRC',
    arms, measure: (R) => m({ uo30to60: uoKgH(R.i!.rows, t0 + 1800, t0 + 3600, kg), uoCtl30to60: uoKgH(R.c!.rows, t0 + 1800, t0 + 3600, kg), uo0to30: uoKgH(R.i!.rows, t0, t0 + 1800, kg),
      coPct: pctWin(R.i!.rows, R.c!.rows, 'co', t0 + 1800, t0 + 3600), dMap: r2(dWin(R.i!.rows, R.c!.rows, 'map', t0 + 1800, t0 + 3600)), dCvp: r2(dWin(R.i!.rows, R.c!.rows, 'cvp', t0 + 1800, t0 + 3600)) }),
    expect: [{ m: 'uo30to60', lo: 0.2, hi: 0.3, src: 'tables §7 check 20: dobutamine 5 µg/kg/min → CO +30 %, MAP 72, CVP 10 → UOP 0.2–0.3 within 30–60 min' },
      { m: 'coPct', lo: 20, hi: 45, src: 'tables §7 check 20 (CO +30 %); FU-7 Task 17 band 20–45 %' }],
    owner: '7d renal (eabv) / 7a / 7g dobutamine' });
}

// ---- RH-15: class III → propofol / fentanyl PK (flow-limited clearance, central volume) --------------------------------
{
  const tE = TB + 2400;
  const arms = { p3: G([...CL3, d(TB, 'propofol', 1, 'mg/kg')], tE, XA, { dt: 5 }), p0: G([d(TB, 'propofol', 1, 'mg/kg')], tE, XA, { dt: 5 }),
    f3: G([...CL3, d(TB, 'fentanyl', 2, 'mcg/kg')], tE, XA, { dt: 15 }), f0: G([d(TB, 'fentanyl', 2, 'mcg/kg')], tE, XA, { dt: 15 }) };
  add({ id: 'RH-15a', tier: 'P1', ctx: 'X-A GA vent', state: 'class III (1500 mL / 10 min) vs normovolaemic', intv: 'propofol 1 mg/kg at 960 s: peak effect-site concentration and its clearance factor', sys: 'PK CIRC',
    arms, measure: (R) => m({ peakRatio: ratio(mx(R.p3!.rows, 'c_propofol', TB, TB + 600), mx(R.p0!.rows, 'c_propofol', TB, TB + 600)), ce10Ratio: ratio(v(R.p3!.rows, 'c_propofol', TB + 600), v(R.p0!.rows, 'c_propofol', TB + 600)),
      fShock: r2(avg(R.p3!.rows, 'f_propofol', TB, TB + 600)), fNorm: r2(avg(R.p0!.rows, 'f_propofol', TB, TB + 600)), qShock: r2(avg(R.p3!.rows, 'q_propofol', TB, TB + 120)), hbf: r2(avg(R.p3!.rows, 'hbfRel', TB, TB + 600)),
      coRel: r2(avg(R.p3!.rows, 'co', TB - 60, TB) / avg(R.p0!.rows, 'co', TB - 60, TB)) }),
    expect: [{ m: 'peakRatio', lo: 1.5, hi: 2.0, src: 'Johnson 2003 Anesthesiology 99:409 (haemorrhagic shock: smaller central volume and clearance → higher propofol concentrations); research/12 RH-15 (Ce ↑ 1.5–2×); audit 08 G10' }],
    owner: '7g pk/pipeline.ts distFactor / clFactor (FU-4 G10)' });
  add({ id: 'RH-15b', tier: 'P1', ctx: 'X-A GA vent', state: 'class III vs normovolaemic', intv: 'fentanyl 2 µg/kg at 960 s: effect-site level at 10 and 30 min (flow-limited hepatic clearance)', sys: 'PK LIV',
    arms, measure: (R) => m({ ce10Ratio: ratio(v(R.f3!.rows, 'c_fentanyl', TB + 600), v(R.f0!.rows, 'c_fentanyl', TB + 600)), ce30Ratio: ratio(v(R.f3!.rows, 'c_fentanyl', TB + 1800), v(R.f0!.rows, 'c_fentanyl', TB + 1800)),
      peakRatio: ratio(mx(R.f3!.rows, 'c_fentanyl', TB, TB + 900), mx(R.f0!.rows, 'c_fentanyl', TB, TB + 900)), fShock: r2(avg(R.f3!.rows, 'f_fentanyl', TB, TB + 1800)), fNorm: r2(avg(R.f0!.rows, 'f_fentanyl', TB, TB + 1800)) }),
    expect: [{ m: 'ce30Ratio', lo: 1.3, hi: 2.0, src: 'Egan 1999 Anesthesiology 91:156 (haemorrhagic shock ≈ doubles opioid concentrations: reduced clearance and central volume); fentanyl is flow-limited (ER ≈ 0.8, Miller 10e ch. 24) — band a proposal' }],
    owner: '7g pk/pipeline.ts clFactor (hepFlow) / distFactor (fentanyl has no flowDist)', dirOnly: true });
}

// ---- RH-16: sevoflurane ≈ 1 MAC for 1 h: hepatic blood flow ------------------------------------------------------------
{
  const tE = T + H;
  const arms = { s: G([vap(T, 'sevoflurane', 2.2, 2)], tE, XA, { dt: 30 }), c: G([], tE, XA, { dt: 30 }) };
  const w = [T + 1800, tE] as const;
  add({ id: 'RH-16', tier: 'P1', ctx: 'X-A GA vent', state: 'GA flag, no volatile vs sevoflurane', intv: 'sevoflurane 2.2 % (≈ 1 MAC) for 1 h: hepatic blood flow and function', sys: 'LIV CIRC',
    arms, measure: (R) => m({ hbfPct: pctWin(R.s!.rows, R.c!.rows, 'hbfRel', ...w), coPct: pctWin(R.s!.rows, R.c!.rows, 'co', ...w), dMap: r2(dWin(R.s!.rows, R.c!.rows, 'map', ...w)),
      mac: r2(avg(R.s!.rows, 'c_sevoflurane', ...w)), dLiverFn: r2(dWin(R.s!.rows, R.c!.rows, 'liverFn', ...w)), kLacPct: pctWin(R.s!.rows, R.c!.rows, 'kLac', ...w), fFentCtl: NaN }),
    expect: [{ m: 'hbfPct', lo: -20, hi: 0, src: 'Miller 10e ch. 20 (inhaled anaesthetics: total HBF falls ≤ 20 % at 1 MAC; sevoflurane preserves hepatic arterial flow — Frink 1992 Anesthesiology 76:85); tables §5.3 hbfFactor ×0.8 at 1 MAC' },
      { m: 'dLiverFn', quiet: true, tol: 0.02, src: 'Miller: hepatic function preserved under sevoflurane (quiet)' }],
    owner: '7c hbfRel / 7d liver hbfFactor' });
}

// ---- RH-21: MANUAL class III — the design check (UO follows MAP only) ------------------------------------------------
{
  const tE = TB + H;
  const arms = { i: { ...G(CL3, tE, XA, { dt: 30 }), mode: 'manual' as const }, c: { ...G([], tE, XA, { dt: 30 }), mode: 'manual' as const } };
  add({ id: 'RH-21', tier: 'P1', ctx: 'X-A MANUAL, GA vent', state: 'class III (1500 mL / 10 min), instructor targets unchanged', intv: 'urine output vs the MANUAL control', sys: 'KID CIRC',
    arms, measure: (R) => m({ dMap: r2(dWin(R.i!.rows, R.c!.rows, 'map', TB, tE)), uoI: uoKgH(R.i!.rows, TB, tE), uoC: uoKgH(R.c!.rows, TB, tE), uoPct: r2(100 * (uoKgH(R.i!.rows, TB, tE) / uoKgH(R.c!.rows, TB, tE) - 1)),
      vNhI: r2(avg(R.i!.rows, 'vNh', TB, tE)), vNhC: r2(avg(R.c!.rows, 'vNh', TB, tE)), coPct: pctWin(R.i!.rows, R.c!.rows, 'co', TB, tE) }),
    expect: [{ m: 'uoPct', quiet: true, tol: 25, src: 'research/12 RH-21 design check (audit 08 Q9): in MANUAL, UO follows the (held) MAP only — no neurohumoral arm; Q9 open' }],
    owner: 'Q9 (MANUAL physiology) / 7d renal eabv', dirOnly: true });
}

// ---- MANUAL twins ------------------------------------------------------------------------------------------------------
{
  const arms = { g: { ...G([], 2 * H, XA, { dt: 60 }), mode: 'manual' as const } };
  add({ id: 'RH-M1', tier: 'P1', ctx: 'X-A MANUAL, GA vent (MODELED twin RH-01a)', state: 'GA, normovolaemic', intv: 'GA 2 h: hourly urine output and the flag', sys: 'KID',
    arms, measure: (R) => m({ uo1: uoKgH(R.g!.rows, 0, H), uo2: uoKgH(R.g!.rows, H, 2 * H), flagAny: R.g!.rows.some((r) => r.oliguria === true), vNh: r2(avg(R.g!.rows, 'vNh', H, 2 * H)), map: r2(avg(R.g!.rows, 'map', H, 2 * H)) }),
    expect: [{ m: 'uo2', lo: 0.5, hi: 1.0, invert: true, src: 'as RH-01a (tables §5.2 S row); Q9 open' }],
    owner: 'Q9 / 7d renal', dirOnly: true });
  const tE = TB + 1800 + 2 * H;
  const arms2 = { i: { ...G([...CL3, fl(TB, 'rl', 2000, 1800)], tE, XA, { dt: 30 }), mode: 'manual' as const }, c: { ...G([...CL3], tE, XA, { dt: 30 }), mode: 'manual' as const } };
  add({ id: 'RH-M2', tier: 'P1', ctx: 'X-A MANUAL, GA vent (MODELED twin RH-03a)', state: 'class III', intv: "Ringer's lactate 2 L over 30 min: urine output 30–60 min after", sys: 'KID',
    arms: arms2, measure: (R) => m({ uoI: uoKgH(R.i!.rows, TB + 3600, TB + 5400), uoC: uoKgH(R.c!.rows, TB + 3600, TB + 5400), dUo: r2(uoKgH(R.i!.rows, TB + 3600, TB + 5400) - uoKgH(R.c!.rows, TB + 3600, TB + 5400)),
      dMap: r2(dWin(R.i!.rows, R.c!.rows, 'map', TB + 3600, TB + 5400)) }),
    expect: [{ m: 'dUo', dir: 1, tol: 0.05, src: 'direction (Q9 open): a 2 L load after class III raises urine output' }],
    owner: 'Q9 / 7d renal', dirOnly: true });
}
void NOARREST; void mn; void A;
