# Stage 7x: Physiology developer console — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-27): COMPLETE and R50-FIXED — header, decisions, prototype results, Tasks 1–9, requests. The R50
> review (READY WITH FIXES F1–F10, orchestrator rulings 2026-09-27 03:10) is applied: F1 zero-baseline change digits;
> F2 absolute change tolerances (pH, temperature, saturation, PaCO2/EtCO2, K, lactate); F3 7d/7e organ-map paths
> (`kidney`, ICP sensor, interim anaesthesia input, `endoHrF…`, `blood.endo`); F4 prune headroom (alarm profile and
> 7a reference copies skipped, `dev` walked first, 7g PK machinery internal, leaf cap 2 100 with a busy-case byte
> test); F5 event arrays keyed by id and per-type replacement; F6 7b/7c/7g builders in the rail; F7 unit suffixes,
> sibling `unit` leaves, curated rows; F8 auto-baseline at 60 s and within-beat/breath rows never highlighted; F9
> merge main before the Task 8 page-list edits; F10 clock re-sync after reset to baseline.
> VERIFIED after the fixes: every code block in Tasks 1–8 was run, as written here, in the scratch worktree
> (`scratch/proto-7x`, = `origin/main` `36097c1`, i.e. main after the 7a merge, plus this plan's files): `pnpm -r
> typecheck` clean; engine-core **596 passed / 1 skipped** with `CI=1` (11 of them new); `@pme/demo` **114/114**;
> `vite build` emits `dist/physiology-console.html`; the Playwright e2e passes on system Chrome (27 s). The code
> blocks were synced mechanically from the prototype files (each block is byte-identical to its file). A block that
> fails for the executor means main moved: stop and report, do not "fix" the test.

**Goal:** A developer page, `apps/demo/physiology-console.html`, that shows the live monitor beside EVERY physiologic
truth value the engine holds, grouped by organ system, each with current value, baseline, delta and a 60 s sparkline,
plus an actions rail that sends the same commands the instructor panel and scenarios send, a change log, reset to
baseline, and JSON/CSV export — so Ali can see how each change moves every physiologic value, and every later Stage 7
sub-stage's fields appear on it without editing the page.

**Architecture:** The engine gets ONE additive, read-only accessor: an opt-in `truth` event (`EngineOptions.truthHz`,
0 = off by default, ≤ 2 Hz) carrying `pruneTruth(ps, dev)` — a new object built by walking the pipeline state
(the device layer first, as `dev`, then the physiology sub-trees `l1`, `hemo`, `resp`, `mods`, `rhythm`, `hr` and
whatever 7b–7g add), keeping numbers/booleans/short strings/null and small arrays, dropping ECG machinery, event
queues, PRNG state, the alarm profile, 7a's reference copies, typed arrays, long histories and functions, capped at
2 100 leaves. It is emitted after the tick's other events, so it travels to the main thread inside the monitor's
ordinary event batches: the pruned tree is the structured clone that crosses the worker boundary (measured 13.0 KB,
744 leaves, ≈ 0.08 ms per call). The page
mounts the real monitor with `mountMonitor` (any skin, worker when available) and `truthHz: 1`, and a plain-DOM
console built from small pure modules: `flatten` (tree + summary events → dotted paths), `organs` (curated
longest-prefix path → organ map, "other" bucket, "internals" flag), `meta`/`format` (labels, units, digits, scale;
defaults from field names), `sparkline` (60-sample history, one tiny canvas per row), `model` (current, baseline,
delta, history, export), `actions` (rail command builders) and `view` (the page controller, testable in happy-dom
through a small `ConsoleHost` interface).

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2 (+ happy-dom 20.14.5, already in the lockfile as Vitest's peer),
Vite 6.4, Canvas 2D (sparklines), Playwright 1.63 (system Chrome) for the e2e and gate screenshots. No new
dependencies, no framework.

**Spec:** `../research/00-orchestrator-rulings.md` **R52** (the requirement; quoted in Global Constraints), R25
(partition, worktrees), R45 (mechanism, not looser tests — applies to the engine accessor's tests), R50 (this plan is
R50-reviewed before execution), R51 §6–7 (additive merges to shared files; merge `origin/main` before every
`engine.ts` edit); `docs/DESIGN-BRIEF.md` §3.4 (worker/main split: the engine and renderer share one worker; the main
thread gets batched events) and §7.3 (event stream); `docs/RESUME.md` (executor brief: push after every task, CI
2-vCPU yield rule). State-tree paths of the unmerged sub-stages were harvested from `docs/plans/stage-7b-lungs.md`
(`resp.lung`), `stage-7c-blood.md` (`blood`, events `labs`/`labResult`), `stage-7d-organs.md` (`organs.brain|renal|
liver`, event `organs`), `stage-7e-endocrine-thermal.md` (`endo`, event `endo`; thermal stays in `resp.temp`),
`stage-7f-neuro-depth.md` (`neuro`, events `anaesthesia`/`tof`/`neuroMark`) and `stage-7g-pkpd.md` (`pk`,
`pkHooks`, event `drugs`; `infusion`/`vaporiser` event shapes).

## Global Constraints

- **R52 (verbatim requirement):** "(1) the live monitor (any skin) on one side; (2) every truth-state value grouped by
  organ system — circulation (chambers, valves, pressures, volumes, CO/SV/EF, SVR/PVR, baroreflex state, coronary
  supply/demand), lungs and gas (per-lung volumes/compliance/resistance, VA/Q, shunt, dead space, PaO2/PaCO2/SaO2,
  EtCO2), blood (Hb, acid–base, electrolytes, lactate, temperature), brain, kidney, liver, endocrine, neuro/depth,
  drugs (bus concentrations), devices (vent/IABP/LVAD/ECMO/pacer) — discovered GENERICALLY from the state tree with a
  curated group map by path prefix so every later sub-stage's fields appear without editing the page; unknown paths
  land in "other"; (3) each value shows current, baseline at page load, delta and a 60 s sparkline; changed values
  highlight; (4) an actions rail (drugs, fluids, conditions, ventilator, rhythm, mode, patient profile) that
  dispatches the same commands as the instructor panel, with a change log and "reset to baseline"; (5) export/copy of
  the whole snapshot as JSON/CSV for calibration notes; (6) clean, dense, readable design (monospace numbers, units,
  organ sections collapsible, dark theme matching the demo)." Budget ~4 executor-hours.
- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`; run every command from the
  worktree root. **Base: `origin/main` after Stage 7a merged** (`1fd0851`, PR #13; prototyped on `36097c1`). Stages
  7b–7g are NOT needed: the console discovers their fields at run time; nothing here imports their code.
- **Branch and PR (R20/R21):** branch `stage-7x-physiology-console` in the worktree `../scratch/wt-stage-7x` (Task 1
  creates both). **Push after every task** (`git push -u origin stage-7x-physiology-console` the first time, `git
  push` after). Task 9 opens the PR with `gh pr create`. Never push to `main`, never merge.
- **Partition (binding, R52 + R25).** NEW files only:
  `apps/demo/physiology-console.html`, `apps/demo/src/physiology-console/**`,
  `apps/demo/e2e/physiology-console.e2e.ts`, `docs/gates/stage-7x.md`, `docs/gates/stage-7x/**`, and the engine
  accessor's own files `packages/engine-core/src/{truth.ts,types-truth.ts}`,
  `packages/engine-core/test/truth.test.ts`, `packages/engine-core/test/engine/truth-event.test.ts`. ADDITIVE lines
  marked `// Stage 7x` in: `packages/engine-core/src/types.ts` (1 import, 1 `EngineOptions` field, 1 union member),
  `packages/engine-core/src/index.ts` (2 export lines), `packages/engine-core/src/engine.ts` (1 import, 1 field, 3
  constructor lines, 1 emit line) — this is R52's "ONE additive engine accessor"; `apps/demo/vite.config.ts` (1 build
  input line) and `apps/demo/index.html` (1 link line) — the demo page lists are additive merges (R51 §6). **Never
  edit** anything else: no renderer, controller, skins, audio or other stage's module; no `package.json`, no
  `pnpm-lock.yaml` (no `packages/devtools` package: not warranted, see decision D10).
- **Merging main while other Stage 7 stages land (R51 §7):** before the `engine.ts`/`types.ts`/`index.ts` edits in
  Task 1 and again in Task 9, run `git fetch origin && git merge origin/main`. The find blocks below anchor on lines
  no sibling stage edits (`lookaheadS`, `HemoEvent`, `types-circ.ts`, `lastCycleBefore`, `devOpts`, and the
  `devOut` emit loop followed by `if (speculate)`); if one still does not match, locate the same statement by its
  quoted comment and insert beside it; never re-type a line you are not changing.
- **CI rule:** a task is done when `npx -y pnpm@9.15.9 typecheck` and the task's own tests pass. No test here runs the
  engine for more than 60 sim-seconds in one call (the 2-vCPU runner's RPC limit, RESUME yield rule); keep it so. If
  you add a longer run, yield once per sim-minute (`await new Promise((r) => setImmediate(r))`, see
  `packages/engine-core/test/engine/engine-pipeline.test.ts`). Run the full engine-core suite with `CI=1` (6 h
  long-run horizon); locally without `CI=1` and under concurrent load the pre-existing 24 h long-run tests can trip
  Vitest's "Timeout calling onTaskUpdate" — that is not this stage's failure; re-run alone.
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`: no enums, no parameter properties); `.ts` import
  extensions; conventional commits. Commit messages end with the attribution trailer your executor brief gives
  (RESUME.md's brief: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; the commands below use it — swap
  it if your harness gives another).
- pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright locally: `PW_SYSTEM_CHROME=1`.
  Demo unit tests: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run <path>`; engine tests:
  `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`.
- **No new dependencies.** `happy-dom` resolves from `apps/demo` through Vitest's peer link in the existing lockfile
  (verified: `// @vitest-environment happy-dom` runs in `apps/demo` with a frozen install). If it does not resolve in
  your worktree, STOP and report — do not add it to `apps/demo/package.json`.
- Design: plain DOM + one 64×14 canvas per sparkline; dark theme (`#0b0d10` background, panels `#12151a`), system
  sans for labels, `ui-monospace` for numbers, units in a dim column, up = amber `#ffb347`, down = cyan `#5fc8ff`
  (direction is not good/bad), text change = violet `#d69cff`. Screenshots are JPEG clips ≤ 60 KB each.

## Decisions (where R52 left a choice)

- **D1 — The accessor is an opt-in `truth` EVENT, not a getter, not `snapshot()`.** `snapshot()` already exists
  (R25 R-1, through the worker) but clones the WHOLE state (≈ 50 KB today incl. queue, filters, histories; it grows
  with every 7b–7g sub-tree) and serialises it twice across the worker; it would miss R52's budget as soon as 7c/7g
  land. A getter would need a new worker-protocol message (a renderer edit, outside the partition). An event emitted
  by the engine needs NO renderer change: `MonitorCore` already batches every engine event and posts it to the main
  thread, and `MonitorHandle.on` delivers it. It is off unless `EngineOptions.truthHz > 0` (default 0), so no other
  page, test or transport pays for it or sees it. Rate: 1 Hz on the console (the 60 s sparkline = 60 samples); ≤ 2 Hz
  enforced (`RangeError`).
- **D2 — What crosses the worker, and its budget.** `pruneTruth` builds a NEW plain object (never writes to what it
  walks; a test compares the state before/after and the samples of a twin engine without truth): numbers (non-finite
  → the strings `'NaN'`, `'Infinity'`, `'-Infinity'` so a NaN in the physiology is VISIBLE, not silently `null`),
  booleans, strings ≤ 40 chars, `null`; numeric arrays ≤ 8 (per-lung pairs, small vectors); arrays of ≤ 4 objects,
  keyed by `id`/`drugId`/`agent`/index (left/right lungs); everything else dropped and counted. Skipped: top-level
  ECG/QRS machinery (`n, hrv, laneFilter, detFilter, qrs, hrm, detections, lanes, filterMode`), the keys `out`, `rng`
  at any depth, and by full path the alarm profile `dev.alarms.profile` (≈ 2.3 KB of limits and labels) and 7a's
  reference copies `hemo.circ.prof|base|ref` (≈ 1.6 KB; the live parameters are `hemo.circ.p`). The device layer is
  walked FIRST, so a truncated tree loses the tail of the physiology, never Devices. Leaf cap 2 100 [ENG] (today 17
  JSON bytes per leaf; the busy case below 23); a truncated tree says so (`truncated: true`, shown as TRUNCATED in the
  page header). Budget: ≤ 50 KB per event (asserted in the engine test and in the e2e on the live page), < 0.2 ms per
  call (measured ≈ 0.08 ms warm on this Mac; CI asserts < 1 ms to stay robust on the 2-vCPU runner). Future trees,
  tested on today's `l1/hemo/resp` plus six 150-leaf organ sub-trees and a realistic 7g `pk` tree (origin/stage-7g-pkpd
  `PkState`: ≈ 19 leaves per drug instance plus its bus agent, lastC and dec, full-precision floats): a typical
  anaesthetic (12 drugs given) is 1 891 leaves, 43.0 KB, not truncated; the busy case (all 58 library drugs given)
  is cut at 2 100 leaves and is 48.7 KB with the devices whole. The budget is a contract: a later stage that pushes
  the tree past it adds its machinery keys to a SKIP list (a request to that stage, not a 7x change).
- **D3 — The page runs the real monitor.** `mountMonitor(el, { skin, engine: { seed, mode, patient, truthHz: 1 } })`
  (skin from `?skin=`, default `philips-like`; `worker: 'auto'`), so the monitor is exactly what any host page shows
  and the e2e proves the truth tree came through the worker (`renderPath` `worker-raf` in Chrome). No shadow engine
  (7a's teaching-view pattern would double the CPU and diverge if a command missed it).
- **D4 — One flat model of dotted paths.** Truth tree paths as-is (`hemo.circ.p.rSys`); every other engine event
  folded GENERICALLY under `ev.<type>.` (`ev.circ.svr`, `ev.state.values.hr`, `ev.lungState.shunt`, and later
  `ev.labs.…`, `ev.organs.…`, `ev.drugs.…` with no page edit), minus `t`/`tick`/`seq` leaves and arrays > 16; arrays
  of objects are keyed by `id`/`drugId`/`agent` (7g's panel rows → `ev.drugs.drugs.propofol.ce`), by index only when
  they carry none, and each event REPLACES its type's previous leaves (`ev.<type>.*` is cleared first), so a stopped
  drug or an optional field that went away leaves the page; skipped types: `tone, toneCancel, marker, alarm, atrial,
  alarmStatus, truth` (truth is ingested whole) and `measurement`, which becomes the **monitor output** group as
  `mon.<numericId>` = the displayed value. A truth path that disappears (an LVAD switched off, a short history array
  that grew past its limit) is removed from the model and its row from the DOM.
- **D5 — Organ grouping.** 14 groups in clinical reading order (monitor output, circulation, rhythm & ECG, lungs &
  gas, blood/acid–base/temperature, brain, kidney, liver, endocrine, neuro/depth/NMB, drugs, devices, controls &
  targets (L1), other). A curated `GROUP_BY_PREFIX` map, longest whole-segment prefix wins; prefixes for 7b–7g paths
  are included now from their plans (`resp.lung`, `blood`, `organs.brain|renal|kidney|liver` — 7d's published key is
  `kidney`, R51 addendum 13 — `organs.sensors.icp` and the interim `organs.anaesEvent` → brain, `endo`, 7e's seams
  `blood.endo` and `hemo.circ.ext.endoHrF|endoSvrF|endoEesF|endoDV0Frac` → endocrine, `neuro`, `pk`, `pkHooks`,
  `ev.labs`, `ev.labResult`, `ev.organs.brain|kidney|liver`, `ev.endo`, `ev.anaesthesia`, `ev.tof`, `ev.neuroMark`,
  `ev.drugs`); unknown → "other" (e.g. a future `ecmo.*`). Devices collects `dev.*` (pacer/defib), ventilator
  settings `resp.driver.vent`, `hemo.iabp`, `hemo.lvad`, `hemo.cpr` and the circ event's IABP/LVAD summaries.
- **D6 — "Internals" instead of hiding.** Nothing is dropped by the page. Bookkeeping leaves (step indices, ramp
  internals `t0/from/curve/delayS/durationS`, accumulators, `last*`/`*Next`/`*Sum`) and a curated list of machinery
  sub-trees (`INTERNAL_PREFIXES`, `*` = one path segment: measurement pipelines `hemo.num`, `resp.num`, NIBP state
  machine, waveform generators, 7a activation schedules and the coronary reference copy, rhythm scheduler internals,
  alarm state `dev.alarms`, the device layer's copies of measurements `dev.inputs`, and 7g's PK machinery
  `pk.drugs.*.x|doses|bolusTimes`, `pk.bus.doses`, `pk.lastC`, `pk.due`, `pk.pending`, `pk.macPrev`) are flagged
  internal and shown only with the header's "internals" box ticked. Measured live on the adult at 60 s: 835 values
  (1 056 before the prune skipped the alarm profile and 7a's reference copies). New stages' fields are visible by
  default (R52: they must appear without editing the page).
- **D7 — Units and precision.** `meta.ts`: a small curated map (≈ 50 paths: monitor numerics, the `circ` summary,
  model resistances/elastances, gas exchange, lungState) with label, unit, fixed digits and a display scale
  (SVR/PVR: mmHg·s/mL × 1333.22 → dyn·s/cm⁵; EF, SaO₂, shunt × 100 → %); curated rows sort first in their section.
  Curated also: `resp.temp.tc` °C, `resp.etco2` mmHg, `mods.k` mmol/L (the ECG's potassium; stages push deltas into
  it, R51 §6), `mon.nibpSys|Dia|Mean` mmHg, `mon.qtc` ms. Every other path: label = last segment (the parent path
  shown dim beside it), unit from the engine's field-name suffix convention (`…Ml` mL, `…MlPerMin`/`…MlMin` mL/min,
  concentration and rate suffixes BEFORE the bare `…Ml`: `…PgMl` pg/mL, `…NgMl` ng/mL, `…UuMl` µU/mL, `…MgDl` mg/dL,
  `…MlKgH` mL/kg/h, `…NmolL` nmol/L, `…TempC`/`tempC` °C, `…MgPerKg` mg/kg; `…Lpm` L/min, `…Ms` ms, `…Kg` kg,
  `…Bpm`/`…Ppm` /min, `…Pct` %, `…MmolL` mmol/L, `…CmH2O` cmH₂O, `…MlPerCmH2O` mL/cmH₂O, `…Hz`, `…Deg`, `…Ma`, `…J`,
  `…Y`; bare `sbp|dbp|map|cvp|pcwp|pawp|papSys|papDia|lvedp|lvsp|mapSet|cpp` mmHg); a number with no unit in its
  name takes a sibling leaf's: `<name>Unit` (7g's `rate`/`rateUnit`), `amountUnit` for `…Amount`, else the object's
  `unit` (7g's bus agents: `plasma`, `brain`, `nmj` in the drug's concentration unit) — a unit in the field name wins
  (`cumulativeMgPerKg` stays mg/kg). Digits by magnitude (≥ 100 → 0, ≥ 10 → 1, ≥ 1 → 2, else 3).
- **D8 — Baseline semantics.** R52 says "baseline at page load"; at sim t = 0 the MODELED reflexes have not settled
  (CVP 6 → 2.9 mmHg in the first 20 s, the baroreflex and 7a's slower loops for longer), so the baseline is captured
  AUTOMATICALLY at the first truth event with sim t ≥ 60 s after (re)start [ENG, R50 F8], and "Set baseline" captures
  it at any moment. Capturing stores the values AND an engine snapshot (`MonitorHandle.snapshot()`, taken within one
  worker round-trip of the values); "Reset to baseline" restores that snapshot (`MonitorHandle.restore`, which also
  moves the sim clock), clears the sparkline histories and marks the log. The page clock is NOT `max(clock, t)`
  across a restore (events of the discarded, later timeline are still in flight from the worker): from the restore
  call until the restore's `toneCancel` (no `ids`) arrives — or, failing that, the first truth event after the
  restore resolved — event times do not move the clock, which shows the baseline time. "Restart patient" (new preset
  or mode as engine options) forgets the baseline and re-captures at 60 s.
- **D9 — Change highlighting.** A number is "changed" when |current − baseline| ≥ max(tolerance, one displayed
  digit). The tolerance is 2 % of |baseline| by default [ENG: HR 70 → 71 (1.4 %) is beat-to-beat jitter;
  phenylephrine moves SVR +30–45 %] and ABSOLUTE by field-name pattern where 2 % is the wrong size [ENG, R50 F2]: pH
  0.02; temperature 0.2 °C; SpO2/SaO2/SvO2 one point (1 on a % scale, 0.01 on a fraction); PaCO2/EtCO2 2 mmHg; K 0.2
  mmol/L (`k` counts as potassium only under `mods`, the L1 variable, `blood` and the lab events); lactate 0.3
  mmol/L. The displayed digit is taken from the LARGER of |baseline| and |current|, so a value that starts at 0 (a
  drug's Ce, a bus fraction) highlights and prints its delta at its own precision (`+0.800`, not `+1`). Within-beat
  and within-breath values (`hemo.circOut.*`, `resp.lung.tidal|inInsp|pInsp|v0`: sampled at 1 Hz they alias) are
  shown but never highlighted (`Row.phase`). Strings, booleans and non-finite values highlight when different.
  Changed rows get the direction colour on value and delta, a faint row tint, a count in the section summary, and the
  "changed only" filter. The sparkline draws the baseline as a faint line.
- **D10 — The actions rail sends the instructor panel's commands, through the same engine.** Pure builders
  (`actions.ts`) produce brief §7.2 / 7a / 7b / 7c / 7g Command bodies (`applyEvent` drug bolus; 7g `infusion`, `tci`
  (target, mode, optional model) and the single `vaporiser` event with `agent` and `n2oFrac` (R51 §4, addendum 9);
  fluid with a free-text id (datalist: 7a's `crystalloid|colloid|blood`, 7c's `saline|rl|balanced|albumin5|gelatin|
  d5w|glycine`); bleed; condition + severity; 7b `lungCondition {id, severity, side}`, `mainstem`, `recruit`; 7c
  `lab` ("send ABG/VBG"); ventilation, `setRhythm`, `setMode`), plus a raw JSON box for anything else; the page stamps `id`/`issuedBy: 'console'` and calls `MonitorHandle.dispatch`. Ids the
  engine does not know yet (7g's infusion before 7g merges) are still sent; the engine's rejection reason is shown in
  the change log — so the rail needs no edit when a stage lands. Patient profile = 7a's six demo presets with every
  invasive line connected (engine options: a restart). No `packages/devtools`: the modules are page code with one
  consumer; a package would need a lockfile edit for nothing (R52 allowed it only "if warranted").
- **D11 — Testability.** The page controller talks to the engine only through `ConsoleHost` (`dispatch, on,
  snapshot, restore, restart, timeScale, pause`). The happy-dom test drives it with a REAL engine on the main thread
  (`createEngine({ …, truthHz: 1 })`, advanced by hand); happy-dom has no 2D context, so sparklines are skipped there
  (`drawSpark(null, …)` is a no-op) and the numbers still render.
- **D12 — Gate screenshots.** Full 1440×900 page JPEGs are 100–128 KB (dense text); the e2e saves three clips per
  state (left: monitor + rail + log; organ sections top half; bottom half) at JPEG quality 55: 26–53 KB each, and
  asserts ≤ 60 KB. Screenshots are skipped in the WebKit project (font rendering changes the sizes; evidence comes
  from Chromium/Chrome).

## Prototype results (scratch/proto-7x, this Mac)

| Quantity | Value |
|---|---|
| Truth tree, adult MODELED at 10–30 s (after the R50 prune fixes) | 744 leaves, 22 dropped, 13.0 KB JSON, not truncated (before: 993 leaves, 16.9 KB) |
| `pruneTruth` cost (warm, 200 calls) | ≈ 0.08 ms per call (budget 0.2; CI asserts 1) |
| Future tree: + six 150-leaf organ sub-trees + realistic 7g `pk` with 12 drugs given | 1 891 leaves, 43.0 KB, not truncated |
| Busy tree: the same with all 58 library drugs given | cut at 2 100 leaves, 48.7 KB (event 48.7 KB < 50 KB), devices whole |
| Truth events at `truthHz: 1`, 10 s | t = 1, 2, …, 10 exactly; same seed with/without truth → identical state and ABP samples |
| Live page (Chrome, worker-raf, ×4) | 835 values; render ≈ 2–7 ms per refresh; truth 702–744 leaves, 12.5–13.1 KB |
| Phenylephrine 100 µg (adult, baseline at 60 s, +40 s) | SVR 1 218 → 1 752 dyn·s/cm⁵ (+534), ABP mean 96 → 118, HR 71 → 61, CO 5.37 → 5.28; one log entry `1:01 phenylephrine 100 mcg iv` (accepted) |
| Screenshots | 9 JPEG clips, 25–54 KB each |
| Tests | engine-core +11 (7 prune, 4 event); demo 114 (flatten 5, organs 39, format 45, sparkline 4, model 7, actions 4, view 10); e2e 1 |

## File map

| File | Responsibility |
|---|---|
| `packages/engine-core/src/types-truth.ts` | `TruthLeaf`, `TruthTree`, `TruthEvent` (public types) |
| `packages/engine-core/src/truth.ts` | `pruneTruth(st, dev)`, `TRUTH_LIMITS` — the read-only prune |
| `packages/engine-core/src/{types,index,engine}.ts` | additive: `truthHz` option, union member, exports, the 1-line emit |
| `packages/engine-core/test/truth.test.ts`, `test/engine/truth-event.test.ts` | prune rules; rate, budget, cost, read-only |
| `apps/demo/src/physiology-console/flatten.ts` | tree/events → `Map<path, Leaf>`; event skip list; `mon.*` |
| `apps/demo/src/physiology-console/organs.ts` | `GROUPS`, `GROUP_BY_PREFIX`, `groupOf`, `isInternal`, `INTERNAL_PREFIXES`, `isPhase`, `PHASE_PREFIXES` |
| `apps/demo/src/physiology-console/meta.ts` | curated labels/units/digits/scale; unit from field name or a sibling `unit` leaf; absolute change tolerances |
| `apps/demo/src/physiology-console/format.ts` | `fmtValue`, `fmtDelta`, `changeDir`, `CHANGE_REL` |
| `apps/demo/src/physiology-console/sparkline.ts` | `pushHist`, `sparkRange`, `sparkY`, `sparkPoints`, `drawSpark` |
| `apps/demo/src/physiology-console/model.ts` | `ConsoleModel`: ingest, baseline, rows, history, JSON/CSV |
| `apps/demo/src/physiology-console/actions.ts` | rail command builders, presets, suggestion lists, `describe` |
| `apps/demo/src/physiology-console/view.ts` | `mountConsole(root, host)`: header, rail, log, organ sections |
| `apps/demo/src/physiology-console/main.ts` | page entry: `mountMonitor` + `ConsoleHost` + devtools hook |
| `apps/demo/physiology-console.html` | page shell and CSS |
| `apps/demo/src/physiology-console/*.test.ts`, `view.dom.test.ts` | unit tests; happy-dom page test |
| `apps/demo/e2e/physiology-console.e2e.ts` | Playwright: load, phenylephrine, SVR delta, log, screenshots |
| `apps/demo/vite.config.ts`, `apps/demo/index.html` | one additive line each |
| `docs/gates/stage-7x.md`, `docs/gates/stage-7x/*.jpg` | gate note and evidence |

## Tasks

### Task 1: Branch, worktree and the engine's `truth` event (the one additive accessor)

**Files:**
- Create: `packages/engine-core/src/types-truth.ts`, `packages/engine-core/src/truth.ts`,
  `packages/engine-core/test/truth.test.ts`, `packages/engine-core/test/engine/truth-event.test.ts`
- Modify (additive, `// Stage 7x`): `packages/engine-core/src/types.ts`, `packages/engine-core/src/index.ts`,
  `packages/engine-core/src/engine.ts`

**Interfaces:**
- Consumes: the engine's private `PipelineState` (`this.st`) and `DeviceState` (`this.dev`), read only.
- Produces: `EngineOptions.truthHz?: number` (0 default, ≤ 2); event `{ type: 'truth'; t; tree: TruthTree; leaves;
  dropped; truncated }` (`TruthEvent`, member of `EngineEvent`); exports `pruneTruth(st: object, dev?: object):
  { tree: TruthTree; leaves: number; dropped: number; truncated: boolean }`, `TRUTH_LIMITS`, types `TruthLeaf`
  (`number | boolean | string | null`), `TruthTree` (`{ [key: string]: TruthLeaf | TruthLeaf[] | TruthTree }`).

- [x] **Step 1: Create the branch and worktree**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git worktree add ../scratch/wt-stage-7x -b stage-7x-physiology-console origin/main
cd ../scratch/wt-stage-7x
npx -y pnpm@9.15.9 install --frozen-lockfile
test -f packages/engine-core/src/types-circ.ts && echo "7a present" || { echo "STOP: 7a has not merged"; exit 1; }
```

- [x] **Step 2: Write the failing prune test** — `packages/engine-core/test/truth.test.ts`:

```ts
// Stage 7x (R52): pruneTruth keeps physiology leaves and drops machinery, buffers and anything not structured-clone safe.
import { describe, expect, it } from 'vitest';
import { pruneTruth, TRUTH_LIMITS } from '../src/truth.ts';

describe('pruneTruth', () => {
  it('keeps numbers, booleans, short strings and null; drops functions and typed arrays', () => {
    const st = { hemo: { co: 5.1, open: true, site: 'radial', man: { rSys: null }, fn: () => 1, buf: new Float32Array(4) } };
    const r = pruneTruth(st);
    expect(r.tree).toEqual({ hemo: { co: 5.1, open: true, site: 'radial', man: { rSys: null } } });
    expect(r.dropped).toBe(2);
    expect(r.leaves).toBe(4);
    expect(r.truncated).toBe(false);
  });
  it('turns NaN and ±Infinity into strings so the tree stays JSON-exact', () => {
    const r = pruneTruth({ a: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: [1, Number.NEGATIVE_INFINITY] } });
    expect(r.tree).toEqual({ a: { x: 'NaN', y: 'Infinity', z: [1, '-Infinity'] } });
  });
  it('skips ECG machinery at the top and out/rng at any depth', () => {
    const st = { n: 5, qrs: { th: 1 }, hrm: {}, laneFilter: [[0]], rng: { a: 1 }, resp: { out: [{ type: 'x' }], driver: { rng: [1, 2, 3, 4], source: 'spontaneous' } } };
    expect(pruneTruth(st).tree).toEqual({ resp: { driver: { source: 'spontaneous' } } });
  });
  it('keeps short numeric arrays, drops long ones, keys object arrays by id/drugId/agent/index', () => {
    const st = {
      resp: { aer: [0.9, 0.8], hist: Array.from({ length: TRUTH_LIMITS.maxNumArray + 1 }, (_, i) => i) },
      pk: { rows: [{ drugId: 'propofol', ce: 2.1 }, { agent: 'sevoflurane', fet: 1.8 }, { x: 1 }] },
      hemo: { beats: Array.from({ length: TRUTH_LIMITS.maxObjArray + 1 }, () => ({ t: 1 })) },
    };
    const r = pruneTruth(st);
    expect(r.tree).toEqual({ resp: { aer: [0.9, 0.8] }, pk: { rows: { propofol: { drugId: 'propofol', ce: 2.1 }, sevoflurane: { agent: 'sevoflurane', fet: 1.8 }, 2: { x: 1 } } }, hemo: {} });
    expect(r.dropped).toBe(2);
  });
  it('skips the alarm profile and 7a\'s reference copies by path, nothing else of the same name', () => {
    const st = { hemo: { circ: { p: { rSys: 1 }, prof: { eesLv: 2 }, base: { eesLv: 2 }, ref: { sv: 70 }, cor: { ref: { sv: 70 } } } }, resp: { prof: 1 } };
    const r = pruneTruth(st, { alarms: { profile: { limits: { hr: { low: 50 } } }, silenced: false } });
    expect(r.tree).toEqual({ dev: { alarms: { silenced: false } }, hemo: { circ: { p: { rSys: 1 }, cor: { ref: { sv: 70 } } } }, resp: { prof: 1 } });
    expect(r.dropped).toBe(0);
  });
  it('walks the device layer first, so the leaf cap never cuts the devices', () => {
    const big = Object.fromEntries(Array.from({ length: TRUTH_LIMITS.maxLeaves + 10 }, (_, i) => [`k${i}`, i]));
    const r = pruneTruth({ big }, { pacer: { mode: 'off' } });
    expect(r.leaves).toBe(TRUTH_LIMITS.maxLeaves);
    expect(r.truncated).toBe(true);
    expect(Object.keys(r.tree)[0]).toBe('dev');
    expect(r.tree.dev).toEqual({ pacer: { mode: 'off' } });
    expect(pruneTruth({}, { pacer: { mode: 'off' } }).tree).toEqual({ dev: { pacer: { mode: 'off' } } });
  });
  it('never writes to its input', () => {
    const st = { hemo: { circ: { p: { rSys: 1 }, s: [1, 2] } }, out: [1] };
    const before = structuredClone(st);
    pruneTruth(st);
    expect(st).toEqual(before);
  });
});
```

- [x] **Step 3: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/truth.test.ts`
Expected: FAIL — the import `../src/truth.ts` cannot be resolved (the module does not exist yet).

- [x] **Step 4: Create the types and the prune**

`packages/engine-core/src/types-truth.ts`:

```ts
// Stage 7x public types (R52): the opt-in, read-only `truth` event that carries a pruned copy of the pipeline state
// for developer tools. Its own file so parallel stages do not collide in types.ts (one union line there).
import type { SimSeconds } from './types.ts';

/** A leaf of the truth tree: finite numbers stay numbers; NaN/±Infinity arrive as the strings 'NaN', 'Infinity', '-Infinity'. */
export type TruthLeaf = number | boolean | string | null;
export interface TruthTree {
  [key: string]: TruthLeaf | TruthLeaf[] | TruthTree;
}

/**
 * Emitted every `EngineOptions.truthHz` (0 = never, the default; at most 2 Hz) after the tick's other events.
 * `tree` holds the physiology sub-trees of the pipeline state (`l1`, `hemo`, `resp`, and whatever later stages add:
 * `blood`, `organs`, `endo`, `neuro`, `pk`, …) plus the device layer as `dev`, pruned by `pruneTruth`.
 */
export type TruthEvent = {
  type: 'truth'; t: SimSeconds;
  tree: TruthTree;
  /** Leaves kept, values dropped (typed arrays, long arrays, functions, too deep), and whether the leaf cap cut the walk. */
  leaves: number; dropped: number; truncated: boolean;
};
```

`packages/engine-core/src/truth.ts`:

```ts
// Stage 7x (R52): prune the engine's pipeline state into a small, structured-clone-safe truth tree for developer
// tools. Read-only: it walks the live state and builds a NEW object; it never writes to what it reads. No clone of
// the whole state is made (the look-ahead already clones it every tick; this walk copies leaves only).
import type { TruthLeaf, TruthTree } from './types-truth.ts';

export const TRUTH_LIMITS = {
  /**
   * Leaf cap [ENG]: a tree cut here stays under the 50 KB budget. Today's tree averages 17 JSON bytes per leaf (keys
   * included); the busy test case (organ sub-trees + 7g's pk with all 58 drugs given) averages 23, so 2 100 leaves ≈
   * 48.7 KB. A typical future tree (12 drugs) is ≈ 1 900 leaves and is not cut.
   */
  maxLeaves: 2100,
  /** Numeric arrays up to this length are kept (per-lung pairs, small vectors); longer ones are buffers or histories. */
  maxNumArray: 8,
  /** Arrays of objects up to this length are kept, keyed by `id`/`drugId`/`agent`/index (per-lung pairs, left/right units); longer ones are beat/breath histories. */
  maxObjArray: 4,
  maxString: 40,
  maxDepth: 10,
} as const;

/** Top-level pipeline keys that are ECG/QRS machinery, not physiology. */
const SKIP_TOP = new Set(['n', 'hrv', 'laneFilter', 'detFilter', 'qrs', 'hrm', 'detections', 'lanes', 'filterMode']);
/** Keys skipped at any depth: event queues and PRNG state. */
const SKIP_ANY = new Set(['out', 'rng']);
/**
 * Sub-trees skipped by their full path: configuration and reference copies, not live physiology — the alarm profile
 * (≈ 2.3 KB of limits and labels) and 7a's copies of the profile parameters (the live ones are `hemo.circ.p`).
 */
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref']);
/** Paths are only built as deep as the deepest SKIP_PATH entry, so the walk stays a leaf copy below that. */
const SKIP_PATH_DEPTH = Math.max(...[...SKIP_PATH].map((p) => p.split('.').length));

const leafOf = (v: number): TruthLeaf => (Number.isFinite(v) ? v : String(v));

export function pruneTruth(st: object, dev?: object): { tree: TruthTree; leaves: number; dropped: number; truncated: boolean } {
  let leaves = 0;
  let dropped = 0;
  let truncated = false;
  const take = (): boolean => {
    if (leaves >= TRUTH_LIMITS.maxLeaves) {
      truncated = true;
      return false;
    }
    leaves++;
    return true;
  };
  const walk = (v: unknown, depth: number, path: string): TruthLeaf | TruthLeaf[] | TruthTree | undefined => {
    if (v === null) return take() ? null : undefined;
    switch (typeof v) {
      case 'number':
        return take() ? leafOf(v) : undefined;
      case 'boolean':
        return take() ? v : undefined;
      case 'string':
        return take() ? (v.length > TRUTH_LIMITS.maxString ? `${v.slice(0, TRUTH_LIMITS.maxString)}…` : v) : undefined;
      case 'object':
        break;
      default:
        dropped++; // functions, symbols, bigints, undefined
        return undefined;
    }
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer || depth > TRUTH_LIMITS.maxDepth) {
      dropped++;
      return undefined;
    }
    if (Array.isArray(v)) {
      if (v.every((x) => typeof x === 'number')) {
        if (v.length > TRUTH_LIMITS.maxNumArray) {
          dropped++;
          return undefined;
        }
        const out: TruthLeaf[] = [];
        for (const x of v as number[]) if (take()) out.push(leafOf(x));
        return out;
      }
      if (v.length > TRUTH_LIMITS.maxObjArray) {
        dropped++;
        return undefined;
      }
      const out: TruthTree = {};
      v.forEach((item, i) => {
        const o = item as { id?: unknown; drugId?: unknown; agent?: unknown } | null;
        const id = o && typeof o === 'object' ? (o.id ?? o.drugId ?? o.agent) : undefined;
        const w = walk(item, depth + 1, '');
        if (w !== undefined) out[typeof id === 'string' || typeof id === 'number' ? String(id) : String(i)] = w;
      });
      return out;
    }
    const out: TruthTree = {};
    for (const [k, x] of Object.entries(v)) {
      if (SKIP_ANY.has(k)) continue;
      const p = path && depth < SKIP_PATH_DEPTH ? `${path}.${k}` : '';
      if (p && SKIP_PATH.has(p)) continue;
      const w = walk(x, depth + 1, p);
      if (w !== undefined) out[k] = w;
    }
    return out;
  };
  const tree: TruthTree = {};
  // the device layer first: when the leaf cap cuts the walk, it cuts the tail of the physiology, never the devices
  if (dev) {
    const w = walk(dev, 1, 'dev');
    if (w !== undefined) tree.dev = w;
  }
  for (const [k, x] of Object.entries(st)) {
    if (SKIP_TOP.has(k) || SKIP_ANY.has(k)) continue;
    const w = walk(x, 1, k);
    if (w !== undefined) tree[k] = w;
  }
  return { tree, leaves, dropped, truncated };
}
```

- [x] **Step 5: Run the prune test and see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/truth.test.ts`
Expected: PASS, 7 tests.

- [x] **Step 6: Write the failing engine-event test** — `packages/engine-core/test/engine/truth-event.test.ts`:

```ts
// Stage 7x (R52): the opt-in truth event — rate, size budget, cost, read-only, replay-neutral.
import { describe, expect, it } from 'vitest';
import { createEngine, pruneTruth, type EngineEvent, type TruthEvent } from '../../src/index.ts';

const adult = { seed: 7, mode: 'modeled' as const, patient: { ageY: 40, sex: 'M' as const, weightKg: 70 } };
const bytes = (o: unknown) => new TextEncoder().encode(JSON.stringify(o)).length;

// A realistic 7g `ps.pk` (origin/stage-7g-pkpd `PkState`, `DrugInst`, `DrugBus`) with `n` of its 58 library drugs
// given: ≈ 19 leaves per drug instance (x = 5 compartments, one gamma dose, two bolus times), a bus agent, lastC and
// dec per drug, two volatiles; full-precision floats as the engine produces them.
const LIBRARY = ['propofol', 'ketamine', 'etomidate', 'thiopental', 'midazolam', 'dexmedetomidine', 'fentanyl', 'remifentanil', 'sufentanil', 'morphine', 'sevoflurane', 'isoflurane', 'desflurane', 'n2o', 'rocuronium', 'vecuronium', 'cisatracurium', 'succinylcholine', 'sugammadex', 'neostigmine', 'glycopyrrolate', 'atropine', 'phenylephrine', 'ephedrine', 'norepinephrine', 'epinephrine', 'vasopressin', 'dobutamine', 'milrinone', 'dopamine', 'nitroglycerin', 'hydralazine', 'esmolol', 'labetalol', 'metoprolol', 'amiodarone', 'adenosine', 'calciumChloride', 'calciumGluconate', 'sodiumBicarbonate', 'insulinDextrose', 'magnesium', 'salbutamol', 'insulin', 'dextrose', 'dantrolene', 'furosemide', 'mannitol', 'hypertonicSaline', 'naloxone', 'flumazenil', 'lidocaine', 'bupivacaine', 'ropivacaine', 'lipidEmulsion', 'tranexamicAcid', 'ondansetron', 'dexamethasone'];
const f = (i: number) => Math.PI * (i + 1) / 7.3; // a 16–17 digit float
function fakePk(n: number) {
  const ids = LIBRARY.slice(0, n);
  const vol = (i: number) => ({ fet: f(i), brain: f(i + 1), macAge: f(i + 2), macFrac: f(i + 3) });
  return {
    t: 1234.5, patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'm' },
    drugs: Object.fromEntries(ids.map((id, i) => [id, { id, model: null, x: [f(i), f(i + 1), f(i + 2), f(i + 3), f(i + 4)], factor: 1, rate: f(i), rateUntil: 1e12, tci: null, doses: [{ t: f(i), scale: 1 }], infC: 0, infTarget: 0, total: f(i + 5), bound: 0, bolusTimes: [f(i), f(i + 9)] }])),
    vap: { agent: 'sevoflurane', s: { agent: 'sevoflurane', fd: 0.02, fgf: 2, fi: f(1), fa: f(2), vrg: f(3), muscle: f(4), fat: f(5) }, n2o: { agent: 'n2o', fd: 0.5, fgf: 2, fi: f(6), fa: f(7), vrg: f(8), muscle: f(9), fat: f(10) }, dialPct: 2, n2oFrac: 0.5 },
    fx: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`effect${i}`, f(i)])), betaBlockAdd: 0,
    bus: {
      agents: Object.fromEntries(ids.map((id, i) => [id, { unit: 'µg/mL', plasma: f(i), brain: f(i + 1), cumulativeMgPerKg: f(i + 2) }])),
      volatiles: { sevoflurane: vol(1), n2o: vol(2) }, doses: [], antagonist: { opioid: 1, benzodiazepine: 1 },
      cns: Object.fromEntries(['propCe', 'opioidCeRemiEq', 'macBrain', 'ketamineCe', 'benzoCeMidazEq', 'dexmedCe', 'uHyp', 'uOpioid', 'uSurface', 'cmro2Mult', 'cbfVaso'].map((k, i) => [k, f(i)])),
      nmb: { achGain: 1 }, airway: { bronchodilation: 0, histamine: 0 }, hpvInhibit: 0, metabolic: { kShift: 0, glucoseDelta: 0, dantroleneE: 0 }, last: { cnsE: f(1), cvE: f(2) }, avNodeBlock: 0,
    },
    pending: [], due: [], lastC: Object.fromEntries(ids.map((id, i) => [id, f(i)])), desSurgeT: -1e12,
    macPrev: Array.from({ length: 60 }, (_, i) => f(i)), panelNext: 1235, dec: Object.fromEntries(ids.map((id, i) => [id, f(i)])),
  };
}

