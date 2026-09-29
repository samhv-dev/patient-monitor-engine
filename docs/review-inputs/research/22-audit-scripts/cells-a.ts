// BF group A — P1 fluids, transfusion, acid–base, and the coagulation cells 7i owns (matrix BF-01…06, BF-13, BF-16,
// BF-17, BF-24…26, BF-29, BF-30). Run order inside the tier follows the brief: fluids → transfusion → acid–base →
// coagulation (NE) before the electrolyte extremes of group B.
import { A } from './runner.ts';
import { add, AW, bl, CL2, CL3, CL4, COPD3, d, dAt, dMax, dMin, fl, G, lab, m, mn, mx, raw, T, TB, tx, v, ven, XA, type Expect } from './spec.ts';
import type { Row } from './runner.ts';

const H = 3600;
const bv = (R: { rows: Row[] }, t: number) => v(R.rows, 'bv', t);
const NOARREST: Expect = { m: 'arrest', event: false, src: 'a volume/chemistry intervention in a perfusing patient must not arrest (research/12 §2.2 quiet rule)' };

// ---- BF-01: 0.9 % saline vs Plasma-Lyte, 2 L --------------------------------------------------------------------------
{
  const arms = { s: G([fl(T, 'saline', 2000, H)], T + 1.5 * H, XA, { dt: 30 }), p: G([fl(T, 'balanced', 2000, H)], T + 1.5 * H, XA, { dt: 30 }), c: G([], T + 1.5 * H, XA, { dt: 30 }) };
  const read = (R: Record<string, { rows: Row[] }>, a: string) => m({
    dCl: dAt(R[a]!.rows, R.c!.rows, 'cl', T + H), dBE: dAt(R[a]!.rows, R.c!.rows, 'be', T + H), dHco3: dAt(R[a]!.rows, R.c!.rows, 'hco3', T + H),
    dPh: dAt(R[a]!.rows, R.c!.rows, 'ph', T + H), dNa: dAt(R[a]!.rows, R.c!.rows, 'na', T + H), dBE90: dAt(R[a]!.rows, R.c!.rows, 'be', T + 1.5 * H),
    dAg: dAt(R[a]!.rows, R.c!.rows, 'ag', T + H), dAlb: dAt(R[a]!.rows, R.c!.rows, 'alb', T + H),
  });
  add({ id: 'BF-01a', tier: 'P1', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: '0.9 % saline 2 L over 60 min (read at the end of the infusion)', sys: 'BLD',
    arms, measure: (R) => read(R, 's'),
    expect: [{ m: 'dCl', lo: 3, hi: 8, src: 'Reid 2003 Clin Sci 104:17 (2 L saline in volunteers: Cl +5–7); Kellum/Stewart; research/12 BF-01 (Cl +5)' },
      { m: 'dBE', lo: -4, hi: -1, src: 'Reid 2003; Scheingraber 1999 Anesthesiology 90:1265 (hyperchloraemic acidosis, dose-dependent); research/12 BF-01 (BE −2)' }],
    owner: '7c solutes.ts / 7d renal (F1)', hand: { verdict: 'TW', why: 'Cl +5.4 is right, but the saline stays in the plasma (F1: no excretion of an expanded volume), so albumin falls 10.6 g/L; the lost albumin weak acid raises BE ≈ +3 (Figge) and offsets the hyperchloraemic fall to −0.8' } });
  add({ id: 'BF-01b', tier: 'P1', ctx: 'X-A GA vent', state: 'normovolaemic, GA', intv: 'Plasma-Lyte 148 2 L over 60 min vs saline', sys: 'BLD',
    arms, measure: (R) => { const p = read(R, 'p'); const s = read(R, 's'); return m({ ...p, dBEvsSaline: Math.round(((p.dBE as number) - (s.dBE as number)) * 100) / 100 }); },
    expect: [{ m: 'dCl', quiet: true, tol: 2, src: 'Plasma-Lyte Cl 98: no hyperchloraemia (Reid 2003; Kellum)' },
      { m: 'dBE', quiet: true, tol: 1, src: 'balanced crystalloid: BE ≈ 0 (research/12 BF-01; Scheingraber 1999 RL arm)' },
      { m: 'dBEvsSaline', dir: 1, tol: 1, src: 'balanced vs saline: BE higher by ≈ 2 (research/12 BF-01)' }],
    owner: '7c solutes.ts / 7d renal (F1)', hand: { verdict: 'TS', why: 'BE +1.4 instead of ≈ 0: the direction a balanced fluid can take, but it comes from the same albumin dilution (−10.4 g/L, F1) that weakens BF-01a, not from the fluid\'s SID; the saline–balanced difference (+2.2) is right' } });
}

