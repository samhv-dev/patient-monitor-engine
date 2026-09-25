# Pulse parameter annex: "Pulse value" column for the Stage 7 tables (R34)

*Draft 1, 2026-09-25. Companion to `stage-7-parameter-tables.md` (draft 1). Implements R34's "the tables document gains a
'Pulse value' column where Pulse has a number", the per-system porting briefs for 7c–7e, and the oracle-harness sketch.
Read with R32, R33, R34 (`research/00-orchestrator-rulings.md`) and the spike report (`research/07-pulse-feasibility-spike.md`).*

**Pulse version compared.** Source code: Pulse **4.3.2**, branch `stable`, commit `e8a36497b8ba78e788dc201a6baf74e1c297c56f`
(tag `REL_4_3_2`, 2025-08-12). Where the unreleased `integration` branch (`abd6aafda9e37a5e41c09d22812b288f4a8b0163`,
2026-09-15) differs on a point used here, it is said so. Methodology pages: pulse.kitware.com documents **4.3.0** (page
footer "Generated 2026-02-01 – 10710baa2"); where the page and the 4.3.2 code disagree, **the code wins** and the row says so.

**How to read a row.** `our symbol · our default · Pulse value · Pulse source · agreement · note`.
- **Agreement:** `same` = inside our range, or within ±15 % of our default. `differs ×f` = outside that; f = Pulse ÷ ours
  (for thresholds and offsets, the difference is given instead). `n/c` = not comparable: Pulse models the same thing with a
  different construct or parameterisation, so a number-to-number comparison would mislead.
- **Pulse value tags:** [code] read from source or generated data · [doc] read from the methodology page · [M] measured
  in the spike (StandardMale, 4.3.2) · [E] derived here by arithmetic from [code]/[doc] values, stated in the note.
- **Source keys** (paths are relative to the Pulse repo root, line numbers are `stable` e8a3649):

| Key | Path / URL |
|---|---|
| `CFG` | `src/cpp/engine/PulseConfiguration.cpp` (configuration defaults, lines 474–626) |
| `SET` | `src/cpp/engine/common/controller/SetupCircuitsAndCompartments.cpp` |
| `SUBM` | `src/cpp/engine/common/controller/SubstanceManager.cpp` (initial concentrations) |
| `PH/<X>` | `src/cpp/engine/common/system/physiology/<X>.cpp` (e.g. `PH/Renal` = `RenalModel.cpp`) |
| `SAT` | `src/cpp/engine/common/system/physiology/Saturation.cpp` |
| `sub:<X>` | generated `substances/<X>.json` (from `data/Data.xlsx`, sheet Substances) |
| `pat` | generated `patients/StandardMale.json` (44 y, 77.1 kg, 180 cm, HR 72, 114/73.5) |
| `M:<sys>` | `https://pulse.kitware.com/_<sys>_methodology.html` (bc = blood_chemistry, cv = cardiovascular, resp = respiratory, renal, tissue, energy, endocrine, nervous, drugs, patient) |
| `SPK` | `research/07-pulse-feasibility-spike.md` §3.5 (measured, StandardMale) |

**Scope limits of Pulse that apply to whole sections.** Pulse is adult-only (the paediatric rows of the Tissue sheet in
`Data.xlsx` are empty: "Not currently supporting peds"), has no pregnancy, no atria, no valve lesions, no MAC concept, no
effect sites, and **no hepatic model** (`PH/Hepatic` 80–99 is an empty `Process()`; there is no hepatic methodology page).
Those rows are listed under "no Pulse equivalent".

---

## A. Parameter comparison, by our section

### §1.1 Age bands (adult column only; Pulse has no paediatric or elderly bands)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `bvMlKg` | 70 (M) | 65.6·W^1.02 mL → 71.4 mL/kg at 70 kg; StandardMale 5,494 mL = 71.3 mL/kg [doc][M] | M:patient; SPK | same | Pulse formula has no BMI term (see §1.3) |
| `WK_R0` (SVR) | 1.05 mmHg·s/mL | SVR 0.90 mmHg·s/mL (≈1,200 dyn·s/cm⁵) [doc] | M:cv validation | same | −14 %; Pulse CO 5.79 vs our ≈5.0–5.5 at MAP 95 |
| `hypoxiaHrSign` | tachy (adult) | chemoreflex HR always ↑, max +1.23 × baseline HR [code] | PH/Nervous 600–625 | same | Pulse has no bradycardic (neonatal) branch |
| `hrRest` | 70 | 72 [code] | pat | same | |
| `hrMax` | 208 − 0.7·age | 208 − 0.7·age [doc] | M:patient | same | same Tanaka formula |
| `svMaxMlKg` | 1.1 | SV 80 mL / 77.1 kg = 1.04 mL/kg [M] | SPK | same | Pulse value is resting SV, not a ceiling |
| `MAP_set` | 85–95 | 95 = MAP after stabilisation [M][doc] | SPK; M:nervous | same | Pulse's set point is whatever MAP stabilises to |
| `frcMl` | 30 mL/kg IBW | 30 mL/kg IBW [doc] | M:patient | same | |
| `vo2MlKgMin` | 3.5 | 250 mL/min / 77.1 kg = 3.24 [doc] | M:tissue validation | same | −7 % |
| `shunt0` | 0.03 | emergent PaO2 89 on air, **A–a gradient 23 mmHg** (reference 5–14) [doc][M] | M:resp; SPK | differs ×≈2 (A–a) | our shunt 0.03 gives A–a ≈ 8–12; see disagreement D19 |
| `crsMlCmH2OKg` | 0.7 (50 mL/cmH2O, intubated, GA) | total respiratory compliance 91 mL/cmH2O, awake [doc] | M:resp | n/c | awake vs anaesthetised; Pulse has no GA compliance fall |
| `raw` | 10 (incl. ETT) | 1.5 cmH2O·s/L, no ETT [doc] | M:resp | n/c | Pulse adds tube resistance only through its ventilator/intubation circuit |
| `tempSet` | 37.0 | core 37.0 initial; control band 36.8–37.1 °C [code] | CFG 528–529; SET 4559 | same | |
| `hb` | 15 (M) | 15.0 g/dL (M), Hct 0.46 [doc] | M:bc | same | |
| `fStressed`, `cSysMlMmHgKg`, `WK_C` | 0.25; 1.6; 1.5 | distributed per-organ compliances and unstressed volumes, tuned at start-up [code] | SET 283–1315; PH/Cardiovascular 3103 | n/c | no single stressed-volume or Windkessel number exists in Pulse |
| `G_v`, `g_hs/g_R/g_V/g_c` | 15 ms/mmHg; gains 1 | normalised baroreflex slopes: HR sympathetic 1.73, parasympathetic 0.25; resistance 1.2; compliance 0.6; elastance 0.1; delays 20/20/30/60 s; ν = 12 [code] | CFG 584–598 | n/c | Ottesen form; the doc says ν = 4, but the code uses 12 (`ResponseSlope`, CFG 596) |

No Pulse equivalent (§1.1): `pwv` · `hrIntrinsic` · `frcGaMl` · `vdAnatMlKg` (Pulse has an anatomic dead-space compartment; value not extracted) · all neonate/infant/child/adolescent/elderly columns.

### §1.2 Sex

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `bvMlKg` (F) | 65 | 65.6·W^1.02 (not sex-specific) → 71 mL/kg at 59 kg [E] | M:patient | same | +9 %; Pulse has no sex term |
| `hb` (F) | 13.5 | 14.0 g/dL, Hct 0.43 [doc] | M:bc | same | |

No Pulse equivalent (§1.2): LVET regression · QTc offset · `svMaxMlKg` × 0.9 · `pwv` ×.

### §1.3 Body size and BMI

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `bvMlKg` by BMI | 70 → 50–55 (BMI ≥ 40, Lemmens) | 65.6·W^0.02 mL/kg → 72 mL/kg at 120 kg [E] | M:patient | differs ×1.35 (BMI 40) | Pulse overestimates BV in obesity; oracle must use normal-BMI patients |

No Pulse equivalent (§1.3): `frcFactor` · `atelInduction` · `crs` × · resting CO × · OSA prior.

### §1.4 Pregnancy

No Pulse equivalent: every row (`bvMlKg` ×, `hb`, CO, `hrRest` +, `WK_R0` ×, `copPlasma`, `frcFactor`, `vo2` ×, `paco2Set`, `acc`, `macFactor`).

### §1.5 Comorbidities

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `hfref` → `eesLV` × | 0.45 | `ChronicHeartFailure`: left contractility −45 % (EF 0.60 → 0.31) [doc] | M:cv; PH/Cardiovascular 935 | same | Pulse: unvalidated, applied at stabilisation only |
| `dehydrated` → `bloodVolume` × | 0.90 / 0.85 | `Dehydration` condition: BV 5.50 → 5.12 (mild) / 4.76 L (moderate) = ×0.93 / ×0.87 [doc] | M:tissue | same | Pulse also raises core temp to 38.6–39.7 °C (sweat-driven); ours does not |
| `anaemia` → `hb` | 11 / 9 / 7 / 5.5 | `ChronicAnemia`: up to −30 % Hb [doc] | M:cv; PH/Cardiovascular 877 | n/c | Pulse caps at −30 % (≈ Hb 10.5); no P50 or SVR adaptation |
| `smoker` → `cohb` | 3 / 6 / 8–10 % | CO substance with Haldane binding, M = 218; P50 = 26.8 − 20·S_CO [code] | SAT 225, 973 | n/c | Pulse models CO exposure, not a smoker condition; the SpO2 over-read is emergent |
| `copd` | GOLD 1–4 multipliers | `ChronicObstructivePulmonaryDisease` condition (bronchitis/emphysema severities) [code] | PatientConditions.proto | n/c | different parameterisation |
| `ckd` | K 5.0, Hb 10, HCO3 20 … | `ChronicRenalStenosis` (occlusion fractions) only [code] | PH/Cardiovascular 980 | n/c | no CKD chemistry condition |
| `sepsis` | §5e | `Sepsis` condition accepted, **no effect** [M] | SPK | differs (inert) | see D17 |

