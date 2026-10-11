# Stage 12: learners' phones — a QR-paired live learner monitor over the relay — Implementation Plan

STATUS: REVIEWED-FIXED (2026-10-11, base `origin/main` 7a3d5672 + FU-11 FIXED blocks of branches b and d + Stage 10 REVIEWED-FIXED blocks = local base 1996962b, rebuilt from those plans and identical; 3 413 lines) — R50 review `scratch/plans-backup/stage-12-review.md` (0 critical, 6 important, 9 minor: all applied, re-prototyped and re-measured on both engines) and the orchestrator's rulings (Q1, Q2, Q3, Q6, Q7 accepted; Q4: the instructor's style carried in the follow stream, portrait; https → ws accepted; a real-phone six-card gate step); Task 0 + 9 tasks + a gate; executes AFTER FU-11 b, FU-11 d and Stage 10 have merged; Q5 (the network on the day, Node on the presenting Mac) stays the owner's, in the run sheet's pre-flight checklist

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prototype.** Every task below was run in a throwaway worktree (`scratch/wt-stage-12-proto`, detached at
> `origin/main` 7a3d5672 = FU-11 a + c and FU-7.1 a merged) on a local base commit made of (1) FU-11's FIXED plan blocks
> of branches **b and d** (`check-blocks.py --branch d --apply`: b then d, 0 problems — the hunks of a and c are already
> on main) and (2) every block of Stage 10's REVIEWED-FIXED plan (`stage-10-plan-tools/check.py --base-dir`: 114 blocks +
> 10 creates, 0 problems on that tree). The base typechecked clean. The prototype was then split into one local commit
> per task (`scratch/plans-backup/stage-12-plan-tools/build.py`, chain in `chain.txt`) and every find/replace block
> below was CUT MECHANICALLY from those commits (`cut.py`): applying the blocks of this file in order to the base
> reproduces every task's tree and the final tree byte for byte (`check.py`: 75 find/replace blocks + 15 creates, 34 files: 0 problems — every task tree and the final tree byte-identical; the same blocks with `--base-dir` on the base tree: 0 problems). Patch (base → final):
> `scratch/plans-backup/stage-12-prototype.patch`. Nothing was committed to any branch, nothing was pushed; the worktree
> was removed.
>
> **R50 review (2026-10-11, `scratch/plans-backup/stage-12-review.md`: 0 critical, 6 important, 9 minor — all applied,
> with the orchestrator's rulings on Q1–Q7).** The base was rebuilt independently from the FU-11 and Stage 10 plans'
> final text (identical to 1996962b); the fixes were re-prototyped in `scratch/wt-stage-12-review` on that base, the
> chain rebuilt and every block re-cut; the pre-review plan is `scratch/plans-backup/stage-12-mobile-learner.pre-r50.md`.

**Goal:** the owner's request for the 22 October demonstration to ≈ 30 clinicians — "ask them to scan a QR code on
their devices and have a learner monitor opened; the learner monitor should be optimized for mobile screens" — as
decided: the phones are LIVE followers of the instructor's session (not copies running on their own), over the existing
relay, from the presenter's laptop on the venue network or a network the presenter brings; the same-browser second
screen stays as it is and is the fallback.

**Architecture:** the phone runs FU-11 G2's learner monitor unchanged in substance — a `viewer` monitor steered by a
`ViewerSync` — on a WebSocket to `pme-relay` instead of the BroadcastChannel (`mountFollower(…, { relay })`). The relay
gains a classroom mode: it serves the BUILT app over http on its own port (`--static`), so the QR code is one short
address `http://<laptop>:<port>/?join=<CODE>` and the phone's relay is the page's own host; it tells the instructor's
page the laptop's network addresses (`/pme-relay.json`); it lets another device only follow (`--remote-roles viewer`)
and takes at most 60 phones per session (the 61st is refused, no retry); it sends a phone only the events a viewer uses
and a hello's replays only to the peers awaiting a snapshot. The renderer gains a `portrait` layout (tiles in a 3-column
grid under full-width waveforms). The phone's states come from one pure reducer. While the Ventilator view drives the
patient (its frames never leave the browser, FU-11 R50 F3) the host sends a `cockpit` event once a second and the
phone HOLDS. The phone wears the instructor's monitor style, upright: a `style` event in the follow stream (every answer to a
hello, every change; owner ruling Q4). The instructor's page gets a **Phones** sheet (the QR moment) and the showcase
kit a **Start Classroom** launcher with the relay bundled in one file.

**Tech Stack:** TypeScript 5.9 strict (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `noImplicitOverride`), Vitest
3.2.7, Playwright 1.63 (its own Chromium + WebKit; device emulation `Pixel 7` / `iPhone 13`), `ws` 8.21.3 (already the
relay's dependency, N-007), pnpm 9.15.9 via `npx`, Node ≥ 22.12 (CI 22, local 26). **No new dependency.**

**Spec:** the brief `../scratch/briefs/plan-stage-12-mobile-learner.md` (workspace, outside this repo); FU-11's FIXED
plan `docs/plans/fu-11-hardening.md` Part G (G1, G2) and **the follower's wire contract at the top of
`apps/demo/src/app/views/follower.ts`** (read it first; this plan adds one bullet to it); Stage 10's REVIEWED-FIXED plan
`docs/plans/stage-10-time-control.md` (D-3 `fastForward` event, D-9 the second screen waits and resyncs, D-12 the
panel); `packages/controller/relay/README.md`; `docs/DESIGN-BRIEF.md` §3.7 (raw samples never cross the wire);
`docs/RESUME.md` (process, R45, R50).

---

## Global Constraints

- **Executes after FU-11 b and d AND Stage 10 have merged** (all on `origin/main`). 11 of the 32 files this plan touches
  are theirs and every block in them was cut against their final (prototype) text — see "File ownership". Task 0 runs
  `check.py --base-dir .` on that main: 0 problems, or STOP and report. (Stage 10 itself executes after all four FU-11
  branches, so in practice: FU-11 a–d, then Stage 10, then this.)
- **No physiology change, no engine change.** No file under `packages/engine-core/**`, `docs/physiology/**`; no model,
  band or acceptance number moves (R45: no band widened).
- **No new dependency** (`package.json`, `pnpm-lock.yaml` untouched). The QR encoder is Stage 9's
  `apps/demo/src/app/qr.ts`, ADAPTED from Project Nayuki's MIT library (R50 I1: NOTICES N-014 says so, its licence text
  in `LICENSES/qrcodegen-MIT.txt`, the kit ships `NOTICES.md` and `LICENSES/`); `ws` is bundled into the kit's relay
  file (N-007 updated, its licence text copied beside it).
- **The second screen does not change behaviour** (same browser, BroadcastChannel): its only change is that a window
  hidden for more than 2 s starts from a fresh snapshot instead of computing the gap (Task 6), and its status line now
  comes from the reducer with the same texts. `fu11-follower.e2e.ts` and `s10-time-control.e2e.ts` must stay green.
- **The wire stays sample-free** (brief §3.7, FU-11 R50 F3): the Ventilator view's frames still go to BroadcastChannel
  peers only; a network viewer gets a `cockpit` event (time and tick, no samples) instead.
