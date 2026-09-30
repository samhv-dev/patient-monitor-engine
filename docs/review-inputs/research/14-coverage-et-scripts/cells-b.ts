// ET group B — P1 endocrine/metabolic: malignant hyperthermia and its treatment (ET-10, ET-11), the surgical stress
// response and its opioid blunting (ET-16, ET-17), type 1 diabetes and insulin (ET-18), dexamethasone in type 2
// (ET-19), an insulin overdose (ET-20), anaphylaxis and adrenaline (ET-27), insulin–dextrose (ET-31, added).
import { A, GA, H, MHS, T, T1DM, T2DM, FLAG, V, SP, XA, MG, a2, add, anyR, at, first, m, mn, mx, rh, tMax, tMin, w, r2, r3, d, inf } from './spec.ts';
import type { ArmResult, Row } from './runner.ts';

// ---- ET-10 / ET-11 malignant hyperthermia ---------------------------------------------------------------------------
const MHT = T + 60; // the instructor's MH onset (1 min after sevoflurane + succinylcholine)
const MHRIG = (extra: [number, any, string][], patient: Record<string, unknown> = XA, tEnd = MHT + 90 * 60) => V([...GA(T, { nmb: 'sux' }), ...extra], tEnd, patient, { dt: 20 });
const mhSus = MHRIG([], MHS);
const mhInst = MHRIG([[MHT, A.cond('mh', 1), 'condition mh 1 (instructor)']]);
const mhCtrl = MHRIG([]);
const MHAUS = 'MHAUS / EMHG guidance; Larach MG et al., Anesthesiology 1994;80:771 (clinical grading scale); Miller 9e, malignant hyperthermia';
const e0 = (r: Row[]) => w(r, 'etco2', MHT - 50, MHT);
const tDouble = (r: Row[]) => { const b = e0(r); const t = first(r, MHT, (x) => (x.etco2 as number) >= 2 * b); return Number.isFinite(t) ? t - MHT : NaN; };
/** Fastest core rise over any 10-min window between t0 and t1, °C per min. */
const maxRate10 = (r: Row[], t0: number, t1: number) => { let best = -Infinity; for (let t = t0; t + 600 <= t1; t += 60) best = Math.max(best, ((at(r, 'tc', t + 600) as number) - (at(r, 'tc', t) as number)) / 10); return r3(best); };
const firstArrest = (r: Row[], t0: number) => { const t = first(r, t0, (x) => x.arrest !== ''); return Number.isFinite(t) ? t - t0 : NaN; };
const mhMeasure = (R: Record<string, ArmResult>) => { const i = R.i!.rows, c = R.c!.rows; return {
  etco2Base: e0(i), tDoubleS: tDouble(i), etco2At15: a2(i, 'etco2', MHT + 900), paco2At15: a2(i, 'paco2', MHT + 900), dHr15: r2((at(i, 'hr', MHT + 900) as number) - (at(c, 'hr', MHT + 900) as number)),
  hr15: a2(i, 'hr', MHT + 900), map15: a2(i, 'map', MHT + 900), tcRiseMaxPerMin: maxRate10(i, MHT, MHT + 3600), tc30: a2(i, 'tc', MHT + 1800), tc60: a2(i, 'tc', MHT + 3600), tcMax: mx(i, 'tc', MHT, MHT + 5400),
  k20: a2(i, 'k', MHT + 1200), k0: a2(i, 'k', MHT - 10), ph30: a2(i, 'ph', MHT + 1800), lact30: a2(i, 'lact', MHT + 1800), vo2x15: r2((at(i, 'vo2Dem', MHT + 900) as number) / (at(c, 'vo2Dem', MHT + 900) as number)),
  arrestAfterS: firstArrest(i, MHT), arrested: anyR(i, MHT, MHT + 5400, (x) => x.arrest !== ''), rhythms: rh(R.i!) }; };
add({ id: 'ET-10a', tier: 'P1', ctx: 'MH-susceptible (profile `neuro.mhSusceptible`), ventilated VCV 12 × 600', state: 'GA: sevoflurane 2 % + succinylcholine 1.5 mg/kg at T', intv: 'the triggering agents themselves, no instructor action, 90 min', sys: 'END LUNG BLD',
  arms: { i: mhSus, c: mhCtrl },
  measure: (R) => { const i = R.i!.rows; return m({ mhActMax: mx(i, 'mhAct', T, MHT + 5400), etco2Max: mx(i, 'etco2', MHT, MHT + 5400), etco2Base: e0(i), mhDevelops: mx(i, 'mhAct', T, MHT + 5400) > 0.1 || mx(i, 'etco2', MHT, MHT + 5400) >= 2 * e0(i), marks: R.i!.marks.map(([t, k]) => `${t}s ${k}`).join(', ') }); },
  expect: [{ m: 'mhDevelops', event: true, src: `${MHAUS}: a susceptible patient exposed to a volatile and succinylcholine develops MH (fulminant within minutes to an hour); research/12 ET-10` }],
  hand: { verdict: 'WR', why: "MH never starts from its triggers: 7f marks `mhTrigger` at the succinylcholine dose (neuro/pipeline.ts:170–180) and at MAC > 0.1 (:206–210), and nothing reads the mark — Stage 3's MH state `rs.temp.mh` is created only by the instructor's `condition mh` (resp/pipeline.ts:691–695). EtCO2 stays 29–30 for 90 min, MH activity 0" },
  owner: '7f neuro/pipeline.ts (mhTrigger mark only) → Stage 3/7e MH state' });
