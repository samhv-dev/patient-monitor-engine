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
