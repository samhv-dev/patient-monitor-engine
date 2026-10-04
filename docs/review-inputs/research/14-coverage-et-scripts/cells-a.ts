// ET group A — perioperative temperature (P1): redistribution and the linear/plateau phases under GA (ET-01), active
// warming (ET-02), elderly and child (ET-03), neuraxial (ET-04), emergence shivering (ET-05), cold crystalloid (ET-06),
// cold blood (ET-07), exposure and skin prep (ET-29, added), the GA metabolic switch (ET-35, added).
import { A, FLAG, GA, H, T, V, SP, XA, XC, XE, a2, a3, add, at, first, m, mbt, mx, mn, w, w2, r2, r3 } from './spec.ts';
import type { Row } from './runner.ts';

const SESSLER = 'Sessler DI, Anesthesiology 2000;92:578–596 (perioperative heat balance: core falls 1–1.5 °C in the first hour of GA by redistribution, then 0.3–0.5 °C/h, then a plateau at 3–4 h once vasoconstriction is triggered); Matsukawa T et al., Anesthesiology 1995;82:662 (−1.6 ± 0.3 °C in hour 1, 81 % redistribution) [VERIFY]';
const rate = (rows: Row[], t0: number, t1: number) => r3(((at(rows, 'tc', t1) as number) - (at(rows, 'tc', t0) as number)) / ((t1 - t0) / H));
/** Core temperature at which vasoconstriction starts (the vasomotor dilation fraction crosses 0.5). */
const vasoOnset = (rows: Row[], t0: number) => { const r = rows.find((x) => (x.t as number) > t0 && (x.vasoF as number) < 0.5); return r ? r3(r.tc as number) : NaN; };
/** Hours after induction at which vasoconstriction starts. */
const vasoOnsetH = (rows: Row[], t0: number) => { const r = rows.find((x) => (x.t as number) > t0 && (x.vasoF as number) < 0.5); return r ? r2(((r.t as number) - t0) / H) : NaN; };
const shiverOnset = (rows: Row[], t0: number) => { const r = rows.find((x) => (x.t as number) > t0 && (x.shivW as number) > 1); return r ? r3(r.tc as number) : NaN; };

// ---- ET-01 GA 5 h, no warming, 21 °C --------------------------------------------------------------------------------
const ga5 = V(GA(), T + 7 * H, XA, { dt: 60 });
add({ id: 'ET-01a', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'GA (propofol 2 mg/kg + rocuronium + sevoflurane 2 %), draped, 21 °C, no warming', intv: 'hour 1 after induction: redistribution hypothermia; the displayed T1 against the core', sys: 'END DEV',
  arms: { i: ga5 },
  measure: (R) => { const r = R.i!.rows; return m({ tc0: a2(r, 'tc', T), dT30: r2((at(r, 'tc', T + 1800) as number) - (at(r, 'tc', T) as number)), dT1h: r2((at(r, 'tc', T + H) as number) - (at(r, 'tc', T) as number)),
    tp0: a2(r, 'tp', T), tp1h: a2(r, 'tp', T + H), kcpPre: a2(r, 'kcp', T - 60), kcp1h: a2(r, 'kcp', T + H), dispMinusCore1h: r2((at(r, 'dTemp', T + H) as number) - (at(r, 'tc', T + H) as number)) }); },
  expect: [{ m: 'dT1h', lo: -1.5, hi: -1.0, src: SESSLER }, { m: 'dispMinusCore1h', quiet: true, tol: 0.15, src: 'the oesophageal/T1 display follows the core within its probe lag and 0.1 °C rounding (research/03 §6.1; A10-E1)' }],
  owner: '7e thermal/heat.ts (Stage 3 constants)' });
