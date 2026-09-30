# Gate note — FU-6: respiratory integration

Branch `fu-6-respiratory-integration`, merged with `origin/main` at `42f579e` (FU-8 Part A, PR #27, included — FU-6
merges second). Plan: `docs/plans/fu-6-respiratory-integration.md`. Executor: Tasks 1–3 in the cloud, Tasks 4–20 local
(two cloud sessions were stopped at Task 4; its code and measurements were re-applied and confirmed locally).
Labels follow the glossary (R56): Ppeak, Pplat, PEEPi, ΔP, VT, RR, V̇E, V̇A, PaCO₂, EtCO₂, SaO₂, SpO₂, FRC, Qs/Qt, VD/VT, Ppl.

## 1. Summary

- **Tasks:** 1–19 each committed and pushed on its own (24 non-merge commits); Task 20 = this note, the audit after, the
  suite rows and the PR. 85 files changed under `packages/`, `apps/`, `scripts/` (+3085 / −127).
- **Blocks:** every task's Create/Modify blocks were applied with the plan's own verifier
  (`docs/review-inputs/tools/fu-4-verify.py`), task by task, 0 errors after the re-anchorings of §6.
- **New test files (17 engine + 1 ventilator + 1 e2e):** `test/l2/lung/drive-fu6`, `test/l2/resp/capno-deadspace`,
  `test/l2/gas/inspired-co2`, `test/l2/blood/cohb-washout`, `test/engine/resp-{induction, obstruction, pleural-effort,
  ga-state, capno-deadspace, vcv-pmax, drive-fu6, trigger, inspired-co2, pregnancy, child-baseline, suite}`,
  `blood-anaemia-co`, `lung-hpv-volatile`, `lung-r14`, `packages/ventilator/test/link-parity`, `apps/demo/e2e/fu6`.
  Every new multi-sim-minute file is in `SLOW` **and** `SLOW_A` (executor instruction: slow-b ran near its limit at
  G-FU4), next to FU-8's `fu8-*` glob.
- **Verification on the merged tree** (M-series, `CI=1`, local):

  | check | result | wall |
  |---|---|---|
  | `pnpm -r typecheck` | clean, 8 packages | 9 s |
  | fast set, every package (`PME_TEST_SET=fast`, `--no-bail`) | engine 277 files / 1227 tests; audio 58, skins 179, controller 223, ventilator 97, renderer 89, validation 107 (+11 skipped), demo 141 — all green after §5's R45 rows | 345 s |
  | slow-a | 45 files / 166 tests green after §5 | 1011 s |
  | slow-b | 45 files / 252 tests green after §5 | 825 s |
  | `pnpm build` | clean | 8 s |
  | `CI=1 pnpm test:e2e` (Chromium + WebKit) | 61 passed, 23 skipped, **2 failed: `stage6a` rtc and `stage6a-latency` (Chromium)** — WebRTC on this machine; the rtc test fails identically on `origin/main` 2473f0b here. `fu6` smoke green on both browsers (38 s). | 13.2 min |
  | `audit:respiratory all` | 94 scenarios, `ENGINE EXCEPTIONS: none`, exit 0 (`docs/gates/fu-6/audit-after.txt`, `audit-summary.txt`) | 625 s |
  | tick bench (`tickBench(60)`, 3 runs, same load) | p50 **0.44 ms main → 0.45 ms FU-6** (+2 %), p99 0.59 → 0.59–0.78 | — |

  The slow and fast counts are after the R45 edits of §5, which were each re-run file by file (every edited file green).

## 2. The respiratory suite (RS1–RS15, `resp-suite.test.ts`, merged tree; rows in `docs/gates/fu-6/suite-rows.txt`)

