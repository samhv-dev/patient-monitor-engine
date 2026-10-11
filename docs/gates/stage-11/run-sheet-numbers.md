# Stage 11 — run-sheet numbers for the kit job (Q12 ruling)

Kit built from branch `stage-11` (`node scripts/showcase/make-bundle.mjs`), served by its perl launcher; `rehearsal.showcase.ts`
+ `sound.showcase.ts` + `multiwindow.showcase.ts`, Chromium and WebKit, 2 workers: **20 passed (30.0 min)** — per engine 8
rehearsal cases + sound + multi-window. Presses at ×4 land 1–5 s of scenario clock after the run sheet's time (the app
polls every 100 ms of wall time); the clock below is the scenario clock (load = 0:00). Evidence: `showcase/results/`
(run-sheet tables and JSON, both engines) and `showcase/rehearsal/` (screenshots).

**Alarm words in the browser.** The app starts in its factory state **"Limit alarms off"** (FU-11 H3: still alarming
Asystole, VF/VT, VT, Apnoea). So of the plan's engine alarm texts only the always-on ones appear at the run sheet's
times: `CO2 APNEA` (S3 3:56 both engines; S4 3:39 Chromium / 3:52 WebKit — induced at 3:03 / 3:05), `SPO2 LOW PERFUSION`,
`IBP1 STATIC PRESSURE`, `SPO2 NO PULSE` (S2, haemorrhage). The limit alarms the plan quotes (`**RR 7<8`, `**SpO2 86<90`,
`**HR 44<50`, `**etCO2 0<30`, `**CVP 14>10`) do **not** sound unless the presenter turns limit alarms on (top-bar
button); S4's objective "Acknowledge the respiratory-rate alarm" depends on that (see the gate note).

## Run sheet (this plan) vs rehearsal

Tolerances are R45's (HR ± 5, pressures ± 5, SpO2 ± 2, EtCO2 ± 3, awRR ± 2, times ± max(10 %, 15 s)). C = Chromium, W = WebKit.

