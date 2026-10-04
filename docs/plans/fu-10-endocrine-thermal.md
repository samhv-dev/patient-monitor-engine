# FU-10: Endocrine and thermal integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS: **FIXED (2026-10-04; 2,674 lines) — R50 review APPROVE WITH FIXES, all 17 findings and orchestrator rulings
> R-1 … R-12 applied** (review: `scratch/plans-backup/fu-10-review.md`). Re-prototyped on `origin/main` **1b8bdd3**
> (engine code = FU-3 … FU-6, V.1, FU-8 Part A and Stage 7k merged; FU-7 executing on `origin/fu-7-drug-layer`; FU-9 not merged).
> Mechanical check (Self-review): **Part A 71 find/replace blocks + 14 creates, 0 problems, 6 chained (all marked); with B2 78 + 14, 0 problems, 9 chained (all marked) — on `origin/main` `1b8bdd3`**. Part A applied to that base is byte-identical to the prototype patch
> `scratch/plans-backup/fu-10-prototype.patch`, which is now **Part A only** (review F5).
>
> What changed in this pass: A5 (insulin nadir) **dropped** (R-1, nadir held as `it.fails`); A8 (fever) **withdrawn**
> to a proposal pending Ali (R-3, ET-12/13a held as `it.fails`); A7's ketones are a **net** rate that insulin clears
> (R-2); A1 honours D3 (an instructor-cleared MH never restarts) and uses agent-specific volatile latencies (R-8); A2
> lowers both neuraxial cold-defence thresholds (R-7); A3 takes the tables' 34.5 °C (R-4), grades Sessler's bands on a
> surgical arm (R-5) and weights age by depth (R-6); A6 records the Absalom caveat and routes the exogenous
> glucocorticoid into the permissive term (R-9, B7); the `basalInsulin` scenario option is FU-10's (R-10, E-FU10-9);
> the exceptions table is complete (R-11); the slow files go to SLOW_A or `slow-c` (R-12, Task A0 Step 6); B1 carries
> FU-7's four binding rules (F7); every `it.fails` lives in a written test (F12); every new test file is in the plan.
>
> Previous status: WRITTEN (2026-09-30, base `7954933`, 2,366 lines).

**Goal:** make the endocrine and thermoregulatory layer (Stage 7e) behave as the textbooks say in the states the
coverage run ET (`research/14-coverage-endocrine-thermal.md`, 72 cells) found wrong, each by the smallest MECHANISM the
report proposes, in the layer that owns it (R51 chain order and canonical names), with every named cell measured on the
ET runner before and after:

- **E1** an MH-susceptible patient given a volatile and/or suxamethonium develops MH by itself, on the published onset
  course (Part A, A1);
- **E3** a neuraxial block has its own thermoregulation (A2);
- **E5/E6** the thresholds stop at the tables' GA row and fall with age under anaesthesia; Sessler's three phases on a
  surgical patient (A3);
- **E8** the insulin–dextrose row moves glucose (A4);
- **E10/E13** etomidate suppresses cortisol synthesis; adrenal insufficiency is a basal deficit (A6);
- **E7** insulin deficiency: the omitted type 1 basal insulin, a net ketone rate, the DKA potassium (A7);
- Part B (after their predecessors): **E4/E12b** the cold and hypoglycaemic sympathetic drives inside FU-7's seam (B1),
  **E2** oxygen-limited MH heat (B2, after FU-9 A2), **E11b/c** septic lactate and vasoplegic SIRS (B3), **E7d** the
  glycosuric volume deficit (B4), **E9** the AF hazard (B5), **E13b** hypothyroid drug clearance (B6), the exogenous
  glucocorticoid in the permissive term and the hydrocortisone row (B7, after FU-7);
