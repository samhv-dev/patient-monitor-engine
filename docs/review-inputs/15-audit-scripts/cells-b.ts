// Coverage run NN — depth, consciousness, drive and antagonist cells (research/12 §5.3 NN-15 … NN-24). Readouts: the
// 1 Hz `anaesthesia` truth (DI, SR, brain/end-tidal MAC, opioid-reduced MAC, consciousness, movement, awareness risk,
// drive), 7g's effect-site concentrations, MAP/HR, spontaneous VE and SpO2. Sevoflurane dials are the calibration
// probe's (FGF 6 L/min, brain MAC at 25 min: 0.95 % → 0.44, 1.9 % → 0.88, 2.85 % → 1.32, 3.8 % → 1.76); each cell
// reports the brain MAC actually reached.
import { A, type Row } from './runner.ts';
import {
  add, after, afterMin, AW, avg, d, dAt, dMax, dMin, dWin, G, m, markAfter, marksOf, mn, mx, pctMax, pctMin, r1f, stim, tci, v, vap, XA, XE,
} from './spec.ts';

const T = 300;
const SEVO: Record<string, number> = { '0.3': 0.65, '0.5': 1.08, '1.0': 2.16, '1.5': 3.35, '2.0': 4.3 }; // dial % at FGF 6 → brain MAC at 25 min
const firstRow = (rows: Row[], t0: number, f: (r: Row) => boolean): Row | undefined => rows.find((r) => (r.t as number) >= t0 && f(r));

// ---- NN-15 propofol TCI staircase ---------------------------------------------------------------------------------
// Intubated and ventilated from 1 s (so apnoea does not interrupt the staircase); effect-site targets 2 → 4 → 6 → 8
// µg/mL for 10 min each from 60 s.
const STEP = 600;
const stair = G([tci(60, 'propofol', 2), tci(60 + STEP, 'propofol', 4), tci(60 + 2 * STEP, 'propofol', 6), tci(60 + 3 * STEP, 'propofol', 8)], 60 + 4 * STEP, XA, { dt: 5 });
const stairCtl = G([], 60 + 4 * STEP, XA, { dt: 5 });
const endOf = (k: number) => 60 + (k + 1) * STEP; // end of step k (0: Ce 2 … 3: Ce 8)
add({
  id: 'NN-15a', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'awake', intv: 'propofol effect-site TCI 2 → 4 → 6 → 8 µg/mL (10 min each): Ce at loss of consciousness', sys: 'NEU, PK',
  arms: { i: stair },
  measure: (R) => { const i = R.i!.rows; const t = markAfter(R.i!, 'lossOfConsciousness', 0); const r = Number.isFinite(t) ? firstRow(i, t, () => true) : undefined; return m({ locS: t, ceAtLoc: r ? r2x((r.ce_propofol as number) / 1000) : NaN, consciousEndCe2: String(i.find((q) => q.t === endOf(0) - 5)?.conscious), marks: marksOf(R.i!) }); },
  expect: [{ m: 'ceAtLoc', lo: 2, hi: 3, src: 'research/12 NN-15: loss of consciousness at Ce 2–3 µg/mL (Eleveld; tables §6.1 Schnider LOC C50 2.35/1.8 µg/mL at 25/50 y)' }],
  owner: '7f depth.ts',
});
add({
  id: 'NN-15b', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'awake', intv: 'propofol TCI staircase: DI at Ce 4 (steady) and MAP fall with Ce vs control', sys: 'NEU, CIRC',
  arms: { i: stair, c: stairCtl },
  measure: (R) => { const i = R.i!.rows; const c = R.c!.rows; const w = (k: number) => [endOf(k) - 120, endOf(k)] as const; return m({ diCe2: r1f(avg(i, 'di', ...w(0))), diCe4: r1f(avg(i, 'di', ...w(1))), diCe6: r1f(avg(i, 'di', ...w(2))), diCe8: r1f(avg(i, 'di', ...w(3))), dMapCe2: r1f(dWin(i, c, 'map', ...w(0))), dMapCe4: r1f(dWin(i, c, 'map', ...w(1))), dMapCe6: r1f(dWin(i, c, 'map', ...w(2))), dMapCe8: r1f(dWin(i, c, 'map', ...w(3))), mapFallCe8vsCe2: r1f(dWin(i, c, 'map', ...w(3)) - dWin(i, c, 'map', ...w(0))) }); },
  expect: [
    { m: 'diCe4', lo: 40, hi: 60, invert: true, src: 'research/12 NN-15: depth index 40–60 at Ce 3–5 µg/mL (Eleveld BIS 2024 Ce50 3.08·e^(−0.00635(age−35)); BIS manual general-anaesthesia range 40–60)' },
    { m: 'mapFallCe8vsCe2', dir: -1, tol: 3, src: 'research/12 NN-15: MAP falls with Ce (Eleveld; Miller IV anaesthetics) — direction' },
  ],
  owner: '7f depth.ts / 7g circulation PD',
});
add({
  id: 'NN-15c', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'awake', intv: 'propofol TCI staircase: burst suppression (SR > 0) from Ce ≈ 6–8', sys: 'NEU, BRN',
  arms: { i: stair },
  measure: (R) => { const i = R.i!.rows; const r = firstRow(i, 60, (q) => (q.sr as number) > 0); return m({ ceAtSr: r ? r2x((r.ce_propofol as number) / 1000) : NaN, srCe6: r1f(avg(i, 'sr', endOf(2) - 120, endOf(2))), srCe8: r1f(avg(i, 'sr', endOf(3) - 120, endOf(3))), cmro2Ce8: r1f(100 * avg(i, 'cmro2', endOf(3) - 120, endOf(3))) / 100 }); },
  expect: [{ m: 'ceAtSr', lo: 6, hi: 8, invert: true, src: 'research/12 NN-15: burst suppression from Ce ≈ 6–8 µg/mL (Eleveld; BIS manual; tables §5d "burst suppression DI < 20–30")' }],
  owner: '7f depth.ts',
});

