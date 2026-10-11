# Stage 10: time control — ×8 and a paced fast-forward of 5 or 2 minutes — Implementation Plan

STATUS: REVIEWED-FIXED (2026-10-10, base `origin/main` 48864439 + the FU-11 FIXED prototype (`scratch/plans-backup/fu-11-prototype.patch` of 2026-10-07 00:46, four branches a–d), 3 576 lines) — R50 review `scratch/plans-backup/stage-10-review.md` (0 critical, 4 important, 6 minor: all applied) and the owner's decisions of 7 Oct (pace ≈ 10 s behind a panel, 5 and 2 min, allowed in CPR, beat tone off above ×4, latched fast-forward alarms, the Ventilator view steps through the span) applied; executes after FU-11 (all four branches) has merged

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Prototype: every task below was run in a detached worktree (`origin/main` 48864439 + the FU-11 FIXED prototype patch,
> committed locally as the base 6743e40f; one local commit per task; first pass `scratch/wt-stage-10-proto`, the R50
> rebuild `scratch/wt-stage-10-review`) and its find/replace blocks were CUT MECHANICALLY from those commits
> (`scratch/plans-backup/stage-10-plan-tools/blocks.py`, chain in `chain.txt`): applying every block of this file, in
> order, to the base reproduces each task's tree and the final tree byte for byte (`check.py`: 114 blocks + 10 creates, 37 files: 0 problems — every task tree and the final tree byte-identical; the same blocks on bare `origin/main` 48864439 WITHOUT FU-11: 23 problems, so the FU-11 dependency is real). Patch (base →
> final): `scratch/plans-backup/stage-10-prototype.patch`. Nothing was committed to any branch, nothing was pushed; the
> worktrees were removed. The first pass's tools and blocks are kept beside the new ones (`*.pre-r50.*`).

**Goal:** the owner's request for the 22 October demonstration — "a ×8 speed setting, and a setting to fast-forward a set
amount of time very fast (5 min in about 10 s), with the sound silenced during it or a sound effect showing that this is a
fast-forward" — and his decisions of 7 October, with no physiology change: ×8 as a fourth speed, the beat tone off above
×4; a fast-forward of exactly 5 or 2 minutes of simulated time (2 min = the CPR pulse-check interval), PACED to ≈ 10 s
of wall time behind one panel on every window (page dimmed and blurred, a pulsing double chevron, "FAST FORWARD · 5 MIN"
in amber, the clock running over a progress bar, "sound muted"), sound muted while it runs and one two-tone cue at its
end; then a seam on every waveform lane at the jump, a banner for ≈ 8 s with the alarms raised during it and their times,
the alarms that came and went latched (silent) on the monitor until the next acknowledge, the clinical log; a host
action every controller sees (like speed and pause), allowed during arrest and CPR, no Cancel; the Ventilator view's
cockpit ventilates the patient through the span; and the same patient as running the span (with and without the cockpit).

**Architecture:** ×8 is one constant (`MAX_TIME_SCALE`, engine clock) that every former "0.25–4" site now reads; the
renderer schedules no beat tone (QRS, pulse) above ×4 (`BEAT_TONE_MAX_SCALE`). The fast-forward reuses the brief's
reserved `time jump` command (until now refused, "arrives in Stage 6b") with `value` = seconds: the HOST runs it
outside its command chain, in steps of 25 ticks (0.5 s of sim) through a new `HostTarget.fastForwardStep` (renderer:
`MonitorCore.advance`, the `advance` worker request, `MonitorHandle.advance`), after an empty first step that reads the
monitor's own tick, paced to `fastForwardWallMs` (the app: 10 s). The monitor holds its clock and draws nothing between
steps; the scenario driver polls after every step and the host applies what it submitted before the next step, so the
span keeps the engine's event order and gives the same patient (proved by two tests: a scenario case, and the
bronchospasm case on the cockpit). A cockpit that was ventilating is stepped with the engine: before each step the
Ventilator view's link has it produce that step's frames now (`LinkDetach.runTo`, a new `run` link message). Every peer
gets a `fastForward` start (with the pace) and end (with every alarm raised during it); controllers' commands are refused
while it runs; the second screen waits and resyncs from the end snapshot; the app draws the panel and the banner above
every view, hands the alarms that came and went to the monitor (`MonitorHandle.latchAlarms`), and logs the span.

**Tech Stack:** TypeScript 5.9 strict (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `noImplicitOverride`), Vitest
3.2.7, Playwright 1.63 (its own Chromium 1243 + WebKit 2359), pnpm 9.15.9 via `npx`, Node ≥ 22.12. No new dependencies.

**Spec:** the brief `../scratch/briefs/plan-stage-10-time-control.md` (workspace, outside this repo; the owner's request
and the orchestrator's decisions), `../research/00-orchestrator-rulings.md` (2026-10-06 "Plan agreed … (3) time control:
×8 and fast-forward 5 min (sound muted, visible marker)"), FU-11 Task F3 (`docs/plans/fu-11-hardening.md`: every
controller shows the host's speed and pause — this plan builds on its `ControllerSession.timeScale` / `hostPaused`
contract and adds `fastForward` beside them), `../research/24-showcase2-probes.md` §P6 (the ×4 clamp sites; reconciled
below), `docs/DESIGN-BRIEF.md` §3.3 (clock), §7.2 (`time` commands), `docs/RESUME.md` (process, R45, R50).

---

## Global Constraints

- **No physiology change.** No model equation, constant, band or acceptance number changes. The engine edits are the
  clock's `MAX_TIME_SCALE` (4 → 8) and two comments. The renderer's beat-tone rule (no QRS beep or pulse tone above ×4)
  and the latched fast-forward alarms are presentation (renderer), not the engine's alarm manager. A physiology item
  found while executing goes to the FU-12 / calibration lists, never into this branch.
- **R45: no test band changes.** Three existing tests that pinned the old ×4 LIMIT (not a physiology band) are restated
  for the new limit: `clock.test.ts` (×8 accepted, 8.5 refused; ×8 added to the two scale sweeps) and
  `engine-commands.test.ts` (refuses 9 instead of 8). No tolerance is widened anywhere.
- **The five showcase scenarios do not change behaviour at ×1–×4.** The gate runs the scripted five-case rehearsal (both
  engines) on a kit built from the branch and compares with FU-11 Gate B's numbers.
- **Determinism:** same seed, same actions → same truth with or without a fast-forward (Task 3's test compares the 1 Hz
  truth of 350 s, the scenario's path and probability rolls, the commands it applied and the final engine state; Task
  4's does the same for the bronchospasm case with the Ventilator view's cockpit ventilating through the span). The pace
  (≈ 10 s of wall time) changes only the waits between steps, never the steps.
- **Starts after FU-11.** All four FU-11 branches (a, b, c, d) must be on `origin/main` before Task 0: 18 of the 37 files
  this plan touches are FU-11 files, and every block in them was cut against FU-11's FIXED prototype text (see "File
  ownership against FU-11"). If FU-11 is not fully merged, STOP and report.
