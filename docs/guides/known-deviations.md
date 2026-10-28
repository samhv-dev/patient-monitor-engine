# Known deviations

Codes such as FU-4, R45 or 7a in this page are labels of the project's internal records (gate notes and plans); they will be replaced by plain names after this release candidate.

The same expected failures, grouped by the module that owns them and split into target, measured value and source, are in [known misses by module](../validation/known-misses.md) (generated).

The engine is a teaching model, not a validated clinical simulator. This page lists, openly, where it is known to
differ from published physiology, recorded patients or a reference model. Policy (ruling R45): a test band taken from
the literature is never loosened to make the model pass; a miss is kept as an `it.fails` test with the measured
number in its title and appears here until the mechanism is fixed. The calibration pass with a clinician (R44) works
through this list.

Regenerate the first two tables with `node --experimental-strip-types scripts/deviations.ts`. The `docs-honesty` test
fails when a literal-titled expected failure or skip is missing from this page. It cannot see conditional forms such
as `(cond ? it.fails : it)(…)`, nor the lung-signature `KNOWN` list; those are listed by hand below.

On this tree there are **161 expected-failure calls**, all read by the lister: 160 `it.fails` (the bronchospasm row of
`packages/ventilator/test/link-parity.test.ts` is a literal `it.fails`) and 1 `it.fails.each` with three cases
(`packages/engine-core/test/engine/fidelity-arrest.test.ts`), and **1 skipped test**. "Tracked in" names the gate note (and its section)
that records the miss with its number; the open questions it cites (Q…, R-…, E-…) are listed in that note.

## Tests that record a miss (`it.fails`, and `test.fail` in the browser tests)

