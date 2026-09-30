# FU-10 plan review — endocrine and thermal integration

Reviewer: cloud session (Opus 5.5), read-only, 2026-09-30. Branch `review/fu-10-plan` (`0f80bc0`), base under review
`origin/main` **`42f579e`** (FU-8 Part A merged). The plan was written on `7954933`. Object of review:
`docs/plans/fu-10-endocrine-thermal.md` (2,366 lines), `docs/plans/fu-10-prototype.patch`, the ET audit
(`docs/review-inputs/research/14-coverage-endocrine-thermal.md` + `14-coverage-et-scripts/`), FU-7 and FU-9 plans, rulings
excerpt. Nothing in the repository was modified except this file; every measurement ran in detached scratch worktrees.

## Verdict: **APPROVE WITH FIXES** (Part A: A1–A4 and A6 after their fixes; A5 and A8 must be reworked or withdrawn; A7 needs one missing mechanism before execution; Part B text needs the FU-7 binding rules)

The plan is mechanically sound. All 76 find/replace blocks apply exactly once in order on today's `origin/main`, the
prototype is reproduced byte for byte, typecheck is clean, and the MH-from-triggers (A1), neuraxial (A2),
insulin–dextrose (A4) and etomidate/adrenal (A6) mechanisms measure as the plan says. FU-4's arrest timings do not move
under Part A, and neither do the MH pre-arrest rows or the hypothermia rows.

It cannot execute as written, for five reasons:

- **A5 turns an existing sourced test red.** The 75 g OGTT 2-h value becomes 142.1 against a band of < 140, and the plan
  says this suite is green.
- **A8 is not physically consistent.** It adds a 120 W heat source with no O₂/CO₂ cost, which is nearly twice the
  anaesthetised metabolic heat of 64 W.
- **A7's ketoacidosis cannot be treated.** Nothing in 7c clears ketoacids. Under insulin 0.1 U/kg/h the ketones rise from
  7.1 to 11.2 mmol/L while glucose normalises.
- **A1 violates its own rule D3.** An instructor MH that was cleared restarts at once from the trigger exposure.
- **The committed prototype patch includes B2 without FU-9 A2.** That is the tree the plan itself calls wrong (D12).
  Measured here, it abolishes the MH arrest and turns `endo-acceptance.test.ts` red.

All five are fixable inside the plan's own architecture (details and fixes below). None needs a new owner, so this is
APPROVE WITH FIXES, not REJECT. A second review pass is needed only for the reworked A7/A8.

## Mechanical results

### Blocks on today's main (item 1)

| check | result |
|---|---|
| Find/replace blocks parsed from the plan document, applied in document order | **76 blocks, 0 problems** on `origin/main` `42f579e`; identical on the plan's base `7954933` |
| Chained blocks (find not exactly once on base, introduced by an earlier task) | **9**, as declared: A6 #48 (← A4), A6 #49 (← A4), A7 #58 (← A6), A8 #65 (← A7), B2 #70/#71 (← A8), B2 #72/#73 (← A2), B2 #74 (← A7) |
| "(chained on <task>)" markers the plan promises in every task | **absent**: no block in the document carries the marker (see F15) |
| Creates in the document | **4** (`test/helpers/fu10.ts`, `test/l2/thermal/fu10-mh-exposure.test.ts`, `…/fu10-neuraxial.test.ts`, `test/engine/fu10-mh-trigger.test.ts`), not the "6 creates" of the STATUS line and Task A0 |
| Blocks gone stale because FU-8 Part A merged | **none**. Between `7954933` and `42f579e` no file FU-10 edits changed. FU-8 changed `engine.ts`, `l2/blood/pipeline.ts` (A28 co0 units) and `vite.config.ts` (the `fu8-*` SLOW/SLOW_A glob); FU-10 has no block in any of them |
| Part A + B2 + the 4 creates vs `docs/plans/fu-10-prototype.patch` applied to a clean `origin/main` | **byte-identical (20 files)**. The patch applies cleanly to `42f579e` |
| **Part A alone** vs the prototype | differs **exactly by B2's 7 blocks** (`heat.ts`: `o2F` field, initialiser, `o2Frac`, the `shiverW`/`mhW` lines; `adapters.ts`: `o2` in `BloodLike`, `o2Fraction`, `th.o2F`). The prototype is Part A **+ B2**, which the plan gates on FU-9 A2 (F5) |
| `vite.config.ts` | not in the patch and no block in the plan (prose only). The prototype's `fu10-mh-trigger` engine file therefore runs in the **fast** set (F13) |

Plan-level staleness because main moved:
- **FU-8 A16 is already merged** (`d90b16b`). The `patient.endo` schema has `additionalProperties: false` and only
  `diabetes`/`thyroid`/`adrenalInsufficiency`, so the "FU-8 A16 carries `basalInsulin` into `pme-scenario/1`" hand-off
  (inventory E7, D7, Requests, A7 Overlap, Q11) has no owner (F6).
- **B5's precondition "FU-8 Part A (A21's arrest state)" is now met.**
- The plan's base line (`7954933`, "FU-8 not merged") and Task A0 Step 2 are stale.
- ET-11's untreated comparison arm moved on main: EtCO₂ at 30 min is **31.1** (the plan's "before" says 30.94). After
  Part A it reads **32.4** (the plan says 32.25). Every other ET number I re-measured on `42f579e` equals the plan's
  "before" column, so FU-8 Part A did not move the ET cells.

### Typecheck and tests (item 2)

| suite | `origin/main` | Part A (A1–A8) | prototype (Part A + B2) |
|---|---|---|---|
| `pnpm --filter @pme/engine-core typecheck` | clean | clean | clean |
| `pnpm typecheck` (whole repo) | — | clean | — |
| `test/l2/{thermal,temp,endo,neuro,blood}` | 39/39 files green | **40/41, 1 failed** | **40/41, 1 failed** |
| engine **fast set** (`PME_TEST_SET=fast`, 2 workers) | — | **274 files: 1,217 passed, 1 skipped, 1 failed** | — |
| failing test | — | `test/l2/endo/glucose.test.ts` "75 g oral … < 140 at 2 h": **142.14** (A5) | same |
| plan's new tests `fu10-mh-exposure` (3), `fu10-neuraxial` (3 incl. 1 `it.fails`), re-pinned `temp.test.ts` (6), `fu10-mh-trigger` (2) | — | **all pass**; log lines: neuraxial −0.78 vs GA −1.25 °C (ratio 0.62), shivering from 35.49 °C; sux EtCO₂ doubles **+14.3 min**, core 41.74 °C at +40 min; volatile alone **+23.5 min**; not susceptible 0 | — |
| `fu10-mh-trigger` wall time | — | **198 s** stand-alone (234 s under load). The plan says 27 s | — |
| SLOW `endo-acceptance` + `thermal-warmer` | — | **9/9 pass** (859 s) | `endo-acceptance`: **3 failures** (MH core +0.45 °C at 15 min vs ≥ 1; the dantrolene HR `it.fails` now passes, HR 100/97; warm septic HR 108.8 vs 110–130) |

