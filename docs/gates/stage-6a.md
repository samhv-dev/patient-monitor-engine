# Gate 6a — Controllers and transports (date: 2026-09-24)

Gate question (BUILD-PLAN Stage 6, first half): "Can Ali drive the monitor from a phone or laptop without touching it, see a second monitor follow it, and recover cleanly from a Wi-Fi drop?" (The 10-minute ACLS scenario is Stage 6b.)

| Check | Result |
|---|---|
| Clean clone typecheck/test/build/check-notices (test totals) | exit code 0 (`git clone` of the branch into a scratch folder → `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build && pnpm check-notices`). **230 tests** in 52 files: controller **97 (20 files)**, engine-core 98 (18), renderer 21 (8; Stage 1 had 18 in 6 — the 3 new tests are Task 22b), audio 8 (3), validation 5 (2), skins 1. `check-notices: OK`. Controller `dist/index.js` 62.34 kB with 0 matches for `WebSocketServer`. IIFE `patient-monitor.iife.js` 82.46 kB (30.06 kB gzip; Stage 1 72.57 kB — the +10 kB is `PatientMonitor.transports`) |
| Transport conformance (5 transports × 6 checks, + WebRTC reconnect) | pass, **37 tests**: in-process 6, postMessage 6 (Node `MessageChannel`), BroadcastChannel 6, WebSocket 6 (fake socket: backoff, fatal close codes, liveness) + 6 (through the real relay), WebRTC 7 (fake peer connection; initiator re-offers after a drop) |
| Sample guard: type-level (`types.test-d.ts`) and runtime (every transport refuses a Float32Array) | pass. `tsc` uses all four `@ts-expect-error` lines (no `samples` kind, no typed-array body, no sample field, `v` must be 1). Runtime: the conformance check "refuses sample data with WireSafetyError and sends nothing" passes on all five transports; `guard.test.ts` 5/5 (typed arrays, ArrayBuffers, numeric runs > 64, or > 1024 inside a snapshot, sample-named keys; a real engine snapshot passes) |
| Relay: authority, ack routing, snapshot cache, host-exists, expiry/heartbeat (7 tests) | 7/7 pass (real `ws` server on a random port): fan-out and never back to the host; commands to the host only and the ack to the issuer only; a viewer command is refused and a spoofed `from` is dropped; a second host (4009) and a bad first frame (4001) are refused; the snapshot goes only to peers that said hello and is cached; a late joiner gets the cached snapshot while the host is away; an empty room expires and a socket that misses a heartbeat is terminated. `pnpm relay` and `npx pme-relay` both print `pme-relay ready on ws://127.0.0.1:<port>/` |
| Acceptance 2 — late join: viewer sample-identical, beat drift, lag | pass. `sessions.test.ts`: a viewer joins over BroadcastChannel mid-ramp (HR 75 → 110, sigmoid, 5 s), then AF, PVCs and the diagnostic filter follow: max \|Δ ecgII\| host vs viewer = **0** over 10 s, beat drift **0 ms**, resyncs 0, lag 50–200 ms. `viewer-sync.test.ts`: ecgIII identical over 5 s after a rhythm and a lead change. Browser (headless Chrome, 20 commands each): bc / relay / rtc all `synced`, drift **0.0 ms**, resyncs 0, lag **89–169 ms** / 89–93 ms / 93 ms over several runs (the 169 ms was with two Playwright workers competing for the CPU) |
| Acceptance 3 — relay drop: applied exactly once; controller shows disconnected | pass. `sessions.test.ts` › "a controller drop never applies a command twice, and pending commands go through after reconnect" (a real relay; the controller's socket is dropped while a command is pending; the controller logs `link connecting`; the host applies it once) and › "a re-sent command (same id) is answered from the host cache, not re-applied" |
| Stage then commit: one tick | pass. `sessions.test.ts` › "commands sharing a stageGroup land on one tick" and `host-session.test.ts` › "aligns a stageGroup on one tick STAGE_LEAD_TICKS ahead" (3 ticks = 60 ms) |
| Latency (200 samples, localhost): ack / visible p50–p95 per path vs 70–140 ms budget; acceptance 1 (in-process ≤ 60, relay ≤ 150 p95) | pass, with a wide margin. Table below; raw numbers in `stage-6a/latency.json`. Worst visible p95 = **30.1 ms** (relay), against the 70–140 ms budget; in-process visible p95 26.5 ms (≤ 60), relay 30.1 ms (≤ 150) |
| LAN relay + WebRTC from a phone/iPad; Wi-Fi drop | **pending Ali** (no second device here). The drop behaviour is covered on localhost by acceptance 3 above and by the WebSocket/WebRTC reconnect tests |
| iPad host: panel reveal by touch, sound | **pending Ali** (no iPad here). The gestures are unit-tested (`reveal.test.ts` 3/3: `i`, Ctrl+Shift+I, 5 taps in the 64 px corner within 3 s, a three-finger hold of 800 ms) |
| Screenshots | `stage-6a/host-panel.png`, `stage-6a/remote.png`, `stage-6a/viewer.png` (headless Chrome; 75 KB, 52 KB and 24 KB) |

## Latency (headless Chrome, localhost, 200 commands per path)

| Path | ack p50 | ack p95 | visible p50 | visible p95 | visible max |
|---|---|---|---|---|---|
| in-process (panel → host) | 0.7 ms | 1.7 ms | 8.8 ms | 26.5 ms | 31.4 ms |
| BroadcastChannel (remote window) | 0.7 ms | 4.1 ms | 10.4 ms | 28.4 ms | 33.0 ms |
| relay (WebSocket) | 0.9 ms | 7.3 ms | 10.0 ms | 30.1 ms | 33.0 ms |
| WebRTC DataChannel | 0.7 ms | 1.6 ms | 9.6 ms | 26.5 ms | 32.1 ms |

Budget (research 05 §3.2): 70–140 ms. A 30-sample trial run gave the same picture (visible p95 24.8–30.9 ms). Visible latency is about one 20 ms engine tick plus one frame; the look-ahead adds nothing, because a command invalidates it and it is regenerated.

Latency definition: *ack* = sender `send()` → ack received at the sender. *visible* = sender `send()` → the first host animation frame whose drawn sim time reaches the command's tick (epoch ms, one machine). Compositor and display time (≤ 1 frame) is not included. The rAF timestamp is the frame's start, so a command sent early in a frame can reach "visible" at that same frame, with a timestamp slightly before the send. That is why the visible minimum is a little below zero (−2.7 to 0.2 ms; see `latency.json`). The p50/p95 are not affected.

## What the screenshots show

- `host-panel.png`: the host monitor with the drawer open (Controls tab). The HR row has the blue ▲ ramping flag and the readout `95 / 95 / 62 bpm` (target / truth / displayed). Truth equals target until engine request E1. Session `GATE6A`; diagnostics `applied 2 · rejected 0 · duplicates 0 · snapshots 3`.
- `remote.png`: a phone-width remote page reading `connected · GATE6A`, `HR 62 t 00:13`. It has the same generated controls, the stage bar (Commit / Discard / Pause / Resume) and the log (`command rhythm avb2Mobitz1`, `ack ok (56 ms)`, `command hr → 95 over 30 s (linear)`, `ack ok (18 ms)`).
- `viewer.png`: the second monitor in Mobitz I (dropped beats visible), with HR 62 and the line `viewer GATE6A · link broadcastChannel open · synced · lag 101 ms · beat drift 0.0 ms · resyncs 0`.

## Browser tests (Playwright, installed Chrome)

- `stage6a.e2e.ts`: host + remote + viewer over bc, relay and rtc. **3/3 pass**; 20 commands each, all accepted and all visible.
- `stage6a-latency.e2e.ts`: **1/1 pass** (the table above).
- `stage6a-screens.e2e.ts`: **1/1 pass** (the three screenshots).
- `stage6a-worker.e2e.ts` (Task 22b): **3/3 pass**. `PatientMonitor.transports` has the five adapters. `MonitorHandle.snapshot/restore/role` work on the worker path (`worker-raf`: snapshot tick 50 → 124 → restored 50) and on the main-thread path (49 → 124 → 49). An unknown schema is refused.
- `iife-smoke.e2e.ts` (Stage 0/1): still **2/2 pass**.

## Requests for the orchestrator

These were ruled on in R25:
- **E1:** engine `state` at 1 Hz. Stage 2 owns it. Until then the host synthesises a target-derived `state` and stops as soon as the engine emits one.
- **E2:** the `pme-vocabulary/1` shape in `packages/controller/src/vocabulary.ts` is the contract.
- **E3:** `commandApplied.resolved = {command, replay?}`. Stage 2 owns it. The host emits its own, and viewers de-duplicate by `commandId`.
- **R-1/R-2:** implemented here as Task 22b.

What remains outside the ruling:
- `MountOptions.transport`.
- Synchronous clock control on `MonitorHandle` (`renderT`, rate, jump), which `ViewerSync` needs every frame. The demo pages therefore still run `MonitorCore` on the main thread.

## Deviations from the plan

1. **Code:** none. Every file the plan gives in full was written exactly as the plan gives it. Each one is byte-identical to the plan author's prototype, and every step passed as written, so the prototype was never needed to settle a discrepancy.
2. **Plan file:** `docs/plans/stage-6a-controllers.md` was untracked in the shared checkout. It was copied into this branch, committed with Task 1, and its checkboxes were ticked task by task.
3. **Commit trailer:** at the orchestrator's instruction, commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, not the plan's Opus line.
4. **"Look at it" steps (Tasks 21 and 22):** these ran in headless Chrome (Playwright) against this worktree's own Vite server on `127.0.0.1:5206`, not in a visible window on port 5173. Port 5199 belongs to the shared checkout, and the hidden browser pane throttles rAF. Results:
   - Task 21: two lanes sweeping, HR 75, a 6-character code, `i` opens the drawer, and Set HR 120 over 20 s turns the flag blue (`120 / 120 / 76 bpm`).
   - Task 22: the remote reads `connected · CODE` with an HR, and the viewer reads `synced · lag 96 ms · beat drift 0.0 ms · resyncs 0`. A rhythm applied from the remote reached the host (`applied 1`).
5. **Clean-clone rehearsal:** this ran in the session scratchpad instead of `/private/tmp/pme-6a-ci`.
6. **Task 22b (added, ruling R25):** this task implements renderer requests R-1 and R-2.
   - Changes: `MountOptions.role`, and `MonitorHandle.role`, `snapshot()` and `restore()` on the worker and main-thread paths. `PatientMonitor.transports` is now `@pme/controller`'s `transports`.
   - Files: besides `mount.ts` and `index.ts` (the IIFE export list), snapshot/restore through the worker needed additive message cases in `protocol.ts`, `worker-host.ts` and `engine.worker.ts`. `@pme/renderer` also gained a dependency on `@pme/controller`.
   - Unchanged: no existing behaviour changed, and `packages/engine-core` is untouched.

## Observations (not fixed; plan code kept exact)

- The panel's and the remote's rhythm dropdowns keep their own last selection, not the rhythm the host is actually running. In `host-panel.png` the panel still shows "Sinus" after the remote applied Mobitz I. The HR number field likewise keeps what was typed there. The readout and the flag are live. A follow-up could sync the form fields from `commandApplied`.

## Not checked here

- The LAN run with a phone or iPad as the remote, and a real Wi-Fi drop (pending Ali).
- The iPad as host: touch reveal and sound after **Sound on** (pending Ali).
- Compositor and display latency (≤ 1 frame, not part of *visible*).
- Hearing the beep on the host (headless).
