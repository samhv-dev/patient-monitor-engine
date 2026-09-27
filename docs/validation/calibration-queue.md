# Calibration queue (R44)

From `pnpm validate` at 2026-09-27T04:13:20.412Z, commit `7bcf992`. Every row outside its band; fill the last column during the calibration pass.

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
