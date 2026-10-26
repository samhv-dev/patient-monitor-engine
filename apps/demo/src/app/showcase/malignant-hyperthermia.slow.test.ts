// showcase-mh: malignant hyperthermia from the instructor's condition at induction (types-resp.ts
// `{ kind: 'condition', id: 'mh', severity }`, research/24 §P2), run through the card's buttons on the engine —
// treated early (2 min into the early signs), treated late (1 min into the established crisis: the run-sheet path) and
// untreated (VF from hyperthermia).
import { describe, expect, it } from 'vitest';
import { ConsoleModel } from '../../physiology-console/model.ts';
import { labelOf } from '../glossary.ts';
import { alarmAt, bands, entered, first, near, pvcEvents, range, runCard, type Act, type Sample } from './harness.ts';

/** Bands: the measured prototype ± a stated tolerance. Never widened. E117 (owner-confirmed 2026-10-23: MH tachycardia from
 *  the front-loaded sympathetic drive and hypercapnia; the MH muscle vasodilation) re-centred five bands on the new
 *  measurement, same ± 5: S1 untreated hrAtEstablished 142 → 166 and mapAtEstablished 98 → 92, S1 early hrMax
 *  93 → 119, S1 late sysMaxAfterCall 158 → 141 and mapAt60 112 → 107 (the residual MH activity's muscle vasodilation
 *  at 60 min lowers SVR; measured 106.8 against the old floor 107). Every timing and every other number stayed in its
 *  band.
 *  E119 (owner, 2026-10-24: the induction sequence awake → premedicated → preoxygenated → induced → intubated → surgery)
 *  moved the clock: every time below is now from the succinylcholine (SUX_S), as the old card's was from its start, and
 *  16 numbers left their bands and were re-centred on this build, same tolerances (old centre → new): S1 untreated
 *  earlyMin 6.85 → 4.53 (the premedication's hypoventilation and the apnoea leave the CO₂ up; the no-MH control settles at
 *  36–39 on the same ventilator), etco2AtEstablished 81 → 75, hrAtEstablished 166 → 126, mapAtEstablished 92 → 85;
 *  S1 early crisisMin 8.85 → 6.53 (follows the early signs), recoveringMin 16.97 → 10.07, tcMax 38.01 → 37.67, hrMax
 *  122 → 86, etco2Plus5 47 → 43, hrPlus15 85 → 68; S1 late etco2AtCall 60 → 75, phAtCall 7.19 → 7.12, etco2Plus2 54 →
 *  63, recoveringMin 30.8 → 36.6, hrAt60 91 → 78, mapAt60 107 → 101. The heart rates are lower because the fentanyl
 *  premedication gates the E117 sympathetic term (PR #118). Reported to the owner; not tuned.
 *  E131 (owner, 2026-10-26: one muscle metabolic rate; heat from the oxygen consumed; the owner accepted that the MH
 *  course moves): the MH heat is ≈ 140 W (was 705 W), so the core neither reaches the card's "established" 38.5 °C (it
 *  does at ≈ +103 min) nor the hyperthermic VF within the run; the CO₂ is higher and earlier. The untreated arm's
 *  established/arrest bands are an it.fails; its measurable numbers are a new row 'S1 untreated E131' (measured on this
 *  build ± the old tolerances). S1 early re-centred, same tolerances (old centre → new): recoveringMin 10.07 → 17.82
 *  (the higher EtCO₂ takes longer under 45), tcMax 37.67 → 36.8, etco2Plus5 43 → 50. S1 late cannot reach its call
 *  (an it.fails). Reported to the owner; not tuned. */