const MH_ARMS = { i: mhInst, c: mhCtrl };
add({ id: 'ET-10b', tier: 'P1', ctx: 'X-A ventilated VCV 12 × 600 (fixed minute ventilation)', state: 'MH (instructor `condition mh 1`) under sevoflurane + succinylcholine', intv: 'untreated: EtCO2 doubling time', sys: 'LUNG',
  arms: MH_ARMS, measure: (R) => m(mhMeasure(R)),
  expect: [{ m: 'tDoubleS', lo: 600, hi: 900, invert: true, src: `${MHAUS}; research/12 ET-10 (EtCO2 doubles in 10–15 min at a fixed minute ventilation); tables §7 check 21` }],
  owner: 'Stage 3 thermal/params.ts MH_ONSET_S, MH_VCO2_FACTOR' });
add({ id: 'ET-10c', tier: 'P1', ctx: 'X-A ventilated', state: 'MH (instructor), untreated', intv: 'HR at +15 min vs the same rig without MH', sys: 'CIRC',
  arms: MH_ARMS, measure: (R) => m(mhMeasure(R)),
  expect: [{ m: 'dHr15', dir: 1, tol: 10, src: `${MHAUS}: unexplained tachycardia is an early sign (Larach 1994 scale); research/12 ET-10` }],
  dirOnly: true, owner: '7e hormones.ts (MH → extraSymp 2·activity)' });
add({ id: 'ET-10d', tier: 'P1', ctx: 'X-A ventilated', state: 'MH (instructor), untreated', intv: 'core temperature: the fastest rise over 10 min', sys: 'END',
  arms: MH_ARMS, measure: (R) => m(mhMeasure(R)),
  expect: [{ m: 'tcRiseMaxPerMin', lo: 0.067, hi: 0.2, src: `research/12 ET-10 (+1 °C every 5–15 min); ${MHAUS}; tables §7 check 21` }],
  owner: 'Stage 3/7e thermal/params.ts MH_HEAT_X' });
add({ id: 'ET-10e', tier: 'P1', ctx: 'X-A ventilated', state: 'MH (instructor), untreated', intv: 'K⁺ at +20 min; pH at +30 min', sys: 'BLD',
  arms: MH_ARMS, measure: (R) => m(mhMeasure(R)),
  expect: [{ m: 'k20', lo: 5.5, hi: 6.5, src: 'tables §7 check 21 (K 5.5–6.5 by 20 min); MHAUS (hyperkalaemia from rhabdomyolysis)' }, { m: 'ph30', lo: 6.9, hi: 7.25, src: 'Larach 1994 scale (arterial pH < 7.25 scores as MH acidosis); MHAUS (mixed respiratory and metabolic acidosis)' }],
  owner: '7e core.ts MH_K_EFFLUX / 7c acid–base' });
add({ id: 'ET-10f', tier: 'P1', ctx: 'X-A ventilated', state: 'MH', intv: 'masseter spasm after succinylcholine; generalised rigidity', sys: 'NEU',
  arms: {}, expect: [], owner: 'FU-7 (rigidity: research/12 §5.11 NE list)', ne: 'no muscle-rigidity state: masseter spasm / generalised rigidity is on research/12\'s FU-7 missing-mechanism list (§5.11); the TOF and chest-wall compliance do not change in MH' });
add({ id: 'ET-10g', tier: 'P1', ctx: 'X-A ventilated', state: 'MH (instructor), untreated 90 min', intv: 'arrest (VF from hyperkalaemia/hyperthermia) if untreated', sys: 'RHY CIRC',
  arms: MH_ARMS, measure: (R) => m(mhMeasure(R)),
  expect: [{ m: 'arrested', event: true, src: `${MHAUS}: untreated fulminant MH ends in VF/cardiac arrest (hyperkalaemia, hyperthermia, acidosis); A08-F4 (WR before FU-4 G8)` }],
  owner: 'FU-4 G8 (arrest.ts T_HOT hazard)' });

// ET-11: treatment at +15 min: volatile off (FGF 10), FiO2 1, RR 24 (MV × 2), dantrolene 2.5 mg/kg at +16 min, surface
// cooling proxy (ambient 10 °C, exposed; no active-cooling device exists).
const TT = MHT + 900, TD = TT + 60;
const TREAT = (dant: number | null): [number, any, string][] => [[TT, A.vap('sevoflurane', 0, 10), 'sevoflurane off, FGF 10'], [TT, A.vent({ rr: 24, fio2: 1 }), 'RR 24, FiO2 1'],
  ...(dant ? [[TD, A.drug('dantrolene', dant, 'mg/kg'), `dantrolene ${dant} mg/kg`] as [number, any, string]] : []), [TD, A.thermal({ ambientC: 10 }), 'ambient 10 °C'], [TD, A.thermal7e({ exposure: 'exposed' }), 'exposed (surface cooling)']];