describe('truth event', () => {
  it('is off by default and rejects rates outside 0–2 Hz', () => {
    const e = createEngine(adult);
    const got: EngineEvent[] = [];
    e.on((x) => got.push(x), ['truth']);
    e.advanceTo(3);
    expect(got).toHaveLength(0);
    expect(() => createEngine({ ...adult, truthHz: 5 })).toThrow(RangeError);
    expect(() => createEngine({ ...adult, truthHz: -1 })).toThrow(RangeError);
  });
  it('fires at truthHz with the physiology sub-trees and the device layer, under 50 KB', () => {
    const e = createEngine({ ...adult, truthHz: 1 });
    const got: TruthEvent[] = [];
    e.on((x) => got.push(x as TruthEvent), ['truth']);
    e.advanceTo(10);
    expect(got.map((g) => g.t)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const last = got.at(-1) as TruthEvent;
    expect(Object.keys(last.tree)).toEqual(expect.arrayContaining(['l1', 'hemo', 'resp', 'dev']));
    expect(Object.keys(last.tree)).not.toContain('qrs');
    expect((last.tree.hemo as { circ: { p: { rSys: number } } }).circ.p.rSys).toBeGreaterThan(0);
    // the budget is a contract: a later stage that pushes the tree past it must prune its machinery (SKIP lists)
    expect(bytes(last)).toBeLessThan(50_000);
    console.log(`truth: ${last.leaves} leaves, ${last.dropped} dropped, ${bytes(last)} B JSON${last.truncated ? ' (TRUNCATED)' : ''}`);
  });
  it('costs < 0.2 ms per call on today\'s state (logged; CI asserts 1 ms) and fits 50 KB with 7b–7g-sized sub-trees', () => {
    const e = createEngine(adult);
    e.advanceTo(30);
    const { st, dev } = e.snapshot().state as { st: Record<string, unknown>; dev: object };
    for (let i = 0; i < 100; i++) pruneTruth(st, dev); // JIT warm-up
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) pruneTruth(st, dev);
    const per = (performance.now() - t0) / 200;
    console.log(`pruneTruth ≈ ${per.toFixed(3)} ms per call`);
    expect(per).toBeLessThan(1);
    // later stages add ~6 organ sub-trees (150 leaves each, realistic key lengths) and 7g's pk tree, on top of the
    // 7a-era trees (l1, hemo, resp) so this check does not move when 7b–7g land. A typical anaesthetic: 12 drugs given.
    const fake = (tag: string) => Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`${tag}Field${i}`, i * 1.2345678]));
    const organ = { l1: st.l1, hemo: st.hemo, resp: st.resp, blood: fake('blood'), organs: { brain: fake('brain'), renal: fake('renal'), liver: fake('liver') }, endo: fake('endo'), neuro: fake('neuro') };
    const r = pruneTruth({ ...organ, pk: fakePk(12) }, dev);
    console.log(`future tree (12 drugs): ${r.leaves} leaves, ${bytes(r.tree)} B`);
    expect(r.truncated).toBe(false);
    expect(bytes(r.tree)).toBeLessThan(50_000);
    // the busy case — all 58 library drugs given: the leaf cap cuts the tail, the event still fits the budget and the
    // devices (walked first) are whole
    const busy = pruneTruth({ ...organ, pk: fakePk(58) }, dev);
    console.log(`busy tree (58 drugs): ${busy.leaves} leaves, ${bytes(busy.tree)} B${busy.truncated ? ' (TRUNCATED)' : ''}`);
    expect(bytes({ type: 'truth', t: 1234.56, ...busy })).toBeLessThan(50_000);
    expect(busy.tree.dev).toEqual(pruneTruth({}, dev).tree.dev);
  });
  it('is read-only: the same seed with and without truth gives the identical state and samples', () => {
    const a = createEngine({ ...adult, truthHz: 2 });
    const b = createEngine(adult);
    a.on(() => undefined, ['truth']);
    a.advanceTo(20);
    b.advanceTo(20);
    expect(JSON.stringify(a.snapshot().state)).toBe(JSON.stringify(b.snapshot().state));
    const ia = new Float32Array(500);
    const ib = new Float32Array(500);
    a.readSamples('abp', a.latestSampleIndex('abp') - 499, ia);
    b.readSamples('abp', b.latestSampleIndex('abp') - 499, ib);
    expect(Array.from(ia)).toEqual(Array.from(ib));
  });
});
```

- [x] **Step 7: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/truth-event.test.ts`
Expected: FAIL — `createEngine({ truthHz: 5 })` does not throw, no `truth` events arrive, `pruneTruth` is not
exported from the index.