// ---- NN-16 sevoflurane 0.5 / 1.0 / 1.5 MAC + incision -------------------------------------------------------------
const TI = 1500; // incision after 25 min at the dial
const sevoInc = (mac: string) => G([vap(1, SEVO[mac]!, 'sevoflurane', 6), stim(TI, 1)], TI + 300, XA, { dt: 5 });
const pre = (rows: Row[], k: string) => r1f(avg(rows, k, TI - 60, TI) * 100) / 100;
add({
  id: 'NN-16a', tier: 'P1', ctx: 'X-A intubated, ventilated, unparalysed', state: 'sevoflurane 0.5 / 1.0 / 1.5 MAC (brain, 25 min)', intv: 'incision (stimulus 1): movement', sys: 'NEU',
  arms: { a: sevoInc('0.5'), b: sevoInc('1.0'), c: sevoInc('1.5') },
  measure: (R) => m({ mac05: pre(R.a!.rows, 'macBrain'), mac10: pre(R.b!.rows, 'macBrain'), mac15: pre(R.c!.rows, 'macBrain'), move05: Number.isFinite(markAfter(R.a!, 'movement', TI)), move10: Number.isFinite(markAfter(R.b!, 'movement', TI)), move15: Number.isFinite(markAfter(R.c!, 'movement', TI)) }),
  expect: [
    { m: 'move05', event: true, src: 'research/12 NN-16: at 0.5 MAC most patients move to incision (MAC definition: 50 % move at 1.0 MAC; Eger 1965; Miller inhaled agents)' },
    { m: 'move15', event: false, src: 'research/12 NN-16: at 1.5 MAC (≈ MAC95 1.3) no movement to incision (Miller)' },
  ],
  owner: '7f depth.ts (movement)',
});
add({
  id: 'NN-16b', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'sevoflurane 0.5 / 1.0 / 1.5 MAC', intv: 'depth index before incision by MAC', sys: 'NEU',
  arms: { a: sevoInc('0.5'), b: sevoInc('1.0'), c: sevoInc('1.5') },
  measure: (R) => m({ di05: pre(R.a!.rows, 'di'), di10: pre(R.b!.rows, 'di'), di15: pre(R.c!.rows, 'di'), mac10: pre(R.b!.rows, 'macBrain'), diAfterInc10: r1f(avg(R.b!.rows, 'di', TI + 30, TI + 120)), diShownAfterInc10: r1f(avg(R.b!.rows, 'diShown', TI + 30, TI + 120)) }),
  expect: [
    { m: 'di10', lo: 40, hi: 45, invert: true, src: 'tables §5d: DI ≈ 40–45 at 1.0 MAC (range 35–50) [ENG calibration]; research/12 NN-16 "DoA ↓"' },
  ],
  owner: '7f depth.ts',
});
add({
  id: 'NN-16c', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'sevoflurane 1.5 MAC', intv: 'burst suppression at ≥ 1.5 MAC', sys: 'NEU, BRN',
  arms: { c: sevoInc('1.5'), d: G([vap(1, SEVO['2.0']!, 'sevoflurane', 6)], TI, XA, { dt: 5 }) },
  measure: (R) => m({ mac15: pre(R.c!.rows, 'macBrain'), sr15: pre(R.c!.rows, 'sr'), mac20: pre(R.d!.rows, 'macBrain'), sr20: pre(R.d!.rows, 'sr'), sr15pos: pre(R.c!.rows, 'sr') > 0 }),
  expect: [{ m: 'sr15pos', event: true, src: 'research/12 NN-16: suppression ratio > 0 at ≥ 1.5 MAC (Miller, inhaled agents: burst suppression at 1.5–2 MAC)' }],
  owner: '7f depth.ts',
});

