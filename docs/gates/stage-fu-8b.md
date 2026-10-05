# Gate note: FU-8 Part B (tonic sympathetic share, drug-library items, sensor state, perfusion index, pacing pain)

Branch `fu-8b-followups`. Base: `origin/main` `4a1cc3f7` (FU-7 merged). `origin/main` `28ee2297` (docs only) was merged
in at the gate (`70124113`). Plan: `docs/plans/fu-8-followups.md`, Part B. The tasks are ticked there and carry
"Executed" records. Executor: Claude Opus 5.5, 2026-10-04. Seed 7 throughout.

## 1. Base drift (Task B0)
The block checker (`--part B`) checked 28 find/replace blocks and 3 creates against the merged tree. **Two had
drifted.** Both were re-anchored, and the intent of each was unambiguous:

| Task | File | Drift | Re-anchored as |
|---|---|---|---|
| B1 | `l2/pk/data/rows-other.ts` (lidocaine) | FU-7 addenda 22/23 added PD targets (`antinocAdd`, `antiarrhythmic`) | `maxDose` on its own line before the unchanged `doses:` line |
| B4 | `l2/circ/model.ts` (`stepBaro(` gains) | FU-7 addendum 22 now reads `setF: de.setF * (m.ext.surgeF ?? 1)` | `tonic: m.prof.tonicSymp` appended after `brainF`; FU-7's `setF` kept |

Other drift needed no new find block:
- FU-7 did not edit `baroreflex.ts`. Its gate note (Task 8 Step 6) reported the vagal-limb caps to FU-4 without
  touching the file, so the `svrF`/`eesF` lines matched.
- The gamma rows have no transit chain; `infTarget` is unchanged.
- FU-7 raised the count of curve rows that have no infusion model from 21 to 23.

Baseline at B0: engine fast set 304 files / 1,365 passed + 1 skipped.

## 2. Before and after, per task

**B1, drug library (I-25…I-28).** `l2/pk/**` and the two type files.
- **Insulin 0.1 units/kg/h, 60 min:** glucoseDelta −118.31 → −60.00; kShift −1.183 → −0.600.
- **Routes:** IM adrenaline went from accepted (given as IV) to refused, with the reason. IO, central and nebulised
  salbutamol are accepted. Propofol `neb` is refused.
- **Infusions:** an amiodarone infusion went from accepted with no effect to refused ("no infusion model"). This now
  applies to 23 rows. Dextrose stays accepted (`rateActsVia`: 7e reads its rate).
- **Maximum dose:** lidocaine 3 + 2 mg/kg went from no warning to one `drugWarning`: "cumulative 350 mg exceeds the
  maximum 315 mg". Both doses are given.
- **Repo check:** no scenario, preset or oracle in the repo sends any other route.

**B2, sensor-state map (R-S9-6).** The `state` event now carries `sensors` with 12 keys; before, the field did not
exist.
- Test: `fu8-sensor-map`, 2 cases, failed first.
- The map is built in `flush`, only for committed `state` events (1 Hz).
- Controller: 39 files / 226 passed.

**B3, PI rises after induction (R-FU5-9).** New output `circ.skinTone`: the vasomotor part of the SVR line, without
the MANUAL tracker and viscosity. The pleth factor is `1/√skinTone`, bounded 0.25–2 and no longer capped at 1.
MANUAL keeps a factor of 1. **Executor's ruling:** I ran B3 after B4 because it reuses B4's tonic mechanism.

PI under each intervention (seed 7):

| Intervention | At FU-5 | B4 alone | After B3 |
|---|---|---|---|
| Ventilated, propofol 2 mg/kg | 1.49 → 1.17 | 1.50 → 1.40 | **1.50 → 1.66** (the FU-5 `it.fails` flips) |
| Sevoflurane 3 %, 20 min | — | 1.50 → 1.57 | 1.50 → 1.78 |
| 1.5 L bleed | — | 0.46 | 0.46 |
| Phenylephrine 100 µg | — | 1.50 → 1.50 | 1.50 → 1.50 |

