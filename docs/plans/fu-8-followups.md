# FU-8: Follow-ups — monitor honesty in arrest, library defects, loose ends — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-29): **FIXED (R50 + DV), READY.** R50 review APPROVE WITH FIXES → fixed; the orchestrator's rulings 1–9
> and the DV amendment applied; OQ2 (A22 lands; "CPR flow vs compression quality" to the calibration queue, W22) and OQ3
> (A21 is PEA-only) ruled and applied; V.1's gate-note requests folded in (A28, A29, the A22 addendum, one calibration
> item). Base `origin/main` `fea51fa` (code-identical to `0fd5397`: FU-3 + FU-4 `e81e53f` +
> FU-5 `16cdf79`; docs-only since; V.1 not yet merged). Part A = Tasks A0–A29 (A5 moved to A19; A25 GATED on Ali's W18; A26/A27
> UNPROTOTYPED), Part B = Tasks B0–B5 (after FU-7; B4 after Ali; B2, B3, B5 UNPROTOTYPED), Task G. Two PRs (ruling 8).
> Every prototyped Part A task was run in `<scratchpad>/fu-8/wt` and its blocks generated mechanically from that tree;
> every intermediate commit's tree was rebuilt from THIS document (`--upto`) and tested (Self-review). Mechanical check:
> Part A 146 find blocks (1 CHAINED on an earlier FU-8 block) + 24 creates; Part A + B 174 + 27; 0 problems; Part A
> applied = 74 files byte-identical to the prototype. Backups in `scratch/plans-backup/` (`fu-8-followups.md`,
> `fu-8-prototype.patch`, `fu-8-c1/`, `fu-8-check-blocks.py`, `fu-8-gen-tasks_a.py`, `fu-8-writer-notes.md`).

