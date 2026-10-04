# FU-9: Blood, fluids and acid–base integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-30, fixer): R50 review APPROVE WITH FIXES (`origin/review/fu-9-plan:docs/review-inputs/fu-9-review.md`,
> reviewed on `2e94f55`); rulings R1–R10 and the RH amendment (research/13 H1–H10) APPLIED. Base: `origin/main`
> `2473f0b`. VERIFIED: every task was re-prototyped on a fresh detached worktree of `2473f0b` (`<scratchpad>/fu-9/wt2`,
> never pushed; patch at `scratch/plans-backup/fu-9-prototype.patch`); a script applied THIS DOCUMENT's blocks in order
> (Parts A and B: 156 find/replace blocks and 28 creates; B1's call-line block on FU-7 Task 14's merged line, simulated)
> and reproduced the prototype byte for byte; every Part A prefix (A0b … A13) type-checks and passes `test/l2`. Part C
> (R3, gated on FU-8 A13) was prototyped on `2473f0b` + FU-8's `b23a3ea` (`wt3`) and its blocks were checked against
> both trees (Self-review). Measurement: the BF runner (research/22, 74 cells), the RH runner (research/13, 62 cells),
> SP-08 (research/21), `audit:physiology` with a perturbation ensemble — all on `2473f0b` and on the prototype. The
> orchestrator's DV-25b input is answered in D12 (no FU-9 task).
>
> Fixer changes in one list: R1 electroneutral, sourced products (A3); R2 scaled Nitta COP (A5); R3 Part C; R4
> natriuretic expansion urine (A1); R5 deadband, envelope, ensemble (A7, D13, G); R6 B1 on FU-7's path; R7 the PEA dip
> handed to FU-8 (R-FU9-1); R8 OQ5 numbers; R9 E-FU9-1..3 accepted, E-FU9-4 new; R10 memoised arms + slow-c (A0b); F7–F9,
> F11, F12 fixed; RH H1 (in A1, jointly calibrated with F1), H2 + H4 (A9), H6 (A10), H10 (A11), H3 (A12), H8 (A13);
> H5's circulation half, H7, H9, H11, H12 and the CKD/cirrhosis profiles handed.

**Goal:** make the blood, fluid and acid–base layer behave as the textbooks say in the states the coverage run BF
(`research/22-coverage-blood-fluids.md`, 74 cells) found wrong, each by the smallest MECHANISM the report proposes, in
the layer that owns it (R51 chain order and canonical names), with every graded cell measured before and after on the
BF runner:

- **F1** the kidney excretes an expanded circulation (7d volume factor above normovolaemia; Hahn's context-sensitive
  retention — awake < GA < class III);
- **F2** a profile's K⁺ reaches the ECG and calcium antagonises it without drawing hypokalaemic morphology;
- **F3** low flow raises O₂ extraction before it cuts VO₂ (SvO₂ falls in haemorrhage; supply dependence only below
  the critical DO₂);
- **F4** septic capillary leak reaches the lung water;
- **F5** citrate is an anion in the strong-ion difference, its clearance does not collapse with (CO/CO₀)², stored
  red cells carry their lactate;
- **F6** renal K⁺ excretion follows plasma K⁺ and loop diuretics;
- **F7** a chronic hypercapnic profile starts with its chronic renal compensation (+3.5 HCO₃ per 10 mmHg);
- **F8** plasma COP from albumin AND globulins; a profile's albumin shows the same anion gap as the same albumin
  reached by dilution;
- **F9** metabolic alkalosis is compensated by hypoventilation;
- **F10** hypokalaemia potentiates non-depolarising block (Part B, after FU-7's `interactions.ts` rewrite);
- **F11** the brain follows plasma osmolality (hyponatraemic swelling);
- **RH amendment** (research/13, the renal/hepatic coverage run): **H1** an anaesthetised kidney reads its output
  against the lowered demand (not oliguric at a normal MAP; urine recovers after resuscitation) — in A1, calibrated
  jointly with F1; **H2** filtration equilibrium (GFR falls with the plasma flow); **H4** pressure natriuresis on the
  renal perfusion pressure (IAP, venous congestion); **H6** `aki` is nephron loss; **H10** cold diuresis; **H3** one
  hepatic flow with 7d's splanchnic/outflow factor; **H8** mannitol is 7c's plasma osmole;
- **Part C** (R3, after FU-8 A13): 7c's blood volume on FU-8's one body-size rule.

**Architecture:** no new module; each change sits in its owner's file. 7d (`l2/renal/{params,model,kidney}.ts`,
`l2/organs/{inputs,pipeline}.ts`, `l2/brain/{params,model}.ts`, `l2/liver/liver.ts`), 7c
(`l2/blood/{oxygen,solutes,fluids,core,params,pipeline}.ts`), 7e (`l2/endo/adapters.ts` `writeBlood` only), 7f
(`l2/neuro/spont.ts` `paco2SetPoint` and its call; `l2/neuro/{interactions,pipeline}.ts` in Part B), CI (`vite.config.ts`
and `.github/workflows/ci.yml`: CI amendment 5, Task A0b), and in Part B one engine line and Stage 3's
`gasPatient().paco2Rest`. The plan is split by file overlap with the in-flight plans:

- **Part A — independent, executes now** (after FU-4/FU-5, beside V.1/FU-6/FU-7/FU-8/7k): no file that FU-6's, FU-7's
  or FU-8's plan edits, or only lines those plans do not touch (named per task, with the other plan's blocks checked).
- **Part B — after FU-7 merges (and therefore FU-6):** F10 (`l2/neuro/interactions.ts` — R6: K joins FU-7's
  `InteractionCtx` beside Mg and iCa, and the call-line block is FU-7 Task 14's merged line) and F7 (`l2/gas/params.ts`,
  FU-6/7k's area while they are in flight).
- **Part C — after FU-8 A13 merges** (R3): `bloodPatient` reads FU-8's `sizeWeightKg` (`l2/body-size.ts`, created by
  FU-8 A13), so 7c and the circulation hold one blood volume. Independent of Part B.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (its own Chromium and WebKit are installed
locally), pnpm 9.15.9 via `npx`. No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **R44** (Ali's calibration pass is
non-blocking; executors do not tune), **R45** (mechanisms, never band changes; unreachable targets `it.fails` with
numbers), **R51** + addenda 14 and 15 (canonical names: `blood.out.{albuminGL, bvRel, hbfRel, lactate}`, the renal seam
`blood.core.renal`, the engine chain order), **R53/R54** (linked physiology; the coverage matrix is the standing
definition), **R58/R60** (7i labs and coagulation are v1.1: the 17 coagulation NE cells stay out of scope), **G-FU4**
(FU-4's arrest behaviour — must not move), the **CM comorbidity run** (research/19: C7 COPD normocapnic, C11 COP at
albumin 25), **FU-8** (it owns ONE obese-patient definition, I-51, and profile/set-point consistency, I-52 — FU-9
does not redefine them; Part C adopts its A13 rule). Sources: `research/22-coverage-blood-fluids.md` (§2 cells, §3
F1–F13, §5 acceptance, §6 Ali's questions), `research/13-coverage-renal-hepatic.md` (RH cells, §3 H1–H12 — the RH
amendment), `research/21-coverage-stimuli-positioning.md` (SP-08 laparoscopy arms), `research/12-coverage-matrix.md`
§5.10, `research/19-coverage-comorbidity.md`. Plans read for scope (so
nothing here duplicates them): FU-6 (`fu-6-respiratory-integration.md`, untracked: owns audit 09 R11 — anaemia → CO,
COHb washout — in its Task 14), FU-7 (`fu-7-drug-layer.md`, untracked: Task 14 routes Mg/iCa from 7c into
`interactions.ts`, no K⁺ term), FU-8 (`fu-8-followups.md`, being written), 7k (`stage-7k-respiratory-mechanics.md`,
untracked: mechanics and volumes only).

---
## Global Constraints