// ---- BF-02: context-sensitive crystalloid retention (Hahn) -----------------------------------------------------------
{
  // 1 L Ringer's lactate over 30 min; retention = Δ blood volume (vs the same rig without fluid) ÷ 1000 mL, 30 min after the end
  const t1 = T + 1800;
  const t2 = T + 3600;
  const arms = {
    aw: AW([fl(T, 'rl', 1000, 1800)], T + 2 * H, XA, { dt: 15 }), awc: AW([], T + 2 * H, XA, { dt: 15 }),
    ga: G([fl(T, 'rl', 1000, 1800)], T + 2 * H, XA, { dt: 15 }), gac: G([], T + 2 * H, XA, { dt: 15 }),
  };
  const ret = (R: Record<string, { rows: Row[] }>, a: string, c: string, t: number) => Math.round((bv(R[a]!, t) - bv(R[c]!, t)) / 10) / 100;
  add({ id: 'BF-02a', tier: 'P1', ctx: 'X-A awake spontaneous vs X-A GA vent', state: 'normovolaemic', intv: "Ringer's lactate 1 L over 30 min: intravascular retention 30 min after the end", sys: 'BLD KID',
    arms, measure: (R) => {
      const aw = ret(R, 'aw', 'awc', t2);
      const ga = ret(R, 'ga', 'gac', t2);
      return m({ retEndAwake: ret(R, 'aw', 'awc', t1), retAwake30: aw, retEndGA: ret(R, 'ga', 'gac', t1), retGA30: ga, gaMinusAwake: Math.round((ga - aw) * 100) / 100,
        dUopAwake: Math.round(v(R.aw!.rows, 'uop', t2) - v(R.awc!.rows, 'uop', t2)), dUopGA: Math.round(v(R.ga!.rows, 'uop', t2) - v(R.gac!.rows, 'uop', t2)),
        retAwake90: ret(R, 'aw', 'awc', T + 2 * H) });
    },
    expect: [{ m: 'retAwake30', lo: 0.2, hi: 0.3, src: 'Hahn 2010 Anesthesiology 113:470 (volume kinetics: 20–30 % of a crystalloid bolus intravascular 30 min after it ends, awake); research/12 BF-02' },
      { m: 'gaMinusAwake', dir: 1, tol: 0.05, src: 'Hahn 2010; Norberg 2007 Anesthesiology 107:24 (anaesthesia cuts crystalloid elimination 50–80 %: more is retained)' }],
    owner: '7d renal/model.ts volumeFactor (F1)', hand: { verdict: 'WR', why: 'awake and GA retain the same 53 % at 30 min and 50 % at 90 min: with 7d present its urine replaces 7c\'s volume-receptor elimination (and 7c\'s GA ×0.2), but 7d\'s volume factor saturates at 1 for any expansion (renal/model.ts:49–54), so a litre of Ringer\'s raises urine by only 11–17 mL/h' } });
  const b3 = { h: G([...CL3, fl(TB, 'rl', 1000, 1800)], TB + 2 * H, XA, { dt: 15 }), hc: G([...CL3], TB + 2 * H, XA, { dt: 15 }), ...arms };
  add({ id: 'BF-02b', tier: 'P1', ctx: 'X-A GA vent', state: 'class III (1500 mL / 10 min) vs normovolaemic GA', intv: "Ringer's lactate 1 L over 30 min: retention 30 min after the end", sys: 'BLD CIRC',
    arms: b3, measure: (R) => {
      const hv = Math.round((bv(R.h!, TB + 3600) - bv(R.hc!, TB + 3600)) / 10) / 100;
      const ga = ret(R, 'ga', 'gac', t2);
      return m({ retHypo30: hv, retGA30: ga, hypoMinusGA: Math.round((hv - ga) * 100) / 100, dMapHypo: Math.round(v(R.h!.rows, 'map', TB + 1800) - v(R.hc!.rows, 'map', TB + 1800)),
        dCoHypo: Math.round((v(R.h!.rows, 'co', TB + 1800) - v(R.hc!.rows, 'co', TB + 1800)) * 100) / 100, dHbHypo: dAt(R.h!.rows, R.hc!.rows, 'hb', TB + 1800) });
    },
    expect: [{ m: 'hypoMinusGA', dir: 1, tol: 0.05, src: 'Drobin & Hahn 1999 Anesthesiology 90:81 (haemorrhage slows crystalloid elimination: retention rises); research/12 BF-02' },
      { m: 'dMapHypo', dir: 1, tol: 3, src: 'a fluid bolus in class III raises MAP (ATLS 10e)' }],
    owner: '7d renal/model.ts volumeFactor (F1)', hand: { verdict: 'WR', why: 'retention after class III equals normovolaemic GA (0.53 both): the kidney excretes almost nothing above basal in either state (F1), so the context-sensitivity of volume kinetics cannot appear' } });
}

// ---- BF-03: iso-oncotic colloid in class II ---------------------------------------------------------------------------
{
  const t0 = TB;
  const arms = { a: G([...CL2, fl(t0, 'albumin5', 500, 900)], t0 + 1.5 * H, XA, { dt: 15 }), g: G([...CL2, fl(t0, 'gelatin', 500, 900)], t0 + 1.5 * H, XA, { dt: 15 }),
    r: G([...CL2, fl(t0, 'rl', 500, 900)], t0 + 1.5 * H, XA, { dt: 15 }), c: G([...CL2], t0 + 1.5 * H, XA, { dt: 15 }) };
  const eff = (R: Record<string, { rows: Row[] }>, a: string, t: number) => Math.round((bv(R[a]!, t) - bv(R.c!, t)) / 5) / 100;
  for (const [id, a, name] of [['BF-03a', 'a', 'albumin 5 %'], ['BF-03b', 'g', 'gelatin 4 %']] as const) {
    add({ id, tier: 'P1', ctx: 'X-A GA vent', state: 'class II (1000 mL / 10 min)', intv: `${name} 500 mL over 15 min: volume effect (Δ blood volume ÷ 500 mL)`, sys: 'BLD CIRC',
      arms, measure: (R) => m({ effEnd: eff(R, a, t0 + 900), eff60: eff(R, a, t0 + H), effRLEnd: eff(R, 'r', t0 + 900), effRL60: eff(R, 'r', t0 + H),
        dCop: dAt(R[a]!.rows, R.c!.rows, 'cop', t0 + 900), dMap: Math.round(v(R[a]!.rows, 'map', t0 + 900) - v(R.c!.rows, 'map', t0 + 900)) }),
      expect: [{ m: 'effEnd', lo: 0.8, hi: 1.0, src: 'research/12 BF-03 (80–100 %); Chappell 2008 Anesthesiology 109:723 (iso-oncotic colloid replacing blood loss stays ≈ 90 % intravascular; ≈ 40 % in normovolaemia)' },
        { m: 'eff60', lo: 0.7, hi: 1.0, src: 'colloid persists at 60 min (gelatin t½ 2–3 h; albumin longer) (Chappell 2008; tables `t12Colloid`)' }],
      owner: '7c fluids.ts' });
  }
}

