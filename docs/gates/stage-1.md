# Gate 1 — ECG vertical slice (date: 2026-09-24)

Gate question: "At arm's length, do sinus, AF, flutter, CHB and VT look and sound like a monitor on a laptop and an iPad, and is the HR number behaving like a real device?"

| Check | Result |
|---|---|
| Clean clone typecheck/test/build/check-notices (test totals) | exit code 0 (`git clone` into a scratch folder → `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build && pnpm check-notices`). **131 tests** in 31 files: engine-core 98 (18 files), renderer 18 (6), audio 8 (3), validation 5 (2), skins 1, controller 1. `check-notices: OK (0 governed files)`. IIFE `patient-monitor.iife.js` 72.57 kB (26.92 kB gzip) |
| Acceptance tests 1–12 (all in Vitest) | 12/12 pass. Measured values are in the table below |
| QRS crisp, no stair-stepping | pass (headless Chrome). DPR-2 crop `stage-1/sinus-dpr2-zoom.png`: smooth 1.75 px trace, sharp R apexes, no steps on the R upstroke |
| No gap/ghost at wrap or erase gap | pass **after a fix** (see "Deviations"). The first screenshots showed a faint vertical ghost column at each lane's left edge. After commit `9d3ff46` it is gone. The 16 px erase gap is clean and no ghost trail is visible over 3+ sweeps |
| Stopwatch 10 s at 60 fps / at 30 fps (px) | 944.9 px / 944.9 px (sim time advanced 10.149 s in 10.149 s wall at 60 fps, 10.100 s in 10.100 s at 30 fps; target 945 ± 5%). Main rAF 59.6 fps |
| Beep aligned by ear; beep − R min/mean/max (ms); dropped tones | By ear: NOT CHECKED (headless). **Logged sim-time beep − R** (the demo diagnostics line, sinus, last 20 beeps): 45 / 46 / 47 ms, dropped tones 0 → pass. **Audible beep − R** in sinus (oscillator start mapped through `getOutputTimestamp`), 37 beats: 45.4 / 51.6 / 67.3 ms, and **6 of 37 are over 60 ms**. Wide complexes are later still, and some are dropped: see "Beep timing finding" |
| iPad Safari: render path; sound with silent switch on | **pending Ali** (no iPad here) |
| 10-min soak heap growth (MB) | sinus + PVC bigeminy + sound, 11 min wall. After forced GC (CDP `HeapProfiler.collectGarbage` → `Runtime.getHeapUsage`), 1 min → 11 min: main thread 2.04 → 2.08 MB (**+0.04**); worker 0.99 → 0.92 MB (**−0.07**). The demo's "JS heap" read 2.8 → 3.1 MB (no GC). Pass (≤ 5 MB). The ring buffers are fixed-size ArrayBuffers, which are not counted in the JS heap |
| Rhythm look (sinus, AF, flutter, CHB, VT) — laptop / iPad | laptop (headless Chrome screenshots, listed below): all look right, with one caveat on flutter. iPad: pending Ali. Human arm's-length review: pending the orchestrator and Ali |
| HR tile response and update rate | Demo, sinus 75 → HR 120 with ramp 0: 75, 76, 82, 89, 97, 107, **118 at +6.4 s**, then 119–122. Updates were ≥ 1.0 s apart. VT: the tile read 170 within 5 s. Test 9 (engine): 80 → 120 reached 120 at +6.98 s; minimum update gap 1.000 s |

## Acceptance tests (measured)

