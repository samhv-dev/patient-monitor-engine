# Stage 1.1: Gate 1 fixes — Implementation Plan

> Executed with superpowers:executing-plans + superpowers:test-driven-development: for every finding, a failing
> test first, then the fix, then the full package suite, then one commit.

**Goal:** close the Stage 1 independent review (`docs/gates/stage-1-review.md`, findings H1–H5, M1–M8, the cheap Lows)
and apply the Gate 1 rulings R15–R19 (`../research/00-orchestrator-rulings.md`), with before/after numbers in
`docs/gates/stage-1.1.md`.

**Branch:** `stage-1.1-gate-fixes` → pull request against `main` (R20). Commit trailer
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; conventional commits; one commit per finding.

**Out of scope (other agents):** `packages/controller`, `packages/engine-core/src/l1/**`, `l2/hemo/**`.
Clean-room list unchanged (no ECGSYN, no GPL code).

## Tasks (in order)

| # | Finding / ruling | Test first (what must fail before the fix) | Fix |
|---|---|---|---|
| 1 | R15 (+ review refinement), H3, H5, M6, M7 | scheduler: duplicate ids play once; cancel by id stops an already-scheduled node; a tone late only by the device output latency still plays; a QRS tone that would sound > 150 ms after its R is dropped. engine: a command every tick still gives one tone per R and never re-posts a live id. audio: the fallback mapping subtracts latency; the context is resumed on `visibilitychange`/`pageshow` | `BEEP_DELAY_S` 0.030; stable ids `qrs-<R sample>`; engine tracks posted tones and cancels only the stale ones (`toneCancel.ids`); the scheduler dedupes by id, keeps node handles, subtracts `outputLatency` (fallback 0.02 s) from lateness, drops QRS tones only past 150 ms after R; demo diagnostics show AUDIBLE beep − R |
| 2 | R16, H4 | tangent-method QT measured on generated lead-II samples at 60/120/150 bpm (400/317/295 ± 10 ms); at 160 bpm the P onset precedes the T end | `DEFAULT_PR60_MS` 160; T peak moved to QT − 70 ms so the tangent end lands on QT |
| 3 | R18 | the lead-II F wave has no isoelectric segment and a slow-ramp/fast-return asymmetry, 0.3–0.4 mV p-p | F wave = 4-term Fourier sawtooth |
| 4 | H1 | sinus 40–220 bpm (with and without HRV) → detected HR within ±3 % | AV-node ERP for supraventricular conduction instead of ventricular refractoriness; QT from the prevailing cycle |
| 5 | H2 | DPR-1 raster of a steep synthetic R wave drawn frame by frame has no missing columns | erase from the right edge of the last drawn column |
| 6 | M1–M5, cheap Lows | AF rate at 40/180 ± 5 %; VT 120 with a conducted sinus beat never gives two QRS < 200 ms apart; lane 0 = aVL keeps a non-zero HR; `restore()` clears buffers; NaN/Infinity/out-of-range inputs are rejected | per the review's fix column |
| 7 | provenance | NOTICES row + NOTICE-ID header for cyrb53 (or an original hash); citation comments | — |
| 8 | R17 | templates test states II exact, I 70 %, III 30 %, normal R progression; no V-lead ratio target | — |
| 9 | R19 + brief | — (docs) | demo expectation ≤ 5 s; brief §3.6 and §4.1 numbers |
| 10 | gate | full suite, typecheck, build, check-notices, Playwright smoke, screenshots, `docs/gates/stage-1.1.md` | — |

## Environment notes

- pnpm via `npx -y pnpm@9.15.9`; no `timeout` on macOS; Playwright uses installed Chrome (`PW_SYSTEM_CHROME=1`).
- The demo dev server is already on `http://localhost:5199`; measure with headless Playwright scripts (the browser pane
  tab is hidden and throttled).
