# Gate note — FU-7: drug-layer integration

Branch `fu-7-drug-layer`, plan `docs/plans/fu-7-drug-layer.md`, rules `docs/review-inputs/rulings-excerpt-fu7.md`,
completeness audit `docs/gates/fu-7/completeness.md`. PR #32.

**Trees**

- **Base:** `origin/main` 176f702 (FU-6, PR #28), merged in as b004289. That tree is the "before" for every number
  here (`docs/gates/fu-7/baseline.md`).
- **Gate merges:**

  | merged in as | `origin/main` | what came with it |
  |---|---|---|
  | 8981912 | b2a0292 | RESUME docs only |
  | cf6d27f | 90e4ee9 | Stage 7k, Stage 9 |
  | cd26d5f | bd5880b | FU-9 Parts A+C, PR #31 |

  The gate tree is this branch's head. Every "after" number below is measured on it unless a row says otherwise.

**Who did what**

- **Executors:** one cloud session did Tasks 0–19 and most of Task 20, each task committed and pushed on its own. It
  stopped on purpose inside the gate, on two slow-a failures that no `it.fails` declared (Task 19 Step 4's stop rule).
- **The local finisher** did the rest:
  - the completeness audit;
  - the two failures, under the orchestrator's rulings (D15b, §5);
  - the two main merges;
  - Stage 9's glossary labels for FU-7's truth leaves;
  - the slow-group split (§7);
  - the gate runs, this note and the PR.
- **Detail:** each case title carries its band and its source; this note lists the numbers.

## §1 What changed, task by task

| task | commit | change | main files (engine-core `src/`) |
|---|---|---|---|
| 0 | b1d1854 | base check; CM-15c and DV-01b preconditions **PASS** (re-run on the gate tree: PASS, §5) | `docs/gates/fu-7/baseline.md` |
| 1 | c435b9d | `pnpm run audit:drugs` (research/14 harness; `$PME_AUDIT_OUT`) | `scripts/audit-drugs/*` |
| 2 | 57f1555 | zero-slope onset chain (addendum 19); organ-function decline (2c), fentanyl flow-dependent distribution (2d) | `l2/pk/{gamma,pipeline,row}.ts`, rows |
| 3 | f30f43f | ONE hypnotic-potency output + dissociative fraction | `l2/pk/{combine,pd,pipeline,row}.ts`, `types-pk.ts` |
| 4 | ffc179b | ONE opioid-potency output, checked against both consumers | tests only |
| 5 | 50f168c | 7f depth reads both outputs (E-FU7-1) | `l2/neuro/{bus,depth,pipeline}.ts` |
| 6 | ba840c3, **fc434e0** | drive on the hypnotic equivalent; per-class surface; **D15b: propofol–opioid α 0** | `l2/neuro/{drive,pipeline}.ts` |
| 7 | bca2c57 | apnoea flag = the chemoreflex's committed zero rate | `l2/neuro/*`, `engine.ts` |
| 8 | 6abb95e | β-blockade as receptor occupancy, β1/β2 (E-FU7-3) | `l2/circ/profile.ts`, `l2/pk/*`, `engine.ts` |
| 9 | ac12412 | indirect sympathomimetics via 7e; catecholamine reserve; glucagon (E-FU7-2) | `l2/endo/*`, `l2/pk/*` |
| 10 | 9cebaf6 | stimulus surge: set-point reset + circulating release | `l2/endo/*`, `l2/circ/model.ts`, `engine.ts` |
| 11 | 33f0e29 | conversion hazards; pre-excited-AF hazard; two new rows | `l2/pk/{hooks,combine,row}.ts` |
| 12 | e41020c | state-dependent shock outcome (E-FU7-6) | `l3/defib-pacer/outcome.ts`, `l3/device-layer.ts` |
| 13 | 74bc02f | LAST additive by potency-weighted dose | `l2/pk/pipeline.ts` |
| 14 | 875b5d7 | one state each for Mg, Ca, receptor upregulation (E-FU7-1/4) | `l2/neuro/*`, `l2/blood/*` |
| 15 | 3e0bf94 | second-gas term; end-tidal desflurane trigger | `l2/pk/{pipeline,volatile}.ts` |
| 16 | 9a6dbf6 | histamine on vessels and airways; two histamine rows (E-FU7-3/5) | `l2/circ/*`, `l2/lung/conditions.ts`, `l2/resp/pipeline.ts` |
| 17 | 4d6ff5b | inotrope / vasodilator / tachyphylaxis re-fits; one new row | rows |
| 18 | 70419b8 | glucocorticoid → 7e; QTc → 7c; the TXA hook documented | `l2/pk/*`, `l2/endo/*`, `l2/blood/pipeline.ts` |
| 19 | 3e1e2ef, bd3d288 | matrix cells as engine tests (43 cases incl. DI-01c); console rows (E-FU7-8) | `test/engine/drug-layer{,-guards}.test.ts`, `test/helpers/fu7.ts`, `truth.ts`, `meta.ts` |
| 20 | 722d728 → this | evidence page + PNGs; glossary 324–338 (1b7c9d8); slow-e/f (cd26d5f); this note | `apps/demo/{fu7.html,src/fu7.ts,scripts/fu7-shots.mjs,e2e/fu7.e2e.ts}`, `apps/demo/src/app/glossary-data.ts`, `src/index.ts`, `vite.config.ts`, `ci.yml` |

**New engine test files** (one CI group each, §7):
- `drug-apnoea`, `cat-reserve-engine`, `stimulus-surge`;
- `fu7-nmb-one-state`, `fu7-volatile`;
- `drug-layer` and `drug-layer-guards` (case 7, split out by time at the gate).

**New unit files:**
- `test/l2/pk/`: `onset-chain`, `potency-outputs`, `beta-occupancy`, `antiarrhythmic`, `interactions-misc`;
- `test/l2/neuro/hypnotic-equivalent`, `test/l2/endo/cat-reserve`, `test/l3/shock-state`.

## §2 Acceptance (band per the case title; before = b004289 / `audit-before.md`, after = the gate tree)

| cell | quantity | band | before | after | verdict |
|---|---|---|---|---|---|
| DI-63 | anticholinergic HR peak (atropine / glyco) | 10–180 / 60–600 s | 30 / 30 s (step onset) | 120 / 130 s | PL |
| DI-71 | antagonist reversal (opioid drive halves) | 30–180 s | 5 s | 35 s | PL |
| DI-88 | benzodiazepine DI nadir | 120–420 s | 70 s | 188 s | PL |
| DI-69 | thiopental awake / etomidate duration | 240–900 / 150–600 s | never unconscious | 418 / 235 s | PL |
| DI-69 | thiopental LOC | 20–60 s | never | 10 s | it.fails |
| DI-69 | ketamine DI while out / emergence | > 60 / 10–20 min | — / 295 s | 98 / 12.9 min | PL |
| DI-69 | ketamine LOC | ≥ 30 s | 5 s | 16 s | it.fails (D20) |
| F5 | elderly LOC-dose ratio, midazolam / thiopental | 0.4–0.6 / 0.6–0.8 | — | 0.50 / 0.71 | PL |
| DI-01c | propofol + remifentanil MAP excess over the sum | < 0 (supra-additive) | −0.4 % (plan) | −3.5 % | PL (pre-declared `it.fails`, met) |
| DI-89 | flag while breathing | 0 s | 165 s | 0 s | PL |
| DI-71 | opioid-only apnoea on air | ≥ 60 s | 0 s | 0 s | it.fails |
| DI-03 | Bailey pair SpO₂ nadir | 70–89 % | 90 % | 46 % | it.fails (overshoot) |
| DI-04a | ephedrine ΔMAP / β-blocked ratio | 8–25 mmHg / 0.3–0.7 | 8.1 / 1.11 | 12.5 / 0.99 | PL / it.fails |
| DI-83 | dobutamine β-blocked / healthy CO rise | ≤ 0.8 | 0.56 | 0.39 | PL |
| DI-05 | excess pressor (non-selective) / reflex bradycardia | > 0 / < 0 | 3.2 % / +1 | 3.5 % / +1 | PL / it.fails |
| T9 | ketamine rise depleted ÷ replete | ≤ 0.5 | 1.0 | 0.14 | PL |
| T10 | laryngoscopy after propofol ΔMAP / ΔHR | 20–30 / 12–30 | 10.7 / 7.4 | 24.8 / 16.0 | PL |
| T10 | awake laryngoscopy ΔMAP / ΔHR | 20–40 / 12–30 | 15.8 / — | 39.8 / 13.7 | PL |
| T10 | fentanyl 3 µg/kg ratio / lidocaine 1.5 mg/kg ratio | 0.2–0.7 / 0.4–0.9 | 0.10 / 1.00 | 0.25 / 0.84 | PL |
| T10 | labetalol ratio; esmolol HR / MAP ratios | 0.2–0.8; ≤ 0.5 / ≤ 0.9 | 0.96; — | 0.96; 0.56 / 1.00 | it.fails (D22) |
| T10 | 1c incision, no opioid; 1b HTN ÷ healthy | 20–30; ≥ 1.3 | 7.7; 1.19 | 19.3; 1.19 | it.fails |
| DI-61 | VT conversion, 200 seeds × 40 min (amio / lido) | 20–35 % (either) | 0 | 20.5 / 11.5 % | PL |
| DI-13a | ROSC share with amiodarone, two shocks | ≥ 1.2× | 1.0× | 1.11× | it.fails |
| DI-23 | LAST excess, engine | > 0.02 | 0 | 0.014 | it.fails |
| DI-19 | second gas FA/FI at 5 min | +0.03–0.15 | 0 | +0.021 (7g) / +0.014 (engine) | it.fails |
| DI-70 | desflurane step ΔHR | +8–35 | +1 | +1.1 | it.fails |
| DI-25 | Mg profile prolongation; calcium shortens | +20–90 %; < 0 | 0 | +39.7 %; −0.3 min | PL |
| DI-90 | Mg load prolongation | +20–90 % | +0.5 % | +12.0 % | it.fails |
| DI-37c | denervation ΔK | 3–7 | 0.47 | 6.47 | PL |
| DI-51 | volatile prolongs rocuronium (engine) | 25–80 % | 132.4 % | 49.7 % | PL |
| DI-42 | morphine SVR / HR / MAP | −10–20 % / +3–25 / −8–25 % | −8.5 % / — / −3.4 % | −10.2 % / +20.6 / −5.6 % | PL / PL / it.fails |
| T16 | atracurium in bronchospasm ΔPpeak; relief | ≥ +3 | 0 | +6.4; 20.8 | PL |
| F12 | atracurium TOF guard | count 4, ratio ±0.02 | — | 4 / 1.000 | PL |
| DI-45 | sugammadex ΔHR engine; 7g low-dose fall | −5 to −30; < 5 % | 0; — | −11; 13.4 % | PL; it.fails |
| DI-76 | glucocorticoid glucose (engine 30 min / 7g+7e 60 min) | +10–60 mg/dL | 0 | +11.2 / +17.7 | PL |
| ET-19 | diabetic > non-diabetic; diabetic peak | direction; +2–4 mmol/L | 0 / 0 | 1.83 > 1.02; 1.83 | PL; it.fails |
| T18 | QTc add; TXA quiet | +10–20 ms; Δ 0 | 0 | +15.0; 0 | PL |
| DI-11 | milrinone PVR / CO | sourced re-fit | −18.8 / +9.2 | −25.7 / +10.1 | PL |
| T17 | vasodilator SVR; HFrEF SV; α2B early rise; esmolol direct HR | see titles | — | −29.9999 %; +1.2 %; ×0.994; −6.5 % | it.fails ×4 |
| guards | DI-14a, 54, 24, 26, 85, 86, 68, 87, 77, 50, 53 | as before | PL | PL (§5) | PL |
| guards | DI-67 TCI overshoot; DI-65 EtCO₂ 10 min | 2.99–3.01; 52–70 | 3.1 TS; 42.2 TW | 3.132; 42.2 | it.fails (pre-existing) |
| DI-15 | AV-nodal blocker in pre-excited AF | VF or faster rate | NE | no change (232 vs 232) | it.fails (declared) |
| FU-6 R3(a) | induction apnoea: fentanyl 2 + propofol / remifentanil pair | 60–240 s / ≥ 90 s | 110 / 190 s | **120 / 190 s** (8454221: 394 / 567, red) | PL (D15b) |
| 7g long run | 6 h propofol TCI Ce | 2.5 ± 0.005 | 2.5 | 2.5097 (= main with FU-9, to 4 decimals) | FU-9's `it.fails` stands |

## §3 Audit before / after (`pnpm run audit:drugs all`)

**Inputs:**
- `docs/gates/fu-7/audit-before.md`: Task 1's run on b004289, the 30 owned cells.
- `audit-after.md`: all 105 cells on the gate tree, AUDIT_WALL.
- The ledger: `ledger-after.md`.

AUDIT_SECTION

**Task 4 Step 2 — the opioid-potency table.** Each agent at its brain-Ce peak (ventilated rig, seed 7, gate tree):

| agent, dose | `agents[id].brain` | `.vent` | `opioidCeRemiEq` | `opioidCeFentEq` | `opioidVentFentEq` | 7f `readBus().vent.opioid` | ÷ (`opioidVentFentEq` × 0.55) |
|---|---|---|---|---|---|---|---|
| fentanyl 2 µg/kg | 2.709 | 2.709 | 4.335 | 2.709 | 2.709 | 1.490 | 1.000 |
| remifentanil 1 µg/kg | 4.051 | 4.942 | 4.051 | 5.063 | 8.985 | 4.942 | 1.000 |
| sufentanil 0.2 µg/kg | 0.347 | 0.347 | 4.166 | 5.208 | 3.156 | 1.736 | 1.000 |
| morphine 0.1 mg/kg | 1.000 (gamma effect) | — | 1.500 | 1.875 | 1.455 | 0.800 | 1.000 |

7f's ventilatory input equals `opioidVentFentEq × 0.55` for every row; the D16 shape holds. For fentanyl alone,
`opioidCeFentEq` equals its own brain Ce. The rows whose ventilatory weight differs from their EEG weight are
sufentanil and morphine (`ventRemiEq` 5 / 0.8 against 12 / 1.5). The cloud draft's "ratios 2.40 and 1.875" were those
EEG-to-ventilatory ratios, not a disagreement between 7f and 7g.

## §4 `it.fails` list

The repo had 91 `it.fails(` at the base and has 128 now. FU-7 touched 38: 36 new, 1 converted from `it`, and 1
pre-existing one retitled. The measured number is in every title, and none was widened (R45). The table gives each
gate-tree number; "plan" marks the ones the plan's "Expected `it.fails`" table pre-declared.

**engine/drug-apnoea**

| # | test | measured |
|---|---|---|
| 1 | fentanyl 5 µg/kg on air stops breathing ≥ 60 s (DI-71) — plan | 0 s (VE nadir 2.27 L/min, SpO₂ 86) |
| 2 | naloxone restores breathing | no apnoea to reverse (+1 s) |
| 3 | Bailey pair SpO₂ nadir 70–89 %, seed 7 (DI-03) | 46 % (fentanyl 94, midazolam 95) |
| 4 | Bailey population ≥ 4 / 20 apnoeic | 0 / 20 |
| 5 | ventilated: the flag clears once effort returns | the committed rate stays 0 for 1200 s |

**engine/drug-layer**

| # | test | measured |
|---|---|---|
| 6 | morphine MAP −8–25 % (DI-42) | −5.6 % |
| 7 | nitroprusside in HFrEF: SV ≥ +8 % (7a C9) | +1.2 % (MAP −12.8 %) |
| 8 | thiopental LOC 20–60 s | +10 s |
| 9 | ketamine LOC ≥ 30 s (D20) — plan | 16 s |
| 10 | ephedrine β-blocked ratio 0.3–0.7 (Q1) — plan | 0.99 |
| 11 | reflex bradycardia under non-selective blockade — plan | HR never below control (+1) |
| 12 | amiodarone shock success ≥ 1.2× (DI-13a) | ×1.11 (occupancy 0.38) |
| 13 | LAST excess > 0.02 (DI-23) | +0.014 |
| 14 | second gas ≥ +0.03 (engine) | +0.014 |
| 15 | Mg load prolongation 20–90 % (DI-90) | +12.0 % |

**engine/drug-layer-guards**

| # | test | measured |
|---|---|---|
| 16 | MH EtCO₂ 52–70 at 10 min (DI-65) | 42.2; pre-existing, identical on b004289 |
| 17 | TCI Ce peak 2.99–3.01 (DI-67) | 3.132; pre-existing, 3.1 on b004289 |
| 18 | verapamil in pre-excited AF (DI-15) | no change (232 vs 232; AV occupancy 0.35) |

**Other engine files**

| # | test | measured |
|---|---|---|
| 19 | engine/fu7-volatile: desflurane step ΔHR 8–35 (DI-70) | +1.1 |
| 20 | stimulus-surge: 1b HTN ÷ healthy ≥ 1.3 | 1.19 |
| 21 | stimulus-surge: 1c incision, no opioid, 20–30 — plan | +19.3 |
| 22 | stimulus-surge: labetalol ratio 0.2–0.8 — plan | 0.96 |
| 23 | stimulus-surge: esmolol HR ≤ 0.5, MAP ≤ 0.9 — plan | HR 0.56, MAP 1.00 (8454221: 0.58 / 0.98) |

**Unit files**

| # | test | measured |
|---|---|---|
| 24 | l2/endo/cat-reserve: 30 min depletion < 0.45 | 0.485 (0.367 at 60 min) |
| 25 | l2/neuro/interactions: rig rocuronium +20–45 % (E-FU7-10 a) — plan | +13.4 % (engine DI-51 +49.7 %, PL) |
| 26 | l2/pk/antiarrhythmic: sub-therapeutic lidocaine never converts | 3 / 200 (the hazard is occupancy-scaled) |
| 27 | l2/pk/interactions-misc: sugammadex low dose < 5 % | 13.4 % |
| 28 | l2/pk/interactions-misc: second gas +0.03 to +0.15 | +0.021 |
| 29 | l2/pk/interactions-misc: N₂O concentration effect — plan | not modelled |
| 30 | l2/pk/interactions-misc: desflurane trigger within 60 s | never (end-tidal 60 s rise 0.16 < 0.3) |
| 31 | l2/pk/interactions-misc: morphine histamine ≥ 0.4 | 0.32 |
| 32 | l2/pk/interactions-misc: dexmedetomidine α2B early rise | SVR ×0.994 |
| 33 | l2/pk/interactions-misc: nitroprusside SVR 30–50 % | −29.9999 % (the band edge) |
| 34 | l2/pk/interactions-misc: esmolol direct HR −10–20 % | −6.5 % |
| 35 | l2/pk/interactions-misc: diabetic dexamethasone peak +2–4 mmol/L — plan | +1.83 |
| 36 | engine/pk-acceptance-pd: ephedrine ×3 direct SVR tachyphylaxis | 0.040 / 0.010 / 0.005 |
| 37 | engine/pk-acceptance-pd: dobutamine CO +20–40 % — pre-existing, plan, retitled | +13.6 % |
| 38 | **l2/neuro/depth-drive: 7f "synergy", propofol 1 + remifentanil 1 (D15b)** | totalDep 0.735 = independent 0.735 |

**Notes on the list**

- **#36.** The pressor moved to `sympDrive` in Task 9. A companion `it` asserts the same tachyphylaxis on `sympDrive`
  (0.800 / 0.204 / 0.092). The suite was red on this case from ac12412 to 4d6ff5b.
- **#38** is the finisher's, made under the D15b ruling. It was met at the old `SYNERGY` 0.5 and at α 0.3.
- **Met although pre-declared as `it.fails`:**
  - DI-01c (excess −3.5 %), now an `it`;
  - the late dexmedetomidine SVR fall (×0.963), an `it`.

## §5 Deviations, decisions and findings

**D15b — the propofol–opioid ventilatory α (orchestrator ruling at the FU-7 gate).** On 8454221, FU-6's sourced
`resp-induction` band failed:
- fentanyl 2 µg/kg + propofol: 394 s against 60–240 s (110 s before FU-7);
- the remifentanil pair: 567 s (190 s before FU-7).

The cause, bisected, is Task 6 (ba840c3): the per-class surface's α 0.3 stacked on FU-6's wakefulness-drive calibration.
The ruling keeps FU-6's band, scans α ∈ {0, 0.1, 0.2, 0.3}, and takes the largest α that keeps fentanyl at least 20 s
inside its band and remifentanil in 90–300 s.

| `VENT_ALPHA_HYP` | fentanyl + propofol | remifentanil + propofol | propofol alone |
|---|---|---|---|
| 0.3 | 394 s | 567 s | 38 s |
| 0.2 | 316 s | 504 s | 38 s |
| 0.1 | 232 s (no margin) | 364 s (> 300) | 38 s |
| **0** | **120 s** | **190 s** | **38 s** |

The scan ran on the merged tree, seed 7, with the resp-induction rig.

**Result: α = 0 (additive).**
- `VENT_ALPHA_BENZO` 1.5 is untouched.
- Single agents are bit-identical (propofol alone 38 s in every row).
- The same constant also scales the volatile–opioid term (one α for "the other non-benzodiazepine hypnotics and the
  volatiles", D15); that term is now additive too.

**Task 6/7 cells re-measured at α 0:**
- DI-01c: excess −3.5 %, PL, unchanged.
- DI-01d `apnoeaS_both`: AUDIT_01D.
- Bailey pair: 46 %, unchanged; it rides on the benzodiazepine α.
- Fentanyl 5 µg/kg: 0 s, unchanged.

**Knock-on:** 7f's tables §5d "synergy" unit band becomes `it.fails` #38. **Q21** puts the propofol–opioid synergy size
to Ali.

**The 6 h `pk-longrun` propofol line.**
- **Bisect:** on a 1 h rig of the same TCI (seed 4), b004289 through 50f168c read Ce 2.4998, while ba840c3 (Task 6)
  reads 2.5019. The cause is the same α, acting through the ventilated drive and FU-4's flow-dependent PK.
- **After D15b:** the 1 h rig reads 2.4998 / Cp 2.3202, identical to b004289. The cause was an unintended side effect,
  and it is fixed.
- **Which form survives:** FU-9's declared `it.fails` ("measured 2.5098 with FU-9"). On the gate tree the 6 h Ce is
  **2.5097**, the same to four decimals as `origin/main` with FU-9 alone, so FU-7 adds nothing to it. FU-7 adds no
  `it.fails` of its own here.

**The plan's named deviations:**
- ketamine LOC 16 s (D20; emergence met);
- ephedrine β-blocked ratio 0.99 (Q1);
- the reflex-bradycardia item (Task 8 Step 6, below; reported to FU-4, no `baroreflex.ts` edit);
- labetalol / esmolol surge bounds (D22);
- DI-72's 5 s consciousness recovery (a rig artefact);
- `uHyp` antagonist-corrected: a behaviour change for 7d under flumazenil (review F8);
- the dexmedetomidine half-model (Task 17);
- **"atracurium and mivacurium: histamine release only — NO neuromuscular block in v1"**.

**Task 8 Step 6 — the vagal limb and Q1 (gate tree).**

Adrenaline 100 µg in the β-blocked profile (MAP / HR / `baro.ev`):

| time | MAP | HR | `baro.ev` |
|---|---|---|---|
| t0 | 93.8 | 61 | −0.65 |
| +15 s | 115.2 | 63 | −23.2 |
| +30 s | 122.4 | 64 | −30.2 |
| +60 s | 123.7 | 66 | −31.8 |
| +120 s | 123.2 | 66 | −31.0 |

- The baroreflex's vagal error saturates at about −30 within 30 s.
- `baro.es` follows it, reaching −30.6.
- HR never falls below baseline. The reflex bradycardia the source describes (#11) needs the vagal limb's caps in
  `baroreflex.ts` (`SYMP_WITHDRAW_HR`, `VAGAL_WITHDRAW_MS`), which is FU-4's file; reported, not edited.

Ephedrine 10 mg, healthy vs β-blocked (Q1):

| | ΔMAP | ΔCO | ΔHR | ΔSVR |
|---|---|---|---|---|
| healthy | +12.5 mmHg | +0.96 L/min | +5.0 | +10.7 % |
| β-blocked | +11.9 mmHg | +0.98 L/min | +1.0 | +12.5 % |

- The CO rise survives β-blockade because occupancy removes the HR share only.
- The α-mediated SVR rise is slightly larger.
- So the missing ×0.5 lives in the CO-to-MAP coupling (venous return to inotropy), not in the vascular limb (Q1).

**Task 12 Step 7a — ROSC end to end and the DV cells (gate tree; research/20 runner, read-only).**

| cell / arm | item | band | after | DV baseline (3feee6f) |
|---|---|---|---|---|
| DV-01a | term150Pct, term200Pct | 85–99 | 95, 95 (exact 90) | 65, 65 |
| DV-01a | drawn ROSC at 150 J | ≈ 10 | 7.5 | 7.5 |
| DV-01b | `peaArrestDeclared` / `peaRegains` / `nPea` / `peaCppMean` | true / true | true / true / 12 / 67.4 | false |
| DV-01c | sustEarly / sustLate / sustLateCpr (guard) | true / false / true | true / false / true | same |
| end to end | effective ROSC: early / lateNoCpr / lateCpr / hk | lateCpr > lateNoCpr; hk ≤ 5 | E2E_ROW | drawn 10 / 5 / 5 by the table |
| DV-24a | diff (37 °C − 28.5 °C) | > 20 | 55 (87.5 vs 32.5) | 0 |
| DV-24b | gain (33 °C − 28.5 °C) | > 20 | 55 | 0 |
| DV-25a | forcedSinusHolds (guard) | false | false (refibrillates at +25 s) | false |
| DV-25a | roscHkPct (drawn) | ≤ 5 | 2.5 | 7.5 |
| DV-06a | conv200Pct; energyDependence | 75–95; > 30 | 87.5; 75 (120 J 75, 20 J 12.5) | 85; 0 |
| DV-06b | conv50Pct | 85–100 | 95 | 85 |
| DV-06c | convPct | ≥ 85 | 95 | 85 |

- **Runner limits, re-graded by hand.**
  - The runner's `exact…` items and DV-01c's `cprRaisesProbability` call `outcomeProbabilities` with no state fields
    and no `rhythmId`. So DV-06b/c `exactPct` read 80, the flat fallback, by construction, and `cprRaisesProbability`
    reads false by construction.
  - From the seeded arms, the end-to-end rows and the `shock-state` unit tests: conversion is 95 % and CPR raises ROSC
    in the circulatory phase (lateCpr above lateNoCpr). Both are PL.
- **Stale hand notes.** DV-01b/24a/24b/25a grade PL automatically, but their stale `hand` notes still say WR.
- **Double counting.** lateNoCpr's effective ROSC is 0 with or without the CoPP penalty, because DV-01c's `sustLate`
  is false. The hk arm refibrillates through the K⁺ hazard. Both penalties are kept, and neither is re-fitted against
  the drawn share alone.
- **VF_TABLE re-sourcing** (biphasic first-shock termination 70 → 90 %, ROSC kept at 10 %; Schneider 2000, van Alem
  2003) is flagged for Ali as research/20 §8 Q2 (Q14).
- **The 33 °C Boddicker factor is omitted.** Only the < 30 °C direction is sourced.
- **DV-01a** is graded from the seeded arm: 95 % termination.

**Task 10 Step 6 — runner cells.**

- **CM-03c** (gate tree):
  - `dMapU` 29.8 / `dMapA` 24.6 / `ratio` 1.21;
  - before, on main 66e3052: 10.8 / 9.1 / 1.19 (TW);
  - `dMapA` is PL;
  - `ratio` stays TW, and the owner is C1 / FU-8 Part B.
- **ET-16a** (gate tree):
  - `dMapF0` 19.09 / `dMapF2` 6.36 / `dMapF5` −7.34;
  - `epiRatioF0` 2.56, `epiBluntF5` 0.97;
  - before: 7.69 / 2.14 / −9.36 / 2.57 / 0.96;
  - `cort4hF2` 1500.8 (plan 1501) and `dGlu2hF2` 1.28 (plan 1.28) are inside ±2 %;
  - the 1c engine test's fentanyl-5 arm uses the no-fentanyl control, which is ET-16a's own `dMapF5` convention.
- **Ruling 1's stop condition:** DI-04a / 57 / 21 / 80 are AUDIT_T9 in the after audit.

**Task 17 Steps 1a and 5a — the CM cells (gate tree).**

- **CM-06d** `coPct`: **34.9** (merged-main before: 34.9; inside 20–45). Dobutamine was not refitted, and the guard
  holds. FU-4 supplied the venous-return response that the old note blamed on NR-7g-2.
- **CM-06e** hydralazine:
  - `svPctHF` +0.1 %, `mapPctHF` −5.6 %, `svrPctHF` −15.2 %;
  - nitroprusside on the same failing ventricle (engine `it.fails` #7): SV +1.2 %, MAP −12.8 %;
  - the plan's amendment measured hydralazine at +3.5 %;
  - neither dilator raises SV ≥ 8 %, and 7a's afterload sensitivity (research/19 C9) owns the gap.
- **CM-04d** esmolol 1 mg/kg, severe CAD: HR −15 (before −12), PL; supply/demand +0.2.
- **CM-14c**, severe MS: LAP −9.1 (before −12.7), PL by sign.
- **CM-15b**, AF 150:
  - TW → **WR**: `hrDrop` −14.9 (band −45 to −15, 0.1 short); `mapGain` −0.6 (expected sign +);
  - FU-8 Part A is on the tree (CM-15c PASS), so the cell is graded rather than BLOCKED;
  - reported, not fitted. The MAP direction in rate-controlled AF is 7a's filling-time response.

**Task 18 Step 5 — CM-09c guard.** PL on the gate tree: diabetic peak 11.1 vs healthy 7.6 mmol/L. That equals its
before value, so the glucocorticoid term leaves an unsteroided stress response alone. ET-19 +1.83 (non-diabetic +1.02);
7e's glucose model (CM-09c) owns the remainder (Q16).

**Task 2 (RH amendment) — limits and cells.**

Two limits:
- A gamma infusion's steady state does not rise as 1/f: `infC` ignores clearance. This is a v1 limit, put in the
  calibration queue.
- CKD's ×0.3 reaches the renal rows through `PkCtx.renal` once a `ckd` profile sets it. That profile is FU-8 Part B's;
  today's `aki` proxy keeps `gfrRel` at 0.61.

Cells on the gate tree:

| cell | after | before | band / note |
|---|---|---|---|
| RH-12d | ×1.17 | ×1.00 | band ×1.3–2.5; MI; Q15 |
| RH-12e | ×1.00 | — | PL |
| RH-15a | ×1.73 | — | PL |
| RH-15b | ×1.40 at 30 min (×1.50 at 10 min) | ×1.19 | the Step 2d acceptance |
| RH-10a | ×1.24 | — | plan ×1.14; not moved by Task 2 |
| RH-07a | onset / peak 90 s / 8.5 min | 30 s / 2.5 min | the label is met; 7d H1 (FU-9) owns the remainder |

**The seams named as notes:**
- **CM-12a:** the opioid ventilatory potency is ONE named output (`ventRemiEq` per row, summed once in `combine.ts`),
  which an `osa` profile factor can scale later; no `osa` profile exists today. Follow-up: profile.
- **CM-11a:** "the reactivity gain has no owner; the seam accepts one" (`conditions.ts` takes the histamine constrictor
  as a plain scalable input). Follow-up: FU-8 / profile.

**Volatile bronchodilation (D23).** No EC50 meets both bands, so the rows stay at 0.5 (Q12). FU-6's own case stays
green at 0.5. Resistance fall at 1 MAC, and FU-6's Ppeak fall at 0.88 MAC:

| EC50 | resistance (band −20 to −40 %) | Ppeak (FU-6 co-constraint ≥ −30 %) |
|---|---|---|
| 0.5 | −62.8 % | −43.6 % |
| 1.0 | −47.7 % | −33.4 % |
| 1.2 | −43.4 % | −30.2 % |
| 1.4 | −39.8 % | −28.1 % |

**[ENG] probabilities (Tasks 11–12):**
- the pre-excited-AF VF probability, 0.2 per event;
- the five shock-state factors;
- the temperature factor;
- the 240 s circulatory-phase gate;
- the cardioversion E50s;
- `L_AMIO_VT` = −ln 0.62 / 2400, from PROCAMIO quoted from its abstract (38 % with amiodarone).

**Executor findings:**
- **DI-03 overshoot.** On FU-6's drive the Bailey pair overshoots: SpO₂ 46 % against 70–89 %. `VENT_ALPHA_BENZO` was
  not revisited (D15).
- **Task 9 regression, found late.** It broke the slow `pk-acceptance-pd` ephedrine precondition. It was found at
  Task 17 and handled under R45 (#36).
- **DI-65 dantrolene drift.**
  - EtCO₂ fall: −6.2 → −5.2, against the −5 band edge.
  - HR fall: −67 → −61.
- **DI-54.** Magnesium converts torsades at +110 s and asystole follows 20 s later. b004289 behaves the same way (165 s of pulseless torsades first), so
  this is not FU-7's.
- **Guard premise wrong for two cells.** DI-67 and DI-65 were not PL before FU-7, although the plan's guard list assumed
  they were (#16, #17).
- **DI-15's first test was hollow.** It is now written against a control arm.
- **Rig conventions in Task 19:**
  - DI-05's non-selective arm sets `prof.betaNonSel` in the test, because no command exists;
  - the DI-61 share is 200 seeded hazard runs on the engine's live PK state;
  - the shock arm captures each shock's context on its way into the real draw.
- **Task 11 case 5** sets `avNodeBlock` 0.8 directly, where the plan had adenosine given.

**Other-repo work not modelled:**
- research/13 RH-12d: ×1.17 against ×1.3–2.5 (Q15);
- RH-07a: 90 s / 8.5 min (the label is met; owner 7d H1).

**AF rigs.** Task 0 Step 6b PASSED on the base and again on the gate tree:
- `kIschMin40` 0.90, `kIschMean40` 0.95, `kIschMin70` 0.90;
- `negCppSamples40` 22;
- no arrest in either arm.

So every AF arm ran at its natural length.

## §6 Calibration queue (R44, Ali)

**Task 20 Step 6's list:**
- ephedrine's β-blocked ratio (0.99 against 0.3–0.7, Q1);
- the unopposed-α reflex bradycardia;
- ketamine's LOC (16 s; D20);
- the catecholamine reserve's τ and floor;
- the five shock-state factors of Task 12;
- the conversion hazards' trial-to-hazard mapping;
- atracurium/mivacurium PK, and whether they get a block (Q11);
- the histamine sizes (`HIST_SVR`, `HIST_V0`, `HIST_SPASM`);
- the pre-excited-AF VF probability;
- the surge's `SURGE_SET_PER_NOX` 0.25 / `SURGE_SET_MAX` 0.25 / `SURGE_NE_GAIN` 0.6 (D22);
- `antinocAdd` (lidocaine 0.35 at 3 µg/mL);
- the `hypC50` of thiopental/etomidate (0.55) and of ketamine (0.8);
- midazolam's `hypC50AgeK` 0.008;
- sufentanil/morphine `ventRemiEq` 5 / 0.8;
- `VENT_ALPHA_BENZO` 1.5 / **`VENT_ALPHA_HYP` 0 (D15b; was 0.3)**;
- etomidate `ventShare` 0.7;
- the volatile bronchodilation EC50 (D23).

**Additions:**
- DI-13a's occupancy at the ALS shock;
- the DI-90 Mg-load kinetics;
- DI-23's Hill steepness;
- the gamma-infusion steady state (Task 2 limit).

## §7 CI

**Local gate runs (Mac, 8 cores; the slow groups ran two or three at a time beside the audit, so wall times are
inflated).**

| run | tree | result | wall |
|---|---|---|---|
| typecheck (`-r`) | gate tree | clean | |
| fast | gate tree | FAST_ROW | |
| slow-a … slow-f | gate tree | SLOW_ROWS | |
| non-engine packages, run in each package | before the FU-9 merge | audio 58, skins 184, renderer 89, controller 224, ventilator 97, validation 107 (+11 skipped), demo 199 | |
| non-engine packages, `-r test` | gate tree | RTEST_ROW | |
| build | gate tree | BUILD_ROW | |
| browser tests (`CI=1 pnpm test:e2e`, Chromium + WebKit) | gate tree | E2E_ROW2 | |
| `stage9-glossary.e2e.ts` | after the first merge | Chromium ✓, WebKit ✓ | |
| tick bench | gate tree | TICK_ROW | |

**Slow groups (finisher, cd26d5f).** FU-9's four groups each run about 36–37 min on CI. FU-7's seven slow files
measured 1,578 s on the local slow-a run:

| file | local |
|---|---|
| drug-layer, before its split | 1,018 s |
| drug-apnoea | 331 s |
| stimulus-surge | 144 s |
| fu7-nmb-one-state | 59 s |
| cat-reserve-engine | 14 s |
| fu7-volatile | 12 s |

- **Estimate:** the CI/local ratio of FU-6's files is about 2.7, which puts FU-7 at ≈ 4,250 s on the runner. The four
  groups leave ≈ 800 s of room under 40 min.
- **Two new groups** (estimated ≈ 35 min each):
  - **slow-e:** `drug-layer-guards`, split out of `drug-layer` by time (case 7, ≈ 560 s local), plus `stimulus-surge`,
    `fu7-nmb-one-state`, `cat-reserve-engine` and `fu7-volatile`;
  - **slow-f:** `drug-layer` and `drug-apnoea`.
- **Config:** `ci.yml`'s matrix and its printed disjointness check cover all six groups. Run locally, the check gives
  107 files, disjoint and covering: a 28, b 38, c 15, d 19, e 5, f 2.
- **CI per-group times on PR #32:** CI_ROW.

**PNG sizes (bytes):** PNG_ROWS

## §8 Re-anchorings (Task 0 Step 3; none at Task 20 Step 1)

Each block was placed on the landed text with the same change:

| ref | task | where | what was done |
|---|---|---|---|
| R1 | 6 S2 | `neuroResp` call | FU-6's `hypnotic` / `stress` kept |
| R1b | 6 S1b | FU-6's `hvrDep` line | `dMid` removed; the hypnotic factor reads `hypC`; FU-6's NMB arm `(1 − hvrNmb)` kept |
| R2 | 7 S3 | `spontRr` | added after `wasApnoeic` |
| R3 | 9 | hormones initialiser | `catReserve` appended after FU-4's `hum` |
| R4 | 10 | hormones initialiser | `surge: 0` |
| R5 | 10 | `surgeF` field | after `humDV0Frac` |
| R6 | 10 | `surgeF` return line | after `humDV0Frac` |
| R7 | 10 | effects imports | after `HUM_SVR, HUM_V0` |
| R8 | 10 | adapters, MODELED | `ext.surgeF` |
| R9 | 10 | adapters, MANUAL | `ext.surgeF = 1` |
| R10 | 10 | adapters input | `antinocOp`, `mapSetMmHg` kept |
| R11 | 10 | `stepBaro` | only the `setF` factor; FU-4's `muscBlock` vagal term kept |
| R12 | 10 | `adapters.test` key list | `surgeF` added |
| R13 | 11 | signature | built on 18f's, `pulseless?` added |
| R14 | 11 | hook state | `conv?` / `preexcited?` after `sux` |
| R15 | 11 | engine | `pulseless7g` on 18f's call; the import block skipped (18f already imports it) |
| R16 | 14 | `interactions.test` import | my own `runTo` edit |

- **The finisher's audit.** The 13 stale Task 9/10 anchors are R3–R12. The 21 unresolved pairs are those, Task 6 ×1
  (R1b), Task 11 ×4 (R13–R15) and Task 1 ×3 (resolved by the copy). Each keeps the plan block's meaning
  (`completeness.md`).
- **Insert-only steps (no find block), each ticked by grep:**
  - Task 1's scripts;
  - the new rows: glucagon, procainamide, verapamil, nitroprusside, atracurium, mivacurium;
  - the new test files listed in §1.
- **FU-8 Part A (PR #27, 1496c30)** carries the CM-15c fast-AF fix and the V1 arrest state. Both were verified on the
  base and on the gate tree.
- **Task 0 Step 5's records** are in `baseline.md`: the exact `stepBaro(` line and 18f's `rhythmRequest` signature.
- **Block-applier defects**, each fixed and audited across every pair:
  - a false "already applied" skip of one import;
  - one duplicated import;
  - one duplicated `package.json` line.

## §9 Exceptions (E-FU7-1 … 10, approved by Orchestrator ruling (FU-7 review) 6)

| exception | files used |
|---|---|
| E-FU7-1 | `l2/neuro/{bus,depth,drive,interactions,pipeline}.ts` |
| E-FU7-2 | `l2/endo/{adapters,core,effects,hormones,params}.ts` |
| E-FU7-3 | `l2/circ/{model,params,profile}.ts` |
| E-FU7-4 | `l2/blood/{core,pipeline}.ts`, plus `treatments.ts` |
| E-FU7-5 | `l2/resp/pipeline.ts`, `l2/lung/conditions.ts` |
| E-FU7-6 | `l3/defib-pacer/outcome.ts`, `l3/device-layer.ts` |
| E-FU7-7 | `engine.ts`: one-line additions in Tasks 7, 8, 10, 11, 12, 14, 16 and 18 |
| E-FU7-8 | `truth.ts` (two `SKIP_PATH` entries), `apps/demo/.../meta.ts` (six rows) |
| E-FU7-9 | `test/helpers/neuro-bus.ts`, `depth-drive.test.ts` |
| E-FU7-10 | (a)–(c) as written |

**Edits outside the declared file lists:**
- **`treatments.ts` (E-FU7-4):** Task 14's own block adds a comment there, but the exception's file list omits the
  file.
- **`src/index.ts`:** gains two export lines for the evidence page. Task 20's file map lists the page, not the index.
- **The gate's merge work:**
  - `apps/demo/src/app/glossary-data.ts`: entries 324–338 and six drug names;
  - `.github/workflows/ci.yml`: groups slow-e/f;
  - `test/engine/drug-layer-guards.test.ts`: case 7, moved out of `drug-layer` without a text change.

  Stage 9 and FU-9 landed after the plan was written, and the brief asked for these.

**Declared but unused:** none.

**Truth leaves.**
- **The 12-drug future tree:** 2,077 of the 2,100-leaf cap on the gate tree (main 2,075). It stays under the cap, so
  `SKIP_PATH` was not extended.
- **Labelled:** every new physiological truth leaf FU-7 adds has a Stage 9 glossary label (entries 324–338).
  `stage9-glossary.e2e.ts` passes on Chromium and WebKit.
- **Left as model internals:**
  - 7f's input cache `neuro.last.*`;
  - `blood.mgSeen`, a copy of the profile Mg;
  - `pkHooks.conv.lastT`, a clock.

## §10 Open questions

The plan's Q1–Q17 stand as written, each with the number measured here:
- Q1: 0.99. ΔCO survives β-blockade; §5.
- Q3: +24.8 / +39.8.
- Q12: the EC50 table in §5.
- Q14: DV-01a 95 %; VF_TABLE re-sourced.
- Q15: ×1.17.
- Q16: +1.83.
- Q17: +19.3.

New questions:
- **Q18 — the amiodarone shock benefit.** Is the benefit meant at the ALS shock 2 min after the bolus, when occupancy
  is 0.38? It reaches ×1.2 only at full occupancy.
- **Q19 — the AV-nodal hazard and a standard dose.** Should a standard verapamil dose reach the hook? Occupancy is 0.35
  against the hook's 0.5.
- **Q20 — the TCI overshoot (DI-67).** Pre-existing; for 7g's controller.
- **Q21 — the propofol–opioid ventilatory synergy (D15b).** FU-6's induction bands allow α 0 only, so the pair is now
  additive for breathing, and 7f's tables §5d synergy band is an `it.fails`. Should FU-6's wakefulness calibration be
  revisited so that a "mildly synergistic" α (0.1–0.3, Nieuwenhuijs 2003) and the induction bands can hold together?
- **Q22 — CI capacity.** Two more slow groups (slow-e/f) carry FU-7. Should the very long guards (the DI-85/86/68 CSHT
  arms, 282 s locally) become a nightly job instead?

**Not in scope** (each needs a new profile field or state; listed so they are not lost):
- DI-06 ACEi/ARB, DI-16 transplant, DI-20 N₂O gas spaces;
- DI-30 opioid tolerance, DI-35 HOCM, DI-38 active metabolites, DI-43 OSA;
- **morphine's M6G in CKD 4–5** (beside DI-38). 7g has no parent → metabolite source term.

Each of these is marked "confirm with Ali".