- **R45:** mechanisms, never band changes. No existing acceptance band is widened, removed or re-worded to pass. A band a
  mechanism cannot reach stays (or becomes) `it.fails` with the measured number in its title. A pre-declared `it.fails`
  that a task flips to `it` is named in that task with its before/after numbers. Constants that are not sourced are
  `[ENG]` with the fit target named in the code comment; no executor tunes a constant to pass a band (R44: that is
  Ali's pass). An existing test whose NUMBER moves because the physiology it pinned was the defect is re-pinned only
  where the task names it, with the old and new number and the reason in the test's comment.
- **R51:** canonical names (addendum 14); the engine chain order (validate/apply device → pk (7g) → neuro (7f) → organs
  (7d) → blood (7c) → endo (7e) → Stage 3 → hemo; advance: pk → resp/lung → blood → endo → organs → hemo) is not
  changed. 7c stays the only owner of `hbfRel`; 7d the only writer of `blood.core.renal`; 7e the only writer of
  `blood.core.fl.kfMult` (and, after Task 4, `fl.sigma`).
- **FU-4 arrest behaviour must not move.** The Gate task re-runs `npx -y pnpm@9.15.9 run audit:physiology` (research/08's
  four-patient propofol table, Ali's tamponade case, class III + propofol, the CPR rigs) and the FU-4 engine files
  `test/engine/{circ-lowflow-arrest,clinical-suite,blood-k-rhythm}.test.ts`; every task that touches the blood volume,
  O₂ extraction or K⁺ names its measured effect on them (the "FU-4 check" line in each task).
- **Base and branch:** branch `fu-9-blood-fluids` from `origin/main` (at least `2473f0b`). Worktree
  `projects/patient-monitor-engine/scratch/wt-fu-9` (R25: never the shared checkout). Push after every task's commit
  (`git push -u origin fu-9-blood-fluids` the first time, `git push` after). Never push to `main`; never merge (the Gate
  task opens the PR and stops); the PR is never self-merged.
- **Part A / Part B / Part C:** execute Part A (Tasks A0, A0b, A1–A13) now. Part B (Tasks B0–B2) starts only when FU-7
  has merged to main, Part C (C0–C1) only when FU-8's Task A13 (`l2/body-size.ts`) has: each starts with `git fetch
  origin && git merge origin/main` and re-verifies its find blocks on the merged tree. A part whose gate has not opened
  when Part A is done becomes a later PR from the same plan (PR title suffix "(Part A)", "(Part B)", "(Part C)"); the
  Gate task runs once per PR.
- **Merging main while other stages land:** before any task that edits `engine.ts`, `l2/neuro/**`, `l2/endo/**`,
  `l2/blood/core.ts`, `l2/blood/params.ts`, `vite.config.ts`, and in the Gate task: `git fetch origin && git merge
  origin/main`. Every edit is a find-and-replace anchored on quoted text that matches EXACTLY ONCE in the tree it is
  applied to — `origin/main` `2473f0b` plus this plan's earlier tasks (29 blocks anchor on an earlier task's text: apply
  in order); if a block no longer matches byte for byte (FU-6 edits `l2/blood/{core,params,circ-adapter,pipeline}.ts` and
  `l2/neuro/spont.ts` on OTHER lines — except the ONE `s.paco2Set = paco2SetPoint(…)` line Task A7 shares with FU-6
  Task 13, whose merged form Task A7 gives; FU-7 edits `l2/endo/adapters.ts` `writeCirc` and `l2/blood/core.ts`'s
  `createSolutes` line), locate the same statement by its quoted comment and make the same change; never re-type a line
  you are not changing.
- **CI rules (CI amendments 1–5, restated so the executor needs no other document):**
  - `CI=1` for engine tests. Long-run horizons come from `test/helpers/longrun.ts` (never a hard-coded 24 h or 6 h).
  - Any test that can exceed ≈ 30 s wall (in practice every engine test running more than one sim-minute) yields once
    per SIM-MINUTE (`if (t % 60 === 0) await new Promise((r) => setImmediate(r))`).
  - Slow files go in the `SLOW` list of `packages/engine-core/vite.config.ts`. CI runs the slow set as DISJOINT groups,
    one job each. **CI amendment 5 (R50 ruling R10, Task A0b):** a third group `slow-c` = `SLOW_C` (FU-9's `fu9-*`
    engine files plus two slow-b files moved by measured time); `SLOW_B` = SLOW minus SLOW_A minus SLOW_C by Vitest's
    matcher; `ci.yml`'s matrix runs `[slow-a, slow-b, slow-c]`, and its build job prints the three file lists and fails
    on an overlap or a gap (the disjointness gate). Every new FU-9 engine file matches `test/engine/fu9-*.test.ts`, so
    it lands in slow-c with no further edit. The Gate task records the three groups' times on the merged tree.
  - Repeated arms are memoised at module scope (`once()` in `test/helpers/fu9.ts`): an `it.fails` reuses the runs of
    the `it` beside it (R50 F10).
  - Packages that drive a real engine in tests keep the 30 s default budget (amendment 3).
  - Never `git stash` (the stash is shared across worktrees). Scratch and logs under `<scratchpad>/fu-9-blood-fluids/`,
    never bare file names in the repo.
  - Bounded waits: every wait on a background process is an `until` loop of ≤ 10 min that re-checks the PROCESS (not a
    marker line); re-arm it rather than lengthening it.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Engine test:
  `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>` (paths relative to
  `packages/engine-core`). Physiology audit: `npx -y pnpm@9.15.9 run audit:physiology`. **BF runner** (the measurement
  every task quotes; ≈ 40 min for all 74 cells, 1–3 min per cell):
  ```
  cp -R ../research/22-audit-scripts <scratchpad>/fu-9-blood-fluids/bf        # once (the runner lives outside the repo)
  cd <scratchpad>/fu-9-blood-fluids/bf
  PME_ENGINE=<worktree>/packages/engine-core/src/index.ts BF_OUT=out/<task>.json \
    node --import ./hooks.mjs --experimental-strip-types cli.ts BF-02a BF-02b …   # ids or prefixes
  ```
  (`../research` is the workspace folder `projects/patient-monitor-engine/research`, next to `repo/`.)
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (swap in your own
  model name if your harness gives another), and every commit is followed by `git push`. The PR body ends with
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Never touch** (other plans own them while in flight): `l2/lung/**`, `l2/resp/**`, `l2/gas/**`, `l2/co2/**`,
  `types-lung.ts`, `types-resp.ts` (FU-6/7k/V.1) — except, in Part B, `l2/gas/params.ts`'s `paco2Rest` (Task B2,
  E-FU9-3); `l2/pk/**` (FU-7); `l2/circ/**` (FU-4 merged; FU-6/FU-8 edit it); `l2/neuro/**` except `spont.ts`'s
  `paco2SetPoint`, its header line and its one call line (Task A7) and, in Part B, `interactions.ts`/`pipeline.ts`
  (Task B1); `l2/endo/**` except `adapters.ts`'s import, `BloodLike` type and `writeBlood` (Task A4); `engine.ts` except
  Task B1's one line (E-FU9-2); `packages/ventilator/**`; any UI file; `docs/physiology/**` (the orchestrator's);
  `package.json`, `pnpm-lock.yaml`, `.github/**` except Task A0b's `ci.yml` edit (CI amendment 5).

---
## Finding inventory (every BF gap, and what happens to it)

Decision codes: **task** (a task in this plan), **handed** (to a named plan or owner, reason given), **closed** (already
done on main; the evidence named), **Ali** (waiting on Ali — his decision, the model's numbers given), **7i v1.1**
(R58/R60), **recorded** (a measurement kept for the orchestrator, no action here). "Main" numbers are this writer's
BF-runner measurements on `76c952e` (seed 7; the report's own run was on `776ebb5`, BEFORE FU-4 merged — FU-4 moved
several cells, listed in the second table). Re-measured on `2473f0b` (all 74 cells): identical except BF-14 dBE −3.29 →
−3.26 and BF-20a's healthy PaO₂ −8 → −6 (V.1), so the table keeps its numbers.

### F1–F11 (the report's §3) and the smaller gaps

| ID | Finding | Cells (verdict on main) | Measured on `76c952e` | Decision |
|---|---|---|---|---|
| F1 | An expanded circulation is never excreted; awake = GA = class III | BF-02a (WR), 02b (WR), 04 (TW), 01a (TW), 01b (TS), 14 (TW), 20b (TS) | RL 1 L/30 min: retention 30 min after the end awake 0.52, GA 0.53 (GA − awake +0.01), class III − GA 0.00; urine +14/+16 mL/h; 1 u RBC Hb +0.546 at 1 h; 5 L saline retained 3352 mL | **task A1** (7d `renal/model.ts` expansion factor; with H1 in the same task, calibrated jointly — D1; R4: the expansion urine carries the plasma Na) |
| F2 | A profile K⁺ never reached the ECG; calcium then drew hypokalaemia | BF-07a/b (auto PL), 07c (WR: arrhythmia), 08a (TW), 09a (auto PL) | **closed by FU-4 G3** (`bloodEcgTargets` now pushes `kEcg − 4.2`, `blood/pipeline.ts:211`): profile K 6.5/7.5/8.5/2.5 → ECG K 6.5/7.5/8.5/2.5, QRS 124 at 7.5, 260 at 8.5; after CaCl₂ 1 g at K 7.5 the ECG shows 6.34 (not < 3.5). Remaining items are not F2: BF-08a's QRS criterion (−5 ms in 3 min) is read on the ACUTE arm, whose K had fallen to 7.05 (QRS 98) by the dose — see "Recorded" R-3; BF-07c's missing VF/asystole at 8.5 is FU-4 G3's hazard (R-2) | **closed** (FU-4) |
| DV-25b | (orchestrator input, research/20 V11) hyperkalaemia treatment "works late"; contractility said to read plasma K | DV-25b (TW) | profile K 9.5 in VF, CaCl₂ + insulin–dextrose + NaHCO₃ at 100 s: kEcg 9.49 → 8.06 at +60 s → 7.68 at +100 s, contractility `kChem` 0.70 → 1.00 by +100 s (it already reads `kEcg`: `blood/pipeline.ts:178`, FU-4 G3); plasma K −0.28 at 10 min; the time courses are textbook (BF-08a/b/c/d in band) | **closed** for 7c (D12); the forced-rhythm PEA dip in treated hyperkalaemia is **handed to FU-8 Part B** (R7; R-FU9-1) and FU-7 Task 12's shock table (R-FU9-2) |
| F3 | Low flow cuts VO₂ instead of raising extraction: SvO₂ rises in haemorrhage | BF-29b (WR) | 2 L bleed, CO 1.57: SvO₂ 77.8 % (VBG), lactate 3.0; normal-flow arm 85.6 % | **task A2** (7c `oxygen.ts`) |
| F4 | Septic capillary leak makes no lung water | BF-20a (WR), 20b (TS, with F1) | septic (kfMult 2.59) 30 mL/kg: extra EVLWI 0 vs healthy +3.34 mL/kg; PaO₂ +10 (healthy −8); ISF +1.30 L; MAP gain kept 109 % at 60 min | **task A4** (7e `adapters.ts` `writeBlood` writes σ; 7c `fluids.ts` `leakSigma`) |
| F5 | Citrate not an anion in the SID; clearance ∝ (CO/CO₀)²; stored-product acid | BF-05a (TS), 05d (TW) | class IV + 4 L ongoing loss + 10 RBC + 10 FFP in 40 min: iCa nadir **0.30** (the solver's floor) at 1940 s, citrate 10.7 mmol/L; BE nadir −5.6 at lactate **21**, MAP 7, **ARREST at 2430 s** (the iCa floor takes contractility to (0.3/1.1)^1.5 = 0.14) | **task A3** (7c `solutes.ts` `sidOf` net of the Ca complex; `core.ts` citrate clearance; R1: electroneutral products from sourced CPD/ACD-A/SAGM compositions, stored lactate) |
| F6 | Renal K⁺ excretion blind to plasma K⁺ and to diuretics | BF-08d (TW) | furosemide 40 mg at K 7.5: urine +159 mL/h, K −0.002 at 3 h (the seam's K is refilled from 7c's unlimited cellular store) | **task A6** (7d `organs/pipeline.ts` `renalSeam`; 7c `core.ts` K set point on total-body K); the profile-vs-normal K reference is **Ali's** (R8, OQ5) |
| F7 | Chronic hypercapnia is built as acute; on main COPD GOLD 3 is now NORMOCAPNIC | BF-16b (TW); CM-07a (research/19 C7) | COPD 0.75 awake: PaCO₂ **39.7** (the report's 45.1 was before FU-4 F4 made `paco2Rest` a fixed 40), HCO₃ 24.35, pH 7.40 | **task B2** (Part B: `l2/gas/params.ts` `paco2Rest` from the COPD grade — tables §1.5 40/40/45/55 — and 7c's chronic HCO₃ at that PaCO₂, tables §5b.1 "+0.35 per mmHg, set by the profile"). CM routed C7 to FU-6, whose plan does not carry it; it lands after FU-6/FU-7 because `l2/gas` is theirs while in flight |
| F8 | COP from 1.6 × albumin; profile albumin hides its anion | BF-22a (TS), 22b (IN); CM-10c (TW) | albumin 20: COP 8.66, oedema threshold PAWP 6.7; AG −0.16 vs normal, BE +0.2 (profile) while dilution to the same albumin lowers AG 3.95 (BF-01a); CM-10c albumin 25: COP 11.5 | **task A5** (7c `fluids.ts` scaled Nitta COP — R2; `core.ts` calibration at normal albumin, branched on the profile fields — R50 F8) |
| F9 | Metabolic alkalosis not compensated | BF-15b (WR) | profile HCO₃ 34: PaCO₂ 38.9, pH 7.55 | **task A7** (7f `spont.ts` `paco2SetPoint`; 7c's `NORMAL` and ONE `CHRONIC_HCO3_PER_MMHG`; a 0.1 mmol/L deadband — R5/R50 F6) |
| F10 | Hypokalaemia does not potentiate rocuronium | BF-09b (MI) | T1 25 % at 35.7 min at K 2.5 and 4.2 | **task B1** (Part B, R6: `kMmolL` joins FU-7's `InteractionCtx` beside Mg/iCa and acts inside `ec50Multipliers`; FU-7 adds no K term — checked) |
| F11 | The brain ignores plasma osmolality | BF-11b (MI) | glycine 3 L: Na 119.5, osm 290 → 275; ΔICP max +0.07 | **task A8** (7d `brain/model.ts` + the organ view's `osm`) |
| F12a | Anaemia → CO; COHb kinetics (audit 09 R11) | BF-18a (WR), 18b (TW), 19 (WR), 32b (MI) | Hb 6.7 awake: HR −2, CO +2.3 %; ANH CO +6.6 %; COHb 30 → 30 % in 60 min on FiO₂ 1 | **handed: FU-6 Task 14** (viscosity → SVR, reflex HR/CO; `cohbWashout`) |
| F12b | K⁺ 8.5 → arrhythmia/arrest (FU-4 G3) | BF-07c (WR), BF-M2 | profile and acute K 8.5 (QRS 260/248): sinus for 15 min, no VF/asystole/block (seed 7) | **Ali** (FU-4 merged; its K hazard fired at 9.5 in 65 s and at burns + sux; whether 8.5 should arrest within 15 min is a calibration question — R-2) |
| F13a | HFrEF + 1.5 L: SpO₂ 96 → 94 (tables 89–92) — lung water → shunt coupling weak | BF-21c (TW) | extra EVLWI +5.6 mL/kg, PAWP 14 → 29, SpO₂ min 94 (MR 90) | **handed: 7b owner** (`l2/lung`, in flight under FU-6/7k; FU-9 never touches `l2/lung`) — for the orchestrator to route |
| F13b | No protein binding: hypoalbuminaemia leaves propofol unchanged | BF-22c (MI) | propofol Ce 3.18 vs 3.18 | **Ali** (7g PK scope; v1.0 vs v1.1) |
| F13c | No alkali-loss (vomiting/NG) event | BF-15a (NE) | the state exists only as a profile HCO₃ | **Ali/orchestrator** (the report routed it to FU-7; FU-7's plan does not carry it — see Open question 6: a one-field extension of 7c's `metabolic` event, if wanted) |
| F13d | Methylene blue absent; MetHb static | BF-23 (NE) | SpO₂ 84 at MetHb 30 % | **Ali** (FU-7 library scope; v1.1) |
| — | Coagulation, TEG/ROTEM, heparin/protamine, TXA PD, DIC, temperature-corrected gases | BF-05e, 24, 25a–e, 26a–d, 27a–c, 28a–b, 31 (NE) | INR 1.00 after ≈ 1.5 BV dilution (7d liver INR only) | **7i v1.1** (R58/R60) |

### RH amendment (research/13 §3 H1–H12; research/21 SP-08) — measured with the RH runner on `2473f0b` → the prototype

The RH runner (research/13-audit-scripts, 62 cells) on `2473f0b`: {PL 23, WR 12, TW 11, NE 8, TS 7, MI 1}; on the
prototype (Parts A + B): {PL 33, TW 11, NE 8, TS 6, WR 4}. Rows are the gaps; the cells that moved against the grain are
in "Prototype results".

| ID | Gap | Cells: `2473f0b` → prototype | Measured `2473f0b` → prototype | Decision |
|---|---|---|---|---|
| H1 | GA's normal CO fall read as hypovolaemia: a healthy anaesthetised kidney is oliguric | RH-01a TS → PL, 01b WR → PL, 01c TS → PL, 03a MI → TW, 17a WR → PL, 26b TS → PL | GA urine 0.35 → **0.57** mL/kg/h (vNh 0.58 → 1.00, angiotensin 0.37 → 0); OLIGURIA flag in a healthy GA patient: on → off; class III + RL 2 L: a 10-min bin ≥ 0.5 never → at +10 min, 30–60 min mean 0.23 → 0.38 (vNh at +60 min 0.46 → 0.82) | **task A1** (`eabv` referenced to demand; symmetric low-pass τ 60 s), calibrated jointly with F1 (D1); the 30–60 min mean stays `it.fails` (Open question 11) |
| H2 | No filtration equilibrium | RH-01c (FF GA 0.48 → 0.26), 02b ff3 0.80 → 0.53 (TS), 26b | FF awake 0.26 → 0.25, GA 0.48 → 0.26; low flow (MAP 70, CO 4) GFR 125 → 79 | **task A9** (mean glomerular oncotic pressure from the filtration fraction, Deen 1972); `EABV_EXP` re-fitted to its own target, check 20 (D14); **E-FU9-4** |
| H3 | Hepatic flow = (CO/CO₀)² only; 7d's factor is dead code with 7c | RH-16 WR → PL, 06d WR → PL, 02c PL | sevoflurane 1 MAC HBF +5.6 → **−15.3 %**; IAP 20 HBF 0 → −26 %; class III HBF/CO 0.60 → 0.68 | **task A12** (7c multiplies CO/CO₀ by 7d's `hbfFactor`, which gains the outflow pressure). A3's citrate clearance reads whole-body flow CO/CO₀, not `hbfRel` (D3), so H3 does not move it; lactate's hepatic uptake does |
| H4 | Natriuresis reads MAP, not RPP | RH-06a WR → TS | IAP 15: urine 0 → **−14 %**; IAP 25 0.35 → 0.41 mL/kg/h (band < 0.1: the circulation half, H5) | **task A9** (`natriuresis(MAP − max(CVP, IAP) + 5)`) |
| H5 | IAP reaches only the kidney | RH-06b/c; SP-08a/b (MI), 08c (MI), 08e (WR → WR) | IAP 14 under GA: CO −2.9 %, SVR −0.1 %, Crs 55 → 55; urine 0 → −12.5 % (engine test) / −9.8 % (SP runner) | the kidney's half is A9 (H4); **SP-08a/b/e are A9's acceptance arms**, `it.fails` with their numbers; the circulation/lung half is **handed** (R-FU9-8: posture/surgical-events stage — 7a, 7b) |
| H6 | `aki` nearly inert | RH-10a TW → PL, 09b WR → TW, 11 PL | aki 0.5 GFR 125 → 75, RBF 973 → 917; aki 1 GFR 51 → 22, RBF 1024 → 865; CKD-proxy rocuronium ×1.14 → ×1.40 | **task A10** (nephron loss: TGF defends the surviving share; afferent tone) |
| H7 | No hypertensive shift of renal autoregulation | RH-04a/b (MI) | — | **handed** (not in this amendment's ruling: 7d follow-up, R-FU9-9) |
| H8 | Mannitol not a plasma osmole | RH-08a WR → PL, 08b PL, 08c WR → WR | 1 g/kg: BV peak −2 → **+114** mL; Na at 15 min +0.1 → **−7.6**; osmolality +0.2 → +8.7 (band +20–30) | **task A13** (7c's pool, 7d clears it). The brain keeps its dose-driven osmotherapy term (D8); the osmolality band stays `it.fails` (Open question 12) |
| H9 | Gamma-curve drugs ignore organ function | RH-12d (MI) | — | **handed** (research/13 routes it to FU-7 Task 2) |
| H10 | No cold diuresis | RH-20c WR → PL | 33 °C urine −26.5 % → **+29 %** | **task A11** (× (1 + 0.2·(35 − T)⁺), [ENG], Open question 13) |
| H11 | Two lactate clearances | RH-12a | — | **recorded** (not in the ruling; small, 7c + 7d) |
| H12 | Autoregulation ceiling weak | RH-27a TS → PL | RBF +17.6 → +14.9 % (a side effect of H2) | **Ali** (calibration, R44) |
| — | CKD and cirrhosis profiles | RH-10, 14 (proxies) | — | **handed** (research/13 §5: profile work, not FU-9's) |
| I-51 | ONE body size (FU-8) | 7c BV 4 807 vs circulation 4 900 mL at 70 kg / 175 cm | — | **Part C** (R3, after FU-8 A13) |

### Cells FU-4 moved between the report's run (`776ebb5`) and main (`76c952e`) — recorded, not FU-9's

| ID | Cell | Report → main | Note |
|---|---|---|---|
| R-1 | BF-05d / BF-13a class IV rigs | no arrest → **asystole** at 2430 s (BF-05d), 2200/2420 s (BF-13a arms) | FU-4's low-flow arrest now ends the class IV + ongoing-loss rigs; for BF-05d the proximate cause is F5's iCa floor (0.30 → contractility × 0.14): Task A3 removes the arrest (prototype below) |
| R-2 | BF-07c K 8.5 | no arrhythmia (FU-4 pending) → still none in 15 min | FU-4 G3's hazard — Ali question (Open question 7) |
| R-3 | BF-08a calcium QRS | −9 → −5 ms (acute arm, K 7.05 at the dose, QRS 98) | the acute arm's K has fallen from its 7.5 peak by the dose time, so there is little widening to reverse; the profile arm is the discriminating one — measured (`bf/probe-ca.ts`): K 7.5, QRS 124 → **93 ms within 60 s** of CaCl₂ 1 g (kEcg 7.47 → 6.71; control stays 124) — calcium works as taught; no mechanism change, the Gate quotes it |
| R-4 | BF-10a hypomagnesaemia + torsades → MgSO₄ | sinus at 470 s → **asystole at 495 s** | after 165 s of pulseless torsades, 25 s after Mg converted it; reported to the orchestrator (FU-4 arrest/ROSC path), not a blood finding |
| R-5 | BF-16a / 17a / 17c ventilation rigs | PaCO₂ 60 → 45.8 (RR 6), 23.5 → 17.0 (18 × 600) | FU-4's dead-space change moved the rigs' PaCO₂; BF-17c CBF −22 % at PaCO₂ 17 (TW) follows from the brain's PaCO₂ floor, not from blood; recorded |
| R-6 | BF-29a Pv–aCO₂ gap | 17 → 22 (TS, band 6–20) at CO 1.57 (was 2.17) | the same 2 L bleed now drops CO further under FU-4's reflexes; recorded |
| R-7 | BF-08b insulin–dextrose | K −0.93 → −1.01 at 60 min (TS, band −1.0 to −0.6) | 0.01 past the band edge; FU-4/7e epinephrine K shift; recorded |

---
## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — F1 is a multiplicative EXPANSION factor on 7d's excreted fraction, not a change to `volumeFactor`.** First
  prototype: an expansion branch inside `volumeFactor(eabv)` (V > 1 above normovolaemia). It never engaged in the
  ventilated rigs because `eabv = min(bvRel, (CO/CO₀)^0.75)` is capped by the CO term (the GA-ventilated patient sits
  at CO 5.3 against the kidney's healthy reference 5.6, so `eabv` < 1 whatever the volume): BF-04 unchanged (+0.55).
  Atrial stretch/ANP is a VOLUME signal, so the factor reads `bvRel` directly — `× (1 + 90·(bvRel − 1)⁺)`, cap 12 —
  and multiplies the same chain (`ef0 · natriuresis · S_GA · vNh · …`), so general anaesthesia (S_GA 0.6, the lower
  ventilated CO through vNh) and a bled patient (vNh ≪ 1) retain more by construction: Hahn 2010 (Anesthesiology
  113:470), Norberg 2007 (Anesthesiology 107:24), Drobin & Hahn 1999 (Anesthesiology 90:81). `V_EXP_GAIN` 90 is [ENG],
  fitted to ONE target (awake retention 20–30 % 30 min after the end: 0.22); gain 60 gave 0.34. The GA and class III
  differences are consequences, not fits. `volumeFactor`, `vNh` and their taus are untouched.
  - **R4 (R50 F3): the expansion urine is natriuretic.** ANP's urine carries the plasma Na, not the basal urine's
    `URINE_NA` 100: the seam's Na is `lH·(share·Na_plasma + (1 − share)·URINE_NA)` with share = 1 − 1/expansionFactor
    (0 at and below normovolaemia, so the resting seam is bit-identical). BF-12 (7.5 % saline) +7.08 → +6.95 (band 4–7,
    PL): excreting the load no longer concentrates the plasma. No exception.
  - **H1 in the same task, and the joint calibration (RH amendment).** The kidney's effective volume read the CO against
    a FIXED reference, so GA's normal ≈ 15 % CO fall looked like a 15 % haemorrhage (vNh 0.58, angiotensin 0.37: 0.35
    mL/kg/h at MAP 93). `eabv = min(bvRel, (CO/(CO₀·demandRel))^EABV_EXP)`, with Stage 3's O₂-demand factor (GA 0.85,
    temperature, fever — the same `metabolic(rs, t, 'o2')` 7c reads), and the effective volume is low-passed
    symmetrically (τ 60 s) before the fast-on/slow-off neurohumoral lag, so the ventilated CO's breath-to-breath swing is
    not rectified downwards (research/13 H1's two items, both). S_GA 0.6 stays the only GA term. **Joint calibration:**
    `V_EXP_GAIN` is fitted AWAKE (demandRel 1: H1 does not touch the fit) — awake retention 0.22 unchanged; H1 lifts the
    normovolaemic GA urine 0.35 → 0.57 (tables "0.5–1"), which ALSO lowers GA retention (0.36 → 0.34) while class III
    keeps its retention (0.51 → 0.54: the bled kidney reads bvRel, not CO), so both of F1's acceptance differences hold
    (GA − awake +0.12, class III − GA +0.20; engine test). The 1 u RBC Hb at 1 h reaches +0.75 (band 0.7–1.3: the
    first draft's `it.fails` flips to `it`). After class III + 2 L RL the urine recovers — a 10-min bin of 1.17 mL/kg/h
    in the first 10 min after the infusion — but the 30–60 min mean is 0.37–0.38 against ATLS's 0.5: the GA ceiling is
    S_GA × V(bvRel 0.97) ≈ 0.57 × 0.9 = 0.51, and vNh washes out with 7d's τ 45 min, which is check 20's own fit
    (measured: τ 20 min → 0.45 and τ 10 min → 0.46, and both break check 20's dobutamine ≤ 0.3 at 60 min). Kept as
    `it.fails` (Open question 11); not tuned (R44).
- **D2 — F3: the regional term stays the LACTATE source; VO₂ = demand − the global (DO₂crit) deficit only.** The
  report's wording ("regional VO₂ = min(demand, ER_MAX × regional DO₂)") needs a regional flow share the model does not
  have: the existing ramp reaches ZERO regional flow at q 0.55 (it was tuned as a lactate device, tables §7 17a), so
  that form still removes VO₂ at CO 2. The smallest mechanism that meets the brief ("raise extraction before cutting
  VO₂; supply dependence only below critical DO₂" — Cain 1977 J Appl Physiol 42:228 and Shibutani 1983 Crit Care Med
  11:640 for the MECHANISM; the published DO₂crit ranges from ≈ 4 mL/kg/min (Ronco 1993 JAMA 270:1724, dying patients)
  to ≈ 8–9 (Shibutani's 330 mL/min/m²), and the model's constant stays main's 6 mL/kg/min, 420 mL/min at 70 kg (R44;
  R50 F12)) is to stop subtracting the regional term from VO₂: heterogeneous splanchnic dysoxia makes lactate while the
  other beds extract more. `deficit` keeps its meaning for lactate (17a unchanged: class III 3–5 at 30 min passes);
  no ER_MAX cap (it would bind only above 4.2 mL/kg/min demand and would need a lactate term of its own). 7c's SvO₂ is
  read only by `labs.ts` (VBG) and the truth panel — no circulation or gas code reads it (grep), so F3 cannot move FU-4.
- **D3 — F5 (R1): citrate counts (3 − 2·K_CIT) mEq/mmol in the SID — net of the Ca it complexes — and the blood
  products are ELECTRONEUTRAL rows built from sourced ingredients; citrate/acetate clearance follows CO/CO₀.**
  Stewart/Fencl (citrate³⁻ is a strong anion at plasma pH); Driscoll 1987 (acidosis early, alkalosis after
  metabolism); Kramer 2003 (Crit Care Med 31:2450: citrate is cleared by liver, muscle and kidney — whole-body flow).
  - **The double count (R50 F1).** `ionisedCa` already removes K_CIT·citrate from the iCa term; subtracting the full
    3·citrate as well counted the complexed Ca's charge twice. `sidOf` now subtracts (3 − 2·K_CIT)·citrate.
  - **The products.** Stage 7c's rows were not electroneutral (RBC Na 150 / Cl 150 with 55.7 mmol/L citrate: an
    apparent SID of −167 mEq/L), which was where the first draft's BE −10.9 came from. Each row is now its ingredients:
    CPD (per litre trisodium citrate 89.4, citric acid 15.6, NaH₂PO₄ 16.1 mmol — D'Amici 2012 Blood Transfus 10 Suppl
    2:s46, Table I), 63 mL per 450 mL of whole blood (AABB); ACD-A (trisodium citrate 74.8, citric acid 38.0 mmol/L —
    AABB) at 1:10 for apheresis plasma/platelets (device labels 1:9–1:12); SAGM (NaCl 150 mmol/L, D'Amici Table I) with
    ≈ 12 mL residual CPD-plasma per red-cell unit (Council of Europe Guide: 10–20 mL). The citric acid titrates the
    plasma bicarbonate, so each row's SID is what is left: FFP Na 167.3 / Cl 84.3 / citrate 19.9 mmol/L (SID 26.8,
    5.0 mmol per unit); platelets 148.4 / 93.6 / 11.3 (SID 24.8, 2.8 mmol per unit); SAGM red cells day 14 Na 138.2,
    K 14, lactate 19.6, Cl 126.2, citrate 2.1 (SID 0, 0.24 mmol per unit). Storage (`storedComp`): K leaks out for Na
    (the cold-inhibited pump), lactic acid accumulates 1.4 mmol/L per day (Sümpelmann 2001 Paediatr Anaesth 11:169: 9.4
    at 6.7 days), buffered by the unit's bicarbonate first (the SID falls by the lactate) and then by the chloride shift.
  - **R1's consequence, measured.** Without the artefact, massive transfusion no longer produces the report's acidosis
    from the PRODUCTS: 10 FFP alkalinise as their citrate is metabolised (unit rig: BE +4.3 at 40 min, citrate 0.39,
    iCa 1.06), and the class IV + MTP rig's BE nadir is −0.1 (band ≤ −10) and iCa 0.955 (band 0.6–0.95) → both
    `it.fails` with those numbers; the arrest stays removed and lactate ≥ 4 holds (Open question 2: whether the teaching
    case's acidosis should come from the shock's lactate — the tables' 4–12 — rather than from the units). BF-05a/05d
    in "Prototype results".
  - **E-FU9-1 (R9), both numbers:** 7c's unit test "iCa −0.1 per unit-per-5-min" was fitted to a row that put 15.6
    mmol of citrate in every RBC unit; a SAGM unit carries 0.24 mmol, so 10 RBC units no longer chelate what the rule
    assumed: main **1.076** (margin 0.007), FU-9 **1.137** vs 1.033 ± 0.05 → `it.fails`; the chelation term itself is
    pinned by a new test at fixed pH and massive-transfusion hypocalcaemia is carried by FFP/platelets.
- **D4 — F4: σ follows the leak, `σ = 1 − (1 − σ₀)·kfMult` (floor 0.3), written by 7e with kfMult.** Two-pore theory
  gives the DIRECTION: inflammation opens large pores that carry both the extra hydraulic conductance and the protein
  flux (Rippe & Haraldsson 1994 Physiol Rev 74:163). That (1 − σ) scales LINEARLY with the whole Kf is an assumption
  — `[ENG]` beside `SIGMA_LEAK_FLOOR` (R50 F12). No per-grade σ table is invented (the report's "0.5–0.7 by grade" is
  unsourced); kfMult 2.6 → 0.74, 3 → 0.70. It applies to every kfMult writer: 7e's sepsis AND its anaphylaxis and burns
  terms. 7c already passes σ/σ₀ to `lungWaterStep` and σ to `starling()`; the writer is 7e's `writeBlood`, the only
  kfMult writer (R51 addendum 16).
- **D5 — F8 (R2): plasma COP by the SCALED Nitta form — albumin and globulins each by their own polynomial — with the
  globulins their own mass (24 g/L); the profile calibration uses the NORMAL albumin when the profile gives an albumin
  but no HCO₃.** Nitta S et al. (Tohoku J Exp Med 1981;135:43): albumin 2.8C + 0.18C² + 0.012C³, globulin 0.9C +
  0.12C² + 0.004C³ (C in g/dL), scaled by `COP_SCALE` 1.259 so the tables' normal plasma (albumin 40, globulins 24:
  Landis–Pappenheimer at TP 6.4 = 22.35 mmHg) is exactly unchanged — every normal-albumin COP and lung-water threshold
  is bit-identical. Albumin then carries ≈ 80 % of the COP (the report's "75–80 %"): albumin 30 → 16.7, 25 → 14.1, 20 →
  **11.7** (Weil 1979: 12–16), and 5 % albumin (50 g/L, no globulins) is iso-oncotic, 25.2 mmHg (the product
  monograph) — the first draft's Landis-on-TP form made it hypo-oncotic (15.6; R50 F2) and moved BF-03a/18/19.
  Synthetic colloid counts as albumin-equivalent grams (7c's convention). Globulins dilute with plasma, leave with
  bleeding and come in with plasma products (`globGL` = the plasma share × 24 on FFP/platelets/whole blood). The
  calibration branch is on the PROFILE FIELDS (`b.hco3 === undefined && b.albuminGL !== undefined`), not on a float
  comparison (R50 F8: 1 095 of 25 200 default profiles computed 39.99999999999999 ≠ 40), so every default patient is
  bit-identical; the Figge picture (Figge 1998 Crit Care Med 26:1807) for a profile hypoalbuminaemia, a given profile
  HCO₃ honoured.
- **D6 — F6: renal K⁺ excretion = basal × (K/K_set) × √(UOP/UOP₀) in the seam (below the basal excretion the kidney
  RETAINS the intake's K); 7c's K set point follows the total-body K at 300 mmol per mmol/L.** Distal secretion rises
  with plasma K (Young 1988 Am J Physiol 255:F811) and sublinearly with distal flow (Good & Wright 1979 Am J Physiol
  236:F192); the loop diuretic acts through the flow (no furosemide-K constant). The reference is the PROFILE's K (a
  chronic state is in balance). An oliguric kidney keeps the intake's K with its chloride (`cl = 0.9·(na + k)` with
  k < 0: KCl retained) — the AKI hyperkalaemia; a first prototype clamped this at 0 and the untreated control then lost
  nothing, so furosemide's difference vanished under GA (+0.011). Without the set-point half the whole change is
  invisible: 7c's cells refilled the ECF to `set.k` from an unlimited store (the furosemide cell read −0.002). `kSet`
  now falls 1 mmol/L per `K_TBK_MMOL` 300 mmol of total-body deficit (Sterns 1981 Medicine 60:339: 200–400 mmol per
  mmol/L [TXT, midpoint]); a first prototype used the ECF/ICF ratio (≈ 930 mmol per mmol/L, −0.036). Transcellular drug
  shifts leave the total unchanged, so insulin, salbutamol, succinylcholine and pH shifts are bit-identical in shape.
  Considered and dropped: a loop-diuretic chloride term (urine SID → 0) — it did not change the sign under GA and 7d's
  urine composition is Ali's (Open question 10).
  - **What the reference does for a profile K (R50 F7, R8).** `kRel = K ÷ set.k`, and `set.k` is the PROFILE K: a
    profile K 7.5 starts at kRel 1, so its kidney excretes as at 4.2 and BF-08d's −0.030 comes from √flow and the
    finite pool alone. That is right for a chronic state in balance (CKD) and wrong for acute hyperkalaemia with
    working kidneys (maximal kaliuresis). The choice is Ali's (Open question 5, with numbers).
  - **The asymmetric intake.** An oliguric seam retains the intake as K and Cl (`cl = 0.9·(na + k)` with k < 0) but not
    as Na: harmless (the SID moves by +0.1·|k|) and declared.
- **D7 — F9: `paco2Set = paco2Rest + 0.7·(HCO₃met − ref)` above ref, cap 55; ref = 7c's `NORMAL.hco3` + 7c's
  `CHRONIC_HCO3_PER_MMHG`·(paco2Rest − `NORMAL.paco2`)⁺ + a 0.1 mmol/L deadband; HCO₃met = HCO₃ − 0.1·(PaCO₂ −
  paco2Rest)⁺.** Javaheri & Kazemi 1987 (Am Rev Respir Dis 136:1011) / the Boston rules; Brackett 1965 for the acute
  buffer. The metabolic correction exists because a first prototype read the ACUTE HCO₃ rise of a hypercapnia as
  alkalosis (positive feedback, gain 0.07/mmHg). **R5/R50 F6:** at t = 0 7c's HCO₃ is 24.40045, above the bare
  reference, so the first draft lifted the set point to 40.000315 mmHg for the first second — the path by which it moved
  the chaotic ventilated audit rows. The deadband (0.1 mmol/L, [ENG]) makes a resting patient exactly unchanged and the
  audit rows are no longer FU-9's (D13). ONE constant: `CHRONIC_HCO3_PER_MMHG` lives in 7c's `params.ts` beside
  `NORMAL`, and 7f reads it (and `NORMAL`) there — B2's profile calibration reads the same constant, so the calibration
  pass (R44) cannot make a compensated retainer look alkalotic by changing one copy. The call site passes `x.paco2` —
  ONE line that FU-6's Task 13 also edits (it adds `setShift`): whichever lands second re-anchors by content; the merged
  line is given in Task A7.
- **D8 — F11: brain water gains 0.145 mL per mOsm/kg FALL of 7c's effective osmolality, τ = HTS_TAU_IN_MIN.** The gain
  is the osmotherapy calibration's own (OSM_VMAX_ML × the 1 g/kg mannitol saturation ÷ its ECF osmolality rise) — the
  same brain, the same water per mOsm. Only the FALL is read: a rise from mannitol or hypertonic saline stays the
  dose-driven osmotherapy term. **H8 (Task A13) made mannitol 7c's plasma osmole**, so research/13's "the brain then needs
  no private term" was measured and REJECTED for now: 7c's plasma osmolality after 1 g/kg is +8.7 mOsm/kg at 15 min
  (the water it draws from the cells dilutes it), a third of the +27 the osmotherapy calibration assumes, so reading both
  directions from 7c would halve the mannitol ICP effect (`organs-tbi-treatment`: mannitol −25 %, HTS −20–40 %). The
  two stay one-directional each until Ali decides the distribution (Open question 12). The kidney, in contrast, reads
  7c's pool (ONE mannitol state for the osmoles and the diuresis).
- **D9 — F7 (Part B): the COPD grade sets `gasPatient().paco2Rest` (tables §1.5: 40/40/45/55) and 7c builds the chronic
  compensation on it (tables §5b.1 "+0.35–0.4 per mmHg … set by the profile").** The tables already decided the
  mechanism; FU-4 F4 R1(a) made `paco2Rest` "the patient's OWN resting arterial CO2", and this is its first non-40 use.
  `createBloodState` passes that PaCO₂ to `createBloodCore`, which calibrates at it. Part B because `l2/gas/**` is
  FU-6/7k's while they are in flight (FU-6 adds pregnancy constants to the same file).
- **D10 — F10 (Part B, R6): `hypokalaemiaMult(K) = max(0.7, 1 − 0.15·(3.5 − K)⁺)` on the non-depolarisers' EC50,
  inside `ec50Multipliers`, from 7c's plasma K on FU-7's `InteractionCtx`.** Direction: Miller 10e ch. 27; size [ENG]
  (Open question 9: K 2.5 → EC50 × 0.85 → rocuronium T1 25 % 35.8 → 46.8 min on the steep Hill). R50 F9: the first
  draft multiplied it onto the `neo` line — a second electrolyte path, in a variable named for neostigmine. K now joins
  Mg and iCa as the third 7c electrolyte on FU-7's one path (`InteractionCtx.kMmolL`, applied to `nd` — rocuronium,
  vecuronium, cisatracurium), and the call-line block is FU-7 Task 14's MERGED line (Part B runs after FU-7).
- **D11 — F2 is closed by FU-4 G3.** `bloodEcgTargets` returns `kEcg − NORMAL.k` (absolute, `blood/pipeline.ts:211`) and
  `pushBloodEcg` starts from `ecg.k = 0`, so the first push carries the profile K: measured ECG K 6.5/7.5/8.5/2.5 for
  the four profiles, 6.34 after CaCl₂ at K 7.5. No FU-9 task.
- **D12 — DV-25b (orchestrator input, research/20 V11): no FU-9 task; measured.** Profile K 9.5 in VF, CaCl₂ 1 g +
  insulin 10 U/dextrose + NaHCO₃ 50 mmol at 100 s (`bf/probe-k.ts`): membrane-effective K (kEcg) 9.49 → 8.60 at +30 s,
  8.06 at +60 s, 7.68 at +100 s; contractility `kChem` 0.70 → 0.99 at +60 s → 1.00 at +100 s — it ALREADY reads the
  calcium-stabilised `kEcg` (`blood/pipeline.ts:178`, FU-4 G3), so V11's second claim does not reproduce on main.
  Plasma K 9.49 → 9.40 at +100 s, 9.21 at +10 min: insulin's textbook onset is 10–20 min with −0.6 to −1.0 at 30–60 min
  (UK Renal Association 2023; Allon & Copkney 1990), which BF-08b meets (−0.75 at 30, −1.01 at 60 min) and salbutamol
  BF-08c (−0.74 at 30 min); bicarbonate barely moves a non-acidotic K (BF-08d −0.21, band −0.4–0). So the treatment
  time courses are textbook; what DV-25b grades — a FORCED sinus after the shock dipping into PEA at +100 s and
  regaining a pulse at +185 s — is the post-arrest circulation (FU-4's ischaemic contractility) and the shock-outcome
  table (FU-7 Task 12 adds `kEcg` to it). Handed (R7): the PEA dip goes to **FU-8 Part B** (R-FU9-1), the shock table
  to FU-7 Task 12 (R-FU9-2).
- **D13 — FU-4's arrest behaviour (R5): measured against a perturbation ensemble on current main; the rows FU-9 moves
  are named, with their cause.** `audit:physiology` (79 scenarios) on `2473f0b` and on the prototype (Parts A + B), and
  on `2473f0b` with `paco2SetPoint` offset by δ = ±1e-5, ±1e-4, ±3.1476e-4, ±1e-3 mmHg (one line of `spont.ts`, a
  throwaway tree). **Envelope on main:** D0 1770–1775 s, D2 1285–1355 s, K-ptx 665–685 s (main itself: 1775, 1350,
  670); B2/B7 830, B6 1130, I1 910 and C1's first MAP < 30 at 1000 s do NOT move under any δ (not chaotic).
  - **Inside the envelope (chaotic, noise):** D0 1775 → 1770, D2 1350 → 1305, K-ptx 670 → 675 (and the propofol
    matrix's tension-PTX row asystole t+10 → t+15 s, HR 130 → 131). With R5's deadband A7 contributes nothing at rest
    (a resting patient's set point is exactly 40), so these moves come from the other tasks' second-decimal changes.
  - **Physiology, declared (NOT chaotic — stable under the ensemble; bisected):** Ali's tamponade case B2/B7 PEA **830 →
    825 s** (first MAP < 30 810 → 805), B6 1130 → 1125, C1's first MAP < 30 1000 → 1005 (no arrest in either), I1 apnoea
    910 → 920 s (A1 alone: B2 825, I1 895). Cause: Task A1's H1 — the anaesthetised, ventilated kidney no longer reads
    GA's CO fall as hypovolaemia, so over the 13 min before the arrest it makes ≈ 0.57 instead of 0.35 mL/kg/h (≈ 10 mL
    more urine) and the tamponade patient's preload is marginally lower. It is the intended physiology (RH-01a), and
    5 s is one audit sample; FU-9 does not tune it (R44). **For the orchestrator's ruling (G-FU4):** declared as
    E-FU9-5 (below the File map).
  - **Second-decimal changes (not arrests):** the propofol matrix's pre-dose CO in the healthy/HFrEF/tamponade/
    hypovolaemia/PE/septic rows (septic 5.22 → 5.11: A4's σ, as in the first draft), the tamponade nadir time 250 → 240 s
    and its PEA at t+170 → t+165 s, MANUAL hypovolaemia's ΔCO −0.43 → −0.64 and nadir 260 → 230 s; minimum HRs by 1–4
    bpm (C4/G3 49 → 53, F2 61 → 59). Every other arrest row is identical (C4 645, G2b 65, G3 645, G3b 525, F4 2785, E1/E2
    665). The FU-4 engine files (`clinical-suite`, `circ-lowflow-arrest`, `circ-hypoxic-arrest`, `blood-k-rhythm`,
    `fidelity-lowflow`) are run at the Gate.
- **D14 — H2 + H4 (Task A9): filtration equilibrium, and pressure natriuresis on the renal perfusion pressure.** The
  glomerular oncotic pressure rises along the capillary as protein-free fluid leaves it; its mean is
  π̄ = π_a·(1 + 1/(1 − FF))/2 (Deen, Robertson & Brenner 1972 Am J Physiol 223:1178), normalised so that at the healthy
  reference's FF (125 ÷ (952 × 0.55)) it equals Pulse's `PI_GLOM0` 32 — the resting GFR 125 is unchanged. GFR is the root
  of G = Kf·(P_gc − P_B − π̄(G/RPF)) (bisection: monotone), and `tgfTarget` takes a 4-step fixed point from the resting
  FF. The haematocrit that turns RBF into RPF is 7c's (3·Hb/100). Natriuresis reads MAP − max(CVP, IAP) + 5, identical
  at the reference CVP 5 (the awake UOP–MAP curve test holds) — research/13 H4 verbatim. **`EABV_EXP` re-fitted,
  0.75 → 0.35, to its own target** (tables §7 check 20 — HFrEF 0.1–0.15, dobutamine 0.2–0.3 within 30–60 min): H2 lowers
  the low-flow GFR and H4 counts check 20's CVP 12, which together took the HFrEF urine to 0.044; at 0.35 it reads
  0.112 / 0.259 / 0.288 (the same test, unchanged). **E-FU9-4:** 7d's unit test "a patient who starts in shock is
  oliguric at t = 0" pinned GFR `toBe(0)`: with equilibrium the pressure that stops filtration is the AFFERENT oncotic
  pressure (27.7, the mean 32 only at the resting FF), so the shocked kidney filters 18 mL/min and makes 0.03 mL/kg/h.
  The property (oliguric, calibrated on the healthy reference, finite) is asserted — GFR < 0.2·gfrSet, urine < 0.05 —
  not the zero; declared as an exception.
- **D15 — H6 (Task A10): `aki` severity is nephron loss.** TGF defends only the surviving nephrons' share,
  `gfrSet·(1 − AKI_KF_LOSS·aki)`, and intrinsic AKI's afferent vasoconstriction floors R_aff at R_AFF_MIN·(1 +
  AKI_AFF_TONE·aki), so RBF falls instead of rising. `AKI_AFF_TONE` 1 [ENG]: tone 3 gave GFR 0 at aki 1; at 1, aki 0.5 →
  GFR 75, aki 1 → 22 (KDIGO G4–5 by name, research/13's ≈ 25 — Ali's Q, Open question 14).
- **D16 — H10 (Task A11): cold diuresis × (1 + 0.2·(35 − T)⁺) on the excreted fraction** (Polderman 2009 Crit Care Med
  37:S186, direction; the size [ENG], Open question 13): 33 °C → × 1.4; RH-20c −26.5 % → +29 %.
- **D17 — H3 (Task A12): ONE hepatic flow.** With 7d present 7c's `hbfRel = CO/CO₀ × hbfFactor`, the factor 7d already
  computed (volatile ×0.8/MAC, α-agonist and volume-loss splanchnic constriction) extended by the OUTFLOW pressure
  max(CVP, IAP) above 5 mmHg, −2 %/mmHg [ENG] (research/13: PEEP 15 HBF −10–35 %, IAP 20 −30–40 %, Diebel 1992). 7d
  writes it into `blood.core.hbfFactor` (R51 addendum 14: 7c keeps the flow); without 7d the (CO/CO₀)² fallback. It also
  stops squaring CO's per-breath swing. A3's citrate/acetate clearance reads CO/CO₀ (D3), not `hbfRel`, so it is not
  moved; lactate's hepatic uptake and 7g's flow-limited clearances (via `hbfRel`) are.
- **D18 — H8 (Task A13): mannitol is an effective ECF osmole in 7c's solutes (`so.mannitol`, mmol = mOsm, 5.49 per g —
  7d's existing `MANNITOL_MOSM_PER_G`), cleared by 7d's kidney through the seam.** 7c adds the dose from 7g's drug log
  (as it does magnesium); 7d reads the pool (`OrganView.mannitolMmol`) for its osmotic diuresis and returns the
  excretion (`RenalSeam.excretion.mannitol`); without 7d, 7c clears it with 7d's own t½ (`MANNITOL_KE_PER_MIN`); without
  7c, 7d's private depot as before. 1 g/kg: plasma volume +114 mL at the peak, Na −7.6 (translocational), osmolality
  +8.7 at 15 min (band +20–30: `it.fails`, Open question 12). The brain's dose term stays (D8).
- **D19 — CI amendment 5 (R10, Task A0b).** Memoising the repeated arms (R50 F10) is in every engine file (`once()`). The
  measured per-file times of `PME_TEST_SET=slow` on `2473f0b` (this Mac, serial): slow-a 1 026 s, slow-b 1 591 s. FU-9's
  engine files go to a third group with two slow-b files chosen by time (pk-acceptance-pd 213 s, endo-acceptance 178 s),
  and a printed disjointness gate in ci.yml's build job (three lists; fails on an overlap or a gap). The Gate task
  measures the three groups on the MERGED tree (with FU-8's `fu8-*` files in slow-a) and moves files between slow-b and
  slow-c by name if one passes ≈ 40 min.
- **D20 — Part C (R3): 7c's blood volume is `bvKg(band, sex) × sizeWeightKg(band, w, height)`**, FU-8 A13's one
  Lemmens-indexed size weight (`l2/body-size.ts`), replacing 7c's own capped Lemmens branch. The default adult (70 kg,
  175 cm) holds 4 900 mL (was 4 807 in 7c and 4 900 in the circulation): 7c and 7a hold ONE volume for every adult
  50–160 kg with or without a height (the new test). Moved, declared: `fluids.test.ts`/`core.test.ts`/`params.test.ts`
  pins 4 807 → 4 900, plasma 2 644 → 2 695, ISF 11 356 → 11 305 (the definition moved, not the physiology). The elderly
  band's per-kg values differ (7c 65/60 mL/kg M/F vs the circulation's 62/65) — handed to FU-8/Ali (R-FU9-10).
---
## Prototype results (seed 7: main `2473f0b` → the prototype with Parts A + B; Part C on main + FU-8 A13)

Measured by the fixer on `2473f0b` and on the prototype (`wt2`). Quantities are the runners' own keys. Part B changes
only BF-09b and BF-16b by construction. The engine tests reproduce the same numbers on their own rigs (quoted in the
tasks; small differences come from the runners' sensor sets).

**BF runner (research/22, 74 cells).** Automatic verdicts — main {PL 26, TW 11, TS 10, WR 7, MI 1, NE 19}; prototype
{PL 33, TW 11, TS 5, WR 5, MI 1, NE 19}; with Part C {PL 34, TW 10, TS 5, WR 5, MI 1, NE 19}.

| F | cell | quantity: main `2473f0b` → prototype (Parts A + B) | expected [research/22] | verdict main → prototype |
|---|---|---|---|---|
| F1/H1 | BF-02a | retAwake30 0.52 → **0.22**; retGA30 0.53 → **0.34**; gaMinusAwake 0.01 → **0.12** | 0.2–0.3; GA − awake ≥ +0.05 | TS → PL |
| F1/H1 | BF-02b | retHypo30 0.53 → **0.54**; hypoMinusGA 0 → **0.20** | class III − GA ≥ +0.05 | WR → PL |
| F1/H1 | BF-04 | dHb1h 0.546 → **0.746**; dHb4h 0.547 → **0.898** | dHb1h 0.7–1.3 | TW → PL |
| F1 | BF-01a | dCl 5.445 → **4.753**; dBE −0.451 → **−0.709** | Cl 3–8; BE −4 to −1 | TW → TW |
| F1 | BF-01b | dBE 1.749 → **1.428**; dBEvsSaline 2.2 → **2.14** | BE ≈ 0 ± 1; ≥ +1 vs saline | WR → WR |
| F1 | BF-14 | dBE −3.261 → **−3.34**; dCl 11.389 → **10.218**; retained 3351 → **2607** | BE −8 to −4; Cl 6–12 | TW → TW |
| F1/R4 | BF-12 | dNa45 6.917 → **6.945** (first draft 7.08, TS) | Na +4–7 | PL → PL |
| F1/F4 | BF-20b | dMapPeak 14.46 → **15.39**; keptFrac 1.09 → **1.04** | peak 3–15; kept ≤ 0.5 | TS → TS |
| F3 | BF-29b | svo2Low 77.8 → **55.8**; svo2Normal 85.6 → 85.6 | low 30–65; normal 70–85 | TS → TS (normal arm, OQ1) |
| F4 | BF-20a | dEvlwiSepsis 0 → **0.53**; dEvlwiHealthy 3.34 → **1.12**; dPao2Sepsis 10 → **18** | sepsis > healthy; PaO₂ ↓ | WR → WR |
| F5/R1 | BF-05a | iCaNadir 0.30 → **0.955**; citratePeak 10.72 → **1.09** | iCa 0.6–0.95 | TS → TW |
| F5/R1 | BF-05d | beNadir −5.6 → **−0.145**; lactPeak 21.1 → **7.3**; arrest true → **false** | BE ≤ −10; lactate 4–12 | TS → TW |
| F5 | BF-05b | dkPeak 0.69 → **0.93** | +0.3–2.0 | PL → PL |
| F6 | BF-08d | dKFuro3h −0.002 → **−0.030**; dUopFuro 159 → **235** | < −0.1 (dirOnly) | TW → TW |
| F7 | BF-16b | paco2Copd 39.66 → **44.14**; hco3Per10 1.32 → **3.43** | +5–15; 3–4.5 | TW → PL |
| F8/R2 | BF-22a | cop 8.66 → **11.74**; oedemaThreshold 6.7 → **9.7** | COP 11–17 | TS → PL |
| F8 | BF-22b | dAg −0.16 → **−4.86** | −6.5 to −3.5 | TW → PL |
| F8/R2 | BF-03a | effEnd 0.99 → **0.96**; eff60 0.93 → **0.85** (first draft 0.75) | 0.8–1 / 0.7–1 | PL → PL |
| F9 | BF-15b | dPaco2 −0.11 → **+6.09** | +5 to +9 | WR → PL |
| F10 | BF-09b | dMin 0 → **11.2** | longer at K 2.5 | WR → PL |
| F11 | BF-11b | dIcpMax 0.07 → **0.36** | > 1 (dirOnly) | TW → TW |
| reg. | BF-21b | evlwiExtraHF 5.63 → **2.95** (Part C: 3.35) | +3–15 | PL → TW (→ PL with C) |
| reg. | BF-21a/c | PAWP peak HF 29 → 27; SpO₂ min HF 94 → 96 | 25–40; 89–92 | PL; TW |
| reg. | BF-18a/b, 19 | dBv 233 → 55; CO +2.3 → **+4.1** %; BF-19 CO +6.6 → **−1.0** % | R11 (FU-6) | WR; TW; TS → WR |
| reg. | BF-13a/b/c | class IV rigs: asystole 2420/2200 s → 2435/2240 s (the units no longer arrest; the rigs still do) | — | PL |

Notes on the cells that move without being a target:
- **BF-21b** (HFrEF + 1.5 L): the awake HFrEF patient now excretes part of the load (F1 + H4 at its CVP) — extra EVLWI
  2.95 against the band's 3; Part C's larger blood volume puts it at 3.35. Not tuned (R44).
- **BF-18a/b, 19** (audit 09 R11, FU-6 Task 14's): the isovolaemic exchange with 5 % albumin now keeps volume (5 %
  albumin iso-oncotic, R2) but less than on main (+55 vs +233 mL, the kidney excretes part of it); FU-6's R11 test uses a
  profile Hb, not an exchange. Recorded for FU-6.
- **BF-05a/05d:** R1 (D3) — the report's acidosis and iCa came from unbalanced product rows; Open question 2.
- **BF-01a/b, 14:** saline chemistry, Open question 10.

**RH runner (research/13, 62 cells).** main {PL 23, WR 12, TW 11, NE 8, TS 7, MI 1} → prototype {PL 33, TW 11, NE 8, TS 6,
WR 4}. Moved to PL: RH-01a/b/c, 06d, 08a, 10a, 16, 17a, 20c, 23c, 25b, 26b, 27a (the inventory's RH table). Moved against
the grain (declared, not tuned — R44):
- **RH-02a** PL → TS: awake class II/III urine 30 → 32.5 and 14.6 → 17.8 mL/h (bands 20–30, 5–15) — `EABV_EXP` 0.35
  (D14) reads the bled patient's CO less steeply; the bled kidney still reads bvRel.
- **RH-03a** MI → TW: recovery bin at +10 min (PL) but the 30–60 min mean 0.38 (Open question 11).
- **RH-13** PL → TS: RL 2 L in hepatic failure, lactate +0.92 → +1.05 (band 0.5–1) — H3's factor (sympathetic,
  outflow) lowers hepatic flow under GA vent.
- **RH-20a** PL → TW: fentanyl clearance −8.7 → −6.7 %/°C (band −7 to −10) — with H3 the cold patient's hepatic flow
  is CO × factor instead of CO², so less of the clearance fall comes from flow.
- **RH-06a** WR → TS: IAP 15 −14 % (TW by 1 %), IAP 25 0.41 (band < 0.1: the circulation half, R-FU9-8).
- **RH-09b** WR → TW: AKI vs health K excess at 3 h 0 → +0.012 (7c returns K to its set point; recorded).

**SP-08 (research/21, IAP 14 under GA):** urine 0 → **−9.8 %** (SP-08e, band ≤ −30: TW), CO 0 → −2.9 %, SVR −0.1 %,
Crs 55 → 55, HBF −0.13; SP-08a/b/c stay 7a/7b's (R-FU9-8).

**Part C (on main + FU-8 A13, BF all cells vs Part A + B):** moved rows — BF-21b 2.95 → 3.35 (TW → PL), BF-04 dHb1h 0.746 →
0.729, BF-18b CO +4.1 → +1.9 %, BF-19 −1.0 → −3.8 %, BF-20a PaO₂ sepsis 18 → 21, BF-15b +6.09 → +6.32, second-decimal
changes elsewhere (the 4 807 → 4 900 mL blood volume); no verdict moves except BF-21b.

---

## File map

| File | Owner | Task | What changes |
|---|---|---|---|
| `packages/engine-core/vite.config.ts`, `.github/workflows/ci.yml` | CI | A0b | CI amendment 5: `fu9-*` in SLOW, `SLOW_C`, slow-b minus slow-c, the `slow-c` set; the matrix and the disjointness step |
| `packages/engine-core/src/l2/renal/params.ts` | 7d | A1, A9, A10, A11 | `V_EXP_*`, `EABV_TAU_S`; `HCT_REF`, `FF_REF`, `EABV_EXP` 0.35; `AKI_AFF_TONE`; `COLD_*` |
| `packages/engine-core/src/l2/renal/model.ts` | 7d | A1, A9, A10, A11, A13 | `expansionFactor`, `eabv` on demand + low-pass; hct/RPP in the haemodynamics and `fe`; `nephronTone`; `coldDiuresis`; `mannitolExcretionGMin` |
| `packages/engine-core/src/l2/renal/kidney.ts` | 7d | A9 | `filtration`, `meanOncotic`, `renalHaemo`/`tgfTarget` with hct |
| `packages/engine-core/src/l2/liver/liver.ts` | 7d | A12 | `HEPATIC_OUTFLOW_PER_MMHG`, `LiverInputs.outflowMmHg`, `hbfFactor` |
| `packages/engine-core/src/l2/organs/{inputs,pipeline}.ts` | 7d | A1, A6, A8, A9, A11, A12, A13 | `demandRel`, `osm`, `mannitolMmol` on the view; `renalIn`; the seam's natriuretic share, K and mannitol; `hbfFactor` write; `observeDoses` |
| `packages/engine-core/src/l2/brain/{params,model}.ts` | 7d | A8 | `OSM_WATER_ML_PER_MOSM`; `osm0`/`osmWater` |
| `packages/engine-core/src/l2/blood/oxygen.ts` | 7c | A2 | VO₂ = demand − global deficit |
| `packages/engine-core/src/l2/blood/solutes.ts` | 7c | A3, A6, A13 | `sidOf` net of the Ca complex; `set.kIcf`, `K_TBK_MMOL`; `mannitol` |
| `packages/engine-core/src/l2/blood/core.ts` | 7c | A3, A5, A6, A12, A13, B2 | citrate/acetate clearance on CO/CO₀; calibration on the profile fields; total-body `kSet`; `hbfRel` × 7d's factor; the seam's mannitol; the chronic HCO₃ |
| `packages/engine-core/src/l2/blood/fluids.ts` | 7c | A4, A5 | `leakSigma`; globulins, scaled Nitta `copPlasma` |
| `packages/engine-core/src/l2/blood/params.ts` | 7c | A3, A5, A7, C1 | CPD/ACD-A/SAGM, `PRODUCTS`, `storedLactate`, `storedComp`; `globGL`, `GLOBULIN_GL`; `CHRONIC_HCO3_PER_MMHG`; Part C `bloodPatient` |
| `packages/engine-core/src/l2/blood/pipeline.ts` | 7c | A3, A13, B2 | `storedComp` for transfusions and `blood`; the mannitol dose; the resting PaCO₂ |
| `packages/engine-core/src/l2/endo/adapters.ts` | 7e | A4 | `writeBlood` writes σ with kfMult |
| `packages/engine-core/src/l2/neuro/spont.ts` | 7f | A7 | `paco2SetPoint` on 7c's `NORMAL`/`CHRONIC_HCO3_PER_MMHG` + deadband; the call line |
| `packages/engine-core/src/l2/neuro/{interactions,pipeline}.ts` | 7f | B1 | `InteractionCtx.kMmolL`, `hypokalaemiaMult` in `ec50Multipliers`; `NeuroEnv.kMmolL`; FU-7's call line |
| `packages/engine-core/src/engine.ts` | engine (**E-FU9-2**) | B1 | `kMmolL` on the neuro context's `tempC:` line |
| `packages/engine-core/src/l2/gas/params.ts` | Stage 3 profile (**E-FU9-3**) | B2 | `COPD_PACO2_REST`, `restingPaco2`, `paco2Rest:` |
| `packages/engine-core/test/l2/blood/core.test.ts` | 7c (**E-FU9-1**) | A3, C1 | the iCa rule `it.fails` (main 1.076, FU-9 1.137); Part C's 4 900 pin |
| `packages/engine-core/test/l2/renal/model.test.ts` | 7d (**E-FU9-4**) | A9 | the shock-start test asserts oliguria, not GFR 0 |
| `packages/engine-core/test/l2/blood/{fluids,params}.test.ts` | 7c | C1 | 4 807 → 4 900 mL pins (D20) |
| Tests (new, fast) | — | A1–A13, B1, B2, C1 | `test/helpers/fu9-renal.ts`; `test/l2/renal/fu9-{expansion,filtration,aki,cold}`, `test/l2/blood/fu9-{oxygen,citrate,leak,albumin,potassium,hepatic,mannitol,chronic,body-size}`, `test/l2/neuro/fu9-{alkalosis,hypokalaemia}`, `test/l2/brain/fu9-osmolality` |
| Tests (new, slow-c) | — | A1–A13, B1, B2 | `test/helpers/fu9.ts`; `test/engine/fu9-{kinetics,oxygen,transfusion,leak,potassium,alkalosis,osmolality,iap,mannitol,rocuronium,copd}.test.ts` — 528 s serial on this Mac with the arms memoised; slow-c in all 868 s (+ pk-acceptance-pd 174, endo-acceptance 166); slow-b then 1 200 s, slow-a 1 026 s (before FU-8's `fu8-*`) |
| Gate | — | G | `docs/gates/fu-9.md` |

**Exceptions (declared; E-FU9-1..3 accepted by R9):**
- **E-FU9-1** (A3): 7c's `core.test.ts` "massive transfusion … iCa −0.1 per unit-per-5-min": K ≥ 5.5 stays `it`; the
  chelation-rate rule becomes `it.fails` with both numbers — main 1.076 (margin 0.007), FU-9 1.137 vs 1.033 ± 0.05 —
  because a sourced SAGM unit carries 0.24 mmol of citrate, not 15.6 (D3). The chelation term is pinned at fixed pH.
- **E-FU9-2** (B1): one line of `engine.ts` (the neuro context's `tempC:` line gains `kMmolL`).
- **E-FU9-3** (B2): `l2/gas/params.ts`'s `paco2Rest` from the COPD grade (Part B, after FU-6).
- **E-FU9-4** (A9, new): 7d's `model.test.ts` shock-start test pinned GFR `toBe(0)`; with filtration equilibrium the
  shocked kidney filters 18 mL/min (0.03 mL/kg/h): the test asserts GFR < 0.2·gfrSet and urine < 0.05 (D14).
- **E-FU9-5** (A1, new, for the orchestrator — G-FU4): Ali's tamponade case B2/B7 PEA 830 → 825 s, I1 910 → 920 s, B6
  1130 → 1125 s — stable under the perturbation ensemble, caused by H1 (D13). No band or test moves; the FU-4 engine
  files pass.
## Part A — independent (executes now)

### Task A0: Base check — worktree, branch, the plan, the runners and the before-numbers

**Files:** none changed (the plan is committed in Step 2).

- [x] **Step 1 — the worktree (R25: never the shared checkout).** From `projects/patient-monitor-engine/repo`:

```
git fetch origin
git log --oneline -1 origin/main                     # at least 2473f0b
git worktree add -b fu-9-blood-fluids ../scratch/wt-fu-9 origin/main
cd ../scratch/wt-fu-9 && npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [x] **Step 2 — commit the plan** (it is untracked in the shared checkout): copy
  `projects/patient-monitor-engine/repo/docs/plans/fu-9-blood-fluids.md` to the worktree's `docs/plans/`, then

```
git add docs/plans/fu-9-blood-fluids.md && git commit -m "docs(plan): FU-9 blood, fluids and acid–base integration" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -u origin fu-9-blood-fluids
```

- [x] **Step 3 — the runners and the before-numbers.** The runners live outside the repo
  (`projects/patient-monitor-engine/research/{22,13,21}-audit-scripts/`):

```
mkdir -p <scratchpad>/fu-9-blood-fluids
cp -R ../../research/22-audit-scripts <scratchpad>/fu-9-blood-fluids/bf
cp -R ../../research/13-audit-scripts <scratchpad>/fu-9-blood-fluids/rh
cp -R ../../research/21-audit-scripts <scratchpad>/fu-9-blood-fluids/sp
cd <scratchpad>/fu-9-blood-fluids/bf && PME_ENGINE=<worktree>/packages/engine-core/src/index.ts BF_OUT=out/before.json \
  node --import ./hooks.mjs --experimental-strip-types cli.ts > ../bf-before.log        # all 74 cells, ≈ 40 min
cd ../rh && PME_ENGINE=<worktree>/packages/engine-core/src/index.ts RH_OUT=out/before.json \
  node --import ./hooks.mjs --experimental-strip-types cli.ts > ../rh-before.log        # all 62 cells, ≈ 40 min
cd ../sp && PME_ENGINE=<worktree>/packages/engine-core/src/index.ts SP_OUT=out/before.json \
  node --import ./hooks.mjs --experimental-strip-types cli.ts SP-08 > ../sp-before.log
```

  (bounded waits; the three can run side by side.) Expected (main `2473f0b`): the inventory's "Measured" columns — BF-02a
  retAwake30 0.52, gaMinusAwake +0.01; BF-02b 0.00; BF-04 +0.546; BF-05a iCa 0.30, BF-05d BE −5.6 with an arrest; BF-08d
  −0.002; BF-09b 0.0 min; BF-11b +0.07; BF-12 +6.92; BF-15b −0.1; BF-16b PaCO₂ 39.7; BF-20a EVLWI 0; BF-22a COP 8.66,
  BF-22b AG −0.16; BF-29b SvO₂ 77.8; RH verdicts {PL 23, WR 12, TW 11, NE 8, TS 7, MI 1} with RH-01a 0.35, RH-03a no
  recovery bin, RH-06a IAP 15 0 %, RH-08a BV −2, RH-16 HBF +5.6 %; SP-08a–e all 0 (urine 22.2 vs 22.2 mL/h). A different
  number means main moved after this plan was written: record it in the gate note, do not tune.
- [x] **Step 4 — the physiology audit before, and its chaos envelope.** `PME_AUDIT_OUT=<scratchpad>/fu-9-blood-fluids/audit-before
  npx -y pnpm@9.15.9 run audit:physiology > <scratchpad>/fu-9-blood-fluids/audit-before.md` (≈ 10 min). Expected (main
  `2473f0b`): B2/B7 PEA 830 s, B6 1130 s, B9 760 s, C1 no arrest (first MAP < 30 at 1000 s), C4 645 s, D0 1775 s, D1 720 s, D2 1350 s, E1/E2 665 s, F2 295 s, F4 2785 s, G2b 65 s, G3 645 s, G3b 525 s, I1 910 s, K-ptx 670 s; propofol matrix healthy −23 %, 80 y HTN −21 %, AS + CAD −21 %, HFrEF −21 %, septic pre-dose CO 5.22. Then the perturbation ensemble (R5; R50 F5) in a THROWAWAY copy of the worktree
  (`git worktree add --detach <scratchpad>/fu-9-blood-fluids/pert origin/main`, never this branch): for each δ in
  ±1e-5, ±1e-4, ±3.1476e-4, ±1e-3 mmHg, make `paco2SetPoint`'s last line `return Math.min(paco2Rest, winterPaco2(hco3)) + (δ);`
  and run `PME_ENGINE=<pert>/packages/engine-core/src/index.ts … audit:physiology D0-pe D2-pe-peep15 K-ptx`. Record the
  envelope (min–max arrest time per row) in the gate note. Measured by the fixer on `2473f0b`: D0 1770–1775 s, D2 1285–1355 s, K-ptx 665–685 s (δ = ±1e-5 … ±1e-3 mmHg; B2/B7, B6, I1 and C1 do not move under any δ).
- [x] **Step 5 — suites green on the base.** `npx -y pnpm@9.15.9 -r typecheck` and `CI=1 PME_TEST_SET=fast npx -y
  pnpm@9.15.9 --filter @pme/engine-core exec vitest run` → pass. (On macOS `pk-longrun` in slow-a reads 2.5065 vs 2.5 ±
  0.005 on `2473f0b` — G-FU4's known macOS red; CI's Linux passes it. Not FU-9's.)

### Task A0b: CI amendment 5 — a third slow group `slow-c` with a printed disjointness gate (R50 ruling R10; Part A)

**Files:**
- Modify: `packages/engine-core/vite.config.ts` (the `fu9-*` SLOW entry; `SLOW_C`; `SLOW_B` minus SLOW_C; the `slow-b`
  exclude and the `slow-c` set), `.github/workflows/ci.yml` (the build job's disjointness step; the test-slow matrix)
- Overlap: 7k and FU-8 anchor on the `af-pulse-deficit` SLOW line and the `SLOW_A` literal; FU-8 adds `fu8-*` to
  SLOW_A — none of this task's lines. No other plan edits `ci.yml`.

**Why / measured:** research/22's F10 review item (R50 F10): FU-9's engine files measured 24.6 min serial on the review's
4-vCPU container before memoising (≈ 17 min after), against slow-a 21.6 and slow-b 37.6 of the ≈ 40 min each job is held
to at the FU-4 gate; FU-8's `fu8-*` files also join slow-a. Per-file times of `PME_TEST_SET=slow` on `2473f0b` (this Mac,
serial): slow-a 1 026 s, slow-b 1 591 s. Decision D19. slow-c takes the `fu9-*` files and two slow-b files by time
(pk-acceptance-pd 213 s, endo-acceptance 178 s). The prototype's slow-c ran in 868 s serial here.

- [x] **Step 1 — the config.**

In `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/clinical-suite.test.ts', // FU-4 Task 22: the clinical scenario suite (SLOW_A)
```

replace with:

```ts
  'test/engine/clinical-suite.test.ts', // FU-4 Task 22: the clinical scenario suite (SLOW_A)
  'test/engine/fu9-*.test.ts', // FU-9: blood/fluid/acid–base/renal scenarios, 10–90 sim-min arms (SLOW_C)
```

find:

```ts
const SLOW_B = SLOW.filter((p) => !SLOW_A.includes(p));
```

replace with:

```ts
/**
 * FU-9 (CI amendment 5, R50 ruling R10): a third group. FU-9's engine files did not fit slow-a or slow-b (21.6 and 37.6
 * of the ≈ 40 min each job is held to at the FU-4 gate), so slow-c takes them plus the slow-b files listed here, chosen
 * by the per-file times of `PME_TEST_SET=slow` (docs/plans/fu-9-blood-fluids.md, File map). SLOW_B is SLOW minus SLOW_A
 * minus SLOW_C by the same matcher as above; ci.yml's build job prints the three lists and fails on an overlap or a gap.
 */
const SLOW_C = ['test/engine/fu9-*.test.ts', 'test/engine/pk-acceptance-pd.test.ts', 'test/engine/endo-acceptance.test.ts'];
const SLOW_B = SLOW.filter((p) => !SLOW_A.includes(p) && !SLOW_C.includes(p));
```

find:

```ts
    ...(set === 'slow-b' ? { include: SLOW_B, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A], fileParallelism: false } : {}),
```

replace with:

```ts
    ...(set === 'slow-b' ? { include: SLOW_B, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A, ...SLOW_C], fileParallelism: false } : {}),
    ...(set === 'slow-c' ? { include: SLOW_C, exclude: ['**/node_modules/**', '**/dist/**', ...SLOW_A], fileParallelism: false } : {}), // FU-9 (CI amendment 5)
