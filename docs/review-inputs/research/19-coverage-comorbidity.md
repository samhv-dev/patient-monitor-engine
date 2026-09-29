# 19 — Coverage run CM: comorbidity profiles (R54 matrix, research/12 §5.7)

*Coverage auditor, 2026-09-29. Read-only on the repo. Engine pinned at `origin/main` **0fd5397** (FU-3, FU-4 and FU-5
merged; V.1, FU-6, FU-7 not). Seed 7 throughout; the clean full run reproduced the development runs exactly (67 of 67
shared cells identical). Scripts: `research/19-audit-scripts/` (rerunnable; `out/cells.json` holds one graded record
per cell, no raw rows). Report format follows research/14 (run DI).*

## 0. Headline

- **69 cells**: the 65 designed cells of research/12 §5.7 (CM-01…18, split a–f as designed), 3 MANUAL twins
  (CM-M1…M3) and one quiet cell this run added after an unexpected arrest (CM-15c). 39 P1, 29 P2, 1 P3. Every
  intervention cell has its control arm, and every comorbid arm has the healthy reference of the same age at the same
  sim time (R53, the audit 08 §K method).
- **Verdicts:**

  | verdict | cells | P1 | P2 | P3 | of which another stage's fix is pending |
  |---|---|---|---|---|---|
  | plausible (PL) | **26** | 13 | 12 | 1 | 2 (FU-6 drive; FU-7 T17 must not move it) |
  | too weak (TW) | **13** | 10 | 3 | — | 3 (FU-6 R14, FU-7 T10, FU-6 drive) |
  | too strong (TS) | **4** | 3 | 1 | — | — |
  | wrong (WR) | **10** | 8 | 2 | — | 2 (FU-6 R2, FU-6 hypercapnic PVR) |
  | inconsistent (IN) | **4** | 4 | — | — | — |
  | missing (MI) | **1** | — | 1 | — | — |
  | not expressible (NE) | **11** | 1 | 10 | — | — |

  **32 non-plausible expressible cells**; 5 wait on FU-6 or FU-7 work already planned, **27 have no owner** (§3).
  Research/12 predicted 15 NE cells; 11 remain, because the pacemaker-dependent state is expressible as a profile
  rhythm (CM-16) and type 2 diabetes through the engine API's `endo` block (CM-09c).
- **The matrix column after this run** (research/12 §4.5): 201 (audits 08–10) + 105 (DI) + 69 (CM) = **375 measured
  cells**. CM's P1 plausibility is 13 of 39 (33 %), the same share as the first 201 cells (34 %).