- **Process (RESUME executor brief):** one branch `stage-10-time-control` in the worktree `../scratch/wt-stage-10` from
  `origin/main`; failing test → run red → implement → run green → typecheck → commit with the task's message and the
  trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` → `git push` after EVERY task. Never push to main;
  never merge; the gate opens the PR and stops. Never `git stash`. Never run a command that reads standard input.
  Bounded waits (≤ 10 min per `until` loop). Kill only processes you started (never an unfiltered `pkill`). Scratch
  files under `<scratchpad>/stage-10/` only. The machine is shared: targeted tests in tasks, full suites once, in the gate.
- **Find/replace discipline:** every edit is a block that occurs exactly once at its place (`check.py --base-dir .`
  proves it in Task 0 and again in the gate after merging main). If main moved and a block no longer matches, locate the
  statement by the surrounding unchanged lines and make the same change; never re-type a line you are not changing.
- **Commands:** `npx -y pnpm@9.15.9 …` (pnpm is not on PATH); no `timeout` on macOS; engine tests with `CI=1`; e2e
  `npx playwright test <stem> --retries=0` from the worktree root (both projects unless `--project=…`).
- **Copy (R56; the owner's wording of 7 Oct):** UI copy only, no clinical label: "×8"; the session bar's group
  "Fast-forward" with "2 min" and "5 min" (accessible names "Fast-forward 2 min", "Fast-forward 5 min"); the panel
  ("FAST FORWARD · 5 MIN", the running clock mm:ss over its start and end, "sound muted"); the banner ("Fast-forwarded 5
  min, 12:00 → 17:00. During it: <alarm> mm:ss, …." / "During it: no alarms."); the latched entry ("<alarm> · during
  fast-forward mm:ss"); the seam's label (mm:ss); the log lines ("Fast-forward 5 min started (sound muted until it
  ends)", "Fast-forward ended; alarms during it: <alarm> mm:ss, …" / "no alarms during it"); the refusal reasons. Times
  read as the session bar's clock does (mm:ss; the owner's "hh:mm" is that clock).
- **Never touch:** `l2/**`, `l3/**` model and device files, `docs/physiology/**`, `package.json`, `pnpm-lock.yaml`,
  `.github/**`; and FU-7.1's files (`l2/pk`, `l2/circ`, `l2/gas`, `l2/endo`, `l2/resp/pipeline.ts`,
  `apps/demo/src/app/drugs.ts`, `apps/demo/src/app/panel/drugs.ts` — none is in this plan).

## Review Focus

1. **A session paused before the fast-forward.** The instructor pauses, then fast-forwards: the span runs and the
   session is still paused after it (the monitor's clock returns to the pause state it had). Pinned in Task 2
   (`a session paused before the fast-forward is still paused after it`).
2. **The instructor's window hidden during the span** (another window brought to the front, the projector mirrored).
   The fast-forward is driven by requests, not frames, so it continues; the hidden-tab catch-up must not add the hidden
   wall time on top. Pinned in Task 2 (`a hidden-tab catch-up during the fast-forward adds nothing`).
3. **A Remote or a second screen opened during the span.** A late joiner must show the fast-forward running (sticky
   jump), not a frozen session. Pinned in Task 3 (`a controller that joins during the fast-forward sees it running`)
   and the viewer test.
4. **A new patient or scenario loaded during the span.** A patient restart stops the fast-forward on the old timeline
   (it does not step the new monitor, nor give it a clock back) and says why; a scenario load from the instructor's
   panel is refused while the span runs (the host refuses the scenario command, so the new body would have run without
   its scenario). Pinned in Task 3 (`a new timeline … stops the fast-forward and says why`) and Task 5 (`loadScenario`).
5. **The Ventilator view in use.** A cockpit that was ventilating when the span began is stepped with the engine (its
   frames for every tick of each step are dispatched before the step); a cockpit opened during a span waits for its end
   (its first frames held, so the link learns its clock) and then ventilates. Pinned in Task 4 (`runTo`, the cockpit
   determinism test) and Task 5's e2e (the view opened mid-span; then a 2-minute span with it ventilating: a frame on
   every tick).

---
## Decisions (made while prototyping; the executor does not revisit them)

- **D-1 — ×8 is the clock's constant.** `MAX_TIME_SCALE` 4 → 8 in `engine-core/src/clock/clock.ts`; the host's scale
  check, the viewer's rate clamp and the viewer clock's clamp read `MIN_TIME_SCALE`/`MAX_TIME_SCALE` instead of literal
  0.25/4; the session bar's speeds are `SPEEDS = ['1','2','4','8']` (and FU-11 F3's `['1','2','4'].includes(k)` reads
  it). The brief §3.3 and §7.1 lines are updated. Every site of research/24 §P6 is accounted for in "×4 clamp sites".
- **D-2 — what ×8 does when it cannot keep up: the existing policy, unchanged.** `Clock.advance` clamps a frame's wall
  time to 250 ms (`MAX_FRAME_MS`), so a slow frame advances at most 2 s of sim at ×8 and every tick still runs: when the
  worker cannot keep up, sim time runs SLOWER than ×8 (no skipped ticks, no spiral). The hidden-tab catch-up stays
  unclamped (8 s of sim per 1 s pump at ×8). Measured: ×8 held exactly in both engines (see "Prototype results").
- **D-3 — the wire: `time jump`, a `fastForward` event, a sticky jump.** `{ type: 'time', action: 'jump', value: s }`
  = fast-forward `s` sim seconds (0 < s ≤ 600; the app sends 120 or 300). `step` stays refused ("time step is not
  supported"). New wire event `{ type: 'fastForward', t, tick, phase: 'start' | 'end', fromT, toT, wallMs?, stopped?,
  alarms? }` — `wallMs` on the start (the pace), `alarms` on the end: every alarm raised during the span, once, as the
  engine's `AlarmEntry` plus `ended` (no longer active at the end). While it runs the host keeps the jump as the sticky
  `time.jump` (with `atTick` = where it began), so a late joiner sees it.
- **D-4 — the host runs it in lockstep steps, paced.** A worker-side burst would leave the scenario's commands a whole
  span late (the runner polls on the main thread). The host first runs an EMPTY step (it reads the monitor's own tick:
  the host's `now()` is an estimate between events, up to `EST_CAP_S` × scale = 12 s of sim at ×8, so the span is exact
  on the monitor), then steps 25 ticks at a time (`FF_STEP_TICKS`, 0.5 s of sim); `ScenarioDriver` wraps
  `fastForwardStep` and polls after each non-empty step; the host awaits its own command chain (where the scenario's
  commands go) before the next step, then waits until the step's share of `fastForwardWallMs` has passed (the app:
  `FF_WALL_MS` = 10 000, the owner's decision 1; default 0 = as fast as the monitor runs, which the unit tests use).
  Measured without the pace: 5 min in ≈ 1.5–1.7 s, so the pace is reachable in both engines.
- **D-5 — what "same outcome" means.** The scenario runner reads the engine through polls; in the app it polls every
  100 ms of WALL time (0.8 s of sim at ×8), so two ×1 runs of the app differ in poll timing already. The proof is
  therefore: one seed, one set of actions, the scenario polled every 0.5 s of sim — run straight through, and run with a
  300 s fast-forward in the middle — give identical truth every second, identical scenario path and rolls, identical
  scenario commands at identical ticks, identical final state (Task 3); and the same with the Ventilator view's cockpit
  ventilating, its frames produced before each step in both runs (Task 4). The fast-forward polls the runner more
  finely than the app does at ×8.
- **D-6 — controllers wait; allowed in arrest and CPR; no Cancel.** While the host fast-forwards, a controller's
  command (the instructor panel, a Remote) is refused with "the simulation is fast-forwarding; try again when it ends";
  the host's own scenario is not refused (it must keep running through the span). A scenario load from the instructor's
  panel is refused the same way (it would remount the patient locally while the host refuses its scenario command). A
  fast-forward is allowed during an arrest and during CPR (owner's decision 3: compressions stay on as set, a
  probability roll may happen inside the span; the banner and the log say what happened). No Cancel (decision 2).
- **D-7 — sound muted by removing the voice, not by the Sound toggle; one cue at the end.** On the first step the monitor
  drops its alarm voice (`AlarmSounder.dispose`), clears every queued and sounding tone (`ToneScheduler.clear`) and
  schedules no tone; a Sound turned on during the span builds no voice until it ends; after the last step it builds the
  voice again from the CURRENT alarm status (`makeSounder` replays it, so an alarm still active sounds, and FU-11 B4's
  silence-by-priority state comes from the engine's status, untouched) and plays one short two-tone cue (660 + 990 Hz,
  `playBeep` on the master gain: the Sound toggle applies; none at the start — decision 1). FU-11 H4's Sound toggle is
  untouched and independent.
- **D-8 — drawing.** `MonitorCore.frame` returns at once while a fast-forward holds the clock (no tick, no draw); the
  first frame after it redraws each lane from the engine's buffers (the SweepLane rule for a jump longer than a lane),
  the overlay marks of the span are dropped, the next frame counts wall time from itself. The last step adds one overlay
  mark of a new kind, `seam`: a thin full-height line on EVERY lane (ECG and waveform) at the jump, labelled with the new
  time (mm:ss); the sweep erases it a lap later like any mark (decision 1). The trends hold the span (the renderer's
  TrendStore records every 1 Hz measurement event of it; the e2e checks ≥ 290 of 300 seconds); the tiles, alarms and
  NIBP results are the engine's events of the span, delivered in order.
- **D-9 — the second screen waits, then resyncs.** A viewer pauses at the start and takes a fresh snapshot at the end
  (it does not compute the span itself: on the same laptop that would halve the instructor's speed). It keeps the
  host's time from the events it ignores meanwhile (`ViewerSync.fastForwardAt`) so its panel's clock runs, and the host
  sends it no cockpit mirror during the span (it would drop them). Its own TrendStore lacks the span; the app shows no
  trend view, so nothing visible is lost (recorded for a later trends view).
- **D-10 — the Ventilator view steps with the span (owner's decision 6).** The cockpit runs on its own wall clock; the
  engine drops an external drive after 5 s of sim without a frame (`DRIVE_TIMEOUT_S`). If the cockpit was ventilating
  when the span began (a frame in the last 2 s, `VENT_DRIVING_MS`), each app step first calls the link's `runTo(tick +
  n)`: the monitor side posts `{ kind: 'run', ventTick }`, the cockpit runs its ventilator tick by tick up to it at once
  and posts each tick's commands, the monitor side dispatches them with their `atTick` and resolves; the step's advance
  request reaches the worker after them (one FIFO), so every tick of the span has its frame (the tests count them). A
  cockpit that does not answer within `RUN_TIMEOUT_MS` (2 s) is given up on (the engine's own drive timeout takes over,
  as when the cockpit is closed). A cockpit opened DURING a span (not ventilating at its start) has its first frames
  held until the end — refused or dispatched mid-span, they never taught the link its clock offset and the cockpit
  stalled for good (found in the first prototype; the owner asked to keep this fix). FU-11 H6 unloads the cockpit on a
  new patient. Cost: Task 4 (2 ventilator files, 11 blocks, 2 test files) + 11 blocks in `session.ts` / `views/vent.ts`.
- **D-11 — a new timeline ends it.** A patient restart during the span (`HostSession.newTimeline`) stops the
  fast-forward before its next step; a step in flight on the replaced monitor rejects ("the monitor was destroyed") and
  is NOT answered by giving the NEW monitor its clock back; the end event says "a new patient or scenario started" and
  carries the new timeline's time (a controller's clock is monotonic within a timeline).
- **D-12 — the panel and the banner (owner's decision 1).** While it runs, one overlay above every view (the monitor in
  full screen included) dims and blurs the page (`backdrop-filter`) behind a centred panel: a double chevron pulsing
  slowly (still under `prefers-reduced-motion`), "FAST FORWARD · 5 MIN" in amber (#ffb000, not alarm red) in the
  monitor's typeface (the skin's `fontStack`; a Remote: the UI font), the clock running from the start to the end time
  over a thin progress bar, and "sound muted" with a crossed speaker. The page cannot be clicked through it. After the
  end the panel fades (0.4 s) and a banner stays 8 s (`FF_DONE_SHOW_MS`). Every window: the instructor's page
  (Instructor, Monitor, Explore, Ventilator views — one shell), a Remote, the second screen.
- **D-13 — alarms that came and went inside the span are latched (owner's decision 5).** The host lists every alarm
  raised during the span (D-3); the banner and the log list them with their times; the instructor's monitor and the
  second screen latch the ones that came and went (`MonitorHandle.latchAlarms`): silent entries "<alarm> · during
  fast-forward mm:ss" in the alarm area (the skin's latched presentation: level colour on the idle bar, no lamp, no
  sound), until the next acknowledge (`device alarm ack` or `silence`, from any controller). The model: real monitors
  keep an alarm history, so a learner does not lose the span's events to the time jump — the Saadat Alborz B9 (the
  `saadat-like` skin) keeps an alarm recall of its last 20 alarms with their numerics and waveforms (research/06 §4.2,
  manual [M p. 238–239, 276]; research/13 commercial benchmarks §7), and the latched presentation is FU-5's (an alarm
  whose condition ended stays on the bar until acknowledged, without lamp or tone under visual latching: Philips
  IntelliVue, research/05 §6 [S2] IFU p. 40, as `alarm-view.ts` records). An alarm
  the engine itself latches (an extreme limit) is shown by the engine already and is not latched twice. A rewind drops
  latched entries after the restored time.
- **D-14 — the beat tone above ×4 (owner's decision 4).** At ×8 a heart rate of 80 would beep 10.7 times a second. The
  renderer schedules no `qrs` or `pulse` tone above ×4 (`BEAT_TONE_MAX_SCALE`); alarms and device tones always sound.

## Prototype results (before = base 6743e40f = main + FU-11 FIXED prototype; after = the R50 prototype's last task; both engines)

Measured on this Mac (Apple M3, 8 cores; a shared machine — load average 3–12 in the first pass, 18–30 in the R50
rebuild), Playwright's Chromium 1243 and WebKit 2359, headless, 1280×720. "Dev" = the Vite dev server the e2e uses
(every R50 number below is dev); "build" = `vite build` + `vite preview` (first pass). Rows marked "first pass" were not
re-measured: nothing they depend on changed.

| Check | Before (base) | After (prototype) |
|---|---|---|
| ×8 in the session bar; host `time scale 8` | no button; refused "scale must be 0.25–4" | ×1 ×2 ×4 ×8; accepted; 8.5 refused "scale must be 0.25–8" |
| ×8 held, 30 s wall, showcase anaphylaxis | — | Chromium ×8.00, WebKit ×8.00 (first pass, build: ×8.00 / ×8.01) |
| same with bronchospasm + the Ventilator view's cockpit | — | Chromium ×8.00, WebKit ×8.00 (first pass, build: ×8.01 / ×8.01) |
| main-thread frame interval at ×8 (p50 / p95 / max), anaphylaxis; with the cockpit | — | Chromium 16.7 / 16.8 / 17 ms, 16.7 / 16.7 / 17; WebKit 17.0 / 18.0 / 36 ms, 17.0 / 20.0 / 68 |
| engine tick cost, Node; page main thread; worker (first pass) | 0.147–0.182 ms/tick | unchanged (no engine change); main thread 0.49–0.55 ms; worker 0.108–0.115 ms → ×8 ≈ 45 ms of worker CPU per wall second |
| beat tone at ×8 (QRS/pulse tones scheduled after the switch) | first pass: 300–348 tones / 30 s at ×8 | 0 (decision 4); at ×1 before and after: > 0 (e2e) |
| fast-forward of 300 s, request → end event | refused ("time jump arrives in Stage 6b") | paced to 10 s: anaphylaxis Chromium 10.01 s, WebKit 10.03 s; bronchospasm + the cockpit stepping: Chromium 10.00 s, WebKit 11.57 s (unpaced, first pass: 1.5–1.7 s) |
| the e2e, click → panel gone (incl. four view switches) | — | Chromium 10.3–10.7 s, WebKit 10.3–10.8 s |
| after the span: sim time; trends; tones inside; the cue; tones after | — | +300.00 s from the monitor's own start tick; HR in ≥ 290 of its 300 s; 0 tones inside; one 660 + 990 Hz cue ≥ 9 s after the click, none at the start; beat tones again at ×1 |
| the panel (dimmed, blurred page; title; running clock; "sound muted") on the Instructor, Monitor, Explore, Ventilator views and the second screen | — | shown during the span, the clock changing within 1.5 s; gone after it; the banner "Fast-forwarded 5 min, mm:ss → mm:ss. During it: …" on the instructor's page and the second screen (both engines) |
| a latched fast-forward alarm in the monitor's alarm bar, then an acknowledge | — | "E2E LATCHED · during fast-forward 00:01" shown; gone after `device alarm ack` (both engines) |
| the end event's alarm list (unit test: HR HIGH raised at ≈ 10 s and gone; EXTREME BRADY from ≈ 40 s) | — | `[["**HR 75>70", true], ["***EXTREME BRADY", false]]` with their raise times |
| determinism: acls-pea-hypovolaemia, seed 7, actions at 20 s and 320 s, stepped vs a 300 s fast-forward | — | identical: 350 truth events, scenario path (bleeding → PEA inside the span) and its roll, scenario commands, final state |
| determinism WITH the cockpit: showcase bronchospasm, salbutamol before the span, stepped vs a 300 s fast-forward | — | identical truth (≥ 325 s), path (spasm → treated), scenario commands, final state; a cockpit frame on every one of the 15 000 ticks in both runs |
| the tests catch a broken fast-forward (mutations) | — | no poll after a step: the scenario test fails (`expected [ …(350) ] to deeply equal …`, first pass); no `runTo` in the cockpit test: `expected 14995 to be +0` |
| cockpit through a span in the browser (e2e: view opened mid-span, then a 2-min span with it ventilating) | refused ("the Ventilator view is ventilating the patient", first pass) | its frames contiguous through the span (≥ 5 925 ticks, both engines); a fresh case: 5 993 frames, no alarm; the anaphylaxis case later arrests on its own (IBP STATIC PRESSURE 05:26, SPO2 NO PULSE 05:36 — the case, not the link) |
| NIBP auto-cycle (1 min) through a 300 s span vs the same 300 s drawn at ×4 | — | identical results at identical times (Task 2 test) |
| second screen during and after the span | — | paused during it, its panel clock from the host's events; resynced from the end snapshot; ticks equal to the host's |
| package suites on the prototype (targeted runs; machine shared) | — | renderer 31 files / 101; ventilator 21 / 106; controller s10 + session + scenario green alone (the full controller run on the loaded machine timed out in relay, BroadcastChannel and three s10 tests — load, not defects; timeouts widened); demo s10 files 4 / 5 |
| typecheck (`pnpm -r typecheck`) | clean | clean |
| e2e on the prototype, both engines: `s10-time-control` | — | 2 passed, 2 skipped (measure) |
| neighbour e2e (both engines): `fu11-vent-*`, `fu11-follower`, `fu11-sound-toggle`, `fu11-pause-label`, `fu11-alarm-label`, `stage9-a11y`, `stage9-app`, `vent-link`, `showcase-clock`, `audit-timeline`, `audit-worker`, `stage4b-device` | — | 60 passed, 4 skipped (WebKit's existing skips in stage4b-device and vent-link), 6.6 min |

Not run in the prototype: the five-case scripted rehearsal on a kit (the gate runs it, G4); the full e2e suite (G2).

## ×4 clamp sites (brief: "find every site"; reconciled with research/24 §P6)

| # | Site (on the FU-11 base) | Before | After (task) |
|---|---|---|---|
| 1 | `packages/engine-core/src/clock/clock.ts` `MAX_TIME_SCALE` and the header comment | 4 ("limited to 0.25–4") | 8 (T1); P6 #1, #2 |
| 2 | `packages/engine-core/src/engine.ts` `setTimeScale` comment | "throws RangeError outside 0.25–4" | "0.25–8 (MIN_TIME_SCALE–MAX_TIME_SCALE)" (T1); P6 #3 |
| 3 | `packages/controller/src/session/host-session.ts` `HostTarget.time` doc and the `scale` check | literals 0.25/4, "scale must be 0.25–4" | the clock's constants, "scale must be 0.25–8" (T1); P6 #4 |
| 4 | `apps/demo/src/app/sessionbar.ts` speeds, comment (`:19` on main), FU-11 F3's `['1','2','4'].includes(k)` | ×1 ×2 ×4 | `SPEEDS` ×1 ×2 ×4 ×8 (T1); P6 #5 |
| 5 | `packages/controller/src/session/viewer-sync.ts` `follow()` rate clamp | `Math.min(4, Math.max(0.25, …))` | the clock's constants (T1); P6 lists `:179` (`hostRate`, unbounded) — the clamp is at `follow()` |
| 6 | `packages/renderer/src/mount.ts` `viewerClock().setRate` clamp (FU-11 G2's second screen) | `Math.min(4, Math.max(0.25, k))` | the clock's constants (T1); not in P6 |
| 7 | `docs/DESIGN-BRIEF.md` §3.3 and §7.1 | "0.25–4" | "0.25–8" (T1) |
| 8 | tests: `clock.test.ts`, `engine-commands.test.ts`; `stage4b-device.e2e.ts` comment "max 4×" | pinned the old limit | restated (T1; not bands) |
| — | P6 #6 `MAX_FRAME_MS` 250 | 1 s of sim per slow frame at ×4 | 2 s at ×8; the catch-up policy, kept (D-2) |
| — | P6 #7 engine tone look-ahead 0.1 s sim vs the scheduler's 0.1 s real | 25 ms real ahead at ×4 | 12.5 ms at ×8; the beat tones (the only per-beat ones) are off above ×4 (T2, D-14); first-pass measure: QRS at ×8 300–348 tones / 30 s, 0 dropped |
| — | P6 #8–#10, #12, #13 (audio clock map, renderer forwarding, hidden-tab pump, the cockpit's `d.scale`, `hostRate`) | unbounded | unbounded; ×8 measured with the Ventilator view (×8.00 held) |
| — | P6 #11 `EST_CAP_S` 1.5 s × scale (app clock estimate) | 6 s of sim at ×4 | 12 s at ×8; between fast-forward steps the estimate is exact (T5), and the span starts at the monitor's own tick (T3, D-4) |
| 9 | `packages/controller/src/session/host-session.ts` `mirror()` comment (FU-11 K2: "up to 200 commands a second at ×4") — not in P6 | sized for ×4 | "400 a second at ×8" (T3); no mirror during a span (D-9) |
| — | P6 #14 renal `timeScale` (KDIGO compression 1–24) | unrelated | unchanged |

## File ownership against FU-11

No file FU-11 changes is edited here except by a block written against FU-11's final text: every block below was cut
from the FU-11 FIXED prototype (patch of 2026-10-07 00:46, base 48864439). FU-11 must be merged before Task 0 (all four
branches); Task 0 runs `check.py --base-dir .` on that main and the gate runs it again after merging main.

| File | FU-11 tasks that edit it | Stage 10 blocks (task: count) |
|---|---|---|
| `apps/demo/e2e/stage4b-device.e2e.ts` | c: K1 | T1: 1 |
| `apps/demo/src/app/app.css` | b: H3 · d: G2 | T5: 1 |
| `apps/demo/src/app/link.ts` | b: E4 | T5: 2 |
| `apps/demo/src/app/main.ts` | a: C1 · b: H3, H4 · d: G2 | T5: 3 |
| `apps/demo/src/app/session.ts` | b: H1, H4 · d: G2 | T5: 9 |
| `apps/demo/src/app/sessionbar.ts` | a: F3 | T1: 3, T5: 4 |
| `apps/demo/src/app/views/vent.ts` | b: H1, H6 · d: G2 | T5: 2 |
| `packages/controller/src/protocol.ts` | a: F2 · b: E3 · d: G1 | T3: 3 |
| `packages/controller/src/session/controller-session.ts` | a: F2, F3 · b: E3 · d: G1 | T3: 6 |
| `packages/controller/src/session/host-session.ts` | a: A3, C2 · b: E3 · d: G1 | T1: 3, T3: 13 |
| `packages/controller/src/session/viewer-sync.ts` | b: E3 | T1: 2, T3: 6 |
| `packages/engine-core/src/engine.ts` | b: D1, D2 · c: I1, I2, J6 | T1: 1 |
| `packages/renderer/src/engine.worker.ts` | a: C1 · b: E2 | T2: 1 |
| `packages/renderer/src/monitor-core.ts` | b: E2, E5 | T2: 5 |
| `packages/renderer/src/mount.ts` | a: B3 · b: E2, H4 · d: G2 | T1: 2, T2: 11 |
| `packages/renderer/src/protocol.ts` | a: C1 | T2: 2 |
| `packages/renderer/src/worker-host.ts` | a: C1 · b: E2 · d: G2 | T2: 4 |
| `packages/ventilator/src/link/port.ts` | b: E3b · c: I4 | T4: 8 |

Files only Stage 10 edits or creates: `apps/demo/e2e/s10-time-control.e2e.ts` (T5: create); `apps/demo/src/app/describe.ts` (T5: 2); `apps/demo/src/app/fast-forward.ts` (T5: create); `apps/demo/src/app/s10-fast-forward.dom.test.ts` (T5: create); `apps/demo/src/app/s10-fast-forward.test.ts` (T5: create); `apps/demo/src/app/s10-ff-cockpit.test.ts` (T4: create); `apps/demo/src/app/views/remote.ts` (T5: 2); `docs/DESIGN-BRIEF.md` (T1: 2); `packages/controller/src/scenario/driver.ts` (T3: 1); `packages/controller/test/scenario/s10-ff-determinism.test.ts` (T3: create); `packages/controller/test/session/s10-fast-forward.test.ts` (T3: create); `packages/controller/test/session/s10-speed.test.ts` (T1: create); `packages/engine-core/src/clock/clock.ts` (T1: 2); `packages/engine-core/test/clock/clock.test.ts` (T1: 5); `packages/engine-core/test/engine/engine-commands.test.ts` (T1: 1); `packages/renderer/src/overlays.ts` (T2: 4); `packages/renderer/test/s10-fast-forward.test.ts` (T2: create); `packages/ventilator/src/link/vent-driver.ts` (T4: 3); `packages/ventilator/test/s10-run.test.ts` (T4: create).

If FU-11's merged text differs from its prototype at a block's place (its executor amended it), the block fails the
Task 0 check: locate the statement by the quoted Stage 10 line's unchanged neighbours, make the same change, and note
it in the gate note. Nothing in Stage 10 depends on FU-11 internals beyond: F3's `ControllerSession.timeScale` /
`hostPaused` and the session bar's draw loop (T1, T4), E3's `timeline` event and `newTimeline` (T3), G2's follower and
`viewerClock` (T1, T5), H4's `makeSounder` (T2), H6's cockpit unload (D-10, T5), C1's worker request table (T2), E3b/I4's
link generation and probe (`attachMonitorToLink`: T4 adds a `run` message and a `runTo` property on the detach function it
returns — its callers, which use it as `() => void`, are unchanged), B4's silence by priority (D-7: untouched).

**Against FU-7.1** (`docs/plans/fu-7.1-drug-physiology-leftovers.md`, which owns `l2/pk`, `l2/circ`, `l2/gas`,
`l2/endo`, the breath event in `l2/resp/pipeline.ts`, `apps/demo/src/app/drugs.ts` and `panel/drugs.ts`): no file in
common (checked over the 37 files of `blocks.json`); the two plans merge in either order.

## Owner's decisions (7 Oct 2026; all questions closed)

The first pass asked eight questions (Q1–Q8); the owner answered them on 7 October (`research/00-orchestrator-rulings.md`
"ALI'S ANSWERS", items C1–C8) and the orchestrator's brief for this review restated them. All are built in:

| # | Question | Decision | Where |
|---|---|---|---|
| Q1 | Allowed during arrest and CPR? | Yes, keep | D-6 |
| Q2 | The marker's words and place | Replaced by the panel and the banner (decision 1); wording in Global Constraints (Copy) | D-12, T5 |
| Q3 | As fast as possible, or paced? | Paced to ≈ 10 s, clearly visible | D-4, D-12, T3, T5 |
| Q4 | A sound cue? | One short two-tone at the END only | D-7, T2 |
| Q5 | Latch the alarms of the span on the monitor? | Yes: silent "during fast-forward" entries until the next acknowledge, and in the banner and the log | D-13, T2, T3, T5 |
| Q6 | The Ventilator view: refuse or step with it? | It MUST support the fast-forward | D-10, T4, T5 |
| Q7 | Other spans, a Cancel? | 5 min and 2 min (the CPR pulse-check interval); no Cancel | D-6, T5 |
| Q8 | The QRS beep at ×8? | Muted above ×4 (alarms still sound) | D-14, T2 |
| — | FU-11 B4 (a higher priority ends a silence) and the owner's "pause too" (C/D1) | Stage 10 does not touch the rule: the alarm voice it rebuilds after a span takes silence and pause from the engine's status | D-7 |

**Left for the orchestrator** (nothing in this plan waits on them):
- **Alarm PAUSE vs a higher-priority alarm.** The owner answered "yes, same rule as silence" (rulings, D1). FU-11's
  FIXED text implements B4 for SILENCE only (its Q7 is still open; `l3/alarms/manager.ts` raises nothing during a pause).
  That rule belongs to FU-11 (branch a, `manager.ts`, `alarm-sounder.ts`) or a device follow-up — not Stage 10, which
  neither changes nor undoes it (its rebuilt alarm voice mirrors the engine's `pausedUntil`/`silencedUntil`).
- **The owner's sign-off on the look** (amber panel, banner, seam): screenshots at the gate (G4).

---
## Tasks

Each task: the failing tests first (created verbatim), run red, the implementation as find/replace blocks (cut from the
prototype; each matches exactly once at its place), run green, typecheck, commit and push. Ticks go in this plan's copy
on the branch.

### Task 0: Branch, install, block check

**Files:** the plan file only (`docs/plans/stage-10-time-control.md`, committed on the branch so its ticks are tracked).

- [x] **Step 1 — FU-11 is on main.** From `projects/patient-monitor-engine/repo`: `git fetch -q origin`, then for each
  FU-11 branch `for b in a b c d; do git merge-base --is-ancestor origin/fu-11-$b origin/main && echo "fu-11-$b merged" || echo "fu-11-$b NOT merged"; done`
  (a branch deleted after its merge: `gh pr list --state merged --head fu-11-$b` lists its merged PR), and
  `git ls-tree origin/main docs/plans/fu-11-hardening.md` lists the plan. If any branch is not merged: STOP and report.
- [x] **Step 2 — worktree and install** (still from `repo`):

```bash
git worktree add -b stage-10-time-control ../scratch/wt-stage-10 origin/main
cd ../scratch/wt-stage-10   # every later command runs from here
npx -y pnpm@9.15.9 install --frozen-lockfile
cp ../../repo/docs/plans/stage-10-time-control.md docs/plans/
```

- [x] **Step 3 — block check on this main.**

Run: `python3 ../plans-backup/stage-10-plan-tools/check.py docs/plans/stage-10-time-control.md . ../plans-backup/stage-10-plan-tools/chain.txt --base-dir .`
Expected: `114 blocks + 10 creates, 37 files: 0 problems` (on the prototype base). A problem line names
the block; apply the find/replace discipline in Global Constraints and list it in the gate note.

- [x] **Step 4 — commit the plan and push.**

```bash
git add docs/plans/stage-10-time-control.md
git commit -m "docs(plans): Stage 10 time control (×8, 5-minute fast-forward)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin stage-10-time-control
```

### Task 1: ×8 — one constant, every site reads it

**Files:** Modify `packages/engine-core/src/clock/clock.ts`, `packages/engine-core/src/engine.ts` (comment),
`packages/controller/src/session/host-session.ts`, `packages/controller/src/session/viewer-sync.ts`,
`packages/renderer/src/mount.ts`, `apps/demo/src/app/sessionbar.ts`, `docs/DESIGN-BRIEF.md`; tests: modify
`packages/engine-core/test/clock/clock.test.ts`, `packages/engine-core/test/engine/engine-commands.test.ts`,
`apps/demo/e2e/stage4b-device.e2e.ts` (comment); create `packages/controller/test/session/s10-speed.test.ts`.

**Interfaces:** Produces: `MAX_TIME_SCALE = 8` (engine-core, already exported with `MIN_TIME_SCALE`); the host refuses
outside it with `scale must be 0.25–8`; `SPEEDS: readonly string[]` exported from `apps/demo/src/app/sessionbar.ts`.
Consumes FU-11 F3 (the session bar's host-speed draw).

- [x] **Step 1 — the failing tests.**

In `apps/demo/e2e/stage4b-device.e2e.ts`, find:

```ts
  await page.evaluate(() => (window as unknown as { __pme4b: { pm: { setTimeScale(k: number): void } } }).__pme4b.pm.setTimeScale(4)); // max 4× (brief §3.3)
```

Replace with:

```ts
  await page.evaluate(() => (window as unknown as { __pme4b: { pm: { setTimeScale(k: number): void } } }).__pme4b.pm.setTimeScale(4)); // ×4 (the clock accepts 0.25–8 since Stage 10)
```

Create `packages/controller/test/session/s10-speed.test.ts`:

```ts
// Stage 10 Task 1 (the owner's ×8 request, 22 Oct demonstration): the host accepts the engine clock's range, 0.25–8, and
// a second-screen viewer follows a ×8 host at ×8 (it was clamped to ×4 and fell behind by 4 s of sim every wall second).
import { describe, expect, it } from 'vitest';
import { MAX_TIME_SCALE } from '@pme/engine-core';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { waitFor } from '../helpers.ts';

const flushIo = () => new Promise((r) => setTimeout(r, 0));

async function rig() {
  const clock = { wall: 1_000_000 };
  const wallNow = () => clock.wall;
  const host = manualHost();
  const hub = createInProcessHub();
  const hs = new HostSession({ session: 'SPD234', target: host, wallNow, stateIntervalMs: 0 });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: 'SPD234', transport: hub.connect(), wallNow });
  await waitFor(() => ctl.hostOnline);
  const v = manualViewer();
  const sync = new ViewerSync({ session: 'SPD234', transport: hub.connect(), target: v, engineVersion: host.engine.version, wallNow });
  const run = async (seconds: number) => {
    for (let i = 0; i < seconds * 50; i++) {
      clock.wall += 20;
      host.advance(20);
      if (i % 10 === 0) hs.emitState();
      await flushIo();
      sync.follow();
      v.advance(20);
    }
  };
  return { host, ctl, v, sync, run, close: () => (hs.close(), ctl.close(), sync.close()) };
}

describe('Stage 10: ×8', () => {
  it('the host accepts ×8 and refuses more, naming the range', async () => {
    const r = await rig();
    expect(MAX_TIME_SCALE).toBe(8);
    expect((await r.ctl.send({ type: 'time', action: 'scale', value: 8 })).accepted).toBe(true);
    expect(r.host.scale).toBe(8);
    const no = await r.ctl.send({ type: 'time', action: 'scale', value: 8.5 });
    expect(no.accepted).toBe(false);
    expect(no.reason).toBe('scale must be 0.25–8');
    expect(r.host.scale).toBe(8);
    r.close();
  });

  it('a viewer follows a ×8 host at ×8, a fixed delay behind', async () => {
    const r = await rig();
    await waitFor(() => r.sync.status === 'synced');
    await r.ctl.send({ type: 'time', action: 'scale', value: 8 });
    await r.run(4);
    expect(r.v.rate).toBeGreaterThan(7.2);
    expect(r.v.rate).toBeLessThanOrEqual(8);
    expect(r.sync.resyncs).toBe(0);
    expect(r.host.engine.now().simT - r.v.renderT()).toBeLessThan(1); // 32 s of sim in 4 s; the viewer kept up
    r.close();
  });
});
```

In `packages/engine-core/test/clock/clock.test.ts`, find:

```ts
import { Clock, MAX_FRAME_MS, TICK_MS } from '../../src/clock/clock.ts';
```

Replace with:

```ts
import { Clock, MAX_FRAME_MS, MAX_TIME_SCALE, TICK_MS } from '../../src/clock/clock.ts';
```

In `packages/engine-core/test/clock/clock.test.ts`, find:

```ts
    const scales = [0.25, 0.5, 1, 2, 4];
```

Replace with:

```ts
    const scales = [0.25, 0.5, 1, 2, 4, 8];
```

In `packages/engine-core/test/clock/clock.test.ts`, find:

```ts
    for (const scale of [0.25, 1, 4]) {
```

Replace with:

```ts
    for (const scale of [0.25, 1, 4, 8]) {
```

In `packages/engine-core/test/clock/clock.test.ts`, find:

```ts
  it('rejects timeScale outside 0.25–4', () => {
```

Replace with:

```ts
  it('rejects timeScale outside 0.25–8 (Stage 10: ×8 is the fastest speed)', () => {
```

In `packages/engine-core/test/clock/clock.test.ts`, find:

```ts
      clock.timeScale = 5;
    }).toThrow(RangeError);
    clock.timeScale = 4;
    expect(clock.timeScale).toBe(4);
```

Replace with:

```ts
      clock.timeScale = 8.5;
    }).toThrow(RangeError);
    clock.timeScale = 8;
    expect(clock.timeScale).toBe(8);
    expect(MAX_TIME_SCALE).toBe(8);
```

In `packages/engine-core/test/engine/engine-commands.test.ts`, find:

```ts
    expect(() => e.setTimeScale(8)).toThrow(RangeError);
```

Replace with:

```ts
    expect(() => e.setTimeScale(9)).toThrow(RangeError); // Stage 10: the clock accepts 0.25–8
```

- [x] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/clock test/engine/engine-commands.test.ts`
Expected: 3 failed in `clock.test.ts` (`RangeError: timeScale must be in [0.25, 4], got 8`); `engine-commands` passes
(9 was refused before and after).

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/s10-speed.test.ts`
Expected: 2 failed — `expected 4 to be 8` (the host refused ×8) and `expected 0.997… to be greater than 7.2` (the
viewer stayed at ×1 while the host refused).

- [x] **Step 3 — implement.**

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
import { button, clock, h, infoDialog, PIN_SVG, seg, setText, throttle, toast, WAVE_SVG } from './ui.ts';

```

Replace with:

```ts
import { button, clock, h, infoDialog, PIN_SVG, seg, setText, throttle, toast, WAVE_SVG } from './ui.ts';

/** The speeds the bar offers (Stage 10: ×8 added for the 22 Oct demonstration; the host accepts 0.25–8). */
export const SPEEDS: readonly string[] = ['1', '2', '4', '8'];