- [x] **Step 8: Wire the accessor (merge main first, R51 §7)**

Run `git fetch origin && git merge origin/main` (no conflict expected: nothing has touched this branch yet). Then make
exactly these additive edits.

`packages/engine-core/src/types.ts` — after the line
`import type { CircClinicalEvent, CircDeviceAction, CircEvent, ProfileCondition, TeachingChannel } from './types-circ.ts'; // Stage 7a`
add:

```ts
import type { TruthEvent } from './types-truth.ts'; // Stage 7x
```

in `interface EngineOptions`, after `  lookaheadS?: number; // default 0.100; must be a whole number of 20 ms ticks` add:

```ts
  /** Stage 7x (R52): emit the read-only `truth` event this often (0 = never, the default; at most 2 Hz). */
  truthHz?: number;
```

and in `export type EngineEvent =`, after the member line `  | HemoEvent // Stage 2 (types-hemo.ts)` add:

```ts
  | TruthEvent // Stage 7x (types-truth.ts)
```

`packages/engine-core/src/index.ts` — after `export type * from './types-circ.ts'; // Stage 7a` add:

```ts
export type * from './types-truth.ts'; // Stage 7x
export { pruneTruth, TRUTH_LIMITS } from './truth.ts'; // Stage 7x
```

`packages/engine-core/src/engine.ts` — (a) after `import { lastCycleBefore } from './l2/resp/driver.ts'; // Stage 5.1 (R-S3-3)` add:

```ts
import { pruneTruth } from './truth.ts'; // Stage 7x (R52)
```

(b) in `class Engine`, after `  private readonly devOpts: EngineOptions['device']; // Stage 4b: for restoring pre-4b snapshots` add:

```ts
  private readonly truthEvery: number; // Stage 7x (R52): ticks between truth events, 0 = off
```

(c) in the constructor, after `    this.devOpts = opts.device;` add:

```ts
    const truthHz = opts.truthHz ?? 0; // Stage 7x (R52)
    if (!(truthHz >= 0 && truthHz <= 2)) throw new RangeError(`truthHz must be 0–2, got ${truthHz}`);
    this.truthEvery = truthHz > 0 ? Math.round(1000 / TICK_MS / truthHz) : 0;
```

(d) in `private tickOnce(speculate: boolean)`, find the two lines

```ts
    for (const e of devOut) this.emit(e);
    if (speculate) this.speculate();
```

and insert between them:

```ts
    if (this.truthEvery > 0 && this.tick % this.truthEvery === 0) this.emit({ type: 'truth', t: simT, ...pruneTruth(this.st, this.dev) }); // Stage 7x (R52)
```

(`for (const e of devOut) this.emit(e);` occurs twice in `engine.ts`; the one to use is the one directly followed by
`if (speculate) this.speculate();`.)

- [x] **Step 9: Run the tests, the typecheck and the engine suite**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/truth.test.ts test/engine/truth-event.test.ts`
Expected: PASS, 11 tests; the log shows `truth: ~745 leaves, ~22 dropped, ~13000 B JSON`, `pruneTruth ≈ 0.06–0.13 ms
per call`, `future tree (12 drugs): ~1890 leaves, ~43000 B` and `busy tree (58 drugs): 2100 leaves, ~48700 B
(TRUNCATED)`.
Run: `npx -y pnpm@9.15.9 typecheck` — Expected: every package `Done`, no errors (the new union member breaks no
exhaustive switch; verified).
Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core test` — Expected: all pass (596 passed, 1 skipped on
`36097c1` + this task; more if main gained tests). Record the measured numbers for the gate note.

- [x] **Step 10: Commit and push**

```bash
git add packages/engine-core/src/types-truth.ts packages/engine-core/src/truth.ts packages/engine-core/src/types.ts packages/engine-core/src/index.ts packages/engine-core/src/engine.ts packages/engine-core/test/truth.test.ts packages/engine-core/test/engine/truth-event.test.ts
git commit -m "feat(engine): opt-in read-only truth event (pruned state tree, ≤ 2 Hz) for the physiology console (R52)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin stage-7x-physiology-console
```

---

### Task 2: Flatten and organ grouping

**Files:**
- Create: `apps/demo/src/physiology-console/flatten.ts`, `apps/demo/src/physiology-console/organs.ts`
- Test: `apps/demo/src/physiology-console/flatten.test.ts`, `apps/demo/src/physiology-console/organs.test.ts`

**Interfaces:**
- Consumes: `EngineEvent` (incl. `TruthEvent`, Task 1).
- Produces: `type Leaf = number | boolean | string | null`; `type Leaves = Map<string, Leaf>`;
  `flatten(v: unknown, prefix: string, out: Leaves, skipKeys?: ReadonlySet<string>, depth?: number): void`;
  `foldEvent(e: EngineEvent, out: Leaves): boolean` (clears `ev.<type>.*` first; object arrays keyed by
  `id`/`drugId`/`agent`, else index); `SKIP_EVENTS`; `GROUPS` (14 `{ id, title }`), `type GroupId`,
  `GROUP_BY_PREFIX`, `groupOf(path: string): GroupId`, `INTERNAL_PREFIXES` (`*` = one segment),
  `isInternal(path: string): boolean`, `PHASE_PREFIXES`, `isPhase(path: string): boolean`.

- [x] **Step 1: Write the failing tests**

`apps/demo/src/physiology-console/flatten.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { flatten, foldEvent, type Leaves } from './flatten.ts';

describe('flatten', () => {
  it('turns a nested tree into dotted paths, arrays by index', () => {
    const out: Leaves = new Map();
    flatten({ hemo: { circ: { p: { rSys: 0.9 } }, open: true }, resp: { aer: [0.9, 0.8], site: 'radial', man: null } }, '', out);
    expect([...out]).toEqual([
      ['hemo.circ.p.rSys', 0.9], ['hemo.open', true], ['resp.aer.0', 0.9], ['resp.aer.1', 0.8], ['resp.site', 'radial'], ['resp.man', null],
    ]);
  });
  it('skips arrays longer than 16 and typed arrays', () => {
    const out: Leaves = new Map();
    flatten({ a: Array.from({ length: 17 }, () => 1), b: new Float32Array(2), c: 1 }, 'x', out);
    expect([...out]).toEqual([['x.c', 1]]);
  });
});

describe('foldEvent', () => {
  it('puts summary events under ev.<type> without t/seq/tick, and measurements under mon.<id>', () => {
    const out: Leaves = new Map();
    const circ = { type: 'circ', t: 3, co: 5.1, svr: 0.9, iabp: { ratio: 1, augmentation: 110 } } as unknown as EngineEvent;
    expect(foldEvent(circ, out)).toBe(true);
    expect(foldEvent({ type: 'measurement', t: 3, values: { hr: { value: 72, flag: 'valid', at: 3 }, spo2: { value: null, flag: 'invalid', at: 3 } } }, out)).toBe(true);
    expect(foldEvent({ type: 'state', t: 3, tick: 150, mode: 'modeled', values: { hr: 71 }, control: { hr: 'modeled' } }, out)).toBe(true);
    expect([...out]).toEqual([
      ['ev.circ.co', 5.1], ['ev.circ.svr', 0.9], ['ev.circ.iabp.ratio', 1], ['ev.circ.iabp.augmentation', 110],
      ['mon.hr', 72], ['mon.spo2', null],
      ['ev.state.mode', 'modeled'], ['ev.state.values.hr', 71], ['ev.state.control.hr', 'modeled'],
    ]);
  });
  it('ignores tones, markers, alarms and truth; folds an event type it has never seen', () => {
    const out: Leaves = new Map();
    expect(foldEvent({ type: 'tone', t: 1, id: 'q', kind: 'qrs' }, out)).toBe(false);
    expect(foldEvent({ type: 'truth', t: 1, tree: {}, leaves: 0, dropped: 0, truncated: false }, out)).toBe(false);
    expect(foldEvent({ type: 'organs', t: 1, kidney: { gfr: 110 } } as unknown as EngineEvent, out)).toBe(true);
    expect([...out]).toEqual([['ev.organs.kidney.gfr', 110]]);
  });
  it('keys object arrays by id/drugId/agent, and a new event of a type replaces that type\'s old leaves', () => {
    const out: Leaves = new Map([['ev.drugsX.a', 1]]);
    const drugs = (rows: object[]) => ({ type: 'drugs', t: 1, drugs: rows, volatile: null, macTotal: 0 }) as unknown as EngineEvent;
    foldEvent(drugs([{ id: 'propofol', ce: 2.1 }, { id: 'fentanyl', ce: 1.2 }]), out);
    expect(out.get('ev.drugs.drugs.propofol.ce')).toBe(2.1);
    expect(out.get('ev.drugs.drugs.fentanyl.ce')).toBe(1.2);
    foldEvent(drugs([{ id: 'fentanyl', ce: 1.1 }]), out); // propofol stopped and left the panel: its row goes
    expect([...out.keys()].filter((k) => k.startsWith('ev.drugs.'))).toEqual(['ev.drugs.drugs.fentanyl.id', 'ev.drugs.drugs.fentanyl.ce', 'ev.drugs.volatile', 'ev.drugs.macTotal']);
    expect(out.get('ev.drugsX.a')).toBe(1); // whole segments: another type's leaves stay
    const keyed: Leaves = new Map();
    flatten({ rows: [{ drugId: 'rocuronium', v: 1 }, { agent: 'sevoflurane', v: 2 }, { v: 3 }] }, 'x', keyed);
    expect([...keyed.keys()]).toEqual(['x.rows.rocuronium.drugId', 'x.rows.rocuronium.v', 'x.rows.sevoflurane.agent', 'x.rows.sevoflurane.v', 'x.rows.2.v']);
  });
});
```

`apps/demo/src/physiology-console/organs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GROUPS, groupOf, isInternal, isPhase } from './organs.ts';

describe('organ grouping', () => {
  it.each([
    ['hemo.circ.p.rSys', 'circulation'], ['ev.circ.svr', 'circulation'], ['ev.circ.lvad.flowLpm', 'devices'], ['hemo.iabp.ratio', 'devices'],
    ['mon.hr', 'monitor'], ['hemo.num.abp.sys', 'monitor'], ['resp.o2.pao2', 'lungs'], ['resp.driver.vent.peep', 'devices'],
    ['resp.temp.tc', 'blood'], ['mods.k', 'ecg'], ['ev.beat.qtMs', 'ecg'], ['l1.vars.sbp.to', 'controls'], ['dev.pacer.mode', 'devices'],
    // stages not merged yet (paths from the 7b–7g plans)
    ['resp.lung.mech.cL', 'lungs'], ['blood.core.ab.ph', 'blood'], ['organs.brain.icp', 'brain'], ['organs.renal.gfr', 'kidney'],
    ['organs.liver.lactate', 'liver'], ['endo.core.glucose.g', 'endocrine'], ['neuro.antinoc', 'neuro'], ['pk.bus.cns.propCe', 'drugs'],
    ['ev.drugs.macTotal', 'drugs'], ['ev.labs.values.ph', 'blood'],
    // 7d's published keys (kidney, R51 addendum 13), its ICP sensor and interim anaesthesia input; 7e's seams
    ['organs.kidney.gfrRel', 'kidney'], ['ev.organs.kidney.uopMlMin', 'kidney'], ['organs.sensors.icp', 'brain'], ['organs.anaesEvent.propofolE', 'brain'],
    ['hemo.circ.ext.endoHrF', 'endocrine'], ['hemo.circ.ext.endoSvrF', 'endocrine'], ['blood.endo.glucoseMgDl', 'endocrine'], ['hemo.circ.ext.pPtx', 'circulation'],
    // unknown → other
    ['ecmo.flowLpm', 'other'], ['organs.iap', 'other'], ['ev.somethingNew.x', 'other'],
  ])('%s → %s', (path, group) => expect(groupOf(path)).toBe(group));
  it('matches whole segments only', () => {
    expect(groupOf('hemodynamics.x')).toBe('other');
    expect(groupOf('monitor.x')).toBe('other');
  });
  it('has 14 groups ending with other', () => {
    expect(GROUPS).toHaveLength(14);
    expect(GROUPS.at(-1)?.id).toBe('other');
  });
  it('flags bookkeeping leaves as internal', () => {
    for (const p of ['l1.vars.sbp.t0', 'l1.vars.sbp.from', 'hemo.circ.acc.sbp', 'hemo.circ.mapSum', 'hemo.circ.ctlNext', 'resp.driver.seq', 'blood.k', 'hemo.circ.lastEjT', 'hemo.num.abp.n', 'hemo.circ.cor.ref.sv', 'dev.alarms.cfg.volume', 'rhythm.records.0.qtMs'])
      expect(isInternal(p), p).toBe(true);
    for (const p of ['l1.vars.sbp.to', 'mods.k', 'rhythm.id', 'hemo.numbers.x', 'dev.pacer.mode', 'blood.core.out.k', 'hemo.circ.p.rSys', 'ev.circ.svr', 'mon.hr', 'resp.o2.pao2', 'hemo.circ.kLv'])
      expect(isInternal(p), p).toBe(false);
  });
  it('flags 7g\'s PK machinery as internal and keeps the bus concentrations visible (`*` = one segment)', () => {
    for (const p of ['pk.drugs.propofol.x.0', 'pk.drugs.rocuronium.bolusTimes.1', 'pk.drugs.adenosine.doses.0.scale', 'pk.bus.doses.0.amount', 'pk.lastC.propofol', 'pk.due.0.amt', 'pk.pending.0.t', 'pk.macPrev.3'])
      expect(isInternal(p), p).toBe(true);
    for (const p of ['pk.bus.agents.propofol.brain', 'pk.drugs.propofol.rate', 'pk.drugs.propofol.total', 'pk.drugs.x', 'pk.bus.cns.propCe', 'pk.vap.dialPct'])
      expect(isInternal(p), p).toBe(false);
  });
  it('marks within-beat and within-breath values as phase (sampled at 1 Hz they alias)', () => {
    for (const p of ['hemo.circOut.pLv', 'hemo.circOut.qAv', 'resp.lung.tidal.2', 'resp.lung.inInsp', 'resp.lung.pInsp']) expect(isPhase(p), p).toBe(true);
    for (const p of ['hemo.circ.p.rSys', 'resp.lung.peepTot', 'resp.lung.tidalSum', 'ev.circ.svr']) expect(isPhase(p), p).toBe(false);
  });
});
```

- [x] **Step 2: Run them and see them fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/flatten.test.ts src/physiology-console/organs.test.ts`
Expected: FAIL — `./flatten.ts` and `./organs.ts` do not exist.

- [x] **Step 3: Implement**

`apps/demo/src/physiology-console/flatten.ts`:

```ts
// Stage 7x: flatten the truth tree and the engine's summary events into one map of dotted paths → leaf values.
// Paths: the truth tree as-is (`hemo.circ.p.rSys`), events under `ev.<type>.` (`ev.circ.svr`), monitor numerics under
// `mon.<id>` (the value the monitor shows). Arrays of objects are keyed by `id`/`drugId`/`agent` when they carry one
// (7g's `drugs` rows → `ev.drugs.drugs.propofol.ce`), by index otherwise — as the engine's pruneTruth does.
import type { EngineEvent } from '@pme/engine-core';

export type Leaf = number | boolean | string | null;
export type Leaves = Map<string, Leaf>;

/** Arrays longer than this inside events are histories, not values. */
const MAX_EVENT_ARRAY = 16;
/** Event leaves that are timestamps or counters, not physiology. */
const EVENT_SKIP_KEYS = new Set(['t', 'tick', 'seq']);
/**
 * Event types that are not folded: discrete marks (tones, markers, alarms, atrial activations), the alarm manager's
 * configuration, and `truth` itself (ingested whole by the model). Every other event type, including those of stages
 * not merged yet, is folded automatically.
 */
export const SKIP_EVENTS: ReadonlySet<string> = new Set(['tone', 'toneCancel', 'marker', 'alarm', 'atrial', 'alarmStatus', 'truth', 'measurement']);

/** The key of one array element: its `id`/`drugId`/`agent` when it has one (a drug row, a lung unit), else the index. */
function keyOf(x: unknown, i: number): string {
  if (x === null || typeof x !== 'object') return String(i);
  const o = x as { id?: unknown; drugId?: unknown; agent?: unknown };
  const id = o.id ?? o.drugId ?? o.agent;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : String(i);
}

export function flatten(v: unknown, prefix: string, out: Leaves, skipKeys?: ReadonlySet<string>, depth = 0): void {
  if (v === null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
    out.set(prefix, v);
    return;
  }
  if (typeof v !== 'object' || depth > 12 || ArrayBuffer.isView(v)) return;
  if (Array.isArray(v)) {
    if (v.length > MAX_EVENT_ARRAY) return;
    v.forEach((x, i) => flatten(x, prefix ? `${prefix}.${keyOf(x, i)}` : keyOf(x, i), out, skipKeys, depth + 1));
    return;
  }
  for (const [k, x] of Object.entries(v)) {
    if (skipKeys?.has(k)) continue;
    flatten(x, prefix ? `${prefix}.${k}` : k, out, skipKeys, depth + 1);
  }
}

/**
 * Fold one engine event into `out`. Each event of a type REPLACES that type's previous leaves (`ev.<type>.*` is
 * cleared first), so a drug that stopped or an optional field that went away leaves the page. Returns false when the
 * event type is not folded.
 */
export function foldEvent(e: EngineEvent, out: Leaves): boolean {
  if (e.type === 'measurement') {
    for (const [id, m] of Object.entries(e.values)) if (m) out.set(`mon.${id}`, m.value);
    return true;
  }
  if (SKIP_EVENTS.has(e.type)) return false;
  const { type, ...rest } = e as { type: string } & Record<string, unknown>;
  const prefix = `ev.${type}`;
  for (const k of out.keys()) if (k.startsWith(`${prefix}.`)) out.delete(k);
  flatten(rest, prefix, out, EVENT_SKIP_KEYS);
  return true;
}
```

`apps/demo/src/physiology-console/organs.ts`:

```ts
// Stage 7x: the curated path → organ map. Longest matching prefix wins (whole path segments); anything unmatched
// lands in "other", so fields of stages not merged yet appear without editing this page. Prefixes for 7b–7g paths
// are taken from their plans (resp.lung, blood, organs.brain/renal|kidney/liver, endo, neuro, pk, and their events;
// 7d's published kidney key is `kidney`, its internal module `renal` — R51 addendum 13).
export const GROUPS = [
  { id: 'monitor', title: 'Monitor output' },
  { id: 'circulation', title: 'Circulation' },
  { id: 'ecg', title: 'Rhythm & ECG' },
  { id: 'lungs', title: 'Lungs & gas exchange' },
  { id: 'blood', title: 'Blood, acid–base & temperature' },
  { id: 'brain', title: 'Brain' },
  { id: 'kidney', title: 'Kidney' },
  { id: 'liver', title: 'Liver' },
  { id: 'endocrine', title: 'Endocrine' },
  { id: 'neuro', title: 'Neuro, depth & NMB' },
  { id: 'drugs', title: 'Drugs' },
  { id: 'devices', title: 'Devices' },
  { id: 'controls', title: 'Controls & targets (L1)' },
  { id: 'other', title: 'Other' },
] as const;
export type GroupId = (typeof GROUPS)[number]['id'];

export const GROUP_BY_PREFIX: Readonly<Record<string, GroupId>> = {
  // monitor output: the numerics the monitor shows, and the measurement machinery behind them
  mon: 'monitor', 'ev.nibp': 'monitor', 'hemo.nibp': 'monitor', 'hemo.num': 'monitor', 'hemo.lines': 'monitor',
  'hemo.abpSite': 'monitor', 'hemo.lastSite': 'monitor', 'resp.num': 'monitor', 'resp.sampler': 'monitor',
  'resp.co2Sensor': 'monitor', 'resp.tempSensor': 'monitor', 'resp.tempSite': 'monitor', 'resp.shownCo2': 'monitor',
  // circulation (Stage 2 + 7a)
  hemo: 'circulation', 'ev.circ': 'circulation',
  // rhythm and ECG
  hr: 'ecg', mods: 'ecg', rhythm: 'ecg', 'ev.beat': 'ecg', 'ev.rhythmSegment': 'ecg',
  // lungs (Stage 3 + 7b)
  resp: 'lungs', 'ev.lungState': 'lungs', 'ev.breath': 'lungs',
  // blood (7c) and temperature (Stage 3 thermal lives in resp.temp)
  blood: 'blood', 'resp.temp': 'blood', 'ev.labs': 'blood', 'ev.labResult': 'blood',
  // organs (7d): the `organs` event's summaries are brain/kidney/liver; the ICP sensor state and the interim
  // `brain { anaesthesia }` input belong to the brain
  'organs.brain': 'brain', 'organs.renal': 'kidney', 'organs.kidney': 'kidney', 'organs.liver': 'liver',
  'organs.sensors.icp': 'brain', 'organs.sensors.pbto2': 'brain', 'organs.sensors.urometer': 'kidney', 'organs.anaesEvent': 'brain',
  'ev.organs.brain': 'brain', 'ev.organs.renal': 'kidney', 'ev.organs.kidney': 'kidney', 'ev.organs.liver': 'liver',
  // endocrine (7e): its own tree and event, its seams into 7c's blood and 7a's circulation multipliers
  endo: 'endocrine', 'ev.endo': 'endocrine', 'blood.endo': 'endocrine',
  'hemo.circ.ext.endoHrF': 'endocrine', 'hemo.circ.ext.endoSvrF': 'endocrine', 'hemo.circ.ext.endoEesF': 'endocrine', 'hemo.circ.ext.endoDV0Frac': 'endocrine',
  // neuro (7f), drugs (7g)
  neuro: 'neuro', 'ev.anaesthesia': 'neuro', 'ev.tof': 'neuro', 'ev.neuroMark': 'neuro',
  pk: 'drugs', pkHooks: 'drugs', 'ev.drugs': 'drugs',
  // devices: ventilator settings, IABP, LVAD, CPR, defibrillator/pacer (future ECMO lands in "other" until mapped)
  dev: 'devices', 'ev.deviceStatus': 'devices', 'resp.driver.vent': 'devices', 'hemo.iabp': 'devices', 'hemo.iabpAug': 'devices',
  'hemo.lvad': 'devices', 'hemo.cpr': 'devices', 'ev.circ.iabp': 'devices', 'ev.circ.lvad': 'devices',
  // controls: the L1 targets and the 1 Hz state event
  l1: 'controls', 'ev.state': 'controls',
};

const cache = new Map<string, GroupId>();
export function groupOf(path: string): GroupId {
  const hit = cache.get(path);
  if (hit) return hit;
  let g: GroupId = 'other';
  const segs = path.split('.');
  for (let n = segs.length; n > 0; n--) {
    const m = GROUP_BY_PREFIX[segs.slice(0, n).join('.')];
    if (m) {
      g = m;
      break;
    }
  }
  cache.set(path, g);
  return g;
}