- **Copy (R56: no clinical label added):** "Phones", "Learners' phones: scan to follow this monitor", "N phones
  following" / "1 phone following", "Phones must be on the same Wi-Fi as this computer. Sound on a phone starts only when
  its owner taps Sound.", "If the code does not open: …", the five refusal texts of `qrTarget`, the phone's status texts
  (the reducer: "This session is full: please watch the main screen", "The classroom refused this phone: …", "This phone
  has another version of the simulator: scan the code again", "Waiting for the instructor: this phone cannot reach the
  instructor's laptop. Is it on the classroom Wi-Fi?", "Connection lost: reconnecting…", "The ventilator is on the main
  screen: this monitor waits until it closes"), the hold panel ("The ventilator is on the main screen", "This monitor
  continues when the ventilator view closes."), "This monitor style has no phone layout: showing the default style"
  (owner ruling Q4), the relay's refusal messages, the kit's launcher (its Node.js messages: "Classroom mode needs
  Node.js 22 or later; this Mac has Node.js vX, which is too old." / "…, and this Mac has none." + "Install Node.js
  from nodejs.org (the LTS, version 22 or later), then double-click "Start Classroom" again.") and read-me text, the run
  sheet's pre-flight checklist.
- **Process (RESUME executor brief):** one branch `stage-12-mobile-learner` in the worktree `../scratch/wt-stage-12`
  from `origin/main`; failing test → run red → implement → run green → typecheck → commit with the task's message and the
  trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` → `git push` after EVERY task. Never push to main;
  never merge; the gate opens the PR and stops. Never `git stash`. Never run a command that reads standard input.
  Bounded waits (≤ 10 min per `until` loop). Kill only processes you started (never an unfiltered `pkill`). Scratch
  files under `<scratchpad>/stage-12/` only. The machine is shared (five agents): targeted tests in tasks, full suites
  once, in the gate.
- **Find/replace discipline:** every edit is a block that occurs exactly once at its place (`check.py` proves it in
  Task 0 and again in the gate after merging main). If main moved and a block no longer matches, locate the statement by
  the surrounding unchanged lines and make the same change; never re-type a line you are not changing.
- **Commands:** `npx -y pnpm@9.15.9 …` (pnpm is not on PATH); no `timeout` on macOS; e2e `npx playwright test <stem>
  --retries=0` from the worktree root (both projects unless `--project=…`); the classroom load test runs only by hand
  (`-c scripts/classroom/playwright.classroom.config.ts`, never in CI).
- **Never touch:** `packages/engine-core/**`, `packages/ventilator/**`, `packages/audio/**`, `docs/physiology/**`,
  `docs/plans/**` other than this plan, `.github/**`, `package.json`, `pnpm-lock.yaml`; Stage 11's files (the showcase
  scenario JSON, `scenarios.ts`, `showcase/**`, `apps/demo/vite.config.ts`) and FU-7.1's (`l2/**`, `drugs.ts`,
  `panel/drugs.ts`) — none is in this plan.

## Review Focus

1. **Thirty phones joining at once, or re-syncing at once** (the QR moment; every fast-forward end and patient restart
   makes every phone say hello). Each hello makes the host take a snapshot (≈ 94 KB, 1.4–2.4 ms) and send its replays;
   before Task 2 the relay sent every hello's replays to the WHOLE room (N × N copies). Task 2's test pins "replays go
   only to peers awaiting a snapshot" (and, R50 M2, a welcome event flagged `replay: true` by itself, the style); the
   load test's fast-forward phase measures the burst (Capacity). A phone that joins DURING a fast-forward is in the
   awaiting set, so it gets the host's answer (the `time.jump` replay among it): Task 7's e2e opens one mid-span (R50 I6).
2. **A phone that sleeps, changes access point or loses the Wi-Fi.** A dead socket can stay "open" on a phone: the
   transport's liveness (12 s, the relay's 10 s heartbeat) reopens it; a page hidden > 2 s starts from a fresh snapshot
   instead of computing every tick of the gap on the phone's main thread (5 min = 15 000 ticks). Pinned: the e2e's relay
   restart (reconnects, tiles equal again); the reducer's "Connection lost: reconnecting…". NOT pinned by a test (needs a
   real phone): the screen-lock path — the gate's rehearsal locks the iPhone/Android once.
3. **The Ventilator view while phones follow.** Measured without Task 5: a network follower re-synced every ≈ 4 s
   (its engine gets no cockpit frames; the external drive times out after 5 s), its tiles blanked 0.4–1 s each time and
   its SpO2 read 84–94 while the host read 96–97; 30 phones would ask 7.5 snapshots a second. Task 5/6 make it HOLD;
   the e2e checks ≤ 1 resync in 8 s and that it follows again with the next patient. The cockpit stays for the whole
   case (FU-11 H6 unloads it on a new patient only), so phones hold until then — the run sheet says so.
4. **A full session, a forbidden role, an unreachable relay** — the three ways a phone is turned away must each say what
   to do, and must not retry in a loop (4029/4003 are fatal close codes). Pinned: relay unit tests + the e2e (full,
   unreachable) + the reducer.
5. **The second screen and Stage 10 are not disturbed.** `follower.ts` is FU-11 d's file with Stage 10's panel wired to
   it in `main.ts`; the gate runs `fu11-follower`, `s10-time-control`, `stage6a-*` and `audit-relay` on both engines.
6. **The instructor's style on the phones (owner ruling Q4).** A `style` event in the follow stream (welcome + every
   change), worn upright; the BroadcastChannel second screen keeps G2's own style channel and ignores the event. Pinned:
   the reducer test (`phoneStyle`, the fallback and its note) and Task 7's e2e (Philips-style instructor, a switch to
   Saadat-style mid-run, the tiles equal to the instructor's).

---

## Decisions (made while prototyping; the executor does not revisit them)

- **D-1 — The phones follow over the existing relay with the existing viewer.** No new transport, no new sync: the
  phone mounts FU-11 G2's follower with `{ relay }` (a `createWebSocketTransport`), so speed, pause, resume, Stage 10's
  fast-forward (its panel shows on the phone; the phone waits and resyncs from the end snapshot, D-9 of Stage 10),
  timeline resets and the R50 F5 liveness all come from the G2 contract. Measured on both engines (e2e): synced, tiles
  equal to the instructor's at ×1, ×4, ×8, after a pause and after a 2-minute fast-forward.
- **D-2 — The phone's page comes from the relay itself (`--static`), not from the hosted copy.** A page served over
  https (GitHub Pages) cannot open a `ws://` socket to the laptop (mixed content; Chrome also blocks a public site from
  reaching a private address), and a hosted copy may be another build (its snapshot would be refused: "another
  version"). So the relay serves the kit's own built app on the WebSocket's port: ONE address, `http://<laptop>:<port>/
  ?join=<CODE>`, at most 41 characters → a version-3 QR symbol (29 modules: large modules, scannable from the back of a
  room; decoded from the projector screenshot by macOS CoreImage on both engines). The hosted copy opened with `?join=`
  (a learner who scanned with no classroom network) shows "Waiting for the instructor: this phone cannot reach the
  instructor's laptop. Is it on the classroom Wi-Fi?" after 6 s — that is the "static learner page that waits".
- **D-3 — The QR shows the laptop's network address, not the page's.** The instructor's page runs on `127.0.0.1` (the
  launcher opens it there: it keeps working if the Wi-Fi changes); `/pme-relay.json` gives the laptop's IPv4 addresses,
  this Mac's own hotspot (`bridge*`) first, then Wi-Fi/Ethernet (`en*`), then the rest; the sheet lists the others
  under the code ("If the code does not open: …").
- **D-4 — Security: the code is on the projector, so another device may only FOLLOW.** With `--static` the relay
  defaults to `--remote-roles viewer`: a socket from another device saying `host` or `controller` is refused
  (`forbidden`, close 4003, no retry); this machine itself (loopback or one of its own interface addresses) may host and
  command. The host still refuses a viewer's command (FU-11 R50 M13) and still takes only its own session (FU-11 A3).
  The WebRTC signalling path (`/signal`, unused by the classroom) is refused to another device too (R50 M3). The
  session code stays the only secret; a viewer can read the patient, nothing else. Owner ruling Q2: no "join as
  instructor" in the QR.
- **D-5 — A room's traffic is bounded by the relay, not by the host.** (a) A viewer gets only `VIEWER_EVENTS`
  (`state`, `beat`, `commandApplied`, `timeline`, `fastForward`, `scenario`, `cockpit`, `style`): its own engine computes the
  rest. Measured per phone at ×8: 61.9 → 10.4 KB/s (at ×1 7.4 → 1.3 KB/s). (b) The host's answer to a hello (its sticky
  replays) goes to the peers awaiting a snapshot, not the room: a prototype run where 59 extra followers joined sent one
  phone 6.4 MB of replayed scenario documents (N × N copies). The welcome is recognised by a `replay: true` flag on
  any of its events (a sticky `commandApplied`, or the style). A controller (the Remote) still gets every event.
- **D-6 — The Ventilator view: the phone HOLDS.** Its frames are samples and stay in the browser (FU-11 R50 F3). While
  it drives, `HostSession.mirror` sends the network transports (`websocket`, `webrtc`; never the BroadcastChannel,
  which gets the frames, nor the in-process panel) a `cockpit` event at most once a second — only when one exists, and
  whether or not a viewer said hello in FU-11's 10-minute window (a phone that joined long before still holds, R50 M1);
  never during a fast-forward. The phone's reducer holds while the last one is < 2.5 s
  old: the monitor's clock stops behind a dim panel "The ventilator is on the main screen", and when the events stop it
  takes a fresh snapshot (`ViewerSync.resync()`, new). The measured alternative (keep following and re-sync every ≈ 4 s:
  blank tiles, wrong SpO2, 7.5 snapshots/s for 30 phones) was owner Q3: HOLD is ruled (accepted).
- **D-7 — Portrait is a renderer option, not CSS over inline styles.** `MountOptions.portrait`: the monitor's row
  becomes a column, the DeviceUI's tile columns become `display: contents` inside one 3-column grid (the skin's order,
  every tile kept; numerics `min(9vw, 36px)`, large tiles `min(11vw, 44px)`; limits hidden). Landscape is unchanged.
- **D-8 — One reducer for every state of a learner monitor.** `followerStatus()` (pure) decides the status text, `ok`
  and `hold` from what the page knows; the phone and the second screen both use it (the second screen meets only the
  last four rows; its texts are unchanged). This is the "follower reducer" the brief asks to unit-test.
- **D-9 — Sound: off until tapped, per phone.** G2's per-window Sound and "Silence here" (owner ruling Q3), unchanged:
  mobile browsers unlock audio only from a tap, which the Sound button is (the AudioContext is created and resumed in
  it; a silent looping `<audio playsinline>` keeps it playing with the iPhone's ring switch on). Owner ruling Q1:
  phones silent until the learner taps Sound (accepted).
- **D-10 — The phone wears the INSTRUCTOR'S monitor style, upright, and follows its changes** (owner ruling Q4, as FU-11
  G2 for the second screen). The style travels in the follow stream, not the QR: a wire event `{ type: 'style'; skin;
  theme; replay? }` (protocol, Task 5) that the instructor's page adds to every answer to a hello (`replay: true`, so the
  relay routes it as the welcome) and publishes at every change (`session.ts`, Task 7); the phone applies it through
  the pure `phoneStyle()` (Task 6): a style it can draw upright is worn as it is — every shipped style can (all seven
  measured at 375 × 667 px on both engines: no horizontal scroll, no clipped value, numerics 33.75 px, large 41.25 px)
  — and anything else falls back to the default (Saadat-style) with "This monitor style has no phone layout: showing
  the default style" under the monitor. The BroadcastChannel second screen keeps G2's same-browser style channel.
- **D-11 — 60 phones per session, then a clear refusal.** Measured below: 30, 60 and 120 simulated phones; the default
  limit is twice the class (`--max-peers` changes it); the 61st phone shows "This session is full: please watch the main
  screen" and does not retry (4029 is fatal).
- **D-12 — The kit: "Start Classroom".** A second launcher beside "Start Simulator": it finds Node.js ≥ 22 (the kit's
  `runtime/` first, then PATH, `/opt/homebrew/bin`, `/usr/local/bin`), runs `server/relay.mjs` (the relay bundled by
  `make-bundle.mjs` with Vite's SSR build, `ws` inside, 139 KB) on port 8650 (the next 9 if busy) with `--static app`,
  and opens `http://127.0.0.1:<port>/?relay#/`. Without Node it says so and points to "Start Simulator". The kit built
  on this Mac has an EMPTY `runtime/` (Homebrew's node is ad-hoc signed, make-bundle copies only an official build), so
  the presenting Mac needs Node.js — this Mac has v26.8.2 (owner Q5, open). An older Node is named in the message
  ("this Mac has Node.js v20.11.1, which is too old") with the remedy (the LTS from nodejs.org), R50 I4; the run sheet
  opens with a pre-flight checklist (Node ≥ 22, the hotspot path tested the day before).

## Prototype results (base = origin/main 7a3d5672 + FU-11 b,d + Stage 10; Apple M3, 8 cores, a shared machine — load average 10–31 during the runs; Playwright Chromium + WebKit headless)

| Check | Before (base) | After (prototype) |
|---|---|---|
| A phone (Pixel 7 / iPhone 13 emulation) follows the instructor over the relay | impossible: the app offers the session on BroadcastChannel only; the Remote's relay path had no host | synced on both engines; tiles equal to the instructor's at ×1, ×4, ×8, paused, after a 2-min fast-forward (e2e) |
| Phone layout at 390–412 px | landscape skin: waveforms squeezed into ≈ 30 px beside 2 tile columns | waveforms over the full width, 7 tiles in a 3-column grid under them, status + Sound + Silence under that; no horizontal scroll; only "Sound off" and "Silence here" as buttons |
| QR code of the learner address | — | `http://192.168.1.100:<port>/?join=QFBAWA`, version 3; decoded from the projector screenshot (CoreImage) on both engines |
| Bytes per phone, ×1 / ×8 (anaphylaxis, 30 phones) | 7.4 / 61.9 KB/s | 1.3 / 10.4 KB/s |
| Replays at a join wave (59 extra phones, one phone's share) | 6.4 MB | ≈ 0 (only the peers awaiting) |
| Ventilator view driving, one phone | resync every ≈ 4 s (14 in 60 s), tiles blank 0.4–1 s each, SpO2 84–94 vs 96–97 | holds ("The ventilator is on the main screen"), ≤ 1 resync in 8 s; follows again with the next patient |
| Relay restart under a following phone | — | "Connection lost: reconnecting…" → following again, tiles equal (both engines) |
| 2nd phone over a limit of 1 / phone pointed at an unreachable relay | — | "This session is full: please watch the main screen" / after 6 s "…cannot reach the instructor's laptop. Is it on the classroom Wi-Fi?" |
| Kit: `Start Classroom` (PME_NO_OPEN, port 8750) | — | relay up on Homebrew node 26.8.2, `/pme-relay.json` and the app served, phone addresses printed; closing the launcher stops the relay |
| Snapshot a phone downloads on join / resync | — | 94 KB JSON, 1.4 ms (Chromium) / 2.4 ms (WebKit) to take on the host |
| A phone in the instructor's style (R50 I3, owner ruling Q4) | the phone wore its own site default | Philips-style instructor → the phone wears Philips-style upright at join; a switch to Saadat-style mid-run → the phone follows; tiles equal to the instructor's both times (e2e, both engines). Every shipped style upright at 375 × 667 px (Chromium + WebKit): 4–10 tiles, no horizontal scroll, no clipped value, status bar inside the screen |
| A phone that joins DURING a 2-minute fast-forward (R50 I6) | not tested | shows the fast-forward panel, then `synced`, tiles equal (e2e, both engines) |
| `startRelay` on a port already taken (R50 I2) | rejected (`EADDRINUSE`) | first prototype: unhandled `EADDRINUSE`, promise never settled; fixed: rejects (test) |
| Unit suites on the prototype (targeted; shared machine) | — | after R50: controller `test/relay` + `test/session` 20 files / 80 tests; renderer portrait + tiles + Stage 10 4 / 20; demo `src/app` 21 / 72; `pnpm -r typecheck` clean at EVERY task's commit of the rebuilt chain (T1–T9, one by one) |
| Neighbour e2e, both engines: `fu11-follower`, `s10-time-control`, `audit-relay`, `audit-remote`, `stage6a-screens`, `s12-mobile-learner` | — | after R50: `s12-mobile-learner` 6 passed (both engines); the five neighbours 17 passed, 2 skipped (the `measure` tests), 1 failed: `s10-time-control`'s 5-minute test on Chromium once (`lastFastForward.endT` 120, expected > 463: the Ventilator-view fast-forward's end on a new timeline) — re-run alone 1 + 4 of 4 passed, and 4 of 4 on the base: a load flake of Stage 10's test (no relay transport, so no Stage 12 code on its path), NOT a finding; the gate's full e2e runs it again. (Planner's run before R50: 23 passed, 2 skipped, 1 failed — the fu11-follower flake in the next row.) |
| `fu11-follower` "it follows while the Ventilator view drives the patient", WebKit, alone (R50 M7) | base: 0 of 8 (planner) + 0 of 8 (review) | planner 2 of 9; review 1 of 6 and 0 of 8 before the R50 fixes, 1 of 8 after (M1 removed the one host-side difference on that test's path); base 0 of 16 in the review. Localised (R50 M7, an instrumented copy): the resync is `viewer-sync.ts`'s "too late to mirror exactly" — a mirrored Ventilator frame arrives at a tick the second screen has passed; FU-11 K2 code. The test has no relay; the Stage 12 code on the second screen's page is O(1) work per 500 ms (the reducer) and listeners that did not fire. 4 of 31 vs 0 of 24 is not significant (Fisher, one-sided p ≈ 0.09): NOT attributed; Gate Step 2 keeps the 5 × 5 rule and logs each resync's cause |

## Capacity (brief item 3; `scripts/classroom/load.classroom.ts`, Task 9)

Measured on this Mac (Apple M3, 8 cores, shared: load average 10–16 during these runs; the relay in its own Node
process, the instructor page in Chromium on the built app served by the relay, N simulated phones = WebSocket clients
with a viewer's traffic, plus ONE real phone page — Pixel 7 emulation, CPU slowed ×4 or ×6 by Chromium's throttling,
a mid-range Android's single-thread speed; WebKit has no throttling). Case: showcase anaphylaxis; phases of 60 s (N = 30)
or 30 s; "lag" = receive time − the host's `sentAt` (one clock).

| Phones | Phase | Relay out (msg/s · KB/s) | Per phone (msg/s · KB/s) | Relay CPU · RSS max | Lag p50 / p95 / max (ms) | Phone page frame p50 / p95 / max (ms) |
|---|---|---|---|---|---|---|
| 30 | ×1 | 70 · 38 | 2.3 · 1.3 | 0.3 % · 69 MB | 1.1 / 5.4 / 13 | 16.7 / 16.7 / 16.8 (×4 CPU) |
| 30 | ×8 | 536 · 312 | 17.9 · 10.4 | 1.5 % · 31 MB | 1.4 / 8.1 / 103 | 16.7 / 16.8 / 133 (×4) |
| 30 | 2-min fast-forward + all re-sync | 211 · 293 | 7.0 · 9.8 (1 snapshot ≈ 94 KB each) | 0.9 % · 38 MB | 2.0 / 8.1 / 61 | 16.7 / 33.4 / 67 (×4) |
| 30 | ×8, phone CPU ×6 | 672 · 355 | 22.4 · 11.8 | 1.6 % · 55 MB | 1.8 / 14.9 / 104 | 16.7 / 33.4 / 150 (×6) |
| 30 | bronchospasm, Ventilator view driving, ×8 | 547 · 324 | 18.2 · 10.8 | 1.5 % · 48 MB | 1.3 / 12.4 / 61 | 16.7 / 16.8 / 33 (holding) |
| 60 | ×8 | 1 332 · 699 | 22.2 · 11.7 | 2.1 % · 58 MB | 1.0 / 3.3 / 24 | 16.7 / 16.7 / 17 (×4) |
| 120 | ×8 | 2 648 · 1 402 | 22.1 · 11.7 | 2.8 % · 92 MB | 1.1 / 4.2 / 25 | 16.7 / 16.7 / 50 (×4) |
| 120 | 2-min fast-forward + all re-sync | 1 279 · 1 376 | 10.7 · 11.5 | 2.5 % · 58 MB | 2.2 / 9.5 / 95 | 16.7 / 33.4 / 50 (×4) |

Before Task 2 (same machine, 30 phones): ×1 7.4 KB/s and ×8 61.9 KB/s per phone (1.9 MB/s out of the relay at ×8); the
fast-forward re-sync burst 1.6 MB/s for 20 s. The instructor page's frame interval was 16.7 / 16.7–16.8 ms (p50 / p95)
with 0, 30, 60 or 120 phones: the host sends each message once, whatever the room. Every real phone page stayed
`synced` with 0 re-syncs except the one after each fast-forward (by design).

**The limit and what happens beyond it.** The relay is not the limit (120 phones: 2.8 % of one core, lag p95 4 ms).
The room's Wi-Fi is: at ×8, 30 phones need ≈ 0.3 MB/s and 120 ≈ 1.4 MB/s of Wi-Fi airtime plus ≈ 94 KB per phone at
every join, fast-forward end and patient restart (30 phones: ≈ 2.8 MB in a second or two) — a venue access point
handles that; a laptop or phone hotspot with many clients may not (not measured here). The default limit is **60 phones
per session** (`--max-peers`): the 61st is refused at once with "This session is full: please watch the main screen"
and does not retry (close 4029; Task 1 test, Task 7 e2e with a limit of 1, and every load run's 61st/126th phone).
A phone too slow for ×8 does not fall out of step: the viewer's clock drops frames (×6 CPU: p95 33 ms) and keeps the
host's time; it stays `synced`.


## Licence note (brief item 1)

- **QR encoder: no new dependency, but borrowed code (R50 I1).** `apps/demo/src/app/qr.ts` (Stage 9, ≈ 250 lines: byte
  mode, level M, versions 1–10) said "written here, not copied"; it is in fact a close ADAPTATION of Project Nayuki's
  *QR Code generator library* (TypeScript, MIT, "Copyright (c) Project Nayuki"): `rawModules` is
  `getNumRawDataModules` (`(16*ver+128)*ver+64`, `(25*n-10)*n-55`, `-36`), `gfMul` is `reedSolomonMultiply` (the same
  loop with `0x11D`), `rsDivisor` is `reedSolomonComputeDivisor`, and the codeword zig-zag `((right + 1) & 2) === 0` is
  `drawCodewords`'s `upward`. MIT asks for the copyright and permission notice with copies and substantial portions, so
  Task 3 adds NOTICES row **N-014** naming the library (URL, MIT, the copyright, "adapted", the DENSO WAVE trademark
  line), the licence text as `LICENSES/qrcodegen-MIT.txt` (as fast-uri's), and corrects `qr.ts`'s header; Task 8 ships
  `NOTICES.md` and `LICENSES/` in the kit (its built app carries this code and ajv's; comments are minified away). The
  hosted GitHub Pages copy has the same gap: Stage 8b's release checklist (not this plan's file). A build-time image
  was not needed: the code is drawn as an SVG at the moment the sheet opens, with the address of that moment.
- **ws 8.21.3 (MIT, N-007)** was a Node-only relay dependency; Task 8 bundles it unmodified into the kit's
  `server/relay.mjs` (a Node file, never a browser build) and copies its licence text beside it
  (`server/relay.mjs.LICENSE-ws.txt`, the MIT notice requirement); N-007's row says so.

## File ownership against FU-11 b/d and Stage 10 (brief: "list every such file")

No file FU-11 b/d or Stage 10 edits is edited here except by blocks cut against their final text (the base above).

| File | FU-11 tasks (branch) | Stage 10 tasks | Stage 12 blocks |
|---|---|---|---|
| `packages/controller/relay/server.ts` | a: A2 · d: G1 | — | T1: 11, T2: 2 |
| `packages/controller/src/protocol.ts` | a: F2 · b: E3 · d: G1 | T3 | T2: 1, T5: 2 |
| `packages/controller/src/session/host-session.ts` | a: A3, C2 · b: E3 · d: G1 | T1, T3 | T5: 3 |
| `packages/controller/src/session/viewer-sync.ts` | b: E3 | T1, T3 | T5: 1 |
| `packages/renderer/src/device-ui.ts` | b: E2 | — | T4: 4 |
| `packages/renderer/src/mount.ts` | a: B3 · b: E2, H4 · d: G2 | T1, T2 | T4: 3 |
| `apps/demo/src/app/main.ts` | a: C1 · b: H3, H4 · d: G2 | T5 | T6: 3, T7: 4 |
| `apps/demo/src/app/session.ts` | b: H1, H4 · d: G2 | T5 | T7: 7 |
| `apps/demo/src/app/app.css` | b: H3 · d: G2 | T5 | T6: 1, T7: 1 |
| `apps/demo/src/app/views/follower.ts` | d: G2 (creates it) | — (wires its panel in main.ts) | T6: 10 |
| `apps/demo/src/app/views/monitor.ts` | d: G2 | — | T7: 2 |

Files only Stage 12 edits or creates: `LICENSES/qrcodegen-MIT.txt` (T3: create); `NOTICES.md` (T3: 1, T8: 1); `apps/demo/e2e/s12-mobile-learner.e2e.ts` (T7: create); `apps/demo/src/app/classroom-panel.ts` (T7: create); `apps/demo/src/app/classroom.test.ts` (T3: create); `apps/demo/src/app/classroom.ts` (T3: create); `apps/demo/src/app/qr.ts` (T3: 1); `apps/demo/src/app/views/follower-status.test.ts` (T6: create); `apps/demo/src/app/views/follower-status.ts` (T6: create); `docs/showcase/CLASSROOM.md` (T8: create); `packages/controller/relay/README.md` (T1: 5); `packages/controller/relay/bin.ts` (T1: 4); `packages/controller/relay/http.ts` (T1: create); `packages/controller/src/transport/relay-frames.ts` (T1: 1); `packages/controller/test/relay/relay.test.ts` (T2: 2); `packages/controller/test/relay/s12-relay-classroom.test.ts` (T1: create); `packages/controller/test/session/s12-cockpit.test.ts` (T5: create); `packages/renderer/test/s12-portrait.test.ts` (T4: create); `scripts/classroom/load.classroom.ts` (T9: create); `scripts/classroom/playwright.classroom.config.ts` (T9: create); `scripts/showcase/kit/read-me-first.txt` (T8: 1); `scripts/showcase/kit/start-classroom.command` (T8: create); `scripts/showcase/make-bundle.mjs` (T8: 4).

Against the other plans in flight: **Stage 11** (`docs/plans/stage-11-scenarios.md`: the showcase scenario JSON,
`scenarios.ts`, `showcase/**`, `apps/demo/vite.config.ts`, `ci.yml`) — no file in common; its case ids
`showcase-anaphylaxis`, `showcase-bronchospasm`, `showcase-induction` (this plan's e2e) are kept by it. **FU-7.1** — no
file in common. If FU-11's or Stage 10's merged text differs from its prototype at a block's place (its executor
amended it), Task 0's check names the block: locate the statement by its unchanged neighbours, make the same change, and
note it in the gate note. What this plan relies on beyond text: G2's `mountFollower`/`ViewerSync`/`viewerClock`
(Task 6), G1's `HostSession.mirror` and the relay's mirror drop (Tasks 2, 5), Stage 10's `fastForward` event,
`ViewerSync.fastForward*` and `mountFastForward` (Task 6's phone shows Stage 10's panel through `main.ts`'s follower
branch unchanged), FU-11 F2's `onRelayFrame` presence, H6's cockpit unload (Task 7's e2e).

## Owner questions — ruled (orchestrator, 2026-10-11), except Q5

| # | Question | Ruling | Built in |
|---|---|---|---|
| Q1 | Should the phones sound alarms at all? | ACCEPTED: silent until the learner taps Sound (per phone; "Silence here" per phone) | D-9; the QR sheet says it |
| Q2 | Should the QR also offer "join as instructor"? | ACCEPTED: no — phones may only follow (`--remote-roles viewer`) | D-4 |
| Q3 | Ventilator view: phones hold, or keep following approximately (re-sync every ≈ 4 s)? | ACCEPTED: HOLD ("The ventilator is on the main screen") until the next case — the measured alternative blanks tiles every 4 s | D-6 |
| Q4 | Which monitor style on the phones? | RULED (the owner's earlier ruling, FU-11 G2): the INSTRUCTOR'S style, carried in the follow stream (not the QR), its portrait variant, following changes; a style with no portrait variant falls back to the default portrait layout and says so | D-10 (R50 I3) |
| Q5 | Which network on the day (venue Wi-Fi, a travel router, the Mac's hotspot), and Node.js on the presenting Mac? | **OPEN — the owner's.** In the run sheet's pre-flight checklist: install Node.js ≥ 22 from nodejs.org; test the hotspot path the day before | Run sheet (Task 8), D-12 |
| Q6 | 60 phones per session? | ACCEPTED: 60 (`--max-peers`) | D-11 |
| Q7 | Show the case title or state on the phones? | ACCEPTED: no (the `scenario` event reaches them, nothing shows it) | — |
| — | The hosted page cannot reach a LAN relay (https → ws) | ACCEPTED: the QR points at the laptop (the run sheet says so); the hosted page's waiting message stays | D-2 |

---

## Tasks

Each task: the failing tests first (created verbatim), run red, the implementation as find/replace blocks (cut from the
prototype; each matches exactly once at its place), run green, typecheck, commit and push. Ticks go in this plan's copy
on the branch (committed in Task 0).

### Task 0: Branch, install, block check, the before-numbers

**Files:** none changed except this plan (copied in and committed).

- [ ] **Step 1: Worktree and install**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git log --oneline -1 origin/main
git worktree add ../scratch/wt-stage-12 -b stage-12-mobile-learner origin/main
cd ../scratch/wt-stage-12
npx -y pnpm@9.15.9 install --frozen-lockfile
```

- [ ] **Step 2: FU-11 b, d and Stage 10 are on main** — `git log --oneline origin/main | grep -E "fu-11-b|fu-11-d|stage-10"`
  shows the three merges, and `ls apps/demo/src/app/views/follower.ts apps/demo/src/app/fast-forward.ts` lists both.
  If any is missing: STOP and report.

- [ ] **Step 3: Block check**

```bash
python3 ../plans-backup/stage-12-plan-tools/check.py ../../repo/docs/plans/stage-12-mobile-learner.md ../../repo ../plans-backup/stage-12-plan-tools/chain.txt --base-dir .
```

Expected: `75 find/replace blocks + 15 creates, 34 files: 0 problems` (the creates only count; a find that occurs 0× or 2× is named with its task: see Global
Constraints, "Find/replace discipline").

- [ ] **Step 4: Before-numbers** (record in the gate note): `npx -y pnpm@9.15.9 -r typecheck` (clean);
  `cd packages/controller && npx vitest run test/relay test/session/viewer-sync.test.ts` (counts);
  `npx playwright test fu11-follower s10-time-control --retries=0` (counts, both engines).

- [ ] **Step 5: Commit the plan**

```bash
cp ../../repo/docs/plans/stage-12-mobile-learner.md docs/plans/
git add docs/plans/stage-12-mobile-learner.md
git commit -m "docs(plans): Stage 12 — learners' phones (QR-paired live learner monitor)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin stage-12-mobile-learner
```

### Task 1: The relay in a classroom — the app and `/pme-relay.json` on its port, phones may only follow, a limit, the host hears the count

**Files:**
- Create: `packages/controller/relay/http.ts`, `packages/controller/test/relay/s12-relay-classroom.test.ts`
- Modify: `packages/controller/relay/server.ts` (FU-11 a A2, d G1), `packages/controller/relay/bin.ts`,
  `packages/controller/src/transport/relay-frames.ts`, `packages/controller/relay/README.md`

**Interfaces:**
- Produces: `RelayOptions.staticDir?: string`, `.maxPeersPerRoom?: number` (default 60), `.remoteRoles?: 'viewer' |
  'all'` (default `'all'`; the bin defaults to `'viewer'` with `--static`), `.isLocal?: (address) => boolean` (tests);
  `GET /pme-relay.json` → `{ relay: 'pme', port: number, addresses: string[], serves: boolean }`;
  `RELAY_CLOSE.forbiddenRole = 4003` (fatal); the host receives `{relay:'peers', hostOnline, peers}` whenever a peer
  comes or goes; `http.ts` exports `lanAddresses()`, `isLocalAddress()`, `httpHandler()`, `RelayInfo`. A port already
  taken still REJECTS `startRelay` (`EADDRINUSE`; the WebSocketServer is attached after the http server listens, R50
  I2); `/signal` is refused (4003) to another device under `remoteRoles: 'viewer'` (R50 M3).

- [ ] **Step 1: Write the failing test**

Create `packages/controller/test/relay/s12-relay-classroom.test.ts`:

```ts
// Stage 12: the relay in a classroom — it serves the built app and /pme-relay.json on its own port, another device may
// only follow, a session takes a limited number of phones, and the host hears how many follow.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createStamper, type Role } from '../../src/protocol.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { startRelay, type RelayHandle, type RelayOptions } from '../../relay/server.ts';
import { sleep, waitFor } from '../helpers.ts';

const SESSION = 'CKS234';
let relay: RelayHandle | null = null;
afterEach(async () => relay?.close());
const start = async (o: RelayOptions = {}) => (relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000, ...o }));

async function client(r: RelayHandle, id: string, role: Role) {
  const ws = new WebSocket(`ws://127.0.0.1:${r.port}/`);
  const got: Array<Record<string, unknown>> = [];
  const c = { ws, got, closeCode: null as number | null, send: (b: Parameters<ReturnType<typeof createStamper>>[0]) => ws.send(JSON.stringify(createStamper(SESSION, id)(b))) };
  ws.onmessage = (e) => got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
  ws.onclose = (e) => (c.closeCode = e.code);
  await new Promise((ok) => (ws.onopen = ok));
  c.send({ kind: 'hello', role });
  await sleep(20);
  return c;
}

describe('Stage 12: the classroom relay', () => {
  it('serves the built app and /pme-relay.json over http on the WebSocket port; nothing outside the folder', async () => {
    const dir = mkdtempSync(join(tmpdir(), 's12-app-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>app</title>');
    writeFileSync(join(dir, 'assets/a.js'), 'export {}');
    const r = await start({ staticDir: dir });
    const get = (p: string) => fetch(`http://127.0.0.1:${r.port}${p}`);
    expect(await (await get('/')).text()).toContain('<title>app</title>');
    expect(await (await get('/?join=CKS234')).text()).toContain('<title>app</title>');
    expect((await get('/assets/a.js')).headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect((await get('/%2e%2e/%2e%2e/etc/passwd')).status).toBeGreaterThanOrEqual(403);
    expect((await get('/missing.html')).status).toBe(404);
    const info = (await (await get('/pme-relay.json')).json()) as { relay: string; port: number; addresses: string[]; serves: boolean };
    expect(info).toMatchObject({ relay: 'pme', port: r.port, serves: true });
    expect(Array.isArray(info.addresses) && info.addresses.every((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a) && !a.startsWith('127.'))).toBe(true);
  });

  it('a malformed request, a POST or raw garbage is that request\'s problem: the relay goes on serving', async () => {
    const r = await start({ staticDir: mkdtempSync(join(tmpdir(), 's12-app-')) });
    const base = `http://127.0.0.1:${r.port}`;
    expect((await fetch(`${base}/%E0%A4%A`)).status).toBe(400);
    expect((await fetch(`${base}/`, { method: 'POST', body: 'x' })).status).toBe(405);
    await new Promise<void>((ok) => {
      const s = connect(r.port, '127.0.0.1', () => s.end('\x00\xff NOT HTTP\r\n\r\n'));
      s.resume(); // read the relay's 400, so the socket can close
      s.on('close', () => ok());
      s.on('error', () => ok());
    });
    expect(((await (await fetch(`${base}/pme-relay.json`)).json()) as { relay: string }).relay).toBe('pme');
    const v = await client(r, 'v', 'viewer');
    expect(v.closeCode).toBeNull();
    expect(r.room(SESSION)?.peers).toBe(1);
  });

  it('a port already taken rejects (EADDRINUSE), as before the classroom mode', async () => {
    const r = await start();
    await expect(startRelay({ port: r.port, host: '127.0.0.1' })).rejects.toThrow(/EADDRINUSE/);
  });

  it('without a folder it still answers /pme-relay.json (serves: false) and nothing else', async () => {
    const r = await start();
    expect(((await (await fetch(`http://127.0.0.1:${r.port}/pme-relay.json`)).json()) as { serves: boolean }).serves).toBe(false);
    expect((await fetch(`http://127.0.0.1:${r.port}/`)).status).toBe(404);
  });

  it("remoteRoles 'viewer': another device may follow but not host or command (the code is on the projector)", async () => {
    const r = await start({ remoteRoles: 'viewer', isLocal: () => false });
    const c = await client(r, 'c', 'controller');
    const h = await client(r, 'h', 'host');
    const v = await client(r, 'v', 'viewer');
    await waitFor(() => c.closeCode !== null && h.closeCode !== null);
    expect([c.closeCode, h.closeCode]).toEqual([RELAY_CLOSE.forbiddenRole, RELAY_CLOSE.forbiddenRole]);
    expect(c.got.some((f) => f.relay === 'error' && f.code === 'forbidden')).toBe(true);
    expect(v.closeCode).toBeNull();
    expect(r.room(SESSION)?.peers).toBe(1);
    // nor the WebRTC signalling door (the classroom uses none)
    const sig = new WebSocket(`ws://127.0.0.1:${r.port}/signal?session=${SESSION}&peer=p1`);
    const code = await new Promise<number>((ok) => (sig.onclose = (e) => ok(e.code)));
    expect(code).toBe(RELAY_CLOSE.forbiddenRole);
  });

  it("this machine itself may still host and command (the instructor's laptop)", async () => {
    const r = await start({ remoteRoles: 'viewer', isLocal: () => true });
    const h = await client(r, 'h', 'host');
    const c = await client(r, 'c', 'controller');
    await sleep(30);
    expect([h.closeCode, c.closeCode]).toEqual([null, null]);
  });

  it('a session takes maxPeersPerRoom peers; the next is refused as full (a close code that does not retry)', async () => {
    const r = await start({ maxPeersPerRoom: 2 });
    await client(r, 'h', 'host'); // the host does not count
    const a = await client(r, 'a', 'viewer');
    const b = await client(r, 'b', 'viewer');
    const x = await client(r, 'x', 'viewer');
    await waitFor(() => x.closeCode !== null);
    expect(x.closeCode).toBe(RELAY_CLOSE.full);
    expect(x.got.find((f) => f.relay === 'error')).toMatchObject({ code: 'full', message: `session ${SESSION} is full (2)` });
    expect([a.closeCode, b.closeCode]).toEqual([null, null]);
  });

  it('the host hears how many peers follow, as they come and go', async () => {
    const r = await start();
    const h = await client(r, 'h', 'host');
    const v1 = await client(r, 'v1', 'viewer');
    await client(r, 'v2', 'viewer');
    await waitFor(() => h.got.some((f) => f.relay === 'peers' && f.peers === 2));
    v1.ws.close();
    await waitFor(() => (h.got.filter((f) => f.relay === 'peers').at(-1) as { peers: number }).peers === 1);
  });
});

describe('Stage 12: the addresses the QR code may use', () => {
  it("this Mac's hotspot first, then Wi-Fi or Ethernet, then the rest; never loopback or link-local", async () => {
    const { lanAddresses } = await import('../../relay/http.ts');
    const v4 = (address: string, internal = false) => ({ address, family: 'IPv4' as const, internal, netmask: '255.255.255.0', mac: '00:00:00:00:00:00', cidr: null });
    expect(lanAddresses({ lo0: [v4('127.0.0.1', true)], vmnet1: [v4('172.16.5.1')], en0: [v4('10.0.0.7'), v4('169.254.3.3')], bridge100: [v4('192.168.2.1')] } as never)).toEqual(['192.168.2.1', '10.0.0.7', '172.16.5.1']);
  });
});
```

- [ ] **Step 2: Run it red**

Run: `cd packages/controller && npx vitest run test/relay/s12-relay-classroom.test.ts`
Expected (prototype): 7 failed | 2 passed (9) — the http requests answer `Upgrade Required` / 426 (ws's own server), the roles, the `/signal` door and the limit are not enforced (`timed out waiting for condition`), `Cannot find module '../../relay/http.ts'`; the two passing ones are "this machine itself may still host and command" and "a port already taken rejects" (both true before too: the second pins the R50 I2 regression the first prototype had).

- [ ] **Step 3: Implement**

In `packages/controller/relay/README.md`, find:

```markdown
(default 10; an empty room is forgotten after this long), `--quiet`.
```

Replace with:

```markdown
(default 10; an empty room is forgotten after this long), `--quiet`; Stage 12: `--static DIR` (also serve the built
app on the same port), `--max-peers N` (default 60 per session), `--remote-roles viewer|all` (what another device may
be; default `viewer` with `--static`, else `all`).
```

In `packages/controller/relay/README.md`, find:

```markdown
and use **Open remote** / **Open viewer**, or type the session code on a phone at `/stage6a-remote.html`.
```

Replace with:

````markdown
and use **Open remote** / **Open viewer**, or type the session code on a phone at `/stage6a-remote.html`.

## The classroom (Stage 12: learners' phones)

```bash
(cd apps/demo && ../../node_modules/.bin/vite build --base ./ --outDir /tmp/pme-app)
npx -y pnpm@9.15.9 relay -- --port 8650 --static /tmp/pme-app
```

The instructor opens `http://127.0.0.1:8650/?relay#/` on the laptop; the top bar's **Phones** (or **Phones** in the
Monitor view's top strip) shows a QR code of `http://<laptop address>:8650/?join=<CODE>`: a phone opens the app from
the relay and follows the session over it, as a viewer. The showcase kit's **Start Classroom** does the same with its
bundled `server/relay.mjs`. `GET /pme-relay.json` answers `{relay:'pme', port, addresses, serves}` (the laptop's IPv4
addresses, its own hotspot first) for the QR code. A phone gets only the events a viewer uses (`VIEWER_EVENTS`); the
host's answer to a hello (its sticky replays) goes only to the peers awaiting a snapshot. Measured capacity and the
run sheet: `docs/plans/stage-12-mobile-learner.md`, `docs/showcase/CLASSROOM.md`.
````

In `packages/controller/relay/README.md`, find:

```markdown
| host | fanned out to every peer (they re-hello and resend pending commands) | dropped | to the peer that sent that command | to every peer | cached; sent to peers that said hello since their last snapshot |
```

Replace with:

```markdown
| host | fanned out to every peer (they re-hello and resend pending commands) | dropped | to the peer that sent that command | to every peer (a viewer: only `VIEWER_EVENTS`; a hello's replays: only to peers awaiting a snapshot; `mirror` frames: dropped) | cached; sent to peers that said hello since their last snapshot |
```

In `packages/controller/relay/README.md`, find:

```markdown
  reconnecting replaces its old socket.
```

Replace with:

```markdown
  reconnecting replaces its old socket.
- Stage 12: a session takes `--max-peers` non-host peers; the next is refused `full` (close code 4029, no retry). With
  `--remote-roles viewer`, a socket from another device saying `host` or `controller` is refused `forbidden` (close
  code 4003); this machine (loopback or one of its own addresses) may still host and command. The host gets a
  `{relay:'peers'}` frame whenever a peer comes or goes (the QR sheet counts the phones).
```

In `packages/controller/relay/README.md`, find:

```markdown
The session code is the only secret. Run the relay on a trusted LAN, or behind a TLS reverse proxy
```

Replace with:

```markdown
The session code is the only secret — and in a classroom it is on the projector, so there `--remote-roles viewer`
(the default with `--static`) lets other devices only follow: commands come from the instructor's laptop alone, and
the host refuses a viewer's command as well. Run the relay on a trusted LAN, or behind a TLS reverse proxy
```

In `packages/controller/relay/bin.ts`, find:

```ts
//   [--room-ttl-min 10] [--quiet]. Runs on Node ≥ 22.12 with type stripping (no build step).
import { parseArgs } from 'node:util';
```

Replace with:

```ts
//   [--room-ttl-min 10] [--quiet] [--static DIR] [--max-peers 60] [--remote-roles viewer|all].
//   Runs on Node ≥ 22.12 with type stripping (no build step).
// Stage 12 (the classroom): `--static DIR` also serves the built app on the same port, so learners' phones open
// http://<this laptop>:<port>/?join=CODE; with it, other devices may only FOLLOW (`--remote-roles viewer`, the default
// there) — the session code is on the projector.
import { parseArgs } from 'node:util';
import { lanAddresses } from './http.ts';
```

In `packages/controller/relay/bin.ts`, find:

```ts
  },
});
```

Replace with:

```ts
    static: { type: 'string' },
    'max-peers': { type: 'string', default: '60' },
    'remote-roles': { type: 'string' },
  },
});
const roles = values['remote-roles'] ?? (values.static ? 'viewer' : 'all');
if (roles !== 'viewer' && roles !== 'all') throw new Error('--remote-roles must be viewer or all');
```

In `packages/controller/relay/bin.ts`, find:

```ts
  roomTtlMs: Number(values['room-ttl-min']) * 60_000,
```

Replace with:

```ts
  roomTtlMs: Number(values['room-ttl-min']) * 60_000,
  maxPeersPerRoom: Number(values['max-peers']),
  remoteRoles: roles,
  ...(values.static ? { staticDir: values.static } : {}),
```

In `packages/controller/relay/bin.ts`, find:

```ts
console.log(`pme-relay ready on ws://${values.host}:${relay.port}/ (Ctrl+C to stop)`);
```

Replace with:

```ts
console.log(`pme-relay ready on ws://${values.host}:${relay.port}/ (Ctrl+C to stop)`);
if (values.static) {
  console.log(`  instructor (this computer): http://127.0.0.1:${relay.port}/?relay#/`);
  for (const a of lanAddresses()) console.log(`  learners' phones reach it at: http://${a}:${relay.port}/`);
}
```

Create `packages/controller/relay/http.ts`:

```ts
// Stage 12 (the classroom): the relay's HTTP side on the WebSocket's own port. Learners' phones cannot use the
// instructor's BroadcastChannel and a page served over https cannot open a ws:// socket (mixed content), so in a
// classroom the relay also serves the BUILT app (`--static DIR`) over plain http on the venue network: the phone opens
// one address, and the page's relay is that same address. `/pme-relay.json` tells the instructor's page the laptop's
// network addresses for the QR code (the page itself may run on 127.0.0.1). GET and HEAD only; path traversal refused.
import { createReadStream, realpathSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join } from 'node:path';

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};

/** Interfaces phones are most likely on, first: this Mac's own hotspot (macOS Internet Sharing: bridge*), then Wi-Fi or
 *  Ethernet (en*), then the rest (virtual machines, containers). */
const rank = (name: string) => (/^bridge/.test(name) ? 0 : /^en/.test(name) ? 1 : 2);

/** This machine's IPv4 addresses another device can reach, best first (no loopback, no link-local 169.254/16). */
export function lanAddresses(ifs: ReturnType<typeof networkInterfaces> = networkInterfaces()): string[] {
  const out: Array<{ address: string; r: number }> = [];
  for (const [name, list] of Object.entries(ifs)) for (const a of list ?? []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push({ address: a.address, r: rank(name) });
  return out.sort((a, b) => a.r - b.r).map((a) => a.address);
}

/** A socket from this machine itself (loopback, or one of its own interface addresses): the instructor's laptop. */
export function isLocalAddress(addr: string | undefined, ifs: ReturnType<typeof networkInterfaces> = networkInterfaces()): boolean {
  if (!addr) return false;
  const a = addr.replace(/^::ffff:/, '');
  if (a === '::1' || a.startsWith('127.')) return true;
  return Object.values(ifs).some((list) => (list ?? []).some((i) => i.address === a));
}

/** What `/pme-relay.json` answers (the instructor's page reads it for the QR code). */
export interface RelayInfo {
  relay: 'pme';
  port: number;
  /** IPv4 addresses of this machine on its networks, best first (en0-style Wi-Fi before bridges). */
  addresses: string[];
  /** The relay serves the app itself: a learner's address is http://<address>:<port>/. */
  serves: boolean;
}

export function httpHandler(o: { staticDir?: string; info: () => RelayInfo }): (req: IncomingMessage, res: ServerResponse) => void {
  const root = o.staticDir ? realpathSync(o.staticDir) : null;
  const text = (res: ServerResponse, code: number, body: string, head: boolean) => {
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-cache' });
    res.end(head ? undefined : body);
  };
  return (req, res) => {
    const head = req.method === 'HEAD';
    if (req.method !== 'GET' && !head) return text(res, 405, 'Only GET and HEAD\n', false);
    let path: string;
    try {
      path = decodeURIComponent((req.url ?? '/').replace(/[?#].*$/s, ''));
    } catch {
      return text(res, 400, 'Bad request\n', head);
    }
    if (path === '/pme-relay.json') {
      const body = JSON.stringify(o.info());
      // the instructor's page may come from another origin (a dev server); the answer holds no secret
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      return res.end(head ? undefined : body);
    }
    if (!root) return text(res, 404, 'pme-relay: no app here (start it with --static <built app folder>)\n', head);
    if (!path.startsWith('/') || /(^|\/)\.\.(\/|$)/.test(path) || /[\\\0]/.test(path)) return text(res, 403, 'Forbidden\n', head);
    let file = join(root, path);
    try {
      if (path.endsWith('/') || statSync(file).isDirectory()) file = join(file, 'index.html');
      const real = realpathSync(file);
      const st = statSync(real);
      if (!real.startsWith(root + '/') || !st.isFile()) return text(res, 404, 'Not found\n', head);
      res.writeHead(200, { 'Content-Type': MIME[extname(real).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      if (head) return res.end();
      createReadStream(real).on('error', () => res.destroy()).pipe(res);
    } catch {
      text(res, 404, 'Not found\n', head);
    }
  };
}
```

In `packages/controller/relay/server.ts`, find:

```ts
import type { IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
```

Replace with:

```ts
import { createServer, type IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { httpHandler, isLocalAddress, lanAddresses } from './http.ts';
```

In `packages/controller/relay/server.ts`, find:

```ts
  log?: (line: string) => void;
```

Replace with:

```ts
  log?: (line: string) => void;
  /** Stage 12: serve this folder (the built app) over http on the same port, for learners' phones. */
  staticDir?: string;
  /**
   * Stage 12: the most non-host peers one session takes (default 60) [ENG: twice the measured classroom of 30, see
   * docs/plans/stage-12-mobile-learner.md "Capacity"]. One more is refused (`full`, close 4029: it does not retry).
   */
  maxPeersPerRoom?: number;
  /**
   * Stage 12: the roles a socket from ANOTHER device may take. 'viewer' (classroom: the QR code shows the session code
   * to the room, so a phone may only follow; the host and a Remote run on the instructor's laptop) or 'all' (default).
   */
  remoteRoles?: 'viewer' | 'all';
  /** Stage 12 (tests): whether a socket's address is this machine (default: loopback or one of its own addresses). */
  isLocal?: (address: string | undefined) => boolean;
```

In `packages/controller/relay/server.ts`, find:

```ts
  const wss = new WebSocketServer({ port: opts.port ?? 8787, host: opts.host ?? '0.0.0.0', maxPayload: WIRE_LIMITS.maxBytes });
  await new Promise<void>((resolve, reject) => {
    wss.once('listening', resolve);
    wss.once('error', reject);
  });
```

Replace with:

```ts
  const maxPeers = opts.maxPeersPerRoom ?? 60;
  // Stage 12: one http server carries the WebSockets, `/pme-relay.json` and (with staticDir) the app itself
  const http = createServer(httpHandler({ ...(opts.staticDir ? { staticDir: opts.staticDir } : {}), info: () => ({ relay: 'pme', port, addresses: lanAddresses(), serves: !!opts.staticDir }) }));
  await new Promise<void>((resolve, reject) => {
    http.once('listening', resolve);
    http.once('error', reject); // a busy port rejects (the WebSocketServer is attached after: it re-threw this error)
    http.listen(opts.port ?? 8787, opts.host ?? '0.0.0.0');
  });
  const wss = new WebSocketServer({ server: http, maxPayload: WIRE_LIMITS.maxBytes });
```

In `packages/controller/relay/server.ts`, find:

```ts
  const onWire = (ws: WebSocket) => {
```

Replace with:

```ts
  /** Stage 12: the host hears how many peers follow (the instructor's QR panel counts the phones). */
  const tellHost = (room: Room) => {
    if (room.host) frame(room.host.ws, peersFrame(room));
  };
  const onWire = (ws: WebSocket, local: boolean) => {
```

In `packages/controller/relay/server.ts`, find:

```ts
        if (!room) return refuse(ws, RELAY_CLOSE.full, 'full', 'relay is full');
```

Replace with:

```ts
        if (!room) return refuse(ws, RELAY_CLOSE.full, 'full', 'relay is full');
        // Stage 12: another device follows; only this machine hosts or commands (the room has seen the code)
        if (!local && opts.remoteRoles === 'viewer' && m.role !== 'viewer') return refuse(ws, RELAY_CLOSE.forbiddenRole, 'forbidden', `${m.role} only from the instructor's computer`);
        if (m.role !== 'host' && room.peers.size >= maxPeers) return refuse(ws, RELAY_CLOSE.full, 'full', `session ${m.session} is full (${maxPeers})`);
```

In `packages/controller/relay/server.ts`, find:

```ts
          for (const p of room.peers) frame(p.ws, peersFrame(room));
```

Replace with:

```ts
          for (const p of room.peers) frame(p.ws, peersFrame(room));
          tellHost(room);
```

In `packages/controller/relay/server.ts`, find:

```ts
          frame(ws, peersFrame(room));
```

Replace with:

```ts
          frame(ws, peersFrame(room));
          tellHost(room);
```

In `packages/controller/relay/server.ts`, find:

```ts
        room.awaiting.delete(peer);
```

Replace with:

```ts
        room.awaiting.delete(peer);
        tellHost(room);
```

In `packages/controller/relay/server.ts`, find:

```ts
    if (path === '/signal') onSignal(ws, req);
    else onWire(ws);
```

Replace with:

```ts
    const local = (opts.isLocal ?? isLocalAddress)(req.socket.remoteAddress);
    // Stage 12: the classroom uses no WebRTC; with the code on the projector, another device gets no signalling either
    if (path === '/signal' && !local && opts.remoteRoles === 'viewer') return refuse(ws, RELAY_CLOSE.forbiddenRole, 'forbidden', "signalling only from the instructor's computer");
    if (path === '/signal') onSignal(ws, req);
    else onWire(ws, local);
```

In `packages/controller/relay/server.ts`, find:

```ts
  const port = (wss.address() as { port: number }).port;
```

Replace with:

```ts
  const port: number = (http.address() as { port: number }).port;
```

In `packages/controller/relay/server.ts`, find:

```ts
        wss.close(() => resolve());
```

Replace with:

```ts
        wss.close(() => http.close(() => resolve()));
```

In `packages/controller/src/transport/relay-frames.ts`, find:

```ts
export const RELAY_CLOSE = { badHello: 4001, badSession: 4002, hostExists: 4009, full: 4029 } as const;
```

Replace with:

```ts
export const RELAY_CLOSE = { badHello: 4001, badSession: 4002, forbiddenRole: 4003, hostExists: 4009, full: 4029 } as const; // Stage 12: 4003
```

- [ ] **Step 4: Run green**

Run: `cd packages/controller && npx vitest run test/relay && npx -y pnpm@9.15.9 --filter @pme/controller typecheck`
Expected: all relay files pass (prototype: 3 + the new file, 20 tests), typecheck clean.

- [ ] **Step 5: Commit and push**

```bash
git add packages/controller
git commit -m "feat(relay): Stage 12 classroom mode — serve the app and /pme-relay.json, phones only follow, 60 per session

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 2: A room of phones costs the Wi-Fi little — a viewer gets only what it uses; a hello's replays go to the peers awaiting

**Files:**
- Modify: `packages/controller/src/protocol.ts` (FU-11 a F2, b E3, d G1; Stage 10 T3), `packages/controller/relay/server.ts`,
  `packages/controller/test/relay/relay.test.ts`

**Interfaces:**
- Consumes: Task 1's `server.ts`.
- Produces: `VIEWER_EVENTS: ReadonlySet<WireEvent['type']>` exported from `protocol.ts` (Task 5 adds `'cockpit'` and
  `'style'` to it); the relay's welcome rule: a host event message with any event flagged `replay: true` (on the event,
  or a `commandApplied`'s `resolved.replay`) goes only to the peers awaiting a snapshot.

- [ ] **Step 1: Write the failing tests** (the first replaced test now sends a `state`, which every peer gets; the two
  new ones pin the rules)

In `packages/controller/test/relay/relay.test.ts`, find:

```ts
    host.send({ kind: 'event', body: [{ type: 'measurement', t: 1, values: {} }] });
```

Replace with:

```ts
    host.send({ kind: 'event', body: [{ type: 'state', t: 1, tick: 50, mode: 'manual', values: {}, control: {} }] });
```

In `packages/controller/test/relay/relay.test.ts`, find:

```ts
    expect(host.wire('event')).toEqual([]);
```

Replace with:

```ts
    expect(host.wire('event')).toEqual([]);
  });

  it('Stage 12: a viewer gets only the events a viewer uses; a controller gets them all', async () => {
    const host = await client('h', 'host');
    const c = await client('c', 'controller');
    const v = await client('v', 'viewer');
    host.send({ kind: 'event', body: [{ type: 'measurement', t: 1, values: {} }] });
    host.send({ kind: 'event', body: [{ type: 'measurement', t: 2, values: {} }, { type: 'state', t: 2, tick: 100, mode: 'manual', values: {}, control: {} }] });
    await waitFor(() => c.wire('event').length === 2 && v.wire('event').length === 1);
    await sleep(20);
    expect((v.wire('event')[0] as Extract<WireMessage, { kind: 'event' }>).body.map((e) => e.type)).toEqual(['state']);
    expect(v.wire('event').length).toBe(1); // the measurement-only message is not sent to the viewer at all
  });

  it("Stage 12: the host's answer to a hello (its sticky replays) goes to the peers waiting on a snapshot, not the room", async () => {
    const host = await client('h', 'host');
    const v1 = await client('v1', 'viewer');
    await waitFor(() => host.wire('hello').length === 1);
    host.send({ kind: 'snapshot', body: snap }); // v1 is synced: it waits for nothing
    await waitFor(() => v1.wire('snapshot').length === 1);
    const v2 = await client('v2', 'viewer');
    await waitFor(() => host.wire('hello').length === 2);
    const replay = { type: 'commandApplied' as const, commandId: 'k', tick: 9, resolved: { command: { id: 'k', issuedBy: 'i', type: 'time', action: 'scale', value: 8 }, replay: true } };
    host.send({ kind: 'event', body: [replay] });
    host.send({ kind: 'snapshot', body: { ...snap, tick: 900 } });
    await waitFor(() => v2.wire('snapshot').length === 1);
    await sleep(20);
    expect(v2.wire('event').length).toBe(1);
    expect(v1.wire('event')).toEqual([]);
  });

  it('Stage 12 (R50 M2): an event flagged `replay: true` itself (the style a welcome carries) marks the welcome too', async () => {
    const host = await client('h', 'host');
    const c1 = await client('c1', 'controller'); // controllers get every event: the routing alone is under test
    await waitFor(() => host.wire('hello').length === 1);
    host.send({ kind: 'snapshot', body: snap });
    await waitFor(() => c1.wire('snapshot').length === 1);
    const c2 = await client('c2', 'controller');
    await waitFor(() => host.wire('hello').length === 2);
    // Task 5 adds the `style` event to the protocol; the relay's rule is the flag, whatever the event
    host.send({ kind: 'event', body: [{ type: 'style', skin: 'philips-like', theme: '', replay: true } as never] });
    host.send({ kind: 'snapshot', body: { ...snap, tick: 900 } });
    await waitFor(() => c2.wire('snapshot').length === 1);
    await sleep(20);
    expect(c2.wire('event').length).toBe(1);
    expect(c1.wire('event')).toEqual([]);
```

- [ ] **Step 2: Run them red**

Run: `cd packages/controller && npx vitest run test/relay/relay.test.ts`
Expected (prototype): 3 failed | 7 passed (10) — the viewer gets the measurement-only message (`timed out waiting for condition`); v1 gets the replay sent for v2, and c1 the style welcome sent for c2 (`expected [ { v: 1, session: 'RQY234', …(5) } ] to deeply equal []`).

- [ ] **Step 3: Implement**

In `packages/controller/relay/server.ts`, find:

```ts
import { SESSION_CODE_RE, type Role, type WireMessage } from '../src/protocol.ts';
```

Replace with:

```ts
import { SESSION_CODE_RE, VIEWER_EVENTS, type Role, type WireMessage } from '../src/protocol.ts';
```

In `packages/controller/relay/server.ts`, find:

```ts
        for (const p of room.peers) raw(p.ws, data);
```

Replace with:

```ts
        {
          // Stage 12: the host's answer to a hello (its sticky replays) is for the peers waiting on a snapshot — sent to
          // the whole room, 30 phones joining (or re-syncing after a fast-forward) made 30 × 30 copies of it
          // (a welcome event of the host's own — its style — carries `replay: true` itself)
          const welcome = m.body.some((e) => (e as { replay?: unknown }).replay === true || (e.type === 'commandApplied' && (e.resolved as { replay?: unknown } | undefined)?.replay === true));
          let lean: string | null | undefined; // the viewers' copy (VIEWER_EVENTS only), made once per message
          for (const p of welcome ? room.awaiting : room.peers) {
            if (p.role !== 'viewer') {
              raw(p.ws, data);
              continue;
            }
            if (lean === undefined) {
              const body = m.body.filter((e) => VIEWER_EVENTS.has(e.type));
              lean = body.length === 0 ? null : body.length === m.body.length ? data : JSON.stringify({ ...m, body });
            }
            if (lean !== null) raw(p.ws, lean);
          }
        }
```

In `packages/controller/src/protocol.ts`, find:

```ts
export type WireEvent = EngineEvent | ExtraEvent;
```

Replace with:

```ts
export type WireEvent = EngineEvent | ExtraEvent;

/**
 * Stage 12: the events a VIEWER uses — it runs its own engine from the host's snapshot, so it needs the clock anchor
 * (`state`), the beats it checks its own against, the commands it mirrors, the host's timeline and fast-forward
 * (ViewerSync; the follower page's liveness and pause read the same) and the scenario's state (small, 1 Hz at most). The
 * relay sends a viewer on the network only these (at ×8 the rest — measurements, alarm and organ status its own engine
 * computes — was 4/5 of a phone's traffic).
 */
export const VIEWER_EVENTS: ReadonlySet<WireEvent['type']> = new Set<WireEvent['type']>(['state', 'beat', 'commandApplied', 'timeline', 'fastForward', 'scenario']);
```

- [ ] **Step 4: Run green** — `npx vitest run test/relay` (all, including FU-11's `fu11-relay-mirror`: its sentinel is a
  `scenario` event, which a viewer still gets) and `npx -y pnpm@9.15.9 --filter @pme/controller typecheck`.

- [ ] **Step 5: Commit and push**

```bash
git add packages/controller
git commit -m "feat(relay): Stage 12 — viewers get VIEWER_EVENTS only; a hello's replays go to the peers awaiting a snapshot

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 3: The QR payload — one short learner address, and where it points

**Files:**
- Create: `apps/demo/src/app/classroom.ts`, `apps/demo/src/app/classroom.test.ts`
- Create: `LICENSES/qrcodegen-MIT.txt` (R50 I1: the MIT text of the library `qr.ts` is adapted from)
- Modify: `NOTICES.md` (N-014), `apps/demo/src/app/qr.ts` (Stage 9; its header comment only: "adapted from", R50 I1)

**Interfaces:**
- Produces (`classroom.ts`): `joinCode(loc): string | null`; `relayOf(loc): string | null` (`?relay=<url>` as given;
  `?relay` alone or a `?join=` page → `ws(s)://<page host>/`); `learnerUrl(code, origin, pathname, relay): string`;
  `qrTarget(code, loc, relay, info): { ok: true; url; origin; others: string[] } | { ok: false; why }`;
  `relayInfo(relay, ms?, fetchFn?): Promise<RelayInfo | null>`; types `PageLocation`, `RelayInfo`, `QrTarget`; `LOOPBACK`.

- [ ] **Step 1: Write the failing test**

Create `apps/demo/src/app/classroom.test.ts`:

```ts
// Stage 12: the QR payload and where a learner's phone finds the relay (pure; the QR panel and the learner page read these).
import { describe, expect, it } from 'vitest';
import { joinCode, learnerUrl, qrTarget, relayInfo, relayOf, type PageLocation, type RelayInfo } from './classroom.ts';
import { encodeQr } from './qr.ts';

const at = (url: string): PageLocation => {
  const u = new URL(url);
  return { protocol: u.protocol, host: u.host, hostname: u.hostname, origin: u.origin, pathname: u.pathname, search: u.search };
};
const info = (o: Partial<RelayInfo> = {}): RelayInfo => ({ relay: 'pme', port: 8642, addresses: ['192.168.1.20'], serves: true, ...o });

describe('Stage 12: the learner address (QR payload)', () => {
  it('is ONE short address, the session code in it and the relay the page\'s own host', () => {
    const url = learnerUrl('AB2CD3', 'http://192.168.1.20:8642', '/', null);
    expect(url).toBe('http://192.168.1.20:8642/?join=AB2CD3');
    expect(joinCode(at(url))).toBe('AB2CD3');
    expect(relayOf(at(url))).toBe('ws://192.168.1.20:8642/');
  });
  it('names the relay only when it is elsewhere (a dev server beside the relay)', () => {
    expect(learnerUrl('AB2CD3', 'http://192.168.1.20:5173', '/', 'ws://192.168.1.20:8787/')).toBe('http://192.168.1.20:5173/?join=AB2CD3&relay=ws%3A%2F%2F192.168.1.20%3A8787%2F');
    expect(learnerUrl('AB2CD3', 'http://192.168.1.20:8787', '/', 'ws://192.168.1.20:8787/')).toBe('http://192.168.1.20:8787/?join=AB2CD3');
    expect(relayOf(at('http://192.168.1.20:5173/?join=AB2CD3&relay=ws%3A%2F%2F192.168.1.20%3A8787%2F'))).toBe('ws://192.168.1.20:8787/');
  });
  it('the longest LAN address fits a version-3 symbol (29 modules: large modules, scannable from the back of a room)', () => {
    const url = learnerUrl('AB2CD3', 'http://192.168.100.200:65535', '/', null);
    expect(url.length).toBe(41); // the longest IPv4 address and port there is
    expect(encodeQr(url).length).toBe(29);
  });
  it('a bad or missing code is no join; `?relay` alone means this host; no relay at all is null', () => {
    expect(joinCode(at('http://h/?join=ab2-cd3'))).toBe('AB2CD3');
    expect(joinCode(at('http://h/?join=AB2CD'))).toBeNull();
    expect(relayOf(at('http://127.0.0.1:8642/?relay#/'))).toBe('ws://127.0.0.1:8642/');
    expect(relayOf(at('https://example.org/app/?join=AB2CD3'))).toBe('wss://example.org/');
    expect(relayOf(at('http://127.0.0.1:5173/'))).toBeNull();
  });
});

describe('Stage 12: where the QR code sends phones', () => {
  it('the relay serves the app: its first network address, even when the instructor\'s page is on 127.0.0.1', () => {
    expect(qrTarget('AB2CD3', at('http://127.0.0.1:8642/?relay'), 'ws://127.0.0.1:8642/', info())).toEqual({ ok: true, url: 'http://192.168.1.20:8642/?join=AB2CD3', origin: 'http://192.168.1.20:8642', others: [] });
    // the relay lists the hotspot first (relay/http.ts); the computer's other networks are offered under the code
    expect(qrTarget('AB2CD3', at('http://127.0.0.1:8642/?relay'), 'ws://127.0.0.1:8642/', info({ addresses: ['192.168.2.1', '10.0.0.7'] }))).toMatchObject({ url: 'http://192.168.2.1:8642/?join=AB2CD3', others: ['http://10.0.0.7:8642/?join=AB2CD3'] });
  });
  it('says why when phones cannot join: no relay, a relay that does not answer, no network, a loopback-only page, https', () => {
    const local = at('http://127.0.0.1:5173/');
    expect(qrTarget('AB2CD3', local, null, null)).toMatchObject({ ok: false, why: expect.stringMatching(/^No relay/) });
    expect(qrTarget('AB2CD3', local, 'ws://127.0.0.1:8787/', null)).toMatchObject({ ok: false, why: expect.stringMatching(/does not answer/) });
    expect(qrTarget('AB2CD3', local, 'ws://127.0.0.1:8787/', info({ addresses: [] }))).toMatchObject({ ok: false, why: expect.stringMatching(/on no network/) });
    expect(qrTarget('AB2CD3', local, 'ws://127.0.0.1:8787/', info({ serves: false }))).toMatchObject({ ok: false, why: expect.stringMatching(/this computer only/) });
    expect(qrTarget('AB2CD3', at('https://samhv-dev.github.io/patient-monitor-engine/'), 'ws://192.168.1.20:8787/', info({ serves: false }))).toMatchObject({ ok: false, why: expect.stringMatching(/https/) });
  });
  it('a page another device can reach, with the relay elsewhere: this page plus the relay', () => {
    expect(qrTarget('AB2CD3', at('http://192.168.1.20:5173/'), 'ws://192.168.1.20:8787/', info({ serves: false }))).toMatchObject({ ok: true, url: 'http://192.168.1.20:5173/?join=AB2CD3&relay=ws%3A%2F%2F192.168.1.20%3A8787%2F' });
  });
  it('relayInfo reads /pme-relay.json next to the relay, and is null for anything else or no answer', async () => {
    const seen: string[] = [];
    const ok = (async (u: string) => (seen.push(u), { json: async () => info() })) as unknown as typeof fetch;
    expect(await relayInfo('ws://127.0.0.1:8642/', 100, ok)).toEqual(info());
    expect(seen).toEqual(['http://127.0.0.1:8642/pme-relay.json']);
    expect(await relayInfo('ws://x/', 100, (async () => ({ json: async () => ({ hello: 1 }) })) as unknown as typeof fetch)).toBeNull();
    expect(await relayInfo('ws://x/', 100, (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it red** — `cd apps/demo && npx vitest run src/app/classroom.test.ts` → `Error: Cannot find module './classroom.ts'` (no tests run).

- [ ] **Step 3: Implement**

Create `LICENSES/qrcodegen-MIT.txt`:

```text
QR Code generator library (TypeScript)

Copyright (c) Project Nayuki. (MIT License)
https://www.nayuki.io/page/qr-code-generator-library

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:
- The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
- The Software is provided "as is", without warranty of any kind, express or
  implied, including but not limited to the warranties of merchantability,
  fitness for a particular purpose and noninfringement. In no event shall the
  authors or copyright holders be liable for any claim, damages or other
  liability, whether in an action of contract, tort or otherwise, arising from,
  out of or in connection with the Software or the use or other dealings in the
  Software.
```

In `NOTICES.md`, find:

```markdown
| N-013 | fast-deep-equal 3.1.3, json-schema-traverse 1.0.0, require-from-string 2.0.2 (ajv runtime dependencies) | https://github.com/epoberezkin/fast-deep-equal · https://github.com/epoberezkin/json-schema-traverse · https://github.com/floatdrop/require-from-string | MIT | Used inside ajv; bundled with it where reachable, unmodified | 2026-09-25 |
```

Replace with:

```markdown
| N-013 | fast-deep-equal 3.1.3, json-schema-traverse 1.0.0, require-from-string 2.0.2 (ajv runtime dependencies) | https://github.com/epoberezkin/fast-deep-equal · https://github.com/epoberezkin/json-schema-traverse · https://github.com/floatdrop/require-from-string | MIT | Used inside ajv; bundled with it where reachable, unmodified | 2026-09-25 |
| N-014 | Project Nayuki's QR Code generator library (TypeScript), adapted as `apps/demo/src/app/qr.ts` (Stage 9 pairing; Stage 12 learners' phones) | https://www.nayuki.io/page/qr-code-generator-library (https://github.com/nayuki/QR-Code-generator) | MIT, Copyright (c) Project Nayuki (text in `LICENSES/qrcodegen-MIT.txt`) | Adapted, not verbatim: byte mode, error-correction level M, versions 1–10, the capacity formula, Reed–Solomon arithmetic and codeword placement following the library; no runtime dependency. "QR Code" is a registered trademark of DENSO WAVE INCORPORATED | 2026-10-11 |
```

Create `apps/demo/src/app/classroom.ts`:

```ts
// Stage 12 (the classroom): learners' phones follow the instructor's session over the relay (`pme-relay --static`),
// which serves this app on the laptop's network address. No DOM here: the QR panel, the learner page and their tests
// read these. The QR carries ONE short address, `http://<laptop>:<port>/?join=<CODE>` — the page's relay is the page's
// own host — so the symbol stays small enough to scan from the back of a lecture room.
import { normalizeSessionCode } from '@pme/controller';

export interface PageLocation {
  protocol: string;
  host: string;
  hostname: string;
  origin: string;
  pathname: string;
  search: string;
}

/** What `/pme-relay.json` answers (packages/controller/relay/http.ts `RelayInfo`). */
export interface RelayInfo {
  relay: 'pme';
  port: number;
  addresses: string[];
  serves: boolean;
}

/** Loopback hosts: an address on them works on this computer only. */
export const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?|0\.0\.0\.0)$/i;

/** The session a learner's phone joins (`?join=CODE`), or null. */
export const joinCode = (loc: Pick<PageLocation, 'search'>): string | null => normalizeSessionCode(new URLSearchParams(loc.search).get('join') ?? '');

/**
 * The relay this page talks to: `?relay=ws://…` as given; `?relay` with no value, or a learner page (`?join=`) without
 * one, means the page's own host (the relay serves the app). Null: no relay (same-browser windows only).
 */
export function relayOf(loc: PageLocation): string | null {
  const q = new URLSearchParams(loc.search);
  const given = q.get('relay');
  if (given) return given;
  if (given === null && !q.has('join')) return null;
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/`;
}

/** The learner's address for the QR code: `<origin><path>?join=CODE`, plus the relay only when it is elsewhere. */
export function learnerUrl(code: string, origin: string, pathname: string, relay: string | null): string {
  const own = `${origin.replace(/^http/, 'ws')}/`;
  return `${origin}${pathname}?join=${code}${relay && relay !== own ? `&relay=${encodeURIComponent(relay)}` : ''}`;
}

/** `others`: the learner address on this computer's other networks (shown under the code, for a phone the QR fails). */
export type QrTarget = { ok: true; url: string; origin: string; others: string[] } | { ok: false; why: string };

/**
 * Where phones open the learner monitor: the relay's network address when it serves the app (the instructor's page
 * may itself run on 127.0.0.1), else this page's own address if another device can reach it. A page on https cannot
 * hand phones a ws:// relay (browsers block it), and a loopback-only page is unreachable: both say why instead.
 */
export function qrTarget(code: string, loc: PageLocation, relay: string | null, info: RelayInfo | null): QrTarget {
  if (!relay) return { ok: false, why: 'No relay is running: learners can follow on a second screen in this browser only.' };
  if (!info) return { ok: false, why: 'The relay does not answer: start the classroom (Start Classroom) and reload this page.' };
  if (info.serves) {
    const a = info.addresses[0];
    if (!a) return { ok: false, why: 'This computer is on no network: join the venue Wi-Fi or turn on the hotspot, then reload this page.' };
    const origin = `http://${a}:${info.port}`;
    return { ok: true, url: learnerUrl(code, origin, '/', null), origin, others: info.addresses.slice(1).map((x) => learnerUrl(code, `http://${x}:${info.port}`, '/', null)) };
  }
  if (LOOPBACK.test(loc.hostname)) return { ok: false, why: 'This address works on this computer only: start the relay with --static (Start Classroom).' };
  if (loc.protocol === 'https:' && relay.startsWith('ws:')) return { ok: false, why: 'A secure (https) page cannot send phones to a ws:// relay.' };
  return { ok: true, url: learnerUrl(code, loc.origin, loc.pathname, relay), origin: loc.origin, others: [] };
}

/** The relay's own description, from its http side; null when it does not answer within `ms`. */
export async function relayInfo(relay: string, ms = 2000, fetchFn: typeof fetch = fetch): Promise<RelayInfo | null> {
  const url = `${relay.replace(/^ws/, 'http').replace(/\/?$/, '/')}pme-relay.json`;
  try {
    const r = await fetchFn(url, { signal: AbortSignal.timeout(ms), cache: 'no-store' });
    const j = (await r.json()) as Partial<RelayInfo>;
    return j.relay === 'pme' && typeof j.port === 'number' && Array.isArray(j.addresses) ? (j as RelayInfo) : null;
  } catch {
    return null;
  }
}
```

In `apps/demo/src/app/qr.ts`, find:

```ts
// A small QR Code encoder for the Remote pairing link (research/13 §4.4: "pairing by code and QR"; no dependency).
// Byte mode, error-correction level M, versions 1–10 (up to 213 bytes: a pairing URL is ≈ 60). Structure follows
// ISO/IEC 18004 as laid out in Project Nayuki's public description of the algorithm; the code is written here, not
// copied. Mask choice uses penalty rules 1, 2 and 4 (rule 3 is optional for a valid symbol).
```

Replace with:

```ts
// A small QR Code encoder for the Remote pairing link (research/13 §4.4: "pairing by code and QR"; no dependency) and,
// since Stage 12, the learners' phones. Byte mode, error-correction level M, versions 1–10 (up to 213 bytes: a pairing
// URL is ≈ 60). ADAPTED from Project Nayuki's QR Code generator library (TypeScript), Copyright (c) Project Nayuki, MIT
// License, https://www.nayuki.io/page/qr-code-generator-library — the capacity formula, the Reed–Solomon arithmetic and
// the codeword placement follow it closely (Stage 12 R50 I1); trimmed to the cases above. NOTICES N-014; the licence
// text is LICENSES/qrcodegen-MIT.txt. Mask choice uses penalty rules 1, 2 and 4 (rule 3 is optional for a valid symbol).
```

- [ ] **Step 4: Run green** — the same command (8 tests), `node --experimental-strip-types scripts/check-notices.ts .`
  (OK) and `npx -y pnpm@9.15.9 --filter @pme/demo typecheck`.

- [ ] **Step 5: Commit and push**

```bash
git add apps/demo/src/app/classroom.ts apps/demo/src/app/classroom.test.ts apps/demo/src/app/qr.ts NOTICES.md LICENSES/qrcodegen-MIT.txt
git commit -m "feat(app): Stage 12 — the learner address for the QR code (?join=CODE on the relay's host); N-014: qr.ts is adapted from Nayuki's MIT library

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 4: The monitor upright — the renderer's `portrait` layout

**Files:**
- Create: `packages/renderer/test/s12-portrait.test.ts`
- Modify: `packages/renderer/src/device-ui.ts` (FU-11 b E2), `packages/renderer/src/mount.ts` (FU-11 a B3, b E2 H4,
  d G2; Stage 10 T1 T2)

**Interfaces:**
- Produces: `MountOptions.portrait?: boolean`; `new DeviceUI(doc, waveArea, skin, page?, portrait = false)`; the tiles
  element gets class `pme-portrait` (CSS rules in `flashCss`).

- [ ] **Step 1: Write the failing test**

Create `packages/renderer/test/s12-portrait.test.ts`:

```ts
// @vitest-environment happy-dom
// Stage 12: a learner's phone held upright — the skin's tiles flow into one 3-column grid under the waveforms, in the
// skin's order, with every tile kept; the landscape layout (tile columns beside the waveforms) is unchanged.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

describe('Stage 12: portrait tiles', () => {
  it('portrait: one grid of three columns, the column wrappers transparent to it, every tile in the skin order', () => {
    const r = resolveSkin('saadat-like');
    const ui = new DeviceUI(document, document.createElement('div'), r, undefined, true);
    expect(ui.tiles.className).toBe('pme-portrait');
    expect(ui.tiles.style.display).toBe('grid');
    expect(ui.tiles.style.gridTemplateColumns.replace(/\s/g, '')).toBe('repeat(3,minmax(0,1fr))');
    for (const c of ui.tiles.children) expect((c as HTMLElement).style.display).toBe('contents');
    const order = [...ui.tiles.querySelectorAll('.pme-stile')].map((e) => (e as HTMLElement).dataset.param);
    expect(order).toEqual(r.skin.layout.tiles.flat().map((t) => t.param));
  });
  it('landscape (the default): tile columns 180 px wide beside the waveforms, as before', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'));
    expect(ui.tiles.className).toBe('');
    expect(ui.tiles.style.display).toBe('flex');
    for (const c of ui.tiles.children) expect((c as HTMLElement).style.width).toBe('180px');
  });
  it('a skin switch keeps the portrait grid', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'), undefined, true);
    ui.setSkin(resolveSkin('philips-like'));
    for (const c of ui.tiles.children) expect((c as HTMLElement).style.display).toBe('contents');
  });
});
```

- [ ] **Step 2: Run it red** — `cd packages/renderer && npx vitest run test/s12-portrait.test.ts` → 2 failed | 1 passed (3) — `expected '' to be 'pme-portrait'`, `expected '' to be 'contents'` (the landscape test passes before and after).

- [ ] **Step 3: Implement**

In `packages/renderer/src/device-ui.ts`, find:

```ts
    '.pme-watermark{position:absolute;left:30%;top:2%;font-size:64px;font-weight:700;opacity:.25;pointer-events:none}',
```

Replace with:

```ts
    '.pme-watermark{position:absolute;left:30%;top:2%;font-size:64px;font-weight:700;opacity:.25;pointer-events:none}',
    // Stage 12: portrait tiles (a phone): a third of the width each, numerics as large as that leaves
    '.pme-portrait .pme-stile{padding:3px 6px;border-left:1px solid var(--pme-divider);min-width:0}',
    '.pme-portrait .pme-stile .h{font-size:12px;gap:3px}',
    '.pme-portrait .pme-stile .lim{display:none}',
    '.pme-portrait .pme-stile .v{font-size:min(9vw,36px);white-space:nowrap}',
    '.pme-portrait .pme-stile.large .v{font-size:min(11vw,44px)}',
    '.pme-portrait .pme-stile .s{font-size:12px;white-space:nowrap;overflow:hidden;min-height:14px}',
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
  constructor(doc: Document, waveArea: HTMLElement, r: ResolvedSkin, page?: string) {
    this.r = r;
```

Replace with:

```ts
  /** Stage 12: the tiles in a grid UNDER the waveforms (a phone held upright), not in columns beside them. */
  private readonly portrait: boolean;

  constructor(doc: Document, waveArea: HTMLElement, r: ResolvedSkin, page?: string, portrait = false) {
    this.r = r;
    this.portrait = portrait;
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
    this.tiles.style.cssText = 'display:flex;flex:none;overflow:hidden;';
```

Replace with:

```ts
    // Stage 12: portrait — the skin's tile columns flow into a 3-column grid, in the skin's order
    this.tiles.style.cssText = portrait ? 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));flex:none;overflow:hidden;' : 'display:flex;flex:none;overflow:hidden;';
    if (portrait) this.tiles.className = 'pme-portrait';
```

In `packages/renderer/src/device-ui.ts`, find:

```ts
      c.style.cssText = `width:180px;border-left:1px solid ${r.skin.chrome.divider};`;
```

Replace with:

```ts
      c.style.cssText = this.portrait ? 'display:contents' : `width:180px;border-left:1px solid ${r.skin.chrome.divider};`; // Stage 12
```

In `packages/renderer/src/mount.ts`, find:

```ts
  audioSilence?: 'engine' | 'window';
```

Replace with:

```ts
  audioSilence?: 'engine' | 'window';
  /**
   * Stage 12 (a learner's phone held upright): the waveforms over the whole width and the skin's tiles in a grid under
   * them, instead of tile columns beside the waveforms. Needs `skin`.
   */
  portrait?: boolean;
```

In `packages/renderer/src/mount.ts`, find:

```ts
  root.style.cssText = `display:flex;flex:1;min-height:0;width:100%;background:${r?.render.background ?? '#000'};overflow:hidden;`;
```

Replace with:

```ts
  root.style.cssText = `display:flex;flex:1;min-height:0;width:100%;background:${r?.render.background ?? '#000'};overflow:hidden;${opts.portrait ? 'flex-direction:column;' : ''}`; // Stage 12
```

In `packages/renderer/src/mount.ts`, find:

```ts
  const ui = r ? new DeviceUI(doc, wrap, r, page) : null; // Stage 4b
```

Replace with:

```ts
  const ui = r ? new DeviceUI(doc, wrap, r, page, opts.portrait) : null; // Stage 4b; Stage 12: portrait
```

- [ ] **Step 4: Run green** — the same file (3 tests), `npx vitest run test/fu5-tiles.test.ts test/neuro-tiles.test.ts`
  (unchanged landscape tiles) and `npx -y pnpm@9.15.9 --filter @pme/renderer typecheck`.

- [ ] **Step 5: Commit and push**

```bash
git add packages/renderer
git commit -m "feat(renderer): Stage 12 — portrait layout (tiles in a 3-column grid under full-width waveforms)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 5: The host says when the Ventilator view drives — the `cockpit` event; a viewer can start again on request

**Files:**
- Create: `packages/controller/test/session/s12-cockpit.test.ts`
- Modify: `packages/controller/src/protocol.ts`, `packages/controller/src/session/host-session.ts` (FU-11 a A3 C2, b E3,
  d G1; Stage 10 T1 T3), `packages/controller/src/session/viewer-sync.ts` (FU-11 b E3; Stage 10 T1 T3)

**Interfaces:**
- Consumes: Task 2's `VIEWER_EVENTS`.
- Produces: wire event `{ type: 'cockpit'; t: SimSeconds; tick: Tick }` (in `VIEWER_EVENTS`), sent to `websocket` and
  `webrtc` transports only, only when one exists, regardless of FU-11's viewer window (R50 M1); wire event
  `{ type: 'style'; skin: string; theme: string; replay?: true }` (in `VIEWER_EVENTS`; owner ruling Q4, R50 I3: Task 7
  sends it, Task 6 wears it); `COCKPIT_EVENT_MS = 1000` exported from `host-session.ts`; `ViewerSync.resync(): void`
  (a fresh hello and snapshot, the anchor dropped).

- [ ] **Step 1: Write the failing test**

Create `packages/controller/test/session/s12-cockpit.test.ts`:

```ts
// Stage 12: while the Ventilator view drives the patient, its frames still reach only same-browser viewers (FU-11 R50
// F3); every other transport gets a `cockpit` event at most once a second instead, so a phone on the relay knows it
// cannot follow (it holds) — also to a phone that joined long before (no viewer hello lately: R50 M1), never to the panel.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { COCKPIT_EVENT_MS, HostSession } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type WireEvent, type WireMessage } from '../../src/protocol.ts';
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
  /** A message from the network (a phone's hello). */
  receive(m: WireMessage): void {
    this.deliver(m);
  }
}

const S = 'CKP234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());
const events = (ms: WireMessage[]): WireEvent[] => ms.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body);

describe('Stage 12: the cockpit event', () => {
  it('once a second on the network (never the panel), with or without a recent viewer hello; the frames themselves never', async () => {
    const e = createEngine({ seed: 3 });
    let wall = 0;
    hs = new HostSession({ session: S, target: { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined }, stateIntervalMs: 0, wallNow: () => wall });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const panel = collect(hub.connect());
    const socket = new FakeSocket();
    hs.addTransport(socket);
    const frame = (id: string) => ({ id, issuedBy: 'vent-link', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } }) as never;
    hs.mirror(frame('a'), e.dispatch(frame('a')));
    expect(events(socket.sent).filter((x) => x.type === 'cockpit')).toHaveLength(1); // a phone that said hello long ago holds too
    socket.receive(createStamper(S, 'phone-1')({ kind: 'hello', role: 'viewer' }));
    await waitFor(() => socket.sent.some((m) => m.kind === 'snapshot'));
    wall += COCKPIT_EVENT_MS; // a second after the first notice
    for (let i = 0; i < 100; i++) {
      wall += 20; // 50 frames a second for 2 s
      hs.mirror(frame(`f${i}`), e.dispatch(frame(`f${i}`)));
    }
    await sleep(10);
    const notes = events(socket.sent).filter((x) => x.type === 'cockpit');
    expect(notes.length).toBe(1 + Math.floor((100 * 20) / COCKPIT_EVENT_MS)); // once a second
    expect(notes[0]).toMatchObject({ type: 'cockpit', tick: expect.any(Number) });
    expect(events(socket.sent).some((x) => x.type === 'commandApplied' && (x.resolved as { mirror?: boolean }).mirror)).toBe(false);
    expect(events(panel).some((x) => x.type === 'cockpit')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it red** — `cd packages/controller && npx vitest run test/session/s12-cockpit.test.ts` → 1 failed — `expected [] to have a length of 1 but got +0` (no `cockpit` event).

- [ ] **Step 3: Implement**

In `packages/controller/src/protocol.ts`, find:

```ts
  | { type: 'fastForward'; t: SimSeconds; tick: Tick; phase: 'start' | 'end'; fromT: SimSeconds; toT: SimSeconds; wallMs?: number; stopped?: string; alarms?: FastForwardAlarm[] };
```

Replace with:

```ts
  | { type: 'fastForward'; t: SimSeconds; tick: Tick; phase: 'start' | 'end'; fromT: SimSeconds; toT: SimSeconds; wallMs?: number; stopped?: string; alarms?: FastForwardAlarm[] }
  /**
   * Stage 12: the host's Ventilator view drives the patient (its frames reach same-browser viewers only, FU-11 R50 F3):
   * sent at most once a second to every other transport while it does, so a phone on the relay knows it cannot follow.
   */
  | { type: 'cockpit'; t: SimSeconds; tick: Tick }
  /**
   * Stage 12 (owner ruling Q4): the instructor's monitor style, for a phone on the relay (the second screen has its own
   * same-browser style channel, FU-11 G2). Sent with every answer to a hello (`replay: true`: the relay routes it as the
   * welcome) and at every change. Presentation only.
   */
  | { type: 'style'; skin: string; theme: string; replay?: true };
```

In `packages/controller/src/protocol.ts`, find:

```ts
 * (ViewerSync; the follower page's liveness and pause read the same) and the scenario's state (small, 1 Hz at most). The
 * relay sends a viewer on the network only these (at ×8 the rest — measurements, alarm and organ status its own engine
 * computes — was 4/5 of a phone's traffic).
 */
export const VIEWER_EVENTS: ReadonlySet<WireEvent['type']> = new Set<WireEvent['type']>(['state', 'beat', 'commandApplied', 'timeline', 'fastForward', 'scenario']);
```

Replace with:

```ts
 * (ViewerSync; the follower page's liveness and pause read the same), the scenario's state (small, 1 Hz at most), the
 * Ventilator view's `cockpit` notice and the instructor's monitor `style` (R50 I3). The relay sends a viewer on the
 * network only these (at ×8 the rest — measurements, alarm and organ status its own engine computes — was 4/5 of a
 * phone's traffic).
 */
export const VIEWER_EVENTS: ReadonlySet<WireEvent['type']> = new Set<WireEvent['type']>(['state', 'beat', 'commandApplied', 'timeline', 'fastForward', 'scenario', 'cockpit', 'style']);
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
const VIEWER_TTL_MS = 600_000;
```

Replace with:

```ts
const VIEWER_TTL_MS = 600_000;
/** Stage 12: while the Ventilator view drives the patient, a `cockpit` event goes to the network at most this often [ENG]. */
export const COCKPIT_EVENT_MS = 1000;
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
  private viewerSeenAt = -Infinity; // FU-11 (K2): wall ms of the last viewer hello
```

Replace with:

```ts
  private viewerSeenAt = -Infinity; // FU-11 (K2): wall ms of the last viewer hello
  private cockpitSaidAt = -Infinity; // Stage 12: wall ms of the last `cockpit` event
```

In `packages/controller/src/session/host-session.ts`, find:

```ts
    if (!result.accepted || this.ff || this.now() - this.viewerSeenAt > VIEWER_TTL_MS) return; // Stage 10: a viewer waits out a fast-forward
    const m = this.stamp({ kind: 'event', body: [{ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: { ...cmd, atTick: result.tick }, mirror: true } satisfies AppliedResolution }] });
    for (const t of this.transports.keys()) if (t.kind === 'broadcastChannel') t.send(m);
```

Replace with:

```ts
    if (!result.accepted || this.ff) return; // Stage 10: a viewer waits out a fast-forward
    this.cockpitNotice(result.tick); // Stage 12: whether or not a viewer said hello lately (a phone that joined long ago)
    if (this.now() - this.viewerSeenAt > VIEWER_TTL_MS) return;
    const m = this.stamp({ kind: 'event', body: [{ type: 'commandApplied', commandId: cmd.id, tick: result.tick, resolved: { command: { ...cmd, atTick: result.tick }, mirror: true } satisfies AppliedResolution }] });
    for (const t of this.transports.keys()) if (t.kind === 'broadcastChannel') t.send(m);
  }

  /** Stage 12: a viewer on the network gets no frames — it is told the cockpit drives (once a second), and holds. */
  private cockpitNotice(tick: Tick): void {
    const now = this.now();
    if (now - this.cockpitSaidAt < COCKPIT_EVENT_MS) return;
    const net = [...this.transports.keys()].filter((t) => t.kind === 'websocket' || t.kind === 'webrtc');
    if (net.length === 0) return; // nothing stamped for nobody (R50 M1)
    this.cockpitSaidAt = now;
    const c = this.stamp({ kind: 'event', body: [{ type: 'cockpit', t: tick * TICK_S, tick }] });
    for (const t of net) t.send(c);
```

In `packages/controller/src/session/viewer-sync.ts`, find:

```ts
    for (const off of this.offs) off();
```

Replace with:

```ts
    for (const off of this.offs) off();
  }

  /** Stage 12: start again from a fresh snapshot of the host (a phone that held while it could not follow). */
  resync(): void {
    this.requestSync(true);
```

- [ ] **Step 4: Run green** — the same file, `npx vitest run test/session/fu11-mirror.test.ts test/session/viewer-sync.test.ts
  test/session/s10-fast-forward.test.ts test/relay` and the controller typecheck.

- [ ] **Step 5: Commit and push**

```bash
git add packages/controller
git commit -m "feat(controller): Stage 12 — a cockpit event to network viewers while the Ventilator view drives; ViewerSync.resync

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 6: The learner's phone — `?join=CODE` follows over the relay, upright, with one status reducer

**Files:**
- Create: `apps/demo/src/app/views/follower-status.ts`, `apps/demo/src/app/views/follower-status.test.ts`
- Modify: `apps/demo/src/app/views/follower.ts` (FU-11 d G2, create), `apps/demo/src/app/main.ts` (FU-11 a C1, b H3 H4,
  d G2; Stage 10 T5), `apps/demo/src/app/app.css` (FU-11 b H3, d G2; Stage 10 T5)

**Interfaces:**
- Consumes: Task 3's `joinCode`, `relayOf`; Task 4's `portrait`; Task 5's `cockpit` event and `ViewerSync.resync()`.
- Produces: `followerStatus(input: FollowerInput): FollowerView` (`{ text, ok, hold }`), `HOST_SILENT_MS` (moved here
  from `follower.ts`, same 5000), `UNREACHABLE_MS = 6000`, `COCKPIT_QUIET_MS = 2500`; `mountFollower(shell, site, code,
  bar, net?: NetFollow)` with `NetFollow = { relay: string }`; `main.ts` constants `join`, `relay` (used by Task 7);
  `<html data-learner="phone">` on a phone; `.learner-hold` panel in the stage; owner ruling Q4 (R50 I3):
  `phoneStyle(want, upright, themes, fallback)` and `NO_PHONE_LAYOUT` in `follower-status.ts`, the phone wears every
  `style` event (`.follower-note` under the monitor when it falls back).

- [ ] **Step 1: Write the failing test** (the follower reducer)

Create `apps/demo/src/app/views/follower-status.test.ts`:

```ts
// Stage 12: the learner monitor's states (the follower reducer), phone and second screen.
import { describe, expect, it } from 'vitest';
import { COCKPIT_QUIET_MS, followerStatus, HOST_SILENT_MS, NO_PHONE_LAYOUT, phoneStyle, UNREACHABLE_MS, type FollowerInput } from './follower-status.ts';

const ok: FollowerInput = { code: 'AB2CD3', net: true, sync: 'synced', transport: 'open', opened: true, sinceStartMs: 60_000, refused: null, hostAway: false, heardAgoMs: 200, paused: false, cockpitAgoMs: Infinity };
const s = (p: Partial<FollowerInput>) => followerStatus({ ...ok, ...p });

describe('Stage 12: the learner monitor status (follower reducer)', () => {
  it('follows: the session, then "(paused)" while the host is paused — a paused host may be silent', () => {
    expect(s({})).toEqual({ text: 'Following session AB2CD3', ok: true, hold: false });
    expect(s({ paused: true, heardAgoMs: 60_000 })).toEqual({ text: 'Following session AB2CD3 (paused)', ok: true, hold: false });
  });
  it('a phone that never reached the relay waits quietly, then asks about the Wi-Fi', () => {
    expect(s({ opened: false, transport: 'connecting', sync: 'waiting', sinceStartMs: UNREACHABLE_MS - 1 }).text).toBe("Waiting for the instructor's monitor AB2CD3…");
    expect(s({ opened: false, transport: 'connecting', sync: 'waiting', sinceStartMs: UNREACHABLE_MS + 1 })).toMatchObject({ text: expect.stringMatching(/cannot reach the instructor's laptop\. Is it on the classroom Wi-Fi\?$/), ok: false });
  });
  it('a lost connection says it reconnects; a full session and another refusal say so (no retry)', () => {
    expect(s({ transport: 'connecting' }).text).toBe('Connection lost: reconnecting…');
    expect(s({ refused: { code: 'full', message: 'session AB2CD3 is full (60)' }, transport: 'error' }).text).toBe('This session is full: please watch the main screen');
    expect(s({ refused: { code: 'forbidden', message: "controller only from the instructor's computer" } }).text).toBe("The classroom refused this phone: controller only from the instructor's computer");
  });
  it('a silent running host, or one the relay reports gone, is "not answering"', () => {
    expect(s({ heardAgoMs: HOST_SILENT_MS }).text).toBe("The instructor's monitor is not answering");
    expect(s({ hostAway: true }).text).toBe("The instructor's monitor is not answering");
  });
  it('while the Ventilator view drives the patient a phone holds, and follows again once the notices stop', () => {
    expect(s({ cockpitAgoMs: 900 })).toEqual({ text: 'The ventilator is on the main screen: this monitor waits until it closes', ok: true, hold: true });
    expect(s({ cockpitAgoMs: COCKPIT_QUIET_MS })).toMatchObject({ hold: false, text: 'Following session AB2CD3' });
  });
  it("a phone wears the instructor's style upright; a style with no phone layout falls back to the default and says so (owner ruling Q4)", () => {
    const upright = new Set(['saadat-like', 'philips-like']);
    const themes = new Set(['', 'projector-light']);
    expect(phoneStyle({ skin: 'philips-like', theme: 'projector-light' }, upright, themes, 'saadat-like')).toEqual({ skin: 'philips-like', theme: 'projector-light', note: null });
    expect(phoneStyle({ skin: 'cardiac-cath-lab', theme: '' }, upright, themes, 'saadat-like')).toEqual({ skin: 'saadat-like', theme: '', note: NO_PHONE_LAYOUT });
    expect(phoneStyle({ skin: 'philips-like', theme: 'night-shift' }, upright, themes, 'saadat-like').theme).toBe('');
  });
  it('the second screen (same browser) never shows the network rows, and never holds (it gets the frames)', () => {
    expect(s({ net: false, opened: false, transport: 'connecting', sinceStartMs: 60_000, sync: 'waiting' }).text).toBe("Waiting for the instructor's monitor AB2CD3…");
    expect(s({ net: false, cockpitAgoMs: 0 }).hold).toBe(false);
    expect(s({ net: false, sync: 'incompatible' }).text).toBe('This window runs another version: reload both windows');
  });
});
```

- [ ] **Step 2: Run it red** — `cd apps/demo && npx vitest run src/app/views/follower-status.test.ts` → `Error: Cannot find module './follower-status.ts'` (no tests run).

- [ ] **Step 3: Implement**

In `apps/demo/src/app/app.css`, find:

```css
.follower-bar { display: flex; align-items: center; gap: var(--s-2); padding: var(--s-2); justify-content: flex-end; }
```

Replace with:

```css
.follower-bar { display: flex; align-items: center; gap: var(--s-2); padding: var(--s-2); justify-content: flex-end; }

/* Stage 12: a learner's PHONE (?join=, data-learner=phone): one screen, portrait first — the monitor fills it (tiles in a
   grid under the waveforms, renderer `portrait`), the status line and its own Sound under it; nothing to scroll. */
[data-learner='phone'] body { overscroll-behavior: none; }
[data-learner='phone'] .follower-bar { flex-wrap: wrap; justify-content: space-between; gap: var(--s-1) var(--s-2); padding: var(--s-1) var(--s-2) max(var(--s-1), env(safe-area-inset-bottom)); }
[data-learner='phone'] .follower-bar .status-pill { flex: 1 1 100%; margin: 0; text-align: center; }
[data-learner='phone'] .follower-bar .status-pill:not([data-ok='true']) { border-color: #ffb000; }
[data-learner='phone'] .follower-bar .btn { flex: 1 1 0; }
[data-learner='phone'] .follower-bar .follower-note { flex: 1 1 100%; margin: 0; text-align: center; font-size: var(--t-13); color: var(--text-muted); }
.learner-hold { position: absolute; inset: 0; z-index: 5; display: grid; place-content: center; gap: var(--s-2); padding: var(--s-4); background: rgb(0 0 0 / 0.72); color: #f3f6f9; text-align: center; font-size: var(--t-22); font-weight: 600; }
.learner-hold .muted { font-size: var(--t-15); font-weight: 400; color: #aab3bf; }
.learner-hold[hidden] { display: none; }
```

In `apps/demo/src/app/main.ts`, find:

```ts
import { alarmLine, limitsOffTitle, LIMITS_OFF_LABEL } from './alarms.ts';
```

Replace with:

```ts
import { alarmLine, limitsOffTitle, LIMITS_OFF_LABEL } from './alarms.ts';
import { joinCode, relayOf } from './classroom.ts';
```

In `apps/demo/src/app/main.ts`, find:

```ts
const follow = normalizeSessionCode(q.get('follow') ?? '');
```

Replace with:

```ts
// Stage 12: `?join=<code>` = a learner's PHONE: it follows that session over the relay (the QR code's address)
const join = joinCode(location);
const follow = join ?? normalizeSessionCode(q.get('follow') ?? '');
const relay = relayOf(location);
if (join) document.documentElement.dataset.learner = 'phone'; // the portrait learner layout (app.css)
```

In `apps/demo/src/app/main.ts`, find:

```ts
  const follower = mountFollower(shell, site, follow, bar);
```

Replace with:

```ts
  const follower = mountFollower(shell, site, follow, bar, join && relay ? { relay } : undefined);
```

Create `apps/demo/src/app/views/follower-status.ts`:

```ts
// Stage 12: what a learner monitor says and does, from what it knows — one pure function, so every state a phone can be
// in (a relay it cannot reach, a full session, a lost socket, a silent instructor, the Ventilator view driving the
// patient) is unit-tested without a browser. The second screen (same browser) meets only the last four rows.
import type { TransportStatus } from '@pme/controller';

/** R50 F5: no message from a RUNNING host for this long → "not answering" (it sends its state every second) [ENG]. */
export const HOST_SILENT_MS = 5000;
/** Stage 12: the phone has not reached the relay for this long: it is probably not on the classroom network [ENG]. */
export const UNREACHABLE_MS = 6000;
/** Stage 12: the host's `cockpit` events come once a second; this long without one, the Ventilator view has closed [ENG]. */
export const COCKPIT_QUIET_MS = 2500;

export interface FollowerInput {
  code: string;
  /** Over the relay (a phone), not this browser's BroadcastChannel. */
  net: boolean;
  sync: 'waiting' | 'synced' | 'incompatible';
  transport: TransportStatus;
  /** The transport has been open at least once. */
  opened: boolean;
  /** Wall ms since the page started following. */
  sinceStartMs: number;
  /** The relay's refusal, if any (`full`: the session took its last phone). */
  refused: { code: string; message: string } | null;
  /** The relay says the instructor's page is not connected. */
  hostAway: boolean;
  /** Wall ms since the last message from the host. */
  heardAgoMs: number;
  /** The host is paused (its sticky `time pause`). */
  paused: boolean;
  /** Wall ms since the host's last `cockpit` event (Infinity: never). */
  cockpitAgoMs: number;
}

export interface FollowerView {
  text: string;
  /** Following normally (the status pill's `data-ok`). */
  ok: boolean;
  /** Hold the monitor still: the Ventilator view drives the patient and this monitor cannot follow it. */
  hold: boolean;
}

/** Stage 12 (owner ruling Q4): said under a phone's monitor when the instructor's style has no upright (phone) layout. */
export const NO_PHONE_LAYOUT = 'This monitor style has no phone layout: showing the default style';

/**
 * Stage 12 (owner ruling Q4): the style a PHONE wears — the instructor's (it comes in the follow stream), upright. A style
 * the phone cannot draw upright (not in `upright`: every shipped style can, measured at 375 px) falls back to `fallback`,
 * the default style, and says so; an unknown theme falls back to the style's own look ('').
 */
export function phoneStyle(want: { skin: string; theme: string }, upright: ReadonlySet<string>, themes: ReadonlySet<string>, fallback: string): { skin: string; theme: string; note: string | null } {
  const theme = themes.has(want.theme) ? want.theme : '';
  return upright.has(want.skin) ? { skin: want.skin, theme, note: null } : { skin: fallback, theme, note: NO_PHONE_LAYOUT };
}

export function followerStatus(i: FollowerInput): FollowerView {
  const no = (text: string): FollowerView => ({ text, ok: false, hold: false });
  if (i.net && i.refused?.code === 'full') return no('This session is full: please watch the main screen');
  if (i.net && i.refused) return no(`The classroom refused this phone: ${i.refused.message}`);
  if (i.sync === 'incompatible') return no(i.net ? 'This phone has another version of the simulator: scan the code again' : 'This window runs another version: reload both windows');
  if (i.net && !i.opened && i.sinceStartMs > UNREACHABLE_MS) return no("Waiting for the instructor: this phone cannot reach the instructor's laptop. Is it on the classroom Wi-Fi?");
  if (i.net && i.opened && i.transport !== 'open') return no('Connection lost: reconnecting…');
  if (i.sync !== 'synced') return no(`Waiting for the instructor's monitor ${i.code}…`);
  if (i.hostAway || (!i.paused && i.heardAgoMs >= HOST_SILENT_MS)) return no("The instructor's monitor is not answering");
  if (i.net && i.cockpitAgoMs < COCKPIT_QUIET_MS) return { text: 'The ventilator is on the main screen: this monitor waits until it closes', ok: true, hold: true };
  return { text: `Following session ${i.code}${i.paused ? ' (paused)' : ''}`, ok: true, hold: false };
}
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
import { createBroadcastChannelTransport, ViewerSync, type ManagedTransport } from '@pme/controller';
```

Replace with:

```ts
//  - Stage 12, a PHONE over the relay (`?join=<CODE>`, docs/plans/stage-12-mobile-learner.md): the same contract on a
//    WebSocket to `pme-relay`. The relay sends a viewer only VIEWER_EVENTS (protocol.ts) and a hello's replays only to
//    the peers awaiting a snapshot; it refuses a phone past the session's limit (`full`, no retry) and any role but
//    viewer from another device. Style (owner ruling Q4): a phone has no style channel; the instructor's style comes IN
//    the follow stream — a `style` event in every answer to a hello and at every change — and the phone wears it
//    upright (`phoneStyle`; a style with no phone layout: the default, said under the monitor). While the Ventilator
//    view drives the patient the host sends a `cockpit` event once a second to the network instead of its frames: the
//    phone HOLDS (its monitor still, "The ventilator is on the main screen") and takes a fresh snapshot when they stop.
//    A page hidden for a while (a locked phone) also takes a fresh snapshot instead of computing the gap.
import { createBroadcastChannelTransport, createWebSocketTransport, ViewerSync, type ManagedTransport, type RelayFrame } from '@pme/controller';
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
import type { SiteProfile } from '../site.ts';
import { button, h, setText } from '../ui.ts';

/** R50 F5: no message from a RUNNING host for this long → "not answering" (it sends its state every second) [ENG]. */
const HOST_SILENT_MS = 5000;
```

Replace with:

```ts
import { DEFAULT_SITE, MONITORS, THEMES, type SiteProfile } from '../site.ts';
import { button, h, setText } from '../ui.ts';
import { followerStatus, phoneStyle } from './follower-status.ts';

/**
 * Stage 12: a phone's socket is dropped and reopened when nothing (not even the relay's 10 s heartbeat) arrived for this
 * long — a phone that slept or moved to another access point often keeps a dead socket open [ENG: 1.2 heartbeats].
 */
const PHONE_LIVENESS_MS = 12_000;
/** Stage 12: hidden this long (a locked phone, another tab), the page starts again from a fresh snapshot [ENG]. */
const HIDDEN_RESYNC_MS = 2000;
/** Stage 12 (owner ruling Q4): the styles a phone draws upright — every shipped one (measured at 375 px, both engines). */
const UPRIGHT: ReadonlySet<string> = new Set(MONITORS.map((m) => m.id));
const PHONE_THEMES: ReadonlySet<string> = new Set(THEMES.map(([t]) => t));
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
export function mountFollower(shell: Shell, site: SiteProfile, code: string, bar: HTMLElement): Follower {
  applySkinAlarmColours(site.skin, site.theme);
  // owner ruling Q3: this window's alarm SOUND is its own (its Sound and Silence buttons); the alarms are the patient's
  const monitor = mountMonitor(shell.monitorHost, { skin: site.skin, ...(site.theme ? { theme: site.theme } : {}), role: 'viewer', worker: 'off', audioSilence: 'window' });
  const transport = createBroadcastChannelTransport(code);
```

Replace with:

```ts
/** Stage 12: a learner's phone follows over the relay at this WebSocket address instead of this browser's channel. */
export interface NetFollow {
  relay: string;
}

export function mountFollower(shell: Shell, site: SiteProfile, code: string, bar: HTMLElement, net?: NetFollow): Follower {
  applySkinAlarmColours(site.skin, site.theme);
  // owner ruling Q3: this window's alarm SOUND is its own (its Sound and Silence buttons); the alarms are the patient's
  // Stage 12: a phone shows the monitor upright (tiles under the waveforms)
  const monitor = mountMonitor(shell.monitorHost, { skin: site.skin, ...(site.theme ? { theme: site.theme } : {}), role: 'viewer', worker: 'off', audioSilence: 'window', portrait: !!net });
  let refused: { code: string; message: string } | null = null; // Stage 12: the relay's refusal (a full session)
  let hostAway = false; // Stage 12: the relay says the instructor's page is not connected
  let cockpitAt = -Infinity; // Stage 12: wall ms of the host's last `cockpit` event (the Ventilator view drives)
  const onRelay = (fr: RelayFrame) => {
    if (fr.relay === 'error') refused = fr;
    if (fr.relay === 'peers') hostAway = !fr.hostOnline;
  };
  const transport = net ? createWebSocketTransport({ url: net.relay, livenessMs: PHONE_LIVENESS_MS, onRelayFrame: onRelay }) : createBroadcastChannelTransport(code);
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
  let raf = 0;
  const f: Follower = { monitor, transport, sync: null, destroy, style: { skin: site.skin, theme: site.theme } };
  const style = styleChannel(code);
  style.onmessage = (ev: MessageEvent<StyleMsg>) => {
```

Replace with:

```ts
  // Stage 12 (owner ruling Q4): under a phone's monitor when the instructor's style has no phone layout
  const styleNote = h('p', { class: 'follower-note', hidden: true });
  if (net) bar.append(styleNote);
  // Stage 12: while the Ventilator view drives the patient, a phone's monitor is held still behind this line
  const holdNote = h('div', { class: 'learner-hold', hidden: true }, h('p', {}, 'The ventilator is on the main screen'), h('p', { class: 'muted' }, 'This monitor continues when the ventilator view closes.'));
  shell.stage.append(holdNote);
  let hold = false;
  let raf = 0;
  const f: Follower = { monitor, transport, sync: null, destroy, style: { skin: site.skin, theme: site.theme } };
  const style = net ? null : styleChannel(code); // Stage 12: same-browser only
  if (style) style.onmessage = (ev: MessageEvent<StyleMsg>) => {
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
  style.postMessage({ kind: 'ask' } satisfies StyleMsg);
```

Replace with:

```ts
  style?.postMessage({ kind: 'ask' } satisfies StyleMsg);
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
      sync.follow(); // once per frame: steers this monitor's clock onto the instructor's (a frame behind is fine)
```

Replace with:

```ts
      if (hold) clock.setPaused(true); // Stage 12: it cannot follow the cockpit's patient — still, not wrong
      else sync.follow(); // once per frame: steers this monitor's clock onto the instructor's (a frame behind is fine)
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
  });
  // R50 F5: host liveness — a running host sends at least its 1 Hz state; a paused one may be silent. Silence of more than
```

Replace with:

```ts
  });
  // Stage 12: back from hidden (a locked phone), start from a fresh snapshot — catching up would compute every tick of
  // the gap on this page's main thread (five minutes = 15 000 ticks)
  let hiddenAt: number | null = null;
  const onVisible = () => {
    if (document.hidden) return void (hiddenAt = performance.now());
    if (hiddenAt !== null && performance.now() - hiddenAt > HIDDEN_RESYNC_MS) f.sync?.resync();
    hiddenAt = null;
  };
  document.addEventListener('visibilitychange', onVisible);
  // R50 F5: host liveness — a running host sends at least its 1 Hz state; a paused one may be silent. Silence of more than
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
    for (const e of m.body) {
```

Replace with:

```ts
    for (const e of m.body) {
      if (e.type === 'cockpit') cockpitAt = performance.now(); // Stage 12
      if (e.type === 'style' && net) wearPhone(e.skin, e.theme); // Stage 12 (owner ruling Q4)
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
  const draw = setInterval(() => {
    const s = f.sync?.status ?? 'waiting';
    const alive = paused || performance.now() - heard < HOST_SILENT_MS;
    setText(status, s === 'incompatible' ? 'This window runs another version: reload both windows' : s !== 'synced' ? `Waiting for the instructor's monitor ${code}…` : !alive ? "The instructor's monitor is not answering" : `Following session ${code}${paused ? ' (paused)' : ''}`);
    status.dataset.ok = String(s === 'synced' && alive);
```

Replace with:

```ts
  /** Stage 12 (owner ruling Q4): the instructor's style, upright on this phone (or the default, said under the monitor). */
  function wearPhone(skin: string, theme: string): void {
    const w = phoneStyle({ skin, theme }, UPRIGHT, PHONE_THEMES, DEFAULT_SITE.skin);
    styleNote.hidden = w.note === null;
    setText(styleNote, w.note ?? '');
    if (w.skin === f.style.skin && w.theme === f.style.theme) return;
    f.style = { skin: w.skin, theme: w.theme };
    applySkinAlarmColours(w.skin, w.theme);
    void monitor.setSkin(w.skin, w.theme ? { theme: w.theme } : {});
  }
  let opened = false; // Stage 12: the phone has reached the relay at least once
  const t0 = performance.now();
  const offOpen = transport.onStatus((st) => void (st === 'open' && (opened = true)));
  const draw = setInterval(() => {
    const now = performance.now();
    const v = followerStatus({
      code, net: !!net, sync: f.sync?.status ?? 'waiting', transport: transport.status, opened, sinceStartMs: now - t0, refused, hostAway,
      heardAgoMs: now - heard, paused, cockpitAgoMs: now - cockpitAt,
    });
    if (hold && !v.hold) f.sync?.resync(); // Stage 12: the ventilator view closed — start again from the host's snapshot
    hold = v.hold;
    holdNote.hidden = !hold;
    setText(status, v.text);
    status.dataset.ok = String(v.ok);
```

In `apps/demo/src/app/views/follower.ts`, find:

```ts
    style.close();
```

Replace with:

```ts
    offOpen();
    document.removeEventListener('visibilitychange', onVisible);
    holdNote.remove();
    style?.close();
```

- [ ] **Step 4: Run green** — the reducer test (7 tests), the demo typecheck, and the second screen unchanged:
  `npx playwright test fu11-follower s10-time-control --retries=0` (both engines; prototype: all green — the follower
  e2e reads the same status texts).

- [ ] **Step 5: Commit and push**

```bash
git add apps/demo/src/app
git commit -m "feat(app): Stage 12 — the learner's phone follows over the relay (?join=), upright, holds for the Ventilator view

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 7: The QR moment — the session on the relay, the Phones sheet, and the phone e2e on both engines

**Files:**
- Create: `apps/demo/src/app/classroom-panel.ts`, `apps/demo/e2e/s12-mobile-learner.e2e.ts`
- Modify: `apps/demo/src/app/session.ts` (FU-11 b H1 H4, d G2; Stage 10 T5), `apps/demo/src/app/main.ts`,
  `apps/demo/src/app/views/monitor.ts` (FU-11 d G2), `apps/demo/src/app/app.css`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: `AppSession` option `relay?: string | null`, `AppSession.relay` (the WebSocket transport or null),
  `.followers: number`, `.onFollowers(fn)`; `mountClassroomPanel(right, session, relay): { open(): Promise<void> }`;
  `monitorView(…, { …, phones })`; `window.__pmeApp.phones`; with a relay, every answer to a hello carries a `style`
  event (`replay: true`) and every style change publishes one (owner ruling Q4, R50 I3).

- [ ] **Step 1: Write the failing e2e**

Create `apps/demo/e2e/s12-mobile-learner.e2e.ts`:

```ts
// Stage 12 (the owner's request for the 22 Oct demonstration): learners scan a QR code and a learner monitor opens on
// their phones — a LIVE follower of the instructor's session over the relay, portrait, numerics large, no instructor
// controls, sound off until tapped. On both engines at a phone viewport (Playwright device emulation): the QR sheet, the
// phone following through speed changes and a fast-forward, a pause, the instructor's style and its change (owner ruling
// Q4), a phone that joins DURING a fast-forward, the Ventilator view (the phone holds), a relay that restarts (the phone
// reconnects), a full session and a relay a phone cannot reach.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import type { ViteDevServer } from 'vite';
import { startRelay, type RelayHandle, type RelayOptions } from '../../../packages/controller/relay/server.ts';
import { openApp, startVite } from './stage9-support.ts';

let vite: ViteDevServer;
let base = '';
let relay: RelayHandle | null = null;
test.beforeAll(async () => ({ vite, base } = await startVite()));
test.afterAll(async () => vite?.close());
test.afterEach(async () => relay?.close());

type Sync = { status: string; resyncs: number; lagS: number };
type W = {
  __pmeFollower: { sync: Sync | null; style: { skin: string; theme: string } };
  __pmeApp: { session: { code: string; followers: number; setSkin(skin: string, theme: string): Promise<void> }; link: { simT: number; send(c: unknown): Promise<{ accepted: boolean }> }; frames: number[] };
};
const ws = () => `ws://127.0.0.1:${relay!.port}/`;
/** A relay as the classroom runs it (app folder, phones may only follow), on a random port or a given one. */
async function classroom(o: RelayOptions = {}): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 's12-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>'); // the QR sheet reads `serves`; the pages come from Vite here
  relay = await startRelay({ port: 0, host: '127.0.0.1', staticDir: dir, remoteRoles: 'viewer', ...o });
}
async function instructor(page: Page, scenario: string, site?: Record<string, unknown>): Promise<string> {
  await openApp(page, base, `?relay=${encodeURIComponent(ws())}&scenario=${scenario}`, { warmMs: 1500, ...(site ? { site } : {}) });
  return page.evaluate(() => (window as unknown as W).__pmeApp.session.code);
}
/** A phone (iPhone 13 on WebKit, Pixel 7 on Chromium) that opened the learner address. */
async function phone(browser: Browser, browserName: string, code: string, relayUrl = ws()): Promise<Page> {
  const { defaultBrowserType: _b, ...dev } = browserName === 'webkit' ? devices['iPhone 13'] : devices['Pixel 7'];
  const p = await (await browser.newContext(dev)).newPage();
  await p.goto(`${base}/?join=${code}&relay=${encodeURIComponent(relayUrl)}`);
  return p;
}
const synced = (p: Page) => p.waitForFunction(() => (window as unknown as W).__pmeFollower?.sync?.status === 'synced', null, { timeout: 30_000 });
const sync = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeFollower.sync as Sync);
const tiles = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.pme-stile')].map((e) => `${(e as HTMLElement).dataset.param}:${e.querySelector('[data-pme="v"]')?.textContent}`).join(' '));
const same = (f: Page, p: Page) => expect.poll(async () => (await tiles(f)) === (await tiles(p)) || `${await tiles(f)} | ${await tiles(p)}`, { timeout: 15_000, intervals: [100] }).toBe(true);
const status = (p: Page) => p.locator('.follower-bar .status-pill');
const styleOf = (p: Page) => p.evaluate(() => (window as unknown as W).__pmeFollower.style.skin);

test("the QR sheet, then a phone follows in the instructor's style through ×4, ×8, a style change, a pause and a 2-minute fast-forward that another phone joins", async ({ page, browser, browserName }) => {
  test.setTimeout(300_000);
  await classroom();
  const code = await instructor(page, 'showcase-anaphylaxis', { skin: 'philips-like' }); // not the phones' default style
  // the QR moment: a sheet with the code, the learner address (this computer's network address) and the count
  await page.getByRole('button', { name: 'Phones' }).click();
  const sheet = page.getByRole('dialog', { name: /Learners' phones/ });
  await expect(sheet.getByRole('img', { name: /^QR code of http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/\?join=/ })).toBeVisible();
  await expect(sheet.locator('.phones-url')).toHaveText(new RegExp(`^http://\\d+\\.\\d+\\.\\d+\\.\\d+:${relay!.port}/\\?join=${code}$`));
  await expect(sheet.locator('.phones-count')).toHaveText('0 phones following');

  const f = await phone(browser, browserName, code);
  await synced(f);
  await expect(sheet.locator('.phones-count')).toHaveText('1 phone following');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(status(f)).toHaveText(`Following session ${code}`);
  // one screen, portrait: the waveforms over the whole width, the tiles in a grid under them, nothing to scroll, no
  // instructor control, sound off until tapped
  const box = await f.evaluate(() => {
    const c = document.querySelector('.monitor-host canvas')!.getBoundingClientRect();
    const t = document.querySelector('.pme-portrait')!.getBoundingClientRect();
    const b = document.querySelector('.follower-bar')!.getBoundingClientRect();
    return { cw: c.width, vw: innerWidth, vh: innerHeight, tilesTop: t.top, canvasBottom: c.bottom, barBottom: b.bottom, sw: document.documentElement.scrollWidth };
  });
  expect(box.cw).toBeGreaterThan(box.vw * 0.95);
  expect(box.tilesTop).toBeGreaterThanOrEqual(box.canvasBottom - 1);
  expect(box.barBottom).toBeLessThanOrEqual(box.vh + 1);
  expect(box.sw).toBeLessThanOrEqual(box.vw);
  expect(await f.getByRole('button').evaluateAll((bs) => bs.filter((b) => (b as HTMLElement).offsetParent !== null).map((b) => b.textContent))).toEqual(['Sound off', 'Silence here']); // nothing of the instructor's
  await same(f, page);
  // owner ruling Q4: the instructor's style, carried in the follow stream (the tiles above are Philips-style ones)
  expect(await styleOf(f)).toBe('philips-like');
  await expect(f.locator('.follower-note')).toBeHidden();

  const bar = page.locator('.sessionbar');
  for (const k of ['×4', '×8']) {
    await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: k }).click();
    await page.waitForTimeout(8000);
    expect((await sync(f)).status).toBe('synced');
    expect((await sync(f)).lagS).toBeLessThan(k === '×8' ? 2 : 1); // sim seconds behind the host (a delay of 0.1 s × the speed is by design)
    await same(f, page);
  }
  await bar.getByRole('group', { name: 'Simulation speed' }).getByRole('button', { name: '×1' }).click();
  // the instructor changes the style: the phone follows it (upright)
  await page.evaluate(() => (window as unknown as W).__pmeApp.session.setSkin('saadat-like', ''));
  await expect.poll(() => styleOf(f), { timeout: 10_000 }).toBe('saadat-like');
  await expect(f.locator('.pme-portrait')).toBeVisible();
  await same(f, page);
  await bar.getByRole('button', { name: 'Pause' }).click();
  await expect(status(f)).toHaveText(`Following session ${code} (paused)`, { timeout: 5000 });
  await bar.getByRole('button', { name: /Resume|Run/ }).click();
  await expect(status(f)).toHaveText(`Following session ${code}`, { timeout: 5000 });

  // Stage 10's fast-forward: the phone shows the same panel, waits, and starts again from the host's snapshot
  const t0 = await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT);
  await bar.getByRole('group', { name: 'Fast-forward' }).getByRole('button', { name: 'Fast-forward 2 min' }).click();
  await expect(f.locator('.ff-veil.on')).toBeVisible({ timeout: 5000 });
  // R50 I6: a phone that joins DURING the span gets the host's answer (the jump among its replays) and the end
  const late = await phone(browser, browserName, code);
  await expect(late.locator('.ff-veil.on')).toBeVisible({ timeout: 8000 }); // it joined inside the span: it waits too
  await expect(f.locator('.ff-veil.on')).toHaveCount(0, { timeout: 30_000 });
  await synced(f);
  await synced(late);
  await same(late, page);
  expect(await styleOf(late)).toBe('saadat-like');
  await late.context().close();
  await expect.poll(() => f.evaluate(() => (window as unknown as { __pmeFollower: { sync: { lastFastForward: unknown } } }).__pmeFollower.sync.lastFastForward !== null)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as W).__pmeApp.link.simT)).toBeGreaterThan(t0 + 120);
  await same(f, page);
});

test('while the Ventilator view drives the patient the phone holds; it follows again with the next patient', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom();
  const code = await instructor(page, 'showcase-bronchospasm');
  const f = await phone(browser, browserName, code);
  await synced(f);
  await page.evaluate(() => (location.hash = '#/vent'));
  await expect(f.locator('.learner-hold')).toBeVisible({ timeout: 10_000 });
  await expect(status(f)).toHaveText('The ventilator is on the main screen: this monitor waits until it closes');
  const r0 = (await sync(f)).resyncs;
  await page.waitForTimeout(8000);
  expect((await sync(f)).resyncs - r0).toBeLessThanOrEqual(1); // held: no snapshot storm (it re-synced every ≈ 4 s before)
  // the cockpit keeps the patient while the case runs (FU-11 H6: a new case unloads it), whichever view is on screen
  await page.evaluate(() => (location.hash = '#/monitor'));
  await page.waitForTimeout(4000);
  await expect(f.locator('.learner-hold')).toBeVisible();
  await page.evaluate(() => { const a = (window as unknown as { __pmeApp: { session: { restart(s: unknown): void; spec: unknown } } }).__pmeApp.session; a.restart({ spec: a.spec, mode: 'modeled' }); });
  await expect(f.locator('.learner-hold')).toBeHidden({ timeout: 15_000 });
  await synced(f);
  await expect(status(f)).toHaveText(`Following session ${code}`, { timeout: 10_000 });
});

test('a relay restart, a full session and a relay the phone cannot reach', async ({ page, browser, browserName }) => {
  test.setTimeout(180_000);
  await classroom({ maxPeersPerRoom: 1 });
  const port = relay!.port;
  const code = await instructor(page, 'showcase-induction');
  const f = await phone(browser, browserName, code);
  await synced(f);
  const g = await phone(browser, browserName, code);
  await expect(status(g)).toHaveText('This session is full: please watch the main screen', { timeout: 10_000 });
  await g.context().close();
  // the network blinks: the relay goes away and comes back on the same address
  await relay!.close();
  await expect(status(f)).toHaveText(/Connection lost: reconnecting…|The instructor's monitor is not answering/, { timeout: 15_000 });
  relay = await startRelay({ port, host: '127.0.0.1', remoteRoles: 'viewer' });
  await expect(status(f)).toHaveText(`Following session ${code}`, { timeout: 30_000 });
  await same(f, page);
  // a phone on another network: it waits, then says what to check
  const lost = await phone(browser, browserName, code, 'ws://127.0.0.1:9/');
  await expect(status(lost)).toHaveText("Waiting for the instructor: this phone cannot reach the instructor's laptop. Is it on the classroom Wi-Fi?", { timeout: 15_000 });
});
```

- [ ] **Step 2: Run it red** — `npx playwright test s12-mobile-learner --retries=0 --project=chromium` → 3 failed — test 1 times out waiting for the **Phones** button (5 min, the test's budget); tests 2 and 3: the phone never syncs (`page.waitForFunction: Timeout 30000ms exceeded`: the instructor's session is not on the relay).

- [ ] **Step 3: Implement**

In `apps/demo/src/app/app.css`, find:

```css
.learner-hold[hidden] { display: none; }
```

Replace with:

```css
.learner-hold[hidden] { display: none; }
/* Stage 12: the QR moment — a sheet over every view, the code as large as the projector allows */
.phones-sheet { width: min(720px, calc(100vw - 2 * var(--s-4))); max-height: calc(100dvh - 2 * var(--s-4)); text-align: center; }
.phones-qr svg { width: min(480px, 52dvh, calc(100vw - 6 * var(--s-4))); height: auto; }
.phones-url { font-size: var(--t-18); word-break: break-all; margin: var(--s-2) 0 0; }
.phones-code { font-size: var(--t-32); font-weight: 700; letter-spacing: 0.2em; margin: var(--s-1) 0; }
.phones-count { font-size: var(--t-18); }
```

Create `apps/demo/src/app/classroom-panel.ts`:

```ts
// Stage 12: the QR moment. With a relay (the classroom), the top bar has "Phones": a sheet over every view, the monitor
// in full screen included, with a QR code as large as the projector allows, the address and the code beneath it, and the
// number of phones following, live. Where phones cannot join (no relay answering, no network, a loopback-only page) it
// says why instead of showing a code nobody can use.
import { qrTarget, relayInfo } from './classroom.ts';
import { qrSvg } from './qr.ts';
import type { AppSession } from './session.ts';
import { button, h, setText } from './ui.ts';

export function mountClassroomPanel(right: HTMLElement, session: AppSession, relay: string): { open(): Promise<void> } {
  const count = h('p', { class: 'phones-count', role: 'status' });
  const body = h('div', { class: 'phones-body' });
  const dlg = h('dialog', { class: 'phones-sheet', 'aria-labelledby': 'phones-h' },
    h('h2', { id: 'phones-h' }, "Learners' phones: scan to follow this monitor"), body, count,
    h('div', { class: 'actions' }, button('Close', () => dlg.close(), 'small')));
  const drawCount = (n: number) => setText(count, n === 1 ? '1 phone following' : `${n} phones following`);
  session.onFollowers(drawCount);
  drawCount(session.followers);
  async function open(): Promise<void> {
    body.replaceChildren(h('p', { class: 'muted' }, 'Looking for this computer on the network…'));
    if (!dlg.open) dlg.showModal();
    const t = qrTarget(session.code, location, relay, await relayInfo(relay));
    body.replaceChildren(...(t.ok
      ? [
          h('div', { class: 'phones-qr', role: 'img', 'aria-label': `QR code of ${t.url}` }, qrSvg(t.url, 480)),
          h('p', { class: 'mono phones-url' }, t.url),
          h('p', { class: 'phones-code', 'aria-label': `Code ${session.code.split('').join(' ')}` }, session.code),
          h('p', { class: 'hint' }, 'Phones must be on the same Wi-Fi as this computer. Sound on a phone starts only when its owner taps Sound.'),
          ...(t.others.length ? [h('p', { class: 'hint mono' }, `If the code does not open: ${t.others.join('  ·  ')}`)] : []),
        ]
      : [h('p', { class: 'error', role: 'alert' }, t.why)]));
  }
  right.prepend(button('Phones', () => void open(), 'small phones-btn'));
  document.body.append(dlg);
  return { open };
}
```

In `apps/demo/src/app/main.ts`, find:

```ts
import { joinCode, relayOf } from './classroom.ts';
```

Replace with:

```ts
import { joinCode, relayOf } from './classroom.ts';
import { mountClassroomPanel } from './classroom-panel.ts';
```

In `apps/demo/src/app/main.ts`, find:

```ts
  const session = new AppSession(shell.monitorHost, { spec: { ...base, attached: !site.sensorsOff }, mode: 'modeled' }, { skin: site.skin, theme: site.theme, code: q.get('session'), load: q.get('load') === 'perf8' ? 'perf8' : null });
```

Replace with:

```ts
  const session = new AppSession(shell.monitorHost, { spec: { ...base, attached: !site.sensorsOff }, mode: 'modeled' }, { skin: site.skin, theme: site.theme, code: q.get('session'), load: q.get('load') === 'perf8' ? 'perf8' : null, relay });
```

In `apps/demo/src/app/main.ts`, find:

```ts
  shell.add(monitorView(shell.stage, { session, link, learnerUrl: followUrl(session.code) }));
```

Replace with:

```ts
  const phones = relay ? mountClassroomPanel(shell.right, session, relay) : null; // Stage 12: the QR moment (a classroom relay)
  shell.add(monitorView(shell.stage, { session, link, learnerUrl: followUrl(session.code), phones }));
```

In `apps/demo/src/app/main.ts`, find:

```ts
  Object.assign(window, { __pmeApp: { shell, session, link, frames, site, teach, engineIds, skinAlarmBar } });
```

Replace with:

```ts
  Object.assign(window, { __pmeApp: { shell, session, link, frames, site, teach, engineIds, skinAlarmBar, phones } });
```

In `apps/demo/src/app/session.ts`, find:

```ts
  ControllerSession, createBroadcastChannelTransport, createInProcessHub, HostSession, newSessionCode, normalizeSessionCode,
```

Replace with:

```ts
  ControllerSession, createBroadcastChannelTransport, createInProcessHub, createWebSocketTransport, HostSession, newSessionCode, normalizeSessionCode,
```

In `apps/demo/src/app/session.ts`, find:

```ts
  readonly diag = { received: {} as Record<string, number> };
```

Replace with:

```ts
  readonly diag = { received: {} as Record<string, number> };
  /** Stage 12: the session on the relay (learners' phones follow it there), or null without one. */
  readonly relay: ReturnType<typeof createWebSocketTransport> | null = null;
  /** Stage 12: peers on the relay besides this host (the phones following), from the relay's `peers` frames. */
  followers = 0;
  private readonly followerFns = new Set<(n: number) => void>();
```

In `apps/demo/src/app/session.ts`, find:

```ts
  constructor(el: HTMLElement, start: SessionStart, o: { skin: string; theme: string; code?: string | null; load?: 'perf8' | null }) {
```

Replace with:

```ts
  constructor(el: HTMLElement, start: SessionStart, o: { skin: string; theme: string; code?: string | null; load?: 'perf8' | null; relay?: string | null }) {
```

In `apps/demo/src/app/session.ts`, find:

```ts
      session: this.code, target: this.driver.host, scenario: this.driver.hook, welcomeEvents: () => this.driver.welcomeEvents(),
```

Replace with:

```ts
      session: this.code, target: this.driver.host, scenario: this.driver.hook,
      // Stage 12 (owner ruling Q4): with a relay, every answer to a hello also carries the monitor style (a phone wears it)
      welcomeEvents: () => [...this.driver.welcomeEvents(), ...(this.relay ? [{ type: 'style' as const, skin: this.skin, theme: this.theme, replay: true as const }] : [])],
```

In `apps/demo/src/app/session.ts`, find:

```ts
    this.bc.onMessage((m) => void (this.diag.received[m.kind] = (this.diag.received[m.kind] ?? 0) + 1)); // e2e diagnostics
```

Replace with:

```ts
    this.bc.onMessage((m) => void (this.diag.received[m.kind] = (this.diag.received[m.kind] ?? 0) + 1)); // e2e diagnostics
    // Stage 12: with a relay the session is also offered there, for learners' phones (they may only follow: the relay
    // refuses another device's commands in a classroom, and the host refuses a viewer's)
    if (o.relay) {
      this.relay = createWebSocketTransport({
        url: o.relay,
        onRelayFrame: (f) => {
          if (f.relay !== 'peers') return;
          this.followers = f.peers;
          for (const fn of this.followerFns) fn(f.peers);
        },
      });
      hs.addTransport(this.relay);
      this.onSkin((skin, theme) => hs?.publish({ type: 'style', skin, theme })); // owner ruling Q4: phones follow a change
    }
```

In `apps/demo/src/app/session.ts`, find:

```ts
    this.pollTimer = setInterval(() => !this.fastForwarding && this.driver.poll(), 100); // Stage 10: a fast-forward polls per step
```

Replace with:

```ts
    this.pollTimer = setInterval(() => !this.fastForwarding && this.driver.poll(), 100); // Stage 10: a fast-forward polls per step
  }

  /** Stage 12: every change in the number of phones following on the relay. */
  onFollowers(fn: (n: number) => void): () => void {
    this.followerFns.add(fn);
    return () => void this.followerFns.delete(fn);
```

In `apps/demo/src/app/session.ts`, find:

```ts
    this.bc.close();
```

Replace with:

```ts
    this.bc.close();
    this.relay?.close();
```

In `apps/demo/src/app/views/monitor.ts`, find:

```ts
export function monitorView(stage: HTMLElement, o: { session: AppSession; link: Link; learnerUrl: string }): View {
```

Replace with:

```ts
export function monitorView(stage: HTMLElement, o: { session: AppSession; link: Link; learnerUrl: string; phones?: { open(): Promise<void> } | null }): View {
```

In `apps/demo/src/app/views/monitor.ts`, find:

```ts
    h('a', { class: 'btn small', href: hrefOf('teach') }, 'Instructor view'), full, second, h('a', { class: 'btn small ghost', href: hrefOf('start') }, 'Start'));
```

Replace with:

```ts
    h('a', { class: 'btn small', href: hrefOf('teach') }, 'Instructor view'), full, second,
    // Stage 12: the QR moment, from the screen the room is looking at (a classroom relay only)
    o.phones ? button('Phones', () => void o.phones?.open(), 'small') : null,
    h('a', { class: 'btn small ghost', href: hrefOf('start') }, 'Start'));
```

- [ ] **Step 4: Run green on both engines** — `npx playwright test s12-mobile-learner --retries=0` (prototype after R50:
  6 passed, Chromium 33 / 18 / 13 s, WebKit 34 / 18 / 12 s), then `npx playwright test fu11-follower s10-time-control
  stage6a-screens audit-relay audit-remote --retries=0` and the demo typecheck.

- [ ] **Step 5: Commit and push**

```bash
git add apps/demo
git commit -m "feat(app): Stage 12 — the session on the classroom relay and the Phones sheet (the QR moment); phone e2e

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 8: The kit — "Start Classroom", the relay in one file, the run sheet

**Files:**
- Create: `scripts/showcase/kit/start-classroom.command` (mode 755), `docs/showcase/CLASSROOM.md`
- Modify: `scripts/showcase/make-bundle.mjs`, `scripts/showcase/kit/read-me-first.txt`, `NOTICES.md` (N-007)

**Interfaces:**
- Produces: kit entries `Start Classroom.command`, `server/relay.mjs`, `server/relay.mjs.LICENSE-ws.txt`, `NOTICES.md`,
  `LICENSES/` (R50 I1); the launcher's knob `PME_NODE=<path>` (try only that Node: the version check's own test) and
  its two Node messages (R50 I4); the run sheet's pre-flight checklist (owner Q5).

- [ ] **Step 1: The check first (it fails: no launcher, no relay file)**

```bash
SP=<scratchpad>/stage-12
node scripts/showcase/make-bundle.mjs $SP/kit
ls "$SP/kit/Start Classroom.command" $SP/kit/server/relay.mjs
```

Expected before: `ls: …Start Classroom.command: No such file or directory` (and relay.mjs).

- [ ] **Step 2: Implement**

In `NOTICES.md`, find:

```markdown
| N-007 | ws 8.21.3 (relay runtime, Node only) | https://github.com/websockets/ws | MIT | WebSocket server for `packages/controller/relay`; never bundled into browser builds | 2026-09-24 |
```

Replace with:

```markdown
| N-007 | ws 8.21.3 (relay runtime, Node only) | https://github.com/websockets/ws | MIT | WebSocket server for `packages/controller/relay`; never bundled into browser builds. Stage 12: bundled unmodified into the showcase kit's `server/relay.mjs` (a Node file for the classroom, not a browser build), its licence text beside it as `server/relay.mjs.LICENSE-ws.txt` | 2026-09-24 |
```

Create `docs/showcase/CLASSROOM.md`:

```markdown
# Learners' phones: the run sheet (Stage 12)

*For the presenter and the helper. The phones are LIVE followers of the instructor's case: they show the same
patient, clock and numbers as the main screen, over the venue network. The second screen in the same browser
("Open on a second screen") is unchanged and is the fallback whenever the phones cannot join.*

## Pre-flight checklist (the owner; do it the day before)

Open questions for the owner (Q5): **which network on the day** (venue Wi-Fi, a travel router or this Mac's hotspot)
and **the presenting Mac's Node.js**. Until they are settled, tick every line:

- [ ] **Node.js 22 or later on the presenting Mac.** In Terminal: `node -v` prints `v22…` or later. If it prints an
  older version or "command not found", install the **LTS** from **nodejs.org** (the macOS installer), then check
  again. (The kit's own `runtime/` is empty when it was built with Homebrew's Node; "Start Classroom" says which Node it
  found and stops with this same instruction if it is too old.)
- [ ] **Start Classroom runs**: double-click it; its window says "THE CLASSROOM IS RUNNING" and lists "learners'
  phones reach it at: http://…". Click **Allow** if macOS asks about incoming connections for "node".
- [ ] **The hotspot path works** (the fallback network you carry): turn on the Mac's hotspot (System Settings >
  General > Sharing > Internet Sharing, to Wi-Fi), join it with **your own phone**, open the Monitor view, click
  **Phones**, scan: your phone shows the monitor within a few seconds and the count says "1 phone following". Note
  how many phones you could test with.
- [ ] **The venue network works**, if you can reach it: the same scan on the venue Wi-Fi. "This phone cannot reach the
  instructor's laptop" means the Wi-Fi keeps devices apart: plan on the hotspot or a travel router.
- [ ] **The QR code points at this laptop**, never at the hosted site: the code shows `http://<this Mac's address>:…`.
  The hosted (https) copy cannot reach the laptop; a phone that opens it only waits ("Waiting for the instructor…").

## What the room sees

- A learner scans the QR code on the projector. The phone opens **the monitor alone**, upright: the waveforms over the
  full width, the numbers in a grid under them, the alarm bar at the top, and under it a line such as
  "Following session QFBAWA", **Sound off** and **Silence here**. Nothing on the phone can change the case.
- The phones wear **your monitor style** (Saadat-style, Philips-style, …) upright, and follow when you change it.
- Phones start **silent**. A learner who wants the alarm sound taps **Sound off** (it turns to **Sound on**);
  **Silence here** quiets that phone only.
- Speed (×1–×8), Pause and the 2- and 5-minute **fast-forward** reach every phone (the fast-forward panel shows on the
  phones too, and the phones catch up at its end).
- While the **Ventilator view** ventilates the patient, the phones cannot follow the patient (the cockpit's breaths do
  not go over the network): they hold still and say "The ventilator is on the main screen". They follow again with the
  next case or a patient restart. Plan any case where you open the Ventilator view (e.g. bronchospasm, in the
  library) for the main screen.
- A phone that is locked, switched to another app or loses the Wi-Fi for a moment catches up by itself when it comes
  back ("Connection lost: reconnecting…" while it is away).
- One session takes up to **60 phones**; the 61st is told "This session is full: please watch the main screen".

## The day before (at the venue if at all possible)

1. Start the kit with **Start Classroom** on the presenting Mac. When macOS asks whether "node" may accept incoming
   network connections, click **Allow** (if it was refused once: System Settings > Network > Firewall > Options, set
   node to "Allow incoming connections").
2. Join the network you will use (a or b below), open the **Monitor** view, move the pointer to the top edge, click
   **Phones**. Scan the code with **your own phone** on the same network. If the phone shows the monitor within a few
   seconds, the network works. If it shows "this phone cannot reach the instructor's laptop", the network keeps devices
   apart (client isolation, common on guest and hotel Wi-Fi): use (b).

## (a) Venue Wi-Fi

1. Mac and phones on the same Wi-Fi (the guest network usually isolates devices: ask for the staff network, or test as
   above).
2. Double-click **Start Classroom**; leave its black window open.
3. Load the case as usual (Instructor > Scenario > Showcase > Load).
4. **The QR moment** (below). Close the sheet with **Close**; teach as usual.

## (b) A local network you bring (the Mac's own hotspot or a travel router)

1. **Travel router (recommended for 30 phones):** power it on, join the Mac to it, put its network name and password
   on the first slide. No internet is needed.
2. **The Mac's hotspot** (System Settings > General > Sharing > Internet Sharing, "Share from" a wired or iPhone-USB
   connection, "to" Wi-Fi): it needs a second connection to share, and how many phones it carries was NOT measured
   here — test with as many phones as you can the day before. A phone's own hotspot carries only a handful of devices:
   not for a room.
3. Then (a) steps 2–4. The QR code uses the hotspot's address first.

## (c) No usable network

Do not show the QR code. Use **Start Simulator** as before and **Open on a second screen** for the projector. If
learners scanned a code anyway, their phones say "Waiting for the instructor: this phone cannot reach the instructor's
laptop. Is it on the classroom Wi-Fi?" — nothing breaks.

## The QR moment (what to say and do)

1. Monitor view on the projector. Move the pointer to the top edge, click **Phones** (on the other views: **Phones**
   at the top right). The QR code fills the screen, with the address and the 6-letter code under it and
   "0 phones following".
2. Say: *"Please join the Wi-Fi called ‹network› and scan this code with your camera. You will get the monitor on your
   phone — it follows what I do here. It is silent: tap Sound off if you want to hear it."*
3. Watch the count rise ("12 phones following"). If a phone does not open the page: is it on that Wi-Fi? (mobile data
   cannot reach the laptop). If the code does not open, the sheet lists the laptop's other addresses to type in.
4. Click **Close** and start the case. The QR can be shown again at any time (late arrivals).

## If something goes wrong

| What you see | What to do |
|---|---|
| "Start Classroom" says it needs Node.js | Use **Start Simulator**: everything but the phones works. |
| The sheet says "The relay does not answer" | Close the Classroom window, double-click **Start Classroom** again, reload the page. |
| The sheet says "This computer is on no network" | Join the Wi-Fi (or turn on the hotspot), click **Phones** again. |
| Phones say "cannot reach the instructor's laptop" | They are on another network, or the Wi-Fi isolates devices: use (b), or (c). |
| Phones say "The instructor's monitor is not answering" | The instructor's page was closed or reloaded: reopen it from the Classroom window's address; the phones find it again. |
| A phone says "The ventilator is on the main screen" | Expected while the Ventilator view runs this case. |
| A phone says "This session is full" | 60 phones are following; ask a neighbour to share a screen. |

Measured on the presenting Mac class of machine (Apple M3, Stage 12 plan "Capacity"): 30 phones cost the relay under
2 % of one core and under 70 MB; each phone receives about 1.3 KB/s at ×1 and about 10 KB/s at ×8 (30 phones at ×8:
≈ 0.3 MB/s on the Wi-Fi), and about 100 KB once when it joins or catches up.
```

In `scripts/showcase/kit/read-me-first.txt`, find:

```text
7. If nothing works, use the rescue card; the recorded cases are in the "videos" folder.
```

Replace with:

```text
7. If nothing works, use the rescue card; the recorded cases are in the "videos" folder.

LEARNERS' PHONES (optional; needs Node.js 22 or later on this Mac, and a network the phones share with it)
   Before the day: in Terminal, "node -v" must print v22 or later; if not, install the LTS from nodejs.org. Test it the
   day before with your own phone on the network you will use (the venue Wi-Fi, or this Mac's hotspot).
8. Instead of "Start Simulator", double-click "Start Classroom". If macOS asks whether "node" may accept incoming
   network connections, click Allow. The QR code points at THIS Mac: phones must be on the same network.
9. On the Monitor view, move the pointer to the top edge and click "Phones" (or "Phones" at the top right of the other
   views): a QR code fills the screen. Learners scan it; their phones show the monitor and follow your case.
10. Phones start with their sound off; each learner taps "Sound off" to hear it. Close the QR with "Close".
11. If "Start Classroom" says it cannot start, use "Start Simulator": everything works except the phones.
```

Create `scripts/showcase/kit/start-classroom.command`:

```bash
#!/bin/bash
# Start Classroom — double-click this file in Finder (Stage 12: learners' phones follow the monitor).
#
# It starts the simulator's relay on this computer's NETWORK address: it serves the simulator to this computer and to
# learners' phones on the same Wi-Fi (or this Mac's hotspot), and carries the session from the instructor's page to the
# phones. Phones may only FOLLOW (they cannot run the case). It needs Node.js 22 or later: the kit's own runtime/ if it
# has one, else a Node.js installed on this Mac. Without one, use "Start Simulator" (the second screen still works).
# It writes nothing into its own folder; temporary files go to $TMPDIR.
#
# Knobs for the kit's own tests (a presenter never needs them):
#   PME_NO_OPEN=1      do not open the browser
#   PME_PORT=8650      first port to try (the next 9 are tried if it is busy)
#   PME_NODE=/path     try only this Node.js (the Node >= 22 check's own test)

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/app"
RELAY="$DIR/server/relay.mjs"
RT="$DIR/runtime"
START_PORT="${PME_PORT:-8650}"
RPID=""
TMPD=""

printf '\033[8;34;92t' 2>/dev/null
say() { printf '%s\n' "$@"; }
big() {
  say ""
  say "  ======================================================================"
  for line in "$@"; do printf '  \033[1m%s\033[0m\n' "$line"; done
  say "  ======================================================================"
  say ""
}
fail() {
  big "THE CLASSROOM COULD NOT START" "$1"
  if [ -n "$3" ]; then say "  $3"; say ""; fi
  say "  Nothing on this computer has been changed."
  say "  You can still run the case without phones: close this window and double-click \"Start Simulator\"."
  say ""
  say "  (technical detail for the helper: $2)"
  say ""
  exit 1
}
cleanup() {
  if [ -n "$RPID" ]; then kill "$RPID" 2>/dev/null; fi
  if [ -n "$TMPD" ]; then rm -rf "$TMPD"; fi
}
trap cleanup EXIT
trap 'exit 0' HUP INT TERM

clear 2>/dev/null
big "PATIENT MONITOR SIMULATOR - CLASSROOM" "Starting... please wait a few seconds."
[ -f "$APP/index.html" ] && [ -f "$RELAY" ] || fail "The kit is incomplete: the app or the relay is missing." "no $APP/index.html or $RELAY"

# Node.js 22 or later: the kit's runtime first, then an installed one; an older one is named, with the way out (R50 I4)
NODE=""
OLD=""
OLDP=""
if [ -n "${PME_NODE:-}" ]; then
  CANDIDATES=("$PME_NODE")
else
  CANDIDATES=("$RT/node-$(uname -m)" "$RT/node-arm64" "$RT/node-x86_64" "$(command -v node 2>/dev/null)" /opt/homebrew/bin/node /usr/local/bin/node)
fi
for n in "${CANDIDATES[@]}"; do
  [ -n "$n" ] && [ -x "$n" ] || continue
  if "$n" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' >/dev/null 2>&1; then NODE="$n"; break; fi
  [ -n "$OLD" ] || { OLD="$("$n" -v 2>/dev/null)"; OLDP="$n"; }
done
GET="Install Node.js from nodejs.org (the LTS, version 22 or later), then double-click \"Start Classroom\" again."
[ -n "$NODE" ] || [ -z "$OLD" ] || fail "Classroom mode needs Node.js 22 or later; this Mac has Node.js $OLD, which is too old." "found $OLD at $OLDP; no node >= 22" "$GET"
[ -n "$NODE" ] || fail "Classroom mode needs Node.js 22 or later, and this Mac has none." "no runtime/node-* and no node on PATH, /opt/homebrew/bin or /usr/local/bin" "$GET"

TMPD="$(mktemp -d "${TMPDIR:-/tmp}/pme-classroom.XXXXXX" 2>/dev/null)" || fail "This computer did not allow a temporary file." "mktemp failed"
LOG="$TMPD/relay.log"
PORT=""
p=$START_PORT
while [ $p -lt $((START_PORT + 10)) ]; do
  "$NODE" "$RELAY" --port "$p" --static "$APP" >"$LOG" 2>&1 &
  RPID=$!
  i=0
  while [ $i -lt 50 ]; do
    if grep -q 'ready on ws://' "$LOG" 2>/dev/null; then PORT=$p; break 2; fi
    kill -0 "$RPID" 2>/dev/null || break
    sleep 0.2
    i=$((i + 1))
  done
  kill "$RPID" 2>/dev/null
  RPID=""
  p=$((p + 1))
done
[ -n "$PORT" ] || fail "The classroom relay did not start." "$(tail -n 3 "$LOG" 2>/dev/null | tr '\n' ' ')"

URL="http://127.0.0.1:$PORT/?relay#/"
if [ -z "${PME_NO_OPEN:-}" ]; then
  /usr/bin/open "$URL" >/dev/null 2>&1 || say "  (The browser did not open by itself: type the address below.)"
fi
clear 2>/dev/null
big "THE CLASSROOM IS RUNNING" "" "The simulator has opened in your web browser." "" "LEAVE THIS WINDOW OPEN while you teach." "To stop: close this window (click \"Terminate\" if asked)."
say "  If macOS asks whether \"node\" may accept incoming network connections: click ALLOW (phones need it)."
say ""
say "  On this computer:  127.0.0.1:$PORT/?relay"
say "  Phones join with the QR code: Monitor view, \"Phones\" (or the \"Phones\" button at the top right)."
grep "phones reach it at" "$LOG" | sed 's/^ */  /'
say ""
say "ADDRESS: $URL"
say "SERVER: node $("$NODE" -v) ($NODE)"

wait "$RPID"
RPID=""
fail "The classroom relay stopped unexpectedly." "$(tail -n 3 "$LOG" 2>/dev/null | tr '\n' ' ')"
```

In `scripts/showcase/make-bundle.mjs`, find:

```js
//   server/                   serve.mjs (bundled node), serve.rb (ruby/WEBrick), serve.pl (core perl), serve.py
//   runtime/                  node-<arch> ONLY if this machine's node is an official signed Node.js build; else empty
//   READ ME FIRST.txt, VERSION.txt
```

Replace with:

```js
//   Start Classroom.command   Stage 12: the relay on the network address, for learners' phones (needs Node.js ≥ 22)
//   server/                   serve.mjs (bundled node), serve.rb (ruby/WEBrick), serve.pl (core perl), serve.py;
//                             relay.mjs (Stage 12: pme-relay in one file, its `ws` dependency inside)
//   runtime/                  node-<arch> ONLY if this machine's node is an official signed Node.js build; else empty
//   READ ME FIRST.txt, VERSION.txt
//   NOTICES.md, LICENSES/     Stage 12 (R50 I1): the notices of what the kit's app and relay carry (MIT/BSD texts)
```

In `scripts/showcase/make-bundle.mjs`, find:

```js
const KIT = ['app', 'server', 'runtime', 'Start Simulator.command', 'READ ME FIRST.txt', 'VERSION.txt'];
```

Replace with:

```js
const KIT = ['app', 'server', 'runtime', 'Start Simulator.command', 'Start Classroom.command', 'READ ME FIRST.txt', 'VERSION.txt', 'NOTICES.md', 'LICENSES'];
```

In `scripts/showcase/make-bundle.mjs`, find:

```js
cpSync(join(here, 'server'), join(out, 'server'), { recursive: true });
for (const f of readdirSync(join(out, 'server'))) chmodSync(join(out, 'server', f), 0o755);
```

Replace with:

```js
copyFileSync(join(repo, 'NOTICES.md'), join(out, 'NOTICES.md')); // Stage 12 (R50 I1): the app carries MIT code (qr.ts, ajv)
cpSync(join(repo, 'LICENSES'), join(out, 'LICENSES'), { recursive: true });
cpSync(join(here, 'server'), join(out, 'server'), { recursive: true });
for (const f of readdirSync(join(out, 'server'))) chmodSync(join(out, 'server', f), 0o755);
copyFileSync(join(kit, 'start-classroom.command'), join(out, 'Start Classroom.command')); // Stage 12
chmodSync(join(out, 'Start Classroom.command'), 0o755);

step('classroom relay (Stage 12: one file, ws inside; runs on any Node.js >= 22)');
const { build } = await import('vite');
await build({
  configFile: false, root: repo, logLevel: 'warn',
  ssr: { noExternal: true, target: 'node' },
  build: {
    ssr: join(repo, 'packages/controller/relay/bin.ts'), outDir: join(out, 'server'), emptyOutDir: false, minify: false, target: 'node22',
    rollupOptions: { output: { entryFileNames: 'relay.mjs', inlineDynamicImports: true } },
  },
});
if (!existsSync(join(out, 'server/relay.mjs'))) throw new Error('the relay bundle was not written');
copyFileSync(join(repo, 'packages/controller/node_modules/ws/LICENSE'), join(out, 'server/relay.mjs.LICENSE-ws.txt')); // NOTICES N-007 (MIT)
```

In `scripts/showcase/make-bundle.mjs`, find:

```js
  'Servers tried in order: bundled node, /usr/bin/ruby (WEBrick), /usr/bin/perl (core modules), python3 (only a real one).',
```

Replace with:

```js
  'Servers tried in order: bundled node, /usr/bin/ruby (WEBrick), /usr/bin/perl (core modules), python3 (only a real one).',
  'Classroom: server/relay.mjs (pme-relay + ws 8.21.3, MIT) on runtime/node-* or an installed Node.js >= 22.',
```

`chmod 755 scripts/showcase/kit/start-classroom.command` (git records the mode).

- [ ] **Step 3: Build the kit and start the classroom headless**

```bash
node scripts/showcase/make-bundle.mjs $SP/kit
(PME_NO_OPEN=1 PME_PORT=8750 "$SP/kit/Start Classroom.command" > $SP/launch.log 2>&1 < /dev/null & echo $! > $SP/launch.pid)
n=0; until grep -q 'ADDRESS:' $SP/launch.log || ! kill -0 $(cat $SP/launch.pid) || [ $n -ge 120 ]; do sleep 0.5; n=$((n+1)); done
curl -s http://127.0.0.1:8750/pme-relay.json; curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:8750/?join=ABCDEF'
kill $(cat $SP/launch.pid)
```

Expected (prototype): the window text "THE CLASSROOM IS RUNNING", "learners' phones reach it at: http://<address>:8750/",
`{"relay":"pme","port":8750,"addresses":[…],"serves":true}`, `200`; after the kill nothing listens on 8750
(`lsof -nP -iTCP:8750 -sTCP:LISTEN` prints nothing). `ls $SP/kit/server` lists `relay.mjs` (≈ 139 KB) and
`relay.mjs.LICENSE-ws.txt`; `ls $SP/kit` lists `NOTICES.md` and `LICENSES` (with `qrcodegen-MIT.txt`).
`node --experimental-strip-types scripts/check-notices.ts .` → OK.

The Node check (R50 I4), with a stand-in for an old Node:

```bash
mkdir -p $SP/oldnode && printf '#!/bin/bash\n[ "$1" = "-v" ] && { echo v20.11.1; exit 0; }\nexit 1\n' > $SP/oldnode/node && chmod +x $SP/oldnode/node
PME_NO_OPEN=1 PME_NODE=$SP/oldnode/node "$SP/kit/Start Classroom.command" < /dev/null 2>&1 | grep -E 'needs|Install'
PME_NO_OPEN=1 PME_NODE=/nonexistent "$SP/kit/Start Classroom.command" < /dev/null 2>&1 | grep -E 'needs|Install'
```

Expected: "Classroom mode needs Node.js 22 or later; this Mac has Node.js v20.11.1, which is too old." then "…, and this
Mac has none."; both followed by "Install Node.js from nodejs.org (the LTS, version 22 or later), then double-click
"Start Classroom" again."; nothing started (`lsof -nP -iTCP:8650 -sTCP:LISTEN` prints nothing).

- [ ] **Step 4: Commit and push**

```bash
git add scripts/showcase docs/showcase/CLASSROOM.md NOTICES.md
git commit -m "feat(kit): Stage 12 — Start Classroom (the relay bundled, ws inside) and the classroom run sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

### Task 9: The load test (by hand, never in CI) — the capacity table, re-measured

**Files:**
- Create: `scripts/classroom/playwright.classroom.config.ts`, `scripts/classroom/load.classroom.ts`

- [ ] **Step 1: Create the script and its config** (its own Playwright config: `pnpm test:e2e` and CI never run it)

Create `scripts/classroom/load.classroom.ts`:

```ts
// Stage 12: capacity of the classroom relay (docs/plans/stage-12-mobile-learner.md "Capacity"). One instructor page
// (Chromium) runs a showcase case on the BUILT app served by the relay (`pme-relay --static`, its own process), N
// simulated phones follow over WebSockets (a ViewerSync's traffic: hello as a viewer, a fresh hello on every new
// timeline, fast-forward end and host hello), and ONE real phone page (Pixel 7 emulation, CPU slowed down) follows too.
// Per phase (×1, ×8, a 2-minute fast-forward): messages and bytes per second out of the relay, the relay's CPU and
// memory, the followers' lag (receive time − the host's sentAt: one clock, one machine), the instructor page's frame
// interval and the phone page's frame interval and sync state. Writes test-results/classroom/load-<n>-<case>.json.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';

const repo = resolve(import.meta.dirname, '../..');
const N = Number(process.env.CLASSROOM_N ?? 30);
const THROTTLE = Number(process.env.CLASSROOM_THROTTLE ?? 4);
const PHASE_S = Number(process.env.CLASSROOM_PHASE_S ?? 60);
const VENT = process.env.CLASSROOM_VENT === '1';
const CASE = process.env.CLASSROOM_CASE ?? (VENT ? 'showcase-bronchospasm' : 'showcase-anaphylaxis');

const q = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))]! : NaN);
const r1 = (x: number) => Math.round(x * 10) / 10;

let relay: ChildProcess | null = null;
test.afterAll(() => void relay?.kill('SIGTERM'));

/** A simulated phone: a viewer's traffic, counted. */
class Sim {
  ws: WebSocket;
  msgs = 0;
  bytes = 0;
  lags: number[] = [];
  snapshots = 0;
  refused: string | null = null;
  private seq = 0;
  private readonly code: string;
  private readonly id: string;
  constructor(url: string, code: string, id: string) {
    this.code = code;
    this.id = id;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => this.hello();
    this.ws.onmessage = (ev) => {
      const s = String(ev.data);
      this.msgs++;
      this.bytes += s.length;
      const m = JSON.parse(s) as { kind?: string; sentAt?: number; role?: string; body?: Array<{ type: string; phase?: string }>; relay?: string; code?: string };
      if (m.relay === 'error') this.refused = m.code ?? 'error';
      if (typeof m.sentAt === 'number') this.lags.push(Date.now() - m.sentAt);
      if (m.kind === 'snapshot') this.snapshots++;
      if (m.kind === 'hello' && m.role === 'host') this.hello();
      if (m.kind === 'event' && m.body?.some((e) => e.type === 'timeline' || (e.type === 'fastForward' && e.phase === 'end'))) this.hello();
    };
  }
  hello(): void {
    this.ws.send(JSON.stringify({ v: 1, session: this.code, from: this.id, seq: ++this.seq, sentAt: Date.now(), kind: 'hello', role: 'viewer' }));
  }
  take() {
    const o = { msgs: this.msgs, bytes: this.bytes, lags: this.lags, snapshots: this.snapshots };
    this.msgs = 0;
    this.bytes = 0;
    this.lags = [];
    this.snapshots = 0;
    return o;
  }
}

const cpuSeconds = (pid: number) => {
  const t = execFileSync('ps', ['-o', 'time=', '-p', String(pid)], { encoding: 'utf8' }).trim(); // [[dd-]hh:]mm:ss.cc
  return t.split(/[-:]/).map(Number).reduce((a, x) => a * 60 + x, 0);
};
const rssMb = (pid: number) => Number(execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' }).trim()) / 1024;
/** The tiles as `PARAM:value` — the phone's and the instructor's agree at some moment of every second when it follows. */
const tiles = (p: Page) => p.evaluate(() => [...document.querySelectorAll('.pme-stile')].map((e) => `${(e as HTMLElement).dataset.param}:${e.querySelector('[data-pme="v"]')?.textContent}`).join(' '));
const frames = (p: Page) => p.evaluate(() => (window as unknown as { __pmeApp: { frames: number[] } }).__pmeApp.frames.splice(0));

test(`classroom load: ${N} followers, ${CASE}`, async ({ page, browser }) => {
  let app = process.env.CLASSROOM_APP;
  if (!app) {
    app = join(mkdtempSync(join(tmpdir(), 'pme-classroom-')), 'app');
    execFileSync(join(repo, 'node_modules/.bin/vite'), ['build', '--base', './', '--outDir', app, '--emptyOutDir', '--logLevel', 'error'], { cwd: join(repo, 'apps/demo'), stdio: 'inherit' });
  }
  relay = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', join(repo, 'packages/controller/relay/bin.ts'), '--host', '127.0.0.1', '--port', '0', '--static', app, '--quiet', '--max-peers', String(Math.max(60, N + 5))], { stdio: ['ignore', 'pipe', 'inherit'] });
  const port = await new Promise<number>((ok, no) => {
    let out = '';
    const t = setTimeout(() => no(new Error(`relay gave no port: ${out}`)), 15_000);
    relay!.stdout!.on('data', (b) => {
      out += b;
      const m = /ready on ws:\/\/[^:]+:(\d+)\//.exec(out);
      if (m) (clearTimeout(t), ok(Number(m[1])));
    });
  });
  const pid = relay.pid!;
  const base = `http://127.0.0.1:${port}`;
  await page.goto(`${base}/?relay&scenario=${CASE}`);
  await page.waitForFunction(() => '__pmeApp' in window);
  await page.waitForTimeout(2000);
  const code = await page.evaluate(() => (window as unknown as { __pmeApp: { session: { code: string } } }).__pmeApp.session.code);
  if (VENT) await page.evaluate(() => (location.hash = '#/vent'));

  // the real phone page, CPU slowed down like a mid-range phone
  const { defaultBrowserType: _b, ...pixel } = devices['Pixel 7'];
  const ctx = await browser.newContext(pixel);
  const phone = await ctx.newPage();
  const cdp = await ctx.newCDPSession(phone);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await phone.goto(`${base}/?join=${code}`);
  await phone.waitForFunction(() => (window as unknown as { __pmeFollower?: { sync?: { status: string } } }).__pmeFollower?.sync?.status === 'synced', null, { timeout: 60_000 });

  const sims = Array.from({ length: N }, (_, i) => new Sim(`ws://127.0.0.1:${port}/`, code, `sim-${i}`));
  await expect.poll(() => sims.filter((s) => s.snapshots > 0).length, { timeout: 60_000 }).toBe(N);
  const phoneSync = () => phone.evaluate(() => { const s = (window as unknown as { __pmeFollower: { sync: { status: string; resyncs: number; lagS: number } } }).__pmeFollower.sync; return { status: s.status, resyncs: s.resyncs, lagS: s.lagS }; });
  const send = (c: unknown) => page.evaluate((x) => (window as unknown as { __pmeApp: { link: { send(c: unknown): Promise<{ accepted: boolean; reason?: string }> } } }).__pmeApp.link.send(x), c);

  const rows: Record<string, unknown>[] = [];
  const phase = async (name: string, seconds: number) => {
    for (const s of sims) s.take();
    await frames(page);
    await frames(phone);
    const c0 = cpuSeconds(pid);
    const w0 = Date.now();
    const rss: number[] = [];
    const rs0 = (await phoneSync()).resyncs;
    for (let i = 0; i < seconds; i++) {
      await page.waitForTimeout(1000);
      rss.push(rssMb(pid));
    }
    const wall = (Date.now() - w0) / 1000;
    const cpu = (cpuSeconds(pid) - c0) / wall;
    const got = sims.map((s) => s.take());
    const msgs = got.reduce((a, g) => a + g.msgs, 0);
    const bytes = got.reduce((a, g) => a + g.bytes, 0);
    const lags = got.flatMap((g) => g.lags);
    const hostF = await frames(page);
    const phoneF = await frames(phone);
    const ps = await phoneSync();
    const holding = await phone.locator('.learner-hold').isVisible();
    let tilesEqual = false;
    for (let i = 0; i < 100 && !holding && !tilesEqual; i++) tilesEqual = (await tiles(phone)) === (await tiles(page)) || (await page.waitForTimeout(100), false);
    const row = {
      phase: name, followers: N + 1, seconds: r1(wall),
      relayOutMsgPerS: Math.round(msgs / wall), perFollowerMsgPerS: r1(msgs / wall / N), relayOutKBPerS: Math.round(bytes / wall / 1024), perFollowerKBPerS: r1(bytes / wall / 1024 / N),
      snapshotsPerFollower: r1(got.reduce((a, g) => a + g.snapshots, 0) / N),
      relayCpuPct: r1(cpu * 100), relayRssMbMax: r1(Math.max(...rss)),
      lagMsP50: q(lags, 0.5), lagMsP95: q(lags, 0.95), lagMsMax: Math.max(...lags),
      hostFrameMsP50: r1(q(hostF, 0.5)), hostFrameMsP95: r1(q(hostF, 0.95)),
      phoneFrameMsP50: r1(q(phoneF, 0.5)), phoneFrameMsP95: r1(q(phoneF, 0.95)), phoneFrameMsMax: r1(Math.max(...phoneF)), phoneThrottle: THROTTLE,
      phoneStatus: holding ? 'holding' : ps.status, phoneTilesEqual: holding ? null : tilesEqual, phoneResyncs: ps.resyncs - rs0, phoneLagS: r1(ps.lagS),
      refused: sims.filter((s) => s.refused).length,
    };
    rows.push(row);
    console.log(JSON.stringify(row));
  };
  const speed = async (k: number) => expect((await send({ type: 'time', action: 'scale', value: k })).accepted).toBe(true);

  await phase('x1', PHASE_S);
  await speed(8);
  await phase('x8', PHASE_S);
  await speed(1);
  expect((await send({ type: 'time', action: 'jump', value: 120 })).accepted).toBe(true);
  await phase('fast-forward 2 min (+ resync)', 20);
  // one more than the session takes is refused, not served
  const extra = Array.from({ length: Math.max(0, Math.max(60, N + 5) - N) }, (_, i) => new Sim(`ws://127.0.0.1:${port}/`, code, `extra-${i}`));
  await page.waitForTimeout(3000);
  const over = new Sim(`ws://127.0.0.1:${port}/`, code, 'over');
  await expect.poll(() => over.refused, { timeout: 10_000 }).toBe('full');
  for (const s of [...sims, ...extra, over]) s.ws.close();
  mkdirSync(join(repo, 'test-results/classroom'), { recursive: true });
  writeFileSync(join(repo, `test-results/classroom/load-${N}-${CASE}.json`), JSON.stringify(rows, null, 2));
  await ctx.close();
});
```

Create `scripts/classroom/playwright.classroom.config.ts`:

```ts
// Stage 12 classroom proofs (not part of `pnpm test:e2e`, not in CI): the relay under a room of phones.
//   npx playwright test -c scripts/classroom/playwright.classroom.config.ts
//   knobs: CLASSROOM_APP=<built app dir> (default: built now into a temp dir), CLASSROOM_N=30 (simulated followers),
//          CLASSROOM_THROTTLE=4 (the real phone page's CPU slowdown, Chromium), CLASSROOM_PHASE_S=60, CLASSROOM_VENT=1
//          (the bronchospasm case with the Ventilator view driving the patient: the phones hold)
//          CLASSROOM_CASE=<scenario id> (default showcase-anaphylaxis; the gate runs each showcase card)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.classroom.ts',
  reporter: 'list',
  workers: 1,
  timeout: 30 * 60_000,
  retries: 0,
  outputDir: '../../test-results/classroom',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } }],
});
```

- [ ] **Step 2: Run it** (one run at a time; it starts its own relay and builds the app unless `CLASSROOM_APP` names a
  built one, e.g. the kit's `app/`):

```bash
CLASSROOM_APP=$SP/kit/app CLASSROOM_N=30 npx playwright test -c scripts/classroom/playwright.classroom.config.ts
CLASSROOM_APP=$SP/kit/app CLASSROOM_N=30 CLASSROOM_VENT=1 CLASSROOM_PHASE_S=30 npx playwright test -c scripts/classroom/playwright.classroom.config.ts
CLASSROOM_APP=$SP/kit/app CLASSROOM_N=120 CLASSROOM_PHASE_S=30 npx playwright test -c scripts/classroom/playwright.classroom.config.ts
```

Expected: `1 passed` each; one JSON line per phase; `test-results/classroom/load-<N>-<case>.json`. Compare with the
Capacity table: a relay CPU over 10 % at 30 phones, a lag p95 over 100 ms, a phone that is not `synced`, or a 61st
phone that is not refused is a finding for the gate note (not a band: this machine is shared — record the load average).

- [ ] **Step 3: Commit and push**

```bash
git add scripts/classroom
git commit -m "test(classroom): Stage 12 — the relay under a room of phones (load test, by hand)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

## Gate — merge main, full verification on both engines, the six-card rehearsal with a phone room, ONE real phone through the six cards, gate note, pull request

The Showcase group is SIX cards once Stage 11 has merged (its D-11 order today: `showcase-induction`,
`showcase-induction-premed`, `showcase-anaphylaxis`, `showcase-mh`, `showcase-tamponade`, `showcase-haemorrhage`).
Read the ids from main's Showcase group, not from this list. Stage 11 moves `showcase-bronchospasm` OUT of the group (it
stays in the library): the Ventilator-view hold is checked on it separately.

- [ ] **Step 1: Merge main, re-check the blocks** — `git fetch origin && git merge origin/main` (resolve nothing by
  re-typing; a conflict in a FU-11/Stage 10 file: keep theirs and re-apply this plan's block by its neighbours), then
  `python3 ../plans-backup/stage-12-plan-tools/check.py … --base-dir <a checkout of the merge base>`.
- [ ] **Step 2: Full suites (once)** — `npx -y pnpm@9.15.9 -r typecheck`; `npx -y pnpm@9.15.9 -r test` (CI=1); the full
  e2e `npx playwright test --retries=0` (both engines). Record counts against Task 0's.
  Then `fu11-follower`'s "it follows while the Ventilator view drives the patient" on WebKit five times on the branch
  and five times on `origin/main`, alternating (`-g "Ventilator view drives" --project=webkit`). If the branch fails it
  more often than main, STOP and find the path. R50 M7 localised the failure seen in prototyping: the second screen's
  resync comes from `viewer-sync.ts`'s "too late to mirror exactly" (a mirrored Ventilator frame arrives at a tick the
  follower has already passed) — FU-11 K2 code, which no Stage 12 change touches in that test (no relay transport; R50
  M1 removed the one extra stamped message). On any failure, log the cause the same way: in the follower page,
  `const s = __pmeFollower.sync, o = s.requestSync.bind(s); s.requestSync = (x) => (console.log('RESYNC', x,
  new Error().stack), o(x));` right after it is `synced`, and put the first stack frame in the gate note.
- [ ] **Step 3: The six-card rehearsal with a phone room (emulated).** (a) The scripted rehearsal, unchanged, on a kit
  built from the branch (Task 8 Step 3; `SHOWCASE_KIT=$SP/kit npx playwright test -c
  scripts/showcase/playwright.showcase.config.ts rehearsal`): the six cards on both engines, every number compared with
  the last rehearsal of `origin/main` run THE SAME DAY (FU-11 R50 F7) — Stage 12 changes no physiology, so any
  difference beyond the run-to-run spread STOPS the gate. (b) The six cards with a room following: for each id,
  `CLASSROOM_APP=$SP/kit/app CLASSROOM_N=29 CLASSROOM_PHASE_S=30 CLASSROOM_CASE=<id> npx playwright test -c
  scripts/classroom/playwright.classroom.config.ts`: 29 simulated phones plus ONE phone page (Pixel 7, CPU ×4) follow
  the case at ×1, ×8 and through a 2-minute fast-forward. Each phase's line must read
  `"phoneStatus":"synced","phoneTilesEqual":true`; then once more with `CLASSROOM_CASE=showcase-bronchospasm
  CLASSROOM_VENT=1` (the library case with the Ventilator view: `"holding"` while it drives). Record the table
  (Capacity's columns + the case). Prototype (tamponade, 29 + 1, 20-s phases): synced and tiles equal in all three
  phases. A phone that is not following STOPS the gate. On WebKit (no CPU throttling, no `newCDPSession`), Task 7's e2e
  is the phone-viewport check.
- [ ] **Step 4: THE SHOWCASE PROOF — one real phone (the owner's) through the six cards over the laptop's hotspot (by
  hand; orchestrator ruling).** The executor prepares it and the OWNER does it; the PR does not merge without it.
  Prepare: the kit built from the branch (Step 3) on the presenting Mac (or this Mac if the owner says so), the
  table below as `docs/gates/stage-12-real-phone.md`, and a message to the owner with the steps. The run: the Mac's
  hotspot on (System Settings > General > Sharing > Internet Sharing, to Wi-Fi); the owner's phone joins it; **Start
  Classroom**; the Monitor view on the projector-sized screen; **Phones**; the phone scans the code; then the six cards
  in order, as the run sheet presents them (speeds, fast-forwards, the events), the phone beside the screen the whole
  time. Record per card:

  | Card | Scan → "Following" (s, first card only) | Resyncs seen (status line left "Following") | Each fast-forward: end → "Following" (s) | Tiles equal to the screen at 3 moments (y/n each) | Sound on, then off (heard / silent) | Notes |
  |---|---|---|---|---|---|---|

  plus, once: a 60 s screen lock and unlock → "Following" again in ___ s (> 15 s is a follow-up, R50 M6); the phone's
  model and browser; the hotspot's name and how many other devices were on it; the relay's peer count on the sheet;
  one screenshot per card to `docs/gates/stage-12/`. If time allows, the bronchospasm library case with the Ventilator
  view: the phone shows "The ventilator is on the main screen" and follows again with the next case. Any card the
  phone does not follow STOPS the merge (the gate note says which and what the status line said).
  If the owner has a second phone of the other kind (iPhone / Android), the scan, the Sound tap and the lock once on it.
- [ ] **Step 5: Load test** — Task 9 Step 2's three runs; the capacity table in the gate note with the load average.
- [ ] **Step 6: Gate note** `docs/gates/stage-12.md`: before/after counts, the six-card rehearsal table with the phone
  columns, the load table, the real-phone table (Step 4; PENDING-OWNER until done), any block re-located after the
  merge, the owner questions' state (Q5 open: network on the day, Node on the presenting Mac).
- [ ] **Step 7: Pull request** — `gh pr create --base main --head stage-12-mobile-learner --title "Stage 12: learners'
  phones — a QR-paired live learner monitor"`, body: the gate note's summary, Step 4's state (PENDING-OWNER until the
  owner's run is recorded — the PR is not to be merged before), the owner question Q5, and the trailer
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Stop: do not merge.

## The run sheet for the QR moment (also `docs/showcase/CLASSROOM.md`, Task 8)

**Pre-flight checklist (the owner, the day before; owner question Q5 stays open until it is done):**

- [ ] Node.js 22 or later on the presenting Mac: `node -v` in Terminal prints `v22…` or later; if not, install the LTS
  from **nodejs.org** (the macOS installer) and check again. "Start Classroom" names an older Node and says the same.
- [ ] Start Classroom runs ("THE CLASSROOM IS RUNNING", the phones' addresses listed); **Allow** "node" if macOS asks.
- [ ] The hotspot path: the Mac's hotspot on, your own phone on it, Monitor view → **Phones** → scan → the monitor on
  the phone within seconds, "1 phone following". Note how many phones you could try.
- [ ] The venue Wi-Fi, if reachable: the same scan ("cannot reach the instructor's laptop" = devices kept apart: use the
  hotspot or a travel router).
- [ ] The QR code points at THIS laptop (`http://<the Mac's address>:…`), never at the hosted site: the hosted https copy
  cannot reach a laptop; a phone that opens it only waits ("Waiting for the instructor…").

1. Monitor view on the projector. Move the pointer to the top edge, click **Phones** (on the other views: **Phones** at
   the top right). The QR code fills the screen, with the address and the 6-letter code under it and "0 phones
   following".
2. Say: *"Please join the Wi-Fi called ‹network› and scan this code with your camera. You will get the monitor on your
   phone — it follows what I do here. It is silent: tap Sound off if you want to hear it."*
3. Watch the count rise ("12 phones following"). A phone that does not open the page is on another network (mobile data
   cannot reach the laptop); the sheet also lists the laptop's other addresses to type in.
4. Click **Close** and start the case. The sheet can be shown again at any time for late arrivals. The phones wear your
   monitor style and follow a change of it.
5. Before a case where you open the Ventilator view (e.g. bronchospasm, in the library since Stage 11), say: *"Your
   phones will pause while the ventilator runs on the main screen; they pick up again with the next case."*

Network: (a) venue Wi-Fi — test with your own phone the day before (guest Wi-Fi often isolates devices); (b) a network
you bring — a travel router (recommended for 30 phones) or the Mac's Internet Sharing (needs a second connection to
share; its client capacity was not measured); (c) no usable network — do not show the code; **Start Simulator** and
**Open on a second screen** as before (a learner who scans anyway sees "Waiting for the instructor: this phone cannot
reach the instructor's laptop…").

## Mechanical self-check

`python3 ../plans-backup/stage-12-plan-tools/check.py <this plan> ../../repo ../plans-backup/stage-12-plan-tools/chain.txt`
(the chain's commits live in the repository's object store as unreferenced commits of the prototype worktree: run it
without `--base-dir` only while they exist; Task 0 and the gate use `--base-dir`). Prototype result: 75 find/replace
blocks + 15 creates over 34 files, 0 problems; each task's tree equals its chain commit, the final tree equals the
prototype (`stage-12-prototype.patch`, base → final, 34 files). Per task (find/replace · create): T1 21 · 2, T2 5 · 0,
T3 2 · 3, T4 7 · 1, T5 6 · 1, T6 14 · 2, T7 14 · 2, T8 6 · 2, T9 0 · 2 (after R50; the chain rebuilt in
`scratch/wt-stage-12-review`). Every task's commit typechecks (`pnpm -r typecheck`, 0 errors at T1–T9 one by one).

## Self-review

- **Brief coverage.** 1 Transport: relay classroom mode (T1), QR address + licence (T3, N-014), the instructor's sheet
  (T7). 2 The phone: portrait (T4), waveforms stacked + large numerics + alarm bar (T4/T6), no instructor controls (T7
  e2e asserts the only buttons), speed/pause/fast-forward/timeline per G2 (T6 + Stage 10's panel; T7 e2e), sound off +
  tap (D-9), Ventilator view not shown → hold line (T5/T6), reconnect (T6 liveness + visibility; T7 e2e relay restart),
  liveness "not answering" (reducer). 3 Capacity measured at 30 (×1, ×8), 60, 120 + the limit and the refusal (T1, T9,
  Capacity); security (D-4, T1 tests). 4 Fallbacks: the static page that waits (D-2; T7 e2e unreachable), run sheet
  a/b/c (T8, above). 5 Tests: unit QR payload (T3) and follower reducer (T6); e2e both engines at a phone viewport with
  speed changes and a fast-forward (T7); load test not in CI (T9). Partition: the ownership table. Gate: both engines,
  the six-card rehearsal with an emulated room, and ONE real phone through the six cards over the hotspot (Step 4).
- **R50 review additions** (`scratch/plans-backup/stage-12-review.md`): the instructor's style on the phones (Q4: T5
  protocol, T6 `phoneStyle`, T7 `session.ts` + e2e); a phone joining mid-fast-forward (T7 e2e); the relay rejects a busy
  port again, refuses `/signal` to another device, survives malformed HTTP (T1 tests); the welcome flag (T2 test); the
  cockpit notice to network transports only and outside FU-11's viewer window (T5 test); the QR encoder's MIT notice
  (T3: N-014, `LICENSES/qrcodegen-MIT.txt`, `qr.ts` header; T8: the kit ships `NOTICES.md` + `LICENSES/`); the
  launcher's Node messages and the run sheet's pre-flight checklist (T8); the real-phone gate step.
- **Placeholders:** none — every code step is a block cut from the prototype; `<scratchpad>` is the executor's own.
- **Types across tasks:** `VIEWER_EVENTS` (T2, extended T5 with `cockpit` and `style`), `phoneStyle`/`NO_PHONE_LAYOUT`
  (T6), `RelayInfo` (http.ts T1 / classroom.ts T3: same shape,
  two declarations on purpose — the relay is Node, the page is the browser), `NetFollow`, `followerStatus`,
  `ViewerSync.resync`, `COCKPIT_EVENT_MS`, `mountClassroomPanel`, `AppSession.followers/onFollowers` — names checked
  against the prototype by `check.py` (the blocks ARE the prototype).
- **Not achieved / not measured here:** real phones (emulation only; the gate's Step 4 does it with the owner's phone);
  the Mac's own hotspot capacity; the venue's Wi-Fi; a phone's lock-screen path and its recovery time (only the
  hidden-page logic is reasoned and covered by the relay-restart e2e; Step 4 records it); the six-card rehearsal with a
  phone room (the gate does it: it needs the merged FU-11/Stage 10/Stage 11 kit).