add({ id: 'ET-01b', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'GA, draped, 21 °C, no warming', intv: 'hours 2–5: the linear phase, the vasoconstriction threshold and the plateau', sys: 'END',
  arms: { i: ga5 },
  measure: (R) => { const r = R.i!.rows; return m({ rateH2to3: rate(r, T + H, T + 3 * H), rateH4to5: rate(r, T + 4 * H, T + 5 * H), rateH6to7: rate(r, T + 6 * H, T + 7 * H), tc3h: a2(r, 'tc', T + 3 * H), tc5h: a2(r, 'tc', T + 5 * H), tc7h: a2(r, 'tc', T + 7 * H), vasoOnsetC: vasoOnset(r, T + 60), vasoOnsetH: vasoOnsetH(r, T + 60), depth4h: a2(r, 'depth', T + 4 * H), mac4h: a2(r, 'mac', T + 4 * H), shiverAny: (mx(r, 'shivW', T, T + 5 * H) > 1) }); },
  expect: [{ m: 'rateH2to3', lo: -0.5, hi: -0.3, src: SESSLER + ' (linear phase)' }, { m: 'vasoOnsetC', lo: 34.3, hi: 34.7, src: 'Sessler 2000 / Kurz A 1993: GA vasoconstriction threshold ≈ 34.5 ± 0.2 °C (tables §5c; the engine param VASOCONSTRICT_C 34.8 is tagged [ENG] "plateau 34.6–34.8")' },
    { m: 'vasoOnsetH', lo: 3, hi: 4, invert: true, src: SESSLER + ' (the plateau begins at 3–4 h)' }, { m: 'rateH4to5', quiet: true, tol: 0.1, src: SESSLER + ' (plateau: core stable once vasoconstricted)' }],
  hand: { verdict: 'TW', why: "the direction and redistribution are right, but the linear phase runs at 0.29 °C/h (−0.30 to −0.50) so vasoconstriction starts only at 6.2 h (34.55 °C; Sessler 3–4 h): the core at 3 h is 35.04 against ≈ 34.5–35 expected. The plateau itself exists (−0.07 °C/h in hour 7). The depth-extrapolated threshold (thresholds.ts:31–37, depth 1.06 at MAC 0.93 → 34.55) and the draped insulation calibrated to the AWAKE balance (heat.ts:108, environment.ts calibrateInsulation) set the rate; no incision/wound loss in a draped rig (ET-02's open-wound arm reaches 34.53 at 3 h)" },
  owner: '7e thermal/params.ts VASOCONSTRICT_C' });

// ---- ET-02 active warming -------------------------------------------------------------------------------------------
const rl = (t: number): [number, any, string] => [t, A.fluid('rl', 2000, 3 * H), 'RL 2 L over 3 h'];
add({ id: 'ET-02', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'GA, draped, 21 °C, RL 2 L over 3 h', intv: 'forced air (43 °C, upper body) + fluid warmer from induction vs neither', sys: 'END',
  arms: { i: V([...GA(), rl(T), [T, A.thermal({ warming: true }), 'forced air 43'], [T, A.thermal7e({ fluidWarmer: true }), 'fluid warmer']], T + 3 * H, XA, { dt: 60 }),
    c: V([...GA(), rl(T)], T + 3 * H, XA, { dt: 60 }),
    iw: V([...GA(), rl(T), [T, A.thermal({ warming: true }), 'forced air 43'], [T, A.thermal7e({ fluidWarmer: true }), 'fluid warmer'], [T + 1800, A.thermal7e({ exposure: 'prep' }), 'open wound / prep']], T + 3 * H, XA, { dt: 60 }),
    cw: V([...GA(), rl(T), [T + 1800, A.thermal7e({ exposure: 'prep' }), 'open wound / prep']], T + 3 * H, XA, { dt: 60 }) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows; return m({ tc3hWarmWound: a2(R.iw!.rows, 'tc', T + 3 * H), tc3hColdWound: a2(R.cw!.rows, 'tc', T + 3 * H), dT1hWarm: r2((at(i, 'tc', T + H) as number) - (at(i, 'tc', T) as number)), dT1hCold: r2((at(c, 'tc', T + H) as number) - (at(c, 'tc', T) as number)),
    tc3hWarm: a2(i, 'tc', T + 3 * H), tc3hCold: a2(c, 'tc', T + 3 * H), rateWarmH2to3: rate(i, T + 2 * H, T + 3 * H), warmW1h: a2(i, 'warmW', T + H), warmW3h: a2(i, 'warmW', T + 3 * H) }); },
  expect: [{ m: 'dT1hWarm', lo: -1.0, hi: -0.5, src: 'research/12 ET-02; Sessler DI, Lancet 2008;371:1791 (forced air does not prevent the first-hour redistribution; it then holds or rewarms the core)' },
    { m: 'tc3hWarmWound', lo: 35.5, hi: 36.5, src: 'research/12 ET-02 (plateau near 36 °C with forced air); Kurz A, NEJM 1996;334:1209 (warmed group 36.6 ± 0.5 vs 34.7 °C at the end of colorectal surgery) [VERIFY]' }],
  owner: '7e thermal/environment.ts FORCED_AIR_* (fitted to R39-7)' });