- recorded, not changed: **E12a** the insulin nadir (`it.fails`, Requests → FU-8 Part B), **E11a** fever under GA
  (`it.fails`, Ali), the hypoglycaemic sweating flag (NOT MODELLED, inventory).

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **R44** (Ali's calibration pass is
non-blocking; executors do not tune), **R45** (mechanisms, never band changes; unreachable targets `it.fails` with
numbers), **R51** + addenda 12, 14, 16, 18, 25 (7e owns MH, the thermal model and the endocrine seams; 7f publishes;
7c owns the ketoacid pool and K⁺; the engine chain order), **R53/R54**, **G-FU4** (the hypothermia/shivering cut-off,
the MH hyperthermic-arrest hazard and forced-air warming must not move except as named), the ET routing ("land E2
after FU-9 A2"), and the FU-10 fixer rulings **R-1 … R-12** (2026-10-03). Evidence: `research/14-coverage-endocrine-thermal.md`,
`research/12-coverage-matrix.md` §5.2/§4.8, `research/21-coverage-stimuli-positioning.md` §5 (the SP items),
`scratch/plans-backup/fu-10-review.md`. Plans read for scope so nothing is duplicated: **FU-6** (merged: R4 drug-GA VO₂ =
ET-35; Task 11 patient-triggered ventilation, which changes the "fixed MV" MH rigs — Task A1's rig note), **FU-7**
(executing: Task 9's sympathetic seam and its four rules binding on FU-10; Task 10's surge; Task 18's `cortExo`; D13's
hydrocortisone hand-off), **FU-8** (Part A merged incl. A16's `endo` schema block; Part B: the insulin item), **FU-9**
(A1 renal expansion, A2 the VO₂ line, A4 septic σ, A6 renal K⁺; it creates `slow-c` if it merges first).

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (its own Chromium and WebKit are installed
locally), pnpm 9.15.9 via `npx`. No new dependencies.

---
## Global Constraints

- **R45:** mechanisms, never band changes. No existing acceptance band is widened, removed or re-worded to pass. A band a
  mechanism cannot reach stays (or becomes) `it.fails` with the measured number in its title. A pre-declared `it.fails`
  that a task flips to `it` is named in that task with its before/after numbers. Constants that are not sourced are
  `[ENG]` with the fit target named in the code comment; `[VERIFY]` marks a paper figure quoted from memory (the ET
  report's convention) — it is Ali's to confirm before the R44 pass, and the executor never tunes a constant to pass a
  band (R44). An existing test whose NUMBER moves because the physiology it pinned was the defect is re-pinned only where
  the task names it, with the old and new number and the reason in the test's comment.
- **R51:** canonical names (addendum 14); the engine chain order (validate/apply device → pk (7g) → neuro (7f) → organs
  (7d) → blood (7c) → endo (7e) → Stage 3 → hemo; advance: pk → resp/lung → blood → endo → organs → hemo) is not changed.
  7e stays the ONLY owner of MH and of the heat balance (`rs.temp`); 7f only publishes (`thermoDepth`, `antinoc`, `nmb`
  and, after Task A1, the trigger exposure times); 7c stays the only owner of the ketoacid pool and K⁺ (7e writes
  seams into `blood.core`, as `endoKShift` already does); 7g stays the only owner of drug PK/PD (7e OBSERVES
  `bus.doses`, as it already does for insulin and dextrose).
- **FU-4 arrest behaviour and the hypothermia/MH rows must not move except as named.** Every task that touches the MH
  state, the heat balance, the thresholds or the sympathetic drive names its measured effect on: ET-08a/b, ET-09a/c
  (hypothermia: MAC, NMB, HR/Osborn, VF at 25 °C), ET-10b–e/g, ET-11a–c, ET-M2 (instructor MH and dantrolene), the
  FU-4 engine files `test/engine/{circ-lowflow-arrest,clinical-suite}.test.ts`, and `npx -y pnpm@9.15.9 run
  audit:physiology` (the Gate re-runs it).
- **Base and branch:** branch `fu-10-endocrine-thermal` from `origin/main` (at least `ad05773`; engine code = `176f702`). Worktree
  `projects/patient-monitor-engine/scratch/wt-fu-10` (R25: never the shared checkout). Push after every task's commit
  (`git push -u origin fu-10-endocrine-thermal` the first time, `git push` after). Never push to `main`; never merge
  (the Gate task opens the PR and stops); the PR is never self-merged.
- **Part A / Part B:** Part A (independent of the in-flight plans' files, or on lines they do not touch — named per
  task with the other plan's blocks checked) executes now. Part B starts only when its named predecessors have merged
  (each Part B task says which: FU-7 for the shared sympathetic seam and 7g's files, FU-9 for A2's oxygen line and the
  renal/7c lines); Task B0 is `git fetch origin && git merge origin/main` and re-verifies every Part B block on the
  merged tree. If a predecessor has not merged when Part A is done, the executor runs the Gate for Part A alone (PR
  title suffix "(Part A)") and Part B becomes a second PR from the same plan.
- **Merging main while other stages land:** before any task that edits `engine.ts`, `l2/neuro/**`, `l2/endo/**`,
  `l2/blood/**`, `l2/thermal/**`, `vite.config.ts`, and in the Gate task: `git fetch origin && git merge origin/main`.
  Every edit is a find-and-replace anchored on quoted text that matches EXACTLY ONCE on `origin/main` `ad05773` (a
  block marked "(chained on <task>)" matches once in the applied state, its anchor being the earlier task's text); if a
  block no longer matches byte for byte because another plan merged first, locate the same statement by its quoted
  comment and make the same change (the per-task "Overlap" line names what the other plan does to that file); never
  re-type a line you are not changing.
- **CI rules (CI amendments 1–4, restated so the executor needs no other document):**
  - `CI=1` for engine tests. Long-run horizons come from `test/helpers/longrun.ts` (never a hard-coded 24 h or 6 h).
  - Any test that can exceed ≈ 30 s wall (in practice every engine test running more than one sim-minute) yields once
    per SIM-MINUTE (`if (t % 60 === 0) await new Promise((r) => setImmediate(r))`).
  - Slow files go in the `SLOW` list of `packages/engine-core/vite.config.ts`. CI runs the slow set as two DISJOINT
    groups, `SLOW_A` and `SLOW_B` (= SLOW minus SLOW_A); slow-b ran 37.6 min against its 40 min limit at the FU-4 gate.
    **Ruling R-12:** the FU-10 engine files (`test/engine/fu10-*.test.ts`, one glob) join `SLOW` and `SLOW_A` — unless
    FU-9 has merged first and created `slow-c`, in which case they join `slow-c` instead (Task A0 Step 6 checks and
    rewrites Task A1's `vite.config.ts` block accordingly). The Gate records every group's wall time and stops if
    slow-a would pass ≈ 35 min (measured wall time of the FU-10 files: Prototype results).
  - Packages that drive a real engine in tests keep the 30 s default budget (amendment 3).
  - Never `git stash` (the stash is shared across worktrees). Scratch and logs under `<scratchpad>/fu-10/`, never bare
    file names in the repo.
  - Bounded waits: every wait on a background process is an `until` loop of ≤ 10 min that re-checks the PROCESS (not a
    marker line); re-arm it rather than lengthening it.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Engine test:
  `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>` (paths relative to `packages/engine-core`).
  Physiology audit: `npx -y pnpm@9.15.9 run audit:physiology`. **ET runner** (the measurement every task quotes; ≈ 25
  min for all 72 cells, 5 s – 3 min per cell):
  ```
  cp -R ../research/14-coverage-et-scripts <scratchpad>/fu-10/et      # once (the runner lives outside the repo)
  cd <scratchpad>/fu-10/et
  PME_ENGINE=<worktree>/packages/engine-core/src/index.ts ET_OUT=out/<task>.json ./run.sh cli.ts ET-10 ET-M2 …   # ids or prefixes
  node --experimental-strip-types report.ts   # reads out/cells.json; point ET_OUT's file there to render a table
  ```
  (`../research` is the workspace folder `projects/patient-monitor-engine/research`, next to `repo/`.)
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (swap in your own
  model name if your harness gives another), and every commit is followed by `git push`. The PR body ends with
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Never touch** (other plans own them while in flight): `l2/lung/**`, `l2/resp/**`, `l2/gas/**`, `l2/co2/**`,
  `types-lung.ts`, `types-resp.ts` (FU-6/7k/V.1); `l2/pk/**` (FU-7); `l2/circ/**` except where a Part B task names it;
  `l2/renal/**`, `l2/organs/**` (FU-9) except where a Part B task names it; `packages/ventilator/**`; any UI file;
  `packages/controller/**` except the one schema property and its test (E-FU10-9);
  `docs/physiology/**` (the orchestrator's); `package.json`, `pnpm-lock.yaml`, `.github/**`. In `l2/endo/**` and
  `l2/neuro/**` only the lines a task quotes.
- **Body size:** no new size rule. Heat terms keep Stage 3's `effKg` (the metabolic rule); endocrine terms keep 7e's
  `weightKg`; concentrations 7c integrates use 7c's own ECF volume. FU-8 A13's ONE body-size rule is not redefined.

---
## Finding inventory (every ET gap, and what happens to it)

Decision codes: **task** (a task in this plan), **dropped**/**withdrawn** (by an orchestrator ruling; the cell is held by
an `it.fails`), **handed** (to a named plan or owner), **Ali** (his decision; the model's numbers), **7i v1.1**,
**recorded**, **NOT MODELLED**. Task ids are the task headers below (A5 and A8 keep their numbers as dropped/withdrawn).
"Main" numbers are the ET report's, which the reviewer and this fixer re-measured on the current base (unchanged except
where the Prototype results say so).

| ID | Finding | Cells (verdict on main) | Measured on main | Decision |
|---|---|---|---|---|
| E1 | The MH triggers do nothing | ET-10a (WR) | MH-susceptible + suxamethonium + sevoflurane: MH activity 0 for 90 min | **task A1** |
| E2 | MH heat not limited by O₂: 47.8 °C after death | ET-10g, ET-M2 (the post-arrest course), ET-10d | VF at +45 min ≈ 42.5 °C, then 47.8 °C at 90 min | **task B2** (after FU-9 A2; D12) |
| E3 | Neuraxial = full GA thermoregulation | ET-04 (WR) | depth 1, hour 1 −1.07 °C (0.90 of GA), 34.4 °C at 3 h, no shivering | **task A2** |
| E4 | Cold drives nothing but shivering | ET-05a (TW), 05b (WR), 05c (TW) | 34.5 °C emergence: VO₂ +59 %, NA 275 = 275, HR −2, MAP −0.5 | **task B1** (after FU-7 Task 9; F7's rules); E4(b) demand → CO is audit 09 R11's owner (FU-6 Task 14 took viscosity only) — **handed** |
| E5 | Linear phase slow, plateau late | ET-01b (TW) | draped rig: −0.29 °C/h, vasoconstriction at 6.2 h / 34.55 °C | **task A3** (cap, 34.5 °C, surgical arm — R-4, R-5) |
| E6 | No age term in the thresholds | ET-03a (MI) | 80 y vs 40 y at 4 h: 34.73 vs 34.82 °C | **task A3** (depth-weighted, R-6) |
| E7 | Type 1 never insulin-deficient; no ketones; DKA K⁺ and volume | ET-18a (NE), 18b (MI), 23c (WR), 23d | insulin 10 µU/mL always; ketones 0; `dka 1` K⁺ 3.70 (healthy 4.18), bvRel 1.00 | **task A7** (a–c, incl. the scenario option, R-10) + **task B4** (d, after FU-9 A1) |
| E8 | Insulin–dextrose invisible to glucose | ET-31 (IN) | glucose 0.00 for 3 h | **task A4** |
| E9 | No AF in hypothermia or storm | ET-09b (MI), 13b (MI) | sinus at 28 °C and in storm | **task B5** (after FU-7 Task 12; FU-8 Part A's arrest state is now merged) |
| E10 | Etomidate does not suppress cortisol; shivering-threshold drugs | ET-34 (MI), ET-33 (NE) | cortisol at 4 h 1582 vs 1575 | **task A6** (etomidate); ET-33 **handed** (pethidine/clonidine: FU-7 library) |
| E11a | Fever under GA (sepsis, storm) | ET-12 (TW), 13a (TW) | 36.86 / 36.58 °C | **withdrawn** (ruling R-3) → `it.fails` in Task A8's test file + **Ali** Q7 |
| E11b/c | Septic lactate; SIRS not vasoplegic | ET-26a (TW), 28 (TW) | lactate 1.0; `sirs 1` MAP 88.6 | **task B3** (after FU-9 A2) |
| E12a | Insulin nadir too early | ET-20a (TS) | 13.3 min / 2.92 mmol/L | **dropped** (ruling R-1) → `it.fails` in Task A4's engine file; **Requests → FU-8 Part B** (the insulin disposition) |
| E12b | GA does not mask the hypoglycaemic signs | ET-21a (WR) | HR +26 under GA vs +16 awake | **task B1** (FU-7's seam; arm (f) neutral; the adrenal counter-regulation guarded) |
| E12c | No hypoglycaemic sweating | ET-21b (MI) | sweating thermal only | **NOT MODELLED** in FU-10 (review F15): a cholinergic sweating output has no consumer but the `endo` event's flag; recorded for Stage 9's monitor/console scope |
| E13a | Adrenal insufficiency inert | ET-15a (TW) | MAP 73.73 = 73.73 after induction | **task A6** (basal deficit, permissive SVR) + **task B7** (hydrocortisone, `cortExo` in the permissive term, after FU-7) |
| E13b | Hypothyroid profile thin | ET-14 (WR) | induction fall −22 vs −23 %, emergence +0.7 min | **task B6** (after FU-7) |
| E14 | Hypothermia slows elimination only | ET-08c (TW) | propofol Cp +5 % at 34 °C | **handed: FU-7** (`l2/pk/pipeline.ts`; not in the FU-10 routing) |
| ET-35 | Drug GA vs the GA flag (VO₂) | ET-35 (IN) | −6.8 vs −20.8 % | **handed: FU-6 R4** (merged; the Gate re-measures) |
| ET-16a | Incision pressor small | ET-16a (TW) | +7.7 mmHg | **handed: FU-7 Task 10** |
| ET-19 | Dexamethasone inert | ET-19 (MI) | Δ 0.00 | **handed: FU-7 Task 18** |
| ET-15b | Hydrocortisone not in the library | ET-15b (NE) | rejected | **task B7** (FU-7's plan hands the row to FU-10 once the basal deficit exists — Requests) |
| ET-10f, 24, 25, 32 | Rigidity, phaeochromocytoma, carcinoid, neuraxial stress blunting | NE | — | **handed: FU-7 / FU-7+** |
| ET-08d | Hypothermic coagulopathy | NE | `coagF` unread | **7i v1.1** |
| ET-17 | Glucose at 2 h of surgery 6.85 (band 7–8) | TW | — | **recorded** (calibration) |
| ET-23a | Kussmaul under-compensated 3.9 mmHg | TW | — | **handed: FU-9 A7** |

### The SP coverage run's items (`research/21-coverage-stimuli-positioning.md` §5)

| ID | Finding | Decision |
|---|---|---|
| SP-a | Do cortisol and glucose follow FU-7 Task 10's "the opioid share blunts the RELEASE" rule? (SP-03: sternotomy under 1 MAC + fentanyl releases only +17 pg/mL noradrenaline) | **Decision D10** (no task): the sympathoadrenal RELEASE is FU-7 Task 10's (opioid share, addendum 25); the pituitary–adrenal arm (cortisol) and the glucose that follows it keep their drive — Desborough 2000: ordinary opioid doses do not suppress the cortisol response and hypnotics do not abolish the humoral arm (ET-16b PL, `cortF5vsF0` −0.07). Neither plan adds a second blunting term. |
| SP-b | Tourniquet release cools the core 0.3–0.7 °C (SP-16d) | **NOT MODELLED**: no tourniquet state exists; the redistribution term belongs to the surgical-events stage with the rest of the tourniquet (SP §6). |
| SP-c | The extubation/emergence stress response (hormonal side) | **Decision D11** (no task): it enters through the existing `stimulus`; the haemodynamic side is FU-7 Task 10's; FU-10's B1 adds the COLD side of emergence (E4). |

---
## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — MH is 7e's; 7f only reports the exposure (R51 §6).** 7f publishes `ps.neuro.mhExposure = { sux?, volatile?,
  volatileAgent? }`; 7e turns it into the SAME `rs.temp.mh = { severity, t0 }` the instructor's `condition mh` creates.
- **D2 — the onset is a latency (ruling R-8).** `t0` = the earliest trigger + its latency; Stage 3's `MH_ONSET_S` ramp
  then runs unchanged. Latencies, deterministic: 0 for suxamethonium; for a volatile alone the agent's registry median
  time to the first sign (Visoiu M, Young MC, Wieland K, Brandom BW, Anesth Analg 2014;118:388–396 — sevoflurane ≈ 45
  min, desflurane ≈ 114 min as quoted in secondary sources [VERIFY against the paper]; isoflurane has no quoted median
  and takes desflurane's value, flagged [VERIFY]). The anaesthetic labels give no onset times. Severity 1 (fulminant);
  Ali's Q2 (draw vs fixed; fulminant vs abortive) stays open.
- **D3 — the exposure is consumed once (review F4).** `mhOwner` (`'auto' | 'instructor'`): if the instructor's MH exists
  when the exposure is first seen, the owner is `'instructor'` and the triggers never create MH afterwards — a
  `condition mh 0` stays cleared; an exposure-made onset may be brought forward by a faster trigger while latent.
- **D4 — a neuraxial block acts on its EFFECTORS (ruling R-7).** The blocked fraction (0.5, T10 [ENG]) is dilated and
  cannot shiver; centrally depth 0 with BOTH cold-defence thresholds 0.5 °C lower (Kurz A, Sessler DI, Schroeder M,
  Kurz M, Anesth Analg 1993;77:721–726); `NEURAXIAL_H` stays; the resulting ratio to GA is accepted.
- **D5 — the thresholds (rulings R-4, R-5, R-6).** The depth the thresholds read is capped at the GA row;
  `VASOCONSTRICT_C` is the tables' 34.5 °C; the age shift is weighted by depth (Kurz 1993 vasoconstriction; Vassilieff
  1995 shivering); Sessler's bands are graded on a SURGICAL arm with the existing `prep` exposure (no new wound term);
  `PREP_EVAP_W_70` (40 W, [ENG]) joins the calibration queue as the knob for the onset time.
- **D6 — the insulin–dextrose row is expanded for GLUCOSE only; K⁺ stays 7c's.** On the fixed tree the combined row's
  K⁺ fall at 60 min is −0.96 (band −1.0 to −0.6, now held by a test; the first draft's −1.18 included a hyperosmolar
  efflux that F17's gating removes). The two-row arm's −0.68 differs because 7c's curve and 7g's insulin `kShift` are
  two pre-existing K⁺ sources — Ali Q4, not changed here.
- **D7 — insulin deficiency is one state (ruling R-2).** (a) `endo.basalInsulin: false`; (b) a NET ketone rate through
  the E-FU10-2 seam pair (production from the current deficit, τ 30 min; insulin-dependent utilisation of 7c's pool —
  the instructor's `dka` pool included, which is therefore treatable; `condition dka 0` clears it as today);
  (c) insulinopenia (smoothed deficit or the instructor's `dka`) shifts K⁺ out, plus hyperosmolality in the
  insulin-deficient patient only; (d) the glycosuric volume loss is Part B (B4).
- **D8 — etomidate suppresses the cortisol RESPONSE (ruling R-9).** t½ 8 h for a single induction dose in an elective
  patient (Wagner 1984); Absalom A, Pledger D, Kong A, Anaesthesia 1999;54:861–867 found ≥ 24 h in the critically ill
  (Vinclair 2008: resolution by 48 h) — recorded as a caveat and an Ali calibration row, not modelled.
- **D9 — adrenal insufficiency is a BASAL deficit with a permissive vascular effect.** Basal cortisol ×0.5; cortisol
  below basal costs resting SVR (`CORT_SVR_PERMISSIVE` 0.25 [ENG], below basal only). The exogenous glucocorticoid JOINS
  that term (ruling R-9, review F16) — Task B7, once FU-7's `cortExo` exists.
- **D10 — the two stress arms are blunted at different points (SP-a)**; **D11 — no new stimulus events (SP-b, SP-c).**
- **D12 — E2 lands only after FU-9 A2** (measured both ways; on today's main it abolishes the MH arrest).
- **D13 — FU-7's four rules bind B1 (review F7):** (i) FU-10's sympathetic sources enter `extraSymp`, never `h.surge`;
  (ii) the COLD drive is a noradrenaline RELEASE and is multiplied by `catReserve`, the hypoglycaemic adrenal response
  is not; (iii) FU-7 Task 10's guard arm (f) (hypoglycaemia) is FU-10's regression guard — its `surgeF`/`surgeCat` stay
  exactly neutral; (iv) B1 re-anchors on FU-7's landed `h.surge`/`catReserve` lines and does not reorder them. The
  masking reads the WHOLE antinociception (`antinoc`, hypnotic + opioid — unconsciousness masks the signs), not
  FU-7's `antinocOp`.

---
## Prototype results (fixer pass)

**Trees.** Main = `origin/main` `09c58ca` (engine code = `176f702`: FU-6 merged — which moved several ET rows on its own,
e.g. ET-10b's instructor-MH EtCO₂ at 15 min 63.4 → 49.6 because the patient now triggers breaths, ET-35 TW → PL, ET-09a HR
40 → 47); Part A = A1–A4, A6, A7 and A8's `it.fails` file applied to it (= `scratch/plans-backup/fu-10-prototype.patch`,
Part A only). Re-checked on `1b8bdd3` (Stage 7k merged): the blocks apply, typecheck clean, `test/l2` 183 files / 864
passed, `packages/controller` scenario tests 102 passed, and the FU-10 engine files (6 files, 16 tests) together with `endo-acceptance` and `thermal-warmer` pass.

**ET matrix, all 72 cells, automatic verdicts** (the runner's `hand` notes are main-branch diagnoses): automatic verdicts main PL 35, WR 13, TW 10, TS 4, MI 2, NE 8 → Part A PL 38, WR 9, TW 10, TS 5, MI 2, NE 8; six cells change verdict: ET-10a, ET-31, ET-34 → PL; ET-23c WR → TW; ET-04 WR → TS (the ratio, accepted by R-7); **ET-07 TW → TS (−1.02 °C vs −1.0: the consequence of R-4, reported)**. Every
moved number is listed per task below (review F11) — nothing else moved.

| Task | Before (main) → after (Part A), band |
|---|---|
| A1 (E1) | suxamethonium + sevoflurane at 300 s with the ventilation held fixed (rocuronium after the suxamethonium — FU-6's merged patient-triggered breaths would otherwise raise it): EtCO₂ doubles at **+18.2 min** (band 10–30; main: never); sevoflurane alone: MH activity from **+48.5 min** (median 45 min + the ramp to a detectable activity); not susceptible: 0. ET-10a `mhDevelops` **true** (WR → PL), EtCO₂ max 52.6 (main 28.4). The instructor-MH rows (ET-10b–g, ET-11, ET-M2) move by ≤ 0.01 °C (tcMax 47.77 → 47.76) and the untreated comparison arm of ET-11 by +0.9 mmHg EtCO₂ at 30 min (18.23 → 19.15). D3: the instructor-cleared case is a unit test. **FU-4 check:** the arrest table of `audit:physiology` is identical in every arrest time. |
| A2 (E3) | ET-04: hour 1 **−0.84 °C** (main −1.07; GA −1.19), ratio **0.71** (accepted, R-7), core **35.30 °C** at 3 h (main 34.41), shivering from **35.48 °C** (main: never), depth **0** (main 1). Heat model alone: −0.86 vs GA −1.25 °C, shivering from 35.49 °C. Stage 3's neuraxial test re-stated (E-FU10-3a). |
| A3 (E5/E6) | Surgical arm (open wound from +15 min): hour 1 **−1.44 °C**, hours 2–3 **−0.492 °C/h**, vasoconstriction at **34.50 °C**, plateau **−0.087 °C/h** — all in Sessler's bands; onset **2.27 h** (band 3–4 → `it.fails`, the `PREP_EVAP_W_70` calibration knob, R-5). Draped demonstration: −1.18 / −0.300 °C/h / 6.30 h at 34.50 °C (main 6.17 h at 34.555). 80 y vs 40 y on the surgical arm: onset **33.50 vs 34.50 °C**, core at 4 h **33.43 vs 34.28** (Kurz 1993's −1 °C). ET-03a's draped rig: the elderly hour-1 fall is unchanged (−1.19, review F8's −0.98 is gone with the depth weighting), `d4h` −0.04 and no elderly onset inside 7 h (MI kept, measured on the surgical arm instead). The Stage 3 GA heat model now plateaus at **34.37 °C** in hour 8 (`it.fails`, E-FU10-3b). **Rows this moves (R-4's lower threshold keeps an anaesthetised patient vasodilated 0.3 °C longer):** ET-07 cold blood core −0.89 → **−1.02 °C** (band −0.5 to −1.0: TW → **TS by 0.02**; reported, not tuned — Ali Q12), ET-02 cold arms 34.54 → 34.30 / 34.79 → 34.61 (the warmed arms unchanged, PL), ET-03b child at 3 h 34.69 → 34.43 (direction PL), ET-05a–d emergence core 34.49 → 34.26 with shivering VO₂ +47.5 → +69.6 % and shivering 56 → 79 W (verdicts unchanged), ET-29 −0.50 → −0.53, ET-09a CO at 28 °C 3.44 → 4.33 L/min (HR 47 and Osborn unchanged), ET-08c CO 5.17 → 5.30, ET-12/13a cores 36.86 → 36.60 and 36.58 → 36.34 °C. |
| A4 (E8) | ET-31 combined row **+6.93 / −2.42 mmol/L**, identical to the two-row arm (IN → PL); K⁺ at 60 min **−0.96** (band −1.0 to −0.6, held by the engine test; two-row arm −0.68). Engine test: max +11.17, min −2.68 mmol/L, K⁺ −0.96. ET-20a/b's insulin-alone K⁺ at 60 min −0.78 → −0.62 (its graded minimum −0.87 → −0.86, PL). The insulin-nadir `it.fails` (13.3 min) is in this task's engine file (A5 dropped). |
| A6 (E10/E13) | ET-34 cortisol at 4 h **1031 vs 1575 nmol/L = 0.655** (TS → PL; engine test 0.653). ET-15a: post-induction MAP **70.02 vs 73.51**, surgical **−4.1** mmHg (engine test −4.2; band beyond 5 → `it.fails`), phenylephrine **0.68** of normal (PL), cortisol **233 vs 532**. Healthy patients bit-identical in every stress row (ET-16a–c within 0.4 nmol/L of cortisol). |
| A7 (E7) | Engine test, type 1 with the basal insulin omitted 6 h: glucose **35.5 mmol/L**, ketones **11.5 mmol/L**, pH **7.31**, K⁺ **6.05** (on basal insulin: 7.2 / 0 / 4.17). Insulin 0.1 units/kg/h from 6 h: ketones **11.53 → 8.88 in 3 h (0.88 mmol/L/h, JBDS ≥ 0.5)**, glucose 5.1 mmol/L, K⁺ **3.25** (the expected fall on insulin). ET-23c (instructor `dka 1`): K⁺ **4.48 vs healthy 4.18** (main 3.68), after intubation +0.38 (main −0.01); WR → TW (auto; the report's §7 item 'K⁺ ≥ healthy' is met). ET-23a–d otherwise within 0.3 (HCO₃ 4.30 → 4.63: the instructor pool is now utilised at the insulin the patient has). Non-diabetic rows unchanged. |
| A5, A8 | no code: ET-20a (13.3 min) and ET-12/13a held by `it.fails` |
| small moves elsewhere | ET-26a warm/cold CO 5.02 → 4.93 / 4.49 → 4.36 L/min, ET-26c dobutamine ΔCO +0.34 → +0.79 (PL), ET-26b noradrenaline ratio 0.30 → 0.31 (PL) — the septic GA-flag rigs run 0.2–0.3 °C cooler after A3; ET-16a–c ΔMAP ≤ 0.05 mmHg and cortisol ≤ 0.4 nmol/L; ET-18 ≤ 0.01; ET-22 ≤ 0.01; ET-27a–c ≤ 0.03; ET-28 ≤ 0.05; ET-01a k_cp +0.06 W/°C; ET-06 −0.001; ET-08b Ce ± 0.3 |

**`audit:physiology` (FU-4 check), main → Part A:** the arrest table is identical in every arrest time (the A-, L-, K- and X-rows: tamponade, exsanguination, tension PTX, hyperkalaemia, VF/CPR); the propofol state-dependence table moves in ONE row — warm septic shock ΔMAP nadir −28.6 → −28.7 mmHg, ΔCO −0.46 → −0.51 L/min (the septic GA-flag rig runs cooler after A3); the 80 y hypertensive and AS + CAD rows are unchanged (the review's elderly moves are gone with the depth-weighted age term). Timeline rows elsewhere differ only in the second decimal (temperature-dependent outputs)

**Suites on the Part A tree:** typecheck (whole repo) clean; `test/l2` green (the re-pinned `temp.test.ts`,
`thresholds.test.ts`, `core.test.ts`, `neuro/pipeline.test.ts` included; the 75 g OGTT test untouched and green);
engine: the six `fu10-*` files, `endo-acceptance`, `endo-circ-acceptance`, `thermal-warmer`, `endo-seams`,
`endo-wiring`, `blood-hyperk`, `blood-ecg`, `blood-k-rhythm`, `blood-sanity-acid`, `neuro-engine` — all green.
**Slow-group budget (R-12):** ≈ 1,110 s of test time for the six `fu10-*` engine files before memoising the shared arms (thresholds 418 s, insulin-omission 264 s, adrenal 179 s, insulin-dextrose 139 s, mh-trigger 66 s, fever 44 s); memoised: the thresholds file now runs 3 seven-hour arms instead of 5 and the adrenal file 2 adrenal arms instead of 4; under a parallel `audit:physiology` load the six files took 2,014 s of test time, so the unloaded sequential cost is ≈ 15–18 min — the Gate measures it after. Added to slow-a that would push it past the ≈ 35 min stop line, so Task A0
Step 6 matters: if FU-9 has created `slow-c`, the glob goes there; if not, the Gate measures slow-a and asks the
orchestrator before merging (the stop rule).

**B2 (Part B, not in the patch):** the first pass's and the reviewer's numbers (with FU-9 A2 simulated, before FU-6):
pre-arrest course identical, tcMax 47.77 → 42.34 °C; without FU-9 A2 the MH arrest is lost. Re-measured at B2's turn.

---
## Exceptions (edits outside 7e's own partition; each needs the orchestrator's approval — ruling R-11)

| id | Edit | Why it cannot live in 7e | Task |
|---|---|---|---|
| **E-FU10-1** | `l2/neuro/pipeline.ts`: `NeuroState.mhExposure` and the two trigger sites that already write the `mhTrigger` mark; **and** `test/l2/neuro/pipeline.test.ts`: one added assertion (`ns.mhExposure` equals `{ sux: 0 }`) in the existing succinylcholine-mark test | only 7f sees the doses and the volatile MAC; R51 §6 keeps MH itself in 7e, so 7f publishes and nothing more | A1 |
| **E-FU10-2** | `l2/blood/core.ts`: ONE statement — 7e's net ketone rate (production − utilisation × pool) into 7c's ketoacid pool | 7c owns the pool and everything that follows from it (pH, anion gap, `dkaSeverity`, the instructor's `dka`) | A7 |
| **E-FU10-3** | `test/l2/temp/temp.test.ts`: (a) the Stage 3 neuraxial test's "no plateau" assertions `tc[419] − tc[479] > 0.1` and `tc[479] < 34.5` are REMOVED and replaced (hour-2 fall ≥ 0.3; hour 8 below the lowered shivering threshold with shivering) — they pinned the GA thresholds the neuraxial state took; (b) the GA test's hour-8 lower edge (≥ 34.5 °C) moves to an `it.fails` "measured 34.37" — the consequence of ruling R-4 | the tests pinned the defect / an [ENG] constant the ruling re-sources | A2, A3 |
| **E-FU10-4** | `test/l2/endo/core.test.ts`: the `T1` fixture gains `basalInsulin: true` | `EndoProfile` is exhaustive | A7 |
| **E-FU10-5** (Part B) | `l2/circ/arrest.ts` (+ its params): the AF onset hazard beside the VF hazard | the seeded hazard frame is 7a's | B5 |
| **E-FU10-6** (Part B) | `l2/pk/pipeline.ts` `clFactor`: the hypothyroid clearance factor | 7g owns drug PK (R51 §1) | B6 |
| **E-FU10-7** (Part B) | `l2/blood/core.ts` and `l2/blood/oxygen.ts`: the septic extraction ceiling seam (one statement each) | 7c owns oxygen delivery and lactate | B3 |
| **E-FU10-8** (Part B) | `l2/organs/pipeline.ts`: the glycosuric osmotic urine added to 7d's renal seam | 7d owns the urine | B4 |
| **E-FU10-9** | `packages/controller/scenarios/pme-scenario-1.schema.json`: the one `basalInsulin` property in `patient.endo`; `packages/controller/test/scenario/fu10-basal-insulin.test.ts` (new) | FU-8 A16 (merged) owns the block; ruling R-10 gives the property to FU-10 | A7 |
| **E-FU10-10** | `test/l2/thermal/thresholds.test.ts`: the GA vasoconstriction centre 34.8 → 34.5 and the full-constriction point 34.0 → 33.8 (0.7 °C below the centre, the same property) | ruling R-4 re-sources the constant | A3 |
| **E-FU10-11** (Part B) | `l2/pk/data/rows-*.ts` + the glucocorticoid PD target's potency: the hydrocortisone row | 7g owns the rows; FU-7's plan hands this row to FU-10 | B7 |

---
## Handed to other plans, and Requests (nothing here is FU-10's to change)

- **FU-6 (merged) R4:** ET-35 — the Gate re-measures it. FU-6 Task 11's patient-triggered ventilation means the ET "fixed
  MV" MH rigs need paralysis after suxamethonium to stay fixed (Task A1's rig note); research/14's ET-10a/b rigs are
  the auditor's to update — **Request → the ET runner owner.**
- **FU-7:** Task 10 (ET-16a/M3), Task 18 (ET-19), the library items (ET-33 pethidine/clonidine, ET-10f rigidity,
  ET-24/25, ET-32), E14. **D13 / hydrocortisone:** FU-7's plan hands the row to FU-10 once the basal deficit exists —
  Task B7 takes it (after FU-7 merges), with `cortExo` joining the permissive term. **Task 9's seam:** bound by D13.
  **The merged `stressEffects(…)` call** is given in Task A6.
- **FU-8 Part B (Request, ruling R-1):** the insulin nadir (ET-20a: 13.3 min vs 20–30) needs the insulin's own
  disposition — FU-8 Part B's insulin item (B1, the insulin row) is asked to carry it; FU-10's `it.fails` holds it.
- **FU-9:** A2 is B2's and B3's precondition (D12); A1 is B4's; A4's `BloodLike` line is shared with A7 (merged form in
  A7); A6 (renal K⁺) is measured beside A7's K⁺ terms at the Gate; A7 owns ET-23a's Kussmaul set point.
- **Audit 09 R11's owner:** E4(b), metabolic demand → cardiac output (FU-6 Task 14 took viscosity only).
- **7i (v1.1):** ET-08d. **The surgical-events stage:** the tourniquet (SP-b). **Stage 9:** the hypoglycaemic sweating
  flag, if the console wants it (E12c).
- **research/14's runner:** its ET-04 source string carries the wrong Kurz reference ("Anesthesiology 1993;79:1193 …
  the shivering threshold only"); the correct one is Kurz, Sessler, Schroeder, Kurz, Anesth Analg 1993;77:721–726,
  which lowered BOTH thresholds — **Request → the auditor** (review F9a).

---
## File map

| File | Tasks | Owner / exception | What changes |
|---|---|---|---|
| `src/l2/thermal/params.ts` | A1, A2, A3 | 7e | MH latencies (agent-specific) and severity; the neuraxial block fraction and threshold shift; `VASOCONSTRICT_C` 34.5, `THR_DEPTH_MAX`, the age term |
| `src/l2/thermal/mh.ts` | A1 | 7e | `MhExposure`, `MhOwner`, `mhOnsetT`, `mhFromExposure` |
| `src/l2/thermal/heat.ts` | A2, A3, (B2) | 7e | the neuraxial effector fraction and thresholds; `ageY`; (B2: `o2F`, the aerobic-heat limit) |
| `src/l2/thermal/thresholds.ts` | A3 | 7e | the depth cap, `ageShiftC`, depth-weighted age |
| `src/l2/endo/pipeline.ts` | A1, A3 | 7e | the MH-from-exposure step and `mhOwner`; `ageY` written into the heat model |
| `src/l2/endo/core.ts` | A6, A7, (B1, B7) | 7e | `cortResponseOf`, `cortBasalF`, `etomSuppr`; `basalInsulin`, `ketoDef`, `insulinopenia`, the ketone outputs and K⁺ terms |
| `src/l2/endo/params.ts` | A4, A6, A7, (B1) | 7e | the combined-row regimen; adrenal/etomidate constants; ketone and K⁺ sizes |
| `src/l2/endo/adapters.ts` | A4, A6, A7, (B2) | 7e | the dose observer (combined row, etomidate); the ketone seam pair; (B2: `o2Fraction`) |
| `src/l2/endo/effects.ts` | A6, (B7) | 7e | cortisol's permissive vascular term; (B7: + `cortExo`) |
| `src/l2/endo/hormones.ts` | A6, (B1) | 7e | the basal-cortisol factor; (B1: the cold drive's release) |
| `src/types-endo.ts` | A7 | 7e | `EndoProfileInput.basalInsulin` |
| `src/l2/neuro/pipeline.ts` + its test | A1 | **E-FU10-1** | `mhExposure` (+ agent) |
| `src/l2/blood/core.ts` | A7 | **E-FU10-2** | the net ketone statement |
| `vite.config.ts` | A1 | 7e | `test/engine/fu10-*.test.ts` into `SLOW` and `SLOW_A` (or `slow-c`) |
| `packages/controller/scenarios/pme-scenario-1.schema.json` + test | A7 | **E-FU10-9** | `patient.endo.basalInsulin` |
| tests re-pinned | A2, A3, A7 | **E-FU10-3/4/10** | `temp.test.ts`, `thresholds.test.ts`, `core.test.ts` |
| tests new (all written out in their tasks) | A1–A8 | — | `test/helpers/fu10.ts`; `test/l2/thermal/fu10-{mh-exposure,neuraxial,thresholds}.test.ts`; `test/l2/endo/fu10-{insulin-dextrose,adrenal,insulin-deficit}.test.ts`; `test/engine/fu10-{mh-trigger,thresholds,insulin-dextrose,adrenal,insulin-omission,fever}.test.ts`; `packages/controller/test/scenario/fu10-basal-insulin.test.ts` |
| Part B files | B1–B7 | E-FU10-5…8, 11 | named in each task |

---
## Part A — independent of FU-7 and FU-9 (executes now)

### Task A0: Base check — the branch, the worktree, the find blocks, the before-numbers, the slow group (no code change)

- [ ] **Step 1 — the worktree and the branch.**
```
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin && git worktree add ../scratch/wt-fu-10 -b fu-10-endocrine-thermal origin/main
cd ../scratch/wt-fu-10 && npx -y pnpm@9.15.9 install --frozen-lockfile
```
- [ ] **Step 2 — the base.** `git log --oneline -1` (≥ `ad05773`). Expected merged: FU-3 … FU-6, V.1, FU-8 Part A (incl.
  A16's `endo` schema block). Record whether FU-7 and FU-9 have merged (`git log --oneline origin/main | head -30`);
  each Part B task names the one it waits for.
- [ ] **Step 3 — every find block on this base.** Apply the plan's blocks in document order with a checker (the
  writer's: `scratch/plans-backup/fu-10-plan-tools/check_plan.py`) and assert each find occurs exactly once in the
  applied state; the blocks marked "(chained on <task>)" are the only ones that do not occur on `origin/main` itself.
  The fixer measured Part A 71 find/replace blocks + 14 creates, 0 problems, 6 chained (all marked); with B2 78 + 14, 0 problems, 9 chained (all marked) — on `origin/main` `1b8bdd3`. If a block fails because another plan merged first, re-anchor it on the merged statement
  by its quoted comment (each task's Overlap line gives the merged form).
- [ ] **Step 4 — the ET runner and the before-numbers.** Copy `research/14-coverage-et-scripts` to `<scratchpad>/fu-10/et`
  and run all 72 cells against the worktree (`PME_ENGINE=…/packages/engine-core/src/index.ts ET_OUT=out/before.json
  ./run.sh cli.ts all`). Compare with the Prototype results' "main" column; a moved cell means a stage merged in between
  — record it before changing anything.
- [ ] **Step 5 — the suites before.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2 test/engine`
  and `npx -y pnpm@9.15.9 run audit:physiology`; keep both logs.
- [ ] **Step 6 — the slow group (ruling R-12).** `grep -n "slow-c\|SLOW_C" packages/engine-core/vite.config.ts .github/workflows/ci.yml`.
  If FU-9 has created `slow-c`, Task A1's `vite.config.ts` block adds the `fu10-*` glob to `SLOW` and to FU-9's
  `SLOW_C` list instead of `SLOW_A` (same two lines, the other list); otherwise as written. Record which.
- [ ] **Step 7 — no commit.**

---
### Task A1: E1 — an MH-susceptible patient given its triggers develops MH (7f publishes the exposure, 7e owns the MH state; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU10-1**: `NeuroState.mhExposure`, the two trigger sites)
- Modify: `packages/engine-core/test/l2/neuro/pipeline.test.ts` (**E-FU10-1**: the 7f mark test also asserts the exposure)
- Modify: `packages/engine-core/src/l2/thermal/{params,mh}.ts` (the latencies; `MhExposure`, `MhOwner`, `mhOnsetT`, `mhFromExposure`)
- Modify: `packages/engine-core/src/l2/endo/pipeline.ts` (`mhOwner`; the per-pass step)
- Modify: `packages/engine-core/vite.config.ts` (`test/engine/fu10-*.test.ts` joins `SLOW` and `SLOW_A` — or `slow-c`, Task A0 Step 6)
- Create: `packages/engine-core/test/helpers/fu10.ts`, `test/l2/thermal/fu10-mh-exposure.test.ts`,
  `test/engine/fu10-mh-trigger.test.ts`
- **Overlap:** FU-6 (merged) and FU-7 Tasks 5–7, 14 edit `l2/neuro/pipeline.ts` on other statements (`IDLE_RESP`, the
  `neuroResp({…})` and `depth({…})` calls, `NeuroEnv`, `ec50Multipliers`); this task touches `NeuroState`'s field list
  and the two `mhSusceptible` blocks, which no other plan quotes. FU-8 (merged) put the `fu8-*` glob on the two
  `vite.config.ts` lines this task anchors on.

**Why (research/14 E1, ET-10a WR):** 7f marks `mhTrigger` at the succinylcholine dose and at MAC > 0.1 and **nothing
reads the mark**; Stage 3's `rs.temp.mh` is created only by the instructor's `condition mh`. Measured on main: the
susceptible patient given suxamethonium and sevoflurane keeps MH activity 0 for 90 minutes.

**Mechanism (D1–D3):** 7f publishes WHEN each trigger first reached a susceptible patient, and WHICH volatile
(`ps.neuro.mhExposure = { sux?, volatile?, volatileAgent? }`); 7e's per-pass step turns the earliest exposure plus its
latency into the same `rs.temp.mh = { severity, t0 }` the instructor creates. The exposure is consumed once
(`mhOwner`): an instructor MH already present makes the owner `'instructor'`, after which the triggers never create MH —
so `condition mh 0` stays cleared (review F4).

**Measured (fixed prototype, current main):** suxamethonium + sevoflurane at 300 s with the ventilation held fixed (rocuronium after the suxamethonium — FU-6's merged patient-triggered breaths would otherwise raise it): EtCO₂ doubles at **+18.2 min** (band 10–30; main: never); sevoflurane alone: MH activity from **+48.5 min** (median 45 min + the ramp to a detectable activity); not susceptible: 0. ET-10a `mhDevelops` **true** (WR → PL), EtCO₂ max 52.6 (main 28.4). The instructor-MH rows (ET-10b–g, ET-11, ET-M2) move by ≤ 0.01 °C (tcMax 47.77 → 47.76) and the untreated comparison arm of ET-11 by +0.9 mmHg EtCO₂ at 30 min (18.23 → 19.15). D3: the instructor-cleared case is a unit test. **FU-4 check:** the arrest table of `audit:physiology` is identical in every arrest time.

- [ ] **Step — the edits and the new files** (each find matches exactly once in application order):

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
```

Replace with:

```ts
  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
  /** FU-10 E1: when an MH-susceptible patient was first exposed to each trigger (s) — read by Stage 7e, which owns MH
   * (R51 §6) and turns the exposure into the MH state with the trigger's onset latency. Absent = never exposed. */
  mhExposure?: { sux?: number; volatile?: number; volatileAgent?: string };
```

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
    if (ns.profile.mhSusceptible && !ns.flags.mhMarked) {
      mark(ns, d.t, 'mhTrigger');
      ns.flags.mhMarked = true;
    }```

Replace with:

```ts
    if (ns.profile.mhSusceptible) {
      ns.mhExposure = { ...ns.mhExposure, sux: ns.mhExposure?.sux ?? d.t }; // FU-10 E1: 7e reads it
      if (!ns.flags.mhMarked) {
        mark(ns, d.t, 'mhTrigger');
        ns.flags.mhMarked = true;
      }
    }```

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  if (ns.profile.mhSusceptible && !ns.flags.mhMarked && x.macPotent > MH_VOLATILE_MAC) {
    mark(ns, t, 'mhTrigger');
    ns.flags.mhMarked = true;
  }```

Replace with:

```ts
  if (ns.profile.mhSusceptible && x.macPotent > MH_VOLATILE_MAC && ns.mhExposure?.volatile === undefined) {
    // FU-10 E1: 7e reads the time and the agent (the potent volatile with the largest end-tidal MAC fraction)
    let agent = '';
    let best = -1;
    for (const [id, v] of Object.entries(x.et)) {
      const f = id !== 'n2o' && v && v.macAge > 0 ? v.fet / v.macAge : -1;
      if (f > best) { best = f; agent = id; }
    }
    ns.mhExposure = { ...ns.mhExposure, volatile: t, volatileAgent: agent };
    if (!ns.flags.mhMarked) {
      mark(ns, t, 'mhTrigger');
      ns.flags.mhMarked = true;
    }
  }```

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const DANT_GAIN = 1.6;
```

Replace with:

```ts
export const DANT_GAIN = 1.6;
/**
 * FU-10 E1 — MH from its triggers in a susceptible patient (7f publishes the exposure times; the MH state is 7e's).
 * Onset latency after each trigger: succinylcholine starts the hypermetabolism at once (the Stage 3 ramp then reaches
 * full activity over MH_ONSET_S, so EtCO2 doubles ≈ 14 min after the dose); a volatile alone starts it later. Direction:
 * Visoiu M, Young MC, Wieland K, Brandom BW, Anesth Analg 2014;118:388–396 (North American MH Registry, 477 cases: onset
 * is shorter after succinylcholine with every volatile; without succinylcholine sevoflurane is faster than isoflurane or
 * desflurane); Larach MG et al., Anesth Analg 2010;110:498–507 (clinical presentation) [VERIFY the medians]. Magnitudes
 * [ENG]: 0 s with succinylcholine; for a volatile alone the agent's registry median (below). Severity 1 = the
 * fulminant course of the instructor's `condition mh 1` (Ali Q2, open: fixed vs a seeded draw; fulminant vs abortive).
 */
export const MH_SUX_LATENCY_S = 0;
/** FU-10 E1 (orchestrator ruling R-8): the volatile-alone latency is agent-specific and deterministic — the registry's
 * median time to the first sign without succinylcholine (Visoiu 2014: sevoflurane ≈ 45 min, desflurane ≈ 114 min, as
 * quoted in secondary sources [VERIFY against the paper]; isoflurane has no median in those sources — the desflurane
 * value is used and flagged [VERIFY]; halothane is not a library agent). Any other agent takes the sevoflurane value. */
export const MH_VOLATILE_LATENCY_S: Readonly<Record<string, number>> = { sevoflurane: 45 * 60, desflurane: 114 * 60, isoflurane: 114 * 60 };
export const MH_VOLATILE_LATENCY_DEFAULT_S = 45 * 60;
export const MH_PROFILE_SEVERITY = 1;
```

In `packages/engine-core/src/l2/thermal/mh.ts`, find:

```ts
import { DANT_GAIN, MH_ONSET_S, MH_RELAX_TAU_S } from './params.ts';
```

Replace with:

```ts
import {
  DANT_GAIN, MH_ONSET_S, MH_PROFILE_SEVERITY, MH_RELAX_TAU_S, MH_SUX_LATENCY_S, MH_VOLATILE_LATENCY_DEFAULT_S, MH_VOLATILE_LATENCY_S,
} from './params.ts';
```

In `packages/engine-core/src/l2/thermal/mh.ts`, find:

```ts
/** 1 Hz (or any dt ≤ 1 s) update```

Replace with:

```ts
/** FU-10 E1: an MH-susceptible patient's trigger exposure (7f `ps.neuro.mhExposure`, times in s). */
export interface MhExposure {
  sux?: number;
  volatile?: number;
  volatileAgent?: string; // the potent volatile that triggered (its latency is agent-specific)
}

/** FU-10 E1: who made the current MH state — the triggers ('auto') or the instructor ('instructor'); absent = nobody yet. */
export type MhOwner = 'auto' | 'instructor';

/** FU-10 E1: the MH onset time the exposure implies (the earliest trigger + its latency), or null (not exposed). */
export function mhOnsetT(x: MhExposure | undefined): number | null {
  const vLat = MH_VOLATILE_LATENCY_S[x?.volatileAgent ?? ''] ?? MH_VOLATILE_LATENCY_DEFAULT_S;
  const ts = [x?.sux !== undefined ? x.sux + MH_SUX_LATENCY_S : Infinity, x?.volatile !== undefined ? x.volatile + vLat : Infinity];
  const t0 = Math.min(...ts);
  return Number.isFinite(t0) ? t0 : null;
}

/**
 * FU-10 E1 (D3): start (or bring forward) the MH of a susceptible patient from its triggers. The exposure is CONSUMED
 * once: if the instructor's MH already exists when the exposure is first seen, the owner becomes 'instructor' and the
 * triggers never create MH afterwards (so `condition mh 0` stays cleared); if the triggers made it ('auto'), a later,
 * faster trigger may bring a still-latent onset forward, and an MH the instructor clears is not restarted.
 */
export function mhFromExposure(mh: MhState | null, x: MhExposure | undefined, owner: MhOwner | undefined, t: number): { mh: MhState | null; owner: MhOwner | undefined } {
  const t0 = mhOnsetT(x);
  if (t0 === null) return { mh, owner };
  if (owner === undefined) return mh === null ? { mh: { severity: MH_PROFILE_SEVERITY, t0 }, owner: 'auto' } : { mh, owner: 'instructor' };
  if (owner === 'auto' && mh !== null && t < mh.t0 && t0 < mh.t0) return { mh: { ...mh, t0 }, owner };
  return { mh, owner };
}

/** 1 Hz (or any dt ≤ 1 s) update```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
```

Replace with:

```ts
import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
import { mhFromExposure, type MhExposure, type MhOwner } from '../thermal/mh.ts';
```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
```

Replace with:

```ts
  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
  mhOwner?: MhOwner; // FU-10 E1 (D3): who made the MH state once an exposure was seen (absent = no exposure yet)
```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // Stage 7g's dantrolene effect → the MH suppression (thermal/mh.ts)
```

Replace with:

```ts
  th.dantE = pk?.bus?.metabolic?.dantroleneE ?? 0; // Stage 7g's dantrolene effect → the MH suppression (thermal/mh.ts)
  // FU-10 E1: an MH-susceptible patient's triggers (7f's exposure times) start the MH state 7e owns (R51 §6)
  const mhx = (ctx.ps as { neuro?: { mhExposure?: MhExposure } }).neuro?.mhExposure;
  if (mhx) {
    const r = mhFromExposure(th.mh, mhx, es.mhOwner, tEnd);
    th.mh = r.mh;
    es.mhOwner = r.owner;
  }
```

In `packages/engine-core/test/l2/neuro/pipeline.test.ts`, find:

```ts
    expect(kinds(ns).filter((k) => k === 'mhTrigger')).toHaveLength(1);
```

Replace with:

```ts
    expect(kinds(ns).filter((k) => k === 'mhTrigger')).toHaveLength(1);
    expect(ns.mhExposure).toEqual({ sux: 0 }); // FU-10 E1: the exposure time 7e turns into MH
```

In `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/fu8-*.test.ts', // FU-8: monitor-in-arrest, agonal, oliguria and negative-volume rigs (SLOW_A: slow-b's margin is 2.4 min)
```

Replace with:

```ts
  'test/engine/fu8-*.test.ts', // FU-8: monitor-in-arrest, agonal, oliguria and negative-volume rigs (SLOW_A: slow-b's margin is 2.4 min)
  'test/engine/fu10-*.test.ts', // FU-10: the endocrine/thermal rigs (SLOW_A, or slow-c if FU-9 created it — Task A0 Step 6)
```

In `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/fu8-*.test.ts', // FU-8: its files join slow-a
```

Replace with:

```ts
  'test/engine/fu8-*.test.ts', // FU-8: its files join slow-a
  'test/engine/fu10-*.test.ts', // FU-10: its files join slow-a (Task A0 Step 6: slow-c instead if FU-9 has merged)
```

Create `packages/engine-core/test/helpers/fu10.ts`:

```ts
// FU-10 test helpers: the coverage-run-ET rigs (research/14 §1) through the real engine, read-only on the committed
// state. Seed 7, MODELED, the 40 y 70 kg 175 cm man unless a test says otherwise. Yields once per simulated minute.
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, MonitorEngine, PatientProfile } from '../../src/types.ts';
import { cmd, MAN } from './blood.ts';

export type Step = [number, Record<string, unknown>];
export const ev = (event: Record<string, unknown>): Record<string, unknown> => ({ type: 'applyEvent', event });
export const drug = (drugId: string, dose: number, unit: string): Record<string, unknown> => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' });
/** ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 at t = 1 s (the ET runner's `VENTED`). */
export const VENTED: Step[] = [
  [1, ev({ kind: 'airwayDevice', device: 'ett' })],
  [1, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 })],
];
/** The ET "drug GA": propofol 2 mg/kg + rocuronium 0.6 (or succinylcholine 1.5) mg/kg + sevoflurane 2 % FGF 2 at t. */
export const GA = (t: number, nmb: 'roc' | 'sux' | 'none' = 'roc'): Step[] => [
  [t, drug('propofol', 2, 'mg/kg')],
  ...(nmb === 'none' ? [] : [[t, nmb === 'sux' ? drug('succinylcholine', 1.5, 'mg/kg') : drug('rocuronium', 0.6, 'mg/kg')] as Step]),
  [t, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 })],
];
/** Stage 3's GA flag (the rigs where depth is irrelevant). */
export const FLAG: Step = [1, ev({ kind: 'thermal', anaesthesia: 'general' })];
export type Endo = Extract<EngineEvent, { type: 'endo' }>;
/** White-box committed state (tests only). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const st = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;

/** Run the timeline to `tEnd`, calling `read` every `dt` s with the engine and the latest `endo` event. */
export async function rows<T>(steps: Step[], tEnd: number, dt: number, read: (e: MonitorEngine, endo: Endo | null) => T,
  patient: PatientProfile = MAN, mode: 'modeled' | 'manual' = 'modeled'): Promise<(T & { t: number })[]> {
  const e = createEngine({ seed: 7, mode, patient: { ...MAN, ...patient } });
  let endo: Endo | null = null;
  e.on((m) => { if (m.type === 'endo') endo = m; }, ['endo']);
  const todo = [...steps].sort((a, b) => a[0] - b[0]);
  const out: (T & { t: number })[] = [];
  let lastYield = 0;
  for (let t = dt; t <= tEnd + 1e-9; t += dt) {
    while (todo.length && (todo[0] as Step)[0] < t) {
      const [ts, body] = todo.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch(cmd(body));
      if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
    }
    let now = e.now().simT;
    while (now < t) {
      now = Math.min(t, now + 60);
      e.advanceTo(now);
      if (now - lastYield >= 60) { lastYield = now; await new Promise((r) => setImmediate(r)); }
    }
    out.push({ ...read(e, endo), t });
  }
  return out;
}
/** The first sample time at or after t0 where `pred` holds (NaN if none). */
export const firstT = <R extends { t: number }>(rs: R[], t0: number, pred: (r: R) => boolean): number => rs.find((r) => r.t >= t0 && pred(r))?.t ?? NaN;
/** The sample nearest t. */
export const at = <R extends { t: number }>(rs: R[], t: number): R => rs.reduce((b, r) => (Math.abs(r.t - t) < Math.abs(b.t - t) ? r : b));
```

Create `packages/engine-core/test/l2/thermal/fu10-mh-exposure.test.ts`:

```ts
// FU-10 Task A1 (E1): the onset of MH from a susceptible patient's triggers (7e thermal/mh.ts), and who owns the state.
import { describe, expect, it } from 'vitest';
import { mhActivity, mhFromExposure, mhOnsetT } from '../../../src/l2/thermal/mh.ts';
import { MH_PROFILE_SEVERITY, MH_SUX_LATENCY_S, MH_VOLATILE_LATENCY_DEFAULT_S, MH_VOLATILE_LATENCY_S } from '../../../src/l2/thermal/params.ts';

describe('FU-10 E1: MH onset from the trigger exposure (Visoiu 2014: sooner after succinylcholine)', () => {
  it('the onset is the earliest trigger plus its latency; the volatile latency is the agent\'s; no exposure, no onset', () => {
    expect(mhOnsetT(undefined)).toBeNull();
    expect(mhOnsetT({})).toBeNull();
    expect(mhOnsetT({ sux: 300 })).toBe(300 + MH_SUX_LATENCY_S);
    expect(mhOnsetT({ volatile: 300, volatileAgent: 'sevoflurane' })).toBe(300 + MH_VOLATILE_LATENCY_S.sevoflurane!);
    expect(mhOnsetT({ volatile: 300, volatileAgent: 'desflurane' })).toBe(300 + MH_VOLATILE_LATENCY_S.desflurane!);
    expect(mhOnsetT({ volatile: 300 })).toBe(300 + MH_VOLATILE_LATENCY_DEFAULT_S);
    expect(mhOnsetT({ volatile: 100, volatileAgent: 'sevoflurane', sux: 600 })).toBe(600 + MH_SUX_LATENCY_S);
  });
  it('starts the Stage 3 MH state once; a later succinylcholine brings a still-latent volatile onset forward', () => {
    const a = mhFromExposure(null, { volatile: 100, volatileAgent: 'sevoflurane' }, undefined, 120);
    expect(a.owner).toBe('auto');
    expect(a.mh).toEqual({ severity: MH_PROFILE_SEVERITY, t0: 100 + MH_VOLATILE_LATENCY_S.sevoflurane! });
    expect(mhActivity(a.mh, 200)).toBe(0); // latent
    const b = mhFromExposure(a.mh, { volatile: 100, volatileAgent: 'sevoflurane', sux: 400 }, a.owner, 400);
    expect(b.mh?.t0).toBe(400 + MH_SUX_LATENCY_S);
  });
  it('D3 (review F4): an instructor MH consumes the exposure — kept while set, NOT restarted once the instructor clears it', () => {
    const instr = { severity: 0.5, t0: 50 };
    const seen = mhFromExposure(instr, { sux: 100 }, undefined, 110);
    expect(seen).toEqual({ mh: instr, owner: 'instructor' });
    expect(mhFromExposure(null, { sux: 100 }, seen.owner, 500)).toEqual({ mh: null, owner: 'instructor' });
  });
  it('an MH the triggers made and the instructor then cleared is not restarted', () => {
    expect(mhFromExposure(null, { sux: 10 }, 'auto', 900)).toEqual({ mh: null, owner: 'auto' });
  });
});
```

Create `packages/engine-core/test/engine/fu10-mh-trigger.test.ts`:

```ts
// FU-10 Task A1 (E1; research/14 ET-10a): an MH-susceptible patient given its triggers develops MH by itself — 7f
// publishes the exposure times and agent, 7e starts the MH state it owns with the trigger's onset latency. Rig = the ET
// drug GA (VCV 12 × 600, fixed minute ventilation), no instructor action.
import { describe, expect, it } from 'vitest';
import { drug, firstT, GA, rows, st, VENTED } from '../helpers/fu10.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0], endo: Parameters<Parameters<typeof rows>[3]>[1]) => ({
  etco2: st(e).resp.etco2 as number, mh: endo?.mhActivity ?? 0, tc: st(e).resp.temp.tc as number,
});
const MHS = { neuro: { mhSusceptible: true } };