// ---- NN-17 remifentanil ------------------------------------------------------------------------------------------
const TS17 = 1200;
const propInc = (remi: number) => G([tci(1, 'propofol', 3), ...(remi ? [[T, A.infusion('remifentanil', remi, 'mcg/kg/min'), `remifentanil ${remi} µg/kg/min`] as any] : []), stim(TS17, 1)], TS17 + 300, XA, { dt: 5 });
add({
  id: 'NN-17a', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'propofol Ce 3; sevoflurane 1 MAC', intv: 'remifentanil 0.2–0.3 µg/kg/min: MAC reduction and movement to incision', sys: 'NEU',
  arms: { p: propInc(0), pr: propInc(0.2), s: G([vap(1, SEVO['1.0']!, 'sevoflurane', 6), [T, A.infusion('remifentanil', 0.3, 'mcg/kg/min'), 'remi 0.3']], TS17, XA, { dt: 5 }) },
  measure: (R) => { const s = R.s!.rows; const mb = avg(s, 'macBrain', TS17 - 60, TS17); const me = avg(s, 'macEff', TS17 - 60, TS17); return m({ macReductionPct: r1f(100 * (1 - mb / me)), ceRemi: r1f(avg(s, 'ce_remifentanil', TS17 - 60, TS17)), moveProp: Number.isFinite(markAfter(R.p!, 'movement', TS17)), movePropRemi: Number.isFinite(markAfter(R.pr!, 'movement', TS17)) }); },
  expect: [
    { m: 'macReductionPct', lo: 60, hi: 70, src: 'research/12 NN-17: remifentanil reduces MAC up to 60–70 % (Lang 1996 Anesthesiology 85:721); tables §5d macOpioid −30 to −70 %' },
    { m: 'moveProp', event: true, src: 'control arm: propofol alone at Ce 3 µg/mL does not prevent movement to incision (Smith 1994 Anesthesiology 81:820: propofol Cp50 for skin incision 15.2 µg/mL without opioid; Miller IV anaesthetics)' },
    { m: 'movePropRemi', event: false, src: 'research/12 NN-17: movement to incision suppressed by remifentanil + propofol (Lang 1996; Miller)' },
  ],
  owner: '7f depth.ts',
});
add({
  id: 'NN-17b', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'propofol Ce 3', intv: 'remifentanil 0.2 µg/kg/min: depth index barely changed (before stimulation)', sys: 'NEU',
  arms: { p: propInc(0), pr: propInc(0.2) },
  measure: (R) => m({ dDi: r1f(dWin(R.pr!.rows, R.p!.rows, 'di', TS17 - 120, TS17)), diProp: r1f(avg(R.p!.rows, 'di', TS17 - 120, TS17)), dDiAfterInc: r1f(dWin(R.pr!.rows, R.p!.rows, 'di', TS17 + 30, TS17 + 150)) }),
  expect: [{ m: 'dDi', quiet: true, tol: 10, src: 'research/12 NN-17: DoA barely changed by the opioid (Lang 1996); tables §5d "opioids alone barely move the index" — quiet ±10 (direction-only tolerance)' }],
  dirOnly: true,
  owner: '7f depth.ts',
});

