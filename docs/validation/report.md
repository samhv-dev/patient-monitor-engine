# Validation report

Generated 2026-09-27T04:13:20.412Z by `pnpm validate` on commit `7bcf992` (engine 0.0.0); 653 s wall. Suites: morphology, intervals, sanity, gates, regression, determinism, oracle; seeds 11, 12.

**Summary:** 🟢 96 · 🟡 27 · 🔴 16 graded rows; 10 documents not measurable on this build; calibration queue 43 rows. Gating failures: 16.

Grades (R40): 🟢 inside the evidence band (or within 10 % of a point target); 🟡 misses by < 30 %; 🔴 misses by ≥ 30 % or not measured. Red gates the run; yellow is reported and queued for calibration (R44).

## Datasets and attribution

| Dataset | Licence | Windows | Attribution |
|---|---|---|---|
| VitalDB (PhysioNet copy) | CC BY 4.0 | 80 | Lee HC, Park Y, Yoon SB, Yang SM, Park D, Jung CW. VitalDB, a high-fidelity multi-parameter vital signs database in surgical patients. Sci Data 9:279 (2022). Data from the PhysioNet copy, v1.0.0. |
| MGH/MF Waveform Database | ODC-By 1.0 | 16 | Welch J, Ford P, Teplick R, Rubsamen R. The Massachusetts General Hospital-Marquette Foundation Hemodynamic and Electrocardiographic Database -- Comprehensive collection of critical care waveforms. J Clin Monitoring 7(1):96-97 (1991). PhysioNet v1.0.0. |
| Pulse Wave Database (PWDB) | PDDL 1.0 | 0 (not fetched: GET https://zenodo.org/api/records/2633175/files/pwdb_pw_indices.csv/content → 403) | Charlton PH, Mariscal Harana J, Vennin S, Li Y, Chowienczyk P, Alastruey J. Modeling arterial pulse waves in healthy aging: a database for in silico evaluation of hemodynamics and pulse wave indexes. Am J Physiol Heart Circ Physiol 317:H1062-H1085 (2019). |
| PTB-XL | CC BY 4.0 | 100 | Wagner P, Strodthoff N, Bousseljot R, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset (version 1.0.3). PhysioNet (2022). |

Raw records stay in the git-ignored cache; this report holds derived statistics only (brief §8).

## Morphology: recorded vs engine (brief §9 V1–V5)

Same metric code on both sides; engine runs matched to each recorded window (HR, BP, site, ventilator, EtCO2).

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

V5 interval bands come from 100 PTB-XL NORM records measured with the engine's method; 12 engine captures.

## Segment validation: sanity checks and gate numbers

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

### Not measurable on this build (decision 8)

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

## Waveform regression (2 % per sample)

| | Case / channel | Samples outside | Max rel. error | RMS |
|---|---|---|---|---|
| 🟢 | sinus-75 / ecgII | 0/2500 | 0.00 % | 0.00e+0 |
| 🟢 | sinus-75 / V5 | 0/2500 | 0.00 % | 0.00e+0 |
| 🟢 | sinus-75 / abp | 0/625 | 0.00 % | 0.00e+0 |
| 🟢 | sinus-75 / pleth | 0/625 | 0.00 % | 0.00e+0 |
| 🟢 | sinus-75 / co2 | 0/313 | 0.00 % | 0.00e+0 |
| 🟢 | afib-110 / ecgII | 0/2500 | 0.00 % | 0.00e+0 |
| 🟢 | afib-110 / abp | 0/625 | 0.00 % | 0.00e+0 |
| 🟢 | afib-110 / pleth | 0/625 | 0.00 % | 0.00e+0 |
| 🟢 | vf-coarse / ecgII | 0/2500 | 0.00 % | 0.00e+0 |
| 🟢 | vf-coarse / abp | 0/625 | 0.00 % | 0.00e+0 |
| 🟢 | bronchospasm / co2 | 0/313 | 0.00 % | 0.00e+0 |
| 🟢 | hypovolaemia-ppv / abp | 0/625 | 0.00 % | 0.00e+0 |
| 🟢 | hypovolaemia-ppv / pleth | 0/625 | 0.00 % | 0.00e+0 |

## Determinism (V9)

216 runs; non-deterministic: none; changed vs the committed golden file (informational): 0.

## Pulse oracle (R34; annex §C/§D)

Build: `a3be71adfd49bd53…`.

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

Backlog: O3 crystalloid 1 L; O5 norepinephrine 0.1 µg/kg/min; O6 apnoea after FiO2 1.0; O7 PEEP 5 → 15 (PCV); O8 FiO2 1.0 for 60 min; O9 hypothermia 33 °C; O10 glucose/insulin; O11 renal MAP 60; O12 hepatic clearance in haemorrhage.

## Calibration queue (R44)

43 rows outside their band — the input to Ali's calibration pass. Also written to `calibration-queue.md`.

| | Suite | Row | Measured | Expected | Source | Ali: decision |
|---|---|---|---|---|---|---|
| 🔴 | morphology | V1 · HR 50–70 | engine 104 vs recorded 190 | 170–210 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] | |
| 🔴 | morphology | V1-lit · all | engine 102 vs recorded 167 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms | |
| 🔴 | morphology | V1-lit · vitaldb | engine 103 vs recorded 172 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms | |
| 🔴 | morphology | V1-lit · mghdb | engine 95.2 vs recorded 145 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms | |
| 🔴 | morphology | V2 · HR 90–110 | engine 270 vs recorded 428 | 408–448 | brief §9 V2: ±20 ms | |
| 🔴 | morphology | V2 · HR 70–90 | engine 282 vs recorded 484 | 464–504 | brief §9 V2: ±20 ms | |
| 🔴 | morphology | V2 · HR 50–70 | engine 284 vs recorded 518 | 498–538 | brief §9 V2: ±20 ms | |
| 🔴 | morphology | V3-shape · all | engine 0.4 vs recorded 0.9 | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] | |
| 🔴 | morphology | V3-shape · vitaldb | engine 0.4 vs recorded 0.9 | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] | |
| 🔴 | morphology | V3-shape · mghdb | engine 0.5 vs recorded — | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] | |
| 🔴 | oracle | O2/hr-delta | ours 14.03 · Pulse 47.70 | ±20 % of Pulse | 70.6 % | |
| 🔴 | oracle | O2/map-delta | ours -3.75 · Pulse -16.34 | ±20 % of Pulse | 77.0 % | |
| 🔴 | oracle | O4/map-delta | ours -7.85 · Pulse -27.91 | ±15 % of Pulse | 71.9 % | |
| 🔴 | segments | s3-propofol-induction/2min/map-70pct | 84.8 | = 64.4 ±15 % | brief §4.9 3: MAP ≈ 70 % of baseline at 2 min | |
| 🔴 | segments | t12-massive-pe/pe/etco2 | 38.0 | 20.0–25.0 | tables §7 12: EtCO2 35 → 20–25 within 3 breaths | |
| 🔴 | segments | t25-rocuronium-sugammadex/recovery/rr-back | 0.0 | 60.0–240 | tables §7 25: spontaneous effort returns within ≈ 2.2 min of sugammadex [ENG] | |
| 🟡 | morphology | V1 · HR other | engine 94.5 vs recorded 150 | 130–170 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] | |
| 🟡 | morphology | V1 · HR 90–110 | engine 97.3 vs recorded 154 | 134–174 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] | |
| 🟡 | morphology | V1 · HR 70–90 | engine 106 vs recorded 171 | 151–191 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] | |
| 🟡 | morphology | V2 · HR other | engine 258 vs recorded 360 | 340–380 | brief §9 V2: ±20 ms | |
| 🟡 | morphology | V2-kind · mghdb | engine 1.0 vs recorded 0.6 | 0.32–0.92 | [ENG] share of beats with a true notch minimum within ±0.3 of the recording | |
| 🟡 | morphology | V3-delay · all | engine 113 vs recorded 442 | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) | |
| 🟡 | morphology | V3-delay · vitaldb | engine 115 vs recorded 442 | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) | |
| 🟡 | morphology | V5-PR · all | engine 217 vs recorded — | 140–216 | PTB-XL NORM p10–p90 by the same method (filled at run time) | |
| 🟡 | morphology | V5-PR · vitaldb | engine 217 vs recorded — | 140–216 | PTB-XL NORM p10–p90 by the same method (filled at run time) | |
| 🟡 | oracle | O1/map | ours 87.33 · Pulse 95.38 | ±5 % of Pulse | 8.4 % | |
| 🟡 | oracle | O1/rr | ours 15.00 · Pulse 12.24 | ±10 % of Pulse | 22.5 % | |
| 🟡 | oracle | O1/cvp | ours 6.00 · Pulse 4.73 | ±10 % of Pulse | 26.8 % | |
| 🟡 | oracle | O2/lactate | ours — · Pulse — | n/a | Pulse aborted after 1570 s (wasm abort); no Pulse value at 1800 s | |
| 🟡 | segments | s2-class2-haemorrhage/class2/hr | 81.6 | 100–120 | brief §4.9 2: HR 100–120 | |
| 🟡 | segments | s3-propofol-induction/2min/hr-little | 79.9 | < 75.0 | brief §4.9 3: little HR rise | |
| 🟡 | segments | s4-class-iii/late/hr | 107 | 120–140 | brief §4.9 4 / ATLS class III: HR 120–140 | |
| 🟡 | segments | s4-class-iv/late/hr | 134 | 140–180 | brief §4.9 4 / ATLS class IV: HR 140–180 | |
| 🟡 | segments | t12-massive-pe/pe-late/papm | 24.0 | 30.0–45.0 | tables §7 12: mPAP 30–40, never > 45 (systolic proxy) [ENG] | |
| 🟡 | segments | t12-massive-pe/pe-late/spo2 | 100.0 | 85.0–92.0 | tables §7 12: SpO2 85–92 on FiO2 1 | |
| 🟡 | segments | t14-tamponade/equalised/pawp | 22.4 | 15.0–20.0 | tables §7 14 | |
| 🟡 | segments | t17a-class3-no-bb/late/hr | 98.0 | 120–140 | tables §7 17a: HR 120–140 | |
| 🟡 | segments | t17a-class3-no-bb/late/sbp | 95.1 | 80.0–90.0 | tables §7 17a: SBP 80–90 | |
| 🟡 | segments | t21-mh/10min/etco2 | 73.5 | 51.0–69.0 | tables §7 21: EtCO2 40 → 60 by 10 min (±15 %) | |
| 🟡 | segments | t24-edmark-fio2-1/apnoea/t90 | 494 | 329–493 | tables §7 24: 411 s ±20 % | |
| 🟡 | segments | t24-edmark-fio2-0.8/apnoea/t90 | 385 | 242–364 | tables §7 24: 303 s ±20 % | |
| 🟡 | segments | t24-edmark-fio2-0.6/apnoea/t90 | 267 | 170–256 | tables §7 24: 213 s ±20 % | |
| 🟡 | segments | g3-cpr-etco2/cpr/etco2 | 16.3 | 17.0–23.0 | R39-2: default quality 0.8 → ≈ 20 mmHg | |
