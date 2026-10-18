# Calibration queue (R44)

From `pnpm validate` at 2026-10-17T20:45:39.399Z, commit `e737de92`. Every row outside its band; fill the last column during the calibration pass.

| | Suite | Row | Measured | Expected | Source | Ali: decision |
|---|---|---|---|---|---|---|
| 🔴 | morphology | V1 · HR 50–70 | engine 104 vs recorded 190 | 170–210 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] | |
| 🔴 | morphology | V1-lit · all | engine 102 vs recorded 167 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms | |
| 🔴 | morphology | V1-lit · vitaldb | engine 103 vs recorded 172 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms | |
| 🔴 | morphology | V1-lit · mghdb | engine 95.1 vs recorded 145 | 150–220 | research 03 §2.1: R → radial upstroke 150–220 ms | |
| 🔴 | morphology | V2 · HR 90–110 | engine 270 vs recorded 428 | 408–448 | brief §9 V2: ±20 ms | |
| 🔴 | morphology | V2 · HR 70–90 | engine 282 vs recorded 484 | 464–504 | brief §9 V2: ±20 ms | |
| 🔴 | morphology | V2 · HR 50–70 | engine 284 vs recorded 518 | 498–538 | brief §9 V2: ±20 ms | |
| 🔴 | morphology | V3-shape · all | engine 0.4 vs recorded 0.9 | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] | |
| 🔴 | morphology | V3-shape · vitaldb | engine 0.4 vs recorded 0.9 | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] | |
| 🔴 | morphology | V3-shape · mghdb | engine 0.5 vs recorded — | 0.80–1.00 | brief §9 V3: r ≥ 0.8 [ENG] | |
| 🔴 | oracle | O2/hr-delta | ours 0.00 · Pulse 47.70 | ±20 % of Pulse | 100.0 % | |
| 🔴 | oracle | O2/map-delta | ours -4.96 · Pulse -16.34 | ±20 % of Pulse | 69.6 % | |
| 🔴 | oracle | O4/map-delta | ours -18.93 · Pulse -27.91 | ±15 % of Pulse | 32.2 % | |
| 🔴 | regression | sinus-75/pleth | 625/625 samples > 2 % | all samples within 2 % | R40 (audit N-P02) | |
| 🔴 | regression | sinus-75/co2 | 230/313 samples > 2 % | all samples within 2 % | R40 (audit N-P02) | |
| 🔴 | regression | afib-110/pleth | 625/625 samples > 2 % | all samples within 2 % | R40 (audit N-P02) | |
| 🔴 | regression | bronchospasm/co2 | 234/313 samples > 2 % | all samples within 2 % | R40 (audit N-P02) | |
| 🔴 | regression | hypovolaemia-ppv/pleth | 625/625 samples > 2 % | all samples within 2 % | R40 (audit N-P02) | |
| 🔴 | segments | s4-class-iii/late/hr | 75.0 | 120–140 | brief §4.9 4 / ATLS class III: HR 120–140 | |
| 🔴 | segments | s4-class-iv/late/hr | 75.0 | 140–180 | brief §4.9 4 / ATLS class IV: HR 140–180 | |
| 🔴 | segments | s9-witnessed-vf/arrest/etco2-gone | 83.0 | 0.00–30.0 | Stage 3: EtCO2 < 5 within 30 s | |
| 🔴 | segments | t15-rv-infarct/rest/cvp | 6.9 | 14.0–18.0 | tables §7 15: CVP 14–18 | |
| 🔴 | segments | t15-rv-infarct/rest/pawp | 3.3 | 8.00–12.0 | tables §7 15: PCWP 8–12 | |
| 🔴 | segments | t16-septic-shock-warm/warm/map | 86.7 | 55.0–60.0 | tables §7 16: MAP 55–60 | |
| 🔴 | segments | t16-septic-shock-warm/warm/hr | 75.0 | 115–130 | tables §7 16: HR 115–130 | |
| 🔴 | segments | t17a-class3-no-bb/late/hr | 75.0 | 120–140 | tables §7 17a: HR 120–140 | |
| 🔴 | segments | t25-rocuronium-sugammadex/recovery/rr-back | 0.0 | 60.0–240 | tables §7 25: spontaneous effort returns within ≈ 2.2 min of sugammadex [ENG] | |
| 🟡 | morphology | V1 · HR other | engine 94.5 vs recorded 150 | 130–170 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] | |
| 🟡 | morphology | V1 · HR 90–110 | engine 97.4 vs recorded 154 | 134–174 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] | |
| 🟡 | morphology | V1 · HR 70–90 | engine 107 vs recorded 171 | 151–191 | brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG] | |
| 🟡 | morphology | V2 · HR other | engine 258 vs recorded 360 | 340–380 | brief §9 V2: ±20 ms | |
| 🟡 | morphology | V2-kind · mghdb | engine 1.0 vs recorded 0.6 | 0.32–0.92 | [ENG] share of beats with a true notch minimum within ±0.3 of the recording | |
| 🟡 | morphology | V3-delay · all | engine 112 vs recorded 442 | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) | |
| 🟡 | morphology | V3-delay · vitaldb | engine 115 vs recorded 442 | 20.0–100 | brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only) | |
| 🟡 | morphology | V5-PR · all | engine 217 vs recorded — | 140–216 | PTB-XL NORM p10–p90 by the same method (filled at run time) | |
| 🟡 | morphology | V5-PR · vitaldb | engine 217 vs recorded — | 140–216 | PTB-XL NORM p10–p90 by the same method (filled at run time) | |
| 🟡 | oracle | O1/map | ours 87.33 · Pulse 95.38 | ±5 % of Pulse | 8.4 % | |
| 🟡 | oracle | O1/rr | ours 15.00 · Pulse 12.24 | ±10 % of Pulse | 22.5 % | |
| 🟡 | oracle | O1/cvp | ours 6.00 · Pulse 4.73 | ±10 % of Pulse | 26.8 % | |
| 🟡 | oracle | O2/lactate | ours — · Pulse — | n/a | Pulse aborted after 1570 s (wasm abort); no Pulse value at 1800 s | |
| 🟡 | segments | s1-phenylephrine/peak/hr-fall | 75.0 | 60.0–70.0 | brief §4.9 1: reflex HR −5–15 | |
| 🟡 | segments | s2-class2-haemorrhage/class2/hr | 75.0 | 100–120 | brief §4.9 2: HR 100–120 | |
| 🟡 | segments | s4-class-iii/late/sbp | 103 | < 100 | brief §4.9 4 / ATLS class III: SBP decreased | |
| 🟡 | segments | t10-as-cad-propofol/base/steady-map | 112 | 60.0–110 | baseline MAP physiological [ENG] | |
| 🟡 | segments | t10-as-cad-propofol/2min/map | 69.9 | 60.0–65.0 | tables §7 10: MAP 103 → 60–65 at 2 min | |
| 🟡 | segments | t11-chronic-mr-fluid/oedema/spo2 | 96.5 | 89.0–92.0 | tables §7 11: SpO2 96 → 89–92 | |
| 🟡 | segments | t12-massive-pe/pe/etco2 | 26.0 | 20.0–25.0 | tables §7 12: EtCO2 35 → 20–25 within 3 breaths | |
| 🟡 | segments | t12-massive-pe/pe-late/papm | 24.0 | 30.0–45.0 | tables §7 12: mPAP 30–40, never > 45 (systolic proxy) [ENG] | |
| 🟡 | segments | t12-massive-pe/pe-late/spo2 | 100.0 | 85.0–92.0 | tables §7 12: SpO2 85–92 on FiO2 1 | |
| 🟡 | segments | t14-tamponade/equalised/pawp | 23.9 | 15.0–20.0 | tables §7 14 | |
| 🟡 | segments | t15-rv-infarct/rest/map | 85.9 | 60.0–70.0 | tables §7 15: MAP 60–70 | |
| 🟡 | segments | t17a-class3-no-bb/late/sbp | 101 | 80.0–90.0 | tables §7 17a: SBP 80–90 | |
| 🟡 | segments | t17a-class3-no-bb/late/pp | 27.0 | 20.0–25.0 | tables §7 17a: PP 20–25 | |
| 🟡 | segments | t17b-class3-bb/late/hr | 75.0 | 80.0–95.0 | tables §7 17b: HR 80–95 | |
| 🟡 | segments | t17b-class3-bb/late/sbp | 101 | 65.0–80.0 | tables §7 17b: SBP 65–80 | |
| 🟡 | segments | t18-htn-hypocapnia-cbf/hypocapnia/etco2 | 15.8 | 20.0–28.0 | tables §7 18: hyperventilation to PaCO2 ≈ 25 (EtCO2 proxy) [ENG] | |
| 🟡 | segments | t19-tbi-haematoma/cushing/hr | 75.0 | < 60.0 | tables §7 19: HR 80 → 45–55 at CPP < 40 | |
| 🟡 | segments | t20-low-flow-oliguria/on-dobutamine/map | 84.2 | 68.0–76.0 | tables §7 20: MAP 72 on dobutamine | |
| 🟡 | segments | t24-edmark-fio2-0.8/apnoea/t90 | 377 | 242–364 | tables §7 24: 303 s ±20 % | |
| 🟡 | segments | t24-edmark-fio2-0.6/apnoea/t90 | 261 | 170–256 | tables §7 24: 213 s ±20 % | |
