# Gate note — Stage 13: the debrief report (print to PDF)

Plan: `docs/plans/stage-13-debrief.md` (READY, R50), Tasks 0–4 plus Appendix B, with deviations DV-1 (test only) and
DV-2 (trend axes, orchestrator ruling). Executor: one session (Claude Opus 5.5). The formal gate (§0) ran on
`cb4fb17e` = `origin/main` 8698a86e merged into `stage-13`. Sections 1–9 are the pre-merge dry run of 2026-10-11 on
`8d6a2275`, kept as the record. **Owner's print check in Safari and Chrome: run 2026-10-18, PASS in both (Safari with the known footer limit, ruled
acceptable by the owner; §0).**

## 0. Formal gate (2026-10-12, on cb4fb17e)

**Merge.** `git merge origin/main` (8698a86e: FU-11 d #49, Stage 10 #54, Stage 12 #57, CI reshaping #55, card-button
fix #51, scenario-library fix #56, citations #52) gave merge commit cb4fb17e.
- The merge had **no conflict**.
- `docs/showcase/CLASSROOM.md` and `packages/controller/src/scenario/driver.ts` are byte-identical to main's on the merged
  tree. This branch already carried Stage 12's and Stage 10's versions through `stage-12`, and Stage 13 does not edit
  either file, so nothing needed resolving.
- The one file both sides changed is `apps/demo/src/app/describe.ts`. It keeps this stage's `airwayDevice` words and
  main's `spanText` rounding.

**Block re-check** on a detached checkout of main 8698a86e, which has no Stage 13 (`check.py --variant b --base-dir`):
**32 blocks + 9 creates, 27 files, 0 problems**.

**Suites**, one at a time on the shared Mac:

| check | result |
|---|---|
| `pnpm install --frozen-lockfile`, `pnpm -r build` | clean |
| `pnpm -r typecheck` | clean (8 packages) |
| `PME_TEST_SET=fast pnpm -r --no-bail test` | audio 11/65 · skins 21/191 · engine-core 325 files, 1430 passed, 1 skipped · controller 56/277 · ventilator 21/106 · renderer 32/110 · validation 35 (+1 skipped)/119 (+11 skipped) · demo 36/277 — **exit 0, no worker errors** |
| `PME_TEST_SET=showcase vitest run` (apps/demo) | **5 files, 20 passed** (368 s) |
| engine-core slow groups (`slow`, `slow-a`…`slow-g`) | not run locally: engine-core is untouched by this stage, so they are left to CI's `test-slow` jobs |
| `npx playwright test --retries=0 --workers=4`, both engines, macOS | **216 tests: 176 passed, 1 failed, 39 skipped** (26.7 min). Locally WebKit also runs the CI-only skips (`s10-time-control` ×8, `s12-mobile-learner` hold, FALLBACK rulings 2026-10-12), and they passed. `fu11-vent-restore` skips WebKit on every platform |

**Finding (retry-only pass, local):** `stage4b-device.e2e.ts:72` "flash rates" failed on Chromium at load ≈ 108 (the
`.pme-bar` text stayed empty for 15 s). With `--last-failed` at load ≈ 27 it passed. This stage does not touch the
device layer.

**Rehearsal** (kit built from cb4fb17e, perl server, 1440 × 900, both engines, through the debrief wrapper):
- **16/16 passed on the first run**: the six cards, the induction rescue variant and the second-load clock test.
- The Debrief was opened and printed after MH and tamponade (`docs/gates/stage-13/rehearsal/`):
  - **MH: PDF 7 A4 pages**, 36 timeline rows, 41 minute rows.
  - **Tamponade: PDF 5 A4 pages**, 25 timeline rows, 16 minute rows.
  - Footer and "Build cb4fb17e 2026-10-12. Page n of N" on every page.
- Verdicts were the same on both engines:
  - MH: not met / met / not assessable / met / met.
  - Tamponade: not assessable / not met / not met / met / not met.
  - Each follows the run sheet's presenter timing; the question is with the owner (§8).
- `docs/showcase/` was put back to its committed state afterwards.

**Evidence** (`PME_SHOTS=1`, both engines passed, clean tree):
- `debrief.pdf`: **5 A4 pages**, titled "Debrief Anaphylaxis under anaesthesia 2026-10-12", with "Build cb4fb17e" and
  "Page n of 5" on every page.
- `debrief-print-{chromium,webkit}.png`.
- One evidence run was discarded: the rehearsal had left `docs/showcase` modified, so the build read "cb4fb17e+". It was
  re-run after the restore.

**Owner's folder:** `Desktop/Claude/_sandbox/pme-debrief-dryrun/` now holds the three cb4fb17e PDFs, the kit built from
cb4fb17e and `HOW-TO-CHECK-THE-PRINT.txt`. Older copies are in `_to_delete/`.

**CI:** see §0.1.

**Owner's print check (was PENDING-OWNER; run 2026-10-18):** the print preview in real Safari and Chrome (Task 4 Step
5). For each browser, record whether the report prints alone, whether the page breaks are right, where the footer
appears, and anything unreadable. Safari is expected to show the footer only at the end of each section (D-8).