/** Bookkeeping leaves (step indices, accumulators, ramp internals): shown only with "internals" ticked. */
const INTERNAL_LAST = /^(t|t0|seq|tick|from|curve|delayS|durationS)$|Seq$|Sum$|Next$|^next|^last[A-Z]|^prev|Until$/;
const INTERNAL_MID = /\.(acc|det|hist|ring)\./;
/** Sub-stage step/sample indices (`blood.k`, `organs.m`); `mods.k` is potassium and stays visible. */
const INTERNAL_STEP = /^(hemo|resp|blood|organs|endo|neuro|pk)\.(k|m|n)$/;
/**
 * Machinery sub-trees (measurement pipelines, beat schedulers, alarm state, PK compartments and dose logs). `*` stands
 * for one path segment. Paths of later stages are visible by default; add their machinery here when it lands. (7a's
 * reference copies `hemo.circ.prof|base|ref` and the alarm profile never reach the page: the engine prunes them.)
 */
export const INTERNAL_PREFIXES: readonly string[] = [
  // Stage 2/3 monitor machinery and waveform generators
  'hemo.num', 'hemo.nibp', 'hemo.lines', 'hemo.lastSite', 'hemo.siteBeats', 'hemo.manHold', 'hemo.cvp', 'hemo.pleth', 'hemo.sys',
  'hemo.pul', 'hemo.wedge', 'hemo.stPatch', 'hemo.stApplied', 'hemo.pv', 'hemo.pla', 'hemo.pvOn', 'hemo.beatT', 'hemo.abpSite',
  'resp.num', 'resp.sampler', 'resp.beats', 'resp.delay', 'resp.seen', 'resp.gasK', 'resp.lungKey', 'resp.co2Sensor', 'resp.tempSensor',
  'resp.tempSite', 'resp.shownCo2',
  // 7a circulation: activation schedules and the coronary reference copy (the live parameters are hemo.circ.p)
  'hemo.circ.vent', 'hemo.circ.atria', 'hemo.circ.beats', 'hemo.circ.opens', 'hemo.circ.cor.ref',
  // rhythm scheduler internals (the rhythm id stays visible)
  'rhythm.events', 'rhythm.records', 'rhythm.atria', 'rhythm.junction', 'rhythm.focusAxis', 'rhythm.focusN', 'rhythm.pendingSwitch',
  // device layer: alarm configuration and the copies of the measurements it reads
  'dev.alarms', 'dev.inputs', 'dev.sync', 'dev.pending', 'dev.tcpKey', 'dev.lastBeat',
  // 7g PK machinery: compartment amounts, gamma doses and bolus times per drug, the per-tick dose log, the pending
  // and grid-due boluses, the last PD concentrations and the desflurane MAC history (the bus concentrations stay visible)
  'pk.drugs.*.x', 'pk.drugs.*.doses', 'pk.drugs.*.bolusTimes', 'pk.bus.doses', 'pk.lastC', 'pk.due', 'pk.pending', 'pk.macPrev',
];
const prefixRe = (list: readonly string[]) =>
  new RegExp(`^(${list.map((p) => p.replace(/\./g, '\\.').replace(/\*/g, '[^.]+')).join('|')})(\\.|$)`);
const PREFIX_RE = prefixRe(INTERNAL_PREFIXES);
export function isInternal(path: string): boolean {
  const last = path.slice(path.lastIndexOf('.') + 1);
  return INTERNAL_LAST.test(last) || INTERNAL_MID.test(`${path}.`) || INTERNAL_STEP.test(path) || PREFIX_RE.test(path);
}

/**
 * Within-beat / within-breath values (instantaneous chamber pressures and flows, breath-phase bookkeeping): sampled
 * once a second they alias, so they are shown but never highlighted as changed.
 */
export const PHASE_PREFIXES: readonly string[] = ['hemo.circOut', 'resp.lung.tidal', 'resp.lung.inInsp', 'resp.lung.pInsp', 'resp.lung.v0'];
const PHASE_RE = prefixRe(PHASE_PREFIXES);
export function isPhase(path: string): boolean {
  return PHASE_RE.test(path);
}
```

- [x] **Step 4: Run them and see them pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/flatten.test.ts src/physiology-console/organs.test.ts`
Expected: PASS, 44 tests (flatten 5, organs 39).

- [x] **Step 5: Commit and push**

```bash
git add apps/demo/src/physiology-console/flatten.ts apps/demo/src/physiology-console/organs.ts apps/demo/src/physiology-console/flatten.test.ts apps/demo/src/physiology-console/organs.test.ts
git commit -m "feat(console): flatten the truth tree and summary events; curated organ map with an 'other' bucket" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 3: Display metadata and formatting

**Files:**
- Create: `apps/demo/src/physiology-console/meta.ts`, `apps/demo/src/physiology-console/format.ts`
- Test: `apps/demo/src/physiology-console/format.test.ts`

**Interfaces:**
- Consumes: `Leaf` (Task 2).
- Produces: `interface Meta { label: string; unit: string; digits?: number; scale: number; rank: number; tol?:
  number | 'sat' }`; `metaOf(path: string): Meta`; `siblingUnit(path: string, get: (p: string) => unknown): string |
  undefined`; `autoDigits(v: number): number`; `fmtValue(v: Leaf | undefined, m: Pick<Meta, 'digits' | 'scale'>):
  string`; `fmtDelta(d: number | null, m, ref: number): string` (`ref` = the baseline); `type Dir = 'up' | 'down' |
  'diff' | null`; `CHANGE_REL = 0.02`; `changeDir(cur, base, m: Pick<Meta, 'digits' | 'scale' | 'tol'>): Dir`.

- [x] **Step 1: Write the failing test** — `apps/demo/src/physiology-console/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { autoDigits, changeDir, fmtDelta, fmtValue } from './format.ts';
import { metaOf, siblingUnit } from './meta.ts';

describe('metadata', () => {
  it('curated paths carry label, unit, digits and scale', () => {
    expect(metaOf('ev.circ.svr')).toMatchObject({ label: 'SVR', unit: 'dyn·s/cm⁵', digits: 0, scale: 1333.22 });
    expect(metaOf('ev.circ.ef')).toMatchObject({ unit: '%', scale: 100 });
    expect(metaOf('ev.circ.co').rank).toBeLessThan(metaOf('ev.circ.svr').rank);
  });
  it.each([
    ['resp.pat.deadSpaceMl', 'mL'], ['blood.core.rateMlPerMin', 'mL/min'], ['hemo.lvad.flowLpm', 'L/min'], ['ev.beat.qtMs', 'ms'],
    ['resp.pat.weightKg', 'kg'], ['dev.pacer.ratePpm', '/min'], ['organs.renal.uopMlMin', 'mL/min'], ['hemo.circ.ref.lvedp', 'mmHg'],
    ['ev.lungState.complianceMlPerCmH2O', 'mL/cmH₂O'], ['hemo.circ.kLv', ''],
    // concentration and rate suffixes of 7c/7e/7g come before the bare …Ml / …Kg rules
    ['endo.core.out.cortisolNmolL', 'nmol/L'], ['endo.core.out.insulinUuMl', 'µU/mL'], ['endo.core.out.adrenalinePgMl', 'pg/mL'],
    ['blood.core.out.glucoseMgDl', 'mg/dL'], ['organs.kidney.uopMlKgH', 'mL/kg/h'], ['x.y.vasopressinNgMl', 'ng/mL'],
    ['blood.core.out.tempC', '°C'], ['mods.tempC', '°C'], ['x.bloodTempC', '°C'], ['pk.bus.agents.rocuronium.cumulativeMgPerKg', 'mg/kg'],
    // curated: thermal model, model EtCO2, ECG potassium, NIBP and QTc numerics
    ['resp.temp.tc', '°C'], ['resp.etco2', 'mmHg'], ['mods.k', 'mmol/L'], ['mon.nibpSys', 'mmHg'], ['mon.nibpMean', 'mmHg'], ['mon.qtc', 'ms'],
  ])('unit of %s is "%s" from the field name', (path, unit) => expect(metaOf(path).unit).toBe(unit));
  it('a sibling unit leaf names the unit of a number that has none in its name', () => {
    const tree = new Map<string, unknown>([
      ['pk.bus.agents.propofol.unit', 'µg/mL'], ['ev.drugs.drugs.propofol.rateUnit', 'mg/min'], ['ev.drugs.drugs.propofol.amountUnit', 'mg'],
    ]);
    const get = (p: string) => tree.get(p);
    expect(siblingUnit('pk.bus.agents.propofol.brain', get)).toBe('µg/mL');
    expect(siblingUnit('ev.drugs.drugs.propofol.rate', get)).toBe('mg/min');
    expect(siblingUnit('ev.drugs.drugs.propofol.totalAmount', get)).toBe('mg');
    expect(siblingUnit('pk.bus.agents.propofol.unit', get)).toBeUndefined();
    expect(siblingUnit('hemo.circ.kLv', get)).toBeUndefined();
  });
  it('an unknown path is labelled by its last segment and sorts after curated rows', () => {
    expect(metaOf('organs.brain.icp')).toMatchObject({ label: 'icp', unit: '', scale: 1, rank: Number.POSITIVE_INFINITY });
  });
});

describe('formatting', () => {
  it('digits by magnitude', () => {
    expect([autoDigits(0), autoDigits(0.0402), autoDigits(4.2), autoDigits(36.8), autoDigits(4900)]).toEqual([0, 3, 2, 1, 0]);
  });
  it('a value that starts at 0 (a drug Ce, a bus fraction) changes and prints at the precision of the larger value', () => {
    const ce = metaOf('pk.bus.agents.propofol.brain');
    expect(changeDir(0.8, 0, ce)).toBe('up');
    expect(fmtDelta(0.8, ce, 0)).toBe('+0.800');
    expect(changeDir(0, 0.8, ce)).toBe('down');
    expect(fmtDelta(-0.8, ce, 0.8)).toBe('−0.800');
    expect(changeDir(0, 0, ce)).toBeNull();
    expect(changeDir(0.0004, 0, ce)).toBeNull(); // below one displayed digit (0.001)
  });
  it('values: scaled numbers, booleans, strings, null', () => {
    const svr = metaOf('ev.circ.svr');
    expect(fmtValue(0.905, svr)).toBe('1207');
    expect(fmtValue(0.0402, metaOf('x.shunt'))).toBe('0.040');
    expect(fmtValue(true, metaOf('x.open'))).toBe('true');
    expect(fmtValue('NaN', metaOf('x.y'))).toBe('NaN');
    expect(fmtValue(null, metaOf('x.y'))).toBe('—');
    expect(fmtValue(undefined, metaOf('x.y'))).toBe('');
  });
  it('deltas: signed, Unicode minus, zero when it rounds to zero', () => {
    const svr = metaOf('ev.circ.svr');
    expect(fmtDelta(0.3, svr, 0.9)).toBe('+400');
    expect(fmtDelta(-0.3, svr, 0.9)).toBe('−400');
    expect(fmtDelta(0.0001, svr, 0.9)).toBe('0');
    expect(fmtDelta(null, svr, 0.9)).toBe('');
  });
  it('change direction ignores < 2 % jitter and sub-digit moves; strings and booleans flag any difference', () => {
    const m = metaOf('x.map');
    expect(changeDir(96, 95, m)).toBeNull(); // 1.1 %
    expect(changeDir(97.5, 95, m)).toBe('up'); // 2.6 %
    expect(changeDir(90, 95, m)).toBe('down');
    expect(changeDir(1.0, 1.009, metaOf('ev.circ.svr'))).toBeNull();
    expect(changeDir('vfCoarse', 'sinus', m)).toBe('diff');
    expect(changeDir(true, true, m)).toBeNull();
    expect(changeDir(1, undefined, m)).toBeNull();
    expect(changeDir('NaN', 3, m)).toBe('diff');
  });
  it.each([
    // [path, baseline, still quiet, changed, direction] — absolute tolerances where 2 % is the wrong size
    ['blood.core.ab.ph', 7.4, 7.39, 7.37, 'down'], // 0.02 (2 % would be 0.15)
    ['resp.temp.tc', 36.8, 36.95, 37.1, 'up'], // 0.2 °C (2 % would be 0.74)
    ['mods.tempC', 37, 36.9, 36.7, 'down'],
    ['mon.spo2', 97, 96.5, 96, 'down'], // one point on a % scale
    ['resp.o2.sa', 0.97, 0.965, 0.955, 'down'], // one point on a fraction (0.01)
    ['resp.co2.pf', 40, 41.5, 42.5, 'up'], // 2 mmHg (2 % would be 0.8)
    ['mon.etco2', 35, 36.5, 37.5, 'up'],
    ['mods.k', 4.2, 4.35, 4.45, 'up'], // 0.2 mmol/L (2 % would be 0.08)
    ['blood.core.out.k', 4.2, 4.05, 3.95, 'down'],
    ['blood.core.out.lactate', 1, 1.2, 1.4, 'up'], // 0.3 mmol/L (2 % would be 0.02)
  ] as const)('%s: absolute tolerance', (path, base, quiet, moved, dir) => {
    const m = metaOf(path);
    expect(changeDir(quiet, base, m)).toBeNull();
    expect(changeDir(moved, base, m)).toBe(dir);
  });
  it('2 % stays the default: a valve constant named k and a step index are not potassium', () => {
    expect(metaOf('hemo.circ.p.av.k').tol).toBeUndefined();
    expect(metaOf('blood.k').tol).toBeUndefined();
    expect(metaOf('ev.circ.svr').tol).toBeUndefined();
    expect(changeDir(1.03, 1, metaOf('hemo.circ.p.av.k'))).toBe('up');
  });
});
```

- [x] **Step 2: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/format.test.ts`
Expected: FAIL — `./format.ts` / `./meta.ts` do not exist.

- [x] **Step 3: Implement**

`apps/demo/src/physiology-console/meta.ts`:

```ts
// Stage 7x: display metadata per path — label, unit, digits and a scale into clinical units. A small curated map
// for the values a clinician reads first; everything else gets its unit from the field name and its digits from
// its magnitude (format.ts), so new fields need no entry here.
export interface Meta {
  label: string;
  unit: string;
  /** Fixed decimals; undefined → by magnitude. */
  digits?: number;
  /** Displayed = raw × scale (e.g. mmHg·s/mL → dyn·s/cm⁵). */
  scale: number;
  /** Curated rows sort first in their section, in this map's order. */
  rank: number;
  /**
   * Absolute change tolerance in raw units, for quantities where 2 % of the baseline is the wrong size (pH, core
   * temperature, PaCO2, K, lactate); 'sat' = one saturation point (1 on a % scale, 0.01 on a fraction). Undefined →
   * the 2 % default (format.ts `CHANGE_REL`).
   */
  tol?: number | 'sat';
}

const DYN = 1333.22; // 1 mmHg·s/mL = 1333.22 dyn·s/cm⁵
type Entry = [path: string, label: string, unit: string, digits?: number, scale?: number];
const CURATED: Entry[] = [
  // monitor output
  ['mon.hr', 'HR', 'bpm', 0], ['mon.abpSys', 'ABP sys', 'mmHg', 0], ['mon.abpDia', 'ABP dia', 'mmHg', 0], ['mon.abpMean', 'ABP mean', 'mmHg', 0],
  ['mon.spo2', 'SpO₂', '%', 0], ['mon.etco2', 'EtCO₂', 'mmHg', 0], ['mon.rr', 'RR', '/min', 0], ['mon.cvpMean', 'CVP', 'mmHg', 0],
  ['mon.papSys', 'PAP sys', 'mmHg', 0], ['mon.papDia', 'PAP dia', 'mmHg', 0], ['mon.papMean', 'PAP mean', 'mmHg', 0],
  ['mon.tempCore', 'Temp core', '°C', 1], ['mon.pr', 'PR', 'bpm', 0], ['mon.pi', 'PI', '%', 1],
  ['mon.nibpSys', 'NIBP sys', 'mmHg', 0], ['mon.nibpDia', 'NIBP dia', 'mmHg', 0], ['mon.nibpMean', 'NIBP mean', 'mmHg', 0], ['mon.qtc', 'QTc', 'ms', 0],
  // circulation summary (7a `circ` event, 1 Hz)
  ['ev.circ.co', 'CO', 'L/min', 2], ['ev.circ.sv', 'SV', 'mL', 0], ['ev.circ.ef', 'EF', '%', 0, 100],
  ['ev.circ.svr', 'SVR', 'dyn·s/cm⁵', 0, DYN], ['ev.circ.pvr', 'PVR', 'dyn·s/cm⁵', 0, DYN],
  ['ev.circ.lvedv', 'LVEDV', 'mL', 0], ['ev.circ.lvesv', 'LVESV', 'mL', 0], ['ev.circ.lvedp', 'LVEDP', 'mmHg', 1], ['ev.circ.lvsp', 'LV systolic', 'mmHg', 0],
  ['ev.circ.svRv', 'SV (RV)', 'mL', 0], ['ev.circ.pmsf', 'Pmsf', 'mmHg', 1], ['ev.circ.cpp', 'Coronary perfusion pressure', 'mmHg', 0],
  ['ev.circ.supplyDemand', 'Coronary supply/demand', '', 2], ['ev.circ.kIsch', 'Ischaemia factor', '', 2],
  ['hemo.circ.p.rSys', 'R systemic (model)', 'mmHg·s/mL', 3], ['hemo.circ.p.eesLv', 'Ees LV', 'mmHg/mL', 2], ['hemo.circ.p.eesRv', 'Ees RV', 'mmHg/mL', 3],
  ['hemo.circ.hrModel', 'HR (model)', 'bpm', 0],
  // ECG inputs: the potassium the ECG morphology reads (stages push their changes into it as deltas, R51 §6)
  ['mods.k', 'K⁺ (ECG input)', 'mmol/L', 2],
  // lungs and gas
  ['resp.o2.pao2', 'PaO₂', 'mmHg', 0], ['resp.o2.sa', 'SaO₂', '%', 1, 100], ['resp.o2.fa', 'FAO₂', '%', 1, 100], ['resp.co2.pf', 'PaCO₂ (pf)', 'mmHg', 1],
  ['resp.shunt', 'Shunt', '%', 1, 100], ['ev.lungState.complianceMlPerCmH2O', 'Compliance', 'mL/cmH₂O', 0],
  ['ev.lungState.resistanceCmH2OPerLps', 'Resistance', 'cmH₂O/L/s', 1], ['ev.lungState.shunt', 'Shunt (lung)', '%', 1, 100],
  ['ev.lungState.deadSpaceMl', 'Dead space', 'mL', 0], ['ev.lungState.frcMl', 'FRC', 'mL', 0], ['resp.etco2', 'EtCO₂ (model)', 'mmHg', 1],
  // temperature (Stage 3 thermal model)
  ['resp.temp.tc', 'Core temp (model)', '°C', 2],
  // controls
  ['ev.state.values.sbp', 'SBP (truth)', 'mmHg', 0], ['ev.state.values.dbp', 'DBP (truth)', 'mmHg', 0], ['ev.state.values.hr', 'HR (truth)', 'bpm', 0],
];
/**
 * Absolute change tolerances by field name (whole path; `.to`/`.from` of an L1 ramp count as the variable) [ENG]:
 * pH 0.02; temperature 0.2 °C; SpO2/SaO2/SvO2 one point; PaCO2/EtCO2 2 mmHg; K 0.2 mmol/L; lactate 0.3 mmol/L. `k`
 * is potassium only under `mods`, the L1 variable, `blood` and the lab events (elsewhere it is a step index or a
 * valve constant).
 */
const TOLERANCES: Array<[RegExp, number | 'sat']> = [
  [/(^|\.)(ph|pH)(Art|Ven|a|v)?(\.(to|from))?$|Ph$/, 0.02],
  [/(^|\.)(temp|tempC|tempCore|tempPeriph|tempBlood)(\.(to|from))?$|TempC$|^resp\.temp\.t[cp]$/, 0.2],
  [/(^|\.)(spo2|sao2|svo2|scvo2|sjvo2|so2|sa)(\.(to|from))?$/i, 'sat'],
  [/(^|\.)(paco2|pco2|pvco2|etco2|petco2)(\.(to|from))?$|^resp\.co2\.pf$/i, 2],
  [/^mods\.k$|^(l1\.coupled|ev\.state\.values)\.k$|^l1\.vars\.k\.(to|from)$|^(blood|ev\.labs|ev\.labResult)\..+\.k$|(^|\.)(kPlus|potassium|kMmolL)$/, 0.2],
  [/(^|\.)(lac|lactate|lactateMmolL)$/i, 0.3],
];
const tolOf = (path: string): number | 'sat' | undefined => TOLERANCES.find(([re]) => re.test(path))?.[1];

const BY_PATH = new Map<string, Meta>(
  CURATED.map(([p, label, unit, digits, scale], rank) => {
    const m: Meta = { label, unit, digits, scale: scale ?? 1, rank };
    const tol = tolOf(p);
    if (tol !== undefined) m.tol = tol;
    return [p, m];
  }),
);

/**
 * Unit from the field name's suffix (the engine's naming convention: vtMl, rateMlPerMin, flowLpm, prMs, …). Order
 * matters: the concentration suffixes (…PgMl, …NgMl, …UuMl) come before the bare …Ml, …MgPerKg before …Kg.
 */
const SUFFIX_UNITS: Array<[RegExp, string]> = [
  [/MlPerMin$|MlMin$/, 'mL/min'], [/MlPerCmH2O$/, 'mL/cmH₂O'], [/PgMl$/, 'pg/mL'], [/NgMl$/, 'ng/mL'], [/UuMl$/, 'µU/mL'],
  [/MgDl$/, 'mg/dL'], [/MlKgH$/, 'mL/kg/h'], [/NmolL$/, 'nmol/L'], [/TempC$|^tempC$/, '°C'], [/MgPerKg$/, 'mg/kg'],
  [/Ml$/, 'mL'], [/Lpm$/, 'L/min'], [/MmHg$|Mmhg$/, 'mmHg'],
  [/CmH2O$/, 'cmH₂O'], [/Ms$/, 'ms'], [/Kg$/, 'kg'], [/Bpm$|Ppm$/, '/min'], [/Pct$/, '%'], [/MmolL$/, 'mmol/L'], [/Hz$/, 'Hz'],
  [/Deg$/, '°'], [/Ma$/, 'mA'], [/J$/, 'J'], [/Y$/, 'y'], [/^(sbp|dbp|map|cvp|pcwp|pawp|papSys|papDia|lvedp|lvsp|mapSet|cpp)$/, 'mmHg'],
];

const cache = new Map<string, Meta>();
export function metaOf(path: string): Meta {
  const hit = BY_PATH.get(path) ?? cache.get(path);
  if (hit) return hit;
  const last = path.slice(path.lastIndexOf('.') + 1);
  const unit = SUFFIX_UNITS.find(([re]) => re.test(last))?.[1] ?? '';
  const m: Meta = { label: last, unit, scale: 1, rank: Number.POSITIVE_INFINITY };
  const tol = tolOf(path);
  if (tol !== undefined) m.tol = tol;
  cache.set(path, m);
  return m;
}

/**
 * The unit a sibling leaf declares for an uncurated number without a suffix unit: `<name>Unit` (7g's panel
 * `rate`/`rateUnit`), `amountUnit` for `…Amount`, else the object's `unit` (7g's bus agents: `plasma`, `brain`, `nmj`
 * in the drug's concentration unit). A unit in the field name wins over a sibling (`cumulativeMgPerKg` stays mg/kg).
 */
export function siblingUnit(path: string, get: (p: string) => unknown): string | undefined {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return undefined;
  const parent = path.slice(0, dot);
  const last = path.slice(dot + 1);
  if (/[uU]nit$/.test(last)) return undefined;
  for (const p of [`${path}Unit`, /Amount$/.test(last) ? `${parent}.amountUnit` : '', `${parent}.unit`]) {
    const u = p ? get(p) : undefined;
    if (typeof u === 'string' && u !== '') return u;
  }
  return undefined;
}
```

`apps/demo/src/physiology-console/format.ts`:

```ts
// Stage 7x: value, delta and change formatting (monospace table cells).
import type { Leaf } from './flatten.ts';
import type { Meta } from './meta.ts';

/** Decimals by magnitude when the metadata has none: 3 significant figures, at most 3 decimals. */
export function autoDigits(v: number): number {
  const a = Math.abs(v);
  if (a >= 100 || a === 0) return 0;
  if (a >= 10) return 1;
  if (a >= 1) return 2;
  return 3;
}

export function fmtValue(v: Leaf | undefined, m: Pick<Meta, 'digits' | 'scale'>): string {
  if (v === undefined) return '';
  if (v === null) return '—';
  if (typeof v !== 'number') return String(v);
  const x = v * m.scale;
  return x.toFixed(m.digits ?? autoDigits(x));
}

/**
 * Decimals for comparing `a` with `b`: from the larger magnitude, so a value that starts at 0 (a drug's Ce, a bus
 * fraction) is compared at the precision it is displayed with, not at autoDigits(0) = 0 decimals.
 */
const pairDigits = (a: number, b: number, m: Pick<Meta, 'digits' | 'scale'>): number =>
  m.digits ?? autoDigits(Math.max(Math.abs(a), Math.abs(b)) * m.scale);

const MINUS = '−';
/** Signed delta with the value's decimals (Unicode minus); '0' when it rounds to zero. `ref` is the baseline. */
export function fmtDelta(d: number | null, m: Pick<Meta, 'digits' | 'scale'>, ref: number): string {
  if (d === null) return '';
  const x = d * m.scale;
  const s = x.toFixed(pairDigits(ref, ref + d, m));
  if (Number(s) === 0) return '0';
  return x > 0 ? `+${s}` : `${MINUS}${s.slice(1)}`;
}

export type Dir = 'up' | 'down' | 'diff' | null;
/** Relative change that counts as a change [ENG]: HR 70 → 71 (1.4 %) is jitter, phenylephrine's SVR +30–40 % is not. */
export const CHANGE_REL = 0.02;
/**
 * Change against the baseline, for highlighting: numbers must move by ≥ the tolerance — the path's absolute one
 * (`Meta.tol`: pH 0.02, temperature 0.2 °C, saturation one point, PaCO2/EtCO2 2 mmHg, K 0.2, lactate 0.3) or else 2 %
 * of the baseline (beat-to-beat jitter stays quiet) — AND by at least one displayed digit; anything else (strings,
 * booleans, null) highlights when different.
 */
export function changeDir(cur: Leaf | undefined, base: Leaf | undefined, m: Pick<Meta, 'digits' | 'scale' | 'tol'>): Dir {
  if (cur === undefined || base === undefined) return null;
  if (typeof cur === 'number' && typeof base === 'number') {
    if (!Number.isFinite(cur) || !Number.isFinite(base)) return cur === base ? null : 'diff';
    const d = cur - base;
    const step = 10 ** -pairDigits(base, cur, m) / m.scale;
    const tol = m.tol === 'sat' ? (Math.abs(base) > 1.5 ? 1 : 0.01) : (m.tol ?? CHANGE_REL * Math.abs(base));
    if (Math.abs(d) < Math.max(tol, step)) return null;
    return d > 0 ? 'up' : 'down';
  }
  return cur === base ? null : 'diff';
}
```

- [x] **Step 4: Run it and see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/format.test.ts`
Expected: PASS, 45 tests.

- [x] **Step 5: Commit and push**

```bash
git add apps/demo/src/physiology-console/meta.ts apps/demo/src/physiology-console/format.ts apps/demo/src/physiology-console/format.test.ts
git commit -m "feat(console): units, precision and change highlighting (curated map + field-name defaults)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 4: Sparklines

**Files:**
- Create: `apps/demo/src/physiology-console/sparkline.ts`
- Test: `apps/demo/src/physiology-console/sparkline.test.ts`

**Interfaces:**
- Produces: `SPARK_N = 60`; `pushHist(h: number[], v: number, n?: number): void`; `sparkRange(values, base?):
  [number, number] | null`; `sparkY(v, h, range): number`; `sparkPoints(values, w, h, range?, n?):
  Array<[number, number]>`; `drawSpark(g: CanvasRenderingContext2D | null, values, w, h, color, base?): void`.

- [x] **Step 1: Write the failing test** — `apps/demo/src/physiology-console/sparkline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { drawSpark, pushHist, SPARK_N, sparkPoints, sparkRange, sparkY } from './sparkline.ts';

describe('sparkline', () => {
  it('keeps the last 60 samples', () => {
    const h: number[] = [];
    for (let i = 0; i < 75; i++) pushHist(h, i);
    expect(h).toHaveLength(SPARK_N);
    expect(h[0]).toBe(15);
    expect(h.at(-1)).toBe(74);
  });
  it('range covers the samples and the baseline, skipping non-finite values', () => {
    expect(sparkRange([2, Number.NaN, 5], 1)).toEqual([1, 5]);
    expect(sparkRange([Number.NaN])).toBeNull();
  });
  it('newest sample at the right edge, min at the bottom, max at the top, flat line mid-height', () => {
    const pts = sparkPoints([0, 10], 64, 14);
    expect(pts[1]).toEqual([63, 1]);
    expect(pts[0]?.[1]).toBe(13);
    expect(pts[0]?.[0]).toBeCloseTo(63 - 62 / 59);
    expect(sparkPoints([3, 3, 3], 64, 14).map((p) => p[1])).toEqual([7, 7, 7]);
    expect(sparkY(5, 14, [0, 10])).toBe(7);
  });
  it('drawing without a 2D context is a no-op', () => {
    expect(() => drawSpark(null, [1, 2], 64, 14, '#fff', 1)).not.toThrow();
  });
});
```

- [x] **Step 2: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/sparkline.test.ts`
Expected: FAIL — `./sparkline.ts` does not exist.

- [x] **Step 3: Implement** — `apps/demo/src/physiology-console/sparkline.ts`:

```ts
// Stage 7x: 60 s sparklines — a bounded history per numeric path (one sample per truth event, 1 Hz) and a tiny canvas
// plot, newest sample at the right edge, auto-scaled to the window's min–max and the baseline (drawn as a faint line).
export const SPARK_N = 60;

export function pushHist(h: number[], v: number, n = SPARK_N): void {
  h.push(v);
  if (h.length > n) h.splice(0, h.length - n);
}

/** [lo, hi] over the finite samples and the baseline; null when there is nothing finite. */
export function sparkRange(values: readonly number[], base?: number): [number, number] | null {
  const fin = values.filter(Number.isFinite);
  if (base !== undefined && Number.isFinite(base)) fin.push(base);
  return fin.length ? [Math.min(...fin), Math.max(...fin)] : null;
}

/** y of `v` in an h-tall box (1 px inset); a flat range sits mid-height. */
export function sparkY(v: number, h: number, [lo, hi]: [number, number]): number {
  return hi === lo ? h / 2 : h - 1 - ((v - lo) / (hi - lo)) * (h - 2);
}

/** Canvas points for `values` in a w×h box, the newest at the right edge; non-finite samples are skipped. */
export function sparkPoints(values: readonly number[], w: number, h: number, range = sparkRange(values), n = SPARK_N): Array<[number, number]> {
  if (!range) return [];
  const dx = (w - 2) / (n - 1);
  const x0 = w - 1 - (values.length - 1) * dx;
  const pts: Array<[number, number]> = [];
  values.forEach((v, i) => {
    if (Number.isFinite(v)) pts.push([x0 + i * dx, sparkY(v, h, range)]);
  });
  return pts;
}

export function drawSpark(g: CanvasRenderingContext2D | null, values: readonly number[], w: number, h: number, color: string, base?: number): void {
  if (!g) return; // no 2D context (happy-dom, or a lost context): the numbers still render
  g.clearRect(0, 0, w, h);
  const range = sparkRange(values, base);
  if (!range) return;
  if (base !== undefined && Number.isFinite(base)) {
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fillRect(0, Math.round(sparkY(base, h, range)), w, 1);
  }
  const pts = sparkPoints(values, w, h, range);
  if (pts.length < 2) return;
  g.strokeStyle = color;
  g.lineWidth = 1;
  g.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.stroke();
}
```

- [x] **Step 4: Run it and see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/sparkline.test.ts`
Expected: PASS, 4 tests.

- [x] **Step 5: Commit and push**

```bash
git add apps/demo/src/physiology-console/sparkline.ts apps/demo/src/physiology-console/sparkline.test.ts
git commit -m "feat(console): 60 s sparkline history and canvas plot" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 5: The console model (current, baseline, delta, history, export)

**Files:**
- Create: `apps/demo/src/physiology-console/model.ts`
- Test: `apps/demo/src/physiology-console/model.test.ts`

**Interfaces:**
- Consumes: `flatten`, `foldEvent`, `Leaf`, `Leaves` (Task 2); `groupOf`, `isInternal`, `isPhase`, `GROUPS`,
  `GroupId` (Task 2); `metaOf`, `siblingUnit`, `Meta` (Task 3); `changeDir`, `fmtDelta`, `fmtValue`, `Dir` (Task 3);
  `pushHist` (Task 4).
- Produces: `interface Row { path; group: GroupId; meta: Meta; value: Leaf; base: Leaf | undefined; delta: number |
  null; dir: Dir; internal: boolean; phase: boolean; hist: readonly number[] }`; `interface ConsoleExport` (`schema:
  'pme-console/1'`, `t`, `baselineT`, `values[path] = { group, label, unit, scale, value, baseline, delta }`);
  `class ConsoleModel { cur: Leaves; base: Leaves | null; baseT: number | null; t: number; truth: { leaves; dropped;
  truncated; bytes }; ingest(e: EngineEvent): boolean; setBaseline(): void; clearHistory(): void; clear(): void;
  row(path): Row; rows(): Row[]; toJSON(): ConsoleExport; toCSV(): string }`.

- [x] **Step 1: Write the failing test** (includes the fake 7b–7g tree: fields of unmerged stages land in their organ
  groups, an unknown `ecmo.*` in "other") — `apps/demo/src/physiology-console/model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { EngineEvent, TruthTree } from '@pme/engine-core';
import { ConsoleModel } from './model.ts';

const truth = (t: number, tree: TruthTree): EngineEvent => ({ type: 'truth', t, tree, leaves: 0, dropped: 0, truncated: false });
const circ = (t: number, svr: number) => ({ type: 'circ', t, co: 5, sv: 70, svRv: 70, ef: 0.6, lvedv: 120, lvesv: 50, lvedp: 8, lvsp: 120, pmsf: 9, pvr: 0.1, svr, cpp: 80, supplyDemand: 4, kIsch: 1 }) as EngineEvent;

describe('ConsoleModel', () => {
  it('a truth event is the refresh point; other events fold in between', () => {
    const m = new ConsoleModel();
    expect(m.ingest(circ(1, 0.9))).toBe(false);
    expect(m.ingest(truth(1, { hemo: { circ: { p: { rSys: 0.9 } } } }))).toBe(true);
    expect(m.cur.get('ev.circ.svr')).toBe(0.9);
    expect(m.cur.get('hemo.circ.p.rSys')).toBe(0.9);
    expect(m.t).toBe(1);
    expect(m.truth.bytes).toBe(JSON.stringify({ hemo: { circ: { p: { rSys: 0.9 } } } }).length);
  });
  it('fields of stages not merged yet appear in their organ groups, unknown ones in other (fake 7b–7g tree)', () => {
    const m = new ConsoleModel();
    m.ingest(truth(1, {
      hemo: { circ: { p: { rSys: 0.9 } } },
      resp: { lung: { mech: { cL: 25, cR: 25 } } },
      blood: { core: { ab: { ph: 7.4 }, out: { k: 4.1, lactate: 1 } } },
      organs: { brain: { icp: 10 }, renal: { gfr: 110, uopMlMin: 1 }, kidney: { gfrRel: 1 }, liver: { lactate: 1 }, sensors: { icp: 'on' }, iap: 5 },
      endo: { core: { glucose: { g: 5.5 } } },
      neuro: { antinoc: 0.2 },
      pk: { bus: { cns: { propCe: 2.5 }, agents: { propofol: { unit: 'µg/mL', plasma: 3.1, brain: 2.5, cumulativeMgPerKg: 2 } } }, drugs: { propofol: { x: [1, 2, 3], rate: 0 } } },
      ecmo: { flowLpm: 4 },
    }));
    const groups = Object.fromEntries(m.rows().map((r) => [r.path, r.group]));
    expect(groups).toMatchObject({
      'resp.lung.mech.cL': 'lungs', 'blood.core.ab.ph': 'blood', 'blood.core.out.k': 'blood', 'organs.brain.icp': 'brain',
      'organs.renal.gfr': 'kidney', 'organs.liver.lactate': 'liver', 'endo.core.glucose.g': 'endocrine', 'neuro.antinoc': 'neuro',
      'pk.bus.cns.propCe': 'drugs', 'ecmo.flowLpm': 'other', 'organs.iap': 'other',
      'organs.kidney.gfrRel': 'kidney', 'organs.sensors.icp': 'brain', 'pk.bus.agents.propofol.brain': 'drugs',
    });
    expect(m.row('organs.renal.uopMlMin').meta.unit).toBe('mL/min');
    // 7g's bus agents carry their concentration unit as a sibling leaf; the name's own unit wins
    expect(m.row('pk.bus.agents.propofol.brain').meta.unit).toBe('µg/mL');
    expect(m.row('pk.bus.agents.propofol.cumulativeMgPerKg').meta.unit).toBe('mg/kg');
    expect([m.row('pk.drugs.propofol.x.0').internal, m.row('pk.drugs.propofol.rate').internal]).toEqual([true, false]);
  });
  it('within-beat values (circOut) never highlight, however far they move', () => {
    const m = new ConsoleModel();
    m.ingest(truth(1, { hemo: { circOut: { pLv: 5 }, circ: { p: { rSys: 0.9 } } } }));
    m.setBaseline();
    m.ingest(truth(2, { hemo: { circOut: { pLv: 120 }, circ: { p: { rSys: 1.3 } } } }));
    expect([m.row('hemo.circOut.pLv').dir, m.row('hemo.circOut.pLv').phase, m.row('hemo.circ.p.rSys').dir]).toEqual([null, true, 'up']);
  });
  it('rows sort by organ group, curated rows first, then by path', () => {
    const m = new ConsoleModel();
    m.ingest(circ(1, 0.9));
    m.ingest({ type: 'measurement', t: 1, values: { hr: { value: 70, flag: 'valid', at: 1 } } });
    m.ingest(truth(1, { hemo: { circ: { zeta: 1, p: { rSys: 0.9 } } }, zz: { a: 1 } }));
    const paths = m.rows().map((r) => r.path);
    expect(paths[0]).toBe('mon.hr');
    expect(paths.indexOf('ev.circ.co')).toBeLessThan(paths.indexOf('ev.circ.svr'));
    expect(paths.indexOf('hemo.circ.p.rSys')).toBeLessThan(paths.indexOf('hemo.circ.zeta'));
    expect(paths.at(-1)).toBe('zz.a');
  });
  it('baseline, delta, direction and a 60 s history', () => {
    const m = new ConsoleModel();
    for (let t = 1; t <= 70; t++) {
      m.ingest(circ(t, t <= 20 ? 0.9 : 1.3));
      m.ingest(truth(t, {}));
      if (t === 20) m.setBaseline();
    }
    const r = m.row('ev.circ.svr');
    expect(r.base).toBe(0.9);
    expect(r.delta).toBeCloseTo(0.4);
    expect(r.dir).toBe('up');
    expect(r.hist).toHaveLength(60);
    expect(m.baseT).toBe(20);
    m.clearHistory();
    expect(m.row('ev.circ.svr').hist).toHaveLength(0);
  });
  it('a truth path that disappears is removed; clear() forgets everything', () => {
    const m = new ConsoleModel();
    m.ingest(truth(1, { hemo: { lvad: { rpm: 5400 } } }));
    m.ingest(truth(2, { hemo: {} }));
    expect(m.cur.has('hemo.lvad.rpm')).toBe(false);
    m.setBaseline();
    m.clear();
    expect([m.cur.size, m.base, m.baseT, m.t]).toEqual([0, null, null, 0]);
  });
  it('exports JSON (raw values) and CSV (displayed values)', () => {
    const m = new ConsoleModel();
    m.ingest(circ(1, 0.9));
    m.ingest(truth(1, { resp: { site: 'a,b' } }));
    m.setBaseline();
    m.ingest(circ(2, 1.2));
    m.ingest(truth(2, { resp: { site: 'a,b' } }));
    const j = m.toJSON();
    expect(j.schema).toBe('pme-console/1');
    expect(j.values['ev.circ.svr']).toMatchObject({ group: 'circulation', label: 'SVR', unit: 'dyn·s/cm⁵', scale: 1333.22, value: 1.2, baseline: 0.9 });
    const csv = m.toCSV().split('\n');
    expect(csv[0]).toBe('group,path,label,value,unit,baseline,delta');
    expect(csv).toContain('circulation,ev.circ.svr,SVR,1600,dyn·s/cm⁵,1200,+400');
    expect(csv).toContain('lungs,resp.site,site,"a,b",,"a,b",');
  });
});
```

- [x] **Step 2: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/model.test.ts`
Expected: FAIL — `./model.ts` does not exist.

- [x] **Step 3: Implement** — `apps/demo/src/physiology-console/model.ts`:

```ts
// Stage 7x: the console's data model — current leaves (truth tree + folded events + monitor numerics), the baseline,
// 60 s histories, rows grouped by organ, and the JSON/CSV export. No DOM.
import type { EngineEvent } from '@pme/engine-core';
import { flatten, foldEvent, type Leaf, type Leaves } from './flatten.ts';
import { changeDir, fmtDelta, fmtValue, type Dir } from './format.ts';
import { metaOf, siblingUnit, type Meta } from './meta.ts';
import { GROUPS, groupOf, isInternal, isPhase, type GroupId } from './organs.ts';
import { pushHist } from './sparkline.ts';

export interface Row {
  path: string;
  group: GroupId;
  meta: Meta;
  value: Leaf;
  base: Leaf | undefined;
  /** current − baseline, raw units (numbers only). */
  delta: number | null;
  dir: Dir;
  internal: boolean;
  /** A within-beat/within-breath value (organs.ts `isPhase`): shown, never highlighted. */
  phase: boolean;
  hist: readonly number[];
}

export interface ConsoleExport {
  schema: 'pme-console/1';
  t: number;
  baselineT: number | null;
  /** Raw engine values; `unit` is the display unit and display = raw × scale. */
  values: Record<string, { group: GroupId; label: string; unit: string; scale: number; value: Leaf; baseline: Leaf | null; delta: number | null }>;
}

const GROUP_ORDER = new Map(GROUPS.map((g, i) => [g.id as GroupId, i]));
const EMPTY: readonly number[] = [];

export class ConsoleModel {
  readonly cur: Leaves = new Map();
  base: Leaves | null = null;
  baseT: number | null = null;
  /** Sim time of the latest truth event. */
  t = 0;
  /** The latest truth event's counts and its JSON size (the structured clone that crossed the worker is similar). */
  truth = { leaves: 0, dropped: 0, truncated: false, bytes: 0 };
  private truthKeys = new Set<string>();
  private readonly hist = new Map<string, number[]>();

  /** Fold an engine event in. Returns true for a truth event: the once-per-second refresh point. */
  ingest(e: EngineEvent): boolean {
    if (e.type !== 'truth') {
      foldEvent(e, this.cur);
      return false;
    }
    const next: Leaves = new Map();
    flatten(e.tree, '', next);
    for (const k of this.truthKeys) if (!next.has(k)) this.cur.delete(k); // a device switched off, a drug cleared
    this.truthKeys = new Set(next.keys());
    for (const [k, v] of next) this.cur.set(k, v);
    this.t = e.t;
    this.truth = { leaves: e.leaves, dropped: e.dropped, truncated: e.truncated, bytes: JSON.stringify(e.tree).length };
    for (const [k, v] of this.cur) {
      if (typeof v !== 'number') continue;
      let h = this.hist.get(k);
      if (!h) this.hist.set(k, (h = []));
      pushHist(h, v);
    }
    return true;
  }

  setBaseline(): void {
    this.base = new Map(this.cur);
    this.baseT = this.t;
  }

  /** After a reset to baseline (time goes back) the histories restart. */
  clearHistory(): void {
    this.hist.clear();
  }

  /** After a patient restart: forget everything. */
  clear(): void {
    this.cur.clear();
    this.truthKeys.clear();
    this.hist.clear();
    this.base = null;
    this.baseT = null;
    this.t = 0;
  }

  row(path: string): Row {
    const value = this.cur.get(path) ?? null;
    const base = this.base?.get(path);
    let meta = metaOf(path);
    if (meta.unit === '' && meta.rank === Number.POSITIVE_INFINITY && typeof value === 'number') {
      const unit = siblingUnit(path, (p) => this.cur.get(p));
      if (unit) meta = { ...meta, unit };
    }
    const delta = typeof value === 'number' && typeof base === 'number' ? value - base : null;
    const phase = isPhase(path);
    return { path, group: groupOf(path), meta, value, base, delta, dir: phase ? null : changeDir(value, base, meta), internal: isInternal(path), phase, hist: this.hist.get(path) ?? EMPTY };
  }

  /** Every current path as a row: by organ group, curated rows first, then by path. */
  rows(): Row[] {
    return [...this.cur.keys()]
      .map((p) => this.row(p))
      .sort((a, b) => (GROUP_ORDER.get(a.group) as number) - (GROUP_ORDER.get(b.group) as number) || a.meta.rank - b.meta.rank || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  }

  toJSON(): ConsoleExport {
    const values: ConsoleExport['values'] = {};
    for (const r of this.rows()) {
      values[r.path] = { group: r.group, label: r.meta.label, unit: r.meta.unit, scale: r.meta.scale, value: r.value, baseline: r.base ?? null, delta: r.delta };
    }
    return { schema: 'pme-console/1', t: this.t, baselineT: this.baseT, values };
  }

  /** Displayed values (scaled, rounded) for spreadsheets and calibration notes. */
  toCSV(): string {
    const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const lines = ['group,path,label,value,unit,baseline,delta'];
    for (const r of this.rows()) {
      const ref = typeof r.base === 'number' ? r.base : typeof r.value === 'number' ? r.value : 0;
      lines.push([r.group, r.path, r.meta.label, fmtValue(r.value, r.meta), r.meta.unit, fmtValue(r.base, r.meta), fmtDelta(r.delta, r.meta, ref)].map(q).join(','));
    }
    return `${lines.join('\n')}\n`;
  }
}
```

- [x] **Step 4: Run it and see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/model.test.ts`
Expected: PASS, 7 tests.

- [x] **Step 5: Commit and push**

```bash
git add apps/demo/src/physiology-console/model.ts apps/demo/src/physiology-console/model.test.ts
git commit -m "feat(console): model — truth + events as rows by organ, baseline/delta/history, JSON and CSV export" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 6: The actions rail's command builders

**Files:**
- Create: `apps/demo/src/physiology-console/actions.ts`
- Test: `apps/demo/src/physiology-console/actions.test.ts`

**Interfaces:**
- Consumes: `PatientProfile` (engine-core types); `createEngine` in the test only.
- Produces: `type Body = { type: string } & Record<string, unknown>`; `PRESETS: ReadonlyArray<{ id; label; profile:
  PatientProfile }>` (ids `adult, elderly, ascad, hfref, child, bb`); `DRUG_IDS`, `DOSE_UNITS`, `RATE_UNITS`,
  `AGENTS`, `TCI_MODELS`, `FLUID_IDS`, `CONDITION_IDS`, `LUNG_CONDITION_IDS`; builders `bolus(drugId, dose, unit)`,
  `infusion(drugId, rate, unit)`, `tci(drugId, target, mode: 'plasma' | 'effect', model = '')`, `vaporiser(agent,
  dialPct, fgfLpm, n2oFrac = 0)`, `fluid(kind: string, volumeMl, overS)`, `bleed(volumeMl, overS)`, `condition(id,
  severity)`, `lungCondition(id, severity, side: '' | 'L' | 'R' = '')`, `mainstem('both' | 'left' | 'right')`,
  `recruit(pressureCmH2O, durationS)`, `lab('abg' | 'vbg')`, `ventilation(source, rr, vtMl, peep, fio2)`,
  `rhythm(id)`, `setMode(mode)` → `Body`; `describe(b: Body): string` (one change-log line).

