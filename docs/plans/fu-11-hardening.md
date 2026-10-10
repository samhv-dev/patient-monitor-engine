# FU-11: engineering hardening — browser integration, snapshots and restore, lifecycles, relay, rehearsal defects — Implementation Plan

STATUS: FIXED (2026-10-07, base `origin/main` 48864439, 8 926 lines) — R50 APPROVE WITH FIXES, all findings applied; owner rulings Q1/Q3/Q4/Q6 built in; rebased; rehearsal items H4–H6 added

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> Prototype: every task below was run in `scratch/wt-fu-11-proto2` (detached at `origin/main` 48864439) and its
> find/replace blocks were CUT MECHANICALLY from that tree (`scratch/plans-backup/fu-11-plan-tools/build.py`): applying
> every block of a branch, in order, to `origin/main` reproduces the prototype's files byte for byte, per branch (d on
> top of b) and with the four branches together (`render.py` verify: 0 problems). Patch:
> `scratch/plans-backup/fu-11-prototype.patch`. The 21 red regression tests of the external browser audit went 42/42
> red → 42/42 green (Chromium + WebKit) on the prototype. History: written on f29951b (2026-10-04), fixed after the
> R50 review on cdf95a2c (2026-10-04/05), rebased on 48864439 (2026-10-06/07: the 52 commits since applied with
> `git apply -3`, 0 conflicts; the changed tasks re-run there).

## Review fixes (R50 review `scratch/plans-backup/fu-11-review.md`: 1 Critical, 10 Important, 16 Minor = F1–F27; Minor M1–M16 are F12–F27)

| # | Finding | What changed in this plan (task / section) | Verified |
|---|---|---|---|
| F1 (Critical) | The Ventilator link keeps its offset across a restore (SpO2 92 → 64 after "Return here") | NEW **E3b**: the link starts a new generation on the engine's restore marker (a `toneCancel` without ids); unit test + e2e; **E4 depends on it**. Every consumer of engine time listed with how it resets: D-13 | red: no clock after a restore; e2e CO2 0 / SpO2 88; green both engines |
| F2 | 200-event split does not keep messages under the receive budget | **A3** splits by encoded size (128 KB) AND count; test with the app's real 1 Hz truth events | red: 4 of 60 truth events delivered; green 60/60 |
| F3 | Mirroring streams the cockpit's samples | RULED: same-browser BroadcastChannel ONLY; settings-mirroring measured inexact (1 tick → 3.5 ms beat drift); relay drops mirror frames (guard + test); declared deviation from brief §3.7 / D-7 — **G1**, D-7 | mirror reaches BC only; relay test green |
| F4 | Follower shares the instructor's event loop | **G2** opens it with `noopener` (asserted `window.opener` null; it still follows) | e2e both engines |
| F5 | An instructor reload orphans the follower | **G2** keeps the code across a reload (`?session=`), host-liveness rule ("not answering" after 5 s); **E3** resets speed/pause on a new host | e2e: reload → same code, synced, tiles equal; close → "not answering" |
| F6 | Gate A's hidden-tab check cannot hide a tab | Gate A Step 3: HEADED Chromium, tab hidden ≥ 6 min, exact procedure (not a CI test) | procedure |
| F7 | Rehearsal compares with stale numbers | Gate B Step 3: rehearse main and the branch the SAME DAY; stop on any difference except H5's declared one | procedure |
| F8 | Items "handed" to plans that do not contain them | Appendix "Amendments this plan requires in other plans": exact text for `stage-8b-release.md`; "FU-12 / physiology backlog" with numbers and sources | — |
| F9 | CI rebalance belongs to Part K | Amendment 6 (seven groups) is on main via FU-10 (662f8a1b); **K4** moves ET-19 into SLOW (slow-b) and VERIFIES the groups (local disjointness + Gate C times, none > 35 min); off-limits updated | local: 0 duplicates, COVER-OK |
| F10 | Two items missing (haemorrhage 10:08 vs 10:03 after the Ventilator view; CI amendment 6) | NEW **H6** (a new patient unloads the cockpit; cause found: it re-attached to every new monitor); CI amendment 6 → K4 | probe: 641 vs 647 s → 640 vs 641 s |
| F11 | The second screen rides inside a hardening gate | Part G moves to its own branch **`fu-11-d`** (G0–G2), built on b, merged last, own Gate D; four-way merge re-checked | merge check (Mechanical self-check) |
| F12 (M1) | Wrong commit for the Remote cold-start fix | 2bb00d3 → **4e6b93ba** (inventory) | — |
| F13 (M2) | "a snapshot restores only into its own build" is false (`version.ts` is `'0.0.0'`) | D-4 corrected: nothing guards cross-build restores today; a build-unique engine version is handed to 8b Task 5 (appendix) | read |
| F14 (M3) | Expected counts are stale | Every setup task RECORDS before-numbers; this plan's numbers are the prototype's on 48864439, for orientation | — |
| F15 (M4) | Pause label flickers | **F3**: the bar shows what it asked until the host answers; e2e with a slow host | red/green |
| F16 (M5) | Alarm title hard-codes clinical names | **H3**: the tooltip lists the skin's `alwaysOn` worded by the alarm table; generic when none (owner ruling Q4) | unit + e2e |
| F17 (M6) | The plan is committed in every branch | committed in **b only** (D0); a, c, d keep ticks in gate notes / b's copy | — |
| F18 (M7) | Stray comment in `audit-session-boundary.e2e.ts` | removed (A3's create) | — |
| F19 (M8) | `readSamples` with a fractional index (root of F20) | **J6** floors the index, NaN/±∞ read nothing; unit test | red/green |
| F20 (M9) | No way to declare an expected refusal | recorded in **J3**; handed to 8b (appendix) | — |
| F21 (M10) | `types.ts` / schema still advertise modifier ramps | **I2**: doc comment + schema `description` (Q6 ruled) | scenario suite green |
| F22 (M11) | F17 test does not check a real MODELED host | **I3**: HostSession + ScenarioDriver on a MODELED engine → `l1.mode` manual | red/green |
| F23 (M12) | Restore with a sounding tone untested | **B1**: restore-before stops it; forward-restore limit recorded | red/green |
| F24 (M13) | A BC peer that said viewer can still command | **A3**: refused with a reason (as the relay) | red/green |
| F25 (M14) | Explore baseline not reset by a restore before it | **H2**: time back → histories restart; a later baseline is dropped | e2e both engines |
| F26 (M15) | Watchdog failure is permanent and silent | **C1**: `pme-monitor-failed` event → toast "The monitor stopped — Restart the patient" + console reason | e2e both engines |
| F27 (M16) | K3's best-of-five is a relaxation | **K3** discloses it (R45 note in the gate) | — |
| review §2–§5 | Gate B runs `validate --quick` and the FU-7 counters before/after; a silenced pulse now stops at once; relay drop log unlimited | Gate B Step 2 (counters equal); B1 gate-note line; relay drop-log rate limit → v1.1 (appendix) | — |
| review §2(b) | Reduced rig sweep in D1's test | NOT added: the reviewer's own 59-snapshot sweep (16 documents) found all equal on cdf95a2c and D1's three rigs cover each non-JSON value kind; Gate B re-runs `audit-snapshot` and the state-reading slow files — recorded, not a test | — |
| Owner Q1 | Higher priority breaks a silence | NEW **B4** (evidence checked per vendor: no profile documents the opposite) | red/green |
| Owner Q3 | Same style; sound per window | **G2** (style channel, `audioSilence: 'window'`, "Silence here") | unit + e2e |
| Owner Q4 | Wording ours, from data | **H3** | — |
| Owner Q6 | Refuse timed modifier onsets in v1.0 | **I2** (ruled; v1.1 wish list) | — |
| Coordinator 2026-10-06 | Sound off; Ventilator-view volume; G2 contract for a later mobile plan; rebase | NEW **H4**, **H5**; contract in `follower.ts` + G0; base 48864439 | red/green |

**Goal:** make the browser integration correct and the rehearsal's showcase defects go away BEFORE the 8b release, with
no physiology change: a bookmark restore that brings back the patient and the whole screen (waveforms, trends, tiles,
every clock), snapshots that survive JSON exactly, worker and remote lifecycles that always settle and close, audio
that stops when its cause ends, a relay one malformed peer cannot end, a second-screen learner monitor that FOLLOWS the
instructor's session, and the test infrastructure fixes (no gate screenshots rewritten by a test run, honest local
WebRTC skips, load-tolerant timing tests).

**Architecture:** four branches, four executors (see "Parts, files and merge order"): `fu-11-a` boundary and
lifecycle (Parts A relay/wire, B audio and alarm silence, C worker, F remote/presence), `fu-11-b` timeline and the
rehearsal/showcase defects (Parts D snapshot, E timeline reset, H UI), `fu-11-c` commands, validation and tests (Parts I
command boundary, J validation honesty, K test infrastructure), and `fu-11-d` the second-screen learner monitor (Part
G), a new feature on its own branch BUILT ON `fu-11-b` and merged last (R50 F11). ONE timeline mechanism: the showcase
hotfix's `timeline` wire event gains a `cause` ('restart' | 'restore'); restore, scenario load and patient restart all
go through `HostSession.newTimeline(cause)`, and every presentation owner (renderer lanes, trends, tiles, controller
clock, scenario view, viewer anchor, the app's Link) resets from it or from the restore that precedes it. Snapshots
carry their pending stage groups and encode the non-JSON values (`snapshot-codec.ts`) instead of the model changing its
sentinels.

**Tech Stack:** TypeScript 5.9 strict (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `noImplicitOverride`), Vitest
3.2.7, Playwright 1.63 (its own Chromium 1243 + WebKit 2359), pnpm 9.15.9 via `npx`, Node ≥ 22.12 (CI 22, local 26).
No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): the FU-11 rulings ("External
engineering review FILED", 2026-10-03; "External browser-integration audit received", 2026-10-04 10:40; the
"Showcase rehearsal results" S1–S6; "Showcase hotfix PR #33 received" not-fixed notes; "Showcase kit PR #34 received"
K1–K6; "Presenter documents DELIVERED" D1–D5; the FU-11 list in "STATE SNAPSHOT before compaction"; the CI and flake
notes after the 13:30 cap reset; the Ali rulings of 2026-10-04 11:50/12:25), `../research/16-external-review-chatgpt.md`
(F01–F26), `../research/17-external-browser-audit-chatgpt.md` + `17-external-browser-audit-case-matrix.md` (BA01–BA12,
cases R01–RF01, HI01–HI03, AL01, LC01) and the audit's regression tests
(`/Users/samhv/Desktop/ChatGPT/patient-monitor-browser-audit/regressions/`), `docs/RESUME.md` (process, R45, R50, R51,
R53–R60, CI amendments, the executor brief).

---

## Global Constraints

- **No physiology change.** No model equation, constant, band or acceptance number changes. The engine edits are input
  validation (I1, I2), command ownership and lifecycle (D2), snapshot transport (D1) and device-tone lifecycle (B2). A
  physiology item found while executing goes to the FU-12 / FU-8 Part B / calibration lists, never into this branch.
- **R45:** no band widened. A timing bound in a test is not loosened (K3 keeps 1 ms and asserts the best of five
  batches); a per-test timeout is raised only for a test that drives a real engine (CI amendment 3).
- **R56:** the glossary is the only source of clinical labels. FU-11 adds UI copy only ("Show the learner monitor
  here", "Open the learner monitor in a new window", "Open on a second screen", "Return here", "Limit alarms off",
  "Following session …", "The instructor's monitor is not answering", "Silence here", "The monitor stopped — Restart
  the patient"); no clinical value label changes. The "Limit alarms off" tooltip names alarms only from the skin's
  data worded by the app's alarm table (owner ruling Q4, R50 M5; H3).
- **Bookmark restore** ("Return here") is un-hidden in Task E4 ONLY because D1–E3's tests are green at that point; if
  any of them is red, E4 is not executed.
- **The five showcase scenarios do not change behaviour** — with ONE declared, intended exception: H5 makes the
  Ventilator view deliver the monitor ventilator's volume, so the bronchospasm case's VENTILATOR-VIEW VTE rises
  (kit: 162 → 367; expected after H5 ≈ 400–430 → ≈ 500); the internal ventilator, every monitor number and the other
  four cases do not move. Gate B rehearses on the branch AND on `origin/main` the SAME DAY (R50 F7: the kit's numbers
  are from earlier builds) and stops on any difference other than that one.
- **Process (RESUME executor brief):** each branch in its own worktree `../scratch/wt-fu-11-<a|b|c>` from `origin/main`;
  failing test → run red → implement → run green → commit with the task's message and the trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` → `git push` after EVERY task. Never push to main; never
  merge; the gate opens the PR and stops. Never `git stash`. Never run a command that reads standard input. Bounded
  waits (≤ 10 min per `until` loop, re-checking the process). Scratch files under `<scratchpad>/fu-11-<b>/` only.
  Kill only processes you started (never `pkill -f`). The machine is shared: run targeted tests in tasks; the full
  suites run once, in the gate.
- **Find/replace discipline:** every edit is a block that occurs exactly once at its place (the checker,
  `../scratch/plans-backup/fu-11-plan-tools/check-blocks.py`, proves it before Task 1 and again in the gate after
  merging main). If main moved and a block no longer matches, locate the statement by its quoted FU-11 neighbour or the
  surrounding unchanged lines and make the same change; never re-type a line you are not changing.
- **Commands:** `npx -y pnpm@9.15.9 …` (pnpm is not on PATH); no `timeout` on macOS; engine tests with `CI=1`; e2e
  `npx playwright test <stem> --retries=0` from the worktree root (both projects unless `--project=…`); the IIFE e2e
  (`stage6a-worker`, `iife-smoke`) need `npx -y pnpm@9.15.9 --filter @pme/renderer build` first.
- **Never touch** (other plans own them): `l2/**` model files except the two validators of I1 (`l2/endo/pipeline.ts`
  meal/phase, `l2/resp/pipeline.ts` frame) and I2's three `pmax` lines (FU-6 code; no in-flight plan edits them);
  `docs/physiology/**`; `docs/plans/**` other than this plan (the amendments other plans need are in the appendix, for
  the orchestrator); `package.json`, `pnpm-lock.yaml`; `.github/**` — R50 F9 ruled that Part K MAY edit
  `.github/workflows/ci.yml` for CI amendment 6, but amendment 6 (seven slow groups) arrived on main with FU-10's gate
  (662f8a1b), so FU-11 edits no workflow: K4 only moves one file into SLOW and verifies the groups (Gate C).
- **Alarm behaviour changes once, by ruling:** B4 (owner ruling Q1) makes a new higher-priority alarm end a
  lower-priority silence on the IEC-style skins; nothing else about alarms changes.

## Review Focus

1. **A paused session and a hidden tab.** The worker watchdog (C1) must never fail a live worker: it is armed only
   while requests wait, ignores silence while the page is hidden or within 30 s of a catch-up, and resets when this page
   itself was blocked. Gate A runs it HEADED with the tab hidden ≥ 6 min (R50 F6: intensive timer throttling starts
   after 5 min hidden; a headless page is never hidden) — the procedure is in Gate A Step 3.
2. **A restore while paused, and twice in a row.** E2/E3 must leave the paused session paused, the clock still, and a
   second restore to a different bookmark must not keep anything of the first (audit R02/R04 classes). Covered by
   `audit-rewind` (running) and Gate B's manual check (paused restore: clock stationary 5 s; two alternating restores:
   lanes, trends and clock follow each).
3. **The second screen when the instructor changes the skin** (owner ruling Q3): the follower wears the instructor's
   style and follows a change within a second (style channel); its sound is its own. Gate D checks both.
4. **Mirroring cost with the Ventilator view and a viewer.** G1 sends up to 200 `commandApplied` per second at ×4 while
   a viewer exists, to BroadcastChannel transports only (R50 F3). Gate D measures the host's frame p95 with and
   without a follower on the bronchospasm case (prototype: no visible stutter; number to the gate note).
5. **Old snapshots and other readers of `snapshot().state`.** D1 changes only the transport form of non-finite, −0 and
   undefined values; a reader of such a field now sees `{ $nf: … }`. The gate runs slow-a/b (lung-longrun and the
   other state-reading suites) and `validate --suites sanity,gates --quick`.

---
## Item inventory (every finding and every rulings item, and what happens to it)

Decision codes: **task X** (a task of this plan) · **fixed** (already on main; commit named) · **appendix** (exact
amendment text for the plan that takes it, R50 F8) · **declined** (with the reason) · **Q#** (needs the owner's decision; see the end) ·
**recorded** (kept as a record, no action). "Verified" = re-checked on `origin/main` f29951b (code of add125f, after the
showcase hotfix #33, kit #34 and the timeout fix #35): **reproduced** (how, numbers), **present** (code unchanged, read
at file:line; not re-run), **not reproducible**, **fixed**. Several findings were reported on older commits (bf436a3,
b2a0292); none was fixed by the hotfix except S1/S2/S6. Rebase (2026-10-07): the rows whose files moved between
f29951b and 48864439 were re-run on 48864439 (the tasks' red/green lines say which base). "Appendix" = the section
"Amendments this plan requires in other plans" at the end: exact text for the plan that takes the item (R50 F8: nothing
is handed to a plan that does not contain it).

### 1. External engineering review (research/16; F01–F26, baseline bf436a3)

| ID | Finding | Verified on f29951b | Decision |
|---|---|---|---|
| F01 | JSON `null` ends the relay; deep input overflows the guard; object budget ≠ string budget | reproduced: audit-relay 6/6 red (relay exit 1: `null.to` TypeError, `RangeError: Max payload size exceeded` unhandled, guard stack overflow); 262 145-char command object accepted on BC | **task A1, A2, A3** |
| F02 | an all-NaN waveform grades green | reproduced: `compareWave([1,2,3,4],[NaN…])` green (fu11-compare-wave: 3 red) | **task J1** |
| F03 | stage-group ticks outside the snapshot | reproduced: restored original accepts tick 100, fresh engine 2 | **task D1** |
| F04 | viewer resync keeps the old anchor | reproduced: viewer at 4.9 s after a restore to 1 s (audit-timeline) | **task E3** |
| F05 | restore does not rewind waveforms or trends | reproduced: trend latest 5 s after a restore to 1 s; waveform crop identical 0–2 s after the restore (audit-rewind, main and worker paths, both browsers) | **task E1, E2** |
| F06 | worker failure/destroy leaves requests pending | reproduced: command/snapshot/restore/capture12/destroy `pending` after 5 s (audit-worker 10/10 red) | **task C1, C2** |
| F07 | a public peer id suffices to replace the relay host | present (relay/server.ts:154–160 unchanged: same `from` closes the live host with "replaced by reconnect") | **recorded** — RULED (2026-10-03): F07 goes with the v1.1 relay; v1.0 pairs in one browser (ruling 6); the 8b release-notes text is in the appendix |
| F08 | a rejected first link frame stalls clock learning | reproduced: refused / rejected / thrown first dispatch → 0 clock messages | **task I4** |
| F09 | controller time stays in the future after a restore | reproduced: controller simT 5 after a restore to 1 s | **task E3** |
| F10 | the p99 gate does not enforce a budget | present (tick-bench.test.ts bounds p50; cli-ticks.ts never fails; no workflow runs it) | **task J5** (+ appendix: 8b's RELEASE checklist runs `perf:ticks --budget-ms`) |
| F11 | malformed commands accepted, then crash or poison | reproduced, worse than reported: `setRhythm 'toString'`/`'constructor'` → TypeError; meal without grams and a paw/flow-only frame → `RangeError: next event time is NaN` (engine stops); NaN pacer rate, `'toString'` shock outcome and sepsis phase accepted (the phase throws) | **task I1** |
| F12 | queued commands keep the caller's object | reproduced: `hr.to` 400 after the caller's edit | **task D2** |
| F13 | modifier ramp accepted and ignored | reproduced: QTc 500 at 0.02 s with delay 10 s / duration 60 s | **task I2** (refused; type and schema say so, R50 M10); implementing ramps **declined** — RULED (Q6, 2026-10-05): refuse in v1.0, v1.1 wish list |
| F14 | JSON snapshot changes LVAD state | reproduced: first LVAD PI 15.52 vs 12.12; also NaN `paco2Set` → null, `undefined` keys dropped (truth `dropped` 7 vs 8) | **task D1** |
| F15 | a rate edit drops the configured Pmax (FU-6) | reproduced: vent `{rr:16, vt:500, peep:5, ie:2}` — pmax gone | **task I2** |
| F16 | a failed scenario alternative consumes events | reproduced (fu11-runner: state stays `a`) | **task I3** |
| F17 | explicit MANUAL dropped on scenario load | present in runner.ts:127; the app's own load remounts with the document's mode (Stage 9), a Remote's load does not | **task I3** |
| F18 | remote rejoin/destroy leaves transports open | reproduced: `['open','open']` after two joins and destroy (audit-remote) | **task F1** |
| F19 | a started tone cannot be cancelled | reproduced: OfflineAudioContext RMS 0.175 after cancel at 0.25 s and 2.5 s; disarm emits no toneCancel | **task B1, B2** |
| F20 | the CO2 JSON-replay test compares two NaN arrays | reproduced: 300/300 NaN (reads `resp` at index 1562.5) | **task J6** (+ the root, `readSamples` floors the index: R50 M8) |
| F21 | validation grades green after a refused intervention | reproduced (fu11-run-refused: measurable true) | **task J3** |
| F22 | the validation R detector invents peaks on a flat signal | reproduced: 40 peaks in 10 s of zeros | **task J2** |
| F23 | cached dataset bytes bypass the MD5 | reproduced (corrupt cache returned, no fetch) | **task J4** |
| F24 | physiology-console restart: Pause/Resume and baseline inconsistent | present on the developer page (physiology-console/view.ts:152, 321–354); the clinical app's restart keeps the pause (session.ts `mountWith`: `if (this.paused) m.pause()`) | **declined** here (Developer view build-stage page, not the app) — appendix: 8b's Developer-page review (retire or fix) |
| F25 | the stage7g demo never shows the depth index ("7f pending") | present (stage7g.ts:81–88); the app's Explore shows the depth | **declined** here (developer page; ruling: "dropped unless the layer is reused") — appendix: 8b's Developer-page review |
| F26 | `engine.start()` has no teardown | reproduced: no `stop`/`destroy` | **task D2** |
| review notes | test maintenance (empty-sample guards, titles beyond assertions, repeated long fixtures, async collection) | — | **recorded** for the orchestrator's test-maintenance backlog (an owner, not a plan; no product defect; FU-11 adds guards only where it writes tests) |
| review notes | release: stale README/CONTRACT wording, dist notices, Vitest GHSA-82fw-gwwq-j7x9 (dev-only), unused exports, retired CVP waveform path | — | appendix: 8b (its scope: docs, notices, toolchain) |

### 2. External browser-integration audit (research/17; BA01–BA12, baseline b2a0292)

| ID | Finding | Verified on f29951b | Decision |
|---|---|---|---|
| BA01 | waveforms and trends keep the discarded future | reproduced (audit-rewind 4/4 red) | **task E1, E2** |
| BA02 | restored pending groups use other ticks | reproduced (audit-snapshot pending-group: ack tick 350 vs 250) | **task D1** |
| BA03 | JSON snapshots change LVAD state | reproduced (audit-snapshot json-lvad) | **task D1** |
| BA04 | viewer restore keeps the old anchor | reproduced (audit-timeline: viewer 4.9) | **task E3** |
| BA05 | controller time cannot rewind | reproduced (audit-timeline: controller 5) — the hotfix fixed the restart half only | **task E3** |
| BA06 | worker requests pending after failure/destroy | reproduced (audit-worker 10/10 red) | **task C1** |
| BA07 | remote leaves owned transports open | reproduced (audit-remote) | **task F1** |
| BA08 | cancellation does not stop active voices | reproduced (audit-audio-cancel 4/4, audit-audio-disarm 4/4 red) | **task B1, B2** |
| BA09 | a pending audio unlock outlives destroy | reproduced (audit-audio-unlock: `['running']`) | **task B3** |
| BA10 | malformed peers end the relay | reproduced (audit-relay 6/6 red) | **task A1, A2** |
| BA11 | local transport takes wrong-session and over-budget commands | reproduced (audit-session-boundary: applied 3 vs 1) | **task A1, A3** |
| BA12 | relay host-offline notice ignored by the session | reproduced (audit-presence: hostOnline true) | **task F2** |
| HI03 | a room-code holder can declare itself controller | present (trust boundary, BC and WS) | **recorded** — RULED (2026-10-04 10:40): accepted for v1 (trusted local network), stated in 8b's release notes (appendix text); a capability token is v1.1 pairing UX. R50 M13's narrower point (a peer that DECLARED viewer can still command on BC) is fixed in **A3** |
| AL01 | ZOLL-like silence vs a higher-priority alarm | present (policy: ZOLL stays muted by its profile and unit test; Saadat breaks silence) | **task B4** — RULED (Q1): a new higher-priority alarm breaks a lower-priority silence on every profile; evidence checked per vendor (no profile documents the opposite) |
| R02, R03, R07, W01, C01, C03, C05–C07, A01 | controls that passed on b2a0292 | — | **recorded**; R02/R04-style checks are Review Focus 2, A01 is kept by B1's unit test |
| R10 | console restart (excluded by the audit) | — | see F24 |
| LC01 | 50-cycle resources: WS liveness timers 1 → 51 | the WS half is BA07 | **task F1** |

### 3. Orchestrator rulings items (showcase rehearsal, hotfix, kit, presenter documents, the earlier FU-11 list, CI)

| Source | Item | Verified on f29951b | Decision |
|---|---|---|---|
| Rehearsal S1 | Saadat-style shows no CO2 lane | fixed: 5a69af51 (PR #33, `layout.whenAttached.co2`) | **fixed**; its restore half (the swap after a restore) → **task E2** |
| Rehearsal S2 | second scenario load freezes the clock | fixed: 9eb8db98 (PR #33, `timeline` event) | **fixed**; the restore half → **task E3** |
| Rehearsal S3 | the case waits for "Pulse back: stop CPR" | not a defect | **recorded** |
| Rehearsal S4 | latched alarms stay after the cause (Philips-style) | authentic latching | **recorded** |
| Rehearsal S5 | narrow window: panel and Ventilator view overlap | by design below 1200 px (the panel is a drawer over the monitor; below 900 px portrait a sheet); one defect: the Sound button is hidden below 900 px (app.css:103) | **task H3** (Sound); the layout **recorded** (instructor view not designed below 760 px) |
| Rehearsal S6 | acute-events checkbox overlaps its text | fixed: 6fbe9ec3 (PR #33) | **fixed** |
| Kit K1 | CPR + adrenaline before "SPO2 NO PULSE" → VF, no ROSC | physiology | appendix: FU-12 / physiology backlog (FU-8 Part B merged without it; the reflex audit is v2.0 per `docs/roadmap/v1.0-remaining.md`) |
| Kit K2 | a second window at #/monitor, #/explore or #/vent starts its own patient; "Open the learner monitor" misleading | reproduced by the kit proof `multiwindow.showcase.ts` | **task G1, G2** (a follower at `?follow=<code>#/monitor`; plain second windows at #/explore or #/vent still start their own session — documented on Start) |
| Kit K3 | "Alarms off" on every fresh load with crossed bells while alarms still raise ("on WebKit") | reproduced on Chromium AND WebKit: the label shows the saadat-like factory state (D4) | **task H3** (wording RULED, Q4: ours, from the skin's data) |
| Kit K4 | duplicated state boxes in the scenario strip | not reproducible (haemorrhage case, 1280×800 and 680×800, WebKit and Chromium: one box per state) | **not reproduced** — the orchestrator asks the kit agent for its screenshot or steps (ruled: Q5 stays with the orchestrator) |
| Kit K5 | the Remote's speed control shows ×1 while the host runs ×4 | reproduced by reading sessionbar.ts (local state only) | **task F3** |
| Kit K6 | at pulse loss: IBP1 STATIC PRESSURE and blank sys/dia | vendor-like monitor behaviour (FU-5's non-pulsatile handling) | appendix: FU-12 / physiology backlog (a monitor-fidelity question for the calibration review, not engineering) |
| Hotfix note | ViewerSync ignores `timeline` | present (viewer-sync.ts had no `timeline` case) | **task E3** |
| Hotfix note | HostSession keeps ECG lead/filter across a restart | present (`sticky` keys `ecg.*` survive `newTimeline`) | **task E3** |
| Hotfix note | the capnogram swap does not follow a snapshot restore | present (mount.ts `setCo2` only on `attachSensor`) | **task E2** |
| Hotfix note | the full e2e suite rewrites committed gate screenshots | reproduced: `stage6a-screens` rewrote three `docs/gates/stage-6a/*.png` | **task K1** |
| Hotfix note | two stage6a WebRTC e2e fail locally | reproduced: `stage6a.e2e` "over rtc" and `stage6a-latency`'s rtc path, macOS Chromium; `--allow-loopback-in-peer-connection` does not help | **task K2** |
| Presenter D1 | tamponade arrest not reversible by drainage | physiology | appendix: FU-12 / physiology backlog (FU-8 Part B merged (41678d0b) without it) |
| Presenter D2 | Explore RAP 35 vs monitor CVP 17 (compensated tamponade) | a model/monitor mapping question | appendix: FU-12 / physiology backlog (check before any change) |
| Presenter D3 | the Ventilator view takes the speed only when first opened | reproduced (vent.ts posts the scale on load only) | **task H1** |
| Presenter D4 | "Alarms off" = Saadat factory setting | by design | **recorded**; wording **task H3** / **Q4** |
| Presenter D5 | Explore baseline set on first visit after 1 min | reproduced (explore.ts:89 inside `draw`) | **task H2** |
| FU-11 list | restore timeline | see F03–F05, F09 | **task D1–E4** |
| FU-11 list | BroadcastChannel pairing after a long view walk on WebKit (CI only) | not reproducible locally (Stage 9: not even at ×6 CPU throttling); mitigations on main (re-hello every 2 s, Validate unloads its frames) | **declined** (no reproduction to fix); Gate C records the walked-host probe's result on the PR's CI runs |
| FU-11 list | renderer first-samples pleth line ("pleth glitch on view switch", Stage 9 polish 4) | reproduced: a rectangle on the pleth lane 3 s after `?scenario=showcase-haemorrhage` (WebKit screenshot); cause: auto-scale on the flat first 0.4 s | **task E5** |
| FU-11 list | a busy Ventilator view starves a remote's first state (CI WebKit) | CI-only timing; the test pairs on a fresh host with 20 s | appendix: 8b (a busy-Ventilator-view soak step); G1 adds traffic only while a viewer exists and only on BroadcastChannel |
| FU-11 list | the 10-min VF CPR rig needs ventilation | a physiology test rig | appendix: FU-12 / physiology backlog (FU-8 Part B merged without it) |
| Stage 9 polish 5 | Remote cold-start wait | fixed: 4e6b93ba (Stage 9; "Connected" on the first 1 Hz state; R50 M1 — 2bb00d3 is the gate-note commit) | **fixed** |
| CI | six slow groups at 37–39 min of their limits (after FU-7) | CI amendment 6 (seven groups re-packed to ≈ 33 min) is on main via FU-10's gate (662f8a1b) | **task K4** verifies the groups (local check; Gate C measures each on CI, none > 35 min) — R50 F9 |
| CI | truth-event wall-clock 1 ms bound flakes under load | present (one 200-call batch) | **task K3** |
| CI | ET-19 diabetic arm times out under load | measured 15.2 s alone in the fast set (R50 F9; FU-7 merged) | **task K4** (joins SLOW → slow-b) |
| CI | ventilator `ports.test` times out under load | present (5 s default, a real engine) | **task K3** |
| CI | PR #34 build: `actions.test.ts` preset EtCO2 5 s timeout | fixed: 93d9e4ae (PR #35, 30 s) | **fixed** |
| Housekeeping | ≈ 60 stale worktrees under `scratch/` | belong to other agents | **handed** to the orchestrator (FU-11 removes only its own worktrees; the gate notes list `git worktree list` read-only) |

### 3b. Raised after the plan was written (R50 review, owner rulings, the first showcase of 6 Oct)

| Source | Item | Verified | Decision |
|---|---|---|---|
| R50 F1 (Critical) | The Ventilator link keeps its offset across a bookmark restore | reproduced on cdf95a2c and 48864439: CO2 0, SpO2 88 vs 94 after "Return here" with the Ventilator view driving | **task E3b** (E4 depends on it) |
| R50 F10 | Haemorrhage pulse loss 10:08 vs 10:03 after the Ventilator view was opened | reproduced (probe: NO PULSE 641 vs 647 s); cause: the cockpit kept running and re-attached to every new monitor | **task H6** |
| R50 F10 / F9 | CI amendment 6 (a seventh slow group) | on main via FU-10 (662f8a1b) | **task K4** (verify; ET-19 into SLOW) |
| R50 Minor M1–M16 | see "Review fixes" | — | tasks A3, B1, C1, F3, H2, H3, I2, I3, J3, J6, K3; D-4; setup tasks |
| Owner ruling Q3 | Same monitor style on the learner screen; sound per window | — | **task G2** |
| First showcase (Ali, live) | Sound cannot be turned off again | reproduced (main.ts only enables) | **task H4** |
| First showcase (measured) | The Ventilator view delivers far less than the internal ventilator (VTE 160 vs 403, severe bronchospasm) | diagnosed on 48864439: same lungs, different inspiratory flow (60 L/min + pause vs VT/Ti at I:E 1:2) | **task H5** |
| Coordinator 2026-10-06 | A later plan adds a QR-paired mobile learner monitor on top of G2 | — | **G0/G2**: the wire contract is written at the top of `follower.ts` |

### 4. The audit's 21 regression tests: where each is installed and which task turns it green

The audit's five area files and fixture are installed unchanged into `apps/demo/e2e/`, split per task so each test
arrives with the task that fixes it (red first); three edits only, for the repo's stricter tsconfig (`override` on two
wrapped AudioContext members; `spawn`/`once` imported statically). They run under the repo's own
`playwright.config.ts` (both projects; the relay tests are Node child-process tests and run under both, as the audit
delivered them). 21 tests × 2 projects = 42 instances.

| Audit test | Installed as | Task | Red on f29951b | Green on the prototype |
|---|---|---|---|---|
| snapshot fidelity: json-lvad | `audit-snapshot.e2e.ts` | D1 | `lvad.pi` 15.52 vs 12.12 | equal |
| snapshot fidelity: pending-group | `audit-snapshot.e2e.ts` | D1 | ack tick 350 vs 250 | equal |
| rewind resets trend timeline and waveform: off / auto | `audit-rewind.e2e.ts` | E2 (with E1) | waveform frozen; trend 5 > 2 | pass |
| worker failure settles command / snapshot / restore / capture12 / destroy | `audit-worker.e2e.ts` | C1 | `pending` | `rejected` (silent cases ≈ 3–3.5 s) |
| viewer and controller adopt the restored timeline | `audit-timeline.e2e.ts` | E3 | viewer 4.9, controller 5 | 1.0 / 1.0 |
| remote closes transports it creates on rejoin and destroy | `audit-remote.e2e.ts` | F1 | open, open | closed, closed |
| BroadcastChannel rejects wrong-session and oversized structured commands | `audit-session-boundary.e2e.ts` | A3 (with A1) | applied 3 | 1 |
| controller marks host offline after relay peer notice | `audit-presence.e2e.ts` | F2 | true | false |
| cancel active tone at audio time 0.25 / 2.5 | `audit-audio-cancel.e2e.ts` | B1 | RMS 0.175 | < 1e-4 |
| destroy while native audio unlock is pending closes the late context | `audit-audio-unlock.e2e.ts` | B3 | `running` | `closed` |
| disarm ends ready oscillator (off / auto) | `audit-audio-disarm.e2e.ts` | B2 (with B1) | not ended | ended |
| relay survives signal-null / oversized / deep-envelope | `audit-relay.e2e.ts` | A2 (with A1) | relay exit 1 | relay lives, next frame served |

---
## Decisions (made while prototyping; the executors do not revisit them)

- **D-1 — ONE timeline mechanism.** The hotfix's `timeline` wire event is extended, not duplicated: `cause?: 'restart'
  | 'restore'` (absent = restart, the hotfix's meaning; older peers keep working). `HostSession.newTimeline(cause)` is
  the only place that starts one; a restore calls it after the target restored (both restore paths: the scenario
  driver's hook and the plain bookmark). Presentation owners reset FROM THE RESTORE THEY PERFORM (renderer:
  `MonitorCore.restore`, `mount.restore`) or FROM THE EVENT (controllers, viewers, the app's Link) — never by inferring
  a reset from a later sample (the audit's warning).
- **D-2 — what a restore keeps.** Restart: ends the scenario run, the scenario stickies, the old engine's ECG lead and
  filter stickies, stage groups, set targets, the Link's onsets and acute events. Restore: keeps the scenario (the
  driver restored its runner; it publishes its state before the `timeline` goes out) and the acute events (the engine
  does not report them; the bookmark's engine state holds them); ends stage groups, set targets and onsets in
  progress. The renderer's event log is NOT rewound (a debrief record of what was done, rewinds included); the
  clinical log (Link) logs "Returned to bookmark".
- **D-3 — JSON-safe snapshots by encoding, not by changing the model.** Eight rigs probed: six fields hold NaN or
  ±Infinity (LVAD qMin/qMax, abp/pap detector `prev`, IABP `av.off`, `spont.paco2Set`), five hold −0, several keys hold
  `undefined`. Changing each sentinel would touch five model modules owned by other plans and invite the next one; the
  codec handles all, present and future, and a test proves exact JSON continuation on three rigs. `structuredClone` is
  still used inside the engine's speculation (no cost change per tick); the codec runs only in `snapshot()`/`restore()`.
- **D-4 — the snapshot schema string stays `pme-snapshot/1`.** The state is opaque outside the engine; `restore`
  decodes tagged and raw forms alike. CORRECTED (R50 M2): nothing guards a CROSS-BUILD restore today — the engine
  version check compares `packages/engine-core/src/version.ts`, the constant `'0.0.0'` in every build, so the
  follower's "another version" status cannot fire either. No bookmark is persisted anywhere (a snapshot lives in one
  page's memory), so v1.0 meets no old snapshot; a build-unique engine version (package version + build hash) is
  handed to 8b Task 5 (appendix), and from then on the existing check bites.
- **D-5 — wire budgets: receive enforces, send does not throw.** `parseWireMessage` (every receiving transport and the
  relay) applies depth 32 / 50 000 values / 256 KB UTF-8 to strings and objects alike; `assertWireSafe` (send) keeps the
  sample guard only, so a large catch-up batch cannot throw inside `HostSession.flush`; the host splits batches into
  messages of ≤ 128 KB encoded AND ≤ 200 events instead (R50 F2: the app's 1 Hz truth events are up to ≈ 60 KB).
- **D-6 — worker failure detection.** Terminal: `destroy()`, a worker `error` after ready (its rAF loop does not survive
  an uncaught error), and silence ≥ 3 s with requests waiting while visible and not within 30 s of a hidden-tab
  catch-up. Per-request: a worker-side throw answers its own `reqId`; a `messageerror` rejects the waiting requests.
  No per-request timeout (it would report a failure for a command the worker later applies). A dead worker is not
  replaced by a main-thread fallback mid-session (a patient restart creates a new monitor) — so the failure is SAID:
  a `pme-monitor-failed` event and the toast "The monitor stopped — Restart the patient" (R50 M15).
- **D-7 — the second screen is a VIEWER, same browser only, on its own branch.** Options weighed: (a) a second full
  session (today: a different patient) — rejected; (b) streaming samples — forbidden over the wire (brief §3.7);
  (c) the Stage 6a `ViewerSync` on the session's BroadcastChannel, a main-thread viewer monitor in a `noopener` window
  — chosen and prototyped. DECLARED DEVIATION (R50 F3, orchestrator ruling): the Ventilator view's applied frames
  (samples) ARE mirrored, but only to same-browser BroadcastChannel peers; the relay drops them; settings-mirroring
  was measured inexact (G1). The follower wears the instructor's style and manages its own sound (owner ruling Q3);
  a reload of the instructor keeps the code; silence of the host is reported (R50 F5). Network learner screens stay
  v1.1; a later plan adds a QR-paired mobile monitor on G2's documented contract. Branch `fu-11-d` (R50 F11).
- **D-8 — F13 is refused, not implemented.** No modifier has a ramp consumer and none is reachable from the app
  (Stage 9); implementing ramps would add model behaviour (excluded). A ramp with a nonzero delay or duration is
  refused with a reason (RULED, Q6: refuse in v1.0; timed onsets on the v1.1 wish list).
- **D-9 — F10 is a manual release gate.** CI runners share cores (the review: no flaky p99 assertions in contended
  suites); `perf:ticks --budget-ms` fails over budget and 8b's checklist runs it.
- **D-10 — test infrastructure, minimal.** Evidence screenshots only with `PME_SHOTS=1` (the showcase files'
  convention, now everywhere); the macOS loopback-WebRTC e2e skip with a reason and an override; load-sensitive
  timing tests keep their bounds (best-of batches — a disclosed relaxation of the statistic, R50 M16) or get the 30 s
  budget of engine-driving tests. CI amendment 6 (seven slow groups) is on main via FU-10; K4 moves ET-19 into SLOW
  and VERIFIES the groups; no workflow edit.
- **D-11 — F24/F25 developer pages declined.** They are Developer-view build-stage pages; 8b reviews that list
  (retire or fix). The clinical app's restart keeps the pause (verified by reading `AppSession.mountWith`).
- **D-12 — branches, not one long branch.** Four executors (a, b, c in parallel; d after b — it is built on b). The
  shared files are edited in disjoint hunks ("Parts, files and merge order" lists them). Merge order a, c, b, d;
  Gate B runs the five-case rehearsal on a+b+c, Gate D again with the learner monitor in.
- **D-13 — every consumer of engine time, and how it resets (R50 F1: re-checked by grep of `simNow|simT|renderT|
  lastT|anchor|timeInState|enteredT|baseT|latestS` over apps/demo, renderer, controller, audio and ventilator).**

  | Consumer (file) | Holds | On a bookmark RESTORE | On a NEW patient (restart, scenario load) |
  |---|---|---|---|
  | Engine (`engine.ts`) | tick, queue, stage groups, rings | restored from the snapshot (D1); rings cleared; emits the restore marker `toneCancel {after}` | a new engine |
  | Renderer lanes, overlays, auto-gain/range (`monitor-core.ts`, `sweep-lane.ts`) | lastIndex, sweep position, scales | `MonitorCore.restore` relays out every lane (E2) | a new monitor |
  | Trends (`TrendStore`) | 8 h of seconds | `rewind(t)` (E1, E2) | new store |
  | Tiles and alarm header (`device-ui.ts`) | last values, NIBP, alarm bar | `DeviceUI.reset(t)` (E2) | new UI |
  | Mount (`mount.ts`) | sim-clock anchor, NIBP/PI memory, last alarm status, CO2 lane | `afterRestore` (E2) | new mount |
  | Audio (`scheduler.ts`, `alarm-sounder.ts`, bridge) | queued and sounding tones, silence | the restore marker cancels tones after t (B1; a forward restore keeps an older sounding tone: known limit, R50 M12); the bridge re-reads the next status | new sounder |
  | Event log (`EventLog`) | what was done | NOT rewound (a debrief record, D-2) | kept |
  | HostSession (`host-session.ts`) | stage groups, set targets, stickies | `newTimeline('restore')`: groups and targets end, scenario kept (E3) | `newTimeline('restart')`: + scenario and ECG stickies |
  | ControllerSession, panel, session bar, Remote (`controller-session.ts`, `sessionbar.ts`, `panel/*`, `remote-app.ts`) | simT, scenario view | the `timeline` event: clock back, scenario kept (E3) | clock back, scenario ended |
  | Scenario driver/runner, view (`driver.ts`, `runner.ts`, `view.ts` enteredT) | state, time in state | the driver restores the runner from the bookmark and publishes its state before the timeline | reset |
  | ViewerSync (`viewer-sync.ts`) | anchor, host rate/pause | timeline → fresh snapshot; a new host hello → anchor, rate and pause reset (E3, R50 F5) | same |
  | App Link (`link.ts`), vitals ramps (`panel/vitals.ts`), scenario countdowns (`panel/scenario.ts`) | onsets, ramps, acute events | onsets/ramps end; acute events kept (E4) | all end |
  | Ventilator link, monitor side (`port.ts`) | tick offset, engine tick, clock | NEW: the restore marker starts a new generation (E3b, R50 F1) | the link re-attaches to the new monitor |
  | Cockpit (`vent-driver.ts`) | its own sim clock | bounded by the link's clock (`allowed`), so it follows E3b | NEW: unloaded, a fresh cockpit on the next visit (H6, R50 F10) |
  | Explore (`explore.ts`, console model) | histories, baseline | NEW: histories restart; a baseline after t is dropped (H2, R50 M14) | `model.clear()` |
  | Learner monitor (`follower.ts`) | via ViewerSync | as ViewerSync | as ViewerSync |
  | Bookmark labels (`commands.ts`), Stage V link page (`vent/link-page.ts`, developer page) | read `link.simT` / own remount | read only / not the app | — |
- **D-14 — alarm silence by priority (owner ruling Q1).** One rule in both layers (engine manager and audio sounder):
  the silence remembers the highest priority active when it began; a new alarm ABOVE it ends the silence on every
  profile; `cancelOnNewAlarm` profiles keep "any new alarm". Pause is unchanged (owner question Q7).
- **D-15 — sound per window (owner ruling Q3).** The monitor owns its sound on/off (`disableSound`/`enableSound`, master
  gain; H4) and, when mounted with `audioSilence: 'window'` (the learner monitor), its own silence; no sound state
  crosses a channel; the alarm conditions and visual state stay the shared patient's. Pressing Silence on the
  instructor's monitor does not quiet the learner window, and vice versa.
- **D-16 — the Ventilator view's volume (H5).** Fixed in the app's linked cockpit (its VC flow follows the monitor
  ventilator's VT/Ti until the instructor sets Flow or Pause), not in the ventilator package's presets (the
  stand-alone ventilator and its fidelity tests stay as they are).

## Prototype results (before → after; first pass f29951b → `scratch/wt-fu-11-proto`; fixer and rebase: 48864439 → `scratch/wt-fu-11-proto2`; both engines where a browser is involved)

| Check | Before | After |
|---|---|---|
| The audit's 21 regressions (42 instances) | 42 red | 42 green |
| JSON restore, LVAD rig: first PI; truth `dropped`; `paco2Set` | 15.52 vs 12.12; 7 vs 8; null vs NaN | identical event streams for 10 s on default, LVAD and IABP rigs |
| Pending group after restore (fresh engine; same engine to an earlier snapshot) | tick 350 vs 250; 100 vs 2 | 250; 2 |
| Viewer / controller after a restore 5 s → 1 s (audit-timeline) | 4.9 / 5 | ≈ 1.0 / 1.0 |
| Trend latest after a restore; waveform after a restore | 5 (future kept); frozen until the old high-water time | ≤ floor(t); sweeping within a frame |
| Ventilator view after "Return here" (bronchospasm ×4, E3b) | CO2 0, SpO2 88 vs 94 (the cockpit stops) | SpO2/CO2 within 3/4 of the first run |
| A case run after the Ventilator view was opened (haemorrhage NO PULSE, H6) | 647 s vs 641 s fresh | 641 s vs 640 s |
| Worker request after native terminate / destroy; a dead monitor | pending for good; silent | rejected at ≈ 3.0–4.3 s / at once; toast "The monitor stopped — Restart the patient" |
| Audio: cancel at 0.25 / 2.5 s (RMS); disarm; late unlock; restore before a ready tone | 0.175; never ends; `running`; keeps sounding | < 1e-4; ended; `closed`; stopped |
| Silence (zoll-, ge-, lifepak-like) then a new higher-priority alarm (B4) | stays silenced 90 s | silence ends at once; same/lower priority still muted |
| Relay: `null` signal, 262 145-byte frame, 12 000-deep hello; a mirror batch | process exits 1; forwarded | survives; dropped |
| BC wrong-session + over-budget command; a viewer's command; a minute of 1 Hz truth in one batch | applied 3; applied; — | applied 1; refused; 60/60 delivered in ≤ 128 KB messages |
| Remote two joins + destroy; relay host-offline notice | open, open; hostOnline true | closed, closed; false |
| Pause pressed with a slow host (1.5 s) | label Resume → Pause → Resume | Resume throughout |
| F11 malformed commands; F12; F13; F15; F16; F17 on a real MODELED host | accepted/crash; 400; at once; Pmax lost; stays; modeled | refused; 80; refused; 25 kept; moves; manual |
| F08 refused first link frame; F02; F22; F21; F23; `readSamples(100.5)` | 0 clock msgs; green; 40 peaks; measurable; corrupt bytes; NaN | clock; red; 0; not measurable; refetched; = index 100 |
| Pleth auto-scale span 0.8 s after a start | 0.125 | > 0.5 |
| Follower, induction ×4 (noopener): status, drift, tiles; restore, restart; instructor reload; instructor closed; skin change | — | synced < 2 s, 0 ms, equal within 10 s; resync 1 / 2; same code, synced, equal; "not answering" ≤ 5 s; follows < 1 s |
| Follower with the Ventilator view driving | 9 resyncs per 10 s | 0 resyncs |
| Sound: on → off → on (H4); learner "Silence here" | no off | toggles; the instructor's alarm state untouched |
| Ventilator view, severe bronchospasm, VCV 12 × 500, Pmax 35 (H5, cockpit VTE vs monitor VT) | 204 vs 424 | 426 vs 424 |
| Ventilator view speed; Explore baseline at 90 s and after a restore to 20 s | scale 1; 01:30; kept | 4; 01:00; dropped, re-taken at 01:0x |
| Top bar, saadat-like fresh load | "Alarms off" | "Limit alarms off" + "Still alarming: Asystole, Ventricular fibrillation or tachycardia, Ventricular tachycardia, Apnoea." |
| `stage6a-screens` then `git status docs/gates`; stage6a "over rtc" on macOS | 3 PNGs modified; failed | clean; skipped |
| Package suites on the prototype (48864439 + FU-11) | record on your base | engine fast 322 files / 1 409 passed (1 skipped); controller 250; renderer 94; audio 65; skins 191; demo 202; validation 119 (+11 skipped); ventilator 103 — all passed |
| Typecheck (`pnpm -r typecheck`) | clean | clean |
| Slow groups (local `vitest list`) | ET-19 in the fast set | slow 119 files in 7 disjoint groups (a 17, b 14, c 21, d 34, e 10, f 12, g 11), COVER-OK; ET-19 in slow-b; fast 322 |
| Five-case rehearsal | kit numbers | 10/10 on cdf95a2c's prototype (induction MAP 94.8 → 71.7, apnoea 56.1 s; anaphylaxis systolic > 110 in 11.3–11.4 s; tamponade MAP < 40 at 112–114 s; haemorrhage pulse lost 10 min, ROSC 4.3 min). NOT re-run on 48864439 after H5 (the shared machine's budget): Gate B runs it same-day against main (R50 F7) |

---
## Parts, files and merge order

Four executors, four branches (R50 F11). `fu-11-a`, `fu-11-b` and `fu-11-c` start from `origin/main` and run in
parallel (local cap permitting); `fu-11-d` starts from `fu-11-b` (or from main once b has merged) because the learner
monitor uses E2's restore, E3's timeline and the app files Part H edits. Each branch is checked on its own
(`check-blocks.py --branch a|b|c`, `--branch d` = b's blocks first, then d's) and all four together (`--branch all`:
the blocks apply in plan order with 0 problems — they edit disjoint hunks).

| Branch / executor | Parts (tasks) | What it does |
|---|---|---|
| `fu-11-a` boundary and lifecycle | A (A0–A3), B (B1–B4), C (C1–C2), F (F1–F3) | relay and wire budgets; the host's session boundary, size-split batches and viewer refusal; audio ownership; alarm silence by priority (Q1); worker lifecycle and the "monitor stopped" toast; Remote transports, presence, the host's speed and pause |
| `fu-11-b` timeline and showcase defects | D (D0–D2), E (E1–E5, E3b), H (H1–H6) | JSON-safe snapshots and pending groups; command ownership and `stop()`; ONE timeline (trends, lanes, tiles, controllers, viewers, the ventilator link); "Return here"; the pleth scale; the Ventilator view's speed, new-case unload and volume; Explore's baseline; "Limit alarms off"; Sound off |
| `fu-11-c` commands, validation, tests | I (I0–I4), J (J1–J6), K (K1–K4) | engine command boundary; modifier ramps refused; scenario alternatives and MANUAL; the link's refused probe; validation honesty; `readSamples`; gate screenshots, macOS WebRTC skip, load-tolerant tests, ET-19 into SLOW |
| `fu-11-d` learner monitor (on b) | G (G0–G2) | link frames mirrored to same-browser viewers only; the second-screen learner monitor (noopener, reload-proof, liveness, the instructor's style, sound per window) |

**Files more than one branch edits (disjoint hunks; checked by the four-way merge in the self-check):**
`apps/demo/src/app/main.ts` (a: the failure toast · b: Limit-alarms label, Sound toggle · d: follower route, session
code, style, learner URLs), `controller/src/protocol.ts`, `controller-session.ts`, `host-session.ts` (a: boundary,
budgets, viewer refusal, apply wrapper · b: timeline · d: mirror), `renderer/src/mount.ts` (a: `destroyed` · b:
restore, Sound off · d: viewer clock, window silence), `worker-host.ts` (a: request table, failure event · b: restore
· d: `Host.core`), `relay/server.ts` (a · d), `engine.worker.ts` (a · b), `engine.ts` and `types.ts` (b · c),
`defib.ts` (a · c), `port.ts` (b: restore marker · c: refused probe), `app.css`, `session.ts`, `shell.ts`,
`views/vent.ts` (b · d), `apps/demo/e2e/audit-fixture.ts` (created by a AND b with identical content).

**Merge order and dependencies.** `fu-11-a` and `fu-11-c` first (any order), then `fu-11-b` (its gate merges main:
a and c in, and runs the five-case rehearsal on the integrated tree), then `fu-11-d` LAST (its gate repeats the
rehearsal with the learner monitor open). Within a branch the tasks run in plan order (B2 needs B1; C2 needs C1; E2
needs E1; E4 needs D1–E3 and E3b; H6 needs H1; G2 needs G1, E2, E3, H4). Cross-branch, only d needs b.

**Orchestrator merge note.** No textual conflicts expected (the prototype's four-way merge is clean). The plan file is
committed in branch b only (R50 M6), so a, c and d add no copy; d inherits b's.

## Owner questions — all ruled except one new

- **Q1 (AL01) — RULED:** a new higher-priority alarm breaks a lower-priority silence on every profile → task B4
  (evidence checked per vendor; none documents the opposite).
- **Q2 (HI03, F07) — RULED:** accepted for v1 (trusted network), stated in the release notes; the fix goes with the
  v1.1 relay → appendix (8b release notes).
- **Q3 (second screen) — RULED:** the same monitor style as the instructor's, following changes; alarm sound managed
  per window → task G2 (and H4 for the instructor's window). Network screens stay v1.1; a later plan adds a QR-paired
  mobile monitor on G2's contract.
- **Q4 (wording) — RULED:** ours, from the skin's data, no hard-coded names → task H3.
- **Q5 (kit K4, duplicated state boxes) — with the orchestrator:** not reproduced; the orchestrator asks the kit agent.
- **Q6 (F13) — RULED:** refuse timed modifier onsets in v1.0 with a reason; the feature goes to the v1.1 wish list.
- **Q7 (new, non-blocking) — Alarm PAUSE vs a new higher-priority alarm.** B4 implements the ruling for SILENCE
  (audio paused). Alarm PAUSE (IEC "alarm paused": no alarm is raised, every skin, research/13 Amendment 2 note)
  still holds through a new higher-priority condition. Keep (as today), or let a higher priority end a pause too?
  Nothing in FU-11 waits on it.

---
## Tasks

Each task: the failing tests first (created verbatim), run red (the reasons measured on the base the task was written
or re-run on: f29951b, cdf95a2c or 48864439), the implementation as find/replace blocks (cut from the prototype on
48864439; each matches exactly once at its place), run green, typecheck, commit and push. Ticks go in branch b's copy
of this plan (R50 M6) or the gate notes.

## Part A — Relay and message boundary (BA10, BA11, F01) (branch `fu-11-a`)

### Task A0: Branch, install, block check, the audit fixture and the before-numbers

**Branch** `fu-11-a` · **Findings** — · **Files** Create `apps/demo/e2e/audit-fixture.ts`

**Why:** Executor A owns Parts A, B, C and F (branch `fu-11-a`). This task makes the worktree, checks every Part A/B/C/F find
block against the base, installs the browser audit's shared Playwright fixture (unchanged except a two-line header) and
records the before-numbers the gate note compares with.

- [ ] **Step 1.** **Worktree and install.**
```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-fu-11-a -b fu-11-a origin/main
cd ../scratch/wt-fu-11-a && npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [ ] **Step 2.** **Block check** (the base must be `48864439` or a later main where every block still matches once):
```bash
python3 ../plans-backup/fu-11-plan-tools/check-blocks.py --branch a ../plans-backup/fu-11-hardening.md .
```
Expected: `branch a: 51 find/replace blocks (0 chained), 19 creates; problems: 0` (if main moved and a block
reports 0 or 2 matches, find the same statement by its quoted FU-11 neighbour, re-anchor it, never re-type an unchanged
line). The plan is NOT committed on this branch (R50 M6: three copies with different ticks made every later PR
conflict); tick progress in the gate note.

- [ ] **Step 3.** **Before-numbers** (into `<scratchpad>/fu-11-a/before.txt`, R50 M3: RECORD them on your base — the numbers quoted
in this plan are the prototype's on `48864439`, for orientation, not for comparison): `npx -y pnpm@9.15.9 --filter
@pme/controller test`, `--filter @pme/audio test`, `--filter @pme/renderer test`, `--filter @pme/demo test`.

- [ ] **Step 4.** Create the fixture (below), then commit:
```bash
git add apps/demo/e2e/audit-fixture.ts
git commit -m "test(demo): the browser audit's Playwright fixture (FU-11 A0)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin fu-11-a
```

Create `apps/demo/e2e/audit-fixture.ts`:

```ts
// FU-11: the external browser audit's shared fixture (research/17; installed unchanged from audit-fixture.ts): a Vite
// server on apps/demo with configFile false and a one-element page; the tests import the packages' sources by /@fs.
import {test as base,expect} from '@playwright/test';
import {createServer} from 'vite';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import net from 'node:net';
export {expect};
export const test=base.extend<{}, {audit:{url:string,root:string}}>({audit:[async({},use,info)=>{
 const root=process.env.PME_AUDIT_REPO??resolve(import.meta.dirname,'../../..');
 const probe=net.createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const port=(probe.address() as net.AddressInfo).port;await new Promise<void>(r=>probe.close(()=>r()));
 const vite=await createServer({configFile:false,root:resolve(root,'apps/demo'),cacheDir:resolve(process.env.PME_AUDIT_OUTPUT??tmpdir(),`pme-regression-vite-${process.pid}-${info.workerIndex}`),publicDir:false,optimizeDeps:{noDiscovery:true,include:[]},server:{port,strictPort:true,host:'127.0.0.1',fs:{allow:[root]}},logLevel:'error',plugins:[{name:'audit-page',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/__regression.html'){res.setHeader('Content-Type','text/html');res.end('<button id="sound">Sound</button><div id="monitor" style="width:1080px;height:520px"></div>')}else next()})}}]});
 await vite.listen();try{await use({url:`http://127.0.0.1:${port}/__regression.html`,root})}finally{await vite.close()}
},{scope:'worker'}]});
```

### Task A1: One bounded, iterative pass over every wire message (F01, BA10, BA11)

**Branch** `fu-11-a` · **Findings** F01, BA10 (deep envelope), BA11 (over-budget structured input) · **Files** Modify `packages/controller/src/guard.ts`; Create `packages/controller/test/fu11-wire-budget.test.ts`

**Why:** `findSampleLeak` walked messages RECURSIVELY with no depth budget: a 72 KB hello with 12 000 nested objects threw
`RangeError: Maximum call stack size exceeded` inside the relay's message handler and the relay process exited
(reproduced on `f29951b`: `audit-relay` deep-envelope, stderr guard.ts:26). The size limit applied only to string
input: a 262 145-character command object on a BroadcastChannel was accepted. One iterative walk now enforces the
sample rules AND (on receipt) depth ≤ 32, ≤ 50 000 values and ≤ 256 KB of UTF-8 — a real snapshot is 69 KB, 4 979
values, 9 deep (measured). `assertWireSafe` on send keeps the sample rules only (a big catch-up batch must never throw
in a flush; Task A3 splits batches instead).

**Interfaces:** Produces: `WIRE_LIMITS.maxDepth = 32`, `WIRE_LIMITS.maxNodes = 50_000`; `wireBudgetError(m: WireMessage): string | null`
(exported); `parseWireMessage` applies it to string AND object input; `findSampleLeak` unchanged in signature.

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/fu11-wire-budget.test.ts`:

```ts
// FU-11 Task A1 (external review F01, browser audit BA10/BA11): one bounded, iterative pass decides what the wire takes —
// the same budget for a JSON string and a structured-clone object; deep or huge input is refused, never a stack overflow.
import { describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { findSampleLeak, parseWireMessage, WIRE_LIMITS, wireBudgetError } from '../src/guard.ts';
import { createStamper, type WireMessage } from '../src/protocol.ts';

const stamp = createStamper('ABC234', 'peer-1');
const hello = stamp({ kind: 'hello', role: 'controller' });
const nested = (depth: number) => {
  const root: Record<string, unknown> = {};
  let o = root;
  for (let i = 0; i < depth; i++) o = (o.x = {}) as Record<string, unknown>;
  return root;
};

describe('FU-11 A1: wire budgets', () => {
  it('12 000 nested objects in a 72 KB hello: refused as a string and as an object, without throwing', () => {
    const text = `{"v":1,"session":"ABC234","from":"p","seq":1,"sentAt":0,"kind":"hello","role":"controller","extra":${'{"x":'.repeat(12000)}0${'}'.repeat(12000)}}`;
    expect(text.length).toBeLessThan(WIRE_LIMITS.maxBytes);
    expect(() => parseWireMessage(text)).not.toThrow();
    expect(parseWireMessage(text)).toBeNull();
    expect(parseWireMessage({ ...hello, extra: nested(12000) })).toBeNull();
    expect(() => findSampleLeak({ ...hello, extra: nested(12000) } as unknown as WireMessage)).not.toThrow();
  });
  it('an object over the byte budget is refused like the same string (multibyte characters counted as bytes)', () => {
    const cmd = (extra: string) => stamp({ kind: 'command', body: { id: 'c', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80, extra } as never });
    expect(parseWireMessage(cmd('x'.repeat(WIRE_LIMITS.maxBytes + 1)))).toBeNull();
    expect(parseWireMessage(cmd('é'.repeat(Math.ceil(WIRE_LIMITS.maxBytes / 2) + 1)))).toBeNull(); // 2 bytes each in UTF-8
    expect(wireBudgetError(cmd('x'.repeat(1000)))).toBeNull();
  });
  it('real traffic passes: a real engine snapshot with its tagged values, events and commands', () => {
    const e = createEngine({ seed: 3, mode: 'modeled' });
    e.advanceTo(30);
    expect(parseWireMessage(stamp({ kind: 'snapshot', body: e.snapshot() }))).not.toBeNull();
    expect(parseWireMessage(JSON.stringify(stamp({ kind: 'snapshot', body: e.snapshot() })))).not.toBeNull();
    expect(parseWireMessage(stamp({ kind: 'event', body: [{ type: 'measurement', t: 1, values: {} } as never] }))).not.toBeNull();
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/fu11-wire-budget.test.ts`  
Expected: 2 failed, 1 passed — the deep hello throws `RangeError: Maximum call stack size exceeded`; the 262 145-character object is accepted

- [ ] **Step 3 — implement.**

In `packages/controller/src/guard.ts`, find:

```ts
} as const;

/** Keys that only a waveform leak would use. */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['samples', 'sampleData', 'waveform', 'buffer']);

export class WireSafetyError extends Error {
  override readonly name = 'WireSafetyError';
}

/** Returns a description of the first sample-like payload in `m`, or null when the message is clean. */
export function findSampleLeak(m: WireMessage): string | null {
  const limit = m.kind === 'snapshot' ? WIRE_LIMITS.snapshotNumericArray : WIRE_LIMITS.eventNumericArray;
  const seen = new Set<object>();
  const walk = (v: unknown, path: string): string | null => {
    if (v === null || typeof v !== 'object') return null;
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return `${path}: binary data (${v.constructor.name})`;
    if (seen.has(v)) return null;
    seen.add(v);
    if (Array.isArray(v)) {
      if (v.length > limit && v.every((x) => typeof x === 'number')) return `${path}: numeric array of ${v.length} > ${limit}`;
      for (let i = 0; i < v.length; i++) {
        const r = walk(v[i], `${path}[${i}]`);
        if (r) return r;
      }
      return null;
    }
    for (const [k, x] of Object.entries(v)) {
      if (FORBIDDEN_KEYS.has(k)) return `${path}.${k}: forbidden key`;
      const r = walk(x, `${path}.${k}`);
      if (r) return r;
    }
    return null;
  };
  return walk(m, 'message');
```

Replace with:

```ts
  /** FU-11 (F01, BA10): deepest nesting accepted (a real snapshot is 10 deep) [ENG]. */
  maxDepth: 32,
  /** FU-11 (F01, BA11): most values in one message (a real snapshot holds ≈ 5 000) [ENG]. */
  maxNodes: 50_000,
} as const;

/** Keys that only a waveform leak would use. */
export const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['samples', 'sampleData', 'waveform', 'buffer']);

export class WireSafetyError extends Error {
  override readonly name = 'WireSafetyError';
}

/** UTF-8 length of a string, at most 3 bytes per UTF-16 unit (an over-estimate for surrogate pairs; fine for a budget). */
function utf8Bytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
  }
  return n;
}

/**
 * FU-11 (F01, BA10, BA11): one ITERATIVE pass over a message (the recursive walk overflowed the stack on 12 000 nested
 * objects in a 72 KB hello and took the relay down). Returns a reason for the first sample-like payload and, with
 * `budget`, for nesting deeper than maxDepth, more than maxNodes values or more than maxBytes of encoded size — the
 * same limits whether the message arrived as a JSON string or as a structured-clone object.
 */
function inspect(m: unknown, limit: number, budget: boolean): string | null {
  const seen = new Set<object>();
  const stack: Array<[unknown, string, number]> = [[m, 'message', 0]];
  let nodes = 0;
  let bytes = 0;
  const over = () => `more than ${WIRE_LIMITS.maxBytes} bytes`;
  while (stack.length > 0) {
    const [v, path, depth] = stack.pop() as [unknown, string, number];
    if (budget && ++nodes > WIRE_LIMITS.maxNodes) return `more than ${WIRE_LIMITS.maxNodes} values`;
    if (v === null || typeof v !== 'object') {
      if (budget) bytes += typeof v === 'string' ? utf8Bytes(v) + 2 : 8;
      if (bytes > WIRE_LIMITS.maxBytes) return over();
      continue;
    }
    if (depth > WIRE_LIMITS.maxDepth) return `${path}: nested deeper than ${WIRE_LIMITS.maxDepth}`;
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return `${path}: binary data (${v.constructor.name})`;
    if (seen.has(v)) continue;
    seen.add(v);
    if (Array.isArray(v)) {
      if (v.length > limit && v.every((x) => typeof x === 'number')) return `${path}: numeric array of ${v.length} > ${limit}`;
      for (let i = v.length - 1; i >= 0; i--) stack.push([v[i], `${path}[${i}]`, depth + 1]);
      continue;
    }
    const entries = Object.entries(v);
    for (const [k] of entries) if (FORBIDDEN_KEYS.has(k)) return `${path}.${k}: forbidden key`;
    for (let i = entries.length - 1; i >= 0; i--) {
      const [k, x] = entries[i] as [string, unknown];
      if (budget) bytes += utf8Bytes(k) + 4;
      stack.push([x, `${path}.${k}`, depth + 1]);
    }
    if (bytes > WIRE_LIMITS.maxBytes) return over();
  }
  return null;
}

const numericLimit = (m: WireMessage) => (m.kind === 'snapshot' ? WIRE_LIMITS.snapshotNumericArray : WIRE_LIMITS.eventNumericArray);

/** Returns a description of the first sample-like payload in `m`, or null when the message is clean. */
export function findSampleLeak(m: WireMessage): string | null {
  return inspect(m, numericLimit(m), false);
}

/** FU-11 (F01, BA11): the sample guard plus the size, depth and value budgets (every receiving transport applies it). */
export function wireBudgetError(m: WireMessage): string | null {
  return inspect(m, numericLimit(m), true);
```

In `packages/controller/src/guard.ts`, find:

```ts
  return findSampleLeak(msg) ? null : msg;
```

Replace with:

```ts
  return wireBudgetError(msg) ? null : msg;
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/fu11-wire-budget.test.ts test/guard.test.ts`  
Expected: all passed (3 + the existing guard tests)

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/controller/src/guard.ts \
  packages/controller/test/fu11-wire-budget.test.ts
git commit -m "fix(controller): one bounded iterative pass over wire messages; the byte budget applies to objects too (FU-11 A1, F01)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task A2: A malformed peer never ends the relay (F01, BA10)

**Branch** `fu-11-a` · **Findings** F01, BA10 · **Files** Modify `packages/controller/relay/server.ts`; Create `packages/controller/test/relay/fu11-relay-hostile.test.ts`, `apps/demo/e2e/audit-relay.e2e.ts`

**Why:** Reproduced on `f29951b` with the audit's child-process relay (`audit-relay.e2e.ts`, both projects): `null` on
`/signal` → `TypeError: Cannot read properties of null (reading 'to')` (server.ts:208), a 262 145-byte frame →
an unhandled ws `error` event (`RangeError: Max payload size exceeded`), the deep hello → the guard's stack overflow;
the relay exits with code 1 every time and every room on it goes. Fix: a non-object signalling frame is dropped;
every socket has an `error` listener (the ws library closes the offender itself); both message handlers run inside
`contain()` (a throwing frame is counted in `dropped` and logged, the process lives).

**Interfaces:** Consumes A1 (the iterative guard: the deep hello is now refused by `parseWireMessage`, not a throw).

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/relay/fu11-relay-hostile.test.ts`:

```ts
// FU-11 Task A2 (external review F01, browser audit BA10): one malformed peer never takes the relay down — `null` on the
// signalling socket, a frame over the payload cap, a deeply nested envelope; a healthy room keeps working after each.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStamper } from '../../src/protocol.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { waitFor } from '../helpers.ts';

let relay: RelayHandle;
let url: string;
beforeEach(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000 });
  url = `ws://127.0.0.1:${relay.port}`;
});
afterEach(async () => relay.close());

const open = async (path = '/') => {
  const ws = new WebSocket(url + path);
  const got: string[] = [];
  ws.onmessage = (e) => got.push(String(e.data));
  await waitFor(() => ws.readyState === WebSocket.OPEN, 3000, 'socket open');
  return { ws, got };
};
/** A healthy host + controller pair in its own room still exchanges a command and its ack. */
async function healthy(code: string): Promise<void> {
  const h = await open();
  const c = await open();
  const hs = createStamper(code, 'h');
  const cs = createStamper(code, 'c');
  h.ws.send(JSON.stringify(hs({ kind: 'hello', role: 'host' })));
  c.ws.send(JSON.stringify(cs({ kind: 'hello', role: 'controller' })));
  await waitFor(() => c.got.some((m) => m.includes('"peers"')), 3000, 'peers frame');
  c.ws.send(JSON.stringify(cs({ kind: 'command', body: { id: 'k1', issuedBy: 'c', type: 'setTarget', variable: 'hr', value: 80 } as never })));
  await waitFor(() => h.got.some((m) => m.includes('"k1"')), 3000, 'command reached the host');
  h.ws.close();
  c.ws.close();
}

describe('FU-11 A2: hostile relay input', () => {
  it('null, an array and a number on /signal are dropped; the next frame is routed', async () => {
    const r = await open('/signal?session=ABC234&peer=receiver');
    const s = await open('/signal?session=ABC234&peer=sender');
    for (const bad of ['null', '[1,2]', '42', '"x"']) s.ws.send(bad);
    s.ws.send(JSON.stringify({ to: 'receiver', data: 'sentinel' }));
    await waitFor(() => r.got.some((m) => m.includes('sentinel')), 3000, 'sentinel routed');
    await healthy('HQY234');
    expect(relay.stats().dropped).toBeGreaterThanOrEqual(4);
  });
  it('a frame over the payload cap closes that socket only', async () => {
    const bad = await open();
    bad.ws.send('x'.repeat(262_145));
    await waitFor(() => bad.ws.readyState === WebSocket.CLOSED, 3000, 'offender closed');
    await healthy('HRZ234');
  });
  it('a 12 000-deep hello is dropped and the same socket can still say a valid hello', async () => {
    const bad = await open();
    bad.ws.send(`{"v":1,"session":"ABC234","from":"p","seq":1,"sentAt":0,"kind":"hello","role":"controller","extra":${'{"x":'.repeat(12000)}0${'}'.repeat(12000)}}`);
    bad.ws.send(JSON.stringify(createStamper('ABC234', 'p')({ kind: 'hello', role: 'controller' })));
    await waitFor(() => bad.got.some((m) => m.includes('"peers"')), 3000, 'valid hello answered');
    await healthy('HMA234');
  });
});
```

Create `apps/demo/e2e/audit-relay.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA10 (malformed peers cannot end the relay) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-relay.e2e.ts. Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {once} from 'node:events';
async function bounded<T>(p:Promise<T>):Promise<T>{let t:ReturnType<typeof setTimeout>;try{return await Promise.race([p,new Promise<T>((_,reject)=>{t=setTimeout(()=>reject(new Error('relay response deadline')),5000)})])}finally{clearTimeout(t!)}}
for(const kind of ['signal-null','oversized','deep-envelope'])test(`relay survives ${kind}`,async({audit})=>{
 const require=createRequire(audit.root+'/packages/controller/package.json');const WebSocket=require('ws');
 const child=spawn(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {startRelay} from ${JSON.stringify(audit.root+'/packages/controller/relay/server.ts')};const r=await startRelay({host:'127.0.0.1',port:0});process.stdout.write(String(r.port)+'\\n');process.on('SIGTERM',async()=>{await r.close();process.exit(0)});`],{stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr!.on('data',x=>stderr+=x);const sockets:any[]=[];
 const hello={v:1,session:'ABC234',from:'probe',seq:1,sentAt:0,kind:'hello',role:'controller'};
 try{
  const [data]=await bounded(once(child.stdout!,'data'));const url=`ws://127.0.0.1:${String(data).trim()}`;
  const connect=async(path='')=>{const ws=new WebSocket(url+path);sockets.push(ws);ws.on('error',()=>{});await bounded(once(ws,'open'));return ws};
  if(kind==='signal-null'){
   const receiver=await connect('/signal?session=ABC234&peer=receiver'),sender=await connect('/signal?session=ABC234&peer=sender');const response=bounded(once(receiver,'message'));
   sender.send('null');sender.send(JSON.stringify({to:'receiver',data:'sentinel'}));const [body]=await response;expect(JSON.parse(String(body)).data).toBe('sentinel');
  }else if(kind==='oversized'){
   const bad=await connect();const closed=bounded(once(bad,'close'));bad.send('x'.repeat(262145));await closed;
   const probe=await connect();const response=bounded(once(probe,'message'));probe.send(JSON.stringify(hello));await response;
  }else{
   const bad=await connect();const response=bounded(once(bad,'message'));
   bad.send('{"v":1,"session":"ABC234","from":"probe","seq":1,"sentAt":0,"kind":"hello","role":"controller","extra":'+'{"x":'.repeat(12000)+'0'+'}'.repeat(12000)+'}');bad.send(JSON.stringify(hello));await response;
  }
  expect(child.exitCode,stderr).toBeNull();
 }catch(error){throw new Error(String(error)+'\nRelay stderr: '+stderr)}finally{for(const s of sockets)s.terminate();if(child.exitCode===null){child.kill('SIGTERM');await bounded(once(child,'exit')).catch(()=>child.kill('SIGKILL'))}}
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/relay/fu11-relay-hostile.test.ts`  
Expected: 2 failed + "Vitest caught 3 unhandled errors" (RangeError: Max payload size exceeded; TypeError …reading 'to')

Run: `npx playwright test --retries=0 audit-relay`  
Expected: 6 failed: "relay response deadline" / ECONNREFUSED, relay stderr shows the three exceptions

- [ ] **Step 3 — implement.**

In `packages/controller/relay/server.ts`, find:

```ts
  const peersFrame = (room: Room): RelayFrame => ({ relay: 'peers', hostOnline: room.host !== null, peers: room.peers.size });
```

Replace with:

```ts
  const peersFrame = (room: Room): RelayFrame => ({ relay: 'peers', hostOnline: room.host !== null, peers: room.peers.size });
  /** FU-11 (F01, BA10): one peer's frame that throws is that frame's problem, never the process's (logged and dropped). */
  const contain = (fn: () => void) => {
    try {
      fn();
    } catch (err) {
      dropped++;
      log(`frame dropped: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
```

In `packages/controller/relay/server.ts`, find:

```ts
    ws.on('message', (buf, isBinary) => {
```

Replace with:

```ts
    ws.on('message', (buf, isBinary) => contain(() => {
```

In `packages/controller/relay/server.ts`, find:

```ts
      route(room, peer, m, data);
    });
    ws.on('close', () => {
```

Replace with:

```ts
      route(room, peer, m, data);
    }));
    ws.on('close', () => {
```

In `packages/controller/relay/server.ts`, find:

```ts
    ws.on('message', (buf) => {
      let f: { to?: unknown; data?: unknown };
      try {
        f = JSON.parse(buf.toString()) as { to?: unknown; data?: unknown };
      } catch {
        return void dropped++;
      }
      const to = typeof f.to === 'string' ? sroom.get(f.to) : undefined;
      if (!to) return void dropped++;
      raw(to, JSON.stringify({ from: id, data: f.data }));
    });
    ws.on('close', () => {
      if (sroom.get(id) === ws) sroom.delete(id);
      if (sroom.size === 0) signalRooms.delete(code);
    });
  };

  wss.on('connection', (ws, req) => {
```

Replace with:

```ts
    ws.on('message', (buf) => contain(() => {
      let f: unknown;
      try {
        f = JSON.parse(buf.toString());
      } catch {
        return void dropped++;
      }
      // FU-11 (F01, BA10): `null`, an array or a primitive is valid JSON but not a signalling frame (null.to killed the relay)
      if (f === null || typeof f !== 'object' || Array.isArray(f)) return void dropped++;
      const { to: id2, data } = f as { to?: unknown; data?: unknown };
      const to = typeof id2 === 'string' ? sroom.get(id2) : undefined;
      if (!to) return void dropped++;
      raw(to, JSON.stringify({ from: id, data }));
    }));
    ws.on('close', () => {
      if (sroom.get(id) === ws) sroom.delete(id);
      if (sroom.size === 0) signalRooms.delete(code);
    });
  };

  wss.on('connection', (ws, req) => {
    // FU-11 (F01, BA10): a socket error (a frame over maxPayload, a broken frame) closes THAT socket; without a listener
    // the ws library re-threw it as an unhandled 'error' event and the whole relay exited with every room on it
    ws.on('error', (err) => {
      dropped++;
      log(`socket error: ${err.message}`);
    });
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/relay`  
Expected: all passed, no unhandled errors

Run: `npx playwright test --retries=0 audit-relay`  
Expected: 6 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-relay.e2e.ts \
  packages/controller/relay/server.ts \
  packages/controller/test/relay/fu11-relay-hostile.test.ts
git commit -m "fix(relay): a malformed peer closes its own socket, never the relay (FU-11 A2, F01, BA10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task A3: The host takes only its own session, in messages the receivers accept (BA11)

**Branch** `fu-11-a` · **Findings** BA11 (wrong session; a viewer that commands, R50 M13), the batch half of F01, R50 F2 · **Files** Modify `packages/controller/src/session/host-session.ts`; Create `packages/controller/test/session/fu11-host-boundary.test.ts`, `apps/demo/e2e/audit-session-boundary.e2e.ts`

**Why:** HostSession trusted the channel: a structured command stamped `DEF567` on the `pme/ABC234` BroadcastChannel was
applied (audit HI02: applied 3 where 1 is right, both browsers). The host now drops any message whose envelope session
is not its own. Because A1's receive budget now applies to objects, a hidden-tab catch-up batch could exceed 256 KB.
R50 F2: a count limit alone does not keep a message under the budget — the app's 1 Hz `truth` events are up to ≈ 60 KB
each (measured: with a 200-event split only 4 of a minute's 60 truth events got through the receivers' check), so
`flush()` splits by ENCODED SIZE (`MESSAGE_BUDGET_BYTES` = 128 KB, half the receive budget, measured
`JSON.stringify(e).length`) and by count (`EVENTS_PER_MESSAGE` = 200), in order; a single event over the budget goes
alone (the receiver refuses it as before — none of the engine's is). R50 M13: a peer whose last hello said `viewer`
may not command — the relay already refused that on a WebSocket; a BroadcastChannel peer now gets `ack accepted:false
'a viewer cannot command'` too (one trust model per role, whatever the transport; HI03 stays as ruled for the roles a
peer DECLARES).

**Interfaces:** Produces: `EVENTS_PER_MESSAGE`, `MESSAGE_BUDGET_BYTES` (exported from host-session.ts).

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/session/fu11-host-boundary.test.ts`:

```ts
// FU-11 Task A3 (browser audit BA11; R50 F2): the host takes only its own session's messages and splits big event
// batches — by count AND by encoded size — under the receivers' budget.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { EVENTS_PER_MESSAGE, HostSession, MESSAGE_BUDGET_BYTES, type HostTarget } from '../../src/session/host-session.ts';
import { wireBudgetError } from '../../src/guard.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'HBD234';
const target = (e = createEngine({ seed: 3 })): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
let hs: HostSession | null = null;
afterEach(() => hs?.close());

describe('FU-11 A3: the host boundary', () => {
  it('a command stamped with another session is not applied; the valid sentinel after it is', async () => {
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: target(), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const peer = hub.connect();
    const got = collect(peer);
    const foreign = createStamper('DEF567', 'x');
    const ours = createStamper(S, 'x');
    peer.send(foreign({ kind: 'command', body: { id: 'bad', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 130 } as never }));
    peer.send(ours({ kind: 'command', body: { id: 'sentinel', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } as never }));
    await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === 'sentinel'));
    expect(hs.stats.applied).toBe(1);
    expect(got.some((m) => m.kind === 'ack' && m.commandId === 'bad')).toBe(false);
  });
  it('a peer that said hello as a viewer cannot command (as on the relay); one that said controller can (R50 M13)', async () => {
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: target(), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const peer = hub.connect();
    const got = collect(peer);
    const v = createStamper(S, 'viewer-1');
    peer.send(v({ kind: 'hello', role: 'viewer' }));
    peer.send(v({ kind: 'command', body: { id: 'from-viewer', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 130 } as never }));
    await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === 'from-viewer'));
    expect(got.find((m) => m.kind === 'ack' && m.commandId === 'from-viewer')).toMatchObject({ accepted: false, reason: 'a viewer cannot command' });
    peer.send(v({ kind: 'hello', role: 'controller' }));
    peer.send(v({ kind: 'command', body: { id: 'now-controller', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } as never }));
    await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === 'now-controller'));
    expect(got.find((m) => m.kind === 'ack' && m.commandId === 'now-controller')).toMatchObject({ accepted: true });
    expect(hs.stats.applied).toBe(1);
  });
  it(`a batch of 1 000 events goes out as messages of at most ${EVENTS_PER_MESSAGE}, all delivered in order`, async () => {
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: target(), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const got = collect(hub.connect());
    for (let i = 0; i < 1000; i++) hs.publish({ type: 'scenario', t: i, stateId: `s${i}` });
    hs.flush();
    await waitFor(() => got.filter((m) => m.kind === 'event').length >= 5);
    const batches = got.filter((m): m is Extract<WireMessage, { kind: 'event' }> => m.kind === 'event');
    expect(Math.max(...batches.map((b) => b.body.length))).toBeLessThanOrEqual(EVENTS_PER_MESSAGE);
    expect(batches.flatMap((b) => b.body).map((e) => (e as { t: number }).t)).toEqual(Array.from({ length: 1000 }, (_, i) => i));
  });
  it(`a minute of the app's real events (truth at 1 Hz) in one batch goes out in messages of ≤ ${MESSAGE_BUDGET_BYTES / 1024} KB, all accepted`, async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', truthHz: 1, patient: { sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on', nibp: 'on' } } } as never);
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: target(e), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const got = collect(hub.connect());
    e.advanceTo(60); // a hidden-tab catch-up: one batch
    hs.flush();
    await waitFor(() => got.some((m) => m.kind === 'event'));
    await new Promise((r) => setTimeout(r, 50));
    const batches = got.filter((m): m is Extract<WireMessage, { kind: 'event' }> => m.kind === 'event');
    const events = batches.flatMap((b) => b.body);
    expect(events.filter((x) => x.type === 'truth').length).toBe(60);
    for (const b of batches) expect(wireBudgetError(b)).toBeNull();
    expect(Math.max(...batches.map((b) => JSON.stringify(b).length))).toBeLessThanOrEqual(MESSAGE_BUDGET_BYTES + 2048);
  });
});
```

Create `apps/demo/e2e/audit-session-boundary.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA11 (wrong-session and over-budget structured commands) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-controller.e2e.ts (its third test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
test('BroadcastChannel rejects wrong-session and oversized structured commands',async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async root=>{const C=await import('/@fs'+root+'/packages/controller/src/index.ts'),{createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');const e=createEngine();const t=C.createBroadcastChannelTransport('ABC234');const h=new C.HostSession({session:'ABC234',target:{dispatch:(c:any)=>e.dispatch(c),snapshot:()=>e.snapshot(),restore:(s:any)=>e.restore(s),on:(f:any)=>e.on(f),now:()=>e.now(),time:()=>{}},stateIntervalMs:0});h.addTransport(t);const ch=new BroadcastChannel('pme/ABC234');(window as any).c={h,t,ch,acks:[]};ch.onmessage=(ev:any)=>{if(ev.data.kind==='ack')(window as any).c.acks.push(ev.data)};
 for(const [i,session,extra] of [[1,'DEF567',''],[2,'ABC234','x'.repeat(262145)]] as any[])ch.postMessage({v:1,session,from:'foreign',seq:i,sentAt:0,kind:'command',body:{id:'bad'+i,issuedBy:'foreign',type:'setTarget',variable:'hr',value:130,extra}});
 // A valid sentinel observes that preceding messages were delivered/processed, without a sleep.
 ch.postMessage({v:1,session:'ABC234',from:'foreign',seq:3,sentAt:0,kind:'command',body:{id:'sentinel',issuedBy:'test',type:'setTarget',variable:'hr',value:80}});
 },audit.root);
 await expect.poll(()=>page.evaluate(()=>(window as any).c.acks.some((a:any)=>a.commandId==='sentinel'))).toBe(true);
 const r=await page.evaluate(()=>{const c=(window as any).c;const r={applied:c.h.stats.applied,acks:c.acks};c.h.close();c.t.close();c.ch.close();return r});expect(r.applied).toBe(1);
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/fu11-host-boundary.test.ts`  
Expected: 4 failed: the foreign command is applied; `EVENTS_PER_MESSAGE` / `MESSAGE_BUDGET_BYTES` undefined; the viewer's command is accepted

Run: `npx playwright test --retries=0 audit-session-boundary`  
Expected: 2 failed: expected applied 1, received 3

- [ ] **Step 3 — implement.**

In `packages/controller/src/session/host-session.ts`, find:

```ts
const SEEN_MAX = 500;
/** Events that stay on the host: audio is scheduled locally by every monitor from its own engine. */
```

Replace with:

```ts
const SEEN_MAX = 500;
/**
 * FU-11 (BA11; R50 F2): a hidden-tab catch-up arrives as ONE batch, and the app's 1 Hz truth events are up to 27 KB each
 * (200 events reached 379 KB) — every wire message holds at most this much JSON and this many events, so it passes
 * the receivers' 256 KB budget (guard.ts) [ENG: half the budget].
 */
export const MESSAGE_BUDGET_BYTES = 128 * 1024;
export const EVENTS_PER_MESSAGE = 200;
/** Events that stay on the host: audio is scheduled locally by every monitor from its own engine. */
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    const body = this.batch;
    this.batch = [];
    this.broadcast({ kind: 'event', body });
```

Replace with:

```ts
    const all = this.batch;
    this.batch = [];
    let body: WireEvent[] = [];
    let bytes = 0;
    for (const e of all) {
      const n = JSON.stringify(e).length;
      if (body.length > 0 && (body.length >= EVENTS_PER_MESSAGE || bytes + n > MESSAGE_BUDGET_BYTES)) {
        this.broadcast({ kind: 'event', body });
        body = [];
        bytes = 0;
      }
      body.push(e);
      bytes += n;
    }
    if (body.length > 0) this.broadcast({ kind: 'event', body });
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  private async receive(t: ManagedTransport, m: WireMessage): Promise<void> {
```

Replace with:

```ts
  /** Peers whose last hello said `viewer` (R50 M13). */
  private readonly viewerPeers = new Set<string>();

  private async receive(t: ManagedTransport, m: WireMessage): Promise<void> {
    if (m.session !== this.o.session) return; // FU-11 (BA11): a message for another session is not ours, whatever channel it came on
    // R50 M13: a peer that said hello as a viewer sends no commands — the relay already refuses them on a WebSocket;
    // a BroadcastChannel peer is held to the same rule (one trust model per role, whatever the transport)
    if (m.kind === 'hello') (m.role === 'viewer' ? this.viewerPeers.add(m.from) : this.viewerPeers.delete(m.from));
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    if (m.kind === 'hello' && m.role !== 'host') return this.welcome(t);
    if (m.kind === 'command') return this.command(t, m.body, m.from);
```

Replace with:

```ts
    if (m.kind === 'hello' && m.role !== 'host') return this.welcome(t);
    if (m.kind === 'command' && this.viewerPeers.has(m.from)) {
      t.send(this.stamp({ kind: 'ack', commandId: m.body.id, accepted: false, tick: this.o.target.now().tick, reason: 'a viewer cannot command' }));
      return;
    }
    if (m.kind === 'command') return this.command(t, m.body, m.from);
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session`  
Expected: all passed (fu11-host-boundary: 4)

Run: `npx playwright test --retries=0 audit-session-boundary`  
Expected: 2 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-session-boundary.e2e.ts \
  packages/controller/src/session/host-session.ts \
  packages/controller/test/session/fu11-host-boundary.test.ts
git commit -m "fix(controller): the host ignores other sessions and viewers' commands; batches split by size and count (FU-11 A3, BA11, R50 F2, M13)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part B — Audio ownership, disposal and alarm silence (BA08, BA09, F19, AL01) (branch `fu-11-a`)

### Task B1: A cancel stops a voice that is already sounding (F19, BA08)

**Branch** `fu-11-a` · **Findings** F19, BA08 (A02, A03) · **Files** Modify `packages/audio/src/alarm-voice.ts`, `packages/audio/src/scheduler.ts`, `packages/audio/src/tones.ts`; Create `packages/audio/test/fu11-scheduler-cancel.test.ts`, `apps/demo/e2e/audit-audio-cancel.e2e.ts`

**Why:** `revoke()` stopped a handle only when its start lay in the future, and `pump()` forgot every tone 2 s after its start
whatever its length: a 60 s charge-ready tone kept sounding after a cancel (audit A02/A03: OfflineAudioContext RMS 0.175
after the cancel at 0.25 s and at 2.5 s, reproduced on `f29951b`, both browsers). A `ToneHandle` now carries `endsAt`
(audio time it ends by itself); the scheduler stops any matched handle that has not ended and keeps it until 2 s after
its end. A cancel before the start behaves as before (unit test). R50 M12: a bookmark restore cancels with the engine's `toneCancel {after}` (no ids) — the unit test now holds
a sounding 60 s ready tone, restores to BEFORE it (stopped at once) and to AFTER it (keeps sounding: the KNOWN LIMIT —
a forward restore between two bookmarks does not end a tone of the earlier timeline that started before the later
bookmark; recorded in the gate note, no v1.0 consumer). Side effect (state it in the gate note): a silenced alarm's
already-sounding pulse now stops at once instead of finishing its tail.

**Interfaces:** Produces: `ToneHandle.endsAt?: number`; `playBeep`, `playAlarmPulse`, `playSegments` return it.

- [ ] **Step 1 — the failing tests.** 

Create `packages/audio/test/fu11-scheduler-cancel.test.ts`:

```ts
// FU-11 Task B1 (external review F19, browser audit BA08 A02/A03): a cancel stops a voice that is already sounding, and
// the scheduler keeps a long voice (a 60 s ready tone) until it has ended, not for a fixed 2 s.
import { describe, expect, it } from 'vitest';
import { ToneScheduler } from '../src/scheduler.ts';

function rig(durS: number) {
  const now = { s: 0 };
  const stops: number[] = [];
  const s = new ToneScheduler({
    audioNow: () => now.s,
    perfToAudio: (p) => p / 1000,
    outputLatency: () => 0,
    play: (_tone, when) => ({ endsAt: when + durS, stop: () => stops.push(now.s) }),
  });
  s.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 1 });
  return { s, now, stops };
}

describe('FU-11 B1: cancelling a sounding voice', () => {
  for (const at of [0.25, 2.5, 30]) {
    it(`a 60 s ready tone cancelled ${at} s after it started is stopped once`, () => {
      const { s, now, stops } = rig(60);
      s.enqueue({ t: 0, id: 'ready', kind: 'chargeReady' });
      now.s = at;
      s.pump();
      s.cancel(['ready']);
      s.cancel(['ready']);
      expect(stops).toEqual([at]);
    });
  }
  it('a voice that has ended is not stopped again, and is forgotten 2 s after its end', () => {
    const { s, now, stops } = rig(0.06);
    s.enqueue({ t: 0, id: 'beep', kind: 'qrs' });
    now.s = 1;
    s.pump();
    s.cancel(['beep']);
    expect(stops).toEqual([]);
    now.s = 2.2;
    s.pump();
    s.enqueue({ t: 2.2, id: 'beep', kind: 'qrs' }); // forgotten → a new tone with the same id plays
    expect(s.log.filter((l) => l.id === 'beep')).toHaveLength(2);
  });
  it('a restore to before a sounding ready tone stops it (the engine\'s toneCancel {after}); a forward restore does not (R50 M12)', () => {
    const { s, now, stops } = rig(60);
    s.enqueue({ t: 3, id: 'ready', kind: 'chargeReady' });
    now.s = 6;
    s.pump();
    s.cancelAfter(10); // a bookmark LATER than the tone: the known limit — the old timeline's tone keeps sounding
    expect(stops).toEqual([]);
    s.cancelAfter(1); // a bookmark before the charge: the tone belongs to the discarded future
    expect(stops).toEqual([6]);
  });
  it('a cancel before the start still prevents it (unchanged)', () => {
    const { s, now, stops } = rig(1);
    s.enqueue({ t: 0.5, id: 'x', kind: 'alarm' }); // beyond the 100 ms look-ahead: still queued
    s.cancel(['x']);
    now.s = 1;
    s.pump();
    expect(s.log.some((l) => l.id === 'x')).toBe(false);
    expect(stops).toEqual([]);
  });
});
```

Create `apps/demo/e2e/audit-audio-cancel.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA08 A02/A03 (cancel a sounding voice) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-audio.e2e.ts (its first test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
for(const elapsed of [.25,2.5])test(`cancel active tone at audio time ${elapsed}`,async({page,audit})=>{
 await page.goto(audit.url);
 const rms=await page.evaluate(async({root,elapsed})=>{const {ToneScheduler,playSegments}=await import('/@fs'+root+'/packages/audio/src/index.ts');const ctx=new OfflineAudioContext(1,4*48000,48000);const scheduler=new ToneScheduler({audioNow:()=>ctx.currentTime,perfToAudio:(x:number)=>x/1000,play:(_:any,t:number)=>playSegments(ctx,ctx.destination,t,[{startHz:1000,endHz:1000,durMs:3900,gapMs:0}],.3)});scheduler.clock.setAnchor({simT:0,perfMs:0,timeScale:1});scheduler.enqueue({id:'tone',t:0,kind:'chargeReady'});const suspended=ctx.suspend(elapsed);const rendering=ctx.startRendering();await suspended;scheduler.pump();scheduler.cancel(['tone']);await ctx.resume();const buffer=await rendering;const samples=buffer.getChannelData(0).subarray(Math.ceil((elapsed+.1)*48000),Math.ceil((elapsed+.3)*48000));return Math.sqrt(samples.reduce((s:number,x:number)=>s+x*x,0)/samples.length)},{root:audit.root,elapsed});
 expect(rms).toBeLessThan(.0001);
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/fu11-scheduler-cancel.test.ts`  
Expected: 4 failed (no stop for a started voice at 0.25, 2.5 and 30 s; the restore-before case: `expected [] to deeply equal [ 6 ]`), 2 passed

Run: `npx playwright test --retries=0 audit-audio-cancel`  
Expected: 4 failed: RMS 0.1750 (expected < 0.0001)

- [ ] **Step 3 — implement.**

In `packages/audio/src/scheduler.ts`, find:

```ts
const FORGET_AFTER_S = 2; // keep played ids this long for dedupe [ENG]

export interface ToneRequest {
  t: number; // sim seconds
  id: string;
  kind: string;
  freqHz?: number;
  /** Sim time of the event the tone marks (the detected R for 'qrs'). */
  refT?: number;
}

export interface ToneHandle {
  stop(): void;
```

Replace with:

```ts
const FORGET_AFTER_S = 2; // keep played ids this long after their voice ends, for dedupe [ENG]

export interface ToneRequest {
  t: number; // sim seconds
  id: string;
  kind: string;
  freqHz?: number;
  /** Sim time of the event the tone marks (the detected R for 'qrs'). */
  refT?: number;
}

export interface ToneHandle {
  stop(): void;
  /** FU-11 (F19, BA08): audio time the voice ends on its own; the scheduler owns the handle until then. */
  readonly endsAt?: number;
```

In `packages/audio/src/scheduler.ts`, find:

```ts
      if (l.handle && l.at > now) l.handle.stop();
      this.live.delete(id);
    }
    this.queue = this.queue.filter((q) => this.live.has(q.id));
  }

  /** Schedule everything due within the look-ahead window. */
  pump(): void {
    if (!this.clock.hasAnchor) return;
    const now = this.deps.audioNow();
    for (const [id, l] of this.live) if (l.at + FORGET_AFTER_S < now) this.live.delete(id);
```

Replace with:

```ts
      // FU-11 (F19, BA08): a voice that is still sounding stops too — not only one scheduled for later
      if (l.handle && !((l.handle.endsAt ?? Infinity) <= now)) l.handle.stop();
      this.live.delete(id);
    }
    this.queue = this.queue.filter((q) => this.live.has(q.id));
  }

  /** Schedule everything due within the look-ahead window. */
  pump(): void {
    if (!this.clock.hasAnchor) return;
    const now = this.deps.audioNow();
    // FU-11 (F19, BA08): forget a tone only after its voice has ended (a 60 s ready tone outlives the 2 s dedupe window)
    for (const [id, l] of this.live) if ((l.handle?.endsAt ?? l.at) + FORGET_AFTER_S < now) this.live.delete(id);
```

In `packages/audio/src/alarm-voice.ts`, find:

```ts
function stopper(osc: OscillatorNode, env: GainNode): ToneHandle {
  return {
```

Replace with:

```ts
function stopper(osc: OscillatorNode, env: GainNode, endsAt: number): ToneHandle {
  return {
    endsAt, // FU-11 (F19): the scheduler keeps the handle until the voice has ended
```

In `packages/audio/src/alarm-voice.ts`, find:

```ts
  osc.stop(when + p.durS + 0.01);
  return stopper(osc, env);
}
```

Replace with:

```ts
  osc.stop(when + p.durS + 0.01);
  return stopper(osc, env, when + p.durS + 0.01);
}
```

In `packages/audio/src/alarm-voice.ts`, find:

```ts
  osc.stop(t + 0.01);
  return stopper(osc, env);
}
```

Replace with:

```ts
  osc.stop(t + 0.01);
  return stopper(osc, env, t + 0.01);
}
```

In `packages/audio/src/tones.ts`, find:

```ts
export function playBeep(ctx: BaseAudioContext, dest: AudioNode, when: number, freqHz: number, gain = 0.25): { stop(): void } {
  const osc = ctx.createOscillator();
  const wave = ctx.createPeriodicWave(new Float32Array([0, 0, 0]), new Float32Array([0, 1, BEEP_HARMONIC2]));
  osc.setPeriodicWave(wave);
  osc.frequency.value = freqHz;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  for (const [dt, g] of beepEnvelope(gain)) env.gain.linearRampToValueAtTime(g, when + dt);
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(when + BEEP_MS / 1000 + 0.01);
  return {
```

Replace with:

```ts
export function playBeep(ctx: BaseAudioContext, dest: AudioNode, when: number, freqHz: number, gain = 0.25): { stop(): void; readonly endsAt: number } {
  const osc = ctx.createOscillator();
  const wave = ctx.createPeriodicWave(new Float32Array([0, 0, 0]), new Float32Array([0, 1, BEEP_HARMONIC2]));
  osc.setPeriodicWave(wave);
  osc.frequency.value = freqHz;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  for (const [dt, g] of beepEnvelope(gain)) env.gain.linearRampToValueAtTime(g, when + dt);
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(when + BEEP_MS / 1000 + 0.01);
  return {
    endsAt: when + BEEP_MS / 1000 + 0.01, // FU-11 (F19)
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run`  
Expected: all passed

Run: `npx playwright test --retries=0 audit-audio-cancel`  
Expected: 4 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-audio-cancel.e2e.ts \
  packages/audio/src/alarm-voice.ts \
  packages/audio/src/scheduler.ts \
  packages/audio/src/tones.ts \
  packages/audio/test/fu11-scheduler-cancel.test.ts
git commit -m "fix(audio): a cancel stops a sounding voice; long voices are owned until they end (FU-11 B1, F19, BA08)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task B2: The defibrillator's charge and ready tones end with their state (F19, BA08)

**Branch** `fu-11-a` · **Findings** F19, BA08 (A04, A05) · **Files** Modify `packages/engine-core/src/l3/defib-pacer/defib.ts`; Create `packages/engine-core/test/engine/fu11-defib-tones.test.ts`, `apps/demo/e2e/audit-audio-disarm.e2e.ts`

**Why:** Disarm emitted only a `marker`; the ready tone (60 s) went on after the device went idle (audit A04: the ready
oscillator never `ended`, both render paths, both browsers, reproduced on `f29951b`). `DefibState.tones` holds the
ids of the charge/ready tones still valid; disarm (manual or auto), a shock and a recharge emit
`toneCancel { ids }` for them. Device lifecycle only — no shock outcome, energy or timing changes; a pre-FU-11
snapshot without `tones` works (`d.tones?.length`).

**Interfaces:** Consumes B1 (the scheduler stops started voices). Produces: `DefibState.tones?: string[]`.

- [ ] **Step 1 — the failing tests.** 

Create `packages/engine-core/test/engine/fu11-defib-tones.test.ts`:

```ts
// FU-11 Task B2 (external review F19, browser audit BA08 A04/A05): the defibrillator's charge and ready tones end with
// the state that started them — disarm, shock and recharge send a toneCancel with their ids.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

type Tone = Extract<EngineEvent, { type: 'tone' }>;
type Cancel = Extract<EngineEvent, { type: 'toneCancel' }>;
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } });
const tones = (ev: EngineEvent[], kind: string) => ev.filter((x): x is Tone => x.type === 'tone' && x.kind === kind);
const cancels = (ev: EngineEvent[]) => ev.filter((x): x is Cancel => x.type === 'toneCancel' && !!x.ids).flatMap((x) => x.ids ?? []);

describe('FU-11 B2: device tones end with their state', () => {
  it('disarm after ready cancels the ready tone', () => {
    const { e, ev } = devRig('zoll-like');
    e.advanceTo(1);
    e.dispatch(defib('charge', { energyJ: 10 }));
    e.advanceTo(5);
    const ready = tones(ev, 'chargeReady')[0];
    expect(ready).toBeDefined();
    e.dispatch(defib('disarm'));
    e.advanceTo(6);
    expect(cancels(ev)).toContain(ready!.id);
  });
  it('a shock cancels the ready tone and never its own shock tone; a recharge cancels the previous charge tone', () => {
    const { e, ev } = devRig('zoll-like');
    e.advanceTo(1);
    e.dispatch(defib('charge', { energyJ: 200 })); // seconds of charging
    e.advanceTo(1.5);
    e.dispatch(defib('charge', { energyJ: 150 })); // recharge while the first is still charging
    e.advanceTo(2);
    const [first, second] = tones(ev, 'charge');
    expect(cancels(ev)).toContain(first!.id);
    expect(cancels(ev)).not.toContain(second!.id);
    e.advanceTo(15);
    const ready = tones(ev, 'chargeReady')[0]!;
    e.dispatch(defib('shock'));
    e.advanceTo(16);
    const shock = tones(ev, 'shock')[0]!;
    expect(cancels(ev)).toContain(ready.id);
    expect(cancels(ev)).not.toContain(shock.id);
  });
});
```

Create `apps/demo/e2e/audit-audio-disarm.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA08 A04 (disarm ends the ready tone) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-audio.e2e.ts (its third test); adapted: `override` on the AudioContext member it wraps (the demo tsconfig
// has noImplicitOverride). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
for(const mode of ['off','auto'])test(`disarm ends ready oscillator (${mode})`,async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async({root,mode})=>{const C=AudioContext;const w=window as any;w.voices=[];window.AudioContext=class extends C{override createOscillator(){const o=super.createOscillator(),stop=o.stop.bind(o);const rec={end:0,ended:false};w.voices.push(rec);o.stop=(t=0)=>{rec.end=t;stop(t)};o.addEventListener('ended',()=>rec.ended=true);return o}};const {mountMonitor}=await import('/@fs'+root+'/packages/renderer/src/mount.ts');w.m=mountMonitor(document.getElementById('monitor'),{worker:mode,skin:'zoll-like'});w.events=[];w.m.on((e:any)=>w.events.push(e));document.getElementById('sound')!.onclick=()=>{w.unlock=w.m.enableSound()};await w.m.renderPath},{root:audit.root,mode});
 await page.locator('#sound').click();await page.evaluate(()=>(window as any).unlock);
 await page.evaluate(()=>(window as any).m.dispatch({id:'charge',issuedBy:'test',type:'applyEvent',event:{kind:'defib',action:'charge',energyJ:10}}));
 await expect.poll(()=>page.evaluate(()=>(window as any).voices.some((v:any)=>v.end>50))).toBe(true);
 await page.evaluate(()=>{const w=window as any;w.readyVoice=w.voices.find((v:any)=>v.end>50);return w.m.dispatch({id:'disarm',issuedBy:'test',type:'applyEvent',event:{kind:'defib',action:'disarm'}})});
 await expect.poll(()=>page.evaluate(()=>(window as any).events.some((e:any)=>e.type==='marker'&&e.kind==='disarm'))).toBe(true);
 try{await expect.poll(()=>page.evaluate(()=>(window as any).readyVoice.ended)).toBe(true)}finally{await page.evaluate(()=>(window as any).m.destroy())}
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-defib-tones.test.ts`  
Expected: 2 failed (no toneCancel with the ready / first charge id)

Run: `npx playwright test --retries=0 audit-audio-disarm`  
Expected: 4 failed: readyVoice.ended stays false

- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l3/defib-pacer/defib.ts`, find:

```ts
  lastShock: { t: number; energyJ: number; sync: boolean; outcome: string } | null;
}
```

Replace with:

```ts
  lastShock: { t: number; energyJ: number; sync: boolean; outcome: string } | null;
  /** FU-11 (F19, BA08): ids of the charge/ready tones still sounding; disarm, shock and recharge cancel them. */
  tones?: string[];
}
```

In `packages/engine-core/src/l3/defib-pacer/defib.ts`, find:

```ts
      d.state = 'charging';
      d.readyAt = t + chargeS;
      d.disarmAt = null;
      d.syncArmed = false;
      out.push({ type: 'marker', t, kind: 'chargeStart', data: { energyJ: d.energyJ } });
      out.push({ type: 'tone', t, id: `defib-charge-${++d.seq}`, kind: 'charge', chargeS });
```

Replace with:

```ts
      endTones(d, t, out); // a recharge silences the previous charge or ready tone
      d.state = 'charging';
      d.readyAt = t + chargeS;
      d.disarmAt = null;
      d.syncArmed = false;
      out.push({ type: 'marker', t, kind: 'chargeStart', data: { energyJ: d.energyJ } });
      const id = `defib-charge-${++d.seq}`;
      out.push({ type: 'tone', t, id, kind: 'charge', chargeS });
      d.tones = [id];
```

In `packages/engine-core/src/l3/defib-pacer/defib.ts`, find:

```ts
function disarm(d: DefibState, t: number, out: EngineEvent[], auto: boolean): void {
```

Replace with:

```ts
/** FU-11 (F19, BA08): the device's charge and ready tones end with the state that started them. */
function endTones(d: DefibState, t: number, out: EngineEvent[]): void {
  if (d.tones?.length) out.push({ type: 'toneCancel', after: t, ids: d.tones });
  d.tones = [];
}

function disarm(d: DefibState, t: number, out: EngineEvent[], auto: boolean): void {
  endTones(d, t, out);
```

In `packages/engine-core/src/l3/defib-pacer/defib.ts`, find:

```ts
    out.push({ type: 'tone', t, id: `defib-ready-${++d.seq}`, kind: 'chargeReady' });
    return true;
  }
  if (d.state === 'ready' && d.disarmAt !== null && t >= d.disarmAt - 1e-9) {
    disarm(d, t, out, true);
    return true;
  }
  return false;
}

/** After a delivered shock (brief §6.5: LIFEPAK-like "Sync After Shock" off; applied to every skin [ENG]). */
export function afterShock(d: DefibState, t: number, atS: number, synced: boolean, outcome: string, out: EngineEvent[]): void {
```

Replace with:

```ts
    const id = `defib-ready-${++d.seq}`;
    out.push({ type: 'tone', t, id, kind: 'chargeReady' });
    d.tones = [id]; // the charge tone has run its course
    return true;
  }
  if (d.state === 'ready' && d.disarmAt !== null && t >= d.disarmAt - 1e-9) {
    disarm(d, t, out, true);
    return true;
  }
  return false;
}

/** After a delivered shock (brief §6.5: LIFEPAK-like "Sync After Shock" off; applied to every skin [ENG]). */
export function afterShock(d: DefibState, t: number, atS: number, synced: boolean, outcome: string, out: EngineEvent[]): void {
  endTones(d, t, out); // the ready tone stops at the shock; the shock tone below is new
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-defib-tones.test.ts test/engine/defib-engine.test.ts test/l3/defib-pacer`  
Expected: all passed

Run: `npx playwright test --retries=0 audit-audio-disarm`  
Expected: 4 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-audio-disarm.e2e.ts \
  packages/engine-core/src/l3/defib-pacer/defib.ts \
  packages/engine-core/test/engine/fu11-defib-tones.test.ts
git commit -m "fix(engine): disarm, shock and recharge cancel the device tones they end (FU-11 B2, F19, BA08)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task B3: A late audio unlock cannot outlive the monitor (BA09)

**Branch** `fu-11-a` · **Findings** BA09 · **Files** Modify `packages/renderer/src/mount.ts`; Create `apps/demo/e2e/audit-audio-unlock.e2e.ts`

**Why:** `enableSound()` attached its AudioContext and scheduler in the unlock's `.then` even when `destroy()` had run in
between: the late context stayed `running` (audit A07, reproduced on `f29951b`, both browsers). A `destroyed` flag is
set first in `destroy()`; a late unlock closes its context and returns; `enableSound()` after destroy does nothing.

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/audit-audio-unlock.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA09 (a late audio unlock after destroy) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-audio.e2e.ts (its second test); adapted: `override` on the AudioContext member it wraps (the demo tsconfig
// has noImplicitOverride). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
test('destroy while native audio unlock is pending closes the late context',async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async root=>{const {mountMonitor}=await import('/@fs'+root+'/packages/renderer/src/mount.ts');const C=AudioContext;(window as any).contexts=[];window.AudioContext=class extends C{constructor(...a:any[]){super(a[0]);(window as any).contexts.push(this)}override resume(){return super.resume().then(()=>new Promise<void>(resolve=>(window as any).release=resolve))}};const m=mountMonitor(document.getElementById('monitor'),{worker:'off'});(window as any).m=m;document.getElementById('sound')!.onclick=()=>{(window as any).unlock=m.enableSound()};await m.renderPath},audit.root);
 await page.locator('#sound').click();await page.waitForFunction(()=>!!(window as any).release);
 await page.evaluate(async()=>{const w=window as any;w.m.destroy();w.release();await w.unlock});
 try{await expect.poll(()=>page.evaluate(()=>(window as any).contexts.map((c:any)=>c.state))).toEqual(['closed'])}finally{await page.evaluate(async()=>{for(const c of (window as any).contexts)if(c.state!=='closed')await c.close()})}
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 audit-audio-unlock`  
Expected: 2 failed: contexts ['running'] (expected ['closed'])

- [ ] **Step 3 — implement.**

In `packages/renderer/src/mount.ts`, find:

```ts
  const listeners = new Set<(e: EngineEvent) => void>();
  let scheduler: ToneScheduler | null = null;
```

Replace with:

```ts
  const listeners = new Set<(e: EngineEvent) => void>();
  let destroyed = false; // FU-11 (BA09): a late audio unlock after destroy() closes its context instead of attaching
  let scheduler: ToneScheduler | null = null;
```

In `packages/renderer/src/mount.ts`, find:

```ts
      soundP ??= unlockAudio(() => scheduler?.clear()).then((out) => {
```

Replace with:

```ts
      if (destroyed) return Promise.resolve(); // FU-11 (BA09)
      soundP ??= unlockAudio(() => scheduler?.clear()).then((out) => {
        if (destroyed) return out.close(); // FU-11 (BA09): the monitor went away while the unlock was pending
```

In `packages/renderer/src/mount.ts`, find:

```ts
    destroy() {
      ro.disconnect();
```

Replace with:

```ts
    destroy() {
      destroyed = true; // FU-11 (BA09)
      ro.disconnect();
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 audit-audio-unlock audit-audio`  
Expected: 8 passed (with B1, B2)

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-audio-unlock.e2e.ts \
  packages/renderer/src/mount.ts
git commit -m "fix(renderer): a monitor destroyed during the audio unlock closes the late context (FU-11 B3, BA09)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task B4: A new higher-priority alarm breaks a lower-priority silence on every profile (owner ruling Q1, AL01)

**Branch** `fu-11-a` · **Findings** AL01; owner ruling Q1 (2026-10-04) · **Files** Modify `packages/audio/src/alarm-sounder.ts`, `packages/audio/test/alarm-sounder.test.ts`, `packages/engine-core/src/l3/alarms/manager.ts`, `packages/engine-core/test/l3/alarms/manager.test.ts`

**Why:** Owner ruling: "a NEW HIGHER-PRIORITY alarm must break through an active silence of a lower-priority alarm, on every
profile including the Zoll-style one", unless a vendor documents otherwise. Evidence check (read-only research agent,
2026-10-05, every skin's provenance and research/05, 06, 13): saadat-like is DOCUMENTED to break through (any new alarm
ends the silence, research/06 §4.2, manual M p. 38, 50); philips-like and mindray-like acknowledge (no mute timer; new
alarms sound: research/05 §6 [S2] IFU p. 11, 32; [S4] §10.8); zoll-like's 90 s is cited (research/05 §2.6, ZOLL X
guide [S5]) but its "a new alarm does not end it" (`cancelOnNewAlarm: false`, iec-defaults.json:110, inherited by
ge-like and lifepak-like) has NO citation — an unsourced default; the repo records no IEC 60601-1-8 clause on it. So:
no vendor conflict to put to the owner; the rule is implemented. Both layers decide it — the engine's alarm manager
(`silencedUntil`, manager.ts) and the audio sounder (alarm-sounder.ts), each priority-blind before: the silence now
remembers the highest priority (lowest level) active when it began (`silencedLevel`; null for a pre-silence with
nothing sounding) and a NEW alarm above it ends the silence on every profile; a new alarm of the same or lower
priority keeps the IEC-style mute; `cancelOnNewAlarm: true` profiles are unchanged. The unit test that pinned the ZOLL
behaviour (`manager.test.ts` 'IEC-style mute silence (90 s, zoll-like) is not ended by a new alarm') is REPLACED by the
profile-specific contract below (zoll-like, ge-like, lifepak-like: ended by a higher priority, held by the same/lower;
a pre-silence holds; saadat-like: any new alarm, unchanged). Not changed: Alarm PAUSE (no alarm is raised during it,
on every skin, research/13 Amendment 2 note) — the ruling speaks of silence; pause is listed for the owner (Q7).
A snapshot from before FU-11 has no `silencedLevel` (absent = the old behaviour until the next Silence).

**Interfaces:** Produces: `AlarmMgrState.silencedLevel?: AlarmLevel | null` (engine), `AlarmSounder` private `silentLevel`.

- [ ] **Step 1 — the failing tests.** (this task changes a test; see Step 2)

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/alarms/manager.test.ts`  
Expected: 3 failed (zoll-like, ge-like, lifepak-like: silencedUntil 91, expected null)

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run test/alarm-sounder.test.ts`  
Expected: 1 failed: 'iec-style silence IS ended by a new alarm of higher priority' — expected 91 to be null

- [ ] **Step 3 — implement.**

In `packages/audio/src/alarm-sounder.ts`, find:

```ts
  private silentUntil: number | null = null;
  private volumeStep: number;
```

Replace with:

```ts
  private silentUntil: number | null = null;
  /** FU-11 (owner ruling Q1, AL01): the highest priority (lowest level) active when the silence began; null = none. */
  private silentLevel: AlarmLevel | null = null;
  private volumeStep: number;
```

In `packages/audio/src/alarm-sounder.ts`, find:

```ts
    if (!prev && this.silentUntil !== null && this.silence.cancelOnNewAlarm) this.silentUntil = null;
```

Replace with:

```ts
    const above = this.silentLevel !== null && level < this.silentLevel; // a higher priority ends any silence (Q1, AL01)
    if (!prev && this.silentUntil !== null && (this.silence.cancelOnNewAlarm || above)) this.silentUntil = null;
```

In `packages/audio/src/alarm-sounder.ts`, find:

```ts
    this.silentUntil = t + durationS * this.sched.clock.timeScale;
  }
```

Replace with:

```ts
    this.silentUntil = t + durationS * this.sched.clock.timeScale;
    const levels = [...this.active.values()].map((a) => a.level);
    this.silentLevel = levels.length ? (Math.min(...levels) as AlarmLevel) : null;
  }
```

In `packages/audio/test/alarm-sounder.test.ts`, find:

```ts

  it('bursts keep real-time patterns at timeScale 2 (sim spacing doubles, audio spacing unchanged)', () => {
```

Replace with:

```ts

  it('iec-style silence IS ended by a new alarm of higher priority (FU-11, owner ruling Q1, AL01)', () => {
    const r = rig(IEC_STYLE);
    r.s.raise('SPO2', 2, 0);
    r.run(1);
    r.s.silenceAll(1);
    r.run(40);
    r.s.raise('ASY', 1, 40);
    r.run(42);
    expect(r.s.silencedUntil).toBeNull();
    expect(bursts(onsets(r.played)).map((x) => x[0])).toEqual([0, 40]);
  });

  it('bursts keep real-time patterns at timeScale 2 (sim spacing doubles, audio spacing unchanged)', () => {
```

In `packages/engine-core/src/l3/alarms/manager.ts`, find:

```ts
  silencedUntil: number | null;
  pausedUntil: number | null;
```

Replace with:

```ts
  silencedUntil: number | null;
  /** FU-11 (owner ruling Q1, AL01): the highest priority (lowest level) sounding when Silence was pressed; a new alarm
   *  above it ends the silence on every profile. null = nothing was sounding (a pre-silence); absent in older snapshots. */
  silencedLevel?: AlarmLevel | null;
  pausedUntil: number | null;
```

In `packages/engine-core/src/l3/alarms/manager.ts`, find:

```ts
      s.silencedUntil = t + (p.silence.durationS ?? 0);
      for (const e of Object.values(s.active)) {
```

Replace with:

```ts
      s.silencedUntil = t + (p.silence.durationS ?? 0);
      const levels = Object.values(s.active).map((e) => e.level);
      s.silencedLevel = levels.length ? (Math.min(...levels) as AlarmLevel) : null;
      for (const e of Object.values(s.active)) {
```

In `packages/engine-core/src/l3/alarms/manager.ts`, find:

```ts
    if (s.silencedUntil !== null && p.silence.cancelOnNewAlarm) s.silencedUntil = null; // brief §6.4.1: any new alarm ends silence
```

Replace with:

```ts
    // brief §6.4.1: on a profile with cancelOnNewAlarm any new alarm ends silence; FU-11 (owner ruling Q1, AL01): on every
    // profile a new alarm of HIGHER priority than those silenced does (no vendor source documents a mute that holds)
    const above = s.silencedLevel != null && entry.level < s.silencedLevel;
    if (s.silencedUntil !== null && (p.silence.cancelOnNewAlarm || above)) s.silencedUntil = null;
```

In `packages/engine-core/test/l3/alarms/manager.test.ts`, find:

```ts
  it('IEC-style mute silence (90 s, zoll-like) is not ended by a new alarm', () => {
    const s = createAlarmMgr(deviceProfile('zoll-like'));
    run(s, 0, 1, () => [HR]);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 5, () => [HR, ASY]);
    expect(s.silencedUntil).toBeCloseTo(91, 6);
```

Replace with:

```ts
  // FU-11 (owner ruling Q1, audit AL01): on EVERY profile a new alarm of HIGHER priority than the ones silenced ends the
  // silence, as on the real devices — no vendor source documents a silence that holds through one (the ZOLL-like 90 s is
  // cited to the ZOLL X guide [research/05 §2.6, S5]; "keep it through a new alarm" was an uncited default). A new alarm
  // of the same or lower priority, and a pre-silence pressed with nothing sounding, keep the IEC-style mute as before.
  for (const id of ['zoll-like', 'ge-like', 'lifepak-like']) {
    it(`IEC-style mute silence (90 s, ${id}) is ended by a new HIGHER-priority alarm (Q1, AL01)`, () => {
      const s = createAlarmMgr(deviceProfile(id));
      run(s, 0, 1, () => [HR]);
      applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
      run(s, 1.02, 5, () => [HR, ASY]);
      expect(s.silencedUntil).toBeNull();
    });
    it(`IEC-style mute silence (90 s, ${id}) holds through a new alarm of the same or lower priority`, () => {
      const s = createAlarmMgr(deviceProfile(id));
      run(s, 0, 1, () => [HR]);
      applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
      run(s, 1.02, 15, () => [HR, { ...SPO2, delayS: 0 }]);
      expect(s.silencedUntil).toBeCloseTo(91, 6);
    });
  }
  it('an IEC-style pre-silence (nothing sounding) still mutes the next alarm for its 90 s', () => {
    const s = createAlarmMgr(deviceProfile('zoll-like'));
    run(s, 0, 1, () => []);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 5, () => [ASY]);
    expect(s.silencedUntil).toBeCloseTo(91, 6);
  });
  it('Saadat-like: any new alarm ends the silence (documented, research/06 §4.2, M p. 38, 50) — unchanged', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    run(s, 0, 1, () => [ASY]);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 5, () => [ASY, HR]);
    expect(s.silencedUntil).toBeNull();
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/alarms test/engine/fidelity-alarms.test.ts`  
Expected: all passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/audio exec vitest run`  
Expected: all passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/alarm-audio.test.ts test/alarm-view.test.ts`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/audio/src/alarm-sounder.ts \
  packages/audio/test/alarm-sounder.test.ts \
  packages/engine-core/src/l3/alarms/manager.ts \
  packages/engine-core/test/l3/alarms/manager.test.ts
git commit -m "fix(engine,audio): a new higher-priority alarm ends a lower-priority silence on every profile (FU-11 B4, AL01, owner ruling Q1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part C — Worker request lifecycle (BA06, F06, R50 M15) (branch `fu-11-a`)

### Task C1: Every worker request settles once — on its answer, a failure, silence or destroy (F06, BA06)

**Branch** `fu-11-a` · **Findings** F06, BA06 (W02–W07), R50 M15 · **Files** Modify `apps/demo/src/app/main.ts`, `packages/renderer/src/engine.worker.ts`, `packages/renderer/src/protocol.ts`, `packages/renderer/src/worker-host.ts`; Create `apps/demo/e2e/audit-worker.e2e.ts`, `apps/demo/e2e/fu11-monitor-failed.e2e.ts`

**Why:** Pending command/snapshot/restore/capture12 promises had no reject path: after a native `Worker.terminate()` they
stayed pending for good, and `destroy()` settled none (audit W02–W06: `pending` after 5 s, both browsers, reproduced
on `f29951b`). A request that threw inside the worker posted a generic error without its `reqId`. Now ONE request table
holds resolve and reject; `fail(err)` rejects every outstanding request once and every later call at once; it runs on
`destroy()`, on a worker `error` after ready (its frame loop dies with an uncaught error) and on SILENCE: with requests
waiting, no message for `WORKER_SILENT_MS` = 3 000 ms while the page is visible (frames post at least every 250 ms) —
except within 30 s of a hidden-tab catch-up (one catch-up can run several seconds) and never when this page itself
was blocked (the watchdog's own interval ran late). The watchdog runs only while requests wait. A worker request that
throws answers its own `reqId`; a `messageerror` rejects the waiting requests. R50 M15: such a failure is final (the worker is terminated, no fallback mid-session), so it must not be
silent: `fail()` dispatches a bubbling `pme-monitor-failed` event from the monitor's canvas (not for `destroy()`), and
the app shows the toast "The monitor stopped — Restart the patient" and logs the reason to the console (the gate
note's diagnostics). The e2e terminates the worker natively (no event) and sends a command: the watchdog finds the
silence and the toast appears (≈ 3–4 s).

**Interfaces:** Produces: `WORKER_SILENT_MS` (exported), `FromWorker` `error` gains `reqId?`; DOM event `pme-monitor-failed` (detail `{ reason }`) from the monitor canvas, bubbling.

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/audit-worker.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA06 (every worker request settles on failure or destroy) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-worker.e2e.ts. Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
for(const op of ['command','snapshot','restore','capture12','destroy'])test(`worker failure settles ${op}`,async({page,audit})=>{
 await page.addInitScript(()=>{const W=Worker;(window as any).ws=[];window.Worker=class extends W{constructor(...a:any[]){super(a[0],a[1]);(window as any).ws.push(this)}}});
 await page.goto(audit.url);const path=await page.evaluate(async root=>{const {mountMonitor}=await import('/@fs'+root+'/packages/renderer/src/mount.ts');(window as any).m=mountMonitor(document.getElementById('monitor'),{worker:'auto'});return await (window as any).m.renderPath},audit.root);
 test.skip(!path.startsWith('worker'),'actual worker capability required');
 await page.evaluate(async(op)=>{const w=window as any,m=w.m,s=await m.snapshot(),worker=w.ws.at(-1);w.outcome='pending';
 const post=worker.postMessage.bind(worker);worker.postMessage=(message:any,...rest:any[])=>{const result=post(message,...rest);worker.terminate();return result};
 const promise=op==='command'?m.dispatch({id:'test',issuedBy:'test',type:'setTarget',variable:'hr',value:100}):op==='restore'?m.restore(s):op==='capture12'?m.capture12():m.snapshot();
 promise.then(()=>w.outcome='resolved',()=>w.outcome='rejected');if(op==='destroy')m.destroy();
 },op);
 try{await expect.poll(()=>page.evaluate(()=>(window as any).outcome),{timeout:5000}).toBe('rejected')}finally{await page.evaluate(()=>(window as any).m.destroy())}
});
```

Create `apps/demo/e2e/fu11-monitor-failed.e2e.ts`:

```ts
// FU-11 Task C3 (R50 M15): a monitor whose worker stops (the watchdog's terminal failure) says so — a toast naming the
// way out — instead of a frozen screen that only refuses commands.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

test('a worker that stops is reported: "The monitor stopped — Restart the patient"', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const W = Worker;
    (window as unknown as { ws: Worker[] }).ws = [];
    window.Worker = class extends W {
      constructor(...a: ConstructorParameters<typeof Worker>) {
        super(...a);
        (window as unknown as { ws: Worker[] }).ws.push(this);
      }
    };
  });
  await openApp(page, base, '#/monitor', { warmMs: 1500 });
  const n = await page.evaluate(() => (window as unknown as { ws: Worker[] }).ws.length);
  test.skip(n === 0, 'this browser runs the monitor on the main thread (no worker to lose)');
  await page.evaluate(() => (window as unknown as { ws: Worker[] }).ws.at(-1)!.terminate()); // a silent death: no event
  // the watchdog listens while a request is out: the instructor's next action (here a command) finds the silence
  void page.evaluate(() => (window as unknown as { __pmeApp: { link: { send(c: unknown): Promise<unknown> } } }).__pmeApp.link.send({ type: 'setTarget', variable: 'hr', value: 90 }));
  await expect(page.locator('.toast', { hasText: 'The monitor stopped — Restart the patient' })).toBeVisible({ timeout: 10_000 });
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 audit-worker`  
Expected: 10 failed: outcome 'pending' (expected 'rejected') for command, snapshot, restore, capture12, destroy

Run: `npx playwright test --retries=0 fu11-monitor-failed`  
Expected: 2 failed: no toast "The monitor stopped — Restart the patient"

- [ ] **Step 3 — implement.**

In `packages/renderer/src/worker-host.ts`, find:

```ts
const HIDDEN_PUMP_MS = 1000;
```

Replace with:

```ts
const HIDDEN_PUMP_MS = 1000;
/** FU-11 (F06, BA06): a worker silent this long with requests waiting is dead (its frames post every ≤ 250 ms) [ENG]. */
export const WORKER_SILENT_MS = 3000;
/** …unless the page caught up a hidden stretch this recently (one catch-up can run several seconds) [ENG]. */
const CATCHUP_GRACE_MS = 30_000;
const WATCH_MS = 500;
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
  const pending = new Map<number, (r: DispatchResult) => void>();
  const snapshots = new Map<number, (s: PatientSnapshot) => void>();
  const restores = new Map<number, { resolve: () => void; reject: (e: Error) => void }>();
  const captures = new Map<number, { resolve: (c: Capture12) => void; reject: (e: Error) => void }>(); // Stage 4b
  let reqId = 0;
  let raf = 0;
  let pumping = false;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  const post = (m: ToWorker, transfer: Transferable[] = []) => worker.postMessage(m, transfer);
  const path = new Promise<RenderPath>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker did not become ready')), READY_TIMEOUT_MS);
    worker.onmessage = (ev: MessageEvent<FromWorker>) => {
      const m = ev.data;
      if (m.type === 'ready') {
        clearTimeout(timer);
        pumping = m.path === 'worker-pump';
        resolve(m.path);
      } else if (m.type === 'events') onEvents(m.anchor, m.events);
      else if (m.type === 'result') {
        pending.get(m.reqId)?.(m.result);
        pending.delete(m.reqId);
      } else if (m.type === 'snapshot') {
        snapshots.get(m.reqId)?.(m.snapshot);
        snapshots.delete(m.reqId);
      } else if (m.type === 'restored') {
        const r = restores.get(m.reqId);
        restores.delete(m.reqId);
        if (m.error === undefined) r?.resolve();
        else r?.reject(new Error(m.error));
      } else if (m.type === 'capture12') {
        const c = captures.get(m.reqId);
        captures.delete(m.reqId);
        if (m.capture) c?.resolve(m.capture);
        else c?.reject(new Error(m.error ?? 'capture12 failed'));
      } else {
        clearTimeout(timer);
        reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error(e.message));
```

Replace with:

```ts
  // FU-11 (F06, BA06): ONE table of outstanding requests, each with its resolve AND reject. A terminal failure (the worker
  // crashed after ready, went silent, or the monitor was destroyed) rejects every one of them once and every later call
  // at once — a bookmark, a command or a capture can no longer wait forever, nor block the host's command chain.
  const requests = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();
  let failure: Error | null = null;
  let ready = false;
  let reqId = 0;
  let raf = 0;
  let pumping = false;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  let lastHeard = performance.now();
  let lastCatchUp = -Infinity;
  let watch: ReturnType<typeof setInterval> | null = null;
  let lastWatch = 0;
  const post = (m: ToWorker, transfer: Transferable[] = []) => {
    if (m.type === 'catchUp') lastCatchUp = performance.now();
    if (!failure) worker.postMessage(m, transfer);
  };
  const stopWatch = () => {
    if (watch !== null) clearInterval(watch);
    watch = null;
  };
  const fail = (err: Error, report = true) => {
    if (failure) return;
    failure = err;
    stopWatch();
    for (const r of requests.values()) r.reject(err);
    requests.clear();
    // R50 M15: the failure is final (no fallback); the page hears it — bubbling from the canvas — and can say so
    if (report) canvas.dispatchEvent(new CustomEvent('pme-monitor-failed', { bubbles: true, detail: { reason: err.message } }));
  };
  const settle = (id: number, f: (r: { resolve: (v: never) => void; reject: (e: Error) => void }) => void) => {
    const r = requests.get(id);
    if (!r) return; // already failed (a late answer from a worker that came back) or unknown
    requests.delete(id);
    f(r);
  };
  /** Silent death (native terminate fires no event): the worker posts at least every 250 ms while visible. */
  const check = () => {
    const now = performance.now();
    const late = now - lastWatch > 4 * WATCH_MS; // this page was blocked itself: the worker's answers may be queued unread
    lastWatch = now;
    if (requests.size === 0) return stopWatch();
    if (late) return void (lastHeard = Math.max(lastHeard, now - WATCH_MS));
    if (document.visibilityState !== 'visible' || now - lastCatchUp < CATCHUP_GRACE_MS) return; // a long catch-up runs silently
    if (now - lastHeard > WORKER_SILENT_MS) {
      fail(new Error("the monitor's worker stopped responding"));
      worker.terminate();
    }
  };
  const request = <T>(make: (id: number) => ToWorker): Promise<T> => {
    if (failure) return Promise.reject(failure);
    return new Promise<T>((resolve, reject) => {
      const id = ++reqId;
      requests.set(id, { resolve: resolve as (v: never) => void, reject });
      if (watch === null) {
        lastWatch = performance.now();
        watch = setInterval(check, WATCH_MS);
      }
      post(make(id));
    });
  };
  const path = new Promise<RenderPath>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('worker did not become ready')), READY_TIMEOUT_MS);
    worker.onmessage = (ev: MessageEvent<FromWorker>) => {
      lastHeard = performance.now();
      const m = ev.data;
      if (m.type === 'ready') {
        clearTimeout(timer);
        ready = true;
        pumping = m.path === 'worker-pump';
        resolve(m.path);
      } else if (m.type === 'events') onEvents(m.anchor, m.events);
      else if (m.type === 'result') settle(m.reqId, (r) => r.resolve(m.result as never));
      else if (m.type === 'snapshot') settle(m.reqId, (r) => r.resolve(m.snapshot as never));
      else if (m.type === 'restored') settle(m.reqId, (r) => (m.error === undefined ? r.resolve(undefined as never) : r.reject(new Error(m.error))));
      else if (m.type === 'capture12') settle(m.reqId, (r) => (m.capture ? r.resolve(m.capture as never) : r.reject(new Error(m.error ?? 'capture12 failed'))));
      else if (m.reqId !== undefined) settle(m.reqId, (r) => r.reject(new Error(m.message)));
      else if (!ready) {
        clearTimeout(timer);
        reject(new Error(m.message));
      } else console.error('[pme worker]', m.message);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error(e.message));
      if (ready) fail(new Error(`the monitor's worker failed: ${e.message}`)); // its frame loop does not survive an uncaught error
    };
    worker.onmessageerror = () => {
      // an answer that cannot be read: the requests waiting for it would never settle
      for (const r of requests.values()) r.reject(new Error("a reply from the monitor's worker could not be read"));
      requests.clear();
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
    command: (cmd) =>
      new Promise<DispatchResult>((resolve) => {
        const id = ++reqId;
        pending.set(id, resolve);
        post({ type: 'command', reqId: id, cmd });
      }),
    snapshot: () =>
      new Promise<PatientSnapshot>((resolve) => {
        const id = ++reqId;
        snapshots.set(id, resolve);
        post({ type: 'snapshot', reqId: id });
      }),
    restore: (snapshot) =>
      new Promise<void>((resolve, reject) => {
        const id = ++reqId;
        restores.set(id, { resolve, reject });
        post({ type: 'restore', reqId: id, snapshot });
      }),
    control: (m) => post(m),
    capture12: () =>
      new Promise<Capture12>((resolve, reject) => {
        const id = ++reqId;
        captures.set(id, { resolve, reject });
        post({ type: 'capture12', reqId: id });
      }),
    destroy: () => {
```

Replace with:

```ts
    command: (cmd) => request<DispatchResult>((reqId) => ({ type: 'command', reqId, cmd })),
    snapshot: () => request<PatientSnapshot>((reqId) => ({ type: 'snapshot', reqId })),
    restore: (snapshot) => request<void>((reqId) => ({ type: 'restore', reqId, snapshot })),
    control: (m) => post(m),
    capture12: () => request<Capture12>((reqId) => ({ type: 'capture12', reqId })), // Stage 4b
    destroy: () => {
      fail(new Error('the monitor was destroyed'), false);
```

In `packages/renderer/src/engine.worker.ts`, find:

```ts
        else scope.postMessage({ type: 'error', message: 'not initialised' });
```

Replace with:

```ts
        else scope.postMessage({ type: 'error', message: 'not initialised', reqId: m.reqId });
```

In `packages/renderer/src/engine.worker.ts`, find:

```ts
    scope.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
```

Replace with:

```ts
    // FU-11 (F06): a request that threw answers its own reqId, so the caller's promise rejects instead of waiting forever
    const reqId = 'reqId' in m ? m.reqId : undefined;
    scope.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err), ...(reqId !== undefined ? { reqId } : {}) });
```

In `packages/renderer/src/protocol.ts`, find:

```ts
  | { type: 'error'; message: string }
```

Replace with:

```ts
  | { type: 'error'; message: string; reqId?: number } // FU-11 (F06): reqId when a request failed inside the worker
```

In `apps/demo/src/app/main.ts`, find:

```ts
  const link = new Link(session.panel, session.panelTransport, session);
```

Replace with:

```ts
  const link = new Link(session.panel, session.panelTransport, session);
  // R50 M15: a monitor whose worker stopped is final (no fallback) — say so and name the way out; the reason goes to the
  // console for the gate note's diagnostics
  shell.monitorHost.addEventListener('pme-monitor-failed', (e) => {
    console.error('monitor failed:', (e as CustomEvent<{ reason: string }>).detail.reason);
    toast('The monitor stopped — Restart the patient');
  });
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 audit-worker fu11-monitor-failed`  
Expected: 12 passed (the silent cases reject at ≈ 3.0–4.3 s)

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run`  
Expected: all passed

Run: `npx playwright test --retries=0 stage6a-worker iife-smoke`  
Expected: passed (needs `npx -y pnpm@9.15.9 --filter @pme/renderer build` first)

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-worker.e2e.ts \
  apps/demo/e2e/fu11-monitor-failed.e2e.ts \
  apps/demo/src/app/main.ts \
  packages/renderer/src/engine.worker.ts \
  packages/renderer/src/protocol.ts \
  packages/renderer/src/worker-host.ts
git commit -m "fix(renderer,demo): every worker request settles once on failure, silence or destroy; a dead monitor says so (FU-11 C1, F06, BA06, R50 M15)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task C2: A failed monitor is a refusal the controller hears, not a stalled host (F06)

**Branch** `fu-11-a` · **Findings** F06 (the host-chain half) · **Files** Modify `packages/controller/src/session/host-session.ts`; Create `packages/controller/test/session/fu11-host-failure.test.ts`

**Why:** HostSession awaited `target.dispatch` inside its serial chain: a rejected promise skipped the ack and the
controller's command waited (on `f29951b` the test below times out). `apply()` now turns a throw or rejection into
`{ accepted: false, reason: 'the monitor could not apply it: …' }`; the ack goes out and the next command is applied.

**Interfaces:** Consumes C1 (the monitor now rejects instead of hanging).

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/session/fu11-host-failure.test.ts`:

```ts
// FU-11 Task C2 (external review F06, browser audit BA06): a target that rejects (a failed or destroyed worker) is a
// refusal the controller is told about, not a stall of the host's command chain.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { waitFor } from '../helpers.ts';

const S = 'HBD234';
const target = (e = createEngine({ seed: 3 })): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
let hs: HostSession | null = null;
afterEach(() => hs?.close());

describe('FU-11 C2: a failed target is a refusal, not a stall (F06)', () => {
  it('a dispatch that rejects is acked as refused with the reason, and the next command is applied', { timeout: 10_000 }, async () => {
    const e = createEngine({ seed: 3 });
    let broken = true;
    const t: HostTarget = { ...target(e), dispatch: (c) => (broken ? Promise.reject(new Error("the monitor's worker stopped responding")) : e.dispatch(c)) };
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: t, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: S, transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    const r1 = await ctl.send({ type: 'setTarget', variable: 'hr', value: 90 });
    expect(r1.accepted).toBe(false);
    expect(r1.reason).toMatch(/stopped responding/);
    broken = false;
    const r2 = await ctl.send({ type: 'setTarget', variable: 'hr', value: 95 });
    expect(r2.accepted).toBe(true);
    ctl.close();
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/fu11-host-failure.test.ts`  
Expected: 1 failed: "Test timed out in 10000ms"

- [ ] **Step 3 — implement.**

In `packages/controller/src/session/host-session.ts`, find:

```ts
  /** Dispatch one command; returns the result and the command as applied (with atTick). */
  private async apply(cmd: WireCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
```

Replace with:

```ts
  /**
   * FU-11 (F06, BA06): a target that throws or rejects (a failed or destroyed worker) answers with a refusal — the
   * controller gets its ack and the host's command chain moves on instead of waiting behind a promise that never settles.
   */
  private async apply(cmd: WireCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
    try {
      return await this.applyOnce(cmd);
    } catch (err) {
      const reason = `the monitor could not apply it: ${err instanceof Error ? err.message : String(err)}`;
      return { result: { accepted: false, tick: this.o.target.now().tick, reason }, applied: cmd };
    }
  }

  /** Dispatch one command; returns the result and the command as applied (with atTick). */
  private async applyOnce(cmd: WireCommand): Promise<{ result: DispatchResult; applied: WireCommand }> {
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/controller/src/session/host-session.ts \
  packages/controller/test/session/fu11-host-failure.test.ts
git commit -m "fix(controller): a target failure is acked as a refusal and the host chain moves on (FU-11 C2, F06)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part F — Remote ownership, presence and the host's speed (BA07, BA12, F18, K5) (branch `fu-11-a`)

### Task F1: The Remote owns the transports it creates (F18, BA07)

**Branch** `fu-11-a` · **Findings** F18, BA07 · **Files** Modify `packages/controller/src/remote/remote-app.ts`; Create `apps/demo/e2e/audit-remote.e2e.ts`

**Why:** `mountRemote` created a transport per join and closed none: after two joins and `destroy()` both were `open`
(reproduced on `f29951b`); the audit measured 51 open WebSocket transports and 51 live reconnect timers after 50
rejoins, and a destroyed remote reconnecting. The remote keeps its transport, closes it on rejoin and on destroy
(`ControllerSession.close()` keeps its non-owning meaning). The app's own Remote view (one join per page) is unchanged.

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/audit-remote.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA07 (the Remote owns its transports) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-controller.e2e.ts (its second test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
test('remote closes transports it creates on rejoin and destroy',async({page,audit})=>{
 await page.goto(audit.url);
 const states=await page.evaluate(async root=>{const C=await import('/@fs'+root+'/packages/controller/src/index.ts'),{createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');const ts:any[]=[];const remote=C.mountRemote(document.getElementById('monitor'),{vocabulary:C.vocabularyOf(createEngine()),vias:['broadcastChannel'],connect:(s:string)=>{const t=C.createBroadcastChannelTransport(s);ts.push(t);return t}});remote.join('ABC234','broadcastChannel');remote.join('ABC234','broadcastChannel');remote.destroy();const states=ts.map(t=>t.status);ts.forEach(t=>t.close());return states},audit.root);
 expect(states).toEqual(['closed','closed']);
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 audit-remote`  
Expected: 2 failed: ['open','open'] (expected ['closed','closed'])

- [ ] **Step 3 — implement.**

In `packages/controller/src/remote/remote-app.ts`, find:

```ts
  let off: (() => void) | null = null;

  const join = (code: string, via: Via): ControllerSession => {
    const s0 = normalizeSessionCode(code);
    if (!s0) throw new Error(`invalid session code ${code}`);
    off?.();
    session?.close();
    const s = new ControllerSession({ session: s0, transport: o.connect(s0, via), issuedBy: 'remote' });
```

Replace with:

```ts
  let transport: ManagedTransport | null = null; // FU-11 (F18, BA07): the remote OWNS the transport it creates
  let off: (() => void) | null = null;

  const join = (code: string, via: Via): ControllerSession => {
    const s0 = normalizeSessionCode(code);
    if (!s0) throw new Error(`invalid session code ${code}`);
    off?.();
    session?.close();
    transport?.close(); // FU-11 (F18, BA07): a rejoin closes the previous link (session.close() never owned it)
    transport = o.connect(s0, via);
    const s = new ControllerSession({ session: s0, transport, issuedBy: 'remote' });
```

In `packages/controller/src/remote/remote-app.ts`, find:

```ts
      session?.close();
      root.remove();
```

Replace with:

```ts
      session?.close();
      transport?.close(); // FU-11 (F18, BA07): no socket or reconnect timer outlives the remote
      transport = null;
      root.remove();
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 audit-remote`  
Expected: 2 passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/remote`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-remote.e2e.ts \
  packages/controller/src/remote/remote-app.ts
git commit -m "fix(controller): the remote closes the transports it creates on rejoin and destroy (FU-11 F1, F18, BA07)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task F2: The relay's "host left" reaches the session (BA12)

**Branch** `fu-11-a` · **Findings** BA12 · **Files** Modify `packages/controller/src/protocol.ts`, `packages/controller/src/session/controller-session.ts`, `packages/controller/src/transport/base.ts`, `packages/controller/src/transport/websocket.ts`; Create `packages/controller/test/session/fu11-presence.test.ts`, `apps/demo/e2e/audit-presence.e2e.ts`

**Why:** The WebSocket transport handed the relay's `{relay:'peers', hostOnline:false}` frame to an optional UI callback
only; `ControllerSession.hostOnline` stayed `true` (audit C04: 5 s observation, both browsers, reproduced on
`f29951b`). `ManagedTransport.onPresence?` (implemented by `TransportBase`, fed by the WebSocket transport) reports
presence; the session sets `hostOnline = false`, logs "host offline" and notifies; the host's hello sets it again.
BroadcastChannel has no presence signal (the audit's C04 BC variant was inconclusive): unchanged.

**Interfaces:** Produces: `ManagedTransport.onPresence?(fn: (p: { hostOnline: boolean }) => void): () => void`; `TransportBase.presence(p)` (protected).

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/session/fu11-presence.test.ts`:

```ts
// FU-11 Task F2 (browser audit BA12): the relay's "host left" reaches the session.
import { describe, expect, it } from 'vitest';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';

class Fake extends TransportBase {
  readonly kind = 'websocket' as const;
  protected write(): void {}
  protected teardown(): void {}
  open(): void {
    this.setStatus('open');
  }
  inject(m: WireMessage): void {
    this.deliver(m);
  }
  peers(hostOnline: boolean): void {
    this.presence({ hostOnline });
  }
}
const S = 'PRS234';
const host = createStamper(S, 'host-1');

describe('FU-11 F2: host presence (BA12)', () => {
  it('hostOnline goes false on a relay "host offline" notice and true again on the host hello', () => {
    const t = new Fake();
    const s = new ControllerSession({ session: S, transport: t });
    t.open();
    t.inject(host({ kind: 'hello', role: 'host' }));
    expect(s.hostOnline).toBe(true);
    t.peers(false);
    expect(s.hostOnline).toBe(false);
    expect(s.log.at(-1)?.text).toBe('host offline');
    t.inject(host({ kind: 'hello', role: 'host' }));
    expect(s.hostOnline).toBe(true);
    s.close();
  });
});
```

Create `apps/demo/e2e/audit-presence.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA12 (the relay's host-offline notice reaches the session) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-controller.e2e.ts (its fourth test); adapted: `spawn`/`once` imported statically (the demo tsconfig rejects the dynamic
// `node:events` import). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
// Real relay peer notification must reach the surviving controller session.
test('controller marks host offline after relay peer notice',async({page,audit})=>{
 const child=spawn(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {startRelay} from ${JSON.stringify(audit.root+'/packages/controller/relay/server.ts')};const r=await startRelay({host:'127.0.0.1',port:0});process.stdout.write(String(r.port)+'\\n');process.on('SIGTERM',async()=>{await r.close();process.exit(0)});`],{stdio:['ignore','pipe','pipe']});
 let stderr='';child.stderr!.on('data',b=>stderr+=b);
 try{
  const [data]=await once(child.stdout!,'data');const url='ws://127.0.0.1:'+String(data).trim();await page.goto(audit.url);
  await page.evaluate(async({root,url})=>{const C=await import('/@fs'+root+'/packages/controller/src/index.ts'),{createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');const e=createEngine();const ht=C.createWebSocketTransport({url}),frames:any[]=[];const rt=C.createWebSocketTransport({url,onRelayFrame:(f:any)=>frames.push(f)});const h=new C.HostSession({session:'ABC234',target:{dispatch:(c:any)=>e.dispatch(c),snapshot:()=>e.snapshot(),restore:(s:any)=>e.restore(s),on:(f:any)=>e.on(f),now:()=>e.now(),time:()=>{}},stateIntervalMs:0});h.addTransport(ht);const c=new C.ControllerSession({session:'ABC234',transport:rt});(window as any).offline={h,ht,rt,c,frames};},{root:audit.root,url});
  await expect.poll(()=>page.evaluate(()=>(window as any).offline.c.hostOnline)).toBe(true);
  await page.evaluate(()=>{const o=(window as any).offline;o.frames.length=0;o.h.close();o.ht.close()});
  await expect.poll(()=>page.evaluate(()=>(window as any).offline.frames.some((f:any)=>f.relay==='peers'&&!f.hostOnline))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).offline.c.hostOnline)).toBe(false);
 }finally{await page.evaluate(()=>{const o=(window as any).offline;if(o){o.c.close();o.rt.close();o.h.close();o.ht.close()}}).catch(()=>{});if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit')}}
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/fu11-presence.test.ts`  
Expected: 1 failed: hostOnline stays true

Run: `npx playwright test --retries=0 audit-presence`  
Expected: 2 failed: hostOnline true

- [ ] **Step 3 — implement.**

In `packages/controller/src/protocol.ts`, find:

```ts
  readonly status: TransportStatus;
}
```

Replace with:

```ts
  readonly status: TransportStatus;
  /**
   * FU-11 (BA12): who else is there, when the link knows it (the relay's `peers` frame). Absent on links that cannot
   * tell (BroadcastChannel, in-process): a session then learns presence from the host's hello and its 1 Hz state.
   */
  onPresence?(fn: (p: { hostOnline: boolean }) => void): () => void;
}
```

In `packages/controller/src/transport/base.ts`, find:

```ts
  private readonly statusFns = new Set<(s: TransportStatus) => void>();
  private current: TransportStatus = 'connecting';
```

Replace with:

```ts
  private readonly statusFns = new Set<(s: TransportStatus) => void>();
  private readonly presenceFns = new Set<(p: { hostOnline: boolean }) => void>(); // FU-11 (BA12)
  private current: TransportStatus = 'connecting';
```

In `packages/controller/src/transport/base.ts`, find:

```ts

  close(): void {
```

Replace with:

```ts

  /** FU-11 (BA12): presence reports from the link (only links that know call presence()). */
  onPresence(fn: (p: { hostOnline: boolean }) => void): () => void {
    this.presenceFns.add(fn);
    return () => {
      this.presenceFns.delete(fn);
    };
  }

  close(): void {
```

In `packages/controller/src/transport/base.ts`, find:

```ts

  /** Validate untrusted input, then hand it to the listeners. */
```

Replace with:

```ts

  protected presence(p: { hostOnline: boolean }): void {
    if (this.closed) return;
    for (const fn of [...this.presenceFns]) fn(p);
  }

  /** Validate untrusted input, then hand it to the listeners. */
```

In `packages/controller/src/transport/websocket.ts`, find:

```ts
        if (o.relay === 'error') this.setStatus('error');
        this.o.onRelayFrame?.(o);
```

Replace with:

```ts
        if (o.relay === 'error') this.setStatus('error');
        if (o.relay === 'peers') this.presence({ hostOnline: o.hostOnline }); // FU-11 (BA12): the session hears it too
        this.o.onRelayFrame?.(o);
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
      o.transport.onMessage((m) => this.onMessage(m)),
    ];
```

Replace with:

```ts
      o.transport.onMessage((m) => this.onMessage(m)),
      // FU-11 (BA12): the relay says the host left — the panel stops showing it as connected
      o.transport.onPresence?.((p) => {
        if (p.hostOnline || !this.hostOnline) return;
        this.hostOnline = false;
        this.addLog('status', 'host offline');
      }) ?? (() => undefined),
    ];
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session test/transport`  
Expected: all passed

Run: `npx playwright test --retries=0 audit-presence`  
Expected: 2 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-presence.e2e.ts \
  packages/controller/src/protocol.ts \
  packages/controller/src/session/controller-session.ts \
  packages/controller/src/transport/base.ts \
  packages/controller/src/transport/websocket.ts \
  packages/controller/test/session/fu11-presence.test.ts
git commit -m "fix(controller): a relay host-offline notice reaches the controller session (FU-11 F2, BA12)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task F3: Every controller shows the speed and pause the host runs at (K5)

**Branch** `fu-11-a` · **Findings** showcase kit K5, R50 M4 · **Files** Modify `apps/demo/src/app/sessionbar.ts`, `packages/controller/src/session/controller-session.ts`; Create `packages/controller/test/session/fu11-host-time.test.ts`, `apps/demo/e2e/fu11-pause-label.e2e.ts`

**Why:** The session bar's speed buttons and Pause kept local state: a Remote showed ×1 while the host ran ×4 (kit agent,
2026-10-04). `ControllerSession.timeScale` / `hostPaused` follow every applied `time` command, sticky replays included
(a late Remote learns the current speed on hello); the session bar draws from them. R50 M4: drawing Pause from the host alone made the label flicker back to "Pause" when the bar's 1 s redraw
ran before the host's answer (and a quick second click then sent the wrong action): while the bar's own pause/resume
request is unanswered it shows what was asked; then the host's state again. The e2e delays every command 1.5 s
(a slow host): measured on the old code `Resume ×5, Pause ×14, Resume ×6` in 2.5 s; now `Resume` throughout.

**Interfaces:** Produces: `ControllerSession.timeScale: number` (1 until told), `ControllerSession.hostPaused: boolean`.

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/session/fu11-host-time.test.ts`:

```ts
// FU-11 Task F3 (showcase kit K5): every controller knows the speed and pause the HOST runs at (a Remote showed ×1
// under a ×4 host).
import { describe, expect, it } from 'vitest';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';

class Fake extends TransportBase {
  readonly kind = 'websocket' as const;
  protected write(): void {}
  protected teardown(): void {}
  open(): void {
    this.setStatus('open');
  }
  inject(m: WireMessage): void {
    this.deliver(m);
  }
}
const S = 'PRS234';
const host = createStamper(S, 'host-1');

describe('FU-11 F3: the host\'s speed and pause (K5)', () => {
  it('follow applied time commands, sticky replays included', () => {
    const t = new Fake();
    const s = new ControllerSession({ session: S, transport: t });
    t.open();
    expect(s.timeScale).toBe(1);
    t.inject(host({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'x', tick: 0, resolved: { command: { id: 'x', issuedBy: 'i', type: 'time', action: 'scale', value: 4 }, replay: true } }] }));
    expect(s.timeScale).toBe(4);
    t.inject(host({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'y', tick: 0, resolved: { command: { id: 'y', issuedBy: 'i', type: 'time', action: 'pause' } } }] }));
    expect(s.hostPaused).toBe(true);
    s.close();
  });
});
```

Create `apps/demo/e2e/fu11-pause-label.e2e.ts`:

```ts
// FU-11 Task F3 (R50 M4): the session bar's Pause button shows what the instructor asked for while the host has not yet
// answered — the 1 s redraw from the host's state must not flip it back (a quick second click then sent the wrong action).
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { link: { send(c: unknown): Promise<unknown> } } };

test('Pause stays "Resume" while the host is slow to answer, and the host ends paused', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/teach', { warmMs: 1000 });
  // a slow host: every command reaches it 1.5 s late (two 1 s redraws of the bar fall inside that window)
  await page.evaluate(() => {
    const l = (window as unknown as W).__pmeApp.link;
    const send = l.send.bind(l);
    l.send = (c: unknown) => new Promise((r) => setTimeout(r, 1500)).then(() => send(c));
  });
  const pause = page.locator('.sessionbar').getByRole('button', { name: /^(Pause|Resume)$/ });
  await pause.click();
  const seen: string[] = [];
  for (let i = 0; i < 25; i++) {
    seen.push((await pause.textContent()) ?? '');
    await page.waitForTimeout(100);
  }
  expect(seen.every((s) => s === 'Resume'), seen.join(',')).toBe(true);
  await expect(pause).toHaveText('Resume');
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/fu11-host-time.test.ts`  
Expected: 1 failed: timeScale undefined

Run: `npx playwright test --retries=0 fu11-pause-label`  
Expected: 2 failed (written after the K5 change): the label goes back to "Pause" for ≈ 1.4 s

- [ ] **Step 3 — implement.**

In `packages/controller/src/session/controller-session.ts`, find:

```ts
  readonly scenario = new ScenarioView();
  private readonly o: ControllerSessionOptions;
```

Replace with:

```ts
  readonly scenario = new ScenarioView();
  /** FU-11 (K5): the host's simulation speed and pause, from its applied `time` commands (sticky replays included). */
  timeScale = 1;
  hostPaused = false;
  private readonly o: ControllerSessionOptions;
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
      const c = res?.command;
      if (c?.type === 'scenario' && c.action === 'bookmark' && c.target && !this.bookmarks.includes(c.target)) this.bookmarks = [...this.bookmarks, c.target];
```

Replace with:

```ts
      const c = res?.command;
      if (c?.type === 'time' && c.action === 'scale' && typeof c.value === 'number') this.timeScale = c.value; // FU-11 (K5)
      if (c?.type === 'time' && (c.action === 'pause' || c.action === 'resume')) this.hostPaused = c.action === 'pause';
      if (c?.type === 'scenario' && c.action === 'bookmark' && c.target && !this.bookmarks.includes(c.target)) this.bookmarks = [...this.bookmarks, c.target];
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
  const pause = button('Pause', () => {
    paused = !paused;
    void link.send({ type: 'time', action: paused ? 'pause' : 'resume' });
```

Replace with:

```ts
  let asking = 0; // R50 M4: own pause/resume requests not yet answered — until then the button shows what was asked
  const pause = button('Pause', () => {
    paused = !paused;
    asking++;
    void link.send({ type: 'time', action: paused ? 'pause' : 'resume' }).finally(() => (asking--, draw()));
```

In `apps/demo/src/app/sessionbar.ts`, find:

```ts
    setText(t, clock(link.simT));
  }, 500);
```

Replace with:

```ts
    setText(t, clock(link.simT));
    // FU-11 (K5): the speed and pause the HOST runs at, wherever they were set (a Remote showed ×1 under a ×4 host)
    const k = String(link.ctl.timeScale);
    if (speed.value !== k && ['1', '2', '4'].includes(k)) speed.set(k);
    if (!asking && paused !== link.ctl.hostPaused) {
      paused = link.ctl.hostPaused;
      pause.textContent = paused ? 'Resume' : 'Pause';
      pause.setAttribute('aria-pressed', String(paused));
    }
  }, 500);
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session`  
Expected: all passed

Run: `npx playwright test --retries=0 fu11-pause-label`  
Expected: 2 passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-pause-label.e2e.ts \
  apps/demo/src/app/sessionbar.ts \
  packages/controller/src/session/controller-session.ts \
  packages/controller/test/session/fu11-host-time.test.ts
git commit -m "fix(controller,demo): every controller shows the host's speed and pause; the Pause label waits for the host (FU-11 F3, K5, R50 M4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part D — Snapshot completeness and JSON-safe serialisation (BA02, BA03, F03, F12, F14, F26) (branch `fu-11-b`)

### Task D0: Branch, install, block check, the audit fixture and the before-numbers

**Branch** `fu-11-b` · **Findings** — · **Files** Create `apps/demo/e2e/audit-fixture.ts`

**Why:** Executor B owns Parts D, E and H (branch `fu-11-b`): the snapshot, the ONE timeline mechanism and the rehearsal
UI items (D3, D5, K3, H4 Sound off, H5 the Ventilator view's volume, H6 the cockpit across a new case). Branch `fu-11-d`
(the second-screen learner monitor, Part G) is built ON this branch and merged after it (R50 F11). The fixture is the
same file as A0's (identical content: the merge of the two branches is clean). This branch alone commits the plan
(R50 M6).

- [ ] **Step 1.** **Worktree and install.**
```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-fu-11-b -b fu-11-b origin/main
cd ../scratch/wt-fu-11-b && npx -y pnpm@9.15.9 install --frozen-lockfile
cp ../plans-backup/fu-11-hardening.md docs/plans/fu-11-hardening.md   # the ONE committed copy (R50 M6)
python3 ../plans-backup/fu-11-plan-tools/check-blocks.py --branch b docs/plans/fu-11-hardening.md .
```
Expected: `branch b: 53 find/replace blocks (0 chained), 23 creates; problems: 0`.

- [ ] **Step 2.** **Before-numbers** (`<scratchpad>/fu-11-b/before.txt`; R50 M3: record them, do not compare with this plan's): engine
fast set (`CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 --filter @pme/engine-core test`), controller, renderer, ventilator,
demo; and the FU-7 counters Gate B compares (R50 review §3): `npx -y pnpm@9.15.9 --filter @pme/validation validate
--suites sanity,gates --quick --out <scratchpad>/fu-11-b/validate-before`.

- [ ] **Step 3.** Create the fixture (below; identical to A0's), then commit:
```bash
git add apps/demo/e2e/audit-fixture.ts docs/plans/fu-11-hardening.md
git commit -m "test(demo): the browser audit's Playwright fixture; the FU-11 plan (FU-11 D0)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin fu-11-b
```

Create `apps/demo/e2e/audit-fixture.ts`:

```ts
// FU-11: the external browser audit's shared fixture (research/17; installed unchanged from audit-fixture.ts): a Vite
// server on apps/demo with configFile false and a one-element page; the tests import the packages' sources by /@fs.
import {test as base,expect} from '@playwright/test';
import {createServer} from 'vite';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import net from 'node:net';
export {expect};
export const test=base.extend<{}, {audit:{url:string,root:string}}>({audit:[async({},use,info)=>{
 const root=process.env.PME_AUDIT_REPO??resolve(import.meta.dirname,'../../..');
 const probe=net.createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const port=(probe.address() as net.AddressInfo).port;await new Promise<void>(r=>probe.close(()=>r()));
 const vite=await createServer({configFile:false,root:resolve(root,'apps/demo'),cacheDir:resolve(process.env.PME_AUDIT_OUTPUT??tmpdir(),`pme-regression-vite-${process.pid}-${info.workerIndex}`),publicDir:false,optimizeDeps:{noDiscovery:true,include:[]},server:{port,strictPort:true,host:'127.0.0.1',fs:{allow:[root]}},logLevel:'error',plugins:[{name:'audit-page',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/__regression.html'){res.setHeader('Content-Type','text/html');res.end('<button id="sound">Sound</button><div id="monitor" style="width:1080px;height:520px"></div>')}else next()})}}]});
 await vite.listen();try{await use({url:`http://127.0.0.1:${port}/__regression.html`,root})}finally{await vite.close()}
},{scope:'worker'}]});
```

### Task D1: A snapshot fully determines what follows: JSON-safe state and the pending stage groups (F03, F14, BA02, BA03)

**Branch** `fu-11-b` · **Findings** F03, F14, BA02, BA03 · **Files** Modify `packages/engine-core/src/engine.ts`; Create `packages/engine-core/src/snapshot-codec.ts`, `packages/engine-core/test/engine/fu11-snapshot-codec.test.ts`, `packages/engine-core/test/engine/fu11-snapshot-replay.test.ts`, `apps/demo/e2e/audit-snapshot.e2e.ts`

**Why:** Measured on `f29951b` (writer's probe over eight rigs): the state holds values JSON cannot carry — LVAD `qMin/qMax`
= ±Infinity, NaN in `hemo.num.abp.det.prev`, `hemo.num.pap.det.prev`, `hemo.av.off` (IABP) and
`resp.spont.paco2Set`, five −0 fields, and keys holding `undefined`. After `JSON.parse(JSON.stringify(snapshot))` the
first LVAD PI read 15.52 instead of 12.12 and the truth tree's `dropped` count changed (audit RF01 json-lvad, both
browsers). `snapshot-codec.ts` copies the state writing each such value as `{ "$nf": "NaN" | "Infinity" |
"-Infinity" | "-0" | "undefined" }` and decodes it on restore (raw structured-clone states still restore; the engine
version check already limits a snapshot to its own build). The physiology keeps its sentinels: no model file changes.
The engine's `groupTicks` (stageGroup → tick) lived outside the snapshot: a fresh engine restored from a snapshot with
a pending group put the next member on tick 350 instead of 250 (BA02), and an engine restored to an earlier snapshot
kept the discarded future's group (F03: tick 100 instead of 2). The pending groups (tick > now) are part of the
snapshot; restore REPLACES the map; committed groups are pruned at dispatch (the map no longer grows).
Readers of `snapshot().state` (tests, `apps/demo/src/stage7g.ts`, `packages/validation/src/oracle/blood-scenarios.ts`)
see tagged objects only where a value is non-finite, −0 or undefined: the fast set passes unchanged (prototype).

**Interfaces:** Produces: `encodeState(v: unknown): unknown`, `decodeState(v: unknown): unknown`, `NF_KEY = '$nf'`
(packages/engine-core/src/snapshot-codec.ts); the snapshot `state` gains `groups: Array<[string, number]>`; schema
string unchanged (`pme-snapshot/1`).

- [ ] **Step 1 — the failing tests.** 

Create `packages/engine-core/test/engine/fu11-snapshot-codec.test.ts`:

```ts
// FU-11 Task D1 (external review F14, browser audit BA03): the snapshot codec carries every value JSON cannot.
import { describe, expect, it } from 'vitest';
import { decodeState, encodeState } from '../../src/snapshot-codec.ts';

describe('FU-11 D1: snapshot codec', () => {
  it('NaN, ±Infinity, −0 and undefined survive JSON exactly, in objects and arrays', () => {
    const state = { a: Number.NaN, b: Infinity, c: -Infinity, d: -0, e: undefined, f: [1, Number.NaN, undefined, -0], g: { h: 'NaN', i: 2.5, j: null } };
    const back = decodeState(JSON.parse(JSON.stringify(encodeState(state)))) as typeof state;
    expect(Object.is(back.a, Number.NaN)).toBe(true);
    expect(back.b).toBe(Infinity);
    expect(back.c).toBe(-Infinity);
    expect(Object.is(back.d, -0)).toBe(true);
    expect('e' in back).toBe(true);
    expect(back.e).toBeUndefined();
    expect(back.f.length).toBe(4);
    expect(Object.is(back.f[1], Number.NaN)).toBe(true);
    expect(back.f[2]).toBeUndefined();
    expect(Object.is(back.f[3], -0)).toBe(true);
    expect(back.g).toEqual({ h: 'NaN', i: 2.5, j: null }); // a string 'NaN' stays a string
  });
  it('decoding leaves a raw structured-clone state as it is; Map, Set and typed arrays are refused when encoding', () => {
    const raw = { x: Number.NaN, y: [Infinity] };
    const d = decodeState(raw) as typeof raw;
    expect(Number.isNaN(d.x)).toBe(true);
    expect(d.y[0]).toBe(Infinity);
    expect(() => encodeState({ m: new Map() })).toThrow(/Map/);
    expect(() => encodeState({ t: new Float32Array(2) })).toThrow(/Float32Array/);
  });
});
```

Create `packages/engine-core/test/engine/fu11-snapshot-replay.test.ts`:

```ts
// FU-11 Task D1 (external review F03, F14; browser audit BA02, BA03): a snapshot fully determines what follows —
// through JSON, and with pending stage groups.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';

let n = 0;
const cmd = (x: Record<string, unknown>) => ({ id: `r${n++}`, issuedBy: 'test', ...x }) as never;
const record = (e: MonitorEngine) => {
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return ev;
};

describe('FU-11 D1: JSON round trip is exact (F14, BA03)', () => {
  for (const rig of ['default', 'lvad', 'iabp'] as const) {
    it(`${rig}: direct and JSON-restored engines emit the same events, truth included, for 10 s`, () => {
      const a = createEngine({ seed: 781, truthHz: 1, mode: 'modeled' });
      if (rig === 'lvad') a.dispatch(cmd({ type: 'device', action: { device: 'lvad', action: 'start' } }));
      if (rig === 'iabp') a.dispatch(cmd({ type: 'device', action: { device: 'iabp', action: 'start', ratio: 1 } }));
      a.advanceTo(30);
      const s = a.snapshot();
      const b = createEngine({ seed: 781, truthHz: 1, mode: 'modeled' });
      b.restore(JSON.parse(JSON.stringify(s)));
      const ea = record(a);
      const eb = record(b);
      a.advanceTo(40);
      b.advanceTo(40);
      expect(eb.length).toBe(ea.length);
      expect(eb).toEqual(ea);
    });
  }
});

describe('FU-11 D1: pending stage groups are part of the snapshot (F03, BA02)', () => {
  it('a fresh engine restored from a snapshot with a pending group lands the next member on the group tick', () => {
    const a = createEngine({ seed: 781 });
    a.advanceTo(3);
    a.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 100, stageGroup: 'g', atTick: 250 }));
    const b = createEngine({ seed: 781 });
    b.restore(JSON.parse(JSON.stringify(a.snapshot())));
    const next = { type: 'setTarget', variable: 'hr', value: 120, stageGroup: 'g', atTick: 350 };
    expect(b.dispatch(cmd(next))).toEqual(a.dispatch(cmd(next)));
    expect(a.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 90, stageGroup: 'g', atTick: 400 })).tick).toBe(250);
  });
  it('restoring an earlier snapshot forgets the discarded future group (two engines agree)', () => {
    const a = createEngine({ seed: 7 });
    const s0 = a.snapshot();
    a.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 90, stageGroup: 'g', atTick: 100 }));
    a.restore(s0);
    const b = createEngine({ seed: 7 });
    b.restore(s0);
    const c = { type: 'setTarget', variable: 'hr', value: 95, stageGroup: 'g', atTick: 2 };
    expect(a.dispatch(cmd(c)).tick).toBe(2);
    expect(b.dispatch(cmd(c)).tick).toBe(2);
  });
});
```

Create `apps/demo/e2e/audit-snapshot.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA02/BA03 (exact continuation after a JSON or pending-group restore) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-snapshot.e2e.ts (its first test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
// Desired invariants: red on reviewed commit until the implementation is fixed.
for(const kind of ['json-lvad','pending-group'])test(`snapshot fidelity: ${kind}`,async({page,audit})=>{
 await page.goto(audit.url);
 const r=await page.evaluate(async({root,kind})=>{
  const {createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');
  const a=createEngine({seed:781,truthHz:1});a.advanceTo(3);
  if(kind==='pending-group')a.dispatch({id:'first',issuedBy:'test',type:'setTarget',variable:'hr',value:100,stageGroup:'g',atTick:250});
  const s=structuredClone(a.snapshot()),b=createEngine({seed:781,truthHz:1});b.restore(kind==='json-lvad'?JSON.parse(JSON.stringify(s)):s);
  const ea:any[]=[],eb:any[]=[];a.on((e:any)=>ea.push(e));b.on((e:any)=>eb.push(e));
  const c=kind==='json-lvad'?{id:'next',issuedBy:'test',type:'device',action:{device:'lvad',action:'start'}}:{id:'next',issuedBy:'test',type:'setTarget',variable:'hr',value:120,stageGroup:'g',atTick:350};
  const acks=[a.dispatch(c),b.dispatch(c)];a.advanceTo(6);b.advanceTo(6);return {acks,ea,eb};
 },{root:audit.root,kind});
 expect(r.acks[1]).toEqual(r.acks[0]);expect(r.eb).toEqual(r.ea);
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-snapshot-codec.test.ts test/engine/fu11-snapshot-replay.test.ts`  
Expected: the codec file fails to import; 5 failed in replay (JSON rigs: events differ at `lvad.pi` / truth `dropped`; groups: tick 350 vs 250, 100 vs 2)

Run: `npx playwright test --retries=0 audit-snapshot`  
Expected: 4 failed: `lvad.pi` 15.52 vs 12.12; ack tick 350 vs 250

- [ ] **Step 3 — implement.**

Create `packages/engine-core/src/snapshot-codec.ts`:

```ts
// FU-11 (external review F14, browser audit BA03): a snapshot's `state` must survive JSON exactly. The pipeline state
// holds a few numbers JSON cannot carry — empty accumulators (LVAD qMin/qMax = ±Infinity), "not yet measured" markers
// (NaN: the pressure detectors' previous sample, the spontaneous-breathing set point, the IABP's valve-off time) and
// negative zeros — and JSON turns each into null or 0, so a bookmark saved to a file or sent over the relay restored a
// different patient; a key holding `undefined` vanished (the truth tree's `dropped` count changed). The codec copies the
// state and writes each such value as a tagged object { $nf: 'NaN' | 'Infinity' | '-Infinity' | '-0' | 'undefined' };
// decoding copies back. Decoding leaves raw non-finite numbers as they are, so a
// structured-clone snapshot from before this change (same build only — the engine version guards that) still restores.
// No model code changes: the physiology keeps its sentinels; only their transport form is defined here.

/** The tag key. No pipeline state object has a key that starts with `$`. */
export const NF_KEY = '$nf';
type NfTag = 'NaN' | 'Infinity' | '-Infinity' | '-0' | 'undefined';

function tagOf(n: number): NfTag | null {
  if (Number.isNaN(n)) return 'NaN';
  if (n === Infinity) return 'Infinity';
  if (n === -Infinity) return '-Infinity';
  if (n === 0 && Object.is(n, -0)) return '-0';
  return null;
}

const UNTAG: Record<NfTag, number | undefined> = { NaN: Number.NaN, Infinity: Infinity, '-Infinity': -Infinity, '-0': -0, undefined };

/** A deep copy of plain data (objects, arrays, primitives) in which every non-JSON number and `undefined` is a tagged object. */
export function encodeState(v: unknown): unknown {
  if (v === undefined) return { [NF_KEY]: 'undefined' };
  if (typeof v === 'number') {
    const t = tagOf(v);
    return t === null ? v : { [NF_KEY]: t };
  }
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(encodeState);
  if (ArrayBuffer.isView(v) || v instanceof Map || v instanceof Set) throw new TypeError(`snapshot state holds a ${v.constructor.name}, which JSON cannot carry`);
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) out[k] = encodeState(x);
  return out;
}

/** The inverse of encodeState (a deep copy); raw values pass through unchanged. */
export function decodeState(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(decodeState);
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  const tag = o[NF_KEY];
  if (keys.length === 1 && typeof tag === 'string' && Object.hasOwn(UNTAG, tag)) return UNTAG[tag as NfTag];
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = decodeState(o[k]);
  return out;
}
```

In `packages/engine-core/src/engine.ts`, find:

```ts
import { pruneTruth } from './truth.ts'; // Stage 7x (R52)
```

Replace with:

```ts
import { pruneTruth } from './truth.ts'; // Stage 7x (R52)
import { decodeState, encodeState } from './snapshot-codec.ts'; // FU-11 (F14, BA03)
```

In `packages/engine-core/src/engine.ts`, find:

```ts
  private readonly groupTicks = new Map<string, number>(); // Stage 2: stageGroup → tick (brief §4.9)
```

Replace with:

```ts
  private groupTicks = new Map<string, number>(); // Stage 2: stageGroup → tick (brief §4.9); FU-11 (F03, BA02): in the snapshot
```

In `packages/engine-core/src/engine.ts`, find:

```ts
      // Stage 2: commands sharing a stageGroup apply on the same tick (brief §4.9 "stage then commit")
      const g = this.groupTicks.get(cmd.stageGroup);
```

Replace with:

```ts
      // Stage 2: commands sharing a stageGroup apply on the same tick (brief §4.9 "stage then commit")
      for (const [k, at] of this.groupTicks) if (at <= this.tick) this.groupTicks.delete(k); // FU-11 (F03): committed groups end
      const g = this.groupTicks.get(cmd.stageGroup);
```

In `packages/engine-core/src/engine.ts`, find:

```ts
      state: structuredClone({ st: this.st, queue: this.queue, mainsHz: this.mainsHz, dev: this.dev }), // Stage 4b: dev
    };
  }
  restore(s: PatientSnapshot): void {
    if (s.schema !== 'pme-snapshot/1') throw new Error(`unknown snapshot schema ${String(s.schema)}`);
    // Exact replay is promised only on the same build and the same filter design (review L10).
    if (s.engineVersion !== this.version) throw new Error(`snapshot is from engine version ${s.engineVersion}, this is ${this.version}`);
    const data = structuredClone(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }>; mainsHz?: number; dev?: DeviceState };
```

Replace with:

```ts
      // Stage 4b: dev. FU-11: the pending stage groups (F03, BA02) and a JSON-safe encoding (F14, BA03: snapshot-codec.ts)
      state: encodeState({ st: this.st, queue: this.queue, mainsHz: this.mainsHz, dev: this.dev, groups: [...this.groupTicks].filter(([, at]) => at > this.tick) }),
    };
  }
  restore(s: PatientSnapshot): void {
    if (s.schema !== 'pme-snapshot/1') throw new Error(`unknown snapshot schema ${String(s.schema)}`);
    // Exact replay is promised only on the same build and the same filter design (review L10).
    if (s.engineVersion !== this.version) throw new Error(`snapshot is from engine version ${s.engineVersion}, this is ${this.version}`);
    const data = decodeState(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }>; mainsHz?: number; dev?: DeviceState; groups?: Array<[string, number]> };
```

In `packages/engine-core/src/engine.ts`, find:

```ts
    this.queue = data.queue;
    this.dev = data.dev ?? createDevice(this.devOpts?.skin, this.devOpts?.ageBand); // Stage 4b
```

Replace with:

```ts
    this.queue = data.queue;
    this.groupTicks = new Map(data.groups ?? []); // FU-11 (F03, BA02): the bookmark's pending groups, never the discarded future's
    this.dev = data.dev ?? createDevice(this.devOpts?.skin, this.devOpts?.ageBand); // Stage 4b
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-snapshot-codec.test.ts test/engine/fu11-snapshot-replay.test.ts test/engine/resp-engine.test.ts test/engine/truth-event.test.ts test/engine/neuro-engine.test.ts`  
Expected: all passed

Run: `npx playwright test --retries=0 audit-snapshot`  
Expected: 4 passed

Run: `CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 --filter @pme/engine-core test`  
Expected: all passed (prototype: 295 files / 1 283 passed with every FU-11 engine test)

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-snapshot.e2e.ts \
  packages/engine-core/src/engine.ts \
  packages/engine-core/src/snapshot-codec.ts \
  packages/engine-core/test/engine/fu11-snapshot-codec.test.ts \
  packages/engine-core/test/engine/fu11-snapshot-replay.test.ts
git commit -m "fix(engine): JSON-safe snapshots and the pending stage groups restore exactly (FU-11 D1, F03, F14, BA02, BA03)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task D2: The engine owns what it queued; a started engine can be stopped (F12, F26)

**Branch** `fu-11-b` · **Findings** F12, F26 · **Files** Modify `packages/engine-core/src/engine.ts`, `packages/engine-core/src/types.ts`; Create `packages/engine-core/test/engine/fu11-command-ownership.test.ts`

**Why:** `dispatch` queued the caller's object: HR 80 accepted for tick 10, then the caller's `value = 400` was applied
(reproduced: `hr.to` 400 on `f29951b`). The queue now holds `structuredClone(cmd)`, taken before validation; a command
that cannot be cloned (a function inside) is refused. `start()` created an interval nothing could clear: `stop()`
clears it (idempotent; `start()` may run again; `pause()` keeps its resumable meaning).

**Interfaces:** Produces: `MonitorEngine.stop(): void`.

- [ ] **Step 1 — the failing tests.** 

Create `packages/engine-core/test/engine/fu11-command-ownership.test.ts`:

```ts
// FU-11 Task D2 (external review F12, F26): the engine owns what it queued; a started engine can be stopped.
import { describe, expect, it, vi } from 'vitest';
import { createEngine } from '../../src/index.ts';

describe('FU-11 D2: the engine owns what it queued; a started engine can be stopped (F12, F26)', () => {
  it('editing a command object after dispatch changes nothing', () => {
    const e = createEngine({ seed: 7 });
    const c = { id: 'm', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 80, atTick: 10, ramp: { durationS: 0 } };
    expect(e.dispatch(c as never).accepted).toBe(true);
    c.value = 400;
    c.ramp.durationS = 60;
    e.advanceTo(2);
    const hr = (e.snapshot().state as { st: { hr: { to: number; durationS: number } } }).st.hr;
    expect(hr.to).toBe(80);
    expect(hr.durationS).toBe(0);
  });
  it('a command that is not plain data is refused', () => {
    const e = createEngine({ seed: 7 });
    const r = e.dispatch({ id: 'f', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 80, extra: () => 1 } as never);
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/plain data/);
  });
  it('stop() clears the interval start() created; stop twice is harmless; start runs again', () => {
    const set = vi.spyOn(globalThis, 'setInterval');
    const clear = vi.spyOn(globalThis, 'clearInterval');
    const e = createEngine({ seed: 7 });
    e.start();
    const handle = set.mock.results.at(-1)?.value;
    e.pause();
    expect(clear).not.toHaveBeenCalledWith(handle);
    e.stop();
    expect(clear).toHaveBeenCalledWith(handle);
    e.stop();
    e.start();
    expect(set).toHaveBeenCalledTimes(2);
    e.stop();
    set.mockRestore();
    clear.mockRestore();
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-command-ownership.test.ts`  
Expected: 3 failed (hr.to 400; a function-carrying command accepted; e.stop is not a function)

- [ ] **Step 3 — implement.**

In `packages/engine-core/src/engine.ts`, find:

```ts
  }
  resume(): void {
```

Replace with:

```ts
  }
  /**
   * FU-11 (F26): end start()'s interval. Idempotent; start() may run the engine again afterwards (the state is kept).
   * Engines a renderer drives (advanceTo per frame) never start a timer and need no stop.
   */
  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
  resume(): void {
```

In `packages/engine-core/src/engine.ts`, find:

```ts
  dispatch(cmd: Command): DispatchResult {
```

Replace with:

```ts
  dispatch(input: Command): DispatchResult {
    // FU-11 (F12): the queue keeps its OWN copy — a caller that edits its command object after dispatch (a staging
    // buffer, a UI form) can no longer change what was validated and accepted. Not plain data → refused.
    let cmd: Command;
    try {
      cmd = structuredClone(input);
    } catch {
      return { accepted: false, tick: this.tick, reason: 'a command must be plain data (no functions or class instances)' };
    }
```

In `packages/engine-core/src/types.ts`, find:

```ts
  pause(): void;
  resume(): void;
```

Replace with:

```ts
  pause(): void;
  /** FU-11 (F26): end start()'s interval (idempotent; start() may follow). */
  stop(): void;
  resume(): void;
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-command-ownership.test.ts test/engine/engine-commands.test.ts`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/engine-core/src/engine.ts \
  packages/engine-core/src/types.ts \
  packages/engine-core/test/engine/fu11-command-ownership.test.ts
git commit -m "fix(engine): the queue owns a copy of each command; stop() ends start()'s interval (FU-11 D2, F12, F26)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part E — ONE timeline-reset propagation for restore, scenario load and restart (BA01, BA04, BA05, F04, F05, F09, R50 F1) (branch `fu-11-b`)

### Task E1: Trends can be rewound (F05, BA01)

**Branch** `fu-11-b` · **Findings** F05, BA01 (trends) · **Files** Modify `packages/engine-core/src/l3/trends/trend-store.ts`; Create `packages/engine-core/test/l3/trends/fu11-trend-rewind.test.ts`

**Why:** `TrendStore` only moved forward: after a record to 100 s and a restore to 10 s, `latestS` stayed 100 and HR 120 of
the discarded future remained (review probe; audit R01: trend latest 5 after a restore to 1 s). `rewind(t)` empties
the seconds after floor(t) and sets the newest second to floor(t); a rewind older than the 8 h ring empties it; a
forward "rewind" is a no-op.

**Interfaces:** Produces: `TrendStore.rewind(t: number): void`.

- [ ] **Step 1 — the failing tests.** 

Create `packages/engine-core/test/l3/trends/fu11-trend-rewind.test.ts`:

```ts
// FU-11 Task E2 (external review F05, browser audit BA01): a rewind empties the discarded future of the trend ring.
import { describe, expect, it } from 'vitest';
import { TrendStore, TREND_SLOTS } from '../../../src/l3/trends/trend-store.ts';
import type { EngineEvent } from '../../../src/types.ts';

const hr = (t: number, v: number): EngineEvent => ({ type: 'measurement', t, values: { hr: { value: v, flag: 'valid', at: t } } }) as EngineEvent;

describe('FU-11 E2: TrendStore.rewind', () => {
  it('after a record to 100 s and a rewind to 10 s the future is gone and new seconds are kept', () => {
    const s = new TrendStore();
    for (let t = 0; t <= 100; t++) s.record(hr(t, 120));
    s.rewind(10.4);
    expect(s.latestS).toBe(10);
    expect(Number.isNaN(s.series('hr', 100, 100)[0] as number)).toBe(true);
    s.record(hr(11, 75));
    expect(s.latestS).toBe(11);
    expect(s.series('hr', 10, 11)).toEqual(new Float32Array([120, 75]));
  });
  it('a rewind older than the ring empties it, and a rewind forward is a no-op', () => {
    const s = new TrendStore();
    for (let t = TREND_SLOTS; t < TREND_SLOTS + 5; t++) s.record(hr(t, 90));
    s.rewind(3);
    expect(s.latestS).toBe(3);
    expect(Array.from(s.series('hr', 0, 3)).every(Number.isNaN)).toBe(true);
    s.record(hr(4, 70));
    expect(s.series('hr', 4, 4)[0]).toBe(70);
    s.rewind(50);
    expect(s.latestS).toBe(4);
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/trends/fu11-trend-rewind.test.ts`  
Expected: 2 failed: s.rewind is not a function

- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l3/trends/trend-store.ts`, find:

```ts

  /** Values of one numeric for seconds [fromS, toS] (NaN where missing or no longer held). */
```

Replace with:

```ts

  /**
   * FU-11 (F05, BA01): the timeline went back to sim time `t` (a bookmark restore). Every second after floor(t) belonged
   * to the discarded future: it is emptied and the newest second becomes floor(t), so the next measurements are kept
   * and a trend never shows a run that no longer happened. A rewind older than the ring empties it.
   */
  rewind(t: number): void {
    const keep = Math.floor(t + 1e-6);
    if (keep >= this.last) return;
    const from = Math.max(keep + 1, this.last - TREND_SLOTS + 1);
    for (let k = from; k <= this.last; k++) for (const a of this.data.values()) a[k % TREND_SLOTS] = Number.NaN;
    this.last = Math.max(-1, keep);
  }

  /** Values of one numeric for seconds [fromS, toS] (NaN where missing or no longer held). */
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/trends`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/engine-core/src/l3/trends/trend-store.ts \
  packages/engine-core/test/l3/trends/fu11-trend-rewind.test.ts
git commit -m "feat(engine): TrendStore.rewind empties the discarded future (FU-11 E1, F05)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task E2: A restore restarts the sweep, the trends and the tiles at the bookmark (F05, BA01)

**Branch** `fu-11-b` · **Findings** F05, BA01, the hotfix note "capnogram swap does not follow a restore" · **Files** Modify `packages/renderer/src/device-ui.ts`, `packages/renderer/src/engine.worker.ts`, `packages/renderer/src/monitor-core.ts`, `packages/renderer/src/mount.ts`, `packages/renderer/src/worker-host.ts`; Create `packages/renderer/test/fu11-restore-lanes.test.ts`, `apps/demo/e2e/audit-rewind.e2e.ts`

**Why:** Engine time went back on restore, but every `SweepLane` returned early until the new end index passed its old
`lastIndex` (the waveform froze until the old high-water time), the trends kept the future (E1), the tiles kept the
discarded run's numbers (a sensor the restored patient lacks kept its last value — seen on the second-screen probe),
and the skin's CO2 lane swap followed `attachSensor` only. `MonitorCore.restore(s)` restores the engine, sets the
clock, clears the overlay marks and relays out every lane (lanes backfill from the restored engine on the next frame);
the main and worker paths call it; `mount.restore` then rewinds the trends, resets `DeviceUI` (new `reset(t)`), the
sounder's last status and the NIBP/PI memory, moves the sim-clock estimate and re-derives the CO2 lane from the
snapshot's `st.resp.co2Sensor`. The event log is NOT rewound (a debrief record of what was done, rewinds included).

**Interfaces:** Consumes E1. Produces: `MonitorCore.restore(s: PatientSnapshot): void`; `DeviceUI.reset(t: number): void`.

- [ ] **Step 1 — the failing tests.** 

Create `packages/renderer/test/fu11-restore-lanes.test.ts`:

```ts
// FU-11 Task E2 (external review F05, browser audit BA01): a restore restarts the sweep at the snapshot's tick (the
// lanes waited for the old high-water time).
import { describe, expect, it } from 'vitest';
import { MonitorCore } from '../src/monitor-core.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const make = () => new MonitorCore({ width: 0, height: 0 }, new FakeCtx(), { cssW: 1056, cssH: 300, dpr: 1 }, { engine: { seed: 1, patient: { sensors: { spo2: 'on' } } }, waves: ['pleth'] }, () => undefined);
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
const frames = (c: MonitorCore, fromMs: number, toMs: number) => {
  for (let ms = fromMs; ms <= toMs; ms += 1000 / 60) c.frame(1_000_000 + ms);
};

describe('FU-11 E2: restore restarts the sweep', () => {
  it('after a restore from 5 s to 1 s every lane draws again within a frame', () => {
    const c = make();
    frames(c, 0, 1000);
    const s = c.engine.snapshot();
    frames(c, 1000, 5000);
    c.restore(s);
    expect(c.engine.now().tick).toBe(s.tick);
    expect(lanes(c).every((l) => l.lastDrawnIndex === -1)).toBe(true);
    frames(c, 5000, 5100);
    expect(lanes(c).every((l) => l.lastDrawnIndex > 0)).toBe(true);
    for (const l of lanes(c)) expect(l.lastDrawnIndex).toBeLessThan(l.cfg.rate * 1.3); // drawn on the restored timeline
  });
});
```

Create `apps/demo/e2e/audit-rewind.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA01 (a rewind resets the trend timeline and the waveform) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-snapshot.e2e.ts (its second test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
for(const mode of ['off','auto'])test(`rewind resets trend timeline and waveform: ${mode}`,async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async({root,mode})=>{const {mountMonitor}=await import('/@fs'+root+'/packages/renderer/src/mount.ts');(window as any).m=mountMonitor(document.getElementById('monitor'),{worker:mode,engine:{seed:7}});await (window as any).m.renderPath},{root:audit.root,mode});
 const tick=()=>page.evaluate(async()=>(await (window as any).m.snapshot()).tick);
 await expect.poll(tick).toBeGreaterThanOrEqual(50);await page.evaluate(async()=>{(window as any).s=await (window as any).m.snapshot()});
 await expect.poll(tick,{timeout:10000}).toBeGreaterThanOrEqual(250);await page.evaluate(()=>(window as any).m.restore((window as any).s));
 await expect.poll(tick).toBeGreaterThanOrEqual(100);
 const a=await page.screenshot({clip:{x:0,y:50,width:870,height:210}});
 await expect.poll(tick).toBeGreaterThanOrEqual(125);
 const b=await page.screenshot({clip:{x:0,y:50,width:870,height:210}});
 const r=await page.evaluate(async()=>({t:(await (window as any).m.snapshot()).tick*.02,trend:(window as any).m.trends.latestS}));
 await page.evaluate(()=>(window as any).m.destroy());
 expect.soft(b.equals(a),'waveform must advance after rewind').toBe(false);expect(r.trend).toBeLessThanOrEqual(Math.floor(r.t));
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/fu11-restore-lanes.test.ts`  
Expected: 1 failed: c.restore is not a function

Run: `npx playwright test --retries=0 audit-rewind`  
Expected: 4 failed: 'waveform must advance after rewind' and trend latest 5 > 2 (main and worker paths)

- [ ] **Step 3 — implement.**

In `packages/renderer/src/mount.ts`, find:

```ts

  /** The plan for the current skin, with the ECG leads chosen on this skin kept. */
```

Replace with:

```ts

  /**
   * FU-11 (F05, BA01): after a restore the trends forget the discarded future, the sim clock estimate starts at the
   * bookmark, and a skin's CO2 lane follows the restored sampling line (showcase hotfix note: the swap followed
   * attachSensor only). The sampling-line state is read from the snapshot (`st.resp.co2Sensor`, a string the codec keeps).
   */
  const afterRestore = (s: PatientSnapshot, h: Host) => {
    const t = s.tick * 0.02;
    trends.rewind(t);
    ui?.reset(t); // the tiles and the alarm header refill from the restored engine
    lastStatus = null;
    nibpLast = null;
    lastPi = undefined;
    anchor = { simT: t, perfMs: performance.now(), timeScale: anchor.timeScale };
    const line = (s.state as { st?: { resp?: { co2Sensor?: string } } } | null)?.st?.resp?.co2Sensor;
    if (line !== undefined) setCo2(line !== 'off', h);
  };
  /** The plan for the current skin, with the ECG leads chosen on this skin kept. */
```

In `packages/renderer/src/mount.ts`, find:

```ts
    restore: (s) => hostP.then((h) => h.restore(s)),
```

Replace with:

```ts
    restore: (s) =>
      hostP.then(async (h) => {
        await h.restore(s);
        afterRestore(s, h);
      }),
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
    restore: async (s) => {
      core.engine.restore(s);
      core.clock.setTick(s.tick);
    },
```

Replace with:

```ts
    restore: async (s) => core.restore(s), // FU-11 (F05, BA01): the lanes restart with the engine
```

In `packages/renderer/src/engine.worker.ts`, find:

```ts
          core.engine.restore(m.snapshot);
          core.clock.setTick(m.snapshot.tick);
```

Replace with:

```ts
          core.restore(m.snapshot); // FU-11 (F05, BA01): the lanes restart with the engine
```

In `packages/renderer/src/device-ui.ts`, find:

```ts

  /** Repaint for sim time t (called with every event batch, ≤ 4 Hz). */
```

Replace with:

```ts

  /**
   * FU-11 (F05, BA01): the timeline went back (a bookmark restore, or a viewer's resync). The numerics, the NIBP result
   * and the alarm and device status belonged to the discarded run — a sensor the restored patient does not have would
   * otherwise keep its last number; they are cleared and refill from the restored engine's next events (≤ 1 s).
   */
  reset(t: number): void {
    this.values = {};
    this.nibpLast = null;
    this.nibpEv = undefined;
    this.nibpPr = null;
    this.status = null;
    this.dev = null;
    this.paint(t);
  }

  /** Repaint for sim time t (called with every event batch, ≤ 4 Hz). */
```

In `packages/renderer/src/monitor-core.ts`, find:

```ts
import { capture12, Clock, createEngine, type Capture12, type Command, type DispatchResult, type EngineEvent, type LeadId, type MonitorEngine } from '@pme/engine-core';
```

Replace with:

```ts
import { capture12, Clock, createEngine, type Capture12, type Command, type DispatchResult, type EngineEvent, type LeadId, type MonitorEngine, type PatientSnapshot } from '@pme/engine-core';
```

In `packages/renderer/src/monitor-core.ts`, find:

```ts
    return capture12(this.engine);
  }
```

Replace with:

```ts
    return capture12(this.engine);
  }

  /**
   * FU-11 (F05, BA01): restore the engine and start the sweep afresh at the snapshot's tick. Every lane forgets what it
   * drew (a SweepLane draws only forward, so after a rewind it waited for the old high-water time), the overlay marks
   * of the discarded future go, and the lanes backfill from the restored engine on the next frame.
   */
  restore(s: PatientSnapshot): void {
    this.engine.restore(s);
    this.clock.setTick(s.tick);
    this.overlays.clear();
    this.layout();
  }
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run`  
Expected: all passed

Run: `npx playwright test --retries=0 audit-rewind`  
Expected: 4 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-rewind.e2e.ts \
  packages/renderer/src/device-ui.ts \
  packages/renderer/src/engine.worker.ts \
  packages/renderer/src/monitor-core.ts \
  packages/renderer/src/mount.ts \
  packages/renderer/src/worker-host.ts \
  packages/renderer/test/fu11-restore-lanes.test.ts
git commit -m "fix(renderer): a restore restarts the sweep, trends, tiles and the CO2 lane at the bookmark (FU-11 E2, F05, BA01)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task E3: ONE timeline mechanism: a bookmark restore is a `timeline` too; viewers follow it (F04, F09, BA04, BA05)

**Branch** `fu-11-b` · **Findings** F04, F09, BA04, BA05; hotfix notes "ViewerSync ignores timeline", "ECG lead/filter kept across a restart" · **Files** Modify `packages/controller/src/protocol.ts`, `packages/controller/src/session/controller-session.ts`, `packages/controller/src/session/host-session.ts`, `packages/controller/src/session/viewer-sync.ts`; Create `packages/controller/test/session/fu11-timeline-restore.test.ts`, `apps/demo/e2e/audit-timeline.e2e.ts`

**Why:** The showcase hotfix added the `timeline` wire event for a NEW engine (restart, scenario load). A bookmark restore
did not send it: the controller's clock stayed at the old high-water time (BA05: 5 s after a restore to 1 s) and a
viewer kept its old anchor and jumped toward the discarded future (BA04: viewer 4.9 s, host 1 s). Built on the same
event, not a second mechanism: `timeline` gains `cause: 'restart' | 'restore'` (absent = restart, the hotfix's
meaning). `HostSession.newTimeline(cause)` clears the stage groups and set targets on both; a restart also ends the
scenario stickies and the old engine's ECG lead/filter stickies (a late joiner was told the old monitor's leads); a
restore keeps the scenario (the driver restored its runner and publishes its state). Both restore paths (the driver's
hook and the plain bookmark) call `newTimeline('restore')`. `ControllerSession` restarts its clock on any timeline and
ends the scenario only on a restart. `ViewerSync` drops its anchor on a timeline and on a host hello and resyncs (a
restart sends no hello: before, a viewer mirrored onto the old body until a beat drifted). R50 F5 (found while fixing it): a host hello from a NEW host (the instructor's page reloaded under the
same code) also resets the viewer's idea of the host's speed and pause — the new host replays its own sticky `time`
commands to the viewer's hello, but one that never set a speed replays none, and a viewer that had followed a ×4 host
ran at ×4 against a ×1 host (measured: follower 2.3 s ahead after 8 s, tiles never equal).

**Interfaces:** Produces: `TimelineCause = 'restart' | 'restore'` (protocol.ts); `HostSession.newTimeline(cause: TimelineCause = 'restart')`.
Consumers of the hotfix's `newTimeline()` keep working (default 'restart').

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/session/fu11-timeline-restore.test.ts`:

```ts
// FU-11 Tasks E3–E4 (external review F04, F09; browser audit BA04, BA05; showcase-hotfix notes): ONE timeline mechanism —
// the hotfix's `timeline` event — now also marks a bookmark restore. Controllers' clocks go back with the engine (the
// scenario run continues); a viewer drops its old anchor and resyncs; a restart also clears the old engine's ECG chrome.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'TLB234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());

function rig() {
  const a = createEngine({ seed: 7 });
  const b = createEngine({ seed: 7 });
  a.advanceTo(1);
  const hub = createInProcessHub();
  const t: HostTarget = { dispatch: (c) => a.dispatch(c), snapshot: () => a.snapshot(), restore: (s) => a.restore(s), on: (f) => a.on(f), now: () => a.now(), time: () => undefined };
  hs = new HostSession({ session: S, target: t, stateIntervalMs: 0, wallNow: () => 0 });
  hs.addTransport(hub.connect());
  const raw = collect(hub.connect());
  const ctl = new ControllerSession({ session: S, transport: hub.connect(), wallNow: () => 0 });
  const viewer = new ViewerSync({
    session: S, transport: hub.connect(), engineVersion: b.version, wallNow: () => 0,
    target: { restore: (s) => b.restore(s), dispatch: (c) => b.dispatch(c), on: (f, ty) => b.on(f, ty), renderT: () => b.now().simT, tick: () => b.now().tick, setRate: () => undefined, setPaused: () => undefined, jumpTo: (x) => b.advanceTo(x) },
  });
  return { a, b, hs, raw, ctl, viewer };
}

describe('FU-11 E3: a bookmark restore is a new timeline (F04, F09; BA04, BA05)', () => {
  it('controller and viewer adopt the restored time; the old anchor does not pull the viewer forward', async () => {
    const r = rig();
    await waitFor(() => r.viewer.status === 'synced');
    await r.hs.submit({ id: 'mark', issuedBy: 'test', type: 'scenario', action: 'bookmark', target: 'one' });
    r.a.advanceTo(5);
    r.hs.emitState();
    r.hs.flush();
    await waitFor(() => (r.ctl.simT ?? 0) >= 5);
    await r.hs.submit({ id: 'back', issuedBy: 'test', type: 'scenario', action: 'restoreBookmark', target: 'one' });
    await waitFor(() => r.viewer.resyncs > 0 && r.viewer.status === 'synced');
    r.viewer.follow();
    expect(r.b.now().simT).toBeLessThan(2);
    expect(r.ctl.simT).toBeLessThan(2);
    const ev = r.raw.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body);
    expect(ev.find((e) => e.type === 'timeline')).toMatchObject({ type: 'timeline', cause: 'restore', tick: 50 });
    r.ctl.close();
    r.viewer.close();
  });
});

describe('FU-11 E3 (R50 F5): a reloaded host is a new host — its speed, not the old one\'s', () => {
  it('a viewer that followed a ×4 host runs at ×1 after a new host (that never set a speed) says hello', async () => {
    const hub = createInProcessHub();
    const tx = hub.connect();
    const rates: number[] = [];
    const b = createEngine({ seed: 7 });
    const viewer = new ViewerSync({
      session: S, transport: hub.connect(), engineVersion: b.version, wallNow: () => 0, delayS: 0,
      target: { restore: (s) => b.restore(s), dispatch: (c) => b.dispatch(c), on: (f, ty) => b.on(f, ty), renderT: () => b.now().simT, tick: () => b.now().tick, setRate: (k) => rates.push(k), setPaused: () => undefined, jumpTo: () => undefined },
    });
    const old = createStamper(S, 'host-old');
    const scale: WireEvent = { type: 'commandApplied', commandId: 'x4', tick: 0, resolved: { command: { id: 'x4', issuedBy: 'i', type: 'time', action: 'scale', value: 4 }, replay: true } };
    tx.send(old({ kind: 'event', body: [scale] }));
    tx.send(old({ kind: 'snapshot', body: b.snapshot() }));
    await waitFor(() => viewer.status === 'synced');
    tx.send(old({ kind: 'event', body: [{ type: 'state', t: 0, tick: 0, mode: 'manual', values: {}, control: {} } as unknown as WireEvent] }));
    await new Promise((r) => setTimeout(r, 0));
    viewer.follow();
    expect(rates.at(-1)).toBeGreaterThan(3); // following the ×4 host
    const fresh = createStamper(S, 'host-new'); // the instructor reloaded: same code, a new host, no speed set
    tx.send(fresh({ kind: 'hello', role: 'host' }));
    tx.send(fresh({ kind: 'snapshot', body: b.snapshot() }));
    await waitFor(() => viewer.status === 'synced');
    tx.send(fresh({ kind: 'event', body: [{ type: 'state', t: 0, tick: 0, mode: 'manual', values: {}, control: {} } as unknown as WireEvent] }));
    await new Promise((r) => setTimeout(r, 0));
    viewer.follow();
    expect(rates.at(-1)).toBeLessThan(1.2);
    viewer.close();
  });
});

describe('FU-11 E4: the timeline cause decides what ends', () => {
  const host = createStamper(S, 'host-1');
  const loaded: WireEvent = { type: 'commandApplied', commandId: 'load', tick: 0, resolved: { command: { id: 'load', issuedBy: 'i', type: 'scenario', action: 'load', doc: { id: 'D', version: 1, title: 'D', initialState: 'a', states: [{ id: 'a' }] } } } };
  it('restore keeps the scenario run; restart (or no cause) ends it', async () => {
    const hub = createInProcessHub();
    const tx = hub.connect();
    const ctl = new ControllerSession({ session: S, transport: hub.connect() });
    tx.send(host({ kind: 'event', body: [loaded, { type: 'scenario', t: 0, stateId: 'a' }, { type: 'timeline', t: 0, tick: 0, cause: 'restore' }] }));
    await waitFor(() => ctl.simT === 0);
    expect(ctl.scenario.doc?.id).toBe('D');
    tx.send(host({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0 }] }));
    await waitFor(() => ctl.scenario.doc === null);
    ctl.close();
  });
  it('a restart forgets the old engine\'s lead and filter for late joiners; a restore keeps them', async () => {
    const e = createEngine({ seed: 3 });
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined }, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: S, transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    expect((await ctl.send({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V5', lane: 0 } } as never)).accepted).toBe(true);
    const late = async () => {
      const t = hub.connect();
      const got = collect(t);
      t.send(createStamper(S, `late-${Math.random()}`)({ kind: 'hello', role: 'viewer' }));
      await waitFor(() => got.some((m) => m.kind === 'snapshot'));
      return got.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body).filter((x) => x.type === 'commandApplied');
    };
    hs.newTimeline('restore');
    expect((await late()).length).toBe(1);
    hs.newTimeline('restart');
    expect((await late()).length).toBe(0);
    ctl.close();
  });
});
```

Create `apps/demo/e2e/audit-timeline.e2e.ts`:

```ts
// FU-11: the external browser audit's regression for BA04/BA05 (viewer anchor, controller clock after a restore) (research/17; ChatGPT, baseline b2a0292), installed
// unchanged from audit-controller.e2e.ts (its first test). Red on origin/main; the task named in docs/plans/fu-11-hardening.md turns it green.
import {test,expect} from './audit-fixture';
// Public controller/session APIs; in-process delivery makes the rewind boundary deterministic.
test('viewer and controller adopt the restored timeline',async({page,audit})=>{
 await page.goto(audit.url);
 await page.evaluate(async root=>{
  const C=await import('/@fs'+root+'/packages/controller/src/index.ts'),{createEngine}=await import('/@fs'+root+'/packages/engine-core/src/index.ts');
  const a=createEngine({seed:7}),b=createEngine({seed:7}),hub=C.createInProcessHub();a.advanceTo(1);
  const hs=new C.HostSession({session:'ABC234',target:{dispatch:(c:any)=>a.dispatch(c),snapshot:()=>a.snapshot(),restore:(s:any)=>a.restore(s),on:(fn:any)=>a.on(fn),now:()=>a.now(),time:()=>{}},stateIntervalMs:0,wallNow:()=>0});hs.addTransport(hub.connect());
  const controller=new C.ControllerSession({session:'ABC234',transport:hub.connect(),wallNow:()=>0});
  const viewer=new C.ViewerSync({session:'ABC234',transport:hub.connect(),engineVersion:b.version,wallNow:()=>0,target:{restore:(s:any)=>b.restore(s),dispatch:(c:any)=>b.dispatch(c),on:(fn:any,types:any)=>b.on(fn,types),renderT:()=>b.now().simT,tick:()=>b.now().tick,setRate:()=>{},setPaused:()=>{},jumpTo:(t:number)=>b.advanceTo(t)}});
  (window as any).c={a,b,hs,controller,viewer};
 },audit.root);
 await expect.poll(()=>page.evaluate(()=>(window as any).c.viewer.status)).toBe('synced');
 await page.evaluate(async()=>{const {a,hs}= (window as any).c;await hs.submit({id:'mark',issuedBy:'test',type:'scenario',action:'bookmark',target:'one'});a.advanceTo(5);hs.emitState();hs.flush()});
 await expect.poll(()=>page.evaluate(()=>(window as any).c.controller.simT)).toBeGreaterThanOrEqual(5);
 await page.evaluate(async()=>{const {hs}=(window as any).c;await hs.submit({id:'restore',issuedBy:'test',type:'scenario',action:'restoreBookmark',target:'one'})});
 await expect.poll(()=>page.evaluate(()=>(window as any).c.viewer.resyncs)).toBeGreaterThan(0);
 await expect.poll(()=>page.evaluate(()=>(window as any).c.viewer.status)).toBe('synced');
 const r=await page.evaluate(()=>{const c=(window as any).c;c.viewer.follow();const r={viewer:c.b.now().simT,controller:c.controller.simT};c.viewer.close();c.controller.close();c.hs.close();return r});
 expect.soft(r.viewer).toBeLessThan(2);expect(r.controller).toBeLessThan(2);
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/fu11-timeline-restore.test.ts`  
Expected: 4 failed (controller 5 / viewer 4.9 after the restore; restore ends the scenario; the lead sticky survives a restart; a viewer of a ×4 host keeps rate 4 after a new host's hello)

Run: `npx playwright test --retries=0 audit-timeline`  
Expected: 2 failed: viewer 4.9 < 2, controller 5 < 2

- [ ] **Step 3 — implement.**

In `packages/controller/src/session/host-session.ts`, find:

```ts
  type TimeCommand,
  type WireBody,
```

Replace with:

```ts
  type TimeCommand,
  type TimelineCause,
  type WireBody,
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  newTimeline(): void {
    this.flush();
    this.groups.clear();
    this.targets.clear();
    this.sticky.delete('scenario.load');
    this.sticky.delete('scenario.run');
    const { tick, simT } = this.o.target.now();
    this.queue({ type: 'timeline', t: simT, tick });
```

Replace with:

```ts
  newTimeline(cause: TimelineCause = 'restart'): void {
    this.flush();
    this.groups.clear();
    this.targets.clear();
    if (cause === 'restart') {
      this.sticky.delete('scenario.load');
      this.sticky.delete('scenario.run');
      // FU-11 (showcase hotfix note): the old engine's lead and filter choices are not the new monitor's
      for (const k of [...this.sticky.keys()]) if (k.startsWith('ecg.')) this.sticky.delete(k);
    }
    const { tick, simT } = this.o.target.now();
    this.queue({ type: 'timeline', t: simT, tick, cause });
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
      await this.o.target.restore(snap);
      queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' })); // viewers re-hello and resync
```

Replace with:

```ts
      await this.o.target.restore(snap);
      this.newTimeline('restore'); // FU-11 (F09, BA05): every controller's clock goes back with the engine
      queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' })); // viewers re-hello and resync
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    if (c.action === 'restoreBookmark') queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' }));
```

Replace with:

```ts
    if (c.action === 'restoreBookmark') {
      this.newTimeline('restore'); // FU-11 (F09, BA05)
      queueMicrotask(() => this.broadcast({ kind: 'hello', role: 'host' }));
    }
```

In `packages/controller/src/protocol.ts`, find:

```ts
  | { type: 'timeline'; t: SimSeconds; tick: Tick };
```

Replace with:

```ts
  | { type: 'timeline'; t: SimSeconds; tick: Tick; cause?: TimelineCause };
/**
 * FU-11 (F04, F05, F09; BA01, BA04, BA05): why a timeline began. 'restart' (the default; the showcase hotfix's case): a
 * new engine — the scenario run ended with the old body. 'restore': the same engine went back to a bookmark — the
 * scenario run continues from the bookmark's state (the driver publishes it). Either way every clock restarts at `t`.
 */
export type TimelineCause = 'restart' | 'restore';
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
      // a new engine (patient restart, scenario load): the clock restarts; the old run ended with the old body
      this.simT = e.t;
      this.scenario.reset();
```

Replace with:

```ts
      // a new engine (patient restart, scenario load): the clock restarts; the old run ended with the old body.
      // FU-11 (F09, BA05): a bookmark restore starts a timeline too — the clock goes back, the scenario run continues.
      this.simT = e.t;
      if (e.cause !== 'restore') this.scenario.reset();
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
  private requestSync(): void {
```

Replace with:

```ts
  /** `newTimeline`: the host's clock may have gone back — the old anchor must not steer the restored engine (F04, BA04). */
  private requestSync(newTimeline = false): void {
    if (newTimeline) this.anchor = null;
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
    if (m.kind === 'hello' && m.role === 'host') return this.requestSync(); // host (re)started or restored a bookmark
```

Replace with:

```ts
    if (m.kind === 'hello' && m.role === 'host') {
      // host (re)started, reloaded or restored a bookmark. R50 F5: a reloaded host has its own speed and pause — the old
      // host's are forgotten here; the sticky time commands it replays to our hello set them again
      this.hostRate = 1;
      this.hostPaused = false;
      return this.requestSync(true);
    }
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
  private onEvent(e: WireEvent): void {
    if (e.type === 'state') {
```

Replace with:

```ts
  private onEvent(e: WireEvent): void {
    // FU-11 (showcase hotfix note; F04, BA04): a new timeline (patient restart, bookmark restore) — drop the anchor and
    // take a fresh snapshot; a restart sends no host hello, so without this the viewer mirrored onto the old body
    if (e.type === 'timeline') return this.requestSync(true);
    if (e.type === 'state') {
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run`  
Expected: all passed (timeline-reset.test.ts from the hotfix unchanged)

Run: `npx playwright test --retries=0 audit-timeline`  
Expected: 2 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/audit-timeline.e2e.ts \
  packages/controller/src/protocol.ts \
  packages/controller/src/session/controller-session.ts \
  packages/controller/src/session/host-session.ts \
  packages/controller/src/session/viewer-sync.ts \
  packages/controller/test/session/fu11-timeline-restore.test.ts
git commit -m "fix(controller): a bookmark restore starts a timeline; viewers drop the old anchor (FU-11 E3, F04, F09, BA04, BA05)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task E3b: The Ventilator view's link follows a restore of the engine (R50 F1, Critical)

**Branch** `fu-11-b` · **Findings** R50 F1 · **Files** Modify `packages/ventilator/src/link/port.ts`; Create `packages/ventilator/test/fu11-link-restore.test.ts`, `apps/demo/e2e/fu11-vent-restore.e2e.ts`

**Why:** The monitor side of the ventilator link (`attachMonitorToLink`, port.ts) learns an offset between the cockpit's
ticks and the engine's from its first frame and stamps every later frame with it. A bookmark restore moves the engine
back; the offset stayed, every frame landed in the restored future (50 s late after a 50 s rewind) and no new clock
was published: the cockpit stopped ventilating the patient while its own screen looked normal (R50 F1 measured SpO2
92 → 64 after "Return here"; writer's red: CO2 0, SpO2 88 vs 94). The engine's restore emits its marker — a
`toneCancel` WITHOUT ids (engine.ts restore: "a different timeline: every tone after now is void"; device tone
cancels always carry ids) — and the link starts a new generation on it: the next frame probes, the clock is published
from the restored tick. Event times alone cannot tell (a first attempt keyed on an event older than now − LEAD broke
`ports.test`: breaths and beats carry times seconds back).

**Interfaces:** Consumes D1 (the restore) and the engine's restore marker. E4 depends on this task (the button comes back only with it).

- [ ] **Step 1 — the failing tests.** 

Create `packages/ventilator/test/fu11-link-restore.test.ts`:

```ts
// FU-11 Task E3b (R50 F1): the Ventilator-view link follows a bookmark restore of the engine it drives — frames are
// stamped on the restored timeline (not 50 s in its future) and the ventilator gets its clock again.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, LEAD_TICKS, PROFILES, type LinkMsg } from '../src/index.ts';

describe('FU-11 E3b: the link after a restore', () => {
  it('after a 50 s rewind the next frames land within the lead of the engine and a clock is published', { timeout: 30_000 }, async () => {
    const [ventPort, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    const scheduled: Array<{ at: number; engine: number }> = [];
    const mon = {
      dispatch: (c: Command): DispatchResult => {
        const r = e.dispatch(c);
        if (c.type === 'externalDrive') scheduled.push({ at: r.tick, engine: e.now().tick });
        return r;
      },
      on: (fn: (x: EngineEvent) => void) => e.on(fn),
    };
    attachMonitorToLink(mon, monPort);
    const clocks: number[] = [];
    ventPort.onMessage((m: LinkMsg) => m.kind === 'clock' && clocks.push(m.ventTick));
    const d = createVentDriver(ventPort, 'normal');
    let ms = 0;
    const run = async (frames: number) => {
      for (let i = 0; i < frames; i++) {
        ms += 20;
        d.frame(ms);
        e.advanceTo(e.now().simT + 0.02);
        await Promise.resolve();
      }
    };
    d.frame(0);
    await run(100);
    const snap = e.snapshot();
    await run(2500);
    const clocksBefore = clocks.length;
    scheduled.length = 0;
    e.restore(snap);
    await run(50);
    expect(clocks.length).toBeGreaterThan(clocksBefore);
    const late = scheduled.slice(5);
    expect(late.length).toBeGreaterThan(20);
    for (const s of late) expect(s.at - s.engine).toBeLessThanOrEqual(LEAD_TICKS + 2);
  });
});
```

Create `apps/demo/e2e/fu11-vent-restore.e2e.ts`:

```ts
// FU-11 Task E3b (R50 F1): "Return here" while the Ventilator view drives the patient — the cockpit keeps ventilating
// the restored patient. Before: frames were stamped on the old timeline and no clock reached the cockpit; the replayed
// interval ran SpO2 91 → 64 where the first run had 95 → 92.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
const simNow = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeApp.session.simNow());
const tile = (p: Page, param: string) => p.evaluate((x) => Number(document.querySelector(`.pme-stile[data-param="${x}"] [data-pme="v"]`)?.textContent), param);
const at = async (p: Page, t: number) => {
  await expect.poll(() => simNow(p), { timeout: 60_000, intervals: [250] }).toBeGreaterThanOrEqual(t);
  return { spo2: await tile(p, 'SpO2'), co2: await tile(p, 'CO2') };
};

test('after "Return here" on the Ventilator view the replayed minute matches the first one', async ({ page }) => {
  test.setTimeout(180_000);
  await openApp(page, base, '?scenario=showcase-bronchospasm', { warmMs: 1500 });
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  await page.evaluate(() => (location.hash = '#/vent'));
  const b = 30;
  await at(page, b);
  await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'bookmark', target: 'vent' }));
  const first = [await at(page, b + 40), await at(page, b + 70)];
  await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'scenario', action: 'restoreBookmark', target: 'vent' }));
  await expect.poll(() => simNow(page), { timeout: 5_000 }).toBeLessThan(b + 10);
  const again = [await at(page, b + 40), await at(page, b + 70)];
  console.log('vent restore', JSON.stringify({ first, again }));
  for (let i = 0; i < 2; i++) {
    expect(Math.abs((again[i]?.spo2 ?? 0) - (first[i]?.spo2 ?? 0))).toBeLessThanOrEqual(3);
    expect(Math.abs((again[i]?.co2 ?? 0) - (first[i]?.co2 ?? 0))).toBeLessThanOrEqual(4);
  }
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/fu11-link-restore.test.ts`  
Expected: fails: `expected 256 to be greater than 256` (no new clock message after the restore)

Run: `npx playwright test --retries=0 fu11-vent-restore`  
Expected: 2 failed: after the restore CO2 0 and SpO2 88 vs 94 (the cockpit no longer ventilates)

- [ ] **Step 3 — implement.**

In `packages/ventilator/src/link/port.ts`, find:

```ts
    const tk = 't' in e ? Math.floor(e.t / 0.02 + 1e-6) : 0; // every event but toneCancel carries sim time
    if (tk > engTick) {
```

Replace with:

```ts
    const tk = 't' in e ? Math.floor(e.t / 0.02 + 1e-6) : 0; // every event but toneCancel carries sim time
    if (e.type === 'toneCancel' && e.ids === undefined) {
      // FU-11 (R50 F1): the engine was RESTORED (its restore marker: a toneCancel without ids; a new engine re-attaches
      // instead). The old timeline's offset stamped every later frame in the restored future (50 s late after a 50 s
      // rewind) and no clock was published: the cockpit stopped ventilating the patient while its own screen looked
      // normal. Start a new generation: the next frame probes, the clock is published again from the restored time.
      // (Event times alone cannot tell: a breath or a beat may carry a time seconds before "now".)
      offset = null;
      allowed = -Infinity;
      learning = false;
      gen++;
      engTick = Math.floor(e.after / 0.02 + 1e-6);
      publishClock();
      return;
    }
    if (tk > engTick) {
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run`  
Expected: all passed (ports.test included)

Run: `npx playwright test --retries=0 fu11-vent-restore vent-link`  
Expected: all passed (SpO2/CO2 within 3/4 of the first run, e.g. [93/32, 94/33] then [92/33, 95/33])

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-vent-restore.e2e.ts \
  packages/ventilator/src/link/port.ts \
  packages/ventilator/test/fu11-link-restore.test.ts
git commit -m "fix(ventilator): the link starts a new generation on the engine's restore marker (FU-11 E3b, R50 F1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task E4: "Return here" is back: the app restores the patient and the screen together

**Branch** `fu-11-b` · **Findings** Stage 9 polish item 3 (the hidden restore), F03–F05, F09, R50 F1 · **Files** Modify `apps/demo/src/app/link.ts`, `apps/demo/src/app/panel/scenario.ts`; Create `apps/demo/src/app/fu11-link-timeline.test.ts`, `apps/demo/e2e/fu11-restore.e2e.ts`

**Why:** Stage 9 hid "Return here" (438971a): measured through the app, a restore left the ECG on the old trace, the pleth
flat and the clock frozen. With D1–E3 the restore is whole, its tests green, so (global constraint) the button comes
back. The Link clears onsets in progress on any timeline and the acute events on a restart (a Remote has no
AppSession.onMount to tell it); a restore keeps the acute events (the engine does not report them).

**Interfaces:** Consumes D1, E1–E3 and E3b (the Ventilator view follows the restore: R50 F1). Not executed unless all of them are green.

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/src/app/fu11-link-timeline.test.ts`:

```ts
// FU-11 Task E6 (F05, F09; showcase-hotfix notes): the panel's Link follows a new timeline — onsets in progress end on
// any; acute events end on a restart (a Remote has no AppSession to tell it) and stay on a bookmark restore.
import { ControllerSession, createInProcessHub, createStamper } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { Link } from './link.ts';

const S = 'LNK234';
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('FU-11 E6: Link on a timeline event', () => {
  it('restore clears the ramps and keeps the conditions; restart clears both', async () => {
    const hub = createInProcessHub();
    const host = hub.connect();
    const t = hub.connect();
    const link = new Link(new ControllerSession({ session: S, transport: t }), t, null);
    link.ramps.set('hr', { t0: 0, dur: 60, to: 120 });
    link.conditions.set('sepsis', 0.67);
    const stamp = createStamper(S, 'host-1');
    host.send(stamp({ kind: 'event', body: [{ type: 'timeline', t: 10, tick: 500, cause: 'restore' }] }));
    await tick();
    expect(link.ramps.size).toBe(0);
    expect(link.conditions.get('sepsis')).toBe(0.67);
    host.send(stamp({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0, cause: 'restart' }] }));
    await tick();
    expect(link.conditions.size).toBe(0);
    link.close();
  });
});
```

Create `apps/demo/e2e/fu11-restore.e2e.ts`:

```ts
// FU-11 Task E4 (external review F03–F05, F09; browser audit BA01–BA05): "Return here" restores the patient AND the
// screen — the session clock, the trends and the waveforms go back with it.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();

test('Return here: the clock, the trends and the waveforms go back with the patient (F03–F05, F09)', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, base, '?scenario=showcase-induction', { warmMs: 1500 });
  await speed(page, '×4');
  await page.click('[role=tab][data-tab=scenario]');
  await page.getByRole('button', { name: 'Bookmark', exact: true }).first().click();
  const tMark = await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.session.simNow()), { timeout: 20_000 }).toBeGreaterThan(tMark + 30);
  await page.getByRole('button', { name: 'Return here' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Return' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.link.simT), { timeout: 5_000 }).toBeLessThan(tMark + 5);
  const clip = { x: 0, y: 160, width: 560, height: 220 };
  const a = await page.screenshot({ clip });
  await page.waitForTimeout(1500);
  const b = await page.screenshot({ clip });
  expect(b.equals(a), 'the waveform keeps sweeping after the restore').toBe(false);
  const r = await page.evaluate(() => ({ t: (window as unknown as W).__pmeApp.session.simNow(), trend: (window as unknown as W).__pmeApp.session.monitor.trends.latestS }));
  expect(r.trend).toBeLessThanOrEqual(Math.floor(r.t) + 1);
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/fu11-link-timeline.test.ts`  
Expected: 1 failed: ramps.size 1

Run: `npx playwright test --retries=0 fu11-restore`  
Expected: 2 failed: no "Return here" button (timeout)

- [ ] **Step 3 — implement.**

In `apps/demo/src/app/link.ts`, find:

```ts
      this.device = e as unknown as DeviceStatusEvent;
    } else if (e.type === 'scenario') {
```

Replace with:

```ts
      this.device = e as unknown as DeviceStatusEvent;
    } else if (e.type === 'timeline') {
      // FU-11 (F05, F09): a new timeline — onsets in progress began on the old one; a restart also ends the acute events
      // (a Remote has no AppSession.onMount to tell it); a bookmark restore keeps them (the engine does not report them)
      this.ramps.clear();
      if (e.cause !== 'restore') this.conditions.clear();
      this.changed();
    } else if (e.type === 'scenario') {
```

In `apps/demo/src/app/panel/scenario.ts`, find:

```ts
    // Bookmarks are debrief markers in version 1.0. Returning to one is hidden: measured through this app, a restore puts
    // the numbers back but leaves the waveforms on the old timeline and stops the clock until the engine catches up
    // (external review F03–F05, F09; owned by the engineering-hardening plan). The restore comes back with that fix.
    marks.replaceChildren(...link.ctl.bookmarks.map((b) => h('li', {}, b)));
```

Replace with:

```ts
    // FU-11 (F03–F05, F09, F14; BA01–BA05): a restore now rewinds the waveforms, trends, clocks and pending groups, so
    // "Return here" is back (it was hidden in Stage 9 while a restore left the screen on the discarded timeline)
    marks.replaceChildren(...link.ctl.bookmarks.map((b) => h('li', {}, b, ' ', button('Return here', async () => {
      if (await confirmDialog('Return to this bookmark?', `The patient goes back to "${b}". The clock goes back with it.`, 'Return', false, 'Stay here')) void link.send({ type: 'scenario', action: 'restoreBookmark', target: b });
    }, 'ghost small'))));
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run`  
Expected: all passed

Run: `npx playwright test --retries=0 fu11-restore stage9-app showcase-clock`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-restore.e2e.ts \
  apps/demo/src/app/fu11-link-timeline.test.ts \
  apps/demo/src/app/link.ts \
  apps/demo/src/app/panel/scenario.ts
git commit -m "feat(demo): "Return here" restores the patient and the screen together (FU-11 E4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task E5: The pleth scale is not taken on a flat first window (Stage 9 polish note 4)

**Branch** `fu-11-b` · **Findings** "renderer first-samples pleth line", "pleth glitch on view switch" · **Files** Modify `packages/renderer/src/monitor-core.ts`; Create `packages/renderer/test/fu11-pleth-scale.test.ts`

**Why:** A new engine's pleth is flat for its first 0.4 s; the auto-scale taken then (span 0.125) clamped the first beat (≈ 1.4)
to the lane's top edge until the next re-scale a second later: a rectangle after every scenario load, restart and
(now) restore — reproduced on WebKit at 3 s after `?scenario=showcase-haemorrhage` (writer's screenshot), gone with
the fix. The scale is re-taken every frame until the window holds a second of samples.

- [ ] **Step 1 — the failing tests.** 

Create `packages/renderer/test/fu11-pleth-scale.test.ts`:

```ts
// FU-11 Task E5 (Stage 9 polish note 4): a pleth lane does not keep a scale taken on the flat first 0.4 s of a new
// engine (the first beat was drawn clamped to the top edge for a second — after every scenario load and restore).
import { describe, expect, it } from 'vitest';
import { MonitorCore } from '../src/monitor-core.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const make = () => new MonitorCore({ width: 0, height: 0 }, new FakeCtx(), { cssW: 1056, cssH: 300, dpr: 1 }, { engine: { seed: 1, patient: { sensors: { spo2: 'on' } } }, waves: ['pleth'] }, () => undefined);
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
const frames = (c: MonitorCore, fromMs: number, toMs: number) => {
  for (let ms = fromMs; ms <= toMs; ms += 1000 / 60) c.frame(1_000_000 + ms);
};

describe('FU-11 E5: the pleth scale is re-taken until a second of signal is in its window', () => {
  it('0.8 s after a start the pleth lane spans the first beat (≈ 1.4), not the flat 0.1 of the first 0.4 s', () => {
    const c = make();
    frames(c, 0, 800);
    const pleth = lanes(c)[lanes(c).length - 1] as SweepLane;
    const span = pleth.cfg.height / (pleth.cfg.gainMmPerMv * pleth.cfg.pxPerMm); // scaleFor's (hi − lo)
    expect(span).toBeGreaterThan(0.5);
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/fu11-pleth-scale.test.ts`  
Expected: 1 failed: span 0.125 (expected > 0.5)

- [ ] **Step 3 — implement.**

In `packages/renderer/src/monitor-core.ts`, find:

```ts
      this.autoRangeT[i] = t;
      // Stage 3: every auto-scaled lane (pleth over 4 s, resp over 10 s: two or three breaths)
      const rate = this.engine.sampleRate(ch);
      const winS = ch === 'resp' ? 10 : 4;
      const n = this.engine.readSamples(ch, Math.floor((t - winS) * rate), this.plethScratch.subarray(0, Math.round(winS * rate)));
```

Replace with:

```ts
      // Stage 3: every auto-scaled lane (pleth over 4 s, resp over 10 s: two or three breaths)
      const rate = this.engine.sampleRate(ch);
      const winS = ch === 'resp' ? 10 : 4;
      const n = this.engine.readSamples(ch, Math.floor((t - winS) * rate), this.plethScratch.subarray(0, Math.round(winS * rate)));
      // FU-11 (Stage 9 polish note 4): a new engine's first 0.4 s of pleth is flat; scaled on that, the first beat was drawn
      // clamped to the lane's top edge for a second (a rectangle after every load or restore). Until the window holds a
      // second of signal the scale is re-taken every frame.
      if (n >= rate) this.autoRangeT[i] = t;
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/renderer/src/monitor-core.ts \
  packages/renderer/test/fu11-pleth-scale.test.ts
git commit -m "fix(renderer): the pleth auto-scale waits for a second of signal (FU-11 E5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part H — Rehearsal and showcase defects (D3, D5, K3, Sound off, the Ventilator view's volume, R50 F10) (branch `fu-11-b`)

### Task H1: The Ventilator view follows every speed change (D3)

**Branch** `fu-11-b` · **Findings** presenter documents D3 · **Files** Modify `apps/demo/src/app/session.ts`, `apps/demo/src/app/views/vent.ts`; Create `apps/demo/e2e/fu11-vent-speed.e2e.ts`

**Why:** The cockpit got the session speed once, on load: opened at ×1 and then run at ×4 it ventilated at a quarter of the
patient's pace (RR 3–7, SpO2 85–89) while its own screen looked normal (presenter rehearsal). `AppSession.onTimeScale`
notifies every change; the Ventilator view posts it to the cockpit.

**Interfaces:** Produces: `AppSession.onTimeScale(fn: (k: number) => void): () => void`.

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/fu11-vent-speed.e2e.ts`:

```ts
// FU-11 Task H1 (presenter note D3): the Ventilator view's cockpit runs at the session's speed after a later change.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();

test('the Ventilator view takes a speed change made after it opened (D3)', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/vent', { warmMs: 1000 });
  const frame = page.frameLocator('iframe.vent');
  await frame.locator('body').waitFor();
  const scale = () => page.frames().find((fr) => fr.url().includes('vent-hamilton'))?.evaluate(() => (window as unknown as { __vent: { scale: number } }).__vent.scale);
  await expect.poll(scale, { timeout: 10_000 }).toBe(1);
  await page.evaluate(() => (location.hash = '#/teach'));
  await speed(page, '×4');
  await expect.poll(scale, { timeout: 5_000 }).toBe(4);
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 fu11-vent-speed`  
Expected: 2 failed: __vent.scale stays 1

- [ ] **Step 3 — implement.**

In `apps/demo/src/app/session.ts`, find:

```ts
  private readonly mountFns = new Set<(m: MonitorHandle) => void>();
  private offMon: (() => void) | null = null;
```

Replace with:

```ts
  private readonly mountFns = new Set<(m: MonitorHandle) => void>();
  private readonly scaleFns = new Set<(k: number) => void>(); // FU-11 (D3)
  private offMon: (() => void) | null = null;
```

In `apps/demo/src/app/session.ts`, find:

```ts
    this.monitor?.setTimeScale(k);
  }
```

Replace with:

```ts
    this.monitor?.setTimeScale(k);
    for (const fn of this.scaleFns) fn(k);
  }

  /** FU-11 (D3): every speed change (the Ventilator view's cockpit runs at the session's speed, not its first one). */
  onTimeScale(fn: (k: number) => void): () => void {
    this.scaleFns.add(fn);
    return () => void this.scaleFns.delete(fn);
  }
```

In `apps/demo/src/app/views/vent.ts`, find:

```ts
      };
      frame.src = `./vent-hamilton.html?link=${link}&profile=normal`;
```

Replace with:

```ts
      };
      // FU-11 (D3, presenter rehearsal): the cockpit follows every later speed change too — opened at ×1 and then run at
      // ×4 it ventilated at a quarter of the patient's pace (RR 3–7, SpO2 85–89) while its own screen looked normal
      const offScale = session.onTimeScale((k) => port.post({ v: 1, kind: 'time', action: 'scale', value: k }));
      frame.src = `./vent-hamilton.html?link=${link}&profile=normal`;
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 fu11-vent-speed vent-link`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-vent-speed.e2e.ts \
  apps/demo/src/app/session.ts \
  apps/demo/src/app/views/vent.ts
git commit -m "fix(demo): the Ventilator view follows every speed change (FU-11 H1, D3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task H2: Explore takes its baseline at 1 minute, opened or not (D5)

**Branch** `fu-11-b` · **Findings** presenter documents D5, R50 M14 · **Files** Modify `apps/demo/src/app/views/explore.ts`; Create `apps/demo/e2e/fu11-explore-baseline.e2e.ts`

**Why:** The 1-minute baseline was set inside Explore's draw, which runs only while Explore is visible: opened first at
08:30 it compared against 08:30 (presenter note D5; the run sheet's Explore moment depends on it). The check moves to
the event feed. R50 M14: a bookmark restore to before the baseline left a baseline from the discarded future; when time goes
back the histories restart and a baseline taken after the restored moment is dropped (taken again at 1 minute).

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/fu11-explore-baseline.e2e.ts`:

```ts
// FU-11 Task H2 (presenter note D5): Explore's baseline is taken at 1 minute of sim time, opened or not.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number; send(c: unknown): Promise<{ accepted: boolean }> } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();

test('Explore compares with the 1-minute baseline although it was opened later (D5)', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  await speed(page, '×4');
  await expect.poll(() => page.evaluate(() => (window as unknown as W).__pmeApp.session.simNow()), { timeout: 40_000 }).toBeGreaterThan(90);
  await page.evaluate(() => (location.hash = '#/explore'));
  await expect(page.getByText(/Changes are from the baseline at 01:0\d/)).toBeVisible({ timeout: 5_000 });
});

test('a bookmark restore to before the baseline drops it; it is taken again at 1 minute (R50 M14)', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  const send = (c: unknown) => page.evaluate((x) => (window as unknown as W).__pmeApp.link.send(x), c);
  const simNow = () => page.evaluate(() => (window as unknown as W).__pmeApp.session.simNow());
  expect((await send({ type: 'scenario', action: 'bookmark', target: 'early' })).accepted).toBe(true);
  await speed(page, '×4');
  await expect.poll(simNow, { timeout: 40_000 }).toBeGreaterThan(75);
  await page.evaluate(() => (location.hash = '#/explore'));
  await expect(page.getByText(/Changes are from the baseline at 01:0\d/)).toBeVisible({ timeout: 5_000 });
  expect((await send({ type: 'scenario', action: 'restoreBookmark', target: 'early' })).accepted).toBe(true);
  await expect(page.getByText(/The baseline is set at 1 minute\./)).toBeVisible({ timeout: 5_000 });
  await expect.poll(simNow, { timeout: 40_000 }).toBeGreaterThan(65);
  await expect(page.getByText(/Changes are from the baseline at 01:0\d/)).toBeVisible({ timeout: 5_000 });
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 fu11-explore-baseline`  
Expected: 4 failed: no "Changes are from the baseline at 01:0x" (D5); after the restore the stamp still names the old baseline (M14)

- [ ] **Step 3 — implement.**

In `apps/demo/src/app/views/explore.ts`, find:

```ts
    if (model.ingest(e) && visible) draw();
```

Replace with:

```ts
    const before = model.t;
    const changed = model.ingest(e);
    if (changed && model.t < before) {
      // R50 M14: time went back (a bookmark restore) — the histories restart, and a baseline taken after the restored
      // moment belongs to the discarded future: it is taken again at 1 minute
      model.clearHistory();
      if (model.baseT !== null && model.t < model.baseT) (model.base = null), (model.baseT = null);
    }
    // FU-11 (presenter note D5): the baseline is taken at 1 minute of sim time whether or not Explore is open (it was set
    // on the first visit after 1 minute, so opening Explore at 08:30 compared against 08:30)
    if (model.baseT === null && model.t >= 60) model.setBaseline();
    if (changed && visible) draw();
```

In `apps/demo/src/app/views/explore.ts`, find:

```ts
    setText(stamp, model.baseT === null ? `Sim time ${clock(model.t)}. The baseline is set at 1 minute.` : `Sim time ${clock(model.t)}. Changes are from the baseline at ${clock(model.baseT)}.`);
    if (model.baseT === null && model.t >= 60) model.setBaseline();
    const rows = model.rows().filter((r) => {
```

Replace with:

```ts
    setText(stamp, model.baseT === null ? `Sim time ${clock(model.t)}. The baseline is set at 1 minute.` : `Sim time ${clock(model.t)}. Changes are from the baseline at ${clock(model.baseT)}.`);
    const rows = model.rows().filter((r) => {
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 fu11-explore-baseline stage9-tasks`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-explore-baseline.e2e.ts \
  apps/demo/src/app/views/explore.ts
git commit -m "fix(demo): Explore takes its baseline at 1 minute whether or not it is open (FU-11 H2, D5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task H3: The top bar says which alarms are off; Sound stays reachable in a narrow window (K3, D4)

**Branch** `fu-11-b` · **Findings** showcase kit K3, presenter D4, rehearsal S5 (part), owner ruling Q4, R50 M5 · **Files** Modify `apps/demo/src/app/alarms.test.ts`, `apps/demo/src/app/alarms.ts`, `apps/demo/src/app/app.css`, `apps/demo/src/app/main.ts`, `apps/demo/src/app/shell.ts`; Create `apps/demo/e2e/fu11-alarm-label.e2e.ts`

**Why:** Every fresh load showed "Alarms off" with crossed bells while asystole, VF, VT and apnoea still alarm — the
saadat-like factory state (D4: by design). Reproduced on Chromium AND WebKit. Owner ruling Q4 (wording is ours,
provided R56 holds): the label is "Limit alarms off" and its tooltip lists what still alarms FROM THE SKIN'S DATA —
`alarms.alwaysOn` (saadat-like: ASYSTOLE, VFIB, VTAC, APNEA, research/06 §4.2) worded by the app's alarm table
(`FIXED_ALARM_WORDS`, + `APNEA: 'Apnoea'`), less apnoea under a preset's APNEA LIMIT OFF; a skin that lists none gets a
generic sentence (no names in the code: R50 M5). No vendor documents an on-screen text legend for this state (saadat:
a red crossed bell in the header, research/06 §3.2, already drawn; iec-defaults' bell is `eng`), so none is added.
Below 900 px the Sound button was hidden (app.css:103) — the only way to start sound in a narrow window; it stays.
Noted (not changed, recorded for 8b): the alarm words live in `alarms.ts`, not in the glossary data — a strict R56
reading would move them; and the iec skins' `alwaysOn: []` while VF/VT/asystole still sound (data gap for 8b).

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/fu11-alarm-label.e2e.ts`:

```ts
// FU-11 Task H3 (showcase kit K3, presenter note D4): the factory "all limit alarms off" state is named for what it is;
// Sound is reachable below 900 px.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { simNow(): number; monitor: { trends: { latestS: number } } }; link: { simT: number } } };
const speed = (page: import('@playwright/test').Page, x: string) => page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: x }).click();

test('the top-bar alarm count says which alarms are off, and Sound stays reachable in a narrow window (K3)', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  await expect(page.locator('.alarm-count')).toHaveText('Limit alarms off');
  // owner ruling Q4 (R50 M5, R56): the list comes from the saadat-like skin's `alwaysOn`, worded by the alarm table
  await expect(page.locator('.alarm-count')).toHaveAttribute('title', 'Limit alarms are off on this monitor. Still alarming: Asystole, Ventricular fibrillation or tachycardia, Ventricular tachycardia, Apnoea.');
  await page.setViewportSize({ width: 800, height: 700 });
  await expect(page.locator('.topright .sound')).toBeVisible();
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 fu11-alarm-label`  
Expected: 2 failed: text 'Alarms off'

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/alarms.test.ts`  
Expected: 1 failed: limitsOffTitle is not exported

- [ ] **Step 3 — implement.**

In `apps/demo/src/app/main.ts`, find:

```ts
import { alarmLine } from './alarms.ts';
import { setDrugNames } from './glossary.ts';
import { Link } from './link.ts';
import { PATIENT_PRESETS } from './patients.ts';
import { hrefOf, parseRoute } from './router.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { scenarioById, type ScenarioCard } from './scenarios.ts';
import { AppSession } from './session.ts';
import { mountSessionBar } from './sessionbar.ts';
import { applySkinAlarmColours, LEVEL_MARK, LEVEL_NAME, Shell, skinAlarmBar } from './shell.ts';
```

Replace with:

```ts
import { alarmLine, limitsOffTitle, LIMITS_OFF_LABEL } from './alarms.ts';
import { setDrugNames } from './glossary.ts';
import { Link } from './link.ts';
import { PATIENT_PRESETS } from './patients.ts';
import { hrefOf, parseRoute } from './router.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { scenarioById, type ScenarioCard } from './scenarios.ts';
import { AppSession } from './session.ts';
import { mountSessionBar } from './sessionbar.ts';
import { applySkinAlarmColours, LEVEL_MARK, LEVEL_NAME, Shell, skinAlarmBar, skinAlwaysOn } from './shell.ts';
```

In `apps/demo/src/app/main.ts`, find:

```ts
    setText(alarm, s.level && s.top ? `${LEVEL_MARK[s.level]} ${alarmLine(s.top).text}${s.n > 1 ? ` +${s.n - 1}` : ''}` : link.alarms?.allOff ? 'Alarms off' : 'No alarms');
    if (s.top) alarm.title = `On the monitor: ${s.top.text}`; // the vendor's words, outside the glossary scan (review F4)
```

Replace with:

```ts
    // FU-11 (showcase kit K3, presenter note D4): with the factory "all alarm groups off" (saadat-like) asystole, VF, VT and
    // apnoea still alarm — "Alarms off" read as if nothing would; the label says which alarms are off
    setText(alarm, s.level && s.top ? `${LEVEL_MARK[s.level]} ${alarmLine(s.top).text}${s.n > 1 ? ` +${s.n - 1}` : ''}` : link.alarms?.allOff ? LIMITS_OFF_LABEL : 'No alarms');
    if (s.top) alarm.title = `On the monitor: ${s.top.text}`; // the vendor's words, outside the glossary scan (review F4)
    else if (link.alarms?.allOff) {
      // owner ruling Q4 (R50 M5, R56): what still alarms comes from the skin's data, worded by the alarm table
      const k = skinAlwaysOn(link.alarms.skin);
      alarm.title = limitsOffTitle(k.alwaysOn, k.apnoeaOff);
    }
```

In `apps/demo/src/app/shell.ts`, find:

```ts

export const LEVEL_NAME: Readonly<Record<1 | 2 | 3, 'high' | 'medium' | 'low'>> = { 1: 'high', 2: 'medium', 3: 'low' };
```

Replace with:

```ts

/** FU-11 (owner ruling Q4): what the skin (and its preset) says still alarms with every limit group off. */
export function skinAlwaysOn(skin: string): { alwaysOn: readonly string[]; apnoeaOff: boolean } {
  try {
    const r = resolveSkin(skin);
    return { alwaysOn: r.skin.alarms.alwaysOn, apnoeaOff: r.preset?.startState?.apneaLimit === 'OFF' };
  } catch {
    return { alwaysOn: [], apnoeaOff: false };
  }
}

export const LEVEL_NAME: Readonly<Record<1 | 2 | 3, 'high' | 'medium' | 'low'>> = { 1: 'high', 2: 'medium', 3: 'low' };
```

In `apps/demo/src/app/alarms.ts`, find:

```ts
  'nibp-failed': 'NIBP measurement failed',
  'apnoea-co2': 'Apnoea (no CO₂ breaths)',
```

Replace with:

```ts
  'nibp-failed': 'NIBP measurement failed',
  APNEA: 'Apnoea', // FU-11 (Q4): the skins' `alwaysOn` id for both apnoea alarms
  'apnoea-co2': 'Apnoea (no CO₂ breaths)',
```

In `apps/demo/src/app/alarms.ts`, find:

```ts
  return { text: a.text.replace(/^\*+/, ''), known: false };
}
```

Replace with:

```ts
  return { text: a.text.replace(/^\*+/, ''), known: false };
}

/** FU-11 (owner ruling Q4; showcase kit K3): the top bar's words when every limit-alarm group is off. */
export const LIMITS_OFF_LABEL = 'Limit alarms off';

/**
 * …and its tooltip: what still alarms, from the skin's own `alarms.alwaysOn` (saadat-like: research/06 §4.2) worded by
 * this table — no list of names in the code (R56) — less apnoea when the preset has APNEA LIMIT OFF (research/06 §3.1
 * F7). A skin that lists none gets the generic sentence.
 */
export function limitsOffTitle(alwaysOn: readonly string[], apnoeaOff = false): string {
  const words = alwaysOn.filter((id) => !(apnoeaOff && id === 'APNEA')).map((id) => alarmLine({ id, text: id }).text);
  return words.length ? `Limit alarms are off on this monitor. Still alarming: ${words.join(', ')}.` : 'Limit alarms are off on this monitor; the alarms it cannot switch off still sound.';
}
```

In `apps/demo/src/app/alarms.test.ts`, find:

```ts
import { alarmLine, FIXED_ALARM_WORDS } from './alarms.ts';
```

Replace with:

```ts
import { alarmLine, FIXED_ALARM_WORDS, limitsOffTitle } from './alarms.ts';
```

In `apps/demo/src/app/alarms.test.ts`, find:

```ts
  });
});
```

Replace with:

```ts
  });
});

describe('FU-11 (owner ruling Q4): the "Limit alarms off" tooltip', () => {
  it('names what the skin lists as always on, in the table\'s words; drops apnoea under APNEA LIMIT OFF; generic when none', () => {
    expect(limitsOffTitle(['ASYSTOLE', 'VFIB', 'VTAC', 'APNEA'])).toBe('Limit alarms are off on this monitor. Still alarming: Asystole, Ventricular fibrillation or tachycardia, Ventricular tachycardia, Apnoea.');
    expect(limitsOffTitle(['ASYSTOLE', 'APNEA'], true)).toBe('Limit alarms are off on this monitor. Still alarming: Asystole.');
    expect(limitsOffTitle([])).toBe('Limit alarms are off on this monitor; the alarms it cannot switch off still sound.');
  });
});
```

In `apps/demo/src/app/app.css`, find:

```css
@media (max-width: 900px) { .topright .sound, .code-pill .muted { display: none; } }
```

Replace with:

```css
@media (max-width: 900px) { .code-pill .muted { display: none; } } /* FU-11: Sound stays reachable in a narrow window */
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 fu11-alarm-label stage9-a11y stage9-glossary`  
Expected: all passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/app/copy.test.ts src/app/alarms.test.ts`  
Expected: passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-alarm-label.e2e.ts \
  apps/demo/src/app/alarms.test.ts \
  apps/demo/src/app/alarms.ts \
  apps/demo/src/app/app.css \
  apps/demo/src/app/main.ts \
  apps/demo/src/app/shell.ts
git commit -m "fix(demo): "Limit alarms off" with what still alarms from the skin's data; Sound stays in a narrow window (FU-11 H3, K3, Q4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task H4: The Sound button turns sound OFF again (first showcase)

**Branch** `fu-11-b` · **Findings** Ali, live at the first showcase (6 Oct): no way to turn sound off; owner ruling Q3 (sound per window) · **Files** Modify `apps/demo/src/app/main.ts`, `apps/demo/src/app/session.ts`, `packages/renderer/src/mount.ts`; Create `apps/demo/e2e/fu11-sound-toggle.e2e.ts`

**Why:** `main.ts` (top bar) only called `session.enableSound()` and relabelled the button: once on, sound could not be turned
off (a reload was the only way). The button is now a toggle drawn from the session's state (`aria-pressed` with it).
The audio owner is the monitor: `MonitorHandle.disableSound()` sets its master gain to 0 (the AudioContext keeps
running — a suspended context would stall the tone clock and burst the queued tones on resume), `enableSound()` sets it
back to 1 (and is still the iOS-safe unlock the first time); `soundOn` says which. `AppSession.disableSound()` keeps it
off for the next patient's monitor too. Per window (owner ruling Q3): it touches this window's audio only — the
learner monitor's own Sound (Part G) uses the same pair.

**Interfaces:** Produces: `MonitorHandle.disableSound(): void`, `MonitorHandle.soundOn: boolean`, `AppSession.disableSound(): void`.

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/fu11-sound-toggle.e2e.ts`:

```ts
// FU-11 Task H4 (Ali, live at the first showcase): the top bar's Sound button turns sound OFF again — before, it only
// unlocked audio and relabelled itself. Per window (owner ruling Q3): the learner monitor's own button does the same for
// its window only.
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { soundOn: boolean; monitor: { soundOn: boolean } } } };
const state = (page: import('@playwright/test').Page) => page.evaluate(() => { const s = (window as unknown as W).__pmeApp.session; return { session: s.soundOn, monitor: s.monitor.soundOn }; });

test('Sound on, then off again, then on: the button, its pressed state and the monitor\'s audio agree', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/teach', { warmMs: 500 });
  const sound = page.locator('.topright .sound');
  await expect(sound).toHaveText('Sound off');
  await sound.click();
  await expect(sound).toHaveText('Sound on');
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => state(page)).toEqual({ session: true, monitor: true });
  await sound.click();
  await expect(sound).toHaveText('Sound off');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => state(page)).toEqual({ session: false, monitor: false });
  await sound.click();
  await expect.poll(() => state(page)).toEqual({ session: true, monitor: true });
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 fu11-sound-toggle`  
Expected: 2 failed: `monitor.soundOn` undefined; the second click leaves "Sound on"

- [ ] **Step 3 — implement.**

In `packages/renderer/src/mount.ts`, find:

```ts
  enableSound(): Promise<void>;
  setTimeScale(k: number): void;
```

Replace with:

```ts
  enableSound(): Promise<void>;
  /** FU-11 (H4): sound off again — this window's output goes silent at once (the audio clock keeps running, so a later
   *  enableSound() resumes in step); the alarms and the device state are untouched. Idempotent. */
  disableSound(): void;
  /** FU-11 (H4): whether this window is sounding (unlocked and not turned off). */
  readonly soundOn: boolean;
  setTimeScale(k: number): void;
```

In `packages/renderer/src/mount.ts`, find:

```ts
  let soundP: Promise<void> | null = null;
  let sounder: AlarmSounder | null = null; // Stage 4b
```

Replace with:

```ts
  let soundP: Promise<void> | null = null;
  let muted = false; // FU-11 (H4): Sound turned off again
  let sounder: AlarmSounder | null = null; // Stage 4b
```

In `packages/renderer/src/mount.ts`, find:

```ts
    enableSound() {
      // Idempotent: two quick taps must not create two AudioContexts (iOS caps live contexts; review M7).
```

Replace with:

```ts
    enableSound() {
      muted = false; // FU-11 (H4): on again after disableSound()
      if (audio) audio.master.gain.value = 1;
      // Idempotent: two quick taps must not create two AudioContexts (iOS caps live contexts; review M7).
```

In `packages/renderer/src/mount.ts`, find:

```ts
        audio = out;
        play = playerFor(out, r);
```

Replace with:

```ts
        audio = out;
        out.master.gain.value = muted ? 0 : 1; // FU-11 (H4): turned off while the unlock was pending
        play = playerFor(out, r);
```

In `packages/renderer/src/mount.ts`, find:

```ts
    },
    setTimeScale: (k) => void hostP.then((h) => h.control({ type: 'timeScale', k })),
```

Replace with:

```ts
    },
    disableSound() {
      muted = true; // FU-11 (H4): the master gain, not the context: a suspended context would stall the tone clock
      if (audio) audio.master.gain.value = 0;
    },
    get soundOn() {
      return !!audio && !muted;
    },
    setTimeScale: (k) => void hostP.then((h) => h.control({ type: 'timeScale', k })),
```

In `apps/demo/src/app/main.ts`, find:

```ts
  const sound = button('Sound off', () => void session.enableSound().then(() => ((sound.textContent = 'Sound on'), sound.setAttribute('aria-pressed', 'true'))), 'small sound');
```

Replace with:

```ts
  // FU-11 (H4): a toggle — it turns sound off again (it only ever turned it on); this window's sound only (ruling Q3)
  const drawSound = () => ((sound.textContent = session.soundOn ? 'Sound on' : 'Sound off'), sound.setAttribute('aria-pressed', String(session.soundOn)));
  const sound = button('Sound off', () => (session.soundOn ? (session.disableSound(), drawSound()) : void session.enableSound().then(drawSound)), 'small sound');
```

In `apps/demo/src/app/session.ts`, find:

```ts
    return (this.monitor?.enableSound() ?? Promise.resolve()).then(() => void (this.soundOn = true));
  }
```

Replace with:

```ts
    return (this.monitor?.enableSound() ?? Promise.resolve()).then(() => void (this.soundOn = true));
  }

  /** FU-11 (H4): sound off again, for this window (a new patient's monitor stays off too). */
  disableSound(): void {
    this.soundOn = false;
    this.monitor?.disableSound();
  }
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 fu11-sound-toggle stage9-a11y`  
Expected: all passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-sound-toggle.e2e.ts \
  apps/demo/src/app/main.ts \
  apps/demo/src/app/session.ts \
  packages/renderer/src/mount.ts
git commit -m "fix(renderer,demo): Sound turns off again; the monitor owns its sound on/off (FU-11 H4)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task H5: The Ventilator view delivers what the monitor's ventilator delivers (first showcase)

**Branch** `fu-11-b` · **Findings** first showcase (6 Oct): Ventilator view VTE 160 vs internal 403 in severe bronchospasm · **Files** Modify `apps/demo/src/vent/hamilton-page.ts`, `packages/ventilator/src/link/core.ts`; Create `packages/ventilator/test/fu11-vc-flow-parity.test.ts`, `apps/demo/e2e/fu11-vent-flow.e2e.ts`

**Why:** Showcase measurement (coordinator): severe bronchospasm, F 45 y 68 kg, VCV 12 × 500 — internal ventilator peak 40
(Pmax) VT 403, after salbutamol peak 28.5 VT 500; the cockpit (Pmax 35) VTE 160, then 305–368 with Ppeak pinned at
35. DIAGNOSIS (writer's probe on 48864439, `createLinkedSim` vs `createEngine`, `normal` profile, rocuronium,
bronchospasm 1, 3 min): the lungs are the SAME on both paths (the cockpit's config after lungState: C 55 mL/cmH2O,
R insp 60, R exp 108 cmH2O/L/s — the resistance mapping is not the cause); the inspiratory FLOW is: the cockpit's VC
runs its preset 60 L/min square with a 0.3 s pause, the monitor's ventilator x = VT / Ti with I:E 1:2 (18 L/min at
12/min). 60 L/min × R 60 hits Pmax early and the pressure limit cuts the breath. Measured, cockpit VTE vs engine VT,
same Pmax: 60 L/min + pause → 204 vs 424 (Pmax 35), 238 vs 476 (Pmax 40); flow 18, no pause → 426 vs 424, 479 vs 476.
(The candidate "adaptive pressure mode limiting at Pmax − 10" does not apply: the cockpit was in VC.) Fix: a cockpit
LINKED to the monitor runs VC at the monitor ventilator's flow for its set VT and rate (`monitorMatchedFlow`: Ti =
60 / rate / 3, no pause) until the instructor sets Flow or Pause on the cockpit (from then on, theirs). The stand-alone
cockpit page and the ventilator package's presets are unchanged (their fidelity tests stand). Acceptance (the
coordinator's): cockpit VT within 10 % of the internal ventilator for the same settings and lungs — measured 0.5 %.
THIS CHANGES THE BRONCHOSPASM SHOWCASE'S VENTILATOR-VIEW NUMBERS (intended): Gate B's rehearsal records the new VTE
before/after salbutamol beside the kit's (expected ≈ 400–430 → ≈ 500; the internal ventilator's own numbers unchanged).
If the probe agent's research/24 P7/P8 sections disagree when this task runs, stop and report.

**Interfaces:** Produces: `monitorMatchedFlow(c: { vt: number; rate: number }): { vcFlow: number; pause: number }`, `MONITOR_IE = 2` (ventilator link/core.ts).

- [ ] **Step 1 — the failing tests.** 

Create `packages/ventilator/test/fu11-vc-flow-parity.test.ts`:

```ts
// FU-11 Task H5 (first showcase, 6 Oct): the app's Ventilator view delivered far less than the monitor's own ventilator
// for the same lungs (severe bronchospasm, VCV 12 × 500: cockpit VTE 160–205 with Ppeak pinned at Pmax, internal VT
// 403–424). Diagnosis (measured, writer's probe on 48864439): the lungs are the SAME on both paths (lungState → C 55,
// R insp 60, R exp 108 cmH2O/L/s); the difference is the inspiratory FLOW — the cockpit's VC runs its preset 60 L/min
// square with a 0.3 s pause, the monitor's ventilator x = VT / Ti with I:E 1:2 (18 L/min at 12/min): 60 L/min × R 60
// reaches Pmax early and the pressure limit cuts the breath. A cockpit linked to the monitor starts VC at the monitor's
// flow (`monitorMatchedFlow`); the instructor's own Flow or Pause setting wins from then on.
import { describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { createLinkedSim, monitorMatchedFlow, PROFILES } from '../src/index.ts';
import { run } from './helpers.ts';

type St = { resp: { driver: { cycles: Array<{ vt: number; mech: boolean }> } } };
const para = { kind: 'drug', drugId: 'rocuronium', dose: 1.2, unit: 'mg/kg', route: 'iv' };

async function cockpitVt(pmax: number): Promise<{ vte: number; pip: number }> {
  const s = createLinkedSim({ profile: 'normal', vent: { rate: 12, vt: 500, peep: 5, fio2: 50, pmax, ...monitorMatchedFlow({ vt: 500, rate: 12 }) } });
  s.send({ type: 'setMode', mode: 'modeled' });
  s.send({ type: 'applyEvent', event: para });
  await run(s, 60);
  s.send({ type: 'applyEvent', event: { kind: 'airway', state: 'bronchospasm', severity: 1 } });
  await run(s, 240);
  return { vte: s.vs.p.measured.VTE, pip: s.vs.p.measured.PIP };
}
async function engineVt(pmax: number): Promise<number> {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: PROFILES.normal!.patient });
  let n = 0;
  const cmd = (event: Record<string, unknown>) => e.dispatch({ id: `p${++n}`, issuedBy: 't', type: 'applyEvent', event } as never);
  cmd({ kind: 'airwayDevice', device: 'ett' });
  cmd({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, pmax });
  cmd(para);
  e.advanceTo(60);
  cmd({ kind: 'airway', state: 'bronchospasm', severity: 1 });
  for (let t = 60; t < 240; t += 30) {
    e.advanceTo(t + 30);
    await new Promise((r) => setImmediate(r));
  }
  return (e.snapshot().state as { st: St }).st.resp.driver.cycles.filter((c) => c.mech).at(-2)?.vt ?? Number.NaN;
}

describe('FU-11 H5: the cockpit delivers what the monitor\'s ventilator delivers for the same settings and lungs', () => {
  it('monitorMatchedFlow: VT over the monitor ventilator\'s Ti (I:E 1:2), no pause', () => {
    expect(monitorMatchedFlow({ vt: 500, rate: 12 })).toEqual({ vcFlow: 18, pause: 0 });
    expect(monitorMatchedFlow({ vt: 500, rate: 14 })).toEqual({ vcFlow: 21, pause: 0 });
  });
  it('severe bronchospasm, VCV 12 × 500, Pmax 35: VT within 10 % of the monitor\'s ventilator', { timeout: 120_000 }, async () => {
    const [c, e] = [await cockpitVt(35), await engineVt(35)];
    console.log(`FU-11 H5 parity: cockpit VTE ${c.vte.toFixed(0)} (PIP ${c.pip.toFixed(1)}), monitor VT ${e.toFixed(0)}`);
    expect(Math.abs(c.vte - e) / e).toBeLessThan(0.1);
  });
});
```

Create `apps/demo/e2e/fu11-vent-flow.e2e.ts`:

```ts
// FU-11 Task H5: the app's Ventilator view runs VC at the monitor ventilator's flow for its VT and rate (I:E 1:2, no
// pause), and follows a rate change — the cockpit's preset 60 L/min + 0.3 s pause delivered half the volume in severe
// bronchospasm (the parity is unit-tested in packages/ventilator/test/fu11-vc-flow-parity.test.ts).
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type V = { __vent: { vs: { cfg: { vcFlow: number; pause: number; rate: number; vt: number; mode: string } } } };

test('the linked cockpit matches the monitor ventilator\'s flow, and keeps matching a new rate', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page, base, '#/vent', { warmMs: 1000 });
  await page.frameLocator('iframe.vent').locator('body').waitFor();
  const cfg = () => page.frames().find((f) => f.url().includes('vent-hamilton'))!.evaluate(() => { const c = (window as unknown as V).__vent.vs.cfg; return { mode: c.mode, vt: c.vt, rate: c.rate, vcFlow: c.vcFlow, pause: c.pause }; });
  await expect.poll(cfg, { timeout: 10_000 }).toEqual({ mode: 'VC', vt: 500, rate: 14, vcFlow: 21, pause: 0 });
  await page.frames().find((f) => f.url().includes('vent-hamilton'))!.evaluate(() => void ((window as unknown as V).__vent.vs.cfg.rate = 12));
  await expect.poll(cfg, { timeout: 5_000 }).toEqual({ mode: 'VC', vt: 500, rate: 12, vcFlow: 18, pause: 0 });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/fu11-vc-flow-parity.test.ts`  
Expected: 2 failed: monitorMatchedFlow is not a function (with the preset flow: VTE 204 vs 424, measured)

- [ ] **Step 3 — implement.**

In `apps/demo/src/vent/hamilton-page.ts`, find:

```ts
import { createBroadcastPort, createVentDriver, PROFILES, type ProfileId } from '@pme/ventilator';
import { mountHamiltonUi } from './hamilton-ui.ts';

const q = new URLSearchParams(location.search);
const session = q.get('link');
const pid = q.get('profile');
const profile: ProfileId = pid && pid in PROFILES ? (pid as ProfileId) : 'normal';
const port = session ? createBroadcastPort(session) : null;
const driver = createVentDriver(port, profile);
```

Replace with:

```ts
import { createBroadcastPort, createVentDriver, monitorMatchedFlow, PROFILES, type ProfileId } from '@pme/ventilator';
import { mountHamiltonUi } from './hamilton-ui.ts';

const q = new URLSearchParams(location.search);
const session = q.get('link');
const pid = q.get('profile');
const profile: ProfileId = pid && pid in PROFILES ? (pid as ProfileId) : 'normal';
const port = session ? createBroadcastPort(session) : null;
const driver = createVentDriver(port, profile);
if (port) {
  // FU-11 (H5): linked to the monitor, VC runs at the monitor ventilator's flow for the set VT and rate (I:E 1:2, no
  // pause) — the same settings deliver the same volume — until the instructor sets Flow or Pause here
  let matched = true;
  addEventListener('input', (e) => {
    const k = (e.target as HTMLElement | null)?.dataset?.key;
    if (k === 'vcFlow' || k === 'pause') matched = false;
  }, true);
  const frame = driver.frame;
  driver.frame = (ms) => {
    if (matched && driver.vs.cfg.mode === 'VC') Object.assign(driver.vs.cfg, monitorMatchedFlow(driver.vs.cfg));
    frame(ms);
  };
}
```

In `packages/ventilator/src/link/core.ts`, find:

```ts
export const LINK_TICK_S = 0.02; // the engine tick; one frame per tick = 50 Hz
```

Replace with:

```ts
export const LINK_TICK_S = 0.02; // the engine tick; one frame per tick = 50 Hz

/** The monitor's own ventilator: I:E 1:2 (engine-core l2/resp/driver.ts `vent.ie`, default 2). */
export const MONITOR_IE = 2;
/**
 * FU-11 (H5): the VC flow that gives the monitor's own ventilator breath — x = VT / Ti, Ti = 60 / rate / (1 + I:E), no
 * pause — so the same VT, rate and Pmax deliver the same volume on the same lungs (the cockpit's preset 60 L/min + 0.3 s
 * pause reached Pmax early in bronchospasm: VTE 204 vs 424, measured). L/min, whole.
 */
export function monitorMatchedFlow(c: { vt: number; rate: number }): { vcFlow: number; pause: number } {
  const ti = 60 / Math.max(4, c.rate) / (1 + MONITOR_IE);
  return { vcFlow: Math.round(((c.vt / 1000) / ti) * 60), pause: 0 };
}
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run`  
Expected: all passed (parity: cockpit VTE 426, monitor VT 424)

Run: `npx playwright test --retries=0 fu11-vent-flow vent-link fu11-vent`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-vent-flow.e2e.ts \
  apps/demo/src/vent/hamilton-page.ts \
  packages/ventilator/src/link/core.ts \
  packages/ventilator/test/fu11-vc-flow-parity.test.ts
git commit -m "fix(demo,ventilator): a linked cockpit runs VC at the monitor ventilator's flow (FU-11 H5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task H6: A new case does not inherit the Ventilator view's cockpit (R50 F10)

**Branch** `fu-11-b` · **Findings** R50 F10 (haemorrhage pulse loss 10:08 vs 10:03 after the Ventilator view had been opened) · **Files** Modify `apps/demo/src/app/views/vent.ts`; Create `apps/demo/e2e/fu11-vent-new-case.e2e.ts`

**Why:** Found by the R50 review: after the Ventilator view had been opened once, the NEXT case (restart, scenario load)
was still ventilated by the old cockpit — it kept running with the last case's settings and re-attached to every new
monitor — so haemorrhage lost its pulse at 10:08 instead of 10:03. Measured with a probe (fresh vs after #/vent):
without the fix NO PULSE 641.0 vs 647.0 s; with it 640.0 vs 641.0 s (the 1 s is the probe's sampling). A NEW patient
now unloads the cockpit (`about:blank`, the port closed, its listeners removed); the next visit loads a fresh one, as
on a fresh page; if the view is on screen it reloads at once (queued after the mount loop — a subscription added
inside it would be visited by the same loop). A bookmark restore is not a new patient (E3b handles it).

**Interfaces:** Consumes H1 (`offScale`).

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/fu11-vent-new-case.e2e.ts`:

```ts
// FU-11 Task H4 (R50 F10): a new patient (patient restart, scenario load) unloads the Ventilator view's cockpit — it no
// longer ventilates the next case with the last case's settings; the next visit loads a fresh one, as on a fresh page.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type W = { __pmeApp: { session: { restart(s: unknown): void; spec: unknown; timeScale: number } } };
const cockpits = (p: Page) => p.frames().filter((f) => f.url().includes('vent-hamilton')).length;
const restart = (p: Page) => p.evaluate(() => { const s = (window as unknown as W).__pmeApp.session; s.restart({ spec: s.spec, mode: 'modeled' }); });

test('the cockpit is unloaded by a new patient and reloads fresh on the next visit (or at once when shown)', async ({ page }) => {
  test.setTimeout(90_000);
  await openApp(page, base, '#/vent', { warmMs: 2000 });
  await expect.poll(() => cockpits(page), { timeout: 10_000 }).toBe(1);
  await page.evaluate(() => (location.hash = '#/teach'));
  await restart(page);
  await expect.poll(() => page.locator('iframe.vent').getAttribute('src'), { timeout: 5_000 }).toBe('about:blank');
  await expect.poll(() => cockpits(page), { timeout: 5_000 }).toBe(0);
  await page.evaluate(() => (location.hash = '#/vent'));
  await expect.poll(() => cockpits(page), { timeout: 10_000 }).toBe(1);
  // on screen during the restart: a fresh cockpit at once
  const cockpit = () => page.frames().find((f) => f.url().includes('vent-hamilton'));
  await cockpit()?.evaluate(() => void ((window as unknown as { __old?: boolean }).__old = true));
  await restart(page);
  const fresh = async () => (await cockpit()?.evaluate(() => !(window as unknown as { __old?: boolean }).__old && '__vent' in window).catch(() => false)) ?? false;
  await expect.poll(fresh, { timeout: 10_000 }).toBe(true);
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 fu11-vent-new-case`  
Expected: 2 failed: the cockpit iframe still loaded after a restart (1 cockpit, expected 0 / a fresh one)

- [ ] **Step 3 — implement.**

In `apps/demo/src/app/views/vent.ts`, find:

```ts
  return {
    id: 'vent', el,
    enter: () => {
      if (started) return;
      started = true;
      const link = `v${session.code.toLowerCase()}`;
      const port = createBroadcastPort(link);
      let detach: () => void = () => {};
      session.onMount((m) => {
```

Replace with:

```ts
  let shown = false; // FU-11 (R50 F10)
  const view: View = {
    id: 'vent', el,
    enter: () => {
      shown = true;
      if (started) return;
      started = true;
      const link = `v${session.code.toLowerCase()}`;
      const port = createBroadcastPort(link);
      // FU-11 (R50 F10): a NEW patient (patient restart, scenario load) unloads the cockpit. It kept running with the
      // last case's settings and re-attached to every new monitor, so a case run after the Ventilator view had been
      // opened was ventilated by the old cockpit (haemorrhage: pulse lost 10:08 instead of 10:03). The next visit
      // loads a fresh cockpit, as on a fresh page; if the view is on screen it reloads at once.
      let mounts = 0;
      const offReset = session.onMount(() => {
        if (++mounts === 1) return; // the patient the cockpit was opened for
        offReset();
        offAttach();
        offScale();
        detach();
        port.close();
        frame.onload = null;
        frame.src = 'about:blank';
        started = false;
        if (shown) queueMicrotask(() => view.enter?.('')); // after the mount loop (a new subscription would be visited by it)
      });
      let detach: () => void = () => {};
      const offAttach = session.onMount((m) => {
```

In `apps/demo/src/app/views/vent.ts`, find:

```ts
    },
  };
}
```

Replace with:

```ts
    },
    leave: () => {
      shown = false;
    },
  };
  return view;
}
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 fu11-vent-new-case fu11-vent-speed vent-link`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-vent-new-case.e2e.ts \
  apps/demo/src/app/views/vent.ts
git commit -m "fix(demo): a new patient unloads the Ventilator view's cockpit (FU-11 H6, R50 F10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part I — Engine and scenario command boundary (F08, F11, F13, F15, F16, F17) (branch `fu-11-c`)

### Task I0: Branch, install, block check and the before-numbers

**Branch** `fu-11-c` · **Findings** — · **Files** —

**Why:** Executor C owns Parts I (the engine command boundary), J (validation honesty) and K (test infrastructure) on
branch `fu-11-c`. Files it shares with another branch, in disjoint hunks: `engine.ts` (I1/I2's validate cases and J6's
`readSamples` vs D's snapshot hunks), `defib.ts` (I1's preselect line vs B2's tone hunks), `types.ts` (I2's doc line vs
D2's `stop()`), `port.ts` (I4's probe vs E3b's restore marker). The plan is not committed here (R50 M6).

- [ ] **Step 1.** **Worktree and install.**
```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-fu-11-c -b fu-11-c origin/main
cd ../scratch/wt-fu-11-c && npx -y pnpm@9.15.9 install --frozen-lockfile
python3 ../plans-backup/fu-11-plan-tools/check-blocks.py --branch c ../plans-backup/fu-11-hardening.md .
git commit --allow-empty -m "chore: FU-11 (c) starts on $(git rev-parse --short origin/main) (FU-11 I0)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -u origin fu-11-c
```
Expected: `branch c: 42 find/replace blocks (0 chained), 10 creates; problems: 0`.

- [ ] **Step 2.** **Before-numbers** (record; R50 M3): validation, ventilator, controller, engine fast; and run once
`PME_SHOTS= npx playwright test stage6a-screens --project=chromium` then `git status --short docs/gates` — it shows the
three `docs/gates/stage-6a/*.png` rewritten (K1's defect); `git checkout -- docs/gates` after.

### Task I1: Runtime validation refuses what it cannot run (F11)

**Branch** `fu-11-c` · **Findings** F11 · **Files** Modify `packages/engine-core/src/engine.ts`, `packages/engine-core/src/l2/endo/pipeline.ts`, `packages/engine-core/src/l2/resp/pipeline.ts`, `packages/engine-core/src/l3/defib-pacer/defib.ts`; Create `packages/engine-core/test/engine/fu11-command-boundary.test.ts`

**Why:** Measured on `f29951b` (writer's probe, MODELED, dispatched at 2 s, run to 8 s): `setRhythm 'toString'` and
`'constructor'` accepted, then `TypeError: Cannot read properties of undefined (reading '0')`; a NaN pacer rate
accepted (5 more NaN in the state); a meal without grams and a paw/flow-only ventilator frame accepted, then
`RangeError: rhythm sinus: next event time is NaN` (the engine stops); a shock outcome `'toString'` and a sepsis phase
`'toString'` accepted (the latter throws `Cannot convert undefined or null to object`). Every enum lookup uses
`Object.hasOwn`, the pacer numbers are range-checked (ratePpm 30–200, avDelayMs 50–350, faultRate 0–1), the meal's
grams and all five frame fields (paw, flow, volume, FiO2, PEEP) are required. Input validation only; no model change
(the ventilator link and every test already send full frames — prototype: fast set and ventilator suite green).

- [ ] **Step 1 — the failing tests.** 

Create `packages/engine-core/test/engine/fu11-command-boundary.test.ts`:

```ts
// FU-11 Task I1 (external review F11): a malformed command is refused with a reason, never accepted and left to throw
// or poison the state.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

let n = 0;
const cmd = (x: Record<string, unknown>) => ({ id: `b${n++}`, issuedBy: 'test', ...x }) as never;

describe('FU-11 I1: runtime validation (F11)', () => {
  const bad: Array<[string, Record<string, unknown>, RegExp]> = [
    ['an inherited rhythm name', { type: 'setRhythm', rhythm: 'toString' }, /unknown rhythm/],
    ['another inherited name', { type: 'setRhythm', rhythm: 'constructor' }, /unknown rhythm/],
    ['a NaN pacer rate', { type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { ratePpm: Number.NaN } } }, /opts\.pacer\.ratePpm/],
    ['a pacer fault rate above 1', { type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { faultRate: 3 } } }, /opts\.pacer\.faultRate/],
    ['a meal without its grams', { type: 'applyEvent', event: { kind: 'meal' } }, /carbohydrateG is required/],
    ['a ventilator frame with paw and flow only', { type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0.1 } }, /frame needs/],
    ['an inherited shock outcome', { type: 'applyEvent', event: { kind: 'defib', action: 'preselect', outcome: 'toString' } }, /outcome must be/],
    ['an inherited sepsis phase', { type: 'applyEvent', event: { kind: 'condition', id: 'sepsis', severity: 0.5, phase: 'toString' } }, /phase must be/],
  ];
  for (const [name, c, reason] of bad) {
    it(`refuses ${name}; the engine runs on with finite outputs`, () => {
      const e = createEngine({ seed: 7, mode: 'modeled' });
      e.advanceTo(2);
      const r = e.dispatch(cmd(c));
      expect(r.accepted).toBe(false);
      expect(r.reason).toMatch(reason);
      expect(() => e.advanceTo(8)).not.toThrow();
      const out = new Float32Array(500);
      expect(e.readSamples('ecgII', 3000, out)).toBe(500);
      expect(Array.from(out).every(Number.isFinite)).toBe(true);
    });
  }
  it('still accepts the valid forms (a real rhythm, a pacer rate, a meal, a full frame)', () => {
    const e = createEngine({ seed: 7, mode: 'modeled' });
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { ratePpm: 70 } } })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'meal', carbohydrateG: 50 } })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } })).accepted).toBe(true);
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-command-boundary.test.ts`  
Expected: 8 failed (each accepted, several throw), 1 passed (the valid forms)

- [ ] **Step 3 — implement.**

In `packages/engine-core/src/l3/defib-pacer/defib.ts`, find:

```ts
      return ev.outcome === 'unchanged' || (ev.outcome !== undefined && ev.outcome in RHYTHMS) ? undefined : "outcome must be a rhythm id or 'unchanged'";
```

Replace with:

```ts
      return ev.outcome === 'unchanged' || (typeof ev.outcome === 'string' && Object.hasOwn(RHYTHMS, ev.outcome)) ? undefined : "outcome must be a rhythm id or 'unchanged'"; // FU-11 (F11): own keys only
```

In `packages/engine-core/src/engine.ts`, find:

```ts
        if (!(cmd.rhythm in RHYTHMS)) return `unknown rhythm ${String(cmd.rhythm)}`;
        if (cmd.when !== undefined && cmd.when !== 'now' && cmd.when !== 'nextBeat') return 'when must be now or nextBeat';
        const o = cmd.opts ?? {};
        return (
          unknownKeys('opts', o, RHYTHM_OPT_KEYS) ?? // FU-8 (research/19 C12): an unknown option is refused, not dropped
          unknownKeys('opts.pacer', o.pacer ?? {}, PACER_OPT_KEYS) ??
```

Replace with:

```ts
        // FU-11 (F11): `in` also finds 'toString', 'constructor' … on the prototype — accepted, then the rhythm engine threw
        if (typeof cmd.rhythm !== 'string' || !Object.hasOwn(RHYTHMS, cmd.rhythm)) return `unknown rhythm ${String(cmd.rhythm)}`;
        if (cmd.when !== undefined && cmd.when !== 'now' && cmd.when !== 'nextBeat') return 'when must be now or nextBeat';
        const o = cmd.opts ?? {};
        return (
          unknownKeys('opts', o, RHYTHM_OPT_KEYS) ?? // FU-8 (research/19 C12): an unknown option is refused, not dropped
          unknownKeys('opts.pacer', o.pacer ?? {}, PACER_OPT_KEYS) ??
          // FU-11 (F11): the pacer's numbers are numbers (a NaN rate was accepted and the next beat time became NaN)
          numReason('opts.pacer.ratePpm', o.pacer?.ratePpm, 30, 200) ??
          numReason('opts.pacer.avDelayMs', o.pacer?.avDelayMs, 50, 350) ??
          numReason('opts.pacer.faultRate', o.pacer?.faultRate, 0, 1) ??
```

In `packages/engine-core/src/l2/endo/pipeline.ts`, find:

```ts
    case 'meal':
      return range('carbohydrateG', (ev as { carbohydrateG: number }).carbohydrateG, 0, 300);
    case 'thermal7e': {
      const e = ev as Extract<EndoClinicalEvent, { kind: 'thermal7e' }>;
      if (e.exposure !== undefined && !['draped', 'exposed', 'prep'].includes(e.exposure)) return 'exposure must be draped, exposed or prep';
      return range('airSpeedMs', e.airSpeedMs, 0, 2);
    }
    case 'condition': {
      const c = ev as { id: string; severity?: number; phase?: string; rampS?: number };
      if (!ENDO_CONDITIONS.includes(c.id)) return null; // Stage 3 (mh), 7a, 7c (burns, dka) …
      if (c.phase !== undefined && !(c.phase in SEPSIS_PHASES)) return 'phase must be sirs, sepsis, warm or cold';
```

Replace with:

```ts
    case 'meal': {
      // FU-11 (F11): the amount is required (an empty meal was accepted and its undefined grams poisoned the gut model)
      const g = (ev as { carbohydrateG?: number }).carbohydrateG;
      return g === undefined ? 'carbohydrateG is required' : range('carbohydrateG', g, 0, 300);
    }
    case 'thermal7e': {
      const e = ev as Extract<EndoClinicalEvent, { kind: 'thermal7e' }>;
      if (e.exposure !== undefined && !['draped', 'exposed', 'prep'].includes(e.exposure)) return 'exposure must be draped, exposed or prep';
      return range('airSpeedMs', e.airSpeedMs, 0, 2);
    }
    case 'condition': {
      const c = ev as { id: string; severity?: number; phase?: string; rampS?: number };
      if (!ENDO_CONDITIONS.includes(c.id)) return null; // Stage 3 (mh), 7a, 7c (burns, dka) …
      if (c.phase !== undefined && !(typeof c.phase === 'string' && Object.hasOwn(SEPSIS_PHASES, c.phase))) return 'phase must be sirs, sepsis, warm or cold'; // FU-11 (F11)
```

In `packages/engine-core/src/l2/resp/pipeline.ts`, find:

```ts
      ?? num('fio2', f.fio2, 0.21, 1) ?? num('peepCmH2O', f.peepCmH2O, 0, 40) ?? num('palvCmH2O', (f as VentFrameExt).palvCmH2O, -30, 150) ?? (f.pawCmH2O === undefined || f.flowLps === undefined ? 'frame needs pawCmH2O and flowLps' : undefined);
```

Replace with:

```ts
      ?? num('fio2', f.fio2, 0.21, 1) ?? num('peepCmH2O', f.peepCmH2O, 0, 40) ?? num('palvCmH2O', (f as VentFrameExt).palvCmH2O, -30, 150)
      // FU-11 (F11): every frame field the lung reads is required (a paw/flow-only frame left volume, FiO2 and PEEP
      // undefined, VT went NaN and the next beat time threw)
      ?? (f.pawCmH2O === undefined || f.flowLps === undefined || f.volumeMl === undefined || f.fio2 === undefined || f.peepCmH2O === undefined ? 'frame needs pawCmH2O, flowLps, volumeMl, fio2 and peepCmH2O' : undefined);
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-command-boundary.test.ts test/engine/engine-commands.test.ts test/engine/lung-external.test.ts`  
Expected: all passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/engine-core/src/engine.ts \
  packages/engine-core/src/l2/endo/pipeline.ts \
  packages/engine-core/src/l2/resp/pipeline.ts \
  packages/engine-core/src/l3/defib-pacer/defib.ts \
  packages/engine-core/test/engine/fu11-command-boundary.test.ts
git commit -m "fix(engine): runtime validation refuses inherited ids, NaN pacer values and incomplete meals and frames (FU-11 I1, F11)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task I2: Instructor intent is honoured or refused: modifier ramps, the pressure limit (F13, F15)

**Branch** `fu-11-c` · **Findings** F13, F15 · **Files** Modify `packages/controller/scenarios/pme-scenario-1.schema.json`, `packages/engine-core/src/engine.ts`, `packages/engine-core/src/l2/resp/pipeline.ts`, `packages/engine-core/src/types.ts`; Create `packages/engine-core/test/engine/fu11-intent.test.ts`

**Why:** F13: `setModifiers` validated a ramp and applied the change at once (QTc 400 → 500 at 0.02 s with delay 10 s,
duration 60 s; reproduced). No modifier has a ramp consumer and none is reachable from the app (Stage 9 report); a
nonzero delay or duration is now REFUSED with a reason (implementing ramps is new behaviour — declined here; RULED 2026-10-05 (Q6): refused with a reason in v1.0, timed modifier onsets go to the
v1.1 wish list). F15 (FU-6 code): a rate-only ventilator edit replaced the settings object before reading the kept
`pmax`: Pmax 25 dropped to the 40 default (reproduced: vent `{rr:16, vt:500, peep:5, ie:2}`, no pmax). The kept value
is read first. R50 M10: the type (`types.ts`) and the scenario schema (`pme-scenario-1.schema.json`) still advertised `ramp` on
`setModifiers`: both now say that version 1.0 refuses a ramp with a delay or duration (the property stays: a zero ramp
is accepted, documents stay valid).

- [ ] **Step 1 — the failing tests.** 

Create `packages/engine-core/test/engine/fu11-intent.test.ts`:

```ts
// FU-11 Task I2 (external review F13, F15): a modifier ramp is refused, not ignored; a ventilation edit keeps the
// pressure limit.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

let n = 0;
const cmd = (x: Record<string, unknown>) => ({ id: `i${n++}`, issuedBy: 'test', ...x }) as never;

describe('FU-11 I2: instructor intent (F13, F15)', () => {
  it('a modifier change with a delay or a duration is refused (no ramp consumer); without one it applies', () => {
    const e = createEngine({ seed: 7 });
    const r = e.dispatch(cmd({ type: 'setModifiers', modifiers: { qtc: 500 }, ramp: { delayS: 10, durationS: 60 } }));
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/ramp/);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { qtc: 500 } })).accepted).toBe(true);
  });
  it('a ventilator edit of the rate keeps the pressure limit set before it', () => {
    const e = createEngine({ seed: 7, mode: 'modeled' });
    const v = (x: Record<string, unknown>) => e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', ...x } }));
    v({ rr: 12, vtMl: 500, fio2: 0.5, peep: 5, pmax: 25 });
    e.advanceTo(2);
    v({ rr: 16 });
    e.advanceTo(4);
    const vent = (e.snapshot().state as { st: { resp: { driver: { vent: { rr: number; pmax?: number } } } } }).st.resp.driver.vent;
    expect(vent).toMatchObject({ rr: 16, pmax: 25 });
    v({ pmax: 30 });
    e.advanceTo(6);
    expect((e.snapshot().state as { st: { resp: { driver: { vent: { pmax?: number } } } } }).st.resp.driver.vent.pmax).toBe(30);
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-intent.test.ts`  
Expected: 2 failed (the ramped change is accepted; pmax undefined)

- [ ] **Step 3 — implement.**

In `packages/controller/scenarios/pme-scenario-1.schema.json`, find:

```json
            "modifiers": { "type": "object" }, "ramp": { "$ref": "#/definitions/ramp" }
```

Replace with:

```json
            "modifiers": { "type": "object" },
            "ramp": { "description": "FU-11 (F13): version 1.0 applies modifiers at once; the engine refuses a ramp with a delay or a duration", "allOf": [{ "$ref": "#/definitions/ramp" }] }
```

In `packages/engine-core/src/engine.ts`, find:

```ts
      case 'setModifiers': {
        return validateModifiers(cmd.modifiers) ?? rampReason(cmd.ramp);
```

Replace with:

```ts
      case 'setModifiers': {
        // FU-11 (F13): no modifier has a ramp consumer — a delayed or gradual change happened at once; refused, not ignored
        if (cmd.ramp !== undefined && ((cmd.ramp.durationS ?? 0) > 0 || (cmd.ramp.delayS ?? 0) > 0)) return 'setModifiers applies at once: a ramp (delayS, durationS) is not supported';
        return validateModifiers(cmd.modifiers) ?? rampReason(cmd.ramp);
```

In `packages/engine-core/src/types.ts`, find:

```ts
    | { type: 'setRhythm'; rhythm: RhythmId; opts?: RhythmOpts; when?: 'now' | 'nextBeat'; respectRefractory?: boolean }
    | { type: 'setModifiers'; modifiers: ModifiersPatch; ramp?: Ramp }
```

Replace with:

```ts
    | { type: 'setRhythm'; rhythm: RhythmId; opts?: RhythmOpts; when?: 'now' | 'nextBeat'; respectRefractory?: boolean }
    /** FU-11 (F13): modifiers apply at once in version 1.0 — a `ramp` with a delay or a duration is refused (Q6, ruled). */
    | { type: 'setModifiers'; modifiers: ModifiersPatch; ramp?: Ramp }
```

In `packages/engine-core/src/l2/resp/pipeline.ts`, find:

```ts
        d.vent = { rr: v.rr ?? d.vent.rr, vt: v.vtMl ?? d.vent.vt, peep: v.peep ?? d.vent.peep, ie: v.ie ?? d.vent.ie };
        const pmax = v.pmax ?? d.vent.pmax; // FU-6 R7 (absent = VCV_PMAX_DEFAULT; kept absent in snapshots that never set it)
```

Replace with:

```ts
        // FU-11 (F15): read the kept pressure limit BEFORE the settings object is replaced (an RR edit dropped Pmax 25 → 40)
        const pmax = v.pmax ?? d.vent.pmax; // FU-6 R7 (absent = VCV_PMAX_DEFAULT; kept absent in snapshots that never set it)
        d.vent = { rr: v.rr ?? d.vent.rr, vt: v.vtMl ?? d.vent.vt, peep: v.peep ?? d.vent.peep, ie: v.ie ?? d.vent.ie };
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-intent.test.ts test/engine/resp-vcv-pmax.test.ts test/engine/engine-commands.test.ts`  
Expected: all passed (resp-vcv-pmax is slow: ≈ 2 min)

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/controller/scenarios/pme-scenario-1.schema.json \
  packages/engine-core/src/engine.ts \
  packages/engine-core/src/l2/resp/pipeline.ts \
  packages/engine-core/src/types.ts \
  packages/engine-core/test/engine/fu11-intent.test.ts
git commit -m "fix(engine): a modifier ramp is refused, not ignored; a ventilator edit keeps Pmax (FU-11 I2, F13, F15)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task I3: Scenario alternatives do not consume each other's events; explicit MANUAL loads as MANUAL (F16, F17)

**Branch** `fu-11-c` · **Findings** F16, F17 · **Files** Modify `packages/controller/src/scenario/runner.ts`; Create `packages/controller/test/scenario/fu11-runner.test.ts`

**Why:** F16: `any([all([shock, HR > 200]), shock])` at HR 70 with one shock stayed in its state: the failed `all` had taken
the shock. Each alternative now works on a trial copy of the used set and commits only on success. F17: only a
MODELED document sent `setMode`; a MANUAL document loaded from a Remote onto a MODELED host stayed MODELED (the app's
own load creates a new engine with the document's mode, so the panel path was already right). Any explicit mode is
sent; a document without a mode sends none (unchanged). R50 M11: the test now also loads a MANUAL document through a real HostSession + ScenarioDriver on a MODELED
engine and reads the engine's mode from its snapshot (`l1.mode`): 'manual' (on main: stays 'modeled').

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/scenario/fu11-runner.test.ts`:

```ts
// FU-11 Task I3 (external review F16, F17): alternatives are tried without consuming what the next one needs; an
// explicit MANUAL document sets MANUAL on a host that runs MODELED.
import { afterEach, describe, expect, it } from 'vitest';
import { ScenarioRunner } from '../../src/scenario/runner.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';
import { doc, shock, vals } from './fixtures.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});
/** The engine's physiology mode, read from its snapshot (the L1 block). */
const engineMode = (h: ReturnType<typeof manualHost>) => /"l1":\{"mode":"(\w+)"/.exec(JSON.stringify(h.engine.snapshot()))?.[1];

describe('FU-11 I3: scenario runner', () => {
  it('any([all([shock, HR > 200]), shock]) fires on one shock at HR 70; the reversed order too', () => {
    for (const when of [
      { any: [{ all: [{ event: { kind: 'defib', action: 'shock' } }, { vital: { var: 'hr', op: '>', value: 200 } }] }, { event: { kind: 'defib', action: 'shock' } }] },
      { any: [{ event: { kind: 'defib', action: 'shock' } }, { all: [{ event: { kind: 'defib', action: 'shock' } }, { vital: { var: 'hr', op: '>', value: 200 } }] }] },
    ]) {
      const r = new ScenarioRunner(doc([{ when: when as never }]));
      r.start(0);
      r.advance(1, [vals({ hr: 70 }), shock()]);
      expect(r.stateId).toBe('b');
    }
  });
  it('a successful all still needs two distinct shocks', () => {
    const r = new ScenarioRunner(doc([{ when: { all: [{ event: { kind: 'defib', action: 'shock' } }, { event: { kind: 'defib', action: 'shock' } }] } as never }]));
    r.start(0);
    r.advance(1, [shock()]);
    expect(r.stateId).toBe('a');
    r.advance(2, [shock()]);
    expect(r.stateId).toBe('b');
  });
  it('an explicit MANUAL document starts with setMode manual; a document without a mode sends none', () => {
    const manual = { ...doc([{ when: { afterS: 5 } }]), mode: 'manual' as const };
    const fx = new ScenarioRunner(manual).start(0);
    expect(fx.flatMap((f) => (f.kind === 'commands' ? f.commands : []))).toContainEqual({ type: 'setMode', mode: 'manual' });
    const none = new ScenarioRunner(doc([{ when: { afterS: 5 } }])).start(0);
    expect(none.flatMap((f) => (f.kind === 'commands' ? f.commands : [])).some((c) => c.type === 'setMode')).toBe(false);
  });
  it('…and on a real MODELED host, loading it through the session makes the engine MANUAL (R50 M11)', async () => {
    const host = manualHost({ seed: 42, mode: 'modeled' } as never);
    expect(engineMode(host)).toBe('modeled');
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'MAN234', target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: 'MAN234', transport: hub.connect(), issuedBy: 'panel' });
    cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close());
    await waitFor(() => ctl.hostOnline);
    const manual = { ...doc([{ when: { afterS: 5 } }]), mode: 'manual' as const };
    expect((await ctl.send({ type: 'scenario', action: 'load', doc: manual })).accepted).toBe(true);
    for (let tick = 1; tick <= 50; tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
    }
    await new Promise((r) => setTimeout(r, 20)); // the runner's setup commands are stamped a few ticks ahead
    for (let tick = 51; tick <= 150; tick++) host.engine.advanceTo(tick * 0.02);
    expect(engineMode(host)).toBe('manual');
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario/fu11-runner.test.ts`  
Expected: 3 failed (F16; F17 runner; F17 on a real host: expected 'modeled' to be 'manual'), 1 passed (the distinct-events control)

- [ ] **Step 3 — implement.**

In `packages/controller/src/scenario/runner.ts`, find:

```ts
    if (this.doc.mode === 'modeled') setup.push({ type: 'setMode', mode: 'modeled' });
```

Replace with:

```ts
    if (this.doc.mode) setup.push({ type: 'setMode', mode: this.doc.mode }); // FU-11 (F17): MANUAL is explicit too
```

In `packages/controller/src/scenario/runner.ts`, find:

```ts
      const events: number[] = [];
      for (let i = 0; i < w.all.length; i++) {
        const r = this.holds(w.all[i] as When, `${key}.${i}`, pressed, used);
        if (!r.ok) return no;
        events.push(...r.events);
      }
      return { ok: true, events };
    }
    for (let i = 0; i < w.any.length; i++) {
      const r = this.holds(w.any[i] as When, `${key}.${i}`, pressed, used);
      if (r.ok) return r;
```

Replace with:

```ts
      // FU-11 (F16): tentative — an `all` that fails gives back the events its earlier members took
      const trial = new Set(used);
      const events: number[] = [];
      for (let i = 0; i < w.all.length; i++) {
        const r = this.holds(w.all[i] as When, `${key}.${i}`, pressed, trial);
        if (!r.ok) return no;
        events.push(...r.events);
      }
      for (const e of trial) used.add(e);
      return { ok: true, events };
    }
    for (let i = 0; i < w.any.length; i++) {
      const trial = new Set(used); // FU-11 (F16): a failed alternative consumes nothing the next one needs
      const r = this.holds(w.any[i] as When, `${key}.${i}`, pressed, trial);
      if (r.ok) {
        for (const e of trial) used.add(e);
        return r;
      }
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/scenario`  
Expected: all passed (builtins, replay, probability unchanged)

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/controller/src/scenario/runner.ts \
  packages/controller/test/scenario/fu11-runner.test.ts
git commit -m "fix(controller): scenario alternatives are tried without consuming events; explicit MANUAL is sent (FU-11 I3, F16, F17)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task I4: A refused first ventilator frame does not stall the link (F08)

**Branch** `fu-11-c` · **Findings** F08 · **Files** Modify `packages/ventilator/src/link/port.ts`; Create `packages/ventilator/test/fu11-port-rejected.test.ts`

**Why:** The first frame is the offset probe; when it was refused `learning` stayed true, no later frame could probe, no
offset was learnt and no clock was ever published: the ventilator stopped after its initial allowance (reproduced:
refused, rejected promise and thrown dispatch → 0 clock messages). A probe that is refused, rejects or throws frees the
next frame to probe (only for its own generation: V.1's restart rule kept); the refusal is still reported.

- [ ] **Step 1 — the failing tests.** 

Create `packages/ventilator/test/fu11-port-rejected.test.ts`:

```ts
// FU-11 Task I4 (external review F08): a refused first frame (the offset probe) must not stall the link for good — the
// next frame probes, an offset is learnt and the ventilator gets its clock.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, type LinkMsg } from '../src/index.ts';

describe('FU-11 I4: the link recovers from a refused probe', () => {
  for (const how of ['refused', 'rejected promise', 'throw'] as const) {
    it(`first dispatch ${how}, second accepted → a clock message`, async () => {
      const [vent, mon] = createLocalPortPair();
      const e = createEngine({ seed: 7 });
      let first = true;
      const refusals: string[] = [];
      const monitor = {
        dispatch: (c: Command): DispatchResult | Promise<DispatchResult> => {
          if (first) {
            first = false;
            if (how === 'refused') return { accepted: false, tick: 0, reason: 'test refusal' };
            if (how === 'rejected promise') return Promise.reject(new Error('test rejection'));
            throw new Error('test throw');
          }
          return e.dispatch(c);
        },
        on: (fn: (x: EngineEvent) => void) => e.on(fn),
      };
      attachMonitorToLink(monitor, mon, (_c, r) => refusals.push(r ?? ''));
      const clocks: LinkMsg[] = [];
      vent.onMessage((m) => m.kind === 'clock' && clocks.push(m));
      const frame = { type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } } as unknown as Command;
      vent.post({ v: 1, kind: 'cmds', tick: 1, cmds: [{ ...frame, id: 'f1', issuedBy: 'vent' } as Command] });
      await Promise.resolve();
      await Promise.resolve();
      vent.post({ v: 1, kind: 'cmds', tick: 2, cmds: [{ ...frame, id: 'f2', issuedBy: 'vent' } as Command] });
      for (let i = 0; i < 5; i++) await Promise.resolve();
      e.advanceTo(0.5);
      for (let i = 0; i < 5; i++) await Promise.resolve();
      expect(refusals).toHaveLength(1);
      expect(clocks.length).toBeGreaterThan(0);
    });
  }
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/fu11-port-rejected.test.ts`  
Expected: 3 failed: no clock message

- [ ] **Step 3 — implement.**

In `packages/ventilator/src/link/port.ts`, find:

```ts
        void Promise.resolve(mon.dispatch(at === undefined ? c : { ...c, atTick: at })).then((r) => {
          if (!r.accepted) onRejected(c, r.reason);
          else if (g !== gen) return; // Stage V.1: learnt from the ventilator before a restart — never install it
          else if (probe) {
            offset = r.tick - m.tick + LEAD_TICKS;
            learning = false;
            engTick = Math.max(engTick, r.tick - 1);
            publishClock();
          } else if (at !== undefined && r.tick > at) offset = (offset ?? 0) + r.tick - at;
        });
```

Replace with:

```ts
        // FU-11 (F08): a probe that is refused, throws or rejects frees the next command to probe (before, `learning`
        // stayed true, no offset was ever learnt, no clock was published and the ventilator stalled for good)
        const failed = (reason?: string) => {
          if (probe && g === gen) learning = false;
          onRejected(c, reason);
        };
        let sent: Promise<DispatchResult> | DispatchResult;
        try {
          sent = mon.dispatch(at === undefined ? c : { ...c, atTick: at });
        } catch (err) {
          failed(err instanceof Error ? err.message : String(err));
          continue;
        }
        void Promise.resolve(sent).then((r) => {
          if (!r.accepted) failed(r.reason);
          else if (g !== gen) return; // Stage V.1: learnt from the ventilator before a restart — never install it
          else if (probe) {
            offset = r.tick - m.tick + LEAD_TICKS;
            learning = false;
            engTick = Math.max(engTick, r.tick - 1);
            publishClock();
          } else if (at !== undefined && r.tick > at) offset = (offset ?? 0) + r.tick - at;
        }, (err: unknown) => failed(err instanceof Error ? err.message : String(err)));
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/ventilator/src/link/port.ts \
  packages/ventilator/test/fu11-port-rejected.test.ts
git commit -m "fix(ventilator): a refused offset probe frees the next frame to probe (FU-11 I4, F08)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part J — Validation honesty (F02, F10, F20–F23) (branch `fu-11-c`)

### Task J1: compareWave grades invalid samples red (F02)

**Branch** `fu-11-c` · **Findings** F02 · **Files** Modify `packages/validation/src/regression/baseline.ts`; Create `packages/validation/test/fu11/fu11-compare-wave.test.ts`

**Why:** `compareWave('probe','ecg',[1,2],[NaN,NaN])` graded green (NaN differences compare false). Non-finite samples on
either side, or nothing to compare, are red with `maxRelErr`/`rms` Infinity. Finite comparisons are unchanged.

- [ ] **Step 1 — the failing tests.** 

Create `packages/validation/test/fu11/fu11-compare-wave.test.ts`:

```ts
// FU-11 Task J1 (external review F02): validation cannot certify an invalid result as green.
import { describe, expect, it } from 'vitest';
import { compareWave } from '../../src/regression/baseline.ts';

describe('FU-11 J1: compareWave grades invalid samples red (F02)', () => {
  const base = [1, 2, 3, 4];
  it.each([
    ['all NaN', [Number.NaN, Number.NaN, Number.NaN, Number.NaN]],
    ['one NaN in the middle', [1, Number.NaN, 3, 4]],
    ['a last Infinity', [1, 2, 3, Infinity]],
    ['empty', []],
  ])('%s → red', (_n, now) => expect(compareWave('c', 'ecg', base, now).grade).toBe('red'));
  it('a non-finite or empty baseline is red; equal finite waves stay green', () => {
    expect(compareWave('c', 'ecg', [Number.NaN, 1], [1, 1]).grade).toBe('red');
    expect(compareWave('c', 'ecg', [], []).grade).toBe('red');
    expect(compareWave('c', 'ecg', base, [1, 2, 3, 4]).grade).toBe('green');
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11/fu11-compare-wave.test.ts`  
Expected: 3 failed (all-NaN and middle-NaN green; NaN baseline green), 2 passed

- [ ] **Step 3 — implement.**

In `packages/validation/src/regression/baseline.ts`, find:

```ts
export function compareWave(caseId: string, channel: string, base: number[], now: ArrayLike<number>): WaveCompare {
  let lo = Infinity;
```

Replace with:

```ts
export function compareWave(caseId: string, channel: string, base: number[], now: ArrayLike<number>): WaveCompare {
  // FU-11 (F02): a NaN or infinite sample on either side, or nothing to compare, is red — NaN differences compared false
  // against the limit, so an all-NaN waveform graded green
  let invalid = base.length === 0 || now.length === 0 ? 1 : 0;
  for (let i = 0; i < base.length; i++) if (!Number.isFinite(base[i] as number)) invalid++;
  for (let i = 0; i < now.length; i++) if (!Number.isFinite(now[i] as number)) invalid++;
  if (invalid > 0) return { case: caseId, channel, n: Math.min(base.length, now.length), failed: Math.max(base.length, now.length, 1), maxRelErr: Infinity, rms: Infinity, grade: 'red' };
  let lo = Infinity;
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11 test/regression`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/validation/src/regression/baseline.ts \
  packages/validation/test/fu11/fu11-compare-wave.test.ts
git commit -m "fix(validation): a NaN or empty waveform comparison is red (FU-11 J1, F02)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task J2: The validation R detector finds no peaks in an absent signal (F22)

**Branch** `fu-11-c` · **Findings** F22 · **Files** Modify `packages/validation/src/metrics/ecg.ts`; Create `packages/validation/test/fu11/fu11-detect-r.test.ts`

**Why:** 10 s of zeros at 500 Hz gave 40 "R peaks" (240/min): a zero threshold and plateau samples passing the strict
neighbour test. A flat trace (span ≤ 1e-6, NaN counted as 0) returns no peaks; a peak must be > 0 and rise above its
left neighbour (a plateau counts once). The morphology and interval suites are unchanged (prototype: validation 107
passed).

- [ ] **Step 1 — the failing tests.** 

Create `packages/validation/test/fu11/fu11-detect-r.test.ts`:

```ts
// FU-11 Task J2 (external review F22): validation cannot certify an invalid result as green.
import { describe, expect, it } from 'vitest';
import { detectR } from '../../src/metrics/ecg.ts';

describe('FU-11 J2: the validation R detector finds no peaks in an absent signal (F22)', () => {
  const fs = 500;
  it.each([
    ['zeros', () => 0],
    ['a constant', () => 0.7],
    ['all NaN', () => Number.NaN],
  ])('%s for 10 s → no peaks', (_n, f) => expect(detectR(Float64Array.from({ length: 10 * fs }, f), fs)).toEqual([]));
  it('a 60/min spike train still gives 10 peaks', () => {
    const x = Float64Array.from({ length: 10 * fs }, (_, i) => (i % fs < 10 ? 1.5 : 0));
    expect(detectR(x, fs).length).toBe(10);
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11/fu11-detect-r.test.ts`  
Expected: 3 failed (40 peaks in zeros / constant / NaN), 1 passed (the spike-train control)

- [ ] **Step 3 — implement.**

In `packages/validation/src/metrics/ecg.ts`, find:

```ts
  const clean = Float64Array.from(x, (v) => (Number.isFinite(v) ? v : 0));
  const f = bandpassZeroPhase(clean, fs, 5, 15);
```

Replace with:

```ts
  const clean = Float64Array.from(x, (v) => (Number.isFinite(v) ? v : 0));
  // FU-11 (F22): an absent signal has no R peaks. A flat (or all-invalid → zero) trace gave a zero threshold, and every
  // sample of a plateau passed the strict neighbour test — 40 "peaks" (240/min) in 10 s of zeros.
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of clean) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!(hi - lo > 1e-6)) return [];
  const f = bandpassZeroPhase(clean, fs, 5, 15);
```

In `packages/validation/src/metrics/ecg.ts`, find:

```ts
    if (v < (thr[i] as number) || v < (a[i - 1] as number) || v < (a[i + 1] as number)) continue;
```

Replace with:

```ts
    // FU-11 (F22): a peak rises above zero and above its left neighbour (a plateau counts once, at its first sample)
    if (!(v > 0) || v < (thr[i] as number) || v <= (a[i - 1] as number) || v < (a[i + 1] as number)) continue;
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/validation/src/metrics/ecg.ts \
  packages/validation/test/fu11/fu11-detect-r.test.ts
git commit -m "fix(validation): no R peaks in a flat or invalid trace (FU-11 J2, F22)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task J3: A refused intervention makes a validation run unmeasurable (F21)

**Branch** `fu-11-c` · **Findings** F21 · **Files** Modify `packages/validation/src/segments/run.ts`; Create `packages/validation/test/fu11/fu11-run-refused.test.ts`

**Why:** Only "later stage" refusals marked a run unmeasurable: an action HR 10 000 was refused and the run graded the
unchanged baseline green. Every refusal is now recorded (`refused: <reason>`; later-stage reasons keep their words) and
stops the run as unmeasurable. Gate step: `npx -y pnpm@9.15.9 --filter @pme/validation validate --suites sanity,gates
--quick --out <scratchpad>/fu-11-c/validate` before and after — the number of measurable documents must not change (a
change means a committed document sends a command the engine refuses: report it, do not edit the document). R50 M9: the review also asked for a way to DECLARE an expected refusal in a validation document (a case
that tests the refusal itself). Deferred, recorded: no committed document needs it today (Gate C's count proves it);
the appendix hands it to 8b's validation section.

- [ ] **Step 1 — the failing tests.** 

Create `packages/validation/test/fu11/fu11-run-refused.test.ts`:

```ts
// FU-11 Task J3 (external review F21): validation cannot certify an invalid result as green.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runValidationDoc } from '../../src/segments/run.ts';
import type { ValidationDoc } from '../../src/segments/types.ts';

describe('FU-11 J3: a refused intervention makes the run unmeasurable (F21)', () => {
  it('HR 10 000 at 2 s: not measurable, the refusal recorded with its reason', { timeout: 120_000 }, async () => {
    const doc = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../suites/sanity/or-induction-hypotension.json'), 'utf8')) as ValidationDoc;
    const r = await runValidationDoc({ ...doc, durationS: 10, actions: [{ t: 2, command: { type: 'setTarget', variable: 'hr', value: 10_000 } }] } as ValidationDoc);
    expect(r.measurable).toBe(false);
    expect(r.unsupported[0]?.reason).toMatch(/^refused: /);
    expect(r.results).toEqual([]);
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11/fu11-run-refused.test.ts`  
Expected: 1 failed: measurable true

- [ ] **Step 3 — implement.**

In `packages/validation/src/segments/run.ts`, find:

```ts
    if (!r.accepted && LATER_STAGE.test(r.reason ?? '')) unsupported.push({ t: engine.now().simT, type: c.type === 'applyEvent' ? `applyEvent ${(c.event as { kind: string }).kind}` : c.type, reason: r.reason ?? '' });
```

Replace with:

```ts
    // FU-11 (F21): EVERY refused action makes the run unmeasurable — a refused intervention otherwise graded the unchanged
    // baseline green. A later-stage gap keeps its own words; any other refusal says "refused".
    if (!r.accepted) unsupported.push({ t: engine.now().simT, type: c.type === 'applyEvent' ? `applyEvent ${(c.event as { kind: string }).kind}` : c.type, reason: LATER_STAGE.test(r.reason ?? '') ? (r.reason ?? '') : `refused: ${r.reason ?? ''}` });
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11 test/segments`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/validation/src/segments/run.ts \
  packages/validation/test/fu11/fu11-run-refused.test.ts
git commit -m "fix(validation): any refused action makes the run unmeasurable (FU-11 J3, F21)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task J4: Cached dataset bytes are checked like downloaded ones (F23)

**Branch** `fu-11-c` · **Findings** F23 · **Files** Modify `packages/validation/src/datasets/fetch-zenodo.ts`; Create `packages/validation/test/fu11/fu11-dataset-cache.test.ts`

**Why:** The MD5 was checked only after a download: a corrupt cache file was returned as is. The cache is checked too; a
mismatch refetches; a download is written to `<file>.part` and renamed (an interrupted write never becomes a cache
entry). No network in the test (fetch stubbed).

- [ ] **Step 1 — the failing tests.** 

Create `packages/validation/test/fu11/fu11-dataset-cache.test.ts`:

```ts
// FU-11 Task J4 (external review F23): validation cannot certify an invalid result as green.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchZenodo, md5 } from '../../src/datasets/fetch-zenodo.ts';

describe('FU-11 J4: cached dataset bytes are checked (F23)', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('a corrupt cache entry is fetched again; a good one needs no network', async () => {
    const cache = mkdtempSync(join(tmpdir(), 'pme-fu11-'));
    const good = new TextEncoder().encode('the real bytes');
    mkdirSync(join(cache, 'zenodo-1'), { recursive: true });
    writeFileSync(join(cache, 'zenodo-1', 'f.bin'), 'corrupt');
    const fetch = vi.fn(async () => new Response(good));
    vi.stubGlobal('fetch', fetch);
    expect(await fetchZenodo(cache, '1', 'f.bin', md5(good))).toEqual(good);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await fetchZenodo(cache, '1', 'f.bin', md5(good))).toEqual(good);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11/fu11-dataset-cache.test.ts`  
Expected: 1 failed: the corrupt bytes are returned, fetch called 0 times

- [ ] **Step 3 — implement.**

In `packages/validation/src/datasets/fetch-zenodo.ts`, find:

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const md5 = (buf: Uint8Array): string => createHash('md5').update(buf).digest('hex');

export async function fetchZenodo(cache: string, record: string, file: string, want: string): Promise<Uint8Array> {
  const path = join(cache, `zenodo-${record}`, file);
  let buf: Uint8Array;
  if (existsSync(path)) buf = new Uint8Array(readFileSync(path));
  else {
    const url = `https://zenodo.org/api/records/${record}/files/${file}/content`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    buf = new Uint8Array(await res.arrayBuffer());
    const got = md5(buf);
    if (got !== want) throw new Error(`zenodo ${record}/${file}: MD5 mismatch (${got} ≠ ${want})`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, buf);
```

Replace with:

```ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const md5 = (buf: Uint8Array): string => createHash('md5').update(buf).digest('hex');

export async function fetchZenodo(cache: string, record: string, file: string, want: string): Promise<Uint8Array> {
  const path = join(cache, `zenodo-${record}`, file);
  let buf: Uint8Array;
  // FU-11 (F23): cached bytes are checked like downloaded ones — a corrupt or truncated cache entry is fetched again
  const cached = existsSync(path) ? new Uint8Array(readFileSync(path)) : null;
  if (cached && md5(cached) === want) buf = cached;
  else {
    const url = `https://zenodo.org/api/records/${record}/files/${file}/content`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
    buf = new Uint8Array(await res.arrayBuffer());
    const got = md5(buf);
    if (got !== want) throw new Error(`zenodo ${record}/${file}: MD5 mismatch (${got} ≠ ${want})`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(`${path}.part`, buf); // atomic: an interrupted write never becomes a cache entry
    renameSync(`${path}.part`, path);
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11 test/datasets`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/validation/src/datasets/fetch-zenodo.ts \
  packages/validation/test/fu11/fu11-dataset-cache.test.ts
git commit -m "fix(validation): cached dataset bytes are checked; downloads are written atomically (FU-11 J4, F23)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task J5: The tick p99 gate is a real gate — run by hand at release (F10)

**Branch** `fu-11-c` · **Findings** F10 · **Files** Modify `packages/validation/src/perf/cli-ticks.ts`, `packages/validation/src/perf/tick-bench.ts`; Create `packages/validation/test/fu11/fu11-tick-gate.test.ts`

**Why:** The unit test bounds p50 only and says "the p99 gate is perf:ticks"; `perf:ticks` measured and printed and never
failed, and no workflow ran it. Decision (the review's first option): an honest MANUAL release check — `perf:ticks
--budget-ms <ms>` exits 1 when p99 is over the budget (`overBudget`, unit-tested); CI does not run it (shared 2-vCPU
runners; the review: no flaky p99 in contended suites); 8b's release checklist runs it on an idle machine with the
budget it records (the amendment text for 8b is in the appendix, A2 Step 1).

**Interfaces:** Produces: `overBudget(s: Pick<TickStats, "p99">, budgetMs: number | null): string | null`.

- [ ] **Step 1 — the failing tests.** 

Create `packages/validation/test/fu11/fu11-tick-gate.test.ts`:

```ts
// FU-11 Task J5 (external review F10): validation cannot certify an invalid result as green.
import { describe, expect, it } from 'vitest';
import { overBudget } from '../../src/perf/tick-bench.ts';

describe('FU-11 J5: the tick p99 gate (F10)', () => {
  it('passes at or under the budget, fails above it or on a non-number, is off without a budget', () => {
    expect(overBudget({ p99: 1.9 }, 2)).toBeNull();
    expect(overBudget({ p99: 2 }, 2)).toBeNull();
    expect(overBudget({ p99: 2.01 }, 2)).toMatch(/over the 2 ms budget/);
    expect(overBudget({ p99: Number.NaN }, 2)).toMatch(/NaN/);
    expect(overBudget({ p99: 99 }, null)).toBeNull();
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11/fu11-tick-gate.test.ts`  
Expected: fails: overBudget is not exported

- [ ] **Step 3 — implement.**

In `packages/validation/src/perf/tick-bench.ts`, find:

```ts
export interface TickStats { ticks: number; p50: number; p95: number; p99: number; max: number; heapGrowthMb: number }
```

Replace with:

```ts
export interface TickStats { ticks: number; p50: number; p95: number; p99: number; max: number; heapGrowthMb: number }

/** FU-11 (F10): the p99 gate of `perf:ticks --budget-ms` — a reason when the tail is over budget (or not a number), else null. */
export function overBudget(s: Pick<TickStats, 'p99'>, budgetMs: number | null): string | null {
  if (budgetMs === null) return null;
  return s.p99 <= budgetMs ? null : `tick p99 ${Number.isFinite(s.p99) ? s.p99.toFixed(3) : String(s.p99)} ms is over the ${budgetMs} ms budget`;
}
```

In `packages/validation/src/perf/cli-ticks.ts`, find:

```ts
import { tickBench } from './tick-bench.ts';

const i = process.argv.indexOf('--seconds');
const s = await tickBench(i >= 0 ? Number(process.argv[i + 1]) : 600);
const dir = fileURLToPath(new URL('../../../../docs/validation/perf', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'ticks.json'), `${JSON.stringify({ node: process.version, platform: `${process.platform}-${process.arch}`, date: new Date().toISOString(), ...s }, null, 1)}\n`);
console.log(JSON.stringify(s));
```

Replace with:

```ts
import { overBudget, tickBench } from './tick-bench.ts';

const i = process.argv.indexOf('--seconds');
// FU-11 (F10): `--budget-ms <p99>` makes this a gate: the run fails (exit 1) when the tick p99 is over the budget. It is a
// MANUAL release check (8b's checklist runs it on an idle machine); CI does not run it — its runners share cores.
const b = process.argv.indexOf('--budget-ms');
const budget = b >= 0 ? Number(process.argv[b + 1]) : null;
const s = await tickBench(i >= 0 ? Number(process.argv[i + 1]) : 600);
const dir = fileURLToPath(new URL('../../../../docs/validation/perf', import.meta.url));
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'ticks.json'), `${JSON.stringify({ node: process.version, platform: `${process.platform}-${process.arch}`, date: new Date().toISOString(), ...s }, null, 1)}\n`);
console.log(JSON.stringify(s));
const over = overBudget(s, budget);
if (over) {
  console.error(over);
  process.exitCode = 1;
}
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/validation exec vitest run test/fu11 test/perf`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/validation/src/perf/cli-ticks.ts \
  packages/validation/src/perf/tick-bench.ts \
  packages/validation/test/fu11/fu11-tick-gate.test.ts
git commit -m "feat(validation): perf:ticks --budget-ms fails over budget (a manual release gate) (FU-11 J5, F10)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task J6: The CO2 JSON-replay test compares real CO2 samples (F20)

**Branch** `fu-11-c` · **Findings** F20, R50 M8 · **Files** Modify `packages/engine-core/src/engine.ts`, `packages/engine-core/test/engine/resp-engine.test.ts`; Create `packages/engine-core/test/engine/fu11-read-samples.test.ts`

**Why:** The test named "co2" read the `resp` channel at sample index 1562.5: 300 NaN on both sides, equal. It now reads
`co2` at an integer index, asserts 300 samples, all finite and a real capnogram (span > 1 mmHg) before equality, on a
bronchospasm rig (the old `obstructed` airway gives a flat zero CO2 — nothing to compare). Test-only change; with D1's
codec the JSON replay is exact (branch b) — on main it already passes for CO2 (the NaN paths are elsewhere). R50 M8: the review also asked to fix the ROOT: `engine.readSamples` with a fractional index read past the
ring's slots and returned NaN. It now reads from the sample at or before the index (`Math.floor`) and nothing for
NaN/±∞ (integer callers unchanged; none of the renderer's paths passes a fraction).

- [ ] **Step 1 — the failing tests.** 

Create `packages/engine-core/test/engine/fu11-read-samples.test.ts`:

```ts
// FU-11 Task J6 (external review F20, R50 M8): a sample index is a whole number. A fractional `fromIndex` (time × 62.5 Hz)
// used to read past the ring's slots and return NaN — the root of F20's always-equal test. It now reads from the sample
// at or before that index; a non-finite index reads nothing.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

describe('FU-11 J6: readSamples takes whole sample indices (F20, R50 M8)', () => {
  it('a fractional index reads from the sample before it; NaN or Infinity reads nothing', () => {
    const e = createEngine({ seed: 3, patient: { sensors: { co2: 'on' } } });
    e.advanceTo(10);
    const at = new Float32Array(50);
    const frac = new Float32Array(50);
    expect(e.readSamples('co2', 100, at)).toBe(50);
    expect(e.readSamples('co2', 100.5, frac)).toBe(50);
    expect(Array.from(frac).every(Number.isFinite)).toBe(true);
    expect(Array.from(frac)).toEqual(Array.from(at));
    expect(e.readSamples('co2', Number.NaN, frac)).toBe(0);
    expect(e.readSamples('co2', Number.POSITIVE_INFINITY, frac)).toBe(0);
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/fu11-read-samples.test.ts`  
Expected: fails: a fractional index returns NaN samples (`expected false to be true`)

Run: `Before the resp-engine edit, add `console.log(Array.from(x).filter(Number.isNaN).length)` after the two reads and run `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-engine.test.ts``  
Expected: prints 300 (then remove the line)

- [ ] **Step 3 — implement.**

In `packages/engine-core/src/engine.ts`, find:

```ts
    return this.bufs.get(ch)?.read(fromIndex, out) ?? 0;
```

Replace with:

```ts
    // FU-11 (F20, R50 M8): a sample index is whole — a fractional one read NaN past the ring's slots; none for NaN/±∞
    if (!Number.isFinite(fromIndex)) return 0;
    return this.bufs.get(ch)?.read(Math.floor(fromIndex), out) ?? 0;
```

In `packages/engine-core/test/engine/resp-engine.test.ts`, find:

```ts
    a.dispatch(ev3({ kind: 'airway', state: 'obstructed' }));
    a.advanceTo(20);
    const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = createEngine({ seed: 3, patient: { sensors: { co2: 'on' } } });
    b.restore(snap);
    a.advanceTo(30);
    b.advanceTo(30);
    const x = new Float32Array(300);
    const y = new Float32Array(300);
    a.readSamples('resp', 25 * 62.5, x);
    b.readSamples('resp', 25 * 62.5, y);
```

Replace with:

```ts
    a.dispatch(ev3({ kind: 'airway', state: 'bronchospasm', severity: 0.5 })); // FU-11 (F20): obstructed gave a flat CO2 (nothing to compare)
    a.advanceTo(20);
    const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = createEngine({ seed: 3, patient: { sensors: { co2: 'on' } } });
    b.restore(snap);
    const e2rate = a.sampleRate('co2');
    a.advanceTo(30);
    b.advanceTo(30);
    // FU-11 (F20): the CO2 channel, at an integer sample index, with a count and a signal checked before equality (the
    // old read of 'resp' at index 1562.5 returned 300 NaN on both sides, and NaN arrays compare equal)
    const x = new Float32Array(300);
    const y = new Float32Array(300);
    const from = Math.round(25 * e2rate);
    expect(a.readSamples('co2', from, x)).toBe(300);
    expect(b.readSamples('co2', from, y)).toBe(300);
    expect(Array.from(x).every(Number.isFinite)).toBe(true);
    expect(Math.max(...x) - Math.min(...x)).toBeGreaterThan(1); // a real capnogram, not a flat line
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-engine.test.ts test/engine/fu11-read-samples.test.ts`  
Expected: 4 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/engine-core/src/engine.ts \
  packages/engine-core/test/engine/fu11-read-samples.test.ts \
  packages/engine-core/test/engine/resp-engine.test.ts
git commit -m "fix(engine): readSamples takes whole indices; the CO2 JSON-replay test reads real CO2 (FU-11 J6, F20, R50 M8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part K — Test infrastructure (gate screenshots, local WebRTC, load-sensitive tests, the slow-group check) (branch `fu-11-c`)

### Task K1: The e2e suite writes evidence screenshots only on request

**Branch** `fu-11-c` · **Findings** hotfix note "the full e2e suite rewrites committed gate screenshots" · **Files** Modify `apps/demo/e2e/fu1.e2e.ts`, `apps/demo/e2e/fu2.e2e.ts`, `apps/demo/e2e/fu5-fidelity.e2e.ts`, `apps/demo/e2e/fu5-latched.e2e.ts`, `apps/demo/e2e/fu6.e2e.ts`, `apps/demo/e2e/physiology-console.e2e.ts`, `apps/demo/e2e/stage4a-skins.e2e.ts`, `apps/demo/e2e/stage4b-device.e2e.ts`, `apps/demo/e2e/stage6a-latency.e2e.ts`, `apps/demo/e2e/stage6a-screens.e2e.ts`, `apps/demo/e2e/stage6b.e2e.ts`, `apps/demo/e2e/stage7a.e2e.ts`, `apps/demo/e2e/stage7d.e2e.ts`, `apps/demo/e2e/stage7g.e2e.ts`, `apps/demo/e2e/stage7k-mechanics.e2e.ts`, `apps/demo/e2e/stage9-shots.e2e.ts`

**Why:** Fifteen e2e files and the latency test wrote into `docs/gates/**` on every run: a local or CI e2e run left the
committed PNGs modified (reproduced: `stage6a-screens` rewrote three PNGs). They now write there only with
`PME_SHOTS=1` (the showcase files' existing convention), otherwise into `test-results/gate-shots/` (git-ignored).

- [ ] **Step 1 — the failing tests.** (this task changes a test; see Step 2)

- [ ] **Step 2 — run them red.**

Run: `PME_SHOTS= npx playwright test --retries=0 stage6a-screens --project=chromium && git status --short docs/gates`  
Expected: three ` M docs/gates/stage-6a/*.png` (then `git checkout -- docs/gates`)

- [ ] **Step 3 — implement.**

In `apps/demo/e2e/stage6a-latency.e2e.ts`, find:

```ts
  const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6a');
```

Replace with:

```ts
  const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-6a' : '../../../test-results/gate-shots/stage-6a'); // FU-11 K1
```

In `apps/demo/e2e/fu1.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-1');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/fu-1' : '../../../test-results/gate-shots/fu-1'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/fu2.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-2');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/fu-2' : '../../../test-results/gate-shots/fu-2'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/fu5-fidelity.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-5');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/fu-5' : '../../../test-results/gate-shots/fu-5'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/fu5-latched.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-5');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/fu-5' : '../../../test-results/gate-shots/fu-5'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/fu6.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-6');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/fu-6' : '../../../test-results/gate-shots/fu-6'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/physiology-console.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7x');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-7x' : '../../../test-results/gate-shots/stage-7x'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage4a-skins.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-4a');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-4a' : '../../../test-results/gate-shots/stage-4a'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage4b-device.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-4b');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-4b' : '../../../test-results/gate-shots/stage-4b'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage6a-screens.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6a');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-6a' : '../../../test-results/gate-shots/stage-6a'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage6b.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-6b');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-6b' : '../../../test-results/gate-shots/stage-6b'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage7a.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7a');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-7a' : '../../../test-results/gate-shots/stage-7a'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage7d.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7d');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-7d' : '../../../test-results/gate-shots/stage-7d'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage7g.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7g');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-7g' : '../../../test-results/gate-shots/stage-7g'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage7k-mechanics.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7k');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-7k' : '../../../test-results/gate-shots/stage-7k'); // FU-11 K1: evidence only on request
```

In `apps/demo/e2e/stage9-shots.e2e.ts`, find:

```ts
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-9');
```

Replace with:

```ts
const out = resolve(import.meta.dirname, process.env.PME_SHOTS === '1' ? '../../../docs/gates/stage-9' : '../../../test-results/gate-shots/stage-9'); // FU-11 K1: evidence only on request
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `PME_SHOTS= npx playwright test --retries=0 stage6a-screens fu1 --project=chromium && git status --short docs/gates`  
Expected: empty

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu1.e2e.ts \
  apps/demo/e2e/fu2.e2e.ts \
  apps/demo/e2e/fu5-fidelity.e2e.ts \
  apps/demo/e2e/fu5-latched.e2e.ts \
  apps/demo/e2e/fu6.e2e.ts \
  apps/demo/e2e/physiology-console.e2e.ts \
  apps/demo/e2e/stage4a-skins.e2e.ts \
  apps/demo/e2e/stage4b-device.e2e.ts \
  apps/demo/e2e/stage6a-latency.e2e.ts \
  apps/demo/e2e/stage6a-screens.e2e.ts \
  apps/demo/e2e/stage6b.e2e.ts \
  apps/demo/e2e/stage7a.e2e.ts \
  apps/demo/e2e/stage7d.e2e.ts \
  apps/demo/e2e/stage7g.e2e.ts \
  apps/demo/e2e/stage7k-mechanics.e2e.ts \
  apps/demo/e2e/stage9-shots.e2e.ts
git commit -m "test(demo): e2e evidence goes to docs/gates only with PME_SHOTS=1 (FU-11 K1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task K2: The loopback WebRTC e2e skip where headless Chromium cannot run them (macOS)

**Branch** `fu-11-c` · **Findings** hotfix note "two stage6a WebRTC e2e fail locally" · **Files** Modify `apps/demo/e2e/stage6a-latency.e2e.ts`, `apps/demo/e2e/stage6a.e2e.ts`

**Why:** `stage6a.e2e.ts` "over rtc" and `stage6a-latency.e2e.ts`'s rtc path fail on macOS (Chromium: the remote never sees
the host — no loopback ICE candidate). Tried: `--allow-loopback-in-peer-connection` — still failing (measured
2026-10-04). They pass on CI (Linux). Local macOS runs skip them with the reason; `PME_RTC=1` forces them.

- [ ] **Step 1 — the failing tests.** (this task changes a test; see Step 2)

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 stage6a.e2e --project=chromium -g rtc`  
Expected: 1 failed (remote hostOnline never true)

- [ ] **Step 3 — implement.**

In `apps/demo/e2e/stage6a.e2e.ts`, find:

```ts
    test.skip(via === 'rtc' && browserName === 'webkit', 'loopback WebRTC unsupported in headless WebKit');
    const errors: string[] = [];
```

Replace with:

```ts
    test.skip(via === 'rtc' && browserName === 'webkit', 'loopback WebRTC unsupported in headless WebKit');
    // FU-11 K2: headless Chromium on macOS gathers no loopback candidate either (measured 2026-10-04, also with
    // --allow-loopback-in-peer-connection); CI (Linux) runs it, PME_RTC=1 forces it locally
    test.skip(via === 'rtc' && process.platform === 'darwin' && !process.env.PME_RTC, 'loopback WebRTC unsupported in headless Chromium on macOS');
    const errors: string[] = [];
```

In `apps/demo/e2e/stage6a-latency.e2e.ts`, find:

```ts
  // Headless WebKit on Linux CI cannot complete a loopback WebRTC ICE exchange; skip that path there.
  const paths = browserName === 'webkit' ? (['in-process', 'bc', 'relay'] as const) : (['in-process', 'bc', 'relay', 'rtc'] as const);
```

Replace with:

```ts
  // Headless WebKit on Linux CI cannot complete a loopback WebRTC ICE exchange; skip that path there. FU-11 K2: nor can
  // headless Chromium on macOS (no loopback host candidate; also with --allow-loopback-in-peer-connection, measured
  // 2026-10-04) — local runs skip it unless PME_RTC=1; CI (Linux Chromium) runs it.
  const noRtc = browserName === 'webkit' || (process.platform === 'darwin' && !process.env.PME_RTC);
  const paths = noRtc ? (['in-process', 'bc', 'relay'] as const) : (['in-process', 'bc', 'relay', 'rtc'] as const);
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 stage6a.e2e stage6a-latency --project=chromium`  
Expected: 1 skipped, the rest passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/stage6a-latency.e2e.ts \
  apps/demo/e2e/stage6a.e2e.ts
git commit -m "test(demo): skip the loopback WebRTC e2e on macOS unless PME_RTC=1 (FU-11 K2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task K3: Fast tests that time out under load

**Branch** `fu-11-c` · **Findings** truth-event 1 ms bound, ventilator ports.test, ET-19 diabetic arm (FU-7) · **Files** Modify `packages/engine-core/test/engine/truth-event.test.ts`, `packages/ventilator/test/ports.test.ts`

**Why:** (a) `truth-event.test.ts` asserted one 200-call batch < 1 ms per call: one batch on a loaded runner can exceed it
while the cost did not change — the best of five 40-call batches is asserted. DISCLOSED RELAXATION (R50 M16, R45): the
1 ms bound is unchanged but the statistic is more lenient (a minimum of five means of 40 instead of one mean of 200);
reason: a CI runner's scheduler stalls inflate one long batch, not the cost; the gate note says so. (b)
`ports.test.ts`'s two engine-driving link tests ran under the 5 s default: `{ timeout: 30_000 }` (CI amendment 3, the
PR #35 precedent). Note: FU-10's CI-amendment commit 662f8a1b carried the same two edits on its branch, but they are
NOT on main 48864439 (the merge kept main's lines) — this task applies them.

- [ ] **Step 1 — the failing tests.** (this task changes a test; see Step 2)

- [ ] **Step 2 — run them red.**

Run: `—`  
Expected: flaky only under load; no deterministic red

- [ ] **Step 3 — implement.**

In `packages/engine-core/test/engine/truth-event.test.ts`, find:

```ts
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) pruneTruth(st, dev);
    const per = (performance.now() - t0) / 200;
```

Replace with:

```ts
    // FU-11 K3: the best of five 40-call batches — one batch on a loaded runner could exceed the bound while the cost did not
    let per = Infinity;
    for (let b = 0; b < 5; b++) {
      const t0 = performance.now();
      for (let i = 0; i < 40; i++) pruneTruth(st, dev);
      per = Math.min(per, (performance.now() - t0) / 40);
    }
```

In `packages/ventilator/test/ports.test.ts`, find:

```ts
  it('monitor side: frames replay on their own engine ticks, lungState goes back, the ventilator never outruns the engine', async () => {
```

Replace with:

```ts
  it('monitor side: frames replay on their own engine ticks, lungState goes back, the ventilator never outruns the engine', { timeout: 30_000 }, async () => { // FU-11 K3: a real engine under CI load (CI amendment 3)
```

In `packages/ventilator/test/ports.test.ts`, find:

```ts
  it('monitor side: a ventilator restart while the offset probe is in flight relearns from the new ventilator', async () => {
```

Replace with:

```ts
  it('monitor side: a ventilator restart while the offset probe is in flight relearns from the new ventilator', { timeout: 30_000 }, async () => { // FU-11 K3: a real engine under CI load (CI amendment 3)
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/truth-event.test.ts`  
Expected: 5 passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/ventilator exec vitest run test/ports.test.ts`  
Expected: 3 passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/engine-core/test/engine/truth-event.test.ts \
  packages/ventilator/test/ports.test.ts
git commit -m "test: best-of batches for the truth-event cost; engine-driving link tests get 30 s (FU-11 K3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task K4: FU-7's ET-19 file leaves the fast set; the seven slow groups are verified (R50 F9, CI amendment 6)

**Branch** `fu-11-c` · **Findings** CI note "ET-19 diabetic arm times out under load", R50 F9 (CI amendment 6) · **Files** Modify `packages/engine-core/vite.config.ts`

**Why:** R50 F9 measured `test/l2/pk/interactions-misc.test.ts` at 15.2 s alone in the fast set (FU-7's ET-19: four 8 h arms
simulated synchronously — the kind the slow set exists for). It joins SLOW; it is in no named group, so it runs in
slow-b (the remainder group of CI amendment 6, now on main: SEVEN groups re-packed to ≈ 33 min each by FU-10's gate,
662f8a1b). Part K no longer adds or re-packs groups (the coordinator's update): it VERIFIES them — the disjointness and
coverage check of ci.yml run locally, and the group times measured on the PR's CI (Gate C) with no group over 35 min.
`.github/**` is not edited.

- [ ] **Step 1 — the failing tests.** (this task changes a test; see Step 2)

- [ ] **Step 2 — run them red.**

Run: `cd packages/engine-core && PME_TEST_SET=fast npx vitest list --filesOnly | grep -c interactions-misc`  
Expected: 1 (in the fast set)

- [ ] **Step 3 — implement.**

In `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/drug-layer-guards.test.ts', // FU-7 Task 19 case 7: the regression guards (split from drug-layer by time)
];
```

Replace with:

```ts
  'test/engine/drug-layer-guards.test.ts', // FU-7 Task 19 case 7: the regression guards (split from drug-layer by time)
  'test/l2/pk/interactions-misc.test.ts', // FU-11 K4 (R50 F9): FU-7's ET-19 four 8 h arms, 15.2 s alone in the fast set — slow-b (the remainder)
];
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `cd packages/engine-core && for g in slow slow-a slow-b slow-c slow-d slow-e slow-f slow-g fast; do PME_TEST_SET=$g npx vitest list --filesOnly | sort > /tmp/fu11-$g.txt; done; sort /tmp/fu11-slow-[a-g].txt | uniq -d | wc -l; sort -u /tmp/fu11-slow-[a-g].txt | diff /tmp/fu11-slow.txt - && echo COVER-OK; grep -c interactions-misc /tmp/fu11-slow-b.txt /tmp/fu11-fast.txt`  
Expected: `0`, `COVER-OK`, slow-b 1, fast 0 (use `<scratchpad>` instead of /tmp)

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/engine-core/vite.config.ts
git commit -m "test(engine): ET-19 joins the slow set (slow-b) (FU-11 K4, R50 F9)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```


## Part G — The second-screen learner monitor (K2; its own branch, R50 F11) (branch `fu-11-d`)

### Task G0: Branch on fu-11-b, install, block check

**Branch** `fu-11-d` · **Findings** R50 F11 · **Files** —

**Why:** R50 F11: the second-screen learner monitor is a NEW FEATURE; it leaves the hardening gate and gets its own branch
`fu-11-d`, built ON `fu-11-b` (it uses E2's restore, E3's timeline and the app files Part H edits) and merged LAST, with
its own gate (Gate D). A later plan adds a QR-paired MOBILE learner monitor on top of G2 — G2 documents its wire
contract in `follower.ts` (header) so that plan builds on it without re-opening these files.

- [ ] **Step 1.** **Worktree** (after `fu-11-b`'s last task is pushed; if b has merged, branch from `origin/main` instead and pass
`--b-merged` below):
```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-fu-11-d -b fu-11-d origin/fu-11-b
cd ../scratch/wt-fu-11-d && npx -y pnpm@9.15.9 install --frozen-lockfile
python3 ../plans-backup/fu-11-plan-tools/check-blocks.py --branch d [--b-merged] docs/plans/fu-11-hardening.md .
git commit --allow-empty -m "chore: FU-11 (d) starts on fu-11-b $(git rev-parse --short HEAD) (FU-11 G0)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -u origin fu-11-d
```
Expected: `branch d (on b): 32 find/replace blocks (0 chained), 4 creates; problems: 0`. The plan file comes
with b (R50 M6); tick G there.

### Task G1: Commands applied outside the session reach a viewer (`mirror`)

**Branch** `fu-11-d` · **Findings** showcase kit K2 (the Ventilator-view half), R50 F3 (orchestrator ruling) · **Files** Modify `packages/controller/relay/server.ts`, `packages/controller/src/protocol.ts`, `packages/controller/src/session/controller-session.ts`, `packages/controller/src/session/host-session.ts`; Create `packages/controller/test/session/fu11-mirror.test.ts`, `packages/controller/test/relay/fu11-relay-mirror.test.ts`

**Why:** A second-screen viewer mirrors the commands the HOST SESSION applies. The Ventilator view drives the monitor
directly (50 commands a second × speed): measured with the prototype follower, the viewer resynced 9 times in 10 s
(a lane reset each time). R50 F3 RULING (orchestrator): these commands are the ventilator's FRAMES — pressure, flow and
volume every 20 ms of sim, i.e. samples — so mirroring them is allowed ONLY over the same-browser BroadcastChannel,
never over the relay or WebRTC, and it is a DECLARED DEVIATION from brief §3.7 / D-7 ("samples never cross the wire").
Settings-mirroring was tried first, as the ruling prefers, and is not exact: the follower's own cockpit would learn
its own tick offset, and a frame one tick off moves the beats 3.5 ms (five ticks: 18 ms; ViewerSync resyncs above
1 ms) — measured with the prototype; so the host's APPLIED frames are mirrored, stamped at their tick.
`HostSession.mirror(cmd, result)` sends a `commandApplied` with `resolved.mirror = true` DIRECTLY to the host's
`broadcastChannel` transports (not the in-process panel, not a WebSocket/WebRTC transport), only while a viewer has
said hello in the last 10 min; the relay DROPS any event batch holding a mirror frame (guard + test:
`fu11-relay-mirror`); `ControllerSession` does not log mirrored commands. Measured with mirroring: 0 resyncs over
160 s of sim on both engines.

**Interfaces:** Produces: `HostSession.mirror(cmd: Command, result: DispatchResult): void`; `AppliedResolution.mirror?: boolean`.

- [ ] **Step 1 — the failing tests.** 

Create `packages/controller/test/session/fu11-mirror.test.ts`:

```ts
// FU-11 Task G1 (showcase kit K2; R50 F3): commands applied OUTSIDE the session (the Ventilator view's link) reach a
// second-screen viewer as `mirror` commandApplied events — only once a viewer has said hello, only over the same-browser
// BroadcastChannel (they are the ventilator's samples: never the relay, WebRTC or the in-process panel).
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { HostSession } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

class FakeSocket extends TransportBase {
  readonly kind = 'websocket' as const;
  readonly sent: WireMessage[] = [];
  constructor() {
    super();
    this.setStatus('open');
  }
  protected write(m: WireMessage): void {
    this.sent.push(m);
  }
  protected teardown(): void {}
}

const S = 'MIR234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());
const mirrored = (ms: WireMessage[]) => ms.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body).filter((x) => x.type === 'commandApplied' && (x.resolved as { mirror?: boolean }).mirror);

describe('FU-11 G1: HostSession.mirror', () => {
  it('nothing without a viewer; after a viewer hello each accepted link command goes out once, at its tick, on BroadcastChannel only', async () => {
    const e = createEngine({ seed: 3 });
    hs = new HostSession({ session: S, target: { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined }, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const panel = collect(hub.connect());
    const socket = new FakeSocket();
    hs.addTransport(socket);
    hs.addTransport(createBroadcastChannelTransport(S));
    const viewer = createBroadcastChannelTransport(S);
    const got = collect(viewer);
    const frame = (id: string) => ({ id, issuedBy: 'vent-link', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } }) as never;
    hs.mirror(frame('v1'), e.dispatch(frame('v1')));
    await sleep(30);
    expect(mirrored(got)).toHaveLength(0);
    viewer.send(createStamper(S, 'view-1')({ kind: 'hello', role: 'viewer' }));
    await waitFor(() => got.some((m) => m.kind === 'snapshot'));
    const r = e.dispatch(frame('v2'));
    hs.mirror(frame('v2'), r);
    await waitFor(() => mirrored(got).length === 1);
    expect(mirrored(got)[0]).toMatchObject({ commandId: 'v2', tick: r.tick, resolved: { mirror: true, command: { atTick: r.tick } } });
    expect(mirrored(socket.sent)).toHaveLength(0);
    expect(mirrored(panel)).toHaveLength(0);
    viewer.close();
  });
});
```

Create `packages/controller/test/relay/fu11-relay-mirror.test.ts`:

```ts
// FU-11 Task G1 (R50 F3): the relay refuses a host's `mirror` frames (the Ventilator view's samples); other events pass.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStamper } from '../../src/protocol.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

let relay: RelayHandle;
let url: string;
beforeEach(async () => {
  relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000 });
  url = `ws://127.0.0.1:${relay.port}`;
});
afterEach(async () => relay.close());

describe('FU-11 G1: no mirror frame crosses the relay', () => {
  it('a mirror commandApplied is dropped; a plain event is delivered', async () => {
    const open = async () => {
      const ws = new WebSocket(url);
      const got: string[] = [];
      ws.onmessage = (e) => got.push(String(e.data));
      await waitFor(() => ws.readyState === WebSocket.OPEN, 3000, 'open');
      return { ws, got };
    };
    const h = await open();
    const v = await open();
    const hs = createStamper('MRR234', 'h');
    h.ws.send(JSON.stringify(hs({ kind: 'hello', role: 'host' })));
    v.ws.send(JSON.stringify(createStamper('MRR234', 'v')({ kind: 'hello', role: 'viewer' })));
    await waitFor(() => v.got.some((m) => m.includes('"peers"')), 3000, 'joined');
    const cmd = { id: 'f1', issuedBy: 'vent-link', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } };
    h.ws.send(JSON.stringify(hs({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'f1', tick: 9, resolved: { command: cmd, mirror: true } }] as never })));
    h.ws.send(JSON.stringify(hs({ kind: 'event', body: [{ type: 'scenario', t: 1, stateId: 'sentinel' }] as never })));
    await waitFor(() => v.got.some((m) => m.includes('sentinel')), 3000, 'sentinel');
    await sleep(50);
    expect(v.got.some((m) => m.includes('"mirror":true'))).toBe(false);
    h.ws.close();
    v.ws.close();
  });
});
```

- [ ] **Step 2 — run them red.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session/fu11-mirror.test.ts test/relay/fu11-relay-mirror.test.ts`  
Expected: fail: hs.mirror is not a function; the relay forwards the mirror batch

- [ ] **Step 3 — implement.**

In `packages/controller/relay/server.ts`, find:

```ts
        if (!isHost) return void dropped++;
        for (const p of room.peers) raw(p.ws, data);
```

Replace with:

```ts
        if (!isHost) return void dropped++;
        // FU-11 (R50 F3): a host's `mirror` frames (the Ventilator view's samples) are for same-browser viewers only —
        // brief §3.7: raw samples never cross the wire
        if (m.body.some((e) => e.type === 'commandApplied' && (e.resolved as { mirror?: unknown } | undefined)?.mirror === true)) return void dropped++;
        for (const p of room.peers) raw(p.ws, data);
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
const TICK_S = 0.02;
```

Replace with:

```ts
const TICK_S = 0.02;
/** FU-11 (K2): a viewer that said hello this recently still gets the mirrored link commands (it re-hellos on every resync) [ENG]. */
const VIEWER_TTL_MS = 600_000;
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  private bookmarkN = 0;
  readonly stats = { applied: 0, rejected: 0, duplicates: 0, snapshotsSent: 0 };
```

Replace with:

```ts
  private bookmarkN = 0;
  private viewerSeenAt = -Infinity; // FU-11 (K2): wall ms of the last viewer hello
  readonly stats = { applied: 0, rejected: 0, duplicates: 0, snapshotsSent: 0 };
```

In `packages/controller/src/session/host-session.ts`, find:

```ts

  /** Broadcast an event that did not come from the engine (e.g. `scenario`), batched with this frame's events. */
```

Replace with:

```ts

  /**
   * FU-11 (K2): a command the host's monitor applied OUTSIDE this session (the Ventilator view's link drives it directly,
   * up to 200 commands a second at ×4) — sent as a `mirror` commandApplied so a second-screen viewer applies it at the
   * same tick, and only while a viewer has said hello (no traffic in a session without one) [ENG: 10 min].
   * R50 F3 (orchestrator ruling; a DECLARED deviation from brief §3.7): these are the ventilator's frames — pressure,
   * flow and volume every 20 ms of sim, i.e. samples — so they go ONLY to same-browser BroadcastChannel transports,
   * never to the relay, WebRTC or the in-process panel (and the relay refuses them, relay/server.ts). Mirroring the
   * cockpit's SETTINGS instead cannot be exact: a frame one tick off moves the beats 3.5 ms (five ticks: 18 ms; the
   * viewer resyncs above 1 ms), and a follower-side cockpit learns its own tick offset.
   */
  mirror(cmd: Command, result: DispatchResult): void {
    if (!result.accepted || this.now() - this.viewerSeenAt > VIEWER_TTL_MS) return;
    const m = this.stamp({ kind: 'event', body: [{ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: { ...cmd, atTick: result.tick }, mirror: true } satisfies AppliedResolution }] });
    for (const t of this.transports.keys()) if (t.kind === 'broadcastChannel') t.send(m);
  }

  /** Broadcast an event that did not come from the engine (e.g. `scenario`), batched with this frame's events. */
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    if (m.from === this.peerId || this.seqs.check(m) === 'duplicate') return;
    if (m.kind === 'hello' && m.role !== 'host') return this.welcome(t);
```

Replace with:

```ts
    if (m.from === this.peerId || this.seqs.check(m) === 'duplicate') return;
    if (m.kind === 'hello' && m.role === 'viewer') this.viewerSeenAt = this.now();
    if (m.kind === 'hello' && m.role !== 'host') return this.welcome(t);
```

In `packages/controller/src/protocol.ts`, find:

```ts
  replay?: boolean;
}
```

Replace with:

```ts
  replay?: boolean;
  /** FU-11 (K2): applied outside the session (the Ventilator view's link) and sent only so a viewer mirrors it; not a log line. */
  mirror?: boolean;
}
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
      if (c && !res?.replay && !mine) this.addLog('applied', describe(c), e.commandId);
```

Replace with:

```ts
      if (c && !res?.replay && !res?.mirror && !mine) this.addLog('applied', describe(c), e.commandId); // FU-11: link traffic is not a log line
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/session test/relay`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add packages/controller/relay/server.ts \
  packages/controller/src/protocol.ts \
  packages/controller/src/session/controller-session.ts \
  packages/controller/src/session/host-session.ts \
  packages/controller/test/relay/fu11-relay-mirror.test.ts \
  packages/controller/test/session/fu11-mirror.test.ts
git commit -m "feat(controller): HostSession.mirror sends link frames to same-browser viewers only; the relay drops them (FU-11 G1, K2, R50 F3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task G2: A real second-screen learner monitor that follows the instructor's session (K2)

**Branch** `fu-11-d` · **Findings** showcase kit K2; R50 F4, F5; owner ruling Q3 (same style, sound per window) · **Files** Modify `apps/demo/src/app/app.css`, `apps/demo/src/app/main.ts`, `apps/demo/src/app/session.ts`, `apps/demo/src/app/shell.ts`, `apps/demo/src/app/views/monitor.ts`, `apps/demo/src/app/views/start.ts`, `apps/demo/src/app/views/vent.ts`, `packages/renderer/src/alarm-audio.ts`, `packages/renderer/src/index.ts`, `packages/renderer/src/mount.ts`, `packages/renderer/src/worker-host.ts`, `packages/renderer/test/alarm-audio.test.ts`; Create `apps/demo/src/app/views/follower.ts`, `apps/demo/e2e/fu11-follower.e2e.ts`

**Why:** On `f29951b` "Open the learner monitor" switched THIS window to `#/monitor`, and a second window at `#/monitor`,
`#/explore` or `#/vent` started a patient of its own (kit proof `multiwindow.showcase.ts`); the showcase therefore ran
one mirrored window. Decision (prototyped): a window at `?follow=<code>#/monitor` runs NO session — a `role:'viewer'`
monitor on the main thread (`worker:'off'`: ViewerSync steers its clock synchronously every frame, via the new
`MonitorHandle.viewerClock()`), the site's skin and theme, and a Stage 6a `ViewerSync` on the session's
BroadcastChannel: the host's snapshot, then every applied command at the host's tick (sample-identical on one build;
samples never cross). A restart, scenario load or bookmark restore resyncs it (E3). Start offers "Show the learner
monitor here" (the old behaviour, renamed) and "Open the learner monitor in a new window"; the Monitor view's strip has
"Open on a second screen". The Ventilator view's link goes through `AppSession.linked(m)`: its commands are mirrored
(G1) and the cockpit's own speed/pause buttons become SESSION commands (they acted on the monitor alone). Same browser
only (BroadcastChannel), like the Remote in v1.0. The follower's sound starts off (two windows would double it).
R50 F4: the window opens with `noopener` — its own
browsing-context group, so its own event loop (it ran on the instructor's main thread); it still follows over the
BroadcastChannel (asserted: `window.opener` null). R50 F5: the instructor's session code survives a reload (`?session=`
in its URL, replaced on start) and the follower has a liveness rule — no host message for 5 s while running →
"The instructor's monitor is not answering" (not a frozen "Following"); a new host hello resets speed and pause (E3).
Owner ruling Q3: the follower wears the instructor's monitor STYLE and follows its changes (a style channel
`pme-style:<code>`: ask / style; presentation, not the session wire); alarm SOUND is per window — its own Sound
(H4's on/off) and "Silence here" (a window-local silence by the skin's rule, `audioSilence: 'window'`): the
instructor's Silence does not quiet the learner window and the learner's Silence sends nothing to the session; the
alarm CONDITIONS and the visual state are the shared patient's. The status and the two buttons sit under the monitor
(the monitor route hides the top bar). The wire contract is written at the top of `follower.ts` for the later mobile
plan (a network follower gets no mirror frames: that plan must mirror the cockpit's settings or mark the Ventilator
view unsupported). Measured (prototype on 48864439, ×4, Chromium and WebKit): synced < 2 s; drift 0 ms; tiles equal
within 10 s of polling (two windows refresh on their own frames); resyncs only at the restore (1) and the restart (2);
after an instructor reload: same code, synced again, tiles equal; page closed → "not answering" in ≤ 5 s; style
follows a skin change in < 1 s; with the Ventilator view driving: 0 resyncs.

**Interfaces:** Consumes E2, E3, G1, H4. Produces: `MonitorHandle.viewerClock(): Promise<ViewerClock>`, `ViewerClock`, `Host.core?`,
`MountOptions.audioSilence?: 'engine' | 'window'`, `MonitorHandle.silenceAudio(): boolean`, `AlarmAudioBridge` option
`windowSilence` + `silenceWindow(t, s)`, `followUrl(code)`, `mountFollower(shell, site, code, bar)`, `publishStyle(code,
now, onChange)`, `AppSession.linked(m)`, `AppSession.onSkin(fn)`, `Shell` option `follower`.

- [ ] **Step 1 — the failing tests.** 

Create `apps/demo/e2e/fu11-follower.e2e.ts`:

```ts
// FU-11 Task G4 (showcase kit K2): a learner monitor opened in a second window FOLLOWS the instructor's session — the
// same patient, clock and numbers, through an instructor command, a bookmark restore, a patient restart, and while the
// Ventilator view drives the patient, across an instructor reload — instead of starting a patient of its own; it opens
// with `noopener` (its own process) and says so when the instructor's window is gone.
import { expect, test, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());

type Sync = { status: string; resyncs: number; beatDriftMs: number; lagS: number };
type W = { __pmeFollower: { sync: Sync | null }; __pmeApp: { session: { code: string; simNow(): number; restart(s: unknown): void; spec: unknown }; link: { send(c: unknown): Promise<{ accepted: boolean }> } } };
const sync = (f: Page) => f.evaluate(() => { const s = (window as unknown as W).__pmeFollower.sync as Sync; return { status: s.status, resyncs: s.resyncs, drift: s.beatDriftMs, lag: s.lagS }; });
const tiles = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.pme-stile')].map((e) => `${(e as HTMLElement).dataset.param}:${e.querySelector('[data-pme="v"]')?.textContent}`).join(' '));
// two windows refresh their numerics on their own frames, so the comparison waits for one moment where every tile agrees
const same = (f: Page, p: Page) => expect.poll(async () => (await tiles(f)) === (await tiles(p)) || `${await tiles(f)} | ${await tiles(p)}`, { timeout: 10_000, intervals: [100] }).toBe(true);
const send = (p: Page, c: unknown) => p.evaluate((x) => (window as unknown as W).__pmeApp.link.send(x), c);

async function follow(page: Page, scenario: string): Promise<Page> {
  await openApp(page, base, `?scenario=${scenario}`, { warmMs: 1500 });
  await page.locator('.sessionbar').getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
  await page.evaluate(() => (location.hash = '#/monitor'));
  const [f] = await Promise.all([page.context().waitForEvent('page'), page.getByRole('button', { name: 'Open on a second screen', includeHidden: true }).dispatchEvent('click')]);
  await f!.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
  expect(await f!.evaluate(() => window.opener)).toBeNull(); // R50 F4: its own process, not the instructor's main thread
  return f!;
}

test('the second-screen learner monitor follows commands, a bookmark restore and a restart', async ({ page }) => {
  test.setTimeout(180_000);
  const f = await follow(page, 'showcase-induction');
  await page.waitForTimeout(10_000);
  expect(await sync(f)).toMatchObject({ status: 'synced', resyncs: 0, drift: 0 });
  await same(f, page);
  await send(page, { type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 10 } });
  await page.waitForTimeout(10_000);
  expect(await sync(f)).toMatchObject({ status: 'synced', resyncs: 0, drift: 0 });
  await send(page, { type: 'scenario', action: 'bookmark', target: 'fu11' });
  await page.waitForTimeout(6_000);
  await send(page, { type: 'scenario', action: 'restoreBookmark', target: 'fu11' });
  await expect.poll(async () => (await sync(f)).status, { timeout: 15_000 }).toBe('synced');
  await page.waitForTimeout(3_000);
  await same(f, page);
  await page.evaluate(() => { const a = (window as unknown as W).__pmeApp.session; a.restart({ spec: a.spec, mode: 'modeled' }); });
  await expect.poll(async () => (await sync(f)).status, { timeout: 15_000 }).toBe('synced');
  await page.waitForTimeout(4_000);
  await same(f, page);
  expect((await sync(f)).lag).toBeLessThan(0.5);
  // R50 F5: an instructor reload keeps the code; the learner monitor finds the session again
  const code = await page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
  await page.reload();
  await page.waitForFunction(() => '__pmeApp' in window);
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.session.code)).toBe(code);
  await expect(f.locator('.status-pill')).toHaveText(`Following session ${code}`, { timeout: 15_000 });
  await page.waitForTimeout(3_000);
  await same(f, page);
  // …and a closed instructor window is reported, not shown as followed
  await page.close();
  await expect(f.locator('.status-pill')).toHaveText("The instructor's monitor is not answering", { timeout: 10_000 });
});

test('it follows while the Ventilator view drives the patient (the link\'s commands are mirrored)', async ({ page }) => {
  test.setTimeout(180_000);
  const f = await follow(page, 'showcase-bronchospasm');
  await page.evaluate(() => (location.hash = '#/vent'));
  await page.waitForTimeout(30_000);
  expect(await sync(f)).toMatchObject({ status: 'synced', resyncs: 0, drift: 0 });
  await same(f, page);
});

test("it wears the instructor's monitor style and follows a change; its alarm sound is its own (owner ruling Q3)", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await follow(page, 'showcase-induction');
  type S = { __pmeFollower: { style: { skin: string }; monitor: { skin: { id: string } | null } } };
  type I = { __pmeApp: { session: { skin: string; setSkin(s: string, t: string): Promise<void> }; link: { alarms: { silencedUntil: number | null } | null } } };
  const skinOf = () => f.evaluate(() => { const x = (window as unknown as S).__pmeFollower; return `${x.style.skin}|${x.monitor.skin?.id}`; });
  const own = await page.evaluate(() => (window as unknown as I).__pmeApp.session.skin);
  await expect.poll(skinOf).toBe(`${own}|${own}`);
  const other = own === 'philips-like' ? 'saadat-like' : 'philips-like';
  await page.evaluate((s) => (window as unknown as I).__pmeApp.session.setSkin(s, ''), other);
  await expect.poll(skinOf, { timeout: 10_000 }).toBe(`${other}|${other}`);
  // its own Silence: pressed on the learner window, nothing reaches the instructor's session
  const hush = f.getByRole('button', { name: 'Silence here' });
  await expect(hush).toBeDisabled(); // nothing to silence before this window's sound is on
  await f.getByRole('button', { name: 'Sound off' }).click();
  await expect(hush).toBeEnabled();
  await hush.click();
  await expect(hush).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(1_500);
  expect(await page.evaluate(() => (window as unknown as I).__pmeApp.link.alarms?.silencedUntil ?? null)).toBeNull();
  await expect(f.locator('.status-pill')).toHaveText(/^Following session /);
  // H4: its Sound turns this window's sound off again (and Silence here has nothing left to silence)
  await f.getByRole('button', { name: 'Sound on' }).click();
  await expect(f.getByRole('button', { name: 'Sound off' })).toHaveAttribute('aria-pressed', 'false');
  await expect(hush).toBeDisabled();
});
```

- [ ] **Step 2 — run them red.**

Run: `npx playwright test --retries=0 fu11-follower`  
Expected: 6 failed: no "Open on a second screen" button (timeout)

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/alarm-audio.test.ts`  
Expected: 2 failed: silenceWindow is not a function

- [ ] **Step 3 — implement.**

Create `apps/demo/src/app/views/follower.ts`:

```ts
// FU-11 (showcase kit K2): the learner monitor on a SECOND screen. A window opened at `?follow=<code>#/monitor` runs no
// session of its own: it mounts a 'viewer' monitor (main thread, the site's skin) and a Stage 6a ViewerSync over the
// session's BroadcastChannel — the instructor's snapshot, then every command the instructor's session applies, at the
// host's tick, on the same build (sample-identical; samples never cross the channel). A patient restart, a scenario load
// or a bookmark restore on the instructor's screen is a new timeline: the viewer takes a fresh snapshot.
// Same browser only (BroadcastChannel), as the Remote in version 1.0.
//
// THE FOLLOWER'S WIRE CONTRACT (FU-11 G2; a later plan builds a QR-paired MOBILE learner monitor on it — read this,
// do not re-open the code):
//  - Address: `followUrl(code)` = `<origin><path>?follow=<CODE>#/monitor`; CODE is the session code
//    (`normalizeSessionCode`), kept across an instructor reload (`?session=` in the instructor's URL, R50 F5).
//  - Session channel: the Stage 6a protocol (`@pme/controller` protocol.ts, `v:1`) on the session's transport. The
//    follower says `hello {role:'viewer'}`; the host answers with the sticky replays (`commandApplied` with
//    `resolved.replay`, incl. `time` scale/pause) and a `snapshot` (same engine build); then `event` batches: `state`
//    (1 Hz, the anchor), `beat` (drift check), `commandApplied` (mirrored at `atTick`), `timeline {cause}` (restart or
//    restore → re-hello and a fresh snapshot). A new host hello (a reload) resets the speed and pause (R50 F5).
//  - A viewer may not command: the host refuses it (`ack accepted:false 'a viewer cannot command'`, R50 M13).
//  - `resolved.mirror` events (the Ventilator view's frames: samples) go ONLY to same-browser BroadcastChannel peers
//    and the relay drops them (R50 F3, a declared deviation from brief §3.7). A network follower gets none: a mobile
//    monitor over the relay must mirror the cockpit's SETTINGS instead, or show the Ventilator view's patient as
//    unsupported — the later plan decides.
//  - Liveness: any host message within HOST_SILENT_MS (5 s) while running, else "not answering" (R50 F5).
//  - Style: a separate channel `pme-style:<CODE>` — `{kind:'ask'}` → `{kind:'style', skin, theme}`, and every change
//    (owner ruling Q3; `publishStyle` on the instructor's page). Presentation only, not the session wire.
//  - Sound: per window (owner ruling Q3; mount option `audioSilence: 'window'`): the follower's own Sound and
//    "Silence here"; nothing about sound crosses either channel.
import { createBroadcastChannelTransport, ViewerSync, type ManagedTransport } from '@pme/controller';
import { version as engineVersion } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { applySkinAlarmColours, type Shell } from '../shell.ts';
import type { SiteProfile } from '../site.ts';
import { button, h, setText } from '../ui.ts';

/** R50 F5: no message from a RUNNING host for this long → "not answering" (it sends its state every second) [ENG]. */
const HOST_SILENT_MS = 5000;

/**
 * FU-11 (owner ruling Q3): the learner monitor wears the instructor's monitor style and follows its changes. A small
 * same-browser channel beside the session's: the instructor's page answers `ask` and announces every change. Style is
 * presentation, not the patient, so it stays off the session wire (no protocol change).
 */
type StyleMsg = { kind: 'ask' } | { kind: 'style'; skin: string; theme: string };
const styleChannel = (code: string) => new BroadcastChannel(`pme-style:${code}`);

/** The instructor's side: answer the learner monitor's `ask`, and announce every change. Returns a closer. */
export function publishStyle(code: string, now: () => { skin: string; theme: string }, onChange: (f: (skin: string, theme: string) => void) => () => void): () => void {
  const ch = styleChannel(code);
  const send = (skin: string, theme: string) => ch.postMessage({ kind: 'style', skin, theme } satisfies StyleMsg);
  ch.onmessage = (ev: MessageEvent<StyleMsg>) => {
    if (ev.data?.kind === 'ask') send(now().skin, now().theme);
  };
  const off = onChange(send);
  return () => (off(), ch.close());
}

/** The address of the learner monitor that follows session `code` (this page, same browser). */
export function followUrl(code: string, loc: { origin: string; pathname: string } = location): string {
  return `${loc.origin}${loc.pathname}?follow=${code}#/monitor`;
}

export interface Follower {
  readonly monitor: MonitorHandle;
  readonly transport: ManagedTransport;
  /** FU-11 (Q3): the style this window shows (the instructor's). */
  style: { skin: string; theme: string };
  sync: ViewerSync | null;
  destroy(): void;
}

export function mountFollower(shell: Shell, site: SiteProfile, code: string, bar: HTMLElement): Follower {
  applySkinAlarmColours(site.skin, site.theme);
  // owner ruling Q3: this window's alarm SOUND is its own (its Sound and Silence buttons); the alarms are the patient's
  const monitor = mountMonitor(shell.monitorHost, { skin: site.skin, ...(site.theme ? { theme: site.theme } : {}), role: 'viewer', worker: 'off', audioSilence: 'window' });
  const transport = createBroadcastChannelTransport(code);
  const status = h('span', { class: 'status-pill', role: 'status' }, `Waiting for the instructor's monitor ${code}…`);
  // FU-11 (H4): on and off again, this window only
  const drawSound = () => ((sound.textContent = monitor.soundOn ? 'Sound on' : 'Sound off'), sound.setAttribute('aria-pressed', String(monitor.soundOn)), (hush.disabled = !monitor.soundOn));
  const sound = button('Sound off', () => (monitor.soundOn ? (monitor.disableSound(), drawSound()) : void monitor.enableSound().then(drawSound)), 'small sound');
  sound.setAttribute('aria-pressed', 'false');
  // owner ruling Q3: Silence here quiets THIS window's alarm sound only (by the skin's rule); the instructor's Silence
  // does not quiet it, and this one sends nothing to the session
  const hush = button('Silence here', () => {
    const on = monitor.silenceAudio();
    hush.setAttribute('aria-pressed', String(on));
  }, 'small');
  hush.setAttribute('aria-pressed', 'false');
  hush.title = "Silence this window's alarm sound";
  hush.disabled = true;
  bar.append(status, sound, hush);
  let raf = 0;
  const f: Follower = { monitor, transport, sync: null, destroy, style: { skin: site.skin, theme: site.theme } };
  const style = styleChannel(code);
  style.onmessage = (ev: MessageEvent<StyleMsg>) => {
    const m = ev.data;
    if (m?.kind !== 'style' || (m.skin === f.style.skin && m.theme === f.style.theme)) return;
    f.style = { skin: m.skin, theme: m.theme };
    applySkinAlarmColours(m.skin, m.theme);
    void monitor.setSkin(m.skin, m.theme ? { theme: m.theme } : {});
  };
  style.postMessage({ kind: 'ask' } satisfies StyleMsg);
  void monitor.viewerClock().then((clock) => {
    const sync = new ViewerSync({ session: code, transport, target: clock, engineVersion });
    f.sync = sync;
    const loop = () => {
      sync.follow(); // once per frame: steers this monitor's clock onto the instructor's (a frame behind is fine)
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  });
  // R50 F5: host liveness — a running host sends at least its 1 Hz state; a paused one may be silent. Silence of more than
  // 5 s while running means the instructor's window is gone or reloading (it comes back under the same code).
  let heard = performance.now();
  let paused = false;
  const offHost = transport.onMessage((m) => {
    if (m.kind === 'hello' && m.role !== 'host') return;
    if (m.kind === 'command') return;
    heard = performance.now();
    if (m.kind !== 'event') return;
    for (const e of m.body) {
      const c = e.type === 'commandApplied' ? (e.resolved as { command?: { type?: string; action?: string } } | undefined)?.command : undefined;
      if (c?.type === 'time' && (c.action === 'pause' || c.action === 'resume')) paused = c.action === 'pause';
    }
  });
  const draw = setInterval(() => {
    const s = f.sync?.status ?? 'waiting';
    const alive = paused || performance.now() - heard < HOST_SILENT_MS;
    setText(status, s === 'incompatible' ? 'This window runs another version: reload both windows' : s !== 'synced' ? `Waiting for the instructor's monitor ${code}…` : !alive ? "The instructor's monitor is not answering" : `Following session ${code}${paused ? ' (paused)' : ''}`);
    status.dataset.ok = String(s === 'synced' && alive);
  }, 500);
  function destroy(): void {
    offHost();
    style.close();
    cancelAnimationFrame(raf);
    clearInterval(draw);
    f.sync?.close();
    transport.close();
    monitor.destroy();
  }
  return f;
}
```

In `packages/renderer/src/mount.ts`, find:

```ts
}

/** A monitor either owns the simulation ('host') or mirrors one from its snapshot and commands ('viewer'). */
export type MonitorRole = 'host' | 'viewer';
```

Replace with:

```ts
  /**
   * FU-11 (owner ruling Q3): who manages this window's alarm SOUND. 'engine' (default): the device's Silence. 'window':
   * this window alone (`silenceAudio()`); the instructor's Silence does not quiet it — the learner monitor on a second
   * screen. The alarm conditions and the visual alarm state are the engine's either way.
   */
  audioSilence?: 'engine' | 'window';
}

/** A monitor either owns the simulation ('host') or mirrors one from its snapshot and commands ('viewer'). */
export type MonitorRole = 'host' | 'viewer';

/**
 * FU-11 (K2, the second-screen learner monitor): the synchronous clock a ViewerSync steers every frame (structurally the
 * controller's ViewerTarget). Only a 'viewer' monitor mounted with worker 'off' has one (its calls must be immediate).
 */
export interface ViewerClock {
  restore(s: PatientSnapshot): void;
  dispatch(cmd: Command): DispatchResult;
  on(fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]): () => void;
  renderT(): number;
  tick(): number;
  setRate(k: number): void;
  setPaused(p: boolean): void;
  jumpTo(simT: number): void;
}
```

In `packages/renderer/src/mount.ts`, find:

```ts
  readonly eventLog: EventLog;
}
```

Replace with:

```ts
  readonly eventLog: EventLog;
  /** FU-11 (K2): the clock ViewerSync steers; needs role 'viewer' and worker 'off' (its calls are synchronous). */
  viewerClock(): Promise<ViewerClock>;
  /** FU-11 (Q3): with `audioSilence: 'window'`, this window's own alarm-sound Silence (pressed again: ends it). Returns
   *  whether this window is now silenced; false before sound is enabled. */
  silenceAudio(): boolean;
}
```

In `packages/renderer/src/mount.ts`, find:

```ts
    bridge = new AlarmAudioBridge(sounder, () => s.clock.timeScale);
```

Replace with:

```ts
    bridge = new AlarmAudioBridge(sounder, () => s.clock.timeScale, { windowSilence: opts.audioSilence === 'window' });
```

In `packages/renderer/src/mount.ts`, find:

```ts
  const dispatch = (cmd: Command) =>
    hostP.then(async (h) => {
      const res = await h.command(cmd);
      if (res.accepted) {
        eventLog.command(cmd, anchor.simT); // Stage 4b
        const c = cmd as { type: string; sensor?: string; state?: string; action?: { device?: string; action?: string; lane?: number; value?: unknown } };
        if (c.type === 'attachSensor' && c.sensor === 'co2') setCo2(c.state !== 'off', h);
        if (c.type === 'device' && c.action?.device === 'ecg' && c.action.action === 'lead' && typeof c.action.lane === 'number') leads.set(c.action.lane, c.action.value as LeadId);
      }
```

Replace with:

```ts
  /** An accepted command's effects on this page (the log, the CO2 lane swap, the kept ECG leads) — FU-11: shared by a viewer's mirrored commands. */
  const accepted = (cmd: Command, h: Host) => {
    eventLog.command(cmd, anchor.simT); // Stage 4b
    const c = cmd as { type: string; sensor?: string; state?: string; action?: { device?: string; action?: string; lane?: number; value?: unknown } };
    if (c.type === 'attachSensor' && c.sensor === 'co2') setCo2(c.state !== 'off', h);
    if (c.type === 'device' && c.action?.device === 'ecg' && c.action.action === 'lead' && typeof c.action.lane === 'number') leads.set(c.action.lane, c.action.value as LeadId);
  };
  const dispatch = (cmd: Command) =>
    hostP.then(async (h) => {
      const res = await h.command(cmd);
      if (res.accepted) accepted(cmd, h);
```

In `packages/renderer/src/mount.ts`, find:

```ts
    role: opts.role ?? 'host',
    snapshot: () => hostP.then((h) => h.snapshot()),
```

Replace with:

```ts
    role: opts.role ?? 'host',
    silenceAudio: () => (opts.audioSilence === 'window' && bridge && r ? bridge.silenceWindow(simNow(), r.skin.alarms.silence) : false),
    snapshot: () => hostP.then((h) => h.snapshot()),
```

In `packages/renderer/src/mount.ts`, find:

```ts
    eventLog,
  };
```

Replace with:

```ts
    eventLog,
    viewerClock: () =>
      hostP.then((h) => {
        const core = h.core;
        if (opts.role !== 'viewer' || !core) throw new Error("viewerClock needs a monitor mounted with role 'viewer' and worker 'off'");
        const clock: ViewerClock = {
          restore: (s) => {
            core.restore(s);
            afterRestore(s, h);
          },
          dispatch: (cmd) => {
            const r = core.command(cmd);
            if (r.accepted) accepted(cmd, h);
            return r;
          },
          on: (fn, types) => core.engine.on(fn, types),
          renderT: () => core.clock.renderT,
          tick: () => core.engine.now().tick,
          setRate: (k) => void (core.clock.timeScale = Math.min(4, Math.max(0.25, k))),
          setPaused: (p) => (p ? core.clock.pause() : core.clock.resume()),
          jumpTo: (simT) => {
            core.clock.setTick(Math.floor(simT * 50 + 1e-6));
            core.engine.advanceTo(core.clock.simT);
          },
        };
        return clock;
      }),
  };
```

In `packages/renderer/src/alarm-audio.ts`, find:

```ts

  constructor(sounder: SounderLike, timeScale: () => number = () => 1) {
    this.sounder = sounder;
    this.timeScale = timeScale;
  }

  /** Apply one alarmStatus event at its sim time. */
  onStatus(st: AlarmStatus): void {
    const t = st.t;
    const want = new Map<string, AlarmLevel>();
    for (const a of st.active) if (a.sounding ?? !a.acked) want.set(a.id, a.level);
    for (const id of this.audible.keys()) if (!want.has(id)) this.sounder.clear(id, t);
    for (const [id, level] of want) if (this.audible.get(id) !== level) this.sounder.raise(id, level, t);
    this.audible = want;
    const until = st.pausedUntil ?? st.silencedUntil;
    if (until !== null && until !== this.quietUntil) this.sounder.silenceAll(t, (until - t) / this.timeScale());
    if (until === null && this.quietUntil !== null && this.sounder.silencedUntil !== null) this.sounder.endSilence(t);
    this.quietUntil = until;
    this.sounder.setVolume(st.volume);
```

Replace with:

```ts
  /** FU-11 (owner ruling Q3): this window's own Silence, when it manages its sound itself; ack = until a new alarm. */
  private own: { ack: boolean } | null = null;
  private readonly windowSilence: boolean;

  /**
   * `windowSilence` (FU-11, owner ruling Q3; the second-screen learner monitor): this window's alarm SOUND is managed
   * here — the instructor's Silence (a mute timer or an acknowledge) does not quiet it, and its own Silence
   * (`silenceWindow`) reaches no engine. The alarm conditions and what the monitor shows stay the shared patient's.
   */
  constructor(sounder: SounderLike, timeScale: () => number = () => 1, o: { windowSilence?: boolean } = {}) {
    this.sounder = sounder;
    this.timeScale = timeScale;
    this.windowSilence = o.windowSilence === true;
  }

  /** FU-11 (Q3): this window's own Silence, by the skin's rule (a mute timer, or until a new alarm); pressed again, it
   *  ends. Returns whether this window is now silenced. Only for a bridge made with `windowSilence`. */
  silenceWindow(t: number, s: { durationS: number | null; mode: 'mute' | 'acknowledge' }): boolean {
    if (this.sounder.silencedUntil !== null) {
      this.sounder.endSilence(t);
      this.own = null;
      return false;
    }
    const ack = s.mode === 'acknowledge' || s.durationS === null;
    this.sounder.silenceAll(t, ack ? 1e9 : (s.durationS as number));
    this.own = { ack };
    return true;
  }

  /** Apply one alarmStatus event at its sim time. */
  onStatus(st: AlarmStatus): void {
    const t = st.t;
    const want = new Map<string, AlarmLevel>();
    // in a window that manages its own sound an alarm the instructor acknowledged still sounds here; a latched alarm
    // under visual-only latching (not sounding, not acknowledged) stays silent everywhere
    for (const a of st.active) if (this.windowSilence ? a.acked || a.sounding !== false : (a.sounding ?? !a.acked)) want.set(a.id, a.level);
    for (const id of this.audible.keys()) if (!want.has(id)) this.sounder.clear(id, t);
    const fresh = [...want.keys()].some((id) => !this.audible.has(id));
    for (const [id, level] of want) if (this.audible.get(id) !== level) this.sounder.raise(id, level, t);
    this.audible = want;
    this.sounder.setVolume(st.volume);
    if (this.windowSilence) {
      if (this.own?.ack && fresh && this.sounder.silencedUntil !== null) this.sounder.endSilence(t); // a new alarm sounds
      if (this.sounder.silencedUntil === null) this.own = null;
      return;
    }
    const until = st.pausedUntil ?? st.silencedUntil;
    if (until !== null && until !== this.quietUntil) this.sounder.silenceAll(t, (until - t) / this.timeScale());
    if (until === null && this.quietUntil !== null && this.sounder.silencedUntil !== null) this.sounder.endSilence(t);
    this.quietUntil = until;
```

In `packages/renderer/test/alarm-audio.test.ts`, find:

```ts
function rig(profile: AlarmSoundProfile) {
```

Replace with:

```ts
function rig(profile: AlarmSoundProfile, o: { windowSilence?: boolean } = {}) {
```

In `packages/renderer/test/alarm-audio.test.ts`, find:

```ts
  const bridge = new AlarmAudioBridge(sounder);
```

Replace with:

```ts
  const bridge = new AlarmAudioBridge(sounder, () => 1, o);
```

In `packages/renderer/test/alarm-audio.test.ts`, find:

```ts
    expect(r.played.length).toBe(10);
  });
});
```

Replace with:

```ts
    expect(r.played.length).toBe(10);
  });
});

describe('FU-11 (owner ruling Q3): a learner window manages its own alarm sound', () => {
  it("ignores the instructor's silence (timer or acknowledge) and keeps its own; its own silence never reaches the engine", () => {
    const r = rig(IEC_STYLE, { windowSilence: true });
    r.bridge.onStatus(st(0, [entry('HR_HIGH', 2)]));
    r.run(2);
    const n = r.played.length;
    expect(n).toBeGreaterThan(0);
    r.bridge.onStatus(st(2, [entry('HR_HIGH', 2)], 92)); // the instructor pressed Silence (mute timer)
    r.bridge.onStatus(st(2.5, [entry('HR_HIGH', 2, true)], 92)); // …or an acknowledge-style Silence
    r.run(40);
    expect(r.played.length).toBeGreaterThan(n); // this window still sounds
    expect(r.bridge.silenceWindow(40, { durationS: 90, mode: 'mute' })).toBe(true); // its own Silence
    const m = r.played.length;
    r.run(80);
    expect(r.played.length).toBe(m);
    r.bridge.onStatus(st(80, [entry('HR_HIGH', 2, true), entry('ASYSTOLE', 1)], 92)); // a higher alarm breaks through (Q1)
    r.run(82);
    expect(r.played.slice(m).some((p) => p.id.startsWith('alarm:ASYSTOLE:'))).toBe(true);
  });
  it('an acknowledge-style skin\'s own-window Silence lasts until a new alarm', () => {
    const r = rig(IEC_STYLE, { windowSilence: true });
    r.bridge.onStatus(st(0, [entry('HR_HIGH', 2)]));
    r.run(1);
    r.bridge.silenceWindow(1, { durationS: null, mode: 'acknowledge' });
    const m = r.played.length;
    r.run(200);
    expect(r.played.length).toBe(m);
    r.bridge.onStatus(st(200, [entry('HR_HIGH', 2), entry('SPO2_LOW', 2)]));
    r.run(202);
    expect(r.played.length).toBeGreaterThan(m);
  });
});
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
  readonly path: Promise<RenderPath>;
  command(cmd: Command): Promise<DispatchResult>;
```

Replace with:

```ts
  readonly path: Promise<RenderPath>;
  /** FU-11 (K2): the main-thread core, for a viewer monitor's synchronous clock (absent on the worker path). */
  readonly core?: MonitorCore;
  command(cmd: Command): Promise<DispatchResult>;
```

In `packages/renderer/src/worker-host.ts`, find:

```ts
    canvas,
    path: Promise.resolve('main'),
```

Replace with:

```ts
    canvas,
    core,
    path: Promise.resolve('main'),
```

In `packages/renderer/src/index.ts`, find:

```ts
export { mountMonitor, type MonitorHandle, type MonitorRole, type MountOptions } from './mount.ts';
```

Replace with:

```ts
export { mountMonitor, type MonitorHandle, type MonitorRole, type MountOptions, type ViewerClock } from './mount.ts';
```

In `apps/demo/src/app/main.ts`, find:

```ts
import { attachReveal, RevealGesture } from '@pme/controller';
```

Replace with:

```ts
import { attachReveal, normalizeSessionCode, RevealGesture } from '@pme/controller';
```

In `apps/demo/src/app/main.ts`, find:

```ts
import { monitorView } from './views/monitor.ts';
import { remoteView } from './views/remote.ts';
import { settingsView } from './views/settings.ts';
import { startView } from './views/start.ts';
import { teachView } from './views/teach.ts';
import { validateView } from './views/validate.ts';
import { ventView } from './views/vent.ts';

const site = loadSite();
setDrugNames(site.drugNames); // one set of drug names on every screen (orchestrator ruling 5)
const q = new URLSearchParams(location.search);
const hostless = parseRoute(location.hash).id === 'remote';
const shell = new Shell(document.getElementById('app') as HTMLElement, { hostless });
```

Replace with:

```ts
import { followUrl, mountFollower, publishStyle } from './views/follower.ts';
import { monitorView } from './views/monitor.ts';
import { remoteView } from './views/remote.ts';
import { settingsView } from './views/settings.ts';
import { startView } from './views/start.ts';
import { teachView } from './views/teach.ts';
import { validateView } from './views/validate.ts';
import { ventView } from './views/vent.ts';

const site = loadSite();
setDrugNames(site.drugNames); // one set of drug names on every screen (orchestrator ruling 5)
const q = new URLSearchParams(location.search);
// FU-11 (K2): `?follow=<code>` = the learner monitor on a second screen: it follows that session and runs none of its own
const follow = normalizeSessionCode(q.get('follow') ?? '');
const hostless = !follow && parseRoute(location.hash).id === 'remote';
const shell = new Shell(document.getElementById('app') as HTMLElement, { hostless, follower: !!follow });
```

In `apps/demo/src/app/main.ts`, find:

```ts
if (hostless) {
  shell.add(remoteView({ site, hostless: true, bar: shell.bar }));
  shell.add(settingsView(site, null));
  shell.start();
  Object.assign(window, { __pmeApp: { shell, frames, site } });
} else {
  const base = PATIENT_PRESETS[0]?.spec;
  if (!base) throw new Error('no patient presets');
  const session = new AppSession(shell.monitorHost, { spec: { ...base, attached: !site.sensorsOff }, mode: 'modeled' }, { skin: site.skin, theme: site.theme, code: q.get('session'), load: q.get('load') === 'perf8' ? 'perf8' : null });
```

Replace with:

```ts
if (follow) {
  if (parseRoute(location.hash).id !== 'monitor') history.replaceState(null, '', `${location.pathname}${location.search}${hrefOf('monitor')}`);
  // its status and its own Sound / Silence sit under the monitor: the monitor route hides the top bar (R50 Q3)
  const bar = h('div', { class: 'follower-bar', role: 'toolbar', 'aria-label': 'Learner monitor' });
  shell.add({ id: 'monitor', el: h('section', { 'aria-labelledby': 'fol-h' }, h('h1', { id: 'fol-h', class: 'sr-only' }, 'Learner monitor'), bar) });
  const follower = mountFollower(shell, site, follow, bar);
  shell.start();
  Object.assign(window, { __pmeFollower: follower, __pmeApp: { shell, frames, site } });
} else if (hostless) {
  shell.add(remoteView({ site, hostless: true, bar: shell.bar }));
  shell.add(settingsView(site, null));
  shell.start();
  Object.assign(window, { __pmeApp: { shell, frames, site } });
} else {
  const base = PATIENT_PRESETS[0]?.spec;
  if (!base) throw new Error('no patient presets');
  const session = new AppSession(shell.monitorHost, { spec: { ...base, attached: !site.sensorsOff }, mode: 'modeled' }, { skin: site.skin, theme: site.theme, code: q.get('session'), load: q.get('load') === 'perf8' ? 'perf8' : null });
  // FU-11 (R50 F5): the session code survives a reload of this window, so a learner monitor and a Remote that follow it
  // find it again (a reload made a new code and left them on a frozen screen)
  publishStyle(session.code, () => ({ skin: session.skin, theme: session.theme }), (f) => session.onSkin(f)); // owner ruling Q3
  if (q.get('session') !== session.code) {
    const u = new URL(location.href);
    u.searchParams.set('session', session.code);
    history.replaceState(null, '', u);
  }
```

In `apps/demo/src/app/main.ts`, find:

```ts
  shell.add(startView({ session, site, loadScenario }));
  shell.add(monitorView(shell.stage, { session, link }));
```

Replace with:

```ts
  shell.add(startView({ session, site, loadScenario, learnerUrl: followUrl(session.code) }));
  shell.add(monitorView(shell.stage, { session, link, learnerUrl: followUrl(session.code) }));
```

In `apps/demo/src/app/shell.ts`, find:

```ts
  constructor(parent: HTMLElement, o: { hostless: boolean }) {
    this.nav = h('nav', { class: 'nav', 'aria-label': 'Views' }, ...NAV.filter(([id]) => !o.hostless || id === 'settings').map(([id, label]) => h('a', { href: hrefOf(id), 'data-route': id }, label)));
    this.right = h('div', { class: 'topright' });
    // narrow screens (iPad portrait, phones): the view list moves into a menu dialog so no label is clipped
    const menuDlg = h('dialog', { class: 'menu-sheet', 'aria-label': 'Views' },
      h('nav', { class: 'menu-list', 'aria-label': 'Views' }, ...NAV.filter(([id]) => !o.hostless || id === 'settings').map(([id, label]) => h('a', { href: hrefOf(id), onclick: () => menuDlg.close() }, label))),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => menuDlg.close() }, 'Close'));
    const menuBtn = h('button', { type: 'button', class: 'btn small menu-btn', 'aria-haspopup': 'dialog', onclick: () => menuDlg.showModal() }, 'Menu');
    const top = h('header', { class: 'topbar' }, h('a', { class: 'brand', href: hrefOf(o.hostless ? 'remote' : 'start') }, 'Patient monitor simulator'), menuBtn, this.nav, h('div', { class: 'spacer' }), this.right, menuDlg);
    this.monitorHost = h('div', { class: 'monitor-host', role: 'img', 'aria-label': 'Patient monitor' });
    this.stage = h('div', { class: 'stage', id: 'monitor' }, this.monitorHost);
    this.bar = h('div', { class: 'sessionbar', role: 'region', 'aria-label': 'Session' });
    this.main = h('main', { class: 'main', id: 'main', tabindex: -1 }, this.bar, this.stage);
    this.root = h('div', { class: 'app' }, h('a', { class: 'skip', href: '#main', onclick: (e: Event) => (e.preventDefault(), this.main.focus()) }, 'Skip to the main content'), top, this.main);
    parent.append(this.root);
```

Replace with:

```ts
  constructor(parent: HTMLElement, o: { hostless: boolean; follower?: boolean }) {
    // FU-11 (K2): a second-screen learner monitor shows the monitor alone — no views to switch to
    const navIds = (id: RouteId) => (o.follower ? false : !o.hostless || id === 'settings');
    this.nav = h('nav', { class: 'nav', 'aria-label': 'Views' }, ...NAV.filter(([id]) => navIds(id)).map(([id, label]) => h('a', { href: hrefOf(id), 'data-route': id }, label)));
    this.right = h('div', { class: 'topright' });
    // narrow screens (iPad portrait, phones): the view list moves into a menu dialog so no label is clipped
    const menuDlg = h('dialog', { class: 'menu-sheet', 'aria-label': 'Views' },
      h('nav', { class: 'menu-list', 'aria-label': 'Views' }, ...NAV.filter(([id]) => navIds(id)).map(([id, label]) => h('a', { href: hrefOf(id), onclick: () => menuDlg.close() }, label))),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => menuDlg.close() }, 'Close'));
    const menuBtn = h('button', { type: 'button', class: 'btn small menu-btn', 'aria-haspopup': 'dialog', onclick: () => menuDlg.showModal() }, 'Menu');
    const top = h('header', { class: 'topbar' }, h('a', { class: 'brand', href: hrefOf(o.hostless ? 'remote' : 'start') }, 'Patient monitor simulator'), menuBtn, this.nav, h('div', { class: 'spacer' }), this.right, menuDlg);
    this.monitorHost = h('div', { class: 'monitor-host', role: 'img', 'aria-label': 'Patient monitor' });
    this.stage = h('div', { class: 'stage', id: 'monitor' }, this.monitorHost);
    this.bar = h('div', { class: 'sessionbar', role: 'region', 'aria-label': 'Session' });
    this.main = h('main', { class: 'main', id: 'main', tabindex: -1 }, this.bar, this.stage);
    this.root = h('div', { class: 'app' }, h('a', { class: 'skip', href: '#main', onclick: (e: Event) => (e.preventDefault(), this.main.focus()) }, 'Skip to the main content'), top, this.main);
    parent.append(this.root);
    if (o.follower) this.bar.hidden = true;
```

In `apps/demo/src/app/views/monitor.ts`, find:

```ts
export function monitorView(stage: HTMLElement, o: { session: AppSession; link: Link }): View {
  const full = button('Full screen', () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()), 'small');
  const strip = h('div', { class: 'reveal', role: 'toolbar', 'aria-label': 'Monitor view' },
    h('a', { class: 'btn small', href: hrefOf('teach') }, 'Instructor view'), full, h('a', { class: 'btn small ghost', href: hrefOf('start') }, 'Start'));
```

Replace with:

```ts
export function monitorView(stage: HTMLElement, o: { session: AppSession; link: Link; learnerUrl: string }): View {
  const full = button('Full screen', () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()), 'small');
  // FU-11 (K2): a second window that FOLLOWS this session (drag it to the projector), not a second patient
  // R50 F4: `noopener` puts the window in its own process (an opener would share this page's main thread with its engine)
  const second = button('Open on a second screen', () => void window.open(o.learnerUrl, '_blank', 'noopener,width=1280,height=800'), 'small');
  const strip = h('div', { class: 'reveal', role: 'toolbar', 'aria-label': 'Monitor view' },
    h('a', { class: 'btn small', href: hrefOf('teach') }, 'Instructor view'), full, second, h('a', { class: 'btn small ghost', href: hrefOf('start') }, 'Start'));
```

In `apps/demo/src/app/views/start.ts`, find:

```ts
  loadScenario(card: ScenarioCard): boolean;
}
```

Replace with:

```ts
  loadScenario(card: ScenarioCard): boolean;
  /** FU-11 (K2): the address of a second-screen learner monitor that follows this session. */
  learnerUrl: string;
}
```

In `apps/demo/src/app/views/start.ts`, find:

```ts
      button('Open the learner monitor', () => void go('monitor')),
```

Replace with:

```ts
      button('Show the learner monitor here', () => void go('monitor')),
      // FU-11 (K2): the old "Open the learner monitor" changed THIS window's view; a second window used to start its own
      // patient. This one follows the session (same browser; drag it to the projector).
      button('Open the learner monitor in a new window', () => void window.open(d.learnerUrl, '_blank', 'noopener,width=1280,height=800')), // R50 F4: its own process
```

In `apps/demo/src/app/session.ts`, find:

```ts

  /** Called after every (re)mount with the new monitor (the ventilator link re-attaches to it). */
```

Replace with:

```ts

  /**
   * FU-11 (K2): the monitor as the Ventilator view's link sees it — every command the link applies is also sent to a
   * second-screen learner monitor (HostSession.mirror), which otherwise ran an unventilated copy and resynced once a second.
   */
  linked(m: MonitorHandle): Pick<MonitorHandle, 'dispatch' | 'on' | 'pause' | 'resume' | 'setTimeScale'> {
    return {
      dispatch: (c) => m.dispatch(c).then((r) => (this.host.mirror(c, r), r)),
      on: (fn) => m.on(fn),
      // the cockpit's own time controls are SESSION commands (they acted on the monitor alone: the session bar, a Remote
      // and the next speed change disagreed with them)
      pause: () => void this.panel.send({ type: 'time', action: 'pause' }),
      resume: () => void this.panel.send({ type: 'time', action: 'resume' }),
      setTimeScale: (k) => void this.panel.send({ type: 'time', action: 'scale', value: k }),
    };
  }

  /** Called after every (re)mount with the new monitor (the ventilator link re-attaches to it). */
```

In `apps/demo/src/app/session.ts`, find:

```ts
  /** Change the monitor's skin or theme. The shell's alarm mirror follows at once, wherever the change came from
   *  (Start, Settings, an imported site profile): the mirror always shows the monitor's colours (review F5, D5). */
  async setSkin(skin: string, theme: string): Promise<void> {
    this.skin = skin;
    this.theme = theme;
```

Replace with:

```ts
  private readonly skinFns = new Set<(skin: string, theme: string) => void>();
  /** FU-11 (Q3): every skin or theme change, wherever it came from. */
  onSkin(fn: (skin: string, theme: string) => void): () => void {
    this.skinFns.add(fn);
    return () => this.skinFns.delete(fn);
  }

  /** Change the monitor's skin or theme. The shell's alarm mirror follows at once, wherever the change came from
   *  (Start, Settings, an imported site profile): the mirror always shows the monitor's colours (review F5, D5). */
  async setSkin(skin: string, theme: string): Promise<void> {
    this.skin = skin;
    this.theme = theme;
    for (const f of this.skinFns) f(skin, theme); // FU-11 (owner ruling Q3): the learner monitor follows the style
```

In `apps/demo/src/app/views/vent.ts`, find:

```ts
        detach = attachMonitorToLink(m, port, (c, r) => console.warn('vent link rejected', c.type, r));
```

Replace with:

```ts
        detach = attachMonitorToLink(session.linked(m), port, (c, r) => console.warn('vent link rejected', c.type, r)); // FU-11 (K2)
```

In `apps/demo/src/app/app.css`, find:

```css
.learner-strip[hidden] { display: none; }
```

Replace with:

```css
.learner-strip[hidden] { display: none; }

/* FU-11 (owner ruling Q3): the learner monitor's status and its own Sound / Silence, under the monitor */
.follower-bar { display: flex; align-items: center; gap: var(--s-2); padding: var(--s-2); justify-content: flex-end; }
```

- [ ] **Step 4 — run them green, and the neighbours.**

Run: `npx playwright test --retries=0 fu11-follower`  
Expected: 6 passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run`  
Expected: all passed

Run: `npx playwright test --retries=0 stage9-app stage9-tasks stage9-glossary stage9-a11y showcase-`  
Expected: all passed

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run`  
Expected: all passed

Then `npx -y pnpm@9.15.9 -r typecheck` (clean).

- [ ] **Step 5 — commit and push.**

```bash
git add apps/demo/e2e/fu11-follower.e2e.ts \
  apps/demo/src/app/app.css \
  apps/demo/src/app/main.ts \
  apps/demo/src/app/session.ts \
  apps/demo/src/app/shell.ts \
  apps/demo/src/app/views/follower.ts \
  apps/demo/src/app/views/monitor.ts \
  apps/demo/src/app/views/start.ts \
  apps/demo/src/app/views/vent.ts \
  packages/renderer/src/alarm-audio.ts \
  packages/renderer/src/index.ts \
  packages/renderer/src/mount.ts \
  packages/renderer/src/worker-host.ts \
  packages/renderer/test/alarm-audio.test.ts
git commit -m "feat(demo): a second-screen learner monitor that follows the instructor's session, style and all; sound per window (FU-11 G2, K2, R50 F4, F5, Q3)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

## Gate A — merge main, full verification, the hidden tab, gate note, pull request (branch `fu-11-a`)

**Files:** Create `docs/gates/fu-11-a.md` (with this branch's task ticks; the plan is not committed here, R50 M6).

- [ ] **Step 1 — merge.** `git fetch origin && git merge origin/main` (no stash; keep both sides). Confirm the merge
  left every FU-11 hunk: `git diff origin/main --stat` lists exactly branch a's files ("Parts, files and merge order").
- [ ] **Step 2 — full verification** (logs under `<scratchpad>/fu-11-a/`; every wait ≤ 10 min, re-checking the
  process): `npx -y pnpm@9.15.9 -r typecheck`; `CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 -r test` (compare with YOUR
  before-numbers: + this branch's new tests, nothing else changed); `npx -y pnpm@9.15.9 build`; `npx -y pnpm@9.15.9 run
  check-notices`; `npx playwright test --retries=0` (both projects). Expected: all passed except the macOS rtc skips;
  `git status --short docs` empty afterwards (if branch c has not merged, the evidence files still rewrite
  `docs/gates/**`: `git checkout -- docs/gates`).
- [ ] **Step 3 — Review Focus 1, the hidden tab, HEADED (R50 F6; a local procedure, not a CI test).** Playwright's
  Chromium is launched with background-throttling switches OFF by default, and a headless page is never hidden — so
  this run is headed and drops those switches. Create `apps/demo/e2e/zz-fu11-hidden.e2e.ts` (NEVER committed; delete
  it after the run):

```ts
import { expect, test } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { openApp, startVite } from './stage9-support.ts';

// FU-11 Gate A (R50 F6): a REAL hidden tab, ≥ 6 min (Chrome's intensive timer throttling starts after 5 min hidden)
test.use({ launchOptions: { ignoreDefaultArgs: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] } });
let vite: ViteDevServer;
let base = '';
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
type W = { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean }> } } };

for (const paused of [true, false]) {
  test(`hidden 6.5 min (${paused ? 'paused' : 'running ×4'}), then act at once`, async ({ page, context }) => {
    test.setTimeout(10 * 60_000);
    await openApp(page, base, '#/teach', { warmMs: 1500 });
    const bar = page.locator('.sessionbar');
    if (paused) await bar.getByRole('button', { name: 'Pause' }).click();
    else await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×4' }).click();
    await page.evaluate(() => { const w = window as unknown as { gap: number; last: number }; w.gap = 0; w.last = performance.now(); setInterval(() => { const n = performance.now(); w.gap = Math.max(w.gap, n - w.last); w.last = n; }, 1000); });
    const other = await context.newPage();
    await other.goto('about:blank');
    await other.bringToFront();
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('hidden');
    await other.waitForTimeout(6.5 * 60_000);
    await page.bringToFront();
    const gap = await page.evaluate(() => (window as unknown as { gap: number }).gap);
    console.log(`FU-11 Gate A hidden ${paused ? 'paused' : 'running'}: longest timer gap ${(gap / 1000).toFixed(1)} s`);
    if (paused) {
      await bar.getByRole('button', { name: 'Bookmark' }).click();
      await expect(page.locator('.toast').filter({ hasText: / saved$/ })).toBeVisible({ timeout: 10_000 });
    } else {
      expect((await page.evaluate(() => (window as unknown as W).__pmeApp.link.send({ type: 'setTarget', variable: 'hr', value: 90 }))).accepted).toBe(true);
    }
    await expect(page.locator('.toast', { hasText: 'The monitor stopped' })).toHaveCount(0);
  });
}
```

  Run: `npx playwright test zz-fu11-hidden --project=chromium --headed --retries=0 --workers=1` (≈ 14 min: two waits of
  6.5 min, each under the 10-minute rule), then `rm apps/demo/e2e/zz-fu11-hidden.e2e.ts`. Expected: 2 passed; the
  logged "longest timer gap" ≥ 50 s in at least one run (proof that intensive throttling happened — if both are < 50 s
  the run did not test what it should: record it and say so, do not claim the check). Record both gaps in the gate note.
- [ ] **Step 4 — the gate note `docs/gates/fu-11-a.md`:** base and head; per task the before → after row ("Prototype
  results" as the expected column, your measurement beside it); the audit regression table for A2, A3, B1–B3, C1, F1,
  F2 (red on main → green); B4's per-profile table (zoll-like, ge-like, lifepak-like, saadat-like, philips-like,
  mindray-like: what a new higher-priority alarm does during a silence, before → after); the side effect that a silenced
  alarm's sounding pulse now stops at once (B1) and the forward-restore limit (R50 M12); Review Focus 1 (Step 3); the
  task ticks; package and e2e counts; deviations and why.
- [ ] **Step 5 — pull request (never merged by the executor).**

```bash
git push
gh pr create --base main --head fu-11-a --title "FU-11 (a): relay and wire boundary, audio ownership, alarm silence by priority, worker lifecycle, remote presence" --body-file <scratchpad>/fu-11-a/pr-body.md
```

The body: goal, the findings closed (F01, F06, F18, F19, BA06–BA12, K5, AL01 by owner ruling Q1, R50 F2, M4, M12,
M13, M15), the audit tests now green, the shared files and the merge order (a and c, then b, then d), ending with the
line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Stop after opening the PR; report its number.

## Gate B — merge main (a and c in), full verification, the same-day rehearsal, evidence, gate note, pull request (branch `fu-11-b`)

**Files:** Create `docs/gates/fu-11-b.md`, `docs/gates/fu-11-b/**` (PNG/JPEG ≤ 60 KB); tick D/E/H in the plan copy.

- [ ] **Step 1 — merge.** `git fetch origin && git merge origin/main` (expected: a and c merged by now; if not, say
  which). Conflicts are not expected; `docs/plans/fu-11-hardening.md`: keep ours.
- [ ] **Step 2 — full verification.** `npx -y pnpm@9.15.9 -r typecheck`; `CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9
  -r test`; the engine slow groups one after the other (`CI=1 PME_TEST_SET=slow-a npx -y pnpm@9.15.9 --filter
  @pme/engine-core test`, then slow-b … slow-g), recording each wall time (D1 changes every snapshot: the
  state-reading slow suites must pass unchanged); `npx -y pnpm@9.15.9 build`; the "no physiology change" proof (R50
  review §3): `npx -y pnpm@9.15.9 --filter @pme/validation validate --suites sanity,gates --quick --out
  <scratchpad>/fu-11-b/validate-after` and the FU-7 truth-leaf / glossary counters (`CI=1 npx -y pnpm@9.15.9 --filter
  @pme/engine-core exec vitest run test/truth.test.ts` and `CI=1 npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run
  src/app/glossary.test.ts`, their logged counts) — identical to D0's before-run except the measurable-document count
  rules of J3; then `npx playwright test --retries=0` (both projects). Expected: all green; the 42 audit instances green.
- [ ] **Step 3 — the five-case showcase rehearsal, the SAME DAY on main and on this tree (R50 F7).**

```bash
git worktree add <scratchpad>/fu-11-b/main-wt origin/main && (cd <scratchpad>/fu-11-b/main-wt && npx -y pnpm@9.15.9 install --frozen-lockfile && node scripts/showcase/make-bundle.mjs <scratchpad>/fu-11-b/kit-main)
node scripts/showcase/make-bundle.mjs <scratchpad>/fu-11-b/kit
SHOWCASE_KIT=<scratchpad>/fu-11-b/kit-main SHOWCASE_WORKERS=2 npx playwright test -c scripts/showcase/playwright.showcase.config.ts rehearsal.showcase.ts
SHOWCASE_KIT=<scratchpad>/fu-11-b/kit SHOWCASE_WORKERS=2 npx playwright test -c scripts/showcase/playwright.showcase.config.ts rehearsal.showcase.ts multiwindow.showcase.ts
git worktree remove --force <scratchpad>/fu-11-b/main-wt
```

  Expected: 10 + 10 (+ the multiwindow proofs) passed; the two runs' numbers equal case by case (induction MAP and
  apnoea time; anaphylaxis time to systolic > 110; tamponade time to MAP < 40; haemorrhage pulse loss and ROSC; 0
  console errors) EXCEPT the one declared change: the bronchospasm case's Ventilator-view VTE (H5; expected ≈ 400–430
  before salbutamol and ≈ 500 after, beside main's ≈ 160–370) — the internal ventilator's numbers equal. Any other
  difference is a STOP: report it with both numbers, do not open the PR. The proofs write into `docs/showcase/**`: copy
  the JSON results into `docs/gates/fu-11-b/showcase/{main,branch}/`, then `git checkout -- docs/showcase`.
- [ ] **Step 4 — Review Focus 2 and 5.** (2) paused restore: clock stationary for 5 s after "Return here" while
  paused; two alternating restores between two bookmarks: the lanes, trends, clock AND the Ventilator view follow
  each (E3b); (5) the slow groups and `validate` above.
- [ ] **Step 5 — evidence (≤ 60 KB each, Chromium):** the restored screen 1 s after "Return here" (waveform sweeping
  from the bookmark); the Ventilator view after a restore; the top bar "Limit alarms off" with its tooltip; Explore's
  baseline line; the Sound button off and on.
- [ ] **Step 6 — the gate note `docs/gates/fu-11-b.md`:** as Gate A, for D/E/H, plus the same-day rehearsal table
  (main vs branch), H5's before/after VTE, Review Focus 2 and 5 numbers, the slow-group times, and Q7 restated.
- [ ] **Step 7 — pull request.**

```bash
git push
gh pr create --base main --head fu-11-b --title "FU-11 (b): one timeline for restore and restart, exact snapshots, showcase defects" --body-file <scratchpad>/fu-11-b/pr-body.md
```

Body as Gate A's (findings F03–F05, F09, F12, F14, F26, BA01–BA05, K3, D3, D5, the hotfix notes, R50 F1, F10, M2, M14,
M5/Q4, the showcase's Sound and Ventilator-view items), ending with
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Stop after opening the PR.

## Gate C — merge main, full verification, the slow groups on CI, gate note, pull request (branch `fu-11-c`)

**Files:** Create `docs/gates/fu-11-c.md` (with this branch's task ticks).

- [ ] **Step 1 — merge** `origin/main` (no stash).
- [ ] **Step 2 — full verification:** typecheck; `CI=1 PME_TEST_SET=fast … -r test`; the slow file
  `test/engine/resp-vcv-pmax.test.ts` alone (I2's neighbour); `validate --suites sanity,gates --quick` before (on
  `origin/main` in a throwaway worktree) and after — the measurable-document count must not change (J3);
  `npx playwright test --retries=0` on both projects; `git status --short docs` empty (K1).
- [ ] **Step 3 — the seven slow groups (K4, R50 F9).** Locally: K4's disjointness/coverage command (0 duplicates,
  `COVER-OK`). On the PR's CI run: from `gh run view <id> --log` each slow group's wall time; every group ≤ 35 min
  (CI amendment 6's target ≈ 33); ET-19's file time in slow-b. A group over 35 min is reported to the orchestrator with
  its twenty slowest files (FU-11 does not re-pack). Also record the walked-host BroadcastChannel probe's result in
  `stage9-glossary.e2e.ts` on WebKit (the declined FU-11 list item).
- [ ] **Step 4 — the gate note `docs/gates/fu-11-c.md`** (per task before → after; the CI table; K3's disclosed
  relaxation, R50 M16; J3's deferred expected-refusal declaration, R50 M9).
- [ ] **Step 5 — pull request** `gh pr create --base main --head fu-11-c --title "FU-11 (c): command boundary,
  validation honesty, test infrastructure" --body-file <scratchpad>/fu-11-c/pr-body.md` (body ending with the 🤖 line).
  Stop after opening the PR.

## Gate D — merge main (a, b, c in), the learner monitor's checks, rehearsal, gate note, pull request (branch `fu-11-d`)

**Files:** Create `docs/gates/fu-11-d.md`, `docs/gates/fu-11-d/**` (≤ 60 KB each); tick G in the plan copy (from b).

- [ ] **Step 1 — merge.** `git fetch origin && git merge origin/main` (b must be in; if not, stop: d waits for b).
  `python3 ../plans-backup/fu-11-plan-tools/check-blocks.py --branch d --b-merged …` is no longer meaningful after the
  merge; confirm with `git diff origin/main --stat` that exactly Part G's files differ.
- [ ] **Step 2 — full verification** as Gate B Step 2 (fast suites, typecheck, build, the e2e on both projects).
- [ ] **Step 3 — the learner monitor (Review Focus 3 and 4).** (3) with a follower open: change the instructor's skin
  (Settings) → the follower follows within 1 s; press Silence on the instructor → the follower still sounds (sound on
  in both windows; by ear, or `__pmeFollower.monitor.audioLog` growing); "Silence here" on the follower → the
  instructor's alarm state (`__pmeApp.link.alarms.silencedUntil`) unchanged; reload the instructor → the follower
  re-syncs under the same code; close it → "The instructor's monitor is not answering" within 5 s. (4) host frame p95
  on the bronchospasm case at ×4 with the Ventilator view, with and without a follower window (`__pmeApp.frames`,
  30 s each; report both).
- [ ] **Step 4 — rehearsal** as Gate B Step 3 with `multiwindow.showcase.ts` and a follower open in each case; the
  numbers equal Gate B's.
- [ ] **Step 5 — evidence:** the follower beside the host (same numbers, same skin); the follower with the Ventilator
  view; the follower after a skin change.
- [ ] **Step 6 — the gate note `docs/gates/fu-11-d.md`:** the measurements above, the declared deviation (mirror frames
  over BroadcastChannel only, brief §3.7, R50 F3), the wire contract pointer (`follower.ts` header) for the later
  mobile plan.
- [ ] **Step 7 — pull request** `gh pr create --base main --head fu-11-d --title "FU-11 (d): the second-screen learner
  monitor" --body-file <scratchpad>/fu-11-d/pr-body.md` (findings K2, R50 F3, F4, F5, F11, owner ruling Q3; body ending
  with the 🤖 line). Stop after opening the PR.

---

## Mechanical self-check

`../scratch/plans-backup/fu-11-plan-tools/check-blocks.py` parses this document's blocks in order, grouped by branch
from the Part headings, and checks each branch from `origin/main` (every find block occurs exactly once in the base
file and exactly once at its place in the branch's sequence; no create overwrites an existing file; a file created by
two branches has the same body); branch d is checked on top of b's blocks (R50 F11); then the four branches together
in plan order. Run on the written plan against `origin/main` 48864439:

```text
branch a: 51 find/replace blocks (0 chained), 19 creates; problems: 0
branch b: 53 find/replace blocks (0 chained), 23 creates; problems: 0
branch c: 42 find/replace blocks (0 chained), 10 creates; problems: 0
branch d (on b): 32 find/replace blocks (0 chained), 4 creates; problems: 0
all branches merged: 178 find/replace blocks (0 chained), 56 creates; problems: 0
```

Two more checks were run while writing (tools in the same folder): `render.py` applies every block of each branch in
order to the base (d after b) and compares the result with the prototype's file — 0 differences per branch and with
all four — and lists any prototype change no task carries (none); and a FOUR-WAY git merge: each branch committed on
its own detached worktree from 48864439 with `check-blocks.py --apply` (d on top of b's commit), then `git merge` of
a, c and d into b's tree: automatic, no conflict (11 files auto-merged, 0 conflicts); the merged tree equals the prototype in all 131 files FU-11 changes or creates (17 of them are edited or created by two or three branches; 131 files, 3 035 insertions, 209 deletions against 48864439).

Re-run: `python3 ../scratch/plans-backup/fu-11-plan-tools/check-blocks.py --branch all [--verbose] docs/plans/fu-11-hardening.md <repo>`
(each executor's setup task runs it for its branch). Rebase check: the blocks were cut on
48864439 itself; the 52 commits since cdf95a2c touched four of FU-11's files (`engine.ts`, `l2/endo/pipeline.ts`,
`types.ts`, `vite.config.ts`) and the prototype patch applied to them with `git apply -3` without a conflict.

## Self-review

**Coverage.** Every external-review finding (F01–F26), every browser-audit finding (BA01–BA12) and case note (HI03,
AL01, R10, LC01, the passing controls), every rulings item (rehearsal S1–S6, kit K1–K6, the hotfix notes, presenter
D1–D5, the earlier FU-11 list, the CI and flake notes, the stale worktrees), every R50 finding (F1–F11, M1–M16: the
"Review fixes" table), the owner rulings Q1–Q6 and the first showcase's items (Sound off, the Ventilator view's
volume, the mobile learner monitor to come) has a row with a decision. Each of the 21 audit regressions is installed
by the task that turns it green.

**Rules.** No physiology change (engine edits: validators, the command copy, `stop()`, the snapshot codec, the
defibrillator's tone lifecycle, `readSamples`' index, and the alarm-silence rule B4 by owner ruling — device
behaviour, not physiology); H5 changes the Ventilator view's delivered volume by fixing its flow, declared in the
global constraints and checked by Gate B's same-day rehearsal; no band widened (K3's statistic relaxation disclosed);
glossary untouched (UI copy only; H3's tooltip from skin data); bookmark restore un-hidden only in E4 after D1–E3b; the
five-case rehearsal is a gate step on the integrated tree, same day against main. Commits carry
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; every task pushes; no executor merges.

**Placeholders.** None: every code step is a Create with the full file or a find/replace block; every command has its
expected output; the gate's hidden-tab script is given in full.

**Interfaces across tasks** (all defined in the task that creates them): `wireBudgetError`, `WIRE_LIMITS.maxDepth/
maxNodes` (A1); `EVENTS_PER_MESSAGE`, `MESSAGE_BUDGET_BYTES` (A3); `ToneHandle.endsAt` (B1); `DefibState.tones` (B2);
`AlarmMgrState.silencedLevel` (B4); `WORKER_SILENT_MS`, the `pme-monitor-failed` event (C1);
`ManagedTransport.onPresence`, `TransportBase.presence` (F2); `ControllerSession.timeScale/hostPaused` (F3);
`encodeState/decodeState/NF_KEY` (D1); `MonitorEngine.stop` (D2); `TrendStore.rewind` (E1); `MonitorCore.restore`,
`DeviceUI.reset` (E2); `TimelineCause`, `newTimeline(cause)` (E3); `AppSession.onTimeScale` (H1);
`MonitorHandle.disableSound/soundOn`, `AppSession.disableSound` (H4); `monitorMatchedFlow`, `MONITOR_IE` (H5);
`overBudget` (J5); `HostSession.mirror`, `AppliedResolution.mirror` (G1); `ViewerClock`, `MonitorHandle.viewerClock`,
`MonitorHandle.silenceAudio`, `MountOptions.audioSilence`, `Host.core`, `followUrl`, `mountFollower`, `publishStyle`,
`AppSession.linked`, `AppSession.onSkin`, `Shell` option `follower` (G2).

**Known limits / not verified.** F07 and F24/F25 were verified by reading. K4 (kit) did not reproduce (Q5). The hidden
tab is a gate procedure (Gate A Step 3), not run while writing. The five-case rehearsal was run on the cdf95a2c
prototype (10/10), not after the rebase and H5 (Gate B runs it same-day). The follower was measured in one browser
profile on this Mac (Chromium 1243, WebKit 2359); real Safari, a real second display and iPad were not tried. The
relay's hostile-input tests run on loopback only. B4's per-vendor evidence rests on the skins' provenance and the
repo's research notes (no vendor manual was re-read); a forward bookmark restore does not end an older sounding device
tone (R50 M12, recorded).

## Appendix — amendments this plan requires in other plans (R50 F8; the orchestrator files them)

Nothing in this plan is "handed" to a plan that does not contain it. Below: the exact text for
`docs/plans/stage-8b-release.md` (untracked copy in `repo/docs/plans/`, read on 2026-10-07: Tasks 1–14, Task 5 "Version
1.0.0 everywhere", Task 13 "CHANGELOG and the RELEASE checklist", Task 14 the gate), then the physiology backlog.

### A. `docs/plans/stage-8b-release.md`

**A1 — in Task 5 ("Version 1.0.0 everywhere, checked in one place"), append this paragraph after its Files line:**

```md
> **FU-11 amendment (R50 M2).** The engine's `version` is also the snapshot compatibility key (`engine.restore` and
> the learner monitor refuse a snapshot from another version). Before this task it was the constant `'0.0.0'` in every
> build, so the check never bit. Make it build-unique: `packages/engine-core/src/version.ts` exports
> `version = '1.0.0'` AND `build = '<git short hash>'` (written by the release build; `'dev'` in the workspace), and
> `snapshot()`/`restore()` compare `${version}+${build}` (a `dev` build accepts only `dev`). Test: a snapshot whose
> `engineVersion` differs in the build part is refused with the message naming both.
```

**A2 — insert this new task before `### Task 14: Gate — full verification, gate note, PR (no merge, no tag)`:**

```md
### Task 13b: Items FU-11 hands to the release (R50 F8)

**Files:** Modify `RELEASE.md` (from Task 13), `CHANGELOG.md`, `docs/guides/embedding.md` (Task 11's "Limits"), the
Developer view's page list in `apps/demo/src/app/views/dev.ts` (or the file that lists the build-stage pages on your
base); Create `docs/gates/stage-8b/developer-pages.md`.

- [ ] **Step 1 — the tick-cost release gate (FU-11 J5, F10).** In `RELEASE.md`'s checklist, before "tag", add:
  "On an idle machine (nothing else running): `npx -y pnpm@9.15.9 --filter @pme/validation perf:ticks --seconds 600
  --budget-ms <Stage 8a's p99 budget from docs/gates/stage-8a.md>` exits 0. CI does not run it (shared runners)."
- [ ] **Step 2 — the Developer-page review (FU-11 F24, F25).** For every build-stage page reachable from the Developer
  view (physiology console, stage7g, …) record in `docs/gates/stage-8b/developer-pages.md`: keep (it works and says what
  it is), fix (name the defect: the console restart's Pause/Resume and baseline, F24; stage7g's "7f pending" depth
  index, F25), or retire (remove the link and the page). No page that misreports the engine ships in v1.0.
- [ ] **Step 3 — release notes: trust limits (FU-11, rulings Q2/HI03/F07).** In `CHANGELOG.md`'s 1.0.0 "Known
  limits": "Pairing is for a trusted local network: anyone with the room code can act as a controller, and a peer that
  knows the host's id can take over the relay's host slot. A host-issued controller token and a host reconnect key
  come with the v1.1 relay. The relay's drop log has no rate limit (v1.1)."
- [ ] **Step 4 — soak with a busy Ventilator view (FU-11 list; CI WebKit).** Add to `RELEASE.md`: "With the
  Ventilator view open at ×4 and a Remote paired, the Remote shows its first state within 5 s and the host's frame
  p95 stays ≤ 20 ms for 10 min (record both)."
- [ ] **Step 5 — validation documents may declare an expected refusal (FU-11 J3, R50 M9).** Only if a document needs
  it by then: a `expect: { refused: true }` step field in `pme-validation/*` documents that makes a refusal the
  expected outcome; otherwise record "not needed" in the gate note.
- [ ] **Step 6 — R56 data gaps found by FU-11 H3.** (a) The fixed alarm words (`apps/demo/src/app/alarms.ts`
  `FIXED_ALARM_WORDS`) are not glossary data: move them into the glossary file (with Ali's review) or record why not;
  (b) the iec-defaults skins list `alwaysOn: []` while VF, VT and asystole still alarm on them: give them the
  documented list (with a provenance row) or record the gap.
- [ ] **Step 7 — commit:** `git add RELEASE.md CHANGELOG.md docs/gates/stage-8b/developer-pages.md …` and
  `git commit -m "docs(release): FU-11 hand-overs — tick gate, developer pages, trust limits, soak (8b Task 13b)"`.
```

### B. FU-12 / physiology backlog (v2.0 per `docs/roadmap/v1.0-remaining.md`; the orchestrator decides what goes into v1.0)

| Item | Measured / source | Why not FU-11 |
|---|---|---|
| The 10-min VF CPR rig needs ventilation | FU-11 list (rulings, 2026-10-04); the rig runs CPR without breaths, so its numbers are not those of a ventilated arrest | physiology test rig |
| Tamponade arrest not reversible by drainage (presenter D1) | presenter documents (D1); kit round 2: tamponade MAP < 40 at 113 s, no recovery after drainage in the arrest state | physiology (circulation model) |
| Explore RAP 35 vs monitor CVP 17 in compensated tamponade (presenter D2) | presenter documents (D2) | a model/monitor mapping question: check which is the transmural vs the measured pressure first |
| CPR + adrenaline before "SPO2 NO PULSE" → VF, no ROSC (kit K1) | kit round 2 notes; haemorrhage case: pulse lost ≈ 10:03, ROSC 4.3 min into CPR only when CPR starts after pulse loss | perfusion/reflex model (the cardiac-reflexes audit, `docs/roadmap/v2.0/evidence/cardiac-reflexes-audit.md`) |
| IBP1 STATIC PRESSURE and blank sys/dia at pulse loss (kit K6) | kit round 2 | monitor fidelity: the calibration review (vendor behaviour) |
| Alarm PAUSE vs a new higher-priority alarm (owner question Q7) | B4 changes silence only | an owner ruling first |