No Pulse equivalent (§1.5): `hfpef` · `htn` · `cad` · `as` · `ar` · `mr` · `ms` · `af` · `pmDependent` · `betaBlocked` · `dan` · `asthma` (Pulse has an `AsthmaAttack` action, not a condition) · `osa` · `hypothyroid` · `ph` · `rvFailure`.

### §2 Two-sided heart and pulmonary circuit (7a — ours)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `eesLv` | 2.3 mmHg/mL | `LeftHeartElastanceMaximum` 2.49 [code] | CFG 494 | same | +8 % |
| `eesRv` | 0.585 | `RightHeartElastanceMaximum` 0.523 [code] | CFG 497 | same | −11 % |
| `aLv`/`betaLv`, `aRv`/`betaRv` | exponential EDPVR | linear diastolic elastance `E_min` 0.049 (LV), 0.0243 (RV) mmHg/mL [code] | CFG 495, 498 | n/c | Pulse has no exponential EDPVR, so no HFpEF stiffness curve |
| `pvr` | 0.10 mmHg·s/mL | 0.113 [doc] | M:cv validation | same | |
| H1 composite | RA 2–6, mPAP ≤ 20, PCWP 6–12, CO 5–6, EF 55–70 % | CVP 4.7, PAP 19/15 (mean 17.4), PCWP 6.5, CO 5.79, EF 0.57 [M][doc] | SPK; M:cv | same | |
| `tIt` (Paw → pleura) | 0.4 | effectively 0: PEEP 5 → 15 moved CO 5.64 → 5.67, CVP unchanged [M] | SPK | differs ×0 | D4; the anaesthetic-teaching core of R27 |
| H10 (PEEP 5 → 15) | CO −5–10 % (normovolaemic) | CO +0.5 % [M] | SPK | differs | D4 |
| `pPtx` | 0 → 5–25 mmHg | `TensionPneumothorax` severity 0–1 (open/closed, L/R) [code] | PatientActions.proto | n/c | severity, not pleural pressure |
| `vFluid` | 0 → 150–250 mL | `PericardialEffusion` rate (mL/s) + chronic condition [code] | PH/Cardiovascular 1867, 952 | n/c | rate-driven; pericardial P–V not exposed |
| Valve `rMv/rTv/rAv/rPv` | 0.016–0.024 | ideal diodes [doc] | M:cv | n/c | |

No Pulse equivalent (§2): `v0Lv` (not extracted) · `A_p`/`λ_p`/`v0Peri` · `cSv` · `rVr` · `eRa` (no atria) · `cLa` · `cPv` · `ava` · `rfMR0` · `rfAR` · `mva` · `rfTR` · `pPl0` (not extracted) · `pCap` · `pOedema` · `kfLung` · `tauEvlw` · `evlwi` · `peFrac` · `peVaso` · H2–H9 valve/PE/RV targets.

### §3 Coronary supply/demand (7a — ours)

No Pulse equivalent: `dtf` · `cfr` · `pZf` · SEVR · O2 extraction · `gIsch` · `tauIschDown` · `tauIschUp` · `stun` · `stLag`. (Pulse has only a `MyocardiumOxygenDeficit` event at myocardial vascular PO2 < 5 mmHg, `PH/BloodChemistry` 505–512, and a fixed 4 % coronary flow share, `SET` 319.)

### §4 Lungs (7b — ours)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `co2Slope` | 1.5 L/min/mmHg | central gain G_c 1.44 (+ peripheral 30.24·e^(−0.05·PaO2) ≈ 0.34 at PaO2 90) [code] | CFG 619, 623; M:resp | same | Batzel form, gain on alveolar ventilation |
| `apnoeaOffset` | 4 mmHg below resting PaCO2 | thresholds I_c = I_p = 35.5 mmHg vs resting PaCO2 40 → 4.5 [code] | CFG 618, 622 | same | |
| `hvrA` | 25 (Weil hyperbola) | exponential e^(−0.05·PaO2) × 30.24 [code] | CFG 623 | n/c | different curve shape; compare the response, not the constant |
| `crs` (anaesthetised) | 50–60 | 91 mL/cmH2O (awake) [doc] | M:resp | n/c | as §1.1 |
| ARDS `crs/atel/shunt` | Crs 25–35, shunt 0.2–0.4 | `AcuteRespiratoryDistressSyndrome` condition + exacerbation, severity-driven [code] | PatientConditions.proto | n/c | |
| Bronchospasm `raw` × | ×(1 + 5·sev^1.5) | `Bronchoconstriction` / `AsthmaAttack` severity [code] | PatientActions.proto | n/c | |

No Pulse equivalent (§4): `frcDropInd` · `atelInd` · f(FiO2) · Edmark target · `tauCollapse` (all three rows) · `P_open`/`tauRec` · atelectasis → `crs` · `hpvRegional` · `tauHpv1` · `hpv2` · `hpvVolatile` · global-hypoxia and acidosis → PVR · COPD `fSlow`/`tauSlowS` · tube kink/secretions · endobronchial intubation effect (Pulse has left/right mainstem intubation; effect not extracted) · VD/VT and `dpHeight` zone-1 terms · lung-water shunt/compliance/resistance · PEEP benefit in oedema · `dlFactor` · `VE_pain` · `VE_Jrec` · `ptiCrit` · `uaCollapse`.

### §5.1 Brain (7d — ours)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `ICP0` | 10 | 9.1 [M] | SPK | same | |
| ICP treatment threshold | 22 | `IntracranialHypertension` event > 25 (clears < 24) [doc] | M:nervous | same | +3 mmHg |
| `CBF0` | 50 mL/100 g/min (≈ 750 mL/min) | 681 mL/min = 12 % of CO target; 47 mL/100 g/min at 1.45 kg [doc][code] | M:cv; SET 313 | same | −9 % |
| `cmro2_0` | 3.3 mL/100 g/min (≈ 50 mL/min) | ≈ 30 mL/min: whole-body VO2 split by flow share (12 % × 250) [E] | PH/Tissue 866–888 | differs ×0.6 | Pulse allocates metabolism by blood-flow fraction, not by organ demand |
| `cbfLL`/`cbfUL` | 60 / 150 (plateau) | no autoregulation: TBI 0.6 dropped CBF 944 → 121 mL/min [M] | SPK; PH/Cardiovascular 1552–1567 | differs (no plateau) | D7 |
| `kCO2` | 0.03 /mmHg | 0: cerebral resistances do not respond to PaCO2 [code][doc] | PH/Cardiovascular (no CO2 term); M:nervous | differs ×0 | D6 |
| PbtO2 ischaemic threshold | 20 | `BrainOxygenDeficit` at brain vascular PO2 < 19; critical < 10 [code] | PH/BloodChemistry 481–500 | same | Pulse uses vascular, not tissue, PO2 |

No Pulse equivalent (§5.1): `pvi` · `tauCsf`/`csfReserve` (Pulse CSF model exists but is off by default, `EnableCerebrospinalFluid` Off) · CPP target · `paO2Cbf` · `grubb` · `PbtO2_0` · head-up effect · `q10Brain` · ICP waveform · all anaesthetic/treatment brain multipliers (mannitol, HTS, volatiles, ketamine, hyperventilation).

### §5.2 Kidney (7d — PORT)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `UOP0` | 1.0 mL/kg/h | 1.32 L/day = 0.71 mL/kg/h (M); 0.67 L/day = 0.47 (F) [doc] | M:renal validation | differs ×0.71 (M) / ×0.47 (F) | D12; Pulse reference is 1.5 L/day |
| Oliguria alarm | < 0.5 mL/kg/h | `Antidiuresis` event: < 0.5 **mL/min** (≈ 0.39 mL/kg/h) and urine osm > 280 [doc] | M:renal | differs ×0.78 | different trigger basis |
| `rblLL`/`rblUL` | 80–180 | TGF operating range MAP 80–180 via afferent R 2.2–11.2 mmHg·s/mL [code][doc] | CFG 608–609; M:renal | same | myogenic response not modelled |
| `rppZero` | 40 | emergent: filtration stops when P_glom < π_glom (32) + P_Bowman [code] | SET 1386–1389 | n/c | oracle scenario O11 measures it |
| Hyperglycaemic osmotic diuresis threshold | glucose 180–200 mg/dL | glucose Tm 0.375 g/min, GFR 102 mL/min → threshold ≈ 370 mg/dL [E] | sub:Glucose; M:renal | differs ×≈1.9 | D13; no splay |
| `iap` | 5 | abdominal cavity pressure only for internal haemorrhage [code] | PH/Cardiovascular 1789 | n/c | |

No Pulse equivalent (§5.2): `S` (surgical stress/ADH; Pulse has no ADH/RAAS) · PEEP → UOP · NE in vasoplegia (emergent in both; no parameter) · α-agonist renal vasoconstriction `D`.

