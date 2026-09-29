# FU-8: Follow-ups — monitor honesty in arrest, library defects, loose ends — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-29, plan writer): COMPLETE — NOT YET REVIEWED (R50 review pending). Base `origin/main` `0fd5397`
> (FU-3 + FU-4 `e81e53f` + FU-5 `16cdf79`; re-checked on `3feee6f`, docs-only since). 60 inventory items; Part A = Tasks
> A0–A18 (executes now), Part B = Tasks B0–B4 (after FU-7; B4 after Ali), Task G. Every Part A task and B1/B4 were
> PROTOTYPED in `<scratchpad>/fu-8/wt` and the blocks generated from it mechanically; B2 and B3 are UNPROTOTYPED (marked).
> Mechanical check: 126 find blocks + 18 creates, 0 problems (Self-review). Backups in `scratch/plans-backup/`
> (`fu-8-followups.md`, `fu-8-prototype.patch`, `fu-8-c1/`, `fu-8-option-d-circuit.ts`, `fu-8-check-blocks.py`).

**Goal:** collect every loose end that no stage owns and turn it into one executable plan, so nothing is lost. The
sources are (1) the FU-5 follow-up list F1–F6 of the G-FU4 ruling (2026-09-29 14:10); (2) the G-FU5 rulings and
FU-5's own Requests (A10-E5, R-FU5-9); (3) the Stage 9 R50 review and the Stage 9 plan's Requests R-S9-1/2/4/6/8;
(4) the review-pack writer's defect list ("Ali's review pack DELIVERED", 2026-09-28 22:20); (5) the calibration-queue
entries that are MECHANISM defects rather than constants. Every item is either a task here, handed to a named in-flight
plan (with the reason), waiting on Ali (with the model's numbers), or left for the R44 calibration pass. The item
inventory below is the index; nothing in it is silently dropped.

**Architecture:** no new module crosses a stage boundary. Monitor items are L3 (`l3/alarms`, `l3/pulse`,
`l3/pressure-numerics`, `l3/capture12`) and renderer/skin data; physiology items stay in their owner's module (7a
`l2/circ`, Stage 5 `l2/ecg`, 7d `l2/organs`/`l2/renal`, 7g `l2/pk`), each measured before its fix; controller items are
6a/6b (`packages/controller`). The plan is split in two parts by file overlap with the in-flight plans:

- **Part A — independent, executes now** (after FU-4/FU-5, before or beside V.1/FU-6/FU-7/7k/Stage 9): no file that
  FU-6's or FU-7's plan edits, or only lines those plans do not touch (named per task).
- **Part B — after FU-7 merges:** the drug-library items (`l2/pk/**`, which FU-7 rewrites) and any physiology item whose
  file FU-6/FU-7 edit on the same lines.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (its own Chromium and WebKit are installed locally),