const BANDS = {
  'S1 untreated': { refused: [0, 0], earlyMin: [3.84, 5.22], establishedMin: [16.89, 20.65], etco2AtEstablished: [72, 78], hrAtEstablished: [121, 131], phAtEstablished: [7.06, 7.12], kAtEstablished: [5.4, 6], lactateAtEstablished: [4.1, 5.1], mapAtEstablished: [80, 90], hrMax: [185, 195], kMax: [6.1, 6.7], lossMin: [39.91, 48.79], tcAtLoss: [42.14, 42.54], kAtLoss: [6.1, 6.7], vf: [1, 1], arrestStateMin: [40.23, 49.17] },
  'S1 untreated E131': { refused: [0, 0], earlyMin: [3.41, 4.79], etco2Max: [103, 109], etco2At20: [88, 94], hrAt20: [119, 129], phAt20: [7.01, 7.07], kAt20: [5.8, 6.4], lactateAt20: [4.7, 5.7], mapAt20: [79, 89], tcAt20: [36.38, 36.78], hrMax: [134, 144], kMax: [6.5, 7.1], tcAt51: [37.11, 37.51], pulseLost: [0, 0] },
  // E133 (ventricular ectopy from K, catecholamines, temperature, acidaemia and ischaemia), measured on this build: the
  // first PVC 13.1 min after the succinylcholine (pH 7.22 → 7.13 with the MH catecholamine surge), 256 ectopic events
  // before the VF (36 runs of ≥ 3, the longest 13 beats), 33 in the last 120 s; the treated early course has none.
  'S1 untreated ectopy (E133)': { firstPvcMin: [11.1, 15.1], eventsBeforeLoss: [180, 330], runsBeforeLoss: [20, 55], eventsInLast120s: [18, 48], eventsAfterLoss: [0, 0] },
  'S1 early': { refused: [0, 0], crisisMin: [5.65, 7.42], pulseLost: [0, 0], recoveringMin: [16.12, 19.52], established: [0, 0], tcMax: [36.6, 37.0], hrMax: [81, 91], kMax: [4.5, 5.1], etco2Plus5: [47, 53], hrPlus15: [63, 73] },
  'S1 preoxygenation (E121)': { withSpo2AtInduction: [98, 100], withSpo2Min: [97, 100], withoutSpo2AtInduction: [87, 93], withoutSpo2Min: [55, 71], withoutDesatAlarmAfterInductionS: [56, 96] },
  'S1 late': { refused: [0, 0], crisisMin: [17.79, 21.75], dantroleneMin: [18.69, 22.85], pulseLost: [0, 0], etco2AtCall: [72, 78], tcAtCall: [38.51, 38.91], kAtCall: [5.5, 6.1], phAtCall: [7.09, 7.15], etco2Plus2: [60, 66], tcMax: [39.3, 39.7], tcPeakMin: [28.05, 34.29], kMax: [5.6, 6.2], lactateMax: [6.9, 7.9], recoveringMin: [33.54, 39.7], normoMin: [35.04, 42.82], hrAt60: [73, 83], mapAt60: [96, 106], tcAt60: [38.5, 38.9], etco2At60: [35, 41], phAt60: [7.35, 7.41], kAt60: [3.5, 4.1], sysMaxAfterCall: [136, 146] },
} as const;

const ID = 'showcase-mh';
const CRISIS = 'MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate';
/** Explore's "Changed only" is read where the presenter opens it: just before the crisis call (24:00 since E119). */
const CALL_S = 1440;
/** The rows the run sheet points at in Explore with "Changed only" on (group:label:direction, baseline at 1:00). Since E119
 *  the 1:00 baseline is the awake, premedicated patient, so three rows read the anaesthetic against it: ART M, SVR and
 *  CMRO₂ go DOWN (they went up against the old induced baseline); the other 19 are the MH rows as before. E131: at
 *  24:00 the core is below the awake baseline (the anaesthetic redistribution outweighs the ≈ 140 W of MH heat), so
 *  Tcore reads DOWN and T1 is not among the changed rows. */
const EXPLORE_AT_CALL = [
  'monitor:HR:up', 'monitor:ART M:down', 'monitor:EtCO₂:up', 'monitor:awRR:up',
  'circulation:CO:up', 'circulation:SV:down', 'circulation:SVR:down', 'circulation:LVEF:down', 'circulation:Myocardial O2 supply/demand:down',
  'blood:pH:down', 'blood:PCO₂:up', 'blood:BE:down', 'blood:Lactate:up', 'blood:K⁺:up', 'blood:Tcore:down', 'blood:VO₂:up', 'blood:SvO₂:down',
  'endocrine:MH activity:up', 'endocrine:Epinephrine:up', 'endocrine:Norepinephrine:up', 'brain:CMRO₂:down',
];
/** E119: the induction sequence on the kit-round path — premedication 0:30, preoxygenation 1:00, induction (propofol,
 *  succinylcholine: the MH condition starts here) 4:00, intubation and sevoflurane 5:00, surgery (rocuronium) 6:00. */
