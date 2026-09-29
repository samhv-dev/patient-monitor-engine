# FU-6: Respiratory integration — treatment, drive, anaesthetised lungs, capnograph physics, one command per disease — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-28, finished): **REVIEWED (R50: APPROVE WITH FIXES) AND FIXED — findings 1–12 applied, READY TO
> EXECUTE.** Written from the measured respiratory audit `research/09-respiratory-integration-audit.md` (gaps R1–R15; R1
> and the tension-pneumothorax build-up belong to FU-4 by the orchestrator's rulings). Every orchestrator ruling of the
> R50 review is marked in place ("Orchestrator ruling (FU-6 review), 2026-09-28"); Q-FU6-4 is ruled and coded (D21,
> Task 5 Step 5 + Task 10); E-FU6-1..9 are approved and E-FU6-10 is declared (Global Constraints → Partition). BASE:
> every find block is written against `origin/main` **`94040f7`** (code identical to `4f4ce06`, `94ca12a`, `ab3bbaa` and
> today's `2360894` — docs only ahead; FU-4 and V.1 NOT merged): **28 creates + 205 edits apply in task order with 0
> errors, `pnpm -r typecheck` is clean (8 packages) and the 162-file engine unit set is green (765 passed) on the
> applied tree** (Self-review, re-verified by the finisher 2026-09-28 in a throwaway worktree). The executor starts AFTER FU-4 and V.1 merge and re-verifies every block on that tree (Task 0).
> PROTOTYPED (code run, numbers measured; the Tasks 2–7 patch is `scratch/plans-backup/fu-6-prototype.patch`): Tasks 2
> (R2), 3 (R6), 4 (R3a), 5 (R3b/c), 6's pleural half, 7 (R4), 8 (R5), 9's Pmax, 10 (R12, PE included), 11 (R9), 12 (R8),
> 13 (R10), 14 (R11), 15 (R13), 16 (R14) and the suite rows marked with numbers. **Every task applied together** to
> `94040f7` was run (engine fast set, the slow set incl. every FU-6 file, the suite: "Final applied-tree run" below).
> Measured but dependent on V.1/FU-4 (they fail on `94040f7` for want of them, and say so): Task 9's link parity, Task
> 17, RS1. UNPROTOTYPED and marked so: Task 19's screenshots (the page and its smoke run green); Task 5 Step 5's
> residual-block arousal term and Task 10's `hvrDep` NMB arm (D21 — coded and typechecked, the unit rows green, the
> engine consequence measured by the executor under Step 5b's R45 procedure); Task 6's NPPE term is
> wired and measured, NPPE itself is a DECLARED NOT-MODELLED item (F8):
> exact code, bands are targets under R45 — a band the mechanism misses stays (or becomes) `it.fails` with the measured
> number in its title.

**Goal:** make the respiratory system LINKED to the rest of the body before Ali tests it (R53). Bronchospasm answers
β2 agonists, adrenaline, volatiles, ketamine and magnesium through ONE airway-smooth-muscle state fed by 7g's PD; the
spontaneous drive loses its wakefulness component at loss of consciousness (induction apnoea, longer with an opioid),
sees an obstruction as a load (effort, not rate) with a VT ceiling, and an obstructed effort pulls the pleural pressure
down (pulsus, negative-pressure oedema); "anaesthetised lungs" (FRC, VO2, induction atelectasis) follow the anaesthetic
state instead of a hidden instructor switch; the capnogram draws no plateau for a breath smaller than the dead space;
one disease is one command; the engine's own ventilator and the ventilator link agree under pathology; inspired CO2,
pregnancy, anaemia, CO poisoning, pain, HPV and hypercapnic PVR act; and a 15-scenario respiratory suite plus a
screenshot set is what the orchestrator inspects before Ali tests again.

**Architecture:** No new module except the audit runner. Six mechanisms, each in its owner's file: (1) 7b's
`resolveLung` takes a bronchodilation state B (0–1, 7g's `bus.airway.bronchodilation`) and relaxes the reversible
share of each smooth-muscle condition; the Stage 3 airway `bronchospasm` becomes an alias of the lung condition.
(2) 7b's chemoreflex drive (`lung/drive.ts`) gains a wakefulness term (the apnoeic threshold rises by 8 mmHg at loss
of consciousness), a central-chemoreceptor lag, a relative apnoea threshold with hysteresis, an inspiratory-load term
(obstruction → effort, not rate) and a depressible hypoxic arm; 7f's `neuroResp` publishes `loc`, `pain` and `hvrDep`.
(3) Spontaneous cycles carry the muscle pressure spent against an obstruction (`Cycle.pmus`); 7a's pleural input
subtracts it. (4) The resp pipeline keeps a continuous anaesthetised-lung level `rs.gaLvl` (0–1) from 7f's `loc` and
the diaphragm block; the `thermal` event stays an override. (5) The capnogram's plateau is the mixed-expirate fraction
of a breath (0 below the series dead space). (6) Small couplings: inspired CO2 in the CO2 balance, a Pmax on the
internal VCV, pregnancy's set point and VO2, an O2-extraction drive on 7e's sympathetic output, COHb washout, volatile
HPV inhibition, recruitment compliance and hypercapnic PVR.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (system Chrome), pnpm 9.15.9 via `npx`, Node ≥ 22.15
for the audit script (`module.registerHooks`). No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace): **R45**, **R50**, **R51** + addenda 8, 12, 14, 18,
**R53**, "Respiratory audit delivered" and "Ruling — FU-6 'respiratory integration' opened" (2026-09-28 00:25), "FU-4
plan written" and the FU-4 review rulings of the 9th cap cut-off (R1 dead-space root and the tension build-up are
FU-4's), "Stage V.1 plan written" and its rulings, "Monitor-fidelity audit delivered" + "Ruling — FU-5" (the EtCO2
numeric is FU-5's), **CI amendments 1–4**, G7b, G7f, G-FU3. Audit: `../research/09-respiratory-integration-audit.md`
(scenario ids A1…I2d, gaps R1–R15, §5 test list, §6 suite RS1–RS15, §7 questions 1–12) and `../research/09-audit-scripts/`.
Sibling plans (untracked): `docs/plans/fu-4-integration-polish.md` (being fixed), `docs/plans/stage-v1-ventilator-followup.md`.

**Gap numbering.** Task titles carry the audit's gap numbers (R2–R15) and suite ids (RS1–RS15). R1 (dead space) is
FU-4 Task 15 (extended to the root by the FU-4 fixer); the tension-pneumothorax build-up is FU-4's too. This plan
re-measures both where its numbers depend on them.

## Global Constraints

- **R45:** mechanisms, never band changes. No existing band is widened, removed or re-worded to pass. A band a mechanism
  cannot reach stays (or becomes) `it.fails` with the measured number in its title; a pre-declared `it.fails` whose band
  is now met is flipped to `it` (its title keeps the old number in a trailing "was …" clause). Every changed or new
  parameter is sourced or `[ENG]` with its fit target named in the code comment. **UNPROTOTYPED procedure (every task or
  step so marked):** (1) apply the code; (2) run the task's measurement command and record the numbers in
  `<scratchpad>/fu-6-respiratory-integration/<task>.txt`; (3) if the band is met, write the test as `it`; if not, write
  it as `it.fails('… measured <number> (FU-6 R<n>, band <band>)')`, add a calibration-queue row to the gate note, and do
  NOT tune a constant to reach the band unless the constant is `[ENG]` AND its comment names this band as its fit target;
  (4) never loosen an existing test to make room.
- **R51 + addenda (binding):** 7g owns every drug's PK and PD rows (`l2/pk/**`). FU-6 adds PD ENTRIES to existing rows
  under **E-FU6-1** (magnesium `bronchodilation`, the volatile `hpvInhibit` on isoflurane/desflurane) and changes no PK.
  The lung reads 7g's PD OUTPUTS only (`ps.pk.bus.airway.bronchodilation`, `ps.pk.bus.hpvInhibit`), passed through the
  resp context in `engine.ts` — never `bus.doses` concentrations. 7f's outputs (`ps.neuro.resp`) gain `loc`, `pain`,
  `hvrDep` (E-FU6-2). Canonical names (addendum 14) unchanged. Chain order (addendum 14 / §7) unchanged: device → pk (7g)
  → neuro (7f) → organs (7d) → blood (7c) → endo (7e) → Stage 3 → hemo; advance order pk → resp/lung → blood → endo →
  organs → hemo. `stimulus` keeps ONE shape (addendum 12): the drive reads 7f's `stress` (stimulus × (1 − antinoc)),
  it adds no event.
- **Base and order (ruled: FU-4 → V.1 → FU-6 → 8b, FU-5 parallel).** Branch `fu-6-respiratory-integration` from
  `origin/main` AFTER V.1 merges. Every find block below was verified against `origin/main` `94040f7` (code identical to `4f4ce06`; Self-review).
  **The executor re-verifies each block after FU-4 and V.1 have merged** (Task 0 Step 3 runs the verifier in dry mode on
  the new main): a block that no longer matches exactly once is re-anchored by its quoted comment and the SAME change is
  made; never re-type a line you are not changing; record every re-anchoring in the gate note §8.
- **Files FU-4 and V.1 touch that FU-6 also touches (expect re-anchoring):**
  - `l2/resp/pipeline.ts` — FU-4 Task 15 (`deadSpace()` and the MANUAL EtCO2 calibration block, extended to the R1 root:
    calibration only in MANUAL, resting pattern from the patient, intubation replaces ≈ 1 mL/kg of anatomical dead space
    with the apparatus), Task 18 (`thermal.warmAirC`); V.1 Task 1 (`rs.coRatio` line, E-V1-1) and Task 2
    (`lungStatePayload` `pleuralMmHg`). FU-6 edits `driverCtx`, `metabolic`, `o2Inputs`, `gasStep`, `lungStateEvent`,
    `applyLungSpecs`, `extraGradient`/`extraShunt`, the `airway` command case.
  - `l2/lung/*` — V.1 Task 3 (`side.ts`, `conditions.ts`, `lung.ts`: `waterShunt`, `extraShuntAt`), Task 2
    (`state-event.ts`, `vent-reference.ts`); the FU-4 fixer's tension build-up (a lungs exception; per-breath pleural
    accumulation). FU-6 edits `conditions.ts` (`resolveLung`), `lung.ts` (`GasInputs`), `perfusion.ts`, `recruit.ts`,
    `drive.ts`.
  - `l2/neuro/spont.ts`, `l2/neuro/drive.ts` — FU-4 does not list them (its partition says "never `l2/neuro/**`"), but its
    R1 root changes where `spont.paco2Rest` comes from (the resting PaCO2 the MODELED drive holds). FU-6's wake term is
    ADDED to that set point, so it composes; the numbers move (below).
  - `l2/circ/pleural.ts` — FU-4 Task 10 (the swing scales with ΔV over the resting VT, `weightKg` parameter). FU-6
    Task 6 adds the obstructed-effort term to the same function.
  - `l2/gas/*` — FU-4 Task 17 (`params.ts`, arrest EtCO2 τ), V.1 Task 1 (`coRefLpm`). FU-6 edits `gas/co2.ts` (R8) and
    `gas/params.ts` (R10 pregnancy constants).
  - Ventilator link — V.1 Tasks 4–6 rewrite `packages/ventilator/src/lung-input.ts` (absolute lungState), add
    `pleural`/`pleuralOpening`, and give the link profiles `lungConditions`. FU-6 Task 9 reads those; it edits only the
    engine's internal ventilator (`l2/resp/driver.ts`, `pipeline.ts`) and adds a parity test in `packages/ventilator/test`.
  - `engine.ts` — FU-4 Tasks 11–13, 16 (alias pre-step, vagal observer, `automaticityAt`, `ext.tempC`). FU-6 edits only
    the `advanceResp(` context object (one statement).
- **Prototype numbers that move after FU-4's R1 fix (re-measure in Task 0 Step 4 and again at the task):** every PaCO2 and
  EtCO2 in "Prototype results" (the prototype ran on the calibrated 265 mL ventilated / 215 mL spontaneous dead space;
  the R3 rows used an R1 EMULATION — `vdExtraMl` 0 and a resting 12.6 × 490 pattern — which approximates, not
  reproduces, FU-4's root fix); induction-apnoea durations (they depend on the PaCO2 at loss of consciousness); the
  laryngospasm effort and pleural swing (the drive's set point); the bronchospasm PaCO2/SpO2 rows (RS7 "SpO2 falls ≥ 4");
  the child apnoea time (also V.1's CO-ratio fix); OLV PaCO2 (RS12). Bronchospasm peak/plateau/auto-PEEP and the
  apnoea-to-90 % times are dead-space-independent to within 0.3 min / 1 cmH2O in the prototype.
- **Partition (binding).** Edit ONLY the files each task's **Files** block lists. FU-6's own files: `l2/lung/{conditions,
  lung,perfusion,mechanics,drive}.ts` (the respiratory stage's lungs), `l2/resp/{pipeline,driver}.ts`, `types-resp.ts`
  (`ventilation.pmax`), `types-lung.ts` (the lungs' public types: `LungConditionSpec.ageMin`, F6), `l2/co2/capno.ts`, `l2/gas/{co2,params}.ts`, `scripts/audit-respiratory/**` (new), root
  `package.json` (one script) and `.gitignore` (one line), tests named in the tasks,
  `apps/demo/{fu6.html,src/fu6.ts,e2e/fu6.e2e.ts,vite.config.ts}`, `docs/gates/fu-6.md` + `docs/gates/fu-6/**`. Named
  exceptions (each commit message names the one it uses). **E-FU6-1, E-FU6-2, E-FU6-3, E-FU6-4, E-FU6-5, E-FU6-6,
  E-FU6-7, E-FU6-8 and E-FU6-9 are APPROVED BY THE ORCHESTRATOR 2026-09-28** (FU-6 R50 review; E-FU6-3 conditionally —
  the `git merge origin/main` before Tasks 6, 14, 16; E-FU6-7 minus the `circ-hypoxic-arrest` flip, F4; E-FU6-5 was
  withdrawn by the writer and stays listed as unused). **E-FU6-10 is DECLARED by the same ruling** (Q-FU6-4 / D21: the
  two 7f unit bands of Task 5 Step 5).
  - **E-FU6-1** (7g data): `l2/pk/data/rows-other.ts` (magnesium PD entry), `l2/pk/data/rows-anaesthetic.ts` (volatile
    `hpvInhibit` entries on isoflurane and desflurane). PD entries only; no PK, no new target.
  - **E-FU6-2** (7f): `l2/neuro/{drive,spont,pipeline}.ts` — `loc`, `pain`, `hvrDep`, the drive inputs, the arousal term
    of the residual-block obstruction.
  - **E-FU6-3** (7a): `l2/circ/pleural.ts` (obstructed-effort swing), `l2/circ/model.ts` (the hypercapnic PVR factor on
    the two PVR lines, R14; the optional `ext.viscF` on the systemic resistance, R11), `l2/circ/params.ts` (K_PVR_CO2).
  - **E-FU6-4** (7c): `l2/blood/pipeline.ts` (the NPPE transmural term into `lungWaterStep`'s input, one line; the
    viscosity write), `l2/blood/core.ts` (COHb washout), `l2/blood/params.ts` (`hbRef`), `l2/blood/circ-adapter.ts`
    (`setCircViscosity`).
  - **E-FU6-5** (7e): WITHDRAWN while prototyping (the viscosity term reaches HR/CO through 7a's baroreflex, D13 /
    Task 14). No 7e file is touched; the gate note lists it as unused.
  - **E-FU6-6** (engine): `packages/engine-core/src/engine.ts`, the `advanceResp(` context object only.
  - **E-FU6-7** (tests): title/flip edits of named existing tests; rig re-derivations that keep bands (`spont.test.ts`,
    `circ-sanity-2.test.ts` R23 and H7, `lung-circ.test.ts`, `pk-bus.test.ts`, `endo-circ-acceptance.test.ts`,
    `test/helpers/lung.ts`). **No flip of `circ-hypoxic-arrest.test.ts`** — FU-4 already flipped its final-HR row; FU-6
    re-measures and reports (F4).
  - **E-FU6-8** (7x): `packages/engine-core/src/truth.ts`, THREE SKIP_PATH entries (`resp.spont.pc`, `resp.spont.effort`
    and F7's per-patient wake draw `resp.wakeMmHg` — a patient constant, D16). Approved 2026-09-28.
  - **E-FU6-9** (lungs' public types): `packages/engine-core/src/types-lung.ts`, the optional `ageMin` on
    `LungConditionSpec`/`lungCondition` (F6's slow-onset/paediatric row). Accepted into FU-6's partition by the
    orchestrator 2026-09-28 (it is listed above as one of FU-6's own files; the exception id exists so the commit
    message and the gate note can name it).
  - **E-FU6-10** (7f unit bands, declared 2026-09-28 by the Q-FU6-4 ruling — D21, Task 5 Step 5): the two 7f unit
    assertions that encode the parameter tables §4.6 `uaCollapse` row for an AWAKE patient at TOFR 0.6 —
    `test/l2/neuro/depth-drive.test.ts` (the `NMB:` row) and `test/l2/neuro/pipeline.test.ts` (the residual-block row) —
    are RE-SPECIFIED, not widened: the tables' `> 0.4` / `> 0.3` bands are kept on the arm they describe (the
    unconscious/sedated patient) and the awake arm gets Eikermann's numbers. Reason and before/after in Task 5 Step 5.
  - **Never touch:** `l3/**` (FU-5 owns the EtCO2 numeric, its hold/timeout and the alarm; R5's display half is FU-5's —
    see Requests), the renderer, skins, audio, `l2/ecg/**`, `l2/hemo/pipeline.ts` (FU-4/FU-5), `pnpm-lock.yaml`,
    `docs/physiology/**`, `packages/ventilator/src/**` (V.1's; FU-6 adds one TEST file there).
- **CI rules (CI amendments 1–4, restated):**
  - `CI=1` for engine tests (6 h long-run horizon); long-run horizons from `test/helpers/longrun.ts`, never hard-coded.
  - Every engine test running more than one sim-minute yields once per sim-MINUTE
    (`await new Promise((r) => setImmediate(r))`) — CI amendment 4: per minute, not per chunk.
  - New multi-sim-minute files join the SLOW set in `packages/engine-core/vite.config.ts`. **`SLOW_B` is DERIVED, not
    a list** (F10(4), Orchestrator ruling (FU-6 review), 2026-09-28): after FU-4 Task 20,
    `const SLOW_B = SLOW.filter((p) => !SLOW_A.includes(p))` — there is no `SLOW_B` list to anchor on. Add every FU-6
    entry to `SLOW` (each task's vite.config edit does exactly that); it reaches the `slow-b` job automatically. Never
    add an FU-6 entry to `SLOW_A` (disjointness, FU-4 review F8). Where a task below says "SLOW / `SLOW_B`" it means
    this: an entry in `SLOW`, which lands in `slow-b`.
  - R36: package-level sweeps over the lung catalogue keep their explicit 900 s budget — the ventilator package's
    existing R36 sweeps (`packages/ventilator/test/pathology-signature.test.ts`, `link-r36.test.ts`); FU-6 adds no
    catalogue sweep of its own (the earlier "Task 2's catalogue sweep" was a stale reference, F10(7)).
  - `tick-bench` (validation) must stay p50 < 6 ms on CI: FU-6's per-tick additions are one `Math.sin` in the pleural
    input (spontaneous obstructed cycles only), one exponential per 10 Hz gas step (`gaLvl`) and one per 1 Hz drive step;
    `resolveLung` re-runs only when B moves by ≥ 0.01. Task 20 re-runs the bench.
  - Heavy evidence e2e and screenshot scripts run Chromium only (system Chrome, `PW_SYSTEM_CHROME=1`); gate images are
    **JPEGs** (Task 19 writes JPEG and asserts the size) ≤ 60 KB each (re-take at `deviceScaleFactor: 0.7` or lower the
    quality if larger, and record it) — F10(9): the orchestrator's "images ≤ 60 KB" check matches these artefacts.
- **Clinical names (R56; `../research/11-capability-inventory-and-glossary.md` §5 is the single label source).** Test
  titles, `console.log` / `RS-ROW` labels, the evidence page's diagnostic line and the gate note use the glossary's
  labels, never engine keys: Ppeak, Pplat, PEEP, PEEPi (auto-PEEP), ΔP, VT, RR, V̇E, V̇A, PaCO2, EtCO2, PaO2, SaO2,
  SpO2, FRC, Qs/Qt, VD anat, VD/VT, Ppl, EVLWI, FiO2, FiCO2, MAC, Pmax (ASCII digits in code strings are fine: "PaCO2").
  FU-6 renames no engine key (that is Stage 9's); its NEW state fields are model quantities (glossary rule 5: "Engine"
  style under "Model internals") and their proposed labels are listed under Requests → Stage 9, so the glossary gains
  them in the same PR series.
- **Coverage matrix (R54; `../research/12-coverage-matrix.md` §4.2 and §7).** FU-6 owns the A09 cells of gaps R2–R15
  and the LUNG cells of NN-08, PD-11, PD-12 and CM-07; Task 20 re-measures each on the merged branch and records the
  verdict change in the gate note (a PL cell that changes must be explained). The pregnancy apnoea cells A09-B4/B4g are
  7j's (the matrix's owner column); FU-6 measures them and hands them on.
- **Process:** worktree `projects/patient-monitor-engine/scratch/wt-fu-6` (never the shared checkout); branch
  `fu-6-respiratory-integration` from `origin/main` after V.1 merges; push after every task's commit
  (`git push -u origin fu-6-respiratory-integration` the first time, `git push` after); never `git stash` (the stash is
  shared across worktrees); scratch and logs under `<scratchpad>/fu-6-respiratory-integration/`; every wait on a
  background process is an `until` loop of ≤ 10 min that re-checks the process; `git fetch origin && git merge
  origin/main` before the `engine.ts` edit of Task 2 and in Task 20 before the gate; the executor opens the PR in Task 20
  and NEVER merges.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. Engine test: `CI=1 npx -y pnpm@9.15.9 --filter
  @pme/engine-core exec vitest run <path>`; the CI split locally: `PME_TEST_SET=fast` / `slow` (or `slow-a`/`slow-b`
  after FU-4 Task 20) inside `packages/engine-core`. The audit (after Task 1): `npx -y pnpm@9.15.9 run audit:respiratory
  [scenario-or-prefix…]` from the repo root. Playwright: `PW_SYSTEM_CHROME=1`. Typecheck: `npx -y pnpm@9.15.9 -r typecheck`.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and is followed by `git push`.
  The PR title is **"FU-6: respiratory integration — treatment, drive, anaesthetised lungs, capnograph physics, one
  command per disease"** and its body ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — One airway-smooth-muscle state (R2).** B = 7g's `bus.airway.bronchodilation` (0–1; already OR-combined by 7g
  from salbutamol, adrenaline, the volatile rows, ketamine and — added here — magnesium; each row's own effect-site time
  course). The lung does NOT read concentrations (R51). A smooth-muscle condition's effective severity for its reversible
  effects is s·(1 − frac·B): `bronchospasm` 0.85 and `anaphylaxis` 0.85 (acute spasm, near-complete reversal; the rest
  is mucosal oedema and secretions — Dewachter 2009 *Anesthesiology* 111:1141; Miller 10e bronchospasm management)
  [ENG 0.85]; `asthma` 0.7 on its airway/slow-compartment/low-V/Q keys (acute severe asthma reverses partly within the
  hour — GINA 2023; Rodrigo 2002 *Chest* 122:160) [ENG 0.7]; `copd` 0.2 on `raw` only (ventilated COPD inspiratory
  resistance −15–20 % after a bronchodilator — Dhand 1996 *AJRCCM* 154:388) [ENG 0.2]. `resolveLung` re-runs when B moves
  by ≥ 0.01 (7e's `writeLung` threshold). Stage 3's `rawEvent` multiplier is retired (D2).
  **The non-reversible share — a status-asthmaticus non-responder exists** (Orchestrator ruling (FU-6 review),
  2026-09-28, F6). `frac` is the MAXIMUM reversal, that of a FRESH spasm; it shrinks with SEVERITY and DURATION, because
  the obstruction stops being smooth muscle: `reversibleShare = frac · (1 − 0.6·clamp((s − 1)/0.25)) · (1 − 0.9·(1 −
  e^(−age/360 min)))`. Severity: across R39-6's near-fatal range 1.0 → 1.25 (the airway `bronchospasm` alias) the lumen
  fills with oedema and mucus plugs (Kuyper et al. 2003 *Am J Med* 115:6: extensive luminal plugging in fatal asthma)
  [ENG 0.6]. Duration: a slow-onset attack (> 6 h of airway inflammation) responds less and more slowly to a β2 agonist
  than a sudden-onset, mostly bronchospastic one (McFadden 2003 *AJRCCM* 168:740; Rodrigo & Rodrigo 2000 *Chest*
  118:1547; Rodrigo, Rodrigo & Hall 2004 *Chest* 125:1081) [ENG 0.9 and τ 360 min = the 6 h slow-onset boundary; fit
  target Task 2's non-responder row]. The age is sim time since the condition appeared PLUS an optional `ageMin` on the
  `lungCondition` event/profile spec ("this attack is already 12 h old"), so the teaching case is one command:
  `lungCondition asthma 1, ageMin 720` keeps 0.7·0.22 ≈ 0.16 of its airway obstruction reversible — **measured: Ppeak
  37.0 → 31.9 (−14 %) after salbutamol 250 µg, against 37.0 → 21.4 (−42 %) for the same asthma fresh**. Every fresh
  arm in this plan (age ≤ 15 min at its last reading, severity ≤ 1) keeps ≥ 95 % of `frac` (0.963 at 15 min) — measured:
  the R2 arms moved ≤ 0.6 cmH2O (salbutamol 23.9, asthma 21.4, COPD 25.3). FU-6
  adds NO dose-response of its own: B is 7g's (why 250 µg IV and 10 mg nebulised both saturate B ≈ 1 is 7g's row —
  Requests → FU-7 item 5). The matrix cell this closes is **DI-40** (β2 agonist × bronchospasm, `research/14`,
  `research/12` §4.4) with A09-E1t/E1b.
- **D2 — One bronchospasm (R6).** The airway event `bronchospasm` (severity s) becomes an alias of the side-less lung
  condition `bronchospasm` s: one resistance, dead space, V/Q and capnogram whichever command started it, and both
  commands together give ONE condition (the airway event replaces a side-less lung spec of the same id; ending the airway
  event removes it). The Stage 3 `+8·s` Pa–Et gradient, `+0.05·s` shunt and the `vt × (1 − 0.2·s)` cycle rule are retired
  (the lung row carries dead space and low-V/Q admixture). The shark fin is drawn from the lung's post-bronchodilation
  severity (`spasmSeverity`), so it shrinks as the drug acts. Severity 1–1.25 keeps the R39-6 near-fatal capnogram.
- **D3 — 7e's anaphylaxis keeps its own relief (R2).** 7e writes the lung `anaphylaxis` condition with its own β2 relief
  (`anaphLung: 0.8·mediator·(1 − 0.6·bd)`); while 7e owns that spec (`endo.lungSev > 0`) the lung exempts it from D1, so
  the relief is not applied twice. A profile/instructor `anaphylaxis` spec (no 7e mediator) relaxes through D1.
  Measured: I2a/I2c peak 26.8, MAP 31.8 → 23.1 identical before and after.
- **D4 — The wakefulness drive (R3a; sensitivity in Task 4 Step 4).** Loss of consciousness (`loc`: 7f's hypnotic level ramped 0.6 → 1.0, fully
  "unconscious" from the LOC C50 up [ENG ramp]) raises the chemoreflex apnoeic threshold by `WAKE_MMHG` 8 (awake B =
  set − VE0/S ≈ set − 5; unconscious ≈ set + 3: Nunn 9e ch. 5, the anaesthetised apnoeic threshold 0.3–0.5 kPa below an
  anaesthetised resting PaCO2 of 45–50; Fink 1961 *J Appl Physiol* 16:15) [ENG size]. The drive reads a CO2 stimulus
  0.3·PaCO2 + 0.7·Pc, Pc the central (brain) PCO2 with τ 90 s (Dahan 1990 *J Physiol* 423:615: central τ ≈ 100 s,
  peripheral share ≈ 0.3) [ENG τ] — at steady state Pc = PaCO2, so no resting value moves. MODELED apnoea is a neural VE
  below 10 % of the resting VE, resuming above 15 % (was an absolute 0.2 L/min that a depressed drive never reached
  because of the RR floor of 4) [ENG, mirrors 7f's MANUAL 0.42/0.5 hysteresis].
- **D5 — Induction apnoea is PROBABILISTIC, per the Diprivan label** (Orchestrator ruling (FU-6 review), 2026-09-28, F7;
  audit Q2). The label's own figures for propofol 2–2.5 mg/kg in unpremedicated adults are apnoea **< 30 s in 7 %,
  30–60 s in 24 %, > 60 s in 12 %** — ≈ 43 % of patients, the MODAL apnoea 30–60 s (≈ 45 s); more often and longer after
  an opioid (Miller 10e, intravenous anaesthetics). (This plan first wrote "25–30 %" and a deterministic ≈ 30 s default:
  both understated the label.) **The model is probabilistic:** every patient carries ONE seeded draw — u from the engine's
  own `'resp-wake'` stream at `createRespState` (a new named stream, so no existing stream's draws shift) — mapped
  through `WAKE_QUANTILES` (lung/drive.ts) to that patient's wakefulness shift (2–14.5 mmHg; the knots are [ENG] with
  the label's three bands as fit target). u < 0.57 never becomes apnoeic after 2 mg/kg (short hypoventilation, then
  obstructed shallow breathing on a natural airway); 0.57–0.64 < 30 s; 0.64–0.88 30–60 s; > 0.88 over a minute. A
  scenario is reproducible by its seed; **seed 7 — every FU-6 rig (`rig6`) — draws u 0.737, the modal patient**.
  **Measured (propofol 2 mg/kg via SGA; the FU-6 fixer on the applied tree, every task in, F9 included):** seeds 1–20
  on **FiO2 0.5** (the label's inductions are oxygenated) → apnoea in **8/20, bins < 30 / 30–60 / > 60 s = 1 / 4 / 3,
  max 110 s** — label expectation 8.6/20, 1.4 / 4.8 / 2.4. On ROOM AIR 9/20 with the long apnoeas truncated at ≈ 45 s by
  F9's hypoxic plateau (seeds 6/12: 92 s without F9 → 48 s, breathing resuming at PaO2 ≈ 42); before F9 (Task 4's
  tree) room air gave 9/20, 3 / 4 / 2, max 92 s, and with the R1 emulation (`vdExtraMl` 0 from 2 s — FU-4's root,
  approximated) 10/20, 2 / 6 / 2, max 108 s. Seed 7 on air: **28 s** (`94040f7`) / **42 s** (R1-emulated); 2.5 mg/kg
  44 s; + fentanyl 2 µg/kg 62 s; + remifentanil 0.1 124 s (`94040f7`; the opioid arms depress hvrDep to ≈ 0.8, so F9
  does not shorten them). Draw → duration on the R1 emulation (the sweep behind the knots): shift 6 → 0 s, 7 → 8 s, 8 → 26 s,
  9 → 36 s, 10 → 50 s, 11 → 60 s, 12 → 76 s, 14 → 112 s (on `94040f7` without it: 8 → 0, 9 → 22, 10 → 34, 11 → 48,
  12 → 62, 14 → 98). `WAKE_MMHG` 8 stays the value used where no draw exists (unit tests, pre-FU-6 snapshots). Q-FU6-1
  now asks only whether a teaching scenario should be able to PIN the draw (e.g. "always apnoeic" by seed choice, or a
  profile field later).
- **D6 — Obstruction is a load the drive sees (R3b).** The drive's rate RISE with its extra output (VE above rest) is
  scaled by (1 − load); a depressed drive still slows the rate as before: against an obstructed airway the extra drive goes into effort (neural VT), not rate (load compensation —
  Zechman, Hall & Hull 1957 *J Appl Physiol* 10:356). load = max(7f's sedation/residual-block obstruction, 1 for the
  `obstructed` airway event). Delivered VT = neural VT × (1 − obstruction) as before. The neural VT has a ceiling
  `VT_MAX_ML_KG` 35 × IBW × fatigue (Hey 1966 *Respir Physiol* 1:193: VT plateaus at 50–60 % of VC; VC 60–70 mL/kg)
  — weakness stays `nmbVtMult`'s (not counted twice).
- **D7 — The obstructed effort's pleural pressure (R3b).** A spontaneous cycle carries `pmus` = the muscle pressure spent
  against the obstruction: obstruction × min(Pmax·strength·7b pMax·fatigue, `PMUS_REST_CMH2O` 8 × effort), effort = neural
  VT / resting VT; for the `obstructed` airway (or 7f's complete obstruction) all of it (Mueller manoeuvre: no flow, the
  whole Pmus shows in the pleural space). 7a's pleural input subtracts pmus·sin(πu/Ti) during inspiration; pulsus then
  emerges from 7a's existing interdependence. The capillary transmural pressure 7c's `lungWaterStep` sees rises by the
  10 s mean of the negative alveolar pressure of obstructed efforts (Task 6 Step 5) — but **NPPE itself is a DECLARED
  NOT-MODELLED item** (Orchestrator ruling (FU-6 review), 2026-09-28, F8): the chemical-drive effort is capped (VT
  ceiling → effort ≤ ≈ 4.9), so the term adds only **≈ 6.5 mmHg** at the maximal effort (measured: `palvObs` −6.5 mmHg,
  pCap 16.2, EVLWI +0.00) against a Starling threshold of ≈ 23 mmHg — unreachable by construction in any scenario.
  NPPE needs the −40 to −100 cmH2O reflex efforts of a real Mueller manoeuvre; whether laryngospasm gets such a reflex
  effort term is Q-FU6-3. No `it.fails` is carried for it (an `it.fails` implies a mechanism that missed a band).
- **D8 — Post-release PaCO2 (audit RS8 "falls ≤ 5 mmHg in 30 s") — decided by physics, confirm with Ali (Q-FU6-3).**
  The post-release RATE is not banded (hyperpnoea after asphyxia is expected; on `4f4ce06` without FU-4's R1 it reaches
  the 45/min cap for ≈ 20 s, R1-emulated 23/min). At
  release the fall is limited by CO2 delivery from the venous blood, not by ventilation: with VA ≈ 9–16 L/min and CO
  5.5 L/min the lung–blood equilibrium PaCO2 is ≈ 37–47 mmHg (VA·P/863 = Q·0.0045·(Pv − P), Pv ≈ 66), reached with
  τ ≈ 5–10 s. The prototype falls 61.4 → 48.6 → 42.9 in 10/20 s and stays ≥ 41 (no hypocapnic overshoot). The suite
  asserts the physical bound (PaCO2 ≥ 38 in the 2 min after release, RR ≤ 30), not "≤ 5 mmHg in 30 s".
- **D9 — Anaesthetised lungs follow the anaesthetic state (R4; audit Q7 decided).** `rs.gaLvl` relaxes toward
  max(`loc`, diaphragm block 1 − pMaxMult) with τ 20 s on / 300 s off [ENG: FRC falls within the first minute of
  induction and atelectasis appears within 5 min — Hedenstierna & Edmark 2010 *BJA* 104:16; Westbrook 1973 *J Appl
  Physiol* 34:81; recovery slower]. FRC = awake + (GA − awake)·gaLvl; VO2/VCO2 × (1 − 0.15·gaLvl); induction atelectasis
  once gaLvl ≥ 0.5. The `thermal` event's `anaesthesia: 'general'` forces 1 (override kept for the calibrated rigs). 7d's
  own drug-derived GA flag (`organs/inputs.ts:161`) is unchanged.
- **D10 — Capnograph physics vs display (R5).** FU-6 owns the waveform physics: a cycle's plateau height is the
  mixed-expirate share max(0, 1 − VDseries/VT) of the alveolar value (Fowler; a breath smaller than the dead space draws
  no plateau). FU-5 owns the numeric: hold the last detected breath's EtCO2 until the gas-apnoea timer fires, then
  invalid (audit Q11 decided: vendor behaviour). FU-6 does not edit `l3/**`. **Morphology limit (F10(1), Orchestrator
  ruling (FU-6 review), 2026-09-28):** `alvFrac` scales the plateau's HEIGHT; the audit's picture of a small breath is
  "no phase III" (a rising expirate that never flattens). So between 0.6 and 1.4 × VD the waveform is a short, LOW
  plateau and the α-angle bands (R39-6) stay met although a real trace would show no plateau at all. Kept (Fowler with
  axial mixing is the right physics for the height; the shape is a display approximation); stated here and in
  Q-FU6-12; RS3b stays `it.fails`.
  **The EtCO2 numeric at RR ≤ 6 (the review's §F note):** FU-5's R-FU5-3 hands the EtCO2-window half back to FU-6 and
  FU-6 hands the numeric to FU-5; the two plans agree on the split (waveform = FU-6, numeric/hold/alarm = FU-5) but
  neither coded the RR ≤ 6 window fix. It is a NUMERIC hold, so it is FU-5's (Requests → FU-5 says so); FU-6 codes
  nothing for it.
- **D11 — Which ventilator is right under pathology (R7).** The LINK is right in principle: a real anaesthesia
  ventilator in volume control has a pressure limit (Pmax/Plimit), and when the airway pressure reaches it the delivered
  VT falls (Dräger "Pmax" pressure limitation; GE cycles to expiration). The engine's internal VCV is an unlimited flow
  source — non-physical. Fix the engine: the internal VCV gets a Pmax (default 40 cmH2O, settable via `ventilation.pmax`)
  and becomes pressure-limited above it. V.1 already makes the link read the engine's absolute resistance/compliance
  (its Task 5), so after both the same lung gives the same VT through either path (RS15).
- **D12 — Pregnancy (R10, textbook-clear):** the `pregnancy` row gains `paco2Set` (term −9 mmHg → ≈ 31; progesterone)
  and `vo2` (term × 1.2) effect keys (Hegewald & Crapo 2011 *Clin Chest Med* 32:1: PaCO2 28–32, VO2 +20–33 %, FRC −20 %);
  the ODC P50 shift (26.7 → 30.4) is left to 7c (Request).
- **D13 — Anaemia and CO (R11; audit Q8 decided).** Acute isovolaemic anaemia raises HR and CO first (Weiskopf 1998
  *JAMA* 279:217: Hb 5 → HR +20–30, CI +50–60 %, no lactate rise); lactate only below a critical DO2. Mechanism
  (prototyped, Task 14): blood viscosity falls with the haematocrit, so SVR × (Hb/Hb_ref)^0.6 (Weiskopf's SVR −47 %),
  and 7a's baroreflex and venous return raise HR and CO — the planned 7e O2-extraction input (E-FU6-5) is withdrawn.
  COHb washes out first-order with t½ 320 min × (95/PaO2)^0.8: 320 min on air, ≈ 74 min on FiO2 1 (Weaver 2009 *NEJM*
  360:1217).
- **D14 — Pain and the hypoxic arm (R12; the propofol arm re-sourced by the Orchestrator ruling (FU-6 review),
  2026-09-28, F3b).** The drive's `pain` input is 7f's `stress` (stimulus × (1 − antinoc)), not a literal 0; the hypoxic
  arm is depressed by `hvrDep`. **Volatile arm (kept, sourced):** Emax 0.9, C50 0.1 MAC — Knill & Gelb 1978
  *Anesthesiology* 49:244 (halothane 0.1 MAC abolishes most of the hypoxic response); Dahan & Teppema 2003 *BJA* 91:40
  (0.1 MAC blunts it 30–70 %). Opioid and midazolam arms as their CO2 depression. **Propofol arm (citation corrected):**
  the plan first cited Nieuwenhuijs 2001 for a sedative-dose propofol C50 of PROP_VENT_C50/3; that paper
  ("Respiratory sites of action of propofol: ABSENCE of depression of the peripheral chemoreflex loop by low-dose
  propofol", *Anesthesiology* 2001;95:889) found the OPPOSITE — propofol 0.75–1.5 µg/mL depressed the CENTRAL loop and
  left the PERIPHERAL (hypoxic) loop intact. The arm is therefore RE-SOURCED and RE-SIZED, not deleted: the hypoxic
  response IS reduced at anaesthetic (not sedative) propofol concentrations (Blouin et al. 1993 *Anesthesiology* 79:1177:
  propofol depresses the ventilatory response to hypoxia at sedative-to-anaesthetic doses; Nieuwenhuijs 2001 fixes the
  LOWER bound at no peripheral effect by 1.5 µg/mL), so `HVR_PROP_C50` becomes an ANAESTHETIC C50 instead of
  PROP_VENT_C50/3 (0.39 µg/mL, which depressed the hypoxic arm at every sedative dose). **Deviation from the ruling's
  parenthetical, with the reason:** the ruling wrote "(= PROP_VENT_C50)"; PROP_VENT_C50 is 1.17 µg/mL, inside
  Nieuwenhuijs's own sedative range, and would give 44 % hypoxic depression at 1.0 µg/mL — the opposite of the finding the
  ruling corrects. Its stated intent ("so a sedative dose leaves the hypoxic arm intact") therefore takes
  **`HVR_PROP_C50 = 3 × PROP_VENT_C50` ≈ 3.5 µg/mL** (h 1.5 unchanged): measured `hvrDep` **0.13 at 1.0 µg/mL, 0.22 at
  1.5, 0.55 at 4.0** — a sedative dose leaves the hypoxic arm nearly intact while the CENTRAL arm is depressed (0.44 at
  1.0 µg/mL), and a full induction dose depresses it. [ENG size at an anaesthetic C50; the direction is sourced; fit
  target: Task 10's isocapnic unit rows — a new propofol row asserts exactly this split.] Recorded in the gate note §6 as
  a ruling applied by intent, with the numbers; Q-FU6-5 asks Ali about the sizes with them in hand.
  PE hyperventilation: the lung spec `pe`'s severity feeds an ADDED J-receptor drive (D17).
- **D14b — Hypoxia drives breathing below the CO2 threshold (Orchestrator ruling (FU-6 review), 2026-09-28, F9).** 7b's
  hypoxic arm was purely multiplicative on the CO2 error (`chem = [S·(P − B)]₊ · H(PaO2)`), so a hypoxaemic patient whose
  PaCO2 sat at or below the apnoeic threshold got ZERO hypoxic stimulus — and FU-6's raised post-induction threshold is
  exactly that state (the review's C4b run resumed breathing only as PaCO2 climbed, SaO2 25 %). Physiologically the
  carotid body drives ventilation below the CO2 threshold: the CO2-response lines of a hypoxic subject flatten onto a
  PO2-dependent plateau instead of falling to zero (the "dog-leg" — Nielsen & Smith 1952 *Acta Physiol Scand* 24:293;
  Lumb, *Nunn's Applied Respiratory Physiology* 8e ch. 5). FU-6 adds that plateau as an INDEPENDENT arm:
  `chem = max(fan, HVR_INDEP_VE·VE0·(H(PaO2) − 1)·(1 − hvrDep))` [ENG 0.5]. Because it is a max, not a sum, every
  existing hypoxic-response band above the threshold is unchanged (the fan is larger there), and at normoxia the plateau
  is < 0.02·VE0 (below the apnoea threshold). **Measured (prototype, Task 10):** drive at PaO2 50 / PaCO2 30 → V̇E 3.06
  L/min awake (0.51 × resting; was 0 — apnoea) and above the apnoea threshold unconscious; engine, propofol 2 mg/kg via
  SGA on air, a long-apnoea draw (seeds 6, 12): apnoea **92 → 48 s**, breathing resuming at **PaO2 42 / PaCO2 52** (was
  PaO2 31 / PaCO2 54), SaO2 nadir 30 % either way; seed 7 unchanged (28 s — it resumes on CO2 first); the opioid arms
  unchanged (hvrDep ≈ 0.8 suppresses the plateau: remifentanil 124 s, PaO2 23 at resumption — the teaching point
  that an opioid removes the hypoxic rescue). Siblings with F9 in: `test/l2/lung` + `test/l2/neuro` 173/173,
  `resp-drive-fu6`, `resp-obstruction`, `resp-pleural-effort`, `lung-circ` 9/9, `resp-induction` 4/4.
- **D15 — Volatile HPV (R13).** 7g's existing `bus.hpvInhibit` (the sevoflurane row's 0.2 per MAC) reaches the lung
  (it was wired to 0); isoflurane and desflurane get the same entry (E-FU6-1). Posture (lateral decubitus) is NOT added
  (a new `position` field is a design change: Q-FU6-6).
- **D16 — Truth budget.** FU-6's state fields are absent while at their default (`rs.bd`, `rs.bdExempt`, `rs.gaLvl`,
  `driver.spasm`, and F6's `rs.sm` — present only while a smooth-muscle condition is: 1 + n leaves), and the drive's machinery (`resp.spont.pc`, `resp.spont.effort`) plus F7's per-patient wake draw (`resp.wakeMmHg`) are skipped (E-FU6-8's three entries, 7x
  `src/truth.ts`). Measured on the prototype: FU-6's own net change in the `resp` subtree is −1 leaf; `neuro.resp` gains
  3 (`loc`, `pain`, `hvrDep`).
- **D17 — The PE J-receptor drive is ADDED, not multiplied (R12; decided while finishing the plan).** A multiplier on
  the chemoreflex output cannot lower PaCO2 below the chemical threshold (S(1 + J)(P − B) = k/P keeps P > B ≈ 35 for
  any J: measured ×1.8 → RR 19.2, PaCO2 38.2). The J-/vascular-receptor drive is a non-chemical V̇E term (2.4 × the
  resting V̇E at severity 1) plus a rapid-shallow rate term (+4/min), both depressed like the rest of the drive:
  awake massive PE → RR 27.2, PaCO2 30.0, V̇E 18 L/min [ENG, fit target RS13].
- **D18 — The VCV Pmax acts inside the mechanics sub-step (R7).** A per-sample (16 ms) check against the previous
  pressure let a breath that starts while the lung is still emptying overshoot to 45–48 cmH2O; `mechSubstep`'s
  `pLimit` holds the airway at Pmax in any 4 ms sub-step where the set flow would exceed it (what a ventilator's pressure
  limit does). Consequence recorded in the tests: at the default Pmax 40 a severe bronchospasm's Ppeak READS 40.0.
- **D18b — Mechanical severity is measured on an UNLIMITED arm; the default-Pmax arm measures the LIMIT** (Orchestrator
  ruling (FU-6 review), 2026-09-28, F2). A pressure-limited breath reads the limit by construction, so
  `expect(peak).toBeGreaterThanOrEqual(40)` at the default Pmax 40 passes for a lung of ANY severity above the limit and
  hides a regression (a spasm twice as severe still reads 40.0) — the same defect class as G-FU3 ruling 1's zero-margin
  monitor-HR criterion. Therefore: every row that measures the SEVERITY of a lung (Ppeak ≥ 40, PEEPi ≥ 8, the
  −30 %/−50 % drug bands, RS11's ΔP fall) runs at **`pmax: 80`** (as RS10 already does) and keeps its authored band —
  measured 44.0 / 11.9 unlimited. Every row that measures the LIMIT asserts what a ventilator's Pmax does: `Ppeak` within
  0.5 of `VCV_PMAX_DEFAULT` **and** the delivered VT below the set VT (measured 40.0 / 479 mL at bronchospasm 1). The
  relative drug bands stay on the unlimited arm so −30 %/−50 % measures the smooth muscle, not the clamp. Tasks 2, 3, 11
  and RS7/RS9/RS11 carry both arms; the Pmax default stays 40 (a factory value; Q-FU6-13 closed: the teaching point is
  the Pmax alarm, and the fix is the bands, not the default).
- **D19 — Paralysed rigs stay paralysed (R9 side effect).** Since the MODELED drive runs on the ventilator
  (assist-control), a diaphragm above 5 % strength triggers breaths. Every 30-min ventilated rig (`ventRig`) adds a
  rocuronium infusion 0.6 mg/kg/h to its 1.2 mg/kg bolus (measured: the bolus alone let the diaphragm reach 5 % at
  ≈ 24 min, and the 25-min windows read triggered breaths — COPD Ppeak 28.0 → 29.8 "after" salbutamol).
- **D20 — Boundaries with 7k and 7j (R57, R59).** FU-6 adds NO mechanics or volume readout (no Ppeak/Pplat/ΔP/PL leaf,
  no ERV/RV/TLC/VC/IC/FEV1/FVC, no VD set) — those are 7k's; it leaves the state 7k needs (Requests → 7k). FU-6's
  pregnancy work (Task 13) is ONLY the respiratory set point (PaCO2 −9 mmHg at term) and VO2 (+20 %), scaled by the
  existing lung-row severity; FRC stays the catalogue row's −20 %; gestational age, the ODC shift, renal HCO3,
  haemodynamics, aortocaval compression, MAC reduction, closing capacity and the pregnancy apnoea band are 7j's.
- **D21 — Residual block in an AWAKE patient: Eikermann governs (R3(d); Orchestrator ruling (FU-6 review),
  2026-09-28: "Q-FU6-4 RULED: residual block awake at TOFR 0.6 follows Eikermann (upper-airway obstruction, reduced
  hypoxic response) over tables §4.6" — `../research/00-orchestrator-rulings.md`, entry "FU-6 R50 review (2026-09-28
  11:31)"; review F11).** The conflict was a SOURCE conflict, not a taste question: the parameter tables §4.6
  `uaCollapse` row (which 7f's unit tests encode) obstructs a natural airway > 0.4 at TOFR 0.6 with no hypnotic on
  board, while Eikermann et al. 2003 *AJRCCM* 167:1024 measured awake volunteers at TOFR 0.5–0.7 keeping a
  near-normal VT. **Ruled: the tables' row describes the SEDATED patient; Eikermann governs the AWAKE one.** Three
  consequences, all coded (no band widened — R45):
  1. **Obstruction is present but small when awake, full when unconscious.** 7f's residual share is scaled by arousal:
     `residual × (UA_AROUSAL + (1 − UA_AROUSAL)·loc)`, `UA_AROUSAL` 0.25 [ENG 0.25; fit target: E-FU6-10's awake rows].
     Awake at TOFR 0.6 the obstruction is 0.15 (a LOAD the drive sees, Task 5's `load` input — not zero: Eikermann's
     volunteers had measurably impaired dilator function) and the delivered VT stays near-normal (`vtMult` 0.85);
     unconscious (`loc` 1) it returns to the tables' 0.6 with `vtMult` 0.40. Coded in **Task 5 Step 5**.
  2. **The hypoxic response is reduced by the block itself.** Partial paralysis depresses the carotid hypoxic
     ventilatory response by ≈ 30 % at TOFR 0.7 (Eriksson, Sato & Severinghaus 1993 *Anesthesiology* 78:693; the
     matrix's NN-08) — a carotid-body effect, so it applies with a tube as well as a natural airway. `hvrDep` gains ONE
     NMB arm, `HVR_NMB_EMAX` 0.3 ramped over TOFR 0.9 → 0.7. It is coded in **Task 10**, where `hvrDep` is born (a
     Task 5 block cannot anchor on a field that does not exist yet); Task 5 Step 5 points at it.
  3. **The two 7f unit bands are re-specified under E-FU6-10**, with the tables' bands KEPT on the arm they describe.
     This closes Q-FU6-4 and answers Q-FU6-15's NMB arm for the residual-block range (the Requests to FU-7 say so:
     FU-6 adds exactly ONE NMB arm, Eriksson-sourced, and FU-7 adds none).

## Prototype results (before → after; seed 7; MODELED; adult 40 y 70 kg unless stated)

Prototype: `origin/main` 94ca12a + the FU-6 changes of Tasks 2–7 and the wiring of Tasks 10 and 15
(`scratch/plans-backup/fu-6-prototype.patch`). Runner: the audit's `09-audit-scripts` with two added columns (pleural
minimum, beat-to-beat SBP range). "R1-emulated" rows set `vdExtraMl` 0 and the resting pattern 12.6 × 490 at t = 0.5 s
(approximates FU-4's R1 root; re-measure after FU-4).

**R2/R6 — bronchospasm on VCV 12 × 500, PEEP 5, FiO2 0.5, GA rig; bronchospasm 1 at 600 s, drug at 900 s.**
Peak / plateau / auto-PEEP (cmH2O), 2–3 min and 10–15 min after the drug:

| arm | before (audit) | after | notes |
|---|---|---|---|
| airway `bronchospasm` 1 | 31.8 / 17.8 / 5.5 | **44.0 / 26.9 / 11.9** | = lung `bronchospasm` 1 (D2) |
| lung `bronchospasm` 1 | 44.0 / 26.8 / 11.9 | 44.0 / 26.9 / 11.9 | untreated: unchanged at 20 min (PaCO2 50.3 → 60.2, EtCO2 30 → 35, MAP 87 → 80) |
| both commands | 66.1 / 38.7 / 21.6 (SpO2 90 → 87) | **44.0 / 26.9 / 11.9** | one condition |
| + salbutamol 250 µg | no change | **24.5 / 16.9 / 2.6 → 23.3 / 16.4 / 2.2** | −47 % peak, −82 % auto-PEEP; EtCO2 30 → 41, PaO2 198 → 246 |
| + adrenaline 50 µg | no change (MAP +8) | **22.0 / 15.6 / 1.5 → 39.9 / 24.2 / 9.5 (10 min) → 43.4** | a bolus wears off in 10 min; MAP 87 → 99.5 |
| + sevoflurane 2.5 %, FGF 6 | no change (MAP → 71) | MAC 0.2 / 0.4 / 0.8 / 0.9 → peak **35.8 / 29.5 / 24.9 / 23.9** | MAP 87 → 71 (unchanged) |
| + ketamine 1 mg/kg | — | **31.4 → 41.3 (15 min)** | wears off with Ce |
| + magnesium 2 g | — | **37.7 → 36.5** | modest adjunct (Emax 0.35) |
| lung `asthma` 1 + salbutamol | 36.8 / 26.8 / 6.4 | **21.2 / 17.2 / 0.2** | |
| lung `copd` 1 (RR 10) + salbutamol | 25.0 / 16.6 / 4.6 | **22.9 / 16.1 / 3.5** | small reversible share |
| lung `asthma` 1, `ageMin` 720 (status asthmaticus, F6) + salbutamol | — (no such state) | **37.0 → 31.9 (−14 %); PEEPi 6.4 → 4.5** | non-responder; the same asthma fresh: 37.0 → 21.4 (−42 %). Measured by the FU-6 fixer on the applied tree (`94040f7`-equivalent + the `physicalDeadSpace` emulation), Ppeak on the `pmax: 80` arm; the fresh R2 arms re-measured there: untreated 44.1, salbutamol 23.9, adrenaline 22.5 → 40.4, sevoflurane 25.5 (MAC 0.79), ketamine 31.7 → 38.5, magnesium 36.5, COPD 27.9 → 25.3 — all 8 rows green |
| 7e anaphylaxis (I2a) / 7e + lung (I2c) | 26.8, MAP 31.8 → 23.1 | identical | D3: no double relief |

**R3 — induction and obstruction (R1-emulated).** Propofol at 300 s, room air unless stated:

| scenario | before (audit, not emulated) | after |
|---|---|---|
| C4 propofol 2 mg/kg, natural airway | RR 14 → **41** at VT 194–245, VA 0 for 3 min | apnoea **350–375 s (30 s)**, then RR ≤ **18.1** with obstructed VT 50–150 mL; SaO2 < 90 at +55 s |
| C4b propofol 2 mg/kg, SGA | no apnoea, RR 17–20, VT 300–340 | apnoea **30 s**; min SaO2 50 % unsupported |
| C7 propofol 2.5 mg/kg, SGA | — | apnoea **50 s** |
| C6 fentanyl 2 µg/kg + propofol 2 mg/kg (natural / SGA) | — | apnoea **115 s** (both) |
| C8 remifentanil 0.1 µg/kg/min + propofol 2 mg/kg, SGA | — | apnoea **160 s** |
| E2b `obstructed` 180 s after propofol 1 mg/kg | RR → 45, VT demand 1.57 L; no pleural effect; release PaCO2 61.6 → 43.7 in 30 s | RR 12.6 → **16.3** (the depressed rate returns to its unloaded value; no chemical rate rise), neural effort 0.6 → **2.25**, pleural minimum −6.9 → **−17.0 mmHg** (swing −13.6 mmHg ≈ −18.5 cmH2O), SBP swing 4–4.5 mmHg (hypoxic bradycardia confounds); SaO2 12.9 %; release 60.8 → 49.0 → 41.0 in 10/20 s, ≥ 41 after (D8) |
| A1 awake baseline | RR 15, VT 500, PaCO2 39.1 | unchanged (R1-emulated: 12.7 × 494, PaCO2 39.1) |
| D1 remifentanil 0.05 → 0.1 → 0.2 | RR 8.2 / 5.6 / 4.1, PaCO2 41.8 / 45.5 / 51.1 | 7.1 / 4.9 / 4.0; 42.1 / 46.2 / 53.3 |
| D2 sevoflurane via SGA 0.66 / 1.10 / 1.47 MAC | PaCO2 55.6 / 57.1 / 62.5, RR 20 | 53.7 / 55.0 / 57.9, RR 15 (the audit's "tachypnoea too weak" is NOT addressed — Q-FU6-7) |
| D4 remi 0.1 + propofol 50, stimulus 1.5 | VE unchanged | **unchanged (+0.6 %)**: 7f's antinociception leaves stress ≈ 0.2 → RS5 "VE ≥ +20 %" stays `it.fails` (Q-FU6-5) |
| **F7 — the seeded draw** (C4b rig, SGA, propofol 2 mg/kg, seeds 1–20; measured by the FU-6 fixer) | deterministic (WAKE 8 for every patient) | every task applied (F9 in), **FiO2 0.5: 8/20, < 30 / 30–60 / > 60 s = 1 / 4 / 3, max 110 s** (label: 43 %, 7 / 24 / 12 %); room air 9/20 with the long apnoeas cut to ≈ 45 s by F9; before F9, air: 9/20, 3 / 4 / 2, max 92 s; R1-emulated: 10/20, 2 / 6 / 2, max 108 s. Seed 7 (all rows above; draw 9.45 mmHg vs the fixed 8 the rows were measured with) **28 s / 42 s R1-emulated**; 2.5 mg/kg 44 s; + fentanyl 62 s; + remifentanil 124 s. The C4/C6/C7/C8/E2b numbers above were measured with WAKE 8 and move with the draw — re-measured in Task 4 Step 4 |

**R4 — preoxygenated apnoea to SaO2 90 % (no `thermal` switch unless "GA"):**

| patient | before, no switch | before, with switch | after, derived (no switch) | band (RS2) |
|---|---|---|---|---|
| adult 70 kg | 9.75 min | 7.83 | **8.00** | 6.5–9.5 (Benumof ≈ 8) |
| obese 127 kg | 3.33 | 2.75 | **2.83** | 2–3.5 |
| term pregnancy | 6.92 | 5.58 | **5.75** | 2.5–4.5 → needs R10 (Task 13) |
| child 4 y 16 kg | 7.83 | 2.75 | **3.50** | 2–3.2 (Patel 160 ± 31 s) → V.1's CO-ratio fix and R15 (Task 17) |
| I1: 40 min propofol + rocuronium on VCV | FRC 2100, VCO2 awake | — | FRC **1400** (gaLvl 1.0), PaCO2 40 (R1-emulated) | — |

**R12/R13 (wiring measured):** hypoxic response by state (drive probe, poikilocapnic, PaO2 → 56): awake +9 %,
remifentanil 0.05 +6 %, propofol 1.07 µg/mL +6 %, sevoflurane 0.75 MAC +6 % (was 8–13 % everywhere, never depressed);
the isocapnic unit test of Task 10 is the real check. OLV (F3, FiO2 1, VT 350 × 16): sevoflurane 0.53 MAC PaO2
83 → **78** (−6 %), shunt 0.30 → 0.32 (was no change); PaCO2 89 (R1 confounds).

**Tests on the prototype (engine-core fast set, CI=1):** 242/244 files, 1,078 passed; 3 failures, all planned:
`l2/neuro/spont.test.ts` "hypercapnia raises VE" (the central lag: Task 4 moves its rig to steady state, band kept),
"weakness shrinks VT" (fixed in the prototype by D6's ceiling × fatigue only), `engine/truth-event.test.ts` future tree
2100 leaves = the cap (main 2098: a 2-leaf margin that the hemo beat arrays move by ±4 — D16, Q-FU6-8). Slow set
(CI=1, the prototype of Tasks 2–7 before the load refinement): 40/41 files, 182/183 tests; the one failure is
`circ-sanity-2` R23 ephedrine `it.fails` "passing" through hypoxaemia (SaO2 21 % on room air after propofol in the
75 y rig) — Task 4's FiO2 0.5 rig change restores it (both R23 `it.fails` fail again, kIsch 1.00). Tasks 1–6 applied
by the verifier to a clean `4f4ce06` tree: typecheck clean; the new unit tests green; the engine tests green except the
R1-dependent rows recorded in Tasks 4–5.

### Final applied-tree run (every task, `94040f7`, 2026-09-28 — what the executor should see before FU-4/V.1)

The plan's blocks applied in task order by `scratch/plans-backup/fu-4-verify.py` (28 creates, 185 edits, 0 errors as the
writer left it; **28 creates, 205 edits, 0 errors** after the R50 fixes — the finisher's re-verification, with FU-4's
`physicalDeadSpace()` emulated),
then `pnpm install --frozen-lockfile --offline` in that tree:

| check | result |
|---|---|
| `pnpm -r typecheck` | clean, 8 packages |
| engine fast set (`CI=1 PME_TEST_SET=fast`) | 250 files, 1,092 passed, 1 skipped, 0 failed (51 s) |
| engine slow set (`CI=1 PME_TEST_SET=slow`, 44 entries, three shards) | every file green except the three rows that need FU-4/V.1 and say so: RS1 (PaCO2 50.0, VD/VT 0.54) and Task 17's two child rows (PaCO2 79.2; SpO2 lag 66 s); every pre-declared `it.fails` still failing |
| `@pme/ventilator` tests | 88 passed; `link-parity` 2 failed as expected before V.1 (Task 9 Step 4 numbers) |
| `fu6.e2e.ts` smoke (system Chrome) | passed, 39 s |
| `pnpm run audit:respiratory M-` | 3 matrix scenarios run; the infant (PD-12) raises the engine exception main raises too (FU-4 Request 3); the CLI continues |

Found and fixed while finishing (each is in its task): the PE J-drive is additive (D17); the VCV Pmax acts inside the
sub-step (D18); the 30-min ventilated rigs stay paralysed (D19) — and three existing rigs with an unparalysed patient on
the internal ventilator were re-derived (`pk-bus`, `lung-circ`, `endo-circ-acceptance`); `circ-sanity-2` H7 reads
time-averaged pressures (1 Hz samples aliased against the breathing phase); `circ-hypoxic-arrest`'s final HR measured
130.0 on `94040f7` (the flip that number would have justified is FU-4's, already made — F4: FU-6 re-measures and
reports); RS3/RS4/RS5/RS9/RS10 read what their bands mean (apnoea counts as VT < 100; the first BVM
breath; the waveform, not FU-5's numeric; Pmax 80 for dynamic hyperinflation) and split the missed halves into
`it.fails` rows with their numbers; the evidence page's event handler narrows `t`.

## Requests to other stages

- **FU-4 (lands first; being fixed in parallel):**
  1. **R1 root (FU-4 Task 15, extended):** FU-6's drive composes with FU-4's resting PaCO2: the wake term is ADDED to
     `spont.paco2Set`. If FU-4 moves the set point out of `spont.paco2Rest` (e.g. a patient-derived 40 mmHg constant),
     keep `paco2Rest` as the field the drive reads, or tell the FU-6 executor the new name (Task 4 re-anchors on it).
     Task 0's hard precondition checks the root: a MODELED 4 y child's `vdExtraMl` ≈ 0.
  2. **Per-patient resting PaCO2:** if FU-4's per-patient defaults take a set point, expose it as one function
     (`restingPaco2(pat)` or similar) so FU-6 Task 13 subtracts pregnancy's 9 mmHg in ONE place.
  3. **An engine crash the R1 root must end (found while finishing this plan, on main itself):** a 6-month 7 kg infant
     on ETT + VCV 30 × 56, propofol + rocuronium, throws `RangeError: rhythm sinus: next event time is NaN` at 240 s on
     `94040f7` (175 s with FU-6): the MANUAL EtCO2 fit gives the infant 400 mL of dead space, VA is 0, PaCO2 climbs past
     188 and turns NaN, and the NaN reaches the rhythm planner. FU-4's R1 root removes the cause; a NaN guard where
     PaCO2/pH feed the circulation and the rhythm is a robustness item for FU-4 (or an FU-7 ticket). A 4 y child on VCV
     20 × 128 (8 mL/kg) is pulseless by 10 min for the same reason (VD 459 > VT 128). FU-6's audit CLI survives the
     exception (Task 1) so the gate's `all` run completes.
  4. **ONE dead space — a PRECONDITION, not a request** (Orchestrator ruling (FU-6 review), 2026-09-28, blocker F1;
     FU-4's executor has been told to do it). FU-4 exports **`physicalDeadSpace()`** from `l2/resp/pipeline.ts` — the
     physical series dead space (anatomical with the ETT/SGA bypass credited, `ETT_BYPASS_ML_PER_KG` 1.1 mL/kg IBW
     floored at 30 %, plus the apparatus; ≈ 127 mL for the 70 kg ventilated rig) — and `deadSpace()` becomes
     `physicalDeadSpace(…) + fit`. FU-6's capnogram (Task 8) CALLS that function and defines nothing of its own: the
     plateau's washout volume and `alveolarVentilation` must be the same number. Task 0 Step 1's second hard
     precondition checks it and STOPs if it is missing. The matrix cell PD-12 (an adult HME on an infant's circuit)
     needs the apparatus volume as a settable input (e.g. `ventilation.apparatusMl`); if FU-4's per-patient defaults add
     it, `physicalDeadSpace` carries it and FU-6 inherits it for free.
  5. **One PE event (FU-4 Task 11):** FU-6 Task 10 reads the PE severity for the J-receptor drive from the lung spec
     `pe` in `rs.lungSpecs`; FU-4's alias must leave the lung spec present when `condition pe` is sent (its stated design:
     "both give identical state"). FU-4's one-PE task owns the PE hypoxaemia (awake SaO2 is 96 % on `94040f7` + FU-6).
  6. **Pleural input (FU-4 Task 10):** FU-6 Task 6 adds a subtractive obstructed-effort term to the same
     `pleuralPressureMmHg`; FU-4's `weightKg` parameter is kept. The per-breath tension-pneumothorax build-up (FU-4's
     lungs exception) and FU-6's `Cycle.pmus` are independent fields of the same cycle.
  7. **Truth budget:** FU-4's SKIP_PATH entries (E-FU4-3: `hemo.circ.acc`, `hemo.circ.cppAcc`) AND FU-5's (R-FU5-2:
     `hemo.num`, `resp.num`, `hemo.nibp`) are on the same line FU-6 edits (E-FU6-8) — a THREE-way merge (F10(5)); the
     merged line is the union of FU-4's, FU-5's and FU-6's entries, none dropped.
  8. **`circ-sanity-2`:** FU-6 edits its R23 rig (O2) and makes H7 read time-averaged pressures (Task 4, E-FU6-7); if
     FU-4 Task 2 rewrote those rigs, FU-6 applies the same two changes to FU-4's version.
- **Stage V.1 (lands second):** FU-6 Task 9 relies on V.1 Task 5's absolute lungState (`resistanceCmH2OPerLps`,
  `complianceMlPerCmH2O`, `pleuralCmH2O`) and on the link profiles carrying `lungConditions` (Task 6). The parity test
  (RS15) runs the link with the `bronchospasm` profile at the same Pmax as the engine's VCV (FU-6 default 40; the link's
  default 35 is a ventilator setting the test sets explicitly) — V.1, please state the link's Pmax semantics (the
  airway-opening pressure, as FU-6's) in its docs. Measured before V.1 (Task 9 Step 4): on a HEALTHY lung the link's
  Ppeak is 23.8 vs the engine's 16.8 cmH2O at the same VT. **Part of that gap is not a circuit term at all (F5b;
  Orchestrator ruling (FU-6 review), 2026-09-28): the two paths use different INSPIRATORY FLOWS.** The link's `presets.ts`
  drives volume control with a square `vcFlow: 60` L/min plus `pause: 0.3`, while the engine's VCV uses `x = c.vt / c.ti`
  ≈ 18 L/min; at a tube resistance of ≈ 5 cmH2O/L/s a 42 L/min difference is ≈ 3.5 cmH2O of resistive peak by itself, and
  the rest of the resistive peak scales the same way. So: (a) V.1 please say which CIRCUIT model is right (the engine's
  `rTube` is the ETT's; the link appears to add a circuit/tube pressure), and (b) please expose the link's `vcFlow`/`pause`
  (or state their semantics) so RS15 can MATCH the inspiratory time to the engine's cycle — until then RS15 bands the
  flow-independent **Pplat** and the delivered VT and LOGS both peaks with their flows, because no V.1 answer can make a
  Ppeak-within-10 % band hold between two different flow patterns. V.1's E-V1-1 CO-ratio fix moves Task 17's child
  numbers and Task 7's child `it.fails`.
- **FU-7 "drug layer" (executes immediately AFTER FU-6 merges; R51 addenda 19–24, addendum 20; the seam F3 asked for,
  Orchestrator ruling (FU-6 review), 2026-09-28).** FU-6 owns the wakefulness/LOC term, the relative apnoea threshold and
  the drug→depression mapping in 7f's `neuroResp`; the HYPNOTIC LEVEL it reads is 7f's `d.hypnotic` (`neuro/depth.ts`),
  and under addendum 20 that input's SOURCE becomes 7g's ONE hypnotic-potency output (`pk.bus.cns.hypPropEq` /
  `hypVentPropEq`, propofol-equivalent brain Ce — FU-7 Tasks 3 and 6). Consequences to state here and in the gate note:
  1. On FU-6's own tree `d.hypnotic` reads four drugs only, so **thiopental and etomidate produce no LOC** — hence no
     induction apnoea and no anaesthetised-lung state after them (coverage-run-1 finding 2, research/14). That is FU-7's
     to fix, not FU-6's: FU-6 adds NO second hypnotic input. It DOES add exactly ONE NMB arm to `hvrDep`
     (`HVR_NMB_EMAX` 0.3 over TOFR 0.9 → 0.7, Eriksson 1993 — Orchestrator ruling (FU-6 review), 2026-09-28, D21:
     Q-FU6-4's "reduced hypoxic response"; that answers Q-FU6-15 for the residual-block range), and **FU-7 adds none** —
     its Task 6 keeps FU-6's `hvrDep` expression and multiplies its own potency terms into it, never a second NMB
     factor. FU-6's bands are all written on propofol/volatile/opioid/midazolam inductions for that reason.
  2. FU-7's Task 6 is written ON FU-6's `drive.ts`: it REPLACES FU-6's `dProp`/`dMid`/`dKet` lines with the Greco surface
     over 7g's potency outputs and KEEPS `loc`, `pain`, `hvrDep`. FU-6 must therefore leave those three fields, the
     `LOC_*`/`HVR_*` constants and the return literal in the shape FU-7's Task 0 expects (it greps for them).
  3. FU-7's Task 7 reads FU-6's `APNOEA_VE_IN/OUT` and `s.rr === 0` and must not reintroduce an absolute VE threshold.
  4. `bus.airway.bronchodilation` keeps its "relaxation only" meaning, so FU-7's histamine CONSTRICTOR (morphine,
     atracurium; addendum 24) enters through FU-6's `SMOOTH_MUSCLE`/`relaxed` path as a severity, not as a negative B;
     FU-6's magnesium PD entry (E-FU6-1) is the row FU-7's Task 0 expects to find in `rows-other.ts`.
  5. The volatile `bronchodilation` Emax 1 at EC50 0.5 MAC (7g's row, not FU-6's) makes 0.8 MAC sevoflurane a nearly
     complete bronchodilator once FU-6 consumes the state; volatiles reduce airway resistance by ≈ 20–40 %, so **FU-7
     re-fits that row** against that band (FU-6 only reads it — F6(ii)).
  6. **The seam, stated both ways (`loc` and the apnoea truth; FU-7 Tasks 3, 5, 6, 7 as written in
     `docs/plans/fu-7-drug-layer.md`).** *What FU-6 provides:* `neuro.resp.loc` = the 0–1 ramp of 7f's `d.hypnotic` over
     `LOC_LO` 0.6 → `LOC_HI` 1.0 (≥ 1 = unconscious, depth.ts's own scale); the MODELED apnoea IS `resp.spont.rr === 0`,
     decided by the relative threshold `APNOEA_VE_IN/OUT` (0.10/0.15 × resting V̇E) — never an absolute V̇E. *What FU-6
     requires of FU-7:* Task 5 may change the SOURCE of `d.hypnotic` (7g's `cns.hypPropEq`, propofol-equivalent) but
     not its SCALE — `d.hypnotic` ≥ 1 must still mean unconscious, or FU-6's `loc` ramp must be re-anchored in the same
     commit; Task 6's `hypVentPropEq` replaces `dProp`/`dMid`/`dKet` only; Task 7's flag (`spontRr <= 0` in MODELED)
     is exactly FU-6's apnoea and must stay the ONLY apnoea truth there. *What FU-7 requires of FU-6* (its Task 0 Step
     4 greps for them): `LOC_*`, `HVR_*`, `loc`/`pain`/`hvrDep`, `APNOEA_VE_IN/OUT`, `s.rr === 0` — all kept.
  7. **The induction-apnoea draw (F7).** FU-6's apnoea is PROBABILISTIC: one seeded draw per patient (`'resp-wake'`
     stream → `WAKE_QUANTILES` → `resp.wakeMmHg`). Consequences for FU-7: (a) its Task 7 case 5 ("propofol 2 mg/kg
     alone is briefly apnoeic, 10–90 s — FU-6's own band") is FU-6's SEED-7 row: FU-7's rig must use seed 7 (u 0.737,
     the modal patient) or pick a seed whose draw lies in 0.64–0.88, and say so in the title; (b) once Task 5 gives
     thiopental and etomidate LOC, their induction apnoea follows the SAME per-patient draw — FU-7 adds no second
     random source for apnoea; (c) population claims (Bailey 1990's apnoea in 6/12, DI-03) are statements about many
     seeds — assert them over a seed set, as FU-6's 20-seed row does, not on one patient.
  8. **The hypoxic drive below the CO2 threshold (F9).** Since F9 a hypoxaemic patient whose PaCO2 is under its
     apnoeic threshold still breathes (the independent carotid-body term), so `resp.spont.rr` > 0 and FU-7's Task 7 flag
     is false for him — that is the intended truth (he is not apnoeic), not a disagreement. `hvrDep` (FU-6) depresses
     both hypoxic terms; FU-7 adds no term to it (item 3 of FU-7's own list).
- **FU-5 (parallel, monitor fidelity):** the EtCO2 numeric holds the last detected breath's value until the gas-apnoea
  timer fires, then goes invalid (audit Q11, D10). Two FU-6 facts for FU-5's breath detector, measured on `94040f7` +
  FU-6: (a) after a circuit disconnection the capnogram is flat within one breath (0.0 from +4 s) while today's numeric
  holds 40 for 13 s — FU-5's hold must not delay a disconnection past the vendor's apnoea timer; (b) with FU-6's
  alveolar fraction, breaths between 0.6 and 1.4 × the dead space draw partial plateaus (15–28 mmHg at PaCO2 50), below
  0.6 × none — the hold must be keyed on DETECTED breaths (the vendor's rise threshold), not on the driver's cycles.
  FU-6 does not edit `l3/**`; its tests read the waveform (`read62(…, 'co2', …)`), never the numeric, wherever the
  numeric's hold is FU-5's.
- **Stage 7k — respiratory mechanics & volumes (R57, after FU-6).** FU-6 pre-empts nothing on 7k's list and leaves these
  hooks (all in truth or exported):
  1. **Ppeak:** FU-6 adds no Ppeak leaf; its tests sample `resp.lung.mech.paw` at 10 Hz (`fineWindow`, test helper).
     7k adds the per-breath Ppeak (max Paw over the inspiration) and should note that the internal VCV's Ppeak is now
     bounded by `resp.driver.vent.pmax` (default `VCV_PMAX_DEFAULT` 40, D18).
  2. **Pplat, PEEPi, ΔP:** `resp.lung.pInsp`, `resp.lung.peepTot` unchanged; the delivered VT of a pressure-limited
     breath is the cycle's `vt` after end-inspiration (Task 9) — 7k's Cstat/Cdyn and ΔP must use it, not the set VT.
  3. **Transpulmonary pressure / Pes estimate:** `respPleural(rs, t)` now includes the obstructed-effort swing
     (`Cycle.pmus`, Task 6) and the cough pressure (`mech.pMus`, Task 11); PL = Paw − Ppl reads it.
  4. **FRC and its derivatives (ERV, IC):** `resp.lung.frcGaMl` is now the CONTINUOUS FRC between awake and
     anaesthetised (`frcNow`, `resp.gaLvl`, Task 7) — 7k's FRC readout reads it; RV/TLC stay constants until 7k.
  5. **VD set:** FU-4's `physicalDeadSpace(rs)` (VD anat with the airway-device bypass credited + VD app, exported from
     `l2/resp/pipeline.ts`; FU-6 adds no dead-space function of its own — blocker F1), `lp.side[].vdAlv` (VD
     alv), `co2.vdExtraMl` (the MANUAL fit — never physiology). VD/VT (Enghoff) needs the mixed-expired PCO2 7k adds.
  6. **FEV1/FVC reversibility:** the one airway-smooth-muscle state `resp.bd` and `SMOOTH_MUSCLE` (reversible fraction
     per condition: asthma 0.7, COPD 0.2 on Raw) are what a post-bronchodilator spirometry should read (asthma ≥ 12 %
     and 200 mL; COPD small) — through `reversibleShare` (F6), so a long-standing attack reverses less.
  7. **Closing capacity:** `resp.gaLvl` is the anaesthetised-state input 7k's CC > FRC logic (age, obesity, supine)
     can key on.
- **Stage 7j — obstetric physiology (R59).** FU-6 Task 13 covers only the respiratory set point and VO2 (D20). 7j owns:
  gestational age (`pregnancyWeeks`) replacing the lung-row severity proxy — FU-6's `pregnancy(rs)` (Task 13, one
  function) is the single place to re-point; the ODC right shift (P50 26.7 → 30.4 at term, Hegewald & Crapo 2011 — this
  plan earlier asked 7c; R59 makes it 7j's); renal HCO3 compensation (18–22); CO/HR/plasma volume and dilutional
  anaemia (FU-6's viscosity term then lowers SVR by itself, Task 14); aortocaval compression (a position input); MAC
  reduction; closing capacity > FRC supine (with 7k); and the pregnancy apnoea band — RS2's pregnancy row stays
  `it.fails` at 4.83 min in FU-6 and the matrix cells A09-B4/B4g are 7j's to flip.
- **Stage 9 / the glossary (R55, R56).** Proposed labels for FU-6's new model quantities (glossary §5 style: label ·
  name · unit): `resp.gaLvl` "GA lung state · anaesthetised-lung level (FRC, VO2, atelectasis) · 0–1"; `resp.bd`
  "Bronchodilation · airway smooth-muscle relaxation (β2 agonists, adrenaline, volatiles, ketamine, Mg) · 0–1";
  `neuro.resp.loc` "LOC · loss of consciousness (ventilatory drive) · 0–1"; `neuro.resp.pain` "Nociceptive drive ·
  0–1"; `neuro.resp.hvrDep` "HVR depression · hypoxic ventilatory response depression · 0–1"; `resp.driver.vent.pmax`
  "Pmax · pressure limit (volume control) · cmH₂O" (Dräger "Pmax", GE "Plimit"); `resp.palvObs` "Palv (obstructed
  effort) · mean alveolar pressure of obstructed efforts · mmHg"; `resp.spont.pc` and `.effort` stay out of truth
  (SKIP_PATH, D16). The FU-6 evidence page (Task 19) is a developer page and already uses the glossary labels.
- **7c (information):** E-FU6-4 adds the COHb washout (`cohbWashout`) and the viscosity factor (`setCircViscosity`,
  `hbRef`) to 7c's files, and the NPPE input to `lungWaterStep`. 7c's own later passes keep them.
- **7e:** E-FU6-5 (an O2-extraction sympathetic input) was planned and WITHDRAWN: the viscosity term reaches HR and CO
  through 7a's baroreflex (Task 14). No 7e file changes.
- **Stage 8b (release):** the physiology overview must describe (a) the one airway-smooth-muscle state and which drugs
  feed it (and the non-reversible share by severity and age — status asthmaticus, F6), (b) the drive's wakefulness
  term, central lag, load compensation, the hypoxic plateau below the CO2 threshold (F9) and the added J-receptor drive (induction
  apnoea is PROBABILISTIC — one seeded draw per patient following the Diprivan label, ≈ 43 % apnoeic, modal 30–60 s, longer with an opioid (F7)), (c) the derived anaesthetised-lung state
  and the `thermal` override, (d) the internal VCV's Pmax and assist-control triggering, (e) `pnpm run
  audit:respiratory` as the respiratory integration check to rerun before a release.
- **R44 calibration pass (Ali):** rows listed in the gate note §7 — WAKE_MMHG 8 and F7's WAKE_QUANTILES knots (2 /
  6.6 / 8.4 / 11 / 14.5 mmHg at u 0 / 0.57 / 0.64 / 0.88 / 1), F9's HVR_INDEP_VE 0.5, CENTRAL_TAU_S 90, APNOEA_VE_IN/OUT
  0.10/0.15, GA_TAU_ON/OFF 20/300 s, PMUS_REST 8, the smooth-muscle fractions 0.85/0.85/0.7/0.2, the non-reversible
  share REFRACT_SEV 0.6 / REFRACT_DUR_MAX 0.9 / REFRACT_TAU_MIN 360 (F6), magnesium Emax 0.35,
  the capnogram alveolar-fraction ramp 0.6–1.4 × VD, VCV_PMAX_DEFAULT 40, KINK_R_MULT 150, BUCK_CMH2O 30,
  J_PE_VE_FRAC 2.4 / J_PE_RR 4, VISC_EXP 0.6, the COHb exponent 0.8, K_PVR_CO2 0.015, ATEL_IND (induction shunt), the
  child GA FRC.

## Architecture in one page

**Bronchodilation (Tasks 2–3).** 7g → `bus.airway.bronchodilation` B → `engine.ts` resp ctx `bronchoDil` → resp
`gasStep` (re-resolve when |ΔB| ≥ 0.01) → `resolveLung(specs, ibw, B, evlwiAdd, exempt)`:

```
 effective severity of a smooth-muscle condition for key k:  s_eff = s · (1 − share · B)   (k in its reversible keys)
   share = frac · (1 − 0.6·clamp((s − 1)/0.25)) · (1 − 0.9·(1 − e^(−age/360 min)))   F6: severity and duration
   age = sim time since the condition appeared + the spec's ageMin (lungCondition … ageMin: status asthmaticus)
   bronchospasm / anaphylaxis 0.85 (all keys) · asthma 0.7 (raw, rawExp, fSlow, tauSlowS, vqLow) · copd 0.2 (raw)
 airway event `bronchospasm` s  ≡  lung spec { id: 'bronchospasm', severity: s }   (Stage 3 rawEvent/gradient/shunt retired)
 shark fin severity = spasmSeverity(specs, B)  →  driver.spasm  →  cycles' shape 'shark'
 7e anaphylaxis (endo.lungSev > 0) → exempt from B (7e applies its own relief)
```

**The spontaneous drive (Tasks 4–6, 14).** 7f `neuroResp` → `{ …, loc, pain, hvrDep }` → `stepSpontDrive` (1 Hz):

```
 Pc ← Pc + (PaCO2 − Pc)(1 − e^(−1/90))                     central chemoreceptor lag
 stimulus = 0.3·PaCO2 + 0.7·Pc
 B = set − VE0/S + 8·loc                                    wakefulness drive lost at LOC
 VE = [max(S·(stimulus − B)₊ · (1 + (H − 1)(1 − hvrDep)), 0.5·VE0·(H − 1)(1 − hvrDep)) + 2.4·VE0·jDrive] · (1 − dOp)(1 − dHyp) · F · (1 + 0.3·pain)
      H = H(PaO2); the second term of the max is F9's hypoxic plateau below the CO2 threshold; B uses the patient's F7 draw
      hvrDep = volatile ∪ propofol ∪ opioid ∪ midazolam ∪ D21's residual-block arm (0.3 at TOFR ≤ 0.7, Eriksson 1993)
 apnoea: VE < 0.10·VE0 (resume > 0.15·VE0)
 RR = rr0 · rrF · q^(q < 1 ? 0.5 : 0.5·(1 − load)) + 1.5·(EVLWI − 10)₊ + 4·jDrive   q = VE/VE0; load = max(7f obstruction, airway `obstructed`)
      7f obstruction = max(sedation, residual·(0.25 + 0.75·loc))   D21: the residual share is arousal-scaled (Eikermann 2003)
 VT_neural = min(VE/RR, 35 mL/kg IBW · F);  effort = VT_neural / VT0;  VT_delivered = VT_neural · nmbVt · (1 − obstruction)
 cycle.pmus = obstruction · min(90·strength·pMax·F, 8·effort)   (complete obstruction: all)
 7a pleural(t) = … − pmus · sin(π u / Ti)                   → pulsus through 7a's interdependence; NPPE through 7c
```

**Anaesthetised lungs (Task 7).** `gaLvl` → FRC (awake → GA), VO2/VCO2 × (1 − 0.15·gaLvl), induction atelectasis at
gaLvl ≥ 0.5; target max(loc, 1 − diaphragm strength); τ 20 s on / 300 s off; `thermal 'general'` = 1.

**Capnogram (Task 8).** `level(c) = etco2 × alvFrac(c)`, alvFrac = clamp((VT − 0.6·VDs)/(0.8·VDs)) — 0 below 0.6 of the
series dead space, 1 above 1.4×.

**Ventilator (Tasks 9, 11).** Internal VCV: a flow source limited at Pmax inside every 4 ms mechanics sub-step (D18);
the cycle's `vt` becomes the delivered volume at end-inspiration (VA and the capnogram's alveolar fraction follow).
Kinked tube = the airway event `obstructed` on a mechanical source → tube resistance × (1 + 149·severity) (a
pressure-limited small breath, not Paw = PEEP). Assist-control: when the
MODELED drive's rate exceeds the set rate, the patient's rate triggers breaths; bucking = a light, stimulated,
unparalysed patient.

## File map

| File | Owner (exception) | Tasks | Change |
|---|---|---|---|
| `scripts/audit-respiratory/{hooks.mjs,runner.ts,scenarios.ts,summarize.ts,view.ts,probe-*.ts}` (copied), `cli.ts` (new); root `package.json`, `.gitignore` | tooling | 1 | the audit as `pnpm run audit:respiratory`; FU-6 columns and scenarios |
| `packages/engine-core/src/l2/lung/conditions.ts` | lungs | 2, 3 | `SMOOTH_MUSCLE`, `REFRACT_*`, `reversibleShare` (F6), `relaxed`, `spasmSeverity`; `resolveLung(…, bronchoDil, bdExempt, smAgeMin)` without `rawEvent` |
| `packages/engine-core/src/types-lung.ts` | lungs | 2 | `LungConditionSpec.ageMin` and the `lungCondition` event's `ageMin` (F6) |
| `packages/engine-core/src/l2/lung/drive.ts` | lungs | 4, 5, 6, 10 | `WAKE_MMHG`, `APNOEA_VE_IN/OUT`, `PMUS_REST_CMH2O`, `J_PE_VE_FRAC`, `J_PE_RR`; `wake`/`apnoeic`/`load`/`hvrDep`/`jDrive` inputs |
| `packages/engine-core/src/l2/lung/mechanics.ts` | lungs | 9, 11 | `mechSubstep(…, pLimit)` (VCV Pmax); `MechState.pMus` (cough) |
| `packages/engine-core/src/l2/lung/lung.ts` | lungs | 9, 15 | `lungMechStep(…, pLimit)`; `GasInputs.hpvInhibit` replaces `volatileMac` |
| `packages/engine-core/src/l2/lung/perfusion.ts` | lungs | 15 | `perfusion(…, hpvInhibit)` |
| `packages/engine-core/src/l2/neuro/drive.ts` | 7f (E-FU6-2) | 4, 5, 10 | `LOC_LO/HI`, `UA_AROUSAL` (D21), `HVR_*` incl. `HVR_NMB_EMAX`/`HVR_NMB_TOFR_LO` (D21); `DriveInputs.hypnotic/stress`; `NeuroResp.loc/pain/hvrDep` |
| `packages/engine-core/src/l2/neuro/pipeline.ts` | 7f (E-FU6-2) | 4, 10 | `IDLE_RESP` fields; passes `d.hypnotic`, `d.stress` |
| `packages/engine-core/src/l2/neuro/spont.ts` | 7f (E-FU6-2) | 4, 5, 10, 13 | `CENTRAL_TAU_S`, `PERIPH_SHARE`, `VT_MAX_ML_KG`; `SpontDrive.pc/effort`; `SpontInputs.ibwKg/airwayObs/jDrive/setShift` |
| `packages/engine-core/src/l2/resp/pipeline.ts` | Stage 3 | 2, 3, 5–13, 15 | ctx fields; `bd`/`bdExempt`; bronchospasm alias; `obstructedEffort`; `palvObs`; `gaLvl`/`gaLevel`/`frcNow`; the capnogram's VDs = FU-4's `physicalDeadSpace` (no FU-6 dead-space function, F1); Pmax command + `lungDrive` limit; `KINK_R_MULT`/`BUCK_*`; drive on the ventilator; inspired CO2; `pregnancy`; HPV input |
| `packages/engine-core/src/l2/resp/driver.ts` | Stage 3 | 3, 6, 8, 9, 11 | `DriverState.spasm`; `Cycle.pmus/alvFrac/buck`; `DriverCtx.pmusObs/pmusFull/vdSeriesMl/triggerRr/buck`; `alveolarFraction`; `VCV_PMAX_DEFAULT`; kinked mechanical cycles |
| `packages/engine-core/src/types-resp.ts` | Stage 3 | 9 | `ventilation.pmax` |
| `packages/engine-core/src/l2/co2/capno.ts` | Stage 3 | 8 | plateau × `alvFrac` |
| `packages/engine-core/src/l2/gas/co2.ts` | Stage 3 | 12 | `Co2Inputs.pico2` in the elimination term |
| `packages/engine-core/src/l2/gas/params.ts` | Stage 3 | 13 | `PREG_PACO2_SHIFT_MMHG`, `PREG_VO2_TERM` |
| `packages/engine-core/src/l2/circ/pleural.ts` | 7a (E-FU6-3) | 6 | `obstructedSwingMmHg`, subtracted |
| `packages/engine-core/src/l2/circ/model.ts` | 7a (E-FU6-3) | 14, 16 | `ext.viscF` on SVR; hypercapnic PVR factor |
| `packages/engine-core/src/l2/circ/params.ts` | 7a (E-FU6-3) | 16 | `K_PVR_CO2` |
| `packages/engine-core/src/l2/blood/pipeline.ts` | 7c (E-FU6-4) | 6, 14 | NPPE transmural term; viscosity write (MODELED) |
| `packages/engine-core/src/l2/blood/{core,params,circ-adapter}.ts` | 7c (E-FU6-4) | 14 | `cohbWashout`; `hbRef`; `VISC_EXP`, `setCircViscosity` |
| `packages/engine-core/src/l2/pk/data/rows-other.ts` | 7g data (E-FU6-1) | 2 | magnesium `bronchodilation` PD entry |
| `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` | 7g data (E-FU6-1) | 15 | `VOLATILE_HPV` on isoflurane and desflurane |
| `packages/engine-core/src/engine.ts` | engine (E-FU6-6) | 2 | the `advanceResp(` ctx: `bronchoDil`, `hpvInhibit`, `anaphEndo` |
| `packages/engine-core/src/truth.ts` | 7x (E-FU6-8) | 7 | SKIP_PATH `resp.spont.pc`, `resp.spont.effort`, `resp.wakeMmHg` (three entries) |
| Tests (new, fast): `test/helpers/fu6.ts`, `test/l2/lung/{bronchodilation,drive-fu6}.test.ts`, `test/l2/resp/capno-deadspace.test.ts`, `test/l2/gas/inspired-co2.test.ts`, `test/l2/blood/cohb-washout.test.ts`, `test/engine/resp-capno-deadspace.test.ts` | — | 2, 4, 8, 12, 14 | |
| Tests (new, SLOW): `test/engine/{resp-bronchodilation,resp-bronchospasm-one,resp-induction,resp-obstruction,resp-pleural-effort,resp-ga-state,resp-vcv-pmax,resp-drive-fu6,resp-trigger,resp-inspired-co2,resp-pregnancy,blood-anaemia-co,lung-hpv-volatile,lung-r14,resp-child-baseline,resp-suite}.test.ts` | — | 2–18 | 16 entries in `vite.config.ts` `SLOW` (after FU-4 Task 20 `SLOW_B` is derived from `SLOW` by filter, so they land in `slow-b`; never `SLOW_A`) |
| `packages/ventilator/test/link-parity.test.ts` (new) | — (V.1's package, test only) | 9 | RS15 |
| Tests (edited, E-FU6-7): `test/l2/lung/bronchodilation.test.ts` (Task 2's own), `test/l2/neuro/spont.test.ts`, `test/engine/circ-sanity-2.test.ts` (R23 O2, H7 time-averaged), `test/engine/lung-circ.test.ts`, `test/engine/pk-bus.test.ts` and `test/engine/endo-circ-acceptance.test.ts` (rocuronium), `test/helpers/lung.ts` (`hpvInhibit`) | — | 3, 4, 7, 11, 15 | rigs and reads only; no band moved, no flip (F4: `circ-hypoxic-arrest` is FU-4's flip — FU-6 re-measures it) |
| Tests (bands re-specified, **E-FU6-10**): `test/l2/neuro/depth-drive.test.ts`, `test/l2/neuro/pipeline.test.ts` | 7f | 5 | the awake residual-block arm follows Eikermann 2003; the tables §4.6 numbers kept on the unconscious arm (D21) |
| `packages/engine-core/vite.config.ts` | CI | 2–18 | SLOW entries |
| `apps/demo/{fu6.html,src/fu6.ts,e2e/fu6.e2e.ts}` (new), `apps/demo/vite.config.ts` | demo | 19 | evidence page, smoke, gate shots |
| Gate: `docs/gates/fu-6.md`, `docs/gates/fu-6/**` (audit before/after, suite rows, JPEGs) | — | 0, 19, 20 | |

Not touched (named because earlier drafts listed them): `l2/lung/recruit.ts` (R14's recruitment row needed no code:
Task 16), `data/lung-pathology.ts` (pregnancy constants live in `gas/params.ts`), `l2/endo/**` (E-FU6-5 withdrawn),
`l3/**` (FU-5), `packages/ventilator/src/**` (V.1).

---

### Task 0: Base check — FU-4 and V.1 on main, the worktree, the find blocks, the before-numbers

**Files:** none (the plan is committed in Step 2).

- [ ] **Step 1: Preconditions.** `git -C /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo fetch origin`
  and confirm `origin/main` contains the FU-4 merge ("FU-4: integration polish") AND the V.1 merge ("Stage V.1") with
  `git log --oneline origin/main | grep -E 'FU-4|V\.1|stage-v1'`. If either is missing, STOP and report (R53 order).
  **Hard precondition — FU-4's R1 ROOT (not only its MODELED-mechanical half):** create a MODELED 4 y 16 kg child
  (`createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 4, weightKg: 16, heightCm: 102 } })`), advance 60 s and read
  `st.resp.co2.vdExtraMl`: it must be ≈ 0 (no MANUAL EtCO2 fit in MODELED). Measured while writing this plan: on
  `4f4ce06` the fit gives this child 400 mL of dead space; with FU-6's VT ceiling (Task 5) that child's awake baseline
  COLLAPSES (PaCO2 66 → 79, RR 45, SaO2 87 % in 15 min; main alone 49–52), while with the fit removed FU-6's child is
  normal (PaCO2 43.5 at 15 min; main 43.3). If `vdExtraMl` is still > 50 mL for the child, STOP and report to the
  orchestrator: FU-6 must not land on a tree without the R1 root.
  **Hard precondition 2 — ONE dead space: FU-4 exports `physicalDeadSpace()`** (Orchestrator ruling (FU-6 review),
  2026-09-28, blocker F1; FU-4's executor was told to export it). Check it:

```bash
grep -n "export function physicalDeadSpace" packages/engine-core/src/l2/resp/pipeline.ts
grep -n "function deadSpace" -A 12 packages/engine-core/src/l2/resp/pipeline.ts
```

  Required: `physicalDeadSpace` exists and `deadSpace` is `physicalDeadSpace(…) + fit` (the MANUAL EtCO2 fit is the ONLY
  difference between them), and the physical value credits the artificial airway's bypass
  (`ETT_BYPASS_ML_PER_KG` ≈ 1.1 mL/kg IBW, floored at 30 % of the anatomical value). Measure it on the plan's own rig:
  a 70 kg adult on ETT + VCV must read ≈ **127 mL** (154 − 77 + 50), not 204. If the function is missing, STOP and report
  to the orchestrator — do NOT re-type the expression in `driverCtx` and do NOT restore FU-6's deleted `seriesDeadSpace`:
  two dead spaces in one engine is the defect this ruling removed. If FU-4 exported it with a second parameter
  (`physicalDeadSpace(rs, l1)`), pass `l1` in `driverCtx` and `ctx.l1` in `advanceResp` — a one-token re-anchoring, and
  record it in the gate note §8.
  **Hard precondition 3 — the infant crash is gone (FU-4 Request 3 / FU-4 Task 18g; F10, Orchestrator ruling (FU-6
  review), 2026-09-28).** The scenario `M-PD12-infant-vcv` lands with Task 1, so this check runs at the END of Task 1
  (Step 3), before any FU-6 engine code: `npx -y pnpm@9.15.9 run audit:respiratory M-PD12-infant-vcv; echo "exit $?"`,
  the full **1800 s**. It must end `ENGINE EXCEPTIONS: none` with exit 0 (on `94040f7` it threw `RangeError: rhythm
  sinus: next event time is NaN` at 175–240 s). This is the actual crash reproduction and it costs seconds. If it
  throws (exit 2), FU-4's R1 root or its NaN guard is not in — STOP and report.
  **Check 4 — the two alias mechanisms (F10(2)).** FU-4 expands PE/tension in an engine pre-step
  (`l2/circ/aliases.ts`, `obstructiveAlias`); FU-6 expands bronchospasm inside the resp `airway` command case (Task 3),
  because bronchospasm has no circulation owner to pre-step for. Confirm `grep -n "bronchospasm" packages/engine-core/src/l2/circ/aliases.ts`
  returns nothing (FU-4's alias table needs no bronchospasm row); if FU-4 added one, STOP and report (two aliases for
  one disease is the R6 defect).
- [ ] **Step 2: Worktree, branch, plan.**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git worktree add ../scratch/wt-fu-6 -b fu-6-respiratory-integration origin/main
cd ../scratch/wt-fu-6 && npx -y pnpm@9.15.9 install --frozen-lockfile
mkdir -p "<scratchpad>/fu-6-respiratory-integration"
cp ../../repo/docs/plans/fu-6-respiratory-integration.md docs/plans/
git add docs/plans/fu-6-respiratory-integration.md && git commit -m "docs(fu-6): respiratory integration plan

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -u origin fu-6-respiratory-integration
```

- [ ] **Step 3: Re-verify every find block on the merged main** (they were written against `94040f7`). The verifier is the
  FU-4 one (`scratch/plans-backup/fu-4-verify.py`), run in dry mode after staging Task 1's copied audit files:

```bash
V="<scratchpad>/fu-6-respiratory-integration/verify"; rm -rf "$V"; mkdir -p "$V"
git archive HEAD | tar -x -C "$V"
mkdir -p "$V/scripts/audit-respiratory"
for f in hooks.mjs runner.ts scenarios.ts summarize.ts view.ts probe-capno.ts probe-deadspace.ts probe-drive.ts probe-link.ts probe-olv.ts; do
  cp ../../research/09-audit-scripts/$f "$V/scripts/audit-respiratory/$f"; done
python3 ../plans-backup/fu-4-verify.py docs/plans/fu-6-respiratory-integration.md "$V" --dry
```

  Expected on `94040f7` (with FU-4's `physicalDeadSpace` emulated — the fixer's stub, since F1 makes it a
  precondition): `28 creates, 205 edits, 0 errors` (re-verified by the FU-6 finisher on `2360894` after every ruling of
  the R50 review was applied; `pnpm -r typecheck` clean, 8 packages, and `CI=1 … vitest run test/l2` green — 162 files,
  765 passed — on the applied tree). On the merged main, every error line names a task, a file and the first
  90 characters of the block: locate the same statement by its quoted comment (FU-4 and V.1 change the lines listed
  under Global Constraints), make the SAME change there when you reach that task, and list each re-anchoring in the gate
  note §8. Do not edit the plan's blocks in place; record the re-anchored text in the gate note.
  **The re-anchoring list (F10; the R50 reviewer measured FU-6 on a FU-4 + V.1 stack: 10 blocks stale).** Expect at
  least these, with the cause, and re-anchor each by making the SAME change on the merged text:

  | # | task / file | anchor | cause on the merged main |
  |---|---|---|---|
  | 1 | T2 `l2/resp/pipeline.ts` | `rs.coRatio = (cardiacOutput(h, t) / CO_REF_LPM) …` | V.1 E-V1-1: `h.cpr.active ? CO_REF_LPM : coRefLpm(rs.pat)` — insert FU-6's block after the new line |
  | 2 | T6 `l2/circ/pleural.ts` | `export function pleuralPressureMmHg(d, t, complianceMl)` | FU-4 G6 adds `weightKg = 70` — keep it |
  | 3 | T6 `l2/circ/pleural.ts` | `return P_PL0 - SPONT_SWING_CMH2O * (dv / Math.max(1, c.vt)) …` | FU-4 G6: `dv / (SPONT_VT_REF_ML_KG * weightKg)` — append ` - obs` to FU-4's expression |
  | 4 | T6 `l2/resp/pipeline.ts` | `const va = alveolarVentilation(d, t, deadSpace(rs));` | FU-4 R1 root: `deadSpace(rs, l1)` |
  | 5 | T7 `l2/resp/pipeline.ts` | Task 2's `// FU-6 R2: airway smooth muscle …` comment | cascade of #1 |
  | 6 | T7 `l2/resp/pipeline.ts` | `deadSpaceMl: deadSpace(rs), frcMl: rs.temp.anaesthesia === 'general' …` | FU-4 R1 root (also V.1's own stale block) |
  | 7 | T7 `src/truth.ts` | `const SKIP_PATH = new Set([…])` | FU-4 E-FU4-3 (`hemo.circ.acc`, `hemo.circ.cppAcc`) and FU-5 R-FU5-2 (`hemo.num`, `resp.num`, `hemo.nibp`): the UNION plus FU-6's four |
  | 8 | T7 `test/engine/circ-hypoxic-arrest.test.ts` | the final-HR `it.fails(… 132.1 …)` | FU-4 already flipped it — FU-6 no longer edits this file (F4; Task 7 Step 3b re-measures) |
  | 9 | T11 `test/engine/pk-bus.test.ts` | the VA `it.fails(… 2.82)` | FU-4 Task 18d flipped it to `it(… was 2.82 before FU-4 G11)` — apply only the rocuronium rig change |
  | 10 | T13 `l2/resp/pipeline.ts` | the `gas/params.ts` import line | V.1 adds `coRefLpm`; FU-4 adds `ETT_BYPASS_ML_PER_KG` — add FU-6's two names to the merged line |

  Plus the blocks this fixer added that anchor on lines FU-4/V.1 may have moved: F6's `lungCondition` validation and
  command-case edits (Task 2 Edits 5–6) and F7's `createRespState` / `stepSpontDrive(` call edits (Task 4 pipeline
  Edits 4–5). Row 8 no longer appears as an error (the edit was deleted); it is listed so the executor does not restore
  it.
- [ ] **Step 4: Before-numbers** (nothing asserted). Run the audit's scenarios that the suite and the prototype tables
  use on the merged main, BEFORE any FU-6 code, with the research scripts:

```bash
export PME_ENGINE=$PWD/packages/engine-core/src/index.ts RESULTS="<scratchpad>/fu-6-respiratory-integration/results-before"
cd ../../research/09-audit-scripts
node --import ./hooks.mjs cli.ts A1 A2 B C1 C4 D E1 E2 E3 F1 F3 G1 G2 G3 H1 I2 > "<scratchpad>/fu-6-respiratory-integration/before-tables.txt"
RESULTS="$RESULTS" node summarize.ts > "<scratchpad>/fu-6-respiratory-integration/before-summary.txt"
```

  Record in the gate note's "before" column: A2 PaCO2 at 30/60 min (FU-4's R1 should now give 35–42), E1/E1b peak and
  auto-PEEP, B1/B3/B4/B5 SaO2-90 % times, C4 max RR and VT, E2b post-release PaCO2, H1 PaCO2 vs control, G2 HR/CO, G3
  CaO2 at 60 min, F3 PaO2 before/after sevoflurane. These replace the audit's numbers as FU-6's baseline.
  **The BEFORE column's rig (F10(10)).** It is measured with the research scripts' own `RIG` (rocuronium 1 mg/kg bolus,
  no infusion), while FU-6's tests use `ventRig` (rocuronium 1.2 mg/kg + 0.6 mg/kg/h, D19). Say so in the gate note's
  §3 header, and where a before → after row moves by more than the drug/condition effect, note whether the rig
  difference (a diaphragm recovering above 5 % and triggering, D19) can explain it.
  **The tick-bench baseline (F10(8)).** Before any FU-6 code, on the merged main:
  `npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/perf/tick-bench.test.ts` (the bench is
  `packages/validation/src/perf/tick-bench.ts`; its test logs the p50)
  and record the local p50 in `<scratchpad>/fu-6-respiratory-integration/tick-bench-before.txt` and the gate note §6.
  FU-6 adds a 250 Hz `pLimit` comparison, a per-tick pleural `Math.sin` for obstructed cycles, the 1 Hz drive on
  ventilated patients and F6's per-10 Hz `filter` over the lung specs; Task 20 re-runs the bench against this number.

### Task 1: The respiratory audit runner in the repo — `pnpm run audit:respiratory` (tooling; PROTOTYPED)

**Files:**
- Create (copied verbatim, then edited below): `scripts/audit-respiratory/{hooks.mjs,runner.ts,scenarios.ts,summarize.ts,
  view.ts,probe-capno.ts,probe-deadspace.ts,probe-drive.ts,probe-link.ts,probe-olv.ts}` from
  `projects/patient-monitor-engine/research/09-audit-scripts/` (SHA-256 prefixes: hooks.mjs `7947b48dc7060e36`,
  runner.ts `194a70ab1bff7e23`, scenarios.ts `b0eb66dae339e8e2`, summarize.ts `4e598005bd16cca7`, view.ts
  `18e7ba6418a8c7cb`, probe-capno.ts `a1ba5f644a154daf`, probe-deadspace.ts `2ef884d5c3ce8021`, probe-drive.ts
  `e478cea9b91e5c43`, probe-link.ts `f117b4d8b892b393`, probe-olv.ts `23aa6bf00e69d1bf`; check with `shasum -a 256`)
- Create: `scripts/audit-respiratory/cli.ts` (replaces the research CLI: default paths, probes and the summary as
  subcommands)
- Modify: `scripts/audit-respiratory/runner.ts` (default engine/ventilator/results paths into `process.env`; pleural
  minimum, SBP swing, `gaLvl`, `effort`, `loc`, FRC columns), `scripts/audit-respiratory/scenarios.ts` (FU-6's
  bronchodilator and induction scenarios), root `package.json` (one script), `.gitignore` (the output folder)

**Why:** the orchestrator ruled the audit be rerunnable (R53); every task below measures with it and the gate stores
its output. **Prototype:** the edited runner ran 40+ scenarios on the prototype tree (≈ 1–10 s each, `fine` ones ≈ 9 s).

- [ ] **Step 1: Copy the ten files and check the hashes.**

```bash
mkdir -p scripts/audit-respiratory
for f in hooks.mjs runner.ts scenarios.ts summarize.ts view.ts probe-capno.ts probe-deadspace.ts probe-drive.ts probe-link.ts probe-olv.ts; do
  cp ../../research/09-audit-scripts/$f scripts/audit-respiratory/$f; done
(cd scripts/audit-respiratory && shasum -a 256 *.ts *.mjs | cut -c1-16,65-)
```

- [ ] **Step 2: Apply the edits and create the CLI.**

#### Modify `scripts/audit-respiratory/runner.ts`

Edit 1 — find:

```ts
const ENGINE = process.env.PME_ENGINE ?? join(HERE, 'wt/packages/engine-core/src/index.ts');
const RESULTS = process.env.RESULTS ?? join(HERE, 'results');
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => unknown };
```

replace with:

```ts
// FU-6 Task 1: defaults point at this repo; the probes and summarize.ts read the same variables through process.env
process.env.PME_ENGINE ??= join(HERE, '../../packages/engine-core/src/index.ts');
process.env.PME_VENT ??= join(HERE, '../../packages/ventilator/src/index.ts');
process.env.RESULTS ??= join(HERE, '../../.audit-respiratory/results');
const ENGINE = process.env.PME_ENGINE;
const RESULTS = process.env.RESULTS;
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => unknown };
const { respPleural } = (await import(join(dirname(ENGINE), 'l2/resp/pipeline.ts'))) as { respPleural: (rs: unknown, t: number) => number };
```

Edit 2 — find:

```ts
function sample(e: any, t: number, meas: Record<string, any>, lungEv: any, win: { pk: number; pkAlv: number }): Row {
```

replace with:

```ts
function sample(e: any, t: number, meas: Record<string, any>, lungEv: any, win: { pk: number; pkAlv: number; ppl: number; sbpMax: number; sbpMin: number }): Row {
```

Edit 3 — find:

```ts
    ga: rs.temp.anaesthesia, fatigue
```

replace with:

```ts
    pplMin: win.ppl, gaLvl: rs.gaLvl ?? NaN, effort: rs.spont?.effort ?? NaN, loc: nr.loc ?? NaN, frcNow: rs.lung.frcGaMl,
    dSbp: Number.isFinite(win.sbpMax) ? win.sbpMax - win.sbpMin : NaN, // FU-6: pleural minimum (mmHg) and SBP swing of `fine` runs
    ga: rs.temp.anaesthesia, fatigue
```

Edit 4 — find:

```ts
  const win = { pk: 0, pkAlv: 0 };
```

replace with:

```ts
  const win = { pk: 0, pkAlv: 0, ppl: 0, sbpMax: NaN, sbpMin: NaN };
```

Edit 5 — find:

```ts
    win.pk = -1e9;
    if (sc.fine) {
      for (let u = e.now().simT + 0.1; u < t - 1e-9; u += 0.1) { e.advanceTo(u); win.pk = Math.max(win.pk, e.st.resp.lung.mech.paw); }
    }
```

replace with:

```ts
    win.pk = -1e9;
    win.ppl = Number.NaN;
    if (sc.fine) {
      win.ppl = 1e9;
      for (let u = e.now().simT + 0.1; u < t - 1e-9; u += 0.1) { e.advanceTo(u); win.pk = Math.max(win.pk, e.st.resp.lung.mech.paw); win.ppl = Math.min(win.ppl, respPleural(e.st.resp, u)); }
      const bs = e.st.hemo.circ.beats.filter((b: any) => b.t > t - DT && b.sbp !== undefined);
      win.sbpMax = bs.length ? Math.max(...bs.map((b: any) => b.sbp)) : NaN;
      win.sbpMin = bs.length ? Math.min(...bs.map((b: any) => b.sbp)) : NaN;
    }
```

#### Modify `scripts/audit-respiratory/scenarios.ts`

Edit 1 — find:

```ts
  S('I2d-bronchospasm-both', 'Ventilated rig: airway bronchospasm 1 (Stage 3) AND lungCondition bronchospasm 1 (7b) at 600', [...RIG(), [E0, A.airway('bronchospasm', 1), 'airway bronchospasm'], [E0, A.lung('bronchospasm', 1), 'lung bronchospasm']], 1200, { printEvery: 60, fine: true }),
);
```

replace with:

```ts
  S('I2d-bronchospasm-both', 'Ventilated rig: airway bronchospasm 1 (Stage 3) AND lungCondition bronchospasm 1 (7b) at 600', [...RIG(), [E0, A.airway('bronchospasm', 1), 'airway bronchospasm'], [E0, A.lung('bronchospasm', 1), 'lung bronchospasm']], 1200, { printEvery: 60, fine: true }),
);

// ---- X. FU-6: treatment arms and induction variants (docs/plans/fu-6-respiratory-integration.md) ----
SCENARIOS.push(
  S('X-bs-untreated', 'lung bronchospasm 1 at 600, untreated', [...RIG(), [E0, A.lung('bronchospasm', 1)]], 1800, { printEvery: 60, fine: true }),
  S('X-bs-salb', 'bronchospasm 1 at 600, salbutamol 250 µg at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg']], 1800, { printEvery: 60, fine: true }),
  S('X-bs-sevo', 'bronchospasm 1 at 600, sevoflurane 2.5 % FGF 6 at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.vap('sevoflurane', 2.5, 6), 'sevoflurane 2.5 %']], 1800, { printEvery: 60, fine: true }),
  S('X-bs-adr', 'bronchospasm 1 at 600, adrenaline 50 µg at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('epinephrine', 50, 'mcg'), 'adrenaline 50 µg']], 1800, { printEvery: 60, fine: true }),
  S('X-bs-mg', 'bronchospasm 1 at 600, magnesium 2 g at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('magnesium', 2000, 'mg'), 'magnesium 2 g']], 1800, { printEvery: 60, fine: true }),
  S('X-bs-ket', 'bronchospasm 1 at 600, ketamine 1 mg/kg at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('ketamine', 1, 'mg/kg'), 'ketamine 1 mg/kg']], 1800, { printEvery: 60, fine: true }),
  S('X-asthma-salb', 'lung asthma 1 at 600, salbutamol 250 µg at 900', [...RIG(), [E0, A.lung('asthma', 1)], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg']], 1800, { printEvery: 60, fine: true }),
  S('X-copd-salb', 'lung copd 1 at 60 (RR 10), salbutamol 250 µg at 900', [...RIG({ rr: 10 }), [60, A.lung('copd', 1)], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg']], 1800, { printEvery: 60, fine: true }),
  S('C6-prop-fent', 'fentanyl 2 µg/kg at 180, propofol 2 mg/kg at 300, natural airway, room air', [[180, A.drug('fentanyl', 2, 'mcg/kg'), 'fentanyl 2 µg/kg'], prop(T0)], 900, { printEvery: 15 }),
  S('C6b-prop-fent-sga', 'as C6 via SGA', [[1, A.device('sga')], [180, A.drug('fentanyl', 2, 'mcg/kg'), 'fentanyl 2 µg/kg'], prop(T0)], 900, { printEvery: 15 }),
  S('C7-prop25-sga', 'propofol 2.5 mg/kg via SGA, room air', [[1, A.device('sga')], prop(T0, 2.5)], 900, { printEvery: 15 }),
  S('C8-prop-remi-sga', 'remifentanil 0.1 µg/kg/min from 120, propofol 2 mg/kg at 300, SGA', [[1, A.device('sga')], [120, A.infusion('remifentanil', 0.1, 'mcg/kg/min'), 'remifentanil 0.1'], prop(T0)], 900, { printEvery: 15 }),
  // R54 coverage-matrix LUNG cells FU-6 owns (research/12 §5.3, §5.5, §5.7): measured and graded in the gate note
  S('M-NN08-extub-hypoxic', 'NN-08: D3 (extubation at TOFR ≈ 0.6, FiO2 0.4) then room air at 4650 — obstruction and a blunted hypoxic response (the engine accepts FiO2 ≥ 0.21)', [...(SCENARIOS.find((x) => x.name === 'D3-extubation-residual')?.steps ?? []), [4650, A.spont({ fio2: 0.21 }), 'room-air challenge']], 5250, { printEvery: 30 }),
  S('M-PD11-child-vcv', 'PD-11: child 4 y 16 kg, ETT, VCV 20 × 128 (8 mL/kg), PEEP 5, FiO2 0.5, propofol + rocuronium', [[1, A.device('ett')], [1, A.vent({ rr: 20, vtMl: 128 })], [1, A.infusion('propofol', 150, 'mcg/kg/min'), 'propofol 150'], [1, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6']], 1800, { printEvery: 300, patient: CHILD }),
  S('M-PD12-infant-vcv', 'PD-12 (partial): infant 6 mo 7 kg, ETT, VCV 30 × 56 (8 mL/kg) — the weight-scaled apparatus only; an adult HME needs an apparatus-volume input (Request → FU-4)', [[1, A.device('ett')], [1, A.vent({ rr: 30, vtMl: 56 })], [1, A.infusion('propofol', 150, 'mcg/kg/min'), 'propofol 150'], [1, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6']], 1800, { printEvery: 300, patient: { ageY: 0.5, weightKg: 7, heightCm: 67 } }),
  S('M-CM07-copd-o2', 'CM-07: COPD GOLD 3 (lung copd 0.67, HCO3 30) awake on air, FiO2 1.0 at 600 — O2-induced hypercapnia (+5–20 mmHg)', [[600, A.spont({ fio2: 1 }), 'FiO2 1.0']], 2400, { printEvery: 120, patient: { ageY: 65, weightKg: 70, heightCm: 175, lungConditions: [{ id: 'copd', severity: 0.67 }], blood: { hco3: 30 } } }),
);
```

(`RIG`, `E0`, `prop`, `T0` and `CHILD` are the file's own helpers; `RIG(o)` takes the ventilator overrides. The four
`M-*` scenarios are the R54 matrix cells of Task 20 Step 3 §9; they assert nothing.)

#### Create `scripts/audit-respiratory/cli.ts`

```ts
// Respiratory integration audit — CLI (research/09-respiratory-integration-audit.md; FU-6 Task 1).
//   pnpm run audit:respiratory [scenario-or-prefix … | all]    one JSON per scenario → .audit-respiratory/results
//   pnpm run audit:respiratory probe <capno|deadspace|drive|link|olv>
//   pnpm run audit:respiratory summary                         per-step digest of every saved scenario
// Environment (defaults in runner.ts): PME_ENGINE, PME_VENT, RESULTS. A full run takes ≈ 8 min (M-series).
// Exit code (F10(6), Orchestrator ruling (FU-6 review), 2026-09-28): a bare invocation prints this usage and exits 0 —
// it never starts the ≈ 8 min `all` run by accident; `all` (or any selection) runs every picked scenario even if one
// raises an engine exception, prints `ENGINE EXCEPTIONS: <names>` at the end and exits 2 when any did (0 otherwise), so
// the gate can tell "a scenario threw" (2) from "the CLI itself failed" (1).
import { SCENARIOS } from './scenarios.ts';
import { run, table, save } from './runner.ts';
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('usage: pnpm run audit:respiratory <scenario-or-prefix … | all> | probe <capno|deadspace|drive|link|olv> | summary');
  console.log(`scenarios (${SCENARIOS.length}): ${SCENARIOS.map((s) => s.name).join(' ')}`);
} else if (args[0] === 'probe') {
  await import(`./probe-${args[1] ?? 'capno'}.ts`);
} else if (args[0] === 'summary') {
  await import('./summarize.ts');
} else {
  const pick = SCENARIOS.filter((s) => args.includes('all') || args.some((p) => s.name === p || s.name.startsWith(p)));
  const threw: string[] = [];
  for (const sc of pick) {
    const t0 = Date.now();
    let out: Awaited<ReturnType<typeof run>>;
    try {
      out = await run(sc);
    } catch (err) {
      // one engine exception must not end an `all` run (measured on 94040f7: the M-PD12 infant throws "rhythm sinus: next
      // event time is NaN" at 175 s — main at 240 s — once the R1 fit's 400 mL dead space drives PaCO2 to NaN)
      console.log(`\n=== ${sc.name} — ENGINE EXCEPTION after ${((Date.now() - t0) / 1000).toFixed(1)} s wall: ${String(err).slice(0, 200)}`);
      threw.push(sc.name);
      continue;
    }
    const { rows, log, alarms } = out;
    save(sc, rows, log, alarms);
    console.log(`\n=== ${sc.name} — ${sc.title} (${sc.mode ?? 'modeled'}) [${((Date.now() - t0) / 1000).toFixed(1)} s wall]`);
    console.log(log.filter((l) => !l.startsWith('1s')).join('\n'));
    console.log('alarms:', alarms.slice(0, 40).join(' '));
    console.log(table(sc, rows));
  }
  console.log(`\nENGINE EXCEPTIONS: ${threw.length ? threw.join(' ') : 'none'} (${pick.length} scenarios)`);
  if (threw.length) process.exitCode = 2;
}
```

#### Modify `package.json`

Edit 1 — find:

```json
    "test:e2e": "playwright test",
```

replace with:

```json
    "audit:respiratory": "node --experimental-strip-types --import ./scripts/audit-respiratory/hooks.mjs scripts/audit-respiratory/cli.ts",
    "test:e2e": "playwright test",
```

#### Modify `.gitignore`

Edit 1 — find:

```text
test-results/
```

replace with:

```text
test-results/
.audit-respiratory/
```

- [ ] **Step 3: Run** `npx -y pnpm@9.15.9 run audit:respiratory A1 E1 X-bs-salb` from the worktree root. Expected: three
  tables, `.audit-respiratory/results/{A1-spont-awake,A1-spont-awake-man,E1-bronchospasm-airway,E1b-bronchospasm-lung,
  X-bs-salb}.json` written (the prefix `A1` also matches `A1-spont-awake-man`), and on this pre-FU-6 tree `X-bs-salb`
  shows NO fall in `Ppk` after 900 s (the audit's R2). Then `npx -y pnpm@9.15.9 run audit:respiratory probe drive`
  prints the drive table. `npx -y pnpm@9.15.9 -r typecheck` is unaffected (the scripts are outside every tsconfig).
- [ ] **Step 4: Commit and push** — `chore(audit): the respiratory integration audit as pnpm run audit:respiratory (FU-6
  Task 1)`.

### Task 2: R2 — bronchospasm, asthma and COPD answer β2 agonists, adrenaline, volatiles, ketamine and magnesium through ONE airway-smooth-muscle state (lungs; 7g data E-FU6-1; engine E-FU6-6; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/lung/conditions.ts` (`SMOOTH_MUSCLE`, `REFRACT_*`, `reversibleShare`, `relaxed`,
  `resolveLung(… bronchoDil, bdExempt, smAgeMin)`)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (`RespCtx.bronchoDil/anaphEndo`, `RespState.bd/bdExempt/sm`, the
  10 Hz re-resolve, `applyLungSpecs`, `smAges`/`syncSmOnset`; the `lungCondition` event's `ageMin`)
- Modify (lungs' public types): `packages/engine-core/src/types-lung.ts` (`LungConditionSpec.ageMin` and the
  `lungCondition` event's `ageMin` — F6)
- Modify (engine, **E-FU6-6**): `packages/engine-core/src/engine.ts` (the `advanceResp(` context object)
- Modify (7g data, **E-FU6-1**): `packages/engine-core/src/l2/pk/data/rows-other.ts` (magnesium `bronchodilation`)
- Create: `packages/engine-core/test/helpers/fu6.ts`, `packages/engine-core/test/l2/lung/bronchodilation.test.ts`,
  `packages/engine-core/test/engine/resp-bronchodilation.test.ts` (8 runs of 30 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R2, E1/E1b; D1, D3):** salbutamol 250 µg, adrenaline 50 µg and sevoflurane left peak 31.8/44 and
auto-PEEP 5.5/11.9 cmH2O unchanged: 7g's `bus.airway.bronchodilation` reached only 7e's anaphylaxis write-back
(`endo/core.ts:140`). The lung conditions are static specs. Matrix cell closed: **DI-40** (salbutamol × lung
bronchospasm, `research/14-audit-drug-interactions.md`; `research/12-coverage-matrix.md` §4.4: WR, dPaCO2 0 against
[−20, −2]) with A09-E1t/E1b. **F6 (Orchestrator ruling (FU-6 review), 2026-09-28):** the reversible share falls with
severity (1.0 → 1.25) and with the attack's age (sim time + the spec's `ageMin`), so a status-asthmaticus NON-RESPONDER
is reachable (D1); FU-6 adds no dose-response (B is 7g's).

**Prototype (seed 7, GA rig, bronchospasm 1 at 600 s, drug at 900 s):** see "Prototype results" R2 — salbutamol peak
44.0 → 24.5 (2–3 min) → 23.3 (10 min), auto-PEEP 11.9 → 2.2; adrenaline 22.0 then back to 39.9 at 10 min; sevoflurane
35.8 → 23.9 as MAC rises 0.2 → 0.9; ketamine 31.4 → 41.3; magnesium 37.7 → 36.5; asthma 36.8 → 21.2; COPD 25.0 → 22.9;
untreated 44.0 at 20 min; 7e anaphylaxis identical.

- [ ] **Step 1: The test helper and the failing tests.**

#### Create `packages/engine-core/test/helpers/fu6.ts`

```ts
// FU-6 test helpers: a MODELED engine with the monitor sensors on, read-only internal-state access (the pattern of
// blood-stage3-recheck.test.ts), the ventilated GA rig, and a fine (0.1 s) sampler for peak airway and pleural
// pressure. Every loop yields once per sim-MINUTE (CI amendment 4).
import { createEngine } from '../../src/engine.ts';
import type { MonitorEngine, PatientProfile } from '../../src/types.ts';
import { respPleural } from '../../src/l2/resp/pipeline.ts';
import { ev3 } from './resp.ts';

export const ADULT6: PatientProfile = { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' };

/** `seed` 7 by default: its FU-6 F7 wake draw (u 0.737) is the label's MODAL induction patient (30–60 s). */
export function rig6(patient: PatientProfile = ADULT6, mode: 'modeled' | 'manual' = 'modeled', seed = 7): MonitorEngine {
  return createEngine({ seed, mode, patient: { ...patient, sensors: { spo2: 'on', co2: 'on', abp: 'connected', ...patient.sensors } } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- read-only test access to the committed pipeline state
export const st6 = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;

export function send(e: MonitorEngine, event: Record<string, unknown>): void {
  const r = e.dispatch(ev3(event)) as { accepted: boolean; reason?: string };
  if (!r.accepted) throw new Error(`rejected ${JSON.stringify(event)}: ${r.reason}`);
}

/** Advance to `t`, calling `each` every `dt` s; one yield per sim-minute. */
export async function runTo(e: MonitorEngine, t: number, each?: (tNow: number) => void, dt = 5): Promise<void> {
  let lastYield = e.now().simT;
  for (let u = Math.min(t, e.now().simT + dt); ; u = Math.min(t, u + dt)) {
    e.advanceTo(u);
    each?.(u);
    if (u - lastYield >= 60) { lastYield = u; await new Promise((r) => setImmediate(r)); }
    if (u >= t) return;
  }
}

/** Peak airway pressure (cmH2O) and the lowest pleural pressure (mmHg) over [now, t1], sampled every 0.1 s. */
export async function fineWindow(e: MonitorEngine, t1: number): Promise<{ peak: number; pplMin: number }> {
  let peak = -Infinity;
  let pplMin = Infinity;
  await runTo(e, t1, (u) => {
    const rs = st6(e).resp;
    peak = Math.max(peak, rs.lung.mech.paw as number);
    pplMin = Math.min(pplMin, respPleural(rs, u));
  }, 0.1);
  return { peak, pplMin };
}

/**
 * The audit's ventilated rig at t = 1 s: ETT, VCV 12 × 500, PEEP 5, FiO2 0.5, GA switch, propofol 100 µg/kg/min,
 * rocuronium 1.2 mg/kg and a rocuronium infusion of 0.6 mg/kg/h (the audit used a single 0.6 mg/kg: since FU-6 R9 a
 * patient whose diaphragm recovers above 5 % strength triggers the ventilator, and the 30-min rigs must stay
 * paralysed — measured: with 0.6 the untreated bronchospasm peak drifted 45 → 52 by 30 min; with 1.2 alone the
 * diaphragm reached 5 % at ≈ 24 min and the 25-min window read the triggered breaths).
 */
export async function ventRig(e: MonitorEngine, v: Record<string, number> = {}): Promise<void> {
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'ett' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...v });
  send(e, { kind: 'thermal', anaesthesia: 'general' });
  send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
  send(e, { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' });
  send(e, { kind: 'infusion', drugId: 'rocuronium', rate: 0.6, unit: 'mg/kg/h' });
}
```

#### Create `packages/engine-core/test/l2/lung/bronchodilation.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { resolveLung, reversibleShare, SMOOTH_MUSCLE } from '../../../src/l2/lung/conditions.ts';

const R = (id: string, s: number, bd = 0, exempt: string[] = []) => resolveLung([{ id: id as never, severity: s }], 70, 1, 0, bd, exempt).lp;
const rL = (lp: ReturnType<typeof R>) => lp.side.map((x) => x.rLung);
const near = (a: number[], b: number[]) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i] as number, 9));

describe('FU-6 R2: one airway-smooth-muscle state (D1)', () => {
  it('bronchospasm: B relaxes every effect to severity s·(1 − 0.85·B)', () => {
    expect(SMOOTH_MUSCLE.bronchospasm?.frac).toBe(0.85);
    near(rL(R('bronchospasm', 1, 1)), rL(R('bronchospasm', 0.15)));
    expect(R('bronchospasm', 1, 1).side[0]?.vdAlv).toBeCloseTo(R('bronchospasm', 0.15).side[0]?.vdAlv as number, 12);
    expect(rL(R('bronchospasm', 1, 0.5))[0]).toBeLessThan(rL(R('bronchospasm', 1))[0] as number);
  });
  it('asthma: only the reversible (airway) keys relax; COPD: only raw, by 20 %', () => {
    const a1 = R('asthma', 1, 1);
    const a3 = R('asthma', 0.3);
    near(rL(a1), rL(a3));
    expect(a1.ccw).toBe(R('asthma', 1).ccw); // chest wall / non-airway keys keep the full severity
    const c = R('copd', 1, 1);
    near(rL(c), rL(R('copd', 0.8))); // raw at 1 − 0.2·B
    expect(c.side[0]?.vdAlv).toBe(R('copd', 1).side[0]?.vdAlv); // emphysema's dead space does not reverse
    expect(rL(c)[0]).toBeLessThan(rL(R('copd', 1))[0] as number);
  });
  it('an exempt condition (7e owns its relief) and a non-smooth-muscle condition ignore B', () => {
    expect(rL(R('anaphylaxis', 1, 1, ['anaphylaxis']))).toEqual(rL(R('anaphylaxis', 1)));
    expect(R('ards', 0.67, 1)).toEqual(R('ards', 0.67));
  });
  it('F6: the reversible share falls with severity (near-fatal 1.25) and with the attack’s age (status asthmaticus)', () => {
    expect(reversibleShare(0.85, 1, 0)).toBe(0.85); // a fresh severe spasm: the full share
    expect(reversibleShare(0.85, 1, 15)).toBeGreaterThanOrEqual(0.95 * 0.85); // every fresh arm of this plan (0.963)
    expect(reversibleShare(0.85, 1.25, 0)).toBeCloseTo(0.85 * 0.4, 12); // near-fatal: oedema and plugging
    expect(reversibleShare(0.7, 1, 720)).toBeLessThanOrEqual(0.35 * 0.7); // a 12 h slow-onset attack
    const aged = resolveLung([{ id: 'asthma', severity: 1 }], 70, 1, 0, 1, [], { asthma: 720 }).lp;
    expect(rL(aged)[0]).toBeGreaterThan(rL(R('asthma', 1, 1))[0] as number); // less relaxed than a fresh attack
  });
});
```

#### Create `packages/engine-core/test/engine/resp-bronchodilation.test.ts`

```ts
// FU-6 R2 (audit E1/E1b, suite RS7 treatment half): severe bronchospasm on VCV answers the bronchodilators through 7g's
// bus. Bands: RS7 (peak ≥ 40, auto-PEEP ≥ 8 untreated; salbutamol within 10 min peak −30 %, auto-PEEP −50 %; untreated
// no improvement) and Miller 10e bronchospasm management (adrenaline acts in minutes; deepening a volatile bronchodilates).
import { describe, expect, it } from 'vitest';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

// FU-6 F2 (Orchestrator ruling (FU-6 review), 2026-09-28): `vent` carries the ventilator overrides of the arm. Until
// Task 9 there is no Pmax, so these arms are unlimited (Ppeak 44.0, PEEPi 11.9); Task 9 sets the default to
// `{ pmax: 80 }` so the SEVERITY stays measured on an unlimited arm and adds the default-Pmax LIMIT row of its own.
// FU-6 F6: `spec` carries extra lungCondition fields (the non-responder row's `ageMin`).
async function arm(drug: Record<string, unknown> | null, cond = 'bronchospasm', at = 900, vent: Record<string, number> = {}, spec: Record<string, unknown> = {}) {
  const e = rig6();
  await ventRig(e, vent);
  await runTo(e, 600);
  send(e, { kind: 'lungCondition', id: cond, severity: 1, ...spec });
  await runTo(e, 840);
  const before = { peak: (await fineWindow(e, 900)).peak, autoPeep: st6(e).resp.lung.peepTot - 5 };
  if (drug) send(e, drug);
  await runTo(e, at + 120);
  const early = { peak: (await fineWindow(e, at + 180)).peak, autoPeep: st6(e).resp.lung.peepTot - 5 };
  await runTo(e, at + 540);
  const late = { peak: (await fineWindow(e, at + 600)).peak, autoPeep: st6(e).resp.lung.peepTot - 5, mac: st6(e).pk.bus.cns?.macBrain ?? 0 };
  console.log(`FU-6 R2 ${cond} ${drug ? JSON.stringify(drug) : 'untreated'}: peak ${before.peak.toFixed(1)} → ${early.peak.toFixed(1)} → ${late.peak.toFixed(1)}; auto-PEEP ${before.autoPeep.toFixed(1)} → ${early.autoPeep.toFixed(1)} → ${late.autoPeep.toFixed(1)}; MAC ${late.mac.toFixed(2)}`);
  return { before, early, late };
}

describe('FU-6 R2: bronchospasm answers treatment (prototype 44.0 → 23.3 with salbutamol)', { timeout: 900_000 }, () => {
  it('untreated severe bronchospasm on an unlimited arm: Ppeak ≥ 40, PEEPi ≥ 8, no improvement over 10 min (44.0 / 11.9 unlimited; the Pmax-40 arm reads its limit — Task 9)', async () => {
    const r = await arm(null);
    expect(r.before.peak).toBeGreaterThanOrEqual(40);
    expect(r.before.autoPeep).toBeGreaterThanOrEqual(8);
    expect(r.late.peak).toBeGreaterThanOrEqual(0.95 * r.before.peak);
  });
  it('salbutamol 250 µg: Ppeak −30 % and PEEPi −50 % within 10 min, measured unlimited (44.0 → 23.3, −47 %; 11.9 → 2.2, −82 %)', async () => {
    const r = await arm({ kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' });
    expect(r.late.peak).toBeLessThanOrEqual(0.7 * r.before.peak);
    expect(r.late.autoPeep).toBeLessThanOrEqual(0.5 * r.before.autoPeep);
  });
  it('adrenaline 50 µg: Ppeak −30 % within 3 min (22.0), wearing off as the bolus clears', async () => {
    const r = await arm({ kind: 'drug', drugId: 'epinephrine', dose: 50, unit: 'mcg', route: 'iv' });
    expect(r.early.peak).toBeLessThanOrEqual(0.7 * r.before.peak);
    expect(r.late.peak).toBeGreaterThan(r.early.peak);
  });
  it('sevoflurane toward 1 MAC bronchodilates: Ppeak −30 % by 10 min (MAC 0.79, 40.0 → 25.0)', async () => {
    const r = await arm({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6, n2oFrac: 0 });
    expect(r.late.mac).toBeGreaterThanOrEqual(0.7); // the rig reached 0.79 MAC at 10 min (a rig check, not a band)
    expect(r.late.peak).toBeLessThanOrEqual(0.7 * r.before.peak);
  });
  it('ketamine 1 mg/kg and magnesium 2 g lower the Ppeak (31.6 at 3 min; 36.7 at 10 min)', async () => {
    const k = await arm({ kind: 'drug', drugId: 'ketamine', dose: 1, unit: 'mg/kg', route: 'iv' });
    expect(k.early.peak).toBeLessThan(0.85 * k.before.peak);
    const m = await arm({ kind: 'drug', drugId: 'magnesium', dose: 2000, unit: 'mg', route: 'iv' });
    expect(m.late.peak).toBeLessThan(0.95 * m.before.peak);
  });
  it('asthma reverses partly with salbutamol; COPD barely (37.0 → 21.3; 28.0 → 25.3)', async () => {
    const a = await arm({ kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' }, 'asthma');
    expect(a.late.peak).toBeLessThanOrEqual(0.7 * a.before.peak);
    const c = await arm({ kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' }, 'copd');
    expect(c.late.peak).toBeLessThan(c.before.peak);
    expect(c.late.peak).toBeGreaterThan(0.8 * c.before.peak);
  });
  it('F6 — status asthmaticus is reachable: a 12 h slow-onset severe asthma is a β2 NON-RESPONDER (Ppeak falls < 15 %; measured 37.0 → 31.9, −14 %)', async () => {
    const r = await arm({ kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' }, 'asthma', 900, {}, { ageMin: 720 });
    expect(r.late.peak).toBeGreaterThan(0.85 * r.before.peak); // fresh asthma, same dose: −30 % or more (row above)
  });
});
```

(The COPD arm uses RR 12 here, not the prototype's RR 10 — the executor records the numbers; the bands are relative.
The non-responder band "< 15 %" is the fit target of `REFRACT_DUR_MAX`/`REFRACT_TAU_MIN` [ENG] — a non-responder by
the usual clinical definition improves < 10–20 % after the first hour's β2 therapy; the fresh-asthma row above is its
control.)

- [ ] **Step 2: Run the two new files; they fail** (`SMOOTH_MUSCLE` missing; the engine arms do not move).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/lung/conditions.ts`

Edit 1 — find:

```ts
export function conditionData(id: string): LungConditionData | undefined {
```

replace with:

```ts
/**
 * FU-6 R2: airway smooth muscle. The reversible (bronchoconstrictor) part of a condition relaxes with the ONE
 * bronchodilation state B (0–1: 7g's `bus.airway.bronchodilation` — β2 agonists, epinephrine, volatile anaesthetics,
 * ketamine, magnesium, each with its own 7g time course). The condition's effective severity for the listed keys is
 * s·(1 − frac·B). frac = the largest reversible share of the condition's airway obstruction:
 *   bronchospasm 0.85, anaphylaxis 0.85: acute smooth-muscle spasm, near-complete reversal with β2 agonist/epinephrine
 *     and deepening with a volatile (Dewachter 2009 Anesthesiology 111:1141; Miller 10e bronchospasm management);
 *     the rest is mucosal oedema/secretions [ENG 0.85].
 *   asthma 0.7: acute severe asthma reverses partly within the hour (FEV1 +50–70 % of the deficit after β2 agonist;
 *     GINA 2023; Rodrigo 2002 Chest 122:160) [ENG 0.7].
 *   copd 0.2, raw only: bronchodilator response in ventilated COPD, inspiratory resistance −15–20 % (Dhand 1996 AJRCCM
 *     154:388) [ENG 0.2]; emphysema's compliance, dead space and diffusion do not reverse.
 * `shark`: the condition draws the Stage 3 shark-fin capnogram (R39-6 SHARK_TAU_II) at its equivalent bronchospasm
 * severity (FU-6 R6, Task 3: one capnogram whatever command started the spasm).
 */
export const SMOOTH_MUSCLE: Readonly<Record<string, { frac: number; keys: readonly EffectKey[] | 'all'; shark: boolean }>> = {
  bronchospasm: { frac: 0.85, keys: 'all', shark: true },
  anaphylaxis: { frac: 0.85, keys: 'all', shark: true },
  asthma: { frac: 0.7, keys: ['raw', 'rawExp', 'fSlow', 'tauSlowS', 'vqLow'], shark: true },
  copd: { frac: 0.2, keys: ['raw'], shark: false },
};

/**
 * FU-6 F6 (Orchestrator ruling (FU-6 review), 2026-09-28): the reversible share is not a constant — a REFRACTORY spasm
 * exists. `frac` above is the share a FRESH, severe-but-not-near-fatal spasm reverses; two things take it away, both
 * because the obstruction stops being smooth muscle:
 *   SEVERITY. In the R39-6 near-fatal range (severity 1.0 → 1.25, reached through the airway `bronchospasm` alias) the
 *     lumen fills with mucosal oedema and mucus plugs rather than tone (extensive luminal plugging in fatal asthma:
 *     Kuyper et al. 2003 Am J Med 115:6), so the reversible share falls to (1 − REFRACT_SEV) of itself at 1.25 [ENG 0.6].
 *   DURATION. A slow-onset attack — hours of inflammation, oedema and plugging — responds less and more slowly to a β2
 *     agonist than a sudden-onset, mostly bronchospastic one (McFadden 2003 AJRCCM 168:740; Rodrigo & Rodrigo 2000
 *     Chest 118:1547; Rodrigo, Rodrigo & Hall 2004 Chest 125:1081), so the share decays toward (1 − REFRACT_DUR_MAX) of
 *     itself with τ REFRACT_TAU_MIN [ENG 0.9 and 360 min (the 6 h slow-onset boundary); fit target: Task 2's
 *     non-responder row — a 12 h severe asthma improves < 15 % with a saturating β2 dose (measured −14 %) — and every
 *     fresh arm keeping ≥ 95 % of `frac` (0.963 at 15 min)].
 * The age is sim time since the condition appeared plus the spec's `ageMin` (the attack's age when it was sent), so
 * status asthmaticus is one command: `lungCondition asthma 1, ageMin 720` keeps ≈ 0.7 · 0.22 ≈ 0.16 of its airway
 * obstruction reversible. FU-6 adds NO dose-response of its own — B is 7g's; this function is the MAXIMUM reversal.
 */
export const REFRACT_SEV = 0.6;
export const REFRACT_DUR_MAX = 0.9;
export const REFRACT_TAU_MIN = 360;

/** FU-6 F6: the share of a smooth-muscle condition's severity that bronchodilation can reverse (0–`frac`). */
export function reversibleShare(frac: number, severity: number, ageMin = 0): number {
  const sev = 1 - REFRACT_SEV * Math.min(1, Math.max(0, (severity - 1) / 0.25)); // near-fatal: oedema and plugging
  const dur = 1 - REFRACT_DUR_MAX * (1 - Math.exp(-Math.max(0, ageMin) / REFRACT_TAU_MIN)); // slow-onset attack
  return frac * sev * dur;
}

/**
 * Effective severity of `spec` for effect `key` under bronchodilation B (FU-6 R2); `exempt` ids keep their own.
 * `ageMin` = the attack's age in minutes (FU-6 F6; 0 = fresh).
 */
export function relaxed(spec: LungConditionSpec, key: EffectKey, s: number, bd: number, exempt: readonly string[], ageMin = 0): number {
  const sm = SMOOTH_MUSCLE[spec.id];
  if (!sm || bd <= 0 || exempt.includes(spec.id)) return s;
  const frac = reversibleShare(sm.frac, spec.severity, ageMin); // FU-6 F6: the non-reversible share
  return sm.keys === 'all' || sm.keys.includes(key) ? s * (1 - frac * Math.min(1, bd)) : s;
}

export function conditionData(id: string): LungConditionData | undefined {
```

Edit 2 — find:

```ts
 * Resolve condition specs for a patient of `ibwKg`. `rawEvent` = Stage 3 bronchospasm airway multiplier (1 = none).
```

replace with:

```ts
 * Resolve condition specs for a patient of `ibwKg`. `rawEvent` = Stage 3 bronchospasm airway multiplier (1 = none).
 * `bronchoDil` = FU-6 R2's bronchodilation state B (0 = none); `bdExempt` = condition ids whose owner already applies
 * the relief (7e's anaphylaxis write-back); `smAgeMin` = each smooth-muscle condition's age in minutes (FU-6 F6).
```

Edit 3 — find:

```ts
export function resolveLung(specs: readonly LungConditionSpec[], ibwKg: number, rawEvent = 1, evlwiAdd = 0): Resolved {
```

replace with:

```ts
export function resolveLung(specs: readonly LungConditionSpec[], ibwKg: number, rawEvent = 1, evlwiAdd = 0, bronchoDil = 0, bdExempt: readonly string[] = [], smAgeMin: Readonly<Record<string, number>> = {}): Resolved {
```

Edit 4 — find:

```ts
    for (const e of d.effects) {
      const v = effectValue(e, s);
```

replace with:

```ts
    for (const e of d.effects) {
      const v = effectValue(e, relaxed(spec, e.key, s, bronchoDil, bdExempt, smAgeMin[spec.id] ?? 0)); // FU-6 R2: the reversible part relaxes (F6: by age)
```

#### Modify `packages/engine-core/src/types-lung.ts`

Edit 1 — find:

```ts
  /** Fraction of the condition's non-aerated lung that is recruitable (catalogue §6: high 0.5, low 0.15). */
  recruitFrac?: number;
}
```

replace with:

```ts
  /** Fraction of the condition's non-aerated lung that is recruitable (catalogue §6: high 0.5, low 0.15). */
  recruitFrac?: number;
  /** FU-6 F6: the attack's age when sent, min (0–1440): a slow-onset (hours-old) smooth-muscle attack reverses less. */
  ageMin?: number;
}
```

Edit 2 — find:

```ts
  | { kind: 'lungCondition'; id: LungConditionId; severity: number; side?: LungSide; recruitFrac?: number }
```

replace with:

```ts
  | { kind: 'lungCondition'; id: LungConditionId; severity: number; side?: LungSide; recruitFrac?: number; ageMin?: number }
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
  cbfRel?: number; // FU-3 item 16 (E-FU3-10): 7d's organs.brain.cbfRel — the brainstem-perfusion gate on the MODELED drive
}
```

replace with:

```ts
  cbfRel?: number; // FU-3 item 16 (E-FU3-10): 7d's organs.brain.cbfRel — the brainstem-perfusion gate on the MODELED drive
  /** FU-6: 7g's bus (R51: the lung reads PD outputs, never PK) — bronchodilation B (R2) and HPV inhibition (R13), 0–1. */
  bronchoDil?: number;
  hpvInhibit?: number;
  /** FU-6 R2: 7e is writing the anaphylaxis lung condition with its own β2 relief (endo.lungSev > 0). */
  anaphEndo?: boolean;
}
```

Edit 2 — find:

```ts
  rawEvent: number; // bronchospasm airway multiplier (Q20)
```

replace with:

```ts
  rawEvent: number; // bronchospasm airway multiplier (Q20)
  bd?: number; // FU-6 R2: the bronchodilation state B the lung was last resolved with (absent = 0; truth budget D16)
  bdExempt?: string[]; // FU-6 R2: condition ids whose relief their owner applies (7e's anaphylaxis); absent = none
  /** FU-6 F6: onset (sim s, earlier by the spec's `ageMin`) of each smooth-muscle condition and the sim time the lung
   * was last resolved at (ages are read there); absent while no smooth-muscle condition is present (truth budget D16). */
  sm?: { onsetS: Record<string, number>; atS: number };
```

Edit 3 — find:

```ts
export function applyLungSpecs(rs: RespState): void {
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.rawEvent, rs.evlwiExtra ?? 0); // Stage 7c: + lung water
```

replace with:

```ts
/** FU-6 F6: each smooth-muscle condition's age (min) at the last re-resolve — the non-reversible share grows with it. */
function smAges(rs: RespState): Record<string, number> {
  const out: Record<string, number> = {};
  const sm = rs.sm;
  if (sm) for (const [id, t0] of Object.entries(sm.onsetS)) out[id] = Math.max(0, (sm.atS - t0) / 60);
  return out;
}

/** FU-6 F6: stamp each new smooth-muscle condition's onset (now − its `ageMin`), forget ended ones. */
function syncSmOnset(rs: RespState, t: number): void {
  const specs = rs.lungSpecs.filter((s) => SMOOTH_MUSCLE[s.id] !== undefined);
  if (!specs.length) { delete rs.sm; return; }
  const sm = (rs.sm ??= { onsetS: {}, atS: t });
  for (const s of specs) sm.onsetS[s.id] ??= t - 60 * (s.ageMin ?? 0);
  for (const id of Object.keys(sm.onsetS)) if (!specs.some((s) => s.id === id)) delete sm.onsetS[id];
}

export function applyLungSpecs(rs: RespState): void {
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.rawEvent, rs.evlwiExtra ?? 0, rs.bd ?? 0, rs.bdExempt ?? [], smAges(rs)); // Stage 7c: + lung water; FU-6 R2: B (F6: ages)
```

Edit 4 — find:

```ts
import { resolveLung } from '../lung/conditions.ts'; // Stage 7b
```

replace with:

```ts
import { resolveLung, SMOOTH_MUSCLE } from '../lung/conditions.ts'; // Stage 7b; FU-6 F6: SMOOTH_MUSCLE
```

Edit 5 — find:

```ts
      return num('severity', c.severity, 0, 1) ?? num('recruitFrac', c.recruitFrac, 0, 1) ?? (c.severity === undefined ? 'severity is required' : undefined);
```

replace with:

```ts
      return num('severity', c.severity, 0, 1) ?? num('recruitFrac', c.recruitFrac, 0, 1) ?? num('ageMin', c.ageMin, 0, 1440) // FU-6 F6
        ?? (c.severity === undefined ? 'severity is required' : undefined);
```

Edit 6 — find:

```ts
      const next = { id: c.id, severity: c.severity, ...(c.side ? { side: c.side } : {}), ...(c.recruitFrac !== undefined ? { recruitFrac: c.recruitFrac } : {}) };
      const i = rs.lungSpecs.findIndex(same);
      if (c.severity <= 0) rs.lungSpecs = rs.lungSpecs.filter((s) => !same(s));
      else if (i >= 0) rs.lungSpecs[i] = next;
      else rs.lungSpecs.push(next);
      applyLungSpecs(rs);
```

replace with:

```ts
      const next = { id: c.id, severity: c.severity, ...(c.side ? { side: c.side } : {}), ...(c.recruitFrac !== undefined ? { recruitFrac: c.recruitFrac } : {}), ...(c.ageMin !== undefined ? { ageMin: c.ageMin } : {}) };
      const i = rs.lungSpecs.findIndex(same);
      if (c.severity <= 0) rs.lungSpecs = rs.lungSpecs.filter((s) => !same(s));
      else if (i >= 0) rs.lungSpecs[i] = next;
      else rs.lungSpecs.push(next);
      // FU-6 F6: a re-sent condition keeps its onset (the same attack) unless the event states its age
      if (c.ageMin !== undefined && rs.sm) delete rs.sm.onsetS[c.id];
      syncSmOnset(rs, t);
      if (rs.sm) rs.sm.atS = t;
      applyLungSpecs(rs);
```

Edit 7 — find:

```ts
  rs.coRatio = (cardiacOutput(h, t) / CO_REF_LPM) * (ctx.blood?.coFactor ?? 1); // Stage 7c: blood-volume fallback
```

replace with:

```ts
  rs.coRatio = (cardiacOutput(h, t) / CO_REF_LPM) * (ctx.blood?.coFactor ?? 1); // Stage 7c: blood-volume fallback
  // FU-6 R2: airway smooth muscle follows 7g's bronchodilation (re-resolved when B moves by ≥ 0.01, as 7e's writeLung does)
  const bd = Math.min(1, Math.max(0, ctx.bronchoDil ?? 0));
  const exempt = ctx.anaphEndo ? ['anaphylaxis'] : [];
  syncSmOnset(rs, t); // FU-6 F6: the attack ages; under a bronchodilator the lung is re-resolved once a sim-minute for it
  if (Math.abs(bd - (rs.bd ?? 0)) >= 0.01 || (bd === 0 && (rs.bd ?? 0) > 0) || exempt.length !== (rs.bdExempt ?? []).length
    || (bd > 0 && rs.sm !== undefined && t - rs.sm.atS >= 60)) {
    if (rs.sm) rs.sm.atS = t;
    if (bd > 0 || rs.bd !== undefined) rs.bd = bd; // absent until a bronchodilator acts (truth budget, D16)
    if (exempt.length) rs.bdExempt = exempt;
    else delete rs.bdExempt;
    applyLungSpecs(rs);
  }
```

(V.1 Task 1 rewrites the `rs.coRatio` line (E-V1-1, `coRefLpm`); the insert goes after whatever that line reads.
F6's age clock costs one `filter` over the lung specs per 10 Hz gas step and at most one `resolveLung` per sim-minute
while a bronchodilator acts on a smooth-muscle condition.)

#### Modify `packages/engine-core/src/engine.ts`

Edit 1 — find:

```ts
    advanceResp(ps.resp, { l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3, cbfRel: ps.organs.brain.cbfRel }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3 (7c: blood view; 7f: neuro, HCO3 for Winter's; FU-3 E-FU3-10: 7d's CBF, one step late — organs advance after resp)
```

replace with:

```ts
    advanceResp(ps.resp, {
      l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr, blood: ps.blood.view, neuro: ps.neuro.resp, hco3: ps.blood.core.ab.hco3, cbfRel: ps.organs.brain.cbfRel,
      bronchoDil: ps.pk.bus.airway.bronchodilation, hpvInhibit: ps.pk.bus.hpvInhibit, anaphEndo: ps.endo.lungSev > 0, // FU-6 R2/R13 (E-FU6-6): 7g's PD outputs; 7e's own anaphylaxis relief
    }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3 (7c: blood view; 7f: neuro, HCO3 for Winter's; FU-3 E-FU3-10: 7d's CBF, one step late — organs advance after resp)
```

#### Modify `packages/engine-core/src/l2/pk/data/rows-other.ts`

Edit 1 — find:

```ts
    pd: [{ target: 'svr', emax: -0.3, ec50: 60 }],
```

replace with:

```ts
    // FU-6 R2 (E-FU6-1): airway smooth-muscle relaxation (calcium antagonism) — an adjunct in severe bronchospasm/asthma;
    // modest (IV MgSO4 2 g: FEV1 and admission benefit in severe acute asthma, Kew 2014 Cochrane CD010909) [ENG: Emax
    // 0.35 at the SVR row's EC50 → B ≈ 0.2 after 2 g]
    pd: [{ target: 'svr', emax: -0.3, ec50: 60 }, { target: 'bronchodilation', emax: 0.35, ec50: 60 }],
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/circ-hypoxic-arrest.test.ts', // FU-3 item 16: four 15–20 sim-min asphyxia runs
```

replace with:

```ts
  'test/engine/circ-hypoxic-arrest.test.ts', // FU-3 item 16: four 15–20 sim-min asphyxia runs
  'test/engine/resp-bronchodilation.test.ts', // FU-6 R2: eight 30 sim-min bronchospasm arms
```

(After FU-4 Task 20 `SLOW_B` is derived — `SLOW.filter((p) => !SLOW_A.includes(p))` — so the entry goes in `SLOW`, as
here, and reaches the `slow-b` job automatically; never add it to `SLOW_A` (F10(4); Global Constraints → CI rules). The
same holds for every task's `vite.config.ts` edit below.)

- [ ] **Step 4: Run** the two new files, then `test/l2/lung`, `test/engine/lung-*.test.ts`, `test/engine/endo-*.test.ts`
  (7e's anaphylaxis numbers must not move: D3), `test/engine/resp-capnogram.test.ts`, `test/engine/resp-coupling.test.ts`
  (R27 lungState resistance ×4 on bronchospasm, measured without a drug: unchanged), `test/engine/pk-*.test.ts`
  (magnesium's PD row). Expected: all green; the engine arms print the numbers in the test titles ± 1 cmH2O. Before
  Task 9 lands there is no Pmax and the untreated Ppeak is 44.0 (the prototype); after it, 40.0 (D18) — both meet the
  bands.
- [ ] **Step 5: Commit and push** — `feat(lung): bronchospasm, asthma and COPD answer 7g's bronchodilation (FU-6 R2;
  E-FU6-1, E-FU6-6)`.

### Task 3: R6 — one bronchospasm: the airway event is an alias of the lung condition; the shark fin follows the lung (Stage 3 + lungs; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/lung/conditions.ts` (`spasmSeverity`; `resolveLung` loses `rawEvent`)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (import; `rawEvent` retired; `extraGradient`/`extraShunt`
  retired; `applyLungSpecs` sets `driver.spasm`; the `airway` command writes the lung spec)
- Modify: `packages/engine-core/src/l2/resp/driver.ts` (`DriverState.spasm`; shark shape and severity from it; the
  `bronchospasm` cycle rule removed; external frames)
- Modify: `packages/engine-core/test/l2/lung/bronchodilation.test.ts` (the helper's argument list, Task 2's file)
- Create: `packages/engine-core/test/engine/resp-bronchospasm-one.test.ts` (4 runs of ≤ 15 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R6, E1 vs E1b, I2d; D2):** airway `bronchospasm` 1 gave peak 31.8 / auto-PEEP 5.5, lung `bronchospasm` 1
gave 44 / 11.9, and both together multiplied to 66 / 21.7 (`rawEvent` × the condition's `raw`). One disease, one
command: the airway event writes the side-less lung spec; the Stage 3 gradient, shunt and VT terms are retired so the
lung row carries dead space, low-V/Q and resistance once.

**Prototype:** airway 1 = lung 1 = both = **44.0 / 26.9 / 11.9** (PaCO2 50.3, EtCO2 29.9 at 5 min); 7e anaphylaxis
unchanged; `resp-capnogram.test.ts` (α 105/125/135/145/157° bands by severity through the AIRWAY event) passes on the
lung-drawn fin; the fin shrinks as B rises (Task 2).

- [ ] **Step 1: The failing test.**

#### Create `packages/engine-core/test/engine/resp-bronchospasm-one.test.ts`

```ts
// FU-6 R6 (audit E1, E1b, I2d; D2): one bronchospasm whatever command starts it. The two entries agree, together they
// do not multiply, ending the airway event ends the spasm, and a bronchodilator shrinks the shark fin (R39-6 α bands
// stay in resp-capnogram.test.ts).
import { describe, expect, it } from 'vitest';
import { capnoAngles, mean, read62 } from '../helpers/resp.ts';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

async function spasm(cmds: Array<Record<string, unknown>>) {
  const e = rig6();
  await ventRig(e);
  await runTo(e, 300);
  for (const c of cmds) send(e, c);
  await runTo(e, 540);
  const w = await fineWindow(e, 600);
  return { e, peak: w.peak, autoPeep: st6(e).resp.lung.peepTot - 5 };
}
const AIR = { kind: 'airway', state: 'bronchospasm', severity: 1 };
const LUNG = { kind: 'lungCondition', id: 'bronchospasm', severity: 1 };

describe('FU-6 R6: one bronchospasm (was 31.8 airway vs 44.0 lung vs 66.1 both)', { timeout: 600_000 }, () => {
  it('the airway event and the lung condition give the same mechanics; both at once give one condition (unlimited arm: 44.0 / 11.9)', async () => {
    const a = await spasm([AIR]);
    const l = await spasm([LUNG]);
    const b = await spasm([AIR, LUNG]);
    console.log(`FU-6 R6 peak airway ${a.peak.toFixed(1)} lung ${l.peak.toFixed(1)} both ${b.peak.toFixed(1)}; auto-PEEP ${a.autoPeep.toFixed(1)} / ${l.autoPeep.toFixed(1)} / ${b.autoPeep.toFixed(1)}`);
    expect(Math.abs(a.peak - l.peak)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(b.peak - l.peak)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(b.autoPeep - l.autoPeep)).toBeLessThanOrEqual(0.5);
    expect(st6(b.e).resp.lungSpecs.filter((s: { id: string }) => s.id === 'bronchospasm')).toHaveLength(1);
  });
  it('ending the airway event ends the spasm (Ppeak within 2 cmH2O of baseline 2 min later); the fin shrinks with salbutamol', async () => {
    const r = await spasm([AIR]);
    const fin0 = mean(capnoAngles(read62(r.e, 'co2', 560, 600)).map((x) => x.alpha));
    send(r.e, { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' });
    await runTo(r.e, 1140);
    const fin1 = mean(capnoAngles(read62(r.e, 'co2', 1100, 1140)).map((x) => x.alpha));
    send(r.e, { kind: 'airway', state: 'patent' });
    await runTo(r.e, 1260);
    const after = await fineWindow(r.e, 1320);
    console.log(`FU-6 R6 α ${fin0.toFixed(0)} → ${fin1.toFixed(0)} after salbutamol; peak after release ${after.peak.toFixed(1)}`);
    expect(fin1).toBeLessThan(fin0 - 10);
    expect(after.peak).toBeLessThanOrEqual(16.7 + 2); // the rig's healthy peak (audit E1 baseline 16.7)
    expect(st6(r.e).resp.lungSpecs.some((s: { id: string }) => s.id === 'bronchospasm')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it; it fails** (peaks 31.8 / 44.0 / 66.1; the airway event leaves no lung spec).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/lung/conditions.ts`

Edit 1 — find:

```ts
/**
 * Effective severity of `spec` for effect `key` under bronchodilation B (FU-6 R2); `exempt` ids keep their own.
```

replace with:

```ts
/**
 * FU-6 R6: the shark-fin capnogram's severity (0 = none) from the smooth-muscle conditions after bronchodilation —
 * bronchospasm at its own (unclamped, 1.25 = the R39-6 near-fatal extreme) severity; the others at the bronchospasm
 * severity with the same airway resistance (Stage 3's raw = 1 + 5·s^1.5 inverted). `ageMin` as `resolveLung` (F6).
 */
export function spasmSeverity(specs: readonly LungConditionSpec[], bd = 0, exempt: readonly string[] = [], ageMin: Readonly<Record<string, number>> = {}): number {
  let out = 0;
  for (const spec of specs) {
    const sm = SMOOTH_MUSCLE[spec.id];
    const d = conditionData(spec.id);
    if (!sm?.shark || !d || !(spec.severity > 0)) continue;
    const s = relaxed(spec, 'raw', spec.severity, bd, exempt, ageMin[spec.id] ?? 0);
    if (spec.id === 'bronchospasm') { out = Math.max(out, s); continue; }
    const raw = d.effects.find((e) => e.key === 'raw');
    const m = raw ? effectValue(raw, Math.min(1, s)) : 1;
    out = Math.max(out, (Math.max(0, m - 1) / 5) ** (2 / 3));
  }
  return out;
}

/**
 * Effective severity of `spec` for effect `key` under bronchodilation B (FU-6 R2); `exempt` ids keep their own.
```

Edit 2 — find:

```ts
 * Resolve condition specs for a patient of `ibwKg`. `rawEvent` = Stage 3 bronchospasm airway multiplier (1 = none).
 * `bronchoDil` = FU-6 R2's bronchodilation state B (0 = none); `bdExempt` = condition ids whose owner already applies
 * the relief (7e's anaphylaxis write-back); `smAgeMin` = each smooth-muscle condition's age in minutes (FU-6 F6).
```

replace with:

```ts
 * Resolve condition specs for a patient of `ibwKg`. `bronchoDil` = FU-6 R2's bronchodilation state B (0 = none; the
 * Stage 3 airway multiplier `rawEvent` it replaced is retired: the airway `bronchospasm` event is an alias of the lung
 * condition, FU-6 R6); `bdExempt` = condition ids whose owner already applies the relief (7e's anaphylaxis);
 * `smAgeMin` = each smooth-muscle condition's age in minutes (FU-6 F6).
```

Edit 3 — find:

```ts
export function resolveLung(specs: readonly LungConditionSpec[], ibwKg: number, rawEvent = 1, evlwiAdd = 0, bronchoDil = 0, bdExempt: readonly string[] = [], smAgeMin: Readonly<Record<string, number>> = {}): Resolved {
```

replace with:

```ts
export function resolveLung(specs: readonly LungConditionSpec[], ibwKg: number, evlwiAdd = 0, bronchoDil = 0, bdExempt: readonly string[] = [], smAgeMin: Readonly<Record<string, number>> = {}): Resolved {
```

Edit 4 — find:

```ts
    sp.rLung = Math.max(0.5, (HEALTHY.raw * a.raw * rawEvent * water.r - R_TUBE)) / w / share;
```

replace with:

```ts
    sp.rLung = Math.max(0.5, (HEALTHY.raw * a.raw * water.r - R_TUBE)) / w / share; // FU-6 R6: no Stage 3 multiplier
```

#### Modify `packages/engine-core/test/l2/lung/bronchodilation.test.ts`

Edit 1 — find:

```ts
const R = (id: string, s: number, bd = 0, exempt: string[] = []) => resolveLung([{ id: id as never, severity: s }], 70, 1, 0, bd, exempt).lp;
```

replace with:

```ts
const R = (id: string, s: number, bd = 0, exempt: string[] = []) => resolveLung([{ id: id as never, severity: s }], 70, 0, bd, exempt).lp;
```

Edit 2 — find:

```ts
    const aged = resolveLung([{ id: 'asthma', severity: 1 }], 70, 1, 0, 1, [], { asthma: 720 }).lp;
```

replace with:

```ts
    const aged = resolveLung([{ id: 'asthma', severity: 1 }], 70, 0, 1, [], { asthma: 720 }).lp;
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
import { resolveLung, SMOOTH_MUSCLE } from '../lung/conditions.ts'; // Stage 7b; FU-6 F6: SMOOTH_MUSCLE
```

replace with:

```ts
import { resolveLung, SMOOTH_MUSCLE, spasmSeverity } from '../lung/conditions.ts'; // Stage 7b; FU-6 F6: SMOOTH_MUSCLE; R6: spasmSeverity
```

Edit 2 — find:

```ts
  rawEvent: number; // bronchospasm airway multiplier (Q20)
  bd?: number;
```

replace with:

```ts
  bd?: number;
```

Edit 3 — find:

```ts
    lungSpecs: [...(profile?.lungConditions ?? [])], rawEvent: 1, mainstemCmd: null, recruit: null, circPtx: 0,
```

replace with:

```ts
    lungSpecs: [...(profile?.lungConditions ?? [])], mainstemCmd: null, recruit: null, circPtx: 0,
```

Edit 4 — find:

```ts
function extraGradient(rs: RespState): number {
  return rs.driver.airway === 'bronchospasm' ? 8 * rs.driver.severity : 0; // Pa − Et widens with obstruction [ENG]
}
function extraShunt(rs: RespState): number {
  const a = rs.driver.airway;
  return a === 'bronchospasm' ? 0.05 * rs.driver.severity : 0; // research 03 §8.7 [ENG]; Stage 7b: endobronchial shunt emerges (mainstem block)
}
```

replace with:

```ts
// FU-6 R6: the Stage 3 bronchospasm gradient (+8·sev) and shunt (+0.05·sev) are retired — the airway event is an alias
// of the lung condition, whose dead space (vdAlv) and low-V/Q admixture carry the gap and the desaturation once.
function extraGradient(_rs: RespState): number {
  return 0;
}
function extraShunt(_rs: RespState): number {
  return 0; // Stage 7b: endobronchial shunt emerges (mainstem block)
}
```

Edit 5 — find:

```ts
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.rawEvent, rs.evlwiExtra ?? 0, rs.bd ?? 0, rs.bdExempt ?? [], smAges(rs)); // Stage 7c: + lung water; FU-6 R2: B (F6: ages)
```

replace with:

```ts
  const ages = smAges(rs); // FU-6 F6
  const r = resolveLung(rs.lungSpecs, rs.pat.ibwKg, rs.evlwiExtra ?? 0, rs.bd ?? 0, rs.bdExempt ?? [], ages); // Stage 7c: + lung water; FU-6 R2: B (F6: ages)
  const spasm = spasmSeverity(rs.lungSpecs, rs.bd ?? 0, rs.bdExempt ?? [], ages); // FU-6 R6: the shark fin follows the lung
  if (spasm > 0) rs.driver.spasm = spasm;
  else delete rs.driver.spasm;
```

Edit 6 — find:

```ts
      d.airway = a.state;
      d.severity = a.severity ?? 1;
      // Stage 7b: endobronchial is a mainstem block (its shunt/compliance emerge); bronchospasm raises airway R (Q20)
      rs.mainstemCmd = a.state === 'endobronchial' ? 'right' : rs.mainstemCmd === 'right' ? null : rs.mainstemCmd;
      rs.rawEvent = a.state === 'bronchospasm' ? 1 + 5 * Math.min(1, d.severity) ** 1.5 : 1;
```

replace with:

```ts
      const prevAirway = d.airway; // FU-6 R6
      d.airway = a.state;
      d.severity = a.severity ?? 1;
      // Stage 7b: endobronchial is a mainstem block (its shunt/compliance emerge)
      rs.mainstemCmd = a.state === 'endobronchial' ? 'right' : rs.mainstemCmd === 'right' ? null : rs.mainstemCmd;
      // FU-6 R6: ONE bronchospasm — the airway event is an alias of lungCondition bronchospasm (the same resistance, dead
      // space, V/Q and capnogram whichever command started it; 1–1.25 stays the R39-6 near-fatal capnogram extreme)
      const rest = rs.lungSpecs.filter((s) => !(s.id === 'bronchospasm' && s.side === undefined));
      if (a.state === 'bronchospasm') rs.lungSpecs = [...rest, { id: 'bronchospasm', severity: d.severity }];
      else if (prevAirway === 'bronchospasm') rs.lungSpecs = rest;
```

#### Modify `packages/engine-core/src/l2/resp/driver.ts`

Edit 1 — find:

```ts
  ataxia?: number; // Stage 7d: Cushing ataxic breathing 0–1 (organs/effects.ts)
}
```

replace with:

```ts
  ataxia?: number; // Stage 7d: Cushing ataxic breathing 0–1 (organs/effects.ts)
  spasm?: number; // FU-6 R6: shark-fin severity of the lung's smooth-muscle conditions after bronchodilation (resp pipeline)
}
```

Edit 2 — find:

```ts
  const sev = d.severity;
  const c: Cycle = {
    seq: d.seq, t0: t, ti, te: period - ti, vt, kind: src === 'bvm' ? 'bvm' : mech ? 'mech' : 'spont', mech,
    exch: true, sampled: 'alveolar', gastric: 0, effort: mech ? vt / 500 : vt / 500, shape: mech ? 'mech' : 'spont',
```

replace with:

```ts
  const spasm = d.spasm ?? 0; // FU-6 R6: ONE bronchospasm — the lung's smooth-muscle state draws the shark fin
  const sev = spasm > 0.02 ? spasm : d.severity;
  const c: Cycle = {
    seq: d.seq, t0: t, ti, te: period - ti, vt, kind: src === 'bvm' ? 'bvm' : mech ? 'mech' : 'spont', mech,
    exch: true, sampled: 'alveolar', gastric: 0, effort: mech ? vt / 500 : vt / 500, shape: spasm > 0.02 ? 'shark' : mech ? 'mech' : 'spont',
```

Edit 3 — find:

```ts
    case 'bronchospasm':
      c.shape = 'shark';
      c.vt = vt * (1 - 0.2 * sev); // [ENG] less volume behind the obstruction
      break;
```

replace with:

```ts
    // FU-6 R6: 'bronchospasm' has no cycle rule of its own any more — the lung condition it aliases carries the
    // resistance (the internal ventilator is a flow source; trapping emerges) and the shark fin (d.spasm above)
```

Edit 4 — find:

```ts
      sampled: exchange ? 'alveolar' : 'none', gastric: 0, effort: 0, shape: d.airway === 'bronchospasm' ? 'shark' : d.airway === 'endobronchial' ? 'bifid' : 'mech',
      severity: d.severity, cleft: d.cleft, fio2: preoxActive(d, t) ? (d.preox as { fio2: number }).fio2 : f.fio2,
```

replace with:

```ts
      sampled: exchange ? 'alveolar' : 'none', gastric: 0, effort: 0, shape: (d.spasm ?? 0) > 0.02 ? 'shark' : d.airway === 'endobronchial' ? 'bifid' : 'mech',
      severity: (d.spasm ?? 0) > 0.02 ? (d.spasm as number) : d.severity, cleft: d.cleft, fio2: preoxActive(d, t) ? (d.preox as { fio2: number }).fio2 : f.fio2,
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-bronchodilation.test.ts', // FU-6 R2: eight 30 sim-min bronchospasm arms
```

replace with:

```ts
  'test/engine/resp-bronchodilation.test.ts', // FU-6 R2: eight 30 sim-min bronchospasm arms
  'test/engine/resp-bronchospasm-one.test.ts', // FU-6 R6: four ≤ 22 sim-min bronchospasm runs
```

- [ ] **Step 4: Run** the new file, `test/l2/lung`, `test/engine/resp-capnogram.test.ts` (R39-6 α bands through the
  airway event: must stay green — prototype green), `test/engine/resp-coupling.test.ts` (R27 lungState resistance ×4 on
  bronchospasm: prototype green), `test/engine/resp-airway.test.ts`, `test/engine/lung-*.test.ts`, the Stage V
  ventilator tests (`npx -y pnpm@9.15.9 --filter @pme/ventilator test`: the link reads the same lungState), and
  `npx -y pnpm@9.15.9 -r typecheck` (every `rawEvent` reference is gone: `grep -rn rawEvent packages` → none).
- [ ] **Step 5: Commit and push** — `feat(resp): one bronchospasm — the airway event aliases the lung condition (FU-6 R6)`.

### Task 4: R3(a) — the wakefulness drive: loss of consciousness raises the apnoeic threshold; a central-chemoreceptor lag; a relative apnoea threshold — induction apnoea (lungs; 7f E-FU6-2; tests E-FU6-7; PROTOTYPED)

**Files:**
- Modify (7f, **E-FU6-2**): `packages/engine-core/src/l2/neuro/drive.ts` (`LOC_LO/HI`, `DriveInputs.hypnotic`,
  `NeuroResp.loc`), `packages/engine-core/src/l2/neuro/pipeline.ts` (`IDLE_RESP.loc`; passes `d.hypnotic`),
  `packages/engine-core/src/l2/neuro/spont.ts` (`CENTRAL_TAU_S`, `PERIPH_SHARE`, `SpontDrive.pc`; `wake`, `apnoeic`)
- Modify: `packages/engine-core/src/l2/lung/drive.ts` (`WAKE_MMHG`, `APNOEA_VE_IN/OUT`, F7's `WAKE_QUANTILES`/
  `wakeShiftMmHg`; `wake`, `wakeMmHg`, `apnoeic` inputs)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (F7: `RespState.wakeMmHg` drawn in `createRespState` from the
  new `'resp-wake'` stream; passed to the drive)
- Modify (tests, **E-FU6-7**): `packages/engine-core/test/l2/neuro/spont.test.ts` (the hypercapnia step is held to steady
  state — the band 6 + 1.5·4 is unchanged); `packages/engine-core/test/engine/circ-sanity-2.test.ts` (the R23 rig gets
  FiO2 0.5 through its SGA, as its own comment intends: "the hypoxic bradycardia would confound the ischaemia scenario"; H7 reads the
  time-averaged CVP and PAWP instead of 1 Hz samples that alias against the breathing phase — band unchanged)
- Create: `packages/engine-core/test/l2/lung/drive-fu6.test.ts`, `packages/engine-core/test/engine/resp-induction.test.ts`
  (6 runs of 15 sim-min + F7's 20-seed row = 26 runs, ≈ 62 s wall in the prototype → SLOW / `SLOW_B`; the vite comment
  "six 15 sim-min inductions" is kept as written because Task 5 anchors on it)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R3(a), C4, C4b; D4, D5):** propofol 2 mg/kg left breathing at RR 17–20 via an SGA (Ce 3 µg/mL): hypnotics
scaled the CO2 slope but never removed the wakefulness drive, the MODELED apnoea needed VE ≤ 0.2 L/min (unreachable
with the RR floor 4), and the drive answered arterial PaCO2 instantly.

**Prototype (R1-emulated, SGA unless stated; the clean `4f4ce06` tree + Tasks 1–6 in brackets):** propofol 2 mg/kg
apnoea **30 s** [0 s — the calibrated 15 × 500 resting pattern and 215 mL dead space keep the drive above threshold;
FU-4's R1 root removes that calibration, so the executor's numbers should approach the emulation]; 2.5 mg/kg **50 s** [22 s];
+ fentanyl 2 µg/kg **115 s**; + remifentanil 0.1 µg/kg/min **160 s**; A1 awake baseline unchanged (RR 12.7 × 494,
PaCO2 39.1). Tests: `spont.test.ts` "hypercapnia raises VE" failed on the instantaneous step (the lag) — fixed by the
rig change below; `circ-sanity-2` R23 ephedrine `it.fails` started "passing" only because the 75 y patient desaturated
to SaO2 21 % on room air after propofol (hypoventilation); with FiO2 0.5 both R23 `it.fails` fail as before (kIsch 1.00).

- [ ] **Step 1: The failing tests.**

#### Create `packages/engine-core/test/l2/lung/drive-fu6.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { APNOEA_VE_IN, APNOEA_VE_OUT, drive, WAKE_MMHG, WAKE_QUANTILES, wakeShiftMmHg, type DriveInputs } from '../../../src/l2/lung/drive.ts';
import { seedStream, uniform } from '../../../src/rng/sfc32.ts';

const X: DriveInputs = { paco2: 40, pao2: 100, paco2Set: 40, ve0: 6, co2SlopeMult: 1, opioidDep: 0, hypnoticDep: 0, pain: 0, evlwi: 7, vt0: 500, rr0: 12 };

describe('FU-6 R3(a): the wakefulness drive (D4)', () => {
  it('awake: unchanged resting pattern; unconscious: the threshold rises by WAKE_MMHG', () => {
    expect(drive(X).ve).toBeCloseTo(6, 9);
    expect(WAKE_MMHG).toBe(8);
    expect(drive({ ...X, wake: 1 }).ve).toBe(0); // at the awake resting PaCO2 the unconscious drive is below threshold
    const b = 40 - 6 / 1.5 + WAKE_MMHG; // 44
    expect(drive({ ...X, wake: 1, paco2: b + 2 }).ve).toBeCloseTo(1.5 * 2, 9);
  });
  it('apnoea below 10 % of resting VE, resuming above 15 % (hysteresis)', () => {
    const at = (ve: number) => 40 - 6 / 1.5 + ve / 1.5; // PaCO2 giving this chemo VE
    expect([APNOEA_VE_IN, APNOEA_VE_OUT]).toEqual([0.1, 0.15]);
    expect(drive({ ...X, paco2: at(0.5) }).ve).toBe(0); // 0.5 < 0.6
    expect(drive({ ...X, paco2: at(0.7) }).ve).toBeGreaterThan(0);
    expect(drive({ ...X, paco2: at(0.7), apnoeic: true }).ve).toBe(0); // 0.7 < 0.9 to resume
    expect(drive({ ...X, paco2: at(1.0), apnoeic: true }).ve).toBeGreaterThan(0);
  });
  it('F7: the wake shift is ONE seeded draw through the label-fitted quantile table; seed 7 is the modal patient', () => {
    expect(WAKE_QUANTILES.map((q) => q[0])).toEqual([0, 0.57, 0.64, 0.88, 1]); // no apnoea / < 30 s / 30–60 s / > 60 s
    for (let u = 0.01; u < 1; u += 0.01) expect(wakeShiftMmHg(u)).toBeGreaterThanOrEqual(wakeShiftMmHg(u - 0.01));
    expect(wakeShiftMmHg(0.57)).toBeCloseTo(6.6, 9);
    const u7 = uniform(seedStream(7, 'resp-wake'));
    expect(u7).toBeGreaterThan(0.64); // seed 7 (rig6) draws inside the 30–60 s band …
    expect(u7).toBeLessThan(0.88);
    expect(drive({ ...X, wake: 1, wakeMmHg: 2, paco2: 40 }).ve).toBeGreaterThan(0); // … a low draw keeps breathing
  });
});
```

#### Create `packages/engine-core/test/engine/resp-induction.test.ts`

```ts
// FU-6 R3(a) (audit C4/C4b; suite RS3; D5) and F7 (Orchestrator ruling (FU-6 review), 2026-09-28): propofol induction
// apnoea is PROBABILISTIC — one seeded draw per patient (lung/drive.ts `wakeShiftMmHg`) — and follows the Diprivan
// label (2–2.5 mg/kg: apnoea < 30 s 7 %, 30–60 s 24 %, > 60 s 12 %; 43 % overall), more often and longer after an
// opioid (Miller 10e, intravenous anaesthetics). Seed 7 (every other row) is the label's MODAL patient (u 0.737 →
// 30–60 s). Bands [ENG, D5; Q-FU6-1]: seed 7 alone 10–90 s; + fentanyl 2 µg/kg 60–240 s; + remifentanil 0.1 ≥ 90 s;
// 2.5 mg/kg longer than 2 mg/kg; seeds 1–20: the label's shape. SGA (no obstruction), room air.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

async function induce(propMgKg: number, pre?: Record<string, unknown>, seed = 7) {
  const e = rig6(undefined, 'modeled', seed);
  await runTo(e, 1);
  send(e, { kind: 'airwayDevice', device: 'sga' });
  const pa60 = await runTo(e, 60).then(() => st6(e).resp.co2.pf as number);
  if (pre) { await runTo(e, 120); send(e, pre); }
  await runTo(e, 299);
  const pa299 = st6(e).resp.co2.pf as number;
  send(e, { kind: 'drug', drugId: 'propofol', dose: propMgKg, unit: 'mg/kg', route: 'iv' });
  let apnoeaS = 0;
  await runTo(e, 900, () => { if ((st6(e).resp.spont?.rr ?? -1) === 0) apnoeaS += 1; }, 1);
  console.log(`FU-6 R3(a) propofol ${propMgKg} mg/kg ${pre ? JSON.stringify(pre) : 'alone'}: apnoea ${apnoeaS} s; PaCO2 at 60/299 s ${pa60.toFixed(1)}/${pa299.toFixed(1)}`);
  return { apnoeaS, pa60, pa299 };
}

describe('FU-6 R3(a): induction apnoea (was none: RR 17–20 via SGA)', { timeout: 600_000 }, () => {
  it('awake baseline unchanged; propofol 2 mg/kg alone, seed 7 (the modal draw): a short apnoea, 10–90 s (28 s; 42 s R1-emulated)', async () => {
    const r = await induce(2);
    expect(Math.abs(r.pa299 - r.pa60)).toBeLessThan(1); // the central lag moves no resting value
    expect(r.apnoeaS).toBeGreaterThanOrEqual(10);
    expect(r.apnoeaS).toBeLessThanOrEqual(90);
  });
  it('2.5 mg/kg is longer than 2 mg/kg (44 vs 28 s)', async () => {
    expect((await induce(2.5)).apnoeaS).toBeGreaterThan((await induce(2)).apnoeaS);
  });
  it('an opioid prolongs it: fentanyl 2 µg/kg 60–240 s (62 s); remifentanil 0.1 µg/kg/min ≥ 90 s (124 s)', async () => {
    const f = await induce(2, { kind: 'drug', drugId: 'fentanyl', dose: 2, unit: 'mcg/kg', route: 'iv' });
    expect(f.apnoeaS).toBeGreaterThanOrEqual(60);
    expect(f.apnoeaS).toBeLessThanOrEqual(240);
    const r = await induce(2, { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
    expect(r.apnoeaS).toBeGreaterThanOrEqual(90);
  });
  // The label's inductions are given with supplemental oxygen: this row breathes FiO2 0.5 through the SGA, so the
  // apnoea ends on CO2 (on room air F9's hypoxic plateau ends a long apnoea at PaO2 ≈ 40–45 — seeds 6/12: 48 s, not 92 s)
  it('F7 — probabilistic per the Diprivan label: seeds 1–20 on FiO2 0.5 give apnoea in 25–65 % (label 43 %), the mode 30–60 s, none > 180 s (measured 8/20, < 30 / 30–60 / > 60 s = 1 / 4 / 3, max 110 s)', async () => {
    const d: number[] = [];
    for (let seed = 1; seed <= 20; seed++) d.push((await induce(2, { kind: 'ventilation', source: 'spontaneous', fio2: 0.5 }, seed)).apnoeaS);
    const ap = d.filter((x) => x > 0);
    const bins = [ap.filter((x) => x < 30).length, ap.filter((x) => x >= 30 && x <= 60).length, ap.filter((x) => x > 60).length];
    console.log(`FU-6 F7 seeds 1–20: ${d.join(' ')} s; apnoea ${ap.length}/20; < 30 / 30–60 / > 60 s: ${bins.join(' / ')}`);
    expect(ap.length / 20).toBeGreaterThanOrEqual(0.25); // binomial 95 % range of 43 % in 20 patients ≈ 22–64 %
    expect(ap.length / 20).toBeLessThanOrEqual(0.65);
    expect(bins[1]).toBe(Math.max(...bins)); // the label's mode: 30–60 s
    expect(Math.max(...d)).toBeLessThanOrEqual(180);
  });
});
```

- [ ] **Step 2: Run them; they fail** (no `WAKE_MMHG`; no apnoea).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/lung/drive.ts`

Edit 1 — find:

```ts
export const J_RR_PER_EVLWI = 1.5; // RR +4–10 at EVLWI > 10 → +1.5/min per mL/kg above 10 [ENG]
```

replace with:

```ts
export const J_RR_PER_EVLWI = 1.5; // RR +4–10 at EVLWI > 10 → +1.5/min per mL/kg above 10 [ENG]
/**
 * FU-6 R3(a): the wakefulness drive. Awake, breathing continues below the resting PaCO2 (Fink 1961 J Appl Physiol
 * 16:15); unconscious it stops a few mmHg below the ANAESTHETISED resting PaCO2 (Nunn 9e ch. 5: apnoeic threshold
 * 0.3–0.5 kPa below it; anaesthetised resting PaCO2 45–50). Loss of consciousness therefore raises the threshold B by
 * WAKE_MMHG (B = set − VE0/S = set − 5 awake → set + 3 unconscious) [ENG size, directions sourced; sourced range
 * 7–10 (threshold 2–5 mmHg above the awake resting PaCO2); fit target: test/engine/resp-induction.test.ts bands].
 */
export const WAKE_MMHG = 8;
/**
 * FU-6 R3(a): a neural drive below 10 % of the resting VE produces no breath (apnoea); breathing resumes above 15 %
 * (hysteresis, as 7f's MANUAL APNOEA_IN/OUT 0.42/0.5 of resting VE) [ENG]. Was an absolute 0.2 L/min, which a
 * depressed drive never reached: the RR floor of 4/min kept VE at 0.4–0.9 L/min after propofol + opioid.
 */
export const APNOEA_VE_IN = 0.1;
export const APNOEA_VE_OUT = 0.15;
/**
 * FU-6 F7 (Orchestrator ruling (FU-6 review), 2026-09-28): induction apnoea is PROBABILISTIC, as in patients. The
 * Diprivan label (propofol 2–2.5 mg/kg, unpremedicated adults): apnoea < 30 s in 7 %, 30–60 s in 24 %, > 60 s in 12 % —
 * 43 % overall, the modal apnoea 30–60 s. The patient-to-patient spread of the wakefulness shift (and of the CO2
 * sensitivity and hypnotic sensitivity it stands in for) is ONE seeded draw per patient: u ~ U(0, 1) from the engine's
 * own 'resp-wake' stream (resp pipeline, `createRespState`) → this quantile table → the patient's shift in mmHg
 * [ENG knots; fit target: the label's bands, measured on the 20-seed row of test/engine/resp-induction.test.ts].
 * u < 0.57 → no apnoea (the drive stays above its raised threshold); 0.57–0.64 → < 30 s; 0.64–0.88 → 30–60 s (the
 * mode, ≈ 45 s at its middle); 0.88–1 → > 60 s. Without a draw (unit tests, pre-FU-6 snapshots) WAKE_MMHG applies.
 */
export const WAKE_QUANTILES: ReadonlyArray<readonly [number, number]> = [[0, 2], [0.57, 6.6], [0.64, 8.4], [0.88, 11], [1, 14.5]];
export function wakeShiftMmHg(u: number): number {
  let [u0, w0] = WAKE_QUANTILES[0] as readonly [number, number];
  for (const [u1, w1] of WAKE_QUANTILES.slice(1)) {
    if (u <= u1) return w0 + ((w1 - w0) * (Math.max(u0, u) - u0)) / (u1 - u0);
    [u0, w0] = [u1, w1];
  }
  return w0;
}
```

Edit 2 — find:

```ts
  vt0: number; rr0: number; // resting pattern
}
```

replace with:

```ts
  vt0: number; rr0: number; // resting pattern
  wake?: number; // FU-6 R3(a): 0 awake … 1 unconscious (the wakefulness drive lost); absent = awake
  wakeMmHg?: number; // FU-6 F7: this patient's drawn wakefulness shift (wakeShiftMmHg); absent = WAKE_MMHG
  apnoeic?: boolean; // FU-6 R3(a): the last evaluation was apnoeic (hysteresis)
}
```

Edit 3 — find:

```ts
  const b = x.paco2Set - x.ve0 / s;
```

replace with:

```ts
  const b = x.paco2Set - x.ve0 / s + (x.wakeMmHg ?? WAKE_MMHG) * (x.wake ?? 0); // FU-6 R3(a); F7: the patient's draw
```

Edit 4 — find:

```ts
  if (ve <= 0.2) return { ve: 0, rr: 0, vt: 0 };
```

replace with:

```ts
  if (ve <= Math.max(0.2, (x.apnoeic ? APNOEA_VE_OUT : APNOEA_VE_IN) * x.ve0)) return { ve: 0, rr: 0, vt: 0 }; // FU-6 R3(a)
```

#### Modify `packages/engine-core/src/l2/neuro/drive.ts`

Edit 1 — find:

```ts
export const DIAPH_APNOEA = 0.05; // no effective breath below 5 % strength [ENG]
```

replace with:

```ts
export const DIAPH_APNOEA = 0.05; // no effective breath below 5 % strength [ENG]
/**
 * FU-6 R3/R4 (E-FU6-2): loss of consciousness (depth.ts `hypnotic` level, ≥ 1 unconscious) as a 0–1 ramp over 0.6–1.0
 * (fully 'unconscious' from the LOC C50 up) — what removes the wakefulness drive (R3) and makes the lungs
 * "anaesthetised" (R4). [ENG ramp around depth.ts's LOC = 1]
 */
export const LOC_LO = 0.6;
export const LOC_HI = 1.0;
```

Edit 2 — find:

```ts
  naturalAirway: boolean; // no tube / supraglottic device
  wasApnoeic: boolean;
}
```

replace with:

```ts
  naturalAirway: boolean; // no tube / supraglottic device
  wasApnoeic: boolean;
  hypnotic?: number; // FU-6: depth.ts consciousness level (≥ 1 unconscious); absent = awake
}
```

Edit 3 — find:

```ts
  cleft: number; // 0–1 own diaphragmatic effort visible during mechanical breaths while a block wears off
}
```

replace with:

```ts
  cleft: number; // 0–1 own diaphragmatic effort visible during mechanical breaths while a block wears off
  loc: number; // FU-6 R3/R4: 0 awake … 1 unconscious (LOC_LO–LOC_HI ramp of the hypnotic level)
}
```

Edit 4 — find:

```ts
  const nmbVt = Math.max(0, Math.min(1, strength / DIAPH_WEAK));
```

replace with:

```ts
  const nmbVt = Math.max(0, Math.min(1, strength / DIAPH_WEAK));
  const loc = Math.max(0, Math.min(1, ((x.hypnotic ?? 0) - LOC_LO) / (LOC_HI - LOC_LO)));
```

Edit 5 — find:

```ts
    apnoea, pMaxMult: strength, obstruction, nmbVtMult: nmbVt,
```

replace with:

```ts
    apnoea, pMaxMult: strength, obstruction, nmbVtMult: nmbVt, loc,
```

#### Modify `packages/engine-core/src/l2/neuro/pipeline.ts`

Edit 1 — find:

```ts
  opioidDep: 0, hypnoticDep: 0, totalDep: 0, veRest: 1, rrMult: 1, vtMult: 1, apnoea: false, pMaxMult: 1, obstruction: 0, nmbVtMult: 1, cleft: 0,
};
```

replace with:

```ts
  opioidDep: 0, hypnoticDep: 0, totalDep: 0, veRest: 1, rrMult: 1, vtMult: 1, apnoea: false, pMaxMult: 1, obstruction: 0, nmbVtMult: 1, cleft: 0,
  loc: 0, // FU-6
};
```

Edit 2 — find:

```ts
  ns.resp = neuroResp({ vent: x.vent, macVolatile: x.macPotent, diaBlock: di.b, tofr: tof.count === 4 ? tof.ratio : 0, di: d.diRaw, naturalAirway: natural, wasApnoeic });
```

replace with:

```ts
  ns.resp = neuroResp({ vent: x.vent, macVolatile: x.macPotent, diaBlock: di.b, tofr: tof.count === 4 ? tof.ratio : 0, di: d.diRaw, naturalAirway: natural, wasApnoeic, hypnotic: d.hypnotic }); // FU-6: consciousness reaches the drive
```

#### Modify `packages/engine-core/src/l2/neuro/spont.ts`

Edit 1 — find:

```ts
export const GATE_REOPEN_S = 120; // the drive reopens linearly over 2 min once perfused [ENG, ruling "1–3 min"]
```

replace with:

```ts
export const GATE_REOPEN_S = 120; // the drive reopens linearly over 2 min once perfused [ENG, ruling "1–3 min"]
/**
 * FU-6 R3(a): the CO2 stimulus is partly CENTRAL (brain ECF PCO2, τ ≈ 60–150 s) and partly peripheral (carotid, fast):
 * Dahan et al. 1990 J Physiol 423:615 (dynamic end-tidal forcing: central τ ≈ 100 s, peripheral share ≈ 0.3) [TXT;
 * τ 90 s ENG]. The drive reads 0.3·PaCO2 + 0.7·Pc. At steady state Pc = PaCO2 (no change to any resting value).
 */
export const CENTRAL_TAU_S = 90;
export const PERIPH_SHARE = 0.3;
```

Edit 2 — find:

```ts
  gate?: number; // FU-3 item 16 (E-FU3-10): 0 → 1 while the drive reopens after an anoxic spell (absent = open)
}
```

replace with:

```ts
  gate?: number; // FU-3 item 16 (E-FU3-10): 0 → 1 while the drive reopens after an anoxic spell (absent = open)
  pc?: number; // FU-6 R3(a): central (brain) PCO2 the drive reads, mmHg (absent = PaCO2)
}
```

Edit 3 — find:

```ts
  const n = x.neuro;
  const out = drive({
    paco2: x.paco2, pao2: x.pao2, paco2Set: s.paco2Set, ve0: (x.rr0 * x.vt0) / 1000, co2SlopeMult: x.co2SlopeMult,
    opioidDep: n?.opioidDep ?? 0, hypnoticDep: n?.hypnoticDep ?? 0, pain: 0, evlwi: x.evlwi, vt0: x.vt0, rr0: x.rr0,
  }, s.fatigue);
```

replace with:

```ts
  const n = x.neuro;
  s.pc = (s.pc ?? x.paco2) + (x.paco2 - (s.pc ?? x.paco2)) * (1 - Math.exp(-SPONT_DT_S / CENTRAL_TAU_S)); // FU-6 R3(a)
  const out = drive({
    paco2: PERIPH_SHARE * x.paco2 + (1 - PERIPH_SHARE) * s.pc, pao2: x.pao2, paco2Set: s.paco2Set, ve0: (x.rr0 * x.vt0) / 1000, co2SlopeMult: x.co2SlopeMult,
    opioidDep: n?.opioidDep ?? 0, hypnoticDep: n?.hypnoticDep ?? 0, pain: 0, evlwi: x.evlwi, vt0: x.vt0, rr0: x.rr0,
    wakeMmHg: x.wakeMmHg, // FU-6 F7: this patient's drawn wakefulness shift
    wake: n?.loc ?? 0, apnoeic: s.rr === 0, // FU-6 R3(a)
  }, s.fatigue);
```

Edit 4 — find:

```ts
  noFlow?: boolean; // FU-3 item 16 (E-FU3-10): no circulation (pulseless rhythm or cardiac output 0)
```

replace with:

```ts
  noFlow?: boolean; // FU-3 item 16 (E-FU3-10): no circulation (pulseless rhythm or cardiac output 0)
  wakeMmHg?: number; // FU-6 F7: the patient's drawn wakefulness shift (resp pipeline; absent = WAKE_MMHG)
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
import { createSpontDrive, stepSpontDrive, type SpontDrive } from '../neuro/spont.ts'; // Stage 7f: MODELED spontaneous drive
```

replace with:

```ts
import { wakeShiftMmHg } from '../lung/drive.ts'; // FU-6 F7
import { createSpontDrive, stepSpontDrive, type SpontDrive } from '../neuro/spont.ts'; // Stage 7f: MODELED spontaneous drive
```

Edit 2 — find:

```ts
import { normal, seedStream } from '../../rng/sfc32.ts';
```

replace with:

```ts
import { normal, seedStream, uniform } from '../../rng/sfc32.ts'; // FU-6 F7: uniform (the wake draw)
```

Edit 3 — find:

```ts
  sm?: { onsetS: Record<string, number>; atS: number };
```

replace with:

```ts
  sm?: { onsetS: Record<string, number>; atS: number };
  /** FU-6 F7: this patient's wakefulness shift (mmHg), drawn once from the 'resp-wake' stream (lung/drive.ts
   * `wakeShiftMmHg`); absent in pre-FU-6 snapshots (= WAKE_MMHG). Out of truth (E-FU6-8): a patient constant. */
  wakeMmHg?: number;
```

Edit 4 — find:

```ts
  applyLungSpecs(rs); // Stage 7b: mainstem from the profile's conditions
  return rs;
```

replace with:

```ts
  applyLungSpecs(rs); // Stage 7b: mainstem from the profile's conditions
  // FU-6 F7: ONE seeded draw per patient on its own stream (drawing it never shifts the 'resp' stream's SpO2 bias and
  // breath jitter): whether and how long this patient is apnoeic after an induction dose (the Diprivan label's spread)
  rs.wakeMmHg = wakeShiftMmHg(uniform(seedStream(seed, 'resp-wake')));
  return rs;
```

Edit 5 — find:

```ts
      t, paco2: rs.co2.pf, pao2: rs.o2.pao2, hco3: ctx.hco3 ?? 24, rr0: l1Target(l1, 'rr', t), vt0: l1Target(l1, 'vt', t),
```

replace with:

```ts
      t, paco2: rs.co2.pf, pao2: rs.o2.pao2, hco3: ctx.hco3 ?? 24, rr0: l1Target(l1, 'rr', t), vt0: l1Target(l1, 'vt', t),
      wakeMmHg: rs.wakeMmHg, // FU-6 F7
```

#### Modify `packages/engine-core/test/l2/neuro/spont.test.ts`

Edit 1 — find:

```ts
    stepSpontDrive(s, { ...X, t: 1, paco2: 44 });
    expect(s.ve).toBeCloseTo(6 + 1.5 * 4, 6);
```

replace with:

```ts
    // FU-6 R3(a) (E-FU6-7): the drive reads 0.3·PaCO2 + 0.7·central PCO2 (τ 90 s) — the step answers 30 % at once and
    // the full CO2 slope at steady state (the band 6 + 1.5·4 is unchanged)
    stepSpontDrive(s, { ...X, t: 1, paco2: 44 });
    expect(s.ve).toBeCloseTo(6 + 1.5 * 4 * (0.3 + 0.7 * (1 - Math.exp(-1 / 90))), 6);
    for (let t = 2; t <= 1800; t++) stepSpontDrive(s, { ...X, t, paco2: 44 });
    expect(s.ve).toBeCloseTo(6 + 1.5 * 4, 6);
```

#### Modify `packages/engine-core/test/engine/circ-sanity-2.test.ts`

Edit 1 — find:

```ts
const SGA: [number, Record<string, unknown>] = [0, { kind: 'airwayDevice', device: 'sga' }];
```

replace with:

```ts
const SGA: [number, Record<string, unknown>] = [0, { kind: 'airwayDevice', device: 'sga' }];
// FU-6 (E-FU6-7): oxygen through the SGA — since FU-6 R3 propofol produces induction apnoea and hypoventilation, and on
// room air this 75 y patient reached SaO2 21 % (the confound this rig's comment excludes); FiO2 0.5 keeps SaO2 ≥ 97 %
const O2: [number, Record<string, unknown>] = [0, { kind: 'ventilation', source: 'spontaneous', fio2: 0.5 }];
```

Edit 2 — find:

```ts
    const r = await run(AS_CAD, [SGA, [60, propofol], [210, { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }]], 420);
```

replace with:

```ts
    const r = await run(AS_CAD, [SGA, O2, [60, propofol], [210, { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' }]], 420);
```

Edit 3 — find:

```ts
    const r = await run(AS_CAD, [SGA, [60, propofol], [210, { kind: 'drug', drugId: 'ephedrine', dose: 10, unit: 'mg', route: 'iv' }]], 420);
```

replace with:

```ts
    const r = await run(AS_CAD, [SGA, O2, [60, propofol], [210, { kind: 'drug', drugId: 'ephedrine', dose: 10, unit: 'mg', route: 'iv' }]], 420);
```

(FU-4 Task 2 also re-measures this pair; if FU-4 changed the rig, add `O2` to FU-4's version the same way.)

Edit 4 — find:

```ts
    const r = await run({}, [[60, { kind: 'condition', id: 'tamponade', severity: 0.8 }]], 180);
    r.trace('tamp', [55, 170]);
    expect(Math.abs(r.st(150, 180, 'cvp') - r.st(150, 180, 'pawp'))).toBeLessThanOrEqual(5);
```

replace with:

```ts
    const r = await run({}, [[60, { kind: 'condition', id: 'tamponade', severity: 0.8 }]], 150);
    // FU-6 (E-FU6-7): the band on the TIME-AVERAGED pressures (50 Hz) — the 1 Hz `state` samples alias against the
    // breathing cycle (RA swings 4–27 mmHg in this rig): FU-6's central CO2 lag shifts the breathing phase (RR 15.5 →
    // 15.2) and moved the SAMPLED difference 4.5 → 5.1 while the true mean RA stayed 13.5 mmHg (measured on both trees)
    const o = () => (r.e as unknown as { st: { hemo: { circOut: { pRa: number; pPv: number } } } }).st.hemo.circOut;
    let dSum = 0;
    let n = 0;
    for (let t = 150.02; t <= 180; t += 0.02) { r.e.advanceTo(t); dSum += o().pPv - o().pRa; n++; }
    r.trace('tamp', [55, 170]);
    expect(Math.abs(dSum / n)).toBeLessThanOrEqual(5);
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-bronchospasm-one.test.ts', // FU-6 R6: four ≤ 22 sim-min bronchospasm runs
```

replace with:

```ts
  'test/engine/resp-bronchospasm-one.test.ts', // FU-6 R6: four ≤ 22 sim-min bronchospasm runs
  'test/engine/resp-induction.test.ts', // FU-6 R3(a): six 15 sim-min inductions
```

- [ ] **Step 4: Run** the new files, `test/l2/neuro`, `test/engine/neuro-*.test.ts` (prototype green: `neuro-spont` 4/4,
  `neuro-acceptance` 4/4, `neuro-engine` 9/9, `neuro-circ` 2/2), `test/engine/circ-sanity-2.test.ts` (both R23 `it.fails`
  still fail with O2 — prototype: kIsch 1.00 throughout), `test/engine/circ-hypoxic-arrest.test.ts` and
  `test/l2/neuro/brainstem-gate.test.ts` (FU-3's unventilated rigs; prototype green), `test/engine/resp-*.test.ts`,
  `test/engine/organs-*.test.ts` (ataxic breathing uses the same driver; prototype green). Record the apnoea durations
  in the gate note (they move with FU-4's R1: the PaCO2 at loss of consciousness).
  **Sensitivity (measured while writing this plan):** the apnoea durations depend on how far PaCO2 has risen before
  loss of consciousness, i.e. on the dead space and the resting pattern FU-4's R1 root fixes. On the clean `4f4ce06`
  tree + Tasks 1–6 (the calibrated 15 × 500 pattern, 215 mL dead space): WAKE 8 → propofol 0 s / 2.5 mg/kg 22 s /
  + fentanyl 0 s; WAKE 10 → 28 / 44 / 28 s (fentanyl alone first raises PaCO2 39.4 → 42.8). R1-emulated, WAKE 8 →
  30 / 50 / 115 s, remifentanil 160 s. If the bands are missed on the merged main: WAKE_MMHG is [ENG] and names these
  bands as its fit target, so it MAY be moved inside its sourced range 7–10 (R45 rule 3) — record the value and the
  numbers; outside that range, or if the opioid arm still does not prolong the apnoea, the missed rows become
  `it.fails` with the numbers and Q-FU6-1 carries them to Ali.
  **F7 re-fit (Orchestrator ruling (FU-6 review), 2026-09-28).** Since F7 the patient's shift is the DRAW
  (`WAKE_QUANTILES`), and `WAKE_MMHG` only serves where no draw exists. The knots were fitted on an R1 EMULATION (the
  sweep and the 20-seed numbers are in D5). On the merged main, re-run the sweep (a scratch copy of `resp-induction`'s
  `induce` that sets `st.resp.wakeMmHg` to 6, 7, …, 14 before 1 s — never committed) and move each knot to the shift
  that gives its band edge: u 0.57 → the largest shift with 0 s, 0.64 → 30 s, 0.88 → 60 s, 1 → ≈ 110 s. The knots are
  [ENG] with the label as fit target, so this is a re-fit, not a band change (R45 rule 3); the 20-seed row and the
  seed-7 rows are then re-measured and their titles updated. If no knot set satisfies the 20-seed row's bands, that
  row becomes `it.fails` with its counts and Q-FU6-1 carries it.
  **Blast radius of the draw (state it in the gate note).** Every MODELED test with a hypnotic now runs its seed's
  patient, not the fixed 8 mmHg: seed 7 (all FU-6 rigs) draws 9.45 (modal), seed 1 → 10.55, 3 → 9.86, 4 → 10.43, 5 →
  6.41 (no apnoea), 2 → 3.33, 11 → 6.52 (the repo's most-used seeds). Step 4's run list is where a moved sibling shows;
  a moved number in a sibling with an unchanged band is reported, a missed band is `it.fails` with its number (R45).
  Measured by the FU-6 fixer with the draw in (applied tree, `94040f7`-equivalent): `test/engine/neuro-*.test.ts`,
  `circ-sanity-2.test.ts` (both R23 `it.fails` still failing) and `test/l2/neuro/brainstem-gate.test.ts` — 7 files
  green; `test/l2/neuro` and `test/l2/lung` 89/89.
- [ ] **Step 5: Commit and push** — `feat(resp): the wakefulness drive — induction apnoea after propofol, longer with an
  opioid (FU-6 R3a; E-FU6-2, E-FU6-7)`.

### Task 5: R3(b, c, d) — obstruction is a load the drive sees (effort, not rate); the VT ceiling; residual-block obstruction and arousal (lungs; 7f E-FU6-2; b, c PROTOTYPED; d CODED under the Q-FU6-4 ruling / D21, UNPROTOTYPED — E-FU6-10)

**Files:**
- Modify: `packages/engine-core/src/l2/lung/drive.ts` (`load` input; the rate split)
- Modify (7f, **E-FU6-2**): `packages/engine-core/src/l2/neuro/spont.ts` (`VT_MAX_ML_KG`; `SpontDrive.effort`;
  `SpontInputs.ibwKg/airwayObs`; the ceiling)
- Modify (7f, **E-FU6-2**): `packages/engine-core/src/l2/neuro/drive.ts` (Step 5, D21: `UA_AROUSAL`; the arousal factor
  on the residual-block share of `obstruction`)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (the spontaneous-drive inputs)
- Modify: `packages/engine-core/test/l2/lung/drive-fu6.test.ts` (one `it`)
- Modify (7f unit bands, **E-FU6-10**): `packages/engine-core/test/l2/neuro/depth-drive.test.ts`,
  `packages/engine-core/test/l2/neuro/pipeline.test.ts` (Step 5: the awake arm re-specified, the tables' band kept on
  the unconscious arm)
- Create: `packages/engine-core/test/engine/resp-obstruction.test.ts` (3 runs of ≤ 25 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R3(b–d), C4, E2, E2b, D3; D6, D8):** obstruction was a VT multiplier applied AFTER the drive had chosen VE,
so the drive answered the rising PaCO2 with rate — RR 41 at VT 200 mL (VA 0) after propofol on a natural airway, RR 45 ×
VT 1.57 L demanded in laryngospasm — and residual block obstructed an awake patient as much as a sedated one (D3: VT
141 at TOFR 0.6; Eikermann 2003 *AJRCCM* 167:1024: awake volunteers at TOFR 0.5–0.7 keep a near-normal VT).

**Prototype (R1-emulated; the clean `4f4ce06` tree + Tasks 1–6 in brackets — R1-dependent, re-measure after FU-4):**
C4 natural airway: max RR **18.1** [26.4] (was 41), obstructed VT 50–150 mL [VT never < 100: the calibrated 15 × 500
resting pattern]; E2b 3 min
`obstructed`: RR 12.6 → **16.3** [16.8 → 19.5] (no chemical rate rise), neural effort 0.6 → **2.25** [4.82], neural VT
≤ 1102 mL [2428; ceiling 2450]; release: PaCO2 60.8 → 49.0 → 41.0 at 10/20 s, ≥ 41 after [min 40.9], RR 23 → 19
[45 for ≈ 20 s] (D8). **Step 5 (the arousal term) is UNPROTOTYPED as an ENGINE run** — its two unit rows are exact
arithmetic of the formula below (awake obstruction 0.150, `vtMult` 0.85; unconscious 0.600, `vtMult` 0.40), and the
writer measured the awake values of both re-specified bands on the applied tree before the ruling (`depth-drive`
0.150 where the band said > 0.4; `pipeline` 0.151 where it said > 0.3). The engine-level consequence (D3 / NN-08) is the
step's R45 measurement.

- [ ] **Step 1: The failing tests.**

#### Modify `packages/engine-core/test/l2/lung/drive-fu6.test.ts`

Edit 1 — find:

```ts
  it('apnoea below 10 % of resting VE, resuming above 15 % (hysteresis)', () => {
```

replace with:

```ts
  it('R3(b): against a complete load the extra drive goes into VT, not rate (Zechman 1957)', () => {
    const hyper = { ...X, paco2: 44 }; // VE doubles
    expect(drive(hyper).rr).toBeCloseTo(12 * Math.SQRT2, 6);
    expect(drive({ ...hyper, load: 1 }).rr).toBeCloseTo(12, 6);
    expect(drive({ ...hyper, load: 1 }).vt).toBeCloseTo(1000, 6);
  });
  it('apnoea below 10 % of resting VE, resuming above 15 % (hysteresis)', () => {
```

#### Create `packages/engine-core/test/engine/resp-obstruction.test.ts`

```ts
// FU-6 R3(b, c) (audit C4, E2b; suite RS3/RS8; D6–D8): obstructed efforts raise effort, not rate; the neural VT has a
// ceiling; release does not overshoot into hypocapnia. Bands: RS3 (RR never > 30 during obstruction; VT < 100 mL within
// 60 s of propofol; SaO2 < 90 within 2 min on air); D6 (during a complete obstruction the rate rises by ≤ 5/min — the
// depressed rate returns to its unloaded value, the chemical rise goes into effort); D8 (PaCO2 ≥ 38 in the 2 min after
// release: no hypocapnic overshoot); Hey 1966 (VT ceiling 35 mL/kg IBW). The post-release rate is logged, not banded
// (hyperpnoea after 3 min of asphyxia is expected; the audit's defect was the unbounded VT demand).
import { describe, expect, it } from 'vitest';
import { VT_MAX_ML_KG } from '../../src/l2/neuro/spont.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

describe('FU-6 R3(b, c): obstruction is a load (was RR 41 at VT 200; RR 45 × 1.57 L in laryngospasm)', { timeout: 600_000 }, () => {
  it('propofol 2 mg/kg, natural airway, room air: RR ≤ 30, VT < 100 mL within 60 s, SaO2 < 90 within 2 min (18.1 / 50 s / 55 s)', async () => {
    const e = rig6();
    await runTo(e, 300);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    let maxRr = 0;
    let tVt: number | undefined;
    let tSa: number | undefined;
    await runTo(e, 900, (t) => {
      const rs = st6(e).resp;
      const sp = rs.spont;
      maxRr = Math.max(maxRr, sp?.rr ?? 0);
      if (tVt === undefined && sp && sp.rr >= 0 && sp.vt < 100) tVt = t;
      if (tSa === undefined && rs.o2.sa < 0.9) tSa = t;
    }, 1);
    console.log(`FU-6 R3(b) C4: max RR ${maxRr.toFixed(1)}, VT < 100 at +${((tVt ?? NaN) - 300).toFixed(0)} s, SaO2 < 90 at +${((tSa ?? NaN) - 300).toFixed(0)} s`);
    expect(maxRr).toBeLessThanOrEqual(30);
    expect((tVt ?? Infinity) - 300).toBeLessThanOrEqual(60);
    expect((tSa ?? Infinity) - 300).toBeLessThanOrEqual(120);
  });
  it('3 min of complete obstruction after propofol 1 mg/kg: RR rises ≤ 5/min, effort ≥ 2, neural VT ≤ ceiling; release: PaCO2 ≥ 38 (12.6 → 16.3 / 2.25 / ≥ 41)', async () => {
    const e = rig6();
    await runTo(e, 480);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 1, unit: 'mg/kg', route: 'iv' });
    await runTo(e, 598);
    const rr0 = st6(e).resp.spont.rr as number;
    send(e, { kind: 'airway', state: 'obstructed' });
    let maxRr = 0;
    let maxVtNeural = 0;
    await runTo(e, 780, () => {
      const sp = st6(e).resp.spont;
      maxRr = Math.max(maxRr, sp.rr);
      maxVtNeural = Math.max(maxVtNeural, (sp.effort ?? 0) * 500);
    }, 1);
    const effort = st6(e).resp.spont.effort as number;
    send(e, { kind: 'airway', state: 'patent' });
    let minPa = Infinity;
    let maxRrAfter = 0;
    await runTo(e, 900, () => {
      minPa = Math.min(minPa, st6(e).resp.co2.pf);
      maxRrAfter = Math.max(maxRrAfter, st6(e).resp.spont.rr);
    }, 1);
    console.log(`FU-6 R3(b) E2b: RR ${rr0.toFixed(1)} → max ${maxRr.toFixed(1)}; effort ${effort.toFixed(2)}; neural VT max ${maxVtNeural.toFixed(0)}; release min PaCO2 ${minPa.toFixed(1)}, max RR ${maxRrAfter.toFixed(1)}`);
    expect(maxRr).toBeLessThanOrEqual(rr0 + 5);
    expect(effort).toBeGreaterThanOrEqual(2);
    expect(maxVtNeural).toBeLessThanOrEqual(VT_MAX_ML_KG * 70 + 1);
    expect(minPa).toBeGreaterThanOrEqual(38);
  });
});
```

(`effort × 500` reads the neural VT because the rig's resting VT is 500 mL on origin/main; after FU-4's R1 root the
resting VT is the patient's — replace 500 with `st6(e).l1` rr/vt target if FU-4 moved it, recorded as a re-anchoring.)

- [ ] **Step 2: Run them; they fail** (no `load` input: RR 41; `VT_MAX_ML_KG` missing).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/lung/drive.ts`

Edit 1 — find:

```ts
  apnoeic?: boolean; // FU-6 R3(a): the last evaluation was apnoeic (hysteresis)
}
```

replace with:

```ts
  apnoeic?: boolean; // FU-6 R3(a): the last evaluation was apnoeic (hysteresis)
  load?: number; // FU-6 R3(b): 0–1 inspiratory (upper-airway) obstruction the effort works against; absent = 0
}
```

Edit 2 — find:

```ts
  const rr = Math.max(4, Math.min(45, x.rr0 * rrF * Math.sqrt(ve / x.ve0) + J_RR_PER_EVLWI * Math.max(0, x.evlwi - 10)));
```

replace with:

```ts
  // FU-6 R3(b): against an inspiratory load the extra drive goes into effort (VT), not rate — load compensation
  // (Zechman, Hall & Hull 1957 J Appl Physiol 10:356: resistive loading slows RR and deepens the breath)
  const q = ve / x.ve0; // a depressed drive slows the rate as before; only the RISE is suppressed by the load
  const rr = Math.max(4, Math.min(45, x.rr0 * rrF * (q < 1 ? Math.sqrt(q) : q ** (0.5 * (1 - (x.load ?? 0)))) + J_RR_PER_EVLWI * Math.max(0, x.evlwi - 10)));
```

#### Modify `packages/engine-core/src/l2/neuro/spont.ts`

Edit 1 — find:

```ts
export const CENTRAL_TAU_S = 90;
export const PERIPH_SHARE = 0.3;
```

replace with:

```ts
export const CENTRAL_TAU_S = 90;
export const PERIPH_SHARE = 0.3;
/**
 * FU-6 R3(c): the tidal-volume ceiling of the chemical drive — VT plateaus at 50–60 % of the vital capacity (Hey et al.
 * 1966 Respir Physiol 1:193), VC ≈ 60–70 mL/kg IBW → 35 mL/kg IBW, × fatigue (weakness stays nmbVtMult's) [ENG size].
 */
export const VT_MAX_ML_KG = 35;
```

Edit 2 — find:

```ts
  pc?: number; // FU-6 R3(a): central (brain) PCO2 the drive reads, mmHg (absent = PaCO2)
}
```

replace with:

```ts
  pc?: number; // FU-6 R3(a): central (brain) PCO2 the drive reads, mmHg (absent = PaCO2)
  effort?: number; // FU-6 R3(b): the neural inspiratory effort relative to rest (neural VT / resting VT); absent = 1
}
```

Edit 3 — find:

```ts
  cbfRel?: number; // FU-3 item 16 (E-FU3-10): 7d's organs.brain.cbfRel (absent without 7d)
}
```

replace with:

```ts
  cbfRel?: number; // FU-3 item 16 (E-FU3-10): 7d's organs.brain.cbfRel (absent without 7d)
  ibwKg?: number; // FU-6 R3(c): the VT ceiling's size (absent = 70)
  airwayObs?: number; // FU-6 R3(b): the airway event's obstruction (1 = `obstructed`: laryngospasm, foreign body)
}
```

Edit 4 — find:

```ts
    wake: n?.loc ?? 0, apnoeic: s.rr === 0, // FU-6 R3(a)
```

replace with:

```ts
    wake: n?.loc ?? 0, apnoeic: s.rr === 0, // FU-6 R3(a)
    load: Math.max(n?.obstruction ?? 0, x.airwayObs ?? 0), // FU-6 R3(b)
```

Edit 5 — find:

```ts
  let { rr, vt } = out;
  if (strength < DIAPH_APNOEA) rr = vt = 0;
```

replace with:

```ts
  let { rr, vt } = out;
  // FU-6 R3(c): the neural VT has a ceiling; the effort is what the patient MAKES, the delivered VT what gets through
  vt = Math.min(vt, VT_MAX_ML_KG * (x.ibwKg ?? 70) * s.fatigue); // weakness is nmbVtMult's (below), not counted twice
  s.effort = rr > 0 && x.vt0 > 0 ? vt / x.vt0 : 0;
  if (strength < DIAPH_APNOEA) rr = vt = 0;
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
      noFlow: ctx.rhythm.opts?.pulseless === true || rs.coRatio <= 0, cbfRel: ctx.cbfRel, // FU-3 item 16 (E-FU3-10)
    });
```

replace with:

```ts
      noFlow: ctx.rhythm.opts?.pulseless === true || rs.coRatio <= 0, cbfRel: ctx.cbfRel, // FU-3 item 16 (E-FU3-10)
      ibwKg: rs.pat.ibwKg, airwayObs: d.airway === 'obstructed' ? 1 : 0, // FU-6 R3(b), R3(c)
    });
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-induction.test.ts', // FU-6 R3(a): six 15 sim-min inductions
```

replace with:

```ts
  'test/engine/resp-induction.test.ts', // FU-6 R3(a): six 15 sim-min inductions
  'test/engine/resp-obstruction.test.ts', // FU-6 R3(b, c): two 15 sim-min obstruction runs
```

- [ ] **Step 4: Run** the new files, `test/l2/neuro`, `test/engine/neuro-*.test.ts`, `test/engine/resp-*.test.ts`,
  `test/engine/organs-*.test.ts`. Expected green (prototype: the fast set green except the three planned items of
  "Prototype results"; the slow set green except `circ-sanity-2`'s R23 confound fixed in Task 4).
  R1-dependent rows (measured on the clean `4f4ce06` tree + Tasks 1–6): C4 "VT < 100 mL within 60 s" was NOT met there
  (the calibrated 15 × 500 pattern keeps VT above 100; max RR 26.4 and SaO2 < 90 at +56 s were met); E2b met every band
  (RR 16.8 → 19.5, effort 4.82, neural VT 2428 ≤ 2450, release minimum PaCO2 40.9). On the merged main, a missed
  R1-dependent row becomes `it.fails` with its number (R45); no constant of this task is [ENG] with that row as its fit
  target, so nothing is tuned.
- [ ] **Step 5 (R3(d)): residual-block obstruction and arousal — CODED (Q-FU6-4 RULED; D21; UNPROTOTYPED as an engine
  run).** The ruling (`../research/00-orchestrator-rulings.md`, "FU-6 R50 review (2026-09-28 11:31)"): *the parameter
  tables §4.6 `uaCollapse` row describes the SEDATED patient; Eikermann 2003 AJRCCM 167:1024 governs the AWAKE one
  (upper-airway obstruction present, VT near-normal), and the block itself reduces the hypoxic response.* So the
  arousal term IS applied here, the tables' bands move to the arm they describe (**E-FU6-10**, below), and the
  hypoxic-response half lands in **Task 10** (`hvrDep`'s NMB arm, `HVR_NMB_EMAX` — that field does not exist yet at this
  task, so it cannot be anchored here; Task 10's `drive.ts` edits carry it). Nothing is tuned to reach a band: the two
  re-specified assertions are re-derived from the formula, and `UA_AROUSAL` is `[ENG]` with those rows named as its fit
  target.

#### Modify `packages/engine-core/src/l2/neuro/drive.ts`

Edit 1 — find:

```ts
export const LOC_HI = 1.0;
```

replace with:

```ts
export const LOC_HI = 1.0;
/**
 * FU-6 R3(d) (Q-FU6-4 ruled, D21): the share of a residual block's upper-airway obstruction that survives full
 * WAKEFULNESS. An awake patient defends his airway with phasic dilator (genioglossus) tone, so the same TOFR obstructs
 * him far less than the sedated patient of the parameter tables §4.6 `uaCollapse` row: Eikermann et al. 2003 AJRCCM
 * 167:1024 — awake volunteers at TOFR 0.5–0.7 keep a near-normal VT while upper-airway dilator function is measurably
 * impaired (so the load is small, not absent). [ENG 0.25; fit target: the awake rows of E-FU6-10.]
 */
export const UA_AROUSAL = 0.25;
```

Edit 2 — find:

```ts
  const residual = Math.max(0, Math.min(1, (0.9 - x.tofr) / 0.4)) * 0.8;
```

replace with:

```ts
  // FU-6 R3(d) (D21): arousal scales the RESIDUAL-BLOCK share between UA_AROUSAL (awake, Eikermann 2003) and 1
  // (unconscious — the tables' own value); the sedation arm below is untouched, and a complete-obstruction event
  // (`airway: 'obstructed'`, Task 5's `airwayObs`) is unaffected because it does not come through this term.
  const residual = Math.max(0, Math.min(1, (0.9 - x.tofr) / 0.4)) * 0.8 * (UA_AROUSAL + (1 - UA_AROUSAL) * loc);
```

#### Modify `packages/engine-core/test/l2/neuro/depth-drive.test.ts`

Edit 1 — find:

```ts
  it('NMB: diaphragm 97 % blocked → apnoea; 50 % → full VT; residual TOFR 0.6 with a natural airway → partial obstruction', () => {
    const base = { vent: V0, macVolatile: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false };
    expect(neuroResp({ ...base, diaBlock: 0.97 }).apnoea).toBe(true);
    expect(neuroResp({ ...base, diaBlock: 0.5 }).vtMult).toBeCloseTo(1, 5);
    const ob = neuroResp({ ...base, diaBlock: 0.1, tofr: 0.6, naturalAirway: true });
    expect(ob.obstruction).toBeGreaterThan(0.4);
    expect(ob.vtMult).toBeLessThan(0.6);
  });
```

replace with:

```ts
  // FU-6 R3(d), E-FU6-10 (Orchestrator ruling (FU-6 review), 2026-09-28; Q-FU6-4 / D21): the tables §4.6 `uaCollapse`
  // row is the SEDATED patient and KEEPS its bands on the unconscious arm; the awake arm follows Eikermann 2003 AJRCCM
  // 167:1024 (near-normal VT at TOFR 0.5–0.7 with impaired dilator function). Re-specified, not widened: both
  // quantities are still asserted, on both arms, and the awake values are the formula's (0.8·0.75·UA_AROUSAL scaling).
  it('NMB: diaphragm 97 % blocked → apnoea; 50 % → full VT; residual TOFR 0.6 with a natural airway → the tables\' obstruction when unconscious, a small load with a near-normal VT when awake (Eikermann 2003; E-FU6-10, the awake row was > 0.4 — measured 0.150)', () => {
    const base = { vent: V0, macVolatile: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false };
    expect(neuroResp({ ...base, diaBlock: 0.97 }).apnoea).toBe(true);
    expect(neuroResp({ ...base, diaBlock: 0.5 }).vtMult).toBeCloseTo(1, 5);
    const ob = neuroResp({ ...base, diaBlock: 0.1, tofr: 0.6, naturalAirway: true, hypnotic: 1 }); // unconscious: the tables' patient
    expect(ob.obstruction).toBeGreaterThan(0.4);
    expect(ob.vtMult).toBeLessThan(0.6);
    const aw = neuroResp({ ...base, diaBlock: 0.1, tofr: 0.6, naturalAirway: true }); // awake: dilator tone compensates
    expect(aw.obstruction).toBeGreaterThan(0.1); // a LOAD the drive sees (Step 3's `load`), not zero
    expect(aw.obstruction).toBeLessThan(0.2);
    expect(aw.vtMult).toBeGreaterThan(0.8); // near-normal VT (Eikermann 2003)
  });
```

#### Modify `packages/engine-core/test/l2/neuro/pipeline.test.ts`

Edit 1 — find:

```ts
  it('residual block with a natural airway → obstruction; with a tube → none', () => {
    const a = createNeuroState({}, 1);
    give(a, ev({ kind: 'airwayDevice', device: 'none' }), 0);
    const bus = busFixture({ agents: { rocuronium: nmbAgent(605, 605, 0.6) } }); // thumb T1 ≈ 0.81 → TOFR ≈ 0.6
    stepNeuroTo(a, 5, ENV, bus);
    expect(a.resp.obstruction).toBeGreaterThan(0.3);
```

replace with:

```ts
  // FU-6 R3(d), E-FU6-10 (Q-FU6-4 / D21): this fixture has NO hypnotic, so it is Eikermann's AWAKE patient — the
  // tables' > 0.3 belongs to the sedated one (kept on `depth-drive`'s unconscious arm). Was > 0.3; measured 0.151.
  it('residual block with a natural airway → a small awake obstruction (Eikermann 2003; E-FU6-10, was > 0.3); with a tube → none', () => {
    const a = createNeuroState({}, 1);
    give(a, ev({ kind: 'airwayDevice', device: 'none' }), 0);
    const bus = busFixture({ agents: { rocuronium: nmbAgent(605, 605, 0.6) } }); // thumb T1 ≈ 0.81 → TOFR ≈ 0.6
    stepNeuroTo(a, 5, ENV, bus);
    expect(a.resp.obstruction).toBeGreaterThan(0.1);
    expect(a.resp.obstruction).toBeLessThan(0.25);
```

- [ ] **Step 5b: run and record (R45 procedure — this step is UNPROTOTYPED as an engine run).** (1) Apply the code
  above. (2) Run `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/neuro test/l2/lung
  test/engine/resp-obstruction.test.ts` and the audit's residual-block scenario `npx -y pnpm@9.15.9 run
  audit:respiratory D3-extubation-residual M-NN08-extub-hypoxic`; record the awake and unconscious `obstruction`,
  `vtMult`, the D3 VT/RR trace and the NN-08 SpO2 nadir in
  `<scratchpad>/fu-6-respiratory-integration/task5-step5.txt`. (3) If a band above is missed, it becomes
  `it.fails('… measured <number> (FU-6 R3(d), band <band>)')` with the number in its title — `UA_AROUSAL` is the ONLY
  constant that may be re-fitted here, and only to the two E-FU6-10 rows its comment names as its fit target (the
  awake share; never to make an engine row pass). (4) No other existing test is touched: `depth-drive.test.ts` and
  `pipeline.test.ts` are the only two files whose bands encode the tables' row (verified by
  `git grep -n 'obstruction' packages/engine-core/test`). (5) The audit's D3 (extubation at TOFR 0.6 under propofol Ce
  1.6, `loc` ≈ 0.5) now obstructs ≈ 0.6·(0.25 + 0.75·0.5) ≈ 0.37 instead of 0.6 — record the new VT/RR and grade
  A09-D3 in the gate note §9 (it was `TS`, "unchanged"). (6) Gate note §6 records both re-specified bands with this
  reason as E-FU6-10, and §7 gains `UA_AROUSAL` as a calibration-queue row.
- [ ] **Step 6: Commit and push** — `feat(resp): obstruction is a load the drive sees; the VT ceiling; the awake
  residual-block share (FU-6 R3b–d; E-FU6-2, E-FU6-10)`.

### Task 6: R3(b) — an obstructed effort pulls the pleural pressure down: pulsus through 7a, negative-pressure oedema through 7c (Stage 3 + 7a E-FU6-3 + 7c E-FU6-4; pleural PROTOTYPED, NPPE UNPROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/lung/drive.ts` (`PMUS_REST_CMH2O`)
- Modify: `packages/engine-core/src/l2/resp/driver.ts` (`Cycle.pmus`, `DriverCtx.pmusObs/pmusFull`, the obstructed cycles)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (`obstructedEffort()` into `driverCtx`; step 5: `rs.palvObs`)
- Modify (7a, **E-FU6-3**): `packages/engine-core/src/l2/circ/pleural.ts` (`obstructedSwingMmHg`; subtracted)
- Modify (7c, **E-FU6-4**, step 5): `packages/engine-core/src/l2/blood/pipeline.ts` (the capillary pressure lung water sees)
- Create: `packages/engine-core/test/engine/resp-pleural-effort.test.ts` (2 runs of 13 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R3(b), E2b; D7):** obstructed cycles have `vt = 0`, so the pleural input returned its resting value
(`circ/pleural.ts:12`): an effort against a closed airway never reached the heart or the lung — no pulsus paradoxus,
no negative-pressure pulmonary oedema (≈ 0.1 % of laryngospasm; Miller airway complications).

**Prototype (E2b, R1-emulated):** pleural minimum −6.9 mmHg (resting breath) → **−17.0 mmHg** at 170 s of complete
obstruction (swing −13.6 mmHg ≈ −18.5 cmH2O at effort 2.25); beat-to-beat SBP range 1.9 → 4.3 mmHg (hypoxic
bradycardia at SaO2 < 50 % confounds). RS8's "swing ≤ −20 cmH2O with pulsus ≥ 10" is NOT met at propofol 1 mg/kg on
room air → the suite keeps it as `it.fails` with these numbers (Task 18). NPPE: UNPROTOTYPED (below).

- [ ] **Step 1: The failing test.**

#### Create `packages/engine-core/test/engine/resp-pleural-effort.test.ts`

```ts
// FU-6 R3(b) (audit E2b; D7): an effort against a closed airway lowers the pleural pressure by the muscle pressure it
// spends there (Mueller manoeuvre). Bands: the obstructed pleural minimum is ≥ 10 cmH2O below the resting breath's
// (prototype −17.0 vs −6.9 mmHg); the resting spontaneous breath is unchanged (−6.9 mmHg = P_PL0 − 4 cmH2O).
import { describe, expect, it } from 'vitest';
import { CMH2O_TO_MMHG, P_PL0 } from '../../src/l2/circ/params.ts';
import { fineWindow, rig6, runTo, send } from '../helpers/fu6.ts';

describe('FU-6 R3(b): obstructed efforts reach the pleural space (was the resting value)', { timeout: 600_000 }, () => {
  it('3 min of complete obstruction after propofol 1 mg/kg: pleural minimum ≥ 10 cmH2O below a resting breath (−17.0 vs −6.9 mmHg)', async () => {
    const e = rig6();
    await runTo(e, 480);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 1, unit: 'mg/kg', route: 'iv' });
    await runTo(e, 540);
    const rest = await fineWindow(e, 600);
    send(e, { kind: 'airway', state: 'obstructed' });
    await runTo(e, 740);
    const obs = await fineWindow(e, 780);
    console.log(`FU-6 R3(b): pleural minimum resting ${rest.pplMin.toFixed(1)} mmHg, obstructed ${obs.pplMin.toFixed(1)} mmHg`);
    expect(rest.pplMin).toBeGreaterThanOrEqual(P_PL0 - 4 * CMH2O_TO_MMHG - 0.5);
    expect(obs.pplMin).toBeLessThanOrEqual(rest.pplMin - 10 * CMH2O_TO_MMHG);
  });
});
```

- [ ] **Step 2: Run it; it fails** (the obstructed minimum is the resting −4 mmHg).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/lung/drive.ts`

Edit 1 — find:

```ts
export const APNOEA_VE_OUT = 0.15;
```

replace with:

```ts
export const APNOEA_VE_OUT = 0.15;
/**
 * FU-6 R3(b): inspiratory muscle pressure of a resting breath, cmH2O (VT/Crs + R·V' ≈ 500/100 + 2 ≈ 7–8 [ENG]). Against a
 * closed airway the whole effort shows in the pleural space: effort × 8, up to P_MAX (Mueller; laryngospasm −20 to −50).
 */
export const PMUS_REST_CMH2O = 8;
```

#### Modify `packages/engine-core/src/l2/resp/driver.ts`

Edit 1 — find:

```ts
  lungRiseIII?: number;
}
```

replace with:

```ts
  lungRiseIII?: number;
  /** FU-6 R3(b): the part of the inspiratory muscle pressure (cmH2O) spent against an obstructed upper airway. */
  pmus?: number;
}
```

Edit 2 — find:

```ts
  cleft?: number;
}
```

replace with:

```ts
  cleft?: number;
  /** FU-6 R3(b): obstructed-effort pleural swing of the next spontaneous breath (cmH2O; resp pipeline). */
  pmusObs?: number;
  /** FU-6 R3(b): the same for a complete airway obstruction (the `obstructed` airway state, 7f's complete obstruction). */
  pmusFull?: number;
}
```

Edit 3 — find:

```ts
  if (!mech && ctx.obstructed && d.airway === 'patent') { // Stage 7f: sedation/residual-block obstruction (plan decision 12)
    c.exch = false;
```

replace with:

```ts
  if (!mech && (ctx.pmusObs ?? 0) > 0) c.pmus = ctx.pmusObs; // FU-6 R3(b)
  if (!mech && ctx.obstructed && d.airway === 'patent') { // Stage 7f: sedation/residual-block obstruction (plan decision 12)
    c.pmus = ctx.pmusFull ?? c.pmus; // FU-6 R3(b)
    c.exch = false;
```

Edit 4 — find:

```ts
      c.effort = mech ? 0 : 1;
      break;
```

replace with:

```ts
      c.effort = mech ? 0 : 1;
      if (!mech) c.pmus = ctx.pmusFull ?? 0; // FU-6 R3(b): the whole effort against the closed airway
      break;
```

#### Modify `packages/engine-core/src/l2/circ/pleural.ts`

Edit 1 — find:

```ts
export function pleuralPressureMmHg(d: DriverState, t: number, complianceMl: number): number {
```

replace with:

```ts
/**
 * FU-6 R3(b) (E-FU6-3): the pleural pressure (mmHg, ≥ 0, subtracted) of an effort against an obstructed upper airway —
 * the muscle pressure spent there (Mueller manoeuvre: with no flow the whole Pmus appears in the pleural space), a
 * half-sine over the effort's inspiration.
 */
export function obstructedSwingMmHg(d: DriverState, t: number): number {
  const c = cycleAt(d, t);
  if (!c || c.mech || !((c.pmus ?? 0) > 0)) return 0;
  const u = t - c.t0;
  return u < c.ti ? (c.pmus as number) * Math.sin((Math.PI * u) / Math.max(0.1, c.ti)) * CMH2O_TO_MMHG : 0;
}

export function pleuralPressureMmHg(d: DriverState, t: number, complianceMl: number): number {
```

Edit 2 — find:

```ts
  const c = cycleAt(d, t);
  if (!c || !(c.vt > 0) || t >= c.cutAt) {
```

replace with:

```ts
  const c = cycleAt(d, t);
  const obs = obstructedSwingMmHg(d, t); // FU-6 R3(b)
  if (obs > 0 && c && (!(c.vt > 0) || t >= c.cutAt)) return P_PL0 - obs;
  if (!c || !(c.vt > 0) || t >= c.cutAt) {
```

Edit 3 — find:

```ts
  return P_PL0 - SPONT_SWING_CMH2O * (dv / Math.max(1, c.vt)) * CMH2O_TO_MMHG;
```

replace with:

```ts
  return P_PL0 - SPONT_SWING_CMH2O * (dv / Math.max(1, c.vt)) * CMH2O_TO_MMHG - obs;
```

(FU-4 Task 10 rewrites this return (ΔV over the resting VT, `weightKg`); append ` - obs` to FU-4's expression.)

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
import { wakeShiftMmHg } from '../lung/drive.ts'; // FU-6 F7
```

replace with:

```ts
import { P_MAX_CMH2O, PMUS_REST_CMH2O, wakeShiftMmHg } from '../lung/drive.ts'; // FU-6 R3(b); F7: wakeShiftMmHg
```

Edit 2 — find:

```ts
    obstructed: n ? n.obstruction >= 0.9 : false,
    cleft: n && n.cleft > 0.15 ? n.cleft : 0,
  };
}
```

replace with:

```ts
    obstructed: n ? n.obstruction >= 0.9 : false,
    cleft: n && n.cleft > 0.15 ? n.cleft : 0,
    ...obstructedEffort(rs, n), // FU-6 R3(b)
  };
}
/** FU-6 R3(b): the pleural swing of an effort against an obstructed airway (partial: × obstruction; complete: all). */
function obstructedEffort(rs: RespState, n?: NeuroResp): { pmusObs: number; pmusFull: number } {
  const cap = P_MAX_CMH2O * (n?.pMaxMult ?? 1) * rs.lung.lp.pMax * (rs.spont?.fatigue ?? 1);
  const full = Math.min(cap, PMUS_REST_CMH2O * (rs.spont?.effort ?? 1));
  return { pmusObs: full * Math.min(1, n?.obstruction ?? 0), pmusFull: full };
}
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-obstruction.test.ts', // FU-6 R3(b, c): two 15 sim-min obstruction runs
```

replace with:

```ts
  'test/engine/resp-obstruction.test.ts', // FU-6 R3(b, c): two 15 sim-min obstruction runs
  'test/engine/resp-pleural-effort.test.ts', // FU-6 R3(b): a 13 sim-min laryngospasm run
```

- [ ] **Step 4: Run** the new file, `test/l2/circ`, `test/engine/circ-*.test.ts`, `test/engine/resp-*.test.ts`,
  `test/engine/neuro-*.test.ts`. Expected green (prototype: every slow and fast file green except the planned items).
- [ ] **Step 5 (wired and measured; NPPE itself NOT MODELLED — F8): negative-pressure pulmonary oedema.** The capillary transmural pressure lung water sees
  rises by the negative ALVEOLAR pressure of obstructed efforts (≈ minus the obstructed swing), 10 s filtered, so a
  sustained forceful effort filters water (Starling; NPPE ≈ 0.1 % of laryngospasm, onset within minutes — Miller airway
  complications; Bhattacharya 2016 *J Clin Anesth* 34:120). 7c keeps its own `lungWaterStep`; only its input moves.

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 3 — find:

```ts
  evlwiExtra?: number; // Stage 7c: lung water from the blood's COP/capillary leak, mL/kg above the conditions' (G7b ruling 8)
```

replace with:

```ts
  evlwiExtra?: number; // Stage 7c: lung water from the blood's COP/capillary leak, mL/kg above the conditions' (G7b ruling 8)
  palvObs?: number; // FU-6 R3(b): 10 s mean alveolar pressure of obstructed efforts, mmHg (≤ 0; absent = 0) — 7c's NPPE input
```

Edit 4 — find:

```ts
  const va = alveolarVentilation(d, t, deadSpace(rs));
  rs.vaLpm = va; // Stage 7g
```

replace with:

```ts
  const va = alveolarVentilation(d, t, deadSpace(rs));
  rs.vaLpm = va; // Stage 7g
  const palvNow = -obstructedSwingMmHg(d, t); // FU-6 R3(b): alveolar ≈ pleural during a no-flow effort
  if (palvNow < 0 || rs.palvObs !== undefined) {
    rs.palvObs = (rs.palvObs ?? 0) + (palvNow - (rs.palvObs ?? 0)) * (GAS_DT_S / 10);
    if (rs.palvObs > -0.01 && palvNow === 0) delete rs.palvObs;
  }
```

Edit 5 — find:

```ts
import { pleuralPressureMmHg } from '../circ/pleural.ts'; // Stage 7a
```

replace with:

```ts
import { obstructedSwingMmHg, pleuralPressureMmHg } from '../circ/pleural.ts'; // Stage 7a; FU-6 R3(b): NPPE input
```

#### Modify `packages/engine-core/src/l2/blood/pipeline.ts`

Edit 1 — find:

```ts
      bs.lung.pCap += (pPv - bs.lung.pCap) * (BLOOD_DT_S / 10);
```

replace with:

```ts
      // FU-6 R3(b) (E-FU6-4): obstructed efforts lower the alveolar (≈ interstitial) pressure, so the capillary
      // TRANSMURAL pressure rises by it — negative-pressure pulmonary oedema through the same Starling step
      bs.lung.pCap += (pPv - (rs.palvObs ?? 0) - bs.lung.pCap) * (BLOOD_DT_S / 10);
```

  **NPPE is a DECLARED NOT-MODELLED item — not an `it.fails`** (Orchestrator ruling (FU-6 review), 2026-09-28, F8). The
  term above is wired and physically right, but it cannot express the phenomenon: `pmus = min(P_MAX·strength·pMax·
  fatigue, 8·effort)` with Task 5's VT ceiling caps the chemical effort at ≈ 4.4–4.9, so the obstructed swing cannot
  exceed ≈ 39 cmH2O and its 10 s mean stays far from the Starling threshold (σ·COP − 2 ≈ 23 mmHg). **Measured by the
  FU-6 fixer on the applied tree** (RS8 rig: propofol 1 mg/kg, `obstructed` at 570 s, to 750 s, room air): `palvObs`
  10 s mean minimum **−6.5 mmHg** at effort **4.4**, pCap max **16.2** mmHg, **EVLWI +0.00 mL/kg** (the review's
  estimate was ≈ 3–4 mmHg at a −18 cmH2O swing). NPPE needs the −40 to −100 cmH2O efforts of a real Mueller manoeuvre
  against a closed glottis, a REFLEX effort independent of the chemical drive — which no FU-6 mechanism produces. So:
  (1) Task 18 carries an explicit NOT-MODELLED row (`RS8 NPPE — NOT MODELLED (declared)`) that records these numbers and
  guards the declaration (it fails, and the declaration is re-opened, if a later stage makes oedema appear); (2) the
  gate note lists NPPE under §5 "not modelled" with the number and adds a §7 calibration row ("laryngospasm effort:
  chemical drive only; NPPE unreachable"); (3) Q-FU6-3 asks Ali whether laryngospasm gets its own reflex effort term
  (a later stage) or NPPE stays out of v1. Run `test/engine/blood-*.test.ts` (7c's lung-water tests must not move:
  `palvObs` is absent in them).
- [ ] **Step 6: Commit and push** — `feat(resp): obstructed efforts lower the pleural pressure (pulsus) and feed 7c's lung
  water (NPPE) (FU-6 R3b; E-FU6-3, E-FU6-4)`.

### Task 7: R4 — "anaesthetised lungs" follow the anaesthetic state: FRC, VO2 and induction atelectasis from loss of consciousness and diaphragm block (Stage 3; 7x E-FU6-8; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (`RespState.gaLvl`; `GA_TAU_ON/OFF_S`, `gaLevel()`, `frcNow()`;
  `metabolic`, `o2Inputs`, the 10 Hz step, the lung's FRC and atelectasis flag, `lungStateEvent`)
- Modify (7x, **E-FU6-8**): `packages/engine-core/src/truth.ts` (SKIP_PATH, three entries: `resp.spont.pc`,
  `resp.spont.effort`, `resp.wakeMmHg`)
- NOT modified: `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` — **FU-4 has already flipped** its
  final-HR row (74.4 with FU-4); FU-6 only RE-MEASURES it and reports (F4, Step 3b). No E-FU6-7 flip is claimed here.
- Create: `packages/engine-core/test/engine/resp-ga-state.test.ts` (4 runs of ≤ 20 sim-min + one 40 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R4, B1–B5, I1; D9; audit Q7 decided):** FRC (awake 30 → GA 20 mL/kg adult, 8 child), VO2/VCO2 × 0.85 and
induction atelectasis followed only the `thermal` event's `anaesthesia: 'general'`, which no drug, device or ventilator
sets: without it a preoxygenated adult reached SaO2 90 % at 9.75 min (7.83 with it; Benumof ≈ 8), a 4 y child at 7.8 min
(2.75 with it; Patel 160 ± 31 s), and 40 min of propofol + rocuronium left FRC at 2100 mL.

**Prototype (no `thermal` switch):** adult **8.00 min**, obese 127 kg **2.83**, term pregnancy 5.75 (needs R10, Task 13),
child 4 y **3.50** (Patel 2.67 ± 0.5: V.1's CO-ratio fix and Task 17 re-measure); I1 FRC 2100 → **1400** (gaLvl 1.0).
The switch still forces the calibrated rigs. **Clean `4f4ce06` tree + Tasks 1–8 (the test file below):** adult **7.90**,
obese **2.83**, child **3.40** (`it.fails` holds), 40 min FRC test green; `resp-oxygen` 8/8, `lung-frc` 2/2, `cpr-etco2`
3/3, `blood-stage3-recheck` 3/3 green.

- [ ] **Step 1: The failing test.**

#### Create `packages/engine-core/test/engine/resp-ga-state.test.ts`

```ts
// FU-6 R4 (audit B1–B5, I1; suite RS2; D9): the anaesthetised-lung state follows the drugs — no `thermal` switch is
// sent. Bands (RS2): preoxygenated apnoea to SaO2 90 % adult 6.5–9.5 min (Benumof 1997 ≈ 8; the engine's own
// resp-oxygen band), obese 127 kg 2–3.5 (Benumof ≈ 2.7–3), child 4 y 2–3.2 (Patel 1994 160 ± 31 s). 40 min of
// propofol + rocuronium on VCV reach the GA FRC (20 mL/kg IBW).
import { describe, expect, it } from 'vitest';
import type { PatientProfile } from '../../src/types.ts';
import { ADULT6, rig6, runTo, send, st6 } from '../helpers/fu6.ts';

async function apnoea90(patient: PatientProfile): Promise<number> {
  const e = rig6(patient);
  await runTo(e, 60);
  send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
  await runTo(e, 240);
  send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
  send(e, { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
  send(e, { kind: 'ventilation', source: 'none' });
  let t90 = Infinity;
  await runTo(e, 240 + 900, (t) => { if (t90 === Infinity && st6(e).resp.o2.sa < 0.9) t90 = t; }, 1);
  const min = (t90 - 240) / 60;
  console.log(`FU-6 R4 apnoea to SaO2 90 %, no thermal switch, ${JSON.stringify(patient)}: ${min.toFixed(2)} min`);
  return min;
}

describe('FU-6 R4: anaesthetised lungs follow the anaesthetic state (was a hidden instructor switch)', { timeout: 900_000 }, () => {
  it('preoxygenated adult: 6.5–9.5 min without the switch (8.00; was 9.75)', async () => {
    const m = await apnoea90(ADULT6);
    expect(m).toBeGreaterThanOrEqual(6.5);
    expect(m).toBeLessThanOrEqual(9.5);
  });
  it('obese 127 kg: 2–3.5 min (2.83; was 3.33)', async () => {
    const m = await apnoea90({ ...ADULT6, weightKg: 127 });
    expect(m).toBeGreaterThanOrEqual(2);
    expect(m).toBeLessThanOrEqual(3.5);
  });
  it.fails('child 4 y 16 kg: 2–3.2 min (Patel 160 ± 31 s) — measured 3.50 on the prototype (was 7.83); V.1 E-V1-1 and FU-6 Task 17 re-measure', async () => {
    const m = await apnoea90({ ageY: 4, weightKg: 16, heightCm: 102, sex: 'M' });
    expect(m).toBeGreaterThanOrEqual(2);
    expect(m).toBeLessThanOrEqual(3.2);
  });
  it('40 min of propofol + rocuronium on VCV: FRC at the GA value within 2 % (1400 mL; was 2100)', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
    send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    await runTo(e, 2400);
    const rs = st6(e).resp;
    expect(rs.gaLvl).toBeGreaterThan(0.98);
    expect(Math.abs(rs.lung.frcGaMl / rs.pat.frcGaMl - 1)).toBeLessThanOrEqual(0.02);
  });
});
```

(If the child band is met on the merged main after V.1, flip `it.fails` to `it` with "was 3.50 (prototype)" in the
title — R45's pre-declared flip.)

- [ ] **Step 2: Run it; it fails** (adult 9.75, obese 3.33, FRC 2100).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
  spont?: SpontDrive; // Stage 7f: MODELED spontaneous drive (7b's drive/pti/fatigue + Winter's), absent in pre-7f snapshots
```

replace with:

```ts
  gaLvl?: number; // FU-6 R4: the anaesthetised-lung state 0 awake … 1 anaesthetised (absent until first anaesthetised)
  spont?: SpontDrive; // Stage 7f: MODELED spontaneous drive (7b's drive/pti/fatigue + Winter's), absent in pre-7f snapshots
```

Edit 2 — find:

```ts
  return tempFactor(rs.temp.tc) * (gas === 'o2' ? m.vo2F : m.vco2F) * rs.temp.extraX * (rs.temp.anaesthesia === 'general' ? GA_METABOLIC : 1);
}
```

replace with:

```ts
  return tempFactor(rs.temp.tc) * (gas === 'o2' ? m.vo2F : m.vco2F) * rs.temp.extraX * (1 - (1 - GA_METABOLIC) * gaLevel(rs)); // FU-6 R4
}

/**
 * FU-6 R4: "anaesthetised lungs" follow the anaesthetic state. Loss of consciousness or a paralysed diaphragm drops
 * FRC by loss of inspiratory muscle tone within minutes of induction (Hedenstierna & Edmark, BJA 2010;104:16 — FRC
 * −0.4–0.5 L, atelectasis within 5 min; Westbrook 1973 J Appl Physiol 34:81), and VO2 falls ~15 %. The `thermal`
 * event's `anaesthesia: 'general'` stays an explicit override (1). τ 20 s on (FRC falls within the first minute),
 * 300 s off [ENG].
 */
export const GA_TAU_ON_S = 20;
export const GA_TAU_OFF_S = 300;
export function gaLevel(rs: RespState): number {
  return rs.temp.anaesthesia === 'general' ? 1 : (rs.gaLvl ?? 0);
}
function frcNow(rs: RespState): number {
  return rs.pat.frcMl + (rs.pat.frcGaMl - rs.pat.frcMl) * gaLevel(rs);
}
```

Edit 3 — find:

```ts
  const ga = rs.temp.anaesthesia === 'general';
  return {
```

replace with:

```ts
  return {
```

Edit 4 — find:

```ts
    paco2: rs.co2.pf, tempC: rs.temp.tc, frcMl: ga ? rs.pat.frcGaMl : rs.pat.frcMl, bloodL: rs.pat.bloodL,
```

replace with:

```ts
    paco2: rs.co2.pf, tempC: rs.temp.tc, frcMl: frcNow(rs), bloodL: rs.pat.bloodL, // FU-6 R4
```

Edit 5 — find:

```ts
  // FU-6 R2: airway smooth muscle follows 7g's bronchodilation (re-resolved when B moves by ≥ 0.01, as 7e's writeLung does)
```

replace with:

```ts
  // FU-6 R4: the anaesthetised-lung state relaxes toward max(unconscious, diaphragm block)
  const gaT = Math.max(ctx.neuro?.loc ?? 0, 1 - (ctx.neuro?.pMaxMult ?? 1));
  const gaTau = gaT > (rs.gaLvl ?? 0) ? GA_TAU_ON_S : GA_TAU_OFF_S;
  const gaNext = (rs.gaLvl ?? 0) + (gaT - (rs.gaLvl ?? 0)) * (1 - Math.exp(-GAS_DT_S / gaTau));
  if (gaNext > 1e-4 || rs.gaLvl !== undefined) rs.gaLvl = gaNext; // absent until first anaesthetised (truth budget, D16)
  // FU-6 R2: airway smooth muscle follows 7g's bronchodilation (re-resolved when B moves by ≥ 0.01, as 7e's writeLung does)
```

Edit 6 — find:

```ts
  const ga = rs.temp.anaesthesia === 'general';
  rs.lung.frcGaMl = ga ? rs.pat.frcGaMl : rs.pat.frcMl;
```

replace with:

```ts
  const ga = gaLevel(rs) >= 0.5; // FU-6 R4: induction atelectasis once anaesthetised
  rs.lung.frcGaMl = frcNow(rs);
```

Edit 7 — find:

```ts
    deadSpaceMl: deadSpace(rs), frcMl: rs.temp.anaesthesia === 'general' ? rs.pat.frcGaMl : rs.pat.frcMl,
```

replace with:

```ts
    deadSpaceMl: deadSpace(rs), frcMl: frcNow(rs), // FU-6 R4
```

(FU-4's Task 15 changes `deadSpace(rs)` to `deadSpace(rs, l1)` on this line; keep FU-4's argument.)

#### Modify `packages/engine-core/src/truth.ts`

Edit 1 — find:

```ts
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref', 'endo.core.x', 'endo.core.profile', 'resp.temp.env']); // Stage 7e: its input copy, profile and heat calibration
```

replace with:

```ts
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref', 'endo.core.x', 'endo.core.profile', 'resp.temp.env', 'resp.spont.pc', 'resp.spont.effort', 'resp.wakeMmHg']); // Stage 7e: its input copy, profile and heat calibration; FU-6 (E-FU6-8): the drive's lagged central PCO2 and neural effort are machinery; F7's per-patient wake draw is a constant
```

(**Three-way merge — F10(5), Orchestrator ruling (FU-6 review), 2026-09-28.** FU-4 adds `hemo.circ.acc` and
`hemo.circ.cppAcc` (E-FU4-3) and FU-5 adds `hemo.num`, `resp.num` and `hemo.nibp` (R-FU5-2) on this SAME line. The line
FU-6 writes is the UNION of FU-4's, FU-5's and FU-6's entries in whatever order the merged main has them, plus FU-6's
four; never drop an entry another plan added. Re-anchor on the merged text in Task 0 Step 3 (stale block #7).)

**No edit to `circ-hypoxic-arrest.test.ts` (F4; Orchestrator ruling (FU-6 review), 2026-09-28).** This plan first carried
an R45 flip of that file's final-HR `it.fails` ("met with FU-6 — 130.0 at the band edge", measured on `94040f7` where the
row still read `it.fails(… 132.1 on main + 7e)`). **FU-4 has already flipped that row** to
`it('… was 132.1 on main + 7e, 74.4 with FU-4')`, so FU-6's edit cannot apply, the flip claim is void, and the gate
note's "FU-3's `circ-hypoxic-arrest` final HR (132.1 → 130.0)" line would be false. The edit is DELETED and replaced by a
measurement step:

- [ ] **Step 3b (F4): re-measure, do not flip.** After this task's code is in, run
  `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-hypoxic-arrest.test.ts` and record
  the final HR in the gate note beside FU-4's number (74.4). FU-6's R4 changes that patient's lungs (the paralysed
  asphyxia rig becomes "anaesthetised": FRC to the GA value, VO2 −15 %), so the number WILL move — the expected direction
  is a lower HR than main's, since a smaller FRC desaturates sooner but a −15 % VO2 lowers the demand. If FU-6 pushes it
  ABOVE the 130 band, the row goes back to `it.fails` with FU-6's measured number and a gate-note calibration row; if it
  stays below, nothing is edited and the gate note records both numbers. E-FU6-7 claims NO flip of this file.

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-pleural-effort.test.ts', // FU-6 R3(b): a 13 sim-min laryngospasm run
```

replace with:

```ts
  'test/engine/resp-pleural-effort.test.ts', // FU-6 R3(b): a 13 sim-min laryngospasm run
  'test/engine/resp-ga-state.test.ts', // FU-6 R4: three apnoea runs of 19 sim-min and a 40 sim-min ventilated run
```

- [ ] **Step 4: Run** the new file, `test/engine/resp-oxygen.test.ts` and `test/engine/lung-frc.test.ts` (they send the
  switch: green on the prototype), `test/engine/resp-coupling.test.ts` (R39-7 GA redistribution: green),
  `test/engine/endo-*.test.ts` and `test/engine/thermal-*.test.ts` (7e reads `rs.temp.anaesthesia`, unchanged),
  `test/engine/truth-event.test.ts` (D16: FU-6's own net change in `resp` is −1 leaf; `neuro.resp` +1 (`loc`) — if the
  "future tree" check still reports 2100 leaves, the ±4-leaf wobble of `hemo` beat arrays on main's 2-leaf margin is the
  cause (measured: hemo 424 → 428 at 30 s): record it and ask (Q-FU6-8); do NOT raise `maxLeaves`), and the full fast set
  (`PME_TEST_SET=fast`).
- [ ] **Step 5: Commit and push** — `feat(resp): anaesthetised lungs follow the anaesthetic state — FRC, VO2, induction
  atelectasis (FU-6 R4; E-FU6-8)`.

### Task 8: R5 — capnograph physics: a breath smaller than the dead space draws no alveolar plateau (Stage 3; PROTOTYPED while writing the plan; the numeric's hold is FU-5's)

**Files:**
- Modify: `packages/engine-core/src/l2/resp/driver.ts` (`alveolarFraction()`; `Cycle.alvFrac`; `DriverCtx.vdSeriesMl`)
- Modify: `packages/engine-core/src/l2/co2/capno.ts` (the plateau level × `alvFrac`)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (`driverCtx` passes FU-4's `physicalDeadSpace(rs)` — ONE dead
  space, blocker F1; FU-6 defines no dead-space function of its own)
- Create: `packages/engine-core/test/l2/resp/capno-deadspace.test.ts`, `packages/engine-core/test/engine/resp-capno-deadspace.test.ts`
  (MANUAL, 2 runs of 3 sim-min: fast set)

**Why (audit R5, C1; H "VT below dead space"; D10):** `co2/capno.ts:67` draws the alveolar EtCO2 for ANY exchanging
cycle; `driver.ts` marks every non-obstructed cycle `alveolar` whatever its VT, while alveolar ventilation counts
max(0, VT − VD). After propofol the display rose 42 → 55 mmHg with VT 68 → 11 mL and raised EtCO2-HIGH while VA was 0
(Kodali 2013 *Anesthesiology* 118:192: breaths below the dead space show a small or absent plateau).

**Mechanism (Fowler 1948 single-breath washout):** the sampled expirate reaches alveolar gas only after the series
dead space is washed out; with axial mixing (Taylor dispersion) a breath of 0.6 VD shows the first CO2 and one of
1.4 VD a full plateau. `alvFrac = clamp((VT − 0.6·VDs)/(0.8·VDs), 0, 1)` [ENG ramp; fit target RS3 "EtCO2 display < 15
while VT < dead space" and "normal breaths unchanged"].

**ONE dead space (blocker F1; Orchestrator ruling (FU-6 review), 2026-09-28).** VDs is FU-4's exported
`physicalDeadSpace(rs)` — the same physical volume `alveolarVentilation` subtracts — never the MANUAL EtCO2 fit
`vdExtraMl` (measured while writing: with the pre-FU-4 `deadSpace(rs)` the neonatal RR 60 × 25 mL rig of
`resp-capnogram.test.ts` test 2 went flat, because the MANUAL fit gives that neonate ≈ 400 mL) and never a second
expression of FU-6's own. This plan first wrote its own `seriesDeadSpace(rs) = pat.deadSpaceMl + apparatus`; on the
merged tree that returns **204 mL** for the 70 kg ventilated rig while FU-4's `deadSpace` credits the ETT bypass and
returns **127 mL** (154 − 77 + 50), 60 % smaller — a 200 mL breath would have drawn a partial plateau (`alvFrac` 0.51)
although it washes the real series dead space out one and a half times over. `seriesDeadSpace` is therefore DELETED and
every consumer (this task's `driverCtx`, Task 9's pressure-limited breath, Task 11's kink row) calls
`physicalDeadSpace`. Task 0 Step 1 checks the export before any code is written.

**RE-MEASURE AFTER FU-4 (every number in this task, in RS3b, in RS9 and in Task 11's kink row).** The numbers below were
measured against the 204/265 mL dead spaces of the pre-FU-4 tree. With VDs ≈ 127 mL for the 70 kg ventilated adult the
ramp's knees move DOWN (first CO2 at 76 mL instead of 122; a full plateau at 178 instead of 286), so the EXPECTED
DIRECTION of every change is: partial plateaus become FULLER and flat-capnogram thresholds move to SMALLER breaths —
a breath that read `alvFrac` 0.5 reads ≈ 1.0. Concretely: the 100 mL bag breath (0.79 × 127) rises from 0.0 toward
≈ 10–20 % of the alveolar value, so RS3's "display < 15" band is the one at risk and the executor re-measures it FIRST;
a kinked-tube breath of ≤ 20 % of 500 mL (≤ 100 mL) is still at or below 0.6 × 127 = 76 mL only if it is ≤ 76 mL, so
Task 11's "flat capnogram" row may need the delivered volume in its title; RS9's pressure-limited VT 479 mL and the
Task 9 rows stay full plateaus (479 ≫ 178). Every re-measured number replaces the one in the test title, and a band the
mechanism now misses becomes `it.fails` with the new number (R45) — never a widened band.

**Measured on the PRE-FU-4 tree (Tasks 1–8 applied by the verifier to a clean `4f4ce06` tree, MANUAL; VDs 204 mL
ventilated):** BVM 12 × 100 mL displayed EtCO2 max **0.0** (was a full plateau); 12 × 500 mL **41.0**;
`resp-capnogram.test.ts` 6/6 and `resp-airway.test.ts` green.

**Boundary with FU-5 (D10):** the EtCO2 NUMERIC's hold of the last breath until the apnoea timer, and its invalid state,
are FU-5's (`l3/co2-numerics/**`). This task changes only what the waveform (and therefore the breath detector) sees.

- [ ] **Step 1: The failing tests.**

#### Create `packages/engine-core/test/l2/resp/capno-deadspace.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { alveolarFraction } from '../../../src/l2/resp/driver.ts';

describe('FU-6 R5: the sampled plateau is the mixed-expirate share (Fowler; D10)', () => {
  it('0 below 0.6 of the series dead space, 1 above 1.4×, linear between', () => {
    expect(alveolarFraction(80, 150)).toBe(0);
    expect(alveolarFraction(90, 150)).toBe(0);
    expect(alveolarFraction(150, 150)).toBeCloseTo(0.5, 12);
    expect(alveolarFraction(210, 150)).toBe(1);
    expect(alveolarFraction(500, 265)).toBe(1); // the ventilated adult's normal breath is untouched
    expect(alveolarFraction(500, 0)).toBe(1);
  });
});
```

#### Create `packages/engine-core/test/engine/resp-capno-deadspace.test.ts`

```ts
// FU-6 R5 (audit C1, H; suite RS3 row "flat or low capnogram (EtCO2 display < 15) while VT < dead space"): bag breaths of
// 100 mL (below the dead space) show no alveolar plateau; 500 mL breaths keep theirs. MANUAL, deterministic.
import { describe, expect, it } from 'vitest';
import { ADULT, ev3, numSeries, rig3, run } from '../helpers/resp.ts';

async function bag(vtMl: number) {
  const { e, ev } = rig3({ patient: ADULT });
  e.dispatch(ev3({ kind: 'airwayDevice', device: 'ett' }));
  e.dispatch(ev3({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl, fio2: 1 }));
  await run(e, 180);
  const et = numSeries(ev, 'etco2', 120, 180).map(([, v]) => v).filter(Number.isFinite);
  const max = et.length ? Math.max(...et) : 0;
  console.log(`FU-6 R5 BVM 12 × ${vtMl}: displayed EtCO2 max ${max.toFixed(1)} over 120–180 s`);
  return max;
}

describe('FU-6 R5: no plateau below the dead space (was 42 → 55 at VT 68 → 11 mL)', { timeout: 120_000 }, () => {
  it('12 × 100 mL: displayed EtCO2 < 15; 12 × 500 mL: ≥ 30', async () => {
    expect(await bag(100)).toBeLessThan(15);
    expect(await bag(500)).toBeGreaterThanOrEqual(30);
  });
});
```

- [ ] **Step 2: Run them; they fail** (`alveolarFraction` missing; the 100 mL bag shows a full plateau).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/resp/driver.ts`

Edit 1 — find:

```ts
  /** FU-6 R3(b): the part of the inspiratory muscle pressure (cmH2O) spent against an obstructed upper airway. */
  pmus?: number;
}
```

replace with:

```ts
  /** FU-6 R3(b): the part of the inspiratory muscle pressure (cmH2O) spent against an obstructed upper airway. */
  pmus?: number;
  /** FU-6 R5: share of the alveolar plateau the sampled expirate reaches (absent = 1): alveolarFraction(VT, VDs). */
  alvFrac?: number;
}

/**
 * FU-6 R5: the mixed-expirate share of a breath at the sampling site (Fowler 1948 single-breath washout; Kodali 2013
 * Anesthesiology 118:192 — breaths below the dead space show a small or absent plateau). The first CO2 appears at 0.6 of
 * the series dead space (axial mixing), a full plateau at 1.4× [ENG ramp; fit target RS3 and "normal breaths unchanged"].
 */
export function alveolarFraction(vtMl: number, vdSeriesMl: number): number {
  if (!(vdSeriesMl > 0)) return 1;
  return Math.min(1, Math.max(0, (vtMl - 0.6 * vdSeriesMl) / (0.8 * vdSeriesMl)));
}
```

Edit 2 — find:

```ts
  pmusFull?: number;
}
```

replace with:

```ts
  pmusFull?: number;
  /** FU-6 R5: series dead space (anatomical + apparatus, mL) for the sampled plateau; absent = full plateau. */
  vdSeriesMl?: number;
}
```

Edit 3 — find:

```ts
  if (!mech && (ctx.pmusObs ?? 0) > 0) c.pmus = ctx.pmusObs; // FU-6 R3(b)
```

replace with:

```ts
  if (!mech && (ctx.pmusObs ?? 0) > 0) c.pmus = ctx.pmusObs; // FU-6 R3(b)
  if (ctx.vdSeriesMl !== undefined) {
    const f = alveolarFraction(c.vt, ctx.vdSeriesMl); // FU-6 R5
    if (f < 1) c.alvFrac = f;
  }
```

#### Modify `packages/engine-core/src/l2/co2/capno.ts`

Edit 1 — find:

```ts
  return c.sampled === 'alveolar' ? x.etco2 : 0;
```

replace with:

```ts
  return c.sampled === 'alveolar' ? x.etco2 * (c.alvFrac ?? 1) : 0; // FU-6 R5: no plateau below the dead space
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
// FU-6 R6: the Stage 3 bronchospasm gradient (+8·sev) and shunt (+0.05·sev) are retired — the airway event is an alias
```

replace with:

```ts
/**
 * FU-6 R5 — ONE dead space (Orchestrator ruling (FU-6 review), 2026-09-28, blocker F1). The series dead space the
 * sampled expirate must wash out is the same PHYSICAL dead space the gas exchange uses: FU-4's exported
 * `physicalDeadSpace(rs)` (anatomical with the artificial airway's bypass credited, `ETT_BYPASS_ML_PER_KG` 1.1 mL/kg
 * IBW floored at 30 %, + the apparatus) — NEVER the MANUAL EtCO2 fit `co2.vdExtraMl`, which is a display calibration
 * and not gas (a 3.5 kg neonate on the adult MANUAL defaults carries a ≈ 400 mL fit), and never a second expression of
 * FU-6's own: the `seriesDeadSpace` this plan first wrote returned 204 mL (154 + 50) for the 70 kg ventilated rig while
 * FU-4's `alveolarVentilation` used 127 mL (154 − 77 + 50), so the plateau was computed against a washout volume the
 * gas exchange did not have.
 */
// FU-6 R6: the Stage 3 bronchospasm gradient (+8·sev) and shunt (+0.05·sev) are retired — the airway event is an alias
```

Edit 2 — find:

```ts
    ...obstructedEffort(rs, n), // FU-6 R3(b)
  };
```

replace with:

```ts
    ...obstructedEffort(rs, n), // FU-6 R3(b)
    vdSeriesMl: physicalDeadSpace(rs), // FU-6 R5: ONE dead space — FU-4's physical VD, not a second expression
  };
```

- [ ] **Step 4: Run** the new files, `test/l2/co2`, `test/engine/resp-capnogram.test.ts` (α, sampling, the pattern
  library — 500 mL breaths are untouched), `test/engine/resp-airway.test.ts` (M4 first-breath EtCO2 after apnoea;
  disconnection awRR 20 ± 1 s), `test/engine/co2-sampling-skin.test.ts`, `test/engine/resp-coupling.test.ts:43` (RR three
  ways), `test/engine/cpr-etco2.test.ts` (CPR breaths are bag breaths of the set VT: untouched), and the child rigs
  (`test/engine/resp-oxygen.test.ts`, `blood-stage3-recheck.test.ts`: a 16 kg child's VT vs its own dead space —
  record). A calibrated test that moves because its rig breathes below 1.4 × its dead space is reported, not re-banded.
- [ ] **Step 5: Measure** `npx -y pnpm@9.15.9 run audit:respiratory C1 C4 D1 D4` and record the displayed EtCO2 during
  the post-propofol shallow breathing (audit: 42 → 55 with EtCO2-HIGH at 349 s) and at RR ≤ 6 (D1/D4: the numeric's
  0–22 dips are FU-5's hold; note them unchanged).
- [ ] **Step 6: Commit and push** — `feat(capno): no alveolar plateau below the dead space (FU-6 R5)`.

### Task 9: R7 — the engine's ventilator and the ventilator link agree under pathology: the internal VCV gets a Pmax (Stage 3; ventilator TEST only; Pmax PROTOTYPED while writing; the parity half UNPROTOTYPED — needs V.1)

**Files:**
- Modify: `packages/engine-core/src/types-resp.ts` (`ventilation.pmax`)
- Modify: `packages/engine-core/src/l2/resp/driver.ts` (`VCV_PMAX_DEFAULT`; `DriverState.vent.pmax`)
- Modify: `packages/engine-core/src/l2/lung/mechanics.ts` (`mechSubstep(…, pLimit)`: a pressure-limited flow source),
  `packages/engine-core/src/l2/lung/lung.ts` (`lungMechStep(…, pLimit)` passes it)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (validation; the command; `lungDrive` returns the limit; the
  delivered VT becomes the cycle's VT at end-inspiration)
- Create: `packages/engine-core/test/engine/resp-vcv-pmax.test.ts` (2 runs of 10 sim-min → SLOW / `SLOW_B`),
  `packages/ventilator/test/link-parity.test.ts` (4 runs of 30 sim-min; the ventilator package's own CI job)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R7, I-b; D11):** under the same bronchospasm the link's ventilator pressure-limited at its Pmax 35 and
delivered 207 mL (→ SpO2 0 through the inflated dead space) while the engine's internal VCV, an unlimited flow source,
delivered 400 mL at any pressure. A real anaesthesia ventilator in VC has a pressure limit (Dräger Primus "Pmax"
pressure limitation; GE Aisys "Plimit"): the LINK is right in principle, the engine's VCV is fixed. V.1's Task 5 already
makes the link read the engine's absolute resistance/compliance (the ×6 ratio artefact is gone after V.1).

**Mechanism:** flow source until the airway pressure reaches Pmax, then a pressure source AT Pmax for the rest of Ti
(flow decays as the lung fills). The limit is applied INSIDE each 4 ms mechanics sub-step (`mechSubstep`'s `pLimit`), not
once per 16 ms sample from the previous pressure: measured while finishing the plan, the per-sample check let every
breath that starts while the lung is still emptying (a triggered breath on top of auto-PEEP: the expiratory unit
resistances are still in use) overshoot to 45–48 cmH2O for one sample — the 30-min bronchospasm arm read 47.6 at Pmax 40; at end-inspiration the cycle's VT becomes the delivered volume (Σ unit tidal volumes),
so alveolar ventilation, the capnogram's alveolar fraction and the `breath` records follow. Default Pmax 40 cmH2O
(anaesthesia-ventilator factory default) [ENG]; `ventilation.pmax` 10–80 sets it.

**Measured (every task applied to `94040f7`, the limit inside the sub-step):** healthy peak 16.8, VT 500 (untouched);
airway `bronchospasm` 1.25 at Pmax 40: peak **40.0**, delivered VT **479**, VA 2.53 L/min; at Pmax 80: peak 44.2, VT 500,
VA 2.82. Most of a bronchospasm peak is resistive, so capping it costs little volume. **Consequence, and the F2 rule
that follows from it (Orchestrator ruling (FU-6 review), 2026-09-28; D18b):** with the default Pmax 40 every
severe-bronchospasm peak READS 40.0 — the limit, not the lung — so "peak ≥ 40" measured there is unfalsifiable. Every row
that measures a lung's SEVERITY therefore runs at `pmax: 80` (Tasks 2 and 3 are re-armed in Step 3b below; RS7 and RS11
in Task 18; RS10 already did), and the default-Pmax arm gets its own row asserting the LIMIT: Ppeak within 0.5 of
`VCV_PMAX_DEFAULT` and a delivered VT below the set VT (40.0 / 479 mL).

- [ ] **Step 1: The failing tests.**

#### Create `packages/engine-core/test/engine/resp-vcv-pmax.test.ts`

```ts
// FU-6 R7 (audit I-b; D11): the internal VCV pressure-limits at Pmax. Near-fatal bronchospasm (1.25) on VCV 12 × 500:
// with Pmax 80 the flow source delivers 500 mL at a peak above 40; with the default Pmax 40 the peak stays ≤ 40.5 and
// the delivered VT falls below the set VT (and VA with it). Healthy breaths are untouched (peak 16.7, VT 500).
import { describe, expect, it } from 'vitest';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

async function spasm(pmax?: number) {
  const e = rig6();
  await ventRig(e, pmax === undefined ? {} : { pmax });
  await runTo(e, 240);
  const healthy = await fineWindow(e, 300);
  const vtHealthy = st6(e).resp.driver.cycles.at(-2)?.vt as number;
  send(e, { kind: 'airway', state: 'bronchospasm', severity: 1.25 });
  await runTo(e, 540);
  const w = await fineWindow(e, 600);
  const vt = st6(e).resp.driver.cycles.at(-2)?.vt as number;
  console.log(`FU-6 R7 Pmax ${pmax ?? 'default'}: healthy peak ${healthy.peak.toFixed(1)} VT ${vtHealthy.toFixed(0)}; spasm peak ${w.peak.toFixed(1)} VT ${vt.toFixed(0)} VA ${st6(e).resp.vaLpm.toFixed(2)}`);
  return { healthy, vtHealthy, peak: w.peak, vt };
}

describe('FU-6 R7: the internal VCV has a Pmax (was an unlimited flow source)', { timeout: 300_000 }, () => {
  it('default Pmax 40: Ppeak ≤ 40.5 and VT below the set VT in near-fatal bronchospasm; Pmax 80: VT 500 at a Ppeak > 40; healthy untouched', async () => {
    const lim = await spasm();
    const free = await spasm(80);
    expect(lim.healthy.peak).toBeLessThan(20);
    expect(Math.abs(lim.vtHealthy - 500)).toBeLessThanOrEqual(5);
    expect(lim.peak).toBeLessThanOrEqual(40.5);
    expect(lim.vt).toBeLessThanOrEqual(495); // capped at Pmax: less than the set VT (the resistive peak is what is cut)
    expect(lim.vt).toBeLessThan(free.vt - 10);
    expect(free.peak).toBeGreaterThan(40);
    expect(Math.abs(free.vt - 500)).toBeLessThanOrEqual(5);
  });
});
```

#### Create `packages/ventilator/test/link-parity.test.ts`

```ts
// FU-6 R7 (audit I-b; suite RS15): the same patient and settings through the ventilator link and through the engine's
// internal ventilator agree, healthy and in bronchospasm. Bands (RS15): PaCO2 / displayed EtCO2 / SpO2 within
// 3 mmHg / 3 mmHg / 2 % at 10 and 30 min; PPLAT and delivered VT within 10 %; Ppeak LOGGED with both inspiratory flows.
// FU-6 F5b (Orchestrator ruling (FU-6 review), 2026-09-28): a Ppeak band between two different inspiratory FLOW patterns
// is not achievable by any V.1 answer — the link drives VC with a square `vcFlow` 60 L/min + `pause` 0.3 while the engine
// uses x = vt / ti ≈ 18 L/min, and ≈ 3.5 cmH2O of the measured 23.8-vs-16.8 healthy gap is that flow difference alone at
// rTube ≈ 5 cmH2O/L/s. So: band the flow-independent plateau and the delivered volume, log both peaks with their flows,
// and let V.1 answer the real question (the circuit compliance / tube term). If V.1 instead exposes the link's flow
// settings, MATCH them to the engine's Ti and band Ppeak too — that is the better test and this file's TODO for V.1.
// Both paths: MODELED, VC 12 × 500, PEEP 5, FiO2 0.5, Pmax 40, the `normal` profile's patient; bronchospasm 1 at 20 min.
// Needs V.1 (absolute lungState, E-V1-3); the link's own Pmax is a ventilator setting passed explicitly (default 35).
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { createLinkedSim, PROFILES } from '../src/index.ts';
import { mean, num, run } from './helpers.ts';

type St = { resp: { co2: { pf: number }; lung: { mech: { paw: number }; pInsp: number }; driver: { cycles: Array<{ vt: number; mech: boolean }> } } };
const st = (e: unknown): St => (e as { st: St }).st;

async function both(spasm: boolean) {
  const s = createLinkedSim({ profile: 'normal', vent: { rate: 12, vt: 500, peep: 5, fio2: 50, pmax: 40 } });
  s.send({ type: 'setMode', mode: 'modeled' });
  const e = createEngine({ seed: 7, mode: 'modeled', patient: PROFILES.normal!.patient });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x), ['measurement']);
  let n = 0;
  const cmd = (event: Record<string, unknown>) => e.dispatch({ id: `p${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
  cmd({ kind: 'thermal', anaesthesia: 'general' });
  cmd({ kind: 'airwayDevice', device: 'ett' });
  cmd({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, pmax: 40 });
  // both patients paralysed (D19): an unparalysed internal-ventilator patient triggers extra breaths since FU-6 R9, the
  // link's external frames never do — measured without this: PaCO2 40.9 (engine) vs 46.5 (link) on the healthy lung
  for (const drug of [{ kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' }, { kind: 'infusion', drugId: 'rocuronium', rate: 0.6, unit: 'mg/kg/h' }]) {
    cmd(drug);
    s.send({ type: 'applyEvent', event: drug });
  }
  const out: Array<Record<string, number>> = [];
  for (const [tS, doSpasm] of [[600, false], [1200, spasm], [1800, false]] as Array<[number, boolean]>) {
    await run(s, tS);
    let peakE = 0;
    for (let u = e.now().simT; u < tS; u = Math.min(tS, u + 0.1)) { e.advanceTo(u + 0.1); if (u > tS - 60) peakE = Math.max(peakE, st(e).resp.lung.mech.paw); if (Math.round(u * 10) % 600 === 0) await new Promise((r) => setImmediate(r)); }
    const m = s.vs.p.measured;
    const vtE = st(e).resp.driver.cycles.filter((c) => c.mech).at(-2)?.vt ?? NaN;
    out.push({
      t: tS, paLink: st(s.engine).resp.co2.pf, paEng: st(e).resp.co2.pf,
      etLink: mean(num(s.events, 'etco2', tS - 60, tS)), etEng: mean(num(ev, 'etco2', tS - 60, tS)),
      spLink: mean(num(s.events, 'spo2', tS - 60, tS)), spEng: mean(num(ev, 'spo2', tS - 60, tS)),
      // FU-6 F5b: Ppeak is LOGGED (the two paths drive different inspiratory flows — see the assertions); the banded
      // mechanical quantities are the flow-independent plateau and the delivered volume
      pkLink: m.PIP, pkEng: peakE, pplatLink: m.PLAT, pplatEng: st(e).resp.lung.pInsp, vtLink: m.VTE, vtEng: vtE,
    });
    if (doSpasm) {
      s.send({ type: 'applyEvent', event: { kind: 'airway', state: 'bronchospasm', severity: 1 } });
      cmd({ kind: 'airway', state: 'bronchospasm', severity: 1 });
    }
  }
  console.log(`FU-6 R7 parity ${spasm ? 'bronchospasm' : 'healthy'}:`, JSON.stringify(out));
  return out;
}

describe('FU-6 R7: link parity (RS15; audit I-b: link VT 207 / SpO2 0 vs internal VT 400 / SpO2 98)', { timeout: 900_000 }, () => {
  for (const spasm of [false, true]) {
    it(`${spasm ? 'bronchospasm 1 at 20 min' : 'healthy'}: gas within 3 mmHg / 3 mmHg / 2 %, Pplat and delivered VT within 10 % (Ppeak logged — the two paths' inspiratory flows differ, F5b)`, async () => {
      for (const r of await both(spasm)) {
        if (r.t === 1200) continue; // the spasm step is sent at 20 min: compare 10 and 30 min
        expect(Math.abs(r.paLink! - r.paEng!)).toBeLessThanOrEqual(3);
        expect(Math.abs(r.etLink! - r.etEng!)).toBeLessThanOrEqual(3);
        expect(Math.abs(r.spLink! - r.spEng!)).toBeLessThanOrEqual(2);
        // FU-6 F5b (Orchestrator ruling (FU-6 review), 2026-09-28): Ppeak is NOT comparable while the two paths use
        // different inspiratory flows — the link's `presets.ts` drives VC with a square `vcFlow: 60` L/min + `pause: 0.3`
        // while the engine's VCV uses x = vt / ti ≈ 18 L/min, and at rTube ≈ 5 cmH2O/L/s that difference is ≈ 3.5 cmH2O of
        // resistive peak by itself (most of the measured 23.8 vs 16.8 healthy gap). Either MATCH the flows — set the
        // link's `vcFlow`/`pause` so its inspiratory time equals the engine's cycle Ti — and then band Ppeak, or band the
        // FLOW-INDEPENDENT plateau and the delivered volume and LOG both peaks. This file does the latter and states the
        // flows, so the row measures the lung rather than the flow pattern.
        expect(Math.abs(r.pplatLink! - r.pplatEng!)).toBeLessThanOrEqual(0.1 * r.pplatEng!);
        expect(Math.abs(r.vtLink! - r.vtEng!)).toBeLessThanOrEqual(0.1 * r.vtEng!);
      }
    });
  }
});
```

(If V.1 renamed `vs.p.measured`, `PIP` or `VTE`, use V.1's names — a re-anchoring, recorded.)

- [ ] **Step 2: Run them; they fail** (the internal VCV reaches any pressure; `pmax` is rejected by validation).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/types-resp.ts`

Edit 1 — find:

```ts
      /** Stage 3 extension: 0–1 spontaneous diaphragmatic effort during mechanical breaths (curare cleft). */
      effort?: number;
    }
```

replace with:

```ts
      /** Stage 3 extension: 0–1 spontaneous diaphragmatic effort during mechanical breaths (curare cleft). */
      effort?: number;
      /** FU-6 R7: the ventilator's pressure limit in volume control, cmH2O (10–80; default VCV_PMAX_DEFAULT 40). */
      pmax?: number;
    }
```

#### Modify `packages/engine-core/src/l2/resp/driver.ts`

Edit 1 — find:

```ts
  vent: { rr: number; vt: number; peep: number; ie: number };
```

replace with:

```ts
  vent: { rr: number; vt: number; peep: number; ie: number; pmax?: number }; // FU-6 R7: pmax absent = VCV_PMAX_DEFAULT
```

Edit 2 — find:

```ts
/** JSON-safe 'never' (snapshots travel as JSON: Infinity would become null). */
```

replace with:

```ts
/**
 * FU-6 R7: the volume-control pressure limit (cmH2O) when the command sets none — the anaesthesia-ventilator factory
 * default Pmax/Plimit 40 (Dräger Primus, GE Aisys operator manuals) [ENG]; above it the breath is pressure-limited.
 */
export const VCV_PMAX_DEFAULT = 40;
/** JSON-safe 'never' (snapshots travel as JSON: Infinity would become null). */
```

#### Modify `packages/engine-core/src/l2/lung/mechanics.ts`

Edit 1 — find:

```ts
export function mechSubstep(mp: MechParams, ms: MechState, mode: 'flow' | 'pressure' | 'closed', x: number, h = MECH_H): void {
```

replace with:

```ts
// FU-6 R7: `pLimit` (cmH2O; default none) makes a 'flow' sub-step pressure-limited — a VCV Pmax: if forcing `x` would put
// the airway opening above pLimit, this sub-step holds the airway AT pLimit instead (what a ventilator's Pmax does)
export function mechSubstep(mp: MechParams, ms: MechState, mode: 'flow' | 'pressure' | 'closed', x: number, h = MECH_H, pLimit = Infinity): void {
```

Edit 2 — find:

```ts
  if (mode === 'flow') pc = gSum > 0 ? (x + gp) / gSum : 0;
  else if (mode === 'pressure') pc = (x / mp.rTube + gp) / (1 / mp.rTube + gSum);
```

replace with:

```ts
  let limited = false; // FU-6 R7
  if (mode === 'flow') {
    pc = gSum > 0 ? (x + gp) / gSum : 0;
    if (pc + mp.rTube * x > pLimit) { limited = true; pc = (pLimit / mp.rTube + gp) / (1 / mp.rTube + gSum); }
  } else if (mode === 'pressure') pc = (x / mp.rTube + gp) / (1 / mp.rTube + gSum);
```

Edit 3 — find:

```ts
  ms.paw = mode === 'pressure' ? x : pc + mp.rTube * qt;
```

replace with:

```ts
  ms.paw = limited ? pLimit : mode === 'pressure' ? x : pc + mp.rTube * qt; // FU-6 R7
```

#### Modify `packages/engine-core/src/l2/lung/lung.ts`

Edit 1 — find:

```ts
export function lungMechStep(ls: LungState, mode: 'flow' | 'pressure' | 'closed', x: number, dt: number): void {
```

replace with:

```ts
export function lungMechStep(ls: LungState, mode: 'flow' | 'pressure' | 'closed', x: number, dt: number, pLimit = Infinity): void { // FU-6 R7: pLimit
```

Edit 2 — find:

```ts
    mechSubstep(ls.mp, ls.mech, mode, x, dt / n);
```

replace with:

```ts
    mechSubstep(ls.mp, ls.mech, mode, x, dt / n, pLimit); // FU-6 R7
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
        ?? num('ie', v.ie, 0.5, 4) ?? num('fico2', v.fico2, 0, 30) ?? num('effort', v.effort, 0, 1);
```

replace with:

```ts
        ?? num('ie', v.ie, 0.5, 4) ?? num('fico2', v.fico2, 0, 30) ?? num('effort', v.effort, 0, 1) ?? num('pmax', v.pmax, 10, 80); // FU-6 R7
```

Edit 2 — find:

```ts
      if (v.source === 'ventilator') d.vent = { rr: v.rr ?? d.vent.rr, vt: v.vtMl ?? d.vent.vt, peep: v.peep ?? d.vent.peep, ie: v.ie ?? d.vent.ie };
```

replace with:

```ts
      if (v.source === 'ventilator') {
        d.vent = { rr: v.rr ?? d.vent.rr, vt: v.vtMl ?? d.vent.vt, peep: v.peep ?? d.vent.peep, ie: v.ie ?? d.vent.ie };
        const pmax = v.pmax ?? d.vent.pmax; // FU-6 R7 (absent = VCV_PMAX_DEFAULT; kept absent in snapshots that never set it)
        if (pmax !== undefined) d.vent.pmax = pmax;
      }
```

Edit 3 — find:

```ts
  if (c.mech) return { mode: 'flow', x: c.vt / Math.max(1e-3, c.ti) };
```

replace with:

```ts
  if (c.mech) {
    // FU-6 R7: volume control is a flow source limited at Pmax — the mechanics hold the airway AT Pmax in any sub-step
    // where the set flow would push it above (lung/mechanics.ts mechSubstep pLimit)
    return { mode: 'flow', x: c.vt / Math.max(1e-3, c.ti), pLimit: d.source === 'ventilator' ? (d.vent.pmax ?? VCV_PMAX_DEFAULT) : Infinity };
  }
```

Edit 4 — find:

```ts
export function lungDrive(rs: RespState, t: number): { mode: 'flow' | 'pressure'; x: number } {
```

replace with:

```ts
export function lungDrive(rs: RespState, t: number): { mode: 'flow' | 'pressure'; x: number; pLimit?: number } { // FU-6 R7: pLimit
```

Edit 5 — find:

```ts
    const ld = lungDrive(rs, t); // Stage 7b: mechanics at 250 Hz (4 sub-steps per sample)
    lungMechStep(rs.lung, ld.mode, ld.x, DT);
```

replace with:

```ts
    const ld = lungDrive(rs, t); // Stage 7b: mechanics at 250 Hz (4 sub-steps per sample)
    const wasInsp = rs.lung.inInsp;
    lungMechStep(rs.lung, ld.mode, ld.x, DT, ld.pLimit); // FU-6 R7: the VCV pressure limit
    if (wasInsp && !rs.lung.inInsp && rs.driver.source === 'ventilator') {
      // FU-6 R7: a pressure-limited breath delivers less than the set VT — the cycle carries what the lung received
      const c = cycleAt(rs.driver, t);
      const delivered = rs.lung.tidal.reduce((a, b) => a + b, 0);
      if (c && c.mech && c.exch && delivered < c.vt - 5) {
        c.vt = delivered;
        const f = alveolarFraction(delivered, physicalDeadSpace(rs)); // FU-6 R5: the capnogram follows the delivered breath
        if (f < 1) c.alvFrac = f;
      }
    }
```

Edit 6 — find:

```ts
  onVentFrame, planCycles, preoxActive, pruneCycles, replan, type DriverCtx, type DriverState,
} from './driver.ts';
```

replace with:

```ts
  onVentFrame, planCycles, preoxActive, pruneCycles, replan, VCV_PMAX_DEFAULT, alveolarFraction, type DriverCtx, type DriverState,
} from './driver.ts';
```

**Step 3b — F2: the two arms (Orchestrator ruling (FU-6 review), 2026-09-28; D18b).** Now that `pmax` exists, the rows
of Tasks 2 and 3 that measure the LUNG move to an unlimited arm (`pmax: 80`, as RS10 already uses) and each file gains
one row that measures the LIMIT itself: `Ppeak` within 0.5 of `VCV_PMAX_DEFAULT` **and** a delivered VT below the set VT.
A band is neither widened nor dropped by this (R45): the authored bands (Ppeak ≥ 40, PEEPi ≥ 8, −30 %/−50 %) are kept
and the arm they are measured on is stated — a pressure-limited breath reading exactly the limit was never evidence of a
severity. **Re-measure every title in both files on the unlimited arm** (expected: the prototype's unlimited numbers —
untreated 44.0 / 11.9, salbutamol → 23.3 / 2.2, adrenaline 22.0 then 39.9 at 10 min, sevoflurane → 23.9, ketamine
31.4 → 41.3, magnesium 37.7 → 36.5, asthma 21.2, COPD 22.9 — each ± the FU-4/V.1 re-measure).

#### Modify `packages/engine-core/test/engine/resp-bronchodilation.test.ts`

Edit 1 — find:

```ts
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';
```

replace with:

```ts
import { VCV_PMAX_DEFAULT } from '../../src/l2/resp/driver.ts'; // FU-6 F2: the limit's own row
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';
```

Edit 2 — find:

```ts
async function arm(drug: Record<string, unknown> | null, cond = 'bronchospasm', at = 900, vent: Record<string, number> = {}, spec: Record<string, unknown> = {}) {
```

replace with:

```ts
// FU-6 F2: the severity and the relative drug bands are measured UNLIMITED (pmax 80) — the default Pmax 40 would make
// every severe spasm read 40.0 whatever the lung does. The limit has its own row below.
async function arm(drug: Record<string, unknown> | null, cond = 'bronchospasm', at = 900, vent: Record<string, number> = { pmax: 80 }, spec: Record<string, unknown> = {}) {
```

Edit 3 — find:

```ts
  it('asthma reverses partly with salbutamol; COPD barely (37.0 → 21.3; 28.0 → 25.3)', async () => {
```

replace with:

```ts
  it('the default Pmax 40 is a LIMIT, not a severity reading: Ppeak pinned at VCV_PMAX_DEFAULT and the delivered VT below the set 500 mL (40.0 / 479 mL)', async () => {
    const e = rig6();
    await ventRig(e); // the factory default Pmax (no override)
    await runTo(e, 600);
    send(e, { kind: 'lungCondition', id: 'bronchospasm', severity: 1 });
    await runTo(e, 840);
    const w = await fineWindow(e, 900);
    const vt = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    console.log(`FU-6 F2 default Pmax: Ppeak ${w.peak.toFixed(1)} (limit ${VCV_PMAX_DEFAULT}), delivered VT ${vt.toFixed(0)} of 500`);
    expect(Math.abs(w.peak - VCV_PMAX_DEFAULT)).toBeLessThanOrEqual(0.5);
    expect(vt).toBeLessThan(500);
  });
  it('asthma reverses partly with salbutamol; COPD barely (37.0 → 21.3; 28.0 → 25.3)', async () => {
```

#### Modify `packages/engine-core/test/engine/resp-bronchospasm-one.test.ts`

Edit 1 — find:

```ts
async function spasm(cmds: Array<Record<string, unknown>>) {
  const e = rig6();
  await ventRig(e);
```

replace with:

```ts
// FU-6 F2: the three arms are compared UNLIMITED (pmax 80) — at the default Pmax 40 all three read 40.0 and the
// equality would hold for any severity above the limit. The limit's own row is Task 9's `resp-bronchodilation` row.
async function spasm(cmds: Array<Record<string, unknown>>) {
  const e = rig6();
  await ventRig(e, { pmax: 80 });
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-ga-state.test.ts', // FU-6 R4: three apnoea runs of 19 sim-min and a 40 sim-min ventilated run
```

replace with:

```ts
  'test/engine/resp-ga-state.test.ts', // FU-6 R4: three apnoea runs of 19 sim-min and a 40 sim-min ventilated run
  'test/engine/resp-vcv-pmax.test.ts', // FU-6 R7: two 10 sim-min near-fatal bronchospasm runs
```

- [ ] **Step 4: Run** the new engine test, `test/engine/resp-*.test.ts`, `test/engine/lung-*.test.ts` (7b's tension/COPD
  runs reach high pressures: a peak that now stops at 40 is REPORTED with its numbers — V.1's catalogue reference run
  uses its own pmax 120 and is a ventilator-package run), `test/engine/cpr-etco2.test.ts` (BVM: no Pmax), then
  `npx -y pnpm@9.15.9 --filter @pme/ventilator test` (V.1's link tests plus the new parity file). Expected: the parity
  file passes healthy; in bronchospasm it passes if V.1's absolute lungState and FU-4's R1 dead space are in (the audit's
  SpO2-0 divergence was the ×6 ratio × the inflated dead space); if a band is missed, `it.fails` with the numbers (R45)
  and the residual difference goes to the gate note (e.g. the link ventilator's own circuit compliance).
  **Measured on `94040f7` + every FU-6 task (no V.1; a real `pnpm install` in the applied tree — symlinked
  `node_modules` resolve `@pme/engine-core` to another checkout):** healthy at 10/20/30 min — PaCO2 link 46.5/49.1/50.4
  vs engine 45.0/47.0/47.9, EtCO2 42/44/45.7 vs 40/42/43, SpO2 99/99, VT 500 vs 494, **Ppeak 23.8 vs 16.8** (the one
  healthy miss: the link's circuit/tube pressure — V.1 Request); bronchospasm at 30 min — Ppeak 40 vs 40 (both at
  Pmax), VT **211 vs 476**, PaCO2 81.5 vs 56.7, SpO2 0 vs 99 (the ×6 resistance ratio V.1 Task 5 removes). Without the
  paralysis lines the engine side triggered (PaCO2 40.9) — D19.
- [ ] **Step 5: Commit and push** — `feat(vent): the internal VCV pressure-limits at Pmax; link parity (FU-6 R7)`.

### Task 10: R12 — the non-chemical drives: pain and arousal, PE hyperventilation, and a hypoxic response the anaesthetics depress first (lungs; 7f E-FU6-2; wiring PROTOTYPED, PE PROTOTYPED while finishing the plan)

**Files:**
- Modify (7f, **E-FU6-2**): `packages/engine-core/src/l2/neuro/drive.ts` (`HVR_*`, incl. `HVR_NMB_EMAX` /
  `HVR_NMB_TOFR_LO` — the residual-block arm of the Q-FU6-4 ruling, D21; `DriveInputs.stress`; `NeuroResp.pain`,
  `.hvrDep`), `packages/engine-core/src/l2/neuro/pipeline.ts` (`IDLE_RESP`; passes `d.stress`),
  `packages/engine-core/src/l2/neuro/spont.ts` (`pain`, `hvrDep`, `jDrive`)
- Modify: `packages/engine-core/src/l2/lung/drive.ts` (`J_PE_VE_FRAC`, `J_PE_RR`, F9's `HVR_INDEP_VE`; `hvrDep`,
  `jDrive` inputs; the hypoxic plateau)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (the PE severity reaches the drive)
- Modify: `packages/engine-core/test/l2/lung/drive-fu6.test.ts` (three `it`; the import line)
- Create: `packages/engine-core/test/engine/resp-drive-fu6.test.ts` (2 runs of ≤ 40 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R12, D4 cell, G1d, drive probe; D14):** pain was hard-wired off (`neuro/spont.ts:84` `pain: 0`): a noxious
stimulus under remifentanil + propofol left RR 5.57 → 5.54; the hypoxic response was one multiplicative factor under the
CO2 depression, never depressed by any drug (+8–13 % in every state; the peripheral response is the MORE
anaesthetic-sensitive arm — Knill & Gelb 1978 *Anesthesiology* 49:244; Dahan & Teppema 2003 *BJA* 91:40); massive PE
left the awake patient at PaCO2 41 (tachypnoea and hypocapnia from J-receptor and vascular-receptor drive are usual —
ESC 2019 PE guideline).

**Prototype (wiring):** drive probe (poikilocapnic, PaO2 → 56): awake +9 %, remifentanil 0.05 +6 %, propofol 1.07 µg/mL
+6 %, sevoflurane 0.75 MAC +6 % (was 8–13 % everywhere); D4 stimulus 1.5 at remi 0.1 + propofol 50: VE **+0.6 %** —
7f's antinociception (remi 2.5 ng/mL, antinoc 0.77) leaves stress ≈ 0.2 → RS5's "VE ≥ +20 %" stays `it.fails` (Q-FU6-5:
is the ventilatory arousal response blunted as much as the sympathetic one?). **PE (prototyped while finishing the plan,
all tasks applied to `94040f7`):** the first version (a ×(1 + 0.8·PE) multiplier on the chemical drive) gave RR 19.2 /
PaCO2 38.2 — a multiplier on a chemoreflex cannot push PaCO2 below its threshold; the J-receptor drive is therefore an
ADDED, non-chemical VE term with a rapid-shallow rate term: RR **27.2**, PaCO2 **30.0**, VE 18.0 L/min (base 14.9 /
39.0 / 7.4), SaO2 96.1 % (the PE hypoxaemia is FU-4's one-PE task). **F9 (Orchestrator ruling (FU-6 review),
2026-09-28; prototyped by the fixer on the applied tree):** the hypoxic arm gains a plateau BELOW the CO2 threshold
(D14b): PaO2 50 / PaCO2 30 → V̇E 3.06 L/min awake (was 0); propofol 2 mg/kg via SGA on air, long-apnoea draws (seeds 6,
12): apnoea 92 → 48 s, resuming at PaO2 42 (was 31); seed 7 and the opioid arms unchanged.

- [ ] **Step 1: The failing tests.**

#### Modify `packages/engine-core/test/l2/lung/drive-fu6.test.ts`

Edit 1 — find:

```ts
  it('apnoea below 10 % of resting VE, resuming above 15 % (hysteresis)', () => {
```

replace with:

```ts
  it('R12: pain and the PE J-receptor drive add ventilation; hvrDep removes the hypoxic arm only', () => {
    expect(drive({ ...X, pain: 1 }).ve).toBeCloseTo(6 * 1.3, 9); // PAIN_GAIN 0.3
    expect(drive({ ...X, jDrive: 1 }).ve).toBeCloseTo(6 * 3.4, 9); // J_PE_VE_FRAC 2.4 of the resting VE, ADDED
    expect(drive({ ...X, paco2: 30, jDrive: 1 }).ve).toBeCloseTo(6 * 2.4, 9); // non-chemical: persists below the CO2 threshold
    expect(drive({ ...X, jDrive: 1 }).rr).toBeGreaterThan(drive({ ...X, paco2: 44 }).rr); // rapid shallow at the same VE (+J_PE_RR)
    const hyp = { ...X, pao2: 50 };
    expect(drive(hyp).ve).toBeGreaterThan(1.5 * drive(X).ve);
    expect(drive({ ...hyp, hvrDep: 1 }).ve).toBeCloseTo(drive(X).ve, 9);
  });
  it('F9: hypoxia drives breathing BELOW the CO2 threshold — PaO2 50 with PaCO2 30 breathes on the hypoxic plateau', () => {
    const low = { ...X, paco2: 30, pao2: 50 }; // B = 36 awake: the CO2 fan is 0
    expect(drive({ ...X, paco2: 30 }).ve).toBe(0); // normoxic: apnoea below the threshold, as before
    expect(drive(low).ve).toBeCloseTo(HVR_INDEP_VE * 6 * (hypoxicFactor(50) - 1), 9); // ≈ 3.06 L/min, 0.51 × resting
    expect(drive({ ...low, wake: 1 }).ve).toBeGreaterThan(APNOEA_VE_IN * 6); // unconscious too (the plateau ignores B)
    expect(drive({ ...low, hvrDep: 1 }).ve).toBe(0); // a fully depressed carotid body: apnoea again
    expect(drive({ ...X, pao2: 50 }).ve).toBeCloseTo(6 * hypoxicFactor(50), 9); // above the threshold the fan governs: unchanged
  });
  it('apnoea below 10 % of resting VE, resuming above 15 % (hysteresis)', () => {
```

Edit 2 — find:

```ts
import { APNOEA_VE_IN, APNOEA_VE_OUT, drive, WAKE_MMHG, WAKE_QUANTILES, wakeShiftMmHg, type DriveInputs } from '../../../src/l2/lung/drive.ts';
```

replace with:

```ts
import { APNOEA_VE_IN, APNOEA_VE_OUT, drive, HVR_INDEP_VE, hypoxicFactor, WAKE_MMHG, WAKE_QUANTILES, wakeShiftMmHg, type DriveInputs } from '../../../src/l2/lung/drive.ts';
```

#### Create `packages/engine-core/test/engine/resp-drive-fu6.test.ts`

```ts
// FU-6 R12 (audit D4, G1d, drive probe; suite RS5, RS13; D14). Bands: 0.1 MAC volatile depresses the hypoxic response by
// ≥ 30 % while the CO2 response is almost untouched (Knill & Gelb 1978; Dahan & Teppema 2003: 30–70 %); a noxious
// stimulus 1.5 under remifentanil 0.1 + propofol 50 raises VE ≥ 20 % (RS5, Nunn ch. 5 — prototype +0.6 %: it.fails);
// massive PE (lung `pe` 1) in an awake spontaneously breathing patient: RR ≥ 25 and PaCO2 ≤ 35 on air (RS13, ESC 2019).
import { describe, expect, it } from 'vitest';
import { HVR_NMB_EMAX, neuroResp } from '../../src/l2/neuro/drive.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
const nr = (mac: number) => neuroResp({ vent: V0, macVolatile: mac, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });

describe('FU-6 R12: non-chemical drives', { timeout: 900_000 }, () => {
  it('0.1 MAC depresses the hypoxic response ≥ 30 % and the CO2 response < 5 % (hvrDep 0.45, hypnoticDep 0.015)', () => {
    expect(nr(0.1).hvrDep).toBeGreaterThanOrEqual(0.3);
    expect(nr(0.1).hypnoticDep).toBeLessThan(0.05);
    expect(nr(0).hvrDep).toBe(0);
  });
  it('R3(d) (D21, Q-FU6-4 ruled): a residual block blunts the hypoxic response by ≈ 30 % at TOFR 0.6–0.7 and not at all at TOFR 0.9 (Eriksson 1993; NN-08)', () => {
    const tofr = (t: number) => neuroResp({ vent: V0, macVolatile: 0, diaBlock: 0.1, tofr: t, di: 93, naturalAirway: false, wasApnoeic: false }).hvrDep;
    expect(tofr(0.7)).toBeCloseTo(HVR_NMB_EMAX, 6); // the sourced point: TOFR 0.7 → −30 %
    expect(tofr(0.6)).toBeCloseTo(HVR_NMB_EMAX, 6); // the ramp saturates below 0.7
    expect(tofr(0.9)).toBe(0); // recovered: no depression
  });
  it('propofol: a SEDATIVE Ce leaves the peripheral (hypoxic) arm nearly intact while the central arm is depressed; an anaesthetic Ce depresses it (F3b: Nieuwenhuijs 2001 found NO peripheral depression at 0.75–1.5 µg/mL)', () => {
    const prop = (ng: number) => neuroResp({ vent: { ...V0, propofol: ng }, macVolatile: 0, diaBlock: 0, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });
    expect(prop(1000).hvrDep).toBeLessThan(0.2); // 0.13 at 1.0 µg/mL
    expect(prop(1500).hvrDep).toBeLessThan(0.3); // 0.22 at 1.5 µg/mL — the top of Nieuwenhuijs's sedative range
    expect(prop(1000).hypnoticDep).toBeGreaterThan(2 * prop(1000).hvrDep); // the CENTRAL loop is the depressed one there
    expect(prop(4000).hvrDep).toBeGreaterThan(0.4); // 0.55 at an induction Ce (Blouin 1993)
  });
  it.fails('noxious stimulus 1.5 under remifentanil 0.1 + propofol 50 (SGA, FiO2 0.5): VE ≥ +20 % — prototype +0.6 % (7f antinoc 0.77)', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'sga' });
    send(e, { kind: 'ventilation', source: 'spontaneous', fio2: 0.5 });
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
    send(e, { kind: 'infusion', drugId: 'propofol', rate: 50, unit: 'mcg/kg/min' });
    await runTo(e, 1800);
    const ve0 = st6(e).resp.spont.ve as number;
    send(e, { kind: 'stimulus', intensity: 1.5 });
    await runTo(e, 1920);
    const ve1 = st6(e).resp.spont.ve as number;
    console.log(`FU-6 R12 stimulus: VE ${ve0.toFixed(2)} → ${ve1.toFixed(2)} L/min`);
    expect(ve1).toBeGreaterThanOrEqual(1.2 * ve0);
  });
  it('massive PE (lung pe 1), awake, air: RR ≥ 25 and PaCO2 ≤ 35 within 10 min (27.2 / 30.0; audit G1d RR 18.5, PaCO2 41)', async () => {
    const e = rig6();
    await runTo(e, 600);
    send(e, { kind: 'lungCondition', id: 'pe', severity: 1 });
    await runTo(e, 1200);
    const rs = st6(e).resp;
    console.log(`FU-6 R12 PE: RR ${rs.spont.rr.toFixed(1)}, PaCO2 ${rs.co2.pf.toFixed(1)}, SaO2 ${(rs.o2.sa * 100).toFixed(1)}`);
    expect(rs.spont.rr).toBeGreaterThanOrEqual(25);
    expect(rs.co2.pf).toBeLessThanOrEqual(35);
  });
});
```

(After FU-4 Task 11 the ONE PE command is `condition pe` with `lungCondition pe` its alias; either reaches `rs.lungSpecs`.)

- [ ] **Step 2: Run them; they fail** (no `hvrDep`, `jDrive`; the PE row does not reach the drive).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/neuro/drive.ts`

Edit 1 — find:

```ts
export const LOC_HI = 1.0;
```

replace with:

```ts
export const LOC_HI = 1.0;
/**
 * FU-6 R12: the hypoxic ventilatory response is the MORE anaesthetic-sensitive arm. VOLATILE (the arm the audit asked
 * for): Knill & Gelb, Anesthesiology 1978;49:244 — halothane/enflurane 0.1 MAC abolish most of it; Dahan & Teppema,
 * BJA 2003;91:40 — 0.1 MAC blunts it 30–70 %. Emax 0.9, C50 0.1 MAC.
 * PROPOFOL: contested at SEDATIVE doses — Nieuwenhuijs et al. 2001 (Anesthesiology 95:889, "absence of depression of the
 * peripheral chemoreflex loop by low-dose propofol") found NO peripheral (hypoxic) depression at 0.75–1.5 µg/mL while the
 * CENTRAL loop was depressed; reduced hypoxic responses appear at higher, anaesthetic concentrations (Blouin et al. 1993,
 * Anesthesiology 79:1177). [ENG] The C50 is therefore set at an ANAESTHETIC concentration — 3 × PROP_VENT_C50 ≈ 3.5 µg/mL
 * — so a sedative dose leaves the hypoxic arm nearly intact (hvrDep 0.13 at 1.0 µg/mL, 0.22 at 1.5, 0.55 at 4.0) while a
 * full induction dose depresses it; fit target: the isocapnic unit rows of Task 10.
 * Opioids and midazolam depress it as their CO2 depression [ENG sizes, directions sourced]. Sizes: Q-FU6-5 (Ali).
 */
export const HVR_VOL_C50 = 0.1;
export const HVR_VOL_EMAX = 0.9;
export const HVR_PROP_C50 = 3 * PROP_VENT_C50; // FU-6 F3b: an ANAESTHETIC C50 ≈ 3.5 µg/mL (was PROP_VENT_C50 / 3 = 0.39)
/**
 * FU-6 R3(d) (Q-FU6-4 ruled, D21 — the second half of that ruling; Task 5 Step 5 carries the first): a PARTIAL
 * neuromuscular block depresses the CAROTID hypoxic ventilatory response by ≈ 30 % at TOFR 0.7 (Eriksson, Sato &
 * Severinghaus 1993 Anesthesiology 78:693 — nicotinic receptors in the carotid body; the coverage matrix's NN-08).
 * It is a chemoreceptor effect, so unlike the obstruction arm it acts with a tube in place too. Ramp over TOFR 0.9 →
 * HVR_NMB_TOFR_LO, Emax 0.3 [ENG ramp, size sourced]. This is the ONLY NMB arm of `hvrDep` (Q-FU6-15 answered for the
 * residual-block range; FU-7 adds none).
 */
export const HVR_NMB_EMAX = 0.3;
export const HVR_NMB_TOFR_LO = 0.7;
```

Edit 2 — find:

```ts
  hypnotic?: number; // FU-6: depth.ts consciousness level (≥ 1 unconscious); absent = awake
}
```

replace with:

```ts
  hypnotic?: number; // FU-6: depth.ts consciousness level (≥ 1 unconscious); absent = awake
  stress?: number; // FU-6 R12: depth.ts `stress` = noxious stimulus × (1 − antinociception), 0–1; absent = 0
}
```

Edit 3 — find:

```ts
  loc: number; // FU-6 R3/R4: 0 awake … 1 unconscious (LOC_LO–LOC_HI ramp of the hypnotic level)
}
```

replace with:

```ts
  loc: number; // FU-6 R3/R4: 0 awake … 1 unconscious (LOC_LO–LOC_HI ramp of the hypnotic level)
  pain: number; // FU-6 R12: the nociceptive drive input to 7b's drive (depth.ts stress)
  hvrDep: number; // FU-6 R12: depression of the hypoxic ventilatory response (0–1)
}
```

Edit 4 — find:

```ts
  const loc = Math.max(0, Math.min(1, ((x.hypnotic ?? 0) - LOC_LO) / (LOC_HI - LOC_LO)));
```

replace with:

```ts
  const loc = Math.max(0, Math.min(1, ((x.hypnotic ?? 0) - LOC_LO) / (LOC_HI - LOC_LO)));
  // FU-6 R3(d) (D21, Eriksson 1993): a residual block blunts the carotid hypoxic response — with or without a tube
  const hvrNmb = HVR_NMB_EMAX * Math.max(0, Math.min(1, (0.9 - x.tofr) / (0.9 - HVR_NMB_TOFR_LO)));
  const hvrDep = 1 - (1 - HVR_VOL_EMAX * hill(x.macVolatile / HVR_VOL_C50, 1)) * (1 - hill(x.vent.propofol / HVR_PROP_C50, 1.5)) * (1 - dOp) * (1 - dMid) * (1 - hvrNmb);
```

Edit 5 — find:

```ts
    apnoea, pMaxMult: strength, obstruction, nmbVtMult: nmbVt, loc,
```

replace with:

```ts
    apnoea, pMaxMult: strength, obstruction, nmbVtMult: nmbVt, loc, pain: Math.max(0, Math.min(1, x.stress ?? 0)), hvrDep,
```

#### Modify `packages/engine-core/src/l2/neuro/pipeline.ts`

Edit 1 — find:

```ts
  loc: 0, // FU-6
```

replace with:

```ts
  loc: 0, pain: 0, hvrDep: 0, // FU-6
```

Edit 2 — find:

```ts
naturalAirway: natural, wasApnoeic, hypnotic: d.hypnotic }); // FU-6: consciousness reaches the drive
```

replace with:

```ts
naturalAirway: natural, wasApnoeic, hypnotic: d.hypnotic, stress: d.stress }); // FU-6: consciousness and nociception reach the drive
```

#### Modify `packages/engine-core/src/l2/lung/drive.ts`

Edit 1 — find:

```ts
export const PMUS_REST_CMH2O = 8;
```

replace with:

```ts
export const PMUS_REST_CMH2O = 8;
/**
 * FU-6 R12: J-receptor / pulmonary-vascular-receptor drive in acute PE — a NON-CHEMICAL ventilation term ADDED to the
 * chemoreflex (it persists below the CO2 threshold, which is why the awake PE patient is hypocapnic: PaCO2 30–35 —
 * ESC 2019 PE guideline; West, pathophysiology), with a rapid shallow pattern (J-receptor tachypnoea, like EVLWI's).
 * A MULTIPLIER on the chemical drive cannot do it: measured while writing (×1.8) RR 19.2 / PaCO2 38.2, and analytically
 * S(1+J)(P − B) = k/P keeps P above the threshold B ≈ 35 for any J. Massive PE doubles to triples the minute
 * ventilation (its alveolar dead space ≈ 0.5 halves the CO2 elimination). [ENG J_PE_VE_FRAC 2.4 of the resting VE and
 * J_PE_RR 4/min at severity 1; fit target RS13 "RR ≥ 25, PaCO2 ≤ 35 on air" — measured 27.2 / 30.0, VE 18 L/min;
 * 2.0/6 gave 27.6 / 34.8 (no margin), 0.8/8 gave 28.7 / 39.1 (rapid shallow breaths feed the dead space)]
 */
export const J_PE_VE_FRAC = 2.4;
export const J_PE_RR = 4;
/**
 * FU-6 F9 (Orchestrator ruling (FU-6 review), 2026-09-28): hypoxia drives breathing BELOW the CO2 threshold. The carotid
 * body's drive is not only a gain on the CO2 error: at a PCO2 under the apnoeic threshold a hypoxic subject's CO2
 * response does not fall to zero but flattens onto a PO2-dependent PLATEAU (the "dog-leg" of Nielsen & Smith 1952 Acta
 * Physiol Scand 24:293; Lumb, Nunn's Applied Respiratory Physiology 8e ch. 5), so a hypoxaemic patient whose PaCO2 sits
 * under the (post-induction, raised) threshold still breathes. The plateau is HVR_INDEP_VE × resting VE × (H(PaO2) − 1),
 * depressed by hvrDep exactly like the multiplicative arm, and the chemical drive is max(fan, plateau): above the
 * threshold the fan is larger, so every existing hypoxic-response band is unchanged; at normoxia the plateau is
 * < 0.02 × resting VE (below the apnoea threshold). [ENG 0.5; fit target: the unit row "PaO2 50 / PaCO2 30 breathes,
 * ≈ 0.5 × resting VE awake" and Task 10's engine row (a post-induction apnoea on air ends on hypoxia, not on CO2)]
 */
export const HVR_INDEP_VE = 0.5;
```

Edit 2 — find:

```ts
  load?: number; // FU-6 R3(b): 0–1 inspiratory (upper-airway) obstruction the effort works against; absent = 0
}
```

replace with:

```ts
  load?: number; // FU-6 R3(b): 0–1 inspiratory (upper-airway) obstruction the effort works against; absent = 0
  hvrDep?: number; // FU-6 R12: depression of the hypoxic response (0–1); absent = 0
  jDrive?: number; // FU-6 R12: J-/vascular-receptor drive (acute PE severity 0–1); absent = 0
}
```

Edit 3 — find:

```ts
  const chem = Math.max(0, s * (x.paco2 - b)) * hypoxicFactor(x.pao2);
```

replace with:

```ts
  const hvrKeep = 1 - (x.hvrDep ?? 0); // FU-6 R12: the anaesthetics depress the hypoxic arm first
  const fan = Math.max(0, s * (x.paco2 - b)) * (1 + (hypoxicFactor(x.pao2) - 1) * hvrKeep);
  const chem = Math.max(fan, HVR_INDEP_VE * x.ve0 * (hypoxicFactor(x.pao2) - 1) * hvrKeep); // FU-6 F9: the hypoxic plateau below the CO2 threshold
```

Edit 4 — find:

```ts
  let ve = chem * (1 - x.opioidDep) * (1 - x.hypnoticDep) * fatigue;
  if (ve > 0) ve *= 1 + PAIN_GAIN * x.pain;
```

replace with:

```ts
  // FU-6 R12: the PE J-receptor drive is ADDED (non-chemical: it persists below the CO2 threshold), depressed like the rest
  const jd = Math.min(1, x.jDrive ?? 0);
  let ve = (chem + J_PE_VE_FRAC * x.ve0 * jd) * (1 - x.opioidDep) * (1 - x.hypnoticDep) * fatigue;
  if (ve > 0) ve *= 1 + PAIN_GAIN * x.pain;
```

Edit 5 — find:

```ts
q ** (0.5 * (1 - (x.load ?? 0)))) + J_RR_PER_EVLWI * Math.max(0, x.evlwi - 10)));
```

replace with:

```ts
q ** (0.5 * (1 - (x.load ?? 0)))) + J_RR_PER_EVLWI * Math.max(0, x.evlwi - 10) + J_PE_RR * jd)); // FU-6 R12: PE tachypnoea
```

#### Modify `packages/engine-core/src/l2/neuro/spont.ts`

Edit 1 — find:

```ts
    opioidDep: n?.opioidDep ?? 0, hypnoticDep: n?.hypnoticDep ?? 0, pain: 0, evlwi: x.evlwi, vt0: x.vt0, rr0: x.rr0,
```

replace with:

```ts
    opioidDep: n?.opioidDep ?? 0, hypnoticDep: n?.hypnoticDep ?? 0, pain: n?.pain ?? 0, evlwi: x.evlwi, vt0: x.vt0, rr0: x.rr0, // FU-6 R12: pain
```

Edit 2 — find:

```ts
    load: Math.max(n?.obstruction ?? 0, x.airwayObs ?? 0), // FU-6 R3(b)
```

replace with:

```ts
    load: Math.max(n?.obstruction ?? 0, x.airwayObs ?? 0), // FU-6 R3(b)
    hvrDep: n?.hvrDep ?? 0, jDrive: x.jDrive ?? 0, // FU-6 R12
```

Edit 3 — find:

```ts
  airwayObs?: number; // FU-6 R3(b): the airway event's obstruction (1 = `obstructed`: laryngospasm, foreign body)
}
```

replace with:

```ts
  airwayObs?: number; // FU-6 R3(b): the airway event's obstruction (1 = `obstructed`: laryngospasm, foreign body)
  jDrive?: number; // FU-6 R12: acute PE severity (the lung's `pe` spec) — J-receptor drive
}
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
      ibwKg: rs.pat.ibwKg, airwayObs: d.airway === 'obstructed' ? 1 : 0, // FU-6 R3(b), R3(c)
```

replace with:

```ts
      ibwKg: rs.pat.ibwKg, airwayObs: d.airway === 'obstructed' ? 1 : 0, // FU-6 R3(b), R3(c)
      jDrive: Math.min(1, rs.lungSpecs.reduce((m, s) => (s.id === 'pe' ? Math.max(m, s.severity) : m), 0)), // FU-6 R12
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-vcv-pmax.test.ts', // FU-6 R7: two 10 sim-min near-fatal bronchospasm runs
```

replace with:

```ts
  'test/engine/resp-vcv-pmax.test.ts', // FU-6 R7: two 10 sim-min near-fatal bronchospasm runs
  'test/engine/resp-drive-fu6.test.ts', // FU-6 R12: a 32 sim-min stimulus run and a 20 sim-min PE run
```

- [ ] **Step 4: Run** the files, `test/l2/neuro`, `test/l2/lung` (7b's own drive unit rows — F9's max leaves them
  unchanged: 173/173 in the prototype), `test/engine/neuro-*.test.ts`, `test/engine/resp-*.test.ts` (including
  `resp-induction`: F9 shortens a long room-air apnoea — the seed-7 rows and the FiO2 0.5 20-seed row are unchanged by
  it in the prototype, 4/4 green), `test/engine/lung-*.test.ts` (7b's PE rows through the engine: `lung-circ`,
  `circ-sanity-2` H5), and
  `npx -y pnpm@9.15.9 run audit:respiratory probe drive` (record the table). PE: the awake numbers move with FU-4's R1 root
  and its one-PE task (the dead space and the PE row's own effects); if RS13's awake band is missed on the merged main,
  J_PE_VE_FRAC is [ENG] and names that band as its fit target (R45 rule 3: tune inside 1.5–3, i.e. VE 2.5–4× rest,
  record); outside it, `it.fails` with the numbers. PE lung rows in `lung-circ` and `circ-sanity-2` H5 run ventilated
  or paralysed: the J term must not move them (the prototype: green).
- [ ] **Step 5: Commit and push** — `feat(resp): pain, PE and a depressible hypoxic arm in the drive (FU-6 R12; E-FU6-2)`.

### Task 11: R9 — the internal ventilator's airway physics: a kinked tube is a resistance; the patient triggers (assist-control) and bucks under light anaesthesia (Stage 3 + lungs; PROTOTYPED while writing the plan)

**Files:**
- Modify: `packages/engine-core/src/l2/lung/mechanics.ts` (`MechState.pMus`: an active muscle pressure on the chest wall)
- Modify: `packages/engine-core/src/l2/resp/driver.ts` (`Cycle.buck`; `DriverCtx.triggerRr/buck`; the kinked
  mechanical cycle keeps flowing; the assist-control rate)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (`KINK_R_MULT`, `BUCK_*`; the kink in `applyLungSpecs`; the
  drive runs on the ventilator; `driverCtx`; the cough pressure into mechanics and the pleural input)
- Create: `packages/engine-core/test/engine/resp-trigger.test.ts` (3 runs of ≤ 10 sim-min → SLOW / `SLOW_B`)
- Modify (tests, **E-FU6-7**, rig re-derivations that keep their bands): `test/engine/lung-circ.test.ts`, `test/engine/pk-bus.test.ts`,
  `test/engine/endo-circ-acceptance.test.ts` (the septic check-16 rig is paralysed)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R9, E3, D3; RS9):** a kinked tube on VCV showed Paw = PEEP (the kink drove the lung in pressure mode at
PEEP: `pipeline.ts:219`) instead of a high peak with a Pmax alarm and a low exhaled VT; the drive ran only on a
spontaneous source, so a ventilated patient never triggered, bucked or breathed over the ventilator (D3 stayed at the
set RR 12 until extubation).

**Mechanisms:** (1) Kink = the tube resistance × (1 + 149·severity) while the airway is `obstructed` on the ventilator
(a complete kink × 150 [ENG, fit target RS9 "VT ≤ 20 %"]; × 30 was measured to still deliver 288 mL): with Task 9's Pmax the breath becomes a small, pressure-limited one — peak at Pmax,
exhaled VT small, capnogram flat (Task 8's alveolar fraction of the delivered VT). (2) Assist-control: in MODELED the
chemoreflex drive also runs on the ventilator; when its rate exceeds the set rate, the patient's rate triggers breaths
(the set VT is delivered each time) [the ventilator's trigger is ideal: no trigger delay]. (3) Bucking: an unparalysed
(strength > 0.5), lightly anaesthetised (loc < 0.5) and stimulated (7f stress > 0.2) patient coughs against the
mechanical breath: an expiratory muscle pressure of 30 cmH2O (half-sine over 0.5 s at the start of inspiration) on the
chest wall — cough alveolar pressures 50–100 cmH2O (McCool 2006 *Chest* 129:48S), 30 against a flow-driven breath
[ENG] — so the VCV hits Pmax (high-pressure alarm, small VT) and the heart sees the intrathoracic rise.

**Measured (every task applied to `94040f7`):** kink: peak **40.0**, delivered VT **67 mL** (4 mL before Task 9's limit
moved into the sub-step), displayed EtCO2 **0.0**, release VT 500; assist-control at a set rate of 6: **16** breaths/min
(PaCO2 42.4); bucking: peak 18.3 → **40.0** (the Pmax). The `driver.cycles` list is pruned to the last few cycles — count `breath` events, not cycles.

**RE-MEASURE AFTER FU-4 — the kink row's capnogram** (blocker F1). The 0.0 above was measured with VDs 204 mL, where a
67 mL breath is 0.33 × VD (below the ramp's 0.6 knee). With FU-4's physical VDs ≈ 127 mL the same breath is 0.53 × VD —
still below the knee, so the EXPECTED direction is "flat or nearly so", but the margin is gone: if the delivered VT comes
out above ≈ 76 mL the capnogram is no longer flat and the `< 5` assertion must become the measured number (and
`it.fails` if the band is missed). The mechanical assertion that carries the finding is the DELIVERED VT, not the
capnogram: keep `vtK ≤ 100` (and the Pmax row below) as the row's primary evidence and record the capnogram maximum with
its VDs in the title.

- [ ] **Step 1: The failing tests.**

#### Create `packages/engine-core/test/engine/resp-trigger.test.ts`

```ts
// FU-6 R9 (audit E3, D3; suite RS9 kink row; D11). Bands: kinked tube on VCV → peak ≥ Pmax − 0.5 and delivered VT
// ≤ 20 % of the set VT (RS9), displayed EtCO2 flat (< 5) within 30 s; release → VT back within 5 %. Assist-control: an
// unparalysed, unsedated patient on VCV 6/min breathes at his own rate (≥ 10 delivered breaths/min). Bucking: a
// stimulated, unsedated, unparalysed patient drives the peak ≥ 15 cmH2O above his resting peak (McCool 2006).
import { describe, expect, it } from 'vitest';
import { numSeries } from '../helpers/resp.ts';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

describe('FU-6 R9: kink, triggering, bucking (was Paw = PEEP; set RR only)', { timeout: 600_000 }, () => {
  it('kinked tube: Ppeak at Pmax, VT ≤ 100 mL, EtCO2 flat; release restores VT 500', async () => {
    const e = rig6();
    const ev: Array<Parameters<Parameters<typeof e.on>[0]>[0]> = [];
    e.on((x) => ev.push(x), ['measurement']);
    await ventRig(e);
    await runTo(e, 300);
    send(e, { kind: 'airway', state: 'obstructed' });
    await runTo(e, 330);
    const k = await fineWindow(e, 360);
    const vtK = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    const et = numSeries(ev as never, 'etco2', 330, 360).map(([, v]) => v).filter(Number.isFinite);
    send(e, { kind: 'airway', state: 'patent' });
    await runTo(e, 420);
    const vtR = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    console.log(`FU-6 R9 kink: peak ${k.peak.toFixed(1)}, VT ${vtK.toFixed(0)}, EtCO2 max ${Math.max(0, ...et).toFixed(1)}; release VT ${vtR.toFixed(0)}`);
    expect(k.peak).toBeGreaterThanOrEqual(39.5);
    expect(vtK).toBeLessThanOrEqual(100);
    expect(Math.max(0, ...et)).toBeLessThan(5);
    expect(Math.abs(vtR - 500)).toBeLessThanOrEqual(25);
  });
  it('assist-control: an unsedated, unparalysed patient on VCV 6/min breathes ≥ 10 times a minute', async () => {
    const e = rig6();
    const breaths: number[] = [];
    e.on((x) => { if (x.type === 'breath') breaths.push(x.t); }, ['breath']);
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 6, vtMl: 500, peep: 5, fio2: 0.5 });
    await runTo(e, 300);
    const n = breaths.filter((t) => t > 240 && t <= 300).length; // `driver.cycles` is pruned: count the breath events
    console.log(`FU-6 R9 triggering: ${n} breaths in the last minute at a set rate of 6`);
    expect(n).toBeGreaterThanOrEqual(10);
  });
  it('bucking: stimulated, unsedated, unparalysed on VCV 12 × 500 → Ppeak ≥ resting Ppeak + 15', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
    await runTo(e, 240);
    const rest = await fineWindow(e, 300);
    send(e, { kind: 'stimulus', intensity: 2 });
    const b = await fineWindow(e, 360);
    console.log(`FU-6 R9 bucking: resting peak ${rest.peak.toFixed(1)}, stimulated peak ${b.peak.toFixed(1)}`);
    expect(b.peak).toBeGreaterThanOrEqual(rest.peak + 15);
  });
});
```

- [ ] **Step 2: Run it; it fails** (kink peak 5 = PEEP; 6 breaths/min; no bucking).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/lung/mechanics.ts`

Edit 1 — find:

```ts
  pcar: number; // carina pressure
```

replace with:

```ts
  pcar: number; // carina pressure
  /** FU-6 R9: active respiratory-muscle pressure on the chest wall, cmH2O (+ expiratory: a cough/buck); absent = 0. */
  pMus?: number;
```

Edit 2 — find:

```ts
  const pcw = chestWallPressure(mp, ms);
```

replace with:

```ts
  const pcw = chestWallPressure(mp, ms) + (ms.pMus ?? 0); // FU-6 R9: a cough raises every unit's alveolar pressure
```

#### Modify `packages/engine-core/src/l2/resp/driver.ts`

Edit 1 — find:

```ts
  /** FU-6 R5: share of the alveolar plateau the sampled expirate reaches (absent = 1): alveolarFraction(VT, VDs). */
  alvFrac?: number;
}
```

replace with:

```ts
  /** FU-6 R5: share of the alveolar plateau the sampled expirate reaches (absent = 1): alveolarFraction(VT, VDs). */
  alvFrac?: number;
  /** FU-6 R9: the patient coughs against this mechanical breath (bucking). */
  buck?: boolean;
}
```

Edit 2 — find:

```ts
  /** FU-6 R5: series dead space (anatomical + apparatus, mL) for the sampled plateau; absent = full plateau. */
  vdSeriesMl?: number;
}
```

replace with:

```ts
  /** FU-6 R5: series dead space (anatomical + apparatus, mL) for the sampled plateau; absent = full plateau. */
  vdSeriesMl?: number;
  /** FU-6 R9: the MODELED drive's own rate while on the ventilator (assist-control trigger); absent/0 = none. */
  triggerRr?: number;
  /** FU-6 R9: the patient bucks (light, unparalysed, stimulated). */
  buck?: boolean;
}
```

Edit 3 — find:

```ts
    rr = src === 'bvm' ? Math.max(4, d.vent.rr) : d.vent.rr;
```

replace with:

```ts
    rr = src === 'bvm' ? Math.max(4, d.vent.rr) : Math.max(d.vent.rr, ctx.triggerRr ?? 0); // FU-6 R9: assist-control
```

Edit 4 — find:

```ts
    case 'obstructed': // efforts without flow (spontaneous) or a kinked tube (mechanical)
      c.exch = false;
```

replace with:

```ts
    case 'obstructed': // efforts without flow (spontaneous) or a kinked tube (mechanical)
      if (mech && src === 'ventilator') break; // FU-6 R9: a kinked tube is a resistance (pipeline), pressure-limited at Pmax
      c.exch = false;
```

Edit 5 — find:

```ts
  if (ctx.vdSeriesMl !== undefined) {
```

replace with:

```ts
  if (mech && src === 'ventilator' && ctx.buck) c.buck = true; // FU-6 R9
  if (ctx.vdSeriesMl !== undefined) {
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
/**
 * FU-6 R5 — ONE dead space (Orchestrator ruling (FU-6 review), 2026-09-28, blocker F1). The series dead space the
```

replace with:

```ts
/**
 * FU-6 R9: a kinked tube multiplies the tube resistance by 1 + (KINK_R_MULT − 1)·severity — a complete kink (severity 1)
 * × 150, so a 40 cmH2O Pmax moves ≤ 20 % of the set VT [ENG, fit target RS9 "VT ≤ 20 % delivered"; partial kinks scale].
 */
export const KINK_R_MULT = 150;
/** FU-6 R9: bucking — an expiratory muscle pressure (cmH2O) over the first BUCK_S of a mechanical inspiration [ENG; McCool 2006 Chest 129:48S]. */
export const BUCK_CMH2O = 30;
export const BUCK_S = 0.5;
/** FU-6 R9: the cough pressure of a bucking breath at time t (cmH2O, ≥ 0). */
function buckPressure(rs: RespState, t: number): number {
  const c = cycleAt(rs.driver, t);
  if (!c || !c.buck) return 0;
  const u = t - c.t0;
  return u < BUCK_S ? BUCK_CMH2O * Math.sin((Math.PI * u) / BUCK_S) : 0;
}
/**
 * FU-6 R5 — ONE dead space (Orchestrator ruling (FU-6 review), 2026-09-28, blocker F1). The series dead space the
```

Edit 2 — find:

```ts
    vdSeriesMl: physicalDeadSpace(rs), // FU-6 R5: ONE dead space — FU-4's physical VD, not a second expression
  };
```

replace with:

```ts
    vdSeriesMl: physicalDeadSpace(rs), // FU-6 R5: ONE dead space — FU-4's physical VD, not a second expression
    // FU-6 R9: assist-control and bucking — the MODELED drive runs on the ventilator too (gasStep)
    triggerRr: l1.mode === 'modeled' && rs.driver.source === 'ventilator' && (rs.spont?.rr ?? 0) > 0 ? (rs.spont as SpontDrive).rr : 0,
    buck: l1.mode === 'modeled' && rs.driver.source === 'ventilator' && !!n && n.pMaxMult > 0.5 && n.loc < 0.5 && n.pain > 0.2,
  };
```

Edit 3 — find:

```ts
  ls.lp = r.lp;
```

replace with:

```ts
  if (rs.driver.airway === 'obstructed' && rs.driver.source === 'ventilator') r.lp.rTube *= 1 + (KINK_R_MULT - 1) * Math.min(1, rs.driver.severity); // FU-6 R9: kinked tube
  ls.lp = r.lp;
```

**The `*=` does NOT compound (F10(11), verified by the reviewer).** `applyLungSpecs` re-resolves `r` from `resolveLung`
on every call, so `r.lp.rTube` is the catalogue's value each time and the ×150 is applied once per resolve — including on
the bronchodilation re-resolve path (Task 2: B moves ≥ 0.01). Keep it that way: if a later edit ever multiplies a
CARRIED-OVER `rs` tube resistance instead of a freshly resolved one, the kink compounds every 10 Hz step.

Edit 4 — find:

```ts
      withdraw(replan(d, t, true, true));
```

replace with:

```ts
      withdraw(replan(d, t, true, true));
      if (d.airway === 'obstructed') applyLungSpecs(rs); // FU-6 R9: a kink belongs to the ventilator's tube
```

Edit 5 — find:

```ts
  if (l1.mode === 'modeled' && d.source === 'spontaneous') { // Stage 7f: 7b's chemoreflex drive, 1 Hz (spont.ts)
```

replace with:

```ts
  if (l1.mode === 'modeled' && (d.source === 'spontaneous' || d.source === 'ventilator')) { // Stage 7f: 7b's chemoreflex drive, 1 Hz (spont.ts); FU-6 R9: also on the ventilator (triggering)
```

Edit 6 — find:

```ts
    const wasInsp = rs.lung.inInsp;
    lungMechStep(rs.lung, ld.mode, ld.x, DT, ld.pLimit); // FU-6 R7: the VCV pressure limit
```

replace with:

```ts
    const wasInsp = rs.lung.inInsp;
    const pb = buckPressure(rs, t); // FU-6 R9
    if (pb > 0) rs.lung.mech.pMus = pb;
    else delete rs.lung.mech.pMus;
    lungMechStep(rs.lung, ld.mode, ld.x, DT, ld.pLimit); // FU-6 R7: the VCV pressure limit
```

Edit 7 — find:

```ts
  return p + Math.max(0, lp.pPtx - rs.circPtx);
```

replace with:

```ts
  return p + Math.max(0, lp.pPtx - rs.circPtx) + (rs.lung.mech.pMus ?? 0) * CMH2O_TO_MMHG; // FU-6 R9: a cough raises the intrathoracic pressure
```

#### Modify `packages/engine-core/test/engine/lung-circ.test.ts`

Edit 1 — find:

```ts
      r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr, vtMl: 560, peep: 5, ie: 2, fio2: 0.4 }));
```

replace with:

```ts
      r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr, vtMl: 560, peep: 5, ie: 2, fio2: 0.4 }));
      // FU-6 R9 (E-FU6-7): a paralysed patient, as ventilated COPD is — since FU-6 an unparalysed, undrugged patient
      // triggers the ventilator at his own rate, which lifted the RR-10 arm's auto-PEEP (MAP difference 1.91 < 2)
      r.e.dispatch(ev3({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' }));
```

#### Modify `packages/engine-core/test/engine/pk-bus.test.ts`

Edit 1 — find:

```ts
  it.fails('Stage 3 alveolar ventilation at VT 500 × 12 exceeds 3 L/min (measured 2.82)', () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { ageY: 40 } });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
```

replace with (FU-4 Task 15 flips this title to `it(… was 2.82)`: keep FU-4's title line, add the two new lines):

```ts
  it.fails('Stage 3 alveolar ventilation at VT 500 × 12 exceeds 3 L/min (measured 2.82)', () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { ageY: 40 } });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    // FU-6 R9 (E-FU6-7): paralysed — an unparalysed patient triggers extra breaths since FU-6, which would "pass" this
    // dead-space check for the wrong reason (FU-4's R1 is what flips it). 1.2 mg/kg: the diaphragm is below the 5 %
    // trigger strength by 40 s (measured: 0.6 mg/kg still triggers at 60 s, strength 0.12 → VA 3.86)
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' } }));
```

#### Modify `packages/engine-core/test/engine/endo-circ-acceptance.test.ts`

Edit 1 — find:

```ts
    e.dispatch(vent(12));
    await run(e, 120);
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 600 }));
```

replace with:

```ts
    e.dispatch(vent(12));
    // FU-6 R9 (E-FU6-7): the check-16 patient is anaesthetised AND paralysed — since FU-6 an unparalysed patient on the
    // ventilator triggers at his own (septic, acidotic) drive: measured without this line warm MAP 54 / HR 115 / SVR 776,
    // cold SVR 1454; with it 60 / 132 / 851 and 1510 (main 61 / 131 / 861 and 1507) — every Q-7e-7 it.fails unchanged
    e.dispatch(ev3({ kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' }));
    e.dispatch(ev3({ kind: 'infusion', drugId: 'rocuronium', rate: 0.6, unit: 'mg/kg/h' }));
    await run(e, 120);
    e.dispatch(ev3({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm', rampS: 600 }));
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-drive-fu6.test.ts', // FU-6 R12: a 32 sim-min stimulus run and a 20 sim-min PE run
```

replace with:

```ts
  'test/engine/resp-drive-fu6.test.ts', // FU-6 R12: a 32 sim-min stimulus run and a 20 sim-min PE run
  'test/engine/resp-trigger.test.ts', // FU-6 R9: three ≤ 7 sim-min ventilator runs
```

- [ ] **Step 4: Run** the new file, then the tests the drive-on-the-ventilator change can move. **Measured while writing
  (Tasks 1–11 on a clean `4f4ce06` tree, fast set):** two rigs put an awake, unparalysed, undrugged patient on the
  ventilator and now see him trigger — `lung-circ.test.ts` COPD (MAP difference 1.91 < 2; with the rocuronium line
  above: MAP 101.3 → 99.1, CO 4.16 → 3.25, green) and `pk-bus.test.ts` "VA > 3 L/min" `it.fails` (it "passed" through
  triggering; with rocuronium 1.2 mg/kg (VA 2.76 from 40 s) it waits for FU-4's R1, whose pre-declared flip it is — the
  final applied-tree fast run showed that 0.6 mg/kg still triggered at 60 s). A third rig, found by the slow set on the
  final applied tree: `endo-circ-acceptance` sepsis (thermal GA + VCV, no drugs) triggered at its septic drive and moved
  every Q-7e-7 number (cold SVR 1507 → 1454 "passed" an `it.fails`); paralysed, it reads main's numbers ± 1. All three rig
  edits are above (E-FU6-7). Then: `test/engine/neuro-*.test.ts`
  (7f's emergence and curare-cleft rigs on the ventilator), `test/engine/organs-tbi*.test.ts` (7d's MODELED ventilated
  rigs: a triggered rate lowers PaCO2 and ICP — report, do not re-band; if a 7d band moves, the rig paralyses or sedates
  as its clinical scenario implies, a rig re-derivation under E-FU6-7), `test/engine/pk-acceptance-*.test.ts`,
  `test/engine/resp-*.test.ts`, `test/engine/circ-*.test.ts`, `test/engine/endo-*.test.ts`, and the audit's D3
  (`npx -y pnpm@9.15.9 run audit:respiratory D3`: the extubation rig now triggers as the block wears off). The kink row is
  also RS9's (Task 18). If assist-control makes a long MODELED run hyperventilate where it did not before, check its
  sedation first: an unsedated, unparalysed ventilated patient DOES breathe over the ventilator.
- [ ] **Step 5: Commit and push** — `feat(vent): kinked tube as a resistance; assist-control triggering and bucking under
  light anaesthesia (FU-6 R9)`.

### Task 12: R8 — inspired CO2 acts on PaCO2: rebreathing and an exhausted absorber raise the arterial CO2, not only the capnogram baseline (Stage 3; PROTOTYPED while writing the plan)

**Files:**
- Modify: `packages/engine-core/src/l2/gas/co2.ts` (`Co2Inputs.pico2`; the elimination term)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (passes the inspired PCO2 of exchanging breaths)
- Create: `packages/engine-core/test/l2/gas/inspired-co2.test.ts`, `packages/engine-core/test/engine/resp-inspired-co2.test.ts`
  (4 runs of 25 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R8, H1; RS14):** `gas/co2.ts:41` `elim = φ·VA·PaCO2/0.863` has no inspired term; `fico2` is read only by the
capnogram. FiCO2 8 mmHg for 20 min left PaCO2 46.6 = control. Physics: elimination = φ·VA·(PACO2 − PICO2)/0.863, so at
constant VA the steady-state PaCO2 rises by PICO2 (Nunn ch. 7), and the sympathetic response already in 7a's
`chemoFactors` (PaCO2 > 50) and 7e's adrenal drive follows.

**Measured (Tasks 1–8 + 12 on a clean `4f4ce06` tree):** FiCO2 8 for 20 min: PaCO2 47.1 → **52.7 (+5.7)**, EtCO2
42.0 → **47.0 (+5.0)** (was +0); the 12 h unit run reaches the +8 steady state.

- [ ] **Step 1: The failing tests.**

#### Create `packages/engine-core/test/l2/gas/inspired-co2.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createCo2State, stepCo2 } from '../../../src/l2/gas/co2.ts';

describe('FU-6 R8: inspired CO2 in the CO2 mass balance (Nunn ch. 7)', () => {
  it('at constant VA the steady-state PaCO2 rises by the inspired PCO2', () => {
    const x = { vaLpm: 4, vco2: 200, coRatio: 1, cf: 30, cs: 300, kfs: 20, extraGradient: 0 };
    const a = createCo2State(40);
    const b = createCo2State(40);
    // the slow store equilibrates with τ ≈ cs·(1/kfs + 0.863/VA) ≈ 80 min here: run 12 h (measured: 2 h reaches +6.37)
    for (let i = 0; i < 12 * 36000; i++) { stepCo2(a, x, 0.1); stepCo2(b, { ...x, pico2: 8 }, 0.1); }
    expect(b.pf - a.pf).toBeCloseTo(8, 1);
  });
});
```

#### Create `packages/engine-core/test/engine/resp-inspired-co2.test.ts`

```ts
// FU-6 R8 (audit H1; suite RS14): FiCO2 8 mmHg (exhausted absorber) for 20 min on a fixed VCV raises PaCO2 and EtCO2.
// RS14's proposed band +6–10 at 20 min is missed (measured +5.7 / +5.0: the body's slow CO2 store fills with τ ≈ 80 min,
// so 20 min is ≈ 70 % of the +8 steady state) → it.fails with the numbers (R45); the mechanism check (was +0) is an it.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

async function run(fico2: number) {
  const e = rig6();
  await ventRig(e);
  await runTo(e, 300);
  if (fico2 > 0) send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, fico2 });
  await runTo(e, 1500);
  return { pa: st6(e).resp.co2.pf as number, et: st6(e).resp.etco2 as number };
}

describe('FU-6 R8: rebreathing acts on PaCO2 (was 46.6 = control)', { timeout: 600_000 }, () => {
  it('FiCO2 8 for 20 min: PaCO2 and EtCO2 rise over control (mechanism present: > 3; measured +5.7 / +5.0)', async () => {
    const c = await run(0);
    const r = await run(8);
    console.log(`FU-6 R8: PaCO2 ${c.pa.toFixed(1)} → ${r.pa.toFixed(1)}, EtCO2 ${c.et.toFixed(1)} → ${r.et.toFixed(1)}`);
    expect(r.pa - c.pa).toBeGreaterThan(3);
    expect(r.et - c.et).toBeGreaterThan(3);
  });
  it.fails('RS14: FiCO2 8 for 20 min: PaCO2 and EtCO2 +6–10 over control — measured +5.7 / +5.0 (FU-6 R8)', async () => {
    const c = await run(0);
    const r = await run(8);
    expect(r.pa - c.pa).toBeGreaterThanOrEqual(6);
    expect(r.pa - c.pa).toBeLessThanOrEqual(10);
    expect(r.et - c.et).toBeGreaterThanOrEqual(6);
    expect(r.et - c.et).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run them; they fail** (PaCO2 equal to control).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/gas/co2.ts`

Edit 1 — find:

```ts
  extraGradient: number; // added Pa − Et (bronchospasm) mmHg
}
```

replace with:

```ts
  extraGradient: number; // added Pa − Et (bronchospasm) mmHg
  /** FU-6 R8: inspired PCO2 (mmHg) of the gas the breaths bring (rebreathing, exhausted absorber); absent = 0. */
  pico2?: number;
}
```

Edit 2 — find:

```ts
  const elim = (st.flow * x.vaLpm * st.pf) / K_CO2;
```

replace with:

```ts
  const elim = (st.flow * x.vaLpm * (st.pf - (x.pico2 ?? 0))) / K_CO2; // FU-6 R8: VA·(PACO2 − PICO2)/0.863 (Nunn ch. 7)
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
  stepCo2(rs.co2, { vaLpm: va * rs.lung.co2.e, vco2, coRatio: rs.coRatio, cf: rs.pat.cf, cs: rs.pat.cs, kfs: rs.pat.kfs, extraGradient: extraGradient(rs) }, GAS_DT_S);
```

replace with:

```ts
  stepCo2(rs.co2, { vaLpm: va * rs.lung.co2.e, vco2, coRatio: rs.coRatio, cf: rs.pat.cf, cs: rs.pat.cs, kfs: rs.pat.kfs, extraGradient: extraGradient(rs), pico2: d.fico2 }, GAS_DT_S); // FU-6 R8: the inspired CO2 of the breaths
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-trigger.test.ts', // FU-6 R9: three ≤ 7 sim-min ventilator runs
```

replace with:

```ts
  'test/engine/resp-trigger.test.ts', // FU-6 R9: three ≤ 7 sim-min ventilator runs
  'test/engine/resp-inspired-co2.test.ts', // FU-6 R8: four 25 sim-min rebreathing runs
```

- [ ] **Step 4: Run** the files, `test/l2/gas`, `test/engine/resp-capnogram.test.ts` (1d: the rebreathing baseline stays),
  `test/engine/resp-*.test.ts`. The spontaneous drive now answers rebreathing too (a MODELED spontaneous patient on an
  exhausted absorber hyperventilates) — record it in the gate note from `npx -y pnpm@9.15.9 run audit:respiratory H1`.
- [ ] **Step 5: Commit and push** — `feat(gas): inspired CO2 acts on PaCO2 (FU-6 R8)`.

### Task 13: R10 — pregnancy is more than mechanics: the progesterone set point and the higher VO2 (Stage 3 + 7f spont E-FU6-2; PROTOTYPED while writing the plan)

**Files:**
- Modify: `packages/engine-core/src/l2/gas/params.ts` (`PREG_PACO2_SHIFT_MMHG`, `PREG_VO2_TERM`)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (`pregnancy(rs)`; `metabolic`; the drive's set-point shift)
- Modify (7f, **E-FU6-2**): `packages/engine-core/src/l2/neuro/spont.ts` (`SpontInputs.setShift`)
- Create: `packages/engine-core/test/engine/resp-pregnancy.test.ts` (2 runs of ≤ 20 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R10, B4; D12; audit Q5 decided from the textbook):** the `pregnancy` row changes FRC, chest wall and airway
only: the awake term patient sat at PaCO2 41.7 (the row's own pitfall says her normal is ≈ 30) and her preoxygenated
apnoea to 90 % took 5.6–6.9 min (≈ 3–4 expected: FRC −20 %, VO2 +20–30 % roughly halve the safe time — McClelland,
Bogod & Hardman 2009 *Anaesthesia* 64:371). Hegewald & Crapo 2011 *Clin Chest Med* 32:1: progesterone drives PaCO2 to
28–32 mmHg at term (the chemoreflex set point, not the slope), VO2 +20–33 %.

**Mechanism:** the pregnancy severity s (the lung spec, 0.33/0.67/1 by trimester) lowers the MODELED drive's set point by
9·s mmHg (term 40 → 31) and raises VO2/VCO2 by 20·s % (`metabolic`, so the blood's VO2 demand and the apnoea O2 store
follow). FU-4's R1 root may give the resting pattern a patient-derived PaCO2 set point (Request 2): if it does, subtract
the shift THERE instead of in `setShift`, one place only. The renal HCO3 fall (≈ 20 mmol/L) and the ODC right shift are
7c's (Requests).

**Measured while writing (Tasks 1–13 on a clean `4f4ce06` tree):** awake term PaCO2 **31.2** (was 41.7); preoxygenated
apnoea to 90 % **4.83 min** (was 5.75 after Task 7; RS2 band 2.5–4.5 missed → `it.fails` with the number; the ODC shift
and a smaller pregnant FRC are 7c's / the catalogue's, Q-FU6-10).

- [ ] **Step 1: The failing test.**

#### Create `packages/engine-core/test/engine/resp-pregnancy.test.ts`

```ts
// FU-6 R10 (audit B4; suite RS2 pregnancy row; D12). Bands: awake term PaCO2 28–32 at 20 min (Hegewald & Crapo 2011);
// preoxygenated apnoea to SaO2 90 % without the thermal switch 2.5–4.5 min (RS2; McClelland 2009 ≈ half the
// non-pregnant 8 min).
import { describe, expect, it } from 'vitest';
import type { PatientProfile } from '../../src/types.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const TERM: PatientProfile = { ageY: 30, sex: 'F', weightKg: 70, heightCm: 165, lungConditions: [{ id: 'pregnancy', severity: 1 }] };

describe('FU-6 R10: pregnancy physiology (was PaCO2 41.7; apnoea 5.6–6.9 min)', { timeout: 600_000 }, () => {
  it('awake at term: PaCO2 28–32 at 20 min', async () => {
    const e = rig6(TERM);
    await runTo(e, 1200);
    const pa = st6(e).resp.co2.pf as number;
    console.log(`FU-6 R10 awake term PaCO2 ${pa.toFixed(1)}`);
    expect(pa).toBeGreaterThanOrEqual(28);
    expect(pa).toBeLessThanOrEqual(32);
  });
  it.fails('preoxygenated apnoea to SaO2 90 %: 2.5–4.5 min — measured 4.83 (was 5.75 after Task 7; FU-6 R10)', async () => {
    const e = rig6(TERM);
    await runTo(e, 60);
    send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
    await runTo(e, 240);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'ventilation', source: 'none' });
    let t90 = Infinity;
    await runTo(e, 240 + 600, (t) => { if (t90 === Infinity && st6(e).resp.o2.sa < 0.9) t90 = t; }, 1);
    const m = (t90 - 240) / 60;
    console.log(`FU-6 R10 term apnoea to 90 %: ${m.toFixed(2)} min`);
    expect(m).toBeGreaterThanOrEqual(2.5);
    expect(m).toBeLessThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run it; it fails** (PaCO2 ≈ 41; 5.75 min after Task 7).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/gas/params.ts`

Edit 1 — find:

```ts
export const GA_METABOLIC = 0.85;
```

replace with:

```ts
export const GA_METABOLIC = 0.85;
/**
 * FU-6 R10: term pregnancy — progesterone lowers the chemoreflex set point to PaCO2 28–32 (≈ −9 mmHg) and VO2 rises
 * 20–33 % (Hegewald & Crapo 2011 Clin Chest Med 32:1; McClelland, Bogod & Hardman 2009 Anaesthesia 64:371). Both scale
 * with the `pregnancy` lung condition's severity (0.33 / 0.67 / 1 by trimester) [TXT sizes at term; linear ENG].
 */
export const PREG_PACO2_SHIFT_MMHG = 9;
export const PREG_VO2_TERM = 0.2;
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, CO_REF_LPM, GA_METABOLIC, GAS_DT_S, gasPatient, PA_ET_GRADIENT, tempFactor, type GasPatient } from '../gas/params.ts';
```

replace with:

```ts
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, CO_REF_LPM, GA_METABOLIC, GAS_DT_S, gasPatient, PA_ET_GRADIENT, PREG_PACO2_SHIFT_MMHG, PREG_VO2_TERM, tempFactor, type GasPatient } from '../gas/params.ts';
```

(V.1 Task 1 adds `coRefLpm` to this import; keep it.)

Edit 2 — find:

```ts
  return tempFactor(rs.temp.tc) * (gas === 'o2' ? m.vo2F : m.vco2F) * rs.temp.extraX * (1 - (1 - GA_METABOLIC) * gaLevel(rs)); // FU-6 R4
}
```

replace with:

```ts
  return tempFactor(rs.temp.tc) * (gas === 'o2' ? m.vo2F : m.vco2F) * rs.temp.extraX * (1 - (1 - GA_METABOLIC) * gaLevel(rs)) * (1 + PREG_VO2_TERM * pregnancy(rs)); // FU-6 R4, R10
}

/** FU-6 R10: pregnancy severity (the `pregnancy` lung condition, 0–1). */
export function pregnancy(rs: RespState): number {
  return Math.min(1, rs.lungSpecs.reduce((m, s) => (s.id === 'pregnancy' ? Math.max(m, s.severity) : m), 0));
}
```

Edit 3 — find:

```ts
      ibwKg: rs.pat.ibwKg, airwayObs: d.airway === 'obstructed' ? 1 : 0, // FU-6 R3(b), R3(c)
```

replace with:

```ts
      ibwKg: rs.pat.ibwKg, airwayObs: d.airway === 'obstructed' ? 1 : 0, // FU-6 R3(b), R3(c)
      setShift: PREG_PACO2_SHIFT_MMHG * pregnancy(rs), // FU-6 R10: progesterone
```

#### Modify `packages/engine-core/src/l2/neuro/spont.ts`

Edit 1 — find:

```ts
  s.paco2Set = paco2SetPoint(s.paco2Rest, x.hco3);
```

replace with:

```ts
  s.paco2Set = paco2SetPoint(s.paco2Rest - (x.setShift ?? 0), x.hco3); // FU-6 R10: the pregnancy set point
```

Edit 2 — find:

```ts
  ibwKg?: number; // FU-6 R3(c): the VT ceiling's size (absent = 70)
```

replace with:

```ts
  ibwKg?: number; // FU-6 R3(c): the VT ceiling's size (absent = 70)
  setShift?: number; // FU-6 R10: mmHg subtracted from the resting set point (pregnancy's progesterone drive)
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-inspired-co2.test.ts', // FU-6 R8: four 25 sim-min rebreathing runs
```

replace with:

```ts
  'test/engine/resp-inspired-co2.test.ts', // FU-6 R8: four 25 sim-min rebreathing runs
  'test/engine/resp-pregnancy.test.ts', // FU-6 R10: a 20 sim-min awake run and a 14 sim-min apnoea run
```

- [ ] **Step 4: Run** the file, `test/engine/lung-frc.test.ts` (pregnancy FRC, unchanged), FU-3's pregnancy validation
  document through `npx -y pnpm@9.15.9 validate --suites sanity` (`t23-term-apnoea`; V.1 Task 10 re-ran it — record the
  new time), `test/engine/resp-*.test.ts`. PREG_PACO2_SHIFT_MMHG and PREG_VO2_TERM are [TXT] at term: if a band is missed
  the test becomes `it.fails` with the number (no tuning).
- [ ] **Step 5: Commit and push** — `feat(resp): pregnancy's set point and VO2 (FU-6 R10; E-FU6-2)`.

### Task 14: R11 — oxygen content reaches the circulation and CO poisoning clears: anaemia lowers viscosity (SVR) and the reflex raises HR/CO; COHb washes out faster on oxygen (7c E-FU6-4 + 7a E-FU6-3; PROTOTYPED while writing the plan)

**Files:**
- Modify (7c, **E-FU6-4**): `packages/engine-core/src/l2/blood/params.ts` (`BloodPatient.hbRef`),
  `packages/engine-core/src/l2/blood/circ-adapter.ts` (`VISC_EXP`, `setCircViscosity`),
  `packages/engine-core/src/l2/blood/core.ts` (`COHB_T_HALF_AIR_MIN`, `cohbWashout`; the step),
  `packages/engine-core/src/l2/blood/pipeline.ts` (writes the viscosity factor, MODELED)
- Modify (7a, **E-FU6-3**): `packages/engine-core/src/l2/circ/model.ts` (`ext.viscF` on the systemic resistance)
- Create: `packages/engine-core/test/l2/blood/cohb-washout.test.ts`, `packages/engine-core/test/engine/blood-anaemia-co.test.ts`
  (6 runs of ≤ 60 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R11, G2, G3; D13; audit Q8 decided):** at Hb 5 the patient kept CO 5.4 and HR 70 with DO2 one third and SvO2
42 % — no circulation or endocrine code reads CaO2 or Hb; COHb 30 % stayed 30 % for 60 min on FiO2 1 (dyshaemoglobins
come from the profile once, `blood/core.ts:77`).

**Mechanisms:** (1) Blood viscosity falls with the haematocrit, so SVR falls: SVR × (Hb/Hb_ref)^0.6 — Weiskopf 1998
*JAMA* 279:217 (acute isovolaemic Hb 14 → 5: SVR 1390 → 740, −47 %; HR 63 → 94; CI 2.9 → 4.8); (5/15)^0.6 = 0.52
[ENG exponent fit to Weiskopf's SVR]. 7a's baroreflex and venous return then raise HR and CO — no extra sympathetic
term (D13's O2-extraction drive is NOT needed; E-FU6-5 is withdrawn). MODELED only (MANUAL's trackers own the
haemodynamics). Hb_ref is the band's sex-normal Hb (adult 15 M / 13.5 F), so a default patient has factor 1 exactly.
(2) COHb washout: first order, t½ = 320 min × (95/PaO2)^0.8 — 320 min on air (PaO2 ≈ 95), 74 min at PaO2 ≈ 600 on
FiO2 1 (Weaver 2009 *NEJM* 360:1217) [ENG exponent 0.8 fit to both anchors].

**Measured (Tasks 1–14 on a clean `4f4ce06` tree):** Hb 5 vs 15 at 20 min: HR **70 → 109**, CO **5.54 → 6.89 (+24 %)**,
MAP 95 → 76, SvO2 49 %, lactate 1.02 (no rise); COHb 30 % after 60 min: air **26.7 %**, FiO2 1 **17.0 %**. The CO row
(+30 % proposal) is `it.fails` with +24 %: VISC_EXP is fitted to Weiskopf's SVR, not to CO, so it is not tuned.

**The HR band is TWO-SIDED (F5a; Orchestrator ruling (FU-6 review), 2026-09-28) and the split is a calibration row.**
Weiskopf 1998 reports HR 63 → 85 at Hb ≈ 5, i.e. **+35 %**, with CI +50–60 % and SVR −47 %. The model gives **+56 %** HR
and only **+24 %** CO: it OVERSHOOTS the rate while UNDERSHOOTING the flow, and a one-sided `hr ≥ 1.15 × control` can
never see that. The row therefore asserts 1.2–1.6 × control with the measured +56 % in its title, and the CO row stays
`it.fails` with its number. **Calibration row for the gate note (7a's, not FU-6's):** the viscosity term reaches HR and CO
ONLY through 7a's baroreflex, so the reflex supplies the whole compensation as rate; Weiskopf's compensation is shared
between stroke volume and rate. Candidate mechanism for the R44 pass: a lower viscosity also raises venous return and
therefore SV (a Frank–Starling share), so less of the CO rise has to come from rate — 7a calibration, explicitly NOT
tuned here (VISC_EXP is fitted to the SVR anchor).

- [ ] **Step 1: The failing tests.**

#### Create `packages/engine-core/test/l2/blood/cohb-washout.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { cohbWashout } from '../../../src/l2/blood/core.ts';

describe('FU-6 R11: COHb washout (Weaver 2009: t½ 320 min on air, 74 min on FiO2 1)', () => {
  it('halves in 320 min at PaO2 95 and in ≈ 74 min at PaO2 600', () => {
    let a = 0.3;
    let b = 0.3;
    for (let t = 0; t < 320 * 60; t++) a = cohbWashout(a, 95, 1);
    for (let t = 0; t < 74 * 60; t++) b = cohbWashout(b, 600, 1);
    expect(a).toBeCloseTo(0.15, 3);
    expect(b).toBeGreaterThan(0.14);
    expect(b).toBeLessThan(0.16);
  });
});
```

#### Create `packages/engine-core/test/engine/blood-anaemia-co.test.ts`

```ts
// FU-6 R11 (audit G2, G3; D13). Bands: Hb 5 vs Hb 15 (MODELED, awake, 20 min): CO ≥ +30 %, HR ≥ +15 % (Weiskopf 1998:
// CI +66 %, HR +49 % acutely; audit Q8 — "tachycardia and a high CO first"); COHb 30 %: on air 60 min → 24–29 %, on
// FiO2 1 60 min → 13–21 % (t½ 320 / 74 ± 15 min, Weaver 2009).
import { describe, expect, it } from 'vitest';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

async function anaemia(hb: number) {
  const e = rig6({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, blood: { hb } });
  await runTo(e, 1200);
  const s = st6(e);
  const b = s.hemo.circ.beats.slice(-10) as Array<{ t: number; map: number }>; // the modelled beats (st.hr is the instructor's ramp)
  const hr = (60 * (b.length - 1)) / ((b.at(-1)?.t ?? 1) - (b[0]?.t ?? 0));
  const map = b.reduce((a, x) => a + x.map, 0) / b.length;
  return { co: cardiacOutput(s.hemo, e.now().simT), hr, map, svo2: s.blood.core.o2.svo2 as number, lac: s.blood.out.lactate as number };
}

describe('FU-6 R11: O2 content reaches the circulation; CO clears', { timeout: 900_000 }, () => {
  it('Hb 5 vs 15: HR rises 20–60 % — TWO-SIDED against Weiskopf (63 → 85, +35 %); CO rises; no lactate rise (measured HR 70 → 109 = +56 %, CO 5.54 → 6.89, lactate 1.02; was unchanged)', async () => {
    const n = await anaemia(15);
    const a = await anaemia(5);
    console.log(`FU-6 R11 anaemia HR: ${n.hr.toFixed(0)} → ${a.hr.toFixed(0)} (${(100 * (a.hr / n.hr - 1)).toFixed(0)} %; Weiskopf +35 %), CO ${n.co.toFixed(2)} → ${a.co.toFixed(2)}`);
    // FU-6 F5a (Orchestrator ruling (FU-6 review), 2026-09-28): the band is two-sided. A one-sided "≥ +15 %" could never
    // see the model's OVERSHOOT — the whole compensation arrives through the baroreflex as rate, while Weiskopf's split is
    // SV + HR, so the model overshoots HR (+56 % vs +35 %) while undershooting CO (+24 % vs +66 %, the it.fails below).
    expect(a.hr).toBeGreaterThanOrEqual(1.2 * n.hr);
    expect(a.hr).toBeLessThanOrEqual(1.6 * n.hr);
    expect(a.co).toBeGreaterThan(1.1 * n.co);
    expect(a.lac).toBeLessThan(1.5);
  });
  it.fails('Hb 5 vs 15: CO ≥ +30 % (Weiskopf CI +66 %) — measured +24 % (FU-6 R11)', async () => {
    const n = await anaemia(15);
    const a = await anaemia(5);
    console.log(`FU-6 R11 anaemia: CO ${n.co.toFixed(2)} → ${a.co.toFixed(2)}, HR ${n.hr.toFixed(0)} → ${a.hr.toFixed(0)}, MAP ${n.map.toFixed(0)} → ${a.map.toFixed(0)}, SvO2 ${(a.svo2 * 100).toFixed(0)} %, lactate ${a.lac.toFixed(2)}`);
    expect(a.co).toBeGreaterThanOrEqual(1.3 * n.co);
  });
  it('COHb 30 %: 60 min on air 24–29 %, on FiO2 1 13–21 % (was 30 % flat)', async () => {
    const run = async (fio2: number) => {
      const e = rig6({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, blood: { cohb: 0.3 } });
      await runTo(e, 1);
      if (fio2 > 0.21) send(e, { kind: 'ventilation', source: 'spontaneous', fio2 });
      await runTo(e, 3601);
      return st6(e).blood.core.odc.cohb as number;
    };
    const air = await run(0.21);
    const o2 = await run(1);
    console.log(`FU-6 R11 COHb after 60 min: air ${(air * 100).toFixed(1)} %, FiO2 1 ${(o2 * 100).toFixed(1)} %`);
    expect(air).toBeGreaterThanOrEqual(0.24);
    expect(air).toBeLessThanOrEqual(0.29);
    expect(o2).toBeGreaterThanOrEqual(0.13);
    expect(o2).toBeLessThanOrEqual(0.21);
  });
});
```


- [ ] **Step 2: Run them; they fail** (no `cohbWashout`; CO/HR unchanged).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/blood/params.ts`

Edit 1 — find:

```ts
  hb: number; // g/dL
  plasmaMl: number;
```

replace with:

```ts
  hb: number; // g/dL
  hbRef: number; // FU-6 R11: the band's sex-normal Hb (g/dL), the viscosity reference
  plasmaMl: number;
```

Edit 2 — find:

```ts
  return { weightKg: w, bvMl: bv, hb, plasmaMl: plasma, isfMl: Math.max(0.5 * ecf, ecf - plasma), icfMl: (2 * tbw) / 3, vLacL: LACTATE_V_L_PER_KG * w, vo2Rest: 3.5 * w };
```

replace with:

```ts
  return { weightKg: w, bvMl: bv, hb, hbRef: female ? b.hbF : b.hbM, plasmaMl: plasma, isfMl: Math.max(0.5 * ecf, ecf - plasma), icfMl: (2 * tbw) / 3, vLacL: LACTATE_V_L_PER_KG * w, vo2Rest: 3.5 * w };
```

#### Modify `packages/engine-core/src/l2/blood/circ-adapter.ts`

Edit 1 — find:

```ts
/** 7a present: the chemistry contractility multiplier (7a's optional `ext.kChem`, written unconditionally; R50 F3). */
```

replace with:

```ts
/**
 * FU-6 R11 (E-FU6-4): blood viscosity follows the haematocrit, so the systemic resistance does: SVR × (Hb/Hb_ref)^0.6
 * (Weiskopf 1998 JAMA 279:217, acute isovolaemic Hb 14 → 5: SVR −47 %) [ENG exponent]; 7a's optional `ext.viscF`.
 */
export const VISC_EXP = 0.6;
export function setCircViscosity(c: CircLike, hbRel: number): void {
  c.ext.viscF = Math.max(0.2, hbRel) ** VISC_EXP;
}

/** 7a present: the chemistry contractility multiplier (7a's optional `ext.kChem`, written unconditionally; R50 F3). */
```

#### Modify `packages/engine-core/src/l2/blood/pipeline.ts`

Edit 1 — find:

```ts
import { applyL1Fallback, chemistryContractility, circOf, lungWaterStep, pulmCapPressure, pushCircVolume, setCircChemistry, volumeCoFactor } from './circ-adapter.ts';
```

replace with:

```ts
import { applyL1Fallback, chemistryContractility, circOf, lungWaterStep, pulmCapPressure, pushCircVolume, setCircChemistry, setCircViscosity, volumeCoFactor } from './circ-adapter.ts';
```

Edit 2 — find:

```ts
      setCircChemistry(circ, kChem);
```

replace with:

```ts
      setCircChemistry(circ, kChem);
      if (ctx.l1.mode === 'modeled') setCircViscosity(circ, c.odc.hb / c.pat.hbRef); // FU-6 R11 (MODELED: MANUAL's trackers own SVR)
```

#### Modify `packages/engine-core/src/l2/blood/core.ts`

Edit 1 — find:

```ts
export function createBloodCore(profile: PatientProfile | undefined, co0: number, paco2: number): BloodCore {
```

replace with:

```ts
/**
 * FU-6 R11 (E-FU6-4): COHb washout — first order, t½ = 320 min × (95/PaO2)^0.8: 320 min on air, ≈ 74 min on FiO2 1
 * (Weaver 2009 NEJM 360:1217) [ENG exponent fit to both anchors]. No ongoing exposure (the profile sets the load).
 */
export const COHB_T_HALF_AIR_MIN = 320;
export function cohbWashout(cohb: number, pao2: number, dtS: number): number {
  if (!(cohb > 0)) return cohb;
  const tHalfS = COHB_T_HALF_AIR_MIN * 60 * (95 / Math.max(20, pao2)) ** 0.8;
  return cohb * Math.exp((-Math.LN2 * dtS) / tHalfS);
}

export function createBloodCore(profile: PatientProfile | undefined, co0: number, paco2: number): BloodCore {
```

Edit 2 — find:

```ts
  bc.odc.hb = hbOf(fl);
```

replace with:

```ts
  bc.odc.hb = hbOf(fl);
  bc.odc.cohb = cohbWashout(bc.odc.cohb, x.pao2, dtS); // FU-6 R11
```

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
    kChem?: number; // 7c: blood-chemistry contractility multiplier (K, Ca, pH) on all four chambers, default 1
```

replace with:

```ts
    kChem?: number; // 7c: blood-chemistry contractility multiplier (K, Ca, pH) on all four chambers, default 1
    viscF?: number; // FU-6 R11 (7c): blood-viscosity factor on the systemic resistance, default 1
```

Edit 2 — find:

```ts
  p.rSys = (man.rSys ?? base.rSys) * b.svrF * de.svr * ch.svrF * (x.rSysF ?? 1) * (x.endoSvrF ?? 1);
```

replace with:

```ts
  p.rSys = (man.rSys ?? base.rSys) * b.svrF * de.svr * ch.svrF * (x.rSysF ?? 1) * (x.endoSvrF ?? 1) * (x.viscF ?? 1); // FU-6 R11: viscosity
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-pregnancy.test.ts', // FU-6 R10: a 20 sim-min awake run and a 14 sim-min apnoea run
```

replace with:

```ts
  'test/engine/resp-pregnancy.test.ts', // FU-6 R10: a 20 sim-min awake run and a 14 sim-min apnoea run
  'test/engine/blood-anaemia-co.test.ts', // FU-6 R11: four 20 sim-min anaemia runs and two 60 sim-min COHb runs
```

- [ ] **Step 4: Run** the files, `test/engine/blood-*.test.ts` (7c's haemorrhage/transfusion scenarios dilute Hb: SVR now
  falls with it — REPORT every moved number; a band moved by a physically correct term is not re-banded, it becomes
  `it.fails` with the number and a calibration row, R45), `test/engine/circ-*.test.ts`, `test/engine/endo-*.test.ts`,
  `test/engine/organs-*.test.ts`, `test/engine/blood-oxygen.test.ts`, `test/l2/resp/blood-view.test.ts`. The default
  patient's `viscF` must be exactly 1 (hb = hbRef): check `st.hemo.circ.ext.viscF` in one default run.
- [ ] **Step 5: Commit and push** — `feat(blood): anaemia lowers SVR through viscosity; COHb washes out (FU-6 R11;
  E-FU6-3, E-FU6-4)`.

### Task 15: R13 — volatile anaesthetics inhibit hypoxic pulmonary vasoconstriction (lungs; 7g data E-FU6-1; wiring PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/lung/lung.ts` (`GasInputs.hpvInhibit` replaces `volatileMac`),
  `packages/engine-core/src/l2/lung/perfusion.ts` (`perfusion(…, hpvInhibit)`)
- Modify: `packages/engine-core/src/l2/resp/pipeline.ts` (passes `ctx.hpvInhibit`, Task 2's context field)
- Modify (7g data, **E-FU6-1**): `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (`VOLATILE_HPV` on isoflurane and
  desflurane; sevoflurane already has it)
- Modify (test helper): `packages/engine-core/test/helpers/lung.ts` (`hpvInhibit: 0`)
- Create: `packages/engine-core/test/engine/lung-hpv-volatile.test.ts` (2 runs of 40 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R13, F3; D15):** 7g publishes `bus.hpvInhibit` (the sevoflurane row's 0.2 per MAC) that nothing reads — the
resp pipeline passed `volatileMac: 0` to the lung (`pipeline.ts:305`); isoflurane and desflurane had no HPV entry.
Volatiles below 1 MAC inhibit HPV by ≈ 20 % (Miller 10e ch. 49 p. 1538; catalogue §22; Slinger & Campos, Miller thoracic
chapter).

**Prototype (F3, OLV at FiO2 1, VT 350 × 16, GA rig):** sevoflurane to 0.53 MAC: PaO2 83 → **78** (−6 %), shunt 0.30 →
0.32 (was no change); PaCO2 89 (R1 confounds — FU-4 fixes it). Posture (lateral decubitus perfusion share) is NOT added:
a `position` field is a design change (Q-FU6-6).

- [ ] **Step 1: The failing test.**

#### Create `packages/engine-core/test/engine/lung-hpv-volatile.test.ts`

```ts
// FU-6 R13 (audit F3; suite RS12 sevoflurane row; D15): during one-lung ventilation at FiO2 1, sevoflurane toward 1 MAC
// lowers PaO2 by 5–20 % against the paired no-volatile run (HPV inhibition ≈ 20 % at < 1 MAC: Miller 10e ch. 49).
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

async function olv(sevo: boolean) {
  const e = rig6();
  await ventRig(e, { fio2: 1 });
  await runTo(e, 600);
  send(e, { kind: 'lungCondition', id: 'olv', severity: 1, side: 'R' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 350, peep: 5, fio2: 1 });
  await runTo(e, 1800);
  if (sevo) send(e, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6, n2oFrac: 0 });
  await runTo(e, 2400);
  return { pao2: st6(e).resp.o2.pao2 as number, mac: st6(e).pk.bus.cns?.macBrain ?? 0 };
}

describe('FU-6 R13: volatile HPV inhibition (was no change)', { timeout: 600_000 }, () => {
  it('sevoflurane toward 1 MAC during OLV at FiO2 1: PaO2 −5 to −20 % vs the paired control', async () => {
    const c = await olv(false);
    const s = await olv(true);
    const d = 1 - s.pao2 / c.pao2;
    console.log(`FU-6 R13 OLV: PaO2 ${c.pao2.toFixed(0)} → ${s.pao2.toFixed(0)} (−${(100 * d).toFixed(1)} %) at MAC ${s.mac.toFixed(2)}`);
    expect(d).toBeGreaterThanOrEqual(0.05);
    expect(d).toBeLessThanOrEqual(0.2);
  });
});
```

- [ ] **Step 2: Run it; it fails** (no PaO2 change).
- [ ] **Step 3: The code.**

#### Modify `packages/engine-core/src/l2/lung/lung.ts`

Edit 1 — find:

```ts
  volatileMac: number;
```

replace with:

```ts
  hpvInhibit: number; // FU-6 R13: 7g's bus.hpvInhibit (0–1)
```

Edit 2 — find:

```ts
  ls.perf = perfusion(lp.side, non, sidePao2, ls.hpv, x.volatileMac);
```

replace with:

```ts
  ls.perf = perfusion(lp.side, non, sidePao2, ls.hpv, x.hpvInhibit);
```

#### Modify `packages/engine-core/src/l2/lung/perfusion.ts`

Edit 1 — find:

```ts
 * Side flows. `nonAer` = non-aerated fraction per side, `pao2` = each side's alveolar PO2, `volatileMac` inhibits
 * HPV ×(1 − 0.2·MAC) (Miller 10e ch. 49 p. 1538, catalogue §22).
 */
export function perfusion(sp: SideParams[], nonAer: number[], pao2: number[], st: HpvState, volatileMac: number): Perfusion {
```

replace with:

```ts
 * Side flows. `nonAer` = non-aerated fraction per side, `pao2` = each side's alveolar PO2, `hpvInhibit` (0–1, 7g's
 * `bus.hpvInhibit`: volatiles 0.2 per MAC — Miller 10e ch. 49 p. 1538, catalogue §22 — and the nitrovasodilators)
 * scales HPV ×(1 − hpvInhibit) (FU-6 R13: was a `volatileMac` input the pipeline wired to 0).
 */
export function perfusion(sp: SideParams[], nonAer: number[], pao2: number[], st: HpvState, hpvInhibit: number): Perfusion {
```

Edit 2 — find:

```ts
    const act = Math.min(1.3, (st.a1[s] as number) + (st.a2[s] as number)) * Math.max(0, 1 - 0.2 * volatileMac);
```

replace with:

```ts
    const act = Math.min(1.3, (st.a1[s] as number) + (st.a2[s] as number)) * Math.max(0, 1 - hpvInhibit);
```

#### Modify `packages/engine-core/src/l2/resp/pipeline.ts`

Edit 1 — find:

```ts
    vo2: x.vo2, vco2, paco2: rs.co2.pf, tempC: x.tempC, bloodL: x.bloodL, coRatio: rs.coRatio, ga, indFactor: inductionFactor(rs.pat), volatileMac: 0, sideFlow: side,
```

replace with:

```ts
    vo2: x.vo2, vco2, paco2: rs.co2.pf, tempC: x.tempC, bloodL: x.bloodL, coRatio: rs.coRatio, ga, indFactor: inductionFactor(rs.pat), hpvInhibit: ctx.hpvInhibit ?? 0, sideFlow: side, // FU-6 R13
```

#### Modify `packages/engine-core/test/helpers/lung.ts`

Edit 1 — find:

```ts
        vco2, paco2: r.co2.pf, tempC: 37, bloodL: PAT.bloodL, coRatio: 1, ga: true, indFactor: 1, volatileMac: 0, sideFlow: null,
```

replace with:

```ts
        vco2, paco2: r.co2.pf, tempC: 37, bloodL: PAT.bloodL, coRatio: 1, ga: true, indFactor: 1, hpvInhibit: 0, sideFlow: null,
```

#### Modify `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`

Edit 1 — find:

```ts
const VOLATILE_GVHR: PdEffect = { target: 'gvHr', emax: -1, ec50: 1, linear: true };
```

replace with:

```ts
const VOLATILE_GVHR: PdEffect = { target: 'gvHr', emax: -1, ec50: 1, linear: true };

/**
 * FU-6 R13 (E-FU6-1): volatile inhibition of hypoxic pulmonary vasoconstriction, 0.2 per MAC, linear — the sevoflurane
 * row's value (Miller 10e ch. 49 p. 1538; catalogue §22: < 1 MAC inhibits HPV by ≈ 20 %; Slinger & Campos, Miller
 * thoracic chapter), now on isoflurane and desflurane too.
 */
const VOLATILE_HPV: PdEffect = { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true };
```

Edit 2 — find:

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 },
```

replace with:

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'bronchodilation', emax: 1, ec50: 0.5 },
      VOLATILE_HPV, // FU-6 R13
```

Edit 3 — find:

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'cbfVaso', emax: 0.3, ec50: 1, linear: true },
```

replace with:

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, VOLATILE_GVHR, { target: 'cbfVaso', emax: 0.3, ec50: 1, linear: true },
      VOLATILE_HPV, // FU-6 R13 (no bronchodilation row: desflurane irritates the airway above 1 MAC — Goff 2000 Anesthesiology 93:404)
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/blood-anaemia-co.test.ts', // FU-6 R11: four 20 sim-min anaemia runs and two 60 sim-min COHb runs
```

replace with:

```ts
  'test/engine/blood-anaemia-co.test.ts', // FU-6 R11: four 20 sim-min anaemia runs and two 60 sim-min COHb runs
  'test/engine/lung-hpv-volatile.test.ts', // FU-6 R13: two 40 sim-min OLV runs
```

- [ ] **Step 4: Run** the file, `test/engine/lung-unilateral.test.ts` (OLV nadir 88–96 %, shunt 0.2–0.3 at 30 min — no
  volatile in its rig: unchanged), `test/engine/lung-circ.test.ts` (OLV HPV ≤ 30 %), `test/l2/lung`, `test/l2/pk`,
  `test/engine/pk-*.test.ts` (7g's own row tests). If the 1 MAC band is missed, the entry's 0.2/MAC is [TXT] (no tuning):
  `it.fails` with the number.
- [ ] **Step 5: Commit and push** — `feat(lung): volatile anaesthetics inhibit HPV (FU-6 R13; E-FU6-1)`.

### Task 16: R14 — hypercapnia raises PVR; recruitment and induction atelectasis measured against their bands (7a E-FU6-3; PROTOTYPED while writing the plan)

**Files:**
- Modify (7a, **E-FU6-3**): `packages/engine-core/src/l2/circ/params.ts` (`K_PVR_CO2`), `packages/engine-core/src/l2/circ/model.ts`
  (the PVR lines)
- Create: `packages/engine-core/test/engine/lung-r14.test.ts` (4 runs of ≤ 45 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit R14, F1, F6, A3b):** (1) PaCO2 70 on permissive hypercapnia left PAP flat (18.8 → 19.7; +5 only once
hypoxaemic): no pulmonary-vascular response to CO2 anywhere in `circ/model.ts` (PVR = base × drug × ext × lung).
Hypercapnia and acidosis constrict the pulmonary vessels (Balanos 2003 *J Physiol*; audit: k ≈ 0.01–0.02 per mmHg).
Mechanism: PVR × (1 + 0.015·(PaCO2 − 40)₊) using 7a's own 1 Hz `chemo.paco2` (EtCO2 + 5) [ENG 0.015, inside the audit's
range], only while the instructor has not pinned PVR (`man.pvr === null`). (2) ARDS recruitment (F1: P/F 88 → 154 but
driving pressure 13.8 at every PEEP) and induction atelectasis (A3b: shunt 0.04 at FiO2 1 vs 8–10 % — Hedenstierna &
Edmark 2010; Rothen 1998) have their mechanisms in 7b (unit compliance ∝ aeration, `side.ts:65`; `ATEL_IND`); the audit
measured them weak. They are calibration rows for Ali (R44), written here as pre-declared `it.fails` with the audit's
numbers so the gate shows them; the executor flips any that FU-6's R4 (derived GA state) or FU-4's R1 now meets.

**Measured (Tasks 1–16 on a clean `4f4ce06` tree):** VCV 300 vs 500 × 12 at FiO2 0.8: PaCO2 47.7 → 91.9 (R1's dead
space: FU-4 lowers it), mean PAP **17.9 → 21.6 (+3.7)**, SaO2 100 %; ARDS (severity 1, recruitFrac 0.5) at PEEP 15:
driving pressure **13.1 → 11.7** after a 40 cmH2O × 30 s recruitment — RS11's direction is now met (the audit's 13.8 at
every PEEP was on main before FU-6's Tasks 7/9), so that row is an `it` with "was 13.8" in its title. **The flip is kept
only if the delivered-VT guard holds** (F2/F5c): the row runs at `pmax: 80` and asserts the delivered VT ≥ 0.95 × 420 mL,
because at Pplat 27.2 with the default Pmax a truncated breath would lower ΔP without any compliance gain; if the guard
fails, the row goes back to `it.fails` with both numbers. Induction at
FiO2 1: shunt **0.015** by 20 min (band ≥ 0.07) → stays `it.fails`, calibration row (`ATEL_IND`, catalogue §10).

- [ ] **Step 1: The tests.**

#### Create `packages/engine-core/test/engine/lung-r14.test.ts`

```ts
// FU-6 R14 (audit F1, F6, A3b; suite RS11). Bands: permissive hypercapnia (VCV 300 × 12 vs 500 × 12, PaCO2 +20–30):
// mean PAP +2 mmHg or more at 20 min (Balanos 2003; k 0.01–0.02/mmHg); ARDS high recruiter: driving pressure lower at
// PEEP 15 after recruitment than before (Gattinoni 2006, RS11); induction at FiO2 1.0: shunt ≥ 0.07 by 20 min
// (Hedenstierna & Edmark 2010: 8–10 %).
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

/** Mean pulmonary-artery pressure over [t0, t1] (7a's instantaneous `circOut.pPa`, sampled every 0.1 s). */
async function papMean(e: Parameters<typeof st6>[0], t0: number, t1: number): Promise<number> {
  await runTo(e, t0);
  let sum = 0;
  let n = 0;
  await runTo(e, t1, () => { sum += st6(e).hemo.circOut.pPa as number; n++; }, 0.1);
  return sum / Math.max(1, n);
}

describe('FU-6 R14', { timeout: 900_000 }, () => {
  it('permissive hypercapnia raises mean PAP ≥ 2 mmHg (17.9 → 21.6; was 18.8 → 19.7 at PaCO2 70)', async () => {
    const run = async (vt: number) => {
      const e = rig6();
      await ventRig(e, { fio2: 0.8 });
      await runTo(e, 300);
      send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: vt, peep: 5, fio2: 0.8 });
      const pap = await papMean(e, 1440, 1500);
      return { pap, pa: st6(e).resp.co2.pf as number, sa: st6(e).resp.o2.sa as number };
    };
    const c = await run(500);
    const h = await run(300);
    console.log(`FU-6 R14 hypercapnia: PaCO2 ${c.pa.toFixed(1)} → ${h.pa.toFixed(1)}, PAPm ${c.pap.toFixed(1)} → ${h.pap.toFixed(1)}, SaO2 ${(h.sa * 100).toFixed(0)}`);
    expect(h.sa).toBeGreaterThan(0.95); // FiO2 0.8 keeps hypoxic vasoconstriction out of the comparison
    expect(h.pap - c.pap).toBeGreaterThanOrEqual(2);
  });
  it('RS11: ARDS high recruiter — driving pressure lower at PEEP 15 after recruitment, with the delivered VT intact (13.1 → 11.7 at 420 mL; was 13.8 at every PEEP, audit F1)', async () => {
    const e = rig6({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, lungConditions: [{ id: 'ards', severity: 1, recruitFrac: 0.5 }] });
    // FU-6 F2/F5c (Orchestrator ruling (FU-6 review), 2026-09-28): unlimited arm + a delivered-VT guard. At Pplat 27.2
    // with the default Pmax 40 a pressure-limited breath could lower ΔP by delivering less volume, which is not the
    // compliance gain R14 asks for — and this row is a FLIP of a pre-declared `it.fails`, so its evidence must be clean.
    await ventRig(e, { rr: 20, vtMl: 420, fio2: 0.8, pmax: 80 });
    await runTo(e, 900);
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 20, vtMl: 420, peep: 15, fio2: 0.8, pmax: 80 });
    await runTo(e, 1500);
    const dp0 = st6(e).resp.lung.pInsp - st6(e).resp.lung.peepTot;
    send(e, { kind: 'recruit', pressureCmH2O: 40, durationS: 30 });
    await runTo(e, 2100);
    const dp1 = st6(e).resp.lung.pInsp - st6(e).resp.lung.peepTot;
    const vt1 = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    console.log(`FU-6 R14 ARDS driving pressure at PEEP 15: ${dp0.toFixed(1)} → ${dp1.toFixed(1)} after recruitment; delivered VT ${vt1.toFixed(0)} of 420`);
    expect(vt1).toBeGreaterThanOrEqual(0.95 * 420); // F5c: a truncated breath must not be read as a compliance gain
    expect(dp1).toBeLessThan(dp0 - 1);
  });
  it.fails('induction at FiO2 1.0 (no thermal switch): Qs/Qt ≥ 0.07 by 20 min — measured 0.015 (audit A3b: 0.02 → 0.04; calibration row)', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 1 });
    send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' });
    await runTo(e, 1200);
    const sh = st6(e).resp.lung.perf.shunt.reduce((a: number, b: number) => a + b, 0) / 2;
    console.log(`FU-6 R14 induction shunt at FiO2 1: ${sh.toFixed(3)}`);
    expect(sh).toBeGreaterThanOrEqual(0.07);
  });
});
```

(The shunt read is the lung's per-side perfusion shunt, `lung.perf.shunt`; `lungState.shunt` (which includes the base
shunt) is an equivalent read — record which one the gate note quotes.)

- [ ] **Step 2: Run it; the PVR row fails** (PAP flat).
- [ ] **Step 3: The code (PVR).**

#### Modify `packages/engine-core/src/l2/circ/params.ts`

Edit 1 — find:

```ts
export const SPONT_SWING_CMH2O = 4;
```

replace with:

```ts
export const SPONT_SWING_CMH2O = 4;
/**
 * FU-6 R14 (E-FU6-3): hypercapnic pulmonary vasoconstriction — PVR × (1 + K·(PaCO2 − 40)₊), K 0.015/mmHg (Balanos 2003
 * J Physiol; audit R14 "k ≈ 0.01–0.02 per mmHg") [ENG inside the sourced range]; PaCO2 from 7a's 1 Hz chemo input.
 */
export const K_PVR_CO2 = 0.015;
```

#### Modify `packages/engine-core/src/l2/circ/model.ts`

Edit 1 — find:

```ts
import { ATRIAL_DELAY_S, ATRIAL_T_S, DYSSYNC, H_S, P_PL0 } from './params.ts';
```

replace with:

```ts
import { ATRIAL_DELAY_S, ATRIAL_T_S, DYSSYNC, H_S, K_PVR_CO2, P_PL0 } from './params.ts';
```

Edit 2 — find:

```ts
  p.pvrL = base.pvrL * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungL ?? 1);
  p.pvrR = base.pvrR * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungR ?? 1);
```

replace with:

```ts
  // FU-6 R14: hypercapnic pulmonary vasoconstriction (not while the instructor pins PVR)
  const co2F = man.pvr === null ? 1 + K_PVR_CO2 * Math.max(0, m.chemo.paco2 - 40) : 1;
  p.pvrL = base.pvrL * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungL ?? 1) * co2F;
  p.pvrR = base.pvrR * de.pvr * m.ext.pvr * pvrF * lung * (m.ext.pvrLungR ?? 1) * co2F;
```

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/lung-hpv-volatile.test.ts', // FU-6 R13: two 40 sim-min OLV runs
```

replace with:

```ts
  'test/engine/lung-hpv-volatile.test.ts', // FU-6 R13: two 40 sim-min OLV runs
  'test/engine/lung-r14.test.ts', // FU-6 R14: two 25 sim-min hypercapnia runs, a 35 sim-min ARDS run, a 20 sim-min induction
```

- [ ] **Step 4: Run** the file, `test/engine/circ-*.test.ts` (7a's PVR-sensitive tests: H5 PE mPAP 30–45, RV infarct — a
  hypercapnic run now adds PVR: report), `test/engine/lung-circ.test.ts`, `packages/ventilator` `link-r36` (PH crisis
  EtCO2 +5.0 on the band edge: record, V.1 Decision 22), `test/engine/resp-*.test.ts`. If the ARDS or induction row now
  meets its band (FU-4's R1 and FU-6's R4 move both), flip it to `it` with "was …" in its title (R45).
- [ ] **Step 5: Commit and push** — `feat(circ): hypercapnia raises PVR; R14 lung rows measured (FU-6 R14; E-FU6-3)`.

### Task 17: R15 — the child's respiratory baseline after V.1 and FU-4, and the per-patient defaults (measurement; UNPROTOTYPED)

**Files:**
- Create: `packages/engine-core/test/engine/resp-child-baseline.test.ts` (2 runs of 15 sim-min → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)
- Modify (if a band flips): `packages/engine-core/test/engine/resp-ga-state.test.ts` (Task 7's child `it.fails`)

**Why (audit R15, B5, B6; RS2 child row):** the awake 4 y child showed PaCO2 49–52, displayed EtCO2 18–19, VT 590–706 mL
(the adult L1 defaults), lactate 1.0 → 3.5 in 15 min, and a displayed SpO2 lagging SaO2 by ≈ 60 s. V.1 Task 1 (E-V1-1)
fixes the CO-ratio reference (lactate, SpO2 lag, capnogram compression); FU-4's R1 root removes the MANUAL fit and
derives the resting pattern from the patient. FU-6 adds no child-specific code: this task measures what the three stages
leave and records the rest.

**Measured while writing (clean `4f4ce06` + FU-6 Tasks 1–16, no V.1/FU-4):** as-is — PaCO2 66 → 79, RR 45, VT 450–540,
SaO2 87 %, lactate 1.5 → 3.6 at 15 min (the R1 fit 400 mL + Task 5's VT ceiling: Task 0's STOP condition); R1-emulated
(fit 0, pattern 22 × 112) — PaCO2 44.8 → 43.5, RR 39 → 30, VT 196 → 148, SaO2 97.5 %, lactate 1.5 → 3.5 (the
CO-ratio defect V.1 fixes). Main's own R1-emulated child: PaCO2 43.3, lactate 3.5. Every task applied to `94040f7`
(the test below as written): PaCO2 **79.2**, VT 449 mL, RR 45, lactate 1.21 → 3.62; displayed SpO2 < 90 **66 s** after
SaO2 < 90 (+204 vs +270 s) — both rows fail there, as Task 0's STOP condition predicts; they are `it` because FU-4 and
V.1 are preconditions, and the executor applies R45 to what the merged main measures.

- [ ] **Step 1: The test** (bands: RS2 child row and the awake physiology of a 4 y child — Nunn, paediatric chapter:
  PaCO2 35–45, VT 6–8 mL/kg, no lactate rise at rest; displayed SpO2 lag ≤ 20 s behind SaO2).

#### Create `packages/engine-core/test/engine/resp-child-baseline.test.ts`

```ts
// FU-6 R15 (audit B5, B6; suite RS2 child row). After V.1 E-V1-1 and FU-4's R1 root: the awake 4 y 16 kg child breathes
// its own pattern at PaCO2 35–45 with VT 6–8 mL/kg (±30 %) and no lactate rise over 15 min; displayed SpO2 lags SaO2
// ≤ 20 s during a preoxygenated apnoea (RS2).
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

const CHILD = { ageY: 4, sex: 'M' as const, weightKg: 16, heightCm: 102 };

describe('FU-6 R15: the child baseline (was PaCO2 49–52, VT 590–706, lactate 1.0 → 3.5)', { timeout: 600_000 }, () => {
  it('awake: PaCO2 35–45, VT 4.2–10.4 mL/kg, lactate rise < 0.5 over 15 min', async () => {
    const e = rig6(CHILD);
    await runTo(e, 60);
    const lac0 = st6(e).blood.out.lactate as number;
    await runTo(e, 900);
    const rs = st6(e).resp;
    const lac1 = st6(e).blood.out.lactate as number;
    console.log(`FU-6 R15 child: PaCO2 ${rs.co2.pf.toFixed(1)}, VT ${rs.spont.vt.toFixed(0)} mL, RR ${rs.spont.rr.toFixed(1)}, lactate ${lac0.toFixed(2)} → ${lac1.toFixed(2)}`);
    expect(rs.co2.pf).toBeGreaterThanOrEqual(35);
    expect(rs.co2.pf).toBeLessThanOrEqual(45);
    expect(rs.spont.vt / 16).toBeGreaterThanOrEqual(4.2);
    expect(rs.spont.vt / 16).toBeLessThanOrEqual(10.4);
    expect(lac1 - lac0).toBeLessThan(0.5);
  });
  it('preoxygenated apnoea: displayed SpO2 < 90 no more than 20 s after SaO2 < 90', async () => {
    const e = rig6(CHILD);
    const spo2: Array<[number, number]> = [];
    e.on((x) => { if (x.type === 'measurement' && x.values.spo2?.value != null) spo2.push([x.t, x.values.spo2.value as number]); }, ['measurement']);
    await runTo(e, 60);
    send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
    await runTo(e, 240);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'ventilation', source: 'none' });
    let tSa = Infinity;
    await runTo(e, 840, (t) => { if (tSa === Infinity && st6(e).resp.o2.sa < 0.9) tSa = t; }, 1);
    const tSp = spo2.find(([t, v]) => t > 240 && v < 90)?.[0] ?? Infinity;
    console.log(`FU-6 R15 child apnoea: SaO2 < 90 at +${(tSa - 240).toFixed(0)} s, displayed SpO2 < 90 at +${(tSp - 240).toFixed(0)} s`);
    expect(tSp - tSa).toBeLessThanOrEqual(20);
  });
});
```

- [ ] **Step 2: Run it** on the merged tree with Tasks 1–16. Each missed band becomes `it.fails` with its number (R45)
  and one of: a request to V.1's owner (lactate, SpO2 lag — the CO ratio), to FU-4's R1 owner (PaCO2, VT — the
  per-patient resting pattern), or a calibration row (child GA FRC 8 mL/kg vs 30 awake: the catalogue's tuned value,
  Q-FU6-11). Re-run Task 7's child `it.fails` (Patel 2–3.2 min): flip it if met.

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/lung-r14.test.ts', // FU-6 R14: two 25 sim-min hypercapnia runs, a 35 sim-min ARDS run, a 20 sim-min induction
```

replace with:

```ts
  'test/engine/lung-r14.test.ts', // FU-6 R14: two 25 sim-min hypercapnia runs, a 35 sim-min ARDS run, a 20 sim-min induction
  'test/engine/resp-child-baseline.test.ts', // FU-6 R15: two 15 sim-min child runs
```

- [ ] **Step 3: Commit and push** — `test(resp): the child respiratory baseline after V.1 and FU-4 (FU-6 R15)`.

### Task 18: The respiratory scenario suite RS1–RS15 as SLOW tests — what the orchestrator inspects before Ali (tests; rows PROTOTYPED where stated)

**Files:**
- Create: `packages/engine-core/test/engine/resp-suite.test.ts` (15 rows, ≤ 30 sim-min each → SLOW / `SLOW_B`)
- Modify: `packages/engine-core/vite.config.ts` (one SLOW entry)

**Why (audit §6; the FU-6 ruling: "the audit's 15-scenario respiratory suite as SLOW tests"):** the task tests check one
mechanism each; the suite runs the audit's clinical scenarios end to end, all MODELED, adult 40 y 70 kg unless stated,
the GA state DERIVED (no hand-sent thermal event), and prints one `RS-ROW` line per scenario that Task 20 copies into the
gate note's suite table. Bands are the audit's §6 proposals (Ali decides them, §7); R45 applies row by row: a row the
mechanism misses is `it.fails` with its number in the title. RS15 (link parity) is the ventilator package's
`link-parity.test.ts` (Task 9) and is listed, not re-run, here.

**Measured (every FU-6 task applied to `94040f7`, no FU-4/V.1 — the file below as written; the executor re-measures
every row).** **Dead-space-dependent rows — re-measure FIRST, with the expected direction** (blocker F1; the capnogram's
VDs becomes FU-4's `physicalDeadSpace`, 204 → ≈ 127 mL for the 70 kg ventilated rig): **RS3b** (capnogram while VT < VD)
rises — a small breath now washes out proportionally MORE of the shorter dead space, so the 15.6 mmHg here goes UP and
the row stays `it.fails` unless the ramp is re-fitted (Q-FU6-12); **RS9**'s kink row: the 67 mL delivered breath is
0.53 × 127, so its capnogram is no longer certainly flat — assert the delivered VT and record the capnogram maximum;
**RS3**'s "display < 15 while VT < dead space" and **Task 11**'s flat-capnogram row are the two bands at risk; RS1's
PaCO₂/VD-VT and every EtCO₂ row move with FU-4's R1 root as Global Constraints already says. The pre-FU-4 numbers:
RS1 PaCO₂ 50.0, VD/VT 0.54 (fails: FU-4's R1, Task 0's precondition); RS2 adult 7.92 / obese 2.83;
RS2b pregnancy 4.83 / child 3.40 (`it.fails`); RS3 max RR 18.2, VT < 100 (apnoea) +54 s, SaO₂ < 90 +55 s; RS3b
capnogram 15.6 mmHg while VT < VD (`it.fails`); RS4 min SaO₂ 99.9 %, first BVM breath EtCO₂ 59.3 vs PaCO₂ 59.7; RS5
RR 4.0 at 0.2, naloxone → 7.3; RS5b RR 5.69 at 0.1, ΔPaCO₂ +15.01 (`it.fails`); RS6 RR 19.0 vs 14.7, VT 347 vs 491
at 0.88 MAC (`it.fails`); RS7 Ppeak 40.0 (the Pmax), PEEPi 11.5, α 148°, salbutamol → 23.4 / 2.3; RS7b SaO₂
99.8 → 99.5 (`it.fails`); RS8 swing −14.6 cmH₂O, pulsus 12.6 mmHg (`it.fails` on the swing); RS9 kink Ppeak 40.0,
VT 67 mL, capnogram 0.0 one breath after the disconnection (the numeric drops at +13 s); RS10 (Pmax 80) MAP
94.0 → 67.8, PEEPi 18.2; RS10b MAP 73.6 after the disconnection (`it.fails`); RS11 ΔP 13.1 → 11.9, Pplat 27.2; RS12
PaO₂ 81 → 75 with sevoflurane (−7.4 %), non-dependent flow 0.36 (posture: Q-FU6-6); RS13 awake RR 27.2 / PaCO₂ 30.0,
ventilated EtCO₂ 40.2 → 27.8, Pa–Et 33.6, mPAP 31.7; RS14 +5.9 / +5.1 (`it.fails`). Wall time of the file ≈ 5 min
(CI=1, M-series, alongside two other shards).

- [ ] **Step 1: Create the suite.**

#### Create `packages/engine-core/test/engine/resp-suite.test.ts`

```ts
// FU-6 Task 18: the respiratory scenario suite (research/09-respiratory-integration-audit.md §6, RS1–RS15). MODELED, adult
// 40 y 70 kg unless stated, the GA state derived (no thermal event). One RS-ROW line per row → the gate note's table.
// Bands are the audit's §6 proposals (Ali's §7 questions decide them); R45: a missed band is it.fails with its number.
import { describe, expect, it } from 'vitest';
import type { PatientProfile } from '../../src/types.ts';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { capnoAngles, mean, numSeries, read62 } from '../helpers/resp.ts';
import { VCV_PMAX_DEFAULT } from '../../src/l2/resp/driver.ts'; // FU-6 F2: the default-Pmax LIMIT rows (RS7c, RS11b)
import { ADULT6, fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

const row = (id: string, v: Record<string, number | string>) => console.log(`RS-ROW ${id} ${JSON.stringify(v)}`);
const WOMAN: PatientProfile = { ageY: 40, sex: 'F', weightKg: 60, heightCm: 165 };
const ETT = { kind: 'airwayDevice', device: 'ett' };
const vent = (o: Record<string, number> = {}) => ({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...o });
const roc = (mgkg = 1.2) => ({ kind: 'drug', drugId: 'rocuronium', dose: mgkg, unit: 'mg/kg', route: 'iv' });
const prop = (mgkg: number) => ({ kind: 'drug', drugId: 'propofol', dose: mgkg, unit: 'mg/kg', route: 'iv' });

async function apnoea90(p: PatientProfile): Promise<number> {
  const e = rig6(p);
  await runTo(e, 60);
  send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
  await runTo(e, 240);
  send(e, prop(2));
  send(e, roc(0.6));
  send(e, { kind: 'ventilation', source: 'none' });
  let t90 = Infinity;
  await runTo(e, 1140, (t) => { if (t90 === Infinity && st6(e).resp.o2.sa < 0.9) t90 = t; }, 1);
  return (t90 - 240) / 60;
}

describe('FU-6 respiratory suite (RS1–RS15)', { timeout: 1_800_000 }, () => {
  it('RS1 healthy intubated, VCV 12 × 7 mL/kg IBW, man and woman: PaCO2 35–42 at 30 min, VD/VT 0.25–0.4 (FU-4 R1 — 50.0 / 0.54 on 94040f7 without it: Task 0 STOP condition)', async () => {
    for (const [p, vt] of [[ADULT6, 490], [WOMAN, 400]] as Array<[PatientProfile, number]>) {
      const e = rig6(p);
      await runTo(e, 1);
      send(e, ETT);
      send(e, vent({ vtMl: vt }));
      send(e, prop(2));
      send(e, { kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
      send(e, roc());
      await runTo(e, 1800);
      const rs = st6(e).resp;
      const vdvt = 1 - (rs.vaLpm * 1000) / (12 * vt);
      row('RS1', { sex: p.sex ?? 'M', vt, paco2: +rs.co2.pf.toFixed(1), vdvt: +vdvt.toFixed(2), etco2: +rs.etco2.toFixed(1) });
      expect(rs.co2.pf).toBeGreaterThanOrEqual(35);
      expect(rs.co2.pf).toBeLessThanOrEqual(42);
      expect(vdvt).toBeGreaterThanOrEqual(0.25);
      expect(vdvt).toBeLessThanOrEqual(0.4);
    }
  });
  it('RS2 preoxygenated apnoea to SaO2 90 %: adult 6.5–9.5 (7.90), obese 2–3.5 (2.83)', async () => {
    const a = await apnoea90(ADULT6);
    const o = await apnoea90({ ...ADULT6, weightKg: 127 });
    row('RS2', { adult: +a.toFixed(2), obese: +o.toFixed(2) });
    expect(a).toBeGreaterThanOrEqual(6.5);
    expect(a).toBeLessThanOrEqual(9.5);
    expect(o).toBeGreaterThanOrEqual(2);
    expect(o).toBeLessThanOrEqual(3.5);
  });
  it.fails('RS2 pregnancy 2.5–4.5 (measured 4.83) and child 4 y 2–3.2 (measured 3.40)', async () => {
    const p = await apnoea90({ ageY: 30, sex: 'F', weightKg: 70, heightCm: 165, lungConditions: [{ id: 'pregnancy', severity: 1 }] });
    const c = await apnoea90({ ageY: 4, sex: 'M', weightKg: 16, heightCm: 102 });
    row('RS2b', { pregnancy: +p.toFixed(2), child: +c.toFixed(2) });
    expect(p).toBeLessThanOrEqual(4.5);
    expect(c).toBeLessThanOrEqual(3.2);
  });
  it('RS3 propofol 2 mg/kg, natural airway, air: RR ≤ 30, VT < 100 (or apnoea) within 60 s, SaO2 < 90 within 2 min (18.2 / +55 s / +55 s)', async () => {
    const e = rig6();
    await runTo(e, 300);
    send(e, prop(2));
    let maxRr = 0;
    let tVt = Infinity;
    let tSa = Infinity;
    await runTo(e, 600, (t) => {
      const rs = st6(e).resp;
      maxRr = Math.max(maxRr, rs.spont?.rr ?? 0);
      if (tVt === Infinity && rs.spont && rs.spont.vt < 100) tVt = t; // apnoea (VT 0) counts, as in Task 5's C4 test
      if (tSa === Infinity && rs.o2.sa < 0.9) tSa = t;
    }, 1);
    row('RS3', { maxRr: +maxRr.toFixed(1), vt100: tVt - 300, sa90: tSa - 300 });
    expect(maxRr).toBeLessThanOrEqual(30);
    expect(tVt - 300).toBeLessThanOrEqual(60);
    expect(tSa - 300).toBeLessThanOrEqual(120);
  });
  it.fails('RS3 capnogram < 15 mmHg while VT < dead space (from 10 s after the first such breath) — measured 15.6 on 94040f7 (the Fowler ramp: VT 0.6–1.4 × VD shows a partial plateau; Q-FU6-12)', async () => {
    const e = rig6();
    await runTo(e, 300);
    send(e, prop(2));
    let tBelow = Infinity;
    let waveMax = 0;
    await runTo(e, 600, (t) => {
      const rs = st6(e).resp;
      if (tBelow === Infinity && rs.spont && rs.spont.rr > 0 && rs.spont.vt < rs.pat.deadSpaceMl) tBelow = t;
      if (t >= tBelow + 10) waveMax = Math.max(waveMax, ...read62(e, 'co2', t - 1, t)); // the waveform: the numeric's hold is FU-5's (D10)
    }, 1);
    row('RS3b', { vtBelowVdAt: tBelow - 300, capnoMax: +waveMax.toFixed(1) });
    expect(waveMax).toBeLessThan(15);
  });
  it('RS4 full induction (preox → propofol + roc → 3 min no ventilation → BVM): SaO2 ≥ 95 through the apnoea; the first BVM breath EtCO2 = PaCO2 ± 5 (99.9 %; 59.3 vs 59.7)', async () => {
    const e = rig6();
    const bvm: Array<{ t: number; et: number }> = [];
    e.on((x) => { if (x.type === 'breath' && x.kind === 'bvm') bvm.push({ t: x.t, et: x.etco2True }); }, ['breath']);
    await runTo(e, 120);
    send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
    await runTo(e, 300);
    send(e, prop(2));
    send(e, roc(0.6));
    send(e, { kind: 'ventilation', source: 'none' });
    let minSa = 1;
    await runTo(e, 480, () => { minSa = Math.min(minSa, st6(e).resp.o2.sa); }, 1);
    const pa = st6(e).resp.co2.pf as number;
    send(e, { kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 500, fio2: 1 });
    await runTo(e, 500);
    const et1 = bvm.find((b) => b.t >= 480)?.et ?? Number.NaN; // the first breath (the true EtCO2 10 s later has washed out: 48.4)
    row('RS4', { minSaO2: +(minSa * 100).toFixed(1), paco2AtBvm: +pa.toFixed(1), firstEt: +et1.toFixed(1) });
    expect(minSa).toBeGreaterThanOrEqual(0.95);
    expect(Math.abs(et1 - pa)).toBeLessThanOrEqual(5);
  });
  it('RS5 remifentanil 0.2 µg/kg/min awake: RR ≤ 6; naloxone 0.1 mg: RR +3 within 2 min (4.0 → 7.3)', async () => {
    const e = rig6();
    await runTo(e, 300);
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
    await runTo(e, 900);
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.2, unit: 'mcg/kg/min' });
    await runTo(e, 1500);
    const rr2 = st6(e).resp.spont.rr as number;
    send(e, { kind: 'drug', drugId: 'naloxone', dose: 0.1, unit: 'mg', route: 'iv' });
    await runTo(e, 1620);
    const rr3 = st6(e).resp.spont.rr as number;
    row('RS5', { rr02: +rr2.toFixed(1), rrNaloxone: +rr3.toFixed(1) });
    expect(rr2).toBeLessThanOrEqual(6);
    expect(rr3 - rr2).toBeGreaterThanOrEqual(3);
  });
  it.fails('RS5 remifentanil 0.1 awake: RR 6–10 and, at 0.2, PaCO2 +5–15 — measured RR 5.7 (audit D1 5.6: 7f/7g opioid rate depression, calibration row) and +15.0 (band edge) on 94040f7', async () => {
    const e = rig6();
    await runTo(e, 300);
    const pa0 = st6(e).resp.co2.pf as number;
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
    await runTo(e, 900);
    const rr1 = st6(e).resp.spont.rr as number;
    send(e, { kind: 'infusion', drugId: 'remifentanil', rate: 0.2, unit: 'mcg/kg/min' });
    await runTo(e, 1500);
    const dPa = (st6(e).resp.co2.pf as number) - pa0;
    row('RS5b', { rr01: +rr1.toFixed(2), dPaco2: +dPa.toFixed(2) });
    expect(rr1).toBeGreaterThanOrEqual(6);
    expect(rr1).toBeLessThanOrEqual(10);
    expect(dPa).toBeGreaterThanOrEqual(5);
    expect(dPa).toBeLessThanOrEqual(15);
  });
  it.fails('RS6 sevoflurane via SGA to ≈ 1 MAC: RR ≥ 1.4× awake and VT ≤ 0.7× awake — measured RR 19.0 vs 14.7 (1.29×), VT 0.71× at 0.88 MAC on 94040f7 (D2 "tachypnoea too weak", Q-FU6-7)', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'sga' });
    send(e, { kind: 'ventilation', source: 'spontaneous', fio2: 0.5 });
    await runTo(e, 290);
    const rr0 = st6(e).resp.spont.rr as number;
    const vt0 = st6(e).resp.spont.vt as number;
    send(e, prop(2));
    send(e, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6, n2oFrac: 0 });
    await runTo(e, 1500);
    const rs = st6(e).resp;
    row('RS6', { rr0: +rr0.toFixed(1), rr: +rs.spont.rr.toFixed(1), vt0: Math.round(vt0), vt: Math.round(rs.spont.vt), paco2: +rs.co2.pf.toFixed(1), mac: +(st6(e).pk.bus.cns?.macBrain ?? 0).toFixed(2) });
    expect(rs.spont.rr).toBeGreaterThanOrEqual(1.4 * rr0);
    expect(rs.spont.vt).toBeLessThanOrEqual(0.7 * vt0);
  });
  it('RS7 severe bronchospasm on VCV (one event), UNLIMITED arm (pmax 80 — F2): Ppeak ≥ 40, PEEPi ≥ 8, α ≥ 140°; salbutamol within 10 min: Ppeak −30 %, PEEPi −50 %', async () => {
    const e = rig6();
    await ventRig(e, { pmax: 80 }); // FU-6 F2: at the default Pmax 40 the peak reads the limit, not the lung
    await runTo(e, 600);
    send(e, { kind: 'airway', state: 'bronchospasm', severity: 1 });
    await runTo(e, 840);
    const w0 = await fineWindow(e, 900);
    const ap0 = st6(e).resp.lung.peepTot - 5;
    const alpha = mean(capnoAngles(read62(e, 'co2', 860, 900)).map((x) => x.alpha));
    send(e, { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' });
    await runTo(e, 1440);
    const w1 = await fineWindow(e, 1500);
    const ap1 = st6(e).resp.lung.peepTot - 5;
    row('RS7', { peak: +w0.peak.toFixed(1), autoPeep: +ap0.toFixed(1), alpha: +alpha.toFixed(0), peakSalb: +w1.peak.toFixed(1), autoPeepSalb: +ap1.toFixed(1) });
    expect(w0.peak).toBeGreaterThanOrEqual(40);
    expect(ap0).toBeGreaterThanOrEqual(8);
    expect(alpha).toBeGreaterThanOrEqual(140);
    expect(w1.peak).toBeLessThanOrEqual(0.7 * w0.peak);
    expect(ap1).toBeLessThanOrEqual(0.5 * ap0);
  });
  it('RS7c the same spasm at the DEFAULT Pmax 40 is pressure-limited: Ppeak pinned within 0.5 of the limit and the delivered VT below the set 500 mL (40.0 / 479 mL) — what a Pmax alarm teaches (F2)', async () => {
    const e = rig6();
    await ventRig(e); // the factory default Pmax
    await runTo(e, 600);
    send(e, { kind: 'airway', state: 'bronchospasm', severity: 1 });
    await runTo(e, 840);
    const w = await fineWindow(e, 900);
    const vt = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    const pmax = st6(e).resp.driver.vent.pmax ?? VCV_PMAX_DEFAULT;
    row('RS7c', { peak: +w.peak.toFixed(1), pmax, deliveredVt: Math.round(vt) });
    expect(Math.abs(w.peak - pmax)).toBeLessThanOrEqual(0.5);
    expect(vt).toBeLessThan(500);
  });
  it.fails('RS7 SaO2 falls ≥ 4 in untreated severe bronchospasm at FiO2 0.5 — measured 99.8 → 99.5 on 94040f7 (re-measure after FU-4 R1)', async () => {
    const e = rig6();
    await ventRig(e);
    await runTo(e, 600);
    const sa0 = st6(e).resp.o2.sa as number;
    send(e, { kind: 'airway', state: 'bronchospasm', severity: 1 });
    await runTo(e, 1500);
    const sa1 = st6(e).resp.o2.sa as number;
    row('RS7b', { sao2: +(sa0 * 100).toFixed(1), sao2Spasm: +(sa1 * 100).toFixed(1) });
    expect(sa0 - sa1).toBeGreaterThanOrEqual(0.04);
  });
  it.fails('RS8 laryngospasm after propofol 1 mg/kg on air: pleural swing ≤ −20 cmH2O with pulsus ≥ 10 mmHg — measured −14.6 cmH2O / 12.6 mmHg on 94040f7 (R1-emulated −18.5 / 4.3)', async () => {
    const e = rig6();
    await runTo(e, 480);
    send(e, prop(1));
    await runTo(e, 570);
    send(e, { kind: 'airway', state: 'obstructed' });
    await runTo(e, 700);
    const w = await fineWindow(e, 750);
    const b = st6(e).hemo.circ.beats.filter((x: { t: number }) => x.t > 700) as Array<{ sbp: number }>;
    const pulsus = Math.max(...b.map((x) => x.sbp)) - Math.min(...b.map((x) => x.sbp));
    const swing = (w.pplMin + 4) / 0.7356; // cmH2O below the resting −4 mmHg
    row('RS8', { swingCmH2O: +swing.toFixed(1), pulsus: +pulsus.toFixed(1), saO2: +(st6(e).resp.o2.sa * 100).toFixed(1) });
    expect(swing).toBeLessThanOrEqual(-20);
    expect(pulsus).toBeGreaterThanOrEqual(10);
  });
  // FU-6 F8 (Orchestrator ruling (FU-6 review), 2026-09-28): NPPE is a DECLARED NOT-MODELLED item, not an `it.fails`.
  // The chemical-drive effort is capped (the VT ceiling → effort ≈ 4.4–4.9), so the obstructed-effort transmural term
  // cannot reach the Starling threshold (σ·COP − 2 ≈ 23 mmHg) in ANY scenario — a real Mueller manoeuvre generates
  // −40 to −100 cmH2O. This row records the number and guards the declaration: if a later stage adds a reflex
  // laryngospasm effort (Q-FU6-3) and oedema appears, this row fails and the declaration is re-opened, not re-banded.
  it('RS8 NPPE — NOT MODELLED (declared): the transmural term adds only ≈ 6.5 mmHg at the maximal chemical effort and no lung water forms (measured palvObs −6.5 mmHg at effort 4.4, pCap 16.2, EVLWI +0.00)', async () => {
    const e = rig6();
    await runTo(e, 480);
    send(e, prop(1));
    await runTo(e, 570);
    const ev0 = st6(e).blood.lung.evlwi as number;
    send(e, { kind: 'airway', state: 'obstructed' });
    let palv = 0;
    let effort = 0;
    await runTo(e, 750, () => { palv = Math.min(palv, st6(e).resp.palvObs ?? 0); effort = Math.max(effort, st6(e).resp.spont?.effort ?? 0); }, 0.5);
    const dEv = (st6(e).blood.lung.evlwi as number) - ev0;
    row('RS8-NPPE', { palvObsMin: +palv.toFixed(2), effortMax: +effort.toFixed(2), dEvlwi: +dEv.toFixed(2) });
    expect(palv).toBeLessThan(-1); // the transmural term IS wired (FU-6 R3b, Task 6 Step 5) …
    expect(palv).toBeGreaterThan(-12); // … but bounded by the capped chemical effort
    expect(dEv).toBeLessThan(0.5); // no negative-pressure oedema: NOT MODELLED (gate note §5, Q-FU6-3)
  });
  it('RS9 circuit events on VCV: kink → Ppeak ≥ Pmax − 0.5, VT ≤ 20 % (40.0 / 67 mL); disconnection → capnogram flat within one breath (the numeric follows at +12 s: FU-5)', async () => {
    const e = rig6();
    const ev: unknown[] = [];
    e.on((x) => ev.push(x), ['measurement']);
    await ventRig(e);
    await runTo(e, 300);
    send(e, { kind: 'airway', state: 'obstructed' });
    await runTo(e, 330);
    const k = await fineWindow(e, 360);
    const vtK = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    send(e, { kind: 'airway', state: 'patent' });
    await runTo(e, 480);
    send(e, { kind: 'airway', state: 'disconnected' });
    await runTo(e, 500);
    const et = st6(e).resp.etco2 as number;
    const wave = Math.max(...read62(e, 'co2', 486, 490)); // one breath (5 s) after the disconnection at 480
    const numZero = numSeries(ev as never, 'etco2', 480, 500).find(([, v]) => !(v > 5))?.[0] ?? Number.NaN;
    row('RS9', { kinkPeak: +k.peak.toFixed(1), kinkVt: Math.round(vtK), kinkVdSeries: Math.round(st6(e).resp.pat.deadSpaceMl), disconnectEtTrue: +et.toFixed(1), capnoMax: +wave.toFixed(1), numericZeroAt: numZero - 480 });
    // FU-6 F2: the kink row is the ONE place where a peak pinned at Pmax IS the evidence (that is what a kink does), so
    // it is asserted against the limit itself and the delivered VT carries the obstruction's size
    expect(Math.abs(k.peak - (st6(e).resp.driver.vent.pmax ?? VCV_PMAX_DEFAULT))).toBeLessThanOrEqual(0.5);
    expect(vtK).toBeLessThanOrEqual(100);
    expect(wave).toBeLessThan(5); // measured 0.0 from 484 s; the displayed numeric held 40 until 493 s (FU-5's hold, D10)
  });
  // RS10 runs at Pmax 80: at the default Pmax 40 the RR-30 breaths are pressure-limited (peak 40, VT 352) and the
  // hyperinflation this scenario teaches is capped (auto-PEEP 13.4, MAP −18 %) — the Pmax alarm is the other lesson
  const copd = async () => {
    const e = rig6({ ageY: 65, sex: 'M', weightKg: 70, heightCm: 175, lungConditions: [{ id: 'copd', severity: 1 }] });
    await ventRig(e, { rr: 10, pmax: 80 });
    const mapNow = () => { const b = st6(e).hemo.circ.beats.slice(-8) as Array<{ map: number }>; return b.reduce((a, x) => a + x.map, 0) / b.length; };
    await runTo(e, 600);
    const m10 = mapNow();
    send(e, vent({ rr: 30, pmax: 80 }));
    await runTo(e, 1200);
    const m30 = mapNow();
    const ap30 = st6(e).resp.lung.peepTot - 5;
    send(e, { kind: 'airway', state: 'disconnected' });
    await runTo(e, 1230);
    const mDisc = mapNow();
    row('RS10', { map10: +m10.toFixed(1), map30: +m30.toFixed(1), autoPeep30: +ap30.toFixed(1), mapAfterDisconnect: +mDisc.toFixed(1) });
    return { m10, m30, ap30, mDisc };
  };
  it('RS10 COPD severe, VCV RR 10 → 30 (Pmax 80): PEEPi ≥ 15 with MAP −25 % (18.2; 94.0 → 67.8)', async () => {
    const r = await copd();
    expect(r.ap30).toBeGreaterThanOrEqual(15);
    expect(r.m30).toBeLessThanOrEqual(0.75 * r.m10);
  });
  it.fails('RS10 a 30 s disconnection restores MAP to ≥ 85 % of the RR-10 value — measured 73.6 of 94.0 (78 %) on 94040f7 (audit F2: 65.5 of 88.9)', async () => {
    const r = await copd();
    expect(r.mDisc).toBeGreaterThanOrEqual(0.85 * r.m10);
  });
  it('RS11 ARDS severe high recruiter (unlimited arm, pmax 80 — F2): plateau ≤ 30 at 6 mL/kg; driving pressure lower at PEEP 15 after recruitment (13.1 → 11.7) with the DELIVERED VT intact (F5c)', async () => {
    const e = rig6({ ...ADULT6, lungConditions: [{ id: 'ards', severity: 1, recruitFrac: 0.5 }] });
    // FU-6 F2/F5c: Pplat 27.2 sits close to the default Pmax 40's reach, and a pressure-limited breath would lower ΔP by
    // delivering LESS VOLUME — which is not the compliance gain R14 asks for. The arm is unlimited and the delivered VT
    // is guarded, so a ΔP fall can only be a compliance change.
    await ventRig(e, { rr: 20, vtMl: 420, fio2: 0.8, pmax: 80 });
    await runTo(e, 900);
    send(e, vent({ rr: 20, vtMl: 420, peep: 15, fio2: 0.8, pmax: 80 }));
    await runTo(e, 1500);
    const dp0 = st6(e).resp.lung.pInsp - st6(e).resp.lung.peepTot;
    send(e, { kind: 'recruit', pressureCmH2O: 40, durationS: 30 });
    await runTo(e, 2100);
    const lung = st6(e).resp.lung;
    const vt1 = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    row('RS11', { dp0: +dp0.toFixed(1), dp1: +(lung.pInsp - lung.peepTot).toFixed(1), plateau: +lung.pInsp.toFixed(1), deliveredVt: Math.round(vt1), paco2: +st6(e).resp.co2.pf.toFixed(1) });
    expect(lung.pInsp).toBeLessThanOrEqual(30);
    expect(vt1).toBeGreaterThanOrEqual(0.95 * 420); // F5c: the ΔP fall is a compliance change, not a truncated breath
    expect(lung.pInsp - lung.peepTot).toBeLessThan(dp0 - 1);
  });
  it('RS12 OLV at FiO2 1, VT 5 mL/kg × 16: sevoflurane lowers PaO2 5–20 % (−7.7 %); PaO2 150–250 and non-dependent flow ≤ 25 % need posture (Q-FU6-6) — logged', async () => {
    const run = async (sevo: boolean) => {
      const e = rig6();
      await ventRig(e, { fio2: 1 });
      await runTo(e, 600);
      send(e, { kind: 'lungCondition', id: 'olv', severity: 1, side: 'R' });
      send(e, vent({ rr: 16, vtMl: 350, fio2: 1 }));
      await runTo(e, 1800);
      if (sevo) send(e, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6, n2oFrac: 0 });
      await runTo(e, 2400);
      const f = st6(e).resp.lung.perf.f as number[];
      return { pao2: st6(e).resp.o2.pao2 as number, fR: f[1] as number, paco2: st6(e).resp.co2.pf as number };
    };
    const c = await run(false);
    const s = await run(true);
    row('RS12', { pao2: Math.round(c.pao2), pao2Sevo: Math.round(s.pao2), nonDependentFlow: +c.fR.toFixed(2), paco2: +c.paco2.toFixed(1) });
    expect(1 - s.pao2 / c.pao2).toBeGreaterThanOrEqual(0.05);
    expect(1 - s.pao2 / c.pao2).toBeLessThanOrEqual(0.2);
  });
  it('RS13 massive PE (one command), awake then ventilated: RR ≥ 25 and PaCO2 ≤ 35 awake; EtCO2 falls ≥ 10 with Pa–Et ≥ 15 ventilated; mPAP 30–45 (27.2 / 30.0; 40.2 → 27.8, gap 33.6, mPAP 31.7 — re-measure on the FU-4 one-PE event)', async () => {
    const a = rig6();
    await runTo(a, 600);
    send(a, { kind: 'lungCondition', id: 'pe', severity: 1 });
    await runTo(a, 1200);
    const v = rig6();
    await ventRig(v);
    await runTo(v, 600);
    const et0 = st6(v).resp.etco2 as number;
    send(v, { kind: 'lungCondition', id: 'pe', severity: 1 });
    await runTo(v, 1200);
    let pap = 0;
    let n = 0;
    await runTo(v, 1260, () => { pap += st6(v).hemo.circOut.pPa; n++; }, 0.1);
    const rv = st6(v).resp;
    row('RS13', { rrAwake: +st6(a).resp.spont.rr.toFixed(1), paco2Awake: +st6(a).resp.co2.pf.toFixed(1), et0: +et0.toFixed(1), et: +rv.etco2.toFixed(1), gap: +(rv.co2.pf - rv.etco2).toFixed(1), mpap: +(pap / n).toFixed(1), co: +cardiacOutput(st6(v).hemo, v.now().simT).toFixed(2) });
    expect(st6(a).resp.spont.rr).toBeGreaterThanOrEqual(25);
    expect(st6(a).resp.co2.pf).toBeLessThanOrEqual(35);
    expect(et0 - rv.etco2).toBeGreaterThanOrEqual(10);
    expect(rv.co2.pf - rv.etco2).toBeGreaterThanOrEqual(15);
    expect(pap / n).toBeGreaterThanOrEqual(30);
    expect(pap / n).toBeLessThanOrEqual(45);
  });
  it.fails('RS14 rebreathing FiCO2 8 for 20 min at fixed VCV: PaCO2 and EtCO2 +6–10 — measured +5.9 / +5.1 on 94040f7 with every task (Task 12 alone +5.7 / +5.0)', async () => {
    const run = async (fico2: number) => {
      const e = rig6();
      await ventRig(e);
      await runTo(e, 300);
      if (fico2) send(e, vent({ fico2 }));
      await runTo(e, 1500);
      return { pa: st6(e).resp.co2.pf as number, et: st6(e).resp.etco2 as number };
    };
    const c = await run(0);
    const r = await run(8);
    row('RS14', { dPaco2: +(r.pa - c.pa).toFixed(1), dEtco2: +(r.et - c.et).toFixed(1) });
    expect(r.pa - c.pa).toBeGreaterThanOrEqual(6);
    expect(r.et - c.et).toBeGreaterThanOrEqual(6);
  });
});
```

(RS15 — link parity — is `packages/ventilator/test/link-parity.test.ts`, Task 9.)

#### Modify `packages/engine-core/vite.config.ts`

Edit 1 — find:

```ts
  'test/engine/resp-child-baseline.test.ts', // FU-6 R15: two 15 sim-min child runs
```

replace with:

```ts
  'test/engine/resp-child-baseline.test.ts', // FU-6 R15: two 15 sim-min child runs
  'test/engine/resp-suite.test.ts', // FU-6 Task 18: the RS1–RS15 respiratory suite (≈ 5 sim-h in total)
```

- [ ] **Step 2: Run it** (`CI=1 … vitest run test/engine/resp-suite.test.ts`, bounded wait ≤ 10 min per poll) and apply
  R45 row by row: a met row stays `it`; a missed `it` row becomes `it.fails` with its measured numbers in the title (and a
  calibration row or a request to FU-4/V.1 in the gate note); a pre-declared `it.fails` that is now met is flipped with
  "was …". Save the `RS-ROW` lines: `grep '^RS-ROW' … > <scratchpad>/fu-6-respiratory-integration/suite.txt`.
- [ ] **Step 3: CI budget.** Measure the suite's wall time locally; if the whole SLOW group (with FU-6's task files) grows
  past CI amendment 4's per-file expectations, report it to the orchestrator (a third CI group is a CI change, not
  FU-6's): after FU-4 Task 20 `SLOW_B` is derived from `SLOW` by filter, so this file is already in `slow-b` and there is
  no list to "move" it to (F10(4)) — never shorten a scenario to make a band.
- [ ] **Step 4: Commit and push** — `test(resp): the RS1–RS15 respiratory scenario suite (FU-6 Task 18)`.

### Task 19: The evidence page and the gate screenshots (demo; Chromium only; the page and its smoke PROTOTYPED — green on the applied tree in 39 s; the shots UNPROTOTYPED)

**Files:**
- Create: `apps/demo/fu6.html`, `apps/demo/src/fu6.ts`, `apps/demo/e2e/fu6.e2e.ts`
- Modify: `apps/demo/vite.config.ts` (one page)

**Why:** the orchestrator inspects the screenshots before Ali tests (R53). Five demonstrations on the Philips-like
monitor, MODELED, ×4 time scale: (1) severe bronchospasm on VCV (shark fin, peak/auto-PEEP in the ventilator strip) then
salbutamol; (2) propofol 2 mg/kg + fentanyl 2 µg/kg on an SGA (induction apnoea: flat capnogram, falling SpO2);
(3) laryngospasm after propofol 1 mg/kg on air (obstructed efforts, desaturation); (4) kinked ETT on VCV (Pmax, flat
capnogram); (5) Hb 5 (tachycardia with a normal SpO2). Screenshots are JPEG, clipped 1000 × 1000, quality 40–45, each
≤ 60 KB (re-take at lower quality or `deviceScaleFactor: 0.7` if larger, and record it).

- [ ] **Step 1: The page.**

#### Create `apps/demo/fu6.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FU-6: respiratory integration</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 12px; }
      #monitor { height: 560px; max-width: 1000px; border: 1px solid #333; }
      .row { display: flex; gap: 8px; flex-wrap: wrap; max-width: 1000px; margin-top: 10px; }
      #diag { font: 13px ui-monospace, monospace; white-space: pre; color: #8f8; max-width: 1000px; }
      button { font: inherit; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div class="row">
      <button data-demo="bronchospasm">Bronchospasm → salbutamol</button>
      <button data-demo="induction">Propofol + fentanyl (SGA)</button>
      <button data-demo="laryngospasm">Laryngospasm on air</button>
      <button data-demo="kink">Kinked tube on VCV</button>
      <button data-demo="anaemia">Hb 5</button>
    </div>
    <div id="diag"></div>
    <script type="module" src="./src/fu6.ts"></script>
  </body>
</html>
```

#### Create `apps/demo/src/fu6.ts`

```ts
// FU-6 evidence page: five respiratory demonstrations on the Philips-like monitor (MODELED, ×4). The ground truth the
// screenshots show is printed under the monitor from the lungState/measurement events. Hook: window.__pme6.
import type { Command, EngineEvent, EngineOptions, PatientProfile } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';

type Body = Record<string, unknown>;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let pm: MonitorHandle | null = null;
let seq = 0;
let simT = 0;
const shown: Record<string, number | null> = {};
let lung: Extract<EngineEvent, { type: 'lungState' }> | null = null;

async function send(body: Body): Promise<{ accepted: boolean; reason?: string }> {
  if (!pm) return { accepted: false, reason: 'not started' };
  const r = await pm.dispatch({ id: `f6-${++seq}`, issuedBy: 'fu6', ...body } as Command);
  if (!r.accepted) console.warn('rejected', body, r.reason);
  return r;
}
const ev = (event: Body) => send({ type: 'applyEvent', event });
const drug = (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' });
const vcv = (o: Body = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...o });
const later = (simS: number, fn: () => void) => { const t0 = simT; const id = setInterval(() => { if (simT >= t0 + simS) { clearInterval(id); fn(); } }, 200); };

function start(patient: PatientProfile = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }): void {
  pm?.destroy();
  $('monitor').innerHTML = '';
  simT = 0;
  lung = null;
  const engine: EngineOptions = { seed: 7, patient: { ...patient, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } };
  pm = mountMonitor($('monitor'), { skin: 'philips-like', engine, lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'] });
  pm.on((e) => {
    if ('t' in e && typeof e.t === 'number') simT = Math.max(simT, e.t); // toneCancel carries no t (stage5.ts pattern)
    if (e.type === 'lungState') lung = e;
    if (e.type === 'measurement') for (const k of ['hr', 'spo2', 'etco2', 'awrr'] as const) if (e.values[k]) shown[k] = e.values[k]!.value;
  });
  void send({ type: 'setMode', mode: 'modeled' });
  pm.setTimeScale(4);
}
const ventRig = async () => {
  await ev({ kind: 'airwayDevice', device: 'ett' });
  await vcv();
  await ev({ kind: 'infusion', drugId: 'propofol', rate: 100, unit: 'mcg/kg/min' });
  await drug('rocuronium', 1.2, 'mg/kg');
};

const DEMOS: Record<string, () => Promise<void>> = {
  async bronchospasm() { start(); await ventRig(); later(120, () => void ev({ kind: 'airway', state: 'bronchospasm', severity: 1 })); later(420, () => void drug('salbutamol', 250, 'mcg')); },
  async induction() { start(); await ev({ kind: 'airwayDevice', device: 'sga' }); await drug('fentanyl', 2, 'mcg/kg'); later(120, () => void drug('propofol', 2, 'mg/kg')); },
  async laryngospasm() { start(); await drug('propofol', 1, 'mg/kg'); later(90, () => void ev({ kind: 'airway', state: 'obstructed' })); later(270, () => void ev({ kind: 'airway', state: 'patent' })); },
  async kink() { start(); await ventRig(); later(120, () => void ev({ kind: 'airway', state: 'obstructed' })); },
  async anaemia() { start({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, blood: { hb: 5 } }); },
};
for (const b of document.querySelectorAll<HTMLButtonElement>('button[data-demo]')) b.addEventListener('click', () => void DEMOS[b.dataset.demo as string]?.());
setInterval(() => {
  $('diag').textContent = `t ${simT.toFixed(0)} s  HR ${shown.hr ?? '–'}  SpO2 ${shown.spo2 ?? '–'}  EtCO2 ${shown.etco2 ?? '–'}  awRR ${shown.awrr ?? '–'}` +
    (lung ? `\nlungState: C ${lung.complianceMlPerCmH2O.toFixed(0)} mL/cmH2O  R ${lung.resistanceCmH2OPerLps.toFixed(0)} cmH2O/L/s  auto-PEEP ${(lung.autoPeepCmH2O ?? 0).toFixed(1)}  shunt ${lung.shunt.toFixed(2)}` : '');
}, 500);
start();
(window as unknown as { __pme6: unknown }).__pme6 = { demo: (n: string) => DEMOS[n]?.(), simT: () => simT, timeScale: (k: number) => pm?.setTimeScale(k), ready: true };
```

(`lungState` field names are V.1's absolute ones on the merged main — if V.1 renamed any, use V.1's; the diag line is
informational.)

#### Create `apps/demo/e2e/fu6.e2e.ts`

```ts
// FU-6 page: a CI smoke (the bronchospasm demo runs, EtCO2 shows, no page errors) and, with PME_SHOTS=1, the gate
// screenshots into docs/gates/fu-6/ (Chromium only: the heavy evidence rule).
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-6');
type Hook = { demo(n: string): Promise<void>; simT(): number; timeScale(k: number): void; ready: boolean };
const demo = (page: Page, name: string) => page.evaluate((n) => (window as unknown as { __pme6: Hook }).__pme6.demo(n), name);
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as { __pme6: Hook }).__pme6.simT() >= t, t, { timeout: 900_000 });

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
test.afterAll(async () => vite?.close());

async function open(page: Page, errors: string[]) {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1000, height: 1000 });
  await page.goto(`${base}/fu6.html`);
  await page.waitForFunction(() => (window as unknown as { __pme6?: { ready: boolean } }).__pme6?.ready === true);
}

test('fu6 page: the bronchospasm demo runs, EtCO2 shows, no page errors', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  await open(page, errors);
  await demo(page, 'bronchospasm');
  await waitSim(page, 150);
  await expect(page.locator('#diag')).toContainText('EtCO2');
  expect(errors).toEqual([]);
});

test('fu6 gate screenshots (PME_SHOTS=1)', async ({ page, browserName }) => {
  test.skip(!process.env.PME_SHOTS, 'screenshots only: PME_SHOTS=1 PW_SYSTEM_CHROME=1 npx playwright test fu6');
  test.skip(browserName === 'webkit', 'heavy evidence run: Chromium only');
  test.setTimeout(3_600_000);
  mkdirSync(out, { recursive: true });
  const errors: string[] = [];
  await open(page, errors);
  const shot = async (name: string) => {
    const path = `${out}/${name}.jpg`;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path, type: 'jpeg', quality: 45, clip: { x: 0, y: 0, width: 1000, height: 1000 } });
    expect(statSync(path).size).toBeLessThanOrEqual(60 * 1024);
  };
  const run = async (name: string, shots: Array<[number, string]>) => {
    await demo(page, name);
    for (const [t, name] of shots) { await waitSim(page, t); await shot(name); }
  };
  await run('bronchospasm', [[400, 'bronchospasm'], [1020, 'bronchospasm-salbutamol']]);
  await run('induction', [[190, 'induction-apnoea']]);
  await run('laryngospasm', [[240, 'laryngospasm'], [300, 'laryngospasm-release']]);
  await run('kink', [[180, 'kinked-tube']]);
  await run('anaemia', [[600, 'anaemia-hb5']]);
  expect(errors).toEqual([]);
});
```

#### Modify `apps/demo/vite.config.ts`

Edit 1 — find:

```ts
        'physiology-console': page('physiology-console'), // Stage 7x
```

replace with:

```ts
        'physiology-console': page('physiology-console'), // Stage 7x
        fu6: page('fu6'), // FU-6
```

(FU-4 Task 23 adds `fu4` on the next line; keep both.)

- [ ] **Step 2: Run** the smoke: `PW_SYSTEM_CHROME=1 npx playwright test fu6` (Chromium; CI runs it on Chromium and
  WebKit — the smoke is light). Then the shots: `PME_SHOTS=1 PW_SYSTEM_CHROME=1 npx playwright test fu6 -g screenshots`
  (≈ 20 min wall at ×4). Look at every image: the bronchospasm shot must show the shark fin and the ventilator pressures;
  salbutamol a normal plateau; induction a flat capnogram; the kinked tube a flat capnogram; Hb 5 an HR ≥ 100 with SpO2
  ≥ 95. Record sizes; re-encode any file > 60 KB.
- [ ] **Step 3: Commit and push** — `feat(demo): FU-6 evidence page and gate screenshots`.

### Task 20: Gate — full verification, the audit after, the matrix cells, the gate note, the PR

**Files:**
- Create: `docs/gates/fu-6.md`, `docs/gates/fu-6/audit-after.txt`, `docs/gates/fu-6/audit-summary.txt`,
  `docs/gates/fu-6/suite-rows.txt` (and Task 19's JPEGs, already committed)
- Modify: this plan (ticks only)

- [ ] **Step 1: Merge main** — `git fetch origin && git merge origin/main` (FU-5 may have landed: it owns `l3/**`; no
  expected conflict; if FU-5 changed the EtCO2 numeric's hold, re-run `resp-capno-deadspace` and RS9/RS3b — they read the
  waveform, the numeric is logged only). Re-run `npx -y pnpm@9.15.9 install --frozen-lockfile` if the lockfile moved.
- [ ] **Step 2: Full verification** (every wait an `until` loop of ≤ 10 min that re-checks the process; record wall times):
  - `npx -y pnpm@9.15.9 -r typecheck` — clean.
  - engine fast: `cd packages/engine-core && CI=1 PME_TEST_SET=fast npx vitest run` — 0 failures (the plan's applied tree
    on `94040f7`: 250 files, 1,093 tests, 0 failures after Task 11's rocuronium 1.2 in `pk-bus`).
  - engine slow: `CI=1 PME_TEST_SET=slow` (or `slow-a` / `slow-b` after FU-4 Task 20) — every file, one yield per
    sim-minute, 0 unhandled errors. Every failure is either fixed by its task's R45 procedure or is a pre-declared
    `it.fails` still failing; there is no third kind.
  - `npx -y pnpm@9.15.9 --filter @pme/ventilator test` (V.1's tests + `link-parity`).
  - `npx -y pnpm@9.15.9 --filter @pme/validation test` and the tick bench (`tick-bench` p50 < 6 ms on CI): run it the
    same way as Task 0 Step 4 and record the local p50 AFTER FU-6 beside Task 0's BEFORE value (F10(8)); a p50 rise
    > 15 % locally is reported with the per-tick additions named in Global Constraints → CI rules.
  - e2e Chromium: `PW_SYSTEM_CHROME=1 npx playwright test` (all pages; the heavy shots are skipped without PME_SHOTS).
  - the audit after: `npx -y pnpm@9.15.9 run audit:respiratory all > docs/gates/fu-6/audit-after.txt; echo "exit $?"`,
    then `npx -y pnpm@9.15.9 run audit:respiratory summary > docs/gates/fu-6/audit-summary.txt` (≈ 10 min; the `M-*`
    matrix scenarios included). **Exit code (F10(6)):** do NOT run it under `set -e`. The CLI runs every scenario even if
    one throws, ends with an `ENGINE EXCEPTIONS: …` line and exits **2** when any scenario threw (1 = the CLI itself
    failed, 0 = clean). On the merged main the expected result is **0 / `none`** — Task 0's hard precondition 3 already
    required the infant `M-PD12` to run 1800 s without an exception. Any exception here is recorded in the gate note §5
    with the scenario and the message, and if it is `M-PD12` (or any other `M-*` cell) it is reported to the orchestrator
    as a FU-4 precondition regression, not waved through.
  - the suite rows: `grep '^RS-ROW' <slow log> > docs/gates/fu-6/suite-rows.txt`.
- [ ] **Step 3: The gate note** `docs/gates/fu-6.md`, in the glossary's labels (R56: Ppeak, PEEPi, ΔP, V̇E, V̇A, PaCO₂,
  EtCO₂, SaO₂, FRC, Qs/Qt, VD/VT — never engine keys), sections:
  1. **Summary:** tasks, commits, files, tests before/after (fast and slow counts), wall times.
  2. **The suite table:** one row per RS1–RS15 — band, measured value (from `suite-rows.txt`), `it` / `it.fails`, and
     the owner of any miss (FU-6 calibration row, FU-4, V.1, FU-5, 7j).
  3. **Before → after** for the audit's key cells (Task 0 Step 4's before, `audit-after.txt`): E1/E1b/I2d, the X-bs
     arms, C4, C4b, C6–C8, E2/E2b, B1–B5, I1, E3, H1, G1d, G2, G3, F1, F3, F6, D1–D4.
  4. **Screenshots** (Task 19) with one line each saying what they show and their size.
  5. **`it.fails` list with numbers** (pre-declared on `94040f7` + FU-6; the executor updates each number on the merged
     main, flips any now met with "was …", and adds its own): RS2b pregnancy 4.83 min / child 3.40 min; RS3b capnogram
     15.6 mmHg while VT < VD; RS5b remifentanil 0.1 RR 5.7 and ΔPaCO₂ +15.0; RS6 RR 1.29× / VT 0.71×; RS7b SaO₂
     99.8 → 99.5 %; RS8 Ppl swing −14.6 cmH₂O (pulsus 12.6 met); RS10b MAP 78 % 30 s after disconnection; RS14
     +5.9 / +5.1 mmHg; Task 7 child 3.40; Task 10 stimulus V̇E +1.6 %; Task 13 pregnancy apnoea 4.83; Task 14 CO
     +24 %; Task 16 induction Qs/Qt 0.015. Rows that fail on `94040f7` only for want of FU-4/V.1 and are therefore
     written as `it` (Task 0's preconditions): RS1 (PaCO₂ 50.0, VD/VT 0.54), Task 17's two child rows (PaCO₂ 79.2;
     SpO₂ lag 66 s). Flips made: RS11 (a pre-declared calibration row, now `it` — and only while its delivered-VT guard
     holds, F2/F5c). **Not a flip: FU-3's `circ-hypoxic-arrest` final HR** — FU-4 already flipped that row (74.4); FU-6
     re-measures it after Task 7 and records the number here beside FU-4's, with `it.fails` + the number if FU-6 pushes it
     above 130 (F4). **Declared NOT MODELLED (not `it.fails`, F8):** NPPE — the obstructed-effort transmural term adds
     ≈ 6.5 mmHg at the maximal chemical effort (measured `palvObs` −6.5 mmHg at effort 4.4, EVLWI +0.00; the
     `RS8 NPPE — NOT MODELLED` row records it) against a ≈ 23 mmHg Starling threshold; Q-FU6-3.
  6. **Deviations:** every re-anchored find block (Task 0 Step 3), every rig re-derivation (E-FU6-7: `spont.test.ts`,
     `circ-sanity-2` R23 O2 and H7 time-averaged pressures, `lung-circ` COPD, `pk-bus` and `endo-circ-acceptance`
     sepsis rocuronium, the shared `ventRig` rocuronium infusion — D19), **E-FU6-10: the two 7f unit bands re-specified
     by the Q-FU6-4 ruling (D21)** — `depth-drive.test.ts`'s `NMB:` row and `l2/neuro/pipeline.test.ts`'s residual-block
     row, each with the tables' band kept on the unconscious arm, the awake numbers (0.150 / 0.151 before the ruling,
     the merged tree's after it) and the reason (Eikermann 2003 governs the awake patient) — the truth-budget outcome (D16, Q-FU6-8),
     tick-bench numbers, and exceptions used/unused (E-FU6-5 withdrawn; list any declared exception no task used).
  7. **Calibration-queue rows for Ali (R44):** WAKE_MMHG and F7's `WAKE_QUANTILES` knots (the Diprivan label fit, with
     the merged main's 20-seed counts), CENTRAL_TAU_S, APNOEA_VE_IN/OUT, GA_TAU_ON/OFF, PMUS_REST,
     smooth-muscle fractions and F6's REFRACT_SEV/REFRACT_DUR_MAX/REFRACT_TAU_MIN (the non-responder row), magnesium
     Emax, the alveolar-fraction ramp, VCV_PMAX_DEFAULT, KINK_R_MULT, BUCK_CMH2O, **UA_AROUSAL 0.25 and HVR_NMB_EMAX 0.3
     / HVR_NMB_TOFR_LO 0.7** (D21, the Q-FU6-4 ruling: the awake share of a residual block's obstruction and the size of
     its hypoxic blunting — Ali confirms both as teaching sizes),
     J_PE_VE_FRAC/J_PE_RR, F9's HVR_INDEP_VE (the hypoxic drive below the CO2 threshold), VISC_EXP, the COHb exponent,
     K_PVR_CO2, ATEL_IND (induction shunt), the child GA FRC, **the adult GA FRC** (F10(3): `gaLvl` makes FRC 2100 → 1400
     mL, −0.7 L, on every anaesthetic; Hedenstierna's anaesthesia step is −0.4–0.5 L — the constant is the catalogue's,
     FU-6 is what makes it act), **GA_TAU_OFF_S 300 s** (F10(3): real FRC/atelectasis recovery takes hours), the
     laryngospasm effort (F8: chemical drive only, NPPE unreachable), the opioid rate depression (RS5b, 7f/7g).
  8. **Open questions** (below) with the executor's numbers on the merged main.
  9. **Coverage-matrix cells (R54; research/12 §4.2, §7).** One row per cell FU-6 owns: id, the audit's verdict, the
     measured value after FU-6, the new verdict (PL / TW / TS / WR / MI / IN), and the owner of what remains. The
     plan's own measurement on `94040f7` + FU-6 (the executor replaces each value with the merged main's):

     | cell | audit verdict | after FU-6 (`94040f7`) | new verdict / remaining owner |
     |---|---|---|---|
     | A09-A3b GA FiO₂ steps | TW (Qs/Qt small) | induction Qs/Qt 0.015 at FiO₂ 1 | TW — ATEL_IND calibration row |
     | A09-B1 preox apnoea, adult | TW 9.75 min | 7.92 min | PL |
     | A09-B3 obese | TW 3.33 | 2.83 | PL |
     | A09-B4 / B4g pregnancy | TW 6.9 / 5.6 | 4.83 (set point 31.2, V̇O₂ +20 %) | TW — 7j (ODC, FRC supine) |
     | A09-B5 child | TW 7.8 | 3.40 | TW — V.1 CO ratio, FU-4 R1 |
     | A09-B5g child baseline | WR | PaCO₂ 79 (R1 fit + VT ceiling) | WR until FU-4 R1 (Task 0 STOP) |
     | A09-C1a induction direction | PL | apnoea 30 s (R1-emulated) | PL |
     | A09-C1b capnogram below VD | WR | 0 below 0.6·VD; 15.6 mmHg at 0.84·VD | TW — Q-FU6-12 |
     | A09-C4 propofol, natural airway | WR (RR 41) | max RR 18.2, VT < 100 / apnoea at +55 s | PL |
     | A09-D1 remifentanil | PL / MI | RR 5.7 → 4.0; naloxone +3.3 | TW (RR at 0.1) — 7f/7g calibration |
     | A09-D2 sevoflurane via SGA | TW | RR 1.29×, VT 0.71× | TW — Q-FU6-7 |
     | A09-D3 residual block | TS | arousal term CODED (D21): obstruction 0.6 → ≈ 0.37 at `loc` ≈ 0.5, 0.15 fully awake; hypoxic response −30 % (Eriksson) | executor grades on the merged tree (expect TS → PL/TW) — Q-FU6-4 ruled |
     | A09-D4 stimulus under remi + propofol | MI | V̇E +1.6 % | MI — Q-FU6-5 |
     | A09-D-HVR | MI | hvrDep 0.45 at 0.1 MAC; CO₂ response −1.5 % | PL |
     | A09-E1t / E1b bronchodilators | MI / IN | salbutamol Ppeak −42 %, PEEPi −80 %; adrenaline −45 % at 3 min; sevoflurane −38 % | PL |
     | A09-E2 / E2b laryngospasm | WR / MI | RR 15.8 → 19.5 at effort 2.09, neural VT ≤ 1044 mL; Ppl −14.6 cmH₂O; pulsus 12.6; release PaCO₂ ≥ 42.9 | TW (swing) — NPPE NOT MODELLED, declared (F8; RS8-NPPE row) |
     | A09-E3 kinked tube | WR | Ppeak 40.0 (Pmax), VT 67 mL, capnogram flat | PL |
     | A09-F1r ARDS recruitment | TW | ΔP 13.1 → 11.9 | PL |
     | A09-F2d COPD disconnection | TW | MAP 78 % of baseline 30 s after | TW — calibration row |
     | A09-F3 OLV | TS / MI | sevoflurane PaO₂ 81 → 75 (−7.4 %) | PL (HPV); posture MI — Q-FU6-6 |
     | A09-F6 permissive hypercapnia | WR / MI | mean PAP +3.7 at PaCO₂ 92 | PL (PVR); PaCO₂ — FU-4 R1 |
     | A09-G1d PE awake | TW | RR 27.2, PaCO₂ 30.0 | PL (SaO₂ 96 %: FU-4 one-PE task) |
     | A09-G2 anaemia | MI | HR 70 → 109, CO +24 %, lactate 1.02 | TW (CO) — calibration row |
     | A09-G3 COHb on O₂ | MI | 30 → 17.0 % at 60 min on FiO₂ 1 (26.7 % on air) | PL |
     | A09-H2 lung bronchospasm capnogram | IN | one shark fin, α 149° → 119° after salbutamol | PL |
     | A09-H3 COPD capnogram | TW (gap 27) | not addressed by FU-6 (R46 flag) | TW — 7k / calibration |
     | A09-H5 exhausted absorber | WR | PaCO₂ +5.9 / EtCO₂ +5.1 at 20 min (+8 at steady state) | TW (band +6) — Q-FU6-14 |
     | A09-H6 cardiogenic oscillations | TW | not addressed | TW — FU-5 (waveform detail) |
     | A09-H11 EtCO₂ at RR ≤ 6 | WR | waveform unchanged; numeric hold is FU-5's | FU-5 |
     | A09-Ib link vs internal ventilator | WR | both Pmax-limited; parity after V.1 (RS15) | executor measures |
     | A09-Ic2 airway + lung bronchospasm | IN | one condition (40.0 / 11.5 at Pmax 40) | PL |
     | NN-08 extubation TOFR 0.6 → FiO₂ 0.12 | new | `M-NN08-extub-hypoxic` (NMB term in hvrDep since D21: −30 % at TOFR ≤ 0.7, plus the awake obstruction load) | executor grades; Q-FU6-15 answered for this range |
     | PD-11 child VCV 8 mL/kg × 20 | new | `M-PD11-child-vcv`: VD 459 > VT 128 → PaCO₂ 116 at 5 min, pulseless by 10 min on `94040f7` (R1) | WR until FU-4 R1; executor grades on the merged main |
     | PD-12 infant, adult HME | new | `M-PD12-infant-vcv`: engine exception at 175 s on `94040f7` (main 240 s; R1's 400 mL fit) | blocked — FU-4 R1 root and an apparatus input (FU-4 Requests 3–4) |
     | CM-07 COPD GOLD 3, O₂-induced hypercapnia | new | `M-CM07-copd-o2` | executor grades |
- [ ] **Step 4: Commit and push** the gate note, the audit output and the suite rows; open the PR:

```bash
gh pr create --base main --head fu-6-respiratory-integration \
  --title "FU-6: respiratory integration — treatment, drive, anaesthetised lungs, capnograph physics, one command per disease" \
  --body-file <scratchpad>/fu-6-respiratory-integration/pr-body.md
```

  The PR body: the gate note's summary, the suite table, the `it.fails` list, the matrix-cell table, the deviations,
  and it ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Never merge** (the orchestrator
  and Ali decide; FU-6 has no merge authorization); report the PR URL and stop.

## Open questions (for the orchestrator / Ali; the plan does not wait on them)

Numbers are the model's on `94040f7` + every FU-6 task (no FU-4, no V.1) unless marked "R1-emulated" (the prototype's
stand-in for FU-4's dead-space root). "Decided" = the textbooks agree and the plan implements it; every decided row is
still marked **confirm with Ali** because the teaching choice is his.

**The audit's twelve respiratory questions (`research/09` §7):**

| # | question | the model after FU-6 | status |
|---|---|---|---|
| 1 | Default ventilation: VD/VT ≈ 0.3, PaCO₂ 35–42 at 7 mL/kg × 12? | RS1 on `94040f7`: man 12 × 490 → PaCO₂ 50.0, VD/VT 0.54 (the MANUAL fit's dead space); FU-4's R1 root is the fix and Task 0's precondition | FU-4 decides (G11); FU-6 re-measures RS1 — confirm with Ali |
| 2 | Induction apnoea after propofol 2 mg/kg | PROBABILISTIC (F7): seeds 1–20 on FiO2 0.5 → 8/20 apnoeic, < 30 / 30–60 / > 60 s = 1 / 4 / 3 (room air: long apnoeas end at ≈ 45 s on F9's hypoxic drive); seed 7 (modal) 28 s / 42 s R1-emulated, 2.5 mg/kg 44 s, + fentanyl 2 µg/kg 62 s, + remifentanil 0.1 124 s; then shallow obstructed breathing | **ruled (F7): the Diprivan label's distribution, a seeded draw — Ali: whether to pin the draw (Q-FU6-1)** |
| 3 | Bronchospasm: how fast and how far do the drugs act; what is "severe"? | severity 1 on VCV 12 × 500: Ppeak 44 / PEEPi 11.9 without a Pmax (40.0 / 11.5 at the default Pmax 40); salbutamol 250 µg: −42 % Ppeak at 2–3 min, PEEPi −80 %; adrenaline 50 µg −45 % at 3 min, gone by 10 min; sevoflurane −38 % at 0.8 MAC (10 min); ketamine −21 % then wears off; Mg 2 g −8 % | **decided (D1, D2) — the speeds: confirm with Ali (Q-FU6-2)** |
| 4 | Laryngospasm condition, NPPE, release | `obstructed` on a natural airway = complete laryngospasm (no new condition); efforts pull Ppl to −14.6 cmH₂O below rest with pulsus 12.6 mmHg (RS8); release PaCO₂ 61 → 41 in 20 s, never < 38 (D8); NPPE DECLARED NOT MODELLED (F8: transmural +6.5 mmHg at the maximal chemical effort, EVLWI +0.00) | **decided by physics — confirm with Ali (Q-FU6-3: a reflex laryngospasm effort, or NPPE out of v1)** |
| 5 | Pregnancy apnoea time and PaCO₂ 30 | awake term PaCO₂ 31.2 (was 41.7); preoxygenated apnoea to 90 % 4.83 min (band 2.5–4.5, `it.fails`) | **PaCO₂/V̇O₂ decided (Hegewald & Crapo, D12); the apnoea gap is 7j's (ODC, FRC supine) — confirm with Ali (Q-FU6-10)** |
| 6 | Residual block: awake vs sedated at TOFR 0.6 | awake: obstruction 0.15 (a load), VT near-normal (`vtMult` 0.85), hypoxic response −30 %; unconscious: the tables' 0.60 with `vtMult` 0.40 (D21, Task 5 Step 5 + Task 10) | **RULED (Q-FU6-4, orchestrator 2026-09-28: Eikermann governs the awake patient) — confirm with Ali** |
| 7 | The GA switch | derived from loss of consciousness and diaphragm block (τ 20 s on / 300 s off); `thermal 'general'` stays an override; adult 7.92 min, obese 2.83 without the switch | **decided (D9) — confirm with Ali** |
| 8 | Anaemia: tachycardia and high CO first? | Hb 5 vs 15: HR 70 → 109, CO +24 % (band +30 %, `it.fails`), MAP 95 → 76, SvO₂ 49 %, lactate 1.02 | **decided (D13, Weiskopf) — the CO size: confirm with Ali** |
| 9 | MANUAL apnoea / arrest | not FU-6's (FU-4 D6: MANUAL arrests only by no flow) | FU-4 |
| 10 | ABG at patient temperature vs 37 °C | unchanged: the panel shows patient-temperature values (30 °C: PaCO₂ 34, PaO₂ 161) | open for Ali (a lab convention; 7i's panel) |
| 11 | EtCO₂ numeric at slow rates | the waveform: no plateau below 0.6 × VD (Task 8); the numeric's hold until the apnoea timer is FU-5's | **decided (D10, vendor behaviour) — FU-5 implements** |
| 12 | CO₂ washout speed after RR 12 → 24 | unchanged (two-compartment CO₂ store: PaCO₂ 44.8 → 37 in 90 s, 27 at 20 min ≈ 60 % of the new steady state). Nunn: the fast phase (lung + blood) is minutes, the tissue store τ ≈ 20–60 min, so a 15–20 min slow phase is physiological | **decided by the textbook (keep) — confirm with Ali** |

FU-6's own questions:

- **Q-FU6-1 — induction apnoea by default (re-scoped by the Orchestrator ruling (FU-6 review), 2026-09-28, F7).** The
  model is now PROBABILISTIC per the Diprivan label (D5): one seeded draw per patient, ≈ 43 % apnoeic after 2–2.5 mg/kg,
  modal 30–60 s; seed 7 is the modal patient (28 s on `94040f7`, 42 s R1-emulated). What remains for Ali is a teaching
  choice only: should a scenario be able to PIN the draw ("this patient will be apnoeic") other than by choosing its
  seed — e.g. a later profile field? FU-6 adds none (a profile field is `types.ts`, outside its partition).
- **Q-FU6-2 — bronchodilator time course.** Relative to the untreated Ppeak (44 without a Pmax; 40.0 at the default
  Pmax 40, D18): salbutamol 250 µg IV −44 % at 2–3 min, −47 % at 10 min (Pmax era 40.0 → 24.6 → 23.4); adrenaline
  50 µg −50 % at 2–3 min, back to baseline by 10 min; sevoflurane −38 to −43 % once the brain reaches 0.8 MAC (≈ 10 min
  at 2.5 %, FGF 6); ketamine 1 mg/kg −21 to −29 %, then wears off; magnesium 2 g −8 to −17 %. Are these the teaching
  speeds you want?
- **Q-FU6-3 — post-release PaCO2 and NPPE.** After 3 min of laryngospasm PaCO2 falls ≈ 61 → 41 in 20 s once breathing
  resumes (the venous-limited equilibrium: VA 9–16 L/min, CO 5.5); the audit proposed "≤ 5 mmHg in 30 s". Physics says
  the fast fall is real; confirm. **NPPE (re-scoped by the Orchestrator ruling (FU-6 review), 2026-09-28, F8):** it is a
  DECLARED NOT-MODELLED item — the chemical-drive effort is capped, so the obstructed-effort transmural term adds only
  ≈ 6.5 mmHg at the maximal effort (measured `palvObs` −6.5 mmHg at effort 4.4, EVLWI +0.00) against a ≈ 23 mmHg
  Starling threshold; a real Mueller manoeuvre generates −40 to −100 cmH2O. Ali: should laryngospasm get its OWN reflex
  closure-effort term (independent of the chemical drive — a later stage; then NPPE, ≈ 0.1 % of laryngospasm, becomes
  reachable), or does NPPE stay out of v1?
- **Q-FU6-4 — residual block in an AWAKE patient: RULED, CLOSED (orchestrator, 2026-09-28).** The parameter tables §4.6
  (7f's unit tests) say TOFR 0.6 on a natural airway obstructs > 0.4 even without a hypnotic; Eikermann 2003 says awake
  volunteers at TOFR 0.5–0.7 keep a near-normal VT. **Ruled: the tables' row is the SEDATED patient, Eikermann governs
  the AWAKE one (obstruction present but small, plus a reduced hypoxic response).** Applied: the arousal term
  (`UA_AROUSAL` 0.25, Task 5 Step 5), the NMB arm of `hvrDep` (`HVR_NMB_EMAX` 0.3, Task 10) and the two re-specified 7f
  unit bands under E-FU6-10 — D21. Still Ali's to confirm as a teaching choice: the awake share (0.25) and whether the
  30 % hypoxic blunting should show at extubation (the NN-08 scenario reports it).
- **Q-FU6-5 — ventilatory arousal vs sympathetic blunting.** A noxious stimulus 1.5 under remifentanil 0.1 + propofol
  50 raises VE by +0.6 % (7f's antinociception 0.77 blunts it as it blunts the haemodynamic response); RS5 proposed
  ≥ +20 %. Should breathing be blunted less than the blood pressure? Also: the hypoxic arm's depression sizes (volatile
  C50 0.1 MAC, Emax 0.9; propofol C50 390 ng/mL) are [ENG] from Knill/Dahan directions.
- **Q-FU6-6 — posture for OLV.** RS12's PaO2 150–250 and non-dependent flow ≤ 25 % need the lateral-decubitus gravity
  shift (a new `position` field: patient-level state, touching 7a's perfusion split). A design change — FU-7 or Ali's
  calibration pass?
- **Q-FU6-7 — tachypnoea under volatiles.** Sevoflurane 1 MAC via SGA: RR 15 vs awake 12.3 (1.24×; audit D2: "RR up to
  25–35" and "RR ≥ 1.4×"). The drive's pattern split (hypnotic → rapid shallow) is 7b's; not changed by FU-6.
- **Q-FU6-8 — the truth budget.** `truth-event.test.ts`'s future-tree check sits at 2098/2100 leaves on main; the `hemo`
  beat arrays move it by ±4 between runs, so any added state tips it. FU-6's own `resp` delta is −1 leaf (D16). Raise
  `maxLeaves`, prune `hemo`, or accept the wobble? (FU-4's SKIP_PATH additions may already have made room.) On the
  final applied tree (`94040f7` + every task, D16's absent-at-default fields) the check PASSED in the fast set — the
  question stands because the margin is still ≤ 4 leaves.
- **Q-FU6-9 — bucking size.** Cough pressure 30 cmH2O for 0.5 s at the start of each mechanical breath while light,
  unparalysed and stimulated: Ppeak 18.3 → 40.0 (held at the Pmax, D18). Enough, too much, or should bucking also
  desynchronise the rate?
- **Q-FU6-10 — pregnancy apnoea.** With the set point and VO2, term apnoea to 90 % is 4.83 min (band 2.5–4.5). The
  remaining gap is FRC (the catalogue's −20 % at term, supine not encoded — "supine ×0.9 not encoded") and the ODC. Add
  the supine factor to the catalogue row, or accept?
- **Q-FU6-11 — the child's GA FRC.** 8 mL/kg (from 30 awake: −73 %) was tuned to Patel with the old switch; paediatric
  data show ≈ −35–45 % at induction. With the derived GA state the child reaches 90 % at 3.40 min (band 2–3.2); after
  V.1 this moves again. Keep the tuned 8 or re-derive after V.1?
- **Q-FU6-12 — the capnogram of a breath near the dead space.** Fowler with axial mixing (the Task 8 ramp) draws a
  partial plateau for breaths between 0.6 and 1.4 × the series dead space: after propofol the capnogram still peaks at
  15.6 mmHg (PaCO₂ ≈ 50) while VT is 0.84 × VD, and 0 below 0.6 × VD. The audit proposed "< 15 while VT < dead space".
  Physics says a breath equal to the dead space shows about half the alveolar value at its end; is the stricter
  teaching picture wanted (move the ramp to start at 0.8 × VD), or keep Fowler (RS3b stays `it.fails`)?
- **Q-FU6-13 — the internal ventilator's Pmax default.** 40 cmH₂O (a common factory default) caps every severe
  bronchospasm at Ppeak 40.0 (VT 479 of 500) and pressure-limits COPD at RR 30 (VT 352, PEEPi 13.4, so RS10 runs at Pmax
  80). Keep 40, or default higher (the link's own default is 35)?
- **Q-FU6-14 — rebreathing speed.** FiCO₂ 8 mmHg raises PaCO₂ by +5.9 in 20 min on a fixed VCV and +8 at steady state
  (the body's slow CO₂ store, τ ≈ 80 min in this model); RS14 proposed +6–10 at 20 min. Faster (a smaller slow store) or
  keep?
- **Q-FU6-15 — residual neuromuscular block and the hypoxic response: ANSWERED for the residual-block range
  (orchestrator, 2026-09-28, as part of Q-FU6-4 / D21).** Partial block (TOFR 0.7) depresses the carotid hypoxic
  ventilatory response by ≈ 30 % (Eriksson, Sato & Severinghaus 1993 *Anesthesiology* 78:693; the matrix's NN-08), so
  FU-6's `hvrDep` now carries ONE NMB arm (`HVR_NMB_EMAX` 0.3 ramped over TOFR 0.9 → 0.7, Task 10) instead of
  anaesthetic and opioid arms only; FU-7 adds none. What is still open (a later stage, with Ali): whether the size is
  dose- or agent-specific, and the same reflex's effect on the hypercapnic response (not modelled).
- **Q-FU6-16 — PE ventilation size.** The added J-receptor drive gives the awake massive-PE patient V̇E 18 L/min (2.4 ×
  rest), RR 27, PaCO₂ 30 (D17). Is 2–3 × the resting V̇E the picture you teach?

## Self-review (2026-09-28, the finishing writer)

**Spec coverage.** Audit gaps → tasks: R2 → 2; R6 (bronchospasm) → 3 (PE and tension-pneumothorax aliases are FU-4's);
R3(a) → 4; R3(b, c) → 5, 6; R3(d) → 5 Step 5 + Task 10's `hvrDep` NMB arm (CODED under the Q-FU6-4 ruling, D21;
E-FU6-10); R4 → 7; R5 → 8 (numeric → FU-5); R7 → 9;
R12 → 10; R9 → 11; R8 → 12; R10 → 13 (the rest → 7j); R11 → 14; R13 → 15; R14 → 16; R15 → 17; R1 → FU-4 (Task 0
precondition). The ruling's deliverables: the audit rerunnable → Task 1; the RS1–RS15 suite as SLOW tests → Task 18
(RS15 → Task 9); screenshots → Task 19; gate + PR → Task 20. Rulings honoured: R45 (every missed band is `it.fails` with
its number; E-FU6-10's two 7f bands are RE-SPECIFIED by the orchestrator's Q-FU6-4 ruling, not widened — the tables' own
numbers stay on the arm they describe, D21; the only tunings are [ENG] constants whose comment names the band:
UA_AROUSAL against E-FU6-10's awake rows (not moved), WAKE_MMHG inside 7–10, J_PE_VE_FRAC
inside 1.5–3, the capnogram ramp — none moved in this plan), R50 (reviewed: APPROVE WITH FIXES; findings 1–12 applied,
every ruling marked in place), R51 + addenda (PD entries only in
`l2/pk/data`; the lung reads 7g's bus outputs; `stimulus` keeps one shape; chain order unchanged), R53 (the suite runs
before Ali), R54 (Task 20 §9's matrix table, Task 1's `M-*` scenarios), R56 (glossary labels in titles, rows, the page
and the gate note; proposed labels for the new fields under Requests → Stage 9), R57 (no 7k readout pre-empted; seven
hooks listed under Requests → 7k), R59 (Task 13 = set point + VO2 only; the rest listed under Requests → 7j).

**Mechanical check (the verifier, dry, then applied).** On `origin/main` **`94040f7`** (re-run on `dba7fda` by the
writer and on **`2360894`** by the finisher after the R50 fixes — both docs-only ahead of it) in task order:
**28 creates + 205 edits, 0 errors** (the writer's tree was 185 edits; findings 1–12 added 20) — every find block
matches exactly once at its point of application (blocks that edit a previous task's text match that text).
`npx -y pnpm@9.15.9 -r typecheck` on the applied tree: **clean (8 packages)**. `CI=1 … vitest run test/l2` on it:
**162 files, 765 passed, 1 skipped** — including the two files whose bands E-FU6-10 re-specifies
(`test/l2/neuro/depth-drive.test.ts`, `test/l2/neuro/pipeline.test.ts`: 28 tests green, both arms asserted) and Task
10's new `hvrDep` NMB row. Task 0 Step 3's "expected" line carries 28/205. Edit labels are all `Edit <n> — find` (an
`Edit 3b` label, which the verifier would have skipped silently, was renumbered).

**Tests on the applied tree.** See "Final applied-tree run": fast 250/250 files; slow green except RS1 and Task 17's
two rows (FU-4/V.1 preconditions); ventilator 88 passed + the parity file failing as expected before V.1; the page
smoke green.

**Placeholder scan.** No TBD/TODO/"similar to Task N"; every code step shows its code; every UNPROTOTYPED step says so
and carries the R45 procedure.

**Type and name consistency.** `bronchoDil`/`hpvInhibit`/`anaphEndo` (engine ctx → `RespCtx`), `bd`/`bdExempt`/`gaLvl`
/`palvObs` (`RespState`), `spasm`/`pmusObs`/`pmusFull`/`vdSeriesMl`/`triggerRr`/`buck` (driver), `loc`/`pain`/`hvrDep`
(`NeuroResp`), `UA_AROUSAL`/`HVR_NMB_EMAX`/`HVR_NMB_TOFR_LO` (7f `drive.ts`, D21), `pLimit` (lung mechanics ← `lungDrive`), `J_PE_VE_FRAC`/`J_PE_RR`, `alveolarFraction` (FU-6 defines NO dead-space function: the capnogram reads FU-4's
`physicalDeadSpace`, blocker F1),
`VCV_PMAX_DEFAULT` — each defined once and used under the same name (the typecheck confirms).

**Known limits, stated where they bite.** Every PaCO2/EtCO2 number moves with FU-4's R1 root (Global Constraints); the
child rows and link parity wait for V.1; NPPE and the screenshots are unprototyped; the tick bench was not re-run by the
writer (Task 20 records it); three matrix LUNG cells (NN-08, PD-11, CM-07) are measured by scenario, not banded — the
executor grades them; PD-12 is blocked (FU-4 Requests 3–4).