describe('FU-10 E1: MH from its triggers (MHAUS; Larach 1994/2010; Visoiu 2014)', { timeout: 900_000 }, () => {
  // The rig keeps the minute ventilation FIXED (the band's condition): rocuronium after the succinylcholine wears off,
  // so FU-6's patient-triggered breaths (Task 11, merged) cannot raise the ventilation the hypercapnia would drive.
  it('susceptible + succinylcholine + sevoflurane at 300 s: EtCO2 doubles within 10–30 min of the triggers (main: never)', async () => {
    const r = await rows([...VENTED, ...GA(300, 'sux'), [600, drug('rocuronium', 0.6, 'mg/kg')]], 300 + 40 * 60, 10, read, MHS);
    const base = r.find((x) => x.t === 290)!.etco2;
    const tD = firstT(r, 300, (x) => x.etco2 >= 2 * base);
    console.log(`FU-10 E1 sux: EtCO2 base ${base.toFixed(1)}, doubled at +${((tD - 300) / 60).toFixed(1)} min, activity ${r.at(-1)!.mh} at +40 min`);
    expect(tD - 300).toBeGreaterThanOrEqual(10 * 60);
    expect(tD - 300).toBeLessThanOrEqual(30 * 60);
  });
  it('sevoflurane alone starts it at the agent median (≈ 45 min, Visoiu 2014), later than succinylcholine; a patient who is not susceptible never gets it', async () => {
    const vol = await rows([...VENTED, ...GA(300, 'roc')], 300 + 75 * 60, 30, read, MHS);
    const ctl = await rows([...VENTED, ...GA(300, 'sux')], 300 + 75 * 60, 30, read);
    const on = firstT(vol, 300, (x) => x.mh > 0.05);
    console.log(`FU-10 E1 sevoflurane alone: activity > 0.05 at +${((on - 300) / 60).toFixed(1)} min; not susceptible: max ${Math.max(...ctl.map((x) => x.mh))}`);
    expect(on - 300).toBeGreaterThan(40 * 60);
    expect(on - 300).toBeLessThanOrEqual(60 * 60);
    expect(Math.max(...ctl.map((x) => x.mh))).toBe(0);
  });
});
```

- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/neuro test/l2/endo test/engine/fu10-mh-trigger.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-10 ET-11 ET-M2` → ET-10a `mhDevelops` true; every other MH cell as before.
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7e,7f): an MH-susceptible patient develops MH from its triggers (FU-10 E1, E-FU10-1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -u origin fu-10-endocrine-thermal
```

---

### Task A2: E3 — a neuraxial block has its own thermoregulation (7e thermal; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/thermal/{params,heat}.ts`; modify
`packages/engine-core/test/l2/temp/temp.test.ts` (**E-FU10-3**); create `test/l2/thermal/fu10-neuraxial.test.ts`.
**Overlap:** no other in-flight plan edits `l2/thermal/**`.

**Why (research/14 E3, ET-04 WR):** `heat.ts:161` gave any non-`none` anaesthesia thermoregulatory depth 1, so an awake
spinal patient got the GA thresholds plus the `NEURAXIAL_KCP` shortcut: hour-1 fall −1.07 °C (0.9 of GA), 34.4 °C at
3 h and **no shivering**.

**Mechanism (D4, ruling R-7):** the block abolishes vasoconstriction and shivering in the blocked fraction of the body
(0.5 for T10 [ENG]); centrally the patient is awake (depth 0) with BOTH cold-defence thresholds 0.5 °C lower (Kurz,
Sessler, Schroeder, Kurz, Anesth Analg 1993;77:721–726). Sedation still arrives through 7f's `thermoDepth`.

**Measured:** ET-04: hour 1 **−0.84 °C** (main −1.07; GA −1.19), ratio **0.71** (accepted, R-7), core **35.30 °C** at 3 h (main 34.41), shivering from **35.48 °C** (main: never), depth **0** (main 1). Heat model alone: −0.86 vs GA −1.25 °C, shivering from 35.49 °C. Stage 3's neuraxial test re-stated (E-FU10-3a).

**E-FU10-3 (the Stage 3 neuraxial test):** its "no plateau" expectation (`tc[419] − tc[479] > 0.1` and
`tc[479] < 34.5`) is REMOVED and replaced: the hour-2 fall stays ≥ 0.3 °C (no vasoconstriction plateau), and in hour 8
the core is below the lowered shivering threshold with shivering above the block. The old test pinned the GA thresholds
the neuraxial state took (the defect).

- [ ] **Step — the edits and the new files** (each find matches exactly once in application order):

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG]
```

Replace with:

```ts
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG] — FU-10 E3: no longer read (NEURAXIAL_BLOCK_FRAC)
```

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const VASOCONSTRICT_KCP = 0.5; // k_cp × once constricted [ENG]
```