// ---- BF-04: 1 unit RBC ----------------------------------------------------------------------------------------------
add({ id: 'BF-04', tier: 'P1', ctx: 'X-A GA vent', state: 'normovolaemic, Hb 15', intv: '1 u RBC (280 mL, Hct 0.6) over 30 min, 14 d, warmed; Hb at +1 h and +4 h', sys: 'BLD',
  arms: { i: G([tx(T, 'rbc', 1, 1800, { warmed: true })], T + 4.5 * H, XA, { dt: 30 }), c: G([], T + 4.5 * H, XA, { dt: 30 }) },
  measure: (R) => m({ dHb1h: dAt(R.i!.rows, R.c!.rows, 'hb', T + 1800 + H), dHb4h: dAt(R.i!.rows, R.c!.rows, 'hb', T + 1800 + 4 * H), dBv1h: Math.round(bv(R.i!, T + 1800 + H) - bv(R.c!, T + 1800 + H)),
    dK: dMax(R.i!.rows, R.c!.rows, 'k', T, T + 3 * H), dICa: dMin(R.i!.rows, R.c!.rows, 'iCa', T, T + 3 * H) }),
  expect: [{ m: 'dHb1h', lo: 0.7, hi: 1.3, src: 'one RBC unit raises Hb ≈ 1 g/dL in a 70 kg adult (AABB Technical Manual; Wiesen 1994 Transfusion 34:32)' }],
  owner: '7d renal/model.ts volumeFactor (F1)', hand: { verdict: 'TW', why: 'Hb +0.55 at 1 h and 4 h: 191 of the unit\'s 280 mL stay in the circulation for hours (F1), so the red cells are diluted in an expanded blood volume instead of the unit\'s plasma being excreted' } });

