# Gate 1.1: Stage 1 review fixes (date: 2026-09-25)

Closes the Stage 1 independent review (`docs/gates/stage-1-review.md`, H1–H5, M1–M7, eight Lows) and applies the Gate 1
rulings R15–R19 (`../research/00-orchestrator-rulings.md`). Branch `stage-1.1-gate-fixes`; one commit per finding,
each with a test that failed first. Plan: `docs/plans/stage-1.1-gate-fixes.md`.

## Gate run

| Check | Result |
|---|---|
| `pnpm typecheck` / `pnpm -r test` / `pnpm build` / `pnpm check-notices` | exit 0. **162 tests** (Stage 1: 131): engine-core 112, renderer 23, audio 19, validation 6, skins 1, controller 1. IIFE 84.17 kB (31.28 kB gzip). `check-notices: OK (1 governed files)`: the vendored cyrb53 |
| Playwright smoke (`PW_SYSTEM_CHROME=1`) | 2/2 pass (IIFE from `file://`, two lanes + HR number) |
| Screenshots (headless Chrome, DPR 1, `stage-1.1/`) | `sinus`, `afib`, `flutter-4to1`, `chb-narrow`, `vt-mono`, `pvc-bigeminy` (the six rhythms); `flutter-4to1-before` / `-after`; `sinus-dpr1-zoom-before` / `-after`; `sinus-200`. HR tiles: 75, 100, 75, 45, 171, 76; sinus 200 reads 204. No page errors |
| HR tile first value (R19: ≤ 5 s) | 74 at 4.2 s after navigation |

## Findings → fix → test → measured