Replace with:

```ts
export const VASOCONSTRICT_KCP = 0.5; // k_cp × once constricted [ENG]
/**
 * FU-10 E3 — neuraxial thermoregulation (Sessler DI, Anesthesiology 2000;92:578 and 2008;109:318; Kurz A, Sessler DI,
 * Schroeder M, Kurz M, Anesth Analg 1993;77:721–726): the block abolishes vasoconstriction AND shivering below its level
 * only; centrally the patient keeps an unsedated patient's thresholds, both cold-defence thresholds ≈ 0.5 °C lower (the
 * warm, vasodilated legs are "felt" as warm — orchestrator ruling R-7). Redistribution is then smaller than general
 * anaesthesia's (Matsukawa T et al., Anesthesiology 1995;83:961: epidural −0.8 °C in hour 1 [VERIFY the value]).
 * Sedation adds 7f's depth. NEURAXIAL_BLOCK_FRAC: the fraction of the vasomotor/shivering effector mass below a T10 block
 * [ENG: legs + lower trunk ≈ ½].
 */
export const NEURAXIAL_BLOCK_FRAC = 0.5;
export const NEURAXIAL_THR_SHIFT_C = -0.5;
```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_H,
  NEURAXIAL_KCP, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';```

Replace with:

```ts
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_BLOCK_FRAC, NEURAXIAL_H,
  NEURAXIAL_THR_SHIFT_C, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
/** Current thresholds (depth, set point; the shivering-only shift applied). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift);
  return { ...thr, shiver: thr.shiver + st.shiverShift };
}

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  if (st.anaesthesia === 'neuraxial') return { k: st.k0 * NEURAXIAL_KCP, f: 1 }; // no vasoconstriction below the block
  const f = vasoDilation(tc, thr);
  return { k: st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f), f };
}```

Replace with:

```ts
/** Current thresholds (depth, set point; the drugs' shivering-only shift; a neuraxial block lowers both cold-defence
 * thresholds — FU-10 E3, ruling R-7). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift);
  const nx = st.anaesthesia === 'neuraxial' ? NEURAXIAL_THR_SHIFT_C : 0;
  return { ...thr, vaso: thr.vaso + nx, shiver: thr.shiver + st.shiverShift + nx };
}

/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */
const blocked = (st: ThermalState): number => (st.anaesthesia === 'neuraxial' ? NEURAXIAL_BLOCK_FRAC : 0);

function kcp(st: ThermalState, tc: number, thr: Thresholds): { k: number; f: number } {
  // FU-10 E3: below a neuraxial block the vessels are fully dilated; above it they keep their thermoregulatory tone
  const b = blocked(st);
  const f = b + (1 - b) * vasoDilation(tc, thr);
  return { k: st.k0 * (VASOCONSTRICT_KCP + (GA_KCP - VASOCONSTRICT_KCP) * f), f };
}```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb),
```

Replace with:

```ts
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)), // FU-10 E3: no shivering below a block
```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  // depth = max(7f's thermoDepth, the Stage 3 `thermal` flag's depth) (R51 addendum 16): a Stage 3 scenario that sets
  // anaesthesia 'general' without drugs keeps its R39-7 course after 7f lands. Neuraxial: the thresholds of a sedated
  // patient (decision 4: Stage 3's "no plateau" keeps shivering out of hour 8).
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'none' ? 0 : 1);```

Replace with:

```ts
  // depth = max(7f's thermoDepth, the Stage 3 `thermal` flag's depth) (R51 addendum 16): a Stage 3 scenario that sets
  // anaesthesia 'general' without drugs keeps its R39-7 course after 7f lands. Neuraxial (FU-10 E3): no central depth of
  // its own — the block acts on the effectors below it (kcp, shivering) and lowers the shivering threshold; sedation
  // reaches the thresholds through 7f's depth.
  const target = Math.max(st.depthIn ?? 0, st.anaesthesia === 'general' ? 1 : 0);```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    depth: st.anaesthesia === 'none' ? 0 : 1,```

Replace with:

```ts
    depth: st.anaesthesia === 'general' ? 1 : 0, // FU-10 E3: a neuraxial block has no central depth```

In `packages/engine-core/test/l2/temp/temp.test.ts`, find:

```ts
  it('neuraxial: smaller redistribution and no plateau (still falling below 34.5 °C in hour 8)', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'neuraxial';
    const tc = run(st, 0, 8 * 3600);
    expect(36.8 - tc[59]!).toBeLessThan(1.0);
    expect(tc[419]! - tc[479]!).toBeGreaterThan(0.1); // still falling in hour 8, where GA has plateaued
    expect(tc[479]!).toBeLessThan(34.5);
  });```

Replace with:

```ts
  // FU-10 E3 (E-FU10-3, research/14 ET-04): "no plateau" meant no VASOCONSTRICTION plateau — the block abolishes the
  // legs' vasoconstriction, so the core keeps falling through the GA plateau's hours; it now stops only where shivering
  // ABOVE the block starts, below the lowered shivering threshold (35.5 °C; Kurz 1993). Before FU-10 the neuraxial state
  // took the GA thresholds (shivering 33.5 °C) and fell to 33.47 °C at 8 h with no shivering; now 35.22 °C, shivering.
  it('neuraxial: smaller redistribution, no vasoconstriction plateau; the fall stops only below the lowered shivering threshold', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'neuraxial';
    const tc = run(st, 0, 8 * 3600);
    expect(36.8 - tc[59]!).toBeLessThan(1.0);
    expect(tc[59]! - tc[119]!).toBeGreaterThanOrEqual(0.3); // hour 2: still the linear phase (0.50 °C/h)
    expect(tc[479]!).toBeLessThan(35.5); // below the shivering threshold 36.0 − 0.5
    expect(st.out.shiverW).toBeGreaterThan(0); // shivering above the block defends it
  });```

Create `packages/engine-core/test/l2/thermal/fu10-neuraxial.test.ts`:

```ts
// FU-10 Task A2 (E3; research/14 ET-04): a neuraxial block has its own thermoregulation — the effectors below the block
// are abolished (vessels dilated, no shivering), the central thresholds are an unsedated patient's with BOTH cold-defence
// thresholds ≈ 0.5 °C lower (Kurz, Sessler, Schroeder, Kurz, Anesth Analg 1993;77:721; ruling R-7), so redistribution is
// smaller than GA's (Matsukawa 1995). The ratio to GA (measured 0.71 in the ET rig) is accepted under ruling R-7.
import { describe, expect, it } from 'vitest';
import { createThermal, currentThresholds, stepThermal } from '../../../src/l2/thermal/heat.ts';
import { THR_SHIVER_AWAKE, THR_VASO_AWAKE } from '../../../src/l2/thermal/params.ts';

const course = (an: 'general' | 'neuraxial', hours: number) => {
  const st = createThermal(36.8, 70);
  st.anaesthesia = an;
  const tc: number[] = [];
  let shivC = NaN;
  for (let s = 1; s <= hours * 3600; s++) {
    stepThermal(st, s, 1);
    if (s % 60 === 0) tc.push(st.tc);
    if (Number.isNaN(shivC) && st.out.shiverW > 1) shivC = st.tc;
  }
  return { st, tc, shivC };
};

describe('FU-10 E3: neuraxial thermoregulation (Sessler 2000/2008; Kurz 1993; Matsukawa 1995)', () => {
  it('no central depth: both cold-defence thresholds 0.5 °C below the awake ones', () => {
    const st = createThermal(36.8, 70);
    st.anaesthesia = 'neuraxial';
    stepThermal(st, 1, 1);
    expect(st.depth).toBe(0);
    const thr = currentThresholds(st);
    expect(thr.vaso).toBeCloseTo(THR_VASO_AWAKE - 0.5, 6);
    expect(thr.shiver).toBeCloseTo(THR_SHIVER_AWAKE - 0.5, 6);
  });
  it('hour-1 redistribution −0.5 to −1.1 °C (Matsukawa 1995: −0.8 ± 0.3), less than GA; shivering starts at ≈ 35.5 °C', () => {
    const n = course('neuraxial', 3);
    const g = course('general', 1);
    console.log(`FU-10 E3: hour 1 neuraxial −${(36.8 - n.tc[59]!).toFixed(2)} vs GA −${(36.8 - g.tc[59]!).toFixed(2)} °C; shivering from ${n.shivC.toFixed(2)} °C`);
    expect(36.8 - n.tc[59]!).toBeGreaterThanOrEqual(0.5);
    expect(36.8 - n.tc[59]!).toBeLessThanOrEqual(1.1);
    expect(36.8 - n.tc[59]!).toBeLessThan(36.8 - g.tc[59]!);
    expect(n.shivC).toBeGreaterThan(35.3);
    expect(n.shivC).toBeLessThan(35.6);
  });
});
```

- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/temp test/engine/thermal-warmer.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-04 ET-01a ET-02 ET-29 ET-30`.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): a neuraxial block blocks its effectors and lowers the cold-defence thresholds (FU-10 E3, E-FU10-3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A3: E5 + E6 — the thresholds stop at the tables' GA row; age lowers them under anaesthesia (7e thermal; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/thermal/{params,thresholds,heat}.ts`, `src/l2/endo/pipeline.ts` (7e
writes the patient's age into the heat model — Stage 3 creates the state and `l2/resp/**` is not FU-10's);
modify `test/l2/thermal/thresholds.test.ts` (**E-FU10-10**) and `test/l2/temp/temp.test.ts` (**E-FU10-3**); create
`test/l2/thermal/fu10-thresholds.test.ts`, `test/engine/fu10-thresholds.test.ts`.
**Overlap:** none (`l2/thermal/**` is FU-10's; the `l2/endo/pipeline.ts` lines are FU-10's own).

**Why (research/14 E5/E6, ET-01b TW, ET-03a MI):** `thresholds()` extrapolated the awake → GA line to depth 1.5, so
sevoflurane's depth 1.06 put the vasoconstriction threshold at 34.55 °C (inside the tables' band only by accident of the
unsourced slope) and the plateau at 6.2 h; and no threshold had an age term.