```

In `.github/workflows/ci.yml`, find:

```yaml
      - run: pnpm typecheck
```

replace with:

```yaml
      - run: pnpm typecheck
      - name: slow groups are disjoint and cover SLOW (FU-9 CI amendment 5)
        working-directory: packages/engine-core
        run: |
          for g in slow slow-a slow-b slow-c; do PME_TEST_SET=$g pnpm exec vitest list --filesOnly | sort > "$RUNNER_TEMP/$g.txt"; echo "$g: $(wc -l < "$RUNNER_TEMP/$g.txt") files"; done
          cd "$RUNNER_TEMP"
          sort slow-a.txt slow-b.txt slow-c.txt | uniq -d > both.txt
          if [ -s both.txt ]; then echo "in two slow groups:"; cat both.txt; exit 1; fi
          sort -u slow-a.txt slow-b.txt slow-c.txt | diff slow.txt -
```

find:

```yaml
    # cannot starve the Vitest worker RPC there. FU-4 (D17): two file groups, one job each.
```

replace with:

```yaml
    # cannot starve the Vitest worker RPC there. FU-4 (D17): two file groups, one job each; FU-9 (CI amendment 5): three.
```

find:

```yaml
        group: [slow-a, slow-b]
```

replace with:

```yaml
        group: [slow-a, slow-b, slow-c]