| Card | Plan run sheet | Rehearsal C / W | In band |
|---|---|---|---|
| 1 Healthy induction | 0:00–3:00 HR 70, ART 123/81 (95), SpO2 99, EtCO2 38 | 3:00 HR 70, 123/81 (95), 99, 39 / 3:01 70, 123/80 (94), 99, 39 | yes |
| | APNEA 3:56 (+56 s) | 3:56 (+55.9 s) / 3:56 (+54.5 s) | yes |
| | 4:30 MAP 74; capnogram ≤ 6 s after the tube | 4:35 MAP 75, 5.3 s / 4:36 MAP 75, 5.4 s | yes |
| | MAP nadir 65; 7:00 MAP 72 | nadir 64.7, 7:00 MAP 72 / 64.6, 7:04 MAP 72 | yes |
| 1 (unsecured, rescued) | 11:14 desaturating: HR 84, ART 109/75 | 11:18 HR 85, 109/76 / 11:20 HR 85, 109/76 (induced 3:04) | yes |
| | 12:26 bradycardic, HR → 44 | 12:32 / 12:33 (HR 51 / 46 at the bag-mask, pressed 14 s in) | yes |
| | SpO2 ≥ 90 32 s after the bag-mask | 32.1 s / 31.5 s | yes |
| | 15:00 HR 84, ART 104/73, SpO2 99, EtCO2 52 | 84, 104/72, 99, 52 / 85, 104/72, 99, 52 | yes |
| 2 Induction after premedication | 0:00 HR 70, ART 123/80 | 0:08 HR 71, 123/82 / 71, 123/82 | yes |
| | 1:00 → 2:55 HR 63 → 61, ART 120/75 → 117/72, awRR 9 → 5, EtCO2 41 → 48 | 2:01 HR 62, 119/74, EtCO2 45 / 63, 119/74, 45; awRR 9 (1:01) → 5 (2:12) (separate Chromium probe) | yes |
| | APNEA 3:43 (+43 s) | 3:39 (+36 s) / 3:52 (+47 s) | yes |
| | 4:30 MAP 61; 4:45–4:56 ART 78/43 (52–53), HR 56–58 | 4:34 MAP 61; 5:02 78/43 (52) HR 56 / 4:35 61; 5:04 79/43 (52) HR 55 | yes |
| | ephedrine: MAP ≥ 65 96 s later, 72 at 8:00, HR 62 | 98.5 s, 72, HR 61 / 96.2 s, 72, HR 61 | yes |
| 3 Anaphylaxis | 3:00 HR 139, MAP 78 | 2:57 HR 136, 97/71 (78) / same | yes |
| | systolic > 110 11 s after epinephrine | 11.3 s / 11.3 s | yes |
| | 5:00 ART 118/? (97), HR 110 | 4:58 122/88 (99), HR 112 / 4:59 122/89 (99), HR 113 | yes |
| 4 Malignant hyperthermia | 6:51 early signs, EtCO2 46, HR 85 | 6:49 46, 86 / 6:49 46, 85 | yes |
| | 9:00 → 17:00 EtCO2 51 → 76, HR 93 → 139 | 51 → 77, 93 → 139 / 51 → 77, 93 → 136 | yes |
| | 18:46 established, EtCO2 79–81, HR 142–148 | 18:43 81, 142 / 18:42 81, 142 | yes |
| | 21:00 → 29:00 EtCO2 54 → 45, HR 142 → 112 | 20:49 54, 139; 29:49 45, 109 / 20:48 54, 140; 29:47 45, 109 | yes |
| | 30:48 recovering | 30:49 / 30:48 | yes |
| | 40:00 HR 96, ART 151/100, EtCO2 42 | 96, 151/99, 42 / 96, 151/99, 42 | yes |
| 5 Stab wound | 1:00 HR 99, ART 106/87, SpO2 98, EtCO2 32 | 97, 105/85, 98, 32 / same | yes |
| | 3:00 → 6:00 HR 113 → 136, ART 100/84 → 81/69, EtCO2 29 → 24 | 111 → 134, 98/83 → 80/69, 29 → 24 / 111 → 134, 98/83 → 79/68, 29 → 24 | yes |
| | PEA 7:51 | 7:48 / 7:46 | yes |
| | 12:00 → 12:48 ART 113/79 → 119/79, HR 68 → 64, EtCO2 25 → 38 | 12:31 118/78, HR 63, EtCO2 33 / 12:29 119/79, 64, 33 | yes |
| | 15:00 119/76, HR 62, EtCO2 39 | 119/76, 62, 39 / 119/76, 61, 39 | yes |
| 6 Haemorrhage | 2/4/6/8 min HR 81/96/121/142, systolic 114/108/99/75 (MAP 66) | 81/96/120/140, 114/107/99/75 (66) / same | yes |
| | pulse lost 10:29 (engine truth) | arterial line static 10:01, `SPO2 NO PULSE` 10:36 (both) | yes (± 1.05 min) — see the gate note |
| | ROSC 176 s into CPR (systolic > 90) | 176 s (10:51 → 13:47) / 177 s | yes |
| | 14:50 135/91, HR 75, EtCO2 35 | 14:49 135/90, 76, 34 / 14:50 135/90, 75, 34 | yes |

No monitor number is beyond its R45 tolerance: nothing to STOP on.


## 1 · Healthy induction

#### Healthy induction (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Healthy induction" at ×4 |
| 3:00 | HR 70, ART 123/81 (95), SpO2 99, EtCO2 39, RR 14 · state awake | 3 min of preoxygenation (FiO2 1.0 held until induction) |
| 3:03 | HR 69, ART 122/80 (94), SpO2 99, EtCO2 39, RR 14 · state induced | press **Induce now** |
| 3:57 | HR 78, ART 102/67 (77), SpO2 99, EtCO2 0, RR 9 · state induced | apnoea alarm |
| 4:35 | HR 77, ART 98/64 (75), SpO2 99, EtCO2 0, RR 5 · state ventilated | press **Intubate and ventilate** |
| 4:37 | HR 79, ART 96/64 (73), SpO2 99, EtCO2 46, RR 5 · state ventilated | EtCO2 back on the CO2 tile |
| 7:00 | HR 74, ART 95/61 (72), SpO2 99, EtCO2 37, RR 12 · state ventilated | 4 min after induction |
| 8:01 | HR 73, ART 97/63 (74), SpO2 99, EtCO2 37, RR 12 · state ventilated | end (8:00) |

Alarms raised (scenario clock): 3:56 CO2 APNEA

Checks: PASS apnoea alarm after "Induce now" ("55.9 s \"CO2 APNEA\"") · PASS EtCO2 on the CO2 tile after "Intubate and ventilate" ("5.3 s") · PASS arterial mean falls after induction ("94.8 → nadir 64.7") · PASS no console error or page error ([])

