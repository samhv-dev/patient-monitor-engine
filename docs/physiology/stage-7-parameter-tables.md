# Stage 7 parameter tables: whole-body modeled physiology (clinical review draft)

*Draft 1, 2026-09-25, for Ali's clinical review before any Stage 7 code is written (R22, R24, R28, R31, R32).*
*Scope: R22 profiles and comorbidities · R23 coronary supply/demand · R24 + R31 two-sided heart and pulmonary circuit · R31 lung physiology · R26 brain, kidney, liver · R32 blood/acid–base/electrolytes/fluids, endocrine/metabolism/thermoregulation, neuromuscular block and anaesthetic depth, system-level conditions · drug PK/PD (7g) · R28 device modules (7h, summary rows only).*

**What already exists and is not re-specified here.** Stage 2 (brief §4.2–4.3, `l2/hemo/params.ts`) owns the arterial 4-element Windkessel (`WK_R0` 1.05 mmHg·s/mL, `WK_C` 1.5 mL/mmHg, `WK_ZC`, `WK_L`), the pulmonary Windkessel (`PA_R0` 0.1, `PA_C` 4), ejection shape, site transfer, transducer, CVP a/c/v generator, pleth and NIBP. Stage 3 (brief §4.3–4.4, `l2/gas/params.ts`, `l2/resp/pipeline.ts`) owns the O2 store and ODC, two-compartment CO2 (C_f 6, C_s 55 mL/mmHg per 200 mL/min VCO2), the SpO2 device chain, the respiratory driver, the heat model, `gasPatient(profile)` and the `lungState` event (`complianceMlPerCmH2O`, `resistanceCmH2OPerLps`, `effort`, `autoPeepTendency`, `shunt`, `deadSpaceMl`, `frcMl`). Brief §4.9 owns `PatientState`, the pin/release semantics and the single-pump Guyton core that §2 below replaces. Every parameter in this document names the existing variable it drives, or a new Stage 7 variable, in the **Symbol** column (new variables are in `camelCase` and listed in §2.1).

---

## 0. How to review

Each row is **parameter · symbol · default · range · units · what it changes · source · tag · Q**. The **tag** says how far to trust the number: **[P]** a primary source was read this session (paper, guideline, label, manufacturer document); **[TXT]** a standard textbook or review value (Guyton & Hall, West, Miller, Kaplan, Braunwald) cited from memory or a secondary page; **[ENG]** an engineering choice made so the model behaves plausibly, with no single source, and tunable; **[VERIFY]** a number I believe but did not re-check against its source this session. Source keys (e.g. `RVAS2010`) resolve to URLs in §10; `B §x` is the design brief, `R03 §x` is research 03. **To correct a number**, strike it through and write yours beside it (`~~0.7~~ 0.6`), or reply with the row's symbol and the new value; a bare "OK" on a section approves every row in it. The **Q column** holds a number (`Q12`) pointing to §9, where the question is written out. Those are the places where the literature disagrees, where a value is [ENG], or where Iranian practice may differ. Your answer there overrides the default. Profile tables (§1.1–1.4) show one column per band instead of a single default, because the band is the default.

**The design choice underneath this document.** Stage 7 replaces the brief's single Frank–Starling pump with a **per-beat, two-sided ventricular–arterial coupling model**. Each ventricle's end-diastolic volume comes from its own end-diastolic pressure–volume relation (EDPVR) at its filling pressure. Its end-systolic volume comes from its end-systolic elastance (Ees, the contractility) against its effective arterial elastance (Ea, the afterload) [Sunagawa 1983, Suga]. This form gives Frank–Starling, contractility and afterload sensitivity as one mechanism. A failing ventricle (low Ees) is automatically afterload-sensitive, and the thin-walled RV (Ees ≈ 0.5) is automatically far more sensitive to PA pressure than the LV. The brief's `k_afterload = 1 − a·ΔMAP/MAP` then becomes a consequence rather than a parameter. Stage 2's Windkessels keep producing the waveforms from the per-beat SV. Nothing in L2 changes. **Please challenge this choice (Q1) before reviewing §2's numbers.**

---

## 1. Patient profile and comorbidity layer (R22)

A profile is `{ageY, sex, weightKg, heightCm, pregnancyWeeks?, conditions: [{id, severity}]}`. The engine resolves it in a fixed order: age band sets the base, then sex, then body size, then pregnancy, then each condition applies its **multipliers (×) and offsets (+)** in list order. Each result is clamped to the variable's physiological range. The resolved parameter set is shown to the instructor, and any value can still be pinned (B §4.9). `gasPatient()` (Stage 3) is replaced by this resolver; its tuned numbers are kept where noted.

### 1.1 Age bands

Bands: neonate (< 28 d), infant (1–12 mo), child (1–11 y), adolescent (12–17 y), adult (18–64 y), elderly (≥ 65 y). Stage 3's `ageBand()` has no adolescent band yet; this adds one. Values are interpolated linearly on age inside the child band [ENG].

| Parameter | Symbol | Neonate | Infant | Child | Adolescent | Adult (default) | Elderly | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Blood volume | `bvMlKg` → `bloodVolume` | 85–90 (preterm 90–105) | 75–80 | 70–75 | 70 | 70 M / 65 F | 60–65 | mL/kg | V_blood, stressed volume, Pmsf, haemorrhage class thresholds | R03 §8.9; Lemmens2006 | [TXT] | — |
| Stressed fraction of V_blood | `fStressed` | 0.25 | 0.25 | 0.25 | 0.25 | 0.25 (0.20–0.30) | 0.22 | — | Pmsf = Vs/C_sys | R03 §8.2; Schipke2003 | [TXT]/[ENG] | Q2 |
| Systemic venous compliance | `cSysMlMmHgKg` | 1.6 | 1.6 | 1.6 | 1.6 | 1.6 (1.4–1.9) → 110 mL/mmHg | 1.3 | mL/mmHg/kg | Pmsf, venous return, fluid responsiveness | R03 §8.2 (C_sys 100–130 in adults, scaled) | [ENG] | Q2 |
| Arterial compliance (Windkessel C) | `WK_C` × | ×W/70 (brief) | ×W/70 | ×W/70 | ×W/70 | 1.5 (young adult 1.6) | ×0.4–0.6 → 0.6–0.9 | mL/mmHg | pulse pressure, diastolic decay, ISH in elderly | B §4.2; R03 §8.9 | [TXT] | — |
| Systemic resistance | `WK_R0` × | ×70/W | ×70/W | ×70/W | ×70/W | 1.05 | ×1.1 | mmHg·s/mL | MAP at given CO | B §4.2 | [TXT] | — |
| Aortic PWV (drives `Zc`, radial PTT, PP amplification) | `pwv` | ~3–4 | ~4 | 4–5 | 5–6 | 6.2 (< 30 y), 6.5 (30s), 7.2 (40s), 8.3 (50s) | 10.3 (60s), 10.9 (≥ 70) | m/s | Zc ∝ PWV; R-wave→upstroke delay; radial PP amplification 1.5–1.7 young → 1.1–1.2 elderly | RVAS2010 (medians, normal-BP group); paediatric [ENG] | [VERIFY] adult table; [ENG] children | Q3 |
| Baroreflex vagal gain | `G_v` | 3–5 | 5–10 | 10–15 | 15–20 | 15 (7–25) | 5–8 | ms/mmHg | reflex HR change per mmHg; phenylephrine reflex bradycardia | R03 §8.4; DM-BRS (controls 7.5–15) | [TXT] adult; [ENG] paediatric | Q4 |
| Sympathetic gains | `g_hs`, `g_R`, `g_V`, `g_c` | ×0.7 (immature) | ×0.8 | ×1 | ×1 | 1 (brief values) | ×0.6 | × | tachycardic/vasoconstrictor compensation of hypovolaemia | B §4.9; [ENG] | [ENG] | Q4 |
| Response to hypoxaemia | `hypoxiaHrSign` | brady | brady | tachy → brady < 60 % | tachy | tachy | tachy, arrhythmia | — | chemoreflex HR direction | R03 §8.9 | [TXT] | — |
| Resting HR (awake) | `hrRest` | 140 (100–205) | 130 (100–190) | 120 → 85 | 75 (60–100) | 70 (60–100) | 65 (55–90) | bpm | SA set point | PALS; R03 §8.9 | [TXT] | — |
| Intrinsic HR (denervated; floor after autonomic block) | `hrIntrinsic` | — | — | — | 110 | 118 − 0.57·age | 118 − 0.57·age | bpm | HR under full vagal + β block, pacemaker-dependent fallback | IHR (Jose) | [TXT] | — |
| Max HR | `hrMax` | 220–230 | 220 | 210 | 205 | 208 − 0.7·age | 208 − 0.7·age | bpm | ceiling of sympathetic HR response | Tanaka2001 | [P] abstract | — |
| Stroke volume ceiling | `svMaxMlKg` | 1.5 | 1.4 | 1.3 | 1.2 | 1.1 (SV 70–80 at 70 kg) | 0.95 | mL/kg | Ees/EDPVR scale per body size (§2) | derived from CI 3–4 L/min/m² and HR | [ENG] | — |
| MAP set point (awake) | `MAP_set` | 40–50 (term; preterm ≈ GA in weeks) | 50–60 | 60–75 | 75–85 | 85–95 | 90–100 | mmHg | baroreflex target; GA resets it by −10–20 % | PALS; B §4.9 | [TXT] | Q5 |
| FRC awake supine | `frcMl` | 25–30 | 25–30 | 30 | 30 | 30 (Stage 3) | 30, but closing capacity > FRC supine from ~44 y | mL/kg IBW | O2 store, atelectasis susceptibility | R03 §8.9; BJAEd-closing | [TXT] | — |
| FRC under GA | `frcGaMl` | 8 | 8 | 8 | 15 | 20 (Stage 3 tuned) | 20 | mL/kg IBW | apnoea desaturation time | Stage 3 decision 4 (tuned to Benumof, Patel) | [ENG] | Q6 |
| VO2 awake | `vo2MlKgMin` | 6–8 (7) | 5–7 (6) | 4–6 (5) | 3.5–4.5 | 3.5 | 2.5–3 | mL/kg/min | O2 consumption, CO2 production (RQ 0.8), desaturation speed | R03 §8.9 | [TXT] | — |
| Anatomical dead space | `vdAnatMlKg` | 2.2 (+ apparatus, relatively large) | 2.2 | 2.2 | 2.2 | 2.2 | 2.2–2.5 | mL/kg IBW | alveolar ventilation, EtCO2 | B §4.4 | [TXT] | — |
| Baseline shunt/venous admixture | `shunt0` | 0.05–0.10 (+ ductal/PFO right→left possible) | 0.04 | 0.03 | 0.03 | 0.03 (0.02–0.05) | 0.05–0.08 (PaO2 ≈ 100 − 0.3·age on air) | fraction | SaO2 on air | B §4.9; [TXT] | [TXT]/[ENG] | Q7 |
| Respiratory system compliance (intubated) | `crsMlCmH2OKg` | 1.0–1.5 | 1.0–1.5 | 1.0–1.5 | 0.8 | 0.7 (50 mL/cmH2O at 70 kg; Stage 3) | 0.6 | mL/cmH2O/kg IBW | `lungState.complianceMlPerCmH2O`, Paw | Stage 3 `gasPatient`; [TXT] | [TXT] | — |
| Airway + tube resistance | `raw` | 30–50 (ETT 3.0) | 20–30 (ETT 3.5–4) | 15–25 | 10–12 | 10 (ETT 7–8) | 10–12 | cmH2O/L/s | `lungState.resistanceCmH2OPerLps`, peak–plateau gap, τ | Stage 3; [TXT] | [TXT]/[ENG] | — |
| Core temperature set point | `tempSet` | 37.0 (poor heat conservation: surface/mass ×3, non-shivering thermogenesis only) | 37.0 | 37.0 | 37.0 | 37.0 | 36.8; vasoconstriction threshold ~1 °C lower under GA | °C | heat model (Stage 3), §5c | Stage 3; [TXT] | [TXT] | — |
| Hb default | `hb` | 17 (14–20) | 11 (at 2–3 mo nadir 9–11) → 12 | 12.5 | 13.5 | 15 M / 13.5 F | 13.5 M / 13 F | g/dL | O2 content, DO2, viscosity | [TXT] | [TXT] | — |

### 1.2 Sex

| Parameter | Symbol | Default (F relative to M) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Blood volume per kg | `bvMlKg` | 65 vs 70 | 60–70 | mL/kg | V_blood | Lemmens2006 | [P] abstract | — |
| LVET regression | brief §4.2 | 418 − 1.6·HR vs 413 − 1.7·HR | — | ms | ejection time, diastolic fraction | Weissler (R03 §11) | [P] | — |
| QTc offset | Stage 5 | +10–20 | 0–25 | ms | ECG QTc; drug-induced TdP susceptibility | [TXT] | [TXT] | — |
| Hb | `hb` | 13.5 vs 15 | 12–16 | g/dL | CaO2 | [TXT] | [TXT] | — |
| LV size at equal BSA | `svMaxMlKg` × | 0.9 | 0.85–0.95 | × | SV ceiling | [TXT] | [ENG] | — |
| Arterial stiffness | `pwv` × | 0.95 below 50 y, 1.0–1.05 after menopause | — | × | Zc, PP | RVAS2010 | [VERIFY] | — |

### 1.3 Body size and BMI class

Body-size rules. IBW (Devine, Stage 3) sets dead space, VT, FRC and respiratory compliance. Adjusted body weight (IBW + 0.4·excess) sets VO2, as in Stage 3. Blood volume uses Lemmens: `bvMlKg = 70/√(BMI/22)` × actual weight. Stage 3 used the adjusted weight for blood volume; Lemmens is the published rule. Total body weight (TBW) or lean body weight (LBW) sets drug dosing per §6.

| Parameter | Symbol | < 18.5 | 18.5–25 (default) | 25–30 | 30–35 (I) | 35–40 (II) | ≥ 40 (III) | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Blood volume index | `bvMlKg` | 70–75 | 70 | 65 | 60 | 57 | 50–55 | mL/kg actual | V_blood | Lemmens2006 | [P] abstract | — |
| FRC factor (awake and GA) | `frcFactor` | 1.0 | 1.0 | 0.9 | 0.75 | 0.65 | 0.5 (floor 0.4) | × | desaturation time (Benumof obese 2.7 min) | Stage 3 (−3.5 %/BMI point > 25, tuned); Pelosi 1998 [VERIFY] | [ENG] | Q8 |
| Atelectasis after induction | `atelInduction` × | 1.0 | 1.0 | 1.2 | 1.5 | 1.8 | 2.0 | × on §4.1 shunt | shunt under GA, PEEP responsiveness | Hedenstierna (§4) | [ENG] | — |
| Respiratory compliance | `crs` × | 1.0 | 1.0 | 0.95 | 0.85 | 0.75 | 0.65 | × | Paw, lungState | Pelosi 1998 [VERIFY] | [VERIFY] | — |
| Resting CO | `co` × (via VO2 and V_blood) | 0.95 | 1.0 | 1.05 | 1.15 | 1.25 | 1.35 | × | emerges from VO2 and blood volume | [TXT] | [ENG] | — |
| OSA/OHS prior | adds condition `osa` | — | — | — | 0.3 | 0.5 | 0.7 | probability | only if the instructor ticks "assume undiagnosed OSA" | [ENG] | [ENG] | Q9 |

### 1.4 Pregnancy (by trimester; `pregnancyWeeks`)

| Parameter | Symbol | T1 (≤ 13 wk) | T2 (14–27) | T3 / term (default at 38 wk) | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|---|
| Blood volume | `bvMlKg` × | 1.10–1.15 | 1.30 | 1.40–1.50 | × | V_blood; tolerates 1–1.5 L loss before tachycardia | Soma-Pillay2016 (+45 %) | [P] | — |
| Hb (dilutional) | `hb` | 12.5 | 11.5 | 11.5–12 | g/dL | CaO2 | [TXT] | [TXT] | — |
| CO | emergent; check | +20 % | +35–45 % | +40–50 % | vs non-pregnant | via HR, V_blood, SVR | Soma-Pillay2016 (+~40 %) | [P] | — |
| HR | `hrRest` + | +5–10 | +10–15 | +15–20 | bpm | SA set point | Soma-Pillay2016 (+10–20) | [P] | — |
| SVR | `WK_R0` × | 0.85 | 0.70–0.75 (nadir) | 0.75–0.80 | × | MAP −5–10 mid-pregnancy, back near baseline at term | Soma-Pillay2016 (SVR −25–30 %) | [P] | — |
| Colloid osmotic pressure | `copPlasma` | 23 | 22 | 21–22 (post-partum 16–17) | mmHg | lowers the pulmonary-oedema threshold (§2) | [TXT] | [VERIFY] | Q10 |
| FRC | `frcFactor` × | 1.0 | 0.9 | 0.80 (−20 %) | × | faster desaturation; closing capacity may exceed FRC supine | Soma-Pillay2016 (FRC ↓, no figure); −20 % [TXT] | [TXT] | — |
| VO2 | `vo2` × | 1.05 | 1.15 | 1.20–1.30 | × | desaturation speed | Soma-Pillay2016 (+20 %) | [P] | — |
| Minute ventilation → PaCO2 target | `paco2Set` | 35 | 32 | 30–32 | mmHg | chemoreflex set point; HCO3 18–22 (MV +40–50 %) | Soma-Pillay2016 | [P]/[TXT] | — |
| Aortocaval compression (supine, > 20 wk) | `acc` | 0 | 0.1 | 0.25–0.30 (occasional 0.5 with bradycardia) | fraction of CO lost | cuts venous return (R_vr ↑ and V0 ↑); relieved at left tilt ≥ 15° | Soma-Pillay2016 (supine CO −25 %); ACC-tilt | [P] | Q11 |
| MAC reduction | `macFactor` | 0.75 | 0.70 | 0.70 (−25–40 %) | × | §5d depth index | [TXT] | [VERIFY] | — |

### 1.5 Comorbidities

A severity of 0–1, or a named grade, scales each multiplier. At severity 0 a multiplier is 1; at the stated grade it takes the listed value. Condition IDs are stable strings used in the profile JSON and in scenarios.

