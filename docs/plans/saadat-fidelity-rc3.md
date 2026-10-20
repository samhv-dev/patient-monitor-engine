# The Saadat-like skin as in the owner's photo IMG_8113 (rc.3) — Implementation Plan

**STATUS: REVIEWED-FIXED 2026-10-20** (draft 08:00 (+0330), amended 08:20; independent review FIX FIRST, no STOP,
`scratch/plans-backup/saadat-fidelity-plan-review.md`). The PR-L fixes L-1 to L-9 are applied in the text below; the
PR-T and PR-G fixes (T-*, G-*) are in the review file and bind those executors. Written by the planner for the
orchestrator's review.

**Review fixes applied (2026-10-20, orchestrator rulings).**
- **L-1:** L2 draws the lowest dotted line one dot inside the lane (it was clipped away on the lane's bottom edge).
- **L-2:** L2 darkens `ibp.scaleLineColor` in `applyTheme` and gives it its own provenance entry.
- **L-3:** L3 repaints the right-hand texts on wave lanes too (the early return for wave lanes in the frame loop), and
  tests a wave lane.
- **L-4:** L1b's ripple bound is `≤ 0.6×`, plus a step-shrink check. Executor ruling, see L1b: the shipped smoothing
  meets the stricter `≤ 0.5×`.
- **L-5:** no label and no speed text on the second ECG lane, as photographed; the pleth label is two lines.
- **L-6:** the scope check on skin data uses `git diff --name-only`; snapshot entries are checked by their id.
- **L-7:** no brand, vendor-module or model word anywhere in this file; the new test file is `tiles-photo.test.ts`.
- **L-8:** CHANGELOG `### Added` and `### Changed`; the T-rebase conflict list is extended.
- **L-9:** G1b (the mock-up colours) moves into PR-L as Task L5, so the colours ship even if PR-G is cut.

**Amendment 08:20.** The owner approved the static mock-up `scratch/skin-mockup/saadat-8113.html` and its
`NOTES.md` as the implementation target, with two corrections:
- **M1:** the EtCo2 / FiCo2 / AWRR digits are normal weight, like the NIBP digits;
- **M2:** the cardiogenic oscillations on the capnogram plateau are softer and fainter than in the mock-up.

So:
- the layout numbers, colours and fonts below come from `NOTES.md` (P2 is resolved);
- M1 is in T2;
- M2 is the new Task L1b.

**Base and preconditions.**
- Written 2026-10-20 on `origin/main` 0b39cd28 (#95), in the worktree `scratch/wt-plan-saadat` (branch
  `plan-saadat-fidelity`, untracked plan file; the executors copy it to their branch as the first commit).
- Every `file:line` below is on 0b39cd28. Treat it as a starting point only: find the code by the function name given.
- No open PR touches these files (only the docs PR #97 is open).
- **P1 (orchestrator, before L0/T0):** append `§8 Owner rulings after the audit (2026-10-20)` to
  `research/34-saadat-skin-audit.md`, copying O1–O4 verbatim from `research/00-orchestrator-rulings.md` (entry
  2026-10-20 07:49). Provenance entries cite `research/34 §8 O<n>`, because the provenance test accepts only
  `research/NN §n`, `research/NN Rn` or `brief §n` (`packages/skins/test/provenance.test.ts:5`).
- **P2 (resolved 08:20):** `scratch/skin-mockup/NOTES.md` is the owner-approved spec.
  - It was measured on the photo rectified to 1280×800 (a homography from the four screen corners).
  - Its numbers are in G1, T1 and T2, cited as `[MOCKUP]`.
  - Provenance cites `research/34 §8 (owner-approved mock-up, scratch/skin-mockup/NOTES.md, 2026-10-20)`. P1 adds
    this approval and M1/M2 to research/34 §8 as well.
- Planning only: no product file was changed while writing this plan.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal.** By the rc.3 freeze (Saturday 24 October 18:00 +0330; demo Wednesday 28 October), the `saadat-like`
skin renders like IMG_8113. The look is driven by skin JSON. Every other skin keeps its look and its tests.

**Architecture.** There are three PRs. Each is reverted by one revert, and each is opt-in by skin keys that only
`saadat-like` sets:
- **PR-L (lanes):** filled capnogram, dotted IBP scale lines with a middle value, lane text in white with
  right-hand labels and speeds. Files: `sweep-lane.ts`, `skin-plan.ts`, `monitor-core.ts`.
- **PR-T (tiles, header, defaults):** limits always shown in small red, units, per-tile weight, split tiles
  (EtCo2 | FiCo2 | AWRR), the PR tile, the NIBP tile, blank values (O1), a two-row header with 6 s rotation, and the
  NIBP default (O2). Files: `device-ui.ts`, `alarm-view.ts`, `numerics-hemo.ts`, the NIBP event in engine-core, and
  the demo session.
- **PR-G (layout):** an optional `layout.grid`. It sets the wave area to 63 % of the width, six lanes with the photo's
  heights, the right-hand tile grid with spans, the narrow T column and the full-width bottom strip. Files: `mount.ts`
  and `device-ui.ts`. Without `layout.grid`, the old two columns come back (rollback by data).

The tile CONTENT (PR-T) is the same DOM in the columns, in portrait and in the grid. PR-G only PLACES tiles. So the
demo keeps every PR-L/PR-T improvement if PR-G misses the cut.

**Tech Stack.** TypeScript strict, Vitest (+ happy-dom for DOM tests), Playwright (chromium + webkit), pnpm 9.15.9
(`npx -y pnpm@9.15.9`), Node ≥ 22.12, GitHub Actions `ci.yml`. A CI run takes ≈ 33 min (main runs 39336527426 …
39347405471, 19–20 October).

**Spec.**
- The brief: `scratch/briefs/plan-saadat-fidelity-rc3.md` (owner rulings O1–O4, scope A–G).
- The photo: `scratch/skin-mockup/IMG_8113.jpg`, a copy of the brief's scratchpad file.
- The audit: `research/34-saadat-skin-audit.md` §3 rows 1–21 and §4 items 2, 4 and 5.
- The skin contract: `packages/skins/CONTRACT.md`.

---

## Global Constraints

- **Paths** are relative to the repository root (`projects/patient-monitor-engine/repo`).
- **Worktrees:** `../scratch/wt-saadat-l`, `../scratch/wt-saadat-t`, `../scratch/wt-saadat-g`, each from
  `origin/main`. Never edit the main checkout `repo/` or `scratch/wt-rc2-tag`.
- **Install:** `npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null`.
- **Opt-in only.** Every new skin key is OPTIONAL in `packages/skins/src/schema.ts` (the `opt` argument of `obj`).
  Its absence reproduces today's behaviour exactly. Only `saadat-like.json` sets the new keys (and so does
  `iran-icu-as-found`, which inherits them; see E103). No other skin JSON changes.
- **Scope rule (audit §scope):** no brand name, logo or model name anywhere: in data, labels, tests, comments,
  commits, PR text or screenshots. The photo's CO2 lane label names a vendor's gas module, so the lane prints `CO2`
  (Divergence D7). The skin's `label` keeps its current text.
- **Words:** "pre-release"; "for education only, not a medical device and not clinically validated"; future work is
  "a later release" (never "v1.1").
- **No fake numbers (O1):** a value the engine does not publish is blank. A limit the engine's status does not
  carry is not printed. The photo's limit numbers for unmodelled fields are never copied (E100).
- **Provenance:** every new leaf has a covering entry, and every source matches `research/NN §n`, `research/NN Rn` or
  `brief §n`. Photo values cite `research/34 §3 row <n> (IMG_8113)`. Ruling values cite `research/34 §8 O<n>`.
  Planner measurements say `[MEASURED-PLANNER] IMG_8113 pixel read, ±2 %` in the note.
- **Stable selectors** that tests, the kit-round reader (`scripts/showcase/kit-round-a.kitround.ts:364, 781, 1122`),
  `showcase-support.ts:150` and the classroom load test read keep their meaning:
  - `.pme-stile[data-param=X]` (one per tile, in `ui.tiles` OR in the strip);
  - `[data-pme="v"]` = the main value only (never limits, units or labels);
  - `[data-pme="s"]`, `[data-pme="lbl"]`, `.pme-tile` (HR), `.pme-hdr`, `.pme-bar` (with `data-latched`), `.pme-lamp`
    (with `data-lamp`), and `canvas[data-lanes]`.

  New selectors are added, never renamed: `[data-lim]`, `[data-part]`, `[data-pme="src"]`, `[data-pme="heart"]`,
  `[data-pme="st"]`, `[data-pme="mode"]`, `[data-pme="ntime"]`, `[data-pme="page"]`, `[data-pme="bed"]`,
  `[data-pme="cat"]`, `[data-pme="time"]`, `.pme-strip`, `.pme-sfield`.
- **Shared machine.** One local e2e run at a time. Never an unfiltered `pkill`. Never a command that waits on stdin
  (`--reporter=list`; `CI=1` where a tool would prompt).
- **New tests and the retry rule — a retry is not a pass.**
  - Every new or changed e2e test passes 3 of 3 local runs on both projects before the push.
  - A new test is never tagged `@known-flaky`.
  - A CI job that passed only on retry is reported in the PR body as a failure of that test, not as green.
- **Model-docs guard.** `packages/validation/test/model-docs.test.ts` fails CI's build job when a `docs/model/*.md`
  page (rendered from code and comments, tests included) or `docs/validation/known-misses.md` is stale. Before EVERY
  push that follows a source change, run:

```bash
node --experimental-strip-types scripts/model-docs.ts && node --experimental-strip-types scripts/known-misses.ts
git status --short docs/model docs/validation/known-misses.md
git add docs/model docs/validation/known-misses.md && git commit -m "docs(model): regenerate after <task>"   # only if listed
npx -y pnpm@9.15.9 --filter @pme/validation test -- model-docs
```

  Expected: 0 stale pages, 0 orphans. Never hand-edit a `docs/model` page outside its hand blocks.
- **Freeze week.**
  - Every PR gets an independent read-only review (R-L, R-T, R-G) before merge.
  - Merges are serial, with main's CI green between them. Only the orchestrator merges or tags.
  - No merge after Saturday 18:00.
- **Pace assumption.** Executor hours run at ≈ 2× on agents (the debrief plan's measured pace). The Wednesday
  14:00 checkpoint tests it.
- **Screenshots** for the owner come from Chromium at 1280×800 (`#/monitor`, the default patient). The six-card
  and kit-round screenshots are re-taken by the release process, not by this plan.

---

## Review Focus

These are the five conditions most likely to bite a user that no other task's tests cover. Each has a test in the
task that owns the code.

1. **A skin switch at runtime between the grid and the columns** (saadat-like → philips-like → iran-icu-as-found →
   saadat-like, via Settings, with a theme). Expected:
   - the header goes back to full width;
   - the strip disappears;
   - the canvas resizes to the new wave-area width;
   - no tile or strip field is left over from the previous skin.

   Test: G3 Step 1 `grid ↔ columns switch leaves no strip and no grid tile`.
2. **The CO2 line attached or detached while the grid shows.** Expected:
   - the RR cell becomes the split CO2 tile in the same place, and back;
   - the strip and the other cells are not rebuilt in a different order;
   - `canvas[data-lanes]` swaps RESP↔CO2.

   Test: G3 Step 1 `the RR cell swaps to the CO2 tile in place`.
3. **projector-light and ecg-grid themes on saadat-like.** Expected: the limit red, the right-hand lane labels and the
   pleth label stay readable. The theme darkens them to its contrast ratio, as it darkens `colors`.
   Tests: L3 Step 1 `themes darken the lane-text label colours`, and T2 Step 1 `themes darken the limit colour`.
4. **A restore, a rewind or a phone joining late.** Expected:
   - the NIBP last-measurement time is blank (not 00:00:00) until the next measurement;
   - the mode label reappears with the next NIBP event;
   - the heart timer is cleared on `destroy()`;
   - the status lines follow an `arrhythmiaAnalysis` toggle within one alarm status (≤ 1 s).

   Tests: T4 Step 1 `after reset() the NIBP time is blank`; T3 Step 1 `PVCs line follows arrhythmiaAnalysis`.
5. **Small screens** (the Teach stage at 1280×800 and at 1024×640). Expected:
   - no tile value overlaps its limit pair;
   - "119 / 90" fits the NIBP cell;
   - the strip labels are not clipped.

   Not unit-testable (happy-dom has no layout). It is a REVIEWER CHECK in R-G with the two screenshots (Review
   hand-off §R-G item 5).

---

## Decisions this plan makes where the brief or the rulings were silent

1. **The live renderer applies `layout.waveAreaFraction` only when the skin has `layout.grid`** (PR-G). Other skins
   keep `flex:1` and their 180 px columns. The Stage 4a preview (`apps/demo/src/dev/skins/screen.ts:63`) keeps
   reading it for every skin. saadat-like's value changes from 0.41 to **0.63** (width; research/34 row 1). CONTRACT
   says "width fraction". See D4.
2. **The tile list stays `layout.tiles`.** `layout.grid` only places those tiles: one cell holds one or more params,
   and the strip holds one tile plus label fields. So these keep working unchanged: portrait mode, tile colours, the
   `whenAttached` swap and every `.pme-stile` selector.
3. **The grid follows the CO2 swap in `applySensors`.** A cell naming `RR` places whatever tile replaced RR. This is
   the one place the swap is resolved, as CONTRACT §Sensor swaps requires.
4. **Lane heights are relative weights**, one per `layout.lanes` entry. With any other lane count (the preset's four
   lanes, page P7, demo pages that pass `lanes`/`waves`), the lanes are equal height by the old code path, with
   byte-identical y values.
5. **Right-hand lane text sits inside the sweep area and is repainted when the erase bar passes it.** This is the
   mechanism the ECG label tail already uses (`monitor-core.ts:333-352`). It is not a reserved gutter, which would
   narrow the traces that the photo runs to the edge.
6. **Unconnected = blank (O1)** is done by data: saadat-like `glyphs.noValue` and `glyphs.inop` become `""`. So:
   - "IBP1 no sensor" reads `/` and `()`, as photographed;
   - a never-measured NIBP reads `/`;
   - modules listed in `layout.showAlways` (BFA) stay visible with blank values.

   Pulse-oximetry strip fields the engine does not model are label-only `StripField`s.
7. **NIBP mode and interval come from the engine.** Every `nibp` event gains optional `mode` and `intervalMin`, so a
   restore, a phone or a scenario command shows the right "AUTO(5Min)". The renderer does not track commands. The
   panel's "Off (manual)" sends `action: 'manual'`, which the engine rejects today (`apps/demo/src/app/panel/devices.ts:66`
   vs `packages/engine-core/src/l2/hemo/pipeline.ts:800`). Under O2 that becomes the only way out of AUTO, so the
   engine gains a `manual` action (T4).
8. **O2 is applied by the app from the skin's own data.** `AppSession.mount()` (free-play patient start/restart, not
   scenarios, not `?load=perf8`) dispatches `nibp auto <autoIntervalMin>` when the skin in use says
   `nibp.modeDefault: "AUTO"`. saadat-like changes to `AUTO`/5. Other skins' documented defaults (iec-defaults
   AUTO 15; lifepak-like MANUAL) then also take effect in the app: see E95.
