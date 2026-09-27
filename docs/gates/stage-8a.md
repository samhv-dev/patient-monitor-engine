# Gate 8a — Validation harness (date: 2026-09-27)

Gate question: "Does the harness measure what the brief §9 asks, identically on recorded and generated signals, and does its report hand Ali a calibration queue he can act on?"

**Answer.** Yes, with the gaps listed here. One metric implementation measures the recorded windows (VitalDB 80 windows, MGH/MF 16) and the matched engine runs. The sanity and gate documents, waveform regression, V9 determinism and the Pulse oracle all report into `docs/validation/report.md` / `report.json`. The **43-row calibration queue** (`docs/validation/calibration-queue.md`, 16 red / 27 yellow) is the input to Ali's R44 pass. Red rows are measurement findings, not harness faults: no band was loosened and nothing in the engine was tuned (R45). The first full run did find three harness faults, and each was fixed before the numbers below were taken (see Deviations 1–3).

Branch `stage-8a-validation` (worktree `scratch/wt-stage-8a`), plan `docs/plans/stage-8a-validation.md` (24 tasks, every step ticked). Numbers are from `pnpm validate --seeds 11,12` with `PME_PULSE_DIR` set, commit `7bcf992`, 653 s wall; soak and ticks from the same code; clean-state checks after the final `git merge origin/main`.

## 1. Clean-state checks (CI rule: no dataset needed by the unit tests)

| Check | Result |
|---|---|
| `pnpm typecheck` / `build` / `check-notices` | exit 0 / exit 0 / `check-notices: OK (3 governed files)` |
| `CI=1 pnpm -r test` | exit 0. engine-core **816** + 2 skipped · controller **196** · skins **168** · demo **114** · validation **93** + 6 skipped (Pulse / PULSE_ORACLE_DIR tests) · ventilator **88** · renderer **66** · audio **58**. **1,599 passed**, 8 skipped |
| `@pme/validation` unit tests | 27 files, **6.7 s wall** (19 s test time across workers; budget < 60 s) |
| `PW_SYSTEM_CHROME=1 pnpm test:e2e` | **28 passed** (8.2 min), including `validation-review` and `validation-bedside` |

## 2. Datasets (git-ignored cache; only ids, windows, hashes and statistics committed)

| Dataset | Licence | Count | Note |
|---|---|---|---|
| VitalDB (PhysioNet copy 1.0.0) | CC BY 4.0 | **40 cases, 80 windows** (41 files verified) | ECG II / ART / PLETH / CO2 synchronous |
| MGH/MF Waveform DB 1.0.0 | ODC-By 1.0 | **16 records, 16 windows** (32 files) | no PPG channel (so no recorded V3 rows); CO2 uncalibrated, α report-only |
| PWDB 0.1.0 | PDDL 1.0 | **0 subjects**: not fetched | Zenodo answers Node with HTTP 403 ("unusual traffic") from this network. The run records it and skips the PWDB rise-time band. Not worked around |
| PTB-XL 1.0.3 | CC BY 4.0 | **100 NORM records** → V5 bands; 12 engine captures | |

`datasets:fetch`: `verified 73 files`. NOTICES N-080…N-084 unchanged.

## 3. Morphology: recorded vs engine (brief §9 V1–V5; same metric code on both sides)

50 rows: 🟢 31 · 🟡 9 · 🔴 10. Every 🟡/🔴 row below is a calibration-queue entry. Recorded VitalDB PPG delay is contaminated by device latency, so it is report-only.