**Mechanism (D5; rulings R-4, R-5, R-6):** (1) cap the depth the thresholds read at the GA row; (2) `VASOCONSTRICT_C`
34.8 → **34.5 °C**, the parameter tables' own value (R-4); (3) the age shift (−1 °C from 60 to 80 y; Kurz 1993 for
vasoconstriction, Vassilieff 1995 for shivering) weighted by the thermoregulatory depth, so the awake thresholds are
unchanged (R-6); (4) Sessler's bands are graded on a SURGICAL arm — the existing open-wound `prep` exposure from
incision — and the draped no-wound arm is a recorded demonstration (R-5). No new wound term (the review's E5 section).

**Measured:** Surgical arm (open wound from +15 min): hour 1 **−1.44 °C**, hours 2–3 **−0.492 °C/h**, vasoconstriction at **34.50 °C**, plateau **−0.087 °C/h** — all in Sessler's bands; onset **2.27 h** (band 3–4 → `it.fails`, the `PREP_EVAP_W_70` calibration knob, R-5). Draped demonstration: −1.18 / −0.300 °C/h / 6.30 h at 34.50 °C (main 6.17 h at 34.555). 80 y vs 40 y on the surgical arm: onset **33.50 vs 34.50 °C**, core at 4 h **33.43 vs 34.28** (Kurz 1993's −1 °C). ET-03a's draped rig: the elderly hour-1 fall is unchanged (−1.19, review F8's −0.98 is gone with the depth weighting), `d4h` −0.04 and no elderly onset inside 7 h (MI kept, measured on the surgical arm instead). The Stage 3 GA heat model now plateaus at **34.37 °C** in hour 8 (`it.fails`, E-FU10-3b). **Rows this moves (R-4's lower threshold keeps an anaesthetised patient vasodilated 0.3 °C longer):** ET-07 cold blood core −0.89 → **−1.02 °C** (band −0.5 to −1.0: TW → **TS by 0.02**; reported, not tuned — Ali Q12), ET-02 cold arms 34.54 → 34.30 / 34.79 → 34.61 (the warmed arms unchanged, PL), ET-03b child at 3 h 34.69 → 34.43 (direction PL), ET-05a–d emergence core 34.49 → 34.26 with shivering VO₂ +47.5 → +69.6 % and shivering 56 → 79 W (verdicts unchanged), ET-29 −0.50 → −0.53, ET-09a CO at 28 °C 3.44 → 4.33 L/min (HR 47 and Osborn unchanged), ET-08c CO 5.17 → 5.30, ET-12/13a cores 36.86 → 36.60 and 36.58 → 36.34 °C.

**E-FU10-10:** the Stage 7e thresholds test pins the GA centre 34.8 → 34.5 (the re-sourced constant) and checks full
constriction 0.7 °C below the centre (33.8 instead of 34.0 — the same property). **E-FU10-3 (Stage 3 GA test):** the
hour-8 plateau's lower edge (≥ 34.5 °C) moves to an `it.fails` with its number; the rest of the test is unchanged.

- [ ] **Step — the edits and the new files** (each find matches exactly once in application order):

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const VASOCONSTRICT_C = 34.8; // GA vasoconstriction logistic centre (tables 34.5 ± 0.2; plateau 34.6–34.8) [ENG]```

Replace with:

```ts
// FU-10 E5 (orchestrator ruling R-4, 2026-10-03): the parameter tables' own value (§5c GA vasoconstriction 34.5 ± 0.2 °C;
// Sessler 2000) replaces the [ENG] 34.8 the Stage 3 plateau had been fitted with — the depth extrapolation (removed by
// THR_DEPTH_MAX) had hidden the difference by reading 34.55 at sevoflurane's depth 1.06
export const VASOCONSTRICT_C = 34.5; // GA vasoconstriction logistic centre [TXT: tables §5c]```

In `packages/engine-core/src/l2/thermal/params.ts`, find:

```ts
export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)
```

Replace with:

```ts
export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)
/**
 * FU-10 E5 — the depth the THRESHOLDS read is capped at the GA row. Before FU-10 `thresholds()` extrapolated the
 * awake → GA line to depth 1.5 (2.1 °C per depth unit), so 2 % sevoflurane (thermoDepth 1.06) put the vasoconstriction
 * threshold at 34.55 °C and the plateau at 6.2 h; the tables' and Sessler's GA row IS the row for ordinary clinical
 * anaesthesia (vasoconstriction 34.5 ± 0.2 °C, the plateau at 3–4 h: Sessler DI, Anesthesiology 2000;92:578–596; Kurz A,
 * Plattner O, Sessler DI et al., Anesthesiology 1993;79:465). A deeper anaesthetic lowering the threshold further is a
 * concentration–threshold slope no source in the tables gives, so it is not extrapolated (R45; calibration queue).
 */
export const THR_DEPTH_MAX = 1;
/**
 * FU-10 E6 — under anaesthesia the cold-defence thresholds are lower in the elderly: vasoconstriction ≈ 1 °C lower at
 * 60–80 y than at 30–50 y under isoflurane/N2O (Kurz A, Plattner O, Sessler DI et al., Anesthesiology 1993;79:465), and
 * the shivering threshold likewise (Vassilieff N, Rosencher N, Sessler DI, Conseiller C, Anesthesiology 1995;83:1162,
 * spinal anaesthesia). The shift is weighted by the thermoregulatory DEPTH (orchestrator ruling R-6): the sources
 * measured it under anaesthesia, so the awake thresholds are unchanged. Linear in age between THR_AGE_FROM_Y and
 * THR_AGE_TO_Y; no sourced age term for sweating.
 */
export const THR_AGE_FROM_Y = 60;
export const THR_AGE_TO_Y = 80;
export const THR_AGE_SHIFT_C = -1;
```

In `packages/engine-core/src/l2/thermal/thresholds.ts`, find:

```ts
import {
  SHIVER_MAX_X,```

Replace with:

```ts
import {
  THR_AGE_FROM_Y, THR_AGE_SHIFT_C, THR_AGE_TO_Y, THR_DEPTH_MAX,
  SHIVER_MAX_X,```

In `packages/engine-core/src/l2/thermal/thresholds.ts`, find:

```ts
/** Thresholds at depth d with every threshold shifted by `setShiftC` (fever raises the set point). */
export function thresholds(depth: number, setShiftC: number): Thresholds {
  const d = Math.min(1.5, Math.max(0, depth));
  return {
    vaso: lerp(THR_VASO_AWAKE, VASOCONSTRICT_C, d) + setShiftC,
    vasoW: lerp(W_VASO_AWAKE, W_VASO_GA, Math.min(1, d)),
    shiver: lerp(THR_SHIVER_AWAKE, THR_SHIVER_GA, d) + setShiftC,
    sweat: lerp(THR_SWEAT_AWAKE, THR_SWEAT_GA, d) + setShiftC,
  };
}```

Replace with:

```ts
/** FU-10 E6: the age shift of the cold-defence thresholds, °C (0 up to 60 y, THR_AGE_SHIFT_C from 80 y; linear). */
export function ageShiftC(ageY: number): number {
  const f = Math.min(1, Math.max(0, (ageY - THR_AGE_FROM_Y) / (THR_AGE_TO_Y - THR_AGE_FROM_Y)));
  return THR_AGE_SHIFT_C * f;
}

/**
 * Thresholds at depth d with every threshold shifted by `setShiftC` (fever raises the set point) and the cold-defence
 * thresholds by the patient's age in proportion to the depth (FU-10 E6). The depth is capped at the GA row (FU-10 E5).
 */
export function thresholds(depth: number, setShiftC: number, ageY = 40): Thresholds {
  const d = Math.min(THR_DEPTH_MAX, Math.max(0, depth));
  const age = ageShiftC(ageY) * d; // FU-10 E6 (R-6): under anaesthesia only
  return {
    vaso: lerp(THR_VASO_AWAKE, VASOCONSTRICT_C, d) + setShiftC + age,
    vasoW: lerp(W_VASO_AWAKE, W_VASO_GA, d),
    shiver: lerp(THR_SHIVER_AWAKE, THR_SHIVER_GA, d) + setShiftC + age,
    sweat: lerp(THR_SWEAT_AWAKE, THR_SWEAT_GA, d) + setShiftC,
  };
}```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  const thr = thresholds(st.depth, st.setShift + st.feverShift);```

Replace with:

```ts
  const thr = thresholds(st.depth, st.setShift + st.feverShift, st.ageY);```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  effKg: number;
  env: Envelope;```

Replace with:

```ts
  effKg: number;
  ageY: number; // FU-10 E6: the thermoregulatory thresholds fall with age (Kurz 1993)
  env: Envelope;```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
export function createThermal(tCore: number, effKg: number, heightCm = 175): ThermalState {```

Replace with:

```ts
export function createThermal(tCore: number, effKg: number, heightCm = 175, ageY = 40): ThermalState {```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    k0: (m0 - resp) / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0, effKg,```

Replace with:

```ts
    k0: (m0 - resp) / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0, effKg, ageY,```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70);```

Replace with:

```ts
  const fresh = createThermal(T_NORMAL, (st.m0 / M_AWAKE_W_70) * 70, 175, st.ageY ?? 40);```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
export interface EndoState {
  core: EndoCore;
  k: number; // next 1 Hz step index (time k s)
  noxious: number;
  weightKg: number;```

Replace with:

```ts
export interface EndoState {
  core: EndoCore;
  k: number; // next 1 Hz step index (time k s)
  noxious: number;
  weightKg: number;
  ageY: number; // FU-10 E6: written into the heat model's `ageY` (the thresholds fall with age; Stage 3 owns `resp`)```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ecg: { tempC: 0, shiver: 0 },```

Replace with:

```ts
    core: createEndoCore(resolveEndoProfile(profile), weightKg), k: 1, noxious: 0, weightKg, ageY: profile?.ageY ?? 40, ecg: { tempC: 0, shiver: 0 },```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  observeDoses(es, pk);```

Replace with:

```ts
  const th = ctx.resp.temp;
  const pk = pkOf(ctx.ps);
  th.ageY = es.ageY; // FU-10 E6: the patient's age reaches the thermoregulatory thresholds (Stage 3 creates the state)
  observeDoses(es, pk);```

Create `packages/engine-core/test/l2/thermal/fu10-thresholds.test.ts`:

```ts
// FU-10 Task A3 (E5, E6): the thresholds read at most the GA row; the GA vasoconstriction threshold is the tables'
// 34.5 °C (ruling R-4); age lowers the cold-defence thresholds under anaesthesia only (ruling R-6).
import { describe, expect, it } from 'vitest';
import { createThermal, currentThresholds, upgradeThermal, type ThermalState } from '../../../src/l2/thermal/heat.ts';
import { THR_SHIVER_AWAKE, THR_SWEAT_AWAKE, THR_VASO_AWAKE, VASOCONSTRICT_C } from '../../../src/l2/thermal/params.ts';
import { ageShiftC, thresholds } from '../../../src/l2/thermal/thresholds.ts';

describe('FU-10 E5/E6: threshold depth cap, the tables\' GA row, the depth-weighted age shift (Kurz 1993; Vassilieff 1995)', () => {
  it('the GA row is the floor: depth 1.5 reads depth 1; depth 0.5 still interpolates; the GA vasoconstriction centre is 34.5 °C', () => {
    expect(VASOCONSTRICT_C).toBe(34.5);
    expect(thresholds(1.5, 0)).toEqual(thresholds(1, 0));
    expect(thresholds(1, 0).vaso).toBeCloseTo(34.5, 9);
    expect(thresholds(0.5, 0).vaso).toBeCloseTo((THR_VASO_AWAKE + 34.5) / 2, 9);
  });
  it('ageShiftC: 0 up to 60 y, −0.5 at 70 y, −1 from 80 y', () => {
    expect(ageShiftC(40)).toBeCloseTo(0, 9);
    expect(ageShiftC(60)).toBeCloseTo(0, 9);
    expect(ageShiftC(70)).toBeCloseTo(-0.5, 9);
    expect(ageShiftC(80)).toBeCloseTo(-1, 9);
    expect(ageShiftC(90)).toBeCloseTo(-1, 9);
  });
  it('the age shift acts under anaesthesia only, on vasoconstriction and shivering, never on sweating', () => {
    const awake80 = thresholds(0, 0, 80);
    expect([awake80.vaso, awake80.shiver, awake80.sweat]).toEqual([THR_VASO_AWAKE, THR_SHIVER_AWAKE, THR_SWEAT_AWAKE]);
    const ga80 = thresholds(1, 0, 80);
    const ga40 = thresholds(1, 0, 40);
    expect(ga80.vaso - ga40.vaso).toBeCloseTo(-1, 9);
    expect(ga80.shiver - ga40.shiver).toBeCloseTo(-1, 9);
    expect(ga80.sweat).toBe(ga40.sweat);
  });
  it('an 80-year-old heat model reports the shifted thresholds; a pre-FU-10 snapshot (no ageY) behaves as 40 y', () => {
    const st = createThermal(36.8, 70, 175, 80);
    st.depth = 1;
    expect(currentThresholds(st).vaso).toBeCloseTo(33.5, 9);
    const old = { ...createThermal(36.8, 70) } as Partial<ThermalState>;
    delete old.ageY;
    const up = upgradeThermal(old as ThermalState);
    up.depth = 1;
    expect(currentThresholds(up).vaso).toBeCloseTo(34.5, 9);
  });
});
```

Create `packages/engine-core/test/engine/fu10-thresholds.test.ts`:

```ts
// FU-10 Task A3 (E5, E6; research/14 ET-01b, ET-03a; rulings R-4, R-5, R-6): the perioperative course graded on the
// SURGICAL arm (drug GA, draped, the existing open-wound `prep` exposure from incision at +15 min — Sessler's bands
// describe surgical patients); the draped no-wound arm is recorded as a demonstration. 7 h each, seed 7.
import { describe, expect, it } from 'vitest';
import { ev, GA, rows, st, VENTED, type Step } from '../helpers/fu10.ts';

const T = 300;
const H = 3600;
const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({ tc: st(e).resp.temp.tc as number, vasoF: st(e).resp.temp.out.vasoF as number });
const WOUND: Step = [T + 900, ev({ kind: 'thermal7e', exposure: 'prep' })];
// each arm runs once per file (memoised): the three tests share them, which keeps the slow group's wall time down
const memo = new Map<string, ReturnType<typeof course0>>();
const course = (wound: boolean, ageY: number) => {
  const k = `${wound}-${ageY}`;
  if (!memo.has(k)) memo.set(k, course0(wound, ageY));
  return memo.get(k)!;
};
const course0 = async (wound: boolean, ageY: number) => {
  const r = await rows([...VENTED, ...GA(T), ...(wound ? [WOUND] : [])], T + 7 * H, 60, read, { ageY });
  const at = (t: number) => r.reduce((b, x) => (Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b)).tc;
  const v = r.find((x) => x.t > T + 60 && x.vasoF < 0.5);
  return { h1: at(T + H) - at(T), lin: (at(T + 3 * H) - at(T + H)) / 2, tc4h: at(T + 4 * H), onsetH: v ? (v.t - T - 60) / H : NaN, onsetC: v ? v.tc : NaN,
    plateau: at(T + 5 * H) - at(T + 4 * H) };
};

describe('FU-10 E5/E6: Sessler\'s three phases on a surgical patient; the elderly threshold', { timeout: 1_200_000 }, () => {
  it('open wound: hour 1 −1 to −1.5 °C, then −0.3 to −0.5 °C/h, vasoconstriction at 34.5 ± 0.2 °C, then a plateau (±0.1 °C/h)', async () => {
    const s = await course(true, 40);
    const d = await course(false, 40);
    console.log(`FU-10 E5 surgical: h1 ${s.h1.toFixed(2)}, linear ${s.lin.toFixed(3)} °C/h, onset ${s.onsetH.toFixed(2)} h at ${s.onsetC.toFixed(2)}, plateau ${s.plateau.toFixed(3)}; draped (demonstration): h1 ${d.h1.toFixed(2)}, linear ${d.lin.toFixed(3)}, onset ${d.onsetH.toFixed(2)} h at ${d.onsetC.toFixed(2)}`);
    expect(s.h1).toBeLessThanOrEqual(-1);
    expect(s.h1).toBeGreaterThanOrEqual(-1.5);
    expect(s.lin).toBeLessThanOrEqual(-0.3);
    expect(s.lin).toBeGreaterThanOrEqual(-0.5);
    expect(s.onsetC).toBeGreaterThanOrEqual(34.3);
    expect(s.onsetC).toBeLessThanOrEqual(34.7);
    expect(Math.abs(s.plateau)).toBeLessThanOrEqual(0.1);
  });
  // R45 / ruling R-5: the onset TIME on the surgical arm depends on the wound loss (`PREP_EVAP_W_70` 40 W [ENG], the
  // calibration knob, R44) — measured 2.27 h; not tuned here.
  it.fails('open wound: vasoconstriction begins at 3–4 h (Sessler 2000) — measured 2.27 h', async () => {
    const s = await course(true, 40);
    expect(s.onsetH).toBeGreaterThanOrEqual(3);
    expect(s.onsetH).toBeLessThanOrEqual(4);
  });
  it('80 y vs 40 y, same surgery: vasoconstriction ≈ 1 °C lower (Kurz 1993) and a colder core at 4 h', async () => {
    const old = await course(true, 80);
    const young = await course(true, 40);
    console.log(`FU-10 E6: onset ${old.onsetC.toFixed(2)} vs ${young.onsetC.toFixed(2)} °C; core at 4 h ${old.tc4h.toFixed(2)} vs ${young.tc4h.toFixed(2)}`);
    expect(old.onsetC - young.onsetC).toBeLessThanOrEqual(-0.7);
    expect(old.onsetC - young.onsetC).toBeGreaterThanOrEqual(-1.3);
    expect(old.tc4h - young.tc4h).toBeLessThan(-0.2);
  });
});
```

In `packages/engine-core/test/l2/thermal/thresholds.test.ts`, find:

```ts
  it('awake 37.2/36.9/36.0 and GA 38.0/34.8/33.5 (sweat/vaso/shiver); a fever shifts all three', () => {```

Replace with:

```ts
  // FU-10 E5 (ruling R-4, E-FU10-10): the GA vasoconstriction centre is the tables' 34.5 °C (was the [ENG] 34.8)
  it('awake 37.2/36.9/36.0 and GA 38.0/34.5/33.5 (sweat/vaso/shiver); a fever shifts all three', () => {```

In `packages/engine-core/test/l2/thermal/thresholds.test.ts`, find:

```ts
    expect(g.vaso).toBeCloseTo(34.8, 9);```

Replace with:

```ts
    expect(g.vaso).toBeCloseTo(34.5, 9);```

In `packages/engine-core/test/l2/thermal/thresholds.test.ts`, find:

```ts
    expect(vasoDilation(34.0, thresholds(1, 0))).toBeLessThan(0.001);```

Replace with:

```ts
    expect(vasoDilation(33.8, thresholds(1, 0))).toBeLessThan(0.001); // FU-10 (R-4): fully constricted 0.7 °C below the centre, as before```

In `packages/engine-core/test/l2/temp/temp.test.ts`, find:

```ts
    const last = tc.slice(-60); // hour 8: plateau
    expect(Math.min(...last)).toBeGreaterThanOrEqual(34.5);
    expect(Math.max(...last)).toBeLessThanOrEqual(35.5);
    expect(Math.max(...last) - Math.min(...last)).toBeLessThan(0.1);
  });```

Replace with:

```ts
    const last = tc.slice(-60); // hour 8: plateau
    expect(Math.max(...last)).toBeLessThanOrEqual(35.5);
    expect(Math.max(...last) - Math.min(...last)).toBeLessThan(0.1);
  });

  // R45 (FU-10 E5, ruling R-4, E-FU10-3): with the tables' vasoconstriction threshold 34.5 °C (was the [ENG] 34.8 this
  // band was fitted with) the GA heat model plateaus just below it — measured 34.37 °C in hour 8. Not tuned (R44).
  it.fails('GA: the hour-8 plateau stays at or above 34.5 °C — measured 34.37', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'general';
    const tc = run(st, 0, 8 * 3600);
    expect(Math.min(...tc.slice(-60))).toBeGreaterThanOrEqual(34.5);
  });```

- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/temp test/l2/endo test/engine/fu10-thresholds.test.ts test/engine/thermal-warmer.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-01a ET-01b ET-02 ET-03a ET-03b ET-08a ET-09a ET-29`.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the thermoregulatory thresholds stop at the tables' GA row and fall with age under anaesthesia (FU-10 E5, E6, E-FU10-3, E-FU10-10)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A4: E8 — the insulin–dextrose row moves glucose (7e adapters; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,adapters}.ts`; create
`test/l2/endo/fu10-insulin-dextrose.test.ts`, `test/engine/fu10-insulin-dextrose.test.ts` (which also holds the
insulin-nadir `it.fails` of the dropped Task A5).
**Overlap:** FU-7 Tasks 9/18 edit `adapters.ts`'s `readEndoInputs` and its import line; FU-9 A4 its `BloodLike` and
`writeBlood`. This task edits `observeDoses` and the import line: whichever lands second re-anchors on the merged import
(one added name).

**Why (research/14 E8, ET-31 IN):** the hyperkalaemia treatment row moved K⁺ but left glucose at **0.00 for 3 h**, while
the same doses as two rows moved it — one treatment, two answers. 7e observed only `insulin` and `dextrose`.

**Mechanism (D6):** `observeDoses` expands the combined row into its insulin and its dextrose for the GLUCOSE model only
(2.5 g per unit, the row's own regimen); 7c keeps its K⁺ curve.

**Measured:** ET-31 combined row **+6.93 / −2.42 mmol/L**, identical to the two-row arm (IN → PL); K⁺ at 60 min **−0.96** (band −1.0 to −0.6, held by the engine test; two-row arm −0.68). Engine test: max +11.17, min −2.68 mmol/L, K⁺ −0.96. ET-20a/b's insulin-alone K⁺ at 60 min −0.78 → −0.62 (its graded minimum −0.87 → −0.86, PL). The insulin-nadir `it.fails` (13.3 min) is in this task's engine file (A5 dropped).

- [ ] **Step — the edits and the new files** (each find matches exactly once in application order):

In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
```

Replace with:

```ts
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
/** FU-10 E8: 7c's `insulinDextrose` row is dosed in insulin units with 25 g dextrose per 10 units (the row's regimen;
 * UK Renal Association 2020 / JBDS: 10 units soluble insulin in 50 mL 50 % glucose) [TXT]. */
export const INSDEX_DEXTROSE_G_PER_UNIT = 2.5;
```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ } from './params.ts';```

Replace with:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
/**
 * 7g's accepted boluses (`bus.doses`, each listed for exactly one engine pass, R51 §3) → the glucose model: dextrose
 * (7g amount unit mg) and insulin (units). Called once per engine pass. `bus.metabolic.glucoseDelta` is NOT used (7e
 * owns glucose).
 */```

Replace with:

```ts
/**
 * 7g's accepted boluses (`bus.doses`, each listed for exactly one engine pass, R51 §3) → the glucose model: dextrose
 * (7g amount unit mg) and insulin (units). Called once per engine pass. `bus.metabolic.glucoseDelta` is NOT used (7e
 * owns glucose). FU-10 E8: 7c's `insulinDextrose` row (the hyperkalaemia treatment; its K⁺ curve stays 7c's) is the same
 * insulin and dextrose to the glucose model — 10 units with 25 g, i.e. INSDEX_DEXTROSE_G_PER_UNIT per unit given.
 */```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
    else if (d.agent === 'insulin' && d.amountUnit === 'units') insulinBolus(es.core.glucose, d.amount, es.weightKg);
```

Replace with:

```ts
    else if (d.agent === 'insulin' && d.amountUnit === 'units') insulinBolus(es.core.glucose, d.amount, es.weightKg);
    else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8
      insulinBolus(es.core.glucose, d.amount, es.weightKg);
      dextroseBolus(es.core.glucose, d.amount * INSDEX_DEXTROSE_G_PER_UNIT, es.weightKg);
    }
```

Create `packages/engine-core/test/l2/endo/fu10-insulin-dextrose.test.ts`:

```ts
// FU-10 Task A4 (E8; research/14 ET-31): 7c's combined hyperkalaemia-treatment row reaches 7e's glucose model as its
// insulin and its dextrose; the same doses as two rows give the same glucose course.
import { describe, expect, it } from 'vitest';
import { NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../../src/l2/endo/core.ts';
import { observeDoses, type PkLike } from '../../../src/l2/endo/adapters.ts';
import { createEndoState, type EndoState } from '../../../src/l2/endo/pipeline.ts';

const dose = (agent: string, amount: number, amountUnit: string): PkLike => ({ bus: { doses: [{ agent, amount, amountUnit }] } });
const course = (give: (es: EndoState) => void): number[] => {
  const es = createEndoState({ ageY: 40, weightKg: 70 }, 70);
  give(es);
  const g: number[] = [];
  for (let s = 1; s <= 3 * 3600; s++) {
    stepEndoCore(es.core, { ...NEUTRAL_ENDO_INPUTS, weightKg: 70 }, 1);
    if (s % 60 === 0) g.push(es.core.out.glucoseMmol);
  }
  return g;
};

describe('FU-10 E8: the insulin–dextrose row moves glucose as its two parts do', () => {
  it('the combined row raises glucose at once, then drives it below baseline — within 0.1 mmol/L of the two separate rows', () => {
    const combo = course((es) => observeDoses(es, dose('insulinDextrose', 10, 'units')));
    const two = course((es) => { observeDoses(es, dose('insulin', 10, 'units')); observeDoses(es, dose('dextrose', 25000, 'mg')); });
    expect(Math.max(...combo)).toBeGreaterThan(10);
    expect(Math.min(...combo)).toBeLessThan(5);
    for (let i = 0; i < combo.length; i++) expect(Math.abs(combo[i]! - two[i]!)).toBeLessThan(0.1);
  });
  it('a combined-row dose in another unit is ignored', () => {
    const g = course((es) => observeDoses(es, dose('insulinDextrose', 10, 'mg')));
    expect(Math.max(...g) - Math.min(...g)).toBeLessThan(0.05);
  });
});
```

Create `packages/engine-core/test/engine/fu10-insulin-dextrose.test.ts`:

```ts
// FU-10 Task A4 (E8; research/14 ET-31) and the insulin nadir (E12a; research/14 ET-20a — Task A5 dropped by ruling
// R-1, so the nadir is held here as an `it.fails`). Awake, spontaneous, room air; 70 kg; seed 7.
import { describe, expect, it } from 'vitest';
import { drug, rows, st } from '../helpers/fu10.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({ glu: st(e).endo.core.out.glucoseMmol as number, k: st(e).blood.out.k as number });
const arm = (doses: [number, Record<string, unknown>][]) => rows(doses, 300 + 3 * 3600, 60, read);

describe('FU-10 E8/E12a: insulin–dextrose and the insulin nadir', { timeout: 900_000 }, () => {
  it('the combined row: glucose rises, then falls below baseline; K⁺ −0.6 to −1.0 at 60 min (tables §5b.2)', async () => {
    const c = await arm([[300, drug('insulinDextrose', 10, 'units')]]);
    const ctl = await arm([]);
    const g0 = ctl.find((x) => x.t === 300)!.glu;
    const k60 = c.find((x) => x.t === 300 + 3600)!.k - ctl.find((x) => x.t === 300 + 3600)!.k;
    console.log(`FU-10 E8: combined row glucose max +${(Math.max(...c.map((x) => x.glu)) - g0).toFixed(2)}, min ${(Math.min(...c.map((x) => x.glu)) - g0).toFixed(2)} mmol/L; K⁺ ${k60.toFixed(2)} at 60 min`);
    expect(Math.max(...c.map((x) => x.glu)) - g0).toBeGreaterThan(3);
    expect(Math.min(...c.map((x) => x.glu)) - g0).toBeLessThan(-1);
    expect(k60).toBeLessThanOrEqual(-0.6);
    expect(k60).toBeGreaterThanOrEqual(-1.0);
  });
  // R45 / ruling R-1 (A5 dropped): the remote-insulin lag cannot move without breaking the sourced 75 g OGTT band
  // (`glucose.test.ts` < 140 mg/dL at 2 h); the nadir waits for the insulin's own disposition (Requests → FU-8 Part B).
  it.fails('insulin 10 units IV, awake: nadir at 20–30 min (insulin-tolerance test) — measured 13.3 min', async () => {
    const r = await arm([[300, drug('insulin', 10, 'units')]]);
    const n = r.filter((x) => x.t >= 300 && x.t <= 300 + 3600).reduce((b, x) => (x.glu < b.glu ? x : b));
    expect((n.t - 300) / 60).toBeGreaterThanOrEqual(20);
    expect((n.t - 300) / 60).toBeLessThanOrEqual(30);
  });
});
```

- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/blood test/engine/fu10-insulin-dextrose.test.ts test/engine/blood-hyperk.test.ts test/engine/blood-ecg.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-31 ET-20 ET-22`.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the insulin-dextrose row reaches the glucose model (FU-10 E8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A5: (DROPPED — orchestrator ruling R-1) E12(a), the insulin nadir

The remote-insulin rate constant cannot move without breaking the sourced 75 g OGTT band (`test/l2/endo/glucose.test.ts`:
< 140 mg/dL at 2 h; review F1: p2 0.016 gives 142.1, the threshold lies between 0.020 and 0.018). Nothing is changed.
ET-20a stays at its main value and is held by the `it.fails` "nadir at 20–30 min — measured 13.3 min" in
`test/engine/fu10-insulin-dextrose.test.ts` (Task A4). The nadir needs the insulin's own disposition (7g's insulin
row), routed under Requests → FU-8 Part B's insulin item.

---

### Task A6: E10 + E13 — etomidate suppresses cortisol synthesis; adrenal insufficiency is a basal deficit (7e; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,hormones,effects,core,adapters}.ts`; create
`test/l2/endo/fu10-adrenal.test.ts`, `test/engine/fu10-adrenal.test.ts`.
**Overlap / coordination with FU-7 (Tasks 9 and 18; D13):** FU-7 adds a fourth POSITIONAL argument `cortExo` to
`stressEffects(…)` and edits the same `const st = stressEffects(…)` line; FU-10 adds `cortBasalF` as a FIELD of
`HormoneInputs` and replaces the `cortResponse` literal with `cortResponseOf(c)`. Merged form (whichever lands second):
`stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponseOf(c), x.cortExoNmolL ?? 0)`. The
exogenous glucocorticoid JOINS the permissive SVR term (ruling R-9, review F16) — Task B7 makes that edit once FU-7's
`cortExo` exists, and adds the hydrocortisone row FU-7's plan hands to FU-10.

**Why (research/14 E10/E13, ET-34 MI, ET-15a TW):** etomidate did not touch the adrenal (cortisol at 4 h 1582 vs 1575);
adrenal insufficiency changed nothing at rest or after induction, because `cortResponse` 0.5 halved only the stress RISE.

**Mechanism (D8, D9):** (a) 7e observes an etomidate dose and keeps an 11β-hydroxylase suppression that recovers with
t½ 8 h and multiplies the cortisol RESPONSE (ruling R-9: 8 h for a single induction dose in an elective patient; Absalom
1999 found ≥ 24 h in the critically ill — recorded); (b) the adrenal-insufficiency profile lowers the BASAL cortisol
(×0.5), and cortisol below basal costs resting SVR (permissive effect, below basal only).

**Measured:** ET-34 cortisol at 4 h **1031 vs 1575 nmol/L = 0.655** (TS → PL; engine test 0.653). ET-15a: post-induction MAP **70.02 vs 73.51**, surgical **−4.1** mmHg (engine test −4.2; band beyond 5 → `it.fails`), phenylephrine **0.68** of normal (PL), cortisol **233 vs 532**. Healthy patients bit-identical in every stress row (ET-16a–c within 0.4 nmol/L of cortisol).

- [ ] **Step — the edits and the new files** (each find matches exactly once in application order):

In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const CORT_VASO_RESP = 0.3; // vasopressor responsiveness (adrenal insufficiency: ×0.5 of cortisol) [TXT]```

Replace with:

```ts
export const CORT_VASO_RESP = 0.3; // vasopressor responsiveness (adrenal insufficiency: ×0.5 of cortisol) [TXT]
/**
 * FU-10 E13 — untreated adrenal insufficiency is a BASAL deficit, not only a blunted stress rise: the resting cortisol
 * is low, so the permissive support of vascular tone is already missing before any stress (Annane D et al., Crit Care
 * Med 2017;45:2078 / Intensive Care Med 2017 (the glucocorticoid-deficiency guidelines: vasopressor-dependent
 * hypotension reversed by hydrocortisone); Miller 10e ch. 35). Before FU-10 `cortResponse` 0.5 halved only the stress
 * RISE, so the resting patient was exactly normal (research/14 ET-15a). [ENG size: a basal cortisol at half normal,
 * the same fraction the stress response already carried.]
 */
export const AI_CORT_BASAL_F = 0.5;
/**
 * FU-10 E13 — cortisol is PERMISSIVE for vascular tone: below the basal level the vessels lose part of their resting
 * resistance (the vasoplegia of glucocorticoid deficiency; Annane 2017). × on SVR = 1 − CORT_SVR_PERMISSIVE · (1 −
 * cortisol/basal), applied BELOW basal only (a high cortisol does not raise SVR: the receptor is saturated) [ENG size:
 * the ET-15a target is a lower resting/post-induction MAP that a vasopressor answers poorly].
 */
export const CORT_SVR_PERMISSIVE = 0.25;
/**
 * FU-10 E10 — one induction dose of etomidate inhibits 11β-hydroxylase, so the adrenal cannot make cortisol for hours
 * (Wagner RL, White PF et al., NEJM 1984;310:1415; Absalom A, Pledger D, Kong A, Anaesthesia 1999;54:861 [VERIFY]).
 * The suppression follows the dose with a first-order recovery (t½ chosen inside the sources' 6–12 h) and multiplies the
 * adrenal's cortisol RESPONSE (`cortResponse`), so the resting level is untouched and the surgical rise is blunted.
 * ETOM_SUPPR_MAX at the 0.3 mg/kg reference dose [ENG: the ET-34 target is cortisol ≤ 0.8 × propofol's at 4 h].
 */
export const ETOM_SUPPR_MAX = 0.6;
export const ETOM_SUPPR_REF_MG_KG = 0.3;
export const ETOM_SUPPR_T12_S = 8 * 3600;```

In `packages/engine-core/src/l2/endo/hormones.ts`, find:

```ts
  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)```

Replace with:

```ts
  cortResponse: number; // 1 normal, 0.5 adrenal insufficiency / etomidate (tables)
  /** FU-10 E13: × on the BASAL cortisol target (adrenal insufficiency: a resting deficit, not only a blunted rise). */
  cortBasalF?: number;```

In `packages/engine-core/src/l2/endo/hormones.ts`, find:

```ts
export function createHormones(): HormoneState {
  return { symp: 0, hum: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL, cortDrive: 0 };
}```

Replace with:

```ts
export function createHormones(cortBasalF = 1): HormoneState {
  return { symp: 0, hum: 0, epi: EPI_BASAL_PG_ML, epiExo: 0, ne: NE_BASAL_PG_ML, cort: CORT_BASAL * cortBasalF, cortDrive: 0 };
}```

In `packages/engine-core/src/l2/endo/hormones.ts`, find:

```ts
  const cSs = CORT_BASAL * (1 + CORT_GAIN * h.cortDrive * x.cortResponse);```

Replace with:

```ts
  const cSs = CORT_BASAL * (x.cortBasalF ?? 1) * (1 + CORT_GAIN * h.cortDrive * x.cortResponse); // FU-10 E13: the basal deficit```

In `packages/engine-core/src/l2/endo/effects.ts`, find:

```ts
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, HUM_SVR, HUM_V0,
} from './params.ts';```

Replace with:

```ts
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, HUM_SVR, HUM_V0, CORT_SVR_PERMISSIVE,
} from './params.ts';```

In `packages/engine-core/src/l2/endo/effects.ts`, find:

```ts
    svrF: (1 + G_SYMP_SVR * h.symp) * (1 + EPI_BETA2_SVR * b2) * (1 + EPI_ALPHA_SVR * al),```

Replace with:

```ts
    // FU-10 E13: cortisol's permissive effect on resting vascular tone, below basal only
    svrF: (1 + G_SYMP_SVR * h.symp) * (1 + EPI_BETA2_SVR * b2) * (1 + EPI_ALPHA_SVR * al) * (1 - CORT_SVR_PERMISSIVE * Math.max(0, 1 - h.cort / CORT_BASAL)),```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
/** β2 bronchodilation of endogenous + 7g epinephrine and 7g's other β2 agonists (independent effects combine). */```

Replace with:

```ts
/**
 * FU-10 E10/E13: the adrenal's cortisol RESPONSE — halved by the adrenal-insufficiency profile (as before) and, on top
 * of it, suppressed by an 11β-hydroxylase inhibitor the patient has had (etomidate: `etomSuppr`, 0–1).
 */
export function cortResponseOf(c: EndoCore): number {
  return (c.profile.adrenalInsufficiency ? 0.5 : 1) * Math.max(0, 1 - ETOM_SUPPR_MAX * Math.min(1, Math.max(0, c.etomSuppr ?? 0)));
}

/** FU-10 E13: the × on the BASAL cortisol of this patient (adrenal insufficiency is a resting deficit too). */
export const cortBasalF = (p: EndoProfile): number => (p.adrenalInsufficiency ? AI_CORT_BASAL_F : 1);

/** β2 bronchodilation of endogenous + 7g epinephrine and 7g's other β2 agonists (independent effects combine). */```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  const cortResponse = p.adrenalInsufficiency ? 0.5 : 1;```

Replace with:

```ts
  const cortResponse = cortResponseOf(c);```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  x: EndoInputs; // the last inputs (compose reads the β-block, temperature, MH and 7g's bronchodilation from them)
  out: EndoOut;```

Replace with:

```ts
  x: EndoInputs; // the last inputs (compose reads the β-block, temperature, MH and 7g's bronchodilation from them)
  /** FU-10 E10: 11β-hydroxylase suppression left by an etomidate dose (0–1), recovering with ETOM_SUPPR_T12_S. */
  etomSuppr?: number;
  out: EndoOut;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  const c: EndoCore = {
    profile, hormones: createHormones(), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg }, out: null as unknown as EndoOut,
  };```

Replace with:

```ts
  const c: EndoCore = {
    profile, hormones: createHormones(cortBasalF(profile)), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg },
    etomSuppr: 0, out: null as unknown as EndoOut,
  };```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
import {
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';```

Replace with:

```ts
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S,
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, mapSetMmHg: x.mapSetMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: c.profile.adrenalInsufficiency ? 0.5 : 1, epiExoPgMl: x.epiExoPgMl,
  }, dtS);```

Replace with:

```ts
  // FU-10 E10: an 11β-hydroxylase inhibitor's suppression recovers first-order (etomidate: 6–12 h)
  if ((c.etomSuppr ?? 0) > 0) c.etomSuppr = (c.etomSuppr ?? 0) * Math.exp((-Math.LN2 * dtS) / ETOM_SUPPR_T12_S);
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, mapSetMmHg: x.mapSetMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: cortResponseOf(c), cortBasalF: cortBasalF(c.profile), epiExoPgMl: x.epiExoPgMl,
  }, dtS);```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, c.profile.adrenalInsufficiency ? 0.5 : 1);
  const gp = glucoseProfile(c.profile);```

Replace with:

```ts
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponseOf(c));
  const gp = glucoseProfile(c.profile);```

In `packages/engine-core/src/l2/endo/adapters.ts`, find (chained on A4):

```ts
    else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8```

Replace with:

```ts
    else if (d.agent === 'etomidate') { // FU-10 E10: 11β-hydroxylase suppression for hours after one induction dose
      const perKg = d.amountUnit === 'mg/kg' ? d.amount : d.amountUnit === 'mg' ? d.amount / es.weightKg : 0;
      if (perKg > 0) es.core.etomSuppr = Math.min(1, (es.core.etomSuppr ?? 0) + perKg / ETOM_SUPPR_REF_MG_KG);
    } else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8```

In `packages/engine-core/src/l2/endo/adapters.ts`, find (chained on A4):

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';```