| Finding | Fix | Test (failed before the fix) | Before → after |
|---|---|---|---|
| **R15 + H5** beep policy | `BEEP_DELAY_S` 40 → 30 ms. The scheduler subtracts the measured output latency (`outputLatency`, else from `getOutputTimestamp`, else 20 ms) and drops a QRS tone only if it would sound > 150 ms after its R (`tone.refT`). Other tones never drop | `audio/test/scheduler.test.ts`: Bluetooth 200 ms case, 150 ms rule, 20 ms fallback, non-QRS never dropped | Audible beep − R, min/mean/max (ms), dropped. **Sinus** 45.4/51.6/67.3, 0 of 37 → 36.2/51.3/63.1, 0 of 37. **PVC beats** 58.6/65.9/73.0, 3 of 19 dropped → 57.2/68.1/80.6, 0 dropped. **VT 170** 52.2/65.2/78.3, 13 of 58 dropped → 53.5/71.4/96.6, 0 of 57 dropped. All inside R15's ≤ 90 narrow / ≤ 130 wide |
| **H3** double beeps | Stable tone id `qrs-<R sample>`. The engine never re-posts a live tone and cancels only stale ids (`toneCancel.ids`). The scheduler dedupes by id and stops already-scheduled nodes on cancel (`playBeep` returns a handle) | `engine-commands`: a command every tick gives exactly one tone per R and no toneCancel; filter toggles cancel exactly the stale ids, with no double beeps. `scheduler`: dedupe, cancel after hand-off | Engine test: 1500 toneCancels / re-posts → 0. Browser, 20 s slider drag: oscillator starts per beat **1.00** (25/25); the review measured 57 of 88 doubled |
| **M6** fallback sign | `mapPerfToAudio` subtracts base + output latency | `audio/test/context.test.ts` | +baseLatency → −(base + output) |
| **M7** iOS context | Resume on `visibilitychange`/`pageshow`; an interruption clears the queue; `enableSound` is idempotent; `destroy` closes the context | `context.test.ts` (keepContextRunning) | Not measured on iPad (see below) |
| Demo diagnostics | The diagnostics line shows **audible** beep − R: tone − R plus the audible lag through `getOutputTimestamp` | — | — |
| **R16 + H4** PR and QT | `DEFAULT_PR60_MS` 190 → 160. T peak at QT − 2σ_fall (60 ms), so the tangent to its steepest descent meets the baseline at QT | Acceptance 2 now measures the tangent-method QT on generated lead-II samples (`test/helpers/qt.ts`). Acceptance 3 (R16): at 160 bpm, P onset lies after the T peak and before the tangent T end | Tangent QT (ms): 60 bpm 350.0 → **400.3**; 100 bpm 287.4 → 337.7; 120 bpm 267.5 → **317.8**; 150 bpm 245.1 → **299.0** (targets 400/337/317/295). At 160 bpm: P onset 255 ms, T peak 229 ms, T end 305.6 ms. PR at 75 bpm: 184 → 154 |
| **R18** flutter | F wave = 4-term Fourier sawtooth (slow fall over 70% of the cycle, fast return), phase-locked to the F events, direction large in II/III/aVF | `rhythm-atrial`: p-p 0.25–0.32 mV, zero mean, never flat (\|slope\| < 1 mV/s) for 10% of a cycle, fall/rise ≥ 1.7, present in III and aVF | Lead-II F wave: p-p 0.262 → **0.300 mV**; longest flat run 59 → **7 ms**; fall/rise 1.47 → **1.82**. `flutter-4to1-before.png` → `-after.png` |
| **L8** AF cut | Atrial waves fade in/out over 80 ms | `rhythm-atrial` (fade) | Max step per sample 0.043 → < 0.01 mV |
| **H1** sinus 2:1 | An AV-node ERP (250 ms, P to P) limits supraventricular conduction. A conducted beat after a conducted beat is no longer concealed by ventricular refractoriness, which still applies after PVCs, escapes and the VT focus. `conducted` reflects the outcome | `engine-rate-sweep.test.ts`: sinus 40–220 bpm, HRV off and on, displayed HR ±3%; sinusTachy 200 ×3 seeds | Displayed HR, HRV off/on. **180**: 180.0/90.2 → 180.0/180.3. **200**: 100.0/100.3 → **200.0/200.3**. **220**: 110.0/110.1 → 220.0/220.0. 40–160 unchanged. Demo tile at 200: 204 |
| **H2** DPR-1 gaps | Each frame clears a band from the last drawn column's left edge minus the stroke's reach. Every point whose stroke reaches into the band is re-stroked, clipped to the band, so each pixel is drawn once | `sweep-lane.test.ts`: raster of a steep synthetic QRS, frame by frame vs one shot, at DPR 1, 1.5 and 2 | Worst missing px per column: 31 → **≤ 1**. Browser DPR 1 (38 QRS): trace per QRS (summed column extents) 137.9 → 164.6 px mean, 95 → 164 px typical minimum. `sinus-dpr1-zoom-before/after.png` |
| **M1** AF rate | Calibration table (target → command) from simulating the model, 600 s × seeds 11–13 | `rhythm-atrial`: 40–180 ±5% on unseen seed 21 | 40: 33.0 → **40.1**; 50: 46.7 → 49.8; 150: 145.2 → 151.0; 180: 158.9 → **180.2** bpm |
| **M2** VT capture overlap | A non-focus activation (a capture) resets the VT focus | `rhythm-atrial`: VT 120/125/130 × 3 seeds, min RR > 200 ms | Min RR at VT 120: 10.6 ms (overlap) → > 200 ms (the review found 12 pairs < 200 ms in 60 s) |
| **M3** aVL → HR 0 | QRS detection runs on a designated primary lead (lead II, own filter state) | `engine-commands`: lane 0 → aVL keeps HR 75 ± 3 | HR 0 within 4 s → 72–78 throughout |
| **M4** restore buffers | `restore()` clears the buffers; the ring tracks its first written index | ring + engine tests | `latestSampleIndex` after restore to 10 s: 20050 → **5050**. Fresh-engine restore: 5051 samples (mostly zeros) → ≤ 51 real samples |
| **M5** numeric inputs | Range-check every numeric field (`atTick`, ramp, rhythm opts, modifiers). `planUntil` throws on a non-finite time | `engine-commands`: 16 bad commands; planUntil NaN | NaN/∞ accepted and pipeline frozen → every one rejected with a reason; RangeError instead of a 1M-iteration spin |
| **L1, L2** hidden tab | `Clock.advanceUnclamped` carries the remainder; catch-up posts its events | `monitor-core` | 60 hidden pumps of 1010 ms: 60.0 → 60.6 s (lost 0.6 s → 0); posts per pump 0 → 1 |
| **L3** lane wipes | A filter change redraws only the chrome; a lead change resets only its lane | `monitor-core` | Lanes wiped: filter 2 → 0; lead 2 → 1 |
| **L10** restore mismatch | Refuse another `engineVersion` or `mainsHz` | `engine-commands` | Silently accepted → Error |
| **L11** log cap | Log capped after every push (scheduler rewrite) | — | — |
| **L12** wide amplitude | `WIDE_VEC` × 1.2 | `templates`: 1.5–2× | R in II vs normal: 1.36× → **1.63×** |
| **R17** lead ratios | Test and comment: II exact, I 70%, III 30%, normal chest R progression, no V-lead ratio target. The septal Q vector was made more anterior so r(V2) > r(V1) (II unchanged) | `templates`: V1 rS with r 0.1–0.3 mV, R rises V1→V4, transition at V3/V4, dominant R in V5/V6 | r/S (mV): V1 0.06/0.78 → **0.16/0.78**; V2 0.04/0.87 → **0.19/0.87**; V3 1.25/0.97; V4 1.84/0.64; V5 1.77/0.32; V6 1.33/0.10 |
| Provenance: `hash53` | Moved to `src/vendor/cyrb53.ts` with `NOTICE-ID: N-006`, the upstream header and the MIT fallback text; NOTICES row N-006. **Licence as stated upstream:** file header "License: Public domain (or MIT if needed). Attribution appreciated."; `LICENSE.md` "Public domain", with MIT approved as a fallback ("Copyright (c) 2024 bryc") | `validation`: the repository passes check-notices and cyrb53 is governed | Output unchanged (same hashes, same seeds) |
| Citations | Comments added for every constant the review listed (first P +100 ms, focus start, first-beat RR, QT RR clamp, LVET floor, PVC +5 ms, wide/retro-P timings, sinusBrady escape 30, `MIN_RR_S`) | — | — |
| Review §5 gap | Chunking invariance | tick-by-tick vs 1.5 s bulk: identical samples and events | Passes (characterisation) |
| **R19** + brief | Demo expectation relaxed to "HR tile first reads 74–76 within 5 s". Brief §3.6 beep policy, §4.1 PR60 160, T row, R17 targets and detection lead edited in place | — | 4.2 s |