| | Band | Group | Recorded median [IQR] (n) | Engine median [IQR] (n) | KS D | W1 | Expected | Source |
|---|---|---|---|---|---|---|---|---|
| 🟡 | V1 | HR other | 150 [123–164] (25670) | 94.5 [88.4–109] (23758) | 0.66 | 53.0 | 130–170 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] |
| 🟡 | V1 | HR 90–110 | 154 [140–180] (12852) | 97.3 [93.9–107] (12774) | 0.82 | 58.1 | 134–174 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] |
| 🟡 | V1 | HR 70–90 | 171 [159–193] (24744) | 106 [96.0–115] (24793) | 0.91 | 70.8 | 151–191 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] |
| 🔴 | V1 | HR 50–70 | 190 [179–209] (18604) | 104 [99.0–108] (17767) | 0.98 | 92.3 | 170–210 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] |
| 🔴 | V1-lit | all | 167 [148–194] (81870) | 102 [93.7–110] (79092) | 0.79 | 67.9 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms |
| 🔴 | V1-lit | vitaldb | 172 [155–198] (67748) | 103 [94.5–110] (64605) | 0.85 | 72.6 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms |
| 🔴 | V1-lit | mghdb | 145 [130–170] (14122) | 95.2 [88.3–122] (14487) | 0.64 | 46.1 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms |
| 🟡 | V2 | HR other | 360 [328–428] (25654) | 258 [250–298] (23723) | 0.68 | 90.2 | 340–380 | brief §9 V2: ±20 ms |
| 🔴 | V2 | HR 90–110 | 428 [386–478] (12848) | 270 [256–288] (12756) | 0.88 | 151 | 408–448 | brief §9 V2: ±20 ms |
| 🔴 | V2 | HR 70–90 | 484 [444–526] (24728) | 282 [262–310] (24768) | 0.95 | 195 | 464–504 | brief §9 V2: ±20 ms |
| 🔴 | V2 | HR 50–70 | 518 [448–554] (18594) | 284 [270–300] (17740) | 0.96 | 213 | 498–538 | brief §9 V2: ±20 ms |
| 🟢 | V2-depth | all | 0.7 [0.6–0.8] (81824) | 0.7 [0.6–0.8] (78987) | 0.11 | 3.6 | 0.55–0.85 | [ENG] notch depth within ±0.15 of the recording |
| 🟢 | V2-depth | vitaldb | 0.7 [0.6–0.8] (67704) | 0.7 [0.6–0.8] (64518) | 0.13 | 4.1 | 0.55–0.85 | [ENG] notch depth within ±0.15 of the recording |
| 🟢 | V2-depth | mghdb | 0.7 [0.5–0.8] (14120) | 0.7 [0.6–0.9] (14469) | 0.26 | 0.8 | 0.57–0.87 | [ENG] notch depth within ±0.15 of the recording |
| 🟢 | V2-kind | all | 0.9 [0.3–1.0] (192) | 1.0 [1.0–1.0] (192) | 0.73 | 0.2 | 0.63–1.23 | [ENG] share of beats with a true notch minimum within ±0.3 of the recording |
| 🟢 | V2-kind | vitaldb | 0.9 [0.7–1.0] (160) | 1.0 [1.0–1.0] (160) | 0.74 | 0.2 | 0.63–1.23 | [ENG] share of beats with a true notch minimum within ±0.3 of the recording |
| 🟡 | V2-kind | mghdb | 0.6 [0.2–1.0] (32) | 1.0 [1.0–1.0] (32) | 0.66 | 0.4 | 0.32–0.92 | [ENG] share of beats with a true notch minimum within ±0.3 of the recording |
| 🟢 | upstroke | all | 791 [590–963] (81870) | 974 [745–1125] (79092) | 0.30 | 181 | 0.70–1.30 | [ENG] max dP/dt within ×0.7–1.3 of the recording at matched pressures |
| 🟢 | upstroke | vitaldb | 777 [580–914] (67748) | 965 [775–1112] (64605) | 0.35 | 199 | 0.70–1.30 | [ENG] max dP/dt within ×0.7–1.3 of the recording at matched pressures |
| 🟢 | upstroke | mghdb | 962 [662–1328] (14122) | 1041 [647–1169] (14487) | 0.21 | 150 | 0.70–1.30 | [ENG] max dP/dt within ×0.7–1.3 of the recording at matched pressures |
| 🟡 | V3-delay | all | 442 [384–473] (55802) | 113 [87.4–122] (79340) | 0.92 | 290 | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) |
| 🟡 | V3-delay | vitaldb | 442 [384–473] (55802) | 115 [90.1–122] (64578) | 0.93 | 288 | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) |
| 🟢 | V3-delay | mghdb | — | 91.5 [80.4–113] (14762) | — | — | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) |
| 🔴 | V3-shape | all | 0.9 [0.8–1.0] (160) | 0.4 [0.2–0.7] (192) | 0.62 | 0.4 | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] |
| 🔴 | V3-shape | vitaldb | 0.9 [0.8–1.0] (160) | 0.4 [0.3–0.7] (160) | 0.65 | 0.4 | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] |
| 🔴 | V3-shape | mghdb | — [—–—] (0) | 0.5 [0.2–0.8] (32) | — | — | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] |
| 🟢 | V3-count | all | 1.0 [1.0–1.0] (160) | 1.0 [1.0–1.0] (192) | 0.51 | 0.0 | 0.98–1.02 | brief §9 V3: PR = HR in sinus |
| 🟢 | V3-count | vitaldb | 1.0 [1.0–1.0] (160) | 1.0 [1.0–1.0] (160) | 0.51 | 0.0 | 0.98–1.02 | brief §9 V3: PR = HR in sinus |
| 🟢 | V3-count | mghdb | — [—–—] (0) | 1.0 [1.0–1.0] (32) | — | — | 0.98–1.02 | brief §9 V3: PR = HR in sinus |
| 🟢 | V4 | all | 111 [108–116] (10960) | 106 [105–107] (13202) | 0.67 | 6.1 | 100–110 | R39 item 6: normal α 105° (100–110) on the 25 mmHg/s axis |
| 🟢 | V4 | vitaldb | 111 [108–116] (10960) | 106 [105–107] (11044) | 0.67 | 6.3 | 100–110 | R39 item 6: normal α 105° (100–110) on the 25 mmHg/s axis |
| 🟢 | V4 | mghdb | — | 107 [106–107] (2158) | — | — | 100–110 | R39 item 6: normal α 105° (100–110) on the 25 mmHg/s axis |
| 🟢 | V4-rec | all | 111 [108–116] (10960) | 106 [105–107] (13202) | 0.67 | 6.1 | 106–116 | [ENG] α within ±5° of the VitalDB (sidestream, Primus) recording |
| 🟢 | V4-rec | vitaldb | 111 [108–116] (10960) | 106 [105–107] (11044) | 0.67 | 6.3 | 106–116 | [ENG] α within ±5° of the VitalDB (sidestream, Primus) recording |
| 🟢 | PPV | all | 7.3 [3.9–22.2] (160) | 8.2 [4.0–13.8] (190) | 0.21 | 20.3 | 4.28–10.3 | [ENG] PPV within ±3 points of the recording at matched ventilator settings |
| 🟢 | PPV | vitaldb | 7.3 [3.9–22.2] (160) | 8.1 [4.3–12.5] (158) | 0.22 | 20.6 | 4.28–10.3 | [ENG] PPV within ±3 points of the recording at matched ventilator settings |
| 🟢 | SPV | all | 4.9 [3.3–10.1] (160) | 2.8 [1.6–5.1] (190) | 0.38 | 6.4 | 1.93–7.93 | [ENG] SPV within ±3 mmHg of the recording |
| 🟢 | SPV | vitaldb | 4.9 [3.3–10.1] (160) | 2.5 [1.6–4.5] (158) | 0.42 | 6.7 | 1.93–7.93 | [ENG] SPV within ±3 mmHg of the recording |
| 🟢 | HR-avg | all | 0.8 [0.4–4.7] (23134) | 0.3 [0.1–0.4] (55685) | 0.54 | 6.6 | 0.00–2.00 | brief §6.1: displayed HR within 2 bpm of the 12-RR average at steady state [ENG] |
| 🟢 | HR-avg | vitaldb | 0.8 [0.4–4.7] (23134) | 0.2 [0.1–0.4] (46369) | 0.55 | 7.0 | 0.00–2.00 | brief §6.1: displayed HR within 2 bpm of the 12-RR average at steady state [ENG] |
| 🟢 | HR-avg | mghdb | — | 0.3 [0.1–0.5] (9316) | — | — | 0.00–2.00 | brief §6.1: displayed HR within 2 bpm of the 12-RR average at steady state [ENG] |
| 🟢 | NIBP-bias | all | 1.1 [-9.0–4.6] (10) | -0.1 [-2.8–2.4] (926) | 0.39 | 6.3 | -5.00–5.00 | Stage 2 acceptance 9 / ISO 81060-2 style: bias ≤ 5 mmHg |
| 🟢 | NIBP-bias | vitaldb | 1.1 [-9.0–4.6] (10) | -0.1 [-2.8–2.4] (777) | 0.39 | 6.4 | -5.00–5.00 | Stage 2 acceptance 9 / ISO 81060-2 style: bias ≤ 5 mmHg |
| 🟢 | NIBP-bias | mghdb | — | 0.1 [-2.9–2.5] (149) | — | — | -5.00–5.00 | Stage 2 acceptance 9 / ISO 81060-2 style: bias ≤ 5 mmHg |
| 🟢 | V5-QTc | all | — | 377 [374–379] (12) | — | — | 339–396 | PTB-XL NORM p10–p90 by the same method (filled at run time) |
| 🟢 | V5-QTc | vitaldb | — | 377 [374–379] (12) | — | — | 339–396 | PTB-XL NORM p10–p90 by the same method (filled at run time) |
| 🟡 | V5-PR | all | — | 217 [210–220] (12) | — | — | 140–216 | PTB-XL NORM p10–p90 by the same method (filled at run time) |
| 🟡 | V5-PR | vitaldb | — | 217 [210–220] (12) | — | — | 140–216 | PTB-XL NORM p10–p90 by the same method (filled at run time) |
| 🟢 | V5-QRS | all | — | 61.0 [52.0–62.0] (12) | — | — | 44.0–76.0 | PTB-XL NORM p10–p90 by the same method (filled at run time) |
| 🟢 | V5-QRS | vitaldb | — | 61.0 [52.0–62.0] (12) | — | — | 44.0–76.0 | PTB-XL NORM p10–p90 by the same method (filled at run time) |