// ---- ET-03 elderly and child ----------------------------------------------------------------------------------------
add({ id: 'ET-03a', tier: 'P1', ctx: 'X-E 80 y vs X-A 40 y, ventilated', state: 'GA, draped, 21 °C, no warming', intv: 'as ET-01: the vasoconstriction threshold and the core at 4 h', sys: 'END',
  arms: { e: V(GA(), T + 7 * H, XE, { dt: 60 }), a: ga5 },
  measure: (R) => { const e = R.e!.rows, a = R.a!.rows; return m({ vasoOnsetElderly: vasoOnset(e, T + 60), vasoOnsetAdult: vasoOnset(a, T + 60), dVasoOnset: r2(vasoOnset(e, T + 60) - vasoOnset(a, T + 60)),
    tc4hElderly: a2(e, 'tc', T + 4 * H), tc7hElderly: a2(e, 'tc', T + 7 * H), mac4hElderly: a2(e, 'mac', T + 4 * H), depth4hElderly: a2(e, 'depth', T + 4 * H), depth4hAdult: a2(a, 'depth', T + 4 * H), tc4hAdult: a2(a, 'tc', T + 4 * H), d4h: r2((at(e, 'tc', T + 4 * H) as number) - (at(a, 'tc', T + 4 * H) as number)), dT1hElderly: r2((at(e, 'tc', T + H) as number) - (at(e, 'tc', T) as number)) }); },
  expect: [{ m: 'dVasoOnset', lo: -1.3, hi: -0.7, src: 'Kurz A, Plattner O, Sessler DI et al., Anesthesiology 1993;79:465 (the vasoconstriction threshold under isoflurane/N2O is ≈ 1 °C lower in patients 60–80 y than 30–50 y) [VERIFY]; research/12 ET-03 / tables §1.1' },
    { m: 'd4h', dir: -1, tol: 0.2, src: 'the lower threshold lets the elderly core fall further before the plateau (Kurz 1993; Frank SM 1992 Anesthesiology 77:252)' }],
  hand: { verdict: 'MI', why: "no age term in the thermoregulatory thresholds (thresholds.ts:30–38 depend on depth and set point only): the 80-year-old's core runs 0.09 °C below the adult's at 4 h, and only because the same 2 % sevoflurane is a deeper MAC at 80 y (MAC-age → 7f thermoDepth → the depth-extrapolated threshold). Kurz 1993: ≈ 1 °C lower vasoconstriction threshold in the elderly" },
  owner: '7e thermal/thresholds.ts (no age term)' });
add({ id: 'ET-03b', tier: 'P1', ctx: 'X-C 4 y 16 kg vs X-A, ventilated', state: 'GA, draped, 21 °C, no warming', intv: 'as ET-01: hour-1 fall (surface/mass)', sys: 'END',
  arms: { c: V(GA(), T + 3 * H, XC, { dt: 60 }), a: V(GA(), T + 3 * H, XA, { dt: 60 }) },
  measure: (R) => { const c = R.c!.rows, a = R.a!.rows; const dC = (at(c, 'tc', T + H) as number) - (at(c, 'tc', T) as number), dA = (at(a, 'tc', T + H) as number) - (at(a, 'tc', T) as number);
    return m({ dT1hChild: r2(dC), dT1hAdult: r2(dA), childMinusAdult: r2(dC - dA), tc3hChild: a2(c, 'tc', T + 3 * H), tc3hAdult: a2(a, 'tc', T + 3 * H), bsaPerKgRatio: r2((0.20247 * 16 ** 0.425 * 1.02 ** 0.725 / 16) / (0.20247 * 70 ** 0.425 * 1.75 ** 0.725 / 70)) }); },
  expect: [{ m: 'childMinusAdult', dir: -1, tol: 0.1, src: 'research/12 ET-03 / tables §1.1: a child cools faster (surface area per kg ≈ 1.6× the adult\'s; Bissonnette B, Paediatr Anaesth 1991 [VERIFY]); Sessler 2000' }],
  dirOnly: true, owner: '7e thermal/heat.ts (sized by weight and BSA)' });

