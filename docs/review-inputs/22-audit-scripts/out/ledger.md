| cell | tier | intervention (short) | verdict | owner |
|---|---|---|---|---|
| BF-01a | P1 | 0.9 % saline 2 L over 60 min (read at the end of the infusion) | **TW** | 7c solutes.ts / 7d renal (F1) |
| BF-01b | P1 | Plasma-Lyte 148 2 L over 60 min vs saline | **TS** | 7c solutes.ts / 7d renal (F1) |
| BF-02a | P1 | Ringer's lactate 1 L over 30 min: intravascular retention 30 min after the end | **WR** | 7d renal/model.ts volumeFactor (F1) |
| BF-02b | P1 | Ringer's lactate 1 L over 30 min: retention 30 min after the end | **WR** | 7d renal/model.ts volumeFactor (F1) |
| BF-03a | P1 | albumin 5 % 500 mL over 15 min: volume effect (Δ blood volume ÷ 500 mL) | **PL** | 7c fluids.ts |
| BF-03b | P1 | gelatin 4 % 500 mL over 15 min: volume effect (Δ blood volume ÷ 500 mL) | **PL** | 7c fluids.ts |
| BF-04 | P1 | 1 u RBC (280 mL, Hct 0.6) over 30 min, 14 d, warmed; Hb at +1 h and +4 h | **TW** | 7d renal/model.ts volumeFactor (F1) |
| BF-05a | P1 | 10 u RBC 35 d + 10 u FFP over 40 min (1 u / 2 min), no calcium: ionised Ca | **TS** | 7c solutes.ts (citrate) |
| BF-05b | P1 | 10 u RBC 35 d stored, 1 u / 4 min: plasma K | **PL** | 7c params.ts storedK |
| BF-05c | P1 | 10 u RBC unwarmed (4 °C) vs warmed: core temperature | **PL** | 7e thermal/environment.ts ivInflow |
| BF-05d | P1 | the shock itself and its transfusion: base excess, lactate, pH | **TW** | 7c solutes.ts sidOf (citrate) / params.ts PRODUCTS |
| BF-05e | P1 | ≈ 1 blood volume replaced: dilutional coagulopathy (INR, fibrinogen, platelets) | **NE** | 7i |
| BF-06a | P1 | calcium chloride 1 g IV: ionised Ca | **PL** | 7c pipeline.ts observeDoses |
| BF-06b | P1 | calcium chloride 1 g IV: MAP (state-dependence) | **PL** | 7c circ-adapter.ts chemistryContractility |
| BF-07a | P1 | none — the state itself (peaked T only) | **WR** (FU-4 pending) | FU-4 G3 (+ 7c pipeline.ts bloodEcgTargets, F2) |
| BF-07b | P1 | none — the state itself (P flattening, QRS widening) | **WR** (FU-4 pending) | FU-4 G3 (+ 7c pipeline.ts bloodEcgTargets, F2) |
| BF-07c | P1 | none — the state itself (sine wave → VF/asystole) | **WR** (FU-4 pending) | FU-4 G3 (+ 7c pipeline.ts bloodEcgTargets, F2) |
| BF-08a | P1 | calcium chloride 1 g: ECG reversal without lowering K | **WR** (FU-4 pending) | 7c pipeline.ts bloodEcgTargets (F2) / FU-4 G3 |
| BF-08b | P1 | insulin 10 U + dextrose 25 g: K at 30 and 60 min | **PL** | 7c treatments.ts |
| BF-08c | P1 | salbutamol 10 mg nebulised: K at 30 and 60 min; HR | **PL** | 7g salbutamol kShift / 7c |
| BF-08d | P1 | sodium bicarbonate 50 mmol (K at 60 min); furosemide 40 mg (K at 3 h) | **TW** | 7d organs/pipeline.ts renalSeam (F6) |
| BF-09a | P2 | the state: ECG (U waves, T flattening) and ectopy | **WR** | 7c pipeline.ts bloodEcgTargets (F2) |
| BF-09b | P2 | rocuronium 0.6 mg/kg: clinical duration (T1 25 %) vs normokalaemia | **MI** | 7f neuro/interactions.ts (F10) |
| BF-10a | P2 | magnesium sulfate 2 g over 2 min: termination | **PL** | 7g hooks.ts |
| BF-10b | P2 | magnesium sulfate 2 g: plasma Mg at 15 min | **PL** | 7c pipeline.ts observeDoses |
| BF-11a | P2 | the state: plasma Na and osmolality | **PL** | 7c fluids.ts / solutes.ts |
| BF-11b | P2 | the same: CNS signs (brain water, ICP, consciousness) | **MI** | 7d brain/model.ts (reads osmotherapy only) |
| BF-12 | P2 | 7.5 % saline 250 mL (7g hypertonicSaline, runs over 15 min): Na 30 min after the end | **PL** | 7c pipeline.ts observeDoses |
| BF-13a | P1 | sodium bicarbonate 1 mmol/kg: PaCO2 and EtCO2 | **PL** | 7c treatments.ts bicarbCo2MlMin |
| BF-13b | P1 | sodium bicarbonate 1 mmol/kg: ionised Ca | **PL** | 7c solutes.ts ionisedCa |
| BF-13c | P1 | sodium bicarbonate 1 mmol/kg: pH (peak and 30 min) | **PL** | 7c |
| BF-14 | P2 | 0.9 % saline 5 L over 2 h (≈ 36 mL/kg/h): BE and Cl at the end | **TW** | 7d renal/model.ts volumeFactor (F1) |
| BF-15a | P2 | the state: an alkali-gaining (H+ and Cl loss) event | **NE** | FU-7 (7c event) |
| BF-15b | P2 | baseline: compensatory hypoventilation | **WR** | 7f neuro/spont.ts (F9) |
| BF-16a | P1 | VCV RR 12 → 6 for 30 min: ΔHCO3 per 10 mmHg ΔPaCO2 | **PL** | 7c acid-base.ts |
| BF-16b | P1 | baseline: HCO3 against PaCO2 (renal compensation) | **TW** | 7b copd profile → 7c HCO3 (F7) |
| BF-17a | P1 | VCV 18 × 600 for 30 min (PaCO2 ≈ 25): ionised Ca per +0.1 pH | **PL** | 7c solutes.ts ionisedCa |
| BF-17b | P1 | VCV 18 × 600 for 30 min: plasma K per +0.1 pH | **PL** | 7c core.ts kSet (phNonOrg) |
| BF-17c | P1 | VCV 18 × 600 for 30 min: cerebral blood flow | **PL** | 7d brain |
| BF-18a | P2 | exchange 3.7 L blood for albumin 5 % over 60 min: heart rate | **WR** (audit 09 R11 pending) | 7a / 7c (anaemia → CO) |
| BF-18b | P2 | the same exchange: cardiac output, DO2, SvO2 | **TW** (audit 09 R11 pending) | 7a / 7c (anaemia → CO) |
| BF-19 | P2 | exchange 1.5 L blood for albumin 5 % over 30 min (Hb 15 → ≈ 11): DO2 kept by CO | **WR** (audit 09 R11 pending) | 7a / 7c (anaemia → CO) |
| BF-20a | P2 | 0.9 % saline 30 mL/kg over 30 min: lung water and PaO2 (vs the same load healthy) | **WR** | 7e adapters.ts writeBlood → 7c lungWaterStep (F4) |
| BF-20b | P2 | 30 mL/kg saline: MAP gain at the end and 60 min later (transient) | **TS** | 7d renal volumeFactor (F1) / 7c fluids.ts leak (F4) |
| BF-21a | P2 | 0.9 % saline 1.5 L over 30 min: PAWP | **PL** | 7a circ / 7c |
| BF-21b | P2 | 1.5 L saline: extravascular lung water (7c extra EVLWI above the 7b baseline ≈ 7 mL/kg) | **PL** | 7c circ-adapter.ts lungWaterStep |
| BF-21c | P2 | 1.5 L saline: SpO2 | **TW** | 7b lung water → gas exchange |
| BF-22a | P2 | baseline: plasma COP and the lung-oedema threshold (COP − 2) | **TS** | 7c fluids.ts copPlasma (F8) |
| BF-22b | P2 | baseline: anion gap and base excess (Figge) | **IN** | 7c core.ts createBloodCore (calibrateXa) (F8) |
| BF-22c | P2 | propofol 2 mg/kg: free (unbound) drug fraction and effect | **MI** | 7g (no protein binding) |
| BF-23 | P3 | methylene blue 2 mg/kg | **NE** | FU-7 (drug) / 7c odc.ts |
| BF-24 | P1 | tranexamic acid 1 g: fibrinolysis (LY30) | **NE** | 7i |
| BF-25a | P1 | INR/PT and aPTT | **NE** | 7i |
| BF-25b | P1 | fibrinogen < 1.5 g/L | **NE** | 7i |
| BF-25c | P1 | platelets < 100 | **NE** | 7i |
| BF-25d | P1 | ROTEM CT / A10 (EXTEM, FIBTEM) | **NE** | 7i |
| BF-25e | P1 | hypothermia 33 °C + pH 7.1 worsening clotting | **NE** | 7i |
| BF-26a | P1 | fibrinogen concentrate 4 g: targeted correction by FIBTEM/EXTEM | **NE** | 7i |
| BF-26b | P1 | cryoprecipitate 10 u: targeted correction by FIBTEM/EXTEM | **NE** | 7i |
| BF-26c | P1 | PCC 25 IU/kg: targeted correction by FIBTEM/EXTEM | **NE** | 7i |
| BF-26d | P1 | platelets 1 pool targeted by EXTEM A10: targeted correction by FIBTEM/EXTEM | **NE** | 7i |
| BF-27a | P2 | ACT > 480 s after heparin 300 u/kg | **NE** | 7i |
| BF-27b | P2 | protamine: systemic hypotension | **NE** | 7i |
| BF-27c | P2 | protamine: pulmonary hypertension (type III reaction) | **NE** | 7i |
| BF-28a | P2 | platelets ↓, fibrinogen ↓ | **NE** | 7i |
| BF-28b | P2 | D-dimer ↑, microvascular bleeding | **NE** | 7i |
| BF-29a | P1 | ABG + VBG drawn together: venous–arterial PCO2 gap (vs the same draw at normal CO) | **PL** | 7c labs.ts |
| BF-29b | P1 | VBG: venous O2 saturation | **WR** | 7c oxygen.ts o2Delivery (F3) |
| BF-30 | P1 | ABG drawn at 420 s (default turnaround): the result shows the draw-time values | **PL** | 7c labs.ts |
| BF-31 | P2 | ABG reported α-stat (37 °C) vs temperature-corrected (pH-stat) | **NE** | 7i |
| BF-32a | P2 | pulse oximetry vs co-oximetry; O2 content | **PL** | 7c odc.ts / FU-5 pulse oximetry |
| BF-32b | P2 | normobaric O2 for 60 min: COHb elimination | **MI** (audit 09 R11 pending) | 7c odc.ts / 3 gas (no CO kinetics) |
| BF-M1 | P1 | Ringer's lactate 1 L over 30 min (MODELED twin BF-02b) | **PL** | Q9 (MANUAL physiology) |
| BF-M2 | P1 | the state (MODELED twin BF-07c): ECG and arrest | **PL** (FU-4 pending) | Q9 / FU-4 G3 |
