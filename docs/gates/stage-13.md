# Gate note — Stage 13: the debrief report (print to PDF) — DRAFT

**PRE-MERGE DRY RUN on `8d6a2275`** (orchestrator ruling 2026-10-11). This is not the gate. `origin/main` (`c7d9b51c`)
holds Stage 11 and the WebKit fix but not Stage 10, Stage 12 or FU-11 d, so no PR is open. Re-run this gate once they
have merged.

Branch `stage-13` was cut from `origin/stage-12` (6c412b18) with `origin/stage-11` merged in (0fdef0c0, no conflict).
Then `origin/main` c7d9b51c was merged in (8d6a2275). That merge was clean: it brought only the WebKit skip in
`fu11-vent-restore.e2e.ts`. Plan: `docs/plans/stage-13-debrief.md` (READY, R50). Executor: one session (Claude Opus 5.5),
Tasks 0–4 in order. Task 3 took the Appendix B path because Stage 11's cards have string objectives. The Mac is shared
with other executors: the load average was 180–260 during the first suite runs and about 10–50 afterwards.

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

## 7. Not done in this dry run (for the real gate)

- **The hand check of the print preview in real Safari and Chrome (Task 4 Step 5).** An agent cannot drive the print
  dialog. The kit, the three PDFs and a how-to note are in `Desktop/Claude/_sandbox/pme-debrief-dryrun/` for the owner.
  Record the result here.
- The PR. It is opened only once `origin/main` contains Stage 10, Stage 12 and FU-11 d. The real gate then re-runs
  Gate Steps 1–3 on the new main.

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