// ---- NN-18 ketamine 1 mg/kg (awake, spontaneous on air) -----------------------------------------------------------
const ketI = AW([d(T, 'ketamine', 1, 'mg/kg')], T + 1800, XA, { dt: 5 });
const awCtl = AW([], T + 1800, XA, { dt: 5 });
add({
  id: 'NN-18a', tier: 'P1', ctx: 'X-A awake, spontaneous, air', state: 'awake', intv: 'ketamine 1 mg/kg: depth index stays high (dissociation)', sys: 'NEU',
  arms: { i: ketI },
  measure: (R) => { const i = R.i!.rows; return m({ diMin: mn(i, 'di', T, T + 900), loc: Number.isFinite(markAfter(R.i!, 'lossOfConsciousness', T)), marks: marksOf(R.i!, T) }); },
  expect: [{ m: 'diMin', lo: 60, hi: 100, invert: true, src: 'research/12 NN-18: the DoA index stays high under ketamine (paradox) (Miller IV anaesthetics; tables §5d "ketamine ↑ DI")' }],
  owner: '7f depth.ts',
});
add({
  id: 'NN-18b', tier: 'P1', ctx: 'X-A awake, spontaneous, air', state: 'awake', intv: 'ketamine 1 mg/kg: HR and MAP rise vs control', sys: 'CIRC',
  arms: { i: ketI, c: awCtl },
  measure: (R) => m({ dMapPct: pctMax(R.i!.rows, R.c!.rows, 'map', T, T + 900), dHrPct: pctMax(R.i!.rows, R.c!.rows, 'hr', T, T + 900), dMapMinPct: pctMin(R.i!.rows, R.c!.rows, 'map', T, T + 900) }),
  expect: [
    { m: 'dMapPct', dir: 1, tol: 5, src: 'research/12 NN-18: MAP ↑ (sympathomimetic; Miller IV anaesthetics: arterial pressure and HR rise ≈ 20–30 %) — direction, beyond 5 %' },
    { m: 'dHrPct', dir: 1, tol: 5, src: 'research/12 NN-18: HR ↑ (Miller) — direction, beyond 5 %' },
  ],
  dirOnly: true,
  owner: '7g circulation PD (ketamine) / FU-7 T9',
});
add({
  id: 'NN-18c', tier: 'P1', ctx: 'X-A awake, spontaneous, air', state: 'awake', intv: 'ketamine 1 mg/kg: ventilatory drive preserved', sys: 'LUNG, NEU',
  arms: { i: ketI, c: awCtl },
  measure: (R) => m({ apnoea: R.i!.rows.some((r) => (r.t as number) > T && (r.t as number) <= T + 900 && r.apnoea === true), veMinPct: pctMin(R.i!.rows, R.c!.rows, 'veSp', T, T + 900), paco2Max: r1f(dMax(R.i!.rows, R.c!.rows, 'paco2', T, T + 900)) }),
  expect: [
    { m: 'apnoea', event: false, src: 'research/12 NN-18: drive preserved; no apnoea at 1 mg/kg (Miller IV anaesthetics)' },
    { m: 'veMinPct', quiet: true, tol: 25, src: 'research/12 NN-18: minimal respiratory depression (Miller) — quiet ±25 % (direction-only tolerance)' },
  ],
  dirOnly: true,
  owner: '7f drive.ts',
});