### §5.3 Liver and metabolism (7d/7e — PORT)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `hbfFrac` | 0.25 of CO | 0.255 (M) / 0.27 (F) of CO, incl. portal flow [code] | SET 330 | same | |
| `hbfFactor` | ×0.6 in class III / high α | no organ-selective vasoconstriction: baroreflex scales systemic resistances together [code] | PH/Cardiovascular 2622 | n/c | |
| `clearTemp` | −10 %/°C | 0: well-stirred hepatic clearance has no temperature term [code] | PH/Drug 666–671 | differs ×0 | D11 |
| `lacProd0` | 1,400 mmol/day | 1.3 mol/day [code][doc] | PH/Energy 110; M:energy | same | |
| `lactate0` | 1.0 mmol/L | 142.5 mg/L initial = 1.6 mmol/L; validated 146.6 mg/L = 1.65 [code][doc] | SUBM 861; M:bc | differs ×1.6 | D18; inside Pulse's quoted 0.3–1.7 mmol/L range |
| `vLac` | 0.6 L/kg | vascular + tissue extracellular pools, diffusion [code] | PH/Tissue 431 | n/c | |
| `kLac` (t½ ≈ 30 min) | 1.4 /h | blood lactate leaves only by renal filtration (reabsorption ratio 0.114, Tm 0.075 g/min) → renal gluconeogenesis; liver "consumption" adds glucose **without removing lactate** [code] | sub:Lactate; PH/Renal 654–735; PH/Tissue 1027–1029 | differs (≪; not quantified) | D2, D22 |
| Clearance split | liver 60 / kidney 30 / other 10 % | kidney ≈ 100 % (see above) [code] | as above | differs | |
| `do2Crit` | 6 mL/kg/min | anaerobic switch is per-tissue PO2 < 40 mmHg: w = min(1, [O2]_t/[O2]@40) [code] | PH/Tissue 735, 889 | n/c | |
| `kAnaer` | 0.03 mmol per mL O2 deficit | lactate = 0.5 × 0.6 × (1 − w) × ATP rate [code] | PH/Tissue 810, 942 | n/c | per ATP deficit, not per O2 deficit |
| `q10` | 7.5 %/°C | no VO2 temperature scaling between 34 and 40 °C; below 34 °C ×0.94/°C of summit; above 40 °C ×1.11/°C [code] | PH/Energy 612–635 | differs | D11 |

No Pulse equivalent (§5.3): `erMax` · MH (`mh`) · dantrolene. (Pulse also has **no hepatic model**: `PH/Hepatic` is empty.)

### §5b.1 Acid–base (7c — PORT)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| pK, CO2 solubility | 6.1; 0.03 | pH − 6.1 − log(HCO3/(α·PCO2)); α = 30.7 µM/mmHg ÷ 0.94 plasma water ≈ 0.0327 [code] | SAT 109, 968 | same | |
| `hco3` / BE / pH | 24 / 0 / 7.40 | 26.0 / +1.55 / 7.414 [M][doc] | SPK; M:bc | same | HCO3 +8 % |
| BE formula | 0.93·(HCO3 − 24.4 + 14.83·(pH − 7.4)) | 0.9287·HCO3 + 13.77·pH − 124.58 [code] | PH/BloodChemistry 217 | same | algebraically identical to 0.1 mEq/L |
| Acute respiratory compensation | +1 HCO3 per 10 mmHg | emergent from Stewart with **fixed** SID 40.5 and albumin 45 g/L [code] | SAT 106; PH/Tissue 384 | n/c | oracle O6/O7 measures ΔHCO3/ΔPaCO2 |
| Winter's formula | PaCO2 = 1.5·HCO3 + 8 | chemoreflex drives on PaCO2/PaO2 only; no pH/HCO3 input [code] | CFG 618–623; M:resp | differs (absent) | D23 |
| Lactate → HCO3 | 1:1 | **0**: SID is a constant 40.5 mmol/L, lactate and Cl never enter the solver [code] | PH/BloodChemistry 91; SAT 106 | differs ×0 | D1, D3 — the root cause of pH 10.6 in VF |
| `albumin` | 40 g/L | 37 g/L in blood; solver hard-codes 45 g/L [code] | SUBM 727; PH/Tissue 384 | same | the hard-code means albumin changes do not move pH |
| `cl` | 104 | 0.362 g/dL = 102 mmol/L [code] | SUBM 758 | same | Cl does not affect pH (fixed SID) |
| Phosphate | (implicit) | 1.1 mmol/L constant [code] | PH/BloodChemistry 90 | — | informational |

No Pulse equivalent (§5b.1): pH → contractility (`eesLV` ×) · pH → catecholamine response (`vasoResp` ×).

### §5b.2 Electrolytes (7c — PORT)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `k` | 4.2 mmol/L | 0.0156 g/dL = 156 mg/L = 4.0 mmol/L true; **Pulse reports 5.0** because its K molar mass is 31.1 g/mol (should be 39.10) [code] | SUBM 880; sub:Potassium | same (mass) / differs ×1.19 (Pulse mmol output) | D14; compare K in mg/L |
| `kPh` | +0.4 per −0.1 pH | 0: no transcellular K shift [code][doc] | M:renal ("K⁺ disturbances not possible") | differs ×0 | |
| K handling | ECF distribution, 50 % into cells in 30 min | renal only: reabsorption ratio 8.0; secretion of any peritubular K above 0.0185 g/dL [code] | sub:Potassium; CFG 603; PH/Renal 890–948 | n/c | |
| `iCa` | 1.20 mmol/L | 48.1 mg/L = 1.20 mmol/L (Pulse "calcium" is ionised-range) [code] | SUBM 749 | same | no PD: Ca has no cardiac or ECG effect |
| `na` | 140 | 0.323 g/dL = 140.5 mmol/L initial; 144 validated [code][doc] | SUBM 889; M:bc | same | Na set point 3.23 mg/mL, CFG 602 |

No Pulse equivalent (§5b.2): `vK` · sux K rise · insulin–dextrose K shift · salbutamol K shift · calcium membrane effect · `citrateUnit` · `kUnit` · `mg` (no Mg substance).

### §5b.3 Oxygen delivery

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `caO2` | ≈ 20 mL/dL | 0.22 (22 mL/dL) (M) [doc] | M:bc | same | +10 % |
| `do2` | ≈ 1,000 mL/min | 1,277 (M) / 1,062 (F) [doc] | M:bc | differs ×1.28 (M) | D20: CO 5.79 × CaO2 22 |
| `svo2` | 0.75 | vena-cava SO2 0.813 initial; CvO2 0.17 [code][doc] | SUBM 431; M:bc | same | +8 % |
| `p50` | 26.8 | P50 = 26.8 − 20·S_CO (Dash–Bassingthwaighte) [code] | SAT 973 | same | |

### §5b.4 Fluid compartments (7c — PORT)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| Crystalloid intravascular fraction during infusion / 30 min after | 0.55 / 0.20 | emergent; transcapillary flow is hydrostatic only through R = 20,000/m_tissue(kg) mmHg·s/mL with colloid-osmotic sources = 0 and lymph flow = 0 [code] | SET 2116, 2581–2591 | differs (expected ≫ 0.20; to measure) | D10 |
| `tauDist` | 10 min | as above (whole-body conductance ≈ Σm/20,000 ≈ 0.0035 mL/s/mmHg → τ of hours) [E] | SET 2116 | differs (≫) | D10 |
| TBW / ICF / ECF | 0.6 / ⅔ / ⅓ of TBW | TBW 39.6 L (M), ICF 25.3 L, ECF-excl-plasma 8.8 L [doc] | M:tissue | same | TBW 0.51 L/kg (M); F 34 % low |
| Plasma volume | 40–45 mL/kg | 2,942 mL (M) = 38 mL/kg [doc] | M:bc | same | −10 % |

No Pulse equivalent (§5b.4): `t12El` (emergent via renal) · `t12Colloid` (Pulse compounds are Saline, Blood, PackedRBC only) · `refill` (emergent) · Hb rise per RBC unit (emergent; not extracted) · cold-unit effect · capillary-leak `kfMult`.

### §5c Endocrine, metabolism, thermoregulation (7e — PORT)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| `sympStress` | noxious × (1 − antinociception) | `AcuteStress` severity s: epinephrine release × (1 + 30·s) [code] | PH/Endocrine 178–184 | n/c | Pulse has no nociception input |
| Catecholamine surge (hypovolaemia) | adds to baroreflex | none: epinephrine rises only with exercise or `AcuteStress` [code][doc] | PH/Endocrine 164–184 | differs (absent) | D16 |
| `glucose` | 100 mg/dL | 95 initial; 102 (M) / 108 (F) validated [code][doc] | SUBM 812; M:bc | same | |
| `SG`, `SI`, `p2`, `vG` | Bergman minimal model | insulin-dependent uptake 0.01·(1 − e^(−0.8·I[µg/L]))·G per tissue per s + insulin-independent term [code] | PH/Tissue 966–975 | n/c | not a minimal model |
| Hypoglycaemia alarm L1 | < 70 mg/dL | `Hypoglycemia` event < 70 (clears > 72) [code] | PH/BloodChemistry 428–440 | same | |
| Hyperglycaemia | > 180 mg/dL | `Hyperglycemia` event > 180 (clears < 178) [code] | PH/BloodChemistry 423–430 | same | |
| `thrSweat` (awake) | 37.2 | sweating above `CoreTemperatureHigh` 37.1; basal 347 mg/min [code] | CFG 529; PH/Energy 668–672 | same | |
| `thrShiver` (awake) | 36.0 | shivering starts < 36.8 and reaches summit at 35.0 (36.8 − 1.8) [code] | CFG 528, 530; PH/Energy 617–624 | differs +0.8 °C | |
| GA thresholds | vaso 34.5, shiver 33.5 | no anaesthetic effect on thresholds: shivering still < 36.8 under propofol/desflurane [code] | PH/Energy 598–641 | differs (+3.3 °C for shivering) | D11 |
| `shiver` | VO2 ×2–3 (×5 max) | summit metabolism 21·W^0.75 W = 546 W at 77 kg ≈ 6.5 × BMR (84 W) [code][E] | PH/Energy 608 | differs ×≈2 | |
| Hypothermia stage "mild" | < 35 °C | `Hypothermia` event < 35.0 (clears > 35.2) [code] | PH/Energy 529–535 | same | |
| Hyperthermia | fever 38.3–40 (sepsis) | `Hyperthermia` event > 38.8 (clears < 38.0) [code] | PH/Energy 538–545 | n/c | event threshold only; no set-point shift |
| BMR (for `vo2`) | via VO2 3.5 mL/kg/min | Harris–Benedict (Roza): 1,737 kcal/day (M) [code][doc] | PH/Energy 752; M:energy | same | ≈ 3.3 mL O2/kg/min at 4.8 kcal/L |