9. **The header clock is the wall clock** (as today's date). The NIBP time is the wall time at which THIS window
   received the result (blank after a restore or a late join; E102). Rotation stays on sim time (today's semantics,
   `alarm-view.ts:66`).
10. **Status lines and source label** (PR tile) are derived from data the renderer already has:
    - `PACE:` from `ecg.paceDetectDefault`;
    - `ST:` from `st.defaultOn` (no runtime ST switch exists);
    - `PVCs:` from `alarmStatus.arrhythmiaAnalysis`, blank when on (no PVC numeric, O1);
    - the source label is the `hr.autoPriority` key in use: `(ECG)`, `(IBP1)` or `(SPO2)` (E99).

---

## Divergences (brief or audit vs what the code and the photo show)

- **D1.** `apps/demo/src/app/session.ts:39` is the `?load=perf8` validation load, not the app default. Today the
  free-play patient's NIBP is idle (MANUAL); nothing cycles every 3 min. The ruling's "today session.ts:39 sets
  auto 3 min" is a misreading. O2 is planned from MANUAL.
- **D2.** O3 already holds in the app: `apps/demo/src/app/patients.ts:54` attaches ecg/spo2/nibp/co2/temp and no
  `abp`/`cvp`. T5 adds a test only. IBP1 = ART (abp, `#E08080`, red) and IBP2 = CVP (cvp, `#6C9CF8`, blue) already
  hold (`skin-plan.ts:55`, saadat-like J:23). The photo's IBP2 trace is arterial; O3 rules it CVP, so our IBP2 tile
  shows the CVP mean only (`ibp.meanOnlyLabels`), not "109 / 73 (88)".
- **D3.** O4 conflicts with ruling S1 (2026-10-04: "on the default Saadat-style monitor the capnogram is visible").
  The free-play patient is spontaneously breathing AND has the CO2 line attached (`patients.ts:54`
  `co2: 'on'`), so today it shows EtCO2. That is the gap. The skin and renderer side of O4 (`whenAttached`
  RESP→CO2, RR→CO2 tile) works and is tested (`packages/skins/test/sensor-swap.test.ts`). See T6 and E94.
- **D4.** `layout.waveAreaFraction: 0.41` (J:34, "measured research/06 §3.1 F1") matches the wave AREA share
  (0.63 width × 0.65 height ≈ 0.41) [GUESS]. The Stage 4a preview reads it as a WIDTH, so the plan sets 0.63 and
  defines it as width.
- **D5.** On IMG_8113 the header and the message bar span the WAVE AREA only, because the PR tile starts at the top
  edge of the screen. So in PR-G the header moves into the left column. The audit row 1 said "header ≈ 6 % of
  height" without placing it.
- **D6.** IMG_8113 reads "25 mm/s" on both IBP lanes. The skin says 12.5 (manual; the audit saw 12.5 on bed 04,
  IMG_8108). The target is 8113, so `sweep.ibp.default` → 25 (L3).
- **D7.** The photo's CO2 lane label names a vendor's module, so the plan prints `CO2` (scope rule).
- **D8.** FU-5 removed the HR `PACE`/`PVCs` and BFA `SQI`/`EMG` extras for lack of numerics (CONTRACT.md:121-123).
  O1 brings them back as status lines and blank labels; CONTRACT records the reversal.
- **D9.** The bottom strip: audit row 1 says ≈ 16 %, the planner's unrectified read gave ≈ 12 %, and the approved
  mock-up says **14.5 %** (rectified). The plan uses 14.5 %.
- **D10.** The mock-up's message-bar text is `#66767C` on `#B0E0E8`. That pair is ≈ 3.4:1, below the WCAG AA 4.5:1
  that `alarm-view.test.ts` asserts for the technical-message text. The plan keeps `#4A5A64` (research/34 T5) for
  both the bar text and the page-box text, with bar and box background `#B0E0E8` as the mock-up.
- **D11.** NOTES.md: the PR "98" is **upright bold**, not the bold italic of research/34 row 4. The plan follows the
  mock-up (the HR tile has weight 700 and no italic).
- **D12 (M2).** Today's engine capnogram, measured at planning on the `co2` channel (seed 1, HR 98, RR 12,
  ventilated, saadat-like sampler; a throwaway test, not committed):
  - the late-plateau deviation from a 0.6 s centred mean is **≈ 0.62 mmHg** with the cardiogenic term, and
    ≈ 0.47 mmHg with it set to 0 (the rest is plateau curvature);
  - the largest sample-to-sample step on the plateau is **0.16 mmHg** with the term and 0.05 without.

  So our oscillations are ≈ ±0.3–0.5 mmHg (1–2 px at the photo's 1.9 px/mmHg) and look coarse: steps 3× the
  plateau's own. They come from ENGINE PHYSIOLOGY: `packages/engine-core/src/l2/co2/capno.ts:21`
  (`CARDIO_MMHG = 1.5`) and `:116-122`, a Gaussian of 70 ms per beat on the late plateau when te > 2 s, before the
  sampler. Per the coordinator, the plan does NOT change it; see L1b.

---

## File map

| File | PR | Responsibility |
|---|---|---|
| `packages/skins/src/types.ts`, `schema.ts`, `resolve.ts` | L, T, G | New optional keys; theme darkening of the new colours; the grid follows the CO2 swap |
| `packages/skins/src/data/skins/saadat-like.json` | L, T, G | The data (values and provenance) |
| `packages/skins/CONTRACT.md` | L, T, G | Each new key; the unused keys marked |
| `packages/renderer/src/ctx.ts`, `test/fake-ctx.ts` | L | `fill()` |
| `packages/renderer/src/sweep-lane.ts` | L | `fill`, `hLines` |
| `packages/renderer/src/skin-plan.ts` | L, G | `PlanLane.fill/scaleLines/scaleMid/scaleSuffix/rightLabel`, `RenderPlan.laneText/laneWeights` |
| `packages/renderer/src/monitor-core.ts` | L, G | Lane text, right-hand repaint, lane weights |
| `packages/renderer/src/alarm-view.ts` | T | `rotateS`, `TileAlarmView.pairs`, `hrStatusLines` |
| `packages/renderer/src/numerics-hemo.ts` | T | `nibpModeLabel`, `formatWallTime` |
| `packages/renderer/src/device-ui.ts` | T, G | Header two-row, tile skeleton, parts, PR/NIBP tiles, grid and strip |
| `packages/renderer/src/mount.ts` | T, G | `MountOptions.bed`; the left column, strip and placement |
| `packages/engine-core/src/types-hemo.ts`, `l3/nibp/nibp.ts`, `l2/hemo/pipeline.ts` | T | `nibp` event `mode`/`intervalMin`; `manual` action |
| `apps/demo/src/app/session.ts`, `panel/devices.ts`, `patients.ts`, `views/vent.ts` | T | O2, panel select, O4 |
| `CHANGELOG.md` `[Unreleased]` | L, T, G | One "Changed" line per PR |

---

## Effort, CI load, and who does what

| Task | Executor h | CI / machine | Owner needed | Who |
|---|---|---|---|---|
| L0 gate + baseline | 0.3 | unit ≈ 3 min | — | Executor 1 |
| L1 filled capnogram | 2.0 | — | — | Executor 1 |
| L1b softer cardiogenic ripple (M2, display-side) | 1.5 | — | owner judges on the screenshot | Executor 1 |
| L2 dotted IBP scale lines + middle value | 1.5 | — | — | Executor 1 |
| L3 lane text, right labels, speeds, IBP 25 mm/s | 3.0 | — | (E97, E98 defaulted) | Executor 1 |
| L4 tests, docs, PR | 1.5 | e2e showcase-capnogram + device-layer ×3 both ≈ 10 min; **CI-L1, CI-L2** | — | Executor 1 |
| R-L review | (1.5) | — | — | reviewer |
| **PR-L** | **≈ 9.8 h (≈ 5 h wall)** | **3 runs (incl. main CI-L3)** | | |
| T0 gate + baseline | 0.3 | unit ≈ 3 min | — | Executor 2 |
| T1 two-row header, 6 s rotation | 2.5 | — | (E96, E104 defaulted) | Executor 2 |
| T2 tile skeleton: red limits, units, weights, split parts, O1 blank | 4.5 | — | (E100, E101 defaulted) | Executor 2 |
| T3 PR tile: source, heart, status lines | 2.5 | — | (E99, E105 defaulted) | Executor 2 |
| T4 NIBP tile + engine `mode`/`manual` | 3.0 | engine unit ≈ 4 min | — | Executor 2 |
| T5 O2 default, O3 check, housekeeping | 1.5 | demo unit ≈ 2 min | E95 | Executor 2 |
| T6 O4: line detached by default (cut first) | 2.0 | e2e showcase-capnogram + vent-view-restore ×3 both ≈ 12 min | **E94** | Executor 2 |
| T7 tests, docs, PR | 2.0 | e2e set ×3 both ≈ 25 min; **CI-T1, CI-T2** | — | Executor 2 |
| R-T review | (1.5) | — | — | reviewer |
| **PR-T** | **≈ 18.3 h (≈ 9 h wall)** | **3 runs** | | |
| G1 `layout.grid` schema, swap, data | 2.0 | — | (E103 defaulted) | Executor 1 |
| G1b colours from the mock-up | 1.0 | — | — | Executor 1 |
| G2 lane weights | 1.5 | — | — | Executor 1 |
| G3 grid, strip, left column; rollback test | 5.0 | — | — | Executor 1 |
| G4 tests, screenshots, docs, PR | 2.0 | e2e set ×3 both ≈ 25 min; **CI-G1, CI-G2** | the photo comparison (15 min) | Executor 1 |
| R-G review | (1.5) | — | — | reviewer |
| **PR-G** | **≈ 11.5 h (≈ 6 h wall)** | **3 runs** | | |
| **Plan total** | **≈ 39.5 executor-h + ≈ 4.5 reviewer-h** | **9 CI runs ≈ 33 min each** | owner ≈ 30 min | |

**Calendar (+0330).**
- Tue 20, 08:00–10:30: plan review (R-P), the orchestrator's rulings, P1, and the questions to the owner.
- Tue 10:30: L0 and T0 start in parallel.
  - PR-L opens ≈ 16:00 → CI-L1 → R-L → CI-L2 → merge ≈ 21:00 → CI-L3.
  - T rebases onto main after L's merge. Conflicts are limited to `saadat-like.json`, `schema.ts`, `types.ts`,
    `CONTRACT.md`, `skin-plan.test.ts`, `CHANGELOG.md`, `resolve.ts` (L2/L3 and T2 both edit `applyTheme`),
    `resolve.test.ts.snap` (re-run `vitest -u` after the rebase; never hand-merge) and `docs/model/presentation.md`
    (regenerate), and are data-only (review L-8). PR-L also changed the saadat-like colours (L5): T's tests that pin
    saadat-like hexes take the L5 values.
- Wed 21, 14:00: **checkpoint** (scope-cut rule). PR-T opens ≈ 16:00 → CI-T1 → R-T → CI-T2 → merge ≈ 22:00 → CI-T3.
- Thu 22, 09:00: G1 starts on main (L + T). PR-G opens ≈ 16:00 → CI-G1 → R-G Thursday evening.
- Fri 23: the fixes, then CI-G2. Merge ≈ 14:00 → CI-G3. Owner photo comparison Friday evening.
- Sat 24, 12:00: **cut decision for PR-G**. Until 18:00: buffer, and the release process's screenshots.

**Cut line.**
- **Must land for the demo (the floor): PR-L whole, and PR-T without T6.** Latest merge: Friday 18:00.
  - The capnogram, the IBP scale lines, the lane text, the 6 s rotation, the header items, the red limits, the
    blank values, the PR and NIBP tiles, and NIBP AUTO 5 min.
  - These are audit §4 item 2, plus rows 4, 8 and 14 inside the old two columns.
- **Scope-cut rule, Wednesday 14:00:** if T1–T5 are not all committed, cut in this order, one at a time:
  1. T6 (O4; it waits for E94 anyway);
  2. T3's heart and status lines (keep the source label and colour);
  3. T1's two-row arrangement (keep the 6 s rotation and the header items in today's single row).