const SUX_S = 240;
const INDUCTION: Act[] = [
  { press: 'Premedicate: midazolam 2 mg, fentanyl 100 µg', t: 30 },
  { press: 'Preoxygenate: 100 % O₂ by face mask', t: 60 },
  { press: 'Induce: propofol 2 mg/kg, then succinylcholine 1.5 mg/kg', t: SUX_S },
  { press: 'Intubate: ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 %', t: 300 },
  { press: 'Start surgery: rocuronium 0.6 mg/kg', t: 360 },
];
const inCrisis = (s: Sample) => ['triggerOff', 'treating', 'recovering'].includes(s.state);
const checklist = (from: (s: Sample) => boolean, delayS: number): Act[] => [
  { press: CRISIS, when: from, delayS },
  { press: 'Dantrolene 2.5 mg/kg', when: (s) => s.state === 'triggerOff', delayS: 60 },
  { press: 'Cool: 2 L saline at room temperature', when: inCrisis, delayS: 90 },
  { press: 'Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose', when: inCrisis, delayS: 120 },
  { press: 'Sodium bicarbonate 1 mmol/kg', when: inCrisis, delayS: 150 },
  { press: 'Dantrolene 2.5 mg/kg', when: inCrisis, delayS: 600 },
  { press: 'EtCO₂ normal: ventilation back to 12 × 500', when: (s) => s.state === 'recovering' && (s.etco2 ?? 99) < 38 },
];
/** Explore's "Changed only" rows (baseline at 1 min, as the app sets it) at `atS`, by organ group. */
function explore(atS: number): { listen: (e: Parameters<ConsoleModel['ingest']>[0]) => void; rows: () => string[] } {
  const m = new ConsoleModel();
  let snap: string[] = [];
  return {
    listen: (e) => {
      m.ingest(e);
      if (m.baseT === null && m.t >= 60) m.setBaseline();
      if (snap.length === 0 && m.t >= atS) snap = m.rows().filter((r) => r.dir && !r.internal && labelOf(r.path) !== null && typeof r.value !== 'object').map((r) => `${r.group}:${labelOf(r.path) ?? ''}:${r.dir}`);
    },
    rows: () => snap,
  };
}