- [x] **Step 1: Write the failing test** — `apps/demo/src/physiology-console/actions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '@pme/engine-core';
import * as A from './actions.ts';

describe('rail command builders', () => {
  it('build the brief §7.2 / 7a / 7g shapes', () => {
    expect(A.bolus('phenylephrine', 100, 'mcg')).toEqual({ type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' } });
    expect(A.infusion('norepinephrine', 0.1, 'mcg/kg/min')).toEqual({ type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' } });
    expect(A.vaporiser('sevoflurane', 2, 2)).toEqual({ type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 } });
    expect(A.vaporiser('sevoflurane', 1, 2, 0.5)).toMatchObject({ event: { n2oFrac: 0.5 } });
    expect(A.tci('propofol', 3, 'effect', 'eleveld')).toEqual({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', model: 'eleveld', mode: 'effect', target: 3 } });
    expect(A.tci('remifentanil', 4, 'effect')).toEqual({ type: 'applyEvent', event: { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 4 } });
    expect(A.lungCondition('ptxSimple', 0.6, 'L')).toEqual({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxSimple', severity: 0.6, side: 'L' } });
    expect(A.lungCondition('ards', 0.5)).toEqual({ type: 'applyEvent', event: { kind: 'lungCondition', id: 'ards', severity: 0.5 } });
    expect(A.mainstem('right')).toEqual({ type: 'applyEvent', event: { kind: 'mainstem', ventilated: 'right' } });
    expect(A.recruit(40, 30)).toEqual({ type: 'applyEvent', event: { kind: 'recruit', pressureCmH2O: 40, durationS: 30 } });
    expect(A.fluid('rl', 500, 600)).toEqual({ type: 'applyEvent', event: { kind: 'fluid', fluid: 'rl', volumeMl: 500, overS: 600 } });
    expect(A.lab('abg')).toEqual({ type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } });
    expect(A.ventilation('spontaneous', 12, 500, 5, 0.5)).toEqual({ type: 'applyEvent', event: { kind: 'ventilation', source: 'spontaneous' } });
    expect(A.rhythm('afib')).toEqual({ type: 'setRhythm', rhythm: 'afib' });
    expect(A.setMode('manual')).toEqual({ type: 'setMode', mode: 'manual' });
  });
  it('describe() gives one log line', () => {
    expect(A.describe(A.bolus('phenylephrine', 100, 'mcg'))).toBe('phenylephrine 100 mcg iv');
    expect(A.describe(A.ventilation('ventilator', 12, 500, 5, 0.5))).toBe('ventilator RR 12 VT 500 PEEP 5 FiO₂ 0.5');
    expect(A.describe(A.setMode('modeled'))).toBe('mode MODELED');
    expect(A.describe(A.vaporiser('sevoflurane', 1, 2, 0.5))).toBe('sevoflurane 1 % @ 2 L/min + N₂O 0.5');
    expect(A.describe(A.lungCondition('ptxSimple', 0.6, 'L'))).toBe('lung ptxSimple severity 0.6 L');
    expect(A.describe(A.tci('propofol', 3, 'effect', 'eleveld'))).toBe('propofol TCI effect target 3 (eleveld)');
    expect(A.describe(A.lab('abg'))).toBe('send ABG');
    expect(A.describe({ type: 'pin', variable: 'hr' })).toBe('{"type":"pin","variable":"hr"}');
  });
  it('the engine accepts what 7a implements and names the reason for what it does not know', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: A.PRESETS[0]?.profile });
    let n = 0;
    const send = (b: A.Body) => e.dispatch({ ...b, id: `t${++n}`, issuedBy: 'test' } as unknown as Command);
    for (const b of [
      A.bolus('phenylephrine', 100, 'mcg'), A.fluid('crystalloid', 500, 300), A.bleed(500, 60), A.condition('tamponade', 0.5),
      A.ventilation('ventilator', 12, 500, 5, 0.5), A.ventilation('spontaneous', 0, 0, 0, 0), A.rhythm('afib'), A.setMode('manual'),
    ]) expect(send(b), A.describe(b)).toMatchObject({ accepted: true });
    // an id no stage knows is rejected with a reason (7g's infusion/tci/vaporiser, 7b's lungCondition/mainstem/recruit
    // and 7c's lab and fluid ids are accepted or rejected depending on whether that stage has merged: not asserted)
    const r = send(A.bolus('notADrug', 1, 'mg'));
    expect(r.accepted).toBe(false);
    expect(r.reason).toBeTruthy();
  });
  it('every preset starts an engine with the invasive lines connected', () => {
    for (const p of A.PRESETS) {
      expect(() => createEngine({ seed: 1, mode: 'modeled', patient: p.profile }), p.id).not.toThrow();
      expect(p.profile.sensors).toMatchObject({ abp: 'connected' });
    }
  });
});
```

- [x] **Step 2: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/actions.test.ts`
Expected: FAIL — `./actions.ts` does not exist.

- [x] **Step 3: Implement** — `apps/demo/src/physiology-console/actions.ts`:

```ts
// Stage 7x: the actions rail's command builders — the same Command bodies the instructor panel and the scenario
// runner send (brief §7.2 plus the 7a/7b/7c/7g shapes, taken from origin/stage-7b-lungs `types-lung.ts`,
// origin/stage-7g-pkpd `types-pk.ts` and the 7c plan). Kinds and ids the engine does not know yet (a 7g infusion
// before 7g merges) are still sent: the engine's rejection reason lands in the change log, so the rail needs no edit
// when a stage lands.
import type { PatientProfile } from '@pme/engine-core';

/** A Command without id/issuedBy/atTick (the page stamps those). */
export type Body = { type: string } & Record<string, unknown>;

const SENSORS: PatientProfile['sensors'] = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', nibp: 'on' };
const p = (x: PatientProfile): PatientProfile => ({ ...x, sensors: SENSORS });
/** Stage 7a's demo profiles, with every invasive line connected so the monitor shows ABP/CVP/PAP. */
export const PRESETS: ReadonlyArray<{ id: string; label: string; profile: PatientProfile }> = [
  { id: 'adult', label: 'Adult 40 y 70 kg', profile: p({ ageY: 40, sex: 'M', weightKg: 70 }) },
  { id: 'elderly', label: '75 y hypertensive', profile: p({ ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }] }) },
  { id: 'ascad', label: '75 y AS + CAD + HTN', profile: p({ ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] }) },
  { id: 'hfref', label: 'HFrEF 60 y', profile: p({ ageY: 60, sex: 'M', weightKg: 80, conditions: [{ id: 'hfref' }] }) },
  { id: 'child', label: 'Child 6 y 20 kg', profile: p({ ageY: 6, sex: 'M', weightKg: 20 }) },
  { id: 'bb', label: 'β-blocked adult', profile: p({ ageY: 40, sex: 'M', weightKg: 70, conditions: [{ id: 'betaBlocked' }] }) },
];

/** Suggestions only (a datalist): any id can be typed. The first five are what 7a accepts; the rest arrive with 7g. */
export const DRUG_IDS = [
  'phenylephrine', 'ephedrine', 'nitroglycerin', 'esmolol', 'propofol', 'norepinephrine', 'epinephrine', 'vasopressin', 'atropine',
  'fentanyl', 'remifentanil', 'midazolam', 'ketamine', 'rocuronium', 'succinylcholine', 'sugammadex', 'neostigmine', 'labetalol',
];
export const DOSE_UNITS = ['mcg', 'mg', 'mcg/kg', 'mg/kg', 'units', 'mEq'] as const;
export const RATE_UNITS = ['mcg/kg/min', 'mcg/min', 'mg/h', 'mg/kg/h', 'units/min', 'mL/h'] as const;
/** 7g's vaporiser agents; N2O rides on the same event as `n2oFrac` (R51 §4, addendum 9). */
export const AGENTS = ['sevoflurane', 'isoflurane', 'desflurane'] as const;
/** 7g TCI models (a datalist: any name can be typed). */
export const TCI_MODELS = ['eleveld', 'schnider', 'marsh', 'minto'];
/** Fluid ids (a datalist): 7a's `crystalloid|colloid|blood` and 7c's `FLUIDS` ids. */
export const FLUID_IDS = ['crystalloid', 'colloid', 'blood', 'saline', 'rl', 'balanced', 'albumin5', 'gelatin', 'd5w', 'glycine'];
export const CONDITION_IDS = ['tamponade', 'pe', 'tensionPtx', 'rvInfarct', 'anaphylaxis', 'mh', 'last', 'burns', 'dka', 'sepsis'];
/** 7b's lung-condition catalogue ids (`LUNG_CONDITION_IDS`, types-lung.ts). */
export const LUNG_CONDITION_IDS = [
  'ph', 'bronchospasm', 'asthma', 'anaphylaxis', 'copd', 'ards', 'ild', 'ssc', 'chestWall', 'obesity', 'pneumonia',
  'atelectasis', 'pulmOedema', 'effusion', 'ptxSimple', 'ptxTension', 'haemothorax', 'pe', 'fatEmbolism', 'vae',
  'aspiration', 'olv', 'endobronchial', 'bpf', 'airwayObstruction', 'cf', 'nmWeakness', 'diaphragmParalysis',
  'pregnancy', 'neonatalRds', 'covidPneumonitis', 'smokeInhalation',
];

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const bolus = (drugId: string, dose: number, unit: string): Body => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' });
/** 7g's infusion event (rate 0 stops it). */
export const infusion = (drugId: string, rate: number, unit: string): Body => ev({ kind: 'infusion', drugId, rate, unit });
/** 7g's TCI (target 0 stops it; `model` only for drugs with a choice, e.g. propofol eleveld/schnider/marsh). */
export const tci = (drugId: string, target: number, mode: 'plasma' | 'effect', model = ''): Body =>
  ev(model ? { kind: 'tci', drugId, model, mode, target } : { kind: 'tci', drugId, mode, target });
/** 7g's single vaporiser event (R51 §4), N2O as a fraction of the fresh gas (addendum 9). */
export const vaporiser = (agent: string, dialPct: number, fgfLpm: number, n2oFrac = 0): Body => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac });
/** Any fluid id (7a: crystalloid/colloid/blood; 7c: saline, rl, balanced, albumin5, gelatin, d5w, glycine). */
export const fluid = (kind: string, volumeMl: number, overS: number): Body => ev({ kind: 'fluid', fluid: kind, volumeMl, overS });
export const bleed = (volumeMl: number, overS: number): Body => ev({ kind: 'bleed', volumeMl, overS });
export const condition = (id: string, severity: number): Body => ev({ kind: 'condition', id, severity });
/** 7b: a catalogue lung condition (severity 0 removes it), with a side for sided conditions ('' = none). */
export const lungCondition = (id: string, severity: number, side: '' | 'L' | 'R' = ''): Body =>
  ev(side ? { kind: 'lungCondition', id, severity, side } : { kind: 'lungCondition', id, severity });
/** 7b: which lung(s) the tube ventilates. */
export const mainstem = (ventilated: 'both' | 'left' | 'right'): Body => ev({ kind: 'mainstem', ventilated });
/** 7b: a recruitment manoeuvre. */
export const recruit = (pressureCmH2O: number, durationS: number): Body => ev({ kind: 'recruit', pressureCmH2O, durationS });
/** 7c: "send ABG" (or VBG): the panel is frozen now and a `labResult` event follows after the turnaround. */
export const lab = (panel: 'abg' | 'vbg'): Body => ev({ kind: 'lab', panel });
export const ventilation = (source: string, rr: number, vtMl: number, peep: number, fio2: number): Body =>
  ev(source === 'ventilator' || source === 'bvm' ? { kind: 'ventilation', source, rr, vtMl, peep, fio2 } : { kind: 'ventilation', source });
export const rhythm = (id: string): Body => ({ type: 'setRhythm', rhythm: id });
export const setMode = (mode: 'manual' | 'modeled'): Body => ({ type: 'setMode', mode });

/** One line for the change log. */
export function describe(b: Body): string {
  const e = b.event as Record<string, unknown> | undefined;
  if (b.type === 'applyEvent' && e) {
    switch (e.kind) {
      case 'drug':
        return `${e.drugId} ${e.dose} ${e.unit} ${e.route}`;
      case 'infusion':
        return `${e.drugId} infusion ${e.rate} ${e.unit}`;
      case 'tci':
        return `${e.drugId} TCI ${e.mode} target ${e.target}${e.model ? ` (${e.model})` : ''}`;
      case 'vaporiser':
        return `${e.agent} ${e.dialPct} % @ ${e.fgfLpm} L/min${e.n2oFrac ? ` + N₂O ${e.n2oFrac}` : ''}`;
      case 'lungCondition':
        return `lung ${e.id} severity ${e.severity}${e.side ? ` ${e.side}` : ''}`;
      case 'mainstem':
        return `mainstem: ventilate ${e.ventilated}`;
      case 'recruit':
        return `recruit ${e.pressureCmH2O} cmH₂O × ${e.durationS} s`;
      case 'lab':
        return `send ${String(e.panel).toUpperCase()}`;
      case 'fluid':
        return `${e.fluid} ${e.volumeMl} mL over ${e.overS} s`;
      case 'bleed':
        return `bleed ${e.volumeMl} mL over ${e.overS} s`;
      case 'condition':
        return `condition ${e.id} severity ${e.severity}`;
      case 'ventilation':
        return e.source === 'ventilator' || e.source === 'bvm' ? `${e.source} RR ${e.rr} VT ${e.vtMl} PEEP ${e.peep} FiO₂ ${e.fio2}` : `ventilation ${e.source}`;
      default:
        return `${String(e.kind)} ${JSON.stringify(e)}`;
    }
  }
  if (b.type === 'setRhythm') return `rhythm ${b.rhythm}`;
  if (b.type === 'setMode') return `mode ${String(b.mode).toUpperCase()}`;
  return JSON.stringify(b);
}
```

- [x] **Step 4: Run it and see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/actions.test.ts`
Expected: PASS, 4 tests. (The engine accepts phenylephrine, fluid, bleed, tamponade, ventilator and spontaneous
ventilation, AF and MANUAL on 7a's main; an unknown drug is rejected with a reason. 7g's `infusion`/`tci`/`vaporiser`,
7b's `lungCondition`/`mainstem`/`recruit` and 7c's `lab`/fluid ids are deliberately NOT asserted against the engine:
accepted or rejected depends on whether that stage has merged; their SHAPES are asserted against the published types
of `origin/stage-7b-lungs`, `origin/stage-7g-pkpd` and the 7c plan.)

- [x] **Step 5: Commit and push**

```bash
git add apps/demo/src/physiology-console/actions.ts apps/demo/src/physiology-console/actions.test.ts
git commit -m "feat(console): actions rail command builders (drugs incl. infusion/TCI/vaporiser+N2O, fluids, labs, conditions, lungs, vent, rhythm, mode, presets)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 7: The page controller (`mountConsole`) with a happy-dom test

**Files:**
- Create: `apps/demo/src/physiology-console/view.ts`
- Test: `apps/demo/src/physiology-console/view.dom.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–6; `RHYTHM_IDS`, `EngineEvent`, `PatientSnapshot` from engine-core.
- Produces: `interface ConsoleHost { dispatch(b: Body): Promise<{ accepted: boolean; reason?: string }>; on(fn):
  () => void; snapshot(): Promise<PatientSnapshot>; restore(s): Promise<void>; restart(presetId: string, mode:
  'manual' | 'modeled'): void; timeScale(k: number): void; pause(paused: boolean): void }`;
  `interface LogEntry { t; kind: 'cmd' | 'mark'; text; ok: boolean | null; reason? }`;
  `mountConsole(root: HTMLElement, host: ConsoleHost, o?: { autoBaselineS?: number }): ConsoleHandle` (auto-baseline
  default 60 s) with `ConsoleHandle { model; log; monitorEl; send(b); setBaseline(auto?); resetToBaseline();
  exportJSON(); exportCSV(); destroy() }`. DOM contract used by the tests and the e2e: `[data-id=t|speed|base|filter|
  changed|internals|stats|monitor|rail|log|organs]`, `[data-act=pause|setBase|reset|json|csv|copy|bolus|infusion|tci|
  vap|fluid|bleed|lab|cond|lcond|mainstem|recruit|vent|rhythm|mode|restart|raw]`, `[data-f=drug|dose|doseUnit|rate|
  rateUnit|tciTarget|tciMode|tciModel|agent|dial|fgf|n2o|fluid|vol|over|panel|cond|sev|lcond|lsev|side|mainstem|rmP|
  rmS|src|rr|vt|peep|fio2|rhythm|mode|preset|raw]`, sections `details.pc-sec[data-group=<GroupId>]` with `.pc-count`, rows
  `tr[data-path=<path>]` with cells `.lbl .par .v .u .b .d .s canvas` and class `up|down|diff|''`, log
  `.pc-log li[data-kind=cmd|mark]` with class `ok|rej|pending`, newest first.

- [x] **Step 1: Write the failing test** — `apps/demo/src/physiology-console/view.dom.test.ts`:

```ts
// @vitest-environment happy-dom
// The console page controller against a real engine on the main thread (no monitor, no canvas: happy-dom has no 2D
// context, so sparklines are skipped and the numbers still render). The engine is advanced by hand.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent, type MonitorEngine, type TruthTree } from '@pme/engine-core';
import { PRESETS } from './actions.ts';
import { mountConsole, type ConsoleHandle, type ConsoleHost } from './view.ts';

const flush = () => new Promise((r) => setTimeout(r, 0));
let ui: ConsoleHandle | null = null;
afterEach(() => {
  ui?.destroy();
  ui = null;
});

function rig() {
  let e: MonitorEngine = createEngine({ seed: 7, mode: 'modeled', patient: PRESETS[0]?.profile, truthHz: 1 });
  const fns = new Set<(x: EngineEvent) => void>();
  const wire = () => e.on((x) => fns.forEach((fn) => fn(x)));
  wire();
  let n = 0;
  const restarts: string[] = [];
  const host: ConsoleHost = {
    dispatch: async (b) => e.dispatch({ ...b, id: `c${++n}`, issuedBy: 'test' } as unknown as Command),
    on: (fn) => {
      fns.add(fn);
      return () => fns.delete(fn);
    },
    snapshot: async () => e.snapshot(),
    restore: async (s) => e.restore(s),
    restart: (id, mode) => {
      restarts.push(`${id}/${mode}`);
      e = createEngine({ seed: 7, mode, patient: PRESETS.find((p) => p.id === id)?.profile, truthHz: 1 });
      wire();
    },
    timeScale: () => undefined,
    pause: () => undefined,
  };
  ui = mountConsole(document.body, host, { autoBaselineS: 15 });
  const q = <T extends Element>(sel: string) => document.querySelector(sel) as T;
  const click = (act: string) => q<HTMLButtonElement>(`[data-act="${act}"]`).click();
  return { ui, q, click, restarts, advance: (t: number) => e.advanceTo(t), engine: () => e };
}

/** A host without an engine: the test emits the events and sees every dispatched body. */
function fakeHost(restore: () => Promise<void> = async () => undefined) {
  const fns = new Set<(x: EngineEvent) => void>();
  const sent: unknown[] = [];
  const host: ConsoleHost = {
    dispatch: async (b) => (sent.push(b), { accepted: true }),
    on: (fn) => (fns.add(fn), () => fns.delete(fn)),
    snapshot: async () => ({ schema: 'pme-snapshot/1', engineVersion: 'x', seed: 1, tick: 0, state: {} }),
    restore,
    restart: () => undefined,
    timeScale: () => undefined,
    pause: () => undefined,
  };
  const emit = (e: EngineEvent) => fns.forEach((fn) => fn(e));
  const truthAt = (t: number, tree: TruthTree = { hemo: { circ: { p: { rSys: 0.9 } } } }) => emit({ type: 'truth', t, tree, leaves: 1, dropped: 0, truncated: false });
  return { host, emit, truthAt, sent };
}

describe('physiology console page', { timeout: 30_000 }, () => {
  it('shows organ sections with rows, auto-sets the baseline at 15 s, and lists no change before one is made', async () => {
    const { q, advance } = rig();
    advance(20);
    await flush();
    expect(q('[data-id="base"]').textContent).toBe('baseline @ 0:15');
    expect((q('[data-act="reset"]') as HTMLButtonElement).disabled).toBe(false);
    const sec = q<HTMLDetailsElement>('details[data-group="circulation"]');
    expect(sec.hidden).toBe(false);
    expect(sec.querySelector('tr[data-path="ev.circ.svr"] .lbl')?.textContent).toBe('SVR');
    expect(q('tr[data-path="ev.circ.svr"] .u').textContent).toBe('dyn·s/cm⁵');
    expect(q('details[data-group="monitor"] tr[data-path="mon.hr"]')).not.toBeNull();
    expect(q<HTMLDetailsElement>('details[data-group="devices"]').hidden).toBe(false);
    expect(document.querySelectorAll('.pc-log li')).toHaveLength(0);
    expect(q<HTMLTableRowElement>('tr[data-path="l1.vars.sbp.t0"]').hidden).toBe(true); // internals off by default
  });
  it('phenylephrine: one change-log entry, accepted; SVR delta turns positive and the row highlights', async () => {
    const { q, click, advance } = rig();
    advance(20);
    await flush();
    click('bolus'); // the rail's defaults: phenylephrine 100 mcg
    await flush();
    const li = document.querySelectorAll('.pc-log li[data-kind="cmd"]');
    expect(li).toHaveLength(1);
    expect(li[0]?.textContent).toContain('phenylephrine 100 mcg iv');
    expect(li[0]?.className).toBe('ok');
    advance(60);
    await flush();
    const row = q<HTMLTableRowElement>('tr[data-path="ev.circ.svr"]');
    expect(row.querySelector('.d')?.textContent).toMatch(/^\+\d+/);
    expect(row.className).toBe('up');
    expect(q('details[data-group="circulation"] .pc-count').textContent).toMatch(/changed/);
  });
  it('a rejected command shows its reason; bad raw JSON is logged, not thrown', async () => {
    const { q, click, advance } = rig();
    advance(2);
    q<HTMLInputElement>('[data-f="drug"]').value = 'notADrug';
    click('bolus');
    q<HTMLTextAreaElement>('[data-f="raw"]').value = '{nope';
    click('raw');
    await flush();
    const li = [...document.querySelectorAll('.pc-log li')];
    expect(li.map((l) => l.className)).toEqual(['rej', 'rej']);
    expect(li[1]?.textContent).toContain('rejected:');
    expect(li[0]?.textContent).toContain('bad JSON');
  });
  it('filter, changed-only and internals toggle row visibility', async () => {
    const { q, advance } = rig();
    advance(20);
    await flush();
    const f = q<HTMLInputElement>('[data-id="filter"]');
    f.value = 'svr';
    f.dispatchEvent(new Event('input'));
    expect(q<HTMLTableRowElement>('tr[data-path="ev.circ.svr"]').hidden).toBe(false);
    expect(q<HTMLTableRowElement>('tr[data-path="ev.circ.co"]').hidden).toBe(true);
    expect(q<HTMLDetailsElement>('details[data-group="lungs"]').hidden).toBe(true);
    f.value = '';
    const ch = q<HTMLInputElement>('[data-id="changed"]');
    ch.checked = true;
    ch.dispatchEvent(new Event('input'));
    expect(q<HTMLTableRowElement>('tr[data-path="resp.pat.weightKg"]').hidden).toBe(true); // a constant never shows as changed
    ch.checked = false;
    const inn = q<HTMLInputElement>('[data-id="internals"]');
    inn.checked = true;
    inn.dispatchEvent(new Event('input'));
    expect(q<HTMLTableRowElement>('tr[data-path="l1.vars.sbp.t0"]').hidden).toBe(false);
  });
  it('reset to baseline restores the engine: SVR returns to baseline and the log marks it', async () => {
    const { q, click, advance, ui: h } = rig();
    advance(20);
    await flush();
    click('bolus');
    await flush();
    advance(60);
    await flush();
    await h.resetToBaseline();
    advance(17);
    await flush();
    expect(q('tr[data-path="ev.circ.svr"]').className).toBe('');
    expect(q('.pc-log li').textContent).toContain('reset to baseline @ 0:15');
    expect(h.model.t).toBe(17);
    expect(q('[data-id="t"]').textContent).toBe('0:17'); // the clock went back with the engine
  });
  it('after a reset the clock ignores events from the discarded timeline and follows the restored one', async () => {
    const f = fakeHost();
    ui = mountConsole(document.body, f.host, { autoBaselineS: 2 });
    for (let t = 1; t <= 3; t++) f.truthAt(t);
    await flush(); // the auto-baseline at 2 s took its snapshot
    for (let t = 4; t <= 80; t++) f.truthAt(t);
    expect(document.querySelector('[data-id="t"]')?.textContent).toBe('1:20');
    await ui.resetToBaseline();
    // a worker delivers what it had batched before the restore AFTER the reply: stale beats, then the restore's
    // toneCancel, then the new timeline
    f.emit({ type: 'circ', t: 80.5 } as unknown as EngineEvent);
    expect(document.querySelector('[data-id="t"]')?.textContent).toBe('0:02');
    f.emit({ type: 'toneCancel', after: 2 });
    f.emit({ type: 'circ', t: 2.5 } as unknown as EngineEvent);
    f.truthAt(3);
    expect(document.querySelector('[data-id="t"]')?.textContent).toBe('0:03');
    expect(document.querySelector('.pc-log li')?.textContent).toContain('0:02 reset to baseline @ 0:02');
  });
  it('without a toneCancel, the first truth event after the restore re-syncs the clock', async () => {
    const f = fakeHost();
    ui = mountConsole(document.body, f.host, { autoBaselineS: 2 });
    for (let t = 1; t <= 50; t++) f.truthAt(t);
    await flush();
    await ui.resetToBaseline();
    f.emit({ type: 'circ', t: 50.2 } as unknown as EngineEvent);
    f.truthAt(3);
    f.truthAt(4);
    expect(document.querySelector('[data-id="t"]')?.textContent).toBe('0:04');
  });
  it('the rail sends 7b lung, 7c fluid/lab and 7g TCI/N2O bodies', async () => {
    const f = fakeHost();
    ui = mountConsole(document.body, f.host);
    expect(document.querySelector('[data-id="base"]')?.textContent).toBe('baseline: pending (auto at 1:00)');
    const set = (id: string, v: string) => ((document.querySelector(`[data-f="${id}"]`) as HTMLInputElement).value = v);
    const click = (act: string) => (document.querySelector(`[data-act="${act}"]`) as HTMLButtonElement).click();
    set('drug', 'propofol');
    set('tciModel', 'eleveld');
    click('tci');
    set('n2o', '0.5');
    click('vap');
    set('fluid', 'rl');
    click('fluid');
    click('lab');
    set('lcond', 'ptxSimple');
    set('side', 'L');
    click('lcond');
    set('mainstem', 'right');
    click('mainstem');
    click('recruit');
    await flush();
    expect(f.sent.map((b) => (b as { event: unknown }).event)).toEqual([
      { kind: 'tci', drugId: 'propofol', model: 'eleveld', mode: 'effect', target: 3 },
      { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0.5 },
      { kind: 'fluid', fluid: 'rl', volumeMl: 500, overS: 300 },
      { kind: 'lab', panel: 'abg' },
      { kind: 'lungCondition', id: 'ptxSimple', severity: 0.5, side: 'L' },
      { kind: 'mainstem', ventilated: 'right' },
      { kind: 'recruit', pressureCmH2O: 40, durationS: 30 },
    ]);
    expect(document.querySelectorAll('.pc-log li.ok')).toHaveLength(7);
  });
  it('a path that leaves the truth tree loses its row', async () => {
    const fns = new Set<(x: EngineEvent) => void>();
    const fake: ConsoleHost = {
      dispatch: async () => ({ accepted: true }),
      on: (fn) => (fns.add(fn), () => fns.delete(fn)),
      snapshot: async () => ({ schema: 'pme-snapshot/1', engineVersion: 'x', seed: 1, tick: 0, state: {} }),
      restore: async () => undefined,
      restart: () => undefined,
      timeScale: () => undefined,
      pause: () => undefined,
    };
    ui = mountConsole(document.body, fake);
    const emit = (t: number, tree: TruthTree) => fns.forEach((fn) => fn({ type: 'truth', t, tree, leaves: 1, dropped: 0, truncated: false }));
    emit(1, { hemo: { lvad: { rpm: 5400 } }, organs: { renal: { gfr: 110 } } });
    expect(document.querySelector('details[data-group="kidney"] tr[data-path="organs.renal.gfr"]')).not.toBeNull();
    expect((document.querySelector('details[data-group="devices"]') as HTMLDetailsElement).hidden).toBe(false);
    emit(2, { organs: { renal: { gfr: 100 } } });
    expect(document.querySelector('tr[data-path="hemo.lvad.rpm"]')).toBeNull();
    expect((document.querySelector('details[data-group="devices"]') as HTMLDetailsElement).hidden).toBe(true);
  });
  it('restart remounts the patient and forgets the old baseline; export gives JSON and CSV', async () => {
    const { click, q, restarts, advance, ui: h } = rig();
    advance(20);
    await flush();
    q<HTMLSelectElement>('[data-f="preset"]').value = 'child';
    click('restart');
    expect(restarts).toEqual(['child/modeled']);
    expect(h.model.base).toBeNull();
    expect(q('[data-id="base"]').textContent).toMatch(/pending/);
    advance(5);
    await flush();
    const j = JSON.parse(h.exportJSON()) as { schema: string; values: Record<string, { value: unknown }> };
    expect(j.schema).toBe('pme-console/1');
    expect(j.values['resp.pat.weightKg']?.value).toBe(20);
    expect(h.exportCSV()).toContain('\ncirculation,ev.circ.svr,SVR,');
  });
});
```