Headline findings for the calibration pass:
- **R → radial upstroke (V1)**: engine ≈ 95–106 ms against 145–190 ms recorded, in every HR bin (red at HR 50–70 and for the literature band 150–220).
- **Notch timing (V2)**: engine 258–284 ms against 360–518 ms recorded.
- **PPG ↔ ABP shape (V3-shape)**: engine r 0.4–0.5 against 0.9 recorded.
- **PR interval** 217 ms, 1 ms above the PTB-XL p90.
- Now green: notch depth, notch kind (VitalDB), upstroke slope, α, PPV/SPV, HR averaging, NIBP bias, QTc and QRS. The planning prototype had PPV/SPV and notch kind red; both are green after the Stage 7 merges.

## 4. Segment validation: sanity set and gate numbers

38 documents (31 sanity, 7 gates): **28 graded, 10 not measurable**. 63 targets: 🟢 46 · 🟡 14 · 🔴 3.

| | Document / segment / target | Measured | Expected | Source |
|---|---|---|---|---|
| 🟢 | or-induction-hypotension / awake / hr-baseline | 78.0 | = 78.0 ±10 % | scenario patient.baseline.hr 78 |
| 🟢 | or-induction-hypotension / awake / displayed-hr | 78.3 | 75.0–81.0 | brief §6.1: displayed HR within 3 bpm of truth at steady state [ENG] |
| 🟢 | or-induction-hypotension / induced / enters-induction | 0.0 | < 1.00 | manual Induce acts on the same poll (6b driver) |
| 🟢 | or-induction-hypotension / hypotension / enters-hypotension | 0.0 | 0.00–2.00 | scenario: afterS 60 after induction (t = 90 s) |
| 🟢 | or-induction-hypotension / hypotension / hr-rises | 122 | → 122 ±10 % | scenario: hr → 122 over 90 s, sigmoid |
| 🟢 | or-induction-hypotension / hypotension / hr-above-awake | 122 | > 101 | reflex tachycardia ≥ 30 % above awake [ENG] |
| 🟢 | or-induction-hypotension / profound / enters-profound | 11.0 | < 120 | scenario: HR ≥ 115 for 20 s → profound |
| 🟢 | s1-phenylephrine / base / steady-map | 92.0 | 60.0–110 | baseline MAP physiological [ENG] |
| 🟢 | s1-phenylephrine / peak / map-rise | 114 | 109–119 | brief §4.9 1: MAP +15–25 within 30–60 s |
| 🟢 | s1-phenylephrine / peak / hr-fall | 57.7 | 53.0–63.0 | brief §4.9 1: reflex HR −5–15 |
| 🟢 | s2-class2-haemorrhage / base / pp0 | 41.5 | 30.0–70.0 | baseline PP [ENG] |
| 🟡 | s2-class2-haemorrhage / class2 / hr | 81.6 | 100–120 | brief §4.9 2: HR 100–120 |
| 🟢 | s2-class2-haemorrhage / class2 / sbp-held | 109 | 108–126 | brief §4.9 2: SBP near normal (R45 b) |
| 🟢 | s2-class2-haemorrhage / class2 / pp-narrow | 29.8 | < 37.4 | brief §4.9 2: PP narrowed |
| 🟢 | s3-propofol-induction / base / steady-map | 92.0 | 60.0–110 | baseline MAP physiological [ENG] |
| 🔴 | s3-propofol-induction / 2min / map-70pct | 84.8 | = 64.4 ±15 % | brief §4.9 3: MAP ≈ 70 % of baseline at 2 min |
| 🟡 | s3-propofol-induction / 2min / hr-little | 79.9 | < 75.0 | brief §4.9 3: little HR rise |
| 🟢 | s4-class-i / late / hr | 75.0 | 60.0–100 | brief §4.9 4 / ATLS class I: HR 60–100 |
| 🟡 | s4-class-iii / late / hr | 107 | 120–140 | brief §4.9 4 / ATLS class III: HR 120–140 |
| 🟢 | s4-class-iii / late / sbp | 98.4 | < 100 | brief §4.9 4 / ATLS class III: SBP decreased |
| 🟡 | s4-class-iv / late / hr | 134 | 140–180 | brief §4.9 4 / ATLS class IV: HR 140–180 |
| 🟢 | s4-class-iv / late / sbp | 73.2 | < 90.0 | brief §4.9 4 / ATLS class IV: SBP decreased |
| 🟢 | s4-class-iv / late / pp | 13.4 | < 25.0 | brief §4.9 4: class IV PP < 25 |
| 🟢 | s6-apnoea-preoxygenated / apnoea / t90 | 494 | 390–570 | brief §4.9 6: SaO2 90 % at 8 ± 1.5 min (Benumof) |
| 🟢 | s6-apnoea-room-air / apnoea / true-t90 | 38.0 | 35.0–60.0 | R39-1: true SaO2 90 % at 45 s (35–60) |
| 🟢 | s6-apnoea-room-air / apnoea / shown-t90 | 61.0 | 45.0–90.0 | R39-1: displayed SpO2 90 % at 60 s (45–90) |
| 🟢 | s7-apnoea-child / apnoea / t90 | 141 | 130–190 | brief §4.9 7: 160 ± 30 s |
| 🟢 | s8-co2-apnoea-first-breath / before / et0 | 38.3 | 30.0–45.0 | normocapnia [ENG] |
| 🟢 | s8-co2-apnoea-first-breath / after / first | 53.3 | 47.3–53.3 | Stage 3 acc. 4: first breath +9 to +15 mmHg |
| 🟢 | s9-witnessed-vf / base / et0 | 39.2 | 30.0–45.0 | normocapnia [ENG] |
| 🟢 | s9-witnessed-vf / arrest / abp-flat | 9.0 | 0.00–20.0 | Stage 2 acc. 6: pulseless → flat (displayed ABP < 20) within 20 s |
| 🟢 | s9-witnessed-vf / arrest / etco2-gone | 18.0 | 0.00–30.0 | Stage 3: EtCO2 < 5 within 30 s |
| 🟢 | t12-massive-pe / base / et0 | 39.1 | 30.0–45.0 | normocapnia [ENG] |
| 🔴 | t12-massive-pe / pe / etco2 | 38.0 | 20.0–25.0 | tables §7 12: EtCO2 35 → 20–25 within 3 breaths |
| 🟡 | t12-massive-pe / pe-late / papm | 24.0 | 30.0–45.0 | tables §7 12: mPAP 30–40, never > 45 (systolic proxy) [ENG] |
| 🟡 | t12-massive-pe / pe-late / spo2 | 100.0 | 85.0–92.0 | tables §7 12: SpO2 85–92 on FiO2 1 |
| 🟢 | t13-tension-ptx / base / steady-map | 91.8 | 60.0–110 | baseline MAP physiological [ENG] |
| 🟢 | t13-tension-ptx / 3min / sbp | 72.1 | < 90.0 | tables §7 13: SBP < 90 by 3 min |
| 🟢 | t13-tension-ptx / 3min / cvp | 21.7 | 12.8–22.8 | tables §7 13: CVP +5–15 |
| 🟢 | t14-tamponade / equalised / cvp | 17.9 | 15.0–20.0 | tables §7 14: CVP ≈ PAD ≈ PCWP 15–20 |
| 🟡 | t14-tamponade / equalised / pawp | 22.4 | 15.0–20.0 | tables §7 14 |
| 🟡 | t17a-class3-no-bb / late / hr | 98.0 | 120–140 | tables §7 17a: HR 120–140 |
| 🟡 | t17a-class3-no-bb / late / sbp | 95.1 | 80.0–90.0 | tables §7 17a: SBP 80–90 |
| 🟢 | t17a-class3-no-bb / late / pp | 20.9 | 20.0–25.0 | tables §7 17a: PP 20–25 |
| 🟢 | t21-mh / base / et0 | 42.3 | 30.0–45.0 | normocapnia [ENG] |
| 🟡 | t21-mh / 10min / etco2 | 73.5 | 51.0–69.0 | tables §7 21: EtCO2 40 → 60 by 10 min (±15 %) |
| 🟢 | t21-mh / 20min / rising | 115 | > 88.5 | tables §7 21: keeps rising 3–5 mmHg/min |
| 🟡 | t24-edmark-fio2-1 / apnoea / t90 | 494 | 329–493 | tables §7 24: 411 s ±20 % |
| 🟡 | t24-edmark-fio2-0.8 / apnoea / t90 | 385 | 242–364 | tables §7 24: 303 s ±20 % |
| 🟡 | t24-edmark-fio2-0.6 / apnoea / t90 | 267 | 170–256 | tables §7 24: 213 s ±20 % |
| 🔴 | t25-rocuronium-sugammadex / recovery / rr-back | 0.0 | 60.0–240 | tables §7 25: spontaneous effort returns within ≈ 2.2 min of sugammadex [ENG] |
| 🟢 | g2-displayed-abp / steady / sys | 121 | 117–124 | gate 2 acc. 1: 120.8 (±3) |
| 🟢 | g2-displayed-abp / steady / dia | 80.3 | 77.0–84.0 | gate 2 acc. 1: 80.8 (±3) |
| 🟢 | g2-displayed-abp / after-ramp / sys | 90.6 | 88.0–94.0 | gate 2 acc. 3: 91.2 (±3) |
| 🟢 | g2-displayed-abp / after-ramp / dia | 50.3 | 49.0–55.0 | gate 2 acc. 3: 52.2 (±3) |
| 🟢 | g3-rr-three-ways / steady / awrr | 14.0 | 13.5–14.5 | gate 3: awRR 14.0 |
| 🟢 | g3-rr-three-ways / steady / rr | 14.0 | 13.0–15.0 | gate 3: impedance RR 14.0 |
| 🟢 | g3-peep-map / peep5 / map | 96.1 | 94.0–104 | gate 3: MAP ≈ 97 at PEEP 5 (displayed radial mean) [ENG band] |
| 🟢 | g3-peep-map / peep15 / drop | 82.7 | 79.1–85.1 | gate 3: PEEP 5 → 15 drops MAP by 14 (97 → 83) ± 3 |
| 🟢 | g3-disconnect-apnoea-alarm / disconnected / alarm | 19.4 | 15.0–22.0 | gate 3 acc. 3: raised 16.9 s after the event = 20 ± 1 s after the last breath (breath phase adds ≤ 5 s) |
| 🟢 | g4b-asystole-saadat-like / arrest / delay | 9.7 | 9.00–11.5 | gate 4b: asystole 10 s on saadat-like (alarm delays ±1 s, brief §9 V7) |
| 🟢 | g4b-asystole-philips-like / arrest / delay | 3.7 | 3.00–5.50 | gate 4b: asystole 4 s on philips-like (alarm delays ±1 s, brief §9 V7) |
| 🟡 | g3-cpr-etco2 / cpr / etco2 | 16.3 | 17.0–23.0 | R39-2: default quality 0.8 → ≈ 20 mmHg |