// ---- BF-05: class IV + massive transfusion ----------------------------------------------------------------------------
{
  // 2100 mL bleed at 60 s over 10 min, then from 660 s a further 100 mL/min loss for 40 min (4 L) replaced by 10 u RBC
  // (35 d, unwarmed) + 10 u FFP (thawed, warmed) over 40 min and 1 platelet pool at the end; a warmed-RBC twin reads the
  // cold load; a calcium-free, product-free control cannot survive the same loss, so iCa/K are read against the pre-transfusion value.
  const t0 = 660;
  const loss: [number, ReturnType<typeof A.bleed>, string] = [t0, A.bleed(4000, 2400), 'ongoing loss 4000 mL / 40 min'];
  const prod = (warm: boolean) => [tx(t0, 'rbc', 10, 2400, { storageDays: 35, warmed: warm }), tx(t0, 'ffp', 10, 2400, { warmed: true }), tx(t0 + 2400, 'platelets', 1, 600, { warmed: true })];
  const arms = { i: G([...CL4, loss, ...prod(false)], t0 + 5400, XA, { dt: 10 }), w: G([...CL4, loss, ...prod(true)], t0 + 5400, XA, { dt: 10 }) };
  const pre = (R: Record<string, { rows: Row[] }>, k: string) => v(R.i!.rows, k, t0);
  add({ id: 'BF-05a', tier: 'P1', ctx: 'X-A GA vent', state: 'class IV (2.1 L) + ongoing loss 4 L / 40 min', intv: '10 u RBC 35 d + 10 u FFP over 40 min (1 u / 2 min), no calcium: ionised Ca', sys: 'BLD CIRC',
    arms, measure: (R) => m({ iCaPre: r2x(pre(R, 'iCa')), iCaNadir: mn(R.i!.rows, 'iCa', t0, t0 + 3000), tNadirS: tn(R.i!.rows, 'iCa', t0, t0 + 3000), citratePeak: mx(R.i!.rows, 'citrate', t0, t0 + 3000), iCa30AfterEnd: v(R.i!.rows, 'iCa', t0 + 2400 + 1800) }),
    expect: [{ m: 'iCaNadir', lo: 0.6, hi: 0.95, invert: true, src: 'Giancarelli 2016 J Surg Res 202:182 (hypocalcaemia in 97 % of massive transfusion; severe < 0.9 in about half); Ho & Leonard 2011 Anaesth Intensive Care 39:46 (iCa 0.6–0.8 above 1 u / 5 min without Ca)' }],
    owner: '7c solutes.ts (citrate)' });
  add({ id: 'BF-05b', tier: 'P1', ctx: 'X-A GA vent', state: 'class IV + ongoing loss', intv: '10 u RBC 35 d stored, 1 u / 4 min: plasma K', sys: 'BLD RHY',
    arms, measure: (R) => m({ kPre: r2x(pre(R, 'k')), kPeak: mx(R.i!.rows, 'k', t0, t0 + 3000), dkPeak: Math.round((mx(R.i!.rows, 'k', t0, t0 + 3000) - pre(R, 'k')) * 100) / 100, k60AfterEnd: v(R.i!.rows, 'k', t0 + 2400 + H) }),
    expect: [{ m: 'dkPeak', lo: 0.3, hi: 2.0, src: 'Aboudara 2008 J Trauma 64:S86 (K rises with rapid old units; hyperkalaemia in ≈ 30 % of massive transfusion); Raza 2015 Transfus Med 25:45 (supernatant K ≈ 1 mmol/L per storage day)' }],
    owner: '7c params.ts storedK' });
  add({ id: 'BF-05c', tier: 'P1', ctx: 'X-A GA vent', state: 'class IV + ongoing loss', intv: '10 u RBC unwarmed (4 °C) vs warmed: core temperature', sys: 'END BLD',
    arms, measure: (R) => m({ tPre: v(R.i!.rows, 'temp', t0), tEndCold: v(R.i!.rows, 'temp', t0 + 2400), tEndWarm: v(R.w!.rows, 'temp', t0 + 2400), dTcold: Math.round((v(R.i!.rows, 'temp', t0 + 2400) - v(R.w!.rows, 'temp', t0 + 2400)) * 100) / 100 }),
    expect: [{ m: 'dTcold', lo: -3.0, hi: -1.5, src: 'Sessler 2008 Lancet 371:1791 (one unit of refrigerated blood lowers mean body temperature ≈ 0.25 °C: 10 u → ≈ −2.5 °C); ATLS 10e' }],
    owner: '7e thermal/environment.ts ivInflow' });
  add({ id: 'BF-05d', tier: 'P1', ctx: 'X-A GA vent', state: 'class IV (2.1 L in 10 min) + ongoing loss', intv: 'the shock itself and its transfusion: base excess, lactate, pH', sys: 'BLD CIRC',
    arms, measure: (R) => m({ bePre: r2x(pre(R, 'be')), beNadir: mn(R.i!.rows, 'be', 60, t0 + 3000), lactPeak: mx(R.i!.rows, 'lact', 60, t0 + 5400), phNadir: mn(R.i!.rows, 'ph', 60, t0 + 3000), mapNadir: mn(R.i!.rows, 'map', 60, t0 + 3000), coNadir: mn(R.i!.rows, 'co', 60, t0 + 3000), arrest: R.i!.rows.some((r) => r.pulseless === true || r.noEject === true) }),
    expect: [{ m: 'beNadir', lo: -20, hi: -10, src: 'ATLS 10e table 3-1: class IV base deficit ≤ −10 mmol/L' },
      { m: 'lactPeak', lo: 4, hi: 12, src: 'class IV shock: lactate > 4 mmol/L (ATLS 10e; tables §7 17a gives 3–5 for class III)' }],
    owner: '7c solutes.ts sidOf (citrate) / params.ts PRODUCTS', hand: { verdict: 'TW', why: 'lactate reaches 7.1 but BE never falls below 0: citrate is not an anion in the strong-ion difference (solutes.ts:37–38 sidOf), so each FFP unit (Na 165, Cl 75) adds a ≈ 90 mEq/L strong-ion excess at once instead of after hepatic citrate metabolism; stored RBC carry no lactate or acid. The same bleed WITHOUT products reaches lactate 5.9 at BE −3.6 with PaCO2 38 → 53 at fixed ventilation: the class IV acidosis is mostly respiratory' } });
  add({ id: 'BF-05e', tier: 'P1', ctx: 'X-A GA vent', state: 'class IV + ongoing loss', intv: '≈ 1 blood volume replaced: dilutional coagulopathy (INR, fibrinogen, platelets)', sys: 'COAG',
    arms: { i: arms.i }, measure: (R) => m({ inrEnd: v(R.i!.rows, 'inr', t0 + 2400), albEnd: v(R.i!.rows, 'alb', t0 + 2400) }),
    expect: [], ne: 'no coagulation model: INR here is 7d liver-function only; fibrinogen, platelets and TEG/ROTEM absent (7i, R58/R60 v1.1)', owner: '7i' });
}
function r2x(x: number): number { return Math.round(x * 100) / 100; }
function tn(rows: Row[], k: string, t0: number, t1: number): number { let b = Infinity; let tt = NaN; for (const r of rows) if ((r.t as number) > t0 && (r.t as number) <= t1 && (r[k] as number) < b) { b = r[k] as number; tt = (r.t as number) - t0; } return tt; }