| row | band | measured | status | owner of a miss |
|---|---|---|---|---|
| RS1 healthy VCV 7 mL/kg × 12 | PaCO₂ 35–42, VD/VT 0.25–0.4 | M PaCO₂ 32.2, VD/VT 0.26; F 33.5 / 0.28 | **it.fails** (hypocapnic; VD/VT met) | FU-6 R4 VCO₂ −15 % + FU-4 R1 — calibration, §7 Q1 |
| RS2 preox apnoea to SaO₂ 90 % | adult 6.5–9.5, obese 2–3.5 | 7.95 / **2.77** (FU-8 body-size rule; 2.87 before the merge) | it | — |
| RS2b pregnancy / child | 2.5–4.5 / 2–3.2 | 4.82 / 3.38 | it.fails | 7j (ODC, supine FRC); child FRC Q-FU6-11 |
| RS3 propofol, natural airway, air | RR ≤ 30; VT < 100 ≤ 60 s; SaO₂ < 90 ≤ 2 min | 22.6 / +44 s / +59 s | it | — |
| RS3b capnogram while VT < VD | < 15 | 27.0 (15.6 pre-FU-4) | it.fails | Q-FU6-12 (Fowler ramp) |
| RS4 full induction | SaO₂ ≥ 95; first BVM EtCO₂ = PaCO₂ ± 5 | 99.9 %; 58.9 vs 59.3 | it | — |
| RS5 remi 0.2 / naloxone | RR ≤ 6; +3 | 4.0 → 7.0 | it | — |
| RS5b remi 0.1 RR; ΔPaCO₂ at 0.2 | RR 6–10; +5–15 | RR 5.58; +13.3 (met) | it.fails (RR) | 7f/7g opioid rate depression |
| RS6 sevo ≈ 1 MAC via SGA | RR ≥ 1.4×, VT ≤ 0.7× | 16.7 vs 13.6 (1.23×), VT 0.67× | it.fails (RR) | Q-FU6-7 |
| RS7 bronchospasm, unlimited (pmax 80) | Ppeak ≥ 40, PEEPi ≥ 8, α ≥ 140; salbutamol −30 % / −50 % | 44.3 / 11.9 / 164° → 24.0 / 2.4 | it | — |
| RS7c default Pmax 40 | Ppeak = limit ± 0.5; VT < set | 40.0 / 476 mL | it | — |
| RS7b SaO₂ falls ≥ 4 | ≥ 4 % | 99.9 → 99.7 | it.fails | calibration (low-V/Q share of the spasm row) |
| RS8 laryngospasm | Ppl swing ≤ −20 cmH₂O; pulsus ≥ 10 | −30.7 (met); pulsus 8.1; SaO₂ 12.9 % at 180 s | it.fails (pulsus) | 7a interdependence size |
| RS8-NPPE (declared NOT MODELLED) | palvObs −1…−12, ΔEVLWI < 0.5 | −5.8 mmHg at effort 4.0, ΔEVLWI 0 | it | Q-FU6-3 |
| RS9 kink / disconnection | Ppeak = Pmax; VT ≤ 100; capnogram < 5 | 40.0 / 68 mL / 0.0; numeric 0 at +13 s | it | — |
| RS10 COPD RR 10 → 30 (pmax 80) | PEEPi ≥ 15, MAP −25 % | 18.2; 84.4 → 30.4 | it — **but the patient ARRESTS ≈ 70 s after RR 30 (CO 0, PEEPtot 23.2), identically on origin/main 2473f0b** | FU-4/V.1 (pre-existing) |
| RS10b 30 s disconnection | MAP ≥ 85 % | 30.4 of 84.4 (arrested; PEEPtot stays 23.2 after the disconnection, also on main) | it.fails | FU-4/V.1 |
| RS11 ARDS recruitment (pmax 80) | ΔP falls > 1 at intact VT; Pplat ≤ 30 | 13.1 → 11.8, VT 420, Pplat 27.1 | it (pre-declared flip holds) | — |
| RS12 OLV + sevoflurane | PaO₂ −5–20 % | 78 → 68 (−12.8 %); non-dependent flow 0.36 (posture: Q-FU6-6) | it | — |
| RS13 massive PE | awake RR ≥ 25, PaCO₂ ≤ 35; ventilated EtCO₂ −10, gap ≥ 15, mPAP 30–45 | awake 28.2 / 33.1 (met); **ventilated: arrest within ≈ 2 min of `lungCondition pe 1` (CO 0, EtCO₂ → 0), identically on origin/main** | it.fails | FU-4 one-PE alias severity |
| RS14 FiCO₂ 8, 20 min | PaCO₂ and EtCO₂ +6–10 | +6.7 (met) / +5.98 | it.fails (EtCO₂ by 0.02) | Q-FU6-14 |
| RS15 link parity | gas ± 3 / 3 / 2, Pplat and VT ± 10 % | healthy met; bronchospasm at 30 min: link VT 238 vs engine 476, PaCO₂ 59.2 vs 39.6 | it / it.fails | V.1 (link VC flow 60 L/min meets Pmax early) |

