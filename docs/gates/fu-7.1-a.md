# Gate note — FU-7.1 branch a: the drug layer and the neuromuscular drive

Branch `fu-7.1-a`, from `origin/main` 48864439 (the plan's base). Main moved during the gate to 7513a481 (FU-11-a, PR
#43). That merge brought in no file this branch edits, and the branch was merged with it and re-verified (§2b). Plan:
`docs/plans/fu-7.1-drug-physiology-leftovers.md`, branch copy, ticked. Executor: one local session (Opus 5.5) on a
machine shared with other executors. The load average reached 114 during the slow groups, so the wall times below are
contended.

**Tasks done: A0, A1, A2, A4. Task A5 (potassium chloride) is STOPPED and is NOT in this PR** (§4). The plan's own
block check passed (`check-blocks.py --branch a`: 25 find/replace blocks, 6 creates, 0 problems). Every block of A1, A2
and A4 was applied by a script that requires each find to match exactly once, so all of them are byte-exact.

## 1. Commits

| commit | what |
|---|---|
| 6aaf7115 | the plan copy |
| fb8fc1d3 | A1: every neuromuscular blocker is prescribed in mg/kg from the dose picker |
| 6a4da296 | A2: an opioid deepens the hypnotic's vasodilation and venodilation (`HEMO_SYN_MAX` 0.2, `HEMO_SYN_U50` 1.2) |
| 59a9700a | A4: the first diaphragmatic effort after a blocker is not a breath (+ the `fu71-*` slow glob, §5) |
| 1d44fa6f | merge of `origin/main` 7513a481 (FU-11-a) |
| (this) | the gate note, two screenshots, and the plan's ticks |

## 2. Suites

### 2a. Full gate on the branch before main moved (head 59a9700a, `CI=1`)

| check | result | wall |
|---|---|---|
| `pnpm -r typecheck` | clean | 13 s |
| fast set, engine-core | **317 files / 1403 passed, 1 skipped** | — |
| fast set, other packages | audio 58, skins 191, controller 227, ventilator 96 + **1 timeout** (`ports.test` "monitor side…", 5 s limit, under load; **green alone**, 3/3), renderer 90, validation 107 (+11 skipped), demo 201 + **1 timeout** (A1's engine case, 5 s demo default; **green alone** in 1.4 s) | 440 s |
| `test/l2` + `test/l3` (R50 I5) | **244 files / 1152 passed, 1 skipped** (base: 242 / 1146 + 1 skipped; +6 = A2's 4 unit cases + A4's 2) | 28 s |
| `test/engine/engine-pipeline.test.ts` | 8 passed | 66 s |
| slow-b (the `fu71-*` files and the remainder) | **15 files / 76 passed**: `fu71-induction-synergy` 16.7 s, `fu71-roc-two-events` 9.2 s | 1294 s |
| slow-c (`pk-acceptance-pd` …) | **21 files / 72 passed** | 1213 s |
| slow-d (`stimulus-surge`, `clinical-suite`, `resp-induction` …) | **34 files / 150 passed** | 1268 s |
| slow-e (`neuro-*` …) | **10 files / 58 passed**: `neuro-engine` 69 s, `neuro-acceptance` 37 s, no timeout | 1192 s |
| slow-f (`drug-layer`, `drug-apnoea`, `fu7-nmb-one-state` …) | **12 files / 95 passed** | 1364 s |
| `pnpm build` | clean | 8 s |
| `pnpm run check-notices` | OK (3 governed files) | 2 s |
| `npx playwright test --retries=0` (Chromium + WebKit) | **93 passed, 31 skipped, 2 failed**: `stage6a` "host + remote + viewer over rtc" and `stage6a-latency` (Chromium). These are the WebRTC pair that fails on this machine. Measured on a clean `origin/main` 7513a481 worktree: **the same two fail there** (2 failed, 2 passed) | 15.0 min |

The full e2e run rewrites the tracked screenshots under `docs/gates/` (stage-4a … stage-9). They were restored with
`git checkout -- docs/gates/`, and none is part of this branch.

### 2b. After merging `origin/main` 7513a481 (FU-11-a), each package run on its own

| check | result |
|---|---|
| `pnpm -r typecheck` | clean |
| fast set | audio 65, skins 191, **engine-core 318 files / 1412 passed, 1 skipped**, controller 240, ventilator 97, renderer 90, validation 107 (+11 skipped), **demo 202** — all green, no timeout |
| `pnpm build` | clean |
| `npx playwright test stage9-app stage9-tasks stage9-glossary fu11- --retries=0` | 19 passed, 1 skipped (stage9-tasks is Chromium only) |

FU-11-a's code is controller, renderer, audio, `l3/alarms` and `l3/defib-pacer`, and it shares no file with this
branch. The slow groups were therefore not re-run after the merge.

## 3. Per task: prototype vs this branch

| check | before (main) | prototype | this branch |
|---|---|---|---|
| **A1** units offered for cisatracurium / vecuronium / atracurium / mivacurium | µg, µg/kg, mg | + mg/kg | **+ mg/kg** (`mcg, mcg/kg, mg, mg/kg`, both browsers) |
| **A1** dose box on opening those four | 0, µg | 0.15 / 0.1 / 0.5 / 0.2 mg/kg | **0.15 / 0.10 / 0.50 / 0.20 mg/kg** (both browsers) |
| **A1** engine's answer to cisatracurium's first preset | — | last breath +134 s (+136 with A4), EtCO2 0, apnoea | **+134 s** at A1, **+136 s** with A4, EtCO2 0, apnoea flag true |
| **A1** fentanyl / phenylephrine `doseUnits` | no mg/kg | no mg/kg | **no mg/kg** |
| **A2** unit `svr` propofol + fentanyl vs the independent product | 0.6963 vs 0.6963 | 0.6630 vs 0.6963 (× 1.165) | **0.6630 vs 0.6963, factor 1.165** |
| **A2** Billard rig ΔSBP alone / with fentanyl / ratio | 25.6 / 27.8 / 1.09 | 25.6 / 29.6 / 1.16 | **25.6 / 29.7 / 1.16** |
| **A2** Billard rig ΔMAP alone / with fentanyl | 22.3 / 26.0 | 22.2 / 27.3 | **22.3 / 26.9** |
| **A4** unit course: first effort / effective ventilation / minutes below the dead space | 13.8 min at **210 mL** (the plan quotes 466) / none / 0.0 | 13.8 min at 35 mL / 25.4 / 9.4 | **13.8 min at 35 mL / 25.4 min / 9.4 min** |
| **A4** probe P5 rig: first effort, VT max, EtCO2 max, awRR max, arrest | +944 s, **VT 424 mL, EtCO2 54, awRR 45, no arrest within 20 min (rescued)** (the plan quotes +946 s, 329 mL, 36, 43, arrest +952 s) | +946 s, 35 mL, 0, 0, arrest +960 s | **+944 s, VT 35 mL, EtCO2 0, awRR 0, arrest +962 s** |
| **A4** `DIAPH_APNOEA` | 0.05 | 0.05 | **0.05 (unchanged)** |

**The bands A2 is capped by (A2 Step 5, and again in slow-d at the gate):**

| band | source band | main | this branch |
|---|---|---|---|
| FU-7 Task 10 case 1, awake ΔMAP | 20–40 | 38.4 | **38.4** |
| FU-7 Task 10 case 2, fentanyl 3 µg/kg blunting ratio | 0.2–0.7 | 0.23 | **0.22** |
| FU-6 induction apnoea, propofol + fentanyl 2 µg/kg | 60–240 s | 110 s | **108 s** |
| FU-6 induction apnoea, propofol + remifentanil 0.1 | ≥ 90 s (90–300) | 184–190 s | **186 s** |
| DI-01c propofol + remifentanil, more than additive on MAP | excess < 0 | −3.5 % (title) | **−5.5 %** (MAP both −41.1 %, sum −35.6 %): deeper, as the interaction intends; still asserts |

A2 Step 5 ran `stimulus-surge`, `resp-induction`, `drug-layer`, `test/l2/pk` and `test/l2/neuro`: **47 files / 297
passed**.

**A4's blast radius (Review Focus 6).** `test/l2/neuro`, `neuro-engine`, `neuro-acceptance`, `neuro-spont`,
`drug-apnoea`, `resp-ga-state`, `resp-induction`, `fu7-nmb-one-state` and `resp-suite` gave **25 files / 156 passed**.
`drug-apnoea`'s known misses are unchanged: fentanyl 5 µg/kg 0 s of apnoea (VE nadir 2.28, SpO2 86), Bailey pair 46 %,
0 of 20 seeds. The residual-block ratio is still 0.80 and the propofol guard is still 38 s.

**Known misses recorded by this branch (`it.fails`, red as declared):**

- A2: the Billard ratio is **1.16** against the paper's 1.7–2.1 (1.89). Owner question Q2.
- A5's textbook K rise would have been the second record. It is not here, because A5 is not in this branch (§4).

## 4. Task A5 (potassium chloride): STOPPED

**What happened.** Every block of A5 applies cleanly. Its own test is green with exactly the prototype's numbers:
`20 mmol/h K 4.20 → 4.97 at 1 h (+0.77), 4.33 at 3 h (+0.13); 10 mmol/h +0.37`, and both warnings. The bolus warning
reads "20 mmol ordered as a bolus — it must be infused at 20 mmol/h or less (…Miller 10e ch. 46…)" and the rate warning
reads "40 mmol/h exceeds the maximum 20 mmol/h (…)". The `im` route is refused. Also green: `test/l2` + `test/l3` (244
files / 1152 passed) and `blood-hyperk`, `blood-k-rhythm`, `blood-sanity-acid`, `drug-layer` and `pk-wiring` (46
passed). **The demo package then fails one test:** `apps/demo/src/app/glossary.test.ts` › "drug names come from the
glossary" — `potassiumChloride: expected undefined to be defined`. R56 (orchestrator ruling 5) requires every library
drug to have a `DRUG_NAMES` row in `apps/demo/src/app/glossary-data.ts`.

**Why it stopped.** The fix is one line in `glossary-data.ts`. That file is under `apps/demo/src/app/**`, which the
plan's Global Constraints list as "Never touch" (FU-11's, except `drugs.ts` and `panel/drugs.ts`). The prototype's
"demo package green" claim for A5 is wrong on this point. The brief's rule for a test that cannot go green inside the
plan's files is to stop the task and report it.

**Verified fix, not applied:** `potassiumChloride: { name: "Potassium chloride" }, // FU-7.1 A5`, inserted
alphabetically before `propofol`. With that line `glossary.test.ts` and `drugs.test.ts` are 8/8 green. None of
FU-11-a/b/c edits `glossary-data.ts`.

**For the orchestrator.** Either allow the one glossary line, so that A5 lands here or as a follow-up commit, or route
A5 elsewhere. A5 is reproducible mechanically from the plan's blocks. The whole A5 diff, the glossary line and the test
file are also kept in the executor's scratchpad (`fu-7.1-a/a5-stopped.patch`, `a5-glossary-line.patch`).

## 5. Deviations

1. **`vite.config.ts`.** The `fu71-*` slow glob was added in A4, as A4 Step 6 says to do when branch b has not merged.
   It is B4 Step 7's identical line, placed immediately after the `fu10-*` glob. A merge of branch b will see the same
   line. Checked: the fast set excludes the two `fu71-*` engine files, and slow-b runs them (the two `fu71-*` unit files
   stay fast).
2. **Plan copy commit message.** It follows the executor brief ("…leftovers plan"), not the plan's "(branch a copy)".
3. **Base numbers differ from the plan's A0.3 counts.** On 48864439 this machine measured `test/l2/pk` at **27 files /
   145 passed** (the plan says 22 / 118) and `test/l2` + `test/l3` at **242 / 1146 + 1 skipped** (the plan says 1 160).
   The A4 red phase also measured different base behaviour: first-effort VT 210 mL in the unit rig (plan: 466), and on
   the P5 rig a VT of 424 mL, EtCO2 54, awRR 45 and **no arrest at all** (plan: 329 / 36 / 43 / arrest +952 s). In both
   readings the base patient is rescued, which is what A4 removes. A5's red phase was 3 failed, 1 passed (plan: 4
   failed): the `it.fails` record passes on the base because the unknown drug throws.