// ---- NN-19 dexmedetomidine 1 µg/kg over 10 min (awake, spontaneous) ------------------------------------------------
const dexI = AW([d(T, 'dexmedetomidine', 1, 'mcg/kg', { overS: 600 })], T + 3600, XA, { dt: 5 });
const awCtl2 = AW([], T + 3600, XA, { dt: 5 });
add({
  id: 'NN-19a', tier: 'P2', ctx: 'X-A awake, spontaneous, air', state: 'awake', intv: 'dexmedetomidine 1 µg/kg over 10 min: biphasic MAP (↑ then ↓)', sys: 'CIRC',
  arms: { i: dexI, c: awCtl2 },
  measure: (R) => m({ dMapEarlyPct: pctMax(R.i!.rows, R.c!.rows, 'map', T, T + 600), dMapLatePct: pctMin(R.i!.rows, R.c!.rows, 'map', T + 900, T + 3600) }),
  expect: [
    { m: 'dMapEarlyPct', dir: 1, tol: 3, src: 'research/12 NN-19: early MAP rise (peripheral α2B vasoconstriction) (Miller; Ebert 2000 Anesthesiology 93:382) — direction' },
    { m: 'dMapLatePct', dir: -1, tol: 3, src: 'research/12 NN-19: later MAP fall (central sympatholysis) (Miller; Ebert 2000) — direction' },
  ],
  dirOnly: true,
  owner: '7g circulation PD (α2)',
});
add({
  id: 'NN-19b', tier: 'P2', ctx: 'X-A awake, spontaneous, air', state: 'awake', intv: 'dexmedetomidine: bradycardia', sys: 'CIRC',
  arms: { i: dexI, c: awCtl2 },
  measure: (R) => m({ dHrMinPct: pctMin(R.i!.rows, R.c!.rows, 'hr', T, T + 3600) }),
  expect: [{ m: 'dHrMinPct', dir: -1, tol: 5, src: 'research/12 NN-19: bradycardia (Miller; Ebert 2000: HR −10–20 %) — direction, beyond 5 %' }],
  dirOnly: true,
  owner: '7g circulation PD (α2)',
});
add({
  id: 'NN-19c', tier: 'P2', ctx: 'X-A awake, spontaneous, air', state: 'awake', intv: 'dexmedetomidine: rousable sedation (DI falls, consciousness kept) and drive preserved', sys: 'NEU, LUNG',
  arms: { i: dexI, c: awCtl2 },
  measure: (R) => m({ dexCe: r3c(mx(R.i!.rows, 'dexCe', T, T + 3600)), dDiMin: r1f(dMin(R.i!.rows, R.c!.rows, 'di', T, T + 3600)), consciousAll: R.i!.rows.every((r) => r.conscious === true), apnoea: R.i!.rows.some((r) => r.apnoea === true), veMinPct: pctMin(R.i!.rows, R.c!.rows, 'veSp', T, T + 3600) }),
  expect: [
    { m: 'dDiMin', dir: -1, tol: 10, src: 'research/12 NN-19: sedation — the processed-EEG index falls (Miller; Ebert 2000: BIS ≈ 70 at Cp 0.7–1.2 ng/mL) — direction, beyond 10 points' },
    { m: 'apnoea', event: false, src: 'research/12 NN-19: drive preserved (Miller; Belleville 1992)' },
  ],
  dirOnly: true,
  owner: '7f depth.ts ← 7g bus.cns.dexmedCe',
});
function r2x(x: number): number { return Number.isFinite(x) ? Math.round(x * 100) / 100 : NaN; }
function r3c(x: number): number { return Number.isFinite(x) ? Math.round(x * 1000) / 1000 : NaN; }

