# FU-4 gate — every `it.fails` in the repository (R45)

Generated at the gate with `grep -rn "it.fails(" packages apps` (56 entries). **FU-4** marks an entry this branch added or re-titled (new number); the rest predate FU-4 and are unchanged. Each title carries its measured number.

| # | file:line | title (band — measured) | FU-4 |
|---|---|---|---|
| 1 | `ventilator/test/link-r27.test.ts:77` | ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5 |  |
| 2 | `ventilator/test/link-r27.test.ts:98` | cardiogenic oedema PEEP 5 → 12: SpO2 rises and CO falls |  |
| 3 | `engine-core/l2/gas/co2.test.ts:53` | low flow: CPR-level output (CO 29 %) holds EtCO2 at 10–20 mmHg over 1–3 min (then the tissue build-up restores it, research 03 §4.4) — measured 26.0 / 21.8 / 20.4 at 1 / 2 / 3 min with τ 70 s | FU-4 |
| 4 | `engine-core/l2/gas/co2.test.ts:64` | low flow: arrest (CO 0) < 5 mmHg within 30 s — measured 24.2 at 30 s (4.8 at 150 s) with τ 70 s; superseded by the orchestrator\ | FU-4 |
| 5 | `engine-core/l2/pk/flow-distribution.test.ts:49` | S6b: 30 % haemorrhage (CO 3.1 vs 5.25) → propofol 2 mg/kg peak Ce ≥ 1.3× healthy — measured 1.29 (q 0.6, V1 share 0.5 [ENG]) | FU-4 |
| 6 | `engine-core/l2/ecg/s5/escape-reset.test.ts:29` | sinus 30 + a 40/min junctional focus → 40 QRS/min (escape rhythm, AV dissociation) — measured 60 (30 sinus + 30 junctional: the P after each escape captures) | FU-4 |
| 7 | `engine-core/l2/ecg/s5/escape-reset.test.ts:33` | never the sum: sinus 30 + a 40/min focus stays below 30 + 40 × ½ (45) QRS/min — measured 60 | FU-4 |
| 8 | `engine-core/l2/blood/core.test.ts:76` | 2 L 0.9 % saline in 30 min (GA): Cl +6–8 and BE −3 to −5 at 60 min (annex D3) |  |
| 9 | `engine-core/l2/blood/acid-base.test.ts:34` | acute respiratory alkalosis reaches the tables’ 0.2 mmol/L per mmHg (40 → 30) |  |
| 10 | `engine-core/l2/neuro/reversal.test.ts:53` | [R-7f-7] underdosed sugammadex (0.5 mg/kg at PTC after rocuronium 1.2) → recovery then recurarisation (TOFR falls ≥ 0.04) — capacity-limited: measured peak 0.833 at +90 min (ideal-binder ceiling 0.834), no fall |  |
| 11 | `engine-core/l2/brain/model.test.ts:136` | check 18: PaCO2 25 → CBF 35–40 % of the anaesthetised baseline (model at CVP 6) |  |
| 12 | `engine-core/engine/clinical-suite.test.ts:107` | S2 the same: MAP −15 to −30 % at 20 min — measured −14.3 % with the humoral arm (−21 % on the prototype; Q1) | FU-4 |
| 13 | `engine-core/engine/clinical-suite.test.ts:122` | S4b severe tamponade, propofol 1 mg/kg: MAP < 55 within 3 min and CO −25 % (audit S4 proposal; Q2; measured MAP 59.7, CO −15 % — 57 / −15 % on the prototype) | FU-4 |
| 14 | `engine-core/engine/clinical-suite.test.ts:130` | S5 severe tamponade, PEEP 5 → 10: CO −20 % and MAP ≥ 10 mmHg more than the same PEEP in a healthy patient (Barash; measured ΔMAP 4.1 vs 1.5, CO ×0.88 — 4 vs 1, ×0.89 on the prototype; Q2) | FU-4 |
| 15 | `engine-core/engine/clinical-suite.test.ts:153` | S6a the same: MAP falls 40–60 % to a nadir of 30–50 over 1–3 min (the expected picture; measured nadir 27.0, −68 % — 28.7 on the prototype; Q1) | FU-4 |
| 16 | `engine-core/engine/clinical-suite.test.ts:187` | S9 the same: SaO2 < 90 % at 5 min (truth, not the display; the proposed band SpO2 ≤ 92 at FiO2 0.5 is Ali's, item 15; measured 97.8 %) | FU-4 |
| 17 | `engine-core/engine/clinical-suite.test.ts:190` | S9 the same: CVP ≥ 15 and MAP < 65 at 5 min (RV failure; Q15; measured CVP 9.3, MAP 82.1) | FU-4 |
| 18 | `engine-core/engine/clinical-suite.test.ts:214` | S13 VF + standard-quality CPR (q 0.8, no adrenaline): the continuous coronary perfusion pressure (CoPP) 15–25 mmHg (Paradis 1990; measured 25.1–28.8) | FU-4 |
| 19 | `engine-core/engine/clinical-suite.test.ts:236` | S14 the same: MAP −30 to −45 % — measured −22.9 % with the humoral arm (−31 % on the prototype; Q1) | FU-4 |
| 20 | `engine-core/engine/clinical-suite.test.ts:277` | CPR + 2 L + adrenaline 1 mg after full exsanguination: a pulse within 4 min of the first compression — measured none in 10 min after G-FU4-1 (was +105 s) | FU-4 |
| 21 | `engine-core/engine/clinical-suite.test.ts:297` | 10 min of VF with standard-quality CPR alone: the myocardium stays ischaemic, flow share kIsch < 0.9 throughout (Weisfeldt & Becker 2002; measured max 0.91) | FU-4 |
| 22 | `engine-core/engine/clinical-suite.test.ts:326` | MANUAL target 18/10 mmHg: the displayed arterial pressure reaches the target (≤ 25/15) — the tracker floors it (monitor audit T4: 65/30; Q9) | FU-4 |
| 23 | `engine-core/engine/circ-lowflow-arrest.test.ts:125` | ROSC rig: the continuous CPR CoPP stays inside Paradis 15–25 throughout (≥ 15 was asserted; ≤ 25 added by F1) — measured −0.4–36.6 | FU-4 |
| 24 | `engine-core/engine/af-rate-control.test.ts:43` | amiodarone 150 mg over 10 min: AF 130 slows by 20–30 % at its peak (10–13 min) (measured 14.0) |  |
| 25 | `engine-core/engine/neuro-engine.test.ts:129` | propofol 2 mg/kg: depth-index nadir < 52 — measured 52 after FU-4 F4 (51 before) | FU-4 |
| 26 | `engine-core/engine/blood-sanity-acid.test.ts:23` | 2 L 0.9 % saline in 30 min under GA: Cl +6–8 and BE −3 to −5 at 60 min (annex D3) |  |
| 27 | `engine-core/engine/circ-manual-cvp-peep.test.ts:50` | brief §4.9: CVP 6 ventilated from t = 0, PEEP 15 reads 30–50 % of the 10 cmH2O step (2.2–3.7 mmHg) above PEEP 5 (measured 4.82: T_IT 0.65) |  |
| 28 | `engine-core/engine/circ-manual-cvp-peep.test.ts:62` | the 8a soak patient (CVP 6, PEEP 5) stays under the philips-like 10 mmHg limit with its ventilatory ripple: max < 9.5 and no CVP_M_HIGH in 120 s (measured max 10.17, raises at 27–57 s) |  |
| 29 | `engine-core/engine/organs-curves.test.ts:88` | UOP mid-curve (tables U linear 40 → 100): U(RPP 75) = 0.58 ± 15 % (prototype 0.76, decision 8) |  |
| 30 | `engine-core/engine/circ-pulsus.test.ts:34` | severe tamponade: pulsus paradoxus ≥ 10 mmHg (Spodick 2003) — measured 3.1 (swing 8 cmH2O: 4.9; 12: 6.9; Q2) | FU-4 |
| 31 | `engine-core/engine/arrest-etco2.test.ts:57` | VF with CPR q 0.8 from +30 s: EtCO2 ≥ 17 already at +2 min of CPR (measured 16.5) | FU-4 |
| 32 | `engine-core/engine/pk-longrun.test.ts:40` | the same run: propofol Ce held at 2.5 ± 0.005 — measured 2.5065 at 6 h (CI) after FU-4 Task 18f | FU-4 |
| 33 | `engine-core/engine/hemo-acceptance.test.ts:122` | 5c. post-PVC potentiation: the next beat SBP is +8–15 mmHg on average over isolated PVCs (measured −10.9; FU-2 item 3) |  |
| 34 | `engine-core/engine/hemo-acceptance.test.ts:203` | 7b. CPR at 110/min, quality 1: arterial trough ≤ 30 mmHg — measured 30.6 after FU-4 F1 | FU-4 |
| 35 | `engine-core/engine/circ-hypoxic-arrest.test.ts:190` | a PEA onset still shows organised electrical activity 6–10 min after the arrest — measured 0 beats (the PEA decayed to asystole first; FU-4 F5) | FU-4 |
| 36 | `engine-core/engine/circ-hypoxic-arrest.test.ts:214` | the monitor shows the bradycardia before the arrest: monitor HR < 45 in the minute before — measured min 58 (Task 13b not landed) | FU-4 |
| 37 | `engine-core/engine/tension-ptx.test.ts:57` | PPV: PEA arrives ≤ 10 min after onset — measured +10.45 min with the humoral arm (+8.65 after Task 18c) | FU-4 |
| 38 | `engine-core/engine/circ-sanity-2.test.ts:49` | R23: AS + CAD propofol → hypotension → ischaemia (kIsch falls, ST ↓) → phenylephrine reverses it |  |
| 39 | `engine-core/engine/circ-sanity-2.test.ts:58` | R23: the same run rescued with ephedrine 10 mg keeps the deficit longer (kIsch still < 0.95 at +3 min) |  |
| 40 | `engine-core/engine/obstructive-aliases.test.ts:72` | SBP < 90 at 3 min (massive PE: sustained SBP < 90) — measured 92.8 with the humoral arm (88.7 before it) | FU-4 |
| 41 | `engine-core/engine/obstructive-aliases.test.ts:75` | CVP ≥ 15 mmHg — measured 11.5 (RV wall-stress demand added, Task 11 Step 1b) | FU-4 |
| 42 | `engine-core/engine/obstructive-aliases.test.ts:78` | MAP < 65 mmHg — measured 78.4 (reached only at +15 min, PEA at +15.6 min) | FU-4 |
| 43 | `engine-core/engine/obstructive-aliases.test.ts:81` | PROPOSED band (Q15, Ali): SaO2 ≤ 92 % at FiO2 0.5 — measured 97.3 (the PE row shunt +0.10 is sourced, tables §18) | FU-4 |
| 44 | `engine-core/engine/circ-manual-ischaemia.test.ts:16` | 90/52 in the 75 y HTN profile under GA: no ischaemic spiral (kIsch > 0.9) and LVEDP back under the congestion threshold (18) in the last 2 min — measured kIsch 0.200, LVEDP 46.1 |  |
| 45 | `engine-core/engine/endo-acceptance.test.ts:22` | MH severity 1 at fixed ventilation (tables §7 check 21): EtCO2 ≥ 60 by 10 min — measured 54 after FU-4\ | FU-4 |
| 46 | `engine-core/engine/endo-acceptance.test.ts:69` | MH + dantrolene 2.5 mg/kg at 20 min (7g), fixed MV: EtCO2 turns 5–10 min after the dose (tables §7 check 21) — measured +4.0 min after FU-4\ | FU-4 |
| 47 | `engine-core/engine/endo-acceptance.test.ts:81` | MH + dantrolene + MV × 2 at 20 min: HR normal (< 100) by 15–20 min after the dose (tables §7 check 21; measured 129/121 at +15/+20 min, core 39.78 °C; Q-7e-5) |  |
| 48 | `engine-core/engine/circ-sanity-1.test.ts:83` | propofol 2 mg/kg: MAP ≈ 70 % of baseline at 2 min (60–80 %) — measured 0.801 with the humoral arm (Task 18e; 0.72 after Task 2, 0.913 before FU-4; Q1) | FU-4 |
| 49 | `engine-core/engine/pk-acceptance-pd.test.ts:59` | dobutamine 5 µg/kg/min: CO +20–40 % (measured +11.8 with the FU-2 β venous term) |  |
| 50 | `engine-core/engine/organs-htn.test.ts:71` | restoring PaCO2 35 and MAP ≈ 80: CBF > 80 % — on main + 7e MAP 86.6 (premise 77–84 missed), CBF 0.891 |  |
| 51 | `engine-core/engine/organs-renal.test.ts:39` | check 20 (MODELED hfref): low-output premise, UOP 0.1–0.15; dobutamine → CO +20–40 %, UOP 0.2–0.3 in 30–60 min |  |
| 52 | `engine-core/engine/organs-renal.test.ts:64` | check 20 (MANUAL contractility, FU-2): premise UOP 0.1–0.15; dobutamine → CO +20–40 %, UOP 0.2–0.3 in 30–60 min |  |
| 53 | `engine-core/engine/truth-event.test.ts:60` | the synthetic 12-drug future tree is not cut by the leaf cap — measured 2 101 leaves (cap 2 100) after FU-4 | FU-4 |
| 54 | `engine-core/engine/organs-tbi-treatment.test.ts:33` | hyperventilation: ICP falls no more than 30 % by the time PaCO2 reaches 30 — measured 30.5 % | FU-4 |
| 55 | `engine-core/engine/endo-circ-acceptance.test.ts:59` | warm CO 7–9 L/min (measured 5.0; 4.9 with FU-4, 4.9 at the gate; Q-7e-7) | FU-4 |
| 56 | `engine-core/engine/endo-circ-acceptance.test.ts:63` | warm SVR 500–700 dyn·s/cm⁵ (measured 861; 792 with FU-4, 767 at the gate; Q-7e-7) | FU-4 |

FU-4 entries: 36 of 56.
