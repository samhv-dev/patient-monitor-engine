# FU-9 plan — R50 review (blood, fluids and acid–base integration)

*Reviewer: cloud R50, read-only, 2026-09-29. Branch `review/fu-9-plan` (9bb5683). Plan `docs/plans/fu-9-blood-fluids.md`
(2,598 lines, written on `76c952e`), prototype `docs/plans/fu-9-prototype.patch`. Verified against `origin/main` as it is
now: **`2e94f55`** (V.1 merged; 24 commits past the plan's base, 42 files outside `docs/` changed — `l2/gas/params.ts`,
`l2/lung/**`, `l2/resp/pipeline.ts`, `packages/ventilator/**`). Also read: `docs/review-inputs/README.md`,
`rulings-excerpt.md`, research/22 (the source), 19, 20, 12 §5.10, 08, and the FU-6, FU-7 and FU-8 plans. For FU-8 the
current plan on `origin/fu-8-followups` (after its R50 fixes) was used, because it supersedes the copy on this branch. All
scratch work (worktrees, variant trees, BF stores, logs) was kept in the session scratchpad. Nothing in the repository
was changed except this file.*

## Verdict: **APPROVE WITH FIXES**

The plan is mechanically sound and reproduces on the current main:
- every block matches exactly once;
- the applied tree is byte-identical to the prototype;
- typecheck, the fast set, the 9 new slow files and the 20 existing slow files it names all pass;
- the BF matrix reproduces its before → after verdict totals exactly.

Eight of the eleven mechanisms are the right smallest mechanism in the right owner's file. The chaos claim for the PE and
tension-PTX arrest times is confirmed.

Three problems must be fixed **before execution**:
1. **F5's headline pass comes from an artefact** (F1 below). The massive-transfusion BE ≤ −10 is carried by
   product-composition rows that are not electroneutral. With a SAGM-realistic RBC citrate the BE nadir is −7.1 and the
   cell fails.
2. **F8's globulin model makes 5 % albumin hypo-oncotic** (F2). 5 % albumin comes out at 15.6 against plasma's
   22.35 mmHg, although it is iso-oncotic by definition. As a result the isovolaemic exchange cells turn WR, and a better
   form exists that keeps normal physiology identical.
3. **FU-8 now hands FU-9 the one continuous body-size rule** (`l2/body-size.ts`, `sizeWeightKg`), and the plan has no
   task that adopts it (F3).

Also needed before the gate:
- **F4**, a "must stay PL" regression;
- **F5**, stale gate expectations that would stop the gate;
- **F6**, a leak in A7's "resting patient exactly unchanged";
- **F10**, the slow-a budget: FU-9 adds ≈ 25 min serial, where the plan says ≈ 11.

F7–F9, F11 and F12 are minor.

---

## Mechanical results

### (1) Blocks and prototype

A block parser (every `In \`path\`, find:` / `find:` / `replace with:` / `Create \`path\`:` block, in document order)
found **60 find/replace + 20 creates**.