describe('S1 malignant hyperthermia (showcase-mh)', { timeout: 1_800_000 }, () => {
  let untreated: ReturnType<typeof runCard> | undefined;
  const untreatedRun = () => (untreated ??= runCard(ID, INDUCTION, 3300));
  it('untreated: early signs; EtCO₂, HR and K⁺ on the way (E131: no established crisis, no VF within 51 min of the sux)', async () => {
    const r = await untreatedRun();
    const at20 = near(r.rows, SUX_S + 20 * 60);
    bands('S1 untreated E131', {
      refused: r.refused.length, earlyMin: (entered(r, 'earlySigns') - SUX_S) / 60,
      etco2Max: range(r.rows, 'etco2', SUX_S, 3300).max, etco2At20: at20.etco2 ?? Number.NaN, hrAt20: at20.hr ?? Number.NaN, phAt20: at20.ph,
      kAt20: at20.k, lactateAt20: at20.lactate, mapAt20: at20.map ?? Number.NaN, tcAt20: at20.tc,
      hrMax: range(r.rows, 'hr', SUX_S, 3300).max, kMax: range(r.rows, 'k', 0, 3300).max, tcAt51: near(r.rows, 3299).tc,
      pulseLost: r.rows.some((x) => !x.pulse) ? 1 : 0,
    }, BANDS['S1 untreated E131']);
  });

  // E131: the MH heat is the achieved MH oxygen × its caloric equivalent (≈ 140 W at 80 kg; it was 8 × basal, 705 W), so
  // the core no longer reaches the card's "established" 38.5 °C (+103 min) or the hyperthermic VF within the run.
  it.fails('untreated: early signs, established crisis, VF from hyperthermia — measured: no established crisis and no VF in 51 min (core 37.3 °C at +51 min; E131: heat from the O₂ consumed)', async () => {
    const r = await untreatedRun();
    const loss = first(r.rows, (s) => !s.pulse);
    const est = entered(r, 'established');
    bands('S1 untreated', {
      refused: r.refused.length,
      earlyMin: (entered(r, 'earlySigns') - SUX_S) / 60, establishedMin: (est - SUX_S) / 60,
      etco2AtEstablished: near(r.rows, est).etco2 ?? Number.NaN, hrAtEstablished: near(r.rows, est).hr ?? Number.NaN,
      phAtEstablished: near(r.rows, est).ph, kAtEstablished: near(r.rows, est).k, lactateAtEstablished: near(r.rows, est).lactate,
      mapAtEstablished: near(r.rows, est).map ?? Number.NaN,
      hrMax: range(r.rows, 'hr', SUX_S, (loss?.t ?? 3300) - 5).max, kMax: range(r.rows, 'k', 0, (loss?.t ?? 3300) - 5).max,
      lossMin: ((loss?.t ?? Number.NaN) - SUX_S) / 60, tcAtLoss: loss?.tc ?? Number.NaN, kAtLoss: loss?.k ?? Number.NaN,
      vf: loss && /^vf/.test(near(r.rows, loss.t + 5).rhythm) ? 1 : 0,
      arrestStateMin: (entered(r, 'arrest') - SUX_S) / 60,
    }, BANDS['S1 untreated']);
    const lossT = loss?.t ?? Number.NaN;
    const before = pvcEvents(r, 0, lossT);
    bands('S1 untreated ectopy (E133)', {
      firstPvcMin: ((r.pvcs[0] ?? Number.NaN) - SUX_S) / 60, eventsBeforeLoss: before.length, runsBeforeLoss: before.filter((n) => n >= 3).length,
      eventsInLast120s: pvcEvents(r, lossT - 120, lossT).length, eventsAfterLoss: pvcEvents(r, lossT + 2).length,
    }, BANDS['S1 untreated ectopy (E133)']);
  });

  it('treated early: crisis 2 min into the early signs', async () => {
    const r = await runCard(ID, [...INDUCTION, ...checklist((s) => s.state === 'earlySigns', 120)], 2640);
    const c = r.pressed[INDUCTION.length] as number;
    bands('S1 early', {
      refused: r.refused.length, crisisMin: (c - SUX_S) / 60, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      recoveringMin: (entered(r, 'recovering') - SUX_S) / 60, established: Number.isNaN(entered(r, 'established')) ? 0 : 1,
      tcMax: range(r.rows, 'tc', 0, 2640).max, hrMax: range(r.rows, 'hr', SUX_S, 2640).max, kMax: range(r.rows, 'k', 0, 2640).max,
      etco2Plus5: near(r.rows, c + 300).etco2 ?? Number.NaN, hrPlus15: near(r.rows, c + 900).hr ?? Number.NaN,
    }, BANDS['S1 early']);
    expect(r.pvcs, 'S1 early: no ectopy on the treated course (E133)').toEqual([]);
  });

  it('Explore "Changed only" at the call time of the run sheet (24:00), untreated until then', async () => {
    const x = explore(CALL_S);
    await runCard(ID, INDUCTION, CALL_S + 1, x.listen);
    if (process.env.PME_SHOWCASE_PRINT) console.log(`S1 explore at ${CALL_S} s: ${x.rows().join(' | ')}`);
    for (const row of EXPLORE_AT_CALL) expect(x.rows(), row).toContain(row);
  });

  // E131: the card's "established" state needs core > 38.5 °C, which the oxygen-derived MH heat reaches only at
  // ≈ +103 min (measured on this build, untreated), so the late call is never made within the arm's 60 min.
  it.fails('treated late (the run-sheet path): crisis 1 min into the established crisis — measured: the established crisis is not entered in 60 min, the call is not made (E131)', async () => {
    const r = await runCard(ID, [...INDUCTION, ...checklist((s) => s.state === 'established', 60)], 3840);
    const c = r.pressed[INDUCTION.length] as number;
    const d1 = r.pressed[INDUCTION.length + 1] as number;
    bands('S1 late', {
      refused: r.refused.length, crisisMin: (c - SUX_S) / 60, dantroleneMin: (d1 - SUX_S) / 60, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      etco2AtCall: near(r.rows, c).etco2 ?? Number.NaN, tcAtCall: near(r.rows, c).tc, kAtCall: near(r.rows, c).k, phAtCall: near(r.rows, c).ph,
      etco2Plus2: near(r.rows, c + 120).etco2 ?? Number.NaN,
      tcMax: range(r.rows, 'tc', c, 3840).max,
      tcPeakMin: (r.rows.filter((s) => s.t >= c).reduce((b, s) => (s.tc > b.tc ? s : b)).t - SUX_S) / 60,
      kMax: range(r.rows, 'k', c, 3840).max, lactateMax: range(r.rows, 'lactate', c, 3840).max,
      recoveringMin: (entered(r, 'recovering') - SUX_S) / 60, normoMin: (entered(r, 'normoventilated') - SUX_S) / 60,
      hrAt60: near(r.rows, 3839).hr ?? Number.NaN, mapAt60: near(r.rows, 3839).map ?? Number.NaN, tcAt60: near(r.rows, 3839).tc,
      etco2At60: near(r.rows, 3839).etco2 ?? Number.NaN, phAt60: near(r.rows, 3839).ph, kAt60: near(r.rows, 3839).k,
      sysMaxAfterCall: range(r.rows, 'sys', c, 3840).max,
    }, BANDS['S1 late']);
  });

  it("E121: oxygen only from the card's step — with Preoxygenate the induction apnoea keeps SpO₂ up; without it SpO₂ falls before the tube", async () => {
    const withO2 = await runCard(ID, INDUCTION, 420);
    const without = await runCard(ID, INDUCTION.filter((a) => !a.press.startsWith('Preoxygenate')), 420);
    const lo = (r: Awaited<ReturnType<typeof runCard>>) => range(r.rows, 'spo2', SUX_S, 420).min;
    bands('S1 preoxygenation (E121)', {
      withSpo2AtInduction: near(withO2.rows, SUX_S).spo2 ?? Number.NaN, withSpo2Min: lo(withO2),
      withoutSpo2AtInduction: near(without.rows, SUX_S).spo2 ?? Number.NaN, withoutSpo2Min: lo(without),
      withoutDesatAlarmAfterInductionS: alarmAt(without, /DESAT/, SUX_S) - SUX_S,
    }, BANDS['S1 preoxygenation (E121)']);
  });
});
