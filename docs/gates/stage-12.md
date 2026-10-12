# Gate note: Stage 12, learners' phones (QR-paired live learner monitor)

**Formal gate on a075fd39** (origin/main 8c74d994 merged into `stage-12`; Stage 10 is on main). Gate step 4, the owner's
own phone, is **PENDING-OWNER**: the PR is not to be merged before it is recorded (§4).

- **Branch name:** `stage-12`, as the executor brief and the orchestrator named it. The plan's text says
  `stage-12-mobile-learner` (Task 0, Gate Step 7); this is the same branch under the brief's name (orchestrator: fine).
- **Base:** by orchestrator ruling, `origin/stage-10` (60405f2f), not `origin/main`, because Stage 10 and FU-11 d were not
  yet on main when Stage 12 started.
- **Merges:**
  - `origin/main` c7d9b51c (Stage 11 and the WebKit fix) at 806b00bc, no conflicts. This was the pre-merge dry run.
  - `origin/stage-10` 854219c5 (the span-label fix) at 07d7cd00, no conflicts. Dry run.
  - `origin/main` 8c74d994 at **a075fd39**, no conflicts. This was the formal gate. 8c74d994 has Stage 10 (#54), FU-11 d (#49), the CI reshaping (#55), the citation fixes (#52), the card-button fix (#51) and the scenario-library fix (#56).
- **What is in which section:** §1–§3 and §5 are the pre-merge dry run on 07d7cd00. §0 is the formal gate's re-check
  on a075fd39. The 34 files this stage changes are byte-identical on the two trees: only other plans' files moved.

## 0. Formal gate on a075fd39 (2026-10-12)

**Block re-check.** The comparator worktree was set to `origin/main` 8c74d994, i.e. main without Stage 12.
- `check.py --base-dir`: **75 find/replace blocks + 15 creates, 34 files: 0 problems.** No block had to be re-located.
- Applying every block of the plan, task by task, to that tree reproduces the branch byte for byte (`cmp`).
- `git diff origin/main stage-12` lists exactly those 34 files, plus this plan and `docs/gates/stage-12*`.

**Targeted sets, all with `--retries=0`.** Load average 1.7–2.2.

| Check | Result |
|---|---|
| `pnpm -r typecheck` | clean |
| controller / renderer / demo unit tests, CI=1 | **56 files / 277 tests · 32 / 110 · 38 / 261: all passed at the first run** |
| `pnpm build`, `pnpm check-notices` | OK |
| e2e `s12-mobile-learner fu11-follower s10-time-control stage6a audit-relay audit-remote iife-smoke`, Chromium + WebKit | **37 passed, 7 skipped, 0 failed (4.4 min)** |

The 7 skips are by design:
- `s10-time-control`'s `measure` test, both engines (it needs `PME_S10_MEASURE=1`).
- `stage6a`'s WebRTC test, both engines.
- `fu11-follower` on WebKit: the whole file is now skipped by main's FALLBACK ruling of 2026-10-11 (F-49-2: BroadcastChannel drops messages between pages on Playwright's WebKit).
  - The 5 × 5 branch-vs-base comparison of its "Ventilator view drives" test therefore cannot run on the committed file any more. Its result is the dry run's (§2: branch 1 of 16, base 1 of 16).
  - `s12-mobile-learner` does not use BroadcastChannel (the phone follows over the relay's WebSocket), and it ran and passed on WebKit (3 of 3).

**Retry-only passes at the formal gate: none.** The dry run's are listed in §6, F1.

**CI** (PR #55's shape, `docs/gates/ci-webkit-3.md`):
- The `renderer` job builds the IIFE once.
- `e2e (chromium)` and `e2e (webkit)` run as matrix jobs, with retries 2 under CI, and echo any retry-only pass at the end of each job.
- `s10-time-control` is skipped on CI WebKit (S10-F5); `fu11-follower` is skipped on WebKit everywhere.
- The PR's CI run id is in the PR conversation. Any retry-only pass it echoes is a finding for the orchestrator.

## The pre-merge dry run (on 07d7cd00, 2026-10-11)

Plan: `docs/plans/stage-12-mobile-learner.md`. Executor: one session (Claude Opus 5.5). Machine: Apple M3, shared with other executors; the load average is given per run.

## 1. Blocks and commits

**Task 0.** The block check on `origin/stage-10` 60405f2f gave **75 find/replace blocks + 15 creates, 34 files: 0 problems**. Stage 10 T6, a commit beyond the plan's base, moved no block.

**Tasks 1–9.** Every block was applied mechanically, task by task, in plan order. Each task's test failed first as the plan predicts:

| Task | Red (before) | Green (after) |
|---|---|---|
| T1 | 7 failed, 2 passed | 4 files, 20 tests |
| T2 | 3 failed, 7 passed | 23 tests |
| T3 | cannot find the module | 8 tests |
| T4 | 2 failed, 1 passed | 13 tests |
| T5 | 1 failed | 37 tests |
| T6 | cannot find the module | 7 tests |
| T7 | 3 failed on Chromium | 6 passed on both engines |
| T8 | no launcher, no relay file | kit built and headless check passed (below) |
| T9 | — (by-hand load test) | 1 passed per run |

**One commit per task, each pushed:** 64e2060d (plan) · 2a7faddb T1 · bd443787 T2 · dab2a20f T3 · 78daef36 T4 · 7b362622 T5 · a6fb411f T6 · 9967a6b6 T7 · b07df11c T8 · 6c412b18 T9.

**Gate Step 1, re-checking the blocks after the merge.** The comparator is a local tree: `origin/stage-10` 60405f2f with `origin/main` c7d9b51c merged in, with no Stage 12 code.
- The block check on that tree: **75 + 15, 34 files: 0 problems.**
- Applying every block of the plan to it reproduces this branch byte for byte. All 109 files that differ from main are identical (`cmp`).
- No block had to be re-located.

**T8, the kit, headless.**
- **Start Classroom** (`PME_NO_OPEN`, port 8750) printed "THE CLASSROOM IS RUNNING" and the phones' addresses.
- `/pme-relay.json` answered `{"relay":"pme","port":8750,"addresses":["192.168.1.100","172.21.0.1"],"serves":true}`, and `/?join=` answered 200.
- After the kill, nothing listened on 8750.
- The kit contains `server/relay.mjs` (139 678 bytes), `relay.mjs.LICENSE-ws.txt`, `NOTICES.md`, and `LICENSES/qrcodegen-MIT.txt`.
- A stand-in Node v20.11.1, and no Node at all, each give the plan's two messages, and nothing starts.
- `check-notices`: OK.

## 2. Suites (Gate Step 2)

| Check | Result |
|---|---|
| Before the stage (Task 0, base 60405f2f) | typecheck clean · controller relay + viewer-sync: 4 files, 15 tests · e2e `fu11-follower` + `s10-time-control`: 8 passed, 2 skipped (both engines) |
| `pnpm -r typecheck` (806b00bc, and again on 07d7cd00) | clean |
| `pnpm -r test`, CI=1 (806b00bc) | audio 11/65 · skins 21/191 · engine-core 452 files / 2027 tests (1 skipped) · controller 56/276 · ventilator 21/106 · renderer 32/109 · validation 36 files (1 skipped) / 130 tests (11 skipped) · demo 37/256: **all pass**, but 20 tests in 18 engine-core files, 1 controller test and 1 demo test passed only on a re-run (finding F1) |
| `pnpm build`, `pnpm check-notices` | OK |
| Full e2e, `--retries=0`, both engines (806b00bc) | **175 passed, 35 skipped, 0 failed**, in 22.1 min plus the IIFE re-run. The first run gave 165 passed and 10 failed: `iife-smoke` and `stage6a-worker` on both engines need `pnpm build` first (as CI does); after the build, 10 of 10 passed |
| After merging stage-10 854219c5 (07d7cd00) | `s12-mobile-learner` + `s10-time-control`: 8 passed, 2 skipped (both engines) · demo `s10-fast-forward`, `follower-status`, `classroom`: 19 tests passed |

**`fu11-follower` "Ventilator view drives", WebKit, alternating branch / base.**

| | Branch (07d7cd00) | Base (854219c5: stage-10 + main, no Stage 12) |
|---|---|---|
| Plain test, 5 runs each | 1 failure (run 1) | 0 failures |
| Instrumented probe, 11 runs each | 0 failures | 1 failure |
| **Total** | **1 of 16** | **1 of 16** |

- The base was the comparator because `fu11-follower.e2e.ts` is not on `origin/main` c7d9b51c: FU-11 d had not merged then.
- The branch is **not worse than the base**, so this does not STOP the gate.
- The one cause logged (in the base) was `requestSync()` called with no argument. That is not a new-timeline resync. Drift was 0, so it was not the beat-drift path (`viewer-sync.ts:271`). That leaves "too late to mirror exactly" (`:246`) or a transport reopen (`:96`), which agrees with R50 M7.
- WebKit gave no usable stack on that run. The five later probe runs on each side logged no resync.
- Evidence: `docs/gates/stage-12/fu11-follower-5x5.txt`. The probe was an uncommitted copy of the test and has been removed.

## 3. The six-card rehearsal with a phone room (Gate Step 3)

### (a) The scripted rehearsal on the kit

The six cards plus two extra checks, on both engines, same day:

| Kit | Result |
|---|---|
| Branch kit (07d7cd00, `Desktop/Claude/_sandbox/pme-classroom-dryrun/kit`) | **16 passed (27.7 min)** |
| Base kit (854219c5, no Stage 12) | **16 passed (27.7 min)** |

Every step label matches between the two runs. The largest differences:

| Where | Branch vs base, max difference | Run-to-run reference (base today vs the Stage 11 gate's run) |
|---|---|---|
| The four calm cards, the clock-restart check, MH | HR ≤ 2, MAP ≤ 3.1, SpO2 ≤ 1, RR ≤ 8, EtCO2 ≤ 7 (healthy induction, Chromium) | EtCO2 8, RR 9 on the same cards |
| Haemorrhage | HR 21, MAP 20 | HR 35, MAP 41 |
| Tamponade | HR 27 (Chromium) | HR 22 (WebKit) |

- Tamponade's 27 is one moment: the "stop CPR" press, sampled at sim 724.9 s on the branch and 724.3 s on the base. Every other row of that card is equal or within 1–5.
- Every large difference sits at a CPR or PEA transition sampled 0.4–0.6 s apart in sim time.
- Stage 12 changes no physiology, and no difference exceeds the run-to-run spread in kind.
- **Not a finding.** Evidence: `docs/gates/stage-12/showcase/` (results, run sheets, screenshots, `compare-vs-base.txt`).

### (b) The six cards with a room following

29 simulated phones plus one phone page (Pixel 7, CPU ×4), 30-s phases, on the branch kit's app. Load average about 2. Every card ran ×1, ×8 and the 2-minute fast-forward:

| Case | Phase | Relay out msg/s · KB/s | Per phone msg/s · KB/s | Relay CPU % · RSS MB | Lag p50/p95/max ms | Phone frame p50/p95/max ms | Phone | Tiles equal | Resyncs (cumulative) |
|---|---|---|---|---|---|---|---|---|---|
| showcase-induction | ×1 | 64 · 36 | 2.2 · 1.2 | 0.2 · 104 | 0.2 / 0.7 / 2 | 16.7 / 16.7 / 16.8 | synced | yes | 0 |
| showcase-induction | ×8 | 471 · 286 | 16.3 · 9.9 | 0.8 · 91 | 0.2 / 0.8 / 3 | 16.7 / 16.7 / 50 | synced | yes | 0 |
| showcase-induction | fast-forward | 312 · 340 | 10.8 · 11.7 | 0.7 · 75 | 0.3 / 1.0 / 36 | 16.7 / 33.4 / 33.4 | synced | yes | 1 |
| showcase-induction-premed | ×1 | 67 · 36 | 2.3 · 1.3 | 0.2 · 105 | 0.1 / 1.0 / 2 | 16.7 / 16.8 / 16.8 | synced | yes | 0 |
| showcase-induction-premed | ×8 | 438 · 278 | 15.1 · 9.6 | 0.7 · 92 | 0.2 / 0.8 / 4 | 16.7 / 16.7 / 50 | synced | yes | 0 |
| showcase-induction-premed | fast-forward | 290 · 333 | 10 · 11.5 | 0.7 · 75 | 0.4 / 1.1 / 38 | 16.7 / 33.3 / 33.4 | synced | yes | 1 |
| showcase-anaphylaxis | ×1 | 65 · 36 | 2.3 · 1.2 | 0.2 · 104 | 0.2 / 0.7 / 1 | 16.7 / 16.8 / 16.8 | synced | yes | 0 |
| showcase-anaphylaxis | ×8 | 635 · 337 | 21.9 · 11.6 | 1 · 83 | 0.1 / 0.8 / 4 | 16.7 / 16.7 / 50 | synced | yes | 0 |
| showcase-anaphylaxis | fast-forward | 310 · 338 | 10.7 · 11.7 | 0.7 · 73 | 0.3 / 1.1 / 20 | 16.7 / 33.4 / 33.5 | synced | yes | 1 |
| showcase-mh | ×1 | 67 · 37 | 2.3 · 1.3 | 0.3 · 104 | 0.0 / 1.0 / 30 | 16.7 / 16.7 / 16.8 | synced | yes | 0 |
| showcase-mh | ×8 | 501 · 300 | 17.3 · 10.3 | 0.9 · 65 | −0.3 / 0.3 / 2 | 16.7 / 16.7 / 66.6 | synced | yes | 0 |
| showcase-mh | fast-forward | 338 · 361 | 11.7 · 12.4 | 0.8 · 73 | −0.2 / 0.4 / 25 | 16.7 / 33.4 / 33.5 | synced | yes | 1 |
| showcase-tamponade | ×1 | 78 · 39 | 2.7 · 1.3 | 0.2 · 104 | 0.3 / 1.5 / 3 | 16.7 / 16.7 / 16.8 | synced | yes | 0 |
| showcase-tamponade | ×8 | 596 · 323 | 20.5 · 11.1 | 1 · 88 | 0.2 / 0.8 / 3 | 16.7 / 16.7 / 50 | synced | yes | 0 |
| showcase-tamponade | fast-forward | 406 · 391 | 14 · 13.5 | 0.8 · 73 | 0.3 / 1.1 / 28 | 16.7 / 33.4 / 50 | synced | yes | 1 |
| showcase-haemorrhage | ×1 | 67 · 37 | 2.3 · 1.3 | 0.2 · 104 | 0.2 / 0.7 / 2 | 16.7 / 16.7 / 16.8 | synced | yes | 0 |
| showcase-haemorrhage | ×8 | 525 · 303 | 18.1 · 10.5 | 0.9 · 92 | 0.1 / 0.7 / 4 | 16.7 / 16.8 / 50 | synced | yes | 0 |
| showcase-haemorrhage | fast-forward | 388 · 372 | 13.4 · 12.8 | 0.7 · 74 | 0.2 / 1.0 / 26 | 16.7 / 33.4 / 50 | synced | yes | 1 |
| showcase-bronchospasm, Ventilator view | ×1 | 96 · 43 | 3.3 · 1.5 | 0.2 · 104 | 0.1 / 0.7 / 1 | 16.7 / 16.7 / 16.8 | **holding** | — | 0 |
| showcase-bronchospasm, Ventilator view | ×8 | 522 · 311 | 18 · 10.7 | 1.2 · 65 | 0.4 / 6.9 / 218 | 16.7 / 16.8 / 133.3 | **holding** | — | 1 |
| showcase-bronchospasm, Ventilator view | fast-forward | 339 · 376 | 11.7 · 13 | 0.8 · 35 | 0.4 / 1.2 / 27 | 16.7 / 33.4 / 50 | **holding** | — | 2 |

- Every phase of the six cards reads `synced` with tiles equal, and the only resync per card is the designed one at the end of the fast-forward. **No STOP.**
- Bronchospasm with the Ventilator view reads `holding` in every phase, as designed.
- **Observation O1:** in that bronchospasm run the phone made one extra resync during the ×8 hold. The Step 5 run of the same case (below) had none during ×8. The plan expects at most 1 resync in 8 s and a hold, so this is not a STOP.
- The negative lag p50 on MH is clock skew between the relay process and the page: lag is receive time minus `sentAt`.
- On WebKit there is no CPU throttling, so Task 7's e2e is the phone-viewport check.
- Evidence: `docs/gates/stage-12/classroom/six-cards-room.jsonl`.

## 4. The real phone (Gate Step 4): **PENDING-OWNER**

- The kit for the owner's own-phone test is built from this PR's head (rebuilt at the formal gate; first built from 07d7cd00) at `Desktop/Claude/_sandbox/pme-classroom-dryrun/kit`.
- Beside it: `CLASSROOM.md` (the run sheet), `PRE-FLIGHT.md` (the one-page checklist) and `OWN-PHONE-TEST.md` (the table to fill in).
- The table is also committed as `docs/gates/stage-12-real-phone.md`. Nothing is recorded yet.
- The PR does not merge before the owner's run.
- The kit's `runtime/` is empty (Homebrew Node is not an official build), so the presenting Mac needs Node.js 22 or later.

## 5. Load (Gate Step 5: Task 9's three runs on the merged kit's app)

| Run | Phase | Relay out msg/s · KB/s | Per phone msg/s · KB/s | Relay CPU % · RSS MB | Lag p50/p95/max ms | Phone frame p50/p95/max ms | Phone | Tiles equal | Resyncs | Load avg (1/5/15 min) |
|---|---|---|---|---|---|---|---|---|---|---|
| 30 phones, anaphylaxis | ×1 | 69 · 38 | 2.3 · 1.3 | 0.2 · 83 | 0.3 / 2.2 / 6 | 16.7 / 16.7 / 16.8 | synced | yes | 0 | 2.3 / 2.1 / 2.6 |
| 30 phones, anaphylaxis | ×8 | 544 · 315 | 18.1 · 10.5 | 1 · 28 | 0.3 / 1.0 / 120 | 16.7 / 16.8 / 83.2 | synced | yes | 0 | |
| 30 phones, anaphylaxis | fast-forward | 217 · 305 | 7.2 · 10.2 | 0.8 · 38 | 0.6 / 2.2 / 53 | 16.7 / 33.4 / 50 | synced | yes | 1 | |
| 30 phones, bronchospasm, Ventilator view | ×1 | 100 · 44 | 3.3 · 1.5 | 0.2 · 82 | 0.1 / 0.9 / 2 | 16.7 / 16.8 / 16.8 | holding | — | 0 | 3.2 / 2.7 / 2.8 |
| 30 phones, bronchospasm, Ventilator view | ×8 | 544 · 324 | 18.1 · 10.8 | 1.1 · 40 | 0.2 / 2.2 / 121 | 16.7 / 16.7 / 16.8 | holding | — | 0 | |
| 30 phones, bronchospasm, Ventilator view | fast-forward | 357 · 394 | 11.9 · 13.1 | 0.9 · 38 | 0.4 / 2.8 / 59 | 16.7 / 33.4 / 50.1 | holding | — | 2 | |
| 120 phones, anaphylaxis | ×1 | 271 · 149 | 2.3 · 1.2 | 0.4 · 96 | 0.8 / 2.1 / 7 | 16.7 / 16.7 / 16.8 | synced | yes | 0 | 3.1 / 2.9 / 2.9 |
| 120 phones, anaphylaxis | ×8 | 2655 · 1400 | 22.1 · 11.7 | 1.9 · 31 | 0.5 / 1.6 / 106 | 16.7 / 16.7 / 83.4 | synced | yes | 0 | |
| 120 phones, anaphylaxis | fast-forward | 1287 · 1388 | 10.7 · 11.6 | 2 · 54 | 1.0 / 2.6 / 105 | 16.7 / 33.4 / 66.7 | synced | yes | 1 | |

- The capacity table is matched: about 1.3 KB/s per phone at ×1 and 10.5–11.7 KB/s at ×8.
- Relay CPU is at most 2 % at 120 phones, against the 10 % threshold. Lag p95 is at most 2.8 ms, against 100 ms.
- The phone stayed `synced` (or `holding` with the Ventilator view).
- In every run the phone one over the limit was refused as `full`; each run's test asserts this.
- An earlier run on the pre-merge tree (6c412b18, Task 9) gave the same numbers within ±0.3 KB/s.
- Evidence: `docs/gates/stage-12/classroom/load.jsonl`.

## 6. Findings and open questions

- **F1: passed only on a re-run** (everything ran with `--retries=0`).
  - **Unit.** Under a load average of 190–230 (other executors' suites, plus about 7 hours in which the machine apparently slept), 20 engine-core tests in 18 files timed out. A re-run of those 18 files passed: **18 files, 55 tests**. Also:
    - The controller's `s10-fast-forward` "is paced to the wall time" measured 5.35 s against a limit under 4 s. Run alone, its file passed (8 of 8 tests).
    - The demo's `physiology-console/view.dom` "phenylephrine" timed out at 30 s. Run alone, its file passed (10 of 10 tests).
    - Stage 12 touches no engine file and neither of these two paths. They are load and timing flakes, but they are listed as asked.
  - **e2e.** In Task 7's neighbour run (five files in parallel), `s10-time-control`'s 5-minute test failed once on WebKit (`toHaveText`). It then passed 1 + 4 of 4 alone and passed in the full e2e. This is the same Stage 10 load flake the plan saw on Chromium.
  - **The `fu11-follower` WebKit flake:** branch 1 of 16, base 1 of 16 (§2).
  - `iife-smoke` and `stage6a-worker` are not flakes: they need `pnpm build` first, as in CI.
- **O1:** the one extra resync during the bronchospasm hold at ×8 (§3b). Not a STOP; the real-phone run's optional Ventilator-view check will show it if it matters.
- **Stage 10 gap (closed):** the dry run's tree lacked Stage 10's last commits (`bae65d22`, `21e57186`). The formal gate's merge of main 8c74d994 brought them in, and the block check passed again (§0).
- **The six-card rehearsal and the phone room (§3) and the load runs (§5) were not repeated on a075fd39.** Since the dry run, the merge changed only other plans' files: the seam label, the scenario library, the card button and test files. The 34 Stage 12 files are identical. The owner's real-phone kit in `Desktop/Claude/_sandbox/pme-classroom-dryrun/kit` was rebuilt from this PR's head, so it has main's fixes. The headless Start Classroom check on it passed: `/pme-relay.json` `serves:true`, `/?join=` 200, and nothing listening after the stop.
- **Q5 (the owner's), open:** the network on the day, and Node.js 22 or later on the presenting Mac. The pre-flight checklist is in `docs/showcase/CLASSROOM.md` and `PRE-FLIGHT.md` beside the kit.