```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
  const speed = seg<string>('Simulation speed', [['1', '×1'], ['2', '×2'], ['4', '×4']], '1', (v) => void link.send({ type: 'time', action: 'scale', value: Number(v) }).then((r) => r.accepted && toast(`Speed ×${v}`)));
  speed.classList.add('compact'); // ×4 is the host's limit (the 6a host refuses a scale above 4: 'scale must be 0.25–4')
```

Replace with:

```ts
  const speed = seg<string>('Simulation speed', SPEEDS.map((k) => [k, `×${k}`] as [string, string]), '1', (v) => void link.send({ type: 'time', action: 'scale', value: Number(v) }).then((r) => r.accepted && toast(`Speed ×${v}`)));
  speed.classList.add('compact'); // Stage 10: ×8 is the host's limit (the engine clock's MAX_TIME_SCALE; it refuses more: 'scale must be 0.25–8')
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
    if (speed.value !== k && ['1', '2', '4'].includes(k)) speed.set(k);
```

Replace with:

```ts
    if (speed.value !== k && SPEEDS.includes(k)) speed.set(k);
```

In `docs/DESIGN-BRIEF.md`, find:

```md
  - `timeScale` ranges 0.25–4. Pause and single-step are also supported.
```

Replace with:

```md
  - `timeScale` ranges 0.25–8 (Stage 10 raised the limit from 4 to 8: the owner's ×8 for the 22 Oct 2026 demonstration). Pause and single-step are also supported.
```

In `docs/DESIGN-BRIEF.md`, find:

```md
  setTimeScale(k: number): void;         // 0.25–4
```

Replace with:

```md
  setTimeScale(k: number): void;         // 0.25–8 (Stage 10)
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
import type { Command, DispatchResult, EngineEvent, PatientSnapshot, SimSeconds, StateVar, Tick } from '@pme/engine-core';
```

Replace with:

```ts
import { MAX_TIME_SCALE, MIN_TIME_SCALE, type Command, type DispatchResult, type EngineEvent, type PatientSnapshot, type SimSeconds, type StateVar, type Tick } from '@pme/engine-core';
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  /** Remote equivalents of the lifecycle calls (brief §7.2 `time`): pause, resume, scale (0.25–4). */
```

Replace with:

```ts
  /** Remote equivalents of the lifecycle calls (brief §7.2 `time`): pause, resume, scale (0.25–8, the engine clock's range). */
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    if (cmd.action === 'scale' && !(typeof cmd.value === 'number' && cmd.value >= 0.25 && cmd.value <= 4)) {
      return { result: { accepted: false, tick, reason: 'scale must be 0.25–4' }, applied: cmd };
```

Replace with:

```ts
    if (cmd.action === 'scale' && !(typeof cmd.value === 'number' && cmd.value >= MIN_TIME_SCALE && cmd.value <= MAX_TIME_SCALE)) {
      return { result: { accepted: false, tick, reason: `scale must be ${MIN_TIME_SCALE}–${MAX_TIME_SCALE}` }, applied: cmd }; // Stage 10: the clock's own range (×8)
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
import type { Command, DispatchResult, EngineEvent, PatientSnapshot, SimSeconds } from '@pme/engine-core';
```

Replace with:

```ts
import { MAX_TIME_SCALE, MIN_TIME_SCALE, type Command, type DispatchResult, type EngineEvent, type PatientSnapshot, type SimSeconds } from '@pme/engine-core';
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
    t.setRate(Math.min(4, Math.max(0.25, this.hostRate * (1 + Math.max(-0.1, Math.min(0.1, 0.5 * err))))));
```

Replace with:

```ts
    t.setRate(Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, this.hostRate * (1 + Math.max(-0.1, Math.min(0.1, 0.5 * err)))))); // Stage 10: ×8
```

In `packages/engine-core/src/clock/clock.ts`, find:

```ts
// The 250 ms clamp is [ENG]. timeScale is limited to 0.25–4 (brief §3.3).
```

Replace with:

```ts
// The 250 ms clamp is [ENG]. timeScale is limited to 0.25–8 (brief §3.3 said 0.25–4; Stage 10 adds ×8, the owner's
// request for the 22 Oct demonstration: at ×8 a 60 fps frame runs 6.7 ticks).
```

In `packages/engine-core/src/clock/clock.ts`, find:

```ts
export const MAX_TIME_SCALE = 4;
```

Replace with:

```ts
export const MAX_TIME_SCALE = 8;
```

In `packages/engine-core/src/engine.ts`, find:

```ts
    this.clock.timeScale = k; // throws RangeError outside 0.25–4
```

Replace with:

```ts
    this.clock.timeScale = k; // throws RangeError outside 0.25–8 (MIN_TIME_SCALE–MAX_TIME_SCALE)
```

In `packages/renderer/src/mount.ts`, find:

```ts
import { EventLog, TrendStore, type Capture12, type Command, type DispatchResult, type EngineEvent, type EngineOptions, type LeadId, type Measured, type PatientSnapshot } from '@pme/engine-core';
```

Replace with:

```ts
import { EventLog, MAX_TIME_SCALE, MIN_TIME_SCALE, TrendStore, type Capture12, type Command, type DispatchResult, type EngineEvent, type EngineOptions, type LeadId, type Measured, type PatientSnapshot } from '@pme/engine-core';
```

In `packages/renderer/src/mount.ts`, find:

```ts
          setRate: (k) => void (core.clock.timeScale = Math.min(4, Math.max(0.25, k))),
```

Replace with:

```ts
          setRate: (k) => void (core.clock.timeScale = Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, k))), // Stage 10: ×8
```

- [x] **Step 4 — run them green, and the neighbours.**

Run the two commands of Step 2 again — Expected: all passed. Then
`CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session` (all passed),
`CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run` (all passed) and `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [x] **Step 5 — commit and push.**

```bash
git add packages/engine-core/src/clock/clock.ts packages/engine-core/src/engine.ts \
  packages/controller/src/session/host-session.ts packages/controller/src/session/viewer-sync.ts \
  packages/renderer/src/mount.ts apps/demo/src/app/sessionbar.ts docs/DESIGN-BRIEF.md \
  packages/engine-core/test/clock/clock.test.ts packages/engine-core/test/engine/engine-commands.test.ts \
  apps/demo/e2e/stage4b-device.e2e.ts packages/controller/test/session/s10-speed.test.ts
git commit -m "feat(engine,controller,demo): ×8 — the clock's MAX_TIME_SCALE is 8 and every speed site reads it (Stage 10 T1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 2: The monitor — a fast-forward step without drawing, sound muted, a seam, a cue, latched alarms; no beat tone above ×4

**Files:** Modify `packages/renderer/src/monitor-core.ts`, `packages/renderer/src/overlays.ts`,
`packages/renderer/src/protocol.ts`, `packages/renderer/src/engine.worker.ts`, `packages/renderer/src/worker-host.ts`,
`packages/renderer/src/mount.ts`; create `packages/renderer/test/s10-fast-forward.test.ts`.

**Interfaces:** Produces: `MonitorCore.advance(ticks: number, last: boolean): { tick: number; simT: number }` (0 ticks
allowed: it holds the clock and reports the tick); `ToWorker { type: 'advance'; reqId; ticks; last }` / `FromWorker {
type: 'advanced'; reqId; tick; simT }`; `Host.advance(ticks, last)`; `MonitorHandle.advance(ticks, last): Promise<{ tick;
simT }>` (sound muted from the first step to the `last`, then the alarm voice rebuilt and the two-tone cue; resolves
after the step's events were delivered to `on` listeners); `MonitorHandle.latchAlarms(alarms: readonly AlarmEntry[])`;
`OverlayMark.kind` `'seam'`, `Overlays.add` public, `simClock(t)` (mm:ss) in `overlays.ts`; `BEAT_TONE_MAX_SCALE = 4`,
`beatToneAt(kind, timeScale)` in `mount.ts`. Consumes FU-11 C1 (`request`/`settle`), H4 (`makeSounder`, the Sound
toggle's master gain), FU-5's latched presentation (`alarm-view.ts`, unchanged).

- [x] **Step 1 — the failing tests.**

Create `packages/renderer/test/s10-fast-forward.test.ts`:

```ts
// Stage 10 Task 2 (the owner's fast-forward, 22 Oct demonstration): MonitorCore runs a fast-forward in steps without
// drawing, posts every step's events, holds its clock between steps, and gives the clock back as it found it; after it a
// seam marks the jump on every lane (owner's decision 1); above ×4 the beat tones are off (owner's decision 4).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { MonitorCore } from '../src/monitor-core.ts';
import { BEAT_TONE_MAX_SCALE, beatToneAt } from '../src/mount.ts';
import type { ClockAnchor } from '../src/protocol.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const make = (posts: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [], ctx = new FakeCtx()) =>
  new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH: 300, dpr: 1 }, { engine: { seed: 1, truthHz: 1, patient: { sensors: { spo2: 'on' } } }, waves: ['pleth'] }, (anchor, events) => posts.push({ anchor, events }));
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
const frames = (c: MonitorCore, fromMs: number, toMs: number) => {
  for (let ms = fromMs; ms <= toMs; ms += 1000 / 60) c.frame(1_000_000 + ms);
};

describe('Stage 10: MonitorCore.advance (fast-forward steps)', () => {
  it('runs exactly the asked ticks, posts their events, and draws nothing while the fast-forward holds the clock', () => {
    const posts: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [];
    const c = make(posts);
    frames(c, 0, 1000);
    const t0 = c.engine.now().tick;
    const drawn = lanes(c).map((l) => l.lastDrawnIndex);
    posts.length = 0;
    expect(c.advance(250, false)).toEqual({ tick: t0 + 250, simT: (t0 + 250) * 0.02 });
    expect(posts).toHaveLength(1);
    expect(posts[0]!.events.some((e) => e.type === 'measurement')).toBe(true); // 5 s of the engine's events
    frames(c, 1000, 3000); // 2 s of frames during the fast-forward: no tick, no drawing
    expect(c.engine.now().tick).toBe(t0 + 250);
    expect(lanes(c).map((l) => l.lastDrawnIndex)).toEqual(drawn);
    c.advance(250, true);
    expect(c.engine.now().tick).toBe(t0 + 500);
    frames(c, 3000, 3100); // the first frames after it: the clock runs from the new time, the lanes backfill there
    expect(c.engine.now().tick - (t0 + 500)).toBeLessThan(10); // not the 2 s of wall time the fast-forward took
    for (const l of lanes(c)) expect(l.lastDrawnIndex).toBeGreaterThan(Math.floor((t0 + 500) * 0.02 * l.cfg.rate) - 1);
  });

  it('a session paused before the fast-forward is still paused after it', () => {
    const c = make();
    frames(c, 0, 500);
    c.clock.pause();
    c.advance(100, false);
    c.advance(100, true);
    const t = c.engine.now().tick;
    frames(c, 500, 1500);
    expect(c.clock.paused).toBe(true);
    expect(c.engine.now().tick).toBe(t);
  });

  it('a hidden-tab catch-up during the fast-forward adds nothing (the span is the span)', () => {
    const c = make();
    frames(c, 0, 500);
    const t0 = c.engine.now().tick;
    c.advance(50, false);
    c.catchUp(1_000_000 + 500 + 5000); // the window was hidden for 5 s meanwhile
    c.catchUp(1_000_000 + 500 + 10_000);
    c.advance(50, true);
    expect(c.engine.now().tick).toBe(t0 + 100);
  });

  it('steps give the same engine as frames (determinism): same tick, same truth', () => {
    const a = make();
    const b = make();
    frames(a, 0, 1000);
    frames(b, 0, 1000);
    const end = a.engine.now().tick + 1500; // 30 s
    for (let k = a.engine.now().tick; k < end; k += 25) a.advance(Math.min(25, end - k), k + 25 >= end);
    b.engine.advanceTo(end * 0.02);
    expect(a.engine.now().tick).toBe(b.engine.now().tick);
    expect(a.engine.snapshot().state).toEqual(b.engine.snapshot().state);
  });

  it('the NIBP cycle runs through the span: the same results at the same times as without a fast-forward', () => {
    const results = (posts: Array<{ events: EngineEvent[] }>) =>
      posts.flatMap((p) => p.events).flatMap((e) => (e.type === 'nibp' && e.result ? [{ t: e.t, ...e.result }] : []));
    const pa: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [];
    const pb: Array<{ anchor: ClockAnchor; events: EngineEvent[] }> = [];
    const a = make(pa);
    const b = make(pb);
    for (const c of [a, b]) c.command({ id: 'nibp', issuedBy: 't', type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 1 } });
    for (let k = 0; k < 15_000; k += 25) a.advance(25, k + 25 >= 15_000); // 300 s fast-forwarded
    b.clock.timeScale = 4;
    frames(b, 0, 300_000 / 4 + 100); // the same 300 s at ×4, drawn
    expect(b.engine.now().tick).toBeGreaterThanOrEqual(15_000);
    const ra = results(pa);
    const rb = results(pb).filter((r) => r.t <= 300);
    expect(ra.length).toBeGreaterThanOrEqual(4); // one a minute
    expect(ra).toEqual(rb);
  });

  it('after the last step a seam marks the jump on every lane, labelled with the new time (mm:ss)', () => {
    const ctx = new FakeCtx();
    const c = make([], ctx);
    frames(c, 0, 1000);
    const end = c.engine.now().tick + 15_000; // 5 min
    for (let k = c.engine.now().tick; k < end; k += 25) c.advance(25, k + 25 >= end);
    const t = c.clock.renderT;
    const label = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    ctx.texts.length = 0;
    frames(c, 1000, 1200);
    expect(label).toMatch(/^05:0\d$/);
    expect(ctx.texts.filter((x) => x === label)).toHaveLength(lanes(c).length); // ECG and pleth lanes alike
  });
});

describe('Stage 10: the beat tone above ×4 (owner: at ×8 it would beep ≈ 10 times a second)', () => {
  it('QRS beep and pulse tone play up to ×4 and are off above it; alarms and device tones always play', () => {
    expect(BEAT_TONE_MAX_SCALE).toBe(4);
    for (const k of [1, 2, 4]) expect(['qrs', 'pulse'].map((kind) => beatToneAt(kind, k))).toEqual([true, true]);
    expect(['qrs', 'pulse'].map((kind) => beatToneAt(kind, 8))).toEqual([false, false]);
    for (const kind of ['alarmBurst', 'charge', 'chargeReady', 'shock', 'nibpDone']) expect(beatToneAt(kind, 8)).toBe(true);
  });
});
```

- [x] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/s10-fast-forward.test.ts`
Expected: 7 failed — `TypeError: c.advance is not a function` (and `a.advance`), and `expected undefined to be 4` (no
`BEAT_TONE_MAX_SCALE`).

- [x] **Step 3 — implement.**

In `packages/renderer/src/engine.worker.ts`, find:

```ts
        }
        return;
      case 'restore':
```

Replace with:

```ts
        }
        return;
      case 'advance': // Stage 10: a fast-forward step; its events were posted before this answer
        if (!core) throw new Error('not initialised');
        scope.postMessage({ type: 'advanced', reqId: m.reqId, ...core.advance(m.ticks, m.last) });
        return;
      case 'restore':
```

In `packages/renderer/src/monitor-core.ts`, find:

```ts
import { drawLeadOffDashes, drawMark, Overlays, shows } from './overlays.ts';
```

Replace with:

```ts
import { drawLeadOffDashes, drawMark, Overlays, shows, simClock } from './overlays.ts';
```

In `packages/renderer/src/monitor-core.ts`, find:

```ts
  private visible = true;
```

Replace with:

```ts
  private visible = true;
  /** Stage 10: a fast-forward is holding the clock — the pause state to return to (null: none running). */
  private ffWasPaused: boolean | null = null;
```

In `packages/renderer/src/monitor-core.ts`, find:

```ts
    if (this.clock.paused || dt === 0) return;
```

Replace with:

```ts
    if (this.clock.paused || dt === 0 || this.ffWasPaused !== null) return;
