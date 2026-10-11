# Gate FU-11 (d): the second-screen learner monitor, and a higher-priority alarm ends an alarm pause

Branch `fu-11-d` (Part G of `docs/plans/fu-11-hardening.md`, tasks G0–G2, plus the added task G3 — owner ruling Q7),
executed 2026-10-11 on `origin/main` 26e78308 (the merge of PR #45 `fu-11-b`; a #43, c #44, FU-7.1 a #46 and b #47 in).
`check-blocks.py --branch d --b-merged` before Task 1: 32 find/replace blocks, 4 creates, 0 problems. After the tasks,
`check-blocks.py --branch d --b-merged --apply` on a clean `origin/main` reproduces every Part G file byte for byte;
the only other difference is G3's added test in `packages/renderer/test/alarm-audio.test.ts`. `git merge origin/main`
at the gate: already up to date. `git diff origin/main --stat`: exactly Part G's 19 files, G3's 3 files (`manager.ts`,
`manager.test.ts`, `alarm-audio.test.ts`), the plan's G ticks and this gate's evidence.

## Tasks

| Task | Commit | Red (measured on 26e78308) | Green |
|---|---|---|---|
| G0 branch, install, block check | 934c5915 | — | 0 problems; empty commit (the plan file is b's copy on main: no second copy, G ticked there) |
| G1 `HostSession.mirror`; the relay drops mirror frames | b8e3b33c | `hs.mirror is not a function`; the relay forwarded the mirror batch | `fu11-mirror`, `fu11-relay-mirror` green; controller `test/session` + `test/relay` 16 files / 57 passed |
| G2 the second-screen learner monitor | b6e33feb | e2e: no "Open on a second screen" button (Chromium 3/3 timed out; WebKit not re-run red, same page); unit: `silenceWindow is not a function` (2 red) | `fu11-follower` 6/6 (Chromium + WebKit, 1.4 min); renderer 30 files / 97; demo 26 / 204; neighbours `stage9-app/tasks/glossary/a11y`, `showcase-*` 25 passed, 1 skipped (stage9-tasks' pre-existing WebKit skip) |
| G3 a new higher-priority alarm ends an alarm PAUSE (Q7) | 6a106bf9 | manager: 6 red (the 5 profiles with a pause + the delay case: `pausedUntil` still set, nothing raised) | engine alarms 12 files / 82 passed; renderer bridge test green; audio 65 |

## G3: what a NEW higher-priority alarm does during an alarm PAUSE, per profile (owner ruling Q7, 2026-10-07)

The rule is B4's for silence (D-14), applied to pause: the pause remembers the highest priority active when it began
(`pausedLevel`); a condition ABOVE it ends the pause as soon as it would be raised (its own delay counted while paused),
and the normal loop then raises it and the rest, exactly as after a pause that ran out. A condition of the same or lower
priority, and a pre-pause (nothing alarming when Pause was pressed), raise nothing until the pause ends — unchanged.
`silence.cancelOnNewAlarm` is a SILENCE property and is not applied to pause (so no "any new alarm ends a pause" on the
acknowledge skins). Evidence as B4 (gate a §B4): no vendor source documents a pause that holds through a higher-priority
alarm.

| Skin | Pause (skin data) | Before | After |
|---|---|---|---|
| zoll-like | 180 s (iec-defaults) | nothing raised for 180 s | a higher-priority alarm ends the pause and is raised at once; same/lower priority and a pre-pause still wait |
| ge-like | 180 s (iec-defaults) | same | same as zoll-like |
| lifepak-like | 180 s (iec-defaults) | same | same as zoll-like |
| philips-like | 120 s | same | same as zoll-like |
| mindray-like | 120 s | same | same as zoll-like |
| saadat-like | none (`pause: null`): Pause is refused | refused | unchanged |

Files: `packages/engine-core/src/l3/alarms/manager.ts` (the engine's alarm manager, `pausedLevel` optional in the state:
absent in older snapshots = no break). The audio side needs no change: the bridge maps a pause to the sounder's
silence with nothing active (the engine removed every alarm), and when the engine ends the pause the next status raises
the alarm and ends that silence — pinned by a new bridge test (`alarm-audio.test.ts`, green on arrival). One existing
test changed its condition, not its band: "pause … raises nothing until it ends" used ASYSTOLE (higher than the paused
HR) as its new alarm — that is exactly what Q7 now lets through — and now uses a same-priority SpO2 alarm.

## Verification (2026-10-11, same machine, same day)

| Check | Main 26e78308 | Branch 6a106bf9 |
|---|---|---|
| typecheck | | clean |
| fast suites (`CI=1 PME_TEST_SET=fast pnpm -r test`, 9.5 min) | | engine 325 files / 1 430 passed (1 skipped); controller 50 / 250; renderer 30 / 98; ventilator 20 / 103; demo 26 / 204; audio 11 / 65; skins 21 / 191; validation 35 / 119 (+11 skipped) — all passed |
| build | | ok |
| `validate --suites sanity,gates --quick` | 51 · 20 · 9, 9 gating, 1 not measurable, queue 29 | **identical** (report and calibration queue equal line for line but the commit and time) |
| FU-7 counters `truth.test.ts` / `glossary.test.ts` | 8 / 6 passed | 8 / 6 passed |
| Full e2e, Chromium + WebKit (`--retries=0`, 20.3 min) | | **166 passed, 32 skipped, 0 failed**; the 21 audit regressions 42/42; the `fu11-*` files 30/30; `git status` clean afterwards (K1) |
| Slow groups a–g | | all passed, 127 files / 596 tests: a 17 files 9.5 min · b 22 files 10.6 min · c 21 files 8.5 min · d 34 files 9.2 min · e 10 files 8.2 min · f 12 files 10.4 min · g 11 files 8.7 min |
| Rehearsal (`SHOWCASE_WORKERS=2`) | 12/12 passed (9.9 min) | 12/12 with a learner monitor following every case (9.8 min) + multi-window 2/2 = **14/14** |

The skips are the existing ones (evidence screenshots without `PME_SHOTS`, the macOS loopback-WebRTC skips, stage9-tasks
on WebKit). The rehearsal on the branch used an unmodified copy of `rehearsal.showcase.ts` run from the scratchpad with
one addition: after `openTeach` it opens `?follow=<code>#/monitor` in a second page of the same context, waits for
"synced", and at the end of each case checks that the follower is still synced and saying "Following session …" with no
console error (two extra checks per case; `scripts/showcase/**` is unchanged).

### Rehearsal, main vs branch with a learner monitor open (Chromium / WebKit; `fu-11-d/showcase/{main,branch}/`)

| Case | Main 26e78308 | Branch (follower open) |
|---|---|---|
| Induction: MAP fall | 94.8 → 65.6 / 65.6 | 94.8 → 65.7 / 65.7 |
| Induction: apnoea alarm after "Induce now" | 55 s / 54.9 s | 55 s / 54.9 s |
| Induction: Saadat CO2 tile after "Intubate and ventilate" | 46 after 5.2 s / 5.3 s | 46 after 5.3 s / 5.3 s |
| Anaphylaxis: systolic > 110 after epinephrine; HR at 2 min | 11.3 s / 11.5 s; 135 | 11.3 s / 11.3 s; 135 |
| Tamponade: MAP < 40 after propofol | 73.8 s / 73.9 s | 73.8 s / 73.8 s |
| Haemorrhage: pulse lost; ROSC during CPR | 10 min; 2.9 min / 3 min | 10 min; 3 min / 3 min |
| Haemorrhage: "SPO2 NO PULSE" (sim s) | 641.5 / 640.2 | 640.5 / 640.5 |
| Second scenario: clock restarts | 02:02 → 00:04 / 02:03 → 00:05 | 02:03 → 00:05 / 02:04 → 00:04 |
| Bronchospasm: Ventilator-view VTE before → 3 min → 6 min after salbutamol; monitor EtCO2 | 311 → 498 → 501; 30, 32, 33 / 312 → 498 → 501 | 311 → 498 → 501; 29, 32, 33 / 312 → 498 → 501 |
| Console errors (instructor; learner monitor) | 0 | 0; 0 |
| Learner monitor at the end of each case | — | synced in all 12; resyncs 1–2 (each case's scenario load or restart), beat drift 0 ms, lag 0.11–0.20 s |

Every number is equal within the rehearsal's run-to-run jitter (it presses buttons on wall time; gate b's note): no
difference to report. (ROSC is 2.9–3 min on main and branch alike — FU-7.1 b's change, not this branch.)

Multi-window proof (`multiwindow.showcase.ts`, both browsers, 0 console errors): unchanged from main — a plain second
window opened at `#/monitor`, `#/explore` or `#/vent` still starts a patient of its own (`followsInduction: false`);
the paired Remote follows. G2 does not change those addresses: the learner monitor is the window opened from "Open on a
second screen" / "Open the learner monitor in a new window" (`?follow=<code>`). The presenter documents should point
to the button (orchestrator).

## The learner monitor (Review Focus 3 and 4; the brief's checks) — `fu-11-d/step3-*.json`, `step4-*.json`

Measured with a scratch Playwright file on the dev server (`openApp` + `startVite`), Healthy induction at ×4 unless said.

| Check | Chromium | WebKit |
|---|---|---|
| Style: the instructor's `setSkin` (Settings' call) saadat-like → philips-like; the follower wears it | 7–16 ms | 85–87 ms |
| Speed: follower clock rate at ×4 / ×1 / ×2 (sim s per wall s, 4 s windows) | 3.99 / 1.02 / 2.00 | 3.99 / 1.04 / 2.00 |
| Pause: follower rate while paused 5 s; status | 0; "Following session … (paused)" | 0; same |
| Resume: second 4 s window | 2.01 (host 2) | 2.01 (host 2.01) |
| Fast-forward | no fast-forward / skip control exists (Stage 10 adds it) | same |
| Instructor Silence (both windows' sound on, VF alarm): alarm tones in the next 6 s | instructor 0 (silenced until 191.3), follower +5 | instructor 0, follower +5 |
| Follower "Silence here": follower tones in 5 s; the instructor's `link.alarms.silencedUntil` | 0; null before and after | 0; null before and after |
| Bookmark restore: resyncs; clock host vs follower 3 s later | 1; 105.5 vs 105.3 | 1; 105.8 vs 105.7 |
| Patient restart: resyncs; clock 3 s later | 2; 8.7 vs 8.6 | 2; 8.5 vs 8.4 |
| Instructor reload: same code; synced again | yes; 4.3 s after the reload began | yes; 4.3 s |
| Instructor window closed → "The instructor's monitor is not answering" | 5.3 s | 5.4 s |
| Host frame p95, bronchospasm ×4 with the Ventilator view, 30 s without / with a follower | 16.8 / 16.7 ms (1 800 frames each); follower 0 resyncs | 18.0 / 18.0 ms; follower 0 resyncs |

The "not answering" time is the 5 s rule plus the status's 0.5 s refresh (the plan: "≤ 5 s" counts from the last host
message, which precedes the close).

**Found at the gate (NOT fixed; for the orchestrator): a viewer leaps ahead after the host RESUMES.** Sampled every
100 ms (Chromium, ×2, paused 6 s): at the resume the follower's clock jumps from 8.5 to 14.0 s while the host is at
9.2 s, then stands still for ≈ 2.6 s until the host catches up, and follows exactly from then on (beat drift 0, no
resync). Cause, in `packages/controller/src/session/viewer-sync.ts` (Stage 6a, not a Part G file): the host sends no
1 Hz state while paused, so at the resume the anchor is the last state before the pause; `follow()` extrapolates it by
`min(since, MAX_EXTRAPOLATE_S = 3 s) × rate` and `jumpTo`s there because the error is > 1 s. Every viewer (the Remote's
viewers too) does this; the learner monitor makes it visible (the waveforms leap ≈ 5 s and freeze ≈ 2.6 s once per
resume). Suggested fix (a separate change with a unit test): on the host's `time resume`, re-anchor
(`anchor.wallMs = now`; sim time did not move while paused).

## Declared deviation and contract

- **Mirror frames over BroadcastChannel only (R50 F3, orchestrator ruling; a declared deviation from brief §3.7 / D-7).**
  The Ventilator view's applied frames are pressure/flow/volume samples; `HostSession.mirror` sends them only to
  same-browser BroadcastChannel transports, only while a viewer has said hello in the last 10 min, never to the
  in-process panel, WebSocket or WebRTC; the relay drops any event batch carrying one (`fu11-relay-mirror`). Measured:
  0 resyncs over 30 s of the Ventilator view at ×4 (Step 4) and over the bronchospasm rehearsal on both browsers.
- **The learner monitor's wire contract** for the later QR-paired mobile monitor is the header of
  `apps/demo/src/app/views/follower.ts` (address, session channel, viewer refusal, mirror frames are BroadcastChannel
  only, liveness, style channel, sound per window).

## Evidence (Chromium, ≤ 60 KB each)

- `fu-11-d/follower-beside-host.jpg` — Healthy induction ×4: the instructor window and the learner monitor, same numbers
  and skin; the learner's bar ("Following session …", Sound, Silence here) under its monitor.
- `fu-11-d/follower-after-skin-change.jpg` — the instructor changed the style to philips-like; the learner follows.
- `fu-11-d/follower-with-ventilator-view.jpg` — Severe bronchospasm ×4 with the Ventilator view driving the patient.

## Deviations

- Setup: the brief's step 2 (commit the plan as the first commit) was overridden by its branch-d note — the plan is
  b's ticked copy on main, so G0 is the plan's empty commit (message adapted: "starts on origin/main … with fu-11-b
  merged") and G0–G2 are ticked in that copy. G3 is not in the plan; it is recorded here.
- G2's red e2e run was Chromium only (3 tests, each a 2–3 min timeout on the missing button); green ran both browsers.
- Gate D Step 2 ran the full e2e and the slow groups (the plan) rather than only the targeted e2e (the brief).
- The first scratch run of the Step 3 checks failed on WebKit at its last step because the scratch script closed the
  instructor window 0.4 s after a reload, before the follower had re-synced (it then truthfully said "Waiting for the
  instructor's monitor …"); the script was corrected to wait for the resync, and both browsers passed. Not a product
  issue: `fu11-follower` covers the same sequence with a 3 s wait.