The P2 sweep that isolates A5 (`glucose.test.ts` alone, everything else Part A): p2 0.025 pass, 0.022 pass, **0.020
pass**, 0.018 fail (140.33), 0.016 fail (142.14). Test runs rewrote no tracked file (`git status` clean apart from the
applied plan, before and after every run). All scratch worktrees stay outside the repository.

### `audit:physiology` (item 3, FU-4 check)

Both trees ran the whole audit (≈ 37 min each). The **arrest table is identical in every arrest time**: A-, L-, K- and
X-rows, the tamponade, exsanguination, tension-PTX, hyperkalaemia and VF/CPR rigs. The only change in that table is the
"min HR, last min before" column of `K-ptx-ctl`/`K-ptx-prop2` (121 → 120). The **propofol state-dependence table moves**,
and the plan does not report it (F11):

| row | pre MAP | pre HR | pre CO | ΔMAP nadir | ΔMAP % | at | ΔHR | ΔCO |
|---|---|---|---|---|---|---|---|---|
| septic shock warm, main | 85 | 157 | 5.22 | −31.3 | −38 % | 85 s | −59 | −0.46 |
| septic shock warm, Part A | **82** | **149** | **5.51** | −32.4 | **−40 %** | 80 s | −41 | −0.99 |
| 80 y hypertensive | 122 / 68 / 4.70 | | | −25.9 → −26.0 | −21 % | | | −0.30 → −0.28 |
| AS + CAD + HTN 75 y | | | | −25.2 → −25.3 | −21 % | | | −0.26 → −0.25 |

The septic row follows A8's pyrogenic heat (the septic patient now warms under GA). The
two elderly rows are consistent with A3's age term, the only Part A change keyed to age (not isolated). The
plan's FU-4 checks say "`audit:physiology` unchanged (no healthy-patient path moves)" (A2, A6) and never mention the
septic row. It is not a band failure, but it is a FU-4 table row that moves without being declared.

### ET audit runner, before → after (item 3)

All 72 cells were run on both trees (seed 7), copying the runner and pointing `PME_ENGINE` at each tree.

- **Hand verdicts on main:** PL 36, TW 12, TS 1, WR 6, IN 2, MI 7, NE 8. This is `research/14`'s table cell for cell, so
  FU-8 Part A moved no ET verdict.
- **Automatic verdicts:** main **PL 34, WR 14, TW 11, NE 8, TS 4, MI 1** → Part A **PL 37, TW 12, WR 9, NE 8, TS 5,
  MI 1**. This is exactly the plan's claim.
- **The six automatic changes are the plan's six:** ET-10a WR → PL, ET-31 WR → PL, ET-34 TS → PL, ET-23c WR → TW, ET-04
  WR → TS, ET-01b WR → TS. **No cell regresses.**

| cell | item | main `42f579e` | Part A (measured) | plan's "after" |
|---|---|---|---|---|
| ET-10a | `mhDevelops` / EtCO₂ max | false / 29.35 | **true / 101.4** (VF at 2980 s, 90 min run) | true |
| ET-04 | hour-1 / ratio / shivers / onset / 3 h | −1.07 / 0.90 / no / — / 34.41 | −0.76 / **0.64** / yes / **35.48** / 35.31 | same |
| ET-01b | vaso onset h / °C, rate h2–3, h4–5 | 6.17 / 34.554 / −0.292 / −0.153 | **4.93 / 34.80** / −0.291 / −0.081 | same |
| ET-03a | d4h / **dT1hElderly** / tc4h elderly / tc4h adult | −0.09 / −1.19 / 34.73 / 34.82 | −0.15 / **−0.98** / 34.73 / **34.88** | −0.15 (the other three not reported; F8, F11) |
| ET-31 | combo max / min / K⁺ 60; two-row max / min / K⁺ 60 | 0 / 0 / −0.88; 6.93 / −2.42 / −0.84 | **8.00 / −2.35 / −1.12; 8.00 / −2.35 / −0.77** | 6.93 / −2.42 / −1.18 (two-row −0.84): **A4-step numbers, before A5 moved p2** |
| ET-34 | cortisol 4 h etomidate / propofol | 1582 / 1575 (1.005) | 1031 / 1575 (**0.655**) | same |
| ET-15a | cortisol / post-induction MAP / ΔMAP surgical / PE ratio | 466 / 73.73 / −0.8 / 0.79 | 233 / 70.19 / −4.4 / 0.68 | same |
| ET-23c | K⁺ pre (healthy 4.18) / ΔK⁺ 15 min | 3.70 / +0.04 | **4.49 / +0.48** | same |
| ET-20a/c | nadir min / mmol/L / adrenaline × / ΔHR | 13.33 / 2.92 / 16.4 / 18.4 | 15.33 / 3.13 / 11.4 / 13.4 | same |
| ET-21a | ΔHR awake / GA / masking | 16 / 26 / 10 | 12 / 18 / 6 | not reported |
| ET-12 | core at 90 min / ΔEtCO₂ / VO₂ %/°C / HR /°C | 36.86 / 7.07 / 24.1 / 13.9 | **38.50** / 10.13 / 16.7 / 12.0 | same |
| ET-13a | core 1 h / 80 min / storm HR | 36.58 / 36.60 / 151 | 37.61 / 38.16 / 155 | same |
| ET-26b/c | septic base MAP / NA ratio / dobutamine ΔCO | 74.25 / 0.29 / +0.42 | 75.8 / 0.26 / +0.96 | 75.8 / 0.26 / +0.86 |
| ET-05a–d | shivering VO₂ / W | +58.97 % / 66 | +56.93 % / 63.9 | same |
| ET-16a–c, 17, M3 | glucose 2 h | 6.85 | 6.90 | same |
| ET-18a–c | fall/h under 0.1 U/kg/h | −2.52 | −2.33 | same |
| ET-22 | D50 Δ at 60 min | −0.11 | +0.30 | same |

