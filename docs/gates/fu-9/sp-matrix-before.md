<!-- cells 5 {"MI":3,"NE":1,"WR":1} -->

### 2.1 Laryngoscopy and intubation, and its blunting (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-01a | | (not in store) | | | | |
| SP-01b | | (not in store) | | | | |
| SP-01c | | (not in store) | | | | |
| SP-01d | | (not in store) | | | | |
| SP-01e | | (not in store) | | | | |
| SP-01f | | (not in store) | | | | |
| SP-27 | | (not in store) | | | | |
| SP-31 | | (not in store) | | | | |
| SP-04 | | (not in store) | | | | |
| SP-05 | | (not in store) | | | | |

### 2.2 Incision, sternotomy, closure and MAC (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-02a | | (not in store) | | | | |
| SP-02b | | (not in store) | | | | |
| SP-03 | | (not in store) | | | | |
| SP-26 | | (not in store) | | | | |

### 2.3 Vagal reflexes and mesenteric traction (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-06a | | (not in store) | | | | |
| SP-06b | | (not in store) | | | | |
| SP-07 | | (not in store) | | | | |
| SP-09 | | (not in store) | | | | |
| SP-21 | | (not in store) | | | | |

### 2.4 Pneumoperitoneum, CO2 embolism, emphysema (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-08a | P1 | X-A ventilated, GA (propofol + rocuronium, sevoflurane 2.1 %) · supine → pneumoperitoneum IAP 14 mmHg (`renal iapMmHg 14`, the only IAP input) at 20 min: cardiac output at +15 min vs no IAP | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.3; uop20 22.2; uopC20 22.1; dUopPct 0.6; dHbf 0; dPao2 0 | WR: dCoPct = 0 above [-30, -10] [Barash 9e, anaesthesia for laparoscopic surgery; research/12 SP-08 (IAP 12–15 → SVR ↑, CO −10–30 %); Joris JL et al., Anesth Analg 1993;76:1067–71 (laparoscopic cholecystectomy, IAP 14: SVR +65 %, MAP +35 %, CI −20 % within 5 min, partial recovery by 10–15 min)]<br>HAND MI (automatic WR): IAP reaches only the kidney (renal/model.ts:64, 90, 128; RH H5): the circulation does not read `organs.iap` — no IVC compression/venous-return change, no afterload term. CO, SVR and MAP equal the control. | **MI** | S4 · new: 7a (IAP → venous return / abdominal venous compliance, SVR) — RH H5 |
| SP-08b | P1 | X-A ventilated, GA · supine → IAP 14: SVR and MAP at +15 min | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.3; uop20 22.2; uopC20 22.1; dUopPct 0.6; dHbf 0; dPao2 0 | WR: dSvrPct = 0 below [20, 70] [Joris JL et al., Anesth Analg 1993;76:1067–71 (laparoscopic cholecystectomy, IAP 14: SVR +65 %, MAP +35 %, CI −20 % within 5 min, partial recovery by 10–15 min); Barash 9e, anaesthesia for laparoscopic surgery; research/12 SP-08 (IAP 12–15 → SVR ↑, CO −10–30 %)]<br>WR: dMapPct = 0 below [10, 35] [Joris JL et al., Anesth Analg 1993;76:1067–71 (laparoscopic cholecystectomy, IAP 14: SVR +65 %, MAP +35 %, CI −20 % within 5 min, partial recovery by 10–15 min)]<br>HAND MI (automatic WR): as SP-08a: no IAP → circulation seam (RH H5). | **MI** | S4 · new: 7a (IAP → SVR: aortic/splanchnic compression, vasopressin/renin release) — RH H5 |
| SP-08c | P1 | X-A ventilated VCV 12 × 600, GA · supine → IAP 14: respiratory-system compliance and peak airway pressure | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.3; uop20 22.2; uopC20 22.1; dUopPct 0.6; dHbf 0; dPao2 0 | WR: dCrsPct = 0 above [-50, -30] [research/12 SP-08 (Crs −30–50 %, Ppeak ↑); Obeid F et al., Arch Surg 1995;130:544–7; Rauh R et al., Clin Physiol 2001;21:533–9 [VERIFY]]<br>WR: dPpeak = 0 (expected sign 1) [research/12 SP-08; Barash 9e (Ppeak rises with the pneumoperitoneum)]<br>HAND MI (automatic WR): IAP does not reach 7b: chest-wall elastance, FRC and Crs are unchanged (Crs 55 → 55). The instructor can only add `lungCondition chestWall` by hand, which the IAP event does not do. | **MI** | S4 · new: 7b (IAP → chest-wall elastance, cephalad diaphragm, FRC ↓) — RH-06c |
| SP-08d | P1 | X-A ventilated at a fixed minute ventilation, GA · CO2 pneumoperitoneum → EtCO2/PaCO2 rise from CO2 absorption over 15–30 min | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.3; uop20 22.2; uopC20 22.1; dUopPct 0.6; dHbf 0; dPao2 0 | no CO2-insufflation input: the IAP event is a pressure only (organs.iap); there is no exogenous CO2 load (VCO2 +20–30 %, EtCO2 +5–10 at fixed MV) — research/12 marks it NE | **NE** | S5 · new: surgical event "CO2 pneumoperitoneum" → Stage 3 exogenous VCO2 |
| SP-08e | P1 | X-A ventilated, GA · supine → IAP 14: urine output over +15–25 min vs no IAP | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.3; uop20 22.2; uopC20 22.1; dUopPct 0.6; dHbf 0; dPao2 0 | WR: dUopPct = 0.6 above [-100, -30] [research/12 SP-08 (UO ↓); WSACS 2013 (IAH ≥ 12 mmHg: oliguria); Chiu AW et al., J Endourol 1995 [VERIFY] (pneumoperitoneum 15 mmHg: UO −60 %)] | **WR** | S4 · 7d renal/model.ts (IAP → renal vein and Bowman pressure, RH H4) |
| SP-10a | | (not in store) | | | | |
| SP-10b | | (not in store) | | | | |