- **Target: PR-G.** It merges only if R-G's first line says no blocker and CI-G2 is green by **Saturday 12:00**.
  Otherwise it goes to a later release, and rc.3 ships the two-column look with PR-L and PR-T.
- **Cannot fit before Saturday:** the beep (audit row 6, an audio ruling: FX-16 / E66), a second ECG lead (E70), and
  the solar header date (E65). None of them is in this plan.

---

## Tasks

### Task L0: Launch gate, worktree, baseline (Executor 1)

- [ ] **Step 1.** Create the worktree and install.

```bash
cd projects/patient-monitor-engine/repo && git fetch -q && git worktree add -b saadat-lanes ../scratch/wt-saadat-l origin/main
cd ../scratch/wt-saadat-l && npx -y pnpm@9.15.9 install --frozen-lockfile --prefer-offline < /dev/null
cp ../wt-plan-saadat/docs/plans/saadat-fidelity-rc3.md docs/plans/ && git add docs/plans/saadat-fidelity-rc3.md && git commit -m "docs(plans): Saadat-like fidelity (rc.3)"
npx -y pnpm@9.15.9 --filter @pme/renderer test && npx -y pnpm@9.15.9 --filter @pme/skins test
```

  Expected: both green. Note the test counts (they are the baseline in the PR body).

### Task L1: Filled capnogram (audit row 2)

**Files:**
- Modify: `packages/renderer/src/ctx.ts:3-23` (add `fill(): void;`), `packages/renderer/test/fake-ctx.ts` (record
  `{ op: 'fill', style: String(this.fillStyle), clip: this.clipRect }`).
- Modify: `packages/renderer/src/sweep-lane.ts:15-35` (`LaneConfig.fill?: boolean`) and `:159-211`
  (`draw` → `fillWrapped` before `strokeWrapped`).
- Modify: `packages/renderer/src/skin-plan.ts:8-23, 98-111` (`PlanLane.fill: boolean`; legacyPlan `fill: false`).
- Modify: `packages/renderer/src/monitor-core.ts:312-317` (pass `fill: pl.fill`).
- Modify: `packages/skins/src/types.ts` (`co2.fill?: boolean`), `schema.ts:190` (opt `fill: bool`),
  `saadat-like.json:138` (`"fill": true`) + provenance `co2.fill` `{ "tag": "measured", "source": "research/34 §3 row 2 (IMG_8113: area under the capnogram filled yellow, 4 of 4 units)" }`.
- Test: `packages/renderer/test/sweep-lane-4b.test.ts`, `skin-plan.test.ts`.

**Interfaces:**
- Produces:
  - `LaneConfig.fill?: boolean` (default false);
  - `PlanLane.fill: boolean` (true only for a `CO2` lane of a skin with `co2.fill`);
  - `Ctx2D.fill(): void`.

- [ ] **Step 1: Failing tests.**
  - `sweep-lane-4b.test.ts`: `it('a filled lane fills under the trace down to the zero line, clipped to the band, in the lane colour')`.
    Set up a SweepLane with `fill: true` and `scaleFor(0, 50, 100, 4)`, rate 62.5, mmPerS 6, colour `#F0F030`. Feed
    40 mmHg for 1 s. Then:
    - `ctx.calls` has ≥ 1 `{ op: 'fill', style: '#F0F030' }`, each with a non-null `clip`;
    - some `lineTo` ends at y = `cfg.y + cfg.height` (the 0 mmHg line).
  - The same test with `fill` omitted: no `op: 'fill'` call (every other lane and skin is unchanged).
  - `skin-plan.test.ts:23-28` (saadat attached): add `expect(p.lanes[2]).toMatchObject({ fill: true })`. Also check
    philips-like: `renderPlan(resolveSkin('philips-like')).lanes.every((l) => l.fill === false)`.
- [ ] **Step 2: Run, verify they fail.** Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/sweep-lane-4b.test.ts test/skin-plan.test.ts`.
  Expected: FAIL (`fill` missing).
- [ ] **Step 3: Implement.**
  - `private fillWrapped(ctx, pts, band)` in `sweep-lane.ts` mirrors `strokeWrapped`:
    - same clip;
    - per lap segment: `beginPath`, `moveTo(x0, base)`, `lineTo` every point, `lineTo(xN, base)`, then `fill()`;
    - `base = c.y + c.baseline * c.height`, clamped to the lane (the 0 line of a [0, 50] lane is its bottom);
    - `fillStyle = c.color`.

    It is called first, so the stroke stays on top. Because the tail points are re-filled with the band, joins
    have no gaps.
  - `renderPlan`: `fill: id === 'CO2' && s.co2.fill === true`.
- [ ] **Step 4: Run, verify they pass.** Same command. Expected: PASS. Also run
  `npx -y pnpm@9.15.9 --filter @pme/renderer test`. Expected: all green (FakeCtx gained a method; nothing else
  changes).
- [ ] **Step 5: Commit** `feat(renderer): filled capnogram lane (skin co2.fill; saadat-like on)`.

### Task L1b: Softer, fainter cardiogenic oscillations on the drawn capnogram (owner correction M2; D12)

**Choice: display-side smoothing of the saadat-like CO2 lane. No engine or physiology change.**

Why this, and not an amplitude parameter in `capno.ts`:
- An engine gain sits before the sampler. It would move the EtCO2 numeric, because the late-plateau peaks feed it,
  and it would change the airway signal that the debrief and the trends record.
- A causal moving average on the DRAWN samples changes neither.
- At 6 mm/s a 160 ms window is ≈ 1 mm on the screen, so the square shape and the upstroke stay as they are. The
  ≈ 50 ms-wide oscillations lose about half their size and their coarse steps.

If the owner still finds them too strong after G4's screenshot, the later-release option is an engine
`co2.cardiogenicGain` read in `capno.ts:120`, which needs its own EtCO2 check.

**Files:**
- Modify: `packages/skins/src/types.ts` and `schema.ts:190`: `co2.displaySmoothMs?: number` (num 0–500).
- Modify: `saadat-like.json:138`: `"displaySmoothMs": 160` [GUESS: start value; the owner judges on the screenshot].
  Provenance: `{ "tag": "measured", "source": "research/34 §8 M2 (owner, 2026-10-20: cardiogenic oscillations softer and fainter than the mock-up)", "note": "display-side only: the engine's co2 channel and EtCO2 are unchanged (capno.ts CARDIO_MMHG kept); measured at planning ±0.3–0.5 mmHg with plateau steps 0.16 mmHg (plan D12)" }`.
- Modify: `skin-plan.ts`: `PlanLane.smoothMs: number`. It is `s.co2.displaySmoothMs ?? 0` for a `CO2` lane, else 0.
  legacyPlan: 0.
- Modify: `sweep-lane.ts`:
  - `LaneConfig.smoothN?: number` (samples; 0 or 1 = off);
  - in `draw` (`:172-176`), when `smoothN > 1`, read `smoothN − 1` extra samples before `lastIndex + 1` (clamped at
    0), replace each new sample by the mean of itself and the `smoothN − 1` before it, and hand only the new samples
    to `decimateMinMax`;
  - the backfill path (`:163-170`) does the same.
- Modify: `monitor-core.ts:312-317`: `smoothN: Math.max(1, Math.round((pl.smoothMs / 1000) * rate))`; for 62.5 Hz
  and 160 ms that is 10.
- Test: `sweep-lane-4b.test.ts`, `skin-plan.test.ts`.

**Interfaces:**
- Produces: `PlanLane.smoothMs` and `LaneConfig.smoothN`. With `smoothN` unset, `draw` reads exactly what it reads
  today (byte-identical calls for every other lane and skin).

- [ ] **Step 1: Failing tests.**
  - `sweep-lane-4b.test.ts`:
    - `it('smoothing halves a 50 ms plateau ripple and keeps the 0→38 mmHg upstroke within 160 ms')`.
      Synthetic 62.5 Hz source: 0 mmHg for 1 s, then 38 mmHg plus `0.5·exp(−((t − t_k)/0.05)²)` at 1.6 Hz beats. Lane
      `scaleFor(0, 50, 100, 4)`, mmPerS 6. Compare the drawn y points (from `lineTo` calls) with `smoothN: 10` against
      `smoothN` unset:
      - on the plateau, max |y − median y| is ≤ 0.5× the unsmoothed one;
      - the first point at ≥ 90 % of 38 mmHg is ≤ 10 samples later than unsmoothed.
    - `it('no smoothN: the sample reads and the drawn points are unchanged')`: the same source, the `read` calls'
      `from` arguments and the point list equal a lane built without the key.
  - `skin-plan.test.ts`: saadat-like attached `p.lanes[2].smoothMs === 160`; every philips-like lane `smoothMs === 0`;
    saadat-like ECG/IBP/PLETH lanes 0.
- [ ] **Step 2: Run, verify they fail.** Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/sweep-lane-4b.test.ts test/skin-plan.test.ts`.
- [ ] **Step 3: Implement** as in Files. The fill (L1) uses the smoothed points, so the fill edge and the line agree.
- [ ] **Step 4: Run, verify they pass,** then `--filter @pme/renderer test` (green). Then
  `npx -y pnpm@9.15.9 --filter @pme/engine-core test -- capno`: green and untouched (no engine file in this diff).
- [ ] **Step 5: Commit** `feat(renderer): display-side smoothing of the saadat-like capnogram (softer cardiogenic ripple, M2)`.

**Review L-4 and the executor's ruling (2026-10-20).**
- L-4: a 10-sample causal mean keeps ≈ 0.53 of a 50 ms bump, so the `≤ 0.5×` bound fails on correct code. Bound it at
  `≤ 0.6×`, and add the step check: the largest plateau point-to-point step is `≤ 0.5×` the unsmoothed one.
- Measured on the engine's `co2` channel (seed 1, HR 98, RR 12 ventilated, saadat-like; the ripple isolated by a
  second run with `CARDIO_MMHG = 0`, not committed): the late-plateau ripple is 0.90 mmHg peak to peak; a plain
  160 ms mean leaves 0.71 (−21 %), because after the sampler the ripple is mostly at the heart rate, not in the narrow
  bump. Halving it needs ≈ 320 ms, and a plain 320 ms mean slows the 10–90 % upstroke from 24 to 30 samples and fills in
  a curare cleft.
- **Ruling (shipped):** `displaySmoothMs: 320`, and the renderer averages only where the window's range is under
  1.5 mmHg, draws the sample as it is over 3 mmHg, and blends in between (`LaneConfig.smoothGate`,
  `SMOOTH_GATE_MMHG`). Result: 0.90 → 0.43 mmHg, the upstroke and a 3–15 mmHg cleft unchanged. The tests bound the
  ripple at `≤ 0.5×` (stricter than L-4) and the step at `≤ 0.5×`, and pin the upstroke and the cleft.

### Task L2: Dotted IBP scale lines with a middle value (audit row 11; wires `ibp.scaleLines`)

**Files:**
- Modify: `sweep-lane.ts:15-35` (`LaneConfig.hLines?: { values: number[]; color: string } | null`), `:67-75` (`reset`)
  and `:138-156` (`clearSpan`): after `paintGrid`, call `paintHLines(ctx, rect)`.
- Modify: `skin-plan.ts:106-110` (`PlanLane.scaleLines: number[] | null`, `PlanLane.scaleMid: number | null`).
- Modify: `monitor-core.ts:312-317` (pass `hLines`), and `:371-375` (draw `scaleMid` at x 20, y = the mid line − 7).
- Test: `sweep-lane-4b.test.ts`, `skin-plan.test.ts`, `monitor-core-4b.test.ts:21-25`.

