# FU-10: Endocrine and thermal integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-30, plan writer): **WRITTEN, NOT YET REVIEWED** (R50 review pending). 14 tasks (Part A A0–A8, Part B
> B0–B6, Gate); **76 find/replace blocks + 6 creates, 0 problems, 9 declared chained blocks**, applied in document order
> to the base and reproducing the prototype tree byte for byte (Self-review). Base: `origin/main` `7954933` (engine code = `ed530d5`: FU-3, FU-4, FU-5 and V.1 merged; FU-6, FU-7,
> FU-8 and FU-9 not). Prototype: a detached scratch worktree `<scratchpad>/fu-10/wt` (never pushed; patch kept at
> `scratch/plans-backup/fu-10-prototype.patch`). Measurement: the coverage-run-ET runner
> (`research/14-coverage-et-scripts/`, copied to scratch, `PME_ENGINE` pointed at the worktree).

**Goal:** make the endocrine and thermoregulatory layer (Stage 7e) behave as the textbooks say in the states the
coverage run ET (`research/14-coverage-endocrine-thermal.md`, 72 cells on main `7c60b2b`) found wrong, each by the
smallest MECHANISM the report proposes, in the layer that owns it (R51 chain order and canonical names), with every
named cell measured on the ET runner before the change and after it:

- **E1** an MH-susceptible patient given a volatile and/or suxamethonium develops MH by itself, on the published onset
  course (7f publishes WHEN each trigger was given; 7e turns it into the Stage 3 MH state);
- **E2** MH (and shivering) heat is limited by the oxygen actually consumed: the core stops rising once the circulation
  stops (no 47.8 °C in asystole);
- **E3** a neuraxial block has its own thermoregulation: the redistribution is about half of general anaesthesia's
  and the shivering threshold is lowered ≈ 0.5 °C but preserved (Sessler);
- **E4** cold drives the sympathetic system (noradrenaline, HR, MAP) and the extra metabolism of shivering is met by
  a higher cardiac output, not only by extraction;
- **E5** the linear heat-loss phase and the vasoconstriction plateau at 3–4 h under GA (Sessler), and **E6** the
  elderly patient's lower thresholds (Kurz 1993);
- **E7** insulin deficiency in type 1 diabetes (the basal insulin can be omitted; ketogenesis from the insulin
  deficit; insulinopenic and hyperosmolar K⁺ shift; the osmotic volume deficit), and the `dka` condition's K⁺ and volume;