| # | Test (file › name) | Measured |
|---|---|---|
| 1 | `engine-core/test/l2/ecg/rhythm-sinus.test.ts` › acceptance 1 | mean RR over 60 beats = 1.000000 s (HRV off) |
| 2 | same file › acceptance 2 | QT from kernel timing = 400.00 / 317.48 / 294.72 ms at 60/120/150 bpm |
| 3 | same file › acceptance 3 | at 150 bpm, measured from QRS onset: T onset 72.2 ms, **P peak 291.0 ms**, T end 294.7 ms → P lies inside T (PR60 = 190 ms, see rulings) |
| 4 | `engine-core/test/l2/ecg/vcg.test.ts` › identities; `test/engine/engine-pipeline.test.ts` › acceptance 4 (filtered lanes) | unfiltered, 100,000 random VCG samples: max \|III − (II − I)\| = 0, max \|aVR + aVL + aVF\| = 1.8e-15 mV. Monitor-filtered lanes: max \|III − (II − I)\| = 8.9e-8 mV (float32) |
| 5 | `engine-core/test/l2/ecg/rhythm-avblock.test.ts` › acceptance 5 | 4:3 Wenckebach, group PRs 184 → 284 → 334 ms (increments 100 → 50 ms); 1 dropped P per group; longest pause 1.450 s < 2·PP 1.600 s |
| 6 | same file › acceptance 6 | avb3Narrow, 300 s, 224 P–QRS phases: KS D = 0.030, **p = 0.988**; ventricular rate 45.0/min |
| 7 | `engine-core/test/l2/ecg/rhythm-atrial.test.ts` › acceptance 7 | afib 600 s: RR CV = 0.197, lag-1 r = −0.019, P kernels = 0 |
| 8 | `engine-core/test/l2/ecg/rhythm-pvc.test.ts` › acceptance 8 | bigeminy at 60/75/100 bpm: \|coupling + pause − 2·RR\| max = 0.000 ms; PVC QRS 165 ms |
| 9 | `engine-core/test/engine/engine-pipeline.test.ts` › acceptance 9 | step 80 → 120: 80, 86, 93, 100, 109, **120 at +6.98 s**; minimum gap between updates 1.000 s |
| 10 | same file › acceptance 10 | SHA-256 of 60 s of ecgII, seed 42 twice: `df40ef91…64cc28` both times; seed 43 differs (`59c06c6c…792d4`) |
| 11 | same file › acceptance 11 | after `advanceTo(86400)`: tick 4,320,000; `latestSampleIndex('ecgII')` = **43,200,050** (took 15.2 s wall) |
| 12 | `renderer/test/decimate.test.ts` › x-velocity; › R-peak maximum | 94.500 px/s at 30/60/120 fps (tolerance ±0.1); R max kept exactly, max-index error 0 samples at DPR 1/2/3 |

No acceptance-test tolerance was changed.

## Visual checklist screenshots (headless Google Chrome, DPR 1, each taken after one full sweep)

| File | What it shows |
|---|---|
| `stage-1/sinus.png` | Sinus 75: clear P-QRS-T in II and V5, with the erase gap. HR 75 |
| `stage-1/afib.png` | AF: irregularly irregular narrow QRS, no P waves, fine f-wave baseline. HR 100 |
| `stage-1/flutter-4to1.png` | Flutter 4:1: regular narrow QRS at 75. The flutter undulation shows in II, but at this gain the sawtooth is **low and not very distinct**. Ali should judge whether it is prominent enough |
| `stage-1/chb-narrow.png` | avb3Narrow: P waves march through at 80, independent of narrow escape QRS at 45. HR 45 |
| `stage-1/vt-mono.png` | Monomorphic VT: regular wide complexes. HR 171 |
| `stage-1/pvc-bigeminy.png` | Sinus + PVC bigeminy: N-V-N-V; wide PVCs with discordant T and full compensatory pauses. HR 76 |
| `stage-1/sinus-diagnostic-filter.png` | Diagnostic filter: the lane labels read "D", and more high-frequency detail and baseline movement show |
| `stage-1/sinus-dpr2-zoom.png` | DPR-2 crop of lane II (crispness check) |

Render paths: Chrome `worker-raf` (demo and IIFE from `file://`). `worker: 'off'` from `file://` → `main`, with the HR tile working. `worker-pump` was not exercised: it needs a browser with OffscreenCanvas but no worker rAF.

## Beep timing finding (needs a ruling)

The engine posts tones on time: `tone.t` is 44.6–46.8 ms after the true R, 20–60 ms as designed (test "posts a QRS tone 20–60 ms after each true R"). The problem sits between the worker and the speaker:

- Narrow tones reach the main thread 29 ms early to 2 ms late. `AudioContext.currentTime` runs about 16–20 ms ahead of `getOutputTimestamp().contextTime`: Chrome's `outputLatency` is 16 ms, both headless and headed. So up to ~20 ms of that is audible lateness, and **audible beep − R in sinus reaches 67 ms** (6 of 37 beats over 60 ms).
- Wide complexes: the detector's latency for wide QRS (plan decision 6 estimates 130–160 ms) uses up the 100 ms look-ahead plus the 40 ms beep delay. Those tones therefore reach the scheduler 20–40 ms late in audible terms, and the brief §3.6 rule (">30 ms late → dropped") discards them:

| Rhythm | Audible beep − R min / mean / max (ms) | Dropped |
|---|---|---|
| Sinus | 45.4 / 51.6 / 67.3 | 0 of 37 |
| PVC bigeminy, PVC beats | 58.6 / 65.9 / 73.0 | 3 of 19 PVCs |
| VT 170/min | 52.2 / 65.2 / 78.3 | 13 of 58 (22%) |

The 11-min bigeminy soak dropped 50 tones, all on PVCs. This conflicts with the demo spec "beeps on every detected QRS". Options, not applied because each changes a brief constant or ruling:

- (a) Let QRS tones be up to ~80 ms late before dropping them. Real monitors beep after detection anyway.
- (b) Lengthen the tone look-ahead (C6 fixed L = 100 ms).
- (c) Cut `BEEP_DELAY_S` from 40 to ~20 ms, so narrow beats land at about 25–50 ms audible.
- (d) Make the scheduler's lateness allowance include `outputLatency`.

Also, the demo's diagnostics line reports sim-time beep − R, which leaves out this audio-side lateness. It should also show `lateS` from the audio log.

## Deviations from the plan

1. **Wrap ghost fix (Task 23, commit `9d3ff46`, outside the plan).** Strokes are 1.75 px wide with round caps, so about 1 px spilled left of each lane's x-origin. Erase-gap clears are clipped to the lane, so that spill was never erased and built up into a faint dotted vertical line at the wrap, most visible in VT. `SweepLane.strokeWrapped` now clips to the lane rectangle (`save/rect/clip/restore`). `FakeCtx` tracks the clip, and a new test fails without the clip. Renderer tests went from 17 to 18 (the plan expected 17).
2. The clean-clone rehearsal cloned into the session scratchpad instead of `/tmp/pme-ci`.
3. Task 14 mutation check: `toneCancel` is emitted in two places (`restore` and `tickOnce`). Commenting out both, then only the `tickOnce` one, made the toneCancel test fail each time. Both were restored.
4. Task 22's "Expected within 3 s: HR tile reads 74–76" was not quite met. The tile first shows a number (74) **≈4.1 s after navigation**: it needs 2 RR at 75 bpm, plus detector latency, plus the 1 Hz update. It reads "---" at 3 s. No code was changed.

## Not checked here

- Safari on the laptop: automating it needs "Allow Remote Automation", a settings change, which was not made. Ali should open `/stage1.html` in Safari.
- By-ear beep alignment: this machine ran headless.
- iPad Safari (render path, and sound with the silent switch on): **pending Ali**.

Decisions needing a ruling:
- PR60 = 190 ms (test 3).
- ProSim V1/V4 ratios vs I = 70% (templates.ts).
- The beep lateness/drop policy above.

Notes:
- `grep -rn "VERIFY" packages/engine-core/src` → no matches (verify-before-gate: Dower rows, ECGSYN Table I and Weissler LVET were confirmed in research 03 §11).
- Method: headless Google Chrome driven by Playwright (`channel: 'chrome'`) against the Vite dev server at `http://localhost:5199/stage1.html`. An init script wraps `Worker`, so the page records each `events` batch: the clock anchor `(simT, epochMs)`, beats and tones. The stopwatch is the sim-time advance between the first and last anchors in a 10 s wall window, converted at 94.49 px/s (the Stage 0 method). Audible beep times come from patching `AudioScheduledSourceNode.prototype.start` and mapping its start time through `getOutputTimestamp`.