### 2.5 Positioning (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-11a | | (not in store) | | | | |
| SP-11b | | (not in store) | | | | |
| SP-11c | | (not in store) | | | | |
| SP-11d | | (not in store) | | | | |
| SP-12a | | (not in store) | | | | |
| SP-12b | | (not in store) | | | | |
| SP-12c | | (not in store) | | | | |
| SP-22 | | (not in store) | | | | |
| SP-13a | | (not in store) | | | | |
| SP-13b | | (not in store) | | | | |
| SP-13c | | (not in store) | | | | |
| SP-14a | | (not in store) | | | | |
| SP-14b | | (not in store) | | | | |
| SP-14c | | (not in store) | | | | |
| SP-15a | | (not in store) | | | | |
| SP-15b | | (not in store) | | | | |

### 2.6 Surgical bleeding (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-19a | | (not in store) | | | | |
| SP-19b | | (not in store) | | | | |

### 2.7 Tourniquet, cross-clamp, cement, VAE, thoracic, CPB, diathermy (P2/P3)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-16a | | (not in store) | | | | |
| SP-16b | | (not in store) | | | | |
| SP-16c | | (not in store) | | | | |
| SP-16d | | (not in store) | | | | |
| SP-17a | | (not in store) | | | | |
| SP-17b | | (not in store) | | | | |
| SP-17c | | (not in store) | | | | |
| SP-17d | | (not in store) | | | | |
| SP-18a | | (not in store) | | | | |
| SP-18b | | (not in store) | | | | |
| SP-20a | | (not in store) | | | | |
| SP-20b | | (not in store) | | | | |
| SP-20c | | (not in store) | | | | |
| SP-23a | | (not in store) | | | | |
| SP-23b | | (not in store) | | | | |
| SP-24 | | (not in store) | | | | |
| SP-25a | | (not in store) | | | | |
| SP-25b | | (not in store) | | | | |

### 2.8 MANUAL twins (direction-only; Q9 open)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-M1 | | (not in store) | | | | |
| SP-M2 | | (not in store) | | | | |
| SP-M3 | | (not in store) | | | | |
