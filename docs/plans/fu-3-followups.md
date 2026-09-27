# FU-3: Follow-ups (succinylcholine PK, sugammadex underdose, volatile reflex blunting, MANUAL check-18 hold, hypoxic arrest, AAI/DDD sensing, AF HR numeric, CVP alarm evidence, renal seam rename, scenario `patient.profile`, 7c Pulse blood oracle, NMT/BFA tiles, console 7x.1 + 7f dial) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-27, plan writer): NOT YET REVIEWED (R50 review pending). VERIFIED: every task was prototyped by
> running its code in a scratch worktree on `d525eed` = `origin/main` `40baccf` (7a + 7b + 7g + 7x + FU-2 + 7c + 8a)
> + `origin/stage-7d-organs` `ed846eb` + `origin/stage-7f-neuro-depth` `688ccd5`, merged LOCALLY (never pushed); 7e
> was executing and is NOT in that base. The per-task prototypes (`scratch/proto-fu3b-<id>`) were then cherry-picked
> in THIS plan's task order onto one worktree (`scratch/proto-fu3-all`) and the whole suite was run there (numbers in
> "Integrated verification" below), and a script applied this document's find/replace blocks in order to `d525eed`
> and reproduced that integration byte for byte (three intended wording lines aside). Code blocks were copied
> mechanically from the prototype files.
> Since the prototype, 7f merged (`origin/main` `2340ffa`); 7d and 7e land before this plan executes. A block that
> no longer matches means 7d/7e moved a line: re-anchor by the quoted comment or statement, never "fix" a test by
> loosening it (R45).
>
> REVIEWED (2026-09-27): R50 review APPROVE WITH FIXES (9 findings); the fixes and the orchestrator's rulings on them
> are applied in this document (plan fixer, second attempt): Task 5 gains the post-arrest window, the `cor.hyp` hold,
> **E-FU3-9** (7b arterial hold) and **E-FU3-10** (7f brainstem-perfusion gate — UNPROTOTYPED, see Task 5 Step 5c),
> the reversal floor, and the tick-budget/drift rigs; Task 11 gains a no-7e precondition; Task 12 pins per-row
> verdicts; the E-FU3-8 anchor is semantic; Task 0 is a check only; Task 13/15 state one PNG limit; t25 is a named gate
> deviation. Rulings are in "Decisions" (entries marked "Orchestrator ruling (FU-3 review), 2026-09-27"). Every find
> block was re-checked mechanically against `origin/main` `f1d1969` + `origin/stage-7d-organs` `e0c602f`.

**Goal:** Close the FU-3 list opened by the rulings (R51 addendum 17, G7f, G8a, G7c, G7d follow-through 2, 7x):
(1) succinylcholine's PK re-fit so its label course holds; (2) the sugammadex-underdose `it.fails` investigated and
kept with the capacity evidence; (3) volatile anaesthetics blunt the baroreflex HR response as propofol does;
(4) 7a MANUAL set-and-hold no longer lets an ischaemic recovery run MAP 45 mmHg past the instructor's target;
(16, added by the orchestrator after item 4) a MODELED apnoeic, paralysed patient becomes bradycardic and arrests
(PEA/asystole, a VF minority) on a sourced asphyxia time course; (5)
AAI/DDD pacers draw intrinsic sinus beats above their lower rate; (6) the HR numeric reads AF at its true rate on the
skin that discloses a plain mean; (7) the CVP-alarm question decided by evidence (the alarm default is right; 7a's
MANUAL CVP under positive pressure is not — pinned, fix deferred to a ruling); (8) the renal seam field named for what
it carries; (9) scenarios carry a `patient.profile` so 9 of the 10 "not measurable" validation documents run; (10) 8a
adopts 7c's Pulse blood oracle with one Pulse variable and the O13b baseline fix; (11) the renderer draws 7f's NMT/BFA
tiles on philips-like and saadat-like; (12) the physiology console's 7x.1 items and the 7f demo's 2 % maintenance dial.

**Architecture:** Every item is a small, independent change in its owner's area; no new module crosses a stage
boundary. The asphyxial arrest (item 16) puts the arterial O2 content into 7a's coronary supply, tracks its hypoxaemic
share (`cor.hyp`) and lets the hemo pipeline request an arrest rhythm through one engine callback, as 7g's drug hooks do. PK/PD items are data changes to 7g's rows (`l2/pk/**`) plus the 7f test flips they were pre-declared for.
The MANUAL hold adds one field to 7a's MANUAL tracker outputs (`man.kIschRef`) read by the one `m.kLv` line. Pacing
separates the pacer's lower rate from `hr` inside `l2/ecg` (Stage 5's demand-inhibition paths then draw the right
beats). The HR numeric passes the active skin's disclosed 12-RR method to `hrMeasure`. The scenario profile is a pure
mapping from `pme-scenario/1` onto the engine's existing creation-time `PatientProfile` (`engineOptionsOf`), used by
the 8a runner. The renderer gains pure formatters for two "module tiles" drawn only while their device publishes.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (system Chrome), pnpm 9.15.9 via `npx`. No new
dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **R45** (mechanisms, never band
changes), **R51** + addenda 8, 12, 13, 14, 17 (drug-layer contract: 7g owns PK and circulation PD, 7f owns NMB/depth
PD; canonical names), **R25** (partition, own worktree), **"FU-3 list opened"** (after the 7f re-review) and the
FU-3 additions in **G8a** (CVP alarm, `patient.profile`), **G7c** (7c's oracle files), **G7f** (R-7f-6 tiles,
R-7f-7, R-7f-9, the 7f demo dial), **G7d follow-through 2** (item 14 MANUAL, item 15 rename) and **4** (item 16, E-7d-4), the FU-2 gate rulings
**Q-FU2-9/10/11**, the **G7x** follow-ups (7x.1), **CI rule amendments 1–3**. Gate notes read: `docs/gates/stage-7d.md`
§4 and §10, `docs/gates/stage-7f.md`, `docs/gates/stage-7c.md` §4, `docs/gates/stage-8a.md`, `docs/gates/fu-2.md`.
Parameter tables: `docs/physiology/stage-7-parameter-tables.md` §2 (Q28 `tIt`), §5d, §6.1, §6.3.

**Item numbering.** This plan numbers items as the orchestrator's FU-3 brief does (1–13). The rulings file numbers the
same items differently; the map: brief 1 = rulings FU-3 (1) sux; 2 = (6) R-7f-7; 3 = (7) R-7f-9; 4 = (14) MANUAL
check 18; 5 = (3) Q-FU2-10; 6 = (4) Q-FU2-11; 7 = (8) CVP; 8 = (15) rename; 9 = (9) `patient.profile`; 10 = G7c item
11 (oracle files); 11 = (12) R-7f-6; 12 = 7x.1 + (13) the 7f dial; 13 = (5) Q-FU2-9 amiodarone (Ali; no task); 16 = rulings FU-3 item 16 (G7d follow-through 4, added to this plan by the
orchestrator after the first draft; placed after item 4 in priority, Task 5). The
rulings' (2) neostigmine tail is closed (7f gate: 18.3 min inside 8–20) and (10) PWDB fetch is Ali's by hand.

## Global Constraints

- **R45:** mechanisms, never band changes. No existing acceptance band is widened, removed or re-worded to pass. A
  band a mechanism cannot reach stays (or becomes) `it.fails` with the measured number in its title. In this plan:
  Task 2 (R-7f-7), Task 4 (defect 1, new test) and Task 8 (two MANUAL CVP rows, new test) carry `it.fails` with
  numbers; Task 12 pins O2b's lactate and O3b's Hb rows as `fail` in a per-row verdict map (ordinary `it`, R50
  finding 4); Task 11 pins t16 as `it.fails` only while 7e is absent; Task 5's E-FU3-10 `it` becomes `it.fails` only if
  its unprototyped band is not met; Tasks 1, 3 and 4 flip pre-declared `it.fails` to `it`. Parameters changed are sourced or
  `[ENG]` with the fit target named in the code comment.
- **Base:** branch `fu-3-followups` from `origin/main` AFTER 7d (PR #19), 7f (PR #21, merged `839732c`) and 7e have
  merged. Worktree `projects/patient-monitor-engine/scratch/wt-fu3` (R25: never the shared checkout). Push after every
  commit (`git push -u origin fu-3-followups` the first time, `git push` after). Never push to `main`; never merge
  (Task 15 opens the PR and stops).
- **Base precondition (Task 0, a check).** Once 7d and 7f are both on main, the 7f engine test
  `test/engine/neuro-engine.test.ts` › "rocuronium 0.6 mg/kg: … spontaneous TOFR ≥ 90 % at 55–95 min" failed: the rig
  paralysed an unventilated patient, who stayed apnoeic 100 min (SaO2 0, PaCO2 273, pH 6.56, MAP 46); 7d's kidney
  (GFR 0 from ≈ 36 min, read by 7g's `pkCtx`, R51 addendum 13) then removed rocuronium's renal clearance. The 7d
  integration fixed the RIG under **E-7d-4** ("G7d follow-through 4": ventilated RR 18 / VT 500 / FiO2 0.5 / PEEP 5
  before the dose → TOFR 0.9 at 78.5 min). Task 0 only checks it; the executor must not re-break it — Task 5's hypoxic
  arrest acts on exactly such unventilated patients, and that rig is ventilated. The same finding is the origin of
  item 16 (Task 5): on today's engine that apnoeic patient stayed in sinus rhythm for 90 min.
- **Partition (binding).** Edit ONLY the files listed in each task's **Files** block. Summary by owner:
  - 7g `packages/engine-core/src/l2/pk/**`: `nmb.ts` (sux row, `PCHE_CL_MULT.hom`, 7g's sux PD copy),
    `data/rows-cardiovascular.ts` (sux `src` string), `data/rows-anaesthetic.ts` (the volatile `gvHr` entry).
  - 7a `packages/engine-core/src/l2/circ/model.ts` (`man.kIschRef`, its default, the `m.kLv` line — NOT the
    `stepBaro(`/`gv` line); `packages/engine-core/src/l2/hemo/pipeline.ts` (`trackCircBeat`, the `setMode` handler in
    `applyHemoCommand`).
  - 7a (Task 5): `packages/engine-core/src/l2/circ/{coronary,model}.ts`, new `l2/circ/hypoxic-arrest.ts`,
    `packages/engine-core/src/l2/hemo/pipeline.ts` (the coronary step's `o2Rel`, the `cor.hyp` hold while pulseless,
    the arrest request).
  - 7b (Task 5, **E-FU3-9**): `packages/engine-core/src/l2/lung/mix-o2.ts` (`O2LungInputs.arterialHold`, the last two
    lines of `stepO2Lung`) and `packages/engine-core/src/l2/lung/lung.ts` (`lungGasStep` passes it).
  - 7f (Task 5, **E-FU3-10**): `packages/engine-core/src/l2/neuro/spont.ts` (the brainstem-perfusion gate),
    `packages/engine-core/src/l2/resp/pipeline.ts` (`RespCtx.cbfRel` and the `stepSpontDrive` call's two inputs),
    `packages/engine-core/src/engine.ts` (the `advanceResp` context line: `cbfRel`).
  - Stage 5 `packages/engine-core/src/l2/ecg/{rhythm-state,atria,pacing}.ts`; L3 `packages/engine-core/src/l3/hr.ts`.
  - 7c `packages/engine-core/src/l2/blood/core.ts` + 7d `packages/engine-core/src/l2/organs/{inputs,pipeline}.ts`
    (rename only).
  - 6b `packages/controller/scenarios/pme-scenario-1.schema.json`, `packages/controller/src/scenario/{patient (new),
    types,index}.ts`; 8a `packages/validation/src/segments/{run,types}.ts`, `packages/validation/suites/sanity/
    sanity-docs.ts`, `packages/validation/src/oracle/{blood-scenarios (new),compare}.ts`, delete
    `packages/validation/src/oracle/pulse-runner.ts`, `docs/validation/README.md`.
  - Renderer `packages/renderer/src/{numerics-neuro (new),device-ui,index}.ts`; skins
    `packages/skins/src/data/skins/{philips-like,saadat-like}.json` + the regenerated resolve snapshot.
  - Demo `apps/demo/src/physiology-console/{meta,organs,actions}.ts`, `apps/demo/src/stage7f.ts`,
    `apps/demo/scripts/fu3-neuro-tiles-shots.mjs` (new).
  - `packages/engine-core/vite.config.ts` — SLOW entries only (CI amendment 2).
  - Tests: the new files named in the tasks; the edits to existing tests listed per task.
  - Gate: `docs/gates/fu-3.md`, `docs/gates/fu-3/**`, this plan (ticks).
  - **Never touch:** `l2/lung/**` except E-FU3-9's two files, `l2/endo/**`, `l2/thermal/**`, `l2/temp/**` (7e),
    `l2/neuro/**` except the one E-FU3-1 row and E-FU3-10's `spont.ts`, `l2/circ/baroreflex.ts`, `l2/circ/params.ts`, `l3/alarms/**`, any other skin JSON, `package.json`,
    `pnpm-lock.yaml`, `.github/**`, `docs/physiology/**`.
- **Exceptions (declared here; R50-reviewed; each ruled on by the orchestrator, 2026-09-27):**
  - **E-FU3-0** (Task 0, only if the base is still red — 7d's E-7d-4 should have fixed it): `test/engine/neuro-engine.test.ts`
    (7f) — one ventilation dispatch in the rocuronium 0.6 rig, band untouched. **Approved by the orchestrator
    2026-09-27** (almost certainly a no-op: main + 7d already ventilates the rig at RR 18; Task 0 is a check).
  - **E-FU3-1** (Task 1): `packages/engine-core/src/l2/neuro/nmb.ts` (7f) — `NMB_PD.succinylcholine` `ec50Thumb`
    200 → 1160 and `gamma` 4 → 6 plus its docstring line. 7f's row mirrors 7g's effect-site value (R51 §5: one source);
    no (V1, CL, ke0) holds the §5d label course at EC50 200/γ 4 on a clearance inside Roy 2002's measured range (grid
    proof in Task 1). **Approved by the orchestrator 2026-09-27** (the orchestrator adds the Roy 2002 citation to the
    tables §6.1 source cell — docs, not this plan).
  - **E-FU3-2** (Tasks 1, 2, 3, 4): title/comment edits of pre-declared tests in other stages' files —
    `test/l2/neuro/nmb-course.test.ts`, `test/l2/neuro/reversal.test.ts`, `test/engine/neuro-circ.test.ts` (7f),
    `test/engine/organs-htn.test.ts` (7d). Flips or titles only; no criterion changes. **Approved by the orchestrator
    2026-09-27.**
  - **E-FU3-3** (Task 6): `packages/engine-core/src/engine.ts` — `rhythmCtx` gains `pacerLowerAt` (fed from FU-2's
    `ps.hemo.circ.hrSet`) and one line in `startRate`. The held rate lives on the circulation, which only `engine.ts`
    hands to the rhythm engine. **Approved by the orchestrator 2026-09-27** (the side effect on the catalogue entry
    `failureToSense` is disclosed in Task 6).
  - **E-FU3-4** (Task 7): `packages/engine-core/src/engine.ts` — the `./l3/hr.ts` import, the 1 Hz `measurement` push
    and FU-1's `hrAveraging()` cache (it now also returns the skin's `render.hrMethod.engine`). The skin is resolved
    there. Also `test/engine/hr-skin-averaging.test.ts` (FU-2): philips-like's step series is re-pinned, because it
    pinned the trimmed mean under a title that called it philips-like's method. **Approved by the orchestrator
    2026-09-27.**
  - **E-FU3-5** (Task 9): the new `it` in 7d's `test/l2/organs/pipeline.test.ts` imports 7c's `createBloodCore`,
    `stepBloodCore` and `bloodMl` (test reads a sibling's source; no source edit). **Approved by the orchestrator
    2026-09-27.**
  - **E-FU3-6** (Task 11): 8a's document data `packages/validation/suites/sanity/sanity-docs.ts` — the 10 profile
    documents gain `patient.profile`; three (t15, t16, t19) gain a t = 0 action instead, because their old tag named an
    engine EVENT, not a profile (t15 `condition rvInfarct`, t16 7e's `condition sepsis` warm, t19 tbi + haematoma 1
    mL/min). Rows are reported, not tuned. **Approved by the orchestrator 2026-09-27, conditional on Task 11 Step 0**
    (R50 finding 2: t16 is `it.fails` with the measured refusal while 7e is not on the base).
  - **E-FU3-7** (Tasks 13, 14): `apps/demo/src/stage7f.ts` (7f) — a `?skin=` URL parameter (Task 13, for the
    screenshots) and the maintenance dial (Task 14; the same line carries 7e's `stimulus` call, kept verbatim).
    **Approved by the orchestrator 2026-09-27.**
  - **E-FU3-8** (Task 5): `packages/engine-core/src/engine.ts` — one `requestRhythm` callback (6 lines) in
    `advanceHemo`'s context after `requestHr`, mirroring 7g's `req7g` path; the rhythm switch can only be applied
    where the rhythm state lives. The find block is anchored on the whole `requestHr: (bpm) => {…}` callback (R50
    finding 3), never on bare closing braces. **Approved by the orchestrator 2026-09-27, conditional on Task 5's
    post-arrest window (R50 finding 1) and the semantic anchor (finding 3)** — both applied in Task 5.
  - **E-FU3-9** (Task 5, 7b): `packages/engine-core/src/l2/lung/mix-o2.ts` — an optional `arterialHold?: boolean` on
    `O2LungInputs`; when true, `stepO2Lung` still refreshes the alveolar stores and the venous store but does not
    recompute PaO2/SaO2 (no ejection ⇒ no new blood reaches the arteries); `packages/engine-core/src/l2/lung/lung.ts` —
    `lungGasStep` sets it when `coRatio <= 0`. Absent/false is bit-identical. Cause (first fixer, measured): 7b's
    0.05 L/min minimum pulmonary flow on the O2 side (the "arrest: q = 0 gave NaN" floor) equilibrates a phantom flow
    with alveoli the recovered MODELED drive re-ventilates, so an arrested patient's SaO2 climbed 0.2 → 90 %.
    **Approved by the orchestrator 2026-09-27.**
  - **E-FU3-10** (Task 5, 7f; ruled 2026-09-27 17:55): `packages/engine-core/src/l2/neuro/spont.ts` — a
    brainstem-perfusion gate on the MODELED spontaneous drive; `packages/engine-core/src/l2/resp/pipeline.ts` —
    `RespCtx.cbfRel` and two inputs to the `stepSpontDrive` call; `packages/engine-core/src/engine.ts` — `cbfRel:
    ps.organs.brain.cbfRel` on the `advanceResp` context line. MODELED only; MANUAL and Stage 3 unchanged.
    **Approved by the orchestrator 2026-09-27.** UNPROTOTYPED (Task 5 Step 5c: prototype first; R45 `it.fails` with
    the numbers if the band is not met).
- **Merging main while 7d/7e land (R51 §7):** before the `engine.ts` edits of Tasks 5, 6 and 7, before Task 11 (it needs
  7e's `condition sepsis`), and in Task 15, run `git fetch origin && git merge origin/main`. Every edit is a
  find-and-replace anchored on quoted text; if a find block no longer matches byte for byte, locate the same statement
  by its quoted comment and make the same change; never re-type a line you are not changing. 7e edits `engine.ts`,
  `l2/pk/pipeline.ts` (2 lines), `l2/blood/{core,labs,pipeline}.ts`, `l2/resp/pipeline.ts`, `types.ts`,
  `renderer/src/index.ts` and `vite.config.ts` (SLOW entries): the FU-3 anchors in those files are not on 7e's lines at
  `ba2d3ac`, but check each by content.
- **CI rules (CI amendments 1–3, restated so the executor needs no other document):**
  - `CI=1` for engine tests (6 h long-run horizon). Long-run horizons come from `test/helpers/longrun.ts` (never a
    hard-coded 24 h or 6 h in a new test).
  - Any test that can exceed ≈ 30 s wall (in practice: every engine test running more than one sim-minute) yields
    once per sim-minute (`await new Promise((r) => setImmediate(r))`).
  - Slow files go in the `SLOW` set of `packages/engine-core/vite.config.ts`: new multi-sim-minute files join it
    (`circ-manual-ischaemia`, `circ-hypoxic-arrest`, `pacer-sensing`, `hr-af-numeric`, `circ-manual-cvp-peep`).
    Packages that drive a real engine in tests keep the 30 s default budget (amendment 3). Local whole-suite runs:
    `CI=1 npx -y pnpm@9.15.9 test`; the CI split: `PME_TEST_SET=fast` / `PME_TEST_SET=slow` inside
    `packages/engine-core`.
  - Heavy evidence e2e and screenshot scripts run Chromium only (system Chrome, `PW_SYSTEM_CHROME=1`).
  - Never `git stash` (the stash is shared across worktrees). Scratch and logs under `<scratchpad>/<branch>/`, i.e.
    `<scratchpad>/fu-3-followups/`, never bare file names in the repo.
  - Bounded waits: every wait on a background process is an `until` loop of ≤ 10 min that re-checks the process
    (not a marker line); re-arm it rather than lengthening it.
  - Push after every task's commit (per-task pushes). The executor opens the PR (Task 15) and NEVER merges.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS (bound waits with an `until` loop,
  ≤ 10 min per wait, re-checking the process rather than a marker line). Playwright: `PW_SYSTEM_CHROME=1`, evidence
  e2e and screenshots Chromium only. Engine test: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run
  <path>`; other packages `--filter @pme/controller`, `@pme/validation`, `@pme/skins`, `@pme/renderer`, `@pme/demo`,
  `@pme/ventilator` (paths relative to the package). Scratch logs under `<scratchpad>/fu-3-followups/`, never bare
  names. Never `git stash` (shared across worktrees).
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with the trailer from the executor brief (`Co-Authored-By: Claude Fable 5.1
  <noreply@anthropic.com>` in the commands below; swap it if your harness gives another), and every commit is
  followed by `git push`.
- Gate screenshots ≤ 60 KB each (one number: if a shot prints more, re-take it with `deviceScaleFactor: 0.7` and
  record the value in the gate note — Task 13 Step 9, Task 15 Step 2).

## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — succinylcholine (Task 1):** CL and V1 are Roy 2002's measured values (CL 0.037 L/kg/min, V1 = CL/k = 0.038
  L/kg [P]); ke0 0.1475/0.236 is a label fit [ENG] because Roy's own ke0 0.058 puts T1 90 % at 18–21 min; the
  effect-site EC50 moves 200 → 1160 ng/mL with γ 6 (1.58 × Roy's measured 734 ± 211) [ENG]; `PCHE_CL_MULT.hom` 0.003 →
  0.011 restores the homozygous 4–8 h course the old pair encoded. γ 4 with EC50 1040 / ke0 0.1925 also passes but
  with 1.2 s of onset slack — rejected as fragile. Decided: γ 6 / EC50 1160 (Q-FU3-1 closed, R50 triage).
- **D2 — sugammadex underdose (Task 2):** no mechanism change. The pair (rocuronium 1.2, sugammadex 0.5 at PTC 1) is
  capacity-limited (16.1 µmol sugammadex vs 63.5 µmol rocuronium in the body); an ideal binder peaks at TOFR 0.834 and
  7g reaches 0.833; reversible binding at Ka 1.79·10⁷ M⁻¹ reverses LESS. The mechanism reproduces its source at the
  source's pair (Eleveld 2007, roc 0.6 + sgx 0.5: peak 0.998 → 0.952). Retargeting the test is Ali's band call (Q-FU3-2).
- **D3 — volatile reflex (Task 3):** 7g's volatile `gv` already reached 7a; the anaesthetised drop was larger because
  the sevoflurane hypotension held the reflex on its steep activation side (HR 93.5 vs 73 awake, tables T6.3 "HR ~").
  The volatile rows gain propofol's `gvHr` term (sympathetic HR arm × (1 − 1.0·MAC)) [ENG, fit: Ebert 1995 HR
  unchanged; direction Kotrly 1984, Muzi & Ebert 1995; cross-check Nagasaki 2001]. No 7a line changes.
- **D4 — MANUAL hold (Task 4):** the tracker's LV Emax is held against the kIsch it was set against
  (`man.kIschRef`); `control()` applies `min(kIsch, kIschRef)`. New ischaemia still acts; recovery above the reference
  does not raise the delivered Emax. MODELED is bit-identical (reference 1); an instructor `contractility` sets it 1;
  MANUAL → MODELED folds it into `base.eesLv`. Defect 1 (the ischaemic ventricle at MAP 65) is NOT fixed: every guard
  that keeps the ventricle perfused refuses part of the instructor's pressure pair and breaks Stage 2 bands
  (hemo-acceptance 1 and 3, hemo-nibp 9) — Q-FU3-4a.
- **D12 — asphyxial arrest (Task 5):** MODELED only. The arterial O2 content enters the coronary supply (flow ×
  SaO2/0.97); its hypoxaemic share `cor.hyp` (τ 150 s up [ENG], 60 s down) depresses the sinus rate (`G_SA` 1.5 [ENG])
  and all four chambers' contractility [ENG]; at `hyp ≥ 0.9` one seeded draw on the `outcome` stream picks VF (0.1
  [ENG]), asystole (2/30 [P]) or bradycardic PEA (the running sinus-family rhythm, `pulseless`). No PEA → asystole
  progression (DeBehnke: PEA up to 20 min; Q-FU3-16c). The switch reaches the rhythm engine through E-FU3-8. The arrest
  does not undo itself (R50 finding 1): while the rhythm is pulseless `cor.hyp` is held at its running maximum (no
  reperfusion, so neither the myocardial nor the SA-node depression unwinds), the O2 mixing point stops re-computing
  the arterial gas at zero output (E-FU3-9), and the MODELED spontaneous drive is gated by brainstem perfusion
  (E-FU3-10). The post-arrest window (6–10 min after the arrest) is tested.
- **D5 — pacing (Task 6):** the pacer's escape interval is its programmed lower rate (`PacerOpts.ratePpm`, else the
  held rate, else hr); under AAI/DDD an hr above it is the intrinsic atrial rate, so Stage 5's existing sensing draws
  sinus P (AAI: conducted, no spike; DDD with block underneath: sensed P tracked by a V spike 160 ms later; DDD
  conducted: no spikes). No new parameter; no upper tracking rate (Q-FU3-5).
- **D6 — AF HR (Task 7):** the detector is exact and the generator realises its rate; the over-read was the engine
  running EVERY skin on the IEC-default trimmed mean of 12 RR. philips-like discloses the plain mean (research 03
  §1.12) and now gets it; skins that disclose the trimmed mean keep it and its AF over-read (pinned as a
  characterisation on mindray-like).
- **D7 — CVP (Task 8):** the skin default is right (philips-like 0–10 = IntelliVue factory; saadat-like −5–15 =
  Saadat); 7a's MANUAL CVP under positive pressure is wrong (it rises by T_IT 0.65 of the alveolar pressure; brief §4.9
  and tables Q28 say 0.3–0.5). The mechanism (`MANUAL_CVP_PAW_FRACTION` 0.4) meets both rows but moves FIVE calibrated
  bands (check 18 premise ×2, 7c's OLV re-check, R36 PH crisis, 8a capture-match SBP) — the FU-2 item-6 precedent: not
  landed by the executor; the evidence is pinned as `it.fails` and the fix is written out in "Item 7: the fix is
  deferred" for a ruling (Q-FU3-7a).
- **D8 — profile (Tasks 10–11):** the engine's profile API is creation-time only (`EngineOptions.patient`); the scenario
  block is optional and maps 1:1; condition ids are restricted to the ids the engine reads at creation (an event id
  such as `rvInfarct` is rejected — it was silently dropped before). 7f's `neuro` and 7c's `blood` blocks, already in
  the schema, now reach the engine through the same mapper.
- **D9 — oracle (Task 12):** one loader (8a's `pulse-node.ts`; `pulse-runner.ts` deleted), one variable
  (`PME_PULSE_DIR`, no alias — nothing else reads `PULSE_ORACLE_DIR`), our engine MODELED like 8a's O2/O4, our actions
  dispatched inside the stepping loop after both baselines.
- **D10 — tiles (Task 13):** NMT/BFA are MODULE tiles, drawn only while their device publishes (NMT stale after
  120 s, BFA after 5 s [ENG]); NMT shows the ratio % at count 4, else "n/4", PTC at count 0; BFA shows the index and
  the skin's second readout named by the tile's first `extras` entry (SR on philips-like, BS% on saadat-like per
  research/06 §2). Philips placement/colours are `eng` (research/05 has no IntelliVue NMT/BIS rows).
- **D11 — console (Task 14):** lung labels from one `LUNG` table keyed by path with side/unit indices; `organs.iap` →
  Kidney, `organs.conds.<id>` by organ; BE/HCO3 absolute tolerance 1 mmol/L [ENG]; the console presets start with
  `sensors.co2: 'on'` (a profile field, survives restart/restore, no change-log entry). The 7f dial: 2 % at 330 s, the
  2.5 % re-dial at 1200 s removed.

### Orchestrator rulings on the R50 review (binding; the executor does not revisit them)

- **R-1 — Orchestrator ruling (FU-3 review), 2026-09-27 — finding 1 (Task 5, HIGH): the arrest must not undo its
  driver.** Cause (first fixer, measured on main + 7d + the plan's Task 5): after the arrest the O2 side of 7b's mixing
  point keeps a 0.05 L/min flow floor; once rocuronium wears off (≈ 15 min) the MODELED drive breathes again, the
  floor flow equilibrates with the re-ventilated alveoli, SaO2 climbs 0.2 → 90 %, `cor.hyp` decays with R23's 60 s and
  the latched pulseless sinus runs up to 109/min. Fix: (a) 7a — while `rhythm.opts.pulseless`, `cor.hyp` is held at its
  running maximum (`l2/hemo/pipeline.ts`, Task 5 Step 5 Edit 5); (b) **E-FU3-9** (7b, APPROVED) — optional
  `arterialHold` on `stepO2Lung`, set by `lungGasStep` when `coRatio <= 0`: the venous store is still updated, PaO2/SaO2
  are not recomputed. Prototype (first fixer, 7a hold + E-FU3-9, seed 16): onsets unchanged (SaO2 < 60 % at 2.02 min,
  HR < 40 at +2.55 min, PEA at +7.77 min); 6–10 min after the arrest SaO2 truth max **0.33 %**, SpO2 numeric and pulse
  rate **null** throughout, ABP flat at ≈ **15 mmHg** (pulse pressure ≤ **0.33** mmHg), pleth flat, rhythm rate held at
  **30**, **207** ECG beats in the window, all unperfused (PEA), monitor HR max **58** / mean **51.6** vs **58** /
  **57.5** in the minute before the arrest; FiO2 1 reversal **7.0 s** (0.12 min) against a **5 s** floor sourced to the
  lung-to-ear circulation delay `DELAY_EAR_S` (research/03 §"Circulatory delay"), final HR **126** (≤ 130).
- **R-2 — Orchestrator ruling (FU-3 review), 2026-09-27 — E-FU3-10 (new, ruled 17:55).** Quoted from the rulings file:
  > "**Ruling (new, 17:55) — E-FU3-10, brainstem anoxia stops the MODELED spontaneous drive:** the fixer found the
  > pulseless patient breathing at RR 43–48 (VA 97 L/min by 24 min) because 7f's drive has no anoxia term. Physiology:
  > after circulatory arrest, agonal gasping persists for seconds to ~2 min (Clark 1992; Bobrow 2008, gasping in ~1/3 of
  > OHCA, fading within minutes), then apnoea; drive returns after ROSC over minutes. Ruling: FU-3 Task 5 gains a 7f
  > component — a brainstem-perfusion gate on the MODELED drive fed by 7d's CBF (`organs.brain`, cbfRel) with the
  > pulseless flag as the fallback when organs are absent: CBF < 20 % (or pulseless) for > 30 s ⇒ agonal gasps (RR ≤ 6,
  > small VT) that fade to apnoea by 2 min; gate reopens over 1–3 min after CBF recovers. MODELED only; MANUAL and
  > Stage 3 unchanged; onsets/desaturation times unchanged; numbers in the test title. Test the 5–10 min post-arrest
  > window: RR numeric 0 (or `--`), no breaths on the CO2 trace."

  Applied in Task 5 Step 5c. Fixer's reading, for the orchestrator to confirm at the gate: the gate closes on
  `cbfRel < 0.2` **OR** no flow (`rhythm.opts.pulseless` or `coRatio <= 0`), not on CBF alone — 7d's brain reads MAP
  from `hs.lastSite`, which holds the last beat's pressures after a PEA arrest (the stale 37/29 the review saw), so CBF
  alone may never cross 20 % in the arrest this task creates. The motivating numbers (first fixer's probe, with the 7a
  hold and E-FU3-9, no gate): from ≈ 15.5 min (≈ 5.7 min after the arrest) the RR numeric read **43–48** and VA rose to
  **97 L/min** by 24 min in a pulseless patient. The block is **UNPROTOTYPED**.
- **R-3 — Orchestrator ruling (FU-3 review), 2026-09-27 — finding 2 (Task 11, HIGH).** If 7e's `condition sepsis` is not
  on the base, validation t16 becomes `it.fails` with the measured `unsupported` payload in its title (Task 11 Step 0
  and Step 3b) until 7e lands; nothing is loosened; E-FU3-6 approved on this condition.
- **R-4 — Orchestrator ruling (FU-3 review), 2026-09-27 — finding 3 (E-FU3-8).** The `engine.ts` find block is the whole
  `requestHr: (bpm) => {…}` callback (verified unique on `origin/main` + `origin/stage-7d-organs` and on
  `origin/stage-7e-endocrine-thermal`); never bare closing braces.
- **R-5 — Orchestrator ruling (FU-3 review), 2026-09-27 — finding 4 (Task 12 Step 12).** Ordinary `it` per scenario with
  per-row verdicts asserted against a recorded map; no scenario-level `it.fails`.
- **R-6 — Orchestrator ruling (FU-3 review), 2026-09-27 — finding 5.** The tick-budget and drift rigs
  (`circ-longrun` ≤ 0.3 ms/tick, `hemo-longrun`, `engine-pipeline`, `organs-soak`, `blood-budget` ≤ 0.1 ms/tick) join
  Task 5 Step 7 (with `neuro-longrun` for E-FU3-10), and the long runs join Task 4 Step 7; the measured per-tick figures
  go into the gate note.
- **R-7 — Orchestrator ruling (FU-3 review), 2026-09-27 — findings 6–9 and the smaller notes, as the reviewer worded
  them:** the reversal floor as in R-1 (5 s, `DELAY_EAR_S`; ≤ 3 min band kept; final HR ≤ 130; numbers in the title);
  Task 13/15 PNGs ≤ 60 KB with a `deviceScaleFactor: 0.7` re-take; Task 0 says `rr: 18` and is a check only; validation
  t25 arresting at ≈ 650 s is an explicit gate deviation (Task 15 Step 3 §4) with "ventilate t25?" left to the
  orchestrator; the smaller notes (the sux EC50 living in 7g's and 7f's rows, `hasLimit`'s hard-coded skin list pinning
  mindray's missing `CVP_M`) are recorded in the gate note.
- **R-8 — Orchestrator ruling (FU-3 review), 2026-09-27 — exceptions.** E-FU3-0…7 approved as the reviewer recommended;
  E-FU3-8 approved conditional on R-1 and R-4, E-FU3-6 conditional on R-3; E-FU3-9 and E-FU3-10 approved.

### Open questions the plan decides (R50 triage "the plan should decide"; one-line rationale each)

- **Q-FU3-0 — closed:** main + 7d already ventilates the rocuronium rig (`rr: 18`); Task 0 is a check (finding 8).
- **Q-FU3-1 — decided γ 6 / EC50 1160:** both pairs were measured; γ 4 / EC50 1040 passes with only 1.2 s of onset slack
  and would flip on any PK drift (D1). The tables §6.1 citation (Roy 2002) is the orchestrator's docs edit.
- **Q-FU3-3 (docs half) — decided:** naming `gvHr` in tables §6.3 is a docs edit for the orchestrator; the isoflurane
  +14 % HR residual stays a calibration row (tables T6.3 +5–10 %), no FU-3 change.
- **Q-FU3-11 (stale windows) — decided: keep NMT 120 s / BFA 5 s [ENG]:** they are the plan's own display choices
  (D10), recorded in the gate note as [ENG]; SQI/EMG and the Philips NMT/BIS conventions remain research items, not
  FU-3 work.
- **Q-FU3-12 — decided: 2 %:** Ali ruled "2 %" at G7f; the plan only notes DI 37–38 at 13 min.
- **Q-FU3-16a — decided as a deviation, not a change:** validation t25 now arrests at ≈ 650 s; its row is unchanged and
  listed in the gate note's Deviations; ventilating the document is the orchestrator's call ("ventilate t25?").
- **Q-FU3-16e — decided: SaO2-only O2 supply [ENG] is a scope statement:** a CaO2 ratio needs a 7c → 7a read that is
  not in any FU-3 partition; recorded, not asked.

### Other open questions — the plan's disposition (no FU-3 change; each a calibration or follow-up row, R45)

The orchestrator left only six questions open (see "Open questions"); the rest are disposed of here so the executor
never waits on them. None changes a band.

- **Q-FU3-2 — keep R-7f-7 `it.fails`:** the pair is capacity-limited (numbers in the title); retargeting a band is
  not an executor's act — calibration queue row for Ali's R44 pass.
- **Q-FU3-3 (isoflurane +14 %) — calibration row:** Task 3 met its own band; the residual is a tables T6.3 row.
- **Q-FU3-4b — follow-up row (7a):** `manHoldInit`'s always-on volume tracker is the same over-filling Item 7's
  deferred fix removes; decided with question 1 of "Still open".
- **Q-FU3-4c — by design, documented:** new ischaemia after a hold still lowers the delivered Emax (D4); the gate note
  says so for instructors.
- **Q-FU3-16b — keep `P_VF_ONSET` 0.1 [ENG]:** it lies between the two sourced rates; calibration row.
- **Q-FU3-16c — no PEA → asystole progression in FU-3:** DeBehnke's canine PEA lasts up to 20 min, and with R-1 the
  PEA now persists as an arrest; a teaching progression is a later [ENG] feature, not a fix.
- **Q-FU3-16d — BUILD-PLAN 7a check 7 re-wording is a docs item for the orchestrator:** the measured 17.3 min from
  apnoea (8.2 min from SaO2 < 60 %) is recorded in the gate note; the `chemoFactors` sign flip and the R23 kIsch floor
  stay as they are (pre-existing; the floor is Task 4's defect 1).
- **Q-FU3-5 — no upper tracking rate in FU-3:** `PacerOpts.upperRatePpm` is a Stage 5 follow-up; the 7d `setHr` →
  `holdRate` side effect on paced rows is recorded (pre-existing).
- **Q-FU3-6 (AF 100 −2.4 %) — `AF_RATE_CAL` knot check is a calibration row;** the disclosed-behaviour half is open
  question 6.
- **Q-FU3-7b — per-level alarm latching as skin data is a separate `l3/alarms` + skins task** (outside FU-3's
  partition). **Q-FU3-7c — mindray-like `CVP_M` is a skins-data follow-up;** `hasLimit` pins today's data (gate note).
- **Q-FU3-9a — the harness-held HR rows (t16, t17b, t19, s4-class-i) are marked "harness-held, not evidence" in the
  gate note;** the fix (omit `hr` from MODELED baselines in 8a's data, or skip that `setTarget` in 6b's runner) is an
  8a/6b follow-up, because it changes other documents' graded rows. **Q-FU3-9b — `applyEvent neuraxial` has no owner;
  t22 stays refused (STILL_REFUSED)** until a stage claims it. **Q-FU3-9c — t16's `requires` → 7e and its grading
  window vs 7e's 600 s ramp are 8a document fixes for the orchestrator** (document data outside E-FU3-6's scope).
  **Q-FU3-9d — the chronic-MR encoding is a 7a naming follow-up;** t15's CVP/PCWP rows are 7a's H8 calibration note.
- **Q-FU3-10 (other parts) — O3b's slow saline excretion is a 7d/7c calibration row; folding the stage oracles into
  `runOracle` is an 8b item; a relative `PME_PULSE_DIR` stays a docs note** (no code).
- **Q-FU3-11 (SQI/EMG, Philips conventions) — research follow-ups** (research/05 addendum; 7f publishing SQI/EMG is a
  7f item).
- **Q-FU3-12 (2.2 %) — not tried; 2 % stands (Ali's G7f ruling).** 7x.1's real-Safari check stays with Ali's LAN
  tests.

## Prototype results (before → after; seeds as in each task)

| Task | Item | Row | Band | Before (`d525eed`) | After (prototype) | Status |
|---|---|---|---|---|---|---|
| 1 | 1 sux | onset (T1 ≤ 5 %) / T1 10 % / T1 90 % (min) | 0.6–1.4 / 6–8.5 / 9.5–12.5 | 0.17 / 5.37 / 12.68 | **0.73 / 6.98 / 11.97** | `it.fails` → `it` |
| 1 | 1 sux | het T1 90 % / hom duration | 14–25 min / 4–8 h | 17.38 / 6.09 h | 17.98 / 5.54 h | pass |
| 2 | 2 sgx 0.5 after roc 1.2 | peak TOFR > 0.95 then fall ≥ 0.04 | as titled | 0.833 at +90 min, no fall | unchanged (ceiling 0.834) | stays `it.fails` (numbers in title) |
| 3 | 3 volatile reflex | phenylephrine HR drop at ≈ 1 MAC vs awake | < 0.8 × awake | 25.5 vs 12.0 (2.13 ×) | **5.0 vs 12.0 (0.42 ×)** | `it.fails` → `it` |
| 4 | 4 MANUAL | check 18 recovery MAP / CBF | 77–84 / > 0.8 | 125.27 / 0.885 | **81.13 / 0.837** | `it.fails` → `it` |
| 4 | 4 MANUAL | defect 1: kIsch min / LVEDP at MAP 65 | kIsch > 0.2 floor | 0.200 / 46.1 | 0.200 / 46.1 | new `it.fails` (ruling Q-FU3-4a) |
| 5 | 16 hypoxic arrest | HR < 40 held 30 s after SaO2 < 60 % | ≤ 6 min, before the arrest | never (HR 44–50) | **+2.55 min** | new test |
| 5 | 16 hypoxic arrest | arrest rhythm after SaO2 < 60 % | 5–14 min | none in 18 min (sinus, MAP ≈ 92) | **PEA at +7.77 min** | new test |
| 5 | 16 hypoxic arrest | FiO2 1 at the bradycardia: HR ≥ 60 / arrest / final HR | ≥ 5 s and ≤ 3 min / none / ≤ 130 | — | 7.0 s (0.12 min) / none / 126 | new test |
| 5 | 16 hypoxic arrest | 6–10 min after the arrest: SaO2 truth / SpO2, PR / ABP PP / rhythm rate / monitor HR max, mean | < 20 % / null / ≤ 5 mmHg / ≤ rate at arrest / ≤ minute before | SaO2 → 90 %, HR 109 (review) | **0.33 % / null / 0.33 / 30 / 58, 51.6 (before 58, 57.5)** | new assertions (7a hold + E-FU3-9) |
| 5 | 16 hypoxic arrest | 5–10 min after the arrest: RR numeric / VA / CO2 trace | 0 or `--` / 0 / flat | RR 43–48, VA → 97 L/min (probe) | not prototyped (E-FU3-10) | new assertions |
| 6 | 5 AAI/DDD | MODELED AAI 70 after a bleed: atrial spikes / sinus beats (60 s) | 0 / all | 96 / 0 | **0 / 96** | new test |
| 6 | 5 AAI/DDD | MANUAL AAI 60 ppm, hr 90: rate / spikes | 90 ± 3 / 0 | 60.0 / 55 | **90.4 / 0** | new test |
| 7 | 6 AF HR | philips-like AF 100 / 130 / 145 vs true | ± 1.5 % | +1.21 / +4.80 / +2.71 % | **+0.29 / +0.76 / +0.45 %** | new test |
| 8 | 7 CVP | PEEP 5 → 15 MANUAL CVP step | 2.2–3.7 mmHg | 4.82 | 4.82 (fix deferred) | new `it.fails` |
| 8 | 7 CVP | soak CVP max, `CVP_M_HIGH` in 120 s | < 9.5, none | 10.17, 4 raises | unchanged (fix deferred) | new `it.fails` |
| 8 | 7 CVP | CVP 18 raises only on skins with a vendor limit | philips, saadat only | yes | yes | new `it` × 6 |
| 9 | 8 rename | seam at rest / body-water match | ≈ 0 / 7c fallback | — | 2.55 mL/h / 0.37 mL | new test |
| 10–11 | 9 profile | documents graded | 10 | 0 | 9 (t22: no neuraxial owner) | rows reported |
| 12 | 10 oracle | O13b baseline Na / ΔNa | 140 (undosed) | 143 / −2.00 | **140 / +1.00** (Pulse +1.63) | pass (Pulse run) |
| 12 | 10 oracle | O2b lactate, O3b Hb (expect-differ) | differ | — | inside tolerance | pinned `fail` in the per-row verdict map (numbers) |
| 13 | 11 tiles | NMT/BFA drawn by the renderer | both skins | no | yes | new tests + 2 PNGs |
| 14 | 12 console / dial | raw lung rows; CO2 at rest; DI at 13 min | 0; a value; maintenance | 137; `---`; 31 | **0; 36; 38** | tests + e2e |

## Integrated verification (all prototypes cherry-picked in this plan's order onto `d525eed`, `scratch/proto-fu3-all`)

Mechanical check of THIS document: a script applied every find/replace and create block of Tasks 0–14, in order, to the
files at `d525eed`: every find block matched exactly once at its point in the sequence, and the resulting 66 files equal
the integration head byte for byte except three intended lines (the 7f dial comment says item 12, not the prototyper's
13; Task 0's comment wording; the SLOW list order of Tasks 5 and 8's entries).


Task 0's fix + Tasks 1–14 as written here, no 7e (numbers of the final run; the first run, before item 16 was added,
was identical except for Task 5's files):
`pnpm -r typecheck` clean; engine-core fast set **228 files / 996 passed, 1 skipped**; slow set **38 files / 163
passed**; audio 58, skins 173, ventilator 88, controller 215, renderer 76, demo 141 — all passed; validation 106 passed,
11 skipped, **1 failed = t16** (`condition sepsis` needs 7e; it passed on a throwaway merge with 7e `ba2d3ac`);
`pnpm build` green; `check-notices: OK`; e2e on system Chrome 30 passed, 1 skipped (9.1 min; it rewrites earlier
stages' committed gate images — Task 15 restores them). The two SLOW-list edits of Tasks 4 and 8 anchor on each other (Task 8 inserts
after Task 4's line) — cherry-picking in any other order conflicts only there. A first integration with the CVP
MECHANISM in Task 8 turned five calibrated bands red (see "Item 7: the fix is deferred"): that is why Task 8 is
evidence-only.

**After the R50 review (not in the integration above):** Task 5's post-arrest additions — the `cor.hyp` hold and
E-FU3-9 were prototyped by the first plan fixer on main + 7d + the plan's Tasks (`circ-hypoxic-arrest` 3/3,
`arterial-hold` 2/2, `mix-o2` 3/3, typecheck clean; numbers in R-1); E-FU3-10 was NOT prototyped (Task 5 Step 5c).
Tasks 11 Step 0/3b and 12 Step 12's per-row map are test-structure edits with the numbers already measured above.

## File map

| File | Tasks | Owner | Change |
|---|---|---|---|
| `packages/engine-core/src/l2/pk/nmb.ts` | 1 | 7g | sux PK row, `PCHE_CL_MULT.hom`, sux PD copy |
| `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` | 1 | 7g | sux `src` string |
| `packages/engine-core/src/l2/neuro/nmb.ts` | 1 | 7f | E-FU3-1: sux `ec50Thumb`/`gamma` |
| `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` | 3 | 7g | `VOLATILE_GVHR` on three rows |
| `packages/engine-core/src/l2/circ/model.ts` | 4 | 7a | `man.kIschRef`, the `m.kLv` line |
| `packages/engine-core/src/l2/hemo/pipeline.ts` | 4 | 7a / FU-2 | `trackCircBeat`, `setMode` fold |
| `packages/engine-core/src/l2/circ/{coronary,model,hypoxic-arrest}.ts`, `l2/hemo/pipeline.ts` | 5 | 7a | O2 content in the coronary supply, `cor.hyp` (held while pulseless), arrest request |
| `packages/engine-core/src/l2/lung/{mix-o2,lung}.ts` | 5 | 7b | E-FU3-9: `arterialHold` (no ejection ⇒ PaO2/SaO2 not recomputed) |
| `packages/engine-core/src/l2/neuro/spont.ts`, `l2/resp/pipeline.ts` | 5 | 7f / Stage 3 | E-FU3-10: brainstem-perfusion gate on the MODELED drive, `RespCtx.cbfRel` |
| `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`, `test/l2/circ/hypoxic-arrest.test.ts`, `test/l2/lung/arterial-hold.test.ts`, `test/l2/neuro/brainstem-gate.test.ts` | 5 | tests | new |
| `packages/engine-core/src/l2/ecg/{rhythm-state,atria,pacing}.ts` | 6 | Stage 5 | lower rate vs hr |
| `packages/engine-core/src/engine.ts` | 5, 6, 7 | Stage 2 | E-FU3-8 (`requestRhythm`, anchored on `requestHr`), E-FU3-10 (`advanceResp` ctx `cbfRel`), E-FU3-3 (`rhythmCtx`, `startRate`), E-FU3-4 (HR method) |
| `packages/engine-core/src/l3/hr.ts` | 7 | L3 | `hrMeasure(…, method)` |
| `packages/engine-core/src/l2/blood/core.ts`, `l2/organs/{inputs,pipeline}.ts` | 9 | 7c / 7d | rename |
| `packages/controller/scenarios/pme-scenario-1.schema.json`, `packages/controller/src/scenario/{patient,types,index}.ts` | 10 | 6b | `patient.profile`, `engineOptionsOf` |
| `packages/validation/src/segments/{run,types}.ts`, `packages/validation/suites/sanity/sanity-docs.ts` | 11 | 8a | runner + document data (E-FU3-6); `test/segments/profile-docs.test.ts` (t16 `it.fails` while 7e is absent, Step 3b) |
| `packages/validation/src/oracle/{blood-scenarios,compare}.ts`, delete `pulse-runner.ts`, `docs/validation/README.md` | 12 | 8a | blood oracle; `test/oracle-blood.test.ts` per-row verdict map (Step 12) |
| `packages/renderer/src/{numerics-neuro,device-ui,index}.ts`, `packages/skins/src/data/skins/{philips-like,saadat-like}.json` | 13 | 4a / 7f | module tiles |
| `apps/demo/src/physiology-console/{meta,organs,actions}.ts` | 14 | 7x | 7x.1 |
| `apps/demo/src/stage7f.ts`, `apps/demo/scripts/fu3-neuro-tiles-shots.mjs` | 13, 14 | 7f / demo | E-FU3-7 |
| `packages/engine-core/vite.config.ts` | 4, 5, 6, 7, 8 | CI | SLOW entries |
| tests | every task | — | listed per task |
| `docs/gates/fu-3.md`, `docs/gates/fu-3/*.png` | 15 | gate | new |

---

### Task 0: Base check — the 7f rocuronium engine rig is ventilated (7d's E-7d-4; E-FU3-0 only if still red)

**Files:**
- Modify (only if Step 1 fails): `packages/engine-core/test/engine/neuro-engine.test.ts` (7f; one dispatch + comment)

**Interfaces:** none (test rig only).

**Why:** see Global Constraints "Base precondition". The 7d integration ventilated this rig under E-7d-4 (RR 18); if
its fix is on main, Step 1 passes and Steps 2–4 are skipped. Measured on `d525eed` (seed 3): unventilated, TOFR 0.61 at 70 min,
0.87 at 100 min, hepatic flow 0.20–0.27, GFR 0 from minute 45; on 7f alone (no 7d kidney) the same rig reached 0.93 at
85 min only because the renal clearance was neutral. Ventilated: TOF 0 at 90.1 s, TOFR ≥ 0.9 at 78.5 min.

- [x] **Step 1: Check the base**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/neuro-engine.test.ts -t "rocuronium 0.6"`
Expected: **PASS is the expected outcome on any base containing 7d** (verified by the R50 review on main + 7d: the E-7d-4
fix is at `test/engine/neuro-engine.test.ts:26-30`, `rr: 18` ventilation before the dose). Tick Steps 2–4 as *not
needed* and do NOT edit the file. Only if Step 1 FAILS (a base without 7d's fix; on the prototype base it failed with
`TypeError: actual value must be number or bigint, received "undefined"` at `expect(back && back.t / 60)`) apply Step
2, which matches 7d's own RR 18 wording.

- [x] *(not needed — Step 1 passed)* **Step 2 (only if Step 1 failed): Ventilate the rig** — `packages/engine-core/test/engine/neuro-engine.test.ts`, find:

```ts
    expect(e.dispatch(drug('rocuronium', 0.6, 'mg/kg')).accepted).toBe(true);
    await run(e, 100 * 60);
```

replace with:

```ts
    // E-7d-4 / E-FU3-0 (rig fix, band unchanged): a paralysed patient is ventilated to normocapnia. Left apnoeic, the
    // rig went into hypoxic low flow (hepatic flow 0.2, GFR 0 from minute 45) and 7d's kidney stopped rocuronium's
    // renal clearance, so TOFR 0.9 was never reached in 100 min. Ventilated: TOF 0 at 90 s, TOFR 0.9 at 78.5 min.
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 18, vtMl: 500, fio2: 0.5, peep: 5 }));
    expect(e.dispatch(drug('rocuronium', 0.6, 'mg/kg')).accepted).toBe(true);
    await run(e, 100 * 60);
```

- [x] *(not needed)* **Step 3 (only if Step 2 was applied): Run it** — same command as Step 1. Expected: PASS (1 passed, 8 skipped).

- [x] *(not needed)* **Step 4 (only if Step 2 was applied): Commit**

```bash
git add packages/engine-core/test/engine/neuro-engine.test.ts
git commit -m "test(neuro): ventilate the rocuronium 0.6 engine rig — unventilated it went into low flow once 7d's kidney was live (FU-3 Task 0, E-FU3-0)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 1: Succinylcholine PK re-fit onto Roy 2002 (item 1; 7g, E-FU3-1)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/nmb.ts` (`SUCCINYLCHOLINE`, `PCHE_CL_MULT.hom`, 7g's sux PD copy, docstrings)
- Modify: `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (the succinylcholine row's `src` string)
- Modify: `packages/engine-core/src/l2/neuro/nmb.ts` (7f; **E-FU3-1**: `NMB_PD.succinylcholine` `ec50Thumb`/`gamma` + one
  docstring line)
- Test: `packages/engine-core/test/l2/neuro/nmb-course.test.ts` (7f; flip the pre-declared `it.fails`, E-FU3-2)

**Interfaces:**
- Consumes: 7g's `PerKgPk` row shape and `siteConc` (`l2/pk/**`), 7f's `NMB_PD` (`l2/neuro/nmb.ts`), the test rig
  `test/helpers/neuro.ts` / `neuro-nmb.ts`.
- Produces: `SUCCINYLCHOLINE = { v1: 0.038, v2: 0, v3: 0, cl1: 0.037, cl2: 0, cl3: 0, ke0: [0.1475, 0.236] }`,
  `PCHE_CL_MULT = { normal: 1, het: 0.5, hom: 0.011 }`, sux effect-site EC50 1160 ng/mL, γ 6 (both copies).

**Why:** `SUCCINYLCHOLINE` had CL 0.2 L/kg/min with V1 0.04 (k10 5/min, ≈ 5 × the measured elimination) and a bolus
C0/EC50 of 125, so T1 collapsed at 0.17 min. Roy JJ, Donati F, Boismenu D, Varin F, Anesthesiology 2002;97:1082 (PMID
12411790): CL 37 ± 7 mL·min⁻¹·kg⁻¹, elimination 0.97 ± 0.30 /min, effect-site EC50 734 ± 211 ng/mL, ke0 0.058 [P].
A grid over V1 0.02–0.3, CL 0.005–1, ke0 0.02–3 at EC50 200/γ 4 finds solutions only at V1 ≈ 0.215–0.25 L/kg with
CL ≈ 0.19–0.22 (5 × the paper) and NONE inside Roy's CL range — hence E-FU3-1. Alternatives measured (onset / T1 10 % /
T1 90 %): EC50 1040 γ 4: 0.62 / 6.63 / 12.37 (1.2 s of slack); EC50 1100 γ 4.5: 0.67 / 6.67 / 12.20; **EC50 1160 γ 6:
0.73 / 6.98 / 11.98 (chosen)**; EC50 1260 γ 8: 0.78 / 6.93 / 11.03; a transit compartment keeping EC50 200: 0.92 / 7.12
/ 11.15 but a new per-tick state [ENG] (rejected).

**Prototype numbers (band | before | after):** onset 0.6–1.4 | 0.17 | **0.73** · T1 10 % 6–8.5 | 5.37 | **6.98** · T1 90 %
9.5–12.5 | 12.68 | **11.97** · no fade = 1 | 1 | 1 · het T1 90 % 14–25 | 17.38 | 17.98 · hom 4–8 h | 6.09 | 5.54 · 7g
`l2/pk/nmb.test.ts` onset < 1.5 | 0.43 | 1.23, duration 6–9 | 7.2 | 8.3, het ratio 1.5–2.5 | 1.7 | 1.71, hom 240–480
min | 310.6 | 282. No per-tick cost (constants only; `pkSystem` is cached by value).

- [x] **Step 1 — the failing test (already in the tree, pre-declared by 7f).** Nothing to write: the test exists as
`it.fails('[FU-3 item 1] succinylcholine 1 mg/kg: block by ~1 min, T1 10 % at ~7.1 min, 90 % at ~10.9 min (label), no
fade', ...)` in `packages/engine-core/test/l2/neuro/nmb-course.test.ts`. Flip it to `it` FIRST so the run shows the real
numbers, then implement. Find (verbatim, anchored on content — do not use line numbers):

```ts
  // FU-3 item 1 (R51 addendum 17): 7g's succinylcholine ke0 0.15/min puts T1 ≤ 5 % at 0.17 min (clinical 45–90 s) and
  // T1 10 % at 5.4 min; the re-fit is 7g's (ke0/CL), not 7f's EC50. Pre-declared `it.fails` with the numbers measured on
  // 7g's PK at EC50 200/γ 4: onset 0.17, T1 10 % 5.37, T1 90 % 12.68 min. When FU-3 lands this starts passing, `it.fails`
  // then fails, and the FU-3 executor turns it back into `it`.
  it.fails('[FU-3 item 1] succinylcholine 1 mg/kg: block by ~1 min, T1 10 % at ~7.1 min, 90 % at ~10.9 min (label), no fade', () => {
```

Replace with:

```ts
  // FU-3 item 1 (R51 addendum 17) is done: 7g re-fitted succinylcholine onto Roy 2002's CL 0.037 L/kg/min and
  // V1 = CL/k = 0.038 L/kg with ke0 0.1475/0.236 and the effect-site EC50 1160 ng/mL, γ 6. Before: T1 ≤ 5 % at
  // 0.17 min, T1 10 % 5.37, T1 90 % 12.68. After: 0.73 / 6.98 / 11.98 min — inside the label bands, so this is `it`.
  it('[FU-3 item 1] succinylcholine 1 mg/kg: block by ~1 min, T1 10 % at ~7.1 min, 90 % at ~10.9 min (label), no fade', () => {
```

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/nmb-course.test.ts`
Expected FAIL before the implementation: `expected 0.16666666666666666 to be greater than 0.6` (onset), i.e. the
pre-declared 0.17 / 5.37 / 12.68 min.

- [x] **Step 2 — the PK re-fit.** In `packages/engine-core/src/l2/pk/nmb.ts`, find:

```ts
/**
 * Succinylcholine: plasma-cholinesterase hydrolysis (plasma t½ ≈ 8 s) [TXT]; the block's duration is the slow diffusion
 * away from the junction (no cholinesterase there) → ke0 0.15 [ENG, fitted 1 mg/kg → onset 0.43 / T1 25 % at 7.2 min].
 * CL 0.2 L/kg/min with V1 0.04 L/kg is k10 5/min, plasma t½ ≈ 8 s [TXT]. Phenotypes: PCHE_CL_MULT below.
 */
export const SUCCINYLCHOLINE: PerKgPk = { v1: 0.04, v2: 0, v3: 0, cl1: 0.2, cl2: 0, cl3: 0, ke0: [0.15, 0.24] };
```

Replace with:

```ts
/**
 * Succinylcholine (FU-3 item 1 re-fit; R51 addendum 17). Roy JJ, Donati F, Boismenu D, Varin F, Anesthesiology 2002;
 * 97:1082 "Concentration-effect relation of succinylcholine chloride during propofol anesthesia" (arterial sampling,
 * n = 7): total body clearance 37 ± 7 mL·min⁻¹·kg⁻¹ and elimination rate constant 0.97 ± 0.30 /min [P], so
 * CL 0.037 L/kg/min and V1 = CL/k = 0.037/0.97 = 0.038 L/kg [P, derived]. The pre-FU-3 values (CL 0.2 L/kg/min with
 * V1 0.04 → k10 5/min, "plasma t½ ≈ 8 s") were 5× the measured elimination rate and put T1 ≤ 5 % at 0.17 min.
 * ke0 0.1475 (thumb) / 0.236 (diaphragm, ×1.6 as for rocuronium 0.16 → 0.26, Plaud 1995) [ENG, fitted 1 mg/kg →
 * T1 ≤ 5 % at 0.73 min, T1 10 % 6.98, T1 90 % 11.98 min against the label (§5d: block ~1 min, T1 10 % 7.1, 90 % 10.9)]:
 * Roy's own ke0 0.058 ± 0.026 /min cannot reproduce the label recovery (effect-site t½ 12 min → T1 90 % ≈ 18–21 min),
 * so ke0 stays a label fit and only CL/V1 are the paper's. Phenotypes: PCHE_CL_MULT below.
 */
export const SUCCINYLCHOLINE: PerKgPk = { v1: 0.038, v2: 0, v3: 0, cl1: 0.037, cl2: 0, cl3: 0, ke0: [0.1475, 0.236] };
```

- [x] **Step 3 — the homozygous multiplier.** Same file, find:

```ts
 * the phenotypes' DURATIONS (Sux-label; Lee 2009: heterozygous ×2, homozygous 4–8 h) but no enzyme-activity value,
 * so both multipliers are [ENG, fitted to those durations]: het 0.5 → 12 min (×1.7), hom 0.003 → 5.2 h.
 */
export const PCHE_CL_MULT = { normal: 1, het: 0.5, hom: 0.003 } as const;
```

Replace with:

```ts
 * the phenotypes' DURATIONS (Sux-label; Lee 2009: heterozygous ×2, homozygous 4–8 h) but no enzyme-activity value,
 * so both multipliers are [ENG, fitted to those durations]: het 0.5 → 14.2 min (×1.71), hom 0.011 → 4.7 h. FU-3 item 1
 * re-fitted `hom` with the new CL: the multiplier scales 7g's clearance, so when CL fell from 0.2 to Roy's 0.037
 * L/kg/min the old 0.003 became k10 0.0029/min (> 10 h block, outside the 4–8 h band); 0.011 restores k10 0.0107/min,
 * i.e. the same residual hydrolysis rate the 0.003 × 0.2 pair encoded (0.015/min).
 */
export const PCHE_CL_MULT = { normal: 1, het: 0.5, hom: 0.011 } as const;
```

- [x] **Step 4 — 7g's fitting copy of the PD.** Same file, find:

```ts
  succinylcholine: { thumb: { ec50: 200, gamma: 4 }, dia: { ec50: 340, gamma: 4 } }, // effect-site fit, not a plasma EC50 [ENG]
```

Replace with:

```ts
  succinylcholine: { thumb: { ec50: 1160, gamma: 6 }, dia: { ec50: 2007, gamma: 6 } }, // FU-3 item 1: Roy 2002 measured 734 ± 211 ng/mL at the effect site [P]; 1160 = the nearest value that holds the §5d label course on the paper's CL/V1 [ENG fit], dia ×1.73
```

- [x] **Step 5 — 7f's mirrored PD row (EXCEPTION CANDIDATE).** In `packages/engine-core/src/l2/neuro/nmb.ts`, find:

```ts
 * Succinylcholine keeps 7g's effect-site value: its onset/duration miss is 7g's ke0 (FU-3 item 1), never fitted here.
```

Replace with:

```ts
 * Succinylcholine keeps 7g's effect-site value: FU-3 item 1 re-fitted it in `l2/pk/nmb.ts` (EC50 200 → 1160, γ 4 → 6)
 * together with the paper's CL/V1, because no (V1, CL, ke0) triple holds the §5d label course at EC50 200/γ 4 on a
 * clearance within Roy 2002's measured 37 ± 7 mL·min⁻¹·kg⁻¹; this row mirrors 7g's numbers, it does not fit them.
```

and find:

```ts
  succinylcholine: { ec50Thumb: 200, ec50Dia: 200 * DIA_EC50_RATIO, gamma: 4, depolarising: true }, // [ENG, 7g's effect-site value; band missed: onset 0.17 / T1 10 % 5.37 min — FU-3 item 1]
```

Replace with:

```ts
  succinylcholine: { ec50Thumb: 1160, ec50Dia: 1160 * DIA_EC50_RATIO, gamma: 6, depolarising: true }, // [FU-3 item 1: 7g's re-fitted effect-site value on Roy 2002's CL/V1 (measured EC50 734 ± 211 ng/mL [P]); holds onset 0.73 / T1 10 % 6.98 / 90 % 11.98 min]
```

- [x] **Step 6 — the row's source string.** In `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts`, find:

```ts
    doses: '1–1.5 mg/kg (ED95 0.51–0.63, M10 ch. 24 p. 677)', onset: 'block ≈ 1 min; T1 10 % 7.1 min, 90 % 10.9 (label); K +0.5 (7c)', ir: '?', src: `Sux label; Lee 2009; ${SUCCINYLCHOLINE.cl1} L/kg/min`, tag: 'P' },
```

Replace with:

```ts
    doses: '1–1.5 mg/kg (ED95 0.51–0.63, M10 ch. 24 p. 677)', onset: 'block ≈ 1 min; T1 10 % 7.1 min, 90 % 10.9 (label); K +0.5 (7c)', ir: '?', src: `Sux label; Lee 2009; Roy 2002 CL ${SUCCINYLCHOLINE.cl1} L/kg/min`, tag: 'P' },
```

- [x] **Step 7 — run.**
```
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk test/l2/neuro
CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/neuro-scenarios.test.ts
```
Expected PASS: engine-core `test/l2/pk` 79/79 and `test/l2/neuro` (incl. `nmb-course.test.ts` 8/8, `reversal.test.ts`
6/6); controller 6/6.

- [x] **Step 8 — commit**

```bash
git add packages/engine-core/src/l2/pk/nmb.ts packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts packages/engine-core/src/l2/neuro/nmb.ts packages/engine-core/test/l2/neuro/nmb-course.test.ts
git commit -m "fix(7g): re-fit succinylcholine PK onto Roy 2002's clearance — onset 0.73, T1 10 % 6.98, T1 90 % 11.98 min (FU-3 item 1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

(The tables §6.1 source cell for succinylcholine could name Roy 2002 — `docs/physiology/**` is outside this plan's
partition; listed in the gate note's open items.)

---

### Task 2: Sugammadex underdose — R-7f-7 stays `it.fails` with the capacity evidence (item 2; test only)

**Files:**
- Test: `packages/engine-core/test/l2/neuro/reversal.test.ts` (7f; title + comment of the pre-declared `it.fails`,
  criteria untouched, E-FU3-2)

**Interfaces:** none (no source change).

**Why:** the test gives rocuronium 1.2 mg/kg, waits for PTC ≥ 1 (+29.3 min in the rig), gives sugammadex 0.5 mg/kg and
requires a peak TOFR > 0.95 followed by a fall ≥ 0.04. At the dose moment 63.5 µmol of rocuronium are in the body
(A1 6.29 + A2 32.44 mg); 0.5 mg/kg of sugammadex is 16.1 µmol (25 %). 7g's instant 1:1 binding
(`bindSugammadex` + `bindSugammadexSites` in `l2/pk/nmb.ts`, called from `pipeline.ts:stepOnce`) is the Ka → ∞ limit,
exhausted by +4.6 min; the redistribution limb already exists (TOFR 0.506 at +10 → 0.172 at +30 min). An IDEAL binder
(free plasma rocuronium held at zero until the capacity is spent — an upper bound over every allocation) peaks at
**0.834**; 7g gives **0.833**. Reversible binding at Ka 1.79·10⁷ M⁻¹ (Eleveld 2007 / Ploeger 2009 class) leaves 34–226
ng/mL free rocuronium, i.e. reverses LESS (and would push the 4 mg/kg band, 2.23 vs its 2.1 floor). At the source's own
pair (Eleveld DJ et al., Anesth Analg 2007;104:582: rocuronium 0.6 + sugammadex 0.5) 7g already gives peak 0.998 at
+15.4 min then 0.952 (fall 0.045). Retargeting the dose pair is Ali's band call (Q-FU3-2), not the executor's (R45).

**Prototype numbers:** the test's pair: peak 0.833 at +90 min, no fall (unchanged) · roc 0.6 + sgx 0.5: 0.998 → 0.952 ·
roc 1.2 + sgx 0.75: 0.997 → 0.419 · roc 1.2 + sgx 1.0: 1.000 → 0.695 · sugammadex 2 / 4 / 16 mg/kg reversal 2.12 / 2.23
/ 1.80 min (bands 1.5–3 / 2.1–4.3 / 0.8–2; unchanged).

- [x] **Step 1: Record the evidence in the pre-declared test**

In `packages/engine-core/test/l2/neuro/reversal.test.ts`, find (verbatim):

```ts
  // R-7f-7 (→ 7g, FU-3 list): on 7g's binding 0.5 mg/kg at PTC after rocuronium 1.2 reaches only TOFR 0.83 at +90 min
  // and never falls (no recurarisation); 0.75 mg/kg peaks 0.997 at +13 min then falls to 0.42, 1 mg/kg to 0.70. The
  // underdose/redistribution balance is 7g's binding (plasma vs effect-site capture), not 7f's PD: pre-declared failing.
  it.fails('[R-7f-7] underdosed sugammadex (0.5 mg/kg at PTC after rocuronium 1.2) → recovery then recurarisation (TOFR falls ≥ 0.04)', () => {
```

Replace with:

```ts
  // R-7f-7 (FU-3 item 2, investigated): the mechanism the ruling asks for is already in 7g and is already at its
  // ceiling — this dose pair is CAPACITY-limited, not kinetics-limited, so the band cannot be met by any binding model.
  // At the dose moment (PTC 1, +29.3 min) 63.5 µmol of rocuronium are still in the body; 0.5 mg/kg of sugammadex is
  // 35 mg = 16.1 µmol, i.e. 25 % of it. 7g's instant 1:1 binding (bindSugammadex/bindSugammadexSites) is the Ka → ∞
  // limit and is spent by +4.6 min; an IDEAL binder that keeps free plasma rocuronium at zero until its capacity runs
  // out — the upper bound over every allocation of the same capacity — reaches peak TOFR 0.834, and 7g already reaches
  // 0.833. Reversible binding at the published Ka 1.79·10⁷ M⁻¹ leaves free rocuronium 1/Ka = 0.056 µmol/L ≈ 34 ng/mL
  // (and 138–226 ng/mL near equivalence), i.e. it reverses LESS than the current model, so it lowers the peak.
  // The mechanism itself is reproduced at the source's own dose pair (Eleveld DJ et al., Anesth Analg 2007;104:582,
  // sugammadex 0.5 mg/kg after rocuronium 0.6 mg/kg): 7g gives peak TOFR 0.998 at +15.4 min then a fall to 0.952
  // (0.045 ≥ 0.04). After rocuronium 1.2, 0.75 mg/kg peaks 0.997 at +13.1 min and falls to 0.419, 1 mg/kg to 0.695.
  // R45: the criteria are untouched and this stays `it.fails` with the measured numbers; retargeting it to the source's
  // dose pair (or to 0.75 mg/kg after 1.2) is a band decision for Ali/the orchestrator, not the executor's.
  it.fails('[R-7f-7] underdosed sugammadex (0.5 mg/kg at PTC after rocuronium 1.2) → recovery then recurarisation (TOFR falls ≥ 0.04) — capacity-limited: measured peak 0.833 at +90 min (ideal-binder ceiling 0.834), no fall', () => {
```

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro/reversal.test.ts`
Expected PASS: 6/6 (the `it.fails` still fails internally, as declared; reversal bands 2 mg/kg 2.12, 4 mg/kg 2.23,
16 mg/kg 1.80 min unchanged).

- [x] **Step 2: Commit**

```bash
git add packages/engine-core/test/l2/neuro/reversal.test.ts
git commit -m "test(7f): R-7f-7 stays it.fails — the sugammadex underdose is capacity-limited (peak 0.833, ideal-binder ceiling 0.834) (FU-3 item 2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 3: Volatile anaesthetics depress the baroreflex sympathetic HR arm — R-7f-9 (item 3; 7g data)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (7g: one shared `PdEffect` constant and one entry
  in each of the sevoflurane, isoflurane and desflurane rows)
- Test: `packages/engine-core/test/engine/neuro-circ.test.ts` (7f; flip the pre-declared `it.fails`, comment rewritten,
  E-FU3-2; already in SLOW via `neuro-*`)

**Interfaces:**
- Consumes: 7g's `PdEffect` (`l2/pk/row.ts`), `combine()`'s `gvHr` target (propofol's row uses it), 7a's
  `stepBaro(… hrGain: de.gvHr …)` in `l2/circ/model.ts` (unchanged).
- Produces: `VOLATILE_GVHR = { target: 'gvHr', emax: -1, ec50: 1, linear: true }` on the three volatile rows.

**Why:** trace `rows-anaesthetic.ts` sevoflurane `{ target: 'gv', emax: -0.3 … }` → `combine()` → `m.ext.drug` →
`control()` → `stepBaro(… gSymp: m.prof.gSymp * de.gv …, hrGain: de.gvHr …)`: at 0.96 MAC `ext.drug.gv` = 0.712 — the
G7f note's "does not reach the circulation" is inaccurate. The drop was larger because of the OPERATING POINT: SVR
×0.81 and Ees ×0.90 put MAP at 81.6 against a set point reset to 89, holding e_s at +7.3 on the steep activation side
(HR arm ×1.21 plus 16 ms of vagal withdrawal → HR 93.5 vs 73.0 awake). Phenylephrine flips e_s to −8.5 and undoes that
tachycardia (≈ 20 bpm). Tables T6.3 (sevoflurane HR "~") and Ebert TJ, Muzi M, Lopatka CW, Anesthesiology
1995;83:88–95 (0.41–1.24 MAC: MAP falls, no HR change, lower sympathetic nerve activity) say the tachycardia must not
exist: the volatile rows lack the sympathetic-HR-arm depression propofol's row carries. Direction: Kotrly 1984
(isoflurane), Muzi & Ebert 1995 (isoflurane, desflurane); size [ENG] fitted to Ebert 1995 "HR unchanged"; cross-check
Nagasaki 2001 (BRS −50–60 % at sevoflurane 2 %). Alternatives (sevoflurane 2.5 %, 20 min; drop ratio vs awake 12.0):
`gvHr` −0.3: 1.67 ✗; −0.5: 1.23 ✗; −0.7 (propofol's): 0.87 ✗; −0.9: 0.57 ✓ but HR +5.2 %; **−1.0: 0.42 ✓, HR +2.7 %
(chosen)**; `gv` −0.5 alone: 1.58 ✗.

**Prototype numbers:** reflex drop 25.5 → **5.0** bpm vs awake 12.0 (0.42 ×; band < 0.8 ×) · sevoflurane HR at 0.96 MAC
93.5 → 75.0 (awake 73.0) · MAP before phenylephrine 86.4 → 85.9 · isoflurane 0.67 MAC HR 96.3 → 83.1, desflurane 0.87 MAC
98.4 → 81.2 · 31 sibling files / 167 tests: every logged number identical except MAC fraction 0.775 → 0.776 (40 y) and
0.946 → 0.948 (80 y).

- [x] **Step 1: Flip the pre-declared test.** In `packages/engine-core/test/engine/neuro-circ.test.ts` find (verbatim):

```ts
  // R-7f-9 (→ 7g, circulation PD; R51 addendum 8): measured on the merged base at 0.98 MAC (dial 2.5 %) the HR falls
  // 93.4 → 68 (−25.4 bpm; MAP 86.3 → 99.6) against 72.9 → 61 awake (−11.9; MAP 95.5 → 114.3): ΔHR/ΔMAP 1.9 vs 0.63
  // bpm/mmHg. 7g's volatile gv −0.3 is outweighed by the reflex tachycardia the sevoflurane hypotension causes, so the
  // blunting does not show. 7f adds no baroreflex factor by design (addendum 8): pre-declared failing, reported.
  it.fails('[R-7f-9] ≈ 1 MAC sevoflurane blunts the reflex bradycardia to phenylephrine 100 µg by ≥ 20 % — through 7g alone', async () => {
```

replace with:

```ts
  // R-7f-9 (→ 7g, circulation PD; R51 addendum 8). Before FU-3, at 0.96 MAC (dial 2.5 %) the HR fell 93.5 → 68 (−25.5
  // bpm; MAP 86.4 → 99.3) against 73.0 → 61 awake (−12.0; MAP 95.5 → 114.3). 7g's volatile gv (×0.71) DID reach 7a's
  // stepBaro, but the sevoflurane hypotension (MAP 81.6 vs set 89) held e_s at +7.3 on the steep ACTIVATION side of the
  // reflex (HR arm ×1.21; tables T6.3 and Ebert 1995: HR unchanged), so phenylephrine merely undid that tachycardia.
  // FU-3: the volatile rows depress the sympathetic HR arm (`gvHr`) as propofol's does (Muzi & Ebert 1995 cardiac
  // baroslopes; fit: Ebert, Muzi & Lopatka 1995 HR unchanged) — see the rows. 7f adds no baroreflex factor (addendum 8).
  it('[R-7f-9] ≈ 1 MAC sevoflurane blunts the reflex bradycardia to phenylephrine 100 µg by ≥ 20 % — through 7g alone', async () => {
```

The test body and criterion (`expect(awake).toBeGreaterThan(3); expect(anaes).toBeLessThan(0.8 * awake);`) are unchanged (R45).

- [x] **Step 2: Run — expect FAIL.**

```
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/neuro-circ.test.ts
```

Expected: `reflex HR drop: awake 12.0, sevoflurane 25.5 bpm`, `AssertionError: expected 25.483333333333334 to be less
than 9.560000000000002`; 1 failed | 1 passed (the propofol test: `MAP 94.6 → nadir 85.3 (0.903); DI nadir 46`).

- [x] **Step 3: Implement.** In `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`:

3a. find

```ts
import type { DrugRow } from '../row.ts';
```

replace with

```ts
import type { DrugRow, PdEffect } from '../row.ts';
```

3b. find

```ts
export const ANAESTHETIC_ROWS: DrugRow[] = [
```

replace with

```ts
/**
 * Volatile depression of the sympathetic HR arm of the baroreflex (7a `gvHr`, the term propofol's row carries), per MAC,
 * linear: HR arm ×(1 − 1.0·MAC) → gone by 1 MAC (combine floor 0.05). Direction: Kotrly 1984 (isoflurane: pressor
 * baroslope falls progressively to 1.0 and 1.5 MAC), Muzi & Ebert 1995 (cardiac baroslopes equally diminished with
 * isoflurane and desflurane). Size [ENG], fit target: Ebert, Muzi & Lopatka 1995 — sevoflurane 0.41–1.24 MAC lowers
 * MAP with NO change in HR and lower sympathetic nerve activity (tables T6.3 "HR ~"); the rig's HR at 0.96 MAC is
 * 75 vs 73 awake (was 93.5 with `gv` alone). Cross-check: the phenylephrine reflex HR drop falls to ≈ 0.4× awake,
 * Nagasaki 2001 (sevoflurane 2 % / isoflurane 1.3 %: pressor BRS −50–60 %). FU-3 item 3 (R-7f-9).
 */
const VOLATILE_GVHR: PdEffect = { target: 'gvHr', emax: -1, ec50: 1, linear: true };

export const ANAESTHETIC_ROWS: DrugRow[] = [
```

3c. (sevoflurane row) find

```ts
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
```

replace with

```ts
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
```

3d. (isoflurane row) find

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 },
```

replace with

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 },
```

3e. (desflurane row) find

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'cbfVaso', emax: 0.3, ec50: 1, linear: true },
```

replace with

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'cbfVaso', emax: 0.3, ec50: 1, linear: true },
```

(Each find string occurs exactly once in the file at d525eed.)

- [x] **Step 4: Run — expect PASS.**

```
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/neuro-circ.test.ts
npx -y pnpm@9.15.9 -r typecheck
```

Expected: `reflex HR drop: awake 12.0, sevoflurane 5.0 bpm` (0.42 × awake; band < 0.8 ×), 2 passed; typecheck clean.
Then the siblings (all unchanged, see §5):

```
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-sanity-1.test.ts test/engine/circ-sanity-2.test.ts test/engine/pk-acceptance-pd.test.ts test/engine/pk-acceptance-scen.test.ts test/engine/circ-events.test.ts test/engine/hemo-acceptance.test.ts test/engine/pk-wiring.test.ts test/engine/circ-rate-rule.test.ts test/engine/truth-event.test.ts test/engine/pk-bus.test.ts test/engine/neuro-acceptance.test.ts test/l2/circ/baroreflex.test.ts test/l2/pk
CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/neuro-scenarios.test.ts
```

- [x] **Step 5: Commit.**

```
git add packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts packages/engine-core/test/engine/neuro-circ.test.ts
git commit -m "fix(pk): volatiles depress the baroreflex sympathetic HR arm (gvHr −1.0/MAC) as propofol's row does — R-7f-9 passes (reflex drop 5.0 vs 12.0 awake)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 4: MANUAL set-and-hold holds the delivered LV Emax against an ischaemic recovery — check 18 (item 4; 7a)

**Files:**
- Modify: `packages/engine-core/src/l2/circ/model.ts` (7a: the `man` field type + docstring, its default in the
  model's initial state, the `m.kLv = …` line — NOT the `stepBaro(`/`gv` line)
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (`trackCircBeat` sets `kIschRef`; the `setMode` handler in
  `applyHemoCommand` folds it into `base.eesLv` on MANUAL → MODELED)
- Create: `packages/engine-core/test/l2/circ/manual-ischaemia.test.ts` (unit, fast)
- Create: `packages/engine-core/test/engine/circ-manual-ischaemia.test.ts` (engine, 9 sim-min, defect 1 `it.fails`)
- Modify: `packages/engine-core/test/engine/organs-htn.test.ts` (7d; flip, comment only — E-FU3-2)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Interfaces:**
- Consumes: 7a's `CircModelState.man`, `ext.kIsch` (coronary, 1 Hz), `control()`; FU-2's `cOwned` (instructor
  contractility) in `trackCircBeat`; `stepCircModel`, `createCircModel`, `CTL_DT`, `RESTING_ENV` (unit test).
- Produces: `man.kIschRef: number` (1 = none) on `CircModelState.man`; `control()` applies
  `min(ext.kIsch, man.kIschRef)` to LV Emax.

**Why (check-18 rig, seed 4):** the ischaemic ventricle is built at BASELINE: MANUAL 140/80 under GA + PEEP 5 cuts LV
Emax to ×0.74 and the volume tracker adds 763 mL of stressed volume (CVP 2.5 → 6), LVEDP 26 (MODELED 13–14). At 90/52
the PP loop cuts Emax to ×0.43, CPP falls to 22, and the ischaemic spiral runs to kIsch 0.200 with LVEDP 42–47; the PP
tracker raises g 0.43 → ×2.06 so the delivered Emax stays ≈ 0.45 (defect 1). On recovery (100/60) g sits at gMax ×2.5
against kIsch 0.203 and HOLDS; 7c's lung water lowers LVEDP ≈ 1.5 mmHg, supply/demand 0.5 → 1.49, kIsch 0.2 → 1.0 in
≈ 2 min under the held knob: delivered Emax × 4.9, LVEDP 46 → 8, CO 4.5 → 7.5, MAP 81 → 125.3 (defect 2). The held knob
only ever meant "compensate kIsch 0.2". **Defect 1 is not fixed** (R45): an LVEDP guard passes check 18 but rings SBP
83 ↔ 105 and breaks hemo-acceptance 1 (0.1008 > 0.1); a coronary-reserve guard (CFR 2) breaks hemo-acceptance 3 (3.79 >
3) and hemo-nibp 9 ('done' instead of 'failed'); both latched break nibp 9 and miss the check-18 recovery premise
(77 / 0.761); venous unloading meets 90/52 and gives MAP 70, breaking check 18's premise (mapLow < 68) — check 18 is on
a knife edge that holds only while the pair is NOT met (Q-FU3-4a). Scratch evidence: `scratch/proto-fu3b-manual`.

**Prototype numbers:** check 18 recovery MAP 125.27 → **81.13** (band 77–84), CBF 0.885 → **0.837** (> 0.8) · checks
MAP 65 / hypocapnia unchanged (64.39 / 0.667 / 0.374 / PbtO2 13.96) · unit test kLv 2.5 → 0.5 · defect 1 kIsch 0.200,
LVEDP 46.1 before and after (`it.fails`) · 59 sibling files / 238 tests green (all organs-*, circ-*, hemo-acceptance,
hemo-nibp, every MANUAL `setTarget` user, `test/l2/circ`, `test/l2/hemo`, hemo-/circ-longrun).

- [x] **Step 1: Write the failing unit test** — create `packages/engine-core/test/l2/circ/manual-ischaemia.test.ts`:

```ts
// FU-3 item 4 (G7d follow-through 2): in MANUAL the tracker's LV Emax is held against the ischaemia present while it
// tracked (man.kIschRef). New ischaemia below that level still acts on top of the held picture; recovery above it does
// not raise the delivered contractility (the check-18 rig: kIsch 0.2 → 0.8 under a held Emax ×2.5 ran MAP 81 → 125).
import { describe, expect, it } from 'vitest';
import { createCircModel, CTL_DT, RESTING_ENV, stepCircModel } from '../../../src/l2/circ/model.ts';
import { createOut } from '../../../src/l2/circ/circuit.ts';

const MANUAL_ENV = { ...RESTING_ENV, modeled: false };

function kLv(eesF: number, kIschRef: number, kIsch: number, env = MANUAL_ENV): number {
  const m = createCircModel();
  m.man = { ...m.man, eesF, kIschRef };
  m.ext.kIsch = kIsch;
  stepCircModel(m, CTL_DT / 2, env, createOut()); // one control step
  return m.kLv;
}

describe('MANUAL held LV Emax against coronary ischaemia (FU-3 item 4)', () => {
  it('recovery above the tracked kIsch does not raise the delivered Emax: ×2.5 set at kIsch 0.2, kIsch back to 1 → 0.5', () => {
    expect(kLv(2.5, 0.2, 1)).toBeCloseTo(0.5, 9);
    expect(kLv(2.5, 0.2, 0.6)).toBeCloseTo(0.5, 9);
  });
  it('ischaemia below the tracked level still acts on top of the held picture', () => {
    expect(kLv(1, 0.8, 0.4)).toBeCloseTo(0.4, 9);
    expect(kLv(1.5, 1, 0.5)).toBeCloseTo(0.75, 9);
  });
  it('the default reference (1) leaves 7a unchanged in both modes', () => {
    expect(kLv(1.2, 1, 0.7)).toBeCloseTo(0.84, 9);
    const m = createCircModel();
    stepCircModel(m, CTL_DT / 2, RESTING_ENV, createOut());
    const n = createCircModel();
    n.man = { ...n.man, kIschRef: 0.2 }; // MODELED ignores the MANUAL tracker's outputs
    n.ext.kIsch = 1;
    stepCircModel(n, CTL_DT / 2, RESTING_ENV, createOut());
    expect(n.kLv).toBe(m.kLv);
  });
});
```

- [x] **Step 2: Flip the pre-declared check-18 test** — in `packages/engine-core/test/engine/organs-htn.test.ts`:

Find (verbatim, `test/engine/organs-htn.test.ts`):

```ts
  // `it.fails` on the real 7c (gate §10), band unchanged: the MAP PREMISE is lost, not the CBF property. 7a's MANUAL
  // tracker reaches MAP 65 in this 75 y HTN profile with Ees ×2.06 and an ischaemic ventricle (kIsch at its 0.2 floor,
  // LVEDP 46–48 mmHg); 7c's lung-water seam (G7b ruling 8) turns that LVEDP into EVLWI +8.5 mL/kg over 45 min, and the
  // changed lung shifts the coronary supply/demand ratio past 7a's escape point — kIsch 0.2 → 0.8 in ≈ 60 s with the
  // set-and-hold tracker already at Ees ×2.5, so MAP runs 81 → 125 before PaCO2 reaches 35 (measured: MAP 125.3, CBF
  // 0.885). With 7c's lung water pinned off the same rig gives MAP 81.1, CBF 0.84. Owner: 7a (MANUAL ischaemic
  // bistability under set-and-hold) — calibration / FU-3; the brain is not re-tuned (R45).
  it.fails('restoring PaCO2 35 and MAP ≈ 80: CBF > 80 %', () => {
```

Replace with:

```ts
  // Was `it.fails` on the real 7c (gate §10: MAP 125.3): 7a's MANUAL tracker reached MAP 65 with Emax ×2.06 in an
  // ischaemic ventricle (kIsch 0.2, LVEDP 46–48); 7c's lung water tipped kIsch 0.2 → 0.8 under the held Emax ×2.5 and
  // MAP ran 81 → 125. FU-3 item 4 (7a MANUAL set-and-hold, mechanism): a held LV Emax is not raised by an ischaemic
  // recovery above the kIsch it was set against (model.ts `man.kIschRef`), so the escape cannot run MAP past the
  // instructor's target: MAP 81.1, CBF 0.837 at PaCO2 35. The ventricle still sits at kIsch 0.2 / LVEDP 46 through the
  // hour (FU-3 item 4 defect 1: `circ-manual-ischaemia.test.ts`, `it.fails`). Band unchanged (R45).
  it('restoring PaCO2 35 and MAP ≈ 80: CBF > 80 %', () => {
```

- [x] **Step 3: Run — expect FAIL**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/manual-ischaemia.test.ts test/engine/organs-htn.test.ts
```

Expected: 2 failed. `manual-ischaemia.test.ts` "recovery above the tracked kIsch …": `expected 2.5 to be close to 0.5`
(the other two unit tests pass on the base — they pin the unchanged behaviour); `organs-htn.test.ts` "restoring PaCO2 35
and MAP ≈ 80": `expected 125.26748199405434 to be less than 84` (logged `mapRec: 125.267…, recovered: 0.885…`). The unit
file also fails to typecheck until Step 4 (`kIschRef` does not exist on `man`).

- [x] **Step 4: Implement** — `packages/engine-core/src/l2/circ/model.ts` (anchor by content; do not touch the
`stepBaro`/`gv` line):

Find (verbatim, `src/l2/circ/model.ts`):

```ts
  /** MANUAL tracker outputs (Task 14; neutral in MODELED): LV Emax ×, systemic R (null = base), venous V0 +, RV Emax ×, PVR (null = base). */
  man: { eesF: number; rSys: number | null; dV0: number; eesRvF: number; pvr: number | null };
```

Replace with:

```ts
  /**
   * MANUAL tracker outputs (Task 14; neutral in MODELED): LV Emax ×, systemic R (null = base), venous V0 +, RV Emax ×,
   * PVR (null = base); kIschRef (FU-3 item 4) = the coronary kIsch the tracker's LV Emax was set against (1 = none).
   */
  man: { eesF: number; rSys: number | null; dV0: number; eesRvF: number; pvr: number | null; kIschRef: number };
```

Find (verbatim, `src/l2/circ/model.ts`):

```ts
mapSetPinned: false, man: { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null }, lastVentT: -1,
```

Replace with:

```ts
mapSetPinned: false, man: { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null, kIschRef: 1 }, lastVentT: -1,
```

Find (verbatim, `src/l2/circ/model.ts`):

```ts
const NEUTRAL_MAN = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null } as const;
```

Replace with:

```ts
const NEUTRAL_MAN = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null, kIschRef: 1 } as const;
```

Find (verbatim, `src/l2/circ/model.ts`):

```ts
  m.kLv = b.eesF * de.ees * m.ext.kLv * m.ext.kIsch * man.eesF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc; // Stage 7g: β-blockade blunts the surge
```

Replace with:

```ts
  // FU-3 item 4: in MANUAL the tracker's LV Emax was set against the ischaemia present while it tracked (kIschRef):
  // new ischaemia below that level still acts on top of the held picture, but recovery above it does not raise the
  // delivered contractility past what the instructor's pressures were built on (MODELED: kIschRef 1, kIsch as is)
  m.kLv = b.eesF * de.ees * m.ext.kLv * Math.min(m.ext.kIsch, man.kIschRef) * man.eesF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc; // Stage 7g: β-blockade blunts the surge
```

`packages/engine-core/src/l2/hemo/pipeline.ts`:

Find (verbatim, `src/l2/hemo/pipeline.ts`):

```ts
  if (cOwned) hs.circ.man.eesF = cT;
  if (!tr.pActive) return; // set-and-hold (see HemoState.manHold)
```

Replace with:

```ts
  if (cOwned) hs.circ.man.eesF = cT;
  // FU-3 item 4: while the tracker owns LV Emax it is set against the current ischaemia; the hold keeps that reference
  hs.circ.man.kIschRef = cOwned ? 1 : tr.pActive ? hs.circ.cor.kIsch : hs.circ.man.kIschRef;
  if (!tr.pActive) return; // set-and-hold (see HemoState.manHold)
```

Find (verbatim, `src/l2/hemo/pipeline.ts`):

```ts
        c.base.eesLv *= c.man.eesF;
```

Replace with:

```ts
        c.base.eesLv *= c.man.eesF * Math.min(1, c.man.kIschRef / Math.max(1e-6, c.ext.kIsch)); // FU-3 item 4: the delivered Emax
```

Find (verbatim, `src/l2/hemo/pipeline.ts`):

```ts
        c.man = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null };
```

Replace with:

```ts
        c.man = { eesF: 1, rSys: null, dV0: 0, eesRvF: 1, pvr: null, kIschRef: 1 };
```

- [x] **Step 5: Run — expect PASS**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/manual-ischaemia.test.ts test/engine/organs-htn.test.ts
npx -y pnpm@9.15.9 -r typecheck
```

Expected: 6 passed; logged check-18 numbers `mapLow 64.386, low 0.6667, hypo 0.3744, pbto2 13.963, mapRec 81.133,
recovered 0.8369` (checks 1 and 2 bit-identical to the base: the reference only differs after a hold). Typecheck clean.

- [x] **Step 6: Record defect 1 as `it.fails` (R45)** — create `packages/engine-core/test/engine/circ-manual-ischaemia.test.ts`:

```ts
// FU-3 item 4 (G7d follow-through 2, tables §7 check 18 rig): 7a's MANUAL tracker narrows pulse pressure by lowering LV
// Emax. In the 75 y HTN profile (stiff LV, resting LVEDP 20) under GA and IPPV it holds 140/80 with Emax ×0.74 and LVEDP
// 26; for 90/52 it cuts Emax to ×0.43, LVEDP 29 takes CPP (aortic DBP − LVEDP) under 7a's coronary balance and the
// ischaemic spiral parks the ventricle at the kIsch floor (0.200) with LVEDP 46 while the tracker raises Emax to ×2.06 to
// hold PP. `it.fails` (R45, band unchanged): every tracker guard that keeps this ventricle perfused also refuses
// instructor pairs that Stage 2 requires to be met — a guard on coronary reserve < 2 AND LVEDP > 18 (Forrester)
// passes this rig (kIsch 0.978, LVEDP 12.2) but breaks Stage 2 acceptance 9 (NIBP at SBP 45/30 must fail: 'done') and
// misses check 18's recovery premise (MAP 76.9, CBF 0.761); a reserve-only guard (CFR < 2) also breaks Stage 2
// acceptance 3 (90/50 met ±3: 3.79) and an LVEDP-only guard (> 18) breaks acceptance 1 at HR 60 (fp − fa 0.1008).
// Whether MANUAL may refuse an instructor pair that needs an ischaemic ventricle is a ruling (FU-3 draft, open question).
import { describe, expect, it } from 'vitest';
import type { CircEvent } from '../../src/index.ts';
import { organsRig } from '../helpers/organs.ts';

describe('MANUAL MAP target in a stiff elderly ventricle (FU-3 item 4)', () => {
  it.fails('90/52 in the 75 y HTN profile under GA: no ischaemic spiral (kIsch > 0.9) and LVEDP back under the congestion threshold (18) in the last 2 min — measured kIsch 0.200, LVEDP 46.1', async () => {
    const r = organsRig({ seed: 4, patient: { ageY: 75, weightKg: 70, conditions: [{ id: 'htn' }], baseline: { sbp: 140, dbp: 80 } } });
    const circ: CircEvent[] = [];
    r.e.on((x) => circ.push(x as CircEvent), ['circ']);
    r.send({ type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
    r.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', vtMl: 500, fio2: 0.25, peep: 5, rr: 18 } });
    await r.run(300);
    const t0 = r.e.now().simT;
    r.send({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30 } });
    r.send({ type: 'setTarget', variable: 'dbp', value: 52, ramp: { durationS: 30 } });
    await r.run(240);
    const after = circ.filter((c) => c.t > t0);
    const kIsch = Math.min(...after.map((c) => c.kIsch));
    const late = after.filter((c) => c.t > t0 + 120);
    const lvedp = late.reduce((a, c) => a + c.lvedp, 0) / late.length;
    console.log(`FU-3 item 4: after 90/52 kIsch min ${kIsch.toFixed(3)}, LVEDP (last 2 min) ${lvedp.toFixed(1)}, MAP ${r.last().brain.mapHead.toFixed(1)}`);
    expect(kIsch).toBeGreaterThan(0.9); // measured 0.200 (the floor)
    expect(lvedp).toBeLessThan(18); // PCWP 18: pulmonary congestion (Forrester et al., NEJM 1976); measured 46.1
  }, 120_000);
});
```

and add it to the SLOW list in `packages/engine-core/vite.config.ts` (CI amendment 2; 9 sim-min):

Find (verbatim, `vite.config.ts`):

```ts
  'test/engine/organs-curves.test.ts', // Stage 7d: curve acceptance (up to 2.5 sim-h)
```

Replace with:

```ts
  'test/engine/organs-curves.test.ts', // Stage 7d: curve acceptance (up to 2.5 sim-h)
  'test/engine/circ-manual-ischaemia.test.ts', // FU-3 item 4: the check-18 rig to MAP 65 (9 sim-min)
```

Run:

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-manual-ischaemia.test.ts
```

Expected: 1 passed (as `it.fails`), log `FU-3 item 4: after 90/52 kIsch min 0.200, LVEDP (last 2 min) 46.1, MAP 64.4`.

- [x] **Step 7: Siblings** (all MANUAL set-and-hold users, the organs engine tests, 7a circ tests):

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/l2/hemo test/engine/circ-arrest.test.ts test/engine/circ-beats.test.ts test/engine/circ-events.test.ts test/engine/circ-manual-contractility.test.ts test/engine/circ-manual-ischaemia.test.ts test/engine/circ-manual.test.ts test/engine/circ-modeled.test.ts test/engine/circ-pipeline.test.ts test/engine/circ-sanity-1.test.ts test/engine/circ-sanity-2.test.ts test/engine/circ-stage2-recheck.test.ts test/engine/circ-teaching.test.ts test/engine/hemo-acceptance.test.ts test/engine/hemo-engine.test.ts test/engine/hemo-nibp.test.ts test/engine/hemo-vf.test.ts test/engine/organs-alarm.test.ts test/engine/organs-wiring.test.ts test/engine/organs-htn.test.ts test/engine/organs-tbi.test.ts test/engine/organs-tbi-treatment.test.ts test/engine/organs-renal.test.ts test/engine/organs-curves.test.ts test/engine/pacer-engine.test.ts test/engine/stage3-alarms-engine.test.ts test/engine/engine-commands.test.ts test/engine/alarms-engine.test.ts test/engine/hr-skin-averaging.test.ts test/engine/resp-engine.test.ts test/engine/resp-oxygen.test.ts test/engine/resp-airway.test.ts test/engine/resp-coupling.test.ts test/engine/neuro-spont.test.ts test/engine/circ-rate-rule.test.ts
```

Expected: 59 files passed, 238 tests passed, 1 skipped (prototype: 117 s wall).

Then the long runs and the tick budget (R50 finding 5; SLOW files — serially, in the background with a log under
`<scratchpad>/fu-3-followups/`, bounded waits):

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run --no-file-parallelism test/engine/circ-longrun.test.ts test/engine/hemo-longrun.test.ts test/engine/engine-pipeline.test.ts
```

Expected: all pass; `circ-longrun` prints `circulation … ms per tick` ≤ 0.3 (write the measured figure into the gate
note). Task 4 changes one multiplication in the control step, so no per-tick change is expected.

- [x] **Step 8: Commit**

```bash
git add packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/l2/circ/manual-ischaemia.test.ts packages/engine-core/test/engine/circ-manual-ischaemia.test.ts packages/engine-core/test/engine/organs-htn.test.ts packages/engine-core/vite.config.ts
git commit -m "fix(circ): MANUAL set-and-hold holds the delivered LV Emax against an ischaemic recovery (FU-3 item 4)" -m "A held LV Emax is not raised by coronary recovery above the kIsch it was set against (man.kIschRef); new ischaemia below it still acts. Flips tables §7 check 18 recovery (MAP 125.3 -> 81.1, CBF 0.837). Defect 1 (ischaemic ventricle at MAP 65) stays it.fails in circ-manual-ischaemia.test.ts with the guard evidence." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 5: MODELED hypoxaemic bradycardia and asphyxial arrest (item 16; 7a, E-FU3-8, E-FU3-9, E-FU3-10)

**Files:**
- Create: `packages/engine-core/src/l2/circ/hypoxic-arrest.ts` (7a)
- Modify: `packages/engine-core/src/l2/circ/coronary.ts` (7a: O2 content in the supply, `hyp`), `packages/engine-core/src/l2/circ/model.ts`
  (7a: `G_SA`, `K_HYP_MIN`, the sinus-rate and contractility terms — not the `stepBaro(`/`gv` line, not Task 4's
  `m.kLv` change beyond multiplying in `kHyp`), `packages/engine-core/src/l2/hemo/pipeline.ts` (7a: `o2Rel` to the coronary
  step, the `cor.hyp` hold while pulseless, the arrest request), `packages/engine-core/vite.config.ts` (one SLOW entry)
- Modify: `packages/engine-core/src/engine.ts` — **E-FU3-8**: one `requestRhythm` callback (6 lines) in `advanceHemo`'s
  context, after `requestHr` (the find block is the whole `requestHr` callback — R50 finding 3), mirroring 7g's
  `req7g` path (the rhythm state, `startRate`, `holdRate` and `rhythmCtx` are engine-private; 7e also edits
  `engine.ts` — anchor by content); **E-FU3-10**: `cbfRel` on the `advanceResp` context line
- Modify (**E-FU3-9**, 7b): `packages/engine-core/src/l2/lung/mix-o2.ts` (`O2LungInputs.arterialHold`, one line in
  `stepO2Lung`), `packages/engine-core/src/l2/lung/lung.ts` (`lungGasStep` passes `arterialHold: x.coRatio <= 0`)
- Modify (**E-FU3-10**, 7f / Stage 3): `packages/engine-core/src/l2/neuro/spont.ts` (brainstem-perfusion gate),
  `packages/engine-core/src/l2/resp/pipeline.ts` (`RespCtx.cbfRel`; `noFlow`/`cbfRel` into `stepSpontDrive`)
- Create: `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` (4 tests, 15–20 sim-min each → SLOW),
  `packages/engine-core/test/l2/circ/hypoxic-arrest.test.ts` (6 unit tests),
  `packages/engine-core/test/l2/lung/arterial-hold.test.ts` (2 unit tests, E-FU3-9),
  `packages/engine-core/test/l2/neuro/brainstem-gate.test.ts` (5 unit tests, E-FU3-10)

**Interfaces:**
- Consumes: 7a's coronary step (`stepCoronary`, R23 `kIsch`), `chemoFactors` SaO2 input, FU-2's rate rule
  (`SINUS_FAMILY`, `hrModel`), the `outcome` RNG stream, `holdRate`/`startRate`/`applyRhythm`/`rhythmCtx` (engine).
- Produces: `stepCoronary(c, beats, cfr, dt, hr, o2Rel = 1)`; `CoronaryState.hyp: number`; `HemoCtx.requestRhythm?:
  (id: RhythmId, opts: RhythmOpts) => void`; exports `SAO2_REF`, `TAU_HYP_S` (coronary.ts), `G_SA`, `K_HYP_MIN`
  (model.ts), `HYP_ARREST`, `P_VF_ONSET`, `P_ASYSTOLE_ONSET`, `hypoxicArrestRequest` (hypoxic-arrest.ts);
  `O2LungInputs.arterialHold?: boolean` (mix-o2.ts, E-FU3-9); `RespCtx.cbfRel?: number` (resp/pipeline.ts),
  `SpontInputs.noFlow?`/`cbfRel?`, `SpontDrive.anoxS?`/`gate?`, exports `BRAINSTEM_CBF_MIN`, `GASP_ONSET_S`,
  `GASP_END_S`, `GASP_RR`, `GASP_VT_FRAC`, `GATE_REOPEN_S` (neuro/spont.ts, E-FU3-10).
- Consumes (E-FU3-10): 7d's `ps.organs.brain.cbfRel` (read one step late: organs advance after resp, R51 chain),
  the rhythm's `opts.pulseless` and Stage 3's `rs.coRatio` as the no-flow fallback.

**Why ("G7d follow-through 4", FU-3 item 16, HIGH for teaching realism):** an unventilated paralysed MODELED patient
stays in sinus rhythm for as long as the run lasts (the 7f rig: 90 min at SaO2 0, PaCO2 273, pH 6.56, MAP 46). Probe
(MODELED 40 y, rocuronium 0.6, room air, seed 5): SaO2 < 60 % at 2.0 min, 0.1 % from 8 min, sinus 44–50/min with MAP
89–92. Code path: `coronary.ts:stepCoronary` counts coronary FLOW only (kIsch 1.00 at SaO2 0); the only hypoxic rate
effect is `chemoFactors`' carotid-chemoreflex rule (floored ×0.5, offset by the baroreflex); nothing in MODELED can switch
the rhythm on physiology (only 7g's drug hooks and device outcomes). Mechanism (MODELED only; MANUAL passes o2Rel 1 and
never requests a rhythm — bit-identical): (1) the coronary supply = flow × min(1, SaO2/0.97) (myocardial O2 delivery =
flow × CaO2 with ≈ 70 % resting extraction — Guyton & Hall [TXT]; with CFR 3.5 no deficit appears above SaO2 ≈ 25–30 %,
so the Stage 3 desaturation phases are untouched); (2) `cor.hyp` = the hypoxaemic share of the deficit, rising with
`TAU_HYP_S` 150 s [ENG, fitted to the arrest window], recovering with R23's 60 s; (3) sinus-node depression
`max(0.05, 1 − G_SA·hyp)`, `G_SA` 1.5 [ENG, fit: HR < 40 within 6 min of SaO2 < 60 %]; (4) contractility `max(0.02,
1 − hyp)` on both ventricles and atria [ENG]; (5) at `hyp ≥ 0.9` one draw on the `outcome` stream: VF `P_VF_ONSET` 0.1
[ENG between swine 7/30 at onset (Varvarousi 2015) and humans 1.7 % shockable (Tokyo FBAO, Resuscitation 2024)],
asystole 2/30 [P], else bradycardic PEA (the running sinus-family rhythm, `pulseless: true`; PEA 21/30 [P]). Sources
[P]: DeBehnke DJ et al., Resuscitation 1995;30:169–175 (canine asphyxia: loss of aortic pulsations 11.4 ± 2.4 min, PEA
up to 20 min); Varvarousi G et al., Lab Anim 2011 (swine: 9.67 ± 1.36 / 9.25 ± 1.50 min); Varvarousi G et al., Acad
Emerg Med 2015;22:518–524 (onset PEA 21, VF 7, asystole 2 of 30); research 03 §8.8 B [TXT]. A "loss of pulsations"
pressure trigger was tried and rejected (the lumped ventricle still moves ≈ 1 L/min at contractility 0.005).
**Do not re-break the 7f rocuronium rig** (Task 0 / E-7d-4): it is ventilated, so `cor.hyp` stays 0 there.

**After the arrest (R50 finding 1, rulings R-1 and R-2).** The first draft tested only the onsets. Measured by the
reviewer on the patched tree (run to 20 min): at 16 min SaO2 61.8 %, at 20 min 90 % with the latched pulseless sinus
at 109/min and a frozen ABP numeric 37/29 — the arrest undid its own driver. Three mechanisms keep it an arrest:
(a) **7a** — a pulseless heart is not reperfused, so while `rhythm.opts.pulseless` the coronary step holds `cor.hyp` at
its running maximum (neither the myocardial nor the SA-node depression unwinds; Step 5, `pipeline.ts` Edit 5);
(b) **E-FU3-9 (7b)** — at zero cardiac output the O2 mixing point stops recomputing PaO2/SaO2 (the 0.05 L/min O2-side
flow floor, 7b's "arrest: q = 0 gave NaN" fix, otherwise equilibrates a phantom flow with alveoli the MODELED drive
re-ventilates once rocuronium wears off at ≈ 15 min); the venous store still steps (Step 5b);
(c) **E-FU3-10 (7f)** — the MODELED spontaneous drive is gated by brainstem perfusion (7d's CBF, no-flow fallback):
after more than 30 s without perfusion only agonal gasps (RR ≤ 6, small VT) that fade to apnoea by 2 min; the gate reopens over 2 min
[ENG, inside the ruling's 1–3 min] once perfusion returns (Clark JJ et al., Ann Emerg Med 1992;21:1464–1467 [P]:
agonal respirations are common at the onset of cardiac arrest; Bobrow BJ et al., Circulation 2008;118:2550–2554 [P]:
gasping in ≈ 1/3 of out-of-hospital arrests, less frequent the longer the arrest has lasted). Without (c) the first
fixer's probe (with a and b) showed the pulseless patient breathing at RR 43–48 from ≈ 5.7 min after the arrest, VA
rising to 97 L/min by 24 min (SaO2 held by b). (c) is UNPROTOTYPED — Step 5c says how to land it. Note for the sibling
runs: (b) applies in any zero-output state in either mode (unperfused asystole/VF without CPR, MANUAL included — the
arterial gas simply stops changing), and (c) closes the MODELED drive whenever CBF < 20 % (e.g. a TBI with CPP near 0).

**Prototype numbers (seed 16; before → after):** HR < 40 held 30 s after SaO2 < 60 %: never (HR 44–50) → **+2.55 min**
(band ≤ 6 min, before the arrest) · arrest after SaO2 < 60 %: none in 18 min → **PEA at +7.77 min** (band 5–14 min; ≈ 9.8
min after the dose) · FiO2 1 at the bradycardia: → HR ≥ 60 after 0.12 min = **7.0 s**, no arrest, final HR 126
(band ≥ 5 s floor = `DELAY_EAR_S` and ≤ 3 min; final HR ≤ 130 [ENG]) · **6–10 min after the arrest (7a hold + E-FU3-9,
first fixer): SaO2 truth max 0.33 %, SpO2 numeric null, pulse rate null, ABP flat ≈ 15 mmHg with pulse pressure
≤ 0.33 mmHg, pleth flat, rhythm rate 30 (30 at the arrest), 207 ECG beats all unperfused, monitor HR max 58 / mean 51.6
(minute before the arrest 58 / 57.5)**; onsets unchanged (2.02 / +2.55 / +7.77 min) · 5–10 min after the arrest (E-FU3-10):
not prototyped — target RR numeric 0 or `--`, VA 0, flat CO2 trace · MANUAL: sinus
(unchanged) · Stage 3 desaturation re-check (MANUAL) preox 485 s, room 41 s, child 130 s, obese 169 s (unchanged);
the same four in MODELED 474 / 34 / 162 / 162 s before and after · MODELED probes: preoxygenated adult PEA 8.2 min after
SaO2 < 60 % (17.3 min after apnoea), child +7.2, obese +7.8 · 36 sibling engine files / 162 tests + `test/l2/circ` 19
files green. Validation t25 (rocuronium, never ventilated for 29 min) now arrests at ≈ 650 s; its graded `rr` row reads
1 s before and after (Q-FU3-16a).
Before Step 5's `engine.ts` edit run `git fetch origin && git merge origin/main` (R51 §7; 7e edits `engine.ts`).

- [x] **Step 1: write the failing engine test** `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`:

```ts
// FU-3 item 16: the MODELED asphyxial sequence — an apnoeic paralysed adult on room air desaturates, becomes
// bradycardic, then arrests (bradycardic PEA, or asystole / VF by the seeded onset draw); oxygenating before the arrest
// reverses the bradycardia; MANUAL is unchanged (the instructor owns the rhythm). Bands (R45 targets):
//   HR < 40 (held 30 s) after SaO2 first < 60 % and before the arrest, within 6 min — the asphyxia models' heart rate peaks at
//     2–6 min after the airway is occluded and falls steadily until the pulsations are lost (DeBehnke 1995, dogs;
//     Varvarousi 2011, swine) [P]; 40/min is the item's threshold.
//   arrest 5–14 min after SaO2 first < 60 % — loss of aortic pulsations 9.3–9.7 ± 1.4 min (swine, Varvarousi 2011)
//     and 11.4 ± 2.4 min (dogs, DeBehnke 1995) after airway occlusion on room air (≈ mean ± 2 SD: 6.5–16 min), less
//     the ≈ 1.5–2 min a room-air apnoea takes to reach SaO2 60 % [P].
//   6–10 min AFTER the arrest (R50 review finding 1, orchestrator ruling 2026-09-27): the arrest is a monitor-visible
//     arrest and stays one — organised beats on the ECG with no mechanical beat (PEA: every beat `mech.perfused`
//     false), no pulse (pulse rate invalid, ABP pulse pressure ≤ 5 mmHg), SaO2 < 20 % and the SpO2 numeric
//     unmeasurable or < 20 %, and the heart rate not rising (the rhythm's rate ≤ its rate at the arrest; the monitor's
//     HR numeric no higher than in the minute before the arrest). A pulseless, unperfused heart does not recover its
//     hypoxic depression, and no blood is ejected to carry re-oxygenated blood to the arteries (E-FU3-9).
//   5–10 min AFTER the arrest (E-FU3-10, orchestrator ruling 2026-09-27 17:55): no spontaneous breathing — agonal
//     gasps last seconds to ≈ 2 min after the circulation stops, then apnoea (Clark 1992; Bobrow 2008) [P]: the RR
//     numeric reads 0 or `--`, alveolar ventilation is 0 and the CO2 trace is flat.
// Multi-sim-minute engine runs: yields once per sim-minute (CI rule), SLOW list.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

type Body = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
let n = 0;
const cmd = (c: Body) => ({ id: `ha${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event } as Body);
const ADULT = { weightKg: 70, heightCm: 175, ageY: 40, sex: 'M' as const };
const ARREST_IDS = new Set(['asystole', 'vfCoarse', 'vfFine']);
/** A bradycardia is HR < 40 held for 30 s (the chemoreflex's sign change at SaO2 60 % dips the rate below 40 for a
 * few seconds while the baroreflex catches up; that transient is not the hypoxic bradycardia). */
const BRADY_HOLD_S = 30;
/** The post-arrest window (s after the arrest) the R50 review asked to be tested: 6–10 min. */
const WIN = [360, 600] as const;
/** The post-arrest breathing window of the E-FU3-10 ruling: 5–10 min. */
const RESP_WIN = [300, 600] as const;
/** CO2 waveform rate (l2/co2/capno.ts CO2_RATE). */
const CO2_HZ = 62.5;
type Rhythm = { id: string; opts: { pulseless?: boolean } };
const rhythmOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: { rhythm: Rhythm } }).st.rhythm;
const vaOf = (e: ReturnType<typeof createEngine>) => (e as unknown as { st: { resp: { vaLpm?: number } } }).st.resp.vaLpm ?? 0;
const arrested = (r: Rhythm) => r.opts.pulseless === true || ARREST_IDS.has(r.id);

/** Monitor-visible samples, one per second, in the post-arrest window (and the monitor HR before the arrest). */
interface Window {
  rate: number[]; // the rhythm's rate (state `hr`)
  hrMon: number[]; // the monitor's HR numeric (measurement `hr`)
  sat: number[]; // SaO2 truth (state `spo2`)
  spo2Shown: Array<number | null>; // the SpO2 numeric (null = unmeasurable)
  pr: Array<number | null>; // the pulse-rate numeric (null = no pulse detected)
  abpPp: number[]; // ABP trace max − min over 5 s, every 30 s
  beats: number; // ECG beats in the window
  perfused: number; // of which mechanically perfused
}
/** Breathing samples in the E-FU3-10 window (only with the capnograph on). */
interface RespWindow {
  rr: Array<number | null>; // the RR numeric, one per second (null = `--`)
  va: number[]; // alveolar ventilation truth (L/min), one per second
  co2Range: number[]; // CO2 trace max − min over 30 s, every 30 s (mmHg)
}
interface Course {
  tSat60?: number; tBrady?: number; tArrest?: number; arrestRhythm?: string; hrAfter: Array<[number, number]>; tVent?: number;
  rateAtArrest?: number; hrMonBefore: number[]; win: Window; resp: RespWindow;
}

/** Paralysed (rocuronium 0.6 mg/kg), never ventilated, room air; optionally oxygenated (FiO2 1) once HR < 40 has held 30 s. */
async function asphyxia(mode: 'modeled' | 'manual', ventAtBrady: boolean, endS: number, abp = false, co2 = false): Promise<Course> {
  const sensors = { ...(abp ? { abp: 'connected' } : {}), ...(co2 ? { co2: 'on' } : {}) };
  const e = createEngine({ seed: 16, mode, patient: abp || co2 ? { ...ADULT, sensors } : ADULT });
  const c: Course = {
    hrAfter: [], hrMonBefore: [], win: { rate: [], hrMon: [], sat: [], spo2Shown: [], pr: [], abpPp: [], beats: 0, perfused: 0 },
    resp: { rr: [], va: [], co2Range: [] },
  };
  let spo2 = 100;
  let hr = 75;
  let hrMon: number | null = null;
  let spo2Shown: number | null = null;
  let pr: number | null = null;
  let rr: number | null = null;
  let below = -1; // start of the current run of HR < 40
  const after = (t: number, w: readonly [number, number]) => c.tArrest !== undefined && t - c.tArrest >= w[0] && t - c.tArrest <= w[1];
  const inWin = (t: number) => after(t, WIN);
  e.on((x: EngineEvent) => {
    if (x.type === 'beat') {
      if (inWin(x.t)) {
        c.win.beats++;
        if (x.mech.perfused) c.win.perfused++;
      }
      return;
    }
    if (x.type === 'measurement') {
      if (x.values.hr) hrMon = x.values.hr.value;
      if (x.values.spo2) spo2Shown = x.values.spo2.value;
      if (x.values.pr) pr = x.values.pr.value;
      if (x.values.rr) rr = x.values.rr.value;
      return;
    }
    if (x.type !== 'state') return;
    spo2 = x.values.spo2 ?? spo2;
    hr = x.values.hr ?? hr;
    if (c.tSat60 === undefined && spo2 < 60) c.tSat60 = x.t;
    below = hr < 40 ? (below < 0 ? x.t : below) : -1;
    if (c.tSat60 !== undefined && c.tBrady === undefined && below >= 0 && x.t - below >= BRADY_HOLD_S) c.tBrady = below;
    if (c.tVent !== undefined) c.hrAfter.push([x.t, hr]);
  }, ['state', 'measurement', 'beat']);
  e.dispatch(ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' }));
  for (let t = 1; t <= endS; t++) {
    e.advanceTo(t);
    const r = rhythmOf(e);
    if (c.tArrest === undefined && arrested(r)) {
      c.tArrest = t;
      c.arrestRhythm = r.opts.pulseless ? `PEA (${r.id})` : r.id;
      c.rateAtArrest = hr;
    }
    if (c.tArrest === undefined && hrMon !== null) c.hrMonBefore = [...c.hrMonBefore.slice(-59), hrMon]; // the minute before
    if (inWin(t)) {
      c.win.rate.push(hr);
      if (hrMon !== null) c.win.hrMon.push(hrMon);
      c.win.sat.push(spo2);
      c.win.spo2Shown.push(spo2Shown);
      c.win.pr.push(pr);
      if (abp && t % 30 === 0) {
        const w = new Float32Array(5 * 125);
        e.readSamples('abp', (t - 5) * 125, w);
        c.win.abpPp.push(Math.max(...w) - Math.min(...w));
      }
    }
    if (co2 && after(t, RESP_WIN)) {
      c.resp.rr.push(rr);
      c.resp.va.push(vaOf(e));
      if (t % 30 === 0) {
        const w = new Float32Array(30 * CO2_HZ);
        e.readSamples('co2', Math.round((t - 30) * CO2_HZ), w);
        c.resp.co2Range.push(Math.max(...w) - Math.min(...w));
      }
    }
    if (ventAtBrady && c.tBrady !== undefined && c.tVent === undefined) {
      c.tVent = t;
      e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 500, fio2: 1, peep: 5 }));
    }
    if (t % 60 === 0) await new Promise((r2) => setImmediate(r2));
  }
  return c;
}

const max = (xs: readonly number[]) => Math.max(...xs);
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('FU-3 item 16: MODELED hypoxaemic bradycardia and asphyxial arrest', { timeout: 300_000 }, () => {
  it('apnoeic paralysed adult on room air: HR < 40 within 6 min of SaO2 < 60 %, then PEA/asystole/VF 5–14 min after it; 6–10 min later still pulseless, SaO2 < 20 %, HR not rising — measured SaO2 0.33 %, PP 0.33 mmHg, rate 30, monitor HR 58/51.6 vs 58/57.5', async () => {
    const c = await asphyxia('modeled', false, 20 * 60, true);
    const sat = c.tSat60 ?? Number.NaN;
    const w = c.win;
    console.log(`asphyxia: SaO2 < 60 % at ${(sat / 60).toFixed(2)} min; HR < 40 at +${(((c.tBrady ?? Number.NaN) - sat) / 60).toFixed(2)} min; arrest (${c.arrestRhythm ?? 'none'}) at +${(((c.tArrest ?? Number.NaN) - sat) / 60).toFixed(2)} min`);
    console.log(`post-arrest 6–10 min: rate max ${max(w.rate).toFixed(1)} (at arrest ${c.rateAtArrest?.toFixed(1)}); monitor HR max ${max(w.hrMon)} mean ${mean(w.hrMon).toFixed(1)} (minute before: max ${max(c.hrMonBefore)} mean ${mean(c.hrMonBefore).toFixed(1)}); SaO2 max ${max(w.sat).toFixed(2)} %; SpO2 shown ${JSON.stringify([...new Set(w.spo2Shown)])}; pr ${JSON.stringify([...new Set(w.pr)])}; ABP PP max ${max(w.abpPp).toFixed(2)} mmHg; beats ${w.beats} (perfused ${w.perfused})`);
    expect(c.tSat60).toBeDefined();
    expect(c.tBrady).toBeDefined();
    expect(((c.tBrady as number) - sat) / 60).toBeLessThanOrEqual(6);
    expect(c.tArrest).toBeDefined();
    expect(c.tBrady as number).toBeLessThan(c.tArrest as number); // bradycardia precedes the arrest
    expect(((c.tArrest as number) - sat) / 60).toBeGreaterThanOrEqual(5);
    expect(((c.tArrest as number) - sat) / 60).toBeLessThanOrEqual(14);
    // 6–10 min after the arrest (R50 finding 1): a monitor-visible arrest that does not undo itself
    expect(w.sat.length).toBe(WIN[1] - WIN[0] + 1); // the run covers the whole window
    expect(max(w.sat)).toBeLessThan(20); // SaO2 truth: no re-saturation without an ejected pulse (measured 0.33 %)
    expect(w.spo2Shown.every((v) => v === null || v < 20)).toBe(true); // SpO2 unmeasurable (measured: null throughout)
    expect(max(w.rate)).toBeLessThanOrEqual((c.rateAtArrest as number) + 0.5); // the rhythm's rate does not rise (30 → 30)
    expect(mean(w.hrMon)).toBeLessThanOrEqual(mean(c.hrMonBefore)); // the monitor HR does not rise (51.6 vs 57.5)
    expect(max(w.hrMon)).toBeLessThanOrEqual(max(c.hrMonBefore) + 2); // (max 58 vs 58)
    expect(w.pr.every((v) => v === null)).toBe(true); // no pulse detected
    expect(w.abpPp.length).toBeGreaterThan(0);
    expect(max(w.abpPp)).toBeLessThanOrEqual(5); // no arterial pulse (measured ≤ 0.33 mmHg: a flat ≈ 15 mmHg trace)
    if (c.arrestRhythm?.startsWith('PEA')) {
      expect(w.beats).toBeGreaterThan(0); // organised electrical activity on the ECG (measured 207 beats) …
      expect(w.perfused).toBe(0); // … with no mechanical beat (7a's kRhythm 0 path)
    }
  });
  it('E-FU3-10: 5–10 min after the arrest the brainstem is unperfused — no spontaneous breathing: RR numeric 0 or --, VA 0, flat CO2 trace (unprototyped; without the gate RR 43–48 and VA up to 97 L/min from ≈ 5.7 min after the arrest)', async () => {
    const c = await asphyxia('modeled', false, 20 * 60, false, true);
    const sat = c.tSat60 ?? Number.NaN;
    const r = c.resp;
    console.log(`E-FU3-10: arrest (${c.arrestRhythm ?? 'none'}) at +${(((c.tArrest ?? Number.NaN) - sat) / 60).toFixed(2)} min after SaO2 < 60 % (${(sat / 60).toFixed(2)} min); 5–10 min after it: RR numeric ${JSON.stringify([...new Set(r.rr)])}; VA max ${max(r.va).toFixed(3)} L/min; CO2 trace range max ${max(r.co2Range).toFixed(2)} mmHg`);
    expect(c.tArrest).toBeDefined();
    expect(((c.tArrest as number) - sat) / 60).toBeGreaterThanOrEqual(5); // the capnograph does not move the onsets
    expect(((c.tArrest as number) - sat) / 60).toBeLessThanOrEqual(14);
    expect(r.va.length).toBe(RESP_WIN[1] - RESP_WIN[0] + 1); // the run covers the whole window
    expect(r.rr.every((v) => v === null || v === 0)).toBe(true); // RR numeric 0 or `--`
    expect(max(r.va)).toBeLessThanOrEqual(0.01); // apnoea: no alveolar ventilation
    expect(r.co2Range.length).toBeGreaterThan(0);
    expect(max(r.co2Range)).toBeLessThan(1); // no breath on the CO2 trace
  });
  it('oxygenating once HR < 40 has held 30 s (before the arrest) reverses the bradycardia: HR ≥ 60 no sooner than the 5 s lung-to-ear circulation delay (DELAY_EAR_S) and within 3 min, final HR ≤ 130, no arrest — measured 0.12 min (7.0 s), final HR 126', async () => {
    const c = await asphyxia('modeled', true, 15 * 60);
    const tv = c.tVent ?? Number.NaN;
    const back = c.hrAfter.find(([t, h]) => t > tv && h >= 60)?.[0];
    console.log(`reversal: ventilated FiO2 1 at ${(tv / 60).toFixed(2)} min; HR ≥ 60 after ${(((back ?? Number.NaN) - tv) / 60).toFixed(2)} min (${((back ?? Number.NaN) - tv).toFixed(1)} s); arrest ${c.arrestRhythm ?? 'none'}; HR at the end ${c.hrAfter.at(-1)?.[1].toFixed(0)}`);
    expect(c.tVent).toBeDefined();
    expect(back).toBeDefined();
    // floor: re-oxygenated blood reaches the carotid body and the coronary bed no sooner than the lung-to-ear
    // circulation time (≈ 5 s at a normal output: research/03 §"Circulatory delay", the engine's DELAY_EAR_S)
    expect((back as number) - tv).toBeGreaterThanOrEqual(5);
    expect(((back as number) - tv) / 60).toBeLessThanOrEqual(3);
    expect(c.tArrest).toBeUndefined();
    expect(c.hrAfter.at(-1)?.[1] ?? 0).toBeGreaterThanOrEqual(60);
    expect(c.hrAfter.at(-1)?.[1] ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(130); // [ENG] sanity: no runaway rebound
  });
  it('MANUAL: the same apnoea never switches the rhythm (the instructor owns it)', async () => {
    const c = await asphyxia('manual', false, 15 * 60);
    console.log(`MANUAL: SaO2 < 60 % at ${((c.tSat60 ?? Number.NaN) / 60).toFixed(2)} min; HR < 40 ${c.tBrady ?? 'never'}; arrest ${c.arrestRhythm ?? 'none'}`);
    expect(c.tSat60).toBeDefined();
    expect(c.tBrady).toBeUndefined();
    expect(c.tArrest).toBeUndefined();
  });
});
```

- [x] **Step 2: add it to the SLOW list** (`packages/engine-core/vite.config.ts`; the find/replace is the last block of Step 5).

- [x] **Step 3: run it — expect FAIL (3 of 4)**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-hypoxic-arrest.test.ts`
Expected (measured on 71d9f89 with the first draft's three tests; the E-FU3-10 test fails the same way, no arrest):
```
asphyxia: SaO2 < 60 % at 2.02 min; HR < 40 at +NaN min; arrest (none) at +NaN min
reversal: ventilated FiO2 1 at NaN min; HR ≥ 60 after NaN min; arrest none; HR at the end undefined
MANUAL: SaO2 < 60 % at 1.97 min; HR < 40 never; arrest none
× apnoeic paralysed adult … → expected undefined to be defined      (no HR < 40 held 30 s: HR 44–50)
× E-FU3-10: 5–10 min after the arrest … → expected undefined to be defined   (no arrest)
× oxygenating once HR < 40 has held 30 s … → expected undefined to be defined
✓ MANUAL: the same apnoea never switches the rhythm
Tests 3 failed | 1 passed (4)
```

- [x] **Step 4: write the unit test** `packages/engine-core/test/l2/circ/hypoxic-arrest.test.ts`:

```ts
// FU-3 item 16 unit tests: the O2 content in the coronary supply (coronary.ts) and the arrest request
// (hypoxic-arrest.ts). The engine sequence and its bands are test/engine/circ-hypoxic-arrest.test.ts.
import { describe, expect, it } from 'vitest';
import { createCoronary, stepCoronary, TAU_HYP_S } from '../../../src/l2/circ/coronary.ts';
import { HYP_ARREST, hypoxicArrestRequest, P_ASYSTOLE_ONSET, P_VF_ONSET } from '../../../src/l2/circ/hypoxic-arrest.ts';
import { createCircModel, type CircBeat } from '../../../src/l2/circ/model.ts';

const ref = { hr: 70, sbp: 120, dbp: 80, map: 93, cvp: 5, lvedv: 125, lvedp: 9, lvsp: 118, sv: 80, co: 5.6, pcwp: 7 };
const beat = (o: Partial<CircBeat> = {}): CircBeat => ({
  t: 0, sbp: 120, dbp: 80, map: 93, aoSys: 115, aoDia: 80, sv: 80, svRv: 80, lvedv: 125, lvesv: 50, lvedp: 9, lvsp: 118,
  avOpen: 0.08, avClose: 0.37, dur: 60 / 70, ...o,
});

describe('FU-3 item 16: hypoxaemic myocardial depression', () => {
  it('o2Rel defaults to 1: the R23 flow-only supply and no hypoxic depression (MANUAL path unchanged)', () => {
    const a = createCoronary(ref);
    const b = createCoronary(ref);
    for (let i = 0; i < 60; i++) {
      stepCoronary(a, [beat()], 3.5, 1, 70);
      stepCoronary(b, [beat()], 3.5, 1, 70, 1);
    }
    expect(a.ratio).toBeCloseTo(b.ratio, 12);
    expect(a.hyp).toBe(0);
  });
  it('normoxic hypotensive ischaemia is not hypoxic: hyp stays 0 while kIsch falls', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 120; i++) stepCoronary(c, [beat({ aoDia: 45, dbp: 45, lvedp: 25, lvsp: 140 })], 1.4, 1, 72);
    expect(c.kIsch).toBeLessThan(0.85);
    expect(c.hyp).toBe(0);
  });
  it('the flow reserve covers a moderate desaturation (SaO2 50 %: supply 3.5 × 0.52 > demand) — no depression', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < 120; i++) stepCoronary(c, [beat()], 3.5, 1, 70, 0.5 / 0.97);
    expect(c.delta).toBe(0);
    expect(c.hyp).toBe(0);
  });
  it('anoxaemia (o2Rel 0) drives hyp to 1 with τ TAU_HYP_S; reoxygenation clears it with τ 60 s', () => {
    const c = createCoronary(ref);
    for (let i = 0; i < TAU_HYP_S; i++) stepCoronary(c, [beat()], 3.5, 1, 70, 0);
    expect(c.hyp).toBeGreaterThan(0.6); // 1 − e^−1
    expect(c.hyp).toBeLessThan(0.66);
    for (let i = 0; i < 300; i++) stepCoronary(c, [beat()], 3.5, 1, 70, 1);
    expect(c.hyp).toBeLessThan(0.01);
  });
});

describe('FU-3 item 16: the arrest request', () => {
  const at = (hyp: number) => {
    const m = createCircModel();
    m.cor.hyp = hyp;
    return m;
  };
  it('nothing below HYP_ARREST, on a pulseless or non-sinus rhythm, and no draw is taken', () => {
    let draws = 0;
    const u = () => { draws++; return 0.5; };
    expect(hypoxicArrestRequest(at(HYP_ARREST - 0.01), 'sinus', false, 30, u)).toBeNull();
    expect(hypoxicArrestRequest(at(0.99), 'sinus', true, 30, u)).toBeNull();
    expect(hypoxicArrestRequest(at(0.99), 'afib', false, 30, u)).toBeNull();
    expect(draws).toBe(0);
  });
  it('onset rhythm by one uniform draw: VF, asystole, else the organised rhythm pulseless at the current rate', () => {
    expect(hypoxicArrestRequest(at(0.95), 'sinus', false, 30, () => P_VF_ONSET / 2)?.id).toBe('vfCoarse');
    expect(hypoxicArrestRequest(at(0.95), 'sinus', false, 30, () => P_VF_ONSET + P_ASYSTOLE_ONSET / 2)?.id).toBe('asystole');
    expect(hypoxicArrestRequest(at(0.95), 'sinusBrady', false, 30.4, () => 0.9)).toEqual({ id: 'sinusBrady', opts: { pulseless: true, rateBpm: 30 } });
  });
});
```

(It fails to import before Step 5: `hypoxic-arrest.ts` does not exist, `TAU_HYP_S` is not exported.)

- [x] **Step 5: implement.** Create `packages/engine-core/src/l2/circ/hypoxic-arrest.ts`:

```ts
// FU-3 item 16: asphyxial (hypoxaemic) arrest in MODELED mode. The coronary step (coronary.ts) carries the arterial
// O2 content in the myocardial O2 supply and keeps `cor.hyp`, the hypoxaemic share of the supply deficit; the control
// layer (model.ts) turns it into sinus-node depression and a global contractility loss. What emerges is the sequence
// of the asphyxia models — early tachycardia and hypertension, then bradycardia and hypotension, then loss of aortic
// pulsations with the ECG still organised (DeBehnke 1995 [P]; Varvarousi 2011, 2015 [P]). This module declares the
// arrest once the hypoxic depression leaves the heart unable to eject (HYP_ARREST), and picks its rhythm. MANUAL never
// calls it (the instructor owns the rhythm there). The carotid-chemoreflex bradycardia below SaO2 60 % is the existing
// chemoFactors rule (model.ts, tables §1.1); the direct SA-node depression adds to it through cor.hyp.
// The beats alone never make the declaration: at a vanishing contractility the lumped ventricle (active and passive
// elastances blended by the activation) still moves ≈ 1 L/min against a reflex-raised filling pressure, so "loss of
// aortic pulsations" is reached through the myocardial state, not the pressure.
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { SINUS_FAMILY } from './rate-rule.ts';
import type { CircModelState } from './model.ts';

/**
 * The hypoxic myocardial depression (cor.hyp) at which the heart no longer ejects and the arrest is declared:
 * contractility ≤ 10 % of rest (kHyp = 1 − hyp) — electromechanical dissociation [ENG]. The timing is TAU_HYP_S's fit.
 */
export const HYP_ARREST = 0.9;
/**
 * Rhythm at the onset of an asphyxial arrest. Swine (Varvarousi 2015, n = 30): PEA 21, VF 7, asystole 2 [P]; humans
 * with airway-obstruction arrest (Tokyo 2017–2019, n = 1,352): 1.7 % shockable at EMS contact [P]. VF 0.1 lies between
 * the two [ENG: the swine onset rate is for a VF-prone species, the human rate is minutes after the onset]; asystole
 * 2/30 [P, swine]; the rest is a bradycardic PEA (the organised rhythm continues, pulseless).
 */
export const P_VF_ONSET = 0.1;
export const P_ASYSTOLE_ONSET = 2 / 30;

/**
 * The rhythm the circulation asks for at this 1 Hz step, or null. `u` is one uniform draw (the engine's outcome
 * stream), taken only when the arrest is declared, so runs without an arrest keep every stream untouched.
 */
export function hypoxicArrestRequest(
  m: CircModelState, rhythmId: string, pulseless: boolean, hrNow: number, u: () => number,
): { id: RhythmId; opts: RhythmOpts } | null {
  if (pulseless || !SINUS_FAMILY.has(rhythmId) || m.cor.hyp < HYP_ARREST) return null;
  const x = u();
  if (x < P_VF_ONSET) return { id: 'vfCoarse', opts: {} };
  if (x < P_VF_ONSET + P_ASYSTOLE_ONSET) return { id: 'asystole', opts: {} };
  return { id: rhythmId as RhythmId, opts: { pulseless: true, rateBpm: Math.round(hrNow) } };
}
```

Then the find/replace edits (each find block is unique in the 71d9f89 file; applied in order they reproduce the
prototype files byte for byte — checked mechanically):

#### `packages/engine-core/src/l2/circ/coronary.ts` (4 edits)

Edit 1 — find:

```ts
export const IVR_S = 0.06; // isovolumic relaxation after aortic closure [ENG]

```

replace with:

```ts
export const IVR_S = 0.06; // isovolumic relaxation after aortic closure [ENG]
/** FU-3 item 16: the resting arterial saturation the O2-content ratio is taken against (the chemoreflex's resting 0.97). */
export const SAO2_REF = 0.97;
/**
 * FU-3 item 16: time constant of the hypoxic myocardial depression while the O2 supply deficit stands [ENG, fitted
 * to the asphyxial arrest window: loss of aortic pulsations 9.5 ± 1.4 min (swine, Varvarousi 2011) and 11.4 ± 2.4 min
 * (dogs, DeBehnke 1995) after the airway is occluded on room air].
 */
export const TAU_HYP_S = 150;

```

Edit 2 — find:

```ts
  eesF: number; // current contractility multiplier seen by the demand term (set by the caller)
}
```

replace with:

```ts
  eesF: number; // current contractility multiplier seen by the demand term (set by the caller)
  hyp: number; // FU-3 item 16: the hypoxic share of the deficit, filtered as kIsch (0–1; MODELED only, 0 in MANUAL)
}
```

Edit 3 — find:

```ts
  const tsys = 0.37 + IVR_S; // resting emergent valve closure ≈ 0.37 s after onset at HR 70 (prototype)
  return { ref, dtf0: (rr - tsys) / rr, ratio: 1, delta: 0, kIsch: 1, ischT: 0, stMv: 0, eesF: 1 };
}

/** One step of dt seconds using the most recent beat(s). `cfr` from the profile; `hr` current rate. */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number): void {
  const b = beats[beats.length - 1];
```

replace with:

```ts
  const tsys = 0.37 + IVR_S; // resting emergent valve closure ≈ 0.37 s after onset at HR 70 (prototype)
  return { ref, dtf0: (rr - tsys) / rr, ratio: 1, delta: 0, kIsch: 1, ischT: 0, stMv: 0, eesF: 1, hyp: 0 };
}

/**
 * One step of dt seconds using the most recent beat(s). `cfr` from the profile; `hr` current rate. `o2Rel` (FU-3
 * item 16, MODELED only): arterial O2 content ÷ its resting value — myocardial O2 delivery is coronary flow × CaO2 and
 * the resting heart already extracts ≈ 70 % of it, so a content fall is a supply fall only the flow reserve can
 * offset (Guyton & Hall, coronary circulation [TXT]); 1 = the flow-only supply of R23.
 */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number, o2Rel = 1): void {
  const b = beats[beats.length - 1];
```

Edit 4 — find:

```ts
  const cpp0 = r.dbp - r.lvedp;
  const supply = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
  const demand = (hr / r.hr) * (Math.max(20, b.lvsp) / r.lvsp) * Math.sqrt(Math.max(0.1, c.eesF)) * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
  c.ratio = supply / Math.max(0.05, demand);
  c.delta = Math.max(0, 1 - c.ratio);
  const target = Math.max(0.2, 1 - G_ISCH * c.delta);
```

replace with:

```ts
  const cpp0 = r.dbp - r.lvedp;
  const flow = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
  const demand = (hr / r.hr) * (Math.max(20, b.lvsp) / r.lvsp) * Math.sqrt(Math.max(0.1, c.eesF)) * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
  c.ratio = (flow * o2Rel) / Math.max(0.05, demand);
  c.delta = Math.max(0, 1 - c.ratio);
  // FU-3 item 16: the hypoxaemic share of the deficit (δ weighted by the content loss 1 − o2Rel), rising with the
  // myocardium's hypoxic tolerance TAU_HYP_S and recovering as kIsch does (τ_up)
  const dHyp = c.delta * (1 - o2Rel);
  c.hyp += (dHyp - c.hyp) * (1 - Math.exp(-dt / (dHyp > c.hyp ? TAU_HYP_S : TAU_ISCH_UP_S)));
  if (c.hyp < 5e-4) c.hyp = 0;
  const target = Math.max(0.2, 1 - G_ISCH * c.delta);
```


#### `packages/engine-core/src/l2/circ/model.ts` (3 edits)

Edit 1 — find:

```ts
export const PESP_PREMATURE = 0.8;

```

replace with:

```ts
export const PESP_PREMATURE = 0.8;
/** FU-3 item 16: sinus-rate loss per unit of the hypoxic myocardial deficit `cor.hyp` [ENG, fitted: HR < 40 held within 6 min of SaO2 < 60 %, before the arrest]. */
export const G_SA = 1.5;
/** FU-3 item 16: floor of the hypoxic contractility factor 1 − cor.hyp (anoxic myocardium stops ejecting) [ENG]. */
export const K_HYP_MIN = 0.02;

```

Edit 2 — find:

```ts
  // delivered contractility past what the instructor's pressures were built on (MODELED: kIschRef 1, kIsch as is)
  m.kLv = b.eesF * de.ees * m.ext.kLv * Math.min(m.ext.kIsch, man.kIschRef) * man.eesF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc; // Stage 7g: β-blockade blunts the surge
  // tables §3 "Effects": ischaemic diastolic stiffening, β_LV × (1 + 0.5·δ) — with δ taken from the filtered
```

replace with:

```ts
  // delivered contractility past what the instructor's pressures were built on (MODELED: kIschRef 1, kIsch as is)
  const kHyp = env.modeled ? Math.max(K_HYP_MIN, 1 - m.cor.hyp) : 1; // FU-3 item 16: hypoxic myocardial depression (both ventricles)
  m.kLv = b.eesF * de.ees * m.ext.kLv * Math.min(m.ext.kIsch, man.kIschRef) * man.eesF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc * kHyp; // Stage 7g: β-blockade blunts the surge
  // tables §3 "Effects": ischaemic diastolic stiffening, β_LV × (1 + 0.5·δ) — with δ taken from the filtered
```

Edit 3 — find:

```ts
  p.betaLv = base.betaLv * (1 + (0.5 * (1 - m.ext.kIsch)) / G_ISCH);
  m.kRv = b.eesF * de.ees * m.ext.kRv * man.eesRvF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc; // Stage 7g: β-blockade blunts the surge
  p.emaxRa = base.eminRa + (base.emaxRa - base.eminRa) * kc; // atrial active elastance (7c kChem)
  p.emaxLa = base.eminLa + (base.emaxLa - base.eminLa) * kc;
  const rr = 60 / (m.prof.hrRest * b.hrF * de.hr * ch.hrF * (x.hrF ?? 1) * betaBlunt(x.endoHrF ?? 1, x.betaBlockAdd ?? 0)) + b.rrMs / 1000; // Stage 7g: β-blockade blunts the surge
  m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr));
```

replace with:

```ts
  p.betaLv = base.betaLv * (1 + (0.5 * (1 - m.ext.kIsch)) / G_ISCH);
  m.kRv = b.eesF * de.ees * m.ext.kRv * man.eesRvF * betaBlunt(x.endoEesF ?? 1, x.betaBlockAdd ?? 0) * kc * kHyp; // Stage 7g: β-blockade blunts the surge
  p.emaxRa = base.eminRa + (base.emaxRa - base.eminRa) * kc * kHyp; // atrial active elastance (7c kChem; FU-3 item 16 kHyp)
  p.emaxLa = base.eminLa + (base.emaxLa - base.eminLa) * kc * kHyp;
  const hypF = env.modeled ? Math.max(0.05, 1 - G_SA * m.cor.hyp) : 1; // FU-3 item 16: hypoxic SA-node depression
  const rr = 60 / (m.prof.hrRest * b.hrF * de.hr * ch.hrF * (x.hrF ?? 1) * betaBlunt(x.endoHrF ?? 1, x.betaBlockAdd ?? 0) * hypF) + b.rrMs / 1000; // Stage 7g: β-blockade blunts the surge
  m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr));
```


#### `packages/engine-core/src/l2/hemo/pipeline.ts` (5 edits)

Edit 1 — find:

```ts
import { prSource } from '../../l3/pulse/detector.ts';
import type { Sfc32State, StreamName } from '../../rng/sfc32.ts';
import type { AbpSite, HemoClinicalEvent, LineSensorState, NibpSite, PressureChannel, Spo2Site } from '../../types-hemo.ts';
```

replace with:

```ts
import { prSource } from '../../l3/pulse/detector.ts';
import { uniform, type Sfc32State, type StreamName } from '../../rng/sfc32.ts'; // FU-3 item 16: uniform
import type { AbpSite, HemoClinicalEvent, LineSensorState, NibpSite, PressureChannel, Spo2Site } from '../../types-hemo.ts';
```

Edit 2 — find:

```ts
import { applyCircCondition, CIRC_CONDITIONS, type CircConditionId } from '../circ/conditions.ts'; // Stage 7a
import { stepCoronary, stPatchOf } from '../circ/coronary.ts'; // Stage 7a
import { createIabp, createLvad, iabpFlow, iabpOnBeat, iabpStop, lvadFlow, lvadNumerics, type IabpState, type LvadState } from '../circ/devices.ts'; // Stage 7a
```

replace with:

```ts
import { applyCircCondition, CIRC_CONDITIONS, type CircConditionId } from '../circ/conditions.ts'; // Stage 7a
import { SAO2_REF, stepCoronary, stPatchOf } from '../circ/coronary.ts'; // Stage 7a (FU-3 item 16: SAO2_REF)
import { createIabp, createLvad, iabpFlow, iabpOnBeat, iabpStop, lvadFlow, lvadNumerics, type IabpState, type LvadState } from '../circ/devices.ts'; // Stage 7a
```

Edit 3 — find:

```ts
import { modeledHrRequest } from '../circ/rate-rule.ts'; // FU-2
import { effectiveRateBpm } from '../ecg/rhythms.ts'; // FU-2
```

replace with:

```ts
import { modeledHrRequest } from '../circ/rate-rule.ts'; // FU-2
import { hypoxicArrestRequest } from '../circ/hypoxic-arrest.ts'; // FU-3 item 16
import { effectiveRateBpm } from '../ecg/rhythms.ts'; // FU-2
```

Edit 4 — find:

```ts
  requestHr?: (bpm: number) => void; // Stage 7a: MODELED mode drives the rhythm engine's rate (Task 15)
}
```

replace with:

```ts
  requestHr?: (bpm: number) => void; // Stage 7a: MODELED mode drives the rhythm engine's rate (Task 15)
  requestRhythm?: (id: RhythmId, opts: RhythmOpts) => void; // FU-3 item 16: MODELED hypoxaemic arrest switches the rhythm
}
```

Edit 5 — find:

```ts
  c.cor.eesF = c.kLv;
  stepCoronary(c.cor, c.beats, c.prof.cfr, 1, 60 / Math.max(0.2, hs.lastRR));
  c.ext.kIsch = c.cor.kIsch;
  const nxt = stPatchOf(c.cor)?.ischaemicDepressionMv ?? 0;
```

replace with (the `cor.hyp` hold is R50 finding 1 / ruling R-1 — the first fixer's prototype, verbatim):

```ts
  c.cor.eesF = c.kLv;
  const pulseless = ctx.rhythm.opts?.pulseless === true; // FU-3 item 16
  const hyp0 = c.cor.hyp;
  stepCoronary(c.cor, c.beats, c.prof.cfr, 1, 60 / Math.max(0.2, hs.lastRR), ctx.l1.mode === 'modeled' ? Math.min(1, c.chemo.sao2 / SAO2_REF) : 1); // FU-3 item 16: O2 content in the supply (MODELED)
  // FU-3 item 16 (R50 review finding 1): a pulseless heart is not reperfused, so its hypoxic depression (and the
  // SA-node depression it drives) is held, never unwound, while the rhythm is pulseless
  if (pulseless) c.cor.hyp = Math.max(hyp0, c.cor.hyp);
  c.ext.kIsch = c.cor.kIsch;
  if (ctx.l1.mode === 'modeled' && ctx.requestRhythm) {
    const req = hypoxicArrestRequest(c, ctx.rhythm.id, pulseless, rampValue(ctx.hr, t), () => uniform(ctx.rng.outcome)); // FU-3 item 16
    if (req) ctx.requestRhythm(req.id, req.opts);
  }
  const nxt = stPatchOf(c.cor)?.ischaemicDepressionMv ?? 0;
```


#### `packages/engine-core/src/engine.ts` (1 edit here; E-FU3-10's `advanceResp` line is Step 5c)

Edit 1 (E-FU3-8; anchored on the whole `requestHr` callback — R50 finding 3: never on bare closing braces. Unique on
`origin/main` + `origin/stage-7d-organs` and on `origin/stage-7e-endocrine-thermal`; if it ever matches more than
once, anchor on the `requestHr` comment "Stage 7a: MODELED mode drives the rhythm engine's rate") — find:

```ts
        requestHr: (bpm) => {
          ps.hr = constantRamp(bpm); // Stage 7a: MODELED mode drives the rhythm engine's rate
        },
      },
```

replace with:

```ts
        requestHr: (bpm) => {
          ps.hr = constantRamp(bpm); // Stage 7a: MODELED mode drives the rhythm engine's rate
        },
        requestRhythm: (id, opts) => {
          // FU-3 item 16: the MODELED hypoxaemic arrest, applied exactly as 7g's rhythm requests
          ps.hr = constantRamp(startRate(id, opts));
          holdRate(ps, id, false);
          applyRhythm(ps.rhythm, id, opts, end / ECG_RATE, true, rhythmCtx(ps));
        },
      },
```


#### `packages/engine-core/vite.config.ts` (1 edit)

Edit 1 — find:

```ts
  'test/engine/circ-manual-ischaemia.test.ts', // FU-3 item 4: the check-18 rig to MAP 65 (9 sim-min)
```

replace with:

```ts
  'test/engine/circ-manual-ischaemia.test.ts', // FU-3 item 4: the check-18 rig to MAP 65 (9 sim-min)
  'test/engine/circ-hypoxic-arrest.test.ts', // FU-3 item 16: four 15–20 sim-min asphyxia runs
```

- [x] **Step 5b: E-FU3-9 (7b) — no ejection, no new arterial blood.** Write the unit test first, create
`packages/engine-core/test/l2/lung/arterial-hold.test.ts` (the first fixer's prototype, verbatim; 2 tests):

```ts
// FU-3 item 16 (E-FU3-9, R50 review finding 1): with nothing ejected (cardiac output 0) no blood leaves the lungs for
// the arteries, so the arterial PaO2/SaO2 are not re-computed from the alveolar gas — before this, the O2 side's
// 0.05 L/min flow floor (7b, "arrest: q = 0 gave NaN") equilibrated a phantom flow with re-ventilated alveoli and an
// arrested patient's SaO2 climbed 0.2 → 90 %.
import { describe, expect, it } from 'vitest';
import { createO2Lung, stepO2Lung, type O2LungInputs } from '../../../src/l2/lung/mix-o2.ts';

const base: O2LungInputs = {
  va: 4.2, vent: [0.45, 0, 0.55, 0], perf: [2.2, 0, 2.7, 0], vdAlv: [0.075, 0.075, 0.075, 0.075], qLow: [0.05, 0.05], qShunt: 0.1,
  fio2: 0.4, massFlowFio2: null, blocked: [false, false], vo2: 210, paco2: 40, pA: [40, 40, 40, 40], tempC: 37,
  frcSide: [630, 770], bloodL: 4.9, dl: [1, 1], coRatio: 1,
};
/** Arrest at the floor flow (0.05 L/min split as lung.ts does), breathing room air again after an anoxic apnoea. */
const arrest: O2LungInputs = {
  ...base, va: 6, fio2: 0.21, perf: [0.0198, 0, 0.0242, 0], qLow: [0.0023, 0.0023], qShunt: 0.0014, paco2: 90, pA: [90, 90, 90, 90], coRatio: 0,
};
const anoxic = () => {
  const st = createO2Lung(0.006, 0);
  st.sa = 0.003;
  st.pao2 = 4;
  return st;
};

describe('FU-3 item 16: no ejection, no new arterial blood (E-FU3-9)', () => {
  it('arterialHold: PaO2/SaO2 hold while the alveoli re-oxygenate; without it the floor flow re-saturates the arteries', () => {
    const held = anoxic();
    const free = anoxic();
    for (let t = 0; t < 120; t += 0.1) {
      stepO2Lung(held, { ...arrest, arterialHold: true }, 0.1);
      stepO2Lung(free, arrest, 0.1);
    }
    expect(held.sa).toBe(0.003);
    expect(held.pao2).toBe(4);
    expect(held.fa[0]).toBeGreaterThan(0.1); // the alveolar gas itself is refreshed by the breaths
    expect(free.sa).toBeGreaterThan(0.5); // the pre-FU-3 behaviour the review measured
  });
  it('arterialHold false/absent: bit-identical to the 7b mixing point', () => {
    const a = createO2Lung(0.5, 150);
    const b = createO2Lung(0.5, 150);
    for (let t = 0; t < 60; t += 0.1) {
      stepO2Lung(a, base, 0.1);
      stepO2Lung(b, { ...base, arterialHold: false }, 0.1);
    }
    expect(b).toEqual(a);
  });
});
```

Run `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/lung/arterial-hold.test.ts` — expect a
typecheck/vitest failure on `arterialHold` (unknown property) and the first test red (`held.sa` climbs). Then the two
find/replace edits (derived from `origin/main` + `origin/stage-7d-organs`; 7d does not touch `l2/lung/**` — verified
by `git diff origin/main origin/stage-7d-organs -- packages/engine-core/src/l2/lung`, empty):

`packages/engine-core/src/l2/lung/mix-o2.ts`, Edit 1 — find:

```ts
  coRatio: number;
  /** Stage 7c (E-7c-1): the blood's Hb, pH, 2,3-DPG, COHb, MetHb for every content/ODC call (absent → Stage 3's patient). */
  odc?: OdcCtx;
}
```

replace with:

```ts
  coRatio: number;
  /** Stage 7c (E-7c-1): the blood's Hb, pH, 2,3-DPG, COHb, MetHb for every content/ODC call (absent → Stage 3's patient). */
  odc?: OdcCtx;
  /**
   * FU-3 item 16 (E-FU3-9): nothing is ejected (cardiac output 0), so no blood leaves the lungs for the arteries — the
   * alveolar stores and the venous store still step, PaO2/SaO2 hold their last values. Absent/false: the 7b mixing point.
   */
  arterialHold?: boolean;
}
```

`packages/engine-core/src/l2/lung/mix-o2.ts`, Edit 2 — find:

```ts
  st.cv = Math.max(0, st.cv + ((q * (ca - st.cv) - x.vo2) / vv) * dt);
  st.pao2 = po2ForContent(ca, x.tempC, x.paco2, x.odc);
  st.sa = odc(st.pao2, x.tempC, x.paco2, x.odc);
}
```

replace with:

```ts
  st.cv = Math.max(0, st.cv + ((q * (ca - st.cv) - x.vo2) / vv) * dt);
  if (x.arterialHold) return; // FU-3 item 16 (E-FU3-9): no ejection, no new arterial blood — PaO2/SaO2 hold
  st.pao2 = po2ForContent(ca, x.tempC, x.paco2, x.odc);
  st.sa = odc(st.pao2, x.tempC, x.paco2, x.odc);
}
```

`packages/engine-core/src/l2/lung/lung.ts`, Edit 1 — find:

```ts
    paco2: x.paco2, pA: ls.co2.pA, tempC: x.tempC, frcSide, bloodL: x.bloodL, dl: lp.side.map((s) => s.dl), coRatio: x.coRatio,
```

replace with:

```ts
    paco2: x.paco2, pA: ls.co2.pA, tempC: x.tempC, frcSide, bloodL: x.bloodL, dl: lp.side.map((s) => s.dl), coRatio: x.coRatio,
    arterialHold: x.coRatio <= 0, // FU-3 item 16 (E-FU3-9): no ejection → the arteries receive no new blood
```

Run `… vitest run test/l2/lung/arterial-hold.test.ts test/l2/lung/mix-o2.test.ts` — expect 2 + 3 passed (first
fixer's prototype: `arterial-hold` 2/2, `mix-o2` 3/3). These two edits were re-derived from the prototype's measured
behaviour (its source diff was not kept): if the engine test's post-arrest numbers in Step 6 differ from R-1's (SaO2
max 0.33 %, PP ≤ 0.33 mmHg), stop and report rather than adjust.

- [x] **Step 5c: E-FU3-10 (7f) — the brainstem-perfusion gate on the MODELED drive. UNPROTOTYPED: prototype first.**
The blocks below are derived from the real code (`origin/main` + `origin/stage-7d-organs`; 7e's branch does not touch
`l2/neuro/spont.ts`, and its `l2/resp/pipeline.ts`/`engine.ts` edits are on other lines — checked) but were never run.
Procedure (R45): apply them, run the unit test and the engine test's E-FU3-10 `it`; if the band (RR numeric 0 or `--`,
VA ≤ 0.01 L/min, CO2 range < 1 mmHg in the 5–10 min window; onsets unchanged) is met, record the measured numbers in
the test title and the gate note. If it is NOT met after a mechanism fix inside these three files, keep the gate,
change the E-FU3-10 `it` to `it.fails` with the measured numbers in its title (e.g. `… — measured RR 44, VA 12 L/min
at +7 min`) and file it in the gate note; never widen the band, never edit another stage's file to pass it.

Constants [ENG, inside the ruling]: CBF threshold 0.2 (ruling: "CBF < 20 %"), gasp onset after 30 s, apnoea at 120 s,
gasp RR ≤ 6 and VT ≤ 0.3 × the resting VT, both fading linearly to 0 over 30–120 s, gate reopening linearly over 120 s
(ruling: 1–3 min). Gate input: `noFlow` (the rhythm's `opts.pulseless`, or Stage 3's `coRatio <= 0`) OR `cbfRel < 0.2`
(7d) — ruling R-2's fallback, taken as an OR because 7d's brain reads MAP from `hs.lastSite`, which holds the last
beat's pressures after a PEA arrest; CBF alone may not cross 20 % there (confirm at the gate). Snapshot compatibility:
`anoxS`/`gate` are optional and absent while perfused, so `createSpontDrive()`, perfused runs and old snapshots are
bit-identical.

Write the unit test first, create `packages/engine-core/test/l2/neuro/brainstem-gate.test.ts`:

```ts
// FU-3 item 16 (E-FU3-10, orchestrator ruling 2026-09-27 17:55): brainstem anoxia stops the MODELED spontaneous drive.
// After the circulation stops, agonal gasping persists for seconds to ≈ 2 min, then apnoea (Clark JJ et al., Ann Emerg
// Med 1992;21:1464–1467; Bobrow BJ et al., Circulation 2008;118:2550–2554) [P]; the drive returns over minutes after
// the circulation does. Gate: CBF < 20 % (7d) or no flow, for > 30 s.
import { describe, expect, it } from 'vitest';
import {
  BRAINSTEM_CBF_MIN, createSpontDrive, GASP_END_S, GASP_ONSET_S, GASP_RR, GASP_VT_FRAC, GATE_REOPEN_S, stepSpontDrive,
  type SpontDrive, type SpontInputs,
} from '../../../src/l2/neuro/spont.ts';

/** Hypercapnic enough that the ungated chemoreflex breathes fast (the post-arrest patient of the review). */
const X: SpontInputs = { t: 0, paco2: 80, pao2: 60, hco3: 24, rr0: 12, vt0: 500, co2SlopeMult: 1, pMaxMult: 1, evlwi: 7, complianceMl: 55, resistance: 3 };
/** Normocapnic resting inputs: the drive returns the resting pattern (RR 12, VT 500) and fatigue stays 1. */
const REST: Partial<SpontInputs> = { paco2: 40, pao2: 95 };
/** Steps 1 s at a time from t0 to t1 (exclusive) with the given extra inputs; returns the (t, rr, vt) series. */
function run(s: SpontDrive, t0: number, t1: number, extra: Partial<SpontInputs>): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let t = t0; t < t1; t++) {
    stepSpontDrive(s, { ...X, ...extra, t });
    out.push([t - t0, s.rr, s.vt]);
  }
  return out;
}
const fresh = () => {
  const s = createSpontDrive();
  s.paco2Rest = 40;
  return s;
};

describe('FU-3 item 16: brainstem-perfusion gate on the MODELED drive (E-FU3-10)', () => {
  it('perfused (cbfRel ≥ 0.2, flow present): bit-identical to the ungated drive, no gate fields written', () => {
    const a = fresh();
    const b = fresh();
    run(a, 0, 120, {});
    run(b, 0, 120, { cbfRel: BRAINSTEM_CBF_MIN, noFlow: false });
    expect(b).toEqual(a);
    expect('anoxS' in b || 'gate' in b).toBe(false);
  });
  it('no flow: unchanged for 30 s, then gasps (RR ≤ 6, VT ≤ 0.3 × resting) fading to apnoea by 2 min', () => {
    const ref = run(fresh(), 0, 300, {});
    const g = run(fresh(), 0, 300, { noFlow: true });
    for (const [dt, rr, vt] of g) {
      const [, rr0, vt0] = ref[dt] as [number, number, number];
      if (dt < GASP_ONSET_S) {
        expect(rr).toBe(rr0);
        expect(vt).toBe(vt0);
      } else if (dt < GASP_END_S) {
        expect(rr).toBeLessThanOrEqual(GASP_RR);
        expect(vt).toBeLessThanOrEqual(GASP_VT_FRAC * X.vt0);
      } else {
        expect(rr).toBe(0);
        expect(vt).toBe(0);
      }
    }
    expect(ref[200]?.[1] ?? 0).toBeGreaterThan(GASP_RR); // the ungated hypercapnic drive breathes fast
  });
  it('7d CBF below 20 % closes the gate exactly as no flow does; 25 % does not', () => {
    const noFlow = run(fresh(), 0, 200, { noFlow: true });
    expect(run(fresh(), 0, 200, { cbfRel: 0.1 })).toEqual(noFlow);
    expect(run(fresh(), 0, 200, { cbfRel: 0.25 })).toEqual(run(fresh(), 0, 200, {}));
  });
  it('after perfusion returns the drive reopens linearly over GATE_REOPEN_S (resting drive: RR ≈ half at half-time, full at the end)', () => {
    const s = fresh();
    run(s, 0, 300, { ...REST, noFlow: true });
    const back = run(s, 300, 300 + GATE_REOPEN_S + 10, REST);
    const ref = run(fresh(), 0, GATE_REOPEN_S + 10, REST); // resting pattern RR 12, VT 500, no fatigue
    const half = GATE_REOPEN_S / 2;
    expect((back[half]?.[1] ?? 0) / (ref[half]?.[1] ?? 1)).toBeGreaterThan(0.45);
    expect((back[half]?.[1] ?? 1) / (ref[half]?.[1] ?? 1)).toBeLessThan(0.55);
    expect(back.at(-1)?.[1]).toBeCloseTo(ref.at(-1)?.[1] ?? Number.NaN, 9);
    expect('gate' in s || 'anoxS' in s).toBe(false); // fully reopened: no trace left
  });
  it('an interruption of ≤ 30 s leaves no trace (no gasping phase, no reopening ramp)', () => {
    const s = fresh();
    run(s, 0, GASP_ONSET_S, { ...REST, noFlow: true });
    const after = run(s, GASP_ONSET_S, GASP_ONSET_S + 60, REST);
    expect(after).toEqual(run(fresh(), GASP_ONSET_S, GASP_ONSET_S + 60, REST));
    expect('gate' in s || 'anoxS' in s).toBe(false);
  });
});
```

Then the find/replace edits.

`packages/engine-core/src/l2/neuro/spont.ts`, Edit 1 — find:

```ts
/** Spontaneous Ti/Ttot (Stage 3 driver's SPONT_TI_FRACTION 0.38). */
const TI_FRAC = 0.38;
```

replace with:

```ts
/** Spontaneous Ti/Ttot (Stage 3 driver's SPONT_TI_FRACTION 0.38). */
const TI_FRAC = 0.38;
/**
 * FU-3 item 16 (E-FU3-10, orchestrator ruling 2026-09-27): brainstem-perfusion gate. After the circulation stops,
 * agonal gasps persist for seconds to ≈ 2 min, then apnoea; after the circulation returns the drive comes back over
 * minutes (Clark JJ et al., Ann Emerg Med 1992;21:1464–1467; Bobrow BJ et al., Circulation 2008;118:2550–2554) [P].
 * The gate closes when 7d's CBF is below BRAINSTEM_CBF_MIN or there is no flow at all (pulseless / CO 0).
 */
export const BRAINSTEM_CBF_MIN = 0.2; // CBF < 20 % of rest (the ruling's threshold) [ENG]
export const GASP_ONSET_S = 30; // unperfused for > 30 s → gasps only [ENG, ruling]
export const GASP_END_S = 120; // gasps fade to apnoea by 2 min [ENG, ruling]
export const GASP_RR = 6; // gasp rate ceiling (/min) [ENG, ruling "RR ≤ 6"]
export const GASP_VT_FRAC = 0.3; // gasp VT ceiling × the resting VT ("small VT") [ENG]
export const GATE_REOPEN_S = 120; // the drive reopens linearly over 2 min once perfused [ENG, ruling "1–3 min"]
```

`packages/engine-core/src/l2/neuro/spont.ts`, Edit 2 — find:

```ts
  paco2Set: number;
  nextT: number;
}
```

replace with:

```ts
  paco2Set: number;
  nextT: number;
  anoxS?: number; // FU-3 item 16 (E-FU3-10): seconds without brainstem perfusion (absent while perfused)
  gate?: number; // FU-3 item 16 (E-FU3-10): 0 → 1 while the drive reopens after an anoxic spell (absent = open)
}
```

`packages/engine-core/src/l2/neuro/spont.ts`, Edit 3 — find:

```ts
  resistance: number; // cmH2O·s/L
  neuro?: NeuroResp;
}
```

replace with:

```ts
  resistance: number; // cmH2O·s/L
  neuro?: NeuroResp;
  noFlow?: boolean; // FU-3 item 16 (E-FU3-10): no circulation (pulseless rhythm or cardiac output 0)
  cbfRel?: number; // FU-3 item 16 (E-FU3-10): 7d's organs.brain.cbfRel (absent without 7d)
}
```

`packages/engine-core/src/l2/neuro/spont.ts`, Edit 4 — find:

```ts
  if (strength < DIAPH_APNOEA) rr = vt = 0;
  else if (n) vt *= n.nmbVtMult * (1 - Math.min(0.9, n.obstruction));
  s.rr = rr;
```

replace with:

```ts
  if (strength < DIAPH_APNOEA) rr = vt = 0;
  else if (n) vt *= n.nmbVtMult * (1 - Math.min(0.9, n.obstruction));
  // FU-3 item 16 (E-FU3-10): brainstem-perfusion gate
  const unperfused = x.noFlow === true || (x.cbfRel !== undefined && x.cbfRel < BRAINSTEM_CBF_MIN);
  if (unperfused) s.anoxS = (s.anoxS ?? 0) + SPONT_DT_S;
  else if (s.anoxS !== undefined) {
    if (s.anoxS > GASP_ONSET_S) s.gate = 0; // a gasping or apnoeic brainstem recovers over GATE_REOPEN_S
    delete s.anoxS;
  }
  const anox = s.anoxS ?? 0;
  if (anox > GASP_ONSET_S) {
    const fade = Math.max(0, 1 - (anox - GASP_ONSET_S) / (GASP_END_S - GASP_ONSET_S));
    rr = Math.min(rr, GASP_RR * fade);
    vt = Math.min(vt, GASP_VT_FRAC * x.vt0 * fade);
    if (fade <= 0) rr = vt = 0;
  } else if (s.gate !== undefined) {
    if (!unperfused) s.gate = Math.min(1, s.gate + SPONT_DT_S / GATE_REOPEN_S);
    rr *= s.gate;
    if (s.gate >= 1) delete s.gate;
  }
  s.rr = rr;
```

`packages/engine-core/src/l2/resp/pipeline.ts`, Edit 1 — find:

```ts
  hco3?: number; // Stage 7f: 7c's blood.core.ab.hco3 for Winter's compensation (MODELED spontaneous drive)
}
```

replace with:

```ts
  hco3?: number; // Stage 7f: 7c's blood.core.ab.hco3 for Winter's compensation (MODELED spontaneous drive)
  cbfRel?: number; // FU-3 item 16 (E-FU3-10): 7d's organs.brain.cbfRel — the brainstem-perfusion gate on the MODELED drive
}
```

`packages/engine-core/src/l2/resp/pipeline.ts`, Edit 2 — find:

```ts
      resistance: lp.rTube + 1 / lp.side.reduce((g, sd) => g + 1 / Math.max(0.1, sd.rLung), 0), neuro: ctx.neuro,
    });
```

replace with:

```ts
      resistance: lp.rTube + 1 / lp.side.reduce((g, sd) => g + 1 / Math.max(0.1, sd.rLung), 0), neuro: ctx.neuro,
      noFlow: ctx.rhythm.opts?.pulseless === true || rs.coRatio <= 0, cbfRel: ctx.cbfRel, // FU-3 item 16 (E-FU3-10)
    });
```

`packages/engine-core/src/engine.ts`, Edit 2 (E-FU3-10; re-anchor by the `advanceResp(ps.resp,` statement if 7e moved
it) — find:

```ts
    advanceResp(ps.resp, { l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3 }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3 (7c: blood view; 7f: neuro, HCO3 for Winter's)
```

replace with:

```ts
    advanceResp(ps.resp, { l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3, cbfRel: ps.organs.brain.cbfRel }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3 (7c: blood view; 7f: neuro, HCO3 for Winter's; FU-3 E-FU3-10: 7d's CBF, one step late — organs advance after resp)
```

Run `… vitest run test/l2/neuro/ test/engine/circ-hypoxic-arrest.test.ts` and apply the procedure at the top of this
step (band met → numbers into the E-FU3-10 title; not met → `it.fails` with the numbers, R45).


- [x] **Step 6: run — expect PASS**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-hypoxic-arrest.test.ts test/l2/circ/ test/l2/lung/ test/l2/neuro/`
Expected (first fixer's prototype for everything but the E-FU3-10 line):
```
asphyxia: SaO2 < 60 % at 2.02 min; HR < 40 at +2.55 min; arrest (PEA (sinus)) at +7.77 min
post-arrest 6–10 min: rate max 30.0 (at arrest 30.0); monitor HR max 58 mean 51.6 (minute before: max 58 mean 57.5); SaO2 max 0.33 %; SpO2 shown [null]; pr [null]; ABP PP max 0.33 mmHg; beats 207 (perfused 0)
E-FU3-10: arrest (PEA (sinus)) at +7.77 min …; 5–10 min after it: RR numeric [0] or [null]; VA max 0.000 L/min; CO2 trace range max < 1 mmHg   (target — unprototyped)
reversal: ventilated FiO2 1 at 5.07 min; HR ≥ 60 after 0.12 min (7.0 s); arrest none; HR at the end 126
MANUAL: SaO2 < 60 % at 1.97 min; HR < 40 never; arrest none
test/l2/circ/: Test Files 19 passed, Tests 74 passed | 1 skipped (the new unit file: 6 passed); test/l2/lung/: arterial-hold 2, mix-o2 3 passed; test/l2/neuro/: brainstem-gate 5 passed (unprototyped), 7f's own files unchanged; the engine file: 4 passed
```
Onsets must be unchanged by Steps 5b/5c (2.02 / +2.55 / +7.77 min; MANUAL 1.97 min). Typecheck:
`npx -y pnpm@9.15.9 -r typecheck` → exit 0.

- [x] **Step 7: sibling runs** (all green on the prototype, see §5; the lung, neuro and organs lines are added for
E-FU3-9/10 — E-FU3-9 changes every zero-output state, E-FU3-10 every MODELED patient with CBF < 20 %):
`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/lung test/l2/neuro test/l2/resp test/engine/lung-gas.test.ts test/engine/lung-capno.test.ts test/engine/lung-external.test.ts test/engine/lung-wiring.test.ts test/engine/resp-engine.test.ts test/engine/resp-airway.test.ts test/engine/resp-coupling.test.ts test/engine/organs-wiring.test.ts test/engine/organs-alarm.test.ts test/engine/blood-sanity-haem.test.ts test/engine/circ-modeled.test.ts test/engine/circ-sanity-1.test.ts test/engine/circ-sanity-2.test.ts test/engine/hemo-acceptance.test.ts test/engine/hemo-engine.test.ts test/engine/truth-event.test.ts test/engine/pk-bus.test.ts test/engine/pk-wiring.test.ts test/engine/lung-circ.test.ts test/engine/neuro-circ.test.ts test/engine/neuro-spont.test.ts test/engine/neuro-engine.test.ts test/engine/resp-oxygen.test.ts test/engine/blood-sanity-acid.test.ts test/engine/circ-rate-rule.test.ts test/engine/defib-engine.test.ts test/engine/circ-arrest.test.ts test/engine/cpr-etco2.test.ts test/engine/hemo-vf.test.ts test/engine/blood-oxygen.test.ts test/engine/engine-seams.test.ts test/engine/state-rhythm.test.ts test/engine/device-determinism.test.ts test/engine/alarms-engine.test.ts test/engine/stage3-alarms-engine.test.ts test/engine/circ-events.test.ts test/engine/circ-teaching.test.ts`
and serially `… vitest run --no-file-parallelism test/engine/blood-stage3-recheck.test.ts test/engine/neuro-acceptance.test.ts test/engine/pk-acceptance-pd.test.ts test/engine/pk-acceptance-scen.test.ts test/engine/organs-tbi.test.ts test/engine/organs-tbi-treatment.test.ts test/engine/organs-renal.test.ts test/engine/lung-unilateral.test.ts test/engine/af-rate-control.test.ts`.

Then the tick budget and the drift rigs (R50 finding 5 / ruling R-6; Task 5 adds work to the 1 Hz coronary step, two
terms to every MODELED control step, a branch to the 10 Hz O2 step and to the 1 Hz spontaneous drive) — SLOW files,
serially, in the background with a log under `<scratchpad>/fu-3-followups/`, bounded waits:

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run --no-file-parallelism test/engine/circ-longrun.test.ts test/engine/hemo-longrun.test.ts test/engine/engine-pipeline.test.ts test/engine/organs-soak.test.ts test/engine/blood-budget.test.ts test/engine/neuro-longrun.test.ts test/engine/lung-longrun.test.ts
```

Expected: all pass; `circ-longrun` prints `circulation … ms per tick` ≤ 0.3 and `blood-budget` prints
`blood CPU per tick …` < 0.1 — write both measured figures into the gate note (Task 15 Step 3 §2). A red long run is a
finding to report, not a band to move (R45).

If an organs/TBI rig breathes spontaneously in MODELED through a CBF < 20 % episode, E-FU3-10 now stops that breathing
(correct physiology for a brainstem without perfusion); if such a test goes red, stop and report the numbers — do not
change its band or its rig without a ruling.

- [x] **Step 8: commit** (one commit; the message names each exception so the gate note can map lines to them)

```bash
git add packages/engine-core/src/l2/circ/hypoxic-arrest.ts packages/engine-core/src/l2/circ/coronary.ts packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/l2/lung/mix-o2.ts packages/engine-core/src/l2/lung/lung.ts packages/engine-core/src/l2/neuro/spont.ts packages/engine-core/src/l2/resp/pipeline.ts packages/engine-core/src/engine.ts packages/engine-core/vite.config.ts packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts packages/engine-core/test/l2/circ/hypoxic-arrest.test.ts packages/engine-core/test/l2/lung/arterial-hold.test.ts packages/engine-core/test/l2/neuro/brainstem-gate.test.ts
git commit -m "feat(circ): MODELED hypoxaemic bradycardia and asphyxial arrest that stays an arrest (FU-3 item 16)" -m "O2 content in the coronary supply, hypoxic SA-node and myocardial depression held while pulseless, seeded PEA/asystole/VF onset (7a; E-FU3-8 requestRhythm); no arterial re-oxygenation at zero output (7b, E-FU3-9); brainstem-perfusion gate on the MODELED spontaneous drive: gasps then apnoea after 30 s without perfusion, reopening over 2 min (7f, E-FU3-10)." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 6: AAI/DDD sense the intrinsic sinus above the lower rate — Q-FU2-10 (item 5; Stage 5 `l2/ecg`, E-FU3-3)

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/rhythm-state.ts` (`RhythmCtx.pacerLowerAt?`, new `pacerLowerRate`)
- Modify: `packages/engine-core/src/l2/ecg/atria.ts` (import; `atrialRate`)
- Modify: `packages/engine-core/src/l2/ecg/pacing.ts` (import; `interval`)
- Modify: `packages/engine-core/src/engine.ts` (**E-FU3-3**: `rhythmCtx` and one line in `startRate`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)
- Create: `packages/engine-core/test/engine/pacer-sensing.test.ts` (4 tests, 4 sim-min each → SLOW)

**Interfaces:**
- Consumes: FU-2's `CircModelState.hrSet` (`holdRate` in `engine.ts`), Stage 5's `pacing.ts` sensing hooks
  (`onSensedP`, `onBeat`, `fireA`, `fireV`), `cmd` (`test/helpers/hemo.ts`).
- Produces: `RhythmCtx.pacerLowerAt?(t: number): number`; `pacerLowerRate(st: RhythmState, t: number, ctx:
  RhythmCtx): number` exported from `rhythm-state.ts`.

**Why:** FU-2 made MODELED `pacedAAI`/`pacedDDD` request max(lower rate, reflex rate). Two reasons the ECG still drew
every beat paced: `pacing.ts` `interval()` = `60 / (ratePpm ?? rhythmRate)`, so without `ratePpm` the reflex rate BECAME
the pacer's escape interval; and `atria.ts` `atrialRate()` ran paced rows' sinus atria at `atrialDefaultBpm` (AAI 45,
DDD 50), so no intrinsic P ever preceded the escape and Stage 5's demand inhibition (`onSensedP`) never fired. NBG code
(NASPE/BPEG, Bernstein et al., PACE 2002;25:260–4): AAI = pace A, sense A, inhibit; DDD = a sensed P inhibits the atrial
output and triggers a ventricular output after the AV delay, a sensed R inhibits the ventricular output. Not modelled:
DDD upper tracking rate / pacemaker Wenckebach, hysteresis, PVARP (Q-FU3-5). Side effect: the Stage 5 catalogue entry
`failureToSense` (VVI, `ratePpm` 60, no `rateBpm`) now starts its hr truth at 60 instead of 70 (matching its pacer).

**Prototype numbers (seed 7, 180–240 s after a 1225 mL bleed at 120 s):** MODELED AAI 70: 96 atrial spikes, 0 sinus →
**0 spikes, 96 sinus** at 96.3/min · DDD 70 (block underneath): 101 atrial spikes → **0 atrial, 101 V spikes 0.160 s
after each P** · DDD conducted: all paced → **0 spikes, 96 sinus, PR 147** · AAI + phenylephrine: 70.0, a spike before
every beat · MANUAL AAI `ratePpm` 60 with instructor hr 90: 60.0 paced (55 spikes) → **90.4 sinus, 0 spikes**; hr 50 →
paced 60 · 48 sibling files / 253 tests green (Stage 5 `s5/pacing` 10/10, `s5/library` 39/39 incl. determinism hashes,
FU-2 `circ-rate-rule` 6/6 with "AAI 70 MODELED: phenylephrine 70.0 → 70.0; bleed 70.0 → 91.2" unchanged).

Before Step 6 (the `engine.ts` edit) run `git fetch origin && git merge origin/main` (R51 §7).

- [x] **Step 1: Write the failing test** — create `packages/engine-core/test/engine/pacer-sensing.test.ts`:

```ts
// FU-3 item 5 (Q-FU2-10): an atrial-sensing pacemaker (AAI, DDD) is INHIBITED by intrinsic atrial activity faster than
// its lower rate (NASPE/BPEG generic code, Bernstein et al., PACE 2002;25:260–4: position III 'I'/'D' = inhibited by a
// sensed event). FU-2 made MODELED AAI/DDD request max(lower rate, reflex rate); these tests pin how those beats are
// DRAWN: above the lower rate AAI shows sinus P waves and conducted QRS with no spike; DDD (complete block under it,
// the row's default) shows sensed P waves, no atrial spike, and a ventricular spike one AV delay after each P; DDD with
// conduction underneath (PacerOpts.intrinsic 'conducted') conducts the sensed P before the AV delay runs out, so the
// sensed QRS inhibits the ventricular output too; at or below the lower rate every beat is paced.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, RhythmId, RhythmOpts } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
type Beat = Extract<EngineEvent, { type: 'beat' }>;
type Atrial = Extract<EngineEvent, { type: 'atrial' }>;
type Marker = Extract<EngineEvent, { type: 'marker' }>;

/** Engine with a rhythm set at 20 s and optional commands; advanced minute by minute with a yield (CI rule). */
async function run(mode: 'manual' | 'modeled', rhythm: RhythmId, opts: RhythmOpts, tEnd: number, extra?: (e: ReturnType<typeof createEngine>) => void) {
  const e = createEngine({ seed: 7, mode, patient: { sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setRhythm', rhythm, opts }));
  extra?.(e);
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  const within = <T extends { t: number }>(xs: T[], a: number, b: number) => xs.filter((x) => x.t > a && x.t <= b);
  const beats = (a: number, b: number) => within(ev.filter((x): x is Beat => x.type === 'beat'), a, b);
  const atrial = (a: number, b: number) => within(ev.filter((x): x is Atrial => x.type === 'atrial'), a, b);
  const spikes = (a: number, b: number, chamber: 1 | 2) => within(ev.filter((x): x is Marker => x.type === 'marker' && x.kind === 'paceSpike' && x.data?.chamber === chamber), a, b);
  const rate = (a: number, b: number) => {
    const t = beats(a, b).map((x) => x.t);
    return (60 * (t.length - 1)) / ((t.at(-1) ?? 0) - (t[0] ?? 0));
  };
  return { beats, atrial, spikes, rate };
}
const PHE = { kind: 'infusion', drugId: 'phenylephrine', rate: 1, unit: 'mcg/kg/min' };
const BLEED = { kind: 'bleed', volumeMl: 1225, overS: 60 }; // FU-2's reflex-tachycardia scenario

describe('atrial-sensing pacemakers above / at the lower rate (Q-FU2-10)', () => {
  it('MODELED AAI 70 after a bleed (≈ 96 at 180–240 s): sinus P waves, conducted QRS, no atrial spike; on phenylephrine every beat is paced', async () => {
    const b = await run('modeled', 'pacedAAI', { rateBpm: 70 }, 240, (e) => e.dispatch(cmd({ type: 'applyEvent', event: BLEED, atTick: 120 * 50 })));
    const n = b.beats(180, 240).length;
    const a = b.spikes(180, 240, 1).length;
    const pacedP = b.atrial(180, 240).filter((x) => x.kind === 'paced').length;
    console.log(`FU-3 AAI bleed 180–240 s: rate ${b.rate(180, 240).toFixed(1)}, beats ${n}, A spikes ${a}, paced P ${pacedP}, sinus beats ${b.beats(180, 240).filter((x) => x.origin === 'sinus').length}`);
    expect(b.rate(180, 240)).toBeGreaterThanOrEqual(80); // the FU-2 rate is kept
    expect(a).toBe(0);
    expect(pacedP).toBe(0);
    expect(b.atrial(180, 240).every((x) => x.kind === 'p' && x.conducted)).toBe(true); // the sinus P
    expect(b.beats(180, 240).every((x) => x.origin === 'sinus' && x.qrsMs < 120)).toBe(true);
    expect(b.spikes(60, 110, 1).length).toBeGreaterThanOrEqual(b.beats(60, 110).length - 1); // before the bleed: paced at 70

    const p = await run('modeled', 'pacedAAI', { rateBpm: 70 }, 240, (e) => e.dispatch(cmd({ type: 'applyEvent', event: PHE, atTick: 120 * 50 })));
    const pb = p.beats(150, 240);
    const pa = p.spikes(150, 240, 1);
    console.log(`FU-3 AAI phenylephrine 150–240 s: rate ${p.rate(150, 240).toFixed(1)}, beats ${pb.length}, A spikes ${pa.length}`);
    expect(Math.abs(p.rate(150, 240) - 70)).toBeLessThanOrEqual(1);
    for (const x of pb.slice(1)) expect(pa.some((s) => x.t - s.t > 0 && x.t - s.t < 0.4)).toBe(true); // a spike before every beat
  }, 600_000);

  it('MODELED DDD 70 (complete block underneath) after a bleed: atrial-sensed, ventricular-paced — V spike only, 160 ms after each P', async () => {
    const b = await run('modeled', 'pacedDDD', { rateBpm: 70 }, 240, (e) => e.dispatch(cmd({ type: 'applyEvent', event: BLEED, atTick: 120 * 50 })));
    const v = b.spikes(180, 240, 2);
    const p = b.atrial(180, 240);
    console.log(`FU-3 DDD bleed 180–240 s: rate ${b.rate(180, 240).toFixed(1)}, beats ${b.beats(180, 240).length}, A spikes ${b.spikes(180, 240, 1).length}, V spikes ${v.length}, paced P ${p.filter((x) => x.kind === 'paced').length}`);
    expect(b.rate(180, 240)).toBeGreaterThanOrEqual(80);
    expect(b.spikes(180, 240, 1).length).toBe(0);
    expect(p.every((x) => x.kind === 'p')).toBe(true);
    expect(b.beats(180, 240).every((x) => x.origin === 'paced')).toBe(true);
    for (const s of v.slice(1)) {
      const prev = b.atrial(0, s.t).at(-1)!;
      expect(s.t - prev.t).toBeCloseTo(0.16, 6);
    }
  }, 600_000);

  it('MODELED DDD 70 with conduction underneath (PacerOpts.intrinsic conducted) after a bleed: atrial- and ventricular-sensed — no spikes, conducted sinus beats', async () => {
    const b = await run('modeled', 'pacedDDD', { rateBpm: 70, pacer: { intrinsic: 'conducted' } }, 240, (e) => e.dispatch(cmd({ type: 'applyEvent', event: BLEED, atTick: 120 * 50 })));
    const beats = b.beats(180, 240);
    console.log(`FU-3 DDD conducted bleed 180–240 s: rate ${b.rate(180, 240).toFixed(1)}, beats ${beats.length}, A spikes ${b.spikes(180, 240, 1).length}, V spikes ${b.spikes(180, 240, 2).length}, sinus beats ${beats.filter((x) => x.origin === 'sinus').length}, PR ${beats[0]?.prMs}`);
    expect(b.rate(180, 240)).toBeGreaterThanOrEqual(80);
    expect(b.spikes(180, 240, 1).length).toBe(0);
    expect(b.spikes(180, 240, 2).length).toBe(0); // the intrinsic PR (≈ 150 ms) is shorter than the 160 ms AV delay: the conducted QRS inhibits the V output
    expect(beats.every((x) => x.origin === 'sinus' && x.qrsMs < 120)).toBe(true);
  }, 600_000);

  it('MANUAL AAI programmed at 60 ppm: paced at 60; an instructor rate of 90 is intrinsic sinus (no spikes); 50 is paced at 60', async () => {
    const r = await run('manual', 'pacedAAI', { pacer: { ratePpm: 60 } }, 180, (e) => {
      e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 90, atTick: 60 * 50 }));
      e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 50, atTick: 120 * 50 }));
    });
    const log = (a: number, b: number) => `${r.rate(a, b).toFixed(1)}/min, ${r.beats(a, b).length} beats, ${r.spikes(a, b, 1).length} A spikes`;
    console.log(`FU-3 MANUAL AAI 60: ${log(25, 60)}; hr 90: ${log(65, 120)}; hr 50: ${log(125, 180)}`);
    expect(Math.abs(r.rate(25, 60) - 60)).toBeLessThanOrEqual(1);
    expect(r.spikes(25, 60, 1).length).toBeGreaterThanOrEqual(r.beats(25, 60).length - 1);
    expect(Math.abs(r.rate(65, 120) - 90)).toBeLessThanOrEqual(3);
    expect(r.spikes(65, 120, 1).length).toBe(0);
    expect(r.beats(65, 120).every((x) => x.origin === 'sinus')).toBe(true);
    expect(Math.abs(r.rate(125, 180) - 60)).toBeLessThanOrEqual(1);
    expect(r.spikes(125, 180, 1).length).toBeGreaterThanOrEqual(r.beats(125, 180).length - 1);
  }, 300_000);
});
```

and add it to the SLOW list — in `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/circ-rate-rule.test.ts', // FU-2: MODELED rhythm-rate scenarios (2–4 sim-min each)
```

and replace with:

```ts
  'test/engine/circ-rate-rule.test.ts', // FU-2: MODELED rhythm-rate scenarios (2–4 sim-min each)
  'test/engine/pacer-sensing.test.ts', // FU-3: MODELED AAI/DDD sensing scenarios (4 sim-min each)
```


- [x] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/pacer-sensing.test.ts`
Expected: FAIL, 4 failed —
- AAI bleed: `expected 96 to be +0` (log `FU-3 AAI bleed 180–240 s: rate 96.5, beats 96, A spikes 96, paced P 96, sinus beats 0`)
- DDD bleed: `expected 101 to be +0` (A spikes 101)
- DDD conducted: A spikes > 0 (d525eed probe: 101 A / 100 V spikes, all 100 beats `paced`)
- MANUAL AAI: `expected 30 to be less than or equal to 3` (hr 90 window: 60.0/min, 55 A spikes)

- [x] **Step 3: The lower rate** — in `packages/engine-core/src/l2/ecg/rhythm-state.ts`, find:

```ts
  /** The L1 'hr' target at time t (bpm, unclamped). */
  hrAt(t: number): number;
  mods: Modifiers;
```

and replace with:

```ts
  /** The L1 'hr' target at time t (bpm, unclamped). */
  hrAt(t: number): number;
  /** FU-3 (Q-FU2-10): an implanted pacemaker's programmed lower rate at t (bpm, unclamped) — the rate held for the
   * rhythm (the engine's held rate); absent = hrAt. MODELED AAI/DDD run hr = max(lower rate, reflex rate) above it. */
  pacerLowerAt?(t: number): number;
  mods: Modifiers;
```


then, in the same file, find:

```ts
/** The rate this rhythm's primary clock runs at, at time t (bpm). */
export function rhythmRate(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return clamp(ctx.hrAt(t), d.rateRange[0], d.rateRange[1]);
}
```

and replace with:

```ts
/** The rate this rhythm's primary clock runs at, at time t (bpm). */
export function rhythmRate(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return clamp(ctx.hrAt(t), d.rateRange[0], d.rateRange[1]);
}

/**
 * FU-3 (Q-FU2-10): the pacemaker's lower rate at t (bpm): PacerOpts.ratePpm, else the held rate (ctx.pacerLowerAt,
 * else hr), clamped to the rhythm's range. The pacer's escape interval is 60 / this; an 'hr' above it is the
 * intrinsic atrial rate of an atrial-sensing pacer (atria.ts atrialRate), which inhibits it.
 */
export function pacerLowerRate(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return st.opts.pacer?.ratePpm ?? clamp(ctx.pacerLowerAt?.(t) ?? ctx.hrAt(t), d.rateRange[0], d.rateRange[1]);
}
```

- [x] **Step 4: The pacer's escape interval** — in `packages/engine-core/src/l2/ecg/pacing.ts`, find:

```ts
import { HOOKS, NEVER, pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { PacerFault } from '../../types.ts';
```

and replace with:

```ts
import { HOOKS, NEVER, pacerLowerRate, pushPending, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { PacerFault } from '../../types.ts';
```


then, in the same file, find:

```ts
function interval(st: RhythmState, t: number, ctx: RhythmCtx): number {
  return 60 / (st.opts.pacer?.ratePpm ?? rhythmRate(st, t, ctx));
}
```

and replace with:

```ts
/** Escape interval at the programmed lower rate (FU-3: never the hr above it, which is the intrinsic rate). */
function interval(st: RhythmState, t: number, ctx: RhythmCtx): number {
  return 60 / pacerLowerRate(st, t, ctx);
}
```

- [x] **Step 5: The intrinsic atrial rate** — in `packages/engine-core/src/l2/ecg/atria.ts`, find:

```ts
import { HOOKS, NEVER, pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import { applyPMorphology, prDeltaMs } from './morphology/index.ts';
```

and replace with:

```ts
import { HOOKS, NEVER, pacerLowerRate, pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import { applyPMorphology, prDeltaMs } from './morphology/index.ts';
```


then, in the same file (`export function atrialRate(`), find:

```ts
  if (d.rateDrives === 'sinus') return rhythmRate(st, t, ctx);
  return st.opts.atrialRateBpm ?? d.atrialDefaultBpm;
}
```

and replace with:

```ts
  if (d.rateDrives === 'sinus') return rhythmRate(st, t, ctx);
  const base = st.opts.atrialRateBpm ?? d.atrialDefaultBpm;
  // FU-3 (Q-FU2-10): under an atrial-sensing pacer (AAI, DDD) an hr above the lower rate is the intrinsic sinus rate
  // (MODELED: the reflex overtaking the pacer; MANUAL: an instructor rate above PacerOpts.ratePpm). The sinus P is
  // sensed and inhibits the atrial output (NASPE/BPEG code, Bernstein 2002); at or below the lower rate the pacer paces.
  if (d.pacing === 'AAI' || d.pacing === 'DDD') {
    const hr = rhythmRate(st, t, ctx);
    if (hr > pacerLowerRate(st, t, ctx)) return Math.max(base, hr);
  }
  return base;
}
```

- [x] **Step 6: Feed the held rate (engine.ts, exception candidate)** — in `packages/engine-core/src/engine.ts`, find:

```ts
function rhythmCtx(ps: PipelineState): RhythmCtx {
  return { hrAt: (t) => rampValue(ps.hr, t), mods: ps.mods, rng: ps.rng, hrv: ps.hrv, breath: breathOf(ps) }; // Stage 5.1: breath
}
```

and replace with:

```ts
function rhythmCtx(ps: PipelineState): RhythmCtx {
  return {
    hrAt: (t) => rampValue(ps.hr, t),
    pacerLowerAt: (t) => rampValue(ps.hemo.circ.hrSet ?? ps.hr, t), // FU-3 (Q-FU2-10): the held rate is a pacer's lower rate
    mods: ps.mods, rng: ps.rng, hrv: ps.hrv, breath: breathOf(ps), // Stage 5.1: breath
  };
}
```


then, in `function startRate(id: RhythmId, opts: RhythmOpts): number {`, find:

```ts
  if (opts.rateBpm !== undefined) return opts.rateBpm;
  if (id === 'aflutter') {
```

and replace with:

```ts
  if (opts.rateBpm !== undefined) return opts.rateBpm;
  if (opts.pacer?.ratePpm !== undefined && RHYTHMS[id].rateDrives === 'pacer') return opts.pacer.ratePpm; // FU-3: a programmed lower rate
  if (id === 'aflutter') {
```

- [x] **Step 7: Run the test to verify it passes**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/pacer-sensing.test.ts`
Expected: PASS, 4 tests; logs:
```
FU-3 AAI bleed 180–240 s: rate 96.3, beats 96, A spikes 0, paced P 0, sinus beats 96
FU-3 AAI phenylephrine 150–240 s: rate 70.0, beats 105, A spikes 105
FU-3 DDD bleed 180–240 s: rate 100.7, beats 101, A spikes 0, V spikes 101, paced P 0
FU-3 DDD conducted bleed 180–240 s: rate 96.3, beats 96, A spikes 0, V spikes 0, sinus beats 96, PR 147
FU-3 MANUAL AAI 60: 60.0/min, 35 beats, 35 A spikes; hr 90: 90.4/min, 83 beats, 0 A spikes; hr 50: 60.0/min, 55 beats, 55 A spikes
```

- [x] **Step 8: Siblings + typecheck**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg test/l3/qrs-pacing.test.ts test/l3/defib-pacer test/engine/pacer-engine.test.ts test/engine/circ-rate-rule.test.ts test/l2/circ/rate-rule.test.ts test/engine/engine-seams.test.ts test/engine/engine-commands.test.ts test/engine/alarms-engine.test.ts test/engine/pacer-sensing.test.ts`
Expected: 48 files, 253 tests pass (Stage 5 `s5/pacing.test.ts` 10/10; `s5/library.test.ts` 39/39 incl. the seed-42/43
determinism hashes through DDD; FU-2 `circ-rate-rule` 6/6 with `FU-2 AAI 70 MODELED: phenylephrine 70.0 → 70.0; bleed
70.0 → 91.2` unchanged). Then `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/monitor-core-4b.test.ts`
(5/5) and `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [x] **Step 9: Commit**

```bash
git add packages/engine-core/src/l2/ecg/rhythm-state.ts packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/src/l2/ecg/pacing.ts packages/engine-core/src/engine.ts packages/engine-core/vite.config.ts packages/engine-core/test/engine/pacer-sensing.test.ts
git commit -m "fix(ecg): AAI/DDD sense the intrinsic sinus above the lower rate (FU-3 item 5, Q-FU2-10)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 7: The HR numeric uses the active skin's 12-RR method — AF over-read Q-FU2-11 (item 6; L3, E-FU3-4)

**Files:**
- Modify: `packages/engine-core/src/l3/hr.ts` (header comment; `hrMeasure` signature + one condition)
- Modify: `packages/engine-core/src/engine.ts` (**E-FU3-4**: the `./l3/hr.ts` import, the 1 Hz `measurement` push,
  FU-1's `hrAveraging()` cache)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)
- Create: `packages/engine-core/test/engine/hr-af-numeric.test.ts` (5 tests, 11 runs of 400 sim-s → SLOW)
- Modify: `packages/engine-core/test/l3/hr.test.ts` (one new `it`), `packages/engine-core/test/engine/hr-skin-averaging.test.ts`
  (philips-like's step series re-pinned — E-FU3-4)

**Interfaces:**
- Consumes: `HrMethod = 'dropMaxMin' | 'mean12'` (`l3/hr.ts`, existing), `resolveSkin(id).render.hrMethod.engine`
  (skins), FU-1's `hrAveragingOf`.
- Produces: `hrMeasure(st: HrState, t: number, avg?: HrAveraging, method: HrMethod = st.method): Measured`; the
  engine's private `hrAveraging(): { avg: HrAveraging | undefined; method: HrMethod }`.

**Why (MANUAL, seed 21, 80–380 s; true rate from the rhythm engine's `beat` events):** (b) the detector is exact —
detected R = beats at AF 100/130/145 (489/489, 649/649, 732/732) and sinus; (c) the generator realises 97.6 / 129.7 /
146.3 (the 300 s window's sampling spread) and the over-read is measured against that TRUE rate, so `AF_RATE_CAL` is
not touched; (a) the averaging is the cause, but not Jensen on 60/RR: `hrMeasure` takes 60 / mean(12 RR), and the engine
ran EVERY skin on the IEC-default trimmed mean (drop max and min) although philips-like declares Philips' disclosed
plain mean (research 03 §1.12 [P: MP2 datasheet, AAMI EC13 disclosure]; skin `render.hrMethod.engine: 'mean12'`, never
wired). On AF's right-skewed RR (CV 0.20 at 100, 0.28–0.30 at 130–145) dropping the longest and shortest RR reads
+3–5 %; the plain mean keeps only Jensen's (60/μ)(1 + CV²/12) ≤ +0.75 %. Skins disclosing the trimmed mean (ge, zoll,
mindray, lifepak; research 05 [S4], IEC 60601-2-27 cl. 201.7.9.2.9.101) keep it and its AF over-read (Q-FU3-6).
Rejected: an L3-only `hrAveragingOf` variant (changes FU-1's pinned contract); a beats-per-time estimator for all skins
(the others disclose the trimmed mean).

**Prototype numbers:** philips-like AF 100 / 130 / 145 vs true: +1.21 / **+4.80** / **+2.71 %** → **+0.29 / +0.76 /
+0.45 %** (band ± 1.5 % = 2 × the Jensen ceiling) · saadat-like (8 s window) +0.06 / −0.13 % unchanged · mindray-like
keeps +1.21 / +4.80 / +2.71 % (characterisation) · philips-like step 60 → 120 series 60, 67, 75, 86, 100, 120 → 63, 69,
76, 85, 96, 111, 120 (settles at +8 s; supporting, not pinned: 80 → 120 reaches 120 6.97 s after the first fast RR,
Philips discloses 6.8 s, range 6.4–7.2) · af-rate-control esmolol 26.7 → 24.6 % (band 20–30 ✓), amiodarone 14.6 → 14.0
% (`it.fails` unchanged) · circ-rate-rule AF 100 MODELED 100.6 → 99.6 (100 ± 5).

Before Step 6 (the `engine.ts` edit) run `git fetch origin && git merge origin/main` (R51 §7).

- [x] **Step 1: Write the failing engine test** — create `packages/engine-core/test/engine/hr-af-numeric.test.ts`:

```ts
// FU-3 item 6 (Q-FU2-11): the HR numeric in MANUAL AF against the TRUE mean ventricular rate (60 × beats / elapsed
// time, from the rhythm engine's own 'beat' events). Diagnosis (seed 21, 80–380 s): the QRS detector is exact (its
// detected R count equals the beat count: 489 / 649 / 732 at AF 100 / 130 / 145); the AF generator realises
// 97.6 / 129.7 / 146.3 (−2.4 / −0.2 / +0.9 %, the sampling spread of a 300 s window); the numeric read
// 98.8 / 135.9 / 150.2 (+1.2 / +4.8 / +2.7 % over the TRUE mean). The over-read was the averaging: the engine ran
// EVERY skin on the IEC-default trimmed mean of 12 RR (drop the max and the min), although philips-like declares
// Philips' disclosed plain mean of the 12 most recent RR (research 03 §1.12 [P: MP2 datasheet, AAMI EC13 disclosure];
// skins `hr.method: 'mean-12rr'` → `render.hrMethod.engine: 'mean12'`). On AF's right-skewed RR (a refractory floor
// and a long tail, CV 0.28–0.30 at 130–145) dropping the longest and the shortest RR shortens the mean RR by
// 0.1–0.15 SD, i.e. +3–5 % on the number. The plain mean keeps only the estimator's Jensen bias,
// E[60 / mean of 12 RR] ≈ (60 / mean RR)(1 + CV²/12): +0.3 % at AF 100 (CV 0.20), ≤ +0.75 % at CV 0.30 — the
// tolerance below is twice that ceiling. Skins that DISCLOSE the trimmed mean (the IEC default: ge-, zoll-, mindray-,
// lifepak-like; research 05 [S4], Mindray spec citing IEC 60601-2-27 cl. 201.7.9.2.9.101) keep it and its over-read.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { HrState } from '../../src/l3/hr.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
const A = 80; // measurement window (A, B] s; the rhythm is set at 20 s
const B = 380;

/**
 * MANUAL engine, `rhythm` at `rate` from 20 s. Over (A, B]: the true mean rate (60 × (beats − 1) / span of the
 * 'beat' events), the detected R count (the HR state's R history, read from a snapshot every 20 s), and the mean of
 * the 1 Hz HR numeric.
 */
function hrVsTrue(skin: string, rhythm: string, rate: number): Promise<Run> {
  const key = `${skin} ${rhythm} ${rate}`;
  let r = runs.get(key);
  if (!r) runs.set(key, (r = measure(skin, rhythm, rate)));
  return r;
}
interface Run {
  trueRate: number;
  monitor: number;
  pct: number;
  beats: number;
  detected: number;
}
const runs = new Map<string, Promise<Run>>(); // the philips-like AF runs serve two tests

async function measure(skin: string, rhythm: string, rate: number, seed = 21): Promise<Run> {
  const e = createEngine({ seed, device: { skin } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setRhythm', rhythm, opts: { rateBpm: rate } }));
  const rs = new Set<number>();
  for (let t = 40; t <= B + 20; t += 20) {
    e.advanceTo(t);
    const hrm = (e.snapshot().state as { st: { hrm: HrState } }).st.hrm;
    for (const r of hrm.long?.end ?? []) if (r > A && r <= B) rs.add(r);
    if (t % 60 === 0) await yieldNow();
  }
  const beats = ev.flatMap((x) => (x.type === 'beat' && x.t > A && x.t <= B ? [x.t] : []));
  const trueRate = (60 * (beats.length - 1)) / ((beats.at(-1) as number) - (beats[0] as number));
  const hr = ev.flatMap((x) => (x.type === 'measurement' && x.t > A && x.t <= B && x.values.hr?.value != null ? [x.values.hr.value] : []));
  const monitor = hr.reduce((s, v) => s + v, 0) / hr.length;
  const pct = (100 * (monitor - trueRate)) / trueRate;
  console.log(
    `FU-3 ${skin} ${rhythm} ${rate}: true ${trueRate.toFixed(2)} (${beats.length} beats, ${rs.size} detected R), ` +
      `monitor ${monitor.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)} %)`,
  );
  return { trueRate, monitor, pct, beats: beats.length, detected: rs.size };
}

describe('HR numeric in MANUAL AF vs the true mean ventricular rate (FU-3 item 6, Q-FU2-11)', () => {
  // The generator bound is the sampling spread of the window, not a calibration: SE of the mean RR ≈ CV/√n ≈ 0.20/√489
  // ≈ 0.9 % at AF 100, and ± 3 % ≈ 3 SE (FU-2's ± 2 % AF-mapping gate is on 600 s runRhythm runs at 130–150).
  it('the detector counts every beat, and the AF generator realises its set rate (± 3 %): AF 100 / 130 / 145', async () => {
    for (const rate of [100, 130, 145]) {
      const r = await hrVsTrue('philips-like', 'afib', rate);
      expect(Math.abs(r.detected - r.beats), `AF ${rate}: ${r.detected} R vs ${r.beats} beats`).toBeLessThanOrEqual(1);
      expect(Math.abs(r.trueRate - rate) / rate, `AF ${rate}: true ${r.trueRate.toFixed(2)}`).toBeLessThanOrEqual(0.03);
    }
  }, 300_000);

  it('philips-like (plain mean of 12 RR, its disclosed method): AF 100 / 130 / 145 read the true mean within ± 1.5 %', async () => {
    for (const rate of [100, 130, 145]) {
      const r = await hrVsTrue('philips-like', 'afib', rate);
      expect(Math.abs(r.pct), `AF ${rate}: ${r.pct.toFixed(2)} %`).toBeLessThanOrEqual(1.5);
    }
  }, 300_000);

  it('saadat-like (8 s moving average, FU-2 item 5) is untouched: AF 130 / 145 read the true mean within ± 1.5 %', async () => {
    for (const rate of [130, 145]) {
      const r = await hrVsTrue('saadat-like', 'afib', rate);
      expect(Math.abs(r.pct), `AF ${rate}: ${r.pct.toFixed(2)} %`).toBeLessThanOrEqual(1.5);
    }
  }, 300_000);

  it('mindray-like keeps its disclosed trimmed mean of 12 RR, and with it the over-read on AF 100 / 130 / 145', async () => {
    const lo = { 100: 0.5, 130: 2, 145: 2 } as const; // the trimming bias grows with the RR CV (0.20 at 100, ≈ 0.29 at 130–145)
    for (const rate of [100, 130, 145] as const) {
      const r = await hrVsTrue('mindray-like', 'afib', rate);
      expect(r.pct, `AF ${rate}: ${r.pct.toFixed(2)} %`).toBeGreaterThan(lo[rate]);
    }
  }, 300_000);

  it('philips-like, regular sinus 60 / 100 / 150: the numeric is within 0.5 bpm of the true mean', async () => {
    for (const rate of [60, 100, 150]) {
      const r = await hrVsTrue('philips-like', 'sinus', rate);
      expect(Math.abs(r.monitor - r.trueRate)).toBeLessThanOrEqual(0.5);
    }
  }, 300_000);
});
```

- [x] **Step 2: Write the failing unit test** — `packages/engine-core/test/l3/hr.test.ts` — find:
```ts
  it('keeps only the last 12 RR', () => {
```
replace with:
```ts
  it("FU-3 (Q-FU2-11): hrMeasure's method argument (the active skin's) overrides the state's creation default", () => {
    const { st, t } = feed([...Array(10).fill(0.75), 0.3, 1.5]); // a 'dropMaxMin' state
    expect(hrMeasure(st, t).value).toBe(80);
    expect(hrMeasure(st, t, undefined, 'mean12').value).toBe(Math.round(60 / ((10 * 0.75 + 0.3 + 1.5) / 12)));
    expect(hrMeasure(st, t, undefined, 'dropMaxMin').value).toBe(80);
  });

  it('keeps only the last 12 RR', () => {
```

- [x] **Step 3: Re-pin philips-like's step series** — `packages/engine-core/test/engine/hr-skin-averaging.test.ts` — find:
```ts
  it('philips-like is unchanged: 60, 67, 75, 86, 100, 120 … (trimmed mean of 12 RR)', () => {
    expect(stepSeries('philips-like')).toEqual([60, 67, 75, 86, 100, 120, 120, 120, 120]);
  });
```
replace with:
```ts
  // FU-3 item 6 (Q-FU2-11): philips-like now runs its declared plain mean of 12 RR (it ran the trimmed mean until FU-3:
  // 60, 67, 75, 86, 100, 120 … settled at +7 s); the plain mean needs all 12 RR at the new rate: settled at +8 s.
  it('philips-like: 63, 69, 76, 85, 96, 111, 120 … (plain mean of 12 RR, its disclosed method)', () => {
    expect(stepSeries('philips-like')).toEqual([63, 69, 76, 85, 96, 111, 120, 120, 120]);
  });
```

- [x] **Step 4: Add the file to the SLOW list** — `packages/engine-core/vite.config.ts` — find:
```ts
  'test/engine/af-rate-control.test.ts', // FU-2: AF rate control (13–22 sim-min each)
```
replace with:
```ts
  'test/engine/af-rate-control.test.ts', // FU-2: AF rate control (13–22 sim-min each)
  'test/engine/hr-af-numeric.test.ts', // FU-3: HR numeric vs the true AF rate (11 runs of 400 sim-s)
```

- [x] **Step 5: Run, expect FAIL**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hr-af-numeric.test.ts test/engine/hr-skin-averaging.test.ts test/l3/hr.test.ts
```
Expected: 3 failed | 10 passed (13) —
`philips-like (plain mean of 12 RR …)` → `AF 130: 4.80 %: expected 4.800009795742312 to be less than or equal to 1.5`;
`philips-like: 63, 69, 76, 85, 96, 111, 120 …` → `expected [ 60, 67, 75, 86, 100, 120, 120, …(2) ] to deeply equal [ 63, 69, 76, 85, 96, 111, 120, …(2) ]`;
`FU-3 (Q-FU2-11): hrMeasure's method argument …` → `expected 80 to be 77` (typecheck also reports the extra argument).
The detector/generator, saadat-like, mindray-like and sinus tests PASS before the fix (they are the controls).

- [x] **Step 6: Implement** — the exact blocks:

`packages/engine-core/src/engine.ts` — find:
```ts
import { createHrState, hrAveragingOf, hrMeasure, hrOnQrs, type HrAveraging, type HrState } from './l3/hr.ts';
```
replace with:
```ts
import { createHrState, hrAveragingOf, hrMeasure, hrOnQrs, type HrAveraging, type HrMethod, type HrState } from './l3/hr.ts';
```

`packages/engine-core/src/engine.ts` — find:
```ts
          ps.out.push({ type: 'measurement', t, values: { hr: hrMeasure(ps.hrm, t, this.hrAveraging()) } }); // FU-1: skin averaging
```
replace with:
```ts
          const hra = this.hrAveraging();
          ps.out.push({ type: 'measurement', t, values: { hr: hrMeasure(ps.hrm, t, hra.avg, hra.method) } }); // FU-1/FU-3: the skin's averaging
```

`packages/engine-core/src/engine.ts` — find:
```ts
  /** FU-1 (E-4a-2): the active skin's optional `hr.averaging`, cached per skin id (a skin switch picks it up). */
  private hrAvgCache: { skin: string; avg: HrAveraging | undefined } | null = null;
  private hrAveraging(): HrAveraging | undefined {
    const skin = this.dev.alarms.profile.skin;
    if (this.hrAvgCache?.skin !== skin) this.hrAvgCache = { skin, avg: hrAveragingOf(resolveSkin(skin).skin) };
    return this.hrAvgCache.avg;
  }
```
replace with:
```ts
  /**
   * FU-1 (E-4a-2): the active skin's optional `hr.averaging`, and (FU-3, Q-FU2-11) its 12-RR method — philips-like's
   * disclosed plain mean, the IEC-default trimmed mean otherwise — cached per skin id (a skin switch picks them up).
   */
  private hrAvgCache: { skin: string; avg: HrAveraging | undefined; method: HrMethod } | null = null;
  private hrAveraging(): { avg: HrAveraging | undefined; method: HrMethod } {
    const skin = this.dev.alarms.profile.skin;
    if (this.hrAvgCache?.skin !== skin) {
      const r = resolveSkin(skin);
      this.hrAvgCache = { skin, avg: hrAveragingOf(r.skin), method: r.render.hrMethod.engine ?? 'dropMaxMin' };
    }
    return this.hrAvgCache;
  }
```

`packages/engine-core/src/l3/hr.ts` — find:
```ts
// or of the RR ending in the last n seconds (at least the last 2). Without it the HR is computed as above.
```
replace with:
```ts
// or of the RR ending in the last n seconds (at least the last 2). Without it the HR is computed as above.
// FU-3 (Q-FU2-11): the method (trimmed or plain mean of 12) is the active skin's (`hrMeasure`'s `method`), not the
// state's creation default: on AF's right-skewed RR the trimmed mean reads 3–5 % high at 130–145, and philips-like
// discloses the plain mean (research 03 §1.12).
```

`packages/engine-core/src/l3/hr.ts` — find:
```ts
/** The HR numeric at time t (call once per second); `avg` is the skin's optional averaging (FU-1). */
export function hrMeasure(st: HrState, t: number, avg?: HrAveraging): Measured {
```
replace with:
```ts
/**
 * The HR numeric at time t (call once per second); `avg` is the skin's optional averaging (FU-1), `method` the
 * skin's 12-RR method (FU-3; defaults to the state's).
 */
export function hrMeasure(st: HrState, t: number, avg?: HrAveraging, method: HrMethod = st.method): Measured {
```

`packages/engine-core/src/l3/hr.ts` — find:
```ts
  else if (st.method === 'dropMaxMin' && rrs.length >= 4) {
```
replace with:
```ts
  else if (method === 'dropMaxMin' && rrs.length >= 4) {
```

- [x] **Step 7: Run, expect PASS**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hr-af-numeric.test.ts test/engine/hr-skin-averaging.test.ts test/l3 test/engine/engine-rate-sweep.test.ts test/engine/alarms-engine.test.ts test/engine/engine-commands.test.ts
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-rate-rule.test.ts test/engine/af-rate-control.test.ts
npx -y pnpm@9.15.9 -r typecheck
```
Expected: 27 files / 137 tests pass; 2 files / 8 tests pass (amiodarone stays `it.fails`); typecheck clean. Logged:
`FU-3 philips-like afib 100: true 97.64 (489 beats, 489 detected R), monitor 97.93 (+0.29 %)`, 130 → 130.69
(+0.76 %), 145 → 146.92 (+0.45 %).

- [x] **Step 8: Commit**

```bash
git add packages/engine-core/src/l3/hr.ts packages/engine-core/src/engine.ts packages/engine-core/vite.config.ts packages/engine-core/test/engine/hr-af-numeric.test.ts packages/engine-core/test/engine/hr-skin-averaging.test.ts packages/engine-core/test/l3/hr.test.ts
git commit -m "fix(l3/hr): the HR numeric uses the active skin's 12-RR method (philips-like: plain mean) — AF over-read Q-FU2-11" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 8: CVP alarm decided by evidence — the default is right, 7a's MANUAL CVP under positive pressure is pinned (item 7; tests only)

**Files:**
- Create: `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts` (8 tests: 2 `it.fails` with numbers, 6 `it`;
  8 engine runs of 120–300 sim-s → SLOW)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Interfaces:** none (no source change). The deferred mechanism is written out in "Item 7: the fix is deferred" below.

**Why.** The 8a soak (`apps/demo/src/validation/perf.ts`: seed 11, MANUAL, baseline 78 / 124 / 72, CVP line connected,
philips-like, ventilator RR 12 / VT 500 / FiO2 0.5 / PEEP 5 at t = 0) raises `CVP_M_HIGH` 42 times in 3,600 s (the raise
times 27, 37, 47, 57, 182, 337 … equal `docs/validation/perf/soak-2026-09-27.json`, which holds 42 rows; the gate note
says 43). Its displayed `cvpMean` (a 2 s EMA sampled at 1 Hz, ±0.6 mmHg breath ripple) is 8.85–10.17, mean 9.43 — the
ruling's "4.9–7.6" is a different rig. The alarm engine re-raises a level-2 limit alarm at every crossing (no
hysteresis; `stepAlarms` latches level 1 only), which explains the COUNT; the LEVEL is the question.

| Vendor | Factory adult CVP-mean alarm limits | Source |
|---|---|---|
| Philips IntelliVue MX800 / MP2–MP90 / X2 (rel. H.0) | 0–10 mmHg (paed/neo 0–4) | IntelliVue *Configuration Guide* rel. H.0, part 4535 642 29201, p. 59 "CVP, RAP, LAP, UVP Settings"; research/03 §8.10 |
| Mindray BeneVision N | 0–14 cmH2O (≈ 0–10.3 mmHg) | N-series Operator's Manual rev 20.0, App. C (research/03 §8.10) |
| Saadat Alborz B9 | −5–15 mmHg; parameter alarms factory OFF | manual App. 1, M p. 302–306 (research/06 §4.3) |
| GE CARESCAPE | not retrieved (Auto-Limits rule: venous × 1.25 + 5 / × 0.75 − 5) | B850/B650 User's Manual p. 138 (research/03 §8.10) |
| Skins | philips-like `CVP_M` [0, 10] adult — matches Philips; saadat-like [−5, 15] — matches Saadat; ge/mindray/lifepak/zoll-like carry no `CVP_M` | `packages/skins/src/data/skins/*.json` |

Physiology: normal CVP mean 2–8 mmHg (L1 default 6; research/03 §2.9); positive-pressure ventilation raises the
effective RAP by 30–50 % of the mean-airway-pressure change (brief §4.9), tables Q28's `tIt` default 0.4, H10 PEEP
5 → 15 = CVP +2–3 [ENG]. The MANUAL tracker (`l2/hemo/pipeline.ts`, the `cvpNow` line of "Stage 7a MANUAL: slow CVP")
holds `pRa − max(0, pIt − P_PL0)` at the instructor's CVP, so the displayed CVP rises by T_IT of the alveolar pressure —
and the R44 PPV calibration raised `T_IT` 0.4 → 0.65 (`l2/circ/params.ts`), which the MANUAL CVP silently inherited:
PEEP 5 → 15 reads +4.82 mmHg (65 % of 7.36) against 2.2–3.7. **Verdict: the alarm default is right; 7a's MANUAL CVP
under positive pressure is wrong.** The mechanism (`MANUAL_CVP_PAW_FRACTION` 0.4 on the airway share) was prototyped and
meets both rows (step 2.99, soak 7.58–8.76, 0 raises/h, PEEP 0 unchanged, CVP 18 still alarms), but it moves FIVE
calibrated bands elsewhere — measured on the integrated prototype: check 18 MAP-65 premise 64.4 → 72.4 (band < 68) and
hypocapnia 0.374 → 0.437 (≤ 0.40), the 7c OLV re-check nadir 88.7 → 87.5 (> 88), R36 PH-crisis EtCO2 +6.8 → +3.8 (≥ 5),
the 8a capture-match SBP 126.4 → 121.4 (130 ± 8) — while flipping three `it.fails` to pass (7c OLV flow share 0.307 →
0.293; link-r27 ARDS recruitment and cardiogenic oedema). Under R45 and the FU-2 item-6 precedent the executor does not
land a mechanism that breaks calibrated bands: the evidence is pinned here, the fix is in "Item 7: the fix is
deferred" for the orchestrator/Ali (Q-FU3-7a). Hysteresis/latching (Philips factory "Visual/Audible Latching =
Red&Yell", *Configuration Guide* p. 96) would change the count, not the level (Q-FU3-7b).

**Prototype numbers (d525eed):** PEEP 5 → 15 step 4.82 (band 2.2–3.7) `it.fails` · soak CVP 30–120 s 9.00–10.17,
`CVP_M_HIGH` at 27, 37, 47, 57 s `it.fails` · CVP target 18 at 120 s: raised at 122 s (philips-like) and 127 s
(saadat-like), never on the four skins without a CVP limit — 6 `it` · file 6.5 s wall.

- [x] **Step 1: Write the evidence test** — create `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts`:

```ts
// FU-3 item 7 (G8a calibration queue row 7) — evidence, decided: the ALARM DEFAULT is right and the 7a MANUAL CVP under
// positive-pressure ventilation is wrong, but its fix is NOT landed here (R45; see the plan's "Item 7: the fix is
// deferred"). The 8a soak patient — MANUAL, CVP 6 (L1 default, normal mean 2–8), ventilated at PEEP 5 from t = 0 —
// shows CVP 8.9–10.2 (mean 9.4) and re-raises CVP_M_HIGH 42 times an hour on philips-like, whose adult CVP mean limits
// 0–10 mmHg ARE the IntelliVue factory defaults (Configuration Guide rel. H.0, part 4535 642 29201, p. 59 "CVP, RAP,
// LAP, UVP Settings"; Mindray BeneVision N 0–14 cmH2O ≈ 0–10.3 mmHg, research/03 §8.10; Saadat B9 −5–15, research/06
// §4.3 — the skins match their vendors). The MANUAL CVP tracker (l2/hemo/pipeline.ts, "cvpNow") holds the RA pressure
// minus the WHOLE pleural rise at the instructor's CVP, so the displayed CVP rises by T_IT (0.65 since the R44 PPV
// calibration) of the alveolar pressure, where the tables' Q28 default 0.4 is the brief's "30–50 % of the mean-airway-
// pressure change" (brief §4.9; tables H10: PEEP 5 → 15 gives CVP +2–3 [ENG]). The mechanism (a MANUAL_CVP_PAW_FRACTION
// of 0.4) meets both bands below (step 2.99, soak max 8.76, 0 raises/h) but moves five calibrated bands (check 18's
// MAP-65 premise 64.4 → 72.4 and hypocapnia 0.374 → 0.437; the 7c OLV re-check nadir 88.5 → 87.5; R36 PH-crisis EtCO2
// +6.8 → +3.8; the 8a capture-match SBP 126.4 → 121.4) — a ruling, not an executor's call. Until then: it.fails.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const SKINS = ['philips-like', 'ge-like', 'mindray-like', 'saadat-like', 'lifepak-like', 'zoll-like'] as const;

/** The 8a soak patient (apps/demo/src/validation/perf.ts) on one skin, ventilated from t = 0. */
function soak(skin: string, peep: number): { e: MonitorEngine; ev: EngineEvent[] } {
  const e = createEngine({
    seed: 11,
    patient: { baseline: { hr: 78, sbp: 124, dbp: 72 }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on', nibp: 'on' } },
    device: { skin },
  });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  // saadat-like parameter alarms are factory OFF (research/06 §4.2): switch CVP on so its −5–15 limit is watched
  if (skin === 'saadat-like') e.dispatch(cmd({ type: 'device', action: { device: 'alarm', action: 'enable', param: 'CVP', value: true } }));
  e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep } }));
  return { e, ev };
}

async function run(e: MonitorEngine, t1: number): Promise<void> {
  for (let t = 60; t <= t1; t += 60) {
    e.advanceTo(t);
    await new Promise((r) => setImmediate(r)); // CI amendment 2: yield once per sim-minute
  }
}

const cvpMeans = (ev: EngineEvent[], t0: number, t1: number): number[] =>
  ev.flatMap((x) => (x.type === 'measurement' && x.t >= t0 && x.t < t1 && x.values.cvpMean?.value != null ? [x.values.cvpMean.value] : []));
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const raises = (ev: EngineEvent[], id: string): number[] =>
  ev.flatMap((x) => (x.type === 'alarm' && x.id === id && x.state === 'raised' && x.level !== undefined ? [x.t] : []));

describe('MANUAL CVP under positive-pressure ventilation (FU-3 item 7)', () => {
  it.fails('brief §4.9: CVP 6 ventilated from t = 0, PEEP 15 reads 30–50 % of the 10 cmH2O step (2.2–3.7 mmHg) above PEEP 5 (measured 4.82: T_IT 0.65)', { timeout: 120_000 }, async () => {
    const a = soak('philips-like', 5);
    const b = soak('philips-like', 15);
    await run(a.e, 300);
    await run(b.e, 300);
    const d = mean(cvpMeans(b.ev, 120, 300)) - mean(cvpMeans(a.ev, 120, 300));
    console.log(`FU-3 MANUAL CVP PEEP 5 → 15 step ${d.toFixed(2)} mmHg`);
    const step = 10 * 0.7356; // mmHg (CMH2O_TO_MMHG)
    expect(d).toBeGreaterThanOrEqual(0.3 * step);
    expect(d).toBeLessThanOrEqual(0.5 * step);
  });

  it.fails('the 8a soak patient (CVP 6, PEEP 5) stays under the philips-like 10 mmHg limit with its ventilatory ripple: max < 9.5 and no CVP_M_HIGH in 120 s (measured max 10.17, raises at 27–57 s)', { timeout: 120_000 }, async () => {
    const s = soak('philips-like', 5);
    await run(s.e, 120);
    const v = cvpMeans(s.ev, 30, 120);
    console.log(`FU-3 soak CVP 30–120 s: ${Math.min(...v).toFixed(2)}–${Math.max(...v).toFixed(2)}, raises ${JSON.stringify(raises(s.ev, 'CVP_M_HIGH'))}`);
    expect(Math.max(...v)).toBeLessThan(9.5); // limit 10 minus the ≈ ±0.6 mmHg ventilatory ripple of the 2 s mean
    expect(raises(s.ev, 'CVP_M_HIGH')).toEqual([]);
  });

  for (const skin of SKINS) {
    it(`${skin}: a real CVP rise (target 18 at 120 s) raises CVP_M_HIGH only where the skin carries its vendor's CVP limit`, { timeout: 120_000 }, async () => {
      const s = soak(skin, 5);
      await run(s.e, 120);
      s.e.dispatch(cmd({ type: 'setTarget', variable: 'cvp', value: 18 }));
      await run(s.e, 300);
      const hasLimit = skin === 'philips-like' || skin === 'saadat-like'; // 0–10 (Philips factory), −5–15 (Saadat M p. 302–306)
      const r = raises(s.ev, 'CVP_M_HIGH');
      console.log(`FU-3 ${skin} CVP 18: raises at ${JSON.stringify(r.filter((t) => t >= 120))}`);
      expect(r.some((t) => t >= 120)).toBe(hasLimit);
    });
  }
});
```

- [x] **Step 2: Add it to the SLOW list** — `packages/engine-core/vite.config.ts`, find (Task 4's entry):

```ts
  'test/engine/circ-manual-ischaemia.test.ts', // FU-3 item 4: the check-18 rig to MAP 65 (9 sim-min)
```

and replace with:

```ts
  'test/engine/circ-manual-ischaemia.test.ts', // FU-3 item 4: the check-18 rig to MAP 65 (9 sim-min)
  'test/engine/circ-manual-cvp-peep.test.ts', // FU-3 item 7: 8 soak-patient runs of 300 sim-s each
```

- [x] **Step 3: Run it**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-manual-cvp-peep.test.ts`
Expected: 8 passed (the two `it.fails` fail internally as declared). Logs:

```
FU-3 MANUAL CVP PEEP 5 → 15 step 4.82 mmHg
FU-3 soak CVP 30–120 s: 9.00–10.17, raises [27,37,47,57]
FU-3 philips-like CVP 18: raises at [122]
FU-3 ge-like CVP 18: raises at []
FU-3 mindray-like CVP 18: raises at []
FU-3 saadat-like CVP 18: raises at [127]
FU-3 lifepak-like CVP 18: raises at []
FU-3 zoll-like CVP 18: raises at []
```

If 7e (merged before this plan) moved the MANUAL CVP, record the new step and soak numbers in the two titles and the
gate note (R45: titles carry the measurement; the criteria stay).

- [x] **Step 4: Commit**

```bash
git add packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts packages/engine-core/vite.config.ts
git commit -m "test(hemo): CVP alarm decided by evidence — the skin default is the vendor's; 7a's MANUAL CVP under PPV pinned it.fails (FU-3 item 7)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 9: Rename the renal seam field `uopMlH` → `uopAboveBasalMlH` (item 8; 7c type + 7d writer, E-FU3-5)

**Files:**
- Modify: `packages/engine-core/src/l2/blood/core.ts` (7c: `RenalSeam` + JSDoc, the `stepFluids` read)
- Modify: `packages/engine-core/src/l2/organs/inputs.ts` (7d: `type RenalSeam` + JSDoc)
- Modify: `packages/engine-core/src/l2/organs/pipeline.ts` (7d: `renalSeam`'s return)
- Test: `packages/engine-core/test/l2/blood/core.test.ts` (7c: one literal), `packages/engine-core/test/l2/organs/pipeline.test.ts`
  (7d: 8 renames + one new `it` that imports 7c's `createBloodCore`, `stepBloodCore`, `bloodMl` — E-FU3-5)

**Interfaces:**
- Consumes: 7c's `createBloodCore`, `stepBloodCore` (`l2/blood/core.ts`), `bloodMl` (`l2/blood/fluids.ts`); 7d's
  `renalSeam` and `UOP0_ML_KG_H` (1.0, tables `UOP0` [TXT]).
- Produces: `blood.core.renal = { uopAboveBasalMlH: number, excretion: { k, na, cl, gluconate } }` (R51 addendum 14's
  seam, renamed; behaviour unchanged).

**Why:** R51 addendum 14 named the seam `uopMlH` ("urine REPLACES the fixed elimination"). G7d follow-through 2 fixed
7d's writer to carry only urine ABOVE the basal turnover (7c's fluid balance has no intake term, so a whole-urine seam
drained a resting patient: 6 h BV −2.8 %, K −0.18). The name must say what it carries. Readers/writers (grep of the
whole repo at `d525eed`): 7c `core.ts` (type + the only reader), 7d `inputs.ts` + `pipeline.ts` (type + the only
writer), two test files; none in apps/demo, packages/validation, controller, skins, renderer. Historical plans/gate
notes that mention the old name are records and are not edited. **7e** (`git grep uopMlH origin/stage-7e-endocrine-thermal`
at `ba2d3ac`) has no reader of its own — its hits are the two inherited lines this task edits, which 7e does not
modify; after 7e lands run `git grep -n uopMlH -- packages apps` (expected: only the rename note in `core.ts`'s JSDoc).

**Prototype numbers:** new test before: FAIL (`undefined`); after: at rest the kidney makes 72.55 mL/h and the seam
carries 2.55 mL/h; over 10 min body water equals 7c's own fallback within 0.37 mL (a whole-urine seam would be 10.55
mL short) · `test/l2/{blood,organs,renal}` 97/97.

- [x] **Step 1: Write the failing test** — in `packages/engine-core/test/l2/organs/pipeline.test.ts`, 
find:

```ts
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { advanceOrgans, applyOrgansCommand, createOrgansState, rebaselineOrgans, validateOrgansCommand } from '../../../src/l2/organs/pipeline.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
```

and replace with:

```ts
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { createBloodCore, stepBloodCore, type BloodCore } from '../../../src/l2/blood/core.ts';
import { bloodMl } from '../../../src/l2/blood/fluids.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { advanceOrgans, applyOrgansCommand, createOrgansState, rebaselineOrgans, validateOrgansCommand } from '../../../src/l2/organs/pipeline.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
```

find:

```ts
    const ev = os.out.filter((e) => e.type === 'organs').pop() as Extract<EngineEvent, { type: 'organs' }>;
    expect(ev.liver.lactate).toBe(2.5);
  });
});

```

and replace with:

```ts
    const ev = os.out.filter((e) => e.type === 'organs').pop() as Extract<EngineEvent, { type: 'organs' }>;
    expect(ev.liver.lactate).toBe(2.5);
  });
  // FU-3 item 8 (G7d follow-through 2): the seam's field names its meaning — urine ABOVE the basal turnover. Pinned on
  // the REAL 7c core: at rest the seam is ≈ 0 and 7c's body water keeps its basal urine exactly as its own fallback
  // does (the basal 1 mL/kg/h is neither removed by the seam nor removed a second time by the fallback elimination).
  it('seam uopAboveBasalMlH on the real 7c: ≈ 0 at resting UOP, body water after 10 min = 7c\'s fallback (basal urine not removed)', () => {
    const { os, ctx } = setup();
    const man = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
    const seamed = createBloodCore(man, 5.25, 40);
    const fallback = createBloodCore(man, 5.25, 40);
    const water = (b: BloodCore): number => bloodMl(b.fl) + b.fl.visf;
    const step = (b: BloodCore, t: number): void => stepBloodCore(b, { t, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 208 }, 0.1);
    step(seamed, 0);
    step(fallback, 0);
    const blood = { core: seamed, out: seamed.out };
    rebaselineOrgans(os, { ...ctx, blood }); // the engine baselines the organs on 7c's stepped `out` (gate §10 F2)
    advanceOrgans(os, { ...ctx, blood }, 125 * 2, () => {});
    expect(os.renal.uopMlMin * 60).toBeCloseTo(70, -1); // the kidney makes its basal 1 mL/kg/h …
    const seam = seamed.renal as { uopAboveBasalMlH: number };
    expect(seam.uopAboveBasalMlH).toBeGreaterThanOrEqual(0);
    expect(seam.uopAboveBasalMlH).toBeLessThan(10); // … and the seam carries only what is above it
    const w0 = water(seamed);
    for (let k = 1; k <= 6000; k++) {
      step(seamed, k / 10);
      step(fallback, k / 10);
    }
    expect(w0 - water(seamed)).toBeCloseTo(seam.uopAboveBasalMlH / 6, 0); // 10 min of the above-basal urine only
    expect(Math.abs(water(seamed) - water(fallback))).toBeLessThan(2); // a whole-urine seam: 10.55 mL short (measured)
  });
});

```

(The existing `it` keeps `uopMlH` until Step 4 — Step 1 adds only the import and the new `it`, which uses the new name.)

- [x] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs/pipeline.test.ts`
Expected: FAIL — `seam uopAboveBasalMlH on the real 7c …`: `TypeError: actual value must be number or bigint, received
"undefined"` (the seam still carries `uopMlH`); the other 5 tests pass.


- [x] **Step 3: Rename the field in 7c's type and reader** — in `packages/engine-core/src/l2/blood/core.ts`, 
find:

```ts
}

/**
 * 7d's kidney (R51 addendum 14: `blood.core.renal = { uopMlH, excretion: { k, na, cl, gluconate } }`, rates per
 * hour). When 7d fills it, urine REPLACES the fixed volume-receptor elimination and its isotonic solute loss; `null`
 * (the default) = the fixed elimination (K_EL_AWAKE, GA ×0.2) until 7d.
 */
export interface RenalSeam {
  uopMlH: number;
  excretion: { k: number; na: number; cl: number; gluconate: number }; // mmol/h (gluconate: Plasma-Lyte's anion, decision 3)
}

```

and replace with:

```ts
}

/**
 * 7d's kidney (R51 addendum 14: `blood.core.renal = { uopAboveBasalMlH, excretion: { k, na, cl, gluconate } }`, rates
 * per hour). When 7d fills it, the seam REPLACES the fixed volume-receptor elimination and its isotonic solute loss;
 * `null` (the default) = the fixed elimination (K_EL_AWAKE, GA ×0.2) until 7d. The balance has no intake term, so the
 * seam carries only the urine ABOVE the basal turnover (7d's UOP0, 1 mL/kg/h) — the basal urine is taken as replaced
 * by a basal intake, as in the fallback (G7d follow-through 2; renamed from `uopMlH` in FU-3 item 8).
 */
export interface RenalSeam {
  uopAboveBasalMlH: number; // mL/h, ≥ 0: urine above the basal 1 mL/kg/h (0 at a resting kidney)
  excretion: { k: number; na: number; cl: number; gluconate: number }; // mmol/h (gluconate: Plasma-Lyte's anion, decision 3)
}

```

find:

```ts
  const c0 = concOf(so, ecfMl(fl), pat.vLacL, bc.ecf0);
  const ecfBefore = ecfMl(fl);
  const rn = bc.renal;
  const r = stepFluids(fl, x.t, dtS, osmEcf(c0) > 0 ? 290 / osmEcf(c0) : 1, rn ? Math.max(0, rn.uopMlH) / 60 : undefined);
  bc.bledMl += r.bledMl;
  if (r.bledPlasmaMl > 0) removePlasma(so, r.bledPlasmaMl, ecfBefore, c0);
  if (rn) {
```

and replace with:

```ts
  const c0 = concOf(so, ecfMl(fl), pat.vLacL, bc.ecf0);
  const ecfBefore = ecfMl(fl);
  const rn = bc.renal;
  const r = stepFluids(fl, x.t, dtS, osmEcf(c0) > 0 ? 290 / osmEcf(c0) : 1, rn ? Math.max(0, rn.uopAboveBasalMlH) / 60 : undefined);
  bc.bledMl += r.bledMl;
  if (r.bledPlasmaMl > 0) removePlasma(so, r.bledPlasmaMl, ecfBefore, c0);
  if (rn) {
```

In `packages/engine-core/test/l2/blood/core.test.ts`, 
find:

```ts
  it('7d renal seam (R51 addendum 14): core.renal replaces the fixed elimination — urine water and each solute at its rate', () => {
    const a = createBloodCore(MAN, CO0, 40);
    const b = createBloodCore(MAN, CO0, 40);
    b.renal = { uopMlH: 600, excretion: { k: 6, na: 60, cl: 60, gluconate: 0 } }; // 10 mL/min of urine, Na/Cl 100 mmol/L, K 10
    run(a, 0, 600);
    run(b, 0, 600);
    expect(bloodMl(a.fl) + a.fl.visf).toBeCloseTo(4807 + 11356, -1); // at rest the fixed elimination removes nothing
```

and replace with:

```ts
  it('7d renal seam (R51 addendum 14): core.renal replaces the fixed elimination — urine water and each solute at its rate', () => {
    const a = createBloodCore(MAN, CO0, 40);
    const b = createBloodCore(MAN, CO0, 40);
    b.renal = { uopAboveBasalMlH: 600, excretion: { k: 6, na: 60, cl: 60, gluconate: 0 } }; // 10 mL/min of urine, Na/Cl 100 mmol/L, K 10
    run(a, 0, 600);
    run(b, 0, 600);
    expect(bloodMl(a.fl) + a.fl.visf).toBeCloseTo(4807 + 11356, -1); // at rest the fixed elimination removes nothing
```

- [x] **Step 4: Rename it in 7d's type and writer** — in `packages/engine-core/src/l2/organs/inputs.ts`, 
find:

```ts
  sepsis: number; // 0–1 from 7e's sepsis stage (1 SIRS → 0, 2 sepsis → 0.5, ≥ 3 septic shock → 1)
  doses: OrganDose[]; // this pass's `bus.doses` (mannitol, hypertonic saline; the rest are ignored)
}
/** 7c's seam 7d fills (R51 addendum 14): urine output and the renal excretion rates, mmol/h. */
export type RenalSeam = { uopMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
type BloodLike = {
  core?: { liver?: number; renal?: RenalSeam };
  out?: { hb?: number; albuminGL?: number; bvRel?: number; hbfRel?: number; lactate?: number; gluconate?: number };
```

and replace with:

```ts
  sepsis: number; // 0–1 from 7e's sepsis stage (1 SIRS → 0, 2 sepsis → 0.5, ≥ 3 septic shock → 1)
  doses: OrganDose[]; // this pass's `bus.doses` (mannitol, hypertonic saline; the rest are ignored)
}
/** 7c's seam 7d fills (R51 addendum 14): the urine ABOVE the basal UOP0 (mL/h, G7d follow-through 2) and the renal
 *  excretion rates, mmol/h. */
export type RenalSeam = { uopAboveBasalMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
type BloodLike = {
  core?: { liver?: number; renal?: RenalSeam };
  out?: { hb?: number; albuminGL?: number; bvRel?: number; hbfRel?: number; lactate?: number; gluconate?: number };
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, 
find:

```ts
  const lH = Math.max(0, s.uopMlMin * 60 - UOP0_ML_KG_H * s.p.weightKg) / 1000;
  const na = lH * URINE_NA * (1 + FUROSEMIDE_NA_BOOST * s.furoE);
  const k = lH * URINE_K;
  return { uopMlH: lH * 1000, excretion: { k, na, cl: 0.9 * (na + k), gluconate: ((s.gfr * 60) / 1000) * gluconate * GLUCONATE_EXCRETED } };
}

/** 7g's accepted boluses (R51 §3: 7d OBSERVES, never consumes): mannitol → brain water and osmotic diuresis; hypertonic
```

and replace with:

```ts
  const lH = Math.max(0, s.uopMlMin * 60 - UOP0_ML_KG_H * s.p.weightKg) / 1000;
  const na = lH * URINE_NA * (1 + FUROSEMIDE_NA_BOOST * s.furoE);
  const k = lH * URINE_K;
  return { uopAboveBasalMlH: lH * 1000, excretion: { k, na, cl: 0.9 * (na + k), gluconate: ((s.gfr * 60) / 1000) * gluconate * GLUCONATE_EXCRETED } };
}

/** 7g's accepted boluses (R51 §3: 7d OBSERVES, never consumes): mannitol → brain water and osmotic diuresis; hypertonic
```

In `packages/engine-core/test/l2/organs/pipeline.test.ts` (the existing 7c-present test, re-specified in 7d's gate §10), 
find:

```ts
    const blood = { core: { liver: 1 } as Record<string, unknown>, out: { hb: 14, albuminGL: 42, bvRel: 1, hbfRel: 1, lactate: 2.5, gluconate: 1 } };
    advanceOrgans(os, { ...ctx, blood }, 125 * 2, () => {});
    expect(blood.core.liver).toBeCloseTo(os.liver.liverFn * os.liver.tempF, 9);
    const seam = blood.core.renal as { uopMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
    expect(os.renal.uopMlMin * 60).toBeCloseTo(70, -1); // the kidney makes 1 mL/kg/h × 70 kg at rest …
    expect(seam.uopMlH).toBeCloseTo(Math.max(0, os.renal.uopMlMin * 60 - 70), 9); // … and only the excess leaves 7c's water
    expect(seam.uopMlH).toBeLessThan(10);
    expect(seam.excretion.na).toBeCloseTo((seam.uopMlH / 1000) * 100, 6);
    expect(seam.excretion.gluconate).toBeGreaterThan(5); // GFR 7.5 L/h × 1 mmol/L × 0.9 (exogenous: no basal intake)
    const pk = { bus: { agents: { furosemide: { brain: 1.5 } } } }; // a diuresis: the urine above basal is lost
    advanceOrgans(os, { ...ctx, blood, pk }, 125 * 4, () => {});
    const d = blood.core.renal as { uopMlH: number; excretion: { na: number } };
    expect(d.uopMlH).toBeCloseTo(os.renal.uopMlMin * 60 - 70, 9);
    expect(d.uopMlH).toBeGreaterThan(200);
    expect(d.excretion.na).toBeCloseTo((d.uopMlH / 1000) * 100 * (1 + 0.5 * os.renal.furoE), 6);
    const ev = os.out.filter((e) => e.type === 'organs').pop() as Extract<EngineEvent, { type: 'organs' }>;
    expect(ev.liver.lactate).toBe(2.5);
  });
```

and replace with:

```ts
    const blood = { core: { liver: 1 } as Record<string, unknown>, out: { hb: 14, albuminGL: 42, bvRel: 1, hbfRel: 1, lactate: 2.5, gluconate: 1 } };
    advanceOrgans(os, { ...ctx, blood }, 125 * 2, () => {});
    expect(blood.core.liver).toBeCloseTo(os.liver.liverFn * os.liver.tempF, 9);
    const seam = blood.core.renal as { uopAboveBasalMlH: number; excretion: { k: number; na: number; cl: number; gluconate: number } };
    expect(os.renal.uopMlMin * 60).toBeCloseTo(70, -1); // the kidney makes 1 mL/kg/h × 70 kg at rest …
    expect(seam.uopAboveBasalMlH).toBeCloseTo(Math.max(0, os.renal.uopMlMin * 60 - 70), 9); // … and only the excess leaves 7c's water
    expect(seam.uopAboveBasalMlH).toBeLessThan(10);
    expect(seam.excretion.na).toBeCloseTo((seam.uopAboveBasalMlH / 1000) * 100, 6);
    expect(seam.excretion.gluconate).toBeGreaterThan(5); // GFR 7.5 L/h × 1 mmol/L × 0.9 (exogenous: no basal intake)
    const pk = { bus: { agents: { furosemide: { brain: 1.5 } } } }; // a diuresis: the urine above basal is lost
    advanceOrgans(os, { ...ctx, blood, pk }, 125 * 4, () => {});
    const d = blood.core.renal as { uopAboveBasalMlH: number; excretion: { na: number } };
    expect(d.uopAboveBasalMlH).toBeCloseTo(os.renal.uopMlMin * 60 - 70, 9);
    expect(d.uopAboveBasalMlH).toBeGreaterThan(200);
    expect(d.excretion.na).toBeCloseTo((d.uopAboveBasalMlH / 1000) * 100 * (1 + 0.5 * os.renal.furoE), 6);
    const ev = os.out.filter((e) => e.type === 'organs').pop() as Extract<EngineEvent, { type: 'organs' }>;
    expect(ev.liver.lactate).toBe(2.5);
  });
```

- [x] **Step 5: Run the tests and check no reader is left**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/organs test/l2/blood test/l2/renal && git grep -n uopMlH -- packages apps && npx -y pnpm@9.15.9 -r typecheck`
Expected: PASS — 20 files, 97 tests (prototype); the grep prints exactly one line, the rename note in `core.ts`'s JSDoc;
typecheck clean. Measured by the new test (70 kg, CO 5.25): kidney UOP 72.55 mL/h at rest, seam
`uopAboveBasalMlH` 2.55 mL/h; over 10 min 7c's body water falls 0.37 mL with the seam, 0 with 7c's own fallback
(|Δ| 0.37 < 2); a whole-urine seam (the pre-7d-fix meaning) falls 10.55 mL (probe, not committed).

- [x] **Step 6: Commit**

```bash
git add packages/engine-core/src/l2/blood/core.ts packages/engine-core/src/l2/organs/inputs.ts packages/engine-core/src/l2/organs/pipeline.ts packages/engine-core/test/l2/blood/core.test.ts packages/engine-core/test/l2/organs/pipeline.test.ts
git commit -m "refactor(engine-core): rename the renal seam field uopMlH → uopAboveBasalMlH (FU-3 item 8)

The seam carries only urine ABOVE the basal UOP0 since G7d follow-through 2; the
name now says so. New test pins the meaning on the real 7c core: at rest the seam
is ≈ 0 (2.55 mL/h) and 10 min of body water equals 7c's fallback (0.37 mL apart;
a whole-urine seam would be 10.55 mL short)." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

**Numbers (Task 9).** No band involved. Before: new test FAILS (`undefined`). After: 6/6 in `organs/pipeline.test.ts`,
97/97 across `test/l2/{blood,organs,renal}`; `pnpm -r typecheck` clean. No `it.fails`.

---

### Task 10: `patient.profile` in `pme-scenario/1` and the controller's `engineOptionsOf` (item 9, part 1; 6b)

**Files:**
- Create: `packages/controller/src/scenario/patient.ts`, `packages/controller/test/scenario/profile.test.ts`
- Modify: `packages/controller/scenarios/pme-scenario-1.schema.json`, `packages/controller/src/scenario/types.ts`,
  `packages/controller/src/scenario/index.ts`

**Interfaces:**
- Consumes: the engine's creation-time `EngineOptions.patient: PatientProfile` (`conditions?: ProfileCondition[]`
  — 7a ids `hfref hfpef htn as ar mr ms tr cad betaBlocked rvFailure ph` with 7a's `GRADES`, plus 7d's `tbi
  hepaticFailure aki`; `lungConditions?: LungConditionSpec[]` — 7b's catalogue incl. `pregnancy`, severity 0–1;
  7c `blood`; 7f `neuro`), `LUNG_CONDITION_IDS` (engine-core).
- Produces: `ScenarioProfile` and `ScenarioPatient.profile?` (`types.ts`); `engineOptionsOf(doc: ScenarioDoc, seed =
  1): EngineOptions` exported from `@pme/controller/scenario` (maps the patient block 1:1, incl. `neuro`/`blood`).

**Why:** 8a (gate note Deviation 3) marks 10 documents "not measurable": `sanity-docs.ts` `doc()` strips
`conditions`/`pregnancyWeeks` into a string `ValidationDoc.profile`, and `segments/run.ts` returns early. The engine's
profile API is creation-time only (no runtime "set profile" command; the physiology console recreates the engine with a
preset; the instructor panel has no profile control), so the host applies the scenario's profile when it creates the
engine — like age/weight/sex/baseline today. Condition ids are restricted to those the engine reads at creation: an
event id such as `rvInfarct` is now REJECTED by the schema (`circProfileOf` silently dropped it before — which is how
8a's first run graded t15 on a healthy adult). Every existing scenario file still validates. 7f's `neuro` and 7c's
`blood` were in the schema but never reached the engine; the mapper passes them through.

**Prototype numbers:** `profile.test.ts` 11 of 12 failing before (stub), 12/12 after; the engine's own state shows the
profile (band elderly, cfr 1.4, betaBlock 0.8, lvedpTarget 18, `lungSpecs` pregnancy, `organs.conds` tbi); controller
schema 21, builtins 6, neuro-scenarios 6, runner 18, view 4, replay 4, probability 6, host-scenario 6 green.

- [x] **Step 1: Write the failing test** — create `packages/controller/test/scenario/profile.test.ts`:

```ts
// FU-3 item 9 (G8a ruling, FU-3 addition 9; R22): `patient.profile` in pme-scenario/1 is optional (every existing
// scenario still validates) and maps 1:1 onto the engine's PatientProfile `conditions` (7a circulation, 7d brain/
// organs) and `lungConditions` (7b; pregnancy is the catalogue's `pregnancy`, term = severity 1). The body is fixed
// when the host creates its engine, so `engineOptionsOf` is the one mapping every host uses; the engine reports it.
import { readFileSync, readdirSync } from 'node:fs';
import { createEngine, LUNG_CONDITION_IDS } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import schema from '../../scenarios/pme-scenario-1.schema.json';
import { engineOptionsOf } from '../../src/scenario/patient.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';
import { validateScenario } from '../../src/scenario/validate.ts';

const doc = (patient: Record<string, unknown>) => ({
  schema: 'pme-scenario/1', id: 'p', title: 'P', mode: 'modeled', initialState: 'a', states: [{ id: 'a' }], patient,
}) as unknown as ScenarioDoc;
const errs = (d: unknown) => {
  const r = validateScenario(d);
  if (r.ok) throw new Error('expected invalid');
  return r.errors;
};
const ASCAD = { conditions: [{ id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }, { id: 'htn' }] };

describe('pme-scenario/1 patient.profile (schema)', () => {
  it('accepts circulation/organ conditions with grades and severities, and lung conditions incl. pregnancy', () => {
    const r = validateScenario(doc({ ageY: 75, profile: { ...ASCAD, lungConditions: [{ id: 'pregnancy', severity: 1 }] } }));
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(validateScenario(doc({ profile: { conditions: [{ id: 'tbi', severity: 1 }, { id: 'mr', grade: 'severe', severity: 0.4 }, { id: 'betaBlocked' }] } })).ok).toBe(true);
  });

  it('is optional: every scenario file in scenarios/ still validates', () => {
    const dir = new URL('../../scenarios/', import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !f.endsWith('.schema.json'));
    expect(files.length).toBeGreaterThanOrEqual(11);
    for (const f of files) {
      const r = validateScenario(JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
      expect(r.ok ? [] : r.errors, f).toEqual([]);
    }
  });

  it.each([
    ['an event-only condition (rvInfarct is an applyEvent, not a profile)', { conditions: [{ id: 'rvInfarct' }] }, '/patient/profile/conditions/0/id: must be one of'],
    ['a grade the condition does not have', { conditions: [{ id: 'mr', grade: 'critical' }] }, '/patient/profile/conditions/0/grade: must be one of "mild", "moderate", "severe"'],
    ['severity above 1', { conditions: [{ id: 'hfref', severity: 1.5 }] }, '/patient/profile/conditions/0/severity: must be <= 1'],
    ['a lung condition without severity', { lungConditions: [{ id: 'pregnancy' }] }, '/patient/profile/lungConditions/0: missing required property "severity"'],
    ['an unknown lung condition', { lungConditions: [{ id: 'pregnant', severity: 1 }] }, '/patient/profile/lungConditions/0/id: must be one of'],
    ['an unknown profile key', { pregnancyWeeks: 39 }, '/patient/profile: unexpected property "pregnancyWeeks"'],
  ])('rejects %s', (_, profile, msg) => {
    expect(errs(doc({ profile })).some((e) => e.startsWith(msg))).toBe(true);
  });

  it("the schema's lung condition ids are the engine's catalogue (drift guard)", () => {
    const defs = (schema as unknown as { definitions: Record<string, { properties: { id: { enum: string[] } } }> }).definitions;
    expect(defs.lungCondition?.properties.id.enum).toEqual([...LUNG_CONDITION_IDS]);
  });
});

describe('engineOptionsOf: the scenario patient → the engine at t = 0', () => {
  it('without a profile the options carry exactly the body the hosts passed before (no condition keys)', () => {
    const o = engineOptionsOf(doc({ ageY: 6, weightKg: 20, heightCm: 115, sex: 'F', ageBand: 'paediatric', baseline: { hr: 100 }, sensors: { spo2: 'on' } }), 3);
    expect(o).toEqual({ seed: 3, patient: { ageY: 6, weightKg: 20, heightCm: 115, sex: 'F', baseline: { hr: 100 } }, device: { ageBand: 'paediatric' } });
  });

  it('maps profile.conditions / lungConditions 1:1 and the engine reports them in its state', () => {
    const o = engineOptionsOf(doc({ ageY: 75, profile: { conditions: [...ASCAD.conditions, { id: 'betaBlocked' }, { id: 'tbi', severity: 1 }], lungConditions: [{ id: 'pregnancy', severity: 1 }] } }));
    expect(o.patient?.conditions).toEqual([...ASCAD.conditions, { id: 'betaBlocked' }, { id: 'tbi', severity: 1 }]);
    expect(o.patient?.lungConditions).toEqual([{ id: 'pregnancy', severity: 1 }]);
    const st = (createEngine(o).snapshot().state as { st: Record<string, any> }).st; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(st.hemo.circ.prof.band).toBe('elderly'); // 7a profile: age
    expect(st.hemo.circ.prof.cfr).toBe(1.4); // 7a: CAD severe (tables §1.5 CFR 1.4)
    expect(st.hemo.circ.prof.betaBlock).toBeCloseTo(0.8, 6); // 7a: chronic β-blockade (g_hs ×0.2)
    expect(st.hemo.circ.prof.lvedpTarget).toBe(18); // 7a: severe AS sets LVEDP 18
    expect(st.resp.lungSpecs).toEqual([{ id: 'pregnancy', severity: 1 }]); // 7b: term pregnancy
    expect(st.organs.conds).toContainEqual({ id: 'tbi', severity: 1 }); // 7d: TBI brain parameters
  });

  it('carries 7c blood and 7f neuro (already in the schema) through to the engine', () => {
    const o = engineOptionsOf(doc({ blood: { burns: 0.5 }, neuro: { cholinesterase: 'homozygous', mhSusceptible: true } }));
    expect(o.patient).toEqual({ blood: { burns: 0.5 }, neuro: { cholinesterase: 'homozygous', mhSusceptible: true } });
  });
});
```

- [x] **Step 2: Run it — expect FAIL**

`CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/profile.test.ts`

Expected: `Failed to load url ../../src/scenario/patient.ts … Does the file exist?` (0 tests run). Measured with a
throwing stub `engineOptionsOf`: **11 failed | 1 passed** (only "is optional: every scenario file still validates"
passes before the change — all 11 scenario files in `scenarios/` validate on d525eed; the schema rejects `patient.profile`
as `unexpected property "profile"`).

- [x] **Step 3: Implement** — create `packages/controller/src/scenario/patient.ts`:

```ts
// The scenario's patient body → the engine's creation options (brief §7.4; R22; FU-3 item 9). A pme-scenario/1
// setup batch only sends rhythm, targets and sensors (runner.start): the body — age, size, sex, baseline, the R22
// profile (7a/7d conditions, 7b lung conditions incl. pregnancy), 7c blood and 7f neuro — is fixed when the host
// creates its engine, so every host (the validation segment runner, a demo host) builds it from this one mapping.
import type { EngineOptions, PatientProfile } from '@pme/engine-core';
import type { ScenarioDoc } from './types.ts';

/** EngineOptions for `doc` (engine seed `seed`); keys the document does not set are left out, so defaults apply. */
export function engineOptionsOf(doc: ScenarioDoc, seed = 1): EngineOptions {
  const p = doc.patient ?? {};
  const pr = p.profile ?? {};
  const patient: PatientProfile = {
    ...(p.ageY !== undefined ? { ageY: p.ageY } : {}),
    ...(p.weightKg !== undefined ? { weightKg: p.weightKg } : {}),
    ...(p.heightCm !== undefined ? { heightCm: p.heightCm } : {}),
    ...(p.sex ? { sex: p.sex } : {}),
    ...(p.baseline ? { baseline: p.baseline } : {}),
    ...(p.blood ? { blood: p.blood } : {}),
    ...(p.neuro ? { neuro: p.neuro } : {}),
    ...(pr.conditions ? { conditions: pr.conditions } : {}),
    ...(pr.lungConditions ? { lungConditions: pr.lungConditions } : {}),
  };
  return { seed, patient, device: { ...(p.ageBand ? { ageBand: p.ageBand } : {}), ...(doc.device?.skin ? { skin: doc.device.skin } : {}) } };
}
```


**Modify `packages/controller/scenarios/pme-scenario-1.schema.json`**

Find (verbatim, d525eed):
```
        "sensors": {
          "type": "object",
          "propertyNames": { "$ref": "#/definitions/sensorId" },
          "additionalProperties": { "type": "string" }
        }
      }
    },
    "state": {
```
Replace with:
```
        "sensors": {
          "type": "object",
          "propertyNames": { "$ref": "#/definitions/sensorId" },
          "additionalProperties": { "type": "string" }
        },
        "profile": { "$ref": "#/definitions/profile" }
      }
    },
    "profile": {
      "description": "R22 patient profile (FU-3 item 9), fixed when the host creates the engine and mapped 1:1 onto the engine's PatientProfile: `conditions` (7a circulation: hfref, hfpef, htn, as, ar, mr, ms, tr, cad, betaBlocked, rvFailure, ph; 7d organs: tbi, hepaticFailure, aki) and `lungConditions` (7b catalogue; pregnancy = `pregnancy`, term = severity 1). Acute events (rvInfarct, tamponade, pe, tensionPtx, sepsis, a growing haematoma) are applyEvent commands, not profile.",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "conditions": { "type": "array", "items": { "$ref": "#/definitions/profileCondition" } },
        "lungConditions": { "type": "array", "items": { "$ref": "#/definitions/lungCondition" } }
      }
    },
    "profileCondition": {
      "type": "object",
      "required": ["id"],
      "additionalProperties": false,
      "properties": {
        "id": { "enum": ["hfref", "hfpef", "htn", "as", "ar", "mr", "ms", "tr", "cad", "betaBlocked", "rvFailure", "ph", "tbi", "hepaticFailure", "aki"] },
        "grade": { "type": "string" },
        "severity": { "type": "number", "minimum": 0, "maximum": 1 }
      },
      "allOf": [
        { "if": { "properties": { "id": { "const": "as" } } }, "then": { "properties": { "grade": { "enum": ["mild", "moderate", "severe", "critical"] } } } },
        { "if": { "properties": { "id": { "const": "ms" } } }, "then": { "properties": { "grade": { "enum": ["mild", "moderate", "severe", "verySevere"] } } } },
        { "if": { "properties": { "id": { "enum": ["mr", "ar", "tr"] } } }, "then": { "properties": { "grade": { "enum": ["mild", "moderate", "severe"] } } } },
        { "if": { "properties": { "id": { "const": "cad" } } }, "then": { "properties": { "grade": { "enum": ["none", "stable", "severe", "recentMI"] } } } }
      ]
    },
    "lungCondition": {
      "type": "object",
      "required": ["id", "severity"],
      "additionalProperties": false,
      "properties": {
        "id": {
          "enum": ["ph", "bronchospasm", "asthma", "anaphylaxis", "copd", "ards", "ild", "ssc", "chestWall", "obesity", "pneumonia",
                   "atelectasis", "pulmOedema", "effusion", "ptxSimple", "ptxTension", "haemothorax", "pe", "fatEmbolism", "vae",
                   "aspiration", "olv", "endobronchial", "bpf", "airwayObstruction", "cf", "nmWeakness", "diaphragmParalysis",
                   "pregnancy", "neonatalRds", "covidPneumonitis", "smokeInhalation"]
        },
        "severity": { "type": "number", "minimum": 0, "maximum": 1 },
        "side": { "enum": ["L", "R"] },
        "recruitFrac": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    },
    "state": {
```



**Modify `packages/controller/src/scenario/types.ts`**

Find (verbatim, d525eed):
```
import type { Ramp, StateVar } from '@pme/engine-core';
```
Replace with:
```
import type { BloodProfile, LungConditionSpec, NeuroProfile, ProfileCondition, Ramp, StateVar } from '@pme/engine-core';
```

Find (verbatim, d525eed):
```
  sensors?: Partial<Record<SensorId, string>>;
}

```
Replace with:
```
  sensors?: Partial<Record<SensorId, string>>;
  /** Stage 7f's neuro block and Stage 7c's blood block (in the schema since 7f), passed to the engine as they are. */
  neuro?: NeuroProfile;
  blood?: BloodProfile;
  /** R22 patient profile (FU-3 item 9): the engine's PatientProfile `conditions` and `lungConditions`, 1:1. */
  profile?: ScenarioProfile;
}

/** Chronic conditions of the body (fixed at engine creation). Acute events stay applyEvent commands. */
export interface ScenarioProfile {
  /** 7a circulation (hfref, hfpef, htn, as, ar, mr, ms, tr, cad, betaBlocked, rvFailure, ph) and 7d organs (tbi, hepaticFailure, aki). */
  conditions?: ProfileCondition[];
  /** 7b lung catalogue conditions; pregnancy is `{ id: 'pregnancy', severity }` (term = 1). */
  lungConditions?: LungConditionSpec[];
}

```



**Modify `packages/controller/src/scenario/index.ts`**

Find (verbatim, d525eed):
```
export { BUILTIN_SCENARIOS, BUILTIN_CATALOGUE } from './builtins.ts';

```
Replace with:
```
export { BUILTIN_SCENARIOS, BUILTIN_CATALOGUE } from './builtins.ts';
export { engineOptionsOf } from './patient.ts';

```





- [x] **Step 4: Run — expect PASS**

`CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/profile.test.ts test/scenario/schema.test.ts test/scenario/builtins.test.ts test/scenario/neuro-scenarios.test.ts test/scenario/runner.test.ts test/scenario/host-scenario.test.ts`

Expected (measured): profile 12/12, schema 21/21, builtins 6/6, neuro-scenarios 6/6, runner 18/18, host-scenario 6/6.
`npx -y pnpm@9.15.9 -r typecheck` clean.

- [x] **Step 5: Commit**

```
git add packages/controller/scenarios/pme-scenario-1.schema.json packages/controller/src/scenario/patient.ts packages/controller/src/scenario/types.ts packages/controller/src/scenario/index.ts packages/controller/test/scenario/profile.test.ts
git commit -m "feat(scenario): optional patient.profile in pme-scenario/1, mapped 1:1 onto the engine's PatientProfile (FU-3 item 9)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 11: The validation runner builds the engine through `engineOptionsOf`; the ten profile documents run (item 9, part 2; 8a, E-FU3-6)

**Files:**
- Create: `packages/validation/test/segments/profile-docs.test.ts`
- Modify: `packages/validation/src/segments/run.ts`, `packages/validation/src/segments/types.ts`,
  `packages/validation/suites/sanity/sanity-docs.ts` (8a's document data — E-FU3-6),
  `packages/validation/test/segments/sanity-docs.test.ts`

**Interfaces:**
- Consumes: Task 10's `engineOptionsOf` (`@pme/controller/scenario`); 7e's `applyEvent { kind: 'condition', condition:
  'sepsis', phase: 'warm' }` (t16 — refused on a base without 7e); 7a's `condition rvInfarct`; 7d's `brain
  massRateMlPerMin`.
- Produces: `ValidationDoc` without the `profile` string; `runValidationDoc` grades profile documents on their own
  patient.

**Why:** see Task 10. Seven documents only needed the profile block; three named an engine EVENT, not a profile, and get
a t = 0 action instead (E-FU3-6, for the reviewer): t15 `condition rvInfarct 1`; t16 7e's `condition sepsis 1` phase
`warm`; t19 profile tbi 1 + `brain massRateMlPerMin 1` (tables §7 19 "1 mL/min"). t22 stays not measurable: no stage
owns an `applyEvent neuraxial` (Q-FU3-9b). Rows are REPORTED, not tuned: the test asserts the documents run and grade
every target, not the grades.

**Prototype rows (d525eed; t16 on d525eed + 7e `ba2d3ac`, a throwaway merge):**

| doc | row | measured | band | grade |
|---|---|---|---|---|
| t10 AS+CAD+HTN, propofol | base MAP / MAP at 2 min / rescue MAP max | 110.6 / 101.6 / 127.8 | 60–110 / 60–65 / > 85 | 🟡 🔴 🟢 |
| t11 chronic MR + 1.5 L | PCWP / SpO2 | 24.8 / 96.0 | > 25 / 89–92 | 🟡 🟡 |
| t15 RV infarct | CVP / PCWP / MAP | 6.8 / 3.1 / 85.4 | 14–18 / 8–12 / 60–70 | 🔴 🔴 🟡 |
| t16 septic shock warm (7e) | MAP / HR | 87.0 / 75.0 | 55–60 / 115–130 | 🔴 🔴 |
| t17b class III, β-blocker | HR / SBP | 75.0 / 101.7 | 80–95 / 65–80 | 🟡 🟡 |
| t18 HTN 75 y, hypocapnia | EtCO2 | 23.4 | 20–28 | 🟢 |
| t19 TBI, haematoma 1 mL/min | HR min | 75.0 | < 60 | 🟡 |
| t20 HFrEF + dobutamine | MAP | 84.1 | 68–76 | 🟡 |
| t22 term pregnancy, spinal | — (`applyEvent neuraxial` refused) | — | MAP 60–65 | not measurable |
| t23 term pregnancy, GA apnoea | time to SpO2 90 % | 286 s | 150–240 s | 🟡 |

HR reads exactly 75.0 in t16, t17b and t19 because the harness holds it (every document's `baseline.hr 75` becomes
`setTarget hr` after `setMode modeled`, which FU-2's rate rule treats as an instructor-held rate) — Q-FU3-9a. Validation
suites: `profile-docs` + the rewritten 8a `sanity-docs` test 14 passed on a 7e base (11 of 14 failed before), ≈ 220 s.

Before Step 1 run `git fetch origin && git merge origin/main` (7e must be on the branch for t16).

- [x] **Step 0: Precondition — is 7e's `condition sepsis` on the base?** (R50 finding 2, ruling R-3)

```bash
git grep -q "'sepsis'" -- packages/engine-core/src/l2/endo && echo "7e present" || echo "7e ABSENT"
```

"7e present": Steps 1–5 as written; tick Step 3b as *not needed*. "7e ABSENT" (7e not merged yet): do Steps 1–5 AND
Step 3b — t16 keeps its `patient`/actions edit in `sanity-docs.ts` but its row in `profile-docs.test.ts` becomes
`it.fails` with the measured refusal in its title, and it flips back to `it` when 7e lands (tick the line "t16
restored" in the gate note then). No band, tolerance or document row changes either way.

- [x] **Step 1: Write the failing tests** — create `packages/validation/test/segments/profile-docs.test.ts`:

```ts
// FU-3 item 9 (G8a ruling, FU-3 addition 9): the ten documents Stage 8a listed as NOT MEASURABLE (gate note
// Deviation 3: a patient profile pme-scenario/1 could not carry) now run on their own patient through
// `patient.profile` (chronic conditions) and t = 0 actions (acute events). This asserts that they RUN and grade every
// target — not that the rows are green: a red row is a calibration row (R44/R45), queued like any other.
import { describe, expect, it } from 'vitest';
import { SANITY_DOCS } from '../../suites/sanity/sanity-docs.ts';
import { runValidationDoc } from '../../src/segments/run.ts';

const PROFILE_DOCS = [
  't10-as-cad-propofol', 't11-chronic-mr-fluid', 't15-rv-infarct', 't16-septic-shock-warm', 't17b-class3-bb',
  't18-htn-hypocapnia-cbf', 't19-tbi-haematoma', 't20-low-flow-oliguria', 't22-term-spinal', 't23-term-apnoea',
];
/** A command no stage implements yet (decision 8), by document: `neuraxial` (spinal level) has no owner in 7a–7g. */
const STILL_REFUSED: Record<string, RegExp> = { 't22-term-spinal': /^applyEvent neuraxial$/ };

describe('profile documents run on their own patient (FU-3 item 9)', { timeout: 900_000 }, () => {
  it.each(PROFILE_DOCS)('%s: no "patient profile" refusal; every target graded', async (id) => {
    const d = SANITY_DOCS.find((x) => x.id === id);
    if (!d) throw new Error(`no document ${id}`);
    const r = await runValidationDoc(d);
    for (const x of r.results) console.log(`${x.grade} | ${id} / ${x.segment} / ${x.target} | ${x.measured.toFixed(1)} | ${x.expected}`);
    const refused = STILL_REFUSED[id];
    expect(r.unsupported.filter((u) => !refused?.test(u.type))).toEqual([]);
    if (refused) return expect(r.measurable).toBe(false);
    expect(r.measurable).toBe(true);
    expect(r.results.map((x) => `${x.segment}/${x.target}`)).toEqual(d.segments.flatMap((s) => s.targets.map((t) => `${s.id}/${t.id}`)));
  });
});
```

and replace 8a's NOT-MEASURABLE test in `packages/validation/test/segments/sanity-docs.test.ts` (the two
`sanity-docs.test.ts` blocks under "Modify" in Step 3 — apply them now, before the implementation).

- [x] **Step 2: Run — expect FAIL**

`CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/profile-docs.test.ts test/segments/sanity-docs.test.ts`

Expected (measured): **11 failed | 3 passed** — each of the ten documents: `expected [ { t: +0, …(2) } ] to deeply equal []`
with `type: "patient profile"`, reason e.g. `conditions ["aorticStenosis","cad3v","htn"]: not expressible in
pme-scenario/1 until the R22 profile schema lands`; the structural test: `expected [] to deeply equal [ 't10-as-cad-propofol', …(7) ]`.

- [x] **Step 3: Implement** (find/replace, verbatim):

**Modify `packages/validation/src/segments/run.ts`**

Find (verbatim, d525eed):
```
import { BUILTIN_SCENARIOS, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
```
Replace with:
```
import { BUILTIN_SCENARIOS, engineOptionsOf, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
```

Find (verbatim, d525eed):
```
  if (doc.profile) {
    const unsupported = [{ t: 0, type: 'patient profile', reason: `${doc.profile}: not expressible in pme-scenario/1 until the R22 profile schema lands` }];
    return { doc, measurable: false, unsupported, results: [], store: new SeriesStore(), wallMs: performance.now() - t0, notes: [] };
  }
  const raw
```
Replace with:
```
  const raw
```

Find (verbatim, d525eed):
```
  // The body (age, size, sex, age band, baseline) is fixed when the engine is created — a scenario's setup batch only
  // sends rhythm, targets and sensors (Stage 6b runner.start), so the host builds its engine from `patient` first
  // (measured while planning: without this a 4-year-old desaturated like a room-air adult, 47 s instead of ≈ 160 s).
  const p = v.doc.patient ?? {};
  const engine = createEngine({
    seed: doc.seed ?? 1,
    patient: { ...(p.ageY !== undefined ? { ageY: p.ageY } : {}), ...(p.weightKg !== undefined ? { weightKg: p.weightKg } : {}), ...(p.heightCm !== undefined ? { heightCm: p.heightCm } : {}), ...(p.sex ? { sex: p.sex } : {}), ...(p.baseline ? { baseline: p.baseline } : {}) },
    device: { ...(p.ageBand ? { ageBand: p.ageBand } : {}), ...(v.doc.device?.skin ? { skin: v.doc.device.skin } : {}) },
  });

```
Replace with:
```
  // The body (age, size, sex, age band, baseline, and the R22 profile: conditions, lung conditions incl. pregnancy) is
  // fixed when the engine is created — a scenario's setup batch only sends rhythm, targets and sensors (Stage 6b
  // runner.start), so the host builds its engine from `patient` first (measured while planning: without this a
  // 4-year-old desaturated like a room-air adult, 47 s instead of ≈ 160 s). FU-3 item 9: one mapping, the controller's.
  const engine = createEngine(engineOptionsOf(v.doc, doc.seed ?? 1));

```



**Modify `packages/validation/src/segments/types.ts`**

Find (verbatim, d525eed):
```
  /** Informational: the stages whose modules the document needs (e.g. ["7a", "7g"]). */
  requires?: string[];
  /** A patient profile (Stage 7 conditions, pregnancy) that pme-scenario/1 cannot carry yet (R22). Present → the
   *  document is NOT MEASURABLE: run on the default patient it would grade the wrong patient. */
  profile?: string;
}
```
Replace with:
```
  /** Informational: the stages whose modules the document needs (e.g. ["7a", "7g"]). The patient profile (R22:
   *  conditions, pregnancy) rides in the scenario's `patient.profile` (FU-3 item 9). */
  requires?: string[];
}
```



**Modify `packages/validation/test/segments/sanity-docs.test.ts`**

Find (verbatim, d525eed):
```
import { runValidationDoc } from '../../src/segments/run.ts';

```
Replace with:
```

```

Find (verbatim, d525eed):
```
  it('a document whose patient profile pme-scenario/1 cannot carry is NOT MEASURABLE, never graded on the default patient', async () => {
    const d = SANITY_DOCS.find((x) => x.id === 't16-septic-shock-warm');
    expect(d?.profile).toBe('conditions ["sepsisWarm"]');
    const r = await runValidationDoc(d as NonNullable<typeof d>);
    expect(r.measurable).toBe(false);
    expect(r.results).toEqual([]);
    expect(r.unsupported[0]?.type).toBe('patient profile');
  });
});

```
Replace with:
```
  it('profile documents carry their patient in pme-scenario/1 patient.profile (FU-3 item 9), never only in notes', () => {
    const withProfile = SANITY_DOCS.filter((d) => (d.scenario as { patient?: { profile?: unknown } }).patient?.profile).map((d) => d.id);
    expect(withProfile).toEqual(['t10-as-cad-propofol', 't11-chronic-mr-fluid', 't17b-class3-bb', 't18-htn-hypocapnia-cbf', 't19-tbi-haematoma', 't20-low-flow-oliguria', 't22-term-spinal', 't23-term-apnoea']);
    for (const d of SANITY_DOCS) expect(JSON.stringify(d), d.id).not.toMatch(/R22 profile|"profile":"/);
  });
});

```



**Modify `packages/validation/suites/sanity/sanity-docs.ts`**

Find (verbatim, d525eed):
```
  // Stage 7 profile fields (conditions, pregnancyWeeks) are not in pme-scenario/1 yet: they travel in `notes` and in
  // `profile` until the R22 profile schema lands; `profile` makes the document not measurable (the runner would
  // otherwise grade the default patient: first full run, t15 RV infarct read CVP 4.4 / MAP 92, the healthy adult).
  const { conditions, pregnancyWeeks, ...patient } = (o.patient ?? {}) as Record<string, unknown>;
  const profile = [conditions ? `conditions ${JSON.stringify(conditions)}` : '', pregnancyWeeks ? `pregnancy ${String(pregnancyWeeks)} weeks` : ''].filter(Boolean).join('; ');
  return {
    schema: 'pme-validation/1', id: o.id, title: o.title, seed: 1, durationS: o.durationS,
    ...(o.requires ? { requires: o.requires } : {}), ...(profile ? { profile } : {}),
    scenario: {
      schema: 'pme-scenario/1', id: `val-${o.id}`, title: o.title, ...(o.mode ? { mode: o.mode } : {}), ...(profile ? { notes: `R22 profile: ${profile}` } : {}),
      patient: { ...ADULT, sensors: SENSORS, baseline: { hr: 75, sbp: 120, dbp: 70, ...o.baseline }, ...patient },
```
Replace with:
```
  // The R22 profile rides in `patient.profile` (FU-3 item 9): chronic conditions (7a/7d) and lung conditions (7b,
  // pregnancy) build the engine; acute ones (RV infarct, sepsis, a growing haematoma) are t = 0 actions. Before, such
  // documents were not measurable (the first 8a run graded t15 RV infarct on the healthy adult: CVP 4.4 / MAP 92).
  return {
    schema: 'pme-validation/1', id: o.id, title: o.title, seed: 1, durationS: o.durationS,
    ...(o.requires ? { requires: o.requires } : {}),
    scenario: {
      schema: 'pme-scenario/1', id: `val-${o.id}`, title: o.title, ...(o.mode ? { mode: o.mode } : {}),
      patient: { ...ADULT, sensors: SENSORS, baseline: { hr: 75, sbp: 120, dbp: 70, ...o.baseline }, ...o.patient },
```

Find (verbatim, d525eed):
```
    patient: { ageY: 75, conditions: ['aorticStenosis', 'cad3v', 'htn'] }, baseline: { sbp: 150, dbp: 80 },
```
Replace with:
```
    patient: { ageY: 75, profile: { conditions: [{ id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }, { id: 'htn' }] } }, baseline: { sbp: 150, dbp: 80 },
```

Find (verbatim, d525eed):
```
    patient: { conditions: ['mitralRegurgitationChronic'] },
```
Replace with:
```
    patient: { profile: { conditions: [{ id: 'mr', grade: 'severe', severity: 0.4 }] } }, // severe, severity < 0.5 = 7a's chronic big LA
```

Find (verbatim, d525eed):
```
    patient: { conditions: ['rvInfarct'] },
    actions: [],
```
Replace with:
```
    actions: [at(0, ev({ kind: 'condition', id: 'rvInfarct', severity: 1 }))],
```

Find (verbatim, d525eed):
```
    patient: { conditions: ['sepsisWarm'] }, actions: [],
```
Replace with:
```
    actions: [at(0, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm' }))],
```

Find (verbatim, d525eed):
```
    patient: { conditions: ['betaBlockerChronic'] },
```
Replace with:
```
    patient: { profile: { conditions: [{ id: 'betaBlocked' }] } },
```

Find (verbatim, d525eed):
```
    patient: { ageY: 75, conditions: ['htn'] }, actions:
```
Replace with:
```
    patient: { ageY: 75, profile: { conditions: [{ id: 'htn' }] } }, actions:
```

Find (verbatim, d525eed):
```
    patient: { conditions: ['tbiHaematoma'] }, actions: [],
```
Replace with:
```
    patient: { profile: { conditions: [{ id: 'tbi', severity: 1 }] } }, actions: [at(0, ev({ kind: 'brain', massRateMlPerMin: 1 }))],
```

Find (verbatim, d525eed):
```
    patient: { conditions: ['hfref'] }, actions:
```
Replace with:
```
    patient: { profile: { conditions: [{ id: 'hfref' }] } }, actions:
```

Find (verbatim, d525eed):
```
    patient: { ageY: 30, sex: 'F', pregnancyWeeks: 39 }, baseline: { sbp: 125, dbp: 75 },
```
Replace with:
```
    patient: { ageY: 30, sex: 'F', profile: { lungConditions: [{ id: 'pregnancy', severity: 1 }] } }, baseline: { sbp: 125, dbp: 75 }, // 39 wk = term
```

Find (verbatim, d525eed):
```
    patient: { ageY: 30, sex: 'F', weightKg: 80, heightCm: 165, pregnancyWeeks: 39 },
```
Replace with:
```
    patient: { ageY: 30, sex: 'F', weightKg: 80, heightCm: 165, profile: { lungConditions: [{ id: 'pregnancy', severity: 1 }] } }, // 39 wk = term
```




- [x] *(applied while 7e was absent; removed after 7e merged, `a6bf4f0`)* **Step 3b (only if Step 0 printed "7e ABSENT"): pin t16 as an expected failure** — in the file created in
Step 1, `packages/validation/test/segments/profile-docs.test.ts`, find:

```ts
describe('profile documents run on their own patient (FU-3 item 9)', { timeout: 900_000 }, () => {
  it.each(PROFILE_DOCS)('%s: no "patient profile" refusal; every target graded', async (id) => {
```

replace with:

```ts
/** FU-3 Task 11 Step 3b (R50 review finding 2): this base has no 7e `condition sepsis`, so t16 is an expected failure
 * with the measured refusal in its title. When 7e lands: delete this constant and the `it.fails`, and restore
 * `it.each(PROFILE_DOCS)` (t16 then runs like the other nine). */
const WAITS_FOR_7E = 't16-septic-shock-warm';
describe('profile documents run on their own patient (FU-3 item 9)', { timeout: 900_000 }, () => {
  it.fails(`${WAITS_FOR_7E}: needs 7e condition sepsis — measured unsupported: [{ t: 0.1, type: "applyEvent condition", reason: "condition sepsis arrives in Stage 7" }]`, async () => {
    const d = SANITY_DOCS.find((x) => x.id === WAITS_FOR_7E);
    if (!d) throw new Error(`no document ${WAITS_FOR_7E}`);
    const r = await runValidationDoc(d);
    console.log(`${WAITS_FOR_7E} unsupported: ${JSON.stringify(r.unsupported)}`);
    expect(r.unsupported).toEqual([]);
    expect(r.measurable).toBe(true);
  });
  it.each(PROFILE_DOCS.filter((x) => x !== WAITS_FOR_7E))('%s: no "patient profile" refusal; every target graded', async (id) => {
```

Step 4's expectation then reads **14 passed** of which t16 as an expected failure (the log line prints the refusal —
copy it into the gate note).

- [x] **Step 4: Run — expect PASS**

`CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/segments/profile-docs.test.ts test/segments/sanity-docs.test.ts`

Expected on the plan base (7e merged): **14 passed**, ≈ 220 s wall (t11 60 s, t20 63 s, t17b 47 s, t19 19 s, others
< 10 s; the file carries a 900 s describe timeout; each run yields once per sim-minute inside `runValidationDoc`).
On d525eed (no 7e) t16 fails with `unsupported: [{ t: 0.1, type: "applyEvent condition", reason: "condition sepsis
arrives in Stage 7" }]` and the other 13 pass (measured). t16 was measured passing on a throwaway merge of
d525eed + prototype + origin/stage-7e-endocrine-thermal `ba2d3ac` (3 union conflicts in engine.ts/index.ts/types.ts):
1 passed, 18 s. Then the siblings: `… exec vitest run test/segments/run.test.ts test/segments/gate-docs.test.ts
test/segments/grade.test.ts test/report test/oracle` → 12 + 6 passed (7 skipped: Pulse absent) (measured).

- [x] **Step 5: Commit**

```
git add packages/validation/src/segments/run.ts packages/validation/src/segments/types.ts packages/validation/suites/sanity/sanity-docs.ts packages/validation/test/segments/profile-docs.test.ts packages/validation/test/segments/sanity-docs.test.ts
git commit -m "feat(validation): profile documents run on their own patient via patient.profile (FU-3 item 9; 8a Deviation 3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 12: 8a adopts 7c's Pulse blood oracle — one loader, one variable, the O13b baseline fix (item 10; 8a)

**Files:**
- Create: `packages/validation/src/oracle/blood-scenarios.ts` (7c's `scratch/7c-oracle/blood-scenarios.ts`, adopted,
  with the harness moved out of the test into `runBloodOracle`), `packages/validation/test/oracle-blood.test.ts`
- Delete: `packages/validation/src/oracle/pulse-runner.ts`
- Modify: `packages/validation/src/oracle/compare.ts` (the `row` parameter type), `packages/validation/test/oracle.test.ts`,
  `packages/validation/test/oracle-renal.test.ts` (loader + variable), `docs/validation/README.md`
- Not adopted: 7c's `pulse-node-shim.ts` (8a's `loadPulse` already does the same). `projects/patient-monitor-engine/
  scratch/7c-oracle/` (outside the repo) can go to `_to_delete/` after the merge.

**Interfaces:**
- Consumes: 8a's `pulse-node.ts` (`pulseDir()` → `PME_PULSE_DIR`, `loadPulse`, `PULSE_REQUESTS`, `PulseOracle`),
  `compareRow` (`compare.ts`), engine-core `createEngine`.
- Produces: `BLOOD_ORACLE: BloodOracleScenario[]` (O2b, O3b, O10b, O13b), `PULSE_BLOOD`, `runBloodOracle(sc, pulse:
  Pick<PulseOracle, 'step' | 'pull' | 'act'>)`, types `BloodChannel`, `BloodOracleRow`, `BloodOracleScenario`,
  `BloodOracleResult`; `compareRow(row: Pick<OracleRow, 'tol' | 'expect'>, …)`.

**Why:** (1) two loaders and two variables — 8a's `pulse-node.ts` (`PME_PULSE_DIR`) beside 7a's older `pulse-runner.ts`
(`PULSE_ORACLE_DIR`), which 7a's O1–O5 and 7d's O11 still used; `PULSE_REQUESTS` equals `research/pulse-spike/bench/
drm_names.json` name for name, so the old runner is redundant; nothing outside those two test files reads
`PULSE_ORACLE_DIR` (not CI, not a script, not research) — no alias. (2) O13b baseline after the dose (7c gate §4): OUR
actions were dispatched up front with `atTick = tS × 50`, so an action at `baselineS` 60 s applied before the baseline
`labs` panel was read — O13b's "baseline" Na was post-bolus (143 vs 140) and its ΔNa −2.00 was the decay; now our
actions are dispatched inside the stepping loop exactly when Pulse's are (after both baselines). (3) the README's
relative `PME_PULSE_DIR` silently skipped (pnpm runs in `packages/validation`) — documented absolute. Deliberate
deviations from 7c's copy: our engine runs MODELED like 8a's O2/O4 and 7d's O11 (7c ran MANUAL), and a Pulse `act`
rejection throws.

**Prototype numbers (local Pulse 4.3.2, ours MODELED, 1,035 s wall):** O2b BV −956 vs −988 agree, Hb −0.50 vs −0.36
agree, lactate +0.50 vs +0.06 (expect-differ D2, now INSIDE tolerance 0.5 → pinned `fail`, Step 12); O3b Hb −1.50 vs −2.48
(expect-differ D10, inside tolerance 1.24 → pinned `fail`; 7c alone gave −0.50: 7d's kidney now keeps more of the litre),
BE −0.70 vs −0.01 still differs, Na agrees; O10b K −0.90 vs −0.11 still differs; O13b ΔNa +1.00 vs +1.63 (was −2.00;
the row stays excluded). Without the variable, or with a bad path, the oracle tests skip cleanly (3 passed, 4 skipped).

- [x] **Step 1: One loader and one variable for the stage oracles** — edits in three files, then one delete.


In `packages/validation/src/oracle/compare.ts`, 
find:

```ts
import type { OracleRow } from './scenarios.ts';
/** agree: |ours − pulse| ≤ tol·max(1, |pulse|); expect-differ: must be OUTSIDE (a Pulse fix is then noticed). */
export function compareRow(ours: number, pulse: number, row: OracleRow): 'agree' | 'expect-differ-ok' | 'excluded' | 'fail' {
  if (row.expect === 'exclude') return 'excluded';
  const inside = Math.abs(ours - pulse) <= row.tol * Math.max(1, Math.abs(pulse));
  if (row.expect === 'agree') return inside ? 'agree' : 'fail';
```

and replace with:

```ts
import type { OracleRow } from './scenarios.ts';
/** agree: |ours − pulse| ≤ tol·max(1, |pulse|); expect-differ: must be OUTSIDE (a Pulse fix is then noticed). */
export function compareRow(ours: number, pulse: number, row: Pick<OracleRow, 'tol' | 'expect'>): 'agree' | 'expect-differ-ok' | 'excluded' | 'fail' {
  if (row.expect === 'exclude') return 'excluded';
  const inside = Math.abs(ours - pulse) <= row.tol * Math.max(1, Math.abs(pulse));
  if (row.expect === 'agree') return inside ? 'agree' : 'fail';
```

In `packages/validation/test/oracle.test.ts`, 
find:

```ts
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse } from '../src/oracle/pulse-runner.ts';
import { ORACLE_SCENARIOS } from '../src/oracle/scenarios.ts';

const DIR = process.env.PULSE_ORACLE_DIR;
const PULSE_KEYS = { hr: 'HeartRate(1/min)', map: 'MeanArterialPressure(mmHg)', co: 'CardiacOutput(L/min)', cvp: 'MeanCentralVenousPressure(mmHg)', pcwp: 'PulmonaryCapillariesWedgePressure(mmHg)' } as const;

describe.skipIf(!DIR)('Pulse oracle O1–O5 (annex §D; set PULSE_ORACLE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of ORACLE_SCENARIOS) {
    it(`${sc.id}`, async () => {
      const p = await loadPulse(DIR as string, join(DIR as string, '../bench/drm_names.json'));
      const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
      const ev: EngineEvent[] = [];
      e.on((x) => ev.push(x));
```

and replace with:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, pulseDir } from '../src/oracle/pulse-node.ts';
import { ORACLE_SCENARIOS } from '../src/oracle/scenarios.ts';

const DIR = pulseDir();
const PULSE_KEYS = { hr: 'HeartRate(1/min)', map: 'MeanArterialPressure(mmHg)', co: 'CardiacOutput(L/min)', cvp: 'MeanCentralVenousPressure(mmHg)', pcwp: 'PulmonaryCapillariesWedgePressure(mmHg)' } as const;

describe.skipIf(!DIR)('Pulse oracle O1–O5 (annex §D; set PME_PULSE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of ORACLE_SCENARIOS) {
    it(`${sc.id}`, async () => {
      const p = await loadPulse(DIR as string);
      const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
      const ev: EngineEvent[] = [];
      e.on((x) => ev.push(x));
```

find:

```ts
          t += 1;
          if (t % 60 === 0) await new Promise((r) => setImmediate(r));
        }
        pulseAt[at] = p.read();
        e.advanceTo(at);
      }
      const ours = (at: number, k: keyof typeof PULSE_KEYS) => {
```

and replace with:

```ts
          t += 1;
          if (t % 60 === 0) await new Promise((r) => setImmediate(r));
        }
        pulseAt[at] = p.pull();
        e.advanceTo(at);
      }
      const ours = (at: number, k: keyof typeof PULSE_KEYS) => {
```

In `packages/validation/test/oracle-renal.test.ts`, 
find:

```ts
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse } from '../src/oracle/pulse-runner.ts';
import { RENAL_ORACLE } from '../src/oracle/renal-scenarios.ts';
import type { OracleRow } from '../src/oracle/scenarios.ts';

const DIR = process.env.PULSE_ORACLE_DIR;
const KG = 77.1; // Pulse StandardMale
const PULSE_KEYS = { uop: 'UrineProductionRate(mL/min)', map: 'MeanArterialPressure(mmHg)' } as const;

```

and replace with:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, pulseDir } from '../src/oracle/pulse-node.ts';
import { RENAL_ORACLE } from '../src/oracle/renal-scenarios.ts';

const DIR = pulseDir();
const KG = 77.1; // Pulse StandardMale
const PULSE_KEYS = { uop: 'UrineProductionRate(mL/min)', map: 'MeanArterialPressure(mmHg)' } as const;

```

find:

```ts
  });
});

describe.skipIf(!DIR)('Pulse oracle O11 — renal hypotension (set PULSE_ORACLE_DIR=…/research/pulse-spike/web)', () => {
  it('O11', async () => {
    const sc = RENAL_ORACLE;
    const p = await loadPulse(DIR as string, join(DIR as string, '../bench/drm_names.json'));
    const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: KG, heightCm: 180, baseline: { hr: 72 } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x), ['organs']);
```

and replace with:

```ts
  });
});

describe.skipIf(!DIR)('Pulse oracle O11 — renal hypotension (set PME_PULSE_DIR=…/research/pulse-spike/web)', () => {
  it('O11', async () => {
    const sc = RENAL_ORACLE;
    const p = await loadPulse(DIR as string);
    const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: KG, heightCm: 180, baseline: { hr: 72 } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x), ['organs']);
```

find:

```ts
        t += 1;
        if (t % 60 === 0) await new Promise((r) => setImmediate(r));
      }
      pulseAt[at] = p.read();
      e.advanceTo(at);
    }
    const ours = (at: number, k: keyof typeof PULSE_KEYS) => {
```

and replace with:

```ts
        t += 1;
        if (t % 60 === 0) await new Promise((r) => setImmediate(r));
      }
      pulseAt[at] = p.pull();
      e.advanceTo(at);
    }
    const ours = (at: number, k: keyof typeof PULSE_KEYS) => {
```

find:

```ts
      const k = PULSE_KEYS[row.channel];
      const o = row.metric === 'abs' ? ours(row.atS, row.channel) : ours(row.atS, row.channel) - ours(sc.baselineS, row.channel);
      const pv = row.metric === 'abs' ? pulseAt[row.atS]![k]! : pulseAt[row.atS]![k]! - pulseAt[sc.baselineS]![k]!;
      const verdict = compareRow(o, pv, row as unknown as OracleRow); // compareRow reads tol/expect only
      console.log(`O11 ${row.channel} ${row.metric} @${row.atS}s: ours ${o.toFixed(3)} pulse ${pv.toFixed(3)} → ${verdict}${row.note ? ` (${row.note})` : ''}`);
      verdicts.push(verdict);
    }
```

and replace with:

```ts
      const k = PULSE_KEYS[row.channel];
      const o = row.metric === 'abs' ? ours(row.atS, row.channel) : ours(row.atS, row.channel) - ours(sc.baselineS, row.channel);
      const pv = row.metric === 'abs' ? pulseAt[row.atS]![k]! : pulseAt[row.atS]![k]! - pulseAt[sc.baselineS]![k]!;
      const verdict = compareRow(o, pv, row);
      console.log(`O11 ${row.channel} ${row.metric} @${row.atS}s: ours ${o.toFixed(3)} pulse ${pv.toFixed(3)} → ${verdict}${row.note ? ` (${row.note})` : ''}`);
      verdicts.push(verdict);
    }
```

Then delete the second loader: `git rm packages/validation/src/oracle/pulse-runner.ts`.


- [x] **Step 2: Create `packages/validation/src/oracle/blood-scenarios.ts`** (7c's `scratch/7c-oracle/blood-scenarios.ts` with the harness moved in from its test; loads nothing itself):


```ts
// Stage 7c Pulse oracle scenarios (annex §D O2, O3, O10 + a bicarbonate bolus), blood-chemistry channels only.
// Expected disagreements are ENCODED (annex §C): a Pulse fix then shows up as a failing `expect-differ` row.
// Compare TRUTH (our `labs` event) with Pulse data requests (pulse-node.ts PULSE_REQUESTS); K in mg/L (D14).
// Adopted from 7c's uncommitted copy (FU-3 item 10): loads Pulse through pulse-node.ts (7c's Node shim is the same
// three globals + local fetch), compares with compare.ts, and runs our engine MODELED like O2/O4/O11.
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { compareRow } from './compare.ts';
import type { PulseOracle, PulseRequest } from './pulse-node.ts';

export type BloodChannel = 'ph' | 'be' | 'lactate' | 'hb' | 'k' | 'na' | 'bv';
export interface BloodOracleRow {
  channel: BloodChannel;
  metric: 'abs' | 'delta';
  tol: number; // relative, of max(1, |pulse|)
  expect: 'agree' | 'expect-differ' | 'exclude';
  note: string;
}
export interface BloodOracleScenario {
  id: 'O2b' | 'O3b' | 'O10b' | 'O13b';
  baselineS: number;
  compareAtS: number;
  pulse: { tS: number; json: string }[];
  ours: { tS: number; event: Record<string, unknown> }[];
  rows: BloodOracleRow[];
}

/** Pulse data-request names for each channel, and the conversion to our units. */
export const PULSE_BLOOD: Record<BloodChannel, { key: PulseRequest; toOurs: (v: number) => number }> = {
  ph: { key: 'BloodPH', toOurs: (v) => v },
  be: { key: 'BaseExcess(mmol/L)', toOurs: (v) => v },
  lactate: { key: 'Lactate-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 89.07 },
  hb: { key: 'Hemoglobin-BloodConcentration(g/dL)', toOurs: (v) => v },
  k: { key: 'Potassium-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 39.098 }, // TRUE mmol/L (D14: never Pulse's 31.1)
  na: { key: 'Sodium-BloodConcentration(mg/dL)', toOurs: (v) => (v * 10) / 22.99 },
  bv: { key: 'BloodVolume(mL)', toOurs: (v) => v },
};

const act = (a: Record<string, unknown>) => JSON.stringify({ AnyAction: [{ PatientAction: a }] });
// Pulse's CDM field is `FlowRate` (the spike used `Severity`); an unknown field makes ProcessActions return false, which
// the harness throws on — Stage 7a's O2 draft used `Flow` (request to 7a).
const bleed = (mlPerMin: number) => act({ Hemorrhage: { Compartment: 'RightLeg', FlowRate: { ScalarVolumePerTime: { Value: mlPerMin, Unit: 'mL/min' } } } });
const saline = act({ SubstanceCompoundInfusion: { SubstanceCompound: 'Saline', BagVolume: { ScalarVolume: { Value: 1000, Unit: 'mL' } }, Rate: { ScalarVolumePerTime: { Value: 33.3, Unit: 'mL/min' } } } });
const bolus = (sub: string, conc: number, unit: string, ml: number) =>
  act({ SubstanceBolus: { AdministrationRoute: 'Intravenous', Substance: sub, Concentration: { ScalarMassPerVolume: { Value: conc, Unit: unit } }, Dose: { ScalarVolume: { Value: ml, Unit: 'mL' } } } });

export const BLOOD_ORACLE: BloodOracleScenario[] = [
  {
    id: 'O2b', baselineS: 60, compareAtS: 60 + 1800,
    pulse: [{ tS: 60, json: bleed(110) }, { tS: 660, json: bleed(0) }],
    ours: [{ tS: 60, event: { kind: 'bleed', volumeMl: 1100, overS: 600 } }],
    rows: [
      { channel: 'bv', metric: 'delta', tol: 0.25, expect: 'agree', note: '−1100 mL less refill' },
      { channel: 'hb', metric: 'delta', tol: 0.5, expect: 'agree', note: 'refill dilution; small numbers' },
      { channel: 'lactate', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D2: Pulse flat (anaerobic only below tissue PO2 40, renal-only clearance)' },
      { channel: 'ph', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'D1/D3 root cause: fixed SID; reported only' },
    ],
  },
  {
    id: 'O3b', baselineS: 60, compareAtS: 60 + 3600,
    pulse: [{ tS: 60, json: saline }],
    ours: [{ tS: 60, event: { kind: 'fluid', fluid: 'saline', volumeMl: 1000, overS: 1800 } }],
    rows: [
      { channel: 'hb', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D10: Pulse retains ≥ 0.6 of the litre (no oncotic source, no lymph) → larger dilution' },
      { channel: 'be', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'D3: Cl is not in Pulse’s SID → ΔBE ≈ 0; ours negative' },
      { channel: 'na', metric: 'delta', tol: 1, expect: 'agree', note: 'both near 0 (saline Na 154)' },
    ],
  },
  {
    id: 'O10b', baselineS: 60, compareAtS: 60 + 3600,
    pulse: [{ tS: 60, json: bolus('Insulin', 100, 'ug/mL', 1) }],
    ours: [{ tS: 60, event: { kind: 'drug', drugId: 'insulinDextrose', dose: 10, unit: 'units' } }],
    rows: [
      { channel: 'k', metric: 'delta', tol: 0.5, expect: 'expect-differ', note: 'Pulse has no transcellular K shift (annex §5b.2): ours −0.6 to −1.0; glucose is 7e’s (stub)' },
    ],
  },
  {
    id: 'O13b', baselineS: 60, compareAtS: 60 + 600,
    pulse: [{ tS: 60, json: bolus('Bicarbonate', 84, 'mg/mL', 50) }],
    ours: [{ tS: 60, event: { kind: 'drug', drugId: 'sodiumBicarbonate', dose: 50, unit: 'mmol' } }],
    rows: [
      { channel: 'ph', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'Pulse bolus of the Bicarbonate substance only (no Na): not comparable; reported' },
      { channel: 'na', metric: 'delta', tol: 0.5, expect: 'exclude', note: 'as above' },
    ],
  },
];

export interface BloodOracleResult { channel: BloodChannel; metric: 'abs' | 'delta'; ours: number; pulse: number; verdict: ReturnType<typeof compareRow>; note: string }

/** One scenario on both engines (StandardMale, our engine MODELED). Returns every row (a `fail` is a gate-note finding,
 *  never a tuning target, audit §4) and our baseline panel. Local-only: 60 s simulated ≈ 2–20 s wall. */
export async function runBloodOracle(sc: BloodOracleScenario, pulse: Pick<PulseOracle, 'step' | 'pull' | 'act'>): Promise<{ rows: BloodOracleResult[]; oursBaseline: Record<BloodChannel, number> }> {
  const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
  const ev: Extract<EngineEvent, { type: 'labs' }>[] = [];
  e.on((x) => { if (x.type === 'labs') ev.push(x); }, ['labs']);
  for (const o of sc.ours) e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
  const pulseAt = new Map<number, Record<string, number>>();
  const bvAt = new Map<number, number>();
  const bvOurs = () => {
    const s = e.snapshot().state as { st: { blood: { core: { fl: { vp: number; hbG: number } } } } };
    return s.st.blood.core.fl.vp + 3 * s.st.blood.core.fl.hbG; // plasma + RBC (MCHC 0.33 g/mL)
  };
  const acts = [...sc.pulse].sort((a, b) => a.tS - b.tS);
  let t = 0;
  for (const at of [sc.baselineS, sc.compareAtS]) {
    while (t < at) {
      while (acts.length && acts[0]!.tS <= t) {
        const a = acts.shift()!;
        if (!pulse.act(a.json)) throw new Error(`${sc.id}: Pulse rejected ${a.json}`);
      }
      pulse.step(50);
      t += 1;
      if (t % 60 === 0) {
        e.advanceTo(t);
        await new Promise((r) => setImmediate(r));
      }
    }
    pulseAt.set(at, pulse.pull());
    e.advanceTo(at);
    bvAt.set(at, bvOurs());
  }
  const ours = (at: number, ch: BloodChannel): number => {
    const l = ev.filter((x) => x.t <= at).pop();
    if (!l) return Number.NaN;
    return ch === 'bv' ? (bvAt.get(at) as number) : l.values[ch]; // BV is not in the panel: from the snapshot
  };
  const rows = sc.rows.map((row): BloodOracleResult => {
    const pk = PULSE_BLOOD[row.channel];
    const pv = (at: number) => pk.toOurs(pulseAt.get(at)?.[pk.key] ?? Number.NaN);
    const o = row.metric === 'abs' ? ours(sc.compareAtS, row.channel) : ours(sc.compareAtS, row.channel) - ours(sc.baselineS, row.channel);
    const q = row.metric === 'abs' ? pv(sc.compareAtS) : pv(sc.compareAtS) - pv(sc.baselineS);
    return { channel: row.channel, metric: row.metric, ours: o, pulse: q, verdict: compareRow(o, q, row), note: row.note };
  });
  const oursBaseline = Object.fromEntries((Object.keys(PULSE_BLOOD) as BloodChannel[]).map((ch) => [ch, ours(sc.baselineS, ch)])) as Record<BloodChannel, number>;
  return { rows, oursBaseline };
}
```


- [x] **Step 3: Create `packages/validation/test/oracle-blood.test.ts`**:


```ts
import { describe, expect, it } from 'vitest';
import { BLOOD_ORACLE, PULSE_BLOOD, runBloodOracle } from '../src/oracle/blood-scenarios.ts';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, pulseDir } from '../src/oracle/pulse-node.ts';

describe('blood oracle rules (always run)', () => {
  it('K is compared in true mmol/L (39.098 g/mol), and expect-differ rows fail when the engines agree', () => {
    expect(PULSE_BLOOD.k.toOurs(15.6)).toBeCloseTo(3.99, 2);
    const row = { channel: 'lactate' as const, metric: 'delta' as const, tol: 0.5, expect: 'expect-differ' as const, note: '' };
    expect(compareRow(3, 0.1, row)).toBe('expect-differ-ok');
    expect(compareRow(0.1, 0.1, row)).toBe('fail');
  });
  it('scenario shapes: every action at or after the baseline, compare time after it, tolerances > 0', () => {
    for (const sc of BLOOD_ORACLE) {
      expect(sc.compareAtS).toBeGreaterThan(sc.baselineS);
      for (const a of [...sc.pulse, ...sc.ours]) expect(a.tS).toBeGreaterThanOrEqual(sc.baselineS);
      for (const r of sc.rows) expect(r.tol).toBeGreaterThan(0);
    }
  });
});

const DIR = pulseDir();
describe.skipIf(!DIR)('Pulse oracle, blood (annex §D; PME_PULSE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of BLOOD_ORACLE) {
    it(sc.id, async () => {
      const { rows } = await runBloodOracle(sc, await loadPulse(DIR as string));
      for (const r of rows) console.log(`${sc.id} ${r.channel} ${r.metric}: ours ${r.ours.toFixed(2)} pulse ${r.pulse.toFixed(2)} → ${r.verdict} (${r.note})`);
      expect(rows.map((r) => r.verdict)).not.toContain('fail'); // every row is printed first (a fail is a gate-note finding)
    }, 3_600_000); // local-only (skipped in CI)
  }
});
```


- [x] **Step 4: Run the always-run rules and the skip path**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-blood.test.ts test/oracle.test.ts test/oracle-renal.test.ts test/oracle && npx -y pnpm@9.15.9 -r typecheck`
Expected: PASS — `oracle-blood` 2 passed + 4 skipped (no `PME_PULSE_DIR`), `oracle-renal` 1 passed + 1 skipped,
`oracle.test.ts` skipped, `test/oracle/oracle.test.ts` (8a) unchanged; typecheck clean. `git grep -n PULSE_ORACLE_DIR -- packages .github`
prints nothing.

- [x] **Step 5: Commit**

```bash
git add packages/validation/src/oracle/blood-scenarios.ts packages/validation/test/oracle-blood.test.ts packages/validation/src/oracle/compare.ts packages/validation/test/oracle.test.ts packages/validation/test/oracle-renal.test.ts
git commit -m "test(validation): adopt 7c's Pulse blood oracle (O2b/O3b/O10b/O13b); one loader (pulse-node) and one env var (PME_PULSE_DIR)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```
(`git rm` in Step 1 already staged the deletion of `pulse-runner.ts`.)


- [x] **Step 6: Write the failing baseline test** — in `packages/validation/test/oracle-blood.test.ts`, 
find:

```ts
import { describe, expect, it } from 'vitest';
import { BLOOD_ORACLE, PULSE_BLOOD, runBloodOracle } from '../src/oracle/blood-scenarios.ts';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, pulseDir } from '../src/oracle/pulse-node.ts';

describe('blood oracle rules (always run)', () => {
  it('K is compared in true mmol/L (39.098 g/mol), and expect-differ rows fail when the engines agree', () => {
```

and replace with:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { BLOOD_ORACLE, PULSE_BLOOD, runBloodOracle } from '../src/oracle/blood-scenarios.ts';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, PULSE_REQUESTS, pulseDir, type PulseOracle } from '../src/oracle/pulse-node.ts';

describe('blood oracle rules (always run)', () => {
  it('K is compared in true mmol/L (39.098 g/mol), and expect-differ rows fail when the engines agree', () => {
```

find:

```ts
      for (const r of sc.rows) expect(r.tol).toBeGreaterThan(0);
    }
  });
});

const DIR = pulseDir();
```

and replace with:

```ts
      for (const r of sc.rows) expect(r.tol).toBeGreaterThan(0);
    }
  });
  it('O13b: our baseline is the panel BEFORE the bicarbonate dose (7c read it after: ΔNa −2.00 was the post-bolus decay)', { timeout: 60_000 }, async () => {
    const flat: Pick<PulseOracle, 'step' | 'pull' | 'act'> = { step: () => {}, pull: () => Object.fromEntries(PULSE_REQUESTS.map((k) => [k, 1])) as never, act: () => true };
    const o13b = BLOOD_ORACLE.find((s) => s.id === 'O13b')!;
    const r = await runBloodOracle({ ...o13b, compareAtS: 120 }, flat);
    const ref = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
    const labs: Extract<EngineEvent, { type: 'labs' }>[] = [];
    ref.on((x) => { if (x.type === 'labs') labs.push(x); }, ['labs']);
    ref.advanceTo(60); // the same engine, undosed
    expect(r.oursBaseline.na).toBeCloseTo(labs.at(-1)!.values.na, 2);
    expect(r.rows.find((x) => x.channel === 'na')!.ours).toBeGreaterThan(0); // 50 mmol of Na given: ΔNa > 0
  });
});

const DIR = pulseDir();
```


- [x] **Step 7: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-blood.test.ts`
Expected: FAIL — `O13b: our baseline is the panel BEFORE the bicarbonate dose …`: `AssertionError: expected 143 to be
close to 140, received difference is 3` (the baseline panel is post-dose). ≈ 0.7 s; no Pulse needed (a flat stub).


- [x] **Step 8: Dispatch our actions when the loop reaches them** — in `packages/validation/src/oracle/blood-scenarios.ts`, 
find:

```ts
  const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
  const ev: Extract<EngineEvent, { type: 'labs' }>[] = [];
  e.on((x) => { if (x.type === 'labs') ev.push(x); }, ['labs']);
  for (const o of sc.ours) e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
  const pulseAt = new Map<number, Record<string, number>>();
  const bvAt = new Map<number, number>();
  const bvOurs = () => {
    const s = e.snapshot().state as { st: { blood: { core: { fl: { vp: number; hbG: number } } } } };
    return s.st.blood.core.fl.vp + 3 * s.st.blood.core.fl.hbG; // plasma + RBC (MCHC 0.33 g/mL)
  };
  const acts = [...sc.pulse].sort((a, b) => a.tS - b.tS);
  let t = 0;
  for (const at of [sc.baselineS, sc.compareAtS]) {
    while (t < at) {
```

and replace with:

```ts
  const e = createEngine({ seed: 1, mode: 'modeled', patient: { ageY: 44, sex: 'M', weightKg: 77.1, heightCm: 180, baseline: { hr: 72 } } });
  const ev: Extract<EngineEvent, { type: 'labs' }>[] = [];
  e.on((x) => { if (x.type === 'labs') ev.push(x); }, ['labs']);
  const pulseAt = new Map<number, Record<string, number>>();
  const bvAt = new Map<number, number>();
  const bvOurs = () => {
    const s = e.snapshot().state as { st: { blood: { core: { fl: { vp: number; hbG: number } } } } };
    return s.st.blood.core.fl.vp + 3 * s.st.blood.core.fl.hbG; // plasma + RBC (MCHC 0.33 g/mL)
  };
  // Both engines take their actions when the loop reaches them, AFTER the baseline read at `baselineS` (FU-3 item 10:
  // 7c's copy dispatched ours up front with atTick = tS × 50, so tick 3000 applied the dose before our 60 s panel —
  // O13b baseline Na 143 post-dose vs 140 — while Pulse's baseline was pre-dose).
  const acts = [...sc.pulse].sort((a, b) => a.tS - b.tS);
  const mine = [...sc.ours].sort((a, b) => a.tS - b.tS);
  let t = 0;
  for (const at of [sc.baselineS, sc.compareAtS]) {
    while (t < at) {
```

find:

```ts
        const a = acts.shift()!;
        if (!pulse.act(a.json)) throw new Error(`${sc.id}: Pulse rejected ${a.json}`);
      }
      pulse.step(50);
      t += 1;
      if (t % 60 === 0) {
```

and replace with:

```ts
        const a = acts.shift()!;
        if (!pulse.act(a.json)) throw new Error(`${sc.id}: Pulse rejected ${a.json}`);
      }
      while (mine.length && mine[0]!.tS <= t) {
        const o = mine.shift()!; // atTick is clamped to the next tick when our engine already stands at tS
        e.dispatch({ id: `o${o.tS}`, issuedBy: 'oracle', type: 'applyEvent', event: o.event as never, atTick: o.tS * 50 });
      }
      pulse.step(50);
      t += 1;
      if (t % 60 === 0) {
```


- [x] **Step 9: Run it to verify it passes, then commit**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-blood.test.ts test/oracle.test.ts test/oracle-renal.test.ts test/oracle`
Expected: PASS — 9 passed, 11 skipped (4 files; the Pulse-bound ones skip without `PME_PULSE_DIR`).

```bash
git add packages/validation/src/oracle/blood-scenarios.ts packages/validation/test/oracle-blood.test.ts
git commit -m "fix(validation): blood oracle reads our baseline before the actions at baselineS (O13b baseline Na was post-dose: 143 vs 140)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


- [x] **Step 10: Document the one variable** — in `docs/validation/README.md`, 
find:

````markdown
npx -y pnpm@9.15.9 validate                                        # everything (≈ 30–60 min)
npx -y pnpm@9.15.9 validate --quick                                # 4 recorded windows, fewer seeds (≈ 5 min)
npx -y pnpm@9.15.9 validate --suites sanity,gates                  # a subset
PME_PULSE_DIR=../research/pulse-spike/web npx -y pnpm@9.15.9 validate --suites oracle
npx -y pnpm@9.15.9 validate --rebaseline                           # rewrite waveform baselines + golden hashes (review the diff!)
```

`PME_DATASET_CACHE` moves the cache (default `packages/validation/datasets/cache/`, git-ignored). Raw records never
enter git; only manifests (ids, window times, hashes) and derived statistics do (brief §8).

````

and replace with:

````markdown
npx -y pnpm@9.15.9 validate                                        # everything (≈ 30–60 min)
npx -y pnpm@9.15.9 validate --quick                                # 4 recorded windows, fewer seeds (≈ 5 min)
npx -y pnpm@9.15.9 validate --suites sanity,gates                  # a subset
PME_PULSE_DIR=$PWD/../research/pulse-spike/web npx -y pnpm@9.15.9 validate --suites oracle
npx -y pnpm@9.15.9 validate --rebaseline                           # rewrite waveform baselines + golden hashes (review the diff!)
```

`PME_PULSE_DIR` must be ABSOLUTE (`$PWD/…`): pnpm runs the package from `packages/validation`, so a relative path
does not resolve and the oracle is skipped as if unset. It is the only Pulse variable (the stage oracles' old
`PULSE_ORACLE_DIR` is retired, FU-3). The per-stage Pulse oracles are vitest files that skip without it; they are slow
(≈ 40 min for the blood rows), so run them alone, locally:

```bash
PME_PULSE_DIR=$PWD/../research/pulse-spike/web npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle.test.ts        # 7a O1–O5
PME_PULSE_DIR=$PWD/../research/pulse-spike/web npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-renal.test.ts  # 7d O11
PME_PULSE_DIR=$PWD/../research/pulse-spike/web npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-blood.test.ts  # 7c O2b/O3b/O10b/O13b
```

`PME_DATASET_CACHE` moves the cache (default `packages/validation/datasets/cache/`, git-ignored). Raw records never
enter git; only manifests (ids, window times, hashes) and derived statistics do (brief §8).

````

```bash
git add docs/validation/README.md
git commit -m "docs(validation): PME_PULSE_DIR is the one Pulse variable and must be absolute; the per-stage oracle commands" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

- [x] **Step 11: Run the blood oracle once against the local Pulse build (slow — alone, in the background)**

Pulse 4.3.2 wasm lives OUTSIDE the repo at `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/research/pulse-spike/web/`
(`pulse.js`, `pulse.wasm`, `pulse.data`; 8a's gate note ran its oracle with `PME_PULSE_DIR` pointing there). Never
commit `pulse.wasm` (NOTICES N-084, annex §E).

Run (from the repo root; ≈ 35 min wall on the M-series Mac, the four scenarios sequentially):
`PME_PULSE_DIR=$PWD/../research/pulse-spike/web CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-blood.test.ts > <scratchpad>/fu-3-followups/blood-oracle.log 2>&1`
(poll the process with a bounded loop; do not wait on a marker line). Expected rows (prototype, base d525eed, ours MODELED; 7c's gate run in brackets, MANUAL, before 7d):


| Scenario | Row (Δ from 60 s) | Ours | Pulse | Verdict | 7c gate [MANUAL, pre-7d] |
|---|---|---|---|---|---|
| O2b bleed 1100 mL/10 min, @1860 s | BV mL | −955.84 | −987.92 | agree | −955.6 vs −987.9 agree |
| | Hb g/dL | −0.50 | −0.36 | agree | −0.50 vs −0.36 agree |
| | lactate mmol/L (expect-differ D2) | +0.50 | +0.06 | **fail** (inside tol 0.5) | +1.00 vs +0.06 ok |
| | pH | 0.00 | −0.00 | excluded | same |
| O3b saline 1 L/30 min, @3660 s | Hb (expect-differ D10) | −1.50 | −2.48 | **fail** (inside tol 1.24) | −0.50 vs −2.48 ok |
| | BE (expect-differ D3) | −0.70 | −0.01 | expect-differ-ok | −1.60 vs −0.01 ok |
| | Na (agree, tol 1) | 0.00 | +0.88 | agree | 0.00 vs +0.88 agree |
| O10b insulin, @3660 s | K (expect-differ) | −0.90 | −0.11 | expect-differ-ok | −0.90 vs −0.11 ok |
| O13b NaHCO3 50 mmol, @660 s | pH | +0.03 | −0.00 | excluded | −0.02 vs −0.00 |
| | Na | **+1.00** | +1.63 | excluded | **−2.00** vs +1.63 (post-dose baseline) |

Wall: O2b 141 s, O3b 411 s, O10b 399 s, O13b 83 s (1035 s total; the machine was shared). Log of the pre-fix run on the
old base: `<scratchpad>/fu-3/oracle-console/o13b-before.log` (O13b ΔNa −2.00). O13b's Na delta is now positive and in
the direction of Pulse's (+1.00 vs +1.63): the fix works; the row stays `exclude` (7c's note: Pulse's
`Bicarbonate` substance bolus is not comparable with our NaHCO3).


- [x] **Step 12: Pin per-row verdicts; the two drifted expected-disagreement rows are recorded as `fail` (R45; R50
finding 4, ruling R-5)** — the local Pulse run (Step 11) prints two `expect-differ` rows that now land INSIDE Pulse's
tolerance. Rows and tolerances stay as 7c wrote them. The test stays an ordinary `it` per scenario and asserts every
row's `channel:verdict` against a recorded map that carries the two drifted rows as `fail` with their numbers in the
map's comment — a scenario-level `it.fails` would make any OTHER row's regression (O2b BV/Hb, O3b BE/Na) pass
silently. In `packages/validation/test/oracle-blood.test.ts`, 

find:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { BLOOD_ORACLE, PULSE_BLOOD, runBloodOracle } from '../src/oracle/blood-scenarios.ts';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, PULSE_REQUESTS, pulseDir, type PulseOracle } from '../src/oracle/pulse-node.ts';

```

and replace with:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { BLOOD_ORACLE, PULSE_BLOOD, runBloodOracle, type BloodOracleScenario } from '../src/oracle/blood-scenarios.ts';
import { compareRow } from '../src/oracle/compare.ts';
import { loadPulse, PULSE_REQUESTS, pulseDir, type PulseOracle } from '../src/oracle/pulse-node.ts';

```

find:

```ts
});

const DIR = pulseDir();
describe.skipIf(!DIR)('Pulse oracle, blood (annex §D; PME_PULSE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of BLOOD_ORACLE) {
    it(sc.id, async () => {
      const { rows } = await runBloodOracle(sc, await loadPulse(DIR as string));
      for (const r of rows) console.log(`${sc.id} ${r.channel} ${r.metric}: ours ${r.ours.toFixed(2)} pulse ${r.pulse.toFixed(2)} → ${r.verdict} (${r.note})`);
      expect(rows.map((r) => r.verdict)).not.toContain('fail'); // every row is printed first (a fail is a gate-note finding)
```

and replace with:

```ts
});

const DIR = pulseDir();
// Per-row verdicts of the FU-3 item 10 local Pulse run (2026-09-27, MODELED, base d525eed = main + 7d + 7f), pinned
// row by row (R50 review finding 4). Two expected-disagreement rows our engine has moved INTO Pulse's tolerance since
// 7c's gate run read `fail` — R45: rows and tolerances unchanged; each is a finding for Ali (annex §C):
//   O2b lactate Δ +0.50 vs Pulse +0.06, inside tol 0.5 (expect-differ D2; MANUAL gives +1.10; 7c's gate run +1.00);
//   O3b Hb Δ −1.50 vs Pulse −2.48, inside tol 0.5 × 2.48 (expect-differ D10; 7c alone −0.50: 7d's kidney keeps more
//   of the litre).
// Any OTHER row whose verdict changes fails loudly; a drifted row that moves back out of tolerance fails too (then
// update this map with the new numbers — it is a finding either way).
const VERDICTS: Record<BloodOracleScenario['id'], readonly string[]> = {
  O2b: ['bv:agree', 'hb:agree', 'lactate:fail', 'ph:excluded'],
  O3b: ['hb:fail', 'be:expect-differ-ok', 'na:agree'],
  O10b: ['k:expect-differ-ok'],
  O13b: ['ph:excluded', 'na:excluded'],
};
describe.skipIf(!DIR)('Pulse oracle, blood (annex §D; PME_PULSE_DIR=…/research/pulse-spike/web)', () => {
  for (const sc of BLOOD_ORACLE) {
    it(`${sc.id}: per-row verdicts as recorded (${VERDICTS[sc.id].join(', ')})`, async () => {
      const { rows } = await runBloodOracle(sc, await loadPulse(DIR as string));
      for (const r of rows) console.log(`${sc.id} ${r.channel} ${r.metric}: ours ${r.ours.toFixed(2)} pulse ${r.pulse.toFixed(2)} → ${r.verdict} (${r.note})`);
      expect(rows.map((r) => `${r.channel}:${r.verdict}`)).toEqual(VERDICTS[sc.id]); // every row is printed first (a fail is a gate-note finding)
```


- [x] **Step 13: Run and commit**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/oracle-blood.test.ts && npx -y pnpm@9.15.9 --filter @pme/validation typecheck`
Expected: PASS without Pulse (3 passed, 4 skipped; also with `PME_PULSE_DIR=/nonexistent`: `pulseDir()` checks the
three files). With Pulse (Step 11 command): 4 passed — every scenario's rows equal the recorded map (O2b's lactate and
O3b's Hb as `fail`, the numbers in the map's comment). The prototype ran the first draft's scenario-level `it.fails`
(`-t "O2b|O3b"` with Pulse → 2 passed, 389 s wall) and printed exactly the verdicts in the map (Step 11's table); the
per-row form was not re-run against Pulse — if a verdict differs from the map, record the printed row in the gate note
and update the map with its numbers (never a tolerance).

```bash
git add packages/validation/test/oracle-blood.test.ts
git commit -m "test(validation): pin the blood oracle's per-row verdicts; O2b lactate and O3b Hb expect-differ rows now inside Pulse's tolerance are recorded as fail with the numbers (R45)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

**Numbers (Task 12).**
- O13b baseline test: before `expected 143 to be close to 140` (FAIL), after PASS; ΔNa after 60 s = positive.
- Local Pulse run: see the table in Step 11. Ours-only probes (no Pulse, same harness timing): O2b lactate Δ MANUAL
  +1.10 / MODELED +0.50; O3b Hb Δ at 7c's gate head `5cc7d1b` −0.50 (both modes), at d525eed −1.40 MANUAL / −1.50
  MODELED; O3b BE Δ −1.60 → −0.70; O10b K Δ −0.90 both modes; O13b (fixed baseline) Na Δ +1.00, BE +2.60, pH +0.03.
- Sibling tests: `test/oracle.test.ts` (skipped, no Pulse), `test/oracle-renal.test.ts` 1 passed + 1 skipped,
  8a's `test/oracle/oracle.test.ts` passes; `pnpm -r typecheck` clean. O1–O5 and O11 were NOT re-run against Pulse
  (loader swap only; `PULSE_REQUESTS` = `drm_names.json` checked name-for-name).
- Pinned as `fail` in the per-row verdict map (ordinary `it`, R50 finding 4): O2b lactate (+0.50 vs +0.06, tol 0.5)
  and O3b Hb (−1.50 vs −2.48, tol 1.24). No tolerance or row changed.

**Open questions (for Ali / orchestrator).**
1. *O2b mode.* The verdict depends on the engine mode: MANUAL (7c's run) lactate +1.10 → `expect-differ-ok`; MODELED
   (8a's convention for Stage 7 physiology) +0.50 → inside tol 0.5 of Pulse's +0.06. Keep MODELED (this draft) and
   the `it.fails`, or rule that the D2 row's absolute tolerance is too coarse for a 20 % bleed (a band decision, R45 —
   not the executor's)?
2. *O3b dilution moved with 7d.* 1 L saline over 30 min: Hb −0.50 at 60 min with 7c's fallback elimination, −1.50 with
   7d's kidney on the seam (BE −1.60 → −0.70). D10 ("Pulse retains ≥ 0.6 of the litre, ours less") no longer holds:
   ours now retains nearly as much as Pulse. Is 7d's excretion of an acute saline load too slow? (Volume-kinetics
   work on awake volunteers, e.g. Hahn's, would give the sourced target; not looked up here.)
   A 7d/7c calibration item, not FU-3 item 10.
3. *Three oracle harnesses.* 8a's `runOracle` (O1/O2/O4/O-VF, in `pnpm validate` and the report) and the stage vitest
   oracles (7a O1–O5, 7d O11, 7c blood) overlap; the stage ones are not in `report.md`. Fold them into `runOracle` later
   (8b?), or keep them as stage-local tests?
4. *`PME_PULSE_DIR` relative paths.* Fixed here in the doc only. Alternative (code): `pulseDir()` resolves a relative
   value against `process.env.INIT_CWD` (pnpm's invocation directory). Wanted?
5. origin/main has moved to `2340ffa` since the d525eed base (7d/7f landing); Task 9's find blocks are in 7c/7d files
   that 7e does not touch, and Task 12 is entirely 8a's, so both should apply unchanged — the executor re-checks
   `git grep -n uopMlH -- packages apps` after 7e lands.

---

### Task 13: The renderer draws 7f's NMT and BFA module tiles on philips-like and saadat-like — R-7f-6 (item 11; E-FU3-7)

**Files:**
- Create: `packages/renderer/src/numerics-neuro.ts` (pure formatters + `MODULE_TILES`/`modulePresent`)
- Modify: `packages/renderer/src/device-ui.ts` (one import, one `UNIT` entry, three lines in `paintTiles`),
  `packages/renderer/src/index.ts` (one export line)
- Modify: `packages/skins/src/data/skins/philips-like.json` (colours `NMT`/`BFA`, a `layout.tiles` override, three
  provenance entries), `packages/skins/src/data/skins/saadat-like.json` (colour `NMT`, two tiles appended to the second
  column, one provenance note extended, one provenance entry)
- Modify (regenerated): `packages/skins/test/__snapshots__/resolve.test.ts.snap` (9 snapshots: `render.tileColors` gains
  `NMT`/`BFA`, +18 lines, nothing else)
- Modify: `apps/demo/src/stage7f.ts` (one line: `?skin=` — the shots run the 7f page on either skin; Stage 7f's file,
  anchored by content) — **partition exception candidate** (demo file in a renderer/skins task; Task 14 edits the same
  file at other lines, sequential tasks, no conflict)
- Create: `apps/demo/scripts/fu3-neuro-tiles-shots.mjs` (the two screenshots; the gate task runs it)
- Test: `packages/skins/test/neuro-tiles.test.ts` (one new `describe`), `packages/renderer/test/neuro-tiles.test.ts` (new)

**Interfaces:**
- Consumes: the engine's `measurement` values `tofCount`, `tofRatio` (%, `null`/invalid unless count 4), `ptc`
  (7f `l2/neuro/tof-device.ts`: every train / 23 s after a PTC) and `di` (`null` + `questionable` during the EMG
  artefact), `sr` (7f `l2/neuro/pipeline.ts` `emitSecond`, 1 Hz while `device: 'depth'` is `on`); `TILE_NUMERICS.NMT/BFA`
  (7f, `alarm-view.ts`, `limits: []` so no bell/limits); `TileSpec.extras` (skins schema, existing).
- Produces: `formatNmt`, `formatBfa`, `modulePresent`, `MODULE_TILES` (exported from `@pme/renderer`); `DeviceUI` draws
  NMT ("92%" + "TOF 4/4"; "2/4"; "0/4" + "PTC 6") and BFA ("45" + "SR 0" / "BS% 0") and hides each tile until its
  device publishes and again when its readings go stale (NMT 120 s, BFA 5 s).


**Why:** 7f added `NMT`/`BFA` to `TILE_PARAMS`, `COLOR_KEYS`, `TILE_COLOR_KEY` and `TILE_NUMERICS`, but no skin
declares them in `layout.tiles`, and `DeviceUI.paintTiles` would draw NMT through the 3-numeric pressure branch
(`"92/4 (---)"`) and BFA as `---`. The TOF stimulator and depth monitor are plug-in modules on both real monitors
(research/06 §2: BFA is a B9 option), so the tiles are MODULE tiles (D10). research/05 has no IntelliVue NMT/BIS rows,
so philips-like's placement (NMT under NIBP, BFA under TEMP) and colours (the 7f demo's `#E0E0E0` / `#9AD0FF`) are
`eng`; research/06 documents the B9 BFA module ("BFI 0–100, BS%, EMG%, SQI%", M p. 265, 275–276) — saadat-like names
the second readout BS%; research/06 documents no NMT module for the B9, so saadat-like's NMT tile is [unverified].
Rejected: always-on tiles (changes every philips/saadat page); a new schema field (four files for one table).

**Prototype numbers:** skins 18 files / 173 tests, renderer 23 files / 76 tests (7.8 s); the 9 resolve snapshots gain
only the two tile colours (+18 lines); screenshots at sim ≈ 460 s show NMT "0/4 · PTC 0" and BFA "38 · SR 0 %" /
"38 · BS% 0" on both skins, matching the 7f demo's own DOM tiles (PNG ≈ 50 KB each). The Stage 4a gallery shows the two
tiles with 7f's sample values; running the 4a e2e rewrites 7 committed PNGs — restore them (`git checkout --
docs/gates/stage-4a`) unless the gate decides otherwise.

- [x] **Step 1: Write the failing skins test**

In `packages/skins/test/neuro-tiles.test.ts`, find:

```ts
import { describe, expect, it } from 'vitest';
```

and replace with:

```ts
import { describe, expect, it } from 'vitest';
import { coveringKey, resolveSkin } from '../src/index.ts';
```

In `packages/skins/test/neuro-tiles.test.ts`, find:

```ts
  });
});
```

and replace with:

```ts
  });
});

describe('FU-3 item 11 (R-7f-6): NMT and BFA tiles on the anaesthesia skins', () => {
  it('philips-like and saadat-like declare an NMT and a BFA tile, coloured, with provenance', () => {
    for (const id of ['philips-like', 'saadat-like']) {
      const r = resolveSkin(id);
      const params = r.skin.layout.tiles.flat().map((t) => t.param);
      expect(params).toContain('NMT');
      expect(params).toContain('BFA');
      expect(r.render.tileColors.NMT).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.render.tileColors.BFA).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(r.provenance[coveringKey(r.provenance, 'colors.NMT') as string]).toBeDefined();
      expect(r.provenance[coveringKey(r.provenance, 'layout.tiles') as string]?.note).toMatch(/NMT/);
    }
  });
  it('the BFA tile names its second readout as the vendor does (Philips SR, Saadat BS%)', () => {
    const bfa = (id: string) => resolveSkin(id).skin.layout.tiles.flat().find((t) => t.param === 'BFA');
    expect(bfa('philips-like')?.extras?.[0]).toBe('SR');
    expect(bfa('saadat-like')?.extras?.[0]).toBe('BS%');
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run test/neuro-tiles.test.ts`
Expected: FAIL, 2 tests — `expected [ 'HR', 'ART', 'NIBP', 'SpO2', …(2) ] to include 'NMT'` and
`expected undefined to be 'SR'` (the 7f test in the same file passes).

- [x] **Step 3: Write the failing renderer test**

Create `packages/renderer/test/neuro-tiles.test.ts` with exactly:

```ts
// @vitest-environment happy-dom
// FU-3 item 11 (R-7f-6): the renderer draws Stage 7f's NMT (TOF) and BFA (depth index) tiles from the engine's
// `measurement` events (tofCount/tofRatio/ptc from the stimulator, di/sr from the depth monitor at 1 Hz). Like a
// plug-in module, a tile is hidden until its device publishes and hides again when the readings go stale.
import { describe, expect, it } from 'vitest';
import type { EngineEvent, Measured } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';
import { formatBfa, formatNmt, modulePresent } from '../src/numerics-neuro.ts';

const m = (value: number | null, t: number, flag: Measured['flag'] = value === null ? 'invalid' : 'valid'): Measured => ({ value, flag, at: t });
const meas = (t: number, values: Record<string, Measured>): EngineEvent => ({ type: 'measurement', t, values }) as EngineEvent;

describe('NMT / BFA formatters', () => {
  it('NMT: ratio in % at count 4, the count otherwise, PTC only at count 0', () => {
    expect(formatNmt({ tofCount: m(4, 10), tofRatio: m(92, 10) }, '---')).toEqual({ main: '92%', sub: 'TOF 4/4' });
    expect(formatNmt({ tofCount: m(2, 10), tofRatio: m(null, 10) }, '---')).toEqual({ main: '2/4', sub: '' });
    expect(formatNmt({ tofCount: m(0, 10), tofRatio: m(null, 10), ptc: m(8, 30) }, '---')).toEqual({ main: '0/4', sub: 'PTC 8' });
    expect(formatNmt({ tofCount: m(3, 40), tofRatio: m(null, 40), ptc: m(8, 30) }, '---')).toEqual({ main: '3/4', sub: '' });
    expect(formatNmt({}, '---')).toEqual({ main: '---', sub: '' });
  });
  it('BFA: the index, dashes during the EMG artefact, SR under the vendor label', () => {
    expect(formatBfa({ di: m(45, 5), sr: m(0, 5) }, 'SR', '---')).toEqual({ main: '45', sub: 'SR 0' });
    expect(formatBfa({ di: m(null, 5, 'questionable'), sr: m(3, 5) }, 'BS%', '---')).toEqual({ main: '---', sub: 'BS% 3' });
  });
  it('a module tile is present only while its device publishes (NMT 120 s, BFA 5 s)', () => {
    expect(modulePresent('NMT', {}, 100)).toBe(false);
    expect(modulePresent('NMT', { tofCount: m(4, 100) }, 219)).toBe(true);
    expect(modulePresent('NMT', { tofCount: m(4, 100) }, 221)).toBe(false);
    expect(modulePresent('BFA', { di: m(40, 100), sr: m(0, 100) }, 104)).toBe(true);
    expect(modulePresent('BFA', { di: m(40, 100), sr: m(0, 100) }, 106)).toBe(false);
    expect(modulePresent('HR', {}, 0)).toBe(true); // not a module tile: always drawn
  });
});

describe('DeviceUI draws the NMT and BFA tiles (philips-like, saadat-like)', () => {
  const mount = (id: string) => {
    const wave = document.createElement('div');
    const ui = new DeviceUI(document, wave, resolveSkin(id));
    const tile = (p: string) => ui.tiles.querySelector(`.pme-stile[data-param="${p}"]`) as HTMLDivElement | null;
    const text = (p: string, k: 'v' | 's') => tile(p)?.querySelector(`[data-pme="${k}"]`)?.textContent;
    return { ui, tile, text };
  };

  it('no NMT/BFA tile shows before the stimulator or the depth monitor publishes', () => {
    for (const id of ['philips-like', 'saadat-like']) {
      const { ui, tile } = mount(id);
      ui.onEvent(meas(10, { hr: m(72, 10) }));
      ui.paint(10);
      expect(tile('NMT')).not.toBeNull();
      expect(tile('NMT')?.style.display).toBe('none');
      expect(tile('BFA')?.style.display).toBe('none');
      expect(tile('HR')?.style.display).not.toBe('none');
      ui.destroy();
    }
  });

  it('draws the TOF ratio and the depth index from fixture measurement events', () => {
    const { ui, tile, text } = mount('philips-like');
    ui.onEvent(meas(60, { tofCount: m(4, 60), tofRatio: m(92, 60) }));
    ui.onEvent(meas(61, { di: m(45, 61), sr: m(0, 61) }));
    ui.paint(61);
    expect(tile('NMT')?.style.display).toBe('');
    expect(text('NMT', 'v')).toBe('92%');
    expect(text('NMT', 's')).toBe('TOF 4/4');
    expect(text('BFA', 'v')).toBe('45');
    expect(text('BFA', 's')).toBe('SR 0');
    ui.onEvent(meas(300, { tofCount: m(0, 300), tofRatio: m(null, 300) }));
    ui.onEvent(meas(323, { ptc: m(6, 323) }));
    ui.paint(323);
    expect(text('NMT', 'v')).toBe('0/4');
    expect(text('NMT', 's')).toBe('PTC 6');
    expect(tile('BFA')?.style.display).toBe('none'); // depth monitor silent since 61 s: the module tile goes
    ui.destroy();
  });

  it('saadat-like labels the burst suppression BS% (research/06 §2 BFA module)', () => {
    const { ui, text } = mount('saadat-like');
    ui.onEvent(meas(61, { di: m(38, 61), sr: m(2, 61) }));
    ui.paint(61);
    expect(text('BFA', 'v')).toBe('38');
    expect(text('BFA', 's')).toBe('BS% 2');
    ui.destroy();
  });
});
```

- [x] **Step 4: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/neuro-tiles.test.ts`
Expected: FAIL — the file does not load: `Failed to load url ../src/numerics-neuro.ts`.

- [x] **Step 5: Implement the formatters and the tile drawing**

Create `packages/renderer/src/numerics-neuro.ts` with exactly:

```ts
// FU-3 item 11 (R-7f-6): Stage 7f's NMT (train-of-four) and BFA (BIS-like depth index) tiles. Pure formatters (Node
// has no DOM) from the engine's `measurement` values: tofCount/tofRatio (every train), ptc (23 s after a PTC) and
// di/sr (1 Hz while the depth monitor is on), as the 7f demo draws them. Like a plug-in module, a tile is shown only
// while its device publishes (MODULE_TILES); the other tiles are always drawn.
import type { Measured, NumericId } from '@pme/engine-core';
import type { TileParam } from '@pme/skins';

type Values = Partial<Record<NumericId, Measured>>;
const ok = (x: Measured | undefined): x is Measured & { value: number } => !!x && x.value !== null && x.flag !== 'invalid';

/**
 * A module tile's readings and how long they stay current: the stimulator runs a train every 12–60 s (7f tof-device),
 * so NMT keeps its last train for 2 × 60 s; the depth monitor publishes at 1 Hz, so BFA goes after 5 missed seconds [ENG].
 */
export const MODULE_TILES: Partial<Record<TileParam, { numerics: NumericId[]; staleS: number }>> = {
  NMT: { numerics: ['tofCount', 'ptc'], staleS: 120 },
  BFA: { numerics: ['di', 'sr'], staleS: 5 },
};

/** Whether the tile is drawn at sim time t: always for a non-module tile; for NMT/BFA while the device publishes. */
export function modulePresent(param: TileParam, v: Values, t: number): boolean {
  const mod = MODULE_TILES[param];
  if (!mod) return true;
  return mod.numerics.some((k) => {
    const x = v[k];
    return x !== undefined && t - x.at <= mod.staleS;
  });
}

/** TOF ratio in % when all four twitches are present, else the count "n/4"; the PTC only at count 0. */
export function formatNmt(v: Values, noValue: string): { main: string; sub: string } {
  const { tofCount: c, tofRatio: r, ptc: p } = v;
  if (ok(c) && c.value === 4 && ok(r)) return { main: `${Math.round(r.value)}%`, sub: 'TOF 4/4' };
  if (!ok(c)) return { main: noValue, sub: '' };
  return { main: `${c.value}/4`, sub: c.value === 0 && ok(p) ? `PTC ${p.value}` : '' };
}

/** The depth index (dashes while the EMG artefact makes it questionable) and the suppression ratio under `srLabel`. */
export function formatBfa(v: Values, srLabel: string, noValue: string): { main: string; sub: string } {
  return { main: ok(v.di) ? String(Math.round(v.di.value)) : noValue, sub: `${srLabel} ${ok(v.sr) ? Math.round(v.sr.value) : noValue}` };
}
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
import { formatNibp } from './numerics-hemo.ts';
```

and replace with:

```ts
import { formatNibp } from './numerics-hemo.ts';
import { formatBfa, formatNmt, modulePresent } from './numerics-neuro.ts'; // FU-3 item 11
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
  ICP: 'mmHg', PbtO2: 'mmHg', UO: 'mL/h', // Stage 7d
```

and replace with:

```ts
  ICP: 'mmHg', PbtO2: 'mmHg', UO: 'mL/h', // Stage 7d
  NMT: 'TOF', // FU-3 item 11 (the depth index has no unit)
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
      if (p === 'HR') main = this.dev?.hrDashes ? g.hrUnavailable : this.text(v.hr);
```

and replace with:

```ts
      tile.el.style.display = modulePresent(p, v, t) ? '' : 'none'; // FU-3 item 11: NMT/BFA only while the module publishes
      if (p === 'HR') main = this.dev?.hrDashes ? g.hrUnavailable : this.text(v.hr);
      else if (p === 'NMT') ({ main, sub } = formatNmt(v, g.noValue)); // FU-3 item 11
      else if (p === 'BFA') ({ main, sub } = formatBfa(v, tile.spec.extras?.[0] ?? 'SR', g.noValue)); // FU-3 item 11
```

In `packages/renderer/src/index.ts`, find:

```ts
export { formatIcp, formatPbto2, formatUop } from './numerics-organs.ts'; // Stage 7d
```

and replace with:

```ts
export { formatIcp, formatPbto2, formatUop } from './numerics-organs.ts'; // Stage 7d
export { formatBfa, formatNmt, modulePresent, MODULE_TILES } from './numerics-neuro.ts'; // FU-3 item 11
```

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/neuro-tiles.test.ts`
Expected: the 3 formatter tests PASS; the 3 `DeviceUI` tests still FAIL (`expected null not to be null`,
`expected undefined to be ''`, `expected undefined to be '38'`) — no skin declares the tiles yet.

- [x] **Step 6: Declare the tiles on the two skins**

In `packages/skins/src/data/skins/philips-like.json`, find:

```json
    "TEMP": "#00FF00"
```

and replace with:

```json
    "TEMP": "#00FF00",
    "NMT": "#E0E0E0", "BFA": "#9AD0FF"
  },
  "layout": {
    "tiles": [
      [{ "param": "HR", "size": "large" }, { "param": "ART", "extras": ["MEAN"] }, { "param": "NIBP", "extras": ["MEAN"] }, { "param": "NMT", "extras": ["TOF", "PTC"] }],
      [{ "param": "SpO2", "extras": ["PR"] }, { "param": "CO2", "extras": ["EtCO2", "AWRR"] }, { "param": "TEMP" }, { "param": "BFA", "extras": ["SR"] }]
    ]
```

In `packages/skins/src/data/skins/philips-like.json`, find:

```json
    "colors": { "tag": "documented", "source": "research/05 §2.1 (IntelliVue factory colour names); brief §6.8", "note": "hex values are [ENG] renderings of the colour names; NBP red (magenta in some profiles)" },
```

and replace with:

```json
    "colors": { "tag": "documented", "source": "research/05 §2.1 (IntelliVue factory colour names); brief §6.8", "note": "hex values are [ENG] renderings of the colour names; NBP red (magenta in some profiles)" },
    "colors.NMT": { "tag": "eng", "source": "ENG", "note": "FU-3 item 11: research/05 §2.1 has no NMT row; the Stage 7f demo's tile colour (apps/demo/src/stage7f.ts) kept" },
    "colors.BFA": { "tag": "eng", "source": "ENG", "note": "FU-3 item 11: research/05 §2.1 has no BIS/depth row; the Stage 7f demo's tile colour (apps/demo/src/stage7f.ts) kept" },
    "layout.tiles": { "tag": "eng", "source": "iec-defaults layout.tiles; research/05 §2.7 (numerics in tiles on the right)", "note": "FU-3 item 11: the IEC default grid plus an NMT tile (TOF ratio %, count, PTC) and a BFA tile (depth index, SR) at the foot of the columns; research/05 documents no IntelliVue NMT/BIS tile layout. Both are module tiles, drawn only while the stimulator / depth monitor publishes" },
```

In `packages/skins/src/data/skins/saadat-like.json`, find:

```json
    "BFA": "#F0F0F0",
```

and replace with:

```json
    "BFA": "#F0F0F0",
    "NMT": "#F0F0F0",
```

In `packages/skins/src/data/skins/saadat-like.json`, find:

```json
        { "param": "RR" }
```

and replace with:

```json
        { "param": "RR" },
        { "param": "NMT", "extras": ["TOF", "PTC"] },
        { "param": "BFA", "extras": ["BS%", "SQI", "EMG"] }
```

In `packages/skins/src/data/skins/saadat-like.json`, find:

```json
    "colors.BFA": { "tag": "assumed", "source": "research/06 §5; brief §6.8", "note": "from the Alvand screenshot" },
```

and replace with:

```json
    "colors.BFA": { "tag": "assumed", "source": "research/06 §5; brief §6.8", "note": "from the Alvand screenshot" },
    "colors.NMT": { "tag": "eng", "source": "ENG", "note": "FU-3 item 11: no NMT module in research/06; the B9 white (as BFA) chosen" },
```

In `packages/skins/src/data/skins/saadat-like.json`, find:

```json
    "layout.tiles": { "tag": "documented", "source": "research/06 §3.1 F1; research/06 §3.2" },
```

and replace with:

```json
    "layout.tiles": { "tag": "documented", "source": "research/06 §3.1 F1; research/06 §3.2", "note": "FU-3 item 11 [ENG]: NMT and BFA module tiles appended to the second column, drawn only while the stimulator / depth monitor publishes. BFA is a B9 option module (BFI 0–100, BS%, EMG%, SQI%: research/06 §2); no NMT module is documented for the B9 [unverified]" },
```

- [x] **Step 7: Regenerate the resolved-skin snapshots and check they only gained the two tile colours**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run -u test/resolve.test.ts`
Expected: `Snapshots 9 updated`, `Tests 27 passed`. Then `git diff --stat packages/skins/test/__snapshots__` shows
`18 ++++++++++++++++++` and `git diff packages/skins/test/__snapshots__ | grep '^[-+] '` lists only `+ "BFA": …` and
`+ "NMT": …` lines (philips-like `#9AD0FF`/`#E0E0E0`, saadat-like and iran-icu-as-found `#F0F0F0`, and the
projector-light/ecg-grid theme re-mappings `#737373`, `#767676`, `#0073D7`, `#0076DE`). Any `-` line means main moved:
stop and look.

- [x] **Step 8: Run the packages to verify they pass**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/skins exec vitest run` — Expected: PASS, 18 files / 173 tests.
Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run` — Expected: PASS, 23 files / 76 tests
(≈ 8 s; renderer budget 30 s, CI amendment 3).

- [x] **Step 9: The 7f page on either skin, and the screenshot script**

In `apps/demo/src/stage7f.ts`, find:

```ts
  skin: 'philips-like',
```

and replace with:

```ts
  skin: new URLSearchParams(location.search).get('skin') ?? 'philips-like', // FU-3 item 11: ?skin=saadat-like for the tile shots
```

Create `apps/demo/scripts/fu3-neuro-tiles-shots.mjs` with exactly:

```js
// FU-3 item 11 (R-7f-6) screenshots: the renderer's own NMT and BFA tiles on philips-like and saadat-like, on the 7f
// demo page after the induction script's rocuronium (TOF 0/4, PTC shown) with the depth monitor on. Headless system
// Chrome. Usage: (cd apps/demo && npx vite --port 4818 --strictPort &) then
//   node apps/demo/scripts/fu3-neuro-tiles-shots.mjs http://localhost:4818 docs/gates/fu-3
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4818', out = 'docs/gates/fu-3'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const errors = [];
for (const skin of ['philips-like', 'saadat-like']) {
  const p = await b.newPage({ viewport: { width: 1000, height: 660 }, deviceScaleFactor: 0.8 });
  p.on('pageerror', (e) => errors.push(`${skin}: ${e}`));
  const untilSim = (s) => p.waitForFunction((x) => (window.__simT ?? 0) >= x, s, { timeout: 600_000, polling: 500 });
  const tile = (param) => p.locator(`.pme-stile[data-param="${param}"]`);
  await p.goto(`${base}/stage7f.html?skin=${skin}`);
  await p.waitForTimeout(2000);
  await p.click('#induction'); // TOF every 15 s + depth on at once; rocuronium at sim 180 s (×4)
  await untilSim(420); // 4 sim-min after rocuronium: TOF 0/4, the laryngoscopy stimulus over
  await p.click('#ptc'); // the PTC result is reported 23 s after the command
  await untilSim(460);
  await p.waitForFunction(() => /PTC/.test(document.querySelector('.pme-stile[data-param="NMT"] [data-pme="s"]')?.textContent ?? ''), null, { timeout: 60_000, polling: 500 });
  const nmt = await tile('NMT').innerText();
  const bfa = await tile('BFA').innerText();
  console.log(skin, JSON.stringify({ simT: await p.evaluate(() => window.__simT), nmt, bfa }));
  await p.evaluate(() => window.scrollTo(0, 0)); // the button clicks scrolled the page
  await p.screenshot({ path: `${out}/fu3-neuro-tiles-${skin}.png`, clip: { x: 0, y: 0, width: 1000, height: 650 } });
  await p.close();
}
await b.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
```

The prototype ran it (Chrome headless, `channel: 'chrome'` like `stage7f-shots.mjs`, ≈ 2 min per skin):
`(cd apps/demo && npx vite --port 4861 --strictPort &)` then
`(cd apps/demo && node scripts/fu3-neuro-tiles-shots.mjs http://localhost:4861 <out-dir>)` → exit 0,
`philips-like {"simT":461.3,"nmt":"NMT\nTOF\n0/4\nPTC 0","bfa":"BFA\n38\nSR 0"}`,
`saadat-like {"simT":460.0,"nmt":"NMT\nTOF\n0/4\nPTC 0","bfa":"BFA\n38\nBS% 0"}`; PNGs 61 KB / 63 KB (the 7f demo's
own DOM tiles beside the monitor read the same 0/4, PTC 0 and 38, SR 0 %). **PNGs must be ≤ 60 KB** (Global
Constraints; R50 finding 6): the 61/63 KB here were the pre-Task-14 run (the integrated run gave 49.3 / 50.1 KB). If
a run prints more than 60 KB, re-take it with `deviceScaleFactor: 0.7` in the script's `newPage` options (a local
edit of the one line `deviceScaleFactor: 0.8`, committed with the script) and record the value in the gate note. **The gate task** regenerates the
committed pair with `mkdir -p docs/gates/fu-3` and the same two commands with out-dir `docs/gates/fu-3`
(`fu3-neuro-tiles-philips-like.png`, `fu3-neuro-tiles-saadat-like.png`). With Task 14's 2 % dial the DI at sim ≈ 460 s
is expected a little higher (the shots above ran before Task 14; the propofol still dominates at 7.7 min) — record
the value the gate run prints.

- [x] **Step 10: Typecheck and commit**

Run: `npx -y pnpm@9.15.9 -r typecheck` — Expected: clean.

```bash
git add packages/renderer packages/skins apps/demo/src/stage7f.ts apps/demo/scripts/fu3-neuro-tiles-shots.mjs
git commit -m "feat(renderer): draw Stage 7f's NMT and BFA module tiles on philips-like and saadat-like (FU-3 item 11, R-7f-6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 14: Physiology console 7x.1 and the 7f demo's 2 % maintenance dial (item 12; demo, E-FU3-7)

**Files:**
- Modify: `apps/demo/src/physiology-console/meta.ts` (the `organs.iap` curated row; the `LUNG` table + `lungMeta`;
  BE/HCO3 tolerances; `metaOf` consults `lungMeta`)
- Modify: `apps/demo/src/physiology-console/organs.ts` (five `GROUP_BY_PREFIX` keys; one 7b line in `INTERNAL_PREFIXES`)
- Modify: `apps/demo/src/physiology-console/actions.ts` (`SENSORS` gains `co2: 'on'`)
- Modify: `apps/demo/src/stage7f.ts` (the vaporiser dial; Stage 7f's file, anchored by content; the incision line
  also carries 7e's `stimulus` event, which is kept verbatim — only the vaporiser call on it goes)
- Test: `apps/demo/src/physiology-console/lung-labels.test.ts` (new), `format.test.ts`, `organs.test.ts`,
  `actions.test.ts`, `model.test.ts` (one expectation: `organs.iap` is now `kidney`), `apps/demo/e2e/physiology-console.e2e.ts`
  (two assertions)

**Interfaces:**
- Consumes: the 7b `LungState` tree under `resp.lung` (engine-core `l2/lung/lung.ts`, `side.ts` `SideParams`/`LungParams`
  and `mechParams` unit order, `mechanics.ts`, `mix-o2.ts`, `mix-co2.ts`, `perfusion.ts`, `recruit.ts`, `venegas.ts`);
  7d's `organs.iap` (the `renal` event's `iapMmHg`, read only by `renalIn`) and `organs.conds` (profile conditions +
  `condition` events; `tbi` → brain params, `aki` → kidney, `hepaticFailure` → liver); the patient profile's
  `sensors.co2` (Stage 3 `l2/resp/pipeline.ts`: `'on'` starts the sidestream sampler attached).
- Produces: curated labels/units/ranks for every visible `resp.lung.*` leaf; `metaOf(p).tol === 1` for BE and HCO3
  paths; `groupOf('organs.iap') === 'kidney'`, `organs.conds.<id>` by organ; console presets with the CO2 line on.


**Why:** (a) `meta.ts` `metaOf` labels any uncurated path by its last segment: the 7b lung tree shows 137 raw rows at
rest (`cL`, `rLung`, bare indices `0`–`3` for per-side and per-unit arrays) plus machinery (`resp.lungCore`, a cache-key
string; `resp.lungT`; `resp.lung.nGas`; `tInsp`; `tExp0`). (b) `organs.ts` `GROUP_BY_PREFIX` has no key for 7d's
`organs.iap` or `organs.conds.*` → "Other". (c) `TOLERANCES` has no BE/HCO3 rule → the 2 % default: BE's baseline ≈ 0
makes its tolerance 0 (any 0.001 move highlights). (d) `actions.ts` `SENSORS` leaves `co2` out → the console's CO2 tile
reads `---` at rest. (e) the 7f demo dials sevoflurane 3 % at 330 s and 2.5 % at 1200 s: DI 30 at 13 min, deeper than
maintenance (G7f: Ali's call, 2 %). BE/HCO3 tolerance 1 mmol/L [ENG]: half the ±2 mmol/L normal BE range and a quarter
of 22–26 mmol/L HCO3, the size of the existing K 0.2 / pH 0.02 rules; 0.1 steps are analyser noise.

**Prototype numbers:** console unit tests 27 failing before (114 passing) → 141/141; 0 raw lung rows (69-row curated
table; five machinery keys internal); console e2e (Chromium) CO2 tile `---` → 36 mmHg at rest (28.8 s); 7f depth index
at 13 / 18 / 25 / 30 sim-min 31 / 30 / 32 / 35 → 38 / 39 / 41 / 42; the 7f screenshot script passes, 7 PNGs ≤ 60 KB,
the maintenance shot reads DI 37 (was 30) — the committed 7f gate PNGs are NOT regenerated.

- [x] **Step 1: Write the failing tests**

Create `apps/demo/src/physiology-console/lung-labels.test.ts` with exactly:

```ts
// 7x.1 (FU-3 item 12): the 7b lung tree (`resp.lung`) is labelled for a clinician — per side (0 = L, 1 = R) and per
// mechanical unit (0/1 = L fast/slow, 2/3 = R fast/slow: engine-core l2/lung/side.ts `mechParams`) — instead of raw
// keys and bare indices ("cL", "0").
import { describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { PRESETS } from './actions.ts';
import { ConsoleModel } from './model.ts';
import { metaOf } from './meta.ts';
import { isInternal } from './organs.ts';

describe('7b lung paths: curated labels and units', () => {
  it.each([
    ['resp.lung.lp.side.0.cL', 'L lung compliance', 'mL/cmH₂O', 1],
    ['resp.lung.lp.side.1.rLung', 'R airway resistance', 'cmH₂O/L/s', 1],
    ['resp.lung.lp.side.1.atel', 'R atelectasis (condition)', '%', 100],
    ['resp.lung.aer.1', 'R aerated fraction', '%', 100],
    ['resp.lung.perf.f.0', 'L perfusion share', '%', 100],
    ['resp.lung.perf.shunt.1', 'R shunt', '%', 100],
    ['resp.lung.o2.fa.1', 'R FAO₂', '%', 100],
    ['resp.lung.hpv.a1.0', 'L HPV activation (fast)', '', 1],
    ['resp.lung.rec.ind.1', 'R induction atelectasis', '%', 100],
    ['resp.lung.mech.v.2', 'R fast unit volume', 'mL', 1],
    ['resp.lung.co2.pA.0', 'L fast unit PACO₂', 'mmHg', 1],
    ['resp.lung.mp.units.3.rIn', 'R slow unit R insp', 'cmH₂O/L/s', 1000],
    ['resp.lung.lp.ccw', 'Chest-wall compliance', 'mL/cmH₂O', 1],
    ['resp.lung.peepTot', 'Total PEEP', 'cmH₂O', 1],
  ] as const)('%s → "%s" (%s)', (path, label, unit, scale) => {
    expect(metaOf(path)).toMatchObject({ label, unit, scale });
    expect(metaOf(path).rank).toBeLessThan(Number.POSITIVE_INFINITY);
  });

  it('every visible resp.lung leaf of a running MODELED engine is curated; per-lung rows name their side', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: PRESETS[0]?.profile, truthHz: 1 });
    const m = new ConsoleModel();
    e.on((x) => void m.ingest(x));
    e.advanceTo(10);
    const lung = [...m.cur.keys()].filter((p) => p.startsWith('resp.lung') && !isInternal(p));
    expect(lung.length).toBeGreaterThan(100);
    const raw = lung.filter((p) => metaOf(p).rank === Number.POSITIVE_INFINITY);
    expect(raw).toEqual([]);
    for (const p of lung.filter((x) => /\.\d+(\.|$)/.test(x))) expect(metaOf(p).label, p).toMatch(/^[LR] /);
  });
});
```

In `apps/demo/src/physiology-console/format.test.ts`, find:

```ts
    ['resp.temp.tc', '°C'], ['resp.etco2', 'mmHg'], ['mods.k', 'mmol/L'], ['mon.nibpSys', 'mmHg'], ['mon.nibpMean', 'mmHg'], ['mon.qtc', 'ms'],
```

and replace with:

```ts
    ['resp.temp.tc', '°C'], ['resp.etco2', 'mmHg'], ['mods.k', 'mmol/L'], ['mon.nibpSys', 'mmHg'], ['mon.nibpMean', 'mmHg'], ['mon.qtc', 'ms'],
    ['organs.iap', 'mmHg'], // 7x.1
```

In `apps/demo/src/physiology-console/format.test.ts`, find:

```ts
    ['blood.core.out.lactate', 1, 1.2, 1.4, 'up'], // 0.3 mmol/L (2 % would be 0.02)
```

and replace with:

```ts
    ['blood.core.out.lactate', 1, 1.2, 1.4, 'up'], // 0.3 mmol/L (2 % would be 0.02)
    // 7x.1 (FU-3 item 12): BE and HCO3 1 mmol/L (2 % of a BE near 0 is nothing: every 0.001 flagged; of HCO3 24, 0.48)
    ['blood.core.ab.be', 0, 0.8, 1.2, 'up'],
    ['ev.labs.values.be', -2, -2.8, -3.2, 'down'],
    ['blood.core.ab.hco3', 24, 23.2, 22.8, 'down'],
    ['ev.labs.values.hco3', 24, 24.9, 25.1, 'up'],
```

In `apps/demo/src/physiology-console/organs.test.ts`, find:

```ts
    ['ecmo.flowLpm', 'other'], ['organs.iap', 'other'], ['ev.somethingNew.x', 'other'],
```

and replace with:

```ts
    ['ecmo.flowLpm', 'other'], ['ev.somethingNew.x', 'other'],
    // 7x.1 (FU-3 item 12): 7d's intra-abdominal pressure is a kidney input; its condition list by the organ it drives
    // (tbi → brain, aki → kidney, hepaticFailure → liver; the profile's other conditions are inputs: controls)
    ['organs.iap', 'kidney'], ['organs.conds.tbi.severity', 'brain'], ['organs.conds.aki.severity', 'kidney'],
    ['organs.conds.hepaticFailure.severity', 'liver'], ['organs.conds.htn.id', 'controls'],
```

In `apps/demo/src/physiology-console/model.test.ts`, find:

```ts
      'pk.bus.cns.propCe': 'drugs', 'ecmo.flowLpm': 'other', 'organs.iap': 'other',
```

and replace with:

```ts
      'pk.bus.cns.propCe': 'drugs', 'ecmo.flowLpm': 'other', 'organs.iap': 'kidney', // 7x.1: IAP is a kidney input
```

In `apps/demo/src/physiology-console/actions.test.ts`, find:

```ts
  });
  it('every preset starts an engine with the invasive lines connected', () => {
```

and replace with:

```ts
  });
  it('7x.1 (FU-3 item 12): every preset starts with the CO2 sidestream line attached, so EtCO2 reads at rest', () => {
    for (const p of A.PRESETS) {
      expect(p.profile.sensors, p.id).toMatchObject({ co2: 'on' });
      const e = createEngine({ seed: 1, mode: 'modeled', patient: p.profile });
      let et: number | null | undefined;
      e.on((x) => {
        if (x.type === 'measurement' && x.values.etco2) et = x.values.etco2.value;
      });
      e.advanceTo(20);
      expect(et, p.id).toBeGreaterThan(20);
    }
  });
  it('every preset starts an engine with the invasive lines connected', () => {
```

- [x] **Step 2: Run them to verify they fail**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console`
Expected: FAIL, 27 of 141 tests (114 pass):
- `lung-labels.test.ts` 15 — e.g. `expected { label: 'cL', unit: '', …(2) } to match object { label: 'L lung compliance', …(2) }`;
  the running-engine test lists **137** uncurated `resp.lung*` leaves (`expected [ 'resp.lungCore', …(136) ] to deeply equal []`);
- `format.test.ts` 5 — the four BE/HCO3 rows (`blood.core.ab.be`: `expected 'up' to be null` at +0.8 from 0, the 2 %
  default of a BE near 0 flags every 0.001; `blood.core.ab.hco3`: `expected 'down' to be null` at −0.8 from 24,
  2 % = 0.48) and `organs.iap` unit `expected '' to be 'mmHg'`;
- `organs.test.ts` 5 — `organs.iap → kidney` (`expected 'other' to be 'kidney'`), the four `organs.conds.*` rows;
- `model.test.ts` 1 — `"organs.iap": "other"` received vs `"kidney"` expected;
- `actions.test.ts` 1 — `adult: expected { abp: 'connected', …(4) } to match object { co2: 'on' }`.

- [x] **Step 3: Implement**

In `apps/demo/src/physiology-console/meta.ts`, find:

```ts
  ['resp.temp.tc', 'Core temp (model)', '°C', 2],
```

and replace with:

```ts
  ['resp.temp.tc', 'Core temp (model)', '°C', 2],
  // organs (7x.1): 7d's intra-abdominal pressure (the `renal` event's iapMmHg), a kidney input
  ['organs.iap', 'Intra-abdominal pressure', 'mmHg', 0],
```

In `apps/demo/src/physiology-console/meta.ts`, find:

```ts
 * Absolute change tolerances by field name (whole path; `.to`/`.from` of an L1 ramp count as the variable) [ENG]:
 * pH 0.02; temperature 0.2 °C; SpO2/SaO2/SvO2 one point; PaCO2/EtCO2 2 mmHg; K 0.2 mmol/L; lactate 0.3 mmol/L. `k`
 * is potassium only under `mods`, the L1 variable, `blood` and the lab events (elsewhere it is a step index or a
 * valve constant).
```

and replace with:

```ts
 * 7x.1 (FU-3 item 12): the 7b lung tree `resp.lung` (engine-core l2/lung: LungState in lung.ts, SideParams/LungParams
 * in side.ts, mechanics.ts, mix-o2.ts, mix-co2.ts, perfusion.ts, recruit.ts, venegas.ts). `#` stands for a side index
 * (0 = L, 1 = R: params.ts SIDE_SHARE) and `@` for a mechanical-unit index (0/1 = L fast/slow, 2/3 = R fast/slow:
 * side.ts `mechParams`); the label is then prefixed with the side or the unit. Fractions show in % (scale 100); the
 * unit mechanics store resistances per mL (×1000 → per L). Ranked after CURATED, in this order.
 */
const LUNG: Entry[] = [
  // whole lung: breath summary, gas exchange, the resolved global parameters
  ['peepTot', 'Total PEEP', 'cmH₂O', 1], ['pInsp', 'End-inspiratory alveolar pressure', 'cmH₂O', 1], ['tauBar', 'Expiratory τ', 's', 2],
  ['teS', 'Expiratory time', 's', 2], ['inInsp', 'In inspiration', ''], ['mainstem', 'Ventilated mainstem', ''], ['frcGaMl', 'FRC (anaesthetised)', 'mL', 0],
  ['mech.paw', 'Airway-opening pressure', 'cmH₂O', 1], ['mech.pcar', 'Carina pressure', 'cmH₂O', 1],
  ['o2.pao2', 'PaO₂ (lung)', 'mmHg', 0], ['o2.sa', 'SaO₂ (lung)', '%', 1, 100], ['o2.cv', 'CvO₂', 'mL/L', 0],
  ['co2.pv', 'PvCO₂', 'mmHg', 1], ['co2.g', 'EtCO₂/PaCO₂', '', 2], ['co2.e', 'CO₂ elimination efficiency', '', 2],
  ['co2.riseIII', 'Capnogram phase III rise', 'mmHg', 1], ['co2.faCo2', 'FACO₂', '%', 2, 100],
  ['lp.ccw', 'Chest-wall compliance', 'mL/cmH₂O', 0], ['lp.rTube', 'Tube resistance', 'cmH₂O/L/s', 1], ['lp.extraShunt', 'Extrapulmonary shunt', '%', 1, 100],
  ['lp.frcMult', 'FRC multiplier', '×', 2], ['lp.ibwKg', 'Ideal body weight', 'kg', 0], ['lp.pvr', 'PVR multiplier (conditions)', '×', 2],
  ['lp.tIt', 'Airway→pleura transmission', '', 2], ['lp.pPtx', 'Pneumothorax pressure', 'cmH₂O', 1], ['lp.leakFrac', 'Airway leak', '%', 0, 100],
  ['lp.co2Slope', 'Capnogram slope multiplier', '×', 2], ['lp.pMax', 'Inspiratory strength multiplier', '×', 2],
  ['mp.ccw', 'Chest-wall compliance (units)', 'mL/cmH₂O', 0], ['mp.rTube', 'Tube resistance (units)', 'cmH₂O/L/s', 1, 1000],
  // per side (#): state, then the resolved parameters
  ['aer.#', 'aerated fraction', '%', 0, 100], ['perf.f.#', 'perfusion share', '%', 0, 100], ['perf.shunt.#', 'shunt', '%', 1, 100],
  ['perf.hypoxic.#', 'hypoxic fraction', '%', 0, 100], ['perf.pvrMult.#', 'PVR multiplier', '×', 2], ['o2.fa.#', 'FAO₂', '%', 1, 100],
  ['hpv.a1.#', 'HPV activation (fast)', '', 2], ['hpv.a2.#', 'HPV activation (slow)', '', 2], ['hpv.stimS.#', 'hypoxic stimulus time', 's', 0],
  ['rec.ind.#', 'induction atelectasis', '%', 0, 100], ['rec.blk.#', 'collapse behind a blocked bronchus', '%', 0, 100], ['rec.open.#', 'recruited fraction', '%', 0, 100],
  ['lp.side.#.cL', 'lung compliance', 'mL/cmH₂O', 1], ['lp.side.#.rLung', 'airway resistance', 'cmH₂O/L/s', 1], ['lp.side.#.rawExp', 'exp/insp resistance ratio', '', 2],
  ['lp.side.#.aerRef', 'aerated fraction at the set compliance', '%', 0, 100], ['lp.side.#.atel', 'atelectasis (condition)', '%', 0, 100],
  ['lp.side.#.consol', 'consolidation', '%', 0, 100], ['lp.side.#.pOpen', 'opening pressure', 'cmH₂O', 0], ['lp.side.#.tauRecS', 'recruitment τ', 's', 1],
  ['lp.side.#.fSlow', 'slow-unit fraction', '%', 0, 100], ['lp.side.#.tauSlowS', 'slow-unit τ', 's', 2], ['lp.side.#.vqLow', 'low V/Q admixture', '%', 1, 100],
  ['lp.side.#.vdAlv', 'alveolar dead space', '%', 1, 100], ['lp.side.#.dl', 'diffusion factor', '×', 2], ['lp.side.#.hpv', 'HPV maximum', '', 2],
  ['lp.side.#.perf', 'perfusion multiplier', '×', 2],
  // per mechanical unit (@)
  ['mech.v.@', 'volume', 'mL', 0], ['mech.q.@', 'flow', 'mL/s', 0], ['tidal.@', 'tidal volume', 'mL', 0], ['v0.@', 'volume at inspiration start', 'mL', 0],
  ['co2.pA.@', 'PACO₂', 'mmHg', 1], ['mp.units.@.rIn', 'R insp', 'cmH₂O/L/s', 1, 1000], ['mp.units.@.rEx', 'R exp', 'cmH₂O/L/s', 1, 1000],
  ['mp.units.@.sig.a', 'P–V lower asymptote', 'mL', 0], ['mp.units.@.sig.b', 'P–V range', 'mL', 0], ['mp.units.@.sig.c', 'P–V inflection', 'cmH₂O', 1],
  ['mp.units.@.sig.d', 'P–V width', 'cmH₂O', 1], ['mp.blocked.@', 'blocked', ''],
];
const SIDE = ['L', 'R'];
const UNIT = ['L fast unit', 'L slow unit', 'R fast unit', 'R slow unit'];
const LUNG_BY_KEY = new Map(LUNG.map((e, i) => [e[0], { e, rank: CURATED.length + i }]));
/** Meta of a `resp.lung.*` path from LUNG (the index segment replaced by `#` or `@`), or undefined. */
function lungMeta(path: string): Meta | undefined {
  if (!path.startsWith('resp.lung.')) return undefined;
  const rest = path.slice('resp.lung.'.length);
  const idx = /(^|\.)(\d)(\.|$)/.exec(rest);
  const i = idx ? Number(idx[2]) : -1;
  const hit = LUNG_BY_KEY.get(rest) ?? (idx ? (LUNG_BY_KEY.get(rest.replace(/(^|\.)\d(\.|$)/, '$1#$2')) ?? LUNG_BY_KEY.get(rest.replace(/(^|\.)\d(\.|$)/, '$1@$2'))) : undefined);
  if (!hit) return undefined;
  const [key, label, unit, digits, scale] = hit.e;
  const who = key.includes('#') ? SIDE[i] : key.includes('@') ? UNIT[i] : undefined;
  if (idx && who === undefined) return undefined;
  return { label: who ? `${who} ${label}` : label, unit, digits, scale: scale ?? 1, rank: hit.rank + (i > 0 ? i / 10 : 0) };
}

/**
 * Absolute change tolerances by field name (whole path; `.to`/`.from` of an L1 ramp count as the variable) [ENG]:
 * pH 0.02; temperature 0.2 °C; SpO2/SaO2/SvO2 one point; PaCO2/EtCO2 2 mmHg; K 0.2 mmol/L; lactate 0.3 mmol/L;
 * 7x.1: BE and HCO3 1 mmol/L (half the ±2 mmol/L normal BE range, a quarter of the 22–26 mmol/L HCO3 range; the blood
 * gas prints both to 0.1 but a 0.1 step is analyser noise, not a change). `k` is potassium only under `mods`, the L1
 * variable, `blood` and the lab events (elsewhere it is a step index or a valve constant).
```

In `apps/demo/src/physiology-console/meta.ts`, find:

```ts
  [/(^|\.)(lac|lactate|lactateMmolL)$/i, 0.3],
```

and replace with:

```ts
  [/(^|\.)(lac|lactate|lactateMmolL)$/i, 0.3],
  [/(^|\.)(be|sbe|beB|beEcf|baseExcess)(\.(to|from))?$/, 1], // 7x.1
  [/(^|\.)(hco3|hco3Std|bicarbonate)(\.(to|from))?$/i, 1], // 7x.1
```

In `apps/demo/src/physiology-console/meta.ts`, find:

```ts
  if (hit) return hit;
```

and replace with:

```ts
  if (hit) return hit;
  const lung = lungMeta(path); // 7x.1
  if (lung) {
    const tol = tolOf(path);
    if (tol !== undefined) lung.tol = tol;
    cache.set(path, lung);
    return lung;
  }
```

In `apps/demo/src/physiology-console/organs.ts`, find:

```ts
  'ev.organs.brain': 'brain', 'ev.organs.renal': 'kidney', 'ev.organs.kidney': 'kidney', 'ev.organs.liver': 'liver',
```

and replace with:

```ts
  'ev.organs.brain': 'brain', 'ev.organs.renal': 'kidney', 'ev.organs.kidney': 'kidney', 'ev.organs.liver': 'liver',
  // 7x.1: the intra-abdominal pressure is a kidney input (7d renalIn); the condition list goes by the organ each id
  // drives (tbi → brain params, aki → kidney, hepaticFailure → liver); the profile's other ids are inputs (controls)
  'organs.iap': 'kidney', 'organs.conds': 'controls', 'organs.conds.tbi': 'brain', 'organs.conds.aki': 'kidney', 'organs.conds.hepaticFailure': 'liver',
```

In `apps/demo/src/physiology-console/organs.ts`, find:

```ts
  'resp.tempSite', 'resp.shownCo2',
```

and replace with:

```ts
  'resp.tempSite', 'resp.shownCo2',
  // 7b lung machinery (7x.1): the parameter-cache key, the step time, the gas-step counter and the breath timestamps
  'resp.lungCore', 'resp.lungT', 'resp.lung.nGas', 'resp.lung.tInsp', 'resp.lung.tExp0',
```

In `apps/demo/src/physiology-console/actions.ts`, find:

```ts
const SENSORS: PatientProfile['sensors'] = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', nibp: 'on' };
```

and replace with:

```ts
// 7x.1: the CO2 sampling line starts attached (sidestream, Stage 3's default sampler), so EtCO2 reads at rest; the
// instructor's `attachSensor` command still detaches or re-attaches it
const SENSORS: PatientProfile['sensors'] = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', nibp: 'on', co2: 'on' };
```

- [x] **Step 4: Run them to verify they pass**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run`
Expected: PASS, 9 files / 141 tests (≈ 11 s).

- [x] **Step 5: The console e2e — CO2 reads at rest**

In `apps/demo/e2e/physiology-console.e2e.ts`, find:

```ts
  await expect(page.locator('details[data-group="monitor"] tr[data-path="mon.hr"] .v')).toHaveText(/^\d+$/);
```

and replace with:

```ts
  await expect(page.locator('details[data-group="monitor"] tr[data-path="mon.hr"] .v')).toHaveText(/^\d+$/);
  // 7x.1 (FU-3 item 12): the CO2 sampling line starts attached, so the monitor's CO2 tile and mon.etco2 read at rest
  await expect(page.locator('.pme-stile[data-param="CO2"] [data-pme="v"]')).toHaveText(/^\d+$/);
  await expect(page.locator('details[data-group="monitor"] tr[data-path="mon.etco2"] .v')).toHaveText(/^\d+$/);
```

Run: `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/physiology-console.e2e.ts`
Expected: PASS (≈ 30 s; `render path worker-raf; truth 1259 leaves, 22558 B`; EtCO2 36 mmHg at rest on the tile).
Without the `actions.ts` change the new line fails: `expect(locator).toHaveText(expected) failed … Received string: "---"`.
The test rewrites `docs/gates/stage-7x/*.jpg` (9 files): restore them (`git checkout -- docs/gates/stage-7x`) unless
the gate wants the console evidence refreshed (the refreshed `rest-left.jpg` shows the CO2 tile at 36).

- [x] **Step 6: The 7f demo's maintenance dial (item 12)**

In `apps/demo/src/stage7f.ts`, find:

```ts
    void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 3, fgfLpm: 6 }); // 7g's vaporiser (R51 §4); over-pressure for the wash-in
    log('ventilator, sevoflurane dial 3 % (FGF 6 L/min)');
  });
  at(1200, () => { void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 }); void ev({ kind: 'stimulus', intensity: 1 }); log('incision (stimulus 1, held)'); });
```

and replace with:

```ts
    // 7g's vaporiser (R51 §4). Maintenance dial 2 % (FU-3 item 12, Ali's call): 3 % on top of the propofol read DI 30
    // at 13 min (gate 7f); 2 % reads DI 38 at 13 min and 41–42 at 25–30 min once the propofol has worn off
    void ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 6 });
    log('ventilator, sevoflurane dial 2 % (FGF 6 L/min)');
  });
  at(1200, () => { void ev({ kind: 'stimulus', intensity: 1 }); log('incision (stimulus 1, held)'); });
```

Check: `(cd apps/demo && npx vite --port 4861 --strictPort &)` then
`(cd apps/demo && node scripts/stage7f-shots.mjs http://localhost:4861 <out-dir>)` — exit 0 and seven PNGs ≤ 60 KB
(see Numbers). The committed 7f gate PNGs are NOT regenerated by this task (the gate task decides; the depth index
in `7f-sevo-maintenance.png` moves from 30 to 37).

- [x] **Step 7: Typecheck and commit**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck` — Expected: clean.

```bash
git add apps/demo/src/physiology-console apps/demo/e2e/physiology-console.e2e.ts
git commit -m "feat(demo): physiology console 7x.1 — 7b lung labels, organs.iap/conds grouping, BE/HCO3 tolerances, CO2 line attached (FU-3 item 12)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
git add apps/demo/src/stage7f.ts
git commit -m "chore(demo): 7f induction script maintains sevoflurane at 2 % so the depth index reads maintenance (FU-3 item 12)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 15: Gate — full verification, evidence screenshots, gate note, pull request

**Files:**
- Create: `docs/gates/fu-3.md`, `docs/gates/fu-3/fu3-neuro-tiles-philips-like.png`,
  `docs/gates/fu-3/fu3-neuro-tiles-saadat-like.png`
- Modify: this plan (tick the boxes)

**Interfaces:**
- Consumes: Task 13's `apps/demo/scripts/fu3-neuro-tiles-shots.mjs` (headless system Chrome; `?skin=` on the 7f page).
- Produces: two PNGs ≤ 60 KB, the gate note, the PR.

- [x] **Step 1: Merge main and run everything**

```bash
git fetch origin && git merge origin/main
npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck
CI=1 npx -y pnpm@9.15.9 test
(cd packages/engine-core && PME_TEST_SET=fast CI=1 npx vitest run && PME_TEST_SET=slow CI=1 npx vitest run)
npx -y pnpm@9.15.9 build
npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
git status --short docs/gates   # the e2e rewrites earlier stages' committed evidence images: restore them
git checkout -- $(git diff --name-only -- docs/gates | grep -v '^docs/gates/fu-3/')
```

Run the long commands in the background with logs under `<scratchpad>/fu-3-followups/` and bound every wait (an
`until` loop of ≤ 10 min per wait that re-checks the process). Expected: all green; `check-notices: OK` (FU-3 adds
citations in comments, no third-party code or data). Integrated prototype counts (base `d525eed` + Tasks 0–14, no 7e):
engine-core fast set 228 files / 996 tests passed, 1 skipped; slow set 38 files / 163 passed; audio 58, skins 173,
ventilator 88, controller 215, renderer 76, demo 141; e2e (system Chrome) 30 passed, 1 skipped (9.2 min); validation 106 passed, 11 skipped and ONE failure that
disappears on a base with 7e (t16 `condition sepsis`, Task 11). A timing test can fail under a loaded machine
(`truth-event` "costs < 0.2 ms per call" read 1.31 ms once while nine prototypers were running; ventilator `ports` timed
out once at 5 s) — re-run the file alone before treating it as a regression. The 24 h long-run horizon is the local
requirement: run `packages/engine-core` once without `CI=1` on an idle machine and record the wall time. If a sibling
stage merged meanwhile (7d, 7e), re-run the FU-3 engine tests and record any number that moved.

If the CI `build` job's headless WebKit times out on an e2e that FU-3 changed (`physiology-console.e2e.ts` is already
Chromium-only since G7x), skip WebKit in that file with the G7g comment and record it in the gate note.

- [x] **Step 2: Evidence screenshots (Chromium only)**

```bash
(cd apps/demo && npx vite --port 4861 --strictPort > <scratchpad>/fu-3-followups/vite.log 2>&1 &)
mkdir -p docs/gates/fu-3
node apps/demo/scripts/fu3-neuro-tiles-shots.mjs http://localhost:4861 docs/gates/fu-3
ls -la docs/gates/fu-3   # two PNGs, each ≤ 60 KB (prototype ≈ 50 KB)
pkill -f "vite --port 4861"
```

PNGs must be ≤ 60 KB; if the run prints more, re-take with `deviceScaleFactor: 0.7` (the one `newPage` option in
`apps/demo/scripts/fu3-neuro-tiles-shots.mjs`) and record the value in the gate note (R50 finding 6).

Expected console lines (integrated prototype, after Task 14's 2 % dial):
`philips-like {"simT":461.4,"nmt":"NMT\nTOF\n0/4\nPTC 0","bfa":"BFA\n40\nSR 0"}` and
`saadat-like {"simT":461.3,"nmt":"NMT\nTOF\n0/4\nPTC 0","bfa":"BFA\n40\nBS% 0"}`; PNGs 49.3 / 50.1 KB. Look at both images: the NMT and BFA tiles are in the skin's tile grid, drawn by
the renderer (not the demo's DOM panel).

- [x] **Step 3: Write `docs/gates/fu-3.md`** with these sections, filled with YOUR measured numbers:
  1. *What shipped* — one row per task (0–14): item, mechanism, files, tests; the exceptions E-FU3-0…10, in numeric
     order, with the lines each touched; Task 0 applied or not (expected: not needed, `rr: 18` already on main + 7d).
  2. *Numbers vs bands* — the "Prototype results" table re-measured: before/after for every row, band, pass/`it.fails`;
     Task 5's post-arrest window (SaO2, SpO2, PR, ABP PP, rhythm rate, monitor HR) and the E-FU3-10 breathing window
     (RR numeric, VA, CO2 range) with the measured numbers — say whether E-FU3-10 met its band or is `it.fails`; the
     reversal time in seconds against the 5 s floor; the per-tick figures of `circ-longrun` (≤ 0.3 ms) and
     `blood-budget` (< 0.1 ms) after Tasks 4 and 5; the ten profile-document rows (Task 11) incl. t16 on the real 7e
     (or its `it.fails` refusal if 7e was absent — Step 3b); the blood-oracle rows if Pulse was run (Task 12 Step 11;
     otherwise say "not run" — CI skips it).
  3. *Screenshots* — embed the two PNGs with one sentence each (sizes, and the `deviceScaleFactor` used).
  4. *Decisions* D1–D12 and rulings R-1…R-8 one line each; *Deviations* — anything that differs from this plan and
     why, and ALWAYS these named items: **(a) validation t25 now arrests at ≈ 650 s** (rocuronium, never ventilated for
     29 min); its graded `rr` row is unchanged and reads 1 s before and after; ventilating the document is the
     orchestrator's call — "ventilate t25?" (Q-FU3-16a; R50 finding 9); **(b)** E-FU3-10's gate closes on CBF < 20 %
     OR no flow (R-2, fixer's reading); **(c)** E-FU3-9 also freezes the arterial gas in unperfused asystole/VF without
     CPR in either mode. *Smaller notes from the review* — the sux effect-site EC50 lives in both 7g's and 7f's rows
     (pre-existing duplication; tables §6.1 citation is the orchestrator's); `hasLimit` in Task 8 is a hard-coded skin
     list, so mindray-like's documented-but-missing `CVP_M` is pinned as "correct" (Q-FU3-7c).
  5. *Corrections to earlier notes* — G7f's "7g's volatile reflex blunting does not reach the circulation" (it did reach
     `stepBaro`; the operating point hid it, Task 3); G8a's "43 re-raises" (the soak JSON holds 42) and "resting CVP
     4.9–7.6" (the soak patient reads 8.85–10.17, Task 8).
  6. *For the orchestrator / Ali* — the open questions below, the "Item 7: the fix is deferred" ruling request, item 13
     (amiodarone), and the calibration rows the profile documents produced.
  7. *Test counts* — per package, fast/slow split, e2e list.

- [x] **Step 4: Commit, push, open the PR (do NOT merge)**

```bash
git add docs/gates/fu-3.md docs/gates/fu-3 docs/plans/fu-3-followups.md
git commit -m "docs: FU-3 gate note and evidence screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
gh pr create --base main --head fu-3-followups --title "FU-3: follow-ups (sux PK, volatile reflex, MANUAL check-18 hold, hypoxic arrest, AAI/DDD sensing, AF HR numeric, CVP evidence, seam rename, scenario profile, blood oracle, NMT/BFA tiles, console 7x.1)" --body "$(cat <<'BODY'
Implements docs/plans/fu-3-followups.md. Gate note: docs/gates/fu-3.md.

- Item 1 (7g, E-FU3-1): succinylcholine onto Roy 2002's CL/V1 (0.037 L/kg/min, 0.038 L/kg), ke0 0.1475/0.236 [ENG], effect-site EC50 1160 γ 6: onset 0.17 → 0.73 min, T1 10 % 5.37 → 6.98, T1 90 % 12.68 → 11.97 (label bands); homozygous PChE 0.003 → 0.011 keeps 4–8 h. 7f's sux it.fails flipped.
- Item 2: R-7f-7 stays it.fails — capacity-limited (sugammadex 16.1 µmol vs 63.5 µmol rocuronium; ideal-binder ceiling 0.834, 7g 0.833); the mechanism reproduces Eleveld 2007 at its own dose pair. Band retarget = Ali.
- Item 3 (7g data): volatile rows gain propofol's sympathetic-HR-arm term (gvHr −1.0/MAC): reflex drop under ≈ 1 MAC sevoflurane 25.5 → 5.0 bpm vs 12.0 awake; sevoflurane HR 93.5 → 75.0 (Ebert 1995: unchanged). R-7f-9 flipped.
- Item 4 (7a MANUAL): the held LV Emax is held against the kIsch it was set against — check 18 recovery MAP 125.3 → 81.1, CBF 0.837; flipped. Defect 1 (kIsch floor, LVEDP 46 at MAP 65) stays it.fails: every guard breaks Stage 2 bands (ruling requested).
- Item 16 (7a MODELED, E-FU3-8/9/10): asphyxial sequence — arterial O2 content in the coronary supply, hypoxic SA-node and myocardial depression (held while pulseless), seeded arrest (PEA / asystole 2/30 / VF 0.1): apnoeic paralysed adult HR < 40 at +2.55 min and PEA at +7.77 min after SaO2 < 60 % (DeBehnke 1995, Varvarousi 2011/2015); the arrest stays one — 6–10 min later SaO2 0.33 %, SpO2/PR invalid, ABP flat (PP ≤ 0.33 mmHg), rate 30 (no arterial re-oxygenation at zero output, 7b E-FU3-9; brainstem-perfusion gate on the MODELED drive, 7f E-FU3-10: <measured RR/VA>); FiO2 1 at the bradycardia recovers HR ≥ 60 in 7.0 s (floor 5 s = lung-to-ear delay); MANUAL and the Stage 3 desaturation times unchanged; validation t25 now arrests at ≈ 650 s (deviation, "ventilate t25?").
- Item 5 (l2/ecg, E-FU3-3): AAI/DDD escape at the programmed lower rate; an hr above it is intrinsic — AAI bleed: 96 atrial spikes → 0, 96 sinus beats; DDD atrial-sensed, V-paced 160 ms after each P.
- Item 6 (L3, E-FU3-4): the HR numeric uses the active skin's disclosed 12-RR method — philips-like AF 130 +4.8 % → +0.8 %; trimmed-mean skins keep theirs.
- Item 7: CVP alarm default is right (Philips 0–10, Saadat −5–15 match their manuals); 7a's MANUAL CVP under PPV rises by T_IT 0.65 (PEEP 5 → 15 +4.8 vs brief 2.2–3.7) — pinned it.fails; the fix moves five calibrated bands → deferred to a ruling (plan section "Item 7").
- Item 8: renal seam `uopMlH` → `uopAboveBasalMlH` (7c type, 7d writer), meaning pinned on the real 7c core.
- Item 9: optional `patient.profile` in pme-scenario/1 → `engineOptionsOf`; 9 of 10 "not measurable" documents now run (rows reported, not tuned); t22 needs a neuraxial owner; <t16 on 7e, or it.fails with the refusal while 7e is absent>.
- Item 10: 7c's Pulse blood oracle adopted; one loader, one variable (PME_PULSE_DIR); O13b baseline read before the dose (Na 143 → 140); per-row verdicts pinned; the O2b lactate / O3b Hb expect-differ rows now inside Pulse's tolerance recorded as fail with numbers.
- Item 11: renderer NMT/BFA module tiles on philips-like and saadat-like (R-7f-6).
- Item 12: console 7x.1 (lung labels, organs.iap/conds grouping, BE/HCO3 tolerances, CO2 line attached); 7f demo maintenance dial 2 %.
- Item 13 (amiodarone AV-node strength, Q-FU2-9): Ali's calibration call — no change.
- No band widened.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Report: commits, test counts, the numbers table, deviations, anything undone. Stop.

---

## Item 7: the fix is deferred (measured; NOT executed — R45, the FU-2 item-6 precedent)

The mechanism below makes both Task 8 rows pass and removes the soak's 42 raises, but it moves five calibrated bands
(measured on `d525eed` + this fix alone, and again on the integrated prototype with every FU-3 task and this fix in
place of Task 8 — the same numbers):

| Test (owner) | Band | Without the fix | With the fix |
|---|---|---|---|
| Task 8 PEEP 5 → 15 step | 2.2–3.7 mmHg | 4.82 (`it.fails`) | **2.99** |
| Task 8 soak CVP max / raises per h | < 9.5 / 0 | 10.17 / 42 (`it.fails`) | **8.76 / 0** |
| `organs-htn` check 18 MAP 65 premise (7d) | mapLow 62–68 | 64.4 | **72.4 ✗** |
| `organs-htn` check 18 hypocapnia (7d) | 0.35–0.40 | 0.374 | **0.437 ✗** |
| `blood-stage3-recheck` OLV nadir (7c) | 88–96 % | 88.7 | **87.5 ✗** |
| `link-r36` PH crisis EtCO2 rise (Stage V) | ≥ 5 mmHg | +6.8 | **+3.8 ✗** |
| `capture-match` SBP (8a) | 130 ± 8 | 126.4 | **121.4 ✗** |
| `lung-circ` OLV flow share (7b/7c) | ≤ 0.30 | 0.307 (`it.fails`) | 0.293 ✓ |
| `link-r27` ARDS recruitment; cardiogenic oedema (Stage V) | as titled | `it.fails` | pass ✓ |
| philips-like soak at PEEP 10 | — | CVP 11.82, 1 raise/h | CVP 9.62, 292 raises/h (flaps on the limit) |

Why the collateral: each of those rigs is a MANUAL rig ventilated from t = 0, so the volume tracker filled it by
T_IT × Paw more than the instructor's CVP implied (the check-18 rig: +763 mL of stressed volume at baseline, LVEDP 26 —
the same over-filling Task 4 found; its MAP-65 premise holds only while the 90/52 pair is NOT met, a knife edge). The
bands were calibrated on the over-filled rigs. Ruling requested (Q-FU3-7a): land the fix and re-derive the five rigs'
premises (7d check 18, 7c OLV re-check, R36, capture-match), or keep T_IT in the MANUAL CVP target and record the brief
§4.9 row as a calibration item. If ruled "land", the executor adds a task with exactly these blocks (prototype
`scratch/proto-fu3b-cvp`, commits `c579d58`, `acfb8ab`, `0941f5a`, `e54e1e1`) and turns Task 8's two `it.fails` into
`it` (titles without the measurement), and re-measures the five rows above for the ruling's re-derivation:

**The mechanism (`l2/hemo/pipeline.ts`, 7a):**

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find (block 1):

```ts
import { effectiveRateBpm } from '../ecg/rhythms.ts'; // FU-2
import { CPR_CARDIAC_MMHG, CPR_THORACIC_MMHG as CPR_THORACIC_7A, H_S as CIRC_H, P_PL0 } from '../circ/params.ts'; // Stage 7a

```

and replace with:

```ts
import { effectiveRateBpm } from '../ecg/rhythms.ts'; // FU-2
import { CPR_CARDIAC_MMHG, CPR_THORACIC_MMHG as CPR_THORACIC_7A, H_S as CIRC_H, P_PL0, T_IT } from '../circ/params.ts'; // Stage 7a

```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find (block 2):

```ts
export const MANUAL_HOLD_MMHG = 1; // Stage 7a [ENG]: SBP/DBP hold tolerance of the per-beat pressure tracker
/** Decision 9: hypovolaemia (volumeStatus < 1) lowers the CVP the tracker aims for, so stressed volume falls. */
```

and replace with:

```ts
export const MANUAL_HOLD_MMHG = 1; // Stage 7a [ENG]: SBP/DBP hold tolerance of the per-beat pressure tracker
/**
 * FU-3 item 7: the share of the alveolar pressure a MANUAL CVP target sits under — the tables' `tIt` default 0.4
 * (Q28, stage-7 tables §2 "Airway→pleural transmission", which replaced the brief's "effective RAP ↑ 30–50 % of the
 * mean-airway-pressure change", brief §4.9). T_IT itself was raised to 0.65 by the R44 PPV calibration; that raise
 * must not move the instructor's CVP (it put the 8a soak patient, CVP 6 at PEEP 5, at 9.4 on the 10 mmHg limit).
 */
export const MANUAL_CVP_PAW_FRACTION = 0.4;
/** Decision 9: hypovolaemia (volumeStatus < 1) lowers the CVP the tracker aims for, so stressed volume falls. */
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find (block 3):

```ts
      const periFluid = hs.circOut.pPeri - Math.max(0, c.p.periA * (Math.exp(c.p.periLambda * (vh - c.p.v0Peri)) - 1)); // tamponade share
      const cvpNow = hs.circOut.pRa - Math.max(0, hs.circOut.pIt - P_PL0) - periFluid; // spontaneous dips average out
      const pasT = l1Value(ctx.l1, 'papSys', t1);
```

and replace with:

```ts
      const periFluid = hs.circOut.pPeri - Math.max(0, c.p.periA * (Math.exp(c.p.periLambda * (vh - c.p.v0Peri)) - 1)); // tamponade share
      // airway share of the pleural change (ventilator or spontaneous; 7a's own tension-PTX pressure excluded): a
      // positive-pressure rise counts at MANUAL_CVP_PAW_FRACTION of the alveolar pressure, not T_IT (FU-3 item 7)
      const pAw = hs.circOut.pIt - c.ext.pPtx - P_PL0;
      const cvpNow = hs.circOut.pRa - Math.max(0, c.ext.pPtx + (pAw > 0 ? MANUAL_CVP_PAW_FRACTION / T_IT : 1) * pAw) - periFluid; // spontaneous dips average out
      const pasT = l1Value(ctx.l1, 'papSys', t1);
```


**The sibling re-records the prototype made (for the ruling; each is a band-preserving title/comment change or an
`it.fails` ↔ `it` flip with the measurement):**


In `packages/engine-core/test/engine/lung-circ.test.ts`, find:

```ts
  // Candidate mechanism (calibration queue): a mixed-venous PO2 term and HPV potentiation by hypercapnia/acidosis.
  it.fails('OLV: HPV raises the isolated lung\'s PVR and its measured flow falls to ≤ 30 % of pulmonary flow', async () => {
    const r = rig3({ patient: { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M' } });
```

and replace with:

```ts
  // Candidate mechanism (calibration queue): a mixed-venous PO2 term and HPV potentiation by hypercapnia/acidosis.
  // FU-3 item 7: the MANUAL CVP target no longer sits under the whole T_IT pleural rise of this rig's ventilator
  // (MANUAL_CVP_PAW_FRACTION 0.4): less venous volume is added at start, pvrLungL 1.84 → 1.97, share 0.307 → 0.293.
  it('OLV: HPV raises the isolated lung\'s PVR and its measured flow falls to ≤ 30 % of pulmonary flow', async () => {
    const r = rig3({ patient: { ageY: 55, weightKg: 70, heightCm: 175, sex: 'M' } });
```

In `packages/ventilator/test/link-r27.test.ts`, find (block 1):

```ts
  // two O2 stores it is 98 → 95.0 (−3.0), exactly at the band edge (> 3). Main before 7a: −5. it.fails keeps CI green and flags it.
  it.fails('ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5', async () => {
    const s = createLinkedSim({ profile: 'ards-moderate', vent: { vt: 420, pmax: 45, fio2: 60 } });
```

and replace with:

```ts
  // two O2 stores it is 98 → 95.0 (−3.0), exactly at the band edge (> 3). Main before 7a: −5. it.fails keeps CI green and flags it.
  // FU-3 item 7: the MANUAL CVP target sits under 0.4 (not T_IT 0.65) of the alveolar pressure, so this rig starts with
  // less venous volume (CVP 9.5 → 8.2, CO 5.96 → 5.17): SpO2 92 → 97 at PEEP 15 and back to 93 (−4) — the band is met.
  it('ARDS moderate PEEP 5 → 15 (FiO2 0.6): SpO2 rises ≥ 5 over 1–4 min (recruitment), falls again within 60 s of PEEP 5', async () => {
    const s = createLinkedSim({ profile: 'ards-moderate', vent: { vt: 420, pmax: 45, fio2: 60 } });
```

In `packages/ventilator/test/link-r27.test.ts`, find (block 2):

```ts
  // stays it.fails, deferred (gate note, NR-3)
  it.fails('cardiogenic oedema PEEP 5 → 12: SpO2 rises and CO falls', async () => {
    const s = createLinkedSim({ profile: 'oedema-cardiogenic' });
```

and replace with:

```ts
  // stays it.fails, deferred (gate note, NR-3)
  // FU-3 item 7: with the MANUAL CVP target under 0.4 (not T_IT 0.65) of the alveolar pressure the rig starts less
  // filled (CVP 8.8 → 7.4): PEEP 5 → 12 now gives SpO2 95 → 97 and CO 4.46 → 4.23 (−5.2 %) — the band is met.
  it('cardiogenic oedema PEEP 5 → 12: SpO2 rises and CO falls', async () => {
    const s = createLinkedSim({ profile: 'oedema-cardiogenic' });
```

In `packages/ventilator/test/link-r36.test.ts`, find:

```ts

  it('PH crisis: PEEP 15 + RR 8 → EtCO2 rises ≥ 5 mmHg, CVP rises ≥ 1.5, MAP falls ≥ 8 (RV signature waits for 7a)', async () => {
    const s = createLinkedSim({ profile: 'pulmonary-hypertension' });
```

and replace with:

```ts

  // FU-3 item 7 (R45 record): the MANUAL CVP target now sits under 0.4 (not T_IT 0.65) of the alveolar pressure, so the
  // rig starts less filled (CVP 9.4 → 8.1, CO 5.98 → 5.20, MAP 105 → 94 against the default 120/80 target). The crisis
  // still raises CVP (+2.3) and drops MAP (−14.2), but EtCO2 rises +3.8 (was +6.8) from the lower-output start (CO 4.38).
  it.fails('PH crisis: PEEP 15 + RR 8 → EtCO2 rises ≥ 5 mmHg (measured +3.8), CVP rises ≥ 1.5, MAP falls ≥ 8 (RV signature waits for 7a)', async () => {
    const s = createLinkedSim({ profile: 'pulmonary-hypertension' });
```

In `packages/validation/test/engine/capture-match.test.ts`, find:

```ts
    const m = computeWindowMetrics(signals);
    expect(Math.abs(m.hr - 80)).toBeLessThan(3);
    expect(Math.abs(median(m.sys) - 130)).toBeLessThan(8);
    expect(Math.abs(median(m.dia) - 70)).toBeLessThan(8);
    expect(signals.inspirations?.length).toBe(5);
    expect(Math.abs(median(m.plateau) - 32)).toBeLessThan(4);
  });
});
```

and replace with:

```ts
    const m = computeWindowMetrics(signals);
    expect(Math.abs(m.hr - 80)).toBeLessThan(3);
    expect(Math.abs(median(m.dia) - 70)).toBeLessThan(8);
    expect(signals.inspirations?.length).toBe(5);
    expect(Math.abs(median(m.plateau) - 32)).toBeLessThan(4);
  });
  // FU-3 item 7 (R45 record): with the MANUAL CVP target under 0.4 (not T_IT 0.65) of the alveolar pressure, the
  // ventilated (PEEP 5) 60 y rig is less filled (CO 6.73 → 5.85, LVEDP 6.6 → 5.0) and the 7a MANUAL pressure tracker,
  // which abandons a PP-60 target after MANUAL_TRACK_MAX_S, leaves SBP at 121.4 (was 126.4) against 130 ± 8.
  it.fails('lands on the window SBP ± 8 (measured 121.4 vs 130)', async () => {
    const w: AnalysisWindow = { source: 'vitaldb', record: 'test', fromS: 0, toS: 30, site: 'radial', hr: 80, sbp: 130, dbp: 70, etco2: 32, vent: { rr: 10, vtMl: 480, peep: 5 }, ageY: 60, sex: 'F', tags: [] };
    const { signals } = await matchedRun(w, 11);
    expect(Math.abs(median(computeWindowMetrics(signals).sys) - 130)).toBeLessThan(8);
  });
});
```

---

## Item 13: amiodarone AV-node strength (Q-FU2-9) — Ali's question, no task

`af-rate-control` keeps its `it.fails` ("amiodarone 150 mg over 10 min: AF 130 slows by 20–30 % … (measured 14.0)";
after Task 7's HR-numeric change it reads 131.9 → 113.5 = 14.0 %, before 14.6 %): 7g's amiodarone `avNode` entry
(Emax 0.3, EC50 1× the 150 mg load) needs Emax ≈ 0.5–0.6 for the band — a value change to a 7g row that only Ali's
calibration pass may make. FU-3 does not touch it.

---

## Open questions (for the orchestrator / Ali; the plan does not wait on them)

**Still open after the R50 review (2026-09-27) — ONLY these six go to the orchestrator / Ali:**

1. **CVP fix + five rig re-derivations** (Q-FU3-7a; Task 8, "Item 7: the fix is deferred"; R45): land
   `MANUAL_CVP_PAW_FRACTION` 0.4 and re-derive check 18 ×2, 7c's OLV re-check, R36 PH crisis and 8a capture-match
   SBP, or keep `T_IT` and record brief §4.9 as a calibration row.
2. **May MANUAL refuse part of an instructor pressure pair** (Q-FU3-4a; Task 4 defect 1) — re-specifies Stage 2
   acceptance 1/3 and hemo-nibp 9.
3. **Amiodarone AV-node strength** (Item 13, Q-FU2-9) — Ali's calibration call.
4. **Ventilate validation t25?** (Q-FU3-16a; the document now arrests at ≈ 650 s — listed as a gate deviation).
5. **Oracle mode MODELED vs MANUAL** (Q-FU3-10, first half; decides O2b's lactate verdict).
6. **AF +4.8 % on the trimmed-mean skins as disclosed device behaviour** (Q-FU3-6, first half).

Every other entry below is DECIDED by the plan: see "Decisions" › "Open questions the plan decides" and "Other open
questions — the plan's disposition". The entries are kept as the record of what was asked.

- **Q-FU3-0 (base, urgent for the 7d merge):** the 7f engine rig "rocuronium 0.6 mg/kg … TOFR ≥ 90 % at 55–95 min"
  fails once 7d and 7f are both on main (unventilated paralysed patient → low flow → 7d's GFR 0 stops renal
  clearance). Task 0 carries the fix (ventilate the rig: TOFR 0.9 at 78.5 min) in case the 7d merge does not.
- **Q-FU3-1 (Task 1):** keep 7f's γ 4 with EC50 1040 / ke0 0.1925 (1.2 s of onset slack) instead of γ 6? And may the
  tables §6.1 succinylcholine source cell name Roy 2002 (docs edit)?
- **Q-FU3-2 (Task 2, Ali — band):** R-7f-7's pair is unreachable by mass action (25 % molar capacity). Leave it
  `it.fails`; retarget to the source's pair (rocuronium 0.6 + sugammadex 0.5: 0.998 → 0.952, 0.005 of slack); or to
  0.75 mg/kg after rocuronium 1.2 (0.997 → 0.419, robust)?
- **Q-FU3-3 (Task 3):** isoflurane at 0.67 MAC still reads HR +14 % over awake (T6.3 +5–10 %) — vagal-arm depression or
  the tables §1.1 "GA resets MAP_set by −10–20 %" as a later item? Tables §6.3's G_v cells could name the new `gvHr`
  term (docs, Ali).
- **Q-FU3-4a (Task 4, Ali — MANUAL semantics):** may MANUAL refuse part of an instructor pressure pair to keep the
  ventricle perfused? That is the only route to defect 1 and re-specifies Stage 2 acceptance 1 and 3 and hemo-nibp 9
  (best candidate: the latched LVEDP + coronary-reserve guard in the prototyper's scratch `manual/guard-latched.patch`).
- **Q-FU3-4b (Task 4):** `manHoldInit` always starts the volume tracker (contradicting the comment in
  `createHemoState`); that is where the +763 mL at the check-18 baseline comes from — the same over-filling Item 7's
  deferred fix removes.
- **Q-FU3-4c (Task 4):** after a hold, NEW ischaemia still lowers the delivered Emax (by design; instructors may be
  surprised).
- **Q-FU3-16a (Task 5, validation owner):** validation document t25 (rocuronium, never ventilated for 29 min — the same
  rig defect as G7d follow-through 4) now arrests at ≈ 650 s; its graded `state:rr` row reads 1 s before and after
  (apparently `rr` is not the spontaneous rate while apnoeic — a separate defect). Ventilate the document (RR 18 / VT
  500 / FiO2 0.5 / PEEP 5 at 0 s, addendum 15 item 2) and re-define its return-of-breathing metric? Not changed here.
  **Q-FU3-16b (Ali):** `P_VF_ONSET` 0.1 [ENG] — keep, take the human 0.02, or the swine 0.23? **Q-FU3-16c:** no PEA →
  asystole progression (DeBehnke: PEA up to 20 min) — add an [ENG] "PEA → asystole after N min" for teaching?
  **Q-FU3-16d (pre-existing):** `chemoFactors` flips sign at SaO2 60 % (HR 97 → 40 within 30 s); after reoxygenation
  R23's kIsch stays at its 0.2 floor (HR 126, MAP ≈ 78) — the same floor as Task 4's defect 1; BUILD-PLAN 7a check 7
  "preoxygenated time to PEA 5–10 min" cannot hold with the 8 ± 1.5 min desaturation band (measured 17.3 min from
  apnoea, 8.2 min from SaO2 < 60 %) — re-word the check. **Q-FU3-16e:** the O2 supply uses SaO2 only (anaemia does not
  lower it yet; a CaO2 ratio from 7c's `o2.cao2` would need a 7c → 7a read).
- **Q-FU3-5 (Task 6):** DDD upper tracking rate / pacemaker Wenckebach is not modelled (1:1 tracking to 180). Add
  `PacerOpts.upperRatePpm` later? Also 7d's `organsCtx.setHr` → `holdRate(…, false)` makes an organ-initiated rate the
  new held (lower) rate on a paced row (pre-existing).
- **Q-FU3-6 (Task 7, Ali):** accept the trimmed-mean skins' AF over-read (+4.8 % at AF 130) as the disclosed device
  behaviour? AF 100's realised rate is −2.4 % on a 300 s window (FU-2 gated the AF map at 130–150 only) — a later
  `AF_RATE_CAL` knot check? The FU-2 note "AF 100 reads ≈ 105" does not reproduce (98.8 on a true 97.6).
- **Q-FU3-7a (Task 8 / Item 7, ruling):** land the MANUAL CVP fix and re-derive the five rigs, or keep T_IT and record
  brief §4.9 as a calibration row? **Q-FU3-7b:** per-level alarm latching as skin data (Philips factory "Red&Yell"
  visual/audible latching, *Configuration Guide* p. 96; the engine latches level 1 only) — a separate `l3/alarms` +
  skins task? **Q-FU3-7c:** GE/Dräger CVP factory limits unretrieved; mindray-like has no `CVP_M` limit although
  research/03 §8.10 documents 0–14 cmH2O (skins-data follow-up).
- **Q-FU3-9a (Tasks 10–11):** HR rows read exactly 75.0 in t16, t17b, t19 (and 8a's s4-class-i) because the harness sends
  `baseline.hr` as `setTarget hr`, which FU-2's rule holds. Omit `hr` from MODELED baselines in 8a's data, or skip that
  setTarget in MODELED in 6b's runner? **Q-FU3-9b:** who owns `applyEvent neuraxial` (t22; no stage 7a–7g has it)?
  **Q-FU3-9c:** t16 grades 300–600 s inside 7e's 600 s sepsis ramp, and its `requires` says 7f (should be 7e).
  **Q-FU3-9d:** 7a encodes chronic MR as grade severe + severity < 0.5 — a named flag would be clearer (engine change).
  t15's CVP 6.8 / PCWP 3.1 vs 14–18 / 8–12 is 7a's own H8 note (calibration row).
- **Q-FU3-10 (Task 12):** O2b in MODELED (+0.50, inside tolerance) vs 7c's MANUAL run (+1.10, differs as expected) —
  which mode should the oracle use? Is 7d's excretion of a 1 L saline load too slow (O3b Hb −1.50 vs Pulse −2.48; a 7d
  calibration row)? Fold the stage oracles (7a O1–O5, 7d O11, 7c blood) into 8a's `runOracle` so they appear in
  `report.md`? Should `pulseDir()` resolve a relative `PME_PULSE_DIR` in code?
- **Q-FU3-11 (Task 13):** should 7f publish SQI/EMG (research/06 lists both for the Saadat BFA module)? Philips NMT/BIS
  conventions are undocumented in research/05 (an addendum would let the gate retag `eng`). Stale windows 120 s / 5 s OK?
- **Q-FU3-12 (Task 14):** the 2 % dial reads DI 37–38 at 13 min (just under 40 while propofol is on board); ≈ 2.2 %
  would reach 40 (not tried; Ali's call). 7x.1's WebKit ack check on real Safari stays with Ali's LAN/iPad tests.