Run on the owner's Mac (macOS 27.0.1, Build 26A434), kit `pme-showcase-kit-62e521c3` (dev build), 2026-10-18:
- **Chrome 155 (Skia/PDF m155): PASS** — the report alone, breaks right, footer "For education only. Not a medical
  device: never use it for patient care. Build 62e521c3 2026-10-13." with "Page n of N" on 5 of 5 pages.
- **Safari 27.0.1 (Quartz PDFContext): PASS with the known limit** — footer on pages 1, 3, 4, 5; none on page 2
  (Trends). The owner ruled the per-section footer **acceptable**.

## 0.1 CI on PR #60

**Run 38208532262** (head 071f5ad6, the formal gate's evidence commit):
- These jobs passed: renderer, build, `e2e (chromium)` and the nine `test-slow` groups (`slow`, `slow-a`…`slow-g`,
  `showcase`).
- `e2e (chromium)`: 106 passed, 3 skipped, no retry-only passes.
- **`e2e (webkit)` failed**: 71 passed, 36 skipped, 1 flaky, 1 failed.

**Finding (retry-only pass, CI WebKit):** `scenario-choose-another.e2e.ts:14` "the scenario library opened before the
first repaint stays open until a scenario is loaded" passed on retry #1. On the first attempt the panel was not visible
within 10 s. This test comes from main (#56), not from this stage.

**Finding (failed, CI WebKit), now fixed as DV-3:** `stage13-debrief.e2e.ts` failed all three attempts. The first
attempt failed at line 55 (`^01:00 Scenario Scenario state: Anaphylaxis$` matched no row), and both retries at line 53
(the undone first-reaction row at `01:00`).
- **Diagnosis, a hypothesis:** CI keeps no row dump. On the 2-vCPU Linux WebKit runner the host advances the engine in
  coarser catch-up steps, so the scenario's 60 s state event lands at 01:01 or later. On macOS it always lands at 01:00.
- **Fix (DV-3, test only, orchestrator approval 2026-10-12):** lines 53, 55 and 70 now match `01:0\d`, and line 59
  matches `00:0\d`. The row-existence, count and undo checks are unchanged.
- **Local re-check after the change:** passes on macOS on both engines (Chromium 43.0 s, WebKit 44.3 s). The CI result is in the PR's next run.

**Retry-only passes so far:** `stage4b-device.e2e.ts:72` (local Chromium, §0) and `scenario-choose-another.e2e.ts:14`
(CI WebKit).

## 1. Blocks and commits

- **Task 0:** `check.py --base-dir . --variant b` on the merged tree (stage-12 + stage-11): **32 blocks + 9 creates,
  27 files, 0 problems**. No Stage 10 Task 6 or Stage 12 hunk moved an anchor, so nothing was re-anchored. The
  main-path variant fails only Task 3's induction and tamponade finds, which the plan expects.
- **Gate Step 1:** against a detached checkout of the new `origin/main` c7d9b51c, variant b: **0 problems**.
- Every block was applied mechanically from the plan text with check.py's parser, task by task. None was re-typed.
- **Commits:**
  - df05445d — the plan copy
  - 9a6b98c3 — T1, the run record
  - b7a966ab — T2, the rules and the evaluator
  - 12730fc2 — T3, Appendix B
  - 4ac573c6 — T4, the Debrief view
  - 8d6a2275 — merge of `origin/main`
  - Each commit was pushed.
- **Red runs, as the plan expects:**
  - T1 and T2: the import does not resolve.
  - T3: 4 failures. The lint finds 0 rules ("expected 0 to be ≥ 7"), no draft is marked, and the anaphylaxis and
    induction statuses are "not assessable".
  - T4: no "Debrief" link in the session bar.

## 2. Task-level results

| task | result |
|---|---|
| T1 | `record.test.ts` 7/7 (the Stage 10 fast-forward case ran rather than being skipped); `fu11-link-timeline` 1, `events` 3; tsc 0 |
| T2 | `debrief.test.ts` 24 + `copy` + `showcase`: 30/30; controller `test/scenario` **107**/107 (the plan said 106: the merged stages add one); both tsc 0 |
| T3 (App. B) | `debrief-showcase` 4 + `showcase` + `showcase-cards` (its one-line `objectiveText` change) + `copy`: 22/22; tsc 0; no other code reads objectives as raw strings |
| T4 | `stage13-debrief` Chromium 42.5 s and WebKit 43.1 s; `stage9-a11y` + `stage9-app` 7/7; `s10-time-control` + `s12-mobile-learner` 4 passed, 1 skipped (the opt-in `PME_S10_MEASURE` test); `router` + `shell.dom` 10/10; tsc 0 |
| Task 0 before-numbers | `showcase` + `copy` 6/6; `showcase-clock` (Chromium) passed, 20.7 s |

## 3. Full suites (once, on 8d6a2275)

| check | result |
|---|---|
| `pnpm -r typecheck` | clean (8 packages) |
| `PME_TEST_SET=fast pnpm -r test` | audio 11/65 · skins 21/191 · engine-core 325 files, 1430 passed, 1 skipped · controller 56 files, 275/276 · ventilator 21/106 · renderer 32/109 · validation 35 (+1 skipped)/119 (+11 skipped) · demo 35/271 |
| load-related failures, each re-run | engine-core: every test passed, but vitest reported 2 worker RPC timeouts (`onTaskUpdate`) at load ≈ 200. The re-run had 0 errors but 1 timing assertion over (`truth-event` 1.06 ms against < 1 ms); that file alone passed 5/5. Controller: the `s10-fast-forward` wall-time pacing check failed (7510 ms against < 4000 at load ≈ 200); alone it passed 8/8. Ventilator: 5 worker RPC timeouts; the re-run was clean, 106/106 |
| `PME_TEST_SET=showcase vitest run` (apps/demo) | **5 files, 20 passed** (333 s), the same as Stage 11's gate |
| `npx playwright test --retries=0` (both engines, 4 workers) | 212 tests: first pass 137 passed, 34 failed, 41 skipped (opt-in) |
| why 34 failed, and the re-run | 10 failures were `iife-smoke` and `stage6a-worker` on both engines: the fresh worktree had no `packages/renderer/dist` (CI builds first). The other 24 were timeouts or timing at load 180–260, plus the §4 flake. After `pnpm -r build`, `--last-failed` at load ≈ 14: **34/34 passed** |

## 4. A flaky assertion in this stage's own e2e (for the orchestrator)

`stage13-debrief.e2e.ts` line 59 `expect(has(/^00:00 Patient Ventilated breaths began$/)).toHaveLength(1)` failed 4 times
in about 16 runs on both engines: once in the full run, once in the evidence run, and 2 in 10 repeats.

The rows were dumped with a temporary, uncommitted log line:

- In a failing run, the single kept row reads `00:01 Patient Ventilated breaths began`. The first breath began just
  before the bookmark at 00:01.
- In a passing run, it began at 00:00.

Either way there is exactly one "began" row and it is not undone, so the record behaves as D-2 says and only the clock in
the regex is too tight. The plan's test was **not edited** in this dry run. Proposed one-line fix, for a ruling:
`/^00:0[01] Patient Ventilated breaths began$/`.

## 5. Evidence (`PME_SHOTS=1`, on 8d6a2275: a clean tree, so the build id has no "+")

- **`docs/gates/stage-13/debrief.pdf`** (Chromium `page.pdf`): **5 A4 pages** (594.96 × 841.92 pt), titled "Debrief
  Anaphylaxis under anaesthesia 2026-10-11".
  - Page 1: the header, objectives and facts (with the labs row).
  - Pages 2–3: trends (the temperature chart on page 3), then drugs and fluids.
  - Page 4: the timeline (the undone rows struck through), bookmarks and notes.
  - Page 5: the minute appendix.
  - Every page ends with the footer, "Build 8d6a2275 2026-10-11." and "Page n of 5".
- `debrief-print-chromium.png` and `debrief-print-webkit.png` are print-media full-page screenshots. WebKit shows the four
  footer lines: after the facts, after drugs and fluids, after the notes and after the appendix.
- The WebKit evidence run first hit the §4 flake. It was re-run for WebKit only and passed; the Chromium PDF and
  screenshot come from the first run, which passed.

## 6. Rehearsal (the kit built from 8d6a2275, perl server, 1440 × 900, both engines)

**How it was run.** The kit was built with `make-bundle.mjs`. Stage 11's unchanged `rehearsal.showcase.ts` ran through a
scratch wrapper (outside the repo) that adds an `afterEach`. After the MH and tamponade cards, that hook opens the Debrief,
fills "Run by", emulates print, takes a full-page screenshot and, on Chromium, prints `page.pdf`.

**Result:** 16 tests (six cards, plus the induction rescue variant and the second-load clock test) on both engines.
- **15 passed on the first run.**
- **WebKit anaphylaxis failed on the first run**, at load ≈ 200. The "Give epinephrine 100 µg" click was lost: the state
  stayed `anaphylaxis` and the systolic fell to 39. In Stage 11's gate that state became `treatedByButton` at the press.
- Re-run alone at low load, it passed (systolic above 110 at 11.5 s).
- The run sheets are in `docs/gates/stage-13/rehearsal/run-sheet-*.md`. `docs/showcase/` was restored to the committed
  state.

**The Debrief at the end of MH and tamponade** (`docs/gates/stage-13/rehearsal/`):
- MH: 36 timeline rows, 42 minute rows, **PDF 7 A4 pages**.
- Tamponade: 25 timeline rows, 16 minute rows, **PDF 5 A4 pages**.
- Footer and build on every page; the WebKit print screenshots are in the same folder.
- Neither card ended in a state with no transitions, so the Debrief link was not marked (`data-ready` false). This is
  the expected D-7 behaviour.

The verdicts judge the rehearsal script's own timing, and the rules read them correctly:

- **MH (Chromium / WebKit):**
  - "Call the crisis within 120 s of the early signs": not met. The script waits for the established crisis, 13 min.
  - Dantrolene within 300 s: met (1 min 04 s / 1 min 09 s).
  - "Repeat dantrolene": not assessable (no rule).
  - Potassium within 300 s of K⁺ > 5.5: not met (5 min 53 s / 5 min 15 s; the script treats K⁺ 2 min after the call).
  - Ventilation back within 300 s of EtCO₂ < 40 after the trigger is off: met (2 min 06 s / 2 min 24 s; the R50 `from`
    rule behaves as designed).
- **Tamponade:**
  - Naming the tamponade: not assessable (no rule).
  - CPR within 10 s of the pulse loss: not met (14 s / 33 s). The truth's pulse loss comes before the card's `pea`
    state, and the script then waits 10 s more.
  - Pericardiocentesis within 120 s of CPR: not met (2 min 06 s / 2 min 12 s; the script waits 120 s and then presses).
  - "Pulse back" within 30 s: not met at 35 s on Chromium, met at 28 s on WebKit.
  - "Better: pericardiocentesis before the pulse loss": not met.

## 7. Not done in the dry run

- The hand check of the print preview in real Safari and Chrome was PENDING-OWNER here; the owner ran it on
  2026-10-18: PASS in Chrome, PASS in Safari with the known footer limit (§0).
- The PR and the formal gate were done afterwards (§0).

## 8. For the owner (Q5): draft numbers to confirm

Each is marked "(debrief: … — draft, owner to confirm)" in the card text:

- epinephrine within 2 min of the reaction
- CPR within 30 s of the pulse loss
- the pulse back within 6 min
- ventilated within 90 s of the apnoea alarm
- drained within 5 min

Appendix B adds rules to Stage 11's cards with that card table's own numbers.

The rehearsal shows that the run sheet's presenter timing misses several of them: tamponade CPR within 10 s, drainage
within 120 s of CPR, and MH's call within 120 s and potassium within 300 s. If the cards should be "met" when the
presenter follows the run sheet, either the run sheet or the numbers need to change. That is the owner's call, not this
stage's.

The trend axes auto-scale to the data. A 96–99 % SpO₂ chart therefore shows a 3-point change as full height, though the
printed axis range says so.

## 9. After the dry run (orchestrator decisions, 2026-10-11)

- **DV-1 (test only, 337bb3c9).** The §4 assertion now matches `00:0[01]`. Exactly one "began" row is still asserted.
- **DV-2 (908ade09).** Each trend chart's axis has a least span, centred on the data when their range is smaller:
  - SpO₂ 20 points, never above 100
  - HR 40 bpm
  - ART M / NIBP M 40 mmHg
  - EtCO₂ 20 mmHg
  - temperature 2 °C
  - never below zero when the data are not
  - RR has no floor and keeps its old behaviour (± 1 when flat)

  This is `axisRange` in `debrief.ts`, with one unit test. It closes the §8 note on the SpO₂ axis.
- **Evidence regenerated:**
  - `debrief.pdf` and both print screenshots on 908ade09: 5 A4 pages, footer and "Build 908ade09" on every page. Both
    engines passed, including DV-1.
  - The MH and tamponade Debriefs on a kit built from 58b2c13c (908ade09 plus the evidence commit, docs only), both
    engines, all 4 passed: MH 7 A4 pages, tamponade 5 A4 pages, footer and "Build 58b2c13c" on every page.
  - The run sheets of those two cards were refreshed. In this run MH's potassium objective was met: the presenter's
    timing varies from run to run.
  - The owner's folder now holds these PDFs and the kit built from 58b2c13c. The 8d6a2275 copies were moved to
    `_to_delete/`.
- The full suites were not re-run (orchestrator: not until "merge main and open the PR").