- **Phenylephrine:** skinTone reaches 1.47, but SV rises with the reflex bradycardia, so PI does not fall. Recorded.
- **Unchanged rows:** the MANUAL ladder, the 3 L bleed and the ventilated-rest `it.fails` (1.80 against 1.50, an SV₀
  matter). `fidelity-*` + `fu8-motion-pi`: 60 passed.
- **New truth leaf:** the 12-drug tree went from 2,077 to 2,078 leaves (cap 2,100). Glossary entry 339 was added
  (renumber at merge).

**B4, tonic sympathetic share (C1, owner A23 agreed).** Mechanism and sizes as agreed: τ 0.2 adult / 0.3 elderly / +0.1
HTN / +0.25 HFrEF; `svrF = 1 − τ(1 − outF) + o·reflex`, `eesF` likewise with `TONIC_EES_SHARE 0.5`; resting values
bit-identical in every profile. research/23 §6.3: (1) mechanism and sizes kept; (2) `tonicSymp` documented as the
SYMPATHETIC share with a `tonicVagal` twin expected (FU-12); (3) DECIDED: `dV0`/`cSvF` carry NO tonic share (recorded in
`baroreflex.ts`; a later stage adds it); (4) τ is a profile constant and is removed by the ANAESTHETIC's output factor
`outF` only.