// ---- BF-06: calcium chloride in hypocalcaemia --------------------------------------------------------------------------
{
  const P = { blood: { iCa: 0.9 } };
  const arms = { i: G([d(T, 'calciumChloride', 1, 'g')], T + 1800, P), c: G([], T + 1800, P), ri: G([d(T, 'calciumChloride', 1, 'g')], T + 1800), rc: G([], T + 1800) };
  add({ id: 'BF-06a', tier: 'P1', ctx: 'X-A GA vent, profile iCa 0.9', state: 'hypocalcaemia iCa 0.9', intv: 'calcium chloride 1 g IV: ionised Ca', sys: 'BLD',
    arms, measure: (R) => m({ iCaBase: v(R.c!.rows, 'iCa', T), dICaPeak: dMax(R.i!.rows, R.c!.rows, 'iCa', T, T + 600), dICa10: dAt(R.i!.rows, R.c!.rows, 'iCa', T + 600), dICa30: dAt(R.i!.rows, R.c!.rows, 'iCa', T + 1800) }),
    expect: [{ m: 'dICaPeak', lo: 0.2, hi: 0.3, src: 'research/12 BF-06 (iCa +0.2–0.3 after 1 g CaCl2 = 6.8 mmol); Miller 10e ch. 47' }],
    owner: '7c pipeline.ts observeDoses' });
  add({ id: 'BF-06b', tier: 'P1', ctx: 'X-A GA vent, profile iCa 0.9 vs normocalcaemic', state: 'hypocalcaemia iCa 0.9', intv: 'calcium chloride 1 g IV: MAP (state-dependence)', sys: 'CIRC',
    arms, measure: (R) => {
      const hypo = dMax(R.i!.rows, R.c!.rows, 'map', T, T + 900);
      const norm = dMax(R.ri!.rows, R.rc!.rows, 'map', T, T + 900);
      return m({ mapBaseHypo: Math.round(v(R.c!.rows, 'map', T)), mapBaseNorm: Math.round(v(R.rc!.rows, 'map', T)), dMapHypo: hypo, dMapNorm: norm, extra: Math.round((hypo - norm) * 10) / 10, dCoHypo: dMax(R.i!.rows, R.c!.rows, 'co', T, T + 900) });
    },
    expect: [{ m: 'dMapHypo', dir: 1, tol: 2, src: 'calcium restores contractility and tone in hypocalcaemia (Miller 10e ch. 47; research/12 BF-06 "MAP ↑ in hypocalcaemia")' },
      { m: 'extra', dir: 1, tol: 1, src: 'the pressor effect of calcium is larger when iCa is low (state-dependence, R53)' }],
    dirOnly: true, owner: '7c circ-adapter.ts chemistryContractility' });
}

// ---- BF-13: sodium bicarbonate in shock lactic acidosis ----------------------------------------------------------------
{
  const tB = 1500;
  const arms = { i: G([...CL4, d(tB, 'sodiumBicarbonate', 70, 'mmol')], tB + 2400, XA, { dt: 5 }), c: G([...CL4], tB + 2400, XA, { dt: 5 }) };
  const dPh = (R: Record<string, { rows: Row[] }>) => dMax(R.i!.rows, R.c!.rows, 'ph', tB, tB + 900);
  add({ id: 'BF-13a', tier: 'P1', ctx: 'X-A GA vent (fixed minute ventilation)', state: 'class IV shock, lactic acidosis', intv: 'sodium bicarbonate 1 mmol/kg: PaCO2 and EtCO2', sys: 'BLD LUNG',
    arms, measure: (R) => m({ phBefore: v(R.c!.rows, 'ph', tB), lactBefore: v(R.c!.rows, 'lact', tB), dPaco2Peak: dMax(R.i!.rows, R.c!.rows, 'paco2', tB, tB + 900), dEtco2Peak: dMax(R.i!.rows, R.c!.rows, 'etco2', tB, tB + 900), dPaco2At20: dAt(R.i!.rows, R.c!.rows, 'paco2', tB + 1200) }),
    expect: [{ m: 'dPaco2Peak', lo: 3, hi: 10, src: 'Hindman 1990 Anesthesiology 72:1064 (bicarbonate generates CO2: PaCO2 rises at fixed ventilation); Cooper 1990 Ann Intern Med 112:492' }],
    owner: '7c treatments.ts bicarbCo2MlMin' });
  add({ id: 'BF-13b', tier: 'P1', ctx: 'X-A GA vent', state: 'class IV shock, lactic acidosis', intv: 'sodium bicarbonate 1 mmol/kg: ionised Ca', sys: 'BLD',
    arms, measure: (R) => m({ iCaBefore: v(R.c!.rows, 'iCa', tB), dICa: dMin(R.i!.rows, R.c!.rows, 'iCa', tB, tB + 900) }),
    expect: [{ m: 'dICa', lo: -0.15, hi: -0.03, src: 'Cooper 1990 Ann Intern Med 112:492 (bicarbonate lowered ionised calcium in lactic acidosis)' }],
    owner: '7c solutes.ts ionisedCa' });
  add({ id: 'BF-13c', tier: 'P1', ctx: 'X-A GA vent', state: 'class IV shock, lactic acidosis', intv: 'sodium bicarbonate 1 mmol/kg: pH (peak and 30 min)', sys: 'BLD',
    arms, measure: (R) => m({ dPhPeak: dPh(R), tPeakS: ttx(R.i!.rows, R.c!.rows, 'ph', tB, tB + 900), dPh30: dAt(R.i!.rows, R.c!.rows, 'ph', tB + 1800), dHco3: dAt(R.i!.rows, R.c!.rows, 'hco3', tB + 600), dNa: dAt(R.i!.rows, R.c!.rows, 'na', tB + 600), dLact30: dAt(R.i!.rows, R.c!.rows, 'lact', tB + 1800) }),
    expect: [{ m: 'dPhPeak', lo: 0.03, hi: 0.15, src: 'Cooper 1990 Ann Intern Med 112:492 (a small pH rise, no haemodynamic benefit); Miller 10e ch. 47' }],
    owner: '7c' });
}
function ttx(i: Row[], c: Row[], k: string, t0: number, t1: number): number { const cm = new Map(c.map((r) => [r.t, r])); let b = -Infinity; let tt = NaN; for (const r of i) { const q = cm.get(r.t); if (!q || (r.t as number) <= t0 || (r.t as number) > t1) continue; const x = (r[k] as number) - (q[k] as number); if (x > b) { b = x; tt = (r.t as number) - t0; } } return tt; }