| check | result |
|---|---|
| each find on the untouched base `76c952e` | 60/60 exactly once |
| each find on the untouched **current `origin/main` `2e94f55`** | **60/60 exactly once** (no block went stale with V.1) |
| each find in the applied state at its turn (task order), on both bases | 60/60 exactly once, 0 problems |
| applied tree vs `git apply fu-9-prototype.patch` | **byte-identical** on both `76c952e` and `2e94f55` (`diff -r` empty; the patch applies cleanly to both) |
| FU-9 on top of FU-8 Part A (FU-8's own checker, `--part A --apply`, current plan) | FU-8 146 + 24, 0 problems; then FU-9 60 + 20, **0 problems** |
| FU-9 on top of FU-8 Parts A + B | FU-8 174 + 27, 0; FU-9 0 problems |
| FU-6 composition | not mechanically checkable today: FU-6's own applier fails 9 of its blocks on current main (V.1 moved `resp/pipeline.ts`, `truth.ts`, a test — FU-6's problem, not FU-9's). The one shared line (A7 ↔ FU-6 Task 13) was checked by eye: FU-6's form `paco2SetPoint(s.paco2Rest - (x.setShift ?? 0), x.hco3)`, FU-9's merged form adds `, x.paco2`; `SpontInputs.paco2` exists; semantics below (F6) |

### (2) Suites (applied tree = current main + the whole plan, Parts A + B)

| suite | result |
|---|---|
| `npx -y pnpm@9.15.9 install --frozen-lockfile` | OK (3.3 s) |
| `-r typecheck` | clean (all 7 packages) |
| `CI=1 PME_TEST_SET=fast` engine | **277 files / 1,220 passed, 1 skipped** (the plan says 275 on `76c952e`; +2 from V.1). Includes the 10 new fast unit files |
| the 9 new slow files `test/engine/fu9-*.test.ts` | **9 files / 14 tests passed** (5 `it.fails` hold) |
| the 20 existing slow files the plan names (FU-4: `clinical-suite`, `circ-lowflow-arrest`, `circ-hypoxic-arrest`, `blood-k-rhythm`, `fidelity-lowflow`; 7c/7d/7e/7f: `blood-sanity-acid/-haem`, `blood-hyperk`, `blood-stage3-recheck`, `organs-renal/-curves/-tbi/-tbi-treatment/-soak`, `endo-acceptance`, `endo-circ-acceptance`, `neuro-spont`, `neuro-engine`; B2: `lung-copd`, `resp-coupling`) | **20 files / 130 tests passed** |
| slow-group membership (`vitest list --filesOnly`) | slow-a 9 `fu9-*`, **slow-b 0**, fast 10 (the l2 unit files) |

The new tests print the plan's numbers:

| test | printed |
|---|---|
| F1 retention | awake 0.22, GA 0.36; class III 0.51 vs GA 0.36; RBC +0.66 |
| F3 | SvO₂ 55.8 % (control 85.7), ER 0.46, lactate 3.02 |
| F4 | σ 0.70, ΔEVLWI 1.18 (vs healthy 2.57) — see F11 on the PaO₂ number |
| F5 | iCa 0.72, BE −10.9, lactate 7.5, no arrest |
| F6 | ΔK −0.042 |
| F7 | PaCO₂ 44.1, HCO₃ 26.02, pH 7.383, +3.41 per 10 mmHg |
| F9 | PaCO₂ 45.3 vs 39.0, pH 7.497 |
| F10 | T1 25 % at 46.8 vs 35.8 min |
| F11 | Na 119.5, water +1.73 mL, ΔICP +0.24 |

No test rewrote a tracked file: `git status` on the applied tree shows only the plan's own changes.

Serial wall time of the 9 new slow files: see F10.

### (3) BF runner (read-only, 74 cells, seed 7) — current main vs current main + plan

Two copies of `research/22-audit-scripts` ran against a plain `origin/main` tree and the applied tree
(`PME_ENGINE=…`, `BF_OUT=…`).

| | PL | TW | TS | WR | MI | IN | NE |
|---|---|---|---|---|---|---|---|
| main `2e94f55` (automatic) | 26 | 11 | 10 | 7 | 1 | 0 | 19 |
| main + plan (automatic) | **34** | 9 | 6 | 5 | 1 | 0 | 19 |
| the plan's table | 26 → 34 | 11 → 9 | 10 → 6 | 7 → 5 | 1 | 0 | 19 |

The hand-graded store verdicts are identical in both runs (PL 23, TW 9, TS 6, WR 12, NE 19, IN 1, MI 4), because the
HAND overrides are keyed in the cell specs. Compare the automatic column, as the plan does.

**Every targeted cell reproduces the plan's "prototype" column to the printed precision:**

| cell | measure | main → plan |
|---|---|---|
| BF-02a | retention awake / GA | 0.52 / 0.53 → **0.22 / 0.36** |
| BF-02b | class III − GA | 0 → **0.15** |
| BF-04 | Hb at 1 h | +0.546 → **+0.658** (`it.fails`) |
| BF-05a | iCa nadir | 0.30 → **0.72** |
| BF-05d | BE nadir; lactate peak; arrest | −5.6 → **−10.897**; 21.1 → **7.35**; arrest → **none** |
| BF-08d | ΔK with furosemide | −0.002 → **−0.042** |
| BF-09b | rocuronium delay | 0 → **+10.8 min** |
| BF-11b | ΔICP max | 0.07 → **0.33** |
| BF-15b | ΔPaCO₂ | −0.107 → **+6.288** |
| BF-16b | per 10 mmHg | 1.32 → **3.42** |
| BF-20a | septic ΔEVLWI | 0 → **0.716** |
| BF-22a | COP | 8.655 → **13.107** |
| BF-22b | ΔAG | −0.164 → **−4.862** |
| BF-29b | SvO₂ | 77.8 → **55.8** |

**The three cells the plan did not target:**

| cell | main → plan | verdict | reviewer's note |
|---|---|---|---|
| **BF-12** (7.5 % saline 250 mL: Na at 45 min, band 4–7) | +6.917 → **+7.08** | PL → **TS** | Confirmed. research/22 §5 lists BF-12 in the **"regression (PL today) … must stay PL"** set → F4 |
| **BF-03a** (5 % albumin in class II: volume effect at 60 min, band 0.7–1) | 0.93 → **0.75** (end 0.99 → 0.92) | PL → PL | Confirmed, but it is a symptom of F2 (5 % albumin now hypo-oncotic) |
| **BF-18a/18b/19** (isovolaemic exchange / ANH with 5 % albumin) | 18a ΔBV +233 → **−150 mL** (WR → TW); 18b CO +2.3 → **−1.8 %** (TW → **WR**); 19 CO **+8.3 → −0.5 %**, DO₂ −21 → −25.1 % (TS → **WR**) | 2 cells turn WR | The plan's table says BF-19 goes 6.6 → −3.1 and BF-18b goes to −1.4. On current main BF-19 starts at +8.3 %: V.1 moved it. BF-18a's WR → TW is not in the plan's table. All three come from F2 |

Other moved cells, as the plan describes:

| cell | main → plan |
|---|---|
| BF-01a | Cl 5.445 → 5.176; BE −0.451 → −0.616 |
| BF-01b | BE vs saline 2.2 → 2.12 |
| BF-14 | retained 3351 → 2495 mL |
| BF-05b | ΔK peak 0.69 → 1.34 |
| BF-21a/b | PAWP 29 → 27; EVLWI 5.63 → 3.42 |
| BF-21c | SpO₂ min HF 94 → 96, MR 90 → 93 |
| BF-20a healthy arm | PaO₂ −5 → **+4** (not in the plan's table) |

### (3b) The arrest-time shifts: chaotic, not an effect of A7's physiology — **confirmed**, with a wider envelope

`audit:physiology` was run in full (all scenarios) on main and on the applied tree, with `PME_ENGINE` and
`PME_AUDIT_OUT` in scratch. The "## Propofol" and "## Arrests" tables were then diffed. The moved rows are:
- the plan's D13 list: D0 1775 → 1770 s, D2 1350 → 1310 s, F2's minimum HR 61 → 59, and the septic-shock propofol row
  (CO 5.22 → 5.09, nadir 85 → 65 s, ΔHR −59 → −46, ΔCO −0.30 → −0.70, MAP −31.2 → −31.3 %);
- second-decimal CO changes in the HFrEF, hypovolaemia, PE and MANUAL rows;
- **plus the tension-PTX propofol row's nadir time 80 → 85 s (HR 130 → 131), which is not in the plan's gate list.**

**K-ptx is 675 s on current main and stays 675 s.** The plan expects 670 → 675, and its PTX matrix row "t+10 → t+15 s"
is already t+15 on main. Both come from main moving (F5). Every other arrest row is identical: B2/B7, C1, C4, G2b, G3,
G3b, F4, I1.

Targeted runs of D0, D2 and K-ptx:

| tree | D0 | D2 | K-ptx |
|---|---|---|---|
| main | 1775 | 1350 | 675 |
| main + **A7 only** | 1770 | 1310 | 665 |
| main + whole plan | 1770 | 1310 | 675 |
| main, set point **+3.1476 × 10⁻⁴ mmHg** (no alkalosis logic) | 1770 | 1310 | 665 |
| main, set point **−3.1476 × 10⁻⁴** | 1770 | **1285** | **680** |
| main, set point **+1 × 10⁻⁵** | 1770 | **1355** | 670 |
| main, set point +1 × 10⁻⁹ | 1775 | 1350 | 675 |

How A7 reaches ventilated rigs at all: the audit rigs are ventilated from t = 1 s, and `stepSpontDrive` runs only while
breathing is spontaneous. That leaves the first second. At t = 0, 7c's HCO₃ is 24.40045, above A7's `HCO3_REF` 24.4, so A7
lifts the set point to **40.000315 mmHg for that first second**. A constant offset of exactly that size, with no
alkalosis logic, reproduces A7's three arrest times to the second. The opposite sign moves D2 the other way by −65 s, and
+10⁻⁵ moves it +5 s: the response is not monotonic in the perturbation.

So the shifts are sensitivity to a 3 × 10⁻⁴ mmHg perturbation lasting one second, and **R-FU9-4 is right in kind**. Its
size is understated: the envelope is **D2 1285–1355 s (±65 s) and K-ptx 665–680 s**, not "±40 s". The first-second path
itself is a small defect (F6).

### (4) Mechanisms against their sources (summary; details in the findings)

| mechanism | source check | verdict |
|---|---|---|
| **F1** Hahn context-sensitive kinetics: expansion factor on `bvRel`, multiplying the S_GA/vNh chain | Hahn 2010 (Anesthesiology 113:470) review; Drobin & Hahn 1999 (hypovolaemic volunteers retain more) ✓; Norberg 2007 is **0.9 % saline in isoflurane-anaesthetised volunteers** (reduced clearance, "small but significant" extra accumulation), consistent with GA − awake +0.14 ✓ | sound; the natriuretic half is missing (F4) |
| **F3** extraction before supply dependence | Cain 1977 ✓, Shibutani 1983 ✓ for the mechanism. The model's DO₂crit is 420 mL/min (6 mL/kg/min ≈ 227 mL/min/m²), while Shibutani's is 330 mL/min/m² (≈ 610 mL/min for the rig) and Ronco 1993 ≈ 4 mL/kg/min in the dying; the Weil/Shoemaker supranormal-DO₂ targets are not a critical-DO₂ source. The constant is main's (tables), not FU-9's | sound (F12: cite the range) |
| **F5** citrate in the SID (Stewart/Fencl, Kellum's SIG) | direction ✓ (citrate³⁻ is a strong unmeasured anion; its metabolism gives the late alkalosis, Driscoll 1987); flow-linear clearance ✓ (Kramer 2003: liver + muscle + kidney) | mechanism sound, **acceptance carried by non-electroneutral product rows and a charge double-count** (F1) |
| **F8** COP (Landis–Pappenheimer) | Landis `2.1TP + 0.16TP² + 0.009TP³` ✓ (22.35 at 6.4 g/dL). Treating globulin grams as albumin grams on the TP curve contradicts "albumin ≈ 75–80 % of plasma COP" and makes 5 % albumin hypo-oncotic. The product monograph defines 5 % albumin as iso-oncotic | **F2** |
| **F9** 0.7 mmHg per mmol/L HCO₃, cap 55 | Javaheri & Kazemi 1987 (Am Rev Respir Dis 136:1011) ✓; the Boston rule ✓ | sound (F6) |
| **F6** kaliuresis ∝ K × √flow; total-body pool 300 mmol per mmol/L | Sterns 1981 (Medicine 60:339) ✓; Good & Wright 1979 ✓; Young 1988 ✓ | sound, headline overstated (F7) |
| **F7** COPD paco2Rest 40/40/45/55; +0.35 per mmHg | tables §1.5/§5b.1; Brackett/Schwartz 1965 ✓ | sound |
| **F4** σ = 1 − (1 − σ₀)·kfMult | two-pore direction ✓ (Rippe & Haraldsson 1994); the linear proportionality is an assumption | minor (F12) |
| **F10** hypokalaemia × EC50 | direction ✓ (Miller; Feldman 1963); size [ENG], declared | design/ownership (F9) |
| **F11** 0.145 mL per mOsm/kg (the osmotherapy gain) | derivation checked (4.5 × 0.885 ÷ 27.4 = 0.145) ✓; the size is OQ8 | sound |
| **ATLS** class III/IV volumes and BE bands | ATLS 10e ✓ | — |

### (5) Boundaries

| boundary | finding |
|---|---|
| FU-6 Task 13 ↔ A7 (the `paco2SetPoint` call line) | Declared, and the merged line is correct. Semantics are fine for pregnancy: the first argument is 31, `CHRONIC` adds 0, and the acute correction is measured from 31. The duplicated constants are F6 |
| **FU-8's body-size rule** | **Missing adoption (F3)**. FU-8 (current, `origin/fu-8-followups` I-51/D16/A13 and its "Handed to FU-9" row) creates `l2/body-size.ts` (`sizeWeightKg`, anchored on the 4,900 mL default adult) and hands 7c's `bloodPatient` to FU-9. FU-9's R-FU9-7 says "FU-9 does not touch obesity" |
| FU-7 shock table / drug interactions | R-FU9-2 hands DV-25a/b's K-blind shock table to FU-7 Task 12 ✓. **F10 is a drug interaction.** B1 puts K on a second path beside FU-7 Task 14's Mg/iCa (F9): ruling |
| 7i coagulation (v1.1) | ✓ the 17 NE cells are left; no FU-9 change touches coagulation |
| FU-8 I-72 ↔ FU-9 D12 | FU-8 hands I-72 (hyperkalaemic contractility read from plasma K) to FU-9. FU-9's D12 shows it already reads `kEcg` (verified: `blood/pipeline.ts:178`) and hands the forced-sinus PEA dip back to "the FU-4 follow-up owner (FU-8 collects)". That is a loop between the two plans: ruling |

### (6) R45 and CI

| check | result |
|---|---|
| changed existing tests | **one**: `test/l2/blood/core.test.ts` (E-FU9-1: the massive-transfusion `it` split; K ≥ 5.5 stays `it`, the iCa rule → `it.fails` with the same ±0.05 tolerance). It is declared with its reason. No band is widened, removed or re-worded; `git diff --stat` on `test/` shows only this file |
| new `it.fails` | 5, each with its number in the title: kinetics RBC +0.66, core iCa rule 1.090, leak vs healthy, furosemide −0.042, glycine ICP +0.24 |
| new slow files | **SLOW_A only** (the `SLOW` glob plus a separate `SLOW_A.push(...)` line; `SLOW_B` excludes it by string and by the slow-b `exclude` matcher; verified with `vitest list`). The two vite anchors still match with FU-8's `vite.config.ts` change on its branch |

---

## Findings

### F1 — MAJOR: F5's massive-transfusion pass (BE ≤ −10) is carried by non-electroneutral product rows and a Ca-citrate charge double-count

**Plan location:** Task A3, D3; Open question 2; the results-table rows BF-05a/05d.

**Evidence:**
- `params.ts:157–160`: RBC `na 150, cl 150, citrate 15.6/0.28` gives an apparent SID of **−167 mEq/L**; FFP gives
  −93 mEq/L. With A3's `CITRATE_CHARGE` 3, every RBC unit adds about 47 mEq of strong anion that has no cation. Real CPD
  anticoagulant is **trisodium** citrate, whose Na is part of the unit's Na, and a SAGM RBC unit keeps only about 1–3 mmol
  of citrate (most goes with the plasma). The plan itself says the rows are not electroneutral (OQ2), but it does not say
  that the BF-05d pass depends on them.
- **Sensitivity**, measured by re-running `fu9-transfusion.test.ts` on the applied tree plus one change:

  | variant | iCa nadir | BE nadir | lactate peak | arrest | result |
  |---|---|---|---|---|---|
  | plan as written | 0.72 | **−10.9** | 7.5 | no | pass |
  | RBC citrate 2 mmol/unit (SAGM-like) | 0.80 | **−7.1** | 7.1 | no | **FAILS** BE ≤ −10 |
  | complexed Ca keeps its charge in the SID (`3 − 2·K_CIT` per mmol) | 0.71 | **−10.1** | — | — | 0.1 margin |

- **The double-count:** `sidOf` counts ionised Ca (2·iCa) and **all** citrate (−3·cit). Ca chelated by citrate (K_CIT
  0.09 mmol per mmol) therefore loses its +2 while its citrate keeps −3, which overstates the acid by 0.18 mEq/L per mmol/L
  of citrate. At the 4.9 mmol/L peak that is ≈ 0.9 mEq/L — the whole margin by which BF-05d passes.
- The item the report proposed and the plan dropped, **stored-RBC supernatant lactate/acid**, is the physiological
  carrier of the early acid load. The plan dropped it as unsourced, and the pass came instead from a row artefact.

**Fix:**
1. Count the complex once: `sidOf` subtracts `(CITRATE_CHARGE − 2·K_CIT)·citrate`, or adds back `2·K_CIT·citrate`.
2. Make the orchestrator's OQ2 decision **before** A3 executes: either give the RBC/FFP rows a sourced, electroneutral
   composition (trisodium citrate's Na counted in `na`; SAGM citrate) plus a sourced storage lactate, or keep the rows and
   record in the gate note that BF-05a/05d's PL is contingent on the [TXT] rows.
3. If BE ≤ −10 is then unreachable, it becomes an `it.fails` with its number (R45). It must not be reached through the
   artefact.
4. Re-measure BF-05a/b/c/d, the A3 unit test, and E-FU9-1.

### F2 — MAJOR: D5's globulins-on-Landis make 5 % albumin hypo-oncotic; the isovolaemic exchange cells turn WR; OQ4's objection to Nitta is avoidable

**Plan location:** Task A5 (`copPlasma`), D5; Open question 4; the notes on BF-03a and BF-18/19.

**Evidence:**
- Measured COP of a 5 % albumin solution (50 g/L albumin, no globulins):

  | model | COP |
  |---|---|
  | main (1.6 × albumin) | 31.7 mmHg (hyper-oncotic) |
  | plan | **15.6 mmHg** (0.70 of plasma's 22.35) |
  | reality | iso-oncotic by definition (product monograph); albumin ≈ 75–80 % of plasma COP |

  On the plan's TP curve albumin is 62 % of normal COP, because a gram of globulin is treated as a gram of albumin.
- Consequences, from the BF runs:

  | cell | main → plan |
  |---|---|
  | BF-18a exchange 3.7 L blood for 5 % albumin: ΔBV | **+233 → −150 mL** (it should be ≈ 0) |
  | BF-18b | TW → **WR** |
  | BF-19 | TS → **WR** |
  | BF-03a volume effect at 60 min | 0.93 → 0.75 |

  FU-6 Task 14 must reach CO +10–40 % in ANH (research/22 §5, R11 owner). FU-9 makes the same exchange lose volume, which
  works against it.
- OQ4 says Nitta's separate polynomials "would move the normal COP 22.4 → 17.8 and every lung-water threshold". That is
  avoided by **scaling Nitta to the tables' normal**: `COP = k·(Nitta_alb(A) + Nitta_glob(G))`, with
  `k = landis(6.4) / (Nitta_alb(4) + Nitta_glob(2.4)) = 1.259`. Normal COP is then **22.35 exactly** (bit-identical at
  the normal albumin, as D5 wants).
- Measured on that variant (the applied tree with only `copPlasma` changed; synthetic colloid treated as
  albumin-equivalent):

  | measure | variant (plan in brackets) |
  |---|---|
  | albumin 20 | **11.74** (band 11–17, PL; plan 13.1) |
  | albumin 25 | 14.12 |
  | 5 % albumin | **25.2** (≈ iso-oncotic) |
  | BF-18a ΔBV | **+58 mL** (plan −150) |
  | BF-18b | **TW** (plan WR) |
  | BF-03a eff60 | 0.85 (plan 0.75) |
  | BF-22a | PL 11.74 |
  | BF-02a | 0.24 / 0.38 (PL) |
  | BF-21a/b | PL |

  BF-19 stays WR (CO −6.4 %). Its CO is dominated by the missing anaemia → CO mechanism (FU-6 R11), so it is not
  diagnostic of COP. The diagnostic is the exchange's volume.

**Fix:** replace `copPlasma` with the scaled Nitta form (or an oncotic-weighted TP, e.g. 1.28·alb + 0.53·glob, which is
iso-oncotic for 5 % albumin by construction). Keep `globG` and its dilution, bleeding and product lines. Re-measure BF-22,
BF-03, BF-18, BF-19 and BF-21. OQ4 then becomes a question about the constant rather than a known contradiction.

### F3 — MAJOR (boundary): no task adopts FU-8's one continuous body-size rule

**Plan location:** R-FU9-7; Global Constraints ("one obese definition stays FU-8's"); File map (no `blood/params.ts`
`bloodPatient` change).

**Evidence:**
- The current FU-8 plan (`origin/fu-8-followups`, D16, Task A13, and its Handed-to row for FU-9) creates
  `packages/engine-core/src/l2/body-size.ts` (`sizeWeightKg`, `SIZE_REF_KG`, `DEFAULT_HEIGHT_CM`). The circulation is
  sized by it, anchored on the default adult (4,900 mL M / 4,550 mL F). FU-8 states that "FU-9 inherits this definition":
  7c's `bloodPatient` Lemmens branch, capped at the band value below BMI 22, gives **4,807 mL for the BF rig itself**
  (70 kg / 175 cm), while the circulation after A13 holds 4,900.
- FU-9 does not touch `bloodPatient`. Its R-FU9-7 treats FU-8's ownership as "do not touch", where FU-8 means "adopt".

**Fix:** add a task, gated on FU-8 A13 merging (a Part B item, or a Part C if FU-8 lands after FU-7). In
`l2/blood/params.ts` `bloodPatient`, compute the adult/elderly blood volume as `bvKg(band, sex) × sizeWeightKg(band, w, h)`
imported from `../body-size.ts`, instead of the capped Lemmens branch. Body water stays on the actual weight. The task
must:
- declare the moved rows (the BF rig +1.9 % BV; every 70 kg/175 cm engine rig);
- re-run the BF matrix before and after;
- carry a test that 7c's `bvMl` equals the circulation's BV for 50–160 kg.

FU-9 must not define its own size rule. The inventory row I-51 should read "**task** (adopt FU-8's `sizeWeightKg`)".

### F4 — MEDIUM: BF-12 is a "must stay PL" regression; the fix is F1's own natriuresis, not a calibration

**Plan location:** Task A1 / D1; the results-table row "reg. BF-12"; Open question 10.

**Evidence:**
- research/22 §5 puts BF-12 in the regression set ("must stay PL"). With the plan it goes **+6.917 → +7.08 (PL → TS)**.
- The plan names the cause itself: 7d's urine carries a fixed `URINE_NA` 100 mmol/L (`organs/pipeline.ts:32`), so the
  new expansion diuresis — described as ANP natriuresis — excretes hypotonic urine and concentrates plasma Na.
- A variant with `URINE_NA` 140: BF-12 **+6.94 (PL)**; BF-01a dCl 5.18 → 4.77; BF-14 dCl 11.19 → 10.01, BE −3.04 → −3.14;
  BF-02a retention unchanged (0.21/0.35).

**Fix:** make the expansion share of 7d's urine natriuretic. The seam's Na for the `expansionFactor` share should be at
plasma Na, not 100 — ANP is natriuretic. This is part of the F1 mechanism, not a constant fit. Alternatively, declare the
BF-12 regression under a named exception with the orchestrator's ruling. Either way it is not left as an open question
while the gate claims "no regression".

### F5 — MEDIUM: the gate's audit expectations went stale when main moved and would stop the gate; the chaos envelope is ±65 s

**Plan location:** Task A0 Step 4, Task G Step 4, D13, R-FU9-4.

**Evidence (measured on current main):**
- K-ptx is **675 s before and after**; the plan expects 670 → 675.
- The PTX matrix row is **already t+15 s** on main; the plan expects t+10 → t+15.
- **The tension-PTX propofol row's nadir time moves 80 → 85 s (HR 130 → 131).** That row is not in G Step 4's list, and
  "Any OTHER moved row stops the gate".
- The chaos demonstration (§3b) shows D2 anywhere in 1285–1355 s and K-ptx in 665–680 s under sub-mmHg first-second
  perturbations.

**Fix:**
- Re-state A0 Step 4 and G Step 4 against current main (D0 1775, D2 1350, K-ptx 675).
- Replace exact-second expectations for D0, D2 and K-ptx with a measured envelope: a ±10⁻⁵…10⁻³ mmHg perturbation
  ensemble, recorded in the gate note.
- Add the PTX propofol nadir-time row to the "chaotic" list.
- Update R-FU9-4 to "±65 s".

### F6 — MEDIUM: A7 is not "exactly unchanged at rest", and its references are a second copy of 7c's constants

**Plan location:** Task A7 / D7 ("at rest the set point is unchanged"); B2 (`CHRONIC_HCO3_PER_MMHG` defined again in
`blood/core.ts`).

**Evidence:**
- At t = 0, 7c's HCO₃ is 24.40045 > `HCO3_REF` 24.4, so A7 sets `paco2Set` to **40.000315** until the first 1 Hz update.
  This is the path by which A7 moves the ventilated audit rows (§3b).
- `HCO3_REF 24.4` duplicates `NORMAL.hco3`.
- `CHRONIC_HCO3_PER_MMHG 0.35` is defined twice, in `neuro/spont.ts` (A7) and `blood/core.ts` (B2). If the calibration
  pass (R44) changes one, a compensated COPD retainer is read as a metabolic alkalosis or acidosis.

**Fix:**
- Give the alkalosis branch a small deadband (e.g. `met > ref + 0.1`), or take the reference from 7c. The best form is to
  pass 7c's own reference HCO₃ for the patient's resting PaCO₂ through the spont inputs, next to `hco3`.
- Keep ONE `CHRONIC_HCO3_PER_MMHG` (7c's) and have 7f read the value, not the constant.

With the deadband the audit rows no longer move at all, and D13's chaos note becomes moot for FU-9.

### F7 — MINOR/MEDIUM: F6's "excretion follows plasma K" never acts for the tested patient

**Plan location:** Task A6 / D6; Open question 5.

**Evidence:**
- `kRel = kNow / so.set.k`, and `set.k` is the **profile** K. For BF-08d's profile K 7.5, kRel = 1 at baseline, so the
  kidney excretes K exactly as for K 4.2. The −0.042 comes only from √flow and the finite pool.
- The D6 choice ("a chronic state is in balance") is defensible for CKD. It is not the teaching case BF-08d represents:
  acute hyperkalaemia with functioning kidneys, where a K 7.5 kidney is maximally kaliuretic.
- Also: an oliguric seam "retains the intake" as K and Cl (`cl = 0.9·(na + k)` with k < 0) but not as Na. This is harmless
  (SID +0.1·|k|), but undocumented.

**Fix:** state in the gate note what the mechanism does for a profile K, and add to OQ5 whether the reference should be
the normal K (acute states) or the profile K (chronic). One sentence in D6 on the asymmetric intake.

### F8 — MINOR: A5's float-equality branch breaks D5's "normal-albumin patients bit-identical"

**Plan location:** Task A5 `core.ts` block, `so.set.ph = albCal === alb ? ph0 : ab.ph`.

**Evidence:** across a sweep of 25,200 profiles (sex × 8 ages × 3–160 kg × 5 heights, no profile albumin), **1,095**
compute `albGL(fl)` = 39.99999999999999 ≠ 40. Examples: a 63.5 kg profile at several ages. Those take the solver's pH
7.3981995 instead of `ph0` 7.3981915 as the K reference. The effect is tiny (≈ 3 × 10⁻⁵ mmol/L K), but it breaks the
claim.

**Fix:** branch on the profile field, not on floats:
`const albCal = b.hco3 === undefined && b.albuminGL !== undefined ? NORMAL.albGL : alb;` Then `albCal === alb` is exact for
every default patient.

### F9 — MINOR (design / ownership): B1's K reaches the NMB PD on a second path, multiplied onto the neostigmine line

**Plan location:** Task B1 / D10.

**Evidence:**
- FU-7 Task 14 routes 7c's Mg and iCa into `ec50Multipliers` through `InteractionCtx`/`NeuroEnv` (D11, "one state per
  mechanism", R51 addendum 24).
- B1 adds `NeuroEnv.kMmolL` but applies it **outside** `ec50Multipliers`, as a factor on
  `neo = neoEc50Mult(x.achGain) * hypokalaemiaMult(...)`. The result is two places where electrolytes modulate the
  non-depolarisers, and the K term sits in a variable named for neostigmine.
- The reason given — avoiding FU-7's lines — no longer applies, because Part B runs after FU-7 merges.

**Fix:** in Part B, anchor on FU-7's merged `InteractionCtx` and add `kMmolL` beside `mgMmolL`/`iCaMmolL`, applied in
`ec50Multipliers` to rocuronium, vecuronium and cisatracurium. Or hand F10 to FU-7's follow-up owner (ruling R6).

### F10 — MEDIUM (CI): FU-9's slow-a share is ≈ 25 min, not ≈ 11, and a third of it re-runs identical arms

**Plan location:** Tasks A1, A4, A6, A8 (the `it` + `it.fails` pairs); File map "≈ 11 min wall in total".

**Evidence:** the same arms are re-run between tests:

| file | arms run twice |
|---|---|
| `fu9-kinetics` | the GA RL + control pair (in both the retention `it` and the class III `it`) |
| `fu9-leak` | the septic pair |
| `fu9-potassium` | both 3 h arms |
| `fu9-osmolality` | both 2.5 h arms |

That is about 8 of 24 arms, ≈ 35–40 % of FU-9's slow wall.

Measured serially, as the slow-a job runs them (`PME_TEST_SET=slow-a`, `fileParallelism: false`, 4-vCPU container, a
second job running for the first minutes): **24.6 min**. Per file: kinetics 362 s, potassium 378, osmolality 294, leak 234,
rocuronium 80, transfusion 34, copd 32, alkalosis 31, oxygen 23. The plan's File map says ≈ 11 min.

slow-a was 21.6 min at the FU-4 gate. FU-9 alone would take it to ≈ 46 min, beyond the ≈ 40 min the jobs are held to,
and FU-8's `fu8-*` files also join slow-a (already on its branch). Memoising the duplicated arms saves ≈ 7–8 min (about
half of potassium and osmolality, and the GA pair and septic pair), which is still ≈ 17 min.

**Fix:**
- Memoise each arm at module scope (`const septic = once(() => arm(...))`) so the `it.fails` reuses the `it`'s runs.
- Correct the File map's wall-time estimate.
- The orchestrator decides where FU-9's files go (R10): a third slow group, or splitting SLOW_A. The rule "every new
  slow file joins SLOW_A" was written for small files.
- Task G records slow-a with FU-8 and FU-9 together, against the job limit.

### F11 — MINOR: numbers in the plan text that do not match current main

**Evidence:**
- **F4 test title:** "PaO₂ +13 (healthy +5)"; measured PaO₂ **+12, healthy +6**. The `it.fails` still holds; fix the title
  and OQ3.
- **E-FU9-1:** the plan says the chelation rule "still holds on main (1.033 ± 0.05)". Main measures **iCa 1.076**
  (margin 0.007); the plan measures 1.091. The `it.fails` fails by 0.008. Most of that is main's pre-existing offset; the
  rest comes from the citrate-SID acidification (pH 7.43 on main → 7.40 with the plan, BE +2.1 → +0.1, in the same unit
  rig). Quote both numbers.
- **Results table:** BF-19 is +8.3 → −0.5 % (not 6.6 → −3.1); BF-18b ends at −1.8 (not −1.4); BF-18a WR → TW and the
  BF-20a healthy PaO₂ −5 → +4 are missing. A0 Step 3's "expected main" list should be re-measured on the executor's base
  anyway, because V.1 moved it.

### F12 — MINOR: sources

**Evidence:**
- **D4** presents `σ = 1 − (1 − σ₀)·kfMult` as two-pore theory. Rippe & Haraldsson give the direction. The linear scaling
  of (1 − σ) with total Kf is an assumption, so it should be `[ENG]` beside `SIGMA_LEAK_FLOOR`. It also now applies to
  7e's anaphylaxis and burns kfMult, not only sepsis; say so.
- **D2** cites Shibutani (330 mL/min/m²) beside a model DO₂crit of 420 mL/min ≈ 227 mL/min/m². Cite it for the mechanism
  and give the range (Ronco 1993 ≈ 4 mL/kg/min; Shibutani ≈ 8–9 mL/kg/min); the constant stays main's (R44).

---

## What the plan gets right (verified, no action)

- **F2 closed by FU-4 G3.** Verified: `bloodEcgTargets` is absolute, and BF-07a/b are PL on main.
- **D12 / DV-25b.** Verified: contractility reads `kEcg`, `blood/pipeline.ts:178`.
- **F3 is safe for FU-4.** 7c's SvO₂ and VO₂ are read only by `labs.ts` and the truth tree (grep).
- **A1 leaves 7d's own curves untouched:** `volumeFactor` and `vNh` are unchanged, `organs-renal/-soak/-curves` pass, and
  the 6 h soak is green.
- **A6's total-body K pool** leaves transcellular shifts intact. `blood-hyperk` and `blood-k-rhythm` pass, and G2b/G3b
  are unchanged.
- **B2 honours a profile HCO₃,** and X-A is bit-identical.
- **The F7 COPD compensation** reaches +3.42 per 10 mmHg.
- **Each changed file stays with its owner,** and the Never-touch list holds: `l2/gas/params.ts` only in Part B under
  E-FU9-3; `engine.ts` one line under E-FU9-2.

## Rulings the orchestrator must make

| # | Ruling | Reviewer's recommendation |
|---|---|---|
| R1 | F5 acceptance (F1): product rows and storage acid **before** A3 executes, or accept BF-05d's BE as an `it.fails` | Fix the SID double-count in A3. Make OQ2 an Ali/orchestrator decision now: sourced electroneutral RBC/FFP rows plus sourced storage lactate. Otherwise BE ≤ −10 is an `it.fails` with the number reached without the artefact |
| R2 | COP form (F2 / OQ4) | Scaled Nitta (normal 22.35 identical, albumin 20 → 11.7, 5 % albumin ≈ iso-oncotic); re-measure BF-03/18/19/22 |
| R3 | FU-8 body-size adoption (F3) | A FU-9 task gated on FU-8 A13 merging (Part B or C). 7c `bloodPatient` uses `sizeWeightKg`; moved rows declared; BF re-run |
| R4 | BF-12 regression (F4) | Natriuretic expansion urine (Na at plasma) inside A1. No exception |
| R5 | Chaotic arrest rows (F5) | Accept R-FU9-4 with an envelope of ±65 s (D2) / 665–680 s (K-ptx); G Step 4 uses a perturbation ensemble; re-state the expectations on current main. F6's deadband removes FU-9's contribution entirely |
| R6 | F10 ownership and form (F9) | FU-9 B1 may keep it, but in FU-7's `InteractionCtx`/`ec50Multipliers` (one path for 7c electrolytes). Otherwise hand it to FU-7's follow-up |
| R7 | I-72 / DV-25b loop between FU-8 and FU-9 | Name ONE owner for the post-shock PEA dip in treated hyperkalaemia: FU-8, which collects the FU-4 loose ends, or FU-7 Task 12. The 7c half is closed (D12, verified) |
| R8 | F6's K reference (F7) | Ali: profile K (chronic balance) vs normal K (acute). Add it to OQ5 |
| R9 | Exceptions E-FU9-1/2/3 | Accept E-FU9-2 and E-FU9-3 as declared. Accept E-FU9-1 after R1, with both iCa numbers stated correctly (main 1.076 → plan 1.091) |
| R10 | slow-a budget (F10: FU-9 adds ≈ 25 min serial to a 21.6 min job; FU-8 also adds) | Require F10's memoisation (≈ 17 min left). Then either a third slow group (`slow-c`) or re-split SLOW_A/SLOW_B by measured time. Joint timing at whichever gate lands second |

## Reproduction notes

- Block check: a Python parser of the plan's blocks (in the reviewer's scratch), run on `git archive` exports of
  `76c952e`, `origin/main`, FU-8's Part A/A+B trees (FU-8's own `fu-8-check-blocks.py --apply`), then
  `diff -r` against `git apply fu-9-prototype.patch`.
- BF: `PME_ENGINE=<tree>/packages/engine-core/src/index.ts BF_OUT=out/<name>.json node --import ./hooks.mjs
  --experimental-strip-types cli.ts all` on copies of `research/22-audit-scripts`. The automatic verdicts come from each
  record's `auto` field.
- Audit: `PME_ENGINE=… PME_AUDIT_OUT=<scratch> npx -y pnpm@9.15.9 run audit:physiology` (full), plus `D0-pe D2-pe-peep15
  K-ptx` on the A7-only and perturbed trees. Each perturbed tree changes exactly one line of `spont.ts`
  (`paco2SetPoint`'s return value).
- Variants (scratch only): `cacx` (SID `3 − 2·K_CIT`), `rbccit` (RBC citrate 2 mmol/unit), `nitta` (scaled Nitta COP),
  `una` (`URINE_NA` 140).
