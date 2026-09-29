# Gate V.1 — the ventilator link on the real lungs

Branch `stage-v1-ventilator-followup`, cut from `origin/main` `e81e53f` (FU-3, FU-4 and FU-5 merged) with the plan
committed at `d9c9232` (`docs/plans/stage-v1-ventilator-followup.md`) and the orchestrator rulings it honours at
`docs/review-inputs/rulings-excerpt-v1.md`. Executed in a cloud checkout (Opus 5.5), Tasks 0–10 in order, one commit per
task, pushed after each. `origin/main` was merged before every task; every merge brought docs only (`docs/RESUME.md`).
Every number below was measured on this branch (seed 7 unless stated) unless marked "plan" (the plan's prototype, on
the pre-FU-4 tree) or "main" (clean `origin/main`, measured here as the "before").

**Gate question.** Does the ventilator link run on the real 7b lungs — absolute lungState, every profile's own lung
conditions, the tension plateau in 25–50 from the pleural pressure — with every R27/R36 demonstration in band or
`it.fails` with numbers, and does the Stage 3 child rest at normal gases?

**Answer.** Yes, with the FU-4 caveats of §1 and §8. The ventilator reads lungState absolute through one mapping
(`lungMechanics`); all 39 profiles carry their `VENT_ROW_MAP` lung conditions; the interim link shunt/recruitment and
the 7a PE/tension stand-ins are gone. The tension row's reference plateau is 35.6 (25–50) and ΔP 30.6 (20–45). The
tension link profile reads plateau 26.0 / ΔP 21.0 at 90 s: that is inside the bands but near their lower edge, because
FU-4 F3 now builds the pleural pressure breath by breath (17.5 cmH2O at 90 s, heading for the 27.2 ceiling). Every
R27/R36 test passes or is an `it.fails` whose title holds this tree's numbers. The Stage 3 child rests at PaCO2 37.8
and SaO2 97.0 %: FU-4 F4 had already landed the ratio change, and V.1 adds `coRefLpm()` and the CPR guard. E-V1-1's 7c
line was withdrawn at the gate because it changed propofol's pharmacokinetics through a stale FU-4 conversion (§2, §8).
The gate also found and fixed a pre-existing link race that silently dropped every ventilator frame after a demo
switch on the combined page (§8).

Contents: 0 gate numbers · 1 tension pneumothorax · 2 the child (E-V1-1) · 3 oedema and ARDS · 4 every link test
before/after · 5 per-profile table · 6 screenshots · 7 `it.fails` · 8 deviations and re-anchorings · 9 exceptions ·
10 rulings applied, calibration rows, open items.

## 0. Gate numbers