#### Healthy induction (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Healthy induction" at ×4 |
| 3:01 | HR 70, ART 123/80 (94), SpO2 99, EtCO2 39, RR 14 · state awake | 3 min of preoxygenation (FiO2 1.0 held until induction) |
| 3:05 | HR 70, ART 122/80 (95), SpO2 99, EtCO2 39, RR 14 · state induced | press **Induce now** |
| 3:56 | HR 78, ART 101/67 (77), SpO2 99, EtCO2 0, RR 0 · state induced | apnoea alarm |
| 4:36 | HR 78, ART 98/65 (75), SpO2 99, EtCO2 0, RR 4 · state ventilated | press **Intubate and ventilate** |
| 4:39 | HR 79, ART 96/64 (74), SpO2 99, EtCO2 37, RR 4 · state ventilated | EtCO2 back on the CO2 tile |
| 7:04 | HR 74, ART 95/61 (72), SpO2 99, EtCO2 37, RR 12 · state ventilated | 4 min after induction |
| 8:00 | HR 74, ART 97/63 (74), SpO2 99, EtCO2 37, RR 12 · state ventilated | end (8:00) |

Alarms raised (scenario clock): 3:56 CO2 APNEA

Checks: PASS apnoea alarm after "Induce now" ("54.5 s \"CO2 APNEA\"") · PASS EtCO2 on the CO2 tile after "Intubate and ventilate" ("5.4 s") · PASS arterial mean falls after induction ("94.8 → nadir 64.6") · PASS no console error or page error ([])

#### Healthy induction, airway not secured, rescued (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Healthy induction" at ×4 |
| 3:04 | HR 70, ART 122/80 (95), SpO2 99, EtCO2 39, RR 14 · state induced | press **Induce now** |
| 11:18 | HR 85, ART 109/76 (87), SpO2 94, EtCO2 0, RR 0 · state desaturating | state "SpO₂ below 90 %" (nothing pressed) |
| 12:32 | HR 109, ART 108/79 (88), SpO2 66, EtCO2 0, RR 0 · state bradycardic | state "SpO₂ below 60 %: hypoxic bradycardia" |
| 12:46 | HR 51, ART 100/59 (73), SpO2 61, EtCO2 0, RR 0 · state rescuedBvm | press **Bag-mask ventilate, FiO₂ 1.0** |
| 13:15 | HR 85, ART 109/75 (86), SpO2 92, EtCO2 59, RR 1 · state rescuedBvm | SpO2 back to 90 % |
| 13:47 | HR 83, ART 110/75 (86), SpO2 99, EtCO2 56, RR 14 · state rescuedEtt | press **Intubate and ventilate, FiO₂ 1.0** |
| 15:01 | HR 84, ART 104/72 (82), SpO2 99, EtCO2 52, RR 12 · state rescuedEtt | end (15:00) |

Alarms raised (scenario clock): 3:56 CO2 APNEA

Checks: PASS desaturation after induction with nothing done ("8.3 min") · PASS hypoxic bradycardia follows ("1.2 min") · PASS SpO2 recovers after bag-mask ventilation ("32.1 s") · PASS rescued: a pulse and a saturation at 15:00 ("HR 84, SpO2 99") · PASS no console error or page error ([])

#### Healthy induction, airway not secured, rescued (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Healthy induction" at ×4 |
| 3:04 | HR 70, ART 122/80 (95), SpO2 99, EtCO2 39, RR 14 · state induced | press **Induce now** |
| 11:20 | HR 85, ART 109/76 (86), SpO2 94, EtCO2 0, RR 0 · state desaturating | state "SpO₂ below 90 %" (nothing pressed) |
| 12:33 | HR 109, ART 108/79 (88), SpO2 66, EtCO2 0, RR 0 · state bradycardic | state "SpO₂ below 60 %: hypoxic bradycardia" |
| 12:47 | HR 46, ART 99/59 (72), SpO2 61, EtCO2 0, RR 1 · state rescuedBvm | press **Bag-mask ventilate, FiO₂ 1.0** |
| 13:15 | HR 86, ART 109/75 (86), SpO2 91, EtCO2 59, RR 1 · state rescuedBvm | SpO2 back to 90 % |
| 13:49 | HR 84, ART 110/74 (85), SpO2 99, EtCO2 55, RR 13 · state rescuedEtt | press **Intubate and ventilate, FiO₂ 1.0** |
| 15:01 | HR 85, ART 104/72 (82), SpO2 99, EtCO2 52, RR 12 · state rescuedEtt | end (15:00) |