Not measurable on this build (decision 8, plus Deviation 3):

| Document | Needs | Refused command |
|---|---|---|
| t10-as-cad-propofol — AS + CAD + HTN, propofol 1.5 mg/kg | 7a, 7g | patient profile: conditions ["aorticStenosis","cad3v","htn"]: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t11-chronic-mr-fluid — Chronic MR + 1.5 L crystalloid | 7a, 7b, 7c | patient profile: conditions ["mitralRegurgitationChronic"]: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t15-rv-infarct — RV infarct (inferior STEMI, Ees_RV ×0.35) | 7a | patient profile: conditions ["rvInfarct"]: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t16-septic-shock-warm — Septic shock, warm phase | 7f | patient profile: conditions ["sepsisWarm"]: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t17b-class3-bb — Class III haemorrhage, chronic β-blocker | 7a, 7c, 7g | patient profile: conditions ["betaBlockerChronic"]: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t18-htn-hypocapnia-cbf — Hypertensive 75 y at MAP 65, PaCO2 40 → 25 | 7d | patient profile: conditions ["htn"]: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t19-tbi-haematoma — TBI, expanding haematoma | 7d | patient profile: conditions ["tbiHaematoma"]: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t20-low-flow-oliguria — Low-flow oliguria, dobutamine | 7d, 7g | patient profile: conditions ["hfref"]: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t22-term-spinal — Term pregnancy, spinal, supine | 7a, 7f | patient profile: pregnancy 39 weeks: not expressible in pme-scenario/1 until the R22 profile schema lands |
| t23-term-apnoea — Term pregnancy, GA apnoea after preoxygenation | 7b | patient profile: pregnancy 39 weeks: not expressible in pme-scenario/1 until the R22 profile schema lands |