Replace with:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, ETOM_SUPPR_REF_MG_KG, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';```

Create `packages/engine-core/test/l2/endo/fu10-adrenal.test.ts`:

```ts
// FU-10 Task A6 (E10, E13): etomidate suppresses the adrenal's cortisol RESPONSE for hours; adrenal insufficiency is a
// BASAL deficit and cortisol below basal costs resting vascular tone (permissive effect, below basal only).
import { describe, expect, it } from 'vitest';
import { cortBasalF, cortResponseOf, createEndoCore, NEUTRAL_ENDO_INPUTS, stepEndoCore, DEFAULT_ENDO_PROFILE } from '../../../src/l2/endo/core.ts';
import { stressEffects } from '../../../src/l2/endo/effects.ts';
import { createHormones } from '../../../src/l2/endo/hormones.ts';
import { CORT_BASAL, ETOM_SUPPR_T12_S } from '../../../src/l2/endo/params.ts';

const AI = { ...DEFAULT_ENDO_PROFILE, adrenalInsufficiency: true };
const NB = { hr: 0, c: 0 };

describe('FU-10 E10/E13: etomidate and adrenal insufficiency (Wagner 1984; Absalom 1999; Annane 2017)', () => {
  it('cortResponseOf: 1 normal, 0.5 adrenal insufficiency, 0.4 after a full etomidate suppression, 0.2 for both', () => {
    const n = createEndoCore();
    const a = createEndoCore(AI);
    expect(cortResponseOf(n)).toBe(1);
    expect(cortResponseOf(a)).toBe(0.5);
    n.etomSuppr = 1;
    a.etomSuppr = 1;
    expect(cortResponseOf(n)).toBeCloseTo(0.4, 9);
    expect(cortResponseOf(a)).toBeCloseTo(0.2, 9);
  });
  it('the etomidate suppression halves in ETOM_SUPPR_T12_S (8 h)', () => {
    const c = createEndoCore();
    c.etomSuppr = 1;
    for (let s = 0; s < ETOM_SUPPR_T12_S; s += 60) stepEndoCore(c, NEUTRAL_ENDO_INPUTS, 60);
    expect(c.etomSuppr).toBeCloseTo(0.5, 2);
  });
  it('adrenal insufficiency starts at a low basal cortisol; below basal the SVR falls; a HIGH cortisol never raises it', () => {
    expect(cortBasalF(AI)).toBe(0.5);
    expect(createEndoCore(AI).hormones.cort).toBeCloseTo(0.5 * CORT_BASAL, 9);
    const low = stressEffects(createHormones(0.5), NB, 0.5);
    const normal = stressEffects(createHormones(1), NB, 1);
    const high = stressEffects({ ...createHormones(1), cort: 4 * CORT_BASAL }, NB, 1);
    expect(low.svrF).toBeLessThan(1);
    expect(normal.svrF).toBe(1);
    expect(high.svrF).toBe(1);
  });
});
```

Create `packages/engine-core/test/engine/fu10-adrenal.test.ts`:

```ts
// FU-10 Task A6 (E10, E13; research/14 ET-34, ET-15a): etomidate blunts the cortisol rise of surgery; the adrenal-
// insufficient patient is hypotensive after induction and answers phenylephrine poorly. Ventilated drug GA, seed 7.
import { describe, expect, it } from 'vitest';
import { drug, ev, GA, rows, st, VENTED, type Step } from '../helpers/fu10.ts';

const T = 300;
const H = 3600;
const INCISION: Step = [T + 600, ev({ kind: 'stimulus', intensity: 1 })];
const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({ cort: st(e).endo.core.out.cortisolNmolL as number, map: st(e).hemo.circ.mapNow as number });
const aiMemo = new Map<boolean, ReturnType<typeof aiArm0>>();
const aiArm = (adrenal: boolean) => {
  if (!aiMemo.has(adrenal)) aiMemo.set(adrenal, aiArm0(adrenal));
  return aiMemo.get(adrenal)!;
};
const aiArm0 = (adrenal: boolean) => rows([...VENTED, ...GA(T), INCISION, [T + 1200, drug('phenylephrine', 100, 'mcg')]], T + 2400, 10, read,
  adrenal ? { endo: { adrenalInsufficiency: true } } : {});
const mean = (r: { t: number; map: number }[], a: number, b: number) => { const w = r.filter((x) => x.t > a && x.t <= b); return w.reduce((s, x) => s + x.map, 0) / w.length; };

describe('FU-10 E10/E13: etomidate and adrenal insufficiency', { timeout: 900_000 }, () => {
  it('etomidate 0.3 mg/kg vs propofol 2 mg/kg, incision held 4 h: cortisol ≤ 0.8 × at 4 h (Wagner 1984)', async () => {
    const etom: Step[] = [[T, drug('etomidate', 0.3, 'mg/kg')], [T, drug('rocuronium', 0.6, 'mg/kg')], [T, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 })]];
    const e = await rows([...VENTED, ...etom, INCISION], T + 600 + 4 * H, 600, read);
    const p = await rows([...VENTED, ...GA(T), INCISION], T + 600 + 4 * H, 600, read);
    const ratio = e.at(-1)!.cort / p.at(-1)!.cort;
    console.log(`FU-10 E10: cortisol at 4 h ${e.at(-1)!.cort.toFixed(0)} vs ${p.at(-1)!.cort.toFixed(0)} nmol/L (ratio ${ratio.toFixed(3)})`);
    expect(ratio).toBeLessThanOrEqual(0.8);
  });
  it('adrenal insufficiency: a lower post-induction MAP and a phenylephrine rise ≤ 0.8 × normal (Annane 2017)', async () => {
    const a = await aiArm(true);
    const n = await aiArm(false);
    const minA = Math.min(...a.filter((x) => x.t > T && x.t <= T + 600).map((x) => x.map));
    const minN = Math.min(...n.filter((x) => x.t > T && x.t <= T + 600).map((x) => x.map));
    const pe = (r: typeof a) => Math.max(...r.filter((x) => x.t > T + 1200 && x.t <= T + 1500).map((x) => x.map)) - mean(r, T + 1140, T + 1200);
    console.log(`FU-10 E13: post-induction MAP ${minA.toFixed(1)} vs ${minN.toFixed(1)}; phenylephrine ratio ${(pe(a) / pe(n)).toFixed(2)}; surgical MAP ${(mean(a, T + 900, T + 1200) - mean(n, T + 900, T + 1200)).toFixed(1)}`);
    expect(minA).toBeLessThan(minN - 2);
    expect(pe(a) / pe(n)).toBeLessThanOrEqual(0.8);
  });
  // R45: the permissive term ([ENG] 0.25) is not tuned to the band; the mineralocorticoid volume deficit is not modelled
  // in Part A, and hydrocortisone (FU-7 D13 / Task B7) is what reverses it.
  it.fails('adrenal insufficiency: surgical MAP ≥ 5 mmHg below normal (research/14 ET-15a) — measured −4.2', async () => {
    const a = await aiArm(true);
    const n = await aiArm(false);
    expect(mean(a, T + 900, T + 1200) - mean(n, T + 900, T + 1200)).toBeLessThanOrEqual(-5);
  });
});
```

- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/engine/fu10-adrenal.test.ts test/engine/endo-acceptance.test.ts test/engine/endo-circ-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-34 ET-15a ET-16 ET-26b`.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): etomidate suppresses the cortisol response; adrenal insufficiency is a basal deficit (FU-10 E10, E13)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A7: E7(a–c) — insulin deficiency: the omitted basal insulin, a net ketone rate, the DKA potassium (7e → 7c; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/types-endo.ts`, `src/l2/endo/{core,params,adapters}.ts`,
`src/l2/blood/core.ts` (**E-FU10-2**: one statement), `test/l2/endo/core.test.ts` (**E-FU10-4**),
`packages/controller/scenarios/pme-scenario-1.schema.json` (**E-FU10-9**: the schema property only); create
`test/l2/endo/fu10-insulin-deficit.test.ts`, `test/engine/fu10-insulin-omission.test.ts`,
`packages/controller/test/scenario/fu10-basal-insulin.test.ts`.
**Overlap:** FU-9 **A4** rewrites the same `BloodLike` `core?: {…}` type line in `adapters.ts` (adding `sigma`); FU-9
A3/A5/A6 edit `blood/core.ts` around the `drug` K⁺ statement this task anchors after. Merged form of the type line
(whichever lands second): `core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number; sigma?: number };`
followed by FU-10's second line `endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number; endoKetoUtilPerMin?: number };`.
FU-8 A16 (merged) owns the rest of the `endo` schema block; FU-10 adds one property (ruling R-10).

**Why (research/14 E7, ET-18a NE, ET-18b MI, ET-23c WR):** the type 1 profile always carried its basal insulin; insulin
deficiency made no ketones; the instructor's DKA presented hypokalaemic (3.70 vs the healthy 4.18).

**Mechanism (D7, ruling R-2):** (a) `endo.basalInsulin: false` omits the long-acting insulin of a type 1 patient (engine
and scenario schema); (b) a NET ketone rate through one seam pair: production from the CURRENT insulin deficit
(smoothed τ 30 min, not the 3-h `egpDef`) minus insulin-dependent utilisation of 7c's pool — so insulin treats the
ketoacidosis, the instructor's `dka` pool included; (c) insulinopenia (the smoothed deficit, or the instructor's
`dka`) shifts K⁺ out, and hyperosmolar hyperglycaemia does too, in the insulin-deficient patient only (review F17).

**Measured:** Engine test, type 1 with the basal insulin omitted 6 h: glucose **35.5 mmol/L**, ketones **11.5 mmol/L**, pH **7.31**, K⁺ **6.05** (on basal insulin: 7.2 / 0 / 4.17). Insulin 0.1 units/kg/h from 6 h: ketones **11.53 → 8.88 in 3 h (0.88 mmol/L/h, JBDS ≥ 0.5)**, glucose 5.1 mmol/L, K⁺ **3.25** (the expected fall on insulin). ET-23c (instructor `dka 1`): K⁺ **4.48 vs healthy 4.18** (main 3.68), after intubation +0.38 (main −0.01); WR → TW (auto; the report's §7 item 'K⁺ ≥ healthy' is met). ET-23a–d otherwise within 0.3 (HCO₃ 4.30 → 4.63: the instructor pool is now utilised at the insulin the patient has). Non-diabetic rows unchanged.

- [ ] **Step — the edits and the new files** (each find matches exactly once in application order):

In `packages/engine-core/src/types-endo.ts`, find:

```ts
export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';```

Replace with:

```ts
export interface EndoProfileInput {
  diabetes?: 'none' | 'type1' | 'type2';
  /** FU-10 E7: type 1 only — `false` OMITS the long-acting basal insulin (the missed-dose case: ketosis within hours).
   * Default `true` (the profile as it behaved before FU-10). FU-8 A16 carries it into `pme-scenario/1`. */
  basalInsulin?: boolean;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';```

Replace with:

```ts
export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';
  /** FU-10 E7: type 1 only — false omits the long-acting basal insulin (insulin-deficient: ketogenesis, K⁺ efflux). */
  basalInsulin: boolean;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false };```

Replace with:

```ts
export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false, basalInsulin: true };```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: true };```

Replace with:

```ts
  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: p.basalInsulin !== false }; // FU-10 E7```

In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const MH_K_EFFLUX = 2.2;```

Replace with:

```ts
/**
 * FU-10 E7 (orchestrator ruling R-2) — a NET ketone rate. Production follows the CURRENT insulin deficit (lipolysis and
 * hepatic ketogenesis respond within tens of minutes, so the deficit is smoothed with KETO_TAU_S, not with the 3-h
 * `egpDef` of hepatic glucose output); utilisation is insulin-dependent: 7c's pool is cleared at a fractional rate
 * KETO_UTIL_PER_MIN × the insulin action (insulin ÷ basal, saturating at KETO_UTIL_INS_MAX), so ketones fall once
 * insulin is given and the ketoacidosis is treatable (JBDS DKA 2023 target: ketones falling ≥ 0.5 mmol/L/h on the
 * fixed-rate infusion). Omitted basal insulin in type 1 produces ketosis within hours (JBDS-IP 2023; Kitabchi AE et al.,
 * Diabetes Care 2009;32:1335). Sizes [ENG; fit targets: ketosis > 3 mmol/L within the first hours of omission, and the
 * JBDS fall rate on the infusion]. 7c's established DKA (`DKA_KETO_MMOL_L` 25 mmol/L) is the pool's scale.
 */
export const KETO_MMOL_MIN_MAX = 0.5;
export const KETO_TAU_S = 1800;
export const KETO_UTIL_PER_MIN = 0.0004;
export const KETO_UTIL_INS_MAX = 5;
/** FU-10 E7: the insulin deficit shifts K OUT of the cells (Kitabchi 2009: insulinopenia is one of DKA's two causes of
 * hyperkalaemia) — mmol/L of K set point at a full deficit [ENG: with the hyperosmolar term, DKA presents ≥ healthy]. */
export const KETO_K_EFFLUX = 1.4;
/** FU-10 E7: hyperosmolar hyperglycaemia is the other (water leaves the cells with K): mmol/L of K set point per mg/dL
 * of glucose above HYPEROSM_FROM_MGDL, in the INSULIN-DEFICIENT patient only (× the deficit — review F17: a dextrose
 * bolus given to a patient with insulin does not shift K out) [ENG; Kitabchi 2009]. */
export const HYPEROSM_K_PER_MGDL = 0.002;
export const HYPEROSM_FROM_MGDL = 200;
export const MH_K_EFFLUX = 2.2;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  kShift: number; // mmol/L ENDOGENOUS K set-point shift (endogenous epinephrine β2, secreted insulin, MH efflux) → 7c```

Replace with:

```ts
  kShift: number; // mmol/L ENDOGENOUS K set-point shift (endogenous epinephrine β2, secreted insulin, MH efflux) → 7c
  /** FU-10 E7: ketoacid production from the INSULIN DEFICIT, mmol/min → 7c's ketoacid pool (`blood.core.endoKetoMmolMin`). */
  ketoMmolMin: number;
  /** FU-10 E7 (R-2): insulin-dependent ketone utilisation, fraction of 7c's pool per minute (`blood.core.endoKetoUtilPerMin`). */
  ketoUtilPerMin: number;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity,```

Replace with:

```ts
    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity
      // FU-10 E7: insulin deficiency and hyperosmolar hyperglycaemia drive K OUT of the cells (JBDS DKA 2023: K is often
      // high at presentation despite a total-body deficit) — the two DKA causes the old K path had no term for.
      // The instructor's `dka` condition (7c's severity) IS insulinopenia, so it carries the same efflux even though the
      // patient's own insulin is normal — without this DKA presented HYPOkalaemic (research/14 ET-23c)
      + insulinopenia(c) * (KETO_K_EFFLUX + HYPEROSM_K_PER_MGDL * Math.max(0, g.g - HYPEROSM_FROM_MGDL)),
    ketoMmolMin: KETO_MMOL_MIN_MAX * (c.ketoDef ?? 0) * (x.weightKg / 70),
    ketoUtilPerMin: KETO_UTIL_PER_MIN * Math.min(KETO_UTIL_INS_MAX, g.i / IB_UU_ML),```

In `packages/engine-core/src/l2/endo/core.ts`, find (chained on A6):

```ts
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S,```

Replace with:

```ts
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,
  KETO_TAU_S, KETO_UTIL_INS_MAX, KETO_UTIL_PER_MIN,```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; endoKShift?: number; endoGlucoseMgDl?: number };```

Replace with:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number; endoKetoUtilPerMin?: number };```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;```

Replace with:

```ts
  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;
  c.endoKetoMmolMin = o.ketoMmolMin; // FU-10 E7: ketogenesis from the insulin deficit — 7c integrates it into its pool
  c.endoKetoUtilPerMin = o.ketoUtilPerMin; // FU-10 E7 (R-2): insulin-dependent utilisation of that pool```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux```

Replace with:

```ts
  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux
  // FU-10 E7 (E-FU10-2, ruling R-2): Stage 7e's NET ketone rate — production from the insulin deficit minus its
  // insulin-dependent utilisation of 7c's pool (which 7c owns, the instructor's `condition dka` pool included): the
  // acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive emerge from it, and insulin treats it
  const kx = bc as { endoKetoMmolMin?: number; endoKetoUtilPerMin?: number };
  so.keto = Math.max(0, so.keto + (Math.max(0, kx.endoKetoMmolMin ?? 0) - so.keto * Math.max(0, kx.endoKetoUtilPerMin ?? 0)) * (dtS / 60));```

In `packages/engine-core/src/l2/endo/core.ts`, find (chained on A6):

