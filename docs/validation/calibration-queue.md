# Calibration queue (R44)

From `pnpm validate` at 2026-11-08T06:04:31.855Z, commit `68f14a6f`. Every row outside its band; fill the last column during the calibration pass.

| | Suite | Row | Measured | Expected | Source | Expected failure | Ali: decision |
|---|---|---|---|---|---|---|---|
| 🟣 | regression | sinus-75/pleth | 625/625 samples > 2 % | all samples within 2 % | R40 (audit N-P02) | H: pleth reference SV₀ = the settled resting SV (PR #333) | |
| 🟣 | segments | t15-rv-infarct/rest/cvp | 6.77 | 14.0–18.0 | tables §7 15: CVP 14–18 | D: RV diastolic/pericardial mechanics (mechanism brief) | |
| 🟣 | segments | t15-rv-infarct/rest/pawp | 3.33 | 8.00–12.0 | tables §7 15: PCWP 8–12 | D: RV diastolic/pericardial mechanics (mechanism brief) | |
| 🟣 | segments | t16-septic-shock-state/established/map | 19.5 | 49.0–60.0 | research 46 §E: established septic shock, unresuscitated, anaesthetised, ventilated: MAP 49–60 (Garcia 2023, control IQR at 4 h) | E: septic time course and fluid-refractory vasoplegia (mechanism brief) | |
| 🟣 | segments | t17-bb-contrast/late/sbp-ratio | 1.06 | < 1.00 | research 46 §F: awake, SBP(17b) ≤ SBP(17a) at the same loss, direction only (Bjurstedt 1977; Convertino 2000) | F: preload-fixed stroke volume at low CVP (mechanism brief) | |
| 🟣 | segments | t17-bb-contrast/late/co-ratio | 1.03 | < 1.00 | research 46 §F: awake, CO(17b) < CO(17a) at the same loss, SV unchanged (Convertino 2000) | F: preload-fixed stroke volume at low CVP (mechanism brief) | |
| 🟡 | segments | s2-class2-haemorrhage/class2/hr | 80.9 | 100–120 | brief §4.9 2: HR 100–120 |  | |
| 🟡 | segments | s4-class-iii/late/hr | 104 | 120–140 | brief §4.9 4 / ATLS class III: HR 120–140 |  | |
| 🟡 | segments | s4-class-iv/late/hr | 127 | 140–180 | brief §4.9 4 / ATLS class IV: HR 140–180 |  | |
| 🟡 | segments | t10-as-cad-propofol/2min/map | 74.5 | 60.0–65.0 | tables §7 10: MAP 103 → 60–65 at 2 min |  | |
| 🟡 | segments | t10-as-cad-propofol/rescue/map-rescued | 69.3 | > 85.0 | tables §7 10: phenylephrine → MAP ≥ 85 within 90 s |  | |
| 🟡 | segments | t11-chronic-mr-fluid/oedema/spo2 | 96.0 | 89.0–92.0 | tables §7 11: SpO2 96 → 89–92 |  | |
| 🟡 | segments | t12-massive-pe/pe/etco2 | 26.0 | 20.0–25.0 | tables §7 12: EtCO2 35 → 20–25 within 3 breaths |  | |
| 🟡 | segments | t12-massive-pe/pe-late/papm | 24.0 | 30.0–45.0 | tables §7 12: mPAP 30–40, never > 45 (systolic proxy) [FIT: mPAP band as a systolic proxy; brief research/44 V-09] |  | |
| 🟡 | segments | t12-massive-pe/pe-late/spo2 | 100.0 | 85.0–92.0 | tables §7 12: SpO2 85–92 on FiO2 1 |  | |
| 🟡 | segments | t14-tamponade/equalised/pawp | 22.5 | 15.0–20.0 | tables §7 14 |  | |
| 🟡 | segments | t15-rv-infarct/rest/map | 87.4 | 60.0–70.0 | tables §7 15: MAP 60–70 |  | |
| 🟡 | segments | t16-septic-shock-warm/warm/hr | 87.4 | 115–130 | tables §7 16: HR 115–130 |  | |
| 🟡 | segments | t17a-class3-no-bb/late/hr | 94.2 | 120–140 | tables §7 17a: HR 120–140 |  | |
| 🟡 | segments | t17a-class3-no-bb/late/sbp | 97.9 | 80.0–90.0 | tables §7 17a: SBP 80–90 |  | |
| 🟡 | segments | t17b-class3-bb/late/hr | 64.4 | 80.0–95.0 | tables §7 17b: HR 80–95 |  | |
| 🟡 | segments | t18-htn-hypocapnia-cbf/hypocapnia/etco2 | 15.7 | 20.0–28.0 | tables §7 18: hyperventilation to PaCO2 ≈ 25 (EtCO2 proxy) [FIT: EtCO2 proxy for PaCO2 25; brief research/44 V-15] |  | |
| 🟡 | segments | t20-low-flow-oliguria/on-dobutamine/map | 83.7 | 68.0–76.0 | tables §7 20: MAP 72 on dobutamine |  | |
| 🟡 | segments | t21-mh/10min/etco2 | 73.5 | 51.0–69.0 | tables §7 21: EtCO2 40 → 60 by 10 min (±15 %) |  | |
| 🟡 | segments | t24-edmark-fio2-0.8/apnoea/t90 | 377 | 242–364 | tables §7 24: 303 s ±20 % |  | |
| 🟡 | segments | t24-edmark-fio2-0.6/apnoea/t90 | 261 | 170–256 | tables §7 24: 213 s ±20 % |  | |