**Rows that depend on stages not yet on main.** These are graded because the engine accepts their commands, but their owning stage has not merged. Read them as provisional:
- s2 and s4 (haemorrhage, `requires` 7a + 7c): HR 82 / 107 / 134 against 100–120 / 120–140 / 140–180.
- t17a (7a + 7c).
- t25 (rocuronium → sugammadex, 7f + 7g): `rr-back` 0 s, i.e. breathing never stopped, because 7f's neuromuscular effect on ventilation is absent.

## 5. Waveform regression (2 % per sample) and determinism (V9)

- **After merging main (Stages 7a, 7b, 7g, 7x), before rebaselining, red channels were:**
  - `abp` in sinus-75, afib-110, vf-coarse and hypovolaemia-ppv (Stage 7a circulation)
  - `pleth` in sinus-75, afib-110 and hypovolaemia-ppv (Stage 7a)
  - `co2` in sinus-75 and bronchospasm (Stage 7b lung/gas)
  - ECG channels were unchanged.
- The rebaseline was committed on its own (`978b653`), with **108 golden hashes changed**.
- Now: **13/13 channels green** (0 samples outside).
- Determinism: **216 runs, 0 non-deterministic**, 0 changed against the committed golden file.

## 6. Pulse oracle (R34; annex §C/§D)