// ---- NN-20 elderly: midazolam + fentanyl sedation on air -----------------------------------------------------------
const sed = (mid: boolean, fen: boolean) => AW([...(mid ? [d(T, 'midazolam', 0.05, 'mg/kg')] : []), ...(fen ? [d(T, 'fentanyl', 1, 'mcg/kg')] : [])], T + 1800, XE, { dt: 5 });
add({
  id: 'NN-20a', tier: 'P2', ctx: 'X-E 80 y awake, spontaneous, air', state: 'procedural sedation', intv: 'midazolam 0.05 mg/kg + fentanyl 1 µg/kg: desaturation on air', sys: 'LUNG, NEU',
  arms: { mf: sed(true, true), c: sed(false, false) },
  measure: (R) => m({ spo2Min: mn(R.mf!.rows, 'spo2', T, T + 1800), spo2Ctl: r1f(avg(R.c!.rows, 'spo2', T, T + 1800)), hypox: mn(R.mf!.rows, 'spo2', T, T + 1800) < 90, apnoea: R.mf!.rows.some((r) => (r.t as number) > T && r.apnoea === true) }),
  expect: [{ m: 'hypox', event: true, src: 'research/12 NN-20: the combination causes hypoxaemia (SpO2 < 90 %) on air (Bailey 1990 Anesthesiology 73:826: 92 % hypoxaemic, 50 % apnoeic with midazolam 0.05 + fentanyl 2 µg/kg)' }],
  owner: '7f drive.ts (synergy) / FU-6',
});
add({
  id: 'NN-20b', tier: 'P2', ctx: 'X-E 80 y awake, spontaneous, air', state: 'procedural sedation', intv: 'midazolam + fentanyl: synergistic drive depression and airway obstruction', sys: 'LUNG, NEU, AIR',
  arms: { mf: sed(true, true), mo: sed(true, false), fo: sed(false, true), c: sed(false, false) },
  measure: (R) => { const drop = (k: string) => -pctMin(R[k]!.rows, R.c!.rows, 'veSp', T, T + 900); const dmf = drop('mf'), dmo = drop('mo'), dfo = drop('fo'); return m({ veDropCombo: dmf, veDropMid: dmo, veDropFent: dfo, synergy: r1f(dmf - dmo - dfo), obstrMax: mx(R.mf!.rows, 'obstr', T, T + 1800) }); },
  expect: [
    { m: 'synergy', dir: 1, tol: 0, src: 'research/12 NN-20: synergistic (more than additive) drive depression (Bailey 1990) — direction' },
    { m: 'obstrMax', lo: 0.05, hi: 1, src: 'research/12 NN-20: upper-airway obstruction under sedation (Bailey 1990; tables §4.6 uaCollapse)' },
  ],
  dirOnly: true,
  owner: '7f drive.ts',
});

// ---- NN-21 emergence from sevoflurane 1 MAC -----------------------------------------------------------------------
const TOFF = 3600;
const emerg = G([vap(1, SEVO['1.0']!, 'sevoflurane', 6), [TOFF, A.vap('sevoflurane', 0, 6), 'vaporiser off, FGF 6']], TOFF + 2400, XA, { dt: 5 });
add({
  id: 'NN-21a', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'sevoflurane 1 MAC for 1 h', intv: 'vaporiser off (FGF 6): end-tidal MAC at emergence', sys: 'NEU',
  arms: { i: emerg },
  measure: (R) => { const i = R.i!.rows; const t = markAfter(R.i!, 'emergence', TOFF); const r = Number.isFinite(t) ? firstRow(i, TOFF + t, () => true) : undefined; return m({ macEtAtEmergence: r ? (r.mac as number) : NaN, macBrainAtEmergence: r ? (r.macBrain as number) : NaN, macBrainAtOff: v(i, 'macBrain', TOFF) }); },
  expect: [{ m: 'macEtAtEmergence', lo: 0.3, hi: 0.4, src: 'research/12 NN-21: eyes open at end-tidal 0.3–0.4 MAC (MAC-awake; Katoh 1993; tables §5d macAwake 0.33, 0.22–0.34)' }],
  owner: '7f depth.ts / 7g volatile.ts',
});
add({
  id: 'NN-21b', tier: 'P1', ctx: 'X-A intubated, ventilated', state: 'sevoflurane 1 MAC for 1 h', intv: 'vaporiser off: time to emergence (washout)', sys: 'NEU, PK',
  arms: { i: emerg },
  measure: (R) => { const t = markAfter(R.i!, 'emergence', TOFF); return m({ emergenceMin: r1f(t / 60), emerged: Number.isFinite(t), diAtEmergence: Number.isFinite(t) ? v(R.i!.rows, 'di', TOFF + t) : NaN }); },
  expect: [{ m: 'emerged', event: true, src: 'research/12 NN-21: emergence follows washout (Miller inhaled agents: sevoflurane eye opening ≈ 5–15 min after 1 MAC at high FGF) — direction/event; time reported for Ali' }],
  dirOnly: true,
  owner: '7g volatile.ts',
});