pnpm 9.15.9 via `npx`. No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **G-FU4 (2026-09-29 14:10)** (the
FU-5 follow-up list F1–F6), **G-FU5 (2026-09-29 01:50)** and the **FU-5 R50 review** rulings, **Stage 9 R50 review
(2026-09-29 14:40)** rulings 1–6, **"Ali's review pack DELIVERED" (2026-09-28 22:20)**, the **calibration queue
headline** (43 rows, after G8a), **R44** (Ali's calibration pass is non-blocking; executors do not tune), **R45**
(mechanisms, never band changes), **R51** (+ addenda; canonical names, the engine chain order, only 7g touches PK),
**R56** (glossary labels), **CI amendments 1–4**. Plans read for scope (so nothing here duplicates them): FU-5
(`docs/plans/fu-5-monitor-fidelity.md`, tracked), FU-6 (`fu-6-respiratory-integration.md`, untracked), FU-7
(`fu-7-drug-layer.md`, untracked), V.1 (`stage-v1-ventilator-followup.md`, executing on
`origin/stage-v1-ventilator-followup`), Stage 9 (`stage-9-clinical-ui.md`, the R50-fixed copy on
`origin/review/stage-9-plan` a01263b), 7k (being written; scope from R57 and R-S9-3). Review pack source:
`../research/15-review-pack/index.html` (Part 1 question IDs, Part 3 rows DR-xx / DP-xx).

---

## Global Constraints

- **R45:** mechanisms, never band changes. No existing acceptance band is widened, removed or re-worded to pass. A band a
  mechanism cannot reach stays (or becomes) `it.fails` with the measured number in its title. A pre-declared `it.fails`
  that a task flips to `it` is named in that task, with its before/after numbers. Constants that are not sourced are
  `[ENG]` with the fit target named in the code comment; no executor tunes a constant to pass (R44: that is Ali's pass).
- **R51:** canonical names (R51 addendum 14); the engine chain order (validate/apply device → pk (7g) → neuro (7f) →
  organs (7d) → blood (7c) → endo (7e) → Stage 3 → hemo) is not changed; **only 7g's modules (`l2/pk/**`) touch PK** —
  every Part B drug-library item is written inside `l2/pk/**` as 7g's owner and reads nothing new outside the bus.
- **R56:** every label a task adds (tile, alarm text, console row, scenario text) is the research/11 glossary label; a
  new engine key gets its glossary entry in the same task (the Stage 9 `GLOSSARY_S9` table is Stage 9's file — FU-8
  lists new keys for it under "Handed to", it does not edit it).
- **Base and branch:** branch `fu-8-followups` from `origin/main` (at least `0fd5397`). Worktree
  `projects/patient-monitor-engine/scratch/wt-fu-8` (R25: never the shared checkout). Push after every task's commit
  (`git push -u origin fu-8-followups` the first time, `git push` after). Never push to `main`; never merge (the Gate
  task opens the PR and stops); the PR is never self-merged.
- **Part A / Part B:** execute Part A (Tasks A0–A18) now. Part B (Tasks B0–B4) starts only when FU-7 has merged to main:
  Task B0 is `git fetch origin && git merge origin/main` and re-verifies every Part B find block on the merged tree
  (FU-7 rewrites `l2/pk/**`; a block that no longer matches is re-anchored by its quoted comment, never re-typed).
  If FU-7 has not merged when Part A is done, the executor runs the Gate for Part A alone (PR title suffix "(Part A)")
  and Part B becomes a second PR from the same plan.
- **Merging main while other stages land:** before any task that edits `engine.ts`, `truth.ts`, `l2/circ/**`,
  `l2/resp/**`, `vite.config.ts` or `.github/**`, and in the Gate task: `git fetch origin && git merge origin/main`.
  Every edit is a find-and-replace anchored on quoted text that matches EXACTLY ONCE on `origin/main` `0fd5397`; if a
  block no longer matches byte for byte, locate the same statement by its quoted comment and make the same change;
  never re-type a line you are not changing.
- **CI rules (CI amendments 1–4, restated so the executor needs no other document):**
  - `CI=1` for engine tests. Long-run horizons come from `test/helpers/longrun.ts` (never a hard-coded 24 h or 6 h).
  - Any test that can exceed ≈ 30 s wall (in practice every engine test running more than one sim-minute) yields once
    per SIM-MINUTE (`if (t % 60 === 0) await new Promise((r) => setImmediate(r))`).
  - Slow files go in the `SLOW` list of `packages/engine-core/vite.config.ts`. CI runs the slow set as two DISJOINT
    groups: `SLOW_A` (multi-hour drift files, the engine pipeline, the organ soak, the FU-4 clinical suite) and
    `SLOW_B` (every other SLOW entry, derived as SLOW minus SLOW_A). **slow-b ran 37.6 min against its 40 min limit at
    the FU-4 gate (2.4 min margin): every new slow file in this plan joins SLOW_A** (added to both `SLOW` and the
    `SLOW_A` list) or states its measured wall time; the Gate task records both groups' times.
  - Packages that drive a real engine in tests keep the 30 s default budget (amendment 3).
  - Heavy evidence e2e and screenshot scripts run Chromium only; light e2e run on both CI projects (`chromium`, `webkit`).
  - Never `git stash` (the stash is shared across worktrees). Scratch and logs under `<scratchpad>/fu-8-followups/`,
    never bare file names in the repo.
  - Bounded waits: every wait on a background process is an `until` loop of ≤ 10 min that re-checks the PROCESS (not a
    marker line); re-arm it rather than lengthening it.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Engine test:
  `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`; other packages `--filter @pme/renderer`,
  `@pme/skins`, `@pme/controller`, `@pme/demo`, `@pme/validation` (paths relative to the package). Monitor audit:
  `npx -y pnpm@9.15.9 run audit:monitor <scenario…>`; physiology audit: `npx -y pnpm@9.15.9 run audit:physiology`.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Every
  commit message ends with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (swap in your own
  model name if your harness gives another — FU-5 review ruling 9), and every commit is followed by `git push`.
- Gate screenshots ≤ 60 KB each (re-take at `deviceScaleFactor: 0.7` if larger and record it). Cloud executors commit
  only the screenshots their own task owns (`git checkout -- docs/gates` for the rest).
- **Never touch** (other plans own them while in flight): `l2/lung/**`, `l2/resp/**`, `l2/neuro/**`, `l2/gas/**`,
  `l2/co2/**`, `types-lung.ts`, `types-resp.ts` (FU-6/7k/V.1); `l2/pk/**` and `l2/endo/**` in Part A (FU-7);
  `packages/ventilator/**` (V.1); `apps/demo/src/app/**`, `apps/demo/index.html`,
  `packages/controller/src/session/host-session.ts`, `packages/controller/src/panel/styles.ts` (Stage 9);
  `docs/physiology/**` (the orchestrator's); `package.json`, `pnpm-lock.yaml`.

---

## Item inventory (every loose end, and what happens to it)

Decision codes: **task** (a task in this plan: Part A or Part B), **handed** (to a named in-flight plan, reason given),
**Ali** (waiting on Ali — his decision, the model's numbers given), **cal** (left for the R44 calibration pass: a
constant, not a mechanism), **closed** (already done on main; the evidence named), **recorded** (kept as a record, no
action). Numbers in the "measured" column are this writer's measurements on `0fd5397` (seed 7) unless stated.

### A. The FU-5 follow-up list (G-FU4, 2026-09-29 14:10) and the E-FU4-20 pins

| ID | Item | Source | Measured on `0fd5397` | Decision |
|---|---|---|---|---|
| I-01 | F1: in Ali's tamponade PEA the bar keeps a yellow `**ABPm 68<70` while the mean is 19; no red pressure alarm | G-FU4 F1 | `audit:monitor A2-ali-b7`: `ART_M_LOW` raised at 687 s as `**ABPm 66<70`; MAP falls to 19 and the entry's text never changes (`stepAlarms` never rewrites an active entry's `text`). No red pressure alarm: correct per the IntelliVue IFU — the only red pressure alarm is `***<Press> DISCONNECT` (non-pulsatile AND mean < 10 mmHg, [S2] p. 44); at MAP 19 the line shows `ABP NON-PULSATILE` (813 s) | **task A1** (live value in the text; the red half is vendor-correct, no change) |
| I-02 | F2: a filled red `***APNEA` after ROSC in the class IV rig, ventilated, EtCO2 15, lamp dark | G-FU4 F2; `docs/gates/fu-4/3b-classIV-rosc.png` | engine: `apnoea-co2` raised in the arrest (EtCO2 → 0), LATCHED from the first CPR breaths (820 s, awRR 12) and still latched, unacknowledged, at ROSC and 300 s after it — the latched presentation, not a live apnoea. The screenshot predates FU-5's latched style (D2); on `0fd5397` the FU-4 page draws it black with red text, `data-latched="true"` | **closed** (D2); the Gate re-takes 3b |
| I-03 | F3: EXTREME BRADY raise/clear cycles of 3.1–3.6 s in the decaying PEA (Ali's case 948/989/1000 s; the 3 L bleed 956 s) | G-FU4 F3; E-FU4-20 (`fidelity-lowflow` 2 × `it.fails`) | cause found: the QRS detector fires TWICE on every agonal complex (second hump starts 2–4 ms after the first closes, 0.19–0.24 s after R); `observeQrs` skips only doubles < 0.2 s, so the agonal ASYSTOLE hold sees R–R 0.2 s, ASYSTOLE drops to latched, the HR reads 16–25 and EXTREME BRADY raises until the 4 s gap re-lives ASYSTOLE | **task A3** (detector: same-complex merge) — flips both `it.fails` |
| I-04 | F3 (second half): SpO2 LOW PERF 1.0 s cycle at 601 s in the 3 L bleed | E-FU4-20 (`fidelity-lowflow` `it.fails`) | one PI dip to 0.30 at 596 s started a PENDING INOP that the clear hysteresis (0.3–0.4) held for the 5 s delay: raised 601 s, cleared 602 s | **task A2** (the on-delay rule; flips the `it.fails`) |
| I-05 | F4: `fu5-latched` e2e — no induction APNEA because the apnoea now starts 4 s later and the script's BVM at +180 s comes first | G-FU4 F4; E-FU4-20 (`test.fail`) | reproduced (`test.fail` holds on `0fd5397`) | **task A4** |
| I-06 | F5: PI spike when motion ends | G-FU4 F5; G-FU5 ruling 2 (FU-5 open question 22, sent to the calibration queue) | `audit:monitor A7-probe`: motion 120–180 s; at 181–185 s PI 8.21/8.21/8.18/8.23 and PR 81 (rest PI 1.84, PR 75). Not a constant: the motion-artefact "beats" stay in the 5 s PI/PR average, and the restarted detector's first foot lies before the restart | **task A5** (mechanism, so taken out of the calibration queue) |
| I-07 | F6: CVP −1 / −2 … −4 after the exsanguination arrest ("negative chamber volumes") | G-FU4 F6; G-FU5 ruling 3 (sent to the calibration queue) | class IV rig (2.5 L / 600 s, no resuscitation): VSV falls 120 mL under v0Sv when the arrest withdraws venous tone (v0Sv 1917 → 2450 mL), P_sv −3.1; the RV, LV and pulmonary bed then drain to NEGATIVE volumes (VRV −273, VLV −62, VPA −1.2, VPV −6.1 mL at 840 s) through a ≈ 3 mL/s forward leak at a 0.1 mmHg gradient (the passive EDPVR bottoms out at −A); displayed CVP −2.9 → −1.0 | **task A6** (mechanism: a compartment cannot give blood it does not hold; collapsed veins and atria are not under suction) |
| I-08 | FU-4 evidence defect: `5a-burns-sux-sine.png` shows sinus at MAP 90, not the sine wave (captured too early) | G-FU4 | recorded at the FU-4 gate | **task G** (Gate step: re-take with the FU-4 script at the sine phase) |
| I-09 | PEA static S/D spread 6 mmHg vs ≤ 5 (philips-like keeps S/D/M of the flat line) | E-FU4-20 (`fidelity-arrest` `it.fails`) | 27/21 at 6 samples after FU-4: the kept 2 s max/min carries the PEA's residual contraction ripple at the risen rate — real signal, not a device defect | **recorded** (the `it.fails` stays with its number) |

### B. FU-5's own requests and the G-FU5 rulings

| ID | Item | Source | Measured | Decision |
|---|---|---|---|---|
| I-10 | A10-E5: computed-but-untiled numerics `imco2` (FiCO₂/imCO₂), `mac`, `etAa`, `qtc`, and the agent tile | FU-5 R-FU5-6/R-FU5-7; Stage 9 ruling 1 (R-S9-8) | `mac`/`etAa` published by 7f at 1 Hz with no tile (the AGENTS colour key exists); `imco2` drawn only by the legacy pre-skin tiles | **task A7** (AGENTS module tile + imCO2/FiCO2 extra); a `qtc` tile → **Ali** (a layout choice) |
| I-11 | "PR" as the HR-alarm label when the pulse is the HR source (a run-time choice, not a static alias) | R-S9-8 (Stage 9 ruling 1) | `conditions.ts` hard-codes `label: 'Pulse', upper: 'PR'` for every IEC-text skin | **handed to Stage 9** — its E-S9-4 adds the per-skin `alarms.wording` table this needs (one more key); FU-8 does not add a second wording mechanism to the same schema |
| I-12 | R-FU5-9: PI after propofol should RISE (cutaneous vasodilation); the FU-5 `it.fails` "PI after propofol 1.49 → 1.17" and the ventilated rest PI 1.49 vs 1.80 | FU-5 R-FU5-9; Stage 9 declined it (ruling 1) | reproduced: `fidelity-lowflow` 1.49 → 1.17 (−21 %) at 180–240 s; FU-4 did not publish a skin-vessel tone (`grep skinTone` on main: none) | **task B3** (Part B: `circ/model.ts` is FU-6's and FU-7's file too; UNPROTOTYPED, R45 procedure) |
| I-13 | HR numeric alternates "0" (valid) and "-?-" every 3–7 s under a standing ASYSTOLE with agonal beats | new (found while measuring I-03) | Ali's case 936–1100 s, before and after Task A3 | **Ali** (D-section: what his IntelliVue shows in an agonal rhythm) |

### C. Stage 9's requests (R50-fixed plan on `origin/review/stage-9-plan` a01263b)

| ID | Item | Source | Decision |
|---|---|---|---|
| I-14 | R-S9-1(a): the sweep restarts when a view change resizes the monitor | Stage 9 R-S9-1; ruling 3 accepted it for v1.0 | **task A17** (backfill one lane-width) |
| I-15 | R-S9-1(b): an `aria-label` hook on the monitor canvas and a "read vitals" summary string | Stage 9 R-S9-1 | **handed to Stage 9** — the app already labels its host element and holds the glossary the summary must use (R56); the renderer's `measurement` events carry every value |
| I-16 | R-S9-1(c): the saadat-like idle message bar (#E0E0E0 slab, the brightest object on a quiet screen) and the projector-light NIBP grey (3.45:1) | Stage 9 R-S9-1 ("skin data, Ali's call") | **Ali** (the saadat bar is vendor fidelity; see "Waiting on Ali"); the projector-light NIBP grey (3.45:1 → ≥ #6B7482 proposed) is a theme choice Stage 9 also called "Ali's call" |
| I-17 | R-S9-2(a): `describe`/`describeTransition` print engine ids (`etco2 ≥ 20 → rosc`) | Stage 9 R-S9-2 | **task A15** |
| I-18 | R-S9-2(b): `BUILTIN_SCENARIOS` registers 5 of the 11 scenario documents | Stage 9 R-S9-2 | **task A15** |
| I-19 | R-S9-2(c): the 6a drawer disables Pin/Release outside MODELED with the stale tooltip "Pin and release need MODELED mode (Stage 7)"; `vocabulary.ts:18` says the same | Stage 9 R-S9-2 (R50 review F9) | **task A15** (the wording; the MODELED gating stays 6a's choice) |
| I-20 | R-S9-4: `pme-scenario/1` optional `category`, `story`, `objectives[]`, `durationMin`; state `label` required | Stage 9 R-S9-4 | **task A16** (label: a validator warning, not required — D14) |
| I-21 | R-S9-6: a sensor-state map in the 1 Hz `state` event | Stage 9 R-S9-6 | **task B2** (Part B: assembled in `engine.ts`, which FU-6/FU-7 edit; UNPROTOTYPED) |
| I-22 | R-S9-3: ΔP, Ppeak, PL, Cdyn, auto-PEEP, VD/VT, volumes and loops on truth paths | Stage 9 R-S9-3 | **handed to 7k** (its scope, R57) |
| I-23 | R-S9-5: the user guide follows the app's views | Stage 9 R-S9-5 | **handed to 8b** (release docs) |
| I-24 | R-S9-7: glossary entries for the FU-4/V.1/FU-6/FU-7 truth leaves | Stage 9 R-S9-7 | **handed to Stage 9** (its own Task 0 does it; `GLOSSARY_S9` is Stage 9's file) |

### D. The review-pack writer's defect list ("Ali's review pack DELIVERED", 2026-09-28 22:20)

| ID | Item | Measured | Decision |
|---|---|---|---|
| I-25 | Insulin infusion reference possibly units/h vs units/kg/h (pack DR-44/DP-44) | row `insulin`: `gammaPk(10, false, 1800, 14400, 0.1 / 60)` with `perKg` false: 0.1 units/kg/h (7 units/h at 70 kg) = 70 reference rates → glucose −118 mg/dL (the E_max) and K 4.18 → 2.88 in 60 min | **task B1** |
| I-26 | Every dose behaves as IV; the route is ignored | `PkRoute` has 8 values; `validatePkCommand` never reads `route` (116 `iv` and one `neb` dose in the repo; nebulised salbutamol 10 mg = 40 IV reference doses) | **task B1** (route explicit; non-IV routes the PK cannot model are refused or flagged — no new absorption model) |
| I-27 | No per-drug maximum anywhere | the review pack's dosing-preset table (DP-01…DP-64) proposes caps; the engine has none | **task B1** (a documented maximum-dose WARNING field, no silent clamp); the VALUES are Ali's (DP table) |
| I-28 | An infusion of a curve-based drug without an infusion reference is accepted and has no effect (21 of 26 curve rows) | pack "Dosing presets" preamble; e.g. an amiodarone infusion is accepted (`infTarget` 0) and does nothing | **task B1** (refused with a reason, not silently ignored) |
| I-29 | The amiodarone row claims AF → sinus conversion; no rhythm hook exists (DR-36) | `hooks.ts` converts for adenosine, LAST and magnesium only | **handed to FU-7** Task 11 (wires the amiodarone/procainamide/lidocaine conversion hazards; Task 11 also corrects the row's `onset` text so it claims only what the hook does — `λ_amio_vf = 0`) |
| I-30 | FU-7 says 19 instant-onset drugs; its own analysis gives 25 | plan text | **handed to FU-7** (a plan-text fix before its executor starts; no code) |
| I-31 | Monomorphic VT 170/min keeps a pulse with a higher pressure (142/98) than sinus (124/79) | MODELED 40 y, 90 s after the switch: sinus MAP 96 (123/81), SV 81, CO 5.9; VT 170 MAP 97 (114/87), SV 33, CO 5.4 (−8 %); VT 150 MAP 104, CO 6.5 (+10 %); sinus tachycardia 170 MAP 104, CO 6.3; VT 200 no ejection. MANUAL VT 170: MAP 89 → 44 at 90 s | **cal** + **Ali** (D10) |
| I-32 | The agonal rhythm ignores its rate setting | `onAgonal`: R–R = 3 + 4.5·U s whatever the rate — 11.4/min at every `rateBpm` 4…24 (8/min on the pack's strip) | **task A8** |
| I-33 | The 12-lead printout's HR and axis are unreliable in arrest ("asystole reads HR 120") | `capture12` R peaks = local maxima above 60 % of the strip's maximum: asystole HR 93 / axis 90°, P-wave asystole HR 25, coarse VF 49, fine VF 65, agonal 20 | **task A9** |
| I-34 | The oliguria flag has no owner (fires too early) | `organs` event `kidney.oliguria` = `uopOver(60 min) < 0.5` on a window that is not yet full: 1.75 L bleed from 60 s → flag at 508 s (the INSTANTANEOUS rate 0.50), off at 600 s (one 10-min bin, 0.83), on again at 1200 s (two bins) | **task A10** (the flag waits for a full window, the rule the AKI stage already uses) |
| I-35 | The neonatal profile is broken; no owner | MODELED spontaneous, 600 s: term neonate 3.5 kg MAP 82–89 (set point 45), SV 1.0–1.1 mL, CO 0.15 L/min (≈ 43 mL/kg/min vs ≈ 200); ventilated neonate HR 199–214; infant 7 kg MAP 98–105 (set 55), CO 0.45–0.48 (≈ 67 mL/kg/min vs ≈ 150); child 20 kg MAP 100–105 (set 68), CO 1.6 (82 mL/kg/min vs ≈ 150). Cause: `profile.ts` scales every circuit parameter ISOMETRICALLY (×W/70, the tables' §2.2 rule), so a child gets an adult per-kg cardiac output against adult-sized resistances ×70/W — the whole paediatric circulation, not only the neonate | **task A11** (pin with `it.fails` and numbers) + **Ali** (the §2.2 scaling rule is a parameter-table decision: allometric, W^0.75) |
| I-36 | "The library has 58 drugs, not 52" (a count in the docs) | docs text | **handed to 8b** (release docs; `docs/physiology/**` is the orchestrator's) |
| I-37 | 7g gate questions Q51/57/60 collide with the tables' §9 numbering | docs text | **handed to the orchestrator** (docs renumbering; no code) |

### E. The calibration queue: mechanism defects vs constants (R44)

| ID | Item | Decision |
|---|---|---|
| I-38 | R → radial upstroke 95–106 vs 145–190 ms; dicrotic notch 258–284 vs 360–518 ms (7a elastance activation T_a, transport delay) | **cal** (constants of a correct mechanism) |
| I-39 | PPG ↔ ABP shape r 0.4–0.5 vs 0.9 | **cal** (pleth kernel shape parameters) |
| I-40 | Haemorrhage reflex under-response in the 8a scenarios (class II/III/IV HR 82/107/134) | **closed by FU-4** (class IV HR 184 → 91 before PEA, humoral arm, review pack A6); the 8a rows are re-measured by 8b's validation report |
| I-41 | Propofol MAP 85 vs 64 (NR-7g-1) | **closed by FU-4** (S1 −23 %; S1b/S6a Ali's Q1) |
| I-42 | Massive PE scenario EtCO2 38 vs 20–25, PAP 24, SpO2 100 ("the scenario likely sends only the circ condition — check the document") | **closed by FU-4** — t12's `condition pe` reaches 7b through `circ/aliases.ts` (circ + lungCondition); the residual rows are 8b's validation report and A20's factor (Ali) |
| I-43 | PR interval 217 ms, MH EtCO2 73.5, Edmark apnoea ≈ 20 % long, tamponade PAWP 22.4, CPR EtCO2 16.3, O1 vs Pulse | **cal** |
| I-44 | CVP alarm default; `patient.profile` in `pme-scenario/1`; PWDB fetch | **closed by FU-3** (Tasks 8, 10–11); PWDB is Ali's by hand |
| I-45 | 7c water-balance drift behind the 24 h soak failure (urine 2.68 % vs ±2 %) | **cal** (G-FU4 ruling on item 27) |
| I-46 | Bezold–Jarisch reflex (not modelled) | **recorded** (G-FU4: withdrawn, not modelled; v1.1) |
| I-47 | HPV potentiation by acidosis and a mixed-venous PO2 term | **handed to 7k** if its scope takes lung vascular terms, else **cal** (a new lung term, not a defect of an existing one) |
| I-48 | CVP −1 in the low-flow screenshot (G-FU5 ruling 3) and the PI spike (G-FU5 ruling 2) | moved OUT of the calibration queue: they are I-07 and I-06 (mechanisms) |

### F. The CM comorbidity coverage audit (`research/19-coverage-comorbidity.md`, 69 cells on `0fd5397`; added by the orchestrator 2026-09-29)

| ID | Item | Source | Decision |
|---|---|---|---|
| I-49 | C3 (P1): fast AF 150/min kills a healthy 40 y heart (kIsch → 0, agonal +15.5 min, asystole +18 min; sinus 150 is fine) — LVEDP is sampled while the ventricle is still contracting on short beats (`circ/model.ts:396` → `coronary.ts:142`) | research/19 §3 C3; orchestrator: Part A, FU-7 needs it first | **task A12** (Part A; `circ/model.ts` overlaps FU-6/FU-7 on OTHER lines — declared) |
| I-50 | C2 (P1): the ST-depression timer never fires in 3-vessel CAD at HR 110 (needs 45 unbroken s above δ 0.1; resets on any dip; longest run 3 s) (`coronary.ts:180–181`) | research/19 C2 | **task A13** (Part A) |
| I-51 | C4 (P1): obesity sized twice — circulation BV 8.89 L (70 mL/kg total weight, CO ×1.85) vs blood/gas 6.5 L; the lung `obesity` condition on top of the profile halves the Benumof apnoea time (2.7 → 1.43 min) | research/19 C4 | **task A14** (Part A: ONE body-size resolver for the circulation, tables §1.3); the lung half → **handed to FU-6** (R4 re-tunes the obese apnoea on the one definition; Ali Q3 decides profile vs condition) |
| I-52 | C5: profile targets disagree with the reflex set point (untreated HTN MAP +13 vs +20; HFrEF MAP 87 / LVEDP 14 vs 75 / 15–20; 80 y MAP 110.6 vs 90–100) | research/19 C5 | **task A15** (Part A: the targets derive from the set point — one number per profile) |
| I-53 | C12: `setRhythm` silently accepts and drops unknown `opts` keys (a pacemaker fault works only under `opts.pacer`) | research/19 C12 | **task A16** (Part A: validate `RhythmOpts`, reject unknown keys with a reason) |
| I-54 | C1: chronic disease does not change the propofol fall (≈ −20 % in healthy, 80 y, HTN, AS+CAD, HFrEF, PH) — no disease-dependent resting sympathetic tone for propofol to remove (`baroreflex.ts:151–158`); the mechanism behind Ali's Q1 conflict and FU-4's S14 `it.fails` | research/19 C1 | **task B4** (Part B, prototyped with numbers; flagged for Ali's review BEFORE execution) |
| I-55 | C8: PH too mild (PVR 5.9 vs 10 WU "severe"; ×3 whatever the grade), no RV ischaemia at induction, noradrenaline and phenylephrine give the same PAP/SAP ratio | research/19 C8 | the grade IS ignored (`profile.ts` `ph`: PVR × 3 at every grade) — a data defect: **task A18** (the tables' 3/5/10 WU; UNPROTOTYPED; `profile.ts` is FU-7's E-FU7-3 file); RV ischaemia on induction follows C1 (task B4); the pressor rows' pulmonary arms → **handed to FU-7** (Task 17 re-fits those rows); iNO → **Ali** (a new drug) |
| I-56 | C9: HFrEF's weak response to hydralazine (SV +3.5 %, SVR −15 %) and to fluid (no flooding) | research/19 C9 | hydralazine size → **handed to FU-7** (Task 17 takes CM-06e as its check, research/19 §4 item 2); lung water reaching gas exchange → **handed to 7k** (7b diffusion/shunt from EVLWI); the SV-per-SVR sensitivity → **cal** + Ali Q10 |
| I-57 | C10: missing profiles (CKD, diabetic autonomic neuropathy, OSA, cirrhosis; the liver-failure stand-in leaves CO/SVR unchanged) | research/19 C10 | **Ali** (v1.0 vs v1.1 scope; not built) |
| I-58 | Stage 9 items: the scenario schema has no `endo` block; there is no posture input | research/19 §5 Stage 9 | `endo` → folded into **task A11** (R-S9-4 schema); posture → **Ali** (a new input: v1.0 or v1.1; CM-02e) |
| I-59 | C6 elderly closing capacity; C7 COPD normocapnic; C11 smaller gaps (COP at albumin 25, IAP renal, cirrhotic glucose, CKD diuresis, elderly bleed tachycardia, INR) | research/19 C6, C7, C11 | **handed**: C6 → 7b/FU-6 (apnoea work), C7 → FU-6 (the drive's `paco2Set`), C11 → their owners (7c COP, RH-06 IAP, 7e glucose, 7d CKD, 7a baroreflex, 7i INR) as listed in research/19 §3 |
| I-60 | research/19 §4 findings for FU-7 (dobutamine measure-first, hydralazine HFrEF cell, esmolol re-measure, the surge's hypertensive arm, AF rigs after C3, Task 9 as C1's home, E-FU7-3 widening, diabetic dexamethasone arm, bronchial reactivity, `ventRemiEq` for OSA) | research/19 §4 | **handed to FU-7** (its fixer/executor reads §4; C3 lands in FU-8 Part A first, as the orchestrator ruled) |

---

## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — F1 is half a defect (I-01).** The IntelliVue has no red pressure-LIMIT alarm: its only red pressure alarm is
  `***<Press> DISCONNECT` (non-pulsatile AND mean continuously < 10 mmHg, [S2] IFU p. 44), which FU-5 built. At MAP 19
  the correct monitor shows the yellow `**ABPm` limit alarm, `ABP NON-PULSATILE` and (once the rhythm stops) the red
  arrest alarm — which is what the engine shows. The defect is the TEXT: research/05 §2.4 ([S2]) "the message shows
  **SpO2 94<96 (deviation and limit)", i.e. the value now; the manager froze it at the raise. It also printed the
  skin's DEFAULT limit after a `setLimit` (the comparison used the edited limit, `limitText` the profile's) — fixed in
  the same task. The text update re-emits `alarmStatus`, never a second `raised` event.
- **D2 — F2 is a screenshot artefact (I-02).** `docs/gates/fu-4/3b-classIV-rosc.png` was committed at 88fdb2c
  (2026-09-29 05:55), BEFORE FU-5 merged into the FU-4 branch (b13837c, 06:41): it shows the pre-FU-5 renderer, which had
  no latched style. Measured on `0fd5397` with the same page and script (Playwright, ×4): after ROSC the APNEA is
  `data-latched="true"`, black bar with red text, rotating with the live yellow alarms; the lamp follows the live
  yellows. The engine side is right too: `apnoea-co2` is raised in the arrest (no CO2 reaches the sampling line) and
  latched from the first CPR breaths; IntelliVue #H30 latches red visually until acknowledged. No code change; the Gate
  re-takes 3b (and 5a, I-08) on the FU-8 tree.
- **D3 — F3's cause is the QRS detector, not the declaration logic (I-03).** Every agonal complex (QRS ≈ 300 ms) was
  detected TWICE: its MWI hump closes (falls below 60 % of its maximum) and re-opens 2–56 ms later; in every other
  library rhythm the next hump starts ≥ 136 ms after the previous close (measured: vtPoly 220/min 136 ms, torsades 148,
  VT 250/min 146, AF 180/min 166, sinus tachycardia 200/min 188; idioventricular, CHB and paced ≥ 714). Two fixes, both
  prototyped: (a) the detector merges a hump that starts < 100 ms after the previous close into the same complex
  (`SAME_COMPLEX_N`); (b) the alarm inputs' agonal hold counts a detection within 0.35 s of the last COUNTED one as the
  same complex, pairwise (a real rhythm > 170/min still ends the hold). (b) is needed because the merge misses a
  minority of late-decay complexes whose second hump opens > 100 ms after the close (seen once Task A6 makes the agonal
  rate honest: `fidelity 4b` raised EXTREME BRADY at 167 s with (a) alone). The LOW PERF 1.0 s cycle (I-04) has a
  different, alarm-layer cause: the clear hysteresis held a PENDING LOW PERF (`holdingId` includes `pending`), so one
  PI dip to 0.30 raised it 5 s later and it cleared at once — the same bug FU-5 Task 9a fixed for limit alarms (the vendor
  on-delay: a condition that resolves within the delay raises nothing); LOW PERF now uses `raisedLiveId`.
- **D4 — F5 is a mechanism (I-06).** When a motion episode ends the oximeter restarts its pulse search: the pleth
  wave-numerics drop the beats detected on the artefact, and a beat whose opening foot precedes the restart is not
  averaged (the restarted detector's zero-filled history put the first foot before the restart). Taken OUT of the
  calibration queue (G-FU5 ruling 2 had sent it there before its cause was known).
- **D5 — F6 cannot land without a ruling (I-07).** The defect is real and diagnosed: a ≈ 3 mL/s forward leak at a
  0.1 mmHg gradient drains the RV, LV and pulmonary bed to NEGATIVE volumes, because the passive pressures bottom out
  (EDPVR → −A; linear atria and pulmonary compliances) and nothing stops a compartment giving blood it does not hold.
  Four mechanisms were prototyped on the class IV / exsanguination rigs (numbers in "Prototype results"); the best
  (Option D: an outflow limiter — a flow out of a compartment × min(1, V/5 mL) — plus collapse floors on the veins and
  atria) removes every negative volume, shows CVP 0.2 after the arrest and keeps FU-4's "CPR alone after exsanguination:
  no pulse" (CoPP 3.4–4.4), but moves two FU-4 rows that were fitted on the defective circuit: the class IV ROSC with
  2 L + adrenaline goes from +113 s to +261 s (band ≤ 180 s) and 10 min of VF CPR reaches kIsch 0.91 (band < 0.9). R45
  forbids breaking a passing band without a ruling, so Task A5 pins the defect (`it.fails` with the numbers), records the
  four mechanisms, and Option D waits for the orchestrator (Open question 1).
- **D6 — the agonal rate (I-32).** R–R = 60 / the rhythm's rate × (1 ± 0.25·U), never under 3 s (< 20/min, research/03
  §1.5). One uniform draw per beat as before, so no other RNG stream shifts. FU-4's PEA decay requests
  `agonal` at `PEA_IDIO_RATE` 24, which `rhythmRate` clamps to the rhythm's 20: the idioventricular phase now runs at
  ≈ 18.8/min instead of 11.4 (FU-4's asystole hazard is per second, not per beat, and is unchanged).
- **D7 — the 12-lead printout counts QRS complexes with the monitor's own detector (I-33).** `capture12` runs
  `l3/qrs.ts` over the 20 s pre-roll and the window on lead II (both 500 Hz): asystole and P-wave asystole print "HR --,
  axis --"; sinus, VT, AF and CHB are unchanged within 1/min. VF prints the detector's count (coarse 191, fine 51): what a
  printout shows in VF is Ali's D3 question ("HR numeric during VF"), not changed here.
- **D8 — the oliguria flag needs measured urine (I-34).** The flag requires at least one completed 10-min urine bin; the
  first 10 min no longer fall back to the instantaneous rate. A full-hour window (the KDIGO wording) was prototyped and
  REJECTED: it breaks 7d's `organs-renal` acceptance (tables 17a: the flag 30 min into a MANUAL haemorrhage). The window
  length for teaching is Ali's TQ40.
- **D9 — the paediatric circulation is pinned, not refitted (I-35).** The measured cause is the tables' §2.2 isometric
  scaling rule (volumes ×W/70, resistances and elastances ×70/W), a parameter-table decision (R44, Ali). Task A9 adds the
  textbook targets as `it.fails` with the numbers; the refit waits on Ali's scaling decision (allometric W^0.75 or a
  per-band parameter set).
- **D10 — VT haemodynamics are a calibration item (I-31).** Every mechanism the review pack names is present: loss of AV
  synchrony (the dissociated atria contract at their own rate, `circOnAtrial`), rate-dependent filling (the time-varying
  elastance fills for the diastole it gets) and dyssynchrony (`Emax × 0.85` and the `k_rhythm` efficiency 0.6 → 0.2 over
  150–200/min). The sizes are [ENG] constants. Measured on `0fd5397` the pack's "142/98 above sinus" is gone after FU-4
  (VT 170: MAP 97 vs 96, CO −8 %), but VT 150 still RAISES the output (+10 %). The target size is Ali's; the constants are
  the R44 pass's (listed under "Waiting on Ali").
- **D11 — the drug-library items are Part B.** FU-7 rewrites `l2/pk/row.ts`, `pipeline.ts`, `combine.ts` and every
  `data/rows-*.ts`; each Part B task is written against `0fd5397` and re-anchored in Task B0 on the merged tree. Route:
  no absorption model is built; a row declares the routes the engine can honour (`iv`, `io`, `central` for every
  injectable; `neb` for salbutamol, where 7c's K-shift acceptance uses it) and every other route is REFUSED with a
  reason. Maximum dose: a documented `maxDose` field and a `drugWarning` event — never a clamp; values only where the
  row's own `doses` text states a sourced maximum, the rest wait on Ali's dosing-preset table (DP-01…DP-64).
- **D12 — who owns the Stage 9 requests.** Stage 9's R50-fixed plan keeps R-S9-1(a) as a v1.0 limit (ruling 3) and
  declines R-FU5-9 and R-S9-8 to FU-5's follow-up. FU-8 takes R-S9-2 (controller), R-S9-4 (schema) and R-S9-6 (the
  sensor map, Part B: `engine.ts`); the scenario TEXT for `category`/`story`/`objectives` is Stage 9's (its
  `scenario-meta.ts` drafts move into the documents when Stage 9 executes; Ali's Q15 approves them).

- **D13 — C5 is taken for the age bands only (I-52).** Centring every profile's targets on its set point was prototyped
  first: it broke 7d's check-18 rig (75 y HTN, MANUAL baseline 140/80: CBF at MAP 65 71.8 % vs < 68 %, hypocapnia
  0.432 vs ≤ 0.40) and moved the elderly 140/80 to 138/78. The landed rule centres the BAND (neonate … adult; the adult
  is bit-identical) and keeps the elderly 140/80 and the conditions' deltas (HTN +15/+5, HFrEF 105/65). The HTN
  (+13.4 vs +20), elderly (110.6 vs 90–100) and HFrEF (86.6 vs 75) rest pressures go to Ali with those numbers.
- **D14 — a state label is recommended, not required (I-20).** Requiring it in the schema failed 10 controller tests and
  would refuse external documents without labels (8a's sanity documents). The validator warns; the eleven built-in
  documents already label every state.
- **D15 — C1 is prototyped and NOT in Part A (I-54).** A profile-dependent tonic sympathetic share τ of resting SVR
  (adult 0.2, elderly 0.3, + 0.1 untreated HTN, + 0.25 HFrEF) that an anaesthetic's delivered-output factor removes:
  `svrF = 1 − τ·(1 − outF) + outF·(reflex)`, bit-identical at rest. Propofol 2 mg/kg nadir: healthy −22.5 → −29.9 %,
  80 y −23.4 → −37.2, HTN 60 y −22.5 → −35.0, 80 y HTN −21.9 → −42.9, HFrEF −21.6 → −42.7. It is the mechanism behind
  Ali's Q1 conflict and FU-4's S14 `it.fails`, it moves every propofol row, and the τ sizes are [ENG]: Task B4 carries it,
  flagged for Ali's review BEFORE execution (orchestrator's instruction).

## Prototype results (before → after; seed 7; `origin/main` `0fd5397`; every task's code run in `<scratchpad>/fu-8/wt`)

| Item | Rig | Before | After |
|---|---|---|---|
| I-01 F1 | MANUAL MAP ladder 100 → 13 (A1-map-ladder) | `**ABPm 60<70` frozen from the raise | text follows the tile on every one of 470 rows (gap 0 mmHg); one `raised` event |
| I-01 F1 | FU-4 page, class IV + CPR + 2 L + adrenaline | `**ABPm 252>110` shown 13 s after the mean was back near 120; `**etCO2 4<30` at EtCO2 15 | (same fix) |
| I-03 F3 | `fidelity-lowflow` Ali's case / 3 L bleed | EXTREME BRADY 3 cycles (3.1–3.6 s) / 1 cycle (3.6 s) | 0 / 0 — both `it.fails` pass |
| I-03 F3 | agonal detections, MANUAL 300 s | 2 detections per complex (0.14–0.24 s apart) | 1 per complex; no HR reading > 25/min in 270 s |
| I-04 | `fidelity-lowflow` 3 L bleed, technical | LOW PERF raised 601 s, cleared 602 s | none — the `it.fails` passes |
| I-06 F5 | MANUAL motion 120–180 s | PI 8.21/8.21/8.18/8.23 and PR 81 at 181–185 s | PI -- at 181, then 1.95/1.99/2.00/1.91 (rest 1.85); PR 75 |
| I-07 F6 | class IV 2.5 L, no resuscitation | VRV −273, VLV −62, VPA −1.2, VPV −6.1 mL; CVP −2.9 → −1.0 | Option D: all volumes ≥ 0 (VRV 76, VLV 19.5), CVP 0.2 — NOT landed (D5) |
| I-07 F6 | Option A (venous floor only) | — | CPR alone after exsanguination regains a pulse at +115 s, RA −100 … −180 mL, CoPP up to 150 (fails G-FU4-1) |
| I-07 F6 | Option B (+ atrial floor) / C (+ inlet waterfall) | — | RA −3 900 mL / RV −855 mL (both fail) |
| I-07 F6 | Option D limiter only | — | CVP −3 (venous suction left), class IV ROSC +255 s |
| I-07 F6 | Option D in full, FU-4 rows | class IV ROSC +113 s; VF CPR kIsch max < 0.9; S13 CoPP 25.1–28.8; exsanguination 3 L → +180 s | +261 s (band ≤ 180); 0.91; 24.9–28.0; all volumes "no pulse" |
| I-32 agonal | MANUAL, 300 s | 11.4/min at every rateBpm (4, 8, 12, 20, 24) | 4 → 3.8, 8 → 8.0, 12 → 12.0, 20 → 18.8, 24 (clamped 20) → 18.8/min |
| I-33 12-lead | MANUAL, capture 40 s after the switch | asystole HR 93 / axis 90°; P-wave asystole 25; agonal 20; coarse VF 49; fine VF 65 | asystole and P-wave asystole HR --/axis --; sinus 75 → 76 (unchanged); VT 170 → 170; AF 100 → 99; VF 191 / 51 (Ali D3) |
| I-34 oliguria | MODELED 1.75 L / 10 min from 60 s | flag 508 s (instantaneous 0.50), off 600 s, on 1200 s | first flag 1200 s (hourly 0.49); never before 600 s; `organs-renal` (7d) unchanged |
| I-35 paediatric | MODELED spontaneous, 600 s | (defect measured, see I-35) | pinned (`it.fails`) |
| engine fast set | `CI=1 PME_TEST_SET=fast` on the prototype (Tasks A1–A3, A6–A8) | 266 files / 1 194 | 1 193 passed, 1 skipped; one declared fixture re-record (`nan-guard` agonal hash 6142c308 → d9075744, darwin) |
| I-05 F4 | `fu5-latched.e2e.ts`, Chromium | no APNEA on either skin (`test.fail`) | philips-like live 191–216 s, latched 217–457 s; saadat-like live 188–215 s, then none; 2 passed in 3.9 min |
| I-49 C3 | research/19 CM-15c / CM-15b (the CM scripts against the prototype) | kIschMin40 0, mean 0.19, 123 negative-CoPP samples, SV 9.8 mL, MAP 44, agonal +15.5 min; CM-15b agonal +10 min | kIschMin40 0.80, mean 0.90, 24 samples, SV 31.1, MAP 96.3, no arrest in either arm; CM-15b no arrest |
| I-49 C3 side effect | `circ-hypoxic-arrest` (FU-3) | asphyxial PEA +6.35 min (τ 300) | τ 300: no arrest in 20 min; τ 200 +9.82, 220 +10.58 (all 8 pass with the rig at 24 min), 240 +11.33 min |
| I-49 C3 | FU-4 clinical suite on the prototype | — | unchanged: S13 CoPP 25.1–28.8, CPR alone no pulse (CoPP 2.9–3.6), class IV ROSC +119 s, 3 L +180 s, 3.5 L +170 s |
| I-50 C2 | 3-vessel CAD (CFR 1.4), 65 y, HR held 130, 10 min | kIsch 0.65, ST 0.00 mV | kIsch 0.67, ST −0.21 mV; healthy 65 y at 130: no ST; HR 110: kIsch 0.85, ST 0 (on the threshold; Ali Q6) |
| I-52 C5 | MODELED spontaneous, 600 s | neonate MAP 82–89, CO 0.15; infant 98–105, 0.47; child 100–105, 1.64; ventilated neonate HR 199–214 | neonate 64, 0.31; infant 62, 0.60; child 79, 1.72; ventilated neonate HR 152; adult, elderly, HTN, HFrEF targets bit-identical |
| I-51 C4 | 127 kg / 175 cm ventilated, 300 s | BV 8 890 mL, CO × 1.85 (9.68 L/min) | BV 6 475 mL, CO 7.20 vs 5.34 (× 1.35 — the tables' value); no height given: unchanged |
| I-53 C12 | `setRhythm pacedVVI { fault, faultRate }` | accepted, no effect | refused: "opts: unknown keys fault, faultRate (known: …)"; under `opts.pacer` accepted |
| I-17/18 R-S9-2 | controller | `etco2 ≥ 20 → rosc`; 5 built-ins | the host's words through a Labeller; transition targets by state label ("→ Coarse VF"); 11 built-ins; controller 222 tests |
| I-20 R-S9-4 | controller | no card fields, no `endo` | category/story/objectives/durationMin/`patient.endo` validate; an unlabelled state warns |
| I-14 R-S9-1a | `SweepLane` first frame | 1 sample back (blank lane) | the last 3.84 s (1 921 samples at 500 Hz on a 400 px lane) redrawn at once |
| I-10 A10-E5 | renderer | no agent tile; imCO2 undrawn | AGENTS module tile (EtAA 2.0 %, MAC 1.0) while 7f publishes; CO2 tile "awRR 12  imCO2 0"; skins 179, renderer 89 tests |
| I-25 B1 | insulin 0.1 units/kg/h, 60 min | infTarget 70, glucose −118, K −1.3 (2.88) | infTarget 1.0, glucose −60, K −0.6 (3.47) |
| I-26/28 B2/B4 | dose events | every route accepted as IV; amiodarone infusion accepted, no effect | IM adrenaline refused with the reason; IO/central accepted; nebulised salbutamol accepted (declared); amiodarone infusion refused |
| I-27 B3 | lidocaine 3 + 2 mg/kg | nothing | one `drugWarning` "cumulative 350 mg exceeds the maximum 315 mg"; both doses given |
| I-54 C1 | propofol 2 mg/kg nadir (5 profiles) | −22.5 / −23.4 / −22.5 / −21.9 / −21.6 % | −29.9 / −37.2 / −35.0 / −42.9 / −42.7 % (healthy / 80 y / HTN 60 y / 80 y HTN / HFrEF) — Part B, Ali first |

## Exceptions (edits outside a task's own partition; each needs the orchestrator's approval at review)

- **E-FU8-1** (Task A2): `packages/engine-core/test/engine/fidelity-lowflow.test.ts` (FU-5/FU-4) — three `it.fails` flipped
  to `it`, titles re-stated with the after-numbers; no assertion changes (R45: pre-declared pins flipping).
- **E-FU8-2** (Tasks A15, A16): controller tests — `builtins.test.ts` (the list pin grows from five to eleven ids),
  `panel/scenario-tab.dom.test.ts` (a transition names its target by the state label: "→ Coarse VF"), `schema.test.ts`
  (the fixture's states gain labels, because an unlabelled state now warns). Pins of lists and text, not bands.
- **E-FU8-3** (Task A7): `packages/renderer/test/fu5-tiles.test.ts` (FU-5) — the philips-like CO2 extras line gains
  `imCO2 0`.
- **E-FU8-4** (Task A10): `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` (FU-3) — the asphyxia rig runs 24
  min instead of 20; and the declared re-fit of the [ENG] `TAU_HYP_S` 300 → 220 s by scan (the FU-4 D3 precedent).
- **E-FU8-5** (Task A4): `apps/demo/src/stage7f.ts` (7f's page: a `?bvmAt=` parameter, default unchanged) and
  `apps/demo/e2e/fu5-latched.e2e.ts` (FU-5: `test.fail` removed, the page opened with `&bvmAt=210`).
- **E-FU8-6** (Task A6): `packages/engine-core/test/l2/ecg/nan-guard.test.ts` (FU-4) — the `agonal` entry of the pre-guard
  schedule fixture re-recorded (6142c308 → d9075744 on darwin); every other rhythm's hash untouched.
- **E-FU8-7** (Task B4, only if Ali accepts C1): `packages/engine-core/src/l2/circ/baroreflex.ts` (FU-4's file; FU-7's
  Request 2 keeps it FU-4's) — the `tonic` gain and two effector lines.
- **E-FU8-8** (Task G): `apps/demo/scripts/fu4-shots.mjs` (FU-4) — scenario 5's first shot waits for the sine-wave rhythm
  instead of a fixed +200 s, for the re-take of `5a-burns-sux-sine.png` (I-08).

## Handed to (items another plan owns, with the reason)

| To | Items | Reason / what they need to do |
|---|---|---|
| **FU-7** (plan untracked, executes after FU-6) | I-29 amiodarone's row claims a conversion hook; I-30 the onset count 19 vs 25; I-55 the pressor rows' pulmonary arms; I-56 hydralazine in HFrEF (CM-06e); I-60 research/19 §4 items 1–10 | Task 11 wires the amiodarone/procainamide/lidocaine conversion hazards (and should reword the row's `onset` to what the hook does, `λ_amio_vf = 0`); the onset count is a plan-text fix; Task 17 re-fits the pressor and vasodilator rows. **FU-7 Task 0 must also re-anchor on FU-8 Part A:** `profile.ts` (Tasks A12, A13, A18 — FU-7 Task 8 edits it under E-FU7-3), `engine.ts` (A14) and `vite.config.ts` (A0); FU-8's C3 (A10) lands first, as the orchestrator ruled, so FU-7's AF rigs run on a heart that does not fail |
| **FU-6** (READY, after V.1) | I-51's lung half (the obese apnoea: profile FRC alone 2.7 min vs + the lung `obesity` condition 1.43 min); research/19 C6 (elderly closing capacity), C7 (COPD `paco2Set`) and the §5 FU-6 list | R4 re-tunes the obese apnoea on ONE obese patient — FU-8 Task A13 defines the circulation's (adjusted weight, Lemmens BV); which of profile or condition carries the lung is Ali's Q3. `vite.config.ts`: both plans add SLOW entries — keep both |
| **7k** (being written) | I-22 (R-S9-3 mechanics truth paths); I-47 HPV acidosis/mixed-venous term if its lung-vascular scope takes it (else calibration); I-56 lung water reaching gas exchange (research/19 C9) | its R57 scope; FU-8 changes no lung file |
| **Stage 9** (R50-fixed plan on `origin/review/stage-9-plan`) | I-11 "PR" as the pulse-sourced HR-alarm label; I-15 the aria/read-vitals summary; I-24 (R-S9-7 labels); the card TEXT for `category`/`story`/`objectives` (its `scenario-meta.ts` drafts move into the eleven documents); glossary entries for FU-8's new visible keys | I-11 needs exactly the per-skin `alarms.wording` table Stage 9's E-S9-4 adds (one more key); the app owns its a11y strings and the glossary (R56). After FU-8: delete `app/describe.ts`/`triggers.ts` copies and pass a `Labeller` (A15); the "sweep restarts on a view change" limit in its gate note and user guide is gone (A17); show `drugWarning` events in the drug panel (B1); new labels: EtAA tile, `drugWarning`, the `sensors` map (B2), ST |
| **8b** (release) | I-23 (R-S9-5 user guide); I-36 "58 drugs, not 52"; release notes | the notes list: `setRhythm` refuses unknown option keys (A14), drug routes other than IV/IO/central refused and curve-row infusions refused (B1), the `drugWarning` event, `pme-scenario/1` card fields and `patient.endo` (A16), the AGENTS tile (A7) |
| **Orchestrator** | I-37 the 7g gate Q51/57/60 numbering collision with the tables' §9 | docs renumbering |
| **Calibration pass (R44, Ali)** | I-38 R → radial timing; I-39 PPG ↔ ABP shape; I-43 PR interval, MH EtCO2, Edmark, tamponade PAWP, CPR EtCO2, O1; I-45 7c water balance; I-31 VT sizes; the C2 ST threshold at HR 110; I-56 the SV-per-SVR sensitivity | constants of existing mechanisms; numbers in the inventory |

## Waiting on Ali (his decision; the model's numbers)

| # | Question | The model now (seed 7) |
|---|---|---|
| W1 | PE reflex vasoconstriction factor (review pack A20) | tables 0.5, code 1.0 (V.1 assumed 0.5, FU-4 1.0): PVR × 9.0 at severity 1, × 4.0 at 0.75; the ventilator's data row × 4 (2.5–6) |
| W2 | Tension-PTX build rate (A21) | ventilated 15.7 mmHg at 1 min, plateau 20, PEA 8–9 min; spontaneous 15 at 1 min, plateau 19, no PEA in 24 min; catalogue spontaneous 5–15 mmHg over 30–60 min |
| W3 | Anaesthetics lower the set point — the exception to amendment A11 (A22) | propofol ≈ −13 % at Ce 3 µg/mL; volatiles −10 % per MAC |
| W4 | Complete tube kink (B21) | × 150 → VT 67 mL at the 40 cmH2O limit (× 30 → 288 mL); tables × 5–20 |
| W5 | CO2 and PVR counted twice (B22) | PaCO2 38 → 50: pH term alone +22 % PVR; pH + FU-6's CO2 term +54 % PVR, +34 % mPAP; Viitanen +54 % |
| W6 | Opioid bradycardia size (C20) | fentanyl 10 µg/kg HR 74 → 48 (−35 %); remifentanil 3 µg/kg → 52; neostigmine 0.05 mg/kg alone → 46; tables −10–20 % |
| W7 | Volume + adrenaline after a complete 3 L bleed-out (FU-4 A-new, E-FU4-19) | 2 L none, 2.5 L none, 3 L pulse at +180 s, 3.5 L +170 s (unchanged by FU-8) |
| W8 | The maximum doses (dosing-preset caps DP-01…DP-64) | FU-8 sets only the rows' own sourced maxima (lidocaine 4.5, bupivacaine 2.5, ropivacaine 3, dantrolene 10 mg/kg, cumulative); the rest need the table |
| W9 | Oliguria teaching window (TQ40) | the flag needs one completed 10-min bin (1.75 L bleed: first flag 1200 s); KDIGO's 6 h is the AKI stage |
| W10 | What a monitor/printout shows as HR in VF (D3) | 12-lead printout: coarse VF 191/min, fine 51/min (detector counts); asystole now "--" |
| W11 | Saadat idle message bar; projector-light NIBP grey | #E0E0E0 slab (the brightest object on a quiet screen); NIBP grey 3.45:1, ≥ #6B7482 proposed |
| W12 | Paediatric size scaling (tables §2.2 isometric ×W/70) | after A12: neonate 3.5 kg CO 0.31 L/min = 89 mL/kg/min (≈ 200 expected), infant 7 kg 0.60 = 86 (≈ 150), child 20 kg 1.72 = 86 (≈ 150): allometric W^0.75 or per-band parameters |
| W13 | VT haemodynamics in a normal heart (D10) | VT 150: CO +10 %, MAP +8; VT 170: CO −8 %, MAP +1, SV 33 vs 81; VT 200: no ejection; MANUAL VT 170 MAP 89 → 44 at 90 s |
| W14 | Resting pressures of the conditions (research/19 C5; D13) | untreated HTN +13.4 vs tables +20; 80 y MAP 110.6 vs 90–100; HFrEF MAP 86.6 / LVEDP 14.1 vs 75 / 15–20 |
| W15 | C1: a disease-dependent tonic sympathetic tone (research/19 §8 Q1; review pack A1/Q1) — before Task B4 | τ 0.2 / 0.3 elderly / +0.1 HTN / +0.25 HFrEF gives propofol nadirs −29.9 / −37.2 / −35.0 (HTN 60 y) / −42.9 (80 y HTN) / −42.7 % (HFrEF); today −22 ± 1 % in all |
| W16 | research/19 §8 Q2–Q10 | severe AS 117 → 96 without ST (table 60–65 with ST); obese: profile or lung condition (Q3); COPD GOLD 3 PaCO2 39; elderly apnoea 9.1 vs 7.9 min; CAD at HR 110: filtered deficit 0.10, no ST (HR 130: ST −0.21 mV after A11); pressors in PH (PAP/SAP 0.33 vs 0.31); AF 150 in a normal heart: kIsch 0.80–0.84 after A10 (0 before); cirrhosis/IAP; hydralazine SV +3.5 % |
| W17 | Missing profiles — v1.0 or v1.1 (research/19 C10) | CKD, diabetic autonomic neuropathy, OSA, cirrhosis (the liver-failure stand-in leaves CO/SVR unchanged), bronchial reactivity; posture has no input (CM-02e) |
| W18 | The HR numeric in an agonal rhythm (I-13) | alternates "0" (valid) and "-?-" every 3–7 s under a standing ASYSTOLE; what does his IntelliVue show? |
| W19 | A QTc tile; iNO as a drug | not built |

## File map and the Part A / Part B split

Overlap was read from the in-flight plans' own file lists (`grep` of every `packages/…`/`apps/…` path in FU-6, FU-7,
V.1 and the R50-fixed Stage 9 plan). "—" = no in-flight plan edits the file.

| Task | Files (engine-core paths under `packages/engine-core/`) | In-flight overlap | Part |
|---|---|---|---|
| A0 | `vite.config.ts` | FU-6, FU-7 add SLOW entries (a union at merge) | A |
| A1 | `src/l3/alarms/{manager,conditions}.ts` + 2 tests | — (FU-7 edits `l3/defib-pacer`, `l3/device-layer.ts` only) | A |
| A2 | `src/l3/qrs.ts`, `src/l3/alarms/conditions.ts`, `test/engine/fidelity-lowflow.test.ts` + 1 test | — | A |
| A3 | `src/l2/hemo/pipeline.ts` (spo2 sensor branch), `src/l3/pressure-numerics/numerics.ts` + 1 test | — (FU-7's blood/hemo lines differ) | A |
| A4 | `apps/demo/src/stage7f.ts`, `apps/demo/e2e/fu5-latched.e2e.ts` | — | A |
| A5 | 1 test | — | A |
| A6 | `src/l2/ecg/foci-ventricular.ts`, `test/l2/ecg/nan-guard.test.ts` + 1 test | — | A |
| A7 | skins `types.ts`, `resolve.ts`, philips-/saadat-like JSON, snapshot; renderer `alarm-view.ts`, `numerics-neuro.ts`, `device-ui.ts`, `test/fu5-tiles.test.ts` + 1 test | Stage 9 E-S9-4 edits skins `types.ts`/`schema.ts` and other skins (different lines; Stage 9 re-anchors) | A |
| A8 | `src/l2/organs/pipeline.ts` + 1 test | — | A |
| A9 | `src/l3/capture12/capture.ts` + 1 test | — | A |
| A10 | `src/l2/circ/coronary.ts`, `test/engine/circ-hypoxic-arrest.test.ts` + 1 test | — (orchestrator: Part A, FU-7 needs it) | A |
| A11 | `src/l2/circ/coronary.ts` | — | A |
| A12, A13, A18 | `src/l2/circ/profile.ts`, `src/l2/hemo/pipeline.ts` (A13: `circProfileOf`) + 2 tests | FU-7 Task 8 edits `profile.ts` (E-FU7-3, other lines) | A (declared) |
| A14 | `src/engine.ts` (setRhythm validation) + 1 test | FU-6, FU-7 edit `engine.ts` (other lines) | A (declared; merge main first) |
| A15, A16 | `packages/controller/**` (describe, view, builtins, index, render-controls, vocabulary, schema, types, patient, validate + tests) | Stage 9 edits only `host-session.ts`, `panel/styles.ts` | A |
| A17 | `packages/renderer/src/sweep-lane.ts` + 1 test | Stage 9 edits `renderer/src/index.ts` only | A |
| B1 | `src/l2/pk/{row,pipeline}.ts`, `src/l2/pk/data/rows-other.ts`, `src/types-pk.ts`, `src/types.ts` + 2 tests | FU-7 rewrites all of `l2/pk/**` | B |
| B2 | `src/engine.ts`, `src/types-hemo.ts` + 1 test | FU-7 `engine.ts` (13 blocks) | B |
| B3 | `src/l2/circ/model.ts`, `src/l2/hemo/pipeline.ts`, `test/engine/fidelity-lowflow.test.ts` | FU-6, FU-7 edit `circ/model.ts` | B |
| B4 | `src/l2/circ/{baroreflex,model,profile}.ts` + 1 test | FU-7 `model.ts`, `profile.ts`; FU-4's `baroreflex.ts` | B (and Ali first) |
| G | `docs/gates/fu-8.md`, `docs/gates/fu-8/**`, `apps/demo/scripts/fu4-shots.mjs` (E-FU8-8), `docs/gates/fu-4/{3b-classIV-rosc,5a-burns-sux-sine}.png` | — | after A (and B) |

**Order.** Part A executes now, in task order (A0 → A18; A10 before A11; A12 before A13 and A18, all three in
`profile.ts`). Part B starts at B0 once FU-7 has merged; if FU-7 is not merged when Part A's gate is done, Part A goes out
as its own PR ("… (Part A)") and Part B is a second PR from this plan.

## Part A — independent of FU-6/FU-7 (executes now)

Run from the worktree `projects/patient-monitor-engine/scratch/wt-fu-8` (Task A0). `<repo>` below is
`projects/patient-monitor-engine/repo`; `<scratchpad>` is your session scratchpad. Every find block matches EXACTLY ONCE on
`origin/main` `0fd5397` and at its place in the sequence (Self-review).

### Task A0: Base check, the branch, the before-numbers, the SLOW_A entry

**Files:** Modify `packages/engine-core/vite.config.ts` (SLOW and SLOW_A: one glob each).

**Why:** every FU-8 engine test that runs more than a sim-minute is named `test/engine/fu8-*.test.ts`; the glob joins
BOTH lists, so the files run in slow-a only (slow-b ran 37.6 of its 40 min at the FU-4 gate). A glob that matches
nothing yet is harmless.

- [ ] **Step 1 — worktree and branch.**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-fu-8 -b fu-8-followups origin/main
cd ../scratch/wt-fu-8 && npx -y pnpm@9.15.9 install --frozen-lockfile
git log --oneline -1   # expect 0fd5397 or later; record it in the gate note
```

- [ ] **Step 2 — the before-numbers (scratch logs under `<scratchpad>/fu-8-followups/`).**

```bash
mkdir -p <scratchpad>/fu-8-followups
PME_AUDIT_OUT=<scratchpad>/fu-8-followups/audit-before npx -y pnpm@9.15.9 run audit:monitor A1-map-ladder A2-ali-b7 A7-probe > <scratchpad>/fu-8-followups/audit-before.log 2>&1
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fidelity-lowflow.test.ts test/engine/circ-hypoxic-arrest.test.ts > <scratchpad>/fu-8-followups/before-slow.log 2>&1
```

Expected (as the plan's "Prototype results", seed 7): A2's alarm log raises `ART_M_LOW` at 687 s as `**ABPm 66<70`;
A7 shows PI 8.21 at 181–185 s; `fidelity-lowflow` 9 tests pass with its 5 `it.fails`; `circ-hypoxic-arrest` 8 pass
(asphyxial PEA at +6.35 min). If a number differs, a merged stage moved it: record the new number, re-anchor, go on.

- [ ] **Step 3 — the SLOW_A glob.**

In `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/af-pulse-deficit.test.ts', // FU-4 Task 17: two 320 sim-s AF 150 runs
];
```

Replace with:

```ts
  'test/engine/af-pulse-deficit.test.ts', // FU-4 Task 17: two 320 sim-s AF 150 runs
  'test/engine/fu8-*.test.ts', // FU-8: monitor-in-arrest, agonal, oliguria and negative-volume rigs (SLOW_A: slow-b's margin is 2.4 min)
];
```

In `packages/engine-core/vite.config.ts`, find:

```ts
const SLOW_A = ['test/engine/**/*longrun*.test.ts', 'test/engine/engine-pipeline.test.ts', 'test/engine/organs-soak.test.ts', 'test/engine/clinical-suite.test.ts'];
```

Replace with:

```ts
const SLOW_A = ['test/engine/**/*longrun*.test.ts', 'test/engine/engine-pipeline.test.ts', 'test/engine/organs-soak.test.ts', 'test/engine/clinical-suite.test.ts', 'test/engine/fu8-*.test.ts']; // FU-8: its files join slow-a
```

Check the split: `cd packages/engine-core && CI=1 PME_TEST_SET=slow-b npx -y pnpm@9.15.9 exec vitest list | grep -c fu8`
→ 0 once the files exist (Tasks A1–A13).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/vite.config.ts
git commit -m "build(test): FU-8 engine rigs join the SLOW set in slow-a (fu8-*.test.ts)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A1: A limit alarm prints the value the tile shows, and the limit in force (F1, I-01)

**Files:** Modify `packages/engine-core/src/l3/alarms/manager.ts` (the active-entry branch of `stepAlarms`), `packages/engine-core/src/l3/alarms/conditions.ts`
(the `dd` line of the limit loop). Create `packages/engine-core/test/l3/alarms/fu8-live-text.test.ts`, `packages/engine-core/test/engine/fu8-alarm-text.test.ts`.

**Why (D1):** research/05 §2.4 ([S2]): "the message shows **SpO2 94<96 (deviation and limit)". `stepAlarms` froze the
text at the raise — `**ABPm 66<70` stood while the mean fell to 19 in Ali's tamponade PEA, `**ABPm 252>110` 13 s after
ROSC with the mean back near 120 — and `limitText` printed the SKIN DEFAULT limit after a `setLimit` (the comparison
used the edited limit). No red pressure alarm at MAP 19 is vendor-correct (IFU p. 44: only DISCONNECT, mean < 10).

- [ ] **Step 1 — failing tests first.**

Create `packages/engine-core/test/l3/alarms/fu8-live-text.test.ts`:

```ts
// FU-8 Task A1 (F1, G-FU4 2026-09-29): an active limit alarm's message follows the displayed value (research/05 §2.4:
// "the message shows **SpO2 94<96 (deviation and limit)", [S2]); a latched entry keeps the text it had when its
// condition ended. Before FU-8 the text was frozen at the raise (`**ABPm 66<70` at a mean of 19 in Ali's PEA).
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs } from '../../../src/l3/alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, stepAlarms, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) stepAlarms(s, k * TICK, conds(k * TICK), out);
  return out;
}
const artLow = (mean: number): Condition => ({ id: 'ART_M_LOW', level: 2, category: 'physiological', text: `**ABPm ${mean}<70`, delayS: 0, numeric: 'abpMean' });

describe('FU-8 A1: the limit-alarm message carries the current value', () => {
  it('ABPm 66 → 19: the active entry and the alarmStatus read "**ABPm 19<70"; ONE raise event, no re-raise', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const ev = run(s, 0, 10, (t) => [artLow(t < 5 ? 66 : 19)]);
    expect(ev.filter((e) => e.type === 'alarm' && e.state === 'raised').length).toBe(1);
    expect(s.active.ART_M_LOW?.text).toBe('**ABPm 19<70');
    const last = ev.filter((e): e is Extract<EngineEvent, { type: 'alarmStatus' }> => e.type === 'alarmStatus').at(-1);
    expect(last?.active.find((a) => a.id === 'ART_M_LOW')?.text).toBe('**ABPm 19<70');
  });
  it('a latched red keeps the text it had when its condition ended', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const desat = (v: number): Condition => ({ id: 'DESAT', level: 1, category: 'physiological', text: `***DESAT ${v}`, delayS: 0 });
    run(s, 0, 4, (t) => (t < 2 ? [desat(t < 1 ? 80 : 75)] : []));
    expect(s.active.DESAT).toMatchObject({ latched: true, text: '***DESAT 75' });
  });
  it('after setLimit the text prints the limit in force, not the skin default (ABPm low 70 → 60: "**ABPm 55<60")', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    applyAlarmAction(s, { device: 'alarm', action: 'setLimit', param: 'ART_M', low: 60 } as never, 0, []);
    const inp = createInputs(0);
    inp.abp = 'connected' as never;
    inp.measured.abpMean = { value: 55, flag: 'valid', at: 10 };
    const c = buildConditions(s, inp, 10).find((x) => x.id === 'ART_M_LOW');
    expect(c?.text).toBe('**ABPm 55<60');
  });
});
```

Create `packages/engine-core/test/engine/fu8-alarm-text.test.ts`:

```ts
// FU-8 Task A1 (F1, G-FU4 2026-09-29): a limit alarm prints the value the tile shows (research/05 §2.4, [S2]).
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED } from '../helpers/monitor.ts';

describe('FU-8 A1 (F1): a limit alarm prints the value the tile shows', () => {
  it('MANUAL MAP ladder 100 → 60 → 40 → 25 → 13: while ART_M_LOW stands its text carries the displayed mean (± 1) — before FU-8 it stayed "**ABPm 60<70" to MAP 13', async () => {
    const bp = (t: number, s: number, d: number): Array<[number, Record<string, unknown>]> => [[t, M.target('sbp', s)], [t, M.target('dbp', d)]];
    const run = await monitorRun({ mode: 'manual', tEnd: 660, steps: [...VENTED, ...bp(60, 135, 82), ...bp(180, 80, 50), ...bp(300, 55, 32), ...bp(420, 35, 20), ...bp(540, 18, 10)] });
    const rows = run.rows.filter((r) => r.active.some((a) => a.id === 'ART_M_LOW' && !a.latched) && r.m.abpMean?.flag === 'valid');
    expect(rows.length).toBeGreaterThan(100);
    const off = rows.map((r) => {
      const txt = (r.active.find((a) => a.id === 'ART_M_LOW') as { text: string }).text;
      return Math.abs(Number(/ABPm (\d+)</.exec(txt)?.[1]) - Math.round(r.m.abpMean?.value as number));
    });
    console.log(`fu8 A1: ${rows.length} rows with ART_M_LOW; worst text/tile gap ${Math.max(...off)} mmHg; last text "${(rows.at(-1)?.active.find((a) => a.id === 'ART_M_LOW') as { text: string }).text}"`);
    expect(Math.max(...off)).toBeLessThanOrEqual(1);
    expect(run.alarms.filter((a) => a.id === 'ART_M_LOW' && a.state === 'raised').length).toBe(1);
  }, 120_000);
});
```

Run `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/alarms/fu8-live-text.test.ts test/engine/fu8-alarm-text.test.ts` → the first test of each file and
the `setLimit` test FAIL (text `**ABPm 66<70`; `**ABPm 55<70`); the latched-text test passes.

- [ ] **Step 2 — the text follows the value.**

In `packages/engine-core/src/l3/alarms/manager.ts`, find:

```ts
        e.sounding = !e.acked;
        s.dirty = true;
      }
      continue;
    }
    const since = (s.pending[c.id] ??= t);
```

Replace with:

```ts
        e.sounding = !e.acked;
        s.dirty = true;
      }
      // FU-8 (F1, G-FU4 2026-09-29): the message carries the value NOW — "the message shows **SpO2 94<96 (deviation
      // and limit)" (research/05 §2.4, [S2]). The text was frozen at the raise: `**ABPm 66<70` stood while the mean
      // fell to 19 in Ali's tamponade PEA, and `**ABPm 252>110` 13 s after ROSC while the mean was back near 120
      if (e.text !== c.text) {
        e.text = c.text;
        s.dirty = true;
      }
      continue;
    }
    const since = (s.pending[c.id] ??= t);
```

In `packages/engine-core/src/l3/alarms/conditions.ts`, find:

```ts
    const dd = src === d.numeric ? d : { ...d, label: 'Pulse', upper: 'PR' }; // "**Pulse 130>120" / "PR TOO HIGH"
```

Replace with:

```ts
    // FU-8 (Task A1): the text prints the limit in force (a `setLimit` edits `l`; the profile's `d` keeps the default)
    const dd = { ...(src === d.numeric ? d : { ...d, label: 'Pulse', upper: 'PR' }), low: l.low, high: l.high }; // "**Pulse 130>120" / "PR TOO HIGH"
```

- [ ] **Step 3 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/alarms test/engine/fu8-alarm-text.test.ts` → all pass; the engine test logs
`470 rows with ART_M_LOW; worst text/tile gap 0 mmHg` (prototype) and exactly one `raised` event.

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l3/alarms/manager.ts packages/engine-core/src/l3/alarms/conditions.ts packages/engine-core/test/l3/alarms/fu8-live-text.test.ts packages/engine-core/test/engine/fu8-alarm-text.test.ts
git commit -m "fix(alarms): the limit-alarm message carries the displayed value and the limit in force (FU-8 A1, F1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A2: One QRS per agonal complex; the agonal hold counts complexes; LOW PERF never raises from a pending dip (F3, I-03, I-04)

**Files:** Modify `packages/engine-core/src/l3/qrs.ts` (`SAME_COMPLEX_N`, the hump close), `packages/engine-core/src/l3/alarms/conditions.ts` (`SAME_COMPLEX_S`,
`AlarmInputs.countedQrsT`, `observeQrs`, the LOW PERF line), `packages/engine-core/test/engine/fidelity-lowflow.test.ts` (**E-FU8-1**: three
`it.fails` flipped to `it`, titles re-stated with the after-numbers; no assertion changes). Create
`packages/engine-core/test/engine/fu8-agonal-qrs.test.ts`.

**Why (D3):** the detector fired twice on every agonal complex (second hump 2–56 ms after the first closed; 0.14–0.24 s
after R), so the agonal ASYSTOLE hold read an R–R of 0.2 s, ASYSTOLE dropped to latched, the HR read 16–25 and EXTREME
BRADY raised for 3.1–3.6 s until the next 4 s gap. In every other library rhythm the next hump starts ≥ 136 ms after
the close (vtPoly 220/min). The alarm-side pairwise rule (0.35 s) is needed too: after Task A6 a minority of late-decay
complexes re-open > 100 ms after the close (`fidelity 4b` raised EXTREME BRADY at 167 s with the detector fix alone).
LOW PERF: the clear hysteresis held a PENDING INOP (`holdingId` counts `pending`), so one PI dip to 0.30 at 596 s raised
LOW PERF at 601 s and it cleared at 602 s — FU-5 Task 9a's on-delay rule, applied to the INOP.

- [ ] **Step 1 — failing test.**

Create `packages/engine-core/test/engine/fu8-agonal-qrs.test.ts`:

```ts
// FU-8 Task A2 (F3, E-FU4-20): the monitor's QRS detector counts one QRS per agonal complex.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A2 (F3): one QRS per agonal complex', () => {
  it('MANUAL pulseless agonal 10–310 s: the monitor detects one QRS per generated complex (before FU-8: two, 0.14–0.24 s apart)', async () => {
    const e = createEngine({ seed: 7, mode: 'manual', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
    const beats: number[] = [];
    let marks = 0;
    e.on((x) => {
      if (x.type === 'beat' && x.template === 'agonal' && x.t > 20 && x.t < 300) beats.push(x.t);
    }, ['beat']);
    e.on((x) => {
      if (x.type === 'measurement' && x.t > 30 && x.t < 300 && x.values.hr?.value != null && x.values.hr.value > 25) marks++;
    }, ['measurement']);
    e.advanceTo(10);
    e.dispatch({ id: 'r', issuedBy: 'test', type: 'setRhythm', rhythm: 'agonal', opts: { pulseless: true } } as never);
    for (let t = 60; t <= 310; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    console.log(`fu8 A2: ${beats.length} agonal complexes; HR readings > 25/min: ${marks}`);
    expect(beats.length).toBeGreaterThan(30);
    expect(marks).toBe(0); // a double detection read as an R–R of 0.2 s pushes the displayed HR far above the agonal rate
  }, 60_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-agonal-qrs.test.ts` → FAILS (HR readings > 25/min while the agonal rate is ≈ 11).

- [ ] **Step 2 — the detector.**

In `packages/engine-core/src/l3/qrs.ts`, find:

```ts
const T_RATIO = 0.5; // ... and below half the last QRS hump are T waves, not QRS
const FINAL_FRACTION = 0.6; // a hump is closed when the MWI falls below 60% of its maximum [ENG, latency]
```

Replace with:

```ts
const T_RATIO = 0.5; // ... and below half the last QRS hump are T waves, not QRS
/**
 * FU-8 (F3, G-FU4 2026-09-29): a hump that starts within this many samples of the previous detection's close is the
 * SAME wide complex rising again (its MWI dipped below FINAL_FRACTION and re-crossed the threshold), not a new QRS.
 * Measured on origin/main 0fd5397: the agonal complex (QRS ≈ 300 ms) closed and re-opened 2–56 ms later, a second
 * detection 0.14–0.24 s after the first; in every other library rhythm the next hump starts ≥ 136 ms after the previous
 * close (vtPoly 220/min 136 ms; VT 250/min 146; torsades 148; AF 180/min 166; sinus tachycardia 200/min 188) [ENG].
 */
const SAME_COMPLEX_N = 50; // 100 ms
const FINAL_FRACTION = 0.6; // a hump is closed when the MWI falls below 60% of its maximum [ENG, latency]
```

In `packages/engine-core/src/l3/qrs.ts`, find:

```ts
      if (tWave) {
        st.npk = 0.125 * st.humpMax + 0.875 * st.npk;
```

Replace with:

```ts
      const sameComplex = !tWave && st.lastDetN >= 0 && st.humpStart - st.lastDetN < SAME_COMPLEX_N;
      if (tWave) {
        st.npk = 0.125 * st.humpMax + 0.875 * st.npk;
      } else if (sameComplex) {
        // FU-8 (F3): the second phase of the complex just detected — the complex ends here, no new R
        st.lastDetN = n;
        st.lastQrsMax = Math.max(st.lastQrsMax, st.humpMax);
```

- [ ] **Step 3 — the agonal hold and LOW PERF.**

In `packages/engine-core/src/l3/alarms/conditions.ts`, find:

```ts
export const AGONAL_RR_S = 2.5;
/** FU-5 (review F9): a live extreme-rate alarm ends only after this long back inside its threshold [ENG]. */
```

Replace with:

```ts
export const AGONAL_RR_S = 2.5;
/** FU-8 (F3): two detections closer than this are one wide complex for the agonal hold (agonal QRS ≈ 300 ms) [ENG]. */
export const SAME_COMPLEX_S = 0.35;
/** FU-5 (review F9): a live extreme-rate alarm ends only after this long back inside its threshold [ENG]. */
```

In `packages/engine-core/src/l3/alarms/conditions.ts`, find:

```ts
  prevQrsT?: number | null;
  meanRR: number | null;
```

Replace with:

```ts
  prevQrsT?: number | null;
  /** FU-8 (F3): the last detection counted as a new complex (a second detection within SAME_COMPLEX_S is not). */
  countedQrsT?: number | null;
  meanRR: number | null;
```

In `packages/engine-core/src/l3/alarms/conditions.ts`, find:

```ts
  // on an agonal beat — measured), as the mean R–R above does
  if (inp.lastQrsT === null || tR - inp.lastQrsT > 0.2) inp.prevQrsT = inp.lastQrsT;
```

Replace with:

```ts
  // on an agonal beat — measured), as the mean R–R above does. FU-8 (F3): measured 0.14–0.24 s apart on origin/main
  // 0fd5397, so a detection within SAME_COMPLEX_S of the last COUNTED one is the same complex; pairwise, so a real
  // rhythm faster than 1/SAME_COMPLEX_S (VT ≥ 170/min) still counts every other beat and ends the hold
  if (inp.lastQrsT === null || tR - (inp.countedQrsT ?? -Infinity) > SAME_COMPLEX_S) {
    if (inp.countedQrsT !== undefined && inp.countedQrsT !== null) inp.prevQrsT = inp.countedQrsT;
    inp.countedQrsT = tR;
  }
```

In `packages/engine-core/src/l3/alarms/conditions.ts`, find:

```ts
    const lowPerf = piV !== null ? piV < LOW_PERF_PI || (holdingId(s, 'spo2LowPerf') && piV < LOW_PERF_CLEAR_PI && !okFor(inp.piOkSince, LOW_PERF_DELAY_S)) : holdingId(s, 'spo2LowPerf');
```

Replace with:

```ts
    // FU-8 (F3, E-FU4-20): the clear hysteresis holds a RAISED LOW PERF only — while the INOP is pending its
    // LOW_PERF_DELAY_S the condition is the plain PI < LOW_PERF_PI, as for the limit alarms (FU-5 Task 9a, the vendor
    // on-delay: a condition that resolves within the delay raises nothing). With the pending entry held by the band, a
    // single PI dip to 0.30 at 596 s in the 3 L bleed raised LOW PERF at 601 s and cleared it 1.0 s later
    const lowPerf = piV !== null ? piV < LOW_PERF_PI || (raisedLiveId(s, 'spo2LowPerf') && piV < LOW_PERF_CLEAR_PI && !okFor(inp.piOkSince, LOW_PERF_DELAY_S)) : raisedLiveId(s, 'spo2LowPerf');
```

- [ ] **Step 4 — flip the three E-FU4-20 pins (E-FU8-1).** Run `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fidelity-lowflow.test.ts` first: the three
`it.fails` must now report "Expect test to fail" (they pass). Then:

In `packages/engine-core/test/engine/fidelity-lowflow.test.ts`, find:

```ts
  it.fails('MODELED 3 L bleed: no technical raise/clear cycle shorter than 5 s — measured 1 (SpO2 LOW PERF at 601 s, 1.0 s) after FU-4 (was LOW PERF ×7 at 1–2 s before FU-5)', async () => {
```

Replace with:

```ts
  // FU-8 (Task A2, E-FU8-1): flipped — the LOW PERF clear hysteresis no longer holds a PENDING INOP (was 1 cycle, 601 s, 1.0 s)
  it('MODELED 3 L bleed: no technical raise/clear cycle shorter than 5 s — measured 0 after FU-8 (1: SpO2 LOW PERF at 601 s, 1.0 s, after FU-4; LOW PERF ×7 at 1–2 s before FU-5)', async () => {
```

In `packages/engine-core/test/engine/fidelity-lowflow.test.ts`, find:

```ts
  it.fails('MODELED 3 L bleed: no red raise/clear cycle shorter than 5 s — measured 1 (EXTREME BRADY at 956 s, 3.6 s: the decaying PEA) after FU-4 (FU-5 follow-up)', async () => {
```

Replace with:

```ts
  // FU-8 (Task A2, E-FU8-1): flipped — one QRS per agonal complex; the agonal ASYSTOLE hold counts complexes, not detections
  it('MODELED 3 L bleed: no red raise/clear cycle shorter than 5 s — measured 0 after FU-8 (1: EXTREME BRADY at 956 s, 3.6 s, after FU-4)', async () => {
```

In `packages/engine-core/test/engine/fidelity-lowflow.test.ts`, find:

```ts
  it.fails("MODELED Ali's case: no red raise/clear cycle shorter than 5 s — measured 3 EXTREME BRADY cycles (948 s +3.3, 989 s +3.1, 1000 s +3.6: the decaying PEA at ≈ 18/min) after FU-4 (FU-5 follow-up)", async () => {
```

Replace with:

```ts
  // FU-8 (Task A2, E-FU8-1): flipped — the detector counted every agonal complex twice (0.14–0.24 s apart)
  it("MODELED Ali's case: no red raise/clear cycle shorter than 5 s — measured 0 after FU-8 (3 EXTREME BRADY cycles after FU-4: 948 s +3.3, 989 s +3.1, 1000 s +3.6)", async () => {
```

- [ ] **Step 5 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3 test/engine/fidelity-lowflow.test.ts test/engine/fidelity-arrest.test.ts test/engine/fidelity-ecg.test.ts test/engine/fidelity-alarms.test.ts test/engine/fu8-agonal-qrs.test.ts`
→ all pass (prototype: l3 + fidelity 190 tests; `fu8 A2: 55 agonal complexes; HR readings > 25/min: 0`). The QRS
detector's own suites (`test/l3/qrs.test.ts`, `qrs-pacing.test.ts`) are unchanged and green.

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l3/qrs.ts packages/engine-core/src/l3/alarms/conditions.ts packages/engine-core/test/engine/fidelity-lowflow.test.ts packages/engine-core/test/engine/fu8-agonal-qrs.test.ts
git commit -m "fix(monitor): one QRS per wide agonal complex; the agonal hold counts complexes; LOW PERF honours its on-delay (FU-8 A2, F3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A3: The oximeter restarts its pulse search when motion ends (F5, I-06)

**Files:** Modify `packages/engine-core/src/l2/hemo/pipeline.ts` (the `spo2` branch of the sensor handler — FU-6/FU-7 do not edit this
file), `packages/engine-core/src/l3/pressure-numerics/numerics.ts` (`numericsStep`). Create `packages/engine-core/test/engine/fu8-motion-pi.test.ts`.

**Why (D4):** the beats detected on the motion artefact stayed in the 5 s PI/PR average (PI 8.21, PR 81 for 5–9 s), and
the restarted detector's zero-filled history put its first foot BEFORE the restart, so the first "clean" beat still
averaged artefact samples (PI 4.49 → 2.34 over 5 s with the first half of the fix alone).

- [ ] **Step 1 — failing test.**

Create `packages/engine-core/test/engine/fu8-motion-pi.test.ts`:

```ts
// FU-8 Task A3 (F5, G-FU5 ruling 2): the pleth PI/PR restart when a motion episode ends.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED } from '../helpers/monitor.ts';

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('FU-8 A3 (F5): the PI and PR restart when motion ends', () => {
  it('MANUAL motion 120–180 s: at 182–190 s PI ≤ 1.3 × rest and PR within ± 5 of rest (before FU-8: PI 8.21, PR 81 against 1.84 / 75)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [120, M.sensor('spo2', 'motion')], [180, M.sensor('spo2', 'on')]] });
    const at = (a: number, b: number) => run.rows.filter((r) => r.t >= a && r.t <= b);
    const piRest = mean(at(30, 110).map((r) => r.m.pi?.value ?? Number.NaN));
    const prRest = mean(at(30, 110).map((r) => r.m.pr?.value ?? Number.NaN));
    const after = at(182, 190).filter((r) => r.m.pi?.flag === 'valid');
    console.log(`fu8 A3: rest PI ${piRest.toFixed(2)} PR ${prRest.toFixed(0)}; after motion PI ${after.map((r) => r.m.pi?.value?.toFixed(2)).join(' ')}`);
    expect(after.length).toBeGreaterThan(4);
    for (const r of after) {
      expect(r.m.pi?.value as number).toBeLessThanOrEqual(1.3 * piRest);
      expect(Math.abs((r.m.pr?.value as number) - prRest)).toBeLessThanOrEqual(5);
    }
  }, 60_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-motion-pi.test.ts` → FAILS (PI 8.21 at 182 s).

- [ ] **Step 2 — the fix.**

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
      if (sensor === 'spo2') {
        setPlethSensor(hs.pleth, state as PlethState['state'], spo2Site(site), rng.artefact);
```

Replace with:

```ts
      if (sensor === 'spo2') {
        // FU-8 (F5, G-FU5 ruling 2): when a motion episode ends the oximeter restarts its pulse search — the pulses
        // detected on the artefact leave the PI/PR average (they held PI 8.21 and PR 81 for 5–9 s after the motion)
        if (hs.pleth.state === 'motion' && state !== 'motion') Object.assign(hs.num.pleth, { beats: [], feet: [], n: -1 });
        setPlethSensor(hs.pleth, state as PlethState['state'], spo2Site(site), rng.artefact);
```

In `packages/engine-core/src/l3/pressure-numerics/numerics.ts`, find:

```ts
  if (p < 0 || f - p < 25 || f - p > RING - 16 || m - p >= RING) return null;
```

Replace with:

```ts
  // FU-8 (F5): a beat whose foot precedes this sampling run (the restarted detector's zero-filled history places the
  // first foot before the restart) would average samples from before the gap — dropped
  if (p < 0 || p < (wn.first ?? 0) || f - p < 25 || f - p > RING - 16 || m - p >= RING) return null;
```

- [ ] **Step 3 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-motion-pi.test.ts test/l3/pressure-numerics test/engine/fidelity-arrest.test.ts test/engine/fidelity-nibp.test.ts`
→ pass; the log reads `rest PI 1.85 PR 75; after motion PI 1.95 1.99 2.00 1.91 …`. `audit:monitor A7-probe` rows 181–185:
PI `--`, 1.95, 1.99, 1.91 (was 8.21 ×4).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/l3/pressure-numerics/numerics.ts packages/engine-core/test/engine/fu8-motion-pi.test.ts
git commit -m "fix(pleth): the PI/PR average restarts when a motion episode ends (FU-8 A3, F5)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A4: The fu5-latched evidence runs again — the induction script bags later on request (F4, I-05)

**Files:** Modify `apps/demo/src/stage7f.ts` (**E-FU8-5**, 7f's page: a `?bvmAt=` URL parameter; the default 180 s is
unchanged, so 7f's own shots and FU-3's tile script are not moved), `apps/demo/e2e/fu5-latched.e2e.ts` (FU-5's e2e:
`test.fail` removed, the page opened with `&bvmAt=210`, the bag time a constant).

**Why:** after FU-4 the induction apnoea starts ≈ 4 s later (propofol distribution G10, dead-space root 18d), so the
capnograph's 20 s apnoea delay never elapsed before the script's bag at +180 s: no APNEA was raised on either skin and
the latching the test exists for was not exercised (pinned `test.fail`, E-FU4-20). The ruling said the fix is "the
scenario's timing or the alarm"; the alarm is right (an apnoea shorter than its delay raises nothing), so the timing
moves: a 90 s apnoeic interval after propofol, rocuronium still at +180 s.

- [ ] **Step 1 — the page parameter.**

In `apps/demo/src/stage7f.ts`, find:

```ts
pm.setTimeScale(4);
let n = 0;
```

Replace with:

```ts
pm.setTimeScale(4);
/** FU-8 (F4): when the induction script starts bag ventilation (sim s after the click). */
const BVM_AT_S = Number(new URLSearchParams(location.search).get('bvmAt') ?? 180);
let n = 0;
```

In `apps/demo/src/stage7f.ts`, find:

```ts
  at(180, () => { void drug('rocuronium', 0.6, 'mg/kg'); log('rocuronium 0.6 mg/kg'); void ev({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 500, fio2: 1 }); });
```

Replace with:

```ts
  at(180, () => { void drug('rocuronium', 0.6, 'mg/kg'); log('rocuronium 0.6 mg/kg'); });
  // FU-8 (F4): the bag starts at +180 s (unchanged) unless `?bvmAt=` says later — the FU-5 latched-APNEA e2e waits for
  // the induction apnoea to alarm (after FU-4 the apnoea starts ≈ 4 s later and the capnograph's 20 s never elapsed)
  at(BVM_AT_S, () => void ev({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 500, fio2: 1 }));
```

- [ ] **Step 2 — the e2e.**

In `apps/demo/e2e/fu5-latched.e2e.ts`, find:

```ts

const simT = (page: Page) => page.evaluate(() => (window as unknown as { __simT?: number }).__simT ?? 0);
```

Replace with:

```ts

/** FU-8 (F4): the bag's start in the induction script, sim s after the click (stage7f.ts `?bvmAt=`). */
const BVM_AT = 210;
const simT = (page: Page) => page.evaluate(() => (window as unknown as { __simT?: number }).__simT ?? 0);
```

In `apps/demo/e2e/fu5-latched.e2e.ts`, find:

```ts
    // E-FU4-20 (FU-4 × FU-5, found at the FU-4 gate, R45 — FU-5 follow-up): FU-4's propofol distribution (G10) and
    // dead-space root (18d) delay the induction apnoea by ≈ 4 s (VA 0 at 172 vs 168 s after the script's start, seed 7
    // probe), so the capnograph's apnoea delay no longer elapses before the script's BVM at +180 s: no APNEA is raised
    // at all ("APNEA live none; latched none", both skins, 3 attempts) and the latching this test exists for is not
    // exercised. Pinned as an expected failure with the number; the fix is the scenario's timing or the alarm, FU-5's.
    test.fail(true, 'no induction APNEA after FU-4: apnoea onset +4 s, BVM at +180 s comes first (FU-5 follow-up)');
```

Replace with:

```ts
    // E-FU4-20 (FU-4 × FU-5): FU-4's propofol distribution (G10) and dead-space root (18d) delay the induction apnoea by
    // ≈ 4 s, so the capnograph's apnoea delay no longer elapsed before the script's BVM at +180 s (no APNEA at all,
    // pinned `test.fail`). FU-8 (F4, E-FU8-5): the SCENARIO's timing is the fix — the page's `?bvmAt=210` starts the bag
    // 30 s later (a 90 s apnoeic interval after propofol, rocuronium still at +180 s); the alarm rules are unchanged.
```

In `apps/demo/e2e/fu5-latched.e2e.ts`, find:

```ts
    await page.goto(`${base}/stage7f.html?skin=${skin}`);
```

Replace with:

```ts
    await page.goto(`${base}/stage7f.html?skin=${skin}&bvmAt=${BVM_AT}`);
```

In `apps/demo/e2e/fu5-latched.e2e.ts`, find:

```ts
    await page.click('#induction'); // propofol at sim +120 s (apnoea), BVM at +180 s, ventilator at +330 s (× 4)
```

Replace with:

```ts
    await page.click('#induction'); // propofol at sim +120 s (apnoea), BVM at +BVM_AT s (FU-8), ventilator at +330 s (× 4)
```

In `apps/demo/e2e/fu5-latched.e2e.ts`, find:

```ts
    const tBag = tClick + 180;
```

Replace with:

```ts
    const tBag = tClick + BVM_AT;
```

- [ ] **Step 3 — verify (Chromium only, ≈ 5 min).** `npx -y pnpm@9.15.9 build && CI=1 npx playwright test apps/demo/e2e/fu5-latched.e2e.ts --project=chromium`
→ 2 passed (webkit skips, the heavy-evidence rule). Record the logged spans (`APNEA live … latched …`) in the gate note;
the two PNGs under `docs/gates/fu-5/` are re-written by the run — commit them only if the gate note quotes them,
otherwise `git checkout -- docs/gates`.
Prototype (Chromium, 3.9 min): philips-like APNEA live 191–216 s, latched 217–457 s (in the rotation at the end); saadat-like live 188–215 s, then none.

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add apps/demo/src/stage7f.ts apps/demo/e2e/fu5-latched.e2e.ts
git commit -m "test(e2e): fu5-latched bags at +210 s via ?bvmAt so the induction apnoea alarms and latches (FU-8 A4, F4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A5: Pin the negative chamber volumes after an exsanguination arrest (F6, I-07; the fix waits for a ruling)

**Files:** Create `packages/engine-core/test/engine/fu8-negative-volume.test.ts` (two `it.fails` with the measured numbers). No source change.

**Why (D5):** the defect is real and diagnosed (a ≈ 3 mL/s forward leak at a 0.1 mmHg gradient drains the RV, LV and
pulmonary bed below zero because the passive pressures bottom out), but every mechanism prototyped (Options A–D,
"Prototype results") moves FU-4 rows fitted on the defective circuit. Option D's code is kept in the plan backup
(`scratch/plans-backup/fu-8-option-d-circuit.ts`); it lands only on the orchestrator's ruling (Open question 1).

Create `packages/engine-core/test/engine/fu8-negative-volume.test.ts`:

```ts
// FU-8 Task A5 (F6, G-FU4 2026-09-29; plan D5): after the exsanguination arrest the circulation drains to NEGATIVE
// chamber volumes and the monitor shows a negative CVP. Pinned with the numbers measured on origin/main 0fd5397; the
// fix (the plan's Option D: an outflow limiter plus collapse floors) moves two FU-4 resuscitation rows and waits for the
// orchestrator's ruling (plan Open question 1). R45: these stay `it.fails` until then.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

type Circ = { s: number[]; p: { v0Sv: number } };
async function classIv(): Promise<{ minVol: number; minCvp: number }> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, sensors: { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on' } } });
  const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as never;
  e.advanceTo(1);
  e.dispatch({ id: 'a', issuedBy: 'test', ...(ev({ kind: 'airwayDevice', device: 'ett' }) as object) } as never);
  e.dispatch({ id: 'b', issuedBy: 'test', ...(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 }) as object) } as never);
  e.advanceTo(60);
  e.dispatch({ id: 'c', issuedBy: 'test', ...(ev({ kind: 'bleed', volumeMl: 2500, overS: 600 }) as object) } as never);
  let minVol = Infinity;
  let minCvp = Infinity;
  e.on((x) => {
    if (x.type === 'measurement' && x.values.cvpMean?.value != null) minCvp = Math.min(minCvp, x.values.cvpMean.value);
  }, ['measurement']);
  for (let t = 600; t <= 1200; t += 10) {
    e.advanceTo(t);
    const c = (e as unknown as { st: { hemo: { circ: Circ } } }).st.hemo.circ;
    for (const i of [5, 6, 9, 10]) minVol = Math.min(minVol, c.s[i] as number); // VRA, VRV, VLA, VLV (mL)
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  console.log(`fu8 A5: min chamber volume ${minVol.toFixed(0)} mL, min displayed CVP ${minCvp.toFixed(1)} mmHg`);
  return { minVol, minCvp };
}

describe('FU-8 A5 (F6): the empty circulation after an exsanguination arrest', () => {
  let run: ReturnType<typeof classIv> | undefined;
  it.fails('no chamber volume below 0 mL in 600–1200 s of the class IV rig — measured VRV −273, VLV −62 mL on 0fd5397 (D5; Open question 1)', async () => {
    expect((await (run ??= classIv())).minVol).toBeGreaterThanOrEqual(0);
  }, 120_000);
  it.fails('the displayed CVP stays ≥ 0 on PPV after the arrest — measured −2.9 … −1.0 mmHg on 0fd5397 (D5; Open question 1)', async () => {
    expect((await (run ??= classIv())).minCvp).toBeGreaterThanOrEqual(0);
  }, 120_000);
});
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-negative-volume.test.ts` → 2 passed (both expected failures hold; the log reads
`min chamber volume -274 mL, min displayed CVP -3.5 mmHg`).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/test/engine/fu8-negative-volume.test.ts
git commit -m "test(circ): pin the negative chamber volumes and CVP after an exsanguination arrest (FU-8 A5, F6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A6: The agonal rhythm runs at its rate (I-32)

**Files:** Modify `packages/engine-core/src/l2/ecg/foci-ventricular.ts` (Stage 5; `AGONAL_RR_CV`, `onAgonal`), `packages/engine-core/test/l2/ecg/nan-guard.test.ts`
(**E-FU8-6**: the `agonal` entry of the pre-guard schedule FIXTURE re-recorded — the rhythm's schedule changes by
design; every other rhythm's hash is untouched and the darwin-only rule stays). Create `packages/engine-core/test/engine/fu8-agonal-rate.test.ts`.

**Why (D6):** `onAgonal` drew R–R = 3 + 4.5·U s whatever the rate: 11.4/min at every `rateBpm` (4…24). One uniform
draw per beat as before, so no other RNG stream shifts. FU-4's PEA decay requests `agonal` at 24/min, clamped to the
rhythm's 20: its idioventricular phase now runs at ≈ 18.8/min (the asystole hazard is per second, unchanged).

- [ ] **Step 1 — failing test.**

Create `packages/engine-core/test/engine/fu8-agonal-rate.test.ts`:

```ts
// FU-8 Task A6 (review pack, rhythm R33): the agonal rhythm runs at its rate setting.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A6: the agonal rhythm runs at its rate', () => {
  it.each([6, 12, 18])('MANUAL agonal rateBpm %i: complexes per minute over 300 s within ± 15 % (before FU-8: 11.4/min at every rate)', async (rate) => {
    const e = createEngine({ seed: 7, mode: 'manual', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
    const beats: number[] = [];
    e.on((x) => {
      if (x.type === 'beat' && x.template === 'agonal') beats.push(x.t);
    }, ['beat']);
    e.advanceTo(10);
    e.dispatch({ id: 'r', issuedBy: 'test', type: 'setRhythm', rhythm: 'agonal', opts: { rateBpm: rate } } as never);
    for (let t = 60; t <= 310; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    const perMin = (beats.filter((t) => t > 10 && t <= 310).length / 300) * 60;
    console.log(`fu8 A6: agonal ${rate}/min → ${perMin.toFixed(1)}/min`);
    expect(Math.abs(perMin - rate) / rate).toBeLessThanOrEqual(0.15);
  }, 60_000);
});
```

- [ ] **Step 2 — the rate.**

In `packages/engine-core/src/l2/ecg/foci-ventricular.ts`, find:

```ts
const AGONAL_RR_SPAN_S = 4.5;
```

Replace with:

```ts
/**
 * FU-8 (review pack, rhythm R33 "the agonal rhythm ignores its rate setting"): the R–R is 60 / the rhythm's rate
 * (rateBpm 4–20, default 12) ± this fraction, uniform — irregular, never faster than AGONAL_RR_MIN_S [ENG]. Before:
 * 3 + 4.5·U s whatever the rate (mean 11.4/min; 8/min on the pack's strip).
 */
const AGONAL_RR_CV = 0.25;
```

In `packages/engine-core/src/l2/ecg/foci-ventricular.ts`, find:

```ts
  st.focusNextT = t + AGONAL_RR_MIN_S + AGONAL_RR_SPAN_S * uniform(ctx.rng.ectopy);
```

Replace with:

```ts
  st.focusNextT = t + Math.max(AGONAL_RR_MIN_S, (60 / rhythmRate(st, t, ctx)) * (1 + AGONAL_RR_CV * (2 * uniform(ctx.rng.ectopy) - 1)));
```

- [ ] **Step 3 — the fixture entry (E-FU8-6).** Recompute the agonal hash on darwin (the fixture's platform):
`fnv(JSON.stringify(runRhythm('agonal', 60, { seed: 7 }).st.records))` → prototype `d9075744`.

In `packages/engine-core/test/l2/ecg/nan-guard.test.ts`, find:

```ts
const FIXTURE: Record<string, string> = {"sinus":"51b630bc","sinusBrady":"a6442a4c","sinusTachy":"6adb8b9f","sinusArrhythmia":"53084148","sinusPause":"fe934c89","atrialTach":"aa806f26","mat":"0bb8bad0","afib":"e44bcd91","aflutter":"a25cf05f","svtAvnrt":"4f07b590","svtAvrt":"cb153dc0","wpwSinus":"931149c9","preexcitedAf":"83ca6f9d","junctionalEscape":"5f277786","junctionalAccel":"b958fb55","junctionalTachy":"4d081563","avb1":"dff23667","avb2Mobitz1":"c4f36488","avb2Mobitz2":"7b3c2874","avb2to1":"744fce1c","avbHighGrade":"dc1c8c93","avb3Narrow":"dda3f2a9","avb3Wide":"3126ade7","idioventricular":"db89ed8d","aivr":"a8f563c4","vtMono":"2648f677","vtPoly":"286c8063","torsades":"32fbd05e","vfCoarse":"49de5d33","vfFine":"afa83bdc","asystole":"741638a5","pWaveAsystole":"73e78d5f","agonal":"6142c308","pacedAAI":"4b99dc53","pacedVVI":"2b5c59f1","pacedDDD":"291a270e"};
```

Replace with:

```ts
const FIXTURE: Record<string, string> = {"sinus":"51b630bc","sinusBrady":"a6442a4c","sinusTachy":"6adb8b9f","sinusArrhythmia":"53084148","sinusPause":"fe934c89","atrialTach":"aa806f26","mat":"0bb8bad0","afib":"e44bcd91","aflutter":"a25cf05f","svtAvnrt":"4f07b590","svtAvrt":"cb153dc0","wpwSinus":"931149c9","preexcitedAf":"83ca6f9d","junctionalEscape":"5f277786","junctionalAccel":"b958fb55","junctionalTachy":"4d081563","avb1":"dff23667","avb2Mobitz1":"c4f36488","avb2Mobitz2":"7b3c2874","avb2to1":"744fce1c","avbHighGrade":"dc1c8c93","avb3Narrow":"dda3f2a9","avb3Wide":"3126ade7","idioventricular":"db89ed8d","aivr":"a8f563c4","vtMono":"2648f677","vtPoly":"286c8063","torsades":"32fbd05e","vfCoarse":"49de5d33","vfFine":"afa83bdc","asystole":"741638a5","pWaveAsystole":"73e78d5f","agonal":"d9075744","pacedAAI":"4b99dc53","pacedVVI":"2b5c59f1","pacedDDD":"291a270e"};
```

- [ ] **Step 4 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-agonal-rate.test.ts test/l2/ecg test/engine/fidelity-arrest.test.ts test/engine/circ-lowflow-arrest.test.ts`
→ pass (`agonal 6/min → 5.8`, `12 → 11.6`, `18 → 17.0`; fidelity 4b "ASYSTOLE raised once" holds only with Task A2 in).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/ecg/foci-ventricular.ts packages/engine-core/test/l2/ecg/nan-guard.test.ts packages/engine-core/test/engine/fu8-agonal-rate.test.ts
git commit -m "fix(ecg): the agonal rhythm runs at its rate setting (FU-8 A6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A7: The anaesthetic-agent tile and the inspired-CO2 extra (A10-E5, I-10)

**Files:** Modify `packages/skins/src/types.ts` (`TILE_PARAMS` += `AGENTS`; the extras doc), `packages/skins/src/resolve.ts`
(`TILE_COLOR_KEY.AGENTS`), `packages/skins/src/data/skins/philips-like.json` (AGENTS colour + provenance, AGENTS tile,
CO2 extra `IMCO2`), `packages/skins/src/data/skins/saadat-like.json` (AGENTS tile; provenance note),
`packages/skins/test/__snapshots__/resolve.test.ts.snap` (regenerated), `packages/renderer/src/alarm-view.ts`
(`TILE_NUMERICS.AGENTS`), `packages/renderer/src/numerics-neuro.ts` (`MODULE_TILES.AGENTS`, `formatAgents`),
`packages/renderer/src/device-ui.ts` (unit, formatter, `IMCO2` extra), `packages/renderer/test/fu5-tiles.test.ts`
(**E-FU8-3**: the philips-like CO2 extras line now carries `imCO2 0`), `apps/demo/src/stage4a/screen.ts` (4a's static preview keeps a sample for every `TileParam`). Create `packages/renderer/test/fu8-agents.test.ts`.

**Why:** research/11 §4 item 8 — `mac` and `etAa` are computed by 7f with no tile (the `AGENTS` colour key exists);
`imco2` is computed by Stage 3 and drawn nowhere on the skins. Stage 9 declined them (R-S9-8). The engine does not
publish WHICH agent, so the tile label is the glossary's generic EtAA (#30) and one colour (Philips SEV yellow, [S1]);
per-agent labels/colours wait for an agent-id output (listed for Stage 9's glossary work). `qtc` and `tempSite` (T2)
are left: T2 is already an extra, and a QTc tile is a layout choice (Waiting on Ali).

- [ ] **Step 1 — skins.**

In `packages/skins/src/types.ts`, find:

```ts
export const TILE_PARAMS = ['HR', 'NIBP', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'SpO2', 'TEMP', 'RR', 'CO2', 'ST', 'NMT', 'BFA', 'ICP', 'PbtO2', 'UO'] as const; // Stage 7f: NMT, BFA; Stage 7d: ICP, PbtO2, UO
```

Replace with:

```ts
export const TILE_PARAMS = ['HR', 'NIBP', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'SpO2', 'TEMP', 'RR', 'CO2', 'ST', 'NMT', 'BFA', 'ICP', 'PbtO2', 'UO', 'AGENTS'] as const; // Stage 7f: NMT, BFA; Stage 7d: ICP, PbtO2, UO; FU-8 (A10-E5): AGENTS
```

In `packages/skins/src/types.ts`, find:

```ts
  /** Secondary values drawn in the tile ('PI', 'PR', 'T2', 'DT', 'EtCO2', 'FiCO2', 'AWRR', 'PPV', 'MEAN'). */
```

Replace with:

```ts
  /** Secondary values drawn in the tile ('PI', 'PR', 'T2', 'DT', 'EtCO2', 'FiCO2', 'AWRR', 'PPV', 'MEAN'; FU-8: 'IMCO2' — the
   * inspired minimum CO2 under the vendor's word, imCO2 on Philips, FiCO2 elsewhere, research/11 glossary #16). */
```

In `packages/skins/src/resolve.ts`, find:

```ts
  ICP: 'ICP', PbtO2: 'PbtO2', UO: 'UO', // Stage 7d
};
```

Replace with:

```ts
  ICP: 'ICP', PbtO2: 'PbtO2', UO: 'UO', // Stage 7d
  AGENTS: 'AGENTS', // FU-8 (A10-E5)
};
```

In `packages/skins/src/data/skins/philips-like.json`, find:

```json
    "NMT": "#E0E0E0", "BFA": "#9AD0FF"
```

Replace with:

```json
    "NMT": "#E0E0E0", "BFA": "#9AD0FF", "AGENTS": "#FFFF00"
```

In `packages/skins/src/data/skins/philips-like.json`, find:

```json
      [{ "param": "HR", "size": "large" }, { "param": "ART", "extras": ["MEAN"] }, { "param": "NIBP", "extras": ["MEAN"] }, { "param": "NMT", "extras": ["TOF", "PTC"] }],
      [{ "param": "SpO2", "extras": ["PR", "PI"] }, { "param": "CO2", "extras": ["EtCO2", "AWRR"] }, { "param": "TEMP" }, { "param": "BFA", "extras": ["SR"] }]
```

Replace with:

```json
      [{ "param": "HR", "size": "large" }, { "param": "ART", "extras": ["MEAN"] }, { "param": "NIBP", "extras": ["MEAN"] }, { "param": "NMT", "extras": ["TOF", "PTC"] }, { "param": "AGENTS" }],
      [{ "param": "SpO2", "extras": ["PR", "PI"] }, { "param": "CO2", "extras": ["EtCO2", "AWRR", "IMCO2"] }, { "param": "TEMP" }, { "param": "BFA", "extras": ["SR"] }]
```

In `packages/skins/src/data/skins/philips-like.json`, find:

```json
    "colors.BFA": { "tag": "eng", "source": "ENG", "note": "FU-3 item 11: research/05 §2.1 has no BIS/depth row; the Stage 7f demo's tile colour (apps/demo/src/stage7f.ts) kept" },
    "layout.tiles": { "tag": "eng", "source": "iec-defaults layout.tiles; research/05 §2.7 (numerics in tiles on the right)", "note": "FU-3 item 11: the IEC default grid plus an NMT tile (TOF ratio %, count, PTC) and a BFA tile (depth index, SR) at the foot of the columns; research/05 documents no IntelliVue NMT/BIS tile layout. Both are module tiles, drawn only while the stimulator / depth monitor publishes. FU-5: the SpO2 tile shows the perfusion indicator beside the pulse (research/05 §6 [S2] IFU p. 120 'Perf')" },
```

Replace with:

```json
    "colors.BFA": { "tag": "eng", "source": "ENG", "note": "FU-3 item 11: research/05 §2.1 has no BIS/depth row; the Stage 7f demo's tile colour (apps/demo/src/stage7f.ts) kept" },
    "colors.AGENTS": { "tag": "documented", "source": "research/05 §2.1 [S1] GM/AGM tables", "note": "FU-8 (A10-E5): SEV yellow; the IntelliVue colours each agent (HAL red, ISO magenta, ENF orange, SEV yellow, DES cyan) — one tile colour until the engine publishes the agent id" },
    "layout.tiles": { "tag": "eng", "source": "iec-defaults layout.tiles; research/05 §2.7 (numerics in tiles on the right)", "note": "FU-3 item 11: the IEC default grid plus an NMT tile (TOF ratio %, count, PTC) and a BFA tile (depth index, SR) at the foot of the columns; research/05 documents no IntelliVue NMT/BIS tile layout. Both are module tiles, drawn only while the stimulator / depth monitor publishes. FU-5: the SpO2 tile shows the perfusion indicator beside the pulse (research/05 §6 [S2] IFU p. 120 'Perf')" },
```

In `packages/skins/src/data/skins/saadat-like.json`, find:

```json
        { "param": "BFA", "extras": ["BS%"] }
```

Replace with:

```json
        { "param": "BFA", "extras": ["BS%"] },
        { "param": "AGENTS" }
```

In `packages/skins/src/data/skins/saadat-like.json`, find:

```json
    "colors.AGENTS": { "tag": "unverified", "source": "research/06 §3.2; brief §6.8", "note": "not in the manual" },
```

Replace with:

```json
    "colors.AGENTS": { "tag": "unverified", "source": "research/06 §3.2; brief §6.8", "note": "not in the manual. FU-8 (A10-E5): now drawn — the AGENTS module tile (EtAA %, MAC) at the foot of column 2, shown only while an agent is measured [ENG layout]" },
```

Regenerate the snapshot and check its diff is ONLY the AGENTS tile/colour lines (prototype: 9 insertions):
`cd packages/skins && npx -y pnpm@9.15.9 exec vitest run -u test/resolve.test.ts && git diff --stat test/__snapshots__`.

- [ ] **Step 2 — renderer.**

In `packages/renderer/src/alarm-view.ts`, find:

```ts
  BFA: { numerics: ['di', 'sr'], limits: [] }, // Stage 7f
  ICP: { numerics: ['icpMean', 'cpp'], limits: ['ICP', 'CPP'] }, // Stage 7d
```

Replace with:

```ts
  BFA: { numerics: ['di', 'sr'], limits: [] }, // Stage 7f
  AGENTS: { numerics: ['etAa', 'mac'], limits: [] }, // FU-8 (A10-E5)
  ICP: { numerics: ['icpMean', 'cpp'], limits: ['ICP', 'CPP'] }, // Stage 7d
```

In `packages/renderer/src/numerics-neuro.ts`, find:

```ts
  BFA: { numerics: ['di', 'sr'], staleS: 5 },
};
```

Replace with:

```ts
  BFA: { numerics: ['di', 'sr'], staleS: 5 },
  AGENTS: { numerics: ['etAa', 'mac'], staleS: 5 }, // FU-8 (A10-E5): 7f publishes both at 1 Hz while an agent is present
};
```

In `packages/renderer/src/numerics-neuro.ts`, find:

```ts

/** The depth index (dashes while the EMG artefact makes it questionable) and the suppression ratio under `srLabel`. */
```

Replace with:

```ts

/**
 * FU-8 (A10-E5, research/11 §4 item 8): the anaesthetic-agent tile — end-tidal agent % (7f `etAa`, the dominant agent) and
 * the end-tidal MAC multiple (`mac`, Σ Fet/MAC-age). The engine does not publish WHICH agent, so the label is the
 * glossary's generic "EtAA" (glossary #30; Philips etSEV/etISO/etDES once the agent id is published).
 */
export function formatAgents(v: Values, noValue: string): { main: string; sub: string } {
  return { main: ok(v.etAa) ? v.etAa.value.toFixed(1) : noValue, sub: `MAC ${ok(v.mac) ? v.mac.value.toFixed(1) : noValue}` };
}

/** The depth index (dashes while the EMG artefact makes it questionable) and the suppression ratio under `srLabel`. */
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
import { formatBfa, formatNmt, modulePresent } from './numerics-neuro.ts'; // FU-3 item 11
```

Replace with:

```ts
import { formatAgents, formatBfa, formatNmt, modulePresent } from './numerics-neuro.ts'; // FU-3 item 11; FU-8 AGENTS
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
  NMT: 'TOF', // FU-3 item 11 (the depth index has no unit)
};
```

Replace with:

```ts
  NMT: 'TOF', // FU-3 item 11 (the depth index has no unit)
  AGENTS: '%', // FU-8 (A10-E5)
};
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
      else if (x === 'AWRR') out.push(`awRR ${this.text(v.awrr)}`);
      else if (x === 'T2') out.push(`T2 ${this.text(v.tempSite, 1)}`);
```

Replace with:

```ts
      else if (x === 'AWRR') out.push(`awRR ${this.text(v.awrr)}`);
      else if (x === 'IMCO2') out.push(`${this.r.skin.id === 'philips-like' ? 'imCO2' : 'FiCO2'} ${this.text(v.imco2)}`); // FU-8 (A10-E5): glossary #16
      else if (x === 'T2') out.push(`T2 ${this.text(v.tempSite, 1)}`);
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
      else if (p === 'BFA') ({ main, sub } = formatBfa(v, tile.spec.extras?.[0] ?? 'SR', g.noValue)); // FU-3 item 11
      else if (p === 'NIBP') {
```

Replace with:

```ts
      else if (p === 'BFA') ({ main, sub } = formatBfa(v, tile.spec.extras?.[0] ?? 'SR', g.noValue)); // FU-3 item 11
      else if (p === 'AGENTS') {
        ({ main, sub } = formatAgents(v, g.noValue)); // FU-8 (A10-E5)
        label = 'EtAA';
      }
      else if (p === 'NIBP') {
```

In `packages/renderer/test/fu5-tiles.test.ts`, find:

```ts
    ph.ui.onEvent(meas(20, { etco2: m(36, 20), awrr: m(12, 20) }));
```

Replace with:

```ts
    // FU-8 (A10-E5, E-FU8-3): the philips-like CO2 tile also prints the inspired CO2 under Philips' word, imCO2
    ph.ui.onEvent(meas(20, { etco2: m(36, 20), awrr: m(12, 20), imco2: m(0, 20) }));
```

In `packages/renderer/test/fu5-tiles.test.ts`, find:

```ts
    expect([ph.q('CO2', 'v'), ph.q('CO2', 's')]).toEqual(['36', 'awRR 12']);
```

Replace with:

```ts
    expect([ph.q('CO2', 'v'), ph.q('CO2', 's')]).toEqual(['36', 'awRR 12  imCO2 0']);
```

Create `packages/renderer/test/fu8-agents.test.ts`:

```ts
// FU-8 Task A7 (A10-E5; research/11 §4 item 8): the anaesthetic-agent module tile and the inspired-CO2 extra.
import { describe, expect, it } from 'vitest';
import { formatAgents, modulePresent } from '../src/numerics-neuro.ts';

const m = (value: number | null, at: number, flag: 'valid' | 'invalid' = 'valid') => ({ value, flag, at }) as never;

describe('FU-8 A7: the AGENTS tile', () => {
  it('EtAA % with one decimal and the MAC multiple; dashes without a value', () => {
    expect(formatAgents({ etAa: m(2.04, 5), mac: m(1.02, 5) }, '---')).toEqual({ main: '2.0', sub: 'MAC 1.0' });
    expect(formatAgents({}, '---')).toEqual({ main: '---', sub: 'MAC ---' });
  });
  it('is a module tile: drawn only while 7f publishes etAa/mac (5 s)', () => {
    expect(modulePresent('AGENTS', {}, 10)).toBe(false);
    expect(modulePresent('AGENTS', { etAa: m(1.9, 8) }, 10)).toBe(true);
    expect(modulePresent('AGENTS', { etAa: m(1.9, 2) }, 10)).toBe(false);
  });
});
```

In `apps/demo/src/stage4a/screen.ts`, find:

```ts
  ICP: { v: '12', x: 'CPP 78' }, PbtO2: { v: '25' }, UO: { v: '70', x: 'Σ 540 mL' }, // Stage 7d
};
```

Replace with:

```ts
  ICP: { v: '12', x: 'CPP 78' }, PbtO2: { v: '25' }, UO: { v: '70', x: 'Σ 540 mL' }, // Stage 7d
  AGENTS: { v: '2.0', x: 'MAC 1.0' }, // FU-8 (A10-E5)
};
```

- [ ] **Step 3 — verify.** `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 --filter @pme/renderer test && npx -y pnpm@9.15.9 -r typecheck`
→ skins 179, renderer 87 (prototype), typecheck clean (the demo's `Record<TileParam, …>` needs the AGENTS sample).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/skins/src/types.ts packages/skins/src/resolve.ts packages/skins/src/data/skins/philips-like.json packages/skins/src/data/skins/saadat-like.json packages/skins/test/__snapshots__/resolve.test.ts.snap packages/renderer/src/alarm-view.ts packages/renderer/src/numerics-neuro.ts packages/renderer/src/device-ui.ts packages/renderer/test/fu5-tiles.test.ts packages/renderer/test/fu8-agents.test.ts apps/demo/src/stage4a/screen.ts
git commit -m "feat(renderer): the anaesthetic-agent module tile (EtAA %, MAC) and the imCO2/FiCO2 extra (FU-8 A7, A10-E5)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A8: The oliguria flag needs measured urine (I-34)

**Files:** Modify `packages/engine-core/src/l2/organs/pipeline.ts` (the `kidney.oliguria` field; 7d, not edited by FU-6/FU-7). Create
`packages/engine-core/test/engine/fu8-oliguria.test.ts`.

**Why (D8):** with no completed 10-min bin `uopOver` returns the INSTANTANEOUS rate, so a 1.75 L bleed flagged OLIGURIA at
508 s, cleared it at 600 s (first bin 0.83 mL/kg/h) and flagged it again at 1200 s. One completed bin is required; the
full hour was prototyped and rejected (it breaks 7d's `organs-renal` "flag 30 min into a MANUAL haemorrhage", tables
17a). The teaching window is Ali's TQ40.

Create `packages/engine-core/test/engine/fu8-oliguria.test.ts`:

```ts
// FU-8 Task A8 (review pack; R-FU5-8): the OLIGURIA flag needs a completed 10-min urine bin.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A8: the oliguria flag waits for measured urine', () => {
  it('MODELED 1.75 L bleed over 10 min from 60 s: no OLIGURIA flag before the first 10-min urine bin (before FU-8: at 508 s from the instantaneous rate, off at 600 s, on again at 1200 s); from 1200 s the flag is the hourly UOP < 0.5', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
    const flags: Array<{ t: number; on: boolean; h: number }> = [];
    e.on((x) => {
      if (x.type === 'organs') flags.push({ t: x.t, on: x.kidney.oliguria, h: x.kidney.uop1hMlKgH });
    }, ['organs']);
    e.advanceTo(60);
    e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: { kind: 'bleed', volumeMl: 1750, overS: 600 } } as never);
    for (let t = 120; t <= 4800; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    const first = flags.find((f) => f.on);
    console.log(`fu8 A8: first OLIGURIA flag ${first ? `${first.t.toFixed(0)} s (1 h ${first.h.toFixed(2)} mL/kg/h)` : 'never'}`);
    expect(flags.filter((f) => f.t < 600 && f.on).map((f) => f.t)).toEqual([]);
    expect(flags.filter((f) => f.t >= 1200).every((f) => f.on === f.h < 0.5)).toBe(true);
    expect(flags.filter((f) => f.t >= 600 && f.t < 1200 && f.on).length).toBe(0); // the first bin still holds pre-bleed urine (0.83)
  }, 120_000);
});
```

In `packages/engine-core/src/l2/organs/pipeline.ts`, find:

```ts
      oliguria: uopOver(os.renal, 60 / os.renal.timeScale) < OLIGURIA_ML_KG_H, akiStage: os.renal.akiStage,
```

Replace with:

```ts
      // FU-8 (review pack "fires too early"; R-FU5-8): the flag needs at least one COMPLETED 10-min urine bin — with none,
      // `uopOver` returned the instantaneous rate, which flagged a 1.75 L bleed at 508 s (before 10 min of urine had been
      // collected), cleared it at 600 s (the first bin, 0.83 mL/kg/h) and flagged it again at 1200 s
      oliguria: os.renal.bins.length >= 1 && uopOver(os.renal, 60 / os.renal.timeScale) < OLIGURIA_ML_KG_H,
      akiStage: os.renal.akiStage,
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-oliguria.test.ts test/engine/organs- test/l2/organs test/l2/renal` → pass (15 files /
61 tests on the prototype; `first OLIGURIA flag 1200 s (1 h 0.49 mL/kg/h)`). Run the new test BEFORE the edit first:
it fails at 508 s.

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/organs/pipeline.ts packages/engine-core/test/engine/fu8-oliguria.test.ts
git commit -m "fix(organs): the OLIGURIA flag waits for a completed urine bin (FU-8 A8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A9: The 12-lead printout counts QRS complexes with the monitor's detector (I-33)

**Files:** Modify `packages/engine-core/src/l3/capture12/capture.ts`. Create `packages/engine-core/test/l3/fu8-capture12-arrest.test.ts`.

**Why (D7):** R peaks were local maxima above 60 % of the strip's maximum — noise in asystole (HR 93, axis 90°), P waves in
P-wave asystole (HR 25). The monitor's own detector (`l3/qrs.ts`, 500 Hz = the capture rate) over the 20 s pre-roll and
the window prints "HR --, axis --" in both; sinus/VT/AF/CHB unchanged within 1/min. VF prints the detector's count (Ali D3).

Create `packages/engine-core/test/l3/fu8-capture12-arrest.test.ts`:

```ts
// FU-8 Task A9 (review pack: "the 12-lead printout's HR and axis are unreliable in arrest; asystole reads HR 120"): the
// printout counts QRS complexes with the monitor's own detector (l3/qrs.ts). Before FU-8, on origin/main 0fd5397:
// asystole HR 93 / axis 90°, P-wave asystole HR 25, sinus 75 HR 76 / axis 24°.
import { describe, expect, it } from 'vitest';
import { capture12, createEngine } from '../../src/index.ts';

const cap = (rhythm: string, opts: Record<string, unknown> = {}) => {
  const e = createEngine({ seed: 7, mode: 'manual', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
  e.advanceTo(10);
  e.dispatch({ id: 'r', issuedBy: 'test', type: 'setRhythm', rhythm, opts } as never);
  e.advanceTo(50);
  return capture12(e).measurements;
};

describe('FU-8 A9: the 12-lead printout in arrest', () => {
  it.each(['asystole', 'pWaveAsystole'])('%s: HR and axis are not printed (null)', (id) => {
    expect(cap(id)).toEqual({ hr: null, axisDeg: null });
  });
  it('organised rhythms keep their numbers: sinus 75 → 74–78, axis 0–60°; VT 170 → 167–173; AF 100 → 95–105', () => {
    const s = cap('sinus', { rateBpm: 75 });
    expect(s.hr).toBeGreaterThanOrEqual(74);
    expect(s.hr).toBeLessThanOrEqual(78);
    expect(s.axisDeg).toBeGreaterThanOrEqual(0);
    expect(s.axisDeg).toBeLessThanOrEqual(60);
    const vt = cap('vtMono', { rateBpm: 170 }).hr as number;
    expect(Math.abs(vt - 170)).toBeLessThanOrEqual(3);
    const af = cap('afib', { rateBpm: 100 }).hr as number;
    expect(Math.abs(af - 100)).toBeLessThanOrEqual(5);
  });
});
```

In `packages/engine-core/src/l3/capture12/capture.ts`, find:

```ts
import { createFilterState, designEcgFilter, filterSample, FILTER_BANDS } from '../ecg-filter.ts';
import { LEAD_IDS, type LeadId, type MonitorEngine } from '../../types.ts';
```

Replace with:

```ts
import { createFilterState, designEcgFilter, filterSample, FILTER_BANDS } from '../ecg-filter.ts';
import { createQrsState, qrsStep } from '../qrs.ts'; // FU-8: QRS_RATE = CAPTURE_RATE = 500 Hz
import { LEAD_IDS, type LeadId, type MonitorEngine } from '../../types.ts';
```

In `packages/engine-core/src/l3/capture12/capture.ts`, find:

```ts
  const tmp = new Float64Array(12);
  for (let i = 0; i < total; i++) {
```

Replace with:

```ts
  const tmp = new Float64Array(12);
  // FU-8 (review pack: "asystole reads HR 120"): the R peaks are the monitor's own QRS detections (l3/qrs.ts) on lead
  // II over the pre-roll and the window, not local maxima above 60 % of the strip's maximum — which found 93/min in
  // asystole (noise), 25 in P-wave asystole (P waves) and 49/65 in coarse/fine VF
  const qrs = createQrsState(0);
  const rs: number[] = [];
  for (let i = 0; i < total; i++) {
```

In `packages/engine-core/src/l3/capture12/capture.ts`, find:

```ts
    if (i < pre) continue;
    projectLeads(x, y, z, tmp);
```

Replace with:

```ts
    projectLeads(x, y, z, tmp);
    const r = qrsStep(qrs, tmp[1] as number); // lead II (LEAD_IDS order I, II, III, …)
    if (r >= pre) rs.push(r - pre);
    if (i < pre) continue;
```

In `packages/engine-core/src/l3/capture12/capture.ts`, find:

```ts
    measurements: measure(leads),
```

Replace with:

```ts
    measurements: measure(leads, rs),
```

In `packages/engine-core/src/l3/capture12/capture.ts`, find:

```ts
/** R peaks on lead II: local maxima above 60 % of the strip's maximum, ≥ 250 ms apart [ENG]. */
function rPeaks(x: Float32Array): number[] {
  let mx = 0;
  for (const v of x) mx = Math.max(mx, v);
  const out: number[] = [];
  for (let i = 1; i < x.length - 1; i++) {
    const v = x[i] as number;
    if (v < 0.6 * mx || v < (x[i - 1] as number) || v < (x[i + 1] as number)) continue;
    if (out.length > 0 && i - (out[out.length - 1] as number) < 125) continue;
    out.push(i);
  }
  return out;
}

function measure(leads: Record<LeadId, Float32Array>): Capture12['measurements'] {
  const r = rPeaks(leads.ecgII);
```

Replace with:

```ts
function measure(leads: Record<LeadId, Float32Array>, r: readonly number[]): Capture12['measurements'] {
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/fu8-capture12-arrest.test.ts test/l3/capture12.test.ts && npx -y pnpm@9.15.9 --filter @pme/renderer test`
→ pass (the renderer's 12-lead view test reads `measurements` only through the paper header).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l3/capture12/capture.ts packages/engine-core/test/l3/fu8-capture12-arrest.test.ts
git commit -m "fix(capture12): the printout HR and axis come from the monitor QRS detector; none in asystole (FU-8 A9)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A10: The coronary supply is read beat by beat — rapid AF no longer kills a normal heart (C3, I-49)

**Files:** Modify `packages/engine-core/src/l2/circ/coronary.ts` (`COR_WIN_BEATS_S`, the MODELED beat-by-beat flow in `stepCoronary`,
`TAU_HYP_S` 300 → 220 under a declared deviation), `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` (**E-FU8-4**: the asphyxia
rig runs 24 min instead of 20 so the 6–10 min post-arrest window fits; no band changes). Create `packages/engine-core/test/engine/fu8-coronary.test.ts`
(its C2 describe is added by Task A11 — create the whole file here; its A11 tests fail until A11).

**File overlap (declared):** `coronary.ts` is in neither FU-6's nor FU-7's file list. The orchestrator placed C3 in
Part A because FU-7's AF rigs (Tasks 11, 12, 19) need it (research/19 §4 item 5).

**Why:** `stepCoronary` read supply from the LAST beat only; on a short AF cycle the next activation starts before the
ventricle relaxes ("LVEDP" 60–115 mmHg), CoPP < 0 and the supply was ZERO for the whole second (123 of 240 samples):
a healthy 40 y went kIsch 0 → agonal at +15.5 min (CM-15c), the 70 y esmolol arm arrested (CM-15b). MODELED now
averages the beats of the last 2 s, each with its own diastolic fraction and CoPP taken at the end of ITS OWN diastole
(the next beat's `lvedp`); a regular rhythm reads the same number; one beat in the window (unit rigs) reads as before.

**The declared deviation (Open question 2):** FU-3's asphyxial arrest was partly driven by the SAME artefact — the escape
pairs of the hypoxic bradycardia (R–R 1.5 s then 0.5 s) read as HR 110–130, a 5 % diastolic fraction, flow 0.06. With
the honest supply and τ 300 s there is no arrest in 20 min. `TAU_HYP_S` is an [ENG] constant fitted to that window, and
FU-4 re-fitted it by scan at its gate (D3); re-scanned here: 200 → PEA +9.82 min, 220 → +10.58, 240 → +11.33, 300 ✗.
Step 3 repeats the scan on the executor's tree and picks the middle of the passing plateau.

- [ ] **Step 1 — tests.**

Create `packages/engine-core/test/engine/fu8-coronary.test.ts`:

```ts
// FU-8 Tasks A10–A11 (research/19 C3, C2): the coronary supply is read beat by beat, and ST follows the filtered
// deficit. Seed 7, MODELED, ventilated. Before FU-8 (origin/main 0fd5397): AF 150 in a healthy 40 y went kIsch 0 and
// agonal at +15.5 min (CM-15c); 3-vessel CAD held at HR 130 reached kIsch 0.65 with ST 0.00 mV.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type Cor = { kIsch: number; stMv: number };
async function held(patient: Record<string, unknown>, cmd: Record<string, unknown>, endS: number) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, ...patient, sensors: { abp: 'connected' } } as never });
  const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event });
  e.advanceTo(1);
  e.dispatch({ id: 'a', issuedBy: 'test', ...ev({ kind: 'airwayDevice', device: 'ett' }) } as never);
  e.dispatch({ id: 'b', issuedBy: 'test', ...ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 550, peep: 5, fio2: 0.5 }) } as never);
  e.advanceTo(120);
  e.dispatch({ id: 'c', issuedBy: 'test', ...cmd } as never);
  let kMin = 1;
  let stMin = 0;
  let arrest = false;
  for (let t = 130; t <= endS; t += 10) {
    e.advanceTo(t);
    const st = (e as unknown as { st: { rhythm: { id: string }; hemo: { circ: { cor: Cor } } } }).st;
    kMin = Math.min(kMin, st.hemo.circ.cor.kIsch);
    stMin = Math.min(stMin, st.hemo.circ.cor.stMv);
    if (['agonal', 'asystole', 'vfCoarse', 'vfFine'].includes(st.rhythm.id)) arrest = true;
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { kMin, stMin, arrest };
}

describe('FU-8 A10 (C3): AF 150 does not make a normal heart fail', () => {
  it('healthy 40 y, AF 150/min for 20 min: no arrest, kIsch ≥ 0.75 (before: 0 and agonal at +15.5 min; measured 0.84 after FU-8 — the quiet band ≥ 0.9 is the it.fails below)', async () => {
    const r = await held({}, { type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 150 } }, 120 + 1200);
    console.log(`fu8 A10: AF 150 kIsch min ${r.kMin.toFixed(2)}, arrest ${r.arrest}`);
    expect(r.arrest).toBe(false);
    expect(r.kMin).toBeGreaterThanOrEqual(0.75);
  }, 120_000);
  it.fails('healthy 40 y, AF 150/min: kIsch ≥ 0.9 throughout (research/19 CM-15c quiet band) — measured 0.84 in this rig after FU-8 (0.80 in CM-15c; Ali Q8)', async () => {
    expect((await held({}, { type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 150 } }, 120 + 1200)).kMin).toBeGreaterThanOrEqual(0.9);
  }, 120_000);
});

describe('FU-8 A11 (C2): ST depression follows the ischaemia', () => {
  it('3-vessel CAD (CFR 1.4), 65 y, HR held at 130 for 10 min: ST ≤ −0.1 mV while kIsch < 0.85 (before: ST 0.00 at kIsch 0.65)', async () => {
    const r = await held({ ageY: 65, weightKg: 80, conditions: [{ id: 'cad', grade: 'severe' }] }, { type: 'setTarget', variable: 'hr', value: 130 }, 720);
    console.log(`fu8 A11: CAD HR 130 kIsch min ${r.kMin.toFixed(2)}, ST min ${r.stMin.toFixed(3)} mV`);
    expect(r.kMin).toBeLessThan(0.85);
    expect(r.stMin).toBeLessThanOrEqual(-0.1);
  }, 120_000);
  it('healthy 65 y at HR 130: no ST (quiet)', async () => {
    const r = await held({ ageY: 65, weightKg: 80 }, { type: 'setTarget', variable: 'hr', value: 130 }, 720);
    expect(r.stMin).toBeGreaterThan(-0.05);
  }, 120_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-coronary.test.ts -t "A10"` → the first test FAILS (kIsch 0, arrest), the `it.fails` holds.

- [ ] **Step 2 — the supply.**

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
  let demand: number;
  if (noBeat || !b) {
```

Replace with:

```ts
  let demand: number;
  let beatFlow: number | null = null; // FU-8 (C3): the MODELED beat-by-beat flow term (cfr applied below)
  if (noBeat || !b) {
```

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
    cpp = b.aoDia - b.lvedp - (modeled ? (b.pItEd ?? P_PL0) : 0); // FU-4 G1: aortic − ABSOLUTE LV end-diastolic pressure (PEEP, tension PTX raise it)
    const hrR = hr / r.hr;
```

Replace with:

```ts
    cpp = b.aoDia - b.lvedp - (modeled ? (b.pItEd ?? P_PL0) : 0); // FU-4 G1: aortic − ABSOLUTE LV end-diastolic pressure (PEEP, tension PTX raise it)
    // FU-8 (C3, research/19): an irregular rhythm is perfused beat by beat. Supply was read from the LAST beat alone,
    // so in AF 150 one short cycle — the next activation starting before the ventricle relaxed, "LVEDP" 60–115 mmHg,
    // CoPP < 0 — zeroed the supply for the whole second (123 of 240 samples), and a healthy 40 y heart went kIsch 0 →
    // agonal +15.5 min. MODELED: the flow is the duration-weighted mean over the beats of the last COR_WIN_BEATS_S
    // seconds, each with its own diastolic fraction and CoPP; a beat without a diastole contributes nothing for its
    // own duration only. With a single beat in the window (unit rigs, very slow rates) it reads exactly as before.
    const tEnd = b.t + b.dur;
    const win = modeled ? beats.filter((x) => x.t + x.dur > tEnd - COR_WIN_BEATS_S) : [];
    if (win.length >= 2) {
      let fSum = 0;
      let cSum = 0;
      let dSum = 0;
      for (let i = 0; i < win.length; i++) {
        const x = win[i] as CircBeat;
        const ts = x.avClose > 0 ? x.avClose + IVR_S : 0.6 * x.dur;
        const f = Math.max(0.05, (x.dur - ts) / x.dur);
        // the beat's OWN diastole ends where the next beat starts: its end-diastolic pressure is the next beat's
        // `lvedp` (the last beat's diastole is still running: its own, as before); aoDia is this beat's minimum, at
        // the same instant. A regular rhythm reads the same number either way.
        const ed = win[i + 1] ?? x;
        const cp = x.aoDia - ed.lvedp - (ed.pItEd ?? P_PL0);
        fSum += Math.max(0, (cp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (f / c.dtf0) * x.dur;
        cSum += cp * x.dur;
        dSum += x.dur;
      }
      beatFlow = fSum / dSum;
      cpp = cSum / dSum;
    }
    const hrR = hr / r.hr;
```

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
  const flow = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
```

Replace with:

```ts
  const flow = cfr * (beatFlow ?? Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0));
```

- [ ] **Step 3 — the τ re-scan (declared deviation) and the rig length (E-FU8-4).** Scan `TAU_HYP_S` ∈ {180, 200, 220, 240,
260, 280} with the rig at 24 min, running `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-hypoxic-arrest.test.ts` each time; record the arrest
time per value in the gate note; pick the MIDDLE of the values where all 8 tests pass (prototype: 220 → +10.58 min).
If no value passes, keep 300, pin the three asphyxia tests `it.fails` with the measured "no arrest" and stop for the
orchestrator.

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
 */
export const TAU_HYP_S = 300;
```

Replace with:

```ts
 * FU-8 (C3, plan Task A12; declared deviation, Open question 2): those fits were made with the coronary supply read
 * from the LAST beat, and the asphyxial bradycardia's escape pairs (R–R 1.5 s then 0.5 s) read as HR 110–130 → a 5 %
 * diastolic fraction → flow 0.06 for whole seconds; the beat-by-beat supply removed that artefact and, at 300 s, the
 * arrest (none in 20 min). Re-scan on the corrected supply (rig 24 min): 200 → PEA +9.82 min, 220 → +10.58, 240 →
 * +11.33, 300 ✗ — 220 s, inside Varvarousi's 9.5 ± 1.4 and DeBehnke's 11.4 ± 2.4 min.
 */
export const TAU_HYP_S = 220;
```

In `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`, find:

```ts
const asphyxiaCourse = (): Promise<Course> => (asphyxiaRun ??= asphyxia('modeled', false, 20 * 60, true));
```

Replace with:

```ts
// FU-8 (Task A12, E-FU8-4): the rig runs 24 min (was 20) — with the beat-by-beat coronary supply the arrest comes at
// +10.58 min after SaO2 < 60 % (2 min), so the 6–10 min post-arrest window needs the longer run; no band moves
const asphyxiaCourse = (): Promise<Course> => (asphyxiaRun ??= asphyxia('modeled', false, 24 * 60, true));
```

In `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`, find:

```ts
    const c = await asphyxia('modeled', false, 20 * 60, false, true);
```

Replace with:

```ts
    const c = await asphyxia('modeled', false, 24 * 60, false, true);
```

- [ ] **Step 4 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/engine/fu8-coronary.test.ts -t "A10" test/engine/circ- test/engine/clinical-suite.test.ts test/engine/af- test/engine/fidelity-lowflow.test.ts`
→ pass. Prototype: coronary unit tests 102; clinical suite unchanged (S13 CoPP 25.1–28.8, CPR alone no pulse CoPP 2.9–3.6,
class IV ROSC +119 s, exsanguination 3 L +180 / 3.5 L +170 s); `fu8 A10: AF 150 kIsch min 0.84, arrest false`.
Re-run the CM cells: `cd ../research/19-audit-scripts && CM_OUT=<scratchpad>/fu-8-followups/cm.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts CM-15c CM-15b CM-05b CM-04a`
→ CM-15c kIschMin40 0.8 (was 0), no arrest in either arm (was agonal +15.5 min); CM-15b no arrest. Paste the rows into
the gate note beside research/19's column (research/12 §7).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/coronary.ts packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts packages/engine-core/test/engine/fu8-coronary.test.ts
git commit -m "fix(coronary): MODELED supply beat by beat over the last 2 s — rapid AF no longer kills a normal heart; TAU_HYP_S re-scanned (FU-8 A10, C3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A11: ST depression follows the filtered ischaemia (C2, I-50)

**Files:** Modify `packages/engine-core/src/l2/circ/coronary.ts` (`ST_DEFICIT_MIN`; the ST target in `stepCoronary`). The tests are in
`fu8-coronary.test.ts` (Task A10).

**Why:** the ST timer counted CONTINUOUS seconds of the instantaneous δ > 0.1 and reset on any dip (3-vessel CAD at HR
110: δ 0–0.27, longest run 3 s) — the heart lost 14–35 % contractility and never showed ST. ST now follows the SAME
filtered deficit that drives kIsch, (1 − kIsch)/G_ISCH; the 30–60 s lag is kIsch's τ 20 s plus the ST filter (15/60 s).
`ischT` stays in the state for old snapshots, unread.

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
export const ST_LAG_S = 45; // 30–60 s (tables §3 stLag)
export const IVR_S = 0.06; // isovolumic relaxation after aortic closure [ENG]
```

Replace with:

```ts
export const ST_LAG_S = 45; // 30–60 s (tables §3 stLag)
/** FU-8 (C2): ST depression appears once the filtered flow deficit exceeds this (the old instantaneous δ > 0.1 rule). */
export const ST_DEFICIT_MIN = 0.1;
/** FU-8 (C3): the MODELED coronary supply averages the beats that ended in this many seconds [ENG]. */
export const COR_WIN_BEATS_S = 2;
export const IVR_S = 0.06; // isovolumic relaxation after aortic closure [ENG]
```

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
  c.ischT = c.delta > 0.1 ? c.ischT + dt : 0;
  const stTarget = c.ischT >= ST_LAG_S ? -Math.min(0.3, c.delta) : 0;
```

Replace with:

```ts
  // FU-8 (C2, research/19): ST follows the SAME filtered flow deficit that drives kIsch — (1 − kIsch)/G_ISCH, the
  // deficit low-passed with τ 20 s — instead of a continuous-seconds timer on the instantaneous δ that reset on any
  // beat-to-beat dip (3-vessel CAD at HR 110: δ 0–0.27, longest run above 0.1 3 s, ST never appeared while kIsch fell
  // to 0.80). The 45 s lag (tables §3 stLag 30–60 s) is kIsch's τ 20 s plus the ST filter below. `ischT` is kept for
  // older snapshots and no longer read.
  const dF = (1 - c.kIsch) / G_ISCH;
  const stTarget = dF > ST_DEFICIT_MIN ? -Math.min(0.3, dF) : 0;
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-coronary.test.ts test/l2/circ` → pass: `fu8 A11: CAD HR 130 kIsch min 0.67, ST min
-0.214 mV` (before: 0.65 / 0.00); healthy 65 y at 130: no ST. At HR 110 the filtered deficit is 0.10 — on the threshold,
no ST (research/19 CM-04a stays WR: the size is Ali's Q6).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/coronary.ts
git commit -m "fix(coronary): ST depression follows the filtered flow deficit, not a resettable timer (FU-8 A11, C2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A12: Each age band rests at its own set point (C5, I-52, I-35)

**Files:** Modify `packages/engine-core/src/l2/circ/profile.ts` (`BAND.pp`, `TARGET_MAP_ABOVE_SET`, the band targets; the elderly override
kept with its reason). Create `packages/engine-core/test/engine/fu8-body-size.test.ts` (its A13 describe fails until Task A13).

**File overlap (declared):** FU-7 Task 8 edits `profile.ts` under E-FU7-3 (β-occupancy, other lines); FU-7's Task 0
re-anchors.

**Why (D9):** every band was stabilised at 120/80 whatever its set point — a term neonate (set point 45) at MAP 93, which
the reflex then fought (82–89 at 600 s, SV 1.1 mL, CO 0.15 L/min; ventilated HR 199–214). The band targets are now
centred on the band set point with a PALS pulse pressure; the adult (120/80 ↔ 90) and HFrEF (105/65 ↔ 75) are unchanged;
the ELDERLY keep 140/80 (moving it to 138/78 broke 7d's check-18 CBF rig, measured) and HTN keeps its +15/+5 (centring
it on the +20 set point moved check 18 by 3–7 %: both are research/19 C5 rows for Ali). The per-kg cardiac output of
children stays low — the tables' §2.2 ISOMETRIC scaling — pinned `it.fails` for Ali's scaling decision.

Create `packages/engine-core/test/engine/fu8-body-size.test.ts`:

```ts
// FU-8 Tasks A12–A13 (research/19 C5, C4; review pack "the neonatal profile is broken"): one resting pressure per age
// band, and one obese patient. MODELED, seed 7, 600 s spontaneous (A12) / 300 s ventilated (A13).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type C = { beats: Array<{ map: number; sv: number }>; qFwd: number; prof: { bloodVolumeMl: number } };
async function rest(patient: Record<string, unknown>, endS: number, vent = false) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sex: 'M', ...patient, sensors: { abp: 'connected' } } as never });
  if (vent) {
    e.advanceTo(1);
    e.dispatch({ id: 'a', issuedBy: 'test', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } } as never);
    e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } } as never);
  }
  for (let t = 60; t <= endS; t += 60) {
    e.advanceTo(t);
    await new Promise((r) => setImmediate(r));
  }
  const c = (e as unknown as { st: { hemo: { circ: C } } }).st.hemo.circ;
  const bs = c.beats.slice(-6);
  return { map: bs.reduce((a, b) => a + b.map, 0) / bs.length, co: c.qFwd * 0.06, bv: c.prof.bloodVolumeMl };
}

describe('FU-8 A12 (C5): the resting pressure follows the band set point', () => {
  it.each([
    ['term neonate 3.5 kg: MAP 45–70 (before FU-8 82–89; measured 64)', { ageY: 0.01, weightKg: 3.5 }, 45, 70],
    ['infant 7 kg: MAP 50–70 (before 98–105; measured 62)', { ageY: 0.5, weightKg: 7 }, 50, 70],
    ['child 20 kg: MAP 60–85 (before 100–105; measured 79)', { ageY: 6, weightKg: 20 }, 60, 85],
  ] as const)('%s at 600 s (PALS ranges; tables §1.1 MAP_set)', async (_n, pt, lo, hi) => {
    const r = await rest({ ...pt }, 600);
    console.log(`fu8 A12 ${_n}: MAP ${r.map.toFixed(0)}, CO ${r.co.toFixed(2)} L/min`);
    expect(r.map).toBeGreaterThanOrEqual(lo);
    expect(r.map).toBeLessThanOrEqual(hi);
  }, 120_000);
  it.fails('term neonate 3.5 kg: cardiac output ≥ 150 mL/kg/min (PALS ≈ 200) — measured 0.31 L/min = 89 mL/kg/min after FU-8 (isometric §2.2 scaling: Ali, plan "Waiting on Ali")', async () => {
    expect((await rest({ ageY: 0.01, weightKg: 3.5 }, 600)).co / 3.5).toBeGreaterThanOrEqual(0.15);
  }, 120_000);
});

describe('FU-8 A13 (C4): one obese patient', () => {
  it('127 kg / 175 cm (BMI 41): blood volume by Lemmens (6.3–6.7 L) and resting CO 1.2–1.5 × the 70 kg adult (tables §1.3 × 1.35); before FU-8: 8.89 L and × 1.85', async () => {
    const lean = await rest({ ageY: 40, weightKg: 70, heightCm: 175 }, 300, true);
    const obese = await rest({ ageY: 40, weightKg: 127, heightCm: 175 }, 300, true);
    console.log(`fu8 A13: BV ${obese.bv.toFixed(0)} mL, CO ${obese.co.toFixed(2)} vs ${lean.co.toFixed(2)} (× ${(obese.co / lean.co).toFixed(2)})`);
    expect(obese.bv).toBeGreaterThanOrEqual(6300);
    expect(obese.bv).toBeLessThanOrEqual(6700);
    expect(obese.co / lean.co).toBeGreaterThanOrEqual(1.2);
    expect(obese.co / lean.co).toBeLessThanOrEqual(1.5);
  }, 120_000);
});
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
const BAND = {
  // bvMlKg (M), MAP set, resting HR, vagal gain ms/mmHg, sympathetic ×, arterial compliance × (tables §1.1)
  neonate: { bv: 87, map: 45, hr: 140, gv: 4, gs: 0.7, c: 1.0 },
  infant: { bv: 78, map: 55, hr: 130, gv: 7, gs: 0.8, c: 1.0 },
  child: { bv: 72, map: 68, hr: 100, gv: 12, gs: 1, c: 1.0 },
  adolescent: { bv: 70, map: 80, hr: 75, gv: 17, gs: 1, c: 1.0 },
  adult: { bv: BV_ML_KG_M, map: 90, hr: 70, gv: 15, gs: 1, c: 1.0 },
  elderly: { bv: 62, map: 95, hr: 65, gv: 6.5, gs: 0.6, c: 0.5 },
```

Replace with:

```ts
/** FU-8 (C5): the stabiliser's resting MAP (radial) sits this far above the reflex set point — the adult default
 * 120/80 (MAP 93.3) against 90 [ENG: kept so no adult row moves]. */
export const TARGET_MAP_ABOVE_SET = 10 / 3;

const BAND = {
  // bvMlKg (M), MAP set, resting HR, vagal gain ms/mmHg, sympathetic ×, arterial compliance × (tables §1.1);
  // pp: FU-8 (C5) the resting pulse pressure the stabiliser targets [TXT: PALS normal ranges — neonate 60–75/30–45,
  // infant 72–104/37–56, child 86–120/42–80, adolescent 110–131/64–83 mmHg; adult 120/80; elderly 140/80, ISH]
  neonate: { bv: 87, map: 45, hr: 140, gv: 4, gs: 0.7, c: 1.0, pp: 30 },
  infant: { bv: 78, map: 55, hr: 130, gv: 7, gs: 0.8, c: 1.0, pp: 30 },
  child: { bv: 72, map: 68, hr: 100, gv: 12, gs: 1, c: 1.0, pp: 35 },
  adolescent: { bv: 70, map: 80, hr: 75, gv: 17, gs: 1, c: 1.0, pp: 40 },
  adult: { bv: BV_ML_KG_M, map: 90, hr: 70, gv: 15, gs: 1, c: 1.0, pp: 40 },
  elderly: { bv: 62, map: 95, hr: 65, gv: 6.5, gs: 0.6, c: 0.5, pp: 60 },
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
    targets: { sbp: 120, dbp: 80, hr: b.hr, cvp: 5 }, mapSet: b.map, hrRest: b.hr,
```

Replace with:

```ts
    // FU-8 (C5, research/19): the band's resting pressure is centred on the band's reflex set point, with the band's
    // pulse pressure — ONE number per age band. Before, every band was tuned to 120/80 whatever its set point: a term
    // neonate (set point 45) stabilised at MAP 93 and sat at 82–89 at 600 s (SV 1.1 mL, CO 0.15 L/min). The adult
    // (120/80 ↔ 90) is unchanged; conditions then apply their deltas as before (HTN, HFrEF: Waiting on Ali, plan D13).
    targets: { sbp: b.map + TARGET_MAP_ABOVE_SET + (2 * b.pp) / 3, dbp: b.map + TARGET_MAP_ABOVE_SET - b.pp / 3, hr: b.hr, cvp: 5 }, mapSet: b.map, hrRest: b.hr,
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
  };
  if (band === 'elderly') r.targets = { sbp: 140, dbp: 80, hr: b.hr, cvp: 5 };
```

Replace with:

```ts
  };
  // the elderly keep 140/80 (MAP 100 against the set point 95): 7d's check 18 (75 y HTN CBF plateau) is fitted to it,
  // and the elderly resting pressure is research/19 C5's Ali question (plan "Waiting on Ali")
  if (band === 'elderly') r.targets = { sbp: 140, dbp: 80, hr: b.hr, cvp: 5 };
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-body-size.test.ts -t "A12" test/l2/circ test/engine/organs-htn.test.ts test/engine/circ-manual-ischaemia.test.ts test/engine/resp-child`
→ pass: neonate MAP 64 (was 82–89), CO 0.31 L/min (was 0.15); infant 62 (98–105), 0.60 (0.47); child 79 (100–105);
ventilated neonate HR 152 (199–214). Then the whole fast set (paediatric respiratory rigs live there).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/profile.ts packages/engine-core/test/engine/fu8-body-size.test.ts
git commit -m "fix(profile): each age band rests at its own set point, not at 120/80 (FU-8 A12, C5)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A13: One obese patient — the circulation sized by the tables' body-size rule (C4, I-51)

**Files:** Modify `packages/engine-core/src/l2/circ/profile.ts` (`CircProfile.heightCm`, `OBESE_BMI`, `bodySize`, the sizing line),
`packages/engine-core/src/l2/hemo/pipeline.ts` (`circProfileOf` passes `heightCm`).

**Why:** the circulation was sized on TOTAL weight (127 kg / 175 cm: CO × 1.85, BV 8.89 L = 70 mL/kg) while Stage 3 and 7c
hold 6.5 L. Tables §1.3: Lemmens' BV 70/√(BMI/22) mL/kg × actual weight, and resting CO × 1.35 at BMI ≥ 40 "emerges
from VO2 and blood volume" — the adjusted weight (IBW + 0.4·excess, Stage 3's rule) gives exactly that. A profile
without a height is sized as before. The LUNG half (profile FRC vs the `obesity` lung condition, 2.7 vs 1.43 min) is
FU-6's R4 re-tune on this definition and Ali's Q3 — handed (see "Handed to").

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
  weightKg: number;
  conditions: CircCondition[];
```

Replace with:

```ts
  weightKg: number;
  /** FU-8 (C4): height, for the body-size rule (tables §1.3); absent = sized on the weight as before. */
  heightCm?: number;
  conditions: CircCondition[];
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts

export function resolveProfile(pr: CircProfile = DEFAULT_PROFILE): ResolvedProfile {
```

Replace with:

```ts

/** FU-8 (C4): BMI above which the circulation is sized on the adjusted weight (tables §1.3 obesity classes I–III). */
export const OBESE_BMI = 30;
/**
 * FU-8 (C4): the circulation's body size — the weight it is scaled on and, when obese, Lemmens' blood volume per kg of
 * ACTUAL weight (applied to `pr.weightKg`, so `bvMlKg × weightKg` is the patient's blood volume). IBW: Devine, as
 * Stage 3 (l2/gas/params.ts `gasPatient`). Non-obese or no height: the weight as given, band blood volume.
 */
export function bodySize(pr: CircProfile, band: AgeBand): { weightKg: number; bvMlKg: number | null } {
  if (pr.heightCm === undefined || (band !== 'adult' && band !== 'elderly')) return { weightKg: pr.weightKg, bvMlKg: null };
  const bmi = pr.weightKg / (pr.heightCm / 100) ** 2;
  if (bmi <= OBESE_BMI) return { weightKg: pr.weightKg, bvMlKg: null };
  const ibw = (pr.sex === 'F' ? 45.5 : 50) + 0.91 * (pr.heightCm - 152.4);
  return { weightKg: ibw + 0.4 * Math.max(0, pr.weightKg - ibw), bvMlKg: 70 / Math.sqrt(bmi / 22) };
}

export function resolveProfile(pr: CircProfile = DEFAULT_PROFILE): ResolvedProfile {
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
  const w = pr.weightKg / 70; // tables §2.2: volumes/compliances ×W/70, resistances and elastances ×70/W
  const bvKg = pr.sex === 'F' && (band === 'adult' || band === 'elderly') ? BV_ML_KG_F : b.bv;
```

Replace with:

```ts
  // FU-8 (C4, research/19; tables §1.3): ONE body-size rule. An obese adult (BMI > 30) is sized on the ADJUSTED weight
  // (IBW + 0.4·excess — the rule Stage 3 and 7c already use) and carries Lemmens' blood volume 70/√(BMI/22) mL/kg ×
  // actual weight; before, the circulation was sized on the total weight (127 kg / 175 cm: CO × 1.85, BV 8.89 L = 70 mL/kg)
  // while blood/gas held 6.5 L. Tables §1.3: resting CO × 1.35 at BMI ≥ 40 "emerges from VO2 and blood volume".
  const size = bodySize(pr, band);
  const w = size.weightKg / 70; // tables §2.2: volumes/compliances ×W/70, resistances and elastances ×70/W
  const bvKg = size.bvMlKg ?? (pr.sex === 'F' && (band === 'adult' || band === 'elderly') ? BV_ML_KG_F : b.bv);
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
    vCprRef: V_CPR_REF_FRAC * bvKg * pr.weightKg, // FU-4 F1(a)
```

Replace with:

```ts
    vCprRef: V_CPR_REF_FRAC * bvKg * pr.weightKg, // FU-4 F1(a); FU-8 (C4): bvKg is per kg of ACTUAL weight
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
    weightKg: profile?.weightKg ?? DEFAULT_PROFILE.weightKg,
    conditions: (profile?.conditions ?? []).filter((c) => known.includes(c.id)).map((c) => ({ ...c, id: c.id as ConditionId })),
```

Replace with:

```ts
    weightKg: profile?.weightKg ?? DEFAULT_PROFILE.weightKg,
    ...(profile?.heightCm !== undefined ? { heightCm: profile.heightCm } : {}), // FU-8 (C4): the body-size rule
    conditions: (profile?.conditions ?? []).filter((c) => known.includes(c.id)).map((c) => ({ ...c, id: c.id as ConditionId })),
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-body-size.test.ts test/l2/circ test/engine/circ-` → pass: `fu8 A13: BV 6475 mL, CO 7.20
vs 5.34 (× 1.35)` (before: 8 890 mL, × 1.85). Then the fast set (Stage 3's obese apnoea rigs read the gas side only).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/profile.ts packages/engine-core/src/l2/hemo/pipeline.ts
git commit -m "fix(profile): the obese circulation sized on the adjusted weight with Lemmens blood volume (FU-8 A13, C4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A14: setRhythm refuses option keys it does not read (C12, I-53)

**Files:** Modify `packages/engine-core/src/engine.ts` (the `setRhythm` validation and two key lists beside `numReason` — lines FU-6/FU-7 do
not touch; merge `origin/main` first per the Global Constraints). Create `packages/engine-core/test/engine/setrhythm-opts.test.ts` (a fast
test: deliberately NOT `fu8-*`).

**Why:** `pacedVVI` with `{ fault, faultRate }` at the top level of `opts` was accepted and ignored (the fault lives under
`opts.pacer`) — a false "no effect" in the CM run (CM-16).

Create `packages/engine-core/test/engine/setrhythm-opts.test.ts`:

```ts
// FU-8 Task A16 (research/19 C12): setRhythm refuses option keys the rhythm engine does not read.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

describe('FU-8 A16: RhythmOpts are validated', () => {
  it('a pacemaker fault at the top level of opts is refused with the known keys; under opts.pacer it is accepted', () => {
    const e = createEngine({ seed: 7 });
    const top = e.dispatch({ id: 'a', issuedBy: 'test', type: 'setRhythm', rhythm: 'pacedVVI', opts: { fault: 'failureToCapture', faultRate: 1 } } as never);
    expect(top.accepted).toBe(false);
    expect(top.reason).toMatch(/^opts: unknown keys fault, faultRate \(known: .*pacer/);
    expect(e.dispatch({ id: 'b', issuedBy: 'test', type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { fault: 'failureToCapture', faultRate: 1 } } } as never).accepted).toBe(true);
    const inner = e.dispatch({ id: 'c', issuedBy: 'test', type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { rate: 70 } } } as never);
    expect(inner).toMatchObject({ accepted: false, reason: expect.stringMatching(/^opts\.pacer: unknown key rate/) });
  });
});
```

In `packages/engine-core/src/engine.ts`, find:

```ts
        return (
          numReason('opts.rateBpm', o.rateBpm, 0, 300) ??
```

Replace with:

```ts
        return (
          unknownKeys('opts', o, RHYTHM_OPT_KEYS) ?? // FU-8 (research/19 C12): an unknown option is refused, not dropped
          unknownKeys('opts.pacer', o.pacer ?? {}, PACER_OPT_KEYS) ??
          numReason('opts.rateBpm', o.rateBpm, 0, 300) ??
```

In `packages/engine-core/src/engine.ts`, find:

```ts
/** undefined, or a reason when `v` is present but not a finite number in [lo, hi]. */
function numReason(name: string, v: number | undefined, lo: number, hi: number): string | undefined {
```

Replace with:

```ts
/** undefined, or a reason when `v` is present but not a finite number in [lo, hi]. */
/**
 * FU-8 (research/19 C12): the RhythmOpts / PacerOpts keys (l2/ecg/api-types.ts). `setRhythm` accepted any key and
 * dropped the unknown ones — `pacedVVI` with `{ fault, faultRate }` at the top level was accepted and did nothing (the
 * fault belongs under `opts.pacer`). Every key named here is read by the rhythm engine.
 */
const RHYTHM_OPT_KEYS: ReadonlySet<string> = new Set(['ratio', 'atrialRateBpm', 'prMs', 'groupSize', 'rateBpm', 'pulseless', 'pauseS', 'pauseEveryS', 'retroP', 'twistBeats', 'vfAmplitudeMv', 'autoAsystole', 'pacer']);
const PACER_OPT_KEYS: ReadonlySet<string> = new Set(['ratePpm', 'avDelayMs', 'fault', 'faultRate', 'intrinsic']);
function unknownKeys(name: string, o: object, known: ReadonlySet<string>): string | undefined {
  const bad = Object.keys(o).filter((k) => !known.has(k));
  return bad.length ? `${name}: unknown key${bad.length > 1 ? 's' : ''} ${bad.join(', ')} (known: ${[...known].join(', ')})` : undefined;
}

function numReason(name: string, v: number | undefined, lo: number, hi: number): string | undefined {
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/setrhythm-opts.test.ts` then the whole fast set (every rhythm command in the repo's
tests, scenarios and demos passes the new check — prototype: 268 files green) and `npx -y pnpm@9.15.9 --filter @pme/controller test`.

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/engine.ts packages/engine-core/test/engine/setrhythm-opts.test.ts
git commit -m "fix(engine): setRhythm refuses unknown RhythmOpts/PacerOpts keys (FU-8 A14, C12)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A15: The controller prints clinical words — a Labeller hook, all eleven scenarios, a current tooltip (R-S9-2, I-17…I-19)

**Files:** Modify `packages/controller/src/scenario/describe.ts` (`Labeller`, both describers), `packages/controller/src/scenario/view.ts` (`next(lx)`; states
print their labels), `packages/controller/src/index.ts` (export), `packages/controller/src/scenario/builtins.ts` (the six 7f documents),
`packages/controller/src/panel/render-controls.ts` and `packages/controller/src/vocabulary.ts` (the Pin/Release wording), `packages/controller/test/scenario/builtins.test.ts`
and `packages/controller/test/panel/scenario-tab.dom.test.ts` (**E-FU8-2**: the list pin grows to eleven ids; the transition text names the
target by its label, "→ Coarse VF"). Create `packages/controller/test/scenario/fu8-labeller.test.ts`.

**Why:** Stage 9's R-S9-2 (its plan keeps clinical COPIES of the describers because these print engine ids;
`BUILTIN_SCENARIOS` held 5 of 11 documents; the 6a tooltip blamed a missing Stage 7). The controller owns no glossary
(R56: the app's glossary is the label source), so the host passes a `Labeller`; without one the ids print as before.
Stage 9 then deletes its copies (listed under "Handed to").

Create `packages/controller/test/scenario/fu8-labeller.test.ts`:

```ts
// FU-8 (Stage 9 R-S9-2): the describers print the host's clinical words for engine ids; without a labeller, the ids.
import { describe, expect, it } from 'vitest';
import { describeTransition, describeWhen } from '../../src/scenario/describe.ts';

const lx = { vital: (v: string) => ({ etco2: 'EtCO₂', map: 'MAP' })[v] ?? v, value: (k: string, v: string) => (k === 'drugId' && v === 'epinephrine' ? 'adrenaline' : v), sensor: (s: string) => (s === 'spo2' ? 'SpO₂ probe' : s), state: (s: string) => (s === 'rosc' ? 'ROSC' : s) };

describe('FU-8 R-S9-2: the Labeller hook', () => {
  it('prints clinical words through the hook and engine ids without it', () => {
    const t = { id: 't', to: 'rosc', when: { any: [{ vital: { var: 'etco2', op: '>=', value: 20, forS: 30 } }, { event: { kind: 'drug', drugId: 'epinephrine' } }, { sensor: { sensor: 'spo2', state: 'off' } }] } } as never;
    expect(describeTransition(t, lx)).toBe('any of (EtCO₂ ≥ 20 for 30 s; drug adrenaline; SpO₂ probe off) → ROSC');
    expect(describeTransition(t)).toBe('any of (etco2 ≥ 20 for 30 s; drug epinephrine; spo2 off) → rosc');
    expect(describeWhen({ vital: { var: 'map', op: '<', value: 65 } } as never, lx)).toBe('MAP < 65');
  });
});
```

In `packages/controller/src/scenario/describe.ts`, find:

```ts
export function describeWhen(w: When): string {
```

Replace with:

```ts
/**
 * FU-8 (Stage 9 R-S9-2): the words a host prints for engine ids — a vital (`etco2`), an event value (a drug id), a
 * sensor and a scenario state. The controller owns no glossary (R56: the app's glossary is the one label source), so
 * the host passes its labeller; without one the ids print as before.
 */
export interface Labeller {
  vital?: (id: string) => string;
  value?: (key: string, v: string) => string;
  sensor?: (id: string) => string;
  state?: (id: string) => string;
}

export function describeWhen(w: When, lx: Labeller = {}): string {
```

In `packages/controller/src/scenario/describe.ts`, find:

```ts
  if ('vital' in w) return `${w.vital.var} ${OP[w.vital.op] ?? w.vital.op} ${w.vital.value}${w.vital.forS ? ` for ${w.vital.forS} s` : ''}`;
```

Replace with:

```ts
  if ('vital' in w) return `${lx.vital?.(w.vital.var) ?? w.vital.var} ${OP[w.vital.op] ?? w.vital.op} ${w.vital.value}${w.vital.forS ? ` for ${w.vital.forS} s` : ''}`;
```

In `packages/controller/src/scenario/describe.ts`, find:

```ts
      .map(([k, v]) => (MIN_TEXT[k] ? (MIN_TEXT[k] as string).replace('%s', String(v)) : String(v)));
```

Replace with:

```ts
      .map(([k, v]) => (MIN_TEXT[k] ? (MIN_TEXT[k] as string).replace('%s', String(v)) : (lx.value?.(k, String(v)) ?? String(v))));
```

In `packages/controller/src/scenario/describe.ts`, find:

```ts
  if ('sensor' in w) return `${w.sensor.sensor} ${w.sensor.state}`;
```

Replace with:

```ts
  if ('sensor' in w) return `${lx.sensor?.(w.sensor.sensor) ?? w.sensor.sensor} ${w.sensor.state}`;
```

In `packages/controller/src/scenario/describe.ts`, find:

```ts
  if ('all' in w) return `all of (${w.all.map(describeWhen).join('; ')})`;
  return `any of (${w.any.map(describeWhen).join('; ')})`;
```

Replace with:

```ts
  if ('all' in w) return `all of (${w.all.map((x) => describeWhen(x, lx)).join('; ')})`;
  return `any of (${w.any.map((x) => describeWhen(x, lx)).join('; ')})`;
```

In `packages/controller/src/scenario/describe.ts`, find:

```ts
export function describeTransition(t: Transition): string {
  const p = t.probability !== undefined ? ` · p ${t.probability}${t.else ? ` else → ${t.else}` : ' else stay'}` : '';
  return `${describeWhen(t.when)} → ${t.to}${p}`;
```

Replace with:

```ts
export function describeTransition(t: Transition, lx: Labeller = {}): string {
  const st = (id: string) => lx.state?.(id) ?? id;
  const p = t.probability !== undefined ? ` · p ${t.probability}${t.else ? ` else → ${st(t.else)}` : ' else stay'}` : '';
  return `${describeWhen(t.when, lx)} → ${st(t.to)}${p}`;
```

In `packages/controller/src/scenario/view.ts`, find:

```ts
import { describeTransition, manualLabel } from './describe.ts';
```

Replace with:

```ts
import { describeTransition, manualLabel, type Labeller } from './describe.ts';
```

In `packages/controller/src/scenario/view.ts`, find:

```ts
  next(): NextTransition[] {
```

Replace with:

```ts
  /** FU-8 (R-S9-2): `lx` prints clinical words for engine ids (the host's glossary); states default to their labels. */
  next(lx: Labeller = {}): NextTransition[] {
    const state = lx.state ?? ((id: string) => this.stateLabel(id));
```

In `packages/controller/src/scenario/view.ts`, find:

```ts
      id: t.id, to: t.to, label: t.label ?? t.id, text: describeTransition(t), manual: manualLabel(t.when),
```

Replace with:

```ts
      id: t.id, to: t.to, label: t.label ?? t.id, text: describeTransition(t, { ...lx, state }), manual: manualLabel(t.when),
```

In `packages/controller/src/index.ts`, find:

```ts
export { describeWhen, describeTransition, manualLabel } from './scenario/describe.ts';
```

Replace with:

```ts
export { describeWhen, describeTransition, manualLabel, type Labeller } from './scenario/describe.ts'; // FU-8: Labeller (R-S9-2)
```

In `packages/controller/src/scenario/builtins.ts`, find:

```ts

const LIST: Array<{ id: string; title: string }> = [aclsVf, aclsPea, aclsBrady, svtAdenosine, orInduction];
```

Replace with:

```ts
// FU-8 (Stage 9 R-S9-2): the six Stage 7f documents join the list — the driver loaded only the first five by id
import depthAwareness from '../../scenarios/depth-awareness.json';
import depthLight from '../../scenarios/depth-light-anaesthesia.json';
import depthOpioidApnoea from '../../scenarios/depth-opioid-apnoea.json';
import nmbMhTrigger from '../../scenarios/nmb-mh-trigger.json';
import nmbResidualBlock from '../../scenarios/nmb-residual-block.json';
import nmbSuxBurn from '../../scenarios/nmb-sux-burn.json';

const LIST: Array<{ id: string; title: string }> = [
  aclsVf, aclsPea, aclsBrady, svtAdenosine, orInduction, depthAwareness, depthLight, depthOpioidApnoea, nmbMhTrigger, nmbResidualBlock, nmbSuxBurn,
];
```

In `packages/controller/src/panel/render-controls.ts`, find:

```ts
      if (!modeled) pin.title = rel.title = 'Pin and release need MODELED mode (Stage 7)';
```

Replace with:

```ts
      // FU-8 (Stage 9 R-S9-2, R50 review F9): the gating is 6a's deliberate choice — in MANUAL every value is already
      // the instructor's, so there is nothing to pin; the old tooltip blamed a missing Stage 7 that has landed
      if (!modeled) pin.title = rel.title = 'Pin and release hold a MODELED value; in MANUAL every value is already yours';
```

In `packages/controller/src/vocabulary.ts`, find:

```ts
  /** pin/release apply (MODELED mode only, brief §4.9). */
```

Replace with:

```ts
  /** pin/release apply (brief §4.9): the 6a drawer offers them in MODELED only (FU-8: in MANUAL every value is set). */
```

In `packages/controller/test/scenario/builtins.test.ts`, find:

```ts
  it('lists the five Stage 6b scenarios', () => {
    expect(BUILTIN_CATALOGUE.map((c) => c.id)).toEqual(['acls-vf-witnessed', 'acls-pea-hypovolaemia', 'acls-bradycardia-unstable', 'svt-adenosine', 'or-induction-hypotension']);
```

Replace with:

```ts
  // FU-8 (Stage 9 R-S9-2, declared exception E-FU8-2): the list pin grows from the five Stage 6b documents to all eleven
  it('lists the five Stage 6b scenarios and the six Stage 7f ones', () => {
    expect(BUILTIN_CATALOGUE.map((c) => c.id)).toEqual([
      'acls-vf-witnessed', 'acls-pea-hypovolaemia', 'acls-bradycardia-unstable', 'svt-adenosine', 'or-induction-hypotension',
      'depth-awareness', 'depth-light-anaesthesia', 'depth-opioid-apnoea', 'nmb-mh-trigger', 'nmb-residual-block', 'nmb-sux-burn',
    ]);
```

In `packages/controller/test/panel/scenario-tab.dom.test.ts`, find:

```ts
    expect(texts(panel, '.pme-scn-next li')).toEqual(['Start VF now Start VF now: any of (after 60 s in state; button "Start VF now") → vf']);
```

Replace with:

```ts
    // FU-8 (Stage 9 R-S9-2, E-FU8-2): the transition names its target state by the state's label, not its id
    expect(texts(panel, '.pme-scn-next li')).toEqual(['Start VF now Start VF now: any of (after 60 s in state; button "Start VF now") → Coarse VF']);
```

- [ ] **Verify.** `npx -y pnpm@9.15.9 --filter @pme/controller test && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
→ 222 passed (prototype), clean.

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/controller/src/scenario/describe.ts packages/controller/src/scenario/view.ts packages/controller/src/index.ts packages/controller/src/scenario/builtins.ts packages/controller/src/panel/render-controls.ts packages/controller/src/vocabulary.ts packages/controller/test/scenario/builtins.test.ts packages/controller/test/panel/scenario-tab.dom.test.ts packages/controller/test/scenario/fu8-labeller.test.ts
git commit -m "feat(controller): a Labeller hook for the describers, all eleven built-in scenarios, a current Pin/Release tooltip (FU-8 A15, R-S9-2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A16: The scenario card fields and the endocrine profile in `pme-scenario/1` (R-S9-4, I-20, I-58)

**Files:** Modify `packages/controller/scenarios/pme-scenario-1.schema.json` (`category`, `story`, `objectives`, `durationMin`;
`patient.endo`; state `label` `minLength 1`), `packages/controller/src/scenario/types.ts`, `packages/controller/src/scenario/patient.ts` (`endo` → the
engine's `PatientProfile.endo`), `packages/controller/src/scenario/validate.ts` (an unlabelled state is a WARNING),
`packages/controller/test/scenario/schema.test.ts` (**E-FU8-2**: the fixture's states gain labels; one new describe).

**Why:** R-S9-4 (Stage 9's `app/scenario-meta.ts` holds the card text only because the schema cannot); research/19 §5: a
diabetic patient (CM-09c) cannot be authored. **Decision:** a state label is RECOMMENDED, not required — making it
required failed 10 controller tests and would refuse every external document without labels (8a's sanity documents);
the validator warns instead. Posture has no engine input: Ali (v1.0 or v1.1). The TEXT of story/objectives for the
eleven documents is Stage 9's (its drafts move in; Ali's Q15).

In `packages/controller/scenarios/pme-scenario-1.schema.json`, find:

```json
    "notes": { "type": "string" },
    "seed": { "type": "integer", "minimum": 0, "maximum": 4294967295 },
```

Replace with:

```json
    "notes": { "type": "string" },
    "category": { "type": "string", "minLength": 1, "description": "FU-8 (Stage 9 R-S9-4): the scenario library's group (e.g. 'ACLS', 'Induction', 'Neuromuscular')." },
    "story": { "type": "string", "description": "FU-8 (R-S9-4): the learner-facing case text shown before the start (no engine words)." },
    "objectives": { "type": "array", "items": { "type": "string", "minLength": 1 }, "description": "FU-8 (R-S9-4): learning objectives, one per line." },
    "durationMin": { "type": "number", "exclusiveMinimum": 0, "description": "FU-8 (R-S9-4): the expected run time in minutes." },
    "seed": { "type": "integer", "minimum": 0, "maximum": 4294967295 },
```

In `packages/controller/scenarios/pme-scenario-1.schema.json`, find:

```json
        "profile": { "$ref": "#/definitions/profile" }
```

Replace with:

```json
        "profile": { "$ref": "#/definitions/profile" },
        "endo": {
          "description": "FU-8 (research/19 §5, R-S9-4): Stage 7e's endocrine profile, passed to the engine's PatientProfile.endo 1:1.",
          "type": "object",
          "additionalProperties": false,
          "properties": { "diabetes": { "enum": ["none", "type1", "type2"] }, "thyroid": { "enum": ["normal", "hypo", "hyper"] }, "adrenalInsufficiency": { "type": "boolean" } }
        }
```

In `packages/controller/scenarios/pme-scenario-1.schema.json`, find:

```json
        "id": { "$ref": "#/definitions/id" },
        "label": { "type": "string" },
        "notes": { "type": "string" },
```

Replace with:

```json
        "id": { "$ref": "#/definitions/id" },
        "label": { "type": "string", "minLength": 1 },
        "notes": { "type": "string" },
```

In `packages/controller/src/scenario/types.ts`, find:

```ts
import type { BloodProfile, LungConditionSpec, NeuroProfile, ProfileCondition, Ramp, StateVar } from '@pme/engine-core';
```

Replace with:

```ts
import type { BloodProfile, EndoProfileInput, LungConditionSpec, NeuroProfile, ProfileCondition, Ramp, StateVar } from '@pme/engine-core';
```

In `packages/controller/src/scenario/types.ts`, find:

```ts
export interface ScenarioState extends C {
  id: string;
  label?: string;
  notes?: string;
```

Replace with:

```ts
export interface ScenarioState extends C {
  id: string;
  /** FU-8 (R-S9-4): the schema requires it in every document — the clinical name the panel, the remote and the
   * transition text print; in-code objects built by hosts and tests may still omit it (the view falls back to the id). */
  label?: string;
  notes?: string;
```

In `packages/controller/src/scenario/types.ts`, find:

```ts
  profile?: ScenarioProfile;
}
```

Replace with:

```ts
  profile?: ScenarioProfile;
  /** FU-8 (research/19 §5): Stage 7e's endocrine profile (diabetes, thyroid, adrenal insufficiency), 1:1. */
  endo?: EndoProfileInput;
}
```

In `packages/controller/src/scenario/types.ts`, find:

```ts
  notes?: string;
  /** Seeds the runner's `scenario` PRNG stream (the engine keeps the host's own seed). */
```

Replace with:

```ts
  notes?: string;
  /** FU-8 (Stage 9 R-S9-4): library group, learner-facing story, objectives and expected minutes (all optional). */
  category?: string;
  story?: string;
  objectives?: string[];
  durationMin?: number;
  /** Seeds the runner's `scenario` PRNG stream (the engine keeps the host's own seed). */
```

In `packages/controller/src/scenario/patient.ts`, find:

```ts
    ...(p.neuro ? { neuro: p.neuro } : {}),
    ...(pr.conditions ? { conditions: pr.conditions } : {}),
```

Replace with:

```ts
    ...(p.neuro ? { neuro: p.neuro } : {}),
    ...(p.endo ? { endo: p.endo } : {}), // FU-8 (research/19 §5): 7e's endocrine profile
    ...(pr.conditions ? { conditions: pr.conditions } : {}),
```

In `packages/controller/src/scenario/validate.ts`, find:

```ts
    else stateIds.set(s.id, i);
  });
```

Replace with:

```ts
    else stateIds.set(s.id, i);
    // FU-8 (Stage 9 R-S9-4): the panel, the remote and the transition text print the state's label — a document
    // without one shows the learner an engine id. A warning, not an error: minimal and test documents stay valid.
    if (s.label === undefined) warnings.push(`/states/${i}/label: state "${s.id}" has no label (its id is shown)`);
  });
```

In `packages/controller/test/scenario/schema.test.ts`, find:

```ts
  states: [{ id: 'a', transitions: [{ id: 't1', to: 'b', when: { afterS: 5 } }] }, { id: 'b' }],
```

Replace with:

```ts
  // FU-8 (R-S9-4, E-FU8-2): the fixture's states carry labels — an unlabelled state is now a validation warning
  states: [{ id: 'a', label: 'A', transitions: [{ id: 't1', to: 'b', when: { afterS: 5 } }] }, { id: 'b', label: 'B' }],
```

In `packages/controller/test/scenario/schema.test.ts`, find:

```ts
  });
});
```

Replace with:

```ts
  });
});