// ---- ET-04 neuraxial -------------------------------------------------------------------------------------------------
add({ id: 'ET-04', tier: 'P1', ctx: 'X-A awake, spontaneous room air', state: 'neuraxial thermal state (`thermal anaesthesia neuraxial`) at T, draped, 21 °C', intv: 'hour-1 redistribution vs GA; shivering once the core falls', sys: 'END LUNG',
  arms: { n: SP([[T, A.thermal({ anaesthesia: 'neuraxial' }), 'neuraxial']], T + 3 * H, XA, { dt: 60 }), g: V([FLAG(T)], T + 3 * H, XA, { dt: 60 }) },
  measure: (R) => { const n = R.n!.rows, g = R.g!.rows; const dN = (at(n, 'tc', T + H) as number) - (at(n, 'tc', T) as number), dG = (at(g, 'tc', T + H) as number) - (at(g, 'tc', T) as number);
    return m({ dT1hNeur: r2(dN), dT1hGa: r2(dG), ratioNeurGa: r2(dN / dG), tc3hNeur: a2(n, 'tc', T + 3 * H), tcMinNeur: mn(n, 'tc', T, T + 3 * H), shivers: mx(n, 'shivW', T, T + 3 * H) > 1, shiverOnsetC: shiverOnset(n, T), depthNeur: a2(n, 'depth', T + H) }); },
  expect: [{ m: 'ratioNeurGa', lo: 0.4, hi: 0.6, src: 'research/12 ET-04 (redistribution about half of GA); Matsukawa T et al., Anesthesiology 1995;83:961 (epidural: −0.8 ± 0.3 °C in hour 1) [VERIFY]' },
    { m: 'shivers', event: true, src: 'Kurz A, Sessler DI et al., Anesthesiology 1993;79:1193 (spinal/epidural lower the shivering threshold only ≈ 0.5 °C, to ≈ 35.5 °C: the patient shivers once the core passes it); Sessler 2008' }],
  hand: { verdict: 'WR', why: "the neuraxial state takes the FULL GA thermoregulatory depth: heat.ts:161 `target = … anaesthesia === 'none' ? 0 : 1`, so an awake spinal/epidural patient gets the GA thresholds (shivering 33.5, vasoconstriction 34.8) plus kcp × 1.8 and skin loss × 1.5 (params.ts:14–15). Redistribution is 0.9 of GA (−1.07 vs −1.19 °C in hour 1; expected ≈ half) and the core falls to 34.4 °C at 3 h with NO shivering (expected at ≈ 35.5 °C). The block's sympathectomy (vasodilation below the level) is right; the central thresholds are not changed by a neuraxial block except ≈ −0.5 °C for shivering (Kurz 1993)" },
  owner: '7e thermal/heat.ts stepThermal (neuraxial takes depth 1 = the GA thresholds)' });

// ---- ET-05 emergence at ≈ 34.5 °C ----------------------------------------------------------------------------------
// Cooling: GA, ambient 5 °C, exposed, air 1 m/s from T + 60 until TE; then ambient 21, draped; sevoflurane off (FGF 6),
// sugammadex 4 mg/kg, extubated to spontaneous room air. Control: the same emergence in a normothermic patient (forced
// air + 26 °C ambient during the case).
const TE = T + 2500;
const COOL: [number, any, string][] = [[T + 60, A.thermal({ ambientC: 5 }), 'ambient 5 °C'], [T + 60, A.thermal7e({ exposure: 'exposed', airSpeedMs: 1 }), 'exposed, air 1 m/s']];
const WARM: [number, any, string][] = [[T + 60, A.thermal({ ambientC: 26, warming: true }), 'ambient 26 °C, forced air']];
const EMERGE = (extra: [number, any, string][] = []): [number, any, string][] => [[TE, A.thermal({ ambientC: 21, warming: false }), 'ambient 21'], [TE, A.thermal7e({ exposure: 'draped', airSpeedMs: 0.15 }), 'draped'],
  [TE, A.vap('sevoflurane', 0, 6), 'sevoflurane off FGF 6'], [TE, A.drug('sugammadex', 4, 'mg/kg'), 'sugammadex 4 mg/kg'], [TE + 300, A.device('none'), 'extubated'], [TE + 300, A.spont(0.21), 'spontaneous room air'], ...extra];
