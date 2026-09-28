# FU-5: Monitor fidelity — signal quality, alarm semantics, technical alarms, NIBP, skins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-28 ≈ 16:30, R50 FIXER): REVIEWED — APPROVE WITH FIXES (R50 review 2026-09-28 11:38, 14 findings;
> the orchestrator's ten rulings, "Orchestrator ruling (FU-5 review), 2026-09-28", are APPLIED — D20 lists where).
> Re-prototyped on `cbefa63` and re-verified on a clean `origin/main` `3dccb11`: 262 blocks (241 edits, 21 creates),
> 0 problems, tree identical to the fixed prototype, typecheck clean (full and after Tasks 2/3/4/8/10/12);
> `audit:monitor` 43 scenarios reproduced line for line ("After the R50 review fixes"). New `it.fails` rows with numbers
> (Tasks 3, 13, 14); one new question for the orchestrator (Open question 20). Of the e2e, the three re-stated
> latched-APNEA tests were re-run (fu5-latched philips-like; fu5-fidelity suite 6 on both skins: 3 passed in 2.0 min).
> Earlier status (plan writer, ≈ 11:00, complete after two resumptions — the 9th cap and the 10th, weekly, cap): Every task that carries code (1–14, 16, 17) is PROTOTYPED; Tasks 0, 15 and 18
> are procedure. VERIFIED: the prototype was re-applied and re-run on `origin/main` `94040f7` (= `4f4ce06` + two
> `docs/RESUME.md` commits; FU-3 merged; the audit's base `7e0f44c` differs only in docs): 236 blocks (215 edits,
> 21 creates), every find matched exactly once in application order, tree identical to the prototype (Self-review). The prototype is
> a set of edit scripts that apply this document's find/replace and create blocks IN TASK ORDER and log them; the
> blocks below were rendered mechanically from that log, and a checker re-applied the rendered blocks to a fresh
> `origin/main` checkout and reproduced the prototype tree byte for byte (see "Self-review"). Tasks marked
> UNPROTOTYPED would carry exact code that was not run (none remain). Added on the second resumption: the research/11
> glossary labels (D19, Task 11), the research/12 coverage cells (Task 18 §8, R-FU5-7), a chain fix found by the
> after-report (D6: 22 zero-length HR HIGH flickers in Ali's case), the e2e numbers and "Prototype results".
> FU-4 ("integration polish", physiology) runs IN PARALLEL on its own branch: every block here was checked against
> `origin/main` only. A block that no longer matches after `git merge origin/main` means FU-4 (or V.1) moved a line:
> re-anchor by the quoted comment or statement, keep both sides, never "fix" a test by loosening it (R45).

**Goal:** Make the simulated bedside monitor show what a real Philips-, Mindray- or Saadat-class monitor shows when the
patient's physiology goes to the edges — research/10's audit (37 scenarios, 16 ranked gaps M1–M16) closed at the
device layer. After FU-5: (M1) the pleth and PI follow the stroke volume against the RESTING stroke volume, so a 3 L
bleed at MAP 2 no longer shows SpO2 98 / PI 2.5, and SpO2 is never "valid" on a single pleth foot; (M2) one apnoea
raises exactly one APNEA, and latching is the vendor's (philips-like #H30: visual red, audible off; mindray-like and
saadat-like: none; IEC default: lethal arrhythmias visual only) with a latched presentation distinct from a live
alarm, never hidden by a live one (philips-like rotates every active message) and never suppressing a lower alarm; (M3) ECG leads off shows "-?-" and falls back to the pulse per the skin's HR source, and LEADS OFF stays
visible under a red alarm; (M4) the cuff measures a narrow pulse pressure with an adequate MAP and still fails in real
shock, with the skin's inflation/STAT rules; (M5) the arterial numerics never re-average pre-arrest beats and a
non-pulsatile line is shown as the skin shows a static pressure (Philips: S/D/M kept, pulse "-?-"; Saadat: mean only)
with a technical mark; (M6) limit alarms compare the DISPLAYED value with a
one-unit hysteresis and print it with the tile's decimals; (M7) chained alarms are suppressed by priority; (M8)
technical alarms are raised by real conditions (SpO2 non-pulsatile / low perfusion, ART non-pulsatile / disconnect /
zeroing, temperature probe off, CO2 line); (M9) Silence follows the vendor (Philips/Mindray acknowledge, ZOLL/Saadat
timed mute); (M10) impedance RR ignores the cardiac overlay; (M11) every behaviour a skin declares is wired or removed
with a note, and mindray-like gets its documented limit table; (M12–M16) the smaller items. The audit's 15-scenario
fidelity suite becomes tests (device-level Vitest + Chromium-only Playwright screenshots), its harness becomes
`pnpm audit:monitor`, and an e2e reproduces the FU-3 gate screenshot (a live-looking, audible "APNEA (RESP)" over a
breathing capnogram) and shows it fixed.

**Architecture:** Two chains, both on the device side of the truth line. (1) The SIGNAL-QUALITY chain: truth stroke
volume → pleth pulse amplitude against the resting SV (the one L2 line FU-5 owns, `l2/hemo/pipeline.ts`) → pleth beat
detector (fresh beats only) → PI, pulse rate, SpO2 validity (a COMPLETED pulse, not a foot) → the technical
conditions (NON-PULSAT., LOW PERF) → the tile glyphs ("97?", "-?-"). The arterial line runs the same chain (fresh
beats → pulsatile rule with amplitude hysteresis → the skin's static display + NON-PULSATILE / DISCONNECT). (2) The ALARM chain: conditions (displayed values
with hysteresis; one APNEA from the active respiratory source; the chain table) → the manager's per-skin life cycle
(latching visual/audible, acknowledge-or-mute Silence, `sounding`) → `alarmStatus` → the renderer (message bar with a
distinct latched style and a visible INOP, tile glyphs, the audio bridge playing only `sounding` entries). Every
per-vendor number lives in the skin JSON with provenance; the engine reads it through `deviceProfile`.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Playwright 1.63 (system Chrome locally, bundled Chromium on CI),
pnpm 9.15.9 via `npx`. No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **"Monitor-fidelity audit
delivered"** and **"Ruling — FU-5 'monitor fidelity' opened"** (2026-09-28 00:08; ownership, latching, chaining,
technical alarms), **R45** (mechanisms, never band changes), **R50** (review before execution), **R51** (drug-layer
contract; here: FU-5 changes no physiology), **R53** (integration polish; FU-4 owns physiology), **CI amendment 4**
(yield per sim-MINUTE), **G-FU3** ruling 7 (the latched "APNEA (RESP)" screenshot), the 9th-cap note (this plan's
resumption). Audit: `../research/10-monitor-fidelity-audit.md` (§0–§14) and `../research/10-audit-scripts/`. Vendor
behaviour: `../research/05-rendering-ux-integration.md` (§2.4–2.7 and its manuals [S1] Philips IntelliVue
Configuration Guide Rel. J, [S2] Philips IntelliVue MP40–90 IFU, [S4] Mindray BeneVision N Operator's Manual, [S5]
ZOLL X, [S6] LIFEPAK 15 — page numbers below were read in those PDFs), `../research/06-saadat-alborz-b9.md` (§3–§6).
Gate notes read: `docs/gates/stage-4a.md`, `stage-4b.md`, `stage-7x.md`, `fu-3.md`. Boundary read:
`../research/08-physiology-integration-audit.md` and `docs/plans/fu-4-integration-polish.md` (untracked, being fixed
in parallel). Added since the plan was started: **R54–R59** and **"Inventory, glossary and coverage matrix
delivered"** (2026-09-28 05:57) with the **glossary collision rulings (R56)** — `../research/11-capability-inventory-
and-glossary.md` §5 is the single label source (D19; its §4 item 7 is this plan's M11 list) and
`../research/12-coverage-matrix.md` §4.3/§7 lists the audit-10 cells FU-5 owns (Task 18 §8, R-FU5-7).

## Global Constraints

- **R45:** mechanisms, never band changes. No existing acceptance band is widened, removed or re-worded to pass. A
  band a mechanism cannot reach stays (or becomes) `it.fails` with the measured number in its title. FU-5 changes
  DEVICE behaviour on rulings (one apnoea → one alarm; latching per vendor; Silence per vendor; HR invalid with the
  leads off; the Philips non-pulsatile rule): a test that encoded the old device behaviour is RE-STATED with the new
  behaviour and its source in the title, never loosened — each such edit is listed in its task under "R45 re-statement"
  and in the gate note. A re-measured number (e.g. an SpO2 timing that moved because the pleth now follows the stroke
  volume) is written into the test title with the new number.
- **R51 / the FU-4 boundary (ruled 2026-09-28):** FU-5 changes NO physiology (no L1, no truth, no L2 model). FU-5 owns
  L3 (`packages/engine-core/src/l3/**`), the renderer, skins, audio and exactly these L2 signal-quality lines, declared
  as exceptions:
  - **E-FU5-1** `l2/hemo/pipeline.ts`, the pleth pulse amplitude (`addPlethPulse(… op.sv / svRef …)` in
    `advanceHemo`): SV against the settled RESTING SV (`c.ref.sv`, the brief's `SV_0`) and, in MODELED only, a
    vasoconstriction factor from the systemic resistance capped at 1 (read, never written). Accepted by the R50 review
    WITH the finding-1 fix (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 1): the uncapped factor made PI RISE
    as MAP fell on the MANUAL ladder and fall 29 % after propofol; the factor is now ≤ 1 and absent in MANUAL, and FU-4
    is asked for the real input (R-FU5-9).
  - **E-FU5-2** `l2/resp/pipeline.ts`, the oximeter's pulse input (`lastFootT` = the end of the last COMPLETED pleth
    pulse, not a lone foot) and the per-skin SpO2 averaging/update fields on `Spo2State`.
  - **E-FU5-3** `l2/hemo/pipeline.ts` `emitSecond`: `pr` from the pleth only, the arterial line's own `prAbp`
    ("-?-" whenever the line is non-pulsatile, whatever the skin shows for S/D — review ruling 3), no pressure numerics
    while a zero runs (the ART pulsatility itself is L3 `pressure-numerics`).
  - **E-FU5-4** `l2/hemo/line.ts`: the display filter corner from the skin (`ibp.filterDefaultHz`; Philips 12 Hz,
    Saadat 16 Hz) — a monitor setting, the transducer model is untouched.
  - **E-FU5-5** `l2/resp/pipeline.ts`: the impedance detector receives the beat times (cardiac-overlay rejection);
    the capnograph sensor state `'occluded'` (a CO2 line fault the instructor can cause) and its invalid numerics.
  - **E-FU5-6** `engine.ts`: the HR numeric is invalid while the leads are off (the ECG measures nothing); the device
    host exposes the sensor states the alarms need; `syncCo2Sampler` applies the skin's device settings.
  Anything else in `l1/**`, `l2/**` (circulation, lungs, gas, blood, organs, endocrine, neuro, PK, ECG generation) is
  FU-4's or a later stage's. If a fidelity test fails because the TRUTH is wrong (research/10 §9, T1–T8), it stays
  `it.fails` with the number and a "truth: FU-4 …" note; FU-5 never tunes a device constant to hide a truth error.
- **Base:** branch `fu-5-monitor-fidelity` from `origin/main` — any docs-only descendant of `94040f7` (= `4f4ce06`,
  FU-3 merged, + `docs/RESUME.md` commits; the fixer re-applied the blocks on `cbefa63`; if FU-4 or another stage has
  merged code since, follow Task 0 Step 1). Worktree
  `projects/patient-monitor-engine/scratch/wt-fu-5` (R25: never the shared checkout). Push after every commit
  (`git push -u origin fu-5-monitor-fidelity` the first time, `git push` after). Never push to `main`, never merge
  (the gate task opens the PR and stops). No `git stash` (commit or discard instead). Scratch files only under
  `<scratchpad>/fu-5-monitor-fidelity/`. Every wait on a long command is bounded (an `until` loop of ≤ 10 min that
  re-checks the process, then re-enters); long runs go to the background with a log.
- **FU-4 runs in parallel** (physiology, `fu-4-integration-polish`). Shared files — whichever lands second merges
  `origin/main` and KEEPS BOTH SIDES:
  - `package.json` scripts and `.gitignore`: FU-4 Task 1 adds `audit:physiology` after the same `"relay": "pme-relay"`
    line FU-5 Task 1 anchors on — the merge keeps both scripts and both ignore lines.
  - `packages/engine-core/src/l2/hemo/pipeline.ts`: FU-4 edits `emitSecond`'s coronary/arrest block, the state event,
    the tamponade fields; FU-5 edits the pleth-amplitude lines in `advanceHemo` and the numerics part of `emitSecond`
    (different lines).
  - `packages/engine-core/src/l2/resp/pipeline.ts` (FU-4 Tasks 15, 18: dead space, warm air; FU-5: the SpO2 input,
    the impedance call, the CO2 sensor state) and `packages/engine-core/src/engine.ts` (FU-4 Tasks 11–13, 16: aliases,
    stimulus observer, `automaticityAt`, `ext.tempC`; FU-5: the HR emission, the device host, `syncCo2Sampler`).
  - `packages/engine-core/vite.config.ts` and `.github/workflows/ci.yml`: FU-4 Task 20 splits the SLOW set into
    `SLOW_A`/`SLOW_B`. FU-5 adds one SLOW entry, `test/engine/fidelity-*.test.ts`; after the merge it goes into exactly
    one of the two groups — the fidelity files total ≈ 62 s locally (the writer's run: 15.2 + 15.6 + 10.1 + 13.8 +
    3.0 + 4.7 s; the fixer's run of all six after the review fixes: 55 tests in 55 s wall), roughly +4 min on the ≈ 4×
    slower CI runner, inside `test-slow`'s 90 min cap (it ran 47–52 min). FU-4's `SLOW_B = SLOW − SLOW_A` puts the
    entry in SLOW_B automatically (verified by the review in the merged `vite.config.ts`) — the groups stay disjoint.
  - `packages/engine-core/test/engine/circ-hypoxic-arrest.test.ts`, `resp-oxygen.test.ts`: FU-4 re-measures them for
    its arrest; FU-5 only if its SpO2/PR validity moves a timing (Task 15 lists what it measured on `origin/main`).
  - After FU-4 merges, the fidelity tests that depend on the truth (research/10 §9: the arrest now happens in the
    bleed and in Ali's case) are re-run; a device criterion still holds on the new truth or the executor reports.
- **CI rules:** CI amendment 4 — any `advanceTo` loop longer than one sim-hour yields per sim-MINUTE with
  `setImmediate` (the fidelity rig `test/helpers/monitor.ts` advances 1 sim-s per step and yields every 60 sim-s; no
  FU-5 run exceeds 45 sim-min). Long-run horizons (none in FU-5) use `test/helpers/longrun.ts`. New engine scenario
  tests live in `test/engine/fidelity-*.test.ts`, which the SLOW set lists (Task 3 adds the entry). Renderer tests
  keep the package's `testTimeout` 30 s. Heavy e2e (screenshots, multi-minute sim runs) are Chromium-only
  (`test.skip(browserName === 'webkit', …)`); every committed PNG ≤ 60 KB (clip + `deviceScaleFactor` 0.7–0.8, check
  with `wc -c`). **E2E time budget (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 10):** FU-5 adds 8
  Chromium-only e2e tests (6 in fu5-fidelity, 2 in fu5-latched; timeouts 300–420 s at time × 4, CI retries 2; 14 e2e
  tests took 11 min locally on a loaded Mac). The `build` job ran 27–33 min before FU-5: Task 18 records the CI e2e
  wall time, and if the `build` job exceeds 45 min, the fu5 evidence tests move behind `PME_EVIDENCE=1` (run locally
  for the gate, their PNGs committed) and CI keeps one smoke per skin (suite 6 on philips-like and saadat-like). The tick bench (`packages/validation/test/perf/tick-bench.test.ts`) must still pass (p50 < 6 ms on
  CI, < 2 ms local): FU-5 adds per-tick work in `buildConditions`/`stepAlarms` only (measured in Task 15).
- **Pull request:** title `FU-5: monitor fidelity — signal quality, alarm semantics, technical alarms, NIBP, skins`;
  never self-merged (Ali speaks the merge). Every commit ends with the attribution trailer from the EXECUTOR'S OWN
  session instructions, with its own model name — written `<the Co-Authored-By trailer line from the executor's own
  session instructions>` in the commit steps below, never hard-coded (Orchestrator ruling (FU-5 review), 2026-09-28,
  ruling 9; the orchestrator's guidance names Fable); the PR body ends with
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Partition (binding): edit ONLY the files a task's Files block lists.** Summary:
  - L3: `packages/engine-core/src/l3/{alarms/{conditions,manager,profile,text},hr,device-layer,spo2/spo2,
    pressure-numerics/numerics,pulse/detector,nibp/nibp,resp/impedance,co2-numerics/co2-numerics}.ts`.
  - Engine glue: `packages/engine-core/src/{engine,types,types-device}.ts` (E-FU5-6; `types.ts` only the `prAbp`
    numeric id).
  - L2 signal-quality exceptions: `l2/hemo/{pipeline,line}.ts`, `l2/resp/pipeline.ts` (E-FU5-1…5, the lines named).
  - Skins: `packages/skins/src/{types,schema,resolve}.ts`, `packages/skins/src/data/base/iec-defaults.json`,
    `packages/skins/src/data/skins/{philips-like,mindray-like,saadat-like}.json` (lifepak-like is no longer touched: its
    documented NIBP mode fields stay, review ruling 5),
    `packages/skins/CONTRACT.md`, the regenerated `packages/skins/test/__snapshots__/resolve.test.ts.snap`.
  - Renderer: `packages/renderer/src/{device-ui,alarm-view,alarm-audio}.ts`.
  - Tooling: `scripts/audit-monitor/**` (new), `package.json` (one script), `.gitignore` (one line),
    `packages/engine-core/vite.config.ts` (one SLOW entry).
  - Demo/e2e: `apps/demo/e2e/{fu5-fidelity,fu5-latched}.e2e.ts` (new), `apps/demo/e2e/stage4b-device.e2e.ts` (the
    philips-like Silence and flash-rate steps).
  - Tests: the new files named in the tasks; edits to existing tests only where a task names them.
  - Gate: `docs/gates/fu-5.md`, `docs/gates/fu-5/**`, this plan (ticks).
  - **Never touch:** `l1/**`, `l2/**` outside the E-FU5 lines, `packages/audio/src/**` (no change needed: the bridge
    decides what sounds), `packages/controller/**`, `packages/validation/src/**`, `pnpm-lock.yaml`, `docs/physiology/**`,
    the other stages' committed gate evidence (the e2e run rewrites `docs/gates/stage-4b/*.png`: restore them).

## Decisions (made while prototyping; the executor does not revisit them)

Vendor sources: **[S1]** Philips IntelliVue Configuration Guide Rel. J, **[S2]** Philips IntelliVue MP40–90 IFU,
**[S4]** Mindray BeneVision N Operator's Manual (research/05 §6 lists the URLs; the page numbers below are the
printed pages, read in the PDFs while prototyping), **[06]** research/06 (Saadat B9 manual "M p."), **[brief]**
DESIGN-BRIEF, **[ruling]** research/00 "FU-5 opened" (IEC 60601-1-8 conventions where the vendor is silent).

- **D1 — pleth amplitude (E-FU5-1, audit M1):** a pulse's amplitude is `PI_target × tone × SV_i / SV_0` with `SV_0`
  the settled RESTING stroke volume `c.ref.sv` (the brief §4.3 formula) — no longer the running mean of the last 16
  beats, which drew a 0.6 mL beat as a normal pulse. In MODELED, `tone = clamp(√(R_rest / R_sys), 0.25, 1)` lowers the
  pulse under vasoconstriction only [ENG exponent 0.5]; it is never above 1, and in MANUAL it is 1 (the instructor's PI
  target is the peripheral state; the MANUAL tracker's SVR is a means to reach a MAP, not a vasomotor state). Truth
  untouched: both resistances are read. **Orchestrator ruling (FU-5 review), 2026-09-28, ruling 1:** the first version
  (`clamp(…, 0.25, 2)`, in both modes) moved PI the WRONG way — on the MANUAL ladder PI rose as MAP fell (1.92 → 2.18
  at MAP 62) because the tracker lowers MAP by lowering SVR, and after propofol it fell 29 % although clinically PI
  RISES after induction (sympatholysis); the Philips IFU says the pleth is "NOT directly proportional to the pulse
  volume … use the perfusion indicator" ([S2] p. 119) and finger PI follows the cutaneous vasomotor tone, which the
  engine does not yet publish. Re-measured with the fix (prototype, seed 7): MANUAL ladder PI 1.84 / 1.82 / 1.53 /
  1.18 / 1.16 / 0.03 at MAP 106 / 99 / 61 / 45 / 44 / 38 (falls as MAP falls; the test guards it); propofol (D3) PI
  1.82 → 1.43 (100–140 s) → 1.16 (220–260 s), still −36 % — PI follows SV only, so the clinical rise is an `it.fails`
  until FU-4 publishes a cutaneous tone (R-FU5-9); normal patient at rest: MODELED spontaneous 1.82 (origin/main
  1.79, +2 %), MANUAL ventilated 1.84 (1.70, +8 %), MODELED ventilated 1.49 (1.80, −17 %: `SV_0` is the stabiliser's
  spontaneous settle, 80 mL, against 68 mL under PPV) — the ventilated rows are `it.fails` with these numbers.
- **D2 — SpO2 validity (E-FU5-2, audit M1):** the oximeter's pulse clock is the end of the last COMPLETED pleth pulse
  (a lone foot no longer keeps SpO2 valid); PI, PR and the pressures average FRESH pulses only (≤ 6 s). PI < 0.3 %
  keeps the value questionable ("97?", brief §4.3) and raises SpO2 LOW PERF after 5 s; no pulse for 10 s makes it
  invalid and raises SpO2 NON-PULSAT. ([S2] p. 59: "Numeric is replaced by -?-"). The averaging window and display
  update are the skin's: philips-like 10 s / 2 s ([S1] p. 66; [S2] p. 301), saadat-like and the IEC default 8 s /
  1 s (unchanged). SpO2 0–10 % in severe hypoxaemia with a pulse (audit M15) is left: [S2] gives a 0–100 %
  measurement range; with no pulse the value is `--` by the rule above (FU-4's hand-over G14, "0 % instead of --",
  is this case) — Open question 14.
- **D3 — latching per vendor (audit M2, Q1; the ruling):** skin `alarms.latching: { visual, audible }` with
  `'off' | 'lethal' | 'red' | 'redYellow'`. philips-like = the #H30 (OR) factory setting **visual Red, audible Off**
  ([S1] p. 135–136; behaviour [S2] p. 39–40: message kept, numerics flashing, tone and lamp stop); mindray-like
  **off** ([S4] §39.4.3, default Unselected); saadat-like **off** (research/06 §4.2, unverified); every other skin
  (IEC default: zoll-, lifepak-, ge-like) **lethal/off** — the ruling's IEC convention: ASYSTOLE, VFIB, VTAC and the
  extreme rates latch VISUALLY until acknowledged, limit alarms do not, audio stops when the condition clears. INOPs
  never latch ([S2] p. 40). An acknowledged alarm whose condition ends clears. A latched message is drawn in a
  DISTINCT style (the level's colour as text on the idle bar, framed; lamp off; no tone) — [ruling] (research/00
  "FU-5 opened": "a distinct latched presentation"), not [S2]: Philips keeps the message and the flashing numerics
  ([S2] p. 40) and documents no style change. #H30 is the ANAESTHESIA option ([S1] p. 42, 135–136); the ICU, neonatal
  and cardiac options (#H10/H20/H40) latch Red&Yellow visually AND audibly — an ICU IntelliVue behaves differently.
  **Presentation decided (Orchestrator ruling (FU-5 review), 2026-09-28, rulings 4 and 8):** a latched red is never
  hidden by a live alarm — on philips-like it stays in the 2 s rotation of every active message (D15), on the other
  skins it is the top of the pool; the lamp and the tone come from live entries only.
- **D4 — Silence per vendor (audit M9, Q6):** skin `alarms.silence.mode`: `'acknowledge'` on philips-like ([S2] p. 11,
  32: "acknowledges all active alarms and INOPs"; new alarms sound at once, no countdown, no timer) and mindray-like
  ([S4] §10.8 Alarm Reset); `'mute'` on saadat-like (120 s incl. the visuals, any new alarm ends it, research/06
  §4.2) and on the IEC default (ZOLL 90 s, research/05 §2.6 [S5]). philips-like Pause = 2 min ([S1] p. 135–136).
- **D5 — one apnoea, one alarm (audit M2, M10, Q7):** only the ACTIVE respiratory source alarms — the capnograph while
  it measures (CO2 sensor `'on'`), else the impedance ([S2] p. 41 "***APNEA from CO2, Resp or AGM"; the Saadat
  CAPNO/RESP key selects one RR source, research/06 §4.1). The alarm keeps its source's id (`apnoea-co2` /
  `apnoea-resp`: 8a's gate documents and the engine tests read them); the IEC text is "APNEA" for both (the old
  "APNEA (RESP)" is gone), Saadat keeps "CO2 APNEA" / "RESP APNEA". The skin's apnoea times are wired: saadat-like
  RESP 10 s, CO2 20 s.
- **D6 — the chain table (audit M7, Q3; the ruling):** `conditions.ts` `CHAIN`: ASYSTOLE ⊃ HR LOW, EXTREME BRADY,
  BRADY, PAUSE, PVCs; VFIB ⊃ VTAC, HR HIGH/LOW, EXTREME TACHY/BRADY, TACHY, BRADY, PAUSE, PVCs; VTAC ⊃ HR HIGH,
  EXTREME TACHY, TACHY, PVCs; EXTREME TACHY ⊃ HR HIGH, TACHY; EXTREME BRADY ⊃ HR LOW, BRADY; APNEA ⊃ RR LOW, awRR
  LOW, EtCO2 LOW; ABP DISCONNECT ⊃ ABP LOW. Sources: the arrhythmia and rate chains [S2] p. 97, 99 ("only the
  highest priority alarm condition in each chain is announced … lower priority alarms in the same chain will not be
  announced while an alarm is active"); the same-measurement chains (APNEA ⊃ RR/awRR/EtCO2 LOW, ABP DISCONNECT ⊃ ABP
  LOW) [S2] p. 29 ("if more than one alarm condition is active in the same measurement, the monitor announces the most
  severe"); on saadat-like and the IEC skins the non-arrhythmia chains are [ruling] (research/00 "FU-5 opened":
  "chained alarms suppressed by priority"). A suppressed alarm is CLEARED, never latched. **A suppressor is a parent
  whose CONDITION is present this tick, or whose entry was LIVE (raised, not latched) at the previous tick** — the
  latter closes the one tick in which a parent's condition has ended before its entry latches (22 zero-length
  `**HR 140>120` raise/clear pairs in Ali's case). **A LATCHED entry never suppresses** (Orchestrator ruling (FU-5
  review), 2026-09-28, ruling 2): a latched alarm's condition has ended, and Philips inhibits lower alarms only "if a
  more serious alarm condition is active" ([S2] p. 97, 99) — so a post-ROSC bradycardia under a latched ASYSTOLE
  alarms (and sounds), and a VT after a latched VF raises VTAC. The first version let an unacknowledged latched entry
  suppress lower alarms; on philips-like that kept HR LOW, BRADY, PAUSE and EXTREME BRADY silent after ROSC until
  someone acknowledged — withdrawn (Open question 15 decided). Members are ranked by CHAIN POSITION, not level: a
  parent suppresses every member it lists (ASYSTOLE and EXTREME BRADY are both red). The extreme rates keep the event
  hold (≥ 5 s once raised, as PAUSE) [ENG], so HR hovering at the extreme threshold does not chatter a red alarm.
  **Agonal / PEA (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 6):** once ASYSTOLE stands, an agonal beat
  (an R–R ≥ 2.5 s: agonal < 20/min, research/03 §1.5, less the detector's timing of a wide complex [ENG]) does not end
  it; two beats closer than that (a rhythm returning) do. So an agonal rhythm shows ONE arrest alarm: the merged
  FU-4 tree raised EXTREME BRADY 11 times in Ali's case (each agonal beat ended ASYSTOLE and let EXTREME BRADY
  re-raise), and on this base a MANUAL agonal rhythm re-raised ASYSTOLE 15 times in 4 min on mindray-like (no
  latching; the first prototype: philips-like ASYSTOLE ×1 + EXTREME BRADY ×3, mindray-like ×15 + ×3); prototype after: ASYSTOLE ×1 on philips-, mindray- and saadat-like, EXTREME BRADY and HR LOW ×0; a
  pulseless idioventricular 15/min (R–R 4 s, no asystole) raises EXTREME BRADY once. The QRS detector fires twice
  (0.12 s apart) on a wide agonal complex; the agonal R–R skips the second detection (as the mean R–R already does).
- **D7 — extreme rates (audit Q13):** EXTREME BRADY/TACHY alarm with arrhythmia analysis OFF too ([S2] p. 89 "HR alarms
  when arrhythmia analysis is switched off": asystole, VF/VT, extreme tachy/brady, HR high/low). Thresholds: the HR
  limit ∓ 20 clamped 40/200 ([S1] p. 50, unchanged) or the skin's absolute limits (mindray-like 160/35, paed
  180/50, neo 220/60, [S4] App. C.1.1). One bpm of hysteresis, the event hold (≥ 5 s once raised, as PAUSE) and a 5 s
  clear delay (a live extreme alarm ends only after 5 s back inside its threshold, `EXTREME_CLEAR_S`) [ENG] (review
  F9, ruling 6): with latched alarms no longer suppressing (D6), each 1–2 s dip of an AF 150 HR below 140 ended
  EXTREME TACHY and let `**HR` HIGH blip — 13 raises in 3.5 min in C2; with the clear delay 3 (the sustained dips). "Lethal" (the IEC-default latching set: asystole, VF, VT, extreme rates) is Mindray's "High,
  unadjustable" arrhythmia group ([S4] App. C.1.1.2). mindray-like's V-Tach run is 6 PVCs ([S4] App. C.1.1.2 "V-Tach
  PVCs 6"; was the IEC 5, tagged [ENG]) — Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5. mindray-like's
  PAUSE alarm is OFF by factory default ([S4] App. C.1.1.2: Pause, Tachy and Brady off; Run PVCs and PVC off outside
  the CCU) — the new skin switch `arrhythmia.pauseAlarm` (IEC default and saadat-like on); the engine's mindray-like
  has no BRADY/TACHY, and its PVCs/min stays with arrhythmia analysis (recorded in the provenance note) — ruling 5.
- **D8 — HR source (audit M3, M16, Q4):** with the leads off the HR numeric is INVALID (never "0") and the R–R history
  restarts; an R–R > 6 s also restarts it (no "3" after an asystole) [ENG]; the asystole "0" follows the skin's
  asystole time. philips-like `hr.source` AUTO (the [S1] p. 50 default "Alarms Source Auto"): the first valid pulse
  (ART, then SpO2) becomes the ALARM source ("**Pulse 130>120"; the extreme rates from it) while the HR tile shows
  "-?-" ([S2] p. 55, 108) — the pulse stays in its own tile; saadat-like AUTO relabels the HR tile "PR" with the
  pulse (research/06 §4.1); mindray-like AUTO too — "HR/PR Alarm Source: Auto" is its factory default ([S4] App.
  C.1.1.1 and C.1.3; RR Source Auto, C.1.2) — the pulse becomes the alarm source with the leads off, the HR tile keeps
  its "HR" label (`relabelNonEcgAs` null, inherited) and the pulse stays in the SpO2 tile (Orchestrator ruling (FU-5
  review), 2026-09-28, ruling 5; it inherited the IEC "ECG" source, which showed "---" and raised no rate alarm with
  the leads off); the IEC default (source ECG) shows "---" and raises no HR alarm. The SpO2 tile's PR is the pleth's
  own rate only (M12).
- **D9 — limit hygiene (audit M6, M14, Q8):** limit alarms compare the DISPLAYED value (the tile's decimals: TEMP and
  ST one, the rest none) and keep one display unit of hysteresis (raised when beyond the limit, cleared when back
  inside by a full unit) [ENG: no vendor publishes a hysteresis]; the text prints that value and limit with those
  decimals ("**Temp 35.9<36.0"); a questionable value raises no limit alarm; mindray-like applies its documented 6 s
  alarm delay ([S4] §10.6.5, §39.4.6). philips-like keeps delay 0 ([S2] p. 299–305 give only maximum detection
  latencies, 10–14 s).
- **D10 — technical alarms (audit M8, Q11):** raised by real conditions, level 3 unless stated, with the vendor's
  text: SpO2 NON-PULSAT. (probe on ≥ 15 s acquisition, SpO2 invalid; [S2] p. 59) / "SPO2 NO PULSE" [inferred];
  SpO2 LOW PERF / "SPO2 LOW PERFUSION" [06] — the INOP is [S2] p. 58, its 0.3 threshold [S2] p. 120 ("below 0.3 is
  marginal"; p. 58 gives no threshold) — raised at PI < 0.3 held 5 s, cleared at PI ≥ 0.4 or after 5 s at PI ≥ 0.3,
  and held while the PI numeric is momentarily invalid with the SpO2 still shown (no fresh pulse for a few seconds)
  [ENG]; NON-PULSAT. clears only after 2 s of a valid SpO2 [ENG] — both clear hysteresis rules are Orchestrator ruling
  (FU-5 review), 2026-09-28, ruling 5 (review F7: LOW PERF raised/cleared 7 times in 1–2 s cycles at 1 268–1 339 s of
  the 3 L bleed); ABP NON-PULSATILE (static pressure; [S2] p. 57) / "IBP1 STATIC PRESSURE" [06]; ***ABP DISCONNECT,
  level 1 physiological (static and mean < 10 mmHg for 5 s; [S2] p. 44) / "IBP CATHETER DISCONNECT" [06], behind the
  new skin switch `alarms.abpDisconnectDefault`: ON for philips-like and the IEC default ([S2] p. 44), OFF on
  saadat-like ("ART catheter-disconnect alarm (level 1) OFF by default", research/06 §4.1; Saadat's factory parameter
  alarms are all off except the four `alwaysOn`) — ruling 5; "IBP1 STATIC PRESSURE" (technical) stays on; ABP ZEROING (brief §6.4; numerics invalid while a zero runs);
  TEMP NO TRANSDUCER ([S2] p. 62) / "TEMP NO CABLE" [inferred] — only after the probe was once on; CO2 OCCLUSION
  ([S2] p. 53) / "CO2 CHECK LINE" from the new capnograph state `'occluded'` (the first emitter of the old dead
  `co2Line` condition). An INOP marks its numeric: the tile shows the skin's `glyphs.inop` ("-?-" philips-like) and
  does not flash.
- **D11 — ART numerics (audit M5):** fresh beats only (≤ 6 s); pulsatile = ≥ 2 fresh beats, amplitude ≥ 3 mmHg, rate
  ≥ 25/min ([S2] p. 57, the Philips NON-PULSATILE rule); otherwise a STATIC pressure, shown PER SKIN (Orchestrator
  ruling (FU-5 review), 2026-09-28, ruling 3) through the new skin field `ibp.staticDisplay`: **`'keep'`** —
  philips-like and the IEC default — systolic, diastolic and mean stay displayed (max/min/mean of the last 2 s: a flat
  line reads "20/19 (20)") and only the pulse numeric goes "-?-" ([S2] p. 57, pdf 75: "Pulse numeric is displayed with
  -?-"; the limit alarms continue on S/D/M); **`'mean-only'`** — saadat-like — S/D invalid, the 2 s mean shown
  ("static pressure", research/06 §4.1). The first version hid S/D on every skin, so each flip to static cleared and
  re-raised the S/D LOW alarms (Ali's case: `ART_S_LOW ×12, ART_M_LOW ×12, ART_D_LOW ×10, abpNonPulsatile ×10`). ABP
  NON-PULSATILE is raised on every skin whenever the line is static — an IntelliVue raises it only for the pressure
  selected as the pulse source [ENG choice, tagged in the code]; on `'keep'` it marks `prAbp`. A starting line searches
  10 s before calling itself static (no `ABPd 0<50` at power-on). Leaving static needs amplitude AND time hysteresis
  [ENG]: 3 s (REPULSE_S) of beats with an amplitude ≥ 4 mmHg (REPULSE_AMP_MMHG; static below 3 mmHg) — one ventilator
  swing flipped the INOP every 5 s at MAP 13, and PP 3–4 mmHg flipped ≈ 10 times in 11 min on the single 3 mmHg
  threshold. Re-measured in Ali's case (A2, prototype): `ART_S_LOW ×3, ART_M_LOW ×12, ART_D_LOW ×1,
  abpNonPulsatile ×1` (was ×12/×12/×10/×10; origin/main ×5/×71/×3/–): the static-flip chatter is gone and the
  static line reads e.g. "16/13 (14)" with S/M/D LOW standing. The remaining ART_M_LOW raises are NOT flips: the
  displayed mean hovers 69–71 on its limit of 70 under PEEP 15 (1 462–1 500 s and 1 677–1 757 s, raise/clear cycles of
  2–10 s) — the same limit-hover chatter as the CVP rows (D9's one-unit hysteresis is smaller than the ventilatory
  swing of the mean), recorded as an `it.fails` in Task 14 with the CVP one (review ruling 5).
- **D12 — NIBP (audit M4, Q5):** the oscillation peak is `Amax = 4·tanh(PP/50)` mmHg (the arterial volume pulse under
  the cuff on a sigmoid P–V curve: Drzewiecki 1994, Babbs 2012) [ENG fit to the brief's 1–4 mmHg]; `A_DETECT` 0.1,
  `A_MIN_ENVELOPE` 0.3; `MIN_SBP` 50 kept. PP 10 at MAP 70 measures; MAP 13 / PP 3 fails after 2 attempts. The
  alternative "linear 0.05·PP with the lower floors" (audit §11) was measured and rejected: AF 150 over 10–11 cuff
  readings, bias SBP/DBP tanh −1.5/−0.7, linear +1.2/+3.2, `origin/main` +1.7/+3.6 mmHg. Skin cuff rules wired:
  initial inflation per skin and age band (philips-like 165/130/100, [S2] p. 303; saadat-like 150/140/85; mindray-like
  160/140/90, [S4] App. C.1.5; LIFEPAK 160), next = previous SYS + 30 (saadat-like) else + 10, STAT spacing
  (saadat-like 30 s start-to-start, 10 in 300 s; a failure ends the series, research/06 §4.1). `nibp.modeDefault` and
  `autoIntervalMin` are KEPT as documented data, "recorded, not modelled" (the engine's NIBP is command-driven and idle
  at power-on on every skin; CONTRACT.md): Saadat MANUAL (M p.128), LIFEPAK auto OFF ([S6] via research/05 §2.4),
  the IEC default AUTO 15 min (brief §6.8), mindray-like 15 min (other departments; the OR default is 5 min, Start
  Mode Clock, [S4] App. C.1.5 — in the provenance note). The first version deleted them — Orchestrator ruling (FU-5
  review), 2026-09-28, ruling 5: documented data is never deleted. The device's systolic range is 30–270 mmHg ([S2]
  p. 303); `MIN_SBP` 50 stays the brief's cuff-failure floor (a model floor, not the device range).
- **D13 — impedance (audit M10, Q7):** a cycle one heart period (± 10 %) after the previous cycle is cardiac overlay,
  and so was that previous one; any other cycle is a breath candidate, counted when no cycle follows it within 1.5
  heart periods ([S2] p. 112–113: Auto detection compares the ECG and Resp rates) [ENG fractions]. Without beat times
  (unit tests, old snapshots) the detector behaves as before.
- **D14 — tiles (audit M11, M12):** the renderer draws the skin's glyphs (`questionable` "?", `inop`, `hrUnavailable`,
  `nibpFail`) and its tile `extras` (PR, PI, awRR, T2, ΔT, ST). Declared-but-unmodellable settings are REMOVED with a
  CONTRACT note: `glyphs.outOfRange`, `glyphs.ibpPrUnavailable`, saadat-like HR `PACE`/`PVCs`, BFA `SQI`/`EMG`, IBP1
  `PPV`. philips-like's SpO2 tile gains `PI` ([S2] p. 120 "Perf").
- **D15 — the message bar and INOP visibility (audit M3; Orchestrator ruling (FU-5 review), 2026-09-28, ruling 4):**
  the bar's pool is every UNACKNOWLEDGED message, live or latched, ordered by level (acknowledged ones show only when
  nothing unacknowledged is left). philips-like (new skin field `alarms.messageBar.rotateAll: true`) rotates the WHOLE
  pool every 2 s — "all active alarm messages are shown in the alarm status area in succession … the message changes
  every two seconds" ([S2] p. 29–30), and a visually latched alarm is still an active one ([S2] p. 40) — so the
  latched red stays in the rotation under a live yellow and LEADS OFF is seen under a red APNEA. The other rotating
  skins (IEC default, saadat-like; `rotateAll: false`) rotate the pool's top level with the unacknowledged INOPs
  rotated in under a red or yellow top, so a latched red, being the top, is never hidden either. The first version
  took the pool from LIVE entries first, so a live yellow took the single bar from a latched red (in FU-3's induction
  run the latched "***APNEA" was visible only ≈ 188–195 s) — which defeats latching, whose purpose is that a transient
  red event is not missed ([S2] p. 97). A split layout shows the INOPs in their own field — mindray-like
  `layout.messageBars: 'split-technical-physiological'` ([S4] §3.6). Optional and NOT done: Mindray prints the
  trigger time behind a latched message ([S4] §10.9) — a Stage 9 presentation item (R-FU5-6).
- **D16 — audio:** the engine owns what sounds: `AlarmEntry.sounding` (raised and unacknowledged; while latched only
  under audible latching). The bridge plays `sounding` entries; `packages/audio` is unchanged.
- **D17 — event hold and start-up (audit M13, M14):** PAUSE stays ≥ 5 s once raised [ENG]; EtCO2 is invalid before the
  first breath; the arterial line searches 10 s.
- **D18 — the harness:** research/10's scripts become `scripts/audit-monitor/` (`pnpm audit:monitor [name|prefix …]`,
  ≈ 45 s for all 43 scenarios — the review's count; the plan first said 45), with a report of the 15 suite items. The fidelity suite in Vitest (Tasks 3, 13–15) and
  Playwright (Task 16) asserts the items; the harness prints the numbers the gate note quotes.
- **D19 — labels (R56, research/11's glossary is the single label source):** every label, tile extra and alarm text
  FU-5 ADDS is the glossary's clinical label or a vendor alias the glossary lists for that skin (rule 2: aliases are
  skin data). Tile extras print "PR", "PI" (the SpO2 perfusion index only — the LVAD pulsatility index is never "PI"),
  "awRR", "T2", "ΔT", "ST-II" (glossary #22; was "ST"), and saadat-like's BFA "BS%" is the B9 alias of SR, the
  burst-suppression ratio (SR is never a rhythm; the rhythm is "Sinus"); the HR relabel is "PR" (glossary #37, Sa
  AUTO). Alarm texts: the IEC text table (`text.ts` `IEC_TEXT`, shared by philips-, mindray-, zoll-, lifepak- and
  ge-like) is the Philips IFU's, and FU-5's new entries keep its Philips aliases — "ABP" (glossary label ART, Phil
  alias ABP), "NBP", "Pulse" (the pulse-sourced HR limit alarm, Phil alias of PR), "etCO2", "Temp" — consistent with
  the table's existing `ABPs`/`NBPs`/`etCO2` limit labels; the Saadat table uses the B9's own ("IBP1", "PR TOO
  HIGH"). Moving the IEC table's aliases into per-skin data (so mindray-/ge-/zoll-like print "ART", "PR", "EtCO₂",
  "T1") is Stage 9's glossary application (R-FU5-6), not a FU-5 mechanism. FU-5 introduces no CPP/CoPP, FO2Hb/SaO2
  or RR/R–R label; in this plan's prose the R–R interval is written "R–R" and RR is only the respiratory rate.
  Philips itself labels PI "Perf" and PR "Pulse" (research/11 rows 2, 4); philips-like prints the glossary's "PI"/"PR"
  — acceptable under R-FU5-6 (the per-skin aliases are Stage 9's). **Open question 19 DECIDED (Orchestrator ruling
  (FU-5 review), 2026-09-28, ruling 8): labels follow the vendor** — "ABP" on philips-like (the IFU's own label, as
  the IEC table already prints), "Art" on mindray-like ([S4] App. C.1.6), saadat-like per research/06 ("IBP1", "PR
  TOO HIGH" — its own table already); Ali may override in the glossary review. FU-5 does not move the IEC table's
  aliases into per-skin data (mindray-like still prints "ABP" until then): that application is Stage 9's (R-FU5-6),
  which now has the decided target labels.
- **D20 — the R50 review and the orchestrator's rulings (Orchestrator ruling (FU-5 review), 2026-09-28; review
  `<scratchpad>/fu-5-review/review.md`, APPROVE WITH FIXES, 14 findings).** Applied in this plan, each at its place:
  (1) pleth/PI: SV/SV₀ kept, tone ≤ 1 and MANUAL-free, baseline/ladder/propofol tests, R-FU5-9 to FU-4, the gate's
  "A10-A1 fixed" withdrawn (D1, Task 3, Task 18 §8); (2) latched alarms never suppress, chain ranked by position,
  the age-band acknowledge removed, Open question 15 decided (D6, Task 8); (3) per-skin static-pressure display and
  amplitude hysteresis (D11, Tasks 2, 4, 10); (4) the message bar rotates every active message on philips-like, the
  latched red stays in rotation, the FU-3 e2e asserts it to the end of the run (D3, D15, Tasks 12, 16, 17); (5) vendor
  data — mindray-like HR/PR source Auto, V-Tach 6 PVCs, Pause off; saadat-like IBP disconnect off; NIBP mode data kept;
  LOW PERF sourced to [S2] p. 120 with clear hysteresis; unmet criteria as `it.fails` with numbers (D7, D8, D10, D12,
  Tasks 2, 8, 10, 13, 14); (6) the agonal/PEA rule: ONE arrest alarm (D6, Task 8, fidelity-arrest 4b); (7) the R45
  re-statements confirmed — flash-rate 150 → 130 and age-band 140 → 135 legitimate, the age-band acknowledge removed;
  (8) decided now: the latched presentation (D3, D15), the Philips Alarm Reminder (factory On, 3 min — recorded as the
  vendor default, not modelled), Q7, Q8, Q13, Q19 (labels per vendor, above); Ali keeps Q1 (his option), Q2, Q3, Q4,
  Q5 (rate), Q9, Q11, Q12, Q14, Q16 with the numbers; Q10 → FU-4; Q17/Q18 → Stage 9 or a later FU; (9) the commit
  trailer is the executor's own (Global Constraints); (10) the CI budget for the 8 new e2e tests (Global Constraints,
  Task 18). Exceptions: **E-FU5-1 accepted conditional on ruling 1** (applied); **E-FU5-2…7 accepted** as written
  (E-FU5-3's `prAbp` follows ruling 3: "-?-" whenever non-pulsatile). Cross-plan: R-FU5-10 (FU-4's suite reads the
  truth SaO2). Review precision items also applied: chain sources [S2] p. 29/97/99 and [ruling] tags (D6); the "lethal"
  set is [S4] C.1.1.2's "High, unadjustable" group (D7, `manager.ts`); #H30 is the anaesthesia option (D3); the latched
  style is [ruling] (D3); INOPs that switch a Philips measurement off and the Alarm Reminder are "recorded, not
  modelled" (CONTRACT.md); the Philips cuff range 30–270 mmHg (D12); D15's single bar is the B.0 IFU's (later
  IntelliVue releases draw separate alarm/INOP fields [unverified] — Open question 4 stays).
## Requests to other stages

- **R-FU5-1 → FU-4 (physiology; the ruled boundary):** the audit's truth-side findings stay FU-4's and FU-5 does not
  hide them: T1 "sinus 30" shows 50/min (the junctional escape is not reset by conducted beats — FU-4 Task 13); T2 AF
  150 with 44 % non-ejecting beats (FU-4 ruling 5); T3 EtCO2 37 → 1 mmHg within 20 s of VF (FU-4 Task 17); T4 the
  MANUAL tracker cannot reach MAP < 40 (target 18/10 shows 65/30 — FU-4 ruling 6); T5 no arrest at MAP 2 (FU-4 G1);
  T6 SaO2 1 % at MAP 58 without an arrest; T8 `sinusTachy 187` beats at 194. What FU-5 needs from FU-4's truth: nothing
  — every fidelity criterion is about what the monitor shows for the truth it is given; the low-flow and NIBP items
  hold before and after FU-4's arrests (a pulseless patient gives no pleth pulses, so SpO2 goes `--` with NON-PULSAT.).
- **R-FU5-2 → FU-4 (merge mechanics):** both stages edit `package.json` (one script each after `"relay"`),
  `.gitignore`, `l2/hemo/pipeline.ts` (different functions), `l2/resp/pipeline.ts`, `engine.ts`, `truth.ts`'s
  `SKIP_PATH` line (FU-4: `hemo.circ.acc`, `hemo.circ.cppAcc`; FU-5: `hemo.num`, `resp.num`, `hemo.nibp` — the merge is
  the union) and `vite.config.ts`/`ci.yml` (FU-4 splits the SLOW set into `SLOW_A`/`SLOW_B`: FU-5's
  `test/engine/fidelity-*.test.ts` goes into ONE group). Whichever merges second keeps both sides and re-runs its suite.
- **R-FU5-3 → FU-6 (respiratory integration):** FU-6's R5 (the 10 s EtCO2 window empties at RR ≤ 6 so EtCO2-LOW flaps;
  a full plateau for breaths below dead space) lives in `l3/co2-numerics/co2-numerics.ts`, which FU-5 Task 6 edits
  (the skin apnoea time, EtCO2 invalid before two breaths). FU-6 re-anchors on FU-5's version; FU-5 Task 9's
  display-value hysteresis already damps an EtCO2 that hovers on its limit, and Task 8's chain keeps EtCO2 LOW off
  while APNEA stands.
- **R-FU5-4 → 8b (release):** the release notes and the embedding docs must say (a) `AlarmEntry.sounding` is what an
  embedder's own audio should play (FU-5 Task 12), (b) the skin schema changes — `alarms.latching` is an object,
  `alarms.silence.mode` exists and `durationS` may be null, `nibp.modeDefault`/`autoIntervalMin` and
  `glyphs.outOfRange`/`ibpPrUnavailable` are gone (`packages/skins/CONTRACT.md` "FU-5"), the new numeric `prAbp`;
  (c) `pnpm audit:monitor` is the monitor-fidelity check to re-run before a release.
- **R-FU5-5 → Ali (bench checks, research/06 §7 style):** the photo/stopwatch items that would move FU-5's [ENG] or
  [inferred] values to documented — see Open questions 1–13.

- **R-FU5-6 → Stage 9 "clinical UI" (R55/R56, the glossary's application):** FU-5 keeps the IEC alarm-text table's
  Philips aliases (D19). Stage 9 moves them into per-skin data so that mindray-, ge-, zoll- and lifepak-like print the
  glossary labels ("ART" for `ABPs`/"ABP NON-PULSATILE"/"ABP DISCONNECT"/"ABP ZEROING", "PR" for the pulse-sourced
  HR alarm, "EtCO₂", "T1"), and gives the TEMP-probe INOP the skin's temperature label ("<Temp label> NO TRANSDUCER",
  [S2] p. 62). The tile headers FU-5 does not rename (the ST tile's "ST", "ART"/"IBP1") and the computed-but-untiled
  numerics (`imco2` → FiCO₂/imCO₂, `mac`, `etAa`, `qtc`; research/11 §4 item 8) are Stage 9's. The `data-latched`
  attribute, the `.pme-inop` field and `AlarmEntry.sounding` (Task 12) are the hooks a redesigned header keeps.
- **R-FU5-7 → the coverage-matrix keeper (R54, research/12 §7):** FU-5's gate re-measures the audit-10 cells it owns
  (research/12 §4.3: A10-A1, A1t, A1m, A2, A4, A4c, A7a, A7b, A8, B4, B5, B7, B8, B9, C2, C3, C5, C8, C11, D2, D3, D4,
  D8, D9, E2, E3, F1, F2, F3; with FU-6: A09-H6, A09-H11) and the audit-10 PL cells it must not break (A0, A5, A7c,
  A8e, B2, B6, B10, C1, C4, C6, C7, C9, C10, D1, D5, D7, E1, E4), and lists the before → after verdicts in
  `docs/gates/fu-5.md` §8 (Task 18). The keeper adds them to research/12 §4.3 as a dated verdict column (§7
  "Regression"), not by overwriting. A10-C5 (over-damped line reads −2/+1 mmHg) stays TW: the damping is the L2
  transducer model, outside E-FU5-4 (Open question 18). A10-E5 (agent tile) is Stage 9's.
- **R-FU5-8 → 7d follow-up / FU-4 (organs, not FU-5):** research/11 §4 item 6 offers "FU-5 or 7d" the oliguria flag
  that fires at 150 s from a 60-min window holding 2.5 min. The flag is computed in the kidney model
  (`ev.organs.kidney.oliguria`, L2 organs — outside the FU-5 boundary); the UO tile's "OLIGURIA" status reads it and
  follows the fix without a renderer change. FU-5 does not take it.
- **R-FU5-9 → FU-4 (physiology; Orchestrator ruling (FU-5 review), 2026-09-28, ruling 1): a cutaneous (skin-vessel)
  vasomotor-tone output.** FU-4 owns the sympathetic output (R51 addendum 21). Finger PI follows the local pulsatile
  volume — pulse pressure × the local arterial compliance, which cutaneous sympathetic tone and temperature set — not
  SV alone and not whole-body SVR. FU-5's pleth amplitude uses SV/SV₀ and a vasoconstriction-only SVR factor ≤ 1
  (MODELED) as a stand-in. Request: FU-4 publishes one scalar on the circulation output (e.g. `circOut.skinTone`,
  1 = rest, < 1 dilated, > 1 constricted: raised by catecholamines, cold, hypovolaemic reflex; lowered by induction
  agents, volatile agents, neuraxial block, warming). FU-5 (or Stage 9, whichever lands after it) then replaces the SVR
  factor with `1 / skinTone` in the E-FU5-1 line and flips the propofol-PI `it.fails` (Task 3) — until then PI after
  induction falls with SV (1.82 → 1.16 in the prototype) where clinically it rises. The ventilated-normal PI rows
  (Task 3, −17 %) are re-measured at the same time.
- **R-FU5-10 → FU-4 (cross-plan hazard, forwarded by the orchestrator, 2026-09-28):** FU-4's clinical suite must read
  the truth SaO2 (`resp.o2.sao2`), never the displayed SpO2 with `?? -1` — after FU-5 a low-perfusion SpO2 is `null`
  and `?? -1` would make S9 pass on a monitor dropout (R50 review of FU-5, F10). No FU-5 file changes.
## Architecture

### The signal-quality chain (truth → what the monitor shows)

```
TRUTH (L1/L2, read-only)            DEVICE SIGNAL (E-FU5 lines)          L3 NUMERICS                       ALARMS (L3)                 TILE (renderer)
stroke volume SV_i, R_sys  ──► pleth pulse  PI·tone·SV_i/SV_rest ──► pleth beats (fresh ≤ 6 s) ─► PI, PR ──► SpO2 LOW PERF (PI<0.3, 5 s) ──► "97?"
                                                                     completed pulse clock ────► SpO2 valid / held / invalid ► NON-PULSAT. ──► "-?-" (INOP glyph)
arterial pressure ─────────► transducer + skin filter (12/16 Hz) ─► beats (fresh ≤ 6 s) ─► pulsatile? (≥2, ≥3 mmHg, ≥25/min)
                                                                        ├ yes: S/D/M averages, prAbp
                                                                        └ no: STATIC (skin: 'keep' S/D/M | 'mean-only' mean) ─► ABP NON-PULSATILE, pulse "-?-"; mean<10 → ***ABP DISCONNECT (skin switch) ──► "20/19 (20)" | "---/---" "(mean)"
ECG (leads on/off) ─────────► QRS detector ──────────────────────► HR (invalid while off; fresh after a gap) ─► HR source AUTO → pulse ──► "-?-" / "PR 75"
chest volume + cardiac ripple ► impedance (cardiac overlay rejected) ► RR, APNEA (resp) ┐
CO2 at the airway ─────────► sidestream sampler (occluded state) ─► EtCO2 (≥ 2 breaths), awRR, APNEA (CO2) ┴► ONE APNEA from the active source
cuff pulses (site beats) ──► oscillation 4·tanh(PP/50) ──────────► envelope ≥ 0.3 mmHg, SBP ≥ 50 ─► result | FAILED (2 attempts) ──► "-?-" (skin nibpFail)
```

### The alarm state machine (manager.ts, per skin)

```
condition true ──(delayS: 0; SpO2 10; mindray 6)──► RAISED (live: lamp, message, sounding)
   │                                                  │  Silence 'acknowledge' (philips, mindray) / ack
   │                                                  ▼
   │                                          ACKNOWLEDGED (message ✓ colours, silent)
   │                                                  │ condition ends ──► CLEARED
   │  condition ends, not acknowledged:
   ├── latching covers it (skin visual: lethal | red | redYellow; never INOPs) ──► LATCHED (distinct style, lamp off;
   │                                                                               sounding only under audible latching)
   │                                                                               ├ ack / Silence(ack) ──► CLEARED
   │                                                                               └ condition returns ──► RAISED
   ├── superseded (CHAIN: a higher alarm explains it) ──► CLEARED (never latched)
   ├── event hold (PAUSE ≥ 5 s) ──► kept until the hold ends
   └── otherwise ──► CLEARED
Silence 'mute' (saadat 120 s with visuals, IEC/ZOLL 90 s): silencedUntil; saadat: any new alarm ends it
Pause (philips 120 s, IEC 180 s, mindray 120 s): nothing raised until it ends
```

Per skin (Decisions D3–D4): philips-like latch visual **red**, audible off, Silence = acknowledge, pause 2 min;
mindray-like no latch, Alarm Reset = acknowledge, split alarm areas, 6 s alarm delay; saadat-like no latch, Silence =
120 s mute of audio and visuals, any new alarm ends it; IEC default (zoll-, lifepak-, ge-like) latch **lethal**
(visual only), Silence = 90 s mute.

### Conditions (conditions.ts, every tick)

1. Limit alarms on the DISPLAYED value (tile decimals), one unit of hysteresis while raised; HR from the active HR
   source (the pulse when the leads are off on an AUTO skin); questionable values raise nothing.
2. Extreme rates (red) from the active HR source, with or without arrhythmia analysis (HR limit ∓ 20 clamped, or the
   skin's absolute thresholds).
3. ECG: LEADS OFF (technical) or VFIB / ASYSTOLE / VTAC (always on), and with arrhythmia analysis BRADY/TACHY (Saadat),
   PAUSE (held ≥ 5 s), PVCs.
4. APNEA from the active respiratory source only.
5. Technical alarms: CO2 OCCLUSION, SpO2 SENSOR OFF / NON-PULSAT. / LOW PERF, NBP FAILED, ABP ZEROING /
   NON-PULSATILE / (red) DISCONNECT, TEMP probe off.
6. `chain()`: mark what a present condition, or an entry that was LIVE at the previous tick, explains (chain position,
   any level); a latched entry suppresses nothing (review ruling 2). A standing ASYSTOLE is kept through agonal beats
   (review ruling 6).

## File map

| File | Owner | Tasks | Change |
|---|---|---|---|
| `scripts/audit-monitor/{hooks.mjs,runner.ts,scenarios.ts,report.ts,cli.ts}` (new), `package.json`, `.gitignore` | tooling | 1 | `pnpm audit:monitor` |
| `packages/skins/src/{types,schema,resolve}.ts` | skins | 2, 11, 12 | `alarms.latching` object, `silence.mode`, glyphs `questionable`/`inop`; `ibp.staticDisplay`, `alarms.abpDisconnectDefault`, `arrhythmia.pauseAlarm` (review rulings 3, 5), `alarms.messageBar.rotateAll` (ruling 4, Task 12); removed `glyphs.outOfRange/ibpPrUnavailable` (the NIBP mode fields are KEPT) |
| `packages/skins/src/data/base/iec-defaults.json` | skins | 2, 11, 12 | latching lethal/off, silence mode, glyphs, static display 'keep', disconnect and pause switches on, rotateAll off, provenance |
| `packages/skins/src/data/skins/philips-like.json` | skins | 2, 11, 12 | #H30 latching, rotate every message (ruling 4), Silence = acknowledge, pause 2 min, SpO2 10 s / 2 s, NIBP 165, HR source AUTO, "-?-" glyphs, SpO2 PI extra |
| `packages/skins/src/data/skins/mindray-like.json` | skins | 2, 9, 12 | factory limit table + extremes, Alarm Reset, no latching, asystole 5 s, VT 130 / 6 PVCs, HR source Auto, Pause off, NIBP interval note (ruling 5), NIBP 160, 6 s delay, split alarm areas |
| `packages/skins/src/data/skins/saadat-like.json` | skins | 2, 11, 12 | latching object, silence mode, glyphs, static display mean-only, IBP disconnect off (rulings 3, 5), rotateAll off, removed extras (PPV, PACE, PVCs, SQI, EMG) |
| `packages/skins/CONTRACT.md`, `test/__snapshots__/resolve.test.ts.snap` | skins | 2, 9, 11, 12 | the FU-5 behaviour fields and "recorded, not modelled"; regenerated snapshot |
| `packages/engine-core/src/l3/alarms/manager.ts` | L3 | 2, 8 | per-vendor latching, `sounding`, acknowledge-Silence, superseded clears, event hold |
| `packages/engine-core/src/l3/alarms/profile.ts` | L3 | 2–8 | latching/silence, SpO2, IBP filter, cuff cfg, apnoea times, HR source, extreme limits |
| `packages/engine-core/src/l3/alarms/conditions.ts` | L3 | 8, 9, 10 | HR source, one APNEA, CHAIN, extremes w/o arrhythmia, hysteresis, technical alarms |
| `packages/engine-core/src/l3/alarms/text.ts` | L3 | 8, 9, 10 | "APNEA", tile decimals, technical texts per skin |
| `packages/engine-core/src/l3/{spo2/spo2,pressure-numerics/numerics,nibp/nibp,resp/impedance,co2-numerics/co2-numerics,hr}.ts` | L3 | 3–7 | per-skin averaging; fresh beats + static pressure; envelope; cardiac overlay; EtCO2 start; HR reset |
| `packages/engine-core/src/l3/pulse/detector.ts` | L3 | 4 | the unused `prSource` stub removed |
| `packages/engine-core/src/l3/device-layer.ts` | L3 | 8, 10 | `DeviceHost.co2/abp/temp`, the inputs |
| `packages/engine-core/src/types.ts`, `types-device.ts` | engine | 2, 4 | `NumericId 'prAbp'`, `AlarmEntry.sounding?` |
| `packages/engine-core/src/engine.ts` | engine (E-FU5-6) | 3–8, 10 | skin device settings in `syncCo2Sampler`; HR invalid with leads off; host fields |
| `packages/engine-core/src/l2/hemo/pipeline.ts` | E-FU5-1, -3 | 3, 4, 10 | pleth amplitude; `pr`/`prAbp`; no ABP numerics while zeroing |
| `packages/engine-core/src/l2/hemo/line.ts` | E-FU5-4 | 4 | the skin's display filter |
| `packages/engine-core/src/l2/resp/pipeline.ts` | E-FU5-2, -5 | 3, 6 | the oximeter's pulse clock; impedance beats; CO2 `'occluded'` |
| `packages/engine-core/src/truth.ts` | 7x (E-FU5-7) | 3 | three `SKIP_PATH` entries |
| `packages/engine-core/vite.config.ts` | CI | 3 | SLOW `test/engine/fidelity-*.test.ts` |
| `packages/renderer/src/{device-ui,alarm-view,alarm-audio}.ts` | renderer | 11, 12 | glyphs, HR tile, extras under the glossary labels (D19), NIBP failure; latched style, INOP rotation/field; `sounding` |
| `apps/demo/e2e/{fu5-fidelity,fu5-latched}.e2e.ts` (new), `apps/demo/e2e/stage4b-device.e2e.ts` | demo | 12, 16, 17 | live-monitor suite items, the FU-3 screenshot; the philips-like Silence and flash-rate steps (R45) |
| Tests (new): `engine-core/test/helpers/monitor.ts`; `test/engine/fidelity-{lowflow,arrest,ecg,resp,nibp,alarms}.test.ts`; `test/l3/alarms/fu5-{latching,conditions,limits,technical}.test.ts`; `test/l3/spo2/spo2-skin.test.ts`; `skins/test/fu5-skins.test.ts`; `renderer/test/fu5-tiles.test.ts` | — | 2–14 | |
| Tests (edited, R45 re-statements listed per task): `l3/alarms/{profile,manager,stage3-hooks,text}`, `l3/{hr,pressure-numerics/numerics,pulse/detector,nibp/nibp,resp/impedance,co2-numerics/co2-numerics}`, `engine/{alarms-engine,hemo-engine,circ-manual-cvp-peep}`, `renderer/{alarm-view,alarm-audio}`, `skins/fu1-layout` | — | 2–12 | |
| Gate: `docs/gates/fu-5.md`, `docs/gates/fu-5/**` | — | 15–18 | report copies, PNGs, note |

Every row was checked against the prototype's edit log: 72 files (and the regenerated skins snapshot), each in the
Global Constraints partition and in the Files block of every task whose blocks touch it.
## Prototype results (`pnpm audit:monitor`, seed 7; before = `origin/main` `4f4ce06`, after = every task applied)

Measured by Task 1's harness (43 scenarios, ≈ 45 s; ≈ 80 s on a loaded machine) on the throwaway worktree, before any FU-5 edit
and after the last one (the final prototype, 2026-09-28 10:40, on `94040f7` = `4f4ce06` + docs). The executor's
Task 1 and Task 15 reports must match these to the unit (a difference means the base moved or a block was mis-applied).
Skins: philips-like unless marked mr (mindray-like) / sa (saadat-like).

| # | Suite item (research/10 §13) | Before | After |
|---|---|---|---|
| 1 | Low flow, 3 L bleed (A1m), +20 s after MAP < 30 | SpO2 "99" valid, PI 2.16, INOP none; pleth 140 % of resting ptp; 96 % of rows plain-valid; 58 rows valid SpO2 with PR/PI invalid | "99?", PI 0.11, SpO2 LOW PERF; pleth 8 %; 0 % plain-valid; 0 rows |
| 1 | Low flow, Ali's case (A2) | "99" valid, PI 2.03; pleth 133 %; 100 % plain-valid | "99?", PI 0.14, LOW PERF; pleth 7 %; 0 % |
| 2 | PEA (A5 ×3) | ART valid in 10 of 87 rows (the 118/79 glitch); ART INOP no | 3 of 87 (the first 3 s); ART NON-PULSATILE yes (×3 skins) |
| 3 | VF → CPR → ROSC (A4 ×3) | VFIB +3.0 s; HR_HIGH ×10 during VF; mindray EXTREME TACHY latched at 420 s | VFIB +3.0 s; 0 other rate alarms; at 420 s philips-like VFIB and APNEA latched, mindray-/saadat-like none latched |
| 4 | Asystole (A6 ×3) | +4.1 / +4.1 / +10.1 s; HR LOW beside it on philips-like (1) | +4.1 / +5.1 ([S4] 5 s) / +10.1 s; 0 |
| 5 | Leads off (F1 ×2) | HR {75, 0}, "0" in 56 rows; 1 HR alarm on reconnection | HR invalid ("--" in the harness, "-?-" on the tile), "0" in 0 rows; 0 alarms |
| 6 | Apnoea 60 s (D1 ×3, F2) | 2 raises (APNEA (RESP) 136.7 + APNEA 140.3); at 300 s both latched (audible) | 1 raise (APNEA from the capnograph, 140.3 / 141.5 / 140.6); at 300 s philips-like latched + silent, others cleared |
| 7 | Impedance-only apnoea (D4) | RR {0, 3, 44, 49, 51, 50, 48, 43} = the HR; 1 RR alarm | RR {0, 1}; 0 RR alarms; APNEA 251 of 251 rows |
| 8 | Disconnect / oesophageal (D2); probes (G2) | +20.3 s / +24 s; G2 {-} {ART_D_HIGH} {3 ART LOW} {-} | +20.3 s / +24 s (unchanged); G2 {tempProbeOff} {abpZero} {abpDisconnect abpNonPulsatile} {co2Line} |
| 9 | Desaturation lag (A8, A8e) | finger 22 s, ear 12 s; DESAT 216.0 / 206.0 | 22 s / 12 s; DESAT 218.0 / 208.0 (+2 s: philips-like's 10 s average and 2 s update, D2) |
| 10 | NIBP | PP 10 (C3) FAILED; bleed (A1m) 1 result / 19 failed; ladder 2 / 3; AF 110/73, 111/75 | C3 80/56 (69); A1m 8 results down to 53/40 (38) / 12 failed; ladder 3 / 2 (67/37 at MAP 43); AF 125/78, 117/67 |
| 11 | Limit hygiene (G1, E1, chatter) | CVP 10>10 ×100 (A1), HR_LOW 11× in 180 s, "**CVP 10>10", Ali's case ART_M_LOW ×71 | CVP at the limit 0 raises, HR_LOW 4×, "**CVP 11>10", "**Temp 35.9<36.0"; Ali's case ART S/M/D LOW ×10–12 with ABP NON-PULSATILE ×10 (residual, see Self-review) |
| 12 | HR response (B2 ×3) | 8/7/11, 7/7/10, 10/9/10 s | unchanged |
| 13 | Rhythm tour (B1 ×3, B1a) | VTAC +1.6 s; PAUSE 10× shortest 0.0 s (mr, arrhythmia on) | VTAC +1.6 s; PAUSE 7× shortest 5.0 s |
| 14 | Silence then a new red alarm (F4 ×3) | philips-/mindray-like: the new VFIB muted under a 90 s silence; saadat-like sounds (silence ended) | all three: the new VFIB sounds, silence not running; philips-/mindray-like the earlier alarms acknowledged (A) |
| 15 | Start-up, t < 15 s (every stable run) | `**ABPd 0<50` and `**etCO2 0<30` on every ventilated run | none |

The harness's "max arrhythmia alarms at once" (item 13) counts latched entries too (philips-like 3 after, latching
red visually; was 1); the Vitest item 13 asserts ≤ 1 LIVE lethal/extreme alarm. Live-monitor items
(Tasks 16–17 with the re-stated 4b e2e, Chromium, one worker, loaded machine): 14 passed in 11.0 min; PNGs 33–55 KB
at `deviceScaleFactor` 0.7 (fu5-fidelity) / 0.8 (fu5-latched). FU-3's screenshot sequence on the 7f page: philips-like
APNEA live 182–187 s, LATCHED 188–195 s (framed, lamp off, silent), then a live yellow `**ABPs` limit alarm takes the
single bar (the latched entry stays until acknowledged); saadat-like APNEA live 183–184 s, then nothing; "APNEA
(RESP)" never appears.

### After the R50 review fixes (fixer, 2026-09-28; `pnpm audit:monitor` on the plan's blocks re-applied to `cbefa63`)

The table above is the FIRST prototype's "after". The review fixes (Orchestrator ruling (FU-5 review), 2026-09-28,
rulings 1–6) move these rows; every other row of the table is unchanged to the unit (the fixer diffed the two
reports). Task 15's after-report must match the table above AMENDED by this one. "Before" here is `origin/main`
(Task 1 only), measured by the fixer with the same harness; PI is the displayed PI averaged over the window.

| Row | Scenario | origin/main | First prototype | After the R50 fixes |
|---|---|---|---|---|
| PI ladder (A10-A1, ruling 1) | A1-map-ladder MANUAL, windows at MAP 106 / 99 / 61 / 45 / 44 / 38 | 1.70 / 1.58 / 1.38 / 1.26 / 1.32 / 0.14 | 1.94 / 2.05 / 2.30 / 2.06 / 2.04 / 0.05 (rises as MAP falls) | 1.84 / 1.82 / 1.53 / 1.18 / 1.16 / 0.03 (falls with MAP) |
| Rest PI (ruling 1) | MODELED spontaneous (D3 30–58 s) / MANUAL ventilated (A1) / MODELED ventilated (A1m) | 1.79 / 1.70 / 1.80 | 1.83 / 1.94 / 1.49 | 1.82 / 1.84 / 1.49 (ventilated MODELED −17 %: `it.fails`) |
| Propofol PI (ruling 1) | D3-induction (spontaneous → propofol + rocuronium 60 s → ETT + PPV 150 s): 30–58 / 100–140 / 220–260 s | 1.79 / 1.67 / 1.67 | 1.83 / 1.48 / 1.18 | 1.82 / 1.43 / 1.16 (SV 80 → 67 → 55; the clinical rise waits for FU-4's skin tone — `it.fails` in fidelity-lowflow on a ventilated rig: 1.49 → 1.17) |
| ART chatter, Ali's case (ruling 3) | A2-ali-b7 raises: ART_S_LOW / ART_M_LOW / ART_D_LOW / ABP NON-PULSATILE | 5 / 71 / 3 / – | 12 / 12 / 10 / 10 | 3 / 12 / 1 / 1 (the static line keeps "16/13 (14)"; the 12 ART_M_LOW are the mean hovering 69–71 on its limit 70 under PEEP 15, 1 462–1 757 s — limit-hover chatter, not flips) |
| PEA ART (item 2, ruling 3) | A5-pea ×3: rows with ART shown valid | 10 of 87 | 3 / 3 / 3 of 87 | 87 / 87 / 3 of 87 — philips-/mindray-like keep S/D/M of the flat line ('keep'), saadat-like the mean only; `prAbp` invalid from +6 s on every skin |
| EXTREME BRADY in an agonal rhythm (ruling 6) | fidelity-arrest 4b: MANUAL pulseless agonal 60–300 s (not a harness scenario) | – | philips-like ASYSTOLE ×1 + EXTREME BRADY ×3; mindray-like ASYSTOLE ×15 + EXTREME BRADY ×3; saadat-like ASYSTOLE ×1 (the first prototype's conditions, measured by the fixer); the review's merged FU-4 tree: A2 EXTREME BRADY ×11, A1m ×7 | ASYSTOLE ×1, EXTREME BRADY ×0, HR LOW ×0 on philips-, mindray- and saadat-like; harness A2/A1m EXTREME BRADY ×0 on this base (no FU-4 arrest) — re-measured after the FU-4 merge (Task 15 Step 3) |
| Latched APNEA visibility (ruling 4) | D1-apnoea philips-like, harness rows through the renderer's `barView`; the FU-3 sequence on the 7f page (e2e) | two live alarms, no latching shown | latched APNEA on the bar only until a live alarm took it (the 7f run: 188–195 s) | harness: latched APNEA on the bar in 101 of the 116 rows in which it is active, to the end of the run (300 s), in the 2 s rotation with the live `**RR 4<8` / `**etCO2 0<30`; e2e (fixer's re-run): latched 188–457 s, i.e. to the end of the run |
| SpO2 INOP flicker (ruling 5) | A1m technical raise/clear cycles < 5 s | – | LOW PERF ×7 (1–2 s cycles at 1 268–1 339 s) | none (LOW PERF ×3, NON-PULSAT. ×2, every cycle ≥ 5 s) |
| mindray-like tour (ruling 5) | B1-rhythms-mr | PAUSE ×10, shortest 0.0 s | PAUSE ×7, shortest 5.0 s; VTAC +1.6 s | PAUSE ×0 (factory Off); VTAC +1.9 s (6 PVCs); EXTREME BRADY/HR LOW chatter gone |
| Latched alarms suppress nothing (ruling 2) — the consequences | A2, A8/A8e, C2, D4 | – | HR HIGH hidden under a latched EXTREME TACHY; RR LOW hidden under a latched APNEA | an HR hovering 136–141 on the 140 extreme threshold alternates EXTREME TACHY live/latched with 1–3 s `**HR` HIGH blips (A2 ×7 at 2 937–2 999 s, A8/A8e ×4); AF 150 (C2) `**HR` HIGH ×3 after the 5 s extreme clear delay (×13 without it); D4 impedance-only apnoea RR LOW ×2 while the flickering impedance APNEA is latched — Open question 20 |

Harness totals: 43 scenarios, ≈ 45 s wall; `EXIT 0`. The fidelity Vitest files (six) ran in 55 s wall with 55 tests
(the `it.fails` rows failing as expected).
### Task 0: Base check — the worktree, the branch, the before-numbers

**Files:** none (a check).

- [ ] **Step 1: Base.** `git -C <repo> fetch origin && git -C <repo> log --oneline -1 origin/main`. The plan's blocks
  were checked on `4f4ce06` (FU-3 merged, research/10 delivered). If FU-4 has merged since, every block still applies
  EXCEPT possibly the shared-file ones listed in Global Constraints: apply them by their quoted anchors, keeping FU-4's
  lines, and note each re-anchor in the gate note.
- [ ] **Step 2: Worktree and branch.**

```bash
git -C <repo> worktree add -b fu-5-monitor-fidelity <repo>/../scratch/wt-fu-5 origin/main
cd <repo>/../scratch/wt-fu-5 && npx -y pnpm@9.15.9 install --frozen-lockfile
mkdir -p <scratchpad>/fu-5-monitor-fidelity
```

- [ ] **Step 3: Anchors present** (each must print one line; a miss means the base moved — re-anchor, do not guess):

```bash
grep -n "const svRef = Math.max(1, bs.length >= 4" packages/engine-core/src/l2/hemo/pipeline.ts
grep -n "lastFootT: h.num.pleth.feet\[h.num.pleth.feet.length - 1\]" packages/engine-core/src/l2/resp/pipeline.ts
grep -n "if (p.apneaS !== null) for (const id of inp.apnoeaFlags)" packages/engine-core/src/l3/alarms/conditions.ts
grep -n "if (p.latching && e.level === 1 && e.category === 'physiological' && !e.acked)" packages/engine-core/src/l3/alarms/manager.ts
grep -n "OSC_PER_PP: 0.05" packages/engine-core/src/l3/nibp/nibp.ts
grep -n '"latching": true,' packages/skins/src/data/base/iec-defaults.json
```

- [ ] **Step 4: The before-numbers** are recorded by Task 1 (its harness changes no behaviour, so its first report IS
  the before state). Nothing is committed in this task.

### Task 1: The monitor-fidelity harness in the repo — `pnpm audit:monitor` (audit scripts; PROTOTYPED)

research/10's scripts (`research/10-audit-scripts/{cli,runner,scenarios,hooks}`) move into the repo as
`scripts/audit-monitor/`, extended with the FU-5 scenarios (D4 impedance-only apnoea, F3 leads off under a red alarm,
F4 a new alarm during Silence per skin, G1 a hovering limit, G2 the probe-state INOPs) and `report.ts`, which prints
the 15 suite items' key numbers from the last run. It changes no behaviour: its first report is the BEFORE state.

**Files:**
- Create: `scripts/audit-monitor/{hooks.mjs,runner.ts,scenarios.ts,report.ts,cli.ts}`
- Modify: `package.json` (one script), `.gitignore` (one line)

- [ ] **Step 1: Create the harness**

**Create `scripts/audit-monitor/hooks.mjs`:**

```js
// Node module hook for `pnpm audit:monitor`: the engine imports JSON data files without an import attribute.
import { registerHooks } from 'node:module';
registerHooks({
  load(url, ctx, next) {
    if (url.endsWith('.json')) return next(url, { ...ctx, importAttributes: { ...ctx.importAttributes, type: 'json' } });
    return next(url, ctx);
  },
});
```

**Create `scripts/audit-monitor/runner.ts`:**

```ts
// Monitor-fidelity harness (research/10-monitor-fidelity-audit.md, FU-5 Task 1): ONE scenario runner. Creates an engine
// (seed 7, chosen skin), dispatches a scripted timeline and every 1 s records what the MONITOR shows (the `measurement`
// numerics with their flags, NIBP phase/result, the alarm manager's `alarmStatus`) beside the TRUTH read read-only from
// the engine's committed pipeline state, plus waveform features read back from the display buffers.
// Raw per-scenario JSON goes to $PME_AUDIT_OUT/results (default <repo>/.audit-monitor, git-ignored).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
export const OUT = process.env.PME_AUDIT_OUT ?? join(HERE, '../../.audit-monitor');
const ENGINE = process.env.PME_ENGINE ?? join(HERE, '../../packages/engine-core/src/index.ts');
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => any };

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body | ((e: any) => void), string?];
export interface Scenario {
  name: string; title: string; mode: 'modeled' | 'manual'; skin?: string; patient?: Record<string, unknown>;
  sensors?: Record<string, string>; steps: Step[]; tEnd: number; printEvery?: number;
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' }),
  vap: (agent: string, dialPct: number, fgfLpm = 2) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac: 0 }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  cond: (id: string, severity: number) => ev({ kind: 'condition', id, severity }),
  vent: (peep = 5, fio2 = 0.5, rr = 12, vtMl = 600) => ev({ kind: 'ventilation', source: 'ventilator', rr, vtMl, peep, fio2 }),
  ventOff: () => ev({ kind: 'ventilation', source: 'none' }),
  ett: () => ev({ kind: 'airwayDevice', device: 'ett' }),
  cpr: (active: boolean, quality = 1) => ev({ kind: 'cpr', active, rate: 110, quality }),
  line: (line: string, action: string, value?: number, fnHz?: number) => ev({ kind: 'line', line, action, ...(value !== undefined ? { value } : {}), ...(fnHz !== undefined ? { fnHz } : {}) }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
  target: (variable: string, value: number, durationS = 0): Body => ({ type: 'setTarget', variable, value, ...(durationS > 0 ? { ramp: { durationS, curve: 'linear' } } : {}) }),
  sensor: (sensor: string, state: string, site?: string): Body => ({ type: 'attachSensor', sensor, state, ...(site ? { site } : {}) }),
  nibp: (action: 'start' | 'stat' | 'stop' | 'auto', intervalMin?: number): Body => ({ type: 'device', action: { device: 'nibp', action, ...(intervalMin ? { intervalMin } : {}) } }),
  alarm: (action: string, extra: Record<string, unknown> = {}): Body => ({ type: 'device', action: { device: 'alarm', action, ...extra } }),
};
export const VENTED: Step[] = [[1, A.ett()], [1, A.vent(5, 0.5)]];
const SENSORS = { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on', temp: 'on', nibp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole']);

type M = { value: number | null; flag: string; at: number } | undefined;
export interface Row {
  t: number;
  // truth
  rhythm: string; rate: number; pulseless: boolean; noEject: boolean; map: number; sbp: number; dbp: number; sv: number; co: number;
  sao2: number; paco2: number; etTrue: number; tCore: number; va: number; src: string; cpr: boolean;
  // waveform features (display buffers, last 4 s)
  plethPtp: number; artPtp: number; co2Max: number;
  // monitor
  hr: string; pr: string; prAbp: string; spo2: string; pi: string; art: string; cvp: string; et: string; awrr: string; rr: string; temp: string; nibp: string;
  /** Active alarm ids; marks: (L) latched, (A) acknowledged, (q) not sounding. */
  alarms: string;
  silenced: boolean;
}
export const show = (m: M, d = 0): string => (!m ? 'nil' : m.value === null || m.flag === 'invalid' ? '--' : m.value.toFixed(d) + (m.flag === 'questionable' ? '?' : ''));

function window(e: any, ch: string, winS: number): Float32Array {
  const rate = e.sampleRate(ch);
  const last = e.latestSampleIndex(ch);
  if (last < 0) return new Float32Array(0);
  const buf = new Float32Array(Math.round(winS * rate));
  const got = e.readSamples(ch, last - buf.length + 1, buf);
  return buf.subarray(0, got);
}
const ptp = (b: Float32Array): number => (b.length ? Math.max(...b) - Math.min(...b) : Number.NaN);

export interface Run { rows: Row[]; log: string[]; alarmLog: string[]; nibpLog: string[] }

export async function run(sc: Scenario): Promise<Run> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, ...(sc.patient ?? {}), sensors: { ...SENSORS, ...(sc.sensors ?? {}) } };
  const e = createEngine({ seed: 7, mode: sc.mode, patient, device: { skin: sc.skin ?? 'philips-like' } });
  const disp: Record<string, M> = {};
  let status: any = null;
  let nibpRes = '--/--';
  let nibpPhase = 'idle';
  let rate = Number.NaN;
  const alarmLog: string[] = [];
  const nibpLog: string[] = [];
  e.on((x: any) => {
    if (x.type === 'measurement') for (const [k, v] of Object.entries(x.values)) disp[k] = v as M;
    else if (x.type === 'alarmStatus') status = x;
    else if (x.type === 'alarm' && x.level !== undefined) alarmLog.push(`${x.t.toFixed(1)} ${x.state} ${x.id} L${x.level} "${x.text}"`);
    else if (x.type === 'nibp' && (x.result || x.phase === 'failed' || x.phase === 'inflating')) {
      if (x.result) nibpRes = `${x.result.sys}/${x.result.dia}(${x.result.map})`;
      const repeat = x.phase === 'inflating' && nibpPhase === 'inflating';
      nibpPhase = x.phase;
      if (!repeat) nibpLog.push(`${x.t.toFixed(1)} ${x.phase}${x.result ? ' ' + nibpRes + ' pr ' + x.result.pr : ''}`);
    } else if (x.type === 'state' && x.rhythm) rate = x.rhythm.rateBpm;
  }, ['measurement', 'alarmStatus', 'alarm', 'nibp', 'state']);
  const log: string[] = [];
  let n = 0;
  const pending = [...sc.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  for (let t = 1; t <= sc.tEnd + 1e-9; t += 1) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      if (typeof body === 'function') { body(e); log.push(`${ts}s poke ${label ?? ''}`); continue; }
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit', ...body });
      log.push(`${ts}s ${label ?? ''} ${JSON.stringify((body as { event?: unknown }).event ?? body)} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
    }
    e.advanceTo(t);
    const st = e.st;
    const c = st.hemo.circ;
    const bs = c.beats.filter((b: any) => b.t > t - 6);
    const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : Number.NaN);
    const noEject = t - c.lastEjT > 3;
    const act = status ? status.active.map((a: any) => `${a.id}${a.latched ? '(L)' : ''}${a.acked ? '(A)' : ''}${a.sounding === false && !a.acked ? '(q)' : ''}`).join(' ') : '';
    const nibpNow = nibpPhase === 'inflating' || nibpPhase === 'deflating' ? 'meas' : nibpPhase === 'failed' ? 'FAIL' : nibpRes;
    const pl = window(e, 'pleth', 4);
    rows.push({
      t, rhythm: st.rhythm.id + (st.rhythm.opts?.pulseless ? '*' : ''), rate, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
      map: bs.length ? avg('map') : Number.NaN, sbp: avg('sbp'), dbp: avg('dbp'), sv: bs.length ? avg('sv') : 0, co: noEject ? 0 : c.qFwd * 0.06,
      sao2: st.resp.o2.sa * 100, paco2: st.resp.co2.pf, etTrue: st.resp.etco2, tCore: st.resp.temp.tc, va: st.resp.vaLpm, src: st.resp.driver.source, cpr: st.hemo.cpr.active,
      plethPtp: ptp(pl), artPtp: ptp(window(e, 'abp', 4)), co2Max: Math.max(...window(e, 'co2', 10)),
      hr: show(disp.hr), pr: show(disp.pr), prAbp: show(disp.prAbp), spo2: show(disp.spo2), pi: show(disp.pi, 2),
      art: `${show(disp.abpSys)}/${show(disp.abpDia)}(${show(disp.abpMean)})`, cvp: show(disp.cvpMean), et: show(disp.etco2), awrr: show(disp.awrr), rr: show(disp.rr),
      temp: show(disp.tempCore, 1), nibp: nibpNow, alarms: act, silenced: status ? status.silencedUntil !== null && status.silencedUntil > t : false,
    });
    if (t % 60 === 0) await new Promise((r) => setImmediate(r)); // CI amendment 4: yield once per sim-minute
  }
  return { rows, log, alarmLog, nibpLog };
}

const COLS: [keyof Row, string, number][] = [
  ['t', 't', 0], ['rhythm', 'rhythm', 0], ['rate', 'rate', 0], ['map', 'MAP', 0], ['sbp', 'SBP', 0], ['dbp', 'DBP', 0], ['sv', 'SV', 1], ['co', 'CO', 2], ['sao2', 'SaO2', 1],
  ['etTrue', 'EtT', 0], ['tCore', 'Tc', 1], ['plethPtp', 'plPtp', 2], ['artPtp', 'aPtp', 0],
  ['hr', '|HR', 0], ['pr', 'PR', 0], ['prAbp', 'PRa', 0], ['spo2', 'SpO2', 0], ['pi', 'PI', 0], ['art', 'ART', 0], ['cvp', 'CVP', 0], ['et', 'EtCO2', 0], ['awrr', 'awRR', 0], ['rr', 'RRimp', 0], ['temp', 'T', 0], ['nibp', 'NIBP', 0], ['alarms', 'alarms', 0],
];
export function table(sc: Scenario, rows: Row[], every = sc.printEvery ?? 10): string {
  const fmt = (v: unknown, d: number) => (typeof v === 'number' ? (Number.isFinite(v) ? v.toFixed(d) : '–') : String(v));
  const marks = sc.steps.map((s) => s[0]);
  const lines = [COLS.map(([, h]) => h).join('\t')];
  for (const r of rows) {
    const near = marks.some((m) => r.t > m && r.t <= m + 3);
    if (r.t % every === 0 || near) lines.push(COLS.map(([k, , d]) => fmt(r[k], d)).join('\t') + (r.noEject ? '\tNO-EJECT' : ''));
  }
  return lines.join('\n');
}
export function save(sc: Scenario, res: Run): void {
  mkdirSync(join(OUT, 'results'), { recursive: true });
  writeFileSync(join(OUT, 'results', `${sc.name}.json`), JSON.stringify({ scenario: { ...sc, steps: sc.steps.map((s) => [s[0], typeof s[1] === 'function' ? `poke:${s[2]}` : s[1], s[2]]) }, ...res }));
}
```

**Create `scripts/audit-monitor/scenarios.ts`:**

```ts
// Monitor-fidelity scenarios (research/10-monitor-fidelity-audit.md; FU-5 Task 1 adds D4, F3, F4 and G1). Adult 40 y
// 70 kg M, seed 7. Sensors: ECG, SpO2 (left finger), ABP (radial), CVP, NIBP cuff (right arm), CO2 (sidestream),
// temperature. Default skin philips-like; per-skin variants carry the skin id in the name suffix (-mr mindray-like,
// -sa saadat-like).
import { A, VENTED, type Scenario, type Step } from './runner.ts';

const S = (name: string, title: string, mode: 'manual' | 'modeled', steps: Step[], tEnd: number, extra: Partial<Scenario> = {}): Scenario =>
  ({ name, title, mode, steps, tEnd, printEvery: 10, ...extra });
const SKINS: Array<[string, string]> = [['', 'philips-like'], ['-mr', 'mindray-like'], ['-sa', 'saadat-like']];
const perSkin = (base: Scenario): Scenario[] => SKINS.map(([suf, skin]) => ({ ...base, name: base.name + suf, skin, title: `${base.title} [${skin}]` }));
const bp = (t: number, s: number, d: number, label: string): Step[] => [[t, A.target('sbp', s), label], [t, A.target('dbp', d), label]];

// A. pulse oximetry vs perfusion ---------------------------------------------------------------------------------
const ladder: Step[] = [
  ...VENTED,
  ...bp(60, 135, 82, 'MAP 100'), [100, A.nibp('start'), 'NIBP'],
  ...bp(180, 80, 50, 'MAP 60'), [220, A.nibp('start'), 'NIBP'],
  ...bp(300, 55, 32, 'MAP 40'), [340, A.nibp('start'), 'NIBP'],
  ...bp(420, 35, 20, 'MAP 25'), [460, A.nibp('start'), 'NIBP'],
  ...bp(540, 18, 10, 'MAP 13'), [580, A.nibp('start'), 'NIBP'],
];
const arrest = (rhythm: string, opts: Record<string, unknown> = {}): Step[] => [
  ...VENTED, [60, A.rhythm(rhythm, opts), `${rhythm} ${JSON.stringify(opts)}`], [70, A.nibp('start'), 'NIBP in arrest'],
  [150, A.cpr(true), 'CPR on'], [160, A.nibp('start'), 'NIBP during CPR'], [300, A.cpr(false), 'CPR off'],
  [302, A.rhythm('sinus', { rateBpm: 80 }), 'ROSC sinus 80'], [360, A.nibp('start'), 'NIBP after ROSC'],
];
export const SCENARIOS: Scenario[] = [
  S('A1-map-ladder', 'MANUAL: MAP 100 → 60 → 40 → 25 → 13 (2 min each), NIBP 40 s into each step', 'manual', ladder, 660),
  S('A1m-map-ladder', 'MODELED start, MANUAL targets are ignored → use bleed ladder instead: bleed 3 L over 15 min', 'modeled', [...VENTED, [60, A.bleed(3000, 900), 'bleed 3 L/15 min'], [300, A.nibp('auto', 1), 'NIBP auto 1 min']], 1500, { printEvery: 30 }),
  S('A2-ali-b7', "MODELED Ali's case (08 audit B7): tamponade, propofol 2+1, PEEP 15, sevo 2 %, bleed 2 L", 'modeled', [
    ...VENTED, [60, A.cond('tamponade', 1), 'tamponade 1'], [660, A.drug('propofol', 2, 'mg/kg'), 'propofol 2'], [900, A.drug('propofol', 1, 'mg/kg'), 'propofol 1'],
    [1200, A.vent(15, 0.5), 'PEEP 15'], [1500, A.vap('sevoflurane', 2), 'sevo 2 %'], [2100, A.bleed(2000, 300), 'bleed 2 L'], [2400, A.nibp('auto', 2), 'NIBP auto 2 min'],
  ], 3000, { printEvery: 60 }),
  ...perSkin(S('A4-vf', 'MANUAL: VF coarse at 60 s, NIBP at 70, CPR 150–300 (NIBP at 160), ROSC sinus 80 at 302', 'manual', arrest('vfCoarse'), 420)),
  ...perSkin(S('A5-pea', 'MANUAL: PEA (sinus 90 pulseless) at 60 s, CPR 150–300, ROSC at 302', 'manual', arrest('sinus', { rateBpm: 90, pulseless: true }), 420)),
  ...perSkin(S('A6-asystole', 'MANUAL: asystole at 60 s, CPR 150–300, ROSC at 302', 'manual', arrest('asystole'), 420)),
  S('A7-probe', 'MANUAL: SpO2 probe off 60–90, motion 120–180, ear site 200, same-limb NIBP (probe right finger) 300', 'manual', [
    ...VENTED, [60, A.sensor('spo2', 'off'), 'probe off'], [90, A.sensor('spo2', 'on'), 'probe on'], [120, A.sensor('spo2', 'motion'), 'motion'],
    [180, A.sensor('spo2', 'on'), 'motion stops'], [200, A.sensor('spo2', 'on', 'ear'), 'ear site'], [290, A.sensor('spo2', 'on', 'rightFinger'), 'right finger'], [300, A.nibp('start'), 'NIBP same arm'],
  ], 360, { printEvery: 5 }),
  S('A8-desat-finger', 'MODELED: ventilated FiO2 0.21, ventilator off at 120 s, back on (FiO2 1) when SaO2 < 75 (at 400 s)', 'modeled', [
    [1, A.ett()], [1, A.vent(5, 0.21)], [120, A.ventOff(), 'ventilator off (apnoea)'], [400, A.vent(5, 1.0), 'ventilator on FiO2 1'],
  ], 600, { printEvery: 5 }),
  S('A8e-desat-ear', 'as A8 with the probe on the ear', 'modeled', [
    [1, A.ett()], [1, A.vent(5, 0.21)], [2, A.sensor('spo2', 'on', 'ear'), 'ear'], [120, A.ventOff(), 'ventilator off (apnoea)'], [400, A.vent(5, 1.0), 'ventilator on FiO2 1'],
  ], 600, { printEvery: 5 }),

  // B. ECG / HR ------------------------------------------------------------------------------------------------------
  ...perSkin(S('B1-rhythms', 'MANUAL rhythm tour, 60 s each', 'manual', [
    ...VENTED, [60, A.rhythm('sinus', { rateBpm: 30 }), 'sinus 30'], [120, A.rhythm('sinusBrady', { rateBpm: 35 }), 'sinusBrady 35'],
    [180, A.rhythm('junctionalEscape', { rateBpm: 40 }), 'junctional 40'], [240, A.rhythm('afib', { rateBpm: 140 }), 'AF 140'],
    [300, A.rhythm('vtMono', { rateBpm: 180 }), 'VT 180'], [360, A.rhythm('sinus', { rateBpm: 75 }), 'sinus 75'], [420, A.rhythm('avb3Wide', { rateBpm: 32 }), 'CHB wide 32'],
    [480, A.rhythm('pacedVVI', { pacer: { ratePpm: 70 } }), 'VVI 70'], [540, A.rhythm('sinusTachy', { rateBpm: 187 }), 'sinus tachy 187'], [600, A.rhythm('sinus', { rateBpm: 75 }), 'sinus 75'],
  ], 660, { printEvery: 5 })),
  S('B1a-rhythms-arrOn', 'as B1 on philips-like with arrhythmia analysis switched ON at 2 s', 'manual', [
    ...VENTED, [2, A.alarm('arrhythmiaAnalysis', { value: true }), 'arrhythmia ON'], [60, A.rhythm('sinus', { rateBpm: 30 }), 'sinus 30'], [120, A.rhythm('sinusBrady', { rateBpm: 35 }), 'sinusBrady 35'],
    [180, A.rhythm('junctionalEscape', { rateBpm: 40 }), 'junctional 40'], [240, A.rhythm('afib', { rateBpm: 140 }), 'AF 140'],
    [300, A.rhythm('vtMono', { rateBpm: 180 }), 'VT 180'], [360, A.rhythm('sinus', { rateBpm: 75 }), 'sinus 75'], [420, A.rhythm('avb3Wide', { rateBpm: 32 }), 'CHB wide 32'],
    [480, A.rhythm('pacedVVI', { pacer: { ratePpm: 70 } }), 'VVI 70'], [540, A.rhythm('sinusTachy', { rateBpm: 187 }), 'sinus tachy 187'], [600, A.rhythm('sinus', { rateBpm: 75 }), 'sinus 75'],
  ], 660, { printEvery: 5 }),
  ...perSkin(S('B2-step', 'MANUAL HR step 80 → 120 at 60 s, → 40 at 120 s, → 80 at 180 s (response time)', 'manual', [
    ...VENTED, [2, A.target('hr', 80), 'hr 80'], [60, A.target('hr', 120), 'hr 120'], [120, A.target('hr', 40), 'hr 40'], [180, A.target('hr', 80), 'hr 80'],
  ], 240, { printEvery: 1 })),
  S('B3-sinus30-modeled', 'MODELED: sinus 30 commanded (escape fill-in; 08 audit / G-FU3 ruling 1)', 'modeled', [...VENTED, [60, A.rhythm('sinus', { rateBpm: 30 }), 'sinus 30']], 240, { printEvery: 5 }),

  // C. invasive pressure / NIBP ----------------------------------------------------------------------------------------
  S('C1-damp', 'MANUAL: ART damped (ζ 1.2) at 60 s, flush at 120 s, under-damped (ζ 0.1, fn 10) at 150, flush 210', 'manual', [
    ...VENTED, [60, A.line('abp', 'damp', 1.2), 'damp ζ1.2'], [120, A.line('abp', 'flush'), 'flush'], [150, A.line('abp', 'damp', 0.1, 10), 'ringing ζ0.1 fn10'], [210, A.line('abp', 'flush'), 'flush'],
  ], 240, { printEvery: 5 }),
  S('C2-af-nibp', 'MANUAL: AF 150 at 30 s, NIBP at 60, 120, 180 s (pulse deficit, NIBP in AF)', 'manual', [
    ...VENTED, [30, A.rhythm('afib', { rateBpm: 150 }), 'AF 150'], [60, A.nibp('start'), 'NIBP'], [120, A.nibp('start'), 'NIBP'], [180, A.nibp('start'), 'NIBP'],
  ], 240, { printEvery: 5 }),
  S('C3-lowpp', 'MANUAL: pulse pressure 10 at MAP 70 (SBP 77/DBP 67) at 60 s — ART, NIBP, PI', 'manual', [...VENTED, ...bp(60, 77, 67, 'PP 10'), [120, A.nibp('start'), 'NIBP']], 200, { printEvery: 5 }),

  // D. capnography / apnoea ------------------------------------------------------------------------------------------
  ...perSkin(S('D1-apnoea', 'MODELED ventilated: ventilator off 120–180 s (60 s apnoea), then back on; no acknowledge', 'modeled', [
    ...VENTED, [120, A.ventOff(), 'ventilator off'], [180, A.vent(5, 0.5), 'ventilator on'],
  ], 300, { printEvery: 5 })),
  S('D2-disconnect', 'MODELED ventilated: circuit disconnect at 60 s, reconnect (patent) at 120 s; oesophageal ETT at 180 s', 'modeled', [
    ...VENTED, [60, { type: 'applyEvent', event: { kind: 'airway', state: 'disconnected' } }, 'disconnect'], [120, { type: 'applyEvent', event: { kind: 'airway', state: 'patent' } }, 'reconnect'],
    [180, { type: 'applyEvent', event: { kind: 'airway', state: 'oesophageal' } }, 'oesophageal'],
  ], 300, { printEvery: 5 }),
  S('D3-induction', 'MODELED spontaneous → propofol 2 mg/kg at 60 s (apnoea) → ETT + ventilator at 150 s (the FU-3 screenshot sequence)', 'modeled', [
    [60, A.drug('propofol', 2, 'mg/kg'), 'propofol 2'], [60, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6'], [150, A.ett(), 'ETT'], [150, A.vent(5, 0.5), 'ventilator'],
  ], 400, { printEvery: 5 }),

  // E. temperature ---------------------------------------------------------------------------------------------------
  S('E1-temp', 'MODELED: core pinned 37 → 34 °C over 5 min from 60 s; temp probe off 420–480', 'modeled', [
    ...VENTED, ...Array.from({ length: 6 }, (_, i) => [60 + 60 * i, (e: any) => { e.st.resp.temp.pinCoreTemp = 37 - (3 * i) / 5; }, `core ${(37 - (3 * i) / 5).toFixed(1)}`] as Step),
    [420, A.sensor('temp', 'off'), 'temp off'], [480, A.sensor('temp', 'on'), 'temp on'],
  ], 540, { printEvery: 10 }),
];

// Added after the first pass: ECG leads off (HR fallback), latched alarm acknowledge, silence semantics.
SCENARIOS.push(
  ...['philips-like', 'saadat-like'].map((skin, i): Scenario => S(`F1-leadsoff${i ? '-sa' : ''}`, `ECG leads off 60–120 s, then VF at 150 s with leads on; silence at 160 s, acknowledge at 200 s [${skin}]`, 'manual', [
    ...VENTED, [60, A.sensor('ecg', 'off'), 'ECG leads off'], [120, A.sensor('ecg', 'on'), 'ECG leads on'], [150, A.rhythm('vfCoarse'), 'VF'],
    [160, A.alarm('silence'), 'silence'], [200, A.alarm('ack'), 'acknowledge'], [230, A.rhythm('sinus', { rateBpm: 80 }), 'sinus 80 (ROSC)'], [260, A.alarm('ack'), 'acknowledge'],
  ], 300, { printEvery: 5, skin })),
  S('F2-apnoea-ack', 'D1 on philips-like with an acknowledge 30 s after ventilation resumes', 'modeled', [
    ...VENTED, [120, A.ventOff(), 'ventilator off'], [180, A.vent(5, 0.5), 'ventilator on'], [210, A.alarm('ack'), 'acknowledge'],
  ], 260, { printEvery: 5 }),
);

// FU-5 additions: impedance-only apnoea (suite 7), leads off under a red alarm (suite 5), a new red alarm during Silence
// (suite 14), a hovering limit (suite 11) and the probe-state INOPs (suite 8 technical alarms).
SCENARIOS.push(
  S('D4-apnoea-imp', 'MODELED paralysed apnoea on room air with the CO2 line off (impedance only): ventilator off at 120 s', 'modeled', [
    [1, A.ett()], [1, A.vent(5, 0.21)], [100, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6'], [120, A.ventOff(), 'ventilator off'],
  ], 420, { printEvery: 10, sensors: { co2: 'off' } }),
  ...['philips-like', 'saadat-like'].map((skin, i): Scenario => S(`F3-leadsoff-red${i ? '-sa' : ''}`, `ventilator off at 60 s (red APNEA), ECG leads off at 100–160 s [${skin}]`, 'modeled', [
    ...VENTED, [60, A.ventOff(), 'ventilator off'], [100, A.sensor('ecg', 'off'), 'ECG leads off'], [160, A.sensor('ecg', 'on'), 'ECG leads on'], [170, A.vent(5, 0.5), 'ventilator on'],
  ], 220, { printEvery: 5, skin })),
  ...['philips-like', 'saadat-like', 'mindray-like'].map((skin, i): Scenario => S(`F4-silence-new${['', '-sa', '-mr'][i]}`, `asystole at 30 s, Silence at 45 s, VF at 60 s (a new red alarm during the silence), acknowledge at 120 s [${skin}]`, 'manual', [
    ...VENTED, [30, A.rhythm('asystole'), 'asystole'], [45, A.alarm('silence'), 'silence'], [60, A.rhythm('vfCoarse'), 'VF'], [100, A.rhythm('sinus', { rateBpm: 80 }), 'sinus 80'], [120, A.alarm('ack'), 'acknowledge'],
  ], 150, { printEvery: 5, skin })),
  S('G1-hover', 'MANUAL: CVP target 10 (the philips-like high limit) and HR 50 (the low limit) for 3 min', 'manual', [
    ...VENTED, [10, A.target('cvp', 10), 'CVP 10'], [10, A.target('hr', 50), 'HR 50'],
  ], 200, { printEvery: 10 }),
  S('G2-probes', 'MANUAL: temperature probe off 30–60 s; ART zeroing at 70 s; ART to atmosphere 90–120 s; CO2 line occluded 130–160 s', 'manual', [
    ...VENTED, [30, A.sensor('temp', 'off'), 'temp off'], [60, A.sensor('temp', 'on'), 'temp on'], [70, A.sensor('abp', 'zeroing'), 'ART zero'],
    [90, A.sensor('abp', 'atmosphere'), 'ART atmosphere'], [120, A.sensor('abp', 'connected'), 'ART connected'], [130, A.sensor('co2', 'occluded'), 'CO2 occluded'], [160, A.sensor('co2', 'on'), 'CO2 on'],
  ], 190, { printEvery: 5 }),
);
```

**Create `scripts/audit-monitor/report.ts`:**

```ts
// The fidelity report (FU-5 Task 1): the research/10 §13 suite's key numbers, computed from $PME_AUDIT_OUT/results
// (whatever scenarios were run last). Each line names the suite item; the Vitest suite (test/engine/fidelity-*.test.ts)
// holds the pass criteria, this report only measures. Run alone: node … scripts/audit-monitor/report.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT, type Row } from './runner.ts';

type Res = { scenario: { name: string; skin?: string }; rows: Row[]; alarmLog: string[]; nibpLog: string[] };
const R = join(OUT, 'results');
const load = (n: string): Res | null => (existsSync(join(R, `${n}.json`)) ? (JSON.parse(readFileSync(join(R, `${n}.json`), 'utf8')) as Res) : null);
const num = (s: string) => Number.parseFloat(String(s).replace('?', ''));
const plain = (s: string) => s !== '--' && s !== 'nil' && !s.endsWith('?'); // a valid (not questionable) value
const ids = (r: Row) => r.alarms.split(' ').filter(Boolean);
const has = (r: Row, re: RegExp) => ids(r).some((a) => re.test(a));
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : Number.NaN);
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '–');
const raises = (d: Res, id: RegExp, from = 0, to = Infinity) => d.alarmLog.filter((l) => { const m = l.match(/^([\d.]+) raised (\S+)/); return !!m && id.test(m[2] as string) && +(m[1] as string) >= from && +(m[1] as string) < to; });
const SPO2_INOP = /^spo2(NonPulsatile|LowPerf)/;
const ARR = /^(ASYSTOLE|VFIB|VTAC|EXTREME_BRADY|EXTREME_TACHY|BRADY|TACHY|PAUSE|PVCS)/;

function lowFlow(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const rows = d.rows;
  const base = mean(rows.filter((r) => r.t >= 30 && r.t <= 60).map((r) => r.plethPtp));
  const on = rows.find((r, i) => rows.slice(i, i + 20).length === 20 && rows.slice(i, i + 20).every((x) => x.map < 30));
  const contra = rows.filter((r) => r.t >= 10 && plain(r.spo2) && (r.pr === '--' || r.pi === '--')).length;
  if (!on) return `${name}: MAP never < 30 for 20 s; SpO2-valid-with-PR/PI-invalid rows ${contra}`;
  const at = rows.find((r) => r.t === on.t + 20) as Row;
  const late = rows.filter((r) => r.t >= on.t + 20 && r.t <= on.t + 60);
  const validFrac = rows.filter((r) => r.t >= on.t + 20).filter((r) => plain(r.spo2)).length / Math.max(1, rows.filter((r) => r.t >= on.t + 20).length);
  return `${name}: MAP < 30 from ${on.t} s; +20 s SpO2 "${at.spo2}" PI ${at.pi} PR ${at.pr} INOP ${has(at, SPO2_INOP) ? ids(at).filter((a) => SPO2_INOP.test(a)).join(',') : 'none'}; pleth ptp ${f((100 * mean(late.map((r) => r.plethPtp))) / base, 0)} % of baseline; SpO2 plain-valid ${f(100 * validFrac, 0)} % of rows after; SpO2-valid-with-PR/PI-invalid rows ${contra}`;
}

function pea(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const w = d.rows.filter((r) => r.t > 62 && r.t < 150);
  const firstInv = (k: 'spo2' | 'pr') => d.rows.find((r) => r.t > 60 && r[k] === '--')?.t;
  const artValid = w.filter((r) => /^\d+\/\d+\(\d+\)$/.test(r.art)).length;
  return `${name}: HR mean ${f(mean(w.map((r) => num(r.hr))), 0)}; PR invalid at +${f((firstInv('pr') ?? Number.NaN) - 60, 0)} s, SpO2 at +${f((firstInv('spo2') ?? Number.NaN) - 60, 0)} s; ART shown valid in ${artValid} of ${w.length} rows; ART INOP ${w.some((r) => has(r, /^abpNonPulsatile/)) ? 'yes' : 'no'}; ART low alarms cleared during PEA ${d.alarmLog.filter((l) => /cleared ART_/.test(l) && +l.split(' ')[0]! > 62 && +l.split(' ')[0]! < 150).length}`;
}

function vf(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const v = raises(d, /^VFIB$/)[0];
  const tv = v ? +v.split(' ')[0]! : Number.NaN;
  const during = raises(d, /^(HR_|EXTREME_|VTAC)/, tv, 150);
  const cpr = d.rows.filter((r) => r.t >= 170 && r.t <= 290);
  const end = d.rows[d.rows.length - 1] as Row;
  return `${name}: VFIB at +${f(tv - 60)} s; other rate alarms raised during VF ${during.length}${during.length ? ' (' + [...new Set(during.map((l) => l.split(' ')[2]))].join(',') + ')' : ''}; CPR SpO2 "${cpr[40]?.spo2}", PR mean ${f(mean(cpr.map((r) => num(r.pr))), 0)}, EtCO2 ${f(Math.min(...cpr.map((r) => num(r.et))), 0)}–${f(Math.max(...cpr.map((r) => num(r.et))), 0)}; NIBP ${d.nibpLog.filter((l) => /failed/.test(l)).length} failed; at ${end.t} s: ${end.alarms || '-'}`;
}

function asystole(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const a = raises(d, /^ASYSTOLE$/)[0];
  return `${name}: ASYSTOLE at +${f(a ? +a.split(' ')[0]! - 60 : Number.NaN)} s; HR_LOW/EXTREME_BRADY raised 60–150 s: ${raises(d, /^(HR_LOW|EXTREME_BRADY)$/, 60, 150).length}`;
}

function leadsOff(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const w = d.rows.filter((r) => r.t > 62 && r.t < 120);
  const shown = [...new Set(w.map((r) => r.hr))].slice(0, 6).join(',');
  return `${name}: HR shown during leads off {${shown}} ("0" in ${w.filter((r) => r.hr === '0').length} rows); HR alarms raised within 15 s of reconnect ${raises(d, /^HR_/, 120, 135).length}`;
}

function leadsOffRed(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const w = d.rows.filter((r) => r.t > 102 && r.t < 160);
  return `${name}: rows with the LEADS OFF INOP active beside a red APNEA ${w.filter((r) => has(r, /^ecgLeadsOff/) && has(r, /^apnoea/)).length} of ${w.length} (visibility in the bar: renderer test)`;
}

function apnoea(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const r = raises(d, /^apnoea-/, 120, 200);
  const clear = d.rows.find((x) => x.t > 180 && !ids(x).some((a) => /^apnoea-/.test(a) && !/\(L\)|\(q\)/.test(a)));
  const end = d.rows[d.rows.length - 1] as Row;
  return `${name}: APNEA raises for one apnoea ${r.length} (${r.map((l) => l.split(' ').slice(0, 3).join(' ')).join('; ')}); live alarm gone ${clear ? '+' + (clear.t - 180) + ' s' : 'never'} after ventilation resumed; at ${end.t} s: ${end.alarms || '-'}`;
}

function impOnly(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const w = d.rows.filter((r) => r.t >= 150 && r.t <= 400);
  return `${name}: RR(imp) shown {${[...new Set(w.map((r) => r.rr))].slice(0, 8).join(',')}}; HR {${f(Math.min(...w.map((r) => num(r.hr))), 0)}–${f(Math.max(...w.map((r) => num(r.hr))), 0)}}; APNEA active in ${w.filter((r) => has(r, /^apnoea-/)).length} of ${w.length} rows; RR alarms ${raises(d, /^RR_/, 150, 400).length}`;
}

function disconnect(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const a = raises(d, /^apnoea-co2$/, 60, 120)[0];
  const et5 = d.rows.find((r) => r.t > 180 && num(r.et) < 5);
  return `${name}: CO2 apnoea at +${f(a ? +a.split(' ')[0]! - 60 : Number.NaN)} s after disconnect; EtCO2 < 5 at +${f(et5 ? et5.t - 180 : Number.NaN, 0)} s after oesophageal`;
}

function desat(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const s = d.rows.find((r) => r.t > 120 && r.sao2 < 90);
  const m = d.rows.find((r) => r.t > 120 && num(r.spo2) < 90);
  const des = raises(d, /^DESAT$/)[0];
  const low = Math.min(...d.rows.filter((r) => r.t > 120).map((r) => num(r.spo2)).filter(Number.isFinite));
  return `${name}: SaO2 < 90 at ${s?.t} s, displayed at ${m?.t} s (lag ${m && s ? m.t - s.t : '–'} s); DESAT raised ${des ? des.split(' ')[0] : 'never'}; lowest shown ${low}`;
}

function nibp(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const done = d.nibpLog.filter((l) => /done/.test(l)).map((l) => l.split(' ')[2]);
  return `${name}: NIBP ${done.length} results [${done.join(' ')}], ${d.nibpLog.filter((l) => /failed/.test(l)).length} failed`;
}

function chatter(): string {
  const out: string[] = [];
  for (const f of existsSync(R) ? readdirSync(R).filter((x) => x.endsWith('.json')).sort() : []) {
    const d = JSON.parse(readFileSync(join(R, f), 'utf8')) as Res;
    const c: Record<string, number> = {};
    for (const l of d.alarmLog) {
      const m = l.match(/^[\d.]+ raised (\S+)/);
      if (m) c[m[1] as string] = (c[m[1] as string] ?? 0) + 1;
    }
    const bad = Object.entries(c).filter(([, n]) => n >= 4).map(([k, n]) => `${k}×${n}`);
    const start = d.alarmLog.filter((l) => /raised/.test(l) && +l.split(' ')[0]! < 15 && !/nibp|ecgLeadsOff|spo2SensorOff/.test(l)).map((l) => l.split(' ')[2]);
    if (bad.length || start.length) out.push(`  ${d.scenario.name.padEnd(20)} chatter ${bad.join(' ') || '-'} | startup (t < 15 s) ${start.join(' ') || '-'}`);
  }
  return out.join('\n');
}

function hrStep(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const resp = (t0: number, from: number, to: number) => {
    const hit = d.rows.filter((r) => r.t > t0 && r.t <= t0 + 55).find((r) => Math.abs(num(r.hr) - to) <= 0.05 * Math.abs(to - from));
    return hit ? `${hit.t - t0} s` : '> 55 s';
  };
  return `${name}: 80→120 ${resp(60, 80, 120)}; 120→40 ${resp(120, 120, 40)}; 40→80 ${resp(180, 40, 80)}`;
}

function tour(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const maxArr = Math.max(...d.rows.map((r) => ids(r).filter((a) => ARR.test(a)).length));
  const vt = raises(d, /^VTAC$/, 300, 360)[0];
  const pauses: number[] = [];
  let open: number | null = null;
  for (const l of d.alarmLog) {
    if (/ raised PAUSE /.test(l)) open = +l.split(' ')[0]!;
    if (/ cleared PAUSE /.test(l) && open !== null) { pauses.push(+l.split(' ')[0]! - open); open = null; }
  }
  return `${name}: max arrhythmia alarms at once ${maxArr}; VTAC at +${f(vt ? +vt.split(' ')[0]! - 300 : Number.NaN)} s; PAUSE shown ${pauses.length}× (shortest ${f(Math.min(...pauses))} s)`;
}

function silenceNew(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const r = d.rows.find((x) => x.t === 66) as Row | undefined;
  return `${name}: at 66 s (VF raised during the silence): ${r?.alarms || '-'}; silence running ${r?.silenced}`;
}

function hover(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const c = (re: RegExp) => raises(d, re, 20, 200).length;
  const texts = [...new Set(d.alarmLog.filter((l) => / raised (CVP|HR)_/.test(l)).map((l) => l.split('"')[1]))].slice(0, 4);
  return `${name}: CVP_M_HIGH raised ${c(/^CVP_M_HIGH$/)}×, HR_LOW ${c(/^HR_LOW$/)}× in 180 s; texts ${texts.join(' | ') || '-'}`;
}

function probes(name: string): string {
  const d = load(name);
  if (!d) return `${name}: not run`;
  const at = (t: number) => (d.rows.find((r) => r.t === t) as Row | undefined)?.alarms || '-';
  return `${name}: temp off (45 s) {${at(45)}}; ART zeroing (72 s) {${at(72)}}; ART atmosphere (105 s) {${at(105)}}; CO2 occluded (145 s) {${at(145)}}`;
}

export function report(): string {
  return [
    '## Fidelity report (research/10 §13 suite items)',
    ' 1 low flow:', '  ' + lowFlow('A1m-map-ladder'), '  ' + lowFlow('A2-ali-b7'),
    ' 2 PEA:', ...['A5-pea', 'A5-pea-mr', 'A5-pea-sa'].map((n) => '  ' + pea(n)),
    ' 3 VF → CPR → ROSC:', ...['A4-vf', 'A4-vf-mr', 'A4-vf-sa'].map((n) => '  ' + vf(n)),
    ' 4 asystole:', ...['A6-asystole', 'A6-asystole-mr', 'A6-asystole-sa'].map((n) => '  ' + asystole(n)),
    ' 5 leads off:', '  ' + leadsOff('F1-leadsoff'), '  ' + leadsOff('F1-leadsoff-sa'), '  ' + leadsOffRed('F3-leadsoff-red'), '  ' + leadsOffRed('F3-leadsoff-red-sa'),
    ' 6 apnoea 60 s:', ...['D1-apnoea', 'D1-apnoea-mr', 'D1-apnoea-sa', 'F2-apnoea-ack'].map((n) => '  ' + apnoea(n)),
    ' 7 impedance-only apnoea:', '  ' + impOnly('D4-apnoea-imp'),
    ' 8 disconnect / oesophageal:', '  ' + disconnect('D2-disconnect'), '  ' + probes('G2-probes'),
    ' 9 desaturation lag:', '  ' + desat('A8-desat-finger'), '  ' + desat('A8e-desat-ear'),
    '10 NIBP:', ...['C3-lowpp', 'A1-map-ladder', 'A1m-map-ladder', 'C2-af-nibp', 'A2-ali-b7'].map((n) => '  ' + nibp(n)),
    '11 limit hygiene:', '  ' + hover('G1-hover'), chatter(),
    '12 HR response:', ...['B2-step', 'B2-step-mr', 'B2-step-sa'].map((n) => '  ' + hrStep(n)),
    '13 rhythm tour:', ...['B1-rhythms', 'B1a-rhythms-arrOn', 'B1-rhythms-mr', 'B1-rhythms-sa'].map((n) => '  ' + tour(n)),
    '14 silence:', ...['F4-silence-new', 'F4-silence-new-mr', 'F4-silence-new-sa'].map((n) => '  ' + silenceNew(n)),
    '15 startup: see "startup (t < 15 s)" under 11',
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(report());
```

**Create `scripts/audit-monitor/cli.ts`:**

```ts
// `pnpm audit:monitor [name|prefix …]` (FU-5 Task 1; research/10-monitor-fidelity-audit.md): runs the scenarios in
// scenarios.ts through runner.ts, prints each one's command log, a 1 s-resolution table (truth left of "|HR", what the
// monitor shows right of it; "?" questionable, "--" invalid), the alarm log and the NIBP log, then the fidelity report
// (report.ts). All scenarios take ≈ 1 min. Raw JSON: $PME_AUDIT_OUT/results (default <repo>/.audit-monitor).
import { SCENARIOS } from './scenarios.ts';
import { run, save, table } from './runner.ts';
import { report } from './report.ts';

const sel = process.argv.slice(2);
const pick = SCENARIOS.filter((s) => sel.length === 0 || sel.includes('all') || sel.some((p) => s.name === p || s.name.startsWith(p)));
for (const sc of pick) {
  const t0 = Date.now();
  const res = await run(sc);
  save(sc, res);
  console.log(`\n=== ${sc.name} — ${sc.title} (${sc.mode}, ${sc.skin ?? 'philips-like'}) [${((Date.now() - t0) / 1000).toFixed(1)} s wall]`);
  console.log(res.log.join('\n'));
  console.log(table(sc, res.rows));
  console.log('-- alarms:\n' + res.alarmLog.join('\n'));
  console.log('-- nibp:\n' + res.nibpLog.join('\n'));
}
console.log('\n' + report());
```


- [ ] **Step 2: The script and the ignored output folder**

**Modify `package.json`** — find (exactly once):

```json
    "relay": "pme-relay"
```

replace with:

```json
    "relay": "pme-relay",
    "audit:monitor": "node --experimental-strip-types --import ./scripts/audit-monitor/hooks.mjs scripts/audit-monitor/cli.ts"
```

**Modify `.gitignore`** — find (exactly once):

```text
coverage/
```

replace with:

```text
coverage/
.audit-monitor/
```


- [ ] **Step 3: Run it — the before-numbers**

```bash
npx -y pnpm@9.15.9 audit:monitor > <scratchpad>/fu-5-monitor-fidelity/before.txt 2>&1   # ≈ 45 s, 43 scenarios
sed -n '/## Fidelity report/,$p' <scratchpad>/fu-5-monitor-fidelity/before.txt
```

Expected (measured on `4f4ce06`; the "before" column of "Prototype results"): `A1m-map-ladder … +20 s SpO2 "99" PI
2.16 PR 162 INOP none; pleth ptp 140 % of baseline`; `D1-apnoea: APNEA raises for one apnoea 2`; `F1-leadsoff: HR
shown during leads off {75,0} ("0" in 56 rows)`; `C3-lowpp: NIBP 0 results [], 1 failed`; `A1m-map-ladder: NIBP 1
results [105/81(91)], 19 failed`; `G1-hover … HR_LOW 11× in 180 s; texts **CVP 10>10 | **HR 49<50`; `startup (t <
15 s) ART_D_LOW EtCO2_LOW` on every ventilated run. The numbers must match to the second/unit (seed 7); a
difference means the base moved — record it in the gate note and continue.

- [ ] **Step 4: Commit**

```bash
git add scripts/audit-monitor package.json .gitignore
git commit -m "FU-5 Task 1: pnpm audit:monitor — the monitor-fidelity harness (research/10) in the repo

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push -u origin fu-5-monitor-fidelity
```

### Task 2: Alarm semantics per vendor — latching, Silence, the mindray-like limit table, removed NIBP fields (skins + L3 manager; PROTOTYPED)

Decisions D3, D4, D12 (the removed fields), D18 part. The skin gains the vendor's latching (`{ visual, audible }`) and
Silence mode; the manager latches per skin, marks what SOUNDS (`AlarmEntry.sounding`), and a Silence on an acknowledge
skin acknowledges everything with no timer. mindray-like gets its documented factory limit table ([S4] App. C.1) — it
raised no parameter alarm at all before (audit M11). philips-like gets its documented SpO2 averaging/update, NIBP
inflation, Alarm Source and "-?-" glyphs (wired by Tasks 3, 5, 8, 11).

**Files:**
- Modify: `packages/skins/src/{types,schema,resolve}.ts`, `packages/skins/src/data/base/iec-defaults.json`,
  `packages/skins/src/data/skins/{philips-like,mindray-like,saadat-like}.json`, `packages/skins/CONTRACT.md`
- Modify: `packages/engine-core/src/l3/alarms/{profile,manager}.ts`, `packages/engine-core/src/types-device.ts`
- Create: `packages/skins/test/fu5-skins.test.ts`, `packages/engine-core/test/l3/alarms/fu5-latching.test.ts`
- Modify (R45 re-statements): `packages/engine-core/test/l3/alarms/{profile,manager}.test.ts`,
  `packages/renderer/test/alarm-view.test.ts`, `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts` (SLOW
  set: mindray-like now HAS the documented CVP limit 0–10, [S4] App. C.1, so its `hasLimit` joins philips-like and
  saadat-like — the test's subject, the CVP alarm at a PEEP-raised CVP, is unchanged); regenerate
  `packages/skins/test/__snapshots__/resolve.test.ts.snap`

**Interfaces:**
- Produces: `Skin['alarms']['latching']: { visual: 'off'|'lethal'|'red'|'redYellow'; audible: 'off'|'red'|'redYellow' }`,
  `Skin['alarms']['silence'].mode: 'mute'|'acknowledge'` (`durationS: number | null`), `Skin['glyphs'].questionable/inop`;
  `DeviceProfile.latching/silence` the same; `manager.ts` `LETHAL_ALARMS`, `latchCovers(mode, entry)`;
  `AlarmEntry.sounding?: boolean` (optional: pre-FU-5 events lack it — read as `!acked`).
- R45 re-statements (vendor behaviour replaces an [ENG] default, sources in the titles): profile.test "philips-like …
  Silence = acknowledge, 120 s pause"; manager.test "IEC-style latching … (latched, silent: visual-only latching on
  philips-like #H30)" and the 90 s mute test moved to zoll-like (the IEC default still mutes 90 s); alarm-view.test
  "IEC-style mute (zoll-like 90 s) … philips-like Silence acknowledges (no countdown)".

- [ ] **Step 1: The skin types, schema and audio contract**

**Modify `packages/skins/src/types.ts`** — find (exactly once):

```ts
    silence: { durationS: number; suppressesVisual: boolean; cancelOnNewAlarm: boolean; headerCountdown: boolean; technicalActsAsAck: boolean };
    pause: { durationS: number } | null;
    latching: boolean;
```

replace with:

```ts
    /**
     * FU-5: `mode` 'mute' = Silence mutes for `durationS` (ZOLL, Saadat); 'acknowledge' = Silence acknowledges every
     * active alarm and INOP, new alarms sound at once, no timer (`durationS` null; research/05 §6 [S2] Philips IntelliVue IFU p. 32, Mindray
     * Alarm Reset [S4] §10.8).
     */
    silence: { mode: 'mute' | 'acknowledge'; durationS: number | null; suppressesVisual: boolean; cancelOnNewAlarm: boolean; headerCountdown: boolean; technicalActsAsAck: boolean };
    pause: { durationS: number } | null;
    /**
     * FU-5: what stays on screen (visual) and sounding (audible) after the condition ends, until acknowledged.
     * 'lethal' = ASYSTOLE, VFIB, VTAC, EXTREME BRADY/TACHY; 'red' = every level-1 alarm; 'redYellow' = levels 1–2.
     * Technical alarms (INOPs) never latch (research/05 §6 [S2] Philips IntelliVue IFU p. 40).
     */
    latching: { visual: 'off' | 'lethal' | 'red' | 'redYellow'; audible: 'off' | 'red' | 'redYellow' };
```

**Modify `packages/skins/src/types.ts`** — find (exactly once):

```ts
  nibp: {
    modeDefault: 'MANUAL' | 'AUTO';
```

replace with:

```ts
  nibp: {
    /** Recorded, not modelled (FU-5): the engine's NIBP is command-driven and idle at power-on on every skin. */
    modeDefault: 'MANUAL' | 'AUTO';
```

**Modify `packages/skins/src/types.ts`** — find (exactly once):

```ts
  glyphs: { noValue: string; hrUnavailable: string; nibpFail: string; outOfRange: string; ibpPrUnavailable: string };
```

replace with:

```ts
  /**
   * FU-5: `questionable` is appended to a questionable numeric ("97?"); `inop` replaces a numeric whose technical alarm
   * is active ("-?-" on the research/05 §6 [S2] Philips IntelliVue IFU p. 55–62).
   */
  glyphs: { noValue: string; hrUnavailable: string; nibpFail: string; outOfRange: string; ibpPrUnavailable: string; questionable: string; inop: string };
```

**Modify `packages/skins/src/schema.ts`** — find (exactly once):

```ts
    silence: obj({ durationS: num(10, 600), suppressesVisual: bool, cancelOnNewAlarm: bool, headerCountdown: bool, technicalActsAsAck: bool }),
    pause: nullable(obj({ durationS: num(10, 900) })),
    latching: bool,
```

replace with:

```ts
    silence: obj({ mode: en(['mute', 'acknowledge']), durationS: nullable(num(10, 600)), suppressesVisual: bool, cancelOnNewAlarm: bool, headerCountdown: bool, technicalActsAsAck: bool }),
    pause: nullable(obj({ durationS: num(10, 900) })),
    latching: obj({ visual: en(['off', 'lethal', 'red', 'redYellow']), audible: en(['off', 'red', 'redYellow']) }),
```

**Modify `packages/skins/src/schema.ts`** — find (exactly once):

```ts
    glyphs: obj({ noValue: str, hrUnavailable: str, nibpFail: str, outOfRange: str, ibpPrUnavailable: str }),
```

replace with:

```ts
    glyphs: obj({ noValue: str, hrUnavailable: str, nibpFail: str, outOfRange: str, ibpPrUnavailable: str, questionable: str, inop: str }),
```

**Modify `packages/skins/src/resolve.ts`** — find (exactly once):

```ts
      silence: { durationS: skin.alarms.silence.durationS, cancelOnNewAlarm: skin.alarms.silence.cancelOnNewAlarm },
```

replace with:

```ts
      silence: { durationS: skin.alarms.silence.durationS ?? 0, cancelOnNewAlarm: skin.alarms.silence.cancelOnNewAlarm }, // FU-5: 0 = acknowledge (no mute)
```


- [ ] **Step 2: The skin data (with provenance) and the contract note**

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "silence": { "durationS": 90, "suppressesVisual": false, "cancelOnNewAlarm": false, "headerCountdown": true, "technicalActsAsAck": false },
    "pause": { "durationS": 180 },
    "latching": true,
```

replace with:

```json
    "silence": { "mode": "mute", "durationS": 90, "suppressesVisual": false, "cancelOnNewAlarm": false, "headerCountdown": true, "technicalActsAsAck": false },
    "pause": { "durationS": 180 },
    "latching": { "visual": "lethal", "audible": "off" },
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
  "glyphs": { "noValue": "---", "hrUnavailable": "---", "nibpFail": "---", "outOfRange": "---", "ibpPrUnavailable": "---" },
```

replace with:

```json
  "glyphs": { "noValue": "---", "hrUnavailable": "---", "nibpFail": "---", "outOfRange": "---", "ibpPrUnavailable": "---", "questionable": "?", "inop": "---" },
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "nibp.modeDefault": { "tag": "documented", "source": "brief §6.8 (NBP interval 15 min)" },
```

replace with:

```json
    "nibp.modeDefault": { "tag": "documented", "source": "brief §6.8 (NBP interval 15 min)", "note": "FU-5: recorded, not modelled — the engine's NIBP is command-driven and idle at power-on on every skin" },
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "alarms.latching": { "tag": "eng", "source": "brief §6.4 [ENG]" },
```

replace with:

```json
    "alarms.latching": { "tag": "assumed", "source": "research/10 §11 (M2); research/00 FU-5 ruling (IEC 60601-1-8 convention where the vendor research is silent)", "note": "lethal arrhythmias latch visually until acknowledged; audio stops when the condition ends; limit alarms and INOPs do not latch" },
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "glyphs": { "tag": "documented", "source": "brief §6.2 (dashes)" }
```

replace with:

```json
    "glyphs": { "tag": "documented", "source": "brief §6.2 (dashes)" },
    "glyphs.questionable": { "tag": "documented", "source": "brief §4.3, §6.1 ('97?' questionable SpO2); research/06 §3.2" }
```

**Modify `packages/skins/src/data/skins/philips-like.json`** — find (exactly once):

```json
  "hr": { "method": "mean-12rr" },
  "alarms": { "repeatS": { "L1": 10, "L2": 20 }, "lowPulses": 2 },
```

replace with:

```json
  "hr": { "method": "mean-12rr", "source": "AUTO" },
  "spo2": { "avgOptions": [5, 10, 20], "avgDefault": 10, "updateHz": 0.5 },
  "nibp": { "initialInflation": { "adult": 165, "paed": 130, "neo": 100 } },
  "alarms": {
    "repeatS": { "L1": 10, "L2": 20 }, "lowPulses": 2,
    "silence": { "mode": "acknowledge", "durationS": null, "suppressesVisual": false, "cancelOnNewAlarm": true, "headerCountdown": false, "technicalActsAsAck": true },
    "pause": { "durationS": 120 },
    "latching": { "visual": "red", "audible": "off" }
  },
  "glyphs": { "hrUnavailable": "-?-", "nibpFail": "-?-", "inop": "-?-" },
```

**Modify `packages/skins/src/data/skins/philips-like.json`** — find (exactly once):

```json
    "hr.method": { "tag": "documented", "source": "brief §3.8 (Philips-like mean-12rr)" },
```

replace with:

```json
    "hr.method": { "tag": "documented", "source": "brief §3.8 (Philips-like mean-12rr)" },
    "hr.source": { "tag": "documented", "source": "research/05 §6 [S1] Philips IntelliVue Configuration Guide Rel. J p. 50–51 (Alarms Source default Auto, all profiles)", "note": "FU-5: no valid ECG heart rate and a pulse source present → the pulse becomes the ALARM source (IFU [S2] p. 108: HR/Pulse limits shared, arrhythmia and ECG HR alarms off; Configuration Guide [S1] p. 50 Alarms Source default Auto); the HR numeric keeps -?- (IFU p. 55 LEADS OFF) and the pulse stays in its own tile (relabelNonEcgAs null, inherited) — audit Q4, confirm with Ali" },
    "spo2": { "tag": "documented", "source": "research/05 §6 [S1] Philips Configuration Guide p. 66 (average 10 s); IFU [S2] p. 301 (display update typically 2 s); brief §4.3 (options 5/10/20)" },
    "nibp.initialInflation": { "tag": "documented", "source": "research/05 §6 [S2] Philips IntelliVue IFU p. 303 (initial inflation 165 / 130 / 100 ± 15 mmHg)" },
    "alarms.silence": { "tag": "documented", "source": "research/05 §6 [S2] Philips IntelliVue IFU p. 11, 32 (Silence acknowledges all active alarms and INOPs; new alarms are new)", "note": "replaces the ZOLL 90 s mute inherited from iec-defaults (audit M9, research/06 §6)" },
    "alarms.pause": { "tag": "documented", "source": "research/05 §6 [S1] Philips Configuration Guide p. 135–136, 138 (Pause Alarms 1/2/3 min or infinite, default 2 min)" },
    "alarms.latching": { "tag": "documented", "source": "research/05 §6 [S1] Philips Configuration Guide p. 135–136, 140 (#H30 OR option: Visual Latching Red, Audible Latching Off); IFU [S2] p. 39–40", "note": "INOPs and short yellow arrhythmia alarms never latch" },
    "glyphs.hrUnavailable": { "tag": "documented", "source": "research/05 §6 [S2] Philips IntelliVue IFU p. 55 (LEADS OFF: the numeric shows -?-)" },
    "glyphs.nibpFail": { "tag": "documented", "source": "research/05 §6 [S2] Philips IntelliVue IFU p. 56 (NBP MEASURE FAILED: -?-)" },
    "glyphs.inop": { "tag": "documented", "source": "research/05 §6 [S2] Philips IntelliVue IFU p. 55–62 ('Numeric is replaced by a -?-' for SpO2, pressure, temperature and CO2 INOPs)" },
```

**Modify `packages/skins/src/data/skins/mindray-like.json`** — find (exactly once):

```json
  "alarms": { "pause": { "durationS": 120 }, "numericStyle": "flash-box", "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } } },
```

replace with:

```json
  "alarms": {
    "pause": { "durationS": 120 }, "numericStyle": "flash-box", "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } },
    "silence": { "mode": "acknowledge", "durationS": null, "suppressesVisual": false, "cancelOnNewAlarm": true, "headerCountdown": false, "technicalActsAsAck": true },
    "latching": { "visual": "off", "audible": "off" }
  },
  "nibp": { "autoIntervalMin": 15, "initialInflation": { "adult": 160, "paed": 140, "neo": 90 } },
  "hr": { "source": "AUTO" },
  "arrhythmia": { "asystoleS": { "adult": 5, "neo": 5 }, "vtac": { "rate": 130, "count": 6 }, "pauseAlarm": false },
  "limits": {
    "adult": {
      "values": {
        "HR": [50, 120], "HR_extremeBrady": 35, "HR_extremeTachy": 160, "SpO2": [90, 100], "SpO2_desat": 80,
        "NIBP_S": [90, 160], "NIBP_M": [60, 110], "NIBP_D": [50, 90],
        "ART_S": [90, 160], "ART_M": [70, 110], "ART_D": [50, 90],
        "CVP_M": [0, 10], "PAP_S": [10, 35], "PAP_M": [0, 20], "PAP_D": [0, 16],
        "RR": [8, 30], "apneaS": 20, "EtCO2": [25, 50], "TEMP": [35, 38]
      }
    },
    "paed": {
      "values": {
        "HR": [75, 160], "HR_extremeBrady": 50, "HR_extremeTachy": 180, "SpO2": [90, 100], "SpO2_desat": 80,
        "NIBP_S": [70, 120], "NIBP_M": [50, 90], "NIBP_D": [40, 70],
        "ART_S": [70, 120], "ART_M": [50, 90], "ART_D": [40, 70],
        "CVP_M": [0, 4], "PAP_S": [24, 60], "PAP_M": [12, 26], "PAP_D": [-4, 4],
        "RR": [8, 30], "apneaS": 20, "EtCO2": [25, 50], "TEMP": [35, 38]
      }
    },
    "neo": {
      "values": {
        "HR": [100, 200], "HR_extremeBrady": 60, "HR_extremeTachy": 220, "SpO2": [90, 95], "SpO2_desat": 80,
        "NIBP_S": [40, 90], "NIBP_M": [25, 70], "NIBP_D": [20, 60],
        "ART_S": [55, 90], "ART_M": [35, 70], "ART_D": [20, 60],
        "CVP_M": [0, 4], "PAP_S": [24, 60], "PAP_M": [12, 26], "PAP_D": [-4, 4],
        "RR": [30, 100], "apneaS": 15, "EtCO2": [30, 45], "TEMP": [35, 38]
      }
    }
  },
```

**Modify `packages/skins/src/data/skins/mindray-like.json`** — find (exactly once):

```json
    "alarms.pause": { "tag": "documented", "source": "research/06 §6 (Mindray pause 2 min)" },
```

replace with:

```json
    "alarms.pause": { "tag": "documented", "source": "research/06 §6 (Mindray pause 2 min); research/05 §6 [S4] Mindray BeneVision N Operator's Manual §39.4.2 (Pause Time default 2 min)" },
    "alarms.silence": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual §10.8 (Alarm Reset: tone off, message marked √, a new alarm sounds again; research/05 source)" },
    "alarms.latching": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual §39.4.3 (latching per priority, default Unselected = non-latching)" },
    "nibp.initialInflation": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual App. C.1.5 (initial inflation 160 / 140 / 90 mmHg)" },
    "arrhythmia.asystoleS": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual App. C.1.1.2 (Asystole Delay 5 s, all categories)" },
    "arrhythmia.vtac": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual App. C.1.1.2 (V-Tach Rate 130 adult, V-Tach PVCs 6)", "note": "paed 130 / neo 160 not modelled per band" },
    "arrhythmia.pauseAlarm": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual App. C.1.1.2 (Pause: alarm switch Off, priority Low)", "note": "FU-5: the other yellow arrhythmia switches the engine models are not per-alarm (Tachy/Brady Off here — the engine's mindray-like has no BRADY/TACHY; PVCs/min is CCU On / other departments Off — recorded, the engine keeps it with arrhythmia analysis)" },
    "nibp.autoIntervalMin": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual App. C.1.5 (Interval: OR 5 min, NICU 30 min, other departments 15 min; Start Mode Clock)", "note": "FU-5: 15 min (other departments) equals the inherited value; recorded, not modelled" },
    "limits": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual App. C.1.1–C.1.13 (factory alarm limits: ECG, SpO2, Resp, Temp, NIBP, IBP, CO2); FU-5", "note": "replaces the inherited null table (audit M11: no parameter alarm on mindray-like); Extreme Brady/Tachy are absolute here, limit-relative on the IEC skins" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
        { "param": "IBP1", "extras": ["MEAN", "PPV"] },
```

replace with:

```json
        { "param": "IBP1", "extras": ["MEAN"] },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "silence": { "durationS": 120, "suppressesVisual": true, "cancelOnNewAlarm": true, "headerCountdown": true, "technicalActsAsAck": true },
```

replace with:

```json
    "silence": { "mode": "mute", "durationS": 120, "suppressesVisual": true, "cancelOnNewAlarm": true, "headerCountdown": true, "technicalActsAsAck": true },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "latching": false,
```

replace with:

```json
    "latching": { "visual": "off", "audible": "off" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
  "glyphs": { "noValue": "---", "hrUnavailable": "-?-", "nibpFail": "?", "outOfRange": "--", "ibpPrUnavailable": "---" },
```

replace with:

```json
  "glyphs": { "noValue": "---", "hrUnavailable": "-?-", "nibpFail": "?", "outOfRange": "--", "ibpPrUnavailable": "---", "questionable": "?", "inop": "---" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "layout.tiles": { "tag": "documented", "source": "research/06 §3.1 F1; research/06 §3.2", "note": "FU-3 item 11 [ENG]: NMT and BFA module tiles appended to the second column, drawn only while the stimulator / depth monitor publishes. BFA is a B9 option module (BFI 0–100, BS%, EMG%, SQI%: research/06 §2); no NMT module is documented for the B9 [unverified]" },
```

replace with:

```json
    "layout.tiles": { "tag": "documented", "source": "research/06 §3.1 F1; research/06 §3.2", "note": "FU-3 item 11 [ENG]: NMT and BFA module tiles appended to the second column, drawn only while the stimulator / depth monitor publishes. BFA is a B9 option module (BFI 0–100, BS%, EMG%, SQI%: research/06 §2); no NMT module is documented for the B9 [unverified]. FU-5: IBP1's PPV extra removed — the engine has no PPV numeric and the B9's PPV is OFF by default (research/06 §4.1, M p.149–161)" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "nibp.modeDefault": { "tag": "documented", "source": "research/06 §4.1 (M p.128)" },
```

replace with:

```json
    "nibp.modeDefault": { "tag": "documented", "source": "research/06 §4.1 (M p.128)", "note": "FU-5: recorded, not modelled (the engine's NIBP is command-driven)" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "alarms.latching": { "tag": "unverified", "source": "research/06 §4.2; brief §6.4.1", "note": "manual implies non-latching" },
```

replace with:

```json
    "alarms.latching": { "tag": "unverified", "source": "research/06 §4.2; brief §6.4.1", "note": "manual implies non-latching" },
    "alarms.silence.mode": { "tag": "documented", "source": "research/06 §4.2 (M p.38-39, 50: Silence mutes audio and visual for 120 s)" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "glyphs.ibpPrUnavailable": { "tag": "documented", "source": "research/06 §3.2" }
```

replace with:

```json
    "glyphs.ibpPrUnavailable": { "tag": "documented", "source": "research/06 §3.2" },
    "glyphs.questionable": { "tag": "documented", "source": "brief §4.3, §6.1 ('97?')" },
    "glyphs.inop": { "tag": "assumed", "source": "brief §6.2 (dashes)", "note": "the B9 manual gives no INOP glyph for SpO2/IBP/temperature" }
```

**Modify `packages/skins/CONTRACT.md`** — find (exactly once):

```markdown
A `null` table or cell means "not published" and must never be filled with invented values.
```

replace with:

```markdown
A `null` table or cell means "not published" and must never be filled with invented values.

## FU-5: behaviour fields (monitor fidelity)

- `alarms.latching` is `{ visual, audible }`: `'lethal'` (ASYSTOLE, VFIB, VTAC, EXTREME BRADY/TACHY), `'red'` (every
  level-1 alarm), `'redYellow'` or `'off'`; audible `'off' | 'red' | 'redYellow'`. Technical alarms never latch.
  iec-defaults `lethal`/`off` (FU-5 ruling: IEC 60601-1-8 convention), philips-like `red`/`off` (Configuration Guide
  #H30), mindray-like and saadat-like `off`/`off`.
- `alarms.silence.mode`: `'mute'` mutes for `durationS` (ZOLL 90 s, Saadat 120 s with visuals); `'acknowledge'`
  acknowledges every active alarm, new alarms sound at once, `durationS` is `null` (Philips Silence, Mindray Alarm
  Reset). `r.audio.alarm.silence.durationS` is 0 for acknowledge skins.
- `glyphs.questionable` (suffix of a questionable numeric) and `glyphs.inop` (a numeric whose INOP is active).
- Limit tables may carry `HR_extremeBrady` / `HR_extremeTachy` (absolute thresholds, mindray-like); without them the
  extreme alarms are the HR limit ∓ 20 bpm clamped (Philips).
- The engine reads `spo2.avgDefault`/`updateHz`, `hr.source`/`autoPriority`/`relabelNonEcgAs`, `nibp.initialInflation`,
  `nextInflation`, `stat`, `ibp.filterDefaultHz`, `limits.*.apneaS`/`gasApneaS` and `arrhythmia.asystoleS`.
- `ibp.staticDisplay`: a static (non-pulsatile) pressure keeps its systolic/diastolic/mean with only the pulse "-?-"
  (`'keep'`, Philips IFU p. 57; the IEC default) or shows the mean only (`'mean-only'`, saadat-like).
- `alarms.abpDisconnectDefault`: the arterial-line disconnect alarm (static, mean < 10 mmHg) is on by default
  (Philips IFU p. 44; the IEC default) or off (saadat-like, research/06 §4.1).
- `arrhythmia.pauseAlarm`: the PAUSE alarm's factory switch (mindray-like off, BeneVision N App. C.1.1.2).
- `alarms.messageBar.rotateAll` (FU-5 Task 12): the single message bar rotates every unacknowledged message, live or
  latched, every 2 s (philips-like, IFU p. 29–30), instead of the top level only.

**Recorded, not modelled (kept as documented data — FU-5 review ruling 5: documented data is never deleted):**
`nibp.modeDefault` and `nibp.autoIntervalMin` (the engine's NIBP is command-driven and idle at power-on on every
skin; the vendors' defaults are Philips/IEC AUTO 15 min [brief §6.8], LIFEPAK auto OFF [research/05 §2.4], Saadat MANUAL
[research/06 §4.1, M p.128], Mindray 15 min in other departments / 5 min in the OR with Start Mode Clock [S4] App.
C.1.5); the Philips Alarm Reminder (factory default On, 3 min: a tone repeat for an acknowledged alarm still present,
[S1] p. 135, 141 — decided as the vendor's default, not modelled; Stage 9 or a later FU); silencing some Philips INOPs
switches the measurement off (TEMP/ABP NO TRANSDUCER, CO2 NO TUBING, [S2] p. 57, 62, 71) — not modelled. Removed by
FU-5: saadat-like's IBP1 `PPV` tile
extra (no PPV numeric; the B9's PPV is OFF by default, research/06 §4.1). Option lists (`*Options`, `autoIntervalsMin`,
`ecg.filters`, `spo2.sensitivity`) are settings-menu data and do not claim a behaviour.
```


FU-5 review ruling 3 (per-skin static-pressure display, D11): the skin field `ibp.staticDisplay` (read by the engine in Task 4).

**Modify `packages/skins/src/types.ts`** — find (exactly once):

```ts
    /** Label → [low, mid, high] mmHg. */
    scales: Record<string, [number, number, number]>;
  };
```

replace with:

```ts
    /** Label → [low, mid, high] mmHg. */
    scales: Record<string, [number, number, number]>;
    /**
     * FU-5: a STATIC (non-pulsatile) pressure is shown with its systolic/diastolic/mean kept and only the pulse "-?-"
     * ('keep', Philips IFU [S2] p. 57) or with the mean only ('mean-only', Saadat, research/06 §4.1).
     */
    staticDisplay: 'keep' | 'mean-only';
  };
```

**Modify `packages/skins/src/schema.ts`** — find (exactly once):

```ts
      scaleLines: en(['dotted-upper-mid-lower', 'none']),
```

replace with:

```ts
      scaleLines: en(['dotted-upper-mid-lower', 'none']),
      staticDisplay: en(['keep', 'mean-only']),
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "scaleLines": "none",
```

replace with:

```json
    "scaleLines": "none",
    "staticDisplay": "keep",
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "ibp": { "tag": "documented", "source": "research/05 §2.1-2.2 (ABP 150 scale, 12 Hz filter)", "note": "CVP/PAP scales and 40 Hz option [ENG]" },
```

replace with:

```json
    "ibp": { "tag": "documented", "source": "research/05 §2.1-2.2 (ABP 150 scale, 12 Hz filter)", "note": "CVP/PAP scales and 40 Hz option [ENG]" },
    "ibp.staticDisplay": { "tag": "documented", "source": "research/05 §6 [S2] Philips IntelliVue IFU p. 57 (<Pressure> NON-PULSATILE: 'Pulse numeric is displayed with -?-'; systolic, diastolic and mean stay)" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "scaleLines": "dotted-upper-mid-lower",
```

replace with:

```json
    "scaleLines": "dotted-upper-mid-lower",
    "staticDisplay": "mean-only",
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "ibp": { "tag": "documented", "source": "research/06 §3.2 (M p.304-305); research/06 §4.1 (M p.149-161)" },
```

replace with:

```json
    "ibp": { "tag": "documented", "source": "research/06 §3.2 (M p.304-305); research/06 §4.1 (M p.149-161)" },
    "ibp.staticDisplay": { "tag": "documented", "source": "research/06 §4.1 (static pressure: SYS/DIA hidden, a larger mean shown)" },
```

FU-5 review ruling 5 (vendor data, D7, D8, D10): mindray-like's HR/PR alarm source Auto and its provenance; the skin switches `alarms.abpDisconnectDefault` (saadat-like OFF) and `arrhythmia.pauseAlarm` (mindray-like OFF), read by the engine in Tasks 4 and 8.

**Modify `packages/skins/src/data/skins/mindray-like.json`** — find (exactly once):

```json
    "ecg.filterDefault": { "tag": "eng", "source": "ENG", "note": "Mindray default mode not retrieved" },
```

replace with:

```json
    "ecg.filterDefault": { "tag": "eng", "source": "ENG", "note": "Mindray default mode not retrieved. FU-5: [S4] Mindray BeneVision N Operator's Manual App. C.1.1.1 gives the filter by department (OR: Surgery, CCU: Diagnostic, other departments: Monitor) — 'Monitor' is the other-department default" },
    "hr.source": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual App. C.1.1.1 and C.1.3 (HR/PR Alarm Source Auto)", "note": "FU-5: with the leads off the pulse becomes the alarm source; the HR tile keeps its label (relabelNonEcgAs null, inherited) and the pulse stays in the SpO2 tile" },
```

**Modify `packages/skins/src/types.ts`** — find (exactly once):

```ts
    latching: { visual: 'off' | 'lethal' | 'red' | 'redYellow'; audible: 'off' | 'red' | 'redYellow' };
```

replace with:

```ts
    latching: { visual: 'off' | 'lethal' | 'red' | 'redYellow'; audible: 'off' | 'red' | 'redYellow' };
    /** FU-5: the arterial-line disconnect alarm (static, mean < 10 mmHg) is ON by default (Philips [S2] p. 44; Saadat OFF). */
    abpDisconnectDefault: boolean;
```

**Modify `packages/skins/src/types.ts`** — find (exactly once):

```ts
    brady: number | null;
    freqPvcPerMin: number;
```

replace with:

```ts
    brady: number | null;
    freqPvcPerMin: number;
    /** FU-5: the PAUSE alarm's factory switch (Mindray: Off, [S4] App. C.1.1.2). */
    pauseAlarm: boolean;
```

**Modify `packages/skins/src/schema.ts`** — find (exactly once):

```ts
    latching: obj({ visual: en(['off', 'lethal', 'red', 'redYellow']), audible: en(['off', 'red', 'redYellow']) }),
```

replace with:

```ts
    latching: obj({ visual: en(['off', 'lethal', 'red', 'redYellow']), audible: en(['off', 'red', 'redYellow']) }),
    abpDisconnectDefault: bool,
```

**Modify `packages/skins/src/schema.ts`** — find (exactly once):

```ts
      freqPvcPerMin: num(1, 60),
```

replace with:

```ts
      freqPvcPerMin: num(1, 60),
      pauseAlarm: bool,
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "latching": { "visual": "lethal", "audible": "off" },
```

replace with:

```json
    "latching": { "visual": "lethal", "audible": "off" },
    "abpDisconnectDefault": true,
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "brady": null,
    "freqPvcPerMin": 10
```

replace with:

```json
    "brady": null,
    "freqPvcPerMin": 10,
    "pauseAlarm": true
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "alarms.latching": { "tag": "assumed", "source": "research/10 §11 (M2); research/00 FU-5 ruling (IEC 60601-1-8 convention where the vendor research is silent)", "note": "lethal arrhythmias latch visually until acknowledged; audio stops when the condition ends; limit alarms and INOPs do not latch" },
```

replace with:

```json
    "alarms.latching": { "tag": "assumed", "source": "research/10 §11 (M2); research/00 FU-5 ruling (IEC 60601-1-8 convention where the vendor research is silent)", "note": "lethal arrhythmias latch visually until acknowledged; audio stops when the condition ends; limit alarms and INOPs do not latch" },
    "alarms.abpDisconnectDefault": { "tag": "documented", "source": "research/05 §6 [S2] Philips IntelliVue IFU p. 44 (***<Press> DISCONNECT: non-pulsatile, mean continuously < 10 mmHg)" },
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
    "arrhythmia.pause": { "tag": "documented", "source": "brief §6.4" },
```

replace with:

```json
    "arrhythmia.pause": { "tag": "documented", "source": "brief §6.4" },
    "arrhythmia.pauseAlarm": { "tag": "documented", "source": "brief §6.4 (pause alarm on with arrhythmia analysis)" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "latching": { "visual": "off", "audible": "off" },
```

replace with:

```json
    "latching": { "visual": "off", "audible": "off" },
    "abpDisconnectDefault": false,
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "brady": 50,
    "freqPvcPerMin": 10
```

replace with:

```json
    "brady": 50,
    "freqPvcPerMin": 10,
    "pauseAlarm": true
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "alarms.delayS": { "tag": "documented", "source": "research/06 §4.2 (M p.50)", "note": "'less than 1 s'" },
```

replace with:

```json
    "alarms.delayS": { "tag": "documented", "source": "research/06 §4.2 (M p.50)", "note": "'less than 1 s'" },
    "alarms.abpDisconnectDefault": { "tag": "documented", "source": "research/06 §4.1 (ART catheter-disconnect alarm, level 1, OFF by default)" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "arrhythmia.freqPvcPerMin": { "tag": "documented", "source": "research/06 §4.3" },
```

replace with:

```json
    "arrhythmia.freqPvcPerMin": { "tag": "documented", "source": "research/06 §4.3" },
    "arrhythmia.pauseAlarm": { "tag": "documented", "source": "research/06 §4.3 (PAUSE among the arrhythmia alarms)" },
```

- [ ] **Step 3: The skin test**

**Create `packages/skins/test/fu5-skins.test.ts`:**

```ts
// FU-5 (monitor fidelity): the vendor alarm semantics and the mindray-like limit table are skin DATA with a source.
import { describe, expect, it } from 'vitest';
import { resolveSkin, SKIN_IDS } from '../src/index.ts';

describe('FU-5: alarm latching, silence and limits per vendor', () => {
  it('latching: philips-like red/off (#H30), mindray-like and saadat-like off, the IEC default lethal/off', () => {
    expect(resolveSkin('philips-like').skin.alarms.latching).toEqual({ visual: 'red', audible: 'off' });
    expect(resolveSkin('mindray-like').skin.alarms.latching).toEqual({ visual: 'off', audible: 'off' });
    expect(resolveSkin('saadat-like').skin.alarms.latching).toEqual({ visual: 'off', audible: 'off' });
    expect(resolveSkin('zoll-like').skin.alarms.latching).toEqual({ visual: 'lethal', audible: 'off' });
  });

  it('silence: Philips and Mindray acknowledge (no timer), Saadat mutes 120 s with visuals, ZOLL-like mutes 90 s', () => {
    expect(resolveSkin('philips-like').skin.alarms.silence).toMatchObject({ mode: 'acknowledge', durationS: null, cancelOnNewAlarm: true, headerCountdown: false });
    expect(resolveSkin('mindray-like').skin.alarms.silence).toMatchObject({ mode: 'acknowledge', durationS: null });
    expect(resolveSkin('saadat-like').skin.alarms.silence).toMatchObject({ mode: 'mute', durationS: 120, suppressesVisual: true });
    expect(resolveSkin('zoll-like').skin.alarms.silence).toMatchObject({ mode: 'mute', durationS: 90 });
    expect(resolveSkin('philips-like').audio.alarm.silence).toEqual({ durationS: 0, cancelOnNewAlarm: true });
    expect(resolveSkin('philips-like').skin.alarms.pause).toEqual({ durationS: 120 });
  });

  it('mindray-like has its documented factory limit table (BeneVision N App. C) and extreme thresholds', () => {
    const r = resolveSkin('mindray-like');
    expect(r.limits.adult).toMatchObject({ HR: [50, 120], HR_extremeBrady: 35, HR_extremeTachy: 160, SpO2: [90, 100], NIBP_S: [90, 160], ART_M: [70, 110], CVP_M: [0, 10], RR: [8, 30], apneaS: 20, EtCO2: [25, 50], TEMP: [35, 38] });
    expect(r.limits.neo).toMatchObject({ HR: [100, 200], HR_extremeTachy: 220, SpO2: [90, 95], apneaS: 15 });
    expect(r.skin.arrhythmia.asystoleS).toEqual({ adult: 5, neo: 5 });
    expect(r.provenance.limits?.source).toMatch(/\[S4\] Mindray/);
  });

  it('philips-like: SpO2 10 s / 2 s, NIBP 165 mmHg, HR (alarm) source AUTO with the HR tile kept (no relabel), -?- glyphs', () => {
    const s = resolveSkin('philips-like').skin;
    expect(s.spo2).toMatchObject({ avgDefault: 10, updateHz: 0.5 });
    expect(s.nibp.initialInflation).toEqual({ adult: 165, paed: 130, neo: 100 });
    expect(s.hr).toMatchObject({ source: 'AUTO', relabelNonEcgAs: null });
    expect(s.glyphs).toMatchObject({ hrUnavailable: '-?-', nibpFail: '-?-', inop: '-?-', questionable: '?' });
  });

  it('the documented NIBP mode defaults are kept as data, recorded not modelled (FU-5 review: never delete documented data)', () => {
    expect(resolveSkin('philips-like').skin.nibp).toMatchObject({ modeDefault: 'AUTO', autoIntervalMin: 15 });
    expect(resolveSkin('saadat-like').skin.nibp).toMatchObject({ modeDefault: 'MANUAL', autoIntervalMin: null });
    expect(resolveSkin('lifepak-like').skin.nibp).toMatchObject({ modeDefault: 'MANUAL', autoIntervalMin: null });
    expect(resolveSkin('mindray-like').provenance['nibp.autoIntervalMin']?.source).toMatch(/C\.1\.5/);
  });

  it('mindray-like: HR/PR alarm source Auto, V-Tach PVCs 6, Pause alarm off ([S4] App. C.1.1); saadat-like: IBP disconnect alarm off, static pressure mean-only; philips-like keeps S/D', () => {
    const mr = resolveSkin('mindray-like').skin;
    expect(mr.hr).toMatchObject({ source: 'AUTO', relabelNonEcgAs: null });
    expect(mr.arrhythmia).toMatchObject({ vtac: { rate: 130, count: 6 }, pauseAlarm: false });
    expect(resolveSkin('saadat-like').skin.alarms.abpDisconnectDefault).toBe(false);
    expect(resolveSkin('philips-like').skin.alarms.abpDisconnectDefault).toBe(true);
    expect(resolveSkin('saadat-like').skin.ibp.staticDisplay).toBe('mean-only');
    expect(resolveSkin('philips-like').skin.ibp.staticDisplay).toBe('keep');
  });
});
```


- [ ] **Step 4: The device profile, the entry's `sounding`, the manager**

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
  latching: boolean;
  delayS: number;
  spo2DelayS: number;
  silence: { durationS: number; suppressesVisual: boolean; cancelOnNewAlarm: boolean; technicalActsAsAck: boolean };
```

replace with:

```ts
  /** FU-5: visual / audible latching per vendor (skin `alarms.latching`; manager.ts `latchCovers`). */
  latching: Skin['alarms']['latching'];
  delayS: number;
  spo2DelayS: number;
  /** FU-5: `mode` 'acknowledge' = Silence acknowledges (Philips, Mindray); 'mute' = timed mute (`durationS`). */
  silence: { mode: 'mute' | 'acknowledge'; durationS: number | null; suppressesVisual: boolean; cancelOnNewAlarm: boolean; technicalActsAsAck: boolean };
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
    latching: a.latching,
    delayS: a.delayS,
    spo2DelayS: a.spo2DelayS ?? a.delayS,
    silence: { durationS: a.silence.durationS, suppressesVisual: a.silence.suppressesVisual, cancelOnNewAlarm: a.silence.cancelOnNewAlarm, technicalActsAsAck: a.silence.technicalActsAsAck },
```

replace with:

```ts
    latching: { ...a.latching },
    delayS: a.delayS,
    spo2DelayS: a.spo2DelayS ?? a.delayS,
    silence: { mode: a.silence.mode, durationS: a.silence.durationS, suppressesVisual: a.silence.suppressesVisual, cancelOnNewAlarm: a.silence.cancelOnNewAlarm, technicalActsAsAck: a.silence.technicalActsAsAck },
```

**Modify `packages/engine-core/src/types-device.ts`** — find (exactly once):

```ts
  /** The condition is gone but the alarm is latched (brief §6.4). */
  latched: boolean;
  acked: boolean;
}
```

replace with:

```ts
  /** The condition is gone but the alarm is latched (brief §6.4). */
  latched: boolean;
  acked: boolean;
  /**
   * FU-5: the alarm sound plays — raised and not acknowledged, and while latched only under the skin's AUDIBLE latching
   * (philips-like #H30: visual only). Absent in pre-FU-5 events: read as `!acked`.
   */
  sounding?: boolean;
}
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
export const LEVEL_PRIORITY: Readonly<Record<AlarmLevel, AlarmPriority>> = { 1: 'high', 2: 'medium', 3: 'low' };
```

replace with:

```ts
export const LEVEL_PRIORITY: Readonly<Record<AlarmLevel, AlarmPriority>> = { 1: 'high', 2: 'medium', 3: 'low' };
/**
 * FU-5: the alarms visual latching 'lethal' keeps — the lethal arrhythmias (research/00 FU-5 ruling, IEC 60601-1-8
 * convention: they latch visually until acknowledged; limit alarms do not latch). The set is Mindray's "High,
 * unadjustable" arrhythmia group (research/05 §6 [S4] BeneVision N App. C.1.1.2: asystole, VF, V-Tach, extreme rates).
 */
export const LETHAL_ALARMS: ReadonlySet<string> = new Set(['ASYSTOLE', 'VFIB', 'VTAC', 'EXTREME_BRADY', 'EXTREME_TACHY']);

/** FU-5: whether a latching mode covers an alarm. INOPs never latch (Philips IFU [S2] p. 40). */
export function latchCovers(mode: 'off' | 'lethal' | 'red' | 'redYellow', e: Pick<AlarmEntry, 'id' | 'level' | 'category'>): boolean {
  if (e.category === 'technical' || mode === 'off') return false;
  if (mode === 'lethal') return LETHAL_ALARMS.has(e.id);
  return mode === 'red' ? e.level === 1 : e.level <= 2;
}
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
    case 'silence': {
      if (s.silencedUntil !== null) {
```

replace with:

```ts
    case 'silence': {
      // FU-5: Philips' Silence and Mindray's Alarm Reset acknowledge every active alarm and INOP; there is no mute timer,
      // so a new alarm sounds at once (research/05 §6 [S2] p. 11, 32; [S4] §10.8)
      if (p.silence.mode === 'acknowledge') {
        acknowledgeAll(s, t, out);
        return;
      }
      if (s.silencedUntil !== null) {
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
      s.silencedUntil = t + p.silence.durationS;
```

replace with:

```ts
      s.silencedUntil = t + (p.silence.durationS ?? 0);
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
    case 'ack': {
      for (const [id, e] of Object.entries(s.active)) {
        if (e.latched) {
          delete s.active[id];
          emitAlarm(out, t, e, 'cleared');
        } else if (!e.acked) {
          e.acked = true;
          emitAlarm(out, t, e, 'acked');
        }
      }
      return;
    }
```

replace with:

```ts
    case 'ack':
      acknowledgeAll(s, t, out);
      return;
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
/** Apply a validated `device alarm` action at sim time t. */
```

replace with:

```ts
/** Acknowledge: latched alarms clear, live ones are marked acknowledged and fall silent (brief §6.4; [S2] p. 32). */
function acknowledgeAll(s: AlarmMgrState, t: number, out: EngineEvent[]): void {
  for (const [id, e] of Object.entries(s.active)) {
    if (e.latched) {
      delete s.active[id];
      emitAlarm(out, t, e, 'cleared');
    } else if (!e.acked) {
      e.acked = true;
      e.sounding = false;
      emitAlarm(out, t, e, 'acked');
    }
  }
}

/** Apply a validated `device alarm` action at sim time t. */
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
      if (e.latched) {
        e.latched = false; // the condition came back while latched
        s.dirty = true;
      }
      continue;
```

replace with:

```ts
      if (e.latched) {
        e.latched = false; // the condition came back while latched
        e.sounding = !e.acked;
        s.dirty = true;
      }
      continue;
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
    const entry: AlarmEntry = { id: c.id, level: c.level, category: c.category, text: c.text, since: t, latched: false, acked: false };
```

replace with:

```ts
    const entry: AlarmEntry = { id: c.id, level: c.level, category: c.category, text: c.text, since: t, latched: false, acked: false, sounding: true };
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
    // High-priority physiological alarms latch until acknowledged (brief §6.4 [ENG]); Saadat-like does not latch.
    if (p.latching && e.level === 1 && e.category === 'physiological' && !e.acked) {
      if (!e.latched) {
        e.latched = true;
        s.dirty = true;
      }
      continue;
    }
```

replace with:

```ts
    // FU-5: latching per vendor (skin `alarms.latching`): the message stays until acknowledged, the sound only under
    // audible latching; an acknowledged alarm whose condition ends clears ([S2] p. 40)
    if (!e.acked && latchCovers(p.latching.visual, e)) {
      if (!e.latched) {
        e.latched = true;
        e.sounding = latchCovers(p.latching.audible, e);
        s.dirty = true;
      }
      continue;
    }
```


- [ ] **Step 5: Tests — the latching/Silence cases and the R45 re-statements**

**Modify `packages/engine-core/test/l3/alarms/profile.test.ts`** — find (exactly once):

```ts
    expect(p.silence).toEqual({ durationS: 120, suppressesVisual: true, cancelOnNewAlarm: true, technicalActsAsAck: true });
    expect(p.pauseS).toBeNull();
    expect(p.latching).toBe(false);
```

replace with:

```ts
    expect(p.silence).toEqual({ mode: 'mute', durationS: 120, suppressesVisual: true, cancelOnNewAlarm: true, technicalActsAsAck: true });
    expect(p.pauseS).toBeNull();
    expect(p.latching).toEqual({ visual: 'off', audible: 'off' });
```

**Modify `packages/engine-core/test/l3/alarms/profile.test.ts`** — find (exactly once):

```ts
  it('philips-like: limits by age band (HR 50–120 / 75–160 / 100–200), desat 80, 4 s / 3 s asystole, 90 s silence, 180 s pause', () => {
```

replace with:

```ts
  it('philips-like: limits by age band (HR 50–120 / 75–160 / 100–200), desat 80, 4 s / 3 s asystole, Silence = acknowledge, 120 s pause (FU-5: IntelliVue [S1]/[S2])', () => {
```

**Modify `packages/engine-core/test/l3/alarms/profile.test.ts`** — find (exactly once):

```ts
    expect(a.silence.durationS).toBe(90);
    expect(a.silence.suppressesVisual).toBe(false);
    expect(a.pauseS).toBe(180);
    expect(a.latching).toBe(true);
```

replace with:

```ts
    expect(a.silence).toMatchObject({ mode: 'acknowledge', durationS: null, suppressesVisual: false });
    expect(a.pauseS).toBe(120);
    expect(a.latching).toEqual({ visual: 'red', audible: 'off' });
```

**Modify `packages/engine-core/test/l3/alarms/manager.test.ts`** — find (exactly once):

```ts
  it('IEC-style latching: a red alarm stays (latched) after its condition clears until acknowledged', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 2, (t) => (t < 1 ? [ASY] : []));
    expect(s.active.ASYSTOLE?.latched).toBe(true);
```

replace with:

```ts
  it('IEC-style latching: a red alarm stays (latched, silent: visual-only latching on philips-like #H30) after its condition clears until acknowledged', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 2, (t) => (t < 1 ? [ASY] : []));
    expect(s.active.ASYSTOLE?.latched).toBe(true);
    expect(s.active.ASYSTOLE?.sounding).toBe(false);
```

**Modify `packages/engine-core/test/l3/alarms/manager.test.ts`** — find (exactly once):

```ts
  it('IEC-style silence (90 s) is not ended by a new alarm', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 1, () => [HR]);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 5, () => [HR, ASY]);
    expect(s.silencedUntil).toBeCloseTo(91, 6);
  });

  it('pause (IEC-style 180 s) removes every alarm and raises nothing until it ends; Saadat-like rejects pause', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
```

replace with:

```ts
  it('IEC-style mute silence (90 s, zoll-like) is not ended by a new alarm', () => {
    const s = createAlarmMgr(deviceProfile('zoll-like'));
    run(s, 0, 1, () => [HR]);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 5, () => [HR, ASY]);
    expect(s.silencedUntil).toBeCloseTo(91, 6);
  });

  it('pause (IEC-style 180 s) removes every alarm and raises nothing until it ends; Saadat-like rejects pause', () => {
    const s = createAlarmMgr(deviceProfile('zoll-like'));
```

**Create `packages/engine-core/test/l3/alarms/fu5-latching.test.ts`:**

```ts
// FU-5: latching, acknowledge and silence per vendor (skin data; research/00 FU-5 ruling; research/05 §6 [S1] p. 135–140,
// [S2] p. 32–40, [S4] §10.8, §39.4.3; research/06 §4.2). Synthetic conditions, stepped at the engine's 20 ms tick.
import { describe, expect, it } from 'vitest';
import { applyAlarmAction, createAlarmMgr, latchCovers, stepAlarms, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) stepAlarms(s, k * TICK, conds(k * TICK), out);
  return out;
}
const ASY: Condition = { id: 'ASYSTOLE', level: 1, category: 'physiological', text: '***ASYSTOLE', delayS: 0 };
const APNEA: Condition = { id: 'apnoea-co2', level: 1, category: 'physiological', text: '***APNEA', delayS: 0 };
const HR: Condition = { id: 'HR_HIGH', level: 2, category: 'physiological', text: '**HR 130>120', delayS: 0, numeric: 'hr' };
const VF: Condition = { id: 'VFIB', level: 1, category: 'physiological', text: '***VENT FIB/TACH', delayS: 0 };
const INOP: Condition = { id: 'ecgLeadsOff', level: 3, category: 'technical', text: 'ECG LEADS OFF', delayS: 0 };

describe('FU-5 latching per vendor', () => {
  it('latchCovers: lethal / red / redYellow / off; INOPs never latch', () => {
    expect(latchCovers('lethal', ASY)).toBe(true);
    expect(latchCovers('lethal', APNEA)).toBe(false);
    expect(latchCovers('red', APNEA)).toBe(true);
    expect(latchCovers('red', HR)).toBe(false);
    expect(latchCovers('redYellow', HR)).toBe(true);
    expect(latchCovers('redYellow', INOP)).toBe(false);
    expect(latchCovers('off', ASY)).toBe(false);
  });

  it('philips-like (#H30 visual Red, audible Off): a resolved APNEA stays on screen, silent, until acknowledged', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 30, (t) => (t < 20 ? [APNEA] : []));
    expect(s.active['apnoea-co2']).toMatchObject({ latched: true, sounding: false, acked: false });
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'ack' }, 30, out);
    expect(s.active['apnoea-co2']).toBeUndefined();
  });

  it('IEC default (zoll-like, lethal/off): ASYSTOLE latches silently, a resolved red APNEA clears, a yellow limit alarm clears', () => {
    const s = createAlarmMgr(deviceProfile('zoll-like'));
    run(s, 0, 10, (t) => (t < 5 ? [ASY, APNEA, HR] : []));
    expect(Object.keys(s.active)).toEqual(['ASYSTOLE']);
    expect(s.active.ASYSTOLE).toMatchObject({ latched: true, sounding: false });
  });

  it('mindray-like (latching Unselected) and saadat-like do not latch', () => {
    for (const id of ['mindray-like', 'saadat-like']) {
      const s = createAlarmMgr(deviceProfile(id));
      run(s, 0, 10, (t) => (t < 5 ? [ASY, VF] : []));
      expect(Object.keys(s.active)).toEqual([]);
    }
  });

  it('philips-like Silence acknowledges every active alarm (no timer) and a NEW red alarm sounds at once', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 5, () => [ASY, INOP]);
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 5, out);
    expect(s.silencedUntil).toBeNull();
    expect(s.active.ASYSTOLE).toMatchObject({ acked: true, sounding: false });
    expect(s.active.ecgLeadsOff).toMatchObject({ acked: true });
    run(s, 5.02, 10, () => [ASY, INOP, VF]);
    expect(s.active.VFIB).toMatchObject({ acked: false, sounding: true });
  });

  it('mindray-like Alarm Reset acknowledges the same way; saadat-like keeps its 120 s mute', () => {
    const m = createAlarmMgr(deviceProfile('mindray-like'));
    run(m, 0, 2, () => [ASY]);
    applyAlarmAction(m, { device: 'alarm', action: 'silence' }, 2, []);
    expect(m.silencedUntil).toBeNull();
    expect(m.active.ASYSTOLE?.acked).toBe(true);
    const sa = createAlarmMgr(deviceProfile('saadat-like'));
    run(sa, 0, 2, () => [ASY]);
    applyAlarmAction(sa, { device: 'alarm', action: 'silence' }, 2, []);
    expect(sa.silencedUntil).toBeCloseTo(122, 6);
  });

  it('an acknowledged alarm whose condition ends clears even under latching ([S2] p. 40)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 2, () => [ASY]);
    applyAlarmAction(s, { device: 'alarm', action: 'ack' }, 2, []);
    run(s, 2.02, 4, () => []);
    expect(s.active.ASYSTOLE).toBeUndefined();
  });
});
```

**Modify `packages/renderer/test/alarm-view.test.ts`** — find (exactly once):

```ts
  it('philips-like silence keeps the visuals (audio only), and same-level messages rotate every 2 s', () => {
    const a2 = { ...asy, id: 'VFIB', text: '***VFIB/VTACH', since: 6 };
    const s = status({ active: [{ ...asy, text: '***ASYSTOLE' }, a2], silencedUntil: 100 });
    expect(barView(s, ph, 12)).toMatchObject({ text: '***ASYSTOLE', bg: '#FF0000', fg: '#FFFFFF', countdownS: 88 });
    expect(barView(s, ph, 14).text).toBe('***VFIB/VTACH');
  });
```

replace with:

```ts
  it('IEC-style mute (zoll-like 90 s) keeps the visuals (audio only) with a countdown; philips-like Silence acknowledges (FU-5: no countdown); same-level messages rotate every 2 s', () => {
    const zl = resolveSkin('zoll-like');
    const a2 = { ...asy, id: 'VFIB', text: '***VFIB/VTACH', since: 6 };
    const s = status({ active: [{ ...asy, text: '***ASYSTOLE' }, a2], silencedUntil: 100 });
    expect(barView(s, zl, 12)).toMatchObject({ text: '***ASYSTOLE', bg: '#FF0000', fg: '#FFFFFF', countdownS: 88 });
    expect(barView(s, zl, 14).text).toBe('***VFIB/VTACH');
    expect(barView(status({ active: [{ ...asy, text: '***ASYSTOLE' }, a2] }), ph, 14)).toMatchObject({ text: '***VFIB/VTACH', countdownS: null });
  });
```

**Modify `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts`** — find (exactly once):

```ts
      const hasLimit = skin === 'philips-like' || skin === 'saadat-like'; // 0–10 (Philips factory), −5–15 (Saadat M p. 302–306)
```

replace with:

```ts
      const hasLimit = skin === 'philips-like' || skin === 'saadat-like' || skin === 'mindray-like'; // 0–10 (Philips factory), −5–15 (Saadat M p. 302–306), 0–10 (FU-5: Mindray BeneVision N App. C.1)
```


- [ ] **Step 6: Run**

```bash
(cd packages/skins && npx vitest run -u && git diff --stat test/__snapshots__)   # philips-like and mindray-like snapshots only
npx -y pnpm@9.15.9 typecheck
(cd packages/skins && npx vitest run) && (cd packages/renderer && npx vitest run test/alarm-view.test.ts)
(cd packages/engine-core && npx vitest run test/l3/alarms)
(cd packages/engine-core && npx vitest run test/engine/circ-manual-cvp-peep.test.ts)   # SLOW set, the mindray-like CVP limit
```

Expected: the snapshot diff touches only `philips-like` and `mindray-like` (silence `durationS 90 → 0`,
`cancelOnNewAlarm true`, the mindray limit table); skins 183 passed; alarm-view passes; `test/l3/alarms` all pass
(fu5-latching 7 tests: philips-like APNEA latched `{ latched: true, sounding: false }` until `ack`; zoll-like keeps only
ASYSTOLE latched; mindray-like/saadat-like latch nothing; philips-like Silence → `silencedUntil null`, ASYSTOLE acked,
a new VFIB `sounding: true`; saadat-like mute until 122 s).

- [ ] **Step 7: Commit**

```bash
git add packages/skins packages/engine-core/src packages/engine-core/test packages/renderer/test
git commit -m "FU-5 Task 2: latching and Silence per vendor, mindray-like limits (IntelliVue #H30, BeneVision N)

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 3: The oximeter follows the perfusion — pleth amplitude, SpO2 validity, per-skin averaging; the fidelity rig and suite item 1 (E-FU5-1, E-FU5-2; PROTOTYPED)

Decisions D1, D2. The ruling's named L2 exception: the pleth pulse amplitude now uses the RESTING stroke volume (the
brief's `SV_0`) and the peripheral tone; the oximeter's pulse clock is the last COMPLETED pulse; the skin's SpO2
averaging and update are applied (philips-like 10 s / 2 s). The fidelity rig `test/helpers/monitor.ts` (the audit's
runner as a Vitest helper, yielding per sim-minute) and suite item 1 land here, in a new SLOW entry
`test/engine/fidelity-*.test.ts`. `truth.ts` stops walking the monitor's numerics machinery (E-FU5-7, see the note).

**Files:**
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (E-FU5-1: two lines in `advanceHemo`),
  `packages/engine-core/src/l2/resp/pipeline.ts` (E-FU5-2: the `stepSpo2` input), `packages/engine-core/src/l3/spo2/spo2.ts`,
  `packages/engine-core/src/l3/alarms/profile.ts`, `packages/engine-core/src/engine.ts` (`syncCo2Sampler`),
  `packages/engine-core/vite.config.ts` (one SLOW entry), `packages/engine-core/src/truth.ts` (E-FU5-7: three
  SKIP_PATH entries)
- Create: `packages/engine-core/test/helpers/monitor.ts`, `packages/engine-core/test/engine/fidelity-lowflow.test.ts`,
  `packages/engine-core/test/l3/spo2/spo2-skin.test.ts`

**E-FU5-7 (`truth.ts`, 7x's file; also edited by FU-4 E-FU4-3 on the same `SKIP_PATH` line — merge = union of both
lists):** the truth tree's "future tree (12 drugs)" check sat at 2 098 of its 2 100-leaf cap on `origin/main`; FU-5's
device fields (the skin's SpO2/NIBP/filter/apnoea settings, the numerics' search state) push it over and the check
`truncated === false` fails. `hemo.num`, `resp.num` and `hemo.nibp` are the monitor's numerics machinery and the cuff
— device state that the 7x console already hides as internal (`apps/demo/src/physiology-console/organs.ts`
`INTERNAL_PREFIXES`); skipping them takes the tree to 2 028 leaves (measured). The cap and the 50 KB budget are
unchanged (R45: the tree is reduced, no band moves).

- [ ] **Step 1: The pleth amplitude (E-FU5-1) and the oximeter's pulse input (E-FU5-2)**

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** — find (exactly once):

```ts
        const svRef = Math.max(1, bs.length >= 4 ? bs.reduce((a, b) => a + b.sv, 0) / bs.length : (c.ref.sv || 70));
```

replace with:

```ts
        // FU-5 (E-FU5-1, audit M1): SV_0 is the settled RESTING stroke volume (brief §4.3 "PI × (SV_i/SV_0)"), not a
        // running mean of the last 16 beats (which drew a 0.6 mL beat as a normal pulse: SpO2 98 / PI 2.5 at MAP 2).
        // In MODELED, vasoconstriction (systemic R above rest) lowers PI too [ENG exponent 0.5]; the factor is never above 1
        // and is 1 in MANUAL (FU-5 review ruling 1: an uncapped factor made PI rise as the MANUAL tracker lowered SVR, and
        // fall after propofol; the vasodilated finger waits for FU-4's cutaneous tone, R-FU5-9).
        const svRef = Math.max(1, c.ref.sv || 70);
        const tone = ctx.l1.mode === 'modeled' ? Math.min(1, Math.max(0.25, Math.sqrt(c.base.rSys / c.p.rSys))) : 1;
```

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** — find (exactly once):

```ts
(l1Value(ctx.l1, 'pi', t1) * op.sv) / svRef, lvet, c.p.rSys);
```

replace with:

```ts
(l1Value(ctx.l1, 'pi', t1) * tone * op.sv) / svRef, lvet, c.p.rSys);
```

**Modify `packages/engine-core/src/l2/resp/pipeline.ts`** — find (exactly once):

```ts
    siteSa, probe: h.pleth.state, lastFootT: h.num.pleth.feet[h.num.pleth.feet.length - 1] ?? -1e12,
```

replace with:

```ts
    siteSa, probe: h.pleth.state, lastFootT: h.num.pleth.beats[h.num.pleth.beats.length - 1]?.t ?? -1e12, // FU-5 (E-FU5-2): a completed pulse
```


- [ ] **Step 2: Per-skin SpO2 averaging and update**

**Modify `packages/engine-core/src/l3/spo2/spo2.ts`** — find (exactly once):

```ts
/** Masimo-SET-like default of the first skin (saadat-like, R13/R14): average 8 s, update 1 s (brief §4.3, §6.1). */
export const SPO2_PROFILE = { averagingS: 8, updateS: 1 } as const;
```

replace with:

```ts
/**
 * Masimo-SET-like default of the first skin (saadat-like, R13/R14): average 8 s, update 1 s (brief §4.3, §6.1). FU-5: a
 * skin's `spo2.avgDefault` / `updateHz` replace it through `Spo2State.avgS/updS` (philips-like 10 s / 2 s).
 */
export const SPO2_PROFILE = { averagingS: 8, updateS: 1 } as const;
```

**Modify `packages/engine-core/src/l3/spo2/spo2.ts`** — find (exactly once):

```ts
  lastFootT: number; // last detected pleth foot (s), −Infinity if none
```

replace with:

```ts
  lastFootT: number; // end of the last COMPLETED pleth pulse (s), −Infinity if none (FU-5: one lone foot is not a pulse)
```

**Modify `packages/engine-core/src/l3/spo2/spo2.ts`** — find (exactly once):

```ts
  bias: number; // per-patient device offset (%)
}
```

replace with:

```ts
  bias: number; // per-patient device offset (%)
  /** FU-5: the active skin's averaging window and display update (s); absent = SPO2_PROFILE. */
  avgS?: number;
  updS?: number;
}
```

**Modify `packages/engine-core/src/l3/spo2/spo2.ts`** — find (exactly once):

```ts
  const win = Math.round((SPO2_PROFILE.averagingS * (lowPerf ? LOW_PERF_SLOWDOWN : 1)) / SPO2_STEP_S);
```

replace with:

```ts
  const avgS = st.avgS ?? SPO2_PROFILE.averagingS;
  const win = Math.round((avgS * (lowPerf ? LOW_PERF_SLOWDOWN : 1)) / SPO2_STEP_S);
```

**Modify `packages/engine-core/src/l3/spo2/spo2.ts`** — find (exactly once):

```ts
  st.nextUpdate = t + SPO2_PROFILE.updateS;
```

replace with:

```ts
  st.nextUpdate = t + (st.updS ?? SPO2_PROFILE.updateS);
```

**Modify `packages/engine-core/src/l3/spo2/spo2.ts`** — find (exactly once):

```ts
  if (t - st.validSince < SPO2_PROFILE.averagingS) return; // the average refills after a pulse returns (ROSC)
```

replace with:

```ts
  if (t - st.validSince < avgS) return; // the average refills after a pulse returns (ROSC)
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
  co2Sidestream: { delayS: number; riseS: number };
}
```

replace with:

```ts
  co2Sidestream: { delayS: number; riseS: number };
  /** FU-5: the skin's SpO2 averaging window and display update (skin `spo2.avgDefault`, 1 / `spo2.updateHz`), s. */
  spo2: { averagingS: number; updateS: number };
}
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
    co2Sidestream: { delayS: s.co2.sidestreamDelayS, riseS: s.co2.riseTimeMs / 1000 },
  };
```

replace with:

```ts
    co2Sidestream: { delayS: s.co2.sidestreamDelayS, riseS: s.co2.riseTimeMs / 1000 },
    spo2: { averagingS: s.spo2.avgDefault, updateS: 1 / s.spo2.updateHz },
  };
```

**Modify `packages/engine-core/src/engine.ts`** — find (exactly once):

```ts
  /** R39-5: the capnograph's sidestream delay/rise come from the active skin (research 09 §5). */
  private syncCo2Sampler(): void {
    this.st.resp.sampler.side = { ...this.dev.alarms.profile.co2Sidestream };
  }
```

replace with:

```ts
  /**
   * R39-5: the capnograph's sidestream delay/rise come from the active skin (research 09 §5). FU-5: so do the other
   * device settings a skin declares (SpO2 averaging/update, …), applied on creation, restore and skin switch.
   */
  private syncCo2Sampler(): void {
    const p = this.dev.alarms.profile;
    this.st.resp.sampler.side = { ...p.co2Sidestream };
    this.st.resp.num.spo2.avgS = p.spo2.averagingS;
    this.st.resp.num.spo2.updS = p.spo2.updateS;
  }
```


- [ ] **Step 3: The fidelity rig, the SLOW entry, suite item 1, the SpO2 unit test**

**Create `packages/engine-core/test/helpers/monitor.ts`:**

```ts
// FU-5 monitor-fidelity rig (research/10-monitor-fidelity-audit.md §1): an adult 40 y 70 kg M, seed 7, with ECG, SpO2
// (left finger), ABP, CVP, NIBP (right arm), CO2 and temperature, on a chosen skin; a scripted timeline; every 1 s one
// row of what the MONITOR shows (measured numerics with flags, alarmStatus entries) beside the TRUTH (committed state,
// read-only) and the displayed pleth peak-to-peak. Yields once per sim-minute (CI amendment 4).
import { createEngine } from '../../src/engine.ts';
import type { AlarmEntry } from '../../src/types-device.ts';
import type { EngineEvent, Measured, MonitorEngine, NumericId } from '../../src/types.ts';

export type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
type Status = Extract<EngineEvent, { type: 'alarmStatus' }>;
export type Step = [number, Record<string, unknown> | ((e: MonitorEngine) => void)];
export interface MonRow {
  t: number;
  map: number; sv: number; co: number; sao2: number; rhythm: string; pulseless: boolean;
  /** Truth radial systolic/diastolic, the mean over the beats of the last 6 s (the FU-5 review's NIBP rows). */
  sbp: number; dbp: number;
  m: Partial<Record<NumericId, Measured>>;
  active: AlarmEntry[];
  silencedUntil: number | null;
  plethPtp: number;
}
export interface MonRun { e: MonitorEngine; rows: MonRow[]; alarms: Alarm[]; nibp: Array<Extract<EngineEvent, { type: 'nibp' }>> }

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event });
/** Command bodies the fidelity scenarios use (the audit's A helpers). */
export const M = {
  ett: () => ev({ kind: 'airwayDevice', device: 'ett' }),
  vent: (peep = 5, fio2 = 0.5, rr = 12, vtMl = 600) => ev({ kind: 'ventilation', source: 'ventilator', rr, vtMl, peep, fio2 }),
  ventOff: () => ev({ kind: 'ventilation', source: 'none' }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  cond: (id: string, severity: number) => ev({ kind: 'condition', id, severity }),
  drug: (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' }),
  vap: (agent: string, dialPct: number) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm: 2, n2oFrac: 0 }),
  cpr: (active: boolean) => ev({ kind: 'cpr', active, rate: 110, quality: 1 }),
  airway: (state: string) => ev({ kind: 'airway', state }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}) => ({ type: 'setRhythm', rhythm, opts }),
  target: (variable: string, value: number) => ({ type: 'setTarget', variable, value }),
  sensor: (sensor: string, state: string, site?: string) => ({ type: 'attachSensor', sensor, state, ...(site ? { site } : {}) }),
  nibp: (action: 'start' | 'auto', intervalMin?: number) => ({ type: 'device', action: { device: 'nibp', action, ...(intervalMin ? { intervalMin } : {}) } }),
  alarm: (action: string, extra: Record<string, unknown> = {}) => ({ type: 'device', action: { device: 'alarm', action, ...extra } }),
};
export const VENTED: Step[] = [[1, M.ett()], [1, M.vent()]];
const SENSORS = { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on', temp: 'on', nibp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole']);

export async function monitorRun(o: { mode: 'manual' | 'modeled'; skin?: string; sensors?: Record<string, string>; steps: Step[]; tEnd: number }): Promise<MonRun> {
  const e = createEngine({ seed: 7, mode: o.mode, patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { ...SENSORS, ...(o.sensors ?? {}) } } as never, device: { skin: o.skin ?? 'philips-like' } });
  const m: Partial<Record<NumericId, Measured>> = {};
  let st: Status | null = null;
  const alarms: Alarm[] = [];
  const nibp: MonRun['nibp'] = [];
  e.on((x) => {
    if (x.type === 'measurement') Object.assign(m, x.values);
    else if (x.type === 'alarmStatus') st = x;
    else if (x.type === 'alarm' && x.level !== undefined) alarms.push(x);
    else if (x.type === 'nibp' && (x.result !== undefined || x.phase === 'failed')) nibp.push(x);
  }, ['measurement', 'alarmStatus', 'alarm', 'nibp']);
  const pending = [...o.steps].sort((a, b) => a[0] - b[0]);
  const rows: MonRow[] = [];
  let n = 0;
  const buf = new Float32Array(500);
  for (let t = 1; t <= o.tEnd + 1e-9; t++) {
    while (pending.length > 0 && (pending[0] as Step)[0] < t) {
      const [ts, body] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      if (typeof body === 'function') body(e);
      else e.dispatch({ id: `m${++n}`, issuedBy: 'fidelity', ...body } as never);
    }
    e.advanceTo(t);
    const ps = (e as unknown as { st: { rhythm: { id: string; opts?: { pulseless?: boolean } }; hemo: { circ: { beats: Array<{ t: number; map: number; sv: number; sbp: number; dbp: number }>; lastEjT: number; qFwd: number } }; resp: { o2: { sa: number } } } }).st;
    const bs = ps.hemo.circ.beats.filter((b) => b.t > t - 6);
    const noEject = t - ps.hemo.circ.lastEjT > 3;
    const last = e.latestSampleIndex('pleth');
    const got = last >= 0 ? e.readSamples('pleth', last - buf.length + 1, buf) : 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < got; i++) {
      lo = Math.min(lo, buf[i] as number);
      hi = Math.max(hi, buf[i] as number);
    }
    const s = st as Status | null;
    rows.push({
      t, rhythm: ps.rhythm.id, pulseless: PULSELESS.has(ps.rhythm.id) || ps.rhythm.opts?.pulseless === true,
      map: bs.length ? bs.reduce((a, b) => a + b.map, 0) / bs.length : Number.NaN,
      sbp: bs.length ? bs.reduce((a, b) => a + b.sbp, 0) / bs.length : Number.NaN, dbp: bs.length ? bs.reduce((a, b) => a + b.dbp, 0) / bs.length : Number.NaN, sv: bs.length ? bs.reduce((a, b) => a + b.sv, 0) / bs.length : 0,
      co: noEject ? 0 : ps.hemo.circ.qFwd * 0.06, sao2: ps.resp.o2.sa * 100, m: structuredClone(m), active: s ? s.active.map((a) => ({ ...a })) : [], silencedUntil: s ? s.silencedUntil : null,
      plethPtp: got > 0 ? hi - lo : Number.NaN,
    });
    if (t % 60 === 0) await new Promise<void>((r) => setImmediate(r));
  }
  return { e, rows, alarms, nibp };
}

/** A value shown as valid (not questionable, not invalid). */
export const validShown = (x: Measured | undefined): boolean => !!x && x.value !== null && x.flag === 'valid';
export const activeIds = (r: MonRow): string[] => r.active.map((a) => a.id);
```

**Modify `packages/engine-core/vite.config.ts`** — find (exactly once):

```ts
  'test/engine/hemo-nibp.test.ts',
```

replace with:

```ts
  'test/engine/hemo-nibp.test.ts',
  'test/engine/fidelity-*.test.ts', // FU-5: monitor-fidelity scenarios (up to 45 sim-min each)
```

**Create `packages/engine-core/test/engine/fidelity-lowflow.test.ts`:**

```ts
// FU-5 monitor-fidelity suite item 1 (research/10 §13): the oximeter in low flow. Before FU-5 a 3 L bleed to MAP 2 /
// SV 0.6 mL showed SpO2 98 valid, PI 2.5, a pleth larger than at rest (the pulse was scaled to the last 16 beats), and
// Ali's tamponade case showed SpO2 98–99 / PI 1.9–2.3 at MAP 13–16 (audit §2, M1). Sources: brief §4.3 (amplitude
// PI × SV_i/SV_0, LOW PERF below PI 0.3, no pulse → invalid after 10–30 s); research/05 §6 [S2] p. 58–59 (LOW PERF
// keeps the value with "?", NON-PULSAT. replaces it).
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED, validShown, type Alarm, type MonRow } from '../helpers/monitor.ts';

const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
/**
 * Raise→clear cycles shorter than `minS` of the alarms at `level` (review rulings 5 and 6, F7/F9: a technical INOP or a
 * red alarm must not flicker; after FU-4's arrests the agonal rhythm re-raised EXTREME BRADY 11 times in Ali's case).
 */
const shortCycles = (alarms: Alarm[], level: number, minS: number) => {
  const open: Record<string, number> = {};
  const bad: string[] = [];
  for (const a of alarms) {
    if (a.level !== level) continue;
    if (a.state === 'raised') open[a.id] = a.t;
    else if (a.state === 'cleared' && open[a.id] !== undefined) {
      if (a.t - (open[a.id] as number) < minS) bad.push(`${a.id}@${open[a.id]}+${(a.t - (open[a.id] as number)).toFixed(1)}`);
      delete open[a.id];
    }
  }
  return bad;
};
/** First row from which MAP stays < 30 for 20 s. */
const lowFlowOnset = (rows: MonRow[]) => rows.find((r, i) => rows.slice(i, i + 20).length === 20 && rows.slice(i, i + 20).every((x) => x.map < 30));

describe('FU-5 fidelity 1: SpO2, PI and pleth follow the perfusion', () => {
  it('MODELED 3 L bleed over 15 min: once MAP < 30 for 20 s the SpO2 is "?" or invalid, PI < 0.3, pleth ≤ 25 % of rest; never valid SpO2 with PR/PI invalid; no technical or red raise/clear cycle shorter than 5 s', async () => {
    const { rows, alarms } = await monitorRun({ mode: 'modeled', tEnd: 1100, steps: [...VENTED, [60, M.bleed(3000, 900)]] });
    const base = mean(rows.filter((r) => r.t >= 30 && r.t <= 60).map((r) => r.plethPtp));
    const on = lowFlowOnset(rows) as MonRow;
    expect(on).toBeDefined();
    const after = rows.filter((r) => r.t >= on.t + 20);
    for (const r of after) {
      expect(validShown(r.m.spo2)).toBe(false);
      if (r.m.pi?.value != null) expect(r.m.pi.value).toBeLessThan(0.3);
    }
    expect(mean(after.slice(0, 40).map((r) => r.plethPtp)) / base).toBeLessThanOrEqual(0.25);
    const contradictions = rows.filter((r) => r.t >= 10 && validShown(r.m.spo2) && (!validShown(r.m.pr) || !validShown(r.m.pi)));
    expect(contradictions.map((r) => r.t)).toEqual([]);
    expect(shortCycles(alarms, 3, 5)).toEqual([]); // no technical raise/clear cycle < 5 s (was LOW PERF ×7 at 1–2 s)
    expect(shortCycles(alarms, 1, 5)).toEqual([]); // no red one either
  }, 120_000);

  it("MODELED Ali's case (tamponade, propofol 2 + 1, PEEP 15, sevoflurane 2 %, bleed 2 L): at MAP < 30 the SpO2 is never shown valid; no technical or red raise/clear cycle shorter than 5 s", async () => {
    const { rows, alarms } = await monitorRun({ mode: 'modeled', tEnd: 2700, steps: [
      ...VENTED, [60, M.cond('tamponade', 1)], [660, M.drug('propofol', 2, 'mg/kg')], [900, M.drug('propofol', 1, 'mg/kg')],
      [1200, M.vent(15, 0.5)], [1500, M.vap('sevoflurane', 2)], [2100, M.bleed(2000, 300)],
    ] });
    const on = lowFlowOnset(rows);
    expect(on).toBeDefined();
    const after = rows.filter((r) => r.t >= (on as MonRow).t + 20);
    expect(after.filter((r) => validShown(r.m.spo2)).map((r) => r.t)).toEqual([]);
    expect(Math.max(...after.map((r) => r.m.pi?.value ?? 0))).toBeLessThan(0.3);
    expect(shortCycles(alarms, 3, 5)).toEqual([]);
    expect(shortCycles(alarms, 1, 5)).toEqual([]); // after FU-4's arrest this is the agonal EXTREME BRADY guard (Task 18)
  }, 120_000);
});

// FU-5 review, ruling 1 (Orchestrator ruling (FU-5 review), 2026-09-28): PI follows SV/SV₀ with a vasoconstriction-only
// factor (MODELED, ≤ 1; none in MANUAL). Guards: the normal patient's PI, the MANUAL ladder's direction, and the
// clinical rise after induction that waits for FU-4's cutaneous tone (R-FU5-9). Before FU-5 (origin/main, seed 7):
// rest PI 1.79 spontaneous / 1.80 ventilated MODELED / 1.70 MANUAL ventilated.
const piMean = (rows: MonRow[], a: number, b: number) => mean(rows.filter((r) => r.t >= a && r.t <= b && r.m.pi?.value != null).map((r) => r.m.pi?.value as number));
const bp = (t: number, s: number, d: number): Array<[number, Record<string, unknown>]> => [[t, M.target('sbp', s)], [t, M.target('dbp', d)]];

describe('FU-5 fidelity 1b: PI of the normal patient and its direction (review ruling 1)', () => {
  it('rest PI (30–58 s): MODELED spontaneous 1.82 and MANUAL ventilated 1.84, each ± 5 % (characterisation) and within ± 10 % of the L1 target 2', async () => {
    const spont = await monitorRun({ mode: 'modeled', tEnd: 60, steps: [] });
    const man = await monitorRun({ mode: 'manual', tEnd: 60, steps: [...VENTED] });
    for (const [rows, v] of [[spont.rows, 1.82], [man.rows, 1.84]] as const) {
      const pi = piMean(rows, 30, 58);
      expect(Math.abs(pi / v - 1)).toBeLessThanOrEqual(0.05);
      expect(Math.abs(pi / 2 - 1)).toBeLessThanOrEqual(0.1);
    }
  }, 120_000);

  it.fails('ventilated normal patient (MODELED, PPV from 1 s): rest PI within ± 5 % of origin/main 1.80 — measured 1.49 (−17 %): SV₀ is the spontaneous settle (80 mL) against 68 mL under PPV; PI follows SV only until FU-4 publishes a cutaneous tone (R-FU5-9)', async () => {
    const { rows } = await monitorRun({ mode: 'modeled', tEnd: 60, steps: [...VENTED] });
    expect(Math.abs(piMean(rows, 30, 58) / 1.8 - 1)).toBeLessThanOrEqual(0.05);
  }, 120_000);

  it('MANUAL MAP ladder 106 → 99 → 61 → 45 → 44 → 38 (A1): PI never rises as MAP falls (was 1.92 → 2.18 at MAP 62 with the uncapped tone); 1.84 → 1.53 → 1.18 → 0.03', async () => {
    const { rows } = await monitorRun({ mode: 'manual', tEnd: 660, steps: [...VENTED, ...bp(60, 135, 82), ...bp(180, 80, 50), ...bp(300, 55, 32), ...bp(420, 35, 20), ...bp(540, 18, 10)] });
    const steps = [[30, 58], [120, 175], [240, 295], [360, 415], [480, 535], [600, 655]] as const;
    const pi = steps.map(([a, b]) => piMean(rows, a, b));
    const map = steps.map(([a, b]) => mean(rows.filter((r) => r.t >= a && r.t <= b).map((r) => r.map)));
    for (let i = 1; i < pi.length; i++) if ((map[i] as number) < (map[i - 1] as number)) expect(pi[i] as number, `MAP ${map[i - 1]?.toFixed(0)} → ${map[i]?.toFixed(0)}`).toBeLessThanOrEqual((pi[i - 1] as number) * 1.02);
    expect(pi[2] as number).toBeLessThanOrEqual(0.9 * (pi[0] as number)); // MAP 61: clearly lower than at rest
  }, 120_000);

  it.fails('propofol 2 mg/kg in a ventilated patient: PI RISES after induction (the sympatholysis sign) — measured 1.49 → 1.17 (−21 %) at 180–240 s (MAP 96 → 86, SV 68 → 55): PI follows SV only; the vasodilated finger needs FU-4\'s cutaneous tone (R-FU5-9)', async () => {
    const { rows } = await monitorRun({ mode: 'modeled', tEnd: 300, steps: [...VENTED, [60, M.drug('propofol', 2, 'mg/kg')]] });
    expect(piMean(rows, 180, 240)).toBeGreaterThan(piMean(rows, 30, 58));
  }, 120_000);
});
```

**Create `packages/engine-core/test/l3/spo2/spo2-skin.test.ts`:**

```ts
// FU-5: the SpO2 averaging window and display update are the skin's (philips-like 10 s / 2 s: research/05 §6 [S1] p. 66,
// [S2] p. 301; saadat-like 8 s / 1 s: research/06 §4.1).
import { describe, expect, it } from 'vitest';
import { createSpo2, stepSpo2 } from '../../../src/l3/spo2/spo2.ts';

const ok = { probe: 'on' as const, pi: 2, cuffOnLimb: false, cpr: false };

describe('SpO2 per-skin averaging and update', () => {
  it('update every 2 s (philips-like) vs every 1 s (default): the shown value changes on that cadence', () => {
    for (const [updS, expected] of [[2, 2], [undefined, 1]] as const) {
      const st = createSpo2(0.97, 0);
      if (updS !== undefined) st.updS = updS;
      let changes = 0;
      let last = st.nextUpdate;
      const times: number[] = [];
      for (let k = 1; k <= 300; k++) {
        stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: k / 10 }, k / 10);
        if (st.nextUpdate !== last) { times.push(k / 10); last = st.nextUpdate; changes++; }
      }
      const gaps = times.slice(1).map((x, i) => x - (times[i] as number));
      expect(Math.min(...gaps)).toBeCloseTo(expected, 6);
      expect(changes).toBeGreaterThan(10);
    }
  });

  it('a 10 s average reaches 90 % of a 97 → 85 step later than the 8 s default, still inside the 20 s response (brief §6.1)', () => {
    const t90 = (avgS: number | undefined) => {
      const st = createSpo2(0.97, 0);
      if (avgS !== undefined) st.avgS = avgS;
      for (let k = 1; k <= 400; k++) {
        stepSpo2(st, { ...ok, siteSa: 0.85, lastFootT: k / 10 }, k / 10);
        if ((st.shown as number) <= 97 - 0.9 * 12) return k / 10;
      }
      return Infinity;
    };
    expect(t90(10)).toBeGreaterThan(t90(undefined));
    expect(t90(10)).toBeLessThanOrEqual(20);
  });
});
```


- [ ] **Step 4: The truth tree (E-FU5-7)**

**Modify `packages/engine-core/src/truth.ts`** — find (exactly once):

```ts
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref', 'endo.core.x', 'endo.core.profile', 'resp.temp.env']); // Stage 7e: its input copy, profile and heat calibration
```

replace with:

```ts
const SKIP_PATH = new Set(['dev.alarms.profile', 'hemo.circ.prof', 'hemo.circ.base', 'hemo.circ.ref', 'endo.core.x', 'endo.core.profile', 'resp.temp.env', 'hemo.num', 'resp.num', 'hemo.nibp']); // Stage 7e: its input copy, profile and heat calibration; FU-5: the monitor's numerics machinery and the cuff (device state; the console hides them as internal)
```


- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 typecheck
cd packages/engine-core
npx vitest run test/l3/spo2 test/engine/fidelity-lowflow.test.ts test/engine/truth-event.test.ts test/l2/pleth
npx vitest run test/engine/resp-oxygen.test.ts test/engine/hemo-engine.test.ts
```

Expected: all pass. fidelity-lowflow (≈ 17 s): the 3 L bleed reaches MAP < 30 for 20 s at 788 s; from +20 s the SpO2
is never valid ("99?" with PI 0.11, then invalid), the pleth is 8 % of its resting peak-to-peak (was 140 %), and no
row shows a valid SpO2 with PR or PI invalid (was 58 rows); Ali's case (MAP < 30 from 2 348 s) never shows a valid
SpO2 after +20 s, PI ≤ 0.14 (was 99 / PI 2.03); neither run has a technical or red raise/clear cycle shorter than 5 s
(the SpO2 INOP hysteresis is Task 10's, so run this file again after Task 10; before it the bleed showed LOW PERF ×7
in 1–2 s cycles). Suite 1b (review ruling 1): rest PI MODELED spontaneous 1.82, MANUAL ventilated 1.84 (± 5 % and
within 10 % of the L1 target 2); the `it.fails` rows fail as expected — ventilated MODELED rest PI 1.49 against
origin/main's 1.80, propofol 2 mg/kg PI 1.49 → 1.17 (the clinical rise needs FU-4's skin tone, R-FU5-9); the MANUAL
ladder PI 1.84 → 1.82 → 1.53 → 1.18 → 1.16 → 0.03 never rises as MAP falls (106 → 38). truth-event: "future tree (12 drugs): 2028 leaves". The engine
`resp-oxygen` rows (the displayed-SpO2 timing: `siteDelay` reads PI) and `l2/pleth` pass unchanged — measured on the
prototype; if one moves, re-measure it and write the new number into its title (R45), never widen it.

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core
git commit -m "FU-5 Task 3: the pleth and SpO2 follow the perfusion (resting-SV reference, completed pulses, per-skin averaging); fidelity rig and suite item 1

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 4: Arterial numerics that cannot lie — fresh beats, the non-pulsatile rule, a searching start; each pulse rate from its own source; the skin's IBP filter (L3 + E-FU5-3, E-FU5-4; PROTOTYPED)

Decisions D11 and D8 (PR attribution, audit M12). The PEA glitch (the 5 pre-arrest beats averaged with one ventilator
swing: valid 118/79 (93) for 6 s) is removed by averaging FRESH beats only; a line that fails the Philips rule (≥ 2
beats, ≥ 3 mmHg, ≥ 25/min) becomes a STATIC pressure, shown per skin (review ruling 3, D11): philips-like and the IEC
default keep S/D/M of the flat line and mark only the pulse (`prAbp`) "-?-" ([S2] p. 57); saadat-like hides S/D and
shows the mean (its "static pressure", research/06 §4.1); leaving static needs 3 s of beats ≥ 4 mmHg (amplitude and
time hysteresis). The technical alarm and the tile's presentation come in Tasks 10–11. `pr` is the oximeter's own rate; the arterial rate is
the new numeric `prAbp` (the SpO2 tile showed PR 74–77 from the ABP with the probe off). The display filter corner
is the skin's (`ibp.filterDefaultHz`: Philips 12 Hz, Saadat 16 Hz; research/05 §2.4, research/06 §4.1).

**Files:**
- Modify: `packages/engine-core/src/l3/pressure-numerics/numerics.ts`, `packages/engine-core/src/l3/pulse/detector.ts`
  (the unused `prSource` stub removed), `packages/engine-core/src/types.ts` (`NumericId` gains `prAbp`),
  `packages/engine-core/src/l2/hemo/pipeline.ts` (E-FU5-3: `emitSecond`'s `pr`/`prAbp` lines and the import),
  `packages/engine-core/src/l2/hemo/line.ts` (E-FU5-4), `packages/engine-core/src/l3/alarms/profile.ts`,
  `packages/engine-core/src/engine.ts`
- Modify (tests): `packages/engine-core/test/l3/pressure-numerics/numerics.test.ts` (R45 re-statement: the flat line
  is now "static: mean valid, S/D invalid" — was "questionable"), `packages/engine-core/test/l3/pulse/detector.test.ts`
  (the stub's assertions go with the stub), `packages/engine-core/test/engine/hemo-engine.test.ts` (R45 re-statement:
  with the probe off `pr` is invalid and `prAbp` valid — was "falls back to the arterial line")

- [ ] **Step 1: The numerics (fresh beats, pulsatile rule, search, re-pulse hysteresis)**

**Modify `packages/engine-core/src/l3/pressure-numerics/numerics.ts`** — find (exactly once):

```ts
// Device pressure numerics (brief §4.2 "Numerics (L3)", §6.1; research 03 §2.2): per-beat SBP/DBP = max/min of
// the DISPLAYED (transducer + 12 Hz filter) waveform between two detected feet; MAP = the INTEGRAL of the
// beat (never a formula); values averaged over the last 6 beats (4–8) and emitted at 1 Hz. Also the pleth
// PI (mean peak-to-trough of the last 6 pulses) and the pulse rate from the chosen source.
```

replace with:

```ts
// Device pressure numerics (brief §4.2 "Numerics (L3)", §6.1; research 03 §2.2): per-beat SBP/DBP = max/min of
// the DISPLAYED (transducer + 12 Hz filter) waveform between two detected feet; MAP = the INTEGRAL of the
// beat (never a formula); values averaged over the last 6 beats (4–8) and emitted at 1 Hz. Also the pleth
// PI (mean peak-to-trough of the last 6 pulses) and the pulse rate from the chosen source.
// FU-5 (audit M5): only FRESH beats (≤ 6 s old) are averaged — a PEA showed the 5 pre-arrest beats as a valid 118/79
// for 6 s once one ventilator swing was taken for a beat. A pressure is pulsatile with ≥ 2 fresh beats of amplitude
// ≥ 3 mmHg at ≥ 25/min (the Philips NON-PULSATILE rule, research/05 §6 [S2] p. 57); otherwise it is a STATIC pressure,
// shown per skin: S/D/M kept with the pulse "-?-" (Philips, [S2] p. 57) or the mean only with S/D invalid (Saadat,
// research/06 §4.1: "static pressure hides SYS/DIA and shows a larger mean").
```

**Modify `packages/engine-core/src/l3/pressure-numerics/numerics.ts`** — find (exactly once):

```ts
const STALE_S = 6; // no beat for 6 s → non-pulsatile [ENG]
```

replace with:

```ts
const STALE_S = 6; // no beat for 6 s → non-pulsatile [ENG]
/** FU-5: pulse rate < 25/min or amplitude < 3 mmHg is non-pulsatile (research/05 §6 [S2] p. 57). */
export const NONPULSATILE = { minRateBpm: 25, minAmpMmHg: 3 } as const;
/** FU-5: a line that started sampling searches this long before it calls itself static (Saadat "IBP1 SEARCH") [ENG]. */
export const SEARCH_S = 10;
/**
 * FU-5: a static line is pulsatile again only after this long of pulsatile beats — at MAP 13 / PP 3 one ventilator
 * swing taken for a beat flipped ABP NON-PULSATILE off for 1 s every 5 s [ENG].
 */
export const REPULSE_S = 3;
/**
 * FU-5: amplitude hysteresis on the 3 mmHg rule — a static line is pulsatile again only at this amplitude (Ali's case at
 * PP 3–4 mmHg flipped pulsatile ↔ static ≈ 10 times in 11 min on the single 3 mmHg threshold) [ENG].
 */
export const REPULSE_AMP_MMHG = 4;
```

**Modify `packages/engine-core/src/l3/pressure-numerics/numerics.ts`** — find (exactly once):

```ts
  feet: number[]; // foot times (s), last 10
}
```

replace with:

```ts
  feet: number[]; // foot times (s), last 10
  /** FU-5: absolute index of the first sample of this sampling run (absent in pre-FU-5 snapshots). */
  first?: number;
  /** FU-5: the line has shown a static pressure; since when its beats are pulsatile again (REPULSE_S). */
  wasStatic?: boolean;
  pulsSince?: number;
  /**
   * FU-5: how a static pressure is shown (skin `ibp.staticDisplay`, set by the engine): 'keep' = S/D/M stay, only the
   * pulse is "-?-" (Philips, research/05 §6 [S2] IFU p. 57); 'mean-only' = S/D invalid, the mean shown (Saadat,
   * research/06 §4.1). Absent = 'mean-only'.
   */
  staticDisplay?: 'keep' | 'mean-only';
}
```

**Modify `packages/engine-core/src/l3/pressure-numerics/numerics.ts`** — find (exactly once):

```ts
  if (wn.n !== m) {
    // a gap (sensor detached/re-attached): restart detection at m
    wn.det = createPulseDet(wn.det.floor, m);
    wn.prevFoot = -1;
  }
```

replace with:

```ts
  if (wn.n !== m) {
    // a gap (sensor detached/re-attached): restart detection at m
    wn.det = createPulseDet(wn.det.floor, m);
    wn.prevFoot = -1;
    wn.first = m;
  }
  wn.first ??= m;
```

**Modify `packages/engine-core/src/l3/pressure-numerics/numerics.ts`** — find (exactly once):

```ts
/** Sys/dia/mean at time t: beat averages, or the flat-line max/min/mean over 2 s when non-pulsatile. */
export function pressureNumerics(wn: WaveNumerics, t: number): { sys: Measured; dia: Measured; mean: Measured } {
  const last = wn.beats[wn.beats.length - 1];
  if (last && t - last.t <= STALE_S) {
    const avg = (k: 'sys' | 'dia' | 'mean') => wn.beats.reduce((a, b) => a + b[k], 0) / wn.beats.length;
    return {
      sys: { value: avg('sys'), flag: 'valid', at: t },
      dia: { value: avg('dia'), flag: 'valid', at: t },
      mean: { value: avg('mean'), flag: 'valid', at: t },
    };
  }
  let mx = -Infinity;
  let mn = Infinity;
  let sum = 0;
  const n = Math.min(250, wn.n);
  for (let k = wn.n - n; k < wn.n; k++) {
    const v = wn.ring[k % RING] as number;
    mx = Math.max(mx, v);
    mn = Math.min(mn, v);
    sum += v;
  }
  if (n === 0) return { sys: { value: null, flag: 'invalid', at: t }, dia: { value: null, flag: 'invalid', at: t }, mean: { value: null, flag: 'invalid', at: t } };
  return {
    sys: { value: mx, flag: 'questionable', at: t },
    dia: { value: mn, flag: 'questionable', at: t },
    mean: { value: sum / n, flag: 'questionable', at: t },
  };
}
```

replace with:

```ts
/** The beats that ended in the last STALE_S seconds (FU-5: pre-arrest beats are never re-averaged). */
function freshBeats(wn: WaveNumerics, t: number): BeatValues[] {
  return wn.beats.filter((b) => t - b.t <= STALE_S);
}

/** FU-5: pulsatile per the Philips rule (≥ 2 fresh beats, amplitude ≥ 3 mmHg — `minAmp`, rate ≥ 25/min). */
export function isPulsatile(beats: readonly BeatValues[], minAmp: number = NONPULSATILE.minAmpMmHg): boolean {
  if (beats.length < 2) return false;
  const amp = beats.reduce((a, b) => a + (b.sys - b.dia), 0) / beats.length;
  const dur = beats.reduce((a, b) => a + b.dur, 0) / beats.length;
  return amp >= minAmp && 60 / dur >= NONPULSATILE.minRateBpm;
}

const INVALID = (t: number): Measured => ({ value: null, flag: 'invalid', at: t });

/**
 * Sys/dia/mean at time t (call once per second) and whether the line is pulsatile: the average of the fresh beats when
 * pulsatile; otherwise a STATIC pressure over the last 2 s — per the skin, S/D/M of the waveform kept (`'keep'`,
 * Philips: a flat line reads "20/19 (20)", only the pulse is "-?-") or the mean only with S/D invalid (`'mean-only'`,
 * Saadat) (FU-5). Within SEARCH_S of the line starting to sample, a non-pulsatile line is still searching: all invalid
 * (FU-5, audit M14: no `ABPd 0<50` at power-on). A static line is pulsatile again after REPULSE_S of beats of at least
 * REPULSE_AMP_MMHG (amplitude and time hysteresis).
 */
export function pressureNumerics(wn: WaveNumerics, t: number): { sys: Measured; dia: Measured; mean: Measured; pulsatile: boolean } {
  const fresh = freshBeats(wn, t);
  const puls = isPulsatile(fresh, wn.wasStatic ? REPULSE_AMP_MMHG : NONPULSATILE.minAmpMmHg);
  wn.pulsSince = puls ? (wn.pulsSince ?? t) : undefined;
  if (puls && (!wn.wasStatic || t - (wn.pulsSince as number) >= REPULSE_S)) {
    wn.wasStatic = false;
    const avg = (k: 'sys' | 'dia' | 'mean') => fresh.reduce((a, b) => a + b[k], 0) / fresh.length;
    return {
      sys: { value: avg('sys'), flag: 'valid', at: t },
      dia: { value: avg('dia'), flag: 'valid', at: t },
      mean: { value: avg('mean'), flag: 'valid', at: t },
      pulsatile: true,
    };
  }
  const sampled = wn.n - (wn.first ?? 0);
  if (sampled < SEARCH_S * 125) return { sys: INVALID(t), dia: INVALID(t), mean: INVALID(t), pulsatile: false };
  wn.wasStatic = true;
  const n = 250; // the static pressure over the last 2 s
  let sum = 0;
  let mx = -Infinity;
  let mn = Infinity;
  for (let k = wn.n - n; k < wn.n; k++) {
    const v = wn.ring[k % RING] as number;
    sum += v;
    if (v > mx) mx = v;
    if (v < mn) mn = v;
  }
  const mean: Measured = { value: sum / n, flag: 'valid', at: t };
  if (wn.staticDisplay !== 'keep') return { sys: INVALID(t), dia: INVALID(t), mean, pulsatile: false };
  return { sys: { value: mx, flag: 'valid', at: t }, dia: { value: mn, flag: 'valid', at: t }, mean, pulsatile: false };
}
```

**Modify `packages/engine-core/src/l3/pressure-numerics/numerics.ts`** — find (exactly once):

```ts
export function piNumeric(wn: WaveNumerics, t: number): Measured {
  const last = wn.beats[wn.beats.length - 1];
  if (!last || t - last.t > STALE_S) return { value: null, flag: 'invalid', at: t };
  return { value: wn.beats.reduce((a, b) => a + (b.sys - b.dia), 0) / wn.beats.length, flag: 'valid', at: t };
}
```

replace with:

```ts
export function piNumeric(wn: WaveNumerics, t: number): Measured {
  const fresh = freshBeats(wn, t); // FU-5: fresh pulses only, as for pressures
  if (fresh.length === 0) return { value: null, flag: 'invalid', at: t };
  return { value: fresh.reduce((a, b) => a + (b.sys - b.dia), 0) / fresh.length, flag: 'valid', at: t };
}
```


- [ ] **Step 2: Each pulse rate from its own source (E-FU5-3)**

**Modify `packages/engine-core/src/l3/pulse/detector.ts`** — find (exactly once):

```ts

/** PR source rule stub (brief §6.1): pleth when the SpO2 probe is on, else the arterial line, else none. */
export function prSource(spo2: 'on' | 'off' | 'motion', abpActive: boolean): 'pleth' | 'abp' | null {
  if (spo2 === 'on') return 'pleth';
  return abpActive ? 'abp' : null;
}
```

replace with:

```ts

```

**Modify `packages/engine-core/src/types.ts`** — find (exactly once):

```ts
  | 'hr' | 'pr' | 'spo2' | 'pi' | 'abpSys'
```

replace with:

```ts
  | 'hr' | 'pr' | 'prAbp' | 'spo2' | 'pi' | 'abpSys'
```

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** — find (exactly once):

```ts
import { prSource } from '../../l3/pulse/detector.ts';
```

replace with nothing (delete these lines).

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** — find (exactly once):

```ts
  if (lineActive(hs.lines.abp)) {
    const p = pressureNumerics(hs.num.abp, t);
    v.abpSys = p.sys;
    v.abpDia = p.dia;
    v.abpMean = p.mean;
  }
```

replace with:

```ts
  if (lineActive(hs.lines.abp)) {
    const p = pressureNumerics(hs.num.abp, t);
    v.abpSys = p.sys;
    v.abpDia = p.dia;
    v.abpMean = p.mean;
    // FU-5 (E-FU5-3): the arterial line's own pulse rate ("Pulse (ABP)"), invalid while non-pulsatile ([S2] p. 57:
    // "Pulse numeric is displayed with -?-")
    v.prAbp = p.pulsatile ? prNumeric(hs.num.abp, t) : { value: null, flag: 'invalid', at: t };
  }
```

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** — find (exactly once):

```ts
  const src = prSource(hs.pleth.state, lineActive(hs.lines.abp));
  v.pr = src === 'pleth' ? prNumeric(hs.num.pleth, t) : src === 'abp' ? prNumeric(hs.num.abp, t) : { value: null, flag: 'invalid', at: t };
```

replace with:

```ts
  // FU-5 (E-FU5-3, audit M12): PR is the oximeter's pulse rate only — the SpO2 tile never shows an arterial-line rate
  v.pr = hs.pleth.state === 'on' ? prNumeric(hs.num.pleth, t) : { value: null, flag: 'invalid', at: t };
```


- [ ] **Step 3: The skin's IBP display filter (E-FU5-4)**

**Modify `packages/engine-core/src/l2/hemo/line.ts`** — find (exactly once):

```ts
export const DISPLAY_FILTER: readonly Biquad[] = [lowpass(DISPLAY_FILTER_HZ, HEMO_RATE)];
```

replace with:

```ts
export const DISPLAY_FILTER: readonly Biquad[] = [lowpass(DISPLAY_FILTER_HZ, HEMO_RATE)];
const FILTERS = new Map<number, readonly Biquad[]>([[DISPLAY_FILTER_HZ, DISPLAY_FILTER]]);
/** FU-5 (E-FU5-4): the display low-pass of a skin's IBP filter setting (skin `ibp.filterDefaultHz`: Philips 12, Saadat 16). */
export function displayFilter(hz: number = DISPLAY_FILTER_HZ): readonly Biquad[] {
  let f = FILTERS.get(hz);
  if (!f) {
    f = [lowpass(hz, HEMO_RATE)];
    FILTERS.set(hz, f);
  }
  return f;
}
```

**Modify `packages/engine-core/src/l2/hemo/line.ts`** — find (exactly once):

```ts
  f: number[]; // display filter state
}
```

replace with:

```ts
  f: number[]; // display filter state
  /** FU-5: the display filter corner (Hz) of the active skin; absent = DISPLAY_FILTER_HZ (12). */
  fHz?: number;
}
```

**Modify `packages/engine-core/src/l2/hemo/line.ts`** — find (exactly once):

```ts
  return filterSample(DISPLAY_FILTER, ls.f, ls.x);
```

replace with:

```ts
  return filterSample(displayFilter(ls.fHz), ls.f, ls.x);
```

**Modify `packages/engine-core/src/l2/hemo/line.ts`** — find (exactly once):

```ts
  ls.f = createFilterState(DISPLAY_FILTER);
  for (let i = 0; i < 64; i++) filterSample(DISPLAY_FILTER, ls.f, p);
```

replace with:

```ts
  const f = displayFilter(ls.fHz);
  ls.f = createFilterState(f);
  for (let i = 0; i < 64; i++) filterSample(f, ls.f, p);
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
  spo2: { averagingS: number; updateS: number };
}
```

replace with:

```ts
  spo2: { averagingS: number; updateS: number };
  /** FU-5: how a static pressure is shown (skin `ibp.staticDisplay`: philips-like/IEC 'keep', saadat-like 'mean-only'). */
  ibpStaticDisplay: 'keep' | 'mean-only';
  /** FU-5: the arterial-line disconnect alarm is on (skin `alarms.abpDisconnectDefault`; saadat-like off). */
  abpDisconnect: boolean;
  /** FU-5: the invasive-pressure display filter (skin `ibp.filterDefaultHz`), Hz. */
  ibpFilterHz: number;
}
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
    spo2: { averagingS: s.spo2.avgDefault, updateS: 1 / s.spo2.updateHz },
  };
```

replace with:

```ts
    spo2: { averagingS: s.spo2.avgDefault, updateS: 1 / s.spo2.updateHz },
    ibpStaticDisplay: s.ibp.staticDisplay,
    abpDisconnect: a.abpDisconnectDefault,
    ibpFilterHz: s.ibp.filterDefaultHz,
  };
```

**Modify `packages/engine-core/src/engine.ts`** — find (exactly once):

```ts
    this.st.resp.num.spo2.updS = p.spo2.updateS;
  }
```

replace with:

```ts
    this.st.resp.num.spo2.updS = p.spo2.updateS;
    for (const wn of [this.st.hemo.num.abp, this.st.hemo.num.pap]) wn.staticDisplay = p.ibpStaticDisplay;
    for (const ls of [this.st.hemo.lines.abp, this.st.hemo.lines.cvp, this.st.hemo.lines.pap]) ls.fHz = p.ibpFilterHz;
  }
```


- [ ] **Step 4: Tests**

**Modify `packages/engine-core/test/l3/pulse/detector.test.ts`** — find (exactly once):

```ts
  it('a flat line gives no pulses; PR source rule', () => {
    const st = createPulseDet(3);
    for (let n = 0; n < 1000; n++) expect(pulseStep(st, 12)).toBe(-1);
    expect(prSource('on', true)).toBe('pleth');
    expect(prSource('off', true)).toBe('abp');
    expect(prSource('motion', false)).toBeNull();
  });
```

replace with:

```ts
  it('a flat line gives no pulses', () => {
    const st = createPulseDet(3);
    for (let n = 0; n < 1000; n++) expect(pulseStep(st, 12)).toBe(-1);
  });
```

**Modify `packages/engine-core/test/l3/pulse/detector.test.ts`** — find (exactly once):

```ts
import { createPulseDet, prSource, pulseRate, pulseStep } from '../../../src/l3/pulse/detector.ts';
```

replace with:

```ts
import { createPulseDet, pulseRate, pulseStep } from '../../../src/l3/pulse/detector.ts';
```

**Modify `packages/engine-core/test/l3/pressure-numerics/numerics.test.ts`** — find (exactly once):

```ts
    for (let m = 125 * 20; m < 125 * 30; m++) numericsStep(wn, m, 12);
    const flat = pressureNumerics(wn, 30);
    expect(flat.mean.flag).toBe('questionable');
    expect(flat.mean.value).toBeCloseTo(12, 6);
    expect(prNumeric(wn, 30).flag).toBe('invalid');
  });
});
```

replace with:

```ts
    for (let m = 125 * 20; m < 125 * 30; m++) numericsStep(wn, m, 12);
    const flat = pressureNumerics(wn, 30);
    // FU-5: a static pressure shows its mean; S/D are not measurable (research/06 §4.1; audit M5)
    expect(flat.mean.flag).toBe('valid');
    expect(flat.mean.value).toBeCloseTo(12, 6);
    expect(flat.sys.flag).toBe('invalid');
    expect(flat.dia.flag).toBe('invalid');
    expect(prNumeric(wn, 30).flag).toBe('invalid');
  });
});

describe('FU-5: fresh beats, the non-pulsatile rule and the searching start (audit M5, M14)', () => {
  const beat = (t: number) => { const u = t % 1; return u < 0.1 ? 80 + 400 * u : 80 + 40 * Math.exp(-(u - 0.1) * 6); };
  it('one late small bump after a pulseless spell is not averaged with the pre-arrest beats (the PEA 118/79 glitch)', () => {
    const wn = createWaveNumerics(3);
    for (let m = 0; m < 125 * 20; m++) numericsStep(wn, m, beat(m / 125));
    for (let m = 125 * 20; m < 125 * 40; m++) numericsStep(wn, m, 20 + (m >= 125 * 36 && m < 125 * 37 ? 5 * Math.sin((Math.PI * (m - 125 * 36)) / 125) : 0));
    const p = pressureNumerics(wn, 40);
    expect(p.sys.flag).toBe('invalid');
    expect(p.mean.value).toBeGreaterThan(18);
    expect(p.mean.value).toBeLessThan(23);
  });
  it('amplitude < 3 mmHg is non-pulsatile; ≥ 3 mmHg at ≥ 25/min is pulsatile ([S2] p. 57)', () => {
    for (const [amp, want] of [[2, 'invalid'], [6, 'valid']] as const) {
      const wn = createWaveNumerics(1);
      for (let m = 0; m < 125 * 20; m++) numericsStep(wn, m, 30 + amp * Math.max(0, Math.sin((2 * Math.PI * m) / 125)) ** 3);
      expect(pressureNumerics(wn, 20).sys.flag).toBe(want);
    }
  });
  it('a line that has sampled less than 10 s without a beat is still searching: all invalid', () => {
    const wn = createWaveNumerics(3);
    for (let m = 0; m < 125 * 2; m++) numericsStep(wn, m, 0);
    expect(pressureNumerics(wn, 2).mean.flag).toBe('invalid');
    for (let m = 125 * 2; m < 125 * 11; m++) numericsStep(wn, m, 0);
    expect(pressureNumerics(wn, 11).mean).toMatchObject({ value: 0, flag: 'valid' });
  });
  it('a static line needs 3 s of pulsatile beats before S/D return (no NON-PULSATILE flicker)', () => {
    const wn = createWaveNumerics(1);
    for (let m = 0; m < 125 * 12; m++) numericsStep(wn, m, 20);
    expect(pressureNumerics(wn, 12).sys.flag).toBe('invalid'); // static
    let t = 12;
    const flags: string[] = [];
    for (let m = 125 * 12; m < 125 * 20; m++) {
      numericsStep(wn, m, 20 + 10 * Math.max(0, Math.sin((2 * Math.PI * m) / 100)) ** 3);
      if ((m + 1) % 125 === 0) flags.push(pressureNumerics(wn, (t += 1)).sys.flag);
    }
    const first = flags.indexOf('valid');
    expect(first).toBeGreaterThan(0);
    expect(flags.slice(first).every((f) => f === 'valid')).toBe(true);
  });
  it("'keep' (philips-like, [S2] p. 57; review ruling 3): a static line keeps S/D/M of the flat line and reports non-pulsatile; 'mean-only' (saadat-like) hides S/D", () => {
    for (const [disp, sd] of [['keep', 'valid'], ['mean-only', 'invalid']] as const) {
      const wn = createWaveNumerics(1);
      wn.staticDisplay = disp;
      for (let m = 0; m < 125 * 12; m++) numericsStep(wn, m, 20 + Math.sin((2 * Math.PI * m) / 625));
      const p = pressureNumerics(wn, 12);
      expect(p.pulsatile).toBe(false);
      expect(p.mean.flag).toBe('valid');
      expect(p.sys.flag).toBe(sd);
      expect(p.dia.flag).toBe(sd);
      if (disp === 'keep') {
        expect(p.sys.value as number).toBeGreaterThan(p.mean.value as number);
        expect(p.dia.value as number).toBeLessThan(p.mean.value as number);
        expect((p.sys.value as number) - (p.dia.value as number)).toBeLessThan(3);
      }
    }
  });
  it('amplitude hysteresis (review ruling 3): a static line stays static on 3.5 mmHg beats (≥ 3 but < REPULSE_AMP_MMHG 4), and a pulsatile line stays pulsatile on them', () => {
    const run = (startAmp: number) => {
      const wn = createWaveNumerics(1);
      let p = false;
      for (let m = 0; m < 125 * 20; m++) {
        numericsStep(wn, m, 30 + (m < 125 * 12 ? startAmp : 3.5) * Math.max(0, Math.sin((2 * Math.PI * m) / 125)) ** 3);
        if ((m + 1) % 125 === 0) p = pressureNumerics(wn, (m + 1) / 125).pulsatile; // once per second, as emitSecond
      }
      return p;
    };
    expect(run(0)).toBe(false); // was static: needs ≥ 4 mmHg to leave
    expect(run(8)).toBe(true); // was pulsatile: ≥ 3 mmHg keeps it
  });
});
```

**Modify `packages/engine-core/test/engine/hemo-engine.test.ts`** — find (exactly once):

```ts
    expect(m.values.pr?.flag).toBe('valid'); // falls back to the arterial line
```

replace with:

```ts
    expect(m.values.pr?.flag).toBe('invalid'); // FU-5 (audit M12): PR is the oximeter's own rate — no arterial fallback in the SpO2 tile
    expect(m.values.prAbp?.flag).toBe('valid'); // the arterial line's rate is its own numeric
```


- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 typecheck
cd packages/engine-core
npx vitest run test/l3/pressure-numerics test/l3/pulse test/engine/hemo-engine.test.ts test/engine/hemo-acceptance.test.ts test/l2/hemo
```

Expected: all pass. The new numerics cases: one late small bump after a 20 s pulseless spell is not averaged with the
pre-arrest beats (S/D invalid, mean 18–23); 2 mmHg is non-pulsatile, 6 mmHg pulsatile; a line sampling < 10 s without
a beat is all invalid, a static 0 after it is `{ value: 0, flag: 'valid' }`; a static line needs 3 s of pulsatile beats
before S/D return; `'keep'` keeps S/D/M of a flat line (span < 3 mmHg, `pulsatile: false`), `'mean-only'` hides
S/D; 3.5 mmHg beats keep a static line static and a pulsatile line pulsatile (REPULSE_AMP_MMHG 4). `hemo-acceptance` (Stage 2's ART bands) is unchanged — the fresh-beat average equals the old one
while beats come every < 6 s.

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core
git commit -m "FU-5 Task 4: arterial numerics — fresh beats, the Philips non-pulsatile rule, static pressure; PR per source; skin IBP filter

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 5: NIBP measures a narrow pulse pressure and fails honestly in shock; the skin's cuff rules (L3; PROTOTYPED)

Decision D12 (audit M4, Q5). `Amax = 0.05·PP` against a fixed 1.0 mmHg envelope floor failed EVERY pulse pressure
≤ 20 mmHg at any MAP (103/83, 81/63, 59/39; 18 consecutive auto failures in the bleed). The oscillation peak becomes
`4·tanh(PP/50)` (1.5 / 2.7 / 3.7 mmHg at PP 20 / 40 / 80: the brief's 1–4 mmHg), the detection and envelope floors fall
to 0.1 / 0.3 mmHg, and `MIN_SBP` 50 stays — so the failures come from the brief's rule (SBP < 50–60, no pulses, CPR),
not from a narrow PP. The skin's initial inflation (per age band), next-inflation rule and STAT spacing are wired
through `NibpState.cfg` (absent = the old constants, so snapshots and unit rigs are unchanged).

**Files:**
- Modify: `packages/engine-core/src/l3/nibp/nibp.ts`, `packages/engine-core/src/l3/alarms/profile.ts`,
  `packages/engine-core/src/engine.ts` (`syncCo2Sampler`: the cuff settings)
- Modify (tests): `packages/engine-core/test/l3/nibp/nibp.test.ts` (three new cases)

- [ ] **Step 1: The envelope and the skin's cuff rules**

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
//   from the ACTUAL site beats:  A(Pc) = Amax·exp(−((Pc − MAP)/w)²), Amax = 0.05·PP (1–4 mmHg),
```

replace with:

```ts
//   from the ACTUAL site beats:  A(Pc) = Amax·exp(−((Pc − MAP)/w)²), Amax = 4·tanh(PP/50) mmHg (FU-5),
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
// Failures: Amax < 1 mmHg or SBP < 50 (no reliable envelope, e.g. SBP 45 / no pulse) fail the attempt; the
// second failed attempt raises the "NBP measurement failed" INOP. CPR corrupts every pulse → the cycle runs to
// the 170 s safety deflation and fails. Envelope not bracketed above SBP → one re-pump to +40 mmHg.
```

replace with:

```ts
// Failures: an envelope peak < 0.3 mmHg or SBP < 50 (no reliable envelope, e.g. SBP 45 / no pulse) fail the attempt;
// the second failed attempt raises the "NBP measurement failed" INOP. CPR corrupts every pulse → the cycle runs to
// the 170 s safety deflation and fails. Envelope not bracketed above SBP → one re-pump to +40 mmHg.
// FU-5 (audit M4): the old Amax = 0.05·PP against a 1.0 mmHg floor failed EVERY pulse pressure ≤ 20 at any MAP
// (103/83, 81/63, 59/39 all failed); a narrow pulse pressure with an adequate MAP now measures. The skin sets the
// initial inflation, the next-inflation rule and the STAT spacing (skin `nibp.*`, NibpState.cfg).
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
  OSC_PER_PP: 0.05, // Amax = 0.05·PP (1–4 mmHg at PP 20–80) [ENG]
```

replace with:

```ts
  // FU-5 (M4): the cuff oscillation is the arterial volume pulse under the cuff. With a sigmoid arterial P–V curve the
  // peak oscillation (cuff ≈ MAP, transmural pressure swinging ±PP/2 around 0) is A_SAT·tanh(PP / PP_KNEE): linear in
  // PP where the wall is most compliant, saturating at a wide PP (Drzewiecki 1994 Ann Biomed Eng 22:88; Babbs 2012
  // BioMed Eng OnLine 11:56). 1.5 / 2.7 / 3.7 mmHg at PP 20 / 40 / 80 keeps the brief's 1–4 mmHg; PP 10 gives 0.8.
  A_SAT: 4, // mmHg [ENG, fitted to the brief's 1–4 mmHg band]
  PP_KNEE: 50, // mmHg [ENG]
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
  A_DETECT: 0.2, // pulses smaller than this are not seen, mmHg [ENG]
  A_MIN_ENVELOPE: 1.0, // a smaller envelope peak is not a measurement [ENG]
```

replace with:

```ts
  A_DETECT: 0.1, // pulses smaller than this are not seen, mmHg [ENG] (FU-5: 0.2 → 0.1)
  A_MIN_ENVELOPE: 0.3, // a smaller envelope peak is not a measurement [ENG] (FU-5: 1.0 → 0.3; MAP 13 / PP 3 fails)
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
  lastEmitT: number;
}
```

replace with:

```ts
  lastEmitT: number;
  /**
   * FU-5: the active skin's cuff settings (skin `nibp.initialInflation` for the age band, `nextInflation`, `stat`);
   * absent = the NIBP constants (165 mmHg, previous SBP + 10, STAT back-to-back for 300 s).
   */
  cfg?: { initial: number; nextAbove: number; statSpacingS: number; statCount: number; statWindowS: number };
  /** FU-5: measurements started in the current STAT series. */
  statN?: number;
}
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
  nb.target = nb.lastSbp === null ? NIBP.INITIAL_TARGET : Math.max(100, nb.lastSbp + NIBP.NEXT_TARGET_ABOVE_SBP);
```

replace with:

```ts
  const initial = nb.cfg?.initial ?? NIBP.INITIAL_TARGET;
  nb.target = nb.lastSbp === null ? initial : Math.max(100, nb.lastSbp + (nb.cfg?.nextAbove ?? NIBP.NEXT_TARGET_ABOVE_SBP));
  if (nb.mode === 'stat') nb.statN = (nb.statN ?? 0) + 1;
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
    case 'stat':
      nb.prevMode = nb.mode === 'stat' ? nb.prevMode : nb.mode;
      nb.mode = 'stat';
      nb.statUntil = t + NIBP.STAT_S;
```

replace with:

```ts
    case 'stat':
      nb.prevMode = nb.mode === 'stat' ? nb.prevMode : nb.mode;
      nb.mode = 'stat';
      nb.statUntil = t + (nb.cfg?.statWindowS ?? NIBP.STAT_S);
      nb.statN = 0;
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
  const amax = NIBP.OSC_PER_PP * pp;
```

replace with:

```ts
  const amax = NIBP.A_SAT * Math.tanh(pp / NIBP.PP_KNEE);
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
      nb.steps = [];
      nb.target = NIBP.INITIAL_TARGET;
      nb.phase = 'inflating';
```

replace with:

```ts
      nb.steps = [];
      nb.target = nb.cfg?.initial ?? NIBP.INITIAL_TARGET;
      nb.phase = 'inflating';
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
function fail(nb: NibpState, _t: number, out: NibpOut[]): void {
  nb.phase = 'failed';
```

replace with:

```ts
function fail(nb: NibpState, _t: number, out: NibpOut[]): void {
  nb.phase = 'failed';
  if (nb.mode === 'stat') nb.statUntil = -1; // FU-5: a failure ends a STAT series (research/06 §4.1 "stopping on error")
```

**Modify `packages/engine-core/src/l3/nibp/nibp.ts`** — find (exactly once):

```ts
  if (nb.mode === 'stat') {
    if (t < nb.statUntil) {
      nb.nextStartT = t;
      return;
    }
    nb.mode = nb.prevMode;
  }
```

replace with:

```ts
  if (nb.mode === 'stat') {
    if (t < nb.statUntil && (nb.statN ?? 0) < (nb.cfg?.statCount ?? Infinity)) {
      nb.nextStartT = Math.max(t, nb.startT + (nb.cfg?.statSpacingS ?? 0)); // FU-5: Saadat 30 s start to start
      return;
    }
    nb.mode = nb.prevMode;
  }
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
  /** FU-5: the invasive-pressure display filter (skin `ibp.filterDefaultHz`), Hz. */
  ibpFilterHz: number;
}
```

replace with:

```ts
  /** FU-5: the invasive-pressure display filter (skin `ibp.filterDefaultHz`), Hz. */
  ibpFilterHz: number;
  /** FU-5: the cuff settings of the skin (and age band): NibpState.cfg. */
  nibp: { initial: number; nextAbove: number; statSpacingS: number; statCount: number; statWindowS: number };
}
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
    ibpFilterHz: s.ibp.filterDefaultHz,
  };
```

replace with:

```ts
    ibpFilterHz: s.ibp.filterDefaultHz,
    nibp: {
      initial: s.nibp.initialInflation[band],
      nextAbove: s.nibp.nextInflation === 'prevSys+30' ? 30 : 10,
      statSpacingS: s.nibp.stat.spacingS,
      statCount: s.nibp.stat.count,
      statWindowS: s.nibp.stat.windowS,
    },
  };
```

**Modify `packages/engine-core/src/engine.ts`** — find (exactly once):

```ts
    for (const ls of [this.st.hemo.lines.abp, this.st.hemo.lines.cvp, this.st.hemo.lines.pap]) ls.fHz = p.ibpFilterHz;
  }
```

replace with:

```ts
    for (const ls of [this.st.hemo.lines.abp, this.st.hemo.lines.cvp, this.st.hemo.lines.pap]) ls.fHz = p.ibpFilterHz;
    this.st.hemo.nibp.cfg = { ...p.nibp };
  }
```


- [ ] **Step 2: Tests**

**Modify `packages/engine-core/test/l3/nibp/nibp.test.ts`** — find (exactly once):

```ts
  it('manual start cancels auto; stat repeats; cuff off rejects start', () => {
```

replace with:

```ts
  it('FU-5 (audit M4): a narrow pulse pressure with an adequate MAP measures — 77/67 (PP 10), 81/63, 104/83', () => {
    for (const b of [{ sbp: 77, dbp: 67, map: 70 }, { sbp: 81, dbp: 63, map: 69 }, { sbp: 104, dbp: 83, map: 90 }]) {
      const { out } = run(b);
      const done = out.find((o) => o.kind === 'phase' && o.phase === 'done') as Extract<NibpOut, { kind: 'phase' }> | undefined;
      expect(done?.result).toBeDefined();
      expect(Math.abs(done!.result!.map - b.map)).toBeLessThanOrEqual(8);
    }
  });

  it('FU-5: true shock still fails — MAP 13 / PP 3 (envelope peak < 0.3 mmHg) fails after 2 attempts', () => {
    const { out } = run({ sbp: 15, dbp: 12, map: 13 });
    expect(out.filter((o) => o.kind === 'phase' && o.phase === 'inflating')).toHaveLength(2);
    expect(out.some((o) => o.kind === 'failed')).toBe(true);
  });

  it('FU-5: the skin cuff settings — initial inflation and a STAT series 30 s start to start (saadat-like)', () => {
    const nb = createNibpState();
    nb.cfg = { initial: 150, nextAbove: 30, statSpacingS: 30, statCount: 10, statWindowS: 300 };
    const out: NibpOut[] = [];
    nibpCommand(nb, 'stat', 0, undefined, out);
    expect(nb.target).toBe(150);
    const rng = seedStream(1, 'measurement');
    const starts: number[] = [0];
    let next = 0.3;
    for (let t = 0; t < 120; t += 0.008) {
      if (t >= next) { nibpOnPulse(nb, t, { sbp: 120, dbp: 80, map: 95 }, false, rng); next += 0.8; }
      const before = nb.phase;
      nibpStep(nb, t, 0.008, rng, out);
      if (before !== 'inflating' && nb.phase === 'inflating') starts.push(t);
    }
    expect(starts.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < starts.length; i++) expect((starts[i] as number) - (starts[i - 1] as number)).toBeCloseTo(30, 1);
    expect(nb.target).toBeGreaterThanOrEqual(140); // previous SYS + 30
  });

  it('manual start cancels auto; stat repeats; cuff off rejects start', () => {
```


- [ ] **Step 3: Run**

```bash
npx -y pnpm@9.15.9 typecheck
cd packages/engine-core
npx vitest run test/l3/nibp
npx vitest run test/engine/hemo-nibp.test.ts        # SLOW set, ≈ 25 s locally
```

Expected: `l3/nibp` all pass (77/67, 81/63, 104/83 measure with MAP within ± 8; MAP 13 / PP 3 inflates twice and
fails; saadat-like cfg: target 150, STAT starts 30 s apart, next target ≥ previous SYS + 30). `hemo-nibp` (Stage 2
acceptance 9) passes UNCHANGED: cycle 25–40 s; 100 sinus measurements bias ≤ 5 / SD ≤ 8; AF 75 |bias| ≤ 6 / SD ≤ 10;
SBP 45 fails after 2 attempts. Measured alongside (not a test): AF 150 over 10 cuff readings bias SBP −1.5 / DBP −0.7
mmHg (`origin/main` +1.7 / +3.6 over 9).

- [ ] **Step 4: Commit**

```bash
git add packages/engine-core
git commit -m "FU-5 Task 5: NIBP oscillation 4·tanh(PP/50) with lower floors — narrow PP measures, true shock fails; skin cuff rules

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 6: Capnograph and impedance — the skin's apnoea times, no EtCO2 before two breaths, the cardiac overlay rejected, a CO2 line fault (L3 + E-FU5-5; PROTOTYPED)

Decisions D5 (apnoea times), D13, D17 (audit M10, M11, M14). The detectors ran at a fixed 20 s whatever the skin
(saadat-like's RESP apnoea is 10 s); the capnograph published a VALID EtCO2 of 0 before the first breath (`**etCO2 0<30`
on every run at 1 s) and the partly sampled first breath (`**etCO2 13<30` in the spontaneous start); the impedance
counted the heart as breathing in a paralysed apnoea (RR 41–53 = HR, `**RR 44>30`). The resp pipeline passes the
beat times to the impedance detector and gains the capnograph state `'occluded'` (a blocked sampling line: numerics
invalid; its INOP comes in Task 10).

**Files:**
- Modify: `packages/engine-core/src/l3/co2-numerics/co2-numerics.ts`, `packages/engine-core/src/l3/resp/impedance.ts`,
  `packages/engine-core/src/l2/resp/pipeline.ts` (E-FU5-5: the `co2Sensor` type, the invalid numerics while occluded,
  the `impStep` call, the command's validation and state), `packages/engine-core/src/l3/alarms/profile.ts`
  (`gasApneaS`), `packages/engine-core/src/engine.ts` (`syncCo2Sampler`: the apnoea times)
- Modify (tests): `packages/engine-core/test/l3/resp/impedance.test.ts`, `packages/engine-core/test/l3/co2-numerics/co2-numerics.test.ts`

- [ ] **Step 1: The detectors**

**Modify `packages/engine-core/src/l3/co2-numerics/co2-numerics.ts`** — find (exactly once):

```ts
  breaths: Array<{ t: number; et: number; fi: number }>;
  apnoea: boolean;
}
```

replace with:

```ts
  breaths: Array<{ t: number; et: number; fi: number }>;
  apnoea: boolean;
  /** FU-5: the skin's gas-apnoea time (skin `limits.*.gasApneaS`, else `apneaS`), s; absent = GAS_APNOEA_S. */
  apneaS?: number;
}
```

**Modify `packages/engine-core/src/l3/co2-numerics/co2-numerics.ts`** — find (exactly once):

```ts
  if (!st.apnoea && t - last > GAS_APNOEA_S && !st.high) {
```

replace with:

```ts
  if (!st.apnoea && t - last > (st.apneaS ?? GAS_APNOEA_S) && !st.high) {
```

**Modify `packages/engine-core/src/l3/co2-numerics/co2-numerics.ts`** — find (exactly once):

```ts
export function co2Numerics(st: Co2Num, t: number, shownNow: number): { etco2: Measured; imco2: Measured; awrr: Measured } {
  const recent = st.breaths.filter((b) => b.t >= t - ETCO2_WINDOW_S);
```

replace with:

```ts
export function co2Numerics(st: Co2Num, t: number, shownNow: number): { etco2: Measured; imco2: Measured; awrr: Measured } {
  // FU-5 (audit M14): until two breaths are detected the capnograph has measured nothing whole — not a valid EtCO2 of 0
  // (which raised `**etCO2 0<30` at power-on on every run), nor the partly sampled first breath (`**etCO2 13<30`) [ENG]
  if (st.edges.length < 2 && !st.apnoea) return { etco2: { value: null, flag: 'invalid', at: t }, imco2: { value: null, flag: 'invalid', at: t }, awrr: { value: null, flag: 'invalid', at: t } };
  const recent = st.breaths.filter((b) => b.t >= t - ETCO2_WINDOW_S);
```

**Modify `packages/engine-core/src/l3/resp/impedance.ts`** — find (exactly once):

```ts
export const IMP_INTERVALS = 6;
```

replace with:

```ts
export const IMP_INTERVALS = 6;
/**
 * FU-5 (audit M10): an impedance cycle whose period is within this fraction of the heart's RR is CARDIAC OVERLAY and is
 * neither counted nor allowed to reset the apnoea timer — the Philips Auto detection mode "adjusts the detection level …
 * depending on the presence of cardiac artifact" (research/05 §6 [S2] p. 111–113) [ENG fraction].
 */
export const CARDIAC_MATCH = 0.1;
/** FU-5: a candidate cycle is counted as a breath when no cycle followed it within this many heart periods [ENG]. */
export const CONFIRM_RR = 1.5;
```

**Modify `packages/engine-core/src/l3/resp/impedance.ts`** — find (exactly once):

```ts
  edges: number[];
  apnoea: boolean;
}
```

replace with:

```ts
  edges: number[];
  apnoea: boolean;
  /** FU-5: the skin's impedance apnoea time (skin `limits.*.apneaS`), s; absent = IMP_APNOEA_S. */
  apneaS?: number;
  /** FU-5: time of the last detected cycle of any kind (breath or cardiac overlay). */
  lastAny?: number;
  /** FU-5: a cycle that is a breath unless the next one follows it at the heart's period (cardiac overlay). */
  cand?: number;
}
```

**Modify `packages/engine-core/src/l3/resp/impedance.ts`** — find (exactly once):

```ts
export function impStep(st: ImpNum, t: number, x: number, dt: number): 'apnoea' | 'resumed' | null {
```

replace with:

```ts
/** FU-5: a confirmed breath at time tb (the detector's edge list, the end of an apnoea). */
function countBreath(st: ImpNum, tb: number): 'resumed' | null {
  st.edges.push(tb);
  if (st.edges.length > IMP_INTERVALS + 1) st.edges.shift();
  if (!st.apnoea) return null;
  st.apnoea = false;
  return 'resumed';
}

/** `beats` (FU-5): mechanical beat times, newest last — when given, cycles at the heart's period are cardiac overlay. */
export function impStep(st: ImpNum, t: number, x: number, dt: number, beats?: readonly number[]): 'apnoea' | 'resumed' | null {
```

**Modify `packages/engine-core/src/l3/resp/impedance.ts`** — find (exactly once):

```ts
  if (!st.high && y > thr) {
    st.high = true;
    st.edges.push(t);
    if (st.edges.length > IMP_INTERVALS + 1) st.edges.shift();
    if (st.apnoea) {
      st.apnoea = false;
      ev = 'resumed';
    }
  } else if (st.high && y < 0) st.high = false;
  const last = st.edges[st.edges.length - 1] ?? 0; // the timer starts at power-on
  if (!st.apnoea && t - last > IMP_APNOEA_S) {
```

replace with:

```ts
  const n = beats?.length ?? 0;
  const rrHeart = n >= 2 ? (beats?.[n - 1] as number) - (beats?.[n - 2] as number) : 0;
  if (!st.high && y > thr) {
    st.high = true;
    // FU-5 (M10): a cycle one heart period after the previous one is cardiac overlay, and so was that previous one;
    // any other cycle is a breath CANDIDATE, counted once the next cycle does not follow it at the heart's period
    if (st.lastAny !== undefined && rrHeart > 0 && Math.abs(t - st.lastAny - rrHeart) <= CARDIAC_MATCH * rrHeart) st.cand = undefined;
    else {
      if (st.cand !== undefined) ev = countBreath(st, st.cand) ?? ev;
      st.cand = t;
    }
    st.lastAny = t;
  } else if (st.high && y < 0) st.high = false;
  if (st.cand !== undefined && (rrHeart <= 0 || t - st.cand > CONFIRM_RR * rrHeart)) {
    ev = countBreath(st, st.cand) ?? ev; // no heart rate (beats not given): counted at once, as before FU-5
    st.cand = undefined;
  }
  const last = st.edges[st.edges.length - 1] ?? 0; // the timer starts at power-on
  if (!st.apnoea && st.cand === undefined && t - last > (st.apneaS ?? IMP_APNOEA_S)) {
```


- [ ] **Step 2: The resp pipeline (E-FU5-5), the profile and the engine**

**Modify `packages/engine-core/src/l2/resp/pipeline.ts`** — find (exactly once):

```ts
  co2Sensor: 'off' | 'warmup' | 'on';
```

replace with:

```ts
  co2Sensor: 'off' | 'warmup' | 'on' | 'occluded'; // FU-5: 'occluded' = the sampling line is blocked (CO2 OCCLUSION INOP)
```

**Modify `packages/engine-core/src/l2/resp/pipeline.ts`** — find (exactly once):

```ts
  else if (rs.co2Sensor === 'warmup') for (const k of ['etco2', 'imco2', 'awrr'] as const) v[k] = { value: null, flag: 'invalid', at: t };
```

replace with:

```ts
  else if (rs.co2Sensor === 'warmup' || rs.co2Sensor === 'occluded') for (const k of ['etco2', 'imco2', 'awrr'] as const) v[k] = { value: null, flag: 'invalid', at: t };
```

**Modify `packages/engine-core/src/l2/resp/pipeline.ts`** — find (exactly once):

```ts
    const ie = impStep(rs.num.imp, t, imp, DT);
```

replace with:

```ts
    const ie = impStep(rs.num.imp, t, imp, DT, rs.beats); // FU-5 (E-FU5-5): cardiac-overlay rejection
```

**Modify `packages/engine-core/src/l2/resp/pipeline.ts`** — find (exactly once):

```ts
      if (!['off', 'warmup', 'on'].includes(cmd.state)) return 'co2 state must be off, warmup or on';
```

replace with:

```ts
      if (!['off', 'warmup', 'on', 'occluded'].includes(cmd.state)) return 'co2 state must be off, warmup, on or occluded';
```

**Modify `packages/engine-core/src/l2/resp/pipeline.ts`** — find (exactly once):

```ts
      rs.co2Sensor = cmd.state === 'warmup' ? 'warmup' : cmd.state === 'on' ? 'on' : 'off';
```

replace with:

```ts
      rs.co2Sensor = cmd.state === 'warmup' ? 'warmup' : cmd.state === 'on' ? 'on' : cmd.state === 'occluded' ? 'occluded' : 'off';
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
  /** Skin apnoea time (`apneaS`, brief §6.4 / §6.4.1; Stage 3 detectors run at a fixed 20 s, request R-4b-9); null = APNEA LIMIT OFF (preset). */
  apneaS: number | null;
```

replace with:

```ts
  /** Skin apnoea time (`apneaS`, brief §6.4 / §6.4.1); FU-5: the impedance detector runs at it; null = APNEA LIMIT OFF (preset). */
  apneaS: number | null;
  /** FU-5: the capnograph's apnoea time (skin `gasApneaS`, else `apneaS`; saadat-like 20 s vs RESP 10 s); null = OFF. */
  gasApneaS: number | null;
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
    apneaS: apneaLimit === 'OFF' ? null : typeof apneaLimit === 'number' ? apneaLimit : typeof apnea === 'number' ? apnea : APNEA_DEFAULT_S,
```

replace with:

```ts
    apneaS: apneaLimit === 'OFF' ? null : typeof apneaLimit === 'number' ? apneaLimit : typeof apnea === 'number' ? apnea : APNEA_DEFAULT_S,
    gasApneaS: apneaLimit === 'OFF' ? null : typeof gasApnea === 'number' ? gasApnea : typeof apneaLimit === 'number' ? apneaLimit : typeof apnea === 'number' ? apnea : APNEA_DEFAULT_S,
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
  const apnea = r.limits[band]?.apneaS;
```

replace with:

```ts
  const apnea = r.limits[band]?.apneaS;
  const gasApnea = r.limits[band]?.gasApneaS;
```

**Modify `packages/engine-core/src/engine.ts`** — find (exactly once):

```ts
    this.st.hemo.nibp.cfg = { ...p.nibp };
  }
```

replace with:

```ts
    this.st.hemo.nibp.cfg = { ...p.nibp };
    if (p.apneaS !== null) this.st.resp.num.imp.apneaS = p.apneaS; // null (APNEA LIMIT OFF): the detector keeps its time, the alarm is off
    if (p.gasApneaS !== null) this.st.resp.num.co2.apneaS = p.gasApneaS;
  }
```


- [ ] **Step 3: Tests**

**Modify `packages/engine-core/test/l3/resp/impedance.test.ts`** — find (exactly once):

```ts
  it('pleth-derived RR from the pulse-amplitude modulation', () => {
```

replace with:

```ts
  it('FU-5 (M10): with the beat times given, a 20 % ripple at the heart period is cardiac overlay — the apnoea is raised 20 s after the last breath and RR reads 0', () => {
    const st = createImpNum();
    const beats: number[] = [];
    let apnoea = -1;
    for (let m = 0; m < 62.5 * 90; m++) {
      const t = m / 62.5;
      if (beats.length === 0 || t - beats[beats.length - 1]! >= 0.75) beats.push(t);
      const vol = t < 30 ? 250 * (1 - Math.cos((2 * Math.PI * t) / 4)) : 0;
      if (impStep(st, t, impedanceSample(vol, t, beats.slice(-3), 0.2), 1 / 62.5, beats) === 'apnoea') apnoea = t;
    }
    expect(apnoea).toBeGreaterThan(45);
    expect(apnoea).toBeLessThan(53);
    expect(impRr(st, 90).value).toBe(0);
  });
  it('FU-5 (M11): the skin apnoea time — saadat-like RESP APNEA at 10 s', () => {
    const st = createImpNum();
    st.apneaS = 10;
    let apnoea = -1;
    for (let m = 0; m < 62.5 * 60; m++) {
      const t = m / 62.5;
      const vol = t < 30 ? 250 * (1 - Math.cos((2 * Math.PI * t) / 4)) : 0;
      if (impStep(st, t, impedanceSample(vol, t, []), 1 / 62.5) === 'apnoea') apnoea = t;
    }
    expect(apnoea).toBeGreaterThan(38);
    expect(apnoea).toBeLessThan(42);
  });
  it('pleth-derived RR from the pulse-amplitude modulation', () => {
```

**Modify `packages/engine-core/test/l3/co2-numerics/co2-numerics.test.ts`** — find (exactly once):

```ts
    expect(co2Numerics(st, 80, 2).awrr.value).toBe(0);
  });
```

replace with:

```ts
    expect(co2Numerics(st, 80, 2).awrr.value).toBe(0);
  });

  it('FU-5 (M14): until two breaths are detected EtCO2 is invalid — not a valid 0, nor the partly sampled first breath', () => {
    const st = createCo2Num();
    for (let m = 0; m < 62.5 * 3; m++) co2NumStep(st, m / 62.5, 0, 1 / 62.5);
    expect(co2Numerics(st, 3, 0).etco2).toMatchObject({ value: null, flag: 'invalid' });
  });
```


- [ ] **Step 4: Run**

```bash
npx -y pnpm@9.15.9 typecheck
cd packages/engine-core
npx vitest run test/l3/resp test/l3/co2-numerics test/l3/alarms/stage3-hooks.test.ts test/engine/stage3-alarms-engine.test.ts test/engine/resp-airway.test.ts
npx vitest run test/engine/resp-coupling.test.ts       # SLOW set
```

Expected: all pass. impedance: with the beat times given, a 20 % ripple at the heart period after the last breath at
≈ 29 s raises the apnoea at 45–53 s and RR reads 0 (without the rule: 58.6 s — the first ripple cycle was counted);
`apneaS 10` raises at 38–42 s. co2-numerics: EtCO2 invalid until two breaths. `stage3-alarms-engine` and
`resp-coupling` (the capnograph apnoea after a disconnect; no impedance apnoea while the bag breathes) unchanged;
8a's gate document `g3-disconnect-apnoea-alarm` (raised 15–22 s after the event) is unchanged (validation passes on the
prototype).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core
git commit -m "FU-5 Task 6: skin apnoea times, EtCO2 invalid before two breaths, impedance cardiac-overlay rejection, CO2 line occlusion state

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 7: The HR numeric — never "0" with the leads off, a fresh average after a gap, the skin's HR source (L3 + E-FU5-6; PROTOTYPED)

Decision D8 (audit M3, M16). With the leads off the engine published HR 0 as VALID for 60 s and raised `**HR 0<50` on
reconnection. Now the ECG HR is invalid while the leads are off and its R–R history restarts (reconnection starts a
fresh average); an R–R longer than 6 s also restarts it (the "3" for a second after an asystole); the "0" follows the
skin's asystole time (saadat-like 10 s). The device profile learns the skin's HR source (`hr.source`, `autoPriority`,
`relabelNonEcgAs`) — the alarm side is Task 8, the tile Task 11.

**Files:**
- Modify: `packages/engine-core/src/l3/hr.ts`, `packages/engine-core/src/engine.ts` (E-FU5-6: the HR emission),
  `packages/engine-core/src/l3/alarms/profile.ts` (`DeviceProfile.hr`)
- Modify (tests): `packages/engine-core/test/l3/hr.test.ts` (one case), `packages/engine-core/test/engine/alarms-engine.test.ts`
  (the leads-off test also asserts the HR is invalid)

- [ ] **Step 1: HR history and asystole time**

**Modify `packages/engine-core/src/l3/hr.ts`** — find (exactly once):

```ts
const SLOW_RR_S = 1.2;
const ASYSTOLE_S = 4.0;
```

replace with:

```ts
const SLOW_RR_S = 1.2;
const ASYSTOLE_S = 4.0;
/**
 * FU-5 (audit M16): an R–R longer than this is a gap (asystole, leads off), not a rate: the history restarts, so the
 * first beats after it are not averaged with it (the HR read "3" for a second after an asystole) [ENG, 10 bpm].
 */
export const RESET_RR_S = 6;
```

**Modify `packages/engine-core/src/l3/hr.ts`** — find (exactly once):

```ts
    const rr = tR - st.lastR;
    if (rr < MIN_RR_S) return;
    st.rrs.push(rr);
```

replace with:

```ts
    const rr = tR - st.lastR;
    if (rr < MIN_RR_S) return;
    if (rr > RESET_RR_S) {
      st.rrs = [];
      st.long = { rr: [], end: [] };
      st.lastR = tR;
      return;
    }
    st.rrs.push(rr);
```

**Modify `packages/engine-core/src/l3/hr.ts`** — find (exactly once):

```ts
/**
 * The HR numeric at time t (call once per second); `avg` is the skin's optional averaging (FU-1), `method` the
 * skin's 12-RR method (FU-3; defaults to the state's).
 */
export function hrMeasure(st: HrState, t: number, avg?: HrAveraging, method: HrMethod = st.method): Measured {
  if (st.lastR >= 0 && t - st.lastR >= ASYSTOLE_S) return { value: 0, flag: 'valid', at: t };
```

replace with:

```ts
/**
 * The HR numeric at time t (call once per second); `avg` is the skin's optional averaging (FU-1), `method` the
 * skin's 12-RR method (FU-3; defaults to the state's), `asystoleS` the skin's asystole time (FU-5: saadat-like reads 0
 * at its 10 s alarm, not 6 s before it).
 */
export function hrMeasure(st: HrState, t: number, avg?: HrAveraging, method: HrMethod = st.method, asystoleS = ASYSTOLE_S): Measured {
  if (st.lastR >= 0 && t - st.lastR >= asystoleS) return { value: 0, flag: 'valid', at: t };
```


- [ ] **Step 2: The engine emits an invalid HR while the leads are off (E-FU5-6)**

**Modify `packages/engine-core/src/engine.ts`** — find (exactly once):

```ts
          const hra = this.hrAveraging();
          ps.out.push({ type: 'measurement', t, values: { hr: hrMeasure(ps.hrm, t, hra.avg, hra.method) } }); // FU-1/FU-3: the skin's averaging
```

replace with:

```ts
          const hra = this.hrAveraging();
          // FU-5 (audit M3): with the leads off the ECG measures nothing — HR is invalid ("-?-"), never a valid 0 — and the
          // RR history is dropped, so the beats after reconnection start a fresh average (no `HR 0<50` on reconnect)
          const off = ps.mods.artefact.leadOff;
          if (off) ps.hrm = createHrState(ps.hrm.method);
          const hr = off ? { value: null, flag: 'invalid' as const, at: t } : hrMeasure(ps.hrm, t, hra.avg, hra.method, this.dev.alarms.profile.arrhythmia.asystoleS);
          ps.out.push({ type: 'measurement', t, values: { hr } }); // FU-1/FU-3: the skin's averaging
```


- [ ] **Step 3: The skin's HR source in the device profile**

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
  hrDashesWhilePacing: boolean;
```

replace with:

```ts
  hrDashesWhilePacing: boolean;
  /**
   * FU-5 (audit M3, M11): the skin's HR source. 'AUTO': with no valid ECG heart rate the first valid pulse in `pulse`
   * order (skin `hr.autoPriority`: ART/IBP1 → `prAbp`, SpO2 → `pr`) becomes the HR/alarm source; `relabel` is the tile
   * label then (saadat-like "PR"; null = the HR tile keeps its glyph and the pulse stays in its own tile, philips-like).
   */
  hr: { source: 'ECG' | 'AUTO'; pulse: NumericId[]; relabel: string | null };
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
    hrDashesWhilePacing: PACING_HR_DASHES.has(r.skinId),
```

replace with:

```ts
    hrDashesWhilePacing: PACING_HR_DASHES.has(r.skinId),
    hr: {
      source: s.hr.source === 'AUTO' ? 'AUTO' : 'ECG',
      pulse: [...new Set(s.hr.autoPriority.map((k) => PULSE_SOURCE[k]).filter((k): k is NumericId => k !== undefined))],
      relabel: s.hr.relabelNonEcgAs,
    },
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
/** Apnoea time when the skin's limit table has none (brief §6.4 "apnoea (20 s)"). */
```

replace with:

```ts
/** FU-5: skin `hr.autoPriority` entries → the pulse numeric that source publishes (the engine's IBP1 is the ABP line). */
const PULSE_SOURCE: Readonly<Record<string, NumericId>> = { ART: 'prAbp', IBP1: 'prAbp', SpO2: 'pr' };
/** Apnoea time when the skin's limit table has none (brief §6.4 "apnoea (20 s)"). */
```


- [ ] **Step 4: Tests**

**Modify `packages/engine-core/test/l3/hr.test.ts`** — find (exactly once):

```ts
  it('reads 0 after 4 s without a QRS; ignores RR < 200 ms', () => {
```

replace with:

```ts
  it('FU-5 (audit M16): an R–R over 6 s restarts the history (no "3" after an asystole); the "0" follows the skin asystole time', () => {
    const { st, t } = feed(Array(12).fill(0.8));
    expect(hrMeasure(st, t + 9.9, undefined, 'dropMaxMin', 10).value).toBe(75); // saadat-like: still the rate before its 10 s
    expect(hrMeasure(st, t + 10, undefined, 'dropMaxMin', 10).value).toBe(0);
    hrOnQrs(st, t + 20); // the first beat after 20 s of asystole
    expect(st.rrs).toEqual([]);
    hrOnQrs(st, t + 20.75);
    hrOnQrs(st, t + 21.5);
    expect(hrMeasure(st, t + 21.6).value).toBe(80); // not a 4-RR average including the 20 s gap
  });

  it('reads 0 after 4 s without a QRS; ignores RR < 200 ms', () => {
```

**Modify `packages/engine-core/test/engine/alarms-engine.test.ts`** — find (exactly once):

```ts
    expect(alarmsOf(ev, 'ASYSTOLE')).toEqual([]);
    expect(ev.some((x) => x.type === 'alarm' && x.level === undefined)).toBe(false); // raw L2 flags are re-issued, not passed on
```

replace with:

```ts
    expect(alarmsOf(ev, 'ASYSTOLE')).toEqual([]);
    // FU-5 (audit M3): with the leads off the HR is not measured — invalid, never a valid "0"
    const hr = ev.filter((x): x is Extract<EngineEvent, { type: 'measurement' }> => x.type === 'measurement' && x.t > 6 && x.values.hr !== undefined);
    expect(hr.length).toBeGreaterThan(30);
    expect(hr.every((x) => x.values.hr?.flag === 'invalid' && x.values.hr.value === null)).toBe(true);
    expect(ev.some((x) => x.type === 'alarm' && x.level === undefined)).toBe(false); // raw L2 flags are re-issued, not passed on
```


- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 typecheck
cd packages/engine-core
npx vitest run test/l3/hr.test.ts test/engine/alarms-engine.test.ts test/engine/hr-numeric*.test.ts test/l3/alarms
```

Expected: all pass; `alarms-engine` "technical alarms on sensor detach" now also sees > 30 HR measurements during the
leads-off spell, every one `{ value: null, flag: 'invalid' }` (was 0, valid).

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core
git commit -m "FU-5 Task 7: HR invalid with the leads off, fresh average after a gap, the skin's HR source in the device profile

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 8: Alarm conditions — the pulse as HR source, ONE apnoea alarm, the chain table, extreme rates without arrhythmia analysis, the event hold (L3; PROTOTYPED)

Decisions D5, D6, D7, D8 (alarm side), D17 (audit M2, M3, M7, M13, Q3, Q7, Q13). The measured wrongs: one ventilator
stop raised `***APNEA (RESP)` AND `***APNEA` (two red alarms, both latched and audible after breathing resumed);
ASYSTOLE came with `**HR 0<50`; VF with `**HR_HIGH` flapping 18 times; mindray-like's red EXTREME TACHY stayed latched
through VF; PAUSE flickered 10× in 60 s at 0.1 s each; with arrhythmia analysis off (the Philips OR configuration)
EXTREME BRADY/TACHY never alarmed although [S2] p. 89 lists them among the HR alarms that stay on.

**Files:**
- Modify: `packages/engine-core/src/l3/alarms/{conditions,manager,profile,text}.ts`,
  `packages/engine-core/src/l3/device-layer.ts` (`DeviceHost.co2`, `inp.co2`), `packages/engine-core/src/engine.ts`
  (E-FU5-6: the host's `co2`)
- Create: `packages/engine-core/test/l3/alarms/fu5-conditions.test.ts`
- Modify (tests, R45 re-statements): `packages/engine-core/test/l3/alarms/stage3-hooks.test.ts` ("one apnoea raises
  ONE alarm with the source's id" — was "both flags are re-issued"; saadat-like: CO2 APNEA with the capnograph on, RESP
  APNEA with it off), `packages/engine-core/test/engine/alarms-engine.test.ts` (the age-band test uses HR 135: HR 140
  is philips-like's extreme-tachy threshold (120 + 20, [S1] p. 50), which now alarms with arrhythmia analysis off
  ([S2] p. 89) and supersedes HR HIGH — the review confirmed this re-statement legitimate. NO acknowledge is added
  (Orchestrator ruling (FU-5 review), 2026-09-28, rulings 2 and 7): the first HR average reads 144 at 3 s — its four
  beats fall on the respiratory sinus-arrhythmia peak (truth R–R 0.41–0.45 s = 134–145/min around the 135 target: the
  truth averaged over the first beats, not a device defect; measured on the prototype) — so EXTREME TACHY is raised at
  3 s, held 5 s and latched; a latched alarm suppresses nothing, so the test asserts EXTREME TACHY raised at 3 s and HR
  HIGH raised by 10 s (8 s measured) with no acknowledge; the test's subject, the age band, is unchanged)

**Interfaces:**
- Produces: `conditions.ts` `CHAIN`, `EVENT_HOLD_S`, `AGONAL_RR_S`, `EXTREME_CLEAR_S`, `chain(out, s?)`;
  `AlarmInputs.co2`, `AlarmInputs.prevQrsT?`, `AlarmInputs.extremeSeen?` (optional: older snapshots);
  `Condition.suppressed?`, `Condition.holdS?`; `AlarmMgrState.hold?` (optional: older snapshots);
  `DeviceProfile.arrhythmia.extreme`, `DeviceProfile.arrhythmia.pauseAlarm` (review ruling 5).
- The alarm ids stay (`apnoea-co2`, `apnoea-resp`, `HR_HIGH` …): 8a's gate documents, the controller and the renderer
  key on them.

- [ ] **Step 1: Conditions — HR source, extreme rates, one apnoea, PAUSE hold, the chain**

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
/** Raw CO2 sampling-line INOP ids accepted from Stage 3 (request R-4b-1 names `co2Line`). */
export const CO2_LINE_FLAGS: ReadonlySet<string> = new Set(['co2Line', 'co2-line']);
```

replace with:

```ts
/** Raw CO2 sampling-line INOP ids accepted from Stage 3 (request R-4b-1 names `co2Line`). */
export const CO2_LINE_FLAGS: ReadonlySet<string> = new Set(['co2Line', 'co2-line']);
/**
 * FU-5 (audit M7; research/00 "FU-5 opened": "chained alarms suppressed by priority"): an active condition suppresses
 * the ones it explains. Arrhythmias follow the Philips chaining ([S2] IFU p. 99: one announced alarm per chain, a
 * higher priority supersedes — asystole, VF/VT, VT, extreme rate, HR limit); one apnoea raises one alarm, not RR,
 * awRR or EtCO2 LOW beside it (the ruling's "one condition raises exactly one alarm"). A suppressed alarm is CLEARED,
 * never latched (a superseded alarm, [S2] p. 99), and is not raised while its suppressor holds.
 */
export const CHAIN: Readonly<Record<string, readonly string[]>> = {
  ASYSTOLE: ['HR_LOW', 'EXTREME_BRADY', 'BRADY', 'PAUSE', 'PVCS'],
  VFIB: ['VTAC', 'HR_HIGH', 'HR_LOW', 'EXTREME_TACHY', 'EXTREME_BRADY', 'TACHY', 'BRADY', 'PAUSE', 'PVCS'],
  VTAC: ['HR_HIGH', 'EXTREME_TACHY', 'TACHY', 'PVCS'],
  EXTREME_TACHY: ['HR_HIGH', 'TACHY'],
  EXTREME_BRADY: ['HR_LOW', 'BRADY'],
  'apnoea-co2': ['RR_LOW', 'AWRR_LOW', 'EtCO2_LOW', 'EtCO2_pctV_LOW'],
  'apnoea-resp': ['RR_LOW', 'AWRR_LOW'],
};
/** FU-5 (audit M13): an event arrhythmia alarm (PAUSE) stays at least this long once raised [ENG]. */
export const EVENT_HOLD_S = 5;
/**
 * FU-5 (review ruling 6): an R–R at least this long keeps a standing ASYSTOLE — agonal is < 20/min (R–R ≥ 3 s,
 * research/03 §1.5), less half a second for the detector's timing of a wide complex (2.9 s measured between agonal
 * beats generated 3 s apart) [ENG].
 */
export const AGONAL_RR_S = 2.5;
/** FU-5 (review F9): a live extreme-rate alarm ends only after this long back inside its threshold [ENG]. */
export const EXTREME_CLEAR_S = 5;
/** FU-5: the alarm is raised and live (not latched) or pending its delay — a hysteresis band applies. */
const holdingId = (s: AlarmMgrState, id: string): boolean => (s.active[id] !== undefined && !s.active[id].latched) || s.pending[id] !== undefined;
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  /** Stage 3's raw apnoea flags (its CO2 and impedance detectors) and a CO2 line INOP flag (request R-4b-1). */
  apnoeaFlags: string[];
  co2Line: boolean;
}
```

replace with:

```ts
  /** Stage 3's raw apnoea flags (its CO2 and impedance detectors) and a CO2 line INOP flag (request R-4b-1). */
  apnoeaFlags: string[];
  co2Line: boolean;
  /** FU-5: when the HR was last beyond each extreme threshold (EXTREME_CLEAR_S); absent in older snapshots. */
  extremeSeen?: Record<string, number>;
  /** FU-5: the capnograph's state — while 'on' it is the respiratory (apnoea) source, else the impedance. */
  co2: 'off' | 'warmup' | 'on' | 'occluded';
}
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
    apnoeaFlags: [], co2Line: false,
  };
```

replace with:

```ts
    apnoeaFlags: [], co2Line: false, co2: 'on',
  };
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  // LIFEPAK-like: HR alarms off while pacing (research/05 §2.6); with the leads off HR is not measured (brief §6.2).
  const hrSuppressed = (inp.pacing && p.hrDashesWhilePacing) || inp.leadsOff;

  // Limit alarms on displayed numerics (brief §6.4), only where the per-parameter switch is ON (brief §6.4.1).
  for (const [key, d] of Object.entries(p.limits)) {
    const v = valid(inp, d.numeric, t); // cheapest test first: this loop runs every tick
    if (v === null || (hrSuppressed && d.numeric === 'hr') || !isEnabled(s, key)) continue;
    const l = limitOf(s, key);
    if (v === null || !l) continue;
    const delayS = d.numeric === 'spo2' ? p.spo2DelayS : p.delayS;
    const c = { level: d.level, category: 'physiological' as const, delayS, numeric: d.numeric };
    if (l.high !== null && v > l.high) out.push({ id: `${key}_HIGH`, text: limitText(p, d, 'HIGH', v), ...c });
    if (l.low !== null && v < l.low) out.push({ id: `${key}_LOW`, text: limitText(p, d, 'LOW', v), ...c });
  }
```

replace with:

```ts
  // LIFEPAK-like: HR alarms off while pacing (research/05 §2.6); with the leads off HR is not measured (brief §6.2).
  const hrSuppressed = (inp.pacing && p.hrDashesWhilePacing) || inp.leadsOff;
  // FU-5 (audit M3): an AUTO skin takes the first valid pulse as the HR/alarm source while the ECG has no heart rate
  // (Philips "Alarm Source Auto", [S2] IFU p. 108: HR/Pulse limits and the extreme rate alarms act on the pulse, the
  // arrhythmia and ECG HR alarms are off; Saadat HR AUTO, research/06 §4.1)
  const pulse = inp.leadsOff && p.hr.source === 'AUTO' ? p.hr.pulse.find((k) => valid(inp, k, t) !== null) : undefined;

  // Limit alarms on displayed numerics (brief §6.4), only where the per-parameter switch is ON (brief §6.4.1).
  for (const [key, d] of Object.entries(p.limits)) {
    const src = pulse !== undefined && d.numeric === 'hr' ? pulse : d.numeric;
    const v = valid(inp, src, t); // cheapest test first: this loop runs every tick
    if (v === null || (hrSuppressed && src === 'hr') || !isEnabled(s, key)) continue;
    const l = limitOf(s, key);
    if (v === null || !l) continue;
    const delayS = d.numeric === 'spo2' ? p.spo2DelayS : p.delayS;
    const c = { level: d.level, category: 'physiological' as const, delayS, numeric: d.numeric };
    const dd = src === d.numeric ? d : { ...d, label: 'Pulse', upper: 'PR' }; // "**Pulse 130>120" / "PR TOO HIGH"
    if (l.high !== null && v > l.high) out.push({ id: `${key}_HIGH`, text: limitText(p, dd, 'HIGH', v), ...c });
    if (l.low !== null && v < l.low) out.push({ id: `${key}_LOW`, text: limitText(p, dd, 'LOW', v), ...c });
  }
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  // ECG: technical first; lethal arrhythmias whenever leads are on (they cannot be switched off, brief §6.4.1).
  if (inp.leadsOff) out.push(fixed('ecgLeadsOff', 3, 'technical'));
  else {
```

replace with:

```ts
  // Extreme rate alarms (red) from the active HR source, WITH OR WITHOUT arrhythmia analysis (FU-5: Philips "HR alarms
  // when arrhythmia analysis is switched off" include extreme tachy/brady, [S2] IFU p. 89, audit Q13): the HR limit
  // ∓ 20 bpm clamped (Philips ΔExtrTachy/ΔExtrBrady 20, clamps 200/40 [S1] p. 50), or the skin's absolute limits
  // (mindray-like 160/35, [S4] App. C.1.1). Saadat-like has none (its BRADY/TACHY are arrhythmia alarms below).
  const ar = p.arrhythmia;
  const hrA = pulse !== undefined ? valid(inp, pulse, t) : hrSuppressed ? null : valid(inp, 'hr', t);
  if (hrA !== null && hrA > 0 && ar.brady === null && ar.tachy === null) {
    const hrl = limitOf(s, 'HR');
    const [lo, hi] = EXTREME_CLAMP[p.ageBand];
    const bradyAt = ar.extreme.brady ?? Math.max(lo, (hrl?.low ?? lo) - EXTREME_OFFSET);
    const tachyAt = ar.extreme.tachy ?? Math.min(hi, (hrl?.high ?? hi) + EXTREME_OFFSET);
    // one bpm of hysteresis (the limit alarms get the same rule in FU-5 Task 9), the event hold (≥ 5 s once raised) and
    // a clear delay: a live extreme alarm ends only after EXTREME_CLEAR_S back inside its threshold (review F9 [ENG]) —
    // in AF 150 the HR dipped below 140 for 1–2 s a dozen times, and each dip ended EXTREME TACHY and let HR HIGH blip
    const seen = (inp.extremeSeen ??= {});
    const beyond = (id: string, now: boolean, band: boolean) => {
      if (now) seen[id] = t;
      return now || (holdingId(s, id) && (band || t - (seen[id] ?? -Infinity) < EXTREME_CLEAR_S));
    };
    if (beyond('EXTREME_BRADY', hrA < bradyAt, hrA <= bradyAt)) out.push({ ...fixed('EXTREME_BRADY', 1, 'physiological'), holdS: EVENT_HOLD_S });
    if (beyond('EXTREME_TACHY', hrA > tachyAt, hrA >= tachyAt)) out.push({ ...fixed('EXTREME_TACHY', 1, 'physiological'), holdS: EVENT_HOLD_S });
  }

  // ECG: technical first; lethal arrhythmias whenever leads are on (they cannot be switched off, brief §6.4.1).
  if (inp.leadsOff) out.push(fixed('ecgLeadsOff', 3, 'technical'));
  else {
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  lastQrsT: number | null;
  meanRR: number | null;
```

replace with:

```ts
  lastQrsT: number | null;
  /** FU-5: the QRS before `lastQrsT` (the last R–R, for the agonal arrest hold); absent in older snapshots. */
  prevQrsT?: number | null;
  meanRR: number | null;
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
    if (rr > 0.2) inp.meanRR = inp.meanRR === null ? rr : inp.meanRR + RR_EMA * (rr - inp.meanRR);
  }
  inp.lastQrsT = tR;
```

replace with:

```ts
    if (rr > 0.2) inp.meanRR = inp.meanRR === null ? rr : inp.meanRR + RR_EMA * (rr - inp.meanRR);
  }
  // the agonal hold's R–R skips a second detection inside the same wide complex (the detector fires twice, 0.12 s apart,
  // on an agonal beat — measured), as the mean R–R above does
  if (inp.lastQrsT === null || tR - inp.lastQrsT > 0.2) inp.prevQrsT = inp.lastQrsT;
  inp.lastQrsT = tR;
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
    const since = Math.max(inp.lastQrsT ?? -Infinity, inp.ecgOnSince);
    if (!vf && t - since >= p.arrhythmia.asystoleS) out.push(fixed('ASYSTOLE', 1, 'physiological'));
```

replace with:

```ts
    const since = Math.max(inp.lastQrsT ?? -Infinity, inp.ecgOnSince);
    // FU-5 (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 6): once ASYSTOLE stands, an agonal beat (R–R ≥
    // AGONAL_RR_S, < 20/min, research/03 §1.5) does not end it — the arrest alarm governs; two beats closer than that
    // (a rhythm returning) do. Without it each agonal beat cleared ASYSTOLE and let EXTREME BRADY re-raise (11 red
    // raises in Ali's case after FU-4's arrest; mindray-like, which does not latch, re-raised ASYSTOLE 15 times in 4 min)
    const lastRR = inp.lastQrsT !== null && inp.prevQrsT != null ? inp.lastQrsT - inp.prevQrsT : Infinity;
    const agonal = holdingId(s, 'ASYSTOLE') && lastRR >= AGONAL_RR_S;
    if (!vf && (t - since >= p.arrhythmia.asystoleS || agonal)) out.push(fixed('ASYSTOLE', 1, 'physiological'));
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
    if (s.cfg.arrhythmia && !hrSuppressed) {
      const hr = valid(inp, 'hr', t);
      const ar = p.arrhythmia;
      if (hr !== null && hr > 0) {
        if (ar.brady !== null || ar.tachy !== null) {
          if (ar.brady !== null && hr <= ar.brady) out.push(fixed('BRADY', 2, 'physiological'));
          if (ar.tachy !== null && hr >= ar.tachy) out.push(fixed('TACHY', 2, 'physiological'));
        } else {
          const hrl = limitOf(s, 'HR');
          const [lo, hi] = EXTREME_CLAMP[p.ageBand];
          const bradyAt = Math.max(lo, (hrl?.low ?? lo) - EXTREME_OFFSET);
          const tachyAt = Math.min(hi, (hrl?.high ?? hi) + EXTREME_OFFSET);
          if (hr < bradyAt) out.push(fixed('EXTREME_BRADY', 1, 'physiological'));
          if (hr > tachyAt) out.push(fixed('EXTREME_TACHY', 1, 'physiological'));
        }
      }
      const gap = inp.lastQrsT === null ? 0 : t - inp.lastQrsT;
      const pauseAt = 'ratio' in ar.pause ? (inp.meanRR ?? Infinity) * ar.pause.ratio : ar.pause.s;
      if (!vf && gap > pauseAt && gap < ar.asystoleS) out.push(fixed('PAUSE', 2, 'physiological'));
```

replace with:

```ts
    if (s.cfg.arrhythmia && !hrSuppressed) {
      const hr = valid(inp, 'hr', t);
      if (hr !== null && hr > 0) {
        if (ar.brady !== null && hr <= ar.brady) out.push(fixed('BRADY', 2, 'physiological'));
        if (ar.tachy !== null && hr >= ar.tachy) out.push(fixed('TACHY', 2, 'physiological'));
      }
      const gap = inp.lastQrsT === null ? 0 : t - inp.lastQrsT;
      const pauseAt = 'ratio' in ar.pause ? (inp.meanRR ?? Infinity) * ar.pause.ratio : ar.pause.s;
      if (ar.pauseAlarm && !vf && gap > pauseAt && gap < ar.asystoleS) out.push({ ...fixed('PAUSE', 2, 'physiological'), holdS: EVENT_HOLD_S });
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  // APNEA (brief §6.4 "apnoea (20 s)"; §6.4.1 always on, level 1): what the monitor's own detectors see — Stage 3's
  // capnograph (awRR, `apnoea-co2`) and impedance (`apnoea-resp`) flags, re-issued with the SAME ids, the skin's level
  // and text (as ecgLeadsOff / nibp-failed). APNEA LIMIT OFF (a preset, research/06 §3.1 F7) disables both.
  if (p.apneaS !== null) for (const id of inp.apnoeaFlags) out.push(fixed(id as 'apnoea-co2' | 'apnoea-resp', 1, 'physiological'));
```

replace with:

```ts
  // APNEA (brief §6.4 "apnoea (20 s)"; §6.4.1 always on, level 1): what the monitor's own detectors see — Stage 3's
  // capnograph (awRR, `apnoea-co2`) and impedance (`apnoea-resp`) flags, re-issued with the SAME ids, the skin's level
  // and text (as ecgLeadsOff / nibp-failed). APNEA LIMIT OFF (a preset, research/06 §3.1 F7) disables both.
  // FU-5 (audit M2): ONE apnoea, ONE alarm — from the active respiratory source only: the capnograph while it measures,
  // else the impedance (Philips "***APNEA" from CO2, Resp or AGM, [S2] IFU p. 41; Saadat's CAPNO/RESP key selects
  // one RR source, research/06 §4.1).
  const apnoeaSrc = inp.co2 === 'on' ? 'apnoea-co2' : 'apnoea-resp';
  if (p.apneaS !== null && inp.apnoeaFlags.includes(apnoeaSrc)) out.push(fixed(apnoeaSrc, 1, 'physiological'));
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  if (inp.nibpFailed) out.push(fixed('nibp-failed', 3, 'technical'));
  return out;
}
```

replace with:

```ts
  if (inp.nibpFailed) out.push(fixed('nibp-failed', 3, 'technical'));
  return chain(out, s);
}

/**
 * FU-5: mark the conditions a CHAIN parent explains as `suppressed`; the manager clears them (never latches them). A
 * suppressor is a parent whose CONDITION is present this tick, or whose entry was LIVE (raised, not latched) at the
 * previous tick — "lower priority alarms in the same chain will not be announced while an alarm is active" ([S2] IFU
 * p. 99; p. 97: indications are inhibited "if a more serious alarm condition is active"). The previous-tick case closes
 * the one tick in which a parent's condition has ended but its entry is not yet latched or cleared (22 zero-length
 * `**HR 140>120` raise/clear pairs in Ali's case). A LATCHED entry never suppresses: its condition has ended, so a
 * post-ROSC bradycardia under a latched ASYSTOLE alarms, and a VT after a latched VF raises VTAC (Orchestrator ruling
 * (FU-5 review), 2026-09-28, ruling 2). Rank is the chain position, not the level: a parent suppresses every member it
 * lists (ASYSTOLE and EXTREME BRADY are both red).
 */
export function chain(out: Condition[], s?: AlarmMgrState): Condition[] {
  const sup = (id: string) => {
    const x = CHAIN[id];
    if (x) for (const c of out) if (c.id !== id && x.includes(c.id)) c.suppressed = true;
  };
  for (const c of out) sup(c.id);
  if (s) for (const e of Object.values(s.active)) if (!e.latched) sup(e.id);
  return out;
}
```


The PAUSE alarm's factory switch (review ruling 5: mindray-like Pause Off, [S4] App. C.1.1.2; the skin field is Task 2's):

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
    tachy: number | null;
    brady: number | null;
  };
```

replace with:

```ts
    tachy: number | null;
    brady: number | null;
    /** FU-5: the PAUSE alarm's factory switch (skin `arrhythmia.pauseAlarm`; mindray-like Off, [S4] App. C.1.1.2). */
    pauseAlarm: boolean;
  };
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
      tachy: ar.tachy,
      brady: ar.brady,
```

replace with:

```ts
      tachy: ar.tachy,
      brady: ar.brady,
      pauseAlarm: ar.pauseAlarm,
```

- [ ] **Step 2: The manager clears superseded alarms and holds event alarms**

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
  /** Must hold continuously this long before the alarm is raised (s). */
  delayS: number;
  numeric?: NumericId;
}
```

replace with:

```ts
  /** Must hold continuously this long before the alarm is raised (s). */
  delayS: number;
  numeric?: NumericId;
  /** FU-5: explained by a higher alarm (conditions.ts CHAIN): not raised, and an active entry clears without latching. */
  suppressed?: boolean;
  /** FU-5: once raised, the entry stays at least this long (an event alarm such as PAUSE; audit M13). */
  holdS?: number;
}
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
  silencedUntil: number | null;
  pausedUntil: number | null;
  lastStatusT: number;
  dirty: boolean;
}
```

replace with:

```ts
  silencedUntil: number | null;
  pausedUntil: number | null;
  lastStatusT: number;
  dirty: boolean;
  /** FU-5: alarm id → the time before which a raised event alarm is kept (Condition.holdS); absent in older snapshots. */
  hold?: Record<string, number>;
}
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
  const now = new Set<string>();
  for (const c of conds) {
    now.add(c.id);
```

replace with:

```ts
  const now = new Set<string>();
  let superseded: Set<string> | null = null;
  for (const c of conds) {
    if (c.suppressed) {
      (superseded ??= new Set()).add(c.id);
      continue;
    }
    now.add(c.id);
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
    if (c.numeric) entry.numeric = c.numeric;
    s.active[c.id] = entry;
```

replace with:

```ts
    if (c.numeric) entry.numeric = c.numeric;
    if (c.holdS) (s.hold ??= {})[c.id] = t + c.holdS;
    s.active[c.id] = entry;
```

**Modify `packages/engine-core/src/l3/alarms/manager.ts`** — find (exactly once):

```ts
  for (const [id, e] of Object.entries(s.active)) {
    if (now.has(id)) continue;
    // FU-5: latching per vendor (skin `alarms.latching`): the message stays until acknowledged, the sound only under
    // audible latching; an acknowledged alarm whose condition ends clears ([S2] p. 40)
    if (!e.acked && latchCovers(p.latching.visual, e)) {
```

replace with:

```ts
  for (const [id, e] of Object.entries(s.active)) {
    if (now.has(id)) continue;
    const gone = superseded?.has(id) === true; // FU-5: superseded by a higher alarm — cleared, never latched
    const holdUntil = s.hold?.[id];
    if (!gone && holdUntil !== undefined && t < holdUntil) continue;
    if (s.hold && holdUntil !== undefined) delete s.hold[id];
    // FU-5: latching per vendor (skin `alarms.latching`): the message stays until acknowledged, the sound only under
    // audible latching; an acknowledged alarm whose condition ends clears ([S2] p. 40)
    if (!gone && !e.acked && latchCovers(p.latching.visual, e)) {
```


- [ ] **Step 3: Absolute extreme limits, the APNEA text, the capnograph state on the host**

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
    vtacRate: number;
    vtacCount: number;
```

replace with:

```ts
    vtacRate: number;
    vtacCount: number;
    /** FU-5: absolute extreme brady/tachy limits (skin limit table `HR_extremeBrady/Tachy`); null = HR limit ∓ 20. */
    extreme: { brady: number | null; tachy: number | null };
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
      vtacRate: ar.vtac.rate,
      vtacCount: ar.vtac.count,
```

replace with:

```ts
      vtacRate: ar.vtac.rate,
      vtacCount: ar.vtac.count,
      extreme: { brady: numberOr(r.limits[band]?.HR_extremeBrady), tachy: numberOr(r.limits[band]?.HR_extremeTachy) },
```

**Modify `packages/engine-core/src/l3/alarms/profile.ts`** — find (exactly once):

```ts
/** Limit-key group a per-parameter switch acts on: 'NIBP_S' → 'NIBP', 'ART_M' → 'ART', 'HR' → 'HR'. */
```

replace with:

```ts
const numberOr = (v: unknown): number | null => (typeof v === 'number' ? v : null);

/** Limit-key group a per-parameter switch acts on: 'NIBP_S' → 'NIBP', 'ART_M' → 'ART', 'HR' → 'HR'. */
```

**Modify `packages/engine-core/src/l3/alarms/text.ts`** — find (exactly once):

```ts
  'apnoea-resp': 'APNEA (RESP)', // Stage 3's impedance detector [inferred text, Stage 3's raw text]
```

replace with:

```ts
  'apnoea-resp': 'APNEA', // FU-5: one message whatever the source ([S2] IFU p. 41 "***APNEA" from CO2, Resp or AGM)
```

**Modify `packages/engine-core/src/l3/device-layer.ts`** — find (exactly once):

```ts
  spo2Probe: 'on' | 'off' | 'motion';
  leadsOff: boolean;
  /** First ECG sample index not yet committed. */
```

replace with:

```ts
  spo2Probe: 'on' | 'off' | 'motion';
  leadsOff: boolean;
  /** FU-5: the capnograph's sensor state (the apnoea source while 'on'). */
  co2: 'off' | 'warmup' | 'on' | 'occluded';
  /** First ECG sample index not yet committed. */
```

**Modify `packages/engine-core/src/l3/device-layer.ts`** — find (exactly once):

```ts
  inp.spo2Probe = host.spo2Probe;
```

replace with:

```ts
  inp.spo2Probe = host.spo2Probe;
  inp.co2 = host.co2;
```

**Modify `packages/engine-core/src/engine.ts`** — find (exactly once):

```ts
      leadsOff: ps.mods.artefact.leadOff,
```

replace with:

```ts
      leadsOff: ps.mods.artefact.leadOff,
      co2: ps.resp.co2Sensor, // FU-5
```


- [ ] **Step 4: Tests**

**Modify `packages/engine-core/test/l3/alarms/stage3-hooks.test.ts`** — find (exactly once):

```ts
  it("Stage 3's apnoea flags are re-issued with the same ids, level 1 and the skin's text", () => {
    const m = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    expect(ids(buildConditions(m, inp, 1))).not.toContain('apnoea-co2');
    observeEvent(inp, raw(30, 'apnoea-co2', true));
    observeEvent(inp, raw(30, 'apnoea-resp', true));
    const out: EngineEvent[] = [];
    stepAlarms(m, 30, buildConditions(m, inp, 30), out);
    const a = out.filter((e): e is Extract<EngineEvent, { type: 'alarm' }> => e.type === 'alarm' && e.state === 'raised' && e.id.startsWith('apnoea'));
    expect(a.map((x) => [x.id, x.level, x.priority, x.text]).sort()).toEqual([['apnoea-co2', 1, 'high', '***APNEA'], ['apnoea-resp', 1, 'high', '***APNEA (RESP)']]);
    observeEvent(inp, raw(31, 'apnoea-co2', false));
    expect(ids(buildConditions(m, inp, 31))).not.toContain('apnoea-co2');
    expect(ids(buildConditions(m, inp, 31))).toContain('apnoea-resp');
  });
```

replace with:

```ts
  it("FU-5 (audit M2): one apnoea raises ONE alarm with the source's id — the capnograph's while it measures, else the impedance's; level 1, the skin's text", () => {
    const m = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    expect(ids(buildConditions(m, inp, 1))).not.toContain('apnoea-co2');
    observeEvent(inp, raw(30, 'apnoea-co2', true));
    observeEvent(inp, raw(30, 'apnoea-resp', true));
    const out: EngineEvent[] = [];
    stepAlarms(m, 30, buildConditions(m, inp, 30), out);
    const a = out.filter((e): e is Extract<EngineEvent, { type: 'alarm' }> => e.type === 'alarm' && e.state === 'raised' && e.id.startsWith('apnoea'));
    expect(a.map((x) => [x.id, x.level, x.priority, x.text])).toEqual([['apnoea-co2', 1, 'high', '***APNEA']]);
    inp.co2 = 'off'; // no capnograph: the impedance is the source, same message
    expect(buildConditions(m, inp, 31).filter((x) => x.id.startsWith('apnoea')).map((x) => [x.id, x.text])).toEqual([['apnoea-resp', '***APNEA']]);
    inp.co2 = 'on';
    observeEvent(inp, raw(31, 'apnoea-co2', false));
    expect(ids(buildConditions(m, inp, 31)).filter((x) => x.startsWith('apnoea'))).toEqual([]);
  });
```

**Modify `packages/engine-core/test/l3/alarms/stage3-hooks.test.ts`** — find (exactly once):

```ts
    const c = buildConditions(m, inp, 12);
    expect(c.find((x) => x.id === 'apnoea-resp')).toMatchObject({ level: 1, text: 'RESP APNEA' });
    expect(c.find((x) => x.id === 'apnoea-co2')).toMatchObject({ level: 1, text: 'CO2 APNEA' });
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('iran-icu-as-found')), inp, 12))).not.toContain('apnoea-resp');
```

replace with:

```ts
    const c = buildConditions(m, inp, 12);
    expect(c.find((x) => x.id === 'apnoea-co2')).toMatchObject({ level: 1, text: 'CO2 APNEA' }); // CAPNO is the RR source
    expect(ids(c)).not.toContain('apnoea-resp');
    inp.co2 = 'off'; // RESP is the RR source (research/06 §4.1: CAPNO/RESP selects one)
    expect(buildConditions(m, inp, 12).find((x) => x.id === 'apnoea-resp')).toMatchObject({ level: 1, text: 'RESP APNEA' });
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('iran-icu-as-found')), inp, 12))).not.toContain('apnoea-resp');
```

**Create `packages/engine-core/test/l3/alarms/fu5-conditions.test.ts`:**

```ts
// FU-5 alarm conditions (research/10 audit M3, M7, M13; research/00 "FU-5 opened"): the HR source, the chain table,
// extreme rates without arrhythmia analysis, the event hold. Synthetic inputs; the manager stepped at the 20 ms tick.
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs } from '../../../src/l3/alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, stepAlarms, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
const meas = (t: number, values: Record<string, number>): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, flag: 'valid', at: t }])),
});
const live = (c: Condition[]) => c.filter((x) => !x.suppressed).map((x) => x.id).sort();
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) stepAlarms(s, k * TICK, conds(k * TICK), out);
  return out;
}

describe('FU-5 conditions: HR source (audit M3)', () => {
  it('philips-like (Alarm Source Auto, [S2] p. 108): leads off → the pulse is the alarm source, "**Pulse 130>120"; zoll-like (ECG): no HR alarm', () => {
    const inp = createInputs();
    inp.leadsOff = true;
    observeEvent(inp, meas(10, { pr: 130 }));
    const ph = buildConditions(createAlarmMgr(deviceProfile('philips-like')), inp, 10);
    expect(live(ph)).toEqual(['HR_HIGH', 'ecgLeadsOff']);
    expect(ph.find((c) => c.id === 'HR_HIGH')?.text).toBe('**Pulse 130>120');
    expect(live(buildConditions(createAlarmMgr(deviceProfile('zoll-like')), inp, 10))).toEqual(['ecgLeadsOff']);
    observeEvent(inp, meas(11, { prAbp: 30 })); // the arterial line's rate comes first when valid (skin autoPriority)
    expect(buildConditions(createAlarmMgr(deviceProfile('philips-like')), inp, 11).filter((c) => !c.suppressed).map((c) => c.id).sort()).toEqual(['EXTREME_BRADY', 'ecgLeadsOff']);
  });
});

describe('FU-5 conditions: chaining (audit M7)', () => {
  it('ASYSTOLE suppresses HR LOW; VFIB suppresses HR HIGH, VTAC and EXTREME TACHY; extreme rates alarm with arrhythmia analysis OFF ([S2] p. 89)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like')); // OR configuration: arrhythmia analysis off
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, meas(10, { hr: 141 }));
    const tachy = buildConditions(s, inp, 10);
    expect(live(tachy)).toEqual(['EXTREME_TACHY']);
    expect(tachy.find((c) => c.id === 'HR_HIGH')?.suppressed).toBe(true);
    observeEvent(inp, meas(15, { hr: 0 }));
    expect(live(buildConditions(s, inp, 15))).toEqual(['ASYSTOLE']);
    inp.vfSince = 20;
    observeEvent(inp, meas(24, { hr: 160 }));
    expect(live(buildConditions(s, inp, 24))).toEqual(['VFIB']);
  });

  it('mindray-like: absolute extreme limits 160/35 ([S4] App. C.1.1), not HR limit ± 20', () => {
    const s = createAlarmMgr(deviceProfile('mindray-like'));
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, meas(10, { hr: 150 }));
    expect(live(buildConditions(s, inp, 10))).toEqual(['HR_HIGH']);
    observeEvent(inp, meas(11, { hr: 161 }));
    expect(live(buildConditions(s, inp, 11))).toEqual(['EXTREME_TACHY']);
  });

  it('one apnoea: APNEA suppresses RR LOW and EtCO2 LOW', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    observeQrs(inp, 39.9);
    observeEvent(inp, meas(40, { rr: 0, etco2: 0, awrr: 0 }));
    observeEvent(inp, { type: 'alarm', t: 40, id: 'apnoea-co2', priority: 'high', category: 'physiological', state: 'raised', text: 'APNEA' });
    expect(live(buildConditions(s, inp, 40))).toEqual(['apnoea-co2']);
  });

  it('a superseded alarm is CLEARED, not latched (philips-like latches red visually)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const XT: Condition = { id: 'EXTREME_TACHY', level: 1, category: 'physiological', text: '***EXTREME TACHY', delayS: 0 };
    const VF: Condition = { id: 'VFIB', level: 1, category: 'physiological', text: '***VFIB/VTACH', delayS: 0 };
    const ev = run(s, 0, 4, (t) => (t < 2 ? [XT] : [VF, { ...XT, suppressed: true }]));
    expect(ev.some((e) => e.type === 'alarm' && e.id === 'EXTREME_TACHY' && e.state === 'cleared')).toBe(true);
    expect(s.active.EXTREME_TACHY).toBeUndefined();
    expect(s.active.VFIB?.latched).toBe(false);
    run(s, 4.02, 5, () => []); // VF converts: VFIB latches (red, visual)
    expect(s.active.VFIB).toMatchObject({ latched: true, sounding: false });
  });

  it('HR hovering across the extreme-tachy threshold (140 on philips-like): no HR HIGH while EXTREME TACHY is live, and no zero-length HR HIGH raise/clear pair in the tick in which EXTREME TACHY ends (its entry was live the tick before)', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    const out: EngineEvent[] = [];
    for (let k = 0; k <= Math.round(30 / TICK); k++) {
      const t = k * TICK;
      if (k % 20 === 0) observeQrs(inp, t);
      if (k % 50 === 0) observeEvent(inp, meas(t, { hr: Math.floor(t) % 2 ? 135 : 141 }));
      stepAlarms(s, t, buildConditions(s, inp, t), out);
      if (s.active.EXTREME_TACHY && !s.active.EXTREME_TACHY.latched) expect(s.active.HR_HIGH, `t ${t.toFixed(2)}`).toBeUndefined();
    }
    const hh = out.filter((e) => e.type === 'alarm' && e.id === 'HR_HIGH') as Array<Extract<EngineEvent, { type: 'alarm' }>>;
    expect(out.some((e) => e.type === 'alarm' && e.id === 'EXTREME_TACHY' && e.state === 'raised')).toBe(true);
    for (let i = 0; i + 1 < hh.length; i++) if (hh[i]?.state === 'raised' && hh[i + 1]?.state === 'cleared') expect((hh[i + 1] as { t: number }).t).toBeGreaterThan((hh[i] as { t: number }).t); // 22 zero-length pairs in Ali's case before
  });

  it('a LATCHED alarm suppresses nothing (review ruling 2, [S2] IFU p. 97, 99): after a latched ASYSTOLE (philips-like), a post-ROSC HR 45 raises HR LOW', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    const out: EngineEvent[] = [];
    for (let k = 0; k <= Math.round(30 / TICK); k++) {
      const t = k * TICK;
      if (t >= 10 && k % 67 === 0) { // ROSC at 10 s: 45/min
        observeQrs(inp, t);
        observeEvent(inp, meas(t, { hr: 45 }));
      }
      stepAlarms(s, t, buildConditions(s, inp, t), out);
    }
    expect(s.active.ASYSTOLE).toMatchObject({ latched: true, acked: false });
    expect(s.active.HR_LOW).toMatchObject({ latched: false });
    expect(out.some((e) => e.type === 'alarm' && e.id === 'HR_LOW' && e.state === 'raised')).toBe(true);
  });

  it('agonal beats (R–R ≥ 2.5 s) keep a standing ASYSTOLE, so EXTREME BRADY is not raised on each beat (review ruling 6); two beats closer than that end it', () => {
    for (const skin of ['philips-like', 'mindray-like']) {
      const s = createAlarmMgr(deviceProfile(skin));
      const inp = createInputs();
      const out: EngineEvent[] = [];
      const beatsAt = [12, 16.5, 20, 25.5, 29, 33.5, 37, ...Array.from({ length: 10 }, (_, i) => 42 + 0.8 * i)]; // agonal from 6 s, 75/min from 42 s
      for (let k = 0; k <= Math.round(50 / TICK); k++) {
        const t = k * TICK;
        if (t < 6 && k % 40 === 0) observeQrs(inp, t);
        for (const b of beatsAt) if (Math.abs(t - b) < TICK / 2) {
          observeQrs(inp, t);
          observeQrs(inp, t + 0.12); // the detector fires twice on a wide agonal complex (measured)
          observeEvent(inp, meas(t, { hr: t < 42 ? 13 : 75 }));
        }
        stepAlarms(s, t, buildConditions(s, inp, t), out);
      }
      const raised = (id: string) => out.filter((e) => e.type === 'alarm' && e.id === id && e.state === 'raised').length;
      expect(raised('ASYSTOLE'), skin).toBe(1);
      expect(raised('EXTREME_BRADY') + raised('HR_LOW'), skin).toBe(0);
      expect(s.active.ASYSTOLE?.latched ?? true, skin).toBe(true); // ended by the returning rhythm: latched (philips) or cleared
    }
  });
});

describe('FU-5 conditions: event hold (audit M13)', () => {
  it('a PAUSE alarm stays ≥ 5 s even when its condition lasts one tick', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    applyAlarmAction(s, { device: 'alarm', action: 'arrhythmiaAnalysis', value: true }, 0, []);
    const PAUSE: Condition = { id: 'PAUSE', level: 2, category: 'physiological', text: '**PAUSE', delayS: 0, holdS: 5 };
    run(s, 0, 0.02, () => [PAUSE]);
    run(s, 0.04, 4.9, () => []);
    expect(s.active.PAUSE).toBeDefined();
    run(s, 4.92, 5.1, () => []);
    expect(s.active.PAUSE).toBeUndefined();
  });
});
```

**Modify `packages/engine-core/test/engine/alarms-engine.test.ts`** — find (exactly once):

```ts
  it('age band switch: HR 140 is HIGH for an adult (50–120) and inside the paediatric window (75–160)', () => {
    const { e, ev } = devRig('philips-like');
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 140 }));
    e.advanceTo(20);
    expect(alarmsOf(ev, 'HR_HIGH', 'raised')).toHaveLength(1);
```

replace with:

```ts
  it('age band switch: HR 135 is HIGH for an adult (50–120; FU-5: below the 140 extreme-tachy threshold, which now alarms with arrhythmia analysis off) and inside the paediatric window (75–160)', () => {
    const { e, ev } = devRig('philips-like');
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 135 }));
    e.advanceTo(20);
    // FU-5: the first HR average reads 144 at 3 s — its four beats fall on the respiratory sinus-arrhythmia peak (truth
    // R–R 0.41–0.45 s = 134–145/min around the 135 target; the truth, averaged over the first beats, not a device
    // defect) — so EXTREME TACHY (> 140) is raised at 3 s, held 5 s (EVENT_HOLD_S), and latched by philips-like (#H30)
    // once its condition ends. A latched alarm suppresses nothing (review ruling 2, [S2] IFU p. 97): HR HIGH is raised
    // as soon as EXTREME TACHY's condition has ended, with no acknowledge (8 s in the prototype).
    expect(alarmsOf(ev, 'EXTREME_TACHY', 'raised').map((a) => a.t)).toEqual([3]);
    expect(alarmsOf(ev, 'HR_HIGH', 'raised')).toHaveLength(1);
    expect(alarmsOf(ev, 'HR_HIGH', 'raised')[0]!.t).toBeLessThanOrEqual(10);
```


- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 typecheck
cd packages/engine-core
npx vitest run test/l3/alarms test/engine/alarms-engine.test.ts test/engine/stage3-alarms-engine.test.ts test/engine/resp-airway.test.ts
```

Expected: all pass. fu5-conditions: philips-like leads off → `HR_HIGH` "**Pulse 130>120" from `pr`, zoll-like (ECG
source) none; with `prAbp` 30 the pulse source is the line (EXTREME BRADY); philips-like (arrhythmia OFF) HR 141 →
EXTREME TACHY with HR HIGH suppressed, asystole → ASYSTOLE only, VF → VFIB only; mindray-like HR 150 → HR HIGH, 161 →
EXTREME TACHY; APNEA suppresses RR/EtCO2/awRR LOW; a superseded EXTREME TACHY is cleared (not latched) while VFIB
latches on conversion; HR alternating 141/135 each second for 30 s raises EXTREME TACHY, never HR HIGH while it is
live and no zero-length HR HIGH pair (the suppressor counts the entry live at the previous tick, D6); a latched
ASYSTOLE does not suppress the post-ROSC HR LOW (review ruling 2); agonal beats keep ONE ASYSTOLE on philips- and
mindray-like with no EXTREME BRADY/HR LOW (review ruling 6); PAUSE held ≥ 5 s. `alarms-engine`: VT after VF raises
VTAC at the 5th ventricular beat (the latched VFIB suppresses nothing); the age band: EXTREME TACHY at 3 s, HR HIGH at
8 s, no acknowledge.

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core
git commit -m "FU-5 Task 8: one apnoea one alarm, the alarm chain, extreme rates with arrhythmia off, pulse as HR source, PAUSE hold

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 9: Limit hygiene — the displayed value, one unit of hysteresis, the tile's decimals, no alarm on a questionable value (L3 + mindray-like delay; PROTOTYPED)

Decision D9 (audit M6, M14, Q8). The limit alarms compared the float with the limit and printed the rounded value:
`**CVP 10>10` raised 100 times in 11 min, `**ABPm 70<70`, `**Temp 36<36`, `ART_M_LOW` × 71 in Ali's case. Now the
DISPLAYED value (rounded to the tile's decimals) is compared, an active limit alarm holds until the value is back
inside by one display unit, the text uses the tile's decimals, and a questionable value ("97?") raises no limit
alarm. mindray-like gets its documented 6 s alarm delay ([S4] §10.6.5).

**Files:**
- Modify: `packages/engine-core/src/l3/alarms/{text,conditions}.ts`, `packages/skins/src/data/skins/mindray-like.json`
- Create: `packages/engine-core/test/l3/alarms/fu5-limits.test.ts`
- Modify (tests): `packages/engine-core/test/l3/alarms/text.test.ts` (one case),
  `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts` (R45 re-measure in the title only: the displayed CVP
  10 is not above the limit 10, so the `CVP_M_HIGH` that used to be raised at 27–57 s is not — the assertion "no
  CVP_M_HIGH in 120 s" is unchanged); regenerate the skins snapshot

- [ ] **Step 1: Texts with the tile's decimals; the displayed value and the hysteresis**

**Modify `packages/engine-core/src/l3/alarms/text.ts`** — find (exactly once):

```ts
const fmt = (v: number): string => (Math.abs(v) >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1));

/** Limit alarm text: IEC-style `**HR 130>120`, Saadat-like `HR TOO HIGH` / `%SPO2 LOW`. */
export function limitText(p: DeviceProfile, d: LimitDef, side: 'HIGH' | 'LOW', value: number): string {
  if (p.prefix === 'none') return d.numeric === 'spo2' ? `${d.upper} ${side}` : `${d.upper} TOO ${side}`;
  const lim = side === 'HIGH' ? (d.high as number) : (d.low as number);
  return `${stars(d.level)}${d.label} ${fmt(value)}${side === 'HIGH' ? '>' : '<'}${fmt(lim)}`;
}
```

replace with:

```ts
/**
 * FU-5 (audit M6): decimals of each numeric as its tile shows it (renderer device-ui: TEMP and ST one, the rest none).
 * Limit alarms compare the value ROUNDED to these and print it so ("**Temp 35.9<36.0", never "**Temp 36<36").
 */
export const DISPLAY_DIGITS: Readonly<Partial<Record<NumericId, number>>> = { tempCore: 1, tempSite: 1, stII: 1 };
export const displayDigits = (n: NumericId): number => DISPLAY_DIGITS[n] ?? 0;

/** Limit alarm text: IEC-style `**HR 130>120`, Saadat-like `HR TOO HIGH` / `%SPO2 LOW`. */
export function limitText(p: DeviceProfile, d: LimitDef, side: 'HIGH' | 'LOW', value: number): string {
  if (p.prefix === 'none') return d.numeric === 'spo2' ? `${d.upper} ${side}` : `${d.upper} TOO ${side}`;
  const lim = side === 'HIGH' ? (d.high as number) : (d.low as number);
  const dig = displayDigits(d.numeric);
  return `${stars(d.level)}${d.label} ${value.toFixed(dig)}${side === 'HIGH' ? '>' : '<'}${lim.toFixed(dig)}`;
}
```

**Modify `packages/engine-core/src/l3/alarms/text.ts`** — find (exactly once):

```ts
import type { AlarmLevel } from '../../types-device.ts';
```

replace with:

```ts
import type { AlarmLevel } from '../../types-device.ts';
import type { NumericId } from '../../types.ts';
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
import { fixedText, limitText, type FixedAlarmId } from './text.ts';
```

replace with:

```ts
import { displayDigits, fixedText, limitText, type FixedAlarmId } from './text.ts';
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
function valid(inp: AlarmInputs, id: NumericId, t: number): number | null {
  const m = inp.measured[id];
  if (!m || m.value === null || m.flag === 'invalid') return null;
```

replace with:

```ts
/** FU-5 (audit M14): only a VALID value alarms — a questionable one ("97?", motion, CPR, low perfusion) raises nothing. */
function valid(inp: AlarmInputs, id: NumericId, t: number): number | null {
  const m = inp.measured[id];
  if (!m || m.value === null || m.flag !== 'valid') return null;
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
    const dd = src === d.numeric ? d : { ...d, label: 'Pulse', upper: 'PR' }; // "**Pulse 130>120" / "PR TOO HIGH"
    if (l.high !== null && v > l.high) out.push({ id: `${key}_HIGH`, text: limitText(p, dd, 'HIGH', v), ...c });
    if (l.low !== null && v < l.low) out.push({ id: `${key}_LOW`, text: limitText(p, dd, 'LOW', v), ...c });
```

replace with:

```ts
    const dd = src === d.numeric ? d : { ...d, label: 'Pulse', upper: 'PR' }; // "**Pulse 130>120" / "PR TOO HIGH"
    // FU-5 (audit M6): the DISPLAYED value against the limit, with one display unit of hysteresis — raised once it is
    // beyond the limit, kept until it is back inside by a full unit (CVP hovering 9.6–10.4 at a limit of 10 raised
    // `**CVP 10>10` 100 times in 11 min) [ENG, the vendors' hysteresis is not published]
    const unit = 10 ** -displayDigits(d.numeric);
    const dv = Math.round(v / unit) * unit;
    const hi = `${key}_HIGH`;
    const lo = `${key}_LOW`;
    if (l.high !== null && (dv > l.high + 1e-9 || (holdingId(s, hi) && dv > l.high - unit + 1e-9))) out.push({ id: hi, text: limitText(p, dd, 'HIGH', dv), ...c });
    if (l.low !== null && (dv < l.low - 1e-9 || (holdingId(s, lo) && dv < l.low + unit - 1e-9))) out.push({ id: lo, text: limitText(p, dd, 'LOW', dv), ...c });
```


- [ ] **Step 2: mindray-like's alarm delay**

**Modify `packages/skins/src/data/skins/mindray-like.json`** — find (exactly once):

```json
    "latching": { "visual": "off", "audible": "off" }
  },
```

replace with:

```json
    "latching": { "visual": "off", "audible": "off" },
    "delayS": 6
  },
```

**Modify `packages/skins/src/data/skins/mindray-like.json`** — find (exactly once):

```json
    "alarms.latching": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual §39.4.3 (latching per priority, default Unselected = non-latching)" },
```

replace with:

```json
    "alarms.latching": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual §39.4.3 (latching per priority, default Unselected = non-latching)" },
    "alarms.delayS": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual §10.6.5, §39.4.6 (Alarm Delay 6 s for continuously measured parameters; not applied to apnoea and ST)", "note": "FU-5 (audit M6): the engine applies it to every limit alarm except SpO2 (spo2DelayS)" },
```


- [ ] **Step 3: Tests**

**Modify `packages/engine-core/test/l3/alarms/text.test.ts`** — find (exactly once):

```ts
    expect(fixedText(ph, 'ecgLeadsOff', 3, true)).toBe('ECG LEADS OFF');
  });
```

replace with:

```ts
    expect(fixedText(ph, 'ecgLeadsOff', 3, true)).toBe('ECG LEADS OFF');
  });
  it("FU-5 (audit M6): the tile's decimals — temperature one ('**Temp 35.9<36.0', was '**Temp 36<36'), pressures none", () => {
    expect(limitText(ph, ph.limits.TEMP!, 'LOW', 35.9)).toBe('**Temp 35.9<36.0');
    expect(limitText(ph, ph.limits.CVP_M!, 'HIGH', 11)).toBe('**CVP 11>10');
  });
```

**Create `packages/engine-core/test/l3/alarms/fu5-limits.test.ts`:**

```ts
// FU-5 limit hygiene (research/10 audit M6, M14; suite item 11): displayed value, one display unit of hysteresis, no
// alarm on a questionable value. The manager stepped at the engine's 20 ms tick with conditions from buildConditions.
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs } from '../../../src/l3/alarms/conditions.ts';
import { createAlarmMgr, stepAlarms } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const TICK = 0.02;
const m = (t: number, values: Record<string, number>, flag: 'valid' | 'questionable' = 'valid'): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, flag, at: t }])),
});

describe('FU-5 limit hygiene (suite 11)', () => {
  it('CVP at a limit of 10: hovering 9.6–10.4 raises nothing (the float compare raised `**CVP 10>10` 100× in 11 min); one excursion to 10.6 raises once ("**CVP 11>10") and the alarm holds through the hover until 9.4', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    const out: EngineEvent[] = [];
    const cvp = (t: number) => (t >= 60 && t < 65 ? 10.6 : t >= 110 ? 9.4 : 10 + 0.4 * Math.sin(t / 3));
    for (let k = 0; k <= 120 / TICK; k++) {
      const t = k * TICK;
      if (k % 50 === 0) {
        observeQrs(inp, t);
        observeEvent(inp, m(t, { cvpMean: cvp(t) }));
      }
      stepAlarms(s, t, buildConditions(s, inp, t), out);
    }
    const ev = out.filter((e): e is Extract<EngineEvent, { type: 'alarm' }> => e.type === 'alarm' && e.id === 'CVP_M_HIGH');
    expect(ev.map((e) => [e.state, Math.round(e.t)])).toEqual([['raised', 60], ['cleared', 110]]);
    expect(ev[0]?.text).toBe('**CVP 11>10');
  });

  it('a questionable SpO2 ("85?") raises neither the limit alarm nor DESAT', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, m(10, { spo2: 70 }, 'questionable'));
    expect(buildConditions(s, inp, 10).map((c) => c.id)).toEqual([]);
  });
});
```

**Modify `packages/engine-core/test/engine/circ-manual-cvp-peep.test.ts`** — find (exactly once):

```ts
max < 9.5 and no CVP_M_HIGH in 120 s (measured max 10.17, raises at 27–57 s)',
```

replace with:

```ts
max < 9.5 and no CVP_M_HIGH in 120 s (measured max 10.17; FU-5: no raise since the displayed 10 is not above the limit — was 27–57 s)',
```


- [ ] **Step 4: Run**

```bash
npx -y pnpm@9.15.9 typecheck
(cd packages/skins && npx vitest run -u)
cd packages/engine-core
npx vitest run test/l3/alarms test/engine/alarms-engine.test.ts test/engine/stage3-alarms-engine.test.ts
npx vitest run test/engine/circ-manual-cvp-peep.test.ts        # SLOW set
```

Expected: all pass. fu5-limits: CVP hovering 9.6–10.4 at a limit of 10 for 120 s raises nothing; one 5 s excursion to
10.6 raises once, "**CVP 11>10", held through the hover and cleared at 110 s (9.4); a questionable SpO2 70 raises
neither `SpO2_LOW` nor DESAT. text: "**Temp 35.9<36.0", "**CVP 11>10". `alarms-engine` "raises **HR at the first
displayed value over the limit (no added delay)" passes unchanged (the HR is an integer).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core packages/skins
git commit -m "FU-5 Task 9: limit alarms on the displayed value with one-unit hysteresis, the tile's decimals; mindray-like 6 s delay

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 10: Technical alarms raised by real conditions — SpO2 NON-PULSAT. / LOW PERF, ABP NON-PULSATILE / DISCONNECT / ZEROING, TEMP probe off, CO2 OCCLUSION (L3 + E-FU5-3, E-FU5-6; PROTOTYPED)

Decision D10 (audit M8, Q11). The brief's INOPs had no implementation (the `co2Line` condition had no emitter). The
device layer now receives the arterial transducer and temperature probe states; the conditions raise the vendors'
technical alarms (texts per skin in `text.ts`) and mark the numeric they replace (`Condition.numeric`), so the tile
can draw the INOP glyph (Task 11). While a zero runs, the arterial line publishes no numerics (it reads the atmosphere).

**Files:**
- Modify: `packages/engine-core/src/l3/alarms/{text,conditions}.ts`, `packages/engine-core/src/l3/device-layer.ts`,
  `packages/engine-core/src/engine.ts` (E-FU5-6: the host's `abp`, `temp`), `packages/engine-core/src/l2/hemo/pipeline.ts`
  (E-FU5-3: no ABP numerics while zeroing)
- Create: `packages/engine-core/test/l3/alarms/fu5-technical.test.ts`
- Modify (tests): `packages/engine-core/test/l3/alarms/stage3-hooks.test.ts` (R45 re-statement: philips-like's CO2
  line text is the IntelliVue "CO2 OCCLUSION", was the inferred "CO2 LINE")

- [ ] **Step 1: The ids and the vendors' texts**

**Modify `packages/engine-core/src/l3/alarms/text.ts`** — find (exactly once):

```ts
  | 'ecgLeadsOff' | 'spo2SensorOff' | 'nibp-failed' | 'apnoea-co2' | 'apnoea-resp' | 'co2Line';
```

replace with:

```ts
  | 'ecgLeadsOff' | 'spo2SensorOff' | 'nibp-failed' | 'apnoea-co2' | 'apnoea-resp' | 'co2Line'
  // FU-5 (audit M8): technical alarms raised by real conditions, and the arterial line's disconnect alarm
  | 'spo2NonPulsatile' | 'spo2LowPerf' | 'abpNonPulsatile' | 'abpDisconnect' | 'abpZero' | 'tempProbeOff';
```

**Modify `packages/engine-core/src/l3/alarms/text.ts`** — find (exactly once):

```ts
  co2Line: 'CO2 LINE', // brief §6.4 technical INOP "CO2 line" [inferred text]
};
```

replace with:

```ts
  co2Line: 'CO2 OCCLUSION', // brief §6.4 INOP "CO2 line"; FU-5: the Philips text ([S2] IFU p. 53)
  spo2NonPulsatile: 'SpO2 NON-PULSAT.', // [S2] IFU p. 59
  spo2LowPerf: 'SpO2 LOW PERF', // [S2] IFU p. 58
  abpNonPulsatile: 'ABP NON-PULSATILE', // [S2] IFU p. 57
  abpDisconnect: 'ABP DISCONNECT', // [S2] IFU p. 44 (red: non-pulsatile, mean < 10 mmHg)
  abpZero: 'ABP ZEROING', // brief §6.4 INOP "ABP zeroing" [inferred text]
  tempProbeOff: 'TEMP NO TRANSDUCER', // [S2] IFU p. 62 "<Temp label> NO TRANSDUCER"
};
```

**Modify `packages/engine-core/src/l3/alarms/text.ts`** — find (exactly once):

```ts
  co2Line: 'CO2 CHECK LINE', // [inferred] from the "ECG CHECK LA/RA/LL" pattern
};
```

replace with:

```ts
  co2Line: 'CO2 CHECK LINE', // [inferred] from the "ECG CHECK LA/RA/LL" pattern
  spo2NonPulsatile: 'SPO2 NO PULSE', // [inferred] brief §4.3 "NO PULSE"
  spo2LowPerf: 'SPO2 LOW PERFUSION', // research/06 §4.2 (M p.109–116)
  abpNonPulsatile: 'IBP1 STATIC PRESSURE', // research/06 §4.2, §4.1 (static pressure: SYS/DIA hidden, mean shown)
  abpDisconnect: 'IBP CATHETER DISCONNECT', // research/06 §4.2 (M p.161)
  abpZero: 'IBP1 ZEROING', // [inferred] from the "IBP1 …" pattern
  tempProbeOff: 'TEMP NO CABLE', // [inferred] from "SPO2 NO CABLE" / "ECG NO CABLE" (research/06 §4.2)
};
```


- [ ] **Step 2: The conditions and their inputs**

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
import type { EngineEvent, Measured, NumericId } from '../../types.ts';
```

replace with:

```ts
import type { EngineEvent, Measured, NumericId } from '../../types.ts';
import type { LineSensorState } from '../../types-hemo.ts';
import { LOW_PERF_PI } from '../spo2/spo2.ts';
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
/** FU-5 (audit M13): an event arrhythmia alarm (PAUSE) stays at least this long once raised [ENG]. */
export const EVENT_HOLD_S = 5;
```

replace with:

```ts
/** FU-5 (audit M13): an event arrhythmia alarm (PAUSE) stays at least this long once raised [ENG]. */
export const EVENT_HOLD_S = 5;
/** FU-5: the oximeter is still acquiring (averaging window + update) this long after its probe went on [ENG]. */
export const SPO2_SEARCH_S = 15;
/**
 * FU-5: LOW PERF is raised once PI < 0.3 (LOW_PERF_PI: "below 0.3 is marginal", research/05 §6 [S2] IFU p. 120) has held
 * this long, and cleared at PI ≥ LOW_PERF_CLEAR_PI or after this long at PI ≥ 0.3 (PI hovering at 0.3 flickered the
 * INOP 7 times in the 3 L bleed) [ENG].
 */
export const LOW_PERF_DELAY_S = 5;
export const LOW_PERF_CLEAR_PI = 0.4;
/** FU-5: SpO2 NON-PULSAT. clears only after a valid SpO2 for this long [ENG]. */
export const NONPULS_CLEAR_S = 2;
/** FU-5: an arterial pressure non-pulsatile with a mean below this is a disconnection ([S2] IFU p. 44: 10 mmHg). */
export const DISCONNECT_MMHG = 10;
/** FU-5: "continuously less than 10 mmHg" ([S2] p. 44) — for this long [ENG]. */
export const DISCONNECT_DELAY_S = 5;
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  /** FU-5: the capnograph's state — while 'on' it is the respiratory (apnoea) source, else the impedance. */
  co2: 'off' | 'warmup' | 'on' | 'occluded';
}
```

replace with:

```ts
  /** FU-5: the capnograph's state — while 'on' it is the respiratory (apnoea) source, else the impedance. */
  co2: 'off' | 'warmup' | 'on' | 'occluded';
  /** FU-5: the arterial line's transducer state ('zeroing' also while a zero is running). */
  abp: LineSensorState;
  /** FU-5: temperature probe state, and whether it was ever on (a probe never attached raises nothing). */
  temp: 'off' | 'on';
  tempSeen: boolean;
  /** FU-5: when the SpO2 probe last went on (s): the oximeter acquires for SPO2_SEARCH_S before an INOP. */
  spo2OnSince: number;
  /** FU-5: since when PI has been ≥ LOW_PERF_PI / the SpO2 not invalid (the INOPs' clear hysteresis); null = not now. */
  piOkSince?: number | null;
  spo2OkSince?: number | null;
}
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
    apnoeaFlags: [], co2Line: false, co2: 'on',
  };
```

replace with:

```ts
    apnoeaFlags: [], co2Line: false, co2: 'on', abp: 'none', temp: 'on', tempSeen: false, spo2OnSince: t0,
  };
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  if (inp.co2Line) out.push(fixed('co2Line', 3, 'technical'));
  if (inp.spo2Probe === 'off') out.push(fixed('spo2SensorOff', 3, 'technical'));
```

replace with:

```ts
  if (inp.co2Line || inp.co2 === 'occluded') out.push({ ...fixed('co2Line', 3, 'technical'), numeric: 'etco2' });
  if (inp.spo2Probe === 'off') out.push(fixed('spo2SensorOff', 3, 'technical'));
  // FU-5 (audit M8): the technical alarms real monitors raise from the signals themselves ([S2] IFU p. 44, 53–61;
  // research/06 §4.2); `numeric` marks the value the INOP replaces ("-?-") in the tile
  if (inp.spo2Probe === 'on' && t - inp.spo2OnSince >= SPO2_SEARCH_S) {
    const m = inp.measured.spo2;
    const pi = inp.measured.pi;
    // clear hysteresis (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5; review F7): NON-PULSAT. holds until
    // the SpO2 has been valid NONPULS_CLEAR_S; LOW PERF until PI ≥ LOW_PERF_CLEAR_PI, or ≥ LOW_PERF_PI for
    // LOW_PERF_DELAY_S — and through a PI that is momentarily invalid (no fresh pulse for a few seconds) while the SpO2
    // is still shown [ENG]: LOW PERF was raised/cleared 7 times in 1–2 s cycles at the end of the 3 L bleed
    const okFor = (since: number | null | undefined, s0: number) => since !== null && since !== undefined && t - since >= s0;
    const nonPuls = (m !== undefined && m.flag === 'invalid') || (holdingId(s, 'spo2NonPulsatile') && !okFor(inp.spo2OkSince, NONPULS_CLEAR_S));
    const piV = pi && pi.value !== null && pi.flag !== 'invalid' ? pi.value : null;
    const lowPerf = piV !== null ? piV < LOW_PERF_PI || (holdingId(s, 'spo2LowPerf') && piV < LOW_PERF_CLEAR_PI && !okFor(inp.piOkSince, LOW_PERF_DELAY_S)) : holdingId(s, 'spo2LowPerf');
    if (nonPuls) out.push({ ...fixed('spo2NonPulsatile', 3, 'technical'), numeric: 'spo2' });
    else if (lowPerf) out.push({ ...fixed('spo2LowPerf', 3, 'technical', LOW_PERF_DELAY_S), numeric: 'spo2' });
  }
  if (inp.abp === 'zeroing') out.push({ ...fixed('abpZero', 3, 'technical'), numeric: 'abpMean' });
  else if (inp.abp !== 'none') {
    const mean = valid(inp, 'abpMean', t);
    const keep = p.ibpStaticDisplay === 'keep';
    if (mean !== null && (inp.measured.abpSys?.flag === 'invalid' || inp.measured.prAbp?.flag === 'invalid')) {
      // a static pressure (the non-pulsatile rule, pressure-numerics): the INOP marks the pulse ('keep': S/D/M stay,
      // [S2] p. 57 "Pulse numeric is displayed with -?-") or the hidden S/D ('mean-only', Saadat); the red disconnect
      // below 10 mmHg where the skin has it on (saadat-like: OFF by default, research/06 §4.1). The engine raises the
      // INOP whatever the pulse source [ENG]; an IntelliVue raises it only for the pressure selected as the pulse source
      out.push({ ...fixed('abpNonPulsatile', 3, 'technical'), numeric: keep ? 'prAbp' : 'abpSys' });
      if (p.abpDisconnect && mean < DISCONNECT_MMHG) out.push({ ...fixed('abpDisconnect', 1, 'physiological', DISCONNECT_DELAY_S), numeric: 'abpMean' });
    }
  }
  if (inp.temp === 'off' && inp.tempSeen) out.push({ ...fixed('tempProbeOff', 3, 'technical'), numeric: 'tempCore' });
```

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
  'apnoea-resp': ['RR_LOW', 'AWRR_LOW'],
};
```

replace with:

```ts
  'apnoea-resp': ['RR_LOW', 'AWRR_LOW'],
  abpDisconnect: ['ART_S_LOW', 'ART_M_LOW', 'ART_D_LOW'],
};
```

**Modify `packages/engine-core/src/l3/device-layer.ts`** — find (exactly once):

```ts
  /** FU-5: the capnograph's sensor state (the apnoea source while 'on'). */
  co2: 'off' | 'warmup' | 'on' | 'occluded';
```

replace with:

```ts
  /** FU-5: the capnograph's sensor state (the apnoea source while 'on'). */
  co2: 'off' | 'warmup' | 'on' | 'occluded';
  /** FU-5: the arterial transducer ('zeroing' while a zero runs) and the temperature probe. */
  abp: LineSensorState;
  temp: 'off' | 'on';
```

**Modify `packages/engine-core/src/l3/device-layer.ts`** — find (exactly once):

```ts
import type { AgeBand, DeviceClinicalEvent } from '../types-device.ts';
```

replace with:

```ts
import type { AgeBand, DeviceClinicalEvent } from '../types-device.ts';
import type { LineSensorState } from '../types-hemo.ts';
```

**Modify `packages/engine-core/src/l3/device-layer.ts`** — find (exactly once):

```ts
  inp.spo2Probe = host.spo2Probe;
  inp.co2 = host.co2;
```

replace with:

```ts
  if (inp.spo2Probe === 'off' && host.spo2Probe !== 'off') inp.spo2OnSince = t; // FU-5: the oximeter starts acquiring
  inp.spo2Probe = host.spo2Probe;
  inp.co2 = host.co2;
  inp.abp = host.abp;
  inp.temp = host.temp;
  if (host.temp === 'on') inp.tempSeen = true;
```

**Modify `packages/engine-core/src/engine.ts`** — find (exactly once):

```ts
      co2: ps.resp.co2Sensor, // FU-5
```

replace with:

```ts
      co2: ps.resp.co2Sensor, // FU-5
      abp: ps.hemo.lines.abp.sensor === 'connected' && simT < ps.hemo.lines.abp.zeroUntil ? 'zeroing' : ps.hemo.lines.abp.sensor,
      temp: ps.resp.tempSensor,
```


The INOPs' clear hysteresis needs the times since PI and the SpO2 were last acceptable (review ruling 5, D10):

**Modify `packages/engine-core/src/l3/alarms/conditions.ts`** — find (exactly once):

```ts
    for (const [k, m] of Object.entries(e.values)) if (m) inp.measured[k as NumericId] = m;
```

replace with:

```ts
    for (const [k, m] of Object.entries(e.values)) if (m) inp.measured[k as NumericId] = m;
    const pi = e.values.pi;
    if (pi) inp.piOkSince = pi.value !== null && pi.flag !== 'invalid' && pi.value >= LOW_PERF_PI ? (inp.piOkSince ?? e.t) : null;
    const sp = e.values.spo2;
    if (sp) inp.spo2OkSince = sp.flag !== 'invalid' ? (inp.spo2OkSince ?? e.t) : null;
```

- [ ] **Step 3: No arterial numerics while a zero runs (E-FU5-3)**

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** — find (exactly once):

```ts
  if (lineActive(hs.lines.abp)) {
    const p = pressureNumerics(hs.num.abp, t);
```

replace with:

```ts
  if (lineActive(hs.lines.abp)) {
    // FU-5 (audit M8): a zero in progress measures the atmosphere — no numerics, the ABP ZEROING INOP instead
    const zeroing = hs.lines.abp.sensor === 'zeroing' || t < hs.lines.abp.zeroUntil;
    const none: Measured = { value: null, flag: 'invalid', at: t };
    const p = zeroing ? { sys: none, dia: none, mean: none, pulsatile: false } : pressureNumerics(hs.num.abp, t);
```


- [ ] **Step 4: Tests**

**Modify `packages/engine-core/test/l3/alarms/stage3-hooks.test.ts`** — find (exactly once):

```ts
    for (const [skin, text] of [['philips-like', 'CO2 LINE'], ['saadat-like', 'CO2 CHECK LINE']] as const) {
```

replace with:

```ts
    for (const [skin, text] of [['philips-like', 'CO2 OCCLUSION'], ['saadat-like', 'CO2 CHECK LINE']] as const) { // FU-5: the Philips text ([S2] p. 53)
```

**Create `packages/engine-core/test/l3/alarms/fu5-technical.test.ts`:**

```ts
// FU-5 technical alarms raised by real conditions (research/10 audit M8; [S2] Philips IntelliVue IFU p. 44, 53–61;
// research/06 §4.2). Synthetic inputs as the engine publishes them.
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs, SPO2_SEARCH_S } from '../../../src/l3/alarms/conditions.ts';
import { createAlarmMgr, stepAlarms } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent, Measured } from '../../../src/types.ts';

const meas = (t: number, values: Record<string, Partial<Measured>>): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: null, flag: 'valid', at: t, ...v }])),
});
const tech = (skin: string, inp: ReturnType<typeof createInputs>, t: number) =>
  buildConditions(createAlarmMgr(deviceProfile(skin)), inp, t).filter((c) => !c.suppressed).map((c) => [c.id, c.text, c.numeric ?? null]);

describe('FU-5 technical alarms (audit M8)', () => {
  it('SpO2: no pulse → NON-PULSAT. (after the acquisition time); PI < 0.3 → LOW PERF; both replace/mark the SpO2 numeric', () => {
    const inp = createInputs();
    observeQrs(inp, 29.9);
    observeEvent(inp, meas(10, { spo2: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 10)).toEqual([]); // still acquiring
    observeEvent(inp, meas(SPO2_SEARCH_S + 15, { spo2: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 30)).toEqual([['spo2NonPulsatile', 'SpO2 NON-PULSAT.', 'spo2']]);
    expect(tech('saadat-like', inp, 30)).toEqual([['spo2NonPulsatile', 'SPO2 NO PULSE', 'spo2']]);
    observeEvent(inp, meas(30, { spo2: { value: 97, flag: 'questionable' }, pi: { value: 0.12 } }));
    expect(tech('philips-like', inp, 30)).toEqual([['spo2LowPerf', 'SpO2 LOW PERF', 'spo2']]);
    expect(tech('saadat-like', inp, 30)).toEqual([['spo2LowPerf', 'SPO2 LOW PERFUSION', 'spo2']]);
  });

  it('ABP: a static pressure → NON-PULSATILE (philips-like keeps S/D/M and marks the pulse, saadat-like shows the mean only — review ruling 3); mean < 10 → ***ABP DISCONNECT (red) and no ABP LOW where the skin has the disconnect alarm on (saadat-like OFF by default, research/06 §4.1 — review ruling 5); zeroing → ABP ZEROING', () => {
    const inp = createInputs();
    observeQrs(inp, 29.9);
    inp.abp = 'connected';
    // philips-like ('keep', [S2] IFU p. 57): the flat line's S/D/M stay valid, only the pulse (prAbp) is invalid
    observeEvent(inp, meas(30, { abpSys: { value: 21 }, abpDia: { value: 19 }, abpMean: { value: 20 }, prAbp: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 30)).toEqual([
      ['ART_S_LOW', '**ABPs 21<90', 'abpSys'], ['ART_M_LOW', '**ABPm 20<70', 'abpMean'], ['ART_D_LOW', '**ABPd 19<50', 'abpDia'],
      ['abpNonPulsatile', 'ABP NON-PULSATILE', 'prAbp'],
    ]);
    observeEvent(inp, meas(31, { abpSys: { value: 3 }, abpDia: { value: 1 }, abpMean: { value: 2 }, prAbp: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 31)).toEqual([['abpNonPulsatile', 'ABP NON-PULSATILE', 'prAbp'], ['abpDisconnect', '***ABP DISCONNECT', 'abpMean']]);
    // saadat-like ('mean-only', research/06 §4.1): S/D invalid, the mean shown; the catheter-disconnect alarm is OFF
    observeEvent(inp, meas(32, { abpSys: { flag: 'invalid' }, abpDia: { flag: 'invalid' }, abpMean: { value: 2 }, prAbp: { flag: 'invalid' } }));
    expect(tech('saadat-like', inp, 32)).toEqual([['abpNonPulsatile', 'IBP1 STATIC PRESSURE', 'abpSys']]);
    inp.abp = 'zeroing';
    observeEvent(inp, meas(33, { abpSys: { flag: 'invalid' }, abpDia: { flag: 'invalid' }, abpMean: { flag: 'invalid' } }));
    expect(tech('philips-like', inp, 33)).toEqual([['abpZero', 'ABP ZEROING', 'abpMean']]);
  });

  it('LOW PERF / NON-PULSAT. clear hysteresis (review ruling 5, F7): PI hovering 0.28 ↔ 0.35 or momentarily invalid keeps ONE LOW PERF until PI ≥ 0.4; NON-PULSAT. clears only after 2 s of a valid SpO2', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    const out: EngineEvent[] = [];
    const pis = (t: number) => (t < 40 ? (Math.floor(t) % 2 ? 0.28 : 0.35) : t < 44 ? null : t < 50 ? 0.29 : 0.45); // 0.28/0.35, then 4 s of no PI, then 0.29, then 0.45
    for (let k = 0; k <= 60 / 0.02; k++) {
      const t = k * 0.02;
      if (k % 25 === 0) observeQrs(inp, t);
      if (k % 50 === 0) {
        const pi = pis(t);
        observeEvent(inp, meas(t, { spo2: { value: 97, flag: pi !== null && pi < 0.3 ? 'questionable' : 'valid' }, pi: pi === null ? { flag: 'invalid' } : { value: pi } }));
      }
      stepAlarms(s, t, buildConditions(s, inp, t), out);
    }
    const ev = out.filter((e) => e.type === 'alarm' && e.id === 'spo2LowPerf') as Array<Extract<EngineEvent, { type: 'alarm' }>>;
    expect(ev.map((e) => e.state)).toEqual(['raised', 'cleared']);
    expect(ev[1]!.t).toBeGreaterThanOrEqual(50); // cleared only once PI ≥ 0.4
    const s2 = createAlarmMgr(deviceProfile('philips-like'));
    const inp2 = createInputs();
    const out2: EngineEvent[] = [];
    for (let k = 0; k <= 40 / 0.02; k++) {
      const t = k * 0.02;
      if (k % 25 === 0) observeQrs(inp2, t);
      if (k % 50 === 0) observeEvent(inp2, meas(t, { spo2: t < 20 || (t >= 25 && t < 26) ? { flag: 'invalid' } : { value: 97 }, pi: { value: 1.5 } }));
      stepAlarms(s2, t, buildConditions(s2, inp2, t), out2);
    }
    const np = out2.filter((e) => e.type === 'alarm' && e.id === 'spo2NonPulsatile') as Array<Extract<EngineEvent, { type: 'alarm' }>>;
    expect(np.map((e) => [e.state, Math.round(e.t)])).toEqual([['raised', 15], ['cleared', 22], ['raised', 25], ['cleared', 28]]);
  });

  it('temperature probe off after it was on → TEMP NO TRANSDUCER; a probe never attached raises nothing; CO2 occluded → CO2 OCCLUSION', () => {
    const inp = createInputs();
    observeQrs(inp, 9.9);
    inp.temp = 'off';
    expect(tech('philips-like', inp, 10)).toEqual([]);
    inp.tempSeen = true;
    expect(tech('philips-like', inp, 10)).toEqual([['tempProbeOff', 'TEMP NO TRANSDUCER', 'tempCore']]);
    inp.temp = 'on';
    inp.co2 = 'occluded';
    expect(tech('philips-like', inp, 10)).toEqual([['co2Line', 'CO2 OCCLUSION', 'etco2']]);
  });
});
```


- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 typecheck
cd packages/engine-core
npx vitest run test/l3/alarms test/engine/alarms-engine.test.ts test/engine/hemo-engine.test.ts test/engine/stage3-alarms-engine.test.ts
npx -y pnpm@9.15.9 --dir ../.. audit:monitor G2 A5 > <scratchpad>/fu-5-monitor-fidelity/t10.txt && sed -n '/## Fidelity report/,$p' <scratchpad>/fu-5-monitor-fidelity/t10.txt | grep -E "G2|A5-pea:"
```

Expected: all pass. fu5-technical: NON-PULSAT. only after the 15 s acquisition; LOW PERF at PI 0.12; ABP static
philips-like 21/19 (20) → ABPs/ABPm/ABPd LOW + NON-PULSATILE marking `prAbp` (S/D/M kept), 3/1 (2) → NON-PULSATILE +
***ABP DISCONNECT (ABP LOW suppressed); saadat-like mean 2 → "IBP1 STATIC PRESSURE" only (its catheter-disconnect
alarm is OFF by default, research/06 §4.1); zeroing → ABP ZEROING only; TEMP NO TRANSDUCER only after the probe
was on; `co2: 'occluded'` → CO2 OCCLUSION. Harness: `G2-probes: temp off (45 s) {tempProbeOff}; ART zeroing (72 s)
{abpZero}; ART atmosphere (105 s) {abpDisconnect abpNonPulsatile}; CO2 occluded (145 s) {… co2Line}` (was `{-}`,
`{ART_D_HIGH}`, three ART LOW alarms, `{-}`); `A5-pea … ART INOP yes` (was no).

- [ ] **Step 6: Commit**

```bash
git add packages/engine-core
git commit -m "FU-5 Task 10: technical alarms from real conditions (SpO2 non-pulsatile/low perf, ABP non-pulsatile/disconnect/zeroing, temp probe off, CO2 occlusion)

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 11: Tiles — "97?", the INOP glyph, the HR tile on leads off, the NIBP failure glyph, the skin's extras; skin settings wired or removed (renderer + skins; PROTOTYPED)

Decisions D8 (tile side), D10 (INOP glyph), D14 (audit M1, M3, M11, M12), D19 (the glossary labels). research/11 §4 item 7 lists the same declared-never-drawn extras — PPV, T2/ΔT, BS%,
SQI, EMG, PACE, ST, PVCs, FiCO2 — and after this task each one is either drawn from an engine numeric (T2 `tempSite`,
ΔT derived, ST-II `stII`, BS% = SR `sr` via FU-3's BFA formatter) or removed with a CONTRACT note (PPV, SQI, EMG,
PACE, PVCs); FiCO2 is only a saadat-like LIMIT key (`FiCO2_pctV_high`) and no DeviceUI tile declares it — the
computed-but-untiled numerics (`imco2`, `mac`, `etAa`, `tempSite` as its own tile, `qtc`, research/11 §4 item 8) are
Stage 9's. The DeviceUI printed a questionable value as
a plain number (the engine's "99?" in CPR and low perfusion reached the screen as "99"), had no INOP glyph, showed HR
"0" with the leads off, hard-coded "PR … PI …" on the SpO2 tile only and ignored every other declared extra. Now:
`text()` appends `glyphs.questionable` and draws `glyphs.inop` when a technical alarm marks the numeric; the HR tile
follows the skin's HR source; a failed NIBP shows `glyphs.nibpFail`; tile extras are drawn from the skin; an INOP
does not flash the numeric. Declared settings nothing can draw are removed with a CONTRACT note.

**Files:**
- Modify: `packages/renderer/src/{device-ui,alarm-view}.ts`
- Modify: `packages/skins/src/{types,schema}.ts`, `packages/skins/src/data/base/iec-defaults.json`,
  `packages/skins/src/data/skins/{philips-like,saadat-like}.json`, `packages/skins/CONTRACT.md`; regenerate the snapshot
- Create: `packages/renderer/test/fu5-tiles.test.ts`

- [ ] **Step 1: The DeviceUI tiles**

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
const BELL_OFF_SVG =
```

replace with:

```ts
/** FU-5: skin `hr.autoPriority` entries → the pulse numeric each publishes (engine profile.ts PULSE_SOURCE). */
const PULSE_SOURCE: Readonly<Record<string, NumericId>> = { ART: 'prAbp', IBP1: 'prAbp', SpO2: 'pr' };
const BELL_OFF_SVG =
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
interface Tile {
  spec: TileSpec;
  el: HTMLDivElement;
```

replace with:

```ts
interface Tile {
  spec: TileSpec;
  el: HTMLDivElement;
  label: HTMLSpanElement;
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
  private nibpEv: NibpEvent | undefined;
```

replace with:

```ts
  private nibpEv: NibpEvent | undefined;
  private nibpPr: number | null = null; // FU-5: the cuff's pulse rate (the NIBP tile's PR extra)
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
        el.innerHTML = `<div class="h"><span>${spec.param}</span>
```

replace with:

```ts
        el.innerHTML = `<div class="h"><span data-pme="lbl">${spec.param}</span>
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
        this.tileList.push({ spec, el, value: v, sub:
```

replace with:

```ts
        this.tileList.push({ spec, el, label: el.querySelector('[data-pme="lbl"]') as HTMLSpanElement, value: v, sub:
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
    } else if (e.type === 'nibp') this.nibpEv = e;
```

replace with:

```ts
    } else if (e.type === 'nibp') {
      this.nibpEv = e;
      if (e.result) this.nibpPr = e.result.pr;
    }
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
  private text(m: Measured | undefined, digits = 0): string {
    return m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : this.r.skin.glyphs.noValue;
  }
```

replace with:

```ts
  /**
   * A numeric as the tile prints it. FU-5 (audit M1, M8): a questionable value carries the skin's mark ("97?", brief
   * §4.3, research/06 §3.2); an invalid one whose technical alarm is active shows the skin's INOP glyph ("-?-", [S2]
   * IFU p. 55–62); otherwise the no-value dashes.
   */
  private text(m: Measured | undefined, digits = 0, id?: NumericId): string {
    const g = this.r.skin.glyphs;
    if (m && m.value !== null && m.flag !== 'invalid') return m.value.toFixed(digits) + (m.flag === 'questionable' ? g.questionable : '');
    return id !== undefined && this.status?.active.some((a) => a.category === 'technical' && a.numeric === id) ? g.inop : g.noValue;
  }

  /**
   * FU-5 (audit M3): the HR tile. The ECG rate; with the leads off an AUTO skin that relabels shows the first valid pulse
   * of its priority list under that label (saadat-like "PR", research/06 §4.1); otherwise the skin's HR-unavailable
   * glyph (philips-like "-?-", [S2] IFU p. 55 — the pulse stays in its own tile). Never a "0".
   */
  private hrTile(): { main: string; label: string } {
    const g = this.r.skin.glyphs;
    if (this.dev?.hrDashes) return { main: g.hrUnavailable, label: 'HR' };
    const hr = this.values.hr;
    if (hr && hr.value !== null && hr.flag !== 'invalid') return { main: this.text(hr), label: 'HR' };
    if (!this.status?.active.some((a) => a.id === 'ecgLeadsOff')) return { main: g.noValue, label: 'HR' };
    const h = this.r.skin.hr;
    if (h.source === 'AUTO' && h.relabelNonEcgAs) {
      for (const k of h.autoPriority) {
        const src = PULSE_SOURCE[k];
        const m = src ? this.values[src] : undefined;
        if (m && m.value !== null && m.flag === 'valid') return { main: this.text(m), label: h.relabelNonEcgAs };
      }
    }
    return { main: g.hrUnavailable, label: 'HR' };
  }

  /**
   * FU-5 (audit M11): the skin's tile extras ("PR 76", "PI 1.6", "awRR 12", "T2 36.4", "ΔT 0.4", "ST-II -0.1"). MEAN is the
   * pressure tiles' own sub-line and NMT/BFA extras are drawn by their formatters (FU-3).
   */
  private extras(spec: TileSpec): string {
    const v = this.values;
    const out: string[] = [];
    for (const x of spec.extras ?? []) {
      if (x === 'PR' && spec.param === 'NIBP') out.push(`PR ${this.nibpPr ?? this.r.skin.glyphs.noValue}`);
      else if (x === 'PR') out.push(`PR ${this.text(v.pr)}`);
      else if (x === 'PI') out.push(`PI ${this.text(v.pi, 1)}`);
      else if (x === 'AWRR') out.push(`awRR ${this.text(v.awrr)}`);
      else if (x === 'T2') out.push(`T2 ${this.text(v.tempSite, 1)}`);
      else if (x === 'ST') out.push(`ST-II ${this.text(v.stII, 1)}`); // research/11 glossary #22 (the lead-II ST numeric)
      else if (x === 'DT') {
        const a = v.tempCore;
        const b = v.tempSite;
        const ok = a && b && a.value !== null && b.value !== null && a.flag !== 'invalid' && b.flag !== 'invalid';
        out.push(`ΔT ${ok ? Math.abs((a.value as number) - (b.value as number)).toFixed(1) : this.r.skin.glyphs.noValue}`);
      }
    }
    return out.join('  ');
  }
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
      let main = g.noValue;
      let sub = '';
      tile.el.style.display = modulePresent(p, v, t) ? '' : 'none'; // FU-3 item 11: NMT/BFA only while the module publishes
      if (p === 'HR') main = this.dev?.hrDashes ? g.hrUnavailable : this.text(v.hr);
```

replace with:

```ts
      let main = g.noValue;
      let sub = '';
      let label: string = p;
      tile.el.style.display = modulePresent(p, v, t) ? '' : 'none'; // FU-3 item 11: NMT/BFA only while the module publishes
      if (p === 'HR') ({ main, label } = this.hrTile()); // FU-5 (M3)
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
        const n = formatNibp(this.nibpEv, this.nibpLast);
        main = n.main === '---/---' ? `${g.noValue}/${g.noValue}` : n.main;
```

replace with:

```ts
        const n = formatNibp(this.nibpEv, this.nibpLast);
        // FU-5 (audit M11): a failed measurement shows the skin's glyph ("-?-" [S2] IFU p. 56; Saadat "?", research/06 §3.2)
        main = this.nibpEv?.phase === 'failed' ? g.nibpFail : n.main === '---/---' ? `${g.noValue}/${g.noValue}` : n.main;
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
      } else if (TILE_NUMERICS[p].numerics.length === 1) main = this.text(v[TILE_NUMERICS[p].numerics[0] as NumericId], p === 'TEMP' || p === 'ST' ? 1 : 0);
      if (p === 'SpO2') sub = `PR ${this.text(v.pr)}  PI ${this.text(v.pi, 1)}`;
      tile.value.textContent = main;
```

replace with:

```ts
      } else if (TILE_NUMERICS[p].numerics.length === 1) {
        const id = TILE_NUMERICS[p].numerics[0] as NumericId;
        main = this.text(v[id], p === 'TEMP' || p === 'ST' ? 1 : 0, id);
      }
      const extra = this.extras(tile.spec); // FU-5 (M11): was a hard-coded "PR … PI …" on SpO2 only
      if (extra) sub = sub ? `${sub}  ${extra}` : extra;
      tile.label.textContent = label;
      tile.value.textContent = main;
```


- [ ] **Step 2: An INOP marks its numeric, it does not flash it**

**Modify `packages/renderer/src/alarm-view.ts`** — find (exactly once):

```ts
  const mine = shown.filter((a) => !a.acked && a.numeric !== undefined && spec.numerics.includes(a.numeric));
```

replace with:

```ts
  const mine = shown.filter((a) => !a.acked && a.category === 'physiological' && a.numeric !== undefined && spec.numerics.includes(a.numeric)); // FU-5: INOPs mark, not flash
```


- [ ] **Step 3: The skins — extras the renderer draws, unmodellable settings removed, the contract**

**Modify `packages/skins/src/data/skins/philips-like.json`** — find (exactly once):

```json
      [{ "param": "SpO2", "extras": ["PR"] }, { "param": "CO2", "extras": ["EtCO2", "AWRR"] }, { "param": "TEMP" }, { "param": "BFA", "extras": ["SR"] }]
```

replace with:

```json
      [{ "param": "SpO2", "extras": ["PR", "PI"] }, { "param": "CO2", "extras": ["EtCO2", "AWRR"] }, { "param": "TEMP" }, { "param": "BFA", "extras": ["SR"] }]
```

**Modify `packages/skins/src/data/skins/philips-like.json`** — find (exactly once):

```json
Both are module tiles, drawn only while the stimulator / depth monitor publishes" },
```

replace with:

```json
Both are module tiles, drawn only while the stimulator / depth monitor publishes. FU-5: the SpO2 tile shows the perfusion indicator beside the pulse (research/05 §6 [S2] IFU p. 120 'Perf')" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
        { "param": "HR", "size": "large", "extras": ["PACE", "ST", "PVCs"] },
```

replace with:

```json
        { "param": "HR", "size": "large", "extras": ["ST"] },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
        { "param": "BFA", "extras": ["BS%", "SQI", "EMG"] }
```

replace with:

```json
        { "param": "BFA", "extras": ["BS%"] }
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
FU-5: IBP1's PPV extra removed — the engine has no PPV numeric and the B9's PPV is OFF by default (research/06 §4.1, M p.149–161)" },
```

replace with:

```json
FU-5: IBP1's PPV extra removed — the engine has no PPV numeric and the B9's PPV is OFF by default (research/06 §4.1, M p.149–161); HR's PACE and PVCs and BFA's SQI and EMG extras removed — the engine publishes no pacer-status, PVC-count, SQI or EMG numeric (recorded here, research/06 §3.1 F1, §2)" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
  "glyphs": { "noValue": "---", "hrUnavailable": "-?-", "nibpFail": "?", "outOfRange": "--", "ibpPrUnavailable": "---", "questionable": "?", "inop": "---" },
```

replace with:

```json
  "glyphs": { "noValue": "---", "hrUnavailable": "-?-", "nibpFail": "?", "questionable": "?", "inop": "---" },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
    "glyphs.outOfRange": { "tag": "documented", "source": "research/06 §3.2" },
    "glyphs.ibpPrUnavailable": { "tag": "documented", "source": "research/06 §3.2" },
```

replace with nothing (delete these lines).

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
  "glyphs": { "noValue": "---", "hrUnavailable": "---", "nibpFail": "---", "outOfRange": "---", "ibpPrUnavailable": "---", "questionable": "?", "inop": "---" },
```

replace with:

```json
  "glyphs": { "noValue": "---", "hrUnavailable": "---", "nibpFail": "---", "questionable": "?", "inop": "---" },
```

**Modify `packages/skins/src/schema.ts`** — find (exactly once):

```ts
    glyphs: obj({ noValue: str, hrUnavailable: str, nibpFail: str, outOfRange: str, ibpPrUnavailable: str, questionable: str, inop: str }),
```

replace with:

```ts
    glyphs: obj({ noValue: str, hrUnavailable: str, nibpFail: str, questionable: str, inop: str }),
```

**Modify `packages/skins/src/types.ts`** — find (exactly once):

```ts
  glyphs: { noValue: string; hrUnavailable: string; nibpFail: string; outOfRange: string; ibpPrUnavailable: string; questionable: string; inop: string };
```

replace with:

```ts
  glyphs: { noValue: string; hrUnavailable: string; nibpFail: string; questionable: string; inop: string };
```

**Modify `packages/skins/CONTRACT.md`** — find (exactly once):

```markdown
extra (no PPV numeric; the B9's PPV is OFF by default, research/06 §4.1). Option lists (`*Options`, `autoIntervalsMin`,
`ecg.filters`, `spo2.sensitivity`) are settings-menu data and do not claim a behaviour.
```

replace with:

```markdown
extra (no PPV numeric; the B9's PPV is OFF by default, research/06 §4.1), its HR `PACE`/`PVCs` and BFA `SQI`/`EMG`
extras (no such numerics); `glyphs.outOfRange` ("--") and `glyphs.ibpPrUnavailable` ("---", research/06 §3.2: no
engine numeric leaves a device range the manuals give, and no tile shows an IBP pulse rate). Option lists
(`*Options`, `autoIntervalsMin`, `ecg.filters`, `spo2.sensitivity`) and menu features (`alarms.alarmFreezeOption`,
`alarms.recall`) are settings-menu data and do not claim a behaviour; `spo2.plethNormalized` is the renderer's pleth
auto-scale, which every skin gets.

Tile `extras` the renderer draws: `PR` (SpO2: the pleth rate; NIBP: the cuff's), `PI`, `AWRR`, `T2`, `DT`, `ST`;
`MEAN` is the pressure tiles' own sub-line; NMT/BFA extras name their second readout (FU-3). The printed labels are
research/11's glossary labels (R56): "PR", "PI" (perfusion index; the LVAD index is never "PI"), "awRR", "T2", "ΔT",
"ST-II"; BFA's `BS%` (saadat-like) is the B9's alias of SR, the burst-suppression ratio.
```


- [ ] **Step 4: The tile test**

**Create `packages/renderer/test/fu5-tiles.test.ts`:**

```ts
// @vitest-environment happy-dom
// FU-5 tiles (research/10 audit M1, M3, M8, M11): the skin's glyphs ("97?", "-?-"), the HR source on leads off, the NIBP
// failure glyph and the tile extras, drawn by the DeviceUI from fixture engine events.
import { describe, expect, it } from 'vitest';
import type { AlarmEntry, EngineEvent, Measured } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

const m = (value: number | null, t: number, flag: Measured['flag'] = value === null ? 'invalid' : 'valid'): Measured => ({ value, flag, at: t });
const meas = (t: number, values: Record<string, Measured>): EngineEvent => ({ type: 'measurement', t, values }) as EngineEvent;
const status = (t: number, skin: string, active: Partial<AlarmEntry>[]): EngineEvent => ({
  type: 'alarmStatus', t, skin, ageBand: 'adult', silencedUntil: null, pausedUntil: null, limits: {}, allOff: false, arrhythmiaAnalysis: false, volume: 5,
  active: active.map((a) => ({ level: 3, category: 'technical', text: a.id, since: t, latched: false, acked: false, ...a })),
}) as EngineEvent;
function mount(id: string) {
  const ui = new DeviceUI(document, document.createElement('div'), resolveSkin(id));
  const q = (p: string, k: 'v' | 's' | 'lbl') => ui.tiles.querySelector(`.pme-stile[data-param="${p}"] [data-pme="${k}"]`)?.textContent;
  return { ui, q };
}

describe('FU-5 tiles', () => {
  it('a questionable SpO2 carries "?"; with the NON-PULSAT. INOP the numeric is "-?-" (philips-like) / "---" (saadat-like)', () => {
    const { ui, q } = mount('philips-like');
    ui.onEvent(meas(30, { spo2: m(97, 30, 'questionable'), pr: m(76, 30), pi: m(0.2, 30) }));
    ui.paint(30);
    expect(q('SpO2', 'v')).toBe('97?');
    expect(q('SpO2', 's')).toBe('PR 76  PI 0.2');
    ui.onEvent(meas(31, { spo2: m(null, 31), pr: m(null, 31), pi: m(null, 31) }));
    ui.onEvent(status(31, 'philips-like', [{ id: 'spo2NonPulsatile', numeric: 'spo2' }]));
    ui.paint(31);
    expect(q('SpO2', 'v')).toBe('-?-');
    const sa = mount('saadat-like');
    sa.ui.onEvent(meas(31, { spo2: m(null, 31) }));
    sa.ui.onEvent(status(31, 'saadat-like', [{ id: 'spo2NonPulsatile', numeric: 'spo2' }]));
    sa.ui.paint(31);
    expect(sa.q('SpO2', 'v')).toBe('---');
  });

  it('leads off: philips-like HR "-?-" (the pulse stays in the SpO2 tile); saadat-like relabels the tile PR with the arterial pulse', () => {
    const ph = mount('philips-like');
    ph.ui.onEvent(meas(40, { hr: m(null, 40), pr: m(76, 40), prAbp: m(75, 40) }));
    ph.ui.onEvent(status(40, 'philips-like', [{ id: 'ecgLeadsOff' }]));
    ph.ui.paint(40);
    expect([ph.q('HR', 'lbl'), ph.q('HR', 'v')]).toEqual(['HR', '-?-']);
    const sa = mount('saadat-like');
    sa.ui.onEvent(meas(40, { hr: m(null, 40), pr: m(76, 40), prAbp: m(75, 40) }));
    sa.ui.onEvent(status(40, 'saadat-like', [{ id: 'ecgLeadsOff' }]));
    sa.ui.paint(40);
    expect([sa.q('HR', 'lbl'), sa.q('HR', 'v')]).toEqual(['PR', '75']);
  });

  it('a failed NIBP shows the skin glyph ("-?-" philips-like, "?" saadat-like); saadat-like NIBP PR extra is the cuff rate', () => {
    for (const [id, glyph] of [['philips-like', '-?-'], ['saadat-like', '?']] as const) {
      const { ui, q } = mount(id);
      ui.onEvent({ type: 'nibp', t: 50, phase: 'done', cuffMmHg: 0, result: { sys: 118, dia: 76, map: 90, pr: 72 } } as EngineEvent);
      ui.onEvent(meas(50, { nibpSys: m(118, 50), nibpDia: m(76, 50), nibpMean: m(90, 50) }));
      ui.paint(50);
      if (id === 'saadat-like') expect(q('NIBP', 's')).toContain('PR 72');
      ui.onEvent({ type: 'nibp', t: 90, phase: 'failed', cuffMmHg: 0 } as EngineEvent);
      ui.paint(90);
      expect(q('NIBP', 'v')).toBe(glyph);
    }
  });

  it('extras under the research/11 glossary labels: CO2 awRR (philips-like); TEMP T2 and ΔT, HR ST-II, BFA BS% (saadat-like)', () => {
    const ph = mount('philips-like');
    ph.ui.onEvent(meas(20, { etco2: m(36, 20), awrr: m(12, 20) }));
    ph.ui.paint(20);
    expect([ph.q('CO2', 'v'), ph.q('CO2', 's')]).toEqual(['36', 'awRR 12']);
    const sa = mount('saadat-like');
    sa.ui.onEvent(meas(20, { tempCore: m(36.8, 20), tempSite: m(36.2, 20) }));
    sa.ui.paint(20);
    expect([sa.q('TEMP', 'v'), sa.q('TEMP', 's')]).toEqual(['36.8', 'T2 36.2  ΔT 0.6']);
    sa.ui.onEvent(meas(21, { hr: m(72, 21), stII: m(-0.1, 21), di: m(45, 21), sr: m(12, 21) }));
    sa.ui.paint(21);
    expect([sa.q('HR', 's'), sa.q('BFA', 's')]).toEqual(['ST-II -0.1', 'BS% 12']);
  });
});
```


- [ ] **Step 5: Run**

```bash
npx -y pnpm@9.15.9 typecheck
(cd packages/skins && npx vitest run -u && npx vitest run)
(cd packages/renderer && npx vitest run)
```

Expected: typecheck clean in every package (no consumer of `glyphs.outOfRange` / `ibpPrUnavailable` exists); skins
183 passed; renderer all pass, incl. fu5-tiles: "97?" with "PR 76  PI 0.2"; "-?-" (philips-like) / "---" (saadat-like)
under SpO2 NON-PULSAT.; leads off: philips-like `HR -?-`, saadat-like label `PR` with the arterial rate `75`; failed
NIBP "-?-" / "?", saadat-like NIBP "PR 72"; philips-like CO2 "awRR 12"; saadat-like TEMP "T2 36.2  ΔT 0.6", HR
"ST-II -0.1", BFA "BS% 12" (glossary labels, D19).

- [ ] **Step 6: Commit**

```bash
git add packages/renderer packages/skins
git commit -m "FU-5 Task 11: tiles draw the skin's glyphs (97?, -?-), the HR source, the NIBP failure glyph and the extras; unmodellable skin settings removed

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 12: The alarm header and the sound — a distinct latched style, LEADS OFF visible under a red alarm, split alarm areas for mindray-like, only `sounding` entries play (renderer + skins; PROTOTYPED)

Decisions D3 (presentation), D15, D16 (audit M2, M3, M9). Latched alarms looked exactly like live ones and kept
sounding (`alarm-audio.ts` played every unacknowledged entry); `ECG LEADS OFF` (level 3) was invisible under any red
alarm because the single bar showed the top level only. Now `barView` distinguishes live / latched / acknowledged;
its pool is every unacknowledged message, live or latched (a latched red is never hidden by a live yellow — review
ruling 4); philips-like (`alarms.messageBar.rotateAll`, a new skin field this task adds) rotates the whole pool every
2 s ([S2] p. 29–30), the other single bars rotate the top level with the unacknowledged INOPs; a split layout gets its
own INOP field; and the audio bridge plays what the engine marks `sounding`. The 4b e2e's philips-like Silence step follows D4.

**Files:**
- Modify: `packages/renderer/src/{alarm-view,device-ui,alarm-audio}.ts`, `packages/skins/src/data/skins/mindray-like.json`
  (`layout.messageBars`), `packages/skins/src/{types,schema}.ts` and
  `packages/skins/src/data/{base/iec-defaults,skins/philips-like,skins/saadat-like}.json` (`alarms.messageBar.rotateAll`,
  review ruling 4), `apps/demo/e2e/stage4b-device.e2e.ts` (R45 re-statements, two steps: the philips-like Silence
  step — no countdown, and after it the VFIB is `acked` in `alarmStatus` with `silencedUntil` null instead of "the bar
  still reads VFIB", because the bar leads with the live technical/limit alarms VF raises after the acknowledge; the
  flash-rate test's HR target 150 → 130, because 150 is above philips-like's extreme-tachy threshold 140, which now
  alarms red with arrhythmia analysis off (D7) and supersedes **HR)
- Modify (tests): `packages/renderer/test/{alarm-view,alarm-audio}.test.ts`, `packages/skins/test/fu1-layout.test.ts`
  (R45 re-statement: ge-like and mindray-like still inherit the IEC lanes and tiles; mindray-like's documented split
  alarm areas now differ — the test compared the whole `layout` object)

- [ ] **Step 1: The bar view, the header DOM and the audio bridge**

**Modify `packages/renderer/src/alarm-view.ts`** — find (exactly once):

```ts
  /** Red crossed bell in the header: every parameter alarm is OFF (brief §6.4.1). */
  allOffBell: boolean;
}
```

replace with:

```ts
  /** Red crossed bell in the header: every parameter alarm is OFF (brief §6.4.1). */
  allOffBell: boolean;
  /** FU-5: the message shown is a LATCHED alarm (condition gone, not acknowledged): drawn in the latched style. */
  latched: boolean;
  /** FU-5: the technical-alarm field of a split layout (skin `layout.messageBars`, mindray-like), or null. */
  inop: { text: string; bg: string; fg: string } | null;
}
```

**Modify `packages/renderer/src/alarm-view.ts`** — find (exactly once):

```ts
export function barView(st: AlarmStatus | null, r: ResolvedSkin, t: number, pumpPage = false): BarView {
  const a = r.skin.alarms;
  const silenceLeft = st?.silencedUntil != null ? st.silencedUntil - t : null;
  const pauseLeft = st?.pausedUntil != null ? st.pausedUntil - t : null;
  const countdownKind = pauseLeft !== null && pauseLeft > 0 ? 'pause' : silenceLeft !== null && silenceLeft > 0 && a.silence.headerCountdown ? 'silence' : null;
  const countdownS = countdownKind === 'pause' ? Math.ceil(pauseLeft as number) : countdownKind === 'silence' ? Math.ceil(silenceLeft as number) : null;
  const base = { countdownS, countdownKind, allOffBell: st?.allOff === true } as const;
  const shown = st ? visibleAlarms(st, r, t, pumpPage) : [];
  if (shown.length === 0) return { ...base, text: '', bg: a.messageBar.idle.bg, fg: a.messageBar.idle.fg, lamp: 'off', flashHz: 0, duty: a.lamp.duty };
  const live = shown.filter((e) => !e.acked);
  const pool = live.length > 0 ? live : shown;
  const top = Math.min(...pool.map((e) => e.level));
  const same = pool.filter((e) => e.level === top);
  const e = a.messageBar.rotate ? (same[Math.floor(t / ROTATE_S) % same.length] as AlarmEntry) : (same[0] as AlarmEntry);
  const key = `L${top}` as 'L1' | 'L2' | 'L3';
  const colours = live.length > 0 ? a.messageBar[key] : a.messageBar.acknowledged;
  const lamp = live.length > 0 ? a.lamp[key] : 'off';
  const flashHz = lamp.endsWith('-flash') ? (top === 1 ? a.lamp.flashHz.L1 : a.lamp.flashHz.L2) : 0;
  return { ...base, text: e.text, bg: colours.bg, fg: colours.fg, lamp, flashHz, duty: a.lamp.duty };
}
```

replace with:

```ts
/**
 * The header's message bar and lamp. FU-5 (research/00 "FU-5 opened": "a DISTINCT latched presentation"; audit M2, M3):
 * - live = raised and neither acknowledged nor latched: the level's colours, the lamp flashing (brief §6.4);
 * - latched = the condition ended, not acknowledged: the level's colour as TEXT on the idle bar, framed [ruling: the
 *   "distinct presentation" of research/00 "FU-5 opened"; Philips documents no style change, it keeps the message and
 *   the flashing numerics and drops the tone and lamp under audible latching Off, [S2] IFU p. 40];
 * - acknowledged: the skin's acknowledged colours;
 * - the pool is every UNACKNOWLEDGED message, live or latched (a visually latched alarm is still active, [S2] IFU
 *   p. 40), ordered by level — so a latched red is never hidden by a live yellow (review ruling 4); acknowledged
 *   messages show only when nothing unacknowledged is left;
 * - `messageBar.rotateAll` (philips-like): the whole pool rotates every two seconds — "all active alarm messages are
 *   shown in the alarm status area in succession … the message changes every two seconds" ([S2] IFU p. 29–30); the
 *   other rotating skins rotate the pool's top level, with the unacknowledged INOPs rotated in under a red or yellow
 *   top, so LEADS OFF is seen under a red APNEA; a split layout (mindray-like, [S4] §3.6 technical and physiological
 *   alarm areas) shows the INOPs in their own field;
 * - the lamp (and, in the audio bridge, the tone) come from LIVE entries only.
 */
export function barView(st: AlarmStatus | null, r: ResolvedSkin, t: number, pumpPage = false): BarView {
  const a = r.skin.alarms;
  const silenceLeft = st?.silencedUntil != null ? st.silencedUntil - t : null;
  const pauseLeft = st?.pausedUntil != null ? st.pausedUntil - t : null;
  const countdownKind = pauseLeft !== null && pauseLeft > 0 ? 'pause' : silenceLeft !== null && silenceLeft > 0 && a.silence.headerCountdown ? 'silence' : null;
  const countdownS = countdownKind === 'pause' ? Math.ceil(pauseLeft as number) : countdownKind === 'silence' ? Math.ceil(silenceLeft as number) : null;
  const shown = st ? visibleAlarms(st, r, t, pumpPage) : [];
  const split = r.skin.layout.messageBars === 'split-technical-physiological';
  const techs = shown.filter((e) => e.category === 'technical');
  const pick = (xs: AlarmEntry[]) => (a.messageBar.rotate ? (xs[Math.floor(t / ROTATE_S) % xs.length] as AlarmEntry) : (xs[0] as AlarmEntry));
  const style = (e: AlarmEntry) =>
    e.acked ? a.messageBar.acknowledged : e.latched ? { bg: a.messageBar.idle.bg, fg: a.messageBar[`L${e.level}`].bg } : a.messageBar[`L${e.level}`];
  const inopE = split && techs.length > 0 ? pick(techs) : null;
  const base = { countdownS, countdownKind, allOffBell: st?.allOff === true, inop: inopE ? { text: inopE.text, ...style(inopE) } : null } as const;
  const phys = split ? shown.filter((e) => e.category !== 'technical') : shown;
  if (phys.length === 0) return { ...base, text: '', bg: a.messageBar.idle.bg, fg: a.messageBar.idle.fg, lamp: 'off', flashHz: 0, duty: a.lamp.duty, latched: false };
  const live = phys.filter((e) => !e.acked && !e.latched);
  const unacked = phys.filter((e) => !e.acked); // live ∪ latched
  const pool = (unacked.length > 0 ? unacked : phys).slice().sort((x, y) => x.level - y.level || x.since - y.since);
  const lvl = (pool[0] as AlarmEntry).level;
  const same = a.messageBar.rotateAll ? pool : pool.filter((x) => x.level === lvl);
  if (!a.messageBar.rotateAll && !split && lvl < 3) for (const x of techs) if (!x.acked && !same.includes(x)) same.push(x); // an acknowledged INOP stays in the review, not the bar
  const e = pick(same);
  const top = live.length > 0 ? Math.min(...live.map((x) => x.level)) : 3;
  const key = `L${top}` as 'L1' | 'L2' | 'L3';
  const lamp = live.length > 0 ? a.lamp[key] : 'off';
  const flashHz = lamp.endsWith('-flash') ? (top === 1 ? a.lamp.flashHz.L1 : a.lamp.flashHz.L2) : 0;
  return { ...base, text: e.text, ...style(e), lamp, flashHz, duty: a.lamp.duty, latched: e.latched && !e.acked };
}
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
    '.pme-lamp{width:18px;height:18px;border-radius:50%;flex:none}',
```

replace with:

```ts
    '.pme-lamp{width:18px;height:18px;border-radius:50%;flex:none}',
    '.pme-bar.latched{outline:2px solid currentColor;outline-offset:-2px}', // FU-5: the latched style (text in the level colour, framed)
    '.pme-inop{max-width:40%;height:22px;line-height:22px;padding:0 8px;border-radius:2px;white-space:nowrap;overflow:hidden}',
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
      '<div class="pme-lamp" data-pme="lamp"></div><div class="pme-bar" data-pme="bar"></div><span class="pme-cd" data-pme="cd"></span>' +
```

replace with:

```ts
      '<div class="pme-lamp" data-pme="lamp"></div><div class="pme-bar" data-pme="bar"></div><span class="pme-inop" data-pme="inop"></span><span class="pme-cd" data-pme="cd"></span>' +
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
  private readonly bar: HTMLDivElement;
```

replace with:

```ts
  private readonly bar: HTMLDivElement;
  private readonly inop: HTMLSpanElement;
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
    this.bar = q('bar');
```

replace with:

```ts
    this.bar = q('bar');
    this.inop = q('inop');
```

**Modify `packages/renderer/src/device-ui.ts`** — find (exactly once):

```ts
    this.bar.textContent = b.text;
    this.bar.style.background = b.bg;
    this.bar.style.color = b.fg;
```

replace with:

```ts
    this.bar.textContent = b.text;
    this.bar.style.background = b.bg;
    this.bar.style.color = b.fg;
    this.bar.className = `pme-bar${b.latched ? ' latched' : ''}`;
    this.bar.dataset.latched = String(b.latched);
    this.inop.textContent = b.inop?.text ?? '';
    this.inop.style.display = b.inop ? '' : 'none';
    this.inop.style.background = b.inop?.bg ?? '';
    this.inop.style.color = b.inop?.fg ?? '';
```

**Modify `packages/renderer/src/alarm-audio.ts`** — find (exactly once):

```ts
// Engine alarm state → alarm sound (request E-4a-3; brief §6.4, §6.4.1): the `alarmStatus` event is the single
// source; the bridge raises and clears alarms on the 4a AlarmSounder (which sounds only the highest priority,
// ties first raised) and mirrors the engine's silence/pause. Acknowledged alarms are silent.
```

replace with:

```ts
// Engine alarm state → alarm sound (request E-4a-3; brief §6.4, §6.4.1): the `alarmStatus` event is the single
// source; the bridge raises and clears alarms on the 4a AlarmSounder (which sounds only the highest priority,
// ties first raised) and mirrors the engine's silence/pause. Acknowledged alarms are silent. FU-5: so are latched
// alarms under visual-only latching — the engine's `sounding` flag decides (absent in older events: not acknowledged).
```

**Modify `packages/renderer/src/alarm-audio.ts`** — find (exactly once):

```ts
    for (const a of st.active) if (!a.acked) want.set(a.id, a.level);
```

replace with:

```ts
    for (const a of st.active) if (a.sounding ?? !a.acked) want.set(a.id, a.level);
```


- [ ] **Step 2: mindray-like's split alarm areas; philips-like rotates every message**

**Modify `packages/skins/src/data/skins/mindray-like.json`** — find (exactly once):

```json
  "layout": { "badge": "LAYOUT UNVERIFIED" },
```

replace with:

```json
  "layout": { "badge": "LAYOUT UNVERIFIED", "messageBars": "split-technical-physiological" },
```

**Modify `packages/skins/src/data/skins/mindray-like.json`** — find (exactly once):

```json
    "alarms.delayS": {
```

replace with:

```json
    "layout.messageBars": { "tag": "documented", "source": "research/05 §6 [S4] Mindray BeneVision N Operator's Manual §3.6 (technical alarm information area beside the physiological alarm information area)" },
    "alarms.delayS": {
```


FU-5 review ruling 4 (D15): the skin field `alarms.messageBar.rotateAll` — philips-like rotates every unacknowledged message ([S2] IFU p. 29–30), the other skins keep the top-level rotation.

**Modify `packages/skins/src/types.ts`** — find (exactly once):

```ts
prefix: 'asterisks' | 'none'; rotate: boolean };
```

replace with:

```ts
prefix: 'asterisks' | 'none'; rotate: boolean; /** FU-5: rotate EVERY unacknowledged message (live or latched), not only the top level (Philips [S2] p. 29–30). */ rotateAll: boolean };
```

**Modify `packages/skins/src/schema.ts`** — find (exactly once):

```ts
prefix: en(['asterisks', 'none']), rotate: bool }),
```

replace with:

```ts
prefix: en(['asterisks', 'none']), rotate: bool, rotateAll: bool }),
```

**Modify `packages/skins/src/data/base/iec-defaults.json`** — find (exactly once):

```json
      "prefix": "asterisks",
      "rotate": true
    },
```

replace with:

```json
      "prefix": "asterisks",
      "rotate": true,
      "rotateAll": false
    },
```

**Modify `packages/skins/src/data/skins/saadat-like.json`** — find (exactly once):

```json
      "prefix": "none",
      "rotate": true
```

replace with:

```json
      "prefix": "none",
      "rotate": true,
      "rotateAll": false
```

**Modify `packages/skins/src/data/skins/philips-like.json`** — find (exactly once):

```json
    "latching": { "visual": "red", "audible": "off" }
  },
```

replace with:

```json
    "latching": { "visual": "red", "audible": "off" },
    "messageBar": { "rotateAll": true }
  },
```

**Modify `packages/skins/src/data/skins/philips-like.json`** — find (exactly once):

```json
    "alarms.latching": {
```

replace with:

```json
    "alarms.messageBar.rotateAll": { "tag": "documented", "source": "research/05 §6 [S2] Philips IntelliVue IFU p. 29–30 (all active alarm messages are shown in the alarm status area in succession; the message changes every two seconds) and p. 40 (a visually latched alarm stays active)", "note": "FU-5 review ruling 4: a latched red stays in the rotation under a live yellow" },
    "alarms.latching": {
```

- [ ] **Step 3: Tests and the 4b e2e step**

**Modify `packages/renderer/test/alarm-view.test.ts`** — find (exactly once):

```ts
describe('tileAlarmView', () => {
```

replace with:

```ts
describe('FU-5 barView: latched style, INOP visibility (audit M2, M3)', () => {
  const vf = { ...asy, id: 'VFIB', text: '***VFIB/VTACH', since: 6 };
  it('a latched alarm keeps its message in the latched style (level colour as text, lamp off); under a live yellow it stays in the rotation (philips-like rotates every message, [S2] p. 29–30; review ruling 4) or on top (other skins), never hidden', () => {
    const s = status({ active: [{ ...vf, latched: true }] });
    expect(barView(s, ph, 12)).toMatchObject({ text: '***VFIB/VTACH', latched: true, lamp: 'off', fg: '#FF0000' });
    const both = status({ active: [{ ...vf, latched: true }, { ...hr, text: '**HR 130>120' }] });
    expect(barView(both, ph, 12)).toMatchObject({ text: '***VFIB/VTACH', latched: true, lamp: 'yellow-flash' }); // the lamp from the live yellow
    expect(barView(both, ph, 14)).toMatchObject({ text: '**HR 130>120', latched: false, lamp: 'yellow-flash' });
    const zo = resolveSkin('zoll-like'); // IEC default: lethal alarms latch; the top level rotates, a latched red is the top
    expect([12, 14, 16].map((t) => barView(both, zo, t).text)).toEqual(['***VFIB/VTACH', '***VFIB/VTACH', '***VFIB/VTACH']);
  });
  it('single bar (philips-like): LEADS OFF rotates in with a red alarm every 2 s, the lamp stays red', () => {
    const s = status({ active: [{ ...asy, id: 'apnoea-co2', text: '***APNEA' }, { ...leads, text: 'ECG LEADS OFF' }] });
    expect(barView(s, ph, 12)).toMatchObject({ text: '***APNEA', lamp: 'red-flash' });
    expect(barView(s, ph, 14)).toMatchObject({ text: 'ECG LEADS OFF', lamp: 'red-flash' });
  });
  it('split layout (mindray-like, [S4] §3.6): the INOP has its own field beside the physiological bar', () => {
    const mr = resolveSkin('mindray-like');
    const b = barView(status({ active: [{ ...asy, id: 'apnoea-co2', text: '***APNEA' }, { ...leads, text: 'ECG LEADS OFF' }] }), mr, 14);
    expect(b.text).toBe('***APNEA');
    expect(b.inop?.text).toBe('ECG LEADS OFF');
  });
});

describe('tileAlarmView', () => {
```

**Modify `packages/renderer/test/alarm-audio.test.ts`** — find (exactly once):

```ts
describe('alarm audio bridge', () => {
```

replace with:

```ts
describe('FU-5 alarm audio bridge: the engine decides what sounds', () => {
  it('a latched alarm under visual-only latching is silent (`sounding: false`); a new alarm after an acknowledge sounds at once', () => {
    const r = rig(IEC_STYLE);
    r.bridge.onStatus(st(0, [{ ...entry('VFIB', 1), latched: true, sounding: false }]));
    r.run(5);
    expect(r.played).toEqual([]);
    r.bridge.onStatus(st(5, [{ ...entry('VFIB', 1, true), sounding: false }, { ...entry('ASYSTOLE', 1), sounding: true }])); // no silence timer (acknowledge skins)
    r.run(6.5);
    expect(r.played.length).toBeGreaterThan(0);
    expect(r.played.every((p) => p.id.startsWith('alarm:ASYSTOLE:'))).toBe(true);
  });
});

describe('alarm audio bridge', () => {
```

**Modify `packages/renderer/test/alarm-audio.test.ts`** — find (exactly once):

```ts
const entry = (id: string, level: 1 | 2 | 3, acked = false) => ({ id, level, category: 'physiological' as const, text: id, since: 0, latched: false, acked });
const st = (t: number, active: ReturnType<typeof entry>[], silencedUntil: number | null = null): AlarmStatus => ({
```

replace with:

```ts
const entry = (id: string, level: 1 | 2 | 3, acked = false) => ({ id, level, category: 'physiological' as const, text: id, since: 0, latched: false, acked });
const st = (t: number, active: Array<ReturnType<typeof entry> & { sounding?: boolean }>, silencedUntil: number | null = null): AlarmStatus => ({
```

**Modify `apps/demo/e2e/stage4b-device.e2e.ts`** — find (exactly once):

```ts
    await send(page, { type: 'device', action: { device: 'alarm', action: 'silence' } });
    await expect(page.locator('.pme-cd')).toContainText(/\d+s/, { timeout: 3000 });
```

replace with:

```ts
    await send(page, { type: 'device', action: { device: 'alarm', action: 'silence' } });
    // FU-5: philips-like Silence acknowledges — no countdown, new alarms sound ([S2] IFU p. 32); the others mute with a countdown
    if (skin === 'philips-like') await page.waitForTimeout(1500);
    else await expect(page.locator('.pme-cd')).toContainText(/\d+s/, { timeout: 3000 });
```

**Modify `apps/demo/e2e/stage4b-device.e2e.ts`** — find (exactly once):

```ts
    if (skin === 'saadat-like') await expect(page.locator('.pme-bar')).toHaveText(''); // silence hides the visual (brief §6.4.1)
    else await expect(page.locator('.pme-bar')).toContainText(/VFIB/); // IEC-style: audio only
```

replace with:

```ts
    if (skin === 'saadat-like') await expect(page.locator('.pme-bar')).toHaveText(''); // silence hides the visual (brief §6.4.1)
    else if (skin === 'philips-like') {
      // FU-5: Silence ACKNOWLEDGED the VFIB (still active, silent, no timer); the single bar now leads with the live alarms
      // raised since (in VF: ABP NON-PULSATILE, SpO2 NON-PULSAT., the ABP limits — Task 12: live before acknowledged)
      const st = await page.evaluate(() => {
        const ev = (window as unknown as { __pme4b: Hook }).__pme4b.events.filter((e) => e.type === 'alarmStatus');
        const s = ev[ev.length - 1] as unknown as { silencedUntil: number | null; active: Array<{ id: string; acked: boolean }> };
        return { silencedUntil: s.silencedUntil, vf: s.active.find((x) => x.id === 'VFIB') ?? null };
      });
      expect(st).toMatchObject({ silencedUntil: null, vf: { acked: true } });
    } else await expect(page.locator('.pme-bar')).toContainText(/VFIB/); // IEC-style: audio only
```

**Modify `apps/demo/e2e/stage4b-device.e2e.ts`** — find (exactly once):

```ts
  await send(page, { type: 'setTarget', variable: 'hr', value: 150 });
```

replace with:

```ts
  // FU-5: HR 150 is above philips-like's extreme-tachy threshold (120 + 20, [S1] p. 50), which now alarms red with
  // arrhythmia analysis off ([S2] IFU p. 89) and supersedes **HR; 130 keeps the medium-priority HR HIGH this test flashes
  await send(page, { type: 'setTarget', variable: 'hr', value: 130 });
```

**Modify `packages/skins/test/fu1-layout.test.ts`** — find (exactly once):

```ts
  it('lane order and tile grid are NOT documented for either, so both keep the badge and the IEC default layout', () => {
```

replace with:

```ts
  it('lane order and tile grid are NOT documented for either, so both keep the badge and the IEC default lanes and tiles (FU-5: mindray-like documents split alarm areas)', () => {
```

**Modify `packages/skins/test/fu1-layout.test.ts`** — find (exactly once):

```ts
    expect(resolveSkin('ge-like').skin.layout).toEqual(resolveSkin('mindray-like').skin.layout); // both inherit it
```

replace with:

```ts
    const ge = resolveSkin('ge-like').skin.layout;
    const mr = resolveSkin('mindray-like').skin.layout;
    expect([mr.lanes, mr.tiles]).toEqual([ge.lanes, ge.tiles]); // both inherit them
    expect([ge.messageBars, mr.messageBars]).toEqual(['single-under-header', 'split-technical-physiological']); // [S4] §3.6
```


- [ ] **Step 4: Run**

```bash
npx -y pnpm@9.15.9 typecheck
(cd packages/skins && npx vitest run -u && npx vitest run)
(cd packages/renderer && npx vitest run) && (cd packages/audio && npx vitest run)
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage4b-device.e2e.ts
git checkout -- docs/gates/stage-4b   # the 4b e2e rewrites its committed evidence: never commit it from here
```

Expected: all pass. alarm-view: a latched VFIB → `{ latched: true, lamp: 'off', fg: '#FF0000' }` on the idle bar, a
live `**HR` wins over it; philips-like single bar alternates `***APNEA` / `ECG LEADS OFF` at 12 s / 14 s with the lamp
`red-flash`; mindray-like shows `ECG LEADS OFF` in `inop`. alarm-audio: a latched `sounding: false` VFIB plays nothing,
a new ASYSTOLE after an acknowledge plays at once. stage4b-device e2e 6 passed (the philips-like Silence has no
countdown and acknowledges VFIB; saadat-like and zoll-like keep their countdowns; the flash test's **HR at 130).

- [ ] **Step 5: Commit**

```bash
git add packages/renderer packages/skins apps/demo/e2e/stage4b-device.e2e.ts
git commit -m "FU-5 Task 12: distinct latched presentation, INOPs visible under red alarms, mindray split alarm areas, audio plays only sounding alarms

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 13: Fidelity suite, engine level (1) — arrest and ECG items 2, 3, 4, 5, 12, 13 (tests only; PROTOTYPED)

research/10 §13 items as device-level Vitest scenarios on the Task 3 rig (MANUAL unless stated, seed 7, adult 40 y
70 kg). Each criterion names its source; [ENG] criteria are the audit's until Ali answers §14. Both files are in the
SLOW set (`test/engine/fidelity-*.test.ts`).

**Files:**
- Create: `packages/engine-core/test/engine/fidelity-arrest.test.ts` (items 2–4), `packages/engine-core/test/engine/fidelity-ecg.test.ts` (items 5, 12, 13)

| Item | Scenario | Pass criteria | Measured on the prototype |
|---|---|---|---|
| 2 PEA | sinus 90 pulseless at 60 s | HR 90 ± 3; PR and SpO2 invalid ≤ 15 s; the ART pulse (`prAbp`) valid only ≤ 6 s after onset, then static: philips-like keeps S/D/M of the flat line (S − D ≤ 5 mmHg from 70 s; review ruling 3); ABP NON-PULSATILE from 80 s; ABPm LOW never clears before CPR | HR 90; PR +7 s, SpO2 +12 s; `prAbp` invalid from 66 s, static "25/21 (22)"-type values (was 10 valid rows incl. the 118/79 glitch); INOP yes (was no) |
| 3 VF → CPR → ROSC ×3 skins | VF 60 s, NIBP 70/160, CPR 150–300, sinus 80 at 302 | VFIB ≤ 5 s; no HR/EXTREME/VTAC raised after VFIB; CPR SpO2 never valid, PR 110 ± 5, EtCO2 10–25; NIBP FAILED ≤ 240 s; after ROSC VFIB latched + silent on philips-like, cleared on mindray-/saadat-like | VFIB +3.0 s; 0 chained raises (was HR_HIGH ×10 philips, EXTREME TACHY latched mindray); CPR "99?", PR 110, EtCO2 21–23 |
| 4 asystole ×3 | asystole 60 s | ASYSTOLE at 4 / 5 / 10 s ± 1.5 (philips / mindray [S4] C.1.1.2 / saadat [06]); no HR LOW or EXTREME BRADY after it | +4.1 / +5.1 / +10.1 s; 0 (was HR 0<50 on philips-like) |
| 4b agonal ×3 (review ruling 6) | pulseless agonal rhythm 60–300 s | ASYSTOLE raised ≤ once; no EXTREME BRADY / HR LOW; no red raise/clear cycle < 5 s | ASYSTOLE ×1 on each skin, EXTREME BRADY/HR LOW ×0 (before the agonal hold: mindray-like ASYSTOLE ×15; after FU-4's arrest Ali's case raised EXTREME BRADY ×11) |
| 5 leads off ×3 | leads off 60–120 s | HR invalid, never "0"; LEADS OFF active; no HR alarm ≤ 15 s after reconnection; (philips) LEADS OFF active beside a red APNEA; (mindray, review ruling 5) the pulse is the alarm source, "**Pulse 130>120" | "0" in 0 rows (was 56); 0 alarms (was HR 0<50); mindray-like "**Pulse 130>120" at 82 s (was "---" and no rate alarm) |
| 12 HR response ×3 | HR 80 → 120 → 40 → 80 | every step ≤ 11 s (IEC 60601-2-27); philips-like 80 → 120 ≤ 8.8 s (6.8 ± 2, [S1]/brief §6.1); `it.fails` saadat-like 80 → 120 ≤ 8 s (B9 M p. 65–66: 6 s) | philips 8 / 7 / 11 s, mindray 7 / 7 / 10, saadat 10 / 9 / 10; saadat 80 → 120 settles in 9 s (the `it.fails`) |
| 13 rhythm tour ×4 | 10 rhythms × 60 s, arrhythmia off/on | VTAC ≤ 3 s; ≤ 1 live lethal/extreme alarm at a time; PAUSE held ≥ 5 s | VTAC +1.6 s; max 1; PAUSE shortest 5.0 s (was 0.0 s ×10) |

Kept as `it.fails` with the number (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5; Open question 12):
saadat-like's rise 80 → 120 takes 9 s to the ± 5 % settle rule (the review measured 10 s to its own rule) against the
B9 manual's 6 s at the 8 s window (research/06 §4.1) — the 8 s moving average plus the MANUAL rate ramp; FU-5 does not
change the Saadat averaging without Ali's stopwatch check. mindray-like's V-Tach run is now 6 PVCs ([S4] C.1.1.2):
the tour's VTAC comes +1.94 s after VT 180 (philips-like +1.6 s).

- [ ] **Step 1: Create the tests**

**Create `packages/engine-core/test/engine/fidelity-arrest.test.ts`:**

```ts
// FU-5 monitor-fidelity suite items 2–4 (research/10 §13): PEA, VF → CPR → ROSC and asystole, per skin where the
// vendors differ. MANUAL, the audit's arrest script (rhythm at 60 s, NIBP at 70 s, CPR 150–300 s with NIBP at 160 s,
// ROSC sinus 80 at 302 s). Sources: brief §4.3 (no pulse → SpO2 invalid after 10–30 s), research/05 §6 [S2] IFU p. 40
// (visual latching), p. 57 (non-pulsatile), p. 89, 99 (arrhythmia alarms, chaining); research/06 §4.2 (Saadat non-latching).
import { describe, expect, it } from 'vitest';
import { activeIds, M, monitorRun, VENTED, type MonRun, type Step } from '../helpers/monitor.ts';

const arrest = (rhythm: string, opts: Record<string, unknown> = {}): Step[] => [
  ...VENTED, [60, M.rhythm(rhythm, opts)], [70, M.nibp('start')], [150, M.cpr(true)], [160, M.nibp('start')], [300, M.cpr(false)],
  [302, M.rhythm('sinus', { rateBpm: 80 })],
];
const raisedAt = (run: MonRun, id: string) => run.alarms.filter((a) => a.id === id && a.state === 'raised').map((a) => a.t);
const firstRow = (run: MonRun, from: number, ok: (r: MonRun['rows'][number]) => boolean) => run.rows.find((r) => r.t > from && ok(r))?.t ?? Infinity;
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('FU-5 fidelity 2: PEA (sinus 90 pulseless)', () => {
  it('HR = the electrical rate ± 3; PR and SpO2 invalid within 15 s; the ART pulse valid only from the fresh pre-arrest beats (≤ 6 s), then static with ABP NON-PULSATILE — philips-like keeps S/D/M of the flat line ([S2] p. 57, review ruling 3); ABPm LOW held until CPR', async () => {
    const run = await monitorRun({ mode: 'manual', steps: arrest('sinus', { rateBpm: 90, pulseless: true }), tEnd: 149 });
    const pea = run.rows.filter((r) => r.t >= 70);
    expect(Math.abs(mean(pea.map((r) => r.m.hr?.value ?? 0)) - 90)).toBeLessThanOrEqual(3);
    expect(firstRow(run, 60, (r) => r.m.pr?.flag === 'invalid') - 60).toBeLessThanOrEqual(15);
    expect(firstRow(run, 60, (r) => r.m.spo2?.flag === 'invalid') - 60).toBeLessThanOrEqual(15);
    expect(run.rows.filter((r) => r.t > 66 && r.m.prAbp?.flag === 'valid').map((r) => r.t)).toEqual([]);
    // no pulsatile S/D after the fresh beats: the kept static S/D are the flat line's 2 s max/min (e.g. 25/21 (22) with
    // the ventilator swing; 136/90 before the arrest) — review ruling 3
    expect(run.rows.filter((r) => r.t >= 70 && r.m.abpSys?.flag === 'valid' && (r.m.abpSys.value as number) - (r.m.abpDia?.value as number) > 5).map((r) => r.t)).toEqual([]);
    expect(pea.filter((r) => r.t >= 80).every((r) => activeIds(r).includes('abpNonPulsatile'))).toBe(true);
    const low = firstRow(run, 60, (r) => activeIds(r).includes('ART_M_LOW'));
    expect(low).toBeLessThan(90);
    expect(run.rows.filter((r) => r.t >= low && !activeIds(r).includes('ART_M_LOW')).map((r) => r.t)).toEqual([]);
  }, 120_000);
});

describe('FU-5 fidelity 3: VF → CPR → ROSC, per skin', () => {
  it.each([['philips-like', true], ['mindray-like', false], ['saadat-like', false]] as const)(
    '%s: VFIB ≤ 5 s; no HR / EXTREME / VTAC alarm raised while VFIB stands; CPR: SpO2 not valid, PR = 110 ± 5, EtCO2 10–25; NIBP FAILED ≤ 180 s after VF onset (sim ≤ 240 s); after ROSC VFIB latched (silent) only where the vendor latches (%s)',
    async (skin, latches) => {
      const run = await monitorRun({ mode: 'manual', skin, steps: arrest('vfCoarse'), tEnd: 330 });
      const vf = raisedAt(run, 'VFIB')[0] as number;
      expect(vf - 60).toBeLessThanOrEqual(5);
      const chained = ['HR_HIGH', 'HR_LOW', 'EXTREME_TACHY', 'EXTREME_BRADY', 'VTAC'];
      expect(run.alarms.filter((a) => a.state === 'raised' && chained.includes(a.id) && a.t >= vf && a.t < 302).map((a) => `${a.id}@${a.t}`)).toEqual([]);
      const cpr = run.rows.filter((r) => r.t >= 170 && r.t <= 295);
      expect(cpr.filter((r) => r.m.spo2?.flag === 'valid').map((r) => r.t)).toEqual([]);
      expect(Math.abs(mean(cpr.filter((r) => r.m.pr?.flag !== 'invalid').map((r) => r.m.pr?.value ?? 0)) - 110)).toBeLessThanOrEqual(5);
      const et = cpr.map((r) => r.m.etco2?.value ?? -1);
      expect(Math.min(...et)).toBeGreaterThanOrEqual(10);
      expect(Math.max(...et)).toBeLessThanOrEqual(25);
      expect(run.nibp.some((x) => x.phase === 'failed' && x.t <= 240)).toBe(true);
      const end = run.rows[run.rows.length - 1] as MonRun['rows'][number];
      const v = end.active.find((a) => a.id === 'VFIB');
      if (latches) expect(v).toMatchObject({ latched: true, sounding: false, acked: false });
      else expect(v).toBeUndefined();
    },
    120_000,
  );
});

describe('FU-5 fidelity 4: asystole, per skin', () => {
  it.each([['philips-like', 4], ['mindray-like', 5], ['saadat-like', 10]] as const)(
    '%s: ASYSTOLE %i s after the rhythm stops (± 1.5 s); no HR LOW or EXTREME BRADY beside it',
    async (skin, s) => {
      const run = await monitorRun({ mode: 'manual', skin, steps: arrest('asystole'), tEnd: 149 });
      const asy = raisedAt(run, 'ASYSTOLE')[0] as number;
      expect(asy - 60).toBeGreaterThanOrEqual(s - 1.5);
      expect(asy - 60).toBeLessThanOrEqual(s + 1.5);
      expect(run.alarms.filter((a) => a.state === 'raised' && (a.id === 'HR_LOW' || a.id === 'EXTREME_BRADY') && a.t >= asy).map((a) => a.t)).toEqual([]);
    },
    120_000,
  );
});

describe('FU-5 fidelity 4b: an agonal rhythm shows ONE arrest alarm (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 6)', () => {
  it.each(['philips-like', 'mindray-like', 'saadat-like'])(
    '%s: pulseless agonal rhythm 60–300 s: ASYSTOLE raised once, no EXTREME BRADY or HR LOW (was 11 EXTREME BRADY raises in Ali\'s case after FU-4, 15 ASYSTOLE raises on mindray-like)',
    async (skin) => {
      const run = await monitorRun({ mode: 'manual', skin, tEnd: 300, steps: [...VENTED, [60, M.rhythm('agonal', { pulseless: true })]] });
      expect(raisedAt(run, 'ASYSTOLE').length).toBeLessThanOrEqual(1);
      expect(run.alarms.filter((a) => a.state === 'raised' && (a.id === 'EXTREME_BRADY' || a.id === 'HR_LOW') && a.t > 60).map((a) => `${a.id}@${a.t}`)).toEqual([]);
      const red = run.alarms.filter((a) => a.level === 1 && a.t > 60);
      for (let i = 0; i + 1 < red.length; i++) if (red[i]?.state === 'raised') {
        const c = red.slice(i + 1).find((x) => x.id === red[i]?.id);
        if (c?.state === 'cleared') expect(c.t - (red[i] as { t: number }).t, `${red[i]?.id}@${red[i]?.t}`).toBeGreaterThanOrEqual(5);
      }
    },
    120_000,
  );
});
```

**Create `packages/engine-core/test/engine/fidelity-ecg.test.ts`:**

```ts
// FU-5 monitor-fidelity suite items 5, 12, 13 (research/10 §13): ECG leads off, HR response per skin, the rhythm tour.
// Sources: research/05 §6 [S1] p. 50 and [S2] IFU p. 55, 97–99, 108 (LEADS OFF "-?-", Alarm Source Auto, arrhythmia
// chaining); brief §6.1 and IEC 60601-2-27 (HR response < 11 s; Philips 6.8 s); research/06 §4.1 (B9: 6 s / 8 s at the
// 8 s window).
import { describe, expect, it } from 'vitest';
import { activeIds, M, monitorRun, VENTED, type MonRun, type Step } from '../helpers/monitor.ts';

const settle = (run: MonRun, from: number, target: number) => (run.rows.find((r) => r.t >= from && Math.abs((r.m.hr?.value ?? 0) - target) <= 0.05 * target)?.t ?? Infinity) - from;

describe('FU-5 fidelity 5: ECG leads off', () => {
  it.each(['philips-like', 'mindray-like', 'saadat-like'])('%s: HR invalid within 2 s (never "0"), LEADS OFF active; no HR alarm within 15 s of reconnection', async (skin) => {
    const run = await monitorRun({ mode: 'manual', skin, tEnd: 140, steps: [...VENTED, [60, M.sensor('ecg', 'off')], [120, M.sensor('ecg', 'on')]] });
    const off = run.rows.filter((r) => r.t > 62 && r.t <= 120);
    expect(off.filter((r) => r.m.hr?.value === 0).map((r) => r.t)).toEqual([]);
    expect(off.every((r) => r.m.hr?.flag === 'invalid' && activeIds(r).includes('ecgLeadsOff'))).toBe(true);
    expect(run.alarms.filter((a) => a.state === 'raised' && /^(HR_|EXTREME_)/.test(a.id) && a.t >= 120 && a.t <= 135).map((a) => a.id)).toEqual([]);
  }, 120_000);

  it('mindray-like (HR/PR Alarm Source Auto, [S4] App. C.1.1.1 / C.1.3; review ruling 5): with the leads off the pulse is the alarm source — "**Pulse 130>120"', async () => {
    const run = await monitorRun({ mode: 'manual', skin: 'mindray-like', tEnd: 110, steps: [...VENTED, [60, M.sensor('ecg', 'off')], [70, M.target('hr', 130)]] });
    const hi = run.alarms.find((a) => a.id === 'HR_HIGH' && a.state === 'raised' && a.t > 60);
    expect(hi?.text).toBe('**Pulse 130>120');
    expect(run.rows.filter((r) => r.t > 62).every((r) => r.m.hr?.flag === 'invalid')).toBe(true);
  }, 120_000);

  it('philips-like: LEADS OFF stays active beside a red APNEA (the bar rotates it in: renderer Task 12, e2e Task 16)', async () => {
    const run = await monitorRun({ mode: 'modeled', tEnd: 165, steps: [...VENTED, [60, M.ventOff()], [100, M.sensor('ecg', 'off')], [160, M.sensor('ecg', 'on')]] });
    const both = run.rows.filter((r) => r.t > 101 && r.t < 160);
    expect(both.every((r) => activeIds(r).includes('ecgLeadsOff') && activeIds(r).includes('apnoea-co2'))).toBe(true);
  }, 120_000);
});

describe('FU-5 fidelity 12: HR response per skin (MANUAL steps 80 → 120 → 40 → 80)', () => {
  it.each(['philips-like', 'mindray-like', 'saadat-like'])('%s: every step within 11 s (IEC 60601-2-27)', async (skin) => {
    const run = await monitorRun({ mode: 'manual', skin, tEnd: 240, steps: [...VENTED, [2, M.target('hr', 80)], [60, M.target('hr', 120)], [120, M.target('hr', 40)], [180, M.target('hr', 80)]] });
    for (const [from, to] of [[60, 120], [120, 40], [180, 80]] as const) expect(settle(run, from, to)).toBeLessThanOrEqual(11);
  }, 120_000);
  it('philips-like: 80 → 120 within 6.8 ± 2 s (research/05 §2.4, brief §6.1)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 90, steps: [...VENTED, [2, M.target('hr', 80)], [60, M.target('hr', 120)]] });
    expect(settle(run, 60, 120)).toBeLessThanOrEqual(8.8);
  }, 120_000);
  it.fails('saadat-like: 80 → 120 within 8 s (B9 manual M p. 65–66: 6 s at the 8 s averaging window, research/06 §4.1; ± 2 s as philips-like) — measured 9 s (the review measured 10 s to its settle rule; Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5)', async () => {
    const run = await monitorRun({ mode: 'manual', skin: 'saadat-like', tEnd: 90, steps: [...VENTED, [2, M.target('hr', 80)], [60, M.target('hr', 120)]] });
    expect(settle(run, 60, 120)).toBeLessThanOrEqual(8);
  }, 120_000);
});

describe('FU-5 fidelity 13: rhythm tour, one arrhythmia alarm at a time', () => {
  const tour: Step[] = [
    [60, M.rhythm('sinus', { rateBpm: 30 })], [120, M.rhythm('sinusBrady', { rateBpm: 35 })], [180, M.rhythm('junctionalEscape', { rateBpm: 40 })],
    [240, M.rhythm('afib', { rateBpm: 140 })], [300, M.rhythm('vtMono', { rateBpm: 180 })], [360, M.rhythm('sinus', { rateBpm: 75 })],
    [420, M.rhythm('avb3Wide', { rateBpm: 32 })], [480, M.rhythm('pacedVVI', { pacer: { ratePpm: 70 } })], [540, M.rhythm('sinusTachy', { rateBpm: 187 })], [600, M.rhythm('sinus', { rateBpm: 75 })],
  ];
  const LETHAL = ['ASYSTOLE', 'VFIB', 'VTAC', 'EXTREME_BRADY', 'EXTREME_TACHY'];
  it.each([['philips-like', false], ['philips-like', true], ['mindray-like', true], ['saadat-like', false]] as const)(
    '%s (arrhythmia analysis %s): VTAC ≤ 3 s after VT 180; at most one live lethal/extreme alarm at a time; a PAUSE stays ≥ 5 s',
    async (skin, arrOn) => {
      const run = await monitorRun({ mode: 'manual', skin, tEnd: 660, steps: [...VENTED, ...(arrOn ? [[2, M.alarm('arrhythmiaAnalysis', { value: true })] as Step] : []), ...tour] });
      const vt = run.alarms.find((a) => a.id === 'VTAC' && a.state === 'raised' && a.t >= 300);
      expect((vt?.t ?? Infinity) - 300).toBeLessThanOrEqual(3);
      expect(Math.max(...run.rows.map((r) => r.active.filter((a) => LETHAL.includes(a.id) && !a.latched).length))).toBeLessThanOrEqual(1);
      const p = run.alarms.filter((a) => a.id === 'PAUSE');
      for (let i = 0; i + 1 < p.length; i++) if (p[i]?.state === 'raised' && p[i + 1]?.state === 'cleared') expect((p[i + 1] as { t: number }).t - (p[i] as { t: number }).t).toBeGreaterThanOrEqual(5 - 1e-6);
    },
    120_000,
  );
});
```


- [ ] **Step 2: Run**

```bash
cd packages/engine-core && npx vitest run test/engine/fidelity-arrest.test.ts test/engine/fidelity-ecg.test.ts   # ≈ 26 s
```

Expected: 18 passed (7 + 11). A failure is a regression of Tasks 2–12: find it, do not loosen the criterion (R45).

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/fidelity-arrest.test.ts packages/engine-core/test/engine/fidelity-ecg.test.ts
git commit -m "FU-5 Task 13: fidelity suite items 2-5, 12, 13 (PEA, VF/CPR/ROSC, asystole, leads off, HR response, rhythm tour)

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 14: Fidelity suite, engine level (2) — respiration, NIBP and alarm items 6–11, 14, 15 (tests only; PROTOTYPED)

**Files:**
- Create: `packages/engine-core/test/engine/fidelity-resp.test.ts` (items 6–9), `packages/engine-core/test/engine/fidelity-nibp.test.ts`
  (item 10), `packages/engine-core/test/engine/fidelity-alarms.test.ts` (items 11, 14, 15)

| Item | Scenario | Pass criteria | Measured on the prototype |
|---|---|---|---|
| 6 apnoea ×3 (+ saadat RESP) | MODELED, ventilator off 120–180 s | ONE apnoea alarm 20 ± 5 s after the stop; once it stands no RR/awRR/EtCO2 LOW beside it; after resumption philips-like latched + silent, others cleared; awRR valid again; saadat-like with CO2 off: RESP APNEA ≤ 15 s | 1 raise at +20.3 s (was 2: APNEA (RESP) + APNEA); philips-like latched `sounding: false` (was red, audible); saadat RESP +≈ 10 s |
| 7 paralysed apnoea, CO2 off | room air, rocuronium, ventilator off 120 s | APNEA (impedance) from ≤ 145 s to the end; RR never within 5 % of HR; no RR HIGH | RR {0, 1} (was 41–53 = HR, `**RR 44>30`) |
| 8 disconnect / oesophageal | disconnect 60 s, patent 120, oesophageal 180 | CO2 apnoea ≤ 25 s; EtCO2 < 5 ≤ 30 s (6 breaths) | +20.3 s; +24 s |
| 9 desaturation lag | room air, ventilator off 120–400 s | finger lag 15–25 s, ear 5–12 s (brief §4.3); DESAT 19–22 s after the display < 80; recovery lag ≤ 60 s | finger 22 s, ear 12 s |
| 10 NIBP | MANUAL 77/67; MANUAL MAP 60 → 45; MODELED 3 L bleed, auto 1 min; MANUAL AF 150, auto 1 min × 11 | PP 10 at MAP 70 measures (MAP ± 8) and S/D ± 8 of the arterial line; `it.fails` S/D ± 8 of the instructor's 77/67; MAP 60 and 45 measure (± 10); in the bleed every cycle at ART mean ≥ 40 measures (± 10), every cycle < 20 fails; AF 150 \|bias\| ≤ 6 vs the displayed arterial line (Stage 2's definition); `it.fails` \|SBP bias\| ≤ 6 vs the true radial pressure | 80/56 (69) (was FAILED) against the line's 81/62 — the truth itself reaches only PP 19 (the MANUAL tracker); 8 bleed results down to 53/40 (38) (was 1 result, 19 failures); AF 150: 11 results, bias vs the line SBP +0.1 / DBP +3.6, vs the truth SBP +10.8 (first two +24, +13) / DBP +2.7 |
| 11 limit hygiene | MANUAL CVP 10 / HR 50 at the limits; MODELED core 37 → 34 °C; the 11-min rhythm tour | no CVP alarm at the limit; no raise/clear cycle < 5 s; texts beyond the limit; "**Temp 3x.x<36.0"; HR 49–51 on 50: philips-like ≤ 4 raises (characterisation), mindray-like raises only after 6 s pending; `it.fails` CVP_M_HIGH ≤ 2 raises in the tour | CVP 0 raises at the hover; HR_LOW 4 raises in 180 s on both skins (was 11), texts "**HR 49<50"; "**Temp 35.9<36.0" (was "36<36"); tour CVP_M_HIGH 11 (philips), 9 (mindray) |
| 14 Silence ×3 | asystole 30 s, Silence 45 s, VF 60 s | philips-/mindray-like: no timer, ASYSTOLE acked; saadat-like: mute > 160 s; all: the new VFIB sounds, silence ended | philips-like's new VFIB sounds (was silent under a 90 s mute) |
| 15 start-up ×3 | a stable ventilated patient | no alarm raised in the first 15 s | none (was `**etCO2 0<30`, `**ABPd 0<50` at 1 s on every run) |

Orchestrator ruling (FU-5 review), 2026-09-28, rulings 5 and 8 (Open question 8 decided): the HR hover (item 11) is a
CHARACTERISATION row on philips-like — Philips publishes no alarm delay ([S2] p. 299–305), and a true HR wandering
49–51 across a limit of 50 re-alarms on a delay-0 monitor (4 raises in 3 min); mindray-like's documented 6 s delay
([S4] §10.6.5) is asserted as a mechanism (each raise follows 6 s of a pending condition) — it too raises 4 times,
because each dip lasts longer than 6 s (the review expected ≤ 1 without measuring it). Unmet criteria stay as
`it.fails` with their numbers: NIBP S/D at PP 10 against the instructor's 77/67 (80/56), NIBP in AF 150 against
the true radial pressure (SBP +10.8), and the CVP limit chatter outside the hover scenario (11 in the B1 tour; the
harness also shows 5 in A1, 7 in A5, 9 in C2 — review F8: "100 → 5 (A1); 87 → 11 (B1)"). The fidelity rig's rows
gain the true radial S/D (`MonRow.sbp/dbp`) for the AF row.

- [ ] **Step 1: Create the tests**

**Create `packages/engine-core/test/engine/fidelity-resp.test.ts`:**

```ts
// FU-5 monitor-fidelity suite items 6–9 (research/10 §13): apnoea and resumption per skin, the paralysed apnoea on
// impedance only, circuit disconnect and oesophageal intubation, desaturation lag finger vs ear. Sources: research/05 §6
// [S2] IFU p. 41 ("***APNEA" from CO2, Resp or AGM), p. 40 (latching), p. 112–113 (cardiac overlay); research/06 §4.1–4.2
// (Saadat RESP 10 s / CO2 20 s, CAPNO/RESP selects one source); brief §4.3 (site lag: finger 15–20 s, ear ≈ 5 s).
import { describe, expect, it } from 'vitest';
import { activeIds, M, monitorRun, VENTED, type MonRun } from '../helpers/monitor.ts';

const APNOEA = ['apnoea-co2', 'apnoea-resp'];
const raised = (run: MonRun, ids: string[], from = 0, to = Infinity) => run.alarms.filter((a) => a.state === 'raised' && ids.includes(a.id) && a.t >= from && a.t < to);

describe('FU-5 fidelity 6: a 60 s apnoea, then ventilation resumes (no acknowledge)', () => {
  it.each([['philips-like', true], ['mindray-like', false], ['saadat-like', false]] as const)(
    '%s: ONE apnoea alarm, 20 ± 5 s after ventilation stops; once it stands no RR / awRR / EtCO2 LOW beside it (the falling RR and EtCO2 may alarm first); after resumption latched and silent only where the vendor latches (%s); awRR shown again',
    async (skin, latches) => {
      const run = await monitorRun({ mode: 'modeled', skin, tEnd: 300, steps: [...VENTED, [120, M.ventOff()], [180, M.vent()]] });
      const a = raised(run, APNOEA, 100);
      expect(a.map((x) => x.id)).toEqual(['apnoea-co2']);
      expect((a[0] as { t: number }).t - 120).toBeGreaterThanOrEqual(15);
      expect((a[0] as { t: number }).t - 120).toBeLessThanOrEqual(25);
      const beside = run.rows.filter((r) => r.t > (a[0] as { t: number }).t && r.t < 180 && r.active.some((x) => ['RR_LOW', 'AWRR_LOW', 'EtCO2_LOW', 'EtCO2_pctV_LOW'].includes(x.id)));
      expect(beside.map((r) => r.t)).toEqual([]);
      const end = run.rows[run.rows.length - 1] as MonRun['rows'][number];
      const e = end.active.find((x) => x.id === 'apnoea-co2');
      if (latches) expect(e).toMatchObject({ latched: true, sounding: false });
      else expect(e).toBeUndefined();
      expect(end.m.awrr).toMatchObject({ flag: 'valid' });
    },
    120_000,
  );

  it('saadat-like with the capnograph off (RESP is the RR source): RESP APNEA 10 ± 5 s after the last breath (research/06 §4.2)', async () => {
    const run = await monitorRun({ mode: 'modeled', skin: 'saadat-like', sensors: { co2: 'off' }, tEnd: 200, steps: [...VENTED, [120, M.ventOff()]] });
    const a = raised(run, APNOEA, 100);
    expect(a.map((x) => [x.id, x.text])).toEqual([['apnoea-resp', 'RESP APNEA']]);
    expect((a[0] as { t: number }).t - 120).toBeLessThanOrEqual(15);
  }, 120_000);
});

describe('FU-5 fidelity 7: paralysed apnoea with the CO2 line off (impedance only)', () => {
  it('the cardiac overlay is not counted as breathing: APNEA stays from ≤ 25 s after the stop, RR never tracks the HR, no RR HIGH', async () => {
    const run = await monitorRun({ mode: 'modeled', sensors: { co2: 'off' }, tEnd: 420, steps: [[1, M.ett()], [1, M.vent(5, 0.21)], [100, M.drug('rocuronium', 0.6, 'mg/kg')], [120, M.ventOff()]] });
    const apnoea = run.rows.filter((r) => r.t >= 145);
    expect(apnoea.every((r) => activeIds(r).includes('apnoea-resp'))).toBe(true);
    const tracking = apnoea.filter((r) => (r.m.rr?.value ?? 0) > 5 && Math.abs((r.m.rr?.value ?? 0) - (r.m.hr?.value ?? 0)) <= 0.05 * (r.m.hr?.value ?? 1));
    expect(tracking.map((r) => r.t)).toEqual([]);
    expect(raised(run, ['RR_HIGH']).map((x) => x.t)).toEqual([]);
  }, 120_000);
});

describe('FU-5 fidelity 8: disconnection and oesophageal intubation', () => {
  it('CO2 apnoea ≤ 25 s after the disconnect; EtCO2 < 5 mmHg within 6 breaths (30 s) of the oesophageal tube', async () => {
    const ev = (state: string) => ({ type: 'applyEvent', event: { kind: 'airway', state } });
    const run = await monitorRun({ mode: 'modeled', tEnd: 240, steps: [...VENTED, [60, ev('disconnected')], [120, ev('patent')], [180, ev('oesophageal')]] });
    expect(((raised(run, ['apnoea-co2'], 60)[0]?.t) ?? Infinity) - 60).toBeLessThanOrEqual(25);
    expect((run.rows.find((r) => r.t > 180 && (r.m.etco2?.value ?? 99) < 5)?.t ?? Infinity) - 180).toBeLessThanOrEqual(30);
  }, 120_000);
});

describe('FU-5 fidelity 9: desaturation lag, finger vs ear', () => {
  const run = (site?: string) => monitorRun({ mode: 'modeled', tEnd: 600, steps: [[1, M.ett()], [1, M.vent(5, 0.21)], ...(site ? [[2, M.sensor('spo2', 'on', site)] as [number, Record<string, unknown>]] : []), [120, M.ventOff()], [400, M.vent(5, 1)]] });
  const lag = (r: MonRun, from: number, below: boolean) => {
    const tt = r.rows.find((x) => x.t > from && (below ? x.sao2 < 90 : x.sao2 > 90))?.t ?? NaN;
    const ts = r.rows.find((x) => x.t > tt && x.m.spo2?.value != null && x.m.spo2.flag !== 'invalid' && (below ? x.m.spo2.value < 90 : x.m.spo2.value > 90))?.t ?? NaN;
    return ts - tt;
  };
  it('finger: displayed lag 15–25 s; DESAT 20 s after the display falls below 80; recovery lag ≤ 60 s', async () => {
    const r = await run();
    expect(lag(r, 120, true)).toBeGreaterThanOrEqual(15);
    expect(lag(r, 120, true)).toBeLessThanOrEqual(25);
    const below80 = r.rows.find((x) => x.t > 120 && (x.m.spo2?.value ?? 100) < 80)?.t ?? NaN;
    const desat = r.alarms.find((a) => a.id === 'DESAT' && a.state === 'raised')?.t ?? NaN;
    expect(desat - below80).toBeGreaterThanOrEqual(19);
    expect(desat - below80).toBeLessThanOrEqual(22);
    expect(lag(r, 400, false)).toBeLessThanOrEqual(60);
  }, 120_000);
  it('ear: displayed lag 5–12 s', async () => {
    const r = await run('ear');
    expect(lag(r, 120, true)).toBeGreaterThanOrEqual(5);
    expect(lag(r, 120, true)).toBeLessThanOrEqual(12);
  }, 120_000);
});
```

**Create `packages/engine-core/test/engine/fidelity-nibp.test.ts`:**

```ts
// FU-5 monitor-fidelity suite item 10 (research/10 §13, audit M4): the cuff measures a narrow pulse pressure with an
// adequate MAP and fails honestly in real shock. Sources: brief §4.5 ("SBP below about 50–60 fails", 2 attempts);
// research/05 §6 [S2] IFU p. 303 (Philips initial inflation 165 mmHg). The AF bias is Stage 2's acceptance 9
// (test/engine/hemo-nibp.test.ts, AF 75: |bias| ≤ 6).
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED, type MonRun } from '../helpers/monitor.ts';

const results = (run: MonRun) => run.nibp.filter((x) => x.result !== undefined);
const artAt = (run: MonRun, t: number, k: 'abpSys' | 'abpDia') => avg(run.rows.filter((r) => r.t > t - 30 && r.t <= t && r.m[k]?.value != null).map((r) => r.m[k]?.value as number));
const truthAt = (run: MonRun, t: number, k: 'sbp' | 'dbp') => avg(run.rows.filter((r) => r.t > t - 30 && r.t <= t).map((r) => r[k]));
const artMeanAt = (run: MonRun, t: number) => run.rows.filter((r) => r.t > t - 30 && r.t <= t && r.m.abpMean?.value != null).map((r) => r.m.abpMean?.value as number);
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

describe('FU-5 fidelity 10: NIBP envelope', () => {
  it('MANUAL pulse pressure 10 at MAP 70 (77/67): measures, MAP within ± 8 of the arterial line (was FAILED: PP ≤ 20 never measured)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [60, M.target('sbp', 77)], [60, M.target('dbp', 67)], [120, M.nibp('start')]] });
    const r = results(run)[0];
    expect(r).toBeDefined();
    expect(Math.abs((r?.result?.map ?? 0) - avg(artMeanAt(run, r?.t ?? 0)))).toBeLessThanOrEqual(8);
  }, 120_000);

  it.fails('MANUAL pulse pressure 10 (77/67): the cuff shows the narrow pulse pressure — S/D within ± 8 of the instructor\'s 77/67 — measured 80/56 (PP 24); the truth reaches only 81/62 (PP 19: the MANUAL tracker, FU-4\'s side) and the cuff widens it by 5 (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [60, M.target('sbp', 77)], [60, M.target('dbp', 67)], [120, M.nibp('start')]] });
    const r = results(run)[0];
    expect(Math.abs((r?.result?.sys ?? 0) - 77)).toBeLessThanOrEqual(8);
    expect(Math.abs((r?.result?.dia ?? 0) - 67)).toBeLessThanOrEqual(8);
  }, 120_000);

  it('MANUAL pulse pressure 10 (77/67): S/D within ± 8 of the arterial line (80/56 against 81/62)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [60, M.target('sbp', 77)], [60, M.target('dbp', 67)], [120, M.nibp('start')]] });
    const r = results(run)[0] as MonRun['nibp'][number];
    expect(Math.abs((r.result?.sys ?? 0) - artAt(run, r.t, 'abpSys'))).toBeLessThanOrEqual(8);
    expect(Math.abs((r.result?.dia ?? 0) - artAt(run, r.t, 'abpDia'))).toBeLessThanOrEqual(8);
  }, 120_000);

  it('MANUAL AF 150, NIBP auto 1 min, 11 cycles: |bias| ≤ 6 mmHg against the displayed arterial line (Stage 2 acceptance 9\'s definition, there at AF 75) — measured SBP +0.1, DBP +3.6', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 780, steps: [...VENTED, [30, M.rhythm('afib', { rateBpm: 150 })], [60, M.nibp('auto', 1)]] });
    const rs = results(run);
    expect(rs.length).toBeGreaterThanOrEqual(10);
    expect(Math.abs(avg(rs.map((x) => (x.result?.sys ?? 0) - artAt(run, x.t, 'abpSys'))))).toBeLessThanOrEqual(6);
    expect(Math.abs(avg(rs.map((x) => (x.result?.dia ?? 0) - artAt(run, x.t, 'abpDia'))))).toBeLessThanOrEqual(6);
  }, 120_000);

  it.fails('MANUAL AF 150, 11 cycles: |SBP bias| ≤ 6 mmHg against the TRUE radial pressure (the audit\'s AF criterion) — measured +10.8 (the first two readings 125/78 and 117/67: +24 and +13; DBP +2.7): the truth beat-mean counts AF\'s non-ejecting beats (FU-4\'s T2, ruling 5 there), which the cuff and the line do not see; Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 780, steps: [...VENTED, [30, M.rhythm('afib', { rateBpm: 150 })], [60, M.nibp('auto', 1)]] });
    const rs = results(run);
    expect(Math.abs(avg(rs.map((x) => (x.result?.sys ?? 0) - truthAt(run, x.t, 'sbp'))))).toBeLessThanOrEqual(6);
  }, 120_000);

  it('MANUAL shock ladder: MAP 60 and MAP 45 measure (within ± 10 of the arterial mean)', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 400, steps: [...VENTED, [60, M.target('sbp', 80)], [60, M.target('dbp', 50)], [100, M.nibp('start')], [200, M.target('sbp', 60)], [200, M.target('dbp', 36)], [260, M.nibp('start')]] });
    const rs = results(run);
    expect(rs).toHaveLength(2);
    for (const r of rs) expect(Math.abs((r.result?.map ?? 0) - avg(artMeanAt(run, r.t)))).toBeLessThanOrEqual(10);
  }, 120_000);

  it('MODELED 3 L bleed, NIBP auto 1 min: every cycle while the arterial mean is ≥ 40 measures (± 10); every cycle below 20 fails', async () => {
    const run = await monitorRun({ mode: 'modeled', tEnd: 1500, steps: [...VENTED, [60, M.bleed(3000, 900)], [300, M.nibp('auto', 1)]] });
    for (const x of run.nibp) {
      const m = avg(artMeanAt(run, x.t));
      if (m >= 40) expect(x.result, `cycle at ${x.t} s, ART mean ${m.toFixed(0)}`).toBeDefined();
      if (m >= 40 && x.result) expect(Math.abs(x.result.map - m)).toBeLessThanOrEqual(10);
      if (m < 20) expect(x.phase, `cycle at ${x.t} s, ART mean ${m.toFixed(0)}`).toBe('failed');
    }
  }, 120_000);
});
```

**Create `packages/engine-core/test/engine/fidelity-alarms.test.ts`:**

```ts
// FU-5 monitor-fidelity suite items 11, 14, 15 (research/10 §13): limit hygiene, Silence per vendor, a quiet start.
// Sources: research/05 §6 [S2] IFU p. 11, 32 (Silence acknowledges; new alarms sound), [S4] §10.8 (Mindray Alarm Reset),
// research/06 §4.2 (Saadat: Silence mutes 120 s with the visuals; any new alarm ends it); audit M6, M14.
import { describe, expect, it } from 'vitest';
import { M, monitorRun, VENTED, type MonRun, type Step } from '../helpers/monitor.ts';

const raises = (run: MonRun, id: string) => run.alarms.filter((a) => a.id === id && a.state === 'raised');

describe('FU-5 fidelity 11: limit hygiene', () => {
  it('MANUAL CVP 10 and HR 50 on the philips-like limits for 3 min: no CVP alarm at the limit, no raise/clear cycle shorter than 5 s, texts beyond the limit', async () => {
    const run = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [10, M.target('cvp', 10)], [10, M.target('hr', 50)]] });
    expect(raises(run, 'CVP_M_HIGH').filter((a) => a.t > 15)).toHaveLength(0);
    for (const id of ['HR_LOW', 'CVP_M_HIGH']) {
      const ev = run.alarms.filter((a) => a.id === id);
      for (let i = 0; i + 1 < ev.length; i++) if (ev[i]?.state === 'raised' && ev[i + 1]?.state === 'cleared') expect((ev[i + 1] as { t: number }).t - (ev[i] as { t: number }).t).toBeGreaterThanOrEqual(5);
    }
    for (const a of raises(run, 'HR_LOW')) expect(a.text).toMatch(/^\*\*HR (\d+)<50$/);
    for (const a of raises(run, 'HR_LOW')) expect(Number(/HR (\d+)</.exec(a.text)?.[1])).toBeLessThan(50);
  }, 120_000);

  it('HR wandering 49–51 on the limit 50 for 3 min (Open question 8, decided — Orchestrator ruling (FU-5 review), 2026-09-28, ruling 8): philips-like re-alarms ≤ 4 times — a characterisation row, not a defect: Philips publishes no alarm delay ([S2] p. 299–305) and a true HR wandering across a limit re-alarms on a delay-0 monitor; mindray-like raises only after 6 s below the limit ([S4] §10.6.5, §39.4.6) — 4 raises too (40, 100, 130, 180 s), each dip lasting longer than its delay', async () => {
    const ph = await monitorRun({ mode: 'manual', tEnd: 200, steps: [...VENTED, [10, M.target('cvp', 10)], [10, M.target('hr', 50)]] });
    const n = raises(ph, 'HR_LOW').length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(4);
    const mr = await monitorRun({ mode: 'manual', skin: 'mindray-like', tEnd: 200, steps: [...VENTED, [10, M.target('cvp', 10)], [10, M.target('hr', 50)]] });
    const hr = (t: number) => Math.round(mr.rows.find((r) => r.t === t)?.m.hr?.value ?? 99);
    // each raise follows 6 s of a pending condition: the displayed HR below 50 at its start, then never back inside the
    // one-unit hysteresis band (≤ 50) until the raise
    for (const a of raises(mr, 'HR_LOW')) {
      const before = [1, 2, 3, 4, 5, 6].map((k) => hr(Math.floor(a.t) - k));
      expect(before.every((v) => v <= 50), `raise at ${a.t}: ${before}`).toBe(true);
      expect(before.some((v) => v < 50), `raise at ${a.t}: ${before}`).toBe(true);
    }
  }, 120_000);

  it.fails('CVP limit chatter on a stable ventilated patient: CVP_M_HIGH raised ≤ 2 times in the 11-min MANUAL rhythm tour (the audit\'s chatter criterion) — measured 11 on philips-like (9 on mindray-like; 5 in the A1 MAP ladder; 1 in the G1 hover, was 100): the displayed CVP swings 9–11 across the limit 10 with the ventilation and the rhythm changes, wider than D9\'s one-unit hysteresis (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5)', async () => {
    const tour: Step[] = [
      [60, M.rhythm('sinus', { rateBpm: 30 })], [120, M.rhythm('sinusBrady', { rateBpm: 35 })], [180, M.rhythm('junctionalEscape', { rateBpm: 40 })],
      [240, M.rhythm('afib', { rateBpm: 140 })], [300, M.rhythm('vtMono', { rateBpm: 180 })], [360, M.rhythm('sinus', { rateBpm: 75 })],
      [420, M.rhythm('avb3Wide', { rateBpm: 32 })], [480, M.rhythm('pacedVVI', { pacer: { ratePpm: 70 } })], [540, M.rhythm('sinusTachy', { rateBpm: 187 })], [600, M.rhythm('sinus', { rateBpm: 75 })],
    ];
    const run = await monitorRun({ mode: 'manual', tEnd: 660, steps: [...VENTED, ...tour] });
    expect(raises(run, 'CVP_M_HIGH').length).toBeLessThanOrEqual(2);
  }, 120_000);

  it('MODELED core 37 → 34 °C: the TEMP LOW text carries one decimal ("**Temp 35.9<36.0", was "**Temp 36<36")', async () => {
    const pin = (c: number) => (e: unknown) => {
      (e as { st: { resp: { temp: { pinCoreTemp: number } } } }).st.resp.temp.pinCoreTemp = c;
    };
    const run = await monitorRun({ mode: 'modeled', tEnd: 400, steps: [...VENTED, ...[0, 1, 2, 3, 4, 5].map((i) => [60 + 60 * i, pin(37 - (3 * i) / 5)] as Step)] });
    const t = raises(run, 'TEMP_LOW')[0];
    expect(t?.text).toMatch(/^\*\*Temp 3\d\.\d<36\.0$/);
  }, 120_000);
});

describe('FU-5 fidelity 14: Silence per vendor (asystole at 30 s, Silence at 45 s, VF at 60 s)', () => {
  it.each([['philips-like', 'acknowledge'], ['mindray-like', 'acknowledge'], ['saadat-like', 'mute']] as const)('%s (%s): the new VFIB during the silence sounds and is shown', async (skin, mode) => {
    const run = await monitorRun({ mode: 'manual', skin, tEnd: 90, steps: [...VENTED, [30, M.rhythm('asystole')], [45, M.alarm('silence')], [60, M.rhythm('vfCoarse')]] });
    const r50 = run.rows.find((r) => r.t === 50) as MonRun['rows'][number];
    if (mode === 'acknowledge') {
      expect(r50.silencedUntil).toBeNull(); // no mute timer: the ASYSTOLE is acknowledged
      expect(r50.active.find((a) => a.id === 'ASYSTOLE')).toMatchObject({ acked: true, sounding: false });
    } else expect(r50.silencedUntil).toBeGreaterThan(160);
    const vf = raises(run, 'VFIB')[0] as { t: number };
    const after = run.rows.find((r) => r.t >= vf.t + 1) as MonRun['rows'][number];
    expect(after.silencedUntil).toBeNull(); // saadat-like: any new alarm ends the silence
    expect(after.active.find((a) => a.id === 'VFIB')).toMatchObject({ acked: false, sounding: true });
  }, 120_000);
});

describe('FU-5 fidelity 15: a stable patient starts quietly', () => {
  it.each(['philips-like', 'mindray-like', 'saadat-like'])('%s: no alarm raised in the first 15 s (was **etCO2 0<30 and **ABPd 0<50 at 1 s)', async (skin) => {
    const run = await monitorRun({ mode: 'modeled', skin, tEnd: 20, steps: [...VENTED] });
    expect(run.alarms.filter((a) => a.state === 'raised' && a.t < 15).map((a) => a.id)).toEqual([]);
  }, 120_000);
});
```


- [ ] **Step 2: Run**

```bash
cd packages/engine-core && npx vitest run test/engine/fidelity-resp.test.ts test/engine/fidelity-nibp.test.ts test/engine/fidelity-alarms.test.ts   # ≈ 45 s
```

Expected: 19 passed (8 + 3 + 8).

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/fidelity-resp.test.ts packages/engine-core/test/engine/fidelity-nibp.test.ts packages/engine-core/test/engine/fidelity-alarms.test.ts
git commit -m "FU-5 Task 14: fidelity suite items 6-11, 14, 15 (apnoea, impedance, disconnect, desaturation lag, NIBP, limits, Silence, start-up)

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 15: Integrated verification — every suite, the SLOW set, the tick bench, the after-report (no code expected; R45 procedure if anything moves)

All R45 re-statements the prototype needed are already in Tasks 2–12 (listed in each task and in the gate note). This
task proves the whole tree and records the AFTER numbers.

**Files:** none unless a test moves (then: the test file only, per R45 — a re-measured number in the title, or
`it.fails` with the number; never a widened band).

- [ ] **Step 1: Everything, fast and slow**

```bash
npx -y pnpm@9.15.9 typecheck
CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 -r --no-bail test > <scratchpad>/fu-5-monitor-fidelity/fast.log 2>&1
(cd packages/engine-core && CI=1 PME_TEST_SET=slow npx vitest run) > <scratchpad>/fu-5-monitor-fidelity/slow.log 2>&1
(cd packages/validation && npx vitest run test/perf/tick-bench.test.ts)
```

Run each long command in the background with its log and a bounded wait (≤ 10 min per wait, re-check the process).
Expected (prototype, all tasks, local machine, 2026-09-28, BEFORE the R50 fixes): audio 58, skins 183, engine-core
fast 249 files / 1 114 passed / 1 skipped, ventilator 88, controller 215, renderer 25 files / 85 (fu5-tiles' 4
included), validation 107 passed / 11 skipped, demo 141. The R50 fixes change the counts (the fixer ran only the
touched files: skins 179 — fu5-skins' per-skin removal case became two data cases; renderer 85; engine-core
`test/l3` + `alarms-engine` 152 — fu5-conditions +2, fu5-technical +1, numerics +2; the six `fidelity-*` files
55 tests in 55 s, the `it.fails` rows failing as expected): record the full counts the run prints; the slow set passes including `hemo-nibp`, `circ-hypoxic-arrest`, `circ-manual-cvp-peep`
(with Task 2's and Task 9's re-statements) and the six `fidelity-*` files; `truth-event` "future tree (12 drugs): 2028
leaves". The tick bench p50 stays < 2 ms locally (FU-5 adds `buildConditions`/`stepAlarms` work per tick; record the
number). A timing test can fail on a loaded machine (`truth-event` "< 0.2 ms per call"): re-run the file alone before
treating it as a regression.

- [ ] **Step 2: The after-report**

```bash
npx -y pnpm@9.15.9 audit:monitor > <scratchpad>/fu-5-monitor-fidelity/after.txt 2>&1
sed -n '/## Fidelity report/,$p' <scratchpad>/fu-5-monitor-fidelity/after.txt
```

Expected: the "after" column of "Prototype results" (seed 7: to the unit). Copy `before.txt`'s and `after.txt`'s
report sections into `docs/gates/fu-5/audit-report-before.txt` / `-after.txt` for the gate note (text files, small).

- [ ] **Step 3: If FU-4 has merged meanwhile** (`git fetch origin && git log --oneline origin/main | grep -i "fu-4"`):
  merge now (`git merge origin/main`, keep both sides in the shared files listed in Global Constraints), re-run Steps 1–2,
  and record in the gate note which fidelity numbers moved with the new truth (the bleed and Ali's case arrest in FU-4;
  the device criteria must still hold — they are about what the monitor shows, whatever the truth). Name these checks
  (review F9, Orchestrator ruling (FU-5 review), 2026-09-28, ruling 6): (a) fidelity-lowflow's two runs assert "no red
  and no technical raise/clear cycle shorter than 5 s" — on the merged tree this is the guard against the agonal
  EXTREME BRADY chatter the review measured (A2 ×11, A1m ×7 before the agonal hold); also read `audit:monitor`'s A2
  and A1m alarm logs for EXTREME_BRADY/ASYSTOLE counts and write them into the gate note; (b) fidelity-lowflow's
  pleth ≤ 25 % criterion was 3 points from failing on FU-4's truth in the review's merge (A1m pleth 22 %, A2 3 %; its
  baseline window t 30–60 s is the ventilated state) — if it fails, report it with the number (R45), never widen it;
  (c) FU-4's clinical suite must read the truth SaO2, not the displayed SpO2 with `?? -1` (R-FU5-10).

- [ ] **Step 4: Commit** (only the report copies, and any R45 re-statement the run forced)

```bash
git add docs/gates/fu-5/audit-report-before.txt docs/gates/fu-5/audit-report-after.txt
git commit -m "FU-5 Task 15: integrated verification — audit:monitor before/after reports

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 16: Fidelity suite on the live monitor — Playwright, Chromium only (items 1, 5, 6 📷; PROTOTYPED)

The audit's 📷 items on the stage 4b demo page (the renderer's DeviceUI tiles and alarm header, time × 4), per skin
(philips-like, saadat-like): DOM assertions on the tiles and `.pme-bar`, plus one screenshot per state and skin into
`docs/gates/fu-5/` (PNG ≤ 60 KB: viewport 1100 × 560, `deviceScaleFactor` 0.7 — at 0.8 saadat-like's screens measured 64–66 KB). The test is skipped on WebKit (heavy
evidence run, the G7g rule).

**Files:**
- Create: `apps/demo/e2e/fu5-fidelity.e2e.ts`

- [ ] **Step 1: Create the test**

**Create `apps/demo/e2e/fu5-fidelity.e2e.ts`:**

```ts
// FU-5 monitor-fidelity suite on the LIVE monitor (research/10 §13 items 1, 5, 6 marked 📷): the stage 4b demo page
// with the DeviceUI tiles and alarm header, per skin (philips-like, saadat-like), at time × 4. DOM assertions on the
// tiles and `.pme-bar`, plus one screenshot per state and skin for docs/gates/fu-5 (PNG ≤ 60 KB).
// Chromium only: minutes of simulated time per skin (G7g rule).
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fu5-fidelity.e2e.ts
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-5');
test.use({ viewport: { width: 1100, height: 560 }, deviceScaleFactor: 0.7 }); // saadat-like's busier screen is 64–66 KB at 0.8
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Status = { type: string; t: number; active?: Array<{ id: string; latched: boolean; acked: boolean }> };
type Hook = { pm: { setTimeScale(k: number): void }; send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; events: Status[] };
const hook = (page: Page) => page.evaluate(() => Boolean((window as unknown as { __pme4b?: { ready: boolean } }).__pme4b?.ready));
const send = (page: Page, c: Record<string, unknown>) => page.evaluate((c) => (window as unknown as { __pme4b: Hook }).__pme4b.send(c), c);
const status = (page: Page) => page.evaluate(() => {
  const ev = (window as unknown as { __pme4b: Hook }).__pme4b.events.filter((e) => e.type === 'alarmStatus');
  return ev.length ? ev[ev.length - 1]! : null;
});
const simT = async (page: Page) => (await status(page))?.t ?? -1;
const until = async (page: Page, t: number) => {
  await expect.poll(() => simT(page), { timeout: 300_000, intervals: [500] }).toBeGreaterThanOrEqual(t);
};
const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event });
const VENT = ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
const tile = (page: Page, p: string, k: 'v' | 's' | 'lbl') => page.locator(`.pme-stile[data-param="${p}"] [data-pme="${k}"]`);
const shot = async (page: Page, name: string) => page.locator('#monitor').screenshot({ path: resolve(out, name) });

async function open(page: Page, skin: string) {
  await page.goto(`${base}/stage4b-device.html?skin=${skin}`);
  await expect.poll(() => hook(page), { timeout: 30_000 }).toBe(true);
  await page.evaluate(() => (window as unknown as { __pme4b: Hook }).__pme4b.pm.setTimeScale(4));
  await send(page, ev({ kind: 'airwayDevice', device: 'ett' }));
  await send(page, VENT);
  await send(page, { type: 'attachSensor', sensor: 'co2', state: 'on' });
}

for (const skin of ['philips-like', 'saadat-like']) {
  test.describe(`FU-5 fidelity on the live monitor (${skin})`, () => {
    test.skip(({ browserName }) => browserName === 'webkit', 'heavy evidence run: Chromium only (G7g rule)');

    test('suite 1 — low flow: after a 3 L bleed the SpO2 tile is never a plain number and an SpO2 INOP stands', async ({ page }) => {
      test.setTimeout(420_000);
      await open(page, skin);
      await send(page, { type: 'setMode', mode: 'modeled' });
      await until(page, 20);
      await send(page, ev({ kind: 'bleed', volumeMl: 3000, overS: 180 }));
      await until(page, 330);
      await expect(tile(page, 'SpO2', 'v')).not.toHaveText(/^\d+$/);
      expect((await status(page))?.active?.some((a) => a.id === 'spo2LowPerf' || a.id === 'spo2NonPulsatile')).toBe(true);
      await shot(page, `fu5-lowflow-${skin}.png`);
    });

    test('suite 6 — a 60 s apnoea, then the ventilator: one APNEA; philips-like keeps it LATCHED in the message rotation (framed, no red lamp) until acknowledged, saadat-like clears it', async ({ page }) => {
      test.setTimeout(300_000);
      await open(page, skin);
      await until(page, 30);
      await send(page, ev({ kind: 'ventilation', source: 'none' }));
      await until(page, 90);
      expect((await status(page))?.active?.filter((a) => a.id.startsWith('apnoea')).length).toBe(1);
      await send(page, VENT);
      await until(page, 160);
      const bar = page.locator('.pme-bar');
      // philips-like rotates every unacknowledged message every 2 s (review ruling 4, [S2] IFU p. 29–30): sample the bar
      // for 8 s (sim ≈ 32 s at × 4) and read text, latching and lamp together
      const sample = async (ms: number) => {
        const out: Array<{ text: string; latched: string | null; lamp: string | null }> = [];
        for (let w = 0; w < ms; w += 250) {
          out.push(await page.evaluate(() => ({
            text: document.querySelector('.pme-bar')?.textContent ?? '',
            latched: document.querySelector('.pme-bar')?.getAttribute('data-latched') ?? null,
            lamp: document.querySelector('.pme-lamp')?.getAttribute('data-lamp') ?? null,
          })));
          await page.waitForTimeout(250);
        }
        return out;
      };
      if (skin === 'philips-like') {
        const before = (await sample(8000)).filter((x) => /APNEA/.test(x.text));
        expect(before.length).toBeGreaterThan(0); // in the rotation
        expect(before.every((x) => x.latched === 'true' && x.lamp !== 'red-flash')).toBe(true); // latched, no red lamp
        await expect(bar).toContainText('APNEA', { timeout: 10_000 });
        await shot(page, `fu5-latched-apnoea-${skin}.png`);
        await send(page, { type: 'device', action: { device: 'alarm', action: 'ack' } });
        await page.waitForTimeout(1000);
        expect((await sample(4000)).filter((x) => /APNEA/.test(x.text))).toEqual([]);
      } else {
        await expect(bar).not.toContainText('APNEA');
        await shot(page, `fu5-latched-apnoea-${skin}.png`);
      }
    });

    test('suite 5 — ECG leads off under a red APNEA: LEADS OFF is shown in the bar; HR "-?-" (philips-like) or relabelled PR (saadat-like), never "0"', async ({ page }) => {
      test.setTimeout(300_000);
      await open(page, skin);
      await until(page, 20);
      await send(page, ev({ kind: 'ventilation', source: 'none' }));
      await until(page, 50);
      await send(page, { type: 'attachSensor', sensor: 'ecg', state: 'off' });
      await until(page, 58);
      const leads = skin === 'philips-like' ? 'ECG LEADS OFF' : 'ECG CHECK LA/RA/LL';
      await expect(page.locator('.pme-bar')).toContainText(leads, { timeout: 20_000 });
      if (skin === 'philips-like') await expect(tile(page, 'HR', 'v')).toHaveText('-?-');
      else {
        await expect(tile(page, 'HR', 'lbl')).toHaveText('PR');
        await expect(tile(page, 'HR', 'v')).toHaveText(/^\d+$/);
      }
      await expect(tile(page, 'HR', 'v')).not.toHaveText('0');
      await shot(page, `fu5-leadsoff-${skin}.png`);
    });
  });
}
```


- [ ] **Step 2: Run**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fu5-fidelity.e2e.ts
wc -c docs/gates/fu-5/fu5-*.png
```

Expected: 6 passed (3 items × 2 skins; ≈ 5 min on one worker, each test ≤ 1.5 min at × 4). Item 1: at sim 330 s after
a 3 L bleed over 180 s the SpO2 tile is "-?-" / "---" or a "…?" value, never a plain number, with SpO2 LOW PERF or
NON-PULSAT. active (philips-like measured "-?-", ***ABP DISCONNECT on the bar, ART "---/--- (2)" on the first
prototype — after review ruling 3 philips-like keeps the flat line's S/D, e.g. "3/1 (2)": re-measure and write the
tile text the executor sees into the gate note; the test asserts only the SpO2 tile). Item 6: exactly one
apnoea alarm at sim 90 s; after the ventilator resumes, philips-like's bar keeps "***APNEA" LATCHED in its 2 s rotation
(every APNEA sample over 8 s wall is `data-latched` true and never with the red lamp — a live yellow RR/etCO2 LOW may
share the rotation, review ruling 4) until `ack`, after which no APNEA appears for 4 s; saadat-like's bar has no
APNEA. Item 5: the bar shows "ECG LEADS OFF"
(philips-like) / "ECG CHECK LA/RA/LL" (saadat-like) under the red apnoea; HR tile "-?-" (philips-like) or labelled
"PR" with a number (saadat-like), never "0". Six PNGs `fu5-{lowflow,latched-apnoea,leadsoff}-{philips,saadat}-like.png`,
33–55 KB each on the prototype (33 108 – 54 755 bytes) (at `deviceScaleFactor` 0.8 the saadat-like ones were 64–66 KB). A test that times out
on `open()` or `page.goto` is the machine (three workers on a loaded Mac timed out 8 of 14 once): re-run with
`--workers=1` before treating it as a failure.

- [ ] **Step 3: Commit** (the test; the PNGs are committed by the gate task after inspection)

```bash
git add apps/demo/e2e/fu5-fidelity.e2e.ts
git commit -m "FU-5 Task 16: fidelity suite on the live monitor (low flow, latched apnoea, leads off; per skin, Chromium only)

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 17: The FU-3 latched-alarm screenshot, reproduced and fixed — Playwright, Chromium only (G-FU3 ruling 7; PROTOTYPED)

FU-3's evidence run (`apps/demo/scripts/fu3-neuro-tiles-shots.mjs`: the 7f page, the induction script, sim ≈ 460 s,
philips-like) showed a red, live-looking, audible "APNEA (RESP)" while the ventilator breathed. The same run on the FU-5
tree, as an e2e: the bar never shows "APNEA (RESP)", at most one APNEA text appears, and once the bag and ventilator
breathe (the bag from sim 180 s; the capnograph sees breaths by ≈ 186 s), an APNEA on the bar from sim 190 s is the
LATCHED one — `data-latched="true"`, never with the red lamp — on philips-like, and it stays in the 2 s message
rotation beside the live yellow `**ABPs` limit alarm until the end of the run (the test asserts an APNEA sample at
sim ≥ 440 s; Orchestrator ruling (FU-5 review), 2026-09-28, ruling 4 — before the fix the live yellow took the single
bar from ≈ 195 s), while saadat-like shows none. The test logs the spans the gate note quotes. The acknowledge that clears it is covered by Task 16's latched-apnoea test (the 7f page
has no alarm keys).

**Files:**
- Create: `apps/demo/e2e/fu5-latched.e2e.ts`

- [ ] **Step 1: Create the test**

**Create `apps/demo/e2e/fu5-latched.e2e.ts`:**

```ts
// FU-5: the FU-3 gate screenshot reproduced and fixed (G-FU3 ruling 7; research/10 §0 item 2). FU-3's evidence run
// (apps/demo/scripts/fu3-neuro-tiles-shots.mjs: the 7f page, the induction script, sim ≈ 460 s) showed a red,
// live-looking, audible "APNEA (RESP)" on philips-like while the ventilator breathed. After FU-5: one apnoea raised one
// "***APNEA" (the capnograph is the RR source), and once ventilation resumed it is shown LATCHED — framed, lamp off,
// silent — per the IntelliVue #H30 setting (research/05 §6 [S1] p. 135–136, [S2] p. 40); saadat-like does not latch.
// Chromium only (≈ 2 min of wall time per skin at × 4).
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-5');
test.use({ viewport: { width: 1000, height: 660 }, deviceScaleFactor: 0.8 });
test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

const simT = (page: Page) => page.evaluate(() => (window as unknown as { __simT?: number }).__simT ?? 0);

for (const skin of ['philips-like', 'saadat-like']) {
  test(`FU-3 screenshot, fixed (${skin}): the induction apnoea raises one APNEA, never "APNEA (RESP)"; after ventilation it is latched and stays in the message rotation (philips-like) or cleared, per vendor`, async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'heavy evidence run: Chromium only (G7g rule)');
    test.setTimeout(420_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}/stage7f.html?skin=${skin}`);
    await expect.poll(() => simT(page), { timeout: 30_000 }).toBeGreaterThan(1);
    await page.click('#induction'); // propofol at sim +120 s (apnoea), BVM at +180 s, ventilator at +330 s (× 4)
    const seen: Array<{ t: number; text: string; latched: string | null; lamp: string | null }> = [];
    while ((await simT(page)) < 460) {
      const bar = page.locator('.pme-bar');
      seen.push({ t: await simT(page), text: await bar.innerText(), latched: await bar.getAttribute('data-latched'), lamp: await page.locator('.pme-lamp').getAttribute('data-lamp') });
      await page.waitForTimeout(400);
    }
    expect(seen.filter((s) => /APNEA \(RESP\)/.test(s.text)).map((s) => s.t)).toEqual([]);
    expect(new Set(seen.filter((s) => /APNEA/.test(s.text)).map((s) => s.text)).size).toBeLessThanOrEqual(1);
    expect(seen.some((s) => /APNEA/.test(s.text) && s.latched !== 'true')).toBe(true); // the induction apnoea did alarm
    // once the bag breathes (from sim 180 s; the capnograph sees breaths by ≈ 186 s), an APNEA on the bar is the latched
    // one — framed, never with the red lamp; philips-like rotates every unacknowledged message every 2 s (review ruling 4,
    // [S2] IFU p. 29–30), so the latched APNEA stays in the rotation beside a live yellow ABP limit alarm until the end of
    // the run (before the fix the live yellow took the single bar from ≈ 195 s); saadat-like does not latch (live
    // ≈ 182–187 s, then nothing)
    const after = seen.filter((s) => s.t >= 190 && /APNEA/.test(s.text));
    if (skin === 'philips-like') {
      expect(after.length).toBeGreaterThan(0);
      expect(after.every((s) => s.latched === 'true' && s.lamp !== 'red-flash')).toBe(true);
      expect(after.some((s) => s.t >= 440)).toBe(true); // still in the rotation at the end of the run
    } else expect(after).toEqual([]);
    // the gate note quotes these spans (sim s): when the APNEA was live, when latched, and the bar at the end
    const span = (f: (s: (typeof seen)[number]) => boolean) => {
      const x = seen.filter(f).map((s) => s.t);
      return x.length ? `${x[0]!.toFixed(0)}–${x[x.length - 1]!.toFixed(0)} s` : 'none';
    };
    console.log(`[fu5-latched ${skin}] APNEA live ${span((s) => /APNEA/.test(s.text) && s.latched !== 'true')}; latched ${span((s) => /APNEA/.test(s.text) && s.latched === 'true')}; bar at the end "${seen[seen.length - 1]?.text ?? ''}"`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: resolve(out, `fu5-fu3-latched-${skin}.png`), clip: { x: 0, y: 0, width: 1000, height: 650 } });
    expect(errors).toEqual([]);
  });
}
```


- [ ] **Step 2: Run**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fu5-latched.e2e.ts
wc -c docs/gates/fu-5/fu5-fu3-latched-*.png
```

Expected: 2 passed (≈ 2 min each on one worker) and two log lines — measured on the prototype (three runs; the bar
is sampled every 400 ms of wall time, so the spans move by 1–2 s):
`[fu5-latched philips-like] APNEA live 182–187 s; latched 188–195 s; bar at the end "**ABPs 89<90"` and
`[fu5-latched saadat-like] APNEA live 183–184 s; latched none; bar at the end ""` on the FIRST prototype, where the live
yellow `**ABPs` limit alarm (propofol, MAP ≈ 69) took the single bar from the latched APNEA. After review ruling 4
philips-like's latched span runs to the end of the run — re-run by the fixer (philips-like, Chromium, 1.9 min):
`[fu5-latched philips-like] APNEA live 181–186 s; latched 188–457 s; bar at the end "**ABPm 69<70"` (the latched
APNEA alternating with the live yellow limit alarms every 2 s), PNG 50 118 bytes; saadat-like not re-run.
The harness equivalent (`metrics` over D1-apnoea, philips-like `barView`): the latched APNEA is on the bar in 104 of
the 116 rows in which it is active (the rest are the live RR LOW's turn), up to the end of the run at 300 s. PNGs `fu5-fu3-latched-{philips,saadat}-like.png` 50 217 / 51 302 bytes.
Compare with FU-3's `docs/gates/fu-3/fu3-neuro-tiles-philips-like.png` (the "before": a live-looking, audible
"APNEA (RESP)" at the same sim time).

- [ ] **Step 3: Commit**

```bash
git add apps/demo/e2e/fu5-latched.e2e.ts
git commit -m "FU-5 Task 17: the FU-3 latched APNEA screenshot reproduced on the 7f page and shown fixed

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
```

### Task 18: Gate — merge main, full verification, the gate note with the suite table and screenshots, the pull request

**Files:**
- Create: `docs/gates/fu-5.md`; `docs/gates/fu-5/*.png` (from Tasks 16–17), `docs/gates/fu-5/audit-report-{before,after}.txt` (Task 15)
- Modify: this plan (tick the boxes)

- [ ] **Step 1: Merge main and run everything**

```bash
git fetch origin && git merge origin/main          # FU-4 / V.1 may have landed: keep both sides (Global Constraints)
npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck
CI=1 PME_TEST_SET=fast npx -y pnpm@9.15.9 -r --no-bail test
(cd packages/engine-core && CI=1 PME_TEST_SET=slow npx vitest run)
npx -y pnpm@9.15.9 build
npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
git status --short docs/gates     # the e2e rewrites earlier stages' committed evidence images: restore them
git checkout -- $(git diff --name-only -- docs/gates | grep -v '^docs/gates/fu-5/')
wc -c docs/gates/fu-5/*.png       # every PNG ≤ 60 000 bytes
```

Background + bounded waits as in Task 15. Expected: all green; `check-notices: OK` (FU-5 adds citations in comments
and skin provenance, no third-party code or data); the e2e total is the base's plus FU-5's 8 (6 in fu5-fidelity, 2 in
fu5-latched), all Chromium-only ones skipped on WebKit. If FU-4 merged, re-run `pnpm audit:monitor` and put the new
after-report in the gate folder (Task 15 Step 3), with its A2 and A1m EXTREME_BRADY/ASYSTOLE counts and the
"no red or technical raise/clear cycle shorter than 5 s" result of fidelity-lowflow (review F9). **CI e2e budget
(Orchestrator ruling (FU-5 review), 2026-09-28, ruling 10):** record the PR's CI `build` job wall time and its e2e
share in the gate note; if the `build` job exceeds 45 min, move the fu5 evidence tests behind `PME_EVIDENCE=1`
(`test.skip(!process.env.PME_EVIDENCE, …)`, run locally for the gate with their PNGs committed), keep one smoke per
skin on CI (suite 6), and record it as a deviation.

- [ ] **Step 2: Write `docs/gates/fu-5.md`** with these sections (the FU-3 gate note is the model):
  1. **Summary** — base, merge commits, counts (fast/slow/e2e/validation), `check-notices`, tick-bench p50.
  2. **Fidelity suite table** — the 15 items: criterion, source tag, before (Task 1's report), after (Task 15's), the
     test that asserts it (`fidelity-*.test.ts` names, `fu5-*.e2e.ts`). Every row must be green or listed in 4.
  3. **Screenshots** — each PNG with bytes, `deviceScaleFactor`, the sim time and what it shows; embed them
     (`![…](fu-5/<name>.png)`). Beside `fu5-fu3-latched-philips-like.png` quote the FU-3 gate's finding (G-FU3 ruling 7:
     a latched "APNEA (RESP)" on philips-like while the ventilator breathes) as the before.
  4. **`it.fails` list** — the R50 review's (Orchestrator ruling (FU-5 review), 2026-09-28, rulings 1 and 5), with
     their numbers: ventilated-normal rest PI (1.49 vs 1.80), PI rise after propofol (1.49 → 1.17), saadat-like HR rise
     80 → 120 (9 s vs 8), NIBP S/D at PP 10 against 77/67 (80/56), NIBP in AF 150 against the true radial pressure
     (SBP +10.8), CVP limit chatter in the rhythm tour (11 vs ≤ 2); plus any the merged tree forced, with numbers.
  5. **R45 re-statements** — every existing test FU-5 edited, old → new title/expectation and the ruling or source
     behind it (Tasks 2, 4, 7–12: profile, manager, alarm-view, stage3-hooks ×3, alarms-engine age band, hemo-engine
     PR, numerics flat line, detector stub, fu1-layout, circ-manual-cvp-peep ×2, the 4b e2e ×2 (the philips-like Silence acknowledges; the flash test's HR 150 → 130); the
     alarms-engine age-band test re-stated WITHOUT an acknowledge (EXTREME TACHY at 3 s from the first HR average 144
     — the sinus-arrhythmia peak — then HR HIGH at 8 s once it ends; review rulings 2 and 7), and the review fixer's
     re-statements of FU-5's own new tests (fu5-conditions hover case, fu5-technical ABP case, alarm-view latched
     case, fidelity-arrest PEA, the two latched-APNEA e2e assertions — each with its ruling).
  6. **Deviations** — anything that differs from this plan (re-anchored blocks after the FU-4 merge, numbers that moved).
  7. **Open questions** — this plan's list with any answers Ali gave.
  8. **Coverage matrix (R54; research/12 §4.3 and §7 "Gate rule")** — one row per audit-10 cell FU-5 owns, re-measured
     on the merged branch by `pnpm audit:monitor` (the audit's own scenarios; the scenario that measures each cell is
     in brackets) with the verdict before (research/12's column) → after, and the test that now asserts it:

     | Cell | Gap | Scenario (harness) | Before | After (prototype, expected) | Asserted by |
     |---|---|---|---|---|---|
     | A10-A1 PI with vasoconstriction | M1 | A1-map-ladder, D3-induction | WR | the first plan's "PL (PI follows SV/SV₀ × tone)" is WITHDRAWN (review ruling 1: PI rose 1.92 → 2.18 as MAP fell). Re-measured after the fix: the MANUAL ladder PI falls with MAP (1.84 → 1.53 → 1.18 → 0.03) → PL for the ladder; the vasomotor direction (PI rises after propofol, falls with catecholamines/cold) is TW — PI follows SV only until FU-4's skin tone (R-FU5-9); write "TW (PI follows SV only)" unless FU-4's output has landed | fidelity-lowflow 1b (ladder; propofol `it.fails`) |
     | A10-A1t tracker floor | M1 / T4 | A1-map-ladder (the 18/10 step) | IN | device PL (SpO2 "?"/invalid with PI < 0.3); the MAP floor stays FU-4's (T4) | fidelity-lowflow |
     | A10-A1m bleed 3 L, SpO2 at low flow | M1 | A1m-map-ladder | WR | PL | fidelity-lowflow, fu5-fidelity e2e item 1 |
     | A10-A2 Ali's chain | M1 | A2-ali-b7 | WR | PL | fidelity-lowflow |
     | A10-A4 VF/asystole/PEA SpO2 INOP | M8 | A4-vf, A5-pea | MI | PL (SpO2 NON-PULSAT.) | fu5-technical, fidelity-arrest |
     | A10-A4c CPR "?" | M1 | A4-vf | WR | PL ("99?" drawn) | fu5-tiles, fidelity-arrest |
     | A10-A7a probe off, PR source | M12 | A7-probe | WR | PL (`pr` invalid, `prAbp` valid) | hemo-engine (R45), fu5-tiles |
     | A10-A7b motion "?" | M1 | A7-probe | WR | PL | fu5-tiles |
     | A10-A8 desaturation display | M15 | A8-desat-finger | PL (0 % shown) | PL, unchanged (Open question 14) | fidelity-resp item 9 |
     | A10-B4 VF chaining | M7 | A4-vf(-mr) | WR | PL (0 chained raises) | fu5-conditions, fidelity-arrest |
     | A10-B5 asystole chaining | M7 | A6-asystole | WR | PL | fidelity-arrest item 4 |
     | A10-B7 PAUSE flicker | M13 | B1a-rhythms-arrOn, B1-rhythms-mr | WR | PL (held ≥ 5 s) | fu5-conditions, fidelity-ecg item 13 |
     | A10-B8 HR after asystole | M16 | B1-rhythms | WR | PL (no "3") | hr.test |
     | A10-B9 leads off | M3 | F1-leadsoff(-sa), F3 | WR | PL | fidelity-ecg item 5, fu5-fidelity e2e item 5 |
     | A10-C2 PEA stale beats | M5 | A5-pea | WR | PL (valid rows 61–63 s only) | numerics.test, fidelity-arrest item 2 |
     | A10-C3 flat-line indication | M5, M8 | A5-pea, A4-vf | MI | PL (ABP NON-PULSATILE; philips-like S/D/M of the flat line with the pulse "-?-", saadat-like static mean — review ruling 3) | fu5-technical, fidelity-arrest 2 |
     | A10-C5 over-damped line | — | C1-damp | TW | TW, unchanged (L2 transducer; Open question 18) | — |
     | A10-C8 NIBP PP ≤ 20 | M4 | C3-lowpp, A1m | WR | PL | nibp.test, fidelity-nibp item 10 |
     | A10-C11 CVP chatter | M6 | G1-hover, A1-map-ladder, B1-rhythms | WR | PL at the hover (100 → 1; 0 at the limit itself); outside it TW — 100 → 5 (A1), 87 → 11 (B1), 7 (A5), 9 (C2): the ventilatory swing crosses the limit (review F8, ruling 5; `it.fails`) | fu5-limits, fidelity-alarms item 11 |
     | A10-D2 one apnoea | M2 | D1-apnoea(-mr/-sa) | WR | PL (1 raise) | stage3-hooks (R45), fidelity-resp item 6 |
     | A10-D3 latching after resumption | M2 | D1-apnoea, F2-apnoea-ack | WR | PL (philips-like latched + silent; others cleared) | fu5-latching, fu5-fidelity/fu5-latched e2e |
     | A10-D4 impedance RR = HR | M10 | D4-apnoea-imp | WR | PL (RR {0, 1}) | impedance.test, fidelity-resp item 7 |
     | A10-D8 start-up alarms | M14 | every ventilated run | WR | PL (none < 15 s) | fidelity-alarms item 15 |
     | A10-D9 RR/awRR visibility | M10 | (renderer) | MI | PL (philips-like CO2 "awRR") | fu5-tiles |
     | A10-E2 TEMP LOW text | M6 | E1-temp | WR | PL ("**Temp 35.9<36.0") | text.test, fidelity-alarms item 11 |
     | A10-E3 temperature probe off | M8 | G2-probes | MI | PL (TEMP NO TRANSDUCER) | fu5-technical |
     | A10-F1 philips-like Silence | M9 | F4-silence-new | WR | PL (acknowledge; the new VFIB sounds) | fu5-latching, fidelity-alarms item 14, stage4b e2e |
     | A10-F2 arrest storm | M2, M7 | A4-vf | WR | PL | fidelity-arrest item 3 |
     | A10-F3 skin declarations | M11 | (skins) | MI | PL (wired or removed with a CONTRACT note) | fu5-skins, fu5-tiles |
     | A09-H6, A09-H11 (with FU-6) | R5 | — | TW / WR | H11's alarm flapping damped by D9's hysteresis and D6's chain; the EtCO2 window is FU-6's (R-FU5-3) | fu5-limits |

     Then the audit-10 PL cells FU-5 must not break (research/12 §7: a PL cell that changes is explained): A0, A5, A7c,
     A8e, B2, B6, B10, C1, C4, C6, C7, C9, C10, D1, D5, D7, E1, E4 — each "PL, unchanged" with the harness line that
     shows it (B10 = item 12's step times; C7/C9 = item 10's results; D5 = item 8). A10-B1/B3/D6 are FU-4's (their
     after-numbers move only with FU-4's truth) and A10-E5 is Stage 9's. The same table goes to the orchestrator for
     research/12's dated verdict column (R-FU5-7).
- [ ] **Step 3: Commit the gate note and screenshots; open the PR (never merge)**

```bash
git add docs/gates/fu-5.md docs/gates/fu-5
git commit -m "FU-5 gate: note, fidelity suite table, screenshots

<the Co-Authored-By trailer line from the executor's own session instructions>"
git push
gh pr create --base main --head fu-5-monitor-fidelity \
  --title "FU-5: monitor fidelity — signal quality, alarm semantics, technical alarms, NIBP, skins" \
  --body-file <scratchpad>/fu-5-monitor-fidelity/pr-body.md
```

The PR body: the goal paragraph, the task list with one line each, the suite table's before → after headline rows
(low-flow SpO2, one apnoea, leads off, NIBP narrow PP, ART in PEA, limit chatter), the R45 re-statement list, the open
questions, a link to `docs/gates/fu-5.md`, and it ENDS with the line
`🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Stop there: the orchestrator inspects the gate and
Ali speaks the merge.

## Open questions (for Ali / the orchestrator; the plan does not wait on them)

The audit's 13 questions (research/10 §14) with what the plan decided. "Decided by the manual" = a vendor document
answers it; "confirm with Ali" = the plan chose from the manual or the ruling, and Ali's bench check can change DATA
(skin JSON), never code. After the R50 review (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 8): **for Ali** —
1 (which IntelliVue option his unit runs), 2, 3, 4, 5 (the failure rate), 9, 11 (the Saadat text), 12, 14, 16;
**decided** — 1 (presentation), 6, 7, 8, 13, 15, 19; **FU-4** — 10; **Stage 9 or a later FU** — 17, 18; **new for the
orchestrator** — 20.

1. **Latching** (audit Q1). Decided by the manual for Philips: the #H30 (OR) factory setting is visual latching Red,
   audible Off ([S1] p. 135–136); Mindray's default is non-latching ([S4] §39.4.3); Saadat: non-latching (research/06,
   unverified); the other skins follow the ruling (lethal arrhythmias latch visually). #H30 is the anaesthesia option;
   the ICU/neonatal/cardiac options (#H10/H20/H40) latch Red&Yellow visually and audibly ([S1] p. 42). **Confirm with
   Ali:** is his IntelliVue on the #H30 defaults (or an ICU option), and does his B9 latch anything? **The presentation
   is DECIDED (Orchestrator ruling (FU-5 review), 2026-09-28, rulings 4 and 8):** the latched style is [ruling]; a
   latched red stays in philips-like's 2 s rotation of every active message beside a live yellow ([S2] p. 29–30, 40),
   never below or hidden (D15); the lamp and the tone come from live entries.
2. **Low flow** (Q2). Decided by the manual for Philips: LOW PERF keeps the value with "?" ([S2] p. 58, "Label is
   displayed with -?-" — questionable), NON-PULSAT. replaces it with "-?-"; the PI falls with the pulse (D1). **Confirm
   with Ali:** at MAP < 30 with an organised ECG, which message does his monitor show first, and how fast?
3. **VF and asystole** (Q3). Decided by the manual: one announced alarm per chain ([S2] p. 99), so no HR HIGH/LOW beside
   VFIB/ASYSTOLE. Not decided: what the HR numeric shows in VF (the plan leaves the detector's reading) — **confirm with
   Ali** ("-?-" or a jumping number).
4. **Leads off** (Q4). Decided by the manual for Philips: HR "-?-" ([S2] p. 55), the pulse becomes the alarm source
   ([S1] p. 50 Alarms Source Auto; [S2] p. 108), the HR tile keeps its label; Saadat relabels "PR" (research/06 §4.1).
   Single bar: LEADS OFF rotates in (D15), per the B.0 IFU ([S2] p. 29–30); later IntelliVue releases draw separate
   alarm and INOP fields [unverified]. **Confirm with Ali:** does his IntelliVue show INOPs in a separate area? (A
   photo decides whether philips-like gets `split`.) mindray-like's HR/PR source is now Auto ([S4] C.1.1.1/C.1.3).
5. **NIBP at a narrow PP** (Q5). The plan's model measures 85/70 (PP 15) and fails at MAP 13 / PP 3. The S/D accuracy
   is DECIDED as a measured `it.fails` (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 5): at the instructor's
   77/67 the cuff reads 80/56 (the truth reaches only 81/62) — Task 14. **Confirm with Ali** only the failure RATE:
   how often his cuff fails at 85/70.
6. **Silence and ReAlarm** (Q6) — DECIDED (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 8). Philips Silence
   acknowledges, new alarms sound at once, no countdown ([S2] p. 11, 32); Mindray Alarm Reset the same ([S4] §10.8).
   The Philips Alarm Reminder's factory default is ON, 3 min (a tone repeat for an acknowledged alarm still present,
   [S1] p. 135, 141) — the vendor default, recorded; not modelled in FU-5 (Q17 → Stage 9 or a later FU).
7. **Apnoea sources** (Q7) — DECIDED (ruling 8): one "***APNEA" from the active source ([S2] p. 41; Saadat's
   CAPNO/RESP selects one source); cardiac overlay rejected at the heart period ([S2] p. 112–113, D13). Ali's bench
   observation (RR on impedance only in a paralysed apnoeic patient) would only refine D13's [ENG] fractions.
8. **Chatter** (Q8) — DECIDED (ruling 8): the displayed value with one display unit of hysteresis [ENG]; philips-like
   has delay 0 (Philips publishes none), so an HR wandering 49–51 on a limit of 50 re-alarms 4 times in 3 min — a
   characterisation row (Task 14); mindray-like applies its documented 6 s delay (asserted as a mechanism; 4 raises
   too, each dip > 6 s). The CVP limit chatter outside the hover scenario is an `it.fails` (11 in the rhythm tour).
9. **SpO2 settings** (Q9). Decided by the manuals for Philips: average 10 s ([S1] p. 66), display update 2 s ([S2]
   p. 301). **Confirm with Ali:** the SpO2 technology of his monitors (FAST, Masimo, Nellcor).
10. **EtCO2 in VF** (Q10) → FU-4 (ruling 8): truth (FU-4 Task 17), not FU-5; Task 17's merged-tree run records it
    (the review's merge showed EtCO2 11–21 under CPR).
11. **Temperature probe off** (Q11). Decided by the manual for Philips: "<Temp label> NO TRANSDUCER" ([S2] p. 62);
    Saadat "TEMP NO CABLE" is [inferred] — **confirm with Ali** (photo).
12. **Saadat asystole 5 s or 10 s; RESP APNEA 10 s** (Q12). The skin keeps 10 s (research/06's ECG chapter) and RESP 10
    s. The HR rise 80 → 120 is now an `it.fails` with its number (ruling 5): 9 s to the settle rule (the review: 10 s)
    against the B9 manual's 6 s at the 8 s window — **confirm with Ali** (stopwatch) before the Saadat averaging is
    touched.
13. **Philips OR, arrhythmia analysis off** (Q13) — DECIDED and CLOSED (ruling 8): EXTREME BRADY/TACHY still alarm
    (red) with arrhythmia analysis off ([S2] p. 89) — implemented (D7).
14. **SpO2 at SaO2 1–10 % with a pulse** (audit M15; FU-4's G14 hand-over). Philips' measurement range is 0–100 %
    ([S2]), so the plan leaves the display; with no pulse the value is `--` (D2). **Confirm with Ali:** does his
    oximeter show single digits or "<20"/dashes in extreme hypoxaemia?
15. **Latched alarms and the chain — DECIDED (Orchestrator ruling (FU-5 review), 2026-09-28, ruling 2), removed from
    Ali's list.** Latched alarms do not suppress: Philips inhibits lower alarms only "if a more serious alarm condition
    is active" ([S2] p. 97, 99), and a latched alarm's condition has ended — a post-ROSC bradycardia under a latched
    ASYSTOLE alarms and sounds (D6; fu5-conditions asserts it).
16. **Texts marked [inferred]** (Saadat "SPO2 NO PULSE", "IBP1 ZEROING", "TEMP NO CABLE"; IEC "ABP ZEROING") — Ali's
    B9 photos (research/06 §7) would replace them.
17. **Not modelled, recorded** → Stage 9 or a later FU (ruling 8): the Philips Alarm Reminder (factory On, 3 min), the
    Saadat alarm recall and Alarm Freeze, yellow arrhythmia timeouts (brief §6.4: 3 and 10 min), SVT, "up to 8 R–R
    intervals during PVC runs" (brief §6.1), and silencing some Philips INOPs switching the measurement off (TEMP/ABP
    NO TRANSDUCER, CO2 NO TUBING, [S2] p. 57, 62, 71). None is claimed by a behaviour field after FU-5 (CONTRACT.md;
    the NIBP mode fields are kept as documented data, "recorded, not modelled").

18. **Over-damped arterial line** (research/12 A10-C5, TW, not an audit-10 question). ζ 1.2 at the default natural
    frequency reads 134/91 against a true 136/90 (−2/+1 mmHg); a clinically over-damped line loses more systolic and
    the dicrotic notch. The damping is the L2 transducer model (`l2/hemo/line.ts`), which the FU-5 boundary leaves
    untouched (E-FU5-4 is the display filter only). → Stage 9 or a later FU (ruling 8): a DEVICE-SIGNAL item, not
    physiology (not FU-4): a follow-up exception on `l2/hemo/line.ts`'s damping preset — clinical over-damping lowers
    fn as well as raising ζ, so the "damped" preset should lower fn — or Stage 9's teaching presets; Ali's
    "square-wave test" photo is optional.
19. **Labels under the IEC text table** (D19, R56) — DECIDED (ruling 8): labels follow the vendor — "ABP" on
    philips-like, "Art" on mindray-like ([S4] C.1.6), saadat-like per research/06; Stage 9 applies them (R-FU5-6);
    Ali may override in the glossary review.
20. **NEW (fixer, for the orchestrator): a bounded chain timeout?** With latched alarms suppressing nothing (ruling 2),
    an HR hovering 136–141 on philips-like's extreme-tachy threshold alternates EXTREME TACHY live/latched with 1–3 s
    `**HR` HIGH blips (Ali's case A2 ×7 at 2 937–2 999 s; A8/A8e ×4), and a flickering impedance APNEA lets RR LOW
    through while it is latched (D4 ×2). The 5 s extreme clear delay removed the AF 150 case (13 → 3). Philips' p. 99
    also inhibits lower alarms "during the configured timeout period"; a 5 s hold for YELLOW chain members after a red
    parent stops being live would remove these blips, but it would let a just-latched alarm suppress for 5 s, against
    ruling 2's "never". The plan does not add it; decide whether to (then an [ENG] 5 s, yellow members only, the red
    members — VTAC after VF, EXTREME BRADY after ASYSTOLE — untouched).

## Self-review

- **Coverage of the audit (research/10 §10–§14):** M1 (Tasks 3, 11; D1, D2), M2 (Tasks 2, 8, 12, 17; D3, D5), M3
  (Tasks 7, 8, 11, 12; D8, D15), M4 (Task 5; D12), M5 (Tasks 4, 10; D11), M6 (Task 9; D9), M7 (Task 8; D6), M8
  (Tasks 10, 11; D10), M9 (Tasks 2, 12; D4), M10 (Task 6; D13), M11 (Tasks 2, 11, 12; D14, D19), M12 (Tasks 4, 11),
  M13 (Task 8; D17), M14 (Tasks 6, 9; D17), M15 (not changed — Open question 14), M16 (Task 7). The 15 suite items:
  Task 3 (1), Task 13 (2–5, 12, 13), Task 14 (6–11, 14, 15), Task 16 (1, 5, 6 on the live monitor), Task 17 (the
  FU-3 screenshot, G-FU3 ruling 7); the harness is Task 1 (D18). The audit's 13 questions are Open questions 1–13
  (decided by a manual where one answers, "confirm with Ali" otherwise); T1–T8 (truth) are R-FU5-1 to FU-4.
- **The rulings:** "FU-5 opened" (latching per vendor, IEC lethal-visual default, one condition one alarm, chained
  suppression, technical alarms) → D3–D10; the FU-4 boundary → E-FU5-1…7, nothing in `l1/**` or other `l2/**` lines;
  G15 (SpO2 at MAP 13, dropped by FU-4 to FU-5) → Task 3; FU-4's G14 hand-over → Open question 14; R54's gate rule →
  Task 18 §8 and R-FU5-7 (every audit-10 cell FU-5 owns, research/12 §4.3); R56 and the glossary collision rulings →
  D19 and Task 11 (labels "PR", "PI", "awRR", "T2", "ΔT", "ST-II", "BS%" as the B9 alias of SR, the "PR" relabel;
  no CPP/CoPP, FO2Hb/SaO2 or RR/R–R label is introduced, and the plan's prose writes the R–R interval "R–R");
  research/11 §4 item 7 (declared-never-computed extras) → Task 11 (drawn or removed with a CONTRACT note), item 6
  (oliguria flag) → R-FU5-8 (organs, not FU-5), item 8 (untiled numerics) → R-FU5-6 (Stage 9).
- **Find blocks (mechanical check, the FIRST prototype — superseded by the R50-fix check below):** `verify.py` (kept with the backup) parses every Modify/Create block of this
  document in order, applies them to a clean checkout of `origin/main` `94040f7` (= `4f4ce06` + docs), requiring each
  find to match EXACTLY ONCE at its point in the sequence, then compares the tree with the prototype's (the skins
  snapshot excluded: Task 2 Step 6 regenerates it): **236 blocks (215 edits, 21 creates), 0 problems — every find matched exactly once at its point in the sequence; the resulting tree is byte-identical to the prototype** (2026-09-28 ≈ 11:10). Seven finds end mid-line (the fenced block adds a newline the file does not have after the matched text): they match exactly once without that final newline, as an executor copying the text will apply them.
- **Full-prototype run (every task applied; local Mac shared with three other agents, 2026-09-28):** typecheck clean in
  every package; fast set — audio 58, skins 183, engine-core 249 files / 1 114 passed / 1 skipped, ventilator 88,
  controller 215, renderer 85, validation 107 passed / 11 skipped, demo 141; slow set (engine-core): 47 files / 222 passed in 1 112 s (the six `fidelity-*` files, `hemo-nibp`, `circ-hypoxic-arrest` and `circ-manual-cvp-peep` included); `truth-event` "future tree (12 drugs): 2028 leaves, 45223 B";
  tick bench: p50 0.62–0.66 ms, p95 0.87–1.13 ms over three runs (local bound 2 ms; the test notes 0.4 ms on an idle machine — this one was loaded); e2e (fu5-fidelity, fu5-latched, stage4b-device; Chromium, one worker): 14 passed in 11.0 min,
  every PNG ≤ 55 KB; `pnpm audit:monitor`: the "after" column of "Prototype results".
- **Changed on this (second) resumption, all re-run:** (1) D6's suppressor counts an unacknowledged LIVE entry too,
  not only a latched one — the after-report showed 22 zero-length `HR_HIGH` raise/clear pairs in Ali's case (one per
  tick in which EXTREME TACHY's condition ended before its entry latched), and HR_HIGH/HR_LOW/RR flickers in A8, C2,
  B1 and D4 went with it; a new fu5-conditions case fails on the old rule (15 raises) and passes on the new; the
  alarms-engine age-band test then needed an acknowledge (its first HR average reads 144, Task 8) — both superseded
  by the R50 fixes: latched entries suppress nothing, and the age-band test has no acknowledge (D6, Task 8). (2) The ST extra
  prints "ST-II" (glossary #22) and fu5-tiles asserts "ST-II -0.1" and "BS% 12". (3) The 4b e2e's two philips-like
  steps were re-stated (Task 12: Silence acknowledges; HR 150 is now EXTREME TACHY) — the plan's earlier "4 passed"
  had never run clean (the first e2e attempt timed out on a loaded machine with three workers). (4) fu5-fidelity
  screenshots at `deviceScaleFactor` 0.7 (saadat-like was 64–66 KB at 0.8). (5) fu5-latched asserts a latched APNEA
  exists from sim 190 s (it was vacuous from 240 s: the latched message had already given the bar to a live yellow
  alarm) and logs the spans. (6) Task 2 and Task 9 Files blocks now list `circ-manual-cvp-peep.test.ts` (their blocks
  edited it without the partition naming it). (7) `verify.py`'s parser was rewritten (its first version matched 0
  blocks). (8) Global Constraints: the tick bench is Task 15, not 17.
- **R50 review fixes (fixer, 2026-09-28, after the 11th cap; Orchestrator ruling (FU-5 review), 2026-09-28, rulings
  1–10; D20 lists where each landed).** Mechanical re-check: the plan's blocks re-applied in order to a clean
  `origin/main` `3dccb11` (a docs-only descendant of `94040f7`; the prototype worktree was on `cbefa63`) — **262 blocks
  (241 edits, 21 creates), 0 problems**; six finds are line fragments (they match once without the fence newline);
  the resulting tree is byte-identical to the fixer's prototype (the skins snapshot excluded — Task 2 Step 6 and the
  run regenerate it); typecheck clean on the full tree and cumulatively after Tasks 2, 3, 4, 8, 10 and 12 (the tasks
  that now carry cross-task fields: the skin switches are Task 2's, the profile fields Tasks 4 and 8's, the
  conditions Tasks 8 and 10's); `pnpm audit:monitor` on that tree reproduces the prototype's report line for line
  ("After the R50 review fixes"). Tests the fixer ran on the prototype (not the full suites): skins 179, renderer 85,
  engine-core `test/l3` + `alarms-engine` 152, the six `fidelity-*` files 55 in 55 s — all green, the `it.fails` rows
  failing as expected; e2e (system Chrome, 2 workers): fu5-latched philips-like and fu5-fidelity suite 6 on both
  skins, 3 passed in 2.0 min (PNGs 42 682 / 50 118 / 55 086 bytes). NOT run by the fixer: the fast/slow sets as a
  whole, the tick bench, the other five e2e tests (unchanged by the fixes apart from the rig they share). What changed in code: the
  pleth tone (≤ 1, MODELED only); `chain()` (condition present or entry live at the previous tick; latched never;
  position, not level) and the agonal ASYSTOLE hold (with the double-detection skip); the extreme alarms' 5 s clear
  delay; per-skin static display + REPULSE_AMP_MMHG 4 + `prAbp` from pulsatility; the rotating bar (`rotateAll`);
  the INOPs' clear hysteresis (LOW PERF also held through a momentarily invalid PI); the disconnect and PAUSE skin
  switches; mindray-like Auto/6 PVCs/Pause off; the NIBP mode data kept (lifepak-like is no longer touched); the
  fidelity rig's truth S/D; 11 new or re-stated tests.
- **Partition:** the 71 files the blocks touch (plus the regenerated snapshot) are exactly the Global Constraints list
  (lifepak-like left the list with the review fix); each task's Files block names the files its blocks touch. The e2e
  rewrites `docs/gates/stage-4b/*.png`; Tasks 12 and 18 restore them.
- **Residual behaviour the executor will see (not defects of the plan, recorded for Ali and the orchestrator):** the
  arterial line's pulsatile/static flip in Ali's case is gone (ABP NON-PULSATILE 10 → 1 with the amplitude
  hysteresis, the static line keeps its S/D on philips-like), but ART_M_LOW still raises 12 times there as the
  displayed mean hovers 69–71 on its limit 70 under PEEP 15, and CVP_M_HIGH chatters 5–11 times per run outside the
  hover scenario (the ventilatory swing is wider than D9's one-unit hysteresis — `it.fails` in Task 14); an HR
  wandering 49–51 on a limit of 50 raises 4 times in 3 min on philips-like and mindray-like (characterisation, Open
  question 8); with latched alarms suppressing nothing, an HR hovering at the extreme threshold produces 1–3 s
  `**HR` HIGH blips (A2 ×7, A8 ×4) and a flickering impedance APNEA lets RR LOW through (D4 ×2) — Open question 20;
  the normal ventilated patient's PI is 17 % below origin/main and PI falls after propofol until FU-4's skin tone
  (R-FU5-9; `it.fails`); the QRS detector fires twice (0.12 s apart) on a wide agonal complex — the agonal hold skips
  it, the HR numeric was not examined for it (a candidate for Stage 9's device review).
- **Not done here (by design):** anything in the truth (R-FU5-1), the transducer damping (Open question 18), the
  IEC text table's per-skin aliases (R-FU5-6, Stage 9), Philips ReAlarm / Saadat alarm recall and freeze / yellow
  arrhythmia timeouts (Open question 17), the oliguria flag (R-FU5-8).