Alarms raised (scenario clock): 3:56 CO2 APNEA

Checks: PASS desaturation after induction with nothing done ("8.3 min") · PASS hypoxic bradycardia follows ("1.2 min") · PASS SpO2 recovers after bag-mask ventilation ("31.5 s") · PASS rescued: a pulse and a saturation at 15:00 ("HR 85, SpO2 99") · PASS no console error or page error ([])

## 2 · Induction after fentanyl and midazolam

#### Induction after fentanyl and midazolam (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Induction after fentanyl and midazolam" at ×4 |
| 0:08 | HR 71, ART 123/82 (96), SpO2 96, EtCO2 36, RR 14 · state premedicated | premedication given by itself (fentanyl 2 µg/kg, midazolam 0.03 mg/kg) |
| 2:01 | HR 62, ART 119/74 (88), SpO2 99, EtCO2 45, RR 0 · state premedicated | 2:00 — breathing slows |
| 3:03 | HR 60, ART 115/71 (85), SpO2 99, EtCO2 49, RR 5 · state induced | press **Induce now** |
| 4:34 | HR 59, ART 87/50 (61), SpO2 99, EtCO2 0, RR 2 · state ventilated | press **Intubate and ventilate** |
| 4:38 | HR 59, ART 85/49 (59), SpO2 99, EtCO2 49, RR 2 · state ventilated | mean arterial pressure below 60 |
| 5:02 | HR 56, ART 78/43 (52), SpO2 99, EtCO2 43, RR 3 · state maintained | press **Ephedrine 10 mg** |
| 6:37 | HR 60, ART 94/54 (65), SpO2 99, EtCO2 40, RR 12 · state maintained | mean arterial pressure back to 65 |
| 8:00 | HR 61, ART 102/59 (72), SpO2 99, EtCO2 40, RR 12 · state maintained | end (8:00) |

Alarms raised (scenario clock): 3:39 CO2 APNEA

Checks: PASS the premedication starts by itself ("8.2 s") · PASS the mean falls below 60 after the premedicated induction ("98.2 s after induction") · PASS the mean recovers after ephedrine ("98.5 s") · PASS no console error or page error ([])

#### Induction after fentanyl and midazolam (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Induction after fentanyl and midazolam" at ×4 |
| 0:08 | HR 71, ART 123/82 (96), SpO2 96, EtCO2 36, RR 14 · state premedicated | premedication given by itself (fentanyl 2 µg/kg, midazolam 0.03 mg/kg) |
| 2:01 | HR 63, ART 119/74 (89), SpO2 99, EtCO2 45, RR 0 · state premedicated | 2:00 — breathing slows |
| 3:05 | HR 61, ART 116/72 (86), SpO2 99, EtCO2 48, RR 5 · state induced | press **Induce now** |
| 4:35 | HR 59, ART 87/50 (61), SpO2 99, EtCO2 0, RR 3 · state ventilated | press **Intubate and ventilate** |
| 4:41 | HR 59, ART 84/48 (58), SpO2 99, EtCO2 49, RR 3 · state ventilated | mean arterial pressure below 60 |
| 5:04 | HR 55, ART 79/43 (52), SpO2 99, EtCO2 43, RR 12 · state maintained | press **Ephedrine 10 mg** |
| 6:37 | HR 60, ART 94/54 (65), SpO2 99, EtCO2 40, RR 12 · state maintained | mean arterial pressure back to 65 |
| 8:00 | HR 61, ART 101/59 (72), SpO2 99, EtCO2 40, RR 12 · state maintained | end (8:00) |

Alarms raised (scenario clock): 3:52 CO2 APNEA

Checks: PASS the premedication starts by itself ("8.1 s") · PASS the mean falls below 60 after the premedicated induction ("99.6 s after induction") · PASS the mean recovers after ephedrine ("96.2 s") · PASS no console error or page error ([])

## 3 · Anaphylaxis under anaesthesia

#### Anaphylaxis under anaesthesia (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state stable | loaded "Anaphylaxis under anaesthesia" at ×4 |
| 0:58 | HR 73, ART 120/83 (96), SpO2 99, EtCO2 33, RR 12 · state anaphylaxis | reaction started (automatically, 60 s after load) |
| 2:57 | HR 136, ART 97/71 (78), SpO2 99, EtCO2 32, RR 12 · state anaphylaxis | ≈ 2 min into the reaction |
| 3:01 | HR 140, ART 97/70 (78), SpO2 99, EtCO2 31, RR 12 · state treatedByButton | press **Give epinephrine 100 µg** |
| 3:09 | HR 174, ART 114/87 (95), SpO2 99, EtCO2 32, RR 12 · state treatedByButton | systolic above 110 |
| 4:58 | HR 112, ART 122/88 (99), SpO2 99, EtCO2 33, RR 12 · state treatedByButton | 2 min after epinephrine |