// ---- BF-16: acute vs chronic hypercapnia (Boston rules) ----------------------------------------------------------------
add({ id: 'BF-16a', tier: 'P1', ctx: 'X-A GA vent', state: 'acute respiratory acidosis', intv: 'VCV RR 12 → 6 for 30 min: ΔHCO3 per 10 mmHg ΔPaCO2', sys: 'BLD LUNG',
  arms: { i: G([ven(T, { rr: 6 })], T + 1800), c: G([], T + 1800) },
  measure: (R) => {
    const dp = v(R.i!.rows, 'paco2', T + 1800) - v(R.c!.rows, 'paco2', T + 1800);
    const dh = v(R.i!.rows, 'hco3', T + 1800) - v(R.c!.rows, 'hco3', T + 1800);
    return m({ paco2: v(R.i!.rows, 'paco2', T + 1800), dPaco2: Math.round(dp * 10) / 10, dHco3: Math.round(dh * 100) / 100, hco3Per10: Math.round((10 * dh) / dp * 100) / 100, ph: v(R.i!.rows, 'ph', T + 1800), dK: dAt(R.i!.rows, R.c!.rows, 'k', T + 1800) });
  },
  expect: [{ m: 'hco3Per10', lo: 0.5, hi: 1.5, src: 'Brackett, Cohen & Schwartz 1965 NEJM 272:6 (acute: HCO3 +1 per 10 mmHg PaCO2; "Boston rules")' }],
  owner: '7c acid-base.ts' });
add({ id: 'BF-16b', tier: 'P1', ctx: 'COPD GOLD 3 (lung copd 0.75) awake spontaneous, room air', state: 'chronic hypercapnia (the COPD profile)', intv: 'baseline: HCO3 against PaCO2 (renal compensation)', sys: 'BLD LUNG',
  arms: { i: AW([], 1800, COPD3, { dt: 10 }), c: AW([], 1800, XA, { dt: 10 }) },
  measure: (R) => {
    const dp = v(R.i!.rows, 'paco2', 1800) - v(R.c!.rows, 'paco2', 1800);
    const dh = v(R.i!.rows, 'hco3', 1800) - v(R.c!.rows, 'hco3', 1800);
    return m({ paco2Copd: v(R.i!.rows, 'paco2', 1800), hco3Copd: v(R.i!.rows, 'hco3', 1800), phCopd: v(R.i!.rows, 'ph', 1800), dPaco2: Math.round(dp * 10) / 10, hco3Per10: Math.round((10 * dh) / dp * 100) / 100 });
  },
  expect: [{ m: 'dPaco2', lo: 5, hi: 15, src: 'GOLD 3 chronic hypercapnia PaCO2 45–55 (tables §1.5 copd; research/12 CM-07)' },
    { m: 'hco3Per10', lo: 3, hi: 4.5, src: 'Brackett 1965 / Schwartz 1965 (chronic: HCO3 +3.5 per 10 mmHg PaCO2; "Boston rules")' }],
  owner: '7b copd profile → 7c HCO3 (F7)', hand: { verdict: 'TW', why: 'the COPD profile raises PaCO2 to 45 but leaves the HCO3 at the acute-buffer value (25.0, pH 7.36): the chronic renal compensation of a chronic lung state is not set when the profile is built (7c createBloodCore calibrates HCO3 to the profile\'s 24.4 unless blood.hco3 is given)' } });