**Interfaces:**
- Produces: `PlanLane.scaleLines` = `[hi, mid, lo]` of `ibp.scales[key]` when `s.ibp.scaleLines === 'dotted-upper-mid-lower'`
  and the lane has an IBP scale key; else null. `PlanLane.scaleMid` = that mid; else null.
  `LaneConfig.hLines` = `{ values: scaleLines, color: s.ibp.scaleLineColor ?? lane colour }` or null.
  The new optional skin key is `ibp.scaleLineColor?: Hex`. saadat-like sets **`#8A8C92`** [MOCKUP: "dotted scale
  lines #8A8C92"]; `applyTheme` (`resolve.ts`) darkens it as it darkens `colors`, and it has its own provenance entry
  `ibp.scaleLineColor` citing `research/34 §8 (owner-approved mock-up …)` (review L-2; the `ibp` entry would otherwise
  cover it with the wrong source). Test: `themes.test.ts` `themes darken the IBP scale-line colour`.

- [ ] **Step 1: Failing tests.**
  - `sweep-lane-4b.test.ts`: `it('scale lines are dotted: a dot every 14 px at each value, the lowest inside the lane, repainted wherever the lane is cleared')`.
    On a lane with `hLines: { values: [200, 120, 40], color: '#8A8C92' }`, `reset` makes `fillRect` dots in that
    colour on three rows: the lane top, `yOf(120)`, and the LOWEST value one dot inside the bottom edge
    (`y < cfg.y + cfg.height`; review L-1), at x step 14 from the lane's left edge (the approved mock-up's dot pitch,
    executor ruling; the draft said 4). The count is `Math.floor(width / 14) ± 1`. A `draw` that clears a band repaints
    the dots inside the band only.
  - `skin-plan.test.ts:7-21`:
    - `p.lanes[3]` toMatchObject `{ scaleLines: [200, 120, 40], scaleMid: 120 }`;
    - `p.lanes[4]` `{ scaleLines: [30, 10, -10], scaleMid: 10 }`;
    - `p.lanes[0].scaleLines` null;
    - philips-like ART `scaleLines` null (iec-defaults `"none"`).
  - `monitor-core-4b.test.ts:23`, intermediate value (L3 replaces it): `['II  X1  NORMAL', 'II  X1  NORMAL', 'RESP', 'IBP1', '200', '120', '40', 'IBP2', '30', '10', '-10', 'PLETH']`.
    `:33` (philips-like) unchanged.
