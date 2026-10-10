# Gate FU-11 (b): one timeline for restore and restart, exact snapshots, showcase defects

Branch `fu-11-b` (Parts D, E, H of `docs/plans/fu-11-hardening.md`), executed 2026-10-10 on `origin/main` 48864439.
Head: see the PR (merge of main 7a3d5672: 6988b983). Every block of branch b was applied as written: `check-blocks.py --branch b` 0 problems before Task 1,
and the branch's 48 changed files are byte-identical to `check-blocks.py --branch b --apply` on 48864439.

## Post-merge Gate B (2026-10-10/11) — the authoritative run

`origin/main` 7a3d5672 contains `fu-11-a` (PR #43), `fu-11-c` (PR #44) and FU-7.1 a (PR #46). Merged into `fu-11-b` as
6988b983: one conflict, the plan file (add/add) → b's ticked copy kept; `packages/engine-core/vite.config.ts` came
from main unchanged (K4's `interactions-misc` line and the `fu71-*` line, one copy each; b does not edit it). `git diff
origin/main --stat` lists exactly branch b's files plus this gate's evidence.

| Check | Main 7a3d5672 (same day) | Branch (merged) |
|---|---|---|
| Block check | `--branch b` vs the new main: every find block still occurs once; the only report is `audit-fixture.ts` "create over an existing file" (a created the identical file); `--branch all --base 48864439`: 0 problems; every one of b's 76 replacement/create texts is present in the merged tree | |
| typecheck | | clean |
| fast suites | | engine 1 415 passed (1 skipped), controller 248, renderer 92, ventilator 103, demo 204, audio 65, skins 191, validation 119 (+11 skipped) — all passed, no failure |
| build | | ok |
| `validate --suites sanity,gates --quick` | 51 · 20 · 9, 9 gating, 1 not measurable, queue 29 | **identical** (every report row and the calibration queue equal) |
| FU-7 counters `truth.test.ts` / `glossary.test.ts` | 8 / 6 passed | 8 / 6 passed |
| Audit regressions, both browsers | | **42/42** (all 21 audit tests × Chromium + WebKit) |
| Targeted e2e (`audit-`, `fu11-`, `showcase-`, `stage9-app`, `vent-link`), both browsers | | 87 passed, 1 skipped (vent-link's pre-existing WebKit skip), 0 failed; `git status docs` clean (K1) |
| Slow groups a–g | | all passed, 122 files: a 17 files 27.0 min · b 17 files 20.6 min · c 21 files 12.8 min · d 34 files 11.1 min · e 10 files 10.4 min · f 12 files 12.0 min · g 11 files 12.1 min |
| Rehearsal (`SHOWCASE_WORKERS=2`) | 12/12 passed (10.3 min) | 14/14 with the multi-window proof (11.9 min) |

Rehearsal, main vs merged branch (Chromium / WebKit; results in `docs/gates/fu-11-b/showcase-merged/{main,branch}/`):

| Case | Main 7a3d5672 | Branch |
|---|---|---|
| Induction: MAP fall | 94.8 → 65.6 / 65.5 | 94.8 → 65.6 / 65.5 |
| Induction: apnoea alarm after "Induce now" | 54.0 s / 54.2 s | 54.0 s / 54.1 s |
| Anaphylaxis: systolic > 110 after epinephrine | 9.5 s / 11.7 s | 9.9 s / 11.5 s |
| Tamponade: MAP < 40 after propofol | 75.0 s / 73.7 s | 74.2 s / 72.8 s |
| Haemorrhage: pulse lost; ROSC during CPR | 10 min; 4.3 min / same | 10 min; 4.3 min / same |
| Second scenario: clock restarts | 02:03 → 00:04 / 02:04 → 00:04 | 02:03 → 00:05 / 02:04 → 00:04 |
| Console errors | 0 | 0 |
| **Bronchospasm, Ventilator-view VTE** before → 3 min → 6 min after salbutamol (H5) | 162 → 305 → 368 / same | **312 → 498 → 501 / 310 → 498 → 501** |
| **Bronchospasm, monitor EtCO2** at 3 and 6 min after salbutamol (H5's consequence) | 40, 40 / 40, 40 | **32, 33 / 32, 33** |

Every compared number is equal within the rehearsal's run-to-run jitter (it presses buttons on wall time) except H5's.
**H5's changed bronchospasm numbers are ACCEPTED by the orchestrator (2026-10-10) as the declared change** — VTE ≈ 311
→ 498 → 501 (the plan had expected ≈ 400–430 before salbutamol; research/24 P8 predicted ≈ 348 for this unparalysed
patient) and the monitor's EtCO2 after salbutamol 32–33 instead of 40, because the Ventilator view ventilates the
patient in this case. (FU-7.1 moved the induction apnoea time from ≈ 62 s to 54 s on main and branch alike.)

The sections below are the first gate run, on b ALONE over 48864439 (a and c not yet merged then), kept as the record.

## First gate run (b on 48864439)

**Gate B Step 1 — merge (first run):** `origin/main` was still 48864439: branches `fu-11-a` and `fu-11-c` were NOT
merged. A trial merge a → c → b onto 48864439 was automatic with 0 conflicts. a and c each also committed a copy of the
plan (cc9d7bf5, e063f1d2; R50 M6 says only b does) — resolved in the real merge by keeping b's ticked copy.

## Tasks (ticked in `docs/plans/fu-11-hardening.md`, Parts D, E, H)

| Task | Commit | Red (measured on 48864439) | Green |
|---|---|---|---|
| D0 fixture, plan | f8039fd1, e616b895 | — | block check 53 edits, 23 creates, 0 problems |
| D1 JSON-safe snapshots, pending groups | b8fedc64 | codec: no module; replay 5 failed (events differ on default/LVAD/IABP; ack tick 350 vs 250; 100 vs 2); audit-snapshot 4 failed | 25/25 with neighbours; audit-snapshot 4/4 (Chromium + WebKit) |
| D2 command ownership, `stop()` | c4d7bf85 | 3 failed (hr.to 400; function command accepted; `stop` missing) | 17/17 with engine-commands |
| E1 `TrendStore.rewind` | 3dfdb81c | 2 failed (`rewind` missing) | trends 5/5 |
| E2 restore restarts lanes, trends, tiles, CO2 lane | e065324f | `restore` missing; audit-rewind 4 failed (waveform frozen; trend 5 > 2) | renderer 92/92; audit-rewind 4/4 |
| E3 one timeline (`cause`), viewers | 2f9b2515 | 4 failed (viewer 4.9; rate 4 after a new host; scenario ended by a restore; ECG sticky kept); audit-timeline 2 failed | controller 231/231; audit-timeline 2/2 |
| E3b link follows a restore (R50 F1) | eb8e9341 | no clock after the restore (256 not > 256); e2e CO2 off by 37 | ventilator 98/98; fu11-vent-restore + vent-link 5 passed, 1 skipped (pre-existing WebKit skip) |
| E4 "Return here" back | dfb1f3d1 | ramps.size 1; e2e: no button (timeout) | demo 201/201; fu11-restore + stage9-app + showcase-clock 14/14 |
| E5 pleth scale | ffa06dc7 | span 0.125 | > 0.5; renderer 92/92 |
| H1 Ventilator view follows speed (D3) | 69a4f2d9 | `__vent.scale` stays 1 | 5 passed, 1 skipped |
| H2 Explore baseline at 1 min (D5, M14) | 223c8f4e | 4 failed | 5 passed, 1 skipped (pre-existing Chromium-only evidence test) |
| H3 "Limit alarms off" (K3, Q4) | 79043f0f | "Alarms off"; `limitsOffTitle` missing | e2e 8/8; unit 9/9 |
| H4 Sound off again | e3c58900 | `monitor.soundOn` undefined; second click left "Sound on" | e2e 6/6; renderer 92/92 |
| H5 cockpit VC at the monitor's flow | 5f4b439b | `monitorMatchedFlow` missing | parity: cockpit VTE 426 (PIP 35.0) vs monitor VT 424; ventilator 100/100; e2e 9 passed, 1 skipped |
| H6 a new patient unloads the cockpit (R50 F10) | bb01d427 | cockpit iframe still loaded after a restart | 7 passed, 1 skipped |

H5 was checked against `research/24-showcase2-probes.md` P8 before it ran (the plan's stop condition): P8 finds the same
cause (the cockpit's 60 L/min square VC breath with a 0.3 s pause, time-cycled, cut by Pmax) and states that matching
the engine's Ti (18 L/min, no pause) closes the gap — the fix H5 implements. P7 (EtCO2 after pulmonary flow stops) is
unrelated to H5. They differ from the plan only in the expected magnitude on the showcase rig (see the rehearsal).

## Full verification (b on 48864439, shared machine, load average 8–170 during the runs)

| Check | Before (D0, base + plan) | After (branch) |
|---|---|---|
| typecheck | — | clean |
| engine fast | 315 files, 1 397 passed, 1 skipped | 319 files, 1 407 passed, 1 skipped, **2 failed under load** (see below) |
| controller / renderer / ventilator / demo | 227 / 90 / 97 / 200 | 231 / 92 / 100 / 202 (+4 / +2 / +3 / +2 = this branch's new tests) |
| audio / skins / validation | — | 58 / 191 / 107 passed + 11 skipped |
| build | — | ok |
| `validate --suites sanity,gates --quick` | 51 green · 20 yellow · 9 red, 9 gating, 1 not measurable, queue 29 | **identical**: every report row equal; the calibration queue differs only in its timestamp/commit line |
| FU-7 counters `truth.test.ts` / `glossary.test.ts` | 8 / 6 passed (main) | 8 / 6 passed |
| e2e, both projects (`--retries=0`) | — | 117 passed, 31 skipped, 6 failed (see below) |
| slow groups | — | see the next table |

The two engine fast failures are the load-sensitive tests branch c fixes (K3 the truth-event 1 ms bound — measured
0.80 ms alone; K4 ET-19's diabetic arm, 71 s under load): both pass alone (26/26). The six e2e failures: the two
Chromium loopback-WebRTC tests (`stage6a` "over rtc", `stage6a-latency`; the macOS skip is branch c's K2); four WebKit
tests under load — `fu11-vent-flow`, `fu11-vent-speed` (the cockpit frame was not loaded yet) and `showcase-capnogram`
pass on a re-run; `showcase-clock` is load-sensitive on MAIN too (WebKit, repeated ×4 under the same load: main 2 of 4
failed, the branch 1 of 4; it passed 14/14 in E4's run). The full e2e run rewrote the committed gate screenshots
(branch c's K1); they were restored with `git checkout -- docs/gates`.

| Slow group | Wall (local) | Result |
|---|---|---|
| slow-a | 30.5 min | 17 files, 59 passed |
| slow-b | 15.0 min | 13 files, 73 passed |
| slow-c | 12.5 min | 21 files, 72 passed |
| slow-d | 20.0 min | 34 files, 150 passed |
| slow-e | 15.1 min | 10 files, 58 passed |
| slow-f | 12.8 min | 12 files, 95 passed |
| slow-g | 12.4 min | 11 files, 47 passed |

The state-reading slow suites pass unchanged with D1's encoded snapshots (Review Focus 5).

## Same-day rehearsal, main vs branch (Gate B Step 3, R50 F7)

Main kit built from 48864439 and the branch kit from this head, both run 2026-10-10 from the same machine
(`SHOWCASE_WORKERS=2`): main 12/12 passed (10.3 min), branch 14/14 with the multi-window proof (11.7 min). Results:
`docs/gates/fu-11-b/showcase/{main,branch}/`.

| Case (Chromium / WebKit) | Main | Branch |
|---|---|---|
| Induction: MAP fall | 94.8 → 65.5 / 65.5 | 94.8 → 65.7 / 65.6 |
| Induction: apnoea alarm after "Induce now" | 59.3 s / 59.5 s | 62.7 s / 62.7 s |
| Anaphylaxis: systolic > 110 after epinephrine | 11.5 s / 11.5 s | 11.3 s / 11.3 s |
| Tamponade: MAP < 40 after propofol | 72.3 s / 74.3 s | 72.7 s / 75.0 s |
| Haemorrhage: pulse lost; ROSC during CPR | 10 min; 4.3 min / same | 10 min; 4.3 min / same |
| Haemorrhage: "SPO2 NO PULSE" (sim s) | 641.0 / 641.1 | 640.7 / 643.0 |
| Second scenario: clock restarts | 02:03 → 00:04 / 00:05 | 02:03 → 00:05 / 00:05 |
| Console errors | 0 | 0 |
| **Bronchospasm, Ventilator-view VTE** before → 3 min after salbutamol → 6 min (H5, declared) | 161 → 305 → 368 / same | **311 → 498 → 501 / 312 → 498 → 501** |

The rehearsal presses its buttons on wall time, so sim times jitter run to run: the induction apnoea time is 62.5 s /
62.0 s in the kit's committed main results (e0daff59) — today's main run (59.3 s) is the outlier, the branch matches
the kit. Every listed number is equal within that jitter except the declared one.

**H5's numbers differ from the plan's expectation (ACCEPTED by the orchestrator as the declared change; see the post-merge section).** The plan expected the Ventilator-view VTE
"≈ 400–430 before salbutamol and ≈ 500 after". Measured: 311–312 before, 498 after (501 at 6 min). The "after" matches;
the "before" is lower and agrees with research/24 P8 (cockpit at the engine's flow, Pmax 35, unparalysed showcase
patient: 348). The plan's 424/426 parity was measured on a paralysed `normal`-profile rig; the showcase patient is not
paralysed. Because the Ventilator view ventilates the patient in this case, the MONITOR's EtCO2 in this case also
changes with H5: 32 → 40 → 40 mmHg on main, 30 → 32 → 33 on the branch (more delivered volume). The plan's list of
compared numbers does not include it, but the plan's sentence "every monitor number … do not move" does not hold for
this case while the Ventilator view drives. Nothing else differs.

## Review Focus 2 and 5

- **Paused restore** (induction, ×4, bookmark at 2.6 s, run to ≈ 43 s, Pause, "Return here"): the clock, the host's
  sim time (2.68 s) and the trend's newest second (2) were stationary for 5 s, the bar still showed Resume.
- **Two alternating restores with the Ventilator view driving** (bronchospasm ×4; bookmark A 30.5 s, B 90.5 s;
  A → B → A → B): after each restore the host and controller clock were at the bookmark within 0.1 s, the trend's
  newest second ≤ the clock (a forward restore keeps the older newest second until new seconds arrive), and 20 s later
  the tiles read SpO2 89/94/90/95 and CO2 33/34/33/33 (A, B, A, B) — the cockpit kept ventilating each restored patient
  (E3b), and each pair agrees.
- **Review Focus 5:** the slow groups and `validate` above.

## Evidence (Chromium, ≤ 60 KB)

`docs/gates/fu-11-b/restored-1s-after-return-here.jpg` (the sweep restarting at the bookmark),
`ventilator-view-after-restore.jpg`, `limit-alarms-off-tooltip.jpg` (the tooltip text drawn beside the button: "Limit
alarms are off on this monitor. Still alarming: Asystole, Ventricular fibrillation or tachycardia, Ventricular
tachycardia, Apnoea."), `explore-baseline.jpg` ("Sim time 01:30. Changes are from the baseline at 01:00."),
`sound-off.jpg`, `sound-on.jpg`.

## Q7 (owner, non-blocking), restated

Alarm PAUSE vs a new higher-priority alarm: B4 (branch a) ends a SILENCE when a higher-priority alarm arrives. Alarm
PAUSE (no alarm raised) still holds through a new higher-priority condition on every skin. Keep as today, or let a
higher priority end a pause too? Nothing in FU-11 waits on it.

## Deviations

- The first gate run was on b + 48864439 only; Steps 1–3 were repeated on the merged tree (post-merge section). The post-merge e2e was the targeted set (the orchestrator's instruction), not the full suite.
- The engine fast set was run once in the gate (the brief: full suites once, on a shared machine), not inside D1.
- The E4 and H3 commit messages are the plan's with the inner quotes escaped (the plan's shell lines would have split them).
