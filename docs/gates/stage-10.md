# Gate note — Stage 10: time control (×8 and a paced 5- or 2-minute fast-forward)

**DRAFT — pre-merge dry run on `21e57186`** (branch `stage-10`; app code as of `bae65d22`). `origin/main` (`c7d9b51c`) does
NOT yet contain FU-11 (d) (PR #49 open), so no PR is opened. When d merges, what remains is: `git merge origin/main`, the
block re-check, a short re-run of the e2e and unit suites touched by the merge, and the PR. Every number below is seed 7 on
this Mac (Apple M3, 8 cores), shared with other executors and headless jobs; load averages are given where they mattered.

Plan: `docs/plans/stage-10-time-control.md` (REVIEWED-FIXED 2026-10-10). Executor: one local session (Claude Opus 5.5).

## 1. Base, blocks and commits

- **Base (orchestrator ruling 2026-10-11 12:30):** `stage-10` was cut from `origin/fu-11-d` `4efb794e` (main `26e78308` +
  FU-11 d + the merge of `origin/fix-main-webkit`), not from `origin/main`, so that it carries what main will be once #50
  and #49 merge.
- **Block check (Task 0):** `check.py … --base-dir .` on `4efb794e`: **114 blocks + 10 creates, 37 files: 0 problems.** The
  fix branch's four files (`views/vent.ts`, `monitor-core.ts`, two tests) moved no Stage 10 anchor.
- **Tasks 1–5:** every block applied mechanically, task by task, in plan order — **no block re-anchored, no drift**. The
  FU-11 prototype text the plan was cut against matches the merged a/b/c/d text at every one of the 114 places.
- **Gate G1 dry run — `git merge origin/main`** (`c7d9b51c`: Stage 11's six cards, #50's WebKit fix, the WebKit-only skip
  of `fu11-vent-restore`): **clean, no conflict** (merge commit `5e5282c0`). Block re-check on `origin/fu-11-d` merged with
  `origin/main` (a detached scratch tree, removed after): **114 blocks + 10 creates, 37 files: 0 problems.**
- Commits on the branch (each pushed): the plan; T1 `d2c8ff9b`; T2 `3fedd5ff`; T3 `15b6626f`; T4 `c793de77`; T5 `74eb75b0`;
  T6 `60405f2f`; the main merge `5e5282c0`; two gate fixes `854219c5`, `bae65d22` (§4); the gate's showcase script `21e57186`.

Red runs as the plan expects: T1 3 failed (clock) + 2 (`s10-speed`); T2 7; T3 9; T4 2 + 1 (the documenting test passes by
design); T5 3 + the DOM file not loading, and the e2e failing at the "Fast-forward 5 min" button.

## 2. Task 6 (added by the orchestrator, 2026-10-11): the viewer leapt ahead after a host resume

- **Cause:** the app's engine emits `state` once per simulated second and the host sends nothing while paused, so on the
  host's resume `ViewerSync.follow()` projected the last pre-pause anchor forward by min(pause, 3 s) × rate.
- **Fix** (`packages/controller/src/session/viewer-sync.ts`): the host's `commandApplied` for `time resume` (not a sticky
  replay) re-anchors at the host's tick of the resume on the wall clock of now. The brief said "`anchor.wallMs = now`";
  the anchor's TIME is reset too (to the resume's tick, which is exact while the host is paused), because keeping the stale
  pre-pause time would freeze the viewer for up to one simulated second after every resume. The end of a fast-forward
  already drops the anchor (`requestSync(true)`) and the end snapshot re-anchors at now — commented, no code change.
- **Test** `packages/controller/test/session/s10-viewer-anchor.test.ts` (2): a 6 s pause at ×2; a pause, a 60 s
  fast-forward while paused, a 6 s wait, a resume. Red before the fix: the viewer led the host by **5.9 s** in both (the
  measured bug: 8.5 → 14.0 s while the host was at 9.2 s). Green after: never ahead (< 0.05 s), ran 3 s × 2 with the host,
  within 0.5 s of it, no resync. `fu11-follower` + `s10-time-control` e2e: **8 passed, 2 skipped** (measure), both engines.

## 3. Suites (G2)