No Pulse equivalent (§5c): `noxious` · `cortisol` · hyperthyroid/storm · `thrVaso` · `macFactor` × temperature · fever (`tempSet` +) · hypothermia ECG stages (Pulse ECG is a template).

### §5d Neuromuscular block and anaesthetic depth (7f — ours)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| Rocuronium CL | 0.25 L/kg/h (4.2 mL/kg/min) | systemic 3.5 mL/min/kg (fu 0.7) [code] | sub:Rocuronium | differs ×0.84 | |
| `ec50Roc` / `gammaRoc` | 823 ng/mL (effect site) / 4.8 | EC50 554.9 ng/mL **plasma**, shape 1.0, no effect site [code] | sub:Rocuronium | n/c | Pulse NMB is one 0–1 level; no TOF, no diaphragm/thumb split |
| Succinylcholine | block ~1 min; T1 90 % at 10.9 min | EC50 581 ng/mL plasma, CL 50 mL/min/kg [code] | sub:Succinylcholine | n/c | no K⁺ release |
| Fentanyl potency (Ce) | EEG EC50 6.9 ng/mL; vent C50 ≈ 0.6 | EC50 6.4 ng/mL plasma for all effects (RR −25 %, SBP/DBP −10 %, HR −10 % at Emax) [code] | sub:Fentanyl | same (vs EEG) / differs ×10.7 (vs vent C50) | Pulse's opioid respiratory effect is weak (Emax −25 % RR) |
| `mac40*` (desflurane) | 6.6 % | desflurane EC50 300 µg/mL plasma [code] | sub:Desflurane | n/c | no MAC |
| `ce50PropBis` | 3.08 µg/mL | propofol EC50 0.765 µg/mL plasma for sedation, BP, HR, RR, VT [code] | sub:Propofol | n/c | Pulse `SedationLevel` 0–1; no BIS-like index |

No Pulse equivalent (§5d): TOF/PTC rules · rocuronium `ke0Roc` · vecuronium · cisatracurium · sugammadex (all rows) · neostigmine · `macAwake` · `macOpioid` · Eleveld γ · DI calibration · EMG artefact · burst suppression · `c50RemiVent` (no remifentanil) · Babenco/Nieuwenhuijs targets · opioid/propofol breathing-pattern rules · volatile `co2Slope` ×.

### §5e System-level conditions (7f — ours)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| Sepsis bundle (`tempSet`, `hrRest`, `WK_R0` ×, `V0`, `kfMult`, `ees`, `vo2`, `erMax`, `vasoResp`) | §5e table | `Sepsis` condition: HR 72.05, MAP 95.33 after stabilisation, i.e. no effect; code exists only on `feature/sepsis` [M] | SPK | differs (inert) | D17 |

No Pulse equivalent (§5e): anaphylaxis (all rows) · SIRS/inflammation · serotonin/NMS hypermetabolic states.

### §6 Drug PK/PD (7g — ours)

| Our symbol | Our default | Pulse value | Pulse source | Agreement | Note |
|---|---|---|---|---|---|
| Propofol CL | Eleveld 1.79 L/min (25.6 mL/kg/min) | **systemic 3.0 mL/min/kg**, fu 0.03, intrinsic 1.44, renal 1.3 [code] | sub:Propofol | differs ×0.12 | D9; verify with the oracle (Cp after 2 mg/kg) before trusting |
| Propofol MAP effect | MAP ≈ 70 % at 2 min after 2 mg/kg | 72 % at +150 s after 150 mg [M] | SPK | same | |
| Propofol HR effect | ~/↓ (little change) | HR modifier −0.2 → HR 72 → 49 [M] | sub:Propofol; SPK | differs | D8 |
| Fentanyl CL | not re-read (VERIFY) | 14 mL/min/kg, fu 0.336 [code] | sub:Fentanyl | n/c | fill our row from Shafer when read |
| Phenylephrine | infusion Emax +100 % SVR at EC50 0.5 µg/kg/min | plasma EC50 18 ng/mL; SBP +40 %, DBP +35 %, HR −20 % at Emax; CL 190 mL/min/kg [code] | sub:Phenylephrine | n/c | Pulse PD acts on SBP/DBP, not SVR (spike §4.3) |
| Norepinephrine | SVR Emax +150 %, EC50 0.15 µg/kg/min | plasma EC50 3.8 ng/mL; SBP +35 %, DBP +25 %, HR −20 %; CL 55 mL/min/kg; plasma at 0.01 µg/kg/min 0.76 µg/L vs reference 0.36–0.61 [code][doc] | sub:Norepinephrine; M:drugs | n/c (plasma ×≈1.6 high) | D24 |
| Epinephrine | contractility Emax +60 %, HR +20–30 % | plasma EC50 0.9 ng/mL; SBP +50 %, DBP −25 %, HR +45 %; CL 68.7 mL/min/kg [code] | sub:Epinephrine | n/c | |
| Desflurane (per MAC) | as isoflurane: SVR ×(1 − 0.25·MAC), HR +5–10 % | SBP/DBP −40 %, HR **+40 %** at Emax; 6 % → MAP 94 → 61 [code][M] | sub:Desflurane; SPK | differs (HR Emax ×4–8) | |
| Ketamine | HR +15–20 %, SVR +15–25 % | SBP +40 %, DBP +30 %, HR +20 % at Emax [code] | sub:Ketamine | same | direction and size at Emax |
| Etomidate | MAP −0–10 % | HR −10 %, no BP modifier [code] | sub:Etomidate | same | no adrenal suppression |
| Midazolam | SVR −10–15 % | SBP/DBP −25 % at Emax [code] | sub:Midazolam | differs ×≈2 | |

No Pulse equivalent (§6): Eleveld/Schnider/Marsh model structure and every `ke0` (Pulse is PBPK with no effect site) · remifentanil · sufentanil/alfentanil · vecuronium · cisatracurium · sugammadex binding · volatile FA/FI wash-in (Pulse has desflurane only) · vasopressin · ephedrine · dobutamine · milrinone · dopamine · nitroglycerin · esmolol · labetalol/metoprolol · amiodarone · lidocaine · magnesium · verapamil/diltiazem · atropine · glycopyrrolate · sevoflurane · isoflurane · N2O · thiopental · dexmedetomidine · pethidine.

### §7–§8 Scenarios and devices

§7 sanity checks are not parameters; the ones Pulse can run are the oracle scenarios in §D. §8 devices: **no Pulse equivalent** for IABP, LVAD, ICD, permanent pacemaker. ECMO: `stable` has `ECMOConfiguration`; `integration` adds a VV/VA dual-circuit model (merged 2026-08-11) → n/c until 4.4.

### Coverage count

| | Rows |
|---|---|
| Rows compared (tables above) | **118** (plus 1 informational row, phosphate) |
| `same` | **51** |
| `differs` | **32** |
| `n/c` | **35** |
| "No Pulse equivalent" entries | **171** (some entries group several symbols, e.g. all paediatric columns) |

*Rows with two verdicts (K, fentanyl potency) are counted by their first verdict. The `same` set is dominated by resting
values; the `differs` set is dominated by dynamic behaviour. That is the pattern R34 predicted: Pulse is a good
resting-state reference and a weak dynamic one in acid–base, lactate, fluid shifts, heart–lung interaction and anaesthetic
thermoregulation.*

---

## B. Porting briefs (R34: port, don't plug)

Each brief lists what Pulse actually does (not what we wish it did), then what we take. **Take** = port the equation and
numbers. **Fix** = port the structure but correct a known Pulse defect. **Ours** = keep our own row.

### B1. 7c — Blood chemistry, acid–base, electrolytes, fluids

**Pulse topology.** Every vascular leaf compartment carries substance quantities: Aorta, VenaCava, RightHeart, LeftHeart,
Left/RightPulmonaryArteries, …Capillaries, …Veins, Brain, Bone, Fat, Gut (LargeIntestine, SmallIntestine, Splanchnic →
portal), Liver, Spleen, Muscle, Myocardium, Skin, Left/RightArm, Left/RightLeg, Pericardium, plus the renal sub-circuit (B2).
Each organ also has a tissue branch (`SET` 2085–2865):

```
Organ1 (vascular) ─[π source, baseline 0]─ OrganT2 ─[R = 20000 / m_tissue(kg) mmHg·s/mL]─ OrganT1 (extracellular, C = V/P) ─ OrganT3 ─ ground
OrganT1 ─[flow source, baseline 0]→ Lymph ─→ VenaCava1          intracellular = separate compartment (diffusion only)
```

**Governing equations** (solved in every vascular compartment, every 20 ms step; `SAT` 60–120, 931–1060):
```
f0: SID − HCO3 − Alb·(0.123·pH − 0.631) − Pi·(0.309·pH − 0.469) = 0          # Figge/Stewart electroneutrality
f1: TCO2 = CO2_d + HCO3 + 4·S_CO2·Hb        f2: TO2 = O2_d + 4·S_O2·Hb           # mass conservation
f3: pH = 6.1 + log10(HCO3 / (α_CO2·PCO2))                                           # Henderson–Hasselbalch
S_O2, S_CO2 = DashBassingthwaighte(pH, PO2, PCO2, T, DPG = 4.65 mM);  P50 = 26.8 − 20·S_CO;  n = 2.7 − 1.1·S_CO
BE  = 0.9287·HCO3 + 13.77·pH − 124.58                                              (PH/BloodChemistry 217)
Hct = (Hb_mass / MCH)·MCV / BV;  MCH 29 pg, MCV 90 fL                               (CFG 488–489)
BUN = urea / 2.14;  total protein = 1.6·albumin;  globulin = 0.6·albumin           (PH/BloodChemistry 260–265)
Osmolality = f(Na, K, glucose, urea, specific gravity)                             (PH/BloodChemistry 284–296)
Transcapillary flow J = (P_vasc − P_ECF − π) / R_t,  π = 0, lymph = 0              (SET 2581–2591, muscle; same per organ)
```