| Check | Result |
|---|---|
| `pnpm typecheck` (whole repo; the ventilator's now covers `scripts/`) | clean |
| `CI=1 PME_TEST_SET=fast pnpm test` (CI's main job, every package) | engine-core 267 files / **1,200 passed**, 1 skipped (FU-4 gate: 265 / 1,192; V.1 adds `resp-child-rest` 3 + `v1-lung-seams` 4 + `lung-state` 1); ventilator 16 / **94** (plan 94); controller 37 / 215; renderer 25 / 85; validation 30 / 107 (+1 file / 11 skipped); audio 10 / 58; skins 19 / 179; demo 9 / **141** |
| `CI=1 PME_TEST_SET=slow-a` (engine-core) | SLOW_A_RESULT |
| `CI=1 PME_TEST_SET=slow-b` (engine-core) | SLOW_B_RESULT |
| `pnpm build`, `pnpm check-notices` | BUILD_RESULT |
| `CI=1 pnpm test:e2e` (Playwright's own Chromium + WebKit) | E2E_RESULT |
| tick bench (`packages/validation/test/perf/tick-bench.test.ts`) | TICK_RESULT |
| `it.fails` in the repo (same grep on main and here) | 64 → **66** (§7) |

## 1. Tension pneumothorax (G7b ruling 5; calibration row "tension-ptx ventilator plateau (until V.1)")

| | main (before) | plan (prototype, pre-FU-4) | V.1 on FU-4 | Band |
|---|---|---|---|---|
| Catalogue reference run (C 35.4, R 10, VC 490, PEEP 5) | plateau 18.8, ΔP 13.8 (bands widened to 18.7 / 13.7) | 35.6 / 30.6 / 0.0 / 9.8 | **35.6 / 30.6 / 0.0 / 9.8** (plateau / ΔP / auto-PEEP / peak − plateau) | 25–50 / 20–45 / 0–1 / 9.7–18 (plateau/ΔP authored bands RESTORED; peak − plateau keeps 7b's widened 9.7, authored 10) |
| Ppeak rise over the normal row | — | +21.6 (45.4 vs 23.8) | **+21.6 (45.4 vs 23.8)** | +10–20 (tables H6 [TXT]) → `it.fails` (Decision 16) |
| Link profile `pneumothorax-tension` at 90 s (pmax 60) | — | plateau 36.0, ΔP 31.0, PIP 45.9, pleural 27.2 | **plateau 26.0, ΔP 21.0, PIP 35.9, C 35, pleural 17.5** (lp.pPtx 12.8 mmHg) | 25–50 / 20–45 |
| R36 acute: simple → tension 0.8 at 120 s (window 210–240 s) | (7a alias + C patch) plateau 15.9 → 52.7, SpO2 97 → 78, MAP 105 → 48, CVP 9.5 → 20.0 | plateau 16.1 → 36.1, SpO2 97 → 88.2, MAP 105.1 → 36.2, CVP 9.5 → 20.7 | **plateau 16.1 → 27.7 (+11.5), SpO2 97.1 → 89.6, MAP 105.1 → 61.2 (−43.9), CVP 9.5 → 16.8 (+7.3)** | +≥ 10 into 25–50 / −≥ 4 / −≥ 20 / +≥ 5 — pass |
| Effusion 1.5 L / haemothorax 1.5 L / simple PTX reference plateau | 15.8 each | 15.8 each | **15.8 each** (E = 0; pleural 1.5 / 4.1 / 0) | unchanged |

**FU-4 changed the pleural pressure's time course.** FU-4 F3 turned the tension pneumothorax into a one-way valve: the
catalogue `pPtx` is the CEILING and `lp.pPtx` is the accumulated pressure, bounded by the peak alveolar pressure
(`resp/pipeline.ts` `ptxStep`). V.1 reads that accumulated pressure (lungState `pleuralCmH2O`, ≤ 1 s), and
`ventReference` reads the ceiling (the catalogue row), so the reference run matches the plan exactly and the linked
patient follows the build-up. Measured on the internal ventilator (70 kg, VT 490, PEEP 5, ptxTension 0.8):
+10 s 7.9, +20 s 11.1, +40 s 14.7, +70 s 16.8, +100 s 17.9, +160 s 19.0, +280 s 20.0, +580 s 20.9 cmH2O — the 27.2
ceiling is never reached on that ventilator. With FU-4 G6, 7a's `tensionPtx` is an alias that adds the lungs'
`ptxTension` R (severity 1, ceiling 34.0 cmH2O). 7a's `ext.pPtx` is never written, so the `max(lp.pPtx, circPtx)`
combination V.1 keeps (as `respPleural` does) always reads the lungs' value.

**The opening-pressure condition (Decision 1).** E = pleural − 5.44 − PEEP > 0 for ANY pleural pressure above
5.44 + PEEP, whatever the cause: a 3 L haemothorax (8.2 cmH2O) gives E 2.76 at ZEEP and 0.76 at PEEP 2 (pinned in
`pleural.test.ts`). The calibration row "tension-ptx ventilator plateau (until V.1)" is **CLOSED** by the reference run
(35.6) and the profile's plateau (26.0 at 90 s, still rising); the new row "tension Ppeak vs crs ×0.5" (+21.6) and
"tension peak − plateau: 7b's widened 9.7 vs authored 10" are added (§10).

## 2. The Stage 3 child (E-V1-1; Q-7e-8 CLOSED)

FU-4 F4 (`e3eeb56`, Task 18d) had already made the gas model's coRatio the patient's own (`CI_LPM_PER_KG × effKg`) and
flipped both Q-7e-8 child tests to `it` (155 s). V.1 lands `coRefLpm()` (`gas/params.ts`) and the **CPR guard**. On
FU-4's tree a 16 kg child in CPR (quality 1, 110/min) read coRatio **1.283**, a normal-flow capnogram; with the guard it
reads **0.293 = the adult's 0.293**. The plan's third part, 7c's resting-CO line in the same units (`blood/pipeline.ts`),
was applied in Task 1 and **withdrawn at the gate** (§8): it changed propofol's distribution through FU-4 G10's
`engine.ts` conversion.

| (4 y, 16 kg, RR 24, VT 130, room air, GA, MANUAL) | plan "before" | main (FU-4) | V.1 |
|---|---|---|---|
| true SaO2 60–180 s | 0.33–0.47 | — | **mean 97.03 %, min 95.69 %** |
| PaCO2 (fast compartment) | 94 | — | **37.8** |
| preoxygenated child to SaO2 90 % | 128 s (`it.fails`) | 155 s (`it`) | **155.0 s** (130–190) |
| 70 kg rigs: preox / room air / obese 127 kg | 485 / 41.0 / 169 s | same | **485 / 41.0 / 169 s** (bit-identical at 70 kg) |
| child in CPR: coRatio | 0.293 | **1.283** | **0.293** |

**Non-70 kg patients (Decision 11).** Outside CPR, `coRefLpm(pat)` equals FU-4 F4's divisor exactly, so the final V.1
gas model differs from main only DURING CPR, where every patient now uses the adult 5.25 L/min. For a 70 kg effective
weight that is bit-identical; for another adult it moves coRatio by effKg/70 (e.g. 67.6 kg: −3.4 %). FU-3's
validation documents for the non-70 kg patients (sanity suite, same command before and after, `--out` in scratch; the
"V.1" column was measured with the 7c line still in place, a superset of the final change, and re-run on the final code
in VALIDATE_FINAL):

| Document | main | V.1 | Band |
|---|---|---|---|
| `s7-apnoea-child` t90 | 158 s 🟢 | **158 s 🟢** | 130–190 |
| `t23-term-apnoea` t90 (80 kg F, 165 cm, effKg 66.2) | 284 s 🟡 | **284 s 🟡** | 150–240 |

The whole sanity report is row-for-row identical before and after (37 🟢 / 42 🟡 / 20 🔴 on both; 0 differing rows). The
pregnancy row's yellow predates V.1.

## 3. Cardiogenic oedema (E-V1-2) and ARDS

The oedema profile carries 7a's `hfref` 0.67 and the lungs' `pulmOedema`; PEEP relieves the lung-water shunt
×(1 − 0.04·PEEP) (tables §4.5). Runs in a `beforeAll` (a crash fails the block).

| PEEP 5 → 12 | SpO2 | true SaO2 | lungState shunt | PCWP (7a pPv) | CO | Result |
|---|---|---|---|---|---|---|
| FiO2 0.4 (plan) | 98 → 98 | 98.4 → 98.8 | 0.15 → 0.10 | 18.2 → 16.6 | 5.23 → 5.14 | — |
| **FiO2 0.4 (V.1)** | **98 → 98** | **98.69 → 99.10** | **0.15 → 0.10** | **18.19 → 16.57** | **5.23 → 5.14** | shunt −33 % and PCWP fall PASS (mechanism check); SpO2 +≥ 2 `it.fails` |
| FiO2 0.21 (plan) | 92.0 → 92.7 | 92.97 → 93.28 | 0.15 → 0.10 | 18.2 → 16.5 | — | — |
| **FiO2 0.21 (V.1)** | **94.0 → 95.0** | **94.85 → 95.52** | **0.15 → 0.10** | **18.19 → 16.57** | **5.23 → 5.14** | SpO2 +≥ 2 `it.fails` (+1.0) |

ARDS moderate PEEP 5 → 15 → 5 (FiO2 0.6): SpO2 **95.0 → 97.0 → 97.0** (+2.0 / 0.0 vs ≥ 5 / > 3; plan 94.5 → 96.0 → 96.0;
main 94 → 98 → 95 with the interim curve) — `it.fails`, calibration row "ARDS link band: re-derive from 7b's recruitment".

## 4. Every link test, before (main) → after (V.1)

`PRINT=1` numbers; "main" is `origin/main` on this machine (14 files / 88 passed), V.1 16 files / 94 passed.

| Test | main | V.1 | Band | Result |
|---|---|---|---|---|
| PEEP 5 → 15 (normal) | CO 6.08 → 5.65, MAP −13.4, CVP +2.4 | CO 6.04 → 5.55 (−8.1 %), MAP 105.1 → 90.9 (−14.2), CVP +2.5 | CO −5…−15 %, MAP > 8, CVP 1.5–3.5 | pass |
| FiO2 0.4 → 1.0 (ARDS moderate) | SpO2 91 → 98 | 93 → 99 (+6) | ≥ 4 | pass |
| RR 14 → 22 | EtCO2 35 → 29.1 → 25 | 35 → 29.1 → 25 | ≥ 2, keeps falling | pass |
| COPD GOLD 3–4 RR 10 → 20 → 10 | auto-PEEP 7.80, MAP 102.2 → 94.8 → 102.0 | auto-PEEP **7.72**, MAP 102.2 → 90.9 → 102.0 | 6–12, > 3, back > +2 | pass |
| ARDS PEEP 5 → 15 → 5 | 94 → 98 → 95 (it.fails) | 95.0 → 97.0 → 97.0 | +≥ 5, −> 3 | `it.fails` |
| Oedema PEEP 5 → 12 | SpO2 96 → 98, CO 4.65 → 4.66 (it.fails, old spec) | §3 | §3 | shunt/PCWP pass; SpO2 ×2 `it.fails` |
| Disconnection | alarm +0.94 s, EtCO2 0 | identical | ≤ 4.8 s, 0 | pass |
| PH crisis PEEP 15 + RR 8 | EtCO2 35 → 41 (+6.0), CVP +2.2, MAP −12.5 | EtCO2 35 → 40 (**+5.0**), CVP **+2.1**, MAP **−11.1** | ≥ 5 / ≥ 1.5 / ≥ 8 | pass — on the band edge, numbers in the title (Decision 22) |
| Tension (R36 acute) | §1 | §1 | §1 | pass |
| Tension profile | — | §1 | 25–50 / 20–45 | pass |
| Massive PE (R36 rig, NR-3 closed; FU-4 G6 alias) | EtCO2 35.0 → 22.4, plateau +0.2 | EtCO2 35.65 → 22.35 (−13.3), plateau 14.14 → 14.19; CO 6.29 → 5.49, MAP 105.1 → 97.3 | ≥ 4, < 0.5 | pass — re-measured on FU-4's one PE event (Decision 21) |
| Fibrosis ΔP, VT 490 → VT 350 × 20 | 15.2 → 10.7 | 15.6 → 11.0 | ≥ 15, < 13 | pass |
| Every row starts cleanly (39 × 60 s) | pass | pass (256 s on a loaded 4-core machine) | 900 s budget | pass |
| link-core, determinism | pass | pass (link-core re-specified: 3 tests) | — | pass |

## 5. Per-profile table (90 s, `vent: { pmax: 60 }`, seed 7; the Task 10 Step 3 probe, deleted after the run)

Columns: reference run plateau / ΔP / auto-PEEP / peak − plateau | linked plateau, PIP, auto-PEEP | the last lungState
(C, R, R_exp, shunt, pleural) | SpO2, EtCO2, MAP, CVP (60–90 s) | CO. Before V.1 every adult row read lungState C 55
(relative) and carried no engine lung condition.

```
PROBE normal ref 13.9/8.9/0.0/9.9 | linked plat 14.1 PIP 24.0 autoPEEP 0.0 | lungState C 55 R 10 Rexp 12 shunt 0.02 pleural 0 | SpO2 99.0 EtCO2 35.7 MAP 105.3 CVP 9.4 | CO 6.74
PROBE bronchospasm ref 16.6/8.9/2.7/27.9 | linked plat 16.8 PIP 44.7 autoPEEP 2.7 | lungState C 55 R 28 Rexp 43 shunt 0.01 pleural 0 | SpO2 98.2 EtCO2 36.0 MAP 95.2 CVP 11.4 | CO 6.66
PROBE anaphylaxis-bronchospasm ref 17.8/8.9/3.8/33.1 | linked plat 18.0 PIP 50.9 autoPEEP 3.9 | lungState C 55 R 33 Rexp 53 shunt 0.01 pleural 0 | SpO2 96.0 EtCO2 35.3 MAP 43.7 CVP 9.2 | CO 4.99
PROBE copd-gold-1-2 ref 14.0/8.3/0.7/15.4 | linked plat 14.3 PIP 29.2 autoPEEP 0.7 | lungState C 58 R 15 Rexp 23 shunt 0.01 pleural 0 | SpO2 98.4 EtCO2 36.0 MAP 94.9 CVP 11.6 | CO 6.64
PROBE copd-gold-3-4 ref 15.8/6.9/4.0/29.9 | linked plat 16.1 PIP 46.0 autoPEEP 4.1 | lungState C 71 R 30 Rexp 49 shunt 0 pleural 0 | SpO2 96.2 EtCO2 36.0 MAP 102.5 CVP 12.1 | CO 5.09
PROBE cystic-fibrosis ref 15.8/9.9/0.9/19.9 | linked plat 16.1 PIP 35.9 autoPEEP 0.9 | lungState C 49 R 20 Rexp 28 shunt 0.04 pleural 0 | SpO2 97.5 EtCO2 36.7 MAP 95.0 CVP 10.4 | CO 6.63
PROBE tube-obstruction ref 17.0/8.9/3.1/41.9 | linked plat 17.3 PIP 59.2 autoPEEP 3.2 | lungState C 55 R 42 Rexp 47 shunt 0.02 pleural 0 | SpO2 99.0 EtCO2 35.7 MAP 95.2 CVP 11.6 | CO 6.67
PROBE tracheal-obstruction ref 15.6/8.9/1.7/29.9 | linked plat 15.9 PIP 45.7 autoPEEP 1.8 | lungState C 55 R 30 Rexp 35 shunt 0.02 pleural 0 | SpO2 99.0 EtCO2 35.7 MAP 107.1 CVP 10.8 | CO 6.77
PROBE smoke-co ref 16.0/8.9/2.1/25.0 | linked plat 16.2 PIP 41.1 autoPEEP 2.1 | lungState C 55 R 25 Rexp 38 shunt 0.01 pleural 0 | SpO2 96.6 EtCO2 37.0 MAP 107.7 CVP 11.1 | CO 6.87
PROBE ards-mild ref 17.3/12.3/0.0/11.8 | linked plat 17.5 PIP 29.4 autoPEEP 0.0 | lungState C 40 R 12 Rexp 14 shunt 0.23 pleural 0 | SpO2 95.0 EtCO2 37.6 MAP 95.9 CVP 7.9 | CO 6.26
PROBE ards-moderate ref 19.0/14.0/0.0/11.8 | linked plat 19.3 PIP 31.1 autoPEEP 0.0 | lungState C 35 R 12 Rexp 14 shunt 0.31 pleural 0 | SpO2 92.2 EtCO2 37.8 MAP 93.7 CVP 8.1 | CO 5.63
PROBE ards-severe-recruitable ref 21.3/16.3/0.0/11.8 | linked plat 21.1 PIP 32.9 autoPEEP 0.0 | lungState C 31 R 12 Rexp 14 shunt 0.39 pleural 0 | SpO2 89.0 EtCO2 38.8 MAP 91.4 CVP 8.1 | CO 5.52
PROBE ards-severe-nonrecruitable ref 21.3/16.3/0.0/11.8 | linked plat 21.7 PIP 33.5 autoPEEP 0.0 | lungState C 30 R 12 Rexp 14 shunt 0.42 pleural 0 | SpO2 88.0 EtCO2 38.6 MAP 91.4 CVP 8.1 | CO 5.52
PROBE fibrosis-ild ref 20.3/15.3/0.0/12.8 | linked plat 20.6 PIP 33.4 autoPEEP 0.0 | lungState C 32 R 13 Rexp 16 shunt 0.06 pleural 0 | SpO2 98.0 EtCO2 36.0 MAP 95.0 CVP 8.3 | CO 6.56
PROBE scleroderma ref 18.7/13.7/0.0/11.5 | linked plat 18.9 PIP 30.7 autoPEEP 0.0 | lungState C 36 R 12 Rexp 14 shunt 0.04 pleural 0 | SpO2 98.0 EtCO2 36.0 MAP 94.4 CVP 10.7 | CO 6.59
PROBE chest-wall-restriction ref 19.6/14.6/0.0/9.8 | linked plat 20.2 PIP 30.0 autoPEEP 0.0 | lungState C 33 R 10 Rexp 12 shunt 0.07 pleural 0 | SpO2 98.5 EtCO2 36.0 MAP 93.2 CVP 11.6 | CO 6.56
PROBE obesity-ohs ref 19.9/14.9/0.0/13.6 | linked plat 20.2 PIP 34.0 autoPEEP 0.0 | lungState C 33 R 14 Rexp 17 shunt 0.06 pleural 0 | SpO2 99.0 EtCO2 35.3 MAP 88.6 CVP 10.3 | CO 11.53
PROBE pneumonia-lobar ref 15.6/10.5/0.1/12.0 | linked plat 15.9 PIP 27.8 autoPEEP 0.1 | lungState C 46 R 12 Rexp 15 shunt 0.21 pleural 0 | SpO2 95.8 EtCO2 36.8 MAP 105.5 CVP 9.7 | CO 6.71
PROBE atelectasis ref 15.9/10.9/0.0/9.9 | linked plat 14.1 PIP 24.0 autoPEEP 0.0 | lungState C 55 R 10 Rexp 12 shunt 0.02 pleural 0 | SpO2 99.0 EtCO2 35.7 MAP 105.3 CVP 9.4 | CO 6.74
PROBE oedema-cardiogenic ref 16.9/11.9/0.1/13.3 | linked plat 17.3 PIP 31.1 autoPEEP 0.1 | lungState C 41 R 14 Rexp 16 shunt 0.15 pleural 0 | SpO2 97.0 EtCO2 36.7 MAP 102.5 CVP 8.8 | CO 5.74
PROBE oedema-noncardiogenic ref 16.9/11.9/0.1/13.3 | linked plat 17.3 PIP 31.1 autoPEEP 0.1 | lungState C 41 R 14 Rexp 16 shunt 0.15 pleural 0 | SpO2 97.0 EtCO2 36.6 MAP 105.7 CVP 9.8 | CO 6.72
PROBE aspiration ref 16.9/11.6/0.3/14.8 | linked plat 17.2 PIP 32.1 autoPEEP 0.3 | lungState C 42 R 15 Rexp 23 shunt 0.18 pleural 0 | SpO2 95.9 EtCO2 37.0 MAP 106.2 CVP 10.2 | CO 6.73
PROBE covid-pneumonitis ref 19.0/14.0/0.0/9.8 | linked plat 19.3 PIP 29.1 autoPEEP 0.0 | lungState C 35 R 10 Rexp 12 shunt 0.35 pleural 0 | SpO2 91.5 EtCO2 37.7 MAP 94.9 CVP 9.7 | CO 6.62
PROBE pulmonary-hypertension ref 14.0/8.9/0.0/9.9 | linked plat 14.1 PIP 24.0 autoPEEP 0.0 | lungState C 55 R 10 Rexp 12 shunt 0.01 pleural 0 | SpO2 99.0 EtCO2 35.8 MAP 93.8 CVP 9.4 | CO 6.29
PROBE pe-massive ref 14.0/8.9/0.1/11.9 | linked plat 14.2 PIP 26.1 autoPEEP 0.1 | lungState C 55 R 12 Rexp 14 shunt 0.1 pleural 0 | SpO2 97.3 EtCO2 36.7 MAP 105.6 CVP 9.5 | CO 6.25 | lungs pvr 1 7a ext.pvr 1
PROBE pe-submassive ref 14.0/8.9/0.0/9.9 | linked plat 14.1 PIP 24.0 autoPEEP 0.0 | lungState C 55 R 10 Rexp 12 shunt 0 pleural 0 | SpO2 99.0 EtCO2 36.3 MAP 105.3 CVP 9.5 | CO 6.72
PROBE fat-embolism ref 14.0/8.9/0.0/9.9 | linked plat 14.1 PIP 24.0 autoPEEP 0.0 | lungState C 55 R 10 Rexp 12 shunt 0 pleural 0 | SpO2 99.0 EtCO2 36.0 MAP 95.3 CVP 9.4 | CO 6.56
PROBE air-embolism ref 14.0/8.9/0.0/9.9 | linked plat 14.1 PIP 24.0 autoPEEP 0.0 | lungState C 55 R 10 Rexp 12 shunt 0 pleural 0 | SpO2 99.0 EtCO2 36.0 MAP 68.3 CVP 15.6 | CO 8.58
PROBE pleural-effusion ref 15.8/10.7/0.0/9.9 | linked plat 15.9 PIP 25.8 autoPEEP 0.0 | lungState C 46 R 10 Rexp 12 shunt 0.12 pleural 1.5 | SpO2 97.9 EtCO2 37.0 MAP 95.1 CVP 10.6 | CO 6.65
PROBE pneumothorax-simple ref 15.8/10.7/0.0/9.9 | linked plat 16.1 PIP 26.0 autoPEEP 0.0 | lungState C 45 R 10 Rexp 12 shunt 0.16 pleural 0 | SpO2 96.9 EtCO2 37.0 MAP 105.4 CVP 9.5 | CO 6.72
PROBE pneumothorax-tension ref 35.6/30.6/0.0/9.8 | linked plat 26.0 PIP 35.9 autoPEEP 0.0 | lungState C 35 R 10 Rexp 12 shunt 0.41 pleural 17.5 | SpO2 89.4 EtCO2 39.0 MAP 93.5 CVP 20.9 | CO 6.36
PROBE haemothorax ref 15.8/10.7/0.0/9.9 | linked plat 16.1 PIP 26.0 autoPEEP 0.0 | lungState C 45 R 10 Rexp 12 shunt 0.12 pleural 4.1 | SpO2 97.9 EtCO2 37.0 MAP 95.0 CVP 12.5 | CO 6.67
PROBE one-lung-ventilation ref 15.4/10.1/0.3/23.8 | linked plat 15.3 PIP 27.1 autoPEEP 0.0 | lungState C 34 R 12 Rexp 14 shunt 0.02 pleural 0 | SpO2 90.7 EtCO2 44.0 MAP 95.1 CVP 9.2 | CO 6.55
PROBE endobronchial ref 19.3/14.2/0.0/14.7 | linked plat 19.7 PIP 29.5 autoPEEP 0.0 | lungState C 34 R 10 Rexp 12 shunt 0.02 pleural 0 | SpO2 91.7 EtCO2 38.5 MAP 105.5 CVP 9.7 | CO 6.69
PROBE bronchopleural-fistula ref 14.0/8.9/0.0/9.9 | linked plat 14.1 PIP 24.0 autoPEEP 0.0 | lungState C 55 R 10 Rexp 12 shunt 0.02 pleural 0 | SpO2 99.0 EtCO2 35.7 MAP 105.3 CVP 9.4 | CO 6.74
PROBE neuromuscular-weakness ref 14.5/9.5/0.0/9.9 | linked plat 14.8 PIP 24.7 autoPEEP 0.0 | lungState C 51 R 10 Rexp 12 shunt 0.08 pleural 0 | SpO2 98.0 EtCO2 36.0 MAP 105.3 CVP 9.4 | CO 6.74
PROBE diaphragm-paralysis ref 14.0/8.9/0.0/9.9 | linked plat 14.1 PIP 24.0 autoPEEP 0.0 | lungState C 55 R 10 Rexp 12 shunt 0.05 pleural 0 | SpO2 98.5 EtCO2 36.0 MAP 105.3 CVP 9.4 | CO 6.74
PROBE pregnancy ref 19.2/14.2/0.0/14.5 | linked plat 19.3 PIP 34.2 autoPEEP 0.1 | lungState C 35 R 15 Rexp 18 shunt 0.04 pleural 0 | SpO2 99.0 EtCO2 36.0 MAP 90.6 CVP 11.1 | CO 7.40
PROBE neonatal-rds ref 15.0/10.0/0.0/5.6 | linked plat 20.4 PIP 43.0 autoPEEP 0.4 | lungState C 1 R 233 Rexp 280 shunt 0.33 pleural 0 | SpO2 44.3 EtCO2 84.5 MAP 34.1 CVP 8.2 | CO 0.29
```

**Massive PE — no PVR at all in the profile (known deviation, request).** Decision 7 expected the profile's lung `pe`
to carry PVR ×3.25 (plan: CO 5.03 → 5.37, "no obstructive picture"). On FU-4's tree the lung `pe` row has no PVR key
(G6: 7a's φ mapping is the ONE PE PVR source, applied by the engine alias `l2/circ/aliases.ts`), and that alias acts
only on DISPATCHED events. A profile's `patient.lungConditions` are installed at creation (`resp/pipeline.ts`
`lungSpecs`), so the `pe-massive` profile gets dead space and shunt but **PVR ×1.0 in both owners** (lungs `lp.pvr` 1,
7a `ext.pvr` 1): CO 6.25, MAP 105.6, CVP 9.5, SpO2 97.3 at 90 s (normal: CO 6.74). A dispatched lung `pe` 1, as the
page's PE demo and the R36 rig send it, does reach 7a: PVR ×9.0 (φ 0.8), EtCO2 36 → 22.7, MAP 105.7 → 97.3, CO
6.53 → 6.21 (MANUAL). Request for the next follow-up: apply `obstructiveAlias` to a profile's `lungConditions` at
engine creation too (or give `PatientProfile` the 7a condition), so one PE profile is one PE.

Other rows worth noting: endobronchial SpO2 91.7 (7b band 85–93 at 5–10 min), OLV 90.7, COPD 3–4 96.2, ARDS
moderate 92.2, oedema 97.0, pregnancy C 35; the neonatal row SpO2 44.3, MAP 34.1, CO 0.29 (C 1, R 233), which is broken
before and after, waiting for R22 (§8).

## 6. Screenshots (`docs/gates/stage-v1/*.jpg`)

Nine JPEGs, 48.8–59.7 KB, from `vent-shots.mjs stage-v1` at ×4, each taken after its demo's settle time plus 60–180 s.
They were taken with a scratch copy that launches Playwright's own Chromium (§8), after the link offset fix; the first
set, taken before that fix, showed the monitor in apnoea during the PH and tension demos (§8).

- `demo-tension.jpg` (tension 0.8 sent 90 s before): ventilator Ppeak **36** (red), VTE 500, Pmean 14; monitor ABP
  **82/60 (66)**, CVP trace high with the CVP 11>10 alarm, SpO2 **89**, EtCO2 34, awRR 13. The plan's prototype showed
  Ppeak 46, ABP 41/35 and SpO2 89 at the same point; on FU-4's tree the pleural pressure is still building 90 s after
  onset (§1), so the pressures are lower and the obstructive shock is still developing.
- `demo-pe.jpg` (lung `pe` 1 sent 90 s before; FU-4's alias applies 7a's `pe` 1): EtCO2 **23** with the yellow
  **etCO2 24<30** alarm, awRR 14; airway pressures unchanged (Ppeak 26, as before the step); SpO2 98; ABP 124/83 (97) —
  MANUAL targets hold the pressure (§4).
- `demo-ph.jpg`: PEEP 15, RR 8 — EtCO2 40, CVP 11>10 alarm, ABP 106/72 (83).
- `demo-hf.jpg`: PEEP 12 — the ventilator's Pmax alarm at 35 with VTE 484 (the same pressure limit main's link test
  shows: PIP 35, VTE 485.6), SpO2 98, EtCO2 37.
- `demo-copd.jpg`: RR 20 — the ventilator's Intrinsic PEEP alarm, Ppeak 53, VTE 562; ABP 115/78 (97), EtCO2 31.
- `demo-ards.jpg`: PEEP 15, FiO2 60 — SpO2 96, Ppeak 39.
- `demo-fibrosis.jpg`, `hamilton.jpg`, `combined.jpg`: unchanged in content from Stage V.

## 7. `it.fails`

V.1's four, each with its numbers in the title (R45):

| File | Title | Why |
|---|---|---|
| `packages/ventilator/test/link-r27.test.ts` | ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5 (measured +2.0 / 0.0 on the 7b lungs) | band fitted to the retired interim curve (Decision 17); calibration row |
| `packages/ventilator/test/link-r27.test.ts` | FiO2 0.4: SpO2 rises ≥ 2 (measured SpO2 98 → 98, SaO2 98.7 → 99.1: the 7b oedema shunt does not desaturate) | Decision 18 |
| `packages/ventilator/test/link-r27.test.ts` | room air (FiO2 0.21): SpO2 rises ≥ 2 (measured SpO2 94.0 → 95.0, SaO2 94.9 → 95.5: shunt 0.15 → 0.10 moves SpO2 by 1) | Decision 18; the old "SpO2 rises and CO falls" `it.fails` is replaced by these two plus the passing shunt/PCWP test |
| `packages/ventilator/test/pleural.test.ts` | reference run: Ppeak rises 10–20 cmH2O over the normal row (measured +21.6: 45.4 vs 23.8) | tables H6 [TXT] governs (Decision 16); calibration row "tension Ppeak vs crs ×0.5" |

Q-7e-8's two `it.fails` had already been flipped by FU-4 F4; none of FU-4's inherited `it.fails` started passing. The
tension bands are only partly restored: plateau and ΔP are back to the authored 25–50 / 20–45, but peak − plateau keeps
7b's widened lower bound 9.7 (authored 10; measured 9.8, which is the tube plus airways — tension does not change
airway resistance).

## 8. Deviations from the plan, re-anchorings, known deviations

**Task 0 re-verification (orchestrator ruling (V.1 review) 4).** A throwaway checker parsed the plan (68 find/replace
blocks, 8 create/whole-file blocks, one `git mv`, one `git rm`) and applied it in task order to a detached worktree at
`origin/main`: 63/68 unique on FU-4's text, 5 re-anchored:

| Block | File | What FU-4 had changed | Re-anchoring |
|---|---|---|---|
| Task 1 #2, #3 | `resp-oxygen.test.ts`, `blood-stage3-recheck.test.ts` | FU-4 F4 had already flipped both Q-7e-8 child tests to `it` ("measured 155 s; was 128 s with Stage 7e") | not applied (already landed; not re-typed) |
| Task 1 #5 | `l2/resp/pipeline.ts` import | FU-4's import line (`physicalDeadSpace`, `ventDefaults`, no `apparatusDeadSpaceMl`) | `coRefLpm` added to FU-4's line |
| Task 1 #6 | `l2/resp/pipeline.ts` coRatio | FU-4 F4 had already divided by `CI_LPM_PER_KG × rs.pat.effKg` (no CPR guard), with its own comment | FU-4's comment kept; the line becomes the plan's (`coRefLpm` + CPR guard) with the plan's comment |
| Task 2 #10 | `l2/resp/pipeline.ts` `lungStateEvent` | `deadSpace(rs)` → `deadSpace(rs, l1)` | the `pleuralMmHg` line added after FU-4's `specs` line |

After re-anchoring, all 66 applied blocks matched exactly once, and the fully applied tree typechecked clean. Checks: (a)
`lp.pPtx` stays global (FU-4 kept it; F3 made it the accumulated valve pressure), so no max-over-sides was needed; (b)
FU-4 G6 changed the PE event (one PE, the alias) and the tension source (alias; `ext.pPtx` no longer written), so the R36
massive-PE rig was re-measured on FU-4's version (§4); (c) FU-3 item 7 did not touch `link-r27`/`link-r36`, and Task
7's blocks matched as written.

**Deviations by task** (each recorded in its commit message):

- **Task 2** — the plan's new `lung-state.test.ts` case expected `pleuralCmH2O` 27.2 twenty seconds after
  `ptxTension 0.8`, and 7a's own `tensionPtx` max-combined with it. FU-4 F3's build-up gives 11.1 at +20 s, and FU-4 G6
  turned 7a's `tensionPtx` into an alias. The test was therefore re-specified to the seam V.1 owns: every lungState
  event equals `max(lp.pPtx, circPtx)/0.7356` at its own emission; the pressure builds monotonically to at most the
  27.2 ceiling (20.9 at +10 min); after the alias, `circPtx` stays 0 and the pressure stays ≤ 34.0, the severity-1
  ceiling, rather than 27.2 + 34. The numbers are in the title.
- **Task 6** — the plan's comments in `link/profiles.ts` ("lung `pe` carries PVR ×3.25", "+20 mmHg pleural") were
  corrected to FU-4's facts (one PE event and the alias; the valve build-up; this profile's PE carries no PVR, §5).
- **Task 7** — the tension-profile test's `pleuralCmH2O ≈ 27.2` (the plan's step model) became "above 5.44 + PEEP and at
  most the 27.2 ceiling" (measured 17.5 at 90 s). Its clinical bands are unchanged: plateau 26.0 in 25–50, ΔP 21.0 in
  20–45. The `it.fails` titles carry this tree's numbers (ARDS +2.0 / 0.0 instead of the plan's +1.5 / 0.0; oedema at
  FiO2 0.4 SaO2 98.7 → 99.1; at FiO2 0.21 SpO2 94.0 → 95.0 instead of 92.0 → 92.7). The PH comment notes +6.0 on main.