| Condition (grade) | Symbol(s) touched | Default at stated grade | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| **HFrEF** (EF 30 %) `hfref` | `eesLV` ×; `betaLV` ×; `bloodVolume` ×; `G_v` ×; `MAP_set`; `lvedp0` | Ees ×0.45; β ×1.3; V ×1.10; G_v ×0.5; MAP_set 75; LVEDP 15–20 | Ees ×0.3–0.7 (EF 20–40 %) | × / mmHg | low SV, afterload-sensitive (emerges), high PCWP, PEEP improves oxygenation but costs CO | ESC HF 2021 [TXT]; B §4.9 (a 0.4–0.6) | [TXT]/[ENG] | Q12 |
| **HFpEF** `hfpef` | `betaLV` ×; `WK_C` ×; `afHazard` | β ×2–3 (LV stiffness constant 0.03 vs 0.01–0.018 /mL); C ×0.7; LVEDP 16–25 | β ×1.5–3 | × | steep EDPVR: flash oedema with fluid, tachycardia and AF intolerance, big BP swings with volume | Zile2004; HFpEF-PV | [P] abstract (β) | Q12 |
| **Hypertension** (treated / untreated) `htn` | `MAP_set` +; `WK_C` ×; `WK_R0` ×; `G_v` ×; `betaLV` ×; `cbfLowerLimit` +; `renalLowerLimit` + | +10 / +20 mmHg; C ×0.7; R ×1.2; G_v ×0.6; β ×1.3 (LVH); CBF autoregulation lower limit +15–20; renal +10 | MAP_set +5–30 | mmHg, × | larger induction fall (40 % vs 30 %), earlier cerebral/renal hypoperfusion at a given MAP, subendocardial ischaemia sooner | R03 §8.4; OA-CBF (right shift) | [TXT]/[ENG] | Q13 |
| **CAD**: none / 1–2-vessel stable / 3-vessel or LM / recent MI (< 30 d) `cad` | `cfr` (§3); `territory` | coronary flow reserve `cfr` 3.5 / 2.0 / 1.4 / 1.4, plus Ees ×0.8 after MI; ischaemia starts when demand exceeds the CFR-limited supply (§3) | CFR ±0.3 | × | when ST change and contractility decay begin (§3) | §3; SEVR-PMC11009993 | [ENG] anchored | Q14 |
| **Aortic stenosis**: mild / moderate / severe / critical `as` | `ava`; `betaLV` ×; `ejectSkewAS` | AVA > 1.5 / 1.0–1.5 / 0.7 / 0.5 cm²; β ×1.0 / 1.3 / 1.6 / 2.0 | AVA 0.4–2.0 | cm² | fixed-orifice gradient (Gorlin), SV limited, slow upstroke (κ ≈ 0.6, longer LVET), high LV systolic pressure → demand | ACC/AHA 2020 (§2); B §4.2 | [TXT] (grading), [ENG] (β) | Q15 |
| **Aortic regurgitation**: mild / moderate / severe `ar` | `rfAR`; `eddvLV` ×; `betaLV` × (acute) | RF 0.2 / 0.35 / 0.55; chronic LV EDV ×1.3–1.8 (eccentric, compliant); acute: β ×1 but LVEDP ↑↑ | RF 0–0.7 | fraction | wide PP, low DBP (coronary supply ↓), bradycardia worsens it | ACC/AHA 2020 | [TXT] | — |
| **Mitral regurgitation**: mild / moderate / severe; chronic vs acute `mr` | `rfMR`; `cLA`; `eroa` | RF 0.2 / 0.4 / 0.55; C_LA chronic 8–15 vs acute 2–3 mL/mmHg | RF 0–0.75 | fraction, mL/mmHg | forward SV ↓, v-wave (big in acute), PCWP ↑ → oedema; vasodilators lower RF | ACC/AHA 2020; §2 | [TXT]/[ENG] | Q16 |
| **Mitral stenosis**: mild / moderate / severe / very severe `ms` | `mva` | MVA 2.0 / 1.6 / 1.2 / 0.9 cm² | 0.6–2.5 | cm² | transmitral gradient ∝ (flow/diastolic time)² → LAP ↑ with HR; AF common; PH | ACC/AHA 2020 | [TXT] | — |
| **AF history** paroxysmal / permanent `af` | `rhythm`; `afHazard`; `laSize` | paroxysmal: hazard of AF on catecholamine/stretch ×5; permanent: rhythm AF at `ventRate` 80 | — | — | k_rhythm 0.75–0.85 (B §4.8); AF onset under stress | B §4.8; [ENG] | [ENG] | — |
| **Pacemaker-dependent** `pmDependent` | `underlyingRhythm`; `pmMode`; `magnetRate` | underlying CHB escape 30–35 or asystole; DDD 60; magnet → DOO/VOO at the vendor rate (e.g. 85–100) | — | bpm | loss of capture → true underlying rhythm; diathermy inhibition; §8 | R28; [TXT] | [TXT]/[VERIFY] | Q17 |
| **Beta-blocked** (chronic) `betaBlocked` | `hrRest`; `g_hs` ×; `g_c` ×; `betaResp` × | HR 55–65; g_hs ×0.4; g_c ×0.5; β-agonist response ×0.5 | g_hs ×0.2–0.7 | × | blunted tachycardia in haemorrhage (HR stays < 100 in class III), ephedrine weaker | BB-haem; [TXT] | [TXT]/[ENG] | Q18 |
| **Diabetic cardiac autonomic neuropathy** `dan` | `G_v` ×; `g_hs`, `g_R`, `g_V` ×; `hrRest`; `silentIschaemia` | G_v ×0.3 (BRS 3.5–5 vs 7.5–15 ms/mmHg); sympathetic gains ×0.4; resting HR 90–100, fixed | G_v ×0.2–0.6 | × | exaggerated induction hypotension, no reflex HR change; ST changes without pain cue | DM-BRS; Burgos1989 | [P] abstract (BRS) | — |
| **COPD** GOLD 1 / 2 / 3 / 4 `copd` | `raw` ×; `tauSlow`; `fSlow`; `vdPhysFrac`; `shuntVQ`; `crs` ×; `co2Slope` ×; `pvr` ×; `hb`; `paco2Set` | R ×1.3 / 1.8 / 2.5 / 3.5; VD/VT 0.35 / 0.40 / 0.50 / 0.60; V/Q admixture 0.05 / 0.08 / 0.12 / 0.15; C ×1.1–1.3 (emphysema); CO2 slope ×1 / 0.8 / 0.6 / 0.4; PVR ×1 / 1 / 1.3 / 2; PaCO2 40 / 40 / 45 / 55 (HCO3 compensated) | per grade ±30 % | × / fraction | auto-PEEP, shark-fin capnogram, wide Pa–EtCO2 gap, hypotension with high RR, slow CO2 washout | COPD-VQ; COPD-VD; §4 | [TXT]/[ENG] | Q19 |
| **Asthma** controlled / poorly controlled / severe `asthma` | `bronchoReactivity`; `raw` × | probability of bronchospasm at airway instrumentation 0.02 / 0.1 / 0.2; baseline R ×1 / 1.3 / 1.6 | — | probability | spontaneous bronchospasm events at intubation or light anaesthesia | Asthma-BJA (≈2 % in controlled asthma) | [P] abstract | Q20 |
| **OSA** mild / moderate / severe `osa` | `uaCollapse`; `opioidSens` ×; `pvr` ×; `MAP_set` + | upper airway obstructs when sedated at depth index < 80 / 85 / 90 (others < 60); opioid ventilatory C50 ×0.8 / 0.7 / 0.6; PVR ×1 / 1.1 / 1.3 | — | — | obstruction and desaturation under sedation, PACU opioid apnoea | OSA-PH (PH 15–80 %); OSA-opioid | [TXT]/[ENG] | Q9 |
| **Chronic hypovolaemia / dehydration** `dehydrated` | `bloodVolume` ×; `hrRest` +; `na` | V ×0.90 (mild) / 0.85 (moderate); HR +10; Na 145–150 | V ×0.8–0.95 | × | bigger induction drop, PPV > 13 %, oliguria | [TXT] | [ENG] | — |
| **Sepsis**: SIRS / sepsis / septic shock warm / cold `sepsis` | see §5e | — | — | — | — | §5e | — | — |
| **CKD 3–5 / dialysis** `ckd` | `k`; `hb`; `bloodVolume` ×; `hco3`; `betaLV` ×; `clearRenal` ×; `avFistula` | K 5.0 (4.5–6.0 pre-dialysis); Hb 10; V ×1.05–1.10 pre-dialysis, ×0.95 just after; HCO3 20; β ×1.3; renal drug clearance ×0.3; fistula CO +10 %, SVR ×0.9 | — | — | hyperK ECG sooner (sux +0.5), oedema threshold lower (fluid overload), post-dialysis hypotension | CKD-BJAEd | [P] abstract | — |
| **Hypothyroid** `hypothyroid` | `hrRest` ×; `eesLV` ×; `WK_R0` ×; `bloodVolume` ×; `vo2` ×; `co2Slope` ×; `clearHepatic` × | HR ×0.85; Ees ×0.85; R ×1.4; V ×0.9; VO2 ×0.8; CO2 slope ×0.7; clearance ×0.8 | myxoedema: HR 40–50, T 34–35, hypoventilation | × | CO −30–50 %, DBP ↑, sensitivity to depressants | Klein2007; MDCJ-hypo (CO −30–50 %) | [TXT] | — |
| **Anaemia** mild / moderate / severe / critical `anaemia` | `hb`; `WK_R0` ×; `p50` +; `co` (emergent) | Hb 11 / 9 / 7 / 5.5; chronic: R ×0.9 / 0.85 / 0.75 / 0.65; P50 +2 / +3 / +4 / +5 mmHg (2,3-DPG) | Hb 4–12 | g/dL | CaO2 ↓, DO2 ↓, SpO2 unchanged, ischaemia sooner in CAD, CO ↑ only when Hb < ~7 | Anaemia-OA; Anaemia-Circ1953 | [TXT] | Q21 |
| **Smoker** light / heavy / just smoked `smoker` | `cohb`; `bronchoReactivity` + | COHb 3 / 6 / 8–10 %; reactivity +0.02 | 1–15 % | % | true CaO2 and SaO2 fall by COHb; displayed SpO2 over-reads ≈ 1.06·COHb − 2.5; ODC shifts left; COHb t½ 4–6 h on air, ~1 h on O2 | COHb (8855058) | [P] abstract | Q22 |
| **Chronic pulmonary hypertension** (mPAP > 20, PVR > 2 WU) mild / moderate / severe `ph` | `pvr` ×; `eesRV` ×; `betaRV` × | PVR 3 / 5 / 10 WU; RV Ees ×1.3 / 1.6 / 2.0 (adapted hypertrophy); β_RV ×1.3 | PVR 2–15 WU | WU, × | RV afterload crisis with hypoxia, hypercapnia, acidosis, light anaesthesia; vasodilation → RV ischaemia spiral | ESC/ERS 2022 PH (§2) | [TXT] | Q23 |
| **RV failure** (chronic) `rvFailure` | `eesRV` ×; `rfTR`; `cvp0` | Ees_RV ×0.5; TR RF 0.3; CVP 12–18 | Ees ×0.3–0.7 | × | fixed low CO, septal shift (interdependence), hepatic congestion (clearance ×0.7) | §2 | [TXT]/[ENG] | — |


---

## 2. Two-sided heart and pulmonary circuit (R24 + R31; sub-stage 7a)

### 2.1 Compartments and new state variables

```
systemic arteries  (Stage 2 4-element Windkessel: WK_R0, WK_C, Zc, L — unchanged; supplies P_ao(t))
   → systemic veins  vSv   [P_sv = (vSv − v0Sv)/cSv]                    stressed volume → Pmsf
   → right atrium    vRa   [P_ra = eRa(t)·(vRa − v0Ra)]                  CVP = P_ra (+ Stage 2 a/c/v shape)
   → RV              vRv   [diastole: EDPVR_RV; beat: ESPVR_RV]          tricuspid R_tv, TR fraction rfTR
   → pulmonary arteries (Stage 2 pulmonary Windkessel PA_R0 → pvr, PA_C) PAP
   → pulmonary veins + LA  vPv, vLa  [P_la = (vLa − v0La)/cLa]           LAP; PCWP = P_la (+ a/v waves)
   → LV              vLv   [diastole: EDPVR_LV; beat: ESPVR_LV]          mitral R_mv (MS), MR fraction rfMR
   → aorta (AS: aortic valve area ava; AR: diastolic back-leak rAR)
pericardium: pPeri = A_p·(exp(λ_p·(vLv + vRv + vFluid − v0Peri)) − 1), ≥ 0; added to both ventricles' and atria's
             diastolic pressures (interdependence, tamponade)
thorax:      pIt = pPl0 + tIt·(Paw − PEEP_ref) + pPtx       added to every intrathoracic chamber (RA, RV, PA, PV, LA, LV);
             tIt = E_cw/(E_cw + E_L), the fraction of airway pressure that reaches the pleura
```

**Integration.** Diastolic filling runs as an ODE at 200 Hz (5 ms) [ENG]. Each ventricle fills through its inflow valve: `dV/dt = (P_atrium − P_vent,diast(V))/R_inflow` while the valve is open. An atrial kick is an elastance pulse on `eRa`/`eLa` that starts 80 ms after P onset and lasts 100 ms. It is absent in AF, and in a junctional or VVI rhythm the atrium contracts at the wrong time. Filling time, the atrial kick and the MS gradient therefore **emerge**. The ENG `f_fill(RR)` of brief §4.8 is no longer applied in MODELED mode: the engine divides the rhythm engine's `kSV` by `f_fill` and keeps only k_rhythm × PESP (engineering note, not a clinical question). Ejection is resolved **once per mechanical beat** (Stage 5 beat event):

```
Ea_sys = WK_R0 / (t_s + τ·(1 − exp(−t_d/τ))),  τ = WK_R0·WK_C       # Sunagawa 3-element effective arterial elastance
Ea_eff = Ea_sys·(1 − RF_MR) + ΔP_AS(SV)/SV                          # MR opens a low-impedance path; AS adds valve loss
SV_tot = (EDV − V0)·Ees·kContr / (Ees·kContr + Ea_eff)              # ventricular–arterial coupling
ΔP_AS  = (Q̄_ej / (44.3·AVA))²,  Q̄_ej = SV_tot/LVET (mL/s)            # Gorlin, iterated 2–3×
SV_fwd = SV_tot·(1 − RF_MR);   RVol_MR → vLa during systole  → v-wave = RVol_MR/cLa
RF_MR  = rfMR0 · sqrt(P_LVsys/P_LVsys,ref)                            # regurgitation grows with afterload   [ENG]
RV: the same with Ea_pulm from PA_R0/PA_C (pvr), rfTR into vRa
Stage 2 then receives SV_fwd (LV) and SV_RV as the ejection volumes; its waveform code is unchanged.
AR: continuous diastolic back-flow Q_AR = (P_ao − P_LV)/rAR into the LV (wide PP, low DBP, LV volume load).
MS: R_mv from Gorlin with discharge 0.85 (constant 37.7): ΔP_MV = (Q_diast/(37.7·MVA))² → P_la rises with HR.
```

**Per-beat solve order** (at each mechanical beat, then continuous between beats):
1. Read `pIt` (Stage 3 Paw/VentFrame + pneumothorax), `vFluid`, the drug/baroreflex multipliers, and the ischaemia state (§3).
2. EDV_RV and EDV_LV are the current ventricular volumes (they came from the filling ODE). Recompute `pPeri`; if it moved more than 1 mmHg, re-solve the last 20 ms of filling (one interdependence pass).
3. RV ejection (Ea_pulm, rfTR) and LV ejection (Ea_eff with AS/MR), as above.
4. Move the volumes: RV → PA Windkessel input; LV SV_fwd → aortic Windkessel; RVol_MR → LA; TR → RA.
5. Publish per beat: `sv` (forward LV), `svRv`, `lvedp`, `lvedv`, `ef`, `lvsp` (= P_ao,sys + ΔP_AS); at 1 Hz: `cvp`, `papSys/Dia/Mean`, `pawp` (= mean LAP), `co`, `svr`, `pvr`.
6. At 10 Hz between beats: venous return `(P_sv − P_ra)/R_vr`, pulmonary venous drainage, lung-water ODE, baroreflex, coronary (§3), HPV (§4).

PAP and PCWP are now **outputs**, replacing brief §4.9's "[ENG: scaled from CO and RAP]" (R24).

### 2.2 Parameter table (adult 70 kg; scale volumes and compliances by W/70, resistances by 70/W)

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| LV end-systolic elastance (contractility) | `eesLv` | 2.3 | 1.5–3.0 (Smith model 2.88); HFrEF 0.5–1.2 | mmHg/mL | SV, EF, afterload sensitivity | Smith2004; [TXT] human 2.0–2.5 | [P] model / [VERIFY] human | Q24 |
| LV V0 (ESPVR intercept) | `v0Lv` | 5 | 0 (Smith) – 15 | mL | ESV floor | Smith2004 | [P]/[ENG] | Q24 |
| LV EDPVR scale | `aLv` | 0.12 | 0.1–0.5 | mmHg | LVEDP at a given EDV | Smith2004 (P0 0.1203) | [P] | — |
| LV EDPVR stiffness | `betaLv` | 0.033 | 0.01–0.02 (normal human), 0.03 (HFpEF, Zile); Smith 0.033 | /mL | steepness of the filling-pressure rise; HFpEF, LVH, AS, ischaemia (↑) | Smith2004; Zile2004 | [P] | Q24 |
| RV end-systolic elastance | `eesRv` | 0.585 | 0.4–0.8; adapted PH 1.0–1.2; RV infarct 0.2–0.3 | mmHg/mL | RV SV; afterload sensitivity (Ea_pulm/Ees_RV ≈ 0.5–1 normal) | Smith2004 | [P] | — |
| RV EDPVR scale / stiffness | `aRv`, `betaRv` | 0.216 / 0.023 | ±30 % | mmHg, /mL | CVP for a given RV volume | Smith2004 | [P] | — |
| Pericardial P–V | `A_p`, `λ_p`, `v0Peri` | 0.5 mmHg, 0.03 /mL (Smith), **v0Peri = 1.15 × (baseline LVEDV + RVEDV) + 20 ≈ 320 mL** | λ 0.02–0.04; chronic effusion: v0Peri grows (1–2 L tolerated) | — | tamponade at ~150–200 mL acute fluid; interdependence | Smith2004 (V0 200 mL, no fluid term); [ENG] reserve | [P]/[ENG] | Q29 |
| Systemic venous compliance | `cSv` | 110 | 100–130 | mL/mmHg | Pmsf 7–12 | R03 §8.2 | [TXT] | Q2 |
| Resistance to venous return | `rVr` | 0.084 (1.4 mmHg·min/L) | 0.07–0.1 | mmHg·s/mL | venous-return slope | R03 §8.2 | [TXT] | — |
| RA passive elastance | `eRa` | 0.3 (C 3.3 mL/mmHg) | 0.15–0.5 | mmHg/mL | CVP a/v amplitudes, TR v-wave | [ENG] | [ENG] | — |
| LA compliance | `cLa` | 4 (normal); chronic MR 10–15; acute MR 2 | 2–15 | mL/mmHg | v-wave = RVol/C_LA: acute MR 40 mL → +20 mmHg | [TXT] (Braunwald) | [ENG] numbers | Q26 |
| Pulmonary venous compliance | `cPv` | 10 | 6–15 | mL/mmHg | LAP change per mL shifted; oedema speed | [ENG] | [ENG] | — |
| PVR | `pvr` = `PA_R0` | 0.1 mmHg·s/mL = 1.7 WU (normal ≤ 2 WU; mPAP 14 ± 3.3) | 0.05–0.15 normal; PH 3–15 WU | mmHg·s/mL | PAP; RV afterload | ESC2022-PH (review) | [P] | — |
| Valve resistances (open) | `rMv`, `rTv`, `rAv`, `rPv` | 0.016, 0.024, 0.018, 0.006 | — | mmHg·s/mL | tiny normal gradients | Smith2004 | [P] | — |
| Aortic valve area | `ava` | 3.0 | severe ≤ 1.0 (Vmax ≥ 4 m/s, mean gradient ≥ 40); critical 0.5 | cm² | ΔP_AS, LVSP, SV ceiling | ACC/AHA 2020 (via summary); Gorlin-PMC11308807 | [TXT] grading; [P] Gorlin | Q15 |
| MR regurgitant fraction at reference afterload | `rfMR0` | 0 | severe ≥ 0.5 (RVol ≥ 60 mL, EROA ≥ 0.40 cm²) | fraction | forward SV, LAP, v-wave | ASE2017 | [P] | Q16 |
| AR regurgitant fraction | `rfAR` → `rAR` fitted | 0 | severe ≥ 0.5 (RVol ≥ 60, **EROA ≥ 0.30**) | fraction | DBP, PP | ASE2017 | [P] | — |
| Mitral valve area | `mva` | 4.5 | severe ≤ 1.5 | cm² | LAP with HR | ACC/AHA 2020 (via summary); Gorlin 37.7 | [TXT] | — |
| Tricuspid regurgitant fraction | `rfTR` | 0 | 0–0.6 | fraction | CVP v-wave, forward RV SV | [ENG] | [ENG] | — |
| Airway→pleural transmission | `tIt` | 0.4 | 0.2 (ARDS, stiff lung) – 0.7 (obesity, IAH, stiff chest wall) | fraction | venous return fall with PEEP/Paw; replaces R29's "10 cmH2O threshold" and brief's "30–50 %" | Gattinoni oesophageal-pressure concept [TXT] | [TXT] | Q28 |
| Resting pleural pressure (supine) | `pPl0` | −4 | −6 to −2 | mmHg | transmural filling pressures | Smith2004 (P_th −4) | [P] | — |
| Pulmonary capillary pressure | `pCap` | PCWP + 0.4·(mPAP − PCWP) | coefficient 0.3–0.5 | mmHg | oedema driving pressure | Gaar equation [TXT] | [TXT] | — |
| Oedema threshold (acute) | `pOedema` | plasma COP − 2 ≈ 23 (normal albumin); chronic HF +10–20 (lymphatic adaptation) | 18–25 acute; 30–45 chronic | mmHg | onset of lung-water accumulation (R24 threshold 18–25) | Guyton & Hall [TXT] | [TXT] | Q25 |
| Lung-water filtration | `kfLung` | EVLWI +5 mL/kg per 30 min at pCap 8 mmHg over threshold | ×(`kfMult`: sepsis 2–4) | mL/kg/min/mmHg | speed of oedema | [ENG] | [ENG] | Q25 |
| Lung-water clearance | `tauEvlw` | 3 h (after the pressure is corrected) | 1–6 h | h | recovery | [ENG] | [ENG] | Q25 |
| EVLWI normal / oedema / severe | `evlwi` | 7 / > 10 / > 15 | 3–7 normal | mL/kg | → §4.5 shunt, compliance, drive | PiCCO norms [TXT] | [TXT] | — |
| PE obstruction | `peFrac` | 0 | 0–0.8 | fraction | pvr × 1/(1 − φ) × (1 + `peVaso`·φ); alveolar dead space φ·VA; shunt +0.05–0.15 when φ ≥ 0.5 | McIntyre-Sasahara 1971 | [P] (mPAP ↑ above 30 %, never > 40 acute) | Q27 |
| PE vasoconstrictor factor | `peVaso` | 0.5 | 0–1 | — | extra PVR (serotonin, thromboxane) | [ENG] | [ENG] | Q27 |
| Pneumothorax pressure | `pPtx` (one side) | 0 | tension 5–25 over 2–10 min (ventilated: faster) | mmHg | venous-return fall, CVP ↑, compliance ↓, shunt ↑ | [TXT] | [ENG] | Q28 |
| Pericardial fluid | `vFluid` | 0 (≈ 20–50 mL physiological, inside v0Peri) | acute tamponade 150–250 | mL | equalisation of diastolic pressures | Tamponade refs | [TXT] | Q29 |