describe('FU-8 (Stage 9 R-S9-4): the scenario card fields and the endocrine profile', () => {
  it('accepts category, story, objectives, durationMin and patient.endo; warns on an unlabelled state', () => {
    const d = base();
    Object.assign(d, { category: 'Induction', story: 'A 58-year-old for a laparotomy.', objectives: ['Recognise hypotension'], durationMin: 15 });
    d.patient = { endo: { diabetes: 'type2' } };
    expect(validateScenario(d)).toMatchObject({ ok: true, warnings: [] });
    delete d.states[1].label;
    expect(validateScenario(d)).toMatchObject({ ok: true, warnings: ['/states/1/label: state "b" has no label (its id is shown)'] });
    expect(errs({ ...base(), durationMin: 0 }).join()).toMatch(/durationMin/);
  });
});
```

- [ ] **Verify.** `npx -y pnpm@9.15.9 --filter @pme/controller test && npx -y pnpm@9.15.9 --filter @pme/validation test`
→ pass (the validation package's documents validate with warnings only).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/controller/scenarios/pme-scenario-1.schema.json packages/controller/src/scenario/types.ts packages/controller/src/scenario/patient.ts packages/controller/src/scenario/validate.ts packages/controller/test/scenario/schema.test.ts
git commit -m "feat(scenario): category, story, objectives, durationMin and patient.endo in pme-scenario/1; unlabelled states warn (FU-8 A16, R-S9-4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A17: The sweep backfills after a resize (R-S9-1a, I-14)

**Files:** Modify `packages/renderer/src/sweep-lane.ts`. Create `packages/renderer/test/fu8-sweep-backfill.test.ts`.

**Why:** a view change resizes the monitor and `SweepLane` restarted one sample back, blanking every lane until the
cursor went round (accepted for v1.0 by Stage 9's ruling 3, requested as R-S9-1a). The first frame after a reset now
redraws the last lane-width (less the erase gap) from the engine's buffer, capped at 100 s (the buffer holds 120 s;
a read older than it would start at the oldest sample and misplace the trace). Stage 9's gate note and user guide
sentence "the sweep restarts" becomes obsolete — listed for Stage 9.

Create `packages/renderer/test/fu8-sweep-backfill.test.ts`:

```ts
// FU-8 Task A18 (Stage 9 R-S9-1a): after a resize/reset the first frame redraws the last lane-width of samples (less
// the erase gap) instead of starting one sample back — a view change no longer blanks the sweep.
import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const cfg: LaneConfig = {
  x: 0, y: 0, width: 400, height: 100, baseline: 0.5, rate: 500, mmPerS: 25, pxPerMm: 4, gainMmPerMv: 10,
  color: '#0f0', background: '#000', lineWidth: 1.5, eraseGapPx: 16,
};