```

In `packages/renderer/src/monitor-core.ts`, find:

```ts
  /** One animation frame. `epochMs` = performance.timeOrigin + frame timestamp (ms). */
  frame(epochMs: number): void {
```

Replace with:

```ts
  /**
   * Stage 10 (fast-forward): run `ticks` ticks now, without drawing, and post their events. The clock is held from the
   * first step to the `last` one (a frame neither advances nor draws meanwhile); `last` gives it back in the pause state it
   * had before. The lanes restart on the next drawn frame (the jump exceeds a lane) from the engine's buffers.
   */
  advance(ticks: number, last: boolean): { tick: number; simT: number } {
    if (this.ffWasPaused === null) {
      this.ffWasPaused = this.clock.paused;
      this.clock.pause();
    }
    if (this.clock.step(ticks) > 0) this.engine.advanceTo(this.clock.simT);
    this.overlays.due(this.clock.renderT); // marks from the skipped span are not drawn
    if (last) {
      this.overlays.add({ t: this.clock.renderT, kind: 'seam', label: simClock(this.clock.renderT) }); // the jump, on every lane
      if (!this.ffWasPaused) this.clock.resume();
      this.ffWasPaused = null;
      this.lastEpoch = null; // the next frame counts from itself, not from the fast-forward's start
    }
    const epochMs = performance.timeOrigin + performance.now();
    this.post({ simT: this.clock.renderT, epochMs, timeScale: this.clock.timeScale }, this.batch);
    this.batch = [];
    this.lastPost = epochMs;
    return { tick: this.clock.tick, simT: this.clock.simT };
  }

  /** One animation frame. `epochMs` = performance.timeOrigin + frame timestamp (ms). */
  frame(epochMs: number): void {
    if (this.ffWasPaused !== null) return; // Stage 10: a fast-forward runs the clock; nothing is drawn until it ends
```

In `packages/renderer/src/monitor-core.ts`, find:

```ts
        for (const i of this.ecgLaneIndices()) drawMark(this.ctx, this.lanes[i] as SweepLane, m, this.plan, this.pxPerMm);
```

Replace with:

```ts
        for (const i of m.kind === 'seam' ? this.plan.lanes.keys() : this.ecgLaneIndices()) drawMark(this.ctx, this.lanes[i] as SweepLane, m, this.plan, this.pxPerMm);
```

In `packages/renderer/src/mount.ts`, find:

```ts
import { EventLog, MAX_TIME_SCALE, MIN_TIME_SCALE, TrendStore, type Capture12, type Command, type DispatchResult, type EngineEvent, type EngineOptions, type LeadId, type Measured, type PatientSnapshot } from '@pme/engine-core';
```

Replace with:

```ts
import { EventLog, MAX_TIME_SCALE, MIN_TIME_SCALE, TrendStore, type AlarmEntry, type Capture12, type Command, type DispatchResult, type EngineEvent, type EngineOptions, type LeadId, type Measured, type PatientSnapshot } from '@pme/engine-core';
```

In `packages/renderer/src/mount.ts`, find:

```ts
import { formatEtco2, formatRr, formatSpo2, formatTemp } from './numerics-resp.ts'; // Stage 3
```

Replace with:

```ts
import { formatEtco2, formatRr, formatSpo2, formatTemp } from './numerics-resp.ts'; // Stage 3
import { simClock } from './overlays.ts'; // Stage 10
```

In `packages/renderer/src/mount.ts`, find:

```ts
  viewerClock(): Promise<ViewerClock>;
```

Replace with:

```ts
  viewerClock(): Promise<ViewerClock>;
  /**
   * Stage 10 (fast-forward): run `ticks` sim ticks now without drawing them; their events arrive as usual (trends, tiles,
   * alarms, the event log). Sound is off from the first step to the `last`: no tone is scheduled and the alarm voice
   * stops; after the last step the alarms still active sound again. Resolves after the step's events were delivered.
   */
  advance(ticks: number, last: boolean): Promise<{ tick: number; simT: number }>;
  /**
   * Stage 10 (owner's decision 5): show alarms that came and went inside a fast-forward in the alarm area as silent latched
   * entries ("… · during fast-forward mm:ss") until the next acknowledge (Silence or Acknowledge), as a monitor's alarm
   * history keeps them. A later call replaces the list; a rewind drops entries after the restored time.
   */
  latchAlarms(alarms: readonly AlarmEntry[]): void;
```

In `packages/renderer/src/mount.ts`, find:

```ts
const SOUNDER_PUMP_MS = 100; // alarm bursts are enqueued ≥ 1 s ahead, so 100 ms is plenty [ENG]
```

Replace with:

```ts
const SOUNDER_PUMP_MS = 100; // alarm bursts are enqueued ≥ 1 s ahead, so 100 ms is plenty [ENG]
/** Stage 10 (owner's decision 4): above this speed the beat tones (QRS beep, pulse tone) are off — at ×8 a heart rate of
 *  80 beeps 10.7 times a second; alarms and device tones still sound [ENG]. */
export const BEAT_TONE_MAX_SCALE = 4;
/** Stage 10: whether a tone of this kind plays at this speed. */
export const beatToneAt = (kind: string, timeScale: number): boolean => (kind !== 'qrs' && kind !== 'pulse') || timeScale <= BEAT_TONE_MAX_SCALE;
/** Stage 10: the two-tone cue at the end of a fast-forward (none at its start), Hz [ENG]. */
const FF_CUE_HZ = [660, 990] as const;
```

In `packages/renderer/src/mount.ts`, find:

```ts
  let lastStatus: Extract<EngineEvent, { type: 'alarmStatus' }> | null = null;
```

Replace with:

```ts
  let lastStatus: Extract<EngineEvent, { type: 'alarmStatus' }> | null = null;
  let ff = false; // Stage 10: a fast-forward is running — no tone is scheduled, the alarm voice is gone until it ends
  let ffLatched: AlarmEntry[] = []; // Stage 10: alarms of a fast-forward shown latched until the next acknowledge
  const withLatched = (e: EngineEvent): EngineEvent => (e.type === 'alarmStatus' && ffLatched.length ? { ...e, active: [...e.active, ...ffLatched] } : e);
```

In `packages/renderer/src/mount.ts`, find:

```ts
      ui?.onEvent(e);
```

Replace with:

```ts
      ui?.onEvent(withLatched(e)); // Stage 10: the device shows the fast-forward's latched alarms; the sound never hears them
```

In `packages/renderer/src/mount.ts`, find:

```ts
      if (e.type === 'tone' && (e.kind !== 'qrs' || !r || r.audio.beep.enabled)) {
```

Replace with:

```ts
      if (e.type === 'tone' && !ff && beatToneAt(e.kind, a.timeScale) && (e.kind !== 'qrs' || !r || r.audio.beep.enabled)) {
```

In `packages/renderer/src/mount.ts`, find:

```ts
    if (!scheduler || !r) return;
```

Replace with:

```ts
    if (!scheduler || !r || ff) return; // Stage 10: sound enabled during a fast-forward starts at its end
```

In `packages/renderer/src/mount.ts`, find:

```ts
    lastStatus = null;
```

Replace with:

```ts
    lastStatus = null;
    ffLatched = ffLatched.filter((x) => x.since <= t); // Stage 10: a rewind drops the latched alarms of its discarded future
```

In `packages/renderer/src/mount.ts`, find:

```ts
    const c = cmd as { type: string; sensor?: string; state?: string; action?: { device?: string; action?: string; lane?: number; value?: unknown } };
```

Replace with:

```ts
    const c = cmd as { type: string; sensor?: string; state?: string; action?: { device?: string; action?: string; lane?: number; value?: unknown } };
    if (ffLatched.length && c.type === 'device' && c.action?.device === 'alarm' && (c.action.action === 'ack' || c.action.action === 'silence')) {
      ffLatched = []; // Stage 10: the next acknowledge clears the fast-forward's latched alarms
      if (lastStatus) ui?.onEvent(lastStatus);
    }
```

In `packages/renderer/src/mount.ts`, find:

```ts
    capture12: () => hostP.then((h) => h.capture12()),
```

Replace with:

```ts
    capture12: () => hostP.then((h) => h.capture12()),
    advance: (ticks, last) =>
      hostP.then(async (h) => {
        if (!ff) {
          ff = true; // Stage 10: silence now — queued and sounding tones stop, the alarm voice goes (no bursts are pumped)
          sounder?.dispose();
          sounder = null;
          bridge = null;
          scheduler?.clear();
        }
        try {
          return await h.advance(ticks, last);
        } finally {
          if (last) {
            ff = false;
            makeSounder(); // the alarms active NOW sound again (makeSounder replays the last alarm status)
            // the owner's cue: one short two-tone at the END only (the Sound toggle's gain applies)
            if (audio) FF_CUE_HZ.forEach((hz, i) => playBeep((audio as AudioOut).ctx, (audio as AudioOut).master, (audio as AudioOut).ctx.currentTime + 0.05 + 0.18 * i, hz));
          }
        }
      }),
    latchAlarms(alarms) {
      ffLatched = alarms.map(({ numeric: _n, ...x }) => ({ ...x, id: `ff:${x.id}`, text: `${x.text} · during fast-forward ${simClock(x.since)}`, latched: true, acked: false, sounding: false }));
      if (lastStatus) ui?.onEvent(withLatched(lastStatus));
    },
```

In `packages/renderer/src/overlays.ts`, find:

```ts
import type { SweepLane } from './sweep-lane.ts';
```

Replace with:

```ts
import type { SweepLane } from './sweep-lane.ts';

/** Stage 10: a sim time as the app's session clock shows it (mm:ss), for the seam and the latched alarms. */
export const simClock = (t: number): string => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
```

In `packages/renderer/src/overlays.ts`, find:

```ts
  kind: 'pace' | 'sync' | 'shock';
```

Replace with:

```ts
  kind: 'pace' | 'sync' | 'shock' | 'seam'; // Stage 10: 'seam' = where a fast-forward jumped, on every lane
```

In `packages/renderer/src/overlays.ts`, find:

```ts
  private add(m: OverlayMark): void {
```

Replace with:

```ts
  add(m: OverlayMark): void {
```

In `packages/renderer/src/overlays.ts`, find:

```ts
      ctx.stroke();
    }
```

Replace with:

```ts
      ctx.stroke();
    }
  } else if (m.kind === 'seam') {
    // Stage 10: a thin line where the fast-forward jumped, labelled with the new time; the sweep erases it a lap later
    ctx.lineWidth = 1;
    vline(ctx, x, c.y, c.y + c.height);
    ctx.font = `12px ${plan.font}`;
    ctx.textBaseline = 'top';
    ctx.fillText(m.label ?? '', x + 4, c.y + 4);
```

In `packages/renderer/src/protocol.ts`, find:

```ts
  | { type: 'capture12'; reqId: number };
```

Replace with:

```ts
  | { type: 'capture12'; reqId: number }
  // Stage 10: one fast-forward step (MonitorCore.advance)
  | { type: 'advance'; reqId: number; ticks: number; last: boolean };
```

In `packages/renderer/src/protocol.ts`, find:

```ts
  | { type: 'capture12'; reqId: number; capture?: Capture12; error?: string }; // Stage 4b
```

Replace with:

```ts
  | { type: 'capture12'; reqId: number; capture?: Capture12; error?: string } // Stage 4b
  | { type: 'advanced'; reqId: number; tick: number; simT: number }; // Stage 10
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
  capture12(): Promise<Capture12>;
```

Replace with:

```ts
  capture12(): Promise<Capture12>;
  /** Stage 10: one fast-forward step (MonitorCore.advance); resolves after the step's events were delivered. */
  advance(ticks: number, last: boolean): Promise<{ tick: number; simT: number }>;
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
    capture12: () => Promise.resolve().then(() => core.capture12()), // Stage 4b
```

Replace with:

```ts
    capture12: () => Promise.resolve().then(() => core.capture12()), // Stage 4b
    advance: (ticks, last) => Promise.resolve().then(() => core.advance(ticks, last)), // Stage 10
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
      else if (m.type === 'restored') settle(m.reqId, (r) => (m.error === undefined ? r.resolve(undefined as never) : r.reject(new Error(m.error))));
```

Replace with:

```ts
      else if (m.type === 'restored') settle(m.reqId, (r) => (m.error === undefined ? r.resolve(undefined as never) : r.reject(new Error(m.error))));
      else if (m.type === 'advanced') settle(m.reqId, (r) => r.resolve({ tick: m.tick, simT: m.simT } as never)); // Stage 10
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
    capture12: () => request<Capture12>((reqId) => ({ type: 'capture12', reqId })), // Stage 4b
```

Replace with:

```ts
    capture12: () => request<Capture12>((reqId) => ({ type: 'capture12', reqId })), // Stage 4b
    advance: (ticks, last) => request<{ tick: number; simT: number }>((reqId) => ({ type: 'advance', reqId, ticks, last })), // Stage 10
```

- [x] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run` — Expected: all passed (prototype: 31 files, 101
tests). Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [x] **Step 5 — commit and push.**

```bash
git add packages/renderer/src/monitor-core.ts packages/renderer/src/overlays.ts packages/renderer/src/protocol.ts \
  packages/renderer/src/engine.worker.ts packages/renderer/src/worker-host.ts packages/renderer/src/mount.ts \
  packages/renderer/test/s10-fast-forward.test.ts
git commit -m "feat(renderer): a fast-forward step — no drawing, sound muted, a seam and a cue after it, latched alarms; no beat tone above ×4 (Stage 10 T2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 3: The host fast-forwards in lockstep with its scenario, paced; every controller and viewer sees it

**Files:** Modify `packages/controller/src/protocol.ts`, `packages/controller/src/session/host-session.ts`,
`packages/controller/src/scenario/driver.ts`, `packages/controller/src/session/controller-session.ts`,
`packages/controller/src/session/viewer-sync.ts`; create `packages/controller/test/session/s10-fast-forward.test.ts`,
`packages/controller/test/scenario/s10-ff-determinism.test.ts`.

**Interfaces:** Produces: `time jump` handled by the host (value = sim seconds, `FF_MAX_S = 600`);
`HostTarget.fastForwardStep?(ticks: number, last: boolean): { tick; simT } | Promise<{ tick; simT }>` (the host's
first call has `ticks` 0); `HostSessionOptions.fastForwardWallMs?: number`; `HostSession.fastForwarding: boolean`;
`FF_STEP_TICKS = 25`; wire event `{ type: 'fastForward'; t; tick; phase: 'start' | 'end'; fromT; toT; wallMs?;
stopped?; alarms?: FastForwardAlarm[] }`, `FastForwardAlarm = AlarmEntry & { ended }`, `FastForwardDone { fromT; toT;
endT; stopped?; alarms }` and `fastForwardDone(e)` (protocol); `ControllerSession.fastForward: { fromT; toT } | null`,
`ControllerSession.lastFastForward: FastForwardDone | null` (beside F3's `timeScale` / `hostPaused`); the same two
fields on `ViewerSync`, plus `ViewerSync.fastForwardAt` (the host's time during the span). Consumes FU-11 E3
(`newTimeline`, `timeline`), F3, G1 (`mirror`), A3/C2 (the host's receive and apply wrapper).

- [x] **Step 1 — the failing tests.**

Create `packages/controller/test/scenario/s10-ff-determinism.test.ts`:

```ts
// Stage 10 Task 3 (brief: "same seed, same actions → same outcome whether or not fast-forward was used"): the hypovolaemic
// PEA case run twice from one seed — once stepped (0.5 s steps, the scenario polled after each, as the fast-forward does),
// once with a 300 s fast-forward in the middle — with the same instructor actions before and after. The truth values of
// every second, the scenario's path and rolls and the commands the scenario applied are identical.
import { afterEach, describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { FF_STEP_TICKS, HostSession } from '../../src/session/host-session.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { engineOptionsOf } from '../../src/scenario/patient.ts';
import { validateScenario } from '../../src/scenario/validate.ts';
import { BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import type { AppliedResolution, ScenarioEvent, WireEvent } from '../../src/protocol.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'DET234';
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});
const yieldIo = () => new Promise((r) => setTimeout(r, 0));
const STEP = 25; // the host's FF_STEP_TICKS: the reference run steps and polls exactly as the fast-forward does

async function run(withFastForward: boolean) {
  const v = validateScenario(BUILTIN_SCENARIOS['acls-pea-hypovolaemia']);
  if (!v.ok) throw new Error(v.errors.join('; '));
  const doc: ScenarioDoc = v.doc;
  const eo = engineOptionsOf(doc, 7);
  const host = manualHost({ ...eo, truthHz: 1, patient: { ...eo.patient, ...(doc.patient?.sensors ? { sensors: doc.patient.sensors } : {}) } });
  const step = (n: number) => host.engine.advanceTo((host.engine.now().tick + n) * 0.02 + 1e-9);
  let k = 0;
  const target = Object.assign(host, {
    fastForwardStep: async (n: number) => {
      if (++k % 100 === 0) await yieldIo(); // let the test runner breathe once per 50 s of sim
      step(n);
      return host.engine.now();
    },
  });
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
  hs = new HostSession({ session: S, target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const watcher = collect(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close());
  const truth: EngineEvent[] = [];
  host.engine.on((e) => void (e.type === 'truth' && truth.push(e)));
  /** Run to `toS` the way the fast-forward does: a step of FF_STEP_TICKS, a poll, the scenario's commands applied. */
  const stepTo = async (toS: number) => {
    while (host.engine.now().tick < Math.round(toS * 50)) {
      step(Math.min(STEP, Math.round(toS * 50) - host.engine.now().tick));
      driver.poll();
      await yieldIo();
    }
  };
  await waitFor(() => ctl.hostOnline);
  expect((await ctl.send({ type: 'scenario', action: 'load', doc })).accepted).toBe(true);
  await stepTo(20);
  await ctl.send({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 250, overS: 60 } }); // an action before
  if (withFastForward) {
    expect((await ctl.send({ type: 'time', action: 'jump', value: 300 })).accepted).toBe(true);
    await waitFor(() => ctl.lastFastForward !== null, 120_000, 'fast-forward end');
  } else await stepTo(320);
  expect(host.engine.now().tick).toBe(16_000);
  // the actions after it: the case's ROSC rule (500 mL and epinephrine, probability 0.6) rolls the scenario stream
  await ctl.send({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 30 } });
  await ctl.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } });
  await stepTo(350);
  const applied = watcher
    .flatMap((m): WireEvent[] => (m.kind === 'event' ? m.body : []))
    .flatMap((e) => (e.type === 'commandApplied' ? [(e.resolved as AppliedResolution).command] : []))
    .filter((c) => c.issuedBy === 'scenario');
  const decisions = (driver.runner?.log ?? []).filter((e) => e.op === 'enter' || e.op === 'roll');
  return { truth, applied, decisions, history: driver.runner?.history ?? [], state: host.engine.snapshot().state };
}

describe('Stage 10: a fast-forward gives the same patient as running the span', () => {
  it('same seed, same actions: identical truth every second, scenario path, rolls and applied commands', async () => {
    expect(FF_STEP_TICKS).toBe(STEP);
    const a = await run(false);
    const b = await run(true);
    expect(a.truth.length).toBeGreaterThanOrEqual(349);
    expect(a.history.map((h) => h.stateId)).toContain('pea'); // the span holds the case's own transition (afterS 150)
    expect(a.decisions.some((d) => d.op === 'roll')).toBe(true);
    expect(b.truth).toEqual(a.truth);
    expect(b.history).toEqual(a.history);
    expect(b.decisions).toEqual(a.decisions);
    expect(b.applied).toEqual(a.applied);
    expect(b.state).toEqual(a.state);
  }, 300_000);
});
```

Create `packages/controller/test/session/s10-fast-forward.test.ts`:

```ts
// Stage 10 Task 3 (the owner's fast-forward, 22 Oct demonstration): the host runs `time jump` in steps outside its
// command chain, refuses controllers' commands meanwhile, and every controller and viewer sees it start and end.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { FF_MAX_S, HostSession, type HostSessionOptions } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import type { WireEvent } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'FFW234';
const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});

/** A host whose monitor fast-forwards one step per macrotask (as a worker answers), and a controller. `during(k)` runs
 *  before the k-th step (k = 0: the empty step that reads the monitor's tick). */
async function rig(o: Partial<HostSessionOptions> = {}, ff = true, during: (k: number, host: ReturnType<typeof manualHost>) => void = () => {}) {
  const host = manualHost({ seed: 7, truthHz: 1 });
  const steps: Array<{ n: number; last: boolean }> = [];
  const target = ff
    ? Object.assign(host, {
        fastForwardStep: async (n: number, last: boolean) => {
          await new Promise((r) => setTimeout(r, 0));
          during(steps.length, host);
          steps.push({ n, last });
          host.engine.advanceTo((host.engine.now().tick + n) * 0.02 + 1e-9);
          return host.engine.now();
        },
      })
    : host;
  const hub = createInProcessHub();
  const hs = new HostSession({ session: S, target, stateIntervalMs: 0, ...o });
  hs.addTransport(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => hs.close());
  await waitFor(() => ctl.hostOnline);
  return { host, hs, hub, ctl, steps };
}

