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
| BF-13a | P1 | sodium bicarbonate 1 mmol/kg: PaCO2 and EtCO2 | **PL** | 7c treatments.ts bicarbCo2MlMin |
| BF-13b | P1 | sodium bicarbonate 1 mmol/kg: ionised Ca | **PL** | 7c solutes.ts ionisedCa |
| BF-13c | P1 | sodium bicarbonate 1 mmol/kg: pH (peak and 30 min) | **PL** | 7c |
| BF-16a | P1 | VCV RR 12 → 6 for 30 min: ΔHCO3 per 10 mmHg ΔPaCO2 | **PL** | 7c acid-base.ts |
| BF-16b | P1 | baseline: HCO3 against PaCO2 (renal compensation) | **TW** | 7b copd profile → 7c HCO3 (F7) |
| BF-17a | P1 | VCV 18 × 600 for 30 min (PaCO2 ≈ 25): ionised Ca per +0.1 pH | **PL** | 7c solutes.ts ionisedCa |
| BF-17b | P1 | VCV 18 × 600 for 30 min: plasma K per +0.1 pH | **PL** | 7c core.ts kSet (phNonOrg) |
| BF-17c | P1 | VCV 18 × 600 for 30 min: cerebral blood flow | **PL** | 7d brain |
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
| BF-29a | P1 | ABG + VBG drawn together: venous–arterial PCO2 gap (vs the same draw at normal CO) | **PL** | 7c labs.ts |
| BF-29b | P1 | VBG: venous O2 saturation | **WR** | 7c oxygen.ts o2Delivery (F3) |
| BF-30 | P1 | ABG drawn at 420 s (default turnaround): the result shows the draw-time values | **PL** | 7c labs.ts |