Alarms raised (scenario clock): none

Checks: PASS the reaction starts by itself ("yes") · PASS HR about 2 min into the Anaphylaxis state (135) · PASS systolic after epinephrine ("11.3 s") · PASS no console error or page error ([])

#### Anaphylaxis under anaesthesia (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state stable | loaded "Anaphylaxis under anaesthesia" at ×4 |
| 0:58 | HR 73, ART 120/83 (96), SpO2 99, EtCO2 33, RR 12 · state anaphylaxis | reaction started (automatically, 60 s after load) |
| 2:57 | HR 136, ART 97/71 (78), SpO2 99, EtCO2 32, RR 12 · state anaphylaxis | ≈ 2 min into the reaction |
| 3:01 | HR 140, ART 97/70 (78), SpO2 99, EtCO2 31, RR 12 · state treatedByButton | press **Give epinephrine 100 µg** |
| 3:09 | HR 173, ART 113/86 (94), SpO2 99, EtCO2 32, RR 12 · state treatedByButton | systolic above 110 |
| 4:59 | HR 113, ART 122/89 (99), SpO2 99, EtCO2 33, RR 12 · state treatedByButton | 2 min after epinephrine |

Alarms raised (scenario clock): none

Checks: PASS the reaction starts by itself ("yes") · PASS HR about 2 min into the Anaphylaxis state (135) · PASS systolic after epinephrine ("11.3 s") · PASS no console error or page error ([])

## 4 · Malignant hyperthermia

#### Malignant hyperthermia (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state induction | loaded "Malignant hyperthermia" at ×4 |
| 4:03 | HR 78, ART 98/65 (74), SpO2 99, EtCO2 40, RR 12 · state surgery | press **Start surgery: rocuronium 0.6 mg/kg** |
| 6:49 | HR 86, ART 105/70 (80), SpO2 99, EtCO2 46, RR 12 · state earlySigns | state "Early signs" (EtCO2 above 45 at the same ventilation) |
| 9:01 | HR 93, ART 110/76 (86), SpO2 99, EtCO2 51, RR 12 · state earlySigns | 9:00 (fast-forward here with Stage 10) |
| 13:01 | HR 113, ART 117/85 (94), SpO2 99, EtCO2 64, RR 12 · state earlySigns | 13:00 (fast-forward here with Stage 10) |
| 17:00 | HR 139, ART 119/89 (97), SpO2 98, EtCO2 77, RR 12 · state earlySigns | 17:00 (fast-forward here with Stage 10) |
| 18:43 | HR 142, ART 119/89 (98), SpO2 98, EtCO2 81, RR 12 · state established | state "Established MH" — Explore → "Changed only" |
| 19:47 | HR 143, ART 117/88 (96), SpO2 99, EtCO2 60, RR 33 · state triggerOff | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 20:49 | HR 139, ART 118/88 (96), SpO2 99, EtCO2 54, RR 26 · state treating | press **Dantrolene 2.5 mg/kg** |
| 21:19 | HR 140, ART 120/90 (98), SpO2 99, EtCO2 54, RR 25 · state treating | press **Cool: 2 L saline at room temperature** |
| 21:49 | HR 139, ART 124/92 (101), SpO2 99, EtCO2 54, RR 25 · state treating | press **Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose** |
| 22:18 | HR 136, ART 127/95 (104), SpO2 99, EtCO2 53, RR 25 · state treating | press **Sodium bicarbonate 1 mmol/kg** |
| 29:49 | HR 109, ART 150/104 (119), SpO2 99, EtCO2 45, RR 24 · state treating | press **Dantrolene 2.5 mg/kg** |
| 30:49 | HR 107, ART 153/104 (120), SpO2 99, EtCO2 44, RR 23 · state recovering | state "Recovering: EtCO₂ below 45" |
| 39:01 | HR 96, ART 153/100 (118), SpO2 99, EtCO2 37, RR 21 · state normoventilated | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 40:01 | HR 96, ART 151/99 (116), SpO2 99, EtCO2 42, RR 18 · state normoventilated | end (40:00) |

Alarms raised (scenario clock): none