```ts
  /** FU-10 E10: 11β-hydroxylase suppression left by an etomidate dose (0–1), recovering with ETOM_SUPPR_T12_S. */
  etomSuppr?: number;```

Replace with:

```ts
  /** FU-10 E10: 11β-hydroxylase suppression left by an etomidate dose (0–1), recovering with ETOM_SUPPR_T12_S. */
  etomSuppr?: number;
  /** FU-10 E7 (R-2): the ketogenic insulin deficit (0–1), the current deficit smoothed with KETO_TAU_S. */
  ketoDef?: number;```

In `packages/engine-core/src/l2/endo/core.ts`, find (chained on A6):

```ts
/** FU-10 E13: the × on the BASAL cortisol of this patient (adrenal insufficiency is a resting deficit too). */```

Replace with:

```ts
/** FU-10 E7: the insulinopenia that shifts K⁺ out of the cells — the patient's own (smoothed) insulin deficit, or the
 * instructor's `dka` condition, which IS insulinopenia even though the profile's insulin is normal (research/14 ET-23c). */
export function insulinopenia(c: EndoCore): number {
  return Math.max(c.ketoDef ?? 0, Math.min(1, Math.max(0, c.x.dkaSeverity)));
}

/** FU-10 E13: the × on the BASAL cortisol of this patient (adrenal insufficiency is a resting deficit too). */```

In `packages/engine-core/src/l2/endo/core.ts`, find (chained on A6):

```ts
  if ((c.etomSuppr ?? 0) > 0) c.etomSuppr = (c.etomSuppr ?? 0) * Math.exp((-Math.LN2 * dtS) / ETOM_SUPPR_T12_S);```

Replace with:

```ts
  if ((c.etomSuppr ?? 0) > 0) c.etomSuppr = (c.etomSuppr ?? 0) * Math.exp((-Math.LN2 * dtS) / ETOM_SUPPR_T12_S);
  // FU-10 E7 (R-2): the ketogenic deficit follows the CURRENT insulin deficit within tens of minutes
  const kd = Math.max(0, 1 - g.i / IB_UU_ML);
  c.ketoDef = kd + ((c.ketoDef ?? 0) - kd) * Math.exp(-dtS / KETO_TAU_S);```

In `packages/engine-core/test/l2/endo/core.test.ts`, find:

```ts
const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false } as const;```

Replace with:

```ts
const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false, basalInsulin: true } as const; // FU-10 E7: the basal insulin can now be omitted```

Create `packages/engine-core/test/l2/endo/fu10-insulin-deficit.test.ts`:

```ts
// FU-10 Task A7 (E7; ruling R-2): insulin deficiency — the type 1 basal insulin can be omitted; a NET ketone rate
// (production from the current deficit, insulin-dependent utilisation); K⁺ out of the cells in insulinopenia only.
import { describe, expect, it } from 'vitest';
import { createEndoCore, DEFAULT_ENDO_PROFILE, glucoseProfile, insulinopenia, NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../../src/l2/endo/core.ts';
import { dextroseBolus, insulinInfusion } from '../../../src/l2/endo/glucose.ts';

const T1 = { ...DEFAULT_ENDO_PROFILE, diabetes: 'type1' as const };
const run = (c: ReturnType<typeof createEndoCore>, s: number) => { for (let i = 0; i < s; i++) stepEndoCore(c, { ...NEUTRAL_ENDO_INPUTS }, 1); };

describe('FU-10 E7: insulin deficiency (JBDS-IP 2023; JBDS DKA 2023; Kitabchi 2009)', () => {
  it('a type 1 patient has its basal insulin unless it is omitted', () => {
    expect(glucoseProfile(T1).basalExo).toBe(true);
    expect(glucoseProfile({ ...T1, basalInsulin: false }).basalExo).toBe(false);
  });
  it('omitted: within 1 h the deficit drives ketone production and K⁺ out; on its basal insulin nothing moves', () => {
    const off = createEndoCore({ ...T1, basalInsulin: false });
    const on = createEndoCore(T1);
    run(off, 3600);
    run(on, 3600);
    expect(off.out.ketoMmolMin).toBeGreaterThan(0.25);
    expect(off.out.kShift).toBeGreaterThan(0.5);
    expect(on.out.ketoMmolMin).toBe(0);
    expect(on.out.kShift).toBeCloseTo(0, 6);
  });
  it('insulin restores utilisation (the pool clears) and stops production', () => {
    const c = createEndoCore({ ...T1, basalInsulin: false });
    run(c, 3600);
    insulinInfusion(c.glucose, 7);
    run(c, 2 * 3600);
    expect(c.out.ketoMmolMin).toBeLessThan(0.05);
    expect(c.out.ketoUtilPerMin).toBeGreaterThan(0.001);
  });
  it('the instructor\'s `dka` severity is insulinopenia; a dextrose bolus in a patient WITH insulin shifts no K⁺ out (review F17)', () => {
    const c = createEndoCore();
    stepEndoCore(c, { ...NEUTRAL_ENDO_INPUTS, dkaSeverity: 1 }, 1);
    expect(insulinopenia(c)).toBe(1);
    const h = createEndoCore();
    dextroseBolus(h.glucose, 25, 70);
    stepEndoCore(h, { ...NEUTRAL_ENDO_INPUTS }, 1);
    expect(h.out.kShift).toBeLessThanOrEqual(0);
  });
});
```

Create `packages/engine-core/test/engine/fu10-insulin-omission.test.ts`:

```ts
// FU-10 Task A7 (E7; research/14 ET-18a/b, ET-23c; ruling R-2): type 1 with the basal insulin omitted becomes
// hyperglycaemic, ketotic and hyperkalaemic; the fixed-rate insulin infusion then lowers the ketones ≥ 0.5 mmol/L/h
// (JBDS DKA 2023). Awake, spontaneous room air; 70 kg; seed 7.
import { describe, expect, it } from 'vitest';
import { ev, rows, st } from '../helpers/fu10.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({
  glu: st(e).endo.core.out.glucoseMmol as number, keto: 25 * (st(e).blood.out.dkaSeverity as number), k: st(e).blood.out.k as number, ph: st(e).blood.core.ab.ph as number,
});
const T1 = (basalInsulin: boolean) => ({ endo: { diabetes: 'type1' as const, basalInsulin } });
const H = 3600;

describe('FU-10 E7: the missed basal insulin and its treatment', { timeout: 900_000 }, () => {
  it('omitted for 6 h: glucose > 20 mmol/L, ketones > 3 mmol/L, K⁺ above the patient on basal insulin; the latter unchanged', async () => {
    const off = await rows([], 6 * H, 600, read, T1(false));
    const on = await rows([], 6 * H, 600, read, T1(true));
    const a = off.at(-1)!;
    const b = on.at(-1)!;
    console.log(`FU-10 E7 omitted 6 h: glucose ${a.glu.toFixed(1)}, ketones ${a.keto.toFixed(2)} mmol/L, pH ${a.ph.toFixed(2)}, K⁺ ${a.k.toFixed(2)}; on basal: ${b.glu.toFixed(1)} / ${b.keto.toFixed(2)} / ${b.k.toFixed(2)}`);
    expect(a.glu).toBeGreaterThan(20);
    expect(a.keto).toBeGreaterThan(3);
    expect(a.k).toBeGreaterThan(b.k + 0.5);
    expect(b.keto).toBe(0);
  });
  it('insulin 0.1 units/kg/h from 6 h: ketones fall ≥ 0.5 mmol/L/h over the next 3 h (JBDS DKA 2023 target)', async () => {
    const r = await rows([[6 * H + 1, ev({ kind: 'infusion', drugId: 'insulin', rate: 0.1, unit: 'units/kg/h' })]], 9 * H, 600, read, T1(false));
    const k6 = r.find((x) => x.t === 6 * H)!.keto;
    const k9 = r.at(-1)!.keto;
    console.log(`FU-10 E7 treated: ketones ${k6.toFixed(2)} → ${k9.toFixed(2)} mmol/L in 3 h (${((k6 - k9) / 3).toFixed(2)} /h); glucose ${r.at(-1)!.glu.toFixed(1)}, K⁺ ${r.at(-1)!.k.toFixed(2)}`);
    expect((k6 - k9) / 3).toBeGreaterThanOrEqual(0.5);
  });
});
```

In `packages/controller/scenarios/pme-scenario-1.schema.json`, find:

```json
          "properties": { "diabetes": { "enum": ["none", "type1", "type2"] }, "thyroid": { "enum": ["normal", "hypo", "hyper"] }, "adrenalInsufficiency": { "type": "boolean" } }```

Replace with:

```json
          "properties": { "diabetes": { "enum": ["none", "type1", "type2"] }, "thyroid": { "enum": ["normal", "hypo", "hyper"] }, "adrenalInsufficiency": { "type": "boolean" },
            "basalInsulin": { "type": "boolean", "description": "FU-10 E7 (E-FU10-9): type 1 only — false omits the long-acting basal insulin (default true)." } }```

Create `packages/controller/test/scenario/fu10-basal-insulin.test.ts`:

```ts
// FU-10 Task A7 (E-FU10-9, ruling R-10): the scenario schema carries the type 1 `basalInsulin` option 1:1 to the engine.
import { describe, expect, it } from 'vitest';
import { validateScenario } from '../../src/scenario/validate.ts';

const doc = (endo: Record<string, unknown>) => ({
  schema: 'pme-scenario/1', id: 'x', title: 'X', initialState: 'a', patient: { endo },
  states: [{ id: 'a', label: 'A', transitions: [{ id: 't1', to: 'b', when: { afterS: 5 } }] }, { id: 'b', label: 'B' }],
});

describe('FU-10 E7: patient.endo.basalInsulin', () => {
  it('accepts a type 1 patient whose basal insulin is omitted, and rejects a non-boolean', () => {
    expect(validateScenario(doc({ diabetes: 'type1', basalInsulin: false })).ok).toBe(true);
    expect(validateScenario(doc({ diabetes: 'type1', basalInsulin: 'no' })).ok).toBe(false);
  });
});
```

- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/blood test/engine/fu10-insulin-omission.test.ts test/engine/blood-k-rhythm.test.ts test/engine/blood-sanity-acid.test.ts test/engine/blood-hyperk.test.ts` and `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-18 ET-23 ET-20 ET-16c ET-17`; add `endo: { diabetes: 'type1', basalInsulin: false }` to a scratch copy of ET-18a's arm and quote it.
- [ ] **Commit and push.** `git add -A packages/engine-core packages/controller && git commit -m "feat(7e,7c): insulin deficiency makes and insulin clears ketones; the DKA potassium; the type 1 basal insulin can be omitted (FU-10 E7, E-FU10-2, E-FU10-4, E-FU10-9)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A8: (WITHDRAWN from Part A — orchestrator ruling R-3, pending Ali) E11(a), fever under general anaesthesia