describe('Stage 10: fast-forward on the host', () => {
  it('runs exactly the asked span in steps; the last step releases the clock; controllers see start and end', async () => {
    const r = await rig();
    r.host.engine.advanceTo(10);
    const seen: WireEvent[] = [];
    const watcher = collect(r.hub.connect());
    const ack = await r.ctl.send({ type: 'time', action: 'jump', value: 300 });
    expect(ack.accepted).toBe(true);
    expect(r.hs.fastForwarding).toBe(true);
    await waitFor(() => r.ctl.fastForward !== null, 2000, 'start seen');
    expect(r.ctl.fastForward).toEqual({ fromT: 10, toT: 310 });
    await waitFor(() => r.ctl.lastFastForward !== null, 60_000, 'end seen');
    expect(r.host.engine.now().tick).toBe(15_500);
    expect(r.steps.reduce((a, s) => a + s.n, 0)).toBe(15_000);
    expect(r.steps[0]).toEqual({ n: 0, last: false }); // the empty first step: the span starts at the monitor's own tick
    expect(r.steps.filter((s) => s.last)).toHaveLength(1);
    expect(r.steps.at(-1)!.last).toBe(true);
    expect(r.ctl.fastForward).toBeNull();
    expect(r.ctl.lastFastForward).toEqual({ fromT: 10, toT: 310, endT: 310, alarms: [] });
    for (const m of watcher) if (m.kind === 'event') seen.push(...m.body);
    const ff = seen.filter((e) => e.type === 'fastForward');
    expect(ff.map((e) => (e as { phase: string }).phase)).toEqual(['start', 'end']);
    // the span's events reached the peers in order: measurements every second of it
    const ts = seen.filter((e) => e.type === 'measurement').map((e) => (e as { t: number }).t).filter((t) => t > 10 && t <= 310);
    expect(ts.length).toBeGreaterThan(290);
    expect(ts.every((t, i) => i === 0 || t >= (ts[i - 1] as number))).toBe(true);
  }, 240_000); // ≈ 15 s alone; the full suite on a loaded machine took 69 s

  it("refuses a controller's commands while it runs (with the reason) and takes them again after", async () => {
    const r = await rig();
    await r.ctl.send({ type: 'time', action: 'jump', value: 60 });
    const during = await r.ctl.send({ type: 'setTarget', variable: 'hr', value: 120 });
    expect(during.accepted).toBe(false);
    expect(during.reason).toMatch(/fast-forwarding/);
    expect((await r.ctl.send({ type: 'time', action: 'scale', value: 8 })).accepted).toBe(false);
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    expect((await r.ctl.send({ type: 'setTarget', variable: 'hr', value: 120 })).accepted).toBe(true);
  }, 180_000);

  it('refuses what it cannot run: no fast-forward monitor, a bad span, a second one', async () => {
    const plain = await rig({}, false);
    expect((await plain.ctl.send({ type: 'time', action: 'jump', value: 300 })).reason).toBe('this monitor cannot fast-forward');
    expect((await plain.ctl.send({ type: 'time', action: 'step', value: 1 })).reason).toBe('time step is not supported');
    const r = await rig();
    for (const v of [0, -5, FF_MAX_S + 1, Number.NaN]) expect((await r.ctl.send({ type: 'time', action: 'jump', value: v })).reason).toBe('fast-forward must be 0–600 s');
    expect((await r.ctl.send({ type: 'time', action: 'jump' })).accepted).toBe(false);
    // a second jump from a second controller while the first runs
    const ctl2 = new ControllerSession({ session: S, transport: r.hub.connect(), issuedBy: 'remote' });
    cleanup.push(() => ctl2.close());
    await waitFor(() => ctl2.hostOnline);
    await r.ctl.send({ type: 'time', action: 'jump', value: 30 });
    expect((await ctl2.send({ type: 'time', action: 'jump', value: 30 })).accepted).toBe(false);
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
  }, 180_000);

  it('a controller that joins during the fast-forward sees it running (the sticky jump)', async () => {
    const r = await rig();
    r.host.engine.advanceTo(4);
    await r.ctl.send({ type: 'time', action: 'jump', value: 120 });
    const late = new ControllerSession({ session: S, transport: r.hub.connect(), issuedBy: 'remote' });
    cleanup.push(() => late.close());
    await waitFor(() => late.hostOnline);
    expect(late.fastForward).toEqual({ fromT: 4, toT: 124 });
    await waitFor(() => late.lastFastForward !== null, 30_000);
    expect(late.fastForward).toBeNull();
  }, 180_000);

  it('a new timeline (patient restart) stops the fast-forward and says why', async () => {
    const r = await rig();
    await r.ctl.send({ type: 'time', action: 'jump', value: 300 });
    await waitFor(() => r.steps.length > 3);
    r.hs.newTimeline();
    await waitFor(() => r.ctl.lastFastForward !== null, 10_000);
    expect(r.ctl.lastFastForward?.stopped).toBe('a new patient or scenario started');
    expect(r.hs.fastForwarding).toBe(false);
    expect(r.host.engine.now().tick).toBeLessThan(15_000);
  }, 120_000);

  it('a viewer waits through the fast-forward and starts again from the host at its end', async () => {
    const clock = { wall: 1_000_000 };
    const r = await rig({ wallNow: () => clock.wall });
    const v = manualViewer({ seed: 7, truthHz: 1 });
    const sync = new ViewerSync({ session: S, transport: r.hub.connect(), target: v, engineVersion: r.host.engine.version, wallNow: () => clock.wall });
    cleanup.push(() => sync.close());
    await waitFor(() => sync.status === 'synced');
    await r.ctl.send({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => r.steps.length > 6);
    sync.follow();
    expect(v.paused).toBe(true);
    expect(sync.fastForwardAt).toBeGreaterThan(1); // the host's time during it (the second screen's panel clock)
    expect(sync.fastForward).toEqual({ fromT: 0, toT: 60 }); // the second screen's marker reads it
    const before = sync.resyncs;
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    await waitFor(() => sync.status === 'synced' && sync.resyncs === before + 1, 5000);
    expect(v.engine.now().tick).toBe(r.host.engine.now().tick); // the snapshot at the end of the span
    expect(sync.fastForward).toBeNull();
    expect(sync.lastFastForward).toEqual({ fromT: 0, toT: 60, endT: 60, alarms: [] });
  }, 180_000);

  it('is paced to the wall time it is given (owner: ≈ 10 s, so the room sees it); the start event carries the pace', async () => {
    const r = await rig({ fastForwardWallMs: 1500 });
    const w0 = performance.now();
    await r.ctl.send({ type: 'time', action: 'jump', value: 120 }); // the owner's 2-minute span (the CPR pulse-check interval)
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    const wall = performance.now() - w0;
    expect(wall).toBeGreaterThanOrEqual(1400);
    expect(wall).toBeLessThan(4000);
    expect(r.host.engine.now().tick).toBe(6000);
  }, 180_000);

  it('the end lists every alarm raised during it once, with when, and whether it came and went (latched on the monitor)', async () => {
    const lim = (param: string, v: { low?: number; high?: number }) => ({ id: `lim-${param}-${Math.random()}`, issuedBy: 'test', type: 'device', action: { device: 'alarm', action: 'setLimit', param, ...v } }) as never;
    const r = await rig({}, true, (k, host) => {
      if (k === 10) host.engine.dispatch(lim('HR', { high: 70 })); // HR HIGH (HR 75) raised at ≈ 10 s …
      if (k === 60) host.engine.dispatch(lim('HR', { high: 150 })); // … and gone at ≈ 30 s
      if (k === 80) host.engine.dispatch(lim('HR', { low: 120 })); // EXTREME BRADY from ≈ 40 s to the end
    });
    await r.ctl.send({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => r.ctl.lastFastForward !== null, 30_000);
    const al = r.ctl.lastFastForward?.alarms ?? [];
    expect(al.map((a) => [a.text, a.ended])).toEqual([
      [expect.stringMatching(/HR/), true],
      [expect.stringMatching(/BRADY/), false],
    ]);
    expect(al[0]!.since).toBeGreaterThan(5);
    expect(al[0]!.since).toBeLessThan(30);
    expect(al[1]!.since).toBeGreaterThan(39);
  }, 180_000);
});
```

- [x] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/s10-fast-forward.test.ts test/scenario/s10-ff-determinism.test.ts`
Expected: 9 failed — the jump is refused (`expected false to be true`; `expected 'time jump arrives in Stage 6b' to be
'this monitor cannot fast-forward'`), no `fastForward` state (`expected undefined to deeply equal { fromT: 4, toT: 124
}`), no pace (`expected 0.18… to be greater than or equal to 1400`), no alarm list (`expected [] to deeply equal [ [
StringMatching /HR/, true ], …(1) ]`), waits time out; the determinism test `expected undefined to be 25` (no
`FF_STEP_TICKS`).

- [x] **Step 3 — implement.**

In `packages/controller/src/protocol.ts`, find:

```ts
import type {
```

Replace with:

```ts
import type {
  AlarmEntry,
```

In `packages/controller/src/protocol.ts`, find:

```ts
        doc?: unknown;
      }
```

Replace with:

```ts
        doc?: unknown;
      }
    // Stage 10: `jump` = fast-forward `value` sim seconds (> 0, ≤ 600) as fast as the host's monitor runs; `step` is refused
```

In `packages/controller/src/protocol.ts`, find:

```ts
  | { type: 'timeline'; t: SimSeconds; tick: Tick; cause?: TimelineCause };
```

Replace with:

```ts
  | { type: 'timeline'; t: SimSeconds; tick: Tick; cause?: TimelineCause }
  /**
   * Stage 10: the host's fast-forward from `fromT` to `toT` began (`wallMs`: the wall time it is paced to), or ended at `t`
   * (`stopped`: why it ended early; `alarms`: every alarm raised during it, once, `ended` = no longer active at its end).
   */
  | { type: 'fastForward'; t: SimSeconds; tick: Tick; phase: 'start' | 'end'; fromT: SimSeconds; toT: SimSeconds; wallMs?: number; stopped?: string; alarms?: FastForwardAlarm[] };

/** Stage 10: an alarm raised during a fast-forward (it did not sound); `ended`: it came and went inside the span. */
export type FastForwardAlarm = AlarmEntry & { ended: boolean };
/** Stage 10: a fast-forward that ended, as a controller or a viewer keeps it (the banner and the monitor read it). */
export interface FastForwardDone {
  fromT: SimSeconds;
  toT: SimSeconds;
  endT: SimSeconds;
  stopped?: string;
  alarms: FastForwardAlarm[];
}
/** Stage 10: the `fastForward` end event as a FastForwardDone. */
export const fastForwardDone = (e: { t: SimSeconds; fromT: SimSeconds; toT: SimSeconds; stopped?: string; alarms?: FastForwardAlarm[] }): FastForwardDone => ({
  fromT: e.fromT, toT: e.toT, endT: e.t, ...(e.stopped ? { stopped: e.stopped } : {}), alarms: e.alarms ?? [],
});
```

In `packages/controller/src/scenario/driver.ts`, find:

```ts
      time: (a, v) => inner.time(a, v),
```

Replace with:

```ts
      time: (a, v) => inner.time(a, v),
      // Stage 10: the runner keeps running through a fast-forward — it is polled after every step, at the step's sim time
      ...(inner.fastForwardStep
        ? {
            fastForwardStep: async (n: number, last: boolean) => {
              const r = await (inner.fastForwardStep as NonNullable<HostTarget['fastForwardStep']>)(n, last);
              if (n > 0) this.poll(); // an empty step (the host reading the monitor's tick) runs no time
              return r;
            },
          }
        : {}),
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
  newPeerId,
```

Replace with:

```ts
  newPeerId,
  fastForwardDone,
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
  type CommandInput,
```

Replace with:

```ts
  type CommandInput,
  type FastForwardDone,
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
  hostPaused = false;
```

Replace with:

```ts
  hostPaused = false;
  /** Stage 10: the host's fast-forward while it runs (null otherwise), and the last one that ended. */
  fastForward: { fromT: SimSeconds; toT: SimSeconds } | null = null;
  lastFastForward: FastForwardDone | null = null;
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
      if (e.cause !== 'restore') this.scenario.reset();
```

Replace with:

```ts
      if (e.cause !== 'restore') this.scenario.reset();
      this.fastForward = null; // Stage 10: a fast-forward ends with its timeline
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
    else if (e.type === 'commandApplied') {
```

Replace with:

```ts
    else if (e.type === 'fastForward') {
      // Stage 10: every controller sees the host's fast-forward, like its speed and pause
      if (e.phase === 'start') this.fastForward = { fromT: e.fromT, toT: e.toT };
      else {
        this.fastForward = null;
        this.lastFastForward = fastForwardDone(e);
      }
      this.addLog('marker', e.phase === 'start' ? `fast-forward ${Math.round(e.toT - e.fromT)} s` : `fast-forward ended${e.stopped ? `: ${e.stopped}` : ''}`);
    } else if (e.type === 'commandApplied') {
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
      if (c?.type === 'time' && (c.action === 'pause' || c.action === 'resume')) this.hostPaused = c.action === 'pause';
```

Replace with:

```ts
      if (c?.type === 'time' && (c.action === 'pause' || c.action === 'resume')) this.hostPaused = c.action === 'pause';
      // Stage 10: a late joiner learns a running fast-forward from the sticky jump (its atTick = where it began)
      if (c?.type === 'time' && c.action === 'jump' && res?.replay && typeof c.value === 'number') this.fastForward = { fromT: (c.atTick ?? e.tick) * 0.02, toT: (c.atTick ?? e.tick) * 0.02 + c.value };
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  type ControlFlag,
```

Replace with:

```ts
  type ControlFlag,
  type FastForwardAlarm,
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  time(action: 'pause' | 'resume' | 'scale', value?: number): void;
```

Replace with:

```ts
  time(action: 'pause' | 'resume' | 'scale', value?: number): void;
  /**
   * Stage 10 (fast-forward): run `ticks` sim ticks now without drawing; resolve once their events reached the `on`
   * listeners. The monitor holds its clock from the first step to the `last`. Absent: this monitor cannot fast-forward.
   */
  fastForwardStep?(ticks: number, last: boolean): { tick: Tick; simT: SimSeconds } | Promise<{ tick: Tick; simT: SimSeconds }>;
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  onCommand?: (info: { commandId: string; from: string; receivedAt: number; tick: Tick; accepted: boolean }) => void;
```

Replace with:

```ts
  onCommand?: (info: { commandId: string; from: string; receivedAt: number; tick: Tick; accepted: boolean }) => void;
  /**
   * Stage 10 (owner's decision 1): the wall time a whole fast-forward takes at least, ms — paced so the room sees the clock
   * run (the app: FF_WALL_MS, ≈ 10 s). 0 (default): as fast as the monitor runs.
   */
  fastForwardWallMs?: number;
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
const VIEWER_TTL_MS = 600_000;
```

Replace with:

```ts
const VIEWER_TTL_MS = 600_000;
/**
 * Stage 10: a fast-forward runs in steps of this many ticks (0.5 s of sim); the host's scenario is polled after each and
 * its commands land before the next — finer than the app's own 100 ms wall poll at ×8 (0.8 s of sim) [ENG].
 */
export const FF_STEP_TICKS = 25;
/** Stage 10: the longest fast-forward the host accepts, s (the owner asked for 5 min) [ENG]. */
export const FF_MAX_S = 600;
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  private viewerSeenAt = -Infinity; // FU-11 (K2): wall ms of the last viewer hello
```

Replace with:

```ts
  private viewerSeenAt = -Infinity; // FU-11 (K2): wall ms of the last viewer hello
  private ff: { fromTick: Tick; toTick: Tick; alarms: FastForwardAlarm[] } | null = null; // Stage 10: the fast-forward running
  private activeAlarms = new Set<string>(); // Stage 10: the alarm ids of the last alarmStatus (what is NEW during a span)
  private timelines = 0; // Stage 10: newTimeline() count — a fast-forward stops when its timeline ends
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
      if (e.type === ('state' as EngineEvent['type'])) this.engineState = true; // the engine emits its own (E1)
```

Replace with:

```ts
      if (e.type === ('state' as EngineEvent['type'])) this.engineState = true; // the engine emits its own (E1)
      if (e.type === 'alarmStatus') {
        // Stage 10: an alarm raised during a fast-forward did not sound — the end event lists it (banner, log, monitor)
        if (this.ff) for (const a of e.active) if (!this.activeAlarms.has(a.id) && !this.ff.alarms.some((x) => x.id === a.id)) this.ff.alarms.push({ ...a, ended: false });
        this.activeAlarms = new Set(e.active.map((a) => a.id));
      }
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    return [...this.marks.keys()];
  }

  /**
```

Replace with:

```ts
    return [...this.marks.keys()];
  }

  /** Stage 10: a fast-forward is running (controllers' commands are refused until it ends). */
  get fastForwarding(): boolean {
    return this.ff !== null;
  }

  /**
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
   * up to 200 commands a second at ×4) — sent as a `mirror` commandApplied so a second-screen viewer applies it at the
```

Replace with:

```ts
   * up to 400 commands a second at ×8) — sent as a `mirror` commandApplied so a second-screen viewer applies it at the
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    if (!result.accepted || this.now() - this.viewerSeenAt > VIEWER_TTL_MS) return;
```

Replace with:

```ts
    if (!result.accepted || this.ff || this.now() - this.viewerSeenAt > VIEWER_TTL_MS) return; // Stage 10: a viewer waits out a fast-forward
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  newTimeline(cause: TimelineCause = 'restart'): void {
```

Replace with:

```ts
  newTimeline(cause: TimelineCause = 'restart'): void {
    this.timelines++; // Stage 10: a fast-forward on the old timeline stops
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    }
    const { result, applied } = await this.apply(cmd);
```

Replace with:

```ts
    }
    // Stage 10: while the host fast-forwards, a controller's command waits for nothing — it is refused with the reason
    const { result, applied } = this.ff ? { result: { accepted: false, tick: this.o.target.now().tick, reason: 'the simulation is fast-forwarding; try again when it ends' }, applied: cmd } : await this.apply(cmd);
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    if (cmd.action === 'step' || cmd.action === 'jump') return { result: { accepted: false, tick, reason: `time ${cmd.action} arrives in Stage 6b` }, applied: cmd };
```

Replace with:

```ts
    if (cmd.action === 'step') return { result: { accepted: false, tick, reason: 'time step is not supported' }, applied: cmd };
    if (cmd.action === 'jump') return this.fastForward(cmd); // Stage 10
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  }

  private async scenario(cmd: ScenarioCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
```

Replace with:

```ts
  }

  /**
   * Stage 10: fast-forward `value` sim seconds, paced to `fastForwardWallMs` of wall time (the owner: ≈ 10 s, so the room
   * sees the clock run). Accepted at once; the run goes on outside the command chain in steps of FF_STEP_TICKS. A first
   * empty step reads the monitor's own tick, so the span is exact. After each step the host's scenario has polled
   * (ScenarioDriver wraps `fastForwardStep`) and what it submitted is applied before the next step, so the span keeps the
   * engine's event order and gives the patient a run polled every 0.5 s would. Every peer sees a `fastForward` start and
   * end (the end lists the alarms raised during it); a late joiner gets the jump as a sticky replay.
   */
  private fastForward(cmd: TimeCommand): { result: DispatchResult; applied: WireCommand } {
    const { tick } = this.o.target.now();
    const no = (reason: string) => ({ result: { accepted: false, tick, reason }, applied: cmd });
    const target = this.o.target;
    if (!target.fastForwardStep) return no('this monitor cannot fast-forward');
    if (!(typeof cmd.value === 'number' && cmd.value > 0 && cmd.value <= FF_MAX_S)) return no(`fast-forward must be 0–${FF_MAX_S} s`);
    if (this.ff) return no('a fast-forward is already running');
    const ff = { fromTick: tick, toTick: tick + Math.round(cmd.value / TICK_S), alarms: [] };
    this.ff = ff;
    const applied: TimeCommand = { ...cmd, atTick: tick };
    void this.runFastForward(ff, applied, (n, last) => (target.fastForwardStep as NonNullable<HostTarget['fastForwardStep']>)(n, last));
    return { result: { accepted: true, tick }, applied };
  }

  private async runFastForward(ff: { fromTick: Tick; toTick: Tick; alarms: FastForwardAlarm[] }, cmd: TimeCommand, advance: NonNullable<HostTarget['fastForwardStep']>): Promise<void> {
    const timeline = this.timelines;
    const span = ff.toTick - ff.fromTick;
    const wallMs = this.o.fastForwardWallMs ?? 0;
    let tick = ff.fromTick;
    let stopped: string | undefined;
    try {
      tick = (await advance(0, false)).tick; // the monitor's own tick (the host's is an estimate between its events)
      Object.assign(ff, { fromTick: tick, toTick: tick + span });
      this.sticky.set('time.jump', { ...cmd, atTick: tick });
      this.queue({ type: 'fastForward', t: tick * TICK_S, tick, phase: 'start', fromT: tick * TICK_S, toT: ff.toTick * TICK_S, wallMs });
      const w0 = this.now();
      while (tick < ff.toTick) {
        if (this.timelines !== timeline) {
          stopped = 'a new patient or scenario started';
          break;
        }
        const n = Math.min(FF_STEP_TICKS, ff.toTick - tick);
        tick = (await advance(n, tick + n >= ff.toTick)).tick;
        await this.chain; // the scenario's commands of this step are applied before the next step
        const wait = w0 + (wallMs * (tick - ff.fromTick)) / span - this.now(); // the pace: ahead of it, wait
        if (wait > 0 && tick < ff.toTick) await new Promise((r) => setTimeout(r, wait));
      }
    } catch (err) {
      if (this.timelines !== timeline) stopped = 'a new patient or scenario started'; // its monitor was replaced
      else {
        stopped = `the monitor stopped: ${err instanceof Error ? err.message : String(err)}`;
        try {
          await advance(0, true); // give the monitor its clock back
        } catch {
          // a dead monitor has no clock to give back
        }
      }
    }
    if (this.ff === ff) this.ff = null;
    this.sticky.delete('time.jump');
    const end = this.timelines === timeline ? { t: tick * TICK_S, tick } : this.o.target.now(); // a new timeline's clock
    const alarms = ff.alarms.map((a) => ({ ...a, ended: !this.activeAlarms.has(a.id) }));
    this.queue({ type: 'fastForward', t: 't' in end ? end.t : end.simT, tick: end.tick, phase: 'end', fromT: ff.fromTick * TICK_S, toT: ff.toTick * TICK_S, ...(stopped ? { stopped } : {}), alarms });
  }

  private async scenario(cmd: ScenarioCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
  SeqFilter,
  type AppliedResolution,
```

Replace with:

```ts
  fastForwardDone,
  SeqFilter,
  type AppliedResolution,
  type FastForwardDone,
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
  lagS = 0;
```

Replace with:

```ts
  lagS = 0;
  /** Stage 10: the host's fast-forward while it runs, and the last one that ended (a second screen's marker reads them). */
  fastForward: { fromT: SimSeconds; toT: SimSeconds } | null = null;
  lastFastForward: FastForwardDone | null = null;
  /** Stage 10: the host's sim time during its fast-forward (from its events; the second screen's panel runs its clock). */
  fastForwardAt: SimSeconds | null = null;
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
  private hostPaused = false;
```

Replace with:

```ts
  private hostPaused = false;
  private hostFastForward = false; // Stage 10: the host is fast-forwarding — wait, then take a fresh snapshot
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
    if (this.hostPaused) return t.setPaused(true);
```

Replace with:

```ts
    if (this.hostPaused || this.hostFastForward) return t.setPaused(true);
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
    if (e.type === 'timeline') return this.requestSync(true);
```

Replace with:

```ts
    if (e.type === 'timeline') {
      this.hostFastForward = false; // Stage 10: a fast-forward ends with its timeline
      this.fastForward = null;
      return this.requestSync(true);
    }
    if (e.type === 'fastForward') {
      // Stage 10: the host runs minutes in seconds — this viewer waits (paused) and then starts again from the host's
      // snapshot at the end, rather than running every skipped tick itself on the same machine
      this.hostFastForward = e.phase === 'start';
      this.fastForward = e.phase === 'start' ? { fromT: e.fromT, toT: e.toT } : null;
      if (e.phase === 'end') {
        this.lastFastForward = fastForwardDone(e);
        this.requestSync(true);
      }
      return;
    }
    if (this.hostFastForward) {
      if ('t' in e && typeof e.t === 'number') this.fastForwardAt = e.t;
      return; // the snapshot at the end holds what happens meanwhile
    }
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
      if (c.action === 'scale' && typeof c.value === 'number') this.hostRate = c.value;
```

Replace with:

```ts
      if (c.action === 'scale' && typeof c.value === 'number') this.hostRate = c.value;
      if (c.action === 'jump' && res?.replay && typeof c.value === 'number') {
        this.hostFastForward = true; // Stage 10: joined during a fast-forward (atTick = where it began)
        this.fastForward = { fromT: (c.atTick ?? e.tick) * TICK_S, toT: (c.atTick ?? e.tick) * TICK_S + c.value };
      }
```

- [x] **Step 4 — run them green, and the neighbours.**

Run the Step 2 command again — Expected: 9 passed (alone: the determinism test ≈ 10 s, the 300 s span test ≈ 15 s; on a
loaded machine the 300 s test took 69 s, hence its 240 s timeout). Then `CI=1 npx -y pnpm@9.15.9 --filter
@pme/controller exec vitest run test/session test/scenario` (all passed: the 6a `host-session` test still sees `time
jump` refused — its manual host has no `fastForwardStep`) and `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [x] **Step 5 — commit and push.**

```bash
git add packages/controller/src/protocol.ts packages/controller/src/session/host-session.ts \
  packages/controller/src/scenario/driver.ts packages/controller/src/session/controller-session.ts \
  packages/controller/src/session/viewer-sync.ts packages/controller/test/session/s10-fast-forward.test.ts \
  packages/controller/test/scenario/s10-ff-determinism.test.ts
git commit -m "feat(controller): the host fast-forwards in lockstep with its scenario, paced, from the monitor's own tick; controllers and viewers see it and its alarms (Stage 10 T3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 4: The Ventilator view's cockpit steps through a fast-forward with the engine

**Files:** Modify `packages/ventilator/src/link/port.ts`, `packages/ventilator/src/link/vent-driver.ts`; create
`packages/ventilator/test/s10-run.test.ts`, `apps/demo/src/app/s10-ff-cockpit.test.ts` (in the app because only the
app depends on both the controller and the ventilator; no `package.json` change).

**Interfaces:** Produces: `LinkMsg` `{ v: 1; kind: 'run'; ventTick }` (monitor → ventilator: run up to this tick now);
`LinkDetach = (() => void) & { runTo(engTick: number): Promise<void> }`, returned by `attachMonitorToLink` (callers that
use it as a plain detach function are unchanged); `RUN_TIMEOUT_MS = 2000`. Consumes FU-11 E3b/I4 (the link's
generation and probe), Task 3's host (the cockpit determinism test).

- [x] **Step 1 — the failing tests.**

Create `apps/demo/src/app/s10-ff-cockpit.test.ts`:

```ts
// Stage 10 Task 5 (owner's decision 6: the Ventilator view supports the fast-forward): the bronchospasm showcase case on
// the cockpit, run twice from one seed — once stepped (0.5 s steps, the cockpit's frames produced before each step, the
// scenario polled after it), once with a 300 s fast-forward in the middle. The truth of every second, the scenario's
// path, the commands it applied, the final state and the cockpit's frames (one on every tick of the span) are identical.
import { ControllerSession, createInProcessHub, HostSession, type AppliedResolution, type HostTarget, type ScenarioEvent, type WireEvent } from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, validateScenario } from '@pme/controller/scenario';
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { attachMonitorToLink, createLocalPortPair, createVentDriver } from '@pme/ventilator';
import { afterEach, describe, expect, it } from 'vitest';
import bronchospasm from './showcase/showcase-bronchospasm.json';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});
const yieldIo = () => new Promise((r) => setTimeout(r, 0));

async function run(withFastForward: boolean) {
  const v = validateScenario(bronchospasm);
  if (!v.ok) throw new Error(v.errors.join('; '));
  const eo = engineOptionsOf(v.doc, 7);
  const e = createEngine({ ...eo, truthHz: 1, patient: { ...eo.patient, ...(v.doc.patient?.sensors ? { sensors: v.doc.patient.sensors } : {}) } });
  const step = (n: number) => e.advanceTo((e.now().tick + n) * 0.02 + 1e-9);
  // the cockpit, linked to the engine as the app's Ventilator view is (frames stamped with their engine tick)
  const [ventPort, monPort] = createLocalPortPair();
  const framed = new Set<number>();
  const mon = {
    dispatch: (c: Command): DispatchResult => {
      const r = e.dispatch(c);
      if (c.type === 'externalDrive' && r.accepted) framed.add(r.tick);
      return r;
    },
    on: (fn: (x: EngineEvent) => void) => e.on(fn),
  };
  const link = attachMonitorToLink(mon, monPort);
  const cockpit = createVentDriver(ventPort, 'normal');
  let k = 0;
  const target: HostTarget = {
    dispatch: (c) => e.dispatch(c),
    snapshot: () => e.snapshot(),
    restore: (s) => e.restore(s),
    on: (fn) => e.on(fn),
    now: () => e.now(),
    time: () => {},
    // the app's step (session.ts): the cockpit's frames of the step first, then the monitor runs it
    fastForwardStep: async (n) => {
      if (++k % 100 === 0) await yieldIo();
      if (n > 0) await link.runTo(e.now().tick + n);
      step(n);
      return e.now();
    },
  };
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (x: ScenarioEvent) => hs?.publish(x) });
  hs = new HostSession({ session: 'CKP234', target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const seen: WireEvent[] = [];
  hub.connect().onMessage((m) => void (m.kind === 'event' && seen.push(...m.body)));
  const ctl = new ControllerSession({ session: 'CKP234', transport: hub.connect(), issuedBy: 'panel' });
  cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close(), () => link());
  const truth: EngineEvent[] = [];
  e.on((x) => void (x.type === 'truth' && truth.push(x)));
  while (!ctl.hostOnline) await yieldIo();
  expect((await ctl.send({ type: 'scenario', action: 'load', doc: v.doc })).accepted).toBe(true);
  // 10 s with the cockpit on its (fake) wall clock: it links (learns its offset) and ventilates
  cockpit.frame(0);
  for (let i = 1; i <= 500; i++) {
    cockpit.frame(i * 20);
    step(1);
    if (i % 25 === 0) driver.poll();
    await Promise.resolve();
  }
  const stepTo = async (toS: number) => {
    while (e.now().tick < Math.round(toS * 50)) {
      const n = Math.min(25, Math.round(toS * 50) - e.now().tick);
      await link.runTo(e.now().tick + n);
      step(n);
      driver.poll();
      await yieldIo();
    }
  };
  await ctl.send({ type: 'applyEvent', event: { kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' } }); // the treatment, before the span
  const from = e.now().tick;
  if (withFastForward) {
    expect((await ctl.send({ type: 'time', action: 'jump', value: 300 })).accepted).toBe(true);
    while (ctl.lastFastForward === null) await yieldIo();
  } else await stepTo(from * 0.02 + 300);
  expect(e.now().tick).toBe(from + 15_000);
  let gaps = 0;
  for (let t = from + 1; t <= from + 15_000; t++) if (!framed.has(t)) gaps++;
  await stepTo(e.now().simT + 20);
  const applied = seen.flatMap((x) => (x.type === 'commandApplied' ? [(x.resolved as AppliedResolution).command] : [])).filter((c) => c.issuedBy === 'scenario');
  return { truth, gaps, applied, history: driver.runner?.history ?? [], state: e.snapshot().state };
}

describe('Stage 10: a fast-forward with the Ventilator view ventilating gives the same patient as running the span', () => {
  it('same seed, same actions: identical truth every second, scenario path, applied commands, state; a frame on every tick', async () => {
    const a = await run(false);
    const b = await run(true);
    expect(a.gaps).toBe(0);
    expect(b.gaps).toBe(0); // the cockpit ventilated the patient through every tick of the span
    expect(a.truth.length).toBeGreaterThanOrEqual(325);
    expect(a.history.map((h) => h.stateId)).toEqual(['spasm', 'treated']);
    expect(b.truth).toEqual(a.truth);
    expect(b.history).toEqual(a.history);
    expect(b.applied).toEqual(a.applied);
    expect(b.state).toEqual(a.state);
  }, 300_000);
});
```

Create `packages/ventilator/test/s10-run.test.ts`:

```ts
// Stage 10 (owner's decision 6: the Ventilator view must support the fast-forward): the cockpit steps through a span with
// the engine — before each fast-forward step the link has it produce the frames of every engine tick the step will run
// (`runTo`), so the patient stays on the cockpit; without it the engine runs ahead with no frame and drops the drive.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, PROFILES } from '../src/index.ts';

/** A cockpit linked to an engine for 5 s on the (fake) wall clock; `framed` = the engine ticks a frame was stamped for. */
async function linked() {
  const [ventPort, monPort] = createLocalPortPair();
  const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
  const framed = new Set<number>();
  const mon = {
    dispatch: (c: Command): DispatchResult => {
      const r = e.dispatch(c);
      if (c.type === 'externalDrive' && r.accepted) framed.add(r.tick);
      return r;
    },
    on: (fn: (x: EngineEvent) => void) => e.on(fn),
  };
  const link = attachMonitorToLink(mon, monPort);
  const d = createVentDriver(ventPort, 'normal');
  let ms = 0;
  d.frame(0);
  for (let i = 0; i < 250; i++) {
    ms += 20;
    d.frame(ms);
    e.advanceTo(e.now().simT + 0.02);
    await Promise.resolve();
  }
  return { e, link, framed };
}

/** Fast-forward `s` seconds in 25-tick steps (the host's FF_STEP_TICKS), the cockpit's wall clock standing still. */
async function fastForward(r: Awaited<ReturnType<typeof linked>>, s: number, lockstep: boolean) {
  const from = r.e.now().tick;
  for (let t = from; t < from + s * 50; t += 25) {
    if (lockstep) await r.link.runTo(t + 25);
    r.e.advanceTo((t + 25) * 0.02 + 1e-9);
    await Promise.resolve();
  }
  return from;
}

const gaps = (framed: Set<number>, from: number, to: number) => {
  let n = 0;
  for (let t = from + 1; t <= to; t++) if (!framed.has(t)) n++;
  return n;
};

describe('Stage 10: the cockpit steps through a fast-forward', () => {
  it('runTo: every engine tick of a 60 s span gets its frame, on time', { timeout: 60_000 }, async () => {
    const r = await linked();
    const from = await fastForward(r, 60, true);
    expect(gaps(r.framed, from, r.e.now().tick)).toBe(0);
    expect(r.e.now().tick - from).toBe(3000);
  });

  it('without it the engine runs past the cockpit (the reason): most of the span has no frame', { timeout: 60_000 }, async () => {
    const r = await linked();
    const from = await fastForward(r, 60, false);
    expect(gaps(r.framed, from, r.e.now().tick)).toBeGreaterThan(2900);
  });

  it('runTo resolves at once while the link has not learnt its clock (no cockpit ventilates yet)', async () => {
    const [, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7 });
    const link = attachMonitorToLink({ dispatch: (c: Command) => e.dispatch(c), on: (fn: (x: EngineEvent) => void) => e.on(fn) }, monPort);
    await expect(link.runTo(1000)).resolves.toBeUndefined();
  });
});
```

- [x] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/s10-run.test.ts`
Expected: 2 failed — `TypeError: r.link.runTo is not a function` and `link.runTo is not a function`; the third test
("without it the engine runs past the cockpit") passes before and after: it documents why the lockstep is needed.

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/s10-ff-cockpit.test.ts`
Expected: 1 failed — `TypeError: link.runTo is not a function`.

- [x] **Step 3 — implement.**

In `packages/ventilator/src/link/port.ts`, find:

```ts
//                                         event (a slow worker, a busy tab or an unheld time scale slow both alike)
```

Replace with:

```ts
//                                         event (a slow worker, a busy tab or an unheld time scale slow both alike)
//                   { kind: 'run' }       Stage 10 (fast-forward): run up to this ventilator tick NOW, not on the wall
//                                         clock — the cockpit steps through the span with the engine
```

In `packages/ventilator/src/link/port.ts`, find:

```ts
  | { v: 1; kind: 'clock'; ventTick: number }
```

Replace with:

```ts
  | { v: 1; kind: 'clock'; ventTick: number }
  | { v: 1; kind: 'run'; ventTick: number } // Stage 10
```

In `packages/ventilator/src/link/port.ts`, find:

```ts
export const MAX_AHEAD_TICKS = 75;
```

Replace with:

```ts
export const MAX_AHEAD_TICKS = 75;
/** Stage 10: a cockpit that has not answered a `run` in this long is given up on (the engine's own drive timeout then
 *  takes over, as when the cockpit is closed), wall ms [ENG]. */
export const RUN_TIMEOUT_MS = 2000;

/** The link's detach function; Stage 10: also `runTo`, the fast-forward's lockstep with the cockpit. */
export type LinkDetach = (() => void) & {
  /**
   * Have the ventilator's frames for every engine tick up to `engTick` dispatched (with their `atTick`) before the
   * engine runs there. Resolves at once when the link has not learnt its offset yet (no cockpit ventilates).
   */
  runTo(engTick: number): Promise<void>;
};
```

In `packages/ventilator/src/link/port.ts`, find:

```ts
export function attachMonitorToLink(mon: MonitorLike, port: LinkPort, onRejected: (c: Command, reason?: string) => void = () => {}): () => void {
```

Replace with:

```ts
export function attachMonitorToLink(mon: MonitorLike, port: LinkPort, onRejected: (c: Command, reason?: string) => void = () => {}): LinkDetach {
```

In `packages/ventilator/src/link/port.ts`, find:

```ts
  let engTick = 0;
```

Replace with:

```ts
  let engTick = 0;
  let waiter: { ventTick: number; done: () => void } | null = null; // Stage 10: a fast-forward step waits for frames
```

In `packages/ventilator/src/link/port.ts`, find:

```ts
      lastTick = m.tick;
```

Replace with:

```ts
      lastTick = m.tick;
      const w = waiter !== null && m.tick >= waiter.ventTick ? waiter : null; // Stage 10: released after these dispatches
```

In `packages/ventilator/src/link/port.ts`, find:

```ts
        }, (err: unknown) => failed(err instanceof Error ? err.message : String(err)));
      }
```

Replace with:

```ts
        }, (err: unknown) => failed(err instanceof Error ? err.message : String(err)));
      }
      w?.done();
```

In `packages/ventilator/src/link/port.ts`, find:

```ts
  return () => {
    offPort();
    offEng();
  };
```

Replace with:

```ts
  const detach = () => {
    offPort();
    offEng();
    waiter?.done();
  };
  return Object.assign(detach, {
    runTo(eng: number): Promise<void> {
      if (offset === null) return Promise.resolve();
      const ventTick = eng - offset;
      if (lastTick >= ventTick) return Promise.resolve();
      return new Promise<void>((res) => {
        const timer = setTimeout(() => w.done(), RUN_TIMEOUT_MS);
        const w = {
          ventTick,
          done: () => {
            clearTimeout(timer);
            if (waiter === w) waiter = null;
            res();
          },
        };
        waiter?.done();
        waiter = w;
        port.post({ v: 1, kind: 'run', ventTick });
      });
    },
  });
```

In `packages/ventilator/src/link/vent-driver.ts`, find:

```ts
  let allowed = port ? k + 2 * LEAD_TICKS : Infinity;
```

Replace with:

```ts
  let allowed = port ? k + 2 * LEAD_TICKS : Infinity;
  /** Run the ventilator tick by tick up to sim time `to`, posting each tick's commands. */
  const runTo = (to: number) => {
    while ((k + 1) * LINK_TICK_S <= to + 1e-9) {
      k++;
      advanceVent(vs, k * LINK_TICK_S, d.onStep);
      const cmds = linkTick(core, LINK_TICK_S);
      port?.post({ v: 1, kind: 'cmds', tick: k, cmds });
    }
  };
```

In `packages/ventilator/src/link/vent-driver.ts`, find:

```ts
      while ((k + 1) * LINK_TICK_S <= sim + 1e-9) {
        k++;
        advanceVent(vs, k * LINK_TICK_S, d.onStep);
        const cmds = linkTick(core, LINK_TICK_S);
        port?.post({ v: 1, kind: 'cmds', tick: k, cmds });
      }
```

Replace with:

```ts
      runTo(sim);
```

In `packages/ventilator/src/link/vent-driver.ts`, find:

```ts
    else if (m.kind === 'clock') allowed = Math.max(allowed, m.ventTick);
```

Replace with:

```ts
    else if (m.kind === 'clock') allowed = Math.max(allowed, m.ventTick);
    else if (m.kind === 'run') {
      // Stage 10 (fast-forward): the engine is about to run past these ticks — produce their frames now, not on the wall clock
      allowed = Math.max(allowed, m.ventTick);
      runTo(m.ventTick * LINK_TICK_S);
      sim = Math.max(sim, k * LINK_TICK_S);
    }
```

- [x] **Step 4 — run them green, and the neighbours.**

Run the two Step 2 commands again — Expected: 3 passed, 1 passed (the cockpit determinism test ≈ 30 s). Then
`CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run` (all passed; prototype: 21 files, 106 tests) and
`npx -y pnpm@9.15.9 -r typecheck` (clean). A mutation check done in the prototype: without `runTo` in the cockpit test's
step, `expected 14995 to be +0` (unframed ticks).

- [x] **Step 5 — commit and push.**

```bash
git add packages/ventilator/src/link/port.ts packages/ventilator/src/link/vent-driver.ts \
  packages/ventilator/test/s10-run.test.ts apps/demo/src/app/s10-ff-cockpit.test.ts
git commit -m "feat(ventilator): the cockpit steps through a fast-forward with the engine — a run message, runTo on the link (Stage 10 T4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 5: The app — ×8, "Fast-forward 2 min / 5 min", the paced panel and the banner on every window, latched alarms, the log, the cockpit

**Files:** Modify `apps/demo/src/app/session.ts`, `apps/demo/src/app/sessionbar.ts`, `apps/demo/src/app/link.ts`,
`apps/demo/src/app/describe.ts`, `apps/demo/src/app/main.ts`, `apps/demo/src/app/views/remote.ts`,
`apps/demo/src/app/views/vent.ts`, `apps/demo/src/app/app.css`; create `apps/demo/src/app/fast-forward.ts`,
`apps/demo/src/app/s10-fast-forward.test.ts`, `apps/demo/src/app/s10-fast-forward.dom.test.ts`,
`apps/demo/e2e/s10-time-control.e2e.ts`.

**Interfaces:** Produces: `AppSession.fastForwarding: boolean`, `AppSession.ventLink` (set by the Ventilator view) and its
target's `fastForwardStep` (the cockpit's `runTo` before each step when it was ventilating at the start); the host's
`fastForwardWallMs: FF_WALL_MS`; `loadScenario` refused during a span; `spanText(s)`, `timeText(t)` in `describe.ts`;
`mountFastForward(parent, src, o?)` (`o.simT`, `o.font`, `o.latch`), `FF_SPANS = [120, 300]`, `FF_WALL_MS = 10_000`,
`FF_DONE_SHOW_MS = 8000` in `fast-forward.ts`. Consumes T2's `MonitorHandle.advance` / `latchAlarms`, T3's host and
controller fields, T4's `runTo`, FU-11 F3 (session bar), G2 (the follower), H1/H6 (the Ventilator view).

- [x] **Step 1 — the failing tests.**

Create `apps/demo/e2e/s10-time-control.e2e.ts`:

```ts
// Stage 10 (the owner's request for the 22 Oct demonstration and his decisions of 7 Oct): ×8 with the beat tone off,
// and a fast-forward of 5 or 2 min from the instructor view, on both engines. The span is paced to ≈ 10 s behind one
// panel (dimmed, blurred page; the clock running; "sound muted") on every window (instructor, monitor, Explore,
// Ventilator, a second screen); no tone inside it, one two-tone cue at its end; the banner, the clinical log and the
// trends hold the span; a latched fast-forward alarm clears on the next acknowledge; the Ventilator view's cockpit
// ventilates the patient through a span.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Win = {
  __pmeApp: {
    session: { code: string; monitor: { audioLog: Array<{ simT: number; kind: string }>; trends: { series(id: string, from: number, to: number): Float32Array }; latchAlarms(a: unknown[]): void } };
    link: { simT: number; log: Array<{ simT: number | null; text: string }>; send(c: unknown): Promise<{ accepted: boolean; reason?: string }>; ctl: { lastFastForward: { fromT: number; endT: number; alarms: Array<{ text: string }> } | null } };
  };
  __pmeFollower: { sync: { status: string; lastFastForward: unknown } | null; monitor: unknown };
  __osc: Array<{ hz: number; at: number }>;
};

test('×8 and a 5-minute fast-forward from the instructor view: paced panel everywhere, sound muted, cue, banner, log, trends', async ({ page, context, browserName }) => {
  test.setTimeout(300_000);
  // every oscillator the page starts (the end cue is 660 + 990 Hz)
  await page.addInitScript(() => {
    (window as unknown as Win).__osc = [];
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...a: [number?]) {
      (window as unknown as Win).__osc.push({ hz: this.frequency.value, at: performance.now() });
      return start.apply(this, a);
    };
  });
  await openApp(page, base, '?scenario=showcase-anaphylaxis', { warmMs: 1500 });
  await expect(page).toHaveURL(/#\/teach$/);
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect(page.getByRole('button', { name: 'Sound on' })).toBeVisible();
  const bar = page.locator('.sessionbar');
  const simT = () => page.evaluate(() => (window as unknown as Win).__pmeApp.link.simT);
  const tones = (from: number, to: number, kinds?: string[]) => page.evaluate((r) => (window as unknown as Win).__pmeApp.session.monitor.audioLog.filter((e) => e.simT > r.from && e.simT < r.to && (!r.kinds || r.kinds.includes(e.kind))).length, { from, to, kinds });
  await expect.poll(() => tones(0, 1e9, ['qrs', 'pulse']), { timeout: 10_000 }).toBeGreaterThan(0); // ×1: the beat tone sounds
  await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×8' }).click();
  const a = await simT();
  await page.waitForTimeout(4000);
  const b = await simT();
  expect(b - a).toBeGreaterThan(24); // ×8 = 32 s of sim in 4 s (≥ ×6 allowed on a loaded machine)
  expect(await tones(a + 2, 1e9, ['qrs', 'pulse'])).toBe(0); // owner's decision 4: no beat tone above ×4

  // a second screen that follows the session
  const code = await page.evaluate(() => (window as unknown as Win).__pmeApp.session.code);
  const second = await context.newPage();
  await second.goto(`${base}/?follow=${code}#/monitor`);
  await second.waitForFunction(() => (window as unknown as Win).__pmeFollower?.sync?.status === 'synced', undefined, { timeout: 20_000 });

  const w0 = Date.now();
  const p0 = await page.evaluate(() => performance.now());
  await bar.getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: 'Fast-forward 5 min' }).click();
  const veil = page.locator('.ff-veil.on');
  await expect(veil).toBeVisible({ timeout: 5000 });
  await expect(veil.locator('.ff-title')).toHaveText('FAST FORWARD · 5 MIN');
  await expect(veil.locator('.ff-mute')).toHaveText('sound muted');
  await expect(second.locator('.ff-veil.on .ff-title')).toHaveText('FAST FORWARD · 5 MIN');
  // the clock runs visibly
  const c0 = await veil.locator('.ff-now').textContent();
  await page.waitForTimeout(1500);
  expect(await veil.locator('.ff-now').textContent()).not.toBe(c0);
  // the panel is above every view: instructor, monitor, Explore, Ventilator (opened here for the first time)
  for (const r of ['monitor', 'explore', 'vent', 'teach']) {
    await page.evaluate((h) => (location.hash = h), `#/${r}`);
    await expect(veil, `panel on #/${r}`).toBeVisible();
  }
  await expect(page.locator('.ff-veil.on')).toHaveCount(0, { timeout: 60_000 });
  const wallS = (Date.now() - w0) / 1000;
  console.log(`[${browserName}] 5 min of sim fast-forwarded in ${wallS.toFixed(1)} s (click to panel gone)`);
  expect(wallS).toBeGreaterThan(9.5); // owner's decision 1: paced to ≈ 10 s
  expect(wallS).toBeLessThan(20);
  const ff = await page.evaluate(() => (window as unknown as Win).__pmeApp.link.ctl.lastFastForward);
  expect(ff).not.toBeNull();
  const { fromT, endT } = ff as { fromT: number; endT: number };
  expect(endT - fromT).toBeCloseTo(300, 6);
  await expect(page.locator('.ff-banner')).toContainText(/^Fast-forwarded 5 min, \d\d:\d\d → \d\d:\d\d\. During it: .+\.$/);
  await expect(second.locator('.ff-banner')).toContainText('Fast-forwarded 5 min');

  // the trends hold the span: HR in at least 290 of its 300 seconds
  const held = await page.evaluate((r) => Array.from((window as unknown as Win).__pmeApp.session.monitor.trends.series('hr', r.from, r.to)).filter((v) => Number.isFinite(v)).length, { from: Math.ceil(fromT), to: Math.floor(endT) });
  expect(held).toBeGreaterThanOrEqual(290);
  // sound muted during it: no tone scheduled for a time inside the span; one two-tone cue at the end, none at the start
  expect(await tones(fromT + 0.5, endT - 0.5)).toBe(0);
  const cue = await page.evaluate((t) => (window as unknown as Win).__osc.filter((o) => o.at >= t && (o.hz === 660 || o.hz === 990)), p0);
  expect(cue.map((o) => o.hz)).toEqual([660, 990]);
  expect((cue[0] as { at: number }).at - p0).toBeGreaterThan(9000); // at the end, not the start
  // the clinical log
  const log = await page.evaluate(() => (window as unknown as Win).__pmeApp.link.log.map((e) => e.text));
  expect(log).toContain('Fast-forward 5 min started (sound muted until it ends)');
  expect(log.some((t) => /^Fast-forward ended; (alarms during it: .+|no alarms during it)$/.test(t))).toBe(true);
  // the second screen follows the instructor's monitor again
  await second.waitForFunction(() => (window as unknown as Win).__pmeFollower?.sync?.status === 'synced', undefined, { timeout: 20_000 });
  // back at ×1 the beat tone sounds again
  await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×1' }).click();
  const d = await simT();
  await expect.poll(() => tones(d + 0.5, 1e9, ['qrs', 'pulse']), { timeout: 10_000 }).toBeGreaterThan(0);

  // owner's decision 5: a fast-forward alarm is latched, silent, in the monitor's alarm area until the next acknowledge
  await page.evaluate(() => (location.hash = '#/monitor'));
  await page.evaluate(() => (window as unknown as Win).__pmeApp.session.monitor.latchAlarms([{ id: 'E2E', text: 'E2E LATCHED', level: 1, category: 'physiological', since: 1, latched: false, acked: false }]));
  await expect.poll(async () => (await page.locator('.pme-bar').allTextContents()).join(' '), { timeout: 15_000 }).toContain('E2E LATCHED · during fast-forward 00:01');
  expect((await page.evaluate(() => (window as unknown as Win).__pmeApp.link.send({ type: 'device', action: { device: 'alarm', action: 'ack' } }))).accepted).toBe(true);
  await expect.poll(async () => (await page.locator('.pme-bar').allTextContents()).join(' '), { timeout: 5000 }).not.toContain('E2E LATCHED');

  // owner's decision 6: the Ventilator view (opened during the span) ventilates the patient, and a 2-minute fast-forward
  // runs with it: its frames reach the monitor on every tick of the span (the case itself may arrest meanwhile)
  await page.evaluate(() => (location.hash = '#/vent'));
  await page.waitForTimeout(3000);
  await page.evaluate((c) => {
    const w = window as unknown as { __cmds: number[] };
    w.__cmds = [];
    new BroadcastChannel(`pme-vent/v${c.toLowerCase()}`).onmessage = (ev: MessageEvent<{ kind: string; tick: number }>) => void (ev.data?.kind === 'cmds' && w.__cmds.push(ev.data.tick));
  }, code);
  const ack = await page.evaluate(() => (window as unknown as Win).__pmeApp.link.send({ type: 'time', action: 'jump', value: 120 }));
  expect(ack.accepted).toBe(true);
  await expect(page.locator('.ff-veil.on .ff-title')).toHaveText('FAST FORWARD · 2 MIN');
  await expect(page.locator('.ff-veil.on')).toHaveCount(0, { timeout: 60_000 });
  expect(await page.evaluate(() => (window as unknown as Win).__pmeApp.link.ctl.lastFastForward?.endT)).toBeGreaterThan(endT + 119);
  const ticks = await page.evaluate(() => (window as unknown as { __cmds: number[] }).__cmds);
  const span = new Set(ticks);
  // one frame per tick, without a gap, from before the span to its end (the cockpit runs ≤ 75 ticks ahead: those were
  // sent before the listener)
  expect(Math.max(...span) - Math.min(...span) + 1).toBe(span.size);
  expect(span.size).toBeGreaterThanOrEqual(6000 - 75);
});

