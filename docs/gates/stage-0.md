# Gate 0 — Scaffold (date: 2026-09-24)

Gate question: "Does CI go green from a clean clone, does the IIFE load from file:// in Safari and Chrome, and is sweep speed unchanged at 30 fps?"

| Check | Result |
|---|---|
| Clean clone: install, typecheck, test, build, check-notices | exit code: 0 (`git clone` → `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build && pnpm check-notices`; 23 tests passed across 6 packages; `check-notices: OK (0 governed files)`) |
| GitHub CI run (URL or "no remote yet") | no remote yet — CI not yet run on GitHub |
| Clock tests (10,000 random frames; clamp; pause/step) | pass — 6/6 in `packages/engine-core/test/clock/clock.test.ts` (10,000 frames × 5 scales exact; 5 s frame clamped; pause/step; 24 h run lands on tick 4,320,000) |
| RNG tests (reproducible; hrv independent of noise) | pass — 5/5 in `packages/engine-core/test/rng/sfc32.test.ts` |
| Stopwatch 10 s at 60 fps: cursor distance (px) / last lap (s) | 944.8 px (start x = 1.6 → x = 946.4, between the 10th and 11th tick marks; within 898–992) / last lap 10.58 s; readout "measured 94.49 px/s per sim s"; rAF 60.1 fps |
| Stopwatch 10 s at 30 fps: cursor distance (px) / last lap (s) | 944.9 px (x = 1.4 → 946.3) / last lap 10.60 s; readout "measured 94.34 px/s per sim s" (one lap quantised to 33 ms frames) |
| IIFE from file:// — Chrome: `PatientMonitor.version` | `'0.0.0'`, no console messages or page errors (Google Chrome 154, driven by Playwright `channel: 'chrome'`) |
| IIFE from file:// — Safari: `PatientMonitor.version` | NOT CHECKED — needs a manual double-click in Safari (automating Safari requires enabling "Allow Remote Automation", a settings change not made). CI's WebKit project covers the engine, not Safari itself |
| Playwright smoke (local system Chrome / CI Chromium+WebKit) | local `PW_SYSTEM_CHROME=1 pnpm test:e2e`: 1 passed (red first with no `dist/`: `Received: undefined`); CI Chromium+WebKit: not yet run (no remote); bundled browser download blocked from this location |

Notes:
- Stopwatch method: instead of a phone stopwatch, a Playwright script against the Vite dev server (`pnpm --filter @pme/demo dev`, `http://localhost:5199/stage0.html`) in Google Chrome waited for the cursor to wrap past x = 0, recorded sim time, waited 10.0 s of wall time (`performance.now()`), and converted the sim-time delta to lane px at 94.49 px/s. This is more precise than a hand stopwatch and uses the same readout the page shows.
- Other page behaviour seen in the same run: at 4× the last lap took 2.65 s wall and "measured" still read 94.34 px/s per sim s; Pause froze `simT` (78.147 s before and 1 s after).
- The built-in browser pane was used for a screenshot, but its tab was hidden (`visibilityState: hidden`, rAF ≈ 0.9 fps). The 250 ms frame clamp then limits sim time to ≈ 0.25 s per frame, as designed, so the pane cannot do a speed check while hidden.
- `playwright.config.ts` has a `PW_SYSTEM_CHROME=1` switch (one `chrome` project). The plan's Interfaces describe it, but its config listing left it out.
