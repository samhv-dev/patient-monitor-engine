# Gate FU-1 — follow-ups bundle (4b, 5.1, 6a, 6b)

Branch `fu-1-followups` (from main 9e39b29). One commit per item, pushed after each. Origins: G4b, G5.1 / G5.1-obs,
G3.1-obs, R30, R39 in `research/00-orchestrator-rulings.md`; requests R-51-1 / R-51-3 in `docs/gates/stage-5.1.md`.

| # | Item | Change | Test | Evidence |
|---|---|---|---|---|
| 1 | Playwright CI resilience (G5.1) | `playwright.config.ts`: `retries: 2` when `CI` is set, `workers: 1` on the WebKit project; 4b "live monitor per skin" (41.5 s on CI WebKit) and "device evidence" (1.6 min) skip WebKit with a comment. The `PW_SYSTEM_CHROME` path is unchanged. | `CI=1 playwright test --list` (42 tests); full local e2e below | — |
| 2 | 6b ACLS flake (G3.1-obs) | The test records the engine's `deviceStatus` defib state and polls it to `ready` before Shock (no fixed 8 s wait). Audit: fixed-sleep-then-assert patterns converted to polls in 4b audio log (`chargeReady` marker before shock, `shock` tone before reading the log), 4b 12-lead (sim time ≥ 10 s), 4b device evidence (pace spikes, sync markers), 6a trio (20 visible commands), 6a latency (every fired command visible), 6a worker (snapshot tick). Screenshot-only sweeps keep their waits. | stage6b, stage4b-device, stage6a, stage6a-latency, stage6a-worker e2e pass | — |
| 3 | R-51-1 TCP marks | `renderer/src/overlays.ts`: `paceSpike` markers with `data.tcp` draw a capped mark from the lane top, 2.5× the skin's pace mark and ≥ 5 mm, never reaching the baseline where the sampled pad spike is; vertical-line skins draw it 2.5× through the baseline. Drawn on every ECG lane of a skin with a device pacer (existing `shows()`). | `renderer/test/overlays-tcp.test.ts` (FakeCtx, 4 tests) | `fu-1/tcp-marks-zoll-like.png` |
| 4 | R-51-3 QRS detector vs pacer spikes | `l3/qrs.ts`: `qrsPacePulse` + `qrsPaceGate` — the engine announces each TCP pulse 8 ms ahead (from the `paceSpike` records); the unfiltered detection lead is held for 60 ms (before the monitor filter, whose mains notch rang for > 100 ms after the spike) and the polarisation tail is re-based with a fading offset (τ 100 ms). `engine.ts`: one helper + two call-site lines. | `engine-core/test/l3/qrs-pacing.test.ts`: tcpCapture (avb3Wide, 70 ppm, 90 mA) HR 70; tcpNoCapture (40 mA) HR 32 = the escape rhythm; asystole + 50 mA HR **0** (was 70); pacedVVI HR 70 unchanged. Extra sweep (not committed): sinus + 100 ppm no-capture → 74–75; asystole 140 mA below a 150 mA threshold → 0; 120 ppm capture in asystole → 60 (alternate pulses fall in the paced beat's refractory period, as the engine marks them). | — |
| 5 | Panel tab-registration API (4b, 6b requests) | `controller/src/panel/panel.ts`: `PanelTab { id, title, render(el, ctx), before? }`, `panel.registerTab()` (returns a remover), `selectTab`, `tabs`, `tabs` option at mount; Controls, Log, Bookmarks and Scenario are registered through it (same `data-tab`/`data-pane` DOM). The 6b ACLS demo registers a **Device** tab (defib/pacer status and buttons). | `controller/test/panel/panel-tabs.dom.test.ts` (happy-dom, 5 tests); existing panel tests unchanged | `fu-1/panel-device-tab.png` |
| 6 | 6a UX: controls follow the host | `ControllerSession.rhythm` from applied `setRhythm` (any controller, the scenario driver) and the engine's `rhythmSegment` events. Panel and remote rhythm select and target fields show the host's value when it changes (state `values`, rhythm) — never while the user is in that control; a typed but unsent value is kept until the host changes. `RHYTHM_LABEL` covers all 36 ids. | `controller/test/panel/controls-follow.dom.test.ts` (6 tests) | — |
| 7 | ge-like / mindray-like layout | research/05 §2 documents both vendors' **alarm bar colours** (Mindray already encoded in 4b; GE red/yellow/cyan now explicit, tagged documented) but **neither vendor's lane order nor numeric tile grid**. The `LAYOUT UNVERIFIED` badge therefore stays on both; the badge's provenance note names the missing data. | `skins/test/fu1-layout.test.ts` | — |
| 8 | E-4a-2 HR time-window averaging | `l3/hr.ts`: optional `averaging { kind: 'beats' \| 'seconds', n }` — beats: plain mean of the last n RR; seconds: mean of the RR ending in the last n s (at least 2). Skin schema/types/CONTRACT gain optional `hr.averaging`; the engine reads it per active skin. No shipped skin sets it → defaults unchanged. | `engine-core/test/l3/hr-averaging.test.ts` (5 tests; the default path's numbers pinned) | — |

## Data still missing (item 7)
- **GE CARESCAPE-style:** factory lane order (which waveforms, top to bottom), numeric tile grid (position and size of
  HR / SpO2 / NIBP / IBP / CO2 tiles), header layout. research/05 §2.7 only has "colour-coded alarm light area;
  parameter windows open menus on touch" [S3].
- **Mindray N-series-style:** the same three; research/05 §2.7 only has the 120 s freeze buffer [S4 §3.12].
- Source needed: a factory-default screen photo or the operator manual's "screen layout" / "display" chapter for each.

## Notes and deviations
- engine.ts (7a/7b concurrency): additive only — `tcpPulseAnnouncements()` + the pace-gate call in `advance()`, the
  averaging argument on the HR measurement line and a cached `hrAveraging()` method. No edits to l2/circ, l2/hemo,
  l2/lung, l2/gas, l2/co2, packages/ventilator.
- Item 6 cannot see rhythm changes the engine makes without an event (e.g. a shock outcome): the 1 Hz `state` event
  (l2/hemo, 7a's area) carries no rhythm. Adding `rhythm` to `state` would close that; left for the L1/hemo owner.
- Item 8: saadat-like declares `hr.method: 'moving-average-seconds'` with window 8 s; mapping it to
  `averaging: { kind: 'seconds', n: 8 }` would change a default, so it is left for the calibration pass.
- Under the shared machine's load (load average 35–44 on 8 cores), a few pre-existing 5 s-budget renderer tests timed
  out once and passed on rerun; not changed here.

## Gate run
Local, macOS, Node v26, 2026-09-26 ~21:20 (shared machine, load average 35+):
- `pnpm typecheck` — 0 errors. `pnpm build` — OK. `pnpm check-notices` — OK (3 governed files).
- `pnpm -r test` — **1,091 passed, 0 failed**: engine-core 501 (110 files), controller 196, skins 168, ventilator 87,
  renderer 65, audio 58, validation 16. New in FU-1: renderer 4, engine-core 9 (qrs-pacing 4, hr-averaging 5),
  controller 11 (panel-tabs 5, controls-follow 6), skins 2.
- `PW_SYSTEM_CHROME=1 pnpm test:e2e` — **23 passed** (2.4 min), including the two new FU-1 evidence tests and the
  converted 6b/4b/6a tests. CI (bundled Chromium + WebKit) lists 46 tests, with `retries: 2`, one WebKit worker, and the
  two heavy 4b evidence tests skipped on WebKit.
- Screenshots (≤ 60 KB each): `docs/gates/fu-1/tcp-marks-zoll-like.png`, `docs/gates/fu-1/panel-device-tab.png`.