const emCold = V([...GA(), ...COOL, ...EMERGE()], TE + 2400, XA, { dt: 20 });
const emWarm = V([...GA(), ...WARM, ...EMERGE()], TE + 2400, XA, { dt: 20 });
const EM0 = TE + 600, EM1 = TE + 1500; // 5–20 min after extubation
const emMeasure = (R: Record<string, any>) => { const i = R.i!.rows, c = R.c!.rows; return {
  tcAtEmergence: a2(i, 'tc', TE), tcCtrl: a2(c, 'tc', TE), shivWmean: w(i, 'shivW', EM0, EM1), shivOnsetS: first(i, TE, (r) => (r.shivW as number) > 1) - TE,
  vo2Cold: w(i, 'vo2Dem', EM0, EM1), vo2Warm: w(c, 'vo2Dem', EM0, EM1), vo2Pct: r2(100 * (w(i, 'vo2Dem', EM0, EM1) / w(c, 'vo2Dem', EM0, EM1) - 1)),
  vo2PctOwnBase: r2(100 * (w(i, 'vo2Dem', EM0, EM1) / w(i, 'vo2Dem', TE - 300, TE) - 1)),
  dHr: r2(w(i, 'hr', EM0, EM1) - w(c, 'hr', EM0, EM1)), dMap: r2(w(i, 'map', EM0, EM1) - w(c, 'map', EM0, EM1)), neCold: w(i, 'ne', EM0, EM1), neWarm: w(c, 'ne', EM0, EM1),
  spo2Cold: w(i, 'spo2', EM0, EM1), spo2Warm: w(c, 'spo2', EM0, EM1), svo2Warm: w(c, 'svo2', EM0, EM1), coCold: w(i, 'co', EM0, EM1), coWarm: w(c, 'co', EM0, EM1), pao2Cold: w(i, 'pao2', EM0, EM1), pao2Warm: w(c, 'pao2', EM0, EM1), dSpo2: r2(w(i, 'spo2', EM0, EM1) - w(c, 'spo2', EM0, EM1)), svo2Cold: w(i, 'svo2', EM0, EM1),
  dEtco2: r2(w(i, 'etco2', EM0, EM1) - w(c, 'etco2', EM0, EM1)), dPaco2: r2(w(i, 'paco2', EM0, EM1) - w(c, 'paco2', EM0, EM1)), dVe: r2(w(i, 'veSp', EM0, EM1) - w(c, 'veSp', EM0, EM1)) }; };
add({ id: 'ET-05a', tier: 'P1', ctx: 'X-A, emergence and extubation to room air', state: 'hypothermic (core ≈ 34.5 °C at emergence) vs normothermic', intv: 'emergence: shivering and VO2 at 5–20 min', sys: 'END LUNG',
  arms: { i: emCold, c: emWarm }, measure: (R) => m(emMeasure(R)),
  expect: [{ m: 'vo2Pct', lo: 200, hi: 400, src: 'research/12 ET-05 (Miller 9e, thermoregulation: shivering VO2 +200–400 %); tables §5c ×2–3 typical, ×5 maximum. Measured postoperative shivering is often +40–100 % (Ciofolo MJ, Anesthesiology 1989;70:737; Frank SM 1995) [VERIFY] — Q for Ali' }],
  hand: { verdict: 'TW', why: "shivering starts 12 min after sevoflurane off (7 min after extubation) at 34.5 °C and raises VO2 +59 % over the normothermic emergence (+83 % over the patient's own anaesthetised baseline); research/12's band (+200–400 %, Miller) is the textbook summit, the measured postoperative figures (+40–100 %) contain the model. The summit is capped by SHIVER_MAX_X × m0 and reached only 1.8 °C below the threshold (thresholds.ts:50–56); the residual depth (EMERGE τ 600 s) lowers the threshold during emergence. Q for Ali which band to teach" },
  owner: '7e thermal/thresholds.ts shiverW (SHIVER_MAX_X, SHIVER_SPAN_C)' });
