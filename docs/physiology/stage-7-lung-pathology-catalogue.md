# Stage 7 §4b: Lung pathology catalogue (clinical review draft)

*Draft 1, 2026-09-25, for Ali's clinical review (R36, R37). Companion to `stage-7-parameter-tables.md` (the "main document"); this file is its §4b and will be merged into it at review. All 32 condition sections, the summary (§33), questions Q65–Q95 (§34) and sources (§35) are complete (finished 2026-09-26 after an interruption).*

**What this is.** One table per lung (and chest-wall, airway, pulmonary-vascular) condition in R36's binding list, 32 conditions in all. Each table says what the condition does to the numbers the engine already has. It adds no new physiology. Every condition is a **preset**: a condition id (`lungCondition`, e.g. `ards`, `copd`) with a grade or a 0–1 severity. The preset writes **multipliers and offsets** onto the §2 circulation symbols (`pvr`, `eesRv`, `tIt`, `pPtx`, `peFrac`, `evlwi`) and the §4 lung-module symbols (`crs`, `raw`, `fSlow`, `tauSlowS`, `atel`, `hpvRegional`, `extraShunt`, `dlFactor`, the §4.4 dead-space terms). The §4 equations then produce SpO2, EtCO2, PAP, CVP and ABP. Nothing in a row is a displayed value: it is an input, or a test band on an output. Conditions stack; §33 gives the stacking rule.

**How rows reach the ventilator (R27).** The ventilator-facing rows (compliance, inspiratory and expiratory resistance, time constants, auto-PEEP tendency, FRC, shunt, dead space, effort) leave through `lungState`. The ventilator's own mechanics engine (`packages/ventilator`, R35) consumes them, so its Paw/flow/volume loops change with the patient. Its VentFrame (Paw, flow, volume, FiO2, PEEP) comes back through `externalDrive` and drives the §2 pleural term `pIt`, the §4.1 recruitment state and Stage 3's gas exchange. A condition therefore shows up twice: on the ventilator (Ppeak, Pplat, auto-PEEP, loop shape) and on the monitor (SpO2, EtCO2 and capnogram shape, ABP/CVP swings, PPV).

**When each part is wired.** Mechanics and gas-exchange rows land with **7b** (the lung module). PVR, RV and pleural-pressure rows need **7a** (two-sided heart) and are inert until it merges; before then a preset still sets them, but only Stage 3's shunt and dead space respond. Ventilator-interaction rows become visible at **Stage V** (the vent link), whose demo picker exposes each condition as its table is approved (R36). Drug rows need **7f/7g**. Rows that need a left/right lung split (one-lung ventilation, endobronchial intubation, unilateral pneumonia, bronchopleural fistula, simple pneumothorax) run on a **two-lung option** that Q35 left open. Until it lands they run in the single-lung approximation stated in each table.

**Row format** is the main document's (§0): parameter · symbol · default · range · units · what it changes · source · tag · Q. The tags mean what they mean there. **[P]** means a guideline or paper abstract/full text was opened this session. **[TXT]** means one of the three local textbooks was read at the cited page; a one-line quote for each is in §35. **[ENG]** is an engineering choice. **[VERIFY]** is believed but not re-read. Grades use the clinical scale where one exists (GOLD, Berlin, ESC/ERS, WHO-FC); otherwise "severity 0–1". A multiplier at severity *s* is `1 + (m − 1)·s` unless stated. Where Kitware Pulse 4.3.2 has a number, it appears in the source cell as "Pulse: …" (R34). Pulse's own validation targets (Arnal 2018, Maj 2023, Officer 1998, Farah 2009, Karbing 2020) are cited as sources where they apply.

**Conventions reused from the evidence rulings (R39).** Capnogram **alpha angle**: 105° normal (100–110); moderate–severe bronchospasm 135°; severe 145°; 157° only as a near-fatal extreme (R39-6). Everything else in this catalogue maps onto that scale: obstruction severity → angle, never a free-drawn shape. **Sidestream** capnography delay and rise time are a property of the skin, not of the disease (R39-5: Philips-like 2.3 s / 240 ms). A condition that slows CO2 emptying lengthens the *phase II–III* slope; it does not change the sampling delay. Driving pressures "at 6 mL/kg" use predicted body weight.

**New symbols** (additive; the §4 `lungState` extension proposed in main §4 gains these):

| Symbol | Meaning | Default | Units | Emitted in `lungState` as |
|---|---|---|---|---|
| `rawExpMult` | expiratory resistance ÷ inspiratory resistance | 1.2 | × | `resistanceExpCmH2OPerLps` |
| `ccw` | chest-wall compliance (sets `tIt` = E_cw/(E_cw + E_L) in §2) | 200 | mL/cmH2O | `chestWallComplianceMlPerCmH2O` |
| `recruitFrac` | fraction of `atel` that opens at P_open (the rest is consolidation) | 1.0 (atelectasis) | 0–1 | `recruitableFrac` |
| `pvrLungVol` | lung-volume term on PVR (U-shape around FRC) | see §1 | × | — |
| `pvrReact` | condition gain on §4.2's hypoxia and acidosis PVR terms | 1.0 | × | — |
| `vqLow` | low-V/Q admixture (responds to FiO2, unlike true shunt) | 0.02 | fraction of CO | `vqAdmixture` |
| `leakFrac` | fraction of delivered VT lost through a bronchopleural fistula | 0 | 0–1 | `leakFraction` |
| `rightLeftIntracardiac` | R→L flow across a PFO when RAP > LAP | 0 | fraction of CO | — |
| `copd`, `ards`, … | the condition id and grade | — | — | `condition`, `grade` |

The questions start at **Q65**, continuing the main document's §9 (last Q64), and are in §34.

## 1. Pulmonary hypertension (groups 1–5) and RV failure under PPV