const txArms = { t: MHRIG([[MHT, A.cond('mh', 1), 'mh'], ...TREAT(2.5)]), hv: MHRIG([[MHT, A.cond('mh', 1), 'mh'], ...TREAT(null)]), t5: MHRIG([[MHT, A.cond('mh', 1), 'mh'], ...TREAT(2.5), [TD + 600, A.drug('dantrolene', 2.5, 'mg/kg'), 'dantrolene 2nd 2.5 mg/kg']]), u: mhInst };
const txMeasure = (R: Record<string, ArmResult>) => { const t = R.t!.rows, hv = R.hv!.rows, u = R.u!.rows, t5 = R.t5!.rows; const b = e0(t);
  const half = (r: Row[]) => { const e1 = at(r, 'etco2', TD) as number; const tt = first(r, TD, (x) => (x.etco2 as number) <= b + 0.5 * (e1 - b)); return Number.isFinite(tt) ? tt - TD : NaN; };
  return { etco2AtTD: a2(t, 'etco2', TD), etco2Base: b, tHalfS: half(t), tHalfNoDantS: half(hv), etco2At30: a2(t, 'etco2', TD + 1800), etco2At30NoDant: a2(hv, 'etco2', TD + 1800), etco2At30Untreated: a2(u, 'etco2', TD + 1800),
    mhAct30: a2(t, 'mhAct', TD + 1800), mhAct60: a2(t, 'mhAct', TD + 3600), mhAct60two: a2(t5, 'mhAct', TD + 3600), tcAtTD: a2(t, 'tc', TD), tcPeakAfterS: tMax(t, 'tc', TD - 60, TD + 4200) - TD, tcPeak: mx(t, 'tc', TD - 60, TD + 4200),
    tc60: a2(t, 'tc', TD + 3600), tc60NoDant: a2(hv, 'tc', TD + 3600), tc60Untreated: a2(u, 'tc', TD + 3600), tempFalls: (at(t, 'tc', TD + 3600) as number) < mx(t, 'tc', TD - 60, TD + 4200) - 0.5,
    dK30: r2((at(t, 'k', TD + 1800) as number) - (at(t, 'k', TD) as number)), dK30NoDant: r2((at(hv, 'k', TD + 1800) as number) - (at(hv, 'k', TD) as number)), k30Untreated: a2(u, 'k', TD + 1800),
    arrestTreated: anyR(t, TD, TD + 4200, (x) => x.arrest !== ''), arrestNoDant: anyR(hv, TD, TD + 4200, (x) => x.arrest !== '') }; };
add({ id: 'ET-11a', tier: 'P1', ctx: 'X-A ventilated', state: 'MH (instructor) at +15 min', intv: 'volatile off, FiO2 1, MV × 2, dantrolene 2.5 mg/kg, surface cooling: EtCO2 course', sys: 'LUNG',
  arms: txArms, measure: (R) => m(txMeasure(R)),
  expect: [{ m: 'tHalfS', lo: 300, hi: 1200, invert: true, src: 'research/12 ET-11 (EtCO2 falls within 10–20 min of dantrolene; R48 prototype 12 min); MHAUS (hyperventilate, dantrolene 2.5 mg/kg, repeat to effect)' }],
  owner: 'Stage 3/7e thermal/mh.ts + 7g dantrolene' });
add({ id: 'ET-11b', tier: 'P1', ctx: 'X-A ventilated', state: 'MH (instructor), treated at +15 min', intv: 'core temperature peaks and falls', sys: 'END',
  arms: txArms, measure: (R) => m(txMeasure(R)),
  expect: [{ m: 'tempFalls', event: true, src: 'research/12 ET-11 (temperature peaks and falls after dantrolene and cooling); MHAUS (cool until < 38 °C)' }],
  owner: 'Stage 3/7e thermal (cooling is a proxy: no active-cooling device, research/12 §1.3 I18)' });
add({ id: 'ET-11c', tier: 'P1', ctx: 'X-A ventilated', state: 'MH (instructor), treated at +15 min', intv: 'K⁺ over 30 min after dantrolene', sys: 'BLD',
  arms: txArms, measure: (R) => m(txMeasure(R)),
  expect: [{ m: 'dK30', dir: -1, tol: 0.3, src: 'research/12 ET-11 (K falls once the hypermetabolism is controlled); MHAUS' }],
  dirOnly: true, owner: '7e core.ts MH_K_EFFLUX / 7c' });

// ---- ET-16 / ET-17 surgical stress response -------------------------------------------------------------------------
const TI = T + 600; // incision (stimulus 1.0, held)
const STRESS = (fentMcgKg: number, stim: boolean, patient: Record<string, unknown> = XA, extra: [number, any, string][] = [], tEnd = TI + 5 * H) =>
  V([...GA(), ...(fentMcgKg ? [d(TI - 60, 'fentanyl', fentMcgKg, 'mcg/kg')] : []), ...(stim ? [[TI, A.stim(1.0), 'incision (stimulus 1.0, held)'] as [number, any, string]] : []), ...extra], tEnd, patient, { dt: 30 });