4. **Small differences from the prototype's green numbers.** A2's ΔSBP with fentanyl is 29.7 (prototype 29.6) and ΔMAP
   is 22.3 / 26.9 (22.2 / 27.3), with the ratio 1.16 in both. A4's first effort is at +944 s and the arrest at +962 s
   (+946 / +960); the engine rig samples every 2 s.
5. **Timeouts under load.** Two tests timed out in the parallel gate run, A1's engine case in `drugs.test.ts` (the demo
   package's 5 s default) and `ventilator/ports.test.ts`. Both are green alone and in the post-merge package-by-package
   run. **A1's case has no explicit timeout, as the plan wrote it.** If CI's demo job times out on it, the remedy is a
   describe-level `{ timeout: 30_000 }`, the precedent of `physiology-console/view.dom.test.ts`.
6. **The Review Focus 5 hand check was run by a Playwright script in both browsers**, against the branch's Vite dev
   server, not by hand in the pane:
   - Search "cisatracurium": the box opens at 0.15 mg/kg, with presets 0.15 and 0.2 mg/kg and mg/kg in the select.
   - At ×4, Give now: EtCO2 first reads 0 at +77 s and stays 0. At +185 s the apnoea flag is set and the monitor shows
     `CO2 APNEA`, CO2 0 and awRR 0, in both Chromium and WebKit.
   - Vecuronium, atracurium and mivacurium open at 0.10 / 0.50 / 0.20 mg/kg.
   - Atracurium and mivacurium have no block in v1 by design (FU-7 review F12, Q11). Giving them leaves the TOF at 4,
     and only the histamine fall appears. This is not a defect.
   - "potassium" finds nothing, because A5 is not in the branch.

   Screenshots (indexed PNG): `docs/gates/fu-7.1-a/cisatracurium-picker-chromium.png` (7 KB) and
   `cisatracurium-apnoea-webkit.png` (45 KB).

## 6. Merge order

Branch a first, then `fu-7.1-b`, which merges LAST and runs the five-case rehearsal on the integrated tree. Branch b
will meet the identical `fu71-*` glob line in `vite.config.ts`. It must keep one copy of it, plus FU-11 K4's
`interactions-misc` line if that has landed.