// ---- NN-22 awareness under NMB --------------------------------------------------------------------------------------
const TA = 1500;
const aware = (s: boolean) => G([vap(1, SEVO['0.3']!, 'sevoflurane', 6), d(600, 'rocuronium', 0.6, 'mg/kg'), ...(s ? [stim(TA, 1)] : [])], TA + 600, XA, { dt: 5 });
add({
  id: 'NN-22a', tier: 'P2', ctx: 'X-A intubated, ventilated, paralysed (roc 0.6)', state: 'sevoflurane 0.3 MAC (light)', intv: 'incision (stimulus 1): awareness flags, DI, no movement', sys: 'NEU',
  arms: { i: aware(true) },
  measure: (R) => { const i = R.i!.rows; return m({ mac: r1f(100 * avg(i, 'macBrain', TA - 60, TA)) / 100, diMax: mx(i, 'di', TA, TA + 600), awareRisk: i.some((r) => (r.t as number) > TA && r.aware === true), conscious: i.some((r) => (r.t as number) > TA && r.conscious === true), moved: Number.isFinite(markAfter(R.i!, 'movement', TA)), awarenessMark: marksOf(R.i!, 600) }); },
  expect: [
    { m: 'awareRisk', event: true, src: 'research/12 NN-22: paralysed + light anaesthesia + stimulus = awareness risk (NAP5 2014)' },
    { m: 'diMax', lo: 60, hi: 100, invert: true, src: 'research/12 NN-22: DoA > 60 (NAP5)' },
    { m: 'moved', event: false, src: 'research/12 NN-22: no movement — paralysed (NAP5)' },
  ],
  owner: '7f depth.ts',
});
add({
  id: 'NN-22b', tier: 'P2', ctx: 'X-A intubated, ventilated, paralysed', state: 'sevoflurane 0.3 MAC', intv: 'incision: HR and MAP rise vs no stimulus', sys: 'CIRC, END',
  arms: { i: aware(true), c: aware(false) },
  measure: (R) => m({ dMap: dMax(R.i!.rows, R.c!.rows, 'map', TA, TA + 600), dHr: dMax(R.i!.rows, R.c!.rows, 'hr', TA, TA + 600) }),
  expect: [
    { m: 'dMap', dir: 1, tol: 5, src: 'research/12 NN-22: MAP ↑ with the stimulus under light anaesthesia (NAP5: tachycardia/hypertension are the signs of awareness) — direction, beyond 5 mmHg' },
    { m: 'dHr', dir: 1, tol: 5, src: 'research/12 NN-22: HR ↑ (NAP5) — direction, beyond 5 /min' },
  ],
  dirOnly: true,
  owner: '7e stress / 7a',
});