Checks: PASS early signs ("6.8 min") · PASS established crisis ("18.7 min") · PASS recovery after dantrolene ("10.1 min") · PASS no arrest on the treated path (108.7) · PASS no console error or page error ([])

#### Malignant hyperthermia (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state induction | loaded "Malignant hyperthermia" at ×4 |
| 4:03 | HR 78, ART 98/65 (74), SpO2 99, EtCO2 40, RR 12 · state surgery | press **Start surgery: rocuronium 0.6 mg/kg** |
| 6:49 | HR 85, ART 105/70 (80), SpO2 99, EtCO2 46, RR 12 · state earlySigns | state "Early signs" (EtCO2 above 45 at the same ventilation) |
| 9:00 | HR 93, ART 110/76 (86), SpO2 99, EtCO2 51, RR 12 · state earlySigns | 9:00 (fast-forward here with Stage 10) |
| 13:01 | HR 114, ART 116/85 (94), SpO2 99, EtCO2 64, RR 12 · state earlySigns | 13:00 (fast-forward here with Stage 10) |
| 17:01 | HR 136, ART 119/89 (98), SpO2 98, EtCO2 77, RR 12 · state earlySigns | 17:00 (fast-forward here with Stage 10) |
| 18:42 | HR 142, ART 119/89 (98), SpO2 98, EtCO2 81, RR 12 · state established | state "Established MH" — Explore → "Changed only" |
| 19:46 | HR 143, ART 119/88 (97), SpO2 99, EtCO2 60, RR 35 · state triggerOff | press **MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate** |
| 20:48 | HR 140, ART 118/88 (97), SpO2 99, EtCO2 54, RR 26 · state treating | press **Dantrolene 2.5 mg/kg** |
| 21:18 | HR 140, ART 120/89 (98), SpO2 99, EtCO2 54, RR 26 · state treating | press **Cool: 2 L saline at room temperature** |
| 21:48 | HR 139, ART 124/92 (101), SpO2 99, EtCO2 54, RR 25 · state treating | press **Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose** |
| 22:17 | HR 136, ART 127/94 (104), SpO2 99, EtCO2 53, RR 25 · state treating | press **Sodium bicarbonate 1 mmol/kg** |
| 29:47 | HR 109, ART 151/104 (119), SpO2 99, EtCO2 45, RR 24 · state treating | press **Dantrolene 2.5 mg/kg** |
| 30:48 | HR 108, ART 152/105 (120), SpO2 99, EtCO2 44, RR 23 · state recovering | state "Recovering: EtCO₂ below 45" |
| 39:01 | HR 96, ART 153/100 (118), SpO2 99, EtCO2 37, RR 21 · state normoventilated | press **EtCO₂ normal: ventilation back to 12 × 500** |
| 40:00 | HR 96, ART 151/99 (116), SpO2 99, EtCO2 42, RR 18 · state normoventilated | end (40:00) |

Alarms raised (scenario clock): none

Checks: PASS early signs ("6.8 min") · PASS established crisis ("18.7 min") · PASS recovery after dantrolene ("10 min") · PASS no arrest on the treated path (114.4) · PASS no console error or page error ([])

## 5 · Stab wound: tamponade, PEA and pericardiocentesis

#### Stab wound: tamponade, PEA and pericardiocentesis (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state arrival | loaded "Stab wound: tamponade, PEA and pericardiocentesis" at ×4 |
| 1:00 | HR 97, ART 105/85 (91), SpO2 98, EtCO2 32, RR 13 · state arrival | 1:00 |
| 3:01 | HR 111, ART 98/83 (88), SpO2 99, EtCO2 29, RR 14 · state arrival | 3:00 |
| 6:01 | HR 134, ART 80/69 (72), SpO2 99, EtCO2 24, RR 15 · state arrival | 6:00 |
| 7:48 | HR 44, ART –/– (20), SpO2 99, EtCO2 13, RR 16 · state pea | state "PEA" (sinus on the ECG, no pulse) |
| 8:01 | HR 68, ART –/– (36), SpO2 –, EtCO2 7, RR 16 · state cpr | press **Start CPR, intubate, FiO₂ 1.0** |
| 10:02 | HR 106, ART 46/20 (30), SpO2 99, EtCO2 9, RR 12 · state cprDrained | press **Pericardiocentesis during CPR** |
| 12:02 | HR 104, ART 109/66 (82), SpO2 99, EtCO2 26, RR 12 · state rosc | press **Pulse back: stop CPR** |
| 12:31 | HR 63, ART 118/78 (92), SpO2 99, EtCO2 33, RR 12 · state rosc | 30 s after stopping CPR |
| 12:34 | HR 63, ART 117/77 (91), SpO2 99, EtCO2 35, RR 12 · state roscFluid | press **Crystalloid 500 mL** |
| 15:00 | HR 62, ART 119/76 (90), SpO2 99, EtCO2 39, RR 20 · state roscFluid | end (15:00) |