Build SHA-256 `a3be71adfd49bd53eaec7c5e9c7e74ec0878ad0509e545b73ca927478ff6ff74` (Pulse 4.3.2 wasm, `research/pulse-spike/web`, never committed). 13 rows: 🟢 6 · 🟡 4 · 🔴 3.

| | Scenario / check | Ours | Pulse | Expected | Note |
|---|---|---|---|---|---|
| 🟢 | O1 / hr | 72.00 | 71.14 | ±5 % of Pulse | 1.2 % |
| 🟡 | O1 / map | 87.33 | 95.38 | ±5 % of Pulse | 8.4 % |
| 🟢 | O1 / sao2 | 96.56 | 97.45 | ±10 % of Pulse | 0.9 % |
| 🟢 | O1 / etco2 | 36.34 | 36.72 | ±10 % of Pulse | 1.0 % |
| 🟡 | O1 / rr | 15.00 | 12.24 | ±10 % of Pulse | 22.5 % |
| 🟡 | O1 / cvp | 6.00 | 4.73 | ±10 % of Pulse | 26.8 % |
| 🔴 | O2 / hr-delta | 14.03 | 47.70 | ±20 % of Pulse | 70.6 % |
| 🔴 | O2 / map-delta | -3.75 | -16.34 | ±20 % of Pulse | 77.0 % |
| 🟡 | O2 / lactate | — | — | n/a | Pulse aborted after 1570 s (wasm abort); no Pulse value at 1800 s |
| 🔴 | O4 / map-delta | -7.85 | -27.91 | ±15 % of Pulse | 71.9 % |
| 🟢 | O4 / hr-150s | 81.36 | 48.94 | Pulse < 58 (D8) | known Pulse disagreement D8 |
| 🟢 | O-VF / map-60s | 11.33 | 19.43 | ±50 % of Pulse | 41.7 % |
| 🟢 | O-VF / ph-30min | — | 10.58 | Pulse > 7.45 (D1) | known Pulse disagreement D1 |

