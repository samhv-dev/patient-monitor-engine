# Gate 7e — endocrine, glucose–insulin, thyroid, thermoregulation (MH), system conditions

Branch `stage-7e-endocrine-thermal` (merge commit `378fb22`; later commits change only tests and docs), merged with origin/main `7cbd42b` (7a, 7b, 7g, 7x, FU-2, 7c, 8a, 7f,
7d via PR #19, CI amendment 4). Plan: `docs/plans/stage-7e-endocrine-thermal.md`. The executor's stop report of the
first Task 20 attempt (the two 7e × 7f failures that led to R51 addendum 18) is kept in `docs/gates/stage-7e-notes.md`.

## Test counts

All measured on the merged tree (merge 378fb22 plus the test-only commits after it), alone on the machine.

- **engine-core** 1,223 passed / 1 skipped, of which 27 are expected failures (`it.fails`: 8 are 7e's, listed below;
  19 belong to other stages and are unchanged). Fast set (`CI=1 PME_TEST_SET=fast`): 240 files, 1,063 passed,
  1 skipped, 54 s. Slow set (`CI=1 PME_TEST_SET=slow`, serial): 36 files, 160 passed, 0 unhandled errors, 1,008 s.
- audio 58; skins 171; ventilator 88; controller 203; renderer 71; validation 94 (+7 skipped); demo 116.
- **e2e** (`PW_SYSTEM_CHROME=1`, system Chrome): 31 passed, 1 skipped (the stage7d `PME_SHOTS` screenshot job), 9.5 min;
  `stage7e.e2e.ts` 2.3 min, skipped on WebKit by the repo's rule (G7g/G7x: > 2 min of scenarios). WebKit was not run
  locally (no Playwright browser cache on this machine); CI runs it for the light tests.
- Typecheck (`pnpm -r typecheck`), build, check-notices: pass.
- Long run (`endo-longrun`): 6 sim-h on CI (81.7 s in the slow set); 24 sim-h locally: pass, 179.8 s wall (7e CPU 3.2 µs per sim-s = 0.06 µs per tick in that run).
- New slow files from 7e: `endo-acceptance`, `endo-circ-acceptance` (both in SLOW, Tasks 14–15) and `endo-longrun`
  (matches `*longrun*`). Every engine run in them goes through `run()` in `test/helpers/resp.ts`, which yields with
  `setImmediate` once per SIM-MINUTE (CI amendment 4). The fast-set 7e files (`endo-seams` ≤ 30 sim-min per run,
  `endo-wiring`) use the same helper. No new slow file outside the list.

## Acceptance numbers (band → measured)

| Check | Band (source) | Measured |
|---|---|---|
| R39-7 GA unwarmed at 30 / 60 min | −0.5…−1.2 / −1.0…−1.6 °C (R39-7; test −0.7…−1.1 / −1.0…−1.6) | −0.93 / −1.26 °C; linear phase −0.26 °C/h in hour 3 |
| R39-7 forced air from induction: first-hour nadir; hour 3 | −0.6…−1.2 °C; +0.5–1 °C/h (Stage 3) | −0.91 °C; +0.54 °C/h |
| Stage 3/3.1 thermal tests | unchanged | pass (`test/l2/temp` 6/6, `resp-coupling` R39-7 and MH) |
| MH EtCO2 at 0/5/10/15/20 min; slope 10–15 min | ≥ 60 at 10 min; 3–5 mmHg/min (§7 21) | 40/48/63/84/102; 4.2 mmHg/min |
| MH core at 15 min | ≥ +1 °C (§7 21) | +1.17 °C |
| MH HR at 20 min / K at 20 min | +30–50 / 5.5–6.5 (§5.3, §7 21) | 75 → 141 / 6.0 |
| Dantrolene 2.5 mg/kg, EtCO2 turn (fixed MV) | 5–10 min (§7 21) | peak 110 at +6.0 min; 100 at +25 |
| Dantrolene + MV × 2: HR at +15/+20 min | < 100 (§7 21) | 129 / 121, core 39.78 °C (`it.fails`, Q-7e-5) |
| Stimulus HR / onset / offset | +15–25 %, τ 20–40 s, τ 2–4 min (§5c) | 75.1 → 93.8 (+24.8 %); onset and offset τ in band (asserted) |
| Cortisol at 1…6 h | > 1500 nmol/L at 4–6 h (§5c) | 999 / 1307 / 1465 / 1546 / 1588 / 1609 |
| Glucose via 7g: dextrose 25 g; insulin 4 U/h; lab panel | > 250 at once, < 130 by 60 min; < 70 by 2 h; 7c's panel shows 7e's glucose | pass (asserted); `endo-seams` E-7e-2/E-7e-4 pass |
| Type 1 + insulin 20 U/h under GA | < 65 mg/dL, HR ≥ × 1.2 [ENG] | 55 mg/dL, HR 75 → 103 |
| Sepsis MANUAL HR / core / glucose | HR 110–130 (§5e), core → 38.5–40, glucose ↑ | 120 / 38.76 °C / 169 mg/dL |
| Sepsis MODELED warm MAP / HR / CO / SVR | 55–60 / 115–130 / 7–9 / 500–700 (§7 16) | 61 / 131 / 5.0 / 861 (4 `it.fails`, Q-7e-7) |
| Sepsis MODELED cold CO / SVR | 3–4 / 1200–1500 (§7 16) | 3.8 ✓ / 1507 (`it.fails`, Q-7e-7); MAP 79, HR 79 |
| Anaphylaxis III MAP fall / rescue | ≥ 30 % in 10 min / ≥ 80 % of baseline (§5e) | 94 → 62 (−34 %) → 101 (107 %) after 2 × 100 µg epinephrine (7g) |
| Thyroid storm, 2 h awake: core / VO2 / HR / SVR | 38.5–41 / × 1.3–1.8 / 110–150 / × 0.55–0.65 (§5c) | 38.60 / × 1.57 / 135 / × 0.60 |
| Cold IV, 1 RBC unit (280 mL at 4 °C over 300 s, 70 kg) | ≈ 0.25 °C (§5b.4) | 0.235 °C (unit); engine: 2 cold units cool ≥ 0.3 °C more than 2 warmed (pass) |
| Determinism / CPU / long-run index | identical / ≤ 0.05 ms per tick / exact | identical, other seed differs / 4.1 µs per sim-s = 0.08 µs per tick / exact (6 h CI, 24 h local) |
| Addendum 18: 7g Eleveld engine vs standalone | 1e-9 at pinned conditions | equal with the core pinned at 36.8 °C; core free: 2.996568 vs 2.996015 (core 36.61 °C at 300 s, 7g's −5 %/°C clearance) |
| Addendum 18: 7f 6 h maintenance long run, DI | 30–50 (7f band, unchanged) | warmed from induction: DI 36 at 6 h (pass) |

**Addendum 18 demonstration (unwarmed 6 h maintenance: sevoflurane 2.5 % FGF 6 + remifentanil 0.1 µg/kg/min,
ventilated), measured on the merged tree:**

| h | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| unwarmed core °C | 35.64 | 35.32 | 35.04 | 34.79 | 34.55 | 34.34 |
| unwarmed `endo.cascade.macF` | 0.932 | 0.916 | 0.902 | 0.889 | 0.878 | 0.867 |
| unwarmed DI | 38 | 35 | 33 | 31 | 30 | 30 |
| warmed core °C | 36.04 | 36.59 | 37.19 | 37.74 | 38.21 | 38.56 |
| warmed `macF` / DI | 0.952 / 38 | 0.979 / 37 | 1.010 / 36 | 1.037 / 36 | 1.061 / 36 | 1.078 / 36 |

The unwarmed case is the physiology addendum 18 describes: a hypothermic core lowers MAC and deepens a fixed
anaesthetic. The warmed case shows a side finding. Forced air left on for 6 h under GA keeps heating the core, to
38.56 °C at 6 h and still rising about 0.35 °C/h. See the open questions.

## Expected failures (`it.fails`) — every one in engine-core

**Stage 7e (8):** the six the plan expects, plus two Q-7e-8 splits made under E-7e-5:

1. `endo-acceptance` › MH + dantrolene + MV × 2: HR < 100 by 15–20 min. Measured 129/121 at +15/+20 min, core 39.78 °C (Q-7e-5).
2. `endo-circ-acceptance` › warm HR 115–130. Measured 131 (Q-7e-7).
3. `endo-circ-acceptance` › warm MAP 55–60. Measured 61 (Q-7e-7).
4. `endo-circ-acceptance` › warm CO 7–9 L/min. Measured 5.0 (Q-7e-7).
5. `endo-circ-acceptance` › warm SVR 500–700. Measured 861 (Q-7e-7).
6. `endo-circ-acceptance` › cold SVR 1200–1500. Measured 1507 (Q-7e-7).
7. `resp-oxygen` › 5b-child: children 2–5 y 160 ± 30 s. Measured 128 s against 130–190; 130 s on main (Q-7e-8).
8. `blood-stage3-recheck` › desaturation, child. Measured 128 s against 130–190; 130 s on main (Q-7e-8).

**Other stages (19, unchanged by 7e):**
- `nmb-course` succinylcholine (FU-3 item 1)
- `blood/core` and `blood-sanity-acid`, saline Cl/BE
- `acid-base`, respiratory alkalosis
- `brain/model` check 18 CBF
- `reversal`, sugammadex underdose (R-7f-7)
- `neuro-circ`, reflex HR under sevoflurane (R-7f-9)
- `af-rate-control`, amiodarone 14.0
- `lung-circ`, OLV HPV
- `organs-curves`, UOP mid-curve
- `pk-bus`, VA 2.82
- `organs-renal` check 20 ×2
- `hemo-acceptance` 5c, PVC potentiation
- `pk-acceptance-pd`, dobutamine CO
- `circ-sanity-1`, propofol MAP
- `circ-sanity-2` R23 ×2
- `organs-htn`, CBF recovery

## Exceptions applied

- **E1:** `l2/temp/temp.ts` is a re-export shim of `l2/thermal/heat.ts`.
- **E2:** `l2/resp/pipeline.ts`. The thermal import, the `metabolic()` body (separate O2/CO2 factors, signature
  kept), `o2Inputs` passing `'o2'`, and the ventilation → heat-model lines before `stepTemp`.
- **E-7e-1:** 7c's cold-unit line in `l2/blood/pipeline.ts` now writes `rs.temp.iv`, the physical IV heat term.
- **E-7e-2 (plan):** 7c's lab-panel glucose in `l2/blood/labs.ts` reads 7e.
- **E-7e-3 (plan):** 7c's `const drug =` K line in `l2/blood/core.ts` gets `+ endoKShift`, the endogenous K term.
- **E-7e-4:** 7g's `setRate` in `l2/pk/pipeline.ts` records the ordered rate for gamma rows too.
- **E-7e-5:** these sibling tests were re-specified, each for a stated reason:
  - 7c's cold-unit unit test (`test/l2/blood/pipeline.test.ts`) now checks the physical heat term.
  - Stage 3 `resp-oxygen` 5b and 7c `blood-stage3-recheck`: the child assertion is split into its own `it.fails`
    with the numbers (Q-7e-8). The room-air, preoxygenated-adult and obese assertions are unchanged and still asserted.
- **R51 addendum 18, E-7e-2 (addendum):** 7g's `pk-acceptance-pk` Eleveld equality rig pins the core at 36.8 °C.
  It uses the test-only seam `ThermalState.pinCoreTemp` in `l2/thermal/heat.ts`, which has its own unit test. A
  second console line documents the temperature-scaled value.
- **R51 addendum 18, E-7e-3 (addendum):** 7f's `neuro-longrun` 6 h rig is warmed with forced air from induction. The
  band is unchanged.
- **7f hand-overs (R-7f-4, R-7f-8, brief):** 7f's TEMPORARY OWNER `stimulus` validator and its test are deleted from
  `l2/neuro/pipeline.ts` and `test/l2/neuro/pipeline.test.ts`. `EndoState` stores `cascade`, which 7f reads for `macF`.
- **Shared additive lines marked `// Stage 7e`:** `types.ts`, `index.ts`, `engine.ts`, the renderer `index.ts`, the
  demo `vite.config.ts` and `index.html`, the SLOW list, `NOTICES.md` (N-P17, N-P18), the 7x console `organs.ts`,
  and the `SKIP_PATH` line of `truth.ts`.

**Merge of origin/main (7d) — conflicts resolved:**

Every conflict kept both sides:

- the `EngineEvent` union (`EndoEvent`, `OrgansEvent`)
- the `index.ts` type exports
- the demo pages (`stage7e`, `stage7d`)
- `engine.ts` `flush` (`endo.out`, `organs.out`)
- `engine.ts` `restore`

In `restore`, 7e's pre-7e upgrades (`endo`, `endoHrF`, `cond`, `upgradeThermal`) are placed before 7d's pre-7d organ
creation and rebaseline. The reason is that `rebaselineOrgans` reads `resp.temp` and `endo` through `organsCtx`.

The validate/apply chain and the advance order were already in R51 order after the auto-merge:

- validate/apply: device → pk → neuro → organs → blood → endo → Stage 3 → hemo
- advance: pk → resp → blood → endo → organs → hemo

The 7d ↔ 7e seam names check out: 7d publishes `organs.liver.glucoseF` and 7e reads it; 7e publishes
`endo.core.cond.sepsis.cur` and 7d reads it.

## Deviations (R45) and rulings requested

- **Q-7e-5, MH HR after dantrolene.** Measured 121 at +20 min with a doubled MV. The core is 39.8 °C and active
  cooling is not modelled. Gain 2 was rejected because it moves the EtCO2 turn out of band (plan decision 7).
- **Q-7e-7, MODELED septic shock.** Four warm bands and the cold SVR are missed. The plan's extra attempt (four
  within-table dV0Frac/extraSymp pairs, in `stage-7e-notes.md`) only trades HR against MAP, and none reaches CO 7–9
  or SVR 500–700. Addendum 18 confirmed these stay; they are in the calibration queue. The warm CO needs a
  vasoplegia-with-high-output mechanism: 7a's baroreflex restores the SVR the vasoplegia removed, and nothing raises
  venous return. Question for Ali.
- **Q-7e-8, Stage 3 child desaturation: 128 s against 130–190; main gives exactly 130.** Probed on the merged tree:
  - About 1 s comes from 7e's heat model. It cools this 16 kg child 0.01–0.04 °C less than Stage 3's model in the
    first 3–6 min. The desaturation time moves about 1.5 s per 0.1 °C through `tempFactor`: 126 s with the core
    pinned at 36.8, 131 s at 36.4.
  - About 1 s comes from 7e's hypoxia/hypercapnia catecholamine drive, which acts on this rig's resting state. With
    the drive constants zeroed, the time is 129 s.
  - **Side finding, pre-existing on main:** this rig's child (4 y, 16 kg, RR 24, VT 130, no height) sits at rest at
    FiO2 0.21 with SaO2 ≈ 0.36 and PaCO2 ≈ 94, while the displayed EtCO2 is 36. Main shows the identical numbers.
    The preoxygenated test hides it. 7e's hypoxia/hypercapnia drive is what makes it visible, as an endogenous
    epinephrine rise from t = 0: HR factor 1.02 at 30 s, 1.08 at 180 s.

  Converted to `it.fails` with the numbers, following the 07:50 ruling ("stays `it.fails`, calibration"). The band is
  unchanged.
- **Other deviations:**
  - `types-endo.ts` imports `StimulusEvent` from `types-neuro.ts`, because 7f landed first.
  - NOTICES N-P18 also names `TissueModel.cpp`, because `glucose.ts`'s header cites its liver-release threshold.
  - The N-P17/N-P18 rows sit at the end of the Pulse table.
  - The six planned 7e `it.fails` titles now carry the measured numbers, not the prototype's.

## Calibration items for Ali (R44)

- Q-7e-1: no Q10 on the heat balance.
- Q-7e-2: neuraxial uses sedated thresholds.
- Q-7e-3: forced-air warm-up lag, τ 30 min.
- Q-7e-4: MH heat × 9, sweat cap 150 W, K efflux 2.2 mmol/L.
- Q-7e-6: antinociception fallback of 0.6 × depth when 7f/7g have no agent.
- The [ENG] rows of decisions 8 (neural HR gain 0.18; cortisol τ 1.5 h), 13 (sepsis and anaphylaxis rows) and
  17 (thyroid storm VO2 × 1.4 and set point +1.8 °C).
- Active cooling for MH is not modelled.
- Warm sepsis needs a high-output mechanism (Q-7e-7).
- Forced air has no thermostat; see the open questions.

## Screenshots

In `docs/gates/stage-7e/`, headless system Chrome, 1280 × 640, each ≤ 60 KB (taken at 1609318 on the 7e + 7f tree, palette-quantised to 41–43 KB):

- `mh-20min.png` — MH at 20 min. EtCO2 > 100, core rising, HR ≈ 140. The endo panel shows epinephrine in the
  hundreds of pg/mL, stress index ≈ 90, MH activity 1 and sweating.
- `mh-dantrolene-20min.png` — 20 min after dantrolene. EtCO2 falling, HR still ≈ 120 without active cooling (the
  Q-7e-5 `it.fails`).
- `hypothermia-60min.png` — GA unwarmed at 60 min, core ≈ 35.5 °C. The vasoconstricted flag is off: 35.5 is above the
  GA vasoconstriction threshold of 34.8 °C, so the script comment's "vasoconstricted" does not hold at 60 min.
- `sepsis-cold.png` — cold septic shock. The desaturation alarm (SpO2 ≈ 89) is on the unventilated septic patient.
- `hypoglycaemia-60min.png` — type 1 diabetic on an insulin infusion under GA. GLU ≈ 3.2 mmol/L, painted amber
  because the panel's red level is < 3.0; the script comment said red below 3.5.

## Physiology console (7x)

Task 19 grouped the Stage 7e seams under **Endocrine**. The 7e machinery keys are INTERNAL. The input copy and the
heat calibration are pruned from truth through the `SKIP_PATH` line of `truth.ts`.

## Open questions for the orchestrator

1. **Exception-name collision.** Addendum 18 names its two rig changes E-7e-2 and E-7e-3, but the plan already uses
   those names (7c lab glucose; 7c K term). This note labels them "addendum". Should they be renamed (e.g.
   E-7e-6/E-7e-7) in the rulings file?
2. **Forced air has no thermostat.** Left on under GA it takes a 70 kg adult to 38.56 °C at 6 h, still rising. The
   7f long-run rig passes (DI 36), but a real warmer is titrated or servo-controlled. Should 7e (or FU-3) add a
   core-temperature cut-off or servo, or should the 7f rig switch warming off at normothermia?
3. **Q-7e-8 root cause is upstream.** The Stage 3 child rig sits at SaO2 0.36 and PaCO2 94 on room air at rest, and
   main has the same numbers. This is worth its own item (Stage 3/7b child ventilation) in FU-3. Once it is fixed,
   the child desaturation probably returns into band and the two Q-7e-8 `it.fails` start failing, which signals
   them for removal.
4. The screenshots' teaching-moment comments in `stage7e-shots.mjs` (hypothermia "vasoconstricted" at 60 min; the
   hypoglycaemia red threshold) are wrong in the SCRIPT comments. Should they be corrected in FU-3, or should the
   scenario time or panel threshold change?