const stressArms = { f0: STRESS(0, true), f2: STRESS(2, true), f5: STRESS(5, true), c: STRESS(0, false), c2: STRESS(2, false) };
const stressMeasure = (R: Record<string, ArmResult>) => { const f0 = R.f0!.rows, f2 = R.f2!.rows, f5 = R.f5!.rows, c = R.c!.rows, c2 = R.c2!.rows;
  const dEpi = (r: Row[], cc: Row[]) => r2(w(r, 'epi', TI + 300, TI + 1800) - w(cc, 'epi', TI + 300, TI + 1800));
  const dNe = (r: Row[], cc: Row[]) => r2(w(r, 'ne', TI + 300, TI + 1800) - w(cc, 'ne', TI + 300, TI + 1800));
  const dMap = (r: Row[], cc: Row[]) => r2(mx(r, 'map', TI, TI + 300) - (at(cc, 'map', TI) as number));
  const e0v = dEpi(f0, c), e5 = dEpi(f5, c);
  return { epiCtrl: w(c, 'epi', TI + 300, TI + 1800), epiRatioF0: r2(w(f0, 'epi', TI + 300, TI + 1800) / w(c, 'epi', TI + 300, TI + 1800)), neRatioF0: r2(w(f0, 'ne', TI + 300, TI + 1800) / w(c, 'ne', TI + 300, TI + 1800)),
    dEpiF0: e0v, dEpiF2: dEpi(f2, c2), dEpiF5: e5, epiBluntF5: r2(1 - e5 / e0v), dNeF0: dNe(f0, c), dNeF5: dNe(f5, c),
    dMapF0: dMap(f0, c), dMapF2: dMap(f2, c2), dMapF5: dMap(f5, c), dHrF0: r2(mx(f0, 'hr', TI, TI + 300) - (at(c, 'hr', TI) as number)), dHrF5: r2(mx(f5, 'hr', TI, TI + 300) - (at(c, 'hr', TI) as number)),
    antinocF0: a2(f0, 'antinoc', TI + 60), antinocF5: a2(f5, 'antinoc', TI + 60), symp0: a2(f0, 'symp', TI + 300), symp5: a2(f5, 'symp', TI + 300),
    cort2hF2: a2(f2, 'cort', TI + 2 * H), cort4hF2: a2(f2, 'cort', TI + 4 * H), cortPeakF2: mx(f2, 'cort', TI, TI + 5 * H), cortPeakH: r2((tMax(f2, 'cort', TI, TI + 5 * H) - TI) / H), cortCtrl4h: a2(c, 'cort', TI + 4 * H),
    cortF5vsF0: r3((at(f5, 'cort', TI + 4 * H) as number) / (at(f0, 'cort', TI + 4 * H) as number) - 1),
    glu0: r2((at(c, 'glu', TI) as number) / MG), glu2hF2: r2((at(f2, 'glu', TI + 2 * H) as number) / MG), dGlu2hF2: r2(((at(f2, 'glu', TI + 2 * H) as number) - (at(c2, 'glu', TI + 2 * H) as number)) / MG),
    dGlu2hF0: r2(((at(f0, 'glu', TI + 2 * H) as number) - (at(c, 'glu', TI + 2 * H) as number)) / MG), dGlu2hF5: r2(((at(f5, 'glu', TI + 2 * H) as number) - (at(c, 'glu', TI + 2 * H) as number)) / MG),
    gluMaxF2: r2(mx(f2, 'glu', TI, TI + 5 * H) / MG), ins2hF2: a2(f2, 'ins', TI + 2 * H) }; };
const DESB = 'Desborough JP, Br J Anaesth 2000;85:109–117 (the stress response to surgery: catecholamines, cortisol 400 → > 1500 nmol/L peaking 4–6 h, hyperglycaemia; opioids in ordinary doses blunt the haemodynamic/sympathetic arm, only very high doses (fentanyl 50–100 µg/kg) suppress the pituitary–adrenal arm)';
add({ id: 'ET-16a', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA', state: 'incision (stimulus 1.0, held) at +10 min', intv: 'fentanyl 0 / 2 / 5 µg/kg 1 min before: plasma adrenaline/noradrenaline and the pressor response', sys: 'END CIRC',
  arms: stressArms, measure: (R) => m(stressMeasure(R)),
  expect: [{ m: 'epiRatioF0', lo: 2, hi: 5, src: `${DESB}; tables §5c (surgical stress: adrenaline 2–5× basal)` },
    { m: 'epiBluntF5', dir: 1, tol: 0.2, src: `${DESB} (opioid dose blunts the sympathoadrenal arm); research/12 ET-16` }, { m: 'dMapF0', lo: 20, hi: 30, src: 'Shribman AJ et al., Br J Anaesth 1987;59:295 / R51 addendum 25: the surgical surge raises MAP +20–30 mmHg without opioid' }],
  known: 'FU-7 Task 10', hand: { verdict: 'TW', why: "the sympathoadrenal arm is right in size and blunting (adrenaline ×2.6, noradrenaline ×1.8; fentanyl 5 µg/kg removes 96 % of it and gives HR −22), but the pressor response to incision without opioid is +7.7 mmHg (Shribman +20–30): the surge acts only through 7e's set-point/`symp` multipliers, which FU-4's output cap limits — FU-7 Task 10 (R51 addendum 25) routes the circulating catecholamine through 7g's rows" },
  owner: '7e hormones.ts / effects.ts (surge: FU-7 Task 10)' });