Alarms raised (scenario clock): 5:55 SPO2 LOW PERFUSION · 7:27 IBP1 STATIC PRESSURE · 7:54 SPO2 NO PULSE · 8:14 SPO2 LOW PERFUSION

Checks: PASS PEA without drainage ("7.8 min") · PASS the pulse holds after CPR stops (drained) (110.5) · PASS no console error or page error ([])

#### Stab wound: tamponade, PEA and pericardiocentesis (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state arrival | loaded "Stab wound: tamponade, PEA and pericardiocentesis" at ×4 |
| 1:00 | HR 97, ART 105/85 (91), SpO2 98, EtCO2 32, RR 13 · state arrival | 1:00 |
| 3:01 | HR 111, ART 98/83 (88), SpO2 99, EtCO2 29, RR 14 · state arrival | 3:00 |
| 6:01 | HR 134, ART 79/68 (72), SpO2 99, EtCO2 24, RR 15 · state arrival | 6:00 |
| 7:46 | HR 45, ART –/– (20), SpO2 99, EtCO2 13, RR 16 · state pea | state "PEA" (sinus on the ECG, no pulse) |
| 8:00 | HR 59, ART –/– (35), SpO2 –, EtCO2 9, RR 17 · state cpr | press **Start CPR, intubate, FiO₂ 1.0** |
| 10:00 | HR 107, ART 50/20 (31), SpO2 99, EtCO2 9, RR 12 · state cprDrained | press **Pericardiocentesis during CPR** |
| 12:01 | HR 118, ART 118/66 (81), SpO2 99, EtCO2 27, RR 12 · state rosc | press **Pulse back: stop CPR** |
| 12:29 | HR 64, ART 119/79 (92), SpO2 99, EtCO2 33, RR 12 · state rosc | 30 s after stopping CPR |
| 12:32 | HR 63, ART 118/78 (91), SpO2 99, EtCO2 35, RR 12 · state roscFluid | press **Crystalloid 500 mL** |
| 15:00 | HR 61, ART 119/76 (90), SpO2 99, EtCO2 39, RR 20 · state roscFluid | end (15:00) |

Alarms raised (scenario clock): 5:55 SPO2 LOW PERFUSION · 7:27 IBP1 STATIC PRESSURE · 7:54 SPO2 NO PULSE · 8:13 SPO2 LOW PERFUSION

Checks: PASS PEA without drainage ("7.8 min") · PASS the pulse holds after CPR stops (drained) (112.2) · PASS no console error or page error ([])

## 6 · Class IV haemorrhage, PEA and resuscitation

#### Class IV haemorrhage, PEA and resuscitation (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state bleeding | loaded "Class IV haemorrhage, PEA and resuscitation" at ×4 |
| 2:01 | HR 81, ART 114/83 (93), SpO2 99, EtCO2 34, RR 12 · state bleeding | 2 min of bleeding |
| 4:00 | HR 96, ART 107/82 (90), SpO2 99, EtCO2 33, RR 12 · state bleeding | 4 min of bleeding |
| 6:00 | HR 120, ART 99/81 (86), SpO2 99, EtCO2 30, RR 13 · state bleeding | 6 min of bleeding |
| 8:00 | HR 140, ART 75/62 (66), SpO2 99, EtCO2 25, RR 13 · state bleeding | 8 min of bleeding |
| 10:01 | HR 97, ART –/– (13), SpO2 99, EtCO2 18, RR 15 · state bleeding | pulse lost (systolic < 20 or static arterial pressure) |
| 10:38 | HR 45, ART –/– (3), SpO2 –, EtCO2 12, RR 15 · state bleeding | monitor alarm "SPO2 NO PULSE" |
| 10:51 | HR 66, ART –/– (13), SpO2 –, EtCO2 7, RR 14 · state resuscitation | press **Start CPR, 2 L and epinephrine** |
| 13:47 | HR 119, ART 121/61 (85), SpO2 99, EtCO2 17, RR 12 · state resuscitation | arterial systolic > 90 (pulse back) |
| 13:50 | HR 115, ART 159/85 (116), SpO2 99, EtCO2 17, RR 12 · state rosc | press **Pulse back: stop CPR** |
| 14:49 | HR 76, ART 135/90 (105), SpO2 99, EtCO2 34, RR 12 · state rosc | 1 min after stopping CPR |