// ---- NN-23 fentanyl apnoea → naloxone ------------------------------------------------------------------------------
const TN = 420; // first naloxone (2 min after fentanyl), second at +2 min
const fenI = (nal: boolean) => AW([[1, A.spont(0.5), 'spontaneous FiO2 0.5 (face mask)'], d(T, 'fentanyl', 5, 'mcg/kg'), ...(nal ? [d(TN, 'naloxone', 0.1, 'mg'), d(TN + 120, 'naloxone', 0.1, 'mg')] : [])], T + 6000, XA, { dt: 10 });
add({
  id: 'NN-23a', tier: 'P1', ctx: 'X-A awake, spontaneous, FiO2 0.5', state: 'fentanyl 5 µg/kg: apnoea', intv: 'naloxone 0.1 mg × 2 (2 min apart): time to breathing', sys: 'LUNG, NEU',
  arms: { i: fenI(true), c: fenI(false) },
  measure: (R) => { const i = R.i!.rows; const ve0 = avg(i, 'veSp', T - 120, T); return m({ ve0: r1f(ve0), apnoeicBeforeNal: i.some((r) => (r.t as number) > T && (r.t as number) <= TN && r.apnoea === true), veMinBeforeNal: r1f(mn(i, 'veSp', T, TN)), veAtNal: r1f(v(i, 'veSp', TN)), breathMin: afterMin(i, TN, (r) => (r.veSp as number) >= 0.5 * ve0), breathMark: markAfter(R.i!, 'breathing', TN), ctlBreathMin: afterMin(R.c!.rows, TN, (r) => (r.veSp as number) >= 0.5 * ve0) }); },
  expect: [
    { m: 'apnoeicBeforeNal', event: true, src: 'research/12 NN-23 premise: fentanyl 5 µg/kg makes an awake adult apnoeic (Miller, opioids)' },
    { m: 'breathMin', lo: 1, hi: 2, invert: true, src: 'research/12 NN-23: naloxone reverses opioid apnoea in 1–2 min (Miller, opioids)' },
  ],
  owner: '7g naloxone row / 7f drive.ts',
});
add({
  id: 'NN-23b', tier: 'P1', ctx: 'X-A awake, spontaneous, FiO2 0.5', state: 'fentanyl 5 µg/kg reversed by naloxone', intv: 'renarcotisation after naloxone wears off', sys: 'LUNG, NEU',
  arms: { i: fenI(true) },
  measure: (R) => { const i = R.i!.rows; const ve0 = avg(i, 'veSp', T - 120, T); const tb = after(i, TN, (r) => (r.veSp as number) >= 0.5 * ve0); const tr = Number.isFinite(tb) ? after(i, TN + tb + 60, (r) => (r.veSp as number) < 0.5 * ve0) : NaN; return m({ renarcMin: Number.isFinite(tr) ? r1f((tr + tb + 60) / 60) : NaN, renarc: Number.isFinite(tr), veMinAfter: r1f(mn(i, 'veSp', TN + 600, T + 6000)), ve0: r1f(ve0), antOpAt30: r1f(10 * v(i, 'antOp', TN + 1800)) / 10 }); },
  expect: [
    { m: 'renarc', event: true, src: 'research/12 NN-23: renarcotisation — fentanyl 5 µg/kg outlasts naloxone (Miller, opioids)' },
    { m: 'renarcMin', lo: 30, hi: 60, src: 'research/12 NN-23: renarcotisation at 30–60 min (naloxone duration 30–45 min; Miller)' },
  ],
  owner: '7g naloxone row',
});

// ---- NN-24 midazolam → flumazenil ---------------------------------------------------------------------------------
const TF = 600;
const midI = (flu: boolean) => AW([[1, A.spont(0.5), 'spontaneous FiO2 0.5'], d(T, 'midazolam', 0.1, 'mg/kg'), ...(flu ? [d(TF, 'flumazenil', 0.5, 'mg')] : [])], T + 5400, XA, { dt: 5 });
add({
  id: 'NN-24', tier: 'P2', ctx: 'X-A awake, spontaneous, FiO2 0.5', state: 'midazolam 0.1 mg/kg (unconscious)', intv: 'flumazenil 0.5 mg: time to consciousness; resedation', sys: 'NEU',
  arms: { i: midI(true), c: midI(false) },
  measure: (R) => { const i = R.i!.rows; const tw = after(i, TF, (r) => r.conscious === true); const tr = Number.isFinite(tw) ? after(i, TF + tw + 30, (r) => r.conscious === false) : NaN; return m({ unconsciousAtFlu: v(i, 'conscious', TF - 5) === 0 || (i.find((r) => r.t === TF - 5)?.conscious === false), wakeMin: r1f(tw / 60), ctlWakeMin: afterMin(R.c!.rows, TF, (r) => r.conscious === true), resedationMin: Number.isFinite(tr) ? r1f((tw + 30 + tr) / 60) : NaN, dDi: r1f(dAt(i, R.c!.rows, 'di', TF + 180)) }); },
  expect: [{ m: 'wakeMin', lo: 1, hi: 2, invert: true, src: 'research/12 NN-24: flumazenil reverses benzodiazepine sedation in 1–2 min (Miller)' }],
  owner: '7g flumazenil row / 7f depth.ts',
});