// ---- BF-17: hyperventilation to PaCO2 ≈ 25 ------------------------------------------------------------------------------
{
  const arms = { i: G([ven(T, { rr: 18 })], T + 2400), c: G([], T + 2400) }; // resume fix: 20 × 700 overshot to PaCO2 16
  const at = T + 1800;
  const base = (R: Record<string, { rows: Row[] }>) => ({ dPh: v(R.i!.rows, 'ph', at) - v(R.c!.rows, 'ph', at), paco2: v(R.i!.rows, 'paco2', at) });
  add({ id: 'BF-17a', tier: 'P1', ctx: 'X-A GA vent', state: 'acute respiratory alkalosis', intv: 'VCV 18 × 600 for 30 min (PaCO2 ≈ 25): ionised Ca per +0.1 pH', sys: 'BLD',
    arms, measure: (R) => { const b = base(R); const di = dAt(R.i!.rows, R.c!.rows, 'iCa', at); return m({ paco2: b.paco2, dPh: Math.round(b.dPh * 1000) / 1000, dICa: di, iCaPer01: Math.round((0.1 * di) / b.dPh * 1000) / 1000 }); },
    expect: [{ m: 'iCaPer01', lo: -0.06, hi: -0.03, src: 'Fogh-Andersen 1981 Clin Chem 27:1264 / Wang 2002 (iCa falls ≈ 0.04–0.05 mmol/L per 0.1 pH rise)' }],
    owner: '7c solutes.ts ionisedCa' });
  add({ id: 'BF-17b', tier: 'P1', ctx: 'X-A GA vent', state: 'acute respiratory alkalosis', intv: 'VCV 18 × 600 for 30 min: plasma K per +0.1 pH', sys: 'BLD',
    arms, measure: (R) => { const b = base(R); const dk = dAt(R.i!.rows, R.c!.rows, 'k', at); return m({ dPh: Math.round(b.dPh * 1000) / 1000, dK: dk, kPer01: Math.round((0.1 * dk) / b.dPh * 100) / 100, dK40: dAt(R.i!.rows, R.c!.rows, 'k', T + 2400) }); },
    expect: [{ m: 'kPer01', lo: -0.4, hi: -0.1, src: 'Adrogué & Madias 1981 Am J Med 71:456 (respiratory acid–base disorders move K only 0.1–0.4 mmol/L per 0.1 pH, less than mineral acidosis)' }],
    owner: '7c core.ts kSet (phNonOrg)' });
  add({ id: 'BF-17c', tier: 'P1', ctx: 'X-A GA vent', state: 'acute respiratory alkalosis', intv: 'VCV 18 × 600 for 30 min: cerebral blood flow', sys: 'BRN',
    arms, measure: (R) => m({ paco2: base(R).paco2, cbfPct: Math.round((100 * (v(R.i!.rows, 'cbf', at) - v(R.c!.rows, 'cbf', at))) / v(R.c!.rows, 'cbf', at) * 10) / 10, dIcp: dAt(R.i!.rows, R.c!.rows, 'icp', at) }),
    expect: [{ m: 'cbfPct', lo: -50, hi: -25, src: 'CBF −2–4 %/mmHg PaCO2 (Miller 10e ch. 11); tables §7 check 18 (≈ −35–40 % at PaCO2 25)' }],
    owner: '7d brain' });
}

// ---- BF-24…26: coagulation (7i, v1.1) — NE with probes ----------------------------------------------------------------
add({ id: 'BF-24', tier: 'P1', ctx: 'X-A GA vent', state: 'class III bleeding', intv: 'tranexamic acid 1 g: fibrinolysis (LY30)', sys: 'COAG',
  arms: { i: G([...CL3, d(TB, 'tranexamicAcid', 1000, 'mg')], TB + 600), c: G([...CL3], TB + 600) },
  measure: (R) => m({ dMap: Math.round(v(R.i!.rows, 'map', TB + 600) - v(R.c!.rows, 'map', TB + 600)), dHb: dAt(R.i!.rows, R.c!.rows, 'hb', TB + 600) }),
  expect: [], ne: 'TXA is a 7g placeholder row (accepted, no PD); no fibrinolysis, LY30 or bleeding-rate term (7i, R58/R60 v1.1)', owner: '7i' });
{
  // one probe of what exists after ≈ 1.5 BV dilution (bleed 4 L replaced by 3 L saline + 6 u RBC) and after cooling/acidosis
  const probe = G([bl(60, 4000, 2400), fl(60, 'saline', 3000, 2400), tx(60, 'rbc', 6, 2400, { warmed: true })], 3600, XA, { dt: 30 });
  const P = (R: Record<string, { rows: Row[] }>) => m({ hbEnd: v(R.p!.rows, 'hb', 2460), albEnd: v(R.p!.rows, 'alb', 2460), inrEnd: v(R.p!.rows, 'inr', 2460) });
  const items: [string, string][] = [['BF-25a', 'INR/PT and aPTT'], ['BF-25b', 'fibrinogen < 1.5 g/L'], ['BF-25c', 'platelets < 100'], ['BF-25d', 'ROTEM CT / A10 (EXTEM, FIBTEM)'], ['BF-25e', 'hypothermia 33 °C + pH 7.1 worsening clotting']];
  for (const [id, what] of items) {
    add({ id, tier: 'P1', ctx: 'X-A GA vent', state: 'dilution ≈ 1.5 BV; 33 °C + pH 7.1', intv: what, sys: 'COAG', arms: { p: probe }, measure: P,
      expect: [], ne: 'no coagulation factors, fibrinogen, platelets or viscoelastic tests; INR is 7d liver function only (7i, R58/R60 v1.1)', owner: '7i' });
  }
  const prods: [string, string, Record<string, unknown>][] = [
    ['BF-26a', 'fibrinogen concentrate 4 g', { kind: 'drug', drugId: 'fibrinogen', dose: 4, unit: 'g', route: 'iv' }],
    ['BF-26b', 'cryoprecipitate 10 u', { kind: 'transfusion', product: 'cryo', units: 10, overS: 600 }],
    ['BF-26c', 'PCC 25 IU/kg', { kind: 'drug', drugId: 'pcc', dose: 25, unit: 'units/kg', route: 'iv' }],
    ['BF-26d', 'platelets 1 pool targeted by EXTEM A10', { kind: 'transfusion', product: 'platelets', units: 1, overS: 600 }],
  ];
  for (const [id, what, ev] of prods) {
    add({ id, tier: 'P1', ctx: 'X-A GA vent', state: 'coagulopathy (dilutional)', intv: `${what}: targeted correction by FIBTEM/EXTEM`, sys: 'COAG',
      arms: { p: G([raw(T, ev, what)], T + 60) }, measure: () => m({}),
      expect: [], ne: `no coagulation model to correct (7i); ${what} ${id === 'BF-26d' ? 'is accepted as volume only' : 'is not in the library'}`, owner: '7i' });
  }
}