| Test file | Band and measured value (test title, verbatim) | Tracked in |
|---|---|---|
| `apps/demo/src/app/showcase/malignant-hyperthermia.slow.test.ts` | untreated: early signs, established crisis, VF from hyperthermia — measured: no established crisis and no VF in 51 min (core 37.3 °C at +51 min; E131: heat from the O₂ consumed) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `apps/demo/src/app/showcase/malignant-hyperthermia.slow.test.ts` | treated late (the run-sheet path): crisis 1 min into the established crisis — measured: the established crisis is not entered in 60 min, the call is not made (E131) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/engine/af-rate-control.test.ts` | amiodarone 150 mg over 10 min: AF 130 slows by 20–30 % at its peak (10–13 min) (measured 14.0) | `docs/gates/stage-7e.md` "Expected failures (`it.fails`)"; `docs/gates/fu-3.md` §2 "Numbers vs bands", row 7 (13.4 %) |
| `packages/engine-core/test/engine/arrest-etco2.test.ts` | VF without CPR: EtCO2 < 5 mmHg already at +30 s (research 03 §4.4 / respiratory acceptance 4) — measured 9.3 with the alveolar washout (24.2 before it) | `docs/gates/fu-7.1-b.md` §5 "Records this branch creates" (+30 s: 9.3); §1 "Tasks, before and after", B3 |
| `packages/engine-core/test/engine/arrest-etco2.test.ts` | VF with CPR q 0.8 from +30 s: EtCO2 ≥ 17 already at +2 min of CPR — measured 15.9 with the alveolar washout | `docs/gates/fu-7.1-b.md` §5 "Records this branch creates" (CPR +2 min: 15.9); history in `docs/gates/fu-8-part-a.md` §4 "The rows FU-8 moves" |
| `packages/engine-core/test/engine/blood-anaemia-co.test.ts` | Hb 5 vs 15: CO ≥ +30 % (Weiskopf CI +66 %) — measured +25 % (5.49 → 6.87) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/blood-sanity-acid.test.ts` | 2 L 0.9 % saline in 30 min under GA: Cl +6–8 and BE −3 to −5 at 60 min (annex D3) | `docs/gates/stage-7c.md` §5 "`it.fails` records (R45: bands unchanged)", row "7c saline 2 L, engine"; `docs/gates/stage-7e.md` "Expected failures (`it.fails`)" |
| `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` | a PEA onset still shows organised electrical activity 6–10 min after the arrest — measured 0 beats (the PEA decayed to asystole first) | `docs/gates/fu-4.md` §4 "The `it.fails` list" (F5: the untreated PEA decays) |
| `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` | the monitor shows the bradycardia before the arrest: monitor HR < 45 in the minute before — measured min 58 (Task 13b not landed) | `docs/gates/fu-4.md` §4 "The `it.fails` list"; §1 "What shipped", task 13 (13b measured, not landed) |
| `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts` | ROSC rig: the continuous CPR CoPP stays inside Paradis 15–25 throughout (≥ 15 was asserted; ≤ 25 added by F1) — measured −0.4–36.6 | `docs/gates/fu-4.md` §4 "The `it.fails` list" |
| `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts` | brief §4.9: CVP 6 ventilated from t = 0, PEEP 15 reads 30–50 % of the 10 cmH2O step (2.2–3.7 mmHg) above PEEP 5 (measured 4.82: T_IT 0.65) | `docs/gates/fu-3.md` §7 "Test counts (final head)" (plan item 7, fix deferred) |
| `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts` | the validation-harness soak patient (CVP 6, PEEP 5) stays under the philips-like 10 mmHg limit with its ventilatory ripple: max < 9.5 and no CVP_M_HIGH in 120 s (measured max 10.17; no raise since the displayed 10 is not above the limit) | `docs/gates/fu-5.md` §4 "`it.fails` (all FU-5's …)" (title re-stated) and §5 "R45 re-statements" |
| `packages/engine-core/test/engine/circ-manual-ischaemia.test.ts` | 90/52 in the 75 y HTN profile under GA: no ischaemic spiral (kIsch > 0.9) and LVEDP back under the congestion threshold (18) in the last 2 min — measured kIsch 0.200, LVEDP 46.1 | `docs/gates/fu-3.md` §7 "Test counts (final head)" (Task 4 defect 1) |
| `packages/engine-core/test/engine/circ-pulsus.test.ts` | severe tamponade: pulsus paradoxus ≥ 10 mmHg (Spodick 2003) — measured 3.1 (swing 8 cmH2O: 4.9; 12: 6.9; Q2) | `docs/gates/fu-4.md` §2 "The clinical scenario table", row S3; owner decision A48 (pulsus paradoxus) in `docs/RESUME.md` |
| `packages/engine-core/test/engine/circ-sanity-2.test.ts` | AS + CAD propofol → hypotension → ischaemia (kIsch falls, ST ↓) → phenylephrine reverses it | `docs/gates/stage-7e.md` "Expected failures (`it.fails`)" (R23 ×2); origin: `docs/gates/stage-7a.md` "NR-2 — R23 AS + CAD propofol ischaemia trajectory" |
| `packages/engine-core/test/engine/circ-sanity-2.test.ts` | the same run rescued with ephedrine 10 mg keeps the deficit longer (kIsch still < 0.95 at +3 min) | `docs/gates/stage-7e.md` "Expected failures (`it.fails`)" (R23 ×2); origin: `docs/gates/stage-7a.md` "NR-2 — R23 AS + CAD propofol ischaemia trajectory" |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | S4b severe tamponade, propofol 1 mg/kg: MAP < 55 within 3 min and CO −25 % (measured MAP 50.5, CO −21 % when propofol removes the tonic sympathetic share — 58.9 / −17 % when it does not; 57 / −15 % on the prototype) | `docs/gates/fu-4.md` §2 "The clinical scenario table", row S4b (Q2); moved by FU-8 B4: `docs/gates/stage-fu-8b.md` §5 "Rows that moved (final)" |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | S5 severe tamponade, PEEP 5 → 10: CO −20 % and MAP ≥ 10 mmHg more than the same PEEP in a healthy patient (Barash; measured ΔMAP 4.1 vs 1.5, CO ×0.88 — 4 vs 1, ×0.89 on the prototype; Q2) | `docs/gates/fu-4.md` §2 "The clinical scenario table", row S5 (Q2) |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | S6a the same: MAP falls 40–60 % to a nadir of 30–50 over 1–3 min (the expected picture; measured nadir 2.7, −97 % with an arrest when propofol removes the tonic sympathetic share — 26.5, −68 % when it does not, 28.7 on the prototype) | `docs/gates/fu-4.md` §2 "The clinical scenario table", row "S6a nadir 30–50" (Q1, item 19); the arrest is a record: `docs/gates/stage-fu-8b.md` §4 "Class III haemorrhage + propofol 2 mg/kg" (E-FU8B-2) |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | S9 the same: SaO2 < 90 % at 5 min (truth, not the display; the proposed band SpO2 ≤ 92 at FiO2 0.5 is Ali's, item 15; measured 97.8 %) | `docs/gates/fu-4.md` §2 "The clinical scenario table", row "S9 SaO2 (truth)" (item 15, Ali's proposed band) |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | S9 the same: CVP ≥ 15 and MAP < 65 at 5 min (RV failure; Q15; measured CVP 9.3, MAP 82.1) | `docs/gates/fu-4.md` §2 "The clinical scenario table", row "S9 CVP / MAP" (Q15) |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | S13 VF + standard-quality CPR (q 0.8, no adrenaline): the continuous coronary perfusion pressure (CoPP) 15–25 mmHg (Paradis 1990; measured 24.9–28.0 with the outflow limiter, 25.1–28.8 without) | `docs/gates/fu-8-part-a.md` §4 "The rows FU-8 moves", row S13 (E-FU8-9); `docs/gates/fu-4.md` §2 "The clinical scenario table", row S13 |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | CPR + 2 L + adrenaline 1 mg after full exsanguination: a pulse within 4 min of the first compression — measured none in 10 min with the humoral fade (+105 s without it) | `docs/gates/fu-4.md` §2 "The clinical scenario table", row "CPR + 2 L + adrenaline after full exsanguination"; §5 "Exceptions", E-FU4-19 |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | 10 min of VF with standard-quality CPR alone: the myocardium stays ischaemic, flow share kIsch < 0.9 throughout (Weisfeldt & Becker 2002; measured max 0.89 with the outflow limiter, 0.91 without) — measured 1.00 with the pulseless apnoea (the unventilated rig is apnoeic while pulseless) | `docs/gates/fu-6.md` "Fix round (orchestrator gate on PR #28 …)" (reads 1.00: the rig is not ventilated); history in `docs/gates/fu-8-part-a.md` §4 "The rows FU-8 moves" |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | MANUAL target 18/10 mmHg: the displayed arterial pressure reaches the target (≤ 25/15) — the tracker floors it (the monitor showed 65/30) | `docs/gates/fu-4.md` §2 "The clinical scenario table", row "MANUAL target 18/10" (ruling 6, item 21, Q-FU3-4a) |
| `packages/engine-core/test/engine/clinical-suite.test.ts` | S16 untreated MH under sevoflurane: arrest (VF/asystole) before 60 min, core ≤ 44 °C at the arrest (MHAUS; Miller, MH; Q6) — measured no arrest in 60 min, core 37.6 °C at 60 min (E131: heat from the O2 consumed) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/engine/cpr-etco2.test.ts` | quality map at 10 breaths/min: 0.5 → 12 (8–15), default 0.8 → 20 (17–23), 1.0 → 25 (22–28), 1.2 mechanical-grade → 29 (26–32) — measured 20.5 / 25.2 / 26.6 / 26.6 at the circulation's CPR flow | `docs/gates/fu-8-part-a.md` §4 "The rows FU-8 moves", row "R39-2 quality map" (E-FU8-10, W22); `docs/gates/fu-8-part-a.md` §6 "`it.fails` (added, flipped) and exceptions" |
| `packages/engine-core/test/engine/cpr-etco2.test.ts` | ventilation: +10 breaths/min lowers EtCO2 by ≈ 3 mmHg (−2 to −4.5) at the learner default — measured −4.8 at the circulation's CPR flow | `docs/gates/fu-8-part-a.md` §4 "The rows FU-8 moves", row "R39-2 quality map" (E-FU8-10, W22); `docs/gates/fu-8-part-a.md` §6 "`it.fails` (added, flipped) and exceptions" |
| `packages/engine-core/test/engine/drug-apnoea.test.ts` | fentanyl 5 µg/kg on room air stops breathing (DI-71): VE < 1 L/min for ≥ 60 s within 5 min, SpO2 nadir < 90 % — measured 0 s (VE nadir 2.28 L/min, −65 % of 6.44), SpO2 86; FENT_VENT_REMI_EQ 0.55, APNOEA_VE_IN 0.1 | `docs/gates/fu-7.md` §4 "`it.fails` list", #1 |
| `packages/engine-core/test/engine/drug-apnoea.test.ts` | naloxone 0.4 mg restores breathing (DI-71): VE back to ≥ 40 % of the pre-drug VE within 30–180 s — measured +1 s: VE never fell below 40 % (nadir 2.27 of 6.45 L/min), no apnoea to reverse | `docs/gates/fu-7.md` §4 "`it.fails` list", #2 |
| `packages/engine-core/test/engine/drug-apnoea.test.ts` | the Bailey pair (DI-03): fentanyl 2 µg/kg + midazolam 0.05 mg/kg on room air — SpO2 nadir 70–89 % on seed 7; the singles ≥ 93 % — measured pair 46 %, fentanyl 94 %, midazolam 95 % | `docs/gates/fu-7.md` §4 "`it.fails` list", #3 |
| `packages/engine-core/test/engine/drug-apnoea.test.ts` | the Bailey pair, a POPULATION claim over seeds 1–20: apnoea (VE < 1 L/min) in ≥ 4 of 20 (Bailey 1990: 6/12) — measured 0 of 20 | `docs/gates/fu-7.md` §4 "`it.fails` list", #4 |
| `packages/engine-core/test/engine/drug-apnoea.test.ts` | … and the flag clears once effort returns (the trigger is visible: rr > 0) — measured: the committed rate stays 0 for all 1200 s (flag 1200 s) | `docs/gates/fu-7.md` §4 "`it.fails` list", #5 |
| `packages/engine-core/test/engine/drug-layer-guards.test.ts` | … without overshoot: Ce peak 2.99–3.01 (earlier measured max 3.0005) — measured 3.110 (3.132 before the blood/fluids merge; 3.1 on the TS baseline) | `docs/gates/fu-7.md` §4 "`it.fails` list", #17 |
| `packages/engine-core/test/engine/drug-layer-guards.test.ts` | verapamil 5 mg in pre-excited AF produces VF or a faster ventricular rate than the same rhythm without it (DI-15; ALS — the AV-nodal-blocker hazard; AF arm at natural length: Task 0 Step 6b PASSED) — measured: no change (rate 232 in both arms; AV-node occupancy 0.35 < the hook's 0.5) | `docs/gates/fu-7.md` §4 "`it.fails` list", #18 |
| `packages/engine-core/test/engine/drug-layer-guards.test.ts` | … EtCO2 52–70 by 10 min at constant MV (DI-65; tables §7 check 21) — measured 48.3 after E131 (42.2 before; baseline b004289: 42.2) | `docs/gates/fu-7.md` §4 "`it.fails` list", #16; `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/engine/drug-layer.test.ts` | … and MAP by 8–25 % (T6.3) — measured −6.7 % (SVR −10.8 %, HR +20.6: the reflex holds the pressure; −5.6 % before the blood/fluids merge) | `docs/gates/fu-7.md` §4 "`it.fails` list", #6 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | SV rises ≥ 8 % while MAP falls ≤ 15 % (Cohn & Franciosa 1977) — measured SV +1.2 %, MAP −12.8 % (hydralazine on the same rig: SV +0.1 %); the circulation's afterload sensitivity (research/19 C9) | `docs/gates/fu-7.md` §4 "`it.fails` list", #7 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | thiopental 4 mg/kg: unconscious within 20–60 s (DI-69; one arm–brain circulation) — measured +10 s (Task 5 prototype +10 s) | `docs/gates/fu-7.md` §4 "`it.fails` list", #8 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | etomidate 0.3 mg/kg: unconscious within 20–60 s (M10 ch. 21 p. 541: one arm–brain circulation) — measured +16 s (propofol 2 mg/kg 54 s on the same rig) | `docs/gates/fu-7.md` §4 "`it.fails` list", #41 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | ketamine 1.5 mg/kg loses consciousness no faster than 30 s (M10 Table 21.1) — measured 16 s at 1 s sampling (20 s at 5 s sampling) | `docs/gates/fu-7.md` §4 "`it.fails` list", #9 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | ephedrine's pressor rise under chronic β-blockade is 0.3–0.7 × the healthy rise (tables §1.5 / §7 17b; DI-04a) — measured 0.99 | `docs/gates/fu-7.md` §4 "`it.fails` list", #10 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | … with a reflex bradycardia (M10 ch. 14) — measured HR never below the control arm (min Δ +1) | `docs/gates/fu-7.md` §4 "`it.fails` list", #11 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | amiodarone 300 mg during CPR raises the modelled shock success: the ROSC share of outcomeProbabilities through two shocks ≥ 1.2 × the no-drug share (ARREST 1999) — measured × 1.11 (0.072 vs 0.065; occupancy 0.38 at the shock) | `docs/gates/fu-7.md` §4 "`it.fails` list", #12 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | LAST is additive (DI-23; ASRA 2020): lidocaine 1.5 mg/kg on top of bupivacaine 100 mg raises the CNS effect by > 0.02 — measured +0.014 | `docs/gates/fu-7.md` §4 "`it.fails` list", #13 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | second gas (Epstein 1964, M10 ch. 19): 66 % N2O raises sevoflurane 2 %'s FA/FI at 5 min by ≥ +0.03 — measured +0.014 in the engine (+0.021 in the standalone drug rig) | `docs/gates/fu-7.md` §4 "`it.fails` list", #14 |
| `packages/engine-core/test/engine/drug-layer.test.ts` | a magnesium sulfate load 60 mg/kg prolongs rocuronium T1 25 % by 20–90 % (M10 ch. 24 p. 698) — measured +11.4 % (+12.0 % before the blood/fluids merge; blood Mg peak 2.1, falling; the profile Mg 2.5 gives +39.7 %) | `docs/gates/fu-7.md` §4 "`it.fails` list", #15 |
| `packages/engine-core/test/engine/endo-acceptance.test.ts` | E117: the HR is ≥ 120 by the time the EtCO2 passes 55 mmHg (tachycardia is among the earliest MH signs, Miller 10e; owner-confirmed 2026-10-23) — measured 114 since the hypercapnic pressor multiplier was removed (122 on origin/main dea151c4) | `CHANGELOG.md` [Unreleased] (the PR "hypercapnia dilates and depresses instead of pressing"); `docs/roadmap/v2.0/evidence/cardiac-reflexes-audit.md` §2.5, the note of 2026-10-28 |
| `packages/engine-core/test/engine/endo-acceptance.test.ts` | MH severity 1 at fixed ventilation (tables §7 check 21): EtCO2 rising 3–5 mmHg/min in minutes 10–15 — measured 6.0 (E131; 3.4 before) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/engine/endo-acceptance.test.ts` | MH severity 1 at fixed ventilation (tables §7 check 21): core +1 °C by 15 min — measured −0.14 °C (E131: heat from the O2 consumed) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/engine/endo-acceptance.test.ts` | MH + dantrolene 2.5 mg/kg at 20 min, fixed MV: EtCO2 turns 5–10 min after the dose (tables §7 check 21) — measured +4.0 min (E131) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/engine/endo-circ-acceptance.test.ts` | warm CO 7–9 L/min (measured 5.0) | `docs/gates/stage-7e.md` "Expected failures (`it.fails`)", item 4 (Q-7e-7); re-measured in `docs/gates/fu-4.md` §4 "The `it.fails` list" |
| `packages/engine-core/test/engine/endo-circ-acceptance.test.ts` | warm SVR 500–700 dyn·s/cm⁵ (measured 861) | `docs/gates/stage-7e.md` "Expected failures (`it.fails`)", item 5 (Q-7e-7); re-measured in `docs/gates/fu-4.md` §4 "The `it.fails` list" |
| `packages/engine-core/test/engine/fidelity-alarms.test.ts` | CVP limit chatter on a stable ventilated patient: CVP_M_HIGH raised ≤ 2 times in the 11-min MANUAL rhythm tour (the audit's chatter criterion) — measured 4 on philips-like and 4 on mindray-like with the vendor alarm on-delays (11 and 9 without them): the displayed CVP swings 9–11 across the limit 10 with the ventilation and the rhythm changes, wider than the one-unit hysteresis | `docs/gates/fu-5.md` §4 "`it.fails` (all FU-5's …)", row `fidelity-alarms` 11 |
| `packages/engine-core/test/engine/fidelity-arrest.test.ts` | philips-like keeps S/D/M of the flat line: no pulsatile S/D (spread ≤ 5) after the fresh beats — measured 6 (27/21) at 6 samples | `docs/gates/fu-4.md` §9b "FU-5 (PR #24) — merged in, and its cross-branch items" (pinned, FU-5 follow-up) |
| `packages/engine-core/test/engine/fidelity-arrest.test.ts` | %s: the CPR window's EtCO2 floor is 10 mmHg (research/10 §13) — measured 7 in the first 15 s of compressions with the alveolar washout (mean 15.3–15.6, max 20–21) | `docs/gates/fu-7.1-b.md` §5 "Records this branch creates" (fidelity-3 EtCO2 floor × 3 skins: 7; Q9); target audit row 181 (docs/validation/target-audit/30-target-audit.md#row-181) |
| `packages/engine-core/test/engine/fidelity-ecg.test.ts` | saadat-like: 80 → 120 within 8 s (B9 manual M p. 65–66: 6 s at the 8 s averaging window, research/06 §4.1; ± 2 s as philips-like) — measured 9 s (10 s to the review's settle rule) | `docs/gates/fu-5.md` §4 "`it.fails` (all FU-5's …)", row `fidelity-ecg` 12 (open question 12) |
| `packages/engine-core/test/engine/fidelity-lowflow.test.ts` | ventilated normal patient (MODELED, PPV from 1 s): rest PI within ± 5 % of 1.80 — measured 1.49 (−17 %): SV₀ is the spontaneous settle (80 mL) against 68 mL under PPV; PI follows SV only until the circulation publishes a cutaneous tone | `docs/gates/fu-5.md` §4 "`it.fails` (all FU-5's …)", row `fidelity-lowflow` 1b |
| `packages/engine-core/test/engine/fidelity-nibp.test.ts` | MANUAL pulse pressure 10 (77/67): the cuff shows the narrow pulse pressure — S/D within ± 8 of the instructor's 77/67 — measured 80/56 (PP 24); the truth reaches only 81/62 (PP 19: the MANUAL tracker) and the cuff widens it by 5 | `docs/gates/fu-5.md` §4 "`it.fails` (all FU-5's …)", row `fidelity-nibp` 10 PP 10 (open question 5) |
| `packages/engine-core/test/engine/fidelity-nibp.test.ts` | MANUAL AF 150, 11 cycles: \|SBP bias\| ≤ 6 mmHg against the TRUE radial pressure (the audit's AF criterion) — measured +10.8 (the first two readings 125/78 and 117/67: +24 and +13; DBP +2.7): the truth beat-mean counts AF's non-ejecting beats, which the cuff and the line do not see | `docs/gates/fu-5.md` §4 "`it.fails` (all FU-5's …)", row `fidelity-nibp` 10 AF 150 |
| `packages/engine-core/test/engine/resp-coupling.test.ts` | MH: the core rises > 1 °C in the first 30 min — measured +0.20 °C (E131: heat from the O2 consumed) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/engine/thermal-fever-ga.test.ts` | sepsis (phase sepsis) under GA: core 38.5–41 °C at 90 min (tables §5e) — measured 36.60 (36.86 before Task A3) | `docs/gates/stage-fu-10.md` §3 "Acceptance numbers, before (base) → after", row A8 (R-3) |
| `packages/engine-core/test/engine/thermal-fever-ga.test.ts` | thyroid storm under GA: core 38.5–41 °C at 1 h (thyroid.ts header; tables §5c) — measured 36.34 (36.58 before Task A3) | `docs/gates/stage-fu-10.md` §3 "Acceptance numbers, before (base) → after", row A8 (R-3) |
| `packages/engine-core/test/engine/endo-insulin-dextrose.test.ts` | insulin 10 units IV, awake: nadir at 20–30 min (insulin-tolerance test) — measured 13.3 min | `docs/gates/stage-fu-10.md` §3 "Acceptance numbers, before (base) → after", row A5 (R-1) |
| `packages/engine-core/test/engine/thermal-periop-course.test.ts` | open wound: vasoconstriction begins at 3–4 h (Sessler 2000) — measured 2.27 h | `docs/gates/stage-fu-10.md` §3 "Acceptance numbers, before (base) → after", row A3 "surgical onset time" (R-5) |
| `packages/engine-core/test/engine/drug-desflurane-surge.test.ts` | a 3 → 12 % desflurane step raises HR 8–35 bpm (tables §6.3: +20–30 % for 2–4 min), the rise lasting 2–4 min — measured ΔHR +1.1 (the trigger never fires) | `docs/gates/fu-7.md` §4 "`it.fails` list", #19 |
| `packages/engine-core/test/engine/drug-opioid-induction-synergy.test.ts` | the fall after fentanyl 2 µg/kg is 1.7–2.1 × the fall after propofol alone (Billard 1994: 53/28 = 1.89) — measured 1.16 at HEMO_SYN_MAX 0.2 | `docs/gates/fu-7.1-a.md` §3 "Per task: prototype vs this branch", A2 (owner question Q2) |
| `packages/engine-core/test/engine/blood-potassium-chloride.test.ts` | 20 mmol over 1 h raises plasma K by 0.15–0.35 mmol/L (≈ 0.25, Miller 10e ch. 46 [TXT, grade C]) — measured +0.77 at the end of the infusion and +0.13 two hours later | `docs/gates/fu-7.1-a.md` §4 "Task A5 (potassium chloride)" (Q11) |
| `packages/engine-core/test/engine/circ-body-size.test.ts` | term neonate 3.5 kg: cardiac output ≥ 150 mL/kg/min (PALS ≈ 200) — measured 0.31 L/min = 89 mL/kg/min (isometric §2.2 scaling) | `docs/gates/fu-8-part-a.md` §6 "`it.fails` (added, flipped) and exceptions", A12 (W12) |
| `packages/engine-core/test/engine/circ-coronary-supply.test.ts` | healthy 40 y, AF 150/min: kIsch ≥ 0.9 throughout (research/19 quiet band) — measured 0.89 in this rig, a MODEL LIMITATION (sinus 150 holds 1.00; the residual is beat-to-beat variance) | `docs/gates/fu-8-part-a.md` §6 "`it.fails` (added, flipped) and exceptions", A10 (model limitation); `docs/gates/fu-8-part-a.md` §4 "The rows FU-8 moves" |
| `packages/engine-core/test/engine/cpr-cerebral-flow.test.ts` | VF + CPR q 1: CBF 0.30–0.40 of normal (Meaney 2013 consensus [VERIFY]; research/20 band 0.2–0.45) — measured 0.45 (a model limitation for the calibration pass) | `docs/gates/fu-8-part-a.md` §6 "`it.fails` (added, flipped) and exceptions" |
| `packages/engine-core/test/engine/circ-lvad-filling.test.ts` | 1.5 L bleed over 5 min: pump flow ≤ 3.0 L/min and a suction event (research/20 DV-17) — measured min 3.68 L/min, no suction after A26 (3.70, none before) | `docs/gates/fu-8-part-a.md` §6 "`it.fails` (added, flipped) and exceptions", A26 DV-17; §5 "The two unprototyped tasks" |
| `packages/engine-core/test/engine/circ-lvad-filling.test.ts` | pulsatility index 3–5 at rest (HeartMate 3; research/20 DV-16d) — measured 6.8: the native LV's own pulsatility (recorded, not refitted: plan A26 (3)) | `docs/gates/fu-8-part-a.md` §6 "`it.fails` (added, flipped) and exceptions", A26 DV-16d; §5 "The two unprototyped tasks" |
| `packages/engine-core/test/engine/organs-renal-iap.test.ts` | IAP 14 under GA: urine −30 % or more (SP-08e) — measured −12.5 % | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/engine/organs-renal-iap.test.ts` | IAP 14 under GA: CO −10–30 % at +15 min (Joris 1993; left to the circulation) — measured 0.0 % | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/engine/blood-fluid-kinetics.test.ts` | class III, then RL 2 L: urine 30–60 min after the end ≥ 0.5 mL/kg/h — measured 0.33 (main 0.23) | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/engine/blood-septic-leak.test.ts` | warm septic shock + 30 mL/kg: extra EVLWI more than healthy and PaO2 falls — measured +0.90 vs +1.68 mL/kg, PaO2 +10 | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/engine/blood-mannitol.test.ts` | 1 g/kg: osmolality +20–30 mOsm/kg at 15 min (RH-08c) — measured +8.7 | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/engine/organs-brain-osmolality.test.ts` | glycine 3 L: ICP ≥ 1 mmHg above the control — measured +0.26 | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/engine/organs-renal-kaliuresis.test.ts` | furosemide 40 mg at K 7.5: K ≥ 0.1 lower at 3 h — measured −0.029 | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/engine/blood-massive-transfusion.test.ts` | iCa nadir 0.6–0.95 and BE ≤ −10 (ATLS class IV) — measured iCa 0.958, BE −0.2 | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/engine/hemo-acceptance.test.ts` | 5c. post-PVC potentiation: the next beat SBP is +8–15 mmHg on average over isolated PVCs (measured −10.9) | `docs/gates/fu-2.md` §2 "Numbers vs bands", row 3 (Q-FU2-4); origin: `docs/gates/stage-7a.md` "NR-1 — Stage 2 acceptance 5c" |
| `packages/engine-core/test/engine/lung-r14.test.ts` | permissive hypercapnia raises mean PAP ≥ 2 mmHg — measured 18.1 → 19.2 (+1.1) at PaCO2 32.3 → 55.0 (band ≥ +2) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/lung-r14.test.ts` | induction at FiO2 1.0 (no thermal switch): Qs/Qt ≥ 0.07 by 20 min — measured 0.015 (calibration row) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/neuro-acceptance.test.ts` | residual block at extubation (TOFR < 0.9, natural airway): smaller breaths than the unblocked control — measured ratio 0.80 (band < 0.75) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" ("Other files, R45 applied by the executor") |
| `packages/engine-core/test/engine/obstructive-aliases.test.ts` | CVP ≥ 15 mmHg — measured 11.5 (RV wall-stress demand added, Task 11 Step 1b) | `docs/gates/fu-4.md` §4 "The `it.fails` list" |
| `packages/engine-core/test/engine/obstructive-aliases.test.ts` | MAP < 65 mmHg — measured 78.4 (reached only at +15 min, PEA at +15.6 min) | `docs/gates/fu-4.md` §4 "The `it.fails` list" |
| `packages/engine-core/test/engine/obstructive-aliases.test.ts` | PROPOSED band (Q15, Ali): SaO2 ≤ 92 % at FiO2 0.5 — measured 97.3 (the PE row shunt +0.10 is sourced, tables §18) | `docs/gates/fu-4.md` §4 "The `it.fails` list" |
| `packages/engine-core/test/engine/organs-curves.test.ts` | UOP mid-curve (tables U linear 40 → 100): U(RPP 75) = 0.58 ± 15 % (prototype 0.76, decision 8) | `docs/gates/stage-7d.md` §3 "`it.fails` (R45: no band widened)", row "UOP mid-curve" (Decision 8) |
| `packages/engine-core/test/engine/organs-htn.test.ts` | hypocapnia PaCO2 25: CBF ≤ 40 % of the anaesthetised baseline — measured 0.4019 with the alveolar washout (0.394 without it) | `docs/gates/fu-7.1-b.md` §6 "Orchestrator rulings (2026-10-11)", item 3 (ratified as a known miss); `docs/gates/fu-7.1-b.md` §5 "Records this branch creates" |
| `packages/engine-core/test/engine/organs-htn.test.ts` | restoring PaCO2 35 and MAP ≈ 80: CBF > 80 % — measured MAP 86.6 (premise 77–84 missed), CBF 0.891 | `docs/gates/fu-3.md` §4 "Decisions, rulings, deviations" (E-FU3-2) and §7 "Test counts (final head)"; `docs/gates/stage-7d.md` §3 "`it.fails` (R45: no band widened)" |
| `packages/engine-core/test/engine/organs-renal.test.ts` | check 20 (MODELED hfref): low-output premise, UOP 0.1–0.15; dobutamine → CO +20–40 %, UOP 0.2–0.3 in 30–60 min | `docs/gates/stage-7d.md` §3 "`it.fails` (R45: no band widened)", row "check 20, MODELED `hfref`" (R-7D-5c) |
| `packages/engine-core/test/engine/organs-renal.test.ts` | check 20 (MANUAL contractility): premise UOP 0.1–0.15; dobutamine → CO +20–40 %, UOP 0.2–0.3 in 30–60 min | `docs/gates/stage-7d.md` §3 "`it.fails` (R45: no band widened)", row "check 20, MANUAL contractility 0.3" |
| `packages/engine-core/test/engine/organs-tbi-treatment.test.ts` | hyperventilation: ICP falls no more than 30 % by the time PaCO2 reaches 30 — measured 30.5 % | `docs/gates/fu-4.md` §4 "The `it.fails` list" |
| `packages/engine-core/test/engine/organs-tbi.test.ts` | Cushing through circ.ext.rSysF: HR −20–40 % from the baroreflex — measured ratio 0.803 (band 0.6–0.8; 0.799 without the patient's own breathing effort) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/pk-acceptance-pd.test.ts` | dobutamine 5 µg/kg/min: CO +20–40 % (measured +13.6; +11.8 with the β venous term) | `docs/gates/fu-7.md` §4 "`it.fails` list", #37 |
| `packages/engine-core/test/engine/pk-acceptance-pd.test.ts` | ephedrine 10 mg ×3 at 10 min: the third dose adds ≤ 0.6 × the SVR increment of the first (tachyphylaxis 0.7²) — measured direct SVR increments 0.040 / 0.010 / 0.005 (the pressor moved to sympDrive) | `docs/gates/fu-7.md` §4 "`it.fails` list", #36 |
| `packages/engine-core/test/engine/resp-child-baseline.test.ts` | awake: PaCO2 35–45, VT 4.2–10.4 mL/kg, lactate rise < 0.5 over 15 min — measured VT 15.4 mL/kg (246 mL, RR 7.4; PaCO2 36.1, lactate +0.01) (band 4.2–10.4) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/resp-child-baseline.test.ts` | preoxygenated apnoea: displayed SpO2 < 90 no more than 20 s after SaO2 < 90 — measured 22 s (+200 / +222 s) (band ≤ 20 s) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/resp-child-rest.test.ts` | CPR (quality 1, 110/min): the adult’s coRatio in the same 0.25–0.33 — measured 0.363 (the circulation's CPR flow; 0.293 without it) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" (orchestrator's re-statement); `docs/gates/fu-8-part-a.md` §6 "`it.fails` (added, flipped) and exceptions", A22 |
| `packages/engine-core/test/engine/resp-drive-nonchemical.test.ts` | noxious stimulus 1.5 under remifentanil 0.1 + propofol 50 (SGA, FiO2 0.5): VE ≥ +20 % — measured +3.3 % (3.29 → 3.40 L/min; prototype +0.6 %, neuro antinoc 0.77) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/resp-ga-state.test.ts` | child 4 y 16 kg: 2–3.2 min (Patel 160 ± 31 s) — measured 3.38 (3.50 on the prototype) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/resp-inspired-co2.test.ts` | RS14: FiCO2 8 for 20 min: PaCO2 and EtCO2 +6–10 over control — measured PaCO2 +6.7 / EtCO2 +5.99994 with the alveolar washout (+6.1 without it; +5.98 when propofol also does not remove the tonic sympathetic share) | `docs/gates/fu-7.1-b.md` §5 "Records this branch creates" (RS14, Q5); `docs/gates/stage-fu-8b.md` §6 "Exceptions", E-FU8B-7 |
| `packages/engine-core/test/engine/resp-mechanics.test.ts` | healthy adult under GA on VCV: Enghoff VD/VT 0.30–0.45 (Nunn 8e: ≈ 0.3 awake, higher under anaesthesia) — measured 0.28 (VD phys 140 mL: the ETT bypass + HEALTHY_VDALV 0.075) | `docs/gates/stage-7k.md` §5 "`it.fails` added by 7k (R45)" (Q-7k-5) |
| `packages/engine-core/test/engine/resp-mechanics.test.ts` | COPD GOLD 3, VCV 490 × 14: PEEPi 4–8 (catalogue §5 band at the reference rate) — measured 3.6 (lungState 3.7: the lung's own value, not a respiratory-mechanics measurement; calibration row) | `docs/gates/stage-7k.md` §5 "`it.fails` added by 7k (R45)" (R46 calibration row) |
| `packages/engine-core/test/engine/resp-pregnancy.test.ts` | preoxygenated apnoea to SaO2 90 %: 2.5–4.5 min — measured 4.82 | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS1 healthy intubated, VCV 12 × 7 mL/kg IBW, man and woman: PaCO2 35–42 at 30 min, VD/VT 0.25–0.4 — measured PaCO2 32.2 / 33.7, VD/VT 0.26 / 0.28 | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS1 (§7 Q1) |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS2 pregnancy 2.5–4.5 (measured 4.82) and child 4 y 2–3.2 (measured 3.38) | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS2b (7j; Q-FU6-11) |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS3 capnogram < 15 mmHg while VT < dead space (from 10 s after the first such breath) — measured 26.8 (the smaller physical VDs move the Fowler ramp down; 15.6 with the larger ones) | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS3b (Q-FU6-12) |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS5 remifentanil 0.1 awake: RR 6–10 and, at 0.2, PaCO2 +5–15 — measured RR 5.58 (opioid rate depression, calibration row) and ΔPaCO2 +13.3 (met) | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS5b |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS6 sevoflurane via SGA to ≈ 1 MAC: RR ≥ 1.4× awake and VT ≤ 0.7× awake — measured RR 16.7 vs 13.6 (1.23×), VT 0.67× (met) at 0.88 MAC (94040f7: 1.29× / 0.71×; D2 "tachypnoea too weak", Q-FU6-7) | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS6 (Q-FU6-7) |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS7 SaO2 falls ≥ 4 in untreated severe bronchospasm at FiO2 0.5 — measured 99.9 → 99.7 on the merged main (99.8 → 99.5 on 94040f7) | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS7b |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS8 laryngospasm after propofol 1 mg/kg on air: pleural swing ≤ −20 cmH2O with pulsus ≥ 10 mmHg — measured −30.7 cmH2O (met) / pulsus 8.2 mmHg (missed), SaO2 12.8 % at 180 s (94040f7: −14.6 / 12.6) | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS8 (7a interdependence size) |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS10 a 30 s disconnection restores MAP to ≥ 85 % of the RR-10 value — measured 29.7 of 84.5 (35 %): arrested before the disconnection, and PEEPtot stays 23.2 after it (pre-existing on main; 94040f7: 73.6 of 94.0) | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS10b (pre-existing arrest, FU-4/V.1) |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS13 massive PE (one command), awake then ventilated: RR ≥ 25 and PaCO2 ≤ 35 awake; EtCO2 falls ≥ 10 with Pa–Et ≥ 15 ventilated; mPAP 30–45 — measured awake 28.2 / 33.1 (met); ventilated: arrest (CO 0, EtCO2 30.6 → 0, mPAP 11.2) (94040f7: 40.2 → 27.8, gap 33.6, mPAP 31.7) | `docs/gates/fu-6.md` §2 "The respiratory suite (RS1–RS15 …)", row RS13 |
| `packages/engine-core/test/engine/resp-suite.test.ts` | RS14 rebreathing FiCO2 8 for 20 min at fixed VCV: PaCO2 and EtCO2 +6–10 — measured +6.7 / EtCO2 +5.99994 with the alveolar washout (+6.1 without it; +5.98 when propofol also does not remove the tonic sympathetic share) | `docs/gates/fu-7.1-b.md` §5 "Records this branch creates" (RS14, Q5); `docs/gates/stage-fu-8b.md` §6 "Exceptions", E-FU8B-7 |
| `packages/engine-core/test/engine/resp-vcv-pmax.test.ts` | healthy breaths untouched: delivered VT within 5 mL of the set 500 — measured 494.3 (band ±5) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/engine/stimulus-surge.test.ts` | awake laryngoscopy raises MAP 20–40 mmHg and HR 12–30 (M10; the sourced awake band) — ΔMAP measured 40.3 with the alveolar washout (38.4 without it) | `docs/gates/fu-7.1-b.md` §5 "Records this branch creates" (case 1 awake ΔMAP, Q9) |
| `packages/engine-core/test/engine/stimulus-surge.test.ts` | 1b: the untreated hypertensive's pressor response is exaggerated: ΔMAP ratio HTN / healthy ≥ 1.3 (Prys-Roberts 1971) — measured 1.19 (HTN +29.8 vs healthy +25.0; earlier 1.19 at +10.8 / +9.1); the resting-tone half is the tonic sympathetic share's | `docs/gates/fu-7.md` §4 "`it.fails` list", #20 |
| `packages/engine-core/test/engine/stimulus-surge.test.ts` | no opioid: ΔMAP 20–30 mmHg (Shribman 1987) — measured +19.1 (+19.3 before the blood/fluids merge) | `docs/gates/fu-7.md` §4 "`it.fails` list", #21 |
| `packages/engine-core/test/engine/stimulus-surge.test.ts` | 3: labetalol 10 mg blunts it — ΔMAP ratio 0.2–0.8 (Inada 1989; DI-08) — measured 0.96 (HR 0.64): the circulating noradrenaline acts through α and the reset set point is reached through the α limb; labetalol 10 mg's α share is small | `docs/gates/fu-7.md` §4 "`it.fails` list", #22 |
| `packages/engine-core/test/engine/stimulus-surge.test.ts` | the bounds: ΔHR ratio ≤ 0.5 and ΔMAP ratio ≤ 0.9 — measured HR 0.56, MAP 1.00 on the gate tree (8454221: 0.58 / 0.98; β-occupancy blunts the HR share only; the MAP share acts through α) | `docs/gates/fu-7.md` §4 "`it.fails` list", #23 |
| `packages/engine-core/test/engine/tension-ptx.test.ts` | decompression at +4 min on PPV: MAP ≥ 65 within 1 min, and the pleural pressure falls with PTX_DRAIN_TAU_S — measured: no MAP at all, the patient is in PEA from +3.87 min, before the decompression (ventilator triggering; MAP ≥ 65 at +5 s without it) | `docs/gates/fu-6.md` §5 "`it.fails` list with numbers (merged tree) and flips" |
| `packages/engine-core/test/l2/blood/acid-base.test.ts` | acute respiratory alkalosis reaches the tables’ 0.2 mmol/L per mmHg (40 → 30) | `docs/gates/stage-7c.md` §5 "`it.fails` records (R45: bands unchanged)", row "acute respiratory alkalosis"; §6 "Deviations" |
| `packages/engine-core/test/l2/blood/core.test.ts` | massive transfusion: iCa −0.1 per unit-per-5-min of rate (tables citrateUnit, Q46) — measured 1.137 vs 1.033 | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)", row `test/l2/blood/core.test.ts` (E-FU9-1) |
| `packages/engine-core/test/l2/blood/core.test.ts` | 2 L 0.9 % saline in 30 min (GA): Cl +6–8 and BE −3 to −5 at 60 min (annex D3) | `docs/gates/stage-7c.md` §5 "`it.fails` records (R45: bands unchanged)", row "7c saline 2 L, core" |
| `packages/engine-core/test/l2/brain/model.test.ts` | check 18: PaCO2 25 → CBF 35–40 % of the anaesthetised baseline (model at CVP 6) | `docs/gates/stage-7d.md` §3 "`it.fails` (R45: no band widened)", row "check 18 hypocapnic CBF (pure model, CVP 6)" |
| `packages/engine-core/test/l2/ecg/rhythms/escape-reset.test.ts` | sinus 30 + a 40/min junctional focus → 40 QRS/min (escape rhythm, AV dissociation) — measured 60 (30 sinus + 30 junctional: the P after each escape captures) | `docs/gates/fu-4.md` §4 "The `it.fails` list"; §1 "What shipped", task 13 (13a) |
| `packages/engine-core/test/l2/ecg/rhythms/escape-reset.test.ts` | never the sum: sinus 30 + a 40/min focus stays below 30 + 40 × ½ (45) QRS/min — measured 60 | `docs/gates/fu-4.md` §4 "The `it.fails` list"; §1 "What shipped", task 13 (13a) |
| `packages/engine-core/test/l2/endo/cat-reserve.test.ts` | 30 min of sustained sympathetic drive (symp 2.5) lowers it below 0.45 — measured 0.485 (0.367 at 60 min) | `docs/gates/fu-7.md` §4 "`it.fails` list", #24 |
| `packages/engine-core/test/l2/gas/co2.test.ts` | low flow: CPR-level output (CO 29 %) holds EtCO2 at 10–20 mmHg over 1–3 min (then the tissue build-up restores it, research 03 §4.4) — measured 26.0 / 21.8 / 20.4 at 1 / 2 / 3 min with τ 70 s | `docs/gates/fu-4.md` §4 "The `it.fails` list" (conflict with the orchestrator's update) |
| `packages/engine-core/test/l2/gas/co2.test.ts` | low flow: arrest (CO 0) < 5 mmHg within 30 s — measured 24.2 at 30 s (4.8 at 150 s) with τ 70 s; superseded by the orchestrator's 2026-09-28 update | `docs/gates/fu-4.md` §4 "The `it.fails` list" (conflict with the orchestrator's update) |
| `packages/engine-core/test/l2/lung/volumes.test.ts` | COPD GOLD 1 (severity 0.25): FEV1 ≥ 80 % pred with FEV1/FVC < 0.70 — measured 71 % (the catalogue's GOLD 1 rawExp 1.5) | `docs/gates/stage-7k.md` §5 "`it.fails` added by 7k (R45)" (Q-7k-2) |
| `packages/engine-core/test/l2/neuro/depth-drive.test.ts` | synergy: propofol 1 + remifentanil 1 depresses more than the product of each — measured equal at α 0 (D15b: totalDep 0.735 both vs 0.735 independent; was met at SYNERGY 0.5 and at α 0.3) | `docs/gates/fu-7.md` §4 "`it.fails` list", #38 |
| `packages/engine-core/test/l2/neuro/depth-drive.test.ts` | 1 MAC volatile lowers non-depolariser EC50 by ~33 % (0.62–0.72, tables §5d) — measured × 0.847, −15 % (VOL_NMB_K 0.18, was met at × 0.667) | `docs/gates/fu-7.md` §4 "`it.fails` list", #40 |
| `packages/engine-core/test/l2/neuro/interactions.test.ts` | 1 MAC volatile: EC50 × 0.67 (tables §5d) — measured × 0.847 (VOL_NMB_K 0.18, was met at × 0.667) | `docs/gates/fu-7.md` §4 "`it.fails` list", #39 |
| `packages/engine-core/test/l2/neuro/interactions.test.ts` | 1 MAC volatile: rocuronium duration +20–45 % (this rig +13.4 %; engine cell DI-51 +48.4 % on the gate tree — the plan's third fixer measured +52.2 % — band 25–80 %) | `docs/gates/fu-7.md` §4 "`it.fails` list", #25 |
| `packages/engine-core/test/l2/neuro/reversal.test.ts` | underdosed sugammadex (0.5 mg/kg at PTC after rocuronium 1.2) → recovery then recurarisation (TOFR falls ≥ 0.04) — capacity-limited: measured peak 0.833 at +90 min (ideal-binder ceiling 0.834), no fall | `docs/gates/fu-3.md` §1 "What shipped", item 2 (capacity-limited) and §7 "Test counts"; `docs/gates/stage-7e.md` "Expected failures (`it.fails`)" |
| `packages/engine-core/test/l2/pk/antiarrhythmic.test.ts` | a sub-therapeutic lidocaine level (0.3 µg/mL) never converts VT in 200 seeded runs of its 20 min window — measured 3/200 (1.5 %; u 0.09 × λ_lido) | `docs/gates/fu-7.md` §4 "`it.fails` list", #26 |
| `packages/engine-core/test/l2/pk/flow-distribution.test.ts` | S6b: 30 % haemorrhage (CO 3.1 vs 5.25) → propofol 2 mg/kg peak Ce ≥ 1.3× healthy — measured 1.29 (q 0.6, V1 share 0.5 [ENG]) | `docs/gates/fu-4.md` §4 "The `it.fails` list" |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | sugammadex (DI-45): 4 mg/kg gives < 5 % HR fall — measured 13.4 % (16 mg/kg 20.5 %) | `docs/gates/fu-7.md` §4 "`it.fails` list", #27 |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | second gas: 66 % N2O raises sevoflurane 2 %'s FA/FI at 5 min by +0.03 to +0.15 (Epstein 1964; M10 ch. 19); N2O's own FA/FI is unchanged (a one-way term) — measured +0.021 (0.713 → 0.733), N2O unchanged | `docs/gates/fu-7.md` §4 "`it.fails` list", #28 |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | concentration effect: 66 % N2O reaches a higher FA/FI at 5 min than 30 % N2O — measured 0.810 both (not modelled in v1) | `docs/gates/fu-7.md` §4 "`it.fails` list", #29 |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | a desflurane dial step 3 → 12 % at FGF 4 fires the surge within 60 s (the END-TIDAL trigger; DI-70: brain MAC never fired it) — measured: never within 5 min (end-tidal MAC 1.03 at +3 min, 60 s rise ≈ 0.16 < 0.3) | `docs/gates/fu-7.md` §4 "`it.fails` list", #30 |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | morphine 10 mg publishes histamine ≥ 0.4 at its peak — measured 0.32 (row emax 0.6 at ec50 1 reference dose, unchanged) | `docs/gates/fu-7.md` §4 "`it.fails` list", #31 |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | dexmedetomidine, the α2B arm: a fast load raises SVR early (5–10 min) and the rise then decays (DI-60; T6.3) — measured SVR × 0.994 at most | `docs/gates/fu-7.md` §4 "`it.fails` list", #32 |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | nitroprusside 1 µg/kg/min lowers SVR 30–50 % — measured −29.9999 % at 10 min (the steady state is the band edge −30 %) | `docs/gates/fu-7.md` §4 "`it.fails` list", #33 |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | esmolol 0.5 mg/kg: its direct HR multiplier falls 10–20 % at the peak (DI-07's band; T6.2) — measured 6.5 % (ec50 150; 4.2 % at 250) | `docs/gates/fu-7.md` §4 "`it.fails` list", #34 |
| `packages/engine-core/test/l2/pk/interactions-misc.test.ts` | diabetic dexamethasone peak +2–4 mmol/L at 4–8 h (PADDI): measured +1.83; non-diabetic +1.02 | `docs/gates/fu-7.md` §4 "`it.fails` list", #35 |
| `packages/engine-core/test/l2/renal/filtration.test.ts` | IAP 25: UOP < 0.1 mL/kg/h (WSACS) — measured 0.69 (the circulation half is left to the circulation) | `docs/gates/fu-9.md` §4 "`it.fails` (all with the merged-tree numbers in their titles)" |
| `packages/engine-core/test/l2/temp/temp.test.ts` | GA: the hour-8 plateau stays at or above 34.5 °C — measured 34.37 | `docs/gates/stage-fu-10.md` §3 "Acceptance numbers, before (base) → after", row A3 "hour-8 plateau" (E-FU10-3b) |
| `packages/engine-core/test/l2/temp/temp.test.ts` | MH: once established the core rises ≥ 1 °C per 15 min (tables §7 check 21) — measured +0.35 °C in minutes 30 → 45 (E131: heat from the O2 consumed) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/l2/thermal/heat.test.ts` | MH (severity 1): +1 °C per 5–15 min once established (tables §7 check 21) — measured +0.18 °C in minutes 20 → 30 (E131: heat from the O2 consumed) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/engine-core/test/l2/thermal/heat.test.ts` | MH (severity 1): after dantrolene at 20 min the core is ≥ 0.3 °C below its peak 60 min later — measured 0.13 °C (peak 36.63 at +7 min; E131) | `CHANGELOG.md` [Unreleased] E131 (the PR "one muscle metabolic rate for MH … (E131)") |
| `packages/ventilator/test/link-r27.test.ts` | ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5 (measured +2.0 / 0.0 on the lungs) | `docs/gates/stage-v1.md` §7 "`it.fails`" (Decision 18) |
| `packages/ventilator/test/link-r27.test.ts` | FiO2 0.4: SpO2 rises ≥ 2 (measured SpO2 98 → 98, SaO2 98.7 → 99.1: the lung oedema shunt does not desaturate) | `docs/gates/stage-v1.md` §7 "`it.fails`" (Decision 18) |
| `packages/ventilator/test/link-parity.test.ts` | bronchospasm 1 at 20 min — measured at 30 min PaCO2 59.2 vs 39.6, VT 238 vs 476 (band 3 mmHg / 10 %): gas within 3 mmHg / 3 mmHg / 2 %, Pplat and delivered VT within 10 % (Ppeak logged — the two paths' inspiratory flows differ) | `docs/gates/fu-6.md` §2, row RS15 link parity; target audit row 110 (docs/validation/target-audit/30-target-audit.md#row-110) |
| `packages/ventilator/test/link-r27.test.ts` | room air (FiO2 0.21): SpO2 rises ≥ 2 (measured SpO2 94.0 → 95.0, SaO2 94.9 → 95.5: shunt 0.15 → 0.10 moves SpO2 by 1) | `docs/gates/stage-v1.md` §7 "`it.fails`" (Decision 18) |
| `packages/ventilator/test/pleural.test.ts` | reference run: Ppeak rises 10–20 cmH2O over the normal row (measured +21.6: 45.4 vs 23.8) | `docs/gates/stage-v1.md` §7 "`it.fails`" (Decision 16) |

## Tests not run (`it.skip`, `test.skip`, `.todo`)

Behaviour that has a test title but no running test yet: each is a known gap, not a pass.

| Test file | What is not tested yet (test title, verbatim) | Tracked in |
|---|---|---|
| `packages/engine-core/test/l2/circ/lvad.test.ts` | VA-ECMO pulsatility fades with flow fraction (tables §8.5) — awaits the bypass-device model | Not tracked: no stage owns ECMO and the 'Stage 7h' in the title does not exist; VA-ECMO pulsatility versus flow fraction is untested (the LVAD/VA-ECMO interface came with `docs/gates/stage-7a.md`). |

## Lung-condition signatures outside their band (allow-list, not `it.fails`)

`packages/engine-core/test/l2/lung/signatures.test.ts` keeps a `KNOWN` list of 11 bands the model misses; a new
miss fails the test, a listed one does not. Measured vs band: asthma PaEt gap 6.3 vs 20–50; obesity PaEt gap 3.3
vs 5–8 and shunt 0.05 vs 0.10–0.15; pneumonia SpO2 at FiO2 0.4 96.8 vs 88–93; atelectasis shunt 0.16 vs
0.10–0.12; simple pneumothorax shunt 0.12 vs 0.07; one-lung ventilation Crs 33.9 vs 25–30 and shunt 0.14 vs
0.2–0.3; endobronchial intubation Crs 34.0 vs 27.5–30.3; cystic fibrosis SpO2 at FiO2 0.21 95.4 vs 88–94; neonatal
RDS shunt 0.16 vs 0.2–0.4. Tracked in: the file's own `KNOWN` comment (the calibration pass decides); no gate note.

## Browser tests skipped on CI WebKit only

Conditional skips are not listed by `scripts/deviations.ts` (by design), but these five were added to keep CI green on
the 2-vCPU Linux WebKit runner and each names a finding; they pass on macOS WebKit and on CI Chromium, which still run
them. Real Safari is covered only by the owner's hand checks named below, and **every one of those hand checks is
PENDING-OWNER: not verified** at the time of writing (`docs/RESUME.md`, "Pending with the owner"). Line numbers are this
tree's (`grep -n "webkit' && !!process.env.CI" apps/demo/e2e/*.ts`).

| Skip | What is skipped | Finding named in the skip | Real-Safari cover (hand check, PENDING-OWNER) |
|---|---|---|---|
| `apps/demo/e2e/learner-monitor-follows.e2e.ts:16` | the whole file (3 tests: the second-screen learner monitor follows commands, a restore and a restart; follows while the Ventilator view drives; wears the instructor's monitor style) | F-49-2: BroadcastChannel drops messages in one direction between pages on Playwright Linux WebKit; F-49-1: follower exactness at ×4 also fails there (FALLBACK ruling 2026-10-11; `docs/gates/stage-12.md` §0 "Formal gate on a075fd39") | **H20**: the second screen in real Safari follows within 5 s (`docs/RESUME.md`; `docs/showcase/SHOWCASE-2-RUN-SHEET.md`) |
| `apps/demo/e2e/time-control.e2e.ts:14` | the whole file (×8 and a 5-minute fast-forward from the instructor view, at :30; the ×8 rate / frame time / fast-forward pace measurement, at :147) | S10-F5: the runner holds about ×5.3, not ×8; a fast-forward from the Ventilator view once went unanswered (FX-2b, with F-49-1) (FALLBACK ruling 2026-10-12; `docs/gates/stage-10.md` §12) | **H18**: the fast-forward look in real Safari (`docs/gates/stage-10.md` §12; `docs/RESUME.md`) |
| `apps/demo/e2e/mobile-learner.e2e.ts:97` | one test, at :91: the QR sheet, then a phone follows in the instructor's style through ×4, ×8, a style change, a pause and a 2-minute fast-forward that another phone joins | FX-2: the runner cannot hold an instructor, a phone and the relay in step (runs 38205878761, 38211190394; PR #61 description) | **H17**: the owner's own phone through the six cards (`docs/gates/stage-12-real-phone.md`; `docs/gates/stage-12.md` §4, PENDING-OWNER) |
| `apps/demo/e2e/mobile-learner.e2e.ts:171` | one test, at :170: while the Ventilator view drives the patient the phone holds; it follows again with the next patient | S12-F1: the hidden cockpit iframe is throttled on CI Linux WebKit, so the hold ends (FALLBACK ruling 2026-10-12, PR #57 run 38194080645; `docs/gates/stage-12.md` §6) | **H21**: bronchospasm with the Ventilator view, then the Monitor view for 30 s, with a phone following (`docs/gates/stage-12-real-phone.md` "Hand check H21") Open: if real Safari also throttles the hidden cockpit, the Ventilator view stops ventilating the patient while another view is shown (`docs/gates/stage-12.md` §0, 'Open beyond this PR'). |
| `apps/demo/e2e/vent-view-restore.e2e.ts:43` | one test, at :42: after "Return here" on the Ventilator view the replayed minute matches the first one | F-FX1-1: CI Linux WebKit page crash after "Return here" in this ×4 Ventilator-view flow; class: Linux WebKit (WPE, Playwright webkit 2359) web-process crash: ThreadedCompositor segfault at libWPEWebKit-2.0.so.1.12.0+0x60a0f8a (one SIGILL at +0x613a168); covered by retries (3–7 of 18 runs; PR #58 runs 38212560444, 38214428810, and before FX-1 run 38203086536, as the test's comment records; FX-1 is in `docs/RESUME.md`, "Fixer round") | no dedicated hand check: the flow runs on local macOS WebKit and CI Chromium; F-FX1-1 itself is open |

Also not run on any WebKit (`test.skip(browserName === 'webkit', …)`): heavy evidence and screenshot runs, plus these behaviour tests: `physiology-console.e2e.ts:40`, `device-layer-page.e2e.ts:118` (audio clock), `vent-link.e2e.ts:48`, `vent-embed.e2e.ts:53`, `arrest-evidence-page.e2e.ts:20`, `endocrine-thermal-page.e2e.ts:24`, `controller-pages.e2e.ts:55` (WebRTC), `app-instructor-tasks.e2e.ts:25`. The Pulse-oracle unit suites run only when `PME_PULSE_DIR` is set, never in CI; the oracle numbers come from `pnpm validate`.

## Browser tests that passed only on a retry

These end-to-end tests passed only on a retry in CI between 2026-10-11 and 2026-10-18. Scope: **main and release-PR
runs; eight further tests flaked only on feature-branch runs and are tracked in the clean-up stage's list.** The counts
in each row are over all 99 `ci` runs of the window (main and pull-request branches): "Retry" = runs in which the test
passed only on a retry, "3/3" = runs in which all three attempts failed, "Runs" = runs in which it ran on that browser.
They are flaky, not band misses. Class: **capacity** = a timing or speed reading on the loaded 2-vCPU runner;
**timing** = a fixed wait or poll too short for that runner; **crash** = the WebKit page or browser closed under the
test; **unknown** = the log shows no runner cause. Read any run with `gh run view <id> --log` (step "e2e tests that
passed only on retry", or the Playwright "flaky" summary before 2026-10-12). They are left for the clean-up after this
release.

**Quarantine on CI WebKit (since 2026-10-24, PR `ci-stabilise`).** The tests tagged `@known-flaky` (the tagged rows of
`docs/gates/stage-14/known-flaky.tsv`; 37 on WebKit) run on WebKit only in the non-blocking job `e2e-quarantine
(webkit)`; the gating `e2e (webkit)` job runs every other test. The quarantine's report is still uploaded and its job
summary gives the pass / retry-only / failed-all-attempts counts, with each retried or failed test named. **CI Chromium
still runs every test, enforced.** Reason: under load the tagged WebKit tests failed 3/3 several times a day and their
retries filled the hour: run 39980675959 hit the 60-min timeout with seven of them at 3/3; runs 39965767381 and
40062046742 passed with tagged tests passing only on a retry. Details and the end condition: `docs/gates/stage-14.md`,
"The known-flaky WebKit quarantine". No test was changed.

| Test (file:line) | Test title | Browser | Retry | 3/3 | Runs | Class | First / last run | Note |
|---|---|---|---|---|---|---|---|---|
| `scenario-choose-another.e2e.ts:14` | the scenario library opened before the first repaint stays open until a scenario is loaded | WebKit | 37 |  | 45 | unknown | 38194080645 / 39084185298 | fails the first attempt and passes the retry: near-deterministic; 11 of 13 main runs through 39067903552 (12 of 14 counting 39082091200). The regression test for a fixed product defect (`docs/gates/ci-webkit-3.md` "(c) findings"), so the fix is not confirmed on slow WebKit |
| `showcase-clock.e2e.ts:19` | loading another scenario restarts the session clock and the time in state, which then count up | WebKit | 15 | 1 | 76 | capacity | 38097625873 / 39083174976 |  |
| `showcase-clock.e2e.ts:19` | loading another scenario restarts the session clock and the time in state, which then count up | Chromium | 3 |  | 75 | unknown | 38106008764 / 38176710973 | the scenario library defect fixed in FX-7; none after 2026-10-11 |
| `vent-view-new-patient.e2e.ts:16` | the cockpit is unloaded by a new patient and reloads fresh on the next visit (or at once when shown) | WebKit | 11 | 4 | 76 | timing | 38097625873 / 39082091200 | 3/3 incl. main 38097625873 |
| `return-here-restore.e2e.ts:15` | Return here: the clock, the trends and the waveforms go back with the patient | WebKit | 10 |  | 76 | capacity | 38110530561 / 39067799627 |  |
| `app-one-session.e2e.ts:15` | every view shares the one engine session | WebKit | 9 |  | 76 | unknown | 38161262512 / 39082213337 | **under investigation (FX-11)**: since PR #55 the failure is "sim time went back … the engine restarted" (0.1–0.4 s back; 5 runs, incl. main 39082091200 and this release PR's 39082213337) — not a runner-speed reading |
| `explore-baseline.e2e.ts:23` | a bookmark restore to before the baseline drops it; it is taken again at 1 minute | WebKit | 7 | 1 | 76 | timing | 38100631999 / 38381261724 | at :31 on this tree (CI reported :23 before PR #55); 3/3 in main 38172300684 |
| `organs-page.e2e.ts:36` | organs page: check 19 starts, the ICP tile shows a rising ICP, no page errors | WebKit | 7 |  | 76 | crash | 38107292797 / 39082091200 |  |
| `iife-transports-snapshot.e2e.ts:24` | MonitorHandle snapshot/restore/role (worker: auto) | WebKit | 6 | 2 | 76 | capacity | 38100631999 / 38182829101 | none after 2026-10-11 |
| `debrief.e2e.ts:48` | a showcase run ends in a debrief that prints (timeline, facts, objectives) | WebKit | 5 | 1 | 35 | timing | 38208532262 / 39082572086 | 3/3 in 38208532262; at :24 before the 2026-10-21 change below |
| `debrief.e2e.ts:24` | a showcase run ends in a debrief that prints (timeline, facts, objectives) | Chromium | 1 |  | 33 | unknown | 38386662185 / 38386662185 |  |
| `time-control.e2e.ts:30` | ×8 and a 5-minute fast-forward from the instructor view: paced panel everywhere, sound muted, cue, banner, log, trends | Chromium | 4 |  | 46 | capacity | 38193355147 / 38212119356 | the file is skipped on CI WebKit (above) |
| `app-accessibility.e2e.ts:15` | accessibility: iPad portrait 820×1180 | WebKit | 4 |  | 76 | crash | 38145499655 / 39067888843 | the laptop case never failed |
| `app-one-session.e2e.ts:53` | learner controls: off by default, switched on per scenario, logged as learner actions | WebKit | 4 |  | 76 | timing | 38135947061 / 39067635795 | CI reported :43 before the file moved |
| `validation-bedside.e2e.ts:19` | asystole demo measures the saadat-like delay; results download | WebKit | 3 |  | 76 | timing | 38161262512 / 38381261724 |  |
| `explore-baseline.e2e.ts:14` | Explore compares with the 1-minute baseline although it was opened later | WebKit | 2 |  | 76 | timing | 38106008764 / 38161262512 | at :22 on this tree |
| `scenario-panel-stale-press.e2e.ts:18` | a card button drawn for the previous state acts on the current one, or says why not | WebKit | 2 |  | 54 | timing | 39063479453 / 39065636299 |  |
| `alarm-off-label.e2e.ts:15` | the top-bar alarm count says which alarms are off, and Sound stays reachable in a narrow window | WebKit | 1 |  | 76 | unknown | 38215998313 / 38215998313 |  |
| `mobile-learner.e2e.ts:193` | a relay restart, a full session and a relay the phone cannot reach | WebKit | 1 |  | 42 | timing | 38386662185 / 38386662185 |  |
| `vent-embed.e2e.ts:34` | vent embed: loads from file:// with no errors; the ventilator breathes and the monitor counts its breaths | WebKit | 1 | 1 | 7 | timing | 39066929916 / 39084185298 | release PR only. The awRR poll read 13 (or 15) instead of 14 for its whole 30 s on the starved runner; after the test's timeout was raised to the 120 s its own waits need, it still failed all three attempts in 39084185298 (awRR 13). It passed first time in 39068579366 and 39076653954 |
| `vent-link.e2e.ts:29` | vent-hamilton.html: breathes, Modes → PCV+ → Confirm, a knob turns PEEP | WebKit | 1 |  | 75 | timing | 38386662185 / 38386662185 |  |
| `respiratory-evidence-page.e2e.ts:30` | respiratory-evidence page: the bronchospasm demo runs, EtCO2 shows, no page errors | WebKit | 1 |  | 76 | crash | 38216030108 / 38216030108 | in this window on a feature-branch run only; on main in 38092760192 (2026-10-10) |
| `vent-view-restore.e2e.ts:42` | after "Return here" on the Ventilator view the replayed minute matches the first one | Chromium | 2 |  |  | capacity | 38377803966 / 39065636299 | **tagged known-flaky** (orchestrator ruling 2026-10-18): 2 retry-passes after FX-1, main 38377803966 and 39065636299; replayed minute differed (SpO2 |Δ| 5 > 3). Skipped on CI WebKit (above) |
| `vent-view-speed.e2e.ts:14` | the Ventilator view takes a speed change made after it opened | WebKit | 6 |  |  | unknown | 38114676150 / 38227924181 | none since FX-1 merged (run 38240122427) |

## Browser tests held on the loaded CI WebKit runner (2026-10-21)

These failed all three attempts of the CI WebKit leg (Playwright Linux WebKit on the shared 4-vCPU runner) with no
product change between attempts, while CI Chromium passed every test on the same commits without a retry. They are not
skipped: on CI WebKit only, the Debrief's two live runs go at ×2 instead of ×4 (S10-F5: the runner holds about ×5.3),
their waits are on the page's own clock or scaled to the speed, and the Debrief opens only once the host has
acknowledged a pause — the session bar's button reads "Resume" as soon as it is pressed, before the host answers; the
click is then checked to have been followed (`#/debrief`) and the heading to be drawn, each within 30 s. FX-25 judges its
two times on the page's sim clock. Every assertion is kept; local WebKit and Chromium run as before. Read a run with
`gh run view <id> --attempt <n> --log`; the failure lines are those of the tree the run tested.

| Test (file:line, this tree) | Run (attempt): what failed | What changed |
|---|---|---|
| `debrief.e2e.ts:48` (showcase run) | PR #97 run 39338820903 (attempts 1 and 2, 2026-10-19/20): the Return not landed within 5 s (sim time 88.0, 89.0, 98.0 against < 20, :33) in three tries; the Debrief heading absent 5 s after the click (:46); "00:0x Patient Ventilated breaths began" missing (:59); the retry's "01:0x Scenario state: Anaphylaxis" missing (:55) | ×2, the waits scaled; the 24 s after the epinephrine on the page's sim clock; paused and acknowledged before the Debrief opens |
| `debrief.e2e.ts:48` (showcase run) | PR #105 run 39534643448 (attempt 1): the retry's state not at 01:0x (:55); the Return not landed (89.0, :33); the reaction's button not back within 40 s (:36). Attempt 2 passed on a retry | as above |
| `debrief.e2e.ts:48` (showcase run) | PR #107 run 39578631031 (attempt 2): the Return not landed (37, :33); "01:0x … Anaphylaxis — undone by return 1" missing (:53); "Ventilated breaths began" missing (:59) | as above |
| `debrief.e2e.ts:207` (free run) | PR #105 run 39524573921 (attempt 1): the Debrief heading not found 5 s after the click (:188), twice, then passed on the second retry; PR #107 run 39578631031 (attempts 1 and 3): the same, three times each. The page snapshot at the failure shows the Instructor view still up, the clock at 02:50 and the button reading "Resume": the click had not been followed | ×2 to 3 sim-min on the page's clock; the host's pause awaited; the route, then the heading, within 30 s |
| `fx25-co2-attach.e2e.ts:74` | PR #107 run 39578631031 (attempt 2): "the capnogram is drawn right of the attach point within 2 s" false in three tries — the first capture came at +2.50–3.15 s with 43–52 inked columns, so the trace had begun ≈ 0.8–1.2 s after the click; attempt 3 the same once (first capture +3.13 s), then passed on a retry. Main run 39539902747 (attempt 1) failed once on a WebKit page crash (F-FX1-1 class), which this change does not address | the 2 s and 4 s bounds judged on the page's sim time since the click, each column dated back from the newest at the fastest sweep the test allows (25 px/s), against a clock read after the capture |

## Browser-test evidence and standing rules of the rc.3 week (2026-10-20 / 21)

One row each, with the pull request that answered it. The fixes are in the tests, not the product, unless the row says
otherwise; no assertion was removed and no band was loosened. Read a run with `gh run view <id> --attempt <n> --log`.

| Date | Item | Evidence | What changed, or the rule |
|---|---|---|---|
| 2026-10-21 | FX-24 follower e2e (`fx24-follower-after-fast-forward.e2e.ts`), CI WebKit: PR #106 | Main `cd9195f8` run 39526534572, attempt 2: 3/3 failures, the joining phone drew only "II  X1  NORMAL" where the first phone's "II  X0.25  NORMAL" was expected, and the frame floor failed (50 frames in 5 s against > 100). In all 7 failed attempts the phone drew 50–137 frames in 5 s (≈ 10–27 fps; the Mac draws ≈ 296). The auto-gain judges on the phone's own sim time, which lags the wall clock on a starved runner; the test waited 5.5 s of wall time. No equal-lane assumption in the e2e | The gain change must come within 6 s of the phone's sim time (4-s judging window + 2-s check interval), waited up to 15 s; each cursor window runs at least 5 s and until it holds 100 frames. The > 100 frame count and the ≤ 1 off-cursor limit are unchanged. First CI measurement: the switch 4.33 sim s after joining (PR #106 run 39534732591). Merged 2026-10-21 (`9f8d4aa4`) |
| 2026-10-21 | Debrief e2e (`debrief.e2e.ts`, the showcase run and the free run) and FX-25 e2e, CI WebKit: PR #108 | Listed in "Browser tests held on the loaded CI WebKit runner" above (PR #97, #105 and #107 runs, 3/3 on CI WebKit; Chromium passed every test). Finding: the old wait for the pause read the button, which says "Resume" before the host answers | On CI WebKit only: the showcase run at ×2, with its waits scaled; the pause confirmed by the host before the Debrief click; the route (`#/debrief`), then the heading, each within 30 s; FX-25's 2-s and 4-s bounds judged on the page's sim time. Merged 2026-10-21 (`e8c9e6dd`) |
| 2026-10-21 | Debrief B print-font check, Chromium: PR #109 | Main `e8c9e6dd` run 39598457184, `e2e (chromium)`: "Debrief B on the MH card" passed only on a retry; attempt 1 read "the bundled print font is loaded" as false 2.6 s in. The Debrief view starts loading the print font on opening and nothing in the test waited for it (a `document.fonts` race, from PR #102) | `printFontLoaded(page)` waits up to 10 s for the view's own font load before the print measurements in both Debrief B tests; the test never loads the font itself. Local Chromium ×5 with retries off: 25/25. Merged 2026-10-21 (`4f7f3423`) |
| 2026-10-21 | `vent-view-new-patient.e2e.ts:16`, tagged `@known-flaky`, CI WebKit | Main `cd9195f8` run 39526534572, attempt 1: 3/3 at line 31, the last "fresh cockpit at once" poll (each attempt ≈ 14 s); attempt 2 passed it first time. Already 3/3 in 4 of 76 runs between 2026-10-11 and 10-18, before PR-G; local macOS WebKit 30/30 (`cd9195f8` and `d31de029`, with and without `CI=1`). Mechanism not found: three fresh workers each spent the full 10 s, which reads as stuck, not slow | PR #106: the poll now returns the cockpit's state, so the next failure names it; the claim and the 10-s time-out are unchanged. The tag stays (`docs/gates/stage-14/known-flaky.tsv`) |
| 2026-10-18, in force | "A retry is not a pass" | Orchestrator ruling of 2026-10-18 (PR #83; `docs/gates/stage-14.md`, "Temporary relaxation") | Enforced on Chromium: an untagged test that passes only on a retry fails the job. Warn-only on WebKit: it gives a `::warning` and the job stays green. This holds until the demo of 28 October 2026; then the WebKit leg fails again. Since 2026-10-24 the `@known-flaky` tests run on WebKit in the non-blocking `e2e-quarantine (webkit)` job ("Browser tests that passed only on a retry", above) |
| 2026-10-21 | A hidden browser tab pauses the simulation (product behaviour) | Owner ruling E82, 2026-10-21. Safari suspends a hidden tab after about 4 minutes (FX-14 / FX-15) | The instructor's page pauses the session while its tab is hidden and resumes it on return, with a toast giving the paused time; the hidden minutes are not simulated. Kept for the demo. The proper fix (credit the hidden time, or keep the host running in the background) is for a later release. The switch is `HIDDEN_TAB_POLICY` in `apps/demo/src/app/hidden-tab.ts` |

## Validation harness: rows outside their band

From [`docs/validation/report.md`](../validation/report.md), regenerated by `pnpm validate --seeds 11,12` on 2026-10-18 on
commit `3db25a3b`, the v1.0.0-rc.1 tag (engine 1.0.0-rc.1; the 2026-10-17 run on `e737de92` gave the same counts): 🟢 96 · 🟡 33 · 🔴 27; one document not measurable
(`t22-term-spinal`: the neuraxial event is not implemented). Every red and yellow row is in the
[calibration queue](../validation/calibration-queue.md) (60 rows) for the calibration pass (R44); no band was changed
to make a row pass (R45). The numbers below are copied from the queue.

Groups, in short:
- **Arterial timing and shape** (morphology): R → radial upstroke ≈ 100 ms against 145–190 ms recorded; dicrotic notch
  270–284 ms against 428–518 ms; PPG ↔ ABP shape correlation 0.4 against 0.9.
- **Heart rate in the scripted documents (a harness defect, not a physiology result; fixed 2026-10-27, the report
  not yet regenerated):** in this report 10 segment rows read exactly 75.0 bpm (s1 phenylephrine, s2, s3, s4 classes
  I/III/IV, t16 warm sepsis, t17a, t17b, t19 Cushing); 8 of them are outside their band. The cause: the validation
  documents sent a baseline heart rate as `setTarget hr`, which MODELED treats as an instructor-held rate, so the
  reflex could not move it (`docs/gates/fu-3.md` §2, Q-FU3-9a). The Pulse oracle's haemorrhage HR rise (0 here) had
  the same cause. The fix: MODELED documents and the oracle's MODELED scenarios send no baseline rate (MANUAL keeps
  it). Re-measured on main `458903cc` with the fix (suites sanity, gates, regression, determinism, oracle; morphology
  needs the dataset cache and was not re-run): s4 class III HR 104 (band 120–140), class IV 127 (140–180), t16 87
  (115–130) and t17a 94 (120–140) are yellow, no longer red; s1's reflex fall (57) and t19's Cushing rate (53) are
  inside their bands; s2 81 (100–120) and t17b 64 (80–95) stay yellow. Freed, two rows moved the other way: t17b SBP
  104 against 65–80 (red; it was 101, yellow) and t10's phenylephrine rescue MAP 69 against > 85 (yellow; it was
  99). The oracle reads a haemorrhage HR rise of +13.5 against Pulse's +47.7 (still red) and a propofol MAP fall of
  26.9 against 27.9 (green; it was red). Outside the harness the reflex raises the rate further (HR 139 at 8:00 in the
  showcase haemorrhage run; 69.6 → 149 in an awake 50 % bleed, `cardiac-reflexes-audit.md` §5.1). The tables below
  are the report's until it is regenerated.
- **Breathing back after sugammadex (t25, 0 s against 60–240 s):** the document has been ventilated from induction
  since FU-4, and the ventilator is stopped at the moment of sugammadex. Measured on main `458903cc`: the first
  spontaneous breath comes at that moment (221 mL; effort 1.0 within 0.1 s, 311 mL at +8.6 s), so the 0 s means the
  effort was already back under the ventilator, 29 min after rocuronium 0.6 mg/kg. The evidence audit predicts exactly
  that and judges the band mis-specified (target audit row 16: the first effort returns 12–24 min after rocuronium,
  before any reversal); the row stays as it is until the owner rules on the restated target.
- **Haemorrhage, what is measured:** the systemic vascular resistance rises as the patient bleeds (+659 at 8:00 in
  the showcase kit's haemorrhage run, `docs/showcase/SHOWCASE-2-MEASUREMENTS.md`; 1,205 → 2,112 in an awake 50 %
  bleed, `docs/roadmap/v2.0/evidence/cardiac-reflexes-audit.md` F3). The reflex does not decompensate: in that awake
  50 % bleed the heart rate peaks at 149 and then falls to 88 as the baroreflex set point resets, and MAP recovers
  from 59.6 to 62.6 while lactate reaches 7.6 mmol/L (F1); there is no bradycardic phase in any arm (F2). The
  heart-rate bands for the haemorrhage classes copy the 2008 ATLS teaching table; an evidence audit of the test
  targets ([its report](../validation/target-audit/30-target-audit.md)) found them mis-specified: registry data give
  heart rates of about 86–97 across classes I–IV, and a relative bradycardia appears beyond about 30 % loss. The
  bands stay unchanged until they are re-based with their sources (no band is loosened to pass).
- **Waveform regression:** pleth and CO2 shapes moved from the Stage 8a baselines with the later physiology; the
  baselines were not re-recorded for this release.
- **Pulse oracle:** haemorrhage MAP fall 5 against 16 mmHg; MAP fall after propofol 19 against 28 mmHg.

**Red (gating) rows**

| | Suite | Row | Measured | Expected | Source |
|---|---|---|---|---|---|
| 🔴 | morphology | V1 · HR 50–70 | engine 104 vs recorded 190 | 170–210 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] |
| 🔴 | morphology | V1-lit · all | engine 102 vs recorded 167 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms |
| 🔴 | morphology | V1-lit · vitaldb | engine 103 vs recorded 172 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms |
| 🔴 | morphology | V1-lit · mghdb | engine 95.1 vs recorded 145 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms |
| 🔴 | morphology | V2 · HR 90–110 | engine 270 vs recorded 428 | 408–448 | brief §9 V2: ±20 ms |
| 🔴 | morphology | V2 · HR 70–90 | engine 282 vs recorded 484 | 464–504 | brief §9 V2: ±20 ms |
| 🔴 | morphology | V2 · HR 50–70 | engine 284 vs recorded 518 | 498–538 | brief §9 V2: ±20 ms |
| 🔴 | morphology | V3-shape · all | engine 0.4 vs recorded 0.9 | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] |
| 🔴 | morphology | V3-shape · vitaldb | engine 0.4 vs recorded 0.9 | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] |
| 🔴 | morphology | V3-shape · mghdb | engine 0.5 vs recorded — | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] |
| 🔴 | oracle | O2/hr-delta | ours 0.00 · Pulse 47.70 | ±20 % of Pulse | 100.0 % |
| 🔴 | oracle | O2/map-delta | ours -4.96 · Pulse -16.34 | ±20 % of Pulse | 69.6 % |
| 🔴 | oracle | O4/map-delta | ours -18.93 · Pulse -27.91 | ±15 % of Pulse | 32.2 % |
| 🔴 | regression | sinus-75/pleth | 625/625 samples > 2 % | all samples within 2 % | R40 (audit N-P02) |
| 🔴 | regression | sinus-75/co2 | 230/313 samples > 2 % | all samples within 2 % | R40 (audit N-P02) |
| 🔴 | regression | afib-110/pleth | 625/625 samples > 2 % | all samples within 2 % | R40 (audit N-P02) |
| 🔴 | regression | bronchospasm/co2 | 234/313 samples > 2 % | all samples within 2 % | R40 (audit N-P02) |
| 🔴 | regression | hypovolaemia-ppv/pleth | 625/625 samples > 2 % | all samples within 2 % | R40 (audit N-P02) |
| 🔴 | segments | s4-class-iii/late/hr | 75.0 | 120–140 | brief §4.9 4 / ATLS class III: HR 120–140 |
| 🔴 | segments | s4-class-iv/late/hr | 75.0 | 140–180 | brief §4.9 4 / ATLS class IV: HR 140–180 |
| 🔴 | segments | s9-witnessed-vf/arrest/etco2-gone | 83.0 | 0.00–30.0 | Stage 3: EtCO2 < 5 within 30 s |
| 🔴 | segments | t15-rv-infarct/rest/cvp | 6.9 | 14.0–18.0 | tables §7 15: CVP 14–18 |
| 🔴 | segments | t15-rv-infarct/rest/pawp | 3.3 | 8.00–12.0 | tables §7 15: PCWP 8–12 |
| 🔴 | segments | t16-septic-shock-warm/warm/map | 86.7 | 55.0–60.0 | tables §7 16: MAP 55–60 |
| 🔴 | segments | t16-septic-shock-warm/warm/hr | 75.0 | 115–130 | tables §7 16: HR 115–130 |
| 🔴 | segments | t17a-class3-no-bb/late/hr | 75.0 | 120–140 | tables §7 17a: HR 120–140 |
| 🔴 | segments | t25-rocuronium-sugammadex/recovery/rr-back | 0.0 | 60.0–240 | tables §7 25: spontaneous effort returns within ≈ 2.2 min of sugammadex [ENG] |

**Yellow rows**

| | Suite | Row | Measured | Expected | Source |
|---|---|---|---|---|---|
| 🟡 | morphology | V1 · HR other | engine 94.5 vs recorded 150 | 130–170 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] |
| 🟡 | morphology | V1 · HR 90–110 | engine 97.4 vs recorded 154 | 134–174 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] |
| 🟡 | morphology | V1 · HR 70–90 | engine 107 vs recorded 171 | 151–191 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] |
| 🟡 | morphology | V2 · HR other | engine 258 vs recorded 360 | 340–380 | brief §9 V2: ±20 ms |
| 🟡 | morphology | V2-kind · mghdb | engine 1.0 vs recorded 0.6 | 0.32–0.92 | [ENG] share of beats with a true notch minimum within ±0.3 of the recording |
| 🟡 | morphology | V3-delay · all | engine 112 vs recorded 442 | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) |
| 🟡 | morphology | V3-delay · vitaldb | engine 115 vs recorded 442 | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) |
| 🟡 | morphology | V5-PR · all | engine 217 vs recorded — | 140–216 | PTB-XL NORM p10–p90 by the same method (filled at run time) |
| 🟡 | morphology | V5-PR · vitaldb | engine 217 vs recorded — | 140–216 | PTB-XL NORM p10–p90 by the same method (filled at run time) |
| 🟡 | oracle | O1/map | ours 87.33 · Pulse 95.38 | ±5 % of Pulse | 8.4 % |
| 🟡 | oracle | O1/rr | ours 15.00 · Pulse 12.24 | ±10 % of Pulse | 22.5 % |
| 🟡 | oracle | O1/cvp | ours 6.00 · Pulse 4.73 | ±10 % of Pulse | 26.8 % |
| 🟡 | oracle | O2/lactate | ours — · Pulse — | n/a | Pulse aborted after 1570 s (wasm abort); no Pulse value at 1800 s |
| 🟡 | segments | s1-phenylephrine/peak/hr-fall | 75.0 | 60.0–70.0 | brief §4.9 1: reflex HR −5–15 |
| 🟡 | segments | s2-class2-haemorrhage/class2/hr | 75.0 | 100–120 | brief §4.9 2: HR 100–120 |
| 🟡 | segments | s4-class-iii/late/sbp | 103 | < 100 | brief §4.9 4 / ATLS class III: SBP decreased |
| 🟡 | segments | t10-as-cad-propofol/base/steady-map | 112 | 60.0–110 | baseline MAP physiological [ENG] |
| 🟡 | segments | t10-as-cad-propofol/2min/map | 69.9 | 60.0–65.0 | tables §7 10: MAP 103 → 60–65 at 2 min |
| 🟡 | segments | t11-chronic-mr-fluid/oedema/spo2 | 96.5 | 89.0–92.0 | tables §7 11: SpO2 96 → 89–92 |
| 🟡 | segments | t12-massive-pe/pe/etco2 | 26.0 | 20.0–25.0 | tables §7 12: EtCO2 35 → 20–25 within 3 breaths |
| 🟡 | segments | t12-massive-pe/pe-late/papm | 24.0 | 30.0–45.0 | tables §7 12: mPAP 30–40, never > 45 (systolic proxy) [ENG] |
| 🟡 | segments | t12-massive-pe/pe-late/spo2 | 100.0 | 85.0–92.0 | tables §7 12: SpO2 85–92 on FiO2 1 |
| 🟡 | segments | t14-tamponade/equalised/pawp | 23.9 | 15.0–20.0 | tables §7 14 |
| 🟡 | segments | t15-rv-infarct/rest/map | 85.9 | 60.0–70.0 | tables §7 15: MAP 60–70 |
| 🟡 | segments | t17a-class3-no-bb/late/sbp | 101 | 80.0–90.0 | tables §7 17a: SBP 80–90 |
| 🟡 | segments | t17a-class3-no-bb/late/pp | 27.0 | 20.0–25.0 | tables §7 17a: PP 20–25 |
| 🟡 | segments | t17b-class3-bb/late/hr | 75.0 | 80.0–95.0 | tables §7 17b: HR 80–95 |
| 🟡 | segments | t17b-class3-bb/late/sbp | 101 | 65.0–80.0 | tables §7 17b: SBP 65–80 |
| 🟡 | segments | t18-htn-hypocapnia-cbf/hypocapnia/etco2 | 15.8 | 20.0–28.0 | tables §7 18: hyperventilation to PaCO2 ≈ 25 (EtCO2 proxy) [ENG] |
| 🟡 | segments | t19-tbi-haematoma/cushing/hr | 75.0 | < 60.0 | tables §7 19: HR 80 → 45–55 at CPP < 40 |
| 🟡 | segments | t20-low-flow-oliguria/on-dobutamine/map | 84.2 | 68.0–76.0 | tables §7 20: MAP 72 on dobutamine |
| 🟡 | segments | t24-edmark-fio2-0.8/apnoea/t90 | 377 | 242–364 | tables §7 24: 303 s ±20 % |
| 🟡 | segments | t24-edmark-fio2-0.6/apnoea/t90 | 261 | 170–256 | tables §7 24: 213 s ±20 % |

## Clinical scenario suite results (FU-4)

Source: `docs/gates/fu-4.md` §2 "The clinical scenario table" (Task 22), with the later moves from
`docs/gates/stage-fu-8b.md` §5–§6. Rig: ETT, VCV 12 × 600, PEEP 5, FiO2 0.5, seed 7, truth values.

- **Suite size.** `packages/engine-core/test/engine/clinical-suite.test.ts` has **28 graded rows and 1 recorded (not asserted) row** (condition × intervention:
  propofol and sevoflurane in healthy and 80 y hypertensive patients, tamponade, class III and full exsanguination,
  massive PE, anaphylaxis, VF with CPR, untreated MH, and three MANUAL rows). Six more scenarios live in their own files
  (S3 `circ-pulsus`, S7 `circ-lowflow-arrest`, S11 `blood-k-rhythm`, S12 `circ-hypoxic-arrest`, S15 `vagal-events`,
  the tension pneumothorax course in `tension-ptx`) plus the 7 kg infant (`vent-infant`). FU-4's
  `pnpm run audit:physiology` covered 79 scenarios (§3).
- **Outside the expected course at FU-4:** 11 suite rows plus S3 (pulsus paradoxus 3.1 mmHg against ≥ 10).
- **Outside it on this tree: 9 suite rows**, each an `it.fails` row in the first table above: S4b (tamponade + propofol
  1 mg/kg: MAP and CO fall too little), S5 (tamponade + PEEP 10: too little fall), S6a (class III + propofol: the nadir
  is now far below 30–50, with an arrest), S9 SaO2 and S9 CVP/MAP (massive PE: no desaturation, no RV-failure picture),
  S13 (CPR CoPP above 25), the 2 L exsanguination ROSC (no pulse in 10 min), 10 min of VF with CPR (kIsch not held
  below 0.9) and the MANUAL 18/10 floor (shows 65/30). Out-of-file: S3 pulsus, and the tension-PTX decompression row
  (the patient is in PEA before the decompression; `tension-ptx`).
- **Fixed by FU-4** (flipped from `it.fails` to `it`): S1b (propofol, 15 min recovery ≥ 85 %: 0.920), S8 (tension PTX
  by one command reaches PEA in 3–10 min: +9.75 min), CPR alone after a 3 L exsanguination (no pulse in 10 min, as
  ruled), and S6a "no PEA in 5 min" (was PEA at +80 s).
- **Fixed after FU-4:** S2 (sevoflurane MAP fall) and S14 (80 y HTN + propofol MAP fall) flipped with FU-8 B4
  (`docs/gates/stage-fu-8b.md` §6, E-FU8B-1: the suite's `it.fails` count went from 11 to 9).
- **Moved the wrong way after FU-4:** S6a "no arrest within 5 min", which FU-4 had fixed, now arrests at +89 s with
  FU-8 B4; it is kept as a record, not a criterion (E-FU8B-2, `docs/gates/stage-fu-8b.md` §4).

## Stand-ins marked INTERIM in the code

From `grep -rn "INTERIM" packages/*/src` (three hits, two stand-ins):

- `packages/engine-core/src/l2/brain/flow.ts:10`, `:80` and `packages/engine-core/src/l2/brain/model.ts:24`: the brain
  model's **anaesthetic input fallback**. When Stage 3's `thermal` general anaesthesia runs with no hypnotic on 7g's
  drug bus, the brain reads the tables' per-agent rows (`drugsOf`, used as `GA_FALLBACK` ≈ propofol effect 0.6 in
  `packages/engine-core/src/l2/organs/pipeline.ts`, Decision 6 of the 7d plan) instead of 7f/7g's drug outputs. Owner:
  no later stage is named in the code or the gate notes; its `vasoDirect()` reading is a calibration note
  (Q-FU2-CBF, `docs/gates/stage-7d.md` §5) for the calibration pass (R44).
- `packages/ventilator/src/link/profiles.ts:65` (`STAND_INS`): **MANUAL haemodynamic targets [ENG] for two ventilator
  link profiles**, anaphylaxis with bronchospasm (vasoplegia) and venous air embolism (RV outflow air lock). They stand
  in for the circulation's own response: 7e's anaphylaxis acts on the circulation only in MODELED, while the link runs
  MANUAL. The comment's removal condition ("when Stage 7a's right heart consumes pvrMultiplier") is out of date: 7a has
  merged, and V.1 ruled that the anaphylaxis stand-in stays (`docs/gates/stage-v1.md` §10, item 4; Decision 23 of
  `docs/plans/stage-v1-ventilator-followup.md`), handing "anaphylaxis in MANUAL link profiles" on as an FU-4 request
  that no later gate note records as done. Owner: open; no stage owns the removal.

## Datasets not used or not reachable

- **PWDB (Pulse Wave Database 0.1.0, PDDL 1.0): not measured.** Zenodo answered the fetcher with HTTP 403 ("unusual
  traffic") in Stage 8a (`docs/gates/stage-8a.md` §2: 0 subjects) and again on 2026-10-17 for this release's run. The
  PWDB rise-time band is skipped, not estimated; it was not worked around. `NOTICES.md` N-082 keeps the row as a
  validation reference with nothing bundled; the manual fallback (a browser download into the cache, checked against
  the manifest MD5) is in `docs/gates/stage-8a.md` "Needs a ruling", item 3.
- **Excluded until their licences are cleared** (`docs/DESIGN-BRIEF.md` §8 "Licence and provenance", and §2): CapnoBase
  (licence unverified), MIMIC-III/IV (ODbL share-alike; the MIMIC-III listing is unverified) and PulseDB
  (non-commercial). None is fetched, measured or bundled, so `NOTICES.md` has no row for them.
- **Used, with known gaps** (`docs/gates/stage-8a.md` §2): VitalDB (N-080) and PTB-XL (N-052) as listed; MGH/MF
  (N-081) has no PPG channel, so the V3 pleth-shape rows have no recorded MGH/MF side, and its CO2 is uncalibrated
  (report-only).