- [x] **Step 2: Run it and see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/view.dom.test.ts`
Expected: FAIL — `./view.ts` does not exist. (If instead the failure is "Cannot find package 'happy-dom'", STOP and
report — Global Constraints.)

- [x] **Step 3: Implement** — `apps/demo/src/physiology-console/view.ts`:

```ts
// Stage 7x: the console page controller — header (clock, speed, baseline, filters, export), the actions rail, the
// change log and the organ sections. Plain DOM; one small canvas per sparkline. The engine is reached only through
// ConsoleHost, so the happy-dom test drives it with a real engine on the main thread and the page with mountMonitor.
import type { EngineEvent, PatientSnapshot } from '@pme/engine-core';
import { RHYTHM_IDS } from '@pme/engine-core';
import * as A from './actions.ts';
import { fmtDelta, fmtValue } from './format.ts';
import { ConsoleModel, type Row } from './model.ts';
import { GROUPS, type GroupId } from './organs.ts';
import { drawSpark } from './sparkline.ts';

export interface ConsoleHost {
  dispatch(b: A.Body): Promise<{ accepted: boolean; reason?: string }>;
  on(fn: (e: EngineEvent) => void): () => void;
  snapshot(): Promise<PatientSnapshot>;
  restore(s: PatientSnapshot): Promise<void>;
  /** Remount the monitor with a new patient (profile and mode are engine options). */
  restart(presetId: string, mode: 'manual' | 'modeled'): void;
  timeScale(k: number): void;
  pause(paused: boolean): void;
}

export interface LogEntry {
  t: number;
  kind: 'cmd' | 'mark';
  text: string;
  ok: boolean | null;
  reason?: string;
}

export interface ConsoleHandle {
  readonly model: ConsoleModel;
  readonly log: readonly LogEntry[];
  /** Where the page mounts the monitor. */
  readonly monitorEl: HTMLElement;
  send(b: A.Body): Promise<{ accepted: boolean; reason?: string }>;
  setBaseline(auto?: boolean): Promise<void>;
  resetToBaseline(): Promise<void>;
  exportJSON(): string;
  exportCSV(): string;
  destroy(): void;
}

const SPARK_W = 64;
const SPARK_H = 14;
const opt = (v: string, label = v, sel = false) => `<option value="${v}"${sel ? ' selected' : ''}>${label}</option>`;
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const TEMPLATE = `
<header class="pc-bar">
  <strong>Physiology console</strong>
  <span class="pc-t" data-id="t">0:00</span>
  <select data-id="speed" title="Sim speed">${[0.25, 0.5, 1, 2, 4].map((k) => opt(String(k), `×${k}`, k === 1)).join('')}</select>
  <button type="button" data-act="pause">Pause</button>
  <span class="pc-sep"></span>
  <span data-id="base">baseline: pending</span>
  <button type="button" data-act="setBase">Set baseline</button>
  <button type="button" data-act="reset" disabled>Reset to baseline</button>
  <span class="pc-sep"></span>
  <input data-id="filter" type="search" placeholder="filter (path or label)" />
  <label><input type="checkbox" data-id="changed" /> changed only</label>
  <label><input type="checkbox" data-id="internals" /> internals</label>
  <span class="pc-sep"></span>
  <button type="button" data-act="json">JSON</button><button type="button" data-act="csv">CSV</button><button type="button" data-act="copy">Copy</button>
  <span class="pc-stats" data-id="stats"></span>
</header>
<div class="pc-body">
  <div class="pc-left">
    <div class="pc-monitor" data-id="monitor"></div>
    <div class="pc-rail" data-id="rail">
      <fieldset><legend>Drug</legend>
        <input data-f="drug" list="pc-drugs" value="phenylephrine" size="13" />
        <datalist id="pc-drugs">${A.DRUG_IDS.map((d) => opt(d)).join('')}</datalist>
        <input data-f="dose" type="number" value="100" step="any" /> <select data-f="doseUnit">${A.DOSE_UNITS.map((u) => opt(u)).join('')}</select>
        <button type="button" data-act="bolus">Bolus</button>
        <input data-f="rate" type="number" value="0.5" step="any" /> <select data-f="rateUnit">${A.RATE_UNITS.map((u) => opt(u)).join('')}</select>
        <button type="button" data-act="infusion">Infuse</button>
        TCI <input data-f="tciTarget" type="number" value="3" step="any" /> <select data-f="tciMode">${opt('effect')}${opt('plasma')}</select>
        <input data-f="tciModel" list="pc-tci" placeholder="model" size="8" /><datalist id="pc-tci">${A.TCI_MODELS.map((m) => opt(m)).join('')}</datalist>
        <button type="button" data-act="tci">TCI</button>
      </fieldset>
      <fieldset><legend>Vaporiser</legend>
        <select data-f="agent">${A.AGENTS.map((a) => opt(a)).join('')}</select> dial <input data-f="dial" type="number" value="2" step="0.1" /> %
        FGF <input data-f="fgf" type="number" value="2" step="0.5" /> L/min N₂O <input data-f="n2o" type="number" value="0" min="0" max="0.7" step="0.1" />
        <button type="button" data-act="vap">Set</button>
      </fieldset>
      <fieldset><legend>Fluids / bleed / labs</legend>
        <input data-f="fluid" list="pc-fluids" value="crystalloid" size="11" /><datalist id="pc-fluids">${A.FLUID_IDS.map((x) => opt(x)).join('')}</datalist>
        <input data-f="vol" type="number" value="500" /> mL over <input data-f="over" type="number" value="300" /> s
        <button type="button" data-act="fluid">Give</button> <button type="button" data-act="bleed">Bleed</button>
        <select data-f="panel">${opt('abg', 'ABG')}${opt('vbg', 'VBG')}</select> <button type="button" data-act="lab">Send</button>
      </fieldset>
      <fieldset><legend>Condition</legend>
        <input data-f="cond" list="pc-conds" value="tamponade" size="11" /><datalist id="pc-conds">${A.CONDITION_IDS.map((c) => opt(c)).join('')}</datalist>
        severity <input data-f="sev" type="number" value="0.8" min="0" max="1" step="0.1" /> <button type="button" data-act="cond">Apply</button>
      </fieldset>
      <fieldset><legend>Lungs</legend>
        <input data-f="lcond" list="pc-lconds" value="ards" size="11" /><datalist id="pc-lconds">${A.LUNG_CONDITION_IDS.map((c) => opt(c)).join('')}</datalist>
        severity <input data-f="lsev" type="number" value="0.5" min="0" max="1" step="0.1" /> <select data-f="side">${opt('', 'both/none')}${opt('L')}${opt('R')}</select>
        <button type="button" data-act="lcond">Apply</button>
        tube <select data-f="mainstem">${opt('both')}${opt('left')}${opt('right')}</select> <button type="button" data-act="mainstem">Set</button>
        RM <input data-f="rmP" type="number" value="40" /> cmH₂O × <input data-f="rmS" type="number" value="30" /> s <button type="button" data-act="recruit">Recruit</button>
      </fieldset>
      <fieldset><legend>Ventilation</legend>
        <select data-f="src">${['spontaneous', 'ventilator', 'bvm', 'none'].map((s) => opt(s)).join('')}</select>
        RR <input data-f="rr" type="number" value="12" /> VT <input data-f="vt" type="number" value="500" /> PEEP <input data-f="peep" type="number" value="5" />
        FiO₂ <input data-f="fio2" type="number" value="0.5" step="0.05" /> <button type="button" data-act="vent">Set</button>
      </fieldset>
      <fieldset><legend>Rhythm / mode / patient</legend>
        <select data-f="rhythm">${RHYTHM_IDS.map((r) => opt(r)).join('')}</select> <button type="button" data-act="rhythm">Set rhythm</button>
        <select data-f="mode">${opt('modeled', 'MODELED', true)}${opt('manual', 'MANUAL')}</select> <button type="button" data-act="mode">Set mode</button>
        <select data-f="preset">${A.PRESETS.map((p) => opt(p.id, p.label)).join('')}</select> <button type="button" data-act="restart">Restart patient</button>
      </fieldset>
      <fieldset><legend>Raw command (JSON body)</legend>
        <textarea data-f="raw" rows="2">{"type":"applyEvent","event":{"kind":"drug","drugId":"ephedrine","dose":10,"unit":"mg","route":"iv"}}</textarea>
        <button type="button" data-act="raw">Send</button>
      </fieldset>
    </div>
    <ol class="pc-log" data-id="log" aria-label="Change log"></ol>
  </div>
  <main class="pc-organs" data-id="organs"></main>
</div>`;

interface RowEls {
  tr: HTMLTableRowElement;
  v: HTMLElement;
  b: HTMLElement;
  d: HTMLElement;
  cv: HTMLCanvasElement;
  g: CanvasRenderingContext2D | null;
}

export function mountConsole(root: HTMLElement, host: ConsoleHost, o: { autoBaselineS?: number } = {}): ConsoleHandle {
  const doc = root.ownerDocument;
  root.innerHTML = TEMPLATE;
  const $ = <T extends Element>(id: string) => root.querySelector(`[data-id="${id}"]`) as T;
  const f = <T extends HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id: string) => root.querySelector(`[data-f="${id}"]`) as T;
  const num = (id: string) => Number(f(id).value);
  const model = new ConsoleModel();
  const log: LogEntry[] = [];
  const autoS = o.autoBaselineS ?? 60;
  let simT = 0;
  /**
   * The page clock after "reset to baseline": 'restoring' while the restore is in flight (every event still arriving
   * is from the discarded timeline, so none moves the clock), 'resync' once it resolved without the restore's
   * toneCancel having arrived (the clock shows the baseline time meanwhile). The restore's toneCancel (no `ids`) or,
   * failing that, the first truth event after the restore resolved sets the clock to the restored timeline;
   * `max(simT, t)` alone would keep the old, later time.
   */
  let clockHold: 'restoring' | 'resync' | null = null;
  let baseSnap: PatientSnapshot | null = null;
  let paused = false;
  let renderMs = 0;

  // --- organ sections ---
  const organs = $<HTMLElement>('organs');
  const sections = new Map<GroupId, { det: HTMLDetailsElement; body: HTMLTableSectionElement; sum: HTMLElement; n: number }>();
  for (const g of GROUPS) {
    const det = doc.createElement('details');
    det.className = 'pc-sec';
    det.dataset.group = g.id;
    det.open = g.id !== 'other' && g.id !== 'controls';
    det.hidden = true;
    det.innerHTML = `<summary>${g.title} <span class="pc-count"></span></summary><table><tbody></tbody></table>`;
    det.addEventListener('toggle', () => det.open && refresh());
    organs.append(det);
    sections.set(g.id, { det, body: det.querySelector('tbody') as HTMLTableSectionElement, sum: det.querySelector('.pc-count') as HTMLElement, n: 0 });
  }
  const els = new Map<string, RowEls>();
  const makeRow = (r: Row): RowEls => {
    const tr = doc.createElement('tr');
    tr.dataset.path = r.path;
    const dot = r.path.lastIndexOf('.');
    tr.innerHTML = `<td class="k" title="${r.path}"><span class="lbl"></span><span class="par"></span></td><td class="v"></td><td class="u"></td><td class="b"></td><td class="d"></td><td class="s"><canvas width="${SPARK_W}" height="${SPARK_H}"></canvas></td>`;
    (tr.querySelector('.lbl') as HTMLElement).textContent = r.meta.label;
    (tr.querySelector('.par') as HTMLElement).textContent = r.meta.rank === Number.POSITIVE_INFINITY && dot > 0 ? r.path.slice(0, dot) : '';
    (tr.querySelector('.u') as HTMLElement).textContent = r.meta.unit;
    const cv = tr.querySelector('canvas') as HTMLCanvasElement;
    return { tr, v: tr.querySelector('.v') as HTMLElement, b: tr.querySelector('.b') as HTMLElement, d: tr.querySelector('.d') as HTMLElement, cv, g: cv.getContext('2d') };
  };
  const setText = (el: HTMLElement, s: string) => {
    if (el.textContent !== s) el.textContent = s;
  };

  function refresh(): void {
    const t0 = performance.now();
    const rows = model.rows();
    const filter = $<HTMLInputElement>('filter').value.trim().toLowerCase();
    const changedOnly = $<HTMLInputElement>('changed').checked;
    const internals = $<HTMLInputElement>('internals').checked;
    const counts = new Map<GroupId, { shown: number; changed: number; total: number; added: boolean }>();
    const live = new Set(rows.map((r) => r.path));
    for (const [path, e] of els) {
      if (live.has(path)) continue; // a path that left the truth tree (a short history, a device switched off)
      e.tr.remove();
      els.delete(path);
    }
    for (const r of rows) {
      const c = counts.get(r.group) ?? { shown: 0, changed: 0, total: 0, added: false };
      counts.set(r.group, c);
      let e = els.get(r.path);
      if (!e) {
        e = makeRow(r);
        els.set(r.path, e);
        c.added = true;
      }
      const ref = typeof r.base === 'number' ? r.base : typeof r.value === 'number' ? r.value : 0;
      setText(e.v, fmtValue(r.value, r.meta));
      setText(e.b, fmtValue(r.base, r.meta));
      setText(e.d, fmtDelta(r.delta, r.meta, ref));
      const cls = r.dir ?? '';
      if (e.tr.className !== cls) e.tr.className = cls;
      const hide = (r.internal && !internals) || (changedOnly && !r.dir) || (filter !== '' && !r.path.toLowerCase().includes(filter) && !r.meta.label.toLowerCase().includes(filter));
      if (e.tr.hidden !== hide) e.tr.hidden = hide;
      c.total++;
      if (!hide) c.shown++;
      if (r.dir && (internals || !r.internal)) c.changed++;
      if (!hide && (sections.get(r.group) as { det: HTMLDetailsElement }).det.open && r.hist.length > 1) {
        drawSpark(e.g, r.hist, SPARK_W, SPARK_H, r.dir === 'down' ? '#5fc8ff' : r.dir === 'up' ? '#ffb347' : '#8a8f98', typeof r.base === 'number' ? r.base : undefined);
      }
    }
    for (const [id, s] of sections) {
      const c = counts.get(id);
      s.det.hidden = !c || c.shown === 0;
      if (!c) continue;
      if (c.added || c.total !== s.n) {
        // new paths: re-append this section's rows in sorted order (appendChild moves existing nodes)
        for (const r of rows) if (r.group === id) s.body.append((els.get(r.path) as RowEls).tr);
        s.n = c.total;
      }
      setText(s.sum, `${c.shown}${c.changed ? ` · ${c.changed} changed` : ''}`);
    }
    renderMs = performance.now() - t0;
    header();
  }

  function header(): void {
    setText($('t'), clock(simT));
    setText($('base'), model.baseT === null ? `baseline: pending (auto at ${clock(autoS)})` : `baseline @ ${clock(model.baseT)}`);
    (root.querySelector('[data-act="reset"]') as HTMLButtonElement).disabled = baseSnap === null;
    const tr = model.truth;
    setText($('stats'), `${model.cur.size} values · truth ${tr.leaves} leaves ${(tr.bytes / 1024).toFixed(1)} KB${tr.truncated ? ' TRUNCATED' : ''} · render ${renderMs.toFixed(1)} ms`);
  }

  function renderLog(): void {
    const ol = $<HTMLOListElement>('log');
    ol.replaceChildren(
      ...log.map((e) => {
        const li = doc.createElement('li');
        li.dataset.kind = e.kind;
        li.className = e.ok === null ? 'pending' : e.ok ? 'ok' : 'rej';
        li.innerHTML = '<time></time> <span></span> <em></em>';
        (li.children[0] as HTMLElement).textContent = clock(e.t);
        (li.children[1] as HTMLElement).textContent = e.text;
        (li.children[2] as HTMLElement).textContent = e.ok === false ? `rejected: ${e.reason ?? ''}` : '';
        return li;
      }),
    );
  }
  const mark = (text: string, t = simT) => {
    log.unshift({ t, kind: 'mark', text, ok: true });
    renderLog();
  };

  async function send(b: A.Body) {
    const entry: LogEntry = { t: simT, kind: 'cmd', text: A.describe(b), ok: null };
    log.unshift(entry);
    renderLog();
    const r = await host.dispatch(b).catch((err: unknown) => ({ accepted: false, reason: String(err) }));
    entry.ok = r.accepted;
    if (r.reason !== undefined) entry.reason = r.reason;
    renderLog();
    return r;
  }

  async function setBaseline(auto = false): Promise<void> {
    model.setBaseline();
    if (!auto) mark(`baseline set @ ${clock(model.baseT ?? 0)}`);
    baseSnap = await host.snapshot(); // taken within a frame of the baseline values (the worker answers asynchronously)
    refresh();
  }
  async function resetToBaseline(): Promise<void> {
    if (!baseSnap || model.baseT === null) return;
    const baseT = model.baseT;
    clockHold = 'restoring';
    await host.restore(baseSnap);
    if (clockHold === 'restoring') {
      clockHold = 'resync'; // show the restored time now; stale events still arriving do not move it
      simT = baseT;
    }
    model.clearHistory();
    mark(`reset to baseline @ ${clock(baseT)}`, baseT);
    refresh();
  }

  const off = host.on((e) => {
    const t = (e as { t?: unknown }).t;
    if (clockHold !== null && e.type === 'toneCancel' && !e.ids) {
      simT = e.after; // the restore's timeline boundary
      clockHold = null;
    } else if (clockHold === 'resync' && e.type === 'truth') {
      simT = e.t;
      clockHold = null;
    } else if (clockHold === null && typeof t === 'number' && e.type !== 'tone') simT = Math.max(simT, t);
    if (!model.ingest(e)) return;
    if (model.base === null && model.t >= autoS) void setBaseline(true);
    else refresh();
  });

  const download = (name: string, text: string, type: string) => {
    const a = doc.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const exportJSON = () => JSON.stringify(model.toJSON(), null, 1);
  const stamp = () => `pme-console-t${Math.round(model.t)}`;
  const acts: Record<string, () => void> = {
    pause: () => {
      paused = !paused;
      host.pause(paused);
      (root.querySelector('[data-act="pause"]') as HTMLElement).textContent = paused ? 'Resume' : 'Pause';
    },
    setBase: () => void setBaseline(),
    reset: () => void resetToBaseline(),
    json: () => download(`${stamp()}.json`, exportJSON(), 'application/json'),
    csv: () => download(`${stamp()}.csv`, model.toCSV(), 'text/csv'),
    copy: () => void navigator.clipboard?.writeText(exportJSON()).catch(() => undefined),
    bolus: () => void send(A.bolus(f('drug').value.trim(), num('dose'), f('doseUnit').value)),
    infusion: () => void send(A.infusion(f('drug').value.trim(), num('rate'), f('rateUnit').value)),
    tci: () => void send(A.tci(f('drug').value.trim(), num('tciTarget'), f('tciMode').value as 'effect' | 'plasma', f('tciModel').value.trim())),
    vap: () => void send(A.vaporiser(f('agent').value, num('dial'), num('fgf'), num('n2o'))),
    fluid: () => void send(A.fluid(f('fluid').value.trim(), num('vol'), num('over'))),
    bleed: () => void send(A.bleed(num('vol'), num('over'))),
    lab: () => void send(A.lab(f('panel').value as 'abg' | 'vbg')),
    cond: () => void send(A.condition(f('cond').value.trim(), num('sev'))),
    lcond: () => void send(A.lungCondition(f('lcond').value.trim(), num('lsev'), f('side').value as '' | 'L' | 'R')),
    mainstem: () => void send(A.mainstem(f('mainstem').value as 'both' | 'left' | 'right')),
    recruit: () => void send(A.recruit(num('rmP'), num('rmS'))),
    vent: () => void send(A.ventilation(f('src').value, num('rr'), num('vt'), num('peep'), num('fio2'))),
    rhythm: () => void send(A.rhythm(f('rhythm').value)),
    mode: () => void send(A.setMode(f('mode').value as 'manual' | 'modeled')),
    restart: () => {
      host.restart(f('preset').value, f('mode').value as 'manual' | 'modeled');
      model.clear();
      baseSnap = null;
      simT = 0;
      clockHold = null;
      for (const e of els.values()) e.tr.remove();
      els.clear();
      for (const s of sections.values()) s.n = 0;
      mark(`restart: ${f('preset').value}, ${f('mode').value.toUpperCase()}`);
      refresh();
    },
    raw: () => {
      try {
        void send(JSON.parse(f('raw').value) as A.Body);
      } catch (err) {
        log.unshift({ t: simT, kind: 'cmd', text: 'raw command', ok: false, reason: `bad JSON: ${String(err)}` });
        renderLog();
      }
    },
  };
  const onClick = (ev: Event) => {
    const act = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act) acts[act]?.();
  };
  root.addEventListener('click', onClick);
  $<HTMLSelectElement>('speed').addEventListener('change', (ev) => host.timeScale(Number((ev.target as HTMLSelectElement).value)));
  for (const id of ['filter', 'changed', 'internals']) $(id).addEventListener('input', refresh);
  header();

  return {
    model,
    log,
    monitorEl: $<HTMLElement>('monitor'),
    send,
    setBaseline,
    resetToBaseline,
    exportJSON,
    exportCSV: () => model.toCSV(),
    destroy() {
      off();
      root.removeEventListener('click', onClick);
      root.replaceChildren();
    },
  };
}
```

- [x] **Step 4: Run it and see it pass**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo exec vitest run src/physiology-console/view.dom.test.ts`
Expected: PASS, 10 tests (≈ 4–7 s locally; each engine test stays ≤ 60 sim-s, the describe allows 30 s per test for
the 2-vCPU runner).