- **E8** the insulin–dextrose row moves glucose as the two separate rows do;
- **E9** atrial fibrillation below 32 °C and in thyroid storm (the rhythm hazard);
- **E10/E13** adrenal insufficiency and hypothyroidism with measurable effects, etomidate suppressing cortisol
  synthesis (and the basal adrenal deficit FU-7's hydrocortisone will reverse);
- **E11** fever under GA in sepsis and thyroid storm, septic lactate, a vasoplegic SIRS;
- **E12** hypoglycaemia: the insulin nadir at its published time, GA masking the sympathetic signs, hypoglycaemic
  sweating.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **R44** (Ali's calibration pass is
non-blocking; executors do not tune), **R45** (mechanisms, never band changes; unreachable targets `it.fails` with
numbers), **R51** + addenda 12, 14, 16, 18, 25 (7e owns MH, the thermal model and the endocrine seams; 7f publishes
`thermoDepth`/`antinoc`/`nmb`; 7c owns the ketoacid pool and K⁺; the engine chain order), **R53/R54** (linked
physiology; the coverage matrix is the standing definition), **G-FU4** (FU-4 built the hypothermia/shivering cut-off
`SHIVER_STOP_C`, the MH hyperthermic-arrest hazard `T_HOT` and forced-air warming — must not move except as named),
**"ET endocrine/thermal coverage run DELIVERED"** (the routing: FU-7 third amendment ← dexamethasone, the incision
pressor, hydrocortisone after a basal adrenal deficit exists, Task 9's shared sympathetic seam; FU-8 A16 ← the insulin
omission option; FU-6 ← ET-35; FU-10 ← E1–E13; "land E2 after FU-9 A2"), **"FU-9 plan WRITTEN"**, **"FU-8 plan
FIXED"**, **"FU-7 DV amendment"**. Evidence: `research/14-coverage-endocrine-thermal.md` (§2 cells, §3 E1–E14, §4–§5
findings for the other plans, §7 the owners' acceptance cells, §8 Ali's questions), `research/12-coverage-matrix.md`
§5.2 and §4.8. Plans read for scope (untracked, `docs/plans/`), so nothing here duplicates them: **FU-6** (Task 7 = R4:
drug-GA VO2 — ET-35 is FU-6's; Task 14 = R11: anaemia → CO through viscosity — no metabolic-demand term), **FU-7**
(Task 9: 7g's indirect sympathomimetic drive into 7e's `extraSymp`, the catecholamine reserve; Task 10: the
laryngoscopy/surgical surge; Task 18: dexamethasone into 7e's cortisol METABOLIC term; D13: hydrocortisone, being
amended in now), **FU-8** (A16: the `endo` block in `pme-scenario/1`; A13: the ONE body-size rule; B1: the insulin
infusion reference per kg), **FU-9** (A2: VO₂ is supply-dependent only below DO₂crit; A4: septic σ in `writeBlood`;
A6: renal K⁺; A8: plasma osmolality → brain).

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
- **Base and branch:** branch `fu-10-endocrine-thermal` from `origin/main` (at least `7954933`). Worktree
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
  Every edit is a find-and-replace anchored on quoted text that matches EXACTLY ONCE on `origin/main` `7954933`; if a
  block no longer matches byte for byte because another plan merged first, locate the same statement by its quoted
  comment and make the same change (the per-task "Overlap" line names what the other plan does to that file); never
  re-type a line you are not changing.
- **CI rules (CI amendments 1–4, restated so the executor needs no other document):**
  - `CI=1` for engine tests. Long-run horizons come from `test/helpers/longrun.ts` (never a hard-coded 24 h or 6 h).
  - Any test that can exceed ≈ 30 s wall (in practice every engine test running more than one sim-minute) yields once
    per SIM-MINUTE (`if (t % 60 === 0) await new Promise((r) => setImmediate(r))`).
  - Slow files go in the `SLOW` list of `packages/engine-core/vite.config.ts`. CI runs the slow set as two DISJOINT
    groups, `SLOW_A` and `SLOW_B` (= SLOW minus SLOW_A); slow-b ran 37.6 min against its 40 min limit at the FU-4 gate,
    so **every new slow file in this plan joins SLOW_A** (added to both `SLOW` and `SLOW_A`); the Gate records both
    groups' times.
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
  `docs/physiology/**` (the orchestrator's); `package.json`, `pnpm-lock.yaml`, `.github/**`. In `l2/endo/**` and
  `l2/neuro/**` only the lines a task quotes.
- **Body size:** no new size rule. Heat terms keep Stage 3's `effKg` (the metabolic rule); endocrine terms keep 7e's
  `weightKg`; concentrations 7c integrates use 7c's own ECF volume. FU-8 A13's ONE body-size rule is not redefined.

---
## Finding inventory (every ET gap, and what happens to it)

Decision codes: **task** (a task in this plan), **handed** (to a named plan or owner, reason given), **closed** (done on
main; the evidence named), **Ali** (his decision; the model's numbers given), **7i v1.1** (R58/R60), **recorded**.
"Main" numbers are the ET report's (main `7c60b2b`) re-measured by this writer on `7954933` (engine code identical;
seed 7) — see "Prototype results" for the before column.

| ID | Finding | Cells (verdict on main) | Measured on main | Decision |
|---|---|---|---|---|
| E1 | The MH triggers do nothing | ET-10a (WR) | MH-susceptible + sux 1.5 mg/kg + sevoflurane 2 %: `mhTrigger` mark at 300 s, MH activity 0, EtCO₂ 29–30 for 90 min | **task A1** (7f publishes the trigger times; 7e `endo/pipeline.ts` creates the MH state with the onset latency) |
| E2 | MH heat not limited by O₂: 47.8 °C after death | ET-10g, ET-M2 (PL on the arrest; the course after it is the defect), ET-10d | untreated instructor MH: VF +45 min at ≈ 42.5 °C, then 44.3 °C at 60 min, 47.8 °C at 90 min in VF/asystole | **task B2** (Part B, after FU-9 A2: 7e heat × 7c's delivered fraction `vo2/demand`) |
| E3 | Neuraxial = full GA thermoregulation | ET-04 (WR) | awake neuraxial: depth 1, hour-1 fall −1.07 °C (GA −1.19), 34.4 °C at 3 h, no shivering | **task A2** (7e thermal: a neuraxial thermoregulatory state of its own) |
| E4 | Cold drives nothing but shivering; CO does not follow VO₂ | ET-05a (TW), 05b (WR), 05c (TW) | emergence at 34.5 °C: VO₂ +59 %, noradrenaline 275 = 275, HR −2, MAP −0.5, CO 5.8 = 5.8 | **task B1** (Part B, after FU-7: the cold drive into the SHARED sympathetic seam FU-7 Task 9 edits; the metabolic vasodilation of the extra thermal VO₂) |
| E5 | Linear phase slow, plateau late | ET-01b (TW), ET-03a | −0.29 °C/h in hours 2–3; vasoconstriction at 6.2 h (34.55 °C) | **task A3** (7e `thermal/thresholds.ts`: the depth the thresholds read is capped at the GA row) |
| E6 | No age term in the thresholds | ET-03a (MI) | 80 y vs 40 y at 4 h: 34.73 vs 34.82 °C (MAC-age only) | **task A3** (same function, same file — one age term; Kurz 1993 [VERIFY]) |
| E7 | Type 1 never insulin-deficient; no ketones; DKA K⁺ and volume | ET-18a (NE), 18b (MI), 23c (WR), 23d (PL for the wrong reason) | type 1 4 h surgery: insulin 10 µU/mL, glucose 7.2 → 9.6, ketones 0; `dka 1`: K⁺ 3.70 (healthy 4.18), glucose 9.3, blood volume 1.00 | **task A5** (basal insulin omission, ketogenesis seam 7e → 7c, insulinopenic/hyperosmolar K⁺ shift) + **task B4** (Part B, after FU-9: the glycosuric osmotic volume loss through the renal seam) |
| E8 | Insulin–dextrose invisible to glucose | ET-31 (IN) | `insulinDextrose` 10 u: K⁺ −0.88, glucose 0.00 for 3 h; two rows: +6.9 then −2.4 | **task A4** (7e `observeDoses` expands the combined row) |
| E9 | No AF in hypothermia or storm | ET-09b (MI), ET-13b (MI) | sinus at 28 °C; sinus in storm | **task B5** (Part B, after FU-7/FU-8: `circ/arrest.ts`'s seeded hazard frame is their file) |
| E10 | Drugs do not reach the thermoregulatory or adrenal states | ET-33 (NE), ET-34 (MI) | etomidate 0.3 mg/kg: cortisol at 4 h 1582 vs 1575 | **task A6** (etomidate: 7e observes the dose, 11β-hydroxylase suppression 6–12 h); ET-33 **handed** (pethidine/clonidine are not library rows: FU-7 library) |
| E11 | Fever, storm and septic shock not states under GA | ET-12 (TW), 13a (TW), 26a (TW), 28 (TW) | sepsis/storm under GA: core 36.9 / 36.6 °C; warm septic shock lactate 1.0; cold phase CO 5.1 → 4.3, SvO₂ 79 → 77; `sirs 1` MAP 88.6 | **task A7** (pyrogenic heat source; SIRS vasoplegia row) + **task B3** (Part B, after FU-9 A2: the septic extraction deficit → lactate) |
| E12 | Hypoglycaemia too early, unmasked by GA, no sweating | ET-20a (TS), 21a (WR), 21b (MI) | 10 u IV: nadir 2.9 mmol/L at 13 min; HR +26 under GA vs +16 awake; no sweating | **task A8** (nadir timing + hypoglycaemic sweating) + **task B1** (the depth-blunted hypoglycaemic drive, in the shared seam) |
| E13 | Hypothyroid and adrenal-insufficiency profiles thin | ET-14 (WR), 15a (TW) | hypothyroid: induction MAP fall −22 vs −23 %, emergence +0.7 min; AI: MAP identical at rest and after induction, phenylephrine 0.79 | **task A6** (the basal adrenal deficit) + **task B6** (Part B, after FU-7: hypothyroid drug clearance in 7g's `clFactor`) |
| E14 | Hypothermia slows elimination only | ET-08c (TW) | propofol Cp +5 % at 34 °C (Leslie +28 %) | **handed: FU-7** (`l2/pk/pipeline.ts` `clFactor` is FU-7's file; not in the rulings' FU-10 routing E1–E13) |
| ET-35 | Drug GA vs the hidden GA flag (VO₂ −6.8 vs −20.8 %) | ET-35 (IN) | EtCO₂ 25.9 vs 22.2 | **handed: FU-6 Task 7 (R4)** — the Gate re-measures it |
| ET-16a | Incision pressor +7.7 mmHg (Shribman +20–30) | ET-16a (TW), ET-M3 | adrenaline ×2.6, NA ×1.8 right | **handed: FU-7 Task 10** |
| ET-19 | Dexamethasone inert | ET-19 (MI) | glucose Δ 0.00 in type 2 | **handed: FU-7 Task 18** (its diabetic arm) |
| ET-15b | Hydrocortisone not in the library | ET-15b (NE) | rejected "unknown drug" | **handed: FU-7 D13 amendment**; FU-10 Task A6 provides the basal deficit it reverses (Requests) |
| ET-10f | No rigidity (masseter spasm) | ET-10f (NE) | TOF/compliance unchanged in MH | **handed: FU-7** (research/12 §5.11 missing-mechanism list) |
| ET-24/25 | Phaeochromocytoma, carcinoid | (NE) | — | **handed: FU-7** (states, octreotide) |
| ET-32 | Neuraxial block of the stress response | (NE) | no neuraxial block exists beyond thermoregulation | **handed: FU-7+ (neuraxial block, research/12 I23)** — Task A2's neuraxial state is thermal only |
| ET-08d | Hypothermic coagulopathy (`coagF` unread) | (NE) | — | **7i v1.1** |
| ET-17 | Glucose at 2 h of surgery 6.85 (band 7–8) | ET-17 (TW) | 0.15 below the band | **recorded** (the stress glucose ET-16c is PL at +1.3; a calibration row, R44) |
| ET-23a | Kussmaul under-compensated by 3.9 mmHg | ET-23a (TW) | PaCO₂ 18.3 vs Winter 14.5 | **handed: FU-9 A7** (the same `spont.ts` set point) |

### Added by the SP coverage run (`research/21-coverage-stimuli-positioning.md` §5, routed to FU-10 while this plan was written)

| ID | Finding | Cells | Measured (SP run, main `7954933`) | Decision |
|---|---|---|---|---|
| SP-a | Do cortisol and glucose follow FU-7 Task 10's "the opioid share blunts the RELEASE" rule? | SP-03 (sternotomy under 1 MAC + fentanyl releases only +17 pg/mL noradrenaline) | the hormone drives read `noxious · (1 − antinoc)`, where `antinoc` carries the hypnotic share too | **Decision D10** (no task): the SYMPATHOADRENAL arm is FU-7 Task 10's (release, opioid share); the PITUITARY–ADRENAL arm (cortisol) and its glucose consequence keep the drive they have, and FU-10 adds no second blunting — Desborough 2000: hypnotics do not abolish the humoral arm and ordinary opioid doses do not suppress the cortisol response (ET-16b PL, `cortF5vsF0` −0.07). D10 states it so FU-7 and FU-10 cannot double-count. |
| SP-b | Tourniquet release cools the core 0.3–0.7 °C | SP-16d (NE) | no tourniquet state exists (SP-16a–d all NE) | **NOT MODELLED** (recorded): the cooling is a heat-redistribution term of a tourniquet state, and the state belongs to the surgical-events stage that SP's §6 lists (with the late hypertension, the EtCO₂/K⁺/lactate release transient). FU-10 adds no tourniquet; its heat model already redistributes heat between the compartments, so the term is one line in that stage. |
| SP-c | The extubation/emergence stress response | S1 | enters through the same `noxious` input | **Decision D11** (no task): the hormonal side already works through `stimulus` (ET-16a–c PL for the incision); FU-10 does not add an extubation event, and the HAEMODYNAMIC side is FU-7 Task 10's surge. FU-10's Task B1 makes the COLD side of emergence act, which is the part the ET run found missing (E4). |

---
## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — MH is 7e's; 7f only reports the exposure (R51 §6).** 7f publishes `ps.neuro.mhExposure = { sux?, volatile? }`
  (the first time each trigger reached an MH-susceptible patient) and keeps its `mhTrigger` mark; 7e's pipeline turns the
  exposure into the SAME Stage 3 MH state `rs.temp.mh = { severity, t0 }` the instructor's `condition mh` creates, with
  the trigger's latency. No second MH state, no MH code in 7f.
- **D2 — the onset is a latency, not a new ramp.** `t0` is (earliest trigger + its latency) and Stage 3's existing
  `MH_ONSET_S` ramp then runs unchanged, so every measured MH number (EtCO₂ doubling time, K⁺, pH, the FU-4 hyperthermic
  arrest) is the instructor case's. Latencies [ENG]: 0 for succinylcholine, 20 min for a volatile alone (the ET report's
  10–60 min; Visoiu 2014's direction). Profile severity 1 (the fulminant case) — Ali's Q2 may make it a seeded draw or a
  lower severity; the constant is one line.
- **D3 — the triggers never override the instructor.** A `condition mh` MH is kept as it is, and an MH the instructor
  CLEARED is not restarted (`mhAuto` in 7e's state records who made it); a later, faster trigger may bring an
  exposure-made onset forward while it is still latent.
- **D4 — a neuraxial block acts on its EFFECTORS, not on the central thresholds.** The block abolishes vasoconstriction
  and shivering in the blocked fraction of the body (`NEURAXIAL_BLOCK_FRAC` 0.5 for a T10 block [ENG]) and lowers the
  shivering threshold 0.5 °C (Kurz 1993); centrally the patient is awake (thermoregulatory depth 0). Sedation reaches the
  thresholds through 7f's `thermoDepth`, as it does for any patient. `NEURAXIAL_KCP` (the old "k_cp × 1.8" shortcut)
  becomes unread; `NEURAXIAL_H` (the extra skin loss below the block) stays — measured: without it the hour-1 fall is
  −0.53 °C and the patient never shivers, with it −0.78 °C and shivering starts at 35.5 °C.
- **D5 — the thresholds read at most the GA row (E5), and age lowers them (E6).** The awake → GA line is not
  extrapolated past depth 1: the tables' GA row IS the row for ordinary anaesthesia. The age term is applied to the
  vasoconstriction and shivering thresholds only (no sourced age term for sweating). The LINEAR PHASE rate is NOT
  touched: it is the calibrated insulation of a draped patient with no wound, and the plan's measurement shows a
  surgical rig (exposure + wet prep) reaching the plateau at 2.9 h and losing 0.37 °C/h — the band's own conditions.
  What stays out of band on the draped rig is reported as `it.fails` with its number (R45), not tuned.
- **D6 — the insulin–dextrose row is expanded for GLUCOSE only; K⁺ stays 7c's.** 7e's dose observer treats the combined
  row as its insulin plus 2.5 g of dextrose per unit (the row's own regimen), so the glucose fall, the rebound and the
  teaching point appear; 7c's `insulinDextrose` K⁺ curve is untouched, so the measured hyperkalaemia treatment keeps its
  sourced time course. The extra K⁺ fall that the dextrose's OWN insulin secretion adds through 7e (−1.18 vs −0.88 at
  60 min) is reported as an `it.fails` and Ali's question 4, not removed by a constant change.
- **D7 — insulin deficiency is one state with four consequences (E7).** 7e's glucose model already integrates the
  deficit (`egpDef`, τ 3 h). FU-10 (a) lets the type 1 profile omit its basal insulin (`endo.basalInsulin: false`);
  (b) drives ketogenesis from that deficit into 7c's ketoacid pool through ONE new seam
  (`blood.core.endoKetoMmolMin`), so the acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive all emerge
  from 7c's own chemistry; (c) shifts K⁺ out of the cells for the two DKA reasons (insulinopenia and hyperosmolar
  hyperglycaemia), the instructor's `dka` condition counting as insulinopenia; (d) the osmotic (glycosuric) volume
  deficit is Part B, because the urine is 7d's and FU-9 A1 rewrites exactly that excretion path.
- **D8 — etomidate suppresses the RESPONSE, not the resting level.** One dose sets a suppression state in 7e that
  recovers with t½ 8 h (inside the sources' 6–12 h) and multiplies `cortResponse`; the basal cortisol is untouched, so an
  etomidate induction shows a blunted surgical rise and nothing else. Adrenal insufficiency keeps its own ×0.5 on the
  response AND now carries a basal deficit (D9) — the two multiply.
- **D9 — adrenal insufficiency is a BASAL deficit with a permissive vascular effect.** The profile lowers the basal
  cortisol (×0.5) and cortisol below basal costs resting systemic resistance (`CORT_SVR_PERMISSIVE` 0.25 [ENG], below
  basal only, so no patient gains SVR from a high cortisol). That is the deficit FU-7's hydrocortisone (D13) will
  reverse; FU-10 adds no hydrocortisone.
- **D10 — the two arms of the stress response are blunted at different points (SP-a).** FU-7 Task 10 blunts the
  CATECHOLAMINE RELEASE by the opioid share (addendum 25); FU-10 leaves the cortisol drive (and the glucose that follows
  it) as it is, because ordinary opioid doses do not suppress the pituitary–adrenal arm (Desborough 2000; measured
  `cortF5vsF0` −0.07, ET-16b PL) and hypnotics do not abolish the humoral arm. Neither plan adds a second blunting term.
- **D11 — no new stimulus events.** Extubation and emergence stress (SP-c) use the existing `stimulus`; a tourniquet
  (SP-b) is NOT MODELLED here.
- **D12 — E2 lands after FU-9 A2, measured both ways.** Scaling the aerobic muscle heat by 7c's delivered fraction
  (`o2.vo2 / o2.demand`) on TODAY's main breaks the MH course, because on main `vo2` is already cut by the regional
  supply-dependence term that FU-9 A2 removes: measured on main, the core rise falls to 0.057 °C/min (band 0.067–0.2),
  the untreated MH patient NEVER arrests and peaks at 40.0 °C — i.e. FU-4's hyperthermic-arrest hazard is lost. With
  FU-9 A2's one line in place the same change is exactly right (below). This is why the orchestrator's routing says
  "land E2 after FU-9 A2", and Task B2 states both columns.

---
## Prototype results (ET runner, seed 7; before = `origin/main` `7954933`, all 72 cells — verdicts PL 36, TW 12, TS 1, WR 6, IN 2, MI 7, NE 8, reproducing `research/14-coverage-endocrine-thermal.md` cell for cell; after = the prototype in `<scratchpad>/fu-10/wt`, patch at `scratch/plans-backup/fu-10-prototype.patch`)

| Task (finding) | Item | Before | After | Band [source] |
|---|---|---|---|---|
| A1 (E1) | ET-10a `mhDevelops` (susceptible + suxamethonium + sevoflurane, no instructor action) | false; MH activity 0; EtCO₂ 29–30 for 90 min | **true**; EtCO₂ doubles at **+14.3 min**; activity 1 at +40 min; core 41.8 °C | EtCO₂ doubles in 10–30 min [research/14 §7; MHAUS; Larach 1994] |
| A1 (E1) | volatile alone (no suxamethonium) | no MH | MH activity > 0.05 at **+23.5 min** | later than with suxamethonium [Visoiu 2014] |
| A1 (E1) | a patient who is NOT susceptible, same triggers | no MH | **no MH** (max activity 0) | quiet |
| A2 (E3) | ET-04 `dT1hNeur` / `ratioNeurGa` | −1.07 / 0.90 | **−0.76 / 0.64** | −0.5 to −1.1 °C [Matsukawa 1995]; ratio 0.4–0.6 [research/12] → `it.fails` at 0.64 |
| A2 (E3) | ET-04 `shivers` / `shiverOnsetC` / `tc3hNeur` | false / — / 34.41 | **true / 35.48 °C / 35.31** | shivering at ≈ 35.5 °C [Kurz 1993] |
| A2 (E3) | ET-04 `depthNeur` | 1 (the GA thresholds) | **0** (awake thresholds, shivering −0.5 °C) | D4 |
| A3 (E5) | ET-01b `vasoOnsetH` / `vasoOnsetC` | 6.17 h / 34.55 °C | **4.93 h / 34.80 °C** | 3–4 h and 34.5 ± 0.2 °C [Sessler 2000; Kurz 1993] → both `it.fails` with their numbers |
| A3 (E5) | ET-01b `rateH4to5` (the plateau is flat) / `rateH2to3` | −0.153 / −0.291 | **−0.081** / −0.291 | plateau ±0.1 (now PL); linear phase −0.3 to −0.5 → `it.fails` (unchanged: D5) |
| A3 (E5) | the SAME rig with surgical exposure + wet prep (ET-29's conditions) | onset 3.62 h; hours 2–3 −0.17 °C/h | **2.85 h; −0.17** (open wound from +15 min: **1.87 h; −0.37**) | 3–4 h, 0.3–0.5 °C/h [Sessler] — the band's own conditions (D5) |
| A3 (E6) | ET-03a elderly−adult core at 4 h `d4h` | −0.09 | **−0.15** | sign −1 beyond 0.2 → `it.fails`; the threshold shift itself is a unit test (−1 °C at 80 y, Kurz 1993) |
| A3 (E6) | ET-03a `dVasoOnset` | null (no age term) | null (the elderly's lower threshold is not crossed inside the cell's 7 h) | MI kept, reason recorded |
| A4 (E8) | ET-31 `comboMax` / `comboMin` (the combined row) | 0.00 / 0.00 | **+6.93 / −2.42** (identical to the two-row arm) | glucose rises then rebounds [Balentine 1998; Apel 2014] |
| A4 (E8) | ET-31 `dKcombo60` | −0.88 | −1.18 (two-row arm −0.84) | −1.0 to −0.6 → `it.fails`; D6, Ali Q4 |
| A5 (E7) | type 1, basal insulin OMITTED, 6 h (new arm; engine API `endo.basalInsulin: false`) | not expressible | glucose **7.2 → 32.3 mmol/L**, insulin 0, ketoacids **99 mmol (≈ 5.8 mmol/L), `dkaSeverity` 0.28**, pH 7.41 → **7.34**, K⁺ **4.18 → 5.5** | ketosis within hours, hyperglycaemia, hyperkalaemia [JBDS-IP 2023; JBDS DKA 2023; Kitabchi 2009] |
| A5 (E7) | the same patient WITH its basal insulin (regression) | glucose 7.2, ketones 0 | **unchanged** (glucose 7.2, ketones 0, K⁺ 4.17) | quiet |
| A5 (E7) | ET-23c `kPre` (the instructor's `dka 1`) vs healthy | 3.70 vs 4.18 (`dKvsHealthy` −0.49) | **4.49 vs 4.18 (+0.30)**; `dK15` after intubation +0.04 → **+0.48** | K⁺ ≥ healthy at presentation [JBDS DKA 2023] (auto verdict WR → TW; the report's §7 item met) |
| A6 (E10) | ET-34 cortisol at 4 h, etomidate vs propofol | 1582 / 1575 = **1.005** | **1031 / 1575 = 0.655** | ≤ 0.8 [Wagner 1984; Absalom 1999] → the §7 acceptance item is met |
| A6 (E13) | ET-15a adrenal insufficiency: MAP after induction / surgical / phenylephrine ratio / cortisol | 73.73 = 73.73 / −0.8 / 0.79 / 466 | **70.19 vs 73.73 / −4.4 / 0.68 / 233** | refractory hypotension (beyond 5 mmHg) → `it.fails` at −4.4; pressor ratio ≤ 0.8 PL |
| A8 (E12) | ET-20a `tNadirMin` / `gluNadirMmol` | 13.3 min / 2.92 | **15.3 min / 3.13** | 20–30 min (ITT) / 40–60 (research/12) → `it.fails` with the number; Ali Q5 |
| A8 (E12) | ET-20c counter-regulation `epiPeakRatio` / `dHrPeak` (regression) | 16.4 / 18.4 | 11.4 / 13.4 | 10–20 [Cryer; Schwartz 1987] — stays PL |
| B2 (E2) | ET-10b–g, ET-M2 with FU-9 A2 in place: pre-arrest course | EtCO₂ ×2 at 860 s, rise 0.174 °C/min, K⁺ 5.75 at 20 min, pH 6.98 at 30 min, VF at +45 min (2680 s) | **identical** (860 s, 0.174, 5.75, 6.98, 2680 s) | the FU-4 rows must not move |
| B2 (E2) | ET-10b `tcMax` / ET-M2 `tcMax` (after the arrest) | **47.77 / 47.77 °C** | **42.34 / 42.17 °C** | no core rise once the circulation stops [research/14 §7] |
| B2 (E2) | the same change WITHOUT FU-9 A2 (why it is Part B) | — | rise **0.057 °C/min**, **no arrest**, peak 40.0 °C | D12: not acceptable — E2 waits for A2 |
| B2 (E2) | ET-11a–c dantrolene rows with FU-9 A2 + E2 | t½ 440 s, peak +14 min, temp falls | **unchanged** (440 s, 39.0 °C peak, falls) | quiet |
| B2 (E2) | ET-05a shivering VO₂ (`vo2Pct`) with FU-9 A2 + E2 | 58.97 % | 56.93 % | TW either way (Ali Q1) |

**Full ET matrix, Part A alone (A1–A8, B2 reverted), all 72 cells, AUTOMATIC verdicts** (the runner's `hand` notes are
the main-branch diagnoses, so before/after is compared on the automatic grade): before **PL 34, WR 14, TW 11, NE 8, TS 4,
MI 1** → after **PL 37, TW 12, WR 9, NE 8, TS 5, MI 1**. Six cells change verdict, all intended: ET-10a WR → **PL**,
ET-31 WR → **PL**, ET-34 TS → **PL**, ET-23c WR → TW, ET-04 WR → TS (the ratio only), ET-01b WR → TS (the onset
temperature only). **No cell regresses.** Numbers that move in cells FU-10 did not target (reported exactly):
- MH and dantrolene (ET-10b–g, ET-11a–c, ET-M2): tc60 44.29 → 44.28, tcMax 47.77 → 47.76 °C, the untreated arm's EtCO₂
  at 30 min 30.94 → 32.25 (ET-11's comparison arm), K⁺ 6.99 → 7.00; EtCO₂ doubling (860 s), HR +47, K⁺ at 20 min
  (5.75), pH (6.98), the arrest (+45 min) and every dantrolene item unchanged — the FU-4 hazard is untouched by Part A.
- Hypothermia: ET-08a/b and ET-09c unchanged; ET-09a (28 °C) MAP 57.35 → 56.17, CO 3.09 → 3.21 (HR 40 and Osborn
  unchanged; the depth cap changes the vasomotor tone at a pinned core).
- Warm septic shock (A8's fever): ET-26b baseline MAP 74.25 → 75.8, noradrenaline ratio 0.29 → 0.26 (PL, band ≤ 0.8);
  ET-26c dobutamine CO +0.40 → +0.86 (PL).
- Glucose (A5's slower insulin action): ET-16a–c glucose at 2 h 6.85 → 6.90 (ET-17 still TW, 0.10 below 7), ET-22 D50
  at 60 min −0.11 → +0.30, ET-18c −2.52 → −2.33 mmol/L/h (PL), ET-M3 +1.85 → +1.92.
- Cold emergence (ET-05a–d): VO₂ +58.97 → +56.93 %, shivering 66 → 64 W (A2/A3 thresholds; verdicts unchanged).
- Unchanged to the digit: ET-01a, ET-06, ET-07, ET-27a–c, ET-29, ET-30, ET-M1.

**Suites on the prototype tree:** typecheck clean; `test/l2/thermal`, `test/l2/temp`, `test/l2/endo`, `test/l2/neuro`,
`test/engine/thermal-warmer.test.ts` green (the one re-pinned Stage 3 neuraxial test is named in Task A2); new tests
`test/l2/thermal/{fu10-mh-exposure,fu10-neuraxial}.test.ts` and `test/engine/fu10-mh-trigger.test.ts` (27 s) pass.

---
## Exceptions (edits outside 7e's own partition; each needs the orchestrator's approval at review)

| id | Edit | Why it cannot live in 7e | Task |
|---|---|---|---|
| **E-FU10-1** | `l2/neuro/pipeline.ts`: `NeuroState.mhExposure` and the two trigger sites already writing the `mhTrigger` mark | only 7f sees the doses and the volatile MAC; R51 §6 keeps MH itself in 7e, so 7f publishes and nothing more | A1 |
| **E-FU10-2** | `l2/blood/core.ts`: ONE line adding 7e's `endoKetoMmolMin` to 7c's ketoacid pool | 7c owns the pool and everything that follows from it (pH, anion gap, `dkaSeverity`); the alternative was 7e mutating 7c's solutes | A5 |
| **E-FU10-3** | `test/l2/temp/temp.test.ts`: the Stage 3 neuraxial expectation re-pinned (its "no plateau" now comes from the blocked effectors, and the fall stops at the lowered shivering threshold) | the test pinned the defect | A2 |
| **E-FU10-4** | `test/l2/endo/core.test.ts`: the `T1` fixture gains `basalInsulin: true` | `EndoProfile` is exhaustive | A5 |
| **E-FU10-5** (Part B) | `l2/circ/arrest.ts` + its params: the AF onset hazard beside the VF hazard | the seeded hazard frame is 7a's, and FU-4 owns that file until it merges (it has) | B5 |
| **E-FU10-6** (Part B) | `l2/pk/pipeline.ts` `clFactor`: the hypothyroid clearance factor | 7g owns drug PK (R51 §1); FU-7 owns the file until it merges | B6 |

---
## Handed to other plans (nothing here is FU-10's to change)

- **FU-6 Task 7 (R4):** ET-35 (drug GA VO₂ −6.8 % vs the hidden flag's −20.8 %; EtCO₂ 25.9 vs 22.2). The Gate re-measures it.
- **FU-7 Task 10:** ET-16a/M3 (the incision pressor +7.7 mmHg vs Shribman's +20–30). **Task 18:** ET-19 (dexamethasone).
  **D13:** hydrocortisone — FU-10 Task A6 supplies the basal adrenal deficit it must reverse (measured: resting MAP
  −3.5 mmHg, phenylephrine 0.68 of normal, cortisol 233 vs 532 nmol/L). **Task 9:** the shared sympathetic seam — FU-10
  Task B1 adds its cold drive INSIDE that seam and adds no second one (see the task's "coordination" line).
  **Library:** pethidine/clonidine (ET-33), muscle rigidity (ET-10f), phaeochromocytoma/carcinoid (ET-24/25),
  the neuraxial block of the stress response (ET-32), and E14 (hypothermic intercompartmental clearance, ET-08c: FU-7
  owns `l2/pk/pipeline.ts`; the ET report's §3 E14 text is the mechanism).
- **FU-8 A16:** the scenario schema's `endo` block gains `basalInsulin` (FU-10 adds the ENGINE field and its behaviour;
  A16 adds the one schema property and its type). **B1:** the insulin reference per kg (ET-18c PL, K⁺ −1.11).
- **FU-9:** A2 is FU-10 B2's precondition (D12); A7 owns ET-23a's Kussmaul set point; A1's renal rewrite is B4's
  precondition; A6 (renal K⁺) is measured beside A5's new K⁺ terms in the Gate.
- **7i (v1.1):** ET-08d (hypothermic coagulopathy; `endo.cascade.coagF` is still unread).
- **The surgical-events stage:** the tourniquet (SP-16a–d), incl. its release cooling (SP-b, NOT MODELLED here).

---
## File map

| File | Tasks | Owner / exception | What changes |
|---|---|---|---|
| `src/l2/thermal/params.ts` | A1, A2, A3, A5, B2 | 7e | MH trigger latencies + profile severity; the neuraxial block fraction and shivering shift; `THR_DEPTH_MAX`, the age term; (B2 none) |
| `src/l2/thermal/mh.ts` | A1 | 7e | `MhExposure`, `mhOnsetT`, `mhFromExposure` |
| `src/l2/thermal/heat.ts` | A2, A3, B2 | 7e | the neuraxial effector fraction and shivering shift; `ageY` on the state and into `thresholds()`; `o2F` and the aerobic-heat limit |
| `src/l2/thermal/thresholds.ts` | A3 | 7e | the depth cap, `ageShiftC`, the `ageY` argument |
| `src/l2/endo/pipeline.ts` | A1, A3, A7 | 7e | the MH-from-exposure step and `mhAuto`; `ageY` written into the heat model; the pyrogenic heat source |
| `src/l2/endo/core.ts` | A5, A6, A7, A8 | 7e | `basalInsulin`; the ketogenesis output and the two K⁺ terms; `cortResponseOf`/`cortBasalF`/`etomSuppr`; the fever heat; the hypoglycaemic sweating flag |
| `src/l2/endo/params.ts` | A4, A5, A6, A7, A8 | 7e | the combined-row regimen; the ketogenesis and K⁺ sizes; the adrenal/etomidate constants; the pyrogen heat; `P2_PER_MIN` |
| `src/l2/endo/adapters.ts` | A4, A5, A6, B2 | 7e | the dose observer (combined row, etomidate); the ketone seam; `o2F` |
| `src/l2/endo/effects.ts` | A6 | 7e | cortisol's permissive vascular term |
| `src/l2/endo/hormones.ts` | A6 | 7e | the basal-cortisol factor |
| `src/l2/endo/conditions.ts`, `thyroid.ts` | A7, B3 | 7e | the pyrogen rows; the septic extraction deficit; the SIRS vasoplegia row |
| `src/l2/endo/glucose.ts` | A8 | 7e | (no change in Part A beyond `P2_PER_MIN`; B1 adds nothing here) |
| `src/types-endo.ts` | A5 | 7e | `EndoProfileInput.basalInsulin` |
| `src/l2/neuro/pipeline.ts` | A1 | **E-FU10-1** | `mhExposure` |
| `src/l2/blood/core.ts` | A5 | **E-FU10-2** | one line: the ketoacid inflow |
| `src/l2/circ/arrest.ts` (+ params) | B5 | **E-FU10-5** | the AF hazard |
| `src/l2/pk/pipeline.ts` | B6 | **E-FU10-6** | the hypothyroid clearance factor |
| `vite.config.ts` | A1, Gate | 7e | the new slow files join `SLOW` and `SLOW_A` |
| Tests (new) | A1–A8, B1–B6 | — | `test/helpers/fu10.ts`; `test/l2/thermal/{fu10-mh-exposure,fu10-neuraxial,fu10-thresholds}.test.ts`; `test/l2/endo/fu10-{insulin-deficit,adrenal,conditions,glucose}.test.ts`; `test/engine/fu10-{mh-trigger,neuraxial,insulin-omission,adrenal,fever,cold-sympathetic,mh-heat-limit,af-hazard}.test.ts` |
| Tests (re-pinned) | A2, A5 | **E-FU10-3/4** | `test/l2/temp/temp.test.ts`, `test/l2/endo/core.test.ts` |

---
## Part A — independent of FU-6/FU-7/FU-9 (executes now)

### Task A0: Base check — the branch, the worktree, the find blocks, the before-numbers (no code change)

- [ ] **Step 1 — the worktree and the branch.**
```
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin && git worktree add ../scratch/wt-fu-10 -b fu-10-endocrine-thermal origin/main
cd ../scratch/wt-fu-10 && npx -y pnpm@9.15.9 install --frozen-lockfile
```
- [ ] **Step 2 — the base.** `git log --oneline -1` (≥ `7954933`). Record which of FU-6, FU-7, FU-8 and FU-9 have merged
  (`git log --oneline origin/main | head -20`); each Part B task names the one it waits for.
- [ ] **Step 3 — every find block on this base.** Copy the plan's blocks into a checker (the writer's is in the patch at
  `scratch/plans-backup/fu-10-prototype.patch`; the FU-9 pattern is `<scratchpad>/fu-9/plan/check_plan.py`) and assert
  each find occurs exactly once in application order. The writer measured **76 blocks + 6 creates, 0 problems, 9 declared
  chained blocks** (a find introduced by an earlier task; they are marked in the tasks). If a block fails, re-anchor it on
  the merged statement by its quoted comment — never re-type a line you are not changing.
- [ ] **Step 4 — the ET runner and the before-numbers.**
```
cp -R ../research/14-coverage-et-scripts <scratchpad>/fu-10/et
cd <scratchpad>/fu-10/et
PME_ENGINE=<worktree>/packages/engine-core/src/index.ts ET_OUT=out/before.json ./run.sh cli.ts all   # ≈ 25 min
```
  Expected (the writer's run on `7954933`): **PL 36, TW 12, TS 1, WR 6, IN 2, MI 7, NE 8** — `research/14`'s table cell
  for cell. If a verdict differs, a stage merged in between: record which cells moved before changing anything.
- [ ] **Step 5 — the suites before.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2 test/engine`
  and `npx -y pnpm@9.15.9 run audit:physiology`; keep both logs (the Gate diffs against them).
- [ ] **Step 6 — no commit.** Task A0 changes nothing.

---
### Task A1: E1 — an MH-susceptible patient given its triggers develops MH (7f publishes the exposure, 7e owns the MH state; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/neuro/pipeline.ts` (**E-FU10-1**: `NeuroState.mhExposure`, the two trigger sites)
- Modify: `packages/engine-core/src/l2/thermal/{params,mh}.ts` (the latencies; `MhExposure`, `mhOnsetT`, `mhFromExposure`)
- Modify: `packages/engine-core/src/l2/endo/pipeline.ts` (`mhAuto`; the per-pass step)
- Modify: `packages/engine-core/test/l2/neuro/pipeline.test.ts` (the 7f mark test also asserts the exposure)
- Create: `packages/engine-core/test/helpers/fu10.ts`, `packages/engine-core/test/l2/thermal/fu10-mh-exposure.test.ts`,
  `packages/engine-core/test/engine/fu10-mh-trigger.test.ts` (SLOW → `SLOW` + `SLOW_A`)
- Modify: `packages/engine-core/vite.config.ts` (one `SLOW`/`SLOW_A` entry)
- **Overlap:** FU-6 Task 4/10 and FU-7 Tasks 5–7, 14 edit `l2/neuro/pipeline.ts` — their blocks are `IDLE_RESP`, the
  `neuroResp({…})` call, the `depth({…})` call, `NeuroEnv` and `ec50Multipliers`; this task touches `NeuroState`'s field
  list and the two `mhSusceptible` blocks, which no other plan quotes (checked in both plans).

**Why (research/14 E1, ET-10a WR):** 7f marks `mhTrigger` at the succinylcholine dose (`neuro/pipeline.ts:170–180`) and
at MAC > 0.1 (`:206–210`) and **nothing reads the mark**; Stage 3's `rs.temp.mh` is created only by the instructor's
`condition mh` (`resp/pipeline.ts:691–695`). Measured on main: the susceptible patient given suxamethonium 1.5 mg/kg and
sevoflurane 2 % keeps EtCO₂ 29–30 and MH activity 0 for 90 minutes — the whole "trigger-agent" teaching case cannot run.

**Mechanism (D1–D3):** 7f publishes WHEN each trigger first reached a susceptible patient
(`ps.neuro.mhExposure = { sux?, volatile? }`); 7e's per-pass step turns the earliest exposure plus its latency into the
same `rs.temp.mh = { severity, t0 }` the instructor creates, records that the triggers made it (`mhAuto`), and never
overrides or restarts an instructor's MH.

**Measured (prototype):** EtCO₂ doubles **+14.3 min** after the triggers (band 10–30 min), MH activity 1 at +40 min,
core 41.8 °C; a volatile alone starts at **+23.5 min**; a patient who is not susceptible stays at activity 0. Stage 3's
instructor MH, its dantrolene course and FU-4's hyperthermic arrest are untouched (they share the same state and ramp).
**FU-4 check:** ET-10b–g, ET-11a–c and ET-M2 bit-identical (the state is the same object; nothing in the ramp moved).

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/neuro/pipeline.ts`, find:

```ts
  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
```

Replace with:

```ts
  emgBase: number | null; // ECG EMG artefact before fasciculations (engine)
  /** FU-10 E1: when an MH-susceptible patient was first exposed to each trigger (s) — read by Stage 7e, which owns MH
   * (R51 §6) and turns the exposure into the MH state with the trigger's onset latency. Absent = never exposed. */
  mhExposure?: { sux?: number; volatile?: number };
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
    ns.mhExposure = { ...ns.mhExposure, volatile: t }; // FU-10 E1: 7e reads it
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
 * [ENG]: 0 s with succinylcholine; 20 min for a volatile alone (inside the ET report's 10–60 min). Severity 1 = the
 * fulminant course of the instructor's `condition mh 1` (Ali Q2: fixed vs a seeded draw; fulminant vs abortive).
 */
export const MH_SUX_LATENCY_S = 0;
export const MH_VOLATILE_LATENCY_S = 1200;
export const MH_PROFILE_SEVERITY = 1;
```

In `packages/engine-core/src/l2/thermal/mh.ts`, find:

```ts
import { DANT_GAIN, MH_ONSET_S, MH_RELAX_TAU_S } from './params.ts';
```

Replace with:

```ts
import { DANT_GAIN, MH_ONSET_S, MH_PROFILE_SEVERITY, MH_RELAX_TAU_S, MH_SUX_LATENCY_S, MH_VOLATILE_LATENCY_S } from './params.ts';
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
}

/** FU-10 E1: the MH onset time the exposure implies (the earliest trigger + its latency), or null (not exposed). */
export function mhOnsetT(x: MhExposure | undefined): number | null {
  const ts = [x?.sux !== undefined ? x.sux + MH_SUX_LATENCY_S : Infinity, x?.volatile !== undefined ? x.volatile + MH_VOLATILE_LATENCY_S : Infinity];
  const t0 = Math.min(...ts);
  return Number.isFinite(t0) ? t0 : null;
}

/**
 * FU-10 E1: start (or bring forward) the MH of a susceptible patient from its triggers. `owned` = the triggers already
 * started it (not the instructor's `condition mh`): until its onset a later, faster trigger may bring it forward; an
 * instructor's MH is never overridden, and an MH the instructor cleared (`condition mh 0`) is not restarted.
 */
export function mhFromExposure(mh: MhState | null, x: MhExposure | undefined, owned: boolean, t: number): { mh: MhState | null; owned: boolean } {
  const t0 = mhOnsetT(x);
  if (t0 === null) return { mh, owned };
  if (mh === null && !owned) return { mh: { severity: MH_PROFILE_SEVERITY, t0 }, owned: true };
  if (mh !== null && owned && t < mh.t0 && t0 < mh.t0) return { mh: { ...mh, t0 }, owned };
  return { mh, owned };
}

/** 1 Hz (or any dt ≤ 1 s) update```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
```

Replace with:

```ts
import { cascade, thermalMetabolic, type Cascade } from '../thermal/metabolic.ts';
import { mhFromExposure, type MhExposure } from '../thermal/mh.ts';
```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
```

Replace with:

```ts
  cascade: Cascade; // cascade(th) at the last 1 Hz step: 7f reads endo.cascade.macF (R-7f-8)
  mhAuto?: boolean; // FU-10 E1: the MH state was started by the patient's triggers (absent = not yet)
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
    const r = mhFromExposure(th.mh, mhx, es.mhAuto === true, tEnd);
    th.mh = r.mh;
    es.mhAuto = r.owned;
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

- [ ] **Step — the tests.** Create `packages/engine-core/test/helpers/fu10.ts` (the ET rigs through the real engine;
  MODELED, seed 7, yields once per sim-minute — the file is in the prototype patch, `scratch/plans-backup/fu-10-prototype.patch`),
  `test/l2/thermal/fu10-mh-exposure.test.ts` (`mhOnsetT` and `mhFromExposure`: the earliest trigger plus its latency; a
  later suxamethonium brings a pending volatile onset forward; an instructor MH is kept and a cleared one is not
  restarted) and `test/engine/fu10-mh-trigger.test.ts` (the two engine arms above, with the measured numbers in the
  titles). Add the engine file to `SLOW` and `SLOW_A` in `packages/engine-core/vite.config.ts`.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/neuro test/l2/endo test/engine/fu10-mh-trigger.test.ts`
  → green (prototype: 155 unit tests, the engine file 27 s).
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-10 ET-11 ET-M2` → ET-10a `mhDevelops` **true** (WR → PL), every other
  MH cell unchanged. Record the rows in `<scratchpad>/fu-10/et/out/`.
- [ ] **Commit and push.**

```
git add -A packages/engine-core && git commit -m "feat(7e,7f): an MH-susceptible patient develops MH from its triggers (FU-10 E1, E-FU10-1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push -u origin fu-10-endocrine-thermal
```

---

### Task A2: E3 — a neuraxial block has its own thermoregulation (7e thermal; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/thermal/{params,heat}.ts`
- Modify: `packages/engine-core/test/l2/temp/temp.test.ts` (**E-FU10-3**: the Stage 3 neuraxial expectation re-pinned)
- Create: `packages/engine-core/test/l2/thermal/fu10-neuraxial.test.ts`
- **Overlap:** no other in-flight plan edits `l2/thermal/**` (checked in FU-6, FU-7, FU-8, FU-9, 7k).

**Why (research/14 E3, ET-04 WR):** `heat.ts:161` gave any non-`none` anaesthesia thermoregulatory depth 1, so an awake
spinal patient got the GA thresholds (vasoconstriction 34.8, shivering 33.5 °C) plus the `NEURAXIAL_KCP` shortcut: hour-1
fall −1.07 °C (0.9 of GA, expected ≈ half), core 34.4 °C at 3 h and **no shivering at all**.

**Mechanism (D4):** the block acts on its EFFECTORS — the blocked fraction of the body (0.5 for a T10 block [ENG]) is
fully vasodilated and cannot shiver — and lowers the shivering threshold 0.5 °C (Kurz 1993); centrally the patient is
awake (depth 0), and sedation still arrives through 7f's `thermoDepth`. `NEURAXIAL_H` (the extra skin loss below the
block) stays: without it the hour-1 fall is only −0.53 °C and the patient never shivers.

**Measured (prototype):** hour 1 **−0.76 °C** (ET rig; heat model −0.78 vs GA −1.25), ratio **0.64**, core 35.31 °C at
3 h, shivering from **35.48 °C**, `depthNeur` **0**. The ratio band 0.4–0.6 is not reached → `it.fails` with 0.64 (Ali
Q3). **FU-4 check:** no GA, MH or hypothermia row moves (the neuraxial branch is the only path that changed);
`audit:physiology` unchanged.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

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
 * FU-10 E3 — neuraxial thermoregulation (Sessler DI, Anesthesiology 2000;92:578 and Lancet 2008;371:1791; Kurz A,
 * Sessler DI et al., Anesthesiology 1993;79:1193 [VERIFY]): the block abolishes vasoconstriction AND shivering below
 * its level only; centrally the patient keeps an unsedated patient's thresholds except that shivering starts ≈ 0.5 °C
 * lower (the warm, vasodilated legs are "felt" as warm). Redistribution is then ≈ half of general anaesthesia's
 * (Matsukawa T et al., Anesthesiology 1995;83:961: epidural −0.8 °C in hour 1 [VERIFY]). Sedation adds 7f's depth.
 * NEURAXIAL_BLOCK_FRAC: the fraction of the vasomotor/shivering effector mass below a T10 block [ENG: legs + lower trunk ≈ ½].
 */
export const NEURAXIAL_BLOCK_FRAC = 0.5;
export const NEURAXIAL_SHIVER_SHIFT_C = -0.5;
```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_H,
  NEURAXIAL_KCP, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
} from './params.ts';```

Replace with:

```ts
  AMBIENT_C, CORE_FRACTION, EMERGE_TAU_S, GA_KCP, GA_M, HEAT_CAP_J_KG_C, M_AWAKE_W_70, MH_HEAT_X, NEURAXIAL_BLOCK_FRAC, NEURAXIAL_H,
  NEURAXIAL_SHIVER_SHIFT_C, PERIPH_GRADIENT_C, T_NORMAL, VASOCONSTRICT_KCP,
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
/** Current thresholds (depth, set point; the shivering-only shifts applied: drugs, and a neuraxial block — FU-10 E3). */
export function currentThresholds(st: ThermalState): Thresholds {
  const thr = thresholds(st.depth, st.setShift + st.feverShift);
  return { ...thr, shiver: thr.shiver + st.shiverShift + (st.anaesthesia === 'neuraxial' ? NEURAXIAL_SHIVER_SHIFT_C : 0) };
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

- [ ] **Step — the tests.** Create `test/l2/thermal/fu10-neuraxial.test.ts`: (1) no central depth — the awake
  vasoconstriction threshold and the shivering threshold 0.5 °C lower; (2) hour-1 redistribution −0.5 to −1.1 °C
  (Matsukawa 1995) and less than GA's, shivering from ≈ 35.5 °C; (3) `it.fails` "redistribution about half of the GA
  fall: ratio 0.4–0.6 — measured 0.62" (the heat-model ratio; the ET rig reads 0.64).
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/temp test/engine/thermal-warmer.test.ts` → green (41 tests).
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-04 ET-01a ET-02 ET-29 ET-30` → ET-04 shivering true, ratio 0.64
  (WR → TS on the ratio alone, with its `it.fails`); ET-01a, ET-02, ET-29, ET-30 unchanged.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): a neuraxial block blocks its effectors and lowers the shivering threshold (FU-10 E3, E-FU10-3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A3: E5 + E6 — the thresholds read at most the GA row, and age lowers them (7e thermal; PROTOTYPED)

**Files:**
- Modify: `packages/engine-core/src/l2/thermal/{params,thresholds,heat}.ts`
- Modify: `packages/engine-core/src/l2/endo/pipeline.ts` (7e writes the patient's age into the heat model — Stage 3
  creates the state and `l2/resp/**` is not FU-10's to touch)
- Create: `packages/engine-core/test/l2/thermal/fu10-thresholds.test.ts`
- **Overlap:** none in `l2/thermal/**`; the `l2/endo/pipeline.ts` lines are FU-10's own (FU-7 does not edit that file).

**Why (research/14 E5/E6, ET-01b TW, ET-03a MI):** `thresholds()` extrapolated the awake → GA line to depth 1.5, so
2 % sevoflurane (thermoDepth 1.06) put the vasoconstriction threshold at 34.55 °C and the plateau at **6.2 h** (Sessler
3–4 h); and no threshold had an age term, so the 80-year-old differed from the 40-year-old only through MAC-age
(34.73 vs 34.82 °C at 4 h).

**Mechanism (D5):** cap the depth the thresholds read at the GA row (`THR_DEPTH_MAX`), and shift the two cold-defence
thresholds by −1 °C from 60 to 80 y (Kurz 1993 [VERIFY]). The linear-phase RATE is not touched.

**Measured (prototype):** vasoconstriction onset **4.93 h at 34.80 °C** (was 6.17 h at 34.55), the plateau flat
(hours 4–5 **−0.081** °C/h, was −0.153 — now inside the "quiet ±0.1" item), hours 2–3 unchanged at −0.291; elderly minus
adult at 4 h **−0.15 °C** (was −0.09). The same rig with the ET-29 surgical exposure (uncovered 30 min, wet prep 15 min)
plateaus at **2.85 h** and loses 0.37 °C/h with an open wound — the band's own conditions. `it.fails` kept with their
numbers: the draped rig's `vasoOnsetH` 4.93 h (band 3–4), `vasoOnsetC` 34.80 °C (band 34.3–34.7), `rateH2to3` −0.291
(band −0.3 to −0.5), ET-03a `d4h` −0.15 (band beyond 0.2). ET-03a's `dVasoOnset` stays MI: the elderly patient's lower
threshold is not crossed inside the cell's 7 h window (the shift itself is asserted in the unit test).
**FU-4 check:** ET-01a (hour 1 −1.18), ET-02 (warmed 36.18/34.55 at 3 h), ET-03b (child −1.54), ET-08a/b, ET-09a/c and
the shivering cut-off unchanged; `test/l2/thermal/shiver-cutoff.test.ts` green.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

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
 * FU-10 E6 — age lowers both thermoregulatory thresholds: ≈ 1 °C lower from 60 to 80 y under general anaesthesia
 * (Kurz A, Plattner O, Sessler DI et al., Anesthesiology 1993;79:465 [VERIFY]; Frank SM et al., Anesthesiology
 * 1992;77:252). Linear between THR_AGE_FROM_Y and THR_AGE_TO_Y, applied to the vasoconstriction and shivering
 * thresholds only (the sweating threshold has no sourced age term).
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
 * thresholds by the patient's age (FU-10 E6). The depth is capped at the GA row (FU-10 E5, THR_DEPTH_MAX).
 */
export function thresholds(depth: number, setShiftC: number, ageY = 40): Thresholds {
  const d = Math.min(THR_DEPTH_MAX, Math.max(0, depth));
  const age = ageShiftC(ageY);
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

- [ ] **Step — the test.** Create `test/l2/thermal/fu10-thresholds.test.ts`: (1) `thresholds(1.5, 0)` equals
  `thresholds(1, 0)` (the GA row is the floor) while depth 0.5 still interpolates; (2) `ageShiftC` 0 at 40 and 60 y,
  −0.5 at 70 y, −1 at 80 y and beyond; (3) the vasoconstriction and shivering thresholds carry the age shift and the
  sweating threshold does not; (4) an 80-year-old thermal state built through `createThermal(…, ageY)` reports the shifted
  thresholds, and a state restored from a pre-FU-10 snapshot (no `ageY`) behaves as a 40-year-old.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/temp test/l2/endo test/engine/endo-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-01a ET-01b ET-02 ET-03a ET-03b ET-08a ET-09a` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the thermoregulatory thresholds stop at the GA row and fall with age (FU-10 E5, E6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A4: E8 — the insulin–dextrose row moves glucose (7e adapters; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,adapters}.ts`; create
`packages/engine-core/test/l2/endo/fu10-insulin-dextrose.test.ts`.
**Overlap:** FU-7 Task 9/18 edit `adapters.ts`'s `readEndoInputs` (the `epiExoPgMl` line) and FU-9 A4 its `writeBlood`
and imports; this task edits `observeDoses` and the import line (FU-7 Task 18 also edits the import: whichever lands
second re-anchors on the merged line — the change is one added name).

**Why (research/14 E8, ET-31 IN):** the hyperkalaemia treatment row `insulinDextrose` moved K⁺ −0.88 and glucose
**0.00 for 3 h**, while the same doses given as the two separate rows gave +6.9 then −2.4 mmol/L — one treatment, two
answers. 7e observed only the `insulin` and `dextrose` agent ids (`adapters.ts:102–107`).

**Mechanism (D6):** `observeDoses` expands the combined row into its insulin and its dextrose for the GLUCOSE model
only (2.5 g per unit, the row's own regimen); 7c keeps its K⁺ curve, so the sourced hyperkalaemia time course is
untouched.

**Measured (prototype):** ET-31 `comboMax` **+6.93**, `comboMin` **−2.42** — identical to the two-row arm (IN → PL on
both graded items). `dKcombo60` −1.18 against the two-row arm's −0.84 (before: −0.88): the dextrose's own insulin
SECRETION now adds 7e's endogenous K⁺ shift on top of 7c's treatment curve. That row becomes an `it.fails` with its
number and Ali's question 4; no constant is changed (R45). **FU-4 check:** `test/engine/blood-hyperk.test.ts` and
`blood-ecg.test.ts` (the burns + suxamethonium hyperkalaemia rig, where insulin–dextrose must still lower K⁺ ≥ 1 in
30 min) green — measured 1.42.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

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

- [ ] **Step — the test.** Create `test/l2/endo/fu10-insulin-dextrose.test.ts`: through `observeDoses`, a
  `insulinDextrose` 10-unit dose raises glucose at once and then drives it below baseline, and the same doses as
  `insulin` + `dextrose` give the same course to within 0.1 mmol/L; a dose in another unit is ignored.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/blood test/engine/blood-hyperk.test.ts test/engine/blood-ecg.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-31 ET-20b ET-22` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the insulin-dextrose row reaches the glucose model (FU-10 E8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A5: E12(a) — the insulin nadir comes at its published time (7e glucose; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/params.ts`; create
`packages/engine-core/test/engine/fu10-insulin-nadir.test.ts` (SLOW → `SLOW` + `SLOW_A`) and modify `vite.config.ts`.
**Overlap:** none (FU-8 B1 changes the insulin ROW's infusion reference in `l2/pk`, not the minimal model).

**Why (research/14 E12, ET-20a TS):** 10 units IV reached its nadir at **13.3 min**; the insulin-tolerance-test
literature puts it at 20–30 min and research/12 at 40–60. The bolus enters the insulin space at once and the remote
compartment's p2 was 0.025/min, faster than Bergman's own estimates (0.01–0.02/min).

**Mechanism:** p2 at the sourced lower end (0.016/min [VERIFY]); the steady-state insulin action (`SI`) is unchanged, so
only the LAG moves.

**Measured (prototype):** nadir **15.3 min / 3.13 mmol/L** (was 13.3 / 2.92); the counter-regulation stays in band
(adrenaline ×11.4, HR +13.4 — ET-20c PL); the diabetic insulin infusion −2.2 mmol/L/h (ET-18c PL) and D50 (ET-22) hold.
The band is still not reached → `it.fails` "nadir 20–30 min (ITT) — measured 15.3 min", with Ali's question 5, and the
gate note records that closing the rest needs the insulin's own disposition (7g's row, FU-8 B1), not a smaller p2:
p2 0.013 reaches 16.7 min but takes the adrenaline response out of its band (9.4, band 10–20).

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/endo/params.ts`, find:

```ts
export const P2_PER_MIN = 0.025;```

Replace with:

```ts
/**
 * FU-10 E12: the remote-insulin rate constant of the minimal model. 0.025/min put the nadir of an IV insulin bolus at
 * 13 min (research/14 ET-20a; the insulin-tolerance test puts it at 20–30 min, research/12 at 40–60). Bergman's own
 * estimates in normal subjects are ≈ 0.01–0.02/min (Bergman RN, Phillips LS, Cobelli C, J Clin Invest 1981;68:1456
 * [VERIFY]) — the slower remote compartment is the mechanism, not a bigger dose or a smaller SI. SI is re-anchored so
 * the steady-state action SI·(I − Ib) is unchanged (SI_PER_MIN_PER_UU is the same; only the LAG moves).
 */
export const P2_PER_MIN = 0.016;```

- [ ] **Step — the test.** Create `test/engine/fu10-insulin-nadir.test.ts` (the ET-20 rig: awake, spontaneous, room
  air, 10 units IV): the nadir is below 3.9 mmol/L, comes later than 14 min and the adrenaline peak is 10–20 × basal;
  plus an `it.fails` "nadir at 20–30 min — measured 15.3".
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/engine/fu10-insulin-nadir.test.ts test/engine/endo-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-20a ET-20b ET-20c ET-18c ET-21a ET-22 ET-16c ET-17` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): the remote insulin compartment at its published rate constant (FU-10 E12a)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A6: E10 + E13 — etomidate suppresses cortisol synthesis; adrenal insufficiency is a basal deficit (7e; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,hormones,effects,core,adapters}.ts`; create
`packages/engine-core/test/l2/endo/fu10-adrenal.test.ts` and `packages/engine-core/test/engine/fu10-adrenal.test.ts`
(SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** FU-7 Task 9 adds `sympDrug`/`catReserve` and Task 18 a `cortExo` argument to the SAME `stressEffects(…)`
signature and the same `stepHormones({…})` call. **Coordination:** FU-10 adds `cortBasalF` as a FIELD of
`HormoneInputs` and changes `cortResponse` to a function call — FU-7's `cortExo` is a fourth POSITIONAL argument of
`stressEffects`. Whichever lands second re-anchors on the merged line and keeps both (the merged call is
`stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponseOf(c), x.cortExoNmolL ?? 0)`), which is
stated here so neither executor deletes the other's argument.

**Why (research/14 E10/E13, ET-34 MI, ET-15a TW):** etomidate did not touch the adrenal (cortisol at 4 h 1582 vs
propofol's 1575; `cortResponse` was set only by the adrenal profile, `core.ts:118,173`, although `hormones.ts`'s header
names etomidate). Adrenal insufficiency changed nothing at rest or after induction (MAP 73.7 in both arms), because
`cortResponse` 0.5 halved only the stress RISE.

**Mechanism (D8, D9):** (a) 7e observes an etomidate dose and keeps an 11β-hydroxylase suppression state that recovers
with t½ 8 h and multiplies the adrenal's cortisol RESPONSE; (b) the adrenal-insufficiency profile lowers the BASAL
cortisol (×0.5) and cortisol below basal costs resting systemic resistance (cortisol's permissive effect, below basal
only).

**Measured (prototype):** ET-34 cortisol at 4 h **1031 vs 1575 = 0.655** (the report's §7 item: ≤ 0.8). ET-15a:
post-induction MAP **70.19 vs 73.73**, surgical MAP **−4.4** (band beyond 5 → `it.fails` with the number), phenylephrine
**0.68** of normal (band ≤ 0.8), cortisol **233 vs 532** nmol/L. The healthy patient is untouched: ET-16a/b/c
bit-identical (cortisol peak 1544 at 5 h, `cortF5vsF0` −0.07). This is the basal deficit FU-7's hydrocortisone (D13)
reverses; the mineralocorticoid volume deficit is Task B4.
**FU-4 check:** `audit:physiology` unchanged (no healthy-patient path moves); `test/engine/endo-circ-acceptance.test.ts`
green.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

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

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
    else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8```

Replace with:

```ts
    else if (d.agent === 'etomidate') { // FU-10 E10: 11β-hydroxylase suppression for hours after one induction dose
      const perKg = d.amountUnit === 'mg/kg' ? d.amount : d.amountUnit === 'mg' ? d.amount / es.weightKg : 0;
      if (perKg > 0) es.core.etomSuppr = Math.min(1, (es.core.etomSuppr ?? 0) + perKg / ETOM_SUPPR_REF_MG_KG);
    } else if (d.agent === 'insulinDextrose' && d.amountUnit === 'units') { // FU-10 E8```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';```

Replace with:

```ts
import { ANTINOC_GA_FALLBACK, EPI_EXO_PG_PER_RATE_EQ, ETOM_SUPPR_REF_MG_KG, INSDEX_DEXTROSE_G_PER_UNIT } from './params.ts';```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
type DoseLike = { agent: string; amount: number; amountUnit: string };```

Replace with:

```ts
type DoseLike = { agent: string; amount: number; amountUnit: string; mgPerKg?: number | null };```

- [ ] **Step — the tests.** Create `test/l2/endo/fu10-adrenal.test.ts`: (1) `cortResponseOf` is 1 for a normal patient,
  0.5 for the profile, 0.4 after a full etomidate dose and 0.2 for both; (2) the suppression halves in ≈ 8 h; (3)
  `cortBasalF` lowers the resting cortisol and `svrF` falls below 1 with it, while a HIGH cortisol never raises `svrF`.
  Create `test/engine/fu10-adrenal.test.ts`: etomidate 0.3 mg/kg vs propofol 2 mg/kg under 4 h of surgical stimulus →
  cortisol ratio ≤ 0.8; the adrenal-insufficiency patient's MAP after induction is lower than normal and phenylephrine
  100 µg raises it ≤ 0.8 × the normal patient's rise, with the `it.fails` for the surgical arm (−4.4 vs beyond 5 mmHg).
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/engine/fu10-adrenal.test.ts test/engine/endo-acceptance.test.ts test/engine/endo-circ-acceptance.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-34 ET-15a ET-16a ET-16b ET-16c ET-26b` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): etomidate suppresses the cortisol response; adrenal insufficiency is a basal deficit (FU-10 E10, E13)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A7: E7(a–c) — insulin deficiency: the omitted basal insulin, ketogenesis and the DKA potassium (7e → 7c; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/types-endo.ts`, `src/l2/endo/{core,params,adapters}.ts`,
`src/l2/blood/core.ts` (**E-FU10-2**: one line), `test/l2/endo/core.test.ts` (**E-FU10-4**: the `T1` fixture);
create `packages/engine-core/test/l2/endo/fu10-insulin-deficit.test.ts` and
`packages/engine-core/test/engine/fu10-insulin-omission.test.ts` (SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** FU-9 A3/A5/A6 edit `l2/blood/core.ts` (citrate clearance, the COP calibration, the K⁺ set point on
total-body K) — this task adds ONE line after the `drug` K⁺ line, which FU-9's A6 block also quotes: whichever lands
second re-anchors on the merged statement (the added line is independent of the K⁺ set point itself). FU-8 A16 carries
`basalInsulin` into the scenario schema (Requests).

**Why (research/14 E7, ET-18a NE, ET-18b MI, ET-23c WR, ET-23d PL-for-the-wrong-reason):** the type 1 profile always
carried its basal insulin (`core.ts:101–104`), so the commonest teaching case — the missed dose — was not expressible;
insulin deficiency made no ketones (DKA was only 7c's instructor condition and an INPUT to 7e); and the instructor's
DKA presented HYPOkalaemic (K⁺ 3.70 against the healthy twin's 4.18), because the two DKA causes of hyperkalaemia
(insulinopenia and hyperosmolality) had no path — 7e's K⁺ term read only SECRETED insulin above basal.

**Mechanism (D7):** (a) `endo.basalInsulin: false` omits the long-acting insulin of a type 1 patient; (b) the insulin
deficit 7e already integrates (`egpDef`) drives a ketoacid production rate into 7c's pool through one new seam
(`blood.core.endoKetoMmolMin`), so the acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive emerge from
7c's own chemistry; (c) the deficit and hyperosmolar hyperglycaemia shift K⁺ out of the cells, with the instructor's
`dka` condition counting as insulinopenia.

**Measured (prototype), type 1 with the basal insulin omitted, 6 h:** glucose **7.2 → 32.3 mmol/L**, insulin 0,
ketoacids **99 mmol (≈ 5.8 mmol/L), `dkaSeverity` 0.28**, pH **7.41 → 7.34**, K⁺ **4.18 → 5.5**. The same patient WITH
its basal insulin is unchanged (glucose 7.2, ketones 0, K⁺ 4.17). The instructor's `dka 1`: K⁺ **4.49 vs the healthy
4.18** (was 3.70) and intubation's acidaemia adds **+0.48** (was +0.04). ET-18a/18b stay NE/MI in the published runner
(its arms carry the basal insulin; the executor adds `endo.basalInsulin: false` to its scratch copy and quotes the
numbers). Recorded for Ali: full ketoacidosis takes ≈ 8 h, slower than the guidelines' "within hours" for a missed
dose — the rate constant is [ENG] and is Ali's calibration row, not tuned here.
**FU-4 check:** `test/engine/blood-k-rhythm.test.ts`, `blood-hyperk.test.ts`, `blood-sanity-acid.test.ts` green; the
healthy and type 2 patients have `egpDef` 0, so every non-diabetic row is bit-identical (ET-16c, ET-17, ET-20a–c).

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

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
 * FU-10 E7 — ketogenesis from the insulin DEFICIT. 7e's glucose model already integrates the deficit as `egpDef` (0–1,
 * τ 3 h: the insulinopenic release of hepatic output); unrestrained lipolysis and hepatic ketogenesis follow the same
 * deficit, so the ketoacid production rate is KETO_MMOL_MIN_MAX · egpDef per 70 kg, delivered to 7c's ketoacid pool.
 * Size [ENG]: 25 mmol/L of ketoacids in ≈ 17 L of ECF is 7c's established DKA (`DKA_KETO_MMOL_L`), and omitted basal
 * insulin in type 1 produces ketosis (β-hydroxybutyrate > 3 mmol/L) within hours (JBDS-IP perioperative diabetes 2023;
 * JBDS DKA 2023; Kitabchi AE et al., Diabetes Care 2009;32:1335) — 0.5 mmol/min at a full deficit reaches ≈ 3 mmol/L in
 * ≈ 100 min and the established pool in ≈ 8 h.
 */
export const KETO_MMOL_MIN_MAX = 0.5;
/**
 * FU-10 E11 — a fever is an added HEAT SOURCE, not only a raised set point. An anaesthetised, vasodilated patient
 * cannot defend a set point (no shivering, no vasoconstriction), so on main a septic or thyrotoxic patient under GA at
 * 21 °C stayed at 36.6–36.9 °C (research/14 ET-12, ET-13a) while the tables ask for 38.5–41 °C. Pyrogens (and thyroid
 * hormone) raise heat production directly: prostaglandin-driven thermogenesis in sepsis (Miller 10e ch. 46: fever raises
 * VO2 10–13 %/°C) and the uncoupled metabolism of thyrotoxicosis. PYROGEN_W_70: watts added at a full condition (sepsis
 * severity 1 / storm 1) for a 70 kg patient [ENG; fit target: a febrile core 38.5–41 °C under GA in a 21 °C theatre —
 * the metabolic vo2F rows already carry their own heat, this is what is left]. Scaled by body size like every heat term.
 */
export const PYROGEN_W_70 = 120;
/** FU-10 E11: the set-point shift at which the pyrogenic heat is full (the sepsis/storm rows' own shift) [ENG]. */
export const PYROGEN_SET_REF_C = 2;
/** FU-10 E7: the insulin deficit shifts K OUT of the cells (Kitabchi 2009: insulinopenia is one of DKA's two causes of
 * hyperkalaemia) — mmol/L of K set point at a full deficit [ENG: with the hyperosmolar term, DKA presents ≥ healthy]. */
export const KETO_K_EFFLUX = 1.4;
/** FU-10 E7: hyperosmolar hyperglycaemia is the other (water leaves the cells with K): mmol/L of K set point per mg/dL
 * of glucose above HYPEROSM_FROM_MGDL [ENG; Kitabchi 2009]. */
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
  ketoMmolMin: number;```

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
      + KETO_K_EFFLUX * Math.max(g.egpDef, Math.min(1, Math.max(0, x.dkaSeverity))) + HYPEROSM_K_PER_MGDL * Math.max(0, g.g - HYPEROSM_FROM_MGDL),
    ketoMmolMin: KETO_MMOL_MIN_MAX * g.egpDef * (x.weightKg / 70),```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S,```

Replace with:

```ts
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; endoKShift?: number; endoGlucoseMgDl?: number };```

Replace with:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number };```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;```

Replace with:

```ts
  c.endoKShift = o.kShift;
  c.endoGlucoseMgDl = o.glucoseMgDl;
  c.endoKetoMmolMin = o.ketoMmolMin; // FU-10 E7: ketogenesis from the insulin deficit — 7c integrates it into its pool```

In `packages/engine-core/src/l2/blood/core.ts`, find:

```ts
  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux```

Replace with:

```ts
  const drug = INSULIN_K_SHIFT * ef.ins + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Stage 7e (E-7e-3): endogenous epinephrine β2, secreted insulin, MH K efflux
  // FU-10 E7 (E-FU10-2): Stage 7e's ketogenesis from the insulin deficit enters 7c's ketoacid pool, which 7c owns: the
  // acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive then all emerge as they do for `condition dka`
  so.keto += Math.max(0, (bc as { endoKetoMmolMin?: number }).endoKetoMmolMin ?? 0) * (dtS / 60);```

In `packages/engine-core/test/l2/endo/core.test.ts`, find:

```ts
const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false } as const;```

Replace with:

```ts
const T1 = { diabetes: 'type1', thyroid: 'normal', adrenalInsufficiency: false, basalInsulin: true } as const; // FU-10 E7: the basal insulin can now be omitted```

- [ ] **Step — the tests.** Create `test/l2/endo/fu10-insulin-deficit.test.ts`: (1) `glucoseProfile` gives a type 1
  patient its basal insulin by default and none when `basalInsulin: false`; (2) after 2 h without it, `egpDef` > 0.4,
  `out.ketoMmolMin` > 0.15 and `out.kShift` > 0.5; (3) a patient on basal insulin keeps `ketoMmolMin` 0 and `kShift` 0;
  (4) the instructor's `dkaSeverity` 1 alone raises `kShift` above 1. Create
  `test/engine/fu10-insulin-omission.test.ts`: type 1 with the basal insulin omitted over 6 h — glucose above
  20 mmol/L, 7c's ketoacids above 3 mmol/L, `blood.out.dkaSeverity` > 0.15, K⁺ above the control's, and the control arm
  (basal insulin on) unchanged.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/blood test/engine/fu10-insulin-omission.test.ts test/engine/blood-k-rhythm.test.ts test/engine/blood-sanity-acid.test.ts test/engine/blood-hyperk.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-18 ET-23 ET-20a ET-20b ET-16c ET-17` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e,7c): insulin deficiency makes ketones and shifts potassium; the type 1 basal insulin can be omitted (FU-10 E7, E-FU10-2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

### Task A8: E11(a) — a fever is a heat source the anaesthetised patient cannot defend (7e; PROTOTYPED)

**Files:** Modify `packages/engine-core/src/l2/endo/{params,core,pipeline}.ts`, `src/l2/thermal/heat.ts`; create
`packages/engine-core/test/l2/endo/fu10-fever.test.ts` and `packages/engine-core/test/engine/fu10-fever.test.ts`
(SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** none (`l2/thermal/**` is FU-10's; the `l2/endo` lines are FU-10's own).

**Why (research/14 E11, ET-12 TW, ET-13a TW):** the sepsis and thyroid-storm rows raise the SET POINT (+2.2 / +1.8 °C),
but an anaesthetised, vasodilated patient has no effector to defend a set point, so under GA in a 21 °C theatre the
septic core sat at **36.86 °C** and the storm's at **36.58 °C** while the tables ask for 38.5–41 °C.

**Mechanism (D5 of the report's §3):** the inflammatory/thyrotoxic heat becomes a direct HEAT SOURCE (W), sized by the
same set-point shift the rows already declare, added to the heat balance beside the metabolic multiplier. VO₂/VCO₂ stay
the rows' own `vo2F`, so no metabolic number is counted twice.

**Measured (prototype):** the septic patient under GA reaches **38.50 °C** at 90 min (band 38.5–41, the edge);
`dEtco2` +10.1 at fixed ventilation; VO₂ 16.7 %/°C and HR 12.0 /°C (the ET cell's confounded per-°C items stay out of
their bands and keep their `it.fails` — the ET report's own HAND note explains why the rig cannot isolate them). The
thyroid storm reaches **37.61 °C at 1 h and 38.16 °C at 80 min** → `it.fails` "38.5–41 °C at 1 h — measured 37.61"
with the trade-off recorded for Ali: a source large enough to reach 38.5 °C at 1 h (170 W) takes the storm's heart rate
to 185 bpm, above its own 140–180 band (measured), so the size stays at the sepsis fit.
**FU-4 check:** ET-30 (iatrogenic overwarming to 38.31 °C with sweating from 38.0) unchanged; every non-febrile patient
has `setShiftC` 0, so `pyrogenW` is 0 and all thermal rows are bit-identical (ET-01a/b, ET-02, ET-04).

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds```

Replace with:

```ts
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds
  /** FU-10 E11: pyrogenic heat production, W — a direct heat source the anaesthetised patient cannot switch off. */
  pyrogenW: number;```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,```

Replace with:

```ts
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,
    // FU-10 E11: the inflammatory/thyrotoxic heat source, sized by the same set-point shift the rows already declare
    pyrogenW: PYROGEN_W_70 * (x.weightKg / 70) * Math.min(1, Math.max(0, setShiftC / PYROGEN_SET_REF_C)),```

In `packages/engine-core/src/l2/endo/core.ts`, find:

```ts
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,```

Replace with:

```ts
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,
  PYROGEN_SET_REF_C, PYROGEN_W_70,```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core```

Replace with:

```ts
  extraX: number; // endocrine/condition metabolic heat multiplier (1 = none), written by 7e's endo core
  /** FU-10 E11: pyrogenic heat, W — a direct source (sepsis, SIRS, thyroid storm) the anaesthetised patient cannot
   * switch off, written by 7e's endo core beside `extraX`. It is heat only: VO2/VCO2 stay the rows' `vo2F`. */
  pyrogenW: number;```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    metabolicW: basalW(st) + st.m0 * (st.extraX - 1),```

Replace with:

```ts
    metabolicW: basalW(st) + st.m0 * (st.extraX - 1) + Math.max(0, st.pyrogenW ?? 0), // FU-10 E11: the pyrogenic source```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
fluidWarmer: false, extraX: 1, dantE: 0, out: zeroOut(),```

Replace with:

```ts
fluidWarmer: false, extraX: 1, pyrogenW: 0, dantE: 0, out: zeroOut(),```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)```

Replace with:

```ts
    th.extraX = o.vo2F; // endocrine metabolic heat (thyroid, sepsis, hypermetabolic)
    th.pyrogenW = o.pyrogenW; // FU-10 E11: the pyrogenic heat source (a fever the anaesthetised patient cannot defend)```

- [ ] **Step — the tests.** Create `test/l2/endo/fu10-fever.test.ts`: `out.pyrogenW` is 0 without a condition, rises
  with the sepsis/storm set-point shift, saturates at the reference shift and scales with body weight. Create
  `test/engine/fu10-fever.test.ts`: the septic patient under the GA flag at 21 °C passes 38 °C within 90 min while the
  healthy control cools, with the `it.fails` for the storm arm at 1 h.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/endo test/l2/thermal test/engine/fu10-fever.test.ts test/engine/endo-acceptance.test.ts test/engine/thermal-warmer.test.ts` → green.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-12 ET-13a ET-13b ET-26a ET-26b ET-28 ET-30 ET-01a` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "feat(7e): pyrogens are a heat source, so a septic or thyrotoxic patient is febrile under anaesthesia (FU-10 E11a)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

---

## Part B — after the named predecessor merges

### Task B0: Part B base — merge main and re-verify every Part B block (no code change)

- [ ] `git fetch origin && git merge origin/main` (never `git stash`; resolve by keeping both sides' statements).
- [ ] Record which predecessors are in: **FU-9 A2** (B2), **FU-9 A1** (B4), **FU-7 Task 9** (B1), **FU-7 Task 12 / FU-8
  Part A** (B5), **FU-7** (B6), **FU-9 A2** (B3). A task whose predecessor is absent is SKIPPED and named in the gate
  note; it never lands "adapted".
- [ ] Re-check every Part B find block on the merged tree (Task A0 Step 3's checker) and re-run Part A's own tests.
- [ ] Re-measure the ET cells Part A moved (`./run.sh cli.ts ET-04 ET-10a ET-12 ET-15a ET-18 ET-20a ET-23 ET-31 ET-34`)
  so the gate's before → after column is against the merged base, not the old one.

---

### Task B1: E4 + E12(b) — cold and hypoglycaemia drive the sympathetic system, inside FU-7's seam (7e hormones; requires FU-7 Task 9; UNPROTOTYPED)

**Precondition:** FU-7 Task 9 (`bus.cns.sympDrive` → `EndoInputs.sympDrug` → `extraSymp`, with `catReserve`) must be on
main: `git grep -n "sympDrug" -- packages/engine-core/src/l2/endo`. **Coordination (the ET report's §4 item 4):** 7e's
`extraSymp` carries MH, hypoglycaemia and sepsis; FU-7 Task 9 adds the drug drive to the SAME sum and Task 10 splits the
nociceptive surge out of it. FU-10 adds its two terms to that sum and adds no second seam; the MH HR response (+47 bpm at
15 min, ET-10c) must stay — assert it in this task.

**Why (research/14 E4, ET-05b WR / 05c TW; E12, ET-21a WR):** at a 34.5 °C emergence, shivering raises VO₂ +59 % but
plasma noradrenaline is 275 = 275 pg/mL, HR −2, MAP −0.5, CO 5.8 = 5.8 (Frank SM et al., Anesthesiology 1995;82:83:
core −1.3 °C raises noradrenaline ≈ ×4 with vasoconstriction and a higher MAP); and the hypoglycaemic HR rise is LARGER
under general anaesthesia than awake (+26 vs +16), because the hypoglycaemic drive enters `extraSymp`, which
antinociception and depth do not blunt (Miller 10e: hypoglycaemia under anaesthesia is recognised late — Cryer PE).

**Mechanism (the report's E4(a) and E12(b)):**
1. a COLD drive into the same `extraSymp` sum: `+ COLD_SYMP_PER_C · max(0, thrVaso − Tc)` with the threshold from
   `currentThresholds` (so it starts where the patient's own defence starts) and `COLD_SYMP_PER_C` [ENG] sized to Frank
   1995 (core −1.3 °C → noradrenaline ≈ ×4, i.e. `symp` ≈ 2 at 1.3 °C below the threshold);
2. the HYPOGLYCAEMIC drive scaled by `(1 − antinoc)` exactly as the noxious drive is, so general anaesthesia masks the
   tachycardia instead of amplifying it. Both are one line each in `l2/endo/core.ts`'s `stepEndoCore`, beside FU-7's
   `sympDrug` term, plus the two constants in `l2/endo/params.ts`.
3. the VO₂ of shivering as a CO input is **not** FU-10's: audit 09 R11 / FU-6 Task 14 own the demand → CO coupling
   (viscosity there, the metabolic demand ratio in the R11 owner's hands) — this task's test therefore asserts
   noradrenaline, HR and MAP, and records CO with its number (the report's E4(b)).

**R45 procedure (this task is UNPROTOTYPED):** write the tests first with the report's numbers, measure, and if a band
cannot be reached with the sourced mechanism, keep it as `it.fails` with the measured number. Do NOT raise
`COLD_SYMP_PER_C` past the Frank-1995 fit to chase HR: hypothermic bradycardia (`tempHrF` below 35 °C) opposes it, and
that trade-off is a calibration row (R44), stated in the gate note.

**Tests:** `test/l2/endo/fu10-cold-drive.test.ts` (the drive is 0 above the threshold, rises below it, and the
hypoglycaemic drive halves at `antinoc` 0.5) and `test/engine/fu10-cold-sympathetic.test.ts` (SLOW_A; the ET-05 cold
emergence vs its normothermic twin: noradrenaline higher, HR and MAP higher; and the ET-21 pair: the HR rise under GA is
SMALLER than awake). **FU-4 check:** ET-10c (MH HR +47), ET-20c (hypoglycaemic HR awake +18, adrenaline ×11–16),
ET-26a/28 (the septic rows' `extraSymp`) and `audit:physiology` are re-measured in the same step.
**Commit:** `feat(7e): cold drives the sympathetic system and anaesthesia masks hypoglycaemia (FU-10 E4, E12b)`.

---
### Task B2: E2 — aerobic muscle heat is limited by the oxygen delivered, so the core stops rising after the arrest (7e thermal; PROTOTYPED, requires FU-9 A2)

**Precondition:** FU-9 A2 (`l2/blood/oxygen.ts`: VO₂ is supply-dependent only below DO₂crit) must be on main. Check it
with `git log --oneline origin/main -- packages/engine-core/src/l2/blood/oxygen.ts` and
`git grep -n "FU-9 F3" -- packages/engine-core/src/l2/blood/oxygen.ts`. If it is absent, STOP and report: on today's
main this task is wrong (D12, numbers below).

**Files:** Modify `packages/engine-core/src/l2/thermal/heat.ts`, `src/l2/endo/adapters.ts`; create
`packages/engine-core/test/engine/fu10-mh-heat-limit.test.ts` (SLOW → `SLOW` + `SLOW_A`); modify `vite.config.ts`.
**Overlap:** FU-9 A4 edits `adapters.ts`'s `writeBlood` and its `BloodLike` type — this task adds one property to the
same type (`o2`) and one line in `readEndoInputs`; whichever lands second re-anchors on the merged type.

**Why (research/14 E2, ET-10g/ET-M2):** untreated MH arrests at +45 min at ≈ 42.5 °C (FU-4 G8's hazard, right) and the
dead patient then keeps heating to **44.3 °C at 60 min and 47.8 °C at 90 min** in VF and asystole, because the MH and
shivering heat (`heat.ts:145–146`) are independent of perfusion.

**Mechanism:** both are AEROBIC muscle heat, so scale them by 7c's delivered fraction of the oxygen demand
(`o2.vo2 / o2.demand`, 1 without 7c): heat stops when the circulation does.

**Measured (prototype, with FU-9 A2's line in place):** the pre-arrest course is unchanged to the second — EtCO₂ doubles
at 860 s, core +0.174 °C/min, K⁺ 5.75 at 20 min, pH 6.98 at 30 min, VF at **+45 min (2680 s)** — and the core peaks at
**42.34 °C** instead of 47.77 (MANUAL twin 42.17 vs 47.77). The dantrolene rows are unchanged (t½ 440 s, peak +14 min,
temperature falls). Shivering VO₂ at a cold emergence 56.9 % (was 58.97; TW either way, Ali Q1).
**Without FU-9 A2 (why this is Part B):** the same change gives core +0.057 °C/min, **no arrest at all** and a peak of
40.0 °C — FU-4's hyperthermic-arrest hazard would be lost.
**FU-4 check:** `test/engine/circ-lowflow-arrest.test.ts`, `clinical-suite.test.ts` and `audit:physiology` green; the
arrest times unchanged.

- [ ] **Step — the edits** (each find matches exactly once in application order; the chained ones are
  marked "(chained on <task>)" and match once in the applied state):

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
  pyrogenW: number;```

Replace with:

```ts
  pyrogenW: number;
  /** FU-10 E2: the fraction of the O2 demand actually consumed (7c `o2.vo2 / o2.demand`), written by 7e every pass.
   * Aerobic muscle heat (MH, shivering) cannot exceed the oxygen it burns, so the core stops rising when flow stops. */
  o2F: number;```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
fluidWarmer: false, extraX: 1, pyrogenW: 0, dantE: 0, out: zeroOut(),```

Replace with:

```ts
fluidWarmer: false, extraX: 1, pyrogenW: 0, o2F: 1, dantE: 0, out: zeroOut(),```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */```

Replace with:

```ts
/** FU-10 E2: the delivered fraction of the O2 demand (1 without 7c, clamped to [0, 1]). */
const o2Frac = (st: ThermalState): number => Math.min(1, Math.max(0, st.o2F ?? 1));

/** FU-10 E3: the fraction of the effectors (vasomotor tone, shivering) a neuraxial block abolishes; 0 otherwise. */```

In `packages/engine-core/src/l2/thermal/heat.ts`, find:

```ts
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)), // FU-10 E3: no shivering below a block
    mhW: st.m0 * MH_HEAT_X * mhActivity(st.mh, t),```

Replace with:

```ts
    // FU-10 E2: both are AEROBIC muscle heat — limited by the oxygen the circulation delivers (`o2F`, 1 when 7c is absent)
    shiverW: shiverW(st.tc, thr, st.m0, st.effKg, st.nmb) * (1 - blocked(st)) * o2Frac(st), // FU-10 E3: no shivering below a block
    mhW: st.m0 * MH_HEAT_X * mhActivity(st.mh, t) * o2Frac(st),```

In `packages/engine-core/src/l2/endo/adapters.ts`, find:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number };```

Replace with:

```ts
  core?: { so?: { keto?: number }; fl?: { vp?: number; visf?: number; kfMult?: number }; o2?: { vo2?: number; demand?: number };
    endoKShift?: number; endoGlucoseMgDl?: number; endoKetoMmolMin?: number };```

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

- [ ] **Step — the test.** Create `test/engine/fu10-mh-heat-limit.test.ts` (the ET-10 rig, instructor MH severity 1,
  90 min, no treatment): the patient arrests at 40–50 min, the core peaks below 43.5 °C, and the peak comes within 5 min
  of the arrest; plus a perfusing arm (MH treated at +15 min) whose 15-minute course matches the pre-FU-10 numbers to
  0.05 °C, so the limit is inert while the circulation works.
- [ ] **Step — run.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/thermal test/l2/endo test/engine/fu10-mh-heat-limit.test.ts test/engine/circ-lowflow-arrest.test.ts test/engine/clinical-suite.test.ts` → green;
  `npx -y pnpm@9.15.9 run audit:physiology` → the arrest table unchanged.
- [ ] **Step — the ET runner.** `./run.sh cli.ts ET-10 ET-11 ET-M2 ET-05a ET-05c` → the rows above.
- [ ] **Commit and push.** `git add -A packages/engine-core && git commit -m "fix(7e): MH and shivering heat follow the oxygen delivered, so a dead patient stops heating (FU-10 E2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" && git push`

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
**Files:** `src/l2/endo/{conditions,core,adapters}.ts` and ONE line in `src/l2/blood/{core,oxygen}.ts` (a second
declared exception, **E-FU10-7**, if the seam is taken; FU-9 A2 owns those lines, hence the ordering).
**Tests:** `test/l2/endo/fu10-conditions.test.ts`, `test/engine/fu10-septic-lactate.test.ts` (SLOW_A).
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
**Tests:** `test/l2/endo/fu10-osmotic.test.ts`, `test/engine/fu10-dka-volume.test.ts` (SLOW_A).
**FU-4 check:** ET-23d (the induction MAP fall), the FU-9 A1/A6 renal rows and `organs-renal.test.ts`.
**Commit:** `feat(7e,7d): the glycosuric osmotic diuresis makes the DKA volume deficit (FU-10 E7d)`.

---

### Task B5: E9 — atrial fibrillation below 32 °C and in thyroid storm (7a rhythm hazard; requires FU-7 Task 12 and FU-8 Part A; UNPROTOTYPED)

**Precondition:** FU-7 Task 12 (the shock/conversion probabilities) and FU-8 Part A (A21's arrest state) both edit
`l2/circ/arrest.ts` and the L3 outcome path; this task adds a hazard in the same seeded frame and must not be written
against a stale file.

**Why (research/14 E9, ET-09b MI, ET-13b MI):** `arrest.ts` carries only the VF hazard below 28 °C, so the core at 28 °C
stays sinus (ERC 2021 / Danzl & Pozos, NEJM 1994;331:1756: AF is common below 32 °C and reverts on rewarming), and thyroid
storm scales the sinus rate (`thyroid.ts` `hrF` 1.8) with no AF path (Klein I, Ojamaa K, NEJM 2001;344:501: AF in
10–25 % of thyrotoxicosis [VERIFY]).

**Mechanism:** one AF ONSET hazard in the same seeded frame as the VF hazard — rate rising below 32 °C and with the storm
severity — and reversion when the cause is corrected (rewarming above ≈ 33 °C, the storm treated). 7e publishes the
storm severity it already has; the hazard itself lives with the other rhythm hazards (**E-FU10-5**).
**R45 procedure:** assert over SEEDS (the FU-4 pattern: N of M seeds fibrillate within the window), never a single draw;
if the fraction is off, report it rather than moving the rate.
**Tests:** `test/engine/fu10-af-hazard.test.ts` (SLOW_A; 20 seeds at 28 °C and 20 in storm, plus a normothermic control
that never fibrillates). **FU-4 check:** ET-09a/c (bradycardia, Osborn, spontaneous VF at 25 °C), `blood-k-rhythm`,
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
**Tests:** `test/l2/pk/fu10-thyroid-clearance.test.ts`, `test/engine/fu10-hypothyroid.test.ts` (SLOW_A).
**FU-4 check:** the four-patient propofol table in `audit:physiology`, ET-08b/08c and ET-13a.
**Commit:** `feat(7g,7e): thyroid state changes drug clearance (FU-10 E13b, E-FU10-6)`.

---

## Task G: Gate — merge main, full verification, the ET matrix before → after, the gate note, the pull request

- [ ] **Step 1 — merge and re-verify.** `git fetch origin && git merge origin/main`; typecheck; the whole fast set; the
  slow set as the two disjoint groups (`SLOW_A` and `SLOW_B`), recording both wall times (slow-b was 37.6 min against its
  40 min limit at the FU-4 gate: every FU-10 slow file is in `SLOW_A`); `npx -y pnpm@9.15.9 run audit:physiology`;
  `npx -y pnpm@9.15.9 run audit:monitor` unchanged; the e2e suite on Playwright's own Chromium and WebKit.
- [ ] **Step 2 — the ET matrix, all 72 cells.** `ET_OUT=out/after.json ./run.sh cli.ts all` and
  `node --experimental-strip-types report.ts` → paste the before → after column beside `research/14`'s own into
  `docs/gates/fu-10.md` (research/12 §7). Expected from the writer's measurements (Part A + B2): **ET-10a WR → PL**,
  **ET-04** shivering and redistribution right (ratio `it.fails`), **ET-01b/03a** plateau and age improved with their
  `it.fails`, **ET-31 IN → PL** on glucose, **ET-23c** K⁺ ≥ healthy, **ET-34** ratio 0.655, **ET-15a** measurable,
  **ET-20a** 15.3 min, **ET-12** febrile, **ET-10g/M2** no post-arrest heating. Every cell the plan did not touch must
  keep its verdict — list any that moved, with the reason.
- [ ] **Step 3 — the FU-4 and hypothermia/MH check (explicit).** Quote in the gate note: ET-08a (MAC −5.2 %/°C),
  ET-08b (rocuronium ×2.7), ET-09a (HR 40, Osborn), ET-09c (VF at 25 °C), ET-10b–e (EtCO₂ doubling 860 s, HR +47, core
  +0.174 °C/min, K⁺ 5.75, pH 6.98), ET-10g (arrest at +45 min), ET-11a–c (dantrolene), ET-M1–M3, and the FU-4 engine
  files `circ-lowflow-arrest`, `clinical-suite`, `blood-k-rhythm`. State exactly which rows moved and why (the writer's
  prototype moved only the post-arrest core temperature, B2).
- [ ] **Step 4 — the `it.fails` ledger.** List every `it.fails` this plan adds or flips, with its number, in
  `docs/gates/fu-10/it-fails.md` (the FU-4 pattern): the neuraxial ratio 0.64; the draped plateau 4.93 h at 34.80 °C and
  the linear phase −0.291 °C/h; ET-03a `d4h` −0.15; the combined row's K⁺ −1.18; the insulin nadir 15.3 min; the adrenal
  surgical MAP −4.4; the thyroid storm's 37.61 °C at 1 h; plus anything Part B adds.
- [ ] **Step 5 — the gate note `docs/gates/fu-10.md`.** The task-by-task before → after table, the ET matrix column, the
  `it.fails` ledger, the calibration rows for Ali's R44 pass (the neuraxial block fraction and `NEURAXIAL_H`; the
  vasoconstriction constant 34.8 vs the tables' 34.5 ± 0.2; the pyrogen size vs the storm's heart rate; the ketogenesis
  rate; the insulin lag vs the counter-regulation; `CORT_SVR_PERMISSIVE`), the open questions below, and the Part B tasks
  that were skipped for want of their predecessor.
- [ ] **Step 6 — the pull request.** Title **"FU-10: endocrine and thermal integration"**; body = the goal, the task list
  with its measured rows, the exceptions (E-FU10-1…8) for the orchestrator's approval, the `it.fails` ledger and the
  questions; it ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Never self-merged** — the
  executor stops here and reports.

---
## Open questions for Ali (the ET report's §8, with the model's numbers and this plan's recommendation)

1. **Shivering VO₂ (§8.1).** A 34.5 °C emergence raises VO₂ **+59 %** (+83 % over the anaesthetised baseline; +57 % after
   Task B2's oxygen limit). research/12 and Miller quote +200–400 %; measured postoperative shivering is +40–100 %
   (Ciofolo 1989; Frank 1995). **Recommendation:** teach the measured range (+40–100 %) and keep the textbook summit as
   the maximum the model can reach at a deeper deficit; the plan does not change the band either way.
2. **MH from its triggers (§8.2).** Should a susceptible patient's MH be a FIXED onset or a seeded draw?
   **Recommendation:** fixed for v1.0 (0 with suxamethonium, 20 min for a volatile alone; measured EtCO₂ doubling at
   +14.3 min and activity from +23.5 min), because a draw makes the teaching case irreproducible; the constants are one
   line each if you want a draw or an abortive (severity < 1) case.
3. **Neuraxial thermoregulation (§8.3).** Confirm the target: redistribution ≈ half of GA's, shivering at ≈ 35.5 °C.
   **Measured after Task A2:** hour 1 −0.76 °C (ratio **0.64** of GA), shivering from **35.48 °C**, core 35.31 °C at 3 h.
   **Recommendation:** accept 0.64 (the absolute fall matches Matsukawa's −0.8 °C) and leave the ratio as an `it.fails`;
   the block fraction (0.5 for T10) is the calibration knob if you want a smaller share.
4. **The insulin–dextrose row's potassium (new).** With the row now reaching the glucose model, its K⁺ fall at 60 min is
   **−1.18** mmol/L against the two-row arm's −0.84 (band −1.0 to −0.6), because the dextrose's own insulin secretion adds
   7e's endogenous shift on top of 7c's treatment curve. **Recommendation:** accept for v1.0 (it is a real second path)
   and put 7c's `INSULIN_K_SHIFT` on the calibration list, or tell us to suppress 7e's secretion-driven shift while a
   combined row is running.
5. **Insulin nadir (§8.5).** 10 units IV: nadir **3.13 mmol/L at 15.3 min** after Task A5 (was 2.92 at 13.3). research/12
   says 40–60 min, the insulin-tolerance test 20–30 min and < 2.2 mmol/L. **Recommendation:** band 20–30 min and keep the
   `it.fails`; reaching it needs the insulin's own disposition (7g's row, FU-8 B1), and a slower remote compartment alone
   takes the adrenaline response out of its band (measured: p2 0.013 → nadir 16.7 min but adrenaline ×9.4, band 10–20).
6. **D50 (§8.6).** 25 g raises glucose **+10.2 mmol/L** at 5 min (research/12 +3–5; Balentine 1998 mean +9.2).
   **Recommendation:** keep the primary paper (PL as graded); no FU-10 task.
7. **Fever under anaesthesia (§8.7).** Task A8 gives the septic patient **38.50 °C** under GA in a 21 °C theatre (was
   36.86) and the thyroid storm **37.61 °C at 1 h, 38.16 at 80 min** (band 38.5–41). A source big enough to reach 38.5 °C
   at 1 h in the storm takes its heart rate to **185 bpm** (band 140–180). **Recommendation:** accept the sepsis fit and
   the storm's `it.fails`; the storm's rate and heat should be re-fitted together in your calibration pass.
8. **Septic shock lactate and SIRS (§8.8).** Warm septic shock runs at lactate 1.0 and MAP 74; `sirs 1` at MAP 88.6.
   **Recommendation:** yes to both — Task B3 (after FU-9 A2) adds the extraction deficit and a vasoplegic SIRS row.
9. **Direction-only cells (§8.9).** ET-03b, ET-05b/c/d, ET-10c, ET-11c, ET-21a, ET-27c, ET-29, ET-30 and ET-M1–M3 have no
   sourced magnitude. **Recommendation:** leave them direction-only for v1.0; FU-10's tests assert the directions and the
   gate note carries the numbers.
10. **[VERIFY] figures (§8.10) this plan now depends on:** Kurz 1993 (the elderly threshold −1 °C, and the neuraxial
    shivering threshold −0.5 °C), Matsukawa 1995 (epidural −0.8 °C in hour 1), Visoiu 2014 (MH onset shorter after
    suxamethonium), Bergman 1981 (p2 0.01–0.02/min), Absalom 1999 (etomidate suppression 6–12 h), Kitabchi 2009 (the two
    causes of DKA hyperkalaemia), Klein 2001 (AF in thyrotoxicosis). Please confirm them before they become the bands.
11. **New — the type 1 omission case (FU-8 A16).** Task A7 adds the engine field `endo.basalInsulin: false`; measured
    over 6 h: glucose 7.2 → 32.3 mmol/L, ketoacids ≈ 5.8 mmol/L, pH 7.34, K⁺ 4.18 → 5.5. Full ketoacidosis takes ≈ 8 h,
    which is slower than "within hours". **Recommendation:** accept for v1.0 and put the ketogenesis rate on the
    calibration list; tell us if you want the scenario schema option (FU-8 A16) in v1.0 as well.

---
## Appendix — the prototyped new test files (paste as they are; the rest of the tests are written by their task)

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
// FU-10 Task A1 (E1): the onset of MH from a susceptible patient's triggers (7e thermal/mh.ts).
import { describe, expect, it } from 'vitest';
import { mhActivity, mhFromExposure, mhOnsetT } from '../../../src/l2/thermal/mh.ts';
import { MH_PROFILE_SEVERITY, MH_SUX_LATENCY_S, MH_VOLATILE_LATENCY_S } from '../../../src/l2/thermal/params.ts';

describe('FU-10 E1: MH onset from the trigger exposure (Visoiu 2014: sooner after succinylcholine)', () => {
  it('the onset is the earliest trigger plus its latency; no exposure, no onset', () => {
    expect(mhOnsetT(undefined)).toBeNull();
    expect(mhOnsetT({})).toBeNull();
    expect(mhOnsetT({ sux: 300 })).toBe(300 + MH_SUX_LATENCY_S);
    expect(mhOnsetT({ volatile: 300 })).toBe(300 + MH_VOLATILE_LATENCY_S);
    expect(mhOnsetT({ volatile: 100, sux: 600 })).toBe(Math.min(100 + MH_VOLATILE_LATENCY_S, 600 + MH_SUX_LATENCY_S));
  });
  it('starts the Stage 3 MH state once; a later succinylcholine brings a pending volatile onset forward', () => {
    const a = mhFromExposure(null, { volatile: 100 }, false, 120);
    expect(a.owned).toBe(true);
    expect(a.mh).toEqual({ severity: MH_PROFILE_SEVERITY, t0: 100 + MH_VOLATILE_LATENCY_S });
    expect(mhActivity(a.mh, 200)).toBe(0); // latent
    const b = mhFromExposure(a.mh, { volatile: 100, sux: 400 }, a.owned, 400);
    expect(b.mh?.t0).toBe(400 + MH_SUX_LATENCY_S);
  });
  it('never overrides the instructor: an instructor MH is kept, and an MH the instructor cleared is not restarted', () => {
    const instr = { severity: 0.5, t0: 50 };
    expect(mhFromExposure(instr, { sux: 10 }, false, 60)).toEqual({ mh: instr, owned: false });
    expect(mhFromExposure(null, { sux: 10 }, true, 900)).toEqual({ mh: null, owned: true });
  });
});
```

Create `packages/engine-core/test/l2/thermal/fu10-neuraxial.test.ts`:

```ts
// FU-10 Task A2 (E3; research/14 ET-04): a neuraxial block has its own thermoregulation — the effectors below the block
// are abolished (vessels dilated, no shivering), the central thresholds are an unsedated patient's except shivering
// ≈ 0.5 °C lower (Kurz 1993; Sessler 2000/2008), so redistribution is about half of GA's (Matsukawa 1995).
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
  it('no central depth: the awake vasoconstriction threshold, the shivering threshold 0.5 °C lower', () => {
    const st = createThermal(36.8, 70);
    st.anaesthesia = 'neuraxial';
    stepThermal(st, 1, 1);
    expect(st.depth).toBe(0);
    const thr = currentThresholds(st);
    expect(thr.vaso).toBeCloseTo(THR_VASO_AWAKE, 6);
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
  // R45: research/12's "about half of GA" is 0.62 on the heat model (0.64 in the ET rig: −0.76 vs −1.19 °C) while the
  // absolute fall matches Matsukawa's −0.8 — the block fraction (0.5, T10) and NEURAXIAL_H are [ENG]; not tuned (Ali Q3).
  it.fails('redistribution about half of the GA fall: ratio 0.4–0.6 (research/12 ET-04) — measured 0.62', () => {
    const r = (36.8 - course('neuraxial', 1).tc[59]!) / (36.8 - course('general', 1).tc[59]!);
    expect(r).toBeLessThanOrEqual(0.6);
  });
});
```

Create `packages/engine-core/test/engine/fu10-mh-trigger.test.ts`:

```ts
// FU-10 Task A1 (E1; research/14 ET-10a): an MH-susceptible patient given its triggers develops MH by itself — 7f
// publishes the exposure times, 7e starts the MH state it owns with the trigger's onset latency. Rig = the ET drug GA with
// succinylcholine (VCV 12 × 600, fixed minute ventilation), no instructor action.
import { describe, expect, it } from 'vitest';
import { firstT, GA, rows, st, VENTED } from '../helpers/fu10.ts';

const read = (e: Parameters<Parameters<typeof rows>[3]>[0], endo: Parameters<Parameters<typeof rows>[3]>[1]) => ({
  etco2: st(e).resp.etco2 as number, mh: endo?.mhActivity ?? 0, tc: st(e).resp.temp.tc as number,
});
const MHS = { neuro: { mhSusceptible: true } };

describe('FU-10 E1: MH from its triggers (MHAUS; Larach 1994/2010; Visoiu 2014)', { timeout: 600_000 }, () => {
  it('susceptible + succinylcholine + sevoflurane at 300 s: EtCO2 doubles within 10–30 min of the triggers (was: never, 29–30 for 90 min)', async () => {
    const r = await rows([...VENTED, ...GA(300, 'sux')], 300 + 40 * 60, 10, read, MHS);
    const base = r.find((x) => x.t === 290)!.etco2;
    const tD = firstT(r, 300, (x) => x.etco2 >= 2 * base);
    console.log(`FU-10 E1 sux: EtCO2 base ${base.toFixed(1)}, doubled at +${((tD - 300) / 60).toFixed(1)} min, MH activity ${r.at(-1)!.mh} at +40 min, core ${r.at(-1)!.tc.toFixed(2)} °C`);
    expect(tD - 300).toBeGreaterThanOrEqual(10 * 60);
    expect(tD - 300).toBeLessThanOrEqual(30 * 60);
  });
  it('a volatile alone starts it later than succinylcholine does (Visoiu 2014), and a patient who is not susceptible never gets it', async () => {
    const vol = await rows([...VENTED, ...GA(300, 'roc')], 300 + 60 * 60, 30, read, MHS);
    const ctl = await rows([...VENTED, ...GA(300, 'sux')], 300 + 60 * 60, 30, read);
    const on = firstT(vol, 300, (x) => x.mh > 0.05);
    console.log(`FU-10 E1 volatile alone: MH activity > 0.05 at +${((on - 300) / 60).toFixed(1)} min; not susceptible: max activity ${Math.max(...ctl.map((x) => x.mh))}`);
    expect(on - 300).toBeGreaterThan(10 * 60);
    expect(on - 300).toBeLessThanOrEqual(60 * 60);
    expect(Math.max(...ctl.map((x) => x.mh))).toBe(0);
  });
});
```


---
## Self-review (plan writer, 2026-09-30)

**Mechanical find-block check.** A checker (`<scratchpad>/fu-10/plan/check_plan.py`, the FU-9 pattern) parses THIS
DOCUMENT's `In \`…\`, find:` / `Replace with:` pairs, applies them in document order to `origin/main` `7954933` and
compares the result with the prototype worktree: **76 find/replace blocks, 0 problems, 9 chained blocks** (a find whose
anchor an earlier task introduced: A6's two `adapters.ts` blocks, A7's and A8's `core.ts` import lines, and B2's five
`heat.ts`/`adapters.ts` blocks — each is exactly once in the applied state and named in its task), **files differing
from the prototype: none**. The prototype tree typechecks and its suites are green (Prototype results).

**What is measured and what is not.** Prototyped and measured on the ET runner: A1, A2, A3, A4, A5, A6, A7, A8 and B2
(B2 with FU-9 A2's single line simulated, then reverted — the patch on disk does not contain it). UNPROTOTYPED, with
exact mechanism, sources, tests and the R45 procedure: **B1, B3, B4, B5, B6** — each waits on a predecessor that owns
the file it edits, so prototyping them against today's main would measure the wrong tree. Every unprototyped task says
so in its title.

**Ownership (R51).** MH stays 7e's (7f only publishes the exposure times); the ketoacid pool stays 7c's (7e publishes a
rate; 7c integrates it — one line, E-FU10-2); K⁺ stays 7c's set point (7e publishes shifts, as it already did); drug PK
stays 7g's (B6's clearance factor is a declared exception, E-FU10-6); the rhythm hazard stays 7a's (E-FU10-5). 7e writes
no field another stage owns, and the engine chain order is untouched.

**R45.** No band was widened, removed or re-worded. Eight items that the sourced mechanisms do not reach become
`it.fails` with their measured numbers (Gate Step 4). Two constants were fitted to the report's own acceptance targets
and say so in their comment (`KETO_K_EFFLUX` to "DKA K⁺ ≥ healthy", `PYROGEN_W_70` to "a febrile core under GA"); every
other new constant is `[ENG]` with its fit target or `[VERIFY]` with its paper. Nothing in FU-4's arrest, hypothermia or
MH rows moves except the post-arrest core temperature, which is E2's whole point (measured both ways, D12).

**Coordination with the in-flight plans.** Checked block by block against FU-6, FU-7, FU-8, FU-9 and 7k: the only shared
statements are `l2/neuro/pipeline.ts` (FU-6/FU-7 edit other lines), `l2/endo/adapters.ts`'s import and `readEndoInputs`
(FU-7 Tasks 9/18, FU-9 A4), `l2/endo/core.ts`'s `stressEffects(…)` call and `stepHormones({…})` (FU-7 Tasks 9/18 — the
merged form is given in Task A6) and `l2/blood/core.ts`'s K⁺ line (FU-9 A6). Each is named in its task's "Overlap" line
with the other plan's blocks quoted. FU-10 duplicates nothing: ET-35 is FU-6's, the incision pressor and dexamethasone
and hydrocortisone are FU-7's, the insulin reference and the scenario schema are FU-8's, the oxygen/renal/acid–base
lines are FU-9's, and the report's E14 (hypothermic intercompartmental clearance) is handed to FU-7 with its cell.

**Weaknesses the reviewer should look at.** (1) The draped linear phase and plateau timing are still out of band
(4.93 h, 34.80 °C, −0.291 °C/h) and the plan argues from the surgical-exposure rigs rather than changing the insulation
calibration — a reviewer may prefer a wound-loss term, which would be a new mechanism in `environment.ts`. (2) The
thyroid storm's fever and its heart rate cannot both be in band with one heat size (measured trade-off); the plan keeps
the sepsis fit. (3) A7's ketogenesis rate reaches an established DKA in ≈ 8 h, slower than the guidelines' "within
hours". (4) B1 must land INSIDE FU-7 Task 9's seam; if FU-7's split changes the sum's shape, B1's two lines move with
it. (5) ET-18a/18b stay NE/MI in the published runner because its arms cannot omit the basal insulin — the plan's own
engine test carries the acceptance instead, and the executor quotes the scratch-copy arm's numbers.