## 3. Before → after (audit, `docs/gates/fu-6/before-after.txt`)

BEFORE = the same runner on `origin/main` 2473f0b (V.1 + FU-4, **before FU-8**), research `RIG` (rocuronium 1 mg/kg, no
infusion — F10(10)); AFTER = the merged branch head (FU-8 Part A included, so a few rows move by FU-8's body-size and
CPR changes too, not only FU-6's). The full per-window digests of 40 scenarios are in `before-after.txt`.

| cell | before | after |
|---|---|---|
| A2 VCV 12 × 500, 60 min PaCO₂ | 38.4 | 38.8 |
| B1 preox apnoea adult, SaO₂ < 90 | 9.75 min | 8.00 min |
| B3 obese | 3.33 | 2.83 |
| B4 pregnancy | 7.00 | 4.83 (PaCO₂ at start 39.9 → 33.7) |
| B5 child | 7.50 | 3.42 |
| B6 child awake baseline | PaCO₂ 36.9, RR 8.6, VT 270 (oscillating) | PaCO₂ 36.1, RR 7.3, VT 244 (steady) |
| C4 propofol, natural airway | RR max 38.1, SaO₂ nadir 50 %, PaCO₂ max 56 | RR max 24.1, **SaO₂ nadir 1 %**, PaCO₂ max 62 (apnoea + obstruction, no rescue in the script) |
| C4b propofol via SGA | RR max 19.0 (no apnoea), SaO₂ nadir 90 | apnoea then RR 18.9, SaO₂ nadir 69 |
| C8 remi + propofol via SGA | SaO₂ nadir 78 | **SaO₂ nadir 6 %**, 31 % at 15 min (the opioid removes the hypoxic rescue, D14b) |
| D1 remifentanil titration | RR 4.0 → naloxone 8.4 | 4.0 → 8.3 |
| D2 sevoflurane via SGA | RR 17.7, VT 317 | RR 16.5, VT 299 |
| D3 extubation at TOFR 0.6 | RR max 22, SaO₂ min 97 | RR max 16.7, VT 397, SaO₂ min 95 (awake obstruction 0.38, was 0.6) |
| E1 airway bronchospasm (salbutamol 900 s) | Ppeak 31.8, PEEPi 5.5 at 1200–1500 s | 24.3 → 18.7, PEEPi 2.5 → 0.5 (one condition, drugs act) |
| E1b lung bronchospasm (salbutamol, sevoflurane) | Ppeak 44.0 / PEEPi 11.9 flat | 25.8 → 18.8 / 0.5 |
| E2b laryngospasm 3 min | RR 45 (demanded), release PaCO₂ 40.7 | RR ≤ 19.5 during obstruction, release PaCO₂ 40.3, SaO₂ nadir 11 % |
| E3 kinked tube | Ppeak 5.0 (= PEEP) | Ppeak 40.0 (Pmax), capnogram flat |
| F1 ARDS recruitment manoeuvre peak | 72.7 | 40.0 (the internal VCV's Pmax) |
| F3 OLV PaO₂ (sevoflurane 1800 s) | 76 → 78 | 76 → 70 |
| F6 permissive hypercapnia PaCO₂ | 59.7 | 54.8 |
| G1d PE awake | RR 21.9, PaCO₂ 42.9 | RR 28.2, PaCO₂ 34.3 |
| G2 Hb 5 | HR 69, CO 5.6 | HR 101, CO 6.9 |
| G3 COHb 30 % → FiO₂ 1 | COHb flat | washes out (26.6 % air / 16.8 % O₂ at 60 min, blood-anaemia-co) |
| H1 FiCO₂ 8 | PaCO₂ 34.5 → 31.5 | 34.6 → 38.4 |
| I1 propofol + roc, no thermal switch | PaCO₂ 36.2 (FRC 2100) | 31.2 (FRC → GA value, VCO₂ −15 %) |

## 4. Screenshots (`docs/gates/fu-6/`, Chromium, JPEG q45, 1000 × 1000; all ≤ 60 KB)

| file | shows | size |
|---|---|---|
| `bronchospasm.jpg` | t 399 s: shark-fin capnogram, EtCO₂ 24, lungState R 60, PEEPi 11.4 | 52.0 KB |
| `bronchospasm-salbutamol.jpg` | t 1019 s: square plateau, EtCO₂ 29, R 26, PEEPi 2.4 | 52.7 KB |
| `induction-apnoea.jpg` | t 189 s: APNEA, flat capnogram, SpO₂ 90, HR 55 (fentanyl + propofol via SGA) | 47.3 KB |
| `laryngospasm.jpg` | t 240 s: APNEA, flat capnogram, SpO₂ 34, HR 44 | 45.5 KB |
| `laryngospasm-release.jpg` | t 300 s: RR 23, EtCO₂ 36, SpO₂ 76 and rising | 55.0 KB |
| `kinked-tube.jpg` | t 179 s: flat capnogram, R 606, PEEPi 10.3 | 48.0 KB |
| `anaemia-hb5.jpg` | t 598 s: HR 102, SpO₂ 96, EtCO₂ 36 | 52.7 KB |

The page has no ventilator-pressure strip; Ppeak/PEEPi are in its lungState diagnostic line. Taken before the FU-8 merge
(the demo page's physiology rows did not change in the merge; the smoke is green on the merged tree).

## 5. `it.fails` list with numbers (merged tree) and flips

**FU-6's own files:** RS1 (PaCO₂ 32.2 / 33.5); RS2b (4.82 / 3.38); RS3b (27.0); RS5b (RR 5.58); RS6 (1.23×); RS7b
(99.9 → 99.7); RS8 (pulsus 8.1); RS10b (35 %, arrest); RS13 (ventilated arm arrests); RS14 (EtCO₂ +5.98);
`resp-ga-state` child 3.38 min; `resp-pregnancy` apnoea 4.82 min; `resp-capno-deadspace` BVM 100 mL display 15.0 (< 15);
`resp-vcv-pmax` healthy delivered VT 494.3 (500 ± 5); `resp-drive-fu6` stimulus V̇E +3.4 % (3.27 → 3.38; band +20 %);
`blood-anaemia-co` CO +20 % (5.76 → 6.94; band +30 %); `lung-r14` hypercapnic mean PAP +1.1 at PaCO₂ 55 (band +2) and
induction Qs/Qt 0.015 (band 0.07); `resp-inspired-co2` RS14 EtCO₂ +5.98; `resp-child-baseline` VT 15.4 mL/kg (RR 7.4)
and SpO₂ lag 22 s (band 20); `link-parity` bronchospasm (link VT 238 vs 476).

**Other files, R45 applied by the executor (not in the plan's lists — deviations, §6):** `neuro-acceptance` residual
block VT ratio 0.80 (band < 0.75; the rig has no hypnotic = Eikermann's awake patient, D21); `organs-tbi` MODELED
Cushing HR ratio 0.803 (≤ 0.80; the MAP half stays `it`); `arrest-etco2` CPR mean EtCO₂ 15.9 (17–23; 17.5 on main);
`tension-ptx` decompression at +4 min finds a pulseless patient (PEA at +3.87 min); `lung-circ` COPD MAP direction 1.79
(> 2; the CO half −15 % stays `it`); `fu8-pea-resus` (FU-8) and `circ-lowflow-arrest`'s two ROSC rows (FU-4): no pulse
in the class IV resuscitation; `neuro-engine` propofol DI nadir 52 (< 52); `resp-child-rest` adult CPR coRatio 0.363
(0.25–0.33).

**Flips (pre-declared `it.fails` now met, titles keep "was …"):** `resp-induction` fentanyl + propofol apnoea 110 s
(60–240; 36 s at Task 4, 411 s at Task 10) and remifentanil 190 s (≥ 90); `resp-child-rest` child CPR coRatio 0.312
(0.25–0.33; FU-6's guard + FU-8 A22 — the orchestrator's re-statement); `endo-acceptance` MH dantrolene EtCO₂ turn at
+5.0 min (was +4.0); `tension-ptx` PPV PEA ≤ 10 min (+3.87; was +10.45); `obstructive-aliases` massive-PE SBP 84.6 at
3 min (was 92.8); `fidelity-lowflow` technical short cycles 0 (FU-8 had flipped it too; FU-8's title kept); RS11 ΔP
(pre-declared calibration row, holds with its delivered-VT guard). **Not a flip:** `circ-hypoxic-arrest` final HR 73.8
(FU-4 74.4; F4). **Declared NOT MODELLED:** NPPE — palvObs −5.8 to −7.1 mmHg at effort 4.0–4.85, pCap max 17.7, ΔEVLWI
0.00 against a ≈ 23 mmHg Starling threshold (F8; Q-FU6-3).

## 6. Deviations and re-anchorings

**Re-anchored find blocks** (the SAME change on the merged text; the plan's blocks were not edited — the executor kept a
re-anchored copy in scratch): (1) T6 `alveolarVentilation(d, t, deadSpace(rs))` → `deadSpace(rs, l1)`; (2) T7
`deadSpaceMl: deadSpace(rs, l1), frcMl: …`; (3) T7 `SKIP_PATH` = the union of FU-4's (`hemo.circ.acc`,
`hemo.circ.cppAcc`), FU-5's (`hemo.num`, `resp.num`, `hemo.nibp`) and FU-6's **three** entries (`resp.spont.pc`,
`resp.spont.effort`, `resp.wakeMmHg`; the plan's "four" is a miscount — E-FU6-8 names three); (4) T8/T9/T11 FU-4 exported
`physicalDeadSpace(pat, artificialAirway)` from `l2/gas/params.ts`: every `physicalDeadSpace(rs)` became
`physicalDeadSpace(rs.pat, <FU-4's mechanical predicate>)` (in T9's ventilator-only branch `true`, TS narrowing); (5) T11
`pk-bus` keeps FU-4's flipped title, only the rocuronium line is added; (6) T13 the gas/params import line (FU-6's two
names added to V.1's/FU-4's line); (7) T14 7a's `rSys` line is FU-4's `… * endoSvr` — `* (x.viscF ?? 1)` appended. The
plan's table rows 2–3 (FU-4 G6 `weightKg` in `pleural.ts`) did not occur (FU-4 did not change that function) and row 8 is
void (F4). No block needed a second anchoring after the FU-8 merge (the merge conflicts were test/config only).

**Task 1 reconciliation (cloud):** Task 1's first runner was a reconstruction; `2c9880b` restored the original
`research/09-audit-scripts` (matching the plan's SHA prefixes) with Task 1's edits (94 scenarios; the reconstruction had
57). Task 0's precondition 3 (`M-PD12-infant-vcv` 1800 s, no exception) was met there and again in this audit.

**Task 4:** `WAKE_QUANTILES` re-fitted on the merged main (R45 rule 3 — [ENG] knots, the label as fit target): sweep
(seed 7, SGA, FiO₂ 0.5, propofol 2 mg/kg, shift pinned) 7.3 → 0 s, 8.2 → 30 s, 10.0 → 60 s, 13.3 → 110 s; knots
0.57/0.64/0.88/1 → 7.3/8.2/10.0/13.3 (plan 6.6/8.4/11/14.5). The opioid rows were not tuned.

**E-FU6-7 rig re-derivations:** `spont.test.ts` (steady-state hold), `circ-sanity-2` R23 O₂ and H7 time-averaged
pressures, `endo-circ-acceptance` sepsis paralysed, `pk-bus` rocuronium 1.2, `lung-circ` COPD — the plan's rocuronium
0.6 mg/kg still let the RR-10 arm trigger before onset (37 breaths in 3 min), so D19's ventRig paralysis (1.2 mg/kg +
0.6 mg/kg/h) was used.

**E-FU6-10:** `depth-drive.test.ts` `NMB:` row — awake obstruction 0.150, vtMult 0.85 (was > 0.4); unconscious arm keeps
> 0.4 (0.600, vtMult 0.40). `l2/neuro/pipeline.test.ts` residual-block row — 0.151 (was > 0.3). Reason: the Q-FU6-4
ruling (Eikermann 2003 governs the awake patient).

**Files outside the plan's named lists that the executor edited under R45 (all `it.fails`/flip + number, no band
widened):** `neuro-acceptance`, `organs-tbi`, `endo-acceptance`, `arrest-etco2`, `tension-ptx`, `obstructive-aliases`,
`fidelity-lowflow`, `neuro-engine`, `circ-lowflow-arrest`, `fu8-pea-resus`, `resp-child-rest` (the last by the
orchestrator's instruction). Most trace to ONE FU-6 mechanism meeting rigs that assume none: **R9's assist-control — an
undrugged, unparalysed MODELED patient on the ventilator now breathes over it** (TBI Cushing, tension PTX, CPR EtCO₂) —
and one to **R11's viscosity term** (the class IV resuscitation, below). The TBI rig was tried paralysed and rejected
(R4 makes a paralysed patient "anaesthetised": PaCO₂ 36.0, ICP 20 at 12.0 min, HR ratio 0.81).

**Other:** the ventilator-parity file uses V.1's names unchanged; `resp-bronchodilation`/`-bronchospasm-one` arms at
`pmax: 80` (F2) with re-measured titles. Truth budget (D16): today's tree 1317 leaves; the 12-drug future tree 2041 of
2100. Exceptions used: E-FU6-1, -2, -3, -4, -6, -7, -8, -9 (Task 2's `ageMin`), -10; **E-FU6-5 unused (withdrawn)**.

## 7. Calibration-queue rows for Ali (R44)

WAKE_QUANTILES knots (above; seeds 1–20 on FiO₂ 0.5: 11/20 apnoeic, < 30 / 30–60 / > 60 s = 2 / 5 / 4, max 114 s;
label 43 %, 7/24/12 %) and WAKE_MMHG 8; CENTRAL_TAU_S 90; APNOEA_VE_IN/OUT 0.10/0.15; the opioid arms (fentanyl
36 → 411 → 110 s across Tasks 4 / 10 / the FU-8 merge — this row is sensitive); GA_TAU_ON/OFF 20/300 s (F10(3): real
recovery takes hours); the adult GA FRC 2100 → 1400 mL (−0.7 L vs Hedenstierna's −0.4–0.5 L) and **GA_METABOLIC via gaLvl
(RS1 now hypocapnic 32–34 on a 7 mL/kg × 12 VCV; I1 PaCO₂ 36.2 → 31.2)**; PMUS_REST 8; smooth-muscle fractions and F6's
refractory terms; magnesium Emax; the alveolar-fraction ramp (RS3b 27, BVM 100 mL 15.0); VCV_PMAX_DEFAULT 40;
KINK_R_MULT 150; BUCK_CMH2O 30; **UA_AROUSAL 0.25 and HVR_NMB_EMAX 0.3 / HVR_NMB_TOFR_LO 0.7** (D21); J_PE_VE_FRAC 2.4 /
J_PE_RR 4 (PE awake RR 28.2, PaCO₂ 33.1); HVR_INDEP_VE 0.5; **VISC_EXP 0.6 (HR +48 % vs Weiskopf +35 %, CO +20 %; and it
now blocks ROSC in the class IV resuscitation — §8)**; the COHb exponent; K_PVR_CO2 0.015 (+1.1 mmHg at PaCO₂ 55);
ATEL_IND (Qs/Qt 0.015); the child GA FRC; the laryngospasm effort (chemical drive only; NPPE unreachable); the opioid rate
depression (RS5b, 7f/7g).

## 8. Open questions (merged-tree numbers)

- **NEW — should an arrested / resuscitated patient's own drive trigger the ventilator?** Since R9 the MODELED drive runs
  on the ventilator whenever FU-3's brainstem gate is open; under CPR q 0.8 the brainstem counts as perfused, so the
  drive triggers 14–19/min during CPR (arrest-etco2 mean EtCO₂ 17.5 → 15.9). A guard (no trigger while pulseless / CPR
  active) is a mechanism change FU-6 did not make without a ruling.
- **NEW — rigs with an awake, unparalysed patient on the internal ventilator.** They now breathe over it (TBI Cushing,
  tension PTX: PEA at +3.87 min, decompression too late). Physiologically right for an awake patient; the rigs' premise
  (controlled ventilation) is FU-4's/7d's to restate (paralyse or sedate).
- **NEW — viscosity under haemodilution and CPR (R11 × FU-8 A19).** The class IV resuscitation (FU-4 page scenario 3,
  `fu8-pea-resus`, `circ-lowflow-arrest`) no longer regains a pulse: with viscF held at 1 the pulse returns at +308 s of
  CPR; with FU-6's term the diluted blood's lower SVR keeps the CoPP down and the PEA decays to asystole. Options: limit
  the viscosity factor to the perfusing circulation, a floor, or accept (then the demo scenario needs more adrenaline).
  This is the most consequential FU-6 × FU-8 interaction for the demo pages.
- **NEW — pre-existing on origin/main, surfaced by the suite:** severe COPD at RR 30 arrests (PEEPtot 23.2, CO 0) and a
  disconnection does not release PEEPi (RS10/RS10b); ventilated `lungCondition pe 1` arrests within ≈ 2 min (RS13).
  Owners FU-4/V.1.
- **C4 / C8 depth of desaturation.** An unassisted propofol induction on a natural airway now reaches SaO₂ 1 % (C4) and
  remifentanil + propofol via SGA 6 % (C8) — no rescue in those scripts; the direction is the teaching point (D14b), the
  depth is Ali's to confirm.
- Q-FU6-1 … Q-FU6-16 stand as the plan writes them, with these merged-tree numbers: Q1 seed 7 38 s, 2.5 mg/kg 48 s,
  fentanyl 110 s, remifentanil 190 s; Q2 salbutamol 44.3 → 24.0 (−46 %), adrenaline 22.4 at 3 min → 40.2 at 10, sevo
  24.7 at MAC 0.88, ketamine 31.5, Mg 36.4; Q3 release PaCO₂ min 40.0; NPPE as §5; Q5 V̇E +3.4 %; **Q6 (posture for
  OLV): the SP coverage audit's before-numbers — supine OLV PaO₂ 111 mmHg at 30 min vs lateral 150–250, non-ventilated
  lung flow 0.42 at onset / 0.27 at 30 min; FU-6's own OLV control reads PaO₂ 78 at FiO₂ 1 with flow 0.36**; Q7 RR
  1.23×; Q8 truth tree 2041/2100; Q9 bucking 16.9 → 39.6; Q10 pregnancy 4.82 min (PaCO₂ 30.8); Q11 child 3.38 min;
  Q12 RS3b 27.0; Q13 Pmax 40 (476 mL); Q14 +6.7 / +5.98; Q16 PE V̇E ≈ 2.4 × rest.
- **Request (SP coverage audit):** intra-abdominal pressure does not change chest-wall compliance (IAP 14 leaves
  compliance and Ppeak unchanged) — not in any FU-6 task; recorded for its owner.

## 9. Coverage-matrix cells (R54)

| cell | audit verdict | after FU-6 (merged tree) | new verdict / remaining owner |
|---|---|---|---|
| A09-A3b GA FiO₂ steps | TW | induction Qs/Qt 0.015 at FiO₂ 1 | TW — ATEL_IND |
| A09-B1 preox apnoea adult | TW 9.75 | 7.95–8.00 min | PL |
| A09-B3 obese | TW 3.33 | 2.77 (FU-8 body-size rule; 2.83–2.87 before) | PL |
| A09-B4 / B4g pregnancy | TW | 4.82 (PaCO₂ 30.8, V̇O₂ +20 %) | TW — 7j |
| A09-B5 child | TW 7.8 | 3.38 | TW — child GA FRC (Q-FU6-11) |
| A09-B5g child baseline | WR | PaCO₂ 36.1, VT 15.4 mL/kg at RR 7.4 (steady; adult L1 pattern) | TW — per-patient resting pattern (FU-4 R1 / FU-8) |
| A09-C1a induction | PL | seed 7 apnoea 38 s | PL |
| A09-C1b capnogram below VD | WR | 0 below 0.6·VDs; 27 while VT < anatomical VD | TW — Q-FU6-12 |
| A09-C4 propofol natural airway | WR (RR 41) | RR max 24, VT < 100 at +44 s, SaO₂ nadir 1 % | PL (depth: §8) |
| A09-D1 remifentanil | PL/MI | RR 5.58 at 0.1; 4.0 → 7.0 naloxone | TW — 7f/7g |
| A09-D2 sevoflurane via SGA | TW | RR 1.23×, VT 0.67× | TW — Q-FU6-7 |
| A09-D3 residual block | TS | obstruction 0.38 at extubation (awake 0.15 / unconscious 0.60), VT 397 by +22 min, SaO₂ ≥ 95 | PL |
| A09-D4 stimulus under remi + propofol | MI | V̇E +3.4 % | MI — Q-FU6-5 |
| A09-D-HVR | MI | hvrDep 0.45 at 0.1 MAC; probe ΔV̇E to PaO₂ 56: awake +11 %, sevo 0.78 MAC +7 %, remi + sevo +1 % | PL |
| A09-E1t / E1b bronchodilators | MI/IN | salbutamol −46 % Ppeak, −80 % PEEPi; adrenaline −49 % at 3 min; sevo −44 % | PL |
| A09-E2 / E2b laryngospasm | WR/MI | RR ≤ 19.5, effort 4.5, neural VT ≤ 2242; Ppl −29.8 to −30.7 cmH₂O; pulsus 8.1; release PaCO₂ ≥ 40.0 | TW (pulsus) — NPPE declared NOT MODELLED |
| A09-E3 kinked tube | WR | Ppeak 40.0, VT 68 mL, capnogram flat | PL |
| A09-F1r ARDS recruitment | TW | ΔP 13.1 → 11.8 | PL |
| A09-F2d COPD disconnection | TW | arrest at RR 30 before the disconnection (pre-existing on main) | WR — FU-4/V.1 |
| A09-F3 OLV | TS/MI | sevo PaO₂ 78 → 68 (−12.8 %) | PL (HPV); posture MI — Q-FU6-6 |
| A09-F6 permissive hypercapnia | WR/MI | PaCO₂ 54.8; mean PAP +1.1 | TW — K_PVR_CO2 |
| A09-G1d PE awake | TW | RR 28.2, PaCO₂ 33.1, SaO₂ 92.6 | PL |
| A09-G2 anaemia | MI | HR 70 → 103, CO +20 %, lactate 1.00 | TW (CO) |
| A09-G3 COHb | MI | 26.6 % air / 16.8 % FiO₂ 1 at 60 min | PL |
| A09-H2 lung bronchospasm capnogram | IN | one shark fin, α 164° → 130° after salbutamol | PL |
| A09-H3 COPD capnogram | TW | not addressed | TW — 7k |
| A09-H5 exhausted absorber | WR | PaCO₂ +6.7 / EtCO₂ +5.98 at 20 min | TW (EtCO₂) — Q-FU6-14 |
| A09-H6 cardiogenic oscillations | TW | not addressed | FU-5 |
| A09-H11 EtCO₂ at RR ≤ 6 | WR | waveform = true EtCO₂ (D1/D4 samples) | FU-5 (numeric) |
| A09-Ib link vs internal ventilator | WR | healthy parity met; bronchospasm VT 238 vs 476 | TW — V.1 |
| A09-Ic2 airway + lung bronchospasm | IN | one condition (44.0 / 11.9 ×3 unlimited) | PL |
| NN-08 (M-NN08) extubation TOFR 0.6 → air | new | SpO₂ nadir 96 %, RR 17.5 × VT 350–380 | PL (see NN-08a/b below) |
| PD-11 child VCV 8 mL/kg × 20 | new | no exception; PaCO₂ 35.8 → 25.0, pH 7.56 at 30 min (hypocapnic: VD no longer 459 mL; R4 VCO₂ −15 %) | TW (over-ventilated at 8 mL/kg × 20) — FU-8 / calibration |
| PD-12 infant, adult HME | new | 1800 s, no exception | unblocked (FU-4 R1) |
| CM-07 COPD GOLD 3, O₂ | new | FiO₂ 1: PaCO₂ 38.8 → 42.1 (+3.3; band +5–20), SaO₂ 100 | TW — calibration (Haldane / V/Q release) |

**NN coverage audit cells (research/15, re-run on the FU-6 branch with its own scripts, seed 7):** NN-08a awake
residual-block obstruction 0.465 → **0.176** (Task 5 Step 5; PL kept). NN-08b HVR ratio with vs without block 1.05 →
**1.007 — still MI/TW**: Task 10's NMB arm is present (hvrDep 0.30 at TOFR ≤ 0.7, 0.157 as TOFR recovers, 0 at ≥ 0.9)
but the cell measures 15–25 min after extubation, when TOFR has recovered toward 0.8–0.9, in a poikilocapnic loop with a
shunt challenge (FiO₂ < 0.21 not expressible, N15) — the cell's rig is the NN audit's to re-specify. NN-20a elderly
midazolam + fentanyl on air: SpO₂ nadir 94 → 93 %, no apnoea (still WR); NN-20b V̇E drop 35 → 42 %, obstruction 0
(still WR) — FU-6's wake term acts only at loss of consciousness; owner FU-7 Task 6.