## Not done, and why

- **L4** (`devicePixelContentBoxSize`), **L5** (surface worker errors) and **L6** (worker leak when `transferControlToOffscreen` throws) need DOM or Worker fakes the Node test setup lacks. Each was left rather than changed without a failing test.
- **L7** (`nextBeat` retargets hr early): the next beat's time is already fixed when the command arrives, and the switch happens on that beat. The early retarget therefore only changes that one beat's QT fallback and `k_rhythm`. Judged immaterial and left.
- **L9** accepted, as the review allows.
- **M8** optional: finalising detections at the MWI maximum was not done. Wide-complex audible lag is now tolerated under R15, not dropped.
- **Not checked here:**
  - iPad and Safari (render path, `getOutputTimestamp`/`outputLatency` support, the silent switch, background resume);
  - a real Bluetooth output;
  - by-ear alignment.
  Headless Chrome reports `outputLatency` 0 on a fresh context, so the lateness rule used the `getOutputTimestamp`-derived latency.
- **Caveats:**
  - AF at 180 bpm is now on target, but its RR CV is 0.12 (0.19–0.27 at 40–150). At that rate the model runs on its refractory floor.
  - V4 R is 1.84 mV, just above the review's interim 1.2–1.8 mV. It was left for the Stage 5 PTB-XL refit.
  - At DPR 1 the trace measures 3 lit rows where it measured 2. Stage 1 eroded the line's antialiased edge every frame; a one-shot reference 1.75 px line measures 2–3.