**The protected rows (the plan's claim that hypothermia, hyperthermia and arrest timings do not move):**
- **Hypothermia** ET-08a–d, ET-09a–c: **identical to the digit**. The plan's own prototype reported ET-09a MAP
  57.35 → 56.17; on today's main that move does not occur.
- **Iatrogenic hyperthermia** ET-30: identical.
- **MH (ET-10b–e/g, ET-M2):**
  - EtCO₂ doubling 860 s, HR +47, core +0.174 °C/min, K⁺ 5.75 at 20 min, pH 6.98 at 30 min: **identical**.
  - VF at 2680 s: **identical**.
  - Only tc60 44.29 → 44.28 and tcMax 47.77 → 47.76 move.
- **Dantrolene** ET-11a–c: every graded item unchanged (t½ 440 s, peak 39.0 °C, falls). The untreated comparison arm's
  EtCO₂ at 30 min is 31.1 → 32.4.
- **Unchanged to the digit:** ET-01a, 06, 07, 08a–d, 09a–c, 10f, 13b, 14, 15b, 19, 24, 25, 27a–c, 29, 30, 32, 33, 35,
  M1.

**Conclusion:** the plan's claim holds for Part A. B2's own claim holds too, but only with FU-9 A2 (next table).

### B2 verified both ways (D12)

| tree | EtCO₂ ×2 | core rise | K⁺ 20 min | pH 30 min | arrest | tcMax (MODELED / MANUAL) | dantrolene t½ | cold-emergence VO₂ |
|---|---|---|---|---|---|---|---|---|
| main (plan's "before") | 860 s | 0.174 °C/min | 5.75 | 6.98 | 2680 s | 47.77 / 47.77 | 440 s | +58.97 % |
| prototype + FU-9 A2's `vo2` line (simulated by the reviewer) | **860 s** | **0.174** | **5.75** | **6.98** | **2680 s** | **42.34 / 42.17** | **440 s** | **+56.93 %** |
| prototype as committed (B2, no FU-9 A2) | 880 s | **0.057** | 5.72 | 7.03 | **none** | 40.0 | 340 s (temp no longer falls) | +43.94 % |

The plan's B2 numbers and its D12 argument are both **confirmed exactly**. The corollary is F5: the patch the plan ships
is the third row.

## Findings

Severity: **H** = blocks execution of that task as written; **M** = must be fixed in the plan before execution, but the
mechanism stands; **L** = correct or clarify.

### F1 (H) — Task A5 breaks the OGTT band it does not declare (plan: Task A5, Prototype results, "Suites … green")
- **Evidence:** `P2_PER_MIN` 0.025 → 0.016 makes `test/l2/endo/glucose.test.ts` fail. The normal 75 g OGTT 2-h glucose
  is 142.14 mg/dL against the sourced band < 140. The threshold lies between p2 0.020 (passes) and 0.018 (140.33). The
  plan's Prototype results, Task A5 "Step — run" and Self-review all state that `test/l2/endo` is green. The minimal
  model's steady-state action is indeed unchanged (`dX = −p2·X + p2·SI·(I − Ib)`); the defect is the lag the OGTT
  measures.
- **Fix:** do not take 0.016. Either (a) drop A5 and leave ET-20a as `it.fails` "nadir 20–30 min — measured 13.3"
  (closing the gap needs the insulin's own disposition, which the plan already names: 7g's row, FU-8 B1), or (b) take
  p2 = 0.020, the smallest step that keeps the OGTT green. Re-measure ET-20a/20c and keep the nadir `it.fails` with its
  number. Under R45 the OGTT band is not re-pinned.

### F2 (H) — Task A8's pyrogenic heat has no metabolic cost and is fitted to its own band (plan: Task A8; `endo/params.ts` `PYROGEN_W_70`)
- **Evidence:**
  - `PYROGEN_W_70` = 120 W is added to `metabolicW` while VO₂/VCO₂ "stay the rows' own `vo2F`". The heat model's
    anaesthetised metabolic heat is `M_AWAKE_W_70 × GA_M` = 80 × 0.8 = **64 W**. A8 adds ≈ 190 % of it with no oxygen.
    120 W is the oxidative heat of ≈ 350 mL O₂/min (≈ 20 J/mL O₂), more than the whole resting VO₂.
  - The size is `[ENG]`, fitted to reach the band ("fit target: a febrile core 38.5–41 °C under GA"). Even so, the storm
    arm misses (37.61 °C), and 170 W would push the storm HR to 185.
  - It also reaches rows the plan does not measure. The `hyper` thyroid profile (`setShiftC` 0.3 → 18 W), `sirs` (1.0 →
    60 W) and mild sepsis (1.5 → 90 W) all get the source, and it applies awake as well as under GA.
  - It scales on actual `weightKg` although the Global Constraints say heat terms keep Stage 3's `effKg`.
  - Measured on `audit:physiology`: the warm-septic propofol row moves (MAP 85 → 82, HR 157 → 149, CO 5.22 → 5.51).
  - Physiologically, general anaesthesia and opioids attenuate the febrile response (Sessler group, the IL-2 fever
    studies [VERIFY exact citation]). A septic patient under GA is febrile because they **arrive** febrile, not because
    GA lets a heat source run.
- **Fix:** withdraw A8 from Part A. Keep ET-12/ET-13a as `it.fails` with their numbers (36.86 / 36.58 °C), plus an Ali
  question (ruling R-3 below). If a fever mechanism is wanted, use one of these two:
  - (a) Couple the pyrogen to metabolism. Raise the condition's heat through `vo2F`/`extraX`, so VO₂, VCO₂ and EtCO₂
    carry it, within the 10–13 %/°C the ET cell itself grades.
  - (b) Present the patient febrile. The condition's onset moves the core to its set point while the awake defences act
    (a presentation temperature), and GA then acts on a febrile patient.

  Either way, re-measure the septic `audit:physiology` row and the hyperthyroid profile.

### F3 (H) — Task A7's ketoacidosis cannot be treated: 7c never clears ketoacids, and ketogenesis outlives insulin by hours (plan: Task A7, D7, E-FU10-2)
- **Evidence:**
  - `blood/core.ts`/`solutes.ts` have no ketoacid disposal. `so.keto` leaves only with plasma lost in haemorrhage
    (`removePlasma`). The instructor's `condition dka` sets the pool directly; A7 is the first path that fills it
    continuously.
  - A7 also drives ketogenesis from `egpDef`, a **3-h first-order filter** of the insulin deficit, so production
    continues long after insulin returns.
  - Reviewer probe (Part A tree, type 1, basal insulin omitted, GA, ventilated; insulin 0.1 U/kg/h from 6 h):

    | t | ketoacids (mmol/L ECF) | egpDef | insulin (µU/mL) | glucose (mmol/L) | K⁺ |
    |---|---|---|---|---|---|
    | 1 h | 0.26 | 0.25 | 0 | 9.8 | 4.02 |
    | 3 h | 2.21 | 0.62 | 0 | 20.3 | 4.69 |
    | 6 h | 7.08 | 0.86 | 0 | 32.3 | 5.43 |
    | 7 h (insulin from 6 h) | **8.65** | 0.62 | 99 | 14.5 | 3.97 |
    | 8 h | **9.77** | 0.44 | 99 | 7.1 | 3.21 |
    | 10 h | **11.16** | 0.23 | 99 | 4.9 | 3.06 |

  - The JBDS DKA pathway's treatment target is capillary ketones falling ≥ 0.5 mmol/L/h on the fixed-rate insulin
    infusion. The model's acidosis keeps **deepening** after glucose has normalised, so the commonest teaching case
    (missed dose → DKA → treat) teaches the wrong course.
  - The non-diabetic side-effect is small but real. `egpDef` is `1 − i/Ib` for everyone: MH gives egpDef ≈ 0.002 and
    ketoacids 0.00, and septic shock gives 0. The plan's "egpDef 0 for healthy and type 2" holds only at rest.
  - The plan's 6-h numbers reproduce: glucose 32.3, K⁺ 5.43 (plan 5.5). The ketoacid concentration differs because the
    plan quotes 99 mmol over ≈ 17 L; the probe reads 7c's `vp + visf`.
- **Fix:**
  - (a) Make the seam a **net** rate: production from the *current* insulin deficit (not the 3-h EGP filter; a
    minutes-scale τ for lipolysis/ketogenesis), minus insulin-dependent ketone utilisation. The utilisation is either
    7c-owned or published by 7e in the same one-line E-FU10-2 seam.
  - (b) Add an engine test: omission then FRIII 0.1 U/kg/h gives ketones falling ≥ 0.5 mmol/L/h (JBDS DKA 2023), as
    `it` or as `it.fails` with its number.
  - (c) State in D7 that the instructor's `dka` pool is now also subject to utilisation. Otherwise say so explicitly,
    and have the instructor's `condition dka 0` clear it as today.

  Re-measure ET-18/23 and the K⁺ course. The probe shows K⁺ 3.06 at 4 h of insulin, which should be reported.

### F4 (H) — Task A1 violates D3: an instructor MH that preceded the triggers is restarted when the instructor clears it (plan: D3, Task A1 `mhFromExposure`, `endo/pipeline.ts` step)
- **Evidence:** `mhFromExposure(mh, x, owned, t)` creates the state whenever `mh === null && !owned`. `owned` is
  `false` for an instructor MH. Sequence: the instructor sets `condition mh 1` at t 50, the patient then gets
  suxamethonium at t 100 (exposure recorded), and the instructor sets `condition mh 0` at t 500. On the next pass the
  function returns `{ severity: 1, t0: 100 }`, i.e. full-activity MH at once (reviewer call on the Part A tree:
  `{"mh":{"severity":1,"t0":100},"owned":true}`). The plan's unit test covers only the case where the triggers made the
  MH (`owned` true).
- **Fix:** record that an exposure has been *consumed*. Make `mhAuto` tri-state (`'auto' | 'instructor'`), set to
  `'instructor'` when an exposure is seen while an MH already exists that the triggers did not make. Never create from
  exposure unless it is unset. Add the unit case above to `fu10-mh-exposure.test.ts`.

### F5 (H) — The committed prototype patch is Part A + B2 without FU-9 A2, i.e. the tree D12 calls wrong (plan: STATUS, Prototype results "Suites on the prototype tree", Self-review)
- **Evidence:** applying the plan's 76 blocks reproduces `fu-10-prototype.patch` byte for byte, so the patch includes
  B2's seven blocks. The Self-review says the patch "does not contain" the simulated FU-9 line, which is true, and that
  is exactly the problem.
  - On that tree the reviewer measured ET-10b rise **0.057 °C/min, no arrest, tcMax 40.0** and ET-11a t½ 340 s with the
    temperature no longer falling.
  - `test/engine/endo-acceptance.test.ts` gets **3 failures**: MH core +0.45 °C at 15 min vs ≥ 1; the dantrolene HR
    `it.fails` passes; warm septic HR 108.8 vs 110–130.
  - The "Suites on the prototype tree" list names no SLOW engine file except `thermal-warmer`.
- **Fix:** regenerate the patch as Part A only (the reviewer's Part-A tree = blocks 1–69 + the 4 creates). Keep B2's
  blocks in the plan under Part B with its STOP precondition. State the suites per tree.

### F6 (M) — Stale because FU-8 Part A merged: the `basalInsulin` scenario option has no owner; B5's precondition is met (plan: inventory E7, D7, Requests "FU-8 A16", Task A7 Overlap, Q11, A0 Step 2, B0, B5)
- **Evidence:** `d90b16b` (FU-8 A16) merged `patient.endo` with `additionalProperties: false` and three properties, so a
  scenario that sets `basalInsulin` is rejected by the schema. FU-8's plan has no further A16 work.
- **Fix:**
  - Either FU-10 adds the one schema property and its type (`packages/controller/scenarios/pme-scenario-1.schema.json`,
    `src/scenario/types.ts` already reuses `EndoProfileInput`, so only the JSON schema changes). That needs a declared
    exception, since `packages/controller` is not in the "never touch" list but is outside 7e.
    - Or it is handed to FU-8 Part B by name.
  - Update A0 Step 2's expectation (FU-8 merged) and B5's precondition (met).

### F7 (M) — B1 does not implement the rules FU-7 made binding on it (plan: Task B1; FU-7 plan "FU-10" section, lines ≈ 903–916)
- **Evidence:** FU-7 records, as "binding on both plans":
  - (i) a new FU-10 sympathetic source enters `extraSymp`, never `h.surge`;
  - (ii) it is multiplied by `catReserve` **only if it is a release**, so the cold-induced noradrenaline release is
    multiplied and the hypoglycaemic adrenal response is not;
  - (iii) FU-7 Task 10's guard arm (f), hypoglycaemia, is FU-10's regression guard: when GA masks the response, arm (f)'s
    `surgeF`/`surgeCat` must stay exactly neutral;
  - (iv) FU-10 re-anchors on FU-7's `h.surge`/`catReserve` lines and does not reorder them.

  B1 states (i) only. It also says "scaled by `(1 − antinoc)`", but FU-7 Task 10 (addendum 25) introduces `antinocOp`
  (the opioid share) beside `antinoc`, and B1 does not say which it reads.
- **Fix:** write (ii)–(iv) into B1's mechanism and tests:
  - `COLD_SYMP_PER_C · max(0, thrVaso − Tc) · catReserve`, with the hypoglycaemic term not multiplied;
  - arm (f) asserted neutral;
  - the antinociception input named. The whole antinociception (hypnotic + opioid) is the defensible choice for
    "unconsciousness masks the signs".
- Also add a guard. Scaling the whole hypoglycaemic drive by `(1 − antinoc)` (≈ 0.1–0.2 under GA) may abolish the
  **adrenal counter-regulation** (glucose recovery), not only the tachycardia. The only source given, Miller's
  "recognised late", is about signs, not hormone release. Assert ET-20c's adrenaline ×10–20 and the glucose recovery
  under GA in B1's test, and keep them as `it.fails` if the masking removes them.

### F8 (M) — E5/E6 (the draped rig's plateau onset at 34.80 °C vs 34.3–34.7): the approach is half right; a new wound term is not needed (plan: D5, Task A3, Weaknesses (1))
See the dedicated section below. In short:
- The depth cap is right.
- 34.80 is `VASOCONSTRICT_C` (an `[ENG]` constant tagged "tables 34.5 ± 0.2") read back by construction.
- A wound heat-loss term already exists (`exposure: 'prep'`, `PREP_EVAP_W_70` 40 W).
- D5's evidence sentence conflates two rigs.
- The E6 age term, as specified, does not make the elderly colder at 4 h; the ET-03a "improvement" is the adult's.

### F9 (M) — Citation errors and partly verified sources (plan: A1/A2/A3/A6 params comments, Q10)
See the citations table below. The material points:
- **(a) Neuraxial.** The paper that gives "shivering −0.5 °C" is Kurz, Sessler, Schroeder, Kurz, *Anesth Analg*
  1993;77:721–6, not "Anesthesiology 1993;79:1193". It found **both** vasoconstriction and shivering thresholds
  lowered ≈ 0.5 °C, while D4 keeps the awake vasoconstriction threshold.
- **(b) Elderly.** Kurz 1993 (*Anesthesiology* 79:465) measured the **vasoconstriction** threshold only. The shivering
  age term needs Vassilieff, Rosencher, Sessler, Conseiller, *Anesthesiology* 1995;83:1162 (spinal).
- **(c) MH onset.** Visoiu 2014's sevoflurane-alone median onset is ≈ 45 min (desflurane ≈ 114, halothane ≈ 16; as
  quoted in secondary sources [VERIFY against the paper]). The plan's 20-min volatile latency gives first activity at
  +23.5 min, about half the sevoflurane median.
- **(d) Etomidate.** Absalom 1999 concluded suppression lasts **at least 24 h** in the critically ill. The plan's t½ 8 h
  "inside the sources' 6–12 h" leaves 12.5 % of the suppression at 24 h.
- The ET runner's own ET-04 source string carries the same wrong Kurz reference ("Anesthesiology 1993;79:1193 … the
  shivering threshold only"). The error came in from `research/14`, so correct it there too.
- **(e) Forced air.** "Sessler, Lancet 2008;371:1791" could not be matched. The Sessler reviews are *Anesthesiology*
  2008;109:318 and *Lancet* 2016;387:2655.

**Fix:** correct the references. For (a), apply the vasoconstriction shift too (or record why not) and re-measure the
ratio. For (c), make the latency agent-specific or put the median to Ali (Q2). For (d), either lengthen t½ or record
the conflict.

### F10 (M) — The exceptions table is incomplete, and one changed existing test has no exception (plan: Exceptions table, Tasks A1, B3, B4, Gate Step 6)
- **Evidence:**
  - The table lists **E-FU10-1…6**, while the Gate asks the orchestrator to approve "E-FU10-1…8". **E-FU10-7** (B3,
    `blood/{core,oxygen}.ts`) and **E-FU10-8** (B4, `organs/pipeline.ts`) are declared only inline.
  - Task A1 edits an existing test, `test/l2/neuro/pipeline.test.ts` (it adds the `mhExposure` assertion), under **no**
    exception. E-FU10-1 covers the 7f *source* file only.
  - E-FU10-3 re-pins `temp.test.ts` and **removes** an assertion rather than re-pinning its number: "still falling in
    hour 8" / `tc[479] < 34.5` becomes `< 35.5` plus `shiverW > 0`. The reason given is sound (the old test pinned the
    GA thresholds), but the exception text should list the removed property.
  - B3's text says "ONE line in `src/l2/blood/{core,oxygen}.ts`", which is two files.
- **Fix:** add E-FU10-7 and E-FU10-8 rows (file, why not 7e, task). Add an exception row for A1's
  `pipeline.test.ts` edit, or fold it into E-FU10-1 by name. Name the removed hour-8 assertion in E-FU10-3.

### F11 (M) — Rows that move and are not reported (plan: Prototype results, A2/A3/A6/A8 FU-4 checks)
- ET-03a `dT1hElderly` **−1.19 → −0.98** (the elderly's hour-1 redistribution shrinks; see F8).
- `audit:physiology` septic-shock-warm row (MAP 85 → 82, HR 157 → 149, CO 5.22 → 5.51, propofol −38 → −40 %) and the
  two elderly propofol rows (−25.9 → −26.0, −25.2 → −25.3).
- ET-11 untreated arm 31.1 → 32.4 on today's main (the plan quotes 30.94 → 32.25 from `7954933`).
- ET-31 on the full Part A tree: combined +8.00 / −2.35 mmol/L, K⁺ −1.12. The two-row arm itself moves too (+6.93 →
  +8.00, K⁺ −0.84 → −0.77). The plan's A4/Q4/Gate numbers (+6.93 / −2.42 / −1.18 vs two-row −0.84) were taken at the A4
  step, before A5 moved p2. The `it.fails` title and Ali Q4 must carry the Part A numbers.
- ET-21a (GA masking of hypoglycaemia): ΔHR awake 16 → 12, GA 26 → 18 (A5's p2). This matters for B1's baseline, and
  the plan does not report it.
- In the other direction: the plan reports ET-09a (28 °C) MAP 57.35 → 56.17 and CO 3.09 → 3.21, but on today's main
  ET-09a is identical before and after. Correct the claim.
- **Fix:** add them to the prototype table and to the FU-4 check lines, or remove their cause (F2, F8).

### F12 (M) — `it.fails` declared with numbers but with no test to hold them (plan: Tasks A3, A4; Gate Step 4)
- **Evidence:** Task A3's four unreachable targets are listed in the Gate's ledger: draped `vasoOnsetH` 4.93 h,
  `vasoOnsetC` 34.80 °C, `rateH2to3` −0.291, ET-03a `d4h` −0.15. A3 creates only a unit file (`fu10-thresholds`), and
  no engine test is named to carry them. Likewise A4's K⁺ −1.18 lives in no file; A4 creates only a unit test. Only
  A2's `it.fails` is written out in the document.
- **Fix:**
  - Name an engine file per task: `test/engine/fu10-thresholds.test.ts` (SLOW_A; the ET-01b draped rig + the ET-03a
    pair) and `test/engine/fu10-insulin-dextrose.test.ts` (SLOW_A).
  - State each `it.fails` title with its measured number.
  - Also write out the remaining new test files the tasks describe only in prose (9 Part A files). Otherwise the byte-for-byte
    claim covers only 4 of 14 new files.

### F13 (M) — SLOW_A: no block, a wall-time claim that does not hold, and no budget (plan: Global Constraints CI rules, Tasks A1, A5–A8, B1–B6, Gate)
- **Evidence:**
  - There is no `vite.config.ts` block. `fu10-mh-trigger.test.ts` measures **198 s** stand-alone on this 4-core
    container (the plan says 27 s).
  - FU-10 adds ~11 engine files, all to SLOW_A, and slow-a was 21.6 min at the FU-4 gate before FU-8 added its `fu8-*`
    files.
- **Fix:**
  - Add one block, anchored on today's `vite.config.ts`: append `'test/engine/fu10-*.test.ts'` to `SLOW` and to
    `SLOW_A` (the FU-8 pattern; `SLOW_B` then excludes it by the same matcher).
  - Have Task A1 measure the slow-a wall time with and without the FU-10 files. The Gate stops if slow-a would pass
    ≈ 35 min, and the plan then either merges arms or asks for a third group (FU-9 A0b's `slow-c` precedent).

### F14 (M) — Undeclared overlap with FU-9 A4 in Task A7 (plan: Task A7 Overlap)
- **Evidence:** each FU-7/FU-9 find block on a file FU-10 edits was checked on main and after Part A. Only two
  collisions exist:
  - FU-7 Task 18's `const st = stressEffects(…)` line, declared in A6 with the merged form. Correct.
  - FU-9 **A4**'s `BloodLike` `core?: { so?: …; endoKShift?…}` type line. A7 rewrites that line (adding
    `endoKetoMmolMin`) and does not declare it; only B2 mentions FU-9 A4.
- **Fix:** add FU-9 A4 to A7's Overlap line with the merged form.

### F15 (L) — Task labels are inconsistent across the document (plan: Finding inventory, Prototype results, Exceptions, File map, Gate Step 5)
- **Evidence:** the task headers are A5 = E12(a) nadir, A7 = E7 insulin deficiency, A8 = E11 fever. The inventory,
  prototype table, exceptions (E-FU10-2/-4 "A5") and file map use the older numbering (A5 = E7, A7 = fever, A8 =
  nadir/sweating).
  - The inventory promises "hypoglycaemic sweating" (E12) in A8. No task implements it.
  - The file map lists `test/engine/fu10-neuraxial.test.ts`, `fu10-{glucose,conditions}` names and "B1 adds nothing" in
    `glucose.ts`, which no task creates.
  - The promised "(chained on <task>)" markers are absent from all 9 chained blocks.
- **Fix:** renumber the inventory, exceptions and file map to the task headers. Either implement hypoglycaemic sweating
  or record it as not modelled. Mark the 9 chained blocks.

### F16 (L) — A6: the permissive SVR term reads endogenous cortisol only; FU-7's hydrocortisone must reverse it (plan: Task A6, D9, Requests "FU-7 D13")
- **Evidence:** `svrF × (1 − CORT_SVR_PERMISSIVE · max(0, 1 − h.cort/CORT_BASAL))` reads `h.cort`. FU-7 Task 18 adds
  `cortExo` (exogenous glucocorticoid, nmol/L cortisol-equivalent) only to the metabolic term, and FU-7 left "whether
  the exogenous glucocorticoid joins [vasoResp]" to FU-10. The deficit FU-10 creates is therefore one hydrocortisone
  could not reverse unless someone edits this line.
- **Fix:** have A6 state the merged form, `h.cort + cortExo` in the permissive term (FU-7 supplies `cortExo`), and hand
  it to FU-7 D13 by name.
- Minor: `DoseLike.mgPerKg` is added and never read.

### F17 (L) — A7's hyperosmolar K⁺ term acts in non-diabetics, and A4's K⁺ attribution is incomplete
- `HYPEROSM_K_PER_MGDL · max(0, g − 200)` applies to any glucose above 11.1 mmol/L, including the D50 and
  insulin–dextrose rows A4 now makes reach glucose. A4 attributes the combined row's −1.18 to the dextrose's own insulin
  secretion only.
- **Fix:** report the two opposing terms separately in Q4 (secretion-driven shift vs hyperosmolar efflux), or restrict
  the hyperosmolar term to the insulin-deficient patient.

## E5/E6 — the draped rig's plateau onset at 34.80 °C vs 34.3–34.7: plan approach or a wound-heat-loss term?

**What 34.80 is.** ET-01b's `vasoOnsetC` is the core temperature where the vasomotor dilation fraction crosses 0.5,
i.e. the logistic centre `thr.vaso`. With the depth cap, `thr.vaso = lerp(36.9, VASOCONSTRICT_C, 1) = VASOCONSTRICT_C
= 34.8` exactly. That is an `[ENG]` constant whose own comment reads "tables 34.5 ± 0.2; plateau 34.6–34.8". On main the
reading was 34.554 only because the unsourced depth extrapolation (depth 1.06 → 2.1 °C per unit) happened to land in the
band. **No rig, wound or not, can move this item: it is the constant.**

**A wound term already exists.** `thermal/heat.ts` `EXPOSURE.prep` (`PREP_EVAP_W_70` 40 W, "wet skin prep / open body
cavity (tables: large wound 10–30 % of loss) [ENG]"), switched by the `thermal7e` event `exposure: 'prep'`, is the
evaporative wound loss. ET-02's "open-wound" arm and the plan's own surgical-exposure arm use it. The plan's Weakness
(1), "a wound-loss term, which would be a new mechanism in `environment.ts`", is therefore mistaken.

**D5's evidence conflates two rigs.** D5 says "a surgical rig (exposure + wet prep) reaching the plateau at 2.9 h and
losing 0.37 °C/h". The prototype table has two arms:
- exposure + 15 min prep: 2.85 h, **−0.17** °C/h;
- open wound from +15 min: **1.87 h**, −0.37 °C/h.

No single rig does both.

**Reviewer measurement** (Part A tree, ET-01b rig, 7 h; "open wound" = `prep` from +30 min, held):

| `VASOCONSTRICT_C` | rig | vaso onset | onset T | rate h2–3 | tc 3 h | h4–5 |
|---|---|---|---|---|---|---|
| 34.8 (plan) | draped | 4.95 h | 34.80 | −0.291 | 35.05 | −0.081 |
| 34.8 | open wound | 2.07 h | 34.83 | **−0.416** | 34.65 | −0.092 |
| 34.5 (tables) | draped | 6.32 h | **34.50** | −0.300 | 35.03 | −0.171 |
| 34.5 | open wound | 2.43 h | **34.50** | −0.542 | 34.40 | −0.087 |
| 34.8 / 34.5 | draped, 80 y | none in 7 h | — | −0.305 | 34.99 | −0.24 |

**Reading.** Sessler's three numbers describe surgical patients: ≈ 1–1.5 °C in hour 1, then 0.3–0.5 °C/h, then a plateau
at 3–4 h near 34.5 °C. With the existing wound term the linear rate enters the band (−0.42) and the onset is early.
With the tables' threshold the onset temperature enters the band on every rig. The onset **time** is then the only item
still off, and it depends on how much wound loss a rig carries (40 W held from +30 min is a large open cavity).

**Recommendation (better than both the plan's approach and a new wound term):**
- (1) Keep A3's depth cap. It removes an unsourced extrapolation.
- (2) Put `VASOCONSTRICT_C` 34.8 → 34.5 (the tables' `[TXT]` value) to Ali as a **calibration ruling** (R44). The
  executor must not tune it. Then ET-01b's `vasoOnsetC` is in band by construction and stops being an `it.fails`.
- (3) Give ET-01b's time and rate items a **surgical arm** (open wound from incision, using the existing `prep`
  exposure) as their acceptance rig, with `PREP_EVAP_W_70`'s size as the calibration knob for the 3–4 h onset. Keep the
  draped no-wound arm as a recorded demonstration ("no surgery: plateau later"), not as the band's rig. This changes a
  rig, not a band, so R45 holds, but it is a ruling (R-5 below).
- (4) Do not add a new wound heat-loss term.

**E6 as specified does not do what the plan reports.** ET-03a's `d4h` improves from −0.09 to −0.15 only because the
**adult** core at 4 h rises 34.82 → 34.88 (E5's cap). The 80-year-old's core at 4 h is unchanged (34.73), and their
hour-1 fall **shrinks** from −1.19 to −0.98 °C.
- **Cause:** `ageShiftC` is added to the thresholds at every depth, including the awake row. The awake 80-year-old is
  therefore vasodilated before induction (36.9 → 35.9 °C threshold), which empties the redistribution gradient.
- **Sources:** Kurz 1993 measured the threshold **under anaesthesia** only. Frank 1992 reports age as a predictor of
  intraoperative hypothermia [VERIFY the direction and size], not as a protection against it.
- **Fix:** weight the age term by depth (`age · d`, full at the GA row) or apply it to the GA row only. Re-measure
  ET-03a (`dT1hElderly`, `tc4hElderly`, the onset). Cite Vassilieff 1995 for the shivering part (F9b).

## Sources: verified vs partly verified

| claim in the plan | status | note |
|---|---|---|
| Sessler, Anesthesiology 2000;92:578–596 (redistribution, 0.3–0.5 °C/h, plateau 3–4 h) | verified (reference) | band conditions are surgical patients (see E5) |
| Kurz, Plattner, Sessler et al., Anesthesiology 1993;79:465 (elderly vasoconstriction ≈ 1 °C lower) | verified for **vasoconstriction under N₂O/isoflurane** | not for shivering; not for the awake threshold |
| "Kurz, Sessler et al., Anesthesiology 1993;79:1193" (neuraxial shivering −0.5 °C) | **wrong reference** | correct: Anesth Analg 1993;77:721–6. It found **both** thresholds ≈ 0.5 °C lower (D4 lowers shivering only) |
| Matsukawa, Sessler et al., Anesthesiology 1995;83:961 (epidural hour 1 ≈ −0.8 °C) | reference verified; value [VERIFY] | GA twin: Anesthesiology 1995;82:662 (−1.6 ± 0.3 °C) |
| Sessler, Lancet 2008;371:1791 (forced air) | **not found** | likely Anesthesiology 2008;109:318 or Lancet 2016;387:2655 |
| Frank SM et al., Anesthesiology 1992;77:252 (age, epidural vs GA) | reference verified | age is a predictor of intraoperative hypothermia [VERIFY direction/size]; argues against the E6 result in F8 |
| Frank SM et al., Anesthesiology 1995;82:83–93 (hypothermia → catecholamines, MAP) | reference verified; "NA ×4" [VERIFY] | B1 sizing |
| Visoiu et al., Anesth Analg 2014;118:388–396 (onset sooner with sux) | direction verified | sevoflurane-alone median ≈ 45 min, desflurane ≈ 114, halothane ≈ 16 [secondary; VERIFY]. Plan's volatile latency 20 min is short |
| Larach et al., Anesth Analg 2010;110:498–507; Anesthesiology 1994;80:771 | references verified | |
| Wagner, White et al., NEJM 1984;310:1415 | verified | |
| Absalom, Pledger, Kong, Anaesthesia 1999;54:861–867 | **contradicts the t½**: "at least 24 h" | Vinclair 2008 (Intensive Care Med) reports resolution by 48 h |
| Annane et al., Crit Care Med 2017;45:2078 (CIRCI guideline) | verified | supports the vasopressor-dependent hypotension, not the 0.25 size ([ENG]) |
| Bergman, Phillips, Cobelli, J Clin Invest 1981;68:1456 (p2 0.01–0.02/min) | reference verified; values [VERIFY] | the OGTT test rejects p2 < 0.020 (F1) |
| Kitabchi et al., Diabetes Care 2009;32:1335 (insulinopenia, hypertonicity → K⁺ out) | verified (the review lists acidaemia as the third cause) | |
| JBDS DKA 2023 / JBDS-IP 2023 (ketosis within hours; ≈ 100 mL/kg deficit) | guideline, not checked line by line | also the ketone-fall target that F3 needs |
| UK Kidney Association 2020: 10 u insulin + 25 g glucose | verified | A4's 2.5 g/unit |
| Klein & Ojamaa, NEJM 2001;344:501 (AF in thyrotoxicosis 10–25 %) | reference verified; % [VERIFY] | B5 |
| Danzl & Pozos, NEJM 1994;331:1756 | verified | B5 |
| Kurz et al., NEJM 1996;334:1209 | verified | |
| Miller 10e ch. 46 "fever raises VO₂ 10–13 %/°C" | textbook | this is exactly why A8's heat without VO₂ is inconsistent (F2) |

## Boundaries (item 5)

- **FU-7 Task 9 sympathetic seam (B1).** B1 adds its terms to the same `extraSymp` sum with no second seam: right. It is
  missing FU-7's four binding rules: `catReserve` on the cold release only, arm (f) neutral, `antinoc` vs `antinocOp`,
  re-anchor without reordering (F7).
- **B2 ← FU-9 A2.**
  - The dependency is real and correctly gated. FU-9 A2 is one `vo2` line plus comments, its `FU-9 F3` marker makes
    B2's precondition grep valid, and D12's two columns reproduce exactly (above).
  - B2 must land only on the merged tree, and the committed patch must not contain it (F5).
  - B2's `BloodLike.o2` addition collides with FU-9 A4 and is declared. A7's own edit of the same line is not (F14).
- **No duplication with FU-7.** Dexamethasone (Task 18), the incision/laryngoscopy surge (Task 10) and hydrocortisone
  (D13) are handed over, not re-implemented. D10 correctly avoids a second opioid blunting of the cortisol arm. The
  `stressEffects` merge form is stated. A6's permissive term needs the `cortExo` hand-off (F16).
- **No duplication with FU-9.** FU-10 adds no glucose-renal, K⁺-excretion or oxygen-line change; B3/B4 wait for FU-9
  A2/A1. A7's K⁺ terms are 7e set-point shifts through the existing `endoKShift` seam and do not touch FU-9 A6's renal
  K⁺. The Gate re-measures them together, as planned.
- **FU-6 / FU-8.** ET-35 (FU-6 R4) and the insulin reference (FU-8 B1) are handed off correctly. The `basalInsulin`
  schema hand-off to FU-8 A16 is stale (F6).
- **Ownership (R51).** MH stays 7e's (7f publishes exposure times only), the ketoacid pool 7c's (one line under
  E-FU10-2), K⁺ 7c's (set-point shifts). The chain order is untouched. Confirmed in the applied tree.

## Test rules (item 6)

- **Changed existing tests:**
  - `temp.test.ts` is under E-FU10-3, but an assertion is removed (F10).
  - `core.test.ts` is under E-FU10-4. Correct.
  - `neuro/pipeline.test.ts` is under **none** (F10).
  - `glucose.test.ts` goes red without being declared (F1). It must not be re-pinned; the fix is to A5.
- **No band widened.** The new tests' bands match their sources: MH 10–30 min; neuraxial 0.5–1.1 °C (Matsukawa
  −0.8 ± 0.3); shivering 35.3–35.6. The `temp.test.ts` change is a declared re-pin, not a widening, once the removed
  assertion is named.
- **Unreachable targets as `it.fails` with numbers:** the numbers are all stated. Only A2's is written, and A3's four and
  A4's one have no host file (F12). A5's must be restated after F1, and A8's after F2.
- **New slow tests:** every engine file is assigned to SLOW_A in prose. There is no block, and there is no measured
  budget (F13).

## Rulings the project lead must make

1. **R-1 (A5):** drop A5 (nadir stays `it.fails` at 13.3 min) or take p2 = 0.020 (OGTT green; nadir ≈ 14 min, to be
   measured). The reviewer recommends dropping it and routing the nadir to the insulin disposition (FU-8 B1 / 7g).
2. **R-2 (A7):** approve a net ketone rate (production from the current deficit − insulin-dependent utilisation) inside
   E-FU10-2, with a JBDS ketone-fall test. Otherwise A7 waits.
3. **R-3 (A8, Ali):** is fever under GA a presentation state (the patient arrives febrile) or an ongoing heat source
   that GA does not suppress? If a heat source, it must carry its VO₂/VCO₂. Until then ET-12/13a stay `it.fails`
   (36.86 / 36.58 °C).
4. **R-4 (E5, Ali/R44):** `VASOCONSTRICT_C` 34.8 → 34.5 (the tables' value) as a calibration change. The reviewer's
   measurement shows this puts the onset temperature in band on every rig.
5. **R-5 (E5 rig):** ET-01b's rate/time items are graded on a surgical (open-wound) arm with the existing `prep` term,
   and the draped no-wound arm is recorded as a demonstration. Also: does `PREP_EVAP_W_70` (40 W, [ENG]) become the
   calibration knob for the 3–4 h onset?
6. **R-6 (E6):** the age shift applies under anaesthesia only (depth-weighted), not to the awake thresholds.
7. **R-7 (A2):** lower the neuraxial vasoconstriction threshold 0.5 °C as Kurz 1993 found (and accept whatever ratio it
   gives), or keep D4's awake vasoconstriction threshold and record the deviation.
8. **R-8 (A1, Ali Q2):** MH volatile-only latency. Keep 20 min, use agent-specific medians (sevoflurane ≈ 45 min, per
   Visoiu), or make it a seeded draw.
9. **R-9 (A6):** the etomidate recovery t½ (8 h) against Absalom's ≥ 24 h in the critically ill. Also: does exogenous
   glucocorticoid join the permissive SVR term (F16, FU-7 D13)?
10. **R-10 (scope):** the owner of the `basalInsulin` scenario option now that FU-8 A16 has merged, i.e. an FU-10
    exception on `packages/controller` or FU-8 Part B (F6).
11. **R-11 (exceptions):** approve E-FU10-1…8 once 7 and 8 are in the table, plus the missing exception for A1's
    `neuro/pipeline.test.ts` edit (F10).
12. **R-12 (CI):** the slow-a budget for ~11 new FU-10 engine files (≈ 3 min each here). Keep all in SLOW_A or open
    `slow-c` (F13).

## Reproduction (reviewer's scratch; nothing committed besides this file)

- **Block check:** the reviewer's adaptation of `tools/check_plan.py`, which parses the plan document (including
  `### Task` headings and `Create` blocks), applies it to a detached `origin/main` worktree, and reports chains with the
  block that introduced them. Part A = the document cut before "## Part B" plus the Appendix.
- **Trees:**
  - `wt-main` = `42f579e`;
  - `wt-partA` = blocks 1–69 + 4 creates;
  - `wt-proto` = `git apply fu-10-prototype.patch`;
  - `wt-b2` = prototype + FU-9 A2's `vo2` line;
  - `wt-e5` = Part A with `VASOCONSTRICT_C` 34.5.
- **ET runner:** `docs/review-inputs/research/14-coverage-et-scripts/` copied per tree (the repository copy untouched),
  `PME_ENGINE` pointed at each tree. The full matrix was resumed in two disjoint partial stores per tree after a 2-h
  background limit.
- **Probes:** `probe-e5.ts` (the E5 table) and `probe-a7.ts` (the ketone table). Both are read-only engine runs, seed 7,
  MODELED.