add({ id: 'ET-16b', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA', state: 'incision held 5 h', intv: 'fentanyl 2 µg/kg: cortisol course; fentanyl 5 vs 0 (quiet: ordinary doses do not suppress it)', sys: 'END',
  arms: stressArms, measure: (R) => m(stressMeasure(R)),
  expect: [{ m: 'cortPeakF2', lo: 1500, hi: 2500, src: DESB }, { m: 'cortPeakH', lo: 4, hi: 6, invert: true, src: DESB + ' (peak 4–6 h)' }, { m: 'cortF5vsF0', quiet: true, tol: 0.1, src: DESB }],
  owner: '7e hormones.ts CORT_*' });
add({ id: 'ET-16c', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA', state: 'incision held', intv: 'fentanyl 2 µg/kg: glucose rise at 2 h vs no incision', sys: 'END',
  arms: stressArms, measure: (R) => m(stressMeasure(R)),
  expect: [{ m: 'dGlu2hF2', lo: 1, hi: 3, src: `research/12 ET-16 (glucose +1–3 mmol/L); ${DESB}` }],
  owner: '7e glucose.ts / effects.ts' });
add({ id: 'ET-17', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA, non-diabetic', state: '2 h of surgery (stimulus 1.0) with fentanyl 2 µg/kg', intv: 'glucose at 2 h', sys: 'END',
  arms: stressArms, measure: (R) => m(stressMeasure(R)),
  expect: [{ m: 'glu2hF2', lo: 7, hi: 8, src: 'research/12 ET-17 (5.5 → 7–8 mmol/L); Desborough 2000' }],
  owner: '7e glucose.ts' });

// ---- ET-18 type 1 diabetes -----------------------------------------------------------------------------------------
const T1ARMS = { s: STRESS(2, true, T1DM, [inf(TI + 4 * H, 'insulin', 0.1, 'units/kg/h')], TI + 6 * H), n: STRESS(2, true, T1DM, [], TI + 6 * H), a: STRESS(2, true, XA, [], TI + 6 * H) };
const t1Measure = (R: Record<string, ArmResult>) => { const s = R.s!.rows, n = R.n!.rows, a = R.a!.rows;
  return { gluT1base: r2((at(n, 'glu', TI) as number) / MG), gluT1at4h: r2((at(n, 'glu', TI + 4 * H) as number) / MG), gluAdultAt4h: r2((at(a, 'glu', TI + 4 * H) as number) / MG), insT1: a2(n, 'ins', TI + 2 * H), insExoT1: a2(n, 'insExo', TI + 2 * H),
    keto4h: a2(n, 'keto', TI + 4 * H), dka4h: a2(n, 'dka', TI + 4 * H), ph4h: a2(n, 'ph', TI + 4 * H),
    fallPerH: r2((((at(s, 'glu', TI + 6 * H) as number) - (at(s, 'glu', TI + 4 * H) as number)) - ((at(n, 'glu', TI + 6 * H) as number) - (at(n, 'glu', TI + 4 * H) as number))) / MG / 2),
    glu6hInfused: r2((at(s, 'glu', TI + 6 * H) as number) / MG), dK2hInfusion: r2((at(s, 'k', TI + 6 * H) as number) - (at(n, 'k', TI + 6 * H) as number)) }; };
add({ id: 'ET-18a', tier: 'P1', ctx: 'type 1 diabetes (engine API `endo.diabetes type1`; not in pme-scenario/1)', state: 'GA + surgery, insulin OMITTED for 4 h', intv: 'glucose over 4 h without insulin', sys: 'END',
  arms: T1ARMS, measure: (R) => m(t1Measure(R)), expect: [], owner: '7e core.ts glucoseProfile (type 1 always carries basal insulin) / FU-8 A16 (schema)',
  ne: 'the omission is not expressible: the type 1 profile always carries its long-acting basal insulin (core.ts:101–104 basalExo), and no command stops it; the `endo` profile is engine-API only until FU-8 A16. PROBE (basal on): glucose rises only with the stress response' });