**Gate revision (the one deviation from the prototype's line).** The B4 commit used the prototype's
`1 − τ(1 − o)` with `o = outF × brainF`. Its full slow run broke two FU-9 rows in slow-c: `fu9-kinetics` H1 (GA kidney
hour-2 urine 0.49 < 0.5 mL/kg/h) and `fu9-transfusion` F5 ("no arrest" → an arrest, lactate 16.2). `brainF` reads `cbfRel`,
which GA flow–metabolism coupling lowers at a normal MAP, so the tonic level was coupled to the perfusion state — what note 4
and the brief rule out; plan D15's own formula writes `outF`. Ruling: `outF` only (the reflex response keeps `o`). After:
H1 0.57, F5 no arrest (iCa 0.958, BE −0.2, as on main); the class III arrest moves only +86 → +89 s. Cost: the HTN extra fall
is 4.96 points (5.6 with `brainF`) — the plan test's "≥ 5 points" HTN row is `it.fails` (E-FU8B-6). The orchestrator may
prefer the prototype line (then the two FU-9 rows need a decision instead). Not attempted: the 30/min sinus floor,
sympathoinhibition, resetting bounds (FU-12).

**B5, pacing pain (DV-08c).** Only `engine.ts` changed. The output current is a nociceptive input: 0 up to 40 mA,
rising to 1.5 (7e's laryngoscopy grade) at ≥ 100 mA [ENG]. It is added to the held stimulus for each pass and the held
values are restored afterwards. **Delivered pulses only** (final review I-1): pain counts while the last pulse lies
within 1.5 intervals.

Test `fu8-tcp-pain`, 4 cases, each failing before. Capture threshold 30 mA, so 40 and 100 mA both capture:

| Case | Before | After |
|---|---|---|
| DV-08c: NE before → after pacing | 275 → 275 | 275 → 497 |
| Awake, 100 mA (NE / epi / MAP / sinus-node rate) | = 40 mA | 608 / 128 / 141.6 / 78.1 |
| Awake, 40 mA (same order) | — | 275 / 34 / 98.4 / 68.5 |
| GA, 100 mA against 40 mA | identical | NE +1 %, MAP +6.1 % |
| Inhibited demand pacer, 100 mA against 0 mA | NE 608 against 275 | identical |

The GA rig is propofol 3.5 + remifentanil 4.

research/20 cells:
- DV-08a capture threshold: 70 mA, unchanged.
- **DV-08b** mapPaced: 96 → 137.1. Its ventilated X-A rig has no sedation, so the patient now feels 100 mA. The
  dead-heart half is unchanged.
- **DV-08c** (`thermal` GA is the drug-free fallback):

| Readout | Before | After |
|---|---|---|
| dNeAwake | 0 | 221.9 |
| dEpi | −0.1 | 62.5 |
| mapAwake | 98.5 | 130.7 |
| mapGa | 95.7 | 105.2 |

These two cells moved against the plan line "DV-08a/08b … unchanged": **E-FU8B-4**, for the orchestrator. Pacing tests:
37 files / 183 passed.

## 3. The propofol fall across profiles (B4 final; propofol 2 mg/kg, ventilated; nadir 60–360 s after the dose vs the minute before)
| Profile | before (4a1cc3f7 + B1/B2) | after B4 | A23 target |
|---|---|---|---|
| healthy 40 y | −22.7 % (95.3 → 73.7) | **−30.3 %** (→ 66.4) | −25 to −40 % |
| 80 y | −23.5 % (109.5 → 83.7) | **−37.1 %** (→ 68.9) | larger than in the young |
| untreated HTN 60 y | −22.7 % (109.4 → 84.6) | **−35.3 %** (→ 70.8) | ≈ 40 % vs 30 % |
| 80 y hypertensive | −22.5 % (122.1 → 94.7) | **−41.2 %** (→ 71.8) | −30 to −45 % |
| HFrEF 60 y | −21.6 % (86.5 → 67.8) | **−41.2 %** (→ 50.8) | large falls expected |
| severe AS + severe CAD 75 y | −23.0 % (109.4 → 84.3) | **−38.4 %** (→ 67.3) | (A27: 60–65 at 2 min) |
| pulmonary hypertension (moderate) 60 y | −23.7 % (96.2 → 73.4) | **−31.4 %** (→ 66.0) | — |

The physiology audit's own propofol matrix (`audit:physiology`), before → after: healthy −23 → −30 %, 80 y HTN −21 → −41,
AS + CAD + HTN −22 → −48, HFrEF −22 → −42, hypovolaemia −1.5 L −68 % no arrest → −98 % arrest +90 s, warm sepsis −37 → −46,
tamponade arrest +170 → +105 s; MANUAL rows unchanged.

## 4. Class III haemorrhage + propofol 2 mg/kg (the old safeguard; now a RECORD, not a criterion)
Rig = clinical-suite S6a (40 y, VCV, 1.5 L over 600 s, propofol at 960 s); times from the dose.

| | before B4 | after B4 |
|---|---|---|
| MAP at the dose | 82.7 | 82.7 |
| MAP nadir | 26.4 at +61 s | **2.5** at +201 s |
| seconds MAP < 35 / < 30 (of 840) | 113 / 57 | 808 / 806 |
| minimum CoPP | 21.6 mmHg | 0.1 mmHg |
| minimum kIsch | 0.814 | 0.000 |
| outcome | recovery (no arrest) | **arrest at +89 s** (pulseless sinus → agonal ≈ +240 s → asystole ≈ +390 s) |

The course is a CLIFF, not an accelerating slope (MAP 38.8 at +30 s, 21.3 at +60, 11.8 at +90; HR 99 → 48). The
clinical-suite row is now a record (E-FU8B-2; the suite logs "S6a record: … arrest +90 s", 5 s sampling). Nothing was tuned.

## 5. Rows that moved (final)
Pins that flip (E-FU8B-1, E-FU8B-3): `circ-sanity-1` propofol MAP at 2 min 0.802 → 0.727; S2 sevoflurane −14.7 → −19.7 %;
S14 −22.6 → −42.2 %; `pk-longrun` 6 h TCI propofol Ce 2.5098 → 2.5021. S4b moves 58.9 / −17 % → 50.5 / −21 % and stays
`it.fails` (CO −25 % side). Passing rows: S1 0.785 → 0.702 (0.6–0.8), S1b 0.913 → 0.868 (≥ 0.85), S4a PEA +170 → +105 s,
S6b Ce ratio 1.78 → 2.05, S9 PEA 510 → 495 s, `neuro-circ` 0.775 → 0.704; S13 26.4–28.1 unchanged; MANUAL class III unchanged.
DI cells (`audit:drugs`): DI-46 −21.1 → −40.8 % (TW → PL); DI-47 −22.1 → −42.0 % (PL → **TS**, band −40…−20); DI-48 −18.4 →
−39.9 % (TW → PL); DI-79 extraFall 0.9 → 0.8 (WR). CM cells (research/19 runner, `CM_OUT` in scratch): CM-01b −19.8 → −32.0 %
(WR → PL); CM-03b −21.8 → −34.7 % (WR → PL); CM-05a −18.4 → −39.9 %, MAP at 2 min 96.6 → 71.3 (WR stays: ST 0); CM-06b
propofol −22.1 → −42.0 % (PL → **TS**), etomidate −3.7 % unchanged. The HFrEF fall beyond its band (DI-47, CM-06b) is a size
for the owner's calibration pass (A23), not tuned here. Physiology-audit arrest table (before → after): B1 tamponade +
propofol 1 none → 910 s; B2/B7 830 → 765 s; B6 1135 → 910 s; B9 760 → 740 s; C1 class III + propofol 2 none → 1050 s;
**J2 80 y HTN propofol 4 mg/kg + remifentanil 2 µg/kg none → 410 s**; I1 apnoea 1220 → 1175 s; every other row within 5 s.

## 6. Exceptions (executor's, for approval)
- **E-FU8B-1.** Three pre-declared `it.fails` flip (`circ-sanity-1` propofol; S2 and S14 in `clinical-suite`). Titles are
  re-stated with before → after; no assertion changed; the suite's count goes from 11 to 9. S4b moves but stays a pin.
- **E-FU8B-2.** S6a "no arrest within 5 min" becomes a record, per the owner's ruling of 2026-10-04 and the brief.
- **E-FU8B-3.** The `pk-longrun` 6 h TCI propofol `it.fails` (FU-9's) flips: 2.5021 is within the band.
  `origin/fu-10-endocrine-thermal` also returns this row to `it` (E-FU10-13), so expect a textual conflict at merge with
  the same outcome.
- **E-FU8B-4.** DV-08b and DV-08c move: an unsedated paced patient feels the current. The plan said "unchanged".
- **E-FU8B-5.** `apps/demo/src/app/glossary-data.ts` entry 339 (`hemo.circ.skinTone`). The plan's R56 line says FU-8
  does not edit the glossary; the orchestrator's brief assigns numbers from 339 with a renumber at merge.
- **E-FU8B-6.** The plan's `fu8-tonic` test is split: healthy in S1 and 80 y / HFrEF ≥ 5 points more stay `it`; the
  untreated-HTN row becomes `it.fails`, measured 4.96 points (−35.27 vs −30.31 %). See the gate revision in §2.
- **E-FU8B-7.** Two FU-6 RS14 pins flip: `resp-inspired-co2` and `resp-suite` "FiCO2 8 for 20 min: PaCO2 and EtCO2 +6–10".
  EtCO2 goes from +5.98 to +6.1 and PaCO2 is +6.7. This anaesthetised rig's output moves with the tonic share.
- **E-FU8B-8 (revised after the gate condition).** I first pinned FU-7's DI-89 guard ("0 s of flag-while-breathing")
  as an `it.fails`. The orchestrator did not approve that pin. The guard is a passing `it` again, through a correction to
  the test's sampling only (`drug-apnoea.test.ts`); no engine file changed.
  - **Bisect over the Part B commits (DI-89, contradicting samples):**

    | Commit | Seconds |
    |---|---|
    | `4a1cc3f7` main, B1, B2 | 0 |
    | `5e3cd9b2` B4 | **1** |
    | B3, B5 and both fixes after it | 1 |

    B4 moved it.
  - **Trace at 20 ms, same rig.** Flag = `neuro.resp.apnoea`; rate = `resp.spont.rr` in /min.

    | Instant | Main: flag | Main: rate | After B4: flag | After B4: rate |
    |---|---|---|---|---|
    | 539.00 | up | 0 | up | 0 |
    | 540.00 (a 1 s sample) | up | 0 | **up** | **4.07** |
    | 540.10 | — | — | down | 4.07 |
    | 541.00 (a 1 s sample) | up | 0 | down | 4.07 |
    | 541.02 | up | 4.08 | — | — |
    | 541.10 | down | 4.08 | — | — |
    | 542.00 (a 1 s sample) | down | 4.13 | — | — |

    B4 shifts the chemoreflex's first committed rate after the apnoea from 541.02 to 540.00. That is exactly a 1 s
    sample instant.
  - **The signal that changes first is the committed rate (Stage 3).** The flag is 7f's reading of that rate.
    - R51 fixes the chain order: 7f steps before Stage 3 within one engine pass, and 7f steps at 0.1 s.
    - So the flag clears one 7f step (≤ 0.1 s) after the rate commits.
    - On main the same 0.08 s lag is present but falls between samples.
    - No breath is in progress under a standing flag: the first breath follows the commit.
  - **Correction.** A contradicting sample is re-read one `NEURO_DT_S` later. It counts unless the flag is down then.
    - What the test asserts is unchanged.
    - Mutation check: a deliberately sticky flag (held while the rate is below 4.5/min) still fails the guard, with 9 s
      of flag-while-breathing.
- The plan's E-FU8-7 (`baroreflex.ts`, FU-4's file) applies as declared.

## 7. Showcase rehearsal (KIT-GATE.md procedure; final merged head `a531c739` = FU-8 Part B + main `cdf95a2c` incl. FU-9 Part B)
The kit was built into the scratchpad (`VERSION.txt` `a531c739…`). Five cases plus the clock check ran on Chromium and
WebKit through the perl launcher: **12/12 PASS**. Results were copied out and `docs/showcase` restored. Before the
merge, the same run was also 12/12 on `70124113` (prototype line) and on `ef79e74e` (final B4).

| Case | Round 3 (FU-7 build 4a1cc3f7, the current showcase build) | FU-8 Part B, merged head (Chromium / WebKit) |
|---|---|---|
| Healthy induction: apnoea alarm after "Induce now" (≤ 70 s) | 55.0 / 55.0 s | **59.4 / 59.1 s** (PASS) |
| Healthy induction: MAP baseline → nadir | 94.8 → 71.7 / 71.6 | **94.8 → 65.6** (PASS; −6 mmHg) |
| Healthy induction: CO2 tile after intubation | 45 | 45 (PASS) |
| Anaphylaxis: HR at 2 min; systolic > 110 after adrenaline | 135; 11.3 / 11.4 s | 135; 11.3 / 11.4 s (PASS) |
| Bronchospasm: VTE before → 3 min → 6 min | 162 → 304 → 368 | 160 / 162 → 305 → 368 (PASS) |
| Tamponade: MAP < 40 after propofol | 112.7 / 112.7 s | **74.7 / 74.7 s** (PASS) |
| Tamponade: 2 min after propofol | (pulsatile; round 2: HR 40, 41/29) | **pulseless**: "IBP1 STATIC PRESSURE" ≈ +92 s, mean 15.7, HR 45 |
| Haemorrhage: pulse lost; "SPO2 NO PULSE"; ROSC after CPR | 10:03; 10:40; 4.3 min | 10:03; 10:40; 4.3 min (PASS) |
| Haemorrhage: 1 min after "Pulse back" | 132/89, HR 78 | 132/89, HR 78 |
| Second load restarts the clock | 02:04 → 00:05 | 02:04 → 00:03 / 02:03 → 00:04 (PASS) |

For the run sheet, if FU-8 Part B enters the showcase build:
- **Tamponade:** the case reaches PEA about 1.5 min after propofol. Before, the patient was still pulsatile at 2 min.
- **Induction:** the nadir is 6 mmHg deeper and the apnoea alarm about 4 s later.
- **Other cases:** unchanged.

## 8. Verification at the gate (re-run after the gate condition; head `4ed0b729`, main `cdf95a2c` merged — `origin/main` unchanged since, FU-10 not merged yet)
**Commands:**
- `pnpm -r typecheck`: clean.
- `pnpm build`: OK.
- `check-notices`: OK.

**Engine `CI=1`, all six slow groups** (local wall time):

| Group | Files | Tests | Result | Wall time |
|---|---|---|---|---|
| fast | 308 | 1,372 + 1 skipped | pass | 118 s |
| slow-a | 31 | 80 | pass | 1,016 s |
| slow-b | 38 | 204 | pass | 675 s |
| slow-c | 16 | 44 | pass | 544 s |
| slow-d | 19 | 118 | pass | 545 s |
| slow-e | 5 | 34 | pass | 525 s |
| slow-f | 3 | 59 | pass | 489 s |

DI-89 is a passing `it`, logging one in-pass edge at 540 s.

**Packages:**

| Package | Tests | Result |
|---|---|---|
| controller | 226 | pass |
| renderer | 90 | pass |
| skins | 191 | pass |
| demo | 200 | pass |
| validation | 107 + 11 skipped | pass |
| ventilator | 97 | pass |

**End-to-end:** Stage 9 + showcase e2e on Chromium + WebKit: 30 passed, 6 skipped (the screenshot rewrites were
reverted).

**Showcase rehearsal** on a kit built from `4ed0b729`: 12/12. Per case:

| Case | Result |
|---|---|
| Healthy induction | apnoea 62.5 s, nadir 65.6–65.7, CO2 tile 46 |
| Anaphylaxis | 11.3 s |
| Bronchospasm | 160/161 → 305 mL |
| Tamponade | MAP < 40 at 73.9 / 74.0 s |
| Haemorrhage | pulse lost at 10 min, ROSC after 4.3 min of CPR |
| Clock | restarts |

These are within run-to-run timing of §7. The apnoea alarm varies 59–62.5 s across runs, inside the 70 s check.

**Slow-group placement.** The new slow files match `fu8-*`, so they are in slow-a: `fu8-tcp-pain` 13.3 s,
`fu8-tonic` 8.9 s, `fu8-sensor-map` 0.2 s locally.

**What the earlier full runs found:**
- the first full run on the B4 commit: FU-9 H1/F5 in slow-c (→ the gate revision, `outF` only);
- the second, on `ef79e74e`: RS14 ×2 in slow-d (pins flip, E-FU8B-7) and DI-89 in slow-f (→ the sampling correction,
  E-FU8B-8 revised).

**The tick bench** failed once under load average 120–250 and passed in every package run since.

**When FU-10 Part A merges** (`origin/fu-10-endocrine-thermal`; still unmerged at this head):
- renumber glossary entry 339 after FU-10's 347;
- place `fu8-*` in its seven-group packing;
- resolve `pk-longrun` to what is true on the merged tree, with the measured Ce in the title;
- re-measure B1's insulin numbers.

On B1 and E-FU10-14: B1 changes only the `insulin` row's INFUSION reference (`refRatePerKg`). E-FU10-14 moves the
combined `insulinDextrose` bolus's K⁺ to 7g's insulin PD, so the two do not duplicate. `insulinDextrose` keeps the
absolute infusion reference: if an infusion of the combined row is meant to be possible, it needs the same per-kg flag.

## 8c. After FU-10 Part A merged (main `998561b8`; merge `b2077e3e`, fix `83cb3075`)
Only what moved:
- **Conflicts resolved:**
  - glossary entry 339 → **348** (`hemo.circ.skinTone`, after FU-10's 339–347);
  - `pk-longrun`: both branches had flipped it, and it stays `it` with the merged-tree value in its title: **2.5033**
    (FU-10 alone 2.4995, FU-8 alone 2.5021).
- **Reconciliation with E-FU10-14:**
  - FU-10's `fu10-insdex-k` asserts the combined `insulinDextrose` row has the plain insulin row's PK.
  - The combined row now takes B1's per-kg infusion reference too (`gammaPk(…, true)`): one insulin.
  - Its bolus K⁺ path (FU-10's) is untouched.
  - B1 insulin infusion, re-measured on the merged tree: unchanged (glucoseDelta −60.00, kShift −0.600).
- **Slow groups:** the `fu8-*` glob bundle stays whole in FU-10's slow-d. Part B adds ≈ 60 s CI (estimate), so slow-d is
  ≈ 34.2 min. ci.yml's disjointness check is unchanged, because the glob is.
- **Truth leaves:** 12-drug tree **2,079** of 2,100.
- **Local checks on the merged tree:**
  - typecheck, build and check-notices: OK.
  - fast set: 315 files / 1,397 passed + 1 skipped. Run after the fix; before it, `fu10-insdex-k` failed.
  - slow-d: 34 files / 150 passed.
  - files from other groups that Part B touches (`circ-sanity-1`, `resp-inspired-co2`, `resp-suite`, `drug-apnoea`,
    `fidelity-lowflow`, `blood-hyperk`): 48 passed.
  - demo: 200.
  - Stage 9 + showcase e2e: 30 passed on both engines.
  - The remaining slow groups are left to CI.
- **Rehearsal: 12/12 on both engines.**

| Case | Result |
|---|---|
| Healthy induction | apnoea 62.5 / 62.6 s, MAP 94.8 → 65.7 |
| Tamponade | MAP < 40 at 73.9 s |
| Anaphylaxis | 11.3 s |
| Bronchospasm | 161/162 → 305 mL |
| Haemorrhage | pulse lost at 10 min, ROSC after 4.3 min |

## 8b. For the owner
- **HFrEF propofol fall:** −41 to −42 %, beyond the −40…−20 band in DI-47 and CM-06b. This is a size question for the
  A23 calibration pass.
- **Awake transcutaneous pacing at 100 mA:** MAP 98 → 141.6, NE 275 → 608. This is a first [ENG] size (W25 (8)).
  DV-08b's unsedated rig now reads a paced MAP of 137.
- **Class III haemorrhage + propofol 2 mg/kg:** it now arrests at +89 s, and the course is a cliff. MAP goes 38.8 → 21.3
  → 11.8 at +30/+60/+90 s; nadir 2.5; minimum CoPP 0.1. Before B4 the patient recovered from a nadir of 26.4.
- **New arrests after B4 (physiology audit):**
  - tamponade + propofol 1 mg/kg at 910 s;
  - 80 y HTN with propofol 4 mg/kg + remifentanil 2 µg/kg at 410 s;
  - class III + propofol 2 mg/kg at 1050 s.
- **Showcase deltas:**
  - **Induction:** MAP nadir 71.7 → 65.6; apnoea alarm 55 → 59 s.
  - **Tamponade:** MAP < 40 at 74.7 s (was 112.7 s), and the patient is pulseless at 2 min after propofol.

## 9. Final review
I dispatched a fresh reviewer (Opus) on the B1–B5 range. It found no Critical issues; I graded its findings as
follows.

**I-1, fixed.** An inhibited demand pacer still caused pain.
- Commit `2d75cca3`: the pain now follows delivered pulses.
- The new test went red to green: 1.21 → 0.
- Pacing tests: 181 passed.

**I-2, declared, not reverted.** DV-08b/08c moved against the plan's "unchanged" line; this is now E-FU8B-4.

**Deferred minors:**
- **M-1:** the stimulus add-and-restore has no try/finally. A side effect: above 40 mA a non-paralysed patient's
  depth index reads EMG noise (7f's `stim.level > 0` rule).
- **M-2:** `maxDose` is checked only at boluses, so an infusion's accrued total warns only at the next bolus.
- **M-3:** the controller's `StateEvent` type has no `sensors` field. An instructor-set ECG motion artefact reads as
  `ecg: 'motion'`.
- **M-4:** the glossary edit, now declared as E-FU8B-5.
- **M-5:** test re-readings:
  - "ΔHR > 0" is tested as the sinus-node rate.
  - "Unpaced reflex" is tested as 40 mA against 100 mA at the same capture.
  - The B5 GA row is a guard: it passes on the base too.

## 10. Not done / for the orchestrator
- **The P-1 cross-cutting perfusion-floor audit is not in this branch.** The 15:20 ruling moved it to FU-12. The
  physiology audit's arrest table above (§5) is the raw material for it.
- **The insulinDextrose per-kg question** (above).
- **Owner sizes:**
  - HFrEF propofol −41 to −42 % (DI-47 and CM-06b TS).
  - The HTN extra fall of 4.96 points (E-FU8B-6).
  - Awake TCP MAP 142 at 100 mA.
  - These sit with A23 and W25 (8).
- **The B4 line choice:** `outF` only, as delivered, against the prototype's `outF × brainF` (§2 gate revision).
