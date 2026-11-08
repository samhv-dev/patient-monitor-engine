# 47 · The flaky cluster, second pass (brief 90)

Made on origin/main `86c7491b` (8 Nov 2026). Question: for every test that still fails its first attempt on main, what is
the mechanism, so the strict crash-aware retry gate (PR #308) and the end of WebKit warn-only (PR #285) can merge. A fix
is the mechanism, never a longer timeout or a wider tolerance. The first pass is PR #324 (brief 72).

## The data

- **30 `ci` runs on main**, 42284321017 (505bc5b3, 6 Nov 19:58 UTC) to 42413574849 (60c3382d, 7 Nov 20:58 UTC): every
  completed e2e job log (210 of 211; one log of run 42323065108 would not download) and every e2e report artefact (the
  JSON report holds each attempt's status, duration and error). The three newest main runs were still queued or running.
- **WebKit: 4 342 attempts, 1 809 test-minutes, 73 attempts ended "Target page, context or browser has been closed"**
  (the crash class). 115 first attempts failed in the 30 runs, on both browsers.
- Scripts and raw tables: the project's scratch folder `cluster-2-ci/` (`bin/extract.py` first-attempt failures from the
  logs, `bin/attempts.py` every attempt from the reports). Local measurements ran on a Mac shared with other executors
  (load average 55–87 on 8 cores): their times are under load, and unit suites there timed out (CI is the measurement).

## The table

"Runs" = runs of the 30 in which the test's first attempt failed. Crash = the page-closed wording.

| # | test | runs /30 | first-attempt error | mechanism, with the measurement | what this PR does |
|---|---|---|---|---|---|
| 1 | `time-control:31` (Chromium) | 2 (and 5 in brief 72's window of 6 Nov; #329 failed all 3) | `span.size` −Infinity at :186: no cockpit frame at all in the 2-min fast-forward | **Product: the re-linked cockpit, paused at its clock limit, never sends a frame.** Leaving the Ventilator view hands over (CockpitDesk.unlink: `time pause`, link detached); coming back links it through a NEW `attachMonitorToLink`, which learns its tick offset only from a `cmds` frame. The cockpit runs ≤ its `allowed` tick; paused exactly there it sends none, so the new link publishes no `clock` and `runTo` (the fast-forward's lockstep) resolves at once: no frames, and the patient is not ventilated. The brief's hypothesis (wall-clock sampling) is not it: the test's hook is on the frame port and saw zero frames because none were sent. Measured with the real engine (unit test): at the limit, 50 clocks before the re-link and 50 after, the cockpit's clock frozen; the same test with the cockpit short of its limit passes. | **Fix** (`vent-driver.ts`): the `resume` that links the cockpit lets it run 2·LEAD_TICKS past its own tick, as before its first clock. Red first: `packages/ventilator/test/link-relink.test.ts` (red on main, green with the fix). The e2e is untagged and asserts frames came. |
| 2 | `teach2-fit-panes:21` arrestPea / arrestAsystole | 8 (10 attempts); **failed all 3 attempts in 2 runs** | crash ×10: the 8 after PR #324 all inside `runToPhase`'s ×8 run (mh-v2-path.ts:61), the 2 before it in `to()` and `measure` | **The ×8 phase search raised the WebKit crash rate six-fold.** The three fit files crashed 0.015 times per test-minute in the 17 runs before PR #324 (fast-forward steps; 7 crashes in 460 test-min) and 0.091 in the 13 runs after it (×8 run; 22 crashes in 241 test-min, 18 of them inside the ×8 run). The other files: 0.042 before, 0.037 after. The crash is not memory piling up over a job (per 5 job-minutes: 0.038, 0.044, 0.041, 0.040), not the worker's event backlog (#310 on main: 0.035 before, 0.043 after), and not one test: per job the crash counts are close to a Poisson draw at 0.04/min (59 jobs 0, 34 one, 10 two, 5 three, 1 four of 109). It follows what the page does per wall second: behind the fast-forward's panel little is drawn; at ×8 a minute of the case every 7.5 s. | **Fix** (`ffToPhase`, mh-v2-path.ts): fast-forward steps shorter than the phase lasts, 120 s for the arrest phases (PEA lasts 4 min 20 s: entries 11:00–11:01, 15:21–15:24). Local, under load: PEA 1.6 min Chromium / 2.7 min WebKit, asystole 2.3 / 3.5 (limit 6). |
| 3 | `teach2-fit-stages:83`; `:20` | 4; 0 | :83 crash ×2 (one inside the ×8 run, one at a press), row still "ready" ×2 (both before #324) | crash: as row 2. The "row not taken" signature has not been seen in the 13 runs since #324, which added its diagnostic. :20 did not fail in the 30. | `ffToPhase`, 30-s steps (every MH phase on the path lasts ≥ 60 s) |
| 4 | `teach2-fit-strip:17`; `:75`; `:119` | 7 (9 attempts; **all 3 in 1 run**); 0; 1 | crash (5 of 9 after #324, 3 inside the ×8 run) | as row 2 | as row 3 |
| 5 | `monitor-worker-busy:25` | 2 | crash at :36 | crash class (base rate) | — |
| 6 | `saadat-instructor-tiles:143` | 4 | crash | crash class (base rate) | — |
| 7 | `saadat-bfi-etaa-row:116`; `:106` | 4; 1 | crash ×3 + one 60-s poll `false` (before #310) | crash class; the poll: one sighting, before #310 | — |
| 8 | `sim-line:63` | 3 | the learner window never `synced` in 30 s ×2; "Execution context was destroyed" at go() ×1 | sync: the host had sent its snapshot (`snapshotsSent: 1`), the window's transport `open`, sync `waiting`: the same-browser follower link losing the snapshot, the class of F-49-2 (CI Linux WebKit's BroadcastChannel drop), not found further. Navigation: **not found**. No code path navigates the host page on these routes; the error context showed a follower's page ("Waiting for the instructor: …"). A cold Vite dependency re-optimisation (a full reload) was tested and rejected (the scanner finds every dependency; cold and warm both pass). | **Diagnostic**: the route loop's failure names the route, each window's loads and the open pages |
| 9 | `mobile-learner:232` (Chromium) | 0 on Chromium (24 runs); WebKit 1 (the same test, then at :230: the picker's text) | #333's run: the phone not `synced` in 30 s at :260 | not seen on main's Chromium in 30 runs; #333's own runs show its engine running slow (row 10) | left to PR #333 |
| 10 | `case-briefing:52` (Chromium) | 0 | #333: failed all 3 attempts in both its runs, "the monitor keeps running": 1.6–2.0 sim-s where > 2.5 | **#333's own**: never failed on main in 30 runs (24 Chromium runs, 30 WebKit) | left to PR #333 |
| 11 | quarantine: `organs-page:36`, `pacer-overlay-device-tab:34`, `vent-embed:34`, `debrief:230`, `validation-bedside:19` | 1, 6, 14, 1, 0 | organs, debrief: crash. pacer: 0 events from the device-layer page's hook within 5 s, at 6.2–7.0 s. vent-embed: awRR 9–17 where 14 (13), crash (1) | organs, debrief: crash class. pacer, vent-embed: **not found** (pacer: a cold Vite cache tested and rejected). validation-bedside: not seen. | stay tagged |
| 12 | brief 72's "not found": `teach2-mh-v2:31`, `fx24:139`, `fx14:37`, `ui-polish-b:18`, `physiology-console:54` | 2, 1, 1, 0, 0 | mh-v2: crash, row "ready" (before #324); fx24: 2 frames off (before #310); fx14: crash | no new sighting since #324 of the non-crash ones | — |

Other gating first-attempt failures in the 30 runs, each seen once, none with a mechanism: `debrief:202` (URL empty 5 s
after `#/teach2`), `debrief:533` and `finish-restart-v2:18` (a row still "ready", both before #324), `monitor-return-controls:26`,
`reload-keeps-case:111`, `room-qr-tab-guard:91`, `same-drug-lock:23`, `teach2-keys:99`, `ui-polish-a:22` and `:52` (both
before #310), Chromium `mobile-learner:93` (the afterEach hook ran into the 300-s limit).

## The crash's reason

The crash class is WebKit's web process ending under the test: Playwright reports "Target page, context or browser has
been closed" with no time-out. On CI the logs carry nothing from the browser. Playwright's WebKit is still build 2359,
the build in which the F-FX1-1 trial of October read the reason from the browser's stderr: a segfault in the WPE
`ThreadedCompositor` thread (libWPEWebKit-2.0.so.1.12.0 +0x60a0f8a, 9 of 10; one SIGILL), after a 15–25 s stall. It
cannot be reproduced on this Mac (macOS WebKit is not the WPE build; no Linux container here). This PR's first CI run
(42425121022, head 82a7e206) set `DEBUG=pw:browser` on the WebKit e2e step to read it there. One attempt crashed in that
run (`mobile-learner:232`, WebKit 3/3, at 25.8 s), and the browser wrote **nothing** about it: its last stderr line
before the crash was the per-context "is-controlled-by-automation" notice, then, after the test, a graceful close with
exit code 0. The UI process does not report the web process's death on stderr, and the log cost 642 lines a run, so
the setting was taken out again. Reading the fault itself needs what the October trial had, the kernel's segfault line (dmesg), or a core dump; not
tried here. What the data here do show: the rate is a property of the page's
work per wall second (row 2: ×8 six-fold; the fast-forward's panel lower than ordinary running), not of memory over a
job, not of the worker's event backlog, and not of one test.

## For PR #308 (the strict crash-aware gate)

A crashed first attempt passes the gate by design, and most of the retry-only passes are crashes (73 WebKit attempts crashed in the 30 runs). What would
fail jobs under #308 is the non-crash first attempts in gating jobs. In the 19 main runs since #310 merged there were
11 of them in 9 runs (time-control:31 ×2 Chromium, mobile-learner:93 Chromium, and on WebKit fit-stages:83, teach2-keys:99,
teach2-mh-v2:31, debrief:202, same-drug-lock:23, mobile-learner:230, sim-line:63 ×2). This PR removes the two
time-control ones (a mechanism, fixed) and should make the fit files' crash-on-every-attempt runs rare (row 2; two of the
30 runs failed for that under any gate). That leaves about 8 of 19 runs with a single non-crash first attempt, each test
seen once or twice, none with a mechanism. **Recommendation: #308 does not merge yet.** Merged today, it would have
failed about 4 in 10 of main's runs on tests that have no mechanism, so the gate would mostly ask for re-reads of
one-off sightings. What would move it: the next sighting of each with the diagnostics now in place (#324's press
diagnostic, this PR's sim-line diagnostic, WebKit's stderr), and a decision whether a test seen once in 30 runs is a
mechanism to find before the gate or a finding the gate records.

## This PR's own CI runs

- **42425121022 (head 82a7e206, `DEBUG=pw:browser` on):** every e2e job passed. The fit tests all passed on their first
  attempt: `teach2-fit-panes:21`, and `time-control:31` on Chromium. One `unit (rest)` failure: `model-docs.test.ts`,
  because the new test file was not yet listed in `docs/model` (regenerated in the next commit). One WebKit crash,
  `mobile-learner:232`, with nothing about it on WebKit's stderr (above).
- **42427744198 (head 60b83801): all jobs pass.** `teach2-fit-panes:21` ran PEA 1.4 / 1.6 min and asystole 2.0 / 2.0 min
  (both cases, CI WebKit). `time-control:31` on Chromium passed first try in 39.0 s. Retry-only passes:
  - crash class: `reload-keeps-case:191`, `saadat-instructor-tiles:143`;
  - quarantine: `vent-embed:34` (awRR 15 where 14);
  - **new, not crash**: `restart-keeps-case:19` (WebKit): the v2 header's title was "" where "Healthy induction" was
    expected, on the first attempt at 29.4 s; the retry passed in 6.7 s. It was not seen on main in the 30 runs and it is in
    a file this PR does not touch, so it is a finding.
- Local, after the overnight load dropped (load average 6): with the fix the link tests (`link-relink`, `link-restore`,
  `ports`, `fx1-frame-port`) pass 13/13; `link-relink.test.ts` against main's `vent-driver.ts` fails ("a clock from
  the new link: expected 50 to be greater than 50").