- **Oracle gap, O2: Pulse aborts at 1,570 s.**
  - Reproduced on Pulse alone, without our engine: StandardMale with RightLeg haemorrhage severity 0.8, stepped in 10 s chunks. Blood volume falls from 5.30 L to 2.88 L; MAP holds near 41–43 mmHg until 1,550 s, then drops to 37 and then 27.5 mmHg; at 1,570 s the wasm throws `RuntimeError: Aborted(undefined)` (an uncaught C++ exception at exsanguination).
  - The harness now records the abort time and marks later rows 🟡 "Pulse aborted after 1570 s". Only the 1,800 s lactate row (D2) is affected. The 600 s HR/MAP deltas are compared normally.
- O2 and O4 are red on magnitude. At 600 s we have HR +14 / MAP −3.8 against Pulse's +48 / −16 (bleed 1,100 mL over 10 min). After propofol our MAP falls 7.9 against Pulse's 28. These are calibration entries, not tuned (R45). 7c (haemorrhage physiology) is not on main.
- D1 (Pulse pH > 7.45 after 30 min of VF) and D8 (Pulse HR < 58 after propofol) are still present in Pulse.
- Backlog unchanged: O3, O5–O12.

## 7. Performance

| Check | Result | Budget |
|---|---|---|
| Soak, 60 min at ×1, main-thread path | heap after forced GC 5.8 MB at minute 0, then 7.06–7.75 MB throughout; **growth from minute 5: +0.6 MB**; sim time **3,601.2 s in 60 min** (ratio 1.00); **no apnoea alarm** | ≤ 5 MB; ≥ 95 %; none |
| Frame intervals, worker path, `?fps=60` | n 3,601: p50 **16.7**, p95 **16.7**, p99 **16.8** ms; all < 17 ms | p95 < 25 ms |
| Frame intervals, worker path, `?fps=30` | n 3,600: p50 16.7, p95 16.7, p99 16.8 ms; all < 17 ms | p95 < 50 ms |
| Worker tick (Node, 600 s, 30,000 ticks) | p50 **0.42**, p95 **0.45**, p99 **0.53**, max 1.63 ms; heap +25.7 MB over the bench (no forced GC between ticks) | p99 ≪ 6 ms |
| iPad (A14+), projector PC | not run: a manual step for Ali (`docs/validation/perf/README.md`) | |

Soak alarms (steady ventilated adult):
- `ART_D_LOW` and `EtCO2_LOW` at 1 s (start-up).
- `CVP_M_HIGH` raised **43 times** across the hour, about every 10–300 s: the 7a CVP sits on the default high limit.
- `EtCO2_HIGH` once, at 1,453 s.

These are queued as an alarm-limit/CVP calibration note, not a harness fault.

The 30 fps histogram records `requestAnimationFrame` intervals, so it reads 16.7 ms even when the renderer draws every other frame. It proves the main thread is never blocked. It does not measure the 30 fps draw cadence (see Deviations).