**Goal:** collect every loose end that no stage owns and turn it into one executable plan, so nothing is lost. The
sources are (1) the FU-5 follow-up list F1–F6 of the G-FU4 ruling (2026-09-29 14:10); (2) the G-FU5 rulings and
FU-5's own Requests (A10-E5, R-FU5-9); (3) the Stage 9 R50 review and the Stage 9 plan's Requests R-S9-1/2/4/6/8;
(4) the review-pack writer's defect list ("Ali's review pack DELIVERED", 2026-09-28 22:20); (5) the calibration-queue
entries that are MECHANISM defects rather than constants; (6) the CM comorbidity audit (research/19) and the DV device
audit (research/20) items the orchestrator routed here; (7) the R50 review's findings F1–F12. Every item is either a task here, handed to a named in-flight
plan (with the reason), waiting on Ali (with the model's numbers), or left for the R44 calibration pass. The item
inventory below is the index; nothing in it is silently dropped.

**Architecture:** no new module crosses a stage boundary (the one new module, `l2/body-size.ts`, is a pure shared size
rule the circulation uses now and 7c adopts in FU-9). Monitor items are L3 (`l3/alarms`, `l3/pulse`,
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
- **Part A / Part B:** execute Part A (Tasks A0–A29, in order; A5 is a pointer to A19; A25 only with Ali's W18 answer) now. Part B (Tasks B0–B4) starts only when FU-7 has merged to main:
  Task B0 is `git fetch origin && git merge origin/main` and re-verifies every Part B find block on the merged tree
  (FU-7 rewrites `l2/pk/**`; a block that no longer matches is re-anchored by its quoted comment, never re-typed).
  If FU-7 has not merged when Part A is done, the executor runs the Gate for Part A alone (PR title suffix "(Part A)")
  and Part B becomes a second PR from the same plan.
- **Merging main while other stages land:** before any task that edits `engine.ts`, `truth.ts`, `l2/circ/**`,
  `l2/resp/**`, `vite.config.ts` or `.github/**`, and in the Gate task: `git fetch origin && git merge origin/main`.
  Every edit is a find-and-replace anchored on quoted text that matches EXACTLY ONCE on `origin/main` `0fd5397` and at its
  place in the sequence — except one CHAINED block (Task A20: marked), which edits a line an earlier FU-8 task
  wrote and so matches once in the sequence only; if a block no longer matches byte for byte, locate the same statement by
  its quoted comment and make the same change; never re-type a line you are not changing.
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
- **Never touch** (other plans own them while in flight): `l2/lung/**`, `l2/resp/**`, `l2/neuro/**`, `l2/gas/**` (except
  `gas/coupling.ts`'s `cardiacOutput`, Task A22, **E-FU8-11** — no in-flight plan edits that file), `l2/co2/**`, `types-lung.ts`, `types-resp.ts` (FU-6/7k/V.1); `l2/pk/**` and `l2/endo/**` in Part A (FU-7);
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
| I-03 | F3: EXTREME BRADY raise/clear cycles of 3.1–3.6 s in the decaying PEA (Ali's case 948/989/1000 s; the 3 L bleed 956 s) | G-FU4 F3; E-FU4-20 (`fidelity-lowflow` 2 × `it.fails`) | cause found: the QRS detector fires TWICE on every agonal complex (second hump starts 2–4 ms after the first closes, 0.19–0.24 s after R); `observeQrs` skips only doubles < 0.2 s, so the agonal ASYSTOLE hold sees R–R 0.2 s, ASYSTOLE drops to latched, the HR reads 16–25 and EXTREME BRADY raises until the 4 s gap re-lives ASYSTOLE | **task A2** (detector: same-complex merge) — flips both `it.fails` |
| I-04 | F3 (second half): SpO2 LOW PERF 1.0 s cycle at 601 s in the 3 L bleed | E-FU4-20 (`fidelity-lowflow` `it.fails`) | one PI dip to 0.30 at 596 s started a PENDING INOP that the clear hysteresis (0.3–0.4) held for the 5 s delay: raised 601 s, cleared 602 s | **task A2** (the on-delay rule; flips the `it.fails`) |
| I-05 | F4: `fu5-latched` e2e — no induction APNEA because the apnoea now starts 4 s later and the script's BVM at +180 s comes first | G-FU4 F4; E-FU4-20 (`test.fail`) | reproduced (`test.fail` holds on `0fd5397`) | **task A4** |
| I-06 | F5: PI spike when motion ends | G-FU4 F5; G-FU5 ruling 2 (FU-5 open question 22, sent to the calibration queue) | `audit:monitor A7-probe`: motion 120–180 s; at 181–185 s PI 8.21/8.21/8.18/8.23 and PR 81 (rest PI 1.84, PR 75). Not a constant: the motion-artefact "beats" stay in the 5 s PI/PR average, and the restarted detector's first foot lies before the restart | **task A3** (mechanism, so taken out of the calibration queue) |
| I-07 | F6: CVP −1 / −2 … −4 after the exsanguination arrest ("negative chamber volumes") | G-FU4 F6; G-FU5 ruling 3 (sent to the calibration queue) | class IV rig (2.5 L / 600 s, no resuscitation): VSV falls 120 mL under v0Sv when the arrest withdraws venous tone (v0Sv 1917 → 2450 mL), P_sv −3.1; the RV, LV and pulmonary bed then drain to NEGATIVE volumes (VRV −273, VLV −62, VPA −1.2, VPV −6.1 mL at 840 s) through a ≈ 3 mL/s forward leak at a 0.1 mmHg gradient (the passive EDPVR bottoms out at −A); displayed CVP −2.9 → −1.0 | **task A19** (Option D LANDED, size-scaled — orchestrator ruling 3: a compartment cannot give blood it does not hold; collapsed veins and atria are not under suction) |
| I-08 | FU-4 evidence defect: `5a-burns-sux-sine.png` shows sinus at MAP 90, not the sine wave (captured too early) | G-FU4 | recorded at the FU-4 gate | **task G** (Gate step: re-take with the FU-4 script at the sine phase) |
| I-09 | PEA static S/D spread 6 mmHg vs ≤ 5 (philips-like keeps S/D/M of the flat line) | E-FU4-20 (`fidelity-arrest` `it.fails`) | 27/21 at 6 samples after FU-4: the kept 2 s max/min carries the PEA's residual contraction ripple at the risen rate — real signal, not a device defect | **recorded** (the `it.fails` stays with its number) |

### B. FU-5's own requests and the G-FU5 rulings

| ID | Item | Source | Measured | Decision |
|---|---|---|---|---|
| I-10 | A10-E5: computed-but-untiled numerics `imco2` (FiCO₂/imCO₂), `mac`, `etAa`, `qtc`, and the agent tile | FU-5 R-FU5-6/R-FU5-7; Stage 9 ruling 1 (R-S9-8) | `mac`/`etAa` published by 7f at 1 Hz with no tile (the AGENTS colour key exists); `imco2` drawn only by the legacy pre-skin tiles | **task A7** (AGENTS module tile + imCO2/FiCO2 extra); a `qtc` tile → **Ali** (a layout choice) |
| I-11 | "PR" as the HR-alarm label when the pulse is the HR source (a run-time choice, not a static alias) | R-S9-8 (Stage 9 ruling 1) | `conditions.ts` hard-codes `label: 'Pulse', upper: 'PR'` for every IEC-text skin | **handed to Stage 9** — its E-S9-4 adds the per-skin `alarms.wording` table this needs (one more key); FU-8 does not add a second wording mechanism to the same schema |
| I-12 | R-FU5-9: PI after propofol should RISE (cutaneous vasodilation); the FU-5 `it.fails` "PI after propofol 1.49 → 1.17" and the ventilated rest PI 1.49 vs 1.80 | FU-5 R-FU5-9; Stage 9 declined it (ruling 1) | reproduced: `fidelity-lowflow` 1.49 → 1.17 (−21 %) at 180–240 s; FU-4 did not publish a skin-vessel tone (`grep skinTone` on main: none) | **task B3** (Part B: `circ/model.ts` is FU-6's and FU-7's file too; UNPROTOTYPED, R45 procedure) |
| I-13 | HR numeric alternates "0" (valid) and "-?-" every 3–7 s under a standing ASYSTOLE with agonal beats | new (found while measuring I-03) | Ali's case 936–1100 s; MANUAL agonal 270 s: 125 invalid samples / 56 flips on main, 34 / 16 after Tasks A2 + A6 | **task A25**, GATED on **Ali**'s W18 (orchestrator Q5: a Part A task that executes with his answer) |

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
| I-32 | The agonal rhythm ignores its rate setting | `onAgonal`: R–R = 3 + 4.5·U s whatever the rate — 11.4/min at every `rateBpm` 4…24 (8/min on the pack's strip) | **task A6** |
| I-33 | The 12-lead printout's HR and axis are unreliable in arrest ("asystole reads HR 120") | `capture12` R peaks = local maxima above 60 % of the strip's maximum: asystole HR 93 / axis 90°, P-wave asystole HR 25, coarse VF 49, fine VF 65, agonal 20 | **task A9** |
| I-34 | The oliguria flag has no owner (fires too early) | `organs` event `kidney.oliguria` = `uopOver(60 min) < 0.5` on a window that is not yet full: 1.75 L bleed from 60 s → flag at 508 s (the INSTANTANEOUS rate 0.50), off at 600 s (one 10-min bin, 0.83), on again at 1200 s (two bins) | **task A8** (the flag needs one completed 10-min bin; D8) |
| I-35 | The neonatal profile is broken; no owner | MODELED spontaneous, 600 s (the `fu8-body-size` harness; R50 F7 corrected the first draft's neonate CO 0.15 / SV 1.1): term neonate 3.5 kg MAP 98 (set point 45), SV 2.15 mL, HR 137–142, CO 0.30 L/min (≈ 86 mL/kg/min vs ≈ 200); ventilated neonate HR 199–214; infant 7 kg MAP 97 (set 55), CO 0.58 (≈ 83 mL/kg/min vs ≈ 150); child 20 kg MAP 105 (set 68), CO 1.62 (81 mL/kg/min vs ≈ 150). Cause: `profile.ts` scales every circuit parameter ISOMETRICALLY (×W/70, the tables' §2.2 rule), so a child gets an adult per-kg cardiac output against adult-sized resistances ×70/W — the whole paediatric circulation, not only the neonate | **task A12** (each band rests at its own set point: MAP 64 / 62 / 79; the per-kg output pinned `it.fails` with its number) + **Ali** W12 (the §2.2 scaling rule is a parameter-table decision: allometric, W^0.75) |
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
| I-49 | C3 (P1): fast AF 150/min kills a healthy 40 y heart (kIsch → 0, agonal +15.5 min, asystole +18 min; sinus 150 is fine) — LVEDP is sampled while the ventricle is still contracting on short beats (`circ/model.ts:396` → `coronary.ts:142`) | research/19 §3 C3; orchestrator: Part A, FU-7 needs it first | **task A10** (Part A; `coronary.ts` only; + Q4's demand averaging: kIsch 0.89, the quiet band an `it.fails` as a model limitation) |
| I-50 | C2 (P1): the ST-depression timer never fires in 3-vessel CAD at HR 110 (needs 45 unbroken s above δ 0.1; resets on any dip; longest run 3 s) (`coronary.ts:180–181`) | research/19 C2 | **task A11** (Part A) |
| I-51 | C4 (P1): obesity sized twice — circulation BV 8.89 L (70 mL/kg total weight, CO ×1.85) vs blood/gas 6.5 L; the lung `obesity` condition on top of the profile halves the Benumof apnoea time (2.7 → 1.43 min) | research/19 C4 | **task A13** (Part A: ONE continuous body-size rule, `l2/body-size.ts`, Lemmens-indexed and anchored on the default adult — R50 F1, ruling 1; FU-9 inherits it); the lung half → **handed to FU-6** (R4 re-tunes the obese apnoea on the one definition; Ali Q3 decides profile vs condition) |
| I-52 | C5: profile targets disagree with the reflex set point (untreated HTN MAP +13 vs +20; HFrEF MAP 87 / LVEDP 14 vs 75 / 15–20; 80 y MAP 110.6 vs 90–100) | research/19 C5 | **task A12** (Part A: each age band's targets derive from its set point; the condition deltas and the elderly 140/80 kept, D13) |
| I-53 | C12: `setRhythm` silently accepts and drops unknown `opts` keys (a pacemaker fault works only under `opts.pacer`) | research/19 C12 | **task A14** (Part A: validate `RhythmOpts`, reject unknown keys with a reason) |
| I-54 | C1: chronic disease does not change the propofol fall (≈ −20 % in healthy, 80 y, HTN, AS+CAD, HFrEF, PH) — no disease-dependent resting sympathetic tone for propofol to remove (`baroreflex.ts:151–158`); the mechanism behind Ali's Q1 conflict and FU-4's S14 `it.fails` | research/19 C1 | **task B4** (Part B, prototyped with numbers; flagged for Ali's review BEFORE execution) |
| I-55 | C8: PH too mild (PVR 5.9 vs 10 WU "severe"; ×3 whatever the grade), no RV ischaemia at induction, noradrenaline and phenylephrine give the same PAP/SAP ratio | research/19 C8 | the grade IS ignored (`profile.ts` `ph`: PVR × 3 at every grade) — a data defect: **task A18** (the tables' 3/5/10 WU; PROTOTYPED: 2.9 / 4.7 / 9.6 WU; `profile.ts` is FU-7's E-FU7-3 file, other lines); RV ischaemia on induction follows C1 (task B4); the pressor rows' pulmonary arms → **handed to FU-7** (Task 17 re-fits those rows); iNO → **Ali** (a new drug) |
| I-56 | C9: HFrEF's weak response to hydralazine (SV +3.5 %, SVR −15 %) and to fluid (no flooding) | research/19 C9 | hydralazine size → **handed to FU-7** (Task 17 takes CM-06e as its check, research/19 §4 item 2); lung water reaching gas exchange → **handed to 7k** (7b diffusion/shunt from EVLWI); the SV-per-SVR sensitivity → **cal** + Ali Q10 |
| I-57 | C10: missing profiles (CKD, diabetic autonomic neuropathy, OSA, cirrhosis; the liver-failure stand-in leaves CO/SVR unchanged) | research/19 C10 | **Ali** (v1.0 vs v1.1 scope; not built) |
| I-58 | Stage 9 items: the scenario schema has no `endo` block; there is no posture input | research/19 §5 Stage 9 | `endo` → folded into **task A16** (R-S9-4 schema); posture → **Ali** (a new input: v1.0 or v1.1; CM-02e) |
| I-59 | C6 elderly closing capacity; C7 COPD normocapnic; C11 smaller gaps (COP at albumin 25, IAP renal, cirrhotic glucose, CKD diuresis, elderly bleed tachycardia, INR) | research/19 C6, C7, C11 | **handed**: C6 → 7b/FU-6 (apnoea work), C7 → FU-6 (the drive's `paco2Set`), C11 → their owners (7c COP, RH-06 IAP, 7e glucose, 7d CKD, 7a baroreflex, 7i INR) as listed in research/19 §3 |
| I-60 | research/19 §4 findings for FU-7 (dobutamine measure-first, hydralazine HFrEF cell, esmolol re-measure, the surge's hypertensive arm, AF rigs after C3, Task 9 as C1's home, E-FU7-3 widening, diabetic dexamethasone arm, bronchial reactivity, `ventRemiEq` for OSA) | research/19 §4 | **handed to FU-7** (its fixer/executor reads §4; C3 lands in FU-8 Part A first, as the orchestrator ruled) |

### G. The DV device/resuscitation coverage audit (`research/20-coverage-devices.md`, 65 cells on `3feee6f`; the orchestrator's DV amendment, 2026-09-29)

Each item is measured before its fix (the research/20 cell, re-run on the Part A prototype where Part A moves it). Part A
unless a file overlaps FU-6/FU-7 (then Part B).

| ID | Item | Source | Measured (before → after, prototype) | Decision |
|---|---|---|---|---|
| I-61 | (a) The IABP harms: CoPP from the post-deflation dip (`coronary.ts:142`, C3's line), a deflation cut short (`devices.ts:48–54`), MANUAL deflation 270 ms late | research/20 V2; DV-13d, DV-M5, DV-13b–c, DV-14 | DV-13d arrest +11.0 min → none, CoPP 43.1 → 66.2 (control 55.1); DV-M5 +283 → −113 ms | **task A20** (+ W26: assisted systole −19.1 vs the tables' −5) |
| I-62 | (b) A PEA made by a shock or by the instructor is inert (no arrest state: no decay, no ROSC); FU-7 Task 12 depends on it | V1; DV-01b | pulse regained 0 → 11 of 11 shock-PEAs; `peaArrestDeclared` false → true | **task A21** (PEA only — ruling OQ3; MODELED; MANUAL → W21) |
| I-63 | (c) CPR on a tamponaded heart: 181/124, 12 L/min | V3; DV-04a | 181/124, MAP 154, 11.9 L/min → 38/17, MAP 20.1, 0.57 L/min | **task A19** (the outflow limiter fixes it; its acceptance test) |
| I-64 | (d) EtCO2 under CPR from a quality fit, blind to the circulation (a bled-out patient reads 17.4); V.1's "CPR flow scaling" | V4; DV-03, DV-04a | bled-out 17.4 → 7.2; tamponade 15.9 → 12.8; VF CPR 18.8 → 16.5; R39-2's quality map missed (20.4 / 25.2 / 26.6 / 26.6) | **task A22** (E-FU8-10/11; the quality map an `it.fails`; W22) |
| I-65 | (e) Cerebral flow under CPR 0.71 of normal (consensus 30–40 %) | V8; DV-02a | 0.71 → 0.45 (A19) | **task A24** (the fall asserted; the consensus an `it.fails` at 0.45; W22) |
| I-66 | (f) Transcutaneous pacing is painless (ΔNE 0 at 80 mA awake) | V6; DV-08c | ΔNE 0, MAP awake 98.5 vs GA 95.7 | **task B5** (Part B: `l3/device-layer.ts` is FU-7 Task 12's file, the stimulus path is `engine.ts` + `l2/endo`; UNPROTOTYPED) |
| I-67 | (g) The LVAD has no preload physiology (1.5 L bleed: flow 3.99 → 3.70, no suction; PI 6.7 vs HM3 3–4) | V9; DV-17, DV-16d, DV-18b | flow 3.96 → 3.70 min, PI 6.77, power 3.61 W (Part A prototype) | **task A26** (UNPROTOTYPED); the NIBP half (10 of 10 valid at PP 20, DV-16b) → **Ali** W27 |
| I-68 | (h) Starting CPR does not put the compression artefact on the ECG | V7; DV-23a | `artefact.cpr` null under CPR → {rate, depth = quality} | **task A23** |
| I-69 | (i) The MANUAL post-ROSC pressure ramp is invisible (SBP 90 % at 10 s) | V12; DV-M3 | fracAt10s 0.9 (0.4–0.8) | **task A27** (UNPROTOTYPED) |
| I-70 | The shock outcome ignores the state it lands in (termination 70 %, ROSC share blind to CoPP, temperature, K, rhythm class, energy) | V5; research/20 §4 | — | **handed to FU-7** Task 12 (the orchestrator's FU-7 amendment carries research/20 §4 items 1–7) |
| I-71 | IABP trigger in arrest, trigger-loss alarms, LVAD thrombosis | V10; DV-15b, DV-19 | — | **handed to 7h** |
| I-72 | Hyperkalaemic contractility read from plasma K, not the calcium-stabilised value | V11; DV-25b | — | **handed to FU-9** (beside its F2) |
| I-73 | Pericardiocentesis, ICD, pacemaker magnet, ECMO, a MODELED cardiogenic-shock state, EMI → pacemaker sensing | research/20 §6 (NE cells) | — | **Ali** W24 (v1.0 vs v1.1; the device items are 7h's) |
| I-74 | research/20 §8's nine questions | research/20 §8 | numbers in W25 | **Ali** W25 |
| I-75 | DV-26b's asphyxia rig assumed the arrest at ≈ 410 s (τ 300); after Task A10 it comes ≈ 13 min after the occlusion | DV-26b on the prototype: no organised arrest in the 450 s window | — | **recorded** (research/20's re-run moves the cell's CPR start; not a defect) |

### I. V.1's gate note (`origin/stage-v1-ventilator-followup` `docs/gates/stage-v1.md` §10 "Requests / open items"; the orchestrator's amendment)

| ID | Item | Measured (before → after, prototype) | Decision |
|---|---|---|---|
| I-76 | Propofol's distribution reference for non-70 kg patients (`engine.ts:485`, FU-4 G10 × F4): q = CO/ref ≈ effKg/70 after the first seconds | 16 kg child q 0.73 / 0.47 / 0.20 (dose at 0 / 5 / 120 s) → 0.83 / 0.84 / 0.94; propofol nadir 57.9 / 56.7 / 54.7 → 58.9 / 58.4 / 58.3; 70 kg bit-identical | **task A28** (Part A: FU-6/FU-7/FU-9 anchors in `engine.ts`/`blood/pipeline.ts` checked, 0 broken) |
| I-77 | The massive-PE link profile has no PVR (FU-4 G6's alias does not apply to a profile's `lungConditions`) | PVR × 1.0, PA 15.3 → × 9.0, PA 64.8 mmHg | **task A29** |
| I-78 | CPR flow should scale with the patient (V.1 Decision 25; adult-absolute in `gas/coupling.ts`) | 16 kg child CPR 63 → 19 mL/kg/min (coRatio 0.84 → 0.25, EtCO2 38.6 → 22.0) | **task A22** (addendum + test); V.1's CPR guard → **handed to FU-6** |
| I-79 | Anaphylaxis in MANUAL link profiles; `writeLung` must not remove a profile-owned spec (V.1 Decision 23; the stand-in stays) | — | **cal** (calibration queue, "Handed to") |
| I-80 | The link race V.1 fixed in `port.ts` was on main as well (a combined-page session that switched demos could lose the ventilator) | — | **handed to 8b** (a release-notes line) |

### H. The R50 review of this plan (APPROVE WITH FIXES, `<scratchpad>/fu-8-review/review.md`) — where each finding went

| Finding | Ruling | Where |
|---|---|---|
| F1 (MAJOR) A13's "one rule" was a third, discontinuous one | 1: ONE continuous rule, anchored at 4 900 mL, curve 50–160 kg, FU-9 inherits | Task A13 (new `l2/body-size.ts`, the curve table); "Handed to" FU-9 |
| F2 (MAJOR) τ re-fit not at the joint plateau's middle; S8 on its band edge | 2: the middle of the joint plateau, margins against both files, same start | Task A10 (τ 235, the joint scan, the source comparison corrected); E-FU8-4 |
| F3 (MAJOR) moved FU-3/FU-4 rows not declared; the EXTREME BRADY display in Ali's case | 4: declare every moved row; the display → Ali | Task G's moved-rows table; W20 |
| F4 (MAJOR) Open question 1's premise wrong; absolute 5 mL breaks children | 3: land Option D size-scaled; ROSC re-stated; kIsch re-measured | Task A19; D5 rewritten; E-FU8-9 |
| F5 (MAJOR) the A2 test passed on main | 5: it must fail on main | Task A2 Step 1 (flips/invalid count: 56 on main, 16 after) |
| F6 false inequalities during the clear hysteresis | 9 | Task A1 (`held`) |
| F7 neonate CO misreported (0.30, not 0.15) | 9 | I-35, D9, "Prototype results", W12 (the neonate's offset from its set point) |
| F8 stale numbering (plan and committed code) | 9 | renumbered throughout, in the code comments and test names too |
| F9 Q4's "physiological demand ischaemia" is an artefact | 6: one more sourced step, else `it.fails` | Task A10 (demand over the window: 0.84 → 0.89; `it.fails` as a model limitation) |
| F10 hand-offs incomplete | 9 | "Handed to": 7k's `vite.config.ts` blocks, FU-7 Task 17 on the A18 baseline, FU-9 inherits A13 |
| F11 exceptions and titles | 9 | E-FU8-3 (+ the skins snapshot); the asphyxia title re-stated (A10); A7's verify line (renderer 89) |
| F12 info (full slow-a never run; e2e spans) | 9 | Self-review (slow-a and slow-b run in full on the prototype); Task G |
| Q5 the HR "0"/"-?-" flicker | 7: a Part A task gated on W18 | Task A25 |
| Q7 two PRs | 8: confirmed | Global Constraints; Task G |
| OQ2 EtCO2 loses its quality slope | A22 lands; the R39-2 map an `it.fails`; "CPR flow vs compression quality" to the calibration queue, flagged for Ali | Task A22; "Handed to" (calibration); W22 |
| OQ3 the instructor's VF in the arrest state | PEA-only in v1.0; S13 and DV-22a stay unmoved; the instructor-VF case recorded for the calibration pass | Task A21; D20; "Handed to" (calibration) |

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
- **D5 — F6 LANDS as Option D, size-scaled (I-07; orchestrator ruling 3; R50 F4).** The defect: a ≈ 3 mL/s forward leak
  at a 0.1 mmHg gradient drained the RV, LV and pulmonary bed to NEGATIVE volumes, because the passive pressures bottom
  out (EDPVR → −A; linear atria and pulmonary compliances) and nothing stopped a compartment giving blood it did not
  hold. Four mechanisms were prototyped by the writer (A venous floor only; B + atrial floor; C + inlet waterfall; D an
  outflow limiter — a flow out of a compartment × min(1, V / vEmpty) — plus collapse floors on the veins and atria);
  only D removes every negative volume without inventing a pulse. The first draft kept D back on two wrong premises the
  review corrected: the "10-min VF CPR kIsch < 0.9" row was already an `it.fails` on main (D FLIPS it: 0.91 → 0.89), and
  main's class IV ROSC is +119 s, not +113; the one passing row D moves is "ROSC ≤ 180 s", a measured expectation, now
  re-stated ≤ 300 s (+260 s: CPR cannot perfuse an empty heart until the 2 L are in). An absolute 5 mL `vEmpty` throttled
  small hearts (neonate CO 0.31 → 0.165 L/min, `vent-infant` failed): it scales with the heart (5 mL × W/70), and the
  paediatric outputs are unchanged. Task A19 runs after A18 so every commit stays green; it also FIXES research/20 DV-04a.
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
  scaling rule (volumes ×W/70, resistances and elastances ×70/W), a parameter-table decision (R44, Ali). Task A12 centres
  each band on its set point (neonate MAP 98 → 64; CO 0.30 → 0.31 L/min, SV 2.15 → 2.2 mL — R50 F7: the first draft's
  "CO 0.15 → 0.31" was misreported; A12 changes the pressure, not the output) and adds the per-kg output target as an
  `it.fails` with its number; the refit waits on Ali's scaling decision (allometric W^0.75 or a per-band parameter set).
  The neonate then rests 16–19 mmHg above its own stabiliser target (68/38, MAP 48) and set point (45): W12 carries it.
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

- **D16 — ONE continuous body size (I-51; ruling 1; R50 F1).** `l2/body-size.ts`: size = (height / the band's default
  height) × √(70 × weight) for adults (Lemmens' BV ∝ height·√weight), blood volume = the band's per-kg value × size,
  the isometric scaling on the size. Anchored so the default 70 kg adult is exactly itself (4 900 mL); continuous and
  monotonic over 50–160 kg in both sexes with or without a height; 127 kg / 175 cm: 6.6 L, CO × 1.33. A shared module so
  7c (FU-9) adopts the same definition. Stage 3's `effKg` stays its metabolic rule.
- **D17 — `TAU_HYP_S` 235 s (E-FU8-4; ruling 2; R50 F2).** The middle of the plateau where the asphyxia file AND S8 pass at
  every commit: 220–250 s at Task A10's commit, 175–257 s once A19 lands. Margins: asphyxia 6.2 / 2.8 min to its 5–14 band
  (+11.2 min after SaO2 < 60 %, ≈ 13.2 min after the occlusion — DeBehnke's 11.4 ± 2.4), S8 5 s at A10 (+9.92 min) and
  15 s after A19 (+9.75); the FiO2 1 reversal 7 s. R44 records: no arrest at SaO2 ≈ 0 for τ ≥ 260 s; S8's thin margin.
- **D18 — the AF residual is a model limitation (Q4; ruling 6; R50 F9).** One further sourced step — the demand averaged
  over the supply's window, each beat at its own rate (Suga 1990: MVO2 = the beats' PVA) — raised the AF 150 kIsch minimum
  0.84 → 0.89; the quiet band 0.9 stays an `it.fails` with that number, worded as a limitation, and FU-7's Task 0 takes
  its guard path.
- **D19 — the IABP's coronary term is device-scoped (I-61).** While a balloon runs, the supply reads the diastole's mean
  aortic pressure less the unassisted (mean − minimum) offset; without one nothing changes. A diastolic-mean supply for
  every beat is the more general mechanism but moves every coronary row; it is recorded for the calibration pass.
- **D20 — the arrest state for every pulseless ELECTRICAL rhythm, MODELED only (I-62; ruling OQ3).** A shock-made or
  instructor-made PEA carries it from its onset; an instructor-selected VF or asystole does not in v1.0 — the prototyped
  "every pulseless state" version withdrew the humoral volume in the instructor's VF and moved S13 (→ 23.1–26.4), the
  VF-CPR kIsch (→ 0.66) and DV-22a (a sinus selected after 4 min of VF with CPR re-arrested at +10 s, against DV-01c's
  "holds after 3 min of CPR"); recorded for the calibration pass. MANUAL keeps the instructor's rhythm (Q9: W21).
- **D21 — EtCO2 under CPR from the circulation (I-64).** The ruling's mechanism, not a fit: the price is R39-2's quality map
  (the circulation's CPR flow is filling-limited above quality 0.8), pinned `it.fails` with its numbers; how steeply CPR
  flow follows quality is FU-4's CPR-model constants and Ali's teaching choice (W22).
- **D22 — the CPR artefact through the ST seam (I-68).** `engine.ts` already merges `hemo.stPatch` into the committed
  modifiers; widening that patch to a `ModifiersPatch` puts the artefact on the ECG without an `engine.ts` edit (FU-6 and
  FU-7 both edit `engine.ts`).
- **D23 — cerebral flow under CPR: no new mechanism in v1.0 (I-65).** A19 brings it from 0.71 to 0.45; the consensus
  0.30–0.40 (and research/12's band 0.2–0.45, at its edge) is an `it.fails` at 0.45 — a calibration-pass item.
- **D24 — chained blocks.** One block (A20's `aoDiaOf` on A10's window loop) edits a line an earlier FU-8 task wrote; it
  matches once at its place in the sequence and is marked. Every other block
  matches once on `origin/main` too.
- **D25 — unprototyped Part A tasks.** A25 waits on Ali (W18); A26 (LVAD preload) and A27 (MANUAL post-ROSC ramp) are
  written as measure-first designs with acceptance cells: each needs a mechanism choice the executor measures (the
  LVAD's collapse volume; the tracker's re-arm), and neither blocks another task.

## Prototype results (before → after; seed 7; before = `origin/main` `0fd5397`/`1147d4f` (code-identical) unless stated; after = the task's code in `<scratchpad>/fu-8/wt`)

| Item | Rig | Before | After |
|---|---|---|---|
| I-01 F1 (A1) | MANUAL MAP ladder 100 → 13 (A1-map-ladder) | `**ABPm 60<70` frozen from the raise | text follows the tile on every one of 470 rows (gap 0 mmHg); one `raised` event |
| I-01 F1 (A1) | FU-4 page, class IV + CPR + 2 L + adrenaline | `**ABPm 252>110` shown 13 s after the mean was back near 120; `**etCO2 4<30` at EtCO2 15 | (same fix) |
| R50 F6 (A1) | ABPs low 90: 85 → 90 → 92 | (first draft) `**ABPs 90<90`, `**ABPd 90>90`, `**CVP 10>10` through the hysteresis | the last violating text is kept (`**ABPs 85<90`) |
| I-03 F3 (A2) | `fidelity-lowflow` Ali's case / 3 L bleed | EXTREME BRADY 3 cycles (3.1–3.6 s) / 1 cycle (3.6 s) | 0 / 0 — both `it.fails` pass |
| I-03 F3 (A2, A6) | MANUAL agonal 30–300 s (`fu8-agonal-qrs`) | HR invalid 125 of 269 samples, 56 valid↔invalid flips (the test FAILS on main — R50 F5) | 34 invalid, 16 flips; no reading > 25/min |
| I-04 (A2) | `fidelity-lowflow` 3 L bleed, technical | LOW PERF raised 601 s, cleared 602 s | none — the `it.fails` passes |
| I-06 F5 (A3) | MANUAL motion 120–180 s | PI 8.21/8.21/8.18/8.23 and PR 81 at 181–185 s | PI -- at 181, then 1.95/1.99/2.00/1.91 (rest 1.85); PR 75 |
| I-05 F4 (A4) | `fu5-latched.e2e.ts`, Chromium | no APNEA on either skin (`test.fail`) | philips-like live 186–215 s, latched 216–457 s; saadat-like live 191–216 s; 2 passed in 3.9 min |
| I-32 (A6) | MANUAL, 300 s | 11.4/min at every rateBpm (4, 8, 12, 20, 24) | 4 → 3.8, 8 → 8.0, 12 → 12.0, 20 → 18.8, 24 (clamped 20) → 18.8/min |
| I-10 (A7) | renderer | no agent tile; imCO2 undrawn | AGENTS module tile (EtAA 2.0 %, MAC 1.0) while 7f publishes; CO2 tile "awRR 12  imCO2 0"; skins 179, renderer 89 tests |
| I-34 (A8) | MODELED 1.75 L / 10 min from 60 s | flag 508 s (instantaneous 0.50), off 600 s, on 1200 s | first flag 1200 s (hourly 0.49); never before 600 s; `organs-renal` (7d) unchanged |
| I-33 (A9) | MANUAL, capture 40 s after the switch | asystole HR 93 / axis 90°; P-wave asystole 25; agonal 20; coarse VF 49; fine VF 65 | asystole and P-wave asystole HR --/axis --; sinus 76, VT 170, AF 99 unchanged; VF 191 / 51 (Ali D3) |
| I-49 C3 (A10) | research/19 CM-15c / CM-15b; `fu8-coronary` | kIschMin40 0, agonal +15.5 min; CM-15b agonal +10 min | supply only (first draft): 0.80–0.84; + the demand over the window (Q4): **0.89**, no arrest in either arm |
| I-49 τ (A10) | `circ-hypoxic-arrest` + clinical suite S8, joint scan | τ 300: asphyxial PEA +6.35 min (on the last-beat artefact); τ 300 after C3: no arrest | **τ 235**: PEA +11.2 min after SaO2 < 60 %, S8 +9.92 min (+9.75 after A19), reversal 7 s (table in Task A10) |
| I-50 C2 (A11) | 3-vessel CAD (CFR 1.4), 65 y, 80 kg, HR 130, 10 min | kIsch 0.65, ST 0.00 mV | kIsch 0.67, ST −0.214 mV (0.69 / −0.200 once A13 sizes the rig); healthy 65 y: no ST |
| I-52 C5 (A12) | MODELED spontaneous, 600 s | neonate MAP 98, CO 0.30 (R50 F7: not 0.15); infant 97, 0.58; child 105, 1.62; ventilated neonate HR 199–214 | neonate 64, 0.31; infant 62, 0.60; child 79, 1.72; ventilated neonate HR 152; adult, elderly, HTN, HFrEF targets bit-identical |
| I-51 C4 (A13) | 127 kg / 175 cm ventilated, 300 s; the curve 50–160 kg | BV 8 890 mL, CO × 1.81 (9.68 L/min); first draft: a BMI-30 step (M CO −8 %, F −26 % for 1 kg) | BV 6 600 mL, CO × 1.33; continuous (≤ 20.7 mL per 0.5 kg), monotonic in both sexes with or without a height; 70 kg default 4 900 mL exactly |
| I-53 C12 (A14) | `setRhythm pacedVVI { fault, faultRate }` | accepted, no effect | refused: "opts: unknown keys fault, faultRate (known: …)"; under `opts.pacer` accepted |
| I-17/18 (A15) | controller | `etco2 ≥ 20 → rosc`; 5 built-ins | the host's words through a Labeller; transition targets by state label ("→ Coarse VF"); 11 built-ins; controller 223 tests |
| I-20 (A16) | controller | no card fields, no `endo` | category/story/objectives/durationMin/`patient.endo` validate; an unlabelled state warns |
| I-14 (A17) | `SweepLane` first frame | 1 sample back (blank lane) | the last 3.84 s redrawn at once |
| I-55 C8 (A18) | PH grades | PVR 4.7 WU at every grade | mild 2.9 / moderate 4.7 / severe 9.6 WU |
| I-07 F6 (A19) | class IV 2.5 L, no resuscitation | VRV −273, VLV −62, VPA −1.2, VPV −6.1 mL; displayed CVP −2.9 → −1.0 (min −3.5) | min chamber volume 11 mL; CVP ≥ −0.1; neonate CO 0.311 (unchanged; absolute 5 mL: 0.165) |
| I-07 F6 (A19) | FU-4 rows on the Part A tree | class IV ROSC +119 s; VF CPR kIsch max 0.91; 7b trough 30.6; S13 25.1–28.8; 3 L +180 s, 3.5 L +170 s | +260 s (re-stated ≤ 300); 0.89 (pin flips); 25.2 (pin flips); 24.9–28.0; no pulse up to 3.5 L |
| I-63 (A19) | research/20 DV-04a (tamponade CPR) | 181/124, MAP 154, 11.9 L/min, CVP 60, CoPP −12.9 | 38/17, MAP 20.1 (test: 24.3 vs VF 48.5 at A19), 0.57 L/min, CVP 15.7, CoPP 8.3 |
| I-61 (A20) | research/20 DV-13d, DV-M5, DV-13b/c, DV-14d | arrest +11.0 min, CoPP 43.1 vs 55.1; deflation +283 ms; ΔEDP −16.5, ΔSys −15.4; ΔCO 0.20, PAWP −8.7 %; late-deflation EDP +4.1 | no arrest, 66.9 vs 55.1; −113 ms; −18.6, −19.1; 0.05, −21.3 %; +16.6 |
| I-62 (A21) | research/20 DV-01b (40 seeds); `fu8-pulseless-arrest` | 0 of 11 shock-PEAs regain a pulse; instructor PEA never decays | 11 of 11; instructor PEA + CPR: a pulse 61 s into CPR; untreated: agonal, then asystole |
| I-62 (A21) | FU-4 rows | S13 24.9–28.0; VF CPR kIsch 0.89; DV-22a | unchanged (PEA-only, ruling OQ3; the all-pulseless variant moved them to 23.1–26.4, 0.66 and a re-arrest at +10 s) |
| I-64 (A22) | research/20 DV-03 / DV-04a / DV-02b; arrest-etco2; R39-2 | bled-out 17.4; tamponade 15.9; VF CPR 18.8; +2 min 16.4; quality map 13.2 / 20.3 / 24.8 / 27.4 | 7.2; 12.8; 16.8; 18.0 (pin flips); 20.4 / 25.2 / 26.6 / 26.6 (`it.fails`, W22) |
| I-68 (A23) | CPR on/off | `artefact.cpr` null | {rateCpm 110, depth 0.8}, cleared when CPR stops |
| I-65 (A24) | research/20 DV-02a | CBF 0.71 | 0.45 (A19; the consensus an `it.fails`) |
| engine fast set | `CI=1 PME_TEST_SET=fast` | 266 files / 1 194 | 268 / 1 200 at A18's commit; 271 / 1 206 with A19–A24 (1 skipped) |
| slow-a / slow-b | full, on the prototype | — | slow-a 22 files, 88 passed + the known macOS `pk-longrun` red (2.506500255440444, identical on main), 13.4 min; slow-b 45 files / 251 passed, 16.4 min locally (FU-8 adds no slow-b file) |
| packages | controller / renderer / skins / demo / validation | — | 223 / 89 / 179 / 141 / 107 + 11 skipped |
| I-25 (B1) | insulin 0.1 units/kg/h, 60 min | infTarget 70, glucose −118, K −1.3 (2.88) | infTarget 1.0, glucose −60, K −0.6 (3.47) |
| I-26/28 (B1) | dose events | every route accepted as IV; amiodarone infusion accepted, no effect | IM adrenaline refused with the reason; IO/central accepted; nebulised salbutamol accepted (declared); amiodarone infusion refused |
| I-27 (B1) | lidocaine 3 + 2 mg/kg | nothing | one `drugWarning` "cumulative 350 mg exceeds the maximum 315 mg"; both doses given |
| I-54 C1 (B4) | propofol 2 mg/kg nadir (5 profiles) | −22.5 / −23.4 / −22.5 / −21.9 / −21.6 % | −29.9 / −37.2 / −35.0 / −42.9 / −42.7 % (healthy / 80 y / HTN 60 y / 80 y HTN / HFrEF) — Part B, Ali first |

## Exceptions (edits outside a task's own partition; each needs the orchestrator's approval at review)

- **E-FU8-1** (Task A2): `packages/engine-core/test/engine/fidelity-lowflow.test.ts` (FU-5/FU-4) — three `it.fails` flipped
  to `it`, titles re-stated with the after-numbers; no assertion changes (R45: pre-declared pins flipping).
- **E-FU8-2** (Tasks A15, A16): controller tests — `builtins.test.ts` (the list pin grows from five to eleven ids),
  `panel/scenario-tab.dom.test.ts` (a transition names its target by the state label: "→ Coarse VF"), `schema.test.ts`
  (the fixture's states gain labels, because an unlabelled state now warns). Pins of lists and text, not bands.
- **E-FU8-3** (Task A7): `packages/renderer/test/fu5-tiles.test.ts` (FU-5) — the philips-like CO2 extras line gains
  `imCO2 0`; and `packages/skins/test/__snapshots__/resolve.test.ts.snap` (4a) regenerated with `-u` — its diff is ONLY
  the AGENTS tile and colour lines (+9; R50 F11).
- **E-FU8-4** (Task A10): `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` (FU-3) — the asphyxia rig runs 24
  min instead of 20 (both runs), and the first test's title re-states its arrest time (+11.2 min at τ 235; it still read
  "+6.90 min (TAU_HYP_S 360)"); and the declared re-fit of the [ENG] `TAU_HYP_S` 300 → **235 s**, the middle of the joint
  plateau over the asphyxia file and FU-4's S8 at every commit (ruling 2; D17; the table in Task A10).
- **E-FU8-5** (Task A4): `apps/demo/src/stage7f.ts` (7f's page: a `?bvmAt=` parameter, default unchanged) and
  `apps/demo/e2e/fu5-latched.e2e.ts` (FU-5: `test.fail` removed, the page opened with `&bvmAt=210`).
- **E-FU8-6** (Task A6): `packages/engine-core/test/l2/ecg/nan-guard.test.ts` (FU-4) — the `agonal` entry of the pre-guard
  schedule fixture re-recorded (6142c308 → d9075744 on darwin); every other rhythm's hash untouched.
- **E-FU8-7** (Task B4, only if Ali accepts C1): `packages/engine-core/src/l2/circ/baroreflex.ts` (FU-4's file; FU-7's
  Request 2 keeps it FU-4's) — the `tonic` gain and two effector lines.
- **E-FU8-8** (Task G): `apps/demo/scripts/fu4-shots.mjs` (FU-4) — scenario 5's first shot waits for the sine-wave rhythm
  instead of a fixed +200 s, for the re-take of `5a-burns-sux-sine.png` (I-08).
- **E-FU8-9** (Task A19; orchestrator ruling 3): FU-4's `circ-lowflow-arrest.test.ts` — the class IV ROSC row
  RE-STATED from "within 3 min (+113 s)" to "within 5 min (+260 s after A19; +119 s before)": a measured expectation, not a
  sourced band (FU-4's own plan called the 3 min arbitrary); `hemo-acceptance.test.ts` — the 7b pin flips (30.6 → 25.2);
  `clinical-suite.test.ts` — the 10-min VF kIsch pin flips (0.91 → 0.89) and S13's `it.fails` title re-states its range
  (24.9–28.0). No band is widened except the re-stated ROSC row, which the
  ruling names.
- **E-FU8-10** (Task A22): `arrest-etco2.test.ts` (FU-4) — its "≥ 17 at +2 min" pin flips (16.4 → 18.0);
  `cpr-etco2.test.ts` (Stage 3.1, R39-2) — the quality map and the ventilation-rate rows become `it.fails` with their
  numbers (20.4 / 25.2 / 26.6 / 26.6; −4.8): the gas exchange now reads the circulation's CPR flow (D21, W22).
- **E-FU8-11** (Task A22): `l2/gas/coupling.ts` (Stage 3; this plan's own "never touch `l2/gas/**`" list) — `cardiacOutput`
  during CPR, and the interim fit (`CPR_FLOW_EXP`, `cprFlowFactor`) removed. No in-flight plan edits the file; FU-6's two
  tests that import `cardiacOutput` call it outside CPR, where it is unchanged; V.1's CPR guard is handed (below).
- **E-FU8-12** (Task A28): `neuro-engine.test.ts` (7f; FU-4 F4's record) — "propofol 2 mg/kg: depth-index nadir < 52" flips
  (52 → 51): its 70 kg / 170 cm adult has effKg 67.6, and A28 gives it its own resting-output reference back.

## Handed to (items another plan owns, with the reason)

| To | Items | Reason / what they need to do |
|---|---|---|
| **FU-7** (plan untracked, executes after FU-6) | I-29 amiodarone's row claims a conversion hook; I-30 the onset count 19 vs 25; I-55 the pressor rows' pulmonary arms; I-56 hydralazine in HFrEF (CM-06e); I-60 research/19 §4 items 1–10 | Task 11 wires the amiodarone/procainamide/lidocaine conversion hazards (and should reword the row's `onset` to what the hook does, `λ_amio_vf = 0`); the onset count is a plan-text fix; Task 17 re-fits the pressor and vasodilator rows. **FU-7 Task 0 must also re-anchor on FU-8 Part A:** `profile.ts` (Tasks A12, A13, A18, A19 — FU-7 Task 8 edits it under E-FU7-3), `engine.ts` (A14) and `vite.config.ts` (A0); FU-8's C3 (A10) lands first, as the orchestrator ruled, so FU-7's AF rigs run on a heart that does not fail — **but the AF quiet band stays an `it.fails` at 0.89 (D18), so Task 0 Step 6b takes its guard path**. **Task 0 Step 6c** (the arrest-state precondition) passes once A21 is in (DV-01b: `peaRegains`, `peaArrestDeclared` true). **Task 17**'s PH pressor rows sit on A18's baseline (severe PH 5.9 → 9.6 WU; R50 F10). **Task 12** (V5, research/20 §4 items 1–7: temperature, the base termination rate, cardioversion by class and energy, which CoPP, end-to-end measurement, `arrestS` for undeclared arrests) — the orchestrator's FU-7 amendment; FU-8 A20 makes the IABP CoPP honest and A19 the tamponade CPR CoPP (8.3, was −12.9), so the two rigs FU-7 was told not to fit on are sound after FU-8. `l3/device-layer.ts` stays FU-7's (E-FU7-6): FU-8's pacing pain (B5) waits for it, and A27 does not edit it |
| **FU-6** (READY, after V.1) | I-51's lung half (the obese apnoea: profile FRC alone 2.7 min vs + the lung `obesity` condition 1.43 min); research/19 C6 (elderly closing capacity), C7 (COPD `paco2Set`) and the §5 FU-6 list | R4 re-tunes the obese apnoea on ONE obese patient — FU-8 Task A13 defines the circulation's (ONE continuous Lemmens-indexed size, `l2/body-size.ts`, anchored on the default adult); which of profile or condition carries the lung is Ali's Q3. FU-8 A22 changes `gas/coupling.ts`'s `cardiacOutput` during CPR only (E-FU8-11): FU-6's tests that import it call it off CPR. **V.1's CPR guard** (`l2/resp/pipeline.ts`, `h.cpr.active ? CO_REF_LPM : coRefLpm(rs.pat)` — the line FU-6's T2 anchors on): after A22 the CPR flow is the patient's own, so the guard should read `coRefLpm(rs.pat)` in both cases (a 16 kg child's CPR coRatio would otherwise be ≈ 0.06; I-78) — FU-6 makes it when it edits that line. `vite.config.ts`: both plans add SLOW entries — keep both |
| **7k** (READY) | I-22 (R-S9-3 mechanics truth paths); I-47 HPV acidosis/mixed-venous term if its lung-vascular scope takes it (else calibration); I-56 lung water reaching gas exchange (research/19 C9); **its two `vite.config.ts` find blocks (7k plan lines ≈ 1634, 1649) no longer match after FU-8 A0** (R50 F10) | its R57 scope; FU-8 changes no lung file. 7k's executor re-anchors the two SLOW/SLOW_A edits on FU-8's `fu8-*` glob line (keep both) |
| **FU-9** (being written) | the body-size definition (A13, `l2/body-size.ts`: size = (height/default) × √(70 × weight), anchored 4 900 mL; ruling 1); I-72 hyperkalaemic contractility from plasma K (research/20 V11) | 7c's `bloodPatient` uses Lemmens capped at the band value below BMI 22 and anchored at BMI 22 (4 807 mL at 70/175): FU-9 adopts `sizeWeightKg` so blood and circulation hold ONE volume (the circulation already does after A13). FU-9 edits no FU-8 file (`brain/model.ts`, `organs/pipeline.ts` lines differ: FU-8 A8 edits the oliguria line only) — re-anchor if A8 lands first |
| **V.1** (merging) | its E-V1-1 CPR guard (coRatio during CPR on the adult `CO_REF_LPM`) and Decision 25 ("CPR flow should scale with the patient") | after FU-8 A22 the CPR flow IS the circulation's (size-scaled: a 16 kg child 19 mL/kg/min, was an adult-absolute 63): the guard should use the patient's own reference (`coRefLpm(pat)`) — the edit is FU-6's (the line is its anchor); FU-8's gate records the child's CPR coRatio on the merged tree. V.1's link-profile rows re-measure after A28/A29 (the child's propofol nadir, the massive-PE profile) |
| **7h** (devices, v1.1) | I-71 (IABP trigger in arrest, trigger-loss alarms, LVAD thrombosis); the device NE cells of research/20 §6 (pericardiocentesis, ICD, magnet, ECMO) once Ali places them (W24) | research/20 §7's 7h row is its acceptance list |
| **Stage 9** (R50-fixed plan on `origin/review/stage-9-plan`) | I-11 "PR" as the pulse-sourced HR-alarm label; I-15 the aria/read-vitals summary; I-24 (R-S9-7 labels); the card TEXT for `category`/`story`/`objectives` (its `scenario-meta.ts` drafts move into the eleven documents); glossary entries for FU-8's new visible keys | I-11 needs exactly the per-skin `alarms.wording` table Stage 9's E-S9-4 adds (one more key); the app owns its a11y strings and the glossary (R56). After FU-8: delete `app/describe.ts`/`triggers.ts` copies and pass a `Labeller` (A15); the "sweep restarts on a view change" limit in its gate note and user guide is gone (A17); show `drugWarning` events in the drug panel (B1); new labels: EtAA tile, `drugWarning`, the `sensors` map (B2), ST |
| **8b** (release) | I-23 (R-S9-5 user guide); I-36 "58 drugs, not 52"; I-80 (the `port.ts` link race was on main too); release notes | the notes list: `setRhythm` refuses unknown option keys (A14), drug routes other than IV/IO/central refused and curve-row infusions refused (B1), the `drugWarning` event, `pme-scenario/1` card fields and `patient.endo` (A16), the AGENTS tile (A7) |
| **Orchestrator** | I-37 the 7g gate Q51/57/60 numbering collision with the tables' §9 | docs renumbering |
| **Calibration pass (R44, Ali)** | I-38 R → radial timing; I-39 PPG ↔ ABP shape; I-43 PR interval, MH EtCO2, Edmark, tamponade PAWP, CPR EtCO2, O1; I-45 7c water balance; I-31 VT sizes; the C2 ST threshold at HR 110; I-56 the SV-per-SVR sensitivity; **"CPR flow vs compression quality"** (ruling OQ2: the circulation's CPR flow saturates above quality ≈ 0.8 once chambers cannot empty below zero — 1.08 / 1.64 / 1.80 / 1.75 L/min at 0.5 / 0.8 / 1.0 / 1.2 — so EtCO2 reads 20.4 / 25.2 / 26.6 / 26.6; FLAGGED FOR ALI, W22); **the instructor-selected VF's arrest state** (ruling OQ3: with it, VF CPR CoPP 23.1–26.4, kIsch 0.66, and a sinus selected after 4 min of VF CPR re-arrested at +10 s); the IABP assisted systole (W26); CPR cerebral flow 0.45 vs the consensus 0.30–0.40; **anaphylaxis in MANUAL link profiles — `writeLung` must not remove a profile-owned spec** (V.1 Decision 23; the vasoplegia stand-in stays; I-79) | constants of existing mechanisms; numbers in the inventory |

## Waiting on Ali (his decision; the model's numbers)

| # | Question | The model now (seed 7) |
|---|---|---|
| W1 | PE reflex vasoconstriction factor (review pack A20) | tables 0.5, code 1.0 (V.1 assumed 0.5, FU-4 1.0): PVR × 9.0 at severity 1, × 4.0 at 0.75; the ventilator's data row × 4 (2.5–6) |
| W2 | Tension-PTX build rate (A21) | ventilated 15.7 mmHg at 1 min, plateau 20, PEA 8–9 min; spontaneous 15 at 1 min, plateau 19, no PEA in 24 min; catalogue spontaneous 5–15 mmHg over 30–60 min |
| W3 | Anaesthetics lower the set point — the exception to amendment A11 (A22) | propofol ≈ −13 % at Ce 3 µg/mL; volatiles −10 % per MAC |
| W4 | Complete tube kink (B21) | × 150 → VT 67 mL at the 40 cmH2O limit (× 30 → 288 mL); tables × 5–20 |
| W5 | CO2 and PVR counted twice (B22) | PaCO2 38 → 50: pH term alone +22 % PVR; pH + FU-6's CO2 term +54 % PVR, +34 % mPAP; Viitanen +54 % |
| W6 | Opioid bradycardia size (C20) | fentanyl 10 µg/kg HR 74 → 48 (−35 %); remifentanil 3 µg/kg → 52; neostigmine 0.05 mg/kg alone → 46; tables −10–20 % |
| W7 | Volume + adrenaline after a complete 3 L bleed-out (FU-4 A-new, E-FU4-19) | on main 2 L none, 2.5 L none, 3 L pulse at +180 s, 3.5 L +170 s; after FU-8 A19 (no suction artefact) NO pulse at any volume up to 3.5 L in 10 min; the class IV ROSC with 2 L + adrenaline 60 s after its arrest comes at +260 s |
| W8 | The maximum doses (dosing-preset caps DP-01…DP-64) | FU-8 sets only the rows' own sourced maxima (lidocaine 4.5, bupivacaine 2.5, ropivacaine 3, dantrolene 10 mg/kg, cumulative); the rest need the table |
| W9 | Oliguria teaching window (TQ40) | the flag needs one completed 10-min bin (1.75 L bleed: first flag 1200 s); KDIGO's 6 h is the AKI stage |
| W10 | What a monitor/printout shows as HR in VF (D3) | 12-lead printout: coarse VF 191/min, fine 51/min (detector counts); asystole now "--" |
| W11 | Saadat idle message bar; projector-light NIBP grey | #E0E0E0 slab (the brightest object on a quiet screen); NIBP grey 3.45:1, ≥ #6B7482 proposed |
| W12 | Paediatric size scaling (tables §2.2 isometric ×W/70) | after A12: neonate 3.5 kg CO 0.31 L/min = 89 mL/kg/min (≈ 200 expected; 0.30 before — R50 F7), infant 7 kg 0.60 = 86 (≈ 150), child 20 kg 1.72 = 86 (≈ 150): allometric W^0.75 or per-band parameters. The neonate rests at MAP 64, 16–19 mmHg above its stabiliser target (68/38, MAP 48) and set point (45) |
| W13 | VT haemodynamics in a normal heart (D10) | VT 150: CO +10 %, MAP +8; VT 170: CO −8 %, MAP +1, SV 33 vs 81; VT 200: no ejection; MANUAL VT 170 MAP 89 → 44 at 90 s |
| W14 | Resting pressures of the conditions (research/19 C5; D13) | untreated HTN +13.4 vs tables +20; 80 y MAP 110.6 vs 90–100; HFrEF MAP 86.6 / LVEDP 14.1 vs 75 / 15–20 |
| W15 | C1: a disease-dependent tonic sympathetic tone (research/19 §8 Q1; review pack A1/Q1) — before Task B4 | τ 0.2 / 0.3 elderly / +0.1 HTN / +0.25 HFrEF gives propofol nadirs −29.9 / −37.2 / −35.0 (HTN 60 y) / −42.9 (80 y HTN) / −42.7 % (HFrEF); today −22 ± 1 % in all |
| W16 | research/19 §8 Q2–Q10 | severe AS 117 → 96 without ST (table 60–65 with ST); obese: profile or lung condition (Q3); COPD GOLD 3 PaCO2 39; elderly apnoea 9.1 vs 7.9 min; CAD at HR 110: filtered deficit 0.10, no ST (HR 130: ST −0.21 mV after A11); pressors in PH (PAP/SAP 0.33 vs 0.31); AF 150 in a normal heart: kIsch 0.89 after A10 (0 before; a model limitation, D18); cirrhosis/IAP; hydralazine SV +3.5 % |
| W17 | Missing profiles — v1.0 or v1.1 (research/19 C10) | CKD, diabetic autonomic neuropathy, OSA, cirrhosis (the liver-failure stand-in leaves CO/SVR unchanged), bronchial reactivity; posture has no input (CM-02e) |
| W18 | The HR numeric in an agonal rhythm (I-13) — Task A25 executes with the answer | alternates "0" (valid) and "-?-" every 3–7 s under a standing ASYSTOLE (MANUAL agonal 270 s: 34 invalid samples, 16 flips after A2 + A6; 125 / 56 on main); what does his IntelliVue show — the averaged agonal rate, "0", or "-?-"? |
| W19 | A QTc tile; iNO as a drug | not built |
| W20 | The alarm in the idioventricular phase of his tamponade case (R50 F3) | after A6 the agonal rhythm runs at its requested 18.8/min, so every R–R stays under the IntelliVue's 4.0 s asystole threshold (research/05 line 116): `***EXTREME BRADY` stands from **947 s** and `***ASYSTOLE` raises only at **1097 s** (true asystole; the prototype's `audit:monitor A2-ali-b7`, the review measured 945 / 1095); on main `***ASYSTOLE` raised at **936 s** in the agonal phase with EXTREME BRADY cycling. Device-correct for a 19/min rhythm — is it what he wants the learner to see for those 2.5 min? |
| W21 | MANUAL: should an instructor-set PEA carry the arrest state (decay, ROSC under CPR)? (Q9) | Task A21 applies it in MODELED only; in MANUAL the instructor's rhythm holds (MANUAL kIsch keeps its 0.2 floor) |
| W22 | **FLAGGED — "CPR flow vs compression quality"** (calibration queue, ruling OQ2): EtCO2 as CPR-quality feedback is core ALS teaching | after A22 EtCO2 follows the pulmonary blood flow (a bled-out patient 7.2, was 17.4), but at quality 0.5 / 0.8 / 1.0 / 1.2 (the MANUAL R39-2 rig) it reads **20.4 / 25.2 / 26.6 / 26.6** (the fit gave 13.2 / 20.3 / 24.8 / 27.4; R39-2's bands 8–15 / 17–23 / 22–28 / 26–32, now an `it.fails`): CPR flow saturates above quality ≈ 0.8 (1.08 / 1.64 / 1.80 / 1.75 L/min) once the chambers cannot empty below zero (A19); poor CPR (0.4) reads 0.83 of good CPR's EtCO2 (research/20 DV-02c band 0.3–0.7); +10 breaths/min lowers it 4.8. What slope should compression quality give EtCO2 (the constant: how compression depth moves volume)? Cerebral flow under good CPR: 0.45 of normal (consensus 0.30–0.40; was 0.71) |
| W23 | (recorded, not a question in v1.0 — ruling OQ3) the instructor-selected VF's arrest state | not applied: S13 and DV-22a stay unmoved; the case is in the calibration queue with its numbers ("Handed to") |
| W24 | Devices: v1.0 or v1.1 (research/20 §6) | pericardiocentesis/drainage (DV-04b: the instructor resetting the tamponade gives a pulse at +295 s, CoPP 19), ICD (detection, ATP, shock), pacemaker magnet (VOO/DOO 85–100/min), VA/VV-ECMO, EMI → pacemaker sensing, and a MODELED cardiogenic-shock state (CI < 2.2, PAWP > 18: today only the MANUAL rig exists) |
| W25 | research/20 §8's nine questions | (1) post-shock asystole on a recoverable heart (30 % of shocks at 1 min of VF; never leaves under 8 min of CPR) — may it return to an organised rhythm? (2) first biphasic shock terminates VF in 70 % (trials 85–98 %) — which to teach, and the asystole/PEA/ROSC split 46/42/12 %? (3) CPR cerebral flow band (now 0.45; W22); (4) tamponade CPR — now 38/17, MAP 20 after A19: the "compressions do not work, drain it" picture he asked about?; (5) a MODELED cardiogenic shock (W24); (6) IABP assisted systole: −19.1 after A20 (tables ≈ −5; assisted EDP −18.6 in band); (7) the direction-only cells DV-18a/18b and DV-M1…M5; (8) TCP pain — movement/grimace and a surge (Task B5), and a capture threshold that rises with thoracic impedance?; (9) the [VERIFY] vendor/trial figures (LIFEPAK 15 charge/auto-disarm, ZOLL R Series 200 J maximum — zoll-like accepts 360 J today, the biphasic termination and cardioversion rates) |
| W26 | IABP assisted systole in the MODELED HFrEF rig | −19.1 mmHg after A20 (−15.4 before; tables ≈ −5), ΔCO +0.05 L/min (tables +0.5–1), PAWP −21 % (in band) — the balloon unloads well but the native ventricle does not gain output: an [ENG] size for the calibration pass |
| W27 | NIBP on a continuous-flow LVAD (research/20 DV-16b) | 10 of 10 oscillometric readings valid at PP ≈ 20 (EMCrit/Bennett 2010: often fails, ≈ 50–60 % success [VERIFY]) — a pulsatility-dependent failure rate is a device-behaviour choice |

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
| A5 | (moved to A19) | — | — |
| A6 | `src/l2/ecg/foci-ventricular.ts`, `test/l2/ecg/nan-guard.test.ts` + 1 test | — | A |
| A7 | skins `types.ts`, `resolve.ts`, philips-/saadat-like JSON, snapshot; renderer `alarm-view.ts`, `numerics-neuro.ts`, `device-ui.ts`, `test/fu5-tiles.test.ts` + 1 test | Stage 9 E-S9-4 edits skins `types.ts`/`schema.ts` and other skins (different lines; Stage 9 re-anchors) | A |
| A8 | `src/l2/organs/pipeline.ts` + 1 test | — | A |
| A9 | `src/l3/capture12/capture.ts` + 1 test | — | A |
| A10 | `src/l2/circ/coronary.ts`, `test/engine/circ-hypoxic-arrest.test.ts` (E-FU8-4) + 1 test | — (orchestrator: Part A, FU-7 needs it) | A |
| A11 | `src/l2/circ/coronary.ts` | — | A |
| A12, A13, A18 | `src/l2/circ/profile.ts`, new `src/l2/body-size.ts` (A13), `src/l2/hemo/pipeline.ts` (A13: `circProfileOf`) + 2 tests | FU-7 Task 8 edits `profile.ts` (E-FU7-3, other lines) | A (declared) |
| A14 | `src/engine.ts` (setRhythm validation) + 1 test | FU-6, FU-7 edit `engine.ts` (other lines) | A (declared; merge main first) |
| A15, A16 | `packages/controller/**` (describe, view, builtins, index, render-controls, vocabulary, schema, types, patient, validate + tests) | Stage 9 edits only `host-session.ts`, `panel/styles.ts` | A |
| A17 | `packages/renderer/src/sweep-lane.ts` + 1 test | Stage 9 edits `renderer/src/index.ts` only | A |
| A19 | `src/l2/circ/{circuit,profile}.ts`; `test/engine/{circ-lowflow-arrest,hemo-acceptance,clinical-suite}.test.ts` (E-FU8-9) + 1 test | `circuit.ts`: none; `profile.ts`: FU-7 Task 8 (other lines) | A (after A18) |
| A20 | `src/l2/circ/{devices,coronary}.ts`, `src/l2/hemo/pipeline.ts` + 2 tests | none (`hemo/pipeline.ts` is on FU-6's and FU-7's never-touch lists) | A |
| A21 | `src/l2/hemo/pipeline.ts`, `test/engine/clinical-suite.test.ts` (E-FU8-9) + 1 test | none | A |
| A22 | `src/l2/gas/coupling.ts` (E-FU8-11), `test/engine/{arrest-etco2,cpr-etco2}.test.ts` (E-FU8-10) + 1 test | none edits `coupling.ts`; FU-6's tests import `cardiacOutput` (off-CPR, unchanged) | A |
| A23 | `src/l2/hemo/pipeline.ts` + 1 test | none (`engine.ts` NOT edited: D22) | A |
| A24 | 1 test | — | A |
| A25 | `src/l3/hr.ts` + 1 test (gated on W18) | none | A (gated) |
| A26 | `src/l2/circ/devices.ts`, `src/l2/hemo/pipeline.ts` + 1 test (UNPROTOTYPED) | none | A |
| A27 | `src/l2/hemo/pipeline.ts` + 1 test (UNPROTOTYPED) | none (`l3/device-layer.ts` NOT edited) | A |
| A28 | `src/engine.ts` (`pkCtx` `coRefLpm`, an import), `src/l2/blood/pipeline.ts` (`rest.coLp` start, an import) + 1 test | FU-6, FU-7, FU-9 edit both files on other lines (their anchors counted on the Part A tree: 0 broken); V.1 edits neither | A (declared) |
| A29 | `src/l2/hemo/pipeline.ts` (`createHemoState`) + 1 test | none | A |
| B1 | `src/l2/pk/{row,pipeline}.ts`, `src/l2/pk/data/rows-other.ts`, `src/types-pk.ts`, `src/types.ts` + 2 tests | FU-7 rewrites all of `l2/pk/**` | B |
| B2 | `src/engine.ts`, `src/types-hemo.ts` + 1 test | FU-7 `engine.ts` (13 blocks) | B |
| B3 | `src/l2/circ/model.ts`, `src/l2/hemo/pipeline.ts`, `test/engine/fidelity-lowflow.test.ts` | FU-6, FU-7 edit `circ/model.ts` | B |
| B4 | `src/l2/circ/{baroreflex,model,profile}.ts` + 1 test | FU-7 `model.ts`, `profile.ts`; FU-4's `baroreflex.ts` | B (and Ali first) |
| B5 | `src/l3/device-layer.ts` or `src/engine.ts` (the TCP nociceptive input), `l2/endo` read only + 1 test (UNPROTOTYPED) | FU-7 Task 12 (`device-layer.ts`, E-FU7-6), FU-6/FU-7 (`engine.ts`), FU-7 (`l2/endo/**`) | B |
| G | `docs/gates/fu-8.md`, `docs/gates/fu-8/**`, `apps/demo/scripts/fu4-shots.mjs` (E-FU8-8), `docs/gates/fu-4/{3b-classIV-rosc,5a-burns-sux-sine}.png` | — | after A (and B) |

**Order.** Part A executes now, in task order (A0 → A27; A5 is a pointer; A10 before A11 and A20 (coronary.ts); A12
before A13, A18 and A19 (profile.ts); A19 after A18 so the rows it moves are the ones measured; A20 before A21–A23 (the
pipeline state they share); A25 only with Ali's W18 answer; A28/A29 last). Part B starts at B0 once FU-7 has merged; if FU-7 is not merged when Part A's gate is done, Part A goes out
as its own PR ("… (Part A)") and Part B is a second PR from this plan.

## Part A — independent of FU-6/FU-7 (executes now)

Run from the worktree `projects/patient-monitor-engine/scratch/wt-fu-8` (Task A0). `<repo>` below is
`projects/patient-monitor-engine/repo`; `<scratchpad>` is your session scratchpad. Every find block matches EXACTLY ONCE at its place in the
sequence and once on `origin/main` `0fd5397`, except one CHAINED block, which edits a line an earlier FU-8 block wrote
(Task A20 — marked; Self-review).

### Task A0: Base check, the branch, the before-numbers, the SLOW_A entry

**Files:** Modify `packages/engine-core/vite.config.ts` (SLOW and SLOW_A: one glob each).

**Why:** every FU-8 engine test that runs more than a sim-minute is named `test/engine/fu8-*.test.ts`; the glob joins
BOTH lists, so the files run in slow-a only (slow-b ran 37.6 of its 40 min at the FU-4 gate). A glob that matches
nothing yet is harmless.

- [x] **Step 1 — worktree and branch.**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-fu-8 -b fu-8-followups origin/main
cd ../scratch/wt-fu-8 && npx -y pnpm@9.15.9 install --frozen-lockfile
git log --oneline -1   # expect 0fd5397 or later; record it in the gate note
```

- [x] **Step 2 — the before-numbers (scratch logs under `<scratchpad>/fu-8-followups/`).**

```bash
mkdir -p <scratchpad>/fu-8-followups
PME_AUDIT_OUT=<scratchpad>/fu-8-followups/audit-before npx -y pnpm@9.15.9 run audit:monitor A1-map-ladder A2-ali-b7 A7-probe > <scratchpad>/fu-8-followups/audit-before.log 2>&1
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fidelity-lowflow.test.ts test/engine/circ-hypoxic-arrest.test.ts > <scratchpad>/fu-8-followups/before-slow.log 2>&1
```

Expected (as the plan's "Prototype results", seed 7): A2's alarm log raises `ART_M_LOW` at 687 s as `**ABPm 66<70`;
A7 shows PI 8.21 at 181–185 s; `fidelity-lowflow` 9 tests pass with its 5 `it.fails`; `circ-hypoxic-arrest` 8 pass
(asphyxial PEA at +6.35 min). If a number differs, a merged stage moved it: record the new number, re-anchor, go on.

- [x] **Step 3 — the SLOW_A glob.**

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

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/vite.config.ts
git commit -m "build(test): FU-8 engine rigs join the SLOW set in slow-a (fu8-*.test.ts)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A1: A limit alarm prints the value the tile shows, and the limit in force (F1, I-01)

**Files:** Modify `packages/engine-core/src/l3/alarms/manager.ts` (`Condition.held`; the active-entry branch of `stepAlarms`),
`packages/engine-core/src/l3/alarms/conditions.ts` (the `dd` line and the two raise lines of the limit loop). Create `packages/engine-core/test/l3/alarms/fu8-live-text.test.ts`, `packages/engine-core/test/engine/fu8-alarm-text.test.ts`.

**Why (D1):** research/05 §2.4 ([S2]): "the message shows **SpO2 94<96 (deviation and limit)". `stepAlarms` froze the
text at the raise — `**ABPm 66<70` stood while the mean fell to 19 in Ali's tamponade PEA, `**ABPm 252>110` 13 s after
ROSC with the mean back near 120 — and `limitText` printed the SKIN DEFAULT limit after a `setLimit` (the comparison
used the edited limit). No red pressure alarm at MAP 19 is vendor-correct (IFU p. 44: only DISCONNECT, mean < 10).
R50 review F6: a live text must never print a false inequality — the clear hysteresis holds a limit alarm for one display
unit INSIDE the limit, and the first draft printed `**ABPs 90<90`, `**ABPd 90>90`, `**CVP 10>10` there. A condition the
band alone holds is marked `held`; the entry keeps its last violating text.

- [x] **Step 1 — failing tests first.**

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
  it('R50 F6: through the clear hysteresis the entry keeps its last VIOLATING text — no "**ABPs 90<90" (ABPs low 90: 85 → 90 → 92)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs(0);
    inp.abp = 'connected' as never;
    let v = 85;
    const conds = (t: number) => {
      inp.measured.abpSys = { value: v, flag: 'valid', at: t };
      return buildConditions(s, inp, t).filter((x) => x.id === 'ART_S_LOW');
    };
    run(s, 0, 20, conds);
    expect(s.active.ART_S_LOW?.text).toBe('**ABPs 85<90');
    v = 90; // at the limit: held by the one-unit hysteresis, not beyond it
    expect(conds(20.02)[0]?.held).toBe(true);
    run(s, 20.02, 25, conds);
    expect(s.active.ART_S_LOW?.text).toBe('**ABPs 85<90');
    v = 92;
    run(s, 25.02, 30, conds);
    expect(s.active.ART_S_LOW?.text ?? '').not.toMatch(/9\d<90/);
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

Run `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/alarms/fu8-live-text.test.ts test/engine/fu8-alarm-text.test.ts` → the first test of each file, the
`setLimit` test and the F6 test FAIL (text `**ABPm 66<70`; `**ABPm 55<70`; `held` undefined); the latched-text test
passes.

- [x] **Step 2 — the text follows the value.**

In `packages/engine-core/src/l3/alarms/manager.ts`, find:

```ts
  holdS?: number;
}
```

Replace with:

```ts
  holdS?: number;
  /** FU-8 (R50 F6): kept only by a clear hysteresis — the value is not beyond the limit; the entry keeps its last text. */
  held?: boolean;
}
```

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
      // fell to 19 in Ali's tamponade PEA, and `**ABPm 252>110` 13 s after ROSC while the mean was back near 120. A
      // condition only the clear hysteresis holds keeps the last violating text (R50 F6: no `**ABPs 90<90`)
      if (e.text !== c.text && c.held !== true) {
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

In `packages/engine-core/src/l3/alarms/conditions.ts`, find:

```ts
    if (l.high !== null && (dv > l.high + 1e-9 || (raisedLiveId(s, hi) && dv > l.high - unit + 1e-9))) out.push({ id: hi, text: limitText(p, dd, 'HIGH', dv), ...c });
    if (l.low !== null && (dv < l.low - 1e-9 || (raisedLiveId(s, lo) && dv < l.low + unit - 1e-9))) out.push({ id: lo, text: limitText(p, dd, 'LOW', dv), ...c });
```

Replace with:

```ts
    // FU-8 (R50 F6): a condition kept only by the clear hysteresis (the value back AT the limit) is `held` — the manager
    // keeps its last violating text (`**ABPs 90<90`, `**CVP 10>10` were printed through the band)
    const over = l.high !== null && dv > l.high + 1e-9;
    const under = l.low !== null && dv < l.low - 1e-9;
    if (l.high !== null && (over || (raisedLiveId(s, hi) && dv > l.high - unit + 1e-9))) out.push({ id: hi, text: limitText(p, dd, 'HIGH', dv), ...c, ...(over ? {} : { held: true }) });
    if (l.low !== null && (under || (raisedLiveId(s, lo) && dv < l.low + unit - 1e-9))) out.push({ id: lo, text: limitText(p, dd, 'LOW', dv), ...c, ...(under ? {} : { held: true }) });
```

- [x] **Step 3 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/alarms test/engine/fu8-alarm-text.test.ts` → all pass (prototype: 12 files, 60
tests); the engine test logs `470 rows with ART_M_LOW; worst text/tile gap 0 mmHg` and exactly one `raised` event. Then
`npx -y pnpm@9.15.9 run audit:monitor A2-ali-b7`: no `cleared` text of the form `X<X` / `X>X` (the review's
`**ABPs 90<90`, `**ABPd 90>90`, `**CVP 10>10`).

- [x] **Commit and push.**

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

- [x] **Step 1 — failing test (R50 review F5: it must fail on main).**

Create `packages/engine-core/test/engine/fu8-agonal-qrs.test.ts`:

```ts
// FU-8 Task A2 (F3, E-FU4-20; R50 review F5): the monitor's QRS detector counts one QRS per agonal complex.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin). A double detection (two humps 0.14–0.24 s
// apart on one ≈ 300 ms complex) reads as a 0.2 s R–R: the HR average breaks and the numeric flips between a reading
// and "-?-" (invalid) — on origin/main 7ffaba4 125 of 269 samples invalid and 56 valid↔invalid flips in this rig.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A2 (F3): one QRS per agonal complex', () => {
  it('MANUAL pulseless agonal 30–300 s: the HR numeric flips valid↔invalid ≤ 25 times (origin/main: 56 flips, 125 invalid samples, from the double detections)', async () => {
    const e = createEngine({ seed: 7, mode: 'manual', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
    const beats: number[] = [];
    let n = 0;
    let invalid = 0;
    let flips = 0;
    let high = 0;
    let prev: boolean | null = null;
    e.on((x) => {
      if (x.type === 'beat' && x.template === 'agonal' && x.t > 30 && x.t < 300) beats.push(x.t);
      if (x.type !== 'measurement' || x.t <= 30 || x.t >= 300 || !x.values.hr) return;
      const ok = x.values.hr.value !== null && x.values.hr.flag !== 'invalid';
      n++;
      if (!ok) invalid++;
      if (ok && (x.values.hr.value as number) > 25) high++;
      if (prev !== null && ok !== prev) flips++;
      prev = ok;
    }, ['beat', 'measurement']);
    e.advanceTo(10);
    e.dispatch({ id: 'r', issuedBy: 'test', type: 'setRhythm', rhythm: 'agonal', opts: { pulseless: true } } as never);
    for (let t = 60; t <= 310; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    console.log(`fu8 A2: ${beats.length} agonal complexes; HR samples ${n}, invalid ${invalid}, flips ${flips}, readings > 25/min ${high}`);
    expect(beats.length).toBeGreaterThan(30);
    expect(flips).toBeLessThanOrEqual(25);
    expect(high).toBe(0);
  }, 60_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-agonal-qrs.test.ts` → FAILS: `fu8 A2: 51 agonal complexes; HR samples 269, invalid 125, flips 56`
(measured on origin/main 7ffaba4 — the first draft's "HR > 25/min" assertion passed on main, the review's F5). The
double detection shows as the numeric flipping between a reading and "-?-", not as a high reading.

- [x] **Step 2 — the detector.**

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

- [x] **Step 3 — the agonal hold and LOW PERF.**

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

- [x] **Step 4 — flip the three E-FU4-20 pins (E-FU8-1).** Run `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fidelity-lowflow.test.ts` first: the three
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

- [x] **Step 5 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3 test/engine/fidelity-lowflow.test.ts test/engine/fidelity-arrest.test.ts test/engine/fidelity-ecg.test.ts test/engine/fidelity-alarms.test.ts test/engine/fu8-agonal-qrs.test.ts`
→ all pass (prototype: l3 + fidelity 190 tests; `fu8 A2: 53 agonal complexes; HR samples 269, invalid 34, flips 16` once A6 is in
too (the review measured the same); the remaining flips are the HR "0" ↔ "-?-" display question, Task A25 / W18). The QRS
detector's own suites (`test/l3/qrs.test.ts`, `qrs-pacing.test.ts`) are unchanged and green.

- [x] **Commit and push.**

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

- [x] **Step 1 — failing test.**

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

- [x] **Step 2 — the fix.**

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

- [x] **Step 3 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-motion-pi.test.ts test/l3/pressure-numerics test/engine/fidelity-arrest.test.ts test/engine/fidelity-nibp.test.ts`
→ pass; the log reads `rest PI 1.85 PR 75; after motion PI 1.95 1.99 2.00 1.91 …`. `audit:monitor A7-probe` rows 181–185:
PI `--`, 1.95, 1.99, 1.91 (was 8.21 ×4).

- [x] **Commit and push.**

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

- [x] **Step 1 — the page parameter.**

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

- [x] **Step 2 — the e2e.**

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

- [x] **Step 3 — verify (Chromium only, ≈ 5 min).** `npx -y pnpm@9.15.9 build && CI=1 npx playwright test apps/demo/e2e/fu5-latched.e2e.ts --project=chromium`
→ 2 passed (webkit skips, the heavy-evidence rule). Record the logged spans (`APNEA live … latched …`) in the gate note;
the two PNGs under `docs/gates/fu-5/` are re-written by the run — commit them only if the gate note quotes them,
otherwise `git checkout -- docs/gates`.
Prototype (Chromium, 3.9 min): philips-like APNEA live 191–216 s, latched 217–457 s (in the rotation at the end); saadat-like live 188–215 s, then none.

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add apps/demo/src/stage7f.ts apps/demo/e2e/fu5-latched.e2e.ts
git commit -m "test(e2e): fu5-latched bags at +210 s via ?bvmAt so the induction apnoea alarms and latches (FU-8 A4, F4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A5: (moved) The negative chamber volumes — now Task A19

The R50 review's ruling 3 LANDS the fix (Option D, size-scaled) instead of pinning the defect. It runs as **Task A19**,
after Task A18, because the rows it moves (the class IV ROSC, the VF-CPR and CPR-trough pins, S13, the FU-4 exsanguination
thresholds) were measured on the whole of Part A — each commit of this plan stays green in that order. Nothing to do here;
the task number is kept so the review's references stay valid.

### Task A6: The agonal rhythm runs at its rate (I-32)

**Files:** Modify `packages/engine-core/src/l2/ecg/foci-ventricular.ts` (Stage 5; `AGONAL_RR_CV`, `onAgonal`), `packages/engine-core/test/l2/ecg/nan-guard.test.ts`
(**E-FU8-6**: the `agonal` entry of the pre-guard schedule FIXTURE re-recorded — the rhythm's schedule changes by
design; every other rhythm's hash is untouched and the darwin-only rule stays). Create `packages/engine-core/test/engine/fu8-agonal-rate.test.ts`.

**Why (D6):** `onAgonal` drew R–R = 3 + 4.5·U s whatever the rate: 11.4/min at every `rateBpm` (4…24). One uniform
draw per beat as before, so no other RNG stream shifts. FU-4's PEA decay requests `agonal` at 24/min, clamped to the
rhythm's 20: its idioventricular phase now runs at ≈ 18.8/min (the asystole hazard is per second, unchanged).

- [x] **Step 1 — failing test.**

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

- [x] **Step 2 — the rate.**

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

- [x] **Step 3 — the fixture entry (E-FU8-6).** Recompute the agonal hash on darwin (the fixture's platform):
`fnv(JSON.stringify(runRhythm('agonal', 60, { seed: 7 }).st.records))` → prototype `d9075744`.

In `packages/engine-core/test/l2/ecg/nan-guard.test.ts`, find:

```ts
const FIXTURE: Record<string, string> = {"sinus":"51b630bc","sinusBrady":"a6442a4c","sinusTachy":"6adb8b9f","sinusArrhythmia":"53084148","sinusPause":"fe934c89","atrialTach":"aa806f26","mat":"0bb8bad0","afib":"e44bcd91","aflutter":"a25cf05f","svtAvnrt":"4f07b590","svtAvrt":"cb153dc0","wpwSinus":"931149c9","preexcitedAf":"83ca6f9d","junctionalEscape":"5f277786","junctionalAccel":"b958fb55","junctionalTachy":"4d081563","avb1":"dff23667","avb2Mobitz1":"c4f36488","avb2Mobitz2":"7b3c2874","avb2to1":"744fce1c","avbHighGrade":"dc1c8c93","avb3Narrow":"dda3f2a9","avb3Wide":"3126ade7","idioventricular":"db89ed8d","aivr":"a8f563c4","vtMono":"2648f677","vtPoly":"286c8063","torsades":"32fbd05e","vfCoarse":"49de5d33","vfFine":"afa83bdc","asystole":"741638a5","pWaveAsystole":"73e78d5f","agonal":"6142c308","pacedAAI":"4b99dc53","pacedVVI":"2b5c59f1","pacedDDD":"291a270e"};
```

Replace with:

```ts
const FIXTURE: Record<string, string> = {"sinus":"51b630bc","sinusBrady":"a6442a4c","sinusTachy":"6adb8b9f","sinusArrhythmia":"53084148","sinusPause":"fe934c89","atrialTach":"aa806f26","mat":"0bb8bad0","afib":"e44bcd91","aflutter":"a25cf05f","svtAvnrt":"4f07b590","svtAvrt":"cb153dc0","wpwSinus":"931149c9","preexcitedAf":"83ca6f9d","junctionalEscape":"5f277786","junctionalAccel":"b958fb55","junctionalTachy":"4d081563","avb1":"dff23667","avb2Mobitz1":"c4f36488","avb2Mobitz2":"7b3c2874","avb2to1":"744fce1c","avbHighGrade":"dc1c8c93","avb3Narrow":"dda3f2a9","avb3Wide":"3126ade7","idioventricular":"db89ed8d","aivr":"a8f563c4","vtMono":"2648f677","vtPoly":"286c8063","torsades":"32fbd05e","vfCoarse":"49de5d33","vfFine":"afa83bdc","asystole":"741638a5","pWaveAsystole":"73e78d5f","agonal":"d9075744","pacedAAI":"4b99dc53","pacedVVI":"2b5c59f1","pacedDDD":"291a270e"};
```

- [x] **Step 4 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-agonal-rate.test.ts test/l2/ecg test/engine/fidelity-arrest.test.ts test/engine/circ-lowflow-arrest.test.ts`
→ pass (`agonal 6/min → 5.8`, `12 → 11.6`, `18 → 17.0`; fidelity 4b "ASYSTOLE raised once" holds only with Task A2 in).

- [x] **Commit and push.**

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

- [x] **Step 1 — skins.**

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

- [x] **Step 2 — renderer.**

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

- [x] **Step 3 — verify.** `npx -y pnpm@9.15.9 --filter @pme/skins test && npx -y pnpm@9.15.9 --filter @pme/renderer test && npx -y pnpm@9.15.9 -r typecheck`
→ skins 179, renderer 89 (prototype), typecheck clean (the demo's `Record<TileParam, …>` needs the AGENTS sample).

- [x] **Commit and push.**

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

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-oliguria.test.ts test/engine/organs- test/l2/organs test/l2/renal` → pass (15 files /
61 tests on the prototype; `first OLIGURIA flag 1200 s (1 h 0.49 mL/kg/h)`). Run the new test BEFORE the edit first:
it fails at 508 s.

- [x] **Commit and push.**

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

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/fu8-capture12-arrest.test.ts test/l3/capture12.test.ts && npx -y pnpm@9.15.9 --filter @pme/renderer test`
→ pass (the renderer's 12-lead view test reads `measurements` only through the paper header).

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l3/capture12/capture.ts packages/engine-core/test/l3/fu8-capture12-arrest.test.ts
git commit -m "fix(capture12): the printout HR and axis come from the monitor QRS detector; none in asystole (FU-8 A9)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A10: The coronary supply AND demand are read beat by beat — rapid AF no longer kills a normal heart (C3, I-49; R50 F2/F9)

**Files:** Modify `packages/engine-core/src/l2/circ/coronary.ts` (`COR_WIN_BEATS_S`, `ST_DEFICIT_MIN` (read by Task A11), the MODELED
beat-by-beat flow AND demand in `stepCoronary`, `TAU_HYP_S` 300 → 235 under a declared deviation),
`packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts` (**E-FU8-4**: the asphyxia rig runs 24 min instead of 20 so the 6–10 min
post-arrest window fits; the first test's title re-states its arrest time; no band changes). Create
`packages/engine-core/test/engine/fu8-coronary.test.ts` (its C2 describe is Task A11's — create the whole file here; the A11 tests fail
until A11).

**File overlap (declared):** `coronary.ts` is in neither FU-6's nor FU-7's file list. The orchestrator placed C3 in
Part A because FU-7's AF rigs (Tasks 11, 12, 19) need it (research/19 §4 item 5). Task A20 edits one of this task's
lines (`aoDiaOf`, a chained block).

**Why:** `stepCoronary` read supply from the LAST beat only; on a short AF cycle the next activation starts before the
ventricle relaxes ("LVEDP" 60–115 mmHg), CoPP < 0 and the supply was ZERO for the whole second (123 of 240 samples):
a healthy 40 y went kIsch 0 → agonal at +15.5 min (CM-15c), the 70 y esmolol arm arrested (CM-15b). MODELED now
averages the beats of the last 2 s, each with its own diastolic fraction and CoPP taken at the end of ITS OWN diastole
(the next beat's `lvedp`); a regular rhythm reads the same number; one beat in the window (unit rigs) reads as before.

**Q4 — the one further sourced step (orchestrator ruling 6; R50 F9).** With the supply averaged and the demand still
read from the LAST beat × the rate, AF 150 left kIsch oscillating 0.84–0.92 while sinus tachycardia 150 held 1.00 — a
variance artefact (one strong post-pause beat stood for the whole second), not physiology: a normal heart at 85 % of its
predicted maximum rate is not ischaemic (a negative exercise test). Myocardial O2 use per unit time is the SUM of the
beats' energy (PVA per beat × beats; Suga, Physiol Rev 1990;70:247–277), so the demand is now averaged over the same
window, each beat at its own rate. Measured: kIsch min 0.84 → **0.89** — short of the quiet band 0.9, so the band stays
an `it.fails` with its number, recorded as a MODEL LIMITATION (not as physiology); FU-7's Task 0 Step 6b takes its guard
path (a control-arm kIsch ≥ 0.9 precondition in AF windows < 5 min).

**The declared deviation (E-FU8-4; orchestrator ruling 2).** FU-3's asphyxial arrest was partly driven by the SAME
artefact — the escape pairs of the hypoxic bradycardia (R–R 1.5 s then 0.5 s) read as HR 110–130, a 5 % diastolic
fraction, flow 0.06. With the honest supply and τ 300 s there is no arrest in 20 min. `TAU_HYP_S` is an [ENG] constant
fitted to that window; FU-4's rule (D3) takes the MIDDLE of the passing plateau, over EVERY test the constant moves: the
asphyxia file and the clinical suite's S8 (tension PTX, PEA ≤ 10 min — the only other test that moved in the review's
41-file sweep at τ 160). Scanned on the prototype (asphyxia arrest time after SaO2 < 60 %; S8 PEA):

| τ (s) | 60 | 80 | 120 | 160 | 175 | 180 | 200 | 220 | 230 | 235 | 240 | 250 | 255 | 257 | 260 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| asphyxia (8 tests) | ✗ +4.62 | +5.35 | +6.83 | +8.33 | +8.90 | +9.08 | +9.85 | +10.60 | +10.98 | +11.17 | +11.35 | +11.73 | +11.93 | +12.00 | ✗ none |
| S8 ≤ 10 min, before A19 (review) | — | — | — | ✗ 10.33 | — | ✗ 10.17 | ✗ 10.25 | 10.00 | 9.92 | — | 9.92 | — | — | — | — |
| S8 ≤ 10 min, after A19 | ✗ 11.17 | ✗ 10.67 | ✗ 10.25 | ✗ 10.08 | 9.92 | 9.83 | 9.83 | 9.83 | 9.75 | 9.75 | 9.67 | 9.75 | — | 9.75 | 9.67 |

The joint plateau is 220–250 s at THIS task's commit (S8 has no margin at 220) and 175–257 s once Task A19 lands; the
middle of the plateau that holds at every commit is **235 s**: asphyxial PEA at +11.2 min after SaO2 < 60 % (margins
6.2 / 2.8 min to the file's 5–14 band), S8 at +9.92 min here and +9.75 min after A19. Compared from the SAME start as
the sources — the airway occlusion, 2.0 min before SaO2 < 60 % in this rig — the arrest is at ≈ 13.2 min: inside
DeBehnke's 11.4 ± 2.4 min, above Varvarousi's 9.5 ± 1.4 (the first draft compared +10.58 min from SaO2 < 60 % with
Varvarousi's time from occlusion — the review's correction). Recorded for R44: no arrest at SaO2 ≈ 0 for τ ≥ 260 s,
and S8's 5 s margin at this commit. The FiO2 1 reversal (HR ≥ 60 after oxygenation) takes 6–7 s at τ 235 (and at every
scanned τ except 220/230, where it is 34–36 s: a threshold effect, not a mechanism — the rate reaches 58/min at +9 s and
crosses 60 only as the hypoxic SA-node depression `cor.hyp` 0.31 unwinds with τ_up; within the file's 3-min band).

- [x] **Step 1 — tests.**

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
  it('healthy 40 y, AF 150/min for 20 min: no arrest, kIsch ≥ 0.75 (before: 0 and agonal at +15.5 min; measured 0.89 after FU-8 — the quiet band ≥ 0.9 is the it.fails below)', async () => {
    const r = await held({}, { type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 150 } }, 120 + 1200);
    console.log(`fu8 A10: AF 150 kIsch min ${r.kMin.toFixed(2)}, arrest ${r.arrest}`);
    expect(r.arrest).toBe(false);
    expect(r.kMin).toBeGreaterThanOrEqual(0.75);
  }, 120_000);
  it.fails('healthy 40 y, AF 150/min: kIsch ≥ 0.9 throughout (research/19 CM-15c quiet band) — measured 0.89 in this rig after FU-8, a MODEL LIMITATION (sinus 150 holds 1.00; the residual is beat-to-beat variance, R50 F9 — Ali Q8)', async () => {
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

- [x] **Step 2 — the supply and the demand.**

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
    const hrR = hr / r.hr;
```

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
    const work = hrR * (Math.max(20, b.lvsp) / r.lvsp) * ee * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
    demand = modeled ? D_BASAL + D_EC * hrR * ee + (1 - D_BASAL - D_EC) * work : work; // FU-4 G1: + basal, E–C shares
```

Replace with:

```ts
    const workOf = (x: CircBeat, hrRx: number): number => hrRx * (Math.max(20, x.lvsp) / r.lvsp) * ee * Math.cbrt(Math.max(10, x.lvedv) / r.lvedv);
    let winDemand: number | null = null; // FU-8 (R50 review F9, orchestrator Q4): demand over the same window
    if (win.length >= 2) {
      let fSum = 0;
      let cSum = 0;
      let dSum = 0;
      let wSum = 0;
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
        // FU-8 (Q4): each beat's own E–C coupling and pressure–volume work at its own rate, summed over the window —
        // myocardial O2 use per unit time is the sum of the beats' energy (PVA per beat × beats; Suga H, Physiol Rev
        // 1990;70:247–277), not the LAST beat's work × the mean rate: in AF 150 one strong post-pause beat read as the
        // whole second's demand (a variance artefact: kIsch 0.84–0.92 while sinus 150 held 1.00)
        const hx = 60 / Math.max(0.2, x.dur) / r.hr;
        wSum += (D_BASAL + D_EC * hx * ee + (1 - D_BASAL - D_EC) * workOf(x, hx)) * x.dur;
      }
      beatFlow = fSum / dSum;
      cpp = cSum / dSum;
      winDemand = wSum / dSum;
    }
    const work = workOf(b, hrR);
    demand = modeled ? (winDemand ?? D_BASAL + D_EC * hrR * ee + (1 - D_BASAL - D_EC) * work) : work; // FU-4 G1: + basal, E–C shares
```

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
  const flow = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
```

Replace with:

```ts
  const flow = cfr * (beatFlow ?? Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0));
```

- [x] **Step 3 — the τ re-fit (E-FU8-4) and the rig length.** Repeat the joint scan on the executor's tree at 200, 220,
235, 250 and 260 s: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-hypoxic-arrest.test.ts` AND `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/clinical-suite.test.ts -t S8`
each time; record both times per value in the gate note. If 235 passes both, keep it; if the plateau moved, take the
middle of the values where BOTH pass (never an edge value) and record the margins; if no value passes both, keep 300,
pin the three asphyxia tests `it.fails` with the measured "no arrest" and stop for the orchestrator.

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
 */
export const TAU_HYP_S = 300;
```

Replace with:

```ts
 * FU-8 (C3, plan Task A10; E-FU8-4, orchestrator ruling 2): those fits were made with the coronary supply read from the
 * LAST beat, and the asphyxial bradycardia's escape pairs (R–R 1.5 s then 0.5 s) read as HR 110–130 → a 5 % diastolic
 * fraction → flow 0.06 for whole seconds; the beat-by-beat supply removed that artefact and, at 300 s, the arrest (none
 * in 20 min). FU-4's plateau rule, over BOTH tests the constant moves (this file, rig 24 min, and the clinical suite's
 * S8 tension PTX, PEA ≤ 10 min): on the corrected supply the joint plateau is 220–250 s (S8 +10.00 min at 220, 9.92 at
 * 230/240; the asphyxia file fails from 260: no arrest), and once the outflow limiter lands (Task A19) 175–257 s. The
 * middle of the plateau that holds at every commit: 235 s → asphyxial PEA at +11.2 min after SaO2 < 60 % (margins 6.2 /
 * 2.8 min to the 5–14 band), S8 at +9.75 min (+9.92 before A19). From the same start as the sources (the airway
 * occlusion, 2.0 min before SaO2 < 60 %): ≈ 13.2 min — inside DeBehnke's 11.4 ± 2.4 min, above Varvarousi's 9.5 ± 1.4.
 * Recorded for R44: no arrest at SaO2 ≈ 0 for τ ≥ 260 s, and S8's thin margin.
 */
export const TAU_HYP_S = 235;
```

In `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`, find:

```ts
const asphyxiaCourse = (): Promise<Course> => (asphyxiaRun ??= asphyxia('modeled', false, 20 * 60, true));
```

Replace with:

```ts
// FU-8 (Task A10, E-FU8-4): the rig runs 24 min (was 20) — with the beat-by-beat coronary supply the arrest comes at
// +11.2 min after SaO2 < 60 % (TAU_HYP_S 235), so the 6–10 min post-arrest window needs the longer run; no band moves
const asphyxiaCourse = (): Promise<Course> => (asphyxiaRun ??= asphyxia('modeled', false, 24 * 60, true));
```

In `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`, find:

```ts
  it('apnoeic paralysed adult on room air: HR < 40 within 6 min of SaO2 < 60 %, then PEA/asystole/VF 5–14 min after it; 6–10 min later still pulseless, SaO2 < 20 %, HR not rising — measured SaO2 0.11 %, PP 0.00 mmHg, rate 0 (the PEA decayed to asystole, FU-4 F5), monitor HR 0 vs 59/57.9; PEA at +6.90 min (TAU_HYP_S 360)', async () => {
```

Replace with:

```ts
  it('apnoeic paralysed adult on room air: HR < 40 within 6 min of SaO2 < 60 %, then PEA/asystole/VF 5–14 min after it; 6–10 min later still pulseless, SaO2 < 20 %, HR not rising — measured SaO2 0.11 %, PP 0.00 mmHg, rate 0 (the PEA decayed to asystole, FU-4 F5), monitor HR 0 vs 59/57.9; PEA at +11.2 min (TAU_HYP_S 235, FU-8; +6.35 at 300 before)', async () => {
```

In `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`, find:

```ts
    const c = await asphyxia('modeled', false, 20 * 60, false, true);
```

Replace with:

```ts
    const c = await asphyxia('modeled', false, 24 * 60, false, true);
```

- [x] **Step 4 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/engine/fu8-coronary.test.ts -t "A10" test/engine/circ- test/engine/clinical-suite.test.ts test/engine/af- test/engine/fidelity-lowflow.test.ts`
→ pass. Prototype: coronary unit tests green; clinical suite unchanged but S8 (+9.92 min at this commit); `fu8 A10: AF 150
kIsch min 0.89, arrest false`; asphyxia `arrest (PEA (sinus)) at +11.2 min`, reversal `HR ≥ 60 after 0.12 min (7.0 s)`.
Re-run the CM cells: `cd ../research/19-audit-scripts && CM_OUT=<scratchpad>/fu-8-followups/cm.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts CM-15c CM-15b CM-05b CM-04a`
→ CM-15c kIschMin40 ≈ 0.85–0.9 (was 0), no arrest in either arm (was agonal +15.5 min); CM-15b no arrest. Paste the rows
into the gate note beside research/19's column (research/12 §7).

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/coronary.ts packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts packages/engine-core/test/engine/fu8-coronary.test.ts
git commit -m "fix(coronary): MODELED supply and demand beat by beat over the last 2 s — rapid AF no longer kills a normal heart; TAU_HYP_S 235 from the joint plateau (FU-8 A10, C3)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A11: ST depression follows the filtered ischaemia (C2, I-50)

**Files:** Modify `packages/engine-core/src/l2/circ/coronary.ts` (the ST target in `stepCoronary`; `ST_DEFICIT_MIN` came with Task A10). The tests are in
`fu8-coronary.test.ts` (Task A10).

**Why:** the ST timer counted CONTINUOUS seconds of the instantaneous δ > 0.1 and reset on any dip (3-vessel CAD at HR
110: δ 0–0.27, longest run 3 s) — the heart lost 14–35 % contractility and never showed ST. ST now follows the SAME
filtered deficit that drives kIsch, (1 − kIsch)/G_ISCH; the 30–60 s lag is kIsch's τ 20 s plus the ST filter (15/60 s).
`ischT` stays in the state for old snapshots, unread.

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

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-coronary.test.ts test/l2/circ` → pass: `fu8 A11: CAD HR 130 kIsch min 0.67, ST min
-0.214 mV` at this commit (0.69 / −0.200 once Task A13 sizes the 80 kg rig on 74.8 kg; before: 0.65 / 0.00); healthy 65 y at 130: no ST. At HR 110 the filtered deficit is 0.10 — on the threshold,
no ST (research/19 CM-04a stays WR: the size is Ali's Q6).

- [x] **Commit and push.**

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
// band, and ONE continuous body size. MODELED, seed 7, 600 s spontaneous (A12) / 300 s ventilated (A13).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { resolveProfile } from '../../src/l2/circ/profile.ts';

type C = { beats: Array<{ map: number; sv: number }>; qFwd: number; prof: { bloodVolumeMl: number } };
const bvOf = (sex: 'M' | 'F', weightKg: number, heightCm?: number, ageY = 40) => resolveProfile({ ageY, sex, weightKg, ...(heightCm ? { heightCm } : {}), conditions: [] }).bloodVolumeMl;
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
  return { map: bs.reduce((a, b) => a + b.map, 0) / bs.length, sv: bs.reduce((a, b) => a + b.sv, 0) / bs.length, co: c.qFwd * 0.06, bv: c.prof.bloodVolumeMl };
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

describe('FU-8 A13 (C4; R50 F1, ruling 1): ONE continuous body-size rule (l2/body-size.ts)', () => {
  it('anchored: the default 70 kg adult keeps 4 900 mL (M) / 4 550 mL (F), the 70 kg elderly 4 340 — no drift', () => {
    expect(bvOf('M', 70)).toBe(4900);
    expect(bvOf('F', 70)).toBe(4550);
    expect(bvOf('M', 70, undefined, 75)).toBe(4340);
    expect(resolveProfile().bloodVolumeMl).toBe(4900);
  });
  it('blood volume rises continuously with weight, 50–160 kg, both sexes, with and without a height, ≈ 20 mL per 0.5 kg and no step (origin/main: 70 mL/kg of TOTAL weight, 35 mL per 0.5 kg; the first FU-8 draft: a BMI-30 step, 6 405 → 5 526 mL)', () => {
    for (const [sex, h] of [['M', 175], ['F', 160], ['M', undefined], ['F', undefined]] as const) {
      let prev = 0;
      for (let w = 50; w <= 160; w += 0.5) {
        const bv = bvOf(sex, w, h);
        expect(bv).toBeGreaterThan(prev);
        if (prev > 0) expect(bv - prev).toBeLessThan(25); // ≈ 20 mL per 0.5 kg: no discontinuity
        prev = bv;
      }
    }
  });
  it('stroke volume does not fall across BMI 30 at a fixed height, both sexes (before FU-8: CO −8 % (M) and −26 % (F) for one kilogram more)', async () => {
    for (const [h, lo, hi] of [[175, 91.5, 92.5], [160, 76, 77.5]] as const) {
      const sex = h === 175 ? 'M' : 'F';
      const a = await rest({ ageY: 40, sex, weightKg: lo, heightCm: h }, 300, true);
      const b = await rest({ ageY: 40, sex, weightKg: hi, heightCm: h }, 300, true);
      console.log(`fu8 A13: ${sex} ${h} cm, ${lo} → ${hi} kg: BV ${a.bv.toFixed(0)} → ${b.bv.toFixed(0)} mL, SV ${a.sv.toFixed(1)} → ${b.sv.toFixed(1)} mL`);
      expect(b.bv).toBeGreaterThan(a.bv);
      expect(b.sv).toBeGreaterThanOrEqual(a.sv);
    }
  }, 240_000);
  it('127 kg / 175 cm (BMI 41): blood volume by Lemmens (6.3–6.7 L) and resting CO 1.2–1.5 × the 70 kg adult (tables §1.3 × 1.35); before FU-8: 8.89 L and × 1.85', async () => {
    const lean = await rest({ ageY: 40, weightKg: 70, heightCm: 175 }, 300, true);
    const obese = await rest({ ageY: 40, weightKg: 127, heightCm: 175 }, 300, true);
    console.log(`fu8 A13: BV ${obese.bv.toFixed(0)} mL, CO ${obese.co.toFixed(2)} vs ${lean.co.toFixed(2)} (× ${(obese.co / lean.co).toFixed(2)})`);
    expect(obese.bv).toBeGreaterThanOrEqual(6300);
    expect(obese.bv).toBeLessThanOrEqual(6700);
    expect(obese.co / lean.co).toBeGreaterThanOrEqual(1.2);
    expect(obese.co / lean.co).toBeLessThanOrEqual(1.5);
  }, 120_000);
  it('127 kg with NO height (the band default, 175 cm): the same patient as 127 / 175 — 6.6 L (before FU-8: 8.89 L)', () => {
    expect(bvOf('M', 127)).toBe(bvOf('M', 127, 175));
  });
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

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-body-size.test.ts -t "A12" test/l2/circ test/engine/organs-htn.test.ts test/engine/circ-manual-ischaemia.test.ts test/engine/resp-child`
→ pass: neonate MAP 64 (was 82–89), CO 0.31 L/min (was 0.15); infant 62 (98–105), 0.60 (0.47); child 79 (100–105);
ventilated neonate HR 152 (199–214). Then the whole fast set (paediatric respiratory rigs live there).

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/profile.ts packages/engine-core/test/engine/fu8-body-size.test.ts
git commit -m "fix(profile): each age band rests at its own set point, not at 120/80 (FU-8 A12, C5)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A13: ONE continuous body-size rule — the circulation sized by Lemmens-indexed blood volume, anchored on the default adult (C4, I-51; R50 F1, ruling 1)

**Files:** Create `packages/engine-core/src/l2/body-size.ts` (`sizeWeightKg`, `SIZE_REF_KG`, `DEFAULT_HEIGHT_CM` — shared, so 7c (FU-9) and
any later module size the same patient the same way). Modify `packages/engine-core/src/l2/circ/profile.ts` (`CircProfile.heightCm`, the
import, the sizing lines), `packages/engine-core/src/l2/hemo/pipeline.ts` (`circProfileOf` passes `heightCm`). The tests are the A13
describe of `fu8-body-size.test.ts` (Task A12).

**Why (orchestrator ruling 1; R50 F1):** the circulation was sized on TOTAL weight (127 kg / 175 cm: CO × 1.85, BV
8.89 L = 70 mL/kg) while 7c held 6.5 L. The first draft switched to the adjusted weight above BMI 30 only, with a height
only: a THIRD rule, discontinuous at BMI 30 (one kilogram more dropped CO 8 % in a man and 26 % in a woman; a 100 kg
woman had less output than a 76 kg one) and unchanged without a height. Now ONE continuous rule for every adult weight,
with and without a stated height (absent = the band's default height, 7c's: adult 175, elderly 170 cm): Lemmens'
indexed blood volume (Lemmens HJM, Bernstein DP, Brodsky JB, Obes Surg 2006;16:773–6: BV = 70/√(BMI/22) mL/kg, the
tables' §1.3 rule) makes BV ∝ height × √weight; the circulation is sized on the weight at which the band's own per-kg
BV gives that volume — size = (height / default height) × √(70 × weight) — so blood volume AND resting cardiac output
(the isometric §2.2 scaling runs on the size) follow one monotonic curve. ANCHOR: the band's default patient is exactly
itself — the default 70 kg adult keeps 4 900 mL (M) / 4 550 mL (F), the 70 kg elderly 4 340 mL; every rig with 70 kg
and no height is bit-identical (no drift: the review's 4 900 → 4 807 mL does not happen). Children and adolescents keep
their weight (Lemmens is an adult rule; the paediatric scaling is W12). **FU-9 inherits this definition** (its 7c
`bloodPatient` Lemmens branch is capped at the band value below BMI 22 and anchored at BMI 22: 4 807 mL at 70/175 —
"Handed to").

The curve (resolveProfile; SV from 300 s ventilated MODELED runs, seed 7):

| weight (kg) | 50 | 60 | 70 | 80 | 90 | 91.5 | 92.5 | 100 | 110 | 127 | 140 | 160 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BV, M 175 cm or no height (mL) | 4 141 | 4 537 | 4 900 | 5 238 | 5 556 | 5 602 | 5 633 | 5 857 | 6 142 | 6 600 | 6 930 | 7 408 |
| SV, M 175 cm (mL) | 55.4 | 61.5 | 68.2 | 73.2 | 78.3 | 79.1 | 79.6 | 83.0 | 88.1 | 95.3 | 100.9 | 107.9 |
| BV, F 160 cm (mL) | 3 516 | 3 851 | 4 160 | 4 447 | 4 717 | — | — | 4 972 | 5 215 | — | 5 883 | 6 289 |
| BV, F no height (mL) | 3 845 | 4 212 | 4 550 | 4 864 | 5 159 | — | — | 5 438 | 5 704 | — | 6 435 | 6 879 |

Largest step per 0.5 kg anywhere in 50–160 kg: 20.7 mL (no discontinuity). F 160 cm across BMI 30 (76 → 77.5 kg): BV
4 335 → 4 377 mL, SV 63.7 → 64.9 mL (the first draft: CO −26 %). 127 kg / 175 cm: BV 6 600 mL, CO × 1.33 (tables §1.3:
× 1.35 at BMI ≥ 40). Adults with a weight other than 70 kg and no height now move: e.g. 80 kg is sized on 74.8 kg (was
80), 5 238 mL (was 5 600) — Task G's moved-rows table lists the rigs (HFrEF 80 kg, CAD 80 kg, the DV IABP rigs).

The LUNG half (profile FRC vs the `obesity` lung condition, 2.7 vs 1.43 min) is FU-6's R4 re-tune on this definition and
Ali's Q3 — handed (see "Handed to"). Stage 3's `effKg` (IBW + 0.4·excess) stays Stage 3's metabolic rule (VO2): 90 kg /
175 cm is sized 79.4 kg here against Stage 3's 78.3.

Create `packages/engine-core/src/l2/body-size.ts`:

```ts
// FU-8 (C4; R50 review F1, orchestrator ruling 1): ONE continuous body-size rule for the adult circulation, shared so
// 7c (FU-9) and any later module size the same patient the same way. Pure, deterministic, plain data.
//
// Lemmens' indexed blood volume (Lemmens HJM, Bernstein DP, Brodsky JB. Obes Surg 2006;16:773–6: BV = 70/√(BMI/22)
// mL/kg of actual weight, the tables' §1.3 rule) makes blood volume proportional to height × √weight. The circulation
// is sized on the weight at which the band's own per-kg blood volume gives that volume ("size weight"), so blood volume
// AND resting cardiac output (the isometric §2.2 scaling runs on the size weight) follow one continuous, monotonic curve
// in weight — no BMI step, with or without a stated height. ANCHOR: the band's default patient (70 kg at the band's
// default height) is exactly itself, so the default 70 kg adult keeps 4,900 mL (M) / 4,550 mL (F) and every rig that
// gives no height and 70 kg is bit-identical. 127 kg / 175 cm: size 94.3 kg → BV 6.6 L, CO × 1.35 (tables §1.3).

/** The reference weight of the anchor (the engine's default adult, kg). */
export const SIZE_REF_KG = 70;
/** The default height by band when the profile gives none (cm) — 7c's band defaults (`l2/blood/params.ts` BAND). */
export const DEFAULT_HEIGHT_CM = { adult: 175, elderly: 170 } as const;

/**
 * The weight (kg) the adult circulation is sized on: (height / default height) × √(70 × weight). Children and
 * adolescents are sized on their weight as given (Lemmens is an adult rule; the paediatric scaling is W12, Ali's).
 */
export function sizeWeightKg(band: string, weightKg: number, heightCm?: number): number {
  if (band !== 'adult' && band !== 'elderly') return weightKg;
  const hDef = DEFAULT_HEIGHT_CM[band];
  return ((heightCm ?? hDef) / hDef) * Math.sqrt(SIZE_REF_KG * weightKg);
}
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
import { stenosisK } from './valves.ts';
import { WK_R0 } from '../hemo/params.ts';

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';
```

Replace with:

```ts
import { stenosisK } from './valves.ts';
import { WK_R0 } from '../hemo/params.ts';
import { sizeWeightKg } from '../body-size.ts';

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
  weightKg: number;
  conditions: CircCondition[];
```

Replace with:

```ts
  weightKg: number;
  /** FU-8 (C4): height, for the body-size rule (l2/body-size.ts); absent = the band's default height. */
  heightCm?: number;
  conditions: CircCondition[];
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
  const w = pr.weightKg / 70; // tables §2.2: volumes/compliances ×W/70, resistances and elastances ×70/W
  const bvKg = pr.sex === 'F' && (band === 'adult' || band === 'elderly') ? BV_ML_KG_F : b.bv;
```

Replace with:

```ts
  // FU-8 (C4, research/19; R50 F1, ruling 1): ONE continuous body-size rule (l2/body-size.ts, Lemmens-indexed, anchored
  // on the default 70 kg adult). Before, the circulation was sized on the total weight (127 kg / 175 cm: CO × 1.85,
  // BV 8.89 L = 70 mL/kg) while blood/gas held 6.5 L; tables §1.3: resting CO × 1.35 at BMI ≥ 40.
  const sizeKg = sizeWeightKg(band, pr.weightKg, pr.heightCm);
  const w = sizeKg / 70; // tables §2.2: volumes/compliances ×W/70, resistances and elastances ×70/W
  // per kg of ACTUAL weight: the band's blood volume per kg of SIZE weight × the size weight ÷ the weight
  const bvKg = ((pr.sex === 'F' && (band === 'adult' || band === 'elderly') ? BV_ML_KG_F : b.bv) * sizeKg) / pr.weightKg;
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

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-body-size.test.ts test/l2/circ test/engine/circ-` → pass: `fu8 A13: BV 6600 mL, CO 7.09
vs 5.34 (× 1.33)` (origin/main: 8 890 mL, × 1.85); `M 175 cm, 91.5 → 92.5 kg: BV 5602 → 5633 mL, SV 79.1 → 79.6 mL`;
`F 160 cm, 76 → 77.5 kg: BV 4335 → 4377 mL, SV 63.7 → 64.9 mL`. Then the fast set (Stage 3's obese apnoea rigs read the
gas side only; the 80 kg rigs of `test/l2/circ/stabilise.test.ts` stay inside their bands — prototype: fast set green).

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/body-size.ts packages/engine-core/src/l2/circ/profile.ts packages/engine-core/src/l2/hemo/pipeline.ts
git commit -m "fix(profile): one continuous body-size rule — Lemmens-indexed size weight, anchored on the default adult (FU-8 A13, C4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
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
// FU-8 Task A14 (research/19 C12): setRhythm refuses option keys the rhythm engine does not read.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

describe('FU-8 A14: RhythmOpts are validated', () => {
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

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/setrhythm-opts.test.ts` then the whole fast set (every rhythm command in the repo's
tests, scenarios and demos passes the new check — prototype: 268 files green) and `npx -y pnpm@9.15.9 --filter @pme/controller test`.

- [x] **Commit and push.**

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

- [x] **Verify.** `npx -y pnpm@9.15.9 --filter @pme/controller test && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
→ 222 passed (prototype), clean.

- [x] **Commit and push.**

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

- [x] **Verify.** `npx -y pnpm@9.15.9 --filter @pme/controller test && npx -y pnpm@9.15.9 --filter @pme/validation test`
→ pass (the validation package's documents validate with warnings only).

- [x] **Commit and push.**

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
// FU-8 Task A17 (Stage 9 R-S9-1a): after a resize/reset the first frame redraws the last lane-width of samples (less
// the erase gap) instead of starting one sample back — a view change no longer blanks the sweep.
import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const cfg: LaneConfig = {
  x: 0, y: 0, width: 400, height: 100, baseline: 0.5, rate: 500, mmPerS: 25, pxPerMm: 4, gainMmPerMv: 10,
  color: '#0f0', background: '#000', lineWidth: 1.5, eraseGapPx: 16,
};

describe('FU-8 A17: the sweep backfills after a reset', () => {
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
type Pt = { x: number; y: number }; // x unwrapped CSS px relative to lane start, y CSS px
type Rect = [number, number, number, number]; // canvas CSS px

export class SweepLane {
```

Replace with:

```ts
type Pt = { x: number; y: number }; // x unwrapped CSS px relative to lane start, y CSS px
type Rect = [number, number, number, number]; // canvas CSS px

/** FU-8 (R-S9-1a): the backfill never reaches past the engine's 120 s buffer (`BUFFER_SECONDS`), where a read would
 * start at the oldest sample instead of the one asked for [ENG margin]. */
const BACKFILL_MAX_S = 100;

export class SweepLane {
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

- [x] **Verify.** `npx -y pnpm@9.15.9 --filter @pme/renderer test` → 89 passed (prototype); the monitor e2e (Task G) shows no
blank lane after a Monitor ↔ Instructor switch once Stage 9 lands (a Stage 9 check, not FU-8's).

- [x] **Commit and push.**

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

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-ph-grade.test.ts test/l2/circ` → pass: `PVR mild 2.9, moderate 4.7, severe 9.6, none 4.7 WU`
(prototype; before: 4.7 at every grade). mPAP mild 24, moderate 35, severe 57 mmHg (probe, CO 5.3 / 5.3 / 4.9 L/min).

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/profile.ts packages/engine-core/test/engine/fu8-ph-grade.test.ts
git commit -m "fix(profile): the PH grade sets PVR 3/5/10 WU and RV Ees 1.3/1.6/2.0 (FU-8 A18, C8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A19: A compartment cannot give blood it does not hold — the size-scaled outflow limiter (F6, I-07; R50 F4, orchestrator ruling 3; research/20 DV-04a)

**Files:** Modify `packages/engine-core/src/l2/circ/circuit.ts` (`V_EMPTY_ML`, `CircParams.vEmpty`, the `give` limiter on the seven
compartment outflows, the venous and atrial collapse floors), `packages/engine-core/src/l2/circ/profile.ts` (`vEmpty: V_EMPTY_ML × W/70`),
`packages/engine-core/test/engine/circ-lowflow-arrest.test.ts`, `packages/engine-core/test/engine/hemo-acceptance.test.ts`, `packages/engine-core/test/engine/clinical-suite.test.ts`
(all three **E-FU8-9**). Create `packages/engine-core/test/engine/fu8-negative-volume.test.ts`.

**Order:** after Task A18. The rows it moves were measured on the whole of Part A (the review's F4 numbers), so each
commit stays green in this order. `circuit.ts` is in no in-flight plan (R50 §4).

**Why (D5; the review's F4; ruling 3):** after an exsanguination arrest a ≈ 3 mL/s forward leak at a 0.1 mmHg gradient
drained the RV, LV and pulmonary bed to NEGATIVE volumes (VRV −273, VLV −62, VPA −1.2, VPV −6.1 mL) because the passive
pressures bottom out (EDPVR → −A; linear atria and pulmonary compliances) and nothing stopped a compartment giving blood
it did not hold; the monitor showed CVP −1 … −3.5 and, since Task A1, the yellow `**CVP -1<0` follows it live. Option D:
a flow OUT of a compartment × min(1, V / vEmpty) (chambers: absolute volume; pulmonary arteries/veins: stressed volume),
and the systemic veins and atria collapse instead of sucking (floors at 0 transmural). `vEmpty` is SIZE-SCALED (5 mL ×
W/70 = 0.25 mL in a 3.5 kg neonate): the first prototype's absolute 5 mL throttled small hearts (neonate CO 0.31 → 0.165
L/min, infant 0.60 → 0.46, FU-4's `vent-infant` EtCO2–PaCO2 gap 10.8 — the review's F4); size-scaled, the paediatric
outputs are unchanged (0.311) and `vent-infant` passes. Outside CPR and collapse nothing moves (the atrial floor acts
only below the unstressed volume).

**Rows that move — declared (E-FU8-9; the review's F4 corrected the premise):**
- **class IV ROSC with CPR + 2 L + adrenaline: +119 → +260 s, RE-STATED ≤ 300 s.** The 3-min wording was a measured
  expectation, not a sourced band (FU-4's own plan called it arbitrary and proposed 4 min). CPR cannot perfuse an empty
  heart until the volume is in: the 2 L are in at +180 s and the pulse follows ≈ 80 s later (CoPP 0.2 → 22.6); the
  +119 s came from the suction artefact.
- **"10 min of VF CPR: kIsch < 0.9 throughout" — the pin FLIPS** (max 0.91 → 0.89): an improvement.
- **7b "CPR trough ≤ 30" — the pin FLIPS** (30.6 → 25.2 mmHg).
- **S13 CoPP 25.1–28.8 → 24.9–28.0** (still an `it.fails` against Paradis 15–25; the title re-stated).
- **S8 +9.92 → +9.75 min** (the value FU-4 recorded); **exsanguination thresholds** (E-FU4-19 measurements, not bands):
  3 L +180 s and 3.5 L +170 s → no pulse up to 3.5 L (W7 to Ali with these numbers).
- **research/20 DV-04a (the DV amendment (c)) — FIXED here:** CPR on a tamponaded heart 181/124, MAP 154, forward flow
  11.9 L/min, CVP 60, CoPP −12.9 → 38/17, MAP 20.1 (VF CPR 31.6–41.8), 0.57 L/min, CVP 15.7, CoPP 8.3. The chambers had
  pumped the to-and-fro volume against a tense pericardium from negative volumes.
- research/20 DV-02a: cerebral flow under CPR 0.71 → 0.44 of normal, CPR CO 1.5 → 1.21 L/min (Task A24 records it).

- [x] **Step 1 — failing tests.**

Create `packages/engine-core/test/engine/fu8-negative-volume.test.ts`:

```ts
// FU-8 Task A19 (F6, G-FU4 2026-09-29; plan D5; orchestrator ruling 3): after the exsanguination arrest the circulation
// drained to NEGATIVE chamber volumes and the monitor showed a negative CVP (origin/main 0fd5397: VRV −273, VLV −62 mL,
// displayed CVP −2.9 … −1.0, min −3.5). Option D — an outflow limiter (size-scaled) plus collapse floors — removes them.
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
  console.log(`fu8 A19: min chamber volume ${minVol.toFixed(0)} mL, min displayed CVP ${minCvp.toFixed(1)} mmHg`);
  return { minVol, minCvp };
}

describe('FU-8 A19 (F6): the empty circulation after an exsanguination arrest', () => {
  let run: ReturnType<typeof classIv> | undefined;
  it('no chamber volume below 0 mL in 600–1200 s of the class IV rig (origin/main: VRV −273, VLV −62 mL)', async () => {
    expect((await (run ??= classIv())).minVol).toBeGreaterThanOrEqual(0);
  }, 120_000);
  it('the displayed CVP stays ≥ −0.5 mmHg on PPV after the arrest (origin/main: −2.9 … −1.0, min −3.5; one display unit of noise)', async () => {
    expect((await (run ??= classIv())).minCvp).toBeGreaterThanOrEqual(-0.5);
  }, 120_000);
  it('the limiter scales with the heart: a 3.5 kg neonate keeps its resting output (0.31 L/min without the limiter; an absolute 5 mL gave 0.165)', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 0.01, sex: 'M', weightKg: 3.5, sensors: { abp: 'connected' } } });
    for (let t = 60; t <= 600; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    const co = (e as unknown as { st: { hemo: { circ: { qFwd: number } } } }).st.hemo.circ.qFwd * 0.06;
    console.log(`fu8 A19: neonate resting CO ${co.toFixed(3)} L/min`);
    expect(co).toBeGreaterThanOrEqual(0.29);
  }, 120_000);
});

type Cpr = { mapNow: number; qFwd: number };
async function cprMap(tamponade: boolean): Promise<{ map: number; fwd: number }> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', cvp: 'connected' } } });
  let n = 0;
  const ev = (event: Record<string, unknown>) => e.dispatch({ id: `t${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
  e.advanceTo(1);
  ev({ kind: 'airwayDevice', device: 'ett' });
  ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
  e.advanceTo(60);
  if (tamponade) ev({ kind: 'condition', id: 'tamponade', severity: 1 });
  else e.dispatch({ id: 'vf', issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse' } as never);
  let t0 = tamponade ? -1 : 120;
  if (tamponade) {
    e.advanceTo(300);
    ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    for (let t = 301; t <= 900 && t0 < 0; t++) {
      e.advanceTo(t);
      const r = (e as unknown as { st: { rhythm: { opts: { pulseless?: boolean } } } }).st.rhythm;
      if (r.opts.pulseless === true) t0 = t + 60; // CPR from PEA + 60 s (research/20 DV-04a)
    }
  }
  e.advanceTo(t0);
  ev({ kind: 'cpr', active: true, rate: 110, quality: 0.8 });
  let map = 0;
  let fwd = 0;
  let k = 0;
  for (let t = t0 + 60; t <= t0 + 480; t += 5) {
    e.advanceTo(t);
    const c = (e as unknown as { st: { hemo: { circ: Cpr } } }).st.hemo.circ;
    map += c.mapNow;
    fwd += c.qFwd * 0.06;
    k++;
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { map: map / k, fwd: fwd / k };
}

describe('FU-8 A19 (research/20 DV-04a): CPR on a tamponaded heart', () => {
  it('severe tamponade + propofol → PEA → CPR q 0.8: the arterial mean stays at or below VF-CPR\'s and the forward flow under 1 L/min (origin/main 3feee6f: MAP 154 (181/124) against 46, 11.9 L/min — the chambers pumped against a tense pericardium from negative volumes)', async () => {
    const tamp = await cprMap(true);
    const vf = await cprMap(false);
    console.log(`fu8 A19 DV-04a: tamponade CPR MAP ${tamp.map.toFixed(1)}, forward ${tamp.fwd.toFixed(2)} L/min; VF CPR MAP ${vf.map.toFixed(1)}, ${vf.fwd.toFixed(2)} L/min`);
    expect(tamp.map).toBeLessThanOrEqual(vf.map);
    expect(tamp.fwd).toBeLessThan(1);
  }, 180_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-negative-volume.test.ts` → the two volume tests and DV-04a FAIL (`min chamber volume -274 mL, min
displayed CVP -3.5 mmHg`; tamponade CPR MAP ≈ 154, 11.9 L/min); the neonate test passes.

- [x] **Step 2 — the limiter and the floors.**

In `packages/engine-core/src/l2/circ/circuit.ts`, find:

```ts

export const N_STATE = 11;
```

Replace with:

```ts

/**
 * FU-8 (F6, I-07; R50 F4, orchestrator ruling 3 — Option D): a compartment cannot give blood it does not hold. A flow
 * OUT of a compartment is scaled by min(1, V / vEmpty) of that compartment's volume (chambers: absolute volume;
 * pulmonary arteries/veins: stressed volume — below it the vessels collapse, West zone 1); the systemic veins and the
 * atria collapse instead of holding a negative transmural pressure (floors in `evaluate`). Without it the passive
 * pressures bottom out (EDPVR → −A, linear atria/pulmonary compliances) while the downstream pressure keeps falling, and
 * a ≈ 3 mL/s forward leak ran the RV, LV and pulmonary bed to NEGATIVE volumes after an exsanguination arrest (VRV −273,
 * VLV −62, VPA −1, VPV −6 mL; CVP −1 to −3.5 on the monitor). `vEmpty` is SIZE-SCALED (profile: 5 mL × W/70, i.e.
 * 0.25 mL in a 3.5 kg neonate): an absolute 5 mL throttled small hearts (neonate CO 0.31 → 0.165 L/min) [ENG: V0_LV,
 * the smallest volume a chamber can still eject from].
 */
export const V_EMPTY_ML = 5;
const give = (q: number, vFrom: number, vTo: number, ve: number): number =>
  q >= 0 ? q * Math.min(1, Math.max(0, vFrom / ve)) : q * Math.min(1, Math.max(0, vTo / ve));

export const N_STATE = 11;
```

In `packages/engine-core/src/l2/circ/circuit.ts`, find:

```ts
  vCprRef: number;
}
```

Replace with:

```ts
  vCprRef: number;
  /** FU-8 (F6): the volume below which a compartment's outflow is throttled, mL (absent = V_EMPTY_ML; profile ×W/70). */
  vEmpty?: number;
}
```

In `packages/engine-core/src/l2/circ/circuit.ts`, find:

```ts
  // the ≈ 4 an uncollapsed chamber gives). Outside CPR the transmural pressure is free, as every calibrated CVP rig
  // expects.
```

Replace with:

```ts
  // the ≈ 4 an uncollapsed chamber gives). FU-8 (F6): outside CPR too — an atrium below its unstressed volume, and the
  // systemic veins below theirs, collapse instead of sucking (the transmural pressure is negative only then, so every
  // calibrated CVP rig is unchanged).
```

In `packages/engine-core/src/l2/circ/circuit.ts`, find:

```ts
  const pRa = (cr > 0 ? Math.max(0, traRa) : traRa) + extV + cc;
  const pLa = (cr > 0 ? Math.max(0, traLa) : traLa) + extV + cc;
  const pSv = ((s[4] as number) - p.v0Sv) / p.cSv;
```

Replace with:

```ts
  const pRa = Math.max(0, traRa) + extV + cc;
  const pLa = Math.max(0, traLa) + extV + cc;
  const pSv = Math.max(0, (s[4] as number) - p.v0Sv) / p.cSv;
```

In `packages/engine-core/src/l2/circ/circuit.ts`, find:

```ts
  o.qAv = qAv; o.qPv = qPv;
  o.qMv = L_valveFlow(p.mv, pLa - pLv);
  o.qTv = L_valveFlow(p.tv, pRa - pRv);
  o.qVr = dpv >= 0 ? dpv / p.rVr : dpv / (p.rVr * L_R_VR_BACK);
```

Replace with:

```ts
  const ve = p.vEmpty ?? V_EMPTY_ML;
  const vRa = s[5] as number;
  const vRv = s[6] as number;
  const vPa = s[7] as number;
  const vPv = s[8] as number;
  const vLa = s[9] as number;
  o.qAv = give(qAv, vlv, Infinity, ve);
  o.qPv = give(qPv, vRv, vPa, ve);
  o.qMv = give(L_valveFlow(p.mv, pLa - pLv), vLa, vlv, ve);
  o.qTv = give(L_valveFlow(p.tv, pRa - pRv), vRa, vRv, ve);
  o.qVr = give(dpv >= 0 ? dpv / p.rVr : dpv / (p.rVr * L_R_VR_BACK), Infinity, vRa, ve);
```

In `packages/engine-core/src/l2/circ/circuit.ts`, find:

```ts
  o.qLungL = (pPa - pPv) / p.pvrL;
  o.qLungR = (pPa - pPv) / p.pvrR;
  o.qPvla = (pPv - pLa) / p.rPvla;
```

Replace with:

```ts
  o.qLungL = give((pPa - pPv) / p.pvrL, vPa, vPv, ve);
  o.qLungR = give((pPa - pPv) / p.pvrR, vPa, vPv, ve);
  o.qPvla = give((pPv - pLa) / p.rPvla, vPv, vLa, ve);
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
import type { CircParams } from './circuit.ts';
```

Replace with:

```ts
import { V_EMPTY_ML, type CircParams } from './circuit.ts';
```

In `packages/engine-core/src/l2/circ/profile.ts`, find:

```ts
    vCprRef: V_CPR_REF_FRAC * bvKg * pr.weightKg, // FU-4 F1(a)
  };
```

Replace with:

```ts
    vCprRef: V_CPR_REF_FRAC * bvKg * pr.weightKg, // FU-4 F1(a)
    vEmpty: V_EMPTY_ML * w, // FU-8 (F6): the outflow limiter scales with the heart (0.25 mL in a 3.5 kg neonate)
  };
```

- [x] **Step 3 — the declared rows (E-FU8-9).** Run `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-lowflow-arrest.test.ts test/engine/hemo-acceptance.test.ts test/engine/clinical-suite.test.ts`
first: the ROSC row fails at ≈ +260 s, and the two pins report "Expect test to fail". Then:

In `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts`, find:

```ts
  it('ROSC: CPR + 2 L + adrenaline 60 s after the arrest — a pulse within 3 min (measured +113 s of CPR)', async () => {
```

Replace with:

```ts
  // FU-8 (E-FU8-9, orchestrator ruling 3): RE-STATED. The 3-min wording was a measurement, not a sourced band (FU-4's
  // own plan called it arbitrary and proposed 4 min): +113/+119 s came from the suction artefact that drained the
  // chambers to negative volumes. With the outflow limiter CPR cannot perfuse an empty heart until the 2 L are in
  // (+180 s); the pulse follows ≈ 80 s later (CoPP 0.2 → 22.6)
  it('ROSC: CPR + 2 L + adrenaline 60 s after the arrest — a pulse within 5 min (measured +260 s of CPR after FU-8 A19, the outflow limiter; +119 s on the suction artefact before)', async () => {
```

In `packages/engine-core/test/engine/circ-lowflow-arrest.test.ts`, find:

```ts
    expect((c.tPulseBack as number) - ((c.tArrest as number) + 60)).toBeLessThanOrEqual(180);
```

Replace with:

```ts
    expect((c.tPulseBack as number) - ((c.tArrest as number) + 60)).toBeLessThanOrEqual(300);
```

In `packages/engine-core/test/engine/hemo-acceptance.test.ts`, find:

```ts
  it.fails('7b. CPR at 110/min, quality 1: arterial trough ≤ 30 mmHg — measured 30.6 after FU-4 F1', () => {
```

Replace with:

```ts
  // FU-8 (E-FU8-9): flipped by the outflow limiter (A19): an emptied chamber no longer holds the suction-drawn volume
  it('7b. CPR at 110/min, quality 1: arterial trough ≤ 30 mmHg — measured 30.6 after FU-4 F1, 25.2 after FU-8', () => {
```

In `packages/engine-core/test/engine/clinical-suite.test.ts`, find:

```ts
  it.fails('S13 VF + standard-quality CPR (q 0.8, no adrenaline): the continuous coronary perfusion pressure (CoPP) 15–25 mmHg (Paradis 1990; measured 25.1–28.8)', async () => {
```

Replace with:

```ts
  it.fails('S13 VF + standard-quality CPR (q 0.8, no adrenaline): the continuous coronary perfusion pressure (CoPP) 15–25 mmHg (Paradis 1990; measured 24.9–28.0 after FU-8 A19, 25.1–28.8 before)', async () => {
```

In `packages/engine-core/test/engine/clinical-suite.test.ts`, find:

```ts
  // R45 (Task 18a's residual): 0.56 at 70 s, but the flow share recovers as CoPP settles above 25 — max 0.91 (end 0.87)
  it.fails('10 min of VF with standard-quality CPR alone: the myocardium stays ischaemic, flow share kIsch < 0.9 throughout (Weisfeldt & Becker 2002; measured max 0.91)', async () => {
```

Replace with:

```ts
  // R45 (Task 18a's residual): 0.56 at 70 s, but the flow share recovered as CoPP settled above 25 — max 0.91 (end 0.87).
  // FU-8 (E-FU8-9): flipped by the outflow limiter (A19): max 0.89
  it('10 min of VF with standard-quality CPR alone: the myocardium stays ischaemic, flow share kIsch < 0.9 throughout (Weisfeldt & Becker 2002; measured max 0.89 after FU-8 A19, 0.91 before)', async () => {
```

- [x] **Step 4 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-negative-volume.test.ts test/engine/circ- test/engine/clinical-suite.test.ts test/engine/hemo-acceptance.test.ts test/engine/vent-infant.test.ts test/engine/fidelity-`
→ pass. Prototype (the A19 commit's tree): `fu8 A19: min chamber volume 11 mL, min displayed CVP -0.1 mmHg`, neonate CO
0.311 L/min; `circ-lowflow-arrest ROSC: CoPP 0.2–22.6, pulse at +260 s`; `VF + CPR 10 min: kIsch max 0.89`; S13
24.9–28.0; S8 +9.75 min; S4a +170 s; DV-04a `tamponade CPR MAP 20, forward 0.57 L/min`. Then the whole fast set
(prototype: green) and `npx -y pnpm@9.15.9 run audit:monitor A2-ali-b7` (no `**CVP -…<0`).

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/circuit.ts packages/engine-core/src/l2/circ/profile.ts packages/engine-core/test/engine/fu8-negative-volume.test.ts packages/engine-core/test/engine/circ-lowflow-arrest.test.ts packages/engine-core/test/engine/hemo-acceptance.test.ts packages/engine-core/test/engine/clinical-suite.test.ts
git commit -m "fix(circ): a compartment cannot give blood it does not hold — size-scaled outflow limiter and collapse floors (FU-8 A19, F6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A20: The IABP helps the heart it supports — the augmented diastole feeds the coronaries, no deflation is cut short, the balloon is timed off the valve (research/20 DV-13d, DV-M5; the DV amendment (a))

**Files:** Modify `packages/engine-core/src/l2/circ/devices.ts` (`iabpSchedule`, the owed deflation, `iabpFlow`), `packages/engine-core/src/l2/hemo/pipeline.ts`
(the aortic-valve tracking `av` at 2 ms, `onCircBeat`'s schedule and `aoDiaEff`; the state fields A21–A23 also use —
`av.qLung`, `arrestKey`, `cprArt` — land here once), `packages/engine-core/src/l2/circ/coronary.ts` (`aoDiaOf`: one of its three blocks is
CHAINED on a line Task A10 wrote). Create `packages/engine-core/test/engine/fu8-iabp.test.ts`, `packages/engine-core/test/l2/circ/fu8-iabp-volume.test.ts`.

**Why — three defects, each measured first (research/20 V2; the orchestrator's DV routing (a)):**
1. **CoPP from the post-deflation dip** (`coronary.ts:142`, the same line as C3): the supply read the beat's MINIMUM aortic
   pressure, which a balloon lowers by design — CoPP FELL 57.7 → 46.1 (research/20; 55.1 → 43.1 on the Part A tree) when
   the augmented diastole should raise it. Now, while a balloon runs, the pipeline measures each diastole's MEAN aortic
   pressure (closure → next opening, 2 ms) and hands the supply `aoDiaEff` = that mean less the unassisted (mean − minimum)
   offset measured before the balloon started — an unassisted beat reads exactly its minimum, an augmented one reads its
   augmentation. Without a balloon nothing changes (`aoDiaEff` absent). The general diastolic-mean supply for every beat
   would move every coronary row; it is recorded for the calibration pass (R44).
2. **The balloon leaked** (`devices.ts:48–54`): a new beat rescheduled it mid-deflation and the rest of the 40 mL stayed in
   the aorta (7 of 63 cycles a minute); LVEDV 219 → 244 mL, LVEDP 10 → 24 over 8 min, then the ischaemic spiral. The
   previous cycle's deflation is now OWED — kept, and brought forward to end before the new inflation.
3. **MANUAL timing** (DV-M5): the schedule came from the completed beat record (R + the record's own closure). In the
   MANUAL cardiogenic-shock rig (contractility 0.4) ejection starts ≈ 400 ms after R and spills into the next record, so
   the "notch" was the previous ejection's tail and every correctly set balloon deflated 272 ms AFTER the valve opened
   (283 ms on the Part A tree). The pressure trigger now reads the valve's own last closure and opening (2 ms), carried one
   R–R ahead: inflate at the next notch, empty IABP_DEFLATE_LEAD_S (40 ms) before the next opening — in both modes.

**Measured (research/20 cells on the prototype, before → after):** DV-13d arrest at +11.0 min → none in 18 min, CoPP IABP
vs control 43.1 vs 55.1 → 66.2 vs 55.1; DV-M5 deflation +283 → −113 ms; DV-13b assisted EDP −16.5 → −18.6 (band −25…−10),
assisted systole −15.4 → −19.1 (TS: the tables' ≈ −5, W26 to Ali), MANUAL assisted EDP +9.2 → −6.0; DV-13c ΔCO 0.20 →
0.05 L/min (TW), PAWP −8.7 → −21.3 % (in band); DV-14d late-deflation EDP +4.1 → +16.6. The IABP trigger in arrest, its
alarms and the console in arrest are 7h's (research/20 V10).

- [x] **Step 1 — failing tests.**

Create `packages/engine-core/test/l2/circ/fu8-iabp-volume.test.ts`:

```ts
// FU-8 Task A20 (research/20 DV-13d, DV-M5): the balloon conserves its volume and is timed off the valve's own events.
import { describe, expect, it } from 'vitest';
import { createIabp, iabpFlow, iabpOnBeat, iabpSchedule, IABP_VOLUME_ML } from '../../../src/l2/circ/devices.ts';

const integral = (f: (t: number) => number, t0: number, t1: number, h = 1e-4): number => {
  let v = 0;
  for (let t = t0; t < t1; t += h) v += f(t) * h;
  return v;
};

describe('FU-8 A20: the IABP', () => {
  it('a new beat that arrives while the balloon is deflating does not cut the deflation short: the net volume over the run is 0 (origin/main: the rest of the 40 mL stayed in the aorta)', () => {
    const d = createIabp();
    d.on = true;
    iabpOnBeat(d, 0, 0.8, 0.37); // inflate 0.37, deflate 0.70–0.76
    const flows: Array<(t: number) => number> = [];
    const snap = () => {
      const c = { ...d };
      flows.push((t) => iabpFlow(c, t));
    };
    snap();
    // an early beat at 0.72 s (the deflation is 20 ms in) reschedules the balloon
    iabpOnBeat(d, 0.72, 0.72, 0.37);
    const net = integral((t) => (t < 0.72 ? (flows[0] as (t: number) => number)(t) : iabpFlow(d, t)), 0, 2);
    expect(Math.abs(net)).toBeLessThan(0.5);
  });
  it('the pressure trigger: inflate at the next notch, empty IABP_DEFLATE_LEAD_S before the next opening, one R–R ahead of the last valve events', () => {
    const d = createIabp();
    d.on = true;
    // MANUAL shock heart: the last opening 400 ms after its R, the closure 14 ms after the next R (systole spills over)
    iabpSchedule(d, 599.55, 0.777, 598.786, 599.18);
    expect(d.inflateAt).toBeCloseTo(599.563, 3);
    expect(d.deflateAt).toBeCloseTo(599.957 - 0.1, 3); // before the next opening, not 270 ms after it
    const vin = integral((t) => iabpFlow(d, t), d.inflateAt, d.inflateAt + 0.08, 5e-5);
    expect(vin).toBeCloseTo(IABP_VOLUME_ML, 0);
  });
});
```

Create `packages/engine-core/test/engine/fu8-iabp.test.ts`:

```ts
// FU-8 Task A20 (research/20 DV-13d, DV-M5): a correctly timed balloon must not harm, raises coronary perfusion, and
// deflates before the valve opens in MANUAL too. Seed 7, ventilated (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5).
// Before FU-8 (origin/main 3feee6f, research/20): the HFrEF + recent-MI heart arrested at +8.8 min with the balloon (CoPP
// 57.7 → 46.1: the post-deflation dip read as the diastolic pressure; 7 of 63 deflations a minute cut short), and the
// MANUAL cardiogenic-shock balloon deflated 272 ms AFTER the valve opened.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { rhythm: { id: string; opts: { pulseless?: boolean } }; hemo: { circOut: { qAv: number }; iabp: { inflateAt: number; deflateAt: number }; circ: { cor: { cpp: number }; arrest: unknown } } };
const HFMI = { ageY: 65, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }, { id: 'cad', grade: 'recentMI' }] };
function rig(patient: Record<string, unknown>, mode: 'modeled' | 'manual') {
  const e = createEngine({ seed: 7, mode, patient: { ...patient, sensors: { abp: 'connected', cvp: 'connected', pap: 'connected' } } as never });
  let n = 0;
  const send = (body: Record<string, unknown>) => e.dispatch({ id: `i${++n}`, issuedBy: 'test', ...body } as never);
  e.advanceTo(1);
  send({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } });
  return { e, send, st: () => (e as unknown as { st: St }).st };
}

async function hfmi(iabp: boolean) {
  const r = rig(HFMI, 'modeled');
  r.e.advanceTo(400);
  if (iabp) r.send({ type: 'device', action: { device: 'iabp', action: 'start', ratio: 1 } });
  const cpp: number[] = [];
  let arrest = false;
  for (let t = 405; t <= 1500; t += 5) {
    r.e.advanceTo(t);
    const s = r.st();
    if (t >= 460 && t <= 700) cpp.push(s.hemo.circ.cor.cpp);
    if (s.hemo.circ.arrest || s.rhythm.opts.pulseless === true || ['agonal', 'asystole', 'vfCoarse', 'vfFine'].includes(s.rhythm.id)) arrest = true;
    if (t % 60 === 0) await new Promise((res) => setImmediate(res));
  }
  return { arrest, cpp: cpp.reduce((a, b) => a + b, 0) / cpp.length };
}

describe('FU-8 A20: the IABP helps the heart it supports', () => {
  it('HFrEF + recent MI 65 y, IABP 1:1 correctly timed for 18 min: no arrest, and the coronary perfusion pressure is at least the control arm\'s (research/20 DV-13d; before FU-8: arrest at +8.8 min, CoPP 46.1 vs 57.7)', async () => {
    const ctl = await hfmi(false);
    const bal = await hfmi(true);
    console.log(`fu8 A20 DV-13d: arrest control ${ctl.arrest}, IABP ${bal.arrest}; CoPP control ${ctl.cpp.toFixed(1)}, IABP ${bal.cpp.toFixed(1)}`);
    expect(ctl.arrest).toBe(false);
    expect(bal.arrest).toBe(false);
    expect(bal.cpp).toBeGreaterThanOrEqual(ctl.cpp);
  }, 120_000);
  it('MANUAL cardiogenic-shock rig (contractility 0.4, 85/55): the balloon deflation starts 20–150 ms before the next valve opening (tables §8.1; research/20 DV-M5, before FU-8 +272 ms)', async () => {
    const r = rig({ ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }] }, 'manual');
    r.e.advanceTo(30);
    for (const [variable, value] of [['contractility', 0.4], ['sbp', 85], ['dbp', 55]] as const) r.send({ type: 'setTarget', variable, value });
    r.e.advanceTo(400);
    r.send({ type: 'device', action: { device: 'iabp', action: 'start', ratio: 1 } });
    r.e.advanceTo(600);
    const opens: number[] = [];
    const pairs = new Map<number, number>();
    let open = false;
    for (let k = 1; k <= 7500; k++) {
      const t = 600 + k * 0.002;
      r.e.advanceTo(t);
      const s = r.st();
      const o = s.hemo.circOut.qAv > 1;
      if (o && !open) opens.push(t);
      open = o;
      if (s.hemo.iabp.inflateAt > 0) pairs.set(s.hemo.iabp.inflateAt, s.hemo.iabp.deflateAt);
      if (k % 500 === 0) await new Promise((res) => setImmediate(res));
    }
    const lags = [...pairs].map(([i, d]) => {
      const nx = opens.find((x) => x > i);
      return nx === undefined ? Number.NaN : 1000 * (d - nx);
    }).filter(Number.isFinite);
    const lag = lags.reduce((a, b) => a + b, 0) / lags.length;
    console.log(`fu8 A20 DV-M5: deflation ${lag.toFixed(0)} ms relative to the next opening (${lags.length} cycles)`);
    expect(lags.length).toBeGreaterThan(10);
    expect(lag).toBeGreaterThanOrEqual(-150);
    expect(lag).toBeLessThanOrEqual(-20);
  }, 120_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/fu8-iabp-volume.test.ts test/engine/fu8-iabp.test.ts` → FAIL: the volume test (net ≈ +30 mL; the
second has no `iabpSchedule`), DV-13d (arrest with the balloon, CoPP 43 < 55), DV-M5 (+283 ms).

- [x] **Step 2 — the balloon (devices.ts).**

In `packages/engine-core/src/l2/circ/devices.ts`, find:

```ts
  deflateAt: number;
}
```

Replace with:

```ts
  deflateAt: number;
  /** FU-8 (DV-13d): the previous cycle, while its deflation is still owed (−1 = none). */
  prevInflateAt?: number;
  prevDeflateAt?: number;
}
```

In `packages/engine-core/src/l2/circ/devices.ts`, find:

```ts
 */
export function iabpOnBeat(d: IabpState, beatT: number, rr: number, avCloseS: number): void {
```

Replace with:

```ts
 * (The R wave stands in for the valve opening; the hemo pipeline uses `iabpSchedule` with the valve events.)
 */
export function iabpOnBeat(d: IabpState, beatT: number, rr: number, avCloseS: number): void {
  iabpSchedule(d, beatT, rr, beatT - rr + avCloseS, beatT - rr);
}

/**
 * FU-8 (research/20 DV-13d, DV-M5; the tables' §8.1 pressure trigger): schedule the next balloon cycle at `now`, when a
 * beat has completed. `notchT` / `openT` are the absolute times of the LAST aortic-valve closure and opening; each is
 * carried forward by whole R–R intervals `rr` to the first one still to come: inflate at the next notch (+ offset),
 * deflate so the balloon is empty IABP_DEFLATE_LEAD_S before the next opening (+ offset). Before, the schedule was
 * built from the completed beat record (R + the record's own closure): in the MANUAL cardiogenic-shock rig, whose
 * ejection starts ≈ 400 ms after R and spills into the next record, every "correctly timed" balloon deflated ≈ 270 ms
 * AFTER the valve opened. A deflation still owed by the previous cycle is KEPT (brought forward to end before the new
 * inflation if it had not begun): overwriting it left up to 40 mL in the aorta, 7 of 63 cycles a minute in the HFrEF +
 * MI rig, and the patient arrested at +8.8 min. Every ratio-th beat.
 */
export function iabpSchedule(d: IabpState, now: number, rr: number, notchT: number, openT: number): void {
```

In `packages/engine-core/src/l2/circ/devices.ts`, find:

```ts
  d.inflateAt = beatT + avCloseS + d.inflateOffsetMs / 1000;
  d.deflateAt = beatT + rr - IABP_DEFLATE_LEAD_S - IABP_DEFLATE_S + d.deflateOffsetMs / 1000;
```

Replace with:

```ts
  const next = (x: number, t: number): number => (x > t ? x : x + rr * Math.ceil((t - x) / rr + 1e-9));
  const inflateAt = Math.max(now, next(notchT, now) + d.inflateOffsetMs / 1000);
  const deflateAt = next(openT, inflateAt) - IABP_DEFLATE_LEAD_S - IABP_DEFLATE_S + d.deflateOffsetMs / 1000;
  if (deflateAt < inflateAt + IABP_INFLATE_S) return; // no diastole to fill this cycle
  // an owed deflation is never later than just before the new inflation (and never earlier than now)
  const owe = (defl: number): number => (now >= defl ? defl : Math.max(now, Math.min(defl, inflateAt - IABP_DEFLATE_S)));
  if (d.inflateAt >= 0 && now >= d.inflateAt) {
    // the current balloon has inflated: it becomes the previous cycle while its deflation is owed
    const owed = now < d.deflateAt + IABP_DEFLATE_S;
    d.prevInflateAt = owed ? d.inflateAt : -1;
    d.prevDeflateAt = owed ? owe(d.deflateAt) : -1;
  } else if ((d.prevInflateAt ?? -1) >= 0) {
    d.prevDeflateAt = owe(d.prevDeflateAt as number); // a cycle that never inflated is dropped; an older owed one stays
  }
  d.inflateAt = inflateAt;
  d.deflateAt = deflateAt;
```

In `packages/engine-core/src/l2/circ/devices.ts`, find:

```ts
/** Balloon dV/dt (mL/s): + during inflation, − during deflation. */
```

Replace with:

```ts
/** Balloon dV/dt (mL/s): + during inflation, − during deflation (the owed deflation of the previous cycle included). */
```

In `packages/engine-core/src/l2/circ/devices.ts`, find:

```ts
  if (d.inflateAt < 0) return 0; // (a stopped pump still finishes the deflation it owes: volume is conserved)
  return d.volumeMl * (halfSine(t - d.inflateAt, IABP_INFLATE_S) - halfSine(t - d.deflateAt, IABP_DEFLATE_S));
```

Replace with:

```ts
  const prev = (d.prevInflateAt ?? -1) >= 0 ? halfSine(t - (d.prevInflateAt as number), IABP_INFLATE_S) - halfSine(t - (d.prevDeflateAt as number), IABP_DEFLATE_S) : 0;
  if (d.inflateAt < 0) return d.volumeMl * prev; // (a stopped pump still finishes the deflation it owes: volume is conserved)
  return d.volumeMl * (halfSine(t - d.inflateAt, IABP_INFLATE_S) - halfSine(t - d.deflateAt, IABP_DEFLATE_S) + prev);
```

- [x] **Step 3 — the pipeline: the valve's events, the schedule, the augmented diastole.** (The four state fields are
all added here; Tasks A21–A23 use `arrestKey`, `cprArt` and `av.qLung`.)

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
import { createIabp, createLvad, iabpFlow, iabpOnBeat, iabpStop, lvadFlow, lvadNumerics, type IabpState, type LvadState } from '../circ/devices.ts'; // Stage 7a
import { circCardiacOutput, circOnAtrial, circOnBeat, circVolume, createCircModel, stepCircModel, type CircBeat, type CircEnv, type CircModelState } from '../circ/model.ts'; // Stage 7a
```

Replace with:

```ts
import { createIabp, createLvad, iabpFlow, iabpSchedule, iabpStop, lvadFlow, lvadNumerics, type IabpState, type LvadState } from '../circ/devices.ts'; // Stage 7a (FU-8: iabpSchedule)
import { CO_TAU_S, circCardiacOutput, circOnAtrial, circOnBeat, circVolume, createCircModel, stepCircModel, type CircBeat, type CircEnv, type CircModelState } from '../circ/model.ts'; // Stage 7a (FU-8: CO_TAU_S)
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
  iabpAug: number; // Stage 7a: peak aortic pressure of the last assisted beat (diastolic augmentation), mmHg
  lvad: LvadState; // Stage 7a: continuous-flow LVAD (R28, tables §8.2)
```

Replace with:

```ts
  iabpAug: number; // Stage 7a: peak aortic pressure of the last assisted beat (diastolic augmentation), mmHg
  /**
   * FU-8 (research/20 DV-13d, DV-M5, DV-03): the aortic valve's own events at 2 ms — the last opening and closure (the
   * balloon's pressure trigger), the aortic pressure summed over the running diastole (closure → opening), the last
   * complete diastole's mean, and the unassisted (mean − minimum) offset — and the pulmonary blood flow (LPF τ CO_TAU_S,
   * mL/s: the gas exchange's flow during CPR).
   */
  av: { ej: boolean; openT: number; closeT: number; sum: number; n: number; mean: number; off: number; qLung: number };
  /** FU-8 (research/20 DV-01b): the rhythm key the arrest state last saw (a new pulseless rhythm enters the arrest state). */
  arrestKey: string;
  /** FU-8 (research/20 DV-23a): the CPR compression artefact this pipeline put on the ECG (cleared when CPR stops). */
  cprArt: boolean;
  lvad: LvadState; // Stage 7a: continuous-flow LVAD (R28, tables §8.2)
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
    circ, circOut: createOut(), radQ: new Array<number>(RAD_DELAY_STEPS + 1).fill(circ.s[0] as number), beatT: -1, stPatch: null, stApplied: 0, iabp: createIabp(), iabpAug: 0, lvad: createLvad(), pvOn: false,
```

Replace with:

```ts
    circ, circOut: createOut(), radQ: new Array<number>(RAD_DELAY_STEPS + 1).fill(circ.s[0] as number), beatT: -1, stPatch: null, stApplied: 0, iabp: createIabp(), iabpAug: 0, av: { ej: false, openT: -1, closeT: -1, sum: 0, n: 0, mean: NaN, off: NaN, qLung: circ.ref.co / 0.06 }, arrestKey: '', cprArt: false, lvad: createLvad(), pvOn: false,
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
  if (ejected) hs.lastEjT = cb.t + cb.avOpen;
  if (hs.iabp.on) {
```

Replace with:

```ts
  if (ejected) hs.lastEjT = cb.t + cb.avOpen;
  // FU-8 (DV-13d): the running diastole's mean aortic pressure (closure → now), else the last complete one
  const av = hs.av;
  const diaMean = !av.ej && av.n > 0 ? av.sum / av.n : av.mean;
  if (hs.iabp.on) {
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
    iabpOnBeat(hs.iabp, cb.t + cb.dur, cb.dur, cb.avClose > 0 ? cb.avClose : 0.3); // pressure trigger: the last notch
  }
```

Replace with:

```ts
    // FU-8 (DV-M5): the pressure trigger reads the valve's own last closure and opening, carried one R–R ahead (the
    // completed beat record's closure was the previous ejection's tail in a heart whose systole spills past the next R)
    const notch = av.closeT >= 0 ? av.closeT : cb.t + (cb.avClose > 0 ? cb.avClose : 0.3);
    const open = av.openT >= 0 ? av.openT : cb.t + Math.max(0, cb.avOpen);
    iabpSchedule(hs.iabp, t, cb.dur, notch, open);
    // FU-8 (DV-13d): under a balloon the beat's minimum is the post-deflation dip; the coronary step reads the
    // augmented diastole instead — its mean less the unassisted (mean − minimum) offset, so an unassisted beat reads
    // exactly its minimum
    if (Number.isFinite(diaMean) && Number.isFinite(av.off)) (cb as CircBeat & { aoDiaEff?: number }).aoDiaEff = diaMean - av.off;
  } else if (Number.isFinite(diaMean)) av.off = Number.isFinite(av.off) ? av.off + (diaMean - cb.aoDia - av.off) / 8 : diaMean - cb.aoDia;
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
        stepCircModel(hs.circ, tb, env, o);
        hs.radQ.push(o.pRad);
```

Replace with:

```ts
        stepCircModel(hs.circ, tb, env, o);
        // FU-8: the aortic valve's events and the running diastole (DV-13d/M5); the pulmonary flow (DV-03)
        const av = hs.av;
        const ej = o.qAv > 1;
        if (ej !== av.ej) {
          if (ej) {
            av.openT = tb;
            if (av.n > 0) av.mean = av.sum / av.n;
          } else av.closeT = tb;
          av.ej = ej;
          av.sum = 0;
          av.n = 0;
        }
        if (!ej && av.closeT >= 0) {
          av.sum += o.pAo;
          av.n++;
        }
        av.qLung += (o.qLungL + o.qLungR - av.qLung) * (H_S / CO_TAU_S);
        hs.radQ.push(o.pRad);
```

- [x] **Step 4 — the supply reads the augmented diastole (coronary.ts; chained on Task A10's lines).**

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
 */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number, o2Rel = 1, noBeat?: NoBeat, modeled = true): void {
```

Replace with:

```ts
 */
/** FU-8 (DV-13d): the beat's diastolic aortic pressure for the supply — the balloon-augmented value when one is set. */
const aoDiaOf = (b: CircBeat): number => (b as CircBeat & { aoDiaEff?: number }).aoDiaEff ?? b.aoDia;

export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number, o2Rel = 1, noBeat?: NoBeat, modeled = true): void {
```

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
    cpp = b.aoDia - b.lvedp - (modeled ? (b.pItEd ?? P_PL0) : 0); // FU-4 G1: aortic − ABSOLUTE LV end-diastolic pressure (PEEP, tension PTX raise it)
```

Replace with:

```ts
    // FU-8 (research/20 DV-13d): `aoDiaEff` (set by the hemo pipeline only while an IABP runs) is the augmented diastole
    // read on the minimum's scale — under a balloon the beat's minimum is the post-deflation dip, and CoPP FELL 57.7 →
    // 46.1 when the augmentation should raise it (a correctly timed 1:1 balloon arrested an HFrEF + MI heart at +8.8 min)
    cpp = aoDiaOf(b) - b.lvedp - (modeled ? (b.pItEd ?? P_PL0) : 0); // FU-4 G1: aortic − ABSOLUTE LV end-diastolic pressure (PEEP, tension PTX raise it)
```

In `packages/engine-core/src/l2/circ/coronary.ts`, find:

```ts
        const cp = x.aoDia - ed.lvedp - (ed.pItEd ?? P_PL0);
```

Replace with:

```ts
        const cp = aoDiaOf(x) - ed.lvedp - (ed.pItEd ?? P_PL0);
```

- [x] **Step 5 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ test/engine/fu8-iabp.test.ts test/engine/circ- test/engine/fu8-coronary.test.ts`
→ pass: `fu8 A20 DV-13d: arrest control false, IABP false; CoPP control 55.1, IABP 66.9`; `DV-M5: deflation -113 ms`
(18 cycles).
The existing `test/l2/circ/iabp.test.ts` (7a) is unchanged and green (`iabpOnBeat` keeps its signature, now through
`iabpSchedule` with the R wave as the opening). Re-run the DV cells into the gate note:
`cd ../research/20-audit-scripts && DV_OUT=<scratchpad>/fu-8-followups/dv.json PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts DV-13a DV-13b DV-13c DV-13d DV-14a DV-14c DV-14d DV-15a DV-M5`.

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/circ/devices.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/l2/circ/coronary.ts packages/engine-core/test/engine/fu8-iabp.test.ts packages/engine-core/test/l2/circ/fu8-iabp-volume.test.ts
git commit -m "fix(iabp): the augmented diastole feeds the coronaries, no deflation is cut short, the balloon is timed off the valve (FU-8 A20, research/20 V2)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A21: Every pulseless electrical rhythm carries the arrest state (research/20 DV-01b, gap V1; the DV amendment (b); orchestrator ruling OQ3)

**Files:** Modify `packages/engine-core/src/l2/hemo/pipeline.ts` (`emitSecond`: the arrest state for an organised pulseless rhythm the
engine did not declare). Create `packages/engine-core/test/engine/fu8-pulseless-arrest.test.ts`.

**Why:** only the engine's own declaration created `circ.arrest`, so a PEA made by a SHOCK (the defibrillator's `pea`
outcome: asystole, then a pulseless sinus) or set by the INSTRUCTOR never decayed (`peaDecayStep` returns at `if (!a)`)
and never regained a pulse (`roscStep` the same): 0 of 11 shock-made PEAs under 8 min of CPR at CoPP 27–28 with a
myocardial state of 1.00 (DV-01b). **FU-7 Task 12 depends on this** (its `arrestS` reads `circ.arrest.t`; its Task 0
Step 6c checks DV-01b). In MODELED, a new ORGANISED pulseless rhythm (PEA) with no arrest state now enters one
(`cause: 'pulseless'`, `t` = the PEA's onset; a different organised PEA takes over the onset rate), so FU-4's decay and
ROSC apply to it. **PEA only (ruling OQ3):** an instructor-selected VF (or asystole) does NOT gain the arrest state in
v1.0 — the prototyped "every pulseless state" version withdrew the humoral volume in the instructor's VF and made a sinus
selected after 4 min of VF with CPR re-arrest at +10 s (research/20 DV-22a), against DV's finding that the rhythm holds
after 3 min of CPR; that case is recorded for the calibration pass. For a shock-made PEA after VF, `arrest.t` is the PEA's
onset (the VF clock covers the VF, as FU-7's Task 12 already reads it). MANUAL keeps the instructor's rhythm (Q9; W21).

**Measured (DV-01b, 40 seeds):** PEA regains a pulse 0 % → 100 % (11 of 11), `peaArrestDeclared` false → true. No FU-4 row
moves (S13 24.9–28.0, the 10-min VF kIsch 0.89, DV-22a's EtCO2 jump — all as after Task A19).

- [x] **Step 1 — failing tests.**

Create `packages/engine-core/test/engine/fu8-pulseless-arrest.test.ts`:

```ts
// FU-8 Task A21 (research/20 DV-01b, gap V1): every pulseless state carries the arrest state (MODELED). Ventilated
// adult 40 y. Before FU-8 (origin/main 3feee6f): only the engine's own declaration created `circ.arrest`, so a PEA made
// by a shock or set by the instructor never decayed and never regained a pulse — 0 of 11 shock-made PEAs under 8 min of
// CPR at CoPP 27–28 with a myocardial state of 1.00.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { rhythm: { id: string; opts: { pulseless?: boolean; rateBpm?: number } }; hemo: { circ: { arrest: { t: number; cause: string } | null } } };
function rig(seed = 7) {
  const e = createEngine({ seed, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } as never });
  let n = 0;
  const send = (body: Record<string, unknown>) => e.dispatch({ id: `p${++n}`, issuedBy: 'test', ...body } as never);
  e.advanceTo(1);
  send({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } });
  return { e, send, st: () => (e as unknown as { st: St }).st };
}
const pulseless = (s: St) => s.rhythm.opts.pulseless === true || ['agonal', 'asystole', 'vfCoarse', 'vfFine'].includes(s.rhythm.id);
async function course(r: ReturnType<typeof rig>, t0: number, t1: number) {
  const seen: string[] = [];
  let arrestT: number | null = null;
  let pulseAt: number | null = null;
  let wasPea = false;
  for (let t = t0; t <= t1; t += 1) {
    r.e.advanceTo(t);
    const s = r.st();
    const k = `${s.rhythm.id}${s.rhythm.opts.pulseless ? '(pulseless)' : ''}`;
    if (seen.at(-1) !== k) seen.push(k);
    if (arrestT === null && s.hemo.circ.arrest) arrestT = s.hemo.circ.arrest.t;
    if (s.rhythm.opts.pulseless === true) wasPea = true;
    if (wasPea && pulseAt === null && !pulseless(s)) pulseAt = t;
    if (t % 60 === 0) await new Promise((res) => setImmediate(res));
  }
  return { seen, arrestT, pulseAt };
}

describe('FU-8 A21: every pulseless state carries the arrest state', () => {
  it('a PEA made by a SHOCK (seed 2: VF 60 s → 200 J → pulseless sinus) regains a pulse under CPR q 0.8 (research/20 DV-01b; before FU-8: none of 11 in 8 min)', async () => {
    const r = rig(2);
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    r.e.advanceTo(111);
    r.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 } });
    r.e.advanceTo(120);
    r.send({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
    r.e.advanceTo(140);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } });
    const c = await course(r, 141, 620);
    console.log(`fu8 A21 shock-PEA: ${c.seen.join(' → ')}; arrest state from ${c.arrestT}; pulse at ${c.pulseAt}`);
    expect(c.seen).toContain('sinus(pulseless)');
    expect(c.arrestT).not.toBeNull();
    expect(c.pulseAt).not.toBeNull();
  }, 120_000);
  it('an instructor PEA (sinus, pulseless, at 60 s) with CPR q 0.8 from 80 s regains a pulse within 5 min, and carries the arrest state from its onset', async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'sinus', opts: { pulseless: true } });
    r.e.advanceTo(80);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } });
    const c = await course(r, 81, 380);
    console.log(`fu8 A21 instructor PEA + CPR: ${c.seen.join(' → ')}; arrest state from ${c.arrestT}; pulse at ${c.pulseAt}`);
    expect(c.arrestT).not.toBeNull();
    expect(c.arrestT as number).toBeLessThanOrEqual(62);
    expect(c.pulseAt).not.toBeNull();
  }, 120_000);
  it('an untreated instructor PEA decays: slower, then idioventricular (agonal), within 15 min (FU-4 F5; before FU-8 it held its rate for ever)', async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'sinus', opts: { pulseless: true } });
    const c = await course(r, 61, 960);
    console.log(`fu8 A21 untreated instructor PEA: ${c.seen.join(' → ')}`);
    expect(c.seen.some((k) => k.startsWith('agonal') || k === 'asystole')).toBe(true);
  }, 120_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-pulseless-arrest.test.ts` → all three FAIL (no arrest state, no pulse, no decay).

- [x] **Step 2 — the arrest state.**

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
  c.ext.kIsch = c.cor.kIsch;
  if (ctx.requestRhythm) {
```

Replace with:

```ts
  c.ext.kIsch = c.cor.kIsch;
  // FU-8 (research/20 DV-01b, gap V1; MODELED; orchestrator ruling OQ3): every pulseless ELECTRICAL rhythm (PEA) carries
  // the arrest state. Only the engine's own declaration used to create it, so a PEA made by a shock (the defibrillator's
  // `pea` outcome) or set by the instructor never decayed and never regained a pulse (0 of 11 shock-PEAs under 8 min of
  // CPR at CoPP 27–28, myocardial state 1.00). A new organised pulseless rhythm with no arrest state enters one at its
  // onset (a different organised one takes over the onset rate). An instructor-selected VF does NOT gain it in v1.0 —
  // that moved FU-4's CPR rows (a sinus selected after 4 min of VF with CPR re-arrested at +10 s); MANUAL keeps the
  // instructor's rhythm (Q9).
  const rKey = `${ctx.rhythm.id}|${pulseless}`;
  if (ctx.l1.mode === 'modeled' && rKey !== hs.arrestKey) {
    hs.arrestKey = rKey;
    const id = ctx.rhythm.id;
    if (pulseless && !NO_BEAT_RHYTHMS.has(id)) {
      const r0 = ctx.rhythm.opts?.rateBpm ?? Math.round(Math.max(20, rampValue(ctx.hr, t)));
      if (!c.arrest) c.arrest = { cause: 'pulseless', t, from: id, roscS: 0, rate0: r0, rateNow: r0 };
      else if (c.arrest.from !== id) Object.assign(c.arrest, { from: id, roscS: 0, rate0: r0, rateNow: r0 });
    }
  }
  if (ctx.requestRhythm) {
```

- [x] **Step 3 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-pulseless-arrest.test.ts test/engine/clinical-suite.test.ts test/engine/circ- test/engine/fidelity-arrest.test.ts test/engine/arrest-etco2.test.ts`
→ pass: `fu8 A21 shock-PEA: sinus(pulseless) → sinus; arrest state from 124; pulse at 201`; `instructor PEA + CPR: …
pulse at 141`; `untreated instructor PEA: sinus(pulseless) → agonal(pulseless) → asystole`; S13 24.9–28.0 and
`VF + CPR 10 min: kIsch max 0.89` unchanged. Then DV-01b: `./run.sh cli.ts DV-01b DV-01c DV-22a` → `peaRegains true`,
`peaArrestDeclared true` (FU-7 Task 0 Step 6c's pass condition), DV-22a unmoved.

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/fu8-pulseless-arrest.test.ts
git commit -m "fix(arrest): every pulseless electrical rhythm carries the arrest state — a shock or instructor PEA decays and can regain a pulse (FU-8 A21, research/20 V1)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A22: EtCO2 under CPR follows the blood the compressions move through the lungs (research/20 DV-03, DV-04a, gap V4; V.1’s "CPR flow scaling"; the DV amendment (d))

**Files:** Modify `packages/engine-core/src/l2/gas/coupling.ts` (**E-FU8-11**: `cardiacOutput` during CPR; the interim fit removed),
`packages/engine-core/test/engine/arrest-etco2.test.ts` and `packages/engine-core/test/engine/cpr-etco2.test.ts` (**E-FU8-10**). Create `packages/engine-core/test/engine/fu8-cpr.test.ts`.
The pulmonary flow `av.qLung` (LPF τ CO_TAU_S of the two lung beds' flow, 2 ms) came with Task A20.

**Why:** during CPR the gas exchange took an INTERIM quality fit (`SV_REF·CPR_SV_FRAC·quality^1.9·rate`,
`gas/coupling.ts:38–41`, documented "until 3.1 re-measures CPR EtCO2 against the emergent circulation CO"), blind to the
circulation: a bled-out patient (CoPP 3.1) read EtCO2 17.4 and a tamponade 15.9 — the same as VF with a full circulation.
Now the gas exchange reads the circulation's PULMONARY blood flow during CPR, so EtCO2 follows the blood the compressions
move through the lungs, and the ventilation (Stage 3) as before. It is also the patient's size (V.1's Decision 25 request
"CPR flow should scale with the patient" — answered: V.1's CPR guard can use the patient's own reference, "Handed to").

**Measured (before → after):** DV-03 bled-out EtCO2 17.4 → **7.2** (< 10); DV-04a tamponade 15.9 → 12.8 (direction band
< 10: TS, recorded); DV-02b VF CPR q 1 18.8 → 16.8 (10–20); arrest-etco2 "≥ 17 at +2 min of CPR" 16.4 → 18.0 (the pin
FLIPS). **R39-2's quality map is MISSED** (the MANUAL default rig: quality 0.5 / 0.8 / 1.0 / 1.2 → EtCO2 20.4 / 25.2 /
26.6 / 26.6 against 8–15 / 17–23 / 22–28 / 26–32; before 13.2 / 20.3 / 24.8 / 27.4): the circulation's CPR flow is
FILLING-limited above quality 0.8 since Task A19 (1.08 / 1.64 / 1.80 / 1.75 L/min; the fit gave 0.41 / 1.01 / 1.54 /
1.85), and "+10 breaths/min" lowers EtCO2 by 4.8 (band −2 to −4.5). R45: both rows become `it.fails` with these numbers;
DV-02c's "poor CPR halves EtCO2" moves 0.43 → 0.83 (TS). **Orchestrator ruling OQ2: A22 lands**; the cause goes to the
calibration queue as the named item **"CPR flow vs compression quality"**, flagged for Ali (W22) because EtCO2 as CPR-quality
feedback is core ALS teaching.

**Addendum (V.1 gate note §10 item 3; V.1 Decision 25): the CPR flow scales with the patient.** The interim fit was
ADULT-absolute (`SV_REF_ML × CPR_SV_FRAC × quality^1.9 × rate`): a 16 kg child under CPR q 0.8 got 1.01 L/min = 63 mL/kg/min
(coRatio 0.84, EtCO2 38.6) — the adult's flow. The circulation's pulmonary flow is the child's own: 0.30 L/min = 19
mL/kg/min (coRatio 0.25, EtCO2 22.0; the 70 kg adult 17 mL/kg/min). The last test of `fu8-cpr` asserts 10–30 mL/kg/min
(origin/main: 63). V.1's CPR guard in `l2/resp/pipeline.ts` (`h.cpr.active ? CO_REF_LPM : coRefLpm(rs.pat)`, adult
reference during CPR, measured 0.293 / 0.293 at its gate) was written for the adult-absolute flow: once V.1 and A22 are
both on main it divides the child's own CPR flow by the ADULT reference (coRatio ≈ 0.06). The guard's line is V.1's and
FU-6's anchor (FU-6 T2), so FU-8 does not edit it: **handed to FU-6** (make it `coRefLpm(rs.pat)` for both cases when it
edits that line), and Task G records the child's CPR coRatio on the merged tree.

- [x] **Step 1 — failing tests.**

Create `packages/engine-core/test/engine/fu8-cpr.test.ts`:

```ts
// FU-8 Task A22 (research/20 DV-02b, DV-03; gap V4): EtCO2 under CPR follows the circulation. MODELED, seed 7,
// ventilated (ETT + VCV 12 × 600, PEEP 5, FiO2 0.5). Before FU-8 (origin/main 3feee6f): EtCO2 under CPR came from a
// quality fit blind to the circulation — a bled-out patient at CoPP 3.1 read 17.4, as VF with a full circulation.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';

type St = { resp: { etco2: number }; organs: { brain: { cbfRel: number } }; mods: { artefact: { cpr: { rateCpm: number; depth: number } | null } } };
function rig() {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } as never });
  let n = 0;
  const send = (body: Record<string, unknown>) => e.dispatch({ id: `c${++n}`, issuedBy: 'test', ...body } as never);
  e.advanceTo(1);
  send({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } });
  return { e, send, st: () => (e as unknown as { st: St }).st };
}
async function sample(r: ReturnType<typeof rig>, t0: number, t1: number, f: (s: St) => number): Promise<number> {
  let sum = 0;
  let n = 0;
  for (let t = t0; t <= t1; t += 5) {
    r.e.advanceTo(t);
    sum += f(r.st());
    n++;
    if (t % 60 === 0) await new Promise((res) => setImmediate(res));
  }
  return sum / n;
}
let vfRun: Promise<{ etco2: number; cbf: number }> | undefined;
const vfCpr = (): Promise<{ etco2: number; cbf: number }> =>
  (vfRun ??= (async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    r.e.advanceTo(120);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } });
    r.e.advanceTo(175);
    let et = 0;
    let cbf = 0;
    let n = 0;
    for (let t = 180; t <= 600; t += 5) {
      r.e.advanceTo(t);
      et += r.st().resp.etco2;
      cbf += r.st().organs.brain.cbfRel;
      n++;
      if (t % 60 === 0) await new Promise((res) => setImmediate(res));
    }
    return { etco2: et / n, cbf: cbf / n };
  })());

describe('FU-8 A22: EtCO2 under CPR follows the blood the compressions move through the lungs', () => {
  it('VF + CPR q 1, minutes 2–8: EtCO2 10–20 mmHg (research/20 DV-02b; Sanders 1989: 15 ± 4 in survivors)', async () => {
    const v = await vfCpr();
    console.log(`fu8 A22: VF CPR EtCO2 ${v.etco2.toFixed(1)}`);
    expect(v.etco2).toBeGreaterThanOrEqual(10);
    expect(v.etco2).toBeLessThanOrEqual(20);
  }, 120_000);
  it('complete exsanguination (3 L / 10 min) → PEA → CPR q 0.8 alone from 720 s: EtCO2 < 10 mmHg (research/20 DV-03: 17.4 before FU-8 at CoPP 3.1; AHA 2020: < 10 = no effective output)', async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'applyEvent', event: { kind: 'bleed', volumeMl: 3000, overS: 600 } });
    r.e.advanceTo(720);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } });
    const et = await sample(r, 780, 1320, (s) => s.resp.etco2);
    console.log(`fu8 A22: bled-out CPR EtCO2 ${et.toFixed(1)}`);
    expect(et).toBeLessThan(10);
  }, 120_000);
  it('a 16 kg child, VF + CPR q 0.8: the gas exchange\'s CPR flow scales with the patient — 10–30 mL/kg/min (origin/main: an adult-absolute 1.01 L/min = 63 mL/kg/min, coRatio 0.84, EtCO2 38.6; V.1 Decision 25)', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 5, sex: 'M', weightKg: 16, heightCm: 108, sensors: { co2: 'on' } } as never });
    let n = 0;
    const ev = (event: Record<string, unknown>) => e.dispatch({ id: `k${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
    e.advanceTo(1);
    ev({ kind: 'airwayDevice', device: 'ett' });
    ev({ kind: 'ventilation', source: 'ventilator', rr: 10, vtMl: 112, peep: 5, fio2: 1 });
    e.advanceTo(60);
    e.dispatch({ id: 'vf', issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse' } as never);
    ev({ kind: 'cpr', active: true, rate: 110, quality: 0.8 });
    let q = 0;
    let k = 0;
    for (let t = 120; t <= 360; t += 5) {
      e.advanceTo(t);
      q += cardiacOutput((e as unknown as { st: { hemo: HemoState } }).st.hemo, t);
      k++;
      if (t % 60 === 0) await new Promise((r) => setImmediate(r));
    }
    const perKg = ((q / k) * 1000) / 16;
    console.log(`fu8 A22: child CPR flow ${(q / k).toFixed(2)} L/min = ${perKg.toFixed(0)} mL/kg/min`);
    expect(perKg).toBeGreaterThanOrEqual(10);
    expect(perKg).toBeLessThanOrEqual(30);
  }, 120_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-cpr.test.ts` → the bled-out test FAILS (EtCO2 17.4); VF CPR passes.

- [x] **Step 2 — the gas exchange reads the circulation.**

In `packages/engine-core/src/l2/gas/coupling.ts`, find:

```ts
import { l1Target, type L1State } from '../../l1/state.ts';
import { CPR_SV_FRAC, SV_REF_ML } from '../hemo/params.ts';
import { circCardiacOutput } from '../circ/model.ts'; // Stage 7a
```

Replace with:

```ts
import { l1Target, type L1State } from '../../l1/state.ts';
import { circCardiacOutput } from '../circ/model.ts'; // Stage 7a
```

In `packages/engine-core/src/l2/gas/coupling.ts`, find:

```ts
 * Net forward flow of CPR vs compression quality, as the gas exchange sees it (R39-2, research 09 §2) [ENG, fitted]:
 * below guideline quality flow falls off steeply (quality^1.9), above it the gain is linear. With the low-flow
 * compression this gives EtCO2 ≈ 12 / 20 / 25 / 29 mmHg at quality 0.5 / 0.8 / 1.0 / 1.2 (10 breaths/min, minutes
 * 1–10). The pressure waveforms (Stage 2) keep scaling linearly with quality.
 */
export const CPR_FLOW_EXP = 1.9;
export const cprFlowFactor = (q: number): number => (q < 1 ? Math.max(0, q) ** CPR_FLOW_EXP : q);

/**
 * CO (L/min) for the gas model. Stage 7a: from the circulation (beats and CPR compressions eject through it).
 * INTERIM during CPR: the gas exchange keeps Stage 3.1's R39-2 fit (flow ∝ quality^1.9), which the EtCO2 acceptance
 * (12 / 20 / 25 / 29 mmHg) was calibrated on, until 3.1 re-measures CPR EtCO2 against the emergent circulation CO
 * (R45 request; circulation CO 2.1 L/min at quality 0.8, 2.5 at 1.0).
```

Replace with:

```ts
 * CO (L/min) for the gas model. Stage 7a: from the circulation (beats and CPR compressions eject through it).
 * FU-8 (research/20 DV-03, DV-04a, gap V4; V.1's "CPR flow scaling" request): during CPR the gas exchange reads the
 * circulation's PULMONARY blood flow (the hemo pipeline's 2 ms lung-bed flow, LPF τ CO_TAU_S), so EtCO2 follows the
 * blood the compressions actually move through the lungs — and the patient's size. Before, it took Stage 3.1's interim
 * quality fit (SV_REF·CPR_SV_FRAC·quality^1.9·rate, `cprFlowFactor`), blind to the circulation: a bled-out patient
 * (CoPP 3.1) read EtCO2 17.4 and a tamponade 15.9, the same as VF with a full circulation.
```

In `packages/engine-core/src/l2/gas/coupling.ts`, find:

```ts
  if (hs.cpr.active) return (SV_REF_ML * CPR_SV_FRAC * cprFlowFactor(hs.cpr.quality) * hs.cpr.rate) / 1000;
```

Replace with:

```ts
  if (hs.cpr.active) return Math.max(0, hs.av.qLung) * 0.06;
```

- [x] **Step 3 — the declared rows (E-FU8-10).** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/arrest-etco2.test.ts test/engine/cpr-etco2.test.ts` →
the arrest-etco2 pin reports "Expect test to fail" (18.0) and the two R39-2 rows fail with the numbers above. Then:

In `packages/engine-core/test/engine/arrest-etco2.test.ts`, find:

```ts
  // R45: the plan's "17–23 BY +2 min of CPR" is missed on this rig — measured 16.5 at τ 70 s (a dip, not the τ: 16.1 at
  // +2.5 min with τ 60, 16.9 mean at τ 80). Kept as a record.
  it.fails('VF with CPR q 0.8 from +30 s: EtCO2 ≥ 17 already at +2 min of CPR (measured 16.5)', async () => {
```

Replace with:

```ts
  // R45: the plan's "17–23 BY +2 min of CPR" was missed on this rig — measured 16.5 at τ 70 s (a dip, not the τ: 16.1 at
  // +2.5 min with τ 60, 16.9 mean at τ 80). FU-8 (E-FU8-10): flipped — the gas exchange reads the circulation's CPR
  // pulmonary flow (A22), 18.0 at +2 min
  it('VF with CPR q 0.8 from +30 s: EtCO2 ≥ 17 already at +2 min of CPR (measured 16.5 before FU-8, 18.0 after)', async () => {
```

In `packages/engine-core/test/engine/cpr-etco2.test.ts`, find:

```ts
  it('quality map at 10 breaths/min: 0.5 → 12 (8–15), default 0.8 → 20 (17–23), 1.0 → 25 (22–28), 1.2 mechanical-grade → 29 (26–32)', async () => {
```

Replace with:

```ts
  // FU-8 (E-FU8-10, A22; research/20 DV-03): the gas exchange now reads the circulation's CPR pulmonary flow, not the
  // interim quality^1.9 fit this map was calibrated on. The circulation's CPR flow is filling-limited above quality 0.8
  // (0.87 / 1.08 / 1.64 / 1.80 / 1.75 L/min at 0.4 / 0.5 / 0.8 / 1.0 / 1.2), so the map is missed: R45, an it.fails with
  // its numbers; the CPR flow's quality dependence is the R44 calibration pass's (plan "Waiting on Ali" W22)
  it.fails('quality map at 10 breaths/min: 0.5 → 12 (8–15), default 0.8 → 20 (17–23), 1.0 → 25 (22–28), 1.2 mechanical-grade → 29 (26–32) — measured 20.4 / 25.2 / 26.6 / 26.6 after FU-8', async () => {
```

In `packages/engine-core/test/engine/cpr-etco2.test.ts`, find:

```ts
  it('ventilation: +10 breaths/min lowers EtCO2 by ≈ 3 mmHg (−2 to −4.5) at the learner default', async () => {
```

Replace with:

```ts
  // FU-8 (E-FU8-10): at the circulation's CPR flow the same +10 breaths/min lower EtCO2 by 4.8 (R45: it.fails)
  it.fails('ventilation: +10 breaths/min lowers EtCO2 by ≈ 3 mmHg (−2 to −4.5) at the learner default — measured −4.8 after FU-8', async () => {
```

- [x] **Step 4 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-cpr.test.ts test/engine/arrest-etco2.test.ts test/engine/cpr-etco2.test.ts test/engine/clinical-suite.test.ts test/engine/resp- test/engine/circ-`
→ pass: `fu8 A22: VF CPR EtCO2 16.8`, `bled-out CPR EtCO2 7.2`; `child CPR flow 0.30 L/min = 19 mL/kg/min`. FU-6's two tests that import `cardiacOutput`
(`blood-anaemia-co`, the RS suite) call it outside CPR, where it is unchanged. DV cells: `./run.sh cli.ts DV-02b DV-02c DV-03 DV-04a`.

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/gas/coupling.ts packages/engine-core/test/engine/fu8-cpr.test.ts packages/engine-core/test/engine/arrest-etco2.test.ts packages/engine-core/test/engine/cpr-etco2.test.ts
git commit -m "fix(gas): EtCO2 under CPR from the circulation’s pulmonary blood flow, not a quality fit (FU-8 A22, research/20 V4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A23: Starting CPR puts the compression artefact on the ECG (research/20 DV-23a, gap V7; the DV amendment (h))

**Files:** Modify `packages/engine-core/src/l2/hemo/pipeline.ts` (the `stPatch` type widened to a `ModifiersPatch`; the `cpr` event sets and
clears `artefact.cpr`; the ST line merges). Create `packages/engine-core/test/engine/fu8-cpr-artefact.test.ts`. `engine.ts` is NOT edited:
it already merges `hemo.stPatch` into the committed modifiers each tick (the ST hook, R23), so one seam carries both.

**Why:** the `cpr` event drove the circulation, pleth, NIBP and capnogram but not the ECG; the artefact was a separate
modifier (`artefact.cpr`, brief §4.1: rate 100–120, depth 0–1 → 0.2–2 mV) that nothing coupled to the event — one act,
two commands, and a scenario that starts CPR showed a clean VF trace (research/12 DV-23; audit 10). Now the compressions
set it at their rate with depth = quality (capped at 1) and clear it when they stop — only an artefact this pipeline set;
an instructor's own `artefact.cpr` is left alone.

- [x] **Step 1 — failing test.**

Create `packages/engine-core/test/engine/fu8-cpr-artefact.test.ts`:

```ts
// FU-8 Task A23 (research/20 DV-23a; gap V7): one clinical act, one command — the compressions put their artefact on
// the ECG. Before FU-8 (origin/main 3feee6f) the `cpr` event drove the circulation, pleth, NIBP and capnogram but not
// the ECG: the artefact was a separate modifier (`artefact.cpr`) nothing coupled to the event.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { mods: { artefact: { cpr: { rateCpm: number; depth: number } | null } } };

describe('FU-8 A23: the compressions put their artefact on the ECG', () => {
  it('CPR on → artefact.cpr at the compression rate, depth = quality; CPR off → cleared (research/20 DV-23a: one act, one command)', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } as never });
    let n = 0;
    const send = (body: Record<string, unknown>) => e.dispatch({ id: `a${++n}`, issuedBy: 'test', ...body } as never);
    const st = () => (e as unknown as { st: St }).st;
    e.advanceTo(60);
    send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    e.advanceTo(90);
    expect(st().mods.artefact.cpr).toBeNull();
    send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 0.8 } });
    e.advanceTo(95);
    expect(st().mods.artefact.cpr).toEqual({ rateCpm: 110, depth: 0.8 });
    send({ type: 'applyEvent', event: { kind: 'cpr', active: false } });
    e.advanceTo(100);
    expect(st().mods.artefact.cpr).toBeNull();
  }, 60_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-cpr-artefact.test.ts` → FAILS (`artefact.cpr` stays null under CPR).

- [x] **Step 2 — the coupling.**

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
import type { ChannelId, Command, EngineEvent, Measured, NumericId, PatientProfile, Ramp, RhythmId, RhythmOpts, StateVar } from '../../types.ts';
import { addPlethPulse, createPlethState, plethAt, plethDelayS, prunePleth, setPlethSensor, type PlethState } from '../pleth/pleth.ts';
```

Replace with:

```ts
import type { ChannelId, Command, EngineEvent, Measured, NumericId, PatientProfile, Ramp, RhythmId, RhythmOpts, StateVar } from '../../types.ts';
import type { ModifiersPatch } from '../ecg/api-types.ts'; // FU-8 (DV-23a): the CPR artefact through the ST seam
import { addPlethPulse, createPlethState, plethAt, plethDelayS, prunePleth, setPlethSensor, type PlethState } from '../pleth/pleth.ts';
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
  stPatch: { ischaemicDepressionMv: number } | null; // Stage 7a: ST modifier patch for the engine to apply (R23)
```

Replace with:

```ts
  stPatch: ModifiersPatch | null; // Stage 7a: ST modifier patch for the engine to apply (R23); FU-8: + the CPR artefact
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
    hs.stPatch = { ischaemicDepressionMv: nxt };
```

Replace with:

```ts
    hs.stPatch = { ...hs.stPatch, ischaemicDepressionMv: nxt };
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
          hs.cpr.active = false;
        }
        return true;
      }
```

Replace with:

```ts
          hs.cpr.active = false;
        }
        // FU-8 (research/20 DV-23a, gap V7): one clinical act, one command — the compressions put their artefact on the
        // ECG at the compression rate, deeper with the quality (brief §4.1: depth 0–1 → 0.2–2 mV), and take it off when
        // they stop (only an artefact this pipeline set: an instructor's own `artefact.cpr` is left alone)
        if (hs.cpr.active) {
          hs.stPatch = { ...hs.stPatch, artefact: { cpr: { rateCpm: hs.cpr.rate, depth: Math.min(1, hs.cpr.quality) } } };
          hs.cprArt = true;
        } else if (hs.cprArt) {
          hs.stPatch = { ...hs.stPatch, artefact: { cpr: null } };
          hs.cprArt = false;
        }
        return true;
      }
```

- [x] **Step 3 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-cpr-artefact.test.ts test/l2/ecg test/engine/hemo- test/engine/clinical-suite.test.ts`
→ pass. `npx -y pnpm@9.15.9 run audit:monitor` on any CPR scenario shows the compression waves on lead II at 110/min.

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/fu8-cpr-artefact.test.ts
git commit -m "feat(cpr): the compressions put their artefact on the ECG — one act, one command (FU-8 A23, research/20 V7)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A24: Cerebral blood flow under CPR — recorded against the consensus (research/20 DV-02a, gap V8; the DV amendment (e))

**Files:** Create `packages/engine-core/test/engine/fu8-cpr-brain.test.ts`. No source change.

**Why:** research/20 measured 0.71 of normal cerebral flow under good CPR (Meaney 2013 consensus: 30–40 % [VERIFY];
research/12's band 0.2–0.45): the CPR arterial pressure (MAP ≈ 55) sat on the autoregulation plateau. The smallest
mechanism research/20 proposed (autoregulation lost in a pulseless state) was measured unnecessary for the first step:
with Task A19 (compressions act on real volumes) CBF is **0.45** (CPR MAP ≈ 46). It does not reach the consensus, and no
further mechanism is added in v1.0 (the ruling: toward the consensus, or `it.fails` with its number): the fall is
asserted (< 0.5) and the consensus is an `it.fails` at 0.45 — a model limitation for the calibration pass. (The
prototyped arrest state for an instructor's VF gave 0.23; ruling OQ3 keeps VF out of it.)

Create `packages/engine-core/test/engine/fu8-cpr-brain.test.ts`:

```ts
// FU-8 Task A24 (research/20 DV-02a; gap V8): cerebral blood flow under CPR. MODELED, seed 7, ventilated (ETT + VCV
// 12 × 600, PEEP 5, FiO2 0.5). Before FU-8 (origin/main 3feee6f): 0.71 of normal under good CPR (consensus 30–40 %).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

type St = { resp: { etco2: number }; organs: { brain: { cbfRel: number } }; mods: { artefact: { cpr: { rateCpm: number; depth: number } | null } } };
function rig() {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } } as never });
  let n = 0;
  const send = (body: Record<string, unknown>) => e.dispatch({ id: `c${++n}`, issuedBy: 'test', ...body } as never);
  e.advanceTo(1);
  send({ type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } });
  send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 } });
  return { e, send, st: () => (e as unknown as { st: St }).st };
}
async function sample(r: ReturnType<typeof rig>, t0: number, t1: number, f: (s: St) => number): Promise<number> {
  let sum = 0;
  let n = 0;
  for (let t = t0; t <= t1; t += 5) {
    r.e.advanceTo(t);
    sum += f(r.st());
    n++;
    if (t % 60 === 0) await new Promise((res) => setImmediate(res));
  }
  return sum / n;
}
let vfRun: Promise<{ etco2: number; cbf: number }> | undefined;
const vfCpr = (): Promise<{ etco2: number; cbf: number }> =>
  (vfRun ??= (async () => {
    const r = rig();
    r.e.advanceTo(60);
    r.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    r.e.advanceTo(120);
    r.send({ type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } });
    r.e.advanceTo(175);
    let et = 0;
    let cbf = 0;
    let n = 0;
    for (let t = 180; t <= 600; t += 5) {
      r.e.advanceTo(t);
      et += r.st().resp.etco2;
      cbf += r.st().organs.brain.cbfRel;
      n++;
      if (t % 60 === 0) await new Promise((res) => setImmediate(res));
    }
    return { etco2: et / n, cbf: cbf / n };
  })());

describe('FU-8 A24: cerebral blood flow under CPR (research/20 DV-02a, gap V8)', () => {
  it('VF + CPR q 1, minutes 2–8: CBF below 0.5 of normal (0.71 before FU-8: a CPR MAP of 55 on the autoregulation plateau)', async () => {
    const v = await vfCpr();
    console.log(`fu8 A24: VF CPR CBF ${v.cbf.toFixed(3)}`);
    expect(v.cbf).toBeLessThan(0.5);
  }, 120_000);
  it.fails('VF + CPR q 1: CBF 0.30–0.40 of normal (Meaney 2013 consensus [VERIFY]; research/20 DV-02a band 0.2–0.45) — measured 0.45 after FU-8 (a model limitation for the calibration pass)', async () => {
    const v = await vfCpr();
    expect(v.cbf).toBeGreaterThanOrEqual(0.3);
    expect(v.cbf).toBeLessThanOrEqual(0.4);
  }, 120_000);
});
```

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-cpr-brain.test.ts` → 2 passed (`fu8 A24: VF CPR CBF 0.450`; the `it.fails` holds).
Before Task A19 the first test fails (0.71).

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/test/engine/fu8-cpr-brain.test.ts
git commit -m "test(brain): cerebral blood flow under CPR recorded against the consensus (FU-8 A24, research/20 V8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A25: The HR numeric in an agonal rhythm — GATED on Ali’s W18 answer (orchestrator Q5; R50 review Q5) — UNPROTOTYPED

**Executes only with Ali's answer to W18; the Part A PR does not wait for it** (if it arrives after the Part A gate, this
task is a small follow-up commit on the same branch before merge, or the first commit of Part B's PR).

**Files (expected):** `packages/engine-core/src/l3/hr.ts` (FU-5's HR measurement; no in-flight plan edits it), a new
`packages/engine-core/test/engine/fu8-agonal-hr.test.ts`.

**What is measured (MANUAL agonal, 270 s, seed 7; the rig of `fu8-agonal-qrs`):** origin/main: HR invalid in 125 of 269
samples, 56 valid↔invalid flips, readings up to 18/min. After Tasks A2 + A6: 34 invalid, 16 flips, readings ≤ 15 — the
numeric still alternates "0" (valid) and "-?-" every 3–7 s under a standing `***ASYSTOLE` (`hrMeasure` returns 0 when
no R arrives within the asystole threshold, and invalid when the R–R history is too short to average).

**The two behaviours Ali chooses between (W18):** (a) the IntelliVue shows the averaged agonal rate while complexes
arrive, and "0"/asystole only after its asystole threshold (4 s) without one; (b) "-?-" (invalid) whenever fewer than
N R–R intervals fit the averaging window. Step 1 writes the test for the chosen behaviour (it fails on the A2/A6 tree
with 16 flips); Step 2 changes `hrMeasure`'s rule for the empty/short history only (the regular-rhythm averaging is
unchanged — the FU-1/FU-5 HR tests stay green); Step 3 verifies `test/l3/hr*.test.ts`, `fidelity-arrest`,
`fidelity-lowflow`, `fu8-agonal-qrs` and `audit:monitor A2-ali-b7`. R45: if the chosen behaviour cannot be met, the
test becomes `it.fails` with its number.

### Task A26: The LVAD depends on filling (research/20 DV-17, DV-16d, gap V9; the DV amendment (g)) — UNPROTOTYPED

**Files (expected):** `packages/engine-core/src/l2/circ/devices.ts` (`lvadFlow` inflow limitation, `lvadNumerics` PI), `packages/engine-core/src/l2/hemo/pipeline.ts`
(the `qVad` callback passes the LV's size; a consumer for `suction`), a new `packages/engine-core/test/engine/fu8-lvad.test.ts`.
Executes after Task A20 (same files, other lines). Not prototyped by this plan — the executor measures first and applies
the R45 procedure.

**Measured (research/20 on 3feee6f; re-measured on the Part A prototype):** HFrEF 60 y, 5 400 rpm: flow 4.01 L/min, power
3.61 W (HM3 4–5), pulsatility index 6.77 (HM3 3–4); a 1.5 L bleed over 5 min lowers flow only 3.96 → 3.70 L/min and never
reaches suction (`suctionAtS` null) — the dilated HFrEF ventricle stays far above `LVAD_SUCTION_ML` 40 mL and the HQ term
(flow ∝ ΔP) RISES as MAP falls; the `suction` flag has no consumer.

**Mechanism (research/20 V9's smallest):** (1) inflow limited by LV volume — a smooth factor as the LV volume approaches
a collapse volume scaled to the LV's own size (its unstressed volume + a cannula margin, not an absolute 40 mL: a dilated
LV sucks at a larger volume); (2) a consumer for the suction event: a PI spike and a ventricular-ectopy request through
the Stage 5 hook (one `requestRhythm` path, E-FU3-8) — if the hook needs a Stage 5 file, that part is handed to 7h;
(3) the PI as HM3 defines it ((max − min)/mean × 10 of the pump flow — the formula is already HM3's; the value 6.8 comes
from the native LV's pulsatility, so it is recorded, not refitted). **Acceptance (research/20 §7 "7a devices"):** DV-17
flowMin ≤ 3.0 L/min and a suction event on the 1.5 L bleed; DV-16d PI 3–5 [`it.fails` with its number if the native
pulsatility keeps it higher]; DV-18a/18b directions unchanged or improved; the fast set, `test/l2/circ/lvad.test.ts` and
the clinical suite green.

### Task A27: The MANUAL post-ROSC pressure ramp is visible (research/20 DV-M3, gap V12; the DV amendment (i)) — UNPROTOTYPED

**Files (expected):** `packages/engine-core/src/l2/hemo/pipeline.ts` (`trackCircBeat` / the MANUAL pressure tracker's re-arm), a new
`packages/engine-core/test/engine/fu8-manual-rosc.test.ts`. `l3/device-layer.ts` is NOT edited (FU-7 Task 12's file, E-FU7-6): its ramp
(`device-layer.ts:270–276`, 50 % → 100 % of the targets over 30–120 s) is right; the circulation does not follow it.
Not prototyped — the executor measures first; R45.

**Measured (research/20 DV-M3, MANUAL, VF 60 s → 200 J pre-selected to sinus):** SBP 90 % of baseline 10 s after the
shock (brief §6.5: 50 % → 100 % over 30–120 s), 122 at 3 min against 135. Cause: the set-and-hold tracker resumes from the
pre-arrest contractility and resistance, and acts only on `ref` beats (two steady beats; SV within 25 %) averaged over its
TRACK_BEATS history, which still holds the pre-arrest beats — so the first post-ROSC beats eject at ≈ 90 %.

**Mechanism:** when the first ejected beat follows a pulseless gap (≥ 3 s without a beat) in MANUAL, the pressure
tracker's history is cleared and its first correction is applied in full (α = 1 once), so the heart restarts at the
ramp's start and then follows it. **Acceptance:** DV-M3 fraction at 10 s 0.4–0.8 (direction-only while Q9 is open) and
the ramp's end within 2 mmHg of the target; every MANUAL test (`test/engine/*manual*`, `clinical-suite -t MANUAL`,
`hemo-acceptance`) green.

### Task A28: The drug model’s resting-output reference is in L/min for every size (V.1 gate note §10 item 2; FU-4 G10 × F4)

**Files:** Modify `packages/engine-core/src/engine.ts` (`pkCtx`'s `coRefLpm` = 7c's `co0` as is; the two unused imports), `packages/engine-core/src/l2/blood/pipeline.ts`
(7c's `rest.coLp` STARTS in L/min; the unused import), `packages/engine-core/test/engine/neuro-engine.test.ts` (**E-FU8-12**: a pin flips). Create `packages/engine-core/test/engine/fu8-propofol-ref.test.ts`.

**File overlap (declared; anchors checked):** FU-7 edits `engine.ts` (E-FU7-7, one-line additions) and `blood/pipeline.ts`;
FU-6 edits `blood/pipeline.ts` (E-FU6-4) and `engine.ts`; FU-9 edits both. None of their find blocks contains either line
(parsed and counted on the Part A tree: FU-6 5, FU-7 12, FU-9 8 anchors in Part A files, 0 broken), so this stays in
Part A. V.1 (merging) does not edit either file.

**Why (V.1's request, "needs one owner and one fix"):** `engine.ts:485` (FU-4 G10) converted 7c's `co0` with `× CO_REF_LPM /
(CI_LPM_PER_KG × effKg)`, which assumes 7c's pre-F4 gas units. Since FU-4 F4 the gas model's `coRatio × CI × effKg` IS the
circuit's CO, so `co0` low-passes toward the TRUE L/min — but it still STARTED in gas units (`ref.co / CO_REF_LPM × CI ×
effKg`). The two errors cancel for a drug given at t = 0 (co0 latched at its start), not later: a drug dosed after the
first seconds saw q = CO / reference ≈ effKg / 70 — measured on the Part A prototype, propofol 2 mg/kg, q read 60 s after
the dose: **16 kg child 0.73 / 0.47 / 0.20** (dose at 0 / 5 / 120 s; V.1 measured 0.22–0.23 on main), 70 kg adult 0.79 /
0.80 / 0.88 (the drug's own CO fall), 80 kg pregnant 0.77 / 0.81 / 0.84 — shrinking propofol's V1 and CL2/CL3 in
children. The fix is both lines together: 7c's `rest.coLp` starts at `ref.co` (L/min) and the reference is `co0` as is.
**Bit-identical at effKg 70** (0.075 × 70 = 5.25).

**Rows that move (declared; the t = 0 rows V.1 named):** the child's q 0.73 / 0.47 / 0.20 → 0.83 / 0.84 / **0.94**; its
propofol 2 mg/kg MAP nadir 57.9 / 56.7 / 54.7 → 58.9 / 58.4 / 58.3 mmHg (this plan's rig: 5 y, 16 kg, 108 cm, ventilated;
V.1's §8 rig reads 72 on main — its gate rows re-measure at FU-8's gate); the 80 kg pregnant profile q 0.77 → 0.76 at
t = 0; the 70 kg adult unchanged. 7c's `hbfRel` and lactate reference (`co0`) start in L/min for non-70 kg patients too
(a child dosed at t = 0 had co0 × 0.23, so `hbfRel` sat at its 1.5 clamp). **One pre-declared pin flips (E-FU8-12):**
7f's `neuro-engine` "propofol 2 mg/kg: depth-index nadir < 52 — measured 52 after FU-4 F4 (51 before)" — its 70 kg /
170 cm adult has effKg 67.6, so FU-4 F4 had moved its reference; now 51 again. Everything else green on the prototype:
fast set, slow-a (+ the known macOS `pk-longrun` red), slow-b, validation 107 + 11 skipped, demo 141, controller 223.

- [x] **Step 1 — failing test.**

Create `packages/engine-core/test/engine/fu8-propofol-ref.test.ts`:

```ts
// FU-8 Task A28 (V.1 gate note §10 item 2; FU-4 G10 × F4): the drug model's resting-output reference is in L/min for
// every size. Before FU-8 (origin/main) a drug dosed after the first seconds saw q = CO / reference ≈ effKg / 70: a
// 16 kg child dosed at 120 s read q 0.20 (7c's co0 had settled to L/min while engine.ts still converted it from the
// pre-F4 gas units), shrinking propofol's V1 and CL2/CL3. MODELED, seed 7, ventilated (8 mL/kg).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { circCardiacOutput, type CircModelState } from '../../src/l2/circ/model.ts';

async function qAfter(patient: Record<string, unknown>, doseAt: number): Promise<number> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ...patient, sensors: { abp: 'connected' } } as never });
  let n = 0;
  const ev = (event: Record<string, unknown>) => e.dispatch({ id: `q${++n}`, issuedBy: 'test', type: 'applyEvent', event } as never);
  e.advanceTo(1);
  ev({ kind: 'airwayDevice', device: 'ett' });
  ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: Math.round(8 * (patient.weightKg as number)), peep: 5, fio2: 0.5 });
  e.advanceTo(doseAt);
  ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
  e.advanceTo(doseAt + 60);
  await new Promise((r) => setImmediate(r));
  const x = e as unknown as { st: { hemo: { circ: CircModelState } }; pkCtx(ps: unknown): { coRefLpm: number } };
  return circCardiacOutput(x.st.hemo.circ) / x.pkCtx(x.st).coRefLpm;
}

describe('FU-8 A28: the drug model\'s resting-output reference', () => {
  it('16 kg child, propofol 2 mg/kg at 120 s: q = CO / reference 0.8–1.2, read 60 s later (origin/main: 0.20 — effKg/70)', async () => {
    const q = await qAfter({ ageY: 5, sex: 'M', weightKg: 16, heightCm: 108 }, 120);
    console.log(`fu8 A28: child q ${q.toFixed(3)}`);
    expect(q).toBeGreaterThanOrEqual(0.8);
    expect(q).toBeLessThanOrEqual(1.2);
  }, 60_000);
  it('70 kg adult, the same: q 0.8–1.2 (bit-identical to origin/main: 0.075 × 70 = 5.25)', async () => {
    const q = await qAfter({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }, 120);
    expect(q).toBeGreaterThanOrEqual(0.8);
    expect(q).toBeLessThanOrEqual(1.2);
  }, 60_000);
});
```

`CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-propofol-ref.test.ts` → the child FAILS (`fu8 A28: child q 0.204` on origin/main); the adult passes.

- [x] **Step 2 — both lines together.**

In `packages/engine-core/src/engine.ts`, find:

```ts
import { CI_LPM_PER_KG, CO_REF_LPM, gasPatient } from './l2/gas/params.ts'; // Stage 7e; FU-4 G10: CI_LPM_PER_KG, CO_REF_LPM
```

Replace with:

```ts
import { gasPatient } from './l2/gas/params.ts'; // Stage 7e
```

In `packages/engine-core/src/engine.ts`, find:

```ts
      // its hbfRel uses, R51 addendum 15 #5), converted from gas-model units back to L/min; `circ.ref.co` sits −9…+10 %
      // from where rigs settle and would move propofol's distribution in every healthy induction
      ...(circ ? { coRefLpm: (blood?.core?.co0 ?? 0) > 0 && resp.pat?.effKg ? ((blood?.core?.co0 as number) * CO_REF_LPM) / (CI_LPM_PER_KG * resp.pat.effKg) : circ.ref.co } : {}),
```

Replace with:

```ts
      // its hbfRel uses, R51 addendum 15 #5); `circ.ref.co` sits −9…+10 % from where rigs settle and would move propofol's
      // distribution in every healthy induction. FU-8 (A28; V.1 gate note §10 item 2): co0 is in L/min since FU-4 F4 (7c
      // now also STARTS it in L/min), so it is read as is — the old gas-unit conversion gave a drug dosed after the first
      // seconds q = CO/ref ≈ effKg/70 (a 16 kg child 0.20: propofol's V1 and CL2/CL3 shrunk)
      ...(circ ? { coRefLpm: (blood?.core?.co0 ?? 0) > 0 ? (blood?.core?.co0 as number) : circ.ref.co } : {}),
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
import { CI_LPM_PER_KG, CO_REF_LPM, gasPatient } from '../gas/params.ts';
```

Replace with:

```ts
import { CI_LPM_PER_KG, gasPatient } from '../gas/params.ts';
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
  // CO0 in the gas model's flow units (coRatio × CI × effKg): the circuit's settled resting CO, starting from 7a's
  // stabilised `ref.co` (fallback) — R51 addendum 15 (5), superseding R50 F4's `ref.co` alone
```

Replace with:

```ts
  // CO0 in L/min (coRatio × CI × effKg = the circuit's CO since FU-4 F4): the circuit's settled resting CO, starting from
  // 7a's stabilised `ref.co` (fallback) — R51 addendum 15 (5), superseding R50 F4's `ref.co` alone. FU-8 (A28): the start
  // was still in the pre-F4 gas units (× effKg/70), so a non-70 kg patient's co0 began off by that factor
```

In `packages/engine-core/src/l2/blood/pipeline.ts`, find:

```ts
  if (circ?.ref && bs.rest.coLp === 0) bs.rest.coLp = (circ.ref.co / CO_REF_LPM) * CI_LPM_PER_KG * rs.pat.effKg;
```

Replace with:

```ts
  if (circ?.ref && bs.rest.coLp === 0) bs.rest.coLp = circ.ref.co;
```

- [x] **Step 3 — the flipped pin (E-FU8-12).** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/neuro-engine.test.ts` → "Expect test to fail" (nadir 51). Then:

In `packages/engine-core/test/engine/neuro-engine.test.ts`, find:

```ts
  // unchanged, kept as a record.
  it.fails('propofol 2 mg/kg: depth-index nadir < 52 — measured 52 after FU-4 F4 (51 before)', async () => {
```

Replace with:

```ts
  // unchanged, kept as a record. FU-8 (E-FU8-12, Task A28): flipped — 7c's co0 now starts in L/min and the drug model
  // reads it as is, so this non-70 kg adult's propofol reference is its own resting output again: nadir 51
  it('propofol 2 mg/kg: depth-index nadir < 52 — measured 52 after FU-4 F4 (51 before), 51 after FU-8 A28', async () => {
```

- [x] **Step 4 — verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-propofol-ref.test.ts test/engine/neuro-engine.test.ts test/l2/blood test/l2/pk test/engine/pk- test/engine/blood-`
→ pass (`fu8 A28: child q 0.935`); then the fast set, slow-b (`neuro-engine` lives there) and
`npx -y pnpm@9.15.9 --filter @pme/validation test`.

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/engine.ts packages/engine-core/src/l2/blood/pipeline.ts packages/engine-core/test/engine/fu8-propofol-ref.test.ts packages/engine-core/test/engine/neuro-engine.test.ts
git commit -m "fix(pk): the resting-output reference is 7c co0 in L/min for every size — co0 starts in L/min (FU-8 A28, V.1 gate §10)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

### Task A29: A profile’s massive PE raises PVR as the dispatched event does (V.1 gate note §10 item 1; FU-4 G6)

**Files:** Modify `packages/engine-core/src/l2/hemo/pipeline.ts` (`createHemoState`: FU-4 G6's `pe` alias for a profile's `lungConditions`).
Create `packages/engine-core/test/engine/fu8-pe-profile.test.ts`. (`circ/aliases.ts` stays the one alias for EVENTS; a profile is not an
event, so the pipeline applies the same φ mapping at creation.)

**Why:** FU-4 G6 made one PE event apply to both owners (7a's PVR by the φ mapping, 7b's dead space and shunt). A patient
PROFILE's `lungConditions` are set at creation and never passed through that alias, so V.1's massive-PE link profile (the
lung `pe`, severity 1) had the dead space and NO PVR rise (V.1 gate note §5). Measured, ventilated 70 kg, `lungConditions`
pe 1: PVR × 1.0, PA 15.3 mmHg, CO 4.9 L/min, EtCO2 23.6 at 300 s (the dispatched event: × 9.0, 51.9, 3.25, 18.7) → × 9.0,
PA 64.8, CO 3.9, EtCO2 20.2. The profile path lands a little above the event path (PA 59–65 vs 52): the lungs' PE is
present from creation rather than from t = 1 (recorded; both are the one φ mapping).

Create `packages/engine-core/test/engine/fu8-pe-profile.test.ts`:

```ts
// FU-8 Task A29 (V.1 gate note §10 item 1; FU-4 G6): a profile's massive PE raises PVR as the dispatched event does.
// Before FU-8 (origin/main) a `lungConditions` PE on the PATIENT profile (the ventilator link's massive-PE profile) was
// set at creation and never passed through FU-4 G6's alias: dead space without the PVR rise (mPAP 15, CO 4.9).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A29: FU-4 G6\'s PE alias applies to a profile', () => {
  it('lungConditions pe severity 1 on the profile: PVR × 9 (the φ mapping) and mean PA pressure ≥ 40 mmHg at 120 s (origin/main: × 1, ≈ 15)', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, lungConditions: [{ id: 'pe', severity: 1 }], sensors: { abp: 'connected', pap: 'connected' } } as never });
    e.advanceTo(1);
    e.dispatch({ id: 'a', issuedBy: 'test', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'ett' } } as never);
    e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } } as never);
    let sum = 0;
    let n = 0;
    for (let t = 100; t <= 120; t += 1) {
      e.advanceTo(t);
      sum += (e as unknown as { st: { hemo: { circOut: { pPa: number } } } }).st.hemo.circOut.pPa;
      n++;
    }
    const c = (e as unknown as { st: { hemo: { circ: { ext: { pvr: number } } } } }).st.hemo.circ;
    console.log(`fu8 A29: ext.pvr ${c.ext.pvr.toFixed(2)}, mean PA ${(sum / n).toFixed(1)} mmHg`);
    expect(c.ext.pvr).toBeCloseTo(9, 5);
    expect(sum / n).toBeGreaterThanOrEqual(40);
  }, 60_000);
});
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
  const circ = createCircModel(circProfileOf(profile)); // Stage 7a
  return {
```

Replace with:

```ts
  const circ = createCircModel(circProfileOf(profile)); // Stage 7a
  // FU-8 (A29; V.1 gate note §10 item 1): FU-4 G6's alias (aliases.ts) for a PROFILE — a lung condition the circulation
  // also owns applies to both, as a dispatched event does: a profile's massive PE carried the lungs' dead space and no PVR
  for (const lc of profile?.lungConditions ?? []) if (lc.id === 'pe') applyCircCondition(circ, 'pe', lc.severity);
  return {
```

- [x] **Verify.** `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu8-pe-profile.test.ts test/engine/circ- test/l2/circ` → pass (`fu8 A29: ext.pvr 9.00, mean
PA 62.9 mmHg`; origin/main 1.00 / 18.1). V.1's link-profile tests re-measure at FU-8's gate once V.1 is on main.

- [x] **Commit and push.**

```bash
cd <repo>/../scratch/wt-fu-8
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/fu8-pe-profile.test.ts
git commit -m "fix(circ): a profile massive PE raises PVR through FU-4 G6 alias (FU-8 A29, V.1 gate §10)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
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
// FU-8 Task B1 (review pack defect list): explicit routes, refused curve-row infusions and the documented
// maximum-dose warning. Through the engine's public API, seed 7.
import { describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '../../../src/index.ts';

const eng = () => createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
const drug = (e: ReturnType<typeof eng>, event: Record<string, unknown>) => e.dispatch({ id: `d${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'drug', route: 'iv', ...event } } as never);

describe('FU-8 B1: routes and infusions the engine cannot honour are refused, not given as IV', () => {
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

describe('FU-8 B1: a documented maximum raises a warning, never a clamp', () => {
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
  /** FU-8 (B1): the routes this row honours — the engine's kinetics are intravenous; absent = IV_ROUTES. A dose by any
   * other route is refused with a reason (no absorption model is built; review pack "every dose behaves as IV"). */
  routes?: readonly PkRoute[];
  /** FU-8 (B1): a documented maximum — exceeding it raises a `drugWarning` event, never a clamp. `perKg`: × actual
   * weight; `scope` 'cumulative' sums every bolus of the row. Only maxima the row's own `doses` text sources are set;
   * the rest wait on Ali's dosing-preset table (review pack DP-01…DP-64). */
  maxDose?: { amount: number; perKg: boolean; scope: 'dose' | 'cumulative'; src: string };
  /** FU-8 (B1): another stage reads this row's ordered RATE and acts on it (7e reads dextrose, E-7e-4), so an infusion
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
    if (row.pk.kind === 'gamma' && row.pk.refRate === undefined && !row.rateActsVia) return `${row.id} has no infusion model: give it as a bolus`; // FU-8 (B1)
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
  // FU-8 (B1): the route is explicit — the engine's kinetics are intravenous; any other route is refused, not given as IV
  const routes = row.routes ?? IV_ROUTES;
  if (d.route !== undefined && !routes.includes(d.route)) return `${row.id}: route ${d.route} is not modelled — the engine gives ${routes.join(', ')} doses only`; // an event without a route (scenario/oracle JSON) is IV, as before
  // FU-8 (B1): a curve-based row without an infusion reference cannot act as an infusion (it was accepted and did nothing)
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

/** FU-8 (B1): the routes whose kinetics the engine's intravenous models honour (IO and a central line are IV). */
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
      // FU-8 (B1): above the documented maximum → a warning event; the dose is given as ordered (no silent clamp)
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
    routes: ['iv', 'io', 'central', 'neb'], // FU-8 (B1): nebulised for K (7c decision 7; the K-shift acceptance uses it) — the same curve, a documented simplification
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
  { id: 'dextrose', name: 'Dextrose 50 %', cls: 'metabolic', amountUnit: 'mg', pk: gammaPk(25000, false, 120, 3600), rateActsVia: '7e glucose (E-7e-4)', // FU-8 (B1)
```

In `packages/engine-core/src/l2/pk/data/rows-other.ts`, find:

```ts
  { id: 'dantrolene', name: 'Dantrolene', cls: 'dantrolene', amountUnit: 'mg', pk: gammaPk(2.5, true, 600, 21600),
    pd: [], doses: '2.5 mg/kg, repeat to 10 mg/kg', onset: 'EtCO2 falls within 5–10 min, HR normal by 15–20 (tables §7 21); bus.metabolic.dantroleneE → 7e/Stage 3 MH', ir: '?', src: 'tables §7 21; M10 ch. on neuromuscular disorders (2.4 mg/kg max twitch depression)', tag: 'TXT' },
```

Replace with:

```ts
  { id: 'dantrolene', name: 'Dantrolene', cls: 'dantrolene', amountUnit: 'mg', pk: gammaPk(2.5, true, 600, 21600),
    maxDose: { amount: 10, perKg: true, scope: 'cumulative', src: 'tables §7 21; the row: repeat to 10 mg/kg' }, // FU-8 (B1)
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
    maxDose: { amount: 4.5, perKg: true, scope: 'cumulative', src: 'M10 ch. 25 Table 25.6, plain' }, // FU-8 (B1)
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
    maxDose: { amount: 2.5, perKg: true, scope: 'cumulative', src: 'M10 Table 25.6, plain' }, // FU-8 (B1)
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
    maxDose: { amount: 3, perKg: true, scope: 'cumulative', src: 'M10 Table 25.6, plain' }, // FU-8 (B1)
    doses: 'max 3 mg/kg (200 mg plain / 250 with epinephrine, M10 Table 25.6)', onset: 'as bupivacaine with a higher CV threshold', ir: '?', src: 'M10 ch. 25; LAST_THRESHOLDS', tag: 'TXT' },
```

In `packages/engine-core/src/types-pk.ts`, find:

```ts

export type DrugsEvent = {
```

Replace with:

```ts

/** FU-8 (B1): a dose above the row's documented maximum (`DrugRow.maxDose`) — the dose is still given, as ordered. */
export type DrugWarningEvent = { type: 'drugWarning'; t: SimSeconds; drugId: string; text: string };

export type DrugsEvent = {
```

In `packages/engine-core/src/types.ts`, find:

```ts
import type { DrugsEvent, PkClinicalEvent } from './types-pk.ts'; // Stage 7g
```

Replace with:

```ts
import type { DrugsEvent, DrugWarningEvent, PkClinicalEvent } from './types-pk.ts'; // Stage 7g; FU-8 (B1)
```

In `packages/engine-core/src/types.ts`, find:

```ts
  | DrugsEvent // Stage 7g (types-pk.ts)
  | BloodEvent // Stage 7c (types-blood.ts)
```

Replace with:

```ts
  | DrugsEvent // Stage 7g (types-pk.ts)
  | DrugWarningEvent // FU-8 (B1)
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


### Task B5: Transcutaneous pacing hurts an awake patient (research/20 DV-08c, gap V6; the DV amendment (f)) — UNPROTOTYPED

**Part B because of file overlap:** the pacer's output lives in `l3/device-layer.ts` (`Modifiers.tcp`, `device-layer.ts:285–291`)
— FU-7 Task 12's file under E-FU7-6 — and the nociceptive input reaches 7e/7f through `engine.ts` (the `stimulus` path,
`engine.ts:778`; FU-6 and FU-7 edit it) into `l2/endo` (FU-7's). Executes after B0; not prototyped — the executor
measures first (R45).

**Measured (research/20 DV-08c on 3feee6f):** awake, spontaneous, CHB 30 → TCP 80 mA: ΔNE 0, Δadrenaline −0.1, MAP 98.5
against 95.7 in the ventilated GA rig (the +2.8 is the baroreflex answering the paced MAP) — no pain, no surge, no movement.
Capture at 70 mA (the R39-4 default threshold) is right (DV-08a).

**Mechanism (research/20 V6's smallest):** a TCP output above ≈ 40 mA is a nociceptive input — `stimulus` intensity scaled
by the output (e.g. 0 at 40 mA → 1.5 "laryngoscopy-grade" at ≥ 100 mA [ENG, the fit target named]) — ADDED to the
instructor's stimulus through the ONE `stimulus` shape (R51 addenda 12/17), so 7e's catecholamines and 7f's arousal
respond and sedation/analgesia (7f's antinociception) remove the response. No new effector. **Acceptance:** DV-08c ΔNE > 0
and ΔHR > 0 awake; the same pacing under GA (propofol + remifentanil) within ± 10 % of the unpaced reflex; DV-08a/08b
and every pacing test unchanged. Ali's W25 (8): whether the patient also moves (a movement flag) and whether the capture
threshold rises with thoracic impedance.

## Task G: Gate — merge main, full verification, evidence, the gate note, the pull request

**Files:** Create `docs/gates/fu-8.md`, `docs/gates/fu-8/**` (≤ 60 KB PNGs); modify `apps/demo/scripts/fu4-shots.mjs`
(E-FU8-8) and re-take `docs/gates/fu-4/3b-classIV-rosc.png` and `5a-burns-sux-sine.png`; tick this plan.

- [ ] **Step 1 — merge.** `git fetch origin && git merge origin/main` (no stash). Re-run the block checker for any part not
  yet executed (`python3 ../scratch/plans-backup/fu-8-check-blocks.py --part B docs/plans/fu-8-followups.md .`).
- [ ] **Step 2 — full verification** (bounded waits ≤ 10 min per `until` loop; logs under `<scratchpad>/fu-8-followups/`):
  `npx -y pnpm@9.15.9 -r typecheck`; `CI=1 npx -y pnpm@9.15.9 -r test` with `PME_TEST_SET=fast` for engine-core;
  `PME_TEST_SET=slow-a` and `PME_TEST_SET=slow-b` separately — record both wall times (slow-b must stay under 40 min:
  FU-8 adds nothing to it — prototype 45 files / 251 passed, 16.4 min locally; slow-a gains the `fu8-*` files — prototype
  22 files / 88 passed + the known macOS `pk-longrun` red, 13.4 min); `pnpm build && CI=1 pnpm test:e2e`
  (both projects; Chromium for the heavy evidence files); `npx -y pnpm@9.15.9 run audit:monitor A1-map-ladder A2-ali-b7 A7-probe B1-rhythms`
  (after-report beside Task A0's before-report); the CM cells CM-15c, CM-15b, CM-05b, CM-04a, CM-01b, CM-03b, CM-06b,
  CM-13a, CM-02a (research/19 §9, `CM_OUT` in the scratch dir — never the research folder); the DV cells DV-01b, 01c,
  02a–c, 03, 04a, 08c, 13a–d, 14a–d, 15a, 16d, 17, 22a, 23a, M3, M5 (research/20 §9, `DV_OUT` in the scratch dir); the tick bench
  (`packages/validation/src/perf/tick-bench.ts`, p50 ≤ the FU-4 gate's 0.52 ms + 10 %).
- [ ] **Step 3 — evidence.** (a) Re-take the FU-4 page shots 3 and 5 on this tree: in `fu4-shots.mjs` (E-FU8-8) scenario 5's
  first shot waits until sim 300 + 215 s (10 s before the measured VF at +225 s, when K has passed 8.5 and the ECG is a
  sine wave) instead of 300 + 200; run `node apps/demo/scripts/fu4-shots.mjs http://localhost:4818 docs/gates/fu-4 3,5` (vite
  on 4818 from your own shell) and inspect: 3b shows the latched APNEA as red text on the black bar (D2), 5a a sine wave.
  (b) New shots under `docs/gates/fu-8/`: the Ali tamponade case at MAP < 30 with `**ABPm <value><70` live (A1); the
  AGENTS tile under sevoflurane on philips-like and saadat-like (A7); the fu5-latched pair (A4, from the e2e); CPR in VF
  with the compression artefact on lead II (A23); tamponade CPR's arterial line (A19, DV-04a).
- [ ] **Step 4 — the gate note `docs/gates/fu-8.md`:** base and head; per task the before → after rows (this plan's
  "Prototype results" as the expected column); every `it.fails` added (A10 ×1, A12 ×1, A22 ×2, A24 ×1) and flipped (A2 ×3,
  A19 ×2, A22 ×1; B4's S14 if executed) with numbers; the exceptions E-FU8-1…11 as applied; the τ scan table (A10); the CM
  and DV rows beside research/19's and research/20's columns (research/12 §7); slow-a/slow-b times; the "Handed to" and
  "Waiting on Ali" tables copied with any number that moved; deviations from this plan and why; and **the rows that move**
  (R50 F3, ruling 4) — every existing FU-3/FU-4/FU-5 row this plan moves, with the expected column below (the prototype's
  numbers; the executor's measurement beside them):

  | Row (test / rig) | origin/main | after FU-8 | Task | Kind |
  |---|---|---|---|---|
  | S8 tension PTX, PEA ≤ 10 min (`clinical-suite`) | +9.75 min | +9.92 at A10 (τ 235), +9.75 from A19 | A10, A19 | passing, band unchanged |
  | S4a Ali's tamponade, PEA (`clinical-suite`) | +165 s | +170 s | A2–A10 | passing |
  | S13 VF CPR CoPP (`clinical-suite`, `it.fails` 15–25) | 25.1–28.8 | 24.9–28.0 | A19 | pin holds; title re-stated (E-FU8-9) |
  | 10-min VF CPR kIsch < 0.9 (`clinical-suite`) | `it.fails`, max 0.91 | max 0.89 | A19 | pin FLIPS (E-FU8-9) |
  | class IV ROSC with CPR + 2 L + adrenaline (`circ-lowflow-arrest`) | +119 s (band ≤ 180) | +260 s | A19 | RE-STATED ≤ 300 s (E-FU8-9, ruling 3) |
  | 7b CPR trough ≤ 30 (`hemo-acceptance`) | `it.fails`, 30.6 | 25.2 | A19 | pin FLIPS |
  | exsanguination volume + adrenaline (E-FU4-19 measurement) | 3 L +180 s, 3.5 L +170 s | no pulse up to 3.5 L | A19 | measurement (W7) |
  | asphyxial PEA (`circ-hypoxic-arrest`, 5–14 min band) | +6.35 min (τ 300) | +11.2 min (τ 235) | A10 | passing; title re-stated (E-FU8-4) |
  | asphyxia: FiO2 1 reversal, HR ≥ 60 | 7 s | 7 s (τ 235; 34–36 s only at τ 220/230, a threshold effect) | A10 | passing |
  | asphyxial PEA decay: agonal / asystole after the arrest | +2 / +75 s | +76 / +149 s | A6, A10 | passing |
  | af-pulse-deficit non-ejecting beats | 14.4 % | ≈ 16.9 % (review) | A6/A10 | passing (10–20 %) |
  | Ali's tamponade on the monitor (`audit:monitor A2-ali-b7`) | `***ASYSTOLE` raised 936 s in the agonal phase, EXTREME BRADY cycling | `***EXTREME BRADY` from 947 s, `***ASYSTOLE` at 1097 s | A2, A6 | display (W20) |
  | arrest-etco2 "≥ 17 at +2 min of CPR" | `it.fails`, 16.5 | 18.0 | A22 | pin FLIPS (E-FU8-10) |
  | R39-2 quality map; +10 breaths/min (`cpr-etco2`) | 13.2 / 20.3 / 24.8 / 27.4; −3 | 20.4 / 25.2 / 26.6 / 26.6; −4.8 | A22 | become `it.fails` (E-FU8-10, W22) |
  | AF 150 quiet band kIsch ≥ 0.9 (`fu8-coronary`) | 0 (arrest) | 0.89 | A10 | new `it.fails` (limitation) |
  | 16 kg child propofol 2 mg/kg (q; MAP nadir), dose at 0 / 5 / 120 s | q 0.73 / 0.47 / 0.20; 57.9 / 56.7 / 54.7 | q 0.83 / 0.84 / 0.94; 58.9 / 58.4 / 58.3 | A28 | V.1's §8 t = 0 rows (child nadir 72 on main) re-measure on the merged tree |
  | 7f `neuro-engine` propofol DI nadir < 52 (`it.fails`) | 52 | 51 | A28 | pin FLIPS (E-FU8-12) |
  | massive PE as a profile `lungConditions` (V.1's link profile) | PVR × 1.0, PA 15.3 | × 9.0, PA 64.8 | A29 | link-profile rows re-measure |
  | 16 kg child CPR gas-exchange flow | 63 mL/kg/min (adult-absolute), EtCO2 38.6 | 19 mL/kg/min, EtCO2 22.0 | A22 | new test; V.1's guard (FU-6) |
  | adults ≠ 70 kg with no height (80 kg HFrEF / CAD rigs, the DV IABP rigs) | sized on 80 kg, 5 600 mL | sized on 74.8 kg, 5 238 mL | A13 | every suite green (fast, slow-a/b, packages) |
  | research/20 DV cells | research/20's column | "Prototype results" rows I-61…I-68 (DV-02c ratio 0.43 → 0.83, DV-13b ΔSys −19.1: recorded; DV-22a unmoved) | A19–A24 | cells |
- [ ] **Step 5 — pull request (never merged by the executor).**

```bash
git push
gh pr create --base main --head fu-8-followups --title "FU-8: follow-ups — monitor honesty in arrest, library defects, loose ends" --body-file <scratchpad>/fu-8-followups/pr-body.md
```

The body: goal, the Part A / Part B status, the headline rows, the exceptions and the open questions, ending with the
line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Commits carry the trailer
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (or the executor's own model name). Stop after opening the PR.

## Open questions (for the orchestrator / Ali; the plan does not wait on them except where marked)

Resolved by the R50 rulings (kept as a record): **Q1** Option D lands, size-scaled (Task A19); **Q2** `TAU_HYP_S` 235, the
joint plateau's middle (Task A10, E-FU8-4); **Q4** one more mechanism step, then a pinned limitation (0.89; D18); **Q5** the
HR flicker is Task A25, gated on W18; **Q7** two PRs — Part A now, Part B after FU-7.

1. **C1 (Task B4)** — E-FU8-7 on FU-4's `baroreflex.ts`, and Ali's answer to W15 before execution. (Unchanged.)
2. (Resolved — OQ2) EtCO2 under CPR: A22 lands; the R39-2 map is an `it.fails`; "CPR flow vs compression quality" is in
   the calibration queue, flagged for Ali (W22).
3. (Resolved — OQ3) the arrest state is PEA-only in v1.0; the instructor-VF case is in the calibration queue.
4. **The unprototyped Part A tasks (A26 LVAD, A27 MANUAL ramp)** — executed as measure-first designs by the executor, or
   prototyped by a second writer pass before the Part A PR? Neither blocks another task.
5. **Post-ROSC heart rate** (seen while measuring F2): after CPR + 2 L + adrenaline 1 mg in the class IV rig the sinus rate
   is 52–57/min with MAP 130 (baroreflex bradycardia against the adrenaline surge). A record for the FU-4 owner /
   calibration pass, not a task. (Unchanged.)

## Self-review

**Coverage — every loose end has a decision (75 inventory rows + the review's findings).** Sections A–F as written by the
plan writer (60 rows; decisions renumbered to the current tasks — R50 F8), G the DV audit (15 rows: tasks A19–A24, A26,
A27, B5; handed to FU-7, FU-9, 7h; Ali W24/W25/W27; one recorded), H the R50 review (F1–F12 and Q5/Q7, each with its
ruling and the section that carries it). Every orchestrator ruling is applied: (1) A13's ONE continuous rule, anchored,
the curve shown, FU-9 handed; (2) τ 235 from the joint plateau with both margins and the same-start comparison; (3)
Option D lands size-scaled as A19, the ROSC row re-stated under E-FU8-9, the negative CVP gone (≥ −0.1), the VF kIsch row
re-measured (0.89 → a flipped pin); (4) every moved row declared (Task G's table), the EXTREME BRADY display as W20;
(5) the A2 test fails on main (56 flips) and passes after (16); (6) Q4's one step (0.89) and the `it.fails` as a
limitation; (7) A25 gated on W18; (8) two PRs; (9) F6–F12 as the review wrote them; OQ2 (A22 lands, the calibration item flagged, W22) and OQ3 (A21
PEA-only). The DV amendment (a)–(i): (a) A20;
(b) A21; (c) A19 (fixed by the limiter, with its test); (d) A22; (e) A24; (f) B5 (Part B: FU-7's `device-layer.ts`,
`engine.ts`, `l2/endo`); (g) A26; (h) A23; (i) A27; the device NE items and the nine questions → W24, W25.

**Duplication check against the in-flight plans.** Nothing here re-does FU-6 (no lung/resp file; `gas/coupling.ts`'s CPR
branch only, E-FU8-11), FU-7 (no `l2/pk` edit before FU-7 merges; no `l3/device-layer.ts` or `engine.ts` edit in the DV
tasks — B5 waits; Task 12's shock-outcome work stays FU-7's), V.1 (its CPR guard is handed), 7k (its two
`vite.config.ts` blocks re-anchor), FU-9 (the body-size definition and V11 handed) or Stage 9.

**Rules.** R45: no band is widened or removed except the ROSC row the ruling re-states (E-FU8-9); pre-declared pins that
flip are named with their numbers (A2 ×3, A19 ×2, A22 ×1); new pins carry their numbers (A10 AF 0.89, A12 neonate
output, A22 the R39-2 map ×2, A24 CBF 0.45); constants changed are [ENG] with the fit target in the comment (`V_EMPTY_ML`
and its W/70 scaling, `SIZE_REF_KG`, `DEFAULT_HEIGHT_CM` [7c's], the τ re-fit under E-FU8-4; plus the writer's). R51: only
7g's files touch PK (B1); the chain order is untouched. R56: every new visible word is a glossary label. CI: every new
multi-sim-minute file is `test/engine/fu8-*.test.ts` in SLOW and SLOW_A (slow-b lists none); every engine loop yields
per sim-minute. Process: worktree `scratch/wt-fu-8`, branch `fu-8-followups`, per-task commits and pushes with the
trailer, no stash, bounded waits, `git merge origin/main` before `engine.ts`/`circ` edits and the gate, two PRs, never
merged by the executor.

**Mechanical find-block check** (`scratch/plans-backup/fu-8-check-blocks.py`, which parses this document's blocks in
order): Part A 146 find/replace blocks + 24 creates; Part B 28 + 3; in all 174 + 27; problems 0. Every find block occurs
EXACTLY ONCE at its place in the sequence (earlier blocks applied); every block also occurs exactly once on `origin/main`
`fea51fa` (= `0fd5397`'s code) except 1 CHAINED block, which edits a line an earlier FU-8 block wrote (A20's
`const cp = aoDiaOf(x)` on A10's loop) — the checker reports it (`--verbose`). No create overwrites an existing file. Re-run: `python3 ../scratch/plans-backup/fu-8-check-blocks.py
--part AB [--verbose] docs/plans/fu-8-followups.md <tree>` (B0 and G run it again on the merged tree).

**Every commit rebuilt from this document and tested** (`--upto "Task X" --apply` onto a `git archive` of `origin/main`
with its own `node_modules`; the checker writes by rename so hard-linked trees stay intact):

| Tree (after …) | Checked | Result |
|---|---|---|
| A10 | `circ-hypoxic-arrest`, `clinical-suite`, `fu8-coronary` | 41 passed: asphyxia +11.17 min, reversal 7.0 s, S8 +9.92 min (5 s margin), AF kIsch 0.89 |
| A18 | engine fast set; `clinical-suite`, `circ-lowflow-arrest`, `cpr-etco2`, `arrest-etco2`, `fu8-body-size`, `fu8-coronary` | fast 268 files / 1 200 passed (1 skipped); 55 passed |
| A19 | `clinical-suite`, `circ-lowflow-arrest`, `hemo-acceptance`, `fu8-negative-volume`, `vent-infant`, `fidelity-arrest`, `fidelity-lowflow` | 77 passed (ROSC +260 s, VF kIsch 0.89, 7b 25.2, DV-04a MAP 24.3 vs 48.5, 0.57 L/min) |
| A20 | `fu8-iabp`, `test/l2/circ`, `circ-lowflow-arrest`, `fu8-coronary`, `clinical-suite`, `hemo-acceptance` | 30 files / 162 passed |
| A21 | `fu8-pulseless-arrest`, `clinical-suite`, `arrest-etco2`, `fidelity-arrest`, `circ-lowflow-arrest` | 53 passed (PEA-only: S13 24.9–28.0 and VF kIsch 0.89 unmoved; the arrest-etco2 pin still holds at 16.4) |
| A22 | `fu8-cpr`, `arrest-etco2`, `cpr-etco2`, `clinical-suite` | 37 passed (arrest-etco2 18.0) |
| all of Part A (with A28/A29) | the 74 files it writes vs the prototype; `pnpm -r typecheck`; fast set; every `fu8-*` + the arrest/CPR files | 74/74 byte-identical; typecheck clean; fast 269 files / 1 202 passed (1 skipped); 22 files / 105 passed |

On the prototype (= all of Part A, A28/A29 included): slow-a 26 files / 93 passed + the known macOS-only `pk-longrun` red (2.506500255440444,
identical on main), 13.5 min; slow-b 45 files / 251 passed with the A28 pin flip applied, 16.4 min (FU-8 adds no slow-b file); controller 223,
renderer 89, skins 179, demo 141, validation 107 + 11 skipped; every new test that asserts a fix fails on `origin/main` (15
of the 21 in `fu8-body-size`, `fu8-iabp*`, `fu8-pulseless-arrest`, `fu8-cpr*`; the other 6 are anchors, pins or
directions main already meets, e.g. the 4 900 mL anchor and VF-CPR EtCO2 18.5), and the A2 test fails there with 56 flips. Parts A + B applied: the pk files are
byte-identical to the prototype's (the B1 comments renumbered, R50 F8); B4's three files are its own prototype
(`fu-8-c1/`).

**Prototype provenance.** Tasks A1–A24 (A5 → A19) and B1 were run in `<scratchpad>/fu-8/wt` on `origin/main` (code of
`0fd5397`); every Part A block was generated mechanically from that tree (`gen/hunks3.py`: main → final, and main → a
stage → final for the two files two tasks edit in one place: `coronary.ts` (A10/A11 → A20) and the clinical suite (A19 →
A21)). B4 (C1) was prototyped earlier and removed (Ali first). A25 (gated), A26, A27, B2, B3, B5 are UNPROTOTYPED and say
so; Task G is procedure. Backups: `scratch/plans-backup/fu-8-followups.md`, `fu-8-prototype.patch` (refreshed),
`fu-8-gen-tasks_a.py`, `fu-8-check-blocks.py`, `fu-8-writer-notes.md`, `fu-8-c1/`.

**Known limits.** The HR numeric in an agonal rhythm still alternates "0"/"-?-" (A25, W18). AF 150 leaves kIsch 0.89
(a pinned model limitation). EtCO2 no longer follows compression quality above 0.8 (the calibration item "CPR flow vs
compression quality", W22). CPR cerebral flow sits above the consensus (0.45). The IABP's assisted systole is too deep (W26). The paediatric per-kg output and the
HTN/elderly/HFrEF rest pressures wait on Ali (W12, W14). The LVAD preload and the MANUAL post-ROSC ramp are designed, not
prototyped (A26, A27).
