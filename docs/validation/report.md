# Validation report

Generated 2026-11-08T06:04:31.855Z by `pnpm validate` on commit `68f14a6f` (engine 1.0.0-rc.5); 387 s wall. Suites: segments, sanity, regression; seeds 11.

**Summary:** 🟢 61 · 🟡 20 · 🟣 6 expected · 🔴 0 graded rows; 1 documents not measurable on this build; calibration queue 26 rows. Gating failures: none.

Grades (R40): 🟢 inside the evidence band (or within 10 % of a point target); 🟡 misses by < 30 %; 🔴 misses by ≥ 30 % or not measured. Red gates the run; yellow is reported and queued for calibration (R44).

🟣 expected failure (brief 84): a row outside its band that waits on a named mechanism, recorded with its id in docs/guides/known-deviations.md. Its band is never changed and it is never counted green. It does not gate while it misses; once it meets its band it turns 🔴 and gates until the mark is taken off.

## Datasets and attribution

| Dataset | Licence | Windows | Attribution |
|---|---|---|---|
| VitalDB (PhysioNet copy) | CC BY 4.0 | 80 | Lee HC, Park Y, Yoon SB, Yang SM, Park D, Jung CW. VitalDB, a high-fidelity multi-parameter vital signs database in surgical patients. Sci Data 9:279 (2022). Data from the PhysioNet copy, v1.0.0. |
| MGH/MF Waveform Database | ODC-By 1.0 | 16 | Welch J, Ford P, Teplick R, Rubsamen R. The Massachusetts General Hospital-Marquette Foundation Hemodynamic and Electrocardiographic Database -- Comprehensive collection of critical care waveforms. J Clin Monitoring 7(1):96-97 (1991). PhysioNet v1.0.0. |
| Pulse Wave Database (PWDB) | PDDL 1.0 | 0 | Charlton PH, Mariscal Harana J, Vennin S, Li Y, Chowienczyk P, Alastruey J. Modeling arterial pulse waves in healthy aging: a database for in silico evaluation of hemodynamics and pulse wave indexes. Am J Physiol Heart Circ Physiol 317:H1062-H1085 (2019). |
| PTB-XL | CC BY 4.0 | 0 | Wagner P, Strodthoff N, Bousseljot R, Samek W, Schaeffter T. PTB-XL, a large publicly available electrocardiography dataset (version 1.0.3). PhysioNet (2022). |

Raw records stay in the git-ignored cache; this report holds derived statistics only (brief §8).

## Morphology: recorded vs engine (brief §9 V1–V5)

Same metric code on both sides; engine runs matched to each recorded window (HR, BP, site, ventilator, EtCO2).

| | Band | Group | Recorded median [IQR] (n) | Engine median [IQR] (n) | KS D | W1 | Expected | Source |
|---|---|---|---|---|---|---|---|---|

## Segment validation: sanity checks and gate numbers