describe('FU-8 A18: the sweep backfills after a reset', () => {
  it('first frame at t = 30 s reads from one lane-width back (400 px − 16 px gap = 3.84 s at 100 px/s): 1 921 samples', () => {
    const reads: Array<[number, number]> = [];
    const src = (from: number, out: Float32Array) => {
      reads.push([from, out.length]);
      out.fill(0.1);
      return out.length;
    };
    const lane = new SweepLane(cfg, 1);
    lane.draw(new FakeCtx(), 30, src);
    expect(reads[0]).toEqual([15000 - 1920, 1921]); // samples 13 080 … 15 000
    expect(lane.lastDrawnIndex).toBe(15000);
  });
  it('near the start of the run it reads from sample 0', () => {
    const reads: number[] = [];
    const lane = new SweepLane(cfg, 1);
    lane.draw(new FakeCtx(), 1, (from, out) => (reads.push(from), out.fill(0), out.length));
    expect(reads[0]).toBe(0);
  });
});
```

In `packages/renderer/src/sweep-lane.ts`, find:

```ts
type Rect = [number, number, number, number]; // canvas CSS px
```

Replace with:

```ts
type Rect = [number, number, number, number]; // canvas CSS px

/** FU-8 (R-S9-1a): the backfill never reaches past the engine's 120 s buffer (`BUFFER_SECONDS`), where a read would
 * start at the oldest sample instead of the one asked for [ENG margin]. */