- [ ] **Step 2: Run, verify they fail.**
- [ ] **Step 3: Implement.**
  - `paintHLines`: clip to the rect; dot size `s = max(1, round(1.4·dpr)) / dpr`; for each value
    `y = min(cfg.y + cfg.height − s, max(cfg.y, round(yOf(v)·dpr) / dpr))` (review L-1: a fillRect needs no +0.5, and the
    lowest line must not land on the next lane's first row). Draw `fillRect(x, y, s, s)` for x from the lane's x in
    steps of 14 CSS px, anchored to the lane's left edge so dots do not crawl.
  - The middle value is drawn at x 20 with its text top 13 px above its line (it sits on the line, as the mock-up's
    "80" and "70"; executor ruling, the draft said line − 7).
  - `yOf` already maps mmHg through `scaleFor`.
- [ ] **Step 4: Run, verify they pass;** `--filter @pme/renderer test` green.
- [ ] **Step 5: Provenance and contract.**
  - `saadat-like.json` provenance: add `ibp.scaleLines` `{ "tag": "measured", "source": "research/34 §3 row 11 (IMG_8113: dotted lines 130/80/30 and 100/70/40, middle value indented)" }`.
  - CONTRACT: `ibp.scaleLines` is now read by the renderer.
  - Commit `feat(renderer): dotted IBP scale lines with the middle value (skin ibp.scaleLines)`.

### Task L3: Lane text in white, right-hand labels and speeds; IBP at 25 mm/s (audit row 9; D6, D7)

**Files:**
- Modify: `packages/skins/src/types.ts:123-134` and `schema.ts:121-128`. Add
  `layout.laneText?: { labels?: Partial<Record<LaneId, { text: string; color?: Hex }>> }`.
  Its presence switches lane text to the skin foreground, wave labels to the right and the speed text on.
- Modify: `resolve.ts:103-115` (`applyTheme`): darken `layout.laneText.labels[*].color` with `darkenToContrast`, as
  the `colors` loop does.
- Modify: `skin-plan.ts` (`RenderPlan.laneText: { color: string } | null`; `PlanLane.rightLabel: { text: string; color: string } | null`;
  `PlanLane.scaleSuffix: string`, which is `s.co2.scaleUnit` for the CO2 lane with laneText, else `''`).
- Modify: `monitor-core.ts`:
  - `drawChrome` `:355-401`, wave branch with laneText: the scale numbers in `laneText.color`, the top one with
    `scaleSuffix`, then `rightLabel` right-aligned at (cssW − 6, y0 + 6), then the speed text right-aligned at
    (cssW − 6, y0 + h − 18). ECG branch: the label in `laneText.color`, then the speed text.
  - `repaintLabelTail` `:333-352`: the colour `laneText?.color ?? pl.color`.
  - The frame loop `:218-225`: call `repaintRightTexts(i, lane)` after each lane draws, ECG AND wave: the wave branch
    returns early at `:220`, so the call goes after `drawWave` too (review L-3). A lane cleared whole (a detached line,
    a jump) gets its texts back at once (`SweepLane.generation`).
  - With lane text, an ECG lane that shows the same lead as an earlier ECG lane has no label and no speed text, as
    photographed (review L-5); a different lead is labelled.
- Modify: `saadat-like.json`:
  - `"laneText": { "labels": { "IBP1": { "text": "IBP" }, "IBP2": { "text": "IBP" }, "PLETH": { "text": "NORMAL", "color": "#F0F030", "sub": "X1" } } }`
    (the pleth label is "NORMAL" in yellow over "X1" in white, review L-5; `sub` is an optional second line; L5 sets the
    yellow to `#ECE84A`);
  - `sweep.ibp.default` 12.5 → 25;
  - provenance `layout.laneText` `{ "tag": "measured", "source": "research/34 §3 row 9 (IMG_8113: white lane text; labels at the right; \"25 mm/s\"/\"6 mm/s\" on every lane; pleth \"NORMAL X1\" in yellow; the CO2 label printed CO2, not the photo's module name)" }`;
  - `sweep.ibp.default` `{ "tag": "measured", "source": "research/34 §3 row 9 (IMG_8113: \"25 mm/s\" on both IBP lanes)", "note": "was 12.5 (research/06 §3.2, M p.302-306; bed 04 IMG_8108 shows 12.5)" }`.
- Test: `monitor-core-4b.test.ts:21-25`, new `packages/renderer/test/lane-text.test.ts`, `skin-plan.test.ts:12`,
  `packages/skins/test/resolve.test.ts:21-24`, `packages/skins/test/themes.test.ts`, and the
  `resolve.test.ts.snap` entries for saadat-like and iran-icu-as-found.

**Interfaces:**
- Consumes: L2's `scaleLines`/`scaleMid`.
- Produces:
  - `RenderPlan.laneText` — non-null only when `s.layout.laneText` is present and no `only` override is passed;
    demo pages that name their lanes keep the old look;
  - `PlanLane.rightLabel` — the label text from `laneText.labels[id]` or `id`, in its colour or the foreground;
  - speed text `formatSpeed(mmPerS: number): string` → `'25 mm/s'`, `'6 mm/s'`, `'12.5 mm/s'`, exported from
    `skin-plan.ts`.

- [ ] **Step 1: Failing tests.**
  - `monitor-core-4b.test.ts:23` (saadat, detached):
    `['II  X1  NORMAL', '25 mm/s', 'RESP', '6 mm/s', '200', '120', '40', 'IBP', '25 mm/s', '30', '10', '-10', 'IBP', '25 mm/s', 'NORMAL', 'X1', '25 mm/s']`
    (no label and no speed on the second ECG lane, review L-5).
    Rename the title to "… lane text in white, labels and speeds at the right (research/34 row 9)". `:33` philips-like
    is unchanged (the old texts).
  - `lane-text.test.ts`:
    - `it('saadat-like with the CO2 line: the top scale reads "50mmHg", the label CO2 at the right, "6 mm/s"')`, via
      `renderPlan(resolveSkin('saadat-like', { sensors: { co2: true } }))`. The texts for lane 2 are
      `['50mmHg', '0', 'CO2', '6 mm/s']`, and the `fillText` style strings for `CO2` and `6 mm/s` start with `right:`.
    - `it('lane text is drawn in the skin foreground; the pleth label in its own colour')`: the fillText calls for
      `'II  X1  NORMAL'` are made with fillStyle `#F0F0F0` and `'NORMAL  X1'` with `#F0F030`. Record fillStyle by
      checking the `fillRect`/`fillText` order in `calls`.
    - `it('right-hand lane texts on wave lanes are repainted as the erase bar passes them')`, modelled on
      `label-tail.test.ts`, with the IBP lines connected and a 400 px canvas: 25 s of frames, `'6 mm/s'` (the RESP
      lane) repainted at least once and `'IBP'` more than 6 times (review L-3: `'25 mm/s'` passed on the ECG lanes
      alone).
    - `it('a lane that is cleared (its line detached) gets its texts back at once')`.
    - `it('pages that name their lanes keep the old chrome')`:
      `renderPlan(resolveSkin('saadat-like'), undefined, { lanes: ['ecgII'], waves: ['abp'] }).laneText === null`.
  - `skin-plan.test.ts:12`: `mmPerS: 25`. `resolve.test.ts:23`: `['IBP1', '#E08080', 25], ['IBP2', '#6C9CF8', 25]`.
  - `themes.test.ts`: `it('themes darken the lane-text label colours like the lane colours')`:
    `resolveSkin('saadat-like', { theme: 'projector-light' }).skin.layout.laneText.labels.PLETH.color` has
    `contrastRatio(…, theme background) >= theme minRatio`.
- [ ] **Step 2: Run, verify they fail.**
- [ ] **Step 3: Implement.**
  - `repaintRightTexts(i, lane)`: the boxes of lane i are the rightLabel and the speed text. Each box is
    `x1 = cssW − 6`, `w = text.length × LABEL_CHAR_W`, `y`. The erase head is `LABEL_W + (lane.xOf(lane.lastDrawnIndex) + gap) % width`.
    Repaint the box while the head is inside `[x1 − w − gap − LABEL_REPAINT_SLACK_PX, x1 + LABEL_REPAINT_SLACK_PX]`.
    A repaint is: `save` → clip to the box → fill the background → `textAlign 'right'` → `fillText` → `restore`.
  - Keep `textAlign` reset to `'start'` after use; the seam label relies on it.
- [ ] **Step 4: Run, verify they pass;** then `vitest -u` ONLY for `packages/skins/test/__snapshots__/resolve.test.ts.snap`.
  Run `git diff --stat` on the snap: only the `saadat-like (…)` and `iran-icu-as-found (…)` entries change. Any
  other entry is a defect.
- [ ] **Step 5: Commit** `feat(renderer): lane text at the right with sweep speeds; saadat-like IBP 25 mm/s (IMG_8113)`.

### Task L4: Tests, docs, PR-L

- [ ] **Step 1.** Full unit suites: `npx -y pnpm@9.15.9 test` and `npx -y pnpm@9.15.9 typecheck`. Expected: green.
- [ ] **Step 2.** Run the e2e files that read lanes, 3 of 3 on both projects:

```bash
npx playwright test apps/demo/e2e/showcase-capnogram.e2e.ts apps/demo/e2e/device-layer-page.e2e.ts --reporter=list --repeat-each=3
```

  Expected: green 3/3 on chromium and webkit. Nothing in these files changes in PR-L, because `data-lanes` and the
  tiles are untouched.
- [ ] **Step 3.**
  - CONTRACT.md: rows for `co2.fill`, `co2.displaySmoothMs`, `ibp.scaleLines` (now read), `ibp.scaleLineColor` and
    `layout.laneText`.
  - CHANGELOG `[Unreleased]`: `### Added` for the optional skin keys (`co2.fill`, `co2.displaySmoothMs`,
    `ibp.scaleLineColor`, `layout.laneText`; the `pme-skin/1` format is public API), and `### Changed`, one plain line per
    visible change (review L-8).
  - Run the model-docs guard (Global Constraints).
- [ ] **Step 4.** Push the branch, then open the draft PR "Saadat-like lanes as in the owner's photo (rc.3, PR-L)".
  The body lists:
  - the tests changed and why;
  - the snapshot entries changed;
  - the Chromium 1280×800 screenshot of `#/monitor` next to the photo crop (crops stop below the bezel; no logo).

  **CI-L1** starts. The orchestrator launches R-L.

### Task T0: Launch gate, worktree, baseline (Executor 2)

- [ ] **Step 1.** Same as L0 with branch `saadat-tiles` in `../scratch/wt-saadat-t`. Also run:
  `npx -y pnpm@9.15.9 --filter @pme/engine-core test -- nibp` and `npx -y pnpm@9.15.9 --filter @pme/demo test`.
  Expected: green.

### Task T1: Two-row header, 6 s rotation (audit rows 5 and 7; brief B)

**Files:**
- Modify: `packages/skins/src/types.ts` and `schema.ts`. Add `layout.headerStyle?: 'two-row'` and
  `alarms.messageBar.rotateS?: number` (num 1–30).
- Modify: `alarm-view.ts:9, 66`. Add `export function rotateS(r: ResolvedSkin): number` (= `messageBar.rotateS ?? ROTATE_S`);
  `pick` uses it.
- Modify: `device-ui.ts:105-123` (constructor builds the two-row header when `headerStyle === 'two-row'`),
  `:315-337` (`paintHeader` fills the new items), and `flashCss` `:26-57` (`.pme-hdr.two` rules).
- Modify: `mount.ts:21-53` (`MountOptions.bed?: string`) and `:167` (pass it to `DeviceUI`).
- Modify: `saadat-like.json`:
  - `"headerStyle": "two-row"`;
  - `"rotateS": 6` under `alarms.messageBar`;
  - provenance `layout.headerStyle` (research/34 §3 row 7, IMG_8113: "BED 01"/"PEDIATRIC" in yellow at the left, date
    over time at the right, the message bar on its own row under them, ≈ 45 % of the wave-area width);
  - provenance `alarms.messageBar.rotateS` (research/34 §2 "Technical-message rotation (IMG_8116)", MEASURED 5.5–7 s).
- Test: `alarm-view.test.ts`, new `packages/renderer/test/header-two-row.test.ts` (happy-dom).

**Interfaces:**
- Produces:
  - `DeviceUI` constructor: `(doc, waveArea, r, page?, portrait = false, bed = 'BED 01')`;
  - `MountOptions.bed?: string`;
  - header DOM in two-row mode:
    `.pme-hdr.two > .r1 > [data-pme=page] [data-pme=bed] [data-pme=cat] (spacer) .pme-lamp [data-pme=cd] [data-pme=dev] [data-pme=alloff] [data-pme=date] [data-pme=time]`
    and `.pme-hdr.two > .r2 > .pme-bar [data-pme=inop]`.

    The items render only if `layout.header` lists them:
    - `page` → page box in `chrome.pageBox` colours;
    - `bed`, `category` → `chrome.patientCategoryColor`;
    - `alarmState` → lamp;
    - `silenceCountdown` → cd;
    - `datetime` → date and time.

    `battery`, `recorder` and `network` are not modelled and are not drawn (provenance note).
  - Category text from `alarmStatus.ageBand`: `adult` → `ADULT`, `paed` → `PEDIATRIC`, `neo` → `NEONATE`.
    Before the first status: `ADULT` [GUESS].
  - Date and time are LOCAL: `formatDate(localAsUtc(now), cal.default, cal.gregorianFormat)` and `HH:MM:SS`, with
    `localAsUtc(d) = new Date(d.getTime() − d.getTimezoneOffset() × 60000)`. The one-row header keeps today's call.

- [ ] **Step 1: Failing tests.**
  - `alarm-view.test.ts`: `it('saadat-like rotates same-level messages every 6 s (research/34 §2: 5.5–7 s measured); philips-like keeps 2 s')`.
    With two L3 technical entries a, b: `[12, 17, 18].map((t) => barView(s, sa, t).text)` equals `[a, a, b]`.
    `rotateS(ph) === 2`.
  - `header-two-row.test.ts`, with `vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 20, 3, 40, 40))`.
    For saadat-like:
    - `[data-pme=page]` `P1`;
    - `[data-pme=bed]` `BED 01`;
    - `[data-pme=cat]` `ADULT`, and `PEDIATRIC` after a status with `ageBand: 'paed'`;
    - `[data-pme=date]` `20/10/2026`;
    - `[data-pme=time]` `03:40:40`;
    - `.r2 .pme-bar` exists, and `.pme-lamp` keeps `data-lamp`.

    For philips-like: `.pme-hdr` has no `.two`, no `[data-pme=bed]`, and the date text is unchanged (one row).
- [ ] **Step 2: Run, verify they fail.** Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/alarm-view.test.ts test/header-two-row.test.ts`.
- [ ] **Step 3: Implement.** CSS for `.pme-hdr.two`:
  - `height:auto; flex-direction:column; align-items:stretch`;
  - `.r1` 40 px: bed over category, and date over time, each two lines of 15 px;
  - `.r2` 22 px: the bar `flex:none; width:43%`.

  [MOCKUP] values: the header row is 5.8 % of the monitor height and the bar row 3.0 %. The bar is 43 % of the
  wave-area width. Category text `#F0E060` (saadat-like `chrome.patientCategoryColor` changes from `#F0F000`). The
  page box `chrome.pageBox` is `{ bg: "#B0E0E8", fg: "#4A5A64" }` (D10). White text is the skin foreground, which
  changes to `#E8F4F6` in G1b. In the two-row mode, row heights are proportions (`calc(5.8 * var(--pme-h) / 100)`
  and `3.0`), so they scale with the screen. `--pme-h` is set by G3. Until G3 lands, the fixed 40/22 px apply.
- [ ] **Step 4: Run, verify they pass.** Then `--filter @pme/renderer test`. Expected: green, including
  `device-text.test.ts` and `alarm-view.test.ts`.
- [ ] **Step 5: Commit** `feat(renderer): two-row header (page, bed, category, date/time) and 6 s rotation for saadat-like`.

### Task T2: Tile skeleton: limits in red, units, weights, split parts, blank values (rows 12, 14; O1)

**Files:**
- Modify: `packages/skins/src/types.ts:45-50` (TileSpec) and `schema.ts:59` (tile). Add:
  - `label?`, `unit?`, `weight?` (int 100–900), `italic?` (bool), `split?` (`'row'|'column'`);
  - `parts?: Array<{ label: string; unit?: string; limit?: string }>`;
  - `status?: Array<'PACE'|'ST'|'PVCS'>` (T3);
  - in `layout`: `showAlways?: TileParam[]`;
  - in `alarms`: `limitsDisplay?: 'when-on'|'always'` and `limitsColor?: Hex`.
- Modify: `schema.ts:235`: `glyphs.noValue` and `glyphs.inop` become `{ type: 'string' }` (an empty string is
  allowed; the other glyphs keep `str`).
- Modify: `resolve.ts:103-115`: the theme darkens `alarms.limitsColor` (as `colors`).
- Modify: `alarm-view.ts:111-132`: `TileAlarmView.pairs: Array<{ key: string; high: string; low: string }>`, for every
  key of `TILE_NUMERICS[param].limits` (plus the parts' `limit` keys) present in `st.limits`, whether or not it is
  enabled. `fmt` as today; `''` for null. The existing `limits` field is unchanged.
- Modify: `device-ui.ts`:
  - `:149-166` → `private buildTile(spec: TileSpec): Tile`. There are two skeletons:
    - the old one, unchanged, when `limitsDisplay !== 'always'` and there is no `split`;
    - the new one:
      `.h > [data-pme=lbl] [data-pme=src] [data-pme=mode] [data-pme=bell] .u`, `.vrow > .lim.a [data-pme=v] .lim.b`,
      `.srow > .lim.c [data-pme=s] [data-pme=ntime]`, `[data-pme=st]`, plus `.parts > [data-part=k]` (each
      `.pl` label, `.pv` value, `.lim`) for split tiles.
  - `:247-266` → `private extraParts(spec): Array<{ key: string; label: string; value: string }>`. `extras()` becomes
    `extraParts(spec).filter(known).map((p) => p.label + ' ' + p.value).join('  ')`. Its strings must stay
    byte-identical: the `numerics-glyphs.test.ts:27, 70` expectations are the guard. Unknown keys (`SQI%`, `EMG%`)
    give `{ label: key, value: '' }` and appear only in split parts. `BS%`/`SR` map to `sr` (as `formatBfa`).
  - `:268-313` `paintTiles`:
    - the limit pairs in `limitsColor`, stacked high over low (`[data-lim=<key>]`) into slots a/b/c. Slot rule: keys
      ending `_S` → a, `_D` → b, `_M` → c, a single key → a, a part's own limit → inside its part;
    - `fontWeight`/`fontStyle` from spec `weight`/`italic`;
    - the unit from `spec.unit ?? UNIT[param]`;
    - `modulePresent` hiding is skipped for `layout.showAlways` params.
- Modify: `saadat-like.json`:
  - `"limitsDisplay": "always"`, `"limitsColor": "#F05A3C"` ([MOCKUP] limits; research/34 row 12 read ≈ #F05D44);
  - the status-line colour, as the optional `hr.statusColor`: `"#44DD55"` [MOCKUP] (T3 uses it instead of
    `colors.HR`);
  - `"glyphs": { "noValue": "", "inop": "" }`;
  - `"showAlways": ["BFA"]`;
  - the tile specs:

```json
{ "param": "HR", "size": "large", "label": "HR", "unit": "BPM", "weight": 700, "status": ["PACE", "ST", "PVCS"] },
{ "param": "NIBP", "unit": "(mmHg)", "extras": ["PR"] },
{ "param": "IBP1", "unit": "(mmHg)", "extras": ["MEAN"] },
{ "param": "IBP2", "unit": "(mmHg)", "extras": ["MEAN"] },
{ "param": "SpO2", "label": "%SPO2", "extras": ["PI", "PR"] },
{ "param": "TEMP", "unit": "°C", "extras": ["T2", "DT"], "split": "column", "parts": [{ "label": "T1", "limit": "T1" }, { "label": "T2", "limit": "T2" }, { "label": "DT" }] },
{ "param": "RR", "unit": "BrPM" },
{ "param": "BFA", "extras": ["BS%", "SQI%", "EMG%"], "split": "row", "parts": [{ "label": "BFI%" }, { "label": "BS%" }, { "label": "SQI%" }, { "label": "EMG%" }] }
```

  - and `whenAttached.co2.tiles.RR`:
    `{ "param": "CO2", "extras": ["IMCO2", "AWRR"], "split": "row", "parts": [{ "label": "EtCo2", "unit": "mmHg", "limit": "EtCO2_pctV" }, { "label": "FiCo2", "unit": "mmHg" }, { "label": "AWRR", "unit": "BrPM", "limit": "AWRR" }] }`.
  - Provenance:
    - `alarms.limitsDisplay`, `alarms.limitsColor`: research/34 §3 row 12, measured ≈ #F05D44;
    - `glyphs.noValue`, `glyphs.inop`: research/34 §8 O1 and §3 row 1 (IMG_8113: "IBP1 NO SENSOR" with blank "/" "( )");
    - `layout.showAlways`: research/34 §8 O1;
    - the `layout.tiles` note gains "rc.3: labels, units, weights (research/34 §3 rows 4, 8, 14); split CO2/TEMP/BFA
      parts and status lines as photographed (research/34 §8 O1, IMG_8113); reverses FU-5's removal of
      SQI/EMG/PACE/PVCs as blank labels".
- Test: `alarm-view.test.ts`, new `packages/renderer/test/tiles-photo.test.ts`, `numerics-glyphs.test.ts:32-36, 65-78`,
  `numerics-nibp-blank.test.ts:16`, `neuro-tiles.test.ts:46-53, 73`, `packages/skins/test/sensor-swap.test.ts:24`,
  `packages/skins/test/schema.test.ts`, `themes.test.ts`, and the snapshot.

**Interfaces:**
- Produces:
  - `TileAlarmView.pairs`;
  - `DeviceUI.extraParts`;
  - the new skeleton's selectors (Global Constraints);
  - `[data-part="k"] .pv` = the value of part k: part 0 = the tile's main value (and `[data-pme=v]` holds the same
    text), part k = `extraParts(spec)[k − 1].value`.

- [ ] **Step 1: Failing tests.**
  - `alarm-view.test.ts`: `it('pairs: every limit key of the tile, ON or OFF (saadat-like shows them always)')`.
    For NIBP with NIBP_S {90,160,off}, NIBP_D {50,90,off} and NIBP_M {60,110,off}:
    `pairs` = `[{ key: 'NIBP_S', high: '160', low: '90' }, { key: 'NIBP_D', high: '90', low: '50' }, { key: 'NIBP_M', high: '110', low: '60' }]`;
    `limits` = `''` and `bellOff` = true (unchanged).
  - `tiles-photo.test.ts`:
    - (a) the saadat HR tile, after a status with HR {50,150, enabled false}: `[data-lim=HR]` text `150` over `50`,
      colour `rgb(240, 90, 60)`; a crossed bell is shown. philips-like: no `[data-lim]`, and `.lim` reads `''`
      while off (old path).
    - (b) units: HR `.u` `BPM`, NIBP `(mmHg)`.
    - (c) weights:
      - HR `[data-pme=v]` `fontWeight '700'` and `fontStyle` not `'italic'` (D11);
      - NIBP `'400'`;
      - **M1:** `it('owner correction M1: the EtCo2, FiCo2 and AWRR digits are normal weight, like NIBP')`. Every
        `[data-part] .pv` of the attached CO2 tile computes `fontWeight '400'`, equal to NIBP's `[data-pme=v]`.
        Neither the tile spec nor the parts may set a weight (the mock-up's bold is overruled by M1).
    - (d) split, saadat-like attached with etco2 36, imco2 0, awrr 12: CO2 `[data-part] .pl` = `['EtCo2', 'FiCo2', 'AWRR']`,
      `.pv` = `['36', '0', '12']`, `[data-pme=v]` `36`.
    - (e) O1 with no measurement at all: HR v `''`, IBP1 v `'/'`, IBP1 s `'()'`, NIBP v `'/'`; the BFA tile is
      displayed with `.pl` `['BFI%', 'BS%', 'SQI%', 'EMG%']` and every `.pv` `''`.
    - (f) `it('themes darken the limit colour')`: projector-light `limitsColor` meets the theme's minRatio.
  - `numerics-glyphs.test.ts`:
    - `:36` expects `''` (saadat inop blank, O1);
    - `:74` saadat TEMP: `[data-part] .pv` `['36.8', '36.2', '0.6']`;
    - `:77` HR s `''` and BFA parts `['45', '12', '', '']`.
  - `numerics-nibp-blank.test.ts:16`: `['saadat-like', '']`.
  - `neuro-tiles.test.ts:46-53, 73`: saadat BFA `display` `''` (showAlways); philips `'none'` (unchanged).
  - `sensor-swap.test.ts:24`: the new CO2 spec (above).
  - `schema.test.ts`: `it('glyphs.noValue may be empty (saadat-like O1); hrUnavailable may not')`.
- [ ] **Step 2: Run, verify they fail.**
- [ ] **Step 3: Implement** as in Files. The `.lim` CSS is font 11 px, line-height 1, `display:flex; flex-direction:column`,
  in `limitsColor`. In the 180 px columns, `.vrow` is `display:flex; align-items:center`, `.v` is `flex:1`, and the
  existing font-size step-down (`:303`) still applies.
- [ ] **Step 4: Run, verify they pass,** plus `--filter @pme/renderer test` and `--filter @pme/skins test`. Then
  `vitest -u` for the snapshot only (saadat-like and iran entries only).
- [ ] **Step 5: Commit** `feat(renderer): limits always in red, units, weights, split tiles and blank values for saadat-like (O1)`.

### Task T3: PR tile: source label and colour, heart, status lines (row 4)

**Files:**
- Modify: `device-ui.ts:226-241` (`hrTile` returns `{ main, label, source: string | null, color: string | null }`),
  `:171-187` (`onEvent`: a `tone` event of kind `qrs`|`pulse` lights the heart for 200 ms), `:339-342` (`destroy`
  clears the timer).
- Modify: `alarm-view.ts`: `export function hrStatusLines(r: ResolvedSkin, st: AlarmStatus | null, stII: string): Array<{ text: string; bellOff: boolean }>`.
- Test: `tiles-photo.test.ts`, `numerics-glyphs.test.ts:39-50`, `alarm-view.test.ts`.

**Interfaces:**
- Consumes: T2's skeleton (`[data-pme=src]`, `[data-pme=st]`) and `TileSpec.status`.
- Produces:
  - Source `(ECG)` when `hr` is valid. Otherwise `(` + the `hr.autoPriority` key upper-cased + `)`: `(IBP1)` or
    `(SPO2)`. It is shown only when the skin has `hr.relabelNonEcgAs` (saadat-like only).
  - Colour: ECG → the tile colour; `SpO2` → `colors.PR`; `IBP1`/`ART` → `colors.IBP1`. It applies to the label,
    the source and the digits.
  - `[data-pme=heart]` (a ♥ in `colors.PR`, top-right). The class `on` is set for 200 ms per beat tone.
  - `hrStatusLines`:
    - `PACE: OFF` / `PACE: ON` (`ecg.paceDetectDefault`), bell none;
    - `ST: OFF` when `!st.defaultOn`, else `ST: ` + stII; bell = `!st.limits.ST_mV?.enabled`;
    - `PVCs: OFF` when `!st.arrhythmiaAnalysis`, else `PVCs: ` (blank, O1); bell = `!arrhythmiaAnalysis`;
    - lines in `hr.statusColor ?? colors.HR` (saadat-like `#44DD55`, [MOCKUP]).

- [ ] **Step 1: Failing tests.**
  - `alarm-view.test.ts`: `it('hrStatusLines: PACE/ST/PVCs OFF with crossed bells on ST and PVCs (saadat-like defaults, IMG_8113)')`
    gives `[{ text: 'PACE: OFF', bellOff: false }, { text: 'ST: OFF', bellOff: true }, { text: 'PVCs: OFF', bellOff: true }]`.
    `it('PVCs line follows arrhythmiaAnalysis')`: with `arrhythmiaAnalysis: true` → `{ text: 'PVCs: ', bellOff: false }`.
  - `numerics-glyphs.test.ts:49`: `[lbl, src, v]` = `['PR', '(IBP1)', '75']`. Add: with `prAbp` absent and `pr` 76 →
    `['PR', '(SPO2)', '76']`, and the v colour `rgb(240, 0, 240)`. With hr 72 → `['HR', '(ECG)', '72']`, colour
    `rgb(0, 240, 0)`. philips-like `[data-pme=src]` absent.
  - `tiles-photo.test.ts`: `it('the heart lights for 200 ms on each beat tone and the timer dies with destroy()')`,
    with fake timers.
- [ ] **Step 2–4:** Run, implement, pass (as T2).
- [ ] **Step 5: Commit** `feat(renderer): saadat-like PR tile — source label and colour, heart, PACE/ST/PVCs lines`.

### Task T4: NIBP tile "S / D", mean line, mode label, last time; engine `mode`/`intervalMin` and `manual` (row 8)

**Files:**
- Modify: `packages/engine-core/src/types-hemo.ts:39`: `action: 'start' | 'stat' | 'stop' | 'auto' | 'manual'`.
  `:46-48`: the `nibp` event gains `mode?: 'manual' | 'auto' | 'stat'; intervalMin?: number`.
- Modify: `l3/nibp/nibp.ts:128-157`:
  - case `'manual'`: `nb.mode = 'manual'; nb.nextStartT = NEVER;` — it does not abort a running measurement and
    is allowed without a cuff;
  - the sensor guard becomes `action !== 'stop' && action !== 'manual'`.
- Modify: `l2/hemo/pipeline.ts:800-801` (validation list and guard, the same), and `:389, 391, 552`: every pushed
  `nibp` event carries `mode: hs.nibp.mode, intervalMin: hs.nibp.intervalMin`.
- Modify: `packages/renderer/src/numerics-hemo.ts`:
  - `export function nibpModeLabel(e: NibpEvent | undefined): string` → `'AUTO(5Min)'`, `'MANUAL'`, `'STAT'`, or `''`
    (no event or no mode);
  - `export function formatWallTime(ms: number): string` → local `HH:MM:SS`.
- Modify: `device-ui.ts`:
  - `onEvent` (`:181-184`): `nibpWallMs = Date.now()` when a `nibp` event has `result`; `reset()` sets it null;
  - `paintTiles` NIBP branch (`:285-289`), new skeleton only:
    - `[data-pme=v]` = main with `/` → ` / ` only when both numbers are present;
    - `[data-pme=s]` = `(M)` without the clock;
    - `[data-pme=mode]` = `nibpModeLabel(nibpEv)`;
    - `[data-pme=ntime]` = `formatWallTime(nibpWallMs)` or `''`;
    - the inflating/measuring states keep `formatNibp`'s main/status text.

  The old skeleton (other skins) is unchanged.
- Test: `packages/engine-core/test/l3/nibp/nibp.test.ts`, `test/engine/hemo-nibp.test.ts`,
  `packages/renderer/test/numerics-hemo.test.ts`, `tiles-photo.test.ts`.

**Interfaces:**
- Produces: the `nibp` event fields `mode`/`intervalMin`; the action `manual`; `nibpModeLabel`; `formatWallTime`.
  T5 uses `manual` in the panel.

- [ ] **Step 1: Failing tests.**
  - `hemo-nibp.test.ts`: `it('nibp events carry the mode and the auto interval; manual stops cycling without aborting')`.
    - After `auto` 5: the first `nibp` event has `mode: 'auto', intervalMin: 5`.
    - `manual` while deflating: accepted; the measurement finishes with a result; the next `idle` event has
      `mode: 'manual'` and no `nextInS`.
    - `manual` with the cuff off: accepted.
    - `'bogus'`: rejected with `nibp action must be start, stat, stop, auto or manual`.
  - `numerics-hemo.test.ts`:
    - `nibpModeLabel({ type: 'nibp', t: 1, phase: 'idle', mode: 'auto', intervalMin: 5 })` === `'AUTO(5Min)'`;
    - `'MANUAL'`, `'STAT'`, and `''` for undefined;
    - `formatWallTime(new Date(2026, 9, 20, 3, 28, 57).getTime())` === `'03:28:57'`;
    - `:11-19` unchanged (the guard that other skins keep `formatNibp`).
  - `tiles-photo.test.ts`, saadat-like after `nibp done {119, 90, 101}`, measurement and idle with `mode: 'auto'`,
    `intervalMin: 5`:
    - v `'119 / 90'`, s `'(101)'`, mode `'AUTO(5Min)'`, ntime matches `/^\d\d:\d\d:\d\d$/`;
    - `it('after reset() the NIBP time is blank')`.
  - philips-like v `'119/90'` (unchanged).
- [ ] **Step 2–4:** Run (`--filter @pme/engine-core exec vitest run test/engine/hemo-nibp.test.ts test/l3/nibp/nibp.test.ts`,
  then the renderer files), implement, pass. Then the full engine suite:
  `npx -y pnpm@9.15.9 --filter @pme/engine-core test`. Expected: green. No test deep-equals a `nibp` event today
  (grep at planning); a red one is reported, not loosened.
- [ ] **Step 5: Model-docs guard** (the engine changed).
  Commit `feat(engine,renderer): NIBP events carry mode and interval; a manual action; saadat-like NIBP tile as photographed`.

### Task T5: O2 NIBP default, O3 check, housekeeping (audit §4 item 5)

**Files:**
- Modify: `saadat-like.json:117-119`: `"modeDefault": "AUTO"`, `"autoIntervalMin": 5`. Provenance:
  - `nibp.modeDefault`: `{ "tag": "documented", "source": "research/34 §8 O2", "note": "owner ruling 2026-10-20 (was MANUAL, research/06 §4.1 M p.128). Applied by the demo app at patient start; the engine's NIBP stays command-driven" }`;
  - `nibp.autoIntervalMin`: the same source.
- Modify: `apps/demo/src/app/patients.ts`: `export function nibpStartCommand(skin: { nibp: { modeDefault: string; autoIntervalMin: number | null } }): { device: 'nibp'; action: 'auto'; intervalMin: number } | null`.
- Modify: `session.ts:351-359` (`mount`, after `mountWith`, not on the perf8 path): when `this.spec.attached` and
  `nibpStartCommand(m.skin.skin)` is non-null, dispatch it as
  `{ id: 'nibp-default', issuedBy: 'device', type: 'device', action }` through
  `m.dispatch(c).then((r) => this.host.mirror(c, r))` (the `linked()` pattern, `session.ts:224`). Then a phone
  mirrors it.
- Modify: `panel/devices.ts:65-66`:
  - "Off (manual)" sends `{ device: 'nibp', action: 'manual' }` (now accepted);
  - the select's initial value = `String(nibpStartCommand(host.monitor.skin.skin)?.intervalMin ?? 0)` when `host`;
  - a Remote keeps `'0'` (it does not know the state, as for the sensors, `:59`).
- Housekeeping, in CONTRACT.md:114-127 and the provenance notes:
  - `beep.baseHz` and `beep.pitchMap`: "recorded, not modelled; the pitch is the engine's (audit row 6, FX-16/E66)";
  - `layout.header`: "read by skins with `headerStyle: 'two-row'`; battery, recorder and network are not modelled";
  - `layout.waveAreaFraction`: "Stage 4a preview only, until PR-G";
  - `nibp.modeDefault`/`autoIntervalMin`: "applied by the demo app at patient start (rc.3)";
  - `ibp.scaleLines`: read.
- Test: `apps/demo/src/app/patients.test.ts`, `packages/skins/test/vendor-alarm-semantics.test.ts:40`.

- [ ] **Step 1: Failing tests.**
  - `patients.test.ts`:
    - `it('O2: the NIBP start command follows the skin (saadat-like AUTO 5 min; lifepak-like none)')`:
      saadat-like → `{ device: 'nibp', action: 'auto', intervalMin: 5 }`, lifepak-like → null, philips-like →
      `intervalMin: 15` (E95 default);
    - `it('O3: no invasive line is attached by default')`: `profileOf(adult).sensors` has no `abp`, `cvp` or `pap`.
  - `vendor-alarm-semantics.test.ts:40`: saadat-like `{ modeDefault: 'AUTO', autoIntervalMin: 5 }`.
- [ ] **Step 2–4:** Run (`--filter @pme/demo exec vitest run src/app/patients.test.ts`;
  `--filter @pme/skins exec vitest run test/vendor-alarm-semantics.test.ts`), implement, pass.
- [ ] **Step 5: Commit** `feat(demo): NIBP AUTO 5 min at patient start for saadat-like (O2); panel manual works; unused skin keys marked`.

### Task T6: O4 — the CO2 line detached by default; the Ventilator view attaches it (CUT FIRST; waits for E94)

**Files:**
- Modify: `apps/demo/src/app/patients.ts:54`: `MONITORING` `co2: 'off'` (explicit; the engine default would
  otherwise apply).
- Modify: `panel/devices.ts:54`: drop `'co2'` from the default-attached list.
- Modify: `views/vent.ts:48`: after `attachMonitorToLink`, if `session.last.state?.sensors?.co2` is `'off'` or
  absent, dispatch `{ type: 'attachSensor', sensor: 'co2', state: 'on' }` through `session.linked(m).dispatch` (so
  it mirrors). [GUESS: the right hook; the e2e below is the check.]
- Test: `patients.test.ts:16`, `apps/demo/e2e/showcase-capnogram.e2e.ts:27-59`, `apps/demo/e2e/vent-view-restore.e2e.ts`.

- [ ] **Step 1.** `patients.test.ts:16`: the attached values are `on` except `co2: 'off'`. Add
  `it('O4: a spontaneously breathing patient starts without the CO2 line')`.
- [ ] **Step 2.** `showcase-capnogram.e2e.ts`: reorder to detached first.
  - Rename the title to "… the default (non-ventilated) patient shows RESP and RR; attaching the line brings the
    capnogram and the CO2 tile; detaching brings RESP back".
  - Line 36 expects `'ECG1 ECG2 RESP IBP1 IBP2 PLETH'` and the RR tile.
  - Click `CO₂ sampling line` (aria-pressed `false` first) → `'ECG1 ECG2 CO2 IBP1 IBP2 PLETH'`. The CO2 label is
    `EtCo2` (T2 parts) and the tile contains `AWRR` (was `awRR`).
  - Detach → RESP.
  - The `@known-flaky` tag stays (it is an existing test), but the changed test must pass 3/3 on both projects.
- [ ] **Step 3.** Run `vent-view-restore.e2e.ts` 3/3 on both projects. Expected: green (the cockpit attached the line).
- [ ] **Step 4: Commit** `feat(demo): the default patient starts without the CO2 line; the Ventilator view attaches it (O4)`.

### Task T7: Tests, docs, PR-T

- [ ] **Step 1.** `npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 typecheck`. Expected: green.
- [ ] **Step 2.** Local e2e, 3/3 on both projects, one run at a time:
  - `monitor-fidelity.e2e.ts` (Chromium only by its own skip; saadat suite 5 still reads lbl `PR` and digits);
  - `device-layer-page.e2e.ts`;
  - `learner-monitor-follows.e2e.ts` (host and follower tile strings equal; the NIBP cuff now inflates at t = 0);
  - `vent-view-restore.e2e.ts`;
  - `showcase-capnogram.e2e.ts`;
  - `debrief.e2e.ts` (the facts table now has NIBP readings from t = 0; its regexes must hold);
  - `app-one-session.e2e.ts`, `fx4-alarm-pause.e2e.ts`, `alarm-off-label.e2e.ts`, `apnoea-alarm-latched.e2e.ts`.

  Expected: green. Report any change of expectation in the PR body with its reason.
- [ ] **Step 3.**
  - CONTRACT rows for every T key.
  - CHANGELOG `[Unreleased]` → Changed: "Saadat-like: red limits, PR/NIBP tiles, blank values for unconnected probes,
    a two-row header and 6-second message rotation; NIBP starts on AUTO every 5 minutes (pre-release)".
  - Run the model-docs guard.
- [ ] **Step 4.** Push, then open the draft PR "Saadat-like tiles, header and defaults (rc.3, PR-T)", with the 1280×800
  screenshot beside the photo crop. **CI-T1.** R-T.

### Task G1: `layout.grid` — schema, swap, data (Executor 1, Thursday, on main with L and T)

**Files:**
- Modify: `packages/skins/src/types.ts`:

```ts
export interface GridCell { params: TileParam[]; row: number; col: number; rowSpan?: number; colSpan?: number }
export interface StripField { label: string; unit?: string; numeric?: string; digits?: number; color?: ColorKey }
export interface LayoutGrid {
  /** Relative lane heights, one per layout.lanes entry; any other lane count draws equal lanes. */
  laneWeights: number[];
  /** Tile area tracks (fr), right of the wave area. */
  columns: number[];
  rows: number[];
  cells: GridCell[];
  /** Full-width strip under the waves and the tiles: one tile, then label fields of equal width. */
  strip: { heightPct: number; tile: { param: TileParam; widthPct: number; extras?: string[] }; fields: StripField[] };
}
// Skin['layout'].grid?: LayoutGrid
```

- Modify: `schema.ts:121-128`: an opt `grid`. `numeric` uses the pattern `^[a-zA-Z0-9]+$`; `heightPct` 5–30;
  `widthPct` 5–60.
- Modify: `resolve.ts:121-134` (`applySensors`): map each cell's `params` and `strip.tile.param` through
  `rule.tiles?.[p]?.param ?? p`.
- Modify: `saadat-like.json`:
  - `layout.waveAreaFraction` 0.41 → **0.641** [MOCKUP: wave area x 0–821 of 1280];
  - add `layout.grid`. The weights are the mock-up's pixel extents on the 1280×800 rectified photo [MOCKUP]:
    - lanes y 70–185, 185–302, 302–398, 398–500, 500–598 and 598–684;
    - tile rows y 0–175, 175–313, 313–414, 414–511, 511–607 and 607–684;
    - NIBP / T split at x 1183;
    - strip y 684–798 (14.5 %);
    - %SPO2 cell x 6–284 (21.7 %).

```json
"grid": {
  "laneWeights": [115, 117, 96, 102, 98, 86],
  "columns": [362, 97],
  "rows": [175, 138, 101, 97, 96, 77],
  "fontPx": { "HR": 109, "NIBP": 57, "CO2": 52, "IBP1": 46, "IBP2": 46, "SpO2": 78, "field": 57, "label": 16, "limit": 15 },
  "cells": [
    { "params": ["HR"], "row": 1, "col": 1, "colSpan": 2 },
    { "params": ["NIBP"], "row": 2, "col": 1 },
    { "params": ["TEMP"], "row": 2, "col": 2, "rowSpan": 2 },
    { "params": ["RR"], "row": 3, "col": 1 },
    { "params": ["IBP1"], "row": 4, "col": 1, "colSpan": 2 },
    { "params": ["IBP2"], "row": 5, "col": 1, "colSpan": 2 },
    { "params": ["BFA", "NMT", "AGENTS"], "row": 6, "col": 1, "colSpan": 2 }
  ],
  "strip": {
    "heightPct": 14.5,
    "tile": { "param": "SpO2", "widthPct": 21.7, "extras": [] },
    "fields": [
      { "label": "PI", "numeric": "pi", "digits": 1, "color": "PI" },
      { "label": "PVI", "color": "PI" }, { "label": "SpOC", "color": "PI" }, { "label": "%SpCo", "color": "PI" },
      { "label": "%SpMet", "color": "PI" }, { "label": "SpHb", "unit": "g/dL", "color": "PI" }
    ]
  }
}
```

  - Provenance:
    - `layout.waveAreaFraction`: research/34 §8 (owner-approved mock-up, NOTES.md: 64.1 %; research/34 row 1 said
      63 %). Note: "rc.3: width fraction, read by the live renderer with layout.grid; was 0.41 (research/06 §3.1 F1,
      likely the area share)".
    - `layout.grid`: research/34 §8 (owner-approved mock-up, scratch/skin-mockup/NOTES.md), plus §3 rows 1, 4, 8,
      16 and §8 O1. Note: "pixel extents on the 1280×800 rectified IMG_8113; fontPx are mock-up sizes at an 800 px
      screen height; the pulse-oximetry strip fields are labels only (O1), no limits (E100)".
  - `LayoutGrid` gains
    `fontPx: Partial<Record<TileParam | 'field' | 'label' | 'limit', number>>`: sizes at an 800 px monitor height,
    scaled by G3. Schema: each value num 6–200.

### Task G1b → L5: Colours as the approved mock-up (NOTES.md "Colours")

**Moved into PR-L as Task L5 (review L-9),** so the owner-approved colours ship even if PR-G is cut. PR-G does not
repeat it. The `grid.test.ts` steps below stay with G1.
- `saadat-like.json` `colors`, all [MOCKUP] white-balance-corrected values:
  - ECG/HR/ST/PVC `#22F046`;
  - RESP/CO2/AWRR/AGENTS `#F0F000`;
  - IBP1 `#FF9A96`;
  - IBP2 `#5C9CFF` (the mock-up's own read; research/34 gave `#6C9CF8`);
  - SpO2/PR/PI `#DD44FF`;
  - PLETH `#D060FF` (the trace);
  - TEMP `#00F0F0` (unchanged).
- The rest of the skin:
  - `foreground` `#E8F4F6`;
  - `chrome.divider` `#C6D7D8`;
  - `alarms.messageBar.L3.bg` `#B0E0E8` (unchanged), fg `#4A5A64` (unchanged, D10);
  - `layout.laneText.labels.PLETH.color` `#ECE84A`.
- Provenance for each: `research/34 §8 (owner-approved mock-up, NOTES.md colours)`. The note keeps the previous value
  and its source. This closes E71 (SpO2 hue) by the owner's approval.
- Tests that pin the old hexes change with it:
  - `skin-plan.test.ts:10-15`;
  - `resolve.test.ts:21-29`;
  - `sensor-swap.test.ts:21`;
  - `monitor-core-4b.test.ts:24`, if the background is checked (it is not today);
  - `tiles-photo.test.ts`/`numerics-glyphs.test.ts` colour asserts (`rgb(221, 68, 255)` for SpO2 digits);
  - `skin-distinctness-contrast.test.ts` and `contrast.test.ts`: run them. A contrast failure is reported to the
    orchestrator, not "fixed" by another hex.
- The snapshot `-u` (saadat-like and iran entries only).
- Test: new `packages/skins/test/grid.test.ts`, `sensor-swap.test.ts`, `provenance.test.ts` (automatic), and the
  snapshot.

- [ ] **Step 1: Failing tests** in `grid.test.ts`:
  - `it('every layout.tiles param is placed exactly once (a cell or the strip), for saadat-like and iran-icu-as-found, CO2 attached or not')`.
  - `it('the RR cell names the CO2 tile while the line is attached')`:
    `resolveSkin('saadat-like', { sensors: { co2: true } }).skin.layout.grid.cells[3].params` → `['CO2']`.
  - `it('cells fit the tracks')`: `row + rowSpan − 1 ≤ rows.length` and `col + colSpan − 1 ≤ columns.length`, with
    no two cells overlapping.
  - `it('only saadat-like (and its preset) has a grid')`: for every other skin id, `layout.grid` is undefined.
  - `it('strip fields that name a numeric name one the engine publishes')`: `numeric ∈ ['pi']` for saadat-like.
- [ ] **Step 2–4:** Run (`--filter @pme/skins exec vitest run test/grid.test.ts test/sensor-swap.test.ts test/provenance.test.ts`),
  implement, pass. Then the snapshot `-u` (saadat-like and iran entries only).
- [ ] **Step 5: Commit** `feat(skins): optional layout.grid (lane weights, tile grid with spans, bottom strip); saadat-like from IMG_8113`.

### Task G2: Lane weights in MonitorCore

**Files:**
- Modify: `skin-plan.ts`: `RenderPlan.laneWeights: number[] | null` = `s.layout.grid?.laneWeights` when its length
  equals `laneIds.length` and there is no `only` override; else null. `legacyPlan`: null.
- Modify: `monitor-core.ts`: `private laneBox(i: number): { y: number; h: number }`.
  - Weights null → `{ y: i * h, h }` with `h = cssH / n`, exactly today's arithmetic.
  - Else cumulative: `y = cssH * Σw[<i] / Σw`, `h = cssH * w[i] / Σw`.

  Used in `layout` `:306, 314`, `drawChrome` `:358-367`, and every `i * h`.
- Test: `monitor-core-4b.test.ts:38-43`, `skin-plan.test.ts`, new `lane-weights.test.ts`.

- [ ] **Step 1: Failing tests.**
  - `lane-weights.test.ts`:
    - `it('saadat-like lanes take the mock-up heights')`: with cssH 614 (the weights' sum), the SweepLane
      `cfg.y`/`cfg.height` = `[0,115],[115,117],[232,96],[328,102],[430,98],[528,86]`;
    - `it('equal lanes when the lane count differs (iran-icu-as-found, P7, named-lane pages)')`;
    - `it('without a grid the y values are byte-identical to i * h')` (philips-like, cssH 500: y = 0, 100, 200, 300, 400).
  - `monitor-core-4b.test.ts:39`: `make('saadat-like', {}, 320)`. ECG1 = 115/614 × 320 ≈ 59.9 px, so it still
    settles on `II  X0.5  NORMAL`. Update the comment.
  - `monitor-core-4b.test.ts:76` (philips lead-off dashes at 0.6 × 100) stays green, unchanged.
- [ ] **Step 2–4:** Run, implement, pass. Run `label-tail.test.ts`, `sweep-backfill.test.ts`, `restore-lanes.test.ts`
  and `overlays-tcp.test.ts`. Expected: green.
- [ ] **Step 5: Commit** `feat(renderer): skin lane weights (layout.grid.laneWeights)`.

### Task G3: Grid, strip, left column; the rollback test

**Files:**
- Modify: `device-ui.ts`:
  - `export function gridOf(r: ResolvedSkin, portrait: boolean): LayoutGrid | null` (null when portrait or no grid);
  - `readonly strip: HTMLDivElement` (class `pme-strip`, `display:none` without a grid);
  - `setSkin` `:146-166`: with a grid, `this.tiles` is `display:grid`, with `grid-template-columns`/`rows` from the
    fr arrays and `flex:1 1 0; min-width:0`. Each cell is a div with `grid-row: r / span n; grid-column: c / span m`
    holding `buildTile` for each of its params (a flex row). The strip holds `buildTile(strip.tile)` (with `extras`
    from the strip spec) at `widthPct`, then one `.pme-sfield[data-field=<label>]` per field
    (`.pl`, `.u`, `[data-pme=fv]`). Without a grid: exactly today's columns or portrait.
  - `paintTiles`: strip fields print `this.text(values[numeric], digits)`, or `''` without `numeric`.
  - Font sizes in grid mode:
    - `font-size: calc(<fontPx> * var(--pme-h) / 800)` for the main value of HR, NIBP, CO2 parts, IBP1/2, the strip
      SpO2 and `field` values;
    - `label` for labels and `limit` for the limit pairs;
    - `--pme-h` is set on `outer` by `mount.ts` from a ResizeObserver on `outer` (CSS px height);
    - the old `main.length > 5` shrink (`device-ui.ts:303`) is skipped in grid mode.
  - [MOCKUP] fonts: Arial → Liberation Sans → Helvetica at normal width (the skin's stack, unchanged).
- Modify: `mount.ts:156-171`:
  - `left` = a div that holds `wrap`;
  - `root.append(left, ui.tiles)`; `outer.append(ui.header?, root, ui.strip)`.
  - `const place = () => { … }`, called at mount, in `setSkin` (`:466-486`) and in `setCo2` (`:368-380`):
    - with `gridOf(r, portrait)`: `left.style.cssText = 'display:flex;flex-direction:column;flex:0 0 <63>%;min-width:0'`
      and `left.prepend(ui.header)`; `ui.strip.style.cssText = 'display:flex;flex:0 0 <12>%'`;
    - without: `left.style.display = 'contents'`, `outer.prepend(ui.header)`, `ui.strip.style.display = 'none'`.

    `display:contents` makes the wrapper box-less, so the other skins' layout is unchanged.
  - The ResizeObserver on `wrap` already resizes the canvas.
- Test: new `packages/renderer/test/grid-layout.test.ts` (happy-dom), `portrait-layout.test.ts:19-24`,
  `numerics-glyphs.test.ts:15-19` (the `q` helper also searches `ui.strip`), `neuro-tiles.test.ts`, `tiles-photo.test.ts`.

**Interfaces:**
- Consumes: G1's `LayoutGrid`, G2's weights, T2's `buildTile`.
- Produces: `DeviceUI.strip`, `gridOf`.

- [ ] **Step 1: Failing tests** in `grid-layout.test.ts`:
  - `it('saadat-like: the tile grid has six rows and two columns; HR spans both columns; TEMP spans rows 2–3; BFA, NMT, AGENTS share row 6')`:
    read `style.gridRow`/`gridColumn`.
  - `it('the strip holds the SpO2 tile, then PI, PVI, SpOC, %SpCo, %SpMet, SpHb; PI prints the engine numeric, the others are blank')`:
    pi 2.8 → `'2.8'`, every other `[data-pme=fv]` `''`.
  - `it('the RR cell swaps to the CO2 tile in place')`: `setSkin(resolveSkin('saadat-like', { sensors: { co2: true } }))`
    puts the CO2 tile in the cell at row 3, with the other cells' order unchanged.
  - `it('grid ↔ columns switch leaves no strip and no grid tile')`: saadat → philips → strip `display:none`,
    `ui.tiles.style.display` `flex`, columns 180 px; back → grid.
  - `it('rollback by data: saadat-like without layout.grid renders the old 180 px columns and equal lanes')`: delete
    `r.skin.layout.grid` on a resolved copy; columns 180 px; `renderPlan(copy).laneWeights` null.
  - `it('grid font sizes scale with the monitor height')`: set `--pme-h: 800px` on a parent; the HR value's style
    font-size is `calc(109 * var(--pme-h) / 800)`; the attached CO2 parts use 52; the strip SpO2 uses 78.
  - `it('portrait ignores the grid')`: `new DeviceUI(…, true)` → `pme-portrait`, the skin order (as
    `portrait-layout.test.ts:9-17`), and the strip hidden.
  - `portrait-layout.test.ts:19-24`: "landscape" uses `philips-like` for the 180 px assertion (saadat-like now has the grid).
- [ ] **Step 2–4:** Run, implement, pass. Then `--filter @pme/renderer test`.
- [ ] **Step 5: Commit** `feat(renderer): saadat-like tile grid, bottom strip and 63 % wave area (layout.grid)`.

### Task G4: Tests, screenshots, docs, PR-G

- [ ] **Step 1.** `npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-size`.
  Expected: green, and the IIFE within budget.
- [ ] **Step 2.** The T7 e2e set, 3/3 on both projects, plus `skins-page.e2e.ts` (the Stage 4a preview now draws a
  63 % wave area for saadat-like) and `mobile-learner.e2e.ts` (portrait phones; philips-like). Expected: green.
- [ ] **Step 3.** Screenshots in Chromium of `#/monitor` (default patient, after 60 s): 1280×800 and 1024×640; with
  the CO2 line attached, and detached. Save them with a crop of the photo (below the bezel) in
  `../scratch/saadat-fidelity-gate/`, never in the repo.
- [ ] **Step 4.** CONTRACT: the `layout.grid` section, and `waveAreaFraction` = width, read with a grid. CHANGELOG:
  "Saadat-like: the screen layout of the real unit (63 % wave area, tile grid, bottom strip) (pre-release)". Run the
  model-docs guard. Push, then the draft PR "Saadat-like screen layout (rc.3, PR-G)". **CI-G1.** R-G.

---

## Review hand-off (R-L, R-T, R-G; independent, read-only)

Each reviewer gets the PR, this plan, the photo `scratch/skin-mockup/IMG_8113.jpg`, research/34 §3, and the
executor's screenshots. They write `scratch/plans-backup/saadat-<l|t|g>-review.md`. Its first line is
`NO CHANGE`, `CHANGE (no blocker)` or `BLOCKER`, followed by the head sha. Pixel measurements on the photo and the
screenshots are allowed; state the method (image size, the pixel rows and columns read).

Every reviewer checks:
1. **Other skins unchanged.**
   - The snapshot diff touches only `saadat-like` and `iran-icu-as-found` entries.
   - The philips-like expectations in `monitor-core-4b.test.ts:33, 76`, `numerics-glyphs.test.ts`,
     `alarm-view.test.ts` and `numerics-hemo.test.ts` are untouched.
   - No other skin JSON changed.
   - `git diff --name-only origin/main -- packages/skins/src/data` lists only
     `packages/skins/src/data/skins/saadat-like.json` (review L-6).
   - Snapshot entries are checked by their `snapshot <id> (theme …)` name: only `saadat-like` and `iran-icu-as-found`.
2. **Opt-in.** Every new key is optional in the schema. Without it, the code takes the old path (read the
   branches).
3. **Scope rule.** `git diff origin/main | grep -niE "$(cat ../scratch/briefs/scope-words.txt)"` (the brand,
   vendor-module and model words, kept outside the repository) lists only
   existing provenance text and research citations. There are no new brand words in labels, tests or commit
   messages.
4. **O1.** No value the engine does not publish is printed, and no limit the status does not carry is printed.
5. **The retry rule and the model-docs guard** are followed (the PR body lists the 3/3 runs).

**R-L also:**
1. The capnogram is filled to the 0 line with no gaps at the erase bar, measured on the 1280×800 screenshot.
   - M2: no engine file is in the diff.
   - The plateau ripple is visibly smaller and smooth (no 1-px steps); compare a 2× crop with `smoothMs` 0.
   - The upstroke is still square at 6 mm/s.
2. The dots sit at the scale values.
3. The right-hand texts are not smeared after two sweeps.
4. "50mmHg" sits at the CO2 lane's top-left.

**R-T also:**
1. The limit pairs are red (#F05A3C ± 15/channel) and stacked high over low, beside the right part.
   - M1: the EtCo2/FiCo2/AWRR digits are the same weight as the NIBP digits.
   - The PR digits are upright bold (D11).
2. "119 / 90" is spaced, "(101)" is centred under it, and the mode label reads "AUTO(5Min)".
3. PR tile:
   - "(SPO2)" and magenta digits on leads off;
   - green "(ECG)" otherwise;
   - three status lines, with crossed bells on ST and PVCs.
4. The header has two rows; the message bar is ≈ 45 % of the wave-area width (measure); the rotation is 6 s (sample
   the bar).
5. The engine change is additive:
   - `nibp` event fields optional;
   - `manual` does not abort a measurement;
   - the model-docs pages regenerated.
6. O2 is applied once per patient start (not per skin switch, not on scenarios), and the panel's select shows 5.

**R-G also:**
1. On the 1280×800 screenshot vs the approved mock-up (NOTES.md; overlay with `saadat-8113-compare.html` at
   50 %):
   - wave-area width 64.1 ± 1 %;
   - lane boundaries within ± 4 px of y 70/185/302/398/500/598/684;
   - tile-row boundaries within ± 4 px of y 175/313/414/511/607;
   - the T column x 1183–1280, spanning the NIBP and CO2 rows.
2. Strip y 684–798 (14.5 %); the %SPO2 cell 21.7 % wide.
3. The header lies inside the wave column; the PR tile reaches the top edge.
4. The grid follows the skin switch and the CO2 swap (Review Focus 1 and 2), checked in the live app.
5. Review Focus 5: the 1024×640 screenshot shows no overlap and no clipped text.
6. The rollback test exists and passes.

---

## Rollback

- Each PR is one squash merge; reverting it removes its keys AND their readers together.
- **By data**, without a code revert:
  - deleting `layout.grid` from `saadat-like.json` brings back the two 180 px columns, equal lanes and the full-width
    header (G3's rollback test);
  - deleting `headerStyle`, `laneText`, `limitsDisplay` or `co2.fill` brings back each old look separately.
- Order if several must go: G first, then T, then L (T rebased on L; G on both).
- T6 alone: revert its commit (the data line `co2: 'off'` and the vent hook).

---

## For the owner (one list, sent by the orchestrator Tuesday ≈ 10:30; answers by **Wednesday 21 October 12:00**)

1. E94–E105 below, each with the default the plan applies without an answer.
2. Friday evening (15 min): the 1280×800 screenshots beside IMG_8113. Say what is still "not that monitor".

## Questions (E94 onward; each with the default the plan uses if no answer comes)

| # | Question | Default |
|---|---|---|
| E94 | O4 makes the free-play patient start WITHOUT the CO2 line (RR shown). This reverses ruling S1 (4 October: "the capnogram is visible on the default monitor"). The plan also has the Ventilator view attach the line when it starts ventilating. OK for both? | Yes to both (O4 is the newer ruling); T6 is still cut first if time runs short. |
| E95 | O2 is applied from each skin's own documented NIBP default. In the app, Philips-, GE-, Mindray- and ZOLL-like would then start AUTO every 15 min, and LIFEPAK-like stays manual. Or should AUTO 5 apply to Saadat-like only? | Each skin's own documented default. |
| E96 | The header's bed line: "BED 01" on every screen? | "BED 01". |
| E97 | The IBP lane labels: "IBP" as photographed, or "ART" and "CVP"? | "IBP" (photo). |
| E98 | The IBP1 scale: the photo's 130/80/30 is a paediatric setting; we keep the adult ART 200/120/40 and CVP 30/10/−10. OK? | Keep ours. |
| E99 | The PR tile's source label: "(ECG)" in green while ECG gives the rate, "(SPO2)" or "(IBP1)" in that channel's colour otherwise? | Yes. |
| E100 | The photo shows red limit pairs under PVI, SpOC, %SpCo, %SpMet and SpHb. We do not model these, so the plan prints labels only (no numbers). OK? | Labels only. |
| E101 | A connected probe with a bad signal (e.g. non-pulsatile SpO2) shows blank like an unplugged one, not dashes? | Blank. |
| E102 | The NIBP time is this screen's clock when the result came. A phone that joins later shows it blank until the next reading. OK? | Yes. |
| E103 | The "Iranian ICU as found" preset inherits the new layout (it is the same monitor family). OK? | Yes. |
| E104 | The header clock is real time, also at ×4/×8 (the date and time do not run faster). OK? | Yes. |
| E105 | The heart symbol blinks with each beat? | Yes. |

## Deferred (a later release)

- The ≈ 1245 Hz square-like beep (audit row 6; FX-16, E66).
- A second ECG lead (E70).
- The solar header date (E65).
- Alarm visuals not in the material (E67).
- The "RTCP:" line under the NIBP time (meaning unknown).
- Real PVI/SpOC/SpCo/SpMet/SpHb numerics.
- The photo's paediatric IBP scales (E98).
- A Remote that knows the NIBP mode.
- An engine `co2.cardiogenicGain` in `capno.ts`, only if L1b's display smoothing is judged insufficient (needs an EtCO2 check).

## Noticed in passing (out of scope except as stated)

- `panel/devices.ts:66` sends `nibp manual`, which the engine rejects today. T4/T5 fix it because O2 depends on it.
- The one-row header's date uses UTC fields (`device-ui.ts:336` → `calendar.ts:11-13`), so between 00:00 and 03:30
  Tehran time it shows yesterday. The two-row header uses local time. The one-row header is left as it is (other
  skins' look).

---

## Self-review

- **Spec coverage:**
  - A → G1–G3 (plus L3's IBP speed);
  - B → T1;
  - C → L1–L3 (plus L1b for M2);
  - D → T2–T4 (M1 in T2; the mock-up colours in G1b, its fonts in G3);
  - E → T5, T6 (O3 verified in T5) and the housekeeping in T5;
  - F → each task's test steps, T7/G4 e2e lists and the snapshot rule;
  - G → Review hand-off and Rollback;
  - estimates and the cut line → the Effort table;
  - guesses are marked `[GUESS]` or `[MEASURED-PLANNER]`.
- **Type consistency:** the same names are used across tasks:
  - `PlanLane.fill/scaleLines/scaleMid/scaleSuffix/rightLabel`;
  - `RenderPlan.laneText/laneWeights`;
  - `TileAlarmView.pairs`;
  - `hrStatusLines`, `nibpModeLabel`, `formatWallTime`, `nibpStartCommand`;
  - `gridOf`, `DeviceUI.strip`, `LayoutGrid`/`GridCell`/`StripField`.
- **Proportion:** code blocks are limited to types, data and test values. Bodies are left to the executors except
  the fill polygon and the repaint window, which the tests do not determine.
