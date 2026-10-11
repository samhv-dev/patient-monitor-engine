# Fix: the CI WebKit end-to-end step (fix-ci-webkit-3)

Branch `fix-ci-webkit-3` from `origin/main` 25f06bac. Test design and CI workflow only: no product, physiology or band
change. Evidence: the build job logs of main runs 38172300684 (attempt 1 and its rerun, attempt 2), 38165615739,
38161262512 and PR runs 38163354933 (attempts 1 and 2), 38172603508, 38148717527 (`gh run view <id> [--attempt n] --log`).

Classes: **(a)** a wall-clock or runner-speed measurement, not a product band; **(b)** a product-behaviour assertion
that failed because its precondition was reached late (needs a wait on state, not a looser check); **(c)** a genuine
product defect signal; **(r)** no assertion failed: the WebKit page or browser closed under the test (a crash), which
retries are for.

## Classification

"3/3" = failed on every attempt (the job went red); "retry-n" = passed only on retry n.

| Test (WebKit unless said) | Failing assertion | Log evidence (run: outcome, received vs expected) | Class | What changed |
|---|---|---|---|---|
| `fu11-restore.e2e.ts:15` Return here | `expect.poll(link.simT, 5 s) < tMark + 5` after "Return" | 38163354933 a1 **3/3** (13.08 vs < 6.02; 22.55 vs < 5.51; 13.09 vs < 5.69); 38172300684 a1 **3/3** (17.15 vs < 5.52; 7.04 vs < 6.11; 13.02); retry-2 on 38161262512 (44.02 vs < 6.79; 10.26 vs < 5.91), 38163354933 a2 (9.02; 17.35 vs < 5.71); retry-1 on 38148717527 (19.3 vs < 7) | (a) | At ×4 the restored clock passes tMark + 5 within 1.25 s of wall time; the test read it by polling from outside the page, and one poll round trip on CI's WebKit took longer. 10 of the 11 reads lie inside the envelope of a correct restore seen late (≤ tMark + 5 + 4 × 5 s); one (44.02, first attempt on 38161262512) does not and is unexplained by the log. Not FX-1 on the evidence: FX-1 (`vent-view-restore` / `vent-view-speed`) is the Ventilator cockpit dropping out after a ×4 restore; this test never opens the Ventilator view and its trend and sweep checks never failed. The fixed test records the panel clock IN the page on every link update and prints the restore's wall latency, so the PR's CI run settles the 44.02 read (see "CI runs"). |
| `stage6a-worker.e2e.ts:24` MonitorHandle snapshot/restore/role (worker: auto) | `c < a + 10` (tick after `restore(a)`) | 38172300684 a1 **3/3** (163 vs < 162; 95 vs < 83; c−a = 11, 22, 27); retry-2 on 38163354933 a1 (89 vs < 68; 100 vs < 63), 38165615739 (67 vs < 62; c−a 15, 14); retry-1 on 38172603508 (99 vs < 82). Never on `worker: off`, never on Chromium | (a) | `MonitorCore.restore` resets the frame clock (`lastEpoch = null`, so the restore's own wall time is not sim time); c − a therefore counts the frames the worker drew between the `restored` reply and the next `snapshot` reply (≤ 12.5 ticks per frame). A count of runner frames, not where the restore put the clock. Now restored on a paused clock: `c === a` exactly (tighter), then resumed and `d > c`. |
| `fu11-explore-baseline.e2e.ts:14` baseline taken at 1 min although opened later | `getByText(/Changes are from the baseline at 01:0\d/)` visible within 5 s of opening Explore | retry-1 on 38161262512 and 38172300684 a1 ("element(s) not found", 34.5 s and 38.4 s attempts) | (b) | The log cannot tell a late draw from a wrong time (a regex locator finds nothing either way). The stamp is now waited for (≤ 20 s) and THEN its time is checked against the unchanged 01:00–01:09 window, so a wrong baseline time fails on the time with the stamp's text in the message. Waits on sim time (simNow > 90) 40 → 60 s. |
| `fu11-explore-baseline.e2e.ts:23` restore before the baseline drops it | same locator, line 32 (first Explore visit, before the restore) | 38172300684 a2 **3/3** (the rerun of main: red); retry-1 on 38161262512; 38165615739: page closed at 30.2 s of a 120 s test (class r) then passed | (b) (+ r once) | As above, at both checks; "The baseline is set at 1 minute." 5 → 20 s; simNow waits 40 → 60 s; test timeout 120 → 180 s. |
| `showcase-clock.e2e.ts:19` loading another scenario restarts the clock | (1) `Load` click: 90 s test timeout, "element is not visible" after "Choose another scenario"; (2) `|link.simT − session.simNow()| < 2` | (1) 38163354933 a1 (WebKit, retry-1), 38165615739 **Chromium** 2 attempts (retry-2); (2) 38165615739 WebKit 2.868, 2.244 (retry-2), 38172300684 a1 2.332 (retry-1) | (1) **(c)** F-CW3-1 + (b) for this test; (2) (a) | (1) The Scenario tab's first repaint resets "Choose another scenario" (product defect, below): the test now waits for that repaint (the running case's title) before pressing it, and checks the library opened. (2) One reading compared the panel clock (last event's time) with the host's estimate at ×4 — 4 × the event delivery lag. The same bound `< 2` is now polled (≤ 10 s); a panel clock stuck on the old case (≥ 60) can never meet it. |
| `stage9-app.e2e.ts:15` every view shares the one engine session | `t1 − t0 > 2.5` over six route changes (≈ 3 s wall); 30 s default test timeout | retry-2 on 38161262512 (attempt 1: test timeout at 29.3 s, page closed in `go()`; attempt 2: 2.316); retry-1 on 38163354933 a1 (1.242), 38172603508 (2.497) | (a) | The sim lost time on the starved runner (the 250 ms frame clamp drops wall time; locally WebKit and Chromium both advance 2.00 s per 2 s on every route). "The engine never restarted" is now read at every view (sim time never goes back: a restart starts at 0 — stronger than one difference), the 2.5 s is waited for (poll ≤ 15 s), test timeout 60 s. The "same monitor node" check is unchanged. |
| `stage9-app.e2e.ts:43` learner controls logged as learner actions | `.log li[data-kind=learner]` contains "Defibrillator charging to 200 J" within 5 s | retry-1 on 38161262512 ("element(s) not found") | (b) | A learner action is logged when the engine acknowledges it. The test now waits (≤ 20 s) for the acknowledged learner entry in the link's log, then checks the Log tab text unchanged. |
| `validation-bedside.e2e.ts:19` asystole demo | `.measured` matches `/ASYSTOLE after \d+\.\d s/` within 40 s | retry-1 on 38161262512 (still "running…"; 14 checks in a 29.8 s attempt: the page was barely scheduled) | (b) | Waits for the page's own demo to finish (its Run button re-enables; the page gives up by itself at 90 s and says so), ≤ 100 s, then the same pattern. The 5–15 s value band is unchanged. |
| `stage7d.e2e.ts:36` check 19 starts, ICP rises | none: `page.waitForFunction: Target page, context or browser has been closed` at 53.9 s of a 180 s test | retry-1 on 38163354933 a1 | (r) | No change. A WebKit page crash on the runner (the FU-1 crash class); nothing to wait for. Retries (2) stay for exactly this. |
| `fu11-vent-new-case.e2e.ts:16` cockpit reloads fresh | `expect.poll(fresh, 10 s)` — a fresh cockpit frame with `__vent` | retry-2 on 38161262512 (2 attempts), retry-1 on 38148717527 | (b), not changed | File owned by Stage 10's open PR #54 (`fu11-vent-*`): not touched. The iframe reload and the cockpit's `__vent` setup took over 10 s on the runner; recommend the same treatment (wait for the reloaded frame's load, then check freshness) in that PR or after it merges. |
| `s10-time-control.e2e.ts:25` (stage-10 PR run 38172603508, 3/3) | `b − a > 24` (×8 sim in 4 s), tones poll, then 300 s timeout | 21 vs > 24; tones 0; timeout | (a) / out of scope | Stage 10's own file (PR #54): not touched, reported only. `b − a > 24` is a runner-speed measurement of the same kind as stage9-app:15. |

### (c) findings

**F-CW3-1 (product defect): "Choose another scenario" is undone by the Scenario tab's first repaint.**
`apps/demo/src/app/panel/scenario.ts` resets `choosing = false` whenever `docV !== sv.docVersion`, and `docV` starts at
−1 and is set only by the tab's first `onRefresh`. The panel's repaint is throttled (`throttle(fn, 500)`: a `setTimeout`
then a frame), so the first refresh of a freshly opened Scenario tab always runs after the click that opened it. A press
of "Choose another scenario" before that refresh opens the library, and the refresh then closes it again (run view back,
library hidden) without any load. Reproduced locally on both browsers with a same-task click (Scenario tab, then "Choose
another scenario"): library visible right after the press, hidden 1.5 s later (Chromium and WebKit). On CI the slow
runner widened the window to a normal Playwright click: the `Load` button stayed "not visible" until the 90 s timeout
(WebKit once, Chromium twice). An instructor who opens the tab and presses at once sees the library flash and vanish.
Fix belongs in product code (e.g. initialise `docV` from `sv.docVersion` when the tab is built, or reset `choosing` only
when `docVersion` changes after the first paint); not done here.

**fu11-restore:15 and FX-1:** no product defect shown by the evidence (see the table); the one read outside the late-
observation envelope (44.02) is the open question, and the fixed test prints the restore's wall latency on CI.

## Changed assertions (before → after)

| File:line | Before | After | Class |
|---|---|---|---|
| `fu11-restore.e2e.ts` | `expect.poll(link.simT, { timeout: 5_000 }).toBeLessThan(tMark + 5)` | in-page record of `link.simT` on every link update from the Return click; `expect.poll(min recorded, { timeout: 20_000 }).toBeLessThan(tMark + 5)`; logs `return-here {tMark, before, restored, updates}` | (a) |
| `stage6a-worker.e2e.ts` | `restore(a)` on the running clock; `c ≥ a`, `c < a + 10` | `pause()`, `restore(a)`, `c`, `resume()`; `c === a`; polled `d > c` | (a) |
| `fu11-explore-baseline.e2e.ts` (×3 checks) | `getByText(/…baseline at 01:0\d/)` visible in 5 s | stamp `/Changes are from the baseline at/` visible in 20 s, then `toHaveText(/…baseline at 01:0\d/)` | (b) |
| `fu11-explore-baseline.e2e.ts:23` | "The baseline is set at 1 minute." in 5 s | in 20 s | (b) |
| `fu11-explore-baseline.e2e.ts` | simNow waits 40 s; test timeouts 90 / 120 s | 60 s; 120 / 180 s | (b) |
| `showcase-clock.e2e.ts` | press "Choose another scenario" right after opening the tab | wait for the running case's title (first repaint), press, expect the library visible | (b), defect F-CW3-1 reported |
| `showcase-clock.e2e.ts` | one reading `|simT − host| < 2` | `expect.poll(|simT − host|, 10 s) < 2` | (a) |
| `stage9-app.e2e.ts:15` | `t1 − t0 > 2.5` (one difference); 30 s timeout | sim time never goes back across the six views (each ≥ the previous); `expect.poll(simNow, 15 s) > t0 + 2.5`; 60 s timeout | (a) |
| `stage9-app.e2e.ts:43` | Log tab text in 5 s | link log has the acknowledged learner entry (poll ≤ 20 s), then the same Log tab text | (b) |
| `validation-bedside.e2e.ts` | `.measured` pattern in 40 s; 90 s timeout | Run button enabled again (≤ 100 s, the page's own 90 s deadline), then the same pattern; 150 s timeout | (b) |

No product value was loosened: every vital-sign band, time window (01:0x), clock bound (`tMark + 5`, `< 2`, `< 15`,
`2.5 s`), count and the 5–15 s asystole band is the same or tighter (`c === a`). **CI-only skips: none were needed.**

## CI shape

`build` keeps install, typecheck, the slow-group check, the fast unit tests, `pnpm build` and `check-notices`; its e2e
step moved out. A new `renderer` job builds `@pme/renderer` once and uploads `patient-monitor-iife` (the artefact the
build job used to upload; the only built file the e2e suite reads, through `iife-smoke.html`). `e2e (chromium)` and
`e2e (webkit)` are a matrix (`fail-fast: false`) that needs `renderer`, downloads the IIFE, installs only its browser and
runs `pnpm test:e2e --project=<browser> --reporter=list,json`; retries stay 2 (`playwright.config.ts` under CI). Each
uploads `e2e-report-<browser>` (the Playwright JSON report and `test-results/`, with the error context of any failure)
and then echoes the tests that passed only on a retry (non-failing; Stage 14 turns it into a rule). The eight
`test-slow` jobs are unchanged.

Before (the single e2e step in `build`, all 8 runs above): 34.9–39.6 min of Playwright time, starting 17–30 min into the
build job; Chromium (2 workers) ≈ 23 min, then WebKit (1 worker) ≈ 12.5–17.5 min. After: see "CI runs".

## Local verification

## CI runs
