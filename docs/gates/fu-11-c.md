# Gate note — FU-11 (c): engine and scenario command boundary, validation honesty, test infrastructure

Branch `fu-11-c`, from `origin/main` `48864439` (main had not moved at the gate: the merge of `origin/main` was "Already
up to date"). Plan: `docs/plans/fu-11-hardening.md` (STATUS FIXED, 2026-10-07), Parts I, J and K only. Executor: one
local session (Claude Opus 5.5), tasks in plan order, each red → green → commit → push. Every number is from this Mac,
shared with two other executors at the same time (load average 10–30 on 8 cores), so wall times are contended.

The plan was committed as this branch's first commit, as the executor brief instructed (the plan itself says "b only",
R50 M6). The copy is byte-identical to `fu-11-b`'s, so the merge is clean as long as b's copy is not edited before b
merges (see §6).

## 1. Blocks

`check-blocks.py --branch c` before Task I1 and again at the gate: **42 find/replace blocks (0 chained), 10 creates;
problems: 0**. Every block applied byte for byte; no block drifted.

## 2. Tasks (before → after)

| Task | Finding | Red (measured on this branch's base) | Green |
|---|---|---|---|
| I0 | — | before-numbers recorded (§3); `stage6a-screens` rewrote 3 `docs/gates/stage-6a/*.png` | — |
| I1 | F11 | 8 of 9 failed: inherited rhythm ids, NaN pacer rate, fault rate 3, meal without grams, paw/flow-only frame, inherited shock outcome and sepsis phase all accepted | 9/9; `engine-commands`, `lung-external` and the ventilator suite green |
| I2 | F13, F15 | 2 failed: a ramped `setModifiers` accepted; `{rr:16}` edit left `vent` without `pmax` | 2/2; `resp-vcv-pmax` (slow) and `engine-commands` green |
| I3 | F16, F17 (R50 M11) | 3 failed, 1 passed: `any([all([shock, HR>200]), shock])` stayed in `a`; MANUAL doc sent no `setMode`; a real MODELED host stayed `modeled` | 4/4; `test/scenario` 13 files / 106 green |
| I4 | F08 | 3 failed: no clock message after a refused / rejected / thrown probe | 3/3; ventilator 18 files / 100 green |
| J1 | F02 | 3 failed, 2 passed (all-NaN and middle-NaN green; NaN baseline green) | 5/5 |
| J2 | F22 | 3 failed, 1 passed: peaks in 10 s of zeros / a constant / NaN | 4/4; validation 32 files / 116 (+11 skipped) green |
| J3 | F21 | 1 failed: HR 10 000 run measurable | green; validate count unchanged (§3) |
| J4 | F23 | 1 failed: corrupt cache bytes returned, no fetch | green |
| J5 | F10 | failed: `overBudget` not exported | green; `perf:ticks --budget-ms` exits 1 over budget (manual release gate, D-9) |
| J6 | F20, R50 M8 | `readSamples('co2', 100.5)` returned NaN; the old replay test compared 300 NaN with 300 NaN (probe printed 300) | 4/4: integer index, 300 finite samples, span > 1 mmHg, equal |
| K1 | hotfix note | `PME_SHOTS= … stage6a-screens`: 3 PNGs ` M` | `stage6a-screens` + `fu1`: `git status docs/gates` empty; after the full e2e run `git status --short docs` empty |
| K2 | hotfix note | `stage6a.e2e -g rtc` (Chromium, macOS): 1 failed | `stage6a.e2e` + `stage6a-latency`: 1 skipped (rtc, reason given), 3 passed |
| K3 | CI flakes | no deterministic red (load-only) | `truth-event` 5/5, `ports` 3/3 |
| K4 | R50 F9 | `interactions-misc` in the fast set (1) | fast 0, slow-b 1; 0 duplicates; COVER-OK |

## 3. Suites (`CI=1`, local, branch head before this note)

| check | before (`48864439`) | after |
|---|---|---|
| `pnpm -r typecheck` | clean | clean |
| engine-core fast (`PME_TEST_SET=fast`) | 315 files, 1 397 tests listed | **317 files / 1 388 passed, 1 skipped** (+3 FU-11 files, −1 ET-19 to slow-b) |
| controller | 40 / 227 | 41 / 231 |
| ventilator | 17 / 97 | 18 / 100 |
| validation | 30 (+1 skipped) / 107 (+11 skipped) | 35 (+1 skipped) / 119 (+11 skipped) |
| audio, skins, renderer, demo | — | 58, 191, 90, 200 — all green |
| `resp-vcv-pmax.test.ts` alone (slow; I2's neighbour) | — | 2 passed |
| `validate --suites sanity,gates --quick` (J3) | 38 measurable, 1 not (`t22-term-spinal`); 80 graded targets: 51 green / 20 yellow / 9 red | **identical**: 38 measurable, 1 not (the same document); 80 targets, 0 grade differences |
| `npx playwright test --retries=0` (Chromium + WebKit) | — | full run under load: **88 passed, 32 skipped, 6 failed** — see below |
| `git status --short docs` after the full e2e run (K1) | 3 PNGs modified | **empty** |

**The six e2e failures of the contended full run.** Re-run alone (`--workers=1`): `stage4b-device` (Chromium),
`stage6a` over bc and over relay (Chromium), `showcase-capnogram` (WebKit) and `showcase-clock` (Chromium) **pass**.
`showcase-clock` (WebKit) failed twice more on the branch while the machine was at load ≈ 22 (the scenario list's
"Load" button not visible within the 90 s test budget), then passed twice on the branch and twice on `origin/main`
alternately (25–31 s). It is load-dependent and in no file or path this branch touches (I3's `setMode` change does not
apply to the app's own scenario load, which creates a new engine with the document's mode). The `validate` exit status
is 1 on both trees (9 red gating targets on `origin/main` itself).

## 4. The seven slow groups (K4, R50 F9)

Local (`vitest list --filesOnly`, the ci.yml check): `slow` 119 files = a 17 + b 14 + c 21 + d 34 + e 10 + f 12 + g 11,
**0 duplicates, COVER-OK**; `interactions-misc.test.ts` (ET-19) in slow-b, not in the fast set.

On the PR's CI run: _filled in after the first CI run (§7)._

## 5. Disclosures

- **K3 — a disclosed relaxation (R50 M16, R45).** `truth-event.test.ts` keeps its 1 ms per-call bound, but asserts the
  best of five 40-call batches instead of one 200-call mean. The statistic is more lenient: a runner's scheduler stall
  inflates one long batch, not the cost. `ports.test.ts`'s two engine-driving link tests get 30 s (CI amendment 3).
- **J3 — deferred (R50 M9).** No way to DECLARE an expected refusal in a validation document yet; no committed document
  needs one (the measurable count above did not change). Handed to 8b's validation section (plan appendix).
- **J5 — manual gate.** CI does not run `perf:ticks`; 8b's release checklist runs `perf:ticks --budget-ms <ms>` on an
  idle machine (plan appendix).
- **K2.** The macOS skip has a reason and an override (`PME_RTC=1`); CI (Linux Chromium) still runs the rtc paths.
- No physiology change; no band widened; no file outside the plan's Part I/J/K lists edited.

## 6. For the orchestrator

- **Plan copy in two branches.** `docs/plans/fu-11-hardening.md` is committed here (brief) and in `fu-11-b`, identical
  today, so whichever merges second merges cleanly. Both branches ADD the file, so if b's copy differs when it merges
  (ticks), git reports an add/add conflict on that one file; resolve by taking b's copy. This branch does not edit it
  after its first commit.
- `showcase-clock` on WebKit is load-sensitive (above); not changed here.

## 7. CI

_Filled in after the PR's first CI run._