add({ id: 'ET-05b', tier: 'P1', ctx: 'X-A, emergence and extubation to room air', state: 'hypothermic vs normothermic', intv: 'emergence: HR and MAP (the cold pressor/sympathetic response)', sys: 'CIRC END',
  arms: { i: emCold, c: emWarm }, measure: (R) => m(emMeasure(R)),
  expect: [{ m: 'dHr', dir: 1, tol: 5, src: 'Frank SM et al., Anesthesiology 1995;82:83 (core hypothermia 1.3 °C: noradrenaline ×4, vasoconstriction, MAP ↑); research/12 ET-05 (HR/MAP ↑)' },
    { m: 'dMap', dir: 1, tol: 5, src: 'Frank 1995 (MAP ↑ with hypothermia-driven noradrenaline); research/12 ET-05' }],
  dirOnly: true, hand: { verdict: 'WR', why: "no cold → sympathetic drive: at 34.5 °C with shivering, plasma noradrenaline is 275 pg/mL (= normothermic), HR −2, MAP −0.5. 7e's hormone drives (hormones.ts:55–63) are nociception, hypotension, hypoxia, hypercapnia and hypoglycaemia; core temperature is not an input (Frank 1995: core −1.3 °C → noradrenaline ×4, MAP +)" },
  owner: '7e hormones.ts (no cold → sympathetic drive)' });
add({ id: 'ET-05c', tier: 'P1', ctx: 'X-A, emergence and extubation to room air', state: 'hypothermic vs normothermic', intv: 'emergence on room air: SpO2 (the O2 cost of shivering)', sys: 'LUNG BLD',
  arms: { i: emCold, c: emWarm }, measure: (R) => m(emMeasure(R)),
  expect: [{ m: 'dSpo2', dir: -1, tol: 1, src: 'research/12 ET-05 (SpO2 ↓ on air with shivering: VO2 up, SvO2 down, residual anaesthetic depression); Miller 9e thermoregulation' }],
  dirOnly: true, hand: { verdict: 'TW', why: "no desaturation on room air (SpO2 96.3 vs 96.0; PaO2 86.5 vs 92.6; SvO2 76.5 vs 78.8) although VO2 is +59 %: the extra O2 demand is met entirely by extraction because cardiac output does not follow metabolic demand (CO 5.8 L/min in both arms, NE unchanged) and the normal lung's small shunt hides the lower SvO2. Direction right in PaO2, flat in SpO2" },
  owner: '7c oxygen / Stage 3 drive' });
add({ id: 'ET-05d', tier: 'P1', ctx: 'X-A, emergence and extubation to room air', state: 'hypothermic vs normothermic', intv: 'emergence: CO2 production and EtCO2', sys: 'LUNG',
  arms: { i: emCold, c: emWarm }, measure: (R) => m(emMeasure(R)),
  expect: [{ m: 'dEtco2', dir: 1, tol: 1, src: 'research/12 ET-05 (EtCO2 ↑: VCO2 rises with shivering before ventilation catches up)' }],
  dirOnly: true, owner: 'Stage 3 gas / neuro drive' });

// ---- ET-06 cold crystalloid -------------------------------------------------------------------------------------------
add({ id: 'ET-06', tier: 'P1', ctx: 'X-A ventilated, GA flag', state: 'GA, 21 °C', intv: 'Ringer\'s lactate 2 L over 20 min at room temperature vs the same 2 L warmed to 37 °C: core and mean body temperature per litre', sys: 'END',
  arms: { i: V([FLAG(), [T, A.fluid('rl', 2000, 1200), 'RL 2 L / 20 min, 21 °C']], T + 1800, XA, { dt: 30 }),
    c: V([FLAG(), [T - 10, A.thermal7e({ fluidWarmer: true }), 'fluid warmer'], [T, A.fluid('rl', 2000, 1200), 'RL 2 L / 20 min, warmed']], T + 1800, XA, { dt: 30 }) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows; const tt = T + 1200; return m({ dCorePerL: r3(((at(i, 'tc', tt) as number) - (at(c, 'tc', tt) as number)) / 2), dMbtPerL: r3((mbt(i, tt) - mbt(c, tt)) / 2),
    dCorePerL10: r3(((at(i, 'tc', tt + 600) as number) - (at(c, 'tc', tt + 600) as number)) / 2), ivWmean: w(i, 'ivW', T, tt) }); },
  expect: [{ m: 'dMbtPerL', lo: -0.3, hi: -0.2, src: 'Sessler DI, Lancet 2008;371:1791 (1 L of crystalloid at ambient temperature lowers MEAN BODY temperature ≈ 0.25 °C) — research/12 ET-06 words it as core; the source\'s quantity is graded, the core is reported' }],
  owner: '7e thermal/environment.ts infusionW (E-7e-1)' });