// The gate's measurements (G3): skipped unless PME_S10_MEASURE=1; prints `[measure]` lines, asserts the gate's bounds.
test('measure: ×8 rate, frame time, fast-forward pace', async ({ page, browserName }) => {
  test.skip(!process.env.PME_S10_MEASURE, 'PME_S10_MEASURE=1 runs the gate measurements');
  test.setTimeout(300_000);
  const q = (a: number[], p: number) => [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(p * a.length))] ?? Number.NaN;
  for (const [id, vent] of [['showcase-anaphylaxis', false], ['showcase-bronchospasm', true]] as const) {
    await openApp(page, base, `?scenario=${id}`, { warmMs: 2000 });
    await page.getByRole('button', { name: 'Sound off' }).click();
    if (vent) {
      await page.evaluate(() => (location.hash = '#/vent'));
      await page.waitForTimeout(4000);
    }
    expect((await page.evaluate(() => (window as unknown as Win).__pmeApp.link.send({ type: 'time', action: 'scale', value: 8 }))).accepted).toBe(true);
    await page.waitForTimeout(3000);
    const at = () => page.evaluate(() => ({ t: (window as unknown as Win).__pmeApp.link.simT, w: performance.now(), n: (window as unknown as { __pmeApp: { frames: number[] } }).__pmeApp.frames.length }));
    const a = await at();
    await page.waitForTimeout(30_000);
    const b = await at();
    const fr = await page.evaluate((n) => (window as unknown as { __pmeApp: { frames: number[] } }).__pmeApp.frames.slice(n), a.n);
    const rate = (b.t - a.t) / ((b.w - a.w) / 1000);
    console.log(`[measure] [${browserName}] ${id}${vent ? ' + Ventilator view' : ''} at ×8: rate ×${rate.toFixed(2)}; main-thread frames p50 ${q(fr, 0.5).toFixed(1)} p95 ${q(fr, 0.95).toFixed(1)} max ${Math.max(...fr).toFixed(0)} ms`);
    expect(rate).toBeGreaterThanOrEqual(7.8);
    const ff = await page.evaluate(async () => {
      const w = window as unknown as Win & { __pmeApp: { link: { ctl: { onChange(fn: () => void): () => void } } } };
      const ctl = w.__pmeApp.link.ctl as unknown as { onChange(fn: () => void): () => void; lastFastForward: unknown };
      const t0 = performance.now();
      const ack = await w.__pmeApp.link.send({ type: 'time', action: 'jump', value: 300 });
      await new Promise<void>((res) => {
        const off = ctl.onChange(() => ctl.lastFastForward && (off(), res()));
      });
      return { accepted: ack.accepted, s: (performance.now() - t0) / 1000 };
    });
    console.log(`[measure] [${browserName}] ${id}${vent ? ' + Ventilator view' : ''}: fast-forward of 300 s took ${ff.s.toFixed(2)} s (paced to 10 s)`);
    expect(ff.accepted).toBe(true);
    expect(ff.s).toBeGreaterThanOrEqual(9.5);
    expect(ff.s).toBeLessThanOrEqual(13); // the cockpit's lockstep costs a round trip per step (WebKit, loaded machine: 11.6 s)
  }
});
```

Create `apps/demo/src/app/s10-fast-forward.dom.test.ts`:

```ts
// @vitest-environment happy-dom
// Stage 10 Task 5 (owner's decision 1): the fast-forward panel — the page dimmed and blurred behind it, "FAST FORWARD ·
// 5 MIN", the clock running from start to end over a progress bar, "sound muted" — then the banner for ≈ 8 s with the
// alarms and their times, and the alarms that came and went handed to the monitor to latch (owner's decision 5).
import type { FastForwardAlarm, FastForwardDone } from '@pme/controller';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FF_DONE_SHOW_MS, FF_SPANS, FF_WALL_MS, mountFastForward, type FastForwardSource } from './fast-forward.ts';