add({ id: 'ET-18b', tier: 'P1', ctx: 'type 1 diabetes (engine API)', state: 'GA + surgery, 4 h', intv: 'ketosis from insulin deficiency', sys: 'BLD END',
  arms: T1ARMS, measure: (R) => m(t1Measure(R)),
  expect: [{ m: 'keto4h', dir: 1, tol: 0.5, src: 'JBDS-IP 2023 perioperative diabetes / JBDS DKA 2023: omitted insulin in type 1 → ketosis (β-hydroxybutyrate > 3 mmol/L) within hours' }],
  hand: { verdict: 'MI', why: 'no ketogenesis from insulin deficiency: DKA is 7c\'s instructor condition (`condition dka`) and an INPUT to 7e (core.ts header: "never an output (no ketone drive back)"); 7c\'s ketoacid pool stays 0 whatever the insulin (and the type 1 profile is never insulin-deficient, ET-18a)' },
  owner: '7e glucose.ts → 7c ketoacids (new seam)' });
add({ id: 'ET-18c', tier: 'P1', ctx: 'type 1 diabetes (engine API)', state: 'GA + surgery, hyperglycaemic', intv: 'insulin infusion 0.1 units/kg/h for 2 h (fixed-rate): glucose fall per hour vs no infusion', sys: 'END BLD',
  arms: T1ARMS, measure: (R) => m(t1Measure(R)),
  expect: [{ m: 'fallPerH', lo: -4, hi: -2, src: 'JBDS DKA 2023 (fixed-rate 0.1 units/kg/h: target glucose fall ≈ 3 mmol/L/h) — band ±1 is a proposal around the guideline target' }],
  owner: '7e glucose.ts / 7g insulin row (FU-8 B1 reference)' });

// ---- ET-19 dexamethasone in type 2 ----------------------------------------------------------------------------------
add({ id: 'ET-19', tier: 'P1', ctx: 'type 2 diabetes 60 y (engine API)', state: 'GA flag, ventilated, no surgery', intv: 'dexamethasone 8 mg IV at T vs none: glucose at 4–8 h', sys: 'END',
  arms: { i: V([FLAG(), d(T, 'dexamethasone', 8, 'mg')], T + 8 * H, T2DM, { dt: 60 }), c: V([FLAG()], T + 8 * H, T2DM, { dt: 60 }) },
  measure: (R) => m({ dGluMax4to8h: r2(Math.max(...[4, 5, 6, 7, 8].map((h) => ((at(R.i!.rows, 'glu', T + h * H) as number) - (at(R.c!.rows, 'glu', T + h * H) as number)) / MG))), glu0: r2((at(R.c!.rows, 'glu', T) as number) / MG) }),
  expect: [{ m: 'dGluMax4to8h', lo: 2, hi: 4, src: 'research/12 ET-19 (PADDI: Corcoran TB et al., NEJM 2021;384:1731 — dexamethasone 8 mg raises glucose in diabetics, peak +2–4 mmol/L at 4–8 h) [VERIFY magnitude]' }],
  hand: { verdict: 'MI', why: 'dexamethasone is a placeholder row with no PD (pk/data/rows-other.ts:66 `pd: []`, "glucose ↑ is 7e"), and 7e observes only insulin and dextrose doses (adapters.ts:102–107): glucose Δ 0.00' },
  known: 'FU-7 Task 18', owner: '7g rows-other.ts → 7e glucocorticoid term (FU-7 Task 18, D12; its diabetic arm is this cell)' });

// ---- ET-20 insulin 10 U IV, awake -----------------------------------------------------------------------------------
const insArms = { i: SP([d(T, 'insulin', 10, 'units')], T + 3 * H, XA, { dt: 20 }), c: SP([], T + 3 * H, XA, { dt: 20 }) };
const insMeasure = (R: Record<string, ArmResult>) => { const i = R.i!.rows, c = R.c!.rows; return {
  gluNadirMmol: r2(mn(i, 'glu', T, T + 3 * H) / MG), tNadirMin: r2((tMin(i, 'glu', T, T + 3 * H) - T) / 60), below39: mn(i, 'glu', T, T + 3 * H) / MG < 3.9, below22: mn(i, 'glu', T, T + 3 * H) / MG < 2.2,
  dK30: r2((at(i, 'k', T + 1800) as number) - (at(c, 'k', T + 1800) as number)), dK60: r2((at(i, 'k', T + 3600) as number) - (at(c, 'k', T + 3600) as number)), dKmin: r2(Math.min(...[600, 1200, 1800, 2400, 3000, 3600].map((s) => (at(i, 'k', T + s) as number) - (at(c, 'k', T + s) as number)))),
  epiPeakRatio: r2(mx(i, 'epi', T, T + 3 * H) / w(c, 'epi', T, T + 600)), dHrPeak: r2(mx(i, 'hr', T, T + 3 * H) - w(c, 'hr', T, T + 3 * H)), dMapPeak: r2(mx(i, 'map', T, T + 3 * H) - w(c, 'map', T, T + 3 * H)),
  sweating: anyR(i, T, T + 3 * H, (x) => x.sweating === true), glycoMax: mx(i, 'glyco', T, T + 3 * H), consciousLost: anyR(i, T, T + 3 * H, (x) => x.conscious === false), diMin: mn(i, 'di', T, T + 3 * H) }; };