**Parameters.**

| Parameter | Value | Units | Source |
|---|---|---|---|
| SID | 40.5 (constant) | mmol/L | PH/BloodChemistry 91; SUBM 339 |
| Albumin in solver | 45 (hard-coded) | g/L | PH/Tissue 384; SUBM 335 |
| Phosphate | 1.1 (constant) | mmol/L | PH/BloodChemistry 90 |
| Blood albumin | 3.7 | g/dL | SUBM 727 |
| Na / K / Cl / Ca | 0.323 g/dL / 0.0156 g/dL / 0.362 g/dL / 48.1 mg/L | — | SUBM 889 / 880 / 758 / 749 |
| Glucose / lactate / urea / creatinine | 95 mg/dL / 142.5 mg/L / 23 mg/dL / 1.2 mg/dL | — | SUBM 812 / 861 / 942 / 767 |
| Tissue (ICF) Na / K / Cl | 15 / 120 / 20 | mmol/L | SUBM 915, 885, 763 |
| Hypoxia / hypercapnia / hyperoxaemia events | PaO2 ≤ 65; PaCO2 ≥ 60; PaO2 > 120 (> 200 severe) | mmHg | PH/BloodChemistry 336–395 |
| Na events | < 135 / > 145 | mEq/L | PH/BloodChemistry 404–417 |
| Lactic acidosis event | lactate > 36.04 mg/dL **and** MetabolicAcidosis event | — | PH/BloodChemistry 456–468 |
| Metabolic acidosis / alkalosis events | pH < 7.35 and HCO3 < 22 / pH > 7.45 and HCO3 > 26 | — | PH/Energy 564–580 |
| Tissue fluid resistance constant | 20,000 | mmHg·s/mL·kg | SET 2116 |
| Blood density / specific heat | 1,050 kg/m³ / 3,617 J/kg/K | — | PH/BloodChemistry 85–86 |

**Substances.** O2, CO2, HCO3, Hb, HbO2, HbCO2, HbO2CO2, HbCO, CO, Na, K, Cl, Ca, albumin, globulin, lactate, glucose,
urea, creatinine, acetoacetate, tristearin (Pi and SID are scalars, not substances).

**Validation Pulse cites.** Resting tables (M/F) at `M:bc` → https://pulse.kitware.com/_blood_chemistry_methodology.html
(pH 7.42, HCO3 26.0, BE 1.55, lactate 146.6 mg/L, glucose 102, plasma osmolality **246 mOsm/kg — 10.6 % below the
275–295 reference**, CO2 saturation 0.03 vs 0.13 reference); four-compartment solver test (arterial pH 7.3998, venous 7.3691);
haemorrhage + saline shown as a figure only. Tissue fluid volumes at `M:tissue` → https://pulse.kitware.com/_tissue_methodology.html.

**Candidate simplification for our tick model.**

| Keep / collapse | Decision |
|---|---|
| Per-compartment Dash–Bassingthwaighte Newton solve | **Collapse.** Our Stage 3 ODC + two-compartment CO2 already give SaO2, PaCO2. Solve acid–base in 2 pools (arterial, mixed venous) at 10 Hz. |
| Figge/Stewart equation f0 | **Take + Fix.** SID becomes **dynamic**: SID = Na + K + 2·iCa + Mg − Cl − lactate − ketones (our Stewart-lite row), so lactate and saline move pH. Albumin comes from the blood pool, not the 45 g/L hard-code. |
| BE formula, BUN/protein/globulin/osmolality relations | **Take** (equations only). Add glucose and urea to our osmolality. |
| Events and thresholds | **Take** the thresholds; **Fix** the hypocapnia check, which compares PaO2 (D15). |
| Tissue fluid branch | **Take the topology** (vascular → R_t → ECF with compliance → lymph return) at 3 pools: plasma, interstitium, ICF. **Fix:** switch on the colloid-osmotic source with Landis–Pappenheimer π = 2.1·TP + 0.16·TP² + 0.009·TP³ (Pulse has the formula at PH/Renal 1634–1640 but does not use it for tissue), a leak multiplier `kfMult`, and a lymph return; fit R_t to Hahn's τ 10 min. |
| Electrolytes | **Take** the initial values and the Na set point. **Ours:** K transcellular shift, pH–K, citrate/iCa, Mg. Compare K in mg/L (D14). |

**Effort:** acid–base 2-pool with dynamic SID 6–8 h · 3-pool fluid model fitted to Hahn 6–8 h · electrolytes 3–4 h ·
tests 3 h → **18–23 h**.

### B2. 7d — Renal (and what exists of hepatic)

**Pulse topology** (one lumped nephron per kidney; `SET` 1316–1720). Node chain:

```
AortaConnection → RenalArtery (C) → AfferentArteriole [R_aff, TGF-controlled] → GlomerularCapillaries (C)
  → EfferentArteriole → PeritubularCapillaries → RenalVein (C) → VenaCavaConnection
GlomerularCapillaries ─[π_g −32]─ NetGlomerularCapillaries ─[R_filter]─ NetBowmansCapsules ─[π_B 0]─ BowmansCapsules
BowmansCapsules ─[R_tubules]→ Tubules ─[R_ureter]→ Ureter → Bladder (400 mL, auto-void)
Tubules ─[π_t −15]─ NetTubules ─[R_reabsorption]→ NetPeritubularCapillaries ─[π_p −32]─ PeritubularCapillaries
```

**Governing equations** (`PH/Renal`):
```
R_filter = 1 / (Lp_g · A_g)                                                    (518–578)
Lp_reab(P_ra) = 2.00943e-6·P_ra² − 8.09933e-4·P_ra + 9.37727e-2  [mL/s/mmHg/m²] if round(P_ra) ≥ 80, else set point   (1983–2071)
Lp_reab ×= (1 − furosemide TubularPermeabilityChange)                          (1996–1997)
Lp_reab ×= (Na_plasma / Na_set)^10            # osmoreceptor, applied per beat     (1758–1818)
R_reab = 1 / (Lp_reab · A_reab)
TGF (per beat): R_aff ← R_aff · (R_aff,now/R_aff,next + 0.001·(Ṅa_tub − Ṅa_set)/Ṅa_set),  clamp [2.2, 11.2]   (1823–1978)
Filtered mass  = C_glom · Q_filter · Δt · filterability · f_unbound            (807–888)
Filterability  = f(radius = 0.0348·MW^0.4175 nm, charge);  1 if r < 1.8 nm, 0 if r > 4.4 nm   (950–1007)
Reabsorbed mass = C_tub · Q_reab · Δt · ratio · min(1, 1/perm_factor),  ≤ Tm  (1009–1132)
K secretion: move (K_peritub − 0.0185 g/dL) · V_peritub to urine when above   (890–948)
Gluconeogenesis: excreted lactate → peritubular glucose 1:1 by mass, ≤ glucose Tm   (654–735)
```

**Parameters** (per kidney unless stated).

| Parameter | Value | Units | Source |
|---|---|---|---|
| Renal artery R | 0.025 (M) / 0.055 (F) × 1.25 | mmHg·min/mL | SET 1338–1340 |
| Afferent / glomerular / efferent / peritubular / renal-vein R | 0.0417 / 0.0019 / 0.0763 / 0.0167 / 0.0066 (all × 1.25) | mmHg·min/mL | SET 1341–1345 |
| Glomerular filter / tubules / reabsorption R | 0.1600 / 0.1920 / 0.1613 (all × 0.80) | mmHg·min/mL | SET 1346–1348 |
| Ureter R | 30 × 0.65 | mmHg·min/mL | SET 1350–1351 |
| Oncotic sources (glomerular / Bowman / tubular / peritubular) | −32 / 0 / −15 / −32 (fixed) | mmHg | SET 1386–1389; PH/Renal 648 |
| Glomerular Lp · area | 3.67647 · 2.0 (Kf 7.35 per kidney) | mL/min/mmHg/m² · m² | CFG 604–605 |
| Tubular reabsorption Lp · area | 2.91747 · 2.5 | mL/min/mmHg/m² · m² | CFG 606–607 |
| Afferent R range (TGF) | 2.2–11.2 | mmHg·s/mL | CFG 608–609 |
| Plasma Na set point | 3.23 | mg/mL | CFG 602 |
| Peritubular K set point | 0.0185 | g/dL | CFG 603 |
| Na-delivery target | 0.201 | g/min | CFG 615 |
| Osmoreceptor exponent | 10 | — | PH/Renal 1764 |
| TGF damping | 0.001 (0.005 during stabilisation) × Δt/0.02 | — | PH/Renal 1930–1938 |
| Bladder capacity | 400 | mL | PH/Renal 1549 |
| Reabsorption ratio / Tm: Na 1.0 / ∞ · K 8.0 / ∞ · Cl 1.0 / ∞ · HCO3 12.5 / ∞ · Ca 0.99 / ∞ · urea 0.01 / ∞ · lactate 0.114 / 0.075 g/min · glucose ∞ / 0.375 g/min · albumin ∞ / 30 mg/min | — | — | sub:* |
| Renal blood flow target | 8.5 % (M) / 7.5 % (F) of CO per kidney | — | SET 315 |