### 2.3 Must-reproduce haemodynamics (acceptance tests; adult 70 kg, supine, ventilated unless stated)

Q30 asks whether these targets, and their tolerances, are the right ones to gate 7a on.

| # | State | Target numbers | Source | Tag |
|---|---|---|---|---|
| H1 | Normal | RA 2–6 (mean ~4); RV 15–30/2–8; PA 15–30/4–12, mPAP ≤ 20 (14 ± 3); PCWP 6–12; LV 100–140/3–12; CO 5–6 L/min; SVR 800–1200 dyn·s/cm⁵; PVR ≤ 2 WU; EF 55–70 %; RV EF 45–60 %; Pmsf 7–12 | ESC2022-PH; [TXT] | [P]/[TXT] |
| H2 | Severe **acute** MR (RF 0.55) | forward SV 35–45 of total 80–100 mL; PCWP mean 25–30 with v-wave 40–60; mPAP 35–45; CO −30–40 %; HR ↑; SVR ↑. Nitroprusside/NTG (SVR −25 %) → RF 0.45, forward SV +15–25 % | ASE2017; [TXT] | [TXT] |
| H3 | Severe **chronic** MR | PCWP 15–20, v-wave ≤ 10 above mean (big compliant LA), CO near normal at rest | [TXT] | [TXT] |
| H4 | Severe AS (AVA 0.7) | mean gradient 40–55 at SV 70; LVSP 170–190 at aortic 130/75; slow-rising radial upstroke; SV nearly fixed: SVR −30 % → MAP −25–30 % (normal heart: −15–20 %, because SV rises) | ACC/AHA 2020; Gorlin | [TXT]/[ENG] |
| H5 | Massive PE (φ 0.6) | mPAP 30–40 (not > 40); RA 12–20; CO −40–60 %; SBP < 90; HR 110–130; EtCO2 −10–20 mmHg with PaCO2 up (Pa–Et gap > 10); SpO2 85–92 % on FiO2 1.0 | McIntyre-Sasahara 1971; R03 §4.3 | [P]/[TXT] |
| H6 | Tension pneumothorax (ventilated) | over 2–5 min: CVP +5–15; SBP < 90; HR ↑; Ppeak +10–20 cmH2O; SpO2 falls; EtCO2 falls with CO; PEA if untreated; needle decompression restores it within 1–2 min | [TXT] | [ENG] timing |
| H7 | Acute tamponade (~200 mL) | RA ≈ RVEDP ≈ PAD ≈ PCWP within 5 mmHg, at 15–20; pulsus paradoxus > 10 mmHg (spontaneous breathing); CVP y-descent lost; SV ↓, HR ↑; 50 mL drained → marked improvement | Tamponade refs (equalisation in 71–81 %) | [TXT] |
| H8 | RV infarct (Ees_RV ×0.35) | CVP 12–20 with PCWP 8–12 (CVP/PCWP ≥ 0.8); MAP < 70; SpO2 normal, lungs clear; NTG 400 µg → MAP −20–30 %; 500 mL fluid → modest improvement; excess fluid → septal shift, CO falls | [TXT] | [TXT] |
| H9 | LV failure → pulmonary oedema (Ees ×0.4 + 1 L fluid) | PCWP > 25 → EVLWI > 10 in 20–40 min → shunt +0.10–0.15, SpO2 −5–10 %, RR +6–10, Crs −20–30 %; PEEP 10: shunt −30–50 % with CO −5–10 % | R24; [ENG] | [ENG] |
| H10 | PEEP 5 → 15, normovolaemic vs volumeStatus 0.3 | CO −5–10 % vs −20–25 %; CVP +2–3; MAP 97 → ~85 vs ~70 (Stage 3's MANUAL prototype numbers, now emergent) | Stage 3 plan decision 7 | [ENG] |

---

## 3. Coronary supply/demand and ischaemia (R23; sub-stage 7a)

```
DTF       = (RR − QS2)/RR,  QS2 = 546 − 2.1·HR (M) / 549 − 2.0·HR (F) ms       # diastolic time fraction
CPP_LV    = mean diastolic P_ao − LVEDP ;   CPP_RV = MAP − RV mean pressure (RV is perfused in systole too)
Supply    S_max = CFR · ((CPP_LV − P_zf)/(CPP_LV,0 − P_zf)) · (DTF/DTF_0) · (CaO2/CaO2_0)    [normalised; 1 = rest demand]
Demand    D     = (HR/HR_0) · (LVSP/LVSP_0) · (kContr·Ees/Ees_0)^0.5 · (LVEDV/LVEDV_0)^(1/3)   [RPP with wall-stress term]
Ratio     r = S_max / D ;   ischaemic deficit δ = max(0, 1 − r)                 (with CAD, CFR is small, so r < 1 comes early)
Effects   kIsch → 1 − g·δ with τ_down; recovers with τ_up; Ees_LV × kIsch (territory-weighted); betaLV × (1 + 0.5·δ)
ST        global (demand) ischaemia: ST depression = min(0.3 mV, 1.0·δ) in V4–V6, I, II, aVF; ST elevation in aVR = 0.5 × that
          territorial (supply) occlusion (event): Stage 5 STEMI modifiers LAD/RCA/LCx at 1–5 mm with reciprocal change
Arrhythmia hazard: δ > 0.3 for > 60 s → PVC rate ×3; VT/VF hazard 1–5 %/min [ENG] (Stage 5 hooks)
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Diastolic time fraction | `dtf` | 0.58 at HR 60; 0.41 at HR 120 (from QS2) | — | — | supply falls with tachycardia | Weissler QS2 (R03 §11 #9); DTF refs (Fokkema 2005, Merkus 1999) | [P] | — |
| Coronary flow reserve by CAD grade | `cfr` | none 3.5 · 1–2-vessel 2.0 · 3-vessel/LM 1.4 · recent MI 1.4 (+ Ees ×0.8) | 1.1–4.5 | × | the ischaemia threshold (the "ischaemia threshold by CAD severity" of R23) | [TXT] (FFR 0.8 ↔ CFR ~2) | [ENG] mapping | Q31 |
| Zero-flow pressure | `pZf` | 15 | 10–25 | mmHg | supply at low CPP | [TXT] | [VERIFY] | Q31 |
| Reference SEVR check | derived | invasive SEVR ≈ 1.0 at rest; ischaemia ≤ 0.45 invasive (≤ 1.3 by tonometry) | — | — | cross-check of r (not used in the solve) | SEVR-PMC11009993 | [P] | Q31 |
| Myocardial O2 extraction at rest | — | 0.70–0.80 | — | fraction | why supply must come from flow (no extraction reserve) | NBK551531 (via summary) | [TXT] | — |
| Contractility loss gain | `gIsch` | 1.5 (δ 0.2 → affected Ees −30 %) | 1–2.5 | — | ischaemic spiral | [ENG] | [ENG] | Q32 |
| Contractility decay τ | `tauIschDown` | 20 | 10–60 | s | hypokinesis within seconds–1 min of ischaemia | Tennant & Wiggers 1935 [TXT] | [TXT] | Q32 |
| Recovery τ (short ischaemia < 5 min) | `tauIschUp` | 60 | 30–180 | s | ST and function recover after phenylephrine | [TXT] | [ENG] | Q32 |
| Stunning after > 10–15 min ischaemia | `stun` | residual Ees −10–30 %, recovering over hours (not within a scenario) | — | × | post-ischaemic dysfunction | Braunwald [TXT] | [TXT] | Q32 |
| ST onset lag | `stLag` | 30–60 s after δ > 0.1 | 15–120 | s | ST change follows haemodynamic ischaemia | [TXT] | [ENG] | — |

**Propofol in the AS + 3-vessel CAD profile: expected trajectory** (worked with P_zf = 0 for readability; P_zf 15 makes the deficit larger). Patient: 75 y, AVA 0.7, CFR 1.4, HTN. Baseline 150/80 (MAP 103), HR 70, LVEDP 18, LVSP 195 (gradient 45), CPP 62 → r = 1.4, no ischaemia.

| t | Event | MAP / DBP | HR | LVSP | CPP | D | r | δ | ECG | Ees_LV |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | propofol 1.5 mg/kg | 103 / 80 | 70 | 195 | 62 | 1.0 | 1.4 | 0 | normal | 1.0 |
| +2 min | SVR −35 %, V0 ↑, contractility −15 %, baroreflex ×0.5; SV fixed by AS | 62 / 45 | 72 | 140 | 25 | 0.72 | 0.78 | 0.22 | ST ↓ 1–2 mm V4–V6 by +3 min | → 0.67 (τ 20 s) |
| +4 min (no rescue) | SV falls with Ees, LVEDP 25 (β ↑) → spiral | 50 / 38 | 80 | 110 | 13 | 0.45 | 0.64 | 0.36 | ST ↓ 2–3 mm, PVCs; VT/VF hazard | 0.5 |
| rescue A at +2.5 min | **phenylephrine 100 µg**: SVR +40 %, HR −8 | 85 / 65 | 64 | 160 | 45 | 0.67 | 1.5 | 0 | ST normalises over 1–3 min | recovers τ 60 s |
| rescue B at +2.5 min | **ephedrine 10 mg**: HR +15 (DTF ×0.91), contractility +15 %, SVR +10 %, peak 4–5 min | 72 / 52 | 85 | 145 | 32 | 0.79 | 0.84 | 0.16 | ST depression persists (~1 mm) | stays depressed (~0.85) |

Acceptance (R23): hypotension → ST change within 3 min → falling contractility; phenylephrine reverses it within 3 min; ephedrine does not. **Q33.**

**Drug effects on supply and demand** (signs emerge from each drug's HR/SVR/contractility/venous-tone multipliers in §6. This table is the check that they do.)

| Drug | DBP / CPP | HR → DTF | LVSP | Contractility | LVEDP | Net r (CAD) |
|---|---|---|---|---|---|---|
| Phenylephrine | ↑↑ | ↓ reflex → DTF ↑ | ↑ | ~ | ↑ slightly | **↑** |
| Norepinephrine | ↑↑ | ~ | ↑ | ↑ | ~ | ↑ |
| Ephedrine | ↑ | ↑ → DTF ↓ | ↑ | ↑ | ~ | **↓ or ~** |
| Epinephrine | ↑ | ↑↑ | ↑ | ↑↑ | ↓ | ↓ |
| Nitroglycerin | ↓ (but LVEDP ↓↓) | ↑ reflex | ↓ | ~ | ↓↓ | ↑ if MAP holds; ↓ in severe AS or RV infarct |
| Esmolol | ↓ slightly | ↓↓ → DTF ↑ | ↓ | ↓ | ~/↑ | ↑ unless hypotensive |
| Vasopressin | ↑↑ | ~/↓ | ↑ | ~ | ~ | ↑ (coronary vasoconstriction at high dose: CFR ×0.9 above 0.04 U/min [ENG]) |

---

## 4. Lung physiology module (R31; sub-stage 7b)

All outputs go to Stage 3 through its existing seams. Base shunt goes to `rs.shunt`. Extra shunt goes to `extraShunt(rs)`: atelectasis, lung water, HPV, PE, endobronchial and pneumothorax terms. `compliance(rs)` and `deadSpace(rs)` pick up the new mechanics (via `vdExtraMl` or a new alveolar term). `frcGaMl` becomes dynamic. `lungState` re-emits whenever any of these change (R27). Proposed new `lungState` fields, additive: `complianceSlowMlPerCmH2O`, `tauSlowS`, `fSlow`, `evlwi`, `atelectasisFrac`.

### 4.1 FRC, atelectasis and recruitment

```
atel(t): atelectatic fraction of lung. On induction: atel → atelInd·f(FiO2_preox)·profile factors within 5 min.
Maintenance: d(atel)/dt = (atelEq(FiO2, PEEP, obesity) − atel)/τ_collapse(FiO2, PEEP)     # absorption / compression
Recruitment: while Paw > P_open: atel → 0 with τ_rec 2.6 s;  after PEEP/Paw fall: re-collapse with τ_collapse
Shunt from atelectasis = atel · perfusionShare(1.2) · (1 − hpvRegional)
FRC_GA = FRC_awake,supine · (1 − frcDropInd) − atel·TLC_fraction                                          [ENG]
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| FRC fall on induction | `frcDropInd` | 0.18 | 0.15–0.20 (≈ 0.4–0.5 L) | fraction | O2 store; closing capacity > FRC | Hedenstierna [TXT] | [VERIFY] | Q34 |
| Supine vs upright FRC | — | −0.5 to −1.0 L (Stage 3's 30 mL/kg is already supine) | — | L | positioning | [TXT] | [TXT] | — |
| Atelectasis after induction, FiO2 1.0 preoxygenation | `atelInd` | 0.06 of lung (single CT slice 5.6 %) | 0.03–0.15; 90 % of patients | fraction | shunt +0.05–0.10 under GA | Edmark2003; Hedenstierna review | [P] | Q34 |
| FiO2 dependence of induction atelectasis | `f(FiO2)` | 1.0 → 1; 0.8 → 0.1; 0.6 → 0.04 | — | × | teaching point: FiO2 0.8 trade-off | Edmark2003 (5.6 / 0.6 / 0.2 %) | [P] | — |
| Edmark apnoea check (validation target) | test | time to SpO2 90 % after induction apnoea: 411 / 303 / 213 s at FiO2 1.0 / 0.8 / 0.6 | — | s | calibrates the Stage 3 O2 store + atelectasis together | Edmark2003 | [P] | Q34 |
| Re-collapse after recruitment, FiO2 1.0, ZEEP | `tauCollapse` | 5 | 3–10 | min | absorption atelectasis | Rothen1995 (Anesthesiology) | [P] | — |
| Re-collapse, FiO2 0.4 | `tauCollapse` | 120 (little re-collapse at 40 min) | > 40 | min | — | Rothen1995 (both) | [P] | — |
| PEEP effect on re-collapse | `tauCollapse` × | ×(1 + PEEP/5) | — | × | PEEP keeps lung open | [ENG] | [ENG] | Q34 |
| Recruitment manoeuvre | `P_open`, `tauRec` | 40 cmH2O for 7–8 s; τ 2.6 s | P_open 30–45 (obese, ARDS higher) | cmH2O, s | shunt ↓, compliance ↑ | Rothen1999 | [P] | — |
| Compliance loss from atelectasis | `crs` × | ×(1 − 1.5·atel) | — | × | Crs 60 → 50 under GA | OA-resp (Crs ~60 under GA) | [TXT] | — |

### 4.2 Hypoxic pulmonary vasoconstriction and pulmonary vascular tone

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Regional HPV (flow diversion from hypoxic lung) | `hpvRegional` | 0.5 max (flow to the hypoxic region halved) | 0.3–0.6 | fraction | shunt from atelectasis/OLV/endobronchial falls from 0.25 → ~0.15 over minutes | HPV-SJA2021 | [TXT] via review | Q35 |
| HPV phase 1 | `tauHpv1` | onset seconds; τ 5 min (peak 5–20 min) | — | min | — | HPV-SJA2021 | [TXT] | — |
| HPV phase 2 | `hpv2` | extra +30 % of the response, starting ~40 min, peak 1–2 h | — | — | long OLV cases | HPV-SJA2021 | [TXT] | — |
| Volatile inhibition of HPV | `hpvVolatile` | response ×(1 − 0.2·MAC) | 0.1–0.3 per MAC | × | OLV oxygenation with volatile vs TIVA | Lumb & Slinger 2015 (qualitative) | [VERIFY] | Q35 |
| Global hypoxia → PVR | `pvr` × | ×(1 + 1.0·(1 − P_stim/60)₊), P_stim = PAO2^0.6·PvO2^0.4 | — | × | PAP rises in global hypoxaemia; PH crisis | Marshall stimulus [TXT] | [VERIFY] | Q35 |
| Acidosis/hypercapnia → PVR | `pvr` × | ×(1 + 0.25·(7.40 − pH)/0.1)₊ | 0.15–0.4 per 0.1 pH | × | PH crisis in hypercapnia | [TXT] | [ENG] | Q35 |
| Vasodilator inhibition | — | NTG/SNP/milrinone reduce HPV (shunt ↑ 0.02–0.05) | — | — | teaching point | [TXT] | [TXT] | — |

### 4.3 Mechanics: two compartments, auto-PEEP, resistance events

```
Fast compartment (1 − fSlow): C_f, R_f ;  slow compartment fSlow: C_s, R_s   (parallel; τ = R·C each)
Auto-PEEP (single-compartment steady state, checked): PEEPi = (VT/C)·e^(−Te/τ) / (1 − e^(−Te/τ))
lungState.autoPeepTendency = PEEPi / 10 (clamped 0–1) and the compartment values themselves (new fields)
Auto-PEEP → pIt (§2) → venous return ↓ → hypotension with high RR in COPD (R27 demo)
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Normal anaesthetised Crs | `crs` | 50–60 | 40–80 | mL/cmH2O | Pplat | OA-resp | [TXT] | — |
| Normal R (incl. 7.5–8 ETT) | `raw` | 10 | 5–12 | cmH2O/L/s | Ppeak − Pplat | Stage 3; [TXT] | [TXT] | — |
| Normal τ | — | 0.5 | 0.3–0.7 | s | expiration complete in 3τ | derived | [TXT] | — |
| COPD slow compartment | `fSlow`, `tauSlowS` | GOLD 3: 0.5, 2.0 s (GOLD 2: 0.4, 1.2; GOLD 4: 0.6, 3.0) | τ 1–4 | —, s | auto-PEEP 5–15 at RR 16–20; shark-fin capnogram | [TXT] | [ENG] | Q19 |
| ARDS | `crs`, `atel`, `shunt` | Crs 25–35, atel 0.2–0.4, shunt 0.2–0.4 (PEEP-responsive) | Crs 15–40 | — | R27 ARDS demo | Berlin [TXT] | [TXT] | — |
| Bronchospasm severity → R | `raw` × | Stage 3: ×(1 + 3·sev); proposed ×(1 + 5·sev^1.5) so sev 1 → ×6 (R 60) | — | × | shark fin, high Ppeak, auto-PEEP, silent chest at sev 1 | Stage 3; [ENG] | [ENG] | Q20 |
| Tube kink / secretions | `raw` × | kink ×5–20 (flow-dependent); secretions ×1.5–3 plus noise | — | × | Ppeak alarm, VT fall in pressure control | [ENG] | [ENG] | — |
| Endobronchial intubation | Stage 3 | C ×0.5, shunt +0.25 then HPV → ~+0.15 over 10–20 min | — | — | classic scenario | Stage 3; §4.2 | [ENG] | — |

### 4.4 Dead space

```
VD_phys = VD_anat (Stage 3) + VD_app (Stage 3) + VD_alv
VD_alv  = VA_tidal · (z1 + peFrac + 0.1·atelHyperinflation)          # West zone 1 fraction z1:
z1      = clamp( (P_alv,mean − (mPAP − ΔP_height/2)) / ΔP_height, 0, 1 ),  ΔP_height ≈ 15 cmH2O supine   [ENG]
Pa–EtCO2 gap = PaCO2 · VD_alv / VT_alveolar     (replaces the fixed 3 mmHg PA_ET_GRADIENT when MODELED)
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| VD/VT normal | derived | 0.3 | 0.25–0.35 | — | EtCO2 | COPD-VD | [TXT] | — |
| Vertical perfusion gradient (supine) | `dpHeight` | 15 | 10–25 | cmH2O | zone 1 with low PAP, high PEEP | [TXT] West | [ENG] | — |
| Low CO → zone 1 | emergent | CO −50 % → Pa–Et gap +5–10 mmHg | — | — | EtCO2 falls more than PaCO2 in shock (B §4.4 low-flow term remains for arrest) | [TXT] | [ENG] | — |
| PEEP → dead space | emergent | PEEP 15 in hypovolaemia: VD/VT +0.05–0.1 | — | — | — | [TXT] | [ENG] | — |

### 4.5 Lung water, diffusion

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Shunt from lung water | `extraShunt` + | +0.03 per mL/kg EVLWI above 10 | 0.02–0.05 | fraction | SpO2 falls in oedema (R24) | [ENG] | [ENG] | Q25 |
| Compliance from lung water | `crs` × | ×(1 − 0.04·(EVLWI − 7)₊), floor 0.5 | — | × | Paw ↑ on the ventilator (R24) | [ENG] | [ENG] | Q25 |
| Airway resistance from lung water | `raw` × | ×(1 + 0.03·(EVLWI − 7)₊) | — | × | "cardiac asthma" | [ENG] | [ENG] | — |
| PEEP benefit in cardiogenic oedema | — | shunt from lung water ×(1 − 0.04·PEEP) | — | × | R27 HF demo | [TXT] | [ENG] | — |
| Diffusion capacity factor (scenario) | `dlFactor` | 1 | 0.2–1 | × | end-capillary PO2 = PAO2 − (PAO2 − PvO2)·e^(−k·dl·t_transit) with k set so equilibrium is reached by 0.25 s of 0.75 s transit; t_transit = 0.75 s·(CO0/CO) | West [TXT] | [TXT]/[ENG] | — |

### 4.6 Respiratory drive, work of breathing and fatigue (spontaneous breathing only)

```
VE = [ S·(PaCO2 − B) ]₊ · H(PaO2) · (1 − Dep_opioid) · (1 − Dep_hypnotic) · Fatigue + VE_pain + VE_Jrec
H(PaO2) = 1 + 25/(PaO2 − 32) − 25/68            # Weil hyperbola form; ×1.5 at PaO2 60, ×2.6 at 45
B = PaCO2_set − VE0/S  (apnoeic threshold ≈ 36 at rest; under GA shifts up 4–5 mmHg)
Dep_opioid = Ce^h/(Ce^h + C50^h) (remi C50 0.92 ng/mL, h 1.25);  hypnotic via Nieuwenhuijs numbers (§5d)
Pattern: opioid → RR ↓ first; hypnotic/volatile → VT ↓, RR ↑
PTI = (P_breath/P_max)·(Ti/Ttot);  PTI > 0.15 → fatigue F falls over ~45 min → RR ↑, VT ↓, then hypercapnic failure
P_max 80–100 cmH2O, × (TOFR effect from §5d residual block)
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| CO2 response slope (awake) | `co2Slope` | **1.5** | 1–2 (1.60 ± 0.19); sleep 0.45–0.75 | L/min/mmHg | ventilatory response; opioid depression | HCVR refs (7149440) | [TXT] via summary | Q36 |
| Apnoeic threshold offset | `apnoeaOffset` | 4 below resting PaCO2 (sleep 2–5) | 2–6 | mmHg | post-hyperventilation apnoea | HCVR refs | [TXT] | Q36 |
| Hypoxic response constant | `hvrA` | 25 | 10–50 | mmHg | tachypnoea in hypoxaemia; abolished by 0.1 MAC volatile and opioids (×0.3–0.5) | Weil 1970 form [TXT] | [ENG] constant | Q36 |
| Pain / stimulation drive | `VE_pain` | +20–40 % at noxious 1 when not anaesthetised | — | × | emergence tachypnoea | [ENG] | [ENG] | — |
| J-receptor drive (lung water) | `VE_Jrec` | RR +4–10 at EVLWI > 10 | — | /min | R24: RR rises in oedema | [TXT] | [ENG] | — |
| Fatigue threshold | `ptiCrit` | 0.15 (~45 min to task failure) | 0.12–0.18 | — | failing spontaneous breathing (COPD, residual block, pulmonary oedema) | Bellemare & Grassino 1982 [TXT] | [VERIFY] | Q36 |
| Upper-airway collapse under sedation | `uaCollapse` | depth index < 60, or opioid Dep > 0.3 (OSA earlier: < 80–90, §1.5) | — | — | obstructed pattern (Stage 3 airway `obstructed`) | [TXT] | [ENG] | Q9 |


---

## 5. Brain, kidney, liver and metabolism (R26; sub-stage 7d)

### 5.1 Brain: ICP, CPP, CBF, PbtO2

```
V_ic      = V_brain + CBV + V_csf + V_oedema + V_mass            # Monro–Kellie; only the CHANGE ΔV_ic matters
ICP       = ICP0 · 10^(ΔV_ic / PVI) = ICP0 · exp(ΔV_ic / (0.4343·PVI)),   capped at MAP_head
            # CSF absorption buffers slow ΔV: ΔV_csf relaxes with τ_csf (minutes); fast ΔV (CBV, mass bleed) does not
MAP_head  = MAP − 0.74 · h_cm                                   # head-up: h = height of the tragus above the transducer
CPP       = MAP_head − max(ICP, CVP_head)
CBF       = CBF0 · A(CPP; LL, UL) · C(PaCO2) · O(PaO2) · M(CMRO2 coupling)
  A: 1 on [LL, UL]; below LL linear to 0 at CPP ≈ 10; above UL rises 1 %/mmHg (breakthrough)   [ENG shape]
  C: 1 + k_CO2·(PaCO2 − 40), clamped at PaCO2 20 and 80;  O: 1 above PaO2 60, rising to ×2 at PaO2 30
CBV       = CBV0 · (CBF/CBF0)^0.38                                # Grubb exponent: the path by which CO2 changes ICP
PbtO2     = PbtO2_0 · (CBF·CaO2 / CMRO2)_rel · (1 + 0.004·(PaO2 − 100)_+)                    [ENG]
Cushing   : CPP < 40 (or ICP within 10 of MAP_head) for > 30 s → sympathetic surge (MAP_set +30–50), reflex vagal
            bradycardia (HR −20–40 %), irregular/ataxic breathing (respiratory driver pattern 'ataxic')      [TXT shape, ENG numbers]
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Resting ICP (adult, supine) | `ICP0` | 10 | 5–15 | mmHg | CPP; waveform baseline | [TXT] | [TXT] | — |
| Pressure–volume index | `pvi` | 25 | normal 25–30; exhausted < 10–13 | mL | how fast ICP rises per mL (elastance 2.303·ICP/PVI) | PVI-PLOS (Marmarou) | [P] | — |
| CSF buffering time constant and reserve | `tauCsf`, `csfReserve` | 5 min, 30 mL | 2–15 min, 20–50 mL | min, mL | slow masses are compensated until the reserve is used, fast ones are not | [ENG] | [ENG] | Q37 |
| Treatment threshold ICP | alarm | 22 | 20–25 | mmHg | scenario targets, alarm default | BTF2016 | [TXT] (via summary) | — |
| CPP target | scenario | 60–70 | 50–70 | mmHg | teaching target | BTF2016 | [TXT] | — |
| Autoregulation lower limit (as CPP) | `cbfLL` | 60 (normotensive) | 50–70; +15–20 in chronic HTN (§1.5) | mmHg | CBF falls below it | OA-CBF; LITFL-CBF (Lassen 50 vs modern 60–70) | [P] | Q13 |
| Autoregulation upper limit | `cbfUL` | 150 | 140–160; shifts right in HTN | mmHg | breakthrough hyperaemia | LITFL-CBF | [P] | — |
| Global CBF | `CBF0` | 50 (≈ 750 mL/min whole brain) | 40–60 | mL/100 g/min | ×CaO2 → cerebral DO2 | LITFL-CBF (750 mL/min, 15 % of CO) | [P] | — |
| CMRO2 | `cmro2_0` | 3.3 (≈ 50 mL/min) | 3.0–3.5 | mL/100 g/min | coupling; PbtO2 | LITFL-CBF | [P] (whole-brain value) | — |
| CO2 reactivity | `kCO2` | 0.03 | 0.02–0.04 per mmHg (OA says ~4 %) | /mmHg | hyperventilation → CBF ↓ → CBV ↓ → ICP ↓ | OA-CBF; LITFL-CBF | [P] | Q38 |
| O2 reactivity onset | `paO2Cbf` | 60 | 50–60 | mmHg | CBF ↑ in hypoxaemia | LITFL-CBF (< 60) | [P] | — |
| CBV–CBF exponent | `grubb` | 0.38 | 0.3–0.4 | — | ICP response to CO2 | Grubb 1974 [VERIFY] | [VERIFY] | — |
| PbtO2 normal | `PbtO2_0` | 25 | 20–35 | mmHg | brain-oxygen tile | PbtO2-PMC10523606 | [P] | — |
| PbtO2 ischaemic threshold | alarm | 20 (BOOST treats ≤ 20 for > 5 min) | 15–20 | mmHg | alarm; outcome counter | PbtO2-PMC10523606 | [P] | — |
| Head-up 30° effect | via `h_cm` + venous drainage | ICP −5.6 mmHg; CPP ≈ unchanged | ICP −3 to −8 | mmHg | positioning teaching | HeadUp-meta 2024 | [P] abstract | — |
| Hypothermia → CMRO2 | `q10Brain` | −7 %/°C | 6–7 %/°C | %/°C | cerebral protection | LITFL-CBF | [P] | — |

**ICP waveform (optional channel, 125 Hz, same L2 pattern as the CVP generator).** Three Gaussians per mechanical beat, timed from the aortic upstroke plus 30–60 ms: P1 percussion (arterial), P2 tidal (brain compliance) and P3 dicrotic (after the incisura). Amplitude rules [ENG, shape per ICP-waveform refs]: pulse amplitude AMP = 0.1·ICP + 0.5 mmHg for a compliant brain. AMP rises steeply as elastance rises, because AMP ∝ elastance × CBV pulse. The P2/P1 ratio is **0.8** when compliant, **1.0** at ICP ≈ 20 or PVI 15, and **1.3–1.5** when compensation is exhausted (P2 > P1 means reduced compliance [ICP-wave]). A respiratory component of 1–3 mmHg rides on top. Optional Lundberg A plateau waves reach 50–100 mmHg for 5–20 min when CPP is marginal; B waves run at 0.5–2 /min with 5–20 mmHg amplitude [TXT]. **Q39.**

**Anaesthetic and treatment effects on the brain** (multipliers applied to `cmro2`, `CBF` and `ICP` inputs):

| Agent | CMRO2 | CBF (direct, beyond coupling) | ICP net | Time course | Source | Tag |
|---|---|---|---|---|---|---|
| Propofol (effect-site) | ×(1 − 0.5·E), max −50 %; burst suppression at −55–60 % | coupled (falls with CMRO2); PET: CBF −47 % | ↓ | follows Ce (§6) | Slupe2018 | [VERIFY] % |
| Sevoflurane | ×(1 − 0.25·MAC), floor ×0.5 | MCA velocity +4 % at 0.5 MAC, +17 % at 1.5 MAC | ~ at ≤ 1 MAC, ↑ above | follows Et | Matta1999 | [P] |
| Isoflurane | ×(1 − 0.3·MAC) | +19 % at 0.5 MAC, +72 % at 1.5 MAC | ↑ above ~1 MAC | follows Et | Matta1999 | [P] |
| N2O | ↑ slightly | ↑ | ↑ | — | OA-CBF | [TXT] |
| Ketamine | ↑ | ↑ (+20–60 %) | ↑ (small, and not with controlled ventilation) | follows Ce | OA-CBF | [VERIFY] % |
| Opioids | ~ | ~ (↑ via PaCO2 if spontaneous) | ~ | — | [TXT] | [TXT] |
| Mannitol 0.25–1 g/kg | — | — | ICP −20–40 %; brain water ↓ | onset 10–15 min, peak 20–60, duration 2–6 h; 0.25 g/kg ≈ 1 g/kg | Mannitol-USPharm | [TXT] |
| Hypertonic saline (3 % 250 mL / 23.4 % 30 mL) | — | — | ICP −20–40 %, longer than mannitol | onset 5–10 min, 60–120 min better | HTS-meta | [TXT] |
| Hyperventilation PaCO2 40 → 30 | — | CBF −30 % | ICP −25–30 % (via CBV) | CBF within 30 s; adapts over 6–24 h (pH buffering) | OA-CBF; [TXT] | [TXT] |

### 5.2 Kidney

```
RPP  = MAP − max(CVP, IAP)
UOP  = UOP0 · weight · U(RPP) · S(stress) · V(volume) · D(drugs)     [mL/h]
U    : 0 at RPP ≤ 40; linear to 1 at 100; 3× at 150 (pressure natriuresis, Guyton renal output curve)
S    : 0.5–0.7 under surgical stress/ADH (intra-op), 1 awake; V: 0.5 at −15 % blood volume, 0.2 at −30 %
RBF  : autoregulated flat over RPP 80–180, falls below — feeds the renal-drug clearance factor
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Baseline UOP awake | `UOP0` | 1.0 | 0.5–1.5 | mL/kg/h | urine tile, bladder-temperature τ | [TXT] | [TXT] | — |
| Oliguria threshold | alarm | < 0.5 for ≥ 6 h (KDIGO 1) | — | mL/kg/h | AKI teaching; scenario time-compression | KDIGO2012 | [TXT] | Q40 |
| Renal autoregulation range | `rblLL`, `rblUL` | 80–180 | 70–180 | mmHg | RBF plateau (HTN shifts it +10) | Renal-AR PMC4042104 | [TXT] | — |
| RPP at which UOP is zero | `rppZero` | 40 (≈ MAP 45–50 at normal CVP) | 35–55 | mmHg | anuria in shock | Guyton & Hall | [TXT]/[ENG] | — |
| Surgical stress (ADH, sympathetic) | `S` | 0.6 | 0.4–0.8 | × | intra-op UOP 0.5–1 despite normal MAP | [TXT] | [ENG] | — |
| Intra-abdominal pressure | `iap` | 5 | 0–30 (IAH > 12, ACS > 20) | mmHg | RPP ↓; venous return ↓; compliance ↓ | WSACS [TXT] | [TXT] | — |
| PEEP / mean Paw | via CVP and CO | emergent + hormonal ×0.9 per 10 cmH2O | — | × | UOP falls with PEEP | PEEP-renal 6379297 | [ENG] | — |
| Norepinephrine in vasoplegia | via RPP | UOP recovers as MAP returns to 65–75 | — | — | vasopressor "helps the kidney" teaching point | NE-renal (Chest) | [TXT] | — |
| α-agonist renal vasoconstriction (normotension) | `D` | ×0.9 per 0.1 µg/kg/min NE above need | — | × | UOP cost of over-pressing | [ENG] | [ENG] | — |
| Hyperglycaemia osmotic diuresis | `D` | + above glucose 180–200 mg/dL | — | — | §5c | [TXT] | [TXT] | — |

### 5.3 Liver and metabolism

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Hepatic blood flow share | `hbfFrac` | 0.25 of CO (≈ 1.5 L/min) | 0.2–0.3 | fraction | clearance of high-extraction drugs (propofol, fentanyl, lidocaine) | [TXT] | [TXT] | — |
| Splanchnic vasoconstriction | `hbfFactor` | 1; ×0.6 in class III haemorrhage or high-dose α-agonist; ×0.8 at 1 MAC volatile | 0.4–1 | × | clearance ↓, lactate clearance ↓ | [TXT] | [ENG] | — |
| Drug clearance vs temperature | `clearTemp` | −10 %/°C below 37 | −7 to −22 %/°C | %/°C | prolonged effect in hypothermia | Tortorici2007 | [TXT] via summary | — |
| Basal lactate production | `lacProd0` | 1400 mmol/day (≈ 0.83 mmol/kg/h) | 1300–1500 | mmol/day | steady lactate 1.0 | Lactate-BJAEd | [TXT] via summary | — |
| Normal lactate | `lactate0` | 1.0 | 0.3–1.5 | mmol/L | — | Lactate-BJAEd | [TXT] | — |
| Lactate distribution volume | `vLac` | 0.6 | 0.5–0.7 (TBW) | L/kg | converts mmol to mmol/L | [ENG] | [ENG] | — |
| Lactate clearance (derived) | `kLac` | 1.4 /h (t½ ≈ 30 min) at normal HBF; ×HBF_rel; ×0.3 in liver failure | t½ 20–60 min | /h | lactate falls after resuscitation over 1–3 h | derived from production/(C·V) | [ENG] | Q41 |
| Clearance split | — | liver 60 %, kidney 30 %, other 10 % | liver 60–70 % | — | CKD/liver disease scaling | Lactate-BJAEd | [TXT] | — |
| Critical DO2 | `do2Crit` | 6.0 | 4.9 (van Woerkens) – 8.2 (Shibutani); Lieberman awake < 7.3 | mL/kg/min | below it VO2 becomes supply-dependent and lactate rises | CritDO2 (10691227 + review) | [TXT] via abstracts | Q42 |
| Maximum O2 extraction | `erMax` | 0.70 | 0.6–0.75 | — | SvO2 floor ≈ 30–40 %; ER > 0.6 → lactate | LITFL-OER | [TXT] | — |
| Anaerobic lactate yield | `kAnaer` | 0.03 mmol lactate per mL O2 deficit | 0.015–0.06 | mmol/mL | calibrated so 30 min at 2 mL/kg/min deficit → lactate +3–5 mmol/L | [ENG] | [ENG] | Q41 |
| Temperature → VO2/VCO2 | `q10` | 7.5 %/°C (Stage 3) ≈ Q10 2 | 6–8 %/°C (Q10 2–3) | %/°C | Stage 3 `tempFactor` | Q10-LITFL | [P] | — |
| **MH** (event `mh`, severity 0–1) | `mh` | VCO2 ×2–5 over 5–30 min (brief); VO2 ×2–3; heat → +1–2 °C per 5 min (fulminant); K → 6–8 over 10–30 min; lactate +5–10; HR +30–50; masseter rigidity flag | — | — | EtCO2 rising despite ↑ MV, tachycardia, hyperK ECG, VT/VF | B §4.4, §4.6; MH-EMCrit; MH-OA | [TXT] | Q43 |
| Dantrolene response | `dantrolene` | 2.5 mg/kg, repeat to response (average 5, can exceed 10 mg/kg): VCO2 excess decays τ 10–20 min, temperature falls with cooling | — | — | treatment scenario | MH-OA | [TXT]/[ENG] τ | Q43 |

---

## 5b. Blood, acid–base, electrolytes and fluids (R32; sub-stage 7c)

### 5b.1 Acid–base

```
pH   = 6.1 + log10( HCO3 / (0.03 · PaCO2) )                         # Henderson–Hasselbalch (Stage 3 supplies PaCO2)
Acute respiratory: HCO3 += 0.1·(PaCO2 − 40) if rising, 0.2·(PaCO2 − 40) if falling  (buffering, seconds–minutes)
Chronic (profile only): +0.35–0.4 per mmHg (COPD, days — not simulated in time, set by the profile)
Metabolic: HCO3 = SIDa − A⁻   ("Stewart-lite"):  SIDa = Na + K + 2·iCa·0.5·2 + Mg − Cl − lactate ;  A⁻ ≈ 0.25·albumin(g/L) + 2
           → lactate 1:1 lowers HCO3; 0.9 % saline lowers SID (Cl 154) → hyperchloraemic acidosis
Spontaneous-breathing set point: Winter's PaCO2 = 1.5·HCO3 + 8 (± 2) replaces 40 in the chemoreflex when HCO3 < 22
BE   = 0.93 · (HCO3 − 24.4 + 14.83·(pH − 7.4))                        # standard base excess (Van Slyke)
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| pK, CO2 solubility | — | 6.1, 0.03 | — | —, mmol/L/mmHg | pH | [TXT] | [TXT] | — |
| Normal HCO3 / BE / pH | `hco3` | 24 / 0 / 7.40 | 22–26 / ±2 / 7.35–7.45 | mmol/L | — | [TXT] | [TXT] | — |
| Acute resp. acidosis compensation | — | +1 per 10 mmHg | 0.7–1.2 | mmol/L | pH moves with CO2 | Acid-base CU Anschutz | [TXT] | — |
| Winter's formula | — | 1.5·HCO3 + 8 ± 2 | — | mmHg | spontaneous-breathing compensation, Kussmaul pattern | Winters (confirmed) | [P] | — |
| Lactate → HCO3 | — | 1:1 | 0.8–1 | — | lactic acidosis | [TXT] | [TXT] | — |
| Albumin | `albumin` | 40 | 15–50 | g/L | A⁻, colloid osmotic pressure (oedema threshold §2) | [TXT] | [TXT] | — |
| Chloride | `cl` | 104 | 95–120 | mmol/L | SID; saline acidosis | [TXT] | [TXT] | — |
| pH → contractility | `eesLV` × | ×(1 − 1.5·(7.2 − pH)) below pH 7.2 | — | × | severe acidosis depresses the heart and blunts catecholamines | [TXT] shape | [ENG] | Q44 |
| pH → catecholamine response | `vasoResp` × | ×0.5 at pH 7.1 | — | × | vasopressor resistance in acidosis | [TXT] | [ENG] | Q44 |

### 5b.2 Electrolytes (ECG and contractility hooks)

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Potassium | `k` (brief state var) | 4.2 | 2–9 | mmol/L | Stage 5 hyper/hypoK modifiers: peaked T > 5.5–6, PR/QRS widening > 6.5–7, sine wave/VF > 8–9; hypoK < 3 U waves, TdP susceptibility | B §4.9 M10; [TXT] | [TXT] | — |
| K distribution space | `vK` | ECF 0.2 L/kg; 50 % of a load moves into cells over ~30 min | — | L/kg | ΔK per mmol given (transfusion, sux, reperfusion) | [ENG] | [ENG] | — |
| K–pH shift | `kPh` | +0.4 per −0.1 pH, **mineral acidosis and respiratory only**; ~0 for lactic acidosis | 0.2–0.7 | mmol/L | K rises in respiratory/mineral acidosis | Adrogué & Madias 1981 (disputed, not read) | [VERIFY] | Q45 |
| Succinylcholine K rise | event | +0.5 (burns, denervation, immobilisation > 72 h: +5–7) | — | mmol/L | hyperK arrest scenario | B §4.9 | [TXT] | — |
| Insulin–dextrose | drug | −0.6 to −1.0 over 30–60 min, lasts 4–6 h | — | mmol/L | treatment | [TXT] | [TXT] | — |
| Salbutamol nebulised | drug | −0.5 to −1.0 over 30 min | — | mmol/L | treatment | [TXT] | [TXT] | — |
| Calcium (membrane) | drug | ECG stabilises in 1–3 min for 30–60 min; K unchanged | — | — | brief §4.9 drug row | [TXT] | [TXT] | — |
| Ionised calcium | `iCa` | 1.20 | 1.15–1.33 normal; < 1.15 low (trauma < 1.1) | mmol/L | QTc +10 ms per 0.1 below 1.1 [ENG]; contractility ×min(1, (iCa/1.1)^1.5) [ENG]; SVR ×(same)^0.5 | Citrate-ESMED | [TXT]/[ENG] | Q46 |
| Citrate load per RBC unit | `citrateUnit` | ≈ 3 g; liver clears in ~5 min at normal HBF | — | g | iCa −0.1 per unit when > 1 unit / 5 min, or HBF < 50 % [ENG] | Citrate-ESMED | [TXT]/[ENG] | Q46 |
| Stored-blood K | `kUnit` | supernatant K ≈ storage days (mmol/L), > 40 at expiry → 2–5 mmol per old unit | 0.5–7 | mmol/unit | hyperK in rapid/massive transfusion, especially paediatric | StoredK 21498041 | [TXT] | — |
| Sodium | `na` | 140 | 115–160 | mmol/L | < 125 seizures/brain oedema (ICP ↑ via V_oedema), TURP/hysteroscopy absorption scenario | [TXT] | [TXT] | — |
| Magnesium | `mg` | 0.85 | 0.7–1.0 normal; therapeutic in pre-eclampsia 2–3.5 | mmol/L | hypoMg: TdP susceptibility; hyperMg: NMB potentiation (EC50 ×0.7), hypotension, reflexes lost ~5, respiratory depression ~6, arrest > 7.5 | [TXT] | [TXT] | — |

### 5b.3 Oxygen delivery

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| O2 content | `caO2` | 1.34·Hb·SaO2·(1 − COHb − MetHb) + 0.003·PaO2 | — | mL/dL | DO2 | B §4.3 | [TXT] | — |
| DO2 | `do2` | CO·CaO2·10 ≈ 1000 | 900–1100 (500–600 /m²) | mL/min | lactate (§5.3), SvO2 | [TXT] | [TXT] | — |
| SvO2 | `svo2` | SaO2 − VO2/(CO·13.4·Hb) ≈ 0.75 | 0.65–0.80 | fraction | ScvO2 tile (optional); ER | [TXT] | [TXT] | — |
| P50 | `p50` | 26.8 | 24–30; +2–5 in chronic anaemia; −2–4 with COHb/hypothermia/alkalosis | mmHg | ODC shift (Stage 3 virtual-PO2 hook) | [TXT] | [TXT] | — |

### 5b.4 Fluid compartments and kinetics

```
Compartments (per kg): TBW 0.6 (M) / 0.5 (F); ICF 2/3; ECF 1/3 = interstitial 3/4 + plasma 1/4 (plasma ≈ 40–45 mL/kg)
Crystalloid given at rate R into plasma:  dVp/dt = R − k_dist·(Vp − Vp_target) − k_el·(Vp − Vp0)
   k_dist: τ ≈ 10 min (to interstitium) ; k_el: t½ 20–40 min awake, ×3–8 longer under GA + ventilation
   → 50–60 % intravascular DURING infusion, 15–20 % 30 min after it ends (awake)
Colloid: 80–100 % intravascular at first; plasma t½ gelatin ≈ 2–3 h, albumin 5 % hours (much less with leak)
Leak states: k_dist × Kf_mult (sepsis 2–4, anaphylaxis 5–10, burns); colloid retention also falls
Haemorrhage: whole blood out (Hb unchanged at first); transcapillary refill brings Hb down over hours
Transfusion: RBC unit 280 mL at Hct 0.6 → +1 g/dL Hb per unit at 70 kg; FFP 250 mL plasma; platelets small volume
```

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Crystalloid intravascular fraction during infusion | emergent | 0.55 | 0.5–0.6 | fraction | fluid challenge response | Hahn2016 | [TXT] via summary | Q47 |
| Crystalloid fraction 30 min after end | emergent | 0.2 | 0.15–0.25 | fraction | the fading response | Hahn2016 | [TXT] | Q47 |
| Distribution time constant | `tauDist` | 10 | 8–15 | min | as above (distribution complete by 25–30 min) | Hahn2016 | [ENG] fitted | Q47 |
| Elimination half-life (awake / GA) | `t12El` | 30 / 150 | 20–40 / 90–480 | min | fluid accumulates under GA (low UOP) | Hahn2016 | [TXT] | — |
| Colloid persistence | `t12Colloid` | gelatin 150, albumin 5 % 600 | — | min | — | [TXT] | [VERIFY] | — |
| Plasma refill after haemorrhage | `refill` | 0.25 | 0.1–0.5 | mL/kg/min early, decaying τ 60 min | Hb drift, partial autotransfusion | [TXT] | [ENG] | — |
| Hb rise per RBC unit | — | +1.0 | 0.7–1.2 | g/dL at 70 kg | transfusion scenario | [TXT] | [TXT] | — |
| Cold unit effect on core | — | −0.25 °C per unwarmed unit | 0.1–0.3 | °C | heat model | [TXT] | [VERIFY] | — |

---

## 5c. Endocrine, metabolism and thermoregulation (R32; sub-stage 7e)

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Nociceptive stimulus | `noxious` | 0 (none) → 1 (incision) → 1.5 (laryngoscopy, sternotomy) | 0–2 | — | drives `sympStress` unless depth/analgesia suppress it | [ENG] | [ENG] | Q48 |
| Acute sympathetic stress | `sympStress` | = noxious × (1 − antinociception), antinociception from opioid Ce/C50 and depth index | 0–1 | — | HR +15–25 %, SVR +15–25 %, MAP +20–30 mmHg at 1.0; onset τ 20–40 s, offset τ 2–4 min | [TXT] pattern (response to laryngoscopy) | [ENG] numbers | Q48 |
| Catecholamine surge (hypovolaemia, hypoglycaemia, hypercapnia) | adds to baroreflex e_s | — | — | — | already in brief chemoreflex; extended here | B §4.9 | [TXT] | — |
| Cortisol response | `cortisol` | 400 → > 1500 nmol/L, peak 4–6 h after incision | — | nmol/L | slow: glucose ↑, vasopressor responsiveness (adrenal insufficiency condition: ×0.5) | Desborough2000 | [TXT] via summary | — |
| Glucose (Bergman minimal model) | `glucose` | 5.5 mmol/L (100 mg/dL) | 2–30 | mmol/L | dG/dt = −(SG + X)·G + SG·Gb + Ra/V_G ; dX/dt = −p2·X + p3·(I − Ib) | Bergman (AJP 1998) | [TXT] | — |
| Glucose effectiveness | `SG` | 0.026 | 0.008–0.038 | /min | — | Bergman1998 | [TXT] via summary | — |
| Insulin sensitivity | `SI` | 8.3e-4 (diabetic 1–3e-4; stress ×0.3–0.5) | 0.2–22.6e-4 | /min per µU/mL | response to insulin/dextrose | Bergman1998 | [TXT] | — |
| Remote-insulin rate | `p2` | 0.025 | 0.01–0.05 | /min | insulin effect time course (onset 15–30 min) | not found | [ENG] | — |
| Glucose distribution volume | `vG` | 1.7 | 1.5–2 | dL/kg | — | [TXT] | [VERIFY] | — |
| Hypoglycaemia levels | alarm | L1 < 3.9 (70), L2 < 3.0 (54), neuroglycopenia ~2.8 (50) | — | mmol/L (mg/dL) | sympathetic surge (masked by GA/β-block), BIS ↓, seizures < 1.7–2.2 | ADA2025 | [TXT] | — |
| Hyperglycaemia | — | peri-op target 7.8–10 (140–180); osmotic diuresis > 10–11 | — | mmol/L | UOP ↑, dehydration over hours | ADA; [TXT] | [TXT] | — |
| Hyperthyroid / storm `hyperthyroid` | multipliers | HR 110–150 (AF hazard ×5), Ees ×1.3, R ×0.6, VO2 ×1.3–1.8, T 38.5–41 (storm), β-agonist sensitivity ×1.5 | — | × | storm scenario; esmolol response | Klein2007 | [TXT] | — |
| Awake thermoregulatory thresholds | `thrSweat`, `thrVaso`, `thrShiver` | 37.2 / 36.9 / 36.0 | ±0.3 | °C | heat model responses | OA-hypothermia | [TXT] | — |
| GA thresholds | same | sweat 38.0, vasoconstriction 34.5, shivering 33.5 (interthreshold 0.2 → ~4 °C) | vaso 34–35 | °C | Stage 3 plateau at 34.5–35.5; shivering only after emergence or at 33.5 | OA-hypothermia (Sessler 34.4 ± 0.2) | [P] | — |
| Shivering | `shiver` | VO2 ×2–3 (up to ×5 brief), 4–8 Hz artefact on ECG/pleth, SpO2 unreliable | — | × | post-op shivering scenario; pethidine 25 mg stops it | [TXT] | [TXT] | Q49 |
| MAC vs temperature | `macFactor` | −5 %/°C | 4–5 %/°C | %/°C | depth §5d | OA-hypothermia | [P] | — |
| Fever | `tempSet` | +1–3 °C | — | °C | HR +8–10 /°C, VO2 +7–10 %/°C, SVR ↓ | [TXT] | [TXT] | — |
| Hypothermia stages | — | 35–32 mild: shivering, HR ↑→↓, coagulopathy < 33 (trauma); < 32 AF/brady, arrest risk ↑; < 28 VF likely; Osborn J from 32 | — | °C | ECG modifiers (Stage 5), arrest hazard, drug clearance | ICAR2016 (PMC5025630) | [P] | — |

---

## 5d. Neuromuscular block and anaesthetic depth (R32; sub-stage 7f)

**NMB PD.** Effect-site Ce from a 3-compartment PK plus ke0 (§6). Receptor-level block is `B = Ce^γ/(Ce^γ + EC50^γ)`, and T1 = 1 − B. The adductor pollicis, which drives TOF, and the diaphragm/larynx, which drive breathing and the capnogram cleft, have separate EC50 and ke0. The diaphragm needs about 1.7× the concentration and has a shorter ke0 t½ (Plaud). So the capnogram shows a curare cleft and spontaneous effort returns while TOF is still 0–1. TOF count: T4 disappears at T1 ≈ 25 % (75 % depression), T3 at 20 %, T2 at 10 %, T1 at ≈ 0–5 % [TXT, classic; VERIFY]. TOFR for a non-depolariser: TOFR ≈ T1^2.5, capped at 1 [ENG: gives TOFR 0.9 at T1 0.96 and 0.7 at T1 0.87]. Succinylcholine: no fade (phase I), TOFR ≈ 1 at any T1. PTC appears when T1 = 0 and B < 0.99 [ENG].

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Receptor occupancy before twitch falls | — | 75–80 %; complete block at 90–95 % | — | % | why TOF 4/4 ≠ recovered | Waud1975 | [P] | — |
| Rocuronium CL / Vss | PK | 0.25 L/kg/h (≈ 4.2 mL/kg/min) / 0.25 L/kg; t½β 1.4 h | ICU CL 3.2 mL/kg/min | — | duration | Roc-label | [P] | — |
| Rocuronium ke0 (adductor pollicis) | `ke0Roc` | 0.16 (t½ke0 4.4 min) | 0.08–0.25 (depends on the PK model it is paired with) | /min | onset | Plaud1995; Ezzine2007 | [P] | — |
| Rocuronium EC50 (thumb / larynx-diaphragm) | `ec50Roc` | 823 / 1424 | ±20 % | ng/mL | differential recovery | Plaud1995 | [P] | — |
| Rocuronium Hill γ | `gammaRoc` | 4.8 | 3.9–5.7 (paediatric values) | — | steepness | adult not found | [VERIFY] | — |
| **Rocuronium targets the model must hit** | test | 0.6 mg/kg: max block 1.8 min, clinical duration (T1 25 %) 31 min; 1.2 mg/kg: 1.0 min, 67 min | label ranges | min | calibrates the rows above | Roc-label | [P] | — |
| Vecuronium 0.1 mg/kg | test | max block 3–5 min; clinical duration 25–30 min | — | min | — | Vec-label | [P] | — |
| Cisatracurium 0.15 mg/kg | test | max block ≈ 2–3 min (adult [VERIFY]); duration ≈ 45 min; Hofmann (organ-independent) | — | min | — | Cis-label | [P] paediatric/maintenance | Q50 |
| Succinylcholine 1 mg/kg | test | block ~1 min; T1 10 % at 7.1 min, 90 % at 10.9 min; pseudocholinesterase heterozygous ×2, homozygous 4–8 h | — | min | — | Sux-label; Lee2009 | [P] | — |
| Sugammadex 2 mg/kg at T2 | test | TOFR 0.9 median 2.2 min (2.5 at 65–74 y, 3.6 at ≥ 75) | — | min | reversal | Sgx-label | [P] | Q51 |
| Sugammadex 4 mg/kg at 1–2 PTC | test | TOFR 0.9 median 2.7 min | IQR 2.1–4.3 | min | — | Sgx-label | [P] | Q51 |
| Sugammadex 16 mg/kg, 3 min after roc 1.2 | test | T1 10 % ≈ 1.2 min after the dose | — | min | CICO rescue | Sgx-label | [P] | Q51 |
| Sugammadex mechanism | PK | 1:1 molar binding of free rocuronium in plasma (MW 2178 vs 610), instant; Ce washout by ke0 | — | — | recurarisation if underdosed | [TXT] | [ENG] | — |
| Neostigmine 0.03–0.07 mg/kg (max 5 mg) | PD | onset 1–3 min, peak ~10 min; **ceiling**: cannot reverse from TOF count < 2 (reversal limited to ~T1 +40 %); muscarinic bradycardia unless glycopyrrolate/atropine | — | — | brief drug row | Neo-label; BJAEd2020 | [P] ceiling; [TXT] peak | — |

**Anaesthetic depth.** Volatile agents use an end-tidal → brain lag, τ 2–4 min [ENG]. The age-adjusted MAC fraction is `MAC(age) = MAC40·10^(−0.00269·(age − 40))`, about −6 % per decade (Mapleson). IV agents use Ce (§6). Depth index (a BIS-like 0–100 value, **not** a BIS algorithm, displayed with a 15–30 s smoothing lag): `DI = 93·(1 − U^γ/(U^γ + 1))`, where U = Ce_prop/Ce50_prop(age) + MAC_frac/MAC_DI50 + 0.2·U_opioid. Opioids alone barely move BIS; they shift the others (Eleveld 2024 form, extended [ENG]).

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Sevoflurane MAC at 40 y | `mac40Sevo` | **1.80** (Mapleson) | 1.8–2.1 (label 2.1) | % atm | all MAC-indexed effects | Mapleson1996 vs label | [P] both | Q52 |
| Isoflurane / desflurane / N2O MAC at 40 y | `mac40*` | 1.17 / 6.6 / 104 | — | % atm | — | Mapleson1996 | [P] | — |
| MAC-awake | `macAwake` | 0.33 MAC | 0.22–0.34 | MAC | awareness risk, emergence | Katoh1993 | [TXT] via abstract | — |
| MAC reduction by opioid | `macOpioid` | −50 % at fentanyl Ce ≈ 1.5 ng/mL (remifentanil ≈ 1.2) [VERIFY] | −30 to −70 % | × | balanced anaesthesia | [TXT] | [VERIFY] | — |
| Propofol Ce50 for BIS | `ce50PropBis` | 3.08·e^(−0.00635·(age − 35)) | 2.5–5 | µg/mL | depth index | Eleveld BIS 2024 | [TXT] via summary | Q53 |
| γ (below / above Ce50) | — | 1.89 / 1.47 | — | — | slope | Eleveld BIS 2024 | [TXT] | — |
| DI at 1 MAC volatile | `MAC_DI50` calibration | DI ≈ 40–45 at 1.0 MAC | 35–50 | — | calibrates the volatile term | [ENG] | [ENG] | Q53 |
| Ketamine, N2O on DI | — | ketamine ↑ DI (paradox), N2O ~0 | — | — | teaching artefacts | [TXT] | [TXT] | — |
| EMG artefact | — | +10–20 DI when unparalysed and stimulated | — | — | NMB interaction | [TXT] | [ENG] | — |
| Burst suppression | — | DI < 20–30; suppression ratio shown | — | — | — | [TXT] | [TXT] | — |

**Respiratory-drive depression (feeds §4.6).**

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Remifentanil C50 for ventilation | `c50RemiVent` | 0.92 (Hill 1.25; ke0 for CO2 0.92/min) | 0.9–1.5 | ng/mL | VE at a given PaCO2 falls with a sigmoid of Ce | Bouillon2003 | [P] | — |
| Remi bolus 0.5 µg/kg | test | CO2-response slope 0.99 → 0.27 L/min/mmHg at 2–2.5 min; back within 15 min | — | L/min/mmHg | validation target | Babenco2000 | [P] | — |
| Remi 1 ng/mL steady state | test | resting VE −28 %; VE at PetCO2 55 −58 % | — | % | validation target | Nieuwenhuijs2003 | [P] | — |
| Propofol 1 µg/mL steady state | test | resting VE −13 %; VE at PetCO2 55 −44 %; opioid–propofol synergy | — | % | — | Nieuwenhuijs2003 | [P] | — |
| Opioid breathing pattern | — | RR falls more than VT (slow, deep); apnoea when Ce ≫ C50 | — | — | teaching sign (RR 6–8) | [TXT] | [TXT] | — |
| Propofol/volatile pattern | — | VT falls, RR rises (rapid, shallow) until apnoea | — | — | contrast with opioids | [TXT] | [TXT] | — |
| Fentanyl relative potency (Ce) | `potFent` | 1.6 × remifentanil (EEG EC50 6.9 vs 11.2 ng/mL) | 1–2 | × | fentanyl ventilatory C50 ≈ 0.6 ng/mL | Scott-Stanski1985; Minto1997 | [ENG] derived | Q54 |
| Volatile at 1 MAC | `co2Slope` × | ×0.4 (−60 %); apnoeic threshold 4–5 mmHg above resting PaCO2 | ×0.3–0.5 | × | spontaneous ventilation under GA | [TXT] | [TXT] | — |

---

## 5e. System-level conditions (R32; sub-stage 7f)

Each condition is a time-varying bundle of the multipliers already defined. A scenario drives `severity(t)`; the engine never hard-codes a trajectory.

**Sepsis** (`sepsis`, phase = SIRS / sepsis / septic shock warm / cold):

| Symbol | SIRS | Sepsis | Septic shock, warm (resuscitated) | Septic shock, cold (late / cardiomyopathy) | Source | Tag | Q |
|---|---|---|---|---|---|---|---|
| `tempSet` | 38.3 | 38.5–39.5 (or < 36) | 38.5–40 | 36–38 | [TXT] | [TXT] | — |
| `hrRest` + | +20 | +30 | +40–50 (HR 110–130) | +30 | [TXT] | [TXT] | — |
| `WK_R0` × (SVR) | 0.85 | 0.7 | **0.4–0.55** (SVR 500–700 dyn) | 1.0–1.2 | SepticCM; Hyperdyn-Pmsf | [TXT] | — |
| `V0` (unstressed, venodilation) | +2 % V | +5 % | +10–15 % | +10 % | Hyperdyn-Pmsf | [ENG] | Q55 |
| Capillary leak `kfMult` | 1.5 | 2 | 3 | 3–4 | [TXT] | [ENG] | Q55 |
| `eesLV`, `eesRV` × | 1 | 1 | 0.8 (≈ 30 % have EF < 40 % reversible) | **0.4–0.6** | SepticCM (prevalence 10–70 %, ~28 %) | [TXT] | Q55 |
| `vo2` × | 1.1 | 1.2 | 1.3 | 1.1 | [TXT] | [TXT] | — |
| `erMax` (microcirculatory shunt) | 0.7 | 0.6 | 0.5 (ScvO2 high despite lactate) | 0.5 | [TXT] | [ENG] | — |
| `vasoResp` × (catecholamine sensitivity) | 1 | 0.9 | 0.6 | 0.5 | [TXT] | [ENG] | — |
| lactate (emergent target) | < 2 | ≥ 2 | 2–4 | > 4–8 | Sepsis-3 | [TXT] | — |
| shunt (ARDS progression) | +0 | +0.03 | +0.05–0.15 | +0.1–0.3 | [TXT] | [ENG] | — |
| PI (emergent) | normal | normal | high (vasodilated, warm) | < 0.3 (mottled) | B §4.3 | [TXT] | — |

**Anaphylaxis** (`anaphylaxis`, grade by Ring–Messmer I–IV; onset 1–10 min after an IV trigger):

| Symbol | Grade II | Grade III | Grade IV | Time course | Source | Tag | Q |
|---|---|---|---|---|---|---|---|
| `WK_R0` × | 0.7 | 0.3–0.5 | 0.2 | onset τ 1–3 min | [TXT] | [ENG] | Q56 |
| `V0` + (pooling) | +5 % V | +15–20 % | +25–35 % | min | Fisher 1986 (up to 35 % volume shift in 10 min) | [VERIFY] | Q56 |
| `kfMult` | 3 | 8 | 10 | min | [TXT] | [ENG] | — |
| `raw` × (bronchospasm) | 1.5 | 2–4 | 4+ | 1–5 min | B §4.9 conditions | [TXT] | — |
| HR | +20–30 | +40 (brady in ~10 %) | arrest (PEA) | — | [TXT] | [TXT] | — |
| Epinephrine response | 10–20 µg IV | 50–100 (–200) µg IV, repeat / infusion | ALS 1 mg | effect in 1–2 min | [TXT] | [TXT] | Q56 |

**SIRS / inflammation** (post-bypass vasoplegia, major surgery day 1): `WK_R0` ×0.7–0.85, `tempSet` +1, `vo2` ×1.1–1.2, `kfMult` 1.5, glucose ↑ via SI ×0.5 [TXT/ENG]. **Hypothermia cascade**: the §5c stages table. **Hyperthermia**: fever (§5c), MH (§5.3), thyroid storm (§5c), and serotonin syndrome and neuroleptic malignant syndrome as `hypermetabolic` severity with VO2 ×1.5–3, `tempSet` or heat production ↑ and HR ↑ [TXT].


---

## 6. Drug PK/PD extensions (sub-stage 7g)

**Implementation (7g):** values as coded live in `packages/engine-core/src/l2/pk/data/*.ts` and `l2/pk/nmb.ts`; deviations D1–D5, D7 and the fentanyl/sufentanil vent-ke0 item are in `docs/plans/stage-7g-pkpd.md`.

**Base.** Brief §4.9's v1 drug set and research 03 §8.6 (direction of effect and onset/peak/duration) stay as they are. This section adds (a) which drugs get a **3-compartment PK model with an effect site**, (b) **dose–response** for the vasoactive infusions, and (c) per-MAC effects for the volatile agents. A drug's effect always acts through the multipliers already defined: `hrSet`, `eesLv/Rv`, `WK_R0`, `V0`, `pvr`, `G_v`, `co2Slope`, the depth index and NMB. So one dose moves every channel consistently.

**Rule for a ke0.** A ke0 belongs to the PK model it was fitted with. Never pair Schnider's ke0 with Marsh's PK, or the reverse [Marsh-ke0 note; Roc ke0 range 0.08–0.25 by PK model].

### 6.1 Three-compartment PK + effect site (Ce drives PD)

| Drug | Model (default · alternatives) | Key parameters (reference patient) | ke0 (/min) | PD targets it must hit | Source | Tag | Q |
|---|---|---|---|---|---|---|---|
| Propofol | **Eleveld 2018** · Schnider · Marsh | Eleveld (35 y, 70 kg, 170 cm, M, no co-drugs): V1 6.28, V2 25.5, V3 273 L; CL 1.79, Q2 1.75, Q3 1.11 L/min; covariates age, PMA, weight (allometric), height, sex, opioid co-administration. Schnider: V1 4.27 L, V2 = 18.9 − 0.391(age − 53), V3 238 L, Cl1 = 1.89 + 0.0456(W − 77) − 0.0681(LBM − 59) + 0.0264(H − 177), Cl2 = 1.29 − 0.024(age − 53), Cl3 0.836. Marsh: V1 0.228 L/kg, k10 0.119, k12 0.112, k13 0.0419, k21 0.055, k31 0.0033 | Eleveld 0.146 (× (W/70)^−0.25); Schnider 0.456 (TTPE 1.6 min); Marsh 0.26 (Diprifusor) or 1.21 (modified) | LOC C50 2.35/1.8/1.25 µg/mL at 25/50/75 y (Schnider); BIS per §5d; MAP ≈ 70 % of baseline at 2 min after 2 mg/kg (brief sanity check 3) | Eleveld2018; Schnider1999; Marsh (via secondary) | [P] Eleveld/Schnider; [TXT] Marsh | Q57 |
| Remifentanil | **Minto 1997** · Eleveld 2017 | V1 = 5.1 − 0.0201(age − 40) + 0.072(LBM − 55); Cl1 = 2.6 − 0.0162(age − 40) + 0.0191(LBM − 55); population means V1 4.98, V2 9.01, V3 6.54 L; Cl1 2.46, Cl2 1.69, Cl3 0.065 L/min | 0.595 − 0.007(age − 40) (mean 0.516) | CSHT 3.2 min after 3 h; ventilation C50 0.92 ng/mL (§5d); EEG EC50 11.2 ng/mL | Minto1997; Kapila1995; Bouillon2003 | [P] | — |
| Fentanyl | **Shafer 1990** PK (coefficients from OpenTCI) | PK not re-read this session | **0.147** (Shafer–Varvel refit, TTPE 3.6 min) vs 0.108 (Scott–Stanski, t½ke0 6.4 min) | peak effect 3–4 min; EEG EC50 6.9 ng/mL; ventilation C50 ≈ 0.6 ng/mL (derived, §5d) | Scott-Stanski1985; Shafer-Varvel1991 | [VERIFY] PK | Q58 |
| Sufentanil / alfentanil | Gepts / Maitre (optional; only if used locally) | — | — | — | [TXT] | [VERIFY] | Q59 |
| Rocuronium | 2–3 compartments (label CL 0.25 L/kg/h, Vss 0.25 L/kg; Szenohradszky controls V1 5.96 L, CL 217 mL/min) | two effect sites (thumb, diaphragm) §5d | 0.16 (thumb), 0.26 (larynx/diaphragm) | label onset/duration table (§5d) | Roc-label; Plaud1995 | [P] | — |
| Vecuronium, cisatracurium, succinylcholine | fitted to their label onset/duration (§5d) | cisatracurium Hofmann: CL organ-independent | fitted | §5d targets | labels | [P] | Q50 |
| Sugammadex | binding model: 1:1 molar with free rocuronium/vecuronium | — | instantaneous in plasma; Ce washout via rocuronium ke0 | §5d targets | Sgx-label | [P]/[ENG] | Q51 |
| Volatile agents | alveolar wash-in (FA/FI) from the ventilator link + brain τ | FA/FI at 30 min: des ~0.9, sevo ~0.85, iso ~0.73 [VERIFY] | brain τ 2–4 min | MAC-indexed effects (§6.3) | Yasuda 1991 [TXT] | [VERIFY] | — |

**Kept as gamma effect curves** (brief §4.9 `E(t) = Emax·(t/tp)^n·e^(n(1 − t/tp))`, onset/peak/duration from research 03 §8.6): all vasoactive **boluses**, atropine, glycopyrrolate, neostigmine, adenosine, amiodarone, lidocaine (antiarrhythmic), calcium, bicarbonate, magnesium, ketamine, etomidate, midazolam, morphine, pethidine, dexmedetomidine and thiopental in v1. Of these, ketamine, midazolam and dexmedetomidine are candidates for Ce models in v1.1. **Infusions** use a first-order approach to the steady-state effect with τ_on/τ_off from each row below.

### 6.2 Vasoactive dose–response (infusions: `E = Emax·C^n/(C^n + EC50^n)` on each multiplier; `n` = 1 unless stated)

| Drug | Usual dose | HR | Contractility (`ees`) | SVR (`WK_R0`) | Venous (`V0`) | PVR | τ on / off | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|---|---|
| Phenylephrine | bolus 50–100 µg (label 40–100, repeat to 200 q1–2 min); infusion 10–35 µg/min (label; max 200) ≈ 0.15–0.5 µg/kg/min; obstetric ED90 0.54 µg/kg/min | reflex only | ~ | bolus 100 µg: ×1.35 at peak [ENG, fitted to MAP +15–25]; infusion Emax +100 %, EC50 0.5 µg/kg/min | −3 % of V (preload ↑) | ×1.1 | 1 / 5–10 min (bolus: 30–60 s / 1–2 / 15–20 min) | Phe-label; B §4.9 sanity 1 | [P] dose; [ENG] EC50 | Q60 |
| Norepinephrine | label start 8–12 µg/min, maintain 2–4 µg/min; ICU 0.05–0.5 µg/kg/min | ~/reflex ↓ | Emax +25 %, EC50 0.1 | Emax +150 %, EC50 0.15 µg/kg/min | −5 % | ×1.1 | 1–2 / 2–3 min | NE-label; B §4.9 | [P] dose; [ENG] E | Q60 |
| Epinephrine | 0.01–0.05 µg/kg/min (β), > 0.1 (α); label 0.05–2 (sepsis); push 10–20 µg | +20–30 %, EC50 0.05 | Emax +60 %, EC50 0.04 | β2 ×0.9 at low dose; α Emax +120 % with EC50 0.2 | −5 % | ~ | 1 / 2–3 min | Epi-label | [P] dose; [ENG] E | Q60 |
| Vasopressin | 0.01–0.07 U/min (typical 0.03–0.04); post-cardiotomy 0.03–0.1 | ~/↓ | ~ | +40 % at 0.04 U/min, Emax +80 %; not blunted by acidosis | ~ | ~1.0 (spares PVR) | 5 / 10–20 min | Vaso-label; [TXT] | [P] dose; [ENG] E | — |
| Ephedrine | 5–10 mg bolus (label 5–25) | +10–15 % | +15–20 % | +10–15 % | −3 % | ~ | ~1 / 4–5 / ~60 min; **tachyphylaxis**: each repeat ×0.7 [ENG]; weaker when catecholamine-depleted | Eph-label (direct + indirect) | [P] mechanism; [ENG] numbers | Q59 |
| Dobutamine | 2–20 µg/kg/min | +5–15 (label) | Emax +80 %, EC50 7 | ×0.85 at 10 µg/kg/min | ~ | ×0.9 | 2 / 2–5 min | Dobu-label (SBP +10–20, HR +5–15) | [P]/[ENG] | — |
| Milrinone | 50 µg/kg over 10 min, then 0.375–0.75 µg/kg/min; t½ 2.3–2.4 h (renal: CKD ×2–3) | +5 % | +30 % at 0.5 | SVR −17 / −21 / −37 % at 0.375 / 0.5 / 0.75 (label); MAP −5 % / −5 % / −17 % | +5 % | ×0.75 | load 10 min; off t½ 2.4 h | Mil-label | [P] | — |
| Dopamine | 2–20 µg/kg/min | +10–25 % above 5 | +30 % at 5–10 | ↑ above 10 | — | — | 2 / 5 min | [TXT] | [TXT] | Q59 |
| Nitroglycerin | adult 10–200 µg/min; bolus 50–100 µg; paediatric label 0.5–5 µg/kg/min | reflex ↑ | ~ | ×0.85 at 1 µg/kg/min (arterial at higher doses) | **+10–15 % of V at 1 µg/kg/min** (venous-dominant) | ×0.8; HPV inhibited (§4.2) | 1–2 / 5–10 min | NTG-label (venous > arterial) | [P] qualitative; [ENG] | — |
| Esmolol | load 0.5 mg/kg over 1 min (peri-op 1 mg/kg over 30 s); 50–300 µg/kg/min | −10 % per 100 µg/kg/min, Emax −35 % | −10–20 % | ~ | ~ | ~ | t½ 9 min, distribution 2 min | Esmolol-label | [P] | — |
| Labetalol / metoprolol (bolus) | 5–20 mg / 1–5 mg | −10–20 % | −10 % | labetalol −10–15 % (α1) | — | — | onset 2–5 min, duration 2–6 h | [TXT] | [TXT] | Q59 |

**Antiarrhythmics and anticholinergics** extend the brief rows with numbers. Amiodarone 150 mg over 10 min (300 mg in arrest): HR −10 %, SVR −10–20 % (solvent), QTc +20–40 ms [ENG], raises the AF→sinus conversion probability (Stage 5). Lidocaine 1–1.5 mg/kg: VT suppression; LAST thresholds at plasma ~5 µg/mL (CNS) and > 10 µg/mL (CV) [TXT]. Magnesium 2 g over 1–2 min terminates TdP (Stage 5). Verapamil 2.5–5 mg / diltiazem 0.25 mg/kg: AV-node block, SVR −15 % [TXT]. Atropine 0.5–1 mg (child 0.02 mg/kg): HR +20–40, scaled by resting vagal tone (elderly less; transplanted heart none). Glycopyrrolate 0.2–0.4 mg: HR +10–20, onset 2–3 min, 2–4 h [TXT; B §4.9].

### 6.3 Anaesthetic agents: per-MAC and per-Ce effects (multipliers; E = the agent's fractional effect)

| Agent | SVR (`WK_R0`) | Ees | HR | Venous V0 | Baroreflex G_v | Other | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|---|
| Sevoflurane (per MAC) | ×(1 − 0.20·MAC) | ×(1 − 0.10·MAC) | ~ | +3 %/MAC | ×(1 − 0.3·MAC) | CBF §5.1; HPV §4.2; drive §5d; MAC 1.80 (Q52) | Malan1995 (MAP ↓, HR ~, CI ↓ at 1–1.5 MAC) | [P] direction; [ENG] size | Q61 |
| Isoflurane | ×(1 − 0.25·MAC) | ×(1 − 0.10·MAC) | +5–10 % | +3 %/MAC | ×(1 − 0.3·MAC) | stronger cerebral vasodilator (Matta) | [TXT] | [ENG] | Q61 |
| Desflurane | as isoflurane | as isoflurane | as isoflurane, **plus a sympathetic surge** on a rapid increase above 1 MAC: HR +20–30 %, MAP +20 % for 2–4 min | — | — | airway irritant (bronchospasm hazard ×2 in smokers/asthma) | [TXT] | [TXT] | — |
| N2O (per 0.5 MAC-equivalent) | ×1.05 | ×0.95 | ~ | — | — | PVR ×1.1–1.3 (worse in PH); expands closed gas spaces (pneumothorax volume roughly doubles in ~10 min at 70–75 %); MAC 104 | [TXT] (Eger & Saidman 1965) | [VERIFY] | — |
| Propofol (E = Ce/(Ce + 3.5 µg/mL)) | ×(1 − 0.45·E) | ×(1 − 0.2·E) | ~/↓ | +8 %·E | ×(1 − 0.6·E) | calibrated to brief sanity check 3 | PMC10651705 (R03) | [ENG] fitted | Q62 |
| Thiopental 3–5 mg/kg | −20 % | −15 % | +10–15 % | +8 % | ×0.6 | — | [TXT] | [TXT] | Q59 |
| Ketamine 1–2 mg/kg | +15–25 % via sympathetic drive; direct Ees ×0.9 (unmasked when catecholamine-depleted) | — | +15–20 % | — | — | CBF §5.1; airway reflexes kept | [TXT] | [TXT] | — |
| Etomidate 0.3 mg/kg | MAP −0–10 % | ~ | ~ | — | — | adrenal suppression (cortisol response ×0.5 for 24 h) | [TXT] | [TXT] | — |
| Midazolam 0.05–0.1 mg/kg | −10–15 % | ~ | ~ | +3 % | ×0.8 | synergy with opioids on breathing | [TXT] | [TXT] | — |
| Dexmedetomidine 1 µg/kg over 10 min, then 0.2–0.7 µg/kg/h | biphasic: SVR +15 % during a fast load, then −10–20 % | ~ | −10–20 % | — | — | minimal respiratory depression | [TXT] | [TXT] | — |
| Fentanyl / remifentanil | −5–15 % (sympatholysis) | ~ | −10–20 % (vagal) | +3 % | ~ | chest-wall rigidity at high bolus (compliance ×0.3, rare) | [TXT] | [TXT] | — |
| Pethidine 25–50 mg | −5–10 %; histamine | ~ | +5–10 % (anticholinergic) | — | — | stops shivering (§5c) | [TXT] | [TXT] | Q49 |


---

## 7. Sanity-check scenarios the finished model must reproduce

Brief §4.9's nine checks stay: phenylephrine 100 µg, ATLS I–IV, propofol induction, CO = VR convergence, apnoea (adult, preoxygenated, room air, child), CO2 kinetics, VF and asphyxial timelines. Checks 10–25 are added below. Each is a scenario JSON (`pme-scenario/1`) plus an automated assertion on **truth** (L1), with the displayed values checked separately for device lag. Tolerances are ±15 % of each stated change unless a range is given [ENG]. **Q63.**

| # | Scenario (profile → events) | Must reproduce (numbers) | Sections |
|---|---|---|---|
| 10 | **75 y, AS (AVA 0.7) + 3-vessel CAD + HTN; propofol 1.5 mg/kg** | MAP 103 → 60–65 at 2 min (a deeper fall than the healthy 70 %); ST ↓ ≥ 1 mm in V5 within 3 min of MAP < 70; Ees_LV falls ≥ 25 %. Phenylephrine 100 µg at 2.5 min: MAP ≥ 85 within 90 s, HR −5–10, ST back to < 0.5 mm within 3 min. Same run with ephedrine 10 mg instead: MAP rises more slowly (peak at 4–5 min), HR +10–15, ST depression persists at 5 min. No rescue: VT/VF hazard > 0 by 5 min | §2, §3, §6 |
| 11 | **Severe MR (chronic, RF 0.45) + 1.5 L crystalloid over 30 min** (or acute ischaemia raising RF to 0.6) | PCWP 15 → > 25 by 15–25 min; EVLWI > 10 by 30–40 min; SpO2 (FiO2 0.21) 96 → 89–92; spontaneous RR 16 → 26–30; ventilated: Pplat +5–8 cmH2O (Crs −20–30 %), Pa–EtCO2 gap +3–6 mmHg; PEEP 10: SpO2 +3–5 with CO −5–10 %; NTG 1 µg/kg/min: PCWP −5–10 within 10–20 min | §2, §4.5 |
| 12 | **Massive PE** (φ 0 → 0.6 in one step, ventilated) | within 3 breaths EtCO2 35 → 20–25 (PaCO2 +3–8); CO −40–60 % within 5 beats; HR +20–40 in 30 s; CVP +8–12; mPAP 30–40 (never > 45); SpO2 falls to 85–92 over 1–2 min on FiO2 1.0; φ 0.8 with Ees_RV 0.4 → PEA | §2 H5, §4.4 |
| 13 | **Tension pneumothorax** (pPtx 0 → 20 mmHg over 3 min, ventilated) | Ppeak +10–20 cmH2O; CVP +5–15; SBP < 90 by 3 min; SpO2 −5–15; EtCO2 falls with CO; PEA by 5–8 min untreated; decompression: BP recovers within 1–2 min | §2 H6 |
| 14 | **Tamponade** (post-op bleeding 20 mL/min into the pericardium) | at ~150–200 mL: CVP ≈ PAD ≈ PCWP 15–20 (within 5); pulsus paradoxus > 10 mmHg if spontaneous; HR ↑, PP narrows; 500 mL fluid helps briefly; drain 50 mL → MAP +15–25 | §2 H7 |
| 15 | **RV infarct** (inferior STEMI + Ees_RV ×0.35) | CVP 14–18, PCWP 8–12, MAP 60–70, SpO2 normal; NTG 400 µg SL/IV → MAP −20–30 %; 500 mL fluid → MAP +5–10; CHB hazard ↑ | §2 H8, §3 |
| 16 | **Septic shock, warm → cold over 60 scenario-minutes** | warm: MAP 55–60, HR 115–130, CO 7–9 L/min, SVR 500–700 dyn, PI high, lactate 3–4, T 39; fluid 30 mL/kg → MAP +5–10 fading within 30–60 min; NE 0.1–0.3 µg/kg/min → MAP 65–70. Cold: CO 3–4, SVR 1200–1500, PI < 0.3, lactate > 6, EtCO2 < 28; dobutamine 5–10 or epinephrine 0.05 raise CO 20–40 % | §5e, §6 |
| 17a | **Class III haemorrhage (35 %, 1750 mL over 10 min), no β-blocker** | HR 120–140, SBP 80–90, PP 20–25, PPV > 20 %, spontaneous RR 28–35, PI −50–70 %, EtCO2 −5–8, UOP < 0.3 mL/kg/h, lactate 3–5 by 30 min | brief §8.5; §5 |
| 17b | **Same bleed, chronic β-blocker** | HR 80–95 (shock index < 1 despite shock), SBP 65–80 (hypotension comes earlier), CO lower than 17a; ephedrine response ×0.5; fluids work as in 17a | §1.5, §6 |
| 18 | **75 y hypertensive (cbfLL 75) under GA at MAP 65; hyperventilation PaCO2 40 → 25** | CPP ≈ 55 is below the shifted lower limit, so CBF ≈ 70 % of the anaesthetised baseline from pressure alone, then ≈ 35–40 % with hypocapnia; PbtO2 25 → 10–15 (below the 20 threshold); restoring PaCO2 35 and MAP 80 returns CBF > 80 % | §5.1 |
| 19 | **TBI, expanding haematoma 1 mL/min, PVI 20** | ICP rises slowly while CSF is displaced, then steeply: 12 → 20 by ~10–15 min → 40 by ~20–25 min; P2 > P1 from ICP ~20; CPP < 60 before ICP 30; at CPP < 40: MAP +30–50 over 30–60 s, HR 80 → 45–55, ataxic breathing; hyperventilation to PaCO2 30: ICP −25–30 % in 1–2 min; mannitol 1 g/kg: ICP −25 % over 15–30 min | §5.1 |
| 20 | **Oliguria in a low-flow state** (HFrEF, cardiogenic) | (MAP 65, CVP 12, RPP 53) UOP 0.1–0.15 mL/kg/h; dobutamine 5 µg/kg/min → CO +30 %, MAP 72, CVP 10 (RPP 62) → UOP 0.2–0.3 within 30–60 min | §5.2 |
| 21 | **MH** (sevoflurane + succinylcholine; severity 1) | EtCO2 at constant MV rises 40 → 60 by 10 min (and keeps rising 3–5 mmHg/min); HR 90 → 120+; T +1 °C by 15 min (fulminant +1–2 °C per 5 min); K 5.5–6.5 with peaked T by 20 min; VT hazard by 25–30 min; doubling MV only slows the EtCO2 rise; dantrolene 2.5 mg/kg: EtCO2 falls within 5–10 min, HR normal by 15–20 min | §5.3 |
| 22 | **Term pregnancy, spinal for caesarean, supine** | MAP 90 → 60–65 in 3–5 min (sympathectomy + ACC), HR ↑ (or brady from Bezold–Jarisch in 10 %); left tilt 15°: CO +15–25 %, MAP +10–15 in 1–2 min; phenylephrine 0.5 µg/kg/min keeps MAP ≥ 90 % of baseline | §1.4, §6 |
| 23 | **Term pregnancy, GA apnoea after preoxygenation** | SpO2 90 % at ~2.5–4 min (vs ~8 min non-pregnant) | §1.4 [VERIFY] |
| 24 | **Induction atelectasis vs FiO2** (Edmark protocol) | apnoea to SpO2 90 %: 411 / 303 / 213 s at FiO2 1.0 / 0.8 / 0.6 (±20 %); atelectasis 5.6 / 0.6 / 0.2 % | §4.1 |
| 25 | **Rocuronium 0.6 → sugammadex 2 mg/kg at T2** | max block 1.8 min; T1 25 % at ~31 min; TOFR 0.9 2.2 min after sugammadex; capnogram cleft and spontaneous effort return before TOF ≥ 2 | §5d |

---

## 8. Device modules (R28; sub-stage 7h, v1.1): summary rows only

These rows are for framing, not a full specification. Every device reads the §2 circulation, and its waveform signatures come out of that model rather than being drawn by hand. **Q64.**

**8.1 IABP** (in the aortic Windkessel as a volume source/sink, 30–50 mL balloon)

| Parameter | Default | Range | Waveform signature / effect | Source | Tag |
|---|---|---|---|---|---|
| Balloon volume | 40 mL | 25–50 by height | augmentation size | IABP-review PMC11307388 | [TXT] |
| Trigger | ECG R wave | ECG / pressure / pacer / internal (asynchronous in arrest) | loses trigger in AF/noise → alarms | LITFL-IABP | [TXT] |
| Ratio | 1:1 | 1:1, 1:2, 1:3 | 1:2 shows assisted and unassisted beats side by side (the teaching view) | [TXT] | [TXT] |
| Inflation timing | at the dicrotic notch | early (in systole) / late | **early**: augmentation starts before the notch, which is lost; LV afterload ↑, SV ↓. **Late**: notch visible, augmentation smaller | Deranged-IABP | [TXT] |
| Deflation timing | just before systole | early / late | **early**: U-shaped dip, assisted EDP ≈ unassisted, no afterload benefit. **Late**: assisted EDP ≥ unassisted, prolonged upstroke, LV works against the balloon | Deranged-IABP; LITFL-IABP | [TXT] |
| Target numbers | diastolic augmentation > unassisted SBP; assisted SBP ~5 below unassisted; assisted EDP 15–20 below unassisted | — | CO +0.5–1 L/min (~20 %); PCWP −20 %; coronary supply ↑ (§3: CPP from augmented diastolic pressure) | IABP-PMC4972967; EMCrit-IABP | [TXT] |

**8.2 LVAD** (continuous-flow; pump flow Q = f(speed, ΔP = P_ao − P_LV) from an HQ curve, in parallel with the aortic valve)

| Parameter | Default | Range | Waveform signature / effect | Source | Tag |
|---|---|---|---|---|---|
| Speed | 5400 rpm (HeartMate 3-like) | 3000–9000 (typical 4700–6200) | flow 4–6 L/min; aortic valve opening only when the LV exceeds P_ao | HM3-Abbott | [P] |
| Artificial pulse | on | — | speed modulation every 2 s (30 /min, asynchronous with the heart) → a small periodic pressure bump | HM3-Abbott | [P] |
| Flow estimate, low-flow alarm | from power and Hct | alarm at < 2.5 or < 2.0 L/min | console tile | HM3-Abbott | [P] |
| Power | 4–5 W | alarm on sustained ≥ 10 W (thrombus) | console tile | HM3-Abbott | [P] |
| Pulsatility index | 3–4 | clinical 1–10 | falls with hypovolaemia; a PI event drops the speed to the low limit, then ramps back | HM3-Abbott | [P] |
| Arterial line | pulse pressure 10–20 (or less) | — | MAP is the only reliable value (target < 90, Doppler "return to flow"); NIBP often fails; pleth small or absent, SpO2 may be unobtainable | HM3-Abbott; EMCrit-HM3 | [P] |
| Suction event | when LV volume < ~40 mL | — | flow drops, PI spikes, ventricular ectopy/VT hook (Stage 5) | [TXT] | [ENG] |

**8.3 ICD** (reads the Stage 5 rhythm identity and rate; therapies through the 4b defib/pacer layer)

| Parameter | Default | Range | Signature | Source | Tag |
|---|---|---|---|---|---|
| VF zone | ≥ 200–250 bpm, detection 30/40 intervals or ~6–12 s | vendor-specific | charge 5–15 s → internal shock artefact (smaller than external), per-lead recovery, post-shock pacing | ICD2019 (figures not machine-readable; values from the 2015/2019 consensus as commonly quoted) | [VERIFY] |
| VT zone | 185/200–230 bpm with ATP | — | **ATP**: burst of 8 pulses at 88 % of the VT cycle length (1–2 sequences) before a shock; also ATP during charging | ICD2019 | [VERIFY] |
| SVT discriminators | on up to ~230 bpm | — | inappropriate shock on fast AF/noise when discriminators fail (scenario) | ICD2019 | [VERIFY] |
| Magnet | tachy therapies suspended while applied; pacing unchanged | — | diathermy scenario | [TXT] | [TXT] |
| Storm | ≥ 3 VT/VF episodes in 24 h | — | scenario hook | [TXT] | [TXT] |

**8.4 Permanent pacemaker (Stage 7 additions)**

| Parameter | Default | Range | Signature | Source | Tag |
|---|---|---|---|---|---|
| Mode switch (DDD → DDI/VDI) | atrial tachycardia detection rate ≥ max tracking rate + 20 (e.g. 170–180) | up to 300 | AF onset → ventricular pacing at the lower/sensor rate instead of tracking the AF | AMS 17043069 | [P] abstract |
| Rate response | sensor-driven lower rate 60 → up to 120–130 | — | HR rises with the "activity" or stress term | [TXT] | [ENG] |
| Magnet | asynchronous DOO/VOO at the vendor magnet rate (~85–100) | vendor | ECG spikes with competition on native beats | [TXT] | [VERIFY] |
| Pacemaker-dependent failure | underlying CHB escape 30–35 or asystole | — | see §1.5 | R28 | [TXT] |

**8.5 ECMO**

| Parameter | VA default | VV default | Signature / effect | Source | Tag |
|---|---|---|---|---|---|
| Circuit flow | 4 L/min (~60–80 % of CO) | 5 L/min (> 60 % of CO for oxygenation) | VA: pulsatility and PP fall with flow fraction (PP < 10–15 suggests LV distension); VV: SaO2 ≈ weighted mix of ECMO and native flow, minus recirculation | EMCrit-ECMO | [TXT] |
| Sweep gas | 2–4 L/min | 50–100 % of blood flow initially (1–9) | PaCO2 set by sweep; new sweep = sweep × (PaCO2/target); equilibrates over ~50 min | EMCrit-ECMO | [TXT] |
| FdO2 | 1.0 (VA: titrate to post-oxygenator PaO2 ~150) | 1.0 | — | EMCrit-ECMO | [TXT] |
| Recirculation (VV) | — | 0.1–0.3 | SaO2 falls without a flow change | [TXT] | [ENG] |
| Differential hypoxaemia (VA, femoral return) | on when native CO > 1–2 L/min with poor lungs | — | right-radial SpO2/PaO2 low (e.g. 89 % / 56) vs legs normal; needs site-dependent SpO2 (Stage 3 `siteDelay` + a new mixing point); NIRS asymmetry > 8 % | Harlequin PMC12415751; JACC case; EMCrit-ECMO | [TXT] |
| Native EtCO2 | low | normal-low | VA: EtCO2 < 15 mmHg means native CO < 1 L/min (a teaching point) | EMCrit-ECMO | [TXT] |
| Circuit pressures | drainage > −100; pre/post-oxygenator < 300; ΔP < 40–50 (> 60 dysfunction, > 100 failure) | — | console tile; chattering lines when drainage is too negative (hypovolaemia) | EMCrit-ECMO | [TXT] |


---

## 9. Open questions for Ali

★ marks the questions that block coding of the first sub-stages (7a circulation, 7b lungs). The rest can be answered at their sub-stage's gate. "Default" is what the engine does if you do not answer.

**Design and profiles (§1)**
1. ★ **Model form.** Is the per-beat Ees/Ea ventricular–arterial coupling model (§0, §2.1) the right teaching core? The alternative is a continuous time-varying-elastance model that also draws LV/LA pressure waveforms, at more CPU and tuning cost. *Default: per-beat coupling; Stage 2 still draws the waveforms.*
2. ★ Stressed volume 25 % of blood volume and venous compliance 1.6 mL/mmHg/kg give Pmsf ≈ 10. Are these acceptable across ages? Elderly are set lower (22 %, 1.3). Measured human Pmsf is 11 ± 5.
3. The PWV by decade comes from the 2010 European reference collaboration (normal-BP medians 6.2 → 10.9 m/s). I did not re-read the table. Do you want it verified before 7a, or accepted for the elderly radial waveform (smaller PP amplification, earlier reflected wave)?
4. Paediatric baroreflex gains (neonate 3–5, infant 5–10 ms/mmHg) and a reduced sympathetic reserve are [ENG]. Is the neonatal response to hypotension or hypoxia in your practice mainly bradycardia, as coded?
5. MAP set point by age. Neonate 40–50 (preterm ≈ gestational age in weeks) and elderly 90–100: do these match the numbers you teach?
6. ★ FRC under GA is **8 mL/kg for all children** and 20 mL/kg for adults. Both were *tuned* in Stage 3 to hit the Patel and Benumof desaturation times; measured anaesthetised values are higher (~20 mL/kg in children). Keep the tuned values, or use physiological FRC and lower something else (e.g. raise paediatric VO2 under GA)?
7. Baseline shunt/venous admixture: neonate 5–10 % (possible ductal/PFO right-to-left), elderly 5–8 % (PaO2 ≈ 100 − 0.3·age). Acceptable?
8. Obesity. FRC −3.5 % per BMI point above 25 (floor 40 %) is Stage 3's tuned rule. Pelosi's exponential FRC–BMI data were not re-read. Keep?
9. ★ **OSA and sedation.** When should an OSA patient obstruct: depth index < 80 / 85 / 90 by grade (others < 60), with opioid sensitivity ×1.25–1.7? Should "undiagnosed OSA" be a hidden instructor option for obese profiles?
10. Pregnancy colloid osmotic pressure 21–22 at term and 16–17 post-partum lowers the oedema threshold to about 19. Is that the pre-eclampsia/oxytocin pulmonary-oedema behaviour you want?
11. Aortocaval compression: CO −25–30 % supine after 20 weeks, relieved at ≥ 15° tilt. Should it act from 20 weeks, or only from 28? Should 10 % of patients get a Bezold–Jarisch bradycardia?
12. ★ **Heart failure.** HFrEF Ees ×0.45 (EF ~30 %), MAP set 75, LVEDP 15–20; HFpEF β ×2–3. For "patient on ACE-i + β-blocker + diuretic", should the profile add β-blockade and relative hypovolaemia automatically?
13. ★ **Hypertension.** Cerebral autoregulation lower limit +15–20 mmHg and renal +10 in chronic HTN. Does a 20 % MAP fall from baseline (your common intra-op threshold?) or an absolute MAP 65 match what you want the model to punish?
14. CAD grade → coronary flow reserve (none 3.5, 1–2-vessel 2.0, 3-vessel/LM 1.4). Would you describe patients by grade like this, or by history (stable angina at what exertion, prior MI, stents/CABG)? The profile picker can translate either.
15. AS grades: AVA 1.0–1.5 moderate, 0.7 severe default, 0.5 critical; LV stiffness rises with grade (β ×1.3–2.0). Is the "SV fixed, MAP falls 25–30 % for a 30 % SVR fall" behaviour right for severe AS under GA?
16. MR: chronic LA compliance 10–15 vs acute 2 mL/mmHg. Is a v-wave of 40–60 on a PCWP of 25–30 right for acute severe MR (papillary rupture)?
17. Pacemaker magnet rates vary by vendor (e.g. 85, 98.6, 100). Which vendors are common in Iran, and should the profile pick one?
18. β-blocked haemorrhage: g_hs ×0.4 gives HR 80–95 in class III. Is that what you see? Does it matter whether it is metoprolol or propranolol?
19. ★ **COPD by GOLD grade**: R ×1.3–3.5, slow compartment τ 1.2–3 s, VD/VT 0.35–0.60, PaCO2 40–55. Do these give the auto-PEEP/hypotension behaviour you see at RR 16–20 with VT 8 mL/kg?
20. Bronchospasm. Probability at intubation (controlled asthma ≈ 2 %) and severity → resistance mapping (proposed severity 1 → R 60 cmH2O/L/s, "silent chest"). Is the Stage 3 map (severity 1 → R 40) enough?
21. Anaemia: CO rises only below Hb ~7 (chronic), with ODC right shift. What Hb should trigger ischaemia in the CAD profile: 7, 8 or 10?
22. Smokers: COHb 3–10 %, SpO2 over-reading ≈ 1.06·COHb − 2.5. Is a CO-poisoning scenario (COHb 20–40 %, SpO2 ~normal) wanted?
23. Chronic PH: PVR 3/5/10 WU by grade, adapted RV Ees ×1.3–2. Which PH crisis triggers matter most in your OR teaching: hypoxia, hypercapnia, light anaesthesia, protamine?

**Heart and circulation (§2–3)**
24. ★ LV Ees 2.3 (Smith model 2.88; V0 0–5 mL); LV EDPVR β 0.033 (Smith) vs the 0.01–0.02 in human normal-subject studies. The model-derived value is steep. Should the normal-subject β be used, with HFpEF at 0.03?
25. ★ **Pulmonary oedema threshold** (R24): acute onset when pCap > COP − 2 ≈ 23; chronic HF tolerates 30–45 (lymphatic adaptation). The lung water → shunt (+3 % per mL/kg over EVLWI 10) and compliance (−4 % per mL/kg) mappings are [ENG]. Do the S11 numbers (SpO2 96 → 90, RR 26–30, Pplat +5–8) look right to you?
26. LA compliance values (§2.2): see Q16. Should chronic AF enlarge the LA (compliance ↑) automatically?
27. PE. Is a vasoconstrictor factor of 0.5 on top of mechanical obstruction right? Is the EtCO2 drop (−10–20 mmHg within 3 breaths) what you have seen?
28. ★ Pleural transmission `tIt` 0.4 (0.2 in ARDS, 0.7 in obesity/IAH) replaces the R29 "PEEP effect only above mean Paw 10" rule. Does the PEEP 5 → 15 result (CO −5–10 % normovolaemic, −20–25 % hypovolaemic) match? Tension pneumothorax timing: 3 min to SBP < 90 when ventilated?
29. Tamponade at ~150–200 mL acute (pericardial reserve volume [ENG]). Right for post-cardiac-surgery bleeding? Should a chronic effusion scenario (1 L tolerated) exist?
30. ★ The H1–H10 targets in §2.3 are the 7a gate. Are any wrong or missing, e.g. HOCM/SAM, acute AR, VSD after MI?
31. ★ **Ischaemia model**: ischaemia when demand exceeds CFR-limited supply, where supply ∝ (CPP − P_zf)·DTF. P_zf 15 mmHg and CFR by grade are [ENG]/[VERIFY]. SEVR thresholds in the literature differ by method (invasive ≤ 0.45 vs tonometry ≤ 1.3). Accept this formulation?
32. Contractility decay τ 20 s, recovery τ 60 s, gain 1.5, stunning after > 10–15 min. Too fast, too slow?
33. ★ **Ephedrine vs phenylephrine** in AS+CAD: the model gives phenylephrine the win (§3 table). One valve-surgery study found ephedrine preserved CI and phenylephrine lowered SV, with ischaemia seen with both. Is "phenylephrine reverses, ephedrine does not" the teaching message you want, or should ephedrine partially help at low dose?

**Lungs (§4)**
34. ★ Induction atelectasis 6 % of lung at FiO2 1.0 (Edmark CT), shunt +5–10 %, re-collapse τ 5 min at FiO2 1.0 vs ~2 h at 0.4, and PEEP slowing it ×(1 + PEEP/5) [ENG]. Do you preoxygenate with 1.0 and then use 0.4–0.5? Should "FiO2 0.8 at induction" be a teaching option (Edmark: less atelectasis, faster desaturation)?
35. HPV: flow to the hypoxic region halved, volatile inhibition 20 %/MAC [VERIFY], acidosis PVR term 25 % per 0.1 pH [ENG]. Is one-lung ventilation a v1 scenario? It would need a left/right lung split.
36. ★ **CO2 response slope 1.5 L/min/mmHg** (literature 1–2; the draft had 2), hypoxic constant [ENG], and fatigue at PTI > 0.15. Does opioid-induced "slow deep breathing, RR 6–8" before apnoea match your recovery-room experience?

**Brain, kidney, liver, metabolism (§5–5e)**
37. CSF buffering τ 5 min for slow masses [ENG]: plausible?
38. CO2 reactivity 3 %/mmHg (OpenAnesthesia says ~4 %). Which do you teach?
39. ICP waveform P2/P1 ratios (0.8 → 1.0 at ICP 20 → 1.3–1.5 exhausted) and Lundberg waves: wanted in v1, or v1.1?
40. KDIGO oliguria needs 6 h. Scenarios need time compression (e.g. a 30 min low-UOP window counts as "oliguria" in teaching mode). Acceptable?
41. Lactate clearance t½ 30 min (derived) and anaerobic yield (30 min at 2 mL/kg/min O2 deficit → +3–5 mmol/L) are [ENG]. Do they match your ICU experience of how fast lactate rises in shock and falls after resuscitation?
42. Critical DO2 6 mL/kg/min (literature 4.9–8.2). Should it depend on anaesthesia and temperature?
43. MH time course (severity 1 = fulminant). Is dantrolene available in your hospitals at 2.5 mg/kg immediately? Should the scenario model the delay to obtain it?
44. Acidosis below pH 7.2 depresses contractility and halves the catecholamine response at pH 7.1 [ENG]. Too strong?
45. K–pH shift: +0.4 per −0.1 pH for respiratory/mineral acidosis only, ~0 for lactic acidosis [VERIFY; source disputed]. Accept?
46. Ionised Ca → contractility ×(iCa/1.1)^1.5 and QT, plus citrate from rapid transfusion [ENG]. Do you give CaCl2 routinely per units transfused? Which ratio?
47. Crystalloid kinetics: 55 % intravascular during infusion, 20 % at 30 min after (awake), much longer retention under GA. Do you want the "fluid bolus fades in 30–60 min" lesson to be this strong?
48. Nociception → sympathetic stress (laryngoscopy +20–30 mmHg MAP, HR +15–25 % when not blunted). Are the magnitudes right? Should opioid dose at intubation be the main blunting input?
49. Shivering and pethidine: is pethidine 25 mg the standard treatment in Iran? Other options (clonidine, dexmedetomidine)?
50. Cisatracurium/atracurium/vecuronium/pancuronium: which relaxants are used in your hospitals? Atracurium would need its own row (histamine, Hofmann).
51. Is sugammadex available and affordable routinely, or is neostigmine the norm? That decides the default reversal in scenarios.
52. ★ Sevoflurane MAC at 40 y: **1.80 % (Mapleson)** or 2.05–2.1 % (label)? It shifts every MAC-indexed effect by ~15 %.
53. Depth index: propofol Ce50 3.08 µg/mL at 35 y (Eleveld) and "1 MAC ≈ DI 40–45" [ENG]. Do you use BIS/entropy routinely? Which device, so the index can mimic its range and lag?
54. Fentanyl ventilatory C50 ≈ 0.6 ng/mL, derived by EEG potency from remifentanil's measured 0.92 [ENG]. Acceptable?
55. Septic multipliers (SVR ×0.4–0.55 warm; Ees ×0.4–0.6 cold; leak ×3–4) and the warm → cold trajectory. Does it follow what you see, or is early myocardial depression commoner?
56. Anaphylaxis grades and volume shift (up to 35 % in 10 min [VERIFY]). Which triggers are most common locally, and what epinephrine doses do you teach for grade III?

**Drugs (§6)**
57. ★ **Propofol PK default**: Eleveld (best evidence, all ages) vs Schnider or Marsh (what TCI pumps in Iran run). Should the engine show the pump model's Cp/Ce, or the "true" patient's, or both, so trainees see model mismatch?
58. Fentanyl ke0: 0.147 (Shafer–Varvel) or 0.108 (Scott–Stanski)? It changes time to peak effect from ~3.6 to ~5 min.
59. ★ **Iranian formulary.** Which of these are routinely available: phenylephrine (vs ephedrine as the default pressor), norepinephrine, vasopressin, dopamine, remifentanil, sufentanil, alfentanil, thiopental, dexmedetomidine, milrinone, esmolol, labetalol, sugammadex, dantrolene, pethidine? Anything missing, e.g. etilefrine or midazolam co-induction habits?
60. Vasopressor units: show and accept doses in µg/min, µg/kg/min or mL/h of a standard dilution? What dilutions are standard in your ICU (e.g. norepinephrine 4 mg/50 mL)?
61. Volatile per-MAC haemodynamic multipliers (SVR −20–25 %/MAC, Ees −10 %/MAC) are [ENG] tuned to direction only. Do they give the MAP you see at 1 MAC in an elderly patient?
62. Propofol haemodynamic Ce50 3.5 µg/mL is fitted so 2 mg/kg gives MAP ~70 % at 2 min. Should an elderly/ASA 3 profile fall further (to 55–60 %)?

**Scenarios and devices (§7–8)**
63. ★ Of scenarios 10–25, which six must pass for v1.0? The rest become v1.1 regression tests.
64. Devices: which of IABP, LVAD, ECMO (VA/VV), ICD do your trainees meet? That sets the v1.1 order (R28 proposes IABP and LVAD first). Should LVAD show a specific pump (HeartMate 3-like)?


---

## 10. Sources

Internal: **B** = `docs/DESIGN-BRIEF.md`; **R03** = `research/03-waveform-physiology-reference.md`; Stage 2/3 plans and code (`l2/hemo/params.ts`, `l2/gas/params.ts`, `l2/resp/pipeline.ts`); rulings R22–R32 (`research/00-orchestrator-rulings.md`). "Read" means the page or abstract was opened this session; "summary" means it came from a search summary or a review quoting it.

**Profiles and comorbidities**
- RVAS2010: Reference Values for Arterial Stiffness Collaboration, Eur Heart J 2010;31:2338 (read: citation; table [VERIFY]). https://academic.oup.com/eurheartj/article/31/19/2338/441416
- Lemmens2006: blood volume in obesity, 70/√(BMI/22) (read abstract). https://pubmed.ncbi.nlm.nih.gov/16756741/
- PALS vital signs: https://acls-algorithms.com/wp-content/uploads/2021/07/PALS-Vital-Signs.pdf
- IHR 118 − 0.57·age (Jose): https://pmc.ncbi.nlm.nih.gov/articles/PMC10620402/ · Tanaka2001 HRmax: https://www.jacc.org/doi/10.1016/S0735-1097(00)01054-8
- BJAEd-closing (closing capacity = FRC supine at ~44 y): https://www.bjaed.org/article/S2058-5349(21)00152-9/fulltext
- Schipke2003 (Pmsf 11 ± 5): https://journals.physiology.org/doi/full/10.1152/ajpheart.00604.2003
- DM-BRS: https://www.ahajournals.org/doi/10.1161/01.hyp.0000169053.14440.7d ; https://pubmed.ncbi.nlm.nih.gov/10550419/ · Burgos1989: Anesthesiology 1989;70:591–7 (standard reference, not opened)
- Zile2004: https://pubmed.ncbi.nlm.nih.gov/15128895/ · HFpEF-PV: https://pubmed.ncbi.nlm.nih.gov/35862208/
- Klein2007 (thyroid and the heart): https://www.ahajournals.org/doi/10.1161/circulationaha.106.678326 · MDCJ-hypo: https://journal.houstonmethodist.org/articles/10.14797/mdcj-13-2-55
- Anaemia: https://www.openanesthesia.org/keywords/physiologic-response-to-anemia/ ; https://www.ahajournals.org/doi/10.1161/01.CIR.8.1.111
- COHb/SpO2 (8855058): https://pubmed.ncbi.nlm.nih.gov/8855058/
- SepticCM: https://pmc.ncbi.nlm.nih.gov/articles/PMC11049701/ · Hyperdyn-Pmsf: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9146182/
- OSA-PH: https://pmc.ncbi.nlm.nih.gov/articles/PMC8135661/ · OSA-opioid: https://jcsm.aasm.org/doi/10.5664/jcsm.9730
- CKD-BJAEd: https://pmc.ncbi.nlm.nih.gov/articles/PMC9463627/
- COPD-VQ: https://pubmed.ncbi.nlm.nih.gov/19372303/ · COPD-VD: https://pmc.ncbi.nlm.nih.gov/articles/PMC7868954
- Asthma-BJA: https://www.bjanaesthesia.org.uk/article/S0007-0912(17)33865-5/fulltext
- BB-haem: https://emedicine.medscape.com/article/432650-overview
- Soma-Pillay2016 (physiology of pregnancy, read): https://pmc.ncbi.nlm.nih.gov/articles/PMC4928162/ · ACC-tilt: https://www.sciencedirect.com/science/article/pii/S0007091217316021

**Heart, circulation, coronary**
- Smith2004 (Smith, Chase et al., minimal CVS model; CellML parameters read): https://models.physiomeproject.org/workspace/smith_chase_nokes_shaw_wake_2004
- Sunagawa 1983, effective arterial elastance (standard reference): Am J Physiol 245:H773
- ESC2022-PH (definitions via review, read): https://pmc.ncbi.nlm.nih.gov/articles/PMC10971453/
- ASE2017 valvular regurgitation (table read): https://www.asecho.org/wp-content/uploads/2017/04/2017VavularRegurgitationGuideline.pdf
- ACC/AHA 2020 valve guideline (summary): https://www.jacc.org/doi/10.1016/j.jacc.2020.11.018 · Gorlin (read): https://pmc.ncbi.nlm.nih.gov/articles/PMC11308807/
- McIntyre & Sasahara 1971 (PE obstruction vs PAP, abstract): https://www.ajconline.org/article/0002-9149(71)90116-0/abstract
- Tamponade: https://www.sciencedirect.com/science/article/abs/pii/0002870394905614 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC2736922
- SEVR (read): https://pmc.ncbi.nlm.nih.gov/articles/PMC11009993/ · Coronary physiology (summary): https://www.ncbi.nlm.nih.gov/books/NBK551531/
- DTF: https://pubmed.ncbi.nlm.nih.gov/15615846/ ; https://pubmed.ncbi.nlm.nih.gov/10393684/ ; https://www.jacc.org/doi/10.1016/j.jacc.2016.11.087
- Valve-eph (ephedrine vs phenylephrine in valve surgery): https://www.researchgate.net/publication/49719704
- Guyton & Hall, Textbook of Medical Physiology (oedema safety factor, renal output curve) [TXT]; Braunwald's Heart Disease (MR, stunning) [TXT]; Tennant & Wiggers 1935 [TXT]

**Lungs**
- Edmark2003 (read): https://pubmed.ncbi.nlm.nih.gov/12502975/
- Rothen1995: https://pubmed.ncbi.nlm.nih.gov/7717553/ ; https://pubmed.ncbi.nlm.nih.gov/7725873/ · Rothen1999: https://pubmed.ncbi.nlm.nih.gov/10472221/
- Hedenstierna review (summary): https://onlinelibrary.wiley.com/doi/10.1002/cphy.c080111
- HPV-SJA2021: https://journals.lww.com/sjan/fulltext/2021/15030/the_hypoxic_pulmonary_vasoconstriction__from.2.aspx · Lumb & Slinger 2015: https://pubmed.ncbi.nlm.nih.gov/25587641/
- OA-resp (Crs under GA): https://www.openanesthesia.org/keywords/effects-of-anesthesia-on-the-respiratory-system/
- HCVR: https://www.sciencedirect.com/topics/medicine-and-dentistry/hypercapnic-response ; https://pubmed.ncbi.nlm.nih.gov/7149440/
- West, Respiratory Physiology (zones, diffusion) [TXT]; Weil 1970 (hypoxic ventilatory response form) [TXT]; Bellemare & Grassino 1982 (tension–time index) [TXT]; Pelosi 1998 (obesity mechanics) [VERIFY]

**Brain, kidney, liver, metabolism**
- PVI-PLOS (read): https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0164263
- BTF2016: https://braintrauma.org/coma/guidelines/severe-tbi
- LITFL-CBF (read): https://partone.litfl.com/cerebral_blood_flow.html · OA-CBF (read): https://www.openanesthesia.org/keywords/effect-of-medications-on-cerebral-blood-flow/
- PbtO2 (read): https://pmc.ncbi.nlm.nih.gov/articles/PMC10523606/ · ICP-wave: https://rk.md/2017/measuring-interpreting-intracranial-pressure-icp-waveforms/
- HeadUp-meta 2024: https://link.springer.com/article/10.1007/s12028-024-02020-3 · Slupe2018: https://journals.sagepub.com/doi/10.1177/0271678X18789273
- Matta1999 (read): https://pubmed.ncbi.nlm.nih.gov/10485778/ · Mannitol-USPharm: https://www.uspharmacist.com/article/hyperosmolar-therapy-for-the-treatment-of-cerebral-edema · HTS-meta: https://journals.lww.com/md-journal/fulltext/2020/08280
- KDIGO2012: https://kdigo.org/wp-content/uploads/2016/10/KDIGO-2012-AKI-Guideline-English.pdf · Renal-AR: https://pmc.ncbi.nlm.nih.gov/articles/PMC4042104/ · PEEP-renal: https://pubmed.ncbi.nlm.nih.gov/6379297/
- Lactate-BJAEd: https://www.bjaed.org/article/S1743-1816(17)30386-4/fulltext · CritDO2: https://pubmed.ncbi.nlm.nih.gov/10691227/ · LITFL-OER: https://litfl.com/oxygen-extraction-ratio/
- MH-EMCrit: https://emcrit.org/ibcc/mh/ · MH-OA: https://www.openanesthesia.org/keywords/malignant-hyperthermia/
- Tortorici2007 (hypothermia and drug clearance): https://pubmed.ncbi.nlm.nih.gov/17855837/

**Blood, acid–base, fluids, endocrine**
- Winters (read): https://en.wikipedia.org/wiki/Winters's_formula · Acid–base (summary): https://medschool.cuanschutz.edu (evaluation-of-acid-base-disorders PDF) · Adrogué & Madias 1981: https://pubmed.ncbi.nlm.nih.gov/7025622/
- Citrate-ESMED: https://esmed.org/citrate-toxicity-and-hypocalcemia-in-massive-transfusion/ · StoredK: https://pubmed.ncbi.nlm.nih.gov/21498041/
- Hahn2016 (volume kinetics): https://www.ovid.com/jnls/ejanaesthesiology/fulltext/10.1097/eja.0000000000000436
- Desborough2000 (stress response): https://academic.oup.com/bja/article/85/1/109/263834
- Bergman1998 (minimal model): https://journals.physiology.org/doi/full/10.1152/ajpendo.1998.274.4.E592
- ADA2025 glucose levels: https://diabetesjournals.org/care/article/48/Supplement_1/S128/157561
- OA-hypothermia (read): https://www.openanesthesia.org/keywords/intraoperative-hypothermia/ · ICAR2016 (read): https://pmc.ncbi.nlm.nih.gov/articles/PMC5025630/

**Drugs, NMB, depth** (FDA labels read through openFDA/DailyMed: https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=<drug>)
- Eleveld2018: https://pubmed.ncbi.nlm.nih.gov/29661412/ · Schnider1998/1999: https://pubmed.ncbi.nlm.nih.gov/9605675/ ; https://pubmed.ncbi.nlm.nih.gov/10360845/ · Marsh ke0 note: https://pmc.ncbi.nlm.nih.gov/articles/PMC3337375/
- Minto1997: https://pubmed.ncbi.nlm.nih.gov/9009935/ · Kapila1995: https://pubmed.ncbi.nlm.nih.gov/7486182/ · Bouillon2003: https://pubmed.ncbi.nlm.nih.gov/14508307/ · Babenco2000: https://pubmed.ncbi.nlm.nih.gov/10691225/ · Nieuwenhuijs2003: https://pubmed.ncbi.nlm.nih.gov/12552187/
- Scott-Stanski1985: https://pubmed.ncbi.nlm.nih.gov/3919613/ · Shafer-Varvel1991: https://pubmed.ncbi.nlm.nih.gov/1824743/
- Plaud1995: https://pubmed.ncbi.nlm.nih.gov/7648768/ · Ezzine2007: https://pubmed.ncbi.nlm.nih.gov/17681967/ · Lee2009 (sugammadex vs sux): https://pubmed.ncbi.nlm.nih.gov/19387176/ · Waud1975: https://pubmed.ncbi.nlm.nih.gov/1211496/
- Labels: rocuronium, vecuronium, cisatracurium, succinylcholine, sugammadex (Bridion), neostigmine, phenylephrine (Biorphen), norepinephrine, epinephrine, vasopressin, ephedrine, dobutamine, milrinone, nitroglycerin, esmolol
- Mapleson1996: https://pubmed.ncbi.nlm.nih.gov/8777094/ · Katoh1993: https://pubmed.ncbi.nlm.nih.gov/8214700/ · Malan1995: https://pubmed.ncbi.nlm.nih.gov/7486177/
- Eleveld BIS 2024 (summary): https://www.bjanaesthesia.org.uk/article/S0007-0912(24)00424-0/fulltext
- Propofol haemodynamics (R03): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10651705/ · Yasuda 1991, Eger & Saidman 1965, Fisher 1986 [TXT, not opened]

**Devices**
- IABP: https://pmc.ncbi.nlm.nih.gov/articles/PMC11307388/ ; https://litfl.com/intra-aortic-balloon-pump-trouble-shooting/ ; https://derangedphysiology.com/main/required-reading/cardiovascular-intensive-care/Chapter-518/pathophysiology-abnormal-iabp-arterial-waveforms ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4972967/ ; https://emcrit.org/ibcc/iabp/
- HM3-Abbott pump parameters (read): https://www.cardiovascular.abbott/content/dam/cv/cardiovascular/hcp/education-training/heart-failure/documents/hf-heartmate3-lvad-pump-parameters.pdf · EMCrit-HM3: https://emcrit.org/emcrit/heartmate-3-lvad-overview/
- EMCrit-ECMO (read): https://emcrit.org/ibcc/ecmo/ · Harlequin: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12415751/ · JACC case: https://www.jacc.org/doi/10.1016/S0735-1097(24)05165-9
- ICD2019 (text read; programming tables are images): https://pmc.ncbi.nlm.nih.gov/articles/PMC7508744/ · AMS: https://pubmed.ncbi.nlm.nih.gov/17043069/

*End of draft 1.*