// ---- ET-07 cold blood -------------------------------------------------------------------------------------------------
const BL: [number, any, string] = [60, A.bleed(1500, 600), 'bleed 1500 mL / 10 min (class III)'];
const RBC6 = (warm: boolean): [number, any, string][] => [[960, A.transfusion({ product: 'rbc', units: 6, overS: 3600, ...(warm ? { warmed: true } : { warmed: false }) }), `RBC 6 u / 60 min ${warm ? 'warmed' : '4 °C'}`]];
add({ id: 'ET-07', tier: 'P1', ctx: 'X-A ventilated, GA flag', state: 'class III haemorrhage (1.5 L / 10 min)', intv: '6 u RBC over 60 min at 4 °C (unwarmed) vs warmed: core at the end', sys: 'END BLD',
  arms: { i: V([FLAG(), BL, ...RBC6(false)], 960 + 3600 + 600, XA, { dt: 60 }), c: V([FLAG(), BL, ...RBC6(true)], 960 + 3600 + 600, XA, { dt: 60 }) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows; const te = 960 + 3600; return m({ dCore: r2((at(i, 'tc', te) as number) - (at(c, 'tc', te) as number)), dMbtPerUnit: r3((mbt(i, te) - mbt(c, te)) / 6),
    dCore10: r2((at(i, 'tc', te + 600) as number) - (at(c, 'tc', te + 600) as number)), tcEndCold: a2(i, 'tc', te), tcEndWarm: a2(c, 'tc', te) }); },
  expect: [{ m: 'dCore', lo: -1.0, hi: -0.5, src: 'research/12 ET-07 (ATLS 10e: 6 u of refrigerated blood lowers core −0.5 to −1 °C)' },
    { m: 'dMbtPerUnit', lo: -0.3, hi: -0.2, src: 'Sessler 2008 Lancet (one unit of refrigerated blood lowers mean body temperature ≈ 0.25 °C) — the two sources disagree for 6 units; Q for Ali' }],
  hand: { verdict: 'PL', why: "core −0.89 °C at the end of 6 cold units (ATLS −0.5 to −1: PL); the mean-body fall per unit is −0.15 °C against Sessler's rounded 0.25 — which is the physics of the unit, not a model error: 280 mL × 4.18 J/mL/°C × 33 °C = 38.6 kJ over 70 kg × 3.5 kJ/kg/°C = 0.16 °C per unit (environment.ts:108 states 0.24 for a core-only share). The two sources disagree; Q for Ali" },
  owner: '7e thermal/environment.ts ivInflow (E-7e-1)' });