afterEach(() => vi.useRealTimers());
const al = (id: string, text: string, since: number, ended: boolean): FastForwardAlarm => ({ id, text, since, ended, level: 2, category: 'physiological', acked: false, latched: false });

describe('Stage 10: the fast-forward panel and banner', () => {
  it('runs the clock over the span, then fades into the banner, which goes after 8 s; the ended alarms are latched once', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
    expect(FF_SPANS).toEqual([120, 300]);
    expect(FF_WALL_MS).toBe(10_000);
    const src: { fastForward: FastForwardSource['fastForward']; lastFastForward: FastForwardDone | null } = { fastForward: null, lastFastForward: null };
    let simT = 600;
    const latched: FastForwardAlarm[][] = [];
    const off = mountFastForward(document.body, src, { simT: () => simT, latch: (a) => latched.push(a) });
    const veil = document.querySelector('.ff-veil') as HTMLElement;
    const banner = document.querySelector('.ff-banner') as HTMLElement;
    expect(veil.classList.contains('on')).toBe(false);
    src.fastForward = { fromT: 600, toT: 900 };
    simT = 750;
    vi.advanceTimersByTime(100);
    expect(veil.classList.contains('on')).toBe(true);
    expect(veil.querySelector('.ff-title')?.textContent).toBe('FAST FORWARD · 5 MIN');
    expect(veil.querySelector('.ff-now')?.textContent).toBe('12:30');
    expect((veil.querySelector('.ff-fill') as HTMLElement).style.width).toBe('50%');
    expect(veil.querySelector('.ff-ends')?.textContent).toBe('10:0015:00');
    expect(veil.querySelector('.ff-mute')?.textContent).toBe('sound muted');
    expect(banner.hidden).toBe(true);
    src.fastForward = null;
    src.lastFastForward = { fromT: 600, toT: 900, endT: 900, alarms: [al('HR_HIGH', '**HR 75>70', 700, true), al('SPO2_LOW', '**SpO2 89<90', 800, false)] };
    vi.advanceTimersByTime(100);
    expect(veil.classList.contains('on')).toBe(false);
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toBe('Fast-forwarded 5 min, 10:00 → 15:00. During it: **HR 75>70 11:40, **SpO2 89<90 13:20.');
    expect(latched.map((a) => a.map((x) => x.id))).toEqual([['HR_HIGH']]);
    vi.advanceTimersByTime(FF_DONE_SHOW_MS);
    expect(banner.hidden).toBe(true);
    expect(latched).toHaveLength(1);
    src.fastForward = { fromT: 900, toT: 1020 };
    vi.advanceTimersByTime(100);
    expect(veil.querySelector('.ff-title')?.textContent).toBe('FAST FORWARD · 2 MIN');
    off();
    expect(document.querySelector('.ff-veil')).toBeNull();
  });
});
```

Create `apps/demo/src/app/s10-fast-forward.test.ts`:

```ts
// Stage 10 Task 5 (the owner's fast-forward): the clinical log says where a fast-forward began and ended and lists the
// alarms raised during it, with their times (they were shown, not sounded); the log line of the command reads in words.
import { ControllerSession, createInProcessHub, createStamper } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { describeCommand, spanText } from './describe.ts';
import { Link } from './link.ts';

const S = 'FFL234';
const tick = () => new Promise((r) => setTimeout(r, 0));
const al = (id: string, text: string, since: number, ended: boolean) => ({ id, text, since, ended, level: 2, category: 'physiological', acked: false, latched: false });

describe('Stage 10: the fast-forward in the clinical log', () => {
  it('logs the start and the end with the alarms raised during it and their times', async () => {
    const hub = createInProcessHub();
    const host = hub.connect();
    const t = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, null);
    const stamp = createStamper(S, 'host-1');
    const send = (body: unknown[]) => host.send(stamp({ kind: 'event', body: body as never }));
    send([{ type: 'fastForward', t: 60, tick: 3000, phase: 'start', fromT: 60, toT: 360, wallMs: 10_000 }]);
    send([{ type: 'fastForward', t: 360, tick: 18000, phase: 'end', fromT: 60, toT: 360, alarms: [al('spo2Low', 'SpO2 LOW', 100, true), al('hrHigh', 'HR HIGH', 200, false)] }]);
    await tick();
    const sys = link.log.filter((e) => e.kind === 'system');
    expect(sys.map((e) => [e.simT, e.text])).toEqual([
      [60, 'Fast-forward 5 min started (sound muted until it ends)'],
      [360, 'Fast-forward ended; alarms during it: SpO2 LOW 01:40, HR HIGH 03:20'],
    ]);
    expect(link.ctl.lastFastForward?.alarms.map((a) => a.id)).toEqual(['spo2Low', 'hrHigh']);
    link.close();
  });

  it('an early end says why; none raised says so', async () => {
    const hub = createInProcessHub();
    const host = hub.connect();
    const t = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, null);
    const stamp = createStamper(S, 'host-1');
    host.send(stamp({ kind: 'event', body: [{ type: 'fastForward', t: 10, tick: 500, phase: 'start', fromT: 10, toT: 130 }, { type: 'fastForward', t: 40, tick: 2000, phase: 'end', fromT: 10, toT: 130, stopped: 'a new patient or scenario started', alarms: [] }] as never }));
    await tick();
    expect(link.log.map((e) => e.text)).toEqual(['Fast-forward 2 min started (sound muted until it ends)', 'Fast-forward ended early (a new patient or scenario started); no alarms during it']);
    link.close();
  });

  it('the command reads in words', () => {
    expect(describeCommand({ type: 'time', action: 'jump', value: 300 })).toBe('Fast-forward 5 min');
    expect(describeCommand({ type: 'time', action: 'jump', value: 120 })).toBe('Fast-forward 2 min');
    expect(spanText(90)).toBe('90 s');
  });
});
```

- [x] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/s10-fast-forward.test.ts src/app/s10-fast-forward.dom.test.ts`
Expected: 3 failed — `expected [] to deeply equal [ [ 60, …(1) ], [ 360, …(1) ] ]` (no log lines), `expected [] to
deeply equal [ …(2) ]`, `expected 'Time changed' to be 'Fast-forward 5 min'`; and the DOM test file fails to load
(`./fast-forward.ts` does not exist yet).

Run: `npx playwright test s10-time-control --retries=0 --project=chromium`
Expected: 1 failed — `locator.click: Test timeout … waiting for locator('.sessionbar').getByRole('group', { name:
'Fast-forward' }).getByRole('button', { name: 'Fast-forward 5 min' })` (the ×8 and beat-tone steps before it already
pass: Tasks 1–2); 1 skipped.

- [x] **Step 3 — implement.**

In `apps/demo/src/app/app.css`, find:

```css
.learner-strip[hidden] { display: none; }

```

Replace with:

```css
.learner-strip[hidden] { display: none; }

/* Stage 10 (owner's decision 1): while the host fast-forwards, the window dims and blurs behind one centred panel (above
   every view and the monitor in full screen); after it the panel fades and a banner stays ≈ 8 s. Amber, not alarm red. */
.ff-veil { position: fixed; inset: 0; z-index: 45; display: grid; place-items: center; background: rgb(0 0 0 / 0.5); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); opacity: 0; visibility: hidden; transition: opacity 0.4s, visibility 0s 0.4s; }
.ff-veil.on { opacity: 1; visibility: visible; transition: opacity 0.25s; }
.ff-panel { display: grid; justify-items: center; gap: var(--s-2); min-width: min(360px, calc(100vw - 2 * var(--s-4))); padding: var(--s-5) var(--s-6); border: 2px solid #ffb000; border-radius: var(--r-card); background: #0b0d10; color: #f3f6f9; }
.ff-icon svg { width: 96px; height: 64px; color: #ffb000; animation: ff-pulse 2s ease-in-out infinite; }
@keyframes ff-pulse { 50% { opacity: 0.35; transform: scale(0.92); } }
@media (prefers-reduced-motion: reduce) { .ff-icon svg { animation: none; } }
.ff-title { color: #ffb000; font-size: var(--t-22); font-weight: 700; letter-spacing: 0.06em; }
.ff-now { font-size: var(--t-44); font-variant-numeric: tabular-nums; }
.ff-bar { width: 100%; height: 3px; background: #2a3038; }
.ff-fill { height: 100%; width: 0; background: #ffb000; }
.ff-ends { display: flex; justify-content: space-between; width: 100%; font-size: var(--t-13); font-variant-numeric: tabular-nums; color: #aab3bf; }
.ff-mute { display: flex; align-items: center; gap: var(--s-2); color: #aab3bf; }
.ff-mute svg { width: 20px; height: 20px; }
.ff-banner { position: fixed; top: var(--s-2); left: 50%; transform: translateX(-50%); z-index: 45; max-width: calc(100vw - 2 * var(--s-4)); padding: var(--s-2) var(--s-4); border: 2px solid #ffb000; border-radius: var(--r-control); background: #0b0d10; color: #f3f6f9; font-weight: 600; text-align: center; pointer-events: none; }
.ff-banner[hidden] { display: none; }
.ff-group { display: inline-flex; align-items: center; gap: var(--s-1); }

```

In `apps/demo/src/app/describe.ts`, find:

```ts
    case 'time':
```

Replace with:

```ts
    case 'time':
      if (c.action === 'jump') return `Fast-forward ${spanText(Number(c.value))}`; // Stage 10
```

In `apps/demo/src/app/describe.ts`, find:

```ts
      return 'Instructor action';
  }
}
```

Replace with:

```ts
      return 'Instructor action';
  }
}

/** Stage 10: a sim time as the session clock shows it ("13:20"; ui.ts's `clock`, which the log cannot import in Node). */
export const timeText = (t: number): string => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** Stage 10: a fast-forward's span in words ("5 min", "90 s"). */
export function spanText(s: number): string {
  return Number.isFinite(s) && s > 0 && s % 60 === 0 ? `${s / 60} min` : `${Math.round(s)} s`;
}
```

Create `apps/demo/src/app/fast-forward.ts`:

```ts
// Stage 10 (the owner's fast-forward, 22 Oct demonstration; his decisions of 7 Oct): while the host fast-forwards, the
// window dims and blurs behind one centred panel — a slowly pulsing double chevron, "FAST FORWARD · 5 MIN" in amber in
// the monitor's typeface, the simulated clock running from the start to the end time over a thin progress bar, and
// "sound muted". After it the panel fades and a banner says for FF_DONE_SHOW_MS what was skipped and the alarms raised
// during it, with their times; the alarms that came and went are latched on this window's monitor (`latch`). It reads a
// source (a ControllerSession on the instructor's page and a Remote, a ViewerSync on the second screen) and sits above
// every view, the monitor in full screen included.
import type { FastForwardAlarm, FastForwardDone } from '@pme/controller';
import { spanText } from './describe.ts';
import { clock, h, setText } from './ui.ts';

export interface FastForwardSource {
  readonly fastForward: { fromT: number; toT: number } | null;
  readonly lastFastForward: FastForwardDone | null;
}

/** The owner's spans: 2 min (the CPR pulse-check interval) and 5 min. */
export const FF_SPANS: readonly number[] = [120, 300];
/** The wall time a span is paced to (owner: long enough for the room to notice it), ms. */
export const FF_WALL_MS = 10_000;
/** How long the banner stays after the end (owner: ≈ 8 s), wall ms. */
export const FF_DONE_SHOW_MS = 8000;

const CHEVRONS = '<svg viewBox="0 0 48 32" aria-hidden="true"><path d="M6 4l14 12-14 12M24 4l14 12-14 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/></svg>';
const MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function mountFastForward(
  parent: HTMLElement,
  src: FastForwardSource,
  o: { simT?: () => number | null; font?: () => string | undefined; latch?: (alarms: FastForwardAlarm[]) => void } = {},
): () => void {
  const icon = h('div', { class: 'ff-icon' });
  icon.innerHTML = CHEVRONS;
  const title = h('div', { class: 'ff-title' });
  const now = h('div', { class: 'ff-now', 'aria-hidden': 'true' }); // the running clock is not read out ten times a second
  const fill = h('div', { class: 'ff-fill' });
  const from = h('span');
  const to = h('span');
  const mute = h('div', { class: 'ff-mute' });
  mute.innerHTML = MUTED;
  mute.append('sound muted');
  const panel = h('div', { class: 'ff-panel', role: 'status' }, icon, title, now, h('div', { class: 'ff-bar', 'aria-hidden': 'true' }, fill), h('div', { class: 'ff-ends', 'aria-hidden': 'true' }, from, to), mute);
  const veil = h('div', { class: 'ff-veil' }, panel);
  const banner = h('div', { class: 'ff-banner', role: 'status' });
  banner.hidden = true;
  parent.append(veil, banner);
  let seen = src.lastFastForward; // one that ended before this window opened is not news
  let endedAt = -Infinity;
  const draw = () => {
    const ff = src.fastForward;
    veil.classList.toggle('on', ff !== null);
    if (ff) {
      const at = Math.min(ff.toT, Math.max(ff.fromT, o.simT?.() ?? ff.fromT));
      const font = o.font?.();
      for (const el of [title, now]) el.style.fontFamily = font ?? '';
      setText(title, `FAST FORWARD · ${spanText(ff.toT - ff.fromT).toUpperCase()}`);
      setText(now, clock(at));
      fill.style.width = `${(100 * (at - ff.fromT)) / (ff.toT - ff.fromT)}%`;
      setText(from, clock(ff.fromT));
      setText(to, clock(ff.toT));
    }
    const done = src.lastFastForward;
    if (done && done !== seen) {
      seen = done;
      endedAt = performance.now();
      o.latch?.(done.alarms.filter((a) => a.ended));
    }
    banner.hidden = ff !== null || !done || performance.now() - endedAt >= FF_DONE_SHOW_MS;
    if (!banner.hidden && done) {
      const al = done.alarms.map((a) => `${a.text} ${clock(a.since)}`);
      setText(banner, `Fast-forwarded ${spanText(done.endT - done.fromT)}, ${clock(done.fromT)} → ${clock(done.endT)}.${done.stopped ? ` Stopped early: ${done.stopped}.` : ''} During it: ${al.length ? al.join(', ') : 'no alarms'}.`);
    }
  };
  const iv = setInterval(draw, 100);
  draw();
  return () => {
    clearInterval(iv);
    veil.remove();
    banner.remove();
  };
}
```

