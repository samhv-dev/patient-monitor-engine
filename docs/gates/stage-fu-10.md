# Gate note — FU-10 Part A: endocrine and thermal integration

> **Updated after the FU-7 merge (§10).** Main `4a1cc3f7` (FU-7, PR #32) and later docs (`9ab3a36f`) are merged in. Exceptions E-FU10-12, E-FU10-13 and the glossary entries were approved at the gate. §§1–9 describe the pre-merge state; where §10 differs, §10 holds.

Branch `fu-10-endocrine-thermal`, from `origin/main` `bd5880b` (= `5559533`, FU-9 Parts A + C and Stage 9 merged, plus the
RESUME commit), merged with `origin/main` at the gate twice: `fecbdcc` (showcase hotfix, PR #33) and then `f29951b` (showcase kit #34, preset-test timeout #35). Neither touches an engine file; after the second merge, typecheck, the non-engine packages, build and notices were re-run green. Plan:
`docs/plans/fu-10-endocrine-thermal.md` (written and verified on `1b8bdd3`; its new "Base drift" section lists what moved).
Executor: one local session (Claude Opus 5.5), Tasks A0–A8 in order (A5 dropped, A8 its `it.fails` file only), one fresh-context
review of the whole branch, one fix pass, this gate. **Part B (B0–B7) is NOT in this PR**: FU-7 (PR #32) has not merged.
Every number is seed 7 on this Mac, which three other local agents were using at the same time, so wall times are contended.

## 1. Summary

- **Commits:** the plan; one per task A1, A2, A3, A4, A6, A7, A8, each pushed; glossary entries 324–332 (339–347 after the FU-7 merge); the slow-group
  spread; the base-drift note; the review fix (I1/I2); the two 7g test lines (E-FU10-13); the merge of `origin/main`.
- **Blocks:** Task A0 mechanically re-checked all of Part A's blocks on this base: **71 find/replace + 14 creates, 1 drifted**
  (the `BloodLike` type line FU-9 gave `sigma`; the plan's own Overlap line gives the merged form, which is what was applied).
  The other 70 applied byte for byte, and the 6 chained blocks were exactly the ones the plan marks.
- **New tests:** fast `test/l2/thermal/fu10-{mh-exposure,neuraxial,thresholds}`, `test/l2/endo/fu10-{insulin-dextrose,adrenal,insulin-deficit}`,
  `packages/controller/test/scenario/fu10-basal-insulin`; slow `test/engine/fu10-{mh-trigger,thresholds,insulin-dextrose,adrenal,insulin-omission,fever}`;
  helper `test/helpers/fu10.ts`.

## 2. Suites (merged tree `4b89bcd` unless noted; `CI=1`, local)

| check | result |
|---|---|
| `pnpm -r typecheck` | clean |
| fast set (`PME_TEST_SET=fast pnpm -r test`) | engine-core **301 files / 1305 passed, 1 skipped** (base: l2 alone 191 / 872); audio 58, skins 191, controller 40 / 227, ventilator 97, renderer 90, validation 107 (+11 skipped), demo 200 — all green |
| slow groups (head `bd38112`, all four run in parallel on the contended Mac) | slow-a 30 files 2795 s, slow-b 39 files 2937 s, slow-c 17 files 2740 s, slow-d 20 files 2860 s. All green, except one 7g PK test in each of slow-a and slow-c, both fixed in `876c45b` (E-FU10-13, §5) and re-run green |
| slow-group disjointness (ci.yml's check) | `slow` 106 = 30 + 39 + 17 + 20, no overlaps, nothing missing |
| `pnpm build`, `pnpm check-notices` | OK; notices OK (3 governed files) |
| `pnpm test:e2e` (Chromium + WebKit, merged tree) | **90 passed, 30 skipped, 4 failed under load.** Re-run alone: `showcase-clock` (Chromium) and `stage6a-screens` (WebKit) pass. Two Chromium WebRTC loopback tests still fail, `stage6a` host+remote+viewer over rtc and `stage6a-latency`, and **they fail identically on the base `bd5880b`**: this Mac's loopback WebRTC, not FU-10 (no FU-10 file is on those paths). The e2e run rewrites tracked gate screenshots; they were restored, none committed |
| truth tree (`truth-event`, cap 2,100) | live tree 1368 → **1374** (+6); synthetic 12-drug tree 2075 → **2076**. Under the cap, so no `SKIP_PATH` change. Labels: glossary 324–332 |

Under load, two timing-sensitive tests in untouched files failed and then passed when run alone: `truth-event`'s cost
check (2.33 ms against 1 ms under load; 0.31 ms alone) and ventilator `ports` (a 5 s timeout). Neither is in a file this
branch touches.

**Slow-group placement (ruling R-12 predates the four groups).** All four groups were at 35.8–37.6 min on CI, so no single
group could absorb the six files. The serial local times are thresholds 334 s, insulin-omission 231 s, adrenal 101 s,
insulin-dextrose 100 s, mh-trigger 43 s and fever 34 s (843 s in total). They were spread greedily: thresholds to slow-b;
insulin-omission to slow-d; adrenal and mh-trigger to slow-a; insulin-dextrose and fever to slow-c. The CI job limit is
90 min. The orchestrator should re-split from the PR's CI per-file times if any group passes about 40 min.

## 3. Acceptance numbers, before (base) → after (this branch)

| Task | Measurement | Before → after | Band / plan |
|---|---|---|---|
| A1 (E1) | sux + sevoflurane at 300 s, MV held: EtCO₂ doubles | never → **+18.2 min** | 10–30 min; plan 18.2 |
| A1 | sevoflurane alone: MH activity > 0.05 | never → **+48.5 min** | 40–60; plan 48.5 |
| A1 | not susceptible: MH activity max | 0 → 0 | 0 |
| A2 (E3) | neuraxial heat model, hour 1 | GA −1.25 → neuraxial **−0.86 °C**; shivering from **35.49 °C** (was never) | −0.5 to −1.1, < GA; 35.3–35.6 |
| A3 (E5) | surgical arm: hour 1 / hours 2–3 / onset / plateau | **−1.44 °C / −0.492 °C/h / 34.50 °C / −0.087 °C/h** | Sessler bands; all as in the plan |
| A3 | surgical onset time | **2.27 h** | 3–4 h → `it.fails` (plan, R-5) |
| A3 | draped demonstration | onset 6.18 h at 34.549 → **6.28 h at 34.50** | recorded only; plan said 6.30 |
| A3 (E6) | 80 y vs 40 y: onset temperature, core at 4 h | **33.50 vs 34.50; 33.43 vs 34.28** | −0.7 to −1.3; < −0.2 |
| A3 | Stage 3 GA heat model, hour-8 plateau | **34.37 °C** | ≥ 34.5 → `it.fails` (E-FU10-3b) |
| A4 (E8) | combined row: glucose max / min | 0.00 / 0.00 → **+11.17 / −2.68 mmol/L** | > 3 / < −1 |
| A4 | combined row: K⁺ at 60 min | −0.86 → **−1.15** | −1.0 to −0.6 → **`it.fails` (E-FU10-12, §5)** |
| A5 (E12a) | insulin nadir | 13.3 min (unchanged) | 20–30 → `it.fails` (plan, R-1) |
| A6 (E10) | etomidate vs propofol: cortisol at 4 h | ratio 1.005 → **0.653** (1025 vs 1570) | ≤ 0.8 |
| A6 (E13) | adrenal insufficiency: post-induction MAP / phenylephrine ratio / surgical ΔMAP | **69.4 vs 72.7 / 0.67 / −3.9** | < normal − 2 / ≤ 0.8 / ≤ −5 → `it.fails` "measured −3.9" (plan's base −4.2) |
| A7 (E7) | type 1, basal omitted 6 h: glucose / ketones / pH / K⁺ | **35.5 / 11.55 mmol/L / 7.31 / 6.00** (on basal: 7.2 / 0 / 4.17) | > 20, > 3, > on-basal + 0.5 |
| A7 | insulin 0.1 U/kg/h from 6 h | ketones **11.55 → 8.90 (0.88 mmol/L/h)**, glucose 5.1, K⁺ 3.24 | ≥ 0.5 /h (JBDS) |
| A8 (E11) | sepsis / thyroid storm under GA: core | **36.60 / 36.34 °C** (36.86 / 36.58 before A3) | ≥ 38.5 → `it.fails` (R-3) |

## 4. ET runner (research/14), all 72 cells, before → after (automatic verdicts)

**Before** (base): PL 35, WR 13, TW 10, TS 4, MI 2, NE 8. These equal the plan's "main" column exactly.
**After** (Part A plus the review fix; endocrine cells re-run on the fixed head): **PL 38, WR 10, TW 9, TS 5, MI 2, NE 8.**

| Cell | Before → after | Note |
|---|---|---|
| ET-10a | WR → **PL** | `mhDevelops` true; EtCO₂ max 28.4 → 52.5 |
| ET-10b–g, ET-11a–c, ET-M2 | unchanged | instructor MH: every value identical |
| ET-04 | WR → **TS** | hour 1 −1.07 → −0.85; ratio to GA 0.90 → 0.71 (accepted, R-7); 3 h 34.41 → 35.30; shivers from 35.48; depth 1 → 0 |
| ET-01b | WR → WR | linear phase −0.293 → −0.301 °C/h; onset 6.18 → 6.28 h at 34.549 → 34.50 (draped rig: no wound) |
| ET-02, ET-03a/b, ET-29 | unchanged verdicts | cold arms 34.51 / 34.77 → 34.30 / 34.61; child at 3 h 34.68 → 34.43; elderly `d4h` −0.09 → −0.04 (MI kept); exposure −0.51 → −0.53 |
| ET-07 | TW → **TS** | cold blood core −0.89 → −1.02 °C (band −0.5 to −1.0; the R-4 consequence the plan reports; Ali Q12) |
| ET-31 | WR → **PL** | combined row glucose +6.93 / −2.42 (= the two-row arm); K⁺ combined −0.86 → −1.15, two-row −0.80 |
| ET-20a–c | unchanged | K⁺ at 60 min −0.75 → −0.75 (the pre-fix −0.59 came from review finding I1, now gone); nadir 13.3 min |
| ET-34 | TS → **PL** | etomidate cortisol 1582.6 → 1030.9 nmol/L, ratio 1.005 → 0.655 |
| ET-15a | TW → TW | AI post-induction MAP 73.5 → 70.0; surgical −0.8 → −4.1; phenylephrine ratio 0.78 → 0.67; cortisol 466 → 233 |
| ET-16a–c, ET-17 | unchanged | ΔMAP ≤ 0.04, cortisol ≤ 0.4 nmol/L |
| ET-18a–c | unchanged (profile on basal insulin) | scratch arm with `basalInsulin: false` (the plan's request): glucose 31.9 mmol/L at 4 h, ET-18b → PL, ET-18c TS (insulin-infusion glucose fall −13.8 mmol/L/h vs −2 to −4) |
| ET-23a–d | 23c WR → **TW** | instructor `dka 1`: K⁺ 3.69 → 4.48 (healthy 4.18); after intubation +0.01 → +0.38; HCO₃ 4.32 → 4.80 |
| ET-26a | TW → **WR** | the CO criterion improved (ΔCO −0.41 → −0.56, now PL), but septic lactate moved +0.01 → 0.00, which flips the automatic sign grade. The lactate row is Part B's B3 (FU-9 A2). The hand verdict stays TW |
| ET-26b/c | PL | noradrenaline ratio 0.30 → 0.31; dobutamine ΔCO +0.36 → +0.85 |
| ET-09a | PL | CO at 28 °C 3.44 → 4.33 (as in the plan); HR and Osborn unchanged |

## 5. Declared exceptions (beyond the plan's E-FU10-1 … 4, 9, 10)

- **E-FU10-12** (`test/engine/fu10-insulin-dextrose.test.ts`): the combined-row K⁺ band is held as `it.fails` "measured
  −1.15". The plan measured −0.96 with all of Part A applied, but the final review found that number depended on an
  artefact (I1, below). Without the artefact the fall is the two pre-existing K⁺ sources the plan's D6 names (7c's curve
  and the insulin secreted for the row's 25 g of dextrose; Ali Q4). Not tuned (R44/R45).
- **E-FU10-13** (7g test files, outside the plan's partition):
  - `pk-longrun`: FU-9's declared `it.fails` (TCI propofol Ce 2.5 ± 0.005, measured 2.5098) now measures **2.4995**
    (base 2.5097), back inside the unchanged band. It flips to `it`.
  - `pk-acceptance-pk`: the documented free-core Eleveld Ce **2.996568 → 2.996590** is re-pinned at the same 5-decimal
    precision. Bisected to Task A3: with the core pinned, the PK context is identical. A3's 34.5 °C threshold keeps the
    patient vasodilated a little longer, so the free core cools slightly faster.
- **Glossary** (`apps/demo/src/app/glossary-data.ts`, a UI-data file): entries 324–332 (renumbered **339–347** after FU-7's 324–338) label FU-10's new truth leaves, as
  the brief asks and as FU-9 did. They are `resp.temp.ageY`, `endo.ageY`, `endo.core.etomSuppr`, `endo.core.ketoDef`,
  `blood.core.endoKetoMmolMin` / `UtilPerMin`, `neuro.mhExposure.{sux,volatile,volatileAgent}` (two `KEY_LABELS`) and
  `endo.mhOwner`.

## 6. Final review (fresh-context reviewer, whole branch) and the fix pass

**0 Critical, 2 Important, 7 Minor.**

- **I1, fixed.** A non-diabetic given insulin was treated as insulinopenic once hypoglycaemia had suppressed its
  secretion. It made ketones, and its K set point rose +1.1 mmol/L at 90 min.
- **I2, fixed.** The instructor's `dka 1` added production on top of its own pool: 25 → 49 mmol/L in 12 h, with no bound.
- **The fix (`bd38112`):** the ketogenic deficit is measured only in a patient without β-cell reserve (type 1), and the
  instructor's `dka` keeps its K⁺ efflux. Both cases were reproduced RED (0.40 and 0.49 mmol/min) and are GREEN after.
  The A7 numbers are unchanged.
- **Deferred minors, for the orchestrator:**
  - M1: pre-FU-10 snapshots restore without NaN but are not upgraded (`version.ts` 0.0.0).
  - M2: etomidate's `mg/kg` branch is dead (7g sends `mg`), and infusions are not observed.
  - M3: the `vasoconstricted` flag can never be true under neuraxial.
  - M4: neuraxial basal metabolism is no longer ×0.8 (≈ +16 W). The Vassilieff spinal source vs the depth-weighted age
    term goes to the calibration queue.
  - M5: future `fu10-*` files default to slow-b.
  - M6: the ketone statement runs beside the `metabolic ketoacidsMmolL` ramp.
  - M7: an instructor MH cleared before any exposure lets the triggers start MH later (defensible).

## 7. `audit:physiology` (the FU-4 check)

Main (`bd5880b`) → Part A before the review fix (`1f67673`):

- **Every arrest time is identical**: the tamponade, exsanguination, tension-PTX, hyperkalaemia, VF/CPR and MH rows.
  F4-mh's "min HR in the last minute" moves 175 → 177.
- The propofol state-dependence table moves in ONE row, warm septic shock: ΔMAP −28.2 (unchanged), ΔHR −46 → −45, ΔCO
  −0.44 → −0.65 L/min. The plan predicted −0.46 → −0.51 on its base.
- Timeline rows differ only in the second decimal.

**Re-run on the fixed engine** (`bd38112`, the engine of the merged tree):
- Every arrest time is identical; F4-mh's minimum HR is 175 → 177.
- Warm septic shock: pre-dose MAP / HR / CO unchanged (77 / 137 / 5.12), ΔMAP −28.2 unchanged, ΔHR −46 → −45, ΔCO
  −0.44 → **−0.59** L/min. The septic GA-flag rig runs cooler after A3, as the plan says.
- The 80 y hypertensive and AS + CAD rows are unchanged.

## 8. Base drift and what was done

The plan's "Base drift" section is the record. In short:

- One block was adapted (FU-9's `sigma`).
- The R-12 slow placement was re-done for the four-group scheme.
- Numbers moved by the base, with no block change: draped onset 6.30 → 6.28 h; AI surgical ΔMAP −4.2 → −3.9; omitted-insulin
  K⁺ 6.05 → 6.00; A8's titles re-stated to the measured post-A3 cores.
- Plan ordering defect: A4's engine test was committed with A7. The review then showed that the band had been met only
  through I1, so it is now E-FU10-12.

## 9. Not done / open

- **Part B (B0–B7)** waits for FU-7 (PR #32): B1, B5, B6 and B7 need FU-7's files; B2, B3 and B4 need FU-9, which has merged.
- **Ali:** Q2 (MH severity draw), Q4 (the two insulin K⁺ sources, now E-FU10-12), Q7 (fever, A8), Q12 (ET-07).
- **Requests:** the ET runner owner (ET-10a/b rigs after FU-6, and ET-04's wrong Kurz reference); the insulin disposition
  (FU-8 Part B).

## 10. After the FU-7 merge (main `4a1cc3f7`, then `9ab3a36f`; branch head after the merge `90d34028`)

**Conflicts (both sides kept):**
- `stressEffects(c.hormones, …, cortResponseOf(c), x.cortExoNmolL ?? 0)`, the plan's stated merged form.
- `createHormones(cortBasalF)` with FU-7's `surge` and `catReserve`.
- The `effects.ts` import list.
- Glossary: FU-10's entries renumbered 324–332 → **339–347**, after FU-7's 324–338. KEY_LABELS comment updated; `glossary.test` 6/6.
- Slow groups: re-placed for six groups (below).

The exogenous glucocorticoid joining the permissive SVR term stays Part B (B7).

**The drug bus FU-10 reads, re-verified against FU-7:**
- The dose log is still `DoseLogEntry {agent, amount, amountUnit, mgPerKg}`.
- Row ids and units are unchanged: `etomidate` mg, `insulin` and `insulinDextrose` units, `dextrose` mg, `succinylcholine` through 7f's NMB dose site.
- 7f's `macPotent`, `x.et[*].fet` and `macAge` are unchanged.
- Typecheck is clean, and every FU-10 acceptance number below is reproduced.

**Truth tree:** live 1399 leaves; synthetic 12-drug tree **2078** of 2,100 (FU-7 alone 2,077). No cap change.

**Slow groups (six, CI per-file times from PR #37 run 37199560174 and FU-7's PR run 37199184387).**
- FU-10's six files took **2,208 s on CI**: thresholds 804, insulin-omission 670, adrenal 389, insulin-dextrose 152, mh-trigger 145, fever 48.
- FU-7's groups ran a 1837, b 1573, c 2295, d 2075, e 2222, f 862 s. That leaves ≈ 2,050 s of room under 35 min in total, less than FU-10 needs.
- Best fit without a seventh group (a seventh would mean editing `.github/ci.yml`, which the plan forbids):
  - slow-f + thresholds, insulin-dextrose, mh-trigger, fever: ≈ 2,011 s
  - slow-a + adrenal: ≈ 2,226 s
  - slow-b + insulin-omission: ≈ 2,243 s
- Estimated maximum ≈ 37 min. CI sums vary a lot between runs: slow-c measured 1,171 s on PR #37 against 2,295 s on FU-7's PR, for nearly the same files.
- Disjointness: `slow` 113 = 29 + 39 + 15 + 19 + 5 + 6, no overlap, nothing missing.

**Suites on the merged tree:**
- typecheck clean; build and check-notices OK.
- Fast set: engine-core **310 files / 1386 passed, 1 skipped**; audio 58, skins 191, controller 227, ventilator 97, renderer 90, validation 107 (+11 skipped), demo 200.
- Two load-sensitive tests failed under load and pass alone: `truth-event` cost (0.38 ms/call alone) and ventilator `ports`.
- slow-a, slow-b and slow-f all green after the flip below: 29 / 39 / 6 files; slow-a had 1 failure before the flip.
- `pk-acceptance-pk` green.
- Stage 9 + showcase e2e, Chromium and WebKit: 28 passed, 6 skipped, 2 failed (`showcase-clock` in both browsers: the scenario card's Load button never became visible within 90 s on the loaded Mac). Re-run alone it passes 2/2, and it passes 2/2 on main. FU-10's only `apps/demo` change is the 12 glossary lines. The run rewrote tracked screenshots; they were restored.

**7g tests (E-FU10-13) on the merged tree:**
- `pk-longrun`: TCI propofol Ce **2.4995**, identical to pre-merge, so `it` stays true. Main without FU-10 still carries FU-9's `it.fails` 2.5098.
- `pk-acceptance-pk`: free-core Ce **2.996590**, identical, so the re-pin stands. Main pins 2.996568, and FU-7 did not change this line.

**A newly-true `it.fails`, flipped to `it`:** adrenal insufficiency, surgical MAP ≥ 5 mmHg below normal (ET-15a). Measured **−3.9 → −8.1** (`9beab853`).
- Why: FU-7's stimulus surge (Task 10, addendum 25) now carries the incision's pressor response, and it is scaled by the patient's vasopressor responsiveness, which FU-10's basal-cortisol deficit lowers.
- ET-15a: healthy surgical MAP 87.4 → 96.5; adrenal-insufficient 83.3 → 88.2.
- FU-7 alone gives Δ −3.3, FU-10 alone −4.1, merged −8.3: an interaction, not either plan alone.

### Acceptance numbers, pre-merge → merged

| Task | Pre-merge | Merged | Note |
|---|---|---|---|
| A1 sux / sevoflurane alone / not susceptible | +18.2 / +48.5 min / 0 | +18.2 / +48.5 / 0 | — |
| A2 neuraxial hour 1 / GA / shivering | −0.86 / −1.25 / 35.49 °C | same | — |
| A3 surgical h1 / linear / onset °C / plateau / onset h | −1.44 / −0.492 / 34.50 / −0.087 / 2.27 h | same | — |
| A3 80 y vs 40 y (onset; core at 4 h) | 33.50 vs 34.50; 33.43 vs 34.28 | same | — |
| A4 combined row glucose / K⁺ at 60 min | +11.17 / −2.68; −1.15 | same | E-FU10-12 `it.fails` holds |
| A5 insulin nadir | 13.3 min | 13.3 | `it.fails` holds |
| A6 etomidate cortisol ratio | 0.653 (1025 vs 1570) | 0.653 (1025 vs 1569) | rounding |
| A6 AI post-induction MAP / phenylephrine ratio / surgical ΔMAP | 69.4 vs 72.7 / 0.67 / −3.9 | 69.4 vs 72.7 / **0.65** / **−8.1** | ΔMAP: FU-7's surge × FU-10's lower vasopressor responsiveness (above). PE ratio −0.02: FU-7 raises both arms' pressor rise (ET-15a 29.7/44.0 → 41.1/62.2 mmHg) |
| A7 omitted 6 h: glucose / ketones / pH / K⁺ | 35.5 / 11.55 / 7.31 / 6.00 | same | — |
| A7 treated | 11.55 → 8.90 (0.88 /h), glucose 5.1, K⁺ 3.24 | same | — |
| A8 sepsis / storm under GA | 36.60 / 36.34 °C | same | `it.fails` hold |

### ET matrix, all 72 cells: base → pre-merge → merged (automatic verdicts)

| | PL | WR | TW | TS | MI | NE |
|---|---|---|---|---|---|---|
| base `bd5880b` | 35 | 13 | 10 | 4 | 2 | 8 |
| FU-10 pre-merge | 38 | 10 | 9 | 5 | 2 | 8 |
| merged (FU-10 + FU-7) | **38** | **9** | **9** | **6** | 2 | 8 |

**Verdict changes pre-merge → merged:**
- ET-08b PL → TS: FU-7's rocuronium (t25 hypothermic 164 → 132.5 min, normothermic 60.5 → 44, ratio 2.71 → 3.01).
- ET-19 WR → TW: FU-7 Task 18's dexamethasone (glucose +0 → +1.83).
- ET-15a TW → PL: the interaction above.

To attribute every number that moved by more than rounding, those cells were run on main (FU-7 without FU-10):

| Cell | Metric | Base | FU-10 pre-merge | Main (FU-7 only) | Merged | Attribution |
|---|---|---|---|---|---|---|
| ET-05a | shivering VO₂ %, cold CO | 46.9 %, 5.7 | 67.9 %, 5.7 | 46.4 %, 5.5 | 67.3 %, 5.5 | VO₂: FU-10 (A3, as the plan); CO: FU-7 |
| ET-08b | t25 hypothermic / normothermic | 164 / 60.5 | 164 / 60.5 | 132.5 / 44 | 132.5 / 44 | FU-7 |
| ET-09a | HR / MAP / CO at 28 °C | 47 / 65.5 / 3.71 | 40 / 66.9 / 4.33 | 47 / 65.5 / 3.70 | 47 / 65.5 / 3.71 | FU-10's pre-merge change at 28 °C disappears on the FU-7 base |
| ET-10a | MH develops / EtCO₂ max | no / 28.4 | yes / 52.5 | no / 28.4 | yes / 52.5 | FU-10 (A1) |
| ET-11a | dantrolene t½ / peak core / K⁺ change at 30 min | 340 s / 39.0 / −0.43 | same | 560 s / 39.25 / −0.32 | 560 s / 39.24 / −0.32 | FU-7 |
| ET-13a | esmolol HR % | −28.4 | −29.0 | −32.3 | −32.3 | FU-7 |
| ET-15a | ΔMAP surgical / PE ratio | −0.8 / 0.78 | −4.1 / 0.67 | −3.3 / 0.76 | −8.3 / 0.66 | interaction (above) |
| ET-16a | incision ΔMAP F0 / F2 / F5, ΔHR | 7.7 / 2.1 / −9.6, 6 | same | 19.0 / 5.9 / −7.4, 13 | 19.0 / 6.3 / −7.7, 13 | FU-7 (Task 10); FU-10 adds ≤ 0.4 |
| ET-19 | dexamethasone glucose | 0 | 0 | +1.83 | +1.83 | FU-7 |
| ET-20a | K⁺ at 60 min | −0.75 | −0.75 | −0.73 | −0.73 | FU-7 |
| ET-M3 | incision ΔMAP | 3.0 | 3.0 | 14.8 | 14.8 | FU-7 |

Every other cell differs from pre-merge only in rounding, or in values FU-7 owns. Two examples: the ET-10b–g K⁺ at 20 min 5.59 → 5.58, and ET-10a's event marks, which gained FU-7's 179 s apnoea mark.

**`audit:physiology`, main (FU-7) → merged:**
- Every arrest time identical; F4-mh's minimum HR 175 → 177.
- Warm septic shock: ΔHR −46 → −45, ΔCO −0.44 → −0.59.

These are exactly FU-10's moves on the pre-FU-7 base, now reproduced on the FU-7 base.
