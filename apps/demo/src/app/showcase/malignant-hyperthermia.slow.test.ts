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
 *  (an it.fails). Reported to the owner; not tuned.
 *  E133 rebase (2026-10-27, gate ruling): 'S1 untreated E131' hrMax measures the sinus tachycardia, so it leaves out
 *  every sample within 10 s after a PVC — the monitor's HR numeric averages the beats of a non-sustained VT run (13–15
 *  PVCs at the planner's 160/min), which would otherwise read as the MH tachycardia; without them the maximum is 139,
 *  the E131 centre, unchanged. The displayed maximum during the runs (samples within 10 s after a PVC of a run of ≥ 3)
 *  is its own measure, hrMaxInRuns: 160 measured, the same ± 5.
 *  E132 rebase onto main 25771808 (2026-10-27, brief rule (c): main's E131/E133 bands and it.fails win; only the
 *  card steps come from #144): the trigger-off step starts a propofol infusion 100 µg/kg/min in place of the
 *  sevoflurane, and cooling is refrigerated saline 20 mL/kg (1.6 L, given at the theatre's 21 °C: no cold-fluid input)
 *  pressed only above 38.5 °C, so not on the early path. #144's own re-centring (on the pre-E131 build) is dropped
 *  and the S1 early bands were re-taken on this build: tcMax 36.8, hrMax 91, kMax 4.8, etco2Plus5 52, hrPlus15 71 held;
 *  recoveringMin left its band and is re-centred, same tolerance (old centre → new): 17.82 → 20.37. The mechanism: no
 *  room-temperature fluid on the early path, so the core is not cooled and the MH CO₂ production takes longer to come
 *  under the Recovering threshold; with the same course and the 1.6 L pressed regardless of the core (a probe, not the
 *  card) Recovering comes at 18.27 min, inside the old band. Reported; not tuned.
 *  MH skin constriction (2026-10-30, post-demo: the MH sympathetic surge constricts the skin, thermal heat.ts `kcp`;
 *  Sessler 2008, Gronert 1978, Gagge 1986): the MH heat stays in the core instead of warming the GA-dilated periphery.
 *  Four numbers left their bands and are re-centred on this build, same tolerances, for the owner's ruling (old centre
 *  → new): S1 untreated E131 tcAt20 36.58 → 37.28, tcAt51 37.31 → 38.74, hrMax 139 → 153 (the fever term of the hotter
 *  core); S1 early hrMax 86 → 92 (measured 91 → 92). The untreated core course from the sux (printed, not a band):
 *  36.486 → 37.022 at 15 min, 36.922 → 38.020 at 35 min. "Established" (core > 38.5 °C) now comes at +45.6 min (was
 *  ≈ +103), so the late arm's call is made at +46.6 min; both arms stay expected failures. Explore at 24:00: Tcore and
 *  T1 read UP. Every other number stayed in its band; the demo path's moved by ≤ 16 s inside them. Reported; not
 *  tuned.
 *  E131-2 (2026-11-01, the owner: "the temperature still does not rise properly"; the evidence verdict in
 *  research/e131-2-mh-heat-evidence.md): the band, not the engine. The registry's maximal rate of core rise in grade
 *  5–6 MH is 0.80 (IQR 0.50–1.00) °C per 15 min in survivors, 0.65 (0.53–1.32) in deaths (Toyota Y et al., Biomed Res
 *  Int 2023, 128 cases, full text); the engine's untreated core rises 0.76 °C per 15 min at full activity. On the
 *  anaesthetised core (36.67 °C at the sux) that IQR puts 38.5 °C at ≈ 35–63 min, median ≈ 42; 16.9–20.7 min needs
 *  1.3–1.6 °C per 15 min from the trigger (≈ 300 W net, whole-body VO₂ × 4–5: measured × 1.8–2.7 in swine, × 2–3 in
 *  reviews of man). The established crisis moves to its own row in the passing untreated arm, re-centred on this build
 *  with the old tolerances; the hyperthermic VF stays an expected failure. No engine change. */
const BANDS = {
  'S1 untreated': { refused: [0, 0], earlyMin: [3.84, 5.22], hrMax: [185, 195], kMax: [6.1, 6.7], lossMin: [39.91, 48.79], tcAtLoss: [42.14, 42.54], kAtLoss: [6.1, 6.7], vf: [1, 1], arrestStateMin: [40.23, 49.17] },
  'S1 untreated E131': { refused: [0, 0], earlyMin: [3.41, 4.79], etco2Max: [103, 109], etco2At20: [88, 94], hrAt20: [119, 129], phAt20: [7.01, 7.07], kAt20: [5.8, 6.4], lactateAt20: [4.7, 5.7], mapAt20: [79, 89], tcAt20: [37.08, 37.48], hrMax: [148, 158], hrMaxInRuns: [155, 165], kMax: [6.5, 7.1], tcAt51: [38.54, 38.94], pulseLost: [0, 0] },
  // E133 (ventricular ectopy from K, catecholamines, temperature, acidaemia and ischaemia). Measured first on the
  // pre-E131 course (to the hyperthermic VF at +44.5 min): first PVC +13.1 min, 256 events before the VF (36 runs).
  // Re-measured on the E131 course (rebase onto 5024f071, 2026-10-27; same tolerances, the reason: E131 moved the
  // course): the acidaemia is deeper and earlier (pH 7.18 at +10 min, 7.04 at +15) while the core stays below 37.3 °C,
  // so the drive is the pH term × the MH catecholamines (D ≈ 1.4–1.8; sT 0, sK ≤ 0.15) and the first PVC comes at
  // +10.1 min (13.1 → 10.07); 339 events in the 51 min (256 → 339: the run is longer than the old 44.5 min to the VF
  // and the drive is up from +15 min), 40 runs of ≥ 3 (36 → 40), the longest 15 beats. There is no VF, so the old
  // eventsInLast120s (before the VF) and eventsAfterLoss have no counterpart and are dropped; 'S1 untreated E131'
  // pulseLost 0 stands for the latter. Re-centred again (same tolerances) when the hazard got its own RNG stream
  // (`ectopyHazard`; it had shared the ECG's `ectopy` stream, which also times the escape foci): first PVC 10.07 →
  // 10.95 min, 339 → 346 events, 40 → 35 runs.
  // E131-2: the established crisis, measured (old prototype centre → this build, same tolerances): establishedMin
  // 18.77 → 45.6 (± 10 %), etco2 75 → 73, hr 126 → 148, pH 7.09 → 7.03, K⁺ 5.7 → 6.8, lactate 4.6 → 12.2, MAP 85 → 87.93.
  // The registry's range for this number is ≈ 35–63 min (research/e131-2-mh-heat-evidence.md); the band is the engine's.
  'S1 untreated established (E131-2)': { establishedMin: [41.04, 50.16], etco2AtEstablished: [70, 76], hrAtEstablished: [143, 153], phAtEstablished: [7.0, 7.06], kAtEstablished: [6.5, 7.1], lactateAtEstablished: [11.7, 12.7], mapAtEstablished: [82.93, 92.93] },
  'S1 untreated ectopy (E133)': { firstPvcMin: [8.95, 12.95], events51Min: [270, 420], runs51Min: [19, 54] },
  'S1 early': { refused: [0, 0], crisisMin: [5.65, 7.42], pulseLost: [0, 0], recoveringMin: [18.67, 22.07], established: [0, 0], tcMax: [36.6, 37.0], hrMax: [87, 97], kMax: [4.5, 5.1], etco2Plus5: [47, 53], hrPlus15: [63, 73] },
  'S1 preoxygenation (E121)': { withSpo2AtInduction: [98, 100], withSpo2Min: [97, 100], withoutSpo2AtInduction: [87, 93], withoutSpo2Min: [55, 71], withoutDesatAlarmAfterInductionS: [56, 96] },
  // Owner rc.4 rulings (2026-10-28): the card does what a clinician does. The second dantrolene (the EtCO₂ climbing back at
  // normal ventilation) re-applies the crisis ventilation, 20 × 600 at 100 % O₂, and ventilation returns to 12 × 500
  // again only once the EtCO₂ has stayed below 40 for 2 min (the first return's rule: the same button in Recovering,
  // pressed on it; the Debrief judges the first return only, objective 6), never on a timer.
  // A new row: no band covered the MH course after the first ventilation back before (S1 late, the only arm that
  // pressed it, is an it.fails since E131). The path is kit round A4's by its rc.4 clocks (call 2 s after the early
  // signs, dantrolene 21 s after the call, ventilation back at 13:56, the second dose at 19:14), and the second
  // ventilation back is pressed as soon as its rule is met. Measured on this build; tolerances: clock times ± 30 s,
  // EtCO₂ ± 3, HR ± 5, MAP ± 5 (R45). Before the ruling, on the same path at normal ventilation, the EtCO₂ held at 64–66
  // after the second dose and came below 40 for good only at 51:49 (headless, main dea151c4). Measured (centres): the
  // EtCO₂ 64 at the second dose (19:14), 50 a minute later, below 40 358 s after it (25:12), Recovering 23:34, the rule
  // met and ventilation back again at 27:12; at normal ventilation the EtCO₂ then rises to 44 (not past 45) and is below
  // 40 for good from 43:10. At the talk's end, 24:31, he is still hyperventilated: EtCO₂ 41, HR 69, MAP 67.
  'S1 demo path (owner rc.4)': { refused: [0, 0], pulseLost: [0, 0], normoS: [806, 866], above45AfterNormoS: [0, 30], dose2S: [1124, 1184], etco2AtDose2: [61, 67], etco2Dose2Plus60: [47, 53], below40AfterDose2S: [328, 388], recovering2S: [1384, 1444], normo2S: [1602, 1662], etco2At2431: [38, 44], hrAt2431: [64, 74], mapAt2431: [62, 72], etco2MaxAfterNormo2: [41, 47], belowForGoodS: [2560, 2620] },
  'S1 late': { refused: [0, 0], crisisMin: [17.79, 21.75], dantroleneMin: [18.69, 22.85], pulseLost: [0, 0], etco2AtCall: [72, 78], tcAtCall: [38.51, 38.91], kAtCall: [5.5, 6.1], phAtCall: [7.09, 7.15], etco2Plus2: [60, 66], tcMax: [39.3, 39.7], tcPeakMin: [28.05, 34.29], kMax: [5.6, 6.2], lactateMax: [6.9, 7.9], recoveringMin: [33.54, 39.7], normoMin: [35.04, 42.82], hrAt60: [73, 83], mapAt60: [96, 106], tcAt60: [38.5, 38.9], etco2At60: [35, 41], phAt60: [7.35, 7.41], kAt60: [3.5, 4.1], sysMaxAfterCall: [136, 146] },
} as const;

const ID = 'showcase-mh';
const CRISIS = 'MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min, hyperventilate';
/** Explore's "Changed only" is read where the presenter opens it: just before the crisis call (24:00 since E119). */
const CALL_S = 1440;
/** The rows the run sheet points at in Explore with "Changed only" on (group:label:direction, baseline at 1:00). Since E119
 *  the 1:00 baseline is the awake, premedicated patient, so three rows read the anaesthetic against it: ART M, SVR and
 *  CMRO₂ go DOWN (they went up against the old induced baseline); the other 19 are the MH rows as before. E131: at
 *  24:00 the core was below the awake baseline (the anaesthetic redistribution outweighed the ≈ 140 W of MH heat), so
 *  Tcore read DOWN and T1 was not among the changed rows. Since the MH sympathetic surge constricts the skin (thermal
 *  heat.ts `kcp`) the MH heat stays in the core: Tcore reads UP and T1 is among the changed rows (UP). */
const EXPLORE_AT_CALL = [
  'monitor:HR:up', 'monitor:ART M:down', 'monitor:EtCO₂:up', 'monitor:awRR:up', 'monitor:T1:up',
  'circulation:CO:up', 'circulation:SV:down', 'circulation:SVR:down', 'circulation:LVEF:down', 'circulation:Myocardial O2 supply/demand:down',
  'blood:pH:down', 'blood:PCO₂:up', 'blood:BE:down', 'blood:Lactate:up', 'blood:K⁺:up', 'blood:Tcore:up', 'blood:VO₂:up', 'blood:SvO₂:down',
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
  // E132: cool only above 38.5 °C (the cue card: not pressed on the early-call path)
  { press: 'Cool: refrigerated saline 20 mL/kg (1.6 L)', when: (s) => inCrisis(s) && s.tc > 38.5, delayS: 90 },
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
  it('untreated: early signs; EtCO₂, HR and K⁺ on the way; established (core > 38.5 °C) at +45.6 min, the core rising 0.76 °C per 15 min, the registry median (E131-2); no VF within 51 min of the sux', async () => {
    const r = await untreatedRun();
    const at20 = near(r.rows, SUX_S + 20 * 60);
    // E133: the samples within 10 s after a PVC (the HR numeric is still averaging ectopic beats), and those within 10 s
    // after the third or a later beat of a run of ≥ 3 PVCs
    const runEnds: number[] = [];
    r.pvcs.forEach((t, i) => {
      let k = i; // walk back over the beats < 0.5 s apart (pvcEvents' rule): the third of them is a run
      while (k > 0 && (r.pvcs[k] as number) - (r.pvcs[k - 1] as number) < 0.5 && i - k < 2) k--;
      if (i - k >= 2) runEnds.push(t);
    });
    const after = (ts: readonly number[], t: number) => ts.some((p) => p <= t && p > t - 10);
    // The core-temperature course, untreated: a PRINTED number (the owner's report of 30 Oct: 36.5 at 15 min and 36.9 at
    // 35 min on his path), not a band — minutes from the sux to 51 min
    if (process.env.PME_SHOWCASE_PRINT) {
      const course = [0, 5, 10, 12, 15, 20, 25, 30, 35, 40, 45, 51].map((m) => `${m}:${near(r.rows, Math.min(3299, SUX_S + m * 60)).tc.toFixed(3)}`);
      console.log(`S1 untreated core course (min after the sux: °C) ${course.join(' ')}`);
    }
    const hrMaxOf = (keep: (t: number) => boolean) => r.rows.filter((x) => x.t >= SUX_S && x.t <= 3300 && keep(x.t) && x.hr !== null).reduce((m, x) => Math.max(m, x.hr as number), Number.NEGATIVE_INFINITY);
    bands('S1 untreated E131', {
      refused: r.refused.length, earlyMin: (entered(r, 'earlySigns') - SUX_S) / 60,
      etco2Max: range(r.rows, 'etco2', SUX_S, 3300).max, etco2At20: at20.etco2 ?? Number.NaN, hrAt20: at20.hr ?? Number.NaN, phAt20: at20.ph,
      kAt20: at20.k, lactateAt20: at20.lactate, mapAt20: at20.map ?? Number.NaN, tcAt20: at20.tc,
      hrMax: hrMaxOf((t) => !after(r.pvcs, t)), hrMaxInRuns: hrMaxOf((t) => after(runEnds, t)),
      kMax: range(r.rows, 'k', 0, 3300).max, tcAt51: near(r.rows, 3299).tc,
      pulseLost: r.rows.some((x) => !x.pulse) ? 1 : 0,
    }, BANDS['S1 untreated E131']);
    const est = entered(r, 'established');
    bands('S1 untreated established (E131-2)', {
      establishedMin: (est - SUX_S) / 60, etco2AtEstablished: near(r.rows, est).etco2 ?? Number.NaN, hrAtEstablished: near(r.rows, est).hr ?? Number.NaN,
      phAtEstablished: near(r.rows, est).ph, kAtEstablished: near(r.rows, est).k, lactateAtEstablished: near(r.rows, est).lactate,
      mapAtEstablished: near(r.rows, est).map ?? Number.NaN,
    }, BANDS['S1 untreated established (E131-2)']);
    const ev = pvcEvents(r, 0, 3300);
    bands('S1 untreated ectopy (E133)', {
      firstPvcMin: ((r.pvcs[0] ?? Number.NaN) - SUX_S) / 60, events51Min: ev.length, runs51Min: ev.filter((n) => n >= 3).length,
    }, BANDS['S1 untreated ectopy (E133)']);
  });

  // E131: the MH heat is the achieved MH oxygen × its caloric equivalent (≈ 140 W at 80 kg; it was 8 × basal, 705 W), so
  // the core no longer reached the card's "established" 38.5 °C (+103 min) or the hyperthermic VF within the run. With
  // the MH skin constriction "established" comes at +45.6 min; still no VF. E131-2 (evidence, research/
  // e131-2-mh-heat-evidence.md): the establishment band 16.9–20.7 min was the 705-W prototype's, not a clinical number —
  // the registries' fastest 15-min rise is 0.80 (0.50–1.00) °C (Toyota 2023), and the engine's 0.76 sits at that median —
  // so the established crisis is measured in the passing arm above. What stays here is the prototype's hyperthermic VF:
  // 42.3 °C 40–49 min after the sux is ≈ 2.3 °C per 15 min from the anaesthetised core, faster than the registries too.
  it.fails('untreated: VF from hyperthermia — measured: no VF in 51 min (core 38.7 °C at +51 min); the band (VF at 42.3 °C, 40–49 min after the sux) needs ≈ 2.3 °C per 15 min, above the registry maximum rates of 0.50–1.00 (E131-2)', async () => {
    const r = await untreatedRun();
    const loss = first(r.rows, (s) => !s.pulse);
    bands('S1 untreated', {
      refused: r.refused.length,
      earlyMin: (entered(r, 'earlySigns') - SUX_S) / 60,
      hrMax: range(r.rows, 'hr', SUX_S, (loss?.t ?? 3300) - 5).max, kMax: range(r.rows, 'k', 0, (loss?.t ?? 3300) - 5).max,
      lossMin: ((loss?.t ?? Number.NaN) - SUX_S) / 60, tcAtLoss: loss?.tc ?? Number.NaN, kAtLoss: loss?.k ?? Number.NaN,
      vf: loss && /^vf/.test(near(r.rows, loss.t + 5).rhythm) ? 1 : 0,
      arrestStateMin: (entered(r, 'arrest') - SUX_S) / 60,
    }, BANDS['S1 untreated']);
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

  // E131: the card's "established" state needs core > 38.5 °C, which the oxygen-derived MH heat reached only at
  // ≈ +103 min, so the late call was never made within the arm's 60 min. With the MH skin constriction the core passes
  // 38.5 °C at +45.6 min untreated: the call is made at +46.6 min, too late for every band of the arm.
  it.fails('treated late (the run-sheet path): crisis 1 min into the established crisis — measured: the call comes at +46.6 min (band 17.8–21.8) and Recovering is not reached by 60 min (E131)', async () => {
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

  it('the demo path (owner rc.4): ventilation back at 13:56; the second dose with the crisis ventilation at 19:14; ventilation back again once EtCO₂ has stayed below 40 for 2 min', async () => {
    const NORMO = 'EtCO₂ normal: ventilation back to 12 × 500';
    const below40 = (s: Sample) => s.etco2 !== null && s.etco2 < 40;
    let d2 = Number.NaN;
    let run2: number | null = null;
    let held2 = Number.NaN;
    const r = await runCard(ID, [
      ...INDUCTION,
      { press: CRISIS, when: (s) => s.state === 'earlySigns', delayS: 2 },
      { press: 'Dantrolene 2.5 mg/kg', when: (s) => s.state === 'triggerOff', delayS: 21 },
      { press: NORMO, t: 836, when: (s) => s.state === 'recovering' },
      { press: 'Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂ 100 %)', t: 1154, when: (s) => s.state === 'normoventilated' },
      // the second ventilation back: once EtCO₂ has stayed below 40 for 2 min since the second dose, in Recovering
      { press: NORMO, when: (s) => {
        if (Number.isNaN(d2) && s.state === 'dantroleneAgain') d2 = s.t;
        if (!Number.isNaN(d2)) {
          run2 = below40(s) ? (run2 ?? s.t) : null;
          if (Number.isNaN(held2) && run2 !== null && s.t - run2 >= 120) held2 = s.t;
        }
        return s.state === 'recovering' && !Number.isNaN(held2);
      } },
    ], 3600);
    const n = INDUCTION.length;
    const normo = r.pressed[n + 2] as number;
    const dose2 = r.pressed[n + 3] as number;
    const normo2 = r.pressed[n + 4] as number;
    const after = (t0: number, f: (s: Sample) => boolean) => first(r.rows, f, t0)?.t ?? Number.NaN;
    let forGood: number | null = null;
    for (const s of r.rows) forGood = below40(s) ? (forGood ?? s.t) : null;
    expect(r.states.some(([t, id]) => id === 'dantroleneAgain' && Math.abs(t - dose2) < 1), 'the second dose enters "Dantrolene 2.5 mg/kg again"').toBe(true);
    expect(near(r.rows, dose2 + 30).awrr, 'the crisis ventilation is back 30 s after the second dose').toBe(20);
    expect(held2, 'the second ventilation back waits for its rule').toBeLessThanOrEqual(normo2);
    bands('S1 demo path (owner rc.4)', {
      refused: r.refused.length, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      normoS: normo, above45AfterNormoS: after(normo, (s) => (s.etco2 ?? 0) > 45) - normo,
      dose2S: dose2, etco2AtDose2: near(r.rows, dose2 - 1).etco2 ?? Number.NaN, etco2Dose2Plus60: near(r.rows, dose2 + 60).etco2 ?? Number.NaN,
      below40AfterDose2S: after(dose2, below40) - dose2, recovering2S: r.states.find(([t, id]) => t > dose2 && id === 'recovering')?.[0] ?? Number.NaN,
      normo2S: normo2, etco2At2431: near(r.rows, 1471).etco2 ?? Number.NaN, hrAt2431: near(r.rows, 1471).hr ?? Number.NaN, mapAt2431: near(r.rows, 1471).map ?? Number.NaN,
      etco2MaxAfterNormo2: range(r.rows, 'etco2', normo2, 3600).max, belowForGoodS: forGood ?? Number.NaN,
    }, BANDS['S1 demo path (owner rc.4)']);
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