Only the `it.fails` file below lands: ET-12 and ET-13a stay afebrile (36.86 / 36.58 °C) and are held by it. The design
stays a PROPOSAL for Ali's decision (Open question 7): either (a) a PRESENTATION state — the condition's onset moves the
core to its raised set point while the awake defences act, and anaesthesia then acts on a febrile patient; or (b) an
ONGOING heat source that anaesthesia does not suppress, raised through `vo2F`/`extraX` so that VO₂, VCO₂ and EtCO₂ carry
its cost (10–13 %/°C, the ET cell's own grade). The writer's first draft — a 120 W heat source with no O₂ cost — is
withdrawn (review F2: nearly twice the anaesthetised metabolic heat of 64 W, and it moved the septic propofol row of
`audit:physiology`).

- [ ] **Step — the edits and the new files** (each find matches exactly once in application order):

Create `packages/engine-core/test/engine/fu10-fever.test.ts`:

```ts
// FU-10 (E11; research/14 ET-12, ET-13a; ruling R-3): Task A8 is WITHDRAWN pending Ali — the anaesthetised septic and
// thyrotoxic patients stay afebrile. Held here as `it.fails` with the measured numbers (GA flag, 21 °C, seed 7).
import { describe, expect, it } from 'vitest';
import { ev, FLAG, rows, st, VENTED } from '../helpers/fu10.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0]) => ({ tc: st(e).resp.temp.tc as number });

describe('FU-10 E11: fever under general anaesthesia (withdrawn, ruling R-3)', { timeout: 900_000 }, () => {
  it.fails('sepsis (phase sepsis) under GA: core 38.5–41 °C at 90 min (tables §5e) — measured 36.86', async () => {
    const r = await rows([...VENTED, FLAG, [60, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'sepsis' })]], 60 + 90 * 60, 60, read);
    expect(r.at(-1)!.tc).toBeGreaterThanOrEqual(38.5);
  });
  it.fails('thyroid storm under GA: core 38.5–41 °C at 1 h (thyroid.ts header; tables §5c) — measured 36.58', async () => {
    const r = await rows([...VENTED, FLAG, [60, ev({ kind: 'condition', id: 'thyroidStorm', severity: 1 })]], 60 + 3600, 60, read);
    expect(r.at(-1)!.tc).toBeGreaterThanOrEqual(38.5);
  });
});
```

- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu10-fever.test.ts` → both `it.fails` hold.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "test(7e): fever under anaesthesia recorded as it.fails pending Ali (FU-10 E11, ruling R-3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

## Part B — after the named predecessor merges

### Task B0: Part B base — merge main and re-verify every Part B block (no code change)

- [ ] `git fetch origin && git merge origin/main` (never `git stash`; resolve by keeping both sides' statements).
- [ ] Record which predecessors are in: **FU-7** (B1: Task 9's seam; B5: Task 12; B6: `l2/pk`; B7: Task 18's
  `cortExo` and the glucocorticoid target), **FU-9 A2** (B2, B3), **FU-9 A1** (B4). A task whose predecessor is absent
  is SKIPPED and named in the gate note; it never lands "adapted".
- [ ] Re-check every Part B find block on the merged tree, re-run Part A's tests, and re-measure the ET cells Part A
  moved (`./run.sh cli.ts ET-01b ET-03a ET-04 ET-10a ET-15a ET-18 ET-23 ET-31 ET-34`) against the merged base.

---

### Task B1: E4 + E12(b) — cold and hypoglycaemia drive the sympathetic system, inside FU-7's seam (7e hormones; requires FU-7 Task 9 and Task 10; UNPROTOTYPED)

**Precondition:** FU-7 merged — `git grep -n "sympDrug\|antinocOp\|catReserve" -- packages/engine-core/src/l2/endo/core.ts`.
FU-7's landed line (read on `origin/fu-7-drug-layer` while this plan was fixed) is:
`noxious: x.noxious, antinoc: x.antinoc, antinocOp: x.antinocOp, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity + (x.sympDrug ?? 0) * c.out.catReserve, // FU-7 (addenda 20–21, 25)`.

**Why (research/14 E4, ET-05b WR / 05c TW; E12, ET-21a WR):** at a 34.5 °C emergence shivering raises VO₂ +59 % while
noradrenaline is 275 = 275 pg/mL, HR −2, MAP −0.5 (Frank SM et al., Anesthesiology 1995;82:83–93: core −1.3 °C raises
noradrenaline ≈ ×4 [VERIFY the factor] with vasoconstriction and a higher MAP); the hypoglycaemic HR rise is LARGER
under GA (+26) than awake (+16) because the hypoglycaemic drive enters `extraSymp` unblunted.

**Mechanism — bound by FU-7's four rules (D13):**
1. the COLD drive `COLD_SYMP_PER_C · max(0, thr.vaso − Tc)` (the threshold from `currentThresholds`, so it starts where
   the patient's own defence starts; [ENG] sized to Frank 1995) enters the `extraSymp` sum **× `c.out.catReserve`**
   (a noradrenaline RELEASE, rule ii) — never `h.surge` (rule i);
2. the hypoglycaemic term `hypo` is scaled by `(1 − antinoc)` — the WHOLE antinociception (hypnotic + opioid:
   unconsciousness masks the signs), not FU-7's `antinocOp` — and is NOT multiplied by `catReserve` (rule ii: 7e's own
   adrenaline);
3. the merged statement, re-anchored on FU-7's line without reordering it (rule iv):
   `… extraSymp: cd.extraSymp + hypo * (1 - Math.min(1, Math.max(0, x.antinoc))) + 2 * x.mhActivity + (x.sympDrug ?? 0) * c.out.catReserve + coldSymp(c, x) * c.out.catReserve, // FU-7 (addenda 20–21, 25); FU-10 (E4, E12b)`
   with `coldSymp` reading the thermal thresholds through the inputs (`EndoInputs.coldC`: 7e's adapters write
   `max(0, currentThresholds(th).vaso − th.tc)`), plus the two constants in `l2/endo/params.ts`;
4. the ADRENAL counter-regulation (`adrenalDrive`'s hypoglycaemia term) is untouched: the masking acts on the neural
   signs only (review F7: Miller's "recognised late" is about the signs, not the hormone release).
5. E4(b) — the CO that should follow the extra VO₂ — is audit 09 R11's owner (Requests); B1 records CO with its number.

**Tests (UNWRITTEN; the R45 procedure):** `test/l2/endo/fu10-cold-drive.test.ts` (0 above the threshold; rises below;
× `catReserve`; the hypoglycaemic term halves at `antinoc` 0.5 and ignores `catReserve`); `test/engine/fu10-cold-sympathetic.test.ts`
(the ET-05 cold emergence vs its normothermic twin: NA, HR and MAP higher; the ET-21 pair: the HR rise under GA SMALLER
than awake; **guards:** ET-20c's adrenaline ×10–20 and the glucose recovery under GA kept — `it.fails` with numbers if
the masking removes them; FU-7 Task 10's arm (f) `surgeF`/`surgeCat` exactly neutral (rule iii); ET-10c's MH HR +47
kept). Baseline on the fixed Part A tree (A5 dropped, so ET-21a is main's): HR +16 awake / +26 under GA.
**Commit:** `feat(7e): cold drives the sympathetic system and anaesthesia masks the hypoglycaemic signs (FU-10 E4, E12b)`.

---
### Task B2: E2 — aerobic muscle heat is limited by the oxygen delivered, so the core stops rising after the arrest (7e thermal; PROTOTYPED, requires FU-9 A2)

**Precondition (STOP if absent):** FU-9 A2 (`l2/blood/oxygen.ts`: VO₂ is supply-dependent only below DO₂crit) on main —
`git grep -n "FU-9 F3" -- packages/engine-core/src/l2/blood/oxygen.ts`. On today's main this task is wrong (D12): it
abolishes the MH arrest and turns `endo-acceptance.test.ts` red (review: 3 failures). The prototype patch on disk is
Part A only and does NOT contain these blocks (review F5).

**Files:** Modify `packages/engine-core/src/l2/thermal/heat.ts`, `src/l2/endo/adapters.ts`; create
`test/engine/fu10-mh-heat-limit.test.ts` (UNWRITTEN: the executor writes it from the acceptance below).
**Overlap:** FU-9 A4 (`BloodLike`, merged form in Task A7) and A2 (the precondition).

**Why (research/14 E2):** untreated MH arrests at +45 min at ≈ 42.5 °C and the dead patient then heats to **47.8 °C**.
**Mechanism:** scale MH and shivering heat by 7c's delivered fraction `o2.vo2 / o2.demand` (1 without 7c).
**Measured by the writer (first pass) and confirmed by the reviewer (with FU-9 A2's line simulated):** the pre-arrest
course identical (EtCO₂ ×2 at 860 s, +0.174 °C/min, K⁺ 5.75, pH 6.98, VF at 2680 s), tcMax **47.77 → 42.34 °C**
(MANUAL 42.17), dantrolene rows unchanged; without FU-9 A2: 0.057 °C/min, no arrest, 40.0 °C. These were measured
before FU-6 merged; re-measure on the merged tree (FU-6's patient-triggered ventilation changes the "fixed MV" rigs —
see Task A1's rig note).
**Acceptance:** the untreated instructor MH arrests at 40–50 min and the core peaks < 43.5 °C within 5 min of the
arrest; a treated arm's first 15 min within 0.05 °C of the pre-B2 tree.

- [ ] **Step — the edits and the new files** (each find matches exactly once in application order):

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core```

Replace with:

```ts
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core
  /** FU-10 E2: the fraction of the O2 demand actually consumed (7c `o2.vo2 / o2.demand`), written by 7e every pass.
   * Aerobic muscle heat (MH, shivering) cannot exceed the oxygen it burns, so the core stops rising when flow stops. */
  o2F: number;```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
fluidWarmer: false, extraX: 1, dantE: 0, out: zeroOut(),```

Replace with:

```ts
fluidWarmer: false, extraX: 1, o2F: 1, dantE: 0, out: zeroOut(),```

In `packages/engine-core/src/l2/thermal/heat.ts`, find (chained on A2):

```ts
/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */```

Replace with:

```ts
/** FU-10 E2: the delivered fraction of the O2 demand (1 without 7c, clamped to [0, 1]). */
const o2Frac = (st: ThermalState): number => Math.min(1, Math.max(0, st.o2F ?? 1));

/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */```

In `packages/engine-core/src/l2/thermal/heat.ts`, find (chained on ?):

```ts
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)), // FU-10 E3: no shivering below a block
    mhW: st.m0 * MH_HEAT_X * mhActivity(st.mh, t),```

Replace with:

```ts
    // FU-10 E2: both are AEROBIC muscle heat — limited by the oxygen the circulation delivers (`o2F`, 1 when 7c is absent)
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)) * o2Frac(st), // FU-10 E3: no shivering below a block
    mhW: st.m0 * MH_HEAT_X * mhActivity(st.mh, t) * o2Frac(st),```

In `packages/engine-core/src/l2/endo/adapters.ts`, find (chained on A7):

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number; endoKetoUtilPerMin?: number };```

Replace with:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; o2?: { vo2?: number; demand?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number; endoKetoUtilPerMin?: number };```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
export function readEndoInputs(ctx: EndoCtx, es: EndoState, t: number): EndoInputs {
  const th = ctx.resp.temp;```

Replace with:

```ts
/** FU-10 E2: 7c's delivered O2 fraction (`vo2 / demand`); 1 without 7c or at zero demand. */
export function o2Fraction(blood: BloodLike | undefined): number {
  const o = blood?.core?.o2;
  if (!o || !num(o.vo2) || !num(o.demand) || o.demand <= 0) return 1;
  return Math.min(1, Math.max(0, o.vo2 / o.demand));
}

export function readEndoInputs(ctx: EndoCtx, es: EndoState, t: number): EndoInputs {
  const th = ctx.resp.temp;```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
  th.depthIn = num(n?.thermoDepth) ? n.thermoDepth : null;```

Replace with:

```ts
  th.depthIn = num(n?.thermoDepth) ? n.thermoDepth : null;
  th.o2F = o2Fraction(bloodOf(ctx.ps)); // FU-10 E2: the aerobic-heat limit```

- [ ] **Step — run.** the new file, `test/engine/{endo-acceptance,circ-lowflow-arrest,clinical-suite}.test.ts`, `audit:physiology`.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): MH and shivering heat follow the oxygen delivered (FU-10 E2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task B3: E11(b, c) — septic shock makes lactate, and SIRS is vasoplegic (7e conditions; requires FU-9 A2; UNPROTOTYPED)

**Precondition:** FU-9 A2 (the extraction/VO₂ split in `l2/blood/oxygen.ts`). Without it the lactate term would be
double-counted against the regional deficit that A2 removes.

**Why (research/14 E11, ET-26a TW, ET-28 TW):** warm septic SHOCK runs at lactate **1.0** (Sepsis-3 requires > 2) and the
cold phase lowers CO only 5.1 → 4.3 L/min with SvO₂ 79 → 77 % and lactate +0.01; `sirs 1` leaves MAP **88.6** with
`vasoResp` 1, so vasopressin's catecholamine sparing cannot show (it keeps 0.77 of its effect against noradrenaline's
0.71 — a 0.06 difference).

**Mechanism (the report's E11(b, c)):** (a) a septic EXTRACTION deficit — the seam the rows already name in their comment
("erMax/shunt are not seams") becomes one: 7e's sepsis row publishes an extraction ceiling that 7c's oxygen block reads
(`blood.core.erMax`, a new seam beside `endoKShift`), so microcirculatory shunting makes an oxygen deficit, and 7c's own
`stepLactate` then makes the lactate — no lactate term in 7e; (b) the `sirs` row gains `vasoResp` < 1 and a lower `svrF`
(tables §5e's vasoplegia column), so SIRS is hypotensive and vasopressin's V1 arm (which `vasoResp` does not scale, FU-4
F2(a)) shows its sparing.

**R45 procedure:** write the tests with Sepsis-3's lactate > 2 and the tables' §5e cold-phase directions; size the
extraction ceiling to the report's cold-phase CO/SvO₂ numbers; if the ratio of kept effects (vasopressin vs
noradrenaline) does not reach the report's "beyond 0.1", keep it as `it.fails` with its number.
**Files:** `src/l2/endo/{conditions,core,adapters}.ts` and one statement each in `src/l2/blood/core.ts` and
`src/l2/blood/oxygen.ts` (**E-FU10-7**; FU-9 A2 owns those lines, hence the ordering).
**Tests (UNWRITTEN — the executor writes them from the bands above, with `it.fails` + numbers where unmet):**
`test/l2/endo/fu10-conditions.test.ts`, `test/engine/fu10-septic-lactate.test.ts` (the `fu10-*` slow glob).
**FU-4 check:** the septic rows feed FU-4's arrest and pressor tables — re-run `audit:physiology`, `clinical-suite` and
ET-26b/26c/12/13a.
**Commit:** `feat(7e,7c): septic shock impairs extraction and SIRS is vasoplegic (FU-10 E11b, E11c)`.

---

### Task B4: E7(d) — the glycosuric osmotic diuresis takes volume with it (7e → 7d/7c; requires FU-9 A1; UNPROTOTYPED)

**Precondition:** FU-9 A1 (the renal expansion factor in `l2/renal/model.ts`) — it rewrites the excretion path this task
extends, and RH's H1 (a healthy anaesthetised patient is oliguric) is being folded into the same fixer pass.

**Why (research/14 E7, ET-23d PL-for-the-wrong-reason):** the instructor's DKA has `bvRel` **1.00** — no volume deficit at
all; the extra induction fall (−4.7 %) comes from acidaemic contractility, not hypovolaemia. JBDS DKA 2023 puts the deficit
at ≈ 100 mL/kg.

**Mechanism:** glucose above the renal threshold (≈ 10 mmol/L / 180 mg/dL) is excreted, and each osmole takes water: 7e
publishes the filtered glucose load above the threshold and 7d's renal seam adds the osmotic urine to `uopAboveBasalMlH`
(with its sodium and potassium, which 7c then loses through the seam it already has). The instructor's `dka` condition
carries the same glucose, so both routes give the deficit.
**R45 procedure:** size the osmotic clearance to the guideline deficit over the hours a DKA presentation takes, and assert
the DIRECTION plus the induction response; if the full 100 mL/kg is not reached inside the cell's window, keep the number.
**Files:** `src/l2/endo/{core,adapters}.ts`, `src/l2/organs/pipeline.ts` (7d's seam; **E-FU10-8**).
**Tests (UNWRITTEN):** `test/l2/endo/fu10-osmotic.test.ts`, `test/engine/fu10-dka-volume.test.ts` (the `fu10-*` slow glob).
**FU-4 check:** ET-23d (the induction MAP fall), the FU-9 A1/A6 renal rows and `organs-renal.test.ts`.
**Commit:** `feat(7e,7d): the glycosuric osmotic diuresis makes the DKA volume deficit (FU-10 E7d)`.

---

### Task B5: E9 — atrial fibrillation below 32 °C and in thyroid storm (7a rhythm hazard; requires FU-7 Task 12; UNPROTOTYPED)

**Precondition:** FU-7 Task 12 (the shock/conversion probabilities) edits the L3 outcome path and the arrest frame;
FU-8 Part A (A21's arrest state) is already merged (review F6). This task adds a hazard in the same seeded frame and
must not be written against a stale file.

**Why (research/14 E9, ET-09b MI, ET-13b MI):** `arrest.ts` carries only the VF hazard below 28 °C, so the core at 28 °C
stays sinus (ERC 2021 / Danzl & Pozos, NEJM 1994;331:1756: AF is common below 32 °C and reverts on rewarming), and thyroid
storm scales the sinus rate (`thyroid.ts` `hrF` 1.8) with no AF path (Klein I, Ojamaa K, NEJM 2001;344:501: AF in
10–25 % of thyrotoxicosis [VERIFY the percentage]).

**Mechanism:** one AF ONSET hazard in the same seeded frame as the VF hazard — rate rising below 32 °C and with the storm
severity — and reversion when the cause is corrected (rewarming above ≈ 33 °C, the storm treated). 7e publishes the
storm severity it already has; the hazard itself lives with the other rhythm hazards (**E-FU10-5**).
**R45 procedure:** assert over SEEDS (the FU-4 pattern: N of M seeds fibrillate within the window), never a single draw;
if the fraction is off, report it rather than moving the rate.
**Tests (UNWRITTEN):** `test/engine/fu10-af-hazard.test.ts` (the `fu10-*` slow glob; 20 seeds at 28 °C and 20 in storm,
plus a normothermic control that never fibrillates). **FU-4 check:** ET-09a/c (bradycardia, Osborn, spontaneous VF at 25 °C), `blood-k-rhythm`,
`circ-arrest`, `hr-af-numeric` and `af-rate-control` — an AF hazard that fires in the hypothermia rigs changes FU-4's VF
timing rows, which must be re-measured and reported.
**Commit:** `feat(7a,7e): atrial fibrillation in hypothermia and thyroid storm (FU-10 E9, E-FU10-5)`.

---

### Task B6: E13(b) — the hypothyroid patient's drug handling and MAC (7g clearance + 7e; requires FU-7; UNPROTOTYPED)

**Precondition:** FU-7 (it owns `l2/pk/**`, including `clFactor`).

**Why (research/14 E13, ET-14 WR):** hypothyroidism gives bradycardia (HR −18) and a colder core (−0.31 °C at 1 h) but
propofol's induction MAP fall is not exaggerated (−22 vs −23 %) and emergence is 0.7 min later only: the thyroid row
scales HR/Ees/SVR/VO₂ (`thyroid.ts:19`) and reaches neither the drug disposition nor the baroreflex.

**Mechanism (the report's E13):** the thyroid state publishes a metabolic-clearance factor (hypothyroid < 1, hyperthyroid
> 1) that 7g's `clFactor` reads beside its temperature and hepatic terms (**E-FU10-6**), and 7e keeps its existing
`cascade.macF` path for the anaesthetic requirement. The baroreflex-gain half is NOT taken here: FU-8 Part B owns the
resting sympathetic tone (C1) and Ali reviews it first — recorded as a Request.
**R45 procedure:** the delayed emergence and the exaggerated induction fall are the acceptance directions; measure both
and keep what the mechanism cannot reach as `it.fails` with its number.
**Tests (UNWRITTEN):** `test/l2/pk/fu10-thyroid-clearance.test.ts`, `test/engine/fu10-hypothyroid.test.ts` (the `fu10-*` slow glob).
**FU-4 check:** the four-patient propofol table in `audit:physiology`, ET-08b/08c and ET-13a.
**Commit:** `feat(7g,7e): thyroid state changes drug clearance (FU-10 E13b, E-FU10-6)`.

---

---

### Task B7: E13a/ET-15b — the exogenous glucocorticoid joins the permissive term; the hydrocortisone row (7e + 7g; requires FU-7 Task 18; UNPROTOTYPED)

**Precondition:** FU-7 merged with Task 18 (`bus.metabolic.glucocorticoidNmolL`, `EndoInputs.cortExoNmolL`, the
`glucocorticoid` PD target): `git grep -n "cortExoNmolL" -- packages/engine-core/src/l2/endo`.
**Why:** FU-7's plan (Requests → FU-10, item 1) hands the hydrocortisone row to FU-10 once the adrenal profile has a
basal deficit (Task A6 gives it: resting/post-induction MAP 70.02 vs 73.51 mmHg), and leaves to FU-10 whether the exogenous
glucocorticoid joins the permissive vascular share. Ruling R-9: it JOINS (review F16).
**Mechanism:** (1) `effects.ts`'s permissive term reads `h.cort + cortExo` (FU-7's argument) in place of `h.cort`, and
`vasoResp` likewise; (2) a `hydrocortisone` row (7g, **E-FU10-11**): the `glucocorticoid` target at potency 1 (FU-7's
dexamethasone is 25), its PK from the label (100 mg IV; onset within an hour). **Acceptance (research/14 ET-15b):**
the adrenal-insufficient patient's refractory hypotension reverses within 30–60 min of 100 mg IV (Annane 2017);
`it.fails` with the number if unmet.
**Tests (UNWRITTEN):** `test/engine/fu10-hydrocortisone.test.ts` (the `fu10-*` slow glob).
**Commit:** `feat(7e,7g): hydrocortisone reverses adrenal insufficiency; the exogenous glucocorticoid is permissive too (FU-10 E13, ET-15b, E-FU10-11)`.

---

## Task G: Gate — merge main, full verification, the ET matrix before → after, the gate note, the pull request

- [ ] **Step 1 — merge and re-verify.** `git fetch origin && git merge origin/main`; typecheck (whole repo); the fast set;
  the slow groups as CI runs them (`slow-a`, `slow-b`, and `slow-c` if it exists), recording each wall time and
  STOPPING if slow-a would pass ≈ 35 min (ruling R-12; the FU-10 files measured ≈ 1,110 s of test time for the six `fu10-*` engine files before memoising the shared arms (thresholds 418 s, insulin-omission 264 s, adrenal 179 s, insulin-dextrose 139 s, mh-trigger 66 s, fever 44 s); memoised: the thresholds file now runs 3 seven-hour arms instead of 5 and the adrenal file 2 adrenal arms instead of 4; under a parallel `audit:physiology` load the six files took 2,014 s of test time, so the unloaded sequential cost is ≈ 15–18 min — the Gate measures it after on this machine);
  `audit:physiology` and `audit:monitor`; the e2e suite (Chromium + WebKit).
- [ ] **Step 2 — the ET matrix, all 72 cells**, before → after, pasted beside `research/14`'s column into
  `docs/gates/fu-10.md`. Expected for Part A (the fixer's run): automatic verdicts main PL 35, WR 13, TW 10, TS 4, MI 2, NE 8 → Part A PL 38, WR 9, TW 10, TS 5, MI 2, NE 8; six cells change verdict: ET-10a, ET-31, ET-34 → PL; ET-23c WR → TW; ET-04 WR → TS (the ratio, accepted by R-7); **ET-07 TW → TS (−1.02 °C vs −1.0: the consequence of R-4, reported)**. Every cell not targeted keeps its verdict;
  list every moved number (review F11) as the Prototype results do.
- [ ] **Step 3 — the FU-4 and hypothermia/MH check (explicit).** Quote ET-08a–d, ET-09a–c, ET-10b–e/g, ET-11a–c,
  ET-M1–M3, the FU-4 engine files and `audit:physiology`'s arrest table and its propofol state-dependence table. The
  fixer's Part A moved: the arrest table is identical in every arrest time (the A-, L-, K- and X-rows: tamponade, exsanguination, tension PTX, hyperkalaemia, VF/CPR); the propofol state-dependence table moves in ONE row — warm septic shock ΔMAP nadir −28.6 → −28.7 mmHg, ΔCO −0.46 → −0.51 L/min (the septic GA-flag rig runs cooler after A3); the 80 y hypertensive and AS + CAD rows are unchanged (the review's elderly moves are gone with the depth-weighted age term). Timeline rows elsewhere differ only in the second decimal (temperature-dependent outputs).
- [ ] **Step 4 — the `it.fails` ledger** (`docs/gates/fu-10/it-fails.md`), each with its file and number: `temp.test.ts` GA plateau ≥ 34.5 °C — 34.37; `fu10-thresholds` surgical onset 3–4 h — 2.27 h; `fu10-insulin-dextrose` nadir 20–30 min — 13.3 min; `fu10-adrenal` surgical MAP ≥ 5 mmHg below normal — −4.2; `fu10-fever` sepsis core ≥ 38.5 °C — 36.86 on main / 36.60 with Part A, storm — 36.58 / 36.34
  plus anything Part B adds.
- [ ] **Step 5 — the gate note `docs/gates/fu-10.md`**: the task-by-task table, the matrix, the ledger, the calibration
  rows for Ali's R44 pass (`NEURAXIAL_BLOCK_FRAC`/`NEURAXIAL_H`; `PREP_EVAP_W_70` as the onset-time knob; the GA plateau
  at 34.37 °C after R-4; the ketone production/utilisation sizes; `KETO_K_EFFLUX`; `CORT_SVR_PERMISSIVE`; the etomidate
  t½ against Absalom; the MH volatile medians), the open questions, the skipped Part B tasks, and the exceptions
  E-FU10-1 … 11 for approval.
- [ ] **Step 6 — the pull request.** Title **"FU-10: endocrine and thermal integration"** (suffix "(Part A)" if Part B
  waits); body = goal, tasks with measured rows, exceptions, the ledger, the questions; it ends with
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Never self-merged.**

---
## Open questions for Ali (the ET report's §8 and the fixer rulings, with the model's numbers and this plan's recommendation)

1. **Shivering VO₂ (§8.1).** A 34.5 °C emergence raises VO₂ **+59 %**; research/12 and Miller quote +200–400 %, measured
   postoperative shivering is +40–100 % (Ciofolo 1989; Frank 1995). **Recommendation:** teach +40–100 %; no change here.
2. **MH from its triggers (§8.2, ruling R-8: kept open).** Deterministic agent medians now (suxamethonium 0; sevoflurane
   45 min; desflurane and isoflurane 114 min [VERIFY]). Measured: suxamethonium + sevoflurane, ventilation held fixed,
   EtCO₂ doubles at **+18.2 min**; sevoflurane alone, MH activity from **+48.5 min**. Draw or fixed?
   Fulminant (severity 1) or an abortive case too?
3. **Neuraxial (§8.3; ruling R-7 accepted the ratio).** Both cold-defence thresholds 0.5 °C lower: hour 1
   **−0.84 °C** (ratio to GA **0.71**), shivering from **35.48 °C**. For information: the block
   fraction (0.5) and `NEURAXIAL_H` are the calibration knobs.
4. **The insulin–dextrose row's potassium.** The combined row: K⁺ **−0.96 mmol/L** at 60 min (band −1.0 to −0.6); the
   two separate rows: **−0.68** — two pre-existing K⁺ sources (7c's treatment curve vs 7g's insulin `kShift`). Should
   they agree? **Recommendation:** yes, in the calibration pass, by 7c/7g's owners.
5. **Insulin nadir (§8.5; ruling R-1).** Unchanged at **13.3 min / 2.92 mmol/L** (ITT 20–30 min; research/12 40–60); held
   as `it.fails`. Slowing the minimal model's remote compartment breaks the 75 g OGTT band (p2 ≤ 0.018). The fix is the
   insulin's own disposition (FU-8 Part B). **Recommendation:** band 20–30 min.
6. **D50 (§8.6).** +10.2 mmol/L at 5 min (research/12 +3–5; Balentine 1998 +9.2). **Recommendation:** the primary paper.
7. **Fever under anaesthesia (§8.7; ruling R-3 — DECISION NEEDED).** Under GA at 21 °C the septic patient sits at
   **36.86 °C** and the thyroid storm at **36.58 °C** (tables 38.5–41 °C); both `it.fails`. Is a febrile anaesthetised
   patient (a) one who ARRIVES febrile (the condition's onset moves the core to its raised set point while the awake
   defences act; GA then acts on a febrile patient), or (b) one whose fever is an ONGOING heat source GA does not
   suppress — which must then carry its VO₂/VCO₂ cost (10–13 %/°C)? The withdrawn first draft (a 120 W source with no O₂
   cost) gave 38.50 °C / 37.61 °C at 1 h and moved the warm-septic propofol row of `audit:physiology` (MAP 85 → 82).
   **Recommendation:** (a) — anaesthesia attenuates the febrile response, so fever under GA is mostly a presentation
   state; (b) only for the hypermetabolic storm.
8. **Septic lactate and SIRS (§8.8).** Warm septic shock lactate 1.0, `sirs 1` MAP 88.6. **Recommendation:** yes to both
   (Task B3, after FU-9 A2).
9. **Direction-only cells (§8.9).** Leave them direction-only for v1.0.
10. **[VERIFY] figures (corrected per review F9):** Kurz, Sessler, Schroeder, Kurz, Anesth Analg 1993;77:721 (neuraxial:
    both thresholds −0.5 °C); Kurz, Plattner, Sessler et al., Anesthesiology 1993;79:465 (elderly vasoconstriction −1 °C);
    Vassilieff, Rosencher, Sessler, Conseiller, Anesthesiology 1995;83:1162 (elderly shivering, spinal); Matsukawa 1995
    (epidural −0.8 °C); Visoiu 2014's per-agent medians (secondary sources); Bergman 1981 (p2); Absalom 1999 (≥ 24 h in the
    critically ill); Kitabchi 2009; Klein & Ojamaa 2001 (AF %); Frank 1995 (noradrenaline ×4); Sessler's forced-air
    review is Anesthesiology 2008;109:318 (not "Lancet 2008;371:1791").
11. **The type 1 omission (ruling R-10: the schema option is FU-10's).** Omitted for 6 h: glucose **35.5 mmol/L**, ketones
    **11.5 mmol/L**, K⁺ **6.05**; on the infusion the ketones fall **0.88 mmol/L/h** (JBDS ≥ 0.5), glucose
    reaches 5.1 mmol/L and K⁺ 3.25 in 3 h (the expected fall that needs replacement). **Recommendation:** accept; the
    ketone sizes are calibration rows.
12. **New — the GA plateau after ruling R-4.** With the tables' 34.5 °C the Stage 3 GA heat model plateaus at **34.37 °C**
    in hour 8 (Stage 3 band 34.5–35.5: `it.fails`), and the surgical arm vasoconstricts at **2.27 h** (Sessler
    3–4 h: `it.fails`). **Recommendation:** keep 34.5 and tune the onset time with `PREP_EVAP_W_70` in the R44 pass.
13. **New — etomidate in the critically ill (ruling R-9).** t½ 8 h fits a single elective induction; Absalom 1999 found
    ≥ 24 h in the critically ill. **Recommendation:** a per-patient t½ (critical illness) is a calibration row, not v1.0.

---
## Self-review (fixer, 2026-10-04)

**Mechanical block check** (`scratch/plans-backup/fu-10-plan-tools/check_plan.py` parses THIS document's
find/replace and Create blocks and applies them in document order to the current `origin/main`): **Part A: 71 find/replace blocks + 14 creates, 0 problems, 6 chained blocks (all marked "(chained on …)"); the whole document incl. B2: 78 blocks + 14 creates, 0 problems, 9 chained (all marked)**, on `origin/main` `1b8bdd3` (Stage 7k merged; its one `vite.config.ts` line sits beside FU-10's anchor and does not disturb it). Part A applied there is **byte-identical** to the prototype tree, whose diff is `scratch/plans-backup/fu-10-prototype.patch` (Part A only, 33 files).

**The review's findings, one by one.** F1 → A5 dropped (R-1), OGTT green. F2 → A8 withdrawn (R-3), its design a proposal
carrying VO₂/VCO₂, ET-12/13a `it.fails`, Ali Q7. F3 → net ketone rate (R-2) with the JBDS fall test (0.88 mmol/L/h).
F4 → `mhOwner` consumes the exposure; the instructor-cleared case is a unit test. F5 → the patch is Part A only; B2
re-anchored without A8 and gated. F6 → the schema option is FU-10's (E-FU10-9, R-10); A0/B5 preconditions updated.
F7 → B1 states FU-7's four rules, names `antinoc`, guards the adrenal counter-regulation and arm (f). F8 → 34.5 °C (R-4),
surgical arm (R-5), depth-weighted age (R-6): the elderly hour-1 fall is back to main's. F9 → references corrected
(Kurz Anesth Analg 1993;77:721; Vassilieff 1995; Visoiu per-agent medians; Absalom caveat; Sessler 2008;109:318); the
research/14 runner's wrong Kurz string is a Request. F10/R-11 → exceptions E-FU10-1…11 complete, incl. the 7f test edit
and the removed hour-8 assertions. F11 → every moved row is in the Prototype results, incl. ET-07's TW → TS. F12 → every
`it.fails` is in a written test (5 files) and every new test file (14) is in the plan. F13/R-12 → one `vite.config.ts`
glob block, the slow-c check, the measured wall time. F14 → FU-9 A4's merged `BloodLike` line in A7. F15 → task ids
consistent; chained blocks marked; sweating NOT MODELLED. F16 → B7 (`cortExo` in the permissive term; hydrocortisone
row). F17 → the hyperosmolar efflux needs insulin deficiency; Q4 carries the two K⁺ sources.

**Weaknesses for the next reviewer.** (1) R-4 moves ET-07 to TS by 0.02 °C and the Stage 3 GA plateau to 34.37 °C —
both reported, not tuned. (2) The surgical onset (2.27 h) depends on `PREP_EVAP_W_70`. (3) The FU-10 slow files cost
≈ 15–18 min of slow-a; without `slow-c` the Gate's stop rule will probably trigger. (4) B1, B3–B7 are unprototyped
because their predecessors own the files. (5) The ET runner's instructor-MH rigs are no longer "fixed MV" after FU-6
(a Request to the auditor); A1's test pins the MV with rocuronium.