Alarms raised (scenario clock): 8:17 SPO2 LOW PERFUSION · 10:01 IBP1 STATIC PRESSURE · 10:36 SPO2 NO PULSE · 11:04 SPO2 LOW PERFUSION

Checks: PASS pulse lost ("10 min") · PASS circulation returns during CPR ("3 min") · PASS "Pulse back: stop CPR" moves the scenario on ("rosc") · PASS no console error or page error ([])

#### Class IV haemorrhage, PEA and resuscitation (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state bleeding | loaded "Class IV haemorrhage, PEA and resuscitation" at ×4 |
| 2:01 | HR 81, ART 114/83 (93), SpO2 99, EtCO2 34, RR 12 · state bleeding | 2 min of bleeding |
| 4:00 | HR 96, ART 107/82 (90), SpO2 99, EtCO2 33, RR 12 · state bleeding | 4 min of bleeding |
| 6:01 | HR 120, ART 99/81 (86), SpO2 99, EtCO2 30, RR 13 · state bleeding | 6 min of bleeding |
| 8:00 | HR 140, ART 75/62 (66), SpO2 99, EtCO2 25, RR 13 · state bleeding | 8 min of bleeding |
| 10:01 | HR 97, ART –/– (13), SpO2 99, EtCO2 18, RR 15 · state bleeding | pulse lost (systolic < 20 or static arterial pressure) |
| 10:38 | HR 45, ART –/– (3), SpO2 –, EtCO2 12, RR 15 · state bleeding | monitor alarm "SPO2 NO PULSE" |
| 10:51 | HR 66, ART –/– (12), SpO2 –, EtCO2 7, RR 14 · state resuscitation | press **Start CPR, 2 L and epinephrine** |
| 13:48 | HR 117, ART 129/60 (89), SpO2 99, EtCO2 17, RR 12 · state resuscitation | arterial systolic > 90 (pulse back) |
| 13:51 | HR 97, ART 183/82 (128), SpO2 99, EtCO2 17, RR 12 · state rosc | press **Pulse back: stop CPR** |
| 14:50 | HR 75, ART 135/90 (105), SpO2 99, EtCO2 34, RR 12 · state rosc | 1 min after stopping CPR |

Alarms raised (scenario clock): 8:17 SPO2 LOW PERFUSION · 10:01 IBP1 STATIC PRESSURE · 10:36 SPO2 NO PULSE · 11:04 SPO2 LOW PERFUSION

Checks: PASS pulse lost ("10 min") · PASS circulation returns during CPR ("3 min") · PASS "Pulse back: stop CPR" moves the scenario on ("rosc") · PASS no console error or page error ([])

## Clock check: a second scenario in the same page

#### Second scenario load restarts the clock (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Healthy induction" at ×4 |
| 2:01 | HR 71, ART 123/81 (95), SpO2 99, EtCO2 38, RR 14 · state awake | first case running 2 min |
| 0:02 | HR 72, ART –/– (–), SpO2 –, EtCO2 –, RR – · state arrival | second case loaded |
| 0:34 | HR 100, ART 110/89 (96), SpO2 96, EtCO2 34, RR 14 · state arrival | 8 s (wall) later |

Alarms raised (scenario clock): none

Checks: PASS the clock restarts on the second load ("02:04 → 00:04 (time in state 00:04)") · PASS the clock runs after the second load ("00:04 → 00:37") · PASS no console error or page error ([])

#### Second scenario load restarts the clock (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Healthy induction" at ×4 |
| 2:01 | HR 71, ART 123/81 (95), SpO2 99, EtCO2 38, RR 14 · state awake | first case running 2 min |
| 0:02 | HR 72, ART –/– (–), SpO2 –, EtCO2 –, RR – · state arrival | second case loaded |
| 0:34 | HR 100, ART 110/89 (96), SpO2 96, EtCO2 34, RR 13 · state arrival | 8 s (wall) later |

Alarms raised (scenario clock): none

Checks: PASS the clock restarts on the second load ("02:04 → 00:04 (time in state 00:03)") · PASS the clock runs after the second load ("00:04 → 00:37") · PASS no console error or page error ([])