In `apps/demo/src/app/link.ts`, find:

```ts
import { describeCommand } from './describe.ts';
```

Replace with:

```ts
import { describeCommand, spanText, timeText } from './describe.ts';
```

In `apps/demo/src/app/link.ts`, find:

```ts
      if (e.cause !== 'restore') this.conditions.clear();
      this.changed();
```

Replace with:

```ts
      if (e.cause !== 'restore') this.conditions.clear();
      this.changed();
    } else if (e.type === 'fastForward') {
      // Stage 10: where a fast-forward began and ended, and the alarms raised during it (shown, not sounded), with times
      if (e.phase === 'start') this.add({ simT: e.fromT, kind: 'system', text: `Fast-forward ${spanText(e.toT - e.fromT)} started (sound muted until it ends)` });
      else {
        const al = (e.alarms ?? []).map((a) => `${a.text} ${timeText(a.since)}`);
        this.add({ simT: e.t, kind: 'system', text: `Fast-forward ended${e.stopped ? ` early (${e.stopped})` : ''}; ${al.length ? `alarms during it: ${al.join(', ')}` : 'no alarms during it'}` });
      }
```

In `apps/demo/src/app/main.ts`, find:

```ts
import { exploreView } from './views/explore.ts';
```

Replace with:

```ts
import { exploreView } from './views/explore.ts';
import { mountFastForward } from './fast-forward.ts';
```

In `apps/demo/src/app/main.ts`, find:

```ts
  const follower = mountFollower(shell, site, follow, bar);
```

Replace with:

```ts
  const follower = mountFollower(shell, site, follow, bar);
  // Stage 10: the second screen shows the same fast-forward panel and latches the alarms that came and went
  mountFastForward(shell.root, { get fastForward() { return follower.sync?.fastForward ?? null; }, get lastFastForward() { return follower.sync?.lastFastForward ?? null; } }, { simT: () => follower.sync?.fastForwardAt ?? null, font: () => follower.monitor.skin?.render.fontStack, latch: (a) => follower.monitor.latchAlarms(a) });
```

In `apps/demo/src/app/main.ts`, find:

```ts
  mountSessionBar(shell.bar, link);
```

Replace with:

```ts
  mountSessionBar(shell.bar, link);
  mountFastForward(shell.root, link.ctl, { simT: () => link.simT, font: () => session.monitor?.skin?.render.fontStack, latch: (a) => session.monitor?.latchAlarms(a) }); // Stage 10: above every view
```

In `apps/demo/src/app/session.ts`, find:

```ts
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
```

Replace with:

```ts
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { FF_WALL_MS } from './fast-forward.ts';
```

In `apps/demo/src/app/session.ts`, find:

```ts
const EST_CAP_S = 1.5;
```

Replace with:

```ts
const EST_CAP_S = 1.5;
/** Stage 10: the Ventilator view ventilates the patient while its last frame is this recent (it sends 50 a second) [ENG]. */
const VENT_DRIVING_MS = 2000;
```

In `apps/demo/src/app/session.ts`, find:

```ts
  paused = false;
```

Replace with:

```ts
  paused = false;
  /** Stage 10: a fast-forward holds the monitor's clock (the sim clock estimate stands still between its steps). */
  fastForwarding = false;
  /** Stage 10: the Ventilator view's link (it sets it): a fast-forward steps the cockpit with the engine through it. */
  ventLink: { runTo(engTick: number): Promise<void> } | null = null;
  private ventFrameAt = -Infinity; // Stage 10: wall ms of the Ventilator view's last frame
  private ffWaiters: Array<() => void> = []; // Stage 10: a cockpit opened during a fast-forward waits for its end
  private ffTick: number | null = null; // Stage 10: the monitor's tick during a fast-forward (from its own steps)
  private ffCockpit = false; // Stage 10: the cockpit was ventilating when the fast-forward began: it steps with it
```

In `apps/demo/src/app/session.ts`, find:

```ts
    };
    let hs: HostSession | null = null;
    this.driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
    hs = new HostSession({ session: this.code, target: this.driver.host, scenario: this.driver.hook, welcomeEvents: () => this.driver.welcomeEvents() });
```

Replace with:

```ts
      // Stage 10: one fast-forward step on the monitor; the clock estimate is exact at every step (the runner reads it).
      // A cockpit ventilating the patient produces the step's frames first (owner's decision 6: the Ventilator view
      // supports the fast-forward), so the engine never runs a tick without its frame.
      fastForwardStep: async (ticks, last) => {
        this.fastForwarding = !last;
        try {
          if (this.ffTick === null) this.ffCockpit = this.ventLink !== null && performance.now() - this.ventFrameAt < VENT_DRIVING_MS;
          if (ticks > 0 && this.ffCockpit && this.ffTick !== null) await this.ventLink?.runTo(this.ffTick + ticks);
          const r = await this.need().advance(ticks, last);
          this.ffTick = last ? null : r.tick;
          this.lastT = r.simT;
          this.lastWall = performance.now();
          return r;
        } catch (err) {
          this.fastForwarding = false;
          this.ffTick = null;
          throw err;
        } finally {
          if (!this.fastForwarding) this.releaseFrames();
        }
      },
    };
    let hs: HostSession | null = null;
    this.driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
    hs = new HostSession({
      session: this.code, target: this.driver.host, scenario: this.driver.hook, welcomeEvents: () => this.driver.welcomeEvents(),
      fastForwardWallMs: FF_WALL_MS, // Stage 10 (owner's decision 1): paced so the room sees the clock run
    });
```

In `apps/demo/src/app/session.ts`, find:

```ts
    this.pollTimer = setInterval(() => this.driver.poll(), 100);
```

Replace with:

```ts
    this.pollTimer = setInterval(() => !this.fastForwarding && this.driver.poll(), 100); // Stage 10: a fast-forward polls per step
```

In `apps/demo/src/app/session.ts`, find:

```ts
      dispatch: (c) => m.dispatch(c).then((r) => (this.host.mirror(c, r), r)),
```

Replace with:

```ts
      dispatch: (c) => {
        // Stage 10: a frame from the cockpit means it ventilates the patient (a fast-forward then steps it along); one
        // from a cockpit opened during a fast-forward waits for its end — refused, the cockpit's first frames would never
        // teach the link its clock and the cockpit would stall for good
        this.ventFrameAt = performance.now();
        const go = () => m.dispatch(c).then((r) => (this.host.mirror(c, r), r));
        return this.fastForwarding && !this.ffCockpit ? new Promise<void>((res) => this.ffWaiters.push(res)).then(go) : go();
      },
```

In `apps/demo/src/app/session.ts`, find:

```ts
  /** Sim time: the last engine event's time run forward on the wall clock at the current speed, capped [ENG]. */
  simNow(): number {
    if (this.paused) return this.lastT;
```

Replace with:

```ts
  /** Stage 10: the cockpit frames held during a fast-forward go to the monitor now (the link learns its clock from them). */
  private releaseFrames(): void {
    for (const res of this.ffWaiters.splice(0)) res();
  }

  /** Sim time: the last engine event's time run forward on the wall clock at the current speed, capped [ENG]. */
  simNow(): number {
    if (this.paused || this.fastForwarding) return this.lastT; // Stage 10: exact between fast-forward steps
```

In `apps/demo/src/app/session.ts`, find:

```ts
  loadScenario(raw: unknown): { ok: true; doc: ScenarioDoc } | { ok: false; reason: string } {
```

Replace with:

```ts
  loadScenario(raw: unknown): { ok: true; doc: ScenarioDoc } | { ok: false; reason: string } {
    // Stage 10: the host refuses the scenario command during a fast-forward — the new body would run without its scenario
    if (this.fastForwarding) return { ok: false, reason: 'the simulation is fast-forwarding; try again when it ends' };
```

In `apps/demo/src/app/session.ts`, find:

```ts
    this.last = {};
```

Replace with:

```ts
    this.last = {};
    this.fastForwarding = false; // Stage 10: a new monitor (the host stops a fast-forward on the old timeline)
    this.ffTick = null;
    this.releaseFrames();
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
import { bookmark } from './commands.ts';
```

Replace with:

```ts
import { bookmark } from './commands.ts';
import { FF_SPANS } from './fast-forward.ts';
import { spanText } from './describe.ts';
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
  pause.setAttribute('aria-pressed', 'false');
```

Replace with:

```ts
  pause.setAttribute('aria-pressed', 'false');
  // Stage 10: the owner's fast-forward — 2 min (the CPR pulse-check interval) or 5 min of the case in ≈ 10 s, sound muted
  // meanwhile (a host action every controller sees, like speed and pause; no Cancel, by the owner's decision)
  const ffs = FF_SPANS.map((s) => {
    const b = button(spanText(s), () => void link.send({ type: 'time', action: 'jump', value: s }).then((r) => r.accepted || toast(`Fast-forward refused: ${r.reason ?? 'refused'}`)), 'small');
    b.setAttribute('aria-label', `Fast-forward ${spanText(s)}`);
    b.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 48 32" width="16" height="11" aria-hidden="true"><path d="M6 4l14 12-14 12M24 4l14 12-14 12" fill="none" stroke="currentColor" stroke-width="6"/></svg> ');
    return b;
  });
  const ff = h('div', { class: 'ff-group', role: 'group', 'aria-label': 'Fast-forward' }, ...ffs);
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
  bar.replaceChildren(h('div', { class: 'sb-left' }, who, badge, scen), h('div', { class: 'sb-right' }, t, speed, pause, mark));
```

Replace with:

```ts
  bar.replaceChildren(h('div', { class: 'sb-left' }, who, badge, scen), h('div', { class: 'sb-right' }, t, speed, pause, ff, mark));
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
    setText(t, clock(link.simT));
```

Replace with:

```ts
    setText(t, clock(link.simT));
    for (const b of ffs) b.disabled = link.ctl.fastForward !== null; // Stage 10: one at a time
```

In `apps/demo/src/app/views/remote.ts`, find:

```ts
import { mountSessionBar } from '../sessionbar.ts';
```

Replace with:

```ts
import { mountSessionBar } from '../sessionbar.ts';
import { mountFastForward } from '../fast-forward.ts';
```

In `apps/demo/src/app/views/remote.ts`, find:

```ts
    mountSessionBar(o.bar, link);
```

Replace with:

```ts
    mountSessionBar(o.bar, link);
    mountFastForward(document.body, ctl, { simT: () => link.simT }); // Stage 10
```

In `apps/demo/src/app/views/vent.ts`, find:

```ts
        offScale();
        detach();
```

Replace with:

```ts
        offScale();
        detach();
        session.ventLink = null; // Stage 10
```

In `apps/demo/src/app/views/vent.ts`, find:

```ts
        detach = attachMonitorToLink(session.linked(m), port, (c, r) => console.warn('vent link rejected', c.type, r)); // FU-11 (K2)
```

Replace with:

```ts
        const link = attachMonitorToLink(session.linked(m), port, (c, r) => console.warn('vent link rejected', c.type, r)); // FU-11 (K2)
        detach = link;
        session.ventLink = link; // Stage 10 (owner's decision 6): a fast-forward steps this cockpit with the engine
```

- [x] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run` — Expected: all passed.
Run: `npx playwright test s10-time-control --retries=0` — Expected: 2 passed (Chromium, WebKit) and 2 skipped (the
measure test runs only with `PME_S10_MEASURE=1`); the log prints `[chromium] 5 min of sim fast-forwarded in ≈ 10–11 s
(click to panel gone)` (prototype: Chromium 10.3–10.7 s, WebKit 10.3–10.8 s).
Run: `npx playwright test fu11- showcase-clock stage9-app stage9-a11y vent-link audit-timeline audit-worker stage4b-device --retries=0`
— Expected: all passed or skipped for their existing reasons (the session bar's new group keeps the 1.4.10
no-horizontal-scroll and target-size checks green; the Ventilator view's FU-11 checks are unchanged).
Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [x] **Step 5 — commit and push.**

```bash
git add apps/demo/src/app/session.ts apps/demo/src/app/sessionbar.ts apps/demo/src/app/link.ts apps/demo/src/app/describe.ts \
  apps/demo/src/app/main.ts apps/demo/src/app/views/remote.ts apps/demo/src/app/views/vent.ts apps/demo/src/app/app.css \
  apps/demo/src/app/fast-forward.ts apps/demo/src/app/s10-fast-forward.test.ts apps/demo/src/app/s10-fast-forward.dom.test.ts \
  apps/demo/e2e/s10-time-control.e2e.ts
git commit -m "feat(demo): ×8 and a paced 2- or 5-minute fast-forward — the panel and banner on every window, latched alarms, the log, the cockpit steps with it (Stage 10 T5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

## Gate — merge main, full verification, measurements, gate note, pull request

- [x] **G1 — merge main, block re-check.** `git fetch -q origin && git merge origin/main` (no rebase). Re-run the Task 0
  Step 3 check against the merge base's files if main moved: `0 problems` or each drift listed in the gate note.
- [x] **G2 — full suites.** `npx -y pnpm@9.15.9 -r typecheck` (clean); `CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9
  --filter @pme/engine-core exec vitest run` and every other package's `vitest run` (all passed; numbers to the gate
  note); `npx -y pnpm@9.15.9 --filter @pme/renderer build`, then `npx playwright test --retries=0` (both engines; every
  test passed or skipped for its existing reason). `git status docs/gates` stays clean (FU-11 K1).
- [x] **G3 — the measurements (on a kit built from the branch, both engines, nothing else running).** Run
  `PME_S10_MEASURE=1 npx playwright test s10-time-control -g measure --retries=0` and copy its `[measure]` lines: the ×8
  rate over 30 s of the heaviest showcase case (anaphylaxis) and of bronchospasm with the Ventilator view, the
  main-thread frame p95, and the wall time of a 300 s fast-forward for each (the second with the cockpit stepping).
  Pass: ×8 rate ≥ 7.8 in both engines; the fast-forward 9.5–13 s in both (paced to 10 s; above 13 s = the monitor or the
  cockpit could not keep the pace — report it, do not raise a constant). Compare with "Prototype results"; a rate below
  7.8 is reported with the catch-up policy (D-2), not "fixed" by raising a constant.
- [x] **G4 — the five-case rehearsal** (`scripts/showcase/rehearsal.showcase.ts`, both engines, kit built from the
  branch) at the speeds the run sheet uses (×4): the numbers match FU-11 Gate B's (Global Constraints). Then by hand,
  once per engine: induction case at ×8 for 2 min (clock and SpO2 move; no beat tone; no console error); "Fast-forward
  5 min" from the Instructor view with a second screen and a Remote open: the panel (dimmed, blurred page; pulsing
  chevrons; "FAST FORWARD · 5 MIN" in amber; the clock running ≈ 10 s; "sound muted") on the instructor's page (switch
  Monitor → Explore → Ventilator → Instructor while it runs), on the Remote and on the second screen; no sound during
  it and one two-tone cue at its end; after it the seam on every lane with the new time, the banner for ≈ 8 s with the
  alarms and their times, the waveforms sweep from the new time, the tiles and NIBP show the new values, the log shows
  both lines; an alarm that came and went is latched on the monitor until Silence/Acknowledge; then "Fast-forward 2
  min" with the Ventilator view ventilating (bronchospasm case): the cockpit keeps ventilating through and after it.
  Screenshots to `docs/gates/stage-10/` (only the ones this gate takes) — the owner signs off the look from them.
- [x] **G5 — gate note** `docs/gates/stage-10.md`: what was built, the numbers of G2–G4 against "Prototype results",
  every block drift, the owner's decisions and the two items left for the orchestrator. Commit with the plan's ticks,
  push, open the PR (`gh pr create --base main --head stage-10-time-control`, title "Stage 10: time control — ×8 and a
  paced fast-forward (5 or 2 min)"), and STOP (the orchestrator merges).

## Deviations recorded during execution

- **Task 3's pace test (test design; orchestrator ruling 2026-10-11).** The block's test "is paced to the wall time it is
  given" asserted a REAL wall time below 4000 ms for a 1.5 s pace; on PR #54's CI (run 38166128702) it took 4568 ms, and
  Stages 12/13 saw 5.35 s and 7.5 s under load. Replaced by (a) the same span on a fake clock — `HostSessionOptions.sleep`
  (new, the pacer's wait, default a real `setTimeout`; production unchanged) with the existing `wallNow` — asserting the
  239 waits of exactly 6.25 ms, the paced total and the start event's `wallMs`; and (b) one real-time smoke check with a
  LOWER bound only (≥ 1400 ms). The upper bound is gone. The blocks above are unchanged (they reproduce the prototype);
  the branch carries the new test.
- **Task 2's NIBP-through-the-span test: an explicit 180 000 ms timeout** (orchestrator ruling 2026-10-12), like the
  plan's other long Stage 10 tests. A pure CPU comparison of 300 s at two speeds with no wall-clock assertion: 4 s alone,
  43 s on a loaded CI runner (run 38169697950), where vitest's default 30 s timeout failed it. No assertion changed.
- **Task 6** (added by the orchestrator) and the two gate fixes (span wording, seam label): see `docs/gates/stage-10.md`.

## Mechanical self-check (done while writing; the executor re-runs Task 0 Step 3)

- `blocks.py` cut 114 find/replace blocks and 10 created files from the five task commits (T1 22 + 1, T2 27 + 1, T3
  29 + 2, T4 11 + 2, T5 25 + 4); every find occurs exactly once in its file at the moment it is applied.
- `check.py` on this file: applying every block, in plan order, to the base reproduces each task's prototype tree and
  the final tree byte for byte, and every file the prototype changed is in the plan: 114 blocks + 10 creates, 37 files: 0 problems — every task tree and the final tree byte-identical; the same blocks on bare `origin/main` 48864439 WITHOUT FU-11: 23 problems, so the FU-11 dependency is real.
- The partition: of the 37 files, 18 are FU-11 files (table in "File ownership against FU-11"); all their blocks were
  cut against the FU-11 FIXED prototype. No block edits a line FU-11's prototype does not have. None is an FU-7.1 file.
- Red before green: each task's new tests were run on the tree BEFORE the task (the prototype's previous commit) and
  failed for the reasons in Step 2 (R50 rebuild: T2 7 failed; T3 9 failed; T4 2 + 1 failed, the documenting test passing
  by design; T5 3 failed + the DOM file not loading); the determinism test fails fast on red (`FF_STEP_TICKS` asserted
  first — without it the reference loop never advanced and the test hung for 300 s).
- `scratch/plans-backup/stage-10-prototype.patch` = `git diff 6743e40f <T5>` (base → final, binary-safe), and the tools
  with `chain.txt`, `blocks.json` and the rendered snippets are in `scratch/plans-backup/stage-10-plan-tools/` (the first
  pass's as `*.pre-r50.*`).

## Self-review

**Brief and decisions coverage.** ×8 as a fourth speed — T1; the beat tone off above ×4 — T2 (D-14; unit test and the
e2e's tone count at ×8 and back at ×1). Every ×4 site — the clamp table: the enforcing sites are changed (T1), the
pass-through ones are measured at ×8 or are scale-free; one comment the probe missed (the mirror rate) is restated (T3).
A fast-forward of exactly 5 or 2 min, paced to ≈ 10 s — T3 (D-4: the empty first step, `fastForwardWallMs`; a unit test
of the pace) and T5 (`FF_SPANS`, `FF_WALL_MS`; the e2e measures 10.3–10.8 s). The panel on every window — T5 (D-12;
the DOM test for its parts, the e2e on four views and the second screen). Sound muted, one cue at the end — T2 (D-7; the
e2e counts tones inside the span and finds the 660 + 990 Hz cue after 9 s, none at the start). The seam — T2 (D-8;
unit test: the label on every lane). The banner and the log with the alarms and their times — T3 (the end event's list,
unit test with an alarm that came and went and one still active) and T5 (unit tests; the e2e). Latched alarms until the
next acknowledge — T2 (`latchAlarms`) and T5 (handed over at the end; the e2e latches one and clears it with an
acknowledge). Allowed in arrest and CPR, no Cancel — D-6 (nothing refuses it). The Ventilator view steps with the span
— T4 (D-10; `runTo` unit tests, the cockpit determinism test, the e2e's 2-minute span with a frame on every tick). A host
action every controller sees, built on F3 — T3. Event order and determinism with a test — T3 and T4 (D-5). The renderer
does not draw during the span; waveforms, trends, tiles, alarms, NIBP consistent after — T2. The scenario's state
machine runs through the span — T3. ×8 sustainable on WebKit, measured; what ×8 does when it cannot keep up — "Prototype
results", D-2. FU-11 B4 untouched — D-7. Gate section, owner's decisions, partitions against FU-11 and FU-7.1 — present.

**Placeholder scan.** No TBD/TODO; every code step is a block cut from the prototype; `assemble.py` refuses to write a
plan with a template marker left.

**Type consistency.** `MonitorCore.advance` / `Host.advance` / `MonitorHandle.advance` (renderer) vs
`HostTarget.fastForwardStep` (controller; a different name because the controller's test fake `ManualHost` already has
an `advance(wallMs)`); `fastForward` / `lastFastForward: FastForwardDone` have the same shapes on `ControllerSession` and
`ViewerSync` and are what `FastForwardSource` (app) reads; `FastForwardAlarm` is the engine's `AlarmEntry` plus `ended`,
which `MonitorHandle.latchAlarms` takes; `LinkDetach.runTo` (ventilator) is what `AppSession.ventLink` holds;
`FF_STEP_TICKS`, `FF_MAX_S` (controller), `RUN_TIMEOUT_MS` (ventilator), `BEAT_TONE_MAX_SCALE` (renderer), `FF_SPANS`,
`FF_WALL_MS`, `FF_DONE_SHOW_MS` (app). Typecheck is clean after every task in the prototype.

**Review Focus.** Five lines, each pinned by a named test in its owning task.