```


- [x] **Step 2 — the disjointness gate, locally** (the same commands the build job runs):

```
cd packages/engine-core
for g in slow slow-a slow-b slow-c; do PME_TEST_SET=$g npx -y pnpm@9.15.9 exec vitest list --filesOnly | sort > /tmp/fu9-$g.txt; echo "$g: $(wc -l < /tmp/fu9-$g.txt)"; done
sort /tmp/fu9-slow-a.txt /tmp/fu9-slow-b.txt /tmp/fu9-slow-c.txt | uniq -d            # prints nothing
sort -u /tmp/fu9-slow-a.txt /tmp/fu9-slow-b.txt /tmp/fu9-slow-c.txt | diff /tmp/fu9-slow.txt -   # prints nothing
```

  Expected on `2473f0b`: slow 55, slow-a 10, slow-b 43, slow-c 2 (after all FU-9 tasks: slow 66, slow-c 13).
- [x] **Step 3 — run slow-c once** (`CI=1 PME_TEST_SET=slow-c … vitest run`) → pass (the two moved files).
- [x] **Commit and push.**

```
git add -A packages/engine-core/vite.config.ts .github/workflows/ci.yml && git commit -m "ci: a third slow group slow-c with a printed disjointness gate (FU-9 CI amendment 5)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A1: F1 + H1 — the kidney excretes an expanded circulation and reads the anaesthetised output against demand (7d; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/renal/params.ts` (`V_EXP_GAIN`, `V_EXP_MAX`, `EABV_TAU_S`),
  `packages/engine-core/src/l2/renal/model.ts` (`expansionFactor`; `RenalInputs.demandRel`; `RenalState.eabvLp`; `eabv`;
  the settle and the step's effective volume; the `fe` line), `packages/engine-core/src/l2/organs/inputs.ts` (`metabolic`
  import, `OrganView.demandRel`, `BloodLike.core.out.na`), `packages/engine-core/src/l2/organs/pipeline.ts` (import,
  `renalIn`, `nominalView`, `renalSeam`'s natriuretic share and its call)
- Create: `packages/engine-core/test/helpers/fu9.ts` (the BF runner's rigs; `once()`; `urineMl`),
  `test/helpers/fu9-renal.ts` (the kidney-alone rig), `test/l2/renal/fu9-expansion.test.ts`, `test/engine/fu9-kinetics.test.ts`
- Overlap: none of FU-6/FU-7/FU-8/7k/V.1 edits `l2/renal/**` (FU-8 I-34 edits the oliguria flag in `stepRenal`'s KDIGO
  lines — a different hunk). FU-8 does not edit `organs/**` (checked on its current draft).

**Why / measured (main):** research/22 F1 and research/13 H1. Ringer's 1 L over 30 min: 52 % (awake) and 53 % (GA) of
the litre still intravascular 30 min after the end, class III − GA 0.00; 1 u RBC Hb +0.546 at 1 h. A healthy GA patient at
MAP 93 makes 0.35 mL/kg/h (vNh 0.58, angiotensin 0.37 — GA's normal CO fall read as hypovolaemia) and trips the
OLIGURIA flag; after class III + 2 L the urine never reaches 0.5 in 2 h. Decision D1 (with R4 and the joint
calibration).

**Prototype numbers:** engine test — retention awake 0.22, GA 0.34, class III 0.54; 1 u RBC Hb +0.75 at 1 h (the first
draft's `it.fails` is now an `it`); GA hour-2 urine 0.57; after class III + 2 L, 10-min bins 1.17, 0.58, 0.34, 0.37,
0.39, 0.40 mL/kg/h (the 30–60 min mean 0.37 → `it.fails`, Open question 11). Unit: +5 % BV → 5.50 mL/kg/h awake, 3.30
under GA; GA at demand 0.85 → 0.60 (0.49 at demand 1). BF-12 +7.08 (first draft) → +6.95 (PL) (R4). **FU-4 check:**
`clinical-suite`, `circ-lowflow-arrest`, `organs-renal`, `organs-soak` pass; `audit:physiology` — see D13.

- [x] **Step 1 — the tests (they fail: no `expansionFactor`, no `demandRel`).**

Create `packages/engine-core/test/helpers/fu9.ts`:

```ts
// FU-9 test helpers: the coverage-run-BF rigs (research/22 §1) through the real engine, read-only on the committed state.
import { createEngine } from '../../src/engine.ts';
import type { OrgansState } from '../../src/l2/organs/pipeline.ts';
import type { MonitorEngine, PatientProfile } from '../../src/types.ts';
import { cmd, evB, MAN, st } from './blood.ts';

export type Step = [number, Record<string, unknown>];
/** BF "GA vent": ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 and the Stage 3 GA flag at t = 1 s (MODELED). */
export const GA_VENT: Step[] = [
  [1, { type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } }],
  [1, { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } }],
  [1, { type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } }],
];
export const ev = (event: Record<string, unknown>): Record<string, unknown> => ({ type: 'applyEvent', event });

/** Run a timeline to each sample time; `read` is called at every time in `at` (seconds), yielding once per sim-minute. */
export async function arm<T>(steps: Step[], at: number[], read: (e: MonitorEngine) => T, patient: PatientProfile = MAN): Promise<T[]> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient });
  const todo = [...steps].sort((a, b) => a[0] - b[0]);
  const out: T[] = [];
  for (const tS of [...at].sort((a, b) => a - b)) {
    for (let t = Math.floor(e.now().simT / 60) * 60 + 60; t <= tS; t += 60) {
      while (todo.length && (todo[0] as Step)[0] <= t) {
        const [ts, body] = todo.shift() as Step;
        e.advanceTo(Math.max(e.now().simT, ts));
        const r = e.dispatch(cmd(body));
        if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
      }
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    while (todo.length && (todo[0] as Step)[0] <= tS) {
      const [ts, body] = todo.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch(cmd(body));
      if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
    }
    e.advanceTo(tS);
    out.push(read(e));
  }
  return out;
}
/** Memoise an arm (or a set of arms) at module scope, so an `it.fails` reuses the runs of the `it` beside it (R50 F10). */
export const once = <T>(f: () => Promise<T>): (() => Promise<T>) => {
  let p: Promise<T> | undefined;
  return () => (p ??= f());
};
/** 7d's cumulative urine, mL (RH runner `cumMl`). */
export const urineMl = (e: MonitorEngine): number => (e as unknown as { st: { organs: OrgansState } }).st.organs.renal.cumMl;
/** 7c's blood volume (plasma + red cells), mL. */
export const bvMl = (e: MonitorEngine): number => st(e).blood.core.fl.vp + st(e).blood.core.fl.hbG * 3;
export { evB, MAN, st };
```

Create `packages/engine-core/test/helpers/fu9-renal.ts`:

```ts
// FU-9 unit rig for the 7d kidney alone: 70 kg at the healthy reference inputs (MAP 93, CVP 5, CO 5.6 L/min).
import { createRenal, stepRenal, type RenalInputs, type RenalState } from '../../src/l2/renal/model.ts';

export const RENAL_W = 70;
export const RENAL_BASE: RenalInputs = { map: 93, cvp: 5, iap: 0, coLpm: 5.6, bvRel: 1, albuminGL: 42, anaesthesia: 'none', pawExcessCmH2O: 0, alphaExcess: 0, sepsis: 0 };
export const uopMlKgH = (s: RenalState): number => (s.uopMlMin * 60) / RENAL_W;
/** Create the kidney settled at `start` (with nephron loss `aki`), then hold `inp` for `secs` in 1 s steps. */
export function renalHold(inp: RenalInputs, secs: number, aki = 0, start: RenalInputs = RENAL_BASE): RenalState {
  const s = createRenal(start, RENAL_W, aki);
  for (let i = 0; i < secs; i++) stepRenal(s, inp, 1);
  return s;
}
```

Create `packages/engine-core/test/l2/renal/fu9-expansion.test.ts`:

```ts
// FU-9 Task A1 (F1, H1): the kidney excretes an EXPANDED circulation (ANP / ADH suppression), through the same chain that
// already carries general anaesthesia (S_GA) and depletion (vNh), so GA and a bled patient retain more; and it reads the
// cardiac output against the body's DEMAND, so an anaesthetised patient is not oliguric at a normal MAP (research/13 H1).
import { describe, expect, it } from 'vitest';
import { expansionFactor } from '../../../src/l2/renal/model.ts';
import { V_EXP_MAX } from '../../../src/l2/renal/params.ts';
import { RENAL_BASE, renalHold, uopMlKgH } from '../../helpers/fu9-renal.ts';

describe('FU-9 F1: renal excretion of an expanded circulation (Hahn 2010; Norberg 2007; Drobin & Hahn 1999)', () => {
  it('expansionFactor: 1 at and below normovolaemia, 1 + 90 per unit excess, capped', () => {
    expect(expansionFactor(1)).toBe(1);
    expect(expansionFactor(0.8)).toBe(1);
    expect(expansionFactor(1.05)).toBeCloseTo(5.5, 9);
    expect(expansionFactor(1.5)).toBe(V_EXP_MAX);
  });
  it('+5 % blood volume awake: UOP ≈ 5× basal within 10 min; general anaesthesia keeps the S_GA share; a normovolaemic kidney is unchanged', () => {
    const up = { ...RENAL_BASE, bvRel: 1.05 };
    const awake = uopMlKgH(renalHold(up, 600, 0, { ...up, bvRel: 1 }));
    const gaUp = { ...up, anaesthesia: 'general' as const };
    const ga = uopMlKgH(renalHold(gaUp, 600, 0, { ...gaUp, bvRel: 1 }));
    console.log(`FU-9 F1 renal: +5 % BV → ${awake.toFixed(2)} mL/kg/h awake, ${ga.toFixed(2)} under GA`);
    expect(awake).toBeGreaterThan(4.5);
    expect(awake).toBeLessThan(6.5);
    expect(ga / awake).toBeCloseTo(0.6, 2); // S_GA
    expect(uopMlKgH(renalHold(RENAL_BASE, 600))).toBeCloseTo(1.0, 2);
  });
});

describe('FU-9 H1: output referenced to demand (research/13 H1)', () => {
  it('GA: CO −15 % with demand −15 % reads "full" — UOP 0.6 mL/kg/h (S_GA only; was 0.35); the same CO fall at normal demand still reads underfilled', () => {
    const ga = { ...RENAL_BASE, anaesthesia: 'general' as const, coLpm: 0.85 * 5.6 };
    const full = uopMlKgH(renalHold({ ...ga, demandRel: 0.85 }, 1800));
    const under = uopMlKgH(renalHold(ga, 1800));
    console.log(`FU-9 H1: GA UOP ${full.toFixed(2)} (demand 0.85) vs ${under.toFixed(2)} (demand 1)`);
    expect(full).toBeCloseTo(0.6, 2);
    expect(under).toBeLessThan(full);
  });
});
```

Create `packages/engine-core/test/engine/fu9-kinetics.test.ts`:

```ts
// FU-9 Task A1 (F1, H1): the kidney excretes an expanded circulation, context-sensitively (research/22 BF-02a/b, BF-04),
// and reads the anaesthetised output against the lowered demand (research/13 RH-01a, RH-03a).
// Rigs = the BF runner's: MODELED 40 y 70 kg man; "GA" = ETT + VCV 12 × 600, PEEP 5, FiO2 0.5 + the GA flag; Ringer's
// lactate 1 L over 30 min from 300 s; retention = Δ blood volume against the same timeline without the fluid, ÷ 1000 mL,
// 30 min after the end (3900 s). Class III: 1500 mL over 10 min from 60 s, the fluid at 960 s.
import { describe, expect, it } from 'vitest';
import { arm, bvMl, ev, GA_VENT, MAN, once, st, urineMl, type Step } from '../helpers/fu9.ts';

const RL: Step = [300, ev({ kind: 'fluid', fluid: 'rl', volumeMl: 1000, overS: 1800 })];
const retention = async (base: Step[], fluid: Step, tRead: number): Promise<number> => {
  const [i] = await arm([...base, fluid], [tRead], bvMl);
  const [c] = await arm(base, [tRead], bvMl);
  return ((i as number) - (c as number)) / 1000;
};
// the GA control (no fluid) is read once for the retention (3900 s) and for hour 2's urine (H1) — R50 F10
const gaCtl = once(() => arm(GA_VENT, [3600, 3900, 7200], (e) => ({ bv: bvMl(e), urine: urineMl(e) })));
const gaRetention = once(async () => {
  const [i] = await arm([...GA_VENT, RL], [3900], bvMl);
  const c = (await gaCtl())[1] as { bv: number };
  return ((i as number) - c.bv) / 1000;
});
const kg = MAN.weightKg as number;

describe('FU-9 F1: crystalloid kinetics are context-sensitive (Hahn 2010; Norberg 2007; Drobin & Hahn 1999)', { timeout: 900_000 }, () => {
  it('RL 1 L / 30 min, awake: 20–30 % intravascular 30 min after the end (was 0.52); GA retains ≥ 0.05 more (was +0.01)', async () => {
    const awake = await retention([], RL, 3900);
    const ga = await gaRetention();
    console.log(`FU-9 F1 retention 30 min after the end: awake ${awake.toFixed(2)}, GA ${ga.toFixed(2)}`);
    expect(awake).toBeGreaterThanOrEqual(0.2);
    expect(awake).toBeLessThanOrEqual(0.3);
    expect(ga - awake).toBeGreaterThanOrEqual(0.05);
  });
  it('after class III (1500 mL), the same litre is retained ≥ 0.05 more than in normovolaemic GA (was 0.00)', async () => {
    const bleed: Step = [60, ev({ kind: 'bleed', volumeMl: 1500, overS: 600 })];
    const hypo = await retention([...GA_VENT, bleed], [960, RL[1]], 960 + 3600);
    const ga = await gaRetention();
    console.log(`FU-9 F1 class III ${hypo.toFixed(2)} vs GA ${ga.toFixed(2)}`);
    expect(hypo - ga).toBeGreaterThanOrEqual(0.05);
  });
  // Wiesen 1994 / AABB: +1 g/dL per unit (band 0.7–1.3). Main +0.55: the unit's plasma is excreted as a crystalloid would
  // be. With F1 alone +0.66 (an `it.fails` in the first draft); with H1 (the GA kidney reads demand) +0.75.
  it('1 u RBC over 30 min under GA: Hb +0.7–1.3 g/dL at 1 h after the end (main +0.55)', async () => {
    const at = [300 + 1800 + 3600];
    const hb = (e: Parameters<typeof bvMl>[0]) => st(e).blood.out.hb;
    const [i] = await arm([...GA_VENT, [300, ev({ kind: 'transfusion', product: 'rbc', units: 1, overS: 1800, warmed: true })]], at, hb);
    const [c] = await arm(GA_VENT, at, hb);
    const d = (i as number) - (c as number);
    console.log(`FU-9 F1 1 u RBC: Hb +${d.toFixed(2)} at 1 h`);
    expect(d).toBeGreaterThanOrEqual(0.7);
    expect(d).toBeLessThanOrEqual(1.3);
  });
});

describe('FU-9 H1: an anaesthetised kidney is not oliguric at a normal MAP (research/13 H1)', { timeout: 900_000 }, () => {
  it('GA, normovolaemic, MAP ≈ 93: hour-2 urine 0.5–1 mL/kg/h (tables §5.2 S; main 0.35, RH-01a)', async () => {
    const [h1, , h2] = (await gaCtl()) as { urine: number }[];
    const uo = ((h2 as { urine: number }).urine - (h1 as { urine: number }).urine) / kg;
    console.log(`FU-9 H1 GA hour-2 urine ${uo.toFixed(2)} mL/kg/h`);
    expect(uo).toBeGreaterThanOrEqual(0.5);
    expect(uo).toBeLessThanOrEqual(1);
  });
  // class III (1500 mL / 10 min) then Ringer's 2 L over 30 min from 960 s: urine in 10-min bins after the end (2760 s)
  const T_END = 960 + 1800;
  const recovery = once(() => arm([...GA_VENT, [60, ev({ kind: 'bleed', volumeMl: 1500, overS: 600 })], [960, ev({ kind: 'fluid', fluid: 'rl', volumeMl: 2000, overS: 1800 })]],
    [0, 1, 2, 3, 4, 5, 6].map((k) => T_END + 600 * k), urineMl));
  const bin = (u: number[], k: number) => (((u[k + 1] as number) - (u[k] as number)) / kg) * 6; // mL/kg/h
  it('class III, then RL 2 L restores MAP/CO: a 10-min urine bin reaches 0.5 mL/kg/h within 60 min of the end (ATLS; main: none in 2 h)', async () => {
    const u = await recovery();
    const bins = [0, 1, 2, 3, 4, 5].map((k) => bin(u, k));
    console.log(`FU-9 H1 recovery bins ${bins.map((b) => b.toFixed(2)).join(' ')}`);
    expect(Math.max(...bins)).toBeGreaterThanOrEqual(0.5);
  });
  // R45 (research/13 RH-03a): ATLS's end point read as the 30–60 min mean. The joint calibration (D1) caps it: the GA
  // ceiling is S_GA × V(bvRel 0.97) ≈ 0.57 × 0.9, and vNh washes out with 7d's τ 45 min (tables check 20's own fit;
  // τ 10–20 min gives 0.45–0.46 and breaks check 20). Measured 0.37 (RH-03a 0.38; main 0.23) — Ali's question (OQ11).
  it.fails('class III, then RL 2 L: urine 30–60 min after the end ≥ 0.5 mL/kg/h — measured 0.37 (main 0.23)', async () => {
    const u = await recovery();
    expect((((u[6] as number) - (u[3] as number)) / kg) * 2).toBeGreaterThanOrEqual(0.5);
  });
});
```


- [x] **Step 2 — run them; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/fu9-expansion.test.ts test/engine/fu9-kinetics.test.ts`
  → the unit file fails to import `expansionFactor`; the engine file reads awake 0.52 / GA 0.53, class III − GA 0.00,
  RBC +0.55, GA hour-2 urine 0.35, no recovery bin ≥ 0.5.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/renal/params.ts`, find:

```ts
export const V_AT_30 = 0.2; // at −30 %
```

replace with:

```ts
export const V_AT_30 = 0.2; // at −30 %
/** FU-9 F1: excreted-fraction gain per unit blood-volume EXPANSION (ANP/ADH suppression) [ENG]: fitted so 1 L of
 *  Ringer's over 30 min, awake, is 20–30 % intravascular 30 min after the end (Hahn 2010; 7c's own fallback t½ 30 min,
 *  tables `t12El`); capped at V_EXP_MAX × (≈ 15 mL/min peak diuresis, Hahn's volunteers). */
export const V_EXP_GAIN = 90;
export const V_EXP_MAX = 12;
/** FU-9 H1: symmetric low-pass of the effective volume before the neurohumoral lag, s [ENG] (research/13 H1: τ ≈ 60 s). */
export const EABV_TAU_S = 60;
```

In `packages/engine-core/src/l2/renal/model.ts`, find:

```ts
  EABV_EXP, MANNITOL_KE_PER_MIN, P_BOWMAN, RENAL_REF_CO_L_KG, RENAL_REF_CVP, RENAL_REF_MAP, MANNITOL_ML_PER_G, NE_EXCESS_PER_01, NH_TAU_OFF_S, NH_TAU_ON_S, OLIGURIA_ML_KG_H, PEEP_PER_10, R_AFF, RENAL_FLOW_FRAC, S_GA,
```

replace with:

```ts
  EABV_EXP, EABV_TAU_S, MANNITOL_KE_PER_MIN, P_BOWMAN, RENAL_REF_CO_L_KG, RENAL_REF_CVP, RENAL_REF_MAP, MANNITOL_ML_PER_G, NE_EXCESS_PER_01, NH_TAU_OFF_S, NH_TAU_ON_S, OLIGURIA_ML_KG_H, PEEP_PER_10, R_AFF, RENAL_FLOW_FRAC, S_GA,
```

find:

```ts
  SEPSIS_GFR_LOSS, TGF_TAU_S, UOP0_ML_KG_H, V_AT_15, V_AT_30,
} from './params.ts';
```

replace with:

```ts
  SEPSIS_GFR_LOSS, TGF_TAU_S, UOP0_ML_KG_H, V_AT_15, V_AT_30, V_EXP_GAIN, V_EXP_MAX,
} from './params.ts';
```

find:

```ts
  furoCe?: number;
}
```

replace with:

```ts
  furoCe?: number;
  /** FU-9 H1: the whole-body O2 demand ÷ rest (Stage 3's metabolic factor; GA 0.85, cold lower); absent → 1. */
  demandRel?: number;
}
```

find:

```ts
  vNh: number; // neurohumoral (ADH/aldosterone) volume factor: follows volumeFactor(eabv) with a fast onset, slow washout
```

replace with:

```ts
  vNh: number; // neurohumoral (ADH/aldosterone) volume factor: follows volumeFactor(eabv) with a fast onset, slow washout
  eabvLp?: number; // FU-9 H1: the effective volume low-passed symmetrically (τ EABV_TAU_S) before the neurohumoral lag
```

find:

```ts
/** Effective arterial blood volume (0–1+) [ENG]: the smaller of the blood volume and (CO/CO0)^0.75 — a low-output state
```

replace with:

```ts
/**
 * FU-9 F1: the expanded circulation is excreted. Atrial stretch (ANP) and ADH suppression raise the excreted fraction
 * with the blood volume ABOVE the profile's (tables §5.2's V covers only depletion): × (1 + V_EXP_GAIN·(bvRel − 1)⁺),
 * capped at V_EXP_MAX. It multiplies the same chain as V, so general anaesthesia (S_GA, lower CO → vNh) and a
 * depleted patient (vNh < 1) retain more — Hahn's context-sensitive volume kinetics (Hahn 2010 Anesthesiology
 * 113:470; Norberg 2007 Anesthesiology 107:24; Drobin & Hahn 1999 Anesthesiology 90:81). 1 at and below normovolaemia.
 */
export function expansionFactor(bvRel: number): number {
  return Math.min(V_EXP_MAX, 1 + V_EXP_GAIN * Math.max(0, bvRel - 1));
}

/** Effective arterial blood volume (0–1+) [ENG]: the smaller of the blood volume and (CO/CO0)^0.75 — a low-output state
```

find:

```ts
/** Effective arterial blood volume (0–1+) [ENG]: the smaller of the blood volume and (CO/CO0)^0.75 — a low-output state
 *  activates the same volume receptors as bleeding (tables §7 check 20: HFrEF oliguria at normal blood volume). The
 *  volume factor V acts through `vNh`, which follows V(eabv) with onset τ 2 min and washout τ 45 min (NH_TAU_*). */
export function eabv(inp: RenalInputs, co0: number): number {
  return Math.min(inp.bvRel, (Math.max(0, inp.coLpm) / Math.max(0.1, co0)) ** EABV_EXP);
}
```

replace with:

```ts
/** Effective arterial blood volume (0–1+) [ENG]: the smaller of the blood volume and (CO/CO0)^0.75 — a low-output state
 *  activates the same volume receptors as bleeding (tables §7 check 20: HFrEF oliguria at normal blood volume). The
 *  volume factor V acts through `vNh`, which follows V(eabv) with onset τ 2 min and washout τ 45 min (NH_TAU_*).
 *  FU-9 H1 (research/13): the output is referenced to the body's DEMAND (CO0 × demandRel) — general anaesthesia,
 *  hypothermia and sedation lower demand and output together and stay "full" (tables §5.2: intra-operative UOP 0.5–1
 *  with S the only GA term), while HFrEF (a low CO at a normal demand) and haemorrhage (bvRel) are unchanged. */
export function eabv(inp: RenalInputs, co0: number): number {
  return Math.min(inp.bvRel, (Math.max(0, inp.coLpm) / Math.max(0.1, co0 * Math.max(0.3, inp.demandRel ?? 1))) ** EABV_EXP);
}
```

find:

```ts
  const ev = eabv(inp, s.p.co0);
  s.ang = angiotensin(inp.map - pvn, ev);
```

replace with:

```ts
  const ev = eabv(inp, s.p.co0);
  s.eabvLp = ev;
  s.ang = angiotensin(inp.map - pvn, ev);
```

find:

```ts
  const ev = eabv(inp, s.p.co0);
  s.ang += (angiotensin(rpp, ev) - s.ang) * (1 - Math.exp(-dt / ANG_TAU_S)); // AngII acts over minutes
```

replace with:

```ts
  // FU-9 H1: low-pass the effective volume symmetrically first, so a CO that swings ±5 % breath to breath under PPV is
  // not rectified downwards by the fast-onset / slow-washout neurohumoral lag
  s.eabvLp = (s.eabvLp ?? eabv(inp, s.p.co0)) + (eabv(inp, s.p.co0) - (s.eabvLp ?? eabv(inp, s.p.co0))) * (1 - Math.exp(-dt / EABV_TAU_S));
  const ev = s.eabvLp;
  s.ang += (angiotensin(rpp, ev) - s.ang) * (1 - Math.exp(-dt / ANG_TAU_S)); // AngII acts over minutes
```

find:

```ts
  const fe = s.p.ef0 * natriuresis(inp.map, s.p.pRef) * stress * s.vNh * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
```

replace with:

```ts
  const fe = s.p.ef0 * natriuresis(inp.map, s.p.pRef) * stress * s.vNh * expansionFactor(inp.bvRel) * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
```

In `packages/engine-core/src/l2/organs/inputs.ts`, find:

```ts
import type { RespState } from '../resp/pipeline.ts';
```

replace with:

```ts
import { metabolic, type RespState } from '../resp/pipeline.ts';
```

find:

```ts
  hb: number; albuminGL: number; bvRel: number;
```

replace with:

```ts
  hb: number; albuminGL: number; bvRel: number;
  demandRel: number; // FU-9 H1: Stage 3's O2 demand ÷ rest (GA, temperature, fever) — the kidney's reference output
```

find:

```ts
    bvRel: num(out?.bvRel, bvFallback),
```

replace with:

```ts
    bvRel: num(out?.bvRel, bvFallback),
    demandRel: metabolic(rs, t, 'o2'), // FU-9 H1
```

find:

```ts
  core?: { liver?: number; renal?: RenalSeam };
```

replace with:

```ts
  core?: { liver?: number; renal?: RenalSeam; out?: { na?: number } }; // FU-9 R4: the plasma Na an expansion natriuresis carries
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
import { createRenal, giveMannitolRenal, stepRenal, uopOver, type RenalInputs, type RenalState } from '../renal/model.ts';
```

replace with:

```ts
import { createRenal, expansionFactor, giveMannitolRenal, stepRenal, uopOver, type RenalInputs, type RenalState } from '../renal/model.ts';
```

find:

```ts
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis,
```

replace with:

```ts
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis, demandRel: v.demandRel, // FU-9 H1
```

find:

```ts
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
```

replace with:

```ts
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, demandRel: 1, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
```

find:

```ts
function renalSeam(s: RenalState, gluconate: number): RenalSeam {
  const lH = Math.max(0, s.uopMlMin * 60 - UOP0_ML_KG_H * s.p.weightKg) / 1000;
  const na = lH * URINE_NA * (1 + FUROSEMIDE_NA_BOOST * s.furoE);
```

replace with:

```ts
function renalSeam(s: RenalState, gluconate: number, natriuresis = { share: 0, naMmolL: URINE_NA }): RenalSeam {
  const lH = Math.max(0, s.uopMlMin * 60 - UOP0_ML_KG_H * s.p.weightKg) / 1000;
  // FU-9 F1/R4: the expansion diuresis is NATRIURETIC (ANP): its share of the urine leaves at the plasma Na, not the
  // basal urine's URINE_NA [ENG] — otherwise excreting a load concentrates the plasma (hypertonic saline Na +7.08)
  const naUrine = natriuresis.share * natriuresis.naMmolL + (1 - natriuresis.share) * URINE_NA;
  const na = lH * naUrine * (1 + FUROSEMIDE_NA_BOOST * s.furoE);
```

find:

```ts
    core.renal = renalSeam(os.renal, v.gluconate);
```

replace with:

```ts
    const naPl = core.out?.na;
    const natri = { share: 1 - 1 / expansionFactor(v.bvRel), naMmolL: typeof naPl === 'number' && naPl > 0 ? naPl : URINE_NA }; // FU-9 F1/R4
    core.renal = renalSeam(os.renal, v.gluconate, natri);
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal test/l2/organs test/l2/blood test/engine/fu9-kinetics.test.ts` → pass
  (kinetics: 5 `it` + 1 `it.fails`). Then `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/organs-renal.test.ts test/engine/organs-soak.test.ts
  test/engine/organs-curves.test.ts` → pass.
- [x] **Step 5 — BF and RH runners:** `BF-02 BF-04 BF-01 BF-12 BF-14 BF-20b BF-21` (A0 Step 3's command, `BF_OUT=out/<task>.json`) and `RH-01 RH-03 RH-17 RH-26`
  (A0 Step 3's RH command, `RH_OUT=out/<task>.json`) → the "Prototype results" rows for these cells.
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7d): the kidney excretes an expansion and reads the anaesthetised output against demand (FU-9 F1, H1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A2: F3 — low flow raises O₂ extraction before VO₂ becomes supply-dependent (7c `oxygen.ts`; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/oxygen.ts` (header comment, `O2Out.deficit` comment, the `vo2` line)
- Create: `packages/engine-core/test/l2/blood/fu9-oxygen.test.ts`, `test/engine/fu9-oxygen.test.ts`
- Overlap: no other plan edits `oxygen.ts`.

**Why / measured (main):** research/22 F3 / BF-29b. 2 L bleed under GA, CO 1.57: SvO₂ 77.8 % (VBG) while lactate
reaches 3.0 — the regional supply-dependence term, a lactate device, was subtracted from VO₂. Decision D2.

**Prototype numbers:** SvO₂ 77.8 → **55.8 %** (band 30–65), lactate unchanged. **FU-4 check:** 7c's SvO₂ is read only
by the lab panel and the truth tree.

- [x] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-oxygen.test.ts`:

```ts
// FU-9 Task A2 (F3): extraction rises before VO2 becomes supply-dependent; the regional term makes lactate only.
import { describe, expect, it } from 'vitest';
import { o2Delivery } from '../../../src/l2/blood/oxygen.ts';

describe('FU-9 F3: O2 extraction before supply dependence (Cain 1977; Vincent & De Backer 2013)', () => {
  it('CO 60 % of rest, DO2 above DO2crit: VO2 = demand (ER rises), the regional LACTATE deficit is still there', () => {
    const d = o2Delivery(3.15, 5.25, 197, 245, 70); // DO2 621 > 420
    expect(d.vo2).toBe(245);
    expect(d.er).toBeCloseTo(245 / 621, 2);
    expect(d.deficit).toBeGreaterThan(60);
  });
  it('below DO2crit VO2 falls in proportion (demand·DO2/DO2crit), so ER stays at demand/DO2crit', () => {
    const d = o2Delivery(1.5, 5.25, 197, 245, 70); // DO2 296 < 420
    expect(d.vo2).toBeCloseTo((245 * 296) / 420, 0);
    expect(d.er).toBeCloseTo(245 / 420, 2);
    expect(o2Delivery(0, 5.25, 197, 245, 70).vo2).toBe(0);
  });
});
```

Create `packages/engine-core/test/engine/fu9-oxygen.test.ts`:

```ts
// FU-9 Task A2 (F3): low flow raises O2 extraction before VO2 becomes supply-dependent (research/22 BF-29b). Rig = the
// BF runner's GA vent (MODELED, 70 kg man); a 2 L bleed over 10 min from 60 s; read at 1200 s against no bleed.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, st } from '../helpers/fu9.ts';

describe('FU-9 F3: SvO2 falls with cardiac output in haemorrhage (Rivers 2001; Vincent & De Backer 2013)', { timeout: 300_000 }, () => {
  it('2 L bleed: 7c SvO2 < 65 % while lactate rises (was 77.8 % — the regional term cut VO2 instead); extraction ≥ 0.4', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ ...st(e).blood.core.o2, lact: st(e).blood.out.lactate });
    const [lo] = await arm([...GA_VENT, [60, ev({ kind: 'bleed', volumeMl: 2000, overS: 600 })]], [1200], read);
    const [n] = await arm(GA_VENT, [1200], read);
    if (!lo || !n) throw new Error('no sample');
    console.log(`FU-9 F3: SvO2 ${(100 * lo.svo2).toFixed(1)} % (control ${(100 * n.svo2).toFixed(1)}), DO2 ${lo.do2.toFixed(0)}, VO2 ${lo.vo2.toFixed(0)}/${lo.demand.toFixed(0)}, ER ${lo.er.toFixed(2)}, lactate ${lo.lact.toFixed(2)} (control ${n.lact.toFixed(2)})`);
    expect(lo.svo2).toBeLessThan(0.65);
    expect(n.svo2).toBeGreaterThan(0.65);
    expect(lo.lact).toBeGreaterThan(n.lact + 1);
    expect(lo.er).toBeGreaterThanOrEqual(0.4); // below DO2crit VO2 is supply-dependent at ER = demand/DO2crit
  });
});
```


- [x] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-oxygen.test.ts test/engine/fu9-oxygen.test.ts` → the unit test
  reads VO₂ 120 (not 245) at CO 60 %; the engine test reads SvO₂ 77.8 %.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/oxygen.ts`, find:

```ts
//   VO2 = demand − deficit;  deficit = max(global, regional)
```

replace with:

```ts
//   VO2 = demand − global: extraction rises first, VO2 becomes supply-dependent only below DO2crit
//     (FU-9 F3: Cain 1977 J Appl Physiol 42:228; Shibutani 1983 Crit Care Med 11:640; Vincent & De Backer 2013 NEJM
//     369:1726 — SvO2 falls with CO in haemorrhage before VO2 does)
//   lactate deficit = max(global, regional)
```

find:

```ts
//       (flow relative to what the current metabolism needs: under GA flow and VO2 fall together without redistribution)
```

replace with:

```ts
//       (flow relative to what the current metabolism needs: under GA flow and VO2 fall together without redistribution)
//       — the regional term is heterogeneous splanchnic dysoxia: it makes lactate but does not lower the whole-body VO2
//       (the other beds extract more), so it is not subtracted from VO2 (FU-9 F3)
```

find:

```ts
  deficit: number;
```

replace with:

```ts
  deficit: number; // the LACTATE deficit (mL O2/min): max(global, regional) — FU-9 F3: VO2 is demand − global only
```

find:

```ts
  const vo2 = demand - deficit;
```

replace with:

```ts
  const vo2 = demand - Math.min(demand, global); // FU-9 F3: extraction rises first; VO2 is supply-dependent only below DO2crit
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/engine/fu9-oxygen.test.ts test/engine/blood-oxygen.test.ts
  test/engine/blood-sanity-haem.test.ts` → pass (17a class III lactate 3–5 at 30 min unchanged).
- [x] **Step 5 — BF runner:** `BF-29a BF-29b BF-18b BF-19` (A0 Step 3's command, `BF_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "fix(7c): VO2 is supply-dependent only below DO2crit; the regional term makes lactate (FU-9 F3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A3: F5 — citrate is an anion until it is metabolised; electroneutral, sourced blood products (7c; Part A, E-FU9-1)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/solutes.ts` (import, `sidOf` net of the Ca complex),
  `packages/engine-core/src/l2/blood/core.ts` (the `stepSolutes` call: `flowRel`), `packages/engine-core/src/l2/blood/params.ts`
  (`CITRATE_CHARGE`, `CPD`, `ACD_A`, `SAGM_NACL`, the shares, `PRODUCTS` from them, `storedLactate`, `storedComp`),
  `packages/engine-core/src/l2/blood/pipeline.ts` (import, `ALIAS.blood`, the transfusion's `comp`)
- Modify: `packages/engine-core/test/l2/blood/core.test.ts` (**E-FU9-1**: the massive-transfusion `it` split — K ≥ 5.5 stays
  `it`; the chelation-rate iCa rule becomes `it.fails`, main 1.076, FU-9 1.137 vs 1.033)
- Create: `packages/engine-core/test/l2/blood/fu9-citrate.test.ts`, `test/engine/fu9-transfusion.test.ts`
- Overlap: FU-6 (E-FU6-4) inserts `cohbWashout` before `createBloodCore` and a line after `bc.odc.hb = hbOf(fl);`; FU-7
  (E-FU7-4) edits the `createSolutes` line and the sux call; FU-6 adds `hbRef` to `BloodPatient` — none is on this task's
  lines (the `PRODUCTS`/`storedK` rows, `sidOf` and the `stepSolutes` line appear in no other plan).

**Why / measured (main):** research/22 F5 / BF-05a, 05d. Class IV + 4 L ongoing loss + 10 RBC + 10 FFP over 40 min, no
calcium: iCa to the solver's floor 0.30 (citrate 10.7 mmol/L: clearance × (CO/CO₀)² → ≈ 0 in shock), contractility ×
0.14, ARREST at 2430 s; BE −5.6 at lactate 21. Decision D3 (R1: the SID double count, the products' compositions).

**Prototype numbers:** engine test — no arrest, lactate ≥ 4, iCa falls; iCa nadir 0.955 (band 0.6–0.95) and BE nadir
−0.1 (band ≤ −10) → both `it.fails` with those numbers (without the unbalanced rows the units no longer acidify —
D3). Unit: SID per mmol citrate 3 − 2·K_CIT; every product row 0–30 mEq/L; FFP 5.0 mmol citrate per unit, RBC < 0.5;
10 FFP over 40 min → citrate 0.39 mmol/L, iCa 1.06, BE +4.3. **FU-4 check:** the arrest this task removes is BF-05d's
(a citrate artefact); `blood-sanity-haem` (17a, K ≥ 5.5, iCa ≤ 1.12) passes.

- [x] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-citrate.test.ts`:

```ts
// FU-9 Task A3 (F5; R50 ruling R1): citrate is a strong trivalent anion until it is metabolised (Stewart/Fencl; Driscoll
// 1987), counted once net of the Ca it complexes; the blood products are electroneutral rows built from their sourced
// ingredients (CPD, ACD-A, SAGM — params.ts).
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { CITRATE_CHARGE, PRODUCTS, storedComp, type ProductId } from '../../../src/l2/blood/params.ts';
import { concOf, createSolutes, K_CIT, sidOf } from '../../../src/l2/blood/solutes.ts';

const ECF = 14000;
const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };

describe('FU-9 F5: citrate in the strong-ion difference; electroneutral products', () => {
  it('1 mmol/L of free citrate lowers the apparent SID by 3 − 2·K_CIT mEq/L (the complexed Ca keeps its charge)', () => {
    const s = createSolutes({ na: 140, k: 4.2, cl: 104, iCa: 1.2, mg: 0.85, lactate: 1 }, ECF, 42, 28000);
    const c0 = concOf(s, ECF, 42, ECF);
    s.citrate = 14; // 1 mmol/L
    const c1 = concOf(s, ECF, 42, ECF);
    expect(CITRATE_CHARGE).toBe(3);
    expect(sidOf(c0, 1.2) - sidOf(c1, 1.2)).toBeCloseTo(3 - 2 * K_CIT, 9);
  });
  it('every product is electroneutral at 1, 14 and 35 days: SID (Na + K − Cl − 3·citrate − lactate) 0–30 mEq/L (Stage 7c rows: RBC −167, FFP −93)', () => {
    for (const p of Object.keys(PRODUCTS) as ProductId[]) {
      for (const d of [1, 14, 35]) {
        const c = storedComp(p, d);
        const sid = c.na + c.k - c.cl - CITRATE_CHARGE * c.citrate - c.lactate;
        expect(sid).toBeGreaterThanOrEqual(-1e-9);
        expect(sid).toBeLessThanOrEqual(30);
      }
    }
    const perUnit = (p: ProductId) => (storedComp(p, 14).citrate * PRODUCTS[p].ml * (1 - PRODUCTS[p].comp.hct)) / 1000;
    expect(perUnit('ffp')).toBeCloseTo(5.0, 1); // CPD's 19 % share of the plasma at 105 mmol/L
    expect(perUnit('rbc')).toBeLessThan(0.5); // a SAGM unit keeps only its residual plasma's citrate
    expect(storedComp('rbc', 35).k).toBe(35);
    expect(storedComp('rbc', 35).lactate).toBe(40);
  });
  it('10 FFP over 40 min at normal flow: citrate ≈ 0.4 mmol/L, iCa falls, and its metabolism alkalinises (BE up; Driscoll 1987)', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    const u = PRODUCTS.ffp;
    bc.fl.flows.push({ rate: (10 * u.ml) / 40, until: 1e9, leftMl: 10 * u.ml, comp: u.comp });
    for (let k = 0; k < 24000; k++) stepBloodCore(bc, { t: k / 10, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    const cit = bc.so.citrate / ((bc.fl.vp + bc.fl.visf) / 1000);
    console.log(`FU-9 F5: 10 FFP → citrate ${cit.toFixed(2)} mmol/L, iCa ${bc.out.iCa.toFixed(2)}, BE ${bc.ab.be.toFixed(2)} at 40 min`);
    expect(cit).toBeGreaterThan(0.3);
    expect(cit).toBeLessThan(0.6);
    expect(bc.out.iCa).toBeLessThan(1.1);
    expect(bc.ab.be).toBeGreaterThan(2);
  });
});
```

Create `packages/engine-core/test/engine/fu9-transfusion.test.ts`:

```ts
// FU-9 Task A3 (F5): citrate is an anion until it is metabolised and its clearance follows whole-body flow (research/22
// BF-05a, BF-05d). Rig = the BF runner's: GA vent; class IV (2100 mL over 10 min from 60 s), then a further 4 L lost over
// 40 min from 660 s while 10 u RBC (35 d, unwarmed) + 10 u FFP (warmed) run over the same 40 min, no calcium.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, st } from '../helpers/fu9.ts';

describe('FU-9 F5: massive transfusion — the citrate load (Driscoll 1987; Giancarelli 2016; ATLS 10e)', { timeout: 600_000 }, () => {
  const t0 = 660;
  const at = Array.from({ length: (t0 + 3000) / 30 }, (_, k) => 30 * (k + 1));
  let memo: Promise<{ iCa: number; be: number; lact: number; pulseless: boolean }[]> | undefined;
  const rows = () => (memo ??= arm([...GA_VENT,
    [60, ev({ kind: 'bleed', volumeMl: 2100, overS: 600 })],
    [t0, ev({ kind: 'bleed', volumeMl: 4000, overS: 2400 })],
    [t0, ev({ kind: 'transfusion', product: 'rbc', units: 10, overS: 2400, storageDays: 35, warmed: false })],
    [t0, ev({ kind: 'transfusion', product: 'ffp', units: 10, overS: 2400, warmed: true })],
  ], at, (e) => ({ iCa: st(e).blood.out.iCa, be: st(e).blood.core.ab.be, lact: st(e).blood.out.lactate, pulseless: st(e).hemo.circ.arrest !== null })));
  it('no arrest (was asystole at 2430 s: the old rows took iCa to the 0.30 floor), lactate ≥ 4, iCa falls with the FFP citrate', async () => {
    const r = await rows();
    const iCa = Math.min(...r.slice(t0 / 30).map((x) => x.iCa));
    const lact = Math.max(...r.map((x) => x.lact));
    console.log(`FU-9 F5: iCa nadir ${iCa.toFixed(3)}, BE nadir ${Math.min(...r.map((x) => x.be)).toFixed(1)}, lactate peak ${lact.toFixed(1)}, arrest ${r.some((x) => x.pulseless)}`);
    expect(r.some((x) => x.pulseless)).toBe(false);
    expect(lact).toBeGreaterThanOrEqual(4);
    expect(iCa).toBeLessThan(r[t0 / 30 - 1]!.iCa - 0.1);
  });
  // R45 (research/22 BF-05a/05d; R50 ruling R1): with electroneutral, sourced product rows the class IV + MTP picture
  // is BE −0.1 (the dilution of albumin, a weak acid, offsets the shock lactate — the same Stewart offset as the saline
  // cells, Open question 10) and iCa 0.955 (K_CIT, Q46, fitted to the old citrate-rich rows). Ali may overrule (OQ2).
  it.fails('iCa nadir 0.6–0.95 and BE ≤ −10 (ATLS class IV) — measured iCa 0.955, BE −0.1 (FU-9 F5)', async () => {
    const r = await rows();
    expect(Math.min(...r.slice(t0 / 30).map((x) => x.iCa))).toBeLessThanOrEqual(0.95);
    expect(Math.min(...r.map((x) => x.be))).toBeLessThanOrEqual(-10);
  });
});
```

In `packages/engine-core/test/l2/blood/core.test.ts`, find:

```ts
  it('massive transfusion, 10 units of 35-day blood in 30 min against a matched bleed: K ≥ 5.5; iCa −0.1 per unit-per-5-min of rate (tables citrateUnit, Q46)', () => {
    const bc = createBloodCore(MAN, CO0, 40);
    const u = PRODUCTS.rbc;
    bc.fl.flows.push({ rate: (10 * u.ml) / 30, until: 1800, comp: { ...u.comp, k: storedK(35) } }, { rate: (10 * u.ml) / 30, until: 1800, comp: null });
    run(bc, 0, 1800);
    const rule = 1.2 - 0.1 * (10 / 30) * 5; // 1.67 units per 5 min → −0.17 (the rule read as a steady-state RATE effect [ENG])
    console.log(`core massive: K ${bc.out.k.toFixed(2)} iCa ${bc.out.iCa.toFixed(3)} (rule ${rule.toFixed(3)})`);
    expect(bc.out.k).toBeGreaterThanOrEqual(5.5);
    expect(Math.abs(bc.out.iCa - rule)).toBeLessThanOrEqual(0.05);
  });
```

replace with:

```ts
  const massive = () => {
    const bc = createBloodCore(MAN, CO0, 40);
    const u = PRODUCTS.rbc;
    bc.fl.flows.push({ rate: (10 * u.ml) / 30, until: 1800, comp: { ...u.comp, k: storedK(35) } }, { rate: (10 * u.ml) / 30, until: 1800, comp: null });
    run(bc, 0, 1800);
    return bc;
  };
  const rule = 1.2 - 0.1 * (10 / 30) * 5; // 1.67 units per 5 min → −0.17 (the rule read as a steady-state RATE effect [ENG])
  it('massive transfusion, 10 units of 35-day blood in 30 min against a matched bleed: K ≥ 5.5 (tables kUnit)', () => {
    const bc = massive();
    console.log(`core massive: K ${bc.out.k.toFixed(2)} iCa ${bc.out.iCa.toFixed(3)} (rule ${rule.toFixed(3)})`);
    expect(bc.out.k).toBeGreaterThanOrEqual(5.5);
  });
  // R45 (FU-9 F5, E-FU9-1; R50 ruling R1): the rule (tables citrateUnit, Q46) was fitted to a row that put 15.6 mmol of
  // citrate in every RBC unit; a SAGM unit keeps ≈ 0.24 mmol (its residual CPD-plasma — params.ts), so 10 RBC units no
  // longer chelate what the rule assumed. Main: 1.076 (margin 0.007); FU-9: 1.137. The chelation term itself is pinned in
  // fu9-citrate.test.ts; massive-transfusion hypocalcaemia is carried by FFP/platelets (fu9-transfusion).
  it.fails('massive transfusion: iCa −0.1 per unit-per-5-min of rate (tables citrateUnit, Q46) — measured 1.137 vs 1.033 (FU-9 F5; main 1.076)', () => {
    expect(Math.abs(massive().out.iCa - rule)).toBeLessThanOrEqual(0.05);
  });
```


- [x] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-citrate.test.ts test/l2/blood/core.test.ts test/engine/fu9-transfusion.test.ts`
  → `CITRATE_CHARGE` missing; in `core.test.ts` the new `it.fails` is RED before Step 3 because on main the rule still
  holds (1.076, margin 0.007) — pre-declared; the engine test reads iCa 0.30 and an arrest.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/solutes.ts`, find:

```ts
import { MG_ION_FRAC, NORMAL, OSM0, type Composition } from './params.ts';
```

replace with:

```ts
import { CITRATE_CHARGE, MG_ION_FRAC, NORMAL, OSM0, type Composition } from './params.ts';
```

find:

```ts
/** Apparent SID (mEq/L): Na + K + 2·iCa + 2·Mg_ion − Cl − lactate − keto − metab − XA (tables §5b.1 "Stewart-lite"). */
export function sidOf(c: Conc, iCa: number): number {
  return c.na + c.k + 2 * iCa + 2 * MG_ION_FRAC * c.mg - c.cl - c.lactate - c.keto - c.metab - c.xa;
}
```

replace with:

```ts
/**
 * Apparent SID (mEq/L): Na + K + 2·iCa + 2·Mg_ion − Cl − lactate − keto − metab − (3 − 2·K_CIT)·citrate − XA (tables
 * §5b.1 "Stewart-lite"). FU-9 F5: citrate is a strong trivalent anion until it is metabolised (Stewart/Fencl; Driscoll
 * 1987), so a transfused unit's sodium does not alkalinise at once — its metabolism turns it into bicarbonate later. The
 * Ca it complexes (K_CIT per mmol, removed from iCa by `ionisedCa`) keeps its charge in the complex: counted once.
 */
export function sidOf(c: Conc, iCa: number): number {
  return c.na + c.k + 2 * iCa + 2 * MG_ION_FRAC * c.mg - c.cl - c.lactate - c.keto - c.metab - (CITRATE_CHARGE - 2 * K_CIT) * c.citrate - c.xa;
}
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  stepSolutes(so, ecfMl(fl), dtS, kSet, hbfRel * bc.liver, 1 + K_PUMP_GAIN * Math.abs(drug)); // flow × function, each once
```

replace with:

```ts
  // FU-9 F5: citrate and acetate are metabolised by the liver AND by muscle/kidney (Kramer 2003 Crit Care Med 31:2450),
  // so their clearance follows whole-body flow (CO/CO0), not the splanchnic (CO/CO0)² that lactate's hepatic uptake uses
  const flowRel = Math.min(1.5, Math.max(0, x.coLpm / bc.co0));
  stepSolutes(so, ecfMl(fl), dtS, kSet, flowRel * bc.liver, 1 + K_PUMP_GAIN * Math.abs(drug)); // flow × function, each once
```

In `packages/engine-core/src/l2/blood/params.ts`, find:

```ts
/** Blood products per UNIT (tables §5b.4): volume mL and contents. Citrate ≈ 3 g (15.6 mmol) per unit [TXT, Q46]. */
export const PRODUCTS = {
  rbc: { ml: 280, comp: { ...Z, na: 150, cl: 150, hct: 0.6, citrate: 15.6 / 0.28 } },
  ffp: { ml: 250, comp: { ...Z, na: 165, k: 4, cl: 75, albGL: 40, citrate: 15.6 / 0.25 } },
  platelets: { ml: 250, comp: { ...Z, na: 150, cl: 100, albGL: 40, citrate: 8 / 0.25 } },
  wholeBlood: { ml: 500, comp: { ...Z, na: 150, k: 4, cl: 100, albGL: 40, hct: 0.4, citrate: 15.6 / 0.5 } },
```

replace with:

```ts
/** FU-9 F5: citrate³⁻ is a strong anion until it is metabolised; `sidOf` (solutes.ts) counts it once, net of the Ca it complexes. */
export const CITRATE_CHARGE = 3;
/**
 * FU-9 F5 (R1): the blood products are ELECTRONEUTRAL, built from their sourced ingredients instead of the unbalanced
 * Stage 7c rows (RBC Na 150 / Cl 150 / citrate 55.7 mmol/L gave an apparent SID of −167 mEq/L):
 * - CPD (D'Amici GM et al. Blood Transfus 2012;10 Suppl 2:s46–54, Table I): per litre trisodium citrate 89.4 mmol
 *   (2.630 g/100 mL dihydrate), citric acid 15.6 mmol (0.327 g/100 mL monohydrate), NaH2PO4 16.1 mmol [TXT];
 * - ACD-A (US formula A, AABB Technical Manual): trisodium citrate 74.8 mmol, citric acid 38.0 mmol per litre [TXT];
 * - SAGM (D'Amici 2012 Table I): NaCl 0.877 g/100 mL = 150 mmol/L, no buffer [TXT];
 * - 63 mL CPD per 450 mL whole blood (AABB Technical Manual), so CPD is 19 % of a unit's non-cell volume at Hct 0.40;
 *   apheresis plasma/platelets carry ACD-A at 1:10 [TXT: device labels 1:9–1:12]; a SAGM red-cell unit's supernatant is
 *   100 mL SAGM plus ≈ 12 mL residual CPD-plasma (Council of Europe Guide: residual plasma 10–20 mL) [TXT].
 * The anticoagulant's citric acid titrates the plasma bicarbonate, so each row's SID (Na + K − Cl − 3·citrate) is what
 * is left for bicarbonate and the weak acids: FFP ≈ 27, platelets ≈ 25, the SAGM supernatant ≈ 5 mEq/L.
 */
export const CPD = { na: 3 * 89.4 + 16.1, citrate: 89.4 + 15.6 } as const;
export const ACD_A = { na: 3 * 74.8, citrate: 74.8 + 38.0 } as const;
export const CPD_SHARE = 63 / (63 + 450 * 0.6);
export const ACD_SHARE = 0.1;
export const SAGM_NACL = 150;
export const RBC_RESIDUAL_SHARE = 12 / 112;
function anticoagulated(anti: { na: number; citrate: number }, share: number): Composition {
  const p = 1 - share;
  return { ...Z, na: p * NORMAL.na + share * anti.na, k: p * NORMAL.k, cl: p * NORMAL.cl, albGL: p * NORMAL.albGL, citrate: share * anti.citrate };
}
const CPD_PLASMA = anticoagulated(CPD, CPD_SHARE);
const mix = (a: Composition, b: Composition, fb: number): Composition => {
  const out = { ...a };
  for (const k of Object.keys(a) as (keyof Composition)[]) out[k] = (1 - fb) * a[k] + fb * b[k];
  return out;
};
/** Blood products per UNIT (tables §5b.4): volume mL and the non-cell volume's contents (fresh; `storedComp` ages them). */
export const PRODUCTS = {
  rbc: { ml: 280, comp: { ...mix({ ...Z, na: SAGM_NACL, cl: SAGM_NACL }, CPD_PLASMA, RBC_RESIDUAL_SHARE), hct: 0.6 } },
  ffp: { ml: 250, comp: CPD_PLASMA },
  platelets: { ml: 250, comp: anticoagulated(ACD_A, ACD_SHARE) },
  wholeBlood: { ml: 500, comp: { ...CPD_PLASMA, hct: 0.4 } },
```

find:

```ts
export const storedK = (days: number): number => Math.min(50, Math.max(1, days));
```

replace with:

```ts
export const storedK = (days: number): number => Math.min(50, Math.max(1, days));
/** Supernatant lactate ≈ 1.4 mmol/L per storage day (Sümpelmann R et al. Paediatr Anaesth 2001;11:169–73: 9.4 ± 4 at a
 *  mean 6.7 days in 100 units) [TXT], capped at 40 [ENG]. */
export const storedLactate = (days: number): number => Math.min(40, 1.4 * Math.max(0, days));
/**
 * FU-9 F5 (R1): a cellular product after `days` of storage. K leaks out for Na (the cold-inhibited pump: an
 * electroneutral exchange); lactic acid accumulates — its H+ is buffered by the unit's bicarbonate and the cells, so the
 * supernatant's SID falls by the lactate until the bicarbonate is spent (Sümpelmann 2001: pH 6.79, HCO3 11 at 6.7 days),
 * after which Cl⁻ moves into the cells (the chloride shift). The recipient receives the lactate as a metabolisable anion.
 */
export function storedComp(product: ProductId, days: number): Composition {
  const c: Composition = PRODUCTS[product].comp;
  if (c.hct === 0) return c;
  const k = storedK(days);
  const na = c.na - (k - c.k);
  const lactate = storedLactate(days);
  const sid0 = c.na + c.k - c.cl - CITRATE_CHARGE * c.citrate;
  const sid = Math.max(0, sid0 - lactate);
  return { ...c, na, k, lactate, cl: na + k - lactate - CITRATE_CHARGE * c.citrate - sid };
}
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
import { BLOOD_DT_S, COLD_UNIT_C, FLUIDS, hypertonicSaline, MG_MMOL_PER_G, NORMAL, PRODUCTS, SIGMA_PROTEIN, storedK, type Composition, type FluidId, type ProductId } from './params.ts';
```

replace with:

```ts
import { BLOOD_DT_S, COLD_UNIT_C, FLUIDS, hypertonicSaline, MG_MMOL_PER_G, NORMAL, PRODUCTS, SIGMA_PROTEIN, storedComp, type Composition, type FluidId, type ProductId } from './params.ts';
```

find:

```ts
const ALIAS: Record<string, Composition> = { crystalloid: FLUIDS.saline, colloid: FLUIDS.gelatin, blood: { ...PRODUCTS.wholeBlood.comp, k: storedK(14) } };
```

replace with:

```ts
const ALIAS: Record<string, Composition> = { crystalloid: FLUIDS.saline, colloid: FLUIDS.gelatin, blood: storedComp('wholeBlood', 14) };
```

find:

```ts
      const comp = { ...p.comp, k: p.comp.hct > 0 ? storedK(x.storageDays ?? 14) : p.comp.k };
```

replace with:

```ts
      const comp = storedComp(x.product, x.storageDays ?? 14); // FU-9 F5 (R1): the aged, electroneutral unit
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/engine/fu9-transfusion.test.ts test/engine/blood-sanity-haem.test.ts
  test/engine/blood-sanity-acid.test.ts test/engine/blood-hyperk.test.ts` → pass.
- [x] **Step 5 — BF runner:** `BF-05 BF-01 BF-13 BF-14` (A0 Step 3's command, `BF_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "fix(7c): citrate in the SID net of its Ca complex; electroneutral sourced blood products (FU-9 F5, E-FU9-1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A4: F4 — septic capillary leak reaches the lung water (7e `writeBlood` → 7c σ; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/fluids.ts` (`SIGMA_LEAK_FLOOR`, `leakSigma`), `packages/engine-core/src/l2/endo/adapters.ts`
  (the `leakSigma` import, `BloodLike.core.fl.sigma`, `writeBlood`'s comment and one line)
- Create: `packages/engine-core/test/l2/blood/fu9-leak.test.ts`, `test/engine/fu9-leak.test.ts`
- Overlap: FU-7 (E-FU7-2) edits `adapters.ts`'s `writeCirc` and `readEndoInputs` only; FU-8 does not touch `l2/endo/**`
  in Part A. Merge origin/main first if FU-7 has landed (Global Constraints).

**Why / measured (main):** research/22 F4 / BF-20a. Warm septic shock (`kfMult` 2.6), 30 mL/kg saline: extra EVLWI 0 vs
+3.34 mL/kg in a healthy patient. 7e wrote kfMult but never σ. Decision D4 (the linear scaling is [ENG]; it applies to
anaphylaxis and burns too).

**Prototype numbers:** engine test σ 0.70 at kfMult 3.0; ΔEVLWI 0 → +0.87 mL/kg (healthy +1.85); the §5 acceptance "more than healthy
and PaO₂ ↓" is not met (+0.87 vs +1.85 mL/kg; PaO₂ +11 vs +5) → `it.fails` with those numbers (PaO₂ +12 in sepsis vs +6 healthy on the review's
re-measure of the first draft — R50 F11; Open question 3). **FU-4 check:** see D13.

- [x] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-leak.test.ts`:

```ts
// FU-9 Task A4 (F4): the capillary leak 7e writes also lowers the protein reflection coefficient (two-pore theory).
import { describe, expect, it } from 'vitest';
import { leakSigma, SIGMA_LEAK_FLOOR } from '../../../src/l2/blood/fluids.ts';
import { SIGMA_PROTEIN } from '../../../src/l2/blood/params.ts';
import { writeBlood } from '../../../src/l2/endo/adapters.ts';
import { createEndoState } from '../../../src/l2/endo/pipeline.ts';
import { lungWaterStep } from '../../../src/l2/blood/circ-adapter.ts';

describe('FU-9 F4: septic leak → σ → lung water (Rippe & Haraldsson 1994; Sakka 2002)', () => {
  it('leakSigma: 0.9 at kfMult 1, 0.74 at 2.6, 0.7 at 3, floor 0.3', () => {
    expect(leakSigma(1)).toBeCloseTo(SIGMA_PROTEIN, 9);
    expect(leakSigma(2.6)).toBeCloseTo(0.74, 9);
    expect(leakSigma(3)).toBeCloseTo(0.7, 9);
    expect(leakSigma(10)).toBe(SIGMA_LEAK_FLOOR);
  });
  it('7e writes σ with kfMult, only when kfMult changes', () => {
    const es = createEndoState(undefined, 70);
    const ps = { blood: { core: { fl: { kfMult: 1, sigma: SIGMA_PROTEIN } } as Record<string, unknown> } };
    es.core.out = { ...es.core.out, kfMult: 3 };
    writeBlood(ps, es);
    expect((ps.blood.core.fl as { sigma: number }).sigma).toBeCloseTo(0.7, 9);
  });
  it('at PAWP 16 and COP 22 a normal lung makes no water (threshold 20); the septic σ (kfMult 3: threshold 15.1) does', () => {
    let n = 0;
    let s = 0;
    for (let k = 0; k < 36000; k++) {
      n = lungWaterStep(n, 16, 22, 1, 1, 0.1);
      s = lungWaterStep(s, 16, 22, 3, leakSigma(3) / SIGMA_PROTEIN, 0.1);
    }
    expect(n).toBe(0);
    expect(s).toBeGreaterThan(0);
  });
});
```

Create `packages/engine-core/test/engine/fu9-leak.test.ts`:

```ts
// FU-9 Task A4 (F4): septic capillary leak reaches the lung water (research/22 BF-20a). Rig = the BF runner's GA vent;
// 7e warm septic shock (`condition sepsis 1 warm`) at 60 s; 0.9 % saline 30 mL/kg (2100 mL) over 30 min at 1260 s; read
// 60 min after the end (4860 s) against the same sepsis without the fluid.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, once, st, type Step } from '../helpers/fu9.ts';

const SEPSIS: Step = [60, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm' })];
const LOAD: Step = [1260, ev({ kind: 'fluid', fluid: 'saline', volumeMl: 2100, overS: 1800 })];
const read = (e: Parameters<typeof st>[0]) => ({ evlwi: st(e).blood.lung.evlwi, pao2: st(e).resp.o2.pao2, sigma: st(e).blood.core.fl.sigma, kf: st(e).blood.core.fl.kfMult });
const septic = once(async () => ({ i: (await arm([...GA_VENT, SEPSIS, LOAD], [4860], read))[0], c: (await arm([...GA_VENT, SEPSIS], [4860], read))[0] })); // R50 F10

describe('FU-9 F4: a septic leak makes lung water at a normal PAWP (Sakka 2002; two-pore theory)', { timeout: 600_000 }, () => {
  it('warm septic shock: σ falls with the leak (σ < 0.8) and 30 mL/kg raises extra EVLWI > 0.25 mL/kg (was 0.0)', async () => {
    const { i, c } = await septic();
    if (!i || !c) throw new Error('no sample');
    console.log(`FU-9 F4: kfMult ${c.kf.toFixed(2)}, σ ${c.sigma.toFixed(2)}, ΔEVLWI ${(i.evlwi - c.evlwi).toFixed(2)} mL/kg, ΔPaO2 ${(i.pao2 - c.pao2).toFixed(0)}`);
    expect(c.sigma).toBeLessThan(0.8);
    expect(i.evlwi - c.evlwi).toBeGreaterThan(0.25);
  });
  // R45 (research/22 §5 acceptance for 7e → 7c: "EVLWI ↑ and PaO2 ↓ more than healthy"): the septic lung makes water now,
  // but less than the healthy lung under the same load (0.87 vs 1.85 mL/kg: the vasodilated septic patient's PAWP stays
  // lower, and σ 0.70 still leaves a threshold of ≈ 15 mmHg), and PaO2 still RISES +11 (7b's lung-water → shunt coupling,
  // F13a, is weak and the load raises CO/SvO2). Kept visible for Ali (Open question 3: the septic σ).
  it.fails('warm septic shock + 30 mL/kg: extra EVLWI more than healthy and PaO2 falls — measured +0.87 vs +1.85 mL/kg, PaO2 +11 (FU-9 F4)', async () => {
    const { i, c } = await septic();
    const [hi] = await arm([...GA_VENT, LOAD], [4860], read);
    const [hc] = await arm(GA_VENT, [4860], read);
    if (!i || !c || !hi || !hc) throw new Error('no sample');
    console.log(`FU-9 F4 vs healthy: ΔEVLWI ${(i.evlwi - c.evlwi).toFixed(2)} vs ${(hi.evlwi - hc.evlwi).toFixed(2)} mL/kg, ΔPaO2 ${(i.pao2 - c.pao2).toFixed(0)} vs ${(hi.pao2 - hc.pao2).toFixed(0)}`);
    expect(i.evlwi - c.evlwi).toBeGreaterThan(hi.evlwi - hc.evlwi);
    expect(i.pao2 - c.pao2).toBeLessThan(-5);
  });
});
```


- [x] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-leak.test.ts test/engine/fu9-leak.test.ts` → `leakSigma` missing;
  engine: σ stays 0.9, ΔEVLWI 0.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/fluids.ts`, find:

```ts
/** Plasma ↔ interstitium exchange J (mL/min, positive = filtration out of plasma) and extra lymph (mL/min). */
```

replace with:

```ts
/**
 * FU-9 F4: the protein reflection coefficient of a leaky endothelium. Inflammation opens LARGE pores, which carry most of
 * the extra hydraulic conductance and most of the protein flux (two-pore theory, the DIRECTION: Rippe & Haraldsson 1994
 * Physiol Rev 74:163). That the non-reflected share (1 − σ) grows with the same factor as the whole Kf is an assumption
 * [ENG]: σ = 1 − (1 − σ0)·kfMult, floor SIGMA_LEAK_FLOOR [ENG]. Normal (kfMult 1) → 0.9; warm septic shock (kfMult 2.6)
 * → 0.74; kfMult 3 → 0.7. It applies to every writer of `fl.kfMult` — 7e's sepsis, anaphylaxis and burns alike.
 */
export const SIGMA_LEAK_FLOOR = 0.3;
export function leakSigma(kfMult: number): number {
  return Math.max(SIGMA_LEAK_FLOOR, 1 - (1 - SIGMA_PROTEIN) * Math.max(1, kfMult));
}

/** Plasma ↔ interstitium exchange J (mL/min, positive = filtration out of plasma) and extra lymph (mL/min). */
```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
import type { Modifiers } from '../../types.ts';
import { betaBlunt } from '../pk/pd.ts';
```

replace with:

```ts
import type { Modifiers } from '../../types.ts';
import { leakSigma } from '../blood/fluids.ts'; // FU-9 F4
import { betaBlunt } from '../pk/pd.ts';
```

find:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; endoKShift?: number; endoGlucoseMgDl?: number };
```

replace with:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number; sigma?: number }; endoKShift?: number; endoGlucoseMgDl?: number };
```

find:

```ts
 * only when 7e's value changes, so a resting 7e never overwrites another writer). `fl.sigma` is left to 7c: the
 * tables give no septic/anaphylactic σ, and 7c's Starling form scales only pressure-driven filtration (gap, Requests).
 * False without 7c.
```

replace with:

```ts
 * only when 7e's value changes, so a resting 7e never overwrites another writer) and, with it, the protein reflection
 * coefficient `fl.sigma` = 7c's `leakSigma(kfMult)` (FU-9 F4: a leak without a high pulmonary venous pressure now makes
 * lung water). False without 7c.
```

find:

```ts
    c.fl.kfMult = o.kfMult;
    es.kfMult = o.kfMult;
```

replace with:

```ts
    c.fl.kfMult = o.kfMult;
    c.fl.sigma = leakSigma(o.kfMult); // FU-9 F4: the same leak lowers the protein reflection coefficient (lung water, Starling)
    es.kfMult = o.kfMult;
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/endo test/engine/fu9-leak.test.ts test/engine/endo-circ-acceptance.test.ts
  test/engine/endo-acceptance.test.ts` → pass.
- [x] **Step 5 — BF runner:** `BF-20a BF-20b` (A0 Step 3's command, `BF_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7e,7c): a capillary leak lowers the protein reflection coefficient with Kf — septic lung water (FU-9 F4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A5: F8 — COP by the scaled Nitta form (albumin and globulins); a profile albumin shows its anion gap (7c; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/fluids.ts` (header, import, `FluidState.globG`, `copPlasma` and `COP_SCALE`,
  `createFluids`, the bleed and infusion lines), `packages/engine-core/src/l2/blood/params.ts` (`Composition.globGL`, `Z`,
  `GLOBULIN_GL`, the plasma share of `anticoagulated`), `packages/engine-core/src/l2/blood/core.ts` (the calibration block)
- Create: `packages/engine-core/test/l2/blood/fu9-albumin.test.ts`
- Overlap: FU-7 (E-FU7-4) edits the `createSolutes` line two lines above this task's `core.ts` block; FU-6 edits
  `params.ts` (`hbRef` on `BloodPatient`) and `core.ts` before the function — other hunks.

**Why / measured (main):** research/22 F8 / BF-22a/b and research/19 CM-10c. Albumin 20: COP 8.66 (total protein taken
as 1.6 × albumin), oedema threshold PAWP 6.7; a PROFILE albumin 20 left AG −0.16 while the same albumin reached by
dilution lowers it ≈ 4. Decision D5 (R2: scaled Nitta; R50 F8: the calibration branch on the profile's fields).

**Prototype numbers:** COP at albumin 40 22.35 (unchanged), 30 16.7, 25 14.1, 20 **11.7** (band 11–17); 5 % albumin
25.2 (iso-oncotic, > 0.95 × 22.35); profile albumin 20: AG −4.9 (band −6.5 to −3.5). **FU-4 check:** every
normal-albumin patient is bit-identical.

- [x] **Step 1 — the test.**

Create `packages/engine-core/test/l2/blood/fu9-albumin.test.ts`:

```ts
// FU-9 Task A5 (F8; R50 ruling R2): COP from albumin AND globulins (scaled Nitta); a profile albumin keeps its weak-acid
// deficit (Figge).
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { copPlasma, createFluids } from '../../../src/l2/blood/fluids.ts';
import { bloodPatient, GLOBULIN_GL } from '../../../src/l2/blood/params.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const step = (bc: ReturnType<typeof createBloodCore>) => stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);

describe('FU-9 F8: hypoalbuminaemia (Weil 1979; Figge 1998; Fencl 2000)', () => {
  it('COP (scaled Nitta): 22.35 at albumin 40 (unchanged), 11–17 at albumin 20 (was 8.7), 14.1 at 25 (CM-10c, was 11.5); 5 % albumin iso-oncotic', () => {
    const p = bloodPatient(MAN);
    expect(GLOBULIN_GL).toBe(24);
    expect(copPlasma(createFluids(p, 40))).toBeCloseTo(22.35, 2);
    const five = createFluids(p, 40);
    five.albG = (50 * five.vp) / 1000; // 5 % albumin: 50 g/L, no globulins
    five.globG = 0;
    expect(copPlasma(five)).toBeGreaterThan(0.95 * 22.35); // measured 25.2 (Landis on total protein gave 15.6)
    const c20 = copPlasma(createFluids(p, 20));
    const c25 = copPlasma(createFluids(p, 25));
    console.log(`FU-9 F8 COP: albumin 20 → ${c20.toFixed(1)}, 25 → ${c25.toFixed(1)}`);
    expect(c20).toBeGreaterThanOrEqual(11);
    expect(c20).toBeLessThanOrEqual(17);
    expect(c25).toBeGreaterThan(c20);
  });
  it('profile albumin 20 g/L without a profile HCO3: AG 3.5–6.5 lower than normal and BE > 0 (the dilution picture); with a profile HCO3 it is honoured', () => {
    const n = createBloodCore(MAN, 5.25, 40);
    const a = createBloodCore({ ...MAN, blood: { albuminGL: 20 } }, 5.25, 40);
    const h = createBloodCore({ ...MAN, blood: { albuminGL: 20, hco3: 24.4 } }, 5.25, 40);
    for (const bc of [n, a, h]) step(bc);
    console.log(`FU-9 F8 AG: normal ${n.out.ag.toFixed(1)}, albumin 20 ${a.out.ag.toFixed(1)} (BE ${a.ab.be.toFixed(1)}), with HCO3 24.4 → ${h.ab.hco3.toFixed(1)}`);
    expect(n.out.ag - a.out.ag).toBeGreaterThanOrEqual(3.5);
    expect(n.out.ag - a.out.ag).toBeLessThanOrEqual(6.5);
    expect(a.ab.be).toBeGreaterThan(0);
    expect(h.ab.hco3).toBeCloseTo(24.4, 1);
    expect(a.out.k).toBeCloseTo(4.2, 2); // the K reference is the patient's own resting pH
  });
});
```


- [x] **Step 2 — run; it fails.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-albumin.test.ts` → `GLOBULIN_GL` missing (COP 8.7 at albumin 20).
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/fluids.ts`, find:

```ts
//   πp = Landis–Pappenheimer(TP), TP = 1.6·(albumin + colloid) g/dL   Pisf = ΔVisf/(C·Visf0)   πisf = πisf0·Visf0/Visf
```

replace with:

```ts
//   πp = scaled Nitta(albumin + colloid, globulins) (FU-9 F8)   Pisf = ΔVisf/(C·Visf0)   πisf = πisf0·Visf0/Visf
```

find:

```ts
import { ALB_RESTORE_TAU_MIN, CISF_PER_ML, COLLOID_T12_MIN, K_EL_AWAKE, K_EL_GA_FACTOR, KF_ML_MIN_MMHG, LYMPH_GAIN, MCHC_G_PER_ML, OSM_TAU_MIN, PC_PER_ML, PI_ISF0, SIGMA_PROTEIN, type BloodPatient, type Composition } from './params.ts';
```

replace with:

```ts
import { ALB_RESTORE_TAU_MIN, CISF_PER_ML, COLLOID_T12_MIN, GLOBULIN_GL, K_EL_AWAKE, K_EL_GA_FACTOR, KF_ML_MIN_MMHG, LYMPH_GAIN, MCHC_G_PER_ML, OSM_TAU_MIN, PC_PER_ML, PI_ISF0, SIGMA_PROTEIN, type BloodPatient, type Composition } from './params.ts';
```

find:

```ts
  albG: number; // plasma albumin mass
```

replace with:

```ts
  albG: number; // plasma albumin mass
  globG: number; // plasma globulin mass (g) — FU-9 F8: constant unless bled or given, so it dilutes but never follows albumin
```

find:

```ts
/** Plasma colloid osmotic pressure (mmHg): TP (g/dL) = 1.6·(albumin + colloid) (annex B1: total protein = 1.6·albumin). */
export function copPlasma(f: FluidState): number {
  return landis((1.6 * 100 * (f.albG + f.colloidG)) / f.vp);
}
```

replace with:

```ts
/**
 * Plasma colloid osmotic pressure (mmHg). FU-9 F8 (R50 ruling R2): albumin and globulins each by their own polynomial
 * (Nitta S et al. Tohoku J Exp Med 1981;135:43–9: albumin 2.8C + 0.18C² + 0.012C³, globulin 0.9C + 0.12C² + 0.004C³,
 * C in g/dL), scaled by COP_SCALE so that the tables' normal plasma (albumin 40, globulins 24 g/L: Landis–Pappenheimer at
 * TP 6.4 = 22.35 mmHg; the globulin mass is GLOBULIN_GL, params.ts) is exactly unchanged. Albumin then carries ≈ 80 % of the COP: hypoalbuminaemia keeps the
 * globulins' share (albumin 20 → 11.7 mmHg; Weil 1979: 12–16) and 5 % albumin is iso-oncotic (≈ 25 mmHg). Synthetic
 * colloid counts as albumin-equivalent grams (Stage 7c's convention).
 */
const nittaAlb = (c: number): number => 2.8 * c + 0.18 * c ** 2 + 0.012 * c ** 3;
const nittaGlob = (c: number): number => 0.9 * c + 0.12 * c ** 2 + 0.004 * c ** 3;
export const COP_SCALE = landis(6.4) / (nittaAlb(4) + nittaGlob(2.4));
export function copPlasma(f: FluidState): number {
  return COP_SCALE * (nittaAlb((100 * (f.albG + f.colloidG)) / f.vp) + nittaGlob((100 * f.globG) / f.vp)); // g/dL
}
```

find:

```ts
    vp: p.plasmaMl, visf: p.isfMl, vicf: p.icfMl, hbG: (p.hb * p.bvMl) / 100, albG, colloidG: 0,
```

replace with:

```ts
    vp: p.plasmaMl, visf: p.isfMl, vicf: p.icfMl, hbG: (p.hb * p.bvMl) / 100, albG, globG: (GLOBULIN_GL * p.plasmaMl) / 1000, colloidG: 0,
```

find:

```ts
      f.albG -= (f.albG / f.vp) * out * (1 - hct);
```

replace with:

```ts
      f.albG -= (f.albG / f.vp) * out * (1 - hct);
      f.globG -= (f.globG / f.vp) * out * (1 - hct);
```

find:

```ts
      f.albG += (c.albGL * ml * (1 - c.hct)) / 1000;
```

replace with:

```ts
      f.albG += (c.albGL * ml * (1 - c.hct)) / 1000;
      f.globG += (c.globGL * ml * (1 - c.hct)) / 1000;
```

In `packages/engine-core/src/l2/blood/params.ts`, find:

```ts
  albGL: number; // true albumin g/L (oncotic AND acid–base)
```

replace with:

```ts
  albGL: number; // true albumin g/L (oncotic AND acid–base)
  globGL: number; // globulins g/L (oncotic only; plasma products carry the plasma's) — FU-9 F8
```

find:

```ts
const Z: Composition = { na: 0, k: 0, cl: 0, ca: 0, mg: 0, lactate: 0, metab: 0, xa: 0, albGL: 0, colloidGL: 0, osmOther: 0, hct: 0, citrate: 0 };
```

replace with:

```ts
const Z: Composition = { na: 0, k: 0, cl: 0, ca: 0, mg: 0, lactate: 0, metab: 0, xa: 0, albGL: 0, globGL: 0, colloidGL: 0, osmOther: 0, hct: 0, citrate: 0 };
```

find:

```ts
/** Ionised share of total Mg for the SID (≈ 0.6 of 0.85 mmol/L) [TXT]. */
```

replace with:

```ts
/** FU-9 F8: plasma globulins at the normal albumin, g/L — their own mass (fluids.ts `copPlasma`), carried by plasma products. */
export const GLOBULIN_GL = 24;
/** Ionised share of total Mg for the SID (≈ 0.6 of 0.85 mmol/L) [TXT]. */
```

find:

```ts
  return { ...Z, na: p * NORMAL.na + share * anti.na, k: p * NORMAL.k, cl: p * NORMAL.cl, albGL: p * NORMAL.albGL, citrate: share * anti.citrate };
```

replace with:

```ts
  return { ...Z, na: p * NORMAL.na + share * anti.na, k: p * NORMAL.k, cl: p * NORMAL.cl, albGL: p * NORMAL.albGL, globGL: p * GLOBULIN_GL, citrate: share * anti.citrate };
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  // calibrate the unmeasured anions so the profile's HCO3 (default 24.4) holds at PaCO2 40 (tables §5b.1 normal row)
  const hco3 = b.hco3 ?? NORMAL.hco3;
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));
  const c = concOf(so, e0, pat.vLacL, e0);
  const alb = albGL(fl);
  const sidNeed = hco3 + alb * (0.123 * ph0 - 0.631) + c.pi * (0.309 * ph0 - 0.469) + ((1.43 * pat.hb) / 3) * (ph0 - 7.4);
  calibrateXa(so, e0, sidOf(c, ionisedCa(c, ph0)), sidNeed);
  so.set.ph = ph0;
  return {
    pat, fl, so, ab: solvePh(paco2, { sid: sidNeed, albGL: alb, piMmolL: c.pi, hb: pat.hb }), phNonOrg: ph0,
```

replace with:

```ts
  // calibrate the unmeasured anions so the profile's HCO3 (default 24.4) holds at PaCO2 40 (tables §5b.1 normal row).
  // FU-9 F8: without a profile HCO3 the calibration uses the NORMAL albumin, so a profile hypoalbuminaemia keeps its
  // weak-acid deficit — the Figge picture (low AG, mild alkalosis) that the same albumin reached by dilution shows
  // (Figge 1998 Crit Care Med 26:1807; Fencl 2000 AJRCCM 162:2246); a given profile HCO3 is honoured as measured.
  const hco3 = b.hco3 ?? NORMAL.hco3;
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));
  const c = concOf(so, e0, pat.vLacL, e0);
  const alb = albGL(fl);
  const albCal = b.hco3 === undefined && b.albuminGL !== undefined ? NORMAL.albGL : alb; // on the profile's fields, not floats (R50 F8)
  const sidNeed = hco3 + albCal * (0.123 * ph0 - 0.631) + c.pi * (0.309 * ph0 - 0.469) + ((1.43 * pat.hb) / 3) * (ph0 - 7.4);
  calibrateXa(so, e0, sidOf(c, ionisedCa(c, ph0)), sidNeed);
  const ab = solvePh(paco2, { sid: sidNeed, albGL: alb, piMmolL: c.pi, hb: pat.hb });
  so.set.ph = albCal === alb ? ph0 : ab.ph; // the K reference is the patient's own resting pH
  return {
    pat, fl, so, ab, phNonOrg: so.set.ph,
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/organs test/engine/blood-sanity-acid.test.ts` → pass (`fluids.test.ts`'s
  22.4 at the normal albumin holds).
- [x] **Step 5 — BF runner:** `BF-22 BF-03 BF-18 BF-19 BF-21` (A0 Step 3's command, `BF_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "fix(7c): COP by the scaled Nitta form; a profile albumin keeps its weak-acid deficit (FU-9 F8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A6: F6 — renal K⁺ excretion follows plasma K⁺ and the loop diuretic's flow; the cellular pool is finite (7d + 7c; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/organs/pipeline.ts` (`renalSeam`'s `kRel` and K, its call),
  `packages/engine-core/src/l2/organs/inputs.ts` (`BloodLike.core` gains `so.set.k` and `out.k`),
  `packages/engine-core/src/l2/blood/solutes.ts` (`set.kIcf`, `K_TBK_MMOL`), `packages/engine-core/src/l2/blood/core.ts`
  (the import, `kSet`)
- Create: `packages/engine-core/test/l2/blood/fu9-potassium.test.ts`, `test/engine/fu9-potassium.test.ts`
- Overlap: none (FU-7's `blood/core.ts` blocks are the `createSolutes` line and the sux call).

**Why / measured (main):** research/22 F6 / BF-08d. Furosemide 40 mg at a profile K 7.5: urine +159 mL/h, K −0.002 at
3 h — the seam excreted a fixed 50 mmol/L, and 7c's cells refilled the ECF from an unlimited store. Decision D6 (with
R50 F7: what the profile-K reference does; R8: Open question 5).

**Prototype numbers:** furosemide at K 7.5 under GA: ΔK at 3 h −0.030 (−0.042 before the H tasks) → `it.fails` (the report's "beyond 0.1"). Unit:
20 mmol lost over 1 h → K 4.100 two hours later (rest 4.200), cells −18.6 mmol. **FU-4 check:** `blood-k-rhythm`,
`blood-hyperk`, `clinical-suite` pass.

- [x] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-potassium.test.ts`:

```ts
// FU-9 Task A6 (F6): the cellular K pool is finite — a renal K loss lowers plasma K (Sterns: 300 mmol per mmol/L) instead of
// being refilled to the set point.
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };

describe('FU-9 F6: total-body K (Sterns 1981)', () => {
  it('rest: K stays at the set point; 20 mmol lost in the urine over 1 h lowers K for hours and the cells share the loss', () => {
    const run = (lossMmolH: number) => {
      const bc = createBloodCore(MAN, 5.25, 40);
      const kIcf0 = bc.so.kIcf;
      bc.renal = { uopAboveBasalMlH: 0, excretion: { k: lossMmolH, na: 0, cl: 0, gluconate: 0 } };
      for (let k = 0; k < 3 * 36000; k++) {
        if (k === 36000 && bc.renal) bc.renal.excretion.k = 0; // the loss stops after 1 h; read 2 h later
        stepBloodCore(bc, { t: k / 10, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
      }
      return { k: bc.out.k, cells: bc.so.kIcf - kIcf0 };
    };
    const r = run(0);
    const l = run(20);
    console.log(`FU-9 F6: 20 mmol over 1 h, read 2 h later → K ${l.k.toFixed(3)} (rest ${r.k.toFixed(3)}), cells ${l.cells.toFixed(1)} mmol`);
    expect(r.k).toBeCloseTo(4.2, 2);
    expect(l.k).toBeLessThan(r.k - 0.05); // Sterns: 20 mmol ÷ K_TBK_MMOL 300 = −0.067 at equilibrium (measured −0.10 two hours on)
    expect(l.k).toBeGreaterThan(r.k - 0.15);
    expect(l.cells).toBeLessThan(-15); // most of the loss has come out of the cells (before FU-9 they refilled the ECF to set.k)
  });
});
```

Create `packages/engine-core/test/engine/fu9-potassium.test.ts`:

```ts
// FU-9 Task A6 (F6): renal K excretion follows plasma K and the loop diuretic's flow, and a renal loss is not refilled
// from an unlimited cellular store (research/22 BF-08d). Rig = the BF runner's GA vent with a profile K 7.5 (normal pH);
// furosemide 40 mg at 300 s; K 3 h later against the same patient without it.
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, MAN, once, st } from '../helpers/fu9.ts';

const HYPERK = { ...MAN, blood: { k: 7.5 } };
const read = (e: Parameters<typeof st>[0]) => ({ k: st(e).blood.out.k, kIcf: st(e).blood.core.so.kIcf });
const at = [300 + 3 * 3600];
const arms = once(async () => ({ // shared by both tests (R50 F10)
  f: (await arm([...GA_VENT, [300, ev({ kind: 'drug', drugId: 'furosemide', dose: 40, unit: 'mg', route: 'iv' })]], at, read, HYPERK))[0],
  c: (await arm(GA_VENT, at, read, HYPERK))[0],
}));

describe('FU-9 F6: kaliuresis (Young 1988; Good & Wright 1979; UK Renal Association 2023)', { timeout: 600_000 }, () => {
  it('furosemide 40 mg at K 7.5: K lower than the untreated patient at 3 h (was −0.002) and the cells share the loss', async () => {
    const { f, c } = await arms();
    if (!f || !c) throw new Error('no sample');
    console.log(`FU-9 F6: ΔK ${(f.k - c.k).toFixed(3)} at 3 h, cellular pool ${(f.kIcf - c.kIcf).toFixed(1)} mmol`);
    expect(f.k).toBeLessThan(c.k - 0.02);
    expect(f.kIcf).toBeLessThan(c.kIcf);
  });
  // R45 (research/22 BF-08d, dirOnly "beyond 0.1"): the band's size is Ali's (Open question 5). Under GA the diuresis is
  // small (+150 mL/h at the peak), the kaliuresis ≈ 10 mmol against the untreated patient's retention, and 300 mmol of
  // total-body K per mmol/L (Sterns 1981) turns that into −0.03; the alkalotic rig (pH 7.57) also holds K in the cells.
  it.fails('furosemide 40 mg at K 7.5: K ≥ 0.1 lower at 3 h — measured −0.030 (FU-9 F6; −0.042 before H1–H10)', async () => {
    const { f, c } = await arms();
    expect((f?.k ?? 0) - (c?.k ?? 0)).toBeLessThanOrEqual(-0.1);
  });
});
```


- [x] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-potassium.test.ts test/engine/fu9-potassium.test.ts`
  → the unit test's K returns to 4.200 (cells refill); the engine test reads ΔK −0.002.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
import { addFluid, calibrateXa, concOf, createSolutes, ionisedCa, osmEcf, removePlasma, sidOf, stepSolutes, type Conc, type SoluteState } from './solutes.ts';
```

replace with:

```ts
import { addFluid, calibrateXa, concOf, createSolutes, ionisedCa, K_TBK_MMOL, osmEcf, removePlasma, sidOf, stepSolutes, type Conc, type SoluteState } from './solutes.ts';
```

In `packages/engine-core/src/l2/blood/solutes.ts`, find:

```ts
  set: { k: number; ca: number; mg: number; ph: number }; // homeostatic set points (mmol/L; pH of the K reference)
```

replace with:

```ts
  set: { k: number; ca: number; mg: number; ph: number; kIcf: number }; // homeostatic set points (mmol/L; pH of the K reference; FU-9 F6: the cellular K pool, mmol)
```

find:

```ts
    lac: p.lactate * vLacL, kIcf: 140 * (icfMl / 1000), pi: NORMAL.piMmolL * v, set: { k: p.k, ca: p.iCa, mg: p.mg, ph: 7.4 },
```

replace with:

```ts
    lac: p.lactate * vLacL, kIcf: 140 * (icfMl / 1000), pi: NORMAL.piMmolL * v, set: { k: p.k, ca: p.iCa, mg: p.mg, ph: 7.4, kIcf: 140 * (icfMl / 1000) },
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  const kSet = so.set.k - 4.0 * (bc.phNonOrg - so.set.ph) + drug; // Q45
```

replace with:

```ts
  // Q45; FU-9 F6: the set point follows the total-body K — an external K loss (or gain) is shared by the cells instead of
  // being refilled from an unlimited store: plasma K falls 1 mmol/L per K_TBK_MMOL of total-body deficit (Sterns 1981)
  const kSet = so.set.k + (so.kIcf + so.k - (so.set.kIcf + so.set.k * (bc.ecf0 / 1000))) / K_TBK_MMOL - 4.0 * (bc.phNonOrg - so.set.ph) + drug;
```

In `packages/engine-core/src/l2/blood/solutes.ts`, find:

```ts
export const K_TAU_MIN = 43; // 50 % of a K load into cells in 30 min (tables `vK`) [ENG]
```

replace with:

```ts
export const K_TAU_MIN = 43; // 50 % of a K load into cells in 30 min (tables `vK`) [ENG]
/** FU-9 F6: total-body K per mmol/L of plasma K — a 200–400 mmol deficit lowers plasma K ≈ 1 mmol/L (Sterns RH et al.
 *  Medicine 1981;60:339–354) [TXT, midpoint]; the Na/K-ATPase set point follows it (core.ts kSet). */
export const K_TBK_MMOL = 300;
```

In `packages/engine-core/src/l2/organs/inputs.ts`, find:

```ts
  core?: { liver?: number; renal?: RenalSeam; out?: { na?: number } }; // FU-9 R4: the plasma Na an expansion natriuresis carries
```

replace with:

```ts
  core?: { liver?: number; renal?: RenalSeam; so?: { set?: { k?: number } }; out?: { k?: number; na?: number } }; // FU-9 F6: K and its set point; R4: Na
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
function renalSeam(s: RenalState, gluconate: number, natriuresis = { share: 0, naMmolL: URINE_NA }): RenalSeam {
```

replace with:

```ts
function renalSeam(s: RenalState, gluconate: number, natriuresis = { share: 0, naMmolL: URINE_NA }, kRel = 1): RenalSeam {
```

find:

```ts
  const k = lH * URINE_K;
```

replace with:

```ts
  // FU-9 F6: distal K secretion follows the plasma K (÷ the patient's own set point: at rest the basal excretion
  // balances the basal intake) and the distal flow, sublinearly (Good & Wright 1979 Am J Physiol 236:F192; Young 1988
  // Am J Physiol 255:F811) — so a loop diuretic's flow and a high K excrete more, and an oliguric kidney RETAINS the
  // intake's K (negative: KCl kept, the AKI hyperkalaemia). Replaces URINE_K × the urine above basal.
  const k0 = (UOP0_ML_KG_H * s.p.weightKg * URINE_K) / 1000; // mmol/h at the basal urine
  const k = k0 * (kRel * Math.sqrt(Math.max(0, s.uopMlMin * 60) / (UOP0_ML_KG_H * s.p.weightKg)) - 1);
```

find:

```ts
    core.renal = renalSeam(os.renal, v.gluconate, natri);
```

replace with:

```ts
    const kSet = core.so?.set?.k;
    const kNow = core.out?.k;
    const kRel = typeof kSet === 'number' && typeof kNow === 'number' && kSet > 0 ? kNow / kSet : 1; // FU-9 F6
    core.renal = renalSeam(os.renal, v.gluconate, natri, kRel);
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/organs test/l2/renal test/engine/fu9-potassium.test.ts
  test/engine/blood-hyperk.test.ts test/engine/blood-k-rhythm.test.ts test/engine/organs-soak.test.ts` → pass.
- [x] **Step 5 — BF runner:** `BF-08 BF-05b BF-17b` (A0 Step 3's command, `BF_OUT=out/<task>.json`); `RH-07 RH-09` (A0 Step 3's RH command, `RH_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "fix(7d,7c): kaliuresis follows plasma K and distal flow; the cellular K pool is finite (FU-9 F6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A7: F9 — metabolic alkalosis is compensated by hypoventilation (7f `spont.ts`; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/params.ts` (`CHRONIC_HCO3_PER_MMHG`, ONE copy beside `NORMAL`),
  `packages/engine-core/src/l2/neuro/spont.ts` (the import from 7c's params, the header comment line, `paco2SetPoint` and
  its constants, the ONE `s.paco2Set = …` line)
- Create: `packages/engine-core/test/l2/neuro/fu9-alkalosis.test.ts`, `test/engine/fu9-alkalosis.test.ts`
- Overlap (declared): FU-6 Task 13 edits the same `s.paco2Set = paco2SetPoint(…)` line (it subtracts its pregnancy
  `setShift`). Whichever plan lands second re-anchors by content; the merged line is
  `  s.paco2Set = paco2SetPoint(s.paco2Rest - (x.setShift ?? 0), x.hco3, x.paco2); // FU-6 R10: the pregnancy set point; FU-9 F9: the metabolic HCO3`.
  FU-6's other `spont.ts` blocks (Tasks 4, 5, 10) are on other lines; its import block is not this task's first line.

**Why / measured (main):** research/22 F9 / BF-15b. A profile HCO₃ 34 breathes to PaCO₂ 38.9, pH 7.55. Decision D7 (R5/R50
F6: the deadband and ONE constant).

**Prototype numbers:** engine test PaCO₂ +6.1 (45.1 vs 39.0), pH 7.498 (band +5 to +9); unit: HCO₃ 34 → set point 46.65 (the deadband takes
0.07), 24.40045 (7c at t = 0) → exactly 40, a compensated retainer (45, 26.15) → 45. **FU-4 check:** with the deadband a
resting patient's set point is exactly unchanged, so A7 moves no `audit:physiology` row (D13).

- [x] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/neuro/fu9-alkalosis.test.ts`:

```ts
// FU-9 Task A7 (F9): the chemoreflex set point rises in metabolic alkalosis (0.7 mmHg per mmol/L HCO3, cap 55).
import { describe, expect, it } from 'vitest';
import { ALK_DEADBAND, ALK_PACO2_MAX, paco2SetPoint } from '../../../src/l2/neuro/spont.ts';

describe('FU-9 F9: respiratory compensation of metabolic alkalosis (Javaheri & Kazemi 1987)', () => {
  it('HCO3 34 → set point +6.65; resting HCO3 (24.40045 at t = 0) → exactly unchanged; acidosis still Winter; capped at 55', () => {
    expect(paco2SetPoint(40, 34)).toBeCloseTo(40 + 0.7 * (34 - 24.4 - ALK_DEADBAND), 9);
    expect(paco2SetPoint(40, 24.40045)).toBe(40);
    expect(paco2SetPoint(40, 24.4 + ALK_DEADBAND)).toBe(40);
    expect(paco2SetPoint(40, 15)).toBeCloseTo(30.5, 9);
    expect(paco2SetPoint(40, 60)).toBe(ALK_PACO2_MAX);
  });
  it('a chronic hypercapnic set point (45) with its compensated HCO3 (24.4 + 0.35·5) is not read as alkalosis', () => {
    expect(paco2SetPoint(45, 24.4 + 0.35 * 5)).toBe(45);
  });
});
```

Create `packages/engine-core/test/engine/fu9-alkalosis.test.ts`:

```ts
// FU-9 Task A7 (F9): metabolic alkalosis is compensated by hypoventilation (research/22 BF-15b). Rig = the BF runner's
// awake, spontaneously breathing room-air patient (MODELED) with a profile HCO3 34, read at 30 min against X-A.
import { describe, expect, it } from 'vitest';
import { arm, MAN, st } from '../helpers/fu9.ts';

describe('FU-9 F9: respiratory compensation of metabolic alkalosis (Javaheri 1987; the Boston rules)', { timeout: 300_000 }, () => {
  it('HCO3 34: PaCO2 +5 to +9 above the normal patient (expected +7), pH below 7.55 (was PaCO2 −0.1, pH 7.55)', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ paco2: st(e).resp.co2.pf, ph: st(e).blood.core.ab.ph, hco3: st(e).blood.core.ab.hco3 });
    const [a] = await arm([], [1800], read, { ...MAN, blood: { hco3: 34 } });
    const [n] = await arm([], [1800], read);
    if (!a || !n) throw new Error('no sample');
    console.log(`FU-9 F9: PaCO2 ${a.paco2.toFixed(1)} vs ${n.paco2.toFixed(1)}, pH ${a.ph.toFixed(3)}, HCO3 ${a.hco3.toFixed(1)}`);
    expect(a.paco2 - n.paco2).toBeGreaterThanOrEqual(5);
    expect(a.paco2 - n.paco2).toBeLessThanOrEqual(9);
    expect(a.ph).toBeLessThan(7.55);
  });
});
```


- [x] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/fu9-alkalosis.test.ts test/engine/fu9-alkalosis.test.ts` →
  `ALK_PACO2_MAX` missing; engine PaCO₂ −0.1.
- [x] **Step 3 — implement** (merge origin/main first; if FU-6 has landed, the last block's find line carries its
  `setShift` — make the same change on the merged line given above).

In `packages/engine-core/src/l2/blood/params.ts`, find:

```ts
/** FU-9 F8: plasma globulins at the normal albumin, g/L — their own mass (fluids.ts `copPlasma`), carried by plasma products. */
```

replace with:

```ts
/** Chronic renal compensation of a chronic hypercapnia, mmol/L HCO3 per mmHg PaCO2 above 40 (tables §5b.1 "chronic
 *  (profile only): +0.35–0.4 per mmHg"; Brackett/Schwartz 1965) — FU-9: ONE constant, read by 7f's set point (F9) and by
 *  7c's profile calibration (F7). */
export const CHRONIC_HCO3_PER_MMHG = 0.35;
/** FU-9 F8: plasma globulins at the normal albumin, g/L — their own mass (fluids.ts `copPlasma`), carried by plasma products. */
```

In `packages/engine-core/src/l2/neuro/spont.ts`, find:

```ts
import { drive, pti, stepFatigue } from '../lung/drive.ts';
```

replace with:

```ts
import { CHRONIC_HCO3_PER_MMHG, NORMAL } from '../blood/params.ts'; // FU-9 F9: ONE reference (7c's normal and chronic rule)
import { drive, pti, stepFatigue } from '../lung/drive.ts';
```

find:

```ts
//     (24 without 7c → no shift): paco2Set = min(paco2Rest, 1.5·HCO3 + 8). Metabolic alkalosis is not compensated (v1).
```

replace with:

```ts
//     (24 without 7c → no shift): paco2Set = min(paco2Rest, 1.5·HCO3 + 8); raised in metabolic alkalosis by 0.7 mmHg per
//     mmol/L of HCO3 above the patient's reference (FU-9 F9: Javaheri & Kazemi 1987 / the Boston rules), capped at 55 mmHg.
```

find:

```ts
/** The chemoreflex set point: the resting PaCO2, lowered to Winter's value in metabolic acidosis only. */
export function paco2SetPoint(paco2Rest: number, hco3: number): number {
  return Math.min(paco2Rest, winterPaco2(hco3));
}
```

replace with:

```ts
/**
 * FU-9 F9: metabolic alkalosis is compensated by hypoventilation — PaCO2 rises 0.7 mmHg per mmol/L HCO3 above normal
 * (Javaheri S, Kazemi H. Am Rev Respir Dis 1987;136:1011; Narins & Emmett 1980 "Boston rules"), rarely beyond 55 mmHg
 * (the hypoxaemic drive limits it). The reference is 7c's normal HCO3 plus the chronic renal compensation the patient's
 * own resting PaCO2 implies (7c's CHRONIC_HCO3_PER_MMHG, tables §5b.1), plus a 0.1 mmol/L deadband, so a compensated
 * chronic hypercapnic profile is not read as a metabolic alkalosis and a resting patient is exactly unchanged.
 */
export const ALK_SLOPE = 0.7;
export const ALK_PACO2_MAX = 55;
/** The branch opens only 0.1 mmol/L above the reference [ENG] (R50 F6): 7c's resting HCO3 is 24.40045 at t = 0. */
export const ALK_DEADBAND = 0.1;
/** Acute CO2 buffering, mmol/L HCO3 per mmHg PaCO2 (Brackett, Cohen & Schwartz 1965 NEJM 272:6; 7c's own BF-16a 0.11–0.15). */
export const ACUTE_HCO3_PER_MMHG = 0.1;
/**
 * The chemoreflex set point: the resting PaCO2, lowered to Winter's value in metabolic acidosis, raised in metabolic
 * alkalosis (FU-9 F9). The alkalosis branch reads the METABOLIC bicarbonate — the measured HCO3 less the acute buffering
 * of a PaCO2 above the resting value (`paco2`, default the resting value) — so an acute hypercapnia (opioids, dead space)
 * is never read as a metabolic alkalosis that would lift the set point further; at rest the set point is unchanged.
 */
export function paco2SetPoint(paco2Rest: number, hco3: number, paco2 = paco2Rest): number {
  const ref = NORMAL.hco3 + CHRONIC_HCO3_PER_MMHG * Math.max(0, paco2Rest - NORMAL.paco2) + ALK_DEADBAND; // 7c's own values
  const met = hco3 - ACUTE_HCO3_PER_MMHG * Math.max(0, paco2 - paco2Rest);
  if (met > ref) return Math.max(paco2Rest, Math.min(ALK_PACO2_MAX, paco2Rest + ALK_SLOPE * (met - ref)));
  return Math.min(paco2Rest, winterPaco2(hco3));
}
```

find:

```ts
  s.paco2Set = paco2SetPoint(s.paco2Rest, x.hco3);
```

replace with:

```ts
  s.paco2Set = paco2SetPoint(s.paco2Rest, x.hco3, x.paco2); // FU-9 F9: the metabolic HCO3 (acute buffering removed)
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro test/l2/blood test/engine/fu9-alkalosis.test.ts test/engine/neuro-spont.test.ts
  test/engine/circ-hypoxic-arrest.test.ts` → pass.
- [x] **Step 5 — BF runner:** `BF-15b BF-16 BF-17` (A0 Step 3's command, `BF_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7f): the chemoreflex set point rises in metabolic alkalosis, on 7c's reference (FU-9 F9)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A8: F11 — the brain follows a fall in plasma osmolality (7d brain + organ view; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/brain/params.ts` (`OSM_WATER_ML_PER_MOSM`), `packages/engine-core/src/l2/brain/model.ts`
  (import, `BrainInputs.osm`, `BrainState.osm0/osmWater`, `stepBrain`, the fixed volume),
  `packages/engine-core/src/l2/organs/inputs.ts` (`OrganView.osm`, `BloodLike.out.osm`, `readOrganView`),
  `packages/engine-core/src/l2/organs/pipeline.ts` (`brainIn`, `nominalView`)
- Create: `packages/engine-core/test/l2/brain/fu9-osmolality.test.ts`, `test/engine/fu9-osmolality.test.ts`
- Overlap: none (A1/A6 edit other lines of `organs/{inputs,pipeline}.ts`; `nominalView` carries A1's `demandRel`: apply in
  order).

**Why / measured (main):** research/22 F11 / BF-11b. 3 L of 1.5 % glycine: Na 119.5, osmolality 290 → 275, ICP +0.07.
Decision D8.

**Prototype numbers:** engine test ΔICP max +0.29 → the report's dirOnly "beyond +1 mmHg" is not reached → `it.fails`
(Open question 8). Unit: −15 mOsm/kg → +2.15 mL in 30 min, ICP +0.18; a rise adds nothing. **FU-4 check:**
`organs-tbi-treatment` (mannitol/HTS) passes.

- [x] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/brain/fu9-osmolality.test.ts`:

```ts
// FU-9 Task A8 (F11): brain water follows a FALL in plasma effective osmolality (the osmotherapy calibration's gain).
import { describe, expect, it } from 'vitest';
import { NO_DRUGS } from '../../../src/l2/brain/flow.ts';
import { brainParams, createBrain, stepBrain, type BrainInputs } from '../../../src/l2/brain/model.ts';
import { OSM_WATER_ML_PER_MOSM } from '../../../src/l2/brain/params.ts';

const REST: BrainInputs = { map: 90, cvp: 6, paco2: 40, pao2: 100, sao2: 0.97, hb: 14, tempC: 37, drugs: NO_DRUGS, osm: 290 };
const run = (osm: number, secs: number) => {
  const b = createBrain(brainParams(), REST);
  for (let k = 0; k < 600; k++) stepBrain(b, REST, 0.1);
  const icp0 = b.icp;
  for (let k = 0; k < secs * 10; k++) stepBrain(b, { ...REST, osm }, 0.1);
  return { water: b.osmWater ?? 0, dIcp: b.icp - icp0 };
};

describe('FU-9 F11: hypo-osmolar brain swelling (Hahn 2006; Adrogué & Madias 2000)', () => {
  it('gain = the osmotherapy calibration (0.145 mL per mOsm/kg); −15 mOsm/kg → ≈ 2.2 mL in 30 min and ICP up; a rise adds nothing', () => {
    expect(OSM_WATER_ML_PER_MOSM).toBeCloseTo(0.1454, 3);
    const lo = run(275, 1800);
    console.log(`FU-9 F11 brain: osm −15 → water +${lo.water.toFixed(2)} mL, ICP +${lo.dIcp.toFixed(2)}`);
    expect(lo.water).toBeCloseTo(15 * OSM_WATER_ML_PER_MOSM, 1);
    expect(lo.dIcp).toBeGreaterThan(0);
    expect(run(305, 1800).water).toBe(0);
    const none = createBrain(brainParams(), { ...REST, osm: undefined });
    for (let k = 0; k < 600; k++) stepBrain(none, { ...REST, osm: undefined }, 0.1);
    expect(none.osmWater).toBeUndefined(); // without 7c nothing changes
  });
});
```

Create `packages/engine-core/test/engine/fu9-osmolality.test.ts`:

```ts
// FU-9 Task A8 (F11): the brain follows a fall in plasma osmolality (research/22 BF-11b). Rig = the BF runner's awake
// patient (TURP under spinal): 1.5 % glycine 3 L absorbed over 30 min from 300 s; read over 2.5 h against no absorption.
import { describe, expect, it } from 'vitest';
import { arm, ev, once, st } from '../helpers/fu9.ts';

const at = Array.from({ length: 30 }, (_, k) => 300 + 300 * (k + 1));
const read = (e: Parameters<typeof st>[0]) => {
  const o = (st(e) as unknown as { organs: { brain: { icp: number; osmWater?: number } } }).organs.brain;
  return { na: st(e).blood.out.na, osm: st(e).blood.out.osm, icp: o.icp, water: o.osmWater ?? 0 };
};
const arms = once(async () => ({ // shared by both tests (R50 F10)
  i: await arm([[300, ev({ kind: 'fluid', fluid: 'glycine', volumeMl: 3000, overS: 1800 })]], at, read),
  c: await arm([], at, read),
}));

describe('FU-9 F11: hypo-osmolar brain swelling (Hahn 2006; Adrogué & Madias 2000)', { timeout: 600_000 }, () => {
  it('glycine 3 L: Na ≈ 120, brain water gained and ICP above the control (was +0.07 max)', async () => {
    const { i, c } = await arms();
    const dIcp = Math.max(...i.map((r, k) => r.icp - (c[k]?.icp ?? r.icp)));
    const water = Math.max(...i.map((r) => r.water));
    console.log(`FU-9 F11: Na min ${Math.min(...i.map((r) => r.na)).toFixed(1)}, osm min ${Math.min(...i.map((r) => r.osm)).toFixed(1)}, brain water +${water.toFixed(2)} mL, ΔICP max +${dIcp.toFixed(2)}`);
    expect(water).toBeGreaterThan(1);
    expect(dIcp).toBeGreaterThan(0.2);
  });
  // R45 (research/22 BF-11b, dirOnly "beyond 1 mmHg"): the gain is the osmotherapy calibration's (0.145 mL per mOsm/kg);
  // an ideal-osmometer brain (≈ 1.1 L of water) would gain ≈ 55 mL for −15 mOsm/kg. Open question 8.
  it.fails('glycine 3 L: ICP ≥ 1 mmHg above the control — measured +0.29 (FU-9 F11)', async () => {
    const { i, c } = await arms();
    expect(Math.max(...i.map((r, k) => r.icp - (c[k]?.icp ?? r.icp)))).toBeGreaterThanOrEqual(1);
  });
});
```


- [x] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain/fu9-osmolality.test.ts test/engine/fu9-osmolality.test.ts` →
  `OSM_WATER_ML_PER_MOSM` missing; engine: brain water 0, ΔICP +0.07.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/brain/params.ts`, find:

```ts
export const NACL_MOSM_PER_G = 2000 / 58.44; // 34.2 mOsm/g
```

replace with:

```ts
export const NACL_MOSM_PER_G = 2000 / 58.44; // 34.2 mOsm/g
/**
 * FU-9 F11: brain water follows a FALL in plasma effective osmolality (7c `blood.out.osm`) — acute hyponatraemia swells
 * the brain (Hahn 2006 BJA 96:8; Adrogué & Madias 2000 NEJM 342:1581). The gain is the osmotherapy calibration's own:
 * OSM_VMAX_ML × the saturation of 1 g/kg mannitol (384 mOsm, 0.885) ÷ its ECF rise (384 mOsm / 14 L = +27.4 mOsm/kg)
 * = 0.145 mL per mOsm/kg [ENG, derived]; it moves with HTS_TAU_IN_MIN (the barrier's water equilibration). Only the fall
 * is read: a rise from hypertonic saline is already the dose-driven osmotherapy term (no double count).
 */
export const OSM_WATER_ML_PER_MOSM = (OSM_VMAX_ML * (384 / (384 + OSM_K_MOSM))) / (384 / 14);
```

In `packages/engine-core/src/l2/brain/model.ts`, find:

```ts
  MMHG_PER_CM_BLOOD, OSM_K_MOSM, OSM_VMAX_ML, PACO2_ADAPT_TAU_S, PVI, R_OUT, TAU_VASC_S, TBI_AR_LOSS, TBI_ICP0_RISE, TBI_PVI_DROP, TBI_RESERVE_DROP,
```

replace with:

```ts
  MMHG_PER_CM_BLOOD, OSM_K_MOSM, OSM_VMAX_ML, OSM_WATER_ML_PER_MOSM, PACO2_ADAPT_TAU_S, PVI, R_OUT, TAU_VASC_S, TBI_AR_LOSS, TBI_ICP0_RISE, TBI_PVI_DROP, TBI_RESERVE_DROP,
```

find:

```ts
  drugs: BrainDrugs; // anaesthetic CMRO2 multiplier and direct vasodilation (organs/inputs.ts: 7f/7g, or the INTERIM fallback)
}
```

replace with:

```ts
  drugs: BrainDrugs; // anaesthetic CMRO2 multiplier and direct vasodilation (organs/inputs.ts: 7f/7g, or the INTERIM fallback)
  osm?: number | null; // FU-9 F11: 7c's plasma effective osmolality, mOsm/kg (absent/null without 7c)
}
```

find:

```ts
  osm: OsmDose[];
```

replace with:

```ts
  osm: OsmDose[];
  osm0?: number; // FU-9 F11: the patient's own resting plasma osmolality (latched on the first reading)
  osmWater?: number; // FU-9 F11: brain water gained from a fall in plasma osmolality, mL
```

find:

```ts
  const fixedV = b.mass + b.oedema - b.csfDisp - osmoticLoss(b.osm, b.t) - hu.volMl;
```

replace with:

```ts
  const fixedV = b.mass + b.oedema - b.csfDisp - osmoticLoss(b.osm, b.t) + (b.osmWater ?? 0) - hu.volMl;
```

find:

```ts
  b.paco2Ref += (inp.paco2 - b.paco2Ref) * (dt / PACO2_ADAPT_TAU_S);
```

replace with:

```ts
  b.paco2Ref += (inp.paco2 - b.paco2Ref) * (dt / PACO2_ADAPT_TAU_S);
  if (typeof inp.osm === 'number' && Number.isFinite(inp.osm) && inp.osm > 0) {
    // FU-9 F11: hypo-osmolar brain swelling (the fall only; osmotherapy's rise is the dose term)
    b.osm0 ??= inp.osm;
    const target = OSM_WATER_ML_PER_MOSM * Math.max(0, b.osm0 - inp.osm);
    b.osmWater = (b.osmWater ?? 0) + (target - (b.osmWater ?? 0)) * (1 - Math.exp(-dt / (HTS_TAU_IN_MIN * 60)));
  }
```

In `packages/engine-core/src/l2/organs/inputs.ts`, find:

```ts
  hb: number; albuminGL: number; bvRel: number;
```

replace with:

```ts
  hb: number; albuminGL: number; bvRel: number;
  osm: number | null; // FU-9 F11: 7c's plasma effective osmolality, mOsm/kg (null without 7c)
```

find:

```ts
  out?: { hb?: number; albuminGL?: number; bvRel?: number; hbfRel?: number; lactate?: number; gluconate?: number };
```

replace with:

```ts
  out?: { hb?: number; albuminGL?: number; bvRel?: number; hbfRel?: number; lactate?: number; gluconate?: number; osm?: number };
```

find:

```ts
    bvRel: num(out?.bvRel, bvFallback),
```

replace with:

```ts
    bvRel: num(out?.bvRel, bvFallback),
    osm: typeof out?.osm === 'number' && Number.isFinite(out.osm) && out.osm > 0 ? out.osm : null, // FU-9 F11
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
  map: v.map, cvp: v.cvp, paco2: v.paco2, pao2: v.pao2, sao2: v.sao2, hb: v.hb, tempC: v.tempC, drugs: brainDrugs(v),
});
```

replace with:

```ts
  map: v.map, cvp: v.cvp, paco2: v.paco2, pao2: v.pao2, sao2: v.sao2, hb: v.hb, tempC: v.tempC, drugs: brainDrugs(v), osm: v.osm, // FU-9 F11
});
```

find:

```ts
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, demandRel: 1, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
```

replace with:

```ts
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, osm: null, demandRel: 1, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/brain test/l2/organs test/engine/fu9-osmolality.test.ts test/engine/organs-tbi.test.ts
  test/engine/organs-tbi-treatment.test.ts` → pass.
- [x] **Step 5 — BF runner:** `BF-11 BF-12` (A0 Step 3's command, `BF_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7d): hypo-osmolar brain swelling from 7c plasma osmolality (FU-9 F11)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A9: H2 + H4 — filtration equilibrium; pressure natriuresis on the renal perfusion pressure (7d; Part A, E-FU9-4)

**Files:**
- Modify: `packages/engine-core/src/l2/renal/params.ts` (`PI_GLOM0`'s comment, `HCT_REF`, `FF_REF`, `EABV_EXP` re-fitted),
  `packages/engine-core/src/l2/renal/kidney.ts` (import, `renalHaemo`'s `hct`, `filtration`, `meanOncotic`, `tgfTarget`),
  `packages/engine-core/src/l2/renal/model.ts` (`RenalInputs.hct`; the settle and step's `tgfTarget`/`renalHaemo` calls;
  the `fe` line's RPP), `packages/engine-core/src/l2/organs/pipeline.ts` (`renalIn`'s `hct`)
- Modify: `packages/engine-core/test/l2/renal/model.test.ts` (**E-FU9-4**: the shock-start test asserts oliguria, not
  GFR 0); `test/engine/fidelity-lowflow.test.ts` (a pre-declared FU-5 `it.fails` FLIPS to `it`: the 3 L bleed's 1.0 s
  LOW PERF blip at 601 s no longer occurs — 1 short technical cycle → 0; bisected to this task)
- Create: `packages/engine-core/test/l2/renal/fu9-filtration.test.ts`, `test/engine/fu9-iap.test.ts`
- Overlap: none (no other plan edits `l2/renal/kidney.ts`; FU-8 I-34's hunk in `model.ts` is the KDIGO lines).

**Why / measured (main):** research/13 H2 (RH-01c FF under GA 0.48; RH-02b class III FF 0.80, GFR −1 % while RBF −43 %)
and H4 (RH-06a: IAP 15/20/25 leave urine at 0.36; research/21 SP-08e IAP 14: 0 %). Decision D14.

**Prototype numbers:** unit — rest GFR 125, FF 0.239 (unchanged); MAP 70 / CO 4: GFR 79, FF 0.342; IAP 0/15/25 → urine
1.00/0.81/0.69 mL/kg/h, CVP 15 → 0.81; the awake UOP–MAP curve unchanged; IAP 25 < 0.1 (WSACS) → `it.fails` (0.69: the
circulation half is H5, handed). Check 20 with `EABV_EXP` 0.35: 0.112 / 0.259 / 0.288. Engine test (SP-08e rig) — IAP 14
under GA: urine −12.5 % (≥ −5 %: `it`); −30 % or more → `it.fails`; SP-08a CO −10–30 % → `it.fails` (0.0 %, 7a's).
RH-01c FF under GA 0.48 → 0.26 (PL); RH-06a IAP 15 −14 %.

- [x] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/renal/fu9-filtration.test.ts`:

```ts
// FU-9 Task A9 (H2, H4; research/13 RH): the 7d kidney alone, on the FU-9 renal rig (70 kg, healthy reference inputs).
import { describe, expect, it } from 'vitest';
import { RENAL_BASE, renalHold, uopMlKgH } from '../../helpers/fu9-renal.ts';

describe('FU-9 H2: filtration equilibrium (Deen, Robertson & Brenner 1972)', () => {
  it('rest: GFR 125 and FF 0.24 unchanged; low flow (MAP 70, CO 4): GFR falls and FF ≤ 0.35 (was GFR held, FF 0.48 under GA)', () => {
    const r = renalHold(RENAL_BASE, 600);
    expect(r.gfr).toBeCloseTo(125, 0);
    expect(r.gfr / (0.55 * r.rbf)).toBeCloseTo(0.239, 2);
    const lo = renalHold({ ...RENAL_BASE, map: 70, coLpm: 4 }, 1800);
    const ff = lo.gfr / (0.55 * lo.rbf);
    console.log(`FU-9 H2: low flow GFR ${lo.gfr.toFixed(0)}, FF ${ff.toFixed(3)}`);
    expect(lo.gfr).toBeLessThan(115);
    expect(ff).toBeLessThanOrEqual(0.35);
  });
});

describe('FU-9 H4: pressure natriuresis on the renal perfusion pressure (tables §5.2 U(RPP))', () => {
  it('awake UOP–MAP curve at CVP 5 unchanged (MAP 80 0.68); intra-abdominal and venous pressure lower the urine', () => {
    expect(uopMlKgH(renalHold({ ...RENAL_BASE, map: 80 }, 1800))).toBeCloseTo(0.68, 1);
    const u0 = uopMlKgH(renalHold(RENAL_BASE, 1800));
    const u15 = uopMlKgH(renalHold({ ...RENAL_BASE, iap: 15 }, 1800));
    const u25 = uopMlKgH(renalHold({ ...RENAL_BASE, iap: 25 }, 1800));
    const cvp15 = uopMlKgH(renalHold({ ...RENAL_BASE, cvp: 15 }, 1800));
    console.log(`FU-9 H4: IAP 0/15/25 → ${u0.toFixed(2)}/${u15.toFixed(2)}/${u25.toFixed(2)}; CVP 15 → ${cvp15.toFixed(2)}`);
    expect(u15).toBeLessThan(u0);
    expect(u25).toBeLessThan(u15);
    expect(cvp15).toBeLessThan(u0);
  });
  // R45 (research/13 H4 acceptance; research/21 SP-08e): WSACS oliguria from IAP 15 and < 0.1 mL/kg/h near IAP 25 need
  // the circulation's share (IAP → venous return and CO, 7a — handed, R-FU9-8): the kidney alone gives 0.81 / 0.69.
  it.fails('IAP 25: UOP < 0.1 mL/kg/h (WSACS) — measured 0.69 (FU-9 H4; the 7a half is handed)', () => {
    expect(uopMlKgH(renalHold({ ...RENAL_BASE, iap: 25 }, 1800))).toBeLessThan(0.1);
  });
});
```

Create `packages/engine-core/test/engine/fu9-iap.test.ts`:

```ts
// FU-9 Task A9 (H4; research/13 RH-06, research/21 SP-08): pressure natriuresis reads the renal perfusion pressure
// MAP − max(CVP, IAP). The laparoscopy acceptance arms SP-08a/e: "GA vent" (helpers/fu9.ts), pneumoperitoneum IAP 14 mmHg
// (7d's `renal iapMmHg`, the only IAP input) at 20 min against the same timeline without it.
import { describe, expect, it } from 'vitest';
import { circCoLpm } from '../helpers/blood.ts';
import { arm, ev, GA_VENT, once, urineMl } from '../helpers/fu9.ts';

const TQ = 1200;
const read = once(async () => {
  const at = [TQ, TQ + 900, TQ + 1500];
  const f = (e: Parameters<typeof urineMl>[0]) => ({ urine: urineMl(e), co: circCoLpm(e) });
  const p = await arm([...GA_VENT, [TQ, ev({ kind: 'renal', iapMmHg: 14 })]], at, f);
  const c = await arm(GA_VENT, at, f);
  const uo = (r: typeof p) => (r[2] as { urine: number }).urine - (r[1] as { urine: number }).urine; // +15–25 min
  return { dUopPct: 100 * (uo(p) / uo(c) - 1), dCoPct: 100 * ((p[1] as { co: number }).co / (c[1] as { co: number }).co - 1) };
});

describe('FU-9 H4: intra-abdominal pressure lowers the urine (WSACS 2013; research/21 SP-08e)', { timeout: 600_000 }, () => {
  it('IAP 14 under GA: urine over +15–25 min falls ≥ 5 % against the control (main: 0 %)', async () => {
    const r = await read();
    console.log(`FU-9 H4 IAP 14: urine ${r.dUopPct.toFixed(1)} %, CO ${r.dCoPct.toFixed(1)} %`);
    expect(r.dUopPct).toBeLessThanOrEqual(-5);
  });
  // R45 (SP-08e; Chiu 1995 [VERIFY]: UO −60 % at 15 mmHg): the kidney's half is H4; the other half — IAP → venous return
  // and afterload (CO −10–30 %, SVR +20–70 %, Joris 1993) — is 7a's (research/13 H5, handed: R-FU9-8).
  it.fails('IAP 14 under GA: urine −30 % or more (SP-08e) — measured −12.5 %', async () => {
    expect((await read()).dUopPct).toBeLessThanOrEqual(-30);
  });
  it.fails('IAP 14 under GA: CO −10–30 % at +15 min (SP-08a, Joris 1993; 7a, handed) — measured 0.0 %', async () => {
    expect((await read()).dCoPct).toBeLessThanOrEqual(-10);
  });
});
```

In `packages/engine-core/test/l2/renal/model.test.ts`, find:

```ts
    expect(s.gfr).toBe(0);
    expect(s.uopMlMin).toBe(0);
```

replace with:

```ts
    // FU-9 H2 (E-FU9-4): with filtration equilibrium the oncotic pressure at zero filtration is the AFFERENT one (27.7, the
    // mean 32 only at the resting FF), so a shocked kidney still filters a little: GFR 18 (was exactly 0), urine 0.03
    // mL/kg/h. The property — oliguric at t = 0, calibrated on the healthy reference — is asserted, not the zero.
    expect(s.gfr).toBeLessThan(0.2 * s.p.gfrSet);
    expect((s.uopMlMin * 60) / W).toBeLessThan(0.05);
```

In `packages/engine-core/test/engine/fidelity-lowflow.test.ts`, find:

```ts
  it.fails('MODELED 3 L bleed: no technical raise/clear cycle shorter than 5 s — measured 1 (SpO2 LOW PERF at 601 s, 1.0 s) after FU-4 (was LOW PERF ×7 at 1–2 s before FU-5)', async () => {
```

replace with:

```ts
  // FU-9 Task A9 (H2/H4) flips it (bisected): the bled kidney's filtration now falls with its plasma flow, the volume
  // course moves slightly, and the 1.0 s LOW PERF blip at 601 s (FU-4) no longer occurs — no technical short cycle.
  it('MODELED 3 L bleed: no technical raise/clear cycle shorter than 5 s (was 1 after FU-4: SpO2 LOW PERF at 601 s, 1.0 s; LOW PERF ×7 before FU-5)', async () => {
```


- [x] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/fu9-filtration.test.ts test/l2/renal/model.test.ts test/engine/fu9-iap.test.ts`
  → low-flow GFR 125 and FF 0.48; IAP leaves the urine unchanged; the re-specified shock-start test already passes on
  main (GFR 0 < 25).
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/renal/params.ts`, find:

```ts
export const PI_GLOM0 = 32; // glomerular oncotic pressure, mmHg (SET 1386–1389) at albumin 42 g/L
```

replace with:

```ts
export const PI_GLOM0 = 32; // glomerular oncotic pressure, mmHg (SET 1386–1389) at albumin 42 g/L — FU-9 H2: its MEAN at FF_REF
/** FU-9 H2: the healthy reference's filtration fraction (GFR 125 ÷ RPF 952 × (1 − 0.45)) and haematocrit, where the mean
 *  glomerular oncotic pressure equals PI_GLOM0 (the calibrated resting GFR is unchanged). */
export const HCT_REF = 0.45;
export const FF_REF = 125 / (952 * (1 - HCT_REF));
```

find:

```ts
export const EABV_EXP = 0.75; // effective volume = min(BV, (CO/CO0)^0.75) [ENG]: HFrEF (CO 3.5) → V 0.21, UOP 0.114 (tables check 20 0.1–0.15)
```

replace with:

```ts
export const EABV_EXP = 0.35; // effective volume = min(BV, (CO/(CO0·demandRel))^EXP) [ENG]: re-fitted (FU-9 H2/H4) to its own target, tables check 20 (HFrEF UOP 0.1–0.15, dobutamine 0.2–0.3): 0.75 → 0.35
```

In `packages/engine-core/src/l2/renal/kidney.ts`, find:

```ts
  R_EFF, R_GLOM, R_PT, R_RV,
```

replace with:

```ts
  R_EFF, R_GLOM, R_PT, R_RV, FF_REF, HCT_REF,
```

find:

```ts
export function renalHaemo(pa: number, pv: number, k: number, rAff: number, effF: number, kfF: number, albuminGL: number, pb = P_BOWMAN): RenalHaemo {
```

replace with:

```ts
export function renalHaemo(pa: number, pv: number, k: number, rAff: number, effF: number, kfF: number, albuminGL: number, pb = P_BOWMAN, hct = HCT_REF): RenalHaemo {
```

find:

```ts
  const pi = PI_GLOM0 * (albuminGL / ALBUMIN0_G_L);
  const gfr = Math.max(0, 2 * KF_PER_KIDNEY * kfF * (pgc - pb - pi));
  return { rbf, pgc, gfr };
}
```

replace with:

```ts
  return { rbf, pgc, gfr: filtration(pgc, pb, 2 * KF_PER_KIDNEY * kfF, albuminGL, rbf * (1 - hct)) };
}

/**
 * FU-9 H2 (research/13): filtration equilibrium. The glomerular oncotic pressure rises along the capillary as protein-free
 * fluid leaves it; its mean is π̄ = π_a·(1 + 1/(1 − FF))/2 with FF = GFR/RPF (Deen, Robertson & Brenner 1972 Am J Physiol
 * 223:1178). π_a follows the albumin as before, normalised at the tables' resting FF so the healthy reference keeps GFR
 * 125. GFR is the root of G = Kf·(P_gc − P_B − π̄(G/RPF)), found by bisection (monotone), so FF saturates near 0.3–0.35
 * and GFR now falls when the plasma flow does (class III, PEEP) instead of being held at any RBF.
 */
export function filtration(pgc: number, pb: number, kf: number, albuminGL: number, rpf: number): number {
  const piA = (PI_GLOM0 * (albuminGL / ALBUMIN0_G_L)) / meanOncotic(FF_REF);
  if (rpf <= 0 || kf * (pgc - pb - piA) <= 0) return 0;
  let lo = 0;
  let hi = Math.min(kf * (pgc - pb - piA), 0.95 * rpf);
  for (let i = 0; i < 30; i++) {
    const g = 0.5 * (lo + hi);
    if (kf * (pgc - pb - piA * meanOncotic(g / rpf)) - g > 0) lo = g;
    else hi = g;
  }
  return 0.5 * (lo + hi);
}
/** Mean ÷ afferent glomerular oncotic pressure at a filtration fraction ff (linear protein concentration profile). */
export const meanOncotic = (ff: number): number => (1 + 1 / (1 - Math.min(0.95, Math.max(0, ff)))) / 2;
```

find:

```ts
export function tgfTarget(pa: number, pv: number, k: number, effF: number, kfF: number, albuminGL: number, gfrSet: number, pb = P_BOWMAN): number {
```

replace with:

```ts
export function tgfTarget(pa: number, pv: number, k: number, effF: number, kfF: number, albuminGL: number, gfrSet: number, pb = P_BOWMAN, hct = HCT_REF): number {
```

find:

```ts
  const pi = PI_GLOM0 * (albuminGL / ALBUMIN0_G_L);
  const pgcStar = gfrSet / (2 * KF_PER_KIDNEY * kfF) + pb + pi;
  if (pgcStar <= pv + 1e-6 || pa <= pgcStar) return R_AFF_MIN;
  const q = (pgcStar - pv) / post;
  const rAff = (2 * (pa - pgcStar)) / (q * k) - R_ART - R_GLOM / 2;
  return Math.min(R_AFF_MAX, Math.max(R_AFF_MIN, rAff));
```

replace with:

```ts
  const piA = (PI_GLOM0 * (albuminGL / ALBUMIN0_G_L)) / meanOncotic(FF_REF);
  // FU-9 H2: the oncotic pressure the target GFR meets depends on the plasma flow the target resistance gives — a
  // short fixed point from the resting filtration fraction (converges in 3–4 steps)
  let rAff = R_AFF;
  let ff = FF_REF;
  for (let i = 0; i < 4; i++) {
    const pgcStar = gfrSet / (2 * KF_PER_KIDNEY * kfF) + pb + piA * meanOncotic(ff);
    if (pgcStar <= pv + 1e-6 || pa <= pgcStar) return R_AFF_MIN;
    const q = (pgcStar - pv) / post;
    rAff = Math.min(R_AFF_MAX, Math.max(R_AFF_MIN, (2 * (pa - pgcStar)) / (q * k) - R_ART - R_GLOM / 2));
    const rbf = Math.max(1e-6, pa - pv) / ((k * (R_ART + rAff + R_GLOM / 2)) / 2 + post);
    ff = gfrSet / Math.max(1e-6, rbf * (1 - hct));
  }
  return rAff;
```

In `packages/engine-core/src/l2/renal/model.ts`, find:

```ts
  demandRel?: number;
```

replace with:

```ts
  demandRel?: number;
  /** FU-9 H2: haematocrit (7c's Hb × 3/100) for the renal plasma flow; absent → HCT_REF. */
  hct?: number;
```

find:

```ts
  s.rAff = tgfTarget(inp.map, pvn, k0, effFactor(s.ang), kfF, inp.albuminGL, s.p.gfrSet, pb);
  const h = renalHaemo(inp.map, pvn, k0, s.rAff, effFactor(s.ang), kfF, inp.albuminGL, pb);
```

replace with:

```ts
  s.rAff = tgfTarget(inp.map, pvn, k0, effFactor(s.ang), kfF, inp.albuminGL, s.p.gfrSet, pb, inp.hct);
  const h = renalHaemo(inp.map, pvn, k0, s.rAff, effFactor(s.ang), kfF, inp.albuminGL, pb, inp.hct);
```

find:

```ts
  const fe = s.p.ef0 * natriuresis(inp.map, s.p.pRef) * stress * s.vNh * expansionFactor(inp.bvRel) * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
```

replace with:

```ts
  // FU-9 H4 (research/13): pressure natriuresis reads the renal PERFUSION pressure, MAP − max(CVP, IAP) (tables §5.2 U(RPP)),
  // referred to the reference CVP so the awake UOP–MAP curve at CVP 5 is unchanged: venous congestion and intra-abdominal
  // pressure now lower the urine (WSACS: oliguria from IAP 15)
  const fe = s.p.ef0 * natriuresis(inp.map - pv(inp) + RENAL_REF_CVP, s.p.pRef) * stress * s.vNh * expansionFactor(inp.bvRel) * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
```

find:

```ts
  const target = tgfTarget(inp.map, pvn, s.p.k, effF, kfF, inp.albuminGL, s.p.gfrSet, pb);
```

replace with:

```ts
  const target = tgfTarget(inp.map, pvn, s.p.k, effF, kfF, inp.albuminGL, s.p.gfrSet, pb, inp.hct);
```

find:

```ts
  const h = renalHaemo(inp.map, pvn, s.p.k, s.rAff, effF, kfF, inp.albuminGL, pb);
```

replace with:

```ts
  const h = renalHaemo(inp.map, pvn, s.p.k, s.rAff, effF, kfF, inp.albuminGL, pb, inp.hct);
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis, demandRel: v.demandRel, // FU-9 H1
```

replace with:

```ts
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis, demandRel: v.demandRel, hct: (3 * v.hb) / 100, // FU-9 H1, H2
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal test/l2/organs test/engine/fu9-iap.test.ts test/engine/organs-renal.test.ts
  test/engine/organs-curves.test.ts test/engine/fidelity-lowflow.test.ts` → pass (model.test.ts 9/9, check 20 on the
  re-fitted exponent; fidelity-lowflow's flipped `it`).
- [x] **Step 5 — RH and SP runners:** `RH-01c RH-02 RH-05 RH-06 RH-26 RH-27` (A0 Step 3's RH command, `RH_OUT=out/<task>.json`); SP-08 (research/21's runner, the same
  pattern with `SP_OUT`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7d): filtration equilibrium; natriuresis on the renal perfusion pressure (FU-9 H2, H4, E-FU9-4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A10: H6 — the `aki` condition is nephron loss (7d; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/renal/params.ts` (`AKI_KF_LOSS`'s comment, `AKI_AFF_TONE`),
  `packages/engine-core/src/l2/renal/model.ts` (import, `nephronTone`, the settle and step `tgfTarget` calls)
- Create: `packages/engine-core/test/l2/renal/fu9-aki.test.ts`
- Overlap: none.

**Why / measured (main):** research/13 H6 (RH-10a, RH-09b): aki scales only Kf, TGF dilates the afferent to R_AFF_MIN and
restores GFR (aki 0.5 → 125; aki 1 → 51), and RBF RISES. Decision D15.

**Prototype numbers:** aki 0.5 GFR 75, RBF 917; aki 1 GFR 22, RBF 865 (unit). RH-10a CKD-proxy rocuronium ×1.14 → ×1.40
(PL); RH-09b's K excess at 3 h still ≈ health (7c returns K to its set point — TW, recorded).

- [x] **Step 1 — the test.**

Create `packages/engine-core/test/l2/renal/fu9-aki.test.ts`:

```ts
// FU-9 Task A10 (H6; research/13 RH): the 7d kidney alone, on the FU-9 renal rig (70 kg, healthy reference inputs).
import { describe, expect, it } from 'vitest';
import { RENAL_BASE, renalHold, uopMlKgH } from '../../helpers/fu9-renal.ts';

describe('FU-9 H6: `aki` severity is nephron loss (research/13 H6)', () => {
  it('aki 0.5 → GFR ≈ 75; aki 1 → GFR 15–30 (KDIGO G4–5) and RBF FALLS (was GFR 125 / 51, RBF rising)', () => {
    const h = renalHold(RENAL_BASE, 1800, 0.5);
    const f = renalHold(RENAL_BASE, 1800, 1);
    console.log(`FU-9 H6: aki 0.5 GFR ${h.gfr.toFixed(0)} RBF ${h.rbf.toFixed(0)}; aki 1 GFR ${f.gfr.toFixed(0)} RBF ${f.rbf.toFixed(0)}`);
    expect(h.gfr).toBeGreaterThan(65);
    expect(h.gfr).toBeLessThan(85);
    expect(f.gfr).toBeGreaterThanOrEqual(15);
    expect(f.gfr).toBeLessThanOrEqual(30);
    expect(f.rbf).toBeLessThan(952);
  });
});
```


- [x] **Step 2 — run; it fails.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/fu9-aki.test.ts` → aki 0.5 GFR 125.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/renal/params.ts`, find:

```ts
export const AKI_KF_LOSS = 0.8; // condition aki severity 1 → Kf × 0.2 [ENG]
```

replace with:

```ts
export const AKI_KF_LOSS = 0.8; // condition aki severity 1 → Kf × 0.2 [ENG]; FU-9 H6: also the nephron share TGF defends
/** FU-9 H6: intrinsic AKI's afferent tone — the afferent floor rises × (1 + AKI_AFF_TONE·aki) [ENG, Ali's Q]. */
export const AKI_AFF_TONE = 1;
```

In `packages/engine-core/src/l2/renal/model.ts`, find:

```ts
  AKI_KF_LOSS, ALBUMIN0_G_L, ANG_TAU_S, BLADDER_CAP_ML, FUROSEMIDE_EC50_REF, FUROSEMIDE_ED50_MG, FUROSEMIDE_EMAX, FUROSEMIDE_KA_PER_MIN, FUROSEMIDE_KE_PER_MIN,
```

replace with:

```ts
  AKI_AFF_TONE, AKI_KF_LOSS, ALBUMIN0_G_L, ANG_TAU_S, BLADDER_CAP_ML, FUROSEMIDE_EC50_REF, FUROSEMIDE_ED50_MG, FUROSEMIDE_EMAX, FUROSEMIDE_KA_PER_MIN, FUROSEMIDE_KE_PER_MIN,
```

find:

```ts
  SEPSIS_GFR_LOSS, TGF_TAU_S, UOP0_ML_KG_H, V_AT_15, V_AT_30, V_EXP_GAIN, V_EXP_MAX,
```

replace with:

```ts
  R_AFF_MAX, R_AFF_MIN, SEPSIS_GFR_LOSS, TGF_TAU_S, UOP0_ML_KG_H, V_AT_15, V_AT_30, V_EXP_GAIN, V_EXP_MAX,
```

find:

```ts
  return Math.min(V_EXP_MAX, 1 + V_EXP_GAIN * Math.max(0, bvRel - 1));
}
```

replace with:

```ts
  return Math.min(V_EXP_MAX, 1 + V_EXP_GAIN * Math.max(0, bvRel - 1));
}

/**
 * FU-9 H6 (research/13): `aki` severity is NEPHRON LOSS. The surviving nephrons' TGF defends only their own share of the
 * filtration (target gfrSet × (1 − AKI_KF_LOSS·aki): at severity 1 GFR ≈ 25 mL/min, KDIGO G4–5 — Ali's Q), and intrinsic
 * AKI's afferent vasoconstriction floors the afferent resistance at R_AFF_MIN × (1 + AKI_AFF_TONE·aki), so RBF falls
 * instead of rising (the TGF of a single nephron no longer restores the kidney's GFR by dilating it). Kf × (1 − loss) as before.
 */
function nephronTone(rAff: number, aki: number): number {
  return Math.min(R_AFF_MAX, Math.max(rAff, R_AFF_MIN * (1 + AKI_AFF_TONE * aki)));
}
```

find:

```ts
  s.rAff = tgfTarget(inp.map, pvn, k0, effFactor(s.ang), kfF, inp.albuminGL, s.p.gfrSet, pb, inp.hct);
```

replace with:

```ts
  s.rAff = nephronTone(tgfTarget(inp.map, pvn, k0, effFactor(s.ang), kfF, inp.albuminGL, s.p.gfrSet * (1 - AKI_KF_LOSS * aki), pb, inp.hct), aki);
```

find:

```ts
  const target = tgfTarget(inp.map, pvn, s.p.k, effF, kfF, inp.albuminGL, s.p.gfrSet, pb, inp.hct);
```

replace with:

```ts
  const target = nephronTone(tgfTarget(inp.map, pvn, s.p.k, effF, kfF, inp.albuminGL, s.p.gfrSet * (1 - AKI_KF_LOSS * s.p.aki), pb, inp.hct), s.p.aki);
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal test/l2/organs test/l2/pk test/engine/organs-renal.test.ts` → pass.
- [x] **Step 5 — RH runner:** `RH-09 RH-10 RH-11` (A0 Step 3's RH command, `RH_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7d): the aki condition is nephron loss with afferent tone (FU-9 H6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A11: H10 — cold diuresis (7d; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/renal/params.ts` (`COLD_ONSET_C`, `COLD_DIURESIS_PER_C`),
  `packages/engine-core/src/l2/renal/model.ts` (import, `coldDiuresis`, `RenalInputs.tempC`, the `fe` line),
  `packages/engine-core/src/l2/organs/pipeline.ts` (`renalIn`'s `tempC`)
- Create: `packages/engine-core/test/l2/renal/fu9-cold.test.ts`
- Overlap: none.

**Why / measured (main):** research/13 H10 / RH-20c: at 33 °C urine −26.5 % (the CO fall through H1). Decision D16.

**Prototype numbers:** unit 33 °C → × 1.4 of the excreted fraction; RH-20c +29 % (PL).

- [x] **Step 1 — the test.**

Create `packages/engine-core/test/l2/renal/fu9-cold.test.ts`:

```ts
// FU-9 Task A11 (H10; research/13 RH): the 7d kidney alone, on the FU-9 renal rig (70 kg, healthy reference inputs).
import { describe, expect, it } from 'vitest';
import { coldDiuresis } from '../../../src/l2/renal/model.ts';
import { RENAL_BASE, renalHold, uopMlKgH } from '../../helpers/fu9-renal.ts';

describe('FU-9 H10: cold diuresis (Polderman 2009)', () => {
  it('33 °C → × 1.4 of the excreted fraction; 37 °C unchanged', () => {
    expect(coldDiuresis(37)).toBe(1);
    expect(coldDiuresis(33)).toBeCloseTo(1.4, 9);
    expect(uopMlKgH(renalHold({ ...RENAL_BASE, tempC: 33 }, 1800))).toBeGreaterThan(1.3 * uopMlKgH(renalHold(RENAL_BASE, 1800)));
  });
});
```


- [x] **Step 2 — run; it fails.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal/fu9-cold.test.ts` → `coldDiuresis` missing.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/renal/params.ts`, find:

```ts
export const S_GA = 0.6; // surgical stress/ADH under GA, tables `S` [ENG] (0.4–0.8)
```

replace with:

```ts
/** FU-9 H10: cold diuresis onset and gain per °C [ENG, Ali's Q] (Polderman 2009: direction). */
export const COLD_ONSET_C = 35;
export const COLD_DIURESIS_PER_C = 0.2;
export const S_GA = 0.6; // surgical stress/ADH under GA, tables `S` [ENG] (0.4–0.8)
```

In `packages/engine-core/src/l2/renal/model.ts`, find:

```ts
  AKI_AFF_TONE, AKI_KF_LOSS, ALBUMIN0_G_L, ANG_TAU_S, BLADDER_CAP_ML, FUROSEMIDE_EC50_REF, FUROSEMIDE_ED50_MG, FUROSEMIDE_EMAX, FUROSEMIDE_KA_PER_MIN, FUROSEMIDE_KE_PER_MIN,
```

replace with:

```ts
  AKI_AFF_TONE, AKI_KF_LOSS, ALBUMIN0_G_L, COLD_DIURESIS_PER_C, COLD_ONSET_C, ANG_TAU_S, BLADDER_CAP_ML, FUROSEMIDE_EC50_REF, FUROSEMIDE_ED50_MG, FUROSEMIDE_EMAX, FUROSEMIDE_KA_PER_MIN, FUROSEMIDE_KE_PER_MIN,
```

find:

```ts
  return Math.min(R_AFF_MAX, Math.max(rAff, R_AFF_MIN * (1 + AKI_AFF_TONE * aki)));
}
```

replace with:

```ts
  return Math.min(R_AFF_MAX, Math.max(rAff, R_AFF_MIN * (1 + AKI_AFF_TONE * aki)));
}

/**
 * FU-9 H10 (research/13): cold diuresis — below COLD_ONSET_C tubular Na reabsorption and ADH responsiveness fall and the
 * excreted fraction rises (Polderman KH. Crit Care Med 2009;37:S186–S202) × (1 + COLD_DIURESIS_PER_C·(onset − T)⁺)
 * [ENG, Ali's Q]: 33 °C → × 1.4.
 */
export function coldDiuresis(tempC = 37): number {
  return 1 + COLD_DIURESIS_PER_C * Math.max(0, COLD_ONSET_C - tempC);
}
```

find:

```ts
  hct?: number;
```

replace with:

```ts
  hct?: number;
  /** FU-9 H10: core temperature, °C; absent → 37. */
  tempC?: number;
```

find:

```ts
  const fe = s.p.ef0 * natriuresis(inp.map - pv(inp) + RENAL_REF_CVP, s.p.pRef) * stress * s.vNh * expansionFactor(inp.bvRel) * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
```

replace with:

```ts
  const fe = s.p.ef0 * natriuresis(inp.map - pv(inp) + RENAL_REF_CVP, s.p.pRef) * coldDiuresis(inp.tempC) * stress * s.vNh * expansionFactor(inp.bvRel) * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis, demandRel: v.demandRel, hct: (3 * v.hb) / 100, // FU-9 H1, H2
```

replace with:

```ts
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis, demandRel: v.demandRel, hct: (3 * v.hb) / 100, tempC: v.tempC, // FU-9 H1, H2, H10
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/renal test/l2/organs test/engine/thermal-warmer.test.ts` → pass.
- [x] **Step 5 — RH runner:** `RH-20` (A0 Step 3's RH command, `RH_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7d): cold diuresis below 35 °C (FU-9 H10)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A12: H3 — one hepatic flow: CO/CO₀ × 7d's splanchnic and outflow factor (7c + 7d; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/liver/liver.ts` (`HEPATIC_OUTFLOW_PER_MMHG`, `LiverInputs.outflowMmHg`, `hbfFactor`),
  `packages/engine-core/src/l2/blood/core.ts` (`hbfRel`), `packages/engine-core/src/l2/organs/inputs.ts`
  (`BloodLike.core.hbfFactor`), `packages/engine-core/src/l2/organs/pipeline.ts` (import, `liverIn`'s outflow, the write)
- Create: `packages/engine-core/test/l2/blood/fu9-hepatic.test.ts`
- Modify: `packages/engine-core/test/engine/neuro-engine.test.ts` (FU-4's pre-declared `it.fails` "depth-index nadir < 52"
  FLIPS to `it`: nadir 52 → 50 — propofol's flow-limited clearance reads the new hepatic flow; bisected to this task)
- Overlap: FU-7 does not edit `hbfRel` (7g reads it); FU-6's `core.ts` lines are elsewhere.

**Why / measured (main):** research/13 H3 (RH-16: sevoflurane 1 MAC HBF +5.6 %; RH-06d: IAP 20 HBF 0 %; PEEP 15 −29 %
from CO² alone). Decision D17 (A3's citrate clearance reads CO/CO₀, not `hbfRel`: not moved).

**Prototype numbers:** unit — factor 1 at rest, × 0.8 at 1 MAC, × 0.6 in class III, × 0.9 at CVP 10, × 0.7 at IAP 20;
7c hbfRel = 0.8 × 0.8 = 0.64. RH-16 −15.3 % (PL), RH-06d −26 % (PL), RH-02c HBF/CO 0.68 (PL).

- [x] **Step 1 — the test.**

Create `packages/engine-core/test/l2/blood/fu9-hepatic.test.ts`:

```ts
// FU-9 Task A12 (H3; research/13): hepatic blood flow = CO/CO0 × 7d's splanchnic/outflow factor (7d's `hbfFactor`, dead
// code with 7c present before FU-9), the (CO/CO0)² fallback without 7d.
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { hbfFactor, type LiverInputs } from '../../../src/l2/liver/liver.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const L: LiverInputs = { coLpm: 5.6, co0Lpm: 5.6, bvRel: 1, alphaE: 0, volatileMac: 0, tempC: 37, gfrRel: 1, do2MlKgMin: 14 };

describe('FU-9 H3: one hepatic flow with 7d\'s splanchnic and outflow factor', () => {
  it('7d factor: 1 at rest; sevoflurane 1 MAC × 0.8; class III (bvRel 0.7) × 0.6; CVP 10 × 0.9; IAP 20 × 0.7', () => {
    expect(hbfFactor(L)).toBe(1);
    expect(hbfFactor({ ...L, volatileMac: 1 })).toBeCloseTo(0.8, 9);
    expect(hbfFactor({ ...L, bvRel: 0.7 })).toBeCloseTo(0.6, 9);
    expect(hbfFactor({ ...L, outflowMmHg: 10 })).toBeCloseTo(0.9, 9);
    expect(hbfFactor({ ...L, outflowMmHg: 20 })).toBeCloseTo(0.7, 9);
  });
  it('7c: hbfRel = CO/CO0 × the factor 7d writes (0.8 × 0.8 = 0.64); without 7d the (CO/CO0)² fallback (0.64 too at CO 0.8)', () => {
    const a = createBloodCore(MAN, 5.25, 40);
    (a as unknown as { hbfFactor: number }).hbfFactor = 0.8;
    stepBloodCore(a, { t: 0, coLpm: 0.8 * 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    expect(a.out.hbfRel).toBeCloseTo(0.64, 9);
    const b = createBloodCore(MAN, 5.25, 40);
    (b as unknown as { hbfFactor: number }).hbfFactor = 1;
    stepBloodCore(b, { t: 0, coLpm: 0.8 * 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    expect(b.out.hbfRel).toBeCloseTo(0.8, 9); // the per-breath CO swing is no longer squared
  });
});
```

In `packages/engine-core/test/engine/neuro-engine.test.ts`, find:

```ts
  // unchanged, kept as a record.
  it.fails('propofol 2 mg/kg: depth-index nadir < 52 — measured 52 after FU-4 F4 (51 before)', async () => {
```

replace with:

```ts
  // unchanged, kept as a record. FU-9 Task A12 (H3) flips it: hepatic flow = CO/CO0 × 7d's factor, so propofol's
  // flow-limited clearance under this rig is slightly lower and the nadir is back below 52.
  it('propofol 2 mg/kg: depth-index nadir < 52 — measured 50 with FU-9 A12 (52 after FU-4 F4, 51 before)', async () => {
```

find:

```ts
    await run(e, 180);
    expect(Math.min(...an.map((a) => a.di))).toBeLessThan(52);
```

replace with:

```ts
    await run(e, 180);
    console.log(`neuro-engine propofol 2 mg/kg: depth-index nadir ${Math.min(...an.map((a) => a.di))}`);
    expect(Math.min(...an.map((a) => a.di))).toBeLessThan(52);
```


- [x] **Step 2 — run; it fails.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-hepatic.test.ts` → `hbfRel` 0.64 at CO 0.8 whatever the factor.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/liver/liver.ts`, find:

```ts
export const VOLATILE_HBF_PER_MAC = 0.2; // ×0.8 at 1 MAC volatile (tables `hbfFactor`)
```

replace with:

```ts
export const VOLATILE_HBF_PER_MAC = 0.2; // ×0.8 at 1 MAC volatile (tables `hbfFactor`)
export const HEPATIC_OUTFLOW_PER_MMHG = 0.02; // FU-9 H3 [ENG]
```

find:

```ts
  tempC: number;
  gfrRel: number; // kidney's GFR ÷ its set point (renal share of lactate clearance)
```

replace with:

```ts
  tempC: number;
  /** FU-9 H3: the hepatic outflow pressure, max(CVP, IAP), mmHg; absent → 5 (no outflow term). */
  outflowMmHg?: number;
  gfrRel: number; // kidney's GFR ÷ its set point (renal share of lactate clearance)
```

find:

```ts
/** Splanchnic/hepatic flow factor: sympathetic constriction with volume loss (full at −30 %) or α-agonists, volatile ×0.8/MAC. */
export function hbfFactor(inp: LiverInputs): number {
  const symp = Math.min(1, Math.max(inp.alphaE, (1 - inp.bvRel) / 0.3));
  return (1 - SPLANCHNIC_GAIN * symp) * Math.max(0.5, 1 - VOLATILE_HBF_PER_MAC * inp.volatileMac);
```

replace with:

```ts
/**
 * Splanchnic/hepatic flow factor: sympathetic constriction with volume loss (full at −30 %) or α-agonists, volatile
 * ×0.8/MAC, and (FU-9 H3) the hepatic OUTFLOW pressure — CVP or intra-abdominal pressure above 5 mmHg lowers the portal
 * and hepatic-arterial flow 2 %/mmHg [ENG, research/13: PEEP 15 HBF −10–35 %; IAP 20 −30–40 %, Diebel 1992]. FU-9 H3:
 * 7c multiplies it with CO/CO0 (7d writes it into `blood.core.hbfFactor`), so it is no longer dead code with 7c present.
 */
export function hbfFactor(inp: LiverInputs): number {
  const symp = Math.min(1, Math.max(inp.alphaE, (1 - inp.bvRel) / 0.3));
  const outflow = Math.max(0.3, 1 - HEPATIC_OUTFLOW_PER_MMHG * Math.max(0, (inp.outflowMmHg ?? 5) - 5));
  return (1 - SPLANCHNIC_GAIN * symp) * Math.max(0.5, 1 - VOLATILE_HBF_PER_MAC * inp.volatileMac) * outflow;
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  const hbfRel = Math.min(1.5, Math.max(0, x.coLpm / bc.co0) ** HBF_EXP);
```

replace with:

```ts
  // FU-9 H3 (research/13): with 7d, hepatic flow = CO/CO0 × 7d's splanchnic/outflow factor (sympathetic, α-agonist,
  // volatile, CVP/IAP); without 7d, the (CO/CO0)^HBF_EXP fallback
  const coRel = Math.max(0, x.coLpm / bc.co0);
  const hf = (bc as { hbfFactor?: number }).hbfFactor;
  const hbfRel = Math.min(1.5, hf === undefined ? coRel ** HBF_EXP : coRel * hf);
```

In `packages/engine-core/src/l2/organs/inputs.ts`, find:

```ts
  core?: { liver?: number; renal?: RenalSeam; so?: { set?: { k?: number } }; out?: { k?: number; na?: number } }; // FU-9 F6: K and its set point; R4: Na
```

replace with:

```ts
  core?: { liver?: number; hbfFactor?: number; renal?: RenalSeam; so?: { set?: { k?: number } }; out?: { k?: number; na?: number } }; // FU-9 F6/R4/H3
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
import { createLiver, lacProdBasal, stepLiver, type LiverInputs, type LiverState } from '../liver/liver.ts';
```

replace with:

```ts
import { createLiver, hbfFactor, lacProdBasal, stepLiver, type LiverInputs, type LiverState } from '../liver/liver.ts';
```

find:

```ts
    tempC: v.tempC, gfrRel: os.kidney.gfrRel, do2MlKgMin: do2, ...(v.hbfRel !== null ? { hbfRel: v.hbfRel } : {}),
```

replace with:

```ts
    tempC: v.tempC, gfrRel: os.kidney.gfrRel, do2MlKgMin: do2, ...(v.hbfRel !== null ? { hbfRel: v.hbfRel } : {}),
    outflowMmHg: Math.max(v.cvp, os.iap), // FU-9 H3
```

find:

```ts
    core.liver = os.liver.liverFn * os.liver.tempF; // function only: 7c multiplies its own hbfRel (addendum 14)
```

replace with:

```ts
    core.liver = os.liver.liverFn * os.liver.tempF; // function only: 7c multiplies its own hbfRel (addendum 14)
    core.hbfFactor = hbfFactor(liverIn(os, v)); // FU-9 H3: the splanchnic/outflow factor 7c multiplies with CO/CO0
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/liver test/l2/organs test/l2/pk test/engine/pk-acceptance-pk.test.ts
  test/engine/blood-sanity-haem.test.ts test/engine/neuro-engine.test.ts` → pass (the flipped nadir `it`).
- [x] **Step 5 — RH runner:** `RH-02c RH-06d RH-12 RH-13 RH-15 RH-16 RH-20` (A0 Step 3's RH command, `RH_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7c,7d): hepatic flow is CO/CO0 x the splanchnic and outflow factor (FU-9 H3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task A13: H8 — mannitol is 7c's plasma osmole, cleared by 7d's kidney (7c + 7d; Part A)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/solutes.ts` (`SoluteState.mannitol`, `Conc.mannitol`, `concOf`, `osmEcf`,
  `removePlasma`), `packages/engine-core/src/l2/blood/core.ts` (import, `RenalSeam.excretion.mannitol`, the seam and the
  no-7d clearance), `packages/engine-core/src/l2/blood/pipeline.ts` (import, the `mannitol` dose),
  `packages/engine-core/src/l2/renal/model.ts` (import, `RenalInputs.mannitolMmol`, `mannitolExcretionGMin`, the
  osmotic-diuresis line), `packages/engine-core/src/l2/organs/{inputs,pipeline}.ts` (the view's `mannitolMmol`, the
  seam's type and value, `observeDoses`)
- Create: `packages/engine-core/test/l2/blood/fu9-mannitol.test.ts`, `test/engine/fu9-mannitol.test.ts`
- Overlap: none (A8's brain lines are not touched: the brain keeps its dose term, D8).

**Why / measured (main):** research/13 H8 (RH-08a/c): 1 g/kg — blood volume −2 mL at its maximum, osmolality +0.2, Na
+0.1; 7d kept two private pools. Decision D18.

**Prototype numbers:** engine test at 15 min — BV +73 mL, Na −7.6, osmolality +8.7 (band +20–30 → `it.fails`, Open
question 12); unit — 15 min osm +8.5, Na −7.6, plasma +116 mL, 0.40–0.50 left at 2 h without 7d. RH-08a BV peak +114
(PL), RH-08b extra urine 725 mL in 3 h (PL). **FU-4 check:** `organs-tbi-treatment` mannitol −25 % holds.

- [x] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-mannitol.test.ts`:

```ts
// FU-9 Task A13 (H8; research/13): mannitol is an effective ECF osmole in 7c's pool, which 7d's kidney clears.
import { describe, expect, it } from 'vitest';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { MANNITOL_MOSM_PER_G } from '../../../src/l2/brain/params.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };

describe('FU-9 H8: mannitol as a plasma osmole', () => {
  it('1 g/kg: osmolality up, Na DOWN (water leaves the cells: translocational), a transient plasma expansion; without 7d t½ 2 h', () => {
    const bc = createBloodCore(MAN, 5.25, 40);
    const step = (t: number) => stepBloodCore(bc, { t, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
    step(0);
    const o0 = bc.out.osm;
    const na0 = bc.out.na;
    const vp0 = bc.fl.vp;
    bc.so.mannitol = 70 * MANNITOL_MOSM_PER_G;
    for (let k = 1; k <= 9000; k++) step(k / 10);
    console.log(`FU-9 H8: 15 min osm +${(bc.out.osm - o0).toFixed(1)}, Na ${(bc.out.na - na0).toFixed(1)}, plasma +${(bc.fl.vp - vp0).toFixed(0)} mL`);
    expect(bc.out.osm - o0).toBeGreaterThan(5);
    expect(bc.out.na).toBeLessThan(na0 - 3);
    expect(bc.fl.vp).toBeGreaterThan(vp0);
    for (let k = 9001; k <= 72000; k++) step(k / 10); // to 2 h after the dose
    const left = (bc.so.mannitol ?? 0) / (70 * MANNITOL_MOSM_PER_G);
    expect(left).toBeGreaterThan(0.4); // t½ 2 h (7d's MANNITOL_KE_PER_MIN), plus what the expanded plasma's elimination carries
    expect(left).toBeLessThan(0.5);
  });
});
```

Create `packages/engine-core/test/engine/fu9-mannitol.test.ts`:

```ts
// FU-9 Task A13 (H8; research/13 RH-08): mannitol 1 g/kg is an effective ECF osmole in 7c's pool — it draws water from the
// cells (plasma volume up, Na down: translocational hyponatraemia) before 7d's kidney clears it. "GA vent" (helpers/fu9.ts),
// mannitol at 300 s against the same timeline without it.
import { describe, expect, it } from 'vitest';
import { arm, bvMl, ev, GA_VENT, once, st } from '../helpers/fu9.ts';

const T = 300;
const read = once(async () => {
  const f = (e: Parameters<typeof bvMl>[0]) => ({ bv: bvMl(e), na: st(e).blood.out.na, osm: st(e).blood.out.osm });
  const p = await arm([...GA_VENT, [T, ev({ kind: 'drug', drugId: 'mannitol', dose: 1, unit: 'g/kg', route: 'iv' })]], [T + 900], f);
  const c = await arm(GA_VENT, [T + 900], f);
  const [a, b] = [p[0], c[0]] as { bv: number; na: number; osm: number }[];
  return { dBv: (a as { bv: number }).bv - (b as { bv: number }).bv, dNa: (a as { na: number }).na - (b as { na: number }).na, dOsm: (a as { osm: number }).osm - (b as { osm: number }).osm };
});

describe('FU-9 H8: mannitol is a plasma osmole (research/13 RH-08)', { timeout: 600_000 }, () => {
  it('1 g/kg, at 15 min: blood volume up ≥ 50 mL, Na down ≥ 3 mmol/L, osmolality up ≥ 5 (measured +73 mL, −7.6, +8.7; main −2 mL, +0.1, +0.2)', async () => {
    const r = await read();
    console.log(`FU-9 H8 mannitol 15 min: BV ${r.dBv.toFixed(0)} mL, Na ${r.dNa.toFixed(1)}, osm ${r.dOsm.toFixed(1)}`);
    expect(r.dBv).toBeGreaterThanOrEqual(50);
    expect(r.dNa).toBeLessThanOrEqual(-3);
    expect(r.dOsm).toBeGreaterThanOrEqual(5);
  });
  // R45 (RH-08c): measured osmolality +20–30 mOsm/kg after 1 g/kg (the osmolal gap). 7c's pool is the whole ECF (≈ 14 L:
  // 385 mOsm → +27 at once), and the water it draws from the cells dilutes it within minutes; measured +8.7 — Ali's
  // question (OQ12: the distribution volume in the first minutes, or the band read as a peak).
  it.fails('1 g/kg: osmolality +20–30 mOsm/kg at 15 min (RH-08c) — measured +8.7', async () => {
    expect((await read()).dOsm).toBeGreaterThanOrEqual(20);
  });
});
```


- [x] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-mannitol.test.ts test/engine/fu9-mannitol.test.ts` → the
  engine test reads BV −2, Na +0.1, osmolality +0.2.
- [x] **Step 3 — implement.**

In `packages/engine-core/src/l2/blood/solutes.ts`, find:

```ts
  osmOther: number; // glycine and other non-Na effective osmoles
```

replace with:

```ts
  osmOther: number; // glycine and other non-Na effective osmoles
  mannitol?: number; // FU-9 H8: mannitol, mmol — an effective ECF osmole (absent = 0); cleared by 7d's kidney
```

find:

```ts
  citrate: number; osmOther: number; lactate: number; pi: number;
}
```

replace with:

```ts
  citrate: number; osmOther: number; lactate: number; pi: number;
  mannitol: number; // FU-9 H8
}
```

find:

```ts
    metab: s.metab / v, citrate: s.citrate / v, osmOther: s.osmOther / v, pi: s.pi / v,
```

replace with:

```ts
    metab: s.metab / v, citrate: s.citrate / v, osmOther: s.osmOther / v, pi: s.pi / v, mannitol: (s.mannitol ?? 0) / v,
```

find:

```ts
/** Effective ECF osmolality (mOsm/kg): 2·Na + 10 (glucose + urea at normal) + other osmoles. */
export function osmEcf(c: Conc): number {
  return 2 * c.na + 10 + c.osmOther;
```

replace with:

```ts
/** Effective ECF osmolality (mOsm/kg): 2·Na + 10 (glucose + urea at normal) + other osmoles + mannitol. */
export function osmEcf(c: Conc): number {
  return 2 * c.na + 10 + c.osmOther + c.mannitol; // FU-9 H8: mannitol is an effective ECF osmole
```

find:

```ts
  for (const k of ['na', 'k', 'cl', 'ca', 'mg', 'xa', 'keto', 'metab', 'citrate', 'osmOther', 'pi'] as const) s[k] -= s[k] * f;
```

replace with:

```ts
  for (const k of ['na', 'k', 'cl', 'ca', 'mg', 'xa', 'keto', 'metab', 'citrate', 'osmOther', 'pi'] as const) s[k] -= s[k] * f;
  if (s.mannitol) s.mannitol -= s.mannitol * f; // FU-9 H8
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
import { bloodPatient, HBF_EXP, NORMAL, type BloodPatient } from './params.ts';
```

replace with:

```ts
import { bloodPatient, HBF_EXP, NORMAL, type BloodPatient } from './params.ts';
import { MANNITOL_KE_PER_MIN } from '../renal/params.ts'; // FU-9 H8: 7d's renal mannitol clearance, the fallback without 7d
```

find:

```ts
  excretion: { k: number; na: number; cl: number; gluconate: number }; // mmol/h (gluconate: Plasma-Lyte's anion, decision 3)
```

replace with:

```ts
  excretion: { k: number; na: number; cl: number; gluconate: number; mannitol?: number }; // mmol/h (gluconate: Plasma-Lyte's anion, decision 3; FU-9 H8: mannitol)
```

find:

```ts
    so.xa -= rn.excretion.gluconate * dtH;
```

replace with:

```ts
    so.xa -= rn.excretion.gluconate * dtH;
    if (so.mannitol) so.mannitol = Math.max(0, so.mannitol - (rn.excretion.mannitol ?? 0) * dtH); // FU-9 H8: the kidney clears it
```

find:

```ts
  for (const g of r.given) addFluid(so, g.ml, g.comp);
```

replace with:

```ts
  if (!rn && so.mannitol) so.mannitol *= Math.exp((-MANNITOL_KE_PER_MIN * dtS) / 60); // FU-9 H8: no 7d — the kidney's own t½ 2 h
  for (const g of r.given) addFluid(so, g.ml, g.comp);
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
import { ivInflow } from '../thermal/environment.ts'; // Stage 7e (E-7e-1)
```

replace with:

```ts
import { ivInflow } from '../thermal/environment.ts'; // Stage 7e (E-7e-1)
import { MANNITOL_MOSM_PER_G } from '../brain/params.ts'; // FU-9 H8
```

find:

```ts
      case 'hypertonicSaline':
```

replace with:

```ts
      case 'mannitol': // FU-9 H8: an effective ECF osmole in 7c's pool; 7d's kidney clears it from here
        c.so.mannitol = (c.so.mannitol ?? 0) + g * MANNITOL_MOSM_PER_G;
        break;
      case 'hypertonicSaline':
```

In `packages/engine-core/src/l2/renal/model.ts`, find:

```ts
import { angiotensin, effFactor, natriuresis, renalHaemo, tgfTarget } from './kidney.ts';
```

replace with:

```ts
import { MANNITOL_MOSM_PER_G } from '../brain/params.ts'; // FU-9 H8
import { angiotensin, effFactor, natriuresis, renalHaemo, tgfTarget } from './kidney.ts';
```

find:

```ts
  tempC?: number;
}
```

replace with:

```ts
  tempC?: number;
  /** FU-9 H8: 7c's plasma mannitol amount, mmol (ONE pool); absent → the kidney's own depot (`mannitolG`, no 7c). */
  mannitolMmol?: number;
}
```

find:

```ts
  return 1 + COLD_DIURESIS_PER_C * Math.max(0, COLD_ONSET_C - tempC);
}
```

replace with:

```ts
  return 1 + COLD_DIURESIS_PER_C * Math.max(0, COLD_ONSET_C - tempC);
}

/** Mannitol excreted, g/min: first order at the renal clearance (t½ 2 h at the reference GFR), from 7c's plasma pool
 *  (FU-9 H8) or, without 7c, the kidney's own depot. 7c removes the same amount through the seam. */
export function mannitolExcretionGMin(s: RenalState, inp: RenalInputs): number {
  const g = inp.mannitolMmol !== undefined ? inp.mannitolMmol / MANNITOL_MOSM_PER_G : s.mannitolG;
  return MANNITOL_KE_PER_MIN * g * Math.min(1, s.gfr / Math.max(1, s.p.gfrSet));
}
```

find:

```ts
  const mannitol = MANNITOL_ML_PER_G * MANNITOL_KE_PER_MIN * s.mannitolG * Math.min(1, s.gfr / Math.max(1, s.p.gfrSet));
```

replace with:

```ts
  const mannitol = MANNITOL_ML_PER_G * mannitolExcretionGMin(s, inp); // FU-9 H8: from 7c's pool when present
```

In `packages/engine-core/src/l2/organs/inputs.ts`, find:

```ts
  osm: number | null; // FU-9 F11: 7c's plasma effective osmolality, mOsm/kg (null without 7c)
  demandRel: number; // FU-9 H1: Stage 3's O2 demand ÷ rest (GA, temperature, fever) — the kidney's reference output
```

replace with:

```ts
  osm: number | null; // FU-9 F11: 7c's plasma effective osmolality, mOsm/kg (null without 7c)
  demandRel: number; // FU-9 H1: Stage 3's O2 demand ÷ rest (GA, temperature, fever) — the kidney's reference output
  mannitolMmol: number | null; // FU-9 H8: 7c's plasma mannitol, mmol (null without 7c: the kidney's own depot)
```

find:

```ts
    demandRel: metabolic(rs, t, 'o2'), // FU-9 H1
```

replace with:

```ts
    demandRel: metabolic(rs, t, 'o2'), // FU-9 H1
    mannitolMmol: b?.core ? (b.core.so?.mannitol ?? 0) : null, // FU-9 H8
```

find:

```ts
export type RenalSeam = { uopAboveBasalMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
```

replace with:

```ts
export type RenalSeam = { uopAboveBasalMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number; mannitol?: number } }; // FU-9 H8
```

find:

```ts
  core?: { liver?: number; hbfFactor?: number; renal?: RenalSeam; so?: { set?: { k?: number } }; out?: { k?: number; na?: number } }; // FU-9 F6/R4/H3
```

replace with:

```ts
  core?: { liver?: number; hbfFactor?: number; renal?: RenalSeam; so?: { set?: { k?: number }; mannitol?: number }; out?: { k?: number; na?: number } }; // FU-9 F6/R4/H3/H8
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
import { createRenal, expansionFactor, giveMannitolRenal, stepRenal, uopOver, type RenalInputs, type RenalState } from '../renal/model.ts';
```

replace with:

```ts
import { createRenal, expansionFactor, giveMannitolRenal, mannitolExcretionGMin, stepRenal, uopOver, type RenalInputs, type RenalState } from '../renal/model.ts';
```

find:

```ts
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis, demandRel: v.demandRel, hct: (3 * v.hb) / 100, tempC: v.tempC, // FU-9 H1, H2, H10
```

replace with:

```ts
  pawExcessCmH2O: v.pawExcessCmH2O, alphaExcess: alphaExcess(v), sepsis: v.drugs.sepsis, demandRel: v.demandRel, hct: (3 * v.hb) / 100, tempC: v.tempC, // FU-9 H1, H2, H10
  ...(v.mannitolMmol !== null ? { mannitolMmol: v.mannitolMmol } : {}), // FU-9 H8: 7c's pool
```

find:

```ts
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, osm: null, demandRel: 1, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
```

replace with:

```ts
    tempC: l1Target(l1, 'tempCore', 0), hb: 14, albuminGL: 42, bvRel: 1, osm: null, demandRel: 1, mannitolMmol: null, hbfRel: null, lactate: null, gluconate: 0, anaesthesia: 'none',
```

find:

```ts
function renalSeam(s: RenalState, gluconate: number, natriuresis = { share: 0, naMmolL: URINE_NA }, kRel = 1): RenalSeam {
```

replace with:

```ts
function renalSeam(s: RenalState, gluconate: number, natriuresis = { share: 0, naMmolL: URINE_NA }, kRel = 1, mannitolMmolH = 0): RenalSeam {
```

find:

```ts
  return { uopAboveBasalMlH: lH * 1000, excretion: { k, na, cl: 0.9 * (na + k), gluconate: ((s.gfr * 60) / 1000) * gluconate * GLUCONATE_EXCRETED } };
```

replace with:

```ts
  return { uopAboveBasalMlH: lH * 1000, excretion: { k, na, cl: 0.9 * (na + k), gluconate: ((s.gfr * 60) / 1000) * gluconate * GLUCONATE_EXCRETED, mannitol: mannitolMmolH } };
```

find:

```ts
function observeDoses(os: OrgansState, doses: readonly OrganDose[]): void {
```

replace with:

```ts
function observeDoses(os: OrgansState, doses: readonly OrganDose[], blood7c = false): void {
```

find:

```ts
      giveMannitolRenal(os.renal, g);
```

replace with:

```ts
      if (!blood7c) giveMannitolRenal(os.renal, g); // FU-9 H8: with 7c the plasma pool is 7c's (the kidney reads it)
```

find:

```ts
    core.renal = renalSeam(os.renal, v.gluconate, natri, kRel);
```

replace with:

```ts
    const manH = mannitolExcretionGMin(os.renal, renalIn(os, v)) * 60 * MANNITOL_MOSM_PER_G; // FU-9 H8: mmol/h cleared from 7c's pool
    core.renal = renalSeam(os.renal, v.gluconate, natri, kRel, manH);
```

find:

```ts
  observeDoses(os, readDrugView(ctx).doses); // once per engine pass: 7g lists each accepted bolus for exactly one pass
```

replace with:

```ts
  observeDoses(os, readDrugView(ctx).doses, bloodCore(ctx.blood) !== null); // once per engine pass: 7g lists each accepted bolus for exactly one pass
```


- [x] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/renal test/l2/organs test/l2/brain test/engine/fu9-mannitol.test.ts
  test/engine/organs-tbi-treatment.test.ts` → pass.
- [x] **Step 5 — RH runner:** `RH-08 RH-23` (A0 Step 3's RH command, `RH_OUT=out/<task>.json`).
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7c,7d): mannitol is a plasma osmole in 7c, cleared by the kidney (FU-9 H8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

## Part B — after FU-7 merges

### Task B0: Part B base — FU-7 merged

- [x] **Step 1.** `git fetch origin && git log --oneline origin/main | head` — FU-7's merge commit must be on main (and
  therefore FU-6's). If not, stop Part B (Global Constraints: Part A's Gate runs alone).
- [x] **Step 2.** `git merge origin/main` (no stash; resolve by content).
- [x] **Step 3 — Part B anchors.** Each must print exactly ONE line (the fixer checked them on `2473f0b` with FU-7 Task
  14 Step 2's call line substituted, and against FU-7's Task 14 / E-FU7-7 blocks):

```
git grep -n -F "  tempC: number; // core temperature" -- packages/engine-core/src/l2/neuro/interactions.ts
git grep -n -F "  let nd = vol * mg * cold;" -- packages/engine-core/src/l2/neuro/interactions.ts
git grep -n -F "  return { rocuronium: nd, vecuronium: nd, cisatracurium: nd, succinylcholine: dep };" -- packages/engine-core/src/l2/neuro/interactions.ts
git grep -n -F "mgMmolL: env.mgMmolL ?? ns.profile.mgMmolL, iCaMmolL: env.iCaMmolL, tempC: env.tempC });" -- packages/engine-core/src/l2/neuro/pipeline.ts
git grep -n -F "      tempC: ps.resp.temp.tc, mechanical: src7f === 'ventilator'" -- packages/engine-core/src/engine.ts
git grep -n -F "export const PACO2_REST_MMHG = 40;" -- packages/engine-core/src/l2/gas/params.ts
git grep -n -F "    paco2Rest: PACO2_REST_MMHG, // FU-4 F4 / R1(a)" -- packages/engine-core/src/l2/gas/params.ts
git grep -n -F "  const core = createBloodCore(profile, CI_LPM_PER_KG * gasPatient(profile).effKg, NORMAL.paco2);" -- packages/engine-core/src/l2/blood/pipeline.ts
git grep -n -F "  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));" -- packages/engine-core/src/l2/blood/core.ts
git grep -n -F "import { bloodPatient, HBF_EXP, NORMAL, type BloodPatient } from './params.ts';" -- packages/engine-core/src/l2/blood/core.ts
```

  (`NeuroEnv`'s `  tempC: number;\n  mechanical: boolean;` pair is checked by eye.) A miss means FU-6/FU-7 moved the line:
  re-anchor by the quoted statement, never re-type a line you are not changing.

### Task B1: F10 — hypokalaemia potentiates the non-depolarisers, on FU-7's electrolyte path (7f; Part B, R6)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/interactions.ts` (`InteractionCtx.kMmolL`, the `nd` line, `HYPOK_*` and
  `hypokalaemiaMult` appended), `packages/engine-core/src/l2/neuro/pipeline.ts` (`NeuroEnv.kMmolL`; FU-7's merged
  `ec50Multipliers(…)` call line), `packages/engine-core/src/engine.ts` (the `stepNeuroTo` context's `tempC:` line —
  **E-FU9-2**)
- Create: `packages/engine-core/test/l2/neuro/fu9-hypokalaemia.test.ts`, `test/engine/fu9-rocuronium.test.ts`
- Overlap: FU-7 Task 14 rewrites `InteractionCtx`, the top of `ec50Multipliers` and the call line; this task runs after
  FU-7 merges and anchors on FU-7's MERGED text (the call-line block below is FU-7 Task 14 Step 2's replacement; the
  `InteractionCtx` block anchors on `tempC`, the field FU-7 keeps last).

**Why / measured (main):** research/22 F10 / BF-09b. Rocuronium 0.6 mg/kg: T1 25 % at 35.7 min at K 2.5 and 4.2.
Decision D10 (R6/R50 F9: inside `ec50Multipliers`, beside Mg and iCa).

**Prototype numbers:** engine test T1 25 % at 47.5 min (K 2.5) vs 35.8 (K 4.2) (Open question 9: the size is [ENG]).
**FU-4 check:** K ≥ 3.5 is exactly × 1.

- [ ] **Step 0 — merge.** `git fetch origin && git merge origin/main` (Task B0 has done it).
- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/neuro/fu9-hypokalaemia.test.ts`:

```ts
// FU-9 Task B1 (F10): hypokalaemia potentiates the non-depolarisers through 7c's plasma K.
import { describe, expect, it } from 'vitest';
import { HYPOK_FLOOR, hypokalaemiaMult } from '../../../src/l2/neuro/interactions.ts';

describe('FU-9 F10: hypokalaemic potentiation of non-depolarising block (Miller 10e ch. 27)', () => {
  it('EC50 × 1 at K ≥ 3.5 and without 7c; × 0.85 at 2.5; floored', () => {
    expect(hypokalaemiaMult(undefined)).toBe(1);
    expect(hypokalaemiaMult(4.2)).toBe(1);
    expect(hypokalaemiaMult(3.5)).toBe(1);
    expect(hypokalaemiaMult(2.5)).toBeCloseTo(0.85, 9);
    expect(hypokalaemiaMult(0.5)).toBe(HYPOK_FLOOR);
  });
});
```

Create `packages/engine-core/test/engine/fu9-rocuronium.test.ts`:

```ts
// FU-9 Task B1 (F10): hypokalaemia prolongs rocuronium (research/22 BF-09b). Rig = the BF runner's GA vent, profile K 2.5
// vs 4.2; rocuronium 0.6 mg/kg at 300 s; the time from the dose to T1 back at 25 % (7f's truth TOF).
import { describe, expect, it } from 'vitest';
import { arm, ev, GA_VENT, MAN, st } from '../helpers/fu9.ts';

const t25 = async (k: number): Promise<number> => {
  const at = Array.from({ length: 360 }, (_, i) => 600 + 10 * i); // 5–65 min after the dose, every 10 s
  const t1 = await arm([...GA_VENT, [300, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' })]], at,
    (e) => (st(e) as unknown as { neuro: { last: { tof: { t1: number } } } }).neuro.last.tof.t1, { ...MAN, blood: { k } });
  const i = t1.findIndex((v) => v >= 0.25);
  return i < 0 ? Number.POSITIVE_INFINITY : ((at[i] as number) - 300) / 60;
};

describe('FU-9 F10: hypokalaemia prolongs a non-depolarising block', { timeout: 600_000 }, () => {
  it('rocuronium 0.6 mg/kg: T1 25 % later at K 2.5 than at 4.2 by ≥ 1 min (was identical, 35.7 min)', async () => {
    const lo = await t25(2.5);
    const n = await t25(4.2);
    console.log(`FU-9 F10: T1 25 % at ${lo.toFixed(1)} min (K 2.5) vs ${n.toFixed(1)} min (K 4.2)`);
    expect(lo - n).toBeGreaterThanOrEqual(1);
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/fu9-hypokalaemia.test.ts test/engine/fu9-rocuronium.test.ts` →
  `hypokalaemiaMult` missing; engine: 35.7 vs 35.7 min.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/neuro/interactions.ts`, find:

```ts
  tempC: number; // core temperature
}
```

replace with:

```ts
  tempC: number; // core temperature
  /** FU-9 F10 (R50 ruling R6): 7c's plasma K (`blood.out.k`, mmol/L) — the third 7c electrolyte on FU-7's one path
   * (Mg, iCa, K); undefined without 7c keeps the pre-FU-9 behaviour. */
  kMmolL?: number;
}
```

find:

```ts
  let nd = vol * mg * cold;
```

replace with:

```ts
  let nd = vol * mg * cold * hypokalaemiaMult(x.kMmolL); // FU-9 F10: hypokalaemia potentiates the non-depolarisers
```

find:

```ts
  return { rocuronium: nd, vecuronium: nd, cisatracurium: nd, succinylcholine: dep };
}
```

replace with:

```ts
  return { rocuronium: nd, vecuronium: nd, cisatracurium: nd, succinylcholine: dep };
}

/**
 * FU-9 F10: hypokalaemia potentiates a non-depolarising block — the hyperpolarised end-plate needs less antagonist to
 * fail (Miller 10e ch. 27, "hypokalaemia enhances non-depolarising block"; Feldman 1963). EC50 × (1 − HYPOK_SLOPE·
 * (HYPOK_K − K)⁺), floor HYPOK_FLOOR [ENG size, Open question 9]; 1 at K ≥ 3.5 and without 7c.
 */
export const HYPOK_K = 3.5;
export const HYPOK_SLOPE = 0.15;
export const HYPOK_FLOOR = 0.7;
export function hypokalaemiaMult(kMmolL: number | undefined): number {
  return kMmolL === undefined ? 1 : Math.max(HYPOK_FLOOR, 1 - HYPOK_SLOPE * Math.max(0, HYPOK_K - kMmolL));
}
```

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  tempC: number;
  mechanical: boolean;
```

replace with:

```ts
  tempC: number;
  /** FU-9 F10: 7c's plasma K (`blood.out.k`, mmol/L); undefined without 7c. */
  kMmolL?: number;
  mechanical: boolean;
```

find:

```ts
  const m = ec50Multipliers({ profile: ns.profile.nm, volatileMac: x.macPotent, mgMmolL: env.mgMmolL ?? ns.profile.mgMmolL, iCaMmolL: env.iCaMmolL, tempC: env.tempC });
```

replace with:

```ts
  const m = ec50Multipliers({ profile: ns.profile.nm, volatileMac: x.macPotent, mgMmolL: env.mgMmolL ?? ns.profile.mgMmolL, iCaMmolL: env.iCaMmolL, tempC: env.tempC, kMmolL: env.kMmolL }); // FU-9 F10: 7c's K on FU-7's one electrolyte path
```

In `packages/engine-core/src/engine.ts`, find:

```ts
      tempC: ps.resp.temp.tc, mechanical: src7f === 'ventilator' || src7f === 'external' || src7f === 'bvm',
```

replace with:

```ts
      tempC: ps.resp.temp.tc, kMmolL: ps.blood.out.k > 0 ? ps.blood.out.k : undefined, mechanical: src7f === 'ventilator' || src7f === 'external' || src7f === 'bvm', // FU-9 F10: 7c's K (0 before its first step)
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro test/engine/fu9-rocuronium.test.ts test/engine/neuro-engine.test.ts` → pass.
- [ ] **Step 5 — BF runner:** `BF-09b` (A0 Step 3's command, `BF_OUT=out/<task>.json`).
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7f): hypokalaemia potentiates non-depolarising block on the one 7c electrolyte path (FU-9 F10, E-FU9-2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

### Task B2: F7 — a COPD retainer starts hypercapnic with its chronic renal compensation (gas profile + 7c; Part B)

**Files:**
- Modify: `packages/engine-core/src/l2/gas/params.ts` (**E-FU9-3**: `COPD_PACO2_REST`, `restingPaco2`, the `paco2Rest:` line
  of `gasPatient`), `packages/engine-core/src/l2/blood/pipeline.ts` (`createBloodState`), `packages/engine-core/src/l2/blood/core.ts`
  (the params import gains A7's `CHRONIC_HCO3_PER_MMHG`; the HCO₃/pH₀ lines of `createBloodCore`)
- Create: `packages/engine-core/test/l2/blood/fu9-chronic.test.ts`, `test/engine/fu9-copd.test.ts`
- Overlap: FU-6 adds pregnancy constants to `gas/params.ts` (other lines) and routes pregnancy through `setShift`; 7k
  reads COPD volumes, not PaCO₂. Part B because `l2/gas/**` is FU-6/7k's while in flight.

**Why / measured (main):** research/22 F7 / BF-16b and research/19 C7 / CM-07a. Every MODELED patient rests at PaCO₂ 40,
so COPD GOLD 3 is normocapnic (39.7, HCO₃ 24.35). Decision D9; the chronic constant is A7's (ONE copy, D7).

**Prototype numbers:** COPD GOLD 3 awake: PaCO₂ 44.1, HCO₃ 26.02, pH 7.383, +3.4 mmol/L HCO₃ per 10 mmHg (band 3–4.5); X-A unchanged.

- [ ] **Step 1 — the tests.**

Create `packages/engine-core/test/l2/blood/fu9-chronic.test.ts`:

```ts
// FU-9 Task B2 (F7): a COPD retainer starts at its own resting PaCO2 with its chronic renal compensation.
import { describe, expect, it } from 'vitest';
import { createBloodCore } from '../../../src/l2/blood/core.ts';
import { CHRONIC_HCO3_PER_MMHG } from '../../../src/l2/blood/params.ts';
import { gasPatient, PACO2_REST_MMHG, restingPaco2 } from '../../../src/l2/gas/params.ts';

const MAN = { ageY: 65, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const copd = (severity: number) => ({ ...MAN, lungConditions: [{ id: 'copd' as const, severity }] });

describe('FU-9 F7: chronic hypercapnia (tables §1.5, §5b.1; Brackett 1965)', () => {
  it('resting PaCO2 by GOLD grade 40 / 40 / 45 / 55; a healthy patient 40', () => {
    expect(restingPaco2(MAN)).toBe(PACO2_REST_MMHG);
    expect(restingPaco2(copd(0.25))).toBe(40);
    expect(restingPaco2(copd(0.5))).toBe(40);
    expect(restingPaco2(copd(0.75))).toBeCloseTo(45, 9);
    expect(restingPaco2(copd(1))).toBeCloseTo(55, 9);
    expect(gasPatient(copd(0.75)).paco2Rest).toBeCloseTo(45, 9);
  });
  it('GOLD 3 at PaCO2 45: HCO3 +3.5 per 10 mmHg (26.15), pH ≥ 7.37; a profile HCO3 is honoured', () => {
    const c = createBloodCore(copd(0.75), 5.25, 45);
    expect(CHRONIC_HCO3_PER_MMHG).toBe(0.35);
    expect(c.ab.hco3).toBeCloseTo(24.4 + 0.35 * 5, 1);
    expect(c.ab.ph).toBeGreaterThanOrEqual(7.37);
    expect(createBloodCore({ ...copd(0.75), blood: { hco3: 30 } }, 5.25, 45).ab.hco3).toBeCloseTo(30, 1);
    expect(createBloodCore(MAN, 5.25, 40).ab.hco3).toBeCloseTo(24.4, 2);
  });
});
```

Create `packages/engine-core/test/engine/fu9-copd.test.ts`:

```ts
// FU-9 Task B2 (F7): COPD GOLD 3 is a compensated retainer (research/22 BF-16b; research/19 CM-07a). Rig = the BF runner's
// awake, spontaneously breathing room-air patient (MODELED) with lung `copd` 0.75, read at 30 min against X-A.
import { describe, expect, it } from 'vitest';
import { arm, MAN, st } from '../helpers/fu9.ts';

describe('FU-9 F7: chronic hypercapnia with chronic renal compensation (tables §1.5; Brackett 1965)', { timeout: 300_000 }, () => {
  it('COPD GOLD 3: PaCO2 43–52 (was 39.7), HCO3 +3 to +4.5 per 10 mmHg above X-A (was +1.3), pH 7.35–7.45', async () => {
    const read = (e: Parameters<typeof st>[0]) => ({ paco2: st(e).resp.co2.pf, hco3: st(e).blood.core.ab.hco3, ph: st(e).blood.core.ab.ph });
    const [c] = await arm([], [1800], read, { ...MAN, lungConditions: [{ id: 'copd', severity: 0.75 }] });
    const [n] = await arm([], [1800], read);
    if (!c || !n) throw new Error('no sample');
    const per10 = (10 * (c.hco3 - n.hco3)) / (c.paco2 - n.paco2);
    console.log(`FU-9 F7: COPD PaCO2 ${c.paco2.toFixed(1)} HCO3 ${c.hco3.toFixed(2)} pH ${c.ph.toFixed(3)}; X-A ${n.paco2.toFixed(1)} / ${n.hco3.toFixed(2)} → ${per10.toFixed(2)} per 10 mmHg`);
    expect(c.paco2).toBeGreaterThanOrEqual(43);
    expect(c.paco2).toBeLessThanOrEqual(52);
    expect(per10).toBeGreaterThanOrEqual(3);
    expect(per10).toBeLessThanOrEqual(4.5);
    expect(c.ph).toBeGreaterThanOrEqual(7.35);
    expect(c.ph).toBeLessThanOrEqual(7.45);
  });
});
```


- [ ] **Step 2 — run; they fail.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood/fu9-chronic.test.ts test/engine/fu9-copd.test.ts` → `restingPaco2`
  missing; engine PaCO₂ 39.7.
- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l2/gas/params.ts`, find:

```ts
/** FU-4 F4 / R1(a): the healthy resting PaCO2 every profile starts from (pregnancy 31 under R10). */
export const PACO2_REST_MMHG = 40;
```

replace with:

```ts
/** FU-4 F4 / R1(a): the healthy resting PaCO2 every profile starts from (pregnancy 31 under R10). */
export const PACO2_REST_MMHG = 40;
/**
 * FU-9 F7 (research/22 BF-16b, research/19 C7): a chronic retainer's own resting PaCO2 — tables §1.5 COPD `paco2Set`
 * 40 / 40 / 45 / 55 mmHg at GOLD 1–4 (lung `copd` severity 0.25 / 0.5 / 0.75 / 1, linear between) [TXT]. It is the
 * MODELED drive's set point and the gas compartments' start (as PACO2_REST_MMHG is), and 7c builds the profile's chronic
 * renal compensation on it (blood/pipeline.ts createBloodState).
 */
export const COPD_PACO2_REST: readonly (readonly [number, number])[] = [[0.5, 40], [0.75, 45], [1, 55]];
export function restingPaco2(p: PatientProfile | undefined): number {
  const s = Math.min(1, Math.max(0, p?.lungConditions?.find((c) => c.id === 'copd')?.severity ?? 0));
  const k = COPD_PACO2_REST;
  for (let i = 1; i < k.length; i++) {
    const [x0, y0] = k[i - 1] as readonly [number, number];
    const [x1, y1] = k[i] as readonly [number, number];
    if (s <= x1) return s <= x0 ? PACO2_REST_MMHG : y0 + ((s - x0) / (x1 - x0)) * (y1 - y0);
  }
  return (k[k.length - 1] as readonly [number, number])[1];
}
```

find:

```ts
    paco2Rest: PACO2_REST_MMHG, // FU-4 F4 / R1(a) (pregnancy 31 when R10 lands)
```

replace with:

```ts
    paco2Rest: restingPaco2(p), // FU-4 F4 / R1(a) (pregnancy 31 when R10 lands); FU-9 F7: a COPD retainer's own set point
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
  const core = createBloodCore(profile, CI_LPM_PER_KG * gasPatient(profile).effKg, NORMAL.paco2);
```

replace with:

```ts
  const gp = gasPatient(profile);
  const core = createBloodCore(profile, CI_LPM_PER_KG * gp.effKg, gp.paco2Rest); // FU-9 F7: the patient's own resting PaCO2
```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  const hco3 = b.hco3 ?? NORMAL.hco3;
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));
```

replace with:

```ts
  // FU-9 F7: a chronic hypercapnic profile (resting PaCO2 above 40) starts with its chronic renal compensation, +0.35
  // mmol/L HCO3 per mmHg (tables §5b.1 "chronic (profile only): +0.35–0.4 per mmHg … set by the profile"; Brackett 1965,
  // Schwartz 1965), calibrated at that PaCO2; a given profile HCO3 is honoured
  const hco3 = b.hco3 ?? NORMAL.hco3 + CHRONIC_HCO3_PER_MMHG * Math.max(0, paco2 - NORMAL.paco2);
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * Math.max(NORMAL.paco2, paco2)));
```

find:

```ts
import { bloodPatient, HBF_EXP, NORMAL, type BloodPatient } from './params.ts';
```

replace with:

```ts
import { bloodPatient, CHRONIC_HCO3_PER_MMHG, HBF_EXP, NORMAL, type BloodPatient } from './params.ts';
```


- [ ] **Step 4 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/blood test/l2/gas test/l2/resp test/l2/lung test/engine/fu9-copd.test.ts
  test/engine/lung-copd.test.ts test/engine/resp-coupling.test.ts` → pass; if a 7b/Stage 3 COPD test pinned a resting
  PaCO₂ of 40 for GOLD 3, it is re-pinned to the tables' 45 with the reason (tables §1.5), never widened.
- [ ] **Step 5 — BF runner:** `BF-16b BF-15b` (A0 Step 3's command, `BF_OUT=out/<task>.json`).
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7b-profile,7c): COPD retainers rest at their tables PaCO2 with chronic renal compensation (FU-9 F7, E-FU9-3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

## Part C — after FU-8 A13 merges (R3)

### Task C0: Part C base — FU-8 A13 merged

- [x] **Step 1.** `git fetch origin && git merge origin/main`; `git ls-files packages/engine-core/src/l2/body-size.ts` must
  print the file (FU-8 A13), and `git grep -n "export function sizeWeightKg" -- packages/engine-core/src/l2/body-size.ts`
  one line. If not, stop Part C.
- [x] **Step 2 — Part C anchors** (each exactly one line):

```
git grep -n -F "  let bvKg = female ? b.bvF : b.bvM;" -- packages/engine-core/src/l2/blood/params.ts
git grep -n -F " * Patient scaling. Blood volume by band (tables §1.1) and Lemmens for adults" -- packages/engine-core/src/l2/blood/params.ts
git grep -n -F "toBeCloseTo(4807 + 11356, -1)" -- packages/engine-core/test/l2/blood/core.test.ts
```

- [x] **Step 3 — FU-8's signature.** The fixer's prototype used `sizeWeightKg(band, weightKg, heightCm?)` as at `b23a3ea`;
  if FU-8's merged signature differs, call it with the same meaning (the Lemmens-indexed size weight of this band), and
  the new test's equality with `resolveProfile().bloodVolumeMl` is the arbiter.

### Task C1: I-51 — 7c's blood volume on FU-8's one body-size rule (7c `params.ts`; Part C, R3)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/params.ts` (the `body-size.ts` import; `bloodPatient`'s doc and its BV lines)
- Modify: `packages/engine-core/test/l2/blood/{core,fluids,params}.test.ts` (the 4 807-mL pins → 4 900, declared in D20)
- Create: `packages/engine-core/test/l2/blood/fu9-body-size.test.ts`
- Overlap: FU-8 A13 creates `l2/body-size.ts` and moves the circulation onto it; FU-6 adds `hbRef` to `BloodPatient`
  (another line). The blocks were checked on `2473f0b` + FU-8's `b23a3ea` AND on this plan's Parts A + B.

**Why / measured:** FU-8 I-51 (one obese-patient definition): at 70 kg / 175 cm 7c holds 4 807 mL (its own capped
Lemmens branch) and the circulation 4 900 (FU-8 A13's size weight). Decision D20.

**Prototype numbers (on `2473f0b` + FU-8 A13):** 7c = the circulation for M/F 50–160 kg with and without a height;
default adult 4 900 mL, 127 kg / 175 cm 6 600 mL (52 mL/kg, tables 50–55); all 170 `test/l2` files pass. Moved BF rows:
BF-21b 2.95 → 3.35 (TW → PL), BF-04 dHb1h 0.746 → 0.729, BF-18b CO +4.1 → +1.9 %, BF-19 −1.0 → −3.8 %, second decimals elsewhere; no other verdict moves.

- [x] **Step 1 — the tests** (the new file fails: 4 807 ≠ 4 900).

In `packages/engine-core/test/l2/blood/core.test.ts`, find:

```ts
    expect(bloodMl(a.fl) + a.fl.visf).toBeCloseTo(4807 + 11356, -1); // at rest the fixed elimination removes nothing
```

replace with:

```ts
    expect(bloodMl(a.fl) + a.fl.visf).toBeCloseTo(4900 + 11305, -1); // at rest the fixed elimination removes nothing (FU-9 Part C: was 4807 + 11356)
```

In `packages/engine-core/test/l2/blood/fluids.test.ts`, find:

```ts
  it('70 kg man: BV 4.8 L, plasma 2.6 L, ISF 11.4 L, ICF 28 L, Hb 15, COP ≈ 22 mmHg (Landis–Pappenheimer at TP 6.4)', () => {
    const f = createFluids(ADULT, 40);
    expect(bloodMl(f)).toBeCloseTo(4807, -1);
    expect(f.vp).toBeCloseTo(2644, -1);
    expect(f.visf).toBeCloseTo(11356, -1);
```

replace with:

```ts
  // FU-9 Part C (R3): the 70 kg / 175 cm man is FU-8's anchor, 4 900 mL (was 4 807 by 7c's capped Lemmens branch):
  // plasma 2 695 (was 2 644), ISF 11 305 (was 11 356) — the definition moved, not the physiology
  it('70 kg man: BV 4.9 L, plasma 2.7 L, ISF 11.3 L, ICF 28 L, Hb 15, COP ≈ 22 mmHg (Landis–Pappenheimer at TP 6.4)', () => {
    const f = createFluids(ADULT, 40);
    expect(bloodMl(f)).toBeCloseTo(4900, -1);
    expect(f.vp).toBeCloseTo(2695, -1);
    expect(f.visf).toBeCloseTo(11305, -1);
```

find:

```ts
    expect(Math.abs(f.vp - 2644)).toBeLessThan(1);
    expect(Math.abs(f.visf - 11356)).toBeLessThan(1);
```

replace with:

```ts
    expect(Math.abs(f.vp - 2695)).toBeLessThan(1); // FU-9 Part C: was 2644 / 11356 (4 807 mL)
    expect(Math.abs(f.visf - 11305)).toBeLessThan(1);
```

find:

```ts
    expect(bloodMl(f)).toBeLessThan(4807 - 1600);
```

replace with:

```ts
    expect(bloodMl(f)).toBeLessThan(4900 - 1600); // FU-9 Part C: was 4807 − 1600
```

In `packages/engine-core/test/l2/blood/params.test.ts`, find:

```ts
    expect(m.bvMl).toBeCloseTo(70 * 70 * Math.min(1, 1 / Math.sqrt(22.86 / 22)), -1);
```

replace with:

```ts
    expect(m.bvMl).toBeCloseTo(70 * 70, 6); // FU-9 Part C (R3): FU-8's size weight — the default adult is exactly 70 kg (was 4 807 by 7c's capped Lemmens)
```

find:

```ts
    expect(o.bvMl / 127).toBeLessThan(55); // BMI 41.5 → 51 mL/kg (tables §1.3: 50–55)
```

replace with:

```ts
    expect(o.bvMl / 127).toBeLessThan(55); // BMI 41.5 → 52 mL/kg (tables §1.3: 50–55; FU-8 size weight 94.3 kg: 6 600 mL)
```

Create `packages/engine-core/test/l2/blood/fu9-body-size.test.ts`:

```ts
// FU-9 Part C (R50 ruling R3): 7c sizes the blood on FU-8's ONE continuous body-size rule (l2/body-size.ts), so the
// blood and the circulation hold one volume.
import { describe, expect, it } from 'vitest';
import { bloodPatient } from '../../../src/l2/blood/params.ts';
import { resolveProfile } from '../../../src/l2/circ/profile.ts';

describe('FU-9 Part C: one blood volume for 7c and the circulation (FU-8 A13, Lemmens-indexed size weight)', () => {
  it('adults 50–160 kg, M and F, with and without a stated height: 7c bvMl = the circulation\'s blood volume', () => {
    for (const sex of ['M', 'F'] as const) {
      for (let w = 50; w <= 160; w += 10) {
        for (const heightCm of [undefined, 160, 185]) {
          const p = { ageY: 40, sex, weightKg: w, ...(heightCm !== undefined ? { heightCm } : {}) };
          expect(bloodPatient(p).bvMl).toBeCloseTo(resolveProfile({ ...p, conditions: [] }).bloodVolumeMl, 6);
        }
      }
    }
  });
  it('the default adult (70 kg, 175 cm) holds 4 900 mL (was 4 807 with 7c\'s capped Lemmens branch); 127 kg / 175 cm 6 600 mL', () => {
    expect(bloodPatient({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }).bvMl).toBeCloseTo(4900, 6);
    expect(bloodPatient({ ageY: 40, sex: 'M', weightKg: 127, heightCm: 175 }).bvMl).toBeCloseTo(6600, -1);
  });
});
```


- [x] **Step 2 — implement.**

In `packages/engine-core/src/l2/blood/params.ts`, find:

```ts
import type { PatientProfile } from '../../types.ts';
```

replace with:

```ts
import type { PatientProfile } from '../../types.ts';
import { sizeWeightKg } from '../body-size.ts'; // FU-9 Part C (R3): FU-8's one body-size rule
```

find:

```ts
 * Patient scaling. Blood volume by band (tables §1.1) and Lemmens for adults (§1.3: 70/√(BMI/22) mL/kg of actual
 * weight, capped at the band value below BMI 22). TBW 0.6 (M) / 0.5 (F) L/kg; ICF 2/3; ECF 1/3; plasma = BV·(1 − Hct).
```

replace with:

```ts
 * Patient scaling. Blood volume by band (tables §1.1) on FU-8's ONE continuous body-size rule (`l2/body-size.ts`,
 * Lemmens-indexed size weight anchored on the default adult — FU-9 Part C, R50 ruling R3; it replaces 7c's own capped
 * Lemmens branch, so blood and circulation hold one volume: 4 900 mL at 70 kg / 175 cm, was 4 807). TBW 0.6 (M) / 0.5 (F)
 * L/kg of the ACTUAL weight; ICF 2/3; ECF 1/3; plasma = BV·(1 − Hct).
```

find:

```ts
  const h = p?.heightCm ?? b.h;
  const bmi = w / (h / 100) ** 2;
  let bvKg = female ? b.bvF : b.bvM;
  if ((band === 'adult' || band === 'elderly') && bmi > 22) bvKg = Math.min(bvKg, 70 / Math.sqrt(bmi / 22));
  const bv = bvKg * w;
```

replace with:

```ts
  const bvKg = female ? b.bvF : b.bvM;
  const bv = bvKg * sizeWeightKg(band, w, p?.heightCm);
```


- [x] **Step 3 — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2 test/engine/blood-sanity-haem.test.ts test/engine/fu9-kinetics.test.ts` → pass.
- [x] **Step 4 — BF runner:** all cells (A0 Step 3's command, `BF_OUT=out/<task>.json`) against Part A + B's `after.json`: only the rows D20 names move.
- [x] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7c): blood volume on the one body-size rule (FU-9 Part C, FU-8 I-51)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
```

## Gate

### Task G: Gate — full verification, the matrices before → after, the FU-4 check, gate note, pull request

**Files:** Create `docs/gates/fu-9.md`; tick this plan's boxes.

- [x] **Step 1 — merge.** `git fetch origin && git merge origin/main`, then `npx -y pnpm@9.15.9 install --frozen-lockfile`.
- [x] **Step 2 — suites** (bounded waits; logs under `<scratchpad>/fu-9-blood-fluids/`):

```
npx -y pnpm@9.15.9 -r typecheck
CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run
for g in slow-a slow-b slow-c; do CI=1 PME_TEST_SET=$g npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run --reporter=default --reporter=json --outputFile.json=<scratchpad>/fu-9-blood-fluids/$g.json; done
CI=1 npx -y pnpm@9.15.9 --filter '!@pme/engine-core' -r test
npx -y pnpm@9.15.9 build && CI=1 npx -y pnpm@9.15.9 test:e2e --project=chromium               # no UI change: regression only
```

  Expected: all pass; the `it.fails` FU-9 adds hold: Part A — core iCa rule (1.137), transfusion iCa (0.955) and BE (−0.1),
  leak vs healthy (+0.87 vs +1.85), furosemide size (−0.030), glycine ICP (+0.29), H1's 30–60 min recovery mean (0.37), IAP 25 (0.69), SP-08e urine
  (−12.5 %), SP-08a CO (0.0 %), mannitol osmolality (+8.7); Part B: 0. Two pre-existing `it.fails` flip to `it` (named in A9 and A12: fidelity-lowflow's technical short cycle, neuro-engine's depth nadir 50). The disjointness step (Task A0b Step 2) prints
  nothing. **Record the three slow groups' wall times** from the JSON (per file, summed) on the MERGED tree — with FU-8's
  `fu8-*` in slow-a — and, if a group passes ≈ 40 min, move a slow-b/slow-c file by name between SLOW_C's list and SLOW
  (a one-line edit of A0b's `SLOW_C` literal, committed separately) and re-run the disjointness step. The fixer measured on
  this Mac, serial: slow-a 1 026 s and slow-b 1 200 s (from `2473f0b`'s per-file times), slow-c 868 s.
- [x] **Step 3 — the BF, RH and SP matrices after.** As A0 Step 3 with `…_OUT=out/after.json`; then in each runner
  `cp out/after.json out/cells.json && node --experimental-strip-types report.ts > out/matrix-after.md` (and the same for
  before.json). Expected: the "Prototype results" tables below, cell for cell (seed 7).
- [x] **Step 4 — FU-4's arrest behaviour, against the envelope (R5).** `PME_AUDIT_OUT=<scratchpad>/fu-9-blood-fluids/audit-after
  npx -y pnpm@9.15.9 run audit:physiology > <scratchpad>/fu-9-blood-fluids/audit-after.md`; `diff` the "## Arrests" and
  "## Propofol" tables with Task A0 Step 4. Expected (prototype, D13): inside the envelope D0 1775 → 1770, D2 1350 → 1305, K-ptx 670 → 675 and the tension-PTX propofol row t+10 → t+15 s; physiology (E-FU9-5, D13) B2/B7 830 → 825 s, B6 1130 → 1125, C1 first MAP < 30 1000 → 1005, I1 910 → 920; second decimals of the propofol matrix, the tamponade nadir 250 → 240 s (PEA t+170 → t+165), MANUAL hypovolaemia ΔCO −0.43 → −0.64, minimum HRs ±1–4; all other rows identical. The chaotic rows (D0, D2, K-ptx,
  and the tension-PTX propofol nadir time) pass when they lie inside A0 Step 4's ensemble envelope; any OTHER moved row
  stops the gate: report it with the task that moves it (`git stash` is forbidden — bisect by reverting single commits in
  a scratch worktree).
- [x] **Step 5 — gate note `docs/gates/fu-9.md`:** (1) scope and the inventory's decisions; (2) the BF/RH/SP before →
  after tables (Step 3) with verdicts; (3) the `it.fails` list with numbers; (4) the audit diff (Step 4) and the ensemble
  envelope; (5) suites and the three slow groups' times; (6) exceptions E-FU9-1..4 as applied; (7) the Requests and Open
  questions of this plan, unchanged unless the executor measured a different number.
- [x] **Step 6 — PR** (never merged by the executor):

```
git add docs/gates/fu-9.md docs/plans/fu-9-blood-fluids.md && git commit -m "docs(gate): FU-9 gate note" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push
gh pr create --base main --head fu-9-blood-fluids --title "FU-9: blood, fluids and acid–base integration" --body-file <scratchpad>/fu-9-blood-fluids/pr-body.md
```

  The body summarises the gate note (findings → mechanisms → before/after), lists the `it.fails` and the FU-4 audit diff,
  and ends with the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. A part that has not run is
  named in the body; the title ends " (Part A)" / " (Part B)" / " (Part C)" as Global Constraints say.

---

## Open questions for Ali (the model's numbers and the plan's recommendation; the plan does not wait on them)

1. **SvO₂ at normal flow under GA on FiO₂ 0.5 (BF-29b's normal arm).** 85.7 % against research/12's 70–85 % "under GA".
   The high value is GA's VO₂ (−15 %) plus dissolved O₂ at PaO₂ ≈ 250; F3 does not change it.
   *Recommendation:* the band applies to FiO₂ ≤ 0.4; keep the model (no mechanism defect).
2. **Where the massive-transfusion acidosis comes from (F5, R1).** DECIDED for the compositions (R1: electroneutral,
   sourced rows — D3). The consequence is the question: with honest rows the units themselves are near-neutral (FFP SID
   26.8, platelets 24.8, a day-14 SAGM unit's supernatant 0 with lactate 19.6), and their citrate becomes bicarbonate
   within the hour, so the class IV + MTP rig reads BE −0.1 and iCa 0.955 (`it.fails`: bands ≤ −10 and 0.6–0.95), with no
   arrest and lactate ≥ 4. *Recommendation:* the teaching case's acidosis should come from the SHOCK (lactate 4–12 in
   the tables: the rig's lactate peak is the lever — Ali's calibration of the low-flow lactate production), and the iCa
   band from FFP/platelet citrate at MTP rates; keep the rows as sourced.
3. **Septic capillary leak (F4) and the transient MAP gain (BF-20b).** The septic lung makes water (+0.87 mL/kg (healthy +1.85)) but less
   than a healthy lung under the same 30 mL/kg; PaO₂ still rises (+12 vs +6 healthy, R50 F11). *Recommendation:* keep the
   two-pore form (no invented per-grade σ; the linear scaling is [ENG]); a lower σ floor for septic shock needs a source.
4. **COP (F8) — DECIDED by R2** (scaled Nitta: normal 22.35 identical, albumin 20 → 11.7, 5 % albumin iso-oncotic 25.2).
   What is left: the scale factor 1.259 makes Nitta's albumin share ≈ 80 % at the normal plasma; if you prefer the raw
   Nitta values (normal 17.8), every lung-water threshold moves — the plan recommends the scaled form.
5. **Kaliuresis size AND its reference (F6, BF-08d; R8).** Furosemide 40 mg at a PROFILE K 7.5 under GA: −0.030 (−0.042 before the H tasks) mmol/L at
   3 h. The seam's kaliuresis is `basal × (K ÷ set.k) × √(UOP/UOP₀)`, and `set.k` is the PROFILE K, so a profile K 7.5
   starts at kRel 1 (the kidney treats 7.5 as its balance point). With the NORMAL K (4.2) as the reference the same kidney
   would start at kRel 1.79: excretion 3.5 × (1.79 − 1) ≈ +2.8 mmol/h above the intake before any diuretic (1 mL/kg/h, 70 kg, URINE_K 50), i.e. an
   acute hyperkalaemia with working kidneys is maximally kaliuretic from the start (the teaching case), while a CKD
   profile at 5.5 would then drain K it should hold. *Recommendation:* NORMAL K for the acute states (profile K with
   `aki`/CKD absent), profile K when the kidney is failing — one line in `organs/pipeline.ts` (`kSet` → `NORMAL.k` unless
   `aki > 0`); and a band of −0.02 to −0.10 at 3 h under GA for BF-08d (the `it.fails` "≥ 0.1" then flips to a band test).
6. **An alkali-loss event (BF-15a, NE).** The smallest form is 7c's existing `metabolic` event with a negative `acidMmol`
   (HCl lost). *Recommendation:* a one-line follow-up if you teach pyloric stenosis/NG losses; F9 then compensates it.
7. **K⁺ 8.5 without an arrhythmia (BF-07c, FU-4 G3's hazard).** Stays in sinus for 15 min (seed 7); K 9.5 fibrillates at
   65 s. *Recommendation:* calibration question for FU-4's `K_HAZARD` (not FU-9's).
8. **Hyponatraemic brain swelling size (F11) and the ONE osmotic brain term.** Na 119.5 (osm −15): brain water ≈ 2 mL,
   ΔICP +0.29. After H8, 7c's plasma osmolality after 1 g/kg mannitol is +8.7 (not the +27 the osmotherapy fit assumes),
   so the brain keeps its dose term for a RISE (D8). *Recommendation:* decide the mannitol distribution (Q12) first; then
   one osmotic term (the brain reads 7c both ways) becomes possible.
9. **Hypokalaemic NMB potentiation size (F10).** EC50 × 0.85 at K 2.5 → rocuronium T1 25 % 47.5 min vs 35.8 min on the steep
   Hill. *Recommendation:* accept the direction; the size is [ENG].
10. **Saline acidosis magnitude (BF-01a, BF-14; annex D3 `it.fails` in 7c since Stage 7c).** 2 L: Cl +4.75, BE −0.71; 5 L:
    BE −3.34 (Scheingraber: ≈ −7). R4 made the expansion urine natriuretic (BF-12 fixed); the basal urine's composition
    (Na 100, Cl 0.9·(Na + K) [ENG]) is still the calibration pass's.
11. **The resuscitation end point under GA (H1, RH-03a).** After class III + 2 L RL the urine recovers (a 10-min bin of
    1.17 mL/kg/h in the first 10 min) but the 30–60 min mean is 0.37–0.38 against ATLS's 0.5: the ceiling is S_GA ×
    V(bvRel 0.97) ≈ 0.51, and vNh washes out with τ 45 min — check 20's fit (τ 10–20 min gives 0.45–0.46 and breaks check
    20). *Recommendation:* read ATLS's 0.5 as the awake end point; under GA the tables' own S row caps it at ≈ 0.6.
12. **Mannitol's distribution in the first minutes (H8, RH-08c).** 7c spreads 1 g/kg over the whole ECF (≈ 14 L) and draws
    cell water at once: osmolality +8.7 at 15 min against +20–30 measured clinically (the osmolal gap). *Recommendation:*
    either the band is read as the early peak (plasma-only distribution for ≈ 5–10 min, a new τ), or it stays `it.fails`.
13. **Cold diuresis size (H10).** × (1 + 0.2 per °C below 35) [ENG]: 33 °C → × 1.4, RH-20c +29 %. *Recommendation:* keep
    until a sourced magnitude (Polderman 2009 gives direction only).
14. **`aki` severity 1 (H6).** GFR 22 mL/min (KDIGO G4–5) with `AKI_AFF_TONE` 1 [ENG]; research/13 proposed ≈ 25.
    *Recommendation:* accept; the tables' CKD drug-clearance row belongs to a `ckd` profile (handed).

## Requests (handed to other owners; nothing here is FU-9's to change)

- **R-FU9-1 → FU-8 Part B (R7):** (a) DV-25b — a sinus rhythm forced after the shock in treated hyperkalaemia (kEcg 7.4,
  contractility back to 1.0) dips into PEA at +100 s and regains a pulse under CPR at +185 s: post-arrest ischaemic
  contractility, not the K treatment (D12); (b) BF-10a — hypomagnesaemic torsades converted by MgSO₄ at 470 s becomes
  asystole at 495 s (after 165 s pulseless).
- **R-FU9-2 → FU-7 Task 12:** DV-25a's K-blind shock table is already in its scope (`kEcg` factor); nothing added.
- **R-FU9-3 → the 7b owner (FU-6 follow-up):** F13a — lung water barely reaches gas exchange (HFrEF + 1.5 L: SpO₂ 96 →
  94–96, tables 89–92; septic lung water with PaO₂ RISING).
- **R-FU9-4 → orchestrator (R5):** the massive-PE (D0, D2) and tension-PTX (K-ptx and its propofol nadir time) rows are
  chaotic at the 10⁻⁵–10⁻³ mmHg level: the measured envelope on `2473f0b` is D0 1770–1775 s, D2 1285–1355 s, K-ptx 665–685 s (δ = ±1e-5 … ±1e-3 mmHg; B2/B7, B6, I1 and C1 do not move under any δ) (the review's: D2 1285–1355 s,
  ±65 s; K-ptx 665–680 s). A move inside it is noise for any gate.
- **R-FU9-5 → FU-6 executor:** Task A7 and FU-6 Task 13 edit the same `s.paco2Set = paco2SetPoint(…)` line; the merged
  line is given in Task A7. A7 now also imports from `../blood/params.ts` at the top of `spont.ts`.
- **R-FU9-6 → Stage 9 (glossary, R56):** new engine state keys `blood.core.fl.globG`, `blood.core.so.set.kIcf`,
  `blood.core.so.mannitol`, `blood.core.hbfFactor`, `organs.renal.eabvLp`, `organs.brain.osmWater` / `osm0`, and the
  exported constants; no display label is added by FU-9.
- **R-FU9-7 → FU-8:** Part C adopts I-51's rule for 7c's blood volume (after A13); FU-9 does not touch profile/set-point
  consistency (I-52).
- **R-FU9-8 → the posture / surgical-events stage (7a, 7b; research/13 H5, research/21 S4):** IAP → venous return and
  afterload (SP-08a CO −10–30 %, SP-08b SVR +20–70 % / MAP +10–35 %: measured −2.9 %, −0.1 %, −0.1 %) and → chest-wall
  elastance/FRC (SP-08c); with that half, RH-06a's anuria near IAP 25 and SP-08e's −30 % become reachable (the kidney's
  half, H4, is A9). FU-9's `it.fails` in `fu9-iap.test.ts` and `fu9-filtration.test.ts` are its acceptance arms.
- **R-FU9-9 → the 7d follow-up owner (orchestrator to route):** H7 (a hypertensive shift of renal autoregulation, tables
  §1.5 `renalLowerLimit` +10), H11 (one lactate clearance with the tables' split), and the CKD and cirrhosis profiles
  (research/13 §5); H9 (gamma-curve drugs and organ function) → FU-7 Task 2; H12 (autoregulation ceiling) → Ali's
  calibration.
- **R-FU9-10 → FU-8 / Ali:** the elderly band's blood volume per kg differs between 7c (65/60 mL/kg M/F) and the
  circulation (62/65): Part C makes both read one size weight, not one per-kg table.

## Self-review (fixer, 2026-09-30, on `2473f0b`)

- **Rulings, each with where it lives:** R1 → A3/D3 (SID net of the Ca complex; CPD/ACD-A/SAGM rows, each ingredient cited;
  BF-05d/05a are `it.fails` with −0.1 / 0.955, OQ2). R2 → A5/D5 (scaled Nitta; 22.35 identical, 20 → 11.7, 5 % albumin
  25.2; BF-03a 0.85, BF-22a 11.7, BF-18/19 re-measured). R3 → Part C/D20 (prototyped on `2473f0b` + FU-8 `b23a3ea`; moved
  rows declared). R4 → A1/D1 (BF-12 +6.95, PL, no exception). R5 → A7 deadband/ONE constant (D7), D13 ensemble on current
  main, G Step 4 against the envelope, R-FU9-4. R6 → B1/D10 (inside `ec50Multipliers`; the call-line block is FU-7's
  merged line). R7 → R-FU9-1 to FU-8 Part B. R8 → OQ5 with numbers. R9 → E-FU9-1 (1.076 → 1.137), E-FU9-2/3. R10 →
  memoised arms (`once()`), A0b (slow-c, the disjointness step), D19, G Step 2. F7 → D6/OQ5; F8 → A5's branch on the
  profile fields; F9 → R6; F11 → numbers re-measured (A4: +0.87 vs +1.85, PaO₂ +11/+5 on this tree; E-FU9-1 both numbers;
  BF-18/19/20a in the results); F12 → D4 `[ENG]` + anaphylaxis/burns, D2's DO₂crit range.
- **RH amendment:** H1 in A1, measured before (RH-01a 0.35) and after (0.57), jointly calibrated with F1 — V_EXP_GAIN
  fitted awake, H1 moves GA only; urine recovers after class III + 2 L (a bin of 1.17 at +10 min) but the 30–60 min mean
  0.37 stays `it.fails` with its cause (S_GA × V(0.97); τ 45 min is check 20's fit — τ 10/20 min measured and rejected).
  H2 + H4 in A9 (with `EABV_EXP` re-fitted to check 20 and E-FU9-4), SP-08a/e as `it.fails` acceptance arms in
  `fu9-iap`. H6 A10, H10 A11, H3 A12 (A3's citrate clearance reads CO/CO₀, not `hbfRel`: unaffected), H8 A13 (the brain's
  dose term kept — measured, D8). Handed: H5's circulation/lung half, H7, H9, H11, H12, CKD/cirrhosis (R-FU9-8/9).
- **Verification, mechanical:** `check_plan.py` parses THIS document's blocks, applies them in order to `2473f0b` (B1's
  call line on FU-7 Task 14's merged line, substituted), checks each find exactly once in the applied state and compares
  with the prototype — result in the status header. Each Part A prefix (A0b … A13) was applied alone to `2473f0b`:
  `tsc --noEmit` clean and `test/l2` green at every step (809 → 835 tests). Part C's 10 blocks: exactly once on main +
  FU-8 A13 and on Parts A + B, byte-identical to `wt3`; the combined tree (A + B + FU-8 A13 + C) type-checks and passes
  185 `test/l2` files. The prototype passes the fast suite, slow-c (49 tests, 868 s) and the FU-4/7d/7c/7f/7g slow files
  named in the tasks; two pre-existing `it.fails` that now pass were bisected (fidelity-lowflow → A9, neuro-engine's
  depth nadir → A12) and flip to `it` in those tasks.
- **Lean code:** one mannitol constant (7d's existing `MANNITOL_MOSM_PER_G`; the fixer's two new copies were removed), one
  chronic-compensation constant, one renal unit rig (`test/helpers/fu9-renal.ts`) instead of four copies.
- **Not verified here (the executor's):** FU-6/FU-7/FU-8 composition on their merged trees (their plans move); CI's Linux
  wall times (this Mac is faster: slow-b 37.6 min on CI vs 26.5 min here for the same files).

---
## Base drift (Part B executor, 2026-10-04, on `origin/main` 4a1cc3f7 — FU-7 #32, Stage 9 #29 and FU-9 Parts A + C #31 merged)

Task B0 re-verified every Part B find block on the merged tree. Branch `fu-9b-blood-fluids` (worktree
`scratch/wt-fu-9b`) was cut from 4a1cc3f7, so Step 2's merge was a no-op.

- **Anchors (B0 Step 3):** all ten print exactly ONE line; the B1/B2 find blocks (multi-line ones included) match byte for
  byte. FU-7 Task 14's merged call line in `neuro/pipeline.ts` (line 198) is the plan's call-line block verbatim; FU-7's
  `InteractionCtx` ends on `tempC`, as the plan assumed; `ec50Multipliers` keeps the `let nd = vol * mg * cold;` line (FU-7
  re-sized only the volatile divisor, `VOL_NMB_K` 0.18, and made Mg antagonised by iCa). A7's `CHRONIC_HCO3_PER_MMHG` is on
  main (`blood/params.ts`, consumed by `neuro/spont.ts`), so B2's import resolves.
- **Drifted placement 1 — `engine.ts` (E-FU9-2):** FU-7 gave 7c's electrolytes their OWN line in the `stepNeuroTo` context
  (`mgMmolL: … iCaMmolL: …`, line 593), separate from the `tempC:` line the plan anchors on (line 588, still matching).
  R6 ("K joins … beside Mg and iCa") is unambiguous, so `kMmolL` goes on FU-7's electrolyte line, same expression
  (`ps.blood.out.k > 0 ? ps.blood.out.k : undefined`). Still ONE engine line (E-FU9-2 unchanged in size).
- **Drifted placement 2 — `NeuroEnv` (neuro/pipeline.ts):** FU-7 added `mgMmolL?`/`iCaMmolL?` at the end of `NeuroEnv`;
  `kMmolL?` sits after them instead of between `tempC` and `mechanical`. Same type, same doc line.
- **Before-numbers moved by FU-7/Part A (recorded, not tuned):** rocuronium T1 25 % — engine test 36.0 / 36.0 min at K 2.5 /
  4.2 (plan: 35.7 / 35.7), BF runner BF-09b 35.8 / 35.8 (dMin 0, WR). COPD awake at 30 min (engine test rig): GOLD 3
  PaCO₂ 39.57, HCO₃ 24.33, pH 7.402, +1.30 per 10 mmHg vs X-A 39.0 / 24.26 (plan: 39.7, 24.35, +1.32); GOLD 4 PaCO₂ 40.72,
  HCO₃ 24.49, pH 7.392; GOLD 2 38.85 / 24.24 / 7.408. BF runner BF-16b paco2Copd 39.57, hco3Copd 24.334, phCopd 7.402,
  hco3Per10 1.31 (TW); BF-15b dPaco2 +6.24 (PL — Part A's F9 is merged).
- **Slow groups (six since the FU-7 gate):** the `fu9-*` glob in `SLOW_C` keeps B1/B2's engine files in slow-c (every other
  group excludes `SLOW_C`, so an `fu9-*` file cannot be listed elsewhere without changing A0b's matcher). slow-c summed
  2 295 / 2 315 s of tests on PR #32's two CI runs — the heaviest group — so `pk-acceptance-pd` (239 s on both runs) moves
  from `SLOW_C` to `SLOW_F` (862 / 1 807 s). `vite.config.ts` is not a Part B file in the File map; the move is the
  executor brief's "place new slow files by measured time" and the Gate's "move a file by name" remedy.

