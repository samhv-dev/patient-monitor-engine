# Gate 7b — The lungs: two lung compartments, one mixing point, the 32-condition catalogue as data (date: 2026-09-26)

Gate question: "Do plateau, driving pressure, auto-PEEP, the Pa−EtCO2 gap, the capnogram α, OLV and endobronchial desaturation and PEEP recruitment EMERGE from two lungs feeding one mixing point — and does every Stage 3 / 3.1 / V acceptance number stay in its band?"

Branch `stage-7b-lungs`, from `origin/main` `9e39b29`, executed task by task from `docs/plans/stage-7b-lungs.md` (30 tasks; every step ticked, executor notes under each task heading). Tasks 1–12 (the lung module) are byte-identical to the plan author's prototype and reproduce its numbers exactly. Tasks 13–19 and 22–25 (engine wiring) were not prototyped; their numbers were treated as targets with the catalogue/evidence bands (R45 rule) and every adjustment is listed below. Rulings applied: R43 (two compartments), R46 (accepted deviations; GOLD 3 / RR 20 auto-PEEP band 6–12; band misses < 25 % tuned within catalogue ranges, the rest under "Needs a ruling"; the phase-III-slope follow-up NOT done), R39, R41, R45.

__GATE_RUN__

## 1. Per-condition ventilator and gas signatures (Task 20, all 32 conditions)