- **Ten most important findings** (ranked; §3 has the mechanism and file:line for each):
  1. **Rapid AF kills a healthy heart (CM-15c, CM-15b; P1; new gap C3).** AF at 150/min drives a healthy 40 y heart's
     ischaemic contractility factor (kIsch) to 0 (mean 0.19); SV 9.8 mL, MAP 44; agonal at +15.5 min, asystole at
     +18 min. Sinus held at 150 keeps kIsch 1.0. On short AF cycles the beat's "LVEDP" is sampled while the ventricle is
     still contracting (up to 115 mmHg), so coronary perfusion pressure is negative in half the seconds. Esmolol in a
     70 y in AF 150 tips the same spiral into arrest at +10 min (CM-15b). It contaminates every AF cell: half of
     CM-05b's atrial-kick SV loss is spurious ischaemia (kIsch 0.50).
  2. **Comorbidity does not change induction (C1; CM-01b, 03b, 05a, 05d, 13a; P1).** After FU-4 propofol lowers MAP
     ≈ −20 % in every chronic cardiovascular context: 80 y −19.7 % vs −20.1 % healthy; untreated HTN −22.0 % vs
     −22.9 %; AS + CAD + HTN 75 y −18.1 % (MAP 117 → 96, never 60–65, no ST, kIsch 1.0); severe PH −23.7 % vs −23.3 %;
     HFrEF −21.3 % vs −23.3 %. GTN in severe AS falls −8.2 % vs −10 % healthy. FU-4 fixed the magnitude, not the
     dependence: the sympathetic output is a pure reflex-error term with no tonic share, so a patient who lives on high
     resting tone loses nothing extra when propofol removes it. FU-4 left S14 (elderly HTN −30…−45 %) as `it.fails`
     (−22.9 %); no stage owns the fix.
  3. **The ECG never shows ischaemia (C2; CM-04a, 04c, 05a, 05c, 05d; P1).** In 3-vessel CAD at HR 110, contractility
     falls 14–20 % but ST stays 0 mV. The ST timer counts only continuous seconds of deficit > 0.1 and resets on any
     dip; the deficit, read from the last beat once a second, swings 0–0.27 (mean 0.064, longest run 3 s against the
     45 s lag). No CM rig ever produced ST depression, so every "ST ↓ … relieved by …" teaching cell is untestable.
  4. **Obesity is double-counted (C4; CM-02a, 02b; IN).** One obese patient has two blood volumes: 8.89 L in the
     circulation (70 mL/kg × 127 kg, every volume ×W/70, so CO 10.6 L/min = ×1.85) and 6.5 L in 7c and Stage 3 (Lemmens
     gives 6.5 L). Research/12's X-O adds the lung `obesity` condition to the obese profile; that halves the time to
     SaO2 90 % (2.7 min with the profile alone — Benumof exactly — to 1.43 min), because the profile's FRC tuning
     already models the obese lung.
  5. **Chronic profiles miss their defining baseline (C5–C7; CM-01a, 03a, 06a, 07a).** COPD GOLD 3 has PaCO2 38.9 and
     HCO3 24.3 on air (tables: 45 and compensated); untreated HTN rests +13.4 mmHg (tables +20); HFrEF rests at MAP 86.6
     and LVEDP 14.1 (tables 75 and 15–20); the 80 y rests at MAP 110.6 and PaO2 90 on air (tables 90–100 and ≈ 76). In
     HTN and HFrEF the stabiliser's SBP/DBP targets and the baroreflex set point disagree.
  6. **The pulmonary circulation ignores what matters in PH (C8; CM-13a–c; P1).** Severe PH reaches PVR 5.9 WU (tables:
     10); induction causes no RV ischaemia (kIschRv 1.0); PaCO2 58 moves mPAP −0.3 mmHg (FU-6's hypercapnic PVR); and
     noradrenaline and phenylephrine give the same PAP/SAP ratio (0.33 vs 0.31).
  7. **HFrEF is not afterload-sensitive and does not flood (C9; CM-06c, 06e).** Hydralazine raises SV +3.5 % (Cohn
     1977: ≥ +8–40 %); 500 mL raises LAP +2.6 mmHg and EVLWI +0.01. Dobutamine is now in band (CO +34.9 %) on the
     FU-4 tree — FU-7 Task 17's dobutamine refit was sized on the pre-FU-4 +17.9 % and must measure first (§4).
  8. **The reflex half of the profiles works.** Elderly phenylephrine reflex bradycardia is half the young one (ratio
     0.50, tables G_v 6.5 vs 15); HTN shifts CBF autoregulation (CBF at MAP 65: 0.75 vs 0.90 of baseline); CAD
     phenylephrine beats ephedrine on supply/demand (+0.31); esmolol relieves demand in CAD and lowers LAP −12.7 in MS.
  9. **Missing profiles (C10; 10 NE + 1 MI).** No cirrhosis circulation (the `hepaticFailure` proxy leaves CO, SVR, the
     propofol fall and emergence identical to health), no `ckd`, `dan` or `osa`, and no bronchial reactivity (poorly
     controlled asthma never bronchospasms at intubation across seeds 7/8/9). All are profile-sized additions.
  10. **Pacemaker dependence works — but only under `opts.pacer` (C12).** Oversensing and loss of capture drop HR
     70 → 25 and MAP to 58 (PL). The same keys at the top level of `setRhythm`'s `opts` are accepted and silently
     ignored, which produced a false "no effect" in this run before it was caught.
- **What works (26 PL):** propofol age PK/PD (peak Ce ×1.11, peak 10 s later, depth −8 index points at the same Ce 3),
  elderly phenylephrine rescue and bleed MAP fall, obese Pplat with PBW vs TBW VT (17.2 vs 27.1) and Crs ×0.64, HTN
  CBF, CAD phenylephrine and esmolol, AS phenylephrine rescue MAP (139), HFrEF etomidate/propofol/dobutamine, COPD
  auto-PEEP (7.8 at RR 20) and Pa–EtCO2 gap (13.7), O2-induced hypercapnia direction (+3.5), bronchospasm worse on
  COPD, MS LAP +6.6 at HR 110 and its relief, CKD chemistry and succinylcholine K⁺ +0.52, rocuronium ×1.10 in CKD,
  diabetic stress glucose 11.1 mmol/L, COHb over-read 6.9 %, anaemic DO2 ratio 0.55 and transfusion Hb +1.7, pacemaker
  faults, and the MANUAL twins' direction.

## 1. Method and rig

- **Design source:** research/12 §5.7 (CM, 18 scenarios / 65 cells, battery a–g) and the run brief. Clinical names
  follow research/11 §5 (MAP, HR, CO, SV, SVR, PVR, LAP, mPAP, EF, LVEDP, CoPP, ST, SaO2, SpO2, PaCO2, EtCO2, Ppeak,
  Pplat, auto-PEEP, EVLWI, DO2, SvO2, COP, UO, K⁺, T1, Ce). kIsch is 7a's ischaemic contractility factor (1 = none).
- **Rig.** 40 y, 70 kg, 175 cm, male unless the context says otherwise; sensors ABP/CVP/PAP/SpO2/CO2/temp. "Vent" =
  ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 from 1 s (audit 08's rig). "Awake" = no airway device, spontaneous, room
  air. Interventions at T = 300 s.
- **Contexts** (§1.4 plus tables §1.5, all through the engine's `PatientProfile`): X-E 80 y (no HTN, to isolate age);
  X-O 127 kg / 175 cm + lung `obesity` 1, plus a profile-only twin; `htn` severity 1 (untreated) and 0.5 (treated);
  `cad` severe and recentMI at 65 y; AS severe + CAD severe + HTN 75 y 75 kg; `hfref` 60 y 80 kg; lung `copd` 0.75 at
  65 y; CKD proxy = `aki` + blood K 5.5 / Hb 10 / HCO3 20; `endo.diabetes` type2 (engine API only, not in
  `pme-scenario/1`); `hepaticFailure` 0.8 + albumin 25 g/L; lung `asthma` 0.5; `ph` 1; `ms` severe; permanent AF as
  the profile rhythm `afib` 80; `pacedVVI` 70 over CHB (`opts.pacer.intrinsic 'none'`); blood COHb 0.08; blood Hb 8.
  Each is compared with the healthy reference of the same age and weight.
- **Arms and readouts.** Every drug, fluid and ventilation cell runs its control arm; comorbid cells run the healthy
  pair too, so state-dependence is the difference of differences. The runner (copied from run DI and extended) samples
  the committed state read-only every 5 s (1–20 s where noted) and adds the CM readouts: ST (mV) and LV/RV kIsch, the
  `circ` event (EF, LVEDP, supply/demand), LAP, mPAP (monitor numeric), EVLWI, DO2/SvO2/CaO2, COHb, COP, FRC,
  compliance, total PEEP, Ppeak and Pplat (a one-breath 20 ms probe whose 0.3 s end-inspiratory hold runs on a COPY
  of the unit state through 7b's own `holdPressure`), Ce and cumulative dose. No pokes.
- **Rig choices a reader should know.**
  - Apnoea and lung-mechanics cells send audit 09's `thermal` GA switch, isolating the comorbidity effect from FU-6 R4.
  - "HR held at 110/150" is the instructor's `setTarget hr` in MODELED (the atrial-pacing stress test). Where a drug
    must slow the heart, atropine 1 mg makes the tachycardia instead.
  - CM-03d's "MAP 65" is set by the instructor in MANUAL, because only the brain's autoregulation is graded.
- **Grading** (research/12 §2.2): automatic, then every non-PL confirmed by hand. `invert` marks bands where a lower
  value is the stronger effect (a minimum MAP, a time to desaturation). HAND lines record where the auditor changed the
  automatic verdict and why. Bands are proposals for Ali with their source; none was widened (R45). Direction-only
  cells are listed in §8.
- **MANUAL.** Q9 is open, so CM-M1…M3 are direction-only beside their MODELED twins.
- **Runtime.** The clean full run took ≈ 18 min wall time for 69 cells.

## 2. Results

How to read the tables: values are control-subtracted unless the key names an arm; `…Pct` = % against the control at
the same sim time; `d…` = absolute difference; `…S` / `…Min` = seconds / minutes from the intervention; `…A` /
`…Healthy` = the healthy reference. Gap ids are §3. The tables are generated by `report.ts` from `out/cells.json`.

In short, family by family:
- **2.1 Elderly:** PK/PD age terms and the reflex are right; the induction fall is the healthy one (C1); resting MAP
  and PaO2 miss the tables (C5, C6); apnoea lasts longer than in the young (lower VO2, no closing-capacity term).
- **2.2 Obesity:** mechanics right; circulation sized on total weight and lung obesity double-counted (C4); no posture.
- **2.3 Hypertension:** CBF autoregulation right; resting MAP +13 (not +20); induction and laryngoscopy as in health.
- **2.4 CAD:** supply/demand works for the drugs, but ST never appears (C2).
- **2.5 AS:** behaves as a healthy 75 y on propofol and GTN (C1); the AF kick loss is half spurious (C3).
- **2.6 HFrEF:** etomidate, propofol and dobutamine plausible; baseline, fluid and afterload sensitivity weak (C5, C9).
- **2.7 COPD/asthma/OSA:** mechanics plausible; no chronic hypercapnia (C7); no reactivity, no bronchodilation (FU-6).
- **2.8 PH/MS/AF/pacing:** MS and pacing plausible; PH pulmonary pharmacology missing (C8); rapid AF lethal (C3).
- **2.9 Renal/diabetes/liver/blood:** chemistry, K⁺, rocuronium, glucose, COHb and anaemia plausible; the liver proxy
  has no circulation, COP is low, IAP 15 is inert (C10, C11).

### 2.1 Elderly 80 y (CM-01)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-01a | P1 | X-E 80 y vs X-A, awake, room air · awake baseline → none (resting values) | mapE 110.6; mapA 95.8; hrE 64.7; hrA 69.5; ppE 61.9; ppA 41.7; dPP 20.2; coE 5.42; coA 5.72; pao2E 90; pao2A 94; spo2E 96 | TS: mapE = 110.6 above [90, 105] [tables §1.1 elderly MAP set point 90–100 (PALS/B §4.9)]<br>PL: hrE = 64.7 in [55, 90] [tables §1.1 elderly resting HR 65 (55–90)]<br>PL: dPP = 20.2 (sign 1, tol 5) [tables §1.1 arterial compliance ×0.4–0.6: isolated systolic hypertension, wider pulse pressure (RVAS 2010)]<br>TW: pao2E = 90 above [65, 85] (lower = stronger/faster) [tables §1.1 shunt row: PaO2 ≈ 100 − 0.3·age on air (Sorbini 1968) = 76 at 80 y] | **TS** | C5, C6 · 7a profile / 7b |
| CM-01b | P1 | X-E 80 y vs X-A, ventilated · elderly, GA → propofol 1.5 mg/kg | mapPct -19.7; mapMin 87.6; nadirS 80; hrUp 1; hrDown -5; coPct -15.2; svrPct -18.8; arrest false; mapBase 109.6; mapPctA -20.1; extraFall 0.4 | TW: mapPct = -19.7 above [-45, -25] [research/12 CM-01: elderly induction −30–45 % (Reich 2005: age > 50 and propofol predict post-induction hypotension); tables §1.5]<br>WR: extraFall = 0.4 (expected sign -1) [R53 state-dependence: the same dose falls further in the elderly (reduced sympathetic gains ×0.6, stiff arteries; tables §1.1)]<br>PL: arrest = false (expected false) [FU-4 rule: a compensated comorbid patient must not arrest on a standard induction] | **WR** | C1 · FU-4 G2 (done) / 7a profile |
| CM-01c | P1 | X-E 80 y vs X-A, ventilated · elderly → propofol PK: 1.5 mg/kg bolus (peak Ce and its time) and Eleveld effect-site TCI 3 µg/mL for 10 min (dose delivered) | cePeakE 2614.75; cePeakA 2364.77; cePeakRatio 1.11; tPeakE 190; tPeakA 180; dTPeak 10; tciDoseE 2.7; tciDoseA 2.9; tciDoseRatio 0.93; diMinE 42; diMinA 57; diTciE 38; diTciA 46; dDiTci -8 | PL: cePeakRatio = 1.11 in [1.1, 1.7] [Schnider 1999 / Eleveld 2018: age shrinks V1 and clearance, so the same mg/kg gives a higher peak Ce in the elderly]<br>PL: dTPeak = 10 (sign 1, tol 4) [research/12 CM-01: slower onset in the elderly (Ce peak later; slower circulation, Upton 1999)]<br>PL: dDiTci = -8 (sign -1, tol 3) [Eleveld 2018 PD: Ce50 = 3.08·exp(−0.00635·(age − 35)) → 2.3 µg/mL at 80 y vs 3.0 at 40 y, so the same Ce 3 is deeper in the elderly — the PD half of "30–50 % less propofol" (Miller 10e ch. 21); the PK half is tciDoseRatio (reported, not graded: research/12 put the whole reduction on "the same Ce", which the sources do not support)] | **PL** | — · 7g PK (Eleveld/age) |
| CM-01d | P1 | X-E 80 y vs X-A, ventilated · post-induction hypotension (propofol 1.5 mg/kg at T) → phenylephrine 100 µg at T + 120 s | mapRiseE 37.9; mapRiseA 32.3; hrDropE -4; hrDropA -8; hrDropRatio 0.5 | PL: mapRiseE = 37.9 (sign 1, tol 8) [tables §6.2: phenylephrine 100 µg MAP +15–25 % (the elderly respond at least as much)]<br>PL: hrDropRatio = 0.5 in [0.2, 0.7] [tables §1.1 baroreflex vagal gain elderly 5–8 vs adult 15 ms/mmHg (Gribbin 1971; DM-BRS): smaller reflex bradycardia] | **PL** | — · 7a baroreflex (profile G_v) |
| CM-01e | P1 | X-E 80 y vs X-A, ventilated · GA (no drug), normovolaemic → bleed 1 L over 10 min | mapDropE -11.5; mapDropA -6.3; extraDrop -5.2; hrRiseE 27; hrRiseA 28; hrRiseRatio 0.96; uopE 24.8; lactPeakE 1.5; arrest false | PL: extraDrop = -5.2 (sign -1, tol 2) [tables §1.1 sympathetic gains ×0.6 in the elderly: the same loss drops MAP further (ATLS 10e geriatric trauma)]<br>TS: hrRiseRatio = 0.96 above [0.3, 0.8] [tables §1.1 (g ×0.6); ATLS 10e: the elderly may not mount a tachycardia]<br>PL: arrest = false (expected false) [FU-4 rule: a compensated comorbid patient must not arrest on a standard induction] | **TS** | C11 · 7a baroreflex (profile gSymp) |
| CM-01f | P1 | X-E 80 y vs X-A, awake → induced apnoea · preoxygenated 3 min, propofol + rocuronium, open airway → apnoea: time to SaO2 90 % | minE 9.13; minA 7.87; dMin 1.26; frcGaE 1400; frcGaA 1400; vo2E 173.4; vo2A 202.3; pao2PreE 588 | WR: dMin = 1.26 (expected sign -1) [research/12 CM-01 (direction only — no sourced band): closing capacity exceeds the supine FRC from ≈ 44 y (tables §1.1 FRC row, BJAEd closing capacity), so the elderly desaturate sooner despite a lower VO2] | **WR** | C6 · 7b / Stage 3 (profile FRC and closing capacity) |
| CM-M1 | P1 | X-E 80 y, ventilated, MANUAL (MODELED twin CM-01b) · GA → propofol 1.5 mg/kg | mapPct -15.2; mapMin 85.5; nadirS 190; hrUp 0; hrDown 0; coPct 0.1; svrPct -18.8; arrest false | PL: mapPct = -15.2 (sign -1, tol 5) [Q9 open: in MANUAL the non-reflex physiology still acts (audit 08 Q9); direction only] | **PL** | C1 · Q9 (MANUAL physiology) |

### 2.2 Obesity BMI 41 (CM-02)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-02a | P1 | X-O BMI 41 (+ lung obesity) vs X-A, awake, room air · awake baseline → none (resting values); the profile-only twin checks double counting | coO 10.6; coA 5.72; coRatio 1.85; bvMlKg 70; bvMl 8890; frcGaRatio 0.43; frcGaRatioProfileOnly 0.43; crsO 35; crsOp 54.1; crsA 54; pao2O 89.7; pao2Op 94.6; mapO 87.8 | TS: coRatio = 1.85 above [1.2, 1.5] [tables §1.3 BMI ≥ 40: resting CO ×1.35 (emerges from VO2 and blood volume)]<br>TS: bvMlKg = 70 above [48, 57] [tables §1.3 / Lemmens 2006: 70/√(BMI/22) = 51 mL/kg actual weight at BMI 41]<br>PL: frcGaRatio = 0.43 in [0.4, 0.6] [tables §1.3 FRC factor 0.5 at BMI ≥ 40 (floor 0.4) — one factor, not profile × lung condition]<br>HAND IN (automatic TS): one patient, two blood volumes: 7a sizes the circulation on total body weight (70 mL/kg × 127 kg = 8.89 L; circ/profile.ts:94, 110 — every volume and compliance ×W/70, so CO ×1.85), while 7c and Stage 3 use the adjusted weight (6.48 L and 6.52 L; gas/params.ts:152, 159). Lemmens gives 6.5 L. The FRC factor is applied once (no double count with lung `obesity`) | **IN** | C4 · 7a/7c profile + Stage 3 gasPatient + 7b obesity |
| CM-02b | P1 | X-O BMI 41 vs X-A, awake → induced apnoea · preoxygenated 3 min, propofol + rocuronium → apnoea: time to SaO2 90 % | minO 1.43; minA 7.87; frcGaO 597.8 | TS: minO = 1.43 below [2, 3.5] (lower = stronger/faster) [Benumof 1997 (Anesthesiology 87:979): 127 kg adult, SaO2 90 % at 2.7 min after full preoxygenation; Jense 1991]<br>HAND IN (automatic TS): two commands for one body habitus stack: with the profile alone (127 kg, 175 cm) the time is 2.7 min — Benumof exactly, the value gasPatient was tuned to (gas/params.ts:142–143, FRC ×0.43); adding research/12 X-O's lung `obesity` 1 raises the pre-apnoea shunt 0.04 → 0.07 and cuts compliance 54 → 35, halving the time to 1.43 min with the SAME FRC (598 mL). The catalogue condition re-applies what the profile already models (probe on 0fd5397) | **IN** | C4 · Stage 3 / 7b (FRC); FU-6 R4 removes the switch |
| CM-02c | P1 | X-O BMI 41 vs X-A, ventilated (thermal GA) · GA, VCV 14/min, PEEP 5 → VT 6 mL/kg PBW (423 mL) vs 6 mL/kg TBW (762 mL) | pplatPBW 17.2; pplatTBW 27.1; dPplat 9.9; ppeakPBW 21; pplatA 12.9; crsO 35; crsA 55; crsRatio 0.64; paco2PBW 42.1; pao2PBW 272.9 | PL: pplatPBW = 17.2 in [10, 30] [ARDSNet / lung-protective ventilation: VT by predicted body weight keeps Pplat ≤ 30 in the obese]<br>PL: dPplat = 9.9 in [5, 25] [Pelosi 1998: total-body-weight VT in a stiff obese respiratory system raises Pplat several cmH2O]<br>PL: crsRatio = 0.64 in [0.5, 0.8] [tables §1.3 respiratory compliance ×0.65 at BMI ≥ 40 (Pelosi 1998: Crs −30–40 %)] | **PL** | — · 7b mechanics (obesity) |
| CM-02d | P1 | X-O BMI 41 vs X-A, ventilated (thermal GA), VT 6 mL/kg PBW · induction atelectasis → PEEP 5 → 10 plus a recruitment manoeuvre 40 cmH2O × 30 s at T | pao2PreO 266.5; pao2PctO 3.1; pao2PctA -0.4; shuntPreO 0.03; shuntPostO 0.01; mapPctO -0.6 | TW: pao2PctO = 3.1 (sign 1, tol 10) [Reinius 2009 (Anesthesiology 111:979) / Futier 2011: a recruitment manoeuvre + PEEP 10 raises PaO2 and cuts atelectasis in BMI > 40]<br>TW: pao2PctO = 3.1 below [15, 150] [Pelosi 1999 / Reinius 2009: PaO2/FiO2 rises ≈ 20–100 % in the morbidly obese after RM + PEEP] | **TW** (FU-6 R14 pending) | C4 · 7b recruitment (obesity atelectasis) |
| CM-02e | P1 | X-O BMI 41, ventilated · GA supine → reverse Trendelenburg 30° | frcGaPre 597.8; frcGaPost 597.8; dPao2 0; dMap 0; dCbf 0 | WR: dPao2 = 0 (expected sign 1) [Perilli 2000 / tables §1.3: reverse Trendelenburg raises FRC and PaO2 in the obese]<br>HAND NE (automatic WR): no whole-body tilt exists: the only posture input (7d `position` headUpDeg) moves cerebral hydrostatics only — FRC, compliance and venous return are unchanged (measured below); research/12 NE blocker "posture" | **NE** | C10 · posture stage (FU-7 "surgical events and posture") |

### 2.3 Hypertension (CM-03)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-03a | P1 | htn untreated (sev 1) / treated (sev 0.5) vs X-A, awake · awake baseline → none (resting values) | mapU 109.2; mapT 102.7; mapA 95.8; dMapU 13.4; dMapT 6.9; ppU 51.5; ppA 41.7; hrU 69.8 | TW: dMapU = 13.4 below [15, 25] [tables §1.5 htn: MAP set point +20 untreated]<br>PL: dMapT = 6.9 in [5, 15] [tables §1.5 htn: +10 treated] | **TW** | C5 · 7a profile |
| CM-03b | P1 | htn untreated vs X-A, ventilated · GA → propofol 2 mg/kg | mapPct -22; mapMin 85; nadirS 70; hrUp 3; hrDown -3; coPct -15.9; svrPct -20.9; arrest false; mapPctTreated -22.5; mapPctA -22.9; extraFall 0.9 | TW: mapPct = -22 above [-50, -30] [tables §1.5 htn: larger induction fall (40 % vs 30 %) (Prys-Roberts 1971; Reich 2005)]<br>WR: extraFall = 0.9 (expected sign -1) [R53: the hypertensive falls further than the normotensive on the same dose]<br>PL: arrest = false (expected false) [FU-4 rule: a compensated comorbid patient must not arrest on a standard induction] | **WR** | C1 · FU-4 G2 (done) / 7a profile |
| CM-03c | P1 | htn untreated vs X-A, ventilated · propofol 2 mg/kg at T (no opioid) → laryngoscopy stimulus 1.5 for 60 s at T + 120 s | dMapU 10.8; dMapA 9.1; ratio 1.19; dHrU 7; dHrA 6 | TW: dMapA = 9.1 below [20, 40] [Miller 10e airway ch.: laryngoscopy after an induction dose raises MAP +20–40 mmHg (Shribman 1987); FU-7 ruling 1]<br>TW: ratio = 1.19 below [1.3, 3] [Prys-Roberts 1971 (BJA 43:531): untreated hypertensives show an exaggerated pressor response to laryngoscopy (≈ 2× normotensives)] | **TW** (FU-7 Task 10 pending) | C11 · 7e stimulus / 7a set point |
| CM-03d | P1 | htn untreated vs X-A, ventilated, MANUAL (the instructor sets the pressure) · MAP lowered to ≈ 65 by the instructor → cerebral blood flow at MAP 65 vs each patient's own baseline | mapU 70.9; mapA 67.3; cbfRelU 0.75; cbfRelA 0.9; dCbf -0.15 | PL: cbfRelA = 0.9 in [0.9, 1.1] [Lassen 1959 / Miller ch. 11: MAP 65 lies on the normotensive autoregulation plateau]<br>PL: cbfRelU = 0.75 in [0.6, 0.9] [tables §1.5 htn: CBF lower limit +15–20 (Strandgaard 1973): below the shifted limit CBF falls] | **PL** | — · 7d brain (HTN_LL_SHIFT) |

### 2.4 Coronary artery disease (CM-04)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-04a | P1 | cad severe (3-vessel, CFR 1.4) and recent MI vs 65 y healthy, ventilated · GA, resting → HR 70 → 110 held for 10 min | stMinSevere 0; stMinMI 0; stMinHealthy 0; stMinSevereAwakeAir 0; kIschSevereAwakeAir 0.9; supDemAwakeAir 0.94; kIschSevere 0.8; kIschMI 0.9; supDemSevere 0.98; supDemHealthy 2.37; mapSevere 112.5; hrSevere 111 | WR: stMinSevere = 0 above [-0.3, -0.1] [tables §3 / §7 check 10: ischaemia (ST ↓ ≥ 1 mm) when demand exceeds the CFR-limited supply; ACC/AHA exercise testing: 3-vessel disease is ischaemic at HR ≈ 100–110]<br>WR: stMinMI = 0 above [-0.3, -0.1] [tables §1.5 cad recent MI (CFR 1.4, Ees ×0.8)]<br>PL: stMinHealthy = 0 (quiet, tol ±0.049) [quiet: a healthy 65 y heart at HR 110 has no ischaemia (CFR 3.5)]<br>HAND IN (automatic WR): the ischaemia is computed twice and the two disagree: contractility falls 14–20 % (kIsch 0.80–0.86, a low-pass of the flow deficit, τ 20 s; coronary.ts:159–162) while ST stays 0 — the ST timer counts only CONTINUOUS seconds of δ > 0.1 and resets on any dip (coronary.ts:180–181); δ is read from the last beat once a second and swings 0–0.27 (mean 0.064, 28 % of seconds > 0.1, longest run 3 s vs the 45 s lag; probe on 0fd5397), so ST never appears in any CAD rig | **IN** | C2 · 7a coronary.ts |
| CM-04b | P1 | cad severe 65 y, ventilated · post-induction hypotension (propofol 2 mg/kg at T) → phenylephrine 100 µg vs ephedrine 10 mg at T + 120 s | supDemPhe 1.59; supDemEph 1.28; supDemNone 1.31; dSupDem 0.31; hrPhe -4; hrEph 7; mapPhe 37.5; mapEph 12.5; kIschNone 1; stNone 0 | PL: mapPhe = 37.5 (sign 1, tol 8) [tables §6.2: phenylephrine 100 µg MAP +15–25 %]<br>PL: dSupDem = 0.31 (sign 1, tol 0.02) [tables §7 check 10 / Miller ch. on ischaemic heart disease: phenylephrine restores diastolic pressure without tachycardia, so supply/demand is better than after ephedrine] | **PL** | — · 7a coronary / 7g |
| CM-04c | P1 | cad severe vs 65 y healthy, ventilated · GA (no drug) → bleed 1 L over 10 min | stMinSevere 0; stMinHealthy 0; kIschSevere 1; hrPeakSevere 96; mapMinSevere 98.5; cppMinSevere 75.9; supDemMinSevere 1.1 | WR: stMinSevere = 0 above [-0.3, -0.05] [tables §3: haemorrhage lowers diastolic pressure and raises HR — subendocardial ischaemia in 3-vessel disease (Miller ch. on ischaemic heart disease)]<br>PL: stMinHealthy = 0 (quiet, tol ±0.049) [quiet: 1 L in a healthy 65 y causes no ischaemia]<br>HAND TW (automatic WR): no ischaemia at all (kIsch 1, supply/demand ≥ 1.1): 1 L under GA keeps MAP ≈ 98 and HR ≤ 96 in this profile, so the demand never crosses the CFR-1.4 supply; direction only (the ST band is the tables' teaching, not a measured incidence) | **TW** | C2 · 7a coronary.ts |
| CM-04d | P1 | cad severe 65 y, ventilated · tachycardia after atropine 1 mg at T → esmolol 1 mg/kg at T + 180 s vs none | hrAtropine 100.8; hrDrop -12; supDemGain 0.14; kIschAtropine 0.9; kIschEsmolol 1; stAtropine 0; mapDrop -1.1 | PL: hrDrop = -12 in [-30, -10] [tables §6.2: esmolol 0.5–1 mg/kg HR −10–20 % (from ≈ 100)]<br>PL: supDemGain = 0.14 (sign 1, tol 0.02) [tables §7 check 10 / Miller: β-blockade relieves demand ischaemia (longer diastole, lower HR)] | **PL** | — · 7g esmolol / 7a coronary |

### 2.5 Severe aortic stenosis + CAD + HTN (CM-05)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-05a | P1 | AS severe + CAD severe + HTN 75 y vs 75 y healthy, ventilated · compensated → propofol 1.5 mg/kg | mapPct -18.1; mapMin 95.6; nadirS 80; hrUp 2; hrDown -3; coPct -11.9; svrPct -17.9; arrest false; mapBase 117.2; mapAt2min 96.9; mapPctA -19.6; extraFall 1.5; stMin 0; kIschMin 1 | TW: mapMin = 95.6 above [55, 70] (lower = stronger/faster) [tables §7 check 10: severe AS, propofol 1.5 mg/kg → MAP 103 → 60–65 at 2 min]<br>WR: stMin = 0 above [-0.3, -0.1] [tables §7 check 10: ST depression follows the induction fall in AS + CAD]<br>TW: kIschMin = 1 above [0.3, 0.75] (lower = stronger/faster) [tables §7 check 10: Ees falls ≥ 25 % (the ischaemic spiral), recoverable]<br>PL: arrest = false (expected false) [FU-4 rule: a compensated comorbid patient must not arrest on a standard induction] | **WR** | C1, C2 · FU-4 G2 (done) / 7a coronary |
| CM-05b | P1 | AS severe + CAD + HTN 75 y vs 75 y healthy, ventilated · sinus → AF onset at 100/min vs sinus held at 100/min (isolates the atrial kick) | svPctAS -22; svPctHealthy -7.7; extraLoss -14.3; mapAF 114.5; mapSinus 122.5; hrAF 106.6; hrSinus 100.9; stMinAF 0; kIschMinAF 0.5; kIschMinAFHealthy 0.7 | PL: svPctAS = -22 in [-35, -15] [tables §1.5 / B §4.8 k_rhythm 0.75–0.85; research/12 CM-05: the stiff hypertrophied LV loses SV −20–30 % without the atrial kick]<br>PL: extraLoss = -14.3 (sign -1, tol 3) [R53: the atrial contribution is larger in LVH/AS than in a compliant ventricle (Miller, valvular heart disease)]<br>HAND IN (automatic PL): the SV loss lands in band for a partly wrong reason: in AF at 100/min the coronary model makes the ventricle ischaemic (kIsch 0.50 in AS, 0.70 in the healthy 75 y; sinus at 100 keeps 1.0), so contractility loss adds to the lost atrial kick — gap C3 (per-beat LVEDP sampled mid-relaxation on short AF cycles) | **IN** | C3 · 7a atria (atrial kick) / Stage 5 AF |
| CM-05c | P1 | AS severe + CAD + HTN 75 y, ventilated · post-induction hypotension (propofol 1.5 mg/kg at T) → phenylephrine 100 µg at T + 120 s | mapPeakPhe 139; mapNone 98.4; stAt5Phe 0; stAt5None 0; stGain 0; hrPhe -3 | PL: mapPeakPhe = 139 in [85, 999] [tables §7 check 10: phenylephrine 100 µg → MAP ≥ 85 within 90 s]<br>WR: stGain = 0 (expected sign 1) [tables §7 check 10: restoring diastolic pressure relieves the ST depression]<br>HAND TW (automatic WR): the rescue itself is right (MAP ≥ 85 in 90 s); the ST half cannot be tested because CM-05a never produces ischaemia (inherits CM-05a) | **TW** | C2 · 7a coronary / 7g |
| CM-05d | P1 | AS severe + CAD + HTN 75 y vs 75 y healthy, ventilated · GA (no induction drug) → GTN 1 µg/kg/min for 10 min | mapPctAS -8.2; mapPctHealthy -10; extraFall 1.8; svPctAS -29.3; stMinAS 0; kIschMinAS 1 | WR: extraFall = 1.8 (expected sign -1) [research/12 CM-05 / tables §7 check 10 "GTN harms": with a fixed outflow orifice, venodilation drops SV and pressure far more than in a healthy heart (Miller, valvular heart disease)]<br>WR: stMinAS = 0 above [-0.3, -0.05] [tables §7 check 10: the pressure fall provokes subendocardial ischaemia in AS + CAD] | **WR** | C1, C2 · 7g GTN / 7a |
| CM-M2 | P1 | AS severe + CAD + HTN 75 y, ventilated, MANUAL (MODELED twin CM-05a) · GA → propofol 1.5 mg/kg | mapPct -13.4; mapMin 57.8; nadirS 180; hrUp 3; hrDown 0; coPct -1.4; svrPct -19.6; arrest false | PL: mapPct = -13.4 (sign -1, tol 5) [Q9 open: in MANUAL the non-reflex physiology still acts (audit 08 Q9); direction only] | **PL** | C1 · Q9 (MANUAL physiology) |

### 2.6 HFrEF (CM-06)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-06a | P1 | hfref 60 y vs 60 y healthy, ventilated · compensated HFrEF → none (resting values) | ef 0.38; efA 0.58; lvedp 14.1; pla 12.4; map 86.6; co 5.48; coA 5.79; papMean 23.8; evlwi 0; hr 70.1 | PL: ef = 0.38 in [0.2, 0.4] [tables §1.5 hfref: EF 30 % (ESC HF 2021)]<br>TW: lvedp = 14.1 below [15, 22] [tables §1.5 hfref: LVEDP 15–20]<br>TS: map = 86.6 above [70, 85] [tables §1.5 hfref: MAP set point 75] | **TS** | C5 · 7a profile |
| CM-06b | P1 | hfref 60 y vs 60 y healthy, ventilated · compensated HFrEF → etomidate 0.3 mg/kg vs propofol 2 mg/kg | mapPctEtom -1.6; mapPctProp -21.3; mapPctPropHealthy -23.3; extraFall 2; svPctProp -9.8; mapMinProp 68.2; arrest false | PL: mapPctEtom = -1.6 in [-15, 0] [Miller ch. 21 / tables §6.3: etomidate MAP −0–10 %, the stable induction in HFrEF]<br>PL: mapPctProp = -21.3 in [-40, -20] [tables §1.5 hfref (afterload-sensitive, blunted reflex G_v ×0.5): propofol falls at least as much as in health]<br>PL: arrest = false (expected false) [FU-4 rule: a compensated comorbid patient must not arrest on a standard induction] | **PL** | C1 · FU-4 G2 (done) / 7g |
| CM-06c | P1 | hfref 60 y vs 60 y healthy, ventilated · compensated HFrEF (LVEDP ≈ 18) → Ringer's lactate 500 mL over 10 min | dPlaHF 2.6; dPlaA 1.4; svPctHF 7.6; svPctA 13.4; evlwiHF 0.01; evlwiGainHF 0.01; pao2PctHF 0.7 | TW: dPlaHF = 2.6 below [3, 12] [tables §1.5 hfref (β ×1.3, flat Starling curve): 500 mL raises the filling pressure several mmHg]<br>PL: svPctHF = 7.6 in [-5, 8] [tables §1.5 hfref / ESC HF 2021: the failing ventricle is on the flat part of its curve — little SV gain]<br>TW: evlwiGainHF = 0.01 (sign 1, tol 0.1) [research/12 CM-06: fluid raises PAWP → pulmonary oedema (Starling filtration, tables §2)] | **TW** | C9 · 7a EDPVR / 7c lung water |
| CM-06d | P1 | hfref 60 y, ventilated · low-output HFrEF → dobutamine 5 µg/kg/min | coPct 34.9; svPct 14.6; hrUp 4; mapD 2.1; dPla -6.8 | PL: coPct = 34.9 in [20, 45] [tables §7 check 20 / T6.2: dobutamine 5 µg/kg/min CO +20–40 % in a failing ventricle] | **PL** (FU-7 Task 17 pending) | — · 7g dobutamine |
| CM-06e | P1 | hfref 60 y vs 60 y healthy, ventilated · compensated HFrEF → afterload reduction: hydralazine 10 mg IV | svPctHF 3.5; svPctA 1.5; mapPctHF -5.7; mapPctA -8.7; svrPctHF -15.3; dPlaHF -7.4 | TW: svPctHF = 3.5 below [8, 40] [Cohn & Franciosa 1977 (NEJM 297:27): arteriolar dilators raise SV in the failing ventricle (afterload-sensitive), tables §1.5]<br>PL: mapPctHF = -5.7 in [-15, 0] [Cohn 1977: in heart failure the SV rise offsets the SVR fall, so MAP falls little] | **TW** | C9 · 7a (afterload sensitivity) / 7g hydralazine |
| CM-M3 | P1 | hfref 60 y, ventilated, MANUAL (MODELED twin CM-06b) · GA → propofol 2 mg/kg | mapPct -17; mapMin 83.9; nadirS 190; hrUp 0; hrDown 0; coPct 0.2; svrPct -21.4; arrest false | PL: mapPct = -17 (sign -1, tol 5) [Q9 open: in MANUAL the non-reflex physiology still acts (audit 08 Q9); direction only] | **PL** | C1 · Q9 (MANUAL physiology) |

### 2.7 COPD, asthma, OSA (CM-07, CM-11, CM-12)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-07a | P1 | copd GOLD 3 (lung copd 0.75) vs 65 y healthy, awake, room air · stable chronic COPD → none (resting values) | paco2 38.9; paco2A 38.7; hco3 24.3; ph 7.41; pao2 82; pao2A 90; spo2 95; rr 15; hb 13.5 | TW: paco2 = 38.9 below [43, 52] [tables §1.5 copd GOLD 3: PaCO2 45 (chronic CO2 retention)]<br>TW: hco3 = 24.3 below [26, 32] [tables §1.5 copd: HCO3 renally compensated (≈ +3.5 per 10 mmHg chronic PaCO2 rise)]<br>TW: pao2 = 82 above [55, 75] (lower = stronger/faster) [GOLD 2024 / tables §1.5 V/Q admixture 0.12: resting PaO2 55–75 on air in GOLD 3] | **TW** | C7 · 7b copd / 7c acid–base |
| CM-07b | P1 | copd GOLD 3 vs 65 y healthy, ventilated (thermal GA) · induced and ventilated, VCV 600 mL, PEEP 5 → RR 12 → 20 at T (auto-PEEP); Pa–EtCO2 gap | autoPeep12 3.5; autoPeep20 7.8; autoPeep20A 0.6; ppeak12 26.3; ppeak20 36.8; pplat20 21.7; gap 13.7; gapA 3.9; mapPct20 -12.2; cvp20 13.1; cvp20A 7.6 | PL: autoPeep20 = 7.8 in [3, 12] [tables §1.5 copd (tauSlow, R ×2.5): auto-PEEP at high RR (Barash, obstructive disease; A09-F2 GOLD 4)]<br>PL: gap = 13.7 in [8, 20] [tables §1.5 copd: VD/VT 0.50 at GOLD 3 → wide Pa–EtCO2 gap (COPD-VD)] | **PL** | — · 7b mechanics / dead space |
| CM-07c | P1 | copd GOLD 3 vs 65 y healthy, awake spontaneous · chronic hypercapnia on air → FiO2 0.21 → 1.0 for 30 min (uncontrolled oxygen) | dPaco2 3.5; dPaco2A 1.8; dVe -0.8; phEnd 7.38 | PL: dPaco2 = 3.5 in [3, 20] [research/12 CM-07 / Aubier 1980 (ARRD 122:747): high FiO2 in hypercapnic COPD raises PaCO2 +5–20 (Haldane, lost HPV, reduced drive)]<br>PL: dPaco2A = 1.8 (quiet, tol ±3) [quiet: a healthy subject's PaCO2 barely moves on 100 % O2] | **PL** (FU-6 (drive) pending) | C7 · 7b V/Q + HPV / Stage 3 drive |
| CM-07d | P2 | copd GOLD 3 vs 65 y healthy, ventilated (thermal GA), RR 12 · GA → bronchospasm (lung bronchospasm 0.5) at T | dPpeakCOPD 14.4; dPpeakHealthy 10; ratio 1.44; autoPeepCOPD 8.8; autoPeepHealthy 3.5; spo2MinCOPD 99; mapMinCOPD 101; mapMinHealthy 104.8 | PL: ratio = 1.44 in [1.1, 5] [Barash, obstructive disease: the same bronchoconstriction on an obstructed, slow-emptying lung gives more peak pressure and hyperinflation (direction; band proposed)]<br>PL: autoPeepCOPD = 8.8 (sign 1, tol 2) [tables §1.5 copd: bronchospasm on COPD → dynamic hyperinflation (auto-PEEP)] | **PL** | — · 7b mechanics |
| CM-07e | P1 | copd GOLD 3 vs 65 y healthy, TIVA 30 min, ventilated · emergence → extubation to FiO2 0.4 at 40 min | paco2MaxCOPD 46.2; paco2MaxHealthy 41.4; dPaco2 4.8; spo2MinCOPD 98; spo2MinHealthy 99; veCOPD 6.4; rrCOPD 16.1; phMinCOPD 7.3; consciousAt2400 true | PL: dPaco2 = 4.8 (sign 1, tol 3) [tables §1.5 / GOLD: after extubation the COPD patient retains more CO2 (fatigue-prone, high VD/VT) — direction only]<br>TW: paco2MaxCOPD = 46.2 below [50, 70] [GOLD 2024 / Barash: post-extubation hypercapnic respiratory failure risk in GOLD 3 (PaCO2 > 50) — band proposed] | **TW** (FU-6 (drive, fatigue) pending) | C7 · 7b / Stage 3 drive |
| CM-11a | P2 | asthma (lung asthma 0.5) vs X-A, seeds 7/8/9 · awake → induction → laryngoscopy and intubation (airway instrumentation) | ppeak7 18.7; ppeak8 18.7; ppeak9 18.7; ppeakHealthy 17.1; spread 0 | WR: spread = 0 (expected sign 1) [tables §1.5 asthma: bronchospasm at airway instrumentation with probability 0.1–0.2 in poorly controlled asthma (Asthma-BJA) — some seeds must bronchospasm]<br>HAND MI (automatic WR): no bronchial-reactivity state: instrumentation never triggers bronchospasm (identical Ppeak across seeds) — research/12 CM-11 "no reactivity model" | **MI** | C10 · FU-7 profile (bronchial reactivity) |
| CM-11b | P2 | asthma 0.5 + lung bronchospasm 0.5, ventilated (thermal GA) · intra-operative bronchospasm → sevoflurane 2 % (≈ 1 MAC) | ppeakBefore 38.7; ppeakSevo 38.7; ppeakCtl 38.7; ppeakPct 0; mac 0.82 | WR: ppeakPct = 0 above [-35, -10] [tables §1.5 asthma / Rooke 1997 (Anesthesiology 86:1294): sevoflurane ≈ 1 MAC lowers respiratory resistance ≈ 15–30 %] | **WR** (FU-6 R2 pending) | C11 · FU-6 R2 (bronchodilation) |
| CM-12a | P2 | OSA severe · sedation → opioid (fentanyl 1 µg/kg) under sedation | — | no `osa` condition (tables §1.5: upper-airway collapse at depth index < 90, opioid ventilatory C50 ×0.6); DI-43 same blocker | **NE** | C10 · FU-7 profile (osa) |
| CM-12b | P2 | OSA severe · emergence → extubation with residual opioid | — | no `osa` condition: post-extubation obstruction cannot be expressed | **NE** | C10 · FU-7 profile (osa) |

### 2.8 Pulmonary hypertension, mitral stenosis, AF, pacemaker (CM-13 to CM-16)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-13a | P1 | ph severe (PVR ×3, RV Ees ×1.6) vs 55 y healthy, ventilated · compensated PH → propofol 2 mg/kg | papMeanBase 35.2; pvrWU 5.9; mapPct -23.7; mapPctHealthy -23.3; extraFall -0.4; kIschRvMin 1; mapMin 73.7; arrest false | PL: papMeanBase = 35.2 in [35, 60] [ESC/ERS 2022 PH (tables §1.5 ph severe, PVR 10 WU): mPAP typically 40–60 in severe PH]<br>TW: extraFall = -0.4 (sign -1, tol 3) [Barash / Miller ch. on PH: induction hypotension lowers RV coronary perfusion — the RV ischaemia spiral; the fall is larger than in health (R53)]<br>TW: kIschRvMin = 1 above [0.3, 0.95] (lower = stronger/faster) [research/12 CM-13: RV ischaemia after induction (FU-4 G5 RV perfusion term)]<br>PL: arrest = false (expected false) [FU-4 rule: a compensated comorbid patient must not arrest on a standard induction] | **TW** | C1, C8 · 7a PH profile / FU-4 G5 |
| CM-13b | P1 | ph severe vs 55 y healthy, ventilated · GA → hypoventilation: VT 600 → 300 at T (PaCO2 ≈ 60) | paco2End 58.1; dPap -0.3; dPapHealthy -0.4; dMap 2.1; kIschRvMin 1; phEnd 7.27 | WR: dPap = -0.3 (expected sign 1) [Barash PH / Balanos 2003: hypercapnia and acidosis raise PVR (PaCO2 60 → mPAP +5–10 in PH)] | **WR** (FU-6 (hypercapnic PVR, A09-F6) pending) | C8 · 7b HPV / 7a PVR |
| CM-13c | P1 | ph severe 55 y, ventilated · post-induction hypotension (propofol 2 mg/kg at T) → noradrenaline 0.1 vs phenylephrine 1 µg/kg/min from T + 120 s | ratioNA 0.33; ratioPE 0.31; ratioNone 0.41; dRatio 0.02; mapNA 113; mapPE 119.5; coNA 4.64; coPE 4.33; kIschRvNA 1; kIschRvPE 1 | WR: dRatio = 0.02 (expected sign -1) [Kwak 2002 (Anaesthesia 57:9) / Barash PH: noradrenaline lowers the PAP/SAP ratio more than phenylephrine, which raises PVR — noradrenaline preferred (direction only)] | **WR** | C8 · 7g α/β rows on the pulmonary circuit |
| CM-13d | P2 | ph severe, ventilated · RV afterload crisis → inhaled nitric oxide 20 ppm | — | no inhaled nitric oxide (or inhaled prostacyclin) in the library (research/12 §5.11 "missing drugs"); expected: PVR −20–40 %, mPAP −5–10 without systemic hypotension (Barash PH) | **NE** | C8 · FU-7 drug library (missing drug: iNO) |
| CM-14a | P2 | ms severe 55 y vs 55 y healthy, ventilated · compensated MS → HR 70 → 110 held for 10 min | laBase 16.9; la110 23.5; dLa 6.6; dLaHealthy -0.8; papBase 28.5; pap110 34; coPct -2.3 | PL: dLa = 6.6 in [5, 15] [ACC/AHA 2020 / Gorlin: the transmitral gradient rises with (flow/diastolic filling period)² — HR 70 → 110 roughly doubles it (LAP +5–15)]<br>PL: dLaHealthy = -0.8 (quiet, tol ±3) [quiet: a normal mitral valve adds no gradient at HR 110] | **PL** | — · 7a mitral valve (Gorlin) |
| CM-14b | P2 | ms severe 55 y, ventilated · HR 110 held (CM-14a) → lung water and oxygenation after 10 min of tachycardia | evlwiGain 0.85; pao2Pct -0.3; pCap 24.9 | PL: evlwiGain = 0.85 (sign 1, tol 0.2) [ACC/AHA 2020: tachycardia in severe MS precipitates pulmonary oedema (LAP > 25; tables §2 Starling filtration)]<br>TW: pao2Pct = -0.3 (sign -1, tol 3) [pulmonary oedema widens the A–a gradient (direction only)] | **TW** | C9 · 7c lung water / 7b diffusion |
| CM-14c | P2 | ms severe 55 y, ventilated · tachycardia after atropine 1 mg at T → esmolol 1 mg/kg at T + 180 s vs none | hrAtropine 107.4; hrDrop -10; dLa -12.7; dMap -0.93 | PL: dLa = -12.7 (sign -1, tol 1) [ACC/AHA 2020 / Miller valvular disease: rate control lengthens diastole and lowers LAP in MS] | **PL** | — · 7g esmolol / 7a |
| CM-15a | P2 | permanent AF 80/min (profile rhythm) vs 70 y sinus, ventilated · rate-controlled AF → propofol 2 mg/kg | rhythmBase afib; hrBase 81.9; mapPctAF -24.8; mapPctSinus -22.6; extraFall -2.2; hrUpAF 4; hrUpSinus 0; kIschMinAFctl 0.9; kIschMinAFprop 0.9 | PL: extraFall = -2.2 (sign -1, tol 2) [tables §1.5 af / Miller: without atrial transport, the preload fall of induction costs more SV (direction only)] | **PL** | C3 · 7a atria / Stage 5 AF |
| CM-15b | P2 | AF 70 y, ventilated · AF with RVR 150/min → esmolol 0.5 mg/kg vs none | hrBase 160.3; hrDrop -12.9; mapGain -14.9; svGain -4.7; coGain -1.01 | TW: hrDrop = -12.9 above [-45, -15] [tables §6.2 / ESC AF 2020: esmolol slows AF conduction (HR −15–30 %)]<br>WR: mapGain = -14.9 (expected sign 1) [tables §1.5 af: rate control lengthens filling, SV rises and MAP improves (direction only)] | **WR** | C3 · 7g esmolol (AV node) / 7a |
| CM-15c | P1 | healthy 40 y and 70 y (normal coronaries, CFR 3.5), ventilated · AF with RVR 150/min for 20 min → none (the rhythm itself; quiet check added after CM-15b arrested) | kIschMin40 0; kIschMean40 0.19; kIschMin70 0.2; kIschSinus150 1; negCppSamples40 123; lvedpMax40 115.1; svMean40 9.8; mapMean40 44; arrest40 true; arrest70 false | WR: kIschMin40 = 0 below [0.9, 1] [quiet: AF at 150/min in a heart with normal coronaries causes no global ischaemic contractility loss (CFR 3.5; tables §3; ESC AF 2020 — tachycardia-induced cardiomyopathy takes weeks)]<br>WR: arrest40 = true (expected false) [a healthy 40 y does not arrest from 20 min of AF 150 (ESC AF 2020: rapid AF in a normal heart causes symptoms and hypotension, not arrest)]<br>PL: arrest70 = false (expected false) [a healthy 70 y does not arrest from 20 min of AF 150] | **WR** | C3 · 7a coronary.ts (per-beat CPP in AF) |
| CM-16a | P2 | pacemaker-dependent (VVI 70 over CHB, profile rhythm), ventilated · paced → diathermy: oversensing (inhibition) for 20 s | hrBase 70; hrMin 25; mapMin 57.9; rhythms 1:pacedVVI; hrRecovered 70 | PL: hrMin = 25 in [0, 35] [research/12 CM-16: oversensing inhibits pacing → the underlying CHB escape 30–35 or asystole (Barash, CIEDs)]<br>PL: mapMin = 57.9 in [0, 60] [no output for the inhibition → pressure falls (direction; band proposed)] | **PL** | C12 · Stage 5 pacer faults / DV |
| CM-16b | P2 | pacemaker-dependent (VVI 70 over CHB), ventilated · paced → loss of capture (failureToCapture, faultRate 1) for 60 s | hrBase 70; hrMin 25; mapMin 57.9; rhythms 1:pacedVVI; arrestish false | PL: hrMin = 25 in [0, 35] [research/12 CM-16 / tables §1.5 pmDependent: loss of capture exposes the underlying escape 30–35 or asystole]<br>PL: mapMin = 57.9 in [0, 60] [direction; band proposed] | **PL** | C12 · Stage 5 pacer faults / DV |

### 2.9 Renal, diabetes, liver, smoker, anaemia (CM-08, 09, 10, 17, 18)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| CM-08a | P2 | CKD proxy (aki + blood K 5.5, Hb 10, HCO3 20) vs X-A, ventilated · pre-dialysis chronic renal failure → none (resting chemistry) | k 5.48; hb 10; hco3 19.4; ph 7.36; uop 33.1; uopA 60.4; gfr 75.3; gfrA 137.3; qrs 93 | PL: k = 5.48 in [5.2, 5.8] [tables §1.5 ckd: K 5.0 (4.5–6.0 pre-dialysis) — profile 5.5]<br>PL: hco3 = 19.4 in [18, 22] [tables §1.5 ckd: HCO3 20]<br>PL: ph = 7.36 in [7.28, 7.38] [CKD-BJAEd: compensated metabolic acidosis of renal failure] | **PL** | — · 7c blood profile / 7d aki proxy |
| CM-08b | P2 | CKD proxy vs X-A, ventilated · renal failure → rocuronium 0.6 mg/kg: time to T1 25 % | t25CKD 33.67; t25Healthy 30.67; ratio 1.1 | PL: ratio = 1.1 in [1.1, 1.6] [Miller 10e ch. 24 / Cooper 1993: rocuronium clearance −33–39 % in renal failure, clinical duration ×1.3–1.5 (research/12 CM-08)] | **PL** | — · 7g PK (renal clearance of rocuronium) |
| CM-08c | P2 | CKD proxy vs X-A, ventilated · renal failure → Ringer's lactate 1 L over 15 min | uopGainCKD 11.7; uopGainA 18; dCvpCKD 2; dCvpA 1.8; evlwiGainCKD 0 | TS: uopGainCKD = 11.7 above [-5, 10] [tables §1.5 ckd / CKD-BJAEd: the failed kidney cannot excrete a load — little diuresis (mL/h)]<br>PL: dCvpCKD = 2 (sign 1, tol 0.5) [tables §1.5 ckd: the retained load raises filling pressures (oedema threshold lower) — direction only] | **TS** | C11 · 7d renal / 7c fluid |
| CM-08d | P2 | CKD proxy (K 5.5) vs X-A, ventilated · renal failure, K 5.5 → succinylcholine 1.5 mg/kg | dK 0.52; kPeak 6; dKHealthy 0.52; qrsPeak 93; arrest false | PL: dK = 0.52 in [0.3, 0.9] [Thapa & Brull 2000 / Miller ch. 24: stable renal failure has the NORMAL +0.5 rise; the hazard is the starting K]<br>PL: kPeak = 6 in [5.8, 6.6] [tables §1.5 ckd: 5.5 + 0.5]<br>PL: arrest = false (expected false) [FU-4 rule: a compensated comorbid patient must not arrest on a standard intervention] | **PL** | — · 7c succinylcholine K |
| CM-08e | P2 | CKD 5 / dialysis · the `ckd` profile of tables §1.5 → profile: β ×1.3, renal drug clearance ×0.3, AV fistula CO +10 %, post-dialysis hypovolaemia | — | no `ckd` condition: the aki proxy lowers GFR but carries no LV stiffness, no fistula shunt, no post-dialysis volume state and no drug-clearance factor beyond 7g's GFR scaling (research/12 §5.11 missing profiles) | **NE** | C10 · FU-7 profile (ckd) |
| CM-09a | P2 | diabetes + cardiac autonomic neuropathy · awake baseline → resting HR 90–100, fixed; baroreflex G_v ×0.3 | — | no `dan` condition (tables §1.5: G_v ×0.3, sympathetic gains ×0.4, HR 90–100 fixed); the engine's `endo.diabetes` is metabolic only | **NE** | C10 · FU-7 profile (dan) |
| CM-09b | P2 | diabetes + cardiac autonomic neuropathy · GA → propofol induction: exaggerated hypotension with no HR response | — | no `dan` condition (Burgos 1989: diabetics with autonomic neuropathy need vasopressors after induction far more often) | **NE** | C10 · FU-7 profile (dan) |
| CM-09c | P2 | diabetes type 2 (engine API `endo.diabetes`; not in pme-scenario/1) vs 60 y, ventilated · GA, no insulin → surgical stress (stimulus 1.0) for 60 min | gluBaseDM 7.99; gluMaxDM 11.1; gluBaseA 5.55; gluMaxA 7.6; dGluDM 3.11; dGluA 2.05 | PL: gluMaxDM = 11.1 in [8, 12] [research/12 CM-09 / tables §1.5; JBDS 2023 perioperative diabetes: type 2 glucose 8–12 mmol/L under surgical stress]<br>PL: gluMaxA = 7.6 in [6.5, 8.5] [research/12 ET-17 / Desborough 2000: non-diabetic 5.5 → 7–8 mmol/L] | **PL** | — · 7e glucose (diabetes) |
| CM-09d | P2 | diabetes (gastroparesis) · RSI → aspiration risk at induction | — | aspiration exists only as an instructor-fired lung event; no gastric-content or delayed-emptying state makes it more likely | **NE** | C10 · FU-7 / SP run (aspiration as a risk state) |
| CM-10a | P2 | hepaticFailure 0.8 + albumin 25 (Child C proxy) vs 55 y, ventilated · end-stage liver disease → none (resting haemodynamics) | coPct 0; svrPct 0.1; map 95.7; mapA 95.7; liverFn 0.44; lact 1.06 | WR: coPct = 0 below [20, 60] [Miller 10e ch. on hepatic disease: cirrhosis has a hyperdynamic circulation (CO ↑, SVR ↓)]<br>WR: svrPct = 0.1 above [-50, -20] [Miller: splanchnic vasodilation (NO), low SVR in Child C]<br>HAND NE (automatic WR): no cirrhosis profile (research/12 blocker "missing profiles"): the hepaticFailure proxy acts on the liver only — CO and SVR are identical to the healthy 55 y (measured), so the hyperdynamic circulation cannot be expressed | **NE** | C10 · FU-7 profile (cirrhosis) / 7a |
| CM-10b | P2 | Child C proxy vs 55 y, ventilated · end-stage liver disease → propofol 2 mg/kg | mapPct -23.3; mapPctHealthy -23.3; extraFall 0; wakeMin 11; wakeMinHealthy 11 | WR: extraFall = 0 (expected sign -1) [Miller hepatic disease: low SVR and hypoalbuminaemia (higher free fraction) exaggerate induction hypotension (direction only)]<br>HAND NE (automatic WR): inherits CM-10a: the proxy has no low-SVR state, and 7g has no protein-binding (free-fraction) term for propofol at albumin 25 — the fall and the emergence time equal the healthy 55 y exactly (measured) | **NE** | C10 · FU-7 profile (cirrhosis) / 7g protein binding |
| CM-10c | P2 | Child C proxy (albumin 25 g/L) vs X-A · hypoalbuminaemia → plasma colloid osmotic pressure | cop 11.5; copA 22.4; alb 25 | TW: cop = 11.5 below [13, 18] [Landis–Pappenheimer (tables §5b.4): albumin 25 g/L → COP ≈ 15 mmHg (normal 25)] | **TW** | C11 · 7c COP |
| CM-10d | P2 | Child C proxy · coagulopathy of liver failure → INR / bleeding | inr 2.6 | PL: inr = 2.6 in [1.7, 3] [Child–Pugh C: INR > 2.3 (Pugh 1973)]<br>HAND NE (automatic PL): blocked by 7i (R60 v1.1): the liver INR is the placeholder 1 + 2·failure and nothing reads it (research/11 §4.9); no coagulation model | **NE** | C11 · 7i (v1.1) |
| CM-10e | P2 | Child C proxy vs 55 y, ventilated · tense ascites (IAP 15) and fasting → IAP 15 mmHg for 2 h; glucose course | uopIAP 46.9; uopNoIAP 46; uopHealthyIAP 46.2; gluEnd 4.91; gluEndHealthy 5.55; lactEnd 1.92 | TW: gluEnd = 4.91 above [2.5, 4.5] (lower = stronger/faster) [tables §5.3 / Miller hepatic: failing gluconeogenesis → fasting hypoglycaemia in Child C]<br>TW: uopIAP = 46.9 above [0, 30] (lower = stronger/faster) [WSACS 2013: IAP 15 in a low-SVR cirrhotic reduces renal perfusion → oliguria (< 0.5 mL/kg/h)] | **TW** | C11 · 7e glucose (liverFn) / 7d renal IAP |
| CM-17 | P3 | heavy smoker COHb 8 % vs X-A, awake, room air · carboxyhaemoglobinaemia → none (displayed SpO2 vs true oxygenation) | spo2Shown 96; cohb 8; fo2hb 89.1; overRead 6.9; cao2Ratio 0.92 | PL: overRead = 6.9 in [4, 10] [tables §1.5 smoker: displayed SpO2 over-reads by ≈ 1.06·COHb − 2.5 (≈ 6 at 8 %) (Barker & Tremper 1987)]<br>PL: cao2Ratio = 0.92 in [0.88, 0.95] [tables §1.5 smoker: CaO2 falls by ≈ the COHb fraction] | **PL** | — · 7c ODC / L3 pulse oximeter |
| CM-18a | P2 | chronic anaemia Hb 8 (profile blood.hb) vs X-A, ventilated · chronic anaemia → bleed 1 L over 10 min | coRestPct 0; do2Rest 580; do2RestA 1046.9; do2Min 422.5; do2MinA 767; do2Ratio 0.55; dLact 0.6; dLactA 0.6; svo2Min 56.4; svo2MinA 76.6 | PL: do2Ratio = 0.55 in [0.45, 0.75] [tables §1.5 anaemia: DO2 ↓ in proportion to Hb (8/15 = 0.53) with a small chronic CO rise]<br>PL: coRestPct = 0 in [0, 20] [tables §1.5 anaemia: resting CO rises only when Hb < ≈ 7 (Anaemia-OA); SVR ×0.85 chronic]<br>PL: svo2Min = 56.4 in [50, 68] [research/12 CM-18: the anaemic patient reaches a low SvO2 sooner on the same bleed (O2ER rises; direction band proposed)] | **PL** | — · 7c O2 transport |
| CM-18b | P2 | chronic anaemia Hb 8, ventilated, after a 1 L bleed · anaemia + haemorrhage → RBC 2 units over 20 min | hbBefore 7.9; hbAfter 9.4; dHb 1.7; do2GainPct 37.5 | PL: dHb = 1.7 in [1.4, 2.6] [AABB / ATLS: each RBC unit raises Hb ≈ 1 g/dL in an adult]<br>PL: do2GainPct = 37.5 (sign 1, tol 10) [research/12 CM-18: RBC restores DO2] | **PL** | — · 7c transfusion |

## 3. Ranked gaps and the smallest mechanism per gap

Gap ids **C1–C12** (research/12 §2.1 "gap"). Engine file paths are under `packages/engine-core/src/` on 0fd5397.
"New" = no stage owns it today.

### C1 — chronic disease does not change the induction fall: there is no tonic sympathetic tone to remove (new, P1)
- **Cells:** CM-01b (80 y −19.7 % vs −20.1 %), CM-03b (HTN −22.0 vs −22.9), CM-05a (AS + CAD + HTN −18.1 %, MAP 96 vs
  60–65), CM-05d (GTN in AS −8.2 vs −10 %), CM-06b (HFrEF −21.3 vs −23.3), CM-13a (PH −23.7 vs −23.3); MANUAL twins
  M1–M3 fall −13 to −17 % (reflex-free physiology alone). FU-4's own S14 (`it.fails`, −22.9 %) is the same gap.
- **Expected:** larger falls in the elderly and hypertensive (tables §1.5 HTN: 40 % vs 30 %; Reich 2005), a collapse
  to MAP 60–65 with ST depression in severe AS (tables §7 check 10), a bigger fall in PH through RV ischaemia.
- **Code:** `circ/baroreflex.ts:151–158` — every sympathetic effector is `1 + o·gain·error`: at rest the error is 0,
  so the output that propofol's `outF` (FU-4 G2, `pk/data/rows-anaesthetic.ts:36`) suppresses is only the reflex
  *response*, never a resting level. The profile conditions (`circ/profile.ts:131–205`) change gains, set points and
  intrinsic resistances, not the share of resting tone that is sympathetically maintained.
- **Smallest mechanism:** a profile-dependent tonic sympathetic share τ of resting SVR, venous tone and contractility
  — `svrF = (1 − τ) + o·(τ + G_R·s·e)` (and likewise for dV0, Ees) — with τ from MSNA data: ≈ 0.2 young adult, rising
  with age (Sundlöf & Wallin), higher in HTN and highest in HFrEF (Grassi 1998). The stabiliser tunes the intrinsic
  part so rest is unchanged; propofol, volatiles, neuraxial block and dexmedetomidine then remove more in the patients
  who depend on tone. No band moves; the four-patient table becomes state-dependent by mechanism.
- **Owner:** new. Natural homes: FU-7 Task 9 (7e's central sympathetic drive, which already carries a resting
  `extraSymp`) or a FU-4 follow-on. Tests moved: FU-4 S14 and the four-patient rows, DI-46/47/48/79, CM-01b/03b/05a/06b.

### C2 — ST depression never appears: the ST timer resets on every beat-to-beat dip (new, P1)
- **Cells:** CM-04a (IN: kIsch 0.80–0.86, ST 0 at HR 110 in 3-vessel CAD and recent MI, ventilated and awake on air),
  CM-04c, CM-05a, CM-05c, CM-05d (no ST in any arm of the run).
- **Code:** `circ/coronary.ts:180–181` — `ischT` accumulates only while the instantaneous δ > 0.1 and resets to 0 on
  any second below; δ is computed once a second from the LAST beat (`coronary.ts:150`, called from
  `hemo/pipeline.ts:390`) and swings 0–0.27 (mean 0.064; 28 % of seconds > 0.1; longest run 3 s). kIsch uses a
  low-pass of the flow deficit (`coronary.ts:159–162`, τ 20 s) and does respond — so the heart fails silently.
- **Smallest mechanism:** drive ST from the same filtered deficit that drives kIsch (or from 1 − kIsch), with the 45 s
  lag as a first-order delay instead of a resettable continuous timer. One truth for "is this myocardium ischaemic".
- **Owner:** new (7a coronary). Unblocks the CAD/AS teaching cells CM-04a/c, CM-05a/c/d and tables §7 check 10.

### C3 — rapid AF makes a healthy heart ischaemic and kills it: LVEDP sampled mid-relaxation (new, P1)
- **Cells:** CM-15c (healthy 40 y AF 150: kIsch → 0, SV 9.8 mL, MAP 44, agonal +15.5 min, asystole +18 min; 123 of 240
  samples with negative CoPP; "LVEDP" up to 115 mmHg; sinus at 150: kIsch 1.0), CM-15b (70 y AF 150 + esmolol
  0.5 mg/kg: agonal at +10 min; the control reaches kIsch 0.22–0.4), CM-05b (kIsch 0.50/0.70 at AF 100), CM-15a (0.9
  at AF 80).
- **Code:** the beat accumulator records `edp` as the LV transmural pressure at the moment the NEXT activation starts
  (`circ/model.ts:396` → `lvedp`, `model.ts:349`). On a short AF cycle the ventricle has not relaxed, so "LVEDP" is a
  systolic pressure; `coronary.ts:142` turns it into CoPP = aoDia − LVEDP < 0 and supply 0 for that second.
- **Smallest mechanism:** take LVEDP as the minimum LV diastolic pressure of the cycle (and treat a summation beat
  whose sampled pressure exceeds aortic diastolic as non-diastolic), and compute CoPP over the second's diastolic time,
  not from the last beat alone. A10-B3 (AF 150: 44 % non-ejecting beats, FU-4 r5) is the same beat-level defect seen
  from the monitor.
- **Owner:** new — an engine defect of FU-8's kind (with "VT 170 keeps a pulse" and "agonal rhythm ignores its rate"),
  and a precondition for every AF cell of FU-7 Task 11 and the DV run (§4).

### C4 — obesity is sized twice and counted twice (new, P1)
- **Cells:** CM-02a (IN; CO 10.6 L/min = ×1.85, BV 8.89 L = 70 mL/kg), CM-02b (IN; 2.7 → 1.43 min), CM-02d (TW; RM +
  PEEP 10 raises PaO2 +3 % — FU-6 R14's small atelectasis: P/F 533 at BMI 41).
- **Code:** `circ/profile.ts:94, 110` size every volume and compliance ×W/70 and BV = 70 mL/kg × total weight; 7c and
  Stage 3 use the adjusted weight (`gas/params.ts:152, 159` → 6.52 L; 7c `bvMl` 6.48 L). The lung `obesity`
  condition adds shunt (0.04 → 0.07) and Crs ×0.65 on top of the profile's Benumof-tuned FRC (`gas/params.ts:142–143`).
- **Smallest mechanism:** one body-size resolver for all stages (tables §1.3: Lemmens BV, CO ×1.35 from VO2 and BV,
  circulation scaled on lean/adjusted weight), and either the profile or the lung condition carries obesity's lung
  effects, not both (Ali, Q3).
- **Owner:** new (7a/7c/Stage 3 profile); FU-6 R14 keeps the atelectasis half.

### C5 — the profile's stabiliser targets and its set point disagree (new)
- **Cells:** CM-03a (HTN +13.4, tables +20), CM-06a (HFrEF MAP 86.6, LVEDP 14.1; tables 75 and 15–20), CM-01a (80 y
  MAP 110.6; tables 90–100).
- **Code:** `circ/profile.ts:151` raises the HTN set point +20 while `:156` raises the stabiliser targets only
  +15/+5 (MAP +8); `:139–140` set HFrEF's set point 75 and targets 105/65 (MAP 78); `:117` gives the elderly targets
  140/80 against a band set point of 95.
- **Smallest mechanism:** derive the targets from the set point (one number per profile), so rest is where the tables
  put it. Calibration, R44.

### C6 — the elderly lung has no closing capacity (new)
- **Cells:** CM-01a (PaO2 90 on air, tables ≈ 76), CM-01f (apnoea to 90 % in 9.1 min vs 7.9 in the young — longer,
  because VO2 is lower, `gas/params.ts:112`, and FRC under GA is the same 20 mL/kg).
- **Smallest mechanism:** closing capacity rising with age (≈ FRC supine at 44 y, tables §1.1) as airway closure in
  the dependent units, which adds shunt at rest and shortens safe apnoea. Owner: 7b (with FU-6's apnoea work).

### C7 — COPD GOLD 3 is a normocapnic patient (new)
- **Cells:** CM-07a (PaCO2 38.9, HCO3 24.3, PaO2 82 on air), CM-07c (O2 raises PaCO2 only +3.5), CM-07e (post-
  extubation PaCO2 46; expected > 50).
- **Code:** the lung `copd` condition sets mechanics, dead space and V/Q only; the chemoreflex set point is the fixed
  `PACO2_REST_MMHG` (`gas/params.ts:163`) and 7c has no chronic renal compensation input.
- **Smallest mechanism:** tables §1.5 COPD's `paco2Set` (40/40/45/55 by grade) feeding the drive, and the chronic HCO3
  it implies as the 7c baseline. Owner: FU-6 (drive) — see §5.

### C8 — pulmonary vascular pharmacology and PH severity (new, P1)
- **Cells:** CM-13a (PVR 5.9 WU; no RV ischaemia on induction), CM-13b (FU-6: hypercapnia inert), CM-13c
  (noradrenaline 0.33 vs phenylephrine 0.31 PAP/SAP), CM-13d (no iNO).
- **Code:** `circ/profile.ts:201–205` applies PVR ×3 whatever the grade (tables: 3/5/10 WU); the drug rows give
  phenylephrine `pvr` emax 0.15 and noradrenaline 0.2 (`pk/data/rows-cardiovascular.ts:34, 41`).
- **Smallest mechanism:** PH grades as in the tables; the vasopressor rows' pulmonary arms re-sourced (and a
  vasopressin row with its pulmonary vasodilator arm); iNO as a drug (FU-7 library). RV ischaemia follows once C1
  deepens the induction fall.

### C9 — HFrEF: weak afterload sensitivity, no flooding (new)
- **Cells:** CM-06e (hydralazine: SV +3.5 %, SVR −15.3 %), CM-06c (500 mL: LAP +2.6, EVLWI +0.01), CM-14b (MS at LAP
  25: EVLWI +0.85 but PaO2 −0.3 %).
- **Smallest mechanism:** check the hydralazine SVR size against Cohn 1977 before touching 7a; lung water must reach
  the gas exchanger (7b diffusion/shunt from EVLWI). Owners: 7a/7g (FU-7 Task 17 for the row), 7b.

### C10 — missing comorbidity profiles (new; 10 NE + 1 MI)
- `cirrhosis` (hyperdynamic circulation, free fraction), `ckd` (tables §1.5 row), `dan` (tables §1.5 row), `osa`
  (tables §1.5 row; DI-43), bronchial reactivity for asthma (tables §1.5), aspiration risk; posture (CM-02e).
- Owner: FU-7 or a "profiles" follow-up, each with its research/12 cells as acceptance.

### C11 — smaller gaps
- **COP too low at albumin 25** (CM-10c: 11.5 vs Landis–Pappenheimer ≈ 15) — 7c COP formula.
- **IAP 15 has no renal effect** (CM-10e: UO 46.9 vs 46.0 mL/h) because Bowman pressure is `max(P_BOWMAN, iap)`
  (`renal/model.ts:90, 128`) — RH-06 owns it.
- **Cirrhotic fasting glucose** 4.9 mmol/L after 2 h (tables §5.3: hypoglycaemia) — 7e/liverFn.
- **CKD fluid load** diuresis +11.7 mL/h (TS; the `aki` proxy excretes almost normally) — 7d.
- **Elderly bleed tachycardia** equals the young (ratio 0.96 vs gSymp ×0.6; CM-01e TS) — 7a baroreflex.
- **INR** is the placeholder 2.6 (CM-10d) — 7i.

### C12 — `setRhythm` silently accepts unknown `opts` keys (new, API)
- `pacedVVI` with `{ fault, faultRate }` at the top level of `opts` is accepted and ignored; the fault works only
  under `opts.pacer` (`ecg/pacing.ts:26–30`). A rejected command would have saved a false "no effect" (CM-16).
  Owner: the FU-8 defect list (validation of `RhythmOpts`).

## 4. Findings for FU-7 (READY, not executed) — → FU-7 before execution

1. **Task 17 (dobutamine refit) — measure first.** Its "Why" uses DI-12/32's pre-FU-4 CO +17.9 %. On main with FU-4,
   dobutamine 5 µg/kg/min in HFrEF gives **CO +34.9 %** (CM-06d, PL in 20–45). Apply the plan's own "Step 1 measures
   first" rule to dobutamine as it does to ephedrine, and keep CM-06d as a guard (band 20–45) so the refit cannot
   overshoot.
2. **Task 17 (hydralazine "unchanged").** The plan leaves hydralazine because DI-59 (onset/offset, healthy) is PL. In
   HFrEF hydralazine 10 mg lowers SVR −15.3 % and raises SV only +3.5 % (CM-06e). Add CM-06e as a Task 17 check; if
   the SVR size is right the gap is 7a's (C9), not the row's. Task 17's new nitroprusside row should carry the HFrEF
   arm (SV ↑, MAP ≈) as its acceptance cell.
3. **Task 17 (esmolol refit) moves CM-04d, CM-14c, CM-15b.** Esmolol 1 mg/kg now gives HR −12 (PL) in CAD and MS; the
   0.5 mg/kg AF cell is TW (−12.9 %) and, because of C3, ends in arrest. Re-measure the three after the refit.
4. **Task 10 (the surge) — add the hypertensive arm.** On the FU-4 tree laryngoscopy after propofol gives +9.1 mmHg
   healthy and +10.8 in untreated HTN (ratio 1.19; CM-03c). Prys-Roberts 1971 wants ≈ 2× in untreated hypertensives.
   Add CM-03c as a Task 10 acceptance arm (ratio ≥ 1.3) alongside the healthy +20–40.
5. **Tasks 11, 12 and 19 (AF rigs) — C3 first, or guard the rigs.** Every AF rig on this main loses contractility
   within 2 min (kIsch 0.3–0.5) and a healthy 40 y arrests at +15 min. Amiodarone/esmolol rate-control and conversion
   tests (DI-13b, DI-14a and Task 11's new AF cells) would be measured in a failing heart. Either land C3 before
   Task 11, or keep AF windows < 5 min and assert kIsch ≥ 0.9 in the control arm.
6. **Task 9 (central sympathetic drive) — the home for C1?** Task 9 moves ephedrine and ketamine into 7e's drive with
   a catecholamine reserve. A profile-dependent resting sympathetic tone (C1) is the same state. If the orchestrator
   gives C1 to FU-7, it belongs in Task 9, must keep ruling 1 (`h.surge` separate), and must pass the four-patient
   table (FU-4 S14) and CM-01b/03b/05a/06b.
7. **Task 8 (β-occupancy) edits `circ/profile.ts` under E-FU7-3.** C1, C4 and C5 fixes land in the same file. If any is
   added to FU-7, widen E-FU7-3 in the same task rather than opening a second exception.
8. **Task 18 (dexamethasone glucose) — add a diabetic arm.** Diabetes is expressible through the engine API
   (`endo.diabetes`) and the diabetic stress response is plausible (CM-09c: 11.1 mmol/L). ET-19's cell (type 2 +
   dexamethasone 8 mg → +2–4 mmol/L at 4–8 h, PADDI) can be Task 18's second arm.
9. **Task 16 (histamine → FU-6 smooth-muscle state).** That path is where a bronchial-reactivity gain for asthma
   (tables §1.5: bronchospasm on instrumentation 0.02/0.1/0.2) would multiply. CM-11a is MI today; name it in the task
   or record it as a follow-up.
10. **Task 6 (`ventRemiEq`)** is the input an `osa` profile's opioid ventilatory C50 ×0.6 would scale (CM-12a,
   DI-43). No change now; noted for the profile follow-up.

## 5. Findings for other in-flight stages

- **FU-6** (READY, after V.1):
  - R14 owns CM-02d: obese P/F 533 under GA with PEEP 5, so RM + PEEP 10 has nothing to recruit (+3 %).
  - R2 owns CM-11b: sevoflurane 0.82 MAC changes Ppeak by 0 in asthma + bronchospasm.
  - The hypercapnic PVR term owns CM-13b (PaCO2 58: mPAP −0.3).
  - The drive owns CM-07c/07e and should take C7's COPD `paco2Set`.
  - R4 (no hidden switch) must re-tune the obese apnoea on ONE definition of the obese patient (C4, Q3). With the
    profile alone the time is 2.7 min today; with lung `obesity` it is 1.43.
- **V.1:** no CM cell depends on it. Keep CM-07b (COPD auto-PEEP 7.8 at RR 20, Ppeak 36.8) and CM-02c (obese Pplat
  17.2 vs 27.1) as link-parity regression cells.
- **7k (respiratory mechanics):** this run had to compute Pplat with 7b's internal `holdPressure` on a state copy.
  Publishing Pplat, total PEEP and auto-PEEP in truth makes CM-02c, 07b and 07d black-box cells.
- **Stage 9:** the scenario schema still has no `endo` block (research/11 §4.4), so CM-09c's diabetic patient cannot be
  authored; posture (reverse Trendelenburg) has no input. The glossary needs labels for the coronary readouts this run
  used (ST, kIsch → "ischaemic contractility", supply/demand).
- **FU-8 follow-ups:** candidates are C3 (AF lethal artefact, P1), C2 (ST timer), C12 (`RhythmOpts` validation), and
  CM-15c/CM-04a as their acceptance cells.
- **FU-4 follow-on:** S14's `it.fails` is C1; FU-4's gate note lists A08-J2/J3/K-as/K-hf as TW; CM-01b/03b/05a
  confirm it.

## 6. Cells blocked by missing features

| blocker | cells | expected response kept for the owner |
|---|---|---|
| 7i labs/coagulation (v1.1, R60) | CM-10d | Child C INR > 2.3, bleeding; today the placeholder 2.6 that nothing reads |
| 7j obstetric (v1.1) | — | CM has no obstetric cell (X-P is OB's) |
| posture (FU-7 "surgical events and posture") | CM-02e | reverse Trendelenburg raises FRC/PaO2 in the obese; head-up 30° today moves cerebral hydrostatics only (FRC 598 → 598) |
| missing profiles | CM-08e (`ckd`), CM-09a/b (`dan`), CM-09d (aspiration risk), CM-10a/b (cirrhosis), CM-12a/b (`osa`) | tables §1.5 rows; CM-10a/b measured on the proxy: CO, SVR and the propofol fall identical to health |
| missing mechanism | CM-11a (bronchial reactivity, MI) | bronchospasm at instrumentation with probability 0.1–0.2 in poorly controlled asthma |
| missing drug | CM-13d (iNO) | PVR −20–40 %, mPAP −5–10 without systemic hypotension |

Unblocked since research/12: CM-16 (pacemaker-dependent as the profile rhythm `pacedVVI` with `opts.pacer`), CM-09c
(diabetes through the engine API; the scenario schema still cannot carry it).

## 7. Proposed scripted suite (the owners' acceptance cells)

| owner | cells to re-measure at its gate | acceptance items |
|---|---|---|
| **C1 owner** (FU-7 Task 9 or FU-4 follow-on) | CM-01b, 03b, 05a, 05d, 06b, 13a, M1–M3 + FU-4 S14 | elderly −25…−45 %, HTN −30…−50 %, AS MAP 55–70 with ST, each falling further than its healthy twin |
| **7a coronary** (C2, C3) | CM-04a, 04c, 05a, 05c, 05d, 05b, 15a, 15b, 15c | ST ≤ −0.1 mV in 3-vessel CAD at HR 110; AF 150 in a normal heart: kIsch ≥ 0.9, no arrest in 20 min |
| **profile/body size** (C4, C5, C6) | CM-01a, 01f, 02a, 02b, 03a, 06a | one BV per patient; obese CO ×1.2–1.5; HTN +15…25; HFrEF MAP 70–85, LVEDP 15–22 |
| **FU-6** | CM-02d, 07a, 07c, 07e, 11b, 13b | RM + PEEP PaO2 +15 %; COPD PaCO2 43–52; sevo Ppeak −10…−35 %; hypercapnic mPAP ↑ |
| **FU-7** | CM-03c, 06d, 06e, 04d, 14c, 15b, 13c, 11a, 13d | §4 items |
| **profiles follow-up** | CM-08e, 09a, 09b, 09d, 10a, 10b, 12a, 12b | tables §1.5 rows |
| **7c/7d/7e** | CM-10c, 10e, 08c, 01e | COP 13–18; oliguria at IAP 15 in cirrhosis; CKD diuresis < 10 mL/h |

Each owner runs `./run.sh cli.ts <ids>` against its branch's worktree (PME_ENGINE) and pastes `report.ts` rows next
to this run's column in its gate note (research/12 §7).

## 8. Questions for Ali (with the model's numbers)

1. **Induction in chronic disease (C1).** Propofol lowers MAP −20 % in every profile (80 y −19.7 %, untreated HTN
   −22 %, AS + CAD + HTN −18 %, HFrEF −21 %, healthy −20 to −23 %). Do you teach a larger fall in the elderly and
   hypertensive (tables 40 % vs 30 %; Reich 2005)? If yes, is "more resting sympathetic tone to lose" the mechanism
   you want (MSNA rising with age, HTN and HF)?
2. **Severe AS target (tables §7 check 10).** Propofol 1.5 mg/kg in the compensated 75 y AS + CAD + HTN: MAP 117 → 96,
   no ST. The table says 103 → 60–65 with ST depression. Is 60–65 the target for a compensated patient, or the
   decompensated one?
3. **Who is "the obese patient"?** 127 kg / 175 cm alone desaturates in 2.7 min (Benumof); adding the lung `obesity`
   condition, as research/12 X-O does, gives 1.43 min. One of them should go. And should the circulation follow
   Lemmens (BV 51 mL/kg, CO ×1.35) instead of total weight (70 mL/kg, ×1.85)?
4. **COPD GOLD 3 on air.** The model gives PaCO2 39, HCO3 24, PaO2 82. The tables put GOLD 3 at PaCO2 45 (a retainer).
   Should every GOLD 3 retain CO2, or a "retainer" flag?
5. **Elderly apnoea (direction only, no source).** After preoxygenation the 80 y reaches SaO2 90 % at 9.1 min vs 7.9 min
   at 40 y (lower VO2 wins). Is "the elderly desaturate sooner" your teaching? If yes, closing capacity is the
   mechanism (C6).
6. **CAD at HR 110.** In 3-vessel CAD the model loses 14–20 % contractility with no ST change. Should a paced HR 110
   show ≥ 1 mm ST depression within 1–2 min?
7. **Vasopressors in PH (direction only).** Noradrenaline and phenylephrine give the same PAP/SAP ratio (0.33/0.31).
   Which do you teach as preferred (Kwak 2002 favours noradrenaline [VERIFY]; vasopressin is often taught)?
8. **Rapid AF in a normal heart (CM-15c).** Expected: hypotension (MAP −10–25 %) and no ischaemic failure. The model
   arrests a healthy 40 y at +15 min. Confirm the quiet cell.
9. **Cirrhosis and IAP.** Should the cirrhosis profile carry the hyperdynamic circulation (CO +20–60 %, SVR −20–50 %)
   for your liver-transplant teaching? And should IAP 15 already cause oliguria (model: none below 15)?
10. **Hydralazine in HFrEF.** 10 mg IV lowers SVR −15 % and raises SV +3.5 %. Is Cohn's SV rise (≥ +10–30 % with an
    arteriolar dilator) your expected size for the teaching patient?

## 9. Files and how to re-run

All files are in `research/19-audit-scripts/`. Nothing in the repo was changed; the worktree was removed.
- `runner.ts`: the DI arm runner plus the CM readouts and the one-breath Ppeak/Pplat probe (7b `holdPressure` on a
  state copy).
- `spec.ts`: cell type, CM contexts, rigs and helpers (`APNOEA`, `minToSat`, `base`).
- `cells-a.ts` (elderly, obese, HTN), `cells-b.ts` (CAD, AS, HFrEF), `cells-c.ts` (COPD, PH, MS, AF),
  `cells-d.ts` (CKD, diabetes, liver, asthma, OSA, pacing, smoker, anaemia, CM-15c), `cells-m.ts` (MANUAL twins).
- `grade.ts`, `regrade.ts`, `cli.ts` (store `out/cells.json`, `CM_OUT` for a partial store), `merge.ts`,
  `report.ts` (→ `out/matrix.md`, the §2 tables), `ledger.ts` (→ `out/ledger.md`, research/12 §4.5), `hooks.mjs`,
  `run.sh` (sets `PME_ENGINE`).

```
git -C <repo> worktree add --detach <wt> <commit> && (cd <wt> && npx -y pnpm@9.15.9 install --frozen-lockfile)
cd research/19-audit-scripts
PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts all      # ≈ 18 min
node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
```
