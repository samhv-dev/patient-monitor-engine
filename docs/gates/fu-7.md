# Gate note — FU-7: drug-layer integration

Branch `fu-7-drug-layer`, plan `docs/plans/fu-7-drug-layer.md`, rules `docs/review-inputs/rulings-excerpt-fu7.md`.

- **Base:** `origin/main` 176f702 (FU-6, PR #28), merged in as b004289. That tree is the "before" for every number
  here (`docs/gates/fu-7/baseline.md`).
- **Gate merge:** `origin/main` b2a0292 merged as 8981912. The five commits since 176f702 touch only
  `docs/RESUME.md`, so no plan file moved.
- **Executor:** one cloud session, Tasks 0–20, test-first. Each task was committed and pushed on its own.
- **Where the detail lives:** each case title carries its band and source; this note lists the numbers.

## §1 What changed, task by task

| task | commit | change | main files (engine-core `src/`) |
|---|---|---|---|
| 0 | b1d1854 | base check; CM-15c and DV-01b preconditions **PASS** | `docs/gates/fu-7/baseline.md` |
| 1 | c435b9d | `pnpm run audit:drugs` (research/14 harness; `$PME_AUDIT_OUT`) | `scripts/audit-drugs/*` |
| 2 | 57f1555 | zero-slope onset chain (addendum 19); organ-function decline | `l2/pk/{gamma,pipeline,row}.ts`, rows |
| 3 | f30f43f | ONE hypnotic-potency output + dissociative fraction | `l2/pk/{combine,pd,pipeline,row}.ts`, `types-pk.ts` |
| 4 | ffc179b | ONE opioid-potency output, checked against both consumers | tests only |
| 5 | 50f168c | 7f depth reads both outputs (E-FU7-1) | `l2/neuro/{bus,depth,pipeline}.ts` |
| 6 | ba840c3 | drive on the hypnotic equivalent; per-class surface | `l2/neuro/{drive,pipeline}.ts` |
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
| 19 | 3e1e2ef | matrix cells as engine tests (42 cases); console rows (E-FU7-8) | `test/engine/drug-layer.test.ts`, `test/helpers/fu7.ts`, `truth.ts`, `meta.ts` |
| 20 | 722d728 + this | evidence page + PNGs, this note, audit after | `apps/demo/{fu7.html,src/fu7.ts,scripts/fu7-shots.mjs,e2e/fu7.e2e.ts}`, `src/index.ts` |

**Size:** 79 files under `packages/`, `apps/` and `scripts/` (+4656 / −145 before this note).

**New engine test files** (all in `SLOW` and `SLOW_A`): `drug-apnoea`, `cat-reserve-engine`, `stimulus-surge`,
`fu7-nmb-one-state`, `fu7-volatile`, `drug-layer`.

**New unit files:**
- `test/l2/pk/`: `onset-chain`, `potency-outputs`, `beta-occupancy`, `antiarrhythmic`, `interactions-misc`
- `test/l2/neuro/hypnotic-equivalent`, `test/l2/endo/cat-reserve`, `test/l3/shock-state`

## §2 Acceptance (band per the case title; before = b004289, after = this branch)

| cell | quantity | band | before | after | verdict |
|---|---|---|---|---|---|
| DI-63 | anticholinergic HR peak (atropine / glyco) | 10–180 / 60–600 s | step onset | 120 / 130 s | PL |
| DI-71 | antagonist reversal (opioid drive halves) | 30–180 s | 35 s | 35 s | PL |
| DI-88 | benzodiazepine DI nadir | 120–420 s | 115 s | 188 s | PL |
| DI-69 | thiopental awake / etomidate duration | 240–900 / 150–600 s | never unconscious | 418 / 235 s | PL |
| DI-69 | thiopental LOC | 20–60 s | never | 10 s | it.fails |
| DI-69 | ketamine DI while out / emergence | > 60 / 10–20 min | never | 98 / 12.9 min | PL |
| DI-69 | ketamine LOC | ≥ 30 s | never | 16 s | it.fails (D20) |
| F5 | elderly LOC-dose ratio, midazolam / thiopental | 0.4–0.6 / 0.6–0.8 | — | 0.50 / 0.71 | PL |
| DI-89 | flag while breathing | 0 s | 180 s | 0 s | PL |
| DI-71 | opioid-only apnoea on air | ≥ 60 s | 0 s | 0 s | it.fails |
| DI-03 | Bailey pair SpO₂ nadir | 70–89 % | 90 % | 46 % | it.fails (overshoot) |
| DI-04a | ephedrine ΔMAP / β-blocked ratio | 8–25 mmHg / 0.3–0.7 | 7.6 / 0.96 | 12.5 / 0.99 | PL / it.fails |
| DI-83 | dobutamine β-blocked / healthy CO rise | ≤ 0.8 | 0.56 | 0.39 | PL |
| DI-05 | excess pressor (non-selective) / reflex bradycardia | > 0 / < 0 | 3.2 % / +1 | 3.5 % / +1 | PL / it.fails |
| T9 | ketamine rise depleted ÷ replete | ≤ 0.5 | 1.0 | 0.14 | PL |
| T10 | laryngoscopy after propofol ΔMAP / ΔHR | 20–30 / 12–30 | 10.7 / 7.4 | 24.8 / 16.0 | PL |
| T10 | awake laryngoscopy ΔMAP / ΔHR | 20–40 / 12–30 | 15.8 / — | 39.8 / 13.7 | PL |
| T10 | opioid pre-treatment ratio / lidocaine ratio | ≤ 0.5 / < 1 | 0.10 / 1.00 | 0.25 / 0.84 | PL |
| T10 | labetalol ratio; esmolol HR / MAP ratios | 0.2–0.8; ≤ 0.5 / ≤ 0.9 | 0.96; — | 0.96; 0.58 / 0.98 | it.fails (D22) |
| T10 | incision, no opioid; HTN ÷ healthy | 20–30; ≥ 1.3 | 7.7; 1.24 | 19.3; 1.19 | it.fails |
| DI-61 | VT conversion, 200 seeds × 40 min (amio / lido) | 20–35 % (either) | 0 | 20.5 / 11.5 % | PL |
| DI-13a | ROSC share with amiodarone, two shocks | ≥ 1.2× | 1.0× | 1.11× | it.fails |
| DI-23 | LAST excess, engine | > 0.02 | 0 | 0.014 | it.fails |
| DI-19 | second gas FA/FI at 5 min | +0.03–0.15 | 0 | +0.021 (7g) / +0.014 (engine) | it.fails |
| DI-70 | desflurane step ΔHR | +8–35 | +1 | +1.1 | it.fails |
| DI-25 | Mg profile prolongation; calcium shortens | +20–90 %; < 0 | 0 | +39.7 %; −0.3 min | PL |
| DI-90 | Mg load prolongation | +20–90 % | +0.5 % | +12.0 % | it.fails |
| DI-37c | denervation ΔK | 3–7 | 0.47 | 6.47 | PL |
| DI-51 | volatile prolongs rocuronium (engine) | 20–80 % | 132.4 % | 49.7 % | PL |
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
| DI-15 | AV-nodal blocker in pre-excited AF | VF or faster rate | NE | no change | it.fails (declared) |

## §3 Audit before / after (`pnpm run audit:drugs all`)

**Inputs:** `docs/gates/fu-7/audit-before.md` (Task 1's run on b004289, the 30 owned cells) and `audit-after.md`
(all 105 cells on the gate tree, 6682 s); ledger in `ledger-after.md`.

**Automatic grades** (the runner's own grade, before any `hand` note), on the 30 owned cells:

| verdict | before | after |
|---|---|---|
| PL | 6 | 16 |
| WR | 12 | 5 |
| TS | 8 | 3 |
| TW | 4 | 6 |

**All 105 cells after:** PL 58, TW 17, WR 10, TS 10, NE 10. With the hand notes applied (the report's column): PL 52,
TW 17, NE 10, MI 9, TS 8, WR 7, IN 2.

**Moved (15):**

| cell | before → after |
|---|---|
| DI-51 | TS → PL |
| DI-57 | TS → PL |
| DI-63 | TS → PL |
| DI-71 | TS → PL |
| DI-88 | TS → PL |
| DI-23 | WR → PL |
| DI-45 | WR → PL |
| DI-69 | WR → PL |
| DI-76 | WR → PL |
| DI-89 | WR → PL |
| DI-37c | TW → PL |
| DI-21 | WR → TW |
| DI-25 | WR → TW |
| DI-60 | WR → TW |
| DI-14c | PL → WR |

**DI-14c.** It moves backwards because seed 7 now draws the new pre-excited-AF VF branch at +68 s. The cell's
HR-change measure reads 0 on that branch. The 400-seed unit test gives a VF share of 0.23, within its band.

**Owned cells not PL after, each with its reason:**

| cell | grade | reason |
|---|---|---|
| DI-03 | WR | Bailey overshoot, §5 |
| DI-04a | TS | Q1 |
| DI-05 | WR | reflex bradycardia |
| DI-19 | WR | +0.02 rounds to 0 in the runner |
| DI-21 | TW | sign right |
| DI-25 | TW | calcium −0.3 min |
| DI-41 | TS | the cell gives adrenaline only |
| DI-42 | TW | MAP −5.4 % |
| DI-60 | TW | α2B |
| DI-61 | WR | a single seed; the 200-seed engine share is 20.5 % |
| DI-70 | TW | trigger |
| DI-72 | TS | rig artefact |
| DI-90 | TW | +12 % |

The plan's Step 5 target list also named DI-08, 11, 13a, 14c, 15, 01d, 61 and 70. Of those, DI-08 is TW (its pressor item PL, its labetalol-ratio item not),
DI-11 is PL, and DI-01d is TW; DI-13a and DI-15 are covered only by the engine tests, because the runner has no shock
arm and no verapamil arm.

**Stale `hand` notes.** Task 1 forbids editing them, so these cells grade one way automatically while the note says
another:

| cell | automatic | hand note |
|---|---|---|
| DI-76 | PL | MI |
| DI-45 | PL | MI |
| DI-23 | PL | TW |
| ET-19 | TW | MI |

DI-23's automatic PL comes from the runner rounding both maxima to one decimal before subtracting. The unrounded excess
is +0.014, the engine `it.fails` in §2. The orchestrator folds the verdict column into research/12 (Task 20 Step 4).

**Task 4 Step 2 — the opioid-potency check.** 7f's opioid input equals the published fentanyl-equivalent × 0.55 for
the two single agents the drive was calibrated on (ratio 1.000 for fentanyl and remifentanil). The other two rows
differ by their own [ENG] weights (ratios 2.40 and 1.875).

## §4 `it.fails` list

Every miss below keeps its band. The measured number is in the test title. None was widened (R45).

**drug-layer** (engine)
- thiopental LOC: 10 s
- ketamine LOC: 16 s (D20)
- ephedrine β-blocked ratio: 0.99 (Q1)
- reflex bradycardia: +1
- amiodarone shock factor: ×1.11. Occupancy is 0.38 at the ALS shock; the factor reaches ×1.2 at u = 1
  (`shock-state.test.ts`).
- LAST excess: 0.014. Bupivacaine alone already sits high on the steep Hill. Exact additivity holds at unit level.
- second gas: +0.014
- Mg load: +12 %. Blood Mg peaks at 2.1 and falls during the block; the Mg profile arm passes.
- morphine MAP: −5.6 %
- nitroprusside in HFrEF: SV +1.2 % (7a C9)
- AV-nodal blocker in pre-excited AF: occupancy 0.35, below the hook's 0.5
- **Pre-existing, measured identical on b004289:**
  - TCI overshoot: 3.132 (baseline audit 3.1)
  - MH EtCO₂ at 10 min: 42.2 (baseline 42.2)

**drug-apnoea**
- opioid-only apnoea: 0 s (VE nadir 2.27 L/min)
- naloxone reversal: no apnoea to reverse
- Bailey pair, seed 7: 46 %
- Bailey population: 0 / 20
- ventilated "flag clears": effort never returns under VCV in 1200 s

**stimulus-surge**
- HTN ÷ healthy: 1.19
- incision: +19.3
- labetalol ratio: 0.96
- esmolol ratios: 0.58 / 0.98

**cat-reserve**
- 30 min depletion: 0.485 (0.367 at 60 min)

**antiarrhythmic**
- sub-therapeutic lidocaine: 3 / 200 conversions. The hazard is occupancy-scaled, not thresholded.

**interactions-misc**
- sugammadex low dose: 13.4 %
- second gas: +0.021
- concentration effect: not modelled
- desflurane trigger: never fires (end-tidal 60 s rise ≈ 0.16 < 0.3)
- morphine histamine: 0.32
- α2B early rise: ×0.994
- nitroprusside SVR: −29.9999 % (the band edge)
- esmolol direct HR: −6.5 %
- diabetic peak: +1.83

**fu7-volatile**
- desflurane ΔHR: +1.1

**neuro interactions**
- rig-only rocuronium prolongation: +13.4 % (engine DI-51 49.7 %, PL)

**pk-acceptance-pd**
- ephedrine × 3 SVR increments: 0.040 / 0.010 / 0.005. The pressor moved to `sympDrive` in Task 9; a new `it`
  asserts the tachyphylaxis on `sympDrive` (0.800 / 0.204 / 0.092).
- dobutamine healthy rig: +13.6 %

**Met although declared as `it.fails`:** the late dexmedetomidine SVR fall (×0.963), now written as `it`.

## §5 Deviations and findings

**The plan's named deviations:**
- ketamine LOC 16 s (D20; emergence met)
- ephedrine β-blocked ratio 0.99 (Q1)
- the reflex-bradycardia item (Task 8 Step 6 measured the vagal limb; reported to FU-4, no `baroreflex.ts` edit)
- labetalol / esmolol surge bounds (D22)
- DI-72's 5 s consciousness recovery (a rig artefact)
- `uHyp` antagonist-corrected: a behaviour change for 7d under flumazenil (review F8)
- the dexmedetomidine half-model (Task 17)
- **"atracurium and mivacurium: histamine release only — NO neuromuscular block in v1"**

**Volatile bronchodilation (D23).** No EC50 meets both bands, so the rows stay at 0.5 (Q12). Resistance fall at
1 MAC / FU-6 Ppeak fall at 0.88 MAC:

| EC50 | resistance (band −20 to −40 %) | Ppeak (FU-6 co-constraint ≥ −30 %) |
|---|---|---|
| 0.5 | −62.8 % | −43.6 % |
| 1.0 | −47.7 % | −33.4 % |
| 1.2 | −43.4 % | −30.2 % |
| 1.4 | −39.8 % | −28.1 % |

FU-6's own case stays green at 0.5.

**[ENG] probabilities (Tasks 11–12):**
- pre-excited-AF VF 0.2 per event
- the five shock-state factors
- the temperature factor
- the 240 s circulatory-phase gate
- the cardioversion E50s
- PROCAMIO quoted from the abstract: 38 % amiodarone, so `L_AMIO_VT` = −ln 0.62 / 2400

**Executor findings:**
- **DI-03 overshoot.** On FU-6's drive the Bailey pair overshoots: SpO₂ 46 % vs 70–89 %. `VENT_ALPHA_BENZO` was not
  revisited (D15).
- **Task 9 regression, found late.** It broke the slow `pk-acceptance-pd` ephedrine precondition; found at Task 17 and
  handled under R45 (§4).
- **DI-65 dantrolene drift.** The EtCO₂ fall moves −6.2 → −5.2 against the −5 band edge. HR fall −67 → −61.
- **DI-54.** Magnesium converts torsades at +110 s; asystole follows 20 s later. Identical on b004289 (165 s of
  pulseless torsades first), so not FU-7's.
- **Guard premise wrong for two cells.** DI-67 and DI-65 were not PL before FU-7, although the plan's guard list
  assumed they were (§4).
- **DI-15's first test was hollow.** Pre-excited AF already runs above 200/min without the drug, so the first version
  passed trivially. It is now written against a control arm.
- **Rig conventions in Task 19:**
  - DI-05's non-selective arm sets `prof.betaNonSel` in the test, because no command exists.
  - The DI-61 share is 200 seeded hazard runs evaluated on the engine's live PK state.
  - The shock arm captures each shock's context on its way into the real draw.

**Other-repo work not modelled:**
- research/13 RH-12d: ×1.17 vs ×1.3–2.5 (Q15)
- RH-07a: 90 s / 8.5 min (label met; owner 7d H1)

**AF rigs.** Task 0 Step 6b PASSED (CM-15c `kIschMin40` 0.90), so every AF arm ran at its natural length.

## §6 Calibration queue (R44, Ali)

Task 20 Step 6's list, unchanged, plus three executor additions:
- DI-13a's occupancy at the ALS shock
- the DI-90 Mg-load kinetics
- DI-23's Hill steepness

## §7 CI

PENDING: slow-a, `-r` tests, build, browser tests, tick bench.

- **Slow-b (gate tree):** 45 files, 253 passed (4451 s, run beside slow-a and the audit).

- **Fast set (gate tree):** 286 files, 1307 passed, 1 skipped, 0 failed (341 s).
- **Mid-plan slow-b:** 45 files, 253 passed.
- **Slow-set membership:** every FU-7 engine file is in `SLOW` and `SLOW_A` (executor instruction, the FU-6 practice).
  SLOW_B is `SLOW` minus `SLOW_A` by Vitest's matcher, so each file runs in exactly one job.
- **PNG sizes (bytes):**

  | panel | size | note |
  |---|---|---|
  | 1-onset | 57003 | re-taken at deviceScaleFactor 0.6: 74 KB at 0.7, no quantiser on the machine |
  | 2-potency-thiopental | 52816 | |
  | 3-beta-blockade | 52923 | |
  | 4-surge-and-shock | 59275 | |

## §8 Re-anchorings (Task 0 Step 3; none at Task 20 Step 1)

Each block was placed on the landed text with the same change:

| ref | task | where | what was done |
|---|---|---|---|
| R1 | 6 S2 | `neuroResp` call | FU-6's `hypnotic` / `stress` kept |
| R2 | 7 S3 | `spontRr` | added after `wasApnoeic` |
| R3 | 9 | hormones initialiser | `catReserve` appended after FU-4's `hum` |
| R4 | 10 | hormones initialiser | `surge: 0` |
| R5 | 10 | `surgeF` field | after `humDV0Frac` |
| R6 | 10 | `surgeF` return line | after `humDV0Frac` |
| R7 | 10 | effects imports | after `HUM_SVR, HUM_V0` |
| R8 | 10 | adapters, MODELED | `ext.surgeF` |
| R9 | 10 | adapters, MANUAL | `ext.surgeF = 1` |
| R10 | 10 | adapters input | `antinocOp`, `mapSetMmHg` kept |
| R11 | 10 | `stepBaro` | only the `setF` factor |
| R12 | 10 | `adapters.test` key list | `surgeF` added |
| R13 | 11 | signature | built on 18f's, `pulseless?` added |
| R14 | 11 | hook state | `conv?` / `preexcited?` after `sux` |
| R15 | 11 | engine | `pulseless7g` on 18f's call; the import block skipped (18f already imports it) |
| R16 | 14 | `interactions.test` import | my own `runTo` edit |

**Block-applier defects** (fixed and audited across every pair): a false "already applied" skip of one import, one
duplicated import, and one duplicated `package.json` line.

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

- **`treatments.ts` (E-FU7-4):** Task 14's own block adds a comment there, but the exception's file list omits the
  file.
- **Not covered by an exception:** `src/index.ts` gains two export lines for the evidence page (Task 20's file map
  lists the page, not the index).
- **Declared but unused:** none.

## §10 Open questions

The plan's Q1–Q17 stand as written, each with the number measured here:
- Q1: 0.99
- Q3: +24.8 / +39.8
- Q12: the EC50 table in §5
- Q15: ×1.17
- Q16: +1.83
- Q17: +19.3

New:
- **Q18 — the amiodarone shock benefit.** Is it meant at the ALS shock 2 min after the bolus, when occupancy is 0.38?
  It reaches ×1.2 only at full occupancy.
- **Q19 — the AV-nodal hazard and a standard dose.** Should a standard verapamil dose reach the hook? Occupancy is 0.35
  against the hook's 0.5.
- **Q20 — the TCI overshoot (DI-67).** Pre-existing; for 7g's controller.

Each is marked "confirm with Ali".