const BACKFILL_MAX_S = 100;
```

In `packages/renderer/src/sweep-lane.ts`, find:

```ts
      // First frame, or a jump longer than one lane (hidden tab): start clean one sample back.
```

Replace with:

```ts
      // First frame, or a jump longer than one lane (hidden tab): start clean. FU-8 (Stage 9 R-S9-1a): redraw the last
      // lane-width of samples (less the erase gap) in this frame, so a resize or a view change does not blank the sweep
      // until the cursor has gone round once; the engine's buffer holds them (a read returns what it has).
```

In `packages/renderer/src/sweep-lane.ts`, find:

```ts
      this.lastIndex = endIdx - 1;
```

Replace with:

```ts
      const back = Math.min(Math.floor(((c.width - c.eraseGapPx) / this.pxPerS) * c.rate), BACKFILL_MAX_S * c.rate);
      this.lastIndex = Math.max(-1, endIdx - 1 - back);
```

- [ ] **Verify.** `npx -y pnpm@9.15.9 --filter @pme/renderer test` → 89 passed (prototype); the monitor e2e (Task G) shows no
blank lane after a Monitor ↔ Instructor switch once Stage 9 lands (a Stage 9 check, not FU-8's).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/renderer/src/sweep-lane.ts packages/renderer/test/fu8-sweep-backfill.test.ts
git commit -m "feat(renderer): the sweep redraws the last lane-width after a resize (FU-8 A17, R-S9-1a)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A18: The pulmonary-hypertension grade sets PVR (C8, I-55)

**Files:** Modify `packages/engine-core/src/l2/circ/profile.ts` (`GRADES.ph`, `PVR_REST_WU`, `PH_EES_RV`, the `ph` case). Create
`packages/engine-core/test/engine/fu8-ph-grade.test.ts`.

**Why:** the `ph` condition applied PVR × 3 and RV Ees × 1.6 whatever its grade (research/19 CM-13a: 5.9 WU for "severe");
the tables give 3 / 5 / 10 WU and × 1.3 / 1.6 / 2.0. The multipliers are the grade's WU over the resting circuit's PVR
(0.1 mmHg·s/mL = 1.67 WU); no grade = moderate = exactly the old × 3. The pressor rows' pulmonary arms and iNO are not here
(FU-7 Task 17; Ali).

Create `packages/engine-core/test/engine/fu8-ph-grade.test.ts`:

```ts
// FU-8 Task A18 (research/19 C8): the pulmonary-hypertension grade sets PVR (tables §1.5: 3 / 5 / 10 Wood units).
// Before FU-8 every grade got PVR × 3 (measured 5.1 WU here; 5.9 WU in the CM run for "severe").
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { hemo: { circ: { qFwd: number }; circOut: { pPa: number; pPv: number } } };
function pvrWu(grade?: string): number {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 50, sex: 'M', weightKg: 70, conditions: [{ id: 'ph', ...(grade ? { grade } : {}) }] } as never });
  e.advanceTo(300);
  let dp = 0;
  let n = 0;
  for (let t = 300.02; t < 310; t += 0.02) {
    e.advanceTo(t);
    const o = (e as unknown as { st: St }).st.hemo.circOut;
    dp += o.pPa - o.pPv;
    n++;
  }
  return dp / n / ((e as unknown as { st: St }).st.hemo.circ.qFwd * 0.06);
}