Condition id `ph`, with `phGroup` 1–5 and grade mild / moderate / severe. The grade rows (PVR 3 / 5 / 10 WU; RV Ees ×1.3 / 1.6 / 2.0 for adaptive hypertrophy) are **main §1.5 `ph`** and are not repeated here. This table adds what the group changes, the triggers of a crisis, and the ventilator coupling. The teaching core is R36's "RV failure under PPV, PEEP and hypercapnia". It needs 7a: with 7b alone, PH shows only as dead space and as SpO2 through the PFO term.

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Definition (all groups) | `ph` gate | mPAP > 20 mmHg; precapillary adds PVR > 2 WU and PAWP ≤ 15 | — | mmHg, WU | which group applies; test band on the §2 output PAP | ESC/ERS 2022 (via SSc-2022 paper, opened; Stoelting 8e ch. 9 p. 196 still gives the 2019 ≥ 3 WU) | [P] | — |
| Group 1 (PAH) PVR | `pvr` | main §1.5 grade (3/5/10 WU) | 3–15 WU | WU | RV afterload, PAP | ESC/ERS 2022; §1.5 | [P]/[TXT] | — |
| Group 2 (left heart) | `pvr`; LAP from §2 | isolated post-capillary: PVR ≤ 2 WU and PAWP > 15 (from R24's LA model); combined pre/post: PVR 3–5 WU | — | WU | PAP rises with LAP; iNO raises LAP further (pitfall 4) | ESC/ERS 2022; Stoelting 8e ch. 9 p. 197 | [P]/[TXT] | — |
| Group 3 (lung disease/hypoxia) | `pvr`; `pvrReact` | PVR 3–5 WU; **severe PH in lung disease = PVR > 5 WU**; `pvrReact` 1.3 (hypoxic component, reversible with O2) | — | WU, × | O2 lowers PAP; systemic vasodilators worsen shunt | ESC/ERS 2022 (5 WU from search summary) | [VERIFY] | Q67 |
| Group 4 (CTEPH) | `peFrac` (chronic), `pvr` | `peFrac` 0.3–0.5 with no acute vasoconstrictor factor (`peVaso` 0); PVR 5–10 WU | — | fraction | fixed PVR (little response to vasodilators); **alveolar dead space ↑** → Pa–EtCO2 gap 8–15 | main §2.2 PE row; [TXT] | [ENG] | — |
| Group 5 (unclear/multifactorial) | — | treat as group 1 with the instructor's PVR | — | — | — | — | [ENG] | — |
| Static compliance, resistance, FRC | `crs`, `raw` | unchanged by PH itself (group 3: those of the underlying lung, §5, §7, §10) | — | — | — | [ENG] | [ENG] | — |
| Alveolar dead space | `vdAlv` + | group 1: +0.05 VD/VT; group 4: via `peFrac` | 0–0.10 | fraction | EtCO2 under-reads PaCO2 | [ENG] | [ENG] | — |
| Diffusion factor | `dlFactor` | 0.7 (PAH); 0.5 (SSc-PAH, §8) | 0.4–1 | × | exercise/high-CO desaturation only; not rate-limiting at rest | [TXT] | [ENG] | — |
| HPV | `hpvRegional` | intact (0.5) | — | — | — | main §4.2 | [TXT] | — |
| Intracardiac R→L shunt (PFO) | `rightLeftIntracardiac` | 0 unless `pfo` flag (population prevalence ≈ 25 %); when set: flow = (RAP − LAP)₊/`rPfo`, cap 0.3 of CO | 0–0.3 | fraction of CO | sudden SpO2 fall **when RAP rises above LAP** (crisis, high PEEP, Valsalva) that FiO2 barely corrects | [TXT] | [ENG] | Q66 |
| Hypercapnia/acidosis → PVR | `pvrReact` × main §4.2 term | **§4.2 as written gives only +22 % for PaCO2 38 → 50.** The measured response is **+54 % PVR, +34 % mPAP, RVEF −20 %** (anaesthetised, post-CABG). Proposed: acidosis coefficient 0.25 → **0.55 per 0.1 pH** for everyone | 0.4–0.7 per 0.1 pH | × | PAP, RV dilation; the crisis loop | Viitanen 1990 (abstract read) | [P] | **Q65** |
| Hypoxia → PVR | main §4.2 global term × `pvrReact` | unchanged formula; PAH `pvrReact` 1.0, group 3 1.3 | — | × | PAP in desaturation | main §4.2 | [VERIFY] | Q67 |
| Lung volume → PVR (U-shape around FRC) | `pvrLungVol` | ×(1 + 0.8·`atel`) below FRC; ×(1 + 0.03·(Pplat − 20)₊) above | — | × | PVR lowest at FRC; atelectasis and over-distension both raise it | Miller 10e ch. 12 p. 250; Dellinger 5e ch. 43 p. 690 | [TXT] shape / [ENG] numbers | Q68 |
| RV afterload sensitivity | emergent: Ea_pulm/`eesRv` | coupled < 1; adapted PH 1–1.5; **uncoupling > 2** → SV falls steeply with each extra PVR increment | — | ratio | when a small PVR rise turns into RV failure | main §2.2 | [VERIFY] | — |
| RV ischaemia spiral | `eesRv` decay | when RV coronary perfusion (MAP − RVEDP in diastole; MAP − RVSP in systole once RVSP > 0.6·MAP) < 30 mmHg: Ees_RV τ 60 s toward ×0.5 | threshold 25–40 | mmHg | the systemic hypotension → RV ischaemia → lower CO → more hypotension loop; vasopressor breaks it | Stoelting 8e ch. 9 p. 200 (mechanism); [ENG] numbers | [ENG] | Q66 |
| PH crisis triggers (scenario events) | events on `pvr` | laryngoscopy without opioid ×1.3–1.5; hypoxia/hypercapnia per terms above; N2O ×1.1–1.2; shivering/hypothermia ×1.2; air/cement embolism (`peFrac` +0.05–0.2); pneumoperitoneum CO2 via PaCO2; OLV (§22) | — | × | a crisis = mPAP ≥ 0.8 × MAP or Ea/Ees > 2 | Miller 10e ch. 29 p. 881; Stoelting 8e ch. 9 p. 200; Dellinger 5e ch. 43 p. 690 | [TXT] / [ENG] multipliers | Q66 |
| Recruitability | `recruitFrac` | as the underlying lung; in pure PAH the goal is FRC, not recruitment | — | — | RM (40 cmH2O × 8 s) drops CO sharply in PH: SV −30–50 % during the manoeuvre | [ENG] | [ENG] | — |
| PEEP response | via `tIt`, `pvrLungVol` | PEEP that restores FRC (5–8) lowers PVR; **PEEP > 10 cmH2O → hypotension** | — | cmH2O | — | Miller 10e ch. 29 p. 881 | [TXT] | — |
| Ventilator targets (for scenario scoring) | — | VT 6–8 mL/kg PBW; PaCO2 35–40; FiO2 to SpO2 ≥ 94 %; mean Paw ≤ 15; I:E 1:2 | — | — | score in the teaching mode | Miller 10e ch. 29 p. 881 (≈ 6 mL/kg, avoid acidosis) | [TXT] | — |
| Permissive hypercapnia tolerance | `hypercapTol` | **none**: PaCO2 > 45 counts as a trigger | — | — | contrasts with ARDS (§6) and asthma (§3) | Viitanen 1990; Stoelting 8e ch. 9 p. 200 | [P]/[TXT] | — |
| CVP signature | emergent | CVP 10–20 with a large v wave (TR, `rfTR` 0.2–0.4 in moderate–severe) | — | mmHg | — | main §2.2 | [TXT] | — |
| PPV/SPV | emergent | **PPV > 12 % may be a false positive** in RV dysfunction: 12 of 35 ventilated patients with PPV > 12 % did not respond to 500 mL (RV systolic velocity low) | — | % | the fluid-bolus trap; the engine must reproduce it (RV afterload rises in inspiration) | Mahjoub 2009 (abstract read) | [P] | — |
| EtCO2 / SpO2 in crisis | emergent | EtCO2 falls 5–15 mmHg as CO falls; SpO2 normal until the PFO opens or CO collapses | — | mmHg, % | EtCO2 is the early warning | [TXT] | [ENG] | — |
| Capnogram | — | normal alpha ≈ 105° (PH does not obstruct airways) | 100–110 | ° | — | R39-6 | [P] | — |
| iNO | `pvr` × (precapillary part) | 20 ppm → PVR ×0.8 (range 0.6–0.95); only 10–15 % of PAH are "responders" (mPAP fall > 10 mmHg to < 40 with CO unchanged); shunt −0.02–0.05 in ARDS; group 2 LAP rises; **abrupt stop → rebound ×1.2–1.3** | 5–40 ppm | × | selective: no SVR change | Stoelting 8e ch. 9 p. 198–199 (responder definition, 85–90 % non-responders); rebound [VERIFY] | [TXT] | Q67 |
| Inhaled prostacyclin (epoprostenol, iloprost) | `pvr` × | ×0.8, onset 5 min, off 10–20 min after stopping | — | × | same as iNO | [TXT] | [VERIFY] | — |
| IV vasodilators (SNP, NTG, milrinone, IV prostacyclin) | `pvr` ×, `WK_R0` ×, `hpvRegional` × | PVR ×0.85, SVR ×0.7–0.8, HPV ×0.7 | — | × | **hypotension first**, shunt ↑ in group 3 | main §4.2 (vasodilator row) | [TXT] | — |
| Vasopressors | `pvr` × per drug | norepinephrine: SVR ↑ > PVR ↑ (net benefit via RV perfusion); vasopressin: PVR ≈ neutral; phenylephrine: PVR ×1.1–1.2 | — | × | the vasopressor choice in an RV crisis | [TXT] | [VERIFY] | Q66 |
| Anaesthetics | via §5d/§6 | propofol/volatile SVR fall is the danger (RV perfusion); volatile HPV inhibition minor; N2O raises PVR (row above); ketamine ≈ neutral when ventilated | — | — | induction-hypotension teaching | Miller 10e ch. 29 p. 876, p. 881 | [TXT] | — |

**Pulse value.** Pulse 4.3.2 has no pulmonary hypertension. Its emphysema/fibrosis pulmonary capillary R ramps ×1 → ×6 with severity, but its circuit has no RV afterload coupling, and Pulse's own validation flags "no pulmonary hypertension" as the cause of its red SBP rows.

**Teaching pitfalls.**
1. **Hypercapnia is not benign here.** A "lung-protective" low VT with permissive hypercapnia, or hypoventilation under sedation, raises PVR by half (Viitanen). SpO2 stays normal until the RV fails. EtCO2 falling while PaCO2 rises is the tell.
2. **Hypotension → fluid → worse.** Once CVP is 12–15 or more, fluid dilates the RV. The septum shifts and the LV underfills, so CO falls. Restore systemic pressure first (norepinephrine or vasopressin) to perfuse the RV, then unload the RV (iNO), then support inotropy.
3. **PPV lies in RV failure.** The inspiratory rise in RV afterload produces PPV without fluid responsiveness.
4. **iNO in left-heart PH** raises pulmonary blood flow into a stiff LA → pulmonary oedema.
5. **Never stop iNO or an epoprostenol infusion abruptly.** The rebound crisis comes within minutes.

## 2. Acute intraoperative bronchospasm

Event `bronchospasm` with severity 0–1, which Stage 3 already has. Its triggers are airway instrumentation at light depth, histamine release, β-blockade, neostigmine and anaphylaxis (§4). The probability that an asthmatic patient develops it is main §1.5 `asthma`. The resistance mapping is main §4.3 / Q20; this table fixes the expiratory side, the heterogeneity, the ventilator coupling and the drug responses. Stoelting 8e ch. 2 p. 26 gives the bedside picture: "high peak airway pressure, upsloping of the end-tidal carbon dioxide (ETCO2) waveform, wheezing, and desaturation".

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Inspiratory resistance | `raw` × | main §4.3 proposal ×(1 + 5·sev^1.5): sev 0.3 ×1.8, 0.5 ×2.8, 0.8 ×4.6, 1.0 ×6 → R 18 / 28 / 46 / 60 cmH2O·s/L (incl. ETT) | ×1.5–8 | × | Ppeak − Pplat gap; VT loss in pressure control | main §4.3; Arnal 2018 (COPD Rinsp 22 [16–33] as the moderate anchor). Pulse: bronchial R ×10/60/100/150 at sev 0.3/0.6/0.9/1.0 on a very small baseline | [ENG] on [P] anchor | Q20 |
| Expiratory/inspiratory R ratio | `rawExpMult` | 1.3 + 0.5·sev (1.8 at sev 1) | 1.2–2.5 | × | expiratory flow limitation → gas trapping | Officer 1998 (expiratory > inspiratory R at baseline; the ordering reverses in severe methacholine constriction depending on the fitting method); Pulse: exp/insp ratio 3.5 at 0.3 → 1.7 at 1.0 | [P] direction / [ENG] number | Q69 |
| Heterogeneity (slow compartment) | `fSlow`, `tauSlowS` | fSlow 0.2 + 0.3·sev; τ_slow = 3 × τ_fast | — | —, s | phase III slope → alpha angle; auto-PEEP concentrated in the slow units | main §4.3 | [ENG] | — |
| Expiratory time constant (overall) | derived | sev 0.5 ≈ 1.5 s; sev 0.8 ≈ 3 s; sev 1 ≈ 4 s (at Crs 50) | — | s | how much of Te is needed to empty | Arnal 2018 (normal 0.60 [0.51–0.71] s; COPD 1.07 [0.68–2.14] s) | [P] anchors / [ENG] | — |
| Auto-PEEP (test band) | emergent | VT 500, RR 12, I:E 1:2: sev 0.5 → 2–4; sev 0.8 → 6–10; sev 1 → 12–18 cmH2O | — | cmH2O | `lungState.autoPeepTendency`; venous return via `pIt` | Pepe & Marini 1982 (occult PEEP depresses CO; detect by end-expiratory occlusion) | [P] mechanism / [ENG] band | — |
| Static compliance | `crs` × | ×1.0 until trapped volume > 1 L; then ×0.8 (top of the P–V curve) | 0.6–1 | × | Pplat rises with hyperinflation, not with R | Tuxen & Lane 1987 (end-inspiratory volume up to 3.6 L above FRC) | [P]/[ENG] | — |
| FRC / end-expiratory lung volume | emergent | FRC + trapped volume; hypotension appears ≈ 2 L above FRC | — | L | `lungState.frcMl` | Tuxen & Lane 1987 | [P] | — |
| Low-V/Q admixture | `vqLow` + | +0.05·sev … +0.15 at sev 1 (FiO2-responsive; not true shunt) | 0–0.2 | fraction | SpO2 90–94 % on FiO2 0.5 at sev 0.8, corrects with FiO2 1.0 | Dellinger 5e ch. 37 p. 607 (V/Q mismatch) | [TXT]/[ENG] | — |
| Dead space | `vdAlv` + | +0.10·sev … +0.20 (under-emptied units, hyperinflation zone 1) | — | VD/VT | EtCO2 under-reads; Pa–Et gap 10–20 at sev 0.8 | Dellinger 5e ch. 37 p. 610 ("increased dead-space ventilation") | [TXT]/[ENG] | — |
| HPV | `hpvRegional` | intact; β2-agonists and volatiles release it partly (shunt +0.02) | — | — | SpO2 dips briefly after salbutamol | [TXT] | [VERIFY] | — |
| PVR | `pvrLungVol` | rises with hyperinflation (§1 term) | — | × | CVP ↑, RV strain in severe | Miller 10e ch. 12 p. 250 | [TXT] | — |
| Ventilator targets | scoring | VT 6–8 mL/kg; RR 10–14; VE < 8–12 L/min; I:E 1:3–1:5; peak flow 60–80 L/min square wave; SpO2 > 90 % | — | — | the teaching "right answer" | Dellinger 5e ch. 37 p. 610 | [TXT] | — |
| Safety limits | scoring | Pplat < 30 cmH2O (surrogate of auto-PEEP); end-inspiratory volume above FRC ≤ 20 mL/kg | — | cmH2O, mL/kg | barotrauma and hypotension risk | Dellinger 5e ch. 37 p. 610; Tuxen 1992 | [TXT]/[P] | — |
| Permissive hypercapnia tolerance | `hypercapTol` | high: PaCO2 60–90 accepted if pH ≥ 7.15 | — | mmHg | contrast with §1 | Tuxen 1992 (initial PaCO2 63 ± 17 accepted); Leatherman 2015 | [P] | — |
| Recruitability | `recruitFrac` | 0: this is not a recruitment problem; external PEEP only up to ≈ 80 % of PEEPi (flow-limited COPD only) | — | — | PEEP adds to hyperinflation in asthma | [TXT] | [VERIFY] | Q69 |
| Capnogram alpha angle | L2 capnogram | 105° → 125° (sev 0.5) → 135° (0.8) → 145° (1.0); 157° only near-fatal | — | ° | shark fin | R39-6 | [P] | — |
| EtCO2 trace | emergent | at sev 1 in pressure control VT < 150 mL → small or absent trace. NAP6: "reduced/absent capnography trace" was the presenting feature in 2.3 % of perioperative anaphylaxis | — | — | pitfall 1 | Harper 2018 (NAP6) | [P] | — |
| ABP / CVP / PPV | emergent | CVP +3–8; systolic swing and PPV > 20 % with auto-PEEP; hypotension when trapped volume ≈ 2 L; **disconnection for 30–60 s restores BP** (diagnostic test) | — | — | the COPD/asthma R27 demo | Tuxen & Lane 1987 (VE 15.7 L/min → hypotension in 7 of 9); Pepe & Marini 1982 | [P] | — |
| Sevoflurane 1.1 MAC | `raw` × | ×0.58 of post-intubation R at 5 min (isoflurane ×0.75, halothane ×0.69; thiopental/N2O ×1.0) | ×0.45–0.75 | × | the deepen-the-volatile treatment | Rooke 1997 (abstract read) | [P] | — |
| Desflurane | `raw` × | ×0.8 at 1 MAC; ×1.0–1.2 at ≥ 1.5 MAC or in smokers (airway irritant) | — | × | why desflurane is not the asthma volatile | Miller 10e ch. 19 p. 429 | [TXT] | — |
| Salbutamol via ETT (8–10 puffs by spacer) | `raw` × | ×0.7, onset 3–5 min, lasts 2–4 h; HR +5–10 | ×0.6–0.9 | × | — | [TXT] | [VERIFY] | — |
| Epinephrine IV 10–50 µg (severe/refractory) | `raw` × | ×0.5 within 1–2 min; HR, BP ↑ | — | × | — | [TXT] | [VERIFY] | — |
| Ketamine 0.5–1 mg/kg; MgSO4 2 g | `raw` × | ×0.8 each | — | × | adjuncts | Stoelting 8e ch. 2 p. 26 (ketamine preferred when unstable) | [TXT] | — |
| IV lidocaine 1–1.5 mg/kg | `bronchoReactivity` × | ×0.5 for 10–20 min (prevents reflex bronchospasm; no treatment effect) | — | × | pre-intubation, deep-extubation teaching | Stoelting 8e ch. 2 p. 26 | [TXT] | — |
| Steroids | — | **no effect for 4–6 h** | — | — | pitfall 5 | [TXT] | [TXT] | — |
| Triggers | `bronchoReactivity` events | light anaesthesia at laryngoscopy/incision; neostigmine (muscarinic); histamine release (atracurium, morphine); non-selective β-blockers; cold dry gas | — | — | scenario generator | Stoelting 8e ch. 2 p. 26 (bronchospasm from light anaesthesia) | [TXT] | — |

**Severity → picture** (the scenario author's scale): 0.3 wheeze, Ppeak +5–10, alpha ≈ 115°. 0.5 alpha 125°, Ppeak +15, EtCO2 −3. 0.8 alpha 135°, Ppeak +25–30, VT −30–50 % in pressure control, SpO2 90–94 %, auto-PEEP 6–10. 1.0 alpha 145°, near-silent chest, EtCO2 trace small or absent, hypotension from auto-PEEP.

**Teaching pitfalls.**
1. **A flat capnogram in severe bronchospasm is not proof of oesophageal intubation, and vice versa.** Confirm the tube first, then treat the spasm.
2. **Chasing the PaCO2 kills.** Raising RR shortens Te, trapped volume and PEEPi rise, and the patient becomes hypotensive or goes into PEA. Disconnect and let the chest empty, then set a lower RR.
3. **Read Ppeak and Pplat separately.** A rising Ppeak with Pplat unchanged means resistance. Both rising means hyperinflation or compliance.
4. **Differential before bronchodilators:** a kinked or blocked tube, endobronchial tube, secretions, anaphylaxis (§4), tension pneumothorax (§16).
5. **Steroids do nothing in the first hours.** A volatile, a β2-agonist and epinephrine are the acute drugs.

## 3. Asthma (chronic, and acute severe asthma)

Condition id `asthma`, with main §1.5 grades controlled / poorly controlled / severe. That row sets the baseline R (×1 / 1.3 / 1.6) and the probability of bronchospasm at instrumentation (0.02 / 0.1 / 0.2). Stoelting 8e ch. 2 p. 25 puts severe intraoperative bronchospasm at about 0.2 %. The **intraoperative event is §2**. This table adds the **acute severe asthma** grade `asthmaAcute` (status asthmaticus, ICU/ED ventilation). It is the catalogue's worst dynamic-hyperinflation case and the reference scenario for "ventilate slowly".

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Baseline (between attacks) | `raw` ×, `bronchoReactivity` | main §1.5 | — | — | — | Asthma-BJA (main §10) | [P] | Q20 |
| Acute severe: inspiratory R | `raw` | 30–50 (sev 0.8–1.0 of §2, sustained) | 20–70 | cmH2O·s/L | Ppeak 40–60 on volume control | Leatherman 2015 (review); [TXT] | [VERIFY] | — |
| Acute severe: expiratory R, τ | `rawExpMult`, `tauSlowS` | ×1.8; slow τ 3–5 s, fSlow 0.5 | — | ×, s | trapped volume grows with every breath until Te ≈ 3τ | Tuxen & Lane 1987 | [ENG] | — |
| Trapped volume above FRC | emergent (VEI) | at VE 10 L/min 1.0–1.5 L; at VE 16 L/min about 2 L (hypotension); at VE 26 L/min up to 3.6 ± 0.4 L | — | L | the dose–response the engine must reproduce | Tuxen & Lane 1987 (abstract read) | [P] | — |
| Compliance | `crs` × | 0.7–0.8 once hyperinflated (tidal breathing on the upper flat of the P–V curve) | — | × | Pplat 25–35 | [ENG] | [ENG] | — |
| Shunt / V/Q | `vqLow` | 0.10–0.20 low V/Q; true shunt ≤ 0.05 (mucus plugging raises it) | — | fraction | PaO2 usually correctable; SpO2 < 92 % is a life-threatening sign | Dellinger 5e ch. 37 p. 607 | [TXT] | — |
| PaCO2 trajectory (spontaneous) | emergent (§4.6 drive + fatigue) | early 30–35 (hyperventilation); **"normal" 40–45 means tiring**; > 45 = failure | — | mmHg | the normal-PaCO2-is-bad teaching point | [TXT] | [TXT] | — |
| Pulsus paradoxus (spontaneous) | emergent from `pIt` swings | > 12 mmHg in severe; > 25 life-threatening | 10–40 | mmHg | ABP systolic swing on the monitor | [TXT] | [VERIFY] | — |
| Ventilator: initial settings | scoring | VT 6–8 mL/kg; RR 10–14; VE < 8–12 L/min; I:E 1:3–1:5; inspiratory flow 60–80 L/min | — | — | — | Dellinger 5e ch. 37 p. 610 | [TXT] | — |
| Ventilator: control target | scoring | end-inspiratory volume ≤ 20 mL/kg above FRC (or Pplat < 30), **irrespective of PaCO2** | — | mL/kg | hypoventilation until the airways open | Tuxen 1992 (abstract read) | [P] | — |
| External PEEP | `peep` response | 0–5 only; does not offset PEEPi in asthma (no fixed flow limitation) | — | cmH2O | adds to hyperinflation | Leatherman 2015 | [VERIFY] | Q69 |
| Permissive hypercapnia | `hypercapTol` | PaCO2 60–90 (Tuxen initial 63 ± 17) for 1–2 days, pH ≥ 7.15 | — | — | the opposite of §1 | Tuxen 1992 | [P] | — |
| Monitor signature | L2 | alpha 135–145°; EtCO2 30–40 while PaCO2 60–90 (gap 20–50); CVP high; systolic swing large; SpO2 88–94 % on air | — | — | — | R39-6; [TXT] | [P]/[ENG] | — |
| Barotrauma hazard | links §15/§16 | P(pneumothorax) per hour ∝ trapped volume above 20 mL/kg [ENG] | — | — | the unannounced tension pneumothorax on a hyperinflated asthmatic | Tuxen & Lane 1987 ("pneumothorax and circulatory depression") | [ENG] | Q70 |
| Drugs | see §2 | plus volatile anaesthesia (sevoflurane/isoflurane) as a rescue bronchodilator in the ICU; ketamine infusion | — | — | — | Stoelting 8e ch. 2 p. 25 | [TXT] | — |

**Teaching pitfalls.**
1. **A "normal" PaCO2 in a breathless asthmatic is a pre-arrest sign.**
2. **Post-intubation collapse:** vigorous bag ventilation after intubation → trapped volume → PEA. Stop ventilating for 30–60 s and compress the chest; if the BP comes back, it was hyperinflation (then exclude tension pneumothorax).
3. **The ventilator target is lung volume, not PaCO2.**
4. **Sedation and NMB to allow hypoventilation, but NMB with steroids** carries myopathy risk (ICU teaching note only).

## 4. Anaphylaxis (respiratory component)

Condition id `anaphylaxis`, grades I–V. The circulation (vasodilation, volume shift, main §5e) is specified in the main document. This table is the **respiratory component** and the monitor picture. NAP6 (266 grade 3–5 perioperative cases) sets the priorities. The presenting feature was hypotension in 46 %, bronchospasm in 18 %, tachycardia in 9.8 %, desaturation in 4.7 %, bradycardia in 3 % and a reduced/absent capnogram in 2.3 %. **All** patients were hypotensive at some point. Succinylcholine reactions presented mainly as bronchospasm, atracurium reactions as hypotension.

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Grade → respiratory severity | `bronchospasm` sev (§2) | I: 0; II: 0.3; III: 0.6 (moderate); IV: 0.9 (severe, ± stridor); V: arrest | per case 0–1 | — | reuses §2 entirely | Miller 10e ch. 29 p. 920 (grade table: "moderate bronchospasm" at 3, "severe bronchospasm, stridor" at 4) | [TXT] | Q71 |
| Probability that bronchospasm leads | `anaBronchoLead` | 0.18 overall; 0.35 for succinylcholine; 0.10 for atracurium; ×2 if asthma | — | probability | scenario generator | Harper 2018 (NAP6, read) | [P] numbers / [ENG] per-drug split | Q71 |
| Onset | `anaOnset` | NMB and antibiotics 1–5 min after IV bolus; chlorhexidine and Patent Blue 15–45 min | — | min | the delayed-reaction trap | Harper 2018 (NAP6: rapid for NMBs/antibiotics, delayed for chlorhexidine/dye) | [P] / [ENG] numbers | — |
| Upper-airway oedema | `raw` × (extrathoracic) | grade IV: ×2–4, **inspiratory-dominant** (`rawExpMult` 0.8); matters on mask/SGA and after extubation, bypassed by an ETT | — | × | stridor, VT loss under SGA | Dellinger 5e ch. 28 p. 420 (stridor, dysphonia) | [TXT]/[ENG] | — |
| Capillary leak → lung water | `kfMult` (main §2.2) | ×2 for 30–60 min in grade III–IV | 1–3 | × | non-cardiogenic oedema (rare); shunt ↑ | main §5e | [ENG] | — |
| Dead space from low CO | emergent (§4.4) | EtCO2 falls with CO: grade III 20–25; grade IV < 20 | — | mmHg | **EtCO2 < 20 with MAP < 50 → start compressions** | Miller 10e ch. 29 p. 920 ("Chest compressions for MAP <50 mm Hg or ETCO2 <20 mm Hg") | [TXT] | — |
| Capnogram shape | L2 | bronchospasm share → alpha per §2 (≈ 130° at grade III); circulatory share → low plateau, normal alpha | — | ° | reading two mechanisms off one trace | R39-6 | [P]/[ENG] | — |
| SpO2 | emergent | falls late (V/Q + low CO); pleth amplitude collapses early with vasodilation | — | — | probe reads poorly | [TXT] | [ENG] | — |
| PPV | emergent | PPV > 20 % (true preload responsiveness, vasodilated and leaking) | — | % | fluid indicated (unlike §1) | [TXT] | [ENG] | — |
| Epinephrine | §6.2 | grade II 10–20 µg, grade III 50 µg IV boluses; infusion if repeated; bronchial effect `raw` ×0.5 per bolus (β2) | — | µg | treats both mechanisms | Miller 10e ch. 29 p. 920 (IM doses); [TXT] IV titration | [VERIFY] | Q71 |
| Antihistamines, steroids | — | **no effect on bronchospasm or hypotension** in the acute phase | — | — | — | Miller 10e ch. 29 p. 921 ("antihistamines do not effectively treat cardiovascular and respiratory symptoms") | [TXT] | — |
| β-blocked or ACE-inhibited patient | `betaBlocked` (§1.5) | epinephrine response ×0.5; **glucagon** 1–2 mg as the rescue | — | × | refractory case; NAP6 poor-outcome factors | Harper 2018; Miller 10e ch. 29 p. 920 | [P]/[TXT] | — |
| Fluids | §5b.4 | 0.5 L for grade II, 1 L for grade III, repeated | — | L | — | Miller 10e ch. 29 p. 921 | [TXT] | — |

**Teaching pitfalls.**
1. **Bronchospasm right after succinylcholine** in a non-asthmatic patient is anaphylaxis until proven otherwise.
2. **The capnogram falls for two reasons at once:** bronchospasm (the shape changes) and low CO (the height falls). Treat both with epinephrine.
3. **Chlorhexidine and dye reactions come late**, after the drapes are on, and look like "just hypotension".
4. **PEA with bradycardia** is NAP6's usual arrest. Epinephrine and compressions; atropine will not help.

## 5. COPD / emphysema by GOLD grade

Condition id `copd`, graded by GOLD 1–4. GOLD 2023 defines COPD by post-bronchodilator FEV1/FVC < 0.7 and grades it by FEV1 (the usual cut-offs are ≥ 80 / 50–79 / 30–49 / < 30 % predicted). The grade rows (R ×1.3 / 1.8 / 2.5 / 3.5; VD/VT 0.35–0.60; V/Q admixture 0.05–0.15; C ×1.1–1.3; CO2 slope; PVR; chronic PaCO2) are **main §1.5 `copd`**, and the two-compartment constants are **main §4.3**. This table adds the expiratory side, the ventilator coupling and the monitor signature, and records where Pulse's COPD validation targets and the passive-ICU data differ from those rows. **Phenotype switch** `copdPhenotype`: emphysema (compliance ↑, DLCO ↓, bullae) or bronchitic (R ↑, secretions, V/Q ↓, earlier hypoxaemia and PH).

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Static compliance (passive, ventilated) | `crs` | GOLD 2–3 ≈ 60 (Arnal median 59 [43–75] vs normal 54); emphysema phenotype up to 75 | 43–80 | mL/cmH2O | Pplat low for the volume; long τ | Arnal 2018 (read); Pulse targets C 60/68/75 | [P] | — |
| Inspiratory resistance | `raw` | main §1.5 (13 / 18 / 25 / 35 incl. ETT) | Arnal 22 [16–33] | cmH2O·s/L | Ppeak − Pplat | Arnal 2018; Pulse targets Rinsp 12/24/34 | [P] | — |
| Expiratory/inspiratory R ratio | `rawExpMult` | **1.5** (flow limitation; dynamic airway collapse, worse in emphysema) | 1.3–2.0 | × | trapped volume; `lungState` exp R | Pulse targets Rexp 18/36/51 vs Rinsp 12/24/34 (ratio 1.5; van 1991/Officer 1998/Farah 2009) | [P] | — |
| Expiratory time constant | derived; main §4.3 `tauSlowS` | GOLD 2 ≈ 1.0 s overall (slow τ 1.2); GOLD 4 ≈ 2 s (slow τ 3.0) | Arnal 1.07 [0.68–2.14] s | s | how long a breath takes to empty | Arnal 2018 | [P] | Q19 |
| Auto-PEEP (test band) | emergent | VT 8 mL/kg, RR 14, I:E 1:2: GOLD 2 1–3; GOLD 3 4–8; GOLD 4 8–12 cmH2O. Ranieri's ventilated COPD PEEPi was 9.8 ± 0.5 | — | cmH2O | `autoPeepTendency` | Ranieri 1993 (read); main §4.3 | [P]/[ENG] | — |
| Airway → pleural transmission | `tIt` | **0.55** (compliant lungs transmit more alveolar pressure) | 0.4–0.7 | fraction | PEEPi hypotension; falsely high CVP/PCWP | Pepe & Marini 1982 (read: "abnormally compliant lungs transmit a high fraction of alveolar pressure") | [P] direction / [ENG] number | — |
| External PEEP (flow-limited COPD) | `peep` response | PEEP ≤ **85 % of PEEPi** leaves lung volume, PEEPi and haemodynamics unchanged (reduces the triggering load in spontaneous modes); PEEP above it → further hyperinflation, elastance ↑, CI ↓ | 0.8–0.9 × PEEPi | × | the "match PEEPi" teaching point | Ranieri 1993 (read) | [P] | — |
| FRC | `frcFactor` × | ×1.2 (GOLD 3), ×1.4 (GOLD 4) at rest; plus dynamic trapping | 1.1–1.5 | × | larger O2 store, but high V/Q units | Stoelting 8e ch. 2 p. 27 (RV and FRC increased) | [TXT] | — |
| Recruitability | `recruitFrac` | low (0.1); the problem is hyperinflation | — | — | RM is harmful (bullae, hypotension) | [TXT] | [ENG] | — |
| Shunt vs low V/Q | `extraShunt`, `vqLow` | true shunt ≤ 0.05; low V/Q per main §1.5 (0.05–0.15), which corrects with modest FiO2 | — | fraction | SpO2 FiO2-responsive; target 88–92 % | GOLD 2023 (target 88–92 % in exacerbations, read); Pulse targets shunt 0.12/0.19/0.20 (Pulse lumps V/Q into shunt) | [P] | — |
| Dead space | `vdPhysFrac` | main §1.5 (0.35 / 0.40 / 0.50 / 0.60) | Pulse targets 0.37 / 0.49 / 0.73 | VD/VT | EtCO2 under-reads by 5–15 | Pulse validation; COPD-VD (main §10) | [P] | Q19 |
| O2-induced hypercapnia | `vqLow` → high V/Q with FiO2; drive | in chronic hypercapnia (baseline PaCO2 > 45): FiO2 0.21 → 0.5 raises PaCO2 +5–10 mmHg over 20–30 min (HPV release → dead space; Haldane; small drive fall) | 0–15 | mmHg | "oxygen is not the enemy, but titrate it" | Dellinger 5e ch. 38 p. 616 | [TXT] mechanism / [ENG] size | Q72 |
| Diffusion | `dlFactor` | emphysema 0.5–0.7; bronchitic 0.9 | — | × | exercise/high-CO desaturation | Pulse: diffusion area ×0.5/0.2/0.1/0.05 at sev 0.3–1.0 (much steeper) | [ENG] | — |
| PVR | `pvr` × | main §1.5 (GOLD 4 ×2) + hypoxic term; `pvrReact` 1.3 | — | × | cor pulmonale in GOLD 4 | main §1.5; Pulse: pulmonary capillary R ×1 → 6 | [TXT] | — |
| Ventilator targets | scoring | VT 6–8 mL/kg; RR 10–14; I:E ≥ 1:3; inspiratory flow 60–80 L/min; PEEP ≈ 80 % of PEEPi only when spontaneously triggering; target the **patient's own** PaCO2/pH (pH 7.30–7.40), not 40 | — | — | — | Dellinger 5e ch. 10 p. 152–153 (PEEP counterbalancing PEEPi); [TXT] | [TXT] | — |
| Permissive hypercapnia | `hypercapTol` | high: chronic PaCO2 is the target; acute rises tolerated to pH 7.25 | — | — | — | [TXT] | [TXT] | — |
| Bullae | `bullae` flag | N2O contraindicated (bulla expands); pneumothorax hazard at high Paw (§15) | — | — | — | Miller 10e ch. 29 p. 881; Stoelting 8e ch. 2 p. 29 (avoid N2O and excessive airway pressure) | [TXT] | — |
| Capnogram alpha angle | L2 | GOLD 1 110°, GOLD 2 115°, GOLD 3 125°, GOLD 4 130° (no plateau); exacerbation adds §2 bronchospasm | — | ° | GOLD grade visible on the trace | R39-6 anchors; [ENG] mapping | [ENG] | Q72 |
| ABP / CVP / PPV | emergent | **R27 demo:** RR 20 + VT 8 mL/kg at GOLD 3 → PEEPi 10–15 → MAP −15–30 %, CVP +5, PPV ↑; RR 10 restores it within 1–2 min | — | — | auto-PEEP → hypotension | Pepe & Marini 1982; Tuxen & Lane 1987 | [P] | — |
| Drugs | §2 | bronchodilators as §2 (smaller effect: fixed obstruction ×0.8–0.9); sevoflurane and isoflurane still lower Rrs; desflurane less so in smokers; opioid/volatile drive depression amplified (main §1.5 CO2 slope) | — | × | — | Miller 10e ch. 19 p. 431 ("sevoflurane and isoflurane still decrease respiratory system resistance in patients with COPD") | [TXT] | — |

**Teaching pitfalls.**
1. **Induction hypotension after vigorous bag ventilation** is auto-PEEP until proven otherwise. Disconnect for 30 s.
2. **Auto-PEEP makes CVP/PCWP read high in a hypovolaemic patient** (Pepe & Marini: "inappropriate fluid restriction or unnecessary vasopressor therapy").
3. **Ventilating a chronic CO2 retainer to PaCO2 40** gives post-hypercapnic alkalosis (arrhythmia, seizures, hypokalaemia) and fails weaning. Target his own PaCO2.
4. **SpO2 88–92 % is the target**, not 98 %. Too much O2 in a retainer drifts PaCO2 up.
5. **External PEEP** helps triggering only up to ~85 % of PEEPi. Above that it adds hyperinflation.

## 6. ARDS by Berlin grade (recruitable vs non-recruitable)

Condition id `ards`, graded by the Berlin definition (PEEP ≥ 5 cmH2O): mild 200 < P/F ≤ 300, moderate 100 < P/F ≤ 200, severe P/F ≤ 100. Mortality was 27 / 32 / 45 % and median ventilation days in survivors 5 / 7 / 9. A second axis is **recruitability** `ardsRecruit` (high / low), because the same P/F can hide very different lungs. The main-document row (§4.3 "ARDS": Crs 25–35, atel 0.2–0.4, shunt 0.2–0.4) is superseded by this table; see Q73.

| Parameter | Symbol | Default (mild / moderate / severe) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Static compliance | `crs` | **40 / 35 / 30** | 20–50 | mL/cmH2O | Pplat, ΔP | Arnal 2018 (ARDS 39 [32–50], **no difference between grades**); Pulse targets 40/35/33 (Maj 2023); Berlin draft ancillary Crs ≤ 40 for severe | [P] | Q73 |
| Inspiratory resistance | `raw` | 12 | 9–15 | cmH2O·s/L | small Ppeak − Pplat gap | Arnal 2018 (12 [9–14]); Pulse 12 | [P] | — |
| Expiratory time constant | derived | 0.45 s | 0.40–0.55 | s | little auto-PEEP unless RR > 30 | Arnal 2018 (0.46 [0.40–0.55]) | [P] | — |
| Lung vs chest-wall elastance | `tIt` = 1 − EL/Etot | pulmonary ARDS: EL/Etot 0.8 → `tIt` 0.2; extrapulmonary/abdominal: EL/Etot 0.5 → `tIt` 0.5 (normal 0.5) | 0.2–0.5 | fraction | how much PEEP reaches the heart; transpulmonary pressure for a given Pplat | Dellinger 5e ch. 11 p. 159 ("In normal subjects EL/Etot is approximately 0.5…") | [TXT] | — |
| Non-aerated lung | `atel` (+ consolidation) | 0.25 / 0.35 / 0.45 | 0.1–0.6 | fraction | shunt, Crs (baby lung) | Gattinoni 2006 (on average 24 % of lung not recruitable + 13 % recruitable); Dellinger 5e ch. 11 p. 161 | [P]/[TXT] | — |
| Recruitable fraction of the non-aerated lung | `recruitFrac` | high recruiter **0.5**, low recruiter **0.15** (population mean ≈ 0.35) | 0–0.7 | fraction | PEEP response | Gattinoni 2006 (13 ± 11 % of lung weight recruitable; median 9 %; high recruiters had worse P/F, Crs, dead space and mortality) | [P] | — |
| Shunt | `extraShunt` | 0.20 / 0.30 / 0.40 | 0.1–0.6 | fraction | P/F (with FiO2 and PEEP) | Pulse targets (Maj 2023, Torres 1989, Berlin) | [P] | — |
| Dead space | `vdAlv` + | VD/VT 0.54 / 0.57 / 0.65 | 0.45–0.75 | VD/VT | Pa–EtCO2 gap 10–20; PaCO2 rises at fixed VE | Nuckton 2002 (0.58 ± 0.09; survivors 0.54, non-survivors 0.63; each +0.05 → OR 1.45); Pulse targets (Maj 2023) | [P] | — |
| HPV | `hpvRegional` | 0.3 (partly lost in inflammation/sepsis) | 0.2–0.5 | fraction | iNO and prone work partly by redistributing flow | [TXT] | [VERIFY] | — |
| PVR / acute cor pulmonale | `pvr` × | ×1.5 / ×2 / ×2.5 (micro-thrombi, HPV, hypercapnia, PEEP); **ACP in 22 %** of moderate–severe ARDS | ×1–3 | × | RV dilation; ACP risk ↑ with pneumonia, ΔP ≥ 18, P/F < 150, PaCO2 ≥ 48 | Mekontso Dessap 2016 (read) | [P] prevalence / [ENG] multipliers | Q74 |
| Ventilator: VT | scoring | **6 mL/kg PBW** (4–8) | — | mL/kg | ARDSnet 6.2 vs 11.8 mL/kg: mortality 31.0 vs 39.8 % | ARDSnet 2000 (read) | [P] | — |
| Ventilator: Pplat | scoring | ≤ 30 cmH2O | — | cmH2O | — | ARDSnet 2000 | [P] | — |
| Driving pressure at 6 mL/kg (70 kg PBW, VT 420) | derived | 10.5 / 12 / 14; at Crs 20 → 21 | — | cmH2O | 1 SD (≈ 7 cmH2O) higher ΔP → RR of death 1.41; target ΔP ≤ 15 | Amato 2015 (read); ≤ 15 [TXT] | [P]/[TXT] | — |
| PEEP response (high recruiter) | emergent via §4.1 | PEEP 5 → 15: shunt −30–50 %, Crs +10–20 %, P/F rises, PaCO2 unchanged; CO −5–10 % | — | — | R27 "ARDS shows PEEP-responsive SpO2" | Karbing 2020 (7 of 12 beneficial; read); Gattinoni 2006 | [P] | — |
| PEEP response (low recruiter) | emergent | PEEP 5 → 15: shunt ≈ unchanged, **Crs falls, high-V/Q dead space rises**, CO −10–20 % | — | — | the harmful-PEEP case | Karbing 2020 (4 of 12: both shunt and high V/Q rose) | [P] | — |
| Recruitment manoeuvre | main §4.1 `P_open`, `tauRec` | P_open 40–45 cmH2O; τ_rec 10–30 s in ARDS (vs 2.6 s in healthy atelectasis); re-collapse τ 1–5 min if PEEP < closing pressure (≈ 10–15) | — | cmH2O, s | SpO2 rises after RM, falls again on ZEEP or disconnection | Dellinger 5e ch. 11 p. 162 (recruitability 5 → 45 cmH2O); [ENG] τ | [ENG] | Q73 |
| I:E, RR | scoring | I:E 1:1–1:2; RR up to 35 to hold pH ≥ 7.25–7.30 | — | — | intrinsic PEEP at RR > 30 | ARDSnet 2000 protocol [TXT] | [VERIFY] | — |
| Permissive hypercapnia | `hypercapTol` | PaCO2 up to 60–70, pH ≥ 7.20, **unless ACP/PH (§1)** | — | mmHg | — | Hickling 1990 (mean max PaCO2 62; read) | [P] | Q65 |
| Capnogram | L2 | alpha ≈ 105–110° (no obstruction); low EtCO2 plateau; gap 10–20 | — | — | EtCO2 is not PaCO2 in ARDS | R39-6; Nuckton 2002 | [P] | — |
| SpO2 behaviour | emergent | shunt-type: **FiO2-resistant**, PEEP- and prone-responsive | — | — | contrast with §5 low V/Q | [TXT] | [TXT] | — |
| PPV/SPV | emergent | at VT 6 mL/kg and Crs < 30, PPV under-reads preload responsiveness (small `pIt` swing) | — | % | false-negative PPV | [TXT] | [VERIFY] | — |
| NMB (48 h), iNO, prone | drug/position rows | NMB: VO2 −10 %, abolishes asynchrony; iNO 5–20 ppm: shunt −0.03–0.08, P/F +20 % transient, no mortality benefit; prone: shunt −30 %, PaCO2 response prognostic | — | — | — | Dellinger 5e ch. 11 p. 161 (prone PCO2 response prognostic); Hu 2026 review (iNO transient benefit, read) | [TXT]/[P] | — |

**Pulse value.** Pulse's ARDS action applies the "restrictive" multipliers: compliance ×0.65 / 0.55 / 0.5 / 0.4 at severity 0.3–1.0, alveolar-duct R ×10–25 and diffusion area ×0.5 → 0.05. Its validation targets (C 40/35/33, VD/VT 0.54/0.57/0.65, shunt 0.2/0.3/0.4) are adopted above. Its R multipliers are not (Arnal: R in ARDS ≈ normal).

**Teaching pitfalls.**
1. **P/F is not the lung.** Two patients with P/F 120 can differ tenfold in recruitability. PEEP 15 helps one and harms the other (Karbing). Look at Crs and dead space when PEEP changes.
2. **6 mL/kg is predicted, not actual, body weight.** Then check the driving pressure: a small baby lung needs less than 6.
3. **EtCO2 badly under-reads PaCO2** (VD/VT 0.55–0.65). Adjusting the ventilator to EtCO2 leaves the patient acidotic.
4. **A disconnection derecruits in seconds**, and SpO2 falls a minute later. Use a closed suction / clamp.
5. **Permissive hypercapnia with a failing RV** turns into acute cor pulmonale (22 %). Watch CVP and PAP when PaCO2 is allowed up.

## 7. Pulmonary fibrosis / interstitial lung disease

Condition id `ild`, severity 0–1 (0.3 mild, FVC 70–80 %; 0.6 moderate, FVC 50–70 %, DLCO 40–60 %; 0.9 end-stage, FVC < 50 %, DLCO < 35 %), with an **acute exacerbation** flag. It covers IPF and the fibrosing ILDs; sarcoid and SSc-ILD reuse it (§8). The lung is small, stiff and fast (short τ) and has poor diffusion. PH comes with it as progression destroys the vessels (Stoelting 8e ch. 3 p. 47: "Pulmonary hypertension and cor pulmonale develop as progressive pulmonary fibrosis results in the loss of pulmonary vasculature"). The ventilator teaching is that **these lungs cannot be recruited or protected by PEEP**, and acute exacerbations on the ventilator carry a very poor outcome.

| Parameter | Symbol | Default (sev 0.3 / 0.6 / 0.9) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Static respiratory compliance | `crs` | 45 / 32 / 20 | 15–55 | mL/cmH2O | Pplat high for small VT | Nava & Rubini 1999 (end-stage IPF: Est,rs 51.9 cmH2O/L → Crs ≈ 19; read). Pulse: restrictive compliance ×0.65/0.55/0.5/0.4 | [P] | — |
| Lung vs chest wall | `tIt` | lung stiff, chest wall near normal: EL/Etot ≈ 0.9 → `tIt` 0.1–0.2 | — | fraction | high Paw reaches the heart only weakly; transpulmonary pressure ≈ Pplat (VILI risk) | Nava & Rubini 1999 ("almost totally due to abnormalities in lung mechanics"); Dellinger 5e ch. 11 p. 159 | [P]/[TXT] | — |
| Resistance | `raw` | 11 / 13 / 17 | 10–20 | cmH2O·s/L | modest | Nava & Rubini 1999 (Rrs 16.7 end-stage). Pulse: alveolar-duct R ×10–25 (not supported) | [P] | — |
| Time constant, auto-PEEP | derived | τ ≈ 0.3 s; **PEEPi negligible** even at RR 35 | — | s | fast shallow breathing is mechanically efficient | Nava & Rubini 1999 (PEEPi negligible at RR 35) | [P] | — |
| FRC / TLC | `frcFactor` × | 0.85 / 0.7 / 0.55 | — | × | small O2 store → fast desaturation at apnoea | [TXT] | [ENG] | — |
| Diffusion factor | `dlFactor` | 0.7 / 0.45 / 0.25 | 0.2–1 | × | **exercise- and high-CO desaturation**; the end-capillary PO2 gap grows with CO (main §4.5 transit time) | Stoelting 8e ch. 3 p. 47 (DLCO decrease); Pulse: diffusion area ×0.5/0.2/0.1 | [TXT]/[ENG] | — |
| Shunt / V/Q | `extraShunt`, `vqLow` | shunt 0.02 / 0.05 / 0.10; low V/Q 0.05–0.10 | — | fraction | resting hypoxaemia in end-stage; FiO2-responsive except in exacerbation | [TXT] | [ENG] | — |
| Dead space | `vdAlv` + | +0.05 / +0.10 / +0.15 | — | VD/VT | small VT → VD/VT high; hypercapnia late | [TXT] | [ENG] | — |
| PVR | `pvr` × | ×1.0 / 1.3 / 2.0 (vessel loss, fixed; `pvrReact` 1.3) | ×1–3 | × | group 3 PH (§1) | Stoelting 8e ch. 3 p. 47 | [TXT] | — |
| Acute exacerbation | flag | adds ARDS-like shunt +0.2, Crs ×0.7, `kfMult` ×2 | — | — | the "IPF on the ventilator" scenario | [TXT] | [ENG] | Q75 |
| Recruitability | `recruitFrac` | 0.05 (fibrosis does not open) | 0–0.1 | fraction | PEEP raises Pplat and dead space, not PaO2 | [TXT] | [ENG] | — |
| Ventilator at 6 mL/kg (VT 420) | derived | ΔP 9 / 13 / 21 cmH2O; Pplat > 30 at PEEP 10 in end-stage | — | cmH2O | 4–6 mL/kg with RR 25–35 is the realistic setting | Nava & Rubini 1999 (ventilated at VT 3.4 mL/kg, RR 35) | [P] | — |
| PEEP response | emergent | PEEP 5 → 10: PaO2 ≈ unchanged, Pplat +5, CO −5–10 % | — | — | — | [ENG] | [ENG] | — |
| Permissive hypercapnia | `hypercapTol` | moderate; limited by PH (§1) | — | — | — | [TXT] | [ENG] | — |
| Monitor signature | emergent | high RR, small VT; alpha ≈ 100–105° (steep upstroke, short plateau); SpO2 falls with any rise in CO or exertion; Pa–Et gap 5–10 | — | — | — | R39-6; [ENG] | [ENG] | — |
| Drugs | — | steroids/antifibrotics: no acute effect; iNO roughly neutral on oxygenation | — | — | — | [TXT] | [VERIFY] | — |

**Teaching pitfalls.**
1. **Driving pressure is high at "protective" volumes.** 6 mL/kg may already give ΔP > 20. Accept a smaller VT and a higher RR; there is no auto-PEEP penalty.
2. **Recruitment manoeuvres do not work.** They cost blood pressure and add dead space.
3. **Desaturation on induction is fast** (small FRC, poor diffusion). Preoxygenate with PEEP.
4. **PaO2 falls as CO rises** (diffusion limitation), e.g. in a hyperdynamic septic state. This is counter-intuitive and a good exam point.

## 8. Systemic sclerosis (scleroderma)

Condition id `ssc` (systemic sclerosis). It is a **composite** of five things: SSc-ILD (§7 at the chosen severity), PH (§1, group 1 PAH or group 3), restrictive chest-wall skin, oesophageal dysmotility (aspiration, §21) and **digital vasospasm that corrupts the finger SpO2**. Stoelting 8e ch. 24 p. 502 lists "diffuse interstitial pulmonary fibrosis, with resulting arterial hypoxemia and decreased pulmonary compliance". It also lists systemic and pulmonary hypertension, pericardial effusion and Raynaud phenomenon.

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| ILD component | `ild` severity | 0.4 (FVC ≈ 70 %) | 0–0.9 | — | §7 | Launay 2007 (ILD in 110 of 177 screened, ≈ 60 %); Stoelting 8e ch. 24 p. 502 | [P]/[TXT] | — |
| PH component | `ph`, `phGroup` | off by default; when on: group 1 (PAH) or group 3; PVR 3–8 WU | — | WU | §1 | Young 2019 (31 % of SSc-ILD had RHC-proven PH: 24 % PAH, 55 % group 3); Launay 2007 (moderate–severe PH ≈ 18–22 %, with or without ILD) | [P] | Q76 |
| PH out of proportion to the ILD | flag | allowed: PVR can be severe with mild ILD | — | — | the SSc teaching point | Launay 2007 (3 of 9 restrictive ILD patients had PH out of proportion) | [P] | — |
| Chest-wall compliance (skin sclerosis) | `ccw` | 200 → 120 in diffuse cutaneous disease | 100–200 | mL/cmH2O | `tIt` ↑ (0.4 → 0.5); Crs ↓ further | [TXT] | [ENG] | Q76 |
| Diffusion | `dlFactor` | 0.5 (vasculopathy + ILD) | 0.3–0.8 | × | desaturation when CO rises | Launay 2007 (DLCO < 72 % flags PH without ILD) | [P]/[ENG] | — |
| **Finger-probe SpO2 artefact** | `spo2ProbeSite`, `perfIndex` | finger probe: perfusion index ×0.3; **dropout probability 0.4 per case**; finger-to-finger spread ≥ 4 % in 38 %; a cold room or vasoconstrictor → signal loss. Ear/forehead probe: accurate | — | — | the probe, not the patient, desaturates; the fix is the probe site, not FiO2 | Akdogan 2015 (SpO2 unmeasurable in 37.7 % of patients and 11 % of fingers; ≥ 4 % spread in 37.7 %; read) | [P] | Q76 |
| Aspiration risk | links §21 | oesophageal dysmotility: aspiration probability ×3 at induction | — | × | RSI indicated | Stoelting 8e ch. 24 p. 502 (GI tract) | [TXT] | — |
| Pericardial effusion | `vFluid` (main §2.2) | 0–150 mL (chronic, tolerated) | — | mL | with PH it gives low CO | Stoelting 8e ch. 24 p. 502 | [TXT] | — |
| Airway | — | microstomia, limited mouth opening (difficult laryngoscopy) | — | — | not a lung row; listed for scenario authors | [TXT] | [TXT] | — |
| Ventilator | as §7 + §1 | small VT; no permissive hypercapnia if PH; modest PEEP | — | — | — | §1, §7 | — | — |

**Teaching pitfalls.**
1. **"Desaturation" on a finger probe** in a cold theatre may be Raynaud. Check the waveform and perfusion index, move the probe to the ear or forehead, and take a blood gas. Do not escalate FiO2 or PEEP blindly.
2. **PH can be severe with mild ILD.** Assess the RV, not just the CT.
3. **Three restrictive layers stack:** a stiff lung, stiff skin over the chest and a small FRC. Apnoea tolerance is short.

## 9. Kyphoscoliosis and chest-wall restriction

Condition id `chestWall`, with subtype kyphoscoliosis (by Cobb angle), ankylosing spondylitis, flail chest, or severe burns/eschar. The lung is (initially) normal and the **chest wall is stiff**. That changes three things. Crs falls. More airway pressure reaches the pleura, so `tIt` rises and PEEP costs more CO. Transpulmonary pressure is lower for a given Pplat, so a high Pplat is less dangerous to the lung than it looks. Stoelting 8e ch. 3 p. 48 grades kyphoscoliosis by Cobb angle. Below 60° restriction is minimal to mild; above 70° there is a risk of respiratory dysfunction. Above 100°, with VC < 45 %, come chronic hypoventilation, hypoxaemia, PH and cor pulmonale.

| Parameter | Symbol | Default (Cobb 60–70° / 70–100° / > 100°) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Chest-wall compliance | `ccw` | 120 / 70 / 40 | 30–200 | mL/cmH2O | Crs; `tIt` | Stoelting 8e ch. 3 p. 48 (grades); numbers [VERIFY] (Bergofsky 1979, not opened) | [VERIFY] | Q77 |
| Lung compliance | `crs` (lung part) | ×1.0 / 0.85 / 0.7 (compressed lung, microatelectasis) | — | × | — | Stoelting 8e ch. 3 p. 48 ("The lungs are compressed") | [TXT]/[ENG] | — |
| Resulting Crs | derived | ≈ 45 / 32 / 20 | — | mL/cmH2O | Pplat | derived | [ENG] | — |
| Airway → pleural transmission | `tIt` | 0.5 / 0.6 / 0.7 | — | fraction | **PEEP and high Paw cut venous return more** than in a normal chest | main §2.2 (0.7 for a stiff chest wall) | [TXT] | — |
| FRC, VC | `frcFactor` × | 0.85 / 0.7 / 0.5; VC < 45 % above 100° | — | × | apnoea tolerance | Stoelting 8e ch. 3 p. 48 | [TXT] | — |
| Shunt / A–a gradient | `extraShunt` | +0.02 / +0.05 / +0.10 (compressed lung on the concave side) | — | fraction | raised A–a gradient | Stoelting 8e ch. 3 p. 48 | [TXT] | — |
| Chronic hypoventilation | `paco2Set`, `co2Slope` × | PaCO2 40 / 42 / 50–60 (HCO3 compensated); CO2 slope ×1 / 0.8 / 0.5 | — | mmHg | post-op ventilatory failure; REM hypoventilation | Stoelting 8e ch. 3 p. 48 | [TXT] | — |
| PVR | `pvr` × | ×1 / 1.2 / 2 (hypoxic, cor pulmonale) | — | × | §1 | Stoelting 8e ch. 3 p. 48 | [TXT] | — |
| Resistance, τ | `raw`, derived | normal R; short τ (0.3 s) | — | — | no auto-PEEP | [ENG] | [ENG] | — |
| Recruitability | `recruitFrac` | 0.4 (compression atelectasis opens, but only at high Paw) | — | — | — | [ENG] | [ENG] | — |
| Ventilator | scoring | VT 6 mL/kg PBW (height from **arm span** when the spine is curved); **Pplat up to 35 acceptable** when the chest wall is the reason (transpulmonary < 25); RR 16–24 | — | — | the "a high Pplat is not always VILI" teaching point | Dellinger 5e ch. 11 p. 159 (transpulmonary pressure = ΔP × EL/Etot) | [TXT] | Q77 |
| Flail chest subtype | `flail` | paradoxical segment: spontaneous VT ×0.6–0.8; contusion shunt +0.1–0.2; PPV (internal splinting) abolishes the paradox | — | — | trauma scenario | Stoelting 8e ch. 3 p. 49 (flail portion moves outward in exhalation; underlying contusion, low compliance and FRC) | [TXT] | — |
| Monitor signature | emergent | normal capnogram shape; high Pplat; larger CVP rise with PEEP; exaggerated PPV | — | — | — | [ENG] | [ENG] | — |

**Teaching pitfalls.**
1. **A high Pplat with a stiff chest wall is not the same as a high Pplat with stiff lungs.** Estimate the transpulmonary pressure before cutting VT so far that the patient becomes hypercapnic.
2. **PBW from height is wrong in severe scoliosis.** Use arm span or ulna length.
3. **Post-operative ventilatory failure is the main risk**, not the intra-operative period. The VT is fixed and small, the CO2 response is blunted, and opioids add to both.

## 10. Obesity and obesity hypoventilation syndrome

Condition id `obesity`, driven by BMI through **main §1.3** (FRC factor, atelectasis multiplier, Crs ×0.95–0.65, blood volume). This table adds three things. The first is the mechanics partition and the ventilator response. The second is the **OHS** flag `ohs`: BMI ≥ 30 and awake PaCO2 ≥ 45 mmHg without another cause (the ATS 2019 guideline uses serum HCO3 < 27 mmol/L to exclude it). The third is a correction to common teaching: in anaesthetised supine obese patients the **lung**, not the chest wall, carries most of the compliance loss.

| Parameter | Symbol | Default (BMI 40, anaesthetised, supine) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Crs | `crs` | **32** (vs 53 in controls) | 24–40 | mL/cmH2O | Pplat | Behazin 2010 (0.032 ± 0.008 vs 0.053 L/cmH2O; read); main §1.3 ×0.65 at BMI ≥ 40 agrees | [P] | — |
| Lung compliance | `crs` (lung part) | **43** (controls 84) | 27–59 | mL/cmH2O | the stiffness comes from atelectasis and a small lung volume | Behazin 2010 | [P] | — |
| Chest-wall compliance | `ccw` | **195** (controls 223): **barely changed** | 90–300 | mL/cmH2O | corrects "obesity = stiff chest wall" | Behazin 2010; Pelosi 1998 ("compliance of the chest wall was only minimally affected"; read) | [P] | Q78 |
| Pleural (oesophageal) pressure at relaxation volume | `pPl0` | **+12.5 cmH2O** (controls +6.9) | 5–20 | cmH2O | positive pleural pressure closes airways and causes atelectasis at low PEEP; PEEP near Pes keeps the lung open | Behazin 2010 | [P] | Q78 |
| Airway → pleural transmission | `tIt` | 0.35–0.5. Main §2.2 suggests 0.7 for obesity/IAH; Behazin's near-normal Ccw argues lower | — | fraction | cost of PEEP in CO | Behazin 2010 vs main §2.2 | [P]/[TXT] | Q78 |
| Resistance | `raw` × | ×1.3 (lung R rises with BMI because lung volume is smaller) | 1.1–1.6 | × | — | Pelosi 1998 | [P] | — |
| FRC / EELV under GA | `frcFactor` | main §1.3 (0.5 at BMI ≥ 40); EELV halves on induction (1387 → 697 mL) | — | × | fast desaturation | Reinius 2009 (read) | [P] | Q8 |
| Atelectasis after induction | `atel` | **0.11** of lung volume (awake 0.01) | 0.05–0.2 | fraction | shunt +0.10–0.15 | Reinius 2009 (11 ± 6 %) | [P] | — |
| Recruitability | `recruitFrac` | **0.9** (almost all compression atelectasis) | 0.7–1 | fraction | RM + PEEP work well | Reinius 2009 (RM 55 cmH2O × 10 s + PEEP 10: atelectasis 11 → 3 %, P/F 266 → 412) | [P] | — |
| PEEP alone (no RM) | emergent | PEEP 10 **does not** reduce atelectasis or improve oxygenation | — | — | the RM-then-PEEP teaching point | Reinius 2009 | [P] | — |
| RM + ZEEP | emergent | transient benefit; re-collapse within minutes (main §4.1 τ at FiO2 1.0) | — | — | — | Reinius 2009 | [P] | — |
| Opening pressure | main §4.1 `P_open` | 45–55 | 40–60 | cmH2O | — | Reinius 2009 (55 cmH2O used) | [P] | — |
| V/Q, oxygenation | emergent | PaO2/PAO2 falls exponentially with BMI; PaCO2 unchanged (non-OHS) | — | — | — | Pelosi 1998 | [P] | — |
| OHS: chronic PaCO2 / drive | `paco2Set`, `co2Slope` × | PaCO2 50 (45–60) with HCO3 ≥ 27; CO2 slope ×0.5; opioid sensitivity ×1.5 | — | mmHg | post-op hypercapnic failure; O2 without ventilation raises PaCO2 | Mokhlesi 2019 (ATS; HCO3 < 27 excludes; read) | [P]/[ENG] | — |
| OHS: PVR | `pvr` × | ×1.5 (hypoxic, often with OSA) | — | × | §1 group 3 | main §1.5 OSA row | [TXT] | — |
| Ventilator | scoring | VT 6–8 mL/kg **PBW**; PEEP 8–12 after an RM; reverse Trendelenburg/ramped position; a higher Pplat is acceptable if Pes is high | — | — | — | Miller 10e ch. 54 p. 1784 ("moderate positive end-expiratory pressure, tidal volumes based on ideal body weight, and recruitment maneuvers as needed") | [TXT] | — |
| Monitor signature | emergent | SpO2 falls fast at apnoea (main §1.3, Benumof); normal capnogram shape; Pa–Et gap 5–8 (atelectasis); larger PPV/CVP change with PEEP only if IAH | — | — | — | [TXT] | [ENG] | — |

**Teaching pitfalls.**
1. **PEEP without a recruitment manoeuvre does little** in the morbidly obese. Open the lung first, then keep it open.
2. **Dose VT to PBW, not actual weight.** 8 mL/kg of actual weight in a 150 kg patient is 1.2 L.
3. **The high Pplat is partly pleural pressure** (Pes +12 at rest), so the lung is less stretched than the number suggests.
4. **OHS on O2 alone after surgery** drifts into hypercapnic coma with a "good" SpO2.

## 11. Pneumonia (lobar, unilateral)

Condition id `pneumonia`, with side (L/R), extent (lobes, 0.1–0.5 of lung) and bilateral/multilobar escalation to §6 ARDS. Lobar pneumonia is a **consolidation shunt**: the unit is full of exudate, so it cannot be recruited, and the shunt through it is limited by HPV. Infection blunts HPV, so the shunt is larger than the anatomy suggests, and it grows when CO rises. In the canine lobar pneumococcal model, shunt rose from 24 % to 34 % when volume loading doubled CO (Light's group). Needs the **two-lung option** for positioning and unilateral PEEP effects; the single-lung approximation keeps the shunt and loses the positional teaching.

| Parameter | Symbol | Default (one lower lobe ≈ 0.2 of lung) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Consolidated fraction | `consol` (per side) | 0.2 | 0.1–0.5 | fraction | non-recruitable non-aerated lung (unlike `atel`) | [TXT] | [ENG] | Q79 |
| Shunt | `extraShunt` = consol × perfusion share × (1 − HPV) | ≈ 0.15–0.25 | 0.1–0.35 | fraction | FiO2-resistant hypoxaemia | Cooligan 1982 (canine lobar pneumonia shunt 24 %; read) | [P] (animal) | Q79 |
| HPV in the infected lobe | `hpvRegional` | 0.25 (half of normal, endotoxin/NO) | 0.1–0.5 | fraction | shunt rises with CO, fever, vasodilators | Dellinger 5e ch. 40 p. 660 (antibiotics "restore hypoxemic vasoconstriction") | [TXT] | — |
| Shunt vs CO | emergent | shunt ×1.4 when CO doubles (sepsis, fluid, inotropes) | — | × | "improving" haemodynamics worsens SpO2 | Cooligan 1982 | [P] (animal) | — |
| Compliance | `crs` × | ×(1 − 0.8·consol) → ≈ 0.85 | — | × | Pplat modestly up | Dellinger 5e ch. 40 p. 660 ("markedly decreased compliance and airway obstruction in pneumonia") | [TXT] | — |
| Resistance, secretions | `raw` × | ×1.3; secretion noise events (main §4.3) | 1–2 | × | Ppeak spikes before suction | [TXT] | [ENG] | — |
| Dead space | `vdAlv` + | +0.05 | — | VD/VT | small Pa–Et gap increase | [ENG] | [ENG] | — |
| Recruitability | `recruitFrac` | 0.1 (the consolidation does not open) | 0–0.3 | fraction | PEEP overdistends the good lung | Dellinger 5e ch. 40 p. 660 | [TXT] | — |
| PEEP / VT response (unilateral) | emergent (two-lung option) | ↑PEEP or ↑VT → overdistension of the good lung → its PVR ↑ → flow diverted to the pneumonic lung → **shunt ↑, SpO2 ↓** | — | — | the paradoxical PEEP response | Dellinger 5e ch. 40 p. 660 ("increasing PEEP or tidal volume may actually exacerbate hypoxemia") | [TXT] | — |
| Positioning | `position` (lateral) | good lung down: PaO2 +10–20 mmHg; bad lung down: worse (gravity sends flow to the consolidated lung) | — | mmHg | the "good lung down" teaching point | Remolina 1981 (NEJM, positional hypoxaemia in unilateral disease; title/citation opened, abstract not available); Dellinger 5e ch. 40 p. 660 | [TXT] | — |
| PVR | `pvr` × | ×1.1 | — | × | — | [ENG] | [ENG] | — |
| Fever, VO2, VCO2 | `vo2` ×, main §5c | ×1.1 per °C | — | × | EtCO2 rises with fever at fixed VE | [TXT] | [TXT] | — |
| Monitor signature | emergent | SpO2 88–93 % on FiO2 0.4, little FiO2 response; EtCO2 normal to raised; capnogram alpha ≈ 105–110°; tachycardia with fever | — | — | — | R39-6; [ENG] | [ENG] | — |
| Drugs | — | vasodilators (NTG, SNP, milrinone) raise shunt; antibiotics act over days; steroids no acute gas-exchange effect | — | — | — | main §4.2 | [TXT] | — |

**Pulse value.** Pulse applies its "restrictive" multipliers to pneumonia too (compliance ×0.65–0.4, duct R ×10–25, diffusion area ×0.5–0.05, shunt damage 0.10–0.20). Its validation marks pneumonia PaCO2 (left-lobe case), I:E and temperature (no fever) red.

**Teaching pitfalls.**
1. **More PEEP can make unilateral pneumonia worse.** Watch SpO2 after each step.
2. **Good lung down.** Turning the patient with the bad lung dependent drops SpO2 within a minute.
3. **Inotropes, fluid or a vasodilator that raise CO can lower SpO2** by increasing flow through the shunt.

## 12. Atelectasis (perioperative, lobar collapse)

Condition id `atelectasis`. Perioperative atelectasis is **already modelled in main §4.1**: induction atelectasis 6 % at FiO2 1.0 (Edmark), re-collapse τ by FiO2 (Rothen), and recruitment at 40 cmH2O. Miller 10e ch. 12 p. 268: "Atelectasis develops in approximately 90% of patients who are anesthetized, but it is unrelated to the choice of anesthesia". This table adds the two presets that §4.1 does not cover. **Lobar collapse** (`lobarCollapse`) comes from a mucus plug or a malpositioned tube and needs the two-lung option for side-specificity. **Postoperative atelectasis** (`postopAtel`) covers upper-abdominal/thoracic surgery, pain, splinting and opioids.

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| GA atelectasis (reference) | main §4.1 `atelInd` | 0.06 at FiO2 1.0; ×main §1.3 BMI factor | 0.03–0.15 | fraction | shunt +0.05–0.10 | Edmark 2003; Miller 10e ch. 12 p. 268 | [P]/[TXT] | — |
| Lobar collapse: volume | `atel` (one lobe) | RLL 0.2; LLL 0.18; RUL 0.12; whole lung 0.5 | — | fraction | shunt, compliance | [TXT] anatomy | [TXT] | — |
| Lobar collapse: shunt | `extraShunt` | atel × perfusion share × (1 − `hpvRegional` 0.5) → lower lobe ≈ 0.10–0.12 after HPV (0.2 at onset, HPV settles over 5–20 min, main §4.2) | — | fraction | SpO2 falls then partly recovers | main §4.2 | [TXT] | — |
| Recruitability | `recruitFrac` | mucus plug: **0** until bronchoscopy/suction/physio clears it (then 1.0, τ minutes); compression atelectasis: 1.0 | — | fraction | RM does nothing behind a plug; absorption continues | [TXT] | [ENG] | — |
| Absorption rate behind a plug | `tauCollapse` | FiO2 1.0: 5 min; air: ≈ 60 min (N2 splints) | — | min | a high FiO2 speeds collapse behind an obstruction | main §4.1 (Rothen) | [P] | — |
| Compliance | `crs` × | ×(1 − 1.5·atel) (main §4.1 rule) | — | × | Pplat ↑ | main §4.1 | [TXT] | — |
| PVR | `pvrLungVol` | §1 low-volume term | — | × | minor unless PH | Dellinger 5e ch. 43 p. 690 | [TXT] | — |
| Postop atelectasis | `postopAtel` | upper-abdominal/thoracic: atel 0.10–0.15 day 1–2, FRC ×0.7; driven by pain (VT ↓), opioids, supine | — | fraction | PACU/ward desaturation; fever day 1 | [TXT] | [ENG] | — |
| Ventilator / therapy | scoring | RM then PEEP 5–10 (main §4.1); FiO2 ≤ 0.8 after intubation; CPAP/incentive spirometry post-op | — | — | — | main §4.1; Reinius 2009 | [P] | — |
| Monitor signature | emergent | SpO2 −3–8 %, FiO2-partially responsive (shunt); EtCO2 normal; alpha 105°; Pplat +2–5 | — | — | — | [ENG] | [ENG] | — |

**Teaching pitfalls.**
1. **Recruitment manoeuvres cannot open a lobe behind a mucus plug.** Suction or bronchoscopy does. An RM that fails suggests a plug or a tube in the wrong place (§23).
2. **FiO2 1.0 at emergence and extubation** re-creates the atelectasis the RM removed.
3. **Postoperative desaturation on day 1** is atelectasis until proven otherwise. Pain control is the treatment.

## 13. Pulmonary oedema: cardiogenic vs non-cardiogenic

Condition id `pulmOedema`, with `cause` cardiogenic / negative-pressure / re-expansion / neurogenic / TRALI / capillary-leak (sepsis, ARDS → §6). The machinery is **main §2.2** (pOedema threshold, kfLung, tauEvlw, EVLWI) and **main §4.5** (EVLWI → shunt, compliance, resistance, PEEP benefit), with the R24/R27 HF demo. This table specifies how each cause **drives** that machinery, so the causes differ in speed, in pressure, and in whether PEEP or diuresis fixes it.

| Parameter | Symbol | Cardiogenic | Non-cardiogenic (leak) | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Driving pressure | `pCap` vs `pOedema` | PCWP > 18–25 (acute), from LV failure/MR/MS/fluid (R24) | normal PCWP (< 15) | mmHg | the discriminator | main §2.2; Stoelting 8e ch. 3 p. 39 (LVOT obstruction, MS, renovascular hypertension as cardiogenic causes) | [TXT] | — |
| Filtration coefficient | `kfMult` | 1 | TRALI/sepsis 3–4; NPPE 2 (mechanical injury); re-expansion 2–3 in the re-expanded lung only | × | speed of oedema | main §2.2 (sepsis 2–4) | [ENG] | Q80 |
| Onset | scenario | minutes (flash oedema: hypertensive crisis, ischaemic MR) | NPPE: minutes to 2–3 h after relief of obstruction; TRALI: within 6 h of transfusion; re-expansion: within 1–2 h | — | scenario timing | Stoelting 8e ch. 3 p. 39 (NPPE: "a few minutes to as long as 2 to 3 hours") and p. 40 (re-expansion risk with > 1 L, > 24 h collapse, rapid re-expansion) | [TXT] | — |
| Negative-pressure driver | `pIt` (spontaneous against a closed airway) | — | inspiratory pleural pressure −30 to −60 cmH2O during laryngospasm → transmural pCap ↑ → `kfLung` event | cmH2O | post-extubation laryngospasm scenario | Stoelting 8e ch. 3 p. 39 ("high negative intrapleural pressure by vigorous inspiratory efforts against an obstructed upper airway") | [TXT] | — |
| Shunt | `extraShunt` (main §4.5: +0.03 per mL/kg EVLWI > 10) | 0.10–0.25 | 0.15–0.35 | fraction | FiO2-partly-resistant hypoxaemia | main §4.5 | [ENG] | Q25 |
| Compliance | main §4.5 | ×0.7–0.8 | ×0.6–0.7 | × | Pplat ↑ | main §4.5 | [ENG] | — |
| Resistance ("cardiac asthma") | main §4.5 | ×1.2–1.5 (bronchial wall oedema); alpha 115–120° | ×1.1 | × | wheeze; mild capnogram slope | main §4.5; R39-6 | [ENG] | — |
| PEEP / CPAP response | main §4.5 + §2 | **strong**: shunt ×(1 − 0.04·PEEP) **and** LV afterload/preload fall → CO may **rise** in LV failure | moderate (recruitment only); CO falls | — | R27 "HF shows PEEP-improved oxygenation with CO fall" (normal LV) vs CO rise (failing LV) | main §4.5; [TXT] | [TXT]/[ENG] | Q80 |
| Recruitability | `recruitFrac` | 0.6 (alveolar flooding clears with PEEP) | 0.3 | fraction | — | [ENG] | [ENG] | — |
| Clearance | `tauEvlw` | 1–3 h after the pressure is corrected (diuretic, NTG, PEEP) | 12–72 h (leak must heal) | h | recovery speed | main §2.2 | [ENG] | Q25 |
| RR / drive | main §4.6 J-receptor | RR +4–10 | same | /min | tachypnoea before desaturation | main §4.6 | [ENG] | — |
| Monitor signature | emergent | SpO2 falls over minutes, pink frothy fluid in the ETT, Ppeak ↑; ABP high (flash) or low (shock); CVP/PCWP high; PPV small | SpO2 falls, CVP normal, ABP normal or low; PPV may be high (leak + hypovolaemia) | — | — | [TXT] | [ENG] | — |
| Drugs | §6 | NTG (preload/afterload ↓, fastest), furosemide (venodilation in minutes, diuresis 30 min), CPAP; morphine no longer advised [VERIFY] | supportive; no diuretic benefit if hypovolaemic | — | — | [TXT] | [VERIFY] | — |

**Teaching pitfalls.**
1. **Desaturation after laryngospasm is often NPPE, not aspiration.** Onset can be delayed up to 2–3 h (PACU).
2. **In LV failure PEEP can raise CO**, the opposite of the normal heart. In a hypovolaemic leak it lowers it.
3. **Diuretics do not fix a leak.** Watch for hypotension when a TRALI or sepsis patient is diuresed.
4. **Re-expansion oedema after draining > 1 L quickly** from a long-collapsed lung (§14, §15).

## 14. Pleural effusion

Condition id `effusion`, with side and volume (mL). An effusion **occupies pleural space and compresses the lung below it**. It lowers end-expiratory lung volume and compliance, and adds compression atelectasis (shunt). Because the fluid sits in the pleural space, it raises pleural pressure only modestly unless it is massive. Drainage of ≥ 500 mL in ventilated patients improves P/F, Crs and EELV and does not change haemodynamics (Razazi 2014, mean 1.58 L drained). The P/F gain correlates with the EELV gain, not with the volume drained.

| Parameter | Symbol | Default (1.5 L, one side) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Effusion volume | `effusionMl` | 1500 | 200–3000 | mL | drives the rows below | Razazi 2014 (1579 ± 684 mL drained; read) | [P] | — |
| EELV / FRC | `frcFactor` × | −0.5 × effusion volume (the rest is taken up by chest-wall/diaphragm displacement) | 0.3–0.7 of volume | mL | O2 store | Razazi 2014 (EELV rose after drainage) | [P] direction / [ENG] ratio | Q81 |
| Compression atelectasis | `atel` | +0.08 per litre (dependent lobe) | 0.05–0.12 per L | fraction | shunt +0.04–0.08 per L | [ENG] | [ENG] | Q81 |
| Recruitability | `recruitFrac` | 0.3 while the fluid is present; 0.8 after drainage | — | fraction | PEEP helps only partly until drained; high baseline pleural pressure or very negative transpulmonary pressure predicts poor re-expansion | Razazi 2014 | [P] | — |
| Compliance | `crs` × | ×(1 − 0.12 per L) | — | × | Pplat ↓ after drainage | Razazi 2014 (plateau ↓, Crs ↑ after drainage) | [P] direction / [ENG] size | — |
| Pleural pressure | `pPl0` + | +1 per L (a large effusion also shifts the mediastinum at > 2–3 L) | 0–5 | cmH2O | small haemodynamic effect | Razazi 2014 (haemodynamics unchanged by drainage) | [P]/[ENG] | — |
| Oxygenation after drainage | emergent test | P/F +20–30 % at 24 h (less in ARDS) | — | % | test band | Razazi 2014 (improved, less in ARDS) | [P] direction / [VERIFY] size | — |
| Re-expansion oedema | links §13 | > 1 L drained fast after > 24 h collapse → `kfMult` 2–3 in that lung | — | — | — | Stoelting 8e ch. 3 p. 40 | [TXT] | — |
| PVR | `pvrLungVol` | low-volume term (§1) | — | × | minor | Dellinger 5e ch. 43 p. 690 (effusions raise PVR) | [TXT] | — |
| Monitor signature | emergent | SpO2 −2–5 %, FiO2-responsive; normal capnogram; Pplat +2–4; no BP change | — | — | — | [ENG] | [ENG] | — |

**Teaching pitfalls.**
1. **An effusion is not a tension pneumothorax.** Haemodynamics are usually preserved, so do not rush a drain in an unstable patient without looking for another cause.
2. **Drain fast, get oedema.** Limit the drained volume in a long-standing collapse.
3. **PEEP recruits poorly until the fluid is out.**

## 15. Pneumothorax: simple

Condition id `ptxSimple`, with side, size (fraction of hemithorax, 0.1–0.5) and cause (spontaneous, bulla rupture §5, trauma, iatrogenic line/block/biopsy, barotrauma §3/§6). A simple pneumothorax is **air in the pleural space without a one-way valve**. The ipsilateral lung collapses in proportion, pleural pressure stays near atmospheric, and haemodynamics are preserved. Under positive-pressure ventilation any simple pneumothorax can **convert to tension** (§16), and N2O expands it. Dellinger 5e ch. 45 p. 720: iatrogenic pneumothorax follows transthoracic needle biopsy (24 %) and subclavian catheterisation (22 %) most often. Occult pneumothorax is present in up to half of blunt abdominal trauma patients and is often missed on chest radiograph.

| Parameter | Symbol | Default (size 0.3, one side) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Collapsed lung fraction | `atel` (side) | size × 0.5 (one lung = 0.5) → 0.15 | 0.05–0.5 | fraction | shunt | [ENG] | [ENG] | — |
| Shunt | `extraShunt` | collapsed fraction × perfusion × (1 − HPV 0.5) → ≈ 0.07 | — | fraction | SpO2 −2–6 % | main §4.2 | [TXT] | — |
| Compliance | `crs` × | ×(1 − size·0.6) | — | × | Ppeak/Pplat ↑ under PPV | [ENG] | [ENG] | — |
| Pleural pressure | `pPtx` | ≈ 0 (atmospheric; loss of the normal −4) | 0–3 | mmHg | little haemodynamic effect | main §2.2 | [TXT] | — |
| Conversion to tension under PPV | `ptxValve` | hazard 0.2 per 10 min under PPV if not drained [ENG]; certain if a lung laceration is present | — | — | the "simple becomes tension on induction" scenario | Roberts 2015 (ventilated patients: hypoxia 91.8 % vs 50 %; read) | [P] direction / [ENG] hazard | Q82 |
| N2O expansion | `ptxVol` × | FiN2O 0.5 → ×2 volume; 0.67 → ×3; 0.75 → ×4 (equilibrium, over 10–30 min) | — | × | pneumothorax grows under N2O and can reach tension | Miller 10e ch. 18 p. 409 (figure: PN2O 0.5 atm → 2 × Vinit; 0.67 → 3 ×; "N2O may expand a small pneumothorax to a point where intrathoracic pressure rises… (tension pneumothorax)") | [TXT] | — |
| O2 therapy | `ptxResorb` | resorption 1.25–2 %/day on air; ×3–4 on high FiO2 (N2 washout) | — | %/day | why high-flow O2 is given | [TXT] | [VERIFY] | — |
| Recruitability | `recruitFrac` | 0 until drained; 1 after | — | — | PEEP cannot reinflate a lung with a hole in the pleura | [TXT] | [TXT] | — |
| Bronchopleural leak under PPV | links §24 | if the visceral pleura keeps leaking, VT is lost via the drain | — | — | — | §24 | — | — |
| Monitor signature | emergent | SpO2 −2–6 %; Ppeak +3–8 on volume control (or VT ↓ on pressure control); EtCO2 ≈ unchanged; ABP normal; ultrasound "lung point" (not modelled) | — | — | — | [TXT] | [ENG] | — |

**Pulse value.** Pulse models closed and open pneumothorax as a leak path with R = 100/severity² into the pleural compartment (§3 of the audit). It has no pleural-pressure coupling to the circulation, so its pneumothorax hypotension comes only via hypoxia/hypercapnia reflexes.

**Teaching pitfalls.**
1. **Stop N2O** in any patient with a pneumothorax or suspected occult chest trauma.
2. **A "small, stable" pneumothorax on the ward becomes a tension pneumothorax after induction of PPV.** Drain it before GA, or be ready to.
3. **Rising Ppeak after a central line or a supraclavicular block** is a pneumothorax until proven otherwise.

## 16. Pneumothorax: tension

Condition id `ptxTension`, a side and an onset rate. It is the main §2.2 `pPtx` row and the **H6 acceptance test** (over 2–5 min: CVP +5–15, SBP < 90, Ppeak +10–20, SpO2 ↓, EtCO2 ↓ with CO, PEA if untreated; needle decompression restores it within 1–2 min). This table pins down the ventilated vs spontaneous difference, which is the most important clinical fact about tension pneumothorax. Across 183 reported cases, **ventilated patients had 12.6× the adjusted odds of hypotension and 17.7× the odds of cardiac arrest**, hypoxia in 91.8 % vs 50 %, and 70 % of those who became hypotensive did so **within minutes**. In one cohort, 39.6 % of ventilated patients presented without a pulse, against none of those breathing spontaneously.

| Parameter | Symbol | Ventilated (PPV) | Spontaneous | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Pleural pressure build-up | `pPtx`(t) | each breath adds VT × leak fraction (0.1–0.3) to the pleural gas; `pPtx` 15–25 mmHg within **2–5 min** | slow: 5–15 over 30–60 min, limited by the patient's own negative pressure | mmHg | venous return (main §2 `pIt`), mediastinal shift | Roberts 2015 (read); main §2.2 | [P] direction / [ENG] rate | Q82 |
| Venous return / CO | emergent via `pIt` | CO −50–80 %; PEA at `pPtx` ≈ 20–25 | CO −10–30 % until late | — | — | main §2.3 H6 | [ENG] | — |
| Hypoxia | emergent | shunt 0.3–0.5 (collapsed lung + compressed contralateral) | SpO2 falls in 50 %; tachypnoea dominates | — | — | Roberts 2015 | [P] | — |
| Airway pressure | `crs` × | Ppeak +10–20 on volume control; VT ↓ 30–60 % on pressure control | — | cmH2O | the vent alarm is often the first sign | main §2.3 H6 | [ENG] | — |
| CVP | emergent | +5–15 (jugular distension) | +3–8 | mmHg | — | main §2.3 H6 | [ENG] | — |
| EtCO2 | emergent | falls with CO (−10–20 mmHg); abrupt fall before arrest | ↓ late | mmHg | — | [TXT] | [ENG] | — |
| PPV/SPV | emergent | PPV rises steeply (> 20 %) before BP collapses | pulsus paradoxus | % | — | [ENG] | [ENG] | — |
| Needle decompression | action | `pPtx` → ≈ 0 within 1–2 breaths (if the needle reaches the pleura); **failure probability 0.3** with a short catheter at 2nd ICS MCL [VERIFY] | same | — | "decompressed but still hypotensive" scenario | Dellinger 5e ch. 45 p. 720 (large-bore needle, 2nd interspace MCL); failure rate [VERIFY] | [TXT]/[VERIFY] | Q83 |
| Chest drain / finger thoracostomy | action | definitive; re-expansion over 1–5 min | same | — | — | [TXT] | [TXT] | — |
| Triggers | events | barotrauma (§3/§5/§6), central line, trauma, N2O on a simple pneumothorax (§15), laparoscopy (capnothorax) | — | — | — | Miller 10e ch. 18 p. 409–410 | [TXT] | — |

**Pulse value.** Pulse's tension pneumothorax has no pleural-pressure coupling to the heart; its validation shows pneumothorax DBP/VT rows red/yellow and needle-decompression MAP yellow. Our §2 `pIt` coupling is what makes the H6 picture emerge.

**Teaching pitfalls.**
1. **Under PPV it is a minutes-long emergency, not a radiological diagnosis.** Rising Ppeak, falling BP, rising CVP and falling EtCO2 on a ventilated patient mean decompress now.
2. **A failed needle** (short catheter, thick chest wall) leaves the patient in tension. Go to finger thoracostomy.
3. **Hypotension right after induction or after a central line** in a trauma patient: think tension pneumothorax as well as hypovolaemia.

## 17. Haemothorax

Condition id `haemothorax`, with side, volume and bleed rate. It combines a **space-occupying effusion** (§14 mechanics, but acute), **haemorrhage** (main §5b.4 volume loss) and, in trauma, a pneumothorax (haemopneumothorax in about 20 % of chest trauma, Dellinger 5e ch. 45 p. 720). Massive haemothorax (commonly > 1500 mL initial drain output or > 200 mL/h for 2–4 h [TXT]) is a surgical, not a ventilator, problem. The model teaches that **hypotension is mainly hypovolaemia**, with a smaller compressive component.

| Parameter | Symbol | Default (1.5 L, one side) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Blood volume loss | main §5b.4 `bloodVolume` − | = haemothorax volume (+ ongoing bleed rate) | 0.3–3 L | mL | ATLS class, PPV ↑, CO ↓ | main §5b.4 | [TXT] | — |
| Lung compression | as §14 | EELV −0.5 × volume; atel +0.08/L; Crs ×(1 − 0.12/L) | — | — | shunt, Pplat | §14 | [ENG] | — |
| Pleural pressure | `pPtx` | +1–3 per L (blood is heavier than an effusion's distribution but not a valve); massive (> 2.5 L) → tension-like shift | 0–10 | mmHg | venous return | [TXT] | [ENG] | Q83 |
| Recruitability | `recruitFrac` | 0.2 until drained; clotted haemothorax stays 0.3 | — | — | — | [TXT] | [ENG] | — |
| Drain output → decision | scenario | initial > 1500 mL or > 200 mL/h × 2–4 h → thoracotomy | — | mL | the scenario endpoint | [TXT] | [VERIFY] | — |
| Hb | main §5b | falls with crystalloid dilution | — | g/dL | — | main §5b | [TXT] | — |
| Monitor signature | emergent | tachycardia, PPV > 15 %, falling CVP (unlike tension), SpO2 −2–5 %, Ppeak modest ↑, EtCO2 ↓ with CO | — | — | the CVP distinguishes it from tension | [ENG] | [ENG] | — |

**Pulse value.** Pulse models haemothorax as leak paths from the circulation into the pleural space; its validation marks haemothorax MAP/SpO2 yellow.

**Teaching pitfalls.**
1. **CVP falls in haemothorax and rises in tension pneumothorax.** Both give hypotension and high Ppeak.
2. **Draining a massive haemothorax can unmask the haemorrhage** (tamponade effect lost): have blood ready before the drain.

## 18. Pulmonary thromboembolism (massive, submassive)

Condition id `pe`, graded low-risk / intermediate (RV dysfunction) / high-risk (massive: shock, SBP < 90 or vasopressor need, or arrest, per the ESC 2019 scheme [VERIFY: guideline cited, text not opened]). The machinery is **main §2.2 `peFrac`/`peVaso`** (PVR × 1/(1 − φ) × (1 + peVaso·φ); alveolar dead space φ·VA) and the **H5 test** (φ 0.6: mPAP 30–40, never > 40 acute; RA 12–20; CO −40–60 %; EtCO2 −10–20 with PaCO2 up). This table adds the gas-exchange detail, the ventilated-patient signature and the treatment responses. CTEPH (chronic) is §1 group 4.

| Parameter | Symbol | Low / intermediate / high risk | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Obstruction fraction | `peFrac` | 0.2 / 0.35 / 0.6 | 0–0.8 | fraction | PVR, dead space | main §2.2 (McIntyre–Sasahara: mPAP rises above ~30 % obstruction) | [P] | Q27 |
| Prior cardiopulmonary disease | `pvrReact`, `eesRv` | halves the φ needed for shock | — | × | shock in 56 % with prior disease vs 2 % without | Dellinger 5e ch. 42 p. 673 | [TXT] | — |
| Alveolar dead space | main §4.4 | φ × VA → Pa–EtCO2 gap 5 / 10 / 15–25 | — | mmHg | **EtCO2 falls abruptly** on a ventilated patient | main §4.4; Dellinger 5e ch. 42 p. 673 ("an increase in alveolar dead space impairs carbon dioxide (CO2) elimination") | [TXT] | — |
| PaCO2 | emergent | spontaneous: **hypocapnia** (VE ↑); ventilated with fixed VE or massive PE: PaCO2 ↑ | — | mmHg | the paradox | Dellinger 5e ch. 42 p. 673 ("paradoxical elevation of the PaCO2" in massive PE) | [TXT] | — |
| Hypoxaemia mechanism | `vqLow`, low SvO2, PFO | V/Q mismatch (flow diverted to the remaining vessels) + low mixed-venous O2 + PFO R→L (§1 `rightLeftIntracardiac`); shunt +0.05–0.15 at φ ≥ 0.5 | — | — | **PaO2 and A–a gradient normal in ≈ 30 %** | Dellinger 5e ch. 42 p. 673 | [TXT] | — |
| RV response | emergent from §2 | acute cor pulmonale in 61 % of massive PE; **metabolic acidosis (BE < −5) marks the lethal group** (59 % vs 3 % mortality) | — | — | RV dilation, septal shift, low CO | Vieillard-Baron 2001 (read) | [P] | — |
| mPAP ceiling | test | acute mPAP ≤ 40 (a normal RV cannot generate more) | — | mmHg | a PAP > 40 means chronic PH (CTEPH or other) | main §2.3 H5 | [P] | — |
| Mechanics | `crs`, `raw` | ≈ normal; bronchoconstriction (serotonin) R ×1.2 in massive | — | × | — | [TXT] | [ENG] | — |
| Ventilator | scoring | avoid high PEEP and high mean Paw (RV afterload); small VT; FiO2 1.0; **induction and PPV can precipitate arrest** in high-risk PE | — | — | — | [TXT] | [TXT] | — |
| Monitor signature (ventilated, intra-op) | emergent | EtCO2 −10–20 mmHg in one or two breaths with normal capnogram shape (alpha ≈ 105°); SpO2 falls over 1–2 min; HR ↑, BP ↓, CVP ↑; ECG S1Q3T3/RBBB optional | — | — | the classic intra-operative PE picture | main §2.3 H5 | [TXT] | — |
| Thrombolysis | `peFrac` × | alteplase: φ ×0.5 over 2 h (φ ×0.7 at 30 min) | — | × | recovery curve | [TXT] | [VERIFY] | — |
| Vasopressor / inotrope | §1 rows | norepinephrine first; avoid a fluid bolus > 500 mL | — | — | — | §1 pitfalls | [TXT] | — |

**Teaching pitfalls.**
1. **A sudden EtCO2 fall with an unchanged capnogram shape** means perfusion, not ventilation: PE, low CO or embolism (air, fat, cement). A disconnection or leak changes the shape.
2. **Normal PaO2 does not exclude PE** (≈ 30 %).
3. **Intubating a high-risk PE patient** can precipitate arrest (sympatholysis + PPV on a failing RV). Resuscitate first and induce carefully.
4. **Giving litres of fluid to an acute cor pulmonale** worsens it.

## 19. Fat embolism

Condition id `fatEmbolism`, with two presentations. **Bone cement implantation syndrome / intra-operative fat embolism** (`bcis`, grades 1–3) is acute, at reaming, cementing, prosthesis insertion or tourniquet release. **Fat embolism syndrome** (`fes`) comes 12–72 h after a long-bone/pelvic fracture or arthroplasty. Miller 10e ch. 60 p. 1969–1970: subclinical fat embolism occurs in nearly all such patients and clinically significant FES in up to 30 %. It "can also present as a cardiovascular collapse following reaming of long bones, intramedullary insertion of cemented prosthesis, or tourniquet release". The acute form is a **microembolic PE** (§18 machinery) plus mediator-driven pulmonary vasoconstriction. The late form is a **capillary-leak lung** (§13/§6 machinery) plus the brain and skin.

| Parameter | Symbol | BCIS (acute) | FES (12–72 h) | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Grade definition (BCIS) | `bcis` | 1: SpO2 < 94 % or SBP fall > 20 %; 2: SpO2 < 88 % or SBP fall > 40 % or loss of consciousness; 3: collapse needing CPR | — | — | scenario target bands | Olsen 2014 (severity classification used; read). Grade thresholds: Donaldson 2009 [VERIFY: abstract has no numbers] | [P]/[VERIFY] | — |
| Incidence (hemiarthroplasty) | scenario | grade 1 21 %, grade 2 5.1 %, grade 3 1.7 %; early mortality 9.3 / 35 / 88 % | — | % | risk: ASA III–IV, COPD, diuretics, warfarin | Olsen 2014 | [P] | — |
| Microembolic obstruction | `peFrac` | grade 1: 0.1; 2: 0.25; 3: 0.4, onset over 30–60 s at cementing | 0–0.5 | fraction | dead space, PVR | [ENG] on §18 | [ENG] | Q84 |
| Vasoconstrictor factor | `peVaso` | 1.0 (mediators; higher than thrombus) | 0.5–1.5 | — | PVR out of proportion to the obstruction | Miller 10e ch. 60 p. 1970 (inflammatory response, platelet adhesion) | [TXT]/[ENG] | Q84 |
| Capillary leak | `kfMult` | 1–1.5 | 2–4 over 12–48 h | × | FES = ARDS-like shunt 0.1–0.3 | Miller 10e ch. 60 p. 1970 ("increased capillary leak") | [TXT] | — |
| Paradoxical embolism | `rightLeftIntracardiac` | via PFO when RAP > LAP → cerebral/cutaneous signs | same | — | the neuro picture | Miller 10e ch. 60 p. 1970 | [TXT] | — |
| Monitor signature | emergent | at cementing: EtCO2 −5–15, SpO2 −3–10 %, MAP −20–40 %, CVP/PAP ↑ within 1–2 min; recovers over 5–20 min (grade 1–2) | hypoxaemia, respiratory alkalosis, tachycardia, fever; petechiae/confusion (not monitor) | — | — | Miller 10e ch. 60 p. 1970 | [TXT] | — |
| Ventilator | scoring | FiO2 1.0 at cementing in high-risk patients; small VT; modest PEEP | lung-protective as §6 | — | — | [TXT] | [TXT] | — |
| Treatment | actions | vasopressor (RV support), FiO2 1.0, fluid only if CVP low | supportive | — | — | Miller 10e ch. 60 p. 1970 ("early supportive care with supplemental oxygen and, if necessary, mechanical ventilation") | [TXT] | — |

**Teaching pitfalls.**
1. **Hypotension and an EtCO2 drop at cementing** is BCIS until proven otherwise. Tell the surgeon, give FiO2 1.0, support the RV.
2. **The high-risk hip fracture patient** (ASA III–IV, COPD, diuretics) benefits from invasive monitoring and from discussing an uncemented prosthesis.
3. **Late confusion and hypoxaemia after a femoral fracture** is FES, not "delirium".

## 20. Venous air embolism

Condition id `vae` (venous air embolism), with an entry rate (mL/s) or a bolus (mL), and site (sitting craniotomy, laparoscopy CO2, central line, caesarean, hysteroscopy, pressurised infusion). Air is a **microvascular PE that is absorbed**. Small continuous entry causes dead space and PVR rise, reversible in minutes. A large bolus causes an **RV air lock** (outflow obstruction) and collapse. A PFO allows **paradoxical embolism** (≈ 25 % of adults). Incidence in sitting posterior-fossa surgery: precordial Doppler detects VAE in ≈ 40 % and TEE in up to 76 %; in non-sitting positions ≈ 12 % by Doppler (Miller 10e ch. 53 p. 1751). CO2 embolism (laparoscopy) is the same with faster absorption.

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Air → obstruction | `peFrac` += | entry rate × 0.05 per mL/kg/min steady state; air absorbed with τ 2–5 min (CO2 τ 20–40 s) | — | fraction | dead space, PVR | [ENG] | [ENG] | Q85 |
| Vasoconstrictor factor | `peVaso` | 0.5 | — | — | PVR | [ENG] | [ENG] | — |
| RV air lock (bolus) | `rvAirLock` | bolus > 3–5 mL/kg (≈ 200–300 mL adult) → RV outflow obstruction: SV_RV ×0.2 → PEA | 2–5 mL/kg | mL/kg | cardiovascular collapse | Mirski 2007 (review, abstract read; volumes [VERIFY] from full text not opened) | [VERIFY] | Q85 |
| Paradoxical embolism | `rightLeftIntracardiac` + air | PFO flag (≈ 25 %); opens when RAP > LAP (sitting, PEEP, Valsalva) → cerebral/coronary air: ST elevation (inferior), arrhythmia | — | — | — | Miller 10e ch. 53 p. 1753 (PFO in ≈ 25 % of adults) | [TXT] | — |
| Detection sensitivity order | monitor | TEE > precordial Doppler > **EtCO2 fall (≥ 2–3 mmHg)** / ETN2 rise > PAP rise > CVP rise > BP/SpO2/ECG (late) | — | — | which monitor alarms first | Miller 10e ch. 53 p. 1751–1752 (figure: detection vs VAE volume; Doppler + expired CO2 "the current practice in many institutions") | [TXT] | — |
| EtCO2 | emergent (§4.4) | falls 2–10 mmHg within 1–3 breaths with small entry; normal capnogram shape | — | mmHg | the teaching monitor | Miller 10e ch. 53 p. 1751 | [TXT] | — |
| End-tidal N2 | L2 (optional channel) | rises 0.04–0.1 % on air entry (not with CO2 embolism) | — | % | specific for air | [TXT] | [VERIFY] | — |
| Shunt / SpO2 | emergent | late fall (V/Q + low CO) | — | — | — | [TXT] | [ENG] | — |
| N2O | `ptxVol`-like bubble growth | N2O expands the bubbles: stop it | — | — | — | Miller 10e ch. 18 p. 409 (intravascular air expanded by N2O) | [TXT] | — |
| Treatment actions | actions | flood field/stop entry; FiO2 1.0; stop N2O; aspirate via RA catheter; lower head/jugular compression; left-lateral (Durant) of doubtful value; vasopressor/CPR | — | — | — | Miller 10e ch. 53 p. 1754 (lateral repositioning is "all but impossible" in pins; dog data did not support it) | [TXT] | — |
| PEEP | `peep` | PEEP raises RAP → may open the PFO; does not prevent entry reliably | — | — | — | Miller 10e ch. 53 p. 1753 | [TXT] | — |

**Teaching pitfalls.**
1. **An EtCO2 drop of a few mmHg in a sitting craniotomy** is air until proven otherwise. The BP falls later.
2. **Stop N2O** at once.
3. **PEEP in a sitting patient with a PFO** can send air to the brain.
4. **Laparoscopic CO2 embolism** shows the opposite EtCO2 course at first (EtCO2 may transiently rise as CO2 is absorbed), then falls with collapse.

## 21. Aspiration

Condition id `aspiration`, with volume (mL/kg), pH, particulate flag, and side (right lower lobe default in supine/upright). Warner 1993 (215,488 anaesthetics) sets the teaching epidemiology. Aspiration occurred in 1:3216 anaesthetics: 1:895 in emergencies and 1:3886 electively. 64 % of patients developed **no** cough, wheeze, desaturation (> 10 % fall on air) or radiographic change within 2 h, and none of those had sequelae. Of those who did, about half needed > 6 h ventilation; overall mortality was 1:71,829. Mendelson first described acid-aspiration pneumonitis in obstetrics (Miller 10e ch. 40 p. 1235). The model has three phases: **immediate** (airway reflex bronchospasm, particulate obstruction), **1–4 h** (chemical pneumonitis → capillary leak), and **24–72 h** (possible bacterial pneumonia, §11).

| Parameter | Symbol | Default (acid, 0.4 mL/kg, non-particulate) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Severity from volume and pH | `aspSev` | sev = clamp((vol/0.4)·(pH < 2.5 ? 1 : 0.4), 0, 1) | vol 0.1–2 mL/kg | — | scales the rows below | Mendelson thresholds (pH < 2.5, > 0.4 mL/kg) [TXT, classic; not re-read] | [VERIFY] | Q86 |
| Probability of a clinically silent course | scenario | 0.64 (no signs within 2 h → no sequelae) | — | probability | a teaching branch: observe 2 h | Warner 1993 (read) | [P] | — |
| Immediate bronchospasm | §2 `bronchospasm` | sev 0.3–0.6 within 1 min | — | — | wheeze, alpha 120–130° | [TXT] | [ENG] | — |
| Particulate obstruction | `atel` (segment/lobe) | particulate flag → segmental atel 0.05–0.15, `recruitFrac` 0 until bronchoscopy | — | fraction | shunt | [TXT] | [ENG] | — |
| Chemical pneumonitis | `kfMult`, regional | ×2–4 in the aspirated segments from 30 min, peak 2–6 h | — | × | shunt 0.1–0.3, Crs ×0.7–0.8, ARDS-like if extensive (§6) | [TXT] | [ENG] | — |
| HPV in injured lung | `hpvRegional` | 0.3 (inflammation) | — | — | — | [TXT] | [VERIFY] | — |
| Recruitability | `recruitFrac` | 0.4 (oedematous alveoli partly open with PEEP) | — | — | PEEP helps partly | [ENG] | [ENG] | — |
| Monitor signature | emergent | minutes: SpO2 −3–10 %, Ppeak ↑, EtCO2 slope ↑; hours: SpO2 falls further, RR ↑, fever later | — | — | — | Warner 1993 (> 10 % SpO2 fall on air marks the symptomatic group) | [P]/[ENG] | — |
| Actions | actions | head-down/lateral, suction before PPV, bronchoscopy for particulate; **no steroids, no prophylactic antibiotics** in chemical pneumonitis [TXT]; PEEP; lung-protective ventilation | — | — | scoring | [TXT] | [VERIFY] | — |
| Risk factors | scenario | emergency ×4 (Warner); SSc/achalasia (§8), pregnancy (§29), obesity, opioids, bowel obstruction | — | × | — | Warner 1993 | [P] | — |

**Teaching pitfalls.**
1. **Most aspirations are silent and benign.** Observe for 2 h. No signs by then means no sequelae (Warner).
2. **Suction before you ventilate.** PPV drives the aspirate distally.
3. **Steroids and prophylactic antibiotics do not help** chemical pneumonitis.
4. **NPPE (§13) and aspiration look alike after laryngospasm.**

## 22. One-lung ventilation

Condition id `olv`, with the ventilated side, lateral position, open chest and technique (DLT/blocker). **Requires the two-lung option** (Q35); there is no honest single-lung approximation, because OLV is about how blood divides between two lungs. Miller 10e ch. 49 (Anesthesia for Thoracic Surgery) anchors most rows. It says hypoxaemia during OLV "occurs infrequently" with IV or low-dose volatile techniques: SpO2 < 90 % in < 5 % of cases now, against 20–25 % in 1950–1980. "Even with optimal anesthetic management there is usually a shunt of 20% to 30% during OLV." VT 4–6 mL/kg IBW with titrated PEEP and recruitment is standard.

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Two-lung lateral shunt (before OLV) | emergent | 10–15 % (supine GA ≈ 5 %) | — | fraction | baseline | Miller 10e ch. 49 p. 1534 | [TXT] | — |
| Non-ventilated lung perfusion share | `qNonvent` | gravity: 40 % in lateral → HPV reduces to ≈ 20–25 % | 15–35 % | % of CO | **shunt during OLV 20–30 %** | Miller 10e ch. 49 p. 1538 | [TXT] | Q35 |
| HPV in the non-ventilated lung | `hpvRegional` | 0.5 (phase 1 τ 5 min; phase 2 from ~40 min, main §4.2) | 0.3–0.6 | fraction | SpO2 nadir at 5–10 min, then partial recovery | main §4.2 | [TXT] | — |
| Volatile inhibition of HPV | main §4.2 `hpvVolatile` | ×(1 − 0.2·MAC) **confirmed**: 1 MAC isoflurane inhibits ≈ 20 % of HPV → net ≈ +4 % shunt, too small to see clinically at ≤ 1 MAC | — | × | TIVA vs volatile makes little difference at ≤ 1 MAC | Miller 10e ch. 49 p. 1538 | [TXT] (upgrades main §4.2 [VERIFY]) | Q35 |
| CO effect on shunt and PaO2 | emergent | CO ↑ → shunt ↑ but SvO2 ↑ (net PaO2 ≈ neutral); CO ↓ → both fall, **net PaO2 falls**: maintain CO | — | — | inotrope/fluid teaching | Miller 10e ch. 49 p. 1538 | [TXT] | — |
| Ventilated lung mechanics | `crs` (one lung) | ≈ 0.5 × two-lung Crs; lower inflection point sets best PEEP | — | mL/cmH2O | ΔP for a given VT roughly doubles | Miller 10e ch. 49 p. 1539 (static compliance curve of the ventilated lung) | [TXT] | — |
| VT, ΔP, PEEP | scoring | VT 4–6 mL/kg IBW; ΔP ≤ 15; PEEP 5–10 after RM | — | — | — | Miller 10e ch. 49 p. 1505, p. 1541 ("driving pressure (plateau pressure-PEEP) ≤15 cmH2O") | [TXT] | — |
| PEEP vs auto-PEEP | emergent | auto-PEEP < 2 cmH2O: +5 PEEP raises total PEEP and helps; auto-PEEP > 10 (emphysema): little further rise | — | — | COPD patients tolerate OLV better | Miller 10e ch. 49 p. 1539 | [TXT] | — |
| Pa–EtCO2 gradient | emergent | widens at OLV onset; VE +20 % needed for the same PaCO2 | — | — | EtCO2 falls transiently at OLV start | Miller 10e ch. 49 p. 1539 | [TXT] | — |
| Rescue manoeuvres | actions | FiO2 1.0; RM + PEEP to the ventilated lung; **CPAP 2–5 cmH2O to the recruited non-ventilated lung** (reliable); apnoeic O2 insufflation 3 L/min; clamp the PA; resume two-lung ventilation | — | — | ranked response to desaturation | Miller 10e ch. 49 p. 1541 | [TXT] | — |
| PFO under PEEP | §1 `rightLeftIntracardiac` | PEEP 15 opened a R→L shunt in 9 % in non-thoracic surgery | — | — | rare refractory hypoxaemia | Miller 10e ch. 49 p. 1521 | [TXT] | — |
| PVR / RV | `pvr` × | OLV raises PVR ×1.2–1.5 (half the bed + HPV); a PH trigger (§1) | — | × | — | Stoelting 8e ch. 9 p. 200 (single-lung ventilation as a PH risk) | [TXT]/[ENG] | — |
| Monitor signature | emergent | SpO2 falls over 5–10 min after isolation, nadir then partial recovery (HPV); EtCO2 dips; Ppeak +5–10 | — | — | — | [TXT] | [ENG] | — |

**Teaching pitfalls.**
1. **Desaturation on OLV: first check tube position** (fibreoptic), then FiO2, RM/PEEP, CPAP to the operative lung, then two-lung ventilation.
2. **Letting CO fall worsens PaO2**, even though shunt falls.
3. **Volatile vs TIVA** is not the answer to OLV hypoxaemia at ≤ 1 MAC.
4. **Bullae / high Paw on the dependent lung** → contralateral pneumothorax, a catastrophe during OLV.

## 23. Endobronchial intubation

Condition id `endobronchial` (right mainstem default; left ≈ 1:5 as often), with an optional right-upper-lobe occlusion. It already exists as a Stage 3 event (main §4.3: C ×0.5, shunt +0.25, then HPV → ~+0.15 over 10–20 min). It is **OLV without lung isolation, and unplanned**. The non-intubated lung (and the RUL if the tip is past its orifice) collapses by absorption over minutes, faster at high FiO2.

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Side | `ebSide` | right 0.85, left 0.15 | — | probability | — | [TXT] | [ENG] | — |
| Ventilated fraction | `ventFrac` | right mainstem: 0.55 (0.45 if RUL occluded); left: 0.45 | — | fraction | Crs ×ventFrac; VT all into one lung | [TXT] anatomy | [ENG] | — |
| Compliance | `crs` × | ×0.5–0.55 | — | × | Ppeak/Pplat +50–100 % on volume control, VT ↓ on pressure control | main §4.3 | [TXT] | — |
| Collapse of the non-ventilated lung | `atel` + `tauCollapse` | absorption τ: FiO2 1.0 ≈ 5 min; FiO2 0.3–0.5 ≈ 20–40 min | — | min | slow-onset desaturation | main §4.1 (Rothen) | [P] | — |
| Shunt | `extraShunt` | +0.25 at onset → +0.15 with HPV over 10–20 min | — | fraction | SpO2 falls to 85–92 % on FiO2 0.5 | main §4.3; §22 | [TXT] | — |
| Dead space | `vdAlv` | small ↑ (overdistended ventilated lung) | — | — | EtCO2 ≈ unchanged or slight fall | [ENG] | [ENG] | — |
| Barotrauma | links §16 | VT to one lung → ΔP doubles; pneumothorax hazard if VT unchanged | — | — | — | [TXT] | [ENG] | — |
| Triggers | events | head flexion/position change (tip moves 1–2 cm), pneumoperitoneum/Trendelenburg (carina rises), child (short trachea) | — | — | — | [TXT] | [TXT] | — |
| Monitor signature | emergent | Ppeak ↑ immediately; SpO2 falls after minutes; unilateral breath sounds (not modelled); capnogram shape normal | — | — | — | [TXT] | [ENG] | — |
| Fix | action | withdraw 2–3 cm → RM to reopen the collapsed lung (`recruitFrac` 1.0) | — | — | SpO2 recovers over 1–5 min | main §4.1 | [TXT] | — |

**Teaching pitfalls.**
1. **Rising Ppeak after pneumoperitoneum or head-down tilt** can be the tube moving, not the abdomen.
2. **Pulling the tube back is not enough.** Recruit the collapsed lung.
3. **At FiO2 0.3 the desaturation is slow** and easily blamed on something else.

## 24. Bronchopleural fistula

Condition id `bpf` (bronchopleural fistula), with leak size and a chest drain present or absent. Causes: post-pneumonectomy/lobectomy stump dehiscence, barotrauma in ARDS, necrotising pneumonia, trauma. It is a **leak in the airway tree into the pleura**. Under PPV part of every VT goes out through the drain, and PEEP drives the leak. Without a drain it is a tension pneumothorax (§16). In the Pierson series of 39 ventilated patients (cited in Dellinger 5e ch. 45 p. 723), mortality approached 100 % when the fistula leaked > 500 mL per breath. Lung isolation protects the other lung from soiling (Miller 10e ch. 49 p. 1521).

| Parameter | Symbol | Default (moderate) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Leak conductance | `leakFrac` | fraction of inspiratory flow lost = G_leak·(Palv − Ppl)/flow; default 0.2 of VT at Pplat 25 | 0.05–0.8 | fraction | effective VT ↓, PaCO2 ↑ | [ENG] | [ENG] | Q87 |
| Expiratory leak | `leakFrac` (exp) | continues through expiration while Palv > Ppl (PEEP drives it) | — | — | expiratory VT < inspiratory VT on the ventilator | [TXT] | [ENG] | — |
| Effective ventilation | emergent | VA ↓ by the leak share; PaCO2 rises at fixed VE | — | — | — | [TXT] | [ENG] | — |
| Capnogram | emergent | EtCO2 plateau normal (the gas measured still comes from alveoli) but PaCO2 ↑; drain gas contains CO2 | — | — | the Pa–Et gap widens | [TXT] | [ENG] | — |
| Leak > 500 mL/breath | scenario | lethal-course marker | — | mL | — | Dellinger 5e ch. 45 p. 723 (Pierson 1986 series) | [TXT] | — |
| Oxygenation | emergent | shunt from the collapsed segment; FiO2-responsive | — | — | — | [ENG] | [ENG] | — |
| Ventilator strategy | scoring | lowest Paw and PEEP that oxygenate; shortest Ti; low VT; permissive hypercapnia; lung isolation (DLT/blocker) for a large leak; HFJV only in selected cases (can raise alveolar pressure) | — | — | — | Dellinger 5e ch. 45 p. 723 | [TXT] | — |
| Drain suction | action | suction ↑ raises the transpulmonary gradient → leak ↑ | — | — | "less suction" teaching point | [TXT] | [VERIFY] | — |
| Without a drain | links §16 | → tension physiology | — | — | — | §16 | — | — |
| Monitor signature | vent + monitor | inspired–expired VT difference (the key sign), continuous bubbling, PaCO2 ↑ at fixed settings, SpO2 variable | — | — | — | [TXT] | [ENG] | — |

**Teaching pitfalls.**
1. **Look at the difference between inspired and expired VT.** That is the leak, and PEEP makes it bigger.
2. **Post-pneumonectomy fistula: keep the patient sitting up or operative side down** so pleural fluid does not flood the remaining lung. Isolate that lung before induction (scenario note; soiling is not modelled).
3. **More VT to fix the PaCO2 increases the leak** (a vicious circle). Isolate the lung.

## 25. Tracheal and tube obstruction

Condition id `airwayObstruction`, with site (ETT lumen: secretions/blood/kink/biting; cuff herniation; tracheal: tumour, stenosis, mediastinal mass; upper airway without an ETT: §4, §13 NPPE) and severity. The resistance event already exists in main §4.3 ("tube kink ×5–20, flow-dependent; secretions ×1.5–3 plus noise"). This table adds the flow dependence, the inspiratory/expiratory asymmetry and the monitor picture that distinguishes it from bronchospasm. Resistance through a narrowed tube is **turbulent**, so R rises with flow (Rohrer: ΔP = K1·V̇ + K2·V̇²). Radius matters to the fourth power (laminar) or fifth (turbulent).

| Parameter | Symbol | Default | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Fixed-orifice resistance | `rawK2` (new, flow-squared term) | partial kink/secretion plug: K2 = 20–100 cmH2O·s²/L²; near-complete: > 300 | — | cmH2O·s²/L² | Ppeak rises steeply with inspiratory flow; small change at low flow | [TXT] (Rohrer) | [ENG] | Q87 |
| Inspiratory vs expiratory | `rawExpMult` | fixed ETT lesion: 1.0 (symmetric); variable intrathoracic (tracheomalacia, mediastinal mass) 2–4 (worse in expiration); variable extrathoracic 0.5 (worse in inspiration) | — | × | flow–volume loop shape; auto-PEEP only when expiration is affected | [TXT] | [TXT] | — |
| Anterior mediastinal mass | `mediastinalMass` | on induction/NMB/supine: tracheal R ×5–50, PA/RV compression (`pvr` × 2, venous return ↓) | — | × | the "loss of airway and circulation at induction" scenario | Stoelting 8e ch. 3 p. 39 (mediastinal mass listed as a restrictive/chest disorder) | [TXT]/[ENG] | — |
| Complete obstruction | `raw` → ∞ | VT 0 in PCV; Ppeak = limit in VCV; flat capnogram | — | — | — | [TXT] | [TXT] | — |
| Capnogram | L2 | partial: alpha 115–130° (expiratory limitation raises the slope), lower EtCO2; complete: flat line | — | ° | looks like bronchospasm (§2) | R39-6 | [P]/[ENG] | — |
| Differential vs bronchospasm | teaching | suction catheter passes? → not the tube; Ppeak ↑ with **normal** Pplat in both; wheeze absent in a kink | — | — | diagnostic manoeuvre | [TXT] | [TXT] | — |
| Monitor signature | emergent | Ppeak alarm, VT ↓ in PCV, EtCO2 ↓/shape change, SpO2 falls after minutes | — | — | — | [TXT] | [ENG] | — |
| Actions | actions | pass a suction catheter; check for biting (bite block); deflate/reinflate the cuff; replace the tube; for a mediastinal mass: spontaneous ventilation, lateral/prone, rigid bronchoscopy, ECMO standby | — | — | — | [TXT] | [TXT] | — |

**Teaching pitfalls.**
1. **High Ppeak with a normal Pplat is resistance, and the tube is the commonest resistance.** Pass a suction catheter before giving bronchodilators.
2. **A biting patient emerging from anaesthesia** with a rising EtCO2 and negative pressure: NPPE follows (§13).
3. **Anterior mediastinal mass:** keep spontaneous ventilation; NMB and supine positioning can collapse the airway and the heart.

## 26. Cystic fibrosis

Condition id `cf` (cystic fibrosis), severity by FEV1 (mild > 70 %, moderate 40–69 %, severe < 40 %). CF is **obstructive + suppurative + bronchiectatic**. Mechanically it is COPD-like (§5), with thick secretions that vary through the case, an upper-lobe-predominant V/Q mismatch, and (in severe disease) hypoxic PH with RV failure. Miller 10e ch. 29 p. 883 applies "the same approach for patients with COPD and chronic bronchitis" and notes PH from chronic hypoxia in severe disease, right heart failure, liver dysfunction and malabsorption (vitamin K). Patients are young adults or children, so the §5 age-related comorbidity is absent.

| Parameter | Symbol | Mild / moderate / severe | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Inspiratory R | `raw` × | ×1.3 / 2.0 / 3.0 | — | × | Ppeak | [ENG] on §5 | [ENG] | — |
| Expiratory ratio, τ | `rawExpMult`, `fSlow`, `tauSlowS` | 1.4; slow compartment 0.3 / 0.45 / 0.55, τ 1.0 / 1.5 / 2.5 s | — | —, s | auto-PEEP, alpha | §5; main §4.3 | [ENG] | — |
| Secretion events | main §4.3 secretion noise | R ×1.5–3 spikes every 5–15 min, cleared by suction/physio | — | × | Ppeak spikes, VT dips, SpO2 dips | main §4.3 | [ENG] | — |
| Compliance | `crs` × | ×1.0 / 0.9 / 0.8 (fibrosis + hyperinflation) | — | × | — | [ENG] | [ENG] | — |
| V/Q, shunt | `vqLow`, `extraShunt` | low V/Q 0.05 / 0.10 / 0.15; plugged-segment shunt 0 / 0.03 / 0.08 | — | fraction | SpO2 FiO2-responsive except for the plugged segments | [TXT] | [ENG] | — |
| Dead space | `vdAlv` + | +0.05 / +0.10 / +0.20 | — | VD/VT | — | [ENG] | [ENG] | — |
| Chronic PaCO2 | `paco2Set` | 38 / 42 / 50 | — | mmHg | — | [TXT] | [ENG] | — |
| PVR | `pvr` × | ×1 / 1.2 / 2 (hypoxic PH, cor pulmonale) | — | × | §1 group 3 | Miller 10e ch. 29 p. 883 | [TXT] | — |
| Pneumothorax / haemoptysis events | links §15, §24 | pneumothorax hazard ↑ in severe (subpleural bullae) | — | — | — | [TXT] | [ENG] | — |
| Ventilator | scoring | as §5 (long Te, low RR); frequent suction; humidification; avoid N2O with bullae | — | — | — | Miller 10e ch. 29 p. 883 | [TXT] | — |
| Monitor signature | emergent | alpha 115–130°; recurrent Ppeak spikes; SpO2 88–94 % on air | — | — | — | R39-6; [ENG] | [ENG] | — |
| Drugs | — | as §2/§5; nebulised bronchodilator before induction; vitamin K deficiency (coagulation) | — | — | — | Miller 10e ch. 29 p. 883 | [TXT] | — |

**Teaching pitfalls.**
1. **The airway problem is secretions.** Suction and humidification do more than bronchodilators.
2. **A young patient with an old patient's lungs**: expect COPD-like auto-PEEP and PH in severe disease.

## 27. Neuromuscular weakness

Condition id `nmWeakness`, with cause (myasthenia gravis, Guillain–Barré, muscular dystrophy, ALS/MND, high spinal cord injury, critical-illness weakness, **residual neuromuscular block** from main §5d) and severity by vital capacity. The lung is normal. The **pump** is weak, so the problem appears in **spontaneous breathing**: VT ↓, RR ↑, cough ↓ (atelectasis, secretions), then hypercapnia. Under full PPV the lung looks near-normal. Dellinger 5e ch. 61 p. 1027: normal VC ≈ 65 mL/kg; cough becomes poor at ≈ 30 mL/kg; **VC < 20 mL/kg IBW** or a rapidly declining VC indicates elective intubation. Diaphragmatic weakness alone reduces VC by about 25 %.

| Parameter | Symbol | Default by VC (mL/kg): 40 / 30 / 20 / 15 | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Maximal inspiratory pressure | `pMax` (main §4.6 P_max) | 60 / 45 / 30 / 20 cmH2O (normal 80–100) | — | cmH2O | fatigue threshold via PTI (main §4.6) | Dellinger 5e ch. 61 p. 1027 (VC and NIF monitoring) | [TXT] | Q88 |
| Spontaneous VT / RR | emergent (main §4.6) | VT 7 / 6 / 5 / 4 mL/kg; RR 18 / 22 / 28 / 32 | — | — | rapid shallow breathing | [TXT] | [ENG] | — |
| Cough effectiveness | `coughEff` | 1 / 0.5 / 0.2 / 0.1 → secretion retention → `atel` +0.02–0.10 over hours | — | — | atelectasis, pneumonia (§11) | Dellinger 5e ch. 61 p. 1027 (poor cough at ≈ 30 mL/kg) | [TXT] | — |
| Chest-wall compliance | `ccw` × | ×1 / 0.9 / 0.8 / 0.7 (chronic: microatelectasis, stiff ribs) | — | × | Crs modest ↓ | Dellinger 5e ch. 61 p. 1027 (reduced chest wall compliance) | [TXT] | — |
| PaCO2 | emergent | normal until VC ≈ 20; then rising (sleep first) | — | mmHg | late sign | [TXT] | [TXT] | — |
| Fatigue | main §4.6 `ptiCrit` | PTI > 0.15 → failure over ~45 min, faster with low `pMax` | — | — | — | main §4.6 | [VERIFY] | Q36 |
| Bulbar weakness (MG, MND) | `uaCollapse` | upper-airway collapse and aspiration risk ×2 | — | — | — | [TXT] | [ENG] | — |
| NMB sensitivity | main §5d | MG: non-depolarising ED ×0.3–0.5, succinylcholine resistance ×2–2.5; dystrophies: succinylcholine contraindicated (hyperkalaemia/rhabdo) | — | × | — | [TXT] | [VERIFY] | — |
| Residual block (TOFR < 0.9) | main §5d → `pMax` × | TOFR 0.7: pMax ×0.7, upper-airway tone ↓, HVR ↓ | — | × | PACU hypoventilation, aspiration | main §5d | [TXT] | — |
| Opioid/sedative sensitivity | `co2Slope` × | ×0.7 in moderate–severe weakness | — | × | post-op failure | [ENG] | [ENG] | — |
| Ventilator | scoring | PPV: normal lung, normal settings; weaning limited by pMax; NIV as a bridge only without bulbar weakness | — | — | — | [TXT] | [TXT] | — |
| Monitor signature | emergent (spontaneous) | RR ↑, VT ↓, SpO2 normal until late; EtCO2 low-amplitude, may under-read at high RR (sidestream rise time 240 ms per R39-5 blunts the plateau) | — | — | SpO2 is a late alarm in hypoventilation on O2 | R39-5 | [P]/[ENG] | — |

**Teaching pitfalls.**
1. **SpO2 is normal until very late** (especially on O2). Watch RR, VT, VC and PaCO2.
2. **VC < 20 mL/kg means intubate**, not "wait for the gas".
3. **Rapid shallow breathing with a small, rounded capnogram** can hide hypercapnia on sidestream at high RR.
4. **Residual block** is the commonest weakness an anaesthetist creates.

## 28. Diaphragmatic paralysis

Condition id `diaphragmParalysis`, unilateral (interscalene/supraclavicular block, phrenic injury after cardiac/neck surgery, tumour) or bilateral (high cord injury, neuralgic amyotrophy, bilateral phrenic injury). **Unilateral paresis is universal after interscalene block**: 13/13 patients showed paradoxical ipsilateral motion within 5 min (11 at 2 min), recovering in 3–5 h. FVC and FEV1 fell by 27 % and 26 % (Urmey 1991, 1992). Well tolerated by healthy patients; dangerous with COPD, obesity, contralateral paresis or neuromuscular disease. **Bilateral** paralysis gives severe supine orthopnoea and hypoventilation with paradoxical abdominal motion.

| Parameter | Symbol | Unilateral / bilateral | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| FVC / spontaneous VT capacity | `pMax` ×, `vcFactor` | ×0.73 / ×0.4–0.5 (upright); bilateral supine a further ×0.7–0.8 | — | × | spontaneous VT ↓, RR ↑ | Urmey 1992 (FVC −27 ± 4.3 %; read); Dellinger 5e ch. 61 p. 1027 (diaphragmatic weakness alone: VC −25 %) | [P]/[TXT] | — |
| Onset / offset (block) | `diaphragmBlock`(t) | onset 2–5 min; recovery 3–5 h | — | min/h | PACU time course | Urmey 1991 (read) | [P] | — |
| Basal atelectasis (ipsilateral) | `atel` | +0.03–0.05 / +0.08–0.12 | — | fraction | shunt; SpO2 −1–3 % (unilateral) | [TXT] | [ENG] | — |
| FRC | `frcFactor` × | ×0.9 / ×0.75 supine | — | × | — | [TXT] | [ENG] | — |
| PaCO2 | emergent | unchanged in healthy / rising in bilateral supine or with COPD/obesity/opioids | — | mmHg | — | [TXT] | [ENG] | — |
| Positional effect (bilateral) | `position` | supine VT ×0.6 of upright → orthopnoea, desaturation when laid flat | — | × | induction/positioning trap | [TXT] | [VERIFY] | — |
| Under PPV | — | invisible (the ventilator does the work); reappears at weaning/extubation | — | — | — | [TXT] | [TXT] | — |
| Monitor signature | emergent (spontaneous) | RR +3–6, SpO2 −1–3 % on air (unilateral); bilateral: rapid shallow breathing, rising EtCO2, desaturation supine | — | — | — | [ENG] | [ENG] | — |

**Teaching pitfalls.**
1. **An interscalene block paralyses the hemidiaphragm (100 %)**, so do not do one in a patient who cannot tolerate a 25 % fall in lung function (severe COPD, obesity with OHS, contralateral phrenic palsy).
2. **After cardiac surgery, failure to wean with a raised hemidiaphragm** may be phrenic injury.
3. **Bilateral paralysis desaturates when laid supine for induction.** Induce sitting up.

## 29. Pregnancy (respiratory)

Condition id `pregnancy`. The haemodynamic and gas set-points are **main §1.4**: FRC ×0.8 at term, VO2 ×1.2–1.3, PaCO2 30–32, aortocaval compression, and MAC −25–40 %. This table adds the respiratory mechanics, the airway and aspiration layers, and the ventilator targets. Miller 10e ch. 58 p. 1887: minute ventilation rises 45–50 % from the first trimester, mainly through tidal volume; PaCO2 falls from 40 to about 30 mmHg; pH stays 7.42–7.44 (metabolic compensation). Stoelting 8e ch. 32 p. 698 (Table 32.1): FRC −10–20 %, ERV −25–30 %, VC unchanged, O2 consumption +20 %.

| Parameter | Symbol | Default (term, 38 wk) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Minute ventilation / PaCO2 set point | main §1.4 `paco2Set` | 30–32 (MV +45–50 %) | 28–34 | mmHg | EtCO2 target 28–32 under GA; "normal" 40 is hypoventilation | Miller 10e ch. 58 p. 1887 | [TXT] | — |
| FRC | main §1.4 `frcFactor` | ×0.8 (−10–20 %); supine further ×0.9; closing capacity may exceed FRC | — | × | desaturation at apnoea twice as fast | Stoelting 8e ch. 32 p. 698 | [TXT] | — |
| Chest-wall compliance | `ccw` × | ×0.7 at term (abdominal contents, diaphragm raised 4 cm); lung compliance unchanged | 0.6–0.9 | × | Crs ×0.85; `tIt` 0.5 | [TXT] | [VERIFY] | Q89 |
| Airway | `raw`, `uaCollapse` | capillary engorgement: mucosal oedema (pre-eclampsia more), smaller ETT (6.0–7.0) → R ×1.2 | — | × | difficult airway; bleeding | [TXT] | [TXT] | — |
| Aspiration risk | §21 | ×3 from 2nd trimester to 48 h post-partum (progesterone, LOS tone, gastric position) | — | × | RSI | Miller 10e ch. 40 p. 1235 (Mendelson in obstetrics) | [TXT] | — |
| Atelectasis at induction | main §4.1 × | ×1.5 | — | × | shunt | [ENG] | [ENG] | — |
| O2 store / desaturation | emergent (Stage 3) | apnoea to SpO2 90 %: ≈ ½ of the non-pregnant time; worse in labour and obesity | — | — | preoxygenation, HFNO | main §1.4 | [TXT] | — |
| PVR | `pvr` | ×0.8 (falls in normal pregnancy); PH in pregnancy has 20–30 % mortality [VERIFY] | — | × | §1 | [TXT] | [VERIFY] | — |
| Colloid osmotic pressure | main §1.4 `copPlasma` | 21–22 (post-partum 16–17) → oedema threshold lower (§13) | — | mmHg | pre-eclampsia/tocolytic pulmonary oedema | main §1.4 | [VERIFY] | Q10 |
| Ventilator under GA | scoring | VT 6–8 mL/kg PBW; RR to EtCO2 28–32; PEEP 5; left uterine displacement | — | — | fetal acidosis if maternal PaCO2 → 40+; uterine vasoconstriction if < 25 | [TXT] | [TXT] | — |
| Fetus | out of scope | fetal SpO2 ≤ 60 % even on maternal FiO2 1.0 | — | — | — | Miller 10e ch. 58 p. 1884 | [TXT] | — |

**Teaching pitfalls.**
1. **EtCO2 of 40 in a pregnant patient is hypoventilation.** Her normal is 30.
2. **Desaturation at apnoea is twice as fast**, and the airway is harder.
3. **Post-partum pulmonary oedema** (tocolytics, pre-eclampsia, fluid, low COP) presents in the first 24–72 h.

## 30. Neonatal respiratory distress syndrome and surfactant

Condition id `neonatalRds`. It needs a **neonatal profile** (main §1.1) with weight, gestational age and a size-scaled lung. The disease is **surfactant deficiency**: low compliance, alveolar collapse at end-expiration (a very recruitable lung that de-recruits fast), a very compliant chest wall, and a right-to-left shunt across the duct/PFO when PVR is high (PPHN overlap). Miller 10e ch. 75 p. 2436: compliance is low at birth, and "A surfactant deficiency (e.g., hyaline membrane disease) further decreases lung compliance"; the infant chest wall is very compliant. Current European consensus (Sweet 2023) favours non-invasive support from birth, early surfactant, caffeine, and avoiding intubation.

| Parameter | Symbol | Default (1.5 kg, 30 wk, moderate RDS) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Crs (per kg) | `crs` | 0.4 mL/cmH2O/kg (normal term ≈ 1–1.5) → 0.6 mL/cmH2O | 0.2–0.8 | mL/cmH2O/kg | pressures for VT 4–6 mL/kg | Miller 10e ch. 75 p. 2436 (direction); numbers [VERIFY] | [TXT]/[VERIFY] | Q90 |
| Chest-wall compliance | `ccw` | very high (≈ 3–5 × lung compliance) → E_cw small → `tIt` = E_cw/(E_cw + E_L) ≈ 0.1–0.2 (little airway pressure reaches the heart) | — | — | retractions; FRC not held by the chest wall | Miller 10e ch. 75 p. 2436 | [TXT] | — |
| Resistance (incl. 2.5–3.0 ETT) | `raw` | 60–100 cmH2O·s/L | 40–150 | cmH2O·s/L | — | [TXT] | [VERIFY] | — |
| Time constant | derived | τ ≈ 0.05–0.1 s | — | s | high RR (40–60) possible without auto-PEEP | derived | [ENG] | — |
| Atelectasis / recruitability | `atel`, `recruitFrac` | atel 0.3–0.5; **recruitFrac 0.9**; re-collapse τ **seconds** when PEEP/CPAP is lost | — | — | the "never disconnect a preterm" teaching point | [TXT] | [ENG] | Q90 |
| Shunt | `extraShunt` | intrapulmonary 0.2–0.4 + ductal/PFO R→L 0–0.3 when PVR > SVR | — | fraction | FiO2 need 0.3–0.6 | [TXT] | [ENG] | — |
| PVR (PPHN overlap) | `pvr`, `pvrReact` | high at birth; hypoxia/acidosis reactivity ×2 | — | × | pre- vs post-ductal SpO2 difference > 3–5 % | [TXT] | [ENG] | — |
| Pre/post-ductal SpO2 | monitor (two probes) | right hand vs foot; difference = ductal R→L share | — | % | a monitor feature the engine can show | [TXT] | [TXT] | — |
| Surfactant | action | Crs ×2 and atel ×0.3 over 30–120 min; FiO2 need halves; **risk of overdistension/pneumothorax if pressures are not weaned** | — | — | — | [TXT] | [VERIFY] | Q90 |
| Surfactant threshold | scoring | FiO2 > 0.30 on CPAP ≥ 6 cmH2O [VERIFY: stated in Sweet 2023 full text, not opened] | — | — | — | Sweet 2023 (abstract read) | [VERIFY] | Q90 |
| Ventilator / CPAP | scoring | CPAP 6–8; if ventilated: VT 4–6 mL/kg, PEEP 5–8, Ti 0.3–0.4 s, RR 40–60; SpO2 target 90–94 % | — | — | — | Sweet 2023 (lung-protective, non-invasive first) | [P]/[VERIFY] | — |
| Monitor signature | emergent | grunting/retractions (not drawn); SpO2 falls within seconds on disconnection; EtCO2 under-reads (small VT vs sidestream sampling flow and dead space) | — | — | sidestream at 50–200 mL/min dilutes a 6 mL VT | R39-5 (sidestream); [ENG] | [ENG] | — |

**Teaching pitfalls.**
1. **Disconnection de-recruits a surfactant-deficient lung in seconds.**
2. **After surfactant, compliance rises fast.** Wean the pressures or cause a pneumothorax.
3. **EtCO2 under-reads badly in neonates** (sidestream sampling and apparatus dead space).
4. **A pre/post-ductal SpO2 difference** means PPHN, which oxygen and ventilation alone may not fix.

## 31. COVID-type viral pneumonitis

Condition id `covidPneumonitis` (and other viral pneumonitis), with phenotype L (early: near-normal compliance, severe hypoxaemia from perfusion dysregulation) or H (late/typical ARDS, §6). Gattinoni 2020 proposed the phenotypes. Grasselli 2020 (301 ventilated COVID-ARDS patients) supplies the numbers. Median static compliance was 41 mL/cmH2O (33–52), **28 % higher** than classical ARDS (32 [25–43]); 6 % had compliance above the classical 95th percentile. Lung weight was similar. Of 16 CT angiograms in patients with D-dimer above the median, 15 showed bilateral hypoperfusion: **microthrombosis / dead space**. The physiology is ARDS whose shunt is out of proportion to the mechanics, with a large dead-space component.

| Parameter | Symbol | L phenotype / H phenotype | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Compliance | `crs` | 50 / 35 | 25–60 | mL/cmH2O | ΔP low early | Grasselli 2020 (41 [33–52] vs 32 [25–43]; read) | [P] | — |
| Shunt | `extraShunt` | 0.3 / 0.35 (loss of HPV, perfusion of non-aerated lung) | 0.2–0.5 | fraction | severe hypoxaemia with near-normal Crs | Gattinoni 2020 (phenotype concept; abstract not available) | [VERIFY] | Q91 |
| HPV | `hpvRegional` | 0.1 / 0.3 (dysregulated) | — | — | — | [VERIFY] | [VERIFY] | Q91 |
| Dead space (microthrombi) | `peFrac` (micro) + `vdAlv` | 0.1–0.3 by D-dimer | — | fraction | Pa–EtCO2 gap 10–20; ventilatory ratio high | Grasselli 2020 (bilateral hypoperfusion in 15/16) | [P] | — |
| Recruitability | `recruitFrac` | 0.15 / 0.4 | — | — | high PEEP in L overdistends and lowers CO | [VERIFY] | [VERIFY] | Q91 |
| PVR | `pvr` × | ×1.3 / ×1.8 (thrombosis + hypercapnia) | — | × | acute cor pulmonale (§6) | [ENG] | [ENG] | — |
| Drive | main §4.6 | strong drive with little dyspnoea ("happy hypoxaemia") → large spontaneous VT, P-SILI risk | — | — | — | [TXT] | [VERIFY] | — |
| Ventilator | scoring | L: moderate PEEP (8–10), VT up to 7–8 mL/kg if ΔP low, prone early; H: as §6 | — | — | — | [TXT] | [VERIFY] | Q91 |
| Prone position | action | shunt −30–40 % in both | — | — | — | [TXT] | [VERIFY] | — |
| Monitor signature | emergent | SpO2 80s with RR 25–30 and little distress; EtCO2 low with high PaCO2 later; Ppeak modest (L) | — | — | — | [TXT] | [ENG] | — |

**Teaching pitfalls.**
1. **Oxygenation and mechanics disagree in COVID L.** High PEEP for a low P/F can overdistend a compliant lung and drop CO.
2. **Dead space from microthrombi**: the EtCO2 gap is large, and anticoagulation belongs to the lung picture.

## 32. Smoke inhalation and carbon monoxide poisoning

Condition id `smokeInhalation`, with components that can be switched separately: `upperAirwayBurn` (thermal, supraglottic oedema), `lowerAirway` (chemical tracheobronchitis, bronchospasm, casts, later ARDS), `cohb` (CO poisoning) and `cyanide` (HCN, from burning plastics). Dellinger 5e ch. 46 p. 735: heat is absorbed in the upper airway, whose swelling "can result in upper airway obstruction, which can be fatal before the sequelae of pulmonary burn become apparent". Ch. 46 p. 736: CO poisoning gives "an erroneously high" oxygen saturation reading on pulse oximetry; bronchospasm is frequent. The CO row of **main §1.5 `smoker`** (COHb and SpO2 over-read ≈ 1.06·COHb − 2.5; t½ 4–6 h on air, ~1 h on O2) is reused at poisoning levels.

| Parameter | Symbol | Default (moderate) | Range | Units | What it changes | Source | Tag | Q |
|---|---|---|---|---|---|---|---|---|
| Upper-airway oedema | `raw` (extrathoracic) × | grows over 2–12 h after exposure: ×1 → ×5–20 (inspiratory-dominant, `rawExpMult` 0.5) | — | × | stridor, then obstruction; intubation gets harder with every hour | Dellinger 5e ch. 46 p. 735, p. 737 (early intubation when risk factors) | [TXT]/[ENG] | Q92 |
| Lower-airway injury | §2 `bronchospasm` + secretion events | sev 0.3–0.6 early; casts → obstruction events; ARDS (§6) at 24–72 h | — | — | — | Dellinger 5e ch. 46 p. 736 | [TXT] | — |
| COHb | `cohb` | 25 % | 3–60 | % | true SaO2 and CaO2 ↓ (O2 content), ODC left shift; **displayed SpO2 over-reads** (≈ 97 % at COHb 25 %) | main §1.5 smoker row; Dellinger 5e ch. 46 p. 736 | [P]/[TXT] | — |
| COHb elimination | `cohbHalfLife` | air 4–6 h; FiO2 1.0 ≈ 1 h; HBO faster [VERIFY] | — | h | treatment timeline | main §1.5 | [P] abstract | — |
| Symptoms vs COHb | scenario | **no symptom correlates with a COHb range** | — | — | do not script "headache at 20 %, coma at 50 %" | Hampson & Dunn 2012 (1323 patients; read) | [P] | — |
| Cyanide | `cyanide` | lactate > 8–10 mmol/L with high SvO2 (O2 not used); treat with hydroxocobalamin | — | — | refractory shock, metabolic acidosis, high venous O2 | [TXT] | [VERIFY] | Q92 |
| PaO2 | emergent | normal (CO does not lower PaO2) | — | — | the "normal PaO2 and SpO2, severe tissue hypoxia" lesson | [TXT] | [TXT] | — |
| Ventilator | scoring | FiO2 1.0 until COHb < 5–10 %; lung-protective as §6 when ARDS develops | — | — | — | Hampson 2012 practice recommendations (abstract) | [P]/[TXT] | — |
| Monitor signature | emergent | SpO2 97–100 % (falsely normal), tachycardia, lactate ↑, ST changes (CO cardiotoxicity); stridor or rising Ppeak with airway oedema | — | — | — | Dellinger 5e ch. 46 p. 736 | [TXT] | — |

**Teaching pitfalls.**
1. **A normal SpO2 means nothing in CO poisoning.** Use co-oximetry.
2. **Intubate early** when there are upper-airway burn signs; oedema peaks hours later.
3. **High lactate with a high SvO2 after a house fire** is cyanide.

## 33. Cross-condition summary

**Stacking rule** (when a scenario combines conditions, e.g. COPD + pneumonia, SSc = ILD + PH): multipliers on the same symbol **multiply**; additive terms (`extraShunt`, `vdAlv`, `atel`) **add**, with shunt capped at 0.6 and `atel` at 0.7; `recruitFrac` is the volume-weighted mean of the components' non-aerated lung; `tIt` is recomputed from the combined E_cw and E_L, never multiplied; `hypercapTol` takes the **lowest** of the components (so PH vetoes permissive hypercapnia). [ENG] — Q93.

| # | Condition | Crs (mL/cmH2O) | R insp (cmH2O·s/L) / exp ratio | Shunt (fraction) | PVR | Recruitability | Key pitfall |
|---|---|---|---|---|---|---|---|
| 1 | Pulmonary hypertension | normal (group 3: underlying) | normal | 0 (+ PFO R→L in crisis) | ×1.7–6 (3–10 WU) | n/a (keep FRC) | hypercapnia/fluid precipitate RV failure; PPV false positive |
| 2 | Bronchospasm (acute) | ≈ normal → ×0.8 hyperinflated | 18–60 / 1.3–1.8 | low V/Q 0.05–0.15 | ↑ with hyperinflation | none | chasing PaCO2 → auto-PEEP → PEA |
| 3 | Acute severe asthma | ×0.7–0.8 | 30–50 / 1.8 | low V/Q 0.1–0.2 | ↑ | none | ventilate by lung volume, not PaCO2 |
| 4 | Anaphylaxis (resp.) | ≈ normal | per grade (§2) | low; CO-driven | — | — | bronchospasm after succinylcholine = anaphylaxis |
| 5 | COPD (GOLD 3) | ≈ 60 | 25 / 1.5 | ≤ 0.05 + low V/Q 0.12 | ×1–2 | low (0.1) | auto-PEEP hypotension; SpO2 88–92 % |
| 6 | ARDS (moderate) | 35 | 12 / 1.2 | 0.3 | ×2 | high 0.5 / low 0.15 | P/F ≠ lung; PEEP helps one, harms other |
| 7 | ILD (moderate) | 32 | 13 | 0.05 | ×1.3 | 0.05 | high ΔP at 6 mL/kg; RM useless |
| 8 | Systemic sclerosis | as ILD, Ccw ↓ | as ILD | as ILD | PH 18–31 % | low | finger-probe SpO2 artefact |
| 9 | Kyphoscoliosis (> 70°) | 32 (chest wall) | normal | +0.05 | ×1.2 | 0.4 | high Pplat ≠ lung stretch; PBW by arm span |
| 10 | Obesity (BMI 40) | 32 (lung, not chest wall) | ×1.3 | +0.10–0.15 (atel 0.11) | (OHS ×1.5) | 0.9 | PEEP without RM does little |
| 11 | Pneumonia (lobar) | ×0.85 | ×1.3 | 0.15–0.25 | ×1.1 | 0.1 | PEEP may worsen SpO2; good lung down |
| 12 | Atelectasis / lobar collapse | ×0.7–0.9 | normal | 0.05–0.12 | minor | 1.0 (0 behind a plug) | RM cannot open a plugged lobe |
| 13 | Pulmonary oedema | ×0.6–0.8 | ×1.1–1.5 | 0.1–0.35 | ↑ (LAP) | 0.6 cardiogenic / 0.3 leak | PEEP can raise CO in LV failure |
| 14 | Pleural effusion (1.5 L) | ×0.8 | normal | +0.06–0.12 | minor | 0.3 → 0.8 after drain | not a tension; drain slowly |
| 15 | Simple pneumothorax | ×0.8 | normal | ≈ 0.07 | — | 0 until drained | stop N2O; PPV converts it |
| 16 | Tension pneumothorax | ×0.5 | normal | 0.3–0.5 | — | — | minutes under PPV; decompress now |
| 17 | Haemothorax | as effusion | normal | +0.06–0.12 | — | 0.2 | CVP falls (vs rises in tension) |
| 18 | PE (high risk) | ≈ normal | ×1.2 | +0.05–0.15 | ×3–5 | — | EtCO2 drop, normal shape; no fluid flood |
| 19 | Fat embolism / BCIS | ≈ normal (FES: ×0.7) | normal | FES 0.1–0.3 | ×1.5–3 | — | collapse at cementing |
| 20 | Venous air embolism | normal | normal | late | ↑ | — | small EtCO2 drop first; stop N2O |
| 21 | Aspiration | ×0.7–0.8 | ×1.5–2.5 early | 0.1–0.3 | minor | 0.4 | 64 % silent; suction before PPV |
| 22 | One-lung ventilation | ≈ ½ | ×1.5 (DLT) | 0.2–0.3 | ×1.2–1.5 | — | check tube; keep CO up |
| 23 | Endobronchial intubation | ×0.5 | normal | 0.25 → 0.15 | minor | 1.0 after withdrawal | Ppeak ↑ with pneumoperitoneum |
| 24 | Bronchopleural fistula | as underlying | as underlying | as underlying | — | — | inspired–expired VT gap; PEEP ↑ leak |
| 25 | Tube/tracheal obstruction | normal | flow-dependent (K2) | — | (mass: ×2) | — | pass a suction catheter first |
| 26 | Cystic fibrosis (moderate) | ×0.9 | ×2 / 1.4 + spikes | 0.03 + low V/Q 0.1 | ×1.2 | low | secretions, not bronchospasm |
| 27 | Neuromuscular weakness | ×0.8–0.9 (chest wall) | normal | +0.02–0.10 | — | 1.0 | SpO2 late; VC < 20 mL/kg → intubate |
| 28 | Diaphragm paralysis | normal (PPV) | normal | +0.03–0.12 | — | 1.0 | interscalene = 100 % hemiparesis |
| 29 | Pregnancy (term) | ×0.85 (chest wall) | ×1.2 | +atel ×1.5 | ×0.8 | 1.0 | EtCO2 40 is hypoventilation |
| 30 | Neonatal RDS | 0.4 mL/cmH2O/kg | 60–100 | 0.2–0.4 + ductal | high (PPHN) | 0.9 | disconnection de-recruits in seconds |
| 31 | COVID pneumonitis (L/H) | 50 / 35 | normal | 0.3–0.35 | ×1.3–1.8 | 0.15 / 0.4 | mechanics and P/F disagree |
| 32 | Smoke / CO | ≈ normal → ARDS | upper airway ×5–20 | late | — | — | SpO2 normal in CO poisoning |

**Scale of the catalogue.** 32 conditions and 413 parameter rows across the 32 tables, plus the lead's 9 new-symbol rows and this 32-row summary. Tag cells: [P] 112, [TXT] 158, [ENG] 146, [VERIFY] 50 (a row can carry two tags, e.g. [P]/[ENG] when the direction is sourced and the number is engineered).

## 34. Questions for Ali (continued from main §9, Q65 onward)

★ marks questions that change a default the 7b/Stage V code would otherwise use. "Default" is what the engine does if you do not answer. Questions 1–64 are in the main document §9.

65. ★ **Hypercapnia → PVR is too weak in main §4.2.** Its acidosis term (+25 % PVR per 0.1 pH) predicts +22 % for PaCO2 38 → 50. Viitanen 1990 measured +54 % PVR and +34 % mPAP in anaesthetised post-CABG patients. Proposed: 0.25 → 0.55 per 0.1 pH for everyone, which also strengthens the PH, ARDS-permissive-hypercapnia and PE scenarios. *Default: 0.55.*
66. ★ **PH crisis and the RV ischaemia spiral** (§1). Crisis = mPAP ≥ 0.8 × MAP or RV Ea/Ees > 2. RV ischaemia when RV coronary perfusion < 30 mmHg, Ees_RV decaying to ×0.5 (τ 60 s). PFO right-to-left shunt when RAP > LAP. Vasopressor ranking: norepinephrine or vasopressin over phenylephrine. All [ENG] numbers on [TXT] mechanisms. Is this the crisis you teach, and is the PFO flag worth having (it gives the sudden, FiO2-resistant desaturation)?
67. iNO default effect PVR ×0.8 at 20 ppm, with 10–15 % "responders" (Stoelting); group 3 hypoxic reactivity ×1.3; rebound ×1.2–1.3 on abrupt withdrawal [VERIFY]. Is iNO available to your ICUs, or should inhaled iloprost/milrinone be the default selective vasodilator in scenarios?
68. `pvrLungVol` U-shape: ×(1 + 0.8·atel) below FRC and ×(1 + 0.03·(Pplat − 20)₊) above [ENG on Miller/Dellinger shape]. Does the size of the effect match what you see when you recruit an atelectatic PH patient, or when you over-inflate one?
69. Bronchospasm **expiratory/inspiratory R ratio** 1.3 + 0.5·sev [ENG]. Officer 1998 found expiratory > inspiratory R at baseline, with the ordering method-dependent in severe constriction; Pulse uses 3.5 → 1.7. Also: external PEEP in asthma set at 0–5 only (unlike flow-limited COPD, §5). Agree?
70. Barotrauma hazard in hyperinflated asthma/COPD: a spontaneous pneumothorax probability that scales with trapped volume above 20 mL/kg [ENG]. Should scenarios ever generate an **unannounced** pneumothorax, or only on instructor command?
71. Anaphylaxis: bronchospasm as the lead feature in 18 % (NAP6), split by trigger (succinylcholine 0.35, atracurium 0.10) [ENG on NAP6 direction]. Grade III epinephrine 50 µg IV. Is this the UK/SFAR scheme you teach, or the IM-first (0.5 mg) scheme of Miller's grade table?
72. COPD: O2-induced hypercapnia size (+5–10 mmHg PaCO2 for FiO2 0.21 → 0.5 in a retainer) and the capnogram alpha by GOLD grade (110/115/125/130°) are [ENG]. Do they match what you see? Should the engine show the Haldane component separately for teaching?
73. ★ **ARDS compliance by grade.** The main §4.3 row says Crs 25–35. Arnal 2018's passive-ICU data give 39 [32–50] with **no difference between Berlin grades**, and Pulse's targets are 40/35/33. Adopted: 40/35/30 plus a separate recruitability axis (high 0.5 / low 0.15 of the non-aerated lung). Recruitment τ 10–30 s in ARDS [ENG]. OK to supersede the main row?
74. ARDS PVR multipliers ×1.5/2/2.5 by grade [ENG], calibrated so ≈ 20 % of moderate–severe scenarios with ΔP ≥ 18 and PaCO2 ≥ 48 develop acute cor pulmonale (Mekontso Dessap 22 %). Too aggressive?
75. ILD acute exacerbation is modelled as ARDS-like shunt +0.2, Crs ×0.7 and capillary leak ×2 [ENG]. Is intubating an IPF exacerbation a scenario you want (it usually teaches "ventilation does not rescue it")? Or is peri-operative ILD (VATS biopsy) the commoner case for your trainees?
76. SSc: chest-wall compliance falls from 200 to 120 mL/cmH2O with skin sclerosis [ENG]; PH prevalence is 18–31 % (Launay, Young). Should the SSc preset turn PH on by default? Should the finger-probe artefact (dropout 0.4 per case, from Akdogan) be on by default, so trainees learn to move the probe?
77. Kyphoscoliosis chest-wall compliance of 120/70/40 mL/cmH2O by Cobb band is [VERIFY] (Bergofsky 1979 was not opened). "Pplat up to 35 acceptable when the chest wall is the cause" is a teaching position, not a guideline. Accept?
78. ★ **Obesity mechanics.** Behazin 2010 and Pelosi 1998 find the chest wall nearly normal (Ccw 195 vs 223 mL/cmH2O) and the lung stiff, with pleural pressure +12.5 cmH2O at relaxation volume. Main §2.2 gives obesity `tIt` 0.7, which assumes a stiff chest wall. Proposed: `tIt` 0.35–0.5 for obesity alone, keeping 0.7 for intra-abdominal hypertension, pneumoperitoneum and Trendelenburg; raise `pPl0` to +10–12. Agree?
79. Pneumonia is modelled as **consolidation** (`consol`, non-recruitable) distinct from atelectasis (`atel`), with HPV halved in the infected lobe and shunt that grows with CO. The anchor is animal data (canine lobar pneumonia, shunt 24 → 34 % with CO doubling). Is the two-lung option (needed for "good lung down" and the paradoxical PEEP response) worth building for v1, given that OLV (§22) and endobronchial intubation (§23) need it too?
80. Pulmonary oedema by cause: filtration multipliers (TRALI/sepsis 3–4, NPPE 2, re-expansion 2–3) and the rule that PEEP **raises** CO when LV Ees is low but lowers it in a normal heart. Both are [ENG] and emerge from §2 afterload coupling. Is "PEEP improves CO in acute LV failure" a message you teach at the bedside, or only in theory?
81. Effusion: EELV loss = 0.5 × effusion volume and compression atelectasis +0.08 per litre [ENG]; drainage test band P/F +20–30 % at 24 h (Razazi: improvement, size not in abstract). Acceptable?
82. Simple → tension conversion hazard under PPV (0.2 per 10 min if undrained) [ENG]. Should conversion be stochastic or only on instructor command? Tension onset under PPV: the main §2.2/H6 band is 2–5 min to SBP < 90; Roberts 2015 says most ventilated patients deteriorate "within minutes".
83. Needle decompression failure probability 0.3 (short catheter, 2nd ICS MCL) [VERIFY]. Should scenarios model the ATLS 10th-edition switch to the 4th/5th ICS anterior-axillary site, with a lower failure rate? Massive-haemothorax pleural pressure +1–3 mmHg per litre [ENG]: acceptable?
84. BCIS/fat embolism modelled as microembolic `peFrac` 0.1/0.25/0.4 by grade with a high vasoconstrictor factor (`peVaso` 1.0) [ENG], calibrated to Olsen's grade bands. Is BCIS a priority v1 scenario (elderly hip fracture is very common in teaching lists)?
85. VAE: air-entry → obstruction mapping and air absorption τ 2–5 min (CO2 20–40 s) are [ENG]; RV air-lock bolus 3–5 mL/kg (200–300 mL) is [VERIFY] (Mirski 2007 full text not opened). Are sitting craniotomies done in your centres, or should the default VAE scenario be caesarean/laparoscopic CO2 embolism?
86. Aspiration severity from Mendelson's thresholds (pH < 2.5, > 0.4 mL/kg) [VERIFY] and a 64 % silent-course branch (Warner 1993). Should the scenario ever turn silent aspiration into delayed pneumonia (day 2–3), or stop at the 2 h observation lesson?
87. BPF leak as a pressure-driven conductance (default 20 % of VT) and tube/tracheal obstruction as a new flow-squared resistance term (`rawK2`, Rohrer) [ENG]. The ventilator simulator (R35) may already have a leak and a nonlinear resistance. Should these conditions be implemented **in the ventilator's mechanics** (packages/ventilator) and reported back to the engine, rather than in `lungState`?
88. Neuromuscular weakness maps VC (mL/kg) to maximal inspiratory pressure (60/45/30/20 cmH2O at VC 40/30/20/15) and cough effectiveness [ENG on Dellinger's 65/30/20 mL/kg thresholds]. Is the VC-based grade the one you use, or NIF/MIP (e.g. "20/30/40 rule")?
89. Pregnancy chest-wall compliance ×0.7 at term with lung compliance unchanged [VERIFY]. Given the Behazin finding in obesity (§10, Q78), should pregnancy `tIt` be 0.5 (the proposal) or stay at the main §2.2 value of 0.7?
90. Neonatal RDS: Crs 0.4 mL/cmH2O/kg, R 60–100, re-collapse in seconds, surfactant response (Crs ×2 over 30–120 min), and the FiO2 > 0.30 on CPAP ≥ 6 surfactant threshold are [VERIFY] (Sweet 2023 full text not opened). Is neonatal RDS a v1 scenario for your trainees, or v1.1 (it needs the neonatal profile and pre/post-ductal SpO2 probes)?
91. COVID-type pneumonitis L/H phenotypes: shunt, HPV loss and recruitability per phenotype are [VERIFY] (Gattinoni 2020 abstract unavailable). Compliance (41 vs 32) and microthrombotic dead space are [P] (Grasselli 2020). Keep the L/H split, or model a single "viral pneumonitis = ARDS with more dead space" preset?
92. Smoke inhalation: upper-airway oedema growth (×5–20 over 2–12 h) and cyanide (lactate > 8 with high SvO2) are [ENG]/[VERIFY]. Is hydroxocobalamin available locally, or should the scenario use sodium nitrite/thiosulfate?
93. **Stacking rule** (§33): multipliers multiply, additive shunt/dead space/atelectasis add with caps (shunt 0.6, atel 0.7), `tIt` is recomputed rather than multiplied, and the most restrictive `hypercapTol` wins [ENG]. Acceptable as the default for combined presets (SSc, COPD + pneumonia, obesity + pregnancy)?
94. ★ **Two-lung option (answers part of main Q35).** OLV (§22), endobronchial intubation (§23), unilateral pneumonia (§11), simple pneumothorax (§15) and BPF (§24) need a left/right split: per-side `crs`, `raw`, `atel`, perfusion share and HPV. Miller 10e ch. 49 p. 1538 confirms main §4.2's volatile HPV term (≈ 20 % inhibition per MAC, net ≈ +4 % shunt), so that row can move from [VERIFY] to [TXT]. Build the split in 7b (≈ +4–6 h [ENG estimate]) or defer these five conditions to v1.1?
95. New `lungState` fields proposed in the lead (`resistanceExpCmH2OPerLps`, `chestWallComplianceMlPerCmH2O`, `recruitableFrac`, `vqAdmixture`, `leakFraction`, `condition`/`grade`). Some may belong in the ventilator's own mechanics (see Q87). Engineering question for the Stage V planner; flagged here so you see the scope.

## 35. Sources for §4b

Internal: main document `stage-7-parameter-tables.md` (§1.3–1.5, §2, §4, §9–10); rulings R24, R27, R29, R31, R36, R37, R39 (`research/00-orchestrator-rulings.md`); Pulse audit `research/pulse-audit/03-respiratory-gas.md` §3 and §6 (Pulse 4.3.2 disease multipliers and ventilator validation targets). Abstracts were read through Europe PMC's REST service (PubMed pages returned a reCAPTCHA); "read" below means the abstract or full text was opened this session.

**Local textbooks (R37), page = printed page; sentences extracted with PyMuPDF**
- Miller 10e ch. 12 p. 250: PVR vs lung volume "shows a characteristic U shape… higher at residual volume and total lung capacity and lower at functional residual capacity". p. 268: "Atelectasis develops in approximately 90% of patients who are anesthetized".
- Miller 10e ch. 18 p. 409: "N2O may expand a small pneumothorax to a point where intrathoracic pressure rises".
- Miller 10e ch. 19 p. 429: desflurane "increased airway resistance at 2 MAC"; p. 431: "sevoflurane and isoflurane still decrease respiratory system resistance in patients with COPD".
- Miller 10e ch. 29 p. 876 (PH table: avoid hypoxia or hypercarbia); p. 881: "PEEP levels higher than 10 cmH2O are more likely to cause hypotension"; "Hypoxemia, hypercapnia, acidosis, hyperthermia, nitrous oxide, lung hyperinflation, high PEEP, and large tidal volumes can all increase PVR"; p. 883 (cystic fibrosis: PH from chronic hypoxia); p. 920–921 (anaphylaxis grades; "Chest compressions for MAP <50 mm Hg or ETCO2 <20 mm Hg"; antihistamines do not treat bronchospasm or hypotension).
- Miller 10e ch. 40 p. 1235 (Mendelson, acid aspiration in obstetrics).
- Miller 10e ch. 49 p. 1505 (OLV VT 4–6 mL/kg IBW); p. 1521 (PEEP 15 opened a R→L shunt in 9 %); p. 1534 (lateral shunt 5 → 10–15 %); p. 1536 (OLV hypoxaemia 20–25 % historically, < 5 % now); p. 1538: "there is usually a shunt of 20% to 30% during OLV"; 1 MAC isoflurane inhibits "approximately 20% of the total HPV response"; p. 1539 (VE +20 % for the same PaCO2); p. 1541 (ΔP ≤ 15; CPAP to the non-ventilated lung "is a reliable method").
- Miller 10e ch. 53 p. 1751–1754 (VAE: Doppler ≈ 40 %, TEE up to 76 % in the sitting position; PFO ≈ 25 %; lateral repositioning of doubtful value).
- Miller 10e ch. 54 p. 1784 (bariatric: moderate PEEP, VT by IBW, recruitment manoeuvres).
- Miller 10e ch. 58 p. 1884, 1887 (MV +45–50 %; PaCO2 40 → ≈ 30; fetal SaO2 ≤ 60 %).
- Miller 10e ch. 60 p. 1969–1970 (FES in up to 30 %; collapse at reaming/cementing/tourniquet release).
- Miller 10e ch. 75 p. 2436 (neonatal compliance low; surfactant deficiency lowers it further; compliant infant chest wall).
- Stoelting 8e ch. 2 p. 25–26 (severe bronchospasm ≈ 0.2 %; sevoflurane preferred; ketamine when unstable; lidocaine 1–1.5 mg/kg; "high peak airway pressure, upsloping of the end-tidal carbon dioxide (ETCO2) waveform"); p. 27, 29 (COPD FRC ↑; avoid N2O with bullae).
- Stoelting 8e ch. 3 p. 39 (NPPE onset "from a few minutes to as long as 2 to 3 hours"); p. 40 (re-expansion oedema risk > 1 L, > 24 h); p. 47 (ILD → PH "as progressive pulmonary fibrosis results in the loss of pulmonary vasculature"); p. 48 (Cobb > 70°, > 100° with VC < 45 %); p. 49 (flail chest).
- Stoelting 8e ch. 9 p. 196–202 (PH definitions (2019 ERS table), iNO responder definition, 85–90 % non-responders, ventilator effects on RV afterload: PEEP, hypercarbia/acidosis, atelectasis).
- Stoelting 8e ch. 24 p. 502 (scleroderma: ILD, PH, Raynaud, pericardial effusion). Ch. 32 p. 698 (Table 32.1, pregnancy: FRC −10–20 %, O2 consumption +20 %).
- Dellinger 5e ch. 10 p. 152–153 (external PEEP vs auto-PEEP); ch. 11 p. 159–162 (EL/Etot ≈ 0.5 normal, 0.2–0.8 in ARDS; recruitability 5 → 45 cmH2O; prone PCO2 response); ch. 28 p. 420 (anaphylaxis features); ch. 37 p. 607, 610 (asthma: V/Q, Pplat ≥ 30 and haemodynamic instability; VT 6–8, RR 10–14, VE < 8–12, I:E 1:3–1:5); ch. 38 p. 616 (O2-induced hypercapnia); ch. 40 p. 660 (unilateral pneumonia: PEEP can worsen hypoxaemia; good lung down); ch. 42 p. 673 (PE: normal PaO2 in ≈ 30 %; paradoxical PaCO2 rise in massive PE); ch. 43 p. 690 (PVR vs lung volume; reversible PH triggers); ch. 45 p. 720, 723 (tension decompression; iatrogenic causes; BPF > 500 mL/breath); ch. 46 p. 735–737 (smoke: upper-airway oedema; SpO2 falsely high with CO); ch. 61 p. 1027 (VC 65 / 30 / 20 mL/kg).

**Guidelines and consensus**
- ESC/ERS 2022 PH (Humbert, Eur Heart J 2022; PMID 36017548): definitions via SSc-2022 (PMC9571468, read) and a search summary (5 WU severe-PH threshold, [VERIFY]).
- Berlin ARDS definition (JAMA 2012; PMID 22797452, read). ARDSnet (NEJM 2000; PMID 10793162, read).
- GOLD 2023 executive summary (PMC10111975, read: FEV1/FVC < 0.7; SpO2 88–92 % in exacerbations).
- ATS OHS guideline (Mokhlesi 2019; PMID 31368798, read). European RDS consensus 2022 update (Sweet 2023; PMID 36863329, abstract read).
- ESC 2019 acute PE (Konstantinides; PMID 31504429): cited for risk classes, not opened [VERIFY]. CO poisoning practice recommendations (Hampson 2012; PMID 23087025, abstract read).

**Papers (abstract read unless stated)**
- Amato 2015 driving pressure (PMID 25693014). Gattinoni 2006 recruitability (PMID 16641394). Nuckton 2002 dead space (PMID 11973365). Maj 2023 (PMID 36470747). Karbing 2020 (PMID 32293506). Mekontso Dessap 2016 ACP (PMID 26650055). Hickling 1990 (PMID 2246418).
- Arnal 2018 passive-ICU mechanics (PMID 29042486). Officer 1998 (PMID 9804607). Pepe & Marini 1982 auto-PEEP (PMID 7046541). Ranieri 1993 PEEP in COPD (PMID 8420430). Tuxen & Lane 1987 (PMID 3662241). Tuxen 1992 (PMID 1443862). Leatherman 2015 (PMID 26033128). Rooke 1997 volatile bronchodilation (PMID 9197298).
- Viitanen 1990 hypercarbia and RV (PMID 2393125). Mahjoub 2009 false-positive PPV (PMID 19623051). Pilkington 2015 PH review (PMID 25267493). Hu 2026 iNO review (PMID 41745329).
- Harper 2018 NAP6 (PMID 29935567).
- Nava & Rubini 1999 IPF mechanics (PMID 10212101). Launay 2007 SSc PH (PMID 17444586). Young 2019 SSc-ILD PH (PMID 30762947). Akdogan 2015 SSc pulse oximetry (PMID 24530379).
- Pelosi 1998 obesity (PMID 9728848). Behazin 2010 obesity pleural pressure (PMID 19910329). Reinius 2009 obese atelectasis (PMID 19809292).
- Cooligan 1982 canine lobar pneumonia shunt (PMID 6807159). Remolina 1981 positional hypoxaemia (PMID 6779161; citation only). Razazi 2014 effusion drainage (PMID 25079591).
- Roberts 2015 tension pneumothorax presentation (PMID 25563887). Vieillard-Baron 2001 ACP in massive PE (PMID 11685341).
- Olsen 2014 BCIS (PMID 25031262). Donaldson 2009 BCIS (PMID 19059919). Mirski 2007 VAE (PMID 17197859). Warner 1993 aspiration (PMID 8424572).
- Urmey 1991 and 1992 interscalene hemidiaphragmatic paresis (PMIDs 2006740, 1539813).
- Grasselli 2020 COVID ARDS (PMID 32861276). Gattinoni 2020 phenotypes (PMID 32291463; no abstract, [VERIFY]). Hampson & Dunn 2012 COHb vs symptoms (PMID 22530449).
- Not opened, cited as [VERIFY]: Bergofsky 1979 (kyphoscoliosis mechanics); ESC 2019 PE full text; Mendelson 1946.

*End of §4b draft 1.*