| | Document / segment / target | Measured | Expected | Source |
|---|---|---|---|---|
| 🟢 | or-induction-hypotension / awake / hr-baseline | 78.0 | = 78.0 ±10 % | scenario patient.baseline.hr 78 |
| 🟢 | or-induction-hypotension / awake / displayed-hr | 78.3 | 75.0–81.0 | brief §6.1: displayed HR within 3 bpm of truth at steady state [ENG: device] |
| 🟢 | or-induction-hypotension / induced / enters-induction | 0.00 | < 1.00 | manual Induce acts on the same poll (6b driver) |
| 🟢 | or-induction-hypotension / hypotension / enters-hypotension | 0.00 | 0.00–2.00 | scenario: afterS 60 after induction (t = 90 s) |
| 🟢 | or-induction-hypotension / hypotension / hr-rises | 122 | → 122 ±10 % | scenario: hr → 122 over 90 s, sigmoid |
| 🟢 | or-induction-hypotension / hypotension / hr-above-awake | 122 | > 101 | reflex tachycardia ≥ 30 % above awake [FIT: reflex tachycardia band; brief research/44 X-15] |
| 🟢 | or-induction-hypotension / profound / enters-profound | 11.0 | < 120 | scenario: HR ≥ 115 for 20 s → profound |
| 🟢 | s1-phenylephrine / base / steady-map | 92.6 | 60.0–110 | baseline MAP physiological [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟢 | s1-phenylephrine / peak / map-rise | 115 | 109–119 | brief §4.9 1: MAP +15–25 within 30–60 s |
| 🟢 | s1-phenylephrine / peak / hr-fall | 57.0 | 52.6–62.6 | brief §4.9 1: reflex HR −5–15 |
| 🟢 | s2-class2-haemorrhage / base / pp0 | 42.4 | 30.0–70.0 | baseline PP [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟡 | s2-class2-haemorrhage / class2 / hr | 80.9 | 100–120 | brief §4.9 2: HR 100–120 |
| 🟢 | s2-class2-haemorrhage / class2 / sbp-held | 109 | 109–127 | brief §4.9 2: SBP near normal (R45 b) |
| 🟢 | s2-class2-haemorrhage / class2 / pp-narrow | 30.4 | < 38.2 | brief §4.9 2: PP narrowed |
| 🟢 | s3-propofol-induction / base / steady-map | 92.6 | 60.0–110 | baseline MAP physiological [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟢 | s3-propofol-induction / 2min / map-70pct | 73.2 | = 64.8 ±15 % | brief §4.9 3: MAP ≈ 70 % of baseline at 2 min |
| 🟢 | s3-propofol-induction / 2min / hr-little | 70.9 | < 74.4 | brief §4.9 3: little HR rise |
| 🟢 | s4-class-i / late / hr | 74.7 | 60.0–100 | brief §4.9 4 / ATLS class I: HR 60–100 |
| 🟡 | s4-class-iii / late / hr | 104 | 120–140 | brief §4.9 4 / ATLS class III: HR 120–140 |
| 🟢 | s4-class-iii / late / sbp | 99.9 | < 100 | brief §4.9 4 / ATLS class III: SBP decreased |
| 🟡 | s4-class-iv / late / hr | 127 | 140–180 | brief §4.9 4 / ATLS class IV: HR 140–180 |
| 🟢 | s4-class-iv / late / sbp | 83.4 | < 90.0 | brief §4.9 4 / ATLS class IV: SBP decreased |
| 🟢 | s4-class-iv / late / pp | 14.3 | < 25.0 | brief §4.9 4: class IV PP < 25 |
| 🟢 | s6-apnoea-preoxygenated / apnoea / t90 | 484 | 390–570 | brief §4.9 6: SaO2 90 % at 8 ± 1.5 min (Benumof) |
| 🟢 | s6-apnoea-room-air / apnoea / true-t90 | 35.0 | 35.0–60.0 | R39-1: true SaO2 90 % at 45 s (35–60) |
| 🟢 | s6-apnoea-room-air / apnoea / shown-t90 | 60.0 | 45.0–90.0 | R39-1: displayed SpO2 90 % at 60 s (45–90) |
| 🟢 | s7-apnoea-child / apnoea / t90 | 158 | 130–190 | brief §4.9 7: 160 ± 30 s |
| 🟢 | s8-co2-apnoea-first-breath / before / et0 | 38.3 | 30.0–45.0 | normocapnia [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟢 | s8-co2-apnoea-first-breath / after / first | 50.6 | 47.3–53.3 | Stage 3 acc. 4: first breath +9 to +15 mmHg |
| 🟢 | s9-witnessed-vf / base / et0 | 37.2 | 30.0–45.0 | normocapnia [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟢 | s9-witnessed-vf / arrest / abp-flat | 9.00 | 0.00–20.0 | Stage 2 acc. 6: pulseless → flat (displayed ABP < 20) within 20 s |
| 🟢 | s9-witnessed-vf / arrest / etco2-true-gone | 75.1 | 58.0–85.0 | research 46 §C: true EtCO2 < 5 at 2τ ± one breath, τ = V_lung / V̇A = 31–40 s on this rig (V_lung 2.2–2.8 L, Miller 10e ch. 12; V̇A = RR × (VT − 150 mL)); Falk 1988, Gudipati 1988 |
| 🟢 | s9-witnessed-vf / arrest / etco2-shown-lag | 83.0 | < 85.1 | research 46 §C: displayed EtCO2 < 5 within a capnograph's response of the true value: transport delay ≤ 5 s plus one breath (5 s); Miller 10e ch. 37 p. 1164, ISO 80601-2-55 |
| 🟢 | t10-as-cad-propofol / base / steady-map | 106 | 60.0–110 | baseline MAP physiological [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟡 | t10-as-cad-propofol / 2min / map | 74.5 | 60.0–65.0 | tables §7 10: MAP 103 → 60–65 at 2 min |
| 🟡 | t10-as-cad-propofol / rescue / map-rescued | 69.3 | > 85.0 | tables §7 10: phenylephrine → MAP ≥ 85 within 90 s |
| 🟢 | t11-chronic-mr-fluid / late / pawp | 26.8 | > 25.0 | tables §7 11: PCWP 15 → > 25 by 15–25 min |
| 🟡 | t11-chronic-mr-fluid / oedema / spo2 | 96.0 | 89.0–92.0 | tables §7 11: SpO2 96 → 89–92 |
| 🟢 | t12-massive-pe / base / et0 | 35.0 | 30.0–45.0 | normocapnia [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟡 | t12-massive-pe / pe / etco2 | 26.0 | 20.0–25.0 | tables §7 12: EtCO2 35 → 20–25 within 3 breaths |
| 🟡 | t12-massive-pe / pe-late / papm | 24.0 | 30.0–45.0 | tables §7 12: mPAP 30–40, never > 45 (systolic proxy) [FIT: mPAP band as a systolic proxy; brief research/44 V-09] |
| 🟡 | t12-massive-pe / pe-late / spo2 | 100.0 | 85.0–92.0 | tables §7 12: SpO2 85–92 on FiO2 1 |
| 🟢 | t13-tension-ptx / base / steady-map | 91.7 | 60.0–110 | baseline MAP physiological [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟢 | t13-tension-ptx / 3min / sbp | 79.9 | < 90.0 | tables §7 13: SBP < 90 by 3 min |
| 🟢 | t13-tension-ptx / 3min / cvp | 21.2 | 12.0–22.0 | tables §7 13: CVP +5–15 |
| 🟢 | t14-tamponade / equalised / cvp | 17.9 | 15.0–20.0 | tables §7 14: CVP ≈ PAD ≈ PCWP 15–20 |
| 🟡 | t14-tamponade / equalised / pawp | 22.5 | 15.0–20.0 | tables §7 14 |
| 🟣 | t15-rv-infarct / rest / cvp | 6.77 | 14.0–18.0 | tables §7 15: CVP 14–18 |
| 🟣 | t15-rv-infarct / rest / pawp | 3.33 | 8.00–12.0 | tables §7 15: PCWP 8–12 |
| 🟡 | t15-rv-infarct / rest / map | 87.4 | 60.0–70.0 | tables §7 15: MAP 60–70 |
| 🟡 | t16-septic-shock-warm / warm / hr | 87.4 | 115–130 | tables §7 16: HR 115–130 |
| 🟣 | t16-septic-shock-state / established / map | 19.5 | 49.0–60.0 | research 46 §E: established septic shock, unresuscitated, anaesthetised, ventilated: MAP 49–60 (Garcia 2023, control IQR at 4 h) |
| 🟢 | t16-septic-shock-fluid / after-fluid / map | 52.0 | < 65.0 | research 46 §E: after 30 mL/kg and no vasopressor MAP stays < 65 (Sepsis-3, Singer 2016) |
| 🟡 | t17a-class3-no-bb / late / hr | 94.2 | 120–140 | tables §7 17a: HR 120–140 |
| 🟡 | t17a-class3-no-bb / late / sbp | 97.9 | 80.0–90.0 | tables §7 17a: SBP 80–90 |
| 🟢 | t17a-class3-no-bb / late / pp | 22.7 | 20.0–25.0 | tables §7 17a: PP 20–25 |
| 🟡 | t17b-class3-bb / late / hr | 64.4 | 80.0–95.0 | tables §7 17b: HR 80–95 |
| 🟡 | t18-htn-hypocapnia-cbf / hypocapnia / etco2 | 15.7 | 20.0–28.0 | tables §7 18: hyperventilation to PaCO2 ≈ 25 (EtCO2 proxy) [FIT: EtCO2 proxy for PaCO2 25; brief research/44 V-15] |
| 🟢 | t19-tbi-haematoma / cushing / hr | 53.2 | < 60.0 | tables §7 19: HR 80 → 45–55 at CPP < 40 |
| 🟡 | t20-low-flow-oliguria / on-dobutamine / map | 83.7 | 68.0–76.0 | tables §7 20: MAP 72 on dobutamine |
| 🟢 | t21-mh / base / et0 | 38.2 | 30.0–45.0 | normocapnia [FIT: physiological normal range without a cited source; brief research/44 X-15] |
| 🟡 | t21-mh / 10min / etco2 | 73.5 | 51.0–69.0 | tables §7 21: EtCO2 40 → 60 by 10 min (±15 %) |
| 🟢 | t21-mh / 20min / rising | 120 | > 88.5 | tables §7 21: keeps rising 3–5 mmHg/min |
| 🟢 | t23-term-apnoea / apnoea / t90 | 234 | 150–240 | tables §7 23: SpO2 90 % at 2.5–4 min |
| 🟢 | t24-edmark-fio2-1 / apnoea / t90 | 484 | 329–493 | tables §7 24: 411 s ±20 % |
| 🟡 | t24-edmark-fio2-0.8 / apnoea / t90 | 377 | 242–364 | tables §7 24: 303 s ±20 % |
| 🟡 | t24-edmark-fio2-0.6 / apnoea / t90 | 261 | 170–256 | tables §7 24: 213 s ±20 % |
| 🟢 | t25-rocuronium-sugammadex / block / first-effort | 544 | 480–1200 | first own effort under the ventilator 12–24 min after rocuronium 0.6 mg/kg: diaphragm recovery onset 15.9 min (young) / 22.0 min (> 65), Moerer 2005; diaphragm twitch 10 % recovery 17 ± 10 min, Cantineau 1994 |
| 🟢 | t25-rocuronium-sugammadex / block / effort-before-t2 | 0.75 | > 0.00 | tables §7 25: capnogram cleft and spontaneous effort return before TOF ≥ 2 (the effort is present when sugammadex is given at T2) |
| 🟢 | t25-rocuronium-sugammadex / recovery / rr-back | 12.0 | > 4.00 | tables §7 25: off the ventilator after sugammadex 2 mg/kg the patient breathes throughout its onset (TOFR 0.9 in 2.2 min, the label; effort is back before TOF ≥ 2) |
| 🟢 | t25-apnoea / arrest / sbp-collapse | 807 | 300–1200 | asphyxial arrest 5–20 min after the dose [P: DeBehnke 1995; Varvarousi 2011] |
| 🟢 | t17-bb-contrast / late / hr-response-ratio | 0.19 | < 0.60 | research 46 §F: β-blockade blunts the reflex tachycardia, ΔHR(17b) ≤ 0.6 × ΔHR(17a) from each arm's baseline (Bjurstedt 1977: 48 % of control; Kinsky 2008; Havens 2012) |
| 🟣 | t17-bb-contrast / late / sbp-ratio | 1.06 | < 1.00 | research 46 §F: awake, SBP(17b) ≤ SBP(17a) at the same loss, direction only (Bjurstedt 1977; Convertino 2000) |
| 🟣 | t17-bb-contrast / late / co-ratio | 1.03 | < 1.00 | research 46 §F: awake, CO(17b) < CO(17a) at the same loss, SV unchanged (Convertino 2000) |

### Not measurable on this build (decision 8)

| Document | Needs | Refused command |
|---|---|---|
| t22-term-spinal — Term pregnancy, spinal, supine | 7a, 7f | applyEvent neuraxial: command type applyEvent is not implemented until later stages |

## Waveform regression (2 % per sample)

| | Case / channel | Samples outside | Max rel. error | RMS |
|---|---|---|---|---|
| 🟢 | sinus-75 / ecgII | 0/2500 | 0.00 % | 0.00e+0 |
| 🟢 | sinus-75 / V5 | 0/2500 | 0.00 % | 0.00e+0 |
| 🟢 | sinus-75 / abp | 0/625 | 0.04 % | 4.40e-3 |
| 🟣 | sinus-75 / pleth | 625/625 | 10.21 % | 8.03e-2 |
| 🟢 | sinus-75 / co2 | 0/313 | 0.00 % | 0.00e+0 |
| 🟢 | afib-110 / ecgII | 0/2500 | 0.00 % | 0.00e+0 |
| 🟢 | afib-110 / abp | 0/625 | 1.59 % | 2.19e-1 |
| 🟢 | afib-110 / pleth | 0/625 | 0.00 % | 0.00e+0 |
| 🟢 | vf-coarse / ecgII | 0/2500 | 0.00 % | 0.00e+0 |
| 🟢 | vf-coarse / abp | 0/625 | 0.83 % | 4.49e-2 |
| 🟢 | bronchospasm / co2 | 0/313 | 0.00 % | 0.00e+0 |
| 🟢 | hypovolaemia-ppv / abp | 0/625 | 0.03 % | 6.39e-3 |
| 🟢 | hypovolaemia-ppv / pleth | 0/625 | 0.00 % | 0.00e+0 |

## Pulse oracle (R34; annex §C/§D)

Build: not run (set PME_PULSE_DIR).

| | Scenario / check | Ours | Pulse | Expected | Note |
|---|---|---|---|---|---|

Backlog: O3 crystalloid 1 L; O5 norepinephrine 0.1 µg/kg/min; O6 apnoea after FiO2 1.0; O7 PEEP 5 → 15 (PCV); O8 FiO2 1.0 for 60 min; O9 hypothermia 33 °C; O10 glucose/insulin; O11 renal MAP 60; O12 hepatic clearance in haemorrhage.

## Expected failures (brief 84)

6 rows carry an expected-failure mark. Each waits on the mechanism named; its band is unchanged.

| | Suite | Row | Measured now | Expected | Id (known deviations) | Mechanism | Marked | Measured when marked |
|---|---|---|---|---|---|---|---|---|
| 🟣 | segments | t15-rv-infarct/rest/cvp | 6.77 | 14.0–18.0 | D: RV diastolic/pericardial mechanics (mechanism brief) | RV dilation under pericardial constraint and ventricular interdependence in RV infarct (audit V-11) | 2026-11-08 | CVP 6.8 |
| 🟣 | segments | t15-rv-infarct/rest/pawp | 3.33 | 8.00–12.0 | D: RV diastolic/pericardial mechanics (mechanism brief) | RV dilation under pericardial constraint and ventricular interdependence in RV infarct (audit V-11) | 2026-11-08 | PCWP 3.3 |
| 🟣 | segments | t16-septic-shock-state/established/map | 19.5 | 49.0–60.0 | E: septic time course and fluid-refractory vasoplegia (mechanism brief) | the onset over hours, not a 600-s ramp, and arteriolar tone that fluid alone does not restore (audit V-12) | 2026-11-08 | MAP 17.4 at 3000–3600 s: 40.9 at 2700–3000 s, then circulatory arrest from ≈ 3000 s |
| 🟣 | segments | t17-bb-contrast/late/sbp-ratio | 1.06 | < 1.00 | F: preload-fixed stroke volume at low CVP (mechanism brief) | SV set by preload, so a slower β-blocked heart loses output at near-zero filling pressure (research 46 §F) | 2026-11-08 | SBP 104.1 / 97.9 = 1.063 |
| 🟣 | segments | t17-bb-contrast/late/co-ratio | 1.03 | < 1.00 | F: preload-fixed stroke volume at low CVP (mechanism brief) | SV set by preload, so a slower β-blocked heart loses output at near-zero filling pressure (research 46 §F) | 2026-11-08 | CO 4.02 / 3.89 L/min = 1.033 (SV 62 vs 41 mL at CVP 0.75 vs 0.86) |
| 🟣 | regression | sinus-75/pleth | 625/625 samples > 2 % | all samples within 2 % | H: pleth reference SV₀ = the settled resting SV (PR #333) | the PI reference stroke volume is the patient's own settled resting SV, not the bare-circuit stabiliser's (brief 79, PR #333) | 2026-11-08 | 625/625 samples > 2 %, max 10.2 % |

## Calibration queue (R44)

26 rows outside their band — the input to Ali's calibration pass. Also written to `calibration-queue.md`.

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