| check | result |
|---|---|
| `pnpm -r typecheck` | clean (after the merge and after each fix) |
| engine-core `CI=1 PME_TEST_SET=fast vitest run` | **325 files, 1430 passed, 1 skipped**. The first run (load 150–265) had every test pass but one vitest RPC "Timeout calling onTaskUpdate" (exit 1); the re-run at load ≈ 50: clean, exit 0 |
| audio / skins / validation / ventilator | 11 / 65 · 21 / 191 · 36 files, 119 passed, 11 skipped · 21 / 106 |
| controller | **54 files, 263 passed** (re-run at load ≈ 20). The first run at load ≈ 260 failed one: the 1.5 s pace test took 5.78 s (bound 4 s: CPU, not pacing); alone it passed |
| renderer | **31 files, 107 passed** (after the seam fix, §4) |
| demo (`vitest run`) | **35 files, 242 passed** (after the span-wording fix, §4) |
| `pnpm --filter @pme/renderer build` | built |
| full e2e `npx playwright test --retries=0`, both engines | 204 tests: **144 passed, 41 skipped, 19 failed** — all 19 Chromium, all during load 100–265 (other executors' vitest pools); `--last-failed` at load ≈ 10: **19 passed**. WebKit (1 worker): no failure. The 41 skips are the existing ones (WebKit skips in `audit-worker`, `fu5-*`, `stage4b-device`, `vent-link`, `fu11-vent-restore` …) plus Stage 10's 2 measure tests |
| `git status docs/gates` after the e2e | clean apart from this gate's folder (FU-11 K1) |

## 4. Two defects found by the dry run and fixed (red → green, both engines)

1. **"FAST FORWARD · 120 S" instead of "· 2 MIN"** (`854219c5`). The panel, banner and log compute the span as
   `toT − fromT`, which for most start times is a few ULPs off a whole second (604.3 − 484.3 = 119.99999999999994), so
   `spanText` fell back to seconds. Seen in 5 of 8 spans of the first card run. `spanText` rounds to the second first; a
   unit test over five start ticks (`s10-fast-forward.test.ts`). The e2e had passed because its start time subtracted
   cleanly.
2. **The seam's time label vanished at once** (`bae65d22`). It was drawn to the right of the seam, AHEAD of the sweep
   cursor, where the erase gap clears every frame: on every lane with a trace it was gone within half a second and only the
   line stayed (the first screenshots on both engines; only the empty IBP2 lane kept its "07:25"). It is now right-aligned
   to the left of the line, in the trace already drawn, and lasts until the next lap like the line (`Ctx2D` gains
   `textAlign`). Test: no clear covers the label in the 1 s of frames after the span (29 clears covered it before).
   Screenshots `ff-seam-banner-monitor-*.jpg`: the time on every lane.

## 5. Measurements (G3) — on a kit built from the branch, alone (load 12–30)

`scripts/showcase/s10-time.showcase.ts` `-g measure` on the kit (`854219c5`, perl launcher, 1440×900) and the plan's own
`s10-time-control -g measure` on the dev server, one worker:

| | Chromium kit | WebKit kit | Chromium dev | WebKit dev | prototype (dev) | pass |
|---|---|---|---|---|---|---|
| ×8 rate, anaphylaxis, 30 s | ×8.01 | ×8.01 | ×8.00 | ×8.01 | ×8.00 / ×8.00 | ≥ 7.8 |
| main-thread frames p50 / p95 / max | 16.7 / 16.8 / 17 | 17.0 / 19.0 / 38 | 16.7 / 16.7 / 17 | 17.0 / 19.0 / 30 | 16.7/16.8/17 · 17.0/18.0/36 | — |
| ×8 rate, bronchospasm + Ventilator view | ×8.00 | ×8.01 | ×7.99 | ×8.00 | ×8.00 / ×8.00 | ≥ 7.8 |
| frames with the cockpit | 16.7 / 16.7 / 17 | 17.0 / 18.0 / 85 | 16.7 / 16.7 / 17 | 17.0 / 19.0 / 53 | 16.7/16.7/17 · 17.0/20.0/68 | — |
| 300 s fast-forward, anaphylaxis | 10.00 s | 10.01 s | 10.00 s | 10.01 s | 10.01 / 10.03 s | 9.5–13 s |
| 300 s fast-forward, bronchospasm + cockpit stepping | 10.00 s | 10.00 s | 9.99 s | 10.01 s | 10.00 / 11.57 s | 9.5–13 s |

All inside the gate's bounds (the prototype's 11.57 s for WebKit with the cockpit was measured at load 18–30; here 10.00 s).

## 6. The showcase (G4)

**(a) Stage 11's eight-case rehearsal, unchanged, at ×4** (`rehearsal.showcase.ts`, kit `854219c5`, perl launcher, both
engines, 2 workers): **16 passed (27.8 min)**; every check passes on both engines, as at Stage 11's gate. Compared case by
case with `docs/gates/stage-11/showcase/results/`: the same checks pass and the observed numbers differ only by the
rehearsal's press timing (it polls every 500 ms of wall time = 2 s of sim at ×4): e.g. apnoea alarm 55.9 → 54.7 s
(Chromium), ephedrine recovery 96.2 → 98.2 s (WebKit), MH lowest systolic after the call 108.7 → 114 (Chromium), tamponade
systolic after stopping CPR 110.5 → 110. ×1–×4 behaviour is unchanged. Evidence: `docs/gates/stage-10/showcase/`
(`docs/showcase` was restored with `git checkout`).

**(b) The Stage 10 cards** (`s10-time.showcase.ts`, kit `bae65d22`, both engines): **8 passed**; ×8 and the fast-forward in
three cards plus the Ventilator view. Per case and engine (JSON in `docs/gates/stage-10/s10-cards/`):