// ---- BF-29: ABG vs VBG in low flow --------------------------------------------------------------------------------------
{
  const tL = 1200;
  const arms = { lo: G([bl(60, 2000, 600), [tL, A.lab('abg'), 'ABG'], [tL, A.lab('vbg'), 'VBG']], tL + 300, XA), n: G([[tL, A.lab('abg'), 'ABG'], [tL, A.lab('vbg'), 'VBG']], tL + 300, XA) };
  const gap = (R: { labs: import('./runner.ts').Lab[] }) => { const a = lab(R, 'abg'); const b = lab(R, 'vbg'); return a && b ? (b.values.pco2 as number) - (a.values.pco2 as number) : NaN; };
  add({ id: 'BF-29a', tier: 'P1', ctx: 'X-A GA vent', state: 'low cardiac output (2 L bleed, CO ≈ half)', intv: 'ABG + VBG drawn together: venous–arterial PCO2 gap (vs the same draw at normal CO)', sys: 'BLD DEV',
    arms, measure: (R) => m({ coLow: v(R.lo!.rows, 'co', tL), gapLow: gap(R.lo!), gapNormal: gap(R.n!), vbgPhLow: lab(R.lo!, 'vbg')?.values.ph ?? NaN, abgPhLow: lab(R.lo!, 'abg')?.values.ph ?? NaN }),
    expect: [{ m: 'gapLow', lo: 6, hi: 20, src: 'Mallat 2016 Ann Intensive Care 6:10 / Cuschieri 2005 Intensive Care Med 31:818 (Pv–aCO2 > 6 mmHg marks low flow)' },
      { m: 'gapNormal', lo: 2, hi: 6, src: 'normal Pv–aCO2 gap 2–6 mmHg (Mallat 2016)' }],
    owner: '7c labs.ts' });
  add({ id: 'BF-29b', tier: 'P1', ctx: 'X-A GA vent', state: 'low cardiac output (2 L bleed)', intv: 'VBG: venous O2 saturation', sys: 'BLD DEV',
    arms, measure: (R) => m({ svo2Low: lab(R.lo!, 'vbg')?.values.so2 ?? NaN, svo2Normal: lab(R.n!, 'vbg')?.values.so2 ?? NaN, svo2Truth: v(R.lo!.rows, 'svo2', tL), lactLow: v(R.lo!.rows, 'lact', tL) }),
    expect: [{ m: 'svo2Low', lo: 30, hi: 65, src: 'SvO2 < 65 % in low output / haemorrhagic shock (Rivers 2001 NEJM 345:1368; Vincent & De Backer 2013 NEJM 369:1726)' },
      { m: 'svo2Normal', lo: 70, hi: 85, src: 'normal SvO2 70–80 % under GA (Miller 10e ch. 36)' }],
    owner: '7c oxygen.ts o2Delivery (F3)', hand: { verdict: 'WR', why: 'SvO2 RISES from 77 to 84 % as CO falls 4.6 → 2.1 L/min while lactate climbs to 3.6: the regional supply-dependence term (oxygen.ts:24–27, REGIONAL_* in params.ts:65–67) removes 62 % of VO2 (203 → 78 mL/min) at a DO2 still at the critical 6 mL/kg/min instead of letting extraction rise to ER_MAX; venous saturation and lactate contradict each other (a septic, not a haemorrhagic, signature)' } });
}

// ---- BF-30: lab turnaround reflects the draw time -----------------------------------------------------------------------
// resume fix: the first version drew during a bleed, but Hb had not changed by the result time (not discriminating). Now a
// bicarbonate bolus 5 s after the draw moves HCO3 at once, so the result must show the PRE-bolus value.
add({ id: 'BF-30', tier: 'P1', ctx: 'X-A GA vent', state: 'normal, then NaHCO3 100 mmol 5 s after the draw', intv: 'ABG drawn at 420 s (default turnaround): the result shows the draw-time values', sys: 'BLD DEV',
  arms: { i: G([[420, A.lab('abg'), 'ABG at 420 s'], d(425, 'sodiumBicarbonate', 100, 'mmol')], 900, XA, { dt: 5 }) },
  measure: (R) => {
    const L = lab(R.i!, 'abg');
    const res = L?.values.hco3 ?? NaN;
    const tr = L?.t ?? 540;
    return m({ resultAtS: Math.round(L?.t ?? NaN), drawnAtS: Math.round(L?.drawnAt ?? NaN), hco3Result: res, hco3TruthAtDraw: Math.round(v(R.i!.rows, 'hco3', 415) * 10) / 10, hco3TruthAtResult: Math.round(v(R.i!.rows, 'hco3', tr) * 10) / 10,
      matchesDraw: Math.abs(res - v(R.i!.rows, 'hco3', 415)) <= 0.3 && Math.abs(res - v(R.i!.rows, 'hco3', tr)) > 1 });
  },
  expect: [{ m: 'matchesDraw', event: true, src: 'a blood gas reports the sample at its draw time; the analyser adds only a delay (7c plan decision 13)' }],
  owner: '7c labs.ts' });

export { NOARREST };