- [x] **Step 5: Typecheck and commit**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck` — Expected: clean.

```bash
git add apps/demo/src/physiology-console/view.ts apps/demo/src/physiology-console/view.dom.test.ts
git commit -m "feat(console): page controller — header, actions rail, change log, organ sections, reset to baseline (clock re-sync)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 8: The page, the build entry, the e2e and the screenshots

**Files:**
- Create: `apps/demo/physiology-console.html`, `apps/demo/src/physiology-console/main.ts`,
  `apps/demo/e2e/physiology-console.e2e.ts`, `docs/gates/stage-7x/*.jpg` (written by the e2e)
- Modify (one additive line each): `apps/demo/vite.config.ts`, `apps/demo/index.html`

**Interfaces:**
- Consumes: `mountConsole`, `ConsoleHost` (Task 7); `PRESETS` (Task 6); `mountMonitor`, `MonitorHandle` from
  `@pme/renderer`; `EngineOptions.truthHz` (Task 1).
- Produces: the page `physiology-console.html` (query `?skin=`, `?seed=`, `?preset=`, `?mode=manual`) and the hook
  `window.__pmeConsole = { ui: ConsoleHandle, host: ConsoleHost, renderPath(): Promise<RenderPath> | undefined,
  ready: true }`.

- [x] **Step 1: Write the failing e2e** — `apps/demo/e2e/physiology-console.e2e.ts`:

```ts
// Gate 7x evidence on the live page: the console loads with the real monitor, the organ sections fill from the
// engine's truth event, a phenylephrine bolus from the rail makes one change-log entry and turns the SVR delta
// positive. Screenshots (JPEG clips, ≤ 60 KB each) for the gate note.
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/physiology-console.e2e.ts
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-7x');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Hook = { ready: boolean; renderPath(): Promise<string>; ui: { model: { t: number; baseT: number | null; truth: { leaves: number; bytes: number; truncated: boolean } } } };
const simT = (page: Page) => page.evaluate(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.t);
const waitSim = (page: Page, t: number) => page.waitForFunction((t) => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.t >= t, t, { timeout: 120_000 });
/** Three JPEG clips per state (monitor + rail + log; the organ sections' top and bottom halves), each ≤ 60 KB. */
async function shots(page: Page, name: string) {
  if (test.info().project.name === 'webkit') return; // evidence comes from Chromium/Chrome; WebKit's font rendering changes JPEG sizes
  const x = await page.evaluate(() => Math.round((document.querySelector('.pc-left') as HTMLElement).getBoundingClientRect().right));
  const w = 1440 - x;
  const parts = [['left', { x: 0, y: 0, width: x, height: 900 }], ['organs-top', { x, y: 0, width: w, height: 450 }], ['organs-bottom', { x, y: 450, width: w, height: 450 }]] as const;
  for (const [part, clip] of parts) {
    const path = `${out}/${name}-${part}.jpg`;
    await page.screenshot({ path, type: 'jpeg', quality: 55, clip });
    expect(statSync(path).size, `${name}-${part}.jpg ≤ 60 KB`).toBeLessThanOrEqual(60 * 1024);
  }
}

test('physiology console: monitor + organ tree; phenylephrine → one log entry, SVR delta positive', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/physiology-console.html`);
  await page.waitForFunction(() => (window as unknown as { __pmeConsole?: Hook }).__pmeConsole?.ready === true);
  await page.selectOption('[data-id="speed"]', '4');
  // the auto-baseline waits for the modeled reflexes to settle: the first truth event at sim ≥ 60 s (×4: ≈ 15 s)
  await page.waitForFunction(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.baseT !== null, undefined, { timeout: 120_000 });
  await waitSim(page, 61);
  await expect(page.locator('details[data-group="circulation"] tr[data-path="ev.circ.svr"]')).toBeVisible();
  await expect(page.locator('details[data-group="monitor"] tr[data-path="mon.hr"] .v')).toHaveText(/^\d+$/);
  await expect(page.locator('.pc-log li')).toHaveCount(0);
  // the truth tree crossed the worker boundary inside the monitor's event batches, pruned and under the 50 KB budget
  const path = await page.evaluate(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.renderPath());
  const truth = await page.evaluate(() => (window as unknown as { __pmeConsole: Hook }).__pmeConsole.ui.model.truth);
  console.log(`render path ${path}; truth ${truth.leaves} leaves, ${truth.bytes} B${truth.truncated ? ' (TRUNCATED)' : ''}`);
  if (test.info().project.name !== 'webkit') expect(path).toMatch(/^worker/);
  expect(truth.bytes).toBeLessThan(50_000);
  await shots(page, 'rest');
  await page.click('[data-act="bolus"]'); // rail defaults: phenylephrine 100 mcg
  await expect(page.locator('.pc-log li[data-kind="cmd"]')).toHaveCount(1);
  await expect(page.locator('.pc-log li').first()).toHaveClass('ok');
  await expect(page.locator('.pc-log li').first()).toContainText('phenylephrine 100 mcg iv');
  const t0 = await simT(page);
  await waitSim(page, t0 + 40);
  const svr = page.locator('tr[data-path="ev.circ.svr"]');
  await expect(svr.locator('.d')).toHaveText(/^\+\d+/);
  await expect(svr).toHaveClass('up');
  await shots(page, 'phenylephrine-40s');
  await page.check('[data-id="changed"]');
  await shots(page, 'phenylephrine-changed-only');
  expect(errors).toEqual([]);
});
```

- [x] **Step 2: Run it and see it fail**

Run: `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/physiology-console.e2e.ts`
Expected: FAIL — the page 404s, `__pmeConsole` never becomes ready (timeout).

- [x] **Step 3: Create the page entry** — `apps/demo/src/physiology-console/main.ts`:

```ts
// Stage 7x page entry: the real monitor (mountMonitor, any skin via ?skin=, worker when available) with the engine's
// opt-in truth event at 1 Hz, wired to the console. Commands go to the same engine the monitor draws; the truth tree
// crosses the worker boundary inside the monitor's ordinary event batches (a pruned structured clone, < 50 KB).
import type { Command, EngineEvent } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { PRESETS } from './actions.ts';
import { mountConsole, type ConsoleHost } from './view.ts';

const params = new URLSearchParams(location.search);
const skin = params.get('skin') ?? 'philips-like';
const seed = Number(params.get('seed') ?? 7);
const listeners = new Set<(e: EngineEvent) => void>();
let pm: MonitorHandle | null = null;
let speed = 1;
let n = 0;

const need = (): MonitorHandle => {
  if (!pm) throw new Error('monitor not mounted');
  return pm;
};
const host: ConsoleHost = {
  dispatch: (b) => need().dispatch({ ...b, id: `pc${++n}`, issuedBy: 'console' } as unknown as Command),
  on: (fn) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  snapshot: () => need().snapshot(),
  restore: (s) => need().restore(s),
  restart: (presetId, mode) => start(presetId, mode),
  timeScale: (k) => {
    speed = k;
    pm?.setTimeScale(k);
  },
  pause: (p) => (p ? pm?.pause() : pm?.resume()),
};

const ui = mountConsole(document.getElementById('app') as HTMLElement, host);

function start(presetId: string, mode: 'manual' | 'modeled'): void {
  pm?.destroy();
  ui.monitorEl.replaceChildren();
  const patient = (PRESETS.find((p) => p.id === presetId) ?? (PRESETS[0] as (typeof PRESETS)[number])).profile;
  pm = mountMonitor(ui.monitorEl, { skin, engine: { seed, mode, patient, truthHz: 1 } });
  pm.on((e) => {
    for (const fn of listeners) fn(e);
  });
  pm.setTimeScale(speed);
}
start(params.get('preset') ?? 'adult', params.get('mode') === 'manual' ? 'manual' : 'modeled');

// e2e and devtools hook
Object.assign(window, { __pmeConsole: { ui, host, renderPath: () => pm?.renderPath, ready: true } });
```

- [x] **Step 4: Create the page** — `apps/demo/physiology-console.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Physiology console</title>
  <style>
    :root { --bg: #0b0d10; --panel: #12151a; --line: #232830; --text: #d7dce3; --dim: #7c8591; --up: #ffb347; --down: #5fc8ff; --diff: #d69cff; --ok: #6fd08c; --bad: #ff6b6b; }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); font: 12px/1.35 system-ui, -apple-system, 'Segoe UI', sans-serif; }
    #app { display: flex; flex-direction: column; height: 100vh; }
    button, select, input, textarea { font: inherit; color: var(--text); background: #1a1e25; border: 1px solid #2e3440; border-radius: 4px; padding: 2px 6px; }
    button { cursor: pointer; } button:hover { border-color: #4b5566; } button:disabled { opacity: .4; cursor: default; }
    input[type=number] { width: 58px; font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
    .pc-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 1px solid var(--line); background: var(--panel); }
    .pc-bar strong { font-size: 13px; margin-right: 4px; }
    .pc-t { font: 600 14px ui-monospace, 'SF Mono', Menlo, monospace; min-width: 48px; text-align: right; }
    .pc-sep { width: 1px; height: 18px; background: var(--line); margin: 0 2px; }
    .pc-stats { margin-left: auto; color: var(--dim); font-family: ui-monospace, 'SF Mono', Menlo, monospace; }
    [data-id=filter] { width: 170px; }
    .pc-body { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(520px, 42%) 1fr; }
    .pc-left { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--line); }
    .pc-monitor { height: 330px; flex: none; background: #000; }
    .pc-rail { flex: none; padding: 4px 8px; overflow: auto; max-height: 45%; }
    .pc-rail fieldset { border: 1px solid var(--line); border-radius: 4px; margin: 0 0 4px; padding: 3px 6px 5px; }
    .pc-rail legend { color: var(--dim); padding: 0 4px; }
    .pc-rail textarea { width: 100%; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 11px; }
    .pc-log { flex: 1; min-height: 60px; overflow: auto; margin: 0; padding: 4px 8px 8px 26px; border-top: 1px solid var(--line); font: 11px ui-monospace, 'SF Mono', Menlo, monospace; }
    .pc-log li { padding: 1px 0; } .pc-log time { color: var(--dim); } .pc-log .rej { color: var(--bad); } .pc-log .ok span { color: var(--ok); }
    .pc-log li[data-kind=mark] span { color: var(--dim); font-style: italic; } .pc-log .pending span { color: var(--dim); }
    .pc-organs { overflow: auto; padding: 6px 10px 20px; columns: 400px 3; column-gap: 12px; }
    .pc-sec { break-inside: avoid; margin: 0 0 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--panel); }
    .pc-sec > summary { cursor: pointer; padding: 3px 8px; font-weight: 600; letter-spacing: .02em; }
    .pc-count { color: var(--dim); font-weight: 400; margin-left: 6px; }
    .pc-sec table { width: 100%; table-layout: fixed; border-collapse: collapse; font: 11.5px/1.3 ui-monospace, 'SF Mono', Menlo, monospace; }
    .pc-sec td { padding: 1px 5px; border-top: 1px solid #1a1e25; white-space: nowrap; overflow: hidden; }
    .pc-sec td.k { text-overflow: ellipsis; font-family: system-ui, sans-serif; }
    .pc-sec td.v { width: 62px; } .pc-sec td.u { width: 66px; } .pc-sec td.b { width: 56px; } .pc-sec td.d { width: 56px; } .pc-sec td.s { width: 72px; }
    .pc-sec .par { color: var(--dim); margin-left: 6px; font-size: 10.5px; }
    .pc-sec td.v, .pc-sec td.b, .pc-sec td.d { text-align: right; }
    .pc-sec td.u { color: var(--dim); font-size: 10.5px; } .pc-sec td.b { color: var(--dim); }
    .pc-sec td.s { padding: 0 4px; } .pc-sec td.u { text-overflow: ellipsis; } .pc-sec canvas { display: block; width: 64px; height: 14px; }
    tr.up td.v, tr.up td.d { color: var(--up); } tr.down td.v, tr.down td.d { color: var(--down); } tr.diff td.v { color: var(--diff); }
    tr.up, tr.down, tr.diff { background: rgba(255,255,255,.035); }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/physiology-console/main.ts"></script>
</body>
</html>
```

- [x] **Step 5: Merge main, then add the build entry and the index link (one line each)**

7b and 7g insert their own page lines right beside 7a's (`stage7b: page('stage7b')`, `stage7g: page('stage7g')`, and
their `index.html` list items), so merge first (R51 §7) and edit the merged files:

```bash
git fetch origin && git merge origin/main
```

`apps/demo/vite.config.ts` — after the LAST `// Stage 7…` page line in `input` (today `        stage7a: page('stage7a'),
// Stage 7a`; after 7g merged, `        stage7g: page('stage7g'), // Stage 7g`) add:

```ts
        'physiology-console': page('physiology-console'), // Stage 7x
```

`apps/demo/index.html` — after the last Stage 7 list item (`stage7a.html` today, `stage7g.html` once 7g merged) add:

```html
      <li><a href="./physiology-console.html">Stage 7x: physiology console — every truth value by organ, with the monitor and an actions rail</a></li>
```

Keep every sibling line (additive merge, R51 §6); never re-type a line you are not adding.

- [x] **Step 6: Run the e2e and see it pass**

Run: `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/physiology-console.e2e.ts`
Expected: PASS in ≈ 27 s (the auto-baseline waits for sim 60 s); the log line `render path worker-raf; truth ~700
leaves, ~12500 B`; nine JPEGs in `docs/gates/stage-7x/` (`rest-*`, `phenylephrine-40s-*`,
`phenylephrine-changed-only-*`, each `-left`, `-organs-top`, `-organs-bottom`), each ≤ 60 KB (the test asserts it).
Open `rest-left.jpg` and `phenylephrine-40s-organs-top.jpg`: the monitor shows ABP/PLETH/CO2/TEMP; the SVR row reads
≈ 1 750 against a baseline ≈ 1 220 with an amber `+5xx` and a rising sparkline; the log shows one green line
`1:0x phenylephrine 100 mcg iv`.

- [x] **Step 7: Build and typecheck**

Run: `npx -y pnpm@9.15.9 --filter @pme/demo build` — Expected: `dist/physiology-console.html` and
`dist/assets/physiology-console-*.js` (≈ 29 KB, 11 KB gzip) in the output.
Run: `npx -y pnpm@9.15.9 --filter @pme/demo typecheck` — Expected: clean.

- [x] **Step 8: Commit and push**

```bash
git add apps/demo/physiology-console.html apps/demo/src/physiology-console/main.ts apps/demo/e2e/physiology-console.e2e.ts apps/demo/vite.config.ts apps/demo/index.html docs/gates/stage-7x
git commit -m "feat(console): physiology-console page — real monitor + truth tree by organ; e2e and gate screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 9: Gate — full verification, gate note, pull request

**Files:**
- Create: `docs/gates/stage-7x.md`
- Modify: this plan (tick the boxes)

- [x] **Step 1: Merge main and run everything**

```bash
git fetch origin && git merge origin/main
npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck
CI=1 npx -y pnpm@9.15.9 test
npx -y pnpm@9.15.9 build
npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
```

Expected: all green. `check-notices: OK` (no new third-party material). If a sibling stage merged in between
(7b, 7g…), its fields now appear on the page by themselves: re-run the 7x e2e, look at the organ sections, and record
in the gate note which new sections/fields appeared and whether the truth tree is still < 50 KB and not truncated. A
`truth-event` budget failure after a merge is NOT fixed by raising the cap: report it (the owning stage adds its
machinery to a SKIP list — Requests).

- [x] **Step 2: Write `docs/gates/stage-7x.md`** with these sections, filled with the numbers you measured:
  1. *What shipped* — the page, the accessor (`truthHz`, `pruneTruth`), the file list (the File map above).
  2. *Accessor budget* — leaves, dropped, JSON bytes (engine test and live page), `pruneTruth` ms per call, render
     path (`worker-raf`), read-only proof (twin-engine test), the fake-future-tree size.
  3. *Acceptance* — the e2e's SVR baseline → value and delta, the log line, MAP/HR/CO at +40 s; test counts per
     package (typecheck, `pnpm -r test`, build, check-notices, e2e list).
  4. *Screenshots* — embed `rest-left.jpg`, `rest-organs-top.jpg`, `phenylephrine-40s-organs-top.jpg`,
     `phenylephrine-40s-left.jpg`, `phenylephrine-changed-only-organs-top.jpg` with one sentence each.
  5. *Decisions* — D1–D12 one line each; *Deviations* — anything that differs from this plan and why.
  6. *For Ali* — what to try first (open `physiology-console.html`, pick a preset, give a drug, watch the amber/cyan
     rows, "changed only", export CSV), and the open questions below.

- [ ] **Step 3: Commit, push, open the PR**

```bash
git add docs/gates/stage-7x.md docs/gates/stage-7x
git commit -m "docs: Stage 7x gate note" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
gh pr create --base main --head stage-7x-physiology-console --title "Stage 7x: physiology developer console (truth tree by organ + monitor + actions rail)" --body "$(cat <<'BODY'
Implements docs/plans/stage-7x-physiology-console.md (R52). Gate note: docs/gates/stage-7x.md.

- New page apps/demo/physiology-console.html: the real monitor (any skin, worker) beside every physiologic truth value, grouped by organ (curated prefix map, generic discovery, "other" bucket), each with value, baseline, delta and a 60 s sparkline; changed rows highlight
- Actions rail: drug bolus / infusion / TCI / vaporiser (+N2O), fluids (free-text id), bleed, labs (send ABG/VBG), conditions with severity, lung conditions / mainstem / recruitment, ventilation, rhythm, MANUAL/MODELED, patient presets, raw JSON; change log; set/reset baseline (engine snapshot restore, auto at 60 s); JSON/CSV export and copy
- Change highlighting: 2 % by default, absolute tolerances for pH, temperature, saturation, PaCO2/EtCO2, K and lactate; within-beat values never highlight
- One additive engine accessor: opt-in `truth` event (`EngineOptions.truthHz`, ≤ 2 Hz, off by default) carrying a read-only pruned state tree (~13 KB, ~0.08 ms; ≤ 50 KB even with all 58 drugs given) that crosses the worker in the existing event batches
- Fields of 7b–7g appear without editing the page (tested with a fake tree and a realistic 7g pk tree)
- Tests: engine-core +11, demo +114 (incl. happy-dom page test), 1 Playwright e2e

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

- [ ] **Step 4: Tick every box in this plan, commit `docs: stage 7x plan fully ticked`, push. Do not merge (R21).**

---

## Requests to other stages and to the orchestrator (open questions)

1. **Brief §7.3:** the `truth` event is a new public event type (opt-in). Orchestrator: record it in the brief's event
   list, or keep it as a documented dev-tool event (it never appears unless `truthHz > 0`).
2. **Sibling stages' machinery (7b–7g):** their fields are VISIBLE by default. When a stage lands, its step indices
   (`blood.k`, `organs.m` …) are already flagged internal, and 7g's PK machinery is already listed
   (`pk.drugs.*.x|doses|bolusTimes`, `pk.bus.doses`, `pk.lastC|due|pending|macPrev`); other machinery sub-trees
   (e.g. 7d's 144-bin urine history is dropped by the prune) should be added — one line each, additive — to
   `INTERNAL_PREFIXES` in `organs.ts`, and a few clinical labels/units to `meta.ts`. Proposal: a short 7x.1 follow-up
   after Wave C, or each stage adds its lines in its gate task. The same stage adds keys to `truth.ts`'s SKIP lists
   if the truth tree approaches 50 KB (the busy 58-drug case already sits at 48.7 KB, truncated).
3. **Absolute tolerances for highlighting:** DONE here (R50 F2, D9): pH 0.02, temperature 0.2 °C, saturation one
   point, PaCO2/EtCO2 2 mmHg, K 0.2, lactate 0.3 [ENG]. Base excess and HCO3 still use 2 % (BE near 0 falls back
   to one displayed digit); Ali may add rows to `TOLERANCES` in `meta.ts` during calibration.
4. **Baseline timing:** auto-baseline at sim 60 s is [ENG] (R50 F8; was 15 s); Ali may prefer 30 s or "on first
   command". One constant (`autoBaselineS`).
5. **ECMO** has no owning stage yet; its paths will land in "other" until mapped.
6. **happy-dom** resolves from `apps/demo` only through Vitest's peer link. If the orchestrator prefers an explicit
   `devDependencies` entry in `apps/demo/package.json`, that is a lockfile edit outside this partition — a separate
   one-line PR.