describe('FU-8 A18 (C8): PH grades', () => {
  it('mild 3, moderate 5, severe 10 WU (± 20 %); no grade = moderate (the pre-FU-8 × 3)', () => {
    const r = { mild: pvrWu('mild'), moderate: pvrWu('moderate'), severe: pvrWu('severe'), none: pvrWu() };
    console.log(`fu8 A18: PVR ${Object.entries(r).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')} WU`);
    expect(Math.abs(r.mild / 3 - 1)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(r.moderate / 5 - 1)).toBeLessThanOrEqual(0.2);
    expect(Math.abs(r.severe / 10 - 1)).toBeLessThanOrEqual(0.2);
    expect(r.none).toBeCloseTo(r.moderate, 6);
  }, 120_000);
});
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
  cad: { none: 3.5, stable: 2.0, severe: 1.4, recentMI: 1.4 },
} as const;
/** LV stiffness multiplier by AS grade (tables §1.5 Q15: β ×1.0 / 1.3 / 1.6 / 2.0). */
```

Replace with:

```ts
  cad: { none: 3.5, stable: 2.0, severe: 1.4, recentMI: 1.4 },
  ph: { mild: 3, moderate: 5, severe: 10 }, // FU-8 (C8): PVR in Wood units (tables §1.5; ESC/ERS 2022)
} as const;
/** FU-8 (C8): the resting circuit's total PVR in Wood units (PVR 0.1 mmHg·s/mL × 1000/60). */
const PVR_REST_WU = (PVR * 1000) / 60;
/** FU-8 (C8): RV Ees multiplier by PH grade (tables §1.5: × 1.3 / 1.6 / 2.0, adapted hypertrophy). */
const PH_EES_RV: Record<string, number> = { mild: 1.3, moderate: 1.6, severe: 2.0 };
/** LV stiffness multiplier by AS grade (tables §1.5 Q15: β ×1.0 / 1.3 / 1.6 / 2.0). */
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
    case 'ph': // PVR 3/5/10 WU by grade (tables §1.5), RV Ees ×1.3–2
      p.pvrL *= lerp(3);
      p.pvrR *= lerp(3);
      p.eesRv *= lerp(1.6);
      return;