add({ id: 'ET-20a', tier: 'P1', ctx: 'X-A awake, spontaneous room air, non-diabetic', state: 'fasting normoglycaemia', intv: 'insulin 10 units IV (≈ 0.14 units/kg): glucose nadir and its time', sys: 'END',
  arms: insArms, measure: (R) => m(insMeasure(R)),
  expect: [{ m: 'tNadirMin', lo: 40, hi: 60, invert: true, src: 'research/12 ET-20 (nadir at 40–60 min; tables §7 prototype nadir 38 mg/dL). The insulin-tolerance-test literature (0.1–0.15 units/kg IV) puts the nadir at 20–30 min [VERIFY] — Q for Ali' },
    { m: 'below39', event: true, src: 'ADA level 1 (< 3.9 mmol/L) is certain after 0.14 units/kg IV in a non-diabetic (insulin tolerance test: < 2.2 mmol/L)' }],
  hand: { verdict: 'TS', why: 'glucose reaches its nadir 13 min after 10 units IV (research/12: 40–60 min; insulin-tolerance tests: 20–30 min) and only 2.9 mmol/L deep (ITT < 2.2): the bolus enters the insulin space at once (glucose.ts insulinBolus) with t½ 5 min and p2 0.025/min, so remote insulin peaks within minutes, and the counter-regulation (adrenaline ×16, glucagon-like EGP) pulls glucose back from 20 min. K −0.87 and HR +18 are in band' },
  owner: '7e glucose.ts (Bergman) / 7g insulin' });
add({ id: 'ET-20b', tier: 'P1', ctx: 'X-A awake', state: 'fasting', intv: 'insulin 10 units IV: plasma K⁺', sys: 'BLD',
  arms: insArms, measure: (R) => m(insMeasure(R)),
  expect: [{ m: 'dKmin', lo: -1.0, hi: -0.5, src: 'research/12 ET-20 (K −0.5 to −1 mmol/L); BF-08b insulin–dextrose −0.93 at 60 min (7c)' }],
  owner: '7g kShift (exogenous insulin) / 7c' });
add({ id: 'ET-20c', tier: 'P1', ctx: 'X-A awake', state: 'fasting', intv: 'insulin 10 units IV: the adrenergic counter-regulation (adrenaline, HR)', sys: 'END CIRC',
  arms: insArms, measure: (R) => m(insMeasure(R)),
  expect: [{ m: 'epiPeakRatio', lo: 10, hi: 20, src: 'tables §5c / params.ts DRIVE_HYPOGLY [TXT]: hypoglycaemic clamps raise adrenaline 10–20× (Cryer PE; Schwartz NS 1987) [VERIFY]' }, { m: 'dHrPeak', dir: 1, tol: 5, src: 'research/12 ET-20 (adrenergic response: tachycardia, sweating)' }],
  owner: '7e hormones.ts DRIVE_HYPOGLY_PER_MGDL' });

// ---- ET-27 anaphylaxis --------------------------------------------------------------------------------------------
const TA = T + 600;
const anaRig = (sev: number, doses: number[], mode: 'modeled' | 'manual' = 'modeled') => V([...GA(), [TA, A.cond('anaphylaxis', sev), `anaphylaxis ${sev}`], ...doses.map((t) => d(t, 'epinephrine', 50, 'mcg'))], TA + 1800, XA, { dt: 5, mode });
export const anaArms = { ii: anaRig(0.5, [TA + 180]), iiU: anaRig(0.5, []), iii: anaRig(0.75, [TA + 180, TA + 360, TA + 540, TA + 720]), iiiU: anaRig(0.75, []) };
export const anaArmsManual = { iii: anaRig(0.75, [TA + 180, TA + 360, TA + 540, TA + 720], 'manual'), iiiU: anaRig(0.75, [], 'manual') };
export { TA };
const anaMeasure = (R: Record<string, ArmResult>) => { const ii = R.ii!.rows, iiU = R.iiU!.rows, iii = R.iii!.rows, iiiU = R.iiiU!.rows; const base = w(iiU, 'map', TA - 60, TA); const D = TA + 180;
  const restoreS = (r: Row[]) => { const t = first(r, D, (x) => (x.map as number) >= 0.8 * base); return Number.isFinite(t) ? t - D : NaN; };
  return { mapBase: base, mapAtDoseII: a2(ii, 'map', D), map2minII: a2(ii, 'map', D + 120), dMap2minII: r2((at(ii, 'map', D + 120) as number) - (at(iiU, 'map', D + 120) as number)), restoreIIs: restoreS(ii), restoredII: restoreS(ii) <= 120,
    mapAtDoseIII: a2(iii, 'map', D), mapNadirIIIU: mn(iiiU, 'map', TA, TA + 1800), map10minIII: a2(iii, 'map', D + 600), dMap10minIII: r2((at(iii, 'map', D + 600) as number) - (at(iiiU, 'map', D + 600) as number)), restoreIIIs: restoreS(iii), restoredIII: restoreS(iii) <= 600,
    lungSevIIIat10: a2(iii, 'lungSev', D + 600), lungSevIIIUat10: a2(iiiU, 'lungSev', D + 600), dLungSevIII: r2((at(iii, 'lungSev', D + 600) as number) - (at(iiiU, 'lungSev', D + 600) as number)),
    spo2IIIU: mn(iiiU, 'spo2', TA, TA + 1800), spo2III: mn(iii, 'spo2', D, TA + 1800), arrestIIIU: anyR(iiiU, TA, TA + 1800, (x) => x.arrest !== '') }; };