// ---- ET-29 (added) exposure and skin prep ---------------------------------------------------------------------------
add({ id: 'ET-29', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'GA (drug), 21 °C', intv: 'exposed for 30 min (induction, positioning), then wet skin prep 15 min, then draped — vs draped throughout: core at 1 h', sys: 'END',
  arms: { i: V([...GA(), [T, A.thermal7e({ exposure: 'exposed' }), 'exposed'], [T + 1800, A.thermal7e({ exposure: 'prep' }), 'skin prep (wet)'], [T + 2700, A.thermal7e({ exposure: 'draped' }), 'draped']], T + 2 * H, XA, { dt: 60 }),
    c: V(GA(), T + 2 * H, XA, { dt: 60 }), cool: V([...GA(), [T, A.thermal({ ambientC: 18 }), 'ambient 18']], T + 2 * H, XA, { dt: 60 }), warm: V([...GA(), [T, A.thermal({ ambientC: 24 }), 'ambient 24']], T + 2 * H, XA, { dt: 60 }) },
  measure: (R) => m({ dCoreExposure1h: r2((at(R.i!.rows, 'tc', T + H) as number) - (at(R.c!.rows, 'tc', T + H) as number)), dryWexposed: w(R.i!.rows, 'dryW', T, T + 1800), dryWdraped: w(R.c!.rows, 'dryW', T, T + 1800),
    evapWprep: w(R.i!.rows, 'evapW', T + 1800, T + 2700), dCore24vs18at2h: r2((at(R.warm!.rows, 'tc', T + 2 * H) as number) - (at(R.cool!.rows, 'tc', T + 2 * H) as number)) }),
  expect: [{ m: 'dCoreExposure1h', dir: -1, tol: 0.1, src: 'Sessler 2000/2008: radiation and convection from exposed skin are ≈ 90 % of intraoperative loss; evaporation from prep solutions adds; direction only (no sourced magnitude)' },
    { m: 'dCore24vs18at2h', dir: 1, tol: 0.1, src: 'Morris RH, Ann Surg 1971;173:230 (theatre temperature is the main determinant of intraoperative cooling; ≥ 21–24 °C keeps most patients normothermic) [VERIFY]' }],
  dirOnly: true, owner: '7e thermal/environment.ts' });

// ---- ET-35 (added) the GA metabolic switch: drug GA vs the Stage 3 flag ------------------------------------------------
add({ id: 'ET-35', tier: 'P1', ctx: 'X-A ventilated, MODELED', state: 'GA by drugs (propofol + sevoflurane) vs GA by the Stage 3 `thermal` flag', intv: 'VO2 and EtCO2 at +30 min: two expressions of one anaesthetic state (IN check)', sys: 'LUNG END',
  arms: { drug: V(GA(), T + H, XA, { dt: 30 }), flag: V([FLAG(T)], T + H, XA, { dt: 30 }), awake: V([], T + H, XA, { dt: 30 }) },
  measure: (R) => { const tt = T + 1800; return m({ vo2Awake: a2(R.awake!.rows, 'vo2Dem', tt), vo2Drug: a2(R.drug!.rows, 'vo2Dem', tt), vo2Flag: a2(R.flag!.rows, 'vo2Dem', tt),
    drugVsAwakePct: r2(100 * ((at(R.drug!.rows, 'vo2Dem', tt) as number) / (at(R.awake!.rows, 'vo2Dem', tt) as number) - 1)), flagVsAwakePct: r2(100 * ((at(R.flag!.rows, 'vo2Dem', tt) as number) / (at(R.awake!.rows, 'vo2Dem', tt) as number) - 1)),
    etco2Drug: a2(R.drug!.rows, 'etco2', tt), etco2Flag: a2(R.flag!.rows, 'etco2', tt), metW_drug: a2(R.drug!.rows, 'metW', tt), metW_flag: a2(R.flag!.rows, 'metW', tt) }); },
  expect: [{ m: 'drugVsAwakePct', lo: -30, hi: -15, src: 'GA lowers VO2 15–30 % (Miller 9e; tables GA_METABOLIC 0.85) — the drug-anaesthetised patient must match' },
    { m: 'flagVsAwakePct', lo: -30, hi: -15, src: 'as above' }],
  known: 'FU-6 R4', hand: { verdict: 'IN', why: "one anaesthetic state, two metabolisms: drug GA (propofol + sevoflurane, 7f thermoDepth 0.94) lowers VO2 only −6.8 % (the temperature factor) while the hidden Stage 3 flag lowers it −20.8 % — resp/pipeline.ts:295 applies GA_METABOLIC only when `rs.temp.anaesthesia === 'general'`; the heat balance (heat.ts basalW) already reads the drug depth (metabolic heat 64 W in both). EtCO2 25.9 vs 22.2 at the same ventilation. FU-6 R4's gaLevel() (its plan, pipeline.ts metabolic) makes the factor follow the drug level" },
  owner: 'Stage 3 resp/pipeline.ts metabolic() (GA factor on the hidden flag) — FU-6 R4 gaLevel()' });