- **Task 8** — `apps/demo/src/physiology-console/meta.ts` (outside V.1's partition) gains one curated row,
  `lp.waterShunt` "Lung-water shunt, PEEP-responsive" (%, like `lp.extraShunt`): FU-3's console curation test
  (`lung-labels.test.ts`) fails on any unlabelled lung leaf, and Decision 24 had assigned the label to FU-4, which merged
  before the field existed. (FU-4 had already fixed the `lp.pPtx` unit to mmHg.) The PE demo's comment and watch string
  state FU-4's alias (PVR ×9.0; measured EtCO2 36 → 22.7, MAP 105.7 → 97.3 in MANUAL) instead of the plan's
  "PVR ×3.25, MAP −3.4".
- **Task 8 e2e — intermittent failure, recorded, not root-caused.** In 1 of 5 local Chromium runs, `vent-link.e2e.ts`
  "two-way link, disconnection, COPD demonstration" read auto-PEEP **4.67** (> 6 expected) at page sim 200 s; the other
  4 runs passed, and main passed its one run. A fresh-page probe of the same COPD demo reads auto-PEEP 7.72 from sim
  120 s, with lungState C 70, R 30, R_exp 49, EFL eflK 0.61, identical to the link test. Hypothesis (unproven): the
  absolute read makes a late lungState, or the ventilator page lagging the engine after the disconnection segment,
  visible where the relative read was immune. The full e2e result is in §0.
- **Task 10 screenshots** — `vent-shots.mjs` launches `channel: 'chrome'` (system Chrome), which this machine does not
  have; the screenshots were taken with a scratch copy that launches Playwright's own Chromium (not committed).
- **Task 10 — link race fixed in `packages/ventilator/src/link/port.ts`** (V.1's package, not in the plan's file map;
  commit `7ef0c4f`, regression test in `test/ports.test.ts`). The first screenshot set showed the monitor in
  ***APNEA with EtCO2 0 and SpO2 28–32 during the PH and tension demos while the ventilator breathed 500 mL. The
  engine was rejecting every frame: "externalDrive atTick must be a whole tick ≥ 0". Instrumented cause: a demo switch
  remounts the engine and reloads the ventilator page. The OLD ventilator's last frame (tick ≈ 3000) became the monitor
  side's offset probe; the NEW ventilator (tick 1) reset the offset while the probe was in flight; the probe's late
  result then installed offset 1 − 3000 + 5, so every later frame carried a negative `atTick`. This predates V.1:
  instrumented on clean main, 5 of 6 demo switches lost the link (only COPD recovered). It is also the most likely
  cause of the intermittent COPD e2e failure above. Fix: a restart clears the in-flight probe and bumps a generation,
  and results from before the restart are ignored. The same six-plus-two demo probe afterwards: 8 of 8 switches linked,
  0 rejected frames.
- **Task 1's 7c line withdrawn at the gate** (commit `78e32d9`; blocks Task 1 #7–#8 reverted to main's text). slow-b
  flagged it: `neuro-engine.test.ts`'s `it.fails` "propofol 2 mg/kg: depth-index nadir < 52 — measured 52 after FU-4
  F4" started PASSING (nadir 50). The chain: V.1's 7c line puts `co0`'s START in true L/min; with a dose at t = 0, 7c
  latches `co0` at that start; FU-4 G10's propofol reference (`engine.ts:485`) still converts `co0` with
  `× CO_REF_LPM / (CI_LPM_PER_KG × effKg)`, i.e. 7c's pre-F4 units. On main the two unit errors cancel at t = 0; with
  V.1's line they do not. Measured (propofol 2 mg/kg at t = 0, seed 6, depth-index nadir, main → with the 7c line):
  70 kg/170 cm adult (effKg 67.6) **52 → 50**; 16 kg child **72 → 49** (distribution factor at 30 s 0.90 → 0.21);
  80 kg pregnant **56 → 54**. V.1 may not change drug behaviour (R51; Decision 11 had expected only "units stay
  consistent"), and the proper fix is both lines together (7c's start AND the `engine.ts` reference = `co0` in L/min),
  outside V.1's files, so the 7c line is back to main's and the pair is a request (§10). Task 1's numbers are unchanged
  without it (14/14; child 155.0 s; CPR 0.293 = 0.293), and the `it.fails` holds again (nadir 52).
- Commit trailers name the executing model (Opus 5.5), as the brief allows.

**Known deviations (unchanged by V.1):** the neonatal RDS profile is broken before and after (SpO2 44.3, MAP 34 at
90 s; engine neonatal frame = R22's — Decision 19); the tension-pneumothorax PROFILE starts compensated, because MANUAL
trackers fill against a pleural pressure present from t = 0 (MAP 93.5, CVP 20.9 at 90 s — Decision 15; audit G1/G6);
the massive-PE profile carries no PVR (§5; this replaces Decision 7's "×3.25, CO 5.37").

## 9. Exceptions

- **E-V1-1** (Stage 3): `l2/gas/params.ts` `coRefLpm`; `l2/resp/pipeline.ts` the `rs.coRatio` line with its CPR
  guard and one import; new `test/engine/resp-child-rest.test.ts`. The 7c part (`l2/blood/pipeline.ts`) was applied and
  withdrawn (§8); the two Q-7e-8 `it.fails` had already been flipped by FU-4.
- **E-V1-2** (7b): `l2/lung/side.ts` `waterShunt`; `l2/lung/conditions.ts` (`WATER_SHUNT_IDS`, `waterAdd`);
  `l2/lung/lung.ts` `extraShuntAt` (in the O2 step and `shuntFraction`). Side effect: every ventilated MODELED patient
  with 7c lung water now gets the PEEP benefit — correct physiology.
- **E-V1-3** (7b): `types-lung.ts` `pleuralCmH2O`; `l2/lung/state-event.ts`; `l2/lung/vent-reference.ts`; one argument
  in `l2/resp/pipeline.ts` `lungStateEvent`; one test in `test/engine/lung-state.test.ts`; new `test/l2/lung/v1-lung-seams.test.ts`.
- Outside the partition: `apps/demo/src/physiology-console/meta.ts` (one label row, §8). Inside V.1's package but not in
  the plan's file map: `packages/ventilator/src/link/port.ts` + `test/ports.test.ts` (the link race, §8).
- **T_IT·PEEP residual (Decision 2, [ENG]):** while the lung is collapsed at end-expiration, `P_PL0 + T_IT·PEEP` still
  reaches the heart (≈ 2.4 mmHg at PEEP 5), although a collapsed lung transmits no PEEP. Recorded, not modelled.

## 10. Rulings applied, calibration rows, open items

Decisions 16–30 (orchestrator rulings, V.1 review) are applied as the plan wrote them. Where FU-4 had moved the
ground, the application is in §8: 21 (PE rig re-measured on FU-4's alias); 24 (the `waterShunt` label landed here,
because FU-4 predates the field); 25 (the CPR guard, measured 0.293 / 0.293); 27 (re-anchoring).

**Calibration queue (Ali, R44):** CLOSE "tension-ptx ventilator plateau (until V.1)" (reference 18.8 → 35.6, profile
26.0 at 90 s on FU-4's build-up). ADD: "tension Ppeak vs crs ×0.5" (+21.6 vs +10–20); "tension peak − plateau: 7b's
widened 9.7 vs authored 10"; "ARDS link band: re-derive from 7b's recruitment" (+2.0 / 0.0; catalogue:226 [P] high
recruiter shunt −30–50 %); "cardiogenic-oedema PEEP response: 0.04/cmH2O [ENG] and the oedema shunt size" (SpO2 +0.0
at FiO2 0.4, +1.0 at FiO2 0.21); "PH crisis EtCO2 on the band edge (+5.0 vs ≥ 5)".

**Requests / open items (none blocks this gate):**
1. **Massive-PE profile has no PVR** (§5): FU-4 G6's alias does not apply to a profile's `lungConditions`.
2. **Pre-existing FU-4 inconsistency: propofol's distribution reference for non-70 kg patients (needs one owner and one
   fix).** `engine.ts:485` (FU-4 G10) converts 7c's `co0` with `× CO_REF_LPM / (CI_LPM_PER_KG × effKg)`, which assumes
   7c's pre-F4 units. But since FU-4 F4, `co0` low-passes toward the true L/min unless a drug latches it first. On main,
   therefore, a drug given at t = 0 sees a consistent reference (the two errors cancel), while one given later sees
   q = CO/ref ≈ effKg/70. Measured on main, dose at 5 s or 120 s, read 60 s later: 16 kg child q **0.22–0.23**, 70 kg
   adult 0.97–0.99, 80 kg pregnant 0.91–0.94. This shrinks propofol's V1 and CL2/CL3 in children given propofol after
   the first seconds. The fix is both lines together — 7c's `rest.coLp` start in L/min (V.1's withdrawn line) and the
   `engine.ts` reference = `co0` — owned by 7g/FU-4, outside V.1. It will move the t = 0 numbers in §8, e.g. the child's
   propofol 2 mg/kg nadir, which is 72 on main.
3. CPR compression flow should scale with the patient (Decision 25; still adult-absolute in `gas/coupling.ts`).
4. Anaphylaxis in MANUAL link profiles; `writeLung` must not remove a profile-owned spec (Decision 23) — the stand-in stays.
5. The intermittent COPD e2e reading (§8).
6. The tension link profile sits near its bands' lower edges at 90 s (plateau 26.0 vs 25, ΔP 21.0 vs 20) because the
   pleural pressure is still building. The value keeps rising (the valve reaches ≈ 20–21 cmH2O by 5–10 min).