## 8. Calibration queue (R44): 43 rows

| Suite | 🔴 | 🟡 |
|---|---|---|
| morphology | 10 | 9 |
| segments (sanity + gates) | 3 | 14 |
| oracle | 3 | 4 |
| **total** | **16** | **27** |

## 9. Human steps for the gate (not executor steps)

- **Blind realism review: ready; Ali to run at the gate.**
  - `review:build --per-channel 20` built a 160-clip bundle (session `r20260927-bdfb`, in the git-ignored cache; `key.json` is kept apart).
  - The page loads it and draws clips through the monitor's SweepLane (screenshot `review-clip`).
  - A second clinician repeats the review with the same bundle.
- **Saadat bedside checklist: ready; Ali to run at the gate.** The page lists 10 items. The engine demo for the asystole delay reads **ASYSTOLE after 10.0 s** on the saadat-like skin (gate 4b: 10 s). Results go to `bedside:apply` → skin provenance.
- **iPad / projector frame readings**: manual (section 7).

## 10. Deviations from the plan

1. **Pulse abort handling** (`1947cef`). Pulse aborts at 1,570 s in O2 (section 6). `runOracle` now steps Pulse in 10 s chunks, catches a wasm abort, records `pulseAbortedS` and marks later rows 🟡. A Pulse *rejection* of an action still throws. Unit test uses a fake Pulse that aborts after 15 s.
2. **Oracle O2/O4 ran our engine in MANUAL** (`50e5e60`). The first full run showed O2 HR/MAP deltas and the O4 MAP delta at exactly **0.00**: `oursDoc` never set the scenario mode, so the Stage 7 physiology under comparison was not running. O2 and O4 now declare `mode: 'modeled'`. O1 and O-VF stay MANUAL (baseline targets; O-VF's comment). Test: a 200 s O4 run moves our MAP by < −3.
3. **Profile-only documents were graded on the wrong patient** (`7bcf992`). The patient profile (conditions, pregnancy) rode only in scenario notes, so the first full run graded the default healthy adult against, for example, t15 RV infarct (CVP 4.4, MAP 92) and t16 septic shock (MAP 92, HR 68). Such documents now carry `profile` and are **not measurable** until the R22 profile schema reaches pme-scenario/1. The engine already has a 7a profile API (`PatientSpec.conditions`); wiring the documents to it is a follow-up. First run: 56 queued, 23 red; after the fix: 43 queued, 16 red.
4. **PWDB not fetched** (`1b5ac3f`, earlier executor): Zenodo 403 from this network. The run continues and the PWDB rise-time band is skipped.
5. **Tick-bench unit test** keeps only the p50 bound (`c9bc809`). The p99 gate is the 600 s `perf:ticks` run (0.53 ms).
6. **30 fps histogram** measures rAF intervals (section 7). Plan unchanged; the limitation is recorded here.
7. **Morphology groups**: MGH/MF has no PPG channel, so V3 rows have no recorded MGH/MF side. V3-shape `mghdb` is graded on the engine alone against r ≥ 0.8.

## 11. Partition and licence statements

- `git diff --stat origin/main -- packages/engine-core packages/renderer/src packages/controller/src packages/skins` prints nothing. No engine, renderer, controller or skin file was changed by 8a.
- `git ls-files | grep -Ei '\.(vital|dat|hea|atr)$'` prints nothing: no raw record is committed. pulse.wasm/js/data are not committed.

## 12. Screenshots (`docs/gates/stage-8a/`, all ≤ 60 KB)

- **review-clip** (22 KB): the blind review page with the real 160-clip bundle loaded, clip 1 (CO2) drawn by the monitor's sweep; the source is hidden.
- **bedside-asystole** (45 KB): the bedside checklist after the asystole engine demo: "ASYSTOLE after 10.0 s".
- **perf-60fps** (56 KB): `validation-perf.html?fps=60`, the 8-lane load used for the frame histograms and the soak.

## Needs a ruling (for Ali / the orchestrator)

1. **Calibration queue**: the 16 red / 27 yellow rows (section 8) are the R44 input. The biggest morphology gaps are timing: R→upstroke about 65 ms short and notch about 200 ms early. The PPG↔ABP shape correlation is 0.4 against 0.9.
2. **Profile documents** (Deviation 3): wire the ten documents to the 7a/7b profile API through a pme-scenario/1 extension (R22), or keep them not measurable until 7c–7f land.
3. **PWDB**: fetch by hand from a browser into the cache (the manifest MD5 still verifies it), or accept the rise-time band as unmeasured.
4. **CVP_M_HIGH flapping** in the steady soak patient (43 raises in an hour): an alarm-limit default or 7a CVP question.