```

Replace with:

```ts
    case 'ph': {
      // PVR 3/5/10 WU by grade (tables §1.5), RV Ees ×1.3–2. FU-8 (research/19 C8): the grade was ignored — PVR × 3 and
      // RV Ees × 1.6 at every grade (measured 5.9 WU for "severe"); the multipliers are now the grade's WU over the
      // resting circuit's PVR (0.1 mmHg·s/mL = 1.67 WU). No grade = moderate, the old behaviour.
      const g = (c.grade ?? 'moderate') as keyof typeof GRADES.ph;
      const m = GRADES.ph[g] / PVR_REST_WU;
      p.pvrL *= lerp(m);
      p.pvrR *= lerp(m);
      p.eesRv *= lerp(PH_EES_RV[g] ?? 1.6);
      return;
    }
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-ph-grade.test.ts test/l2/circ` → pass: `PVR mild 2.9, moderate 4.7, severe 9.6, none 4.7 WU`
(prototype; before: 4.7 at every grade). mPAP mild 24, moderate 35, severe 57 mmHg (probe, CO 5.3 / 5.3 / 4.9 L/min).

- [ ] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/profile.ts packages/engine-core/test/engine/fu8-ph-grade.test.ts
git commit -m "fix(profile): the PH grade sets PVR 3/5/10 WU and RV Ees 1.3/1.6/2.0 (FU-8 A18, C8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


## Part B — after FU-7 merges

### Task B0: Merge FU-7 and re-verify every Part B block

**Precondition:** FU-7 is merged to `origin/main` (and FU-6 before it). Part A's PR may be merged or open; if open, this
continues on the same branch.

- [ ] **Step 1.** `git fetch origin && git merge origin/main` (no stash; resolve by keeping both sides; FU-7 rewrites
  `l2/pk/row.ts`, `pipeline.ts`, `combine.ts` and every `data/rows-*.ts` — its Task 2 replaces the gamma fallback curve by a
  transit chain, so the `gammaPk(...)` helper lines in B1/B2 may read differently).
- [ ] **Step 2.** Run the block checker on the merged tree: `python3 ../scratch/plans-backup/fu-8-check-blocks.py --part B
  docs/plans/fu-8-followups.md .` — it lists every Part B find block that no longer matches exactly once. Re-anchor each
  by its quoted comment or statement (never re-type a line you are not changing) and record the list in the gate note.
- [ ] **Step 3.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk` and the fast set → green before any Part B edit (record FU-7's numbers as the baseline).

### Task B1: The drug library — the insulin reference, explicit routes, no silent curve-row infusions, a documented maximum (I-25…I-28)

**Files:** Modify `packages/engine-core/src/l2/pk/row.ts` (`PkSpec` gamma `refRatePerKg`; `DrugRow.routes`, `maxDose`, `rateActsVia`), `packages/engine-core/src/l2/pk/pipeline.ts`
(`IV_ROUTES`, the route/infusion/maximum rules, the per-kg infusion reference), `packages/engine-core/src/l2/pk/data/rows-other.ts` (the `gammaPk`
helper; insulin; salbutamol `neb`; dextrose `rateActsVia`; lidocaine, bupivacaine, ropivacaine, dantrolene `maxDose`),
`packages/engine-core/src/types-pk.ts` (`DrugWarningEvent`), `packages/engine-core/src/types.ts` (the `EngineEvent` union). Create
`packages/engine-core/test/l2/pk/fu8-insulin-ref.test.ts`, `packages/engine-core/test/l2/pk/fu8-dose-rules.test.ts`. R51: 7g's files (and the two type files).

**Why (D11):** (a) the insulin row's infusion reference `0.1 / 60` units/min shares `perKg` false with the ABSOLUTE 10-unit
bolus reference, so 0.1 units/kg/h at 70 kg was 70 reference rates: 7g's `kShift` saturated at −1.18 (K 4.18 → 2.88 in the
hour) and `glucoseDelta` at −118 (7e owns glucose and reads the ordered rate itself, so the glucose course is unaffected;
the K shift, read by 7c, is the visible error); after: one reference rate, K shift −0.6, K 3.47. (b) Every dose behaved as
IV whatever route it named; no absorption model is built — IV, IO and a central line are IV kinetics, nebulised
salbutamol is kept (7c's K-shift acceptance uses it; the same curve, a documented simplification), an event WITHOUT a
route (scenario and oracle JSON) is IV as before, every other route is refused with a reason. (c) 21 curve rows accepted
an infusion and did nothing: refused, except dextrose (7e reads its rate). (d) No row had a maximum: a `drugWarning`
event, the dose given as ordered (no clamp); only maxima the rows' own `doses` text sources are set; the dosing-preset caps
are Ali's (W8). If FU-7's transit chain replaced `infTarget`, apply the per-kg rule where it converts the ordered rate.

Create `packages/engine-core/test/l2/pk/fu8-insulin-ref.test.ts`:

```ts
// FU-8 Task B1 (review pack DR-44): the insulin infusion reference is per kg. Through the engine's public API, seed 7.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/index.ts';

const eng = () => createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
const drug = (e: ReturnType<typeof eng>, event: Record<string, unknown>) => e.dispatch({ id: `d${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', route: 'iv', ...event } } as never);

describe('FU-8 B1: the insulin infusion reference is per kg', () => {
  it('0.1 units/kg/h (7 units/h at 70 kg) is ONE reference rate: glucose shift −60 mg/dL, K shift −0.6 at 60 min (was 70 rates: −118 / −1.18, the E_max)', () => {
    const e = eng();
    e.advanceTo(10);
    expect(drug(e, { drugId: 'insulin', dose: 0.1, unit: 'units/kg/h', infusion: true }).accepted).toBe(true);
    e.advanceTo(3610);
    const bus = (e as unknown as { st: { pk: { bus: { metabolic: { glucoseDelta: number; kShift: number } } } } }).st.pk.bus.metabolic;
    expect(bus.glucoseDelta).toBeCloseTo(-60, 0);
    expect(bus.kShift).toBeCloseTo(-0.6, 1);
  });
});
```

Create `packages/engine-core/test/l2/pk/fu8-dose-rules.test.ts`:

```ts
// FU-8 Task B2 (review pack defect list): explicit routes, refused curve-row infusions and the documented
// maximum-dose warning. Through the engine's public API, seed 7.
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '../../../src/index.ts';

const eng = () => createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
const drug = (e: ReturnType<typeof eng>, event: Record<string, unknown>) => e.dispatch({ id: `d${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', route: 'iv', ...event } } as never);

describe('FU-8 B2/B4: routes and infusions the engine cannot honour are refused, not given as IV', () => {
  it('intramuscular adrenaline is refused with the reason; IO and central are accepted; nebulised salbutamol is accepted', () => {
    const e = eng();
    const im = drug(e, { drugId: 'epinephrine', dose: 0.5, unit: 'mg', route: 'im' });
    expect(im).toMatchObject({ accepted: false, reason: expect.stringMatching(/^epinephrine: route im is not modelled/) });
    expect(drug(e, { drugId: 'epinephrine', dose: 10, unit: 'mcg', route: 'io' }).accepted).toBe(true);
    expect(drug(e, { drugId: 'salbutamol', dose: 10, unit: 'mg', route: 'neb' }).accepted).toBe(true);
    expect(drug(e, { drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'neb' }).accepted).toBe(false);
  });
  it('an amiodarone infusion (a curve row with no infusion reference) is refused; its bolus is accepted', () => {
    const e = eng();
    expect(drug(e, { drugId: 'amiodarone', dose: 0.6, unit: 'mg/min', infusion: true })).toMatchObject({ accepted: false, reason: expect.stringMatching(/no infusion model/) });
    expect(drug(e, { drugId: 'amiodarone', dose: 300, unit: 'mg' }).accepted).toBe(true);
  });
});

describe('FU-8 B3: a documented maximum raises a warning, never a clamp', () => {
  it('lidocaine 3 + 2 mg/kg: the second bolus crosses the cumulative 4.5 mg/kg (315 mg) → one drugWarning; both doses are logged', () => {
    const e = eng();
    const warn: string[] = [];
    e.on((x: EngineEvent) => { if (x.type === 'drugWarning') warn.push(x.text); }, ['drugWarning']);
    drug(e, { drugId: 'lidocaine', dose: 3, unit: 'mg/kg' });
    e.advanceTo(5);
    expect(warn).toEqual([]);
    drug(e, { drugId: 'lidocaine', dose: 2, unit: 'mg/kg' });
    e.advanceTo(10);
    expect(warn).toEqual(['Lidocaine: cumulative 350 mg exceeds the maximum 315 mg (M10 ch. 25 Table 25.6, plain)']);
  });
});
```

In `packages/engine-core/src/l2/pk/row.ts`, find:

```ts
import type { VolatileAgent } from './volatile.ts';
```

Replace with:

```ts
import type { VolatileAgent } from './volatile.ts';
import type { PkRoute } from '../../types-pk.ts';
```

In `packages/engine-core/src/l2/pk/row.ts`, find:

```ts
  | { kind: 'gamma'; refDose: number; perKg: boolean; tpS: number; t10S: number; refRate?: number; tauOnS?: number; tauOffS?: number } // c in reference-dose units
```

Replace with:

```ts
  | { kind: 'gamma'; refDose: number; perKg: boolean; tpS: number; t10S: number; refRate?: number; tauOnS?: number; tauOffS?: number; refRatePerKg?: boolean } // c in reference-dose units; FU-8 (B1): refRatePerKg — the infusion reference is per kg even when the bolus reference is not (insulin)
```

In `packages/engine-core/src/l2/pk/row.ts`, find:

```ts
  shared?: 'blood'; // 7c also acts on this id, reading it from bus.doses (decision 10; 7g still consumes the event)
  doses: string; // typical adult doses, text
```

Replace with:

```ts
  shared?: 'blood'; // 7c also acts on this id, reading it from bus.doses (decision 10; 7g still consumes the event)
  /** FU-8 (B2): the routes this row honours — the engine's kinetics are intravenous; absent = IV_ROUTES. A dose by any
   * other route is refused with a reason (no absorption model is built; review pack "every dose behaves as IV"). */
  routes?: readonly PkRoute[];
  /** FU-8 (B3): a documented maximum — exceeding it raises a `drugWarning` event, never a clamp. `perKg`: × actual
   * weight; `scope` 'cumulative' sums every bolus of the row. Only maxima the row's own `doses` text sources are set;
   * the rest wait on Ali's dosing-preset table (review pack DP-01…DP-64). */
  maxDose?: { amount: number; perKg: boolean; scope: 'dose' | 'cumulative'; src: string };
  /** FU-8 (B4): another stage reads this row's ordered RATE and acts on it (7e reads dextrose, E-7e-4), so an infusion
   * is meaningful although the row's own curve has no infusion reference. */
  rateActsVia?: string;
  doses: string; // typical adult doses, text
```

In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
import { DRUG_BUS_NEUTRAL, type BusAgent, type BusVolatile, type DoseLogEntry, type DrugBus, type DrugPanelRow, type PkClinicalEvent } from '../../types-pk.ts';
```

Replace with:

```ts
import { DRUG_BUS_NEUTRAL, type BusAgent, type BusVolatile, type DoseLogEntry, type DrugBus, type DrugPanelRow, type PkClinicalEvent, type PkRoute } from '../../types-pk.ts';
```

In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
    if (row.pk.kind === 'blood') return bloodBolusOnly;
    const c = ev as Extract<PkClinicalEvent, { kind: 'infusion' }>;
```

Replace with:

```ts
    if (row.pk.kind === 'blood') return bloodBolusOnly;
    if (row.pk.kind === 'gamma' && row.pk.refRate === undefined && !row.rateActsVia) return `${row.id} has no infusion model: give it as a bolus`; // FU-8 (B4)
    const c = ev as Extract<PkClinicalEvent, { kind: 'infusion' }>;
```

In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
  if (row.pk.kind === 'blood' && (isRate || d.infusion)) return bloodBolusOnly;
  if (!isRate && d.dose === 0) return 'dose must be > 0';
```

Replace with:

```ts
  if (row.pk.kind === 'blood' && (isRate || d.infusion)) return bloodBolusOnly;
  // FU-8 (B2): the route is explicit — the engine's kinetics are intravenous; any other route is refused, not given as IV
  const routes = row.routes ?? IV_ROUTES;
  if (d.route !== undefined && !routes.includes(d.route)) return `${row.id}: route ${d.route} is not modelled — the engine gives ${routes.join(', ')} doses only`; // an event without a route (scenario/oracle JSON) is IV, as before
  // FU-8 (B4): a curve-based row without an infusion reference cannot act as an infusion (it was accepted and did nothing)
  if (row.pk.kind === 'gamma' && row.pk.refRate === undefined && !row.rateActsVia && (isRate || d.infusion)) return `${row.id} has no infusion model: give it as a bolus`;
  if (!isRate && d.dose === 0) return 'dose must be > 0';
```

In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
  return typeof r === 'string' ? r : undefined;
}

/** Apply a validated command. True for every drug/infusion/tci/vaporiser command (7g consumes them all, R51 §3). */
```

Replace with:

```ts
  return typeof r === 'string' ? r : undefined;
}

/** FU-8 (B2): the routes whose kinetics the engine's intravenous models honour (IO and a central line are IV). */
export const IV_ROUTES: readonly PkRoute[] = ['iv', 'io', 'central'];

/** Apply a validated command. True for every drug/infusion/tci/vaporiser command (7g consumes them all, R51 §3). */
```

In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
    if (row.pk.kind === 'gamma') d.infTarget = row.pk.refRate ? amountPerMin / (row.pk.refRate * (row.pk.perKg ? w : 1)) : 0;
```

Replace with:

```ts
    if (row.pk.kind === 'gamma') d.infTarget = row.pk.refRate ? amountPerMin / (row.pk.refRate * ((row.pk.refRatePerKg ?? row.pk.perKg) ? w : 1)) : 0; // FU-8 (B1)
```

In `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
      logDose(amt);
      if (ev.overS && ev.overS > 0 && row.pk.kind !== 'gamma') {
```

Replace with:

```ts
      logDose(amt);
      // FU-8 (B3): above the documented maximum → a warning event; the dose is given as ordered (no silent clamp)
      const mx = row.maxDose;
      if (mx) {
        const lim = mx.amount * (mx.perKg ? w : 1);
        const given = mx.scope === 'cumulative' ? d.total + amt : amt;
        if (given > lim + 1e-9) pk.out.push({ type: 'drugWarning', t, drugId: row.id, text: `${row.name}: ${mx.scope === 'cumulative' ? 'cumulative ' : ''}${+given.toFixed(1)} ${row.amountUnit} exceeds the maximum ${+lim.toFixed(1)} ${row.amountUnit} (${mx.src})` });
      }
      if (ev.overS && ev.overS > 0 && row.pk.kind !== 'gamma') {
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
const gammaPk = (refDose: number, perKg: boolean, tpS: number, t10S: number, refRate?: number): DrugRow['pk'] => ({
  kind: 'gamma', refDose, perKg, tpS, t10S, ...(refRate !== undefined ? { refRate, tauOnS: 120, tauOffS: 900 } : {}),
```

Replace with:

```ts
const gammaPk = (refDose: number, perKg: boolean, tpS: number, t10S: number, refRate?: number, refRatePerKg?: boolean): DrugRow['pk'] => ({
  kind: 'gamma', refDose, perKg, tpS, t10S, ...(refRate !== undefined ? { refRate, tauOnS: 120, tauOffS: 900 } : {}), ...(refRatePerKg ? { refRatePerKg } : {}), // FU-8 (B1)
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
    doses: '250 µg IV slowly; 10–20 mg nebulised for K', onset: 'K −1.4 at full effect (7c); HR +10–20 %', ir: '?', src: '7c decision 7; [TXT]', tag: 'TXT' },
  { id: 'insulin', name: 'Insulin (regular)', cls: 'metabolic', amountUnit: 'units', pk: gammaPk(10, false, 1800, 14400, 0.1 / 60),
```

Replace with:

```ts
    routes: ['iv', 'io', 'central', 'neb'], // FU-8 (B2): nebulised for K (7c decision 7; the K-shift acceptance uses it) — the same curve, a documented simplification
    doses: '250 µg IV slowly; 10–20 mg nebulised for K', onset: 'K −1.4 at full effect (7c); HR +10–20 %', ir: '?', src: '7c decision 7; [TXT]', tag: 'TXT' },
  // FU-8 (B1, review pack DR-44): the infusion reference is 0.1 units/kg/h (the row's own dose text) — it was read as
  // 0.1 units/h absolute, so 0.1 units/kg/h at 70 kg (7 units/h) was 70 reference rates: glucose −118 mg/dL (the E_max)
  // and K 4.18 → 2.88 mmol/L within the hour. The 10-unit bolus reference stays absolute.
  { id: 'insulin', name: 'Insulin (regular)', cls: 'metabolic', amountUnit: 'units', pk: gammaPk(10, false, 1800, 14400, 0.1 / 60, true),
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
  { id: 'dextrose', name: 'Dextrose 50 %', cls: 'metabolic', amountUnit: 'mg', pk: gammaPk(25000, false, 120, 3600),
```

Replace with:

```ts
  { id: 'dextrose', name: 'Dextrose 50 %', cls: 'metabolic', amountUnit: 'mg', pk: gammaPk(25000, false, 120, 3600), rateActsVia: '7e glucose (E-7e-4)', // FU-8 (B4)
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
  { id: 'dantrolene', name: 'Dantrolene', cls: 'dantrolene', amountUnit: 'mg', pk: gammaPk(2.5, true, 600, 21600),
    pd: [], doses: '2.5 mg/kg, repeat to 10 mg/kg', onset: 'EtCO2 falls within 5–10 min, HR normal by 15–20 (tables §7 21); bus.metabolic.dantroleneE → 7e/Stage 3 MH', ir: '?', src: 'tables §7 21; M10 ch. on neuromuscular disorders (2.4 mg/kg max twitch depression)', tag: 'TXT' },
```

Replace with:

```ts
  { id: 'dantrolene', name: 'Dantrolene', cls: 'dantrolene', amountUnit: 'mg', pk: gammaPk(2.5, true, 600, 21600),
    maxDose: { amount: 10, perKg: true, scope: 'cumulative', src: 'tables §7 21; the row: repeat to 10 mg/kg' }, // FU-8 (B3)
    pd: [], doses: '2.5 mg/kg, repeat to 10 mg/kg', onset: 'EtCO2 falls within 5–10 min, HR normal by 15–20 (tables §7 21); bus.metabolic.dantroleneE → 7e/Stage 3 MH', ir: '?', src: 'tables §7 21; M10 ch. on neuromuscular disorders (2.4 mg/kg max twitch depression)', tag: 'TXT' },
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
    pd: [{ target: 'ees', emax: -0.7, ec50: 20, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 20, hill: 2 }],
    doses: 'antiarrhythmic 1–1.5 mg/kg; max 4.5 mg/kg plain / 7 with epinephrine (M10 ch. 25 Table 25.6: 350/500 mg)', onset: 'IV peak 1–2 min; seizures reported from 1.4 mg/kg in IVRA (M10 p. 755)', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
```

Replace with:

```ts
    pd: [{ target: 'ees', emax: -0.7, ec50: 20, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 20, hill: 2 }],
    maxDose: { amount: 4.5, perKg: true, scope: 'cumulative', src: 'M10 ch. 25 Table 25.6, plain' }, // FU-8 (B3)
    doses: 'antiarrhythmic 1–1.5 mg/kg; max 4.5 mg/kg plain / 7 with epinephrine (M10 ch. 25 Table 25.6: 350/500 mg)', onset: 'IV peak 1–2 min; seizures reported from 1.4 mg/kg in IVRA (M10 p. 755)', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
    pd: [{ target: 'ees', emax: -0.7, ec50: 4, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 4, hill: 2 }],
    doses: 'max 2.5 mg/kg (175 mg plain / 225 with epinephrine, M10 Table 25.6)', onset: 'intravascular injection: CNS then CV collapse within minutes; resistant VF', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
```

Replace with:

```ts
    pd: [{ target: 'ees', emax: -0.7, ec50: 4, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 4, hill: 2 }],
    maxDose: { amount: 2.5, perKg: true, scope: 'cumulative', src: 'M10 Table 25.6, plain' }, // FU-8 (B3)
    doses: 'max 2.5 mg/kg (175 mg plain / 225 with epinephrine, M10 Table 25.6)', onset: 'intravascular injection: CNS then CV collapse within minutes; resistant VF', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
    pd: [{ target: 'ees', emax: -0.7, ec50: 6, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 6, hill: 2 }],
    doses: 'max 3 mg/kg (200 mg plain / 250 with epinephrine, M10 Table 25.6)', onset: 'as bupivacaine with a higher CV threshold', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
```

Replace with:

```ts
    pd: [{ target: 'ees', emax: -0.7, ec50: 6, hill: 2 }, { target: 'svr', emax: -0.3, ec50: 6, hill: 2 }],
    maxDose: { amount: 3, perKg: true, scope: 'cumulative', src: 'M10 Table 25.6, plain' }, // FU-8 (B3)
    doses: 'max 3 mg/kg (200 mg plain / 250 with epinephrine, M10 Table 25.6)', onset: 'as bupivacaine with a higher CV threshold', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
```

In `packages/engine-core/src/types-pk.ts`, find:

```ts

export type DrugsEvent = {
```

Replace with:

```ts

/** FU-8 (B3): a dose above the row's documented maximum (`DrugRow.maxDose`) — the dose is still given, as ordered. */
export type DrugWarningEvent = { type: 'drugWarning'; t: SimSeconds; drugId: string; text: string };

export type DrugsEvent = {
```

In `packages/engine-core/src/types.ts`, find:

```ts
import type { DrugsEvent, PkClinicalEvent } from './types-pk.ts'; // Stage 7g
```

Replace with:

```ts
import type { DrugsEvent, DrugWarningEvent, PkClinicalEvent } from './types-pk.ts'; // Stage 7g; FU-8 (B3)
```

In `packages/engine-core/src/types.ts`, find:

```ts
  | DrugsEvent // Stage 7g (types-pk.ts)
  | BloodEvent // Stage 7c (types-blood.ts)
```

Replace with:

```ts
  | DrugsEvent // Stage 7g (types-pk.ts)
  | DrugWarningEvent // FU-8 (B3)
  | BloodEvent // Stage 7c (types-blood.ts)
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk test/l2/endo test/l2/blood test/engine/blood-hyperk.test.ts test/engine/endo-seams.test.ts`,
the fast set, then `npx -y pnpm@9.15.9 --filter @pme/validation test && npx -y pnpm@9.15.9 --filter @pme/demo test`. Prototype:
fast set 269 files green; validation 107 passed / 11 skipped (the oracle documents send drug events without a route);
demo 141.

- [ ] **Commit and push.**

```bash
git add packages/engine-core/src/l2/pk/row.ts packages/engine-core/src/l2/pk/pipeline.ts packages/engine-core/src/l2/pk/data/rows-other.ts packages/engine-core/src/types-pk.ts packages/engine-core/src/types.ts packages/engine-core/test/l2/pk/fu8-insulin-ref.test.ts packages/engine-core/test/l2/pk/fu8-dose-rules.test.ts
git commit -m "fix(pk): insulin infusion reference per kg; explicit routes; curve-row infusions refused; documented maxima raise drugWarning (FU-8 B1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task B2: The sensor-state map in the 1 Hz `state` event (R-S9-6, I-21) — UNPROTOTYPED

**Files:** Modify `packages/engine-core/src/engine.ts` (augment the `state` event as it is emitted), `packages/engine-core/src/types-hemo.ts` (`sensors?:
Partial<Record<SensorId, string>>` on the `state` event). Create `packages/engine-core/test/engine/fu8-sensor-map.test.ts`.

**Why:** a Remote cannot show which sensors are attached (Stage 9 F14: its toggles start unpressed with a one-line
caveat). The states live in four owners — the device layer (`ecg`), Stage 3 (`co2`, `temp`), the hemo pipeline (`spo2`,
`nibp`, `abp`, `cvp`, `pap`, `pv`) and 7d (`icp`, `pbto2`, `urometer`) — so the map is assembled where all are visible,
in `engine.ts`, when the hemo pipeline's `state` event passes out (FU-6/FU-7 edit `engine.ts` elsewhere: Part B).

- [ ] **Step 1 — test (write first):** attach `spo2 motion`, detach `cvp`, attach `co2 on`; within 2 s the next `state` event
  carries `sensors` with exactly those values and the defaults for the rest; a snapshot/restore round trip keeps it.
- [ ] **Step 2 — code:** in the loop that forwards committed events, `if (ev.type === 'state') ev.sensors = sensorMap(ps)`
  with `sensorMap` reading `ps.hemo.pleth.state`, `ps.hemo.nibp.sensor`, `ps.hemo.lines.{abp,cvp,pap}.sensor`,
  `ps.hemo.pvOn`, the device layer's ECG lead state, `ps.resp` co2/temp sensor fields and 7d's organ sensors (read their
  field names on the merged tree; no new state). Plain JSON; no per-tick allocation (build it only on `state` events, 1 Hz).
- [ ] **Step 3 — R45:** no band exists; the test above is new. Controller: `HostSession` forwards `state` unchanged — check
  the remote's protocol test still passes.

- [ ] **Commit and push.**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/types-hemo.ts packages/engine-core/test/engine/fu8-sensor-map.test.ts
git commit -m "feat(engine): the state event carries the sensor-state map (FU-8 B2, R-S9-6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task B3: PI rises after induction — a cutaneous vasomotor tone output (R-FU5-9, I-12) — UNPROTOTYPED

**Files:** Modify `packages/engine-core/src/l2/circ/model.ts` (publish `circOut.skinTone`), `packages/engine-core/src/l2/hemo/pipeline.ts` (the E-FU5-1 pleth
line: replace the vasoconstriction-only SVR factor by `1 / skinTone`), `packages/engine-core/test/engine/fidelity-lowflow.test.ts` (flip the
FU-5 `it.fails` "PI after propofol 1.49 → 1.17" if met; re-measure "ventilated rest PI 1.49 vs 1.80").

**Why:** FU-5's review ruling 1 / R-FU5-9: finger PI follows the local pulsatile volume, set by cutaneous sympathetic tone,
not SV alone; FU-4 owns the sympathetic output and did not publish a skin tone (none on `0fd5397`); Stage 9 declined
it. Definition: `skinTone = (1 + k_s·(reflex SVR drive − 1))·(catecholamine α share)·(1 − anaesthetic vasodilation)`,
1 at rest, < 1 dilated (propofol, volatiles, neuraxial, warming), > 1 constricted (catecholamines, cold, hypovolaemic
reflex); reuse the existing baroreflex `svrF` and 7g's `svr` PD rather than new constants where possible.

- [ ] **Step 1:** measure first (`fidelity-lowflow` 1b rows; the MANUAL MAP ladder must still show PI falling as MAP falls).
- [ ] **Step 2:** implement; acceptance: propofol 2 mg/kg PI RISES (FU-5 `it.fails`); the MANUAL ladder direction test and
  the 3 L bleed rows (PI < 0.3 at MAP < 30) stay green. If the rise cannot be reached without breaking a green row, keep
  the `it.fails` with the new number (R45) and report.

- [ ] **Commit and push.**

```bash
git add packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/fidelity-lowflow.test.ts
git commit -m "feat(circ,pleth): a cutaneous tone output drives the pleth amplitude — PI rises after induction (FU-8 B3, R-FU5-9)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task B4: The tonic sympathetic share an anaesthetic removes (C1, I-54) — PROTOTYPED; Ali reviews BEFORE execution

**Gate:** do not execute until Ali has answered research/19 §8 Q1 (and the review pack's A1/Q1 conflict): the orchestrator
records the ruling in the gate note. If Ali rejects the mechanism, skip this task (the S14 `it.fails` stays).

**Files:** Modify `packages/engine-core/src/l2/circ/baroreflex.ts` (`BaroGains.tonic`, `TONIC_EES_SHARE`, `svrF`/`eesF`),
`packages/engine-core/src/l2/circ/model.ts` (the `stepBaro(` gains: `tonic`), `packages/engine-core/src/l2/circ/profile.ts` (`ResolvedProfile.tonicSymp`, the
four constants, HTN/HFrEF additions). Create `packages/engine-core/test/engine/fu8-tonic.test.ts`. FU-4 owns `baroreflex.ts` (FU-7 Request 2:
"stays yours"): **E-FU8-7**, needs the orchestrator's approval.

**Why (D15):** every sympathetic effector is `1 + o·gain·error`: at rest the error is 0, so propofol's delivered-output
factor `o` removes only the reflex RESPONSE, never a resting level — the induction fall is ≈ −20 % in every profile.
`svrF = 1 − τ·(1 − o) + o·(reflex)` is bit-identical at rest (o = 1) and removes τ of the resting tone under an
anaesthetic. Prototype: healthy −22.5 → −29.9 %, 80 y −23.4 → −37.2, HTN 60 y −22.5 → −35.0, 80 y HTN −21.9 → −42.9 (S14
band −30 … −45: the `it.fails` should flip), HFrEF −21.6 → −42.7. Expect S1b and S14 to flip and the four-patient rows,
DI-46/47/48/79 and CM-01b/03b/05a/06b to move: re-measure each and list before → after in the gate note.

Create `packages/engine-core/test/engine/fu8-tonic.test.ts`:

```ts
// FU-8 Task B4 (research/19 C1; plan D15; for Ali's review BEFORE execution): an anaesthetic removes the TONIC
// sympathetic share of resting SVR, so the patients whose rest depends on it fall more. Propofol 2 mg/kg, ventilated,
// seed 7; nadir 60–360 s after the dose against the 60 s before it. Before (origin/main 0fd5397): every profile −21.6 to
// −23.4 %. Prototype: healthy −29.9, 80 y −37.2, HTN 60 y −35.0, 80 y HTN −42.9, HFrEF −42.7 %.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

async function fall(pt: Record<string, unknown>): Promise<number> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sex: 'M', weightKg: 70, ...pt, sensors: { abp: 'connected' } } as never });
  e.advanceTo(1);
  e.dispatch({ id: 'a', issuedBy: 'test', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } } as never);
  e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } } as never);
  const mapOf = () => (e as unknown as { st: { hemo: { circ: { mapNow: number } } } }).st.hemo.circ.mapNow;
  const pre: number[] = [];
  let nadir = Infinity;
  for (let t = 10; t <= 660; t += 5) {
    e.advanceTo(t);
    if (t > 240 && t <= 300) pre.push(mapOf());
    if (t === 300) e.dispatch({ id: 'p', issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } } as never);
    if (t > 360) nadir = Math.min(nadir, mapOf());
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return nadir / (pre.reduce((a, b) => a + b, 0) / pre.length) - 1;
}

describe('FU-8 B4 (C1): the induction fall depends on resting sympathetic tone', () => {
  it('healthy 40 y stays in S1 (−20 … −40 %); 80 y, untreated HTN and HFrEF each fall at least 5 points more', async () => {
    const h = await fall({ ageY: 40 });
    const rows = { elderly: await fall({ ageY: 80 }), htn: await fall({ ageY: 60, conditions: [{ id: 'htn' }] }), hfref: await fall({ ageY: 60, conditions: [{ id: 'hfref' }] }) };
    console.log(`fu8 B4: healthy ${(h * 100).toFixed(1)} %, ${Object.entries(rows).map(([k, v]) => `${k} ${(v * 100).toFixed(1)} %`).join(', ')}`);
    expect(h).toBeLessThanOrEqual(-0.2);
    expect(h).toBeGreaterThanOrEqual(-0.4);
    for (const v of Object.values(rows)) expect(v).toBeLessThanOrEqual(h - 0.05);
  }, 120_000);
});
```

In `packages/engine-core/src/l2/circ/baroreflex.ts`, find:

```ts
  brainF?: number;
}
```

Replace with:

```ts
  brainF?: number;
  /**
   * FU-8 (C1, research/19; Part B, for Ali's review): the TONIC sympathetic share of resting SVR and contractility
   * (0–1). At rest the delivered output is 1 and nothing changes; when an anaesthetic lowers the delivered output
   * (`outF` < 1) it removes this share of the RESTING tone too, not only the reflex response — so a patient whose
   * resting pressure depends on sympathetic tone (elderly, hypertensive, heart failure: MSNA rises with each) falls more.
   */
  tonic?: number;
}
```

In `packages/engine-core/src/l2/circ/baroreflex.ts`, find:

```ts
const clampSat = (x: number) => Math.min(SYMP_SAT, Math.max(-SYMP_SAT, x));
```

Replace with:

```ts
const clampSat = (x: number) => Math.min(SYMP_SAT, Math.max(-SYMP_SAT, x));
/** FU-8 (C1): the contractility share of the tonic sympathetic support, relative to the SVR share [ENG]. */
export const TONIC_EES_SHARE = 0.5;
```

In `packages/engine-core/src/l2/circ/baroreflex.ts`, find:

```ts
    svrF: 1 + o * clampSat(G_R * s * b.es + G_CP_R * scp * ecp),
    eesF: 1 + o * clampSat(G_C * s * betaC * b.es),
```

Replace with:

```ts
    svrF: 1 - (g.tonic ?? 0) * (1 - o) + o * clampSat(G_R * s * b.es + G_CP_R * scp * ecp), // FU-8 (C1): − the tonic share removed
    eesF: 1 - TONIC_EES_SHARE * (g.tonic ?? 0) * (1 - o) + o * clampSat(G_C * s * betaC * b.es),
```

In `packages/engine-core/src/l2/circ/model.ts`, find:

```ts
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv * (1 - (de.muscBlock ?? 0)), gSymp: m.prof.gSymp * de.gv, betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC)), hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF, brainF: brainstemOutF(m.ext.cbfRel) }, raTm)
```

Replace with:

```ts
    ? stepBaro(m.baro, sensed, { gVagal: m.prof.gVagal * de.gv * (1 - (de.muscBlock ?? 0)), gSymp: m.prof.gSymp * de.gv, betaBlock: Math.min(0.95, m.prof.betaBlock + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlock)), betaBlockC: Math.min(0.95, m.prof.betaBlockC + (m.ext.betaBlockAdd ?? 0) * (1 - m.prof.betaBlockC)), hrGain: de.gvHr, weightScale: w, pinnedSet: m.mapSetPinned, outF: de.symp, setF: de.setF, brainF: brainstemOutF(m.ext.cbfRel), tonic: m.prof.tonicSymp }, raTm) // FU-8 (C1): tonic
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
  tuneLvedp: boolean;
}
```

Replace with:

```ts
  tuneLvedp: boolean;
  /** FU-8 (C1, Part B): the tonic sympathetic share of resting SVR (baroreflex.ts `tonic`); MSNA-graded [ENG]. */
  tonicSymp: number;
}
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
const AS_EES: Record<string, number> = { mild: 1.0, moderate: 1.3, severe: 1.7, critical: 2.0 };
```

Replace with:

```ts
const AS_EES: Record<string, number> = { mild: 1.0, moderate: 1.3, severe: 1.7, critical: 2.0 };
/** FU-8 (C1, Part B): tonic sympathetic share of resting SVR by profile [ENG; MSNA: Sundlöf & Wallin 1978, Grassi 1998]. */
export const TONIC_ADULT = 0.2;
export const TONIC_ELDERLY = 0.3;
export const TONIC_HTN = 0.1;
export const TONIC_HFREF = 0.25;
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
    tuneLvedp: false,
  };