Reference: passive, intubated 70 kg adult, VC 490 mL, 14/min, PEEP 5, 60 L/min, 0.3 s pause (auto-PEEP at the catalogue's VT 8 mL/kg, I:E 1:2); gas signatures after 10 min (30 min for mainstem conditions), FiO2 0.21/0.4/1.0. Tolerance 10 % of the band's upper value (shunt ±0.03, SpO2 ±1). **32/32 tests pass; 23 conditions meet every band; 9 carry recorded misses** (prototype values reproduced exactly):

| Condition (severity) | Miss | Model | Band | Miss size | Disposition |
|---|---|---|---|---|---|
| chestWall (0.67) | crs | 24.6 → **33.5** | 32 | 23 % | **TUNED** (R46): the data put the row's whole-system Crs 45/32/20 in `crs` AND the stiff chest wall in `ccw` — the wall was counted twice. Knots now carry the row's lung part ×1/0.85/0.7 → 33.5. KNOWN entry deleted. |
| pneumonia (0.4) | SpO2 @ FiO2 0.4 | 96.8 | 88–93 | 4 % | Needs a ruling: the model's shunt 0.197 is mid-band (0.15–0.25); 88–93 % at FiO2 0.4 needs shunt ≈ 0.3 — the two catalogue rows disagree, no in-range tune exists |
| olv (1, L) | crs | 33.9 | 25–30 | 13 % | Needs a ruling: structural (decision 1, shared chest wall: one lung in series with the whole wall is ×0.62, not ×0.5) |
| endobronchial (1) | crs | 34.0 | 27.5–30.3 | 12 % | as OLV |
| cf (0.67) | SpO2 @ FiO2 0.21 | 95.4 | 88–94 | 1.5 % | Needs a ruling: the row gives point values only (low V/Q 0.10, plugged shunt 0.03 already applied) |
| neonatalRds (1) | shunt | 0.16 | 0.2–0.4 | 20 % | Needs a ruling: the rig is the adult 70 kg frame (VT 490 into Crs 17 gives Pplat 34, which recruits); the neonatal frame arrives with R22 |
| asthma (0.6) | Pa−Et | 6.3 | 20–50 | 69 % | Needs a ruling (hypercapnia in acute severe asthma is from hypoventilation, not V/Q, at the reference VE) |
| obesity (1) | Pa−Et; shunt | 3.3; 0.05 | 5–8; 0.10–0.15 | 35 %; 50 % | Needs a ruling (induction atelectasis builds over minutes; the rig starts at 0) |
| atelectasis (0.4) | shunt | 0.16 | 0.10–0.12 | 33 % | Needs a ruling (plugged lobe, ATEL_PERF 1.0) |
| ptxSimple (0.3) | shunt | 0.12 | 0.07 | 71 % | Needs a ruling |
| olv (1, L) | shunt @ FiO2 0.4, 30 min | 0.14 | 0.2–0.3 | 30 % | Needs a ruling (blocked-lung collapse τ ≈ 30 min at FiO2 0.4; at FiO2 1.0 the engine gives 0.24, Task 24) |

## 2. Pulse ventilator reference values (Task 21, N-P03, ±10 %)

| | Model | Pulse target |
|---|---|---|
| Healthy | Cstat **54.8**, Rinsp **9.9**, Rexp 12.0 | C 54, R 10 |
| ARDS mild / moderate | Cstat **39.8 / 34.7**, Rinsp 11.9 | C 40 / 35, R 12 |
| COPD GOLD 1 | Rinsp **13.0**, Rexp **19.5**, C **57.4** | 12, 18, 60 |
| COPD GOLD 3 | Rinsp **25.0**, Rexp **38.8**, C **67.9** | 24, 36, 68 |
| ARDS shunt moderate / severe (FiO2 0.6, 10 min) | **0.291 / 0.371** | 0.3 / 0.4 |
| Recruitment trend (ARDS moderate, PEEP 5 → 15) | PaO2 **82 → 97**, shunt 0.291 → 0.247, PaCO2 45.2 → 46.1 | P/F ↑, shunt ↓, PaCO2 within 10 % |

Excluded (plan Task 21): ARDS severe C 33 (catalogue Q73 adopts 30), ARDS mild shunt 0.2, COPD severe Rinsp 34 / Rexp 51 (GOLD 4 ratio 1.7), every VD/VT (Stage 3's anatomic + apparatus dead space gives 0.42 at 7 mL/kg), P/F ranges.

## 3. COPD through the engine (Tasks 15, 22)

| | GOLD 1 (0.25) | GOLD 2 (0.5) | GOLD 3 (0.75) | GOLD 4 (1) | Band |
|---|---|---|---|---|---|
| Auto-PEEP, VT 560, I:E 1:2, RR 14 | — | **2.0** | **4.2** | **8.2** | 1–3 / 4–8 / 8–12 |
| GOLD 3 auto-PEEP at RR 10 / 14 / 20 / 26 | | | **2.3 / 4.2 / 7.2 / 10.3** | | monotonic; **R46: RR 20 → 6–12** ✓ |
| Capnogram α (sidestream, RR 14; healthy 105.6°) | **109.3°** | **113.7°** | **122.9°** | **127.2°** | Q72 110/115/125/130; GOLD 3 120–130 ✓ |
| Pa−EtCO2 at PaCO2 40 (40·(1 − g)) | | | **11.6** | 15.5 | 5–15 |

The engine numbers equal the stand-alone rig's to 0.1 cmH2O. Raw engine gap at GOLD 3 is **16.5 mmHg at PaCO2 52** (the MANUAL etco2 target 36 places PaCO2; the gap scales with PaCO2) — see "Needs a ruling" 3.

## 4. ARDS recruitment / derecruitment time course and absorption atelectasis (Task 23)

ARDS moderate (0.67), high recruiter (recruitFrac 0.5), FiO2 0.6, VT 420, RR 20:

| t | Event | Shunt | SpO2 truth |
|---|---|---|---|
| 15 min | PEEP 5 steady | **0.274** | 94.4 |
| +10 / 20 / 30 / 60 s | PEEP 15 | — / — / — / **0.223** | 95.0 / 95.5 / 95.7 / 95.8 |
| +5 min | PEEP 15 | **0.220 (−20 %)** (band −15 to −35 %; catalogue −30–50 % came from RM studies, R46) | 95.8 |
| after RM 40 cmH2O × 30 s + PEEP 15 | | **0.160 (−42 %)** (band −35 to −50 %) | 98.0 |
| PEEP 5 again +60 s / +5 min | de-recruitment τ 2 min | **0.203 / 0.263** | 97.2 / 95.0 |

Low recruiter (0.15): 0.282 → 0.262 (**−7 %**, band < 12 %). Absorption atelectasis, GA, healthy, after an RM: FiO2 1.0 at ZEEP → atelectasis **0.055** and shunt **0.039 → 0.065** in 60 min; FiO2 0.4 → atelectasis 0.000, shunt 0.038 → 0.039. Induction (15 min, FiO2 1.0 / 0.8 / BMI ≈ 38): **0.055 / 0.000 / 0.090**. Edmark apnoea times (3 min preoxygenation at FiO2 f, GA, apnoea → SaO2 90 %, not asserted): FiO2 1.0 / 0.8 / 0.6 → **488 / 379 / 262 s** (Edmark 411 / 303 / 213: order right, ≈ 20 % long).

## 5. One-lung ventilation, endobronchial intubation, unilateral pneumothorax (Task 24)

| Scenario (awake-metabolism adult, engine) | Result | Band |
|---|---|---|
| OLV, left isolated, FiO2 0.5, VT 350 | SpO2 nadir **88.8 % at 7.9 min**, 91.0 % at 60 min (recovery +2.2), left-lung flow **0.250** | nadir 88–96 at 4–12 min, ≥ 1 % recovery, flow ≤ 0.3 |
| OLV at FiO2 1.0, 30 min | shunt **0.240**, PaO2 87, SpO2 96.2 | shunt 0.2–0.3 |
| Endobronchial (right mainstem), FiO2 0.5 | Crs **55 → 34** at once; SpO2 min 5–10 min **88.6**; 91.9 at 60 min; withdrawn **96.3**; + RM 40 × 10 s **99.8** | < 0.7×; 85–93; < 99; ≥ 99 |
| Simple pneumothorax 30 % left, FiO2 0.21 | Crs 55 → 46; SpO2 94.97 → 92.32 (**−2.6**); EtCO2 42.1 → 44.6 (**+2.5**) | falls; 1–6; ±3 |

The engine is ~5 SpO2 points below the rig in OLV/endobronchial because these engine tests run an AWAKE-metabolism patient (VO2 245 vs GA 208 mL/min) at VT 350 with 215 mL of dead space (right-lung FAO2 0.76 at FiO2 1.0) — the rig was anaesthetised. Every band still holds.

## 6. Stage 3 / 3.1 / 4b-on-3 / V acceptance re-check (Task 25)

All Stage 3 acceptance files (resp-capnogram, resp-airway, resp-oxygen, resp-coupling, resp-engine, resp-longrun incl. the 24 h 62.5 Hz drift test, stage3-alarms-engine, cpr-etco2, co2-sampling-skin) and Stage 2's hemo-acceptance: **all pass**. Measured by re-running each test with its asserted values logged (main `c5ca0c0` vs this branch):

| Check | main | 7b | Band |
|---|---|---|---|
| α sidestream (RR 12), phase III | 105.4–105.9°, +1.25–1.59 | 105.5–105.9°, +1.24–1.59 | 100–110, 1–3 |
| R39-6 bronchospasm α at 0 / 0.5 / 0.8 / 1.0 / 1.25 | 105.3 / 124.9 / 135.1 / 144.6 / 156.8 | 105.4 / 125.2 / 135.6 / 145.3 / 157.3 | 100–110 / 120–130 / 128–142 / 140–150 / 150–160 |
| Neonate RR 60 sidestream under-read | 0.94 | 1.22 | ≥ 0.5 |
| M4: first breath after 60 s apnoea | +9.0 | **+9.6** | +9 to +15 |
| Preoxygenated adult to SaO2 90 % | 8.37 min | 8.13 min | 6.5–9.5 |
| Room air true SaO2 90 % / display first falls | 42 / 30 s | 41 / 29 s | 35–60 / 20–45 |
| Child / obese | 159 s / 2.85 min | 156 s / 2.72 min | 130–190 / 1.7–3.7 |
| R8 display keeps falling after rescue | 20 s | 19 s | 10–30 |
| M6 PPV g 0.05 / g 0.2 (ventilated) | 6.9 / 22.5 % | **6.2 / 20.2 %** | 5–10 / 15–30 |
| Stage 2 acceptance 10 PPV | 6.8 / 22.4 % | 6.1 / 20.1 % | 5–10 / 15–30 |
| R39-2 CPR EtCO2 q 0.5 / 0.8 / 1.0 / 1.2; +10 breaths | 12.3 / 20.4 / 25.8 / 28.8; −2.4 | 12.0 / 20.0 / 25.4 / 28.3; −2.3 | 8–15 / 17–23 / 22–28 / 26–32; −2 to −4.5 |
| 8. VentFrame link: EtCO2 display spread | 0.38 | 0.48 | ≤ 2 |
| MH EtCO2 rise at fixed ventilation | +85 (to 124) | +79 (to 117) | > 20 |
| lungState R27 | C 50 exact, bronchospasm R 40 | C 48–60 (module), bronchospasm R **60** (Q20) — re-specified | plan decisions 11/15 |

**Re-check on top of Stage 7a** (main `66bad51` with 7a vs this branch after merging it; same method, 57/57 tests pass on both):

| Check | main (7a) | 7b on 7a | Band |
|---|---|---|---|
| α sidestream (RR 12) | 104.95–105.36° | 105.01–105.38° | 100–110 |
| R39-6 bronchospasm α 0 / 0.5 / 0.8 / 1.0 / 1.25 | 104.8 / 123.5 / 133.3 / 142.7 / 155.2 | 104.8 / 123.7 / 133.7 / 143.1 / 155.7 | as above |
| M4 first breath after 60 s apnoea | +9.2 | +9.5 | +9 to +15 |
| Disconnection → apnoea alarm | 20.02 s | 20.00 s | 19.9–21 |
| Preoxygenated adult / room-air true SaO2 90 % | 8.43 min / 43 s | 8.22 min / 44 s | 6.5–9.5 / 35–60 |
| **Child 4 y, preoxygenated** | 171 s | **133 s** | 130–190 (near the low edge — "Needs a ruling" 12) |
| Obese | 3.0 min | 2.8 min | 1.7–3.7 |
| Displayed SpO2 (5c) true / display / first fall | 43 / 64 / 31 s | 44 / 65 / 32 s | 35–60 / 45–90 / 20–45 |
| M6 PPV (7a band) | 5.2 % | 4.7 % | 3–12 |
| Stage 2 PPV (7a band) | 5.5 % | 5.0 % | 3–12 |
| Stage 2 on 7a: PEEP 5 → 15 CO drop | 18.1 % | 18.2 % | ≥ 3 % |
| R39-2 CPR EtCO2 q 0.5 / 0.8 / 1.0 / 1.2; +10 breaths | 12.2 / 20.3 / 25.8 / 28.7; −2.36 | 12.0 / 20.0 / 25.4 / 28.3; −2.30 | 8–15 / 17–23 / 22–28 / 26–32; −2 to −4.5 |
| MH EtCO2 rise | +85.6 | +79.2 | > 20 |
| Stage 2 on 7a: radial SBP/DBP error, notch; post-PVC; transducer | identical to ±0.003 | | |

PPV falls ~10 % because the lung-module compliance is 55 (Stage 3's fixed 50): smaller alveolar swing per breath. Stage 3 tests re-specified (plan decisions 11/15, not band misses): resp-coupling R27 (compliance 50 → 48–60; bronchospasm resistance 40 → 60; tendency read after 30 s because auto-PEEP is now measured).

### Stage V (packages/ventilator) after Task 27

**88/88 pass** (87 before + the new consistency test). The catalogue's C/Rinsp/Rexp/shunt/VD numbers are now generated from the engine data (`ventReference`, the resolved parameters with the mainstem block, at each row's own PBW); the neonatal row keeps its authored numbers. Re-specified Stage V assertions: link-core ARDS-moderate compliance 32 → the generated row value (35; Pulse 35); link-r27 COPD GOLD 3–4 auto-PEEP at RR 20 "> 8" → **R46 band 6–12** (measured **7.8**; MAP-fall assertion unchanged and passing). Signature bands widened to the engine-generated mechanics (plan Task 27 rule), authored → new (value measured on the ventilator's reference run):

| Row | Field | Authored | Now | Run |
|---|---|---|---|---|
| ards-severe-recruitable / -nonrecruitable | peak − plateau | 12–18 | 11.7–18 | 11.8 |
| covid-pneumonitis | peak − plateau | 10–15 | 9.7–15 | 9.8 |
| fat-embolism | ΔP | 9–17 | 8.8–17 | 8.9 |
| haemothorax | ΔP | 11–20 | 10.6–20 | 10.7 |
| bronchopleural-fistula | ΔP; peak − plateau | 9–16; 10–15 | 8.8–16; 9.8–15 | 8.9; 9.9 |
| pregnancy (57 kg) | plateau; ΔP; peak − plateau | 13–19; 8–14; 7–13 | 13–19.3; 8–14.3; 7–14.6 | 19.2; 14.2; 14.5 |
| **pneumothorax-tension** | plateau; ΔP; peak − plateau | **25–50; 20–45**; 10–18 | **18.7–50; 13.7–45**; 9.7–18 | 18.8; 13.8; 9.8 — see "Needs a ruling" 5 |

## 7. CPU, determinism, 24 h

- Lung module stand-alone (COPD, 1 h): **0.0028 ms per 20 ms tick** (prototype 0.0011; budget 0.1).
- Whole engine per tick, main → 7b (healthy ventilated / COPD, 20 sim-min, machine under load avg ≈ 19): **0.027 → 0.042 ms / 0.027 → 0.037 ms** — the lung module inside the engine costs ≈ +0.010–0.014 ms per tick.
- Determinism: same seed and script → identical lung state JSON; snapshot → restore → 60 s continuation identical.
- 24 h ventilated ARDS: unit volumes bounded, PaCO2 drift < 1 mmHg after hour 1, both O2 stores in (0.1, 1). Stage 3's 24 h 62.5 Hz index test passes.

## 8. Deviations from the plan (executor), by task

- **Task 1–12**: none (byte-identical to the prototype; 81 unit tests reproduce its numbers).
- **Task 13**: `staticCompliance` is the per-breath CHORD compliance of each unit (tangent at the start volume before the first breath; since Task 27 the chord of a nominal 7 mL/kg breath) — the plan's tangent at the instantaneous volume made lungState and Stage 2's u(t) ripple ±2 mL/cmH2O inside every breath. The COPD τ test waited for Task 14 (τ̄ is computed by the gas step). resp-coupling R27 compliance 50 → 48–60 (decision 15).
- **Task 14** (all needed to keep Stage 3 in band): (1) the lung's 10 Hz step runs BEFORE the MANUAL etco2 calibration, and the calibration divides the needed VA by the lung's elimination efficiency e (a profile's conditions are honoured at t = 0); (2) before the first breath ventilation is split by unit compliance (a zero split gave SaO2 0.2 for one breath); (3) the CO2 mix caps the expiratory time at 10 s (after an apnoea exp(−w/τ) underflowed → EtCO2 0 → M4 failed); (4) the end-tidal ratio g relaxes toward the mix with the alveolar CO2 time constant C_A/(Q·S + VA/713) (≈ 6 s) and → 1 in apnoea (M4 +9.6 in band; external-drive va = 0 blips no longer flip EtCO2 8 %); (5) arrest: O2 flows floored at 0.05 L/min and the CO2 mix sees at least the reference flow (q = 0 gave NaN; low flow stays Stage 3's φ, so R39-2's CPR map is unchanged); (6) the lung-gas test reads the gap at PaCO2 40 (40·(1 − g)) — the engine's MANUAL etco2 target places PaCO2 (52 in GOLD 3, 70 in moderate ARDS) and the raw gap scales with it (logged: healthy 5.4 at PaCO2 45, GOLD 3 16.8, ARDS 27.5).
- **Task 16**: the airway-event mainstem line simplified (the plan's form did not type-check).
- **Task 18**: resp-coupling R27: bronchospasm resistance 40 → 60 (decision 11, Q20) and read after 30 s (auto-PEEP is measured: 8.7 cmH2O → tendency 0.87).
- **Task 20**: chestWall data fix (above).
- **Task 21**: logging only.
- **Task 22**: gap asserted at PaCO2 40 (as Task 14); R46's revised GOLD 3 / RR 20 band 6–12 added.
- **Task 23**: absorption baseline read at 12 s (right after the 10 s manoeuvre) instead of 59 s (re-collapse at FiO2 1.0 had begun: Δ 0.0199 vs > 0.02); an atelectasis 4–8 % / < 1 % assertion added.
- **Task 24**: the endobronchial tube stays 60 min before withdrawal (the prototype's sequence; after 10 min the lung was only ≈ 30 % collapsed and withdrawal alone gave 99.4 %). **Mechanism fix**: a held manoeuvre pressure keeps updating the lung's end-inspiratory pressure after flow drops below the 50 mL/s breath threshold, and the healthy-lung opening check has a 1 cmH2O tolerance — the alveolar pressure approaches a held 40 cmH2O only asymptotically, so no recruitment manoeuvre could open induction/absorption/blocked-lung atelectasis (SpO2 stayed 96.4 after the RM). Also a typecheck fix in the Task 19 test.
- **Task 25**: none.
- **Task 26**: first skipped (7a not yet on main; the adapter part was done: `writeCircPvr` also writes the global `ext.pvrLung`), then RUN after 7a merged (§10). `respPleural` keeps 7a's calibrated pleural shape and scales it by the condition's tIt RELATIVE to the healthy 0.4 (the plan's absolute `tIt·Palv` would have taken a healthy patient from 7a's T_IT 0.65 to 0.4), adds auto-PEEP on the internal ventilator, and max-combines the lungs' pPtx with 7a's `ext.pPtx`. The COPD test runs in MODELED mode and asserts the CO fall plus MAP direction. The 24 h lung test uses 7a's `LONGRUN_HOURS` (6 h on CI).
- **Task 27**: `ventReference` (new engine export) instead of the plan's two-lung formula (OLV/endobronchial need the block); rows at their own PBW; neonatal row authored; lung-input stays RELATIVE (see rulings). Its commit message says "lungState read as absolute" — that part was NOT done.
- **Task 28**: speed choices 1/2/4 (engine timeScale is 0.25–4); a strict-TS guard in the event clock.
- **Task 29**: NOTICES ids **N-090/N-091/N-092** (N-062 is 7a's, N-070–077 are reserved by the 7c/7g plans, N-080–084 by 8a); screenshots are JPEG (PNG exceeded 60 KB), port 5216, ×4 instead of ×10.
- Commit trailer: the harness's attribution line (`Claude Opus 5.5 (1M context)`) was used, as the plan's Global Constraints allow.

## 9. Needs a ruling (for the orchestrator / Ali's R44 calibration pass)

1. **Nine catalogue signature misses** (§1): pneumonia SpO2 at FiO2 0.4 (catalogue rows inconsistent), OLV/endobronchial Crs (shared chest wall), CF SpO2 on air (point values), neonatal RDS shunt (adult frame), asthma gap, obesity gap and shunt, atelectasis shunt, simple-pneumothorax shunt, OLV shunt at FiO2 0.4 after 30 min. No in-range tune exists for the < 25 % ones; the chest-wall one was a data error and is fixed.
2. **Pa−EtCO2 bands and PaCO2**: the gap now scales with PaCO2 (g = EtCO2/PaCO2). The catalogue's 5–15 (COPD GOLD 3) and 10–20 (ARDS moderate) bands are met at PaCO2 40 (11.6 / 14.9) but the engine's default MANUAL etco2 target 36 puts a GOLD 3 patient at PaCO2 52 (gap 16.5) and moderate ARDS at 70 (gap 27.5). Rule: bands at PaCO2 40, or change the MANUAL default for patients with lung conditions?
3. **Stage 3 PPV** falls ~10 % (6.9 → 6.2 and 22.5 → 20.2 %, inside 5–10 / 15–30) because the healthy lung-module compliance is 55 (Pulse 54) instead of Stage 3's 50.
4. **lung-input absolute (R27/decision 15)** is not switched: absolute values need every Stage V link profile to carry its engine `lungConditions` (via `VENT_ROW_MAP`) and the interim link shunt/recruit (`link/recruit.ts`, R41) to retire, which moves the R27/R36 demonstration numbers. Recommend a V follow-up that does all three together.
5. **Tension pneumothorax on the ventilator**: generated from the engine's lung data (Crs ×0.5 + collapse) the reference plateau is 18.8 (authored clinical band 25–50) and ΔP 13.8 (20–45). The pressure effect of tension is 7a's `pPtx`; the ventilator's single compartment does not see it. Band widened per the plan rule, flagged.
6. **Edmark apnoea times** 488/379/262 s vs 411/303/213 (≈ 20 % long, ordering right) — calibration of ATEL_IND / collapse τ (Q34).
7. **OLV at FiO2 1.0** in an awake-metabolism engine patient: PaO2 87 at 30 min (shunt 0.24 in band): the catalogue's "hypoxaemia infrequent" assumes GA VO2 and larger VT.
8. **Orchestrator 7c interface requests** (lung water from `ps.blood.out` COP/capillary leak; Winter's compensation as the metabolic-acidosis drive): DEFERRED — the plan has no seam for them (`drive.ts` is not wired into the engine in 7b; lung water is only the `evlwi` condition key). They belong where 7c's output block lands.
9. **Stage V NR-3 items from 7a**: massive PE — CLOSED (the scenario also sends the lung's `pe` condition; EtCO2 38 → 24.6, band ≥ 4); COPD GOLD 3–4 link — CLOSED by the orchestrator's rule (auto-PEEP in R46's 6–12, MAP fall asserted by direction > 3); cardiogenic oedema PEEP 5 → 12 CO fall — still `it.fails` (an `hfref` moderate profile condition was tried: CO 5.08 vs < 4.99 needed; in HFrEF PEEP often does not lower CO — the band itself may need a ruling).
10. **ARDS link PEEP 15 → 5 SpO2 fall** (Stage V link-r27): main before 7a −5; 7a alone −3.4; 7a + 7b **−3.0** (band > 3) — marked `it.fails` + this ruling (the difference is 7b's two O2 stores; the two stages together sit on the edge).
11. **COPD auto-PEEP haemodynamics on 7a (MODELED)**: GOLD 3, RR 10 → 26 (auto-PEEP 2.3 → 10.3): CO **4.35 → 3.35 (−23 %)** but MAP only **101.8 → 98.9 (−2.8 %)** — the baroreflex holds MAP; the plan's ≥ 10 % MAP fall (R27 demo) is not reached. The test asserts the CO fall and the MAP direction.
12. **Child apnoea desaturation on 7a + 7b**: preoxygenated 4 y / 16 kg to SaO2 90 % 171 s on main (7a) → 133 s with 7b (band 130–190, Patel 160 ± 31): induction atelectasis during the 3 min of FiO2 1.0 at ZEEP shrinks the small child FRC; before 7a the same test gave 159 → 156. In band, at the edge; ATEL_IND/indFactor for children is [ENG].
13. **Follow-ups not in 7b's scope**: R46's within-lung V/Q distribution for an emergent phase III slope (explicitly out of scope); `docs/physiology/stage-v-lung-pathology-data.md` is not regenerated from the data file (GV-obs reconciliation); `drive.ts` wiring for MODELED spontaneous breathing (7f supplies the drug inputs).

## 10. Stage 7a integration (7a merged as `1fd0851` during this stage; merged into this branch, Task 26 run)

- Merge conflicts (driver.ts `frameAt` export, types.ts profile fields and imports, resp/pipeline.ts imports + `respPleural` beside `lungDrive`, NOTICES: 7b's three rows join 7a's Pulse table) resolved keeping both sides; 7a retired the MANUAL mean-Paw coupling, and 7b's `compliance()` feeds its pleural input.
- 7b drives 7a's R46 seams: per-lung `ext.pvrLungL/R` (HPV, collapse, OLV) and the global `ext.pvrLung` (`writeCircPvr`); 7a's measured `circOut.qLungL/qLungR` feed the mixing point (`circSideFlows`); the pleural input is `respPleural` (it IS 7a's `pIt` source, so `HemoCtx.pItExternal` is not needed).
- OLV on 7a, FiO2 1.0, 30 min: isolated-lung PVR ×**1.91**, its measured flow **0.300** of pulmonary flow (band ≤ 0.30, at the edge).
- Stage V NR-3 and the ARDS link item: "Needs a ruling" 9 and 10.

## 11. Screenshots (`docs/gates/stage-7b/`, 900 px wide JPEG, ≤ 60 KB)

Captured by `apps/demo/scripts/stage7b-shots.mjs` (headless system Chrome, `vite preview` on :5216, the demonstrations at ×4 — the engine's time-scale limit), re-encoded to ≤ 60 KB; `page errors: []`.

- **healthy** — two green lungs (C 30/25, R 11/13, τ 0.55 s, flow 55/45 %), Crs 55, R 10, square capnogram.
- **copd** — GOLD 3 after RR 10 → 14 → 20 → 26: auto-PEEP 10.3, τ 2.78 s per lung, Crs 66/R 25; the capnogram's rounded upstroke (α ↑) and incomplete expiration.
- **ards** — moderate ARDS, high recruiter, after PEEP 15 and an RM 40 × 30 s and back to PEEP 5: both lungs 79 % aerated, shunt 17 % per lung, whole-lung shunt 0.20; SpO2 96, EtCO2 30 (the gap).
- **olv** — ≈ 8 sim-min after isolating the left lung at FiO2 0.5: left lung grey "(blocked)", aeration 84 % and falling (absorption), its flow 31 % (HPV), shunt 16 %; Crs 34.
- **endo** — the endobronchial → withdrawal → RM sequence at its end: both lungs re-aerated (100 %), SpO2 99.
- **absorb** — GA, FiO2 1.0 at ZEEP after an RM, ≈ 10 sim-min: induction/absorption atelectasis building (aeration < 100 %).