const AAGBI = 'AAGBI/Harper NJN et al., Anaesthesia 2018;73:212 and 2020 guidance (adrenaline 50 µg IV boluses titrated to effect; grade III may need repeated boluses or an infusion; MAP responds within 1–2 min)';
add({ id: 'ET-27a', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA', state: 'anaphylaxis grade II (severity 0.5)', intv: 'adrenaline 50 µg IV at +3 min: MAP restored within 2 min', sys: 'CIRC',
  arms: anaArms, measure: (R) => m(anaMeasure(R)), expect: [{ m: 'restoredII', event: true, src: AAGBI }, { m: 'dMap2minII', dir: 1, tol: 5, src: AAGBI }], owner: '7e conditions.ts ANAPH / 7g adrenaline' });
add({ id: 'ET-27b', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA', state: 'anaphylaxis grade III (severity 0.75)', intv: 'adrenaline 50 µg IV every 3 min ×4: MAP course vs untreated', sys: 'CIRC',
  arms: anaArms, measure: (R) => m(anaMeasure(R)), expect: [{ m: 'restoredIII', event: true, src: AAGBI + ' (MAP ≥ 80 % of baseline within 10 min of repeated boluses)' }, { m: 'dMap10minIII', dir: 1, tol: 10, src: AAGBI }], owner: '7e conditions.ts ANAPH / 7g adrenaline' });
add({ id: 'ET-27c', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA', state: 'anaphylaxis grade III', intv: 'adrenaline ×4: bronchospasm (7b anaphylaxis lung severity) vs untreated', sys: 'LUNG',
  arms: anaArms, measure: (R) => m(anaMeasure(R)), expect: [{ m: 'dLungSevIII', dir: -1, tol: 0.05, src: AAGBI + ' (β2: bronchospasm eases)' }], dirOnly: true, owner: '7e anaphLung → 7b' });

// ---- ET-31 (added) insulin–dextrose ---------------------------------------------------------------------------------
add({ id: 'ET-31', tier: 'P2', ctx: 'X-A awake', state: 'normokalaemic', intv: 'insulin–dextrose (10 units + 25 g, the K⁺ treatment row) vs insulin 10 units and dextrose 25 g given as two rows: glucose course over 3 h', sys: 'END',
  arms: { combo: SP([d(T, 'insulinDextrose', 10, 'units')], T + 3 * H, XA, { dt: 20 }), two: SP([d(T, 'insulin', 10, 'units'), d(T, 'dextrose', 25000, 'mg')], T + 3 * H, XA, { dt: 20 }), c: SP([], T + 3 * H, XA, { dt: 20 }) },
  measure: (R) => { const g = (r: Row[], t: number) => ((at(r, 'glu', t) as number) - (at(R.c!.rows, 'glu', t) as number)) / MG; const ts = [5, 15, 30, 60, 90, 120, 180].map((x) => T + x * 60);
    return m({ comboMax: r2(Math.max(...ts.map((t) => g(R.combo!.rows, t)))), comboMin: r2(Math.min(...ts.map((t) => g(R.combo!.rows, t)))), twoMax: r2(Math.max(...ts.map((t) => g(R.two!.rows, t)))), twoMin: r2(Math.min(...ts.map((t) => g(R.two!.rows, t)))),
      dKcombo60: r2((at(R.combo!.rows, 'k', T + 3600) as number) - (at(R.c!.rows, 'k', T + 3600) as number)), dKtwo60: r2((at(R.two!.rows, 'k', T + 3600) as number) - (at(R.c!.rows, 'k', T + 3600) as number)) }); },
  expect: [{ m: 'comboMax', dir: 1, tol: 1, src: '25 g dextrose raises glucose at once (Balentine JR, J Emerg Med 1998;16:763: mean +9 mmol/L at 5 min) [VERIFY]' }, { m: 'comboMin', dir: -1, tol: 0.5, src: 'Apel J et al., Clin Kidney J 2014;7:248 / Coca A 2017 (hypoglycaemia in 8–17 % 1–3 h after insulin–dextrose for hyperkalaemia)' }],
  hand: { verdict: 'IN', why: "the same treatment, two answers: the `insulinDextrose` row (the K⁺ treatment 7c owns) moves K −0.88 but glucose 0.00 over 3 h, while `insulin` 10 units + `dextrose` 25 g as two rows give +6.9 then −2.4 mmol/L. 7e observes only the `insulin` and `dextrose` agent ids (adapters.ts:102–107); the combined row's PD is empty (rows-other.ts:26)" },
  owner: '7e adapters.ts observeDoses (reads `insulin`/`dextrose` only)' });