**Substances.** Na, K, Cl, HCO3, Ca, glucose, lactate, urea, creatinine, albumin, acetoacetate; drugs by clearance
(`RenalDynamic::Clearance`, PH/Renal 1219–1256); furosemide PD `TubularPermeabilityModifier` 0.8, EC50 0.446 µg/mL.

**Validation Pulse cites.** https://pulse.kitware.com/_renal_methodology.html — resting (M): GFR 147.5 L/day (ref 180),
RBF 1,049 mL/min (1,064), UOP 1.32 L/day (1.5), filtration fraction 0.18, urine osmolality 630 mOsm/kg; urine K 0.04 g/L
vs 0.78–2.74 (95 % error); peritubular and renal-vein pressures 51–71 % high. Scenarios: renal stenosis 60 % unilateral and
90 % bilateral, haemorrhage class 2 and 3, high altitude — 33 good / 0 decent / 2 bad. Stated limits: no RAAS, no ADH, no
myogenic response, K⁺ disturbances not possible.

**Hepatic (what exists).** No hepatic model (`PH/Hepatic` 80–99 empty). Liver function in Pulse is: well-stirred hepatic
drug clearance `CL_H = Q_H·f_u·CL_int·BW / (Q_H + f_u·CL_int·BW)` (PH/Drug 666–671); hepatic flow 25.5 % (M) of CO
(SET 330); liver ketone production (PH/Tissue 788–800); glucose release `0.1·(85 − G)·V_dL` mg/s when G < 85 mg/dL
(PH/Tissue 1041–1043); a liver lactate→glucose step that **does not remove lactate** (PH/Tissue 1027–1029); albumin
production 0.15 mg/s, documented as non-functional. **Take:** the well-stirred equation, the flow share, the glucose-release
rule. **Ours:** lactate clearance (kLac, liver 60 % / kidney 30 %), temperature and flow effects on clearance, citrate.

**Candidate simplification for our tick model.**

| Keep / collapse | Decision |
|---|---|
| Two kidneys, 14 nodes, circuit solve | **Collapse** to one algebraic kidney at 1 Hz: RBF = (MAP − max(CVP, IAP))/(R_art + R_aff + R_eff + R_pt + R_v); P_gc from the divider; GFR = Kf·(P_gc − P_B − π_gc(albumin)). |
| TGF | **Take** as first-order control on R_aff (τ from the 0.001-per-beat damping ≈ 60–90 s), clamp 2.2–11.2 (for two kidneys in parallel, halve). |
| Pressure natriuresis | **Take** the Lp_reab(P) quadratic as the tubular reabsorption fraction versus renal arterial pressure. **Fix:** add our `S` (stress/ADH) factor, since Pulse has no ADH. |
| Osmoreceptor | **Take** (Na/Na_set)^10 on reabsorption. |
| Solute handling | **Take** filterability, reabsorption ratios, Tm (glucose, lactate, albumin) and K secretion for Na, K, Cl, glucose, urea, creatinine, lactate. **Fix:** add splay to glucose Tm so glycosuria starts at 180–200 mg/dL (D13). |
| Bladder | **Take** (for the UOP tile). |

**Effort:** renal 10–14 h; hepatic 3–4 h → **13–18 h**.

### B3. 7e — Endocrine, metabolism (tissue/energy), thermoregulation

**Pulse topology.**
```
Thermal (SET 4553–4603):  Ground ─[heat source = TMR]→ Core (C = 0.91·W·0.83 kcal/K/kg) ─[R_cs]─ Skin (C = 0.09·W·c) ─→ Environment circuit
                          R_cs = 1 / (0.5·ρ_blood·c_blood·Q_skin)   (PH/Energy 715–730; initial 0.056 K/W)
                          Skin → sweat path (flow source, SkinSweating)          Environment: radiation, convection, evaporation, respiration
Endocrine (PH/Endocrine):  insulin → Splanchnic;  epinephrine → Left/RightEfferentArteriole (½ each);  norepinephrine → Aorta;  clearance = substance systemic CL
Metabolism (PH/Tissue 716–1122): per tissue (Bone, Brain, Fat, Gut, Kidneys, Liver, Lungs, Muscle, Myocardium, Skin, Spleen), share = vascular inflow / Σ inflow
```

**Governing equations.**
```
BMR (Roza/Harris–Benedict) M: 88.632 + 13.397·W + 4.799·H − 5.677·A  kcal/day;  F: 447.593 + 9.247·W + 3.098·H − 4.330·A   (PH/Energy 752–754)
TMR:  T < 34:           21·W^0.75 · 0.94^(34 − T)                     [W]                    (608–615)
      34 ≤ T < 36.8:     BMR + (21·W^0.75 − BMR)·(36.8 − T)/1.8, ≤ summit                  (617–624)
      36.8 ≤ T < 42.5:   TMR ← TMR + 1e-4·(BMR − TMR) per step                              (626–631)
      T > 40:            BMR · 1.11^(T − 40)                                                  (632–636)
Sweat [mg/min] = 347 + max(0, 0.25·h_sw/λ·(T − 37.1)) · f(BV fraction),  h_sw 0.20833 kcal/K/s, λ 2,260 kJ/kg   (668–679)
ATP rate = TMR / 7 kcal/mol;   local ATP = ATP · flow share · vol-factor (linear ↓ below 85 % of vascular volume)   (PH/Tissue 866–888)
RQ = min(1, 0.7 + 0.15·G_stored/G_rest);   F_carb = (RQ − 0.7)/0.3                                               (762–786)
w  = min(1, [O2]_tissue / [O2 at 40 mmHg])                                                                          (735, 889)
VO2  = [F_carb·w·6/38 + (1 − F_carb)·163/768]·ATP · (0.38 + 0.15·(TMR/BMR − 1))                                    (897–915)
VCO2 = [F_carb·w·6/38 + (1 − F_carb)·114/768]·ATP · (0.36 + work level)                                            (924–930)
Lactate = 0.5·0.6·(1 − w)·ATP;   glucose use = F_carb·ATP·(w/38 + (1 − w)/2)                                       (942, 957)
Insulin-dependent glucose uptake = 0.01·(1 − e^(−0.8·I[µg/L])) · G · Δt  (+ insulin-independent term)            (966–975)
Insulin synthesis [pmol/min] = 5.357·G[mg/dL] − 328.56  for G ≥ 80, else 0                                         (PH/Endocrine 119–134)
Epi release [µg/min] = 0.00229·W · (1 + 18.75/(1 + e^(−0.035·(ΔTMR_W − 190)))) + 30·stress severity (added to the multiplier)   (147–189)
NE release [µg/min] = 0.008974·W / epi exercise multiplier                                                        (153–175)
```

**Parameters.**

| Parameter | Value | Units | Source |
|---|---|---|---|
| Core temperature low / high / delta-low | 36.8 / 37.1 / 1.8 | °C | CFG 528–530 |
| Body specific heat | 0.83 | kcal/K/kg | CFG 526 |
| Skin mass fraction | 0.09 | — | SET 4575 |
| VCO2/VO2 constant | 0.8 | — | CFG 527 |
| Energy per ATP | 7 | kcal/mol | CFG 531 |
| Sweat heat transfer | 0.20833 | kcal/K/s | CFG 532 |
| Basal sweat | 347 | mg/min | PH/Energy 668 |
| Summit metabolism | 21·W^0.75 | W | PH/Energy 608 |
| Basal lactate production | 1.3 | mol/day | PH/Energy 110 |
| Basal ketone production | 300 (4.0e-3 → 12.0e-3 mmol/kg/min in starvation) | µmol/min | PH/Energy 112; PH/Tissue 788–789 |
| Creatinine production | 2.0e-5 | mg/s | PH/Tissue 1006 |
| Epinephrine basal / clearance / initial plasma | 0.00229 µg/kg/min / 68.66 mL/min/kg / 0.034 µg/L | — | PH/Endocrine 150; sub:Epinephrine; SUBM 798 |
| Norepinephrine basal / clearance / initial plasma | 0.008974 µg/kg/min / 55 mL/min/kg / 0.275 µg/L | — | PH/Endocrine 153; sub:Norepinephrine; SUBM 805 |
| Insulin initial plasma / clearance | 0.40656 µg/L (≈ 70 pmol/L) / 60 mL/min/kg | — | SUBM 846; sub:Insulin |
| Liver glucose release threshold | 85 | mg/dL | PH/Tissue 1041 |
| Hypothermia / hyperthermia events | < 35.0 / > 38.8 | °C | PH/Energy 528, 538 |

**Substances.** Glucose, insulin, epinephrine, norepinephrine, lactate, acetoacetate (ketones), tristearin (fat), creatinine,
O2, CO2; "Sweat" compound (Na 1.0, Cl 1.5, K 0.2, Ca 0.02 g/L per `M:tissue`).

**Validation Pulse cites.** https://pulse.kitware.com/_energy_methodology.html — resting core 37.1 °C, skin 32.9 °C, sweat
332 mg/min, TMR 1,737 kcal/day, lactate production 1.3 mol/day; cold-water immersion 10 °C for 1 h (11 good / 12 decent /
1 bad; the doc notes the core rewarms after removal when it should keep falling); exercise 45–430 W (76/3/33).
https://pulse.kitware.com/_endocrine_methodology.html — acute-stress trends only; insulin 0.5 vs 0.4 µg/L (27 % error,
64 % in F). https://pulse.kitware.com/_tissue_methodology.html — VO2 250, VCO2 204.5, RER 0.82. No glucose-tolerance,
insulin-bolus, hypothermia-under-anaesthesia or starvation validation (starvation is disabled).

**Candidate simplification for our tick model.**