```

Replace with:

```ts
    tuneLvedp: false,
    // FU-8 (C1): young adult ≈ 0.2 (the resting SVR fall under autonomic ganglionic blockade); MSNA doubles 25 → 65 y
    // (Sundlöf & Wallin) — elderly 0.3; untreated HTN and HFrEF add below (Grassi 1998) [ENG sizes, Ali's review]
    tonicSymp: band === 'elderly' ? TONIC_ELDERLY : TONIC_ADULT,
  };
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
    case 'hfref': // tables §1.5: Ees ×0.45, β ×1.3, V ×1.10, G_v ×0.5, MAP_set 75
      p.eesLv *= lerp(0.45);
```

Replace with:

```ts
    case 'hfref': // tables §1.5: Ees ×0.45, β ×1.3, V ×1.10, G_v ×0.5, MAP_set 75
      r.tonicSymp += TONIC_HFREF * s; // FU-8 (C1)
      p.eesLv *= lerp(0.45);
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
    case 'htn': // +20 MAP_set, C ×0.7, R ×1.2, G_v ×0.6, β ×1.3
      r.mapSet += 20 * s;
```

Replace with:

```ts
    case 'htn': // +20 MAP_set, C ×0.7, R ×1.2, G_v ×0.6, β ×1.3
      r.tonicSymp += TONIC_HTN * s; // FU-8 (C1)
      r.mapSet += 20 * s;
```

- [ ] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-tonic.test.ts test/engine/clinical-suite.test.ts test/engine/circ- test/engine/neuro-circ.test.ts test/engine/pk-acceptance-`
and `npx -y pnpm@9.15.9 run audit:drugs all` (FU-7's harness). Every row that moves is a before → after line in the
gate note; a row that breaks a sourced band stops the task (R45) and goes to the orchestrator with the numbers.

- [ ] **Commit and push.**

```bash
git add packages/engine-core/src/l2/circ/baroreflex.ts packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/l2/circ/profile.ts packages/engine-core/test/engine/fu8-tonic.test.ts
git commit -m "feat(circ): anaesthetics remove the tonic sympathetic share of resting tone (FU-8 B4, research/19 C1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```


## Task G: Gate — merge main, full verification, evidence, the gate note, the pull request

**Files:** Create `docs/gates/fu-8.md`, `docs/gates/fu-8/**` (≤ 60 KB PNGs); modify `apps/demo/scripts/fu4-shots.mjs`
(E-FU8-8) and re-take `docs/gates/fu-4/3b-classIV-rosc.png` and `5a-burns-sux-sine.png`; tick this plan.

- [ ] **Step 1 — merge.** `git fetch origin && git merge origin/main` (no stash). Re-run the block checker for any part not
  yet executed (`python3 ../scratch/plans-backup/fu-8-check-blocks.py --part B docs/plans/fu-8-followups.md .`).
- [ ] **Step 2 — full verification** (bounded waits ≤ 10 min per `until` loop; logs under `<scratchpad>/fu-8-followups/`):
  `npx -y pnpm@9.15.9 -r typecheck`; `CI=1 npx -y pnpm@9.15.9 -r test` with `PME_TEST_SET=fast` for engine-core;
  `PME_TEST_SET=slow-a` and `PME_TEST_SET=slow-b` separately — record both wall times (slow-b must stay under 40 min:
  FU-8 adds nothing to it; slow-a gains the `fu8-*` files, ≈ 2 min on the prototype); `pnpm build && CI=1 pnpm test:e2e`
  (both projects; Chromium for the heavy evidence files); `npx -y pnpm@9.15.9 run audit:monitor A1-map-ladder A2-ali-b7 A7-probe B1-rhythms`
  (after-report beside Task A0's before-report); the CM cells CM-15c, CM-15b, CM-05b, CM-04a, CM-01b, CM-03b, CM-06b,
  CM-13a, CM-02a (research/19 §9, `CM_OUT` in the scratch dir — never the research folder); the tick bench
  (`packages/validation/src/perf/tick-bench.ts`, p50 ≤ the FU-4 gate's 0.52 ms + 10 %).
- [ ] **Step 3 — evidence.** (a) Re-take the FU-4 page shots 3 and 5 on this tree: in `fu4-shots.mjs` (E-FU8-8) scenario 5's
  first shot waits until sim 300 + 215 s (10 s before the measured VF at +225 s, when K has passed 8.5 and the ECG is a
  sine wave) instead of 300 + 200; run `node apps/demo/scripts/fu4-shots.mjs http://localhost:4818 docs/gates/fu-4 3,5` (vite
  on 4818 from your own shell) and inspect: 3b shows the latched APNEA as red text on the black bar (D2), 5a a sine wave.
  (b) New shots under `docs/gates/fu-8/`: the Ali tamponade case at MAP < 30 with `**ABPm <value><70` live (A1); the
  AGENTS tile under sevoflurane on philips-like and saadat-like (A7); the fu5-latched pair (A4, from the e2e).
- [ ] **Step 4 — the gate note `docs/gates/fu-8.md`:** base and head; per task the before → after rows (this plan's
  "Prototype results" as the expected column); every `it.fails` added (A5 ×2, A10 ×1, A12 ×1) and flipped (A2 ×3; B4's
  S14 if executed) with numbers; the exceptions E-FU8-1…8 as applied; the TAU scan table (A10); the CM rows beside
  research/19's column (research/12 §7); slow-a/slow-b times; the "Handed to" and "Waiting on Ali" tables copied with any
  number that moved; deviations from this plan and why.
- [ ] **Step 5 — pull request (never merged by the executor).**

```bash
git push
gh pr create --base main --head fu-8-followups --title "FU-8: follow-ups — monitor honesty in arrest, library defects, loose ends" --body-file <scratchpad>/fu-8-followups/pr-body.md
```

The body: goal, the Part A / Part B status, the headline rows, the exceptions and the open questions, ending with the
line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Commits carry the trailer
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (or the executor's own model name). Stop after opening the PR.

## Open questions (for the orchestrator / Ali; the plan does not wait on them except where marked)

1. **F6 (Task A5, D5) — land Option D?** An outflow limiter (a flow out of a compartment × min(1, V/5 mL)) plus collapse
   floors on veins and atria removes every negative volume (class IV rig: VRV −273 → +76 mL, CVP −3 → +0.2) and keeps "CPR
   alone after exsanguination: no pulse", but moves two FU-4 rows fitted on the defective circuit: class IV ROSC with 2 L
   + adrenaline +113 → +261 s (band ≤ 180 s) and 10-min VF CPR kIsch max 0.91 (band < 0.9); the exsanguination-threshold
   measurement becomes "no pulse" at every volume. Options: (a) land D and re-fit FU-4's CPR constants in the R44 pass
   (the two rows `it.fails` meanwhile); (b) keep the pins. The code is in `scratch/plans-backup/fu-8-option-d-circuit.ts`.
2. **TAU_HYP_S re-fit (Task A10, E-FU8-4)** — approve re-scanning the [ENG] constant after C3 removed the artefact FU-3's
   fit leaned on (prototype 220 s: arrest +10.58 min, inside the sourced 9.5 ± 1.4 / 11.4 ± 2.4 min).
3. **C1 (Task B4)** — E-FU8-7 on FU-4's `baroreflex.ts`, and Ali's answer to W15 before execution.
4. **AF 150 in a normal heart (A10)** — after C3 kIsch dips to 0.80–0.84 (quiet band ≥ 0.9, `it.fails`); the residual is the
   demand of the short beats read from the last beat. Accept for v1.0, or average the demand over the same window (a
   second mechanism step, not prototyped)?
5. **The HR numeric in an agonal rhythm (W18)** — "0" ↔ "-?-" every 3–7 s after A2; FU-5's "fresh average after a gap"
   may be right for Philips; confirm before anyone changes `l3/hr.ts`.
6. **Post-ROSC heart rate** (seen while measuring F2): after CPR + 2 L + adrenaline 1 mg in the class IV rig the sinus rate
   is 52–57/min with MAP 130 (baroreflex bradycardia against the adrenaline pressure surge). Recorded here as an
   observation for the FU-4 owner / calibration pass, not a task.
7. **Part B timing** — one PR (wait for FU-7) or two (Part A now)? The plan supports both.


## Self-review

**Coverage — every loose end has a decision (60 inventory rows).** Primary decision per row: Part A task 24 (I-01, 03,
04, 05, 06, 07 [pin], 08 [Gate], 10, 14, 17, 18, 19, 20, 32, 33, 34, 35, 49, 50, 51, 52, 53, 55, 58); Part B task 7
(I-12, 21, 25, 26, 27, 28, 54); handed to an in-flight plan 13 (I-11, 15, 22, 23, 24, 29, 30, 36, 37, 47, 56, 59, 60);
waiting on Ali 3 as the primary decision (I-13, 16, 57) — and 19 questions in "Waiting on Ali" in all, several of them
the size behind a task; calibration pass 5 (I-31, 38, 39, 43, 45); closed on main 5 (I-02, 40, 41, 42, 44); recorded 3
(I-09, 46, 48). Every source the brief named is in the inventory: G-FU4 F1–F6 (+ the 5a evidence defect), G-FU5 /
FU-5 Requests (A10-E5, R-FU5-9, the E-FU4-20 pins), Stage 9 R-S9-1…8 and its declined R-FU5-9, the review-pack defect
list (insulin, route, maximum, curve infusions, amiodarone, onset count, VT 170, agonal, 12-lead, oliguria, neonate, the
58-drug count, the Q51/57/60 collision), the calibration queue (mechanism vs constant), and the CM audit C1–C12 with its
§4/§5 hand-offs.

**Duplication check against the in-flight plans.** Nothing here re-does FU-6 (no lung/resp/gas file), FU-7 (no `l2/pk`
edit before FU-7 merges; its Task 11 keeps the amiodarone conversion; its Task 17 keeps the pressor/vasodilator re-fits),
V.1 (no ventilator file), 7k (no mechanics output) or Stage 9 (no `apps/demo/src/app/**`, `host-session.ts`,
`styles.ts`; the per-skin wording stays its E-S9-4).

**Rules.** R45: no band is widened or removed; the flips are pre-declared `it.fails` that now pass (A2 ×3); new pins carry
their numbers (A5 ×2, A10 ×1, A12 ×1); constants changed are [ENG] with the fit target in the comment (`SAME_COMPLEX_N`,
`SAME_COMPLEX_S`, `AGONAL_RR_CV`, `COR_WIN_BEATS_S`, `ST_DEFICIT_MIN`, `TARGET_MAP_ABOVE_SET`, `BAND.pp` [PALS], `OBESE_BMI`,
`BACKFILL_MAX_S`; the `TAU_HYP_S` re-fit is a declared deviation, Open question 2). R51: only 7g's files touch PK (B1);
the chain order is untouched. R56: every new visible word is a glossary label (EtAA #30, imCO2/FiCO2 #16, PR/Pulse by
skin, clinical state labels), and the new keys are listed for Stage 9's glossary. CI: every new multi-sim-minute file is
`test/engine/fu8-*.test.ts` in SLOW and SLOW_A (verified: slow-b lists none of them); every engine loop yields per
sim-minute. Process: worktree `scratch/wt-fu-8`, branch `fu-8-followups`, per-task commits and pushes with the trailer,
no stash, bounded waits, `git merge origin/main` before `engine.ts`/`circ` edits and the gate, the PR titled as briefed and
never merged by the executor.

**Mechanical find-block check** (`scratch/plans-backup/fu-8-check-blocks.py`, which parses this document's blocks in
order): Part A: 98 find/replace blocks + 15 creates; Part B: 28 blocks + 3 creates; in all 126 + 18. Every find
block occurs EXACTLY ONCE in its file on `origin/main` `0fd5397` and EXACTLY ONCE at its place in the sequence (earlier
blocks applied); problems: 0 — also on `origin/main` `3feee6f` (docs-only commits since). No create overwrites an
existing file. Re-run: `python3 ../scratch/plans-backup/fu-8-check-blocks.py --part AB docs/plans/fu-8-followups.md <tree>`
(B0 and G run it again on the merged tree).

**Applied-tree verification** (Part A applied by the checker to a clean checkout of `origin/main`, then the tests): the 55 files Part A writes are byte-identical to the prototype's;
`pnpm -r typecheck` clean; engine fast set 268 files / 1 199 passed (1 skipped); slow-a subset (`fu8-*` + the FU-4 clinical
suite) 10 files / 48 passed; controller 223, renderer 89, skins 179 (after the Task A7 `-u` snapshot, byte-identical to the
prototype's). On the prototype tree, before the test split: the FU-4/FU-5/7d slow circulation, fidelity, organ and AF sets 46
files / 213 passed, validation 107 passed / 11 skipped, demo 141 passed, fu5-latched e2e 2 passed (Chromium). Parts A + B
applied: typecheck clean, the three `l2/pk` files byte-identical to the prototype's, `test/l2/pk` + `endo-seams` + B4's test 23
files / 98 passed (`fu8 B4: healthy -29.9 %, elderly -37.2 %, htn -35.0 %, hfref -42.7 %`). B4 moves the propofol rows by
design; its full-suite run is part of its own task, after Ali.

**Prototype provenance.** Tasks A1–A18 and B1 were run in `<scratchpad>/fu-8/wt` on `0fd5397`; every Part A block was
generated mechanically from that tree against `origin/main` (and every changed file of the applied tree is byte-identical
to the prototype's). B4 (C1) was prototyped on the same tree and removed again (it is Ali's first). B2 (sensor map) and B3
(skin tone) are UNPROTOTYPED and say so; Task G is procedure. Backups: `scratch/plans-backup/fu-8-followups.md`,
`fu-8-prototype.patch`, `fu-8-option-d-circuit.ts`, `fu-8-check-blocks.py`, `fu-8-writer-notes.md`.

**Known limits.** The HR numeric in an agonal rhythm still alternates "0"/"-?-" (W18). AF 150 leaves kIsch at 0.80–0.84
(Open question 4). The paediatric per-kg output and the HTN/elderly/HFrEF rest pressures wait on Ali (W12, W14). F6's fix
waits on a ruling (Open question 1).
