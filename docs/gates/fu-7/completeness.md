# FU-7 completeness audit (finisher, 2026-10-04)

The cloud session executed Tasks 0–19 and most of Task 20 on `fu-7-drug-layer` (26 commits, head 8454221). It stopped
on purpose inside the gate: its slow-a run had two failures that no `it.fails` declared, and Task 19 Step 4 says such a
failure stops the task. This audit checks every step of Tasks 0–19 against the plan, on 8454221. Every named file,
function, constant, row field and test title was grepped, and every replace block was compared line by line with
whitespace trimmed. The unit tests were run; the slow engine files run in the gate (§7 of the gate note).

**Verdict.** Every step's code and tests are on the branch. Where the plan has an unticked box, the work behind it was
done in every case. What was missing falls into three groups:

- **the two failures** the cloud session stopped on;
- **one expected test** that was never written (DI-01c);
- **records** the plan asked the gate note to carry.

The finisher fixed or recorded each one. They are listed under "Gaps and what was done".

## Per task

| task | commit(s) | steps present | tests now (unit; engine in the gate) | done differently from the plan |
|---|---|---|---|---|
| 0 | b1d1854 (baseline); re-anchorings inside each task's commit | S1–S7, 6b PASS, 6c PASS (every named field is in `baseline.md`) | typecheck clean | none |
| 1 | c435b9d; `audit-before.md` landed in bca2c57 | S1–S6 | `audit:drugs DI-63 DI-71` runs | S4 lists only 30 cells, so the FU-4/FU-6 "moved" cells have no before row. The plan contradicts itself here. |
| 2 | 57f1555 | S1, S2, 2b, **2c, 2d, 2e** (8 `t12S` rows; `gammaDeclineRate`; renal through `PkCtx.renal`; fentanyl `flowDist` per Egan 1999; furosemide unchanged, asserted), S3, 3b, S4, S5 | onset-chain 5, organ-decline 5, units-gamma 3; `test/l2/pk` 141 | none |
| 3 | f30f43f | S1–S7 | `test/l2/pk` green | `DRUG_BUS_NEUTRAL`/`Active` re-anchored in `combine.ts` |
| 4 | ffc179b (tests only) | S1; the S2 table was not pasted (two sentences instead) | potency-outputs, pk-bus-contract green | table now in the gate note §3 |
| 5 | 50f168c | S1–S5, E-FU7-9 fixtures | green | none |
| 6 | ba840c3 | S1, **1b** (`hvrDep` with the NMB arm kept), S2 (R1), S3 | green | the CM-12a note was missing from the gate note; added. α 0.3 broke FU-6's induction-apnoea band (gap 1). |
| 7 | bca2c57 | S1–S3, `spontRr` engine line | engine (slow-a) | four extra measured `it.fails` (plan line 3079 allows them) |
| 8 | 6abb95e | S1–S5, S7 byte for byte; S6 numbers missing | beta-occupancy 6 | S6 measured now (gate note §5) |
| 9 | ac12412 | S1–S7 | cat-reserve 3, glucagon | the depleted-ketamine case moved to a new slow file, `cat-reserve-engine.test.ts`. The suite was red from ac12412 to 4d6ff5b (the ephedrine SVR case; see §4 of the gate note). |
| 10 | 9cebaf6 | S1, 1b, 1c, S2, S3, S5b; cases 1, awake, **1b**, **1c**, 2–6, guards 7a–f | engine (slow-a); adapters 8 | 9 blocks re-anchored on FU-4's humoral arm (R4–R12). The 1c fentanyl-5 arm uses the no-fentanyl control, which is ET-16a's own `dMapF5` convention. |
| 11 | 33f0e29 | S1–S6; **Step 3a**, because FU-4 18f had landed (`outcomeRng?`, `hold?`) | antiarrhythmic, hooks green | case 5 sets `avNodeBlock` 0.8 directly rather than giving adenosine |
| 12 | e41020c | **S0** (VF_TABLE 0.1 / 0.8 / 0.1; Stage 4's test follows it, ±2 % kept), S1–S6 (temperature, `CIRCULATORY_PHASE_S` 240, cardioversion by rhythm and energy, continuous no-beat CoPP, arrest clock, `rhythmId`, `shockState`), S7; **S7a ticked with no output** | shock-state 13, test/l3 + device green (209) | S7a run now (gate note §5) |
| 13 | 74bc02f | S1–S3 | unit 3 green | case 2 asserts a stronger property ("Hill of the summed fractions") |
| 14 | 875b5d7 | S1–S3, E-FU7-10 (a)(b) | interactions, depth-drive green | DI-51 / DI-37c engine cases went to a new file, `fu7-nmb-one-state.test.ts` |
| 15 | 3e0bf94 | S1–S3 | interactions-misc green | none |
| 16 | 9a6dbf6 | S1–S4, the CM-11a seam comment | green | `HIST_SVR`/`HIST_V0` kept at the plan's values (DI-42 MAP `it.fails`) |
| 17 | 4d6ff5b | S1, **1a** (dobutamine unchanged; CM-06d is the guard), S2, S3, S4, **4a** (nitroprusside HFrEF arm), S5, **5a** (esmolol re-measure); the 1a/5a numbers were not recorded | interactions-misc green | numbers re-measured now (gate note §5) |
| 18 | 70419b8 | S1–S3, S4, **4a** (diabetic arm: `it` for the direction, `it.fails` +1.83), S5 | green | CM-09c guard measured now |
| 19 | 3e1e2ef (S1–S3, S6); 8454221 (S5) | S1 cases 1–8, S2, S3 (two `SKIP_PATH` entries, six `meta.ts` rows), S5; **S4 never completed** (slow-a, `-r test`, build) | engine (slow-a) | six files, not three, are in SLOW **and SLOW_A** ("executor instruction 2026-09-30"), not SLOW_B |

**The twelve unticked boxes.**

| box | status |
|---|---|
| T1 S4 | done in bca2c57 (`audit-before.md`) |
| T1 S6 | done (c435b9d) |
| T2 S4 | done; the numbers sit in the gate note §2 and `audit-after.md` |
| T2 S5 | done (57f1555) |
| T19 S4 | done by the finisher (gate note §7) |
| T19 S6 | done (3e1e2ef) |
| T20 S1–S6 | done by the finisher |

All twelve are ticked in the plan.

## Task 0 re-anchorings

The plan declared 13 Task 9/10 anchors stale since FU-4 18e, plus 21 pairs it could not resolve. Each was checked
against the landed text.

- **The 13 Task 9/10 anchors** (R3–R12) all keep the plan's meaning, with FU-4's text preserved:
  - the hormone initialiser `surge: 0, hum: 0, …, catReserve: 1`;
  - `surgeF` placed after `humDV0Frac`, in both the field and the return;
  - the effects import;
  - `writeCirc` MODELED `ext.surgeF` / MANUAL `= 1`;
  - the `stepHormones` input, which keeps `mapSetMmHg` and adds `antinocOp`;
  - `stepBaro(`, where only `setF: de.setF * (m.ext.surgeF ?? 1)` changes and FU-4's `muscBlock` term is kept;
  - the `adapters.test` key list.
- **The 21 unresolved pairs:**
  - Task 6 ×1: `hvrDep` with `(1 - hvrNmb)` kept and `dMid` removed.
  - Task 11 ×4: R13–R15, with the 18f import skipped.
  - Task 1 ×3: these resolve once the scripts are copied.
  - R2 and R16: chained anchors, both landed.
  - The remainder are the Task 9/10 anchors above.

None changed a structure. Gate note §8 now also lists the insert-only steps.

## `it.fails` added by FU-7

The count of `it.fails(` went from 91 to 127 at 8454221 (35 new, 1 converted, 1 retitled). The finisher's changes bring
it to 128 (the gate note §4 numbers them):

- the 7f synergy band, made `it.fails` by D15b (+1);
- DI-01c, written as `it` because it is met (+0);
- the `pk-longrun` line, which passes again without an `it.fails` (gap 2).

At 8454221 the plan's "Expected `it.fails`" table compared with the branch as follows:

- **Present as declared:** ephedrine β-blocked 0.99, reflex bradycardia (+1), ketamine LOC (16 s), fentanyl 5 µg/kg
  apnoea (0 s), labetalol 0.96, esmolol 0.58 / 0.98, DI-51 rig 13.4 %, concentration effect, incision +19.3,
  diabetic +1.83, dobutamine CO (+13.6 %).
- **Missing:** DI-01c. Written now and measured **met**: excess −3.5 %.
- **Declared but met:** the dexmedetomidine late fall (× 0.963), written as `it`.
- **Added beyond the table:** 26 tests, each a band an UNPROTOTYPED step could not reach. Each carries its number.
  Task 10's case 1b is in the task text but missing from the table.

No band was widened. The edits to Stage 4's `outcome.test.ts` (E-FU7-6) and to `interactions` / `depth-drive` /
`adapters` (E-FU7-10 a–c) are the declared ones. E-FU7-10 (a)'s title quoted "engine DI-51 +52.2 %"; it now carries the
gate tree's number.

## Gaps and what was done

1. **`resp-induction` (FU-6), 2 of its arms red on the gate tree.** Fentanyl 2 µg/kg + propofol gave 394 s against
   60–240 s; the remifentanil pair gave 567 s. Bisected to Task 6's propofol–opioid α 0.3.
   - **Ruling (orchestrator):** scan α ∈ {0, 0.1, 0.2, 0.3}.
   - **Scan (seed 7, fentanyl / remifentanil arms):**

     | α | fentanyl | remifentanil |
     |---|---|---|
     | 0.3 | 394 s | 567 s |
     | 0.2 | 316 s | 504 s |
     | 0.1 | 232 s | 364 s |
     | 0 | 120 s | 190 s |

   - **Result:** only α = 0 keeps fentanyl ≥ 20 s inside its band and remifentanil within 90–300 s. `VENT_ALPHA_HYP` is
     now 0 (**D15b**, fc434e0).
   - **Knock-on:** 7f's tables §5d "synergy" unit band becomes `it.fails` (totalDep 0.735 both vs 0.735 independent).
2. **`pk-longrun` 6 h propofol target 2.506 vs 2.5 ± 0.005.**
   - **Bisect** on a 1 h rig (same TCI, seed 4): b004289 through 50f168c give Ce 2.4998 at 1 h (Cp 2.3202); ba840c3
     (Task 6) gives 2.5019 (Cp 2.8248). Task 2's Steps 2c/2d do not move it.
   - **With D15b's α 0:** the 1 h rig reads 2.4998 / 2.3202 again, identical to b004289.
   - **Result:** it was the same α (an unintended side effect through the ventilated drive and the flow-dependent PK),
     fixed by gap 1. The 6 h line's result is in the gate note §7.
3. **DI-01c.** The plan expected an `it.fails` at −0.4 %; it was never written. Now it is a `drug-layer` `it`, measured
   excess −3.5 %, PL (bd3d288).
4. **Merge-time breakage (Part 2).** Stage 9's `glossary.test` drug-name check failed on FU-7's six new rows.
   - `DRUG_NAMES` gains atracurium, mivacurium, nitroprusside, glucagon, procainamide and verapamil.
   - Glossary entries 313–327 label FU-7's new truth leaves (1b7c9d8).
5. **Records the plan required but the gate note lacked.** Each is now written, in the gate note section named:
   - Task 4 S2 table (§3);
   - Task 8 S6 vagal-limb and Q1 ΔCO / ΔMAP (§5);
   - Task 12 S7a DV cells and end-to-end ROSC, with the runner-limit re-grades (§5);
   - Task 10 S6 CM-03c / ET-16a (§5);
   - Task 17 S1a / S5a CM-06d, 06e, 04d, 14c, 15b (§5);
   - Task 18 S5 CM-09c (§5);
   - Task 2 S2c limits, the M6G note, RH-07a before, and the RH cells (§5, §10);
   - the CM-11a and CM-12a lines (§5);
   - the FU-8 commit and the insert-step list (§8);
   - the wrong "before" values and bands in §2 (DI-71, DI-88, the ketamine LOC, the T10 ratios, the DI-51 band), now
     corrected.