| card | what is exercised | result (Chromium / WebKit) |
|---|---|---|
| Malignant hyperthermia | ×8 from load; three 5-min spans (two before the crisis, one after the treatment) | early signs 6.8 / 6.9 min; established 18.8 / 18.8 min (the state machine moved through the spans); recovering 9.2 / 9.3 min after dantrolene; lowest systolic after the call 114 / 114; spans 10.3–10.7 s of wall time |
| Tamponade | ×8; "Start CPR" then a 2-min span DURING CPR, the drainage, a second 2-min span (the pulse returns inside it); a second screen and a Remote open | PEA at 7.8 / 7.8 min; systolic 10–30 s after stopping CPR 112.6 / 114.9 (> 90); the panel on the Remote ("FAST FORWARD · 2 MIN") and the second screen mid-span; the second screen resynced after; spans 10.1–10.5 s |
| Healthy induction | 2 min at ×8 after "Induce now", then ×1 and a 2-min span on the full-screen monitor | 2 min of sim in 15.1 s; **0 beat tones at ×8**; CO2 APNEA 54.9 / 55.0 s after induction; the seam with its time on every lane |
| Bronchospasm + Ventilator view | a 2-min span with the cockpit ventilating | a cockpit frame on every tick, contiguous: 5 998 / 5 999; ≈ 250 frames in the 5 s after it (it keeps ventilating) |

Every span: exact (120.000 / 300.000 s of sim), the panel's clock running, the banner "Fast-forwarded N min, mm:ss → mm:ss.
During it: …", no console or page error on any window.

**Screenshots for the owner's sign-off of the look** (`docs/gates/stage-10/`, both engines, 1280 px):
- the amber panel with the dimmed, blurred page, the clock and the progress bar: `ff-panel-instructor-*`, `ff-panel-monitor-*`;
- the Ventilator view mid-span: `ff-panel-ventilator-*`; the second screen mid-span: `ff-panel-second-screen-*`; the Remote
  mid-span: `ff-panel-remote-*`;
- the post-span banner: `ff-banner-instructor-*`, `ff-seam-banner-monitor-*`; the waveform seam with its time:
  `ff-seam-banner-monitor-*`, `ff-seam-monitor-after-banner-*`; after the span: `ff-after-ventilator-*`,
  `ff-after-second-screen-*`.

**WebKit screenshots show the dimming but not the blur.** Measured (top-band luminance of the page with the veil on vs
hidden): Chromium 18.3 vs 37.1, WebKit 17.4 vs 35.1 — the page IS dimmed in both. The blur (`backdrop-filter`, with its
`-webkit-` twin; both computed as `blur(6px)` in WebKit) does not appear in Playwright-WebKit screenshots even on a minimal
static page, so it is a capture limitation; the owner should glance at it once in Safari.

Not done by hand (headless session): listening for the end cue and the absence of sound inside a span — the e2e checks both
(no tone scheduled inside the span; one 660 + 990 Hz cue ≥ 9 s after the click, none at the start; beat tones again at ×1).

## 7. For the orchestrator

1. **A card button pressed as the scenario changes state can be ignored silently** (pre-existing, Stage 9/11 panel; not a
   Stage 10 file). In WebKit, three presses across four runs of the MH card did nothing — no state change, no toast: once
   "Start surgery: rocuronium" (a run at load ≈ 200), twice "MH crisis …" pressed the instant the case reached
   "Established" (the same label is offered in "Early signs"). Likely mechanism, consistent with the code: the panel
   rebuilds its trigger buttons on every refresh (≈ 2 a second at every speed, measured), a button of the PREVIOUS state
   sends `scenario trigger` with that state's transition id, the runner refuses it (`no transition … in state …`) and the
   panel discards the answer (`void link.send(...)` in `panel/scenario.ts`), so the presenter sees nothing. ×8 and a
   fast-forward make state changes denser in wall time, so it is likelier at the demo. The Stage 10 card script records
   such a press as `notTaken` and presses again (the second press always took). Suggest an FU: show the refusal as a toast,
   or resolve the trigger by its label in the current state.
2. **Two Stage 10 defects fixed at this gate** (§4) — the plan's tests did not catch them; both now have a test.
3. **Task 6's fix resets the anchor's time as well as its wall time** (§2) — a small widening of the brief's wording.
4. **Left from the plan:** alarm PAUSE vs a higher-priority alarm (FU-11's B4 covers SILENCE only; Stage 10 neither changes
   nor undoes it); the owner's sign-off on the look (screenshots above).
5. **To finish once FU-11 d is on main:** `git fetch origin && git merge origin/main`; `check.py` against the merged base
   (expect 0 problems); typecheck; the controller, renderer and demo suites; `s10-time-control`, `fu11-follower`,
   `fu11-vent-*`, `stage9-app` e2e on both engines; tick G1–G5 in the plan copy; remove "DRAFT" here; open the PR
   (`gh pr create --base main --head stage-10`, title "Stage 10: time control — ×8 and a paced fast-forward (5 or 2 min)",
   the screenshots named in the body).