| Keep / collapse | Decision |
|---|---|
| 2-node core/skin thermal circuit + environment | **Take** (it is Stage 3's heat model with better numbers). **Fix:** GA thresholds (vaso 34.5, shiver 33.5), vasoconstriction as a skin-flow factor on R_cs, drug effects on thresholds. |
| TMR vs temperature | **Take** the summit form 21·W^0.75 as the ceiling and 0.94/°C below 34 °C. **Ours:** Q10 7.5 %/°C on VO2 between 34 and 40 °C (D11), shiver VO2 ×2–3 typical. |
| Per-tissue ATP metabolism (11 tissues) | **Collapse** to one whole-body pool plus a brain term: VO2, VCO2 from RQ and F_carb; lactate from an O2-supply deficit (our `do2Crit`, `kAnaer`), not Pulse's per-tissue PO2 threshold, because Pulse's version did not raise lactate in shock (D2). |
| Insulin secretion line, epi/NE basal release and clearance | **Take.** Add stress/hypovolaemia/hypoglycaemia triggers for epinephrine (D16). |
| Glucose disposal | **Ours** (Bergman minimal model), using Pulse's insulin secretion as the I(t) input and Pulse's liver release rule for G < 85. |
| Cortisol, thyroid | **Ours** (Pulse has none). |

**Effort:** thermal 5–7 h · metabolism pool (VO2/VCO2/lactate/ketones) 4–6 h · endocrine (insulin, epi/NE) 4–6 h →
**13–19 h**.

**Port total 7c + 7d + 7e: 44–60 h** (R34 estimate 40–60 h).

---

## C. Known Pulse disagreements (encode these as expected differences in the oracle)

Each row: Pulse behaviour · our expected number · reason. **Oracle action:** `expect-differ` means the comparator asserts that
Pulse is *outside* our tolerance in the stated direction, so that a future Pulse fix is noticed. `exclude` means the channel is
not compared.

| # | Channel / scenario | Pulse | Ours (expected) | Reason | Oracle action |
|---|---|---|---|---|---|
| D1 | Arterial pH, 30 min untreated VF | 7.39 → **10.59** [M] | ≤ 7.10 (lactate 8–12 mmol/L, BE ≤ −12) | SID fixed at 40.5, so lactate never enters the solver (PH/BloodChemistry 91; SAT 106) | expect-differ (Pulse > 7.45) |
| D2 | Lactate in class III haemorrhage (35 %, 30 min) | ≈ flat 1.6 mmol/L [M] | 3–5 mmol/L | anaerobic switch only when tissue PO2 < 40 mmHg; clearance renal only | expect-differ |
| D3 | pH/BE after 2 L 0.9 % saline in 30 min | ΔpH ≈ 0, ΔBE ≈ 0 [E] | BE −3 to −5, Cl +6–8 | Cl not in SID | expect-differ |
| D4 | PEEP 5 → 15 (PCV, normovolaemic) | CO +0.5 %, CVP 0 [M] | CO −5 to −10 %, CVP +2–3 | no airway → pleural → venous-return coupling | expect-differ |
| D5 | PPV after 810 mL loss under PCV | 1.3 % [M] | > 13 % | same as D4 | expect-differ |
| D6 | CBF at PaCO2 40 → 30 | ≈ 0 % [code] | −30 % | no CO2 reactivity | expect-differ |
| D7 | CBF in TBI 0.6 / CPP 53 | 944 → 121 mL/min [M] | ≥ 70 % of baseline while CPP ≥ 50–60 | no autoregulation plateau | expect-differ |
| D8 | HR 150 s after propofol 2 mg/kg | 72 → 49 [M] | 65–75 (±10 %) | propofol HR modifier −0.2 | expect-differ |
| D9 | Propofol plasma t½ after 2 mg/kg bolus | slow; CL 3.0 mL/min/kg [code] | Eleveld: Cp −50 % by ≈ 3–5 min, context-sensitive | Pulse systemic CL ≈ ⅛ of literature | expect-differ (verify first run) |
| D10 | Plasma volume 30 min after 1 L crystalloid | expected ≥ 0.6 retained [E] | 0.2 retained (awake), 0.4–0.5 under GA | colloid-osmotic sources 0, lymph 0, R_t 20,000/m | expect-differ (measure first) |
| D11 | VO2 and shivering at core 33 °C under GA | shivers below 36.8; TMR up to ≈ 6.5 × BMR at 35 °C, then ×0.94/°C [code] | no shivering above 33.5 under GA; VO2 ≈ 0.70–0.75 × baseline (7.5 %/°C); drug clearance −30–40 % | no anaesthetic thresholds, no Q10, no temperature term on clearance | expect-differ |
| D12 | Baseline UOP | 0.71 mL/kg/h (M), 0.47 (F) [doc] | 1.0 awake; 0.6 under surgical stress | GFR 147.5 L/day vs 180; no ADH | expect-differ (M within ×0.7 ± 0.1) |
| D13 | Glycosuria onset | ≈ 370 mg/dL [E] | 180–200 mg/dL | glucose Tm with no splay | expect-differ |
| D14 | K reported in mmol/L | 5.0 (true 4.0) [code] | 4.2 | Pulse K molar mass 31.1 g/mol (sub:Potassium) | compare mg/L only |
| D15 | Hypocapnia events | fire on **PaO2** < 30/15 [code] | PaCO2 < 30 | variable mix-up at PH/BloodChemistry 382–395 | exclude Pulse hypocapnia events |
| D16 | Plasma epinephrine in haemorrhage | unchanged [code] | ×3–10 in class III | epi release only on exercise / AcuteStress | expect-differ |
| D17 | Sepsis condition | no effect [M] | §5e trajectories | not implemented in `stable`/`integration` | exclude (no sepsis oracle) |
| D18 | Baseline lactate | 1.65 mmol/L [doc] | 1.0 | initial 142.5 mg/L | compare Δ, not absolute |
| D19 | A–a gradient on air | 23 mmHg [doc] | 8–12 | baseline shunt/V/Q tuning | compare PaO2 Δ, not absolute |
| D20 | DO2 at rest | 1,277 mL/min (M) [doc] | ≈ 1,000 | CO 5.79 × CaO2 22 | compare Δ |
| D21 | Blood volume at BMI ≥ 35 | 72 mL/kg [E] | 50–57 mL/kg | no BMI term | use BMI 18.5–25 patients only |
| D22 | Lactate fall after resuscitation | ≪ ours; not quantified [code] | t½ ≈ 30 min | liver step adds glucose without removing lactate (PH/Tissue 1027–1029) | expect-differ |
| D23 | Ventilatory compensation of metabolic acidosis | none [code] | Winter's PaCO2 = 1.5·HCO3 + 8 | chemoreflex has no pH input | expect-differ |
| D24 | Plasma NE at 0.01 µg/kg/min | 0.76 µg/L [doc] | 0.36–0.61 (Pulse's own reference) | NE clearance/partition | compare haemodynamic Δ only |
| D25 | UOP fall in haemorrhage | pressure-only (no RAAS/ADH) [doc] | faster and deeper (ADH, sympathetic) | missing hormones | tolerance ×2 on UOP |

The three largest, by clinical consequence: **D1** (pH 10.6 in arrest, fixed SID), **D4/D5** (no heart–lung interaction:
PEEP and PPV), **D9** (propofol clearance ≈ ×0.12). By numeric factor the largest are D6/D7 (×0) and D9.

---

## D. Oracle harness sketch (packages/validation)

**Where the Pulse side lives now.** `research/pulse-spike/bench/` (`bench.cpp`: C-API driver used for native and wasm, 45
data requests, event capture; `det.cpp` determinism; `soak.cpp` 30-min VF; `bad.cpp` error handling; `drm.json` +
`gen_json.py` data-request manifest; `act_*.json` example actions; `vent_ppv.py` PEEP/PPV via the Python API;
`stabilize*.py`) and `research/pulse-spike/web/` (`worker.js`, `index.html`, `server.py`, `pulse.js` glue).
**Gap:** the preserved `web/` has `pulse.js` but **not** `pulse.wasm` or the `StandardMale@0s` state. Both still exist in the
disposable scratch tree (`…/scratchpad/pulse-spike/web/pulse.wasm`, `native/install/bin/states/`). Copy them, or regenerate
them with the C1 build script, before the scratch folder is wiped.

**Runner.** Node 26, wasm `stable` 4.3.2 built with `-fwasm-exceptions` (C1, C2), one engine per process, fixed 20 ms step,
start from the pre-stabilised StandardMale state (C4), actions validated against a whitelist (C3). Never benchmark or run it
inside an instrumented browser (spike §3.3). Every record carries the wasm build hash (spike §3.7).

**Shared scenario format.** `pme-scenario/1` plus a `pulse` block: a list of `{t_s, action}` in Pulse JSON (the
`act_*.json` shape), so one file drives both engines. The comparator reads `{channel, t_s, metric: abs|delta|ratio|time-to,
tol, expect: agree|expect-differ:<Dn>|exclude}`.

**Patient.** Our adult profile set to Pulse's StandardMale: 44 y, M, 77.1 kg, 180 cm, HR 72, BP 114/73.5, Hb 15, BMI 23.8.
Doses per kg use 77.1 kg.

| # | Scenario | Pulse actions (JSON names) | Outputs compared | Tolerance | Expected differences |
|---|---|---|---|---|---|
| O1 | Baseline stabilisation, 10 min | none (load state) | HR, MAP, SBP/DBP, CO, SV, CVP, PAP, PCWP, SaO2, PaO2, PaCO2, EtCO2, RR, VT, T, pH, HCO3, BE, Na, K (mg/L), Cl, glucose, Hb, Hct, BV, UOP, GFR, VO2, VCO2 | abs ±10 % (HR, MAP, CO ±5 %) | D12, D18, D19, D20 |
| O2 | 20 % haemorrhage (1,100 mL over 10 min), observe 30 min | `Hemorrhage` {Compartment RightLeg, Flow 110 mL/min} → Flow 0 at 10 min | HR, MAP, CO, SV, CVP, BV, Hb, UOP, lactate, pH, epinephrine | delta ±20 %; time-to-nadir ±20 % | D2, D16, D25 |
| O3 | 1 L crystalloid over 30 min (after O2 or at baseline) | `SubstanceCompoundInfusion` {Saline, BagVolume 1000 mL, Rate 33.3 mL/min} | BV and plasma volume at 0/30/60 min, CVP, CO, Hb (dilution), Cl, pH, BE, UOP | delta ±20 % | D3, D10 |
| O4 | Propofol 2 mg/kg (154 mg) | `SubstanceBolus` {Propofol, 10 mg/mL, 15.4 mL, IV} | MAP (nadir, time-to-nadir), HR, CO, RR, VT, SpO2, Cp at 1/2/5/10/30 min | MAP delta ±15 %; time ±30 % | D8, D9 |
| O5 | Norepinephrine 0.1 µg/kg/min for 20 min, then stop | `SubstanceInfusion` {Norepinephrine, 16 µg/mL, 0.48 mL/min} → Rate 0 | MAP, SBP, DBP, HR, CO, SVR, UOP; on/off τ | MAP delta ±20 %; τ ±50 % | D24 (plasma level), direction checks only for SVR |
| O6 | Apnoea 3 min after 5 min FiO2 1.0 (intubated, NMB) | `Intubation`; `MechanicalVentilatorPressureControl` FiO2 1.0; `SubstanceBolus` Rocuronium 70 mg; ventilator off at t0 | SaO2/SpO2, PaO2, PaCO2 (rise rate), pH, HR | PaCO2 slope ±25 %; SaO2 at 180 s ±3 points | none known; ours adds absorption atelectasis (§4.1) → PaO2 lower, flag if > 20 % |
| O7 | PEEP 5 → 15 (PCV, normovolaemic), 5 min each | `MechanicalVentilatorPressureControl` PEEP 5 → 15 (PIP 25) | CO, SV, MAP, CVP, PaO2, PaCO2, Crs, VT | ours vs H10 | D4 (+ D5 if run after O2) |
| O8 | FiO2 1.0 for 60 min (ventilated) | ventilator FractionInspiredGas O2 1.0 | PaO2, SaO2, shunt fraction, PaCO2, VT, Crs | PaO2 ±15 % at 5 min | ours: absorption atelectasis re-collapse (τ 5 min at ZEEP) → PaO2 falls; Pulse flat → expect-differ after 15 min |
| O9 | Hypothermia to core 33 °C (active cooling) under propofol infusion | `ThermalApplication` {ActiveCooling}; `SubstanceInfusion` Propofol | core/skin T, TMR/VO2, VCO2, HR, MAP, sweat, Cp(propofol) | T trajectory ±0.5 °C | D11 |
| O10 | Insulin/glucose: 75 g carbohydrate, then insulin 10 U IV | `ConsumeNutrients` {Carbohydrate 75 g}; `SubstanceBolus` Insulin (verify whitelist; Insulin has clearance but no PD block) | glucose peak, time-to-peak, return to baseline, insulin, K | glucose delta ±25 %; times ±30 % | ours Bergman vs Pulse phenomenological uptake; Pulse has no K shift → exclude K |
| O11 | Renal: MAP ≈ 60 for 2 h | `CardiovascularMechanicsModification` {SystemicResistanceMultiplier ≈ 0.55, Incremental} | RBF, GFR, UOP, afferent R, urine Na, creatinine, K, lactate | UOP delta ×(0.5–2); GFR delta ±25 % | D12, D25; measures Pulse's `rppZero` |
| O12 | Hepatic drug clearance: propofol 2 mg/kg + fentanyl 2 µg/kg, baseline vs 30 % haemorrhage | `SubstanceBolus` Propofol, Fentanyl; `Hemorrhage` | Cp(t) for both, AUC, liver flow, time to Cp −50 % | flow dependence: ratio (bleed/baseline) ±25 % | D9 (absolute CL), D11 (if cold) |

**Also run as guard rails (C7), not as comparisons:** `soak.cpp` 30-min VF (D1), massive haemorrhage 50 %, 10× propofol
overdose — assert no NaN, no crash, events fire.

**Comparator rules.** Compare truth (L1) values only, never L3 device values. Use deltas from each engine's own baseline for
channels flagged "compare Δ" in §C. Sample both engines at 1 Hz; per-beat values latched on `StartOfCardiacCycle`
(spike §4.1). Average Pulse UOP over 60 s (it is noisy, spike §5.1). CI: O1–O5 and O12 on every PR touching 7c–7e;
the rest nightly (≈ 7 simulated hours total ≈ 20 min wall at 22× real time).

**Effort:** ≈ 10 h (R34): runner + state packaging 3 h, scenario files 3 h, comparator + expected-difference table 3 h,
CI wiring 1 h.

---

## E. Licence hygiene and attribution

- **What this document contains:** numbers, equations and file/line references (facts), re-expressed. No Pulse code block
  is reproduced.
- **Ported files** (7c–7e TypeScript) carry, at the top:
  `SPDX-License-Identifier: Apache-2.0` and a header of the form "Portions derived from the Pulse Physiology Engine 4.3.2
  (commit e8a3649), `<Pulse file path>`, Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1,
  Copyright 2015 Applied Research Associates, Inc.; licensed under the Apache License, Version 2.0; modified: re-expressed
  in TypeScript and simplified for the monitor tick (see NOTICES N-00x)." One NOTICES row per ported module (R34).
- **NOTICE text to carry** (verbatim, in our NOTICES): Pulse's `NOTICE` paragraphs "This product includes software developed
  by Kitware, Inc. and Contributors … Pulse Physiology Simulation Engine, Copyright 2018-2025 Kitware, Inc. and Contributors,
  Distributed under the Apache License, Version 2.0 … a fork of the BioGears project, version 6.1.1 … (TATRC) award
  W81XWH-13-2-0068" and "This product includes software developed at Applied Research Associates, Inc. BioGears 6.1.1,
  Copyright 2015 Applied Research Associates, Inc. Licensed under the Apache License, Version 2.0 …". The Eigen, protobuf
  and abseil paragraphs are needed **only if the oracle's `pulse.wasm` is committed or distributed** (it links them); in
  that case carry the whole `NOTICE` file and a copy of `LICENSE`.
- **Trademark:** say "uses/derives from the Pulse Physiology Engine"; do not imply Kitware endorsement.
- **Data values** (substances, patients, configuration) come from `data/Data.xlsx` in the same Apache-2.0 repository.

---

## F. Sources

**Pulse code and data** (read on this Mac, 2026-09-25)
- Repository: https://gitlab.kitware.com/physiology/engine — `stable` = tag `REL_4_3_2`, commit
  `e8a36497b8ba78e788dc201a6baf74e1c297c56f` (2025-08-12); `integration` = `abd6aafda9e37a5e41c09d22812b288f4a8b0163`
  (2026-09-15). The integration branch still hard-codes SID 40.5 (`BloodChemistryModel.cpp` 100) and albumin 45 g/L
  (`TissueModel.cpp` 411), still has an empty `HepaticModel.cpp`, and adds a `TissueModel::Burn()` with albumin loss.
- Files read: `src/cpp/engine/PulseConfiguration.cpp`; `src/cpp/engine/common/controller/{SetupCircuitsAndCompartments,
  SubstanceManager}.cpp`; `src/cpp/engine/common/system/physiology/{BloodChemistry,Renal,Hepatic,Endocrine,Energy,Tissue,
  Drug,Nervous,Cardiovascular}Model.cpp`, `Saturation.cpp`; `src/schema/pulse/cdm/bind/{PatientActions,EnvironmentActions,
  PatientConditions}.proto`; generated `substances/*.json`, `substances/compounds/*.json`, `patients/StandardMale.json`,
  `states/StandardMale@0s.json` (configuration block); `data/Data.xlsx` (Configuration and Tissue sheets); `NOTICE`, `LICENSE`.

**Pulse methodology pages** (site documents 4.3.0; footer "Generated 2026-02-01 – 10710baa2"; all fetched 2026-09-25)
- Blood chemistry: https://pulse.kitware.com/_blood_chemistry_methodology.html
- Renal: https://pulse.kitware.com/_renal_methodology.html
- Endocrine: https://pulse.kitware.com/_endocrine_methodology.html
- Tissue: https://pulse.kitware.com/_tissue_methodology.html
- Energy: https://pulse.kitware.com/_energy_methodology.html
- Nervous: https://pulse.kitware.com/_nervous_methodology.html
- Cardiovascular: https://pulse.kitware.com/_cardiovascular_methodology.html
- Respiratory: https://pulse.kitware.com/_respiratory_methodology.html
- Drugs: https://pulse.kitware.com/_drugs_methodology.html
- Patient: https://pulse.kitware.com/_patient_methodology.html
- Hepatic: **no page** (`_hepatic_methodology.html` returns 404; absent from https://pulse.kitware.com/pages.html)
- Version: https://pulse.kitware.com/version.html

**Doc-versus-code discrepancies noticed** (the code is used in this annex): baroreflex response slope ν = 4 in the doc vs 12 in
`CFG` 596; afferent-resistance range 1.7–12.382 in the doc vs 2.2–11.2 in `CFG` 608–609; below-summit metabolic decline
0.96/°C in the doc equation vs 0.94 in `PH/Energy` 614; the doc presents the renal colloid-osmotic feedback as active,
but the code has it commented out (`PH/Renal` 566–567, 637).

**Project inputs:** `repo/docs/physiology/stage-7-parameter-tables.md` (draft 1); `research/07-pulse-feasibility-spike.md`;
`research/00-orchestrator-rulings.md` R32–R34; `research/pulse-spike/{bench,web}/`.

*End of draft 1.*
