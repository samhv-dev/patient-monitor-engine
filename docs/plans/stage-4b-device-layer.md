# Stage 4b: Device Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the monitor behave like a specific device: an alarm engine (limits by age band, arrhythmia and technical alarms, IEC-style and Saadat-like priorities, silence/pause/acknowledge, latching), a defibrillator (energy, charge, sync, shock artefact, post-shock rhythm table) and a transcutaneous pacer (capture threshold, demand/fixed, faults) in the engine; the Stage 4a skins wired into the live renderer (lanes, tiles, alarm header, overlays, alarm sound and device tones, skin switch without restart); a 12-lead capture, 8 h trends and an event log; and a demo page with gate evidence.

**Architecture:** The device layer is L3 inside the engine (`packages/engine-core/src/l3/device-layer.ts` over `l3/alarms/**`, `l3/defib-pacer/**`): one JSON-safe state object beside the pipeline state, stepped once per committed tick with the events that became due, carried in snapshots, deterministic on the `outcome` PRNG stream. It changes the patient only through the committed state the engine already owns (Stage 5's `Modifiers.tcp` and `Modifiers.artefact.shock`, rhythm switches, L1 targets), so `l2/**` is untouched. It emits `alarm` events (with `level`), one `alarmStatus` summary (the renderer's single source for bar, lamp, tiles and alarm sound), `deviceStatus`, `marker` and `tone` events. The renderer turns a `ResolvedSkin` into a plain-data `RenderPlan` for the worker (lanes, colours, gain, grid, overlay styles) and a DOM header/tiles on the main thread; `setSkin` sends a new plan and a `device monitor skin` command, so the engine never restarts. `capture12`, `TrendStore` and `EventLog` are pure engine-core modules; the handle exposes them.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Playwright 1.63 against the installed Google Chrome (`PW_SYSTEM_CHROME=1`), Web Audio through Stage 4a's `@pme/audio`. No new third-party dependency (the one new edge is `@pme/skins` → `@pme/engine-core` and `@pme/renderer`, workspace packages). Node ≥ 22.12.

**Spec:** `docs/DESIGN-BRIEF.md` §3.5 (overlays), §3.6, §3.8 (skins), §6 (6.1–6.9: measured numerics, sensors, NIBP presentation, alarm model IEC-style and `saadat`, pacer/defibrillator/cardioversion, 12-lead capture, trends and event log, vendor defaults, Iranian practice), §7.2–§7.3 (commands and events); `docs/BUILD-PLAN.md` "Stage 4" (this plan is **4b**; 4a shipped skins and sound profiles); `docs/gates/stage-4a.md` (requests RR-1..RR-6, E-4a-1..E-4a-3 — this stage's backlog) and `packages/skins/CONTRACT.md`; `../research/00-orchestrator-rulings.md` R2, R3, R8, R12–R15, R25 and the G4a / G5-obs verdicts; `../research/05-rendering-ux-integration.md` §2 (vendor alarms, defib/pacer defaults, sync markers, 12-lead); `../research/06-saadat-alborz-b9.md` §4–§5; `../research/03-waveform-physiology-reference.md` §1.7–§1.9, §1.12.

**Base:** `origin/main` **after Stage 2 (PR #4) has merged** — main at 121c3f4 (Stages 0–1.1, 6a, 5, 4a) plus Stage 2 (pressure lanes and tiles, NIBP state machine, sensors, the `nibp-failed` alarm stub). Every code block below was written and run against exactly that combination (see "Prototype evidence").

## Global Constraints

- **Paths** are relative to the Stage 4b worktree root `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/scratch/wt-stage-4b` (Task 1 creates it on branch `stage-4b-device-layer` from `origin/main`). Run every command from there. Never work in `projects/patient-monitor-engine/repo/` itself (R25).
- **pnpm is not on PATH on this Mac.** Write every pnpm command as `npx -y pnpm@9.15.9 …`. Browser checks: `PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test <file>`. There is no `timeout` binary; do not wrap commands in it.
- **Ownership (binding, R25; Stage 3 runs concurrently):** this stage creates or edits ONLY `packages/engine-core/src/l3/alarms/**`, `l3/defib-pacer/**`, `l3/capture12/**`, `l3/trends/**`, `l3/device-layer.ts`, additive edits to `packages/engine-core/src/{engine.ts,types.ts,index.ts,l3/ecg-filter.ts}`, the new `packages/engine-core/src/types-device.ts`, new tests under `packages/engine-core/test/**` plus the one-line update of `test/engine/engine-commands.test.ts` (Task 13), `packages/renderer/**`, `packages/skins/{src/schema.ts,src/types.ts,src/data/skins/{ge-like,mindray-like}.json,src/data/themes/ecg-grid.json,CONTRACT.md,test/**}`, the two `package.json` dependency lines and `pnpm-lock.yaml`, `apps/demo/{stage4b-device.html,src/stage4b/**,e2e/stage4b-device.e2e.ts,vite.config.ts,index.html}`, `docs/gates/stage-4b*`, `docs/plans/stage-4b-device-layer.md`. It does **not** edit `packages/engine-core/src/l2/**` (Stages 3 and 5.1), `l1/**` (Stage 2), `packages/controller/**` (6a) or `packages/audio/**` (4a). If a task seems to need one, stop and add a request to the gate note.
- **Strict TS as in Stages 0–4a:** `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (no enums, no parameter properties, no namespaces), `verbatimModuleSyntax` (`import type` for types), `.ts` extensions in relative imports. No framework in browser code.
- **Engine state stays JSON-safe** (the engine `structuredClone`s its pipeline every tick and snapshots it): the device layer holds plain objects, arrays and numbers only. `TrendStore` and `EventLog` are classes because they live on the main thread, never in the engine state.
- **Determinism:** every random draw of the device layer is from the engine's `outcome` stream, one call site per draw; the same seed and commands reproduce the same alarm, marker and status events (Task 13 tests it).
- **No compliance claim** (R12): alarms are "IEC-style" and "Saadat-like"; skins are "-like" only (R13).
- **Every engineering constant carries `[ENG]`, `[assumed]` or a citation** in its comment.
- **Commits:** one per task, conventional messages as given, trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (use your own model's attribution if it differs). Never push to `main`; the last task opens a PR and does not merge (R21).
- **Snapshots:** only Task 2 changes a snapshot file, with `-u` after reading the diff (Step 3b). Never run `-u` elsewhere.
- **Edit blocks** ("replace this block (it occurs exactly once)") were taken from the prototype tree, whose base is main 121c3f4 + Stage 2 52efd04. If an old block is not found because Stage 2's final merge or a concurrent stage (3, 5.1) changed those lines, make the same change by hand next to the equivalent code, keep the intent of the new block, and list it under "Deviations" in the gate note. Never force an edit into the wrong place.

## Decisions this plan makes where the spec was silent or ambiguous

1. **The alarm engine runs in the engine** (L3, brief §3.2), not on the main thread: conditions need QRS detections, beat classes and sensor states that only the worker has, and replay/snapshot must include alarm state. The renderer paints the `alarmStatus` summary; the alarm sound follows it through `AlarmAudioBridge`.
2. **The engine learns the skin** from `EngineOptions.device.skin` (brief §7.1) and from a new command `{device:'monitor', action:'skin'|'ageBand', value}`. `@pme/engine-core` therefore depends on `@pme/skins` (a data package; its ajv lives only in `@pme/skins/validate`, which the engine never imports). With no skin the engine uses `philips-like` (the renderer's historical default).
3. **Lethal alarms (ASYSTOLE, VFIB, VTAC) are evaluated whenever the ECG leads are on**, on every skin, whatever the per-parameter switches and the arrhythmia switch say (brief §6.4.1 "cannot be disabled" for Saadat-like; Philips-like "basic arrhythmia" behaves the same [ENG]). BRADY/TACHY (Saadat-like) or EXTREME BRADY/TACHY (IEC-style: HR limit ∓ 20, clamped 40/200, 50/240 neonatal), PAUSE and PVCs/min need arrhythmia analysis ON (skin default: OFF on both `saadat-like` and `philips-like`). APNEA is listed in `alwaysOn` but has no condition until Stage 3 emits breaths (request R-4b-1).
4. **VF is recognised from the rhythm truth after 3 s** (`VF_CONFIRM_S` [ENG]); v1 has no waveform VF detector. VT is a run of ≥ `vtac.count` ventricular beats (PVCs included) at ≥ `vtac.rate` (IEC-style 5 at 100, Saadat-like 5 at 120), from Stage 5's beat events.
5. **Levels:** Saadat-like parameter alarms level 1 (gas alarms 2), technical 3 (brief §6.4.1); IEC-style limit alarms level 2 (the Philips-like `**` yellow messages, research/05 §2.4 [ENG mapping]), desaturation, asystole, VF, VT and extreme brady/tachy level 1, technical INOPs level 3.
6. **Latching:** only IEC-style level-1 physiological alarms latch, until acknowledged (brief §6.4 [ENG]); Saadat-like never latches (brief §6.4.1).
7. **Silence and pause** follow the skin data exactly: Saadat-like 120 s, hides physiological visuals, acknowledges technical alarms, any NEW alarm ends it, pressing again ends it, no pause (the command is rejected with "alarm pause has no function"); IEC-style 90 s audio only, a new alarm does not end it; pause removes every alarm and raises nothing for 180 s (Mindray-like 120 s). Durations are sim seconds in the engine; the bridge divides by `timeScale` for the sounder, whose bursts keep real-time patterns (brief §3.6).
8. **Raw L2 technical flags** (`ecgLeadsOff` from Stage 5's lead-off clock, `nibp-failed` from Stage 2) are consumed by the device layer and re-issued by the alarm manager with the SAME ids, the skin's level and text, and a `level` field; an `alarm` event without `level` never leaves the engine. Stage 2's tests that look for `nibp-failed` keep passing.
9. **Defibrillator and pacer work on every skin** as patient commands (brief §6.5, saadat-like note: "Pacing and shocks remain patient commands"); skins with `defib: null` / `pacer: null` use ZOLL-like values (`FALLBACK_DEFIB`, `FALLBACK_PACER`, research/05 §2.6). Charge time interpolates the skin's table (LIFEPAK-like 200 J 7 s, 360 J 10 s); with no table it is 7 s per 200 J scaled [ENG].
10. **Sync:** a separate low-latency R detector on lead II of the unfiltered VCG (Task 11) marks every R while SYNC is on; a synchronised shock is delivered at R + 20 ms, or at the first uncommitted sample if that is later — always 0–60 ms after R (brief §6.5). "Sync After Shock" is off on every skin (research/05 §2.6 LIFEPAK-like; [ENG] for the others).
11. **Post-shock rhythm:** the instructor's pre-selection (`defib preselect`) wins; otherwise brief §6.5's table on the `outcome` stream, asystole/PEA split 50/50 [ENG]. Terminating outcomes: 1–5 s isoelectric (asystole), then sinus 30–60 bpm accelerating to 80 bpm over 10–60 s (ROSC) or pulseless (PEA); the brief's k_SV 0.2 → 1 ramp becomes an sbp/dbp target ramp from 50 % to 100 % over 30–120 s, because in MANUAL mode Stage 2's M2 tracker holds pressures at their targets [ENG]. Cardioversion to sinus: a 1–2 s pause, then sinus 75 bpm [ENG]. The shock artefact is Stage 5's front-end rail saturation (`Modifiers.artefact.shock`), which reaches every displayed lead.
12. **Pacing** writes Stage 5's `Modifiers.tcp` only. Failure to sense = the modifier in `fixed` mode behind a `demand` display; failure to capture = an unreachable threshold; ECG leads off force `fixed` (LIFEPAK-like "leads-off → automatic non-demand"); PAUSE paces at `pausePct` of the rate (LIFEPAK-like 25 %) or, with no pause rate, drops the output to 0 mA (ZOLL-like "0 when paused"). The capture threshold is `PatientState.paceThresholdMa`; `setTarget paceThresholdMa` is accepted by the device layer because Stage 2's `validateTarget` still rejects stage-4 variables (request R-4b-3). Captured beats are Stage 5's `pacedV` with k_rhythm 0.9, which Stage 2 ejects (ABP pulses at the pacing rate, Task 13).
13. **Device ClinicalEvents keep the brief's shapes plus `PacerEvent.action: 'set'`**, and the two new DeviceActions carry `lane?: never`, so 6a's controller command log (`controller-session.ts`) still compiles without an edit.
14. **12-lead capture is `capture12(engine)`** over the public API (VCG buffers → diagnostic filter on X, Y, Z → projection, so the limb identities hold exactly; 20 s of pre-roll settles the 0.05 Hz high-pass) and `MonitorHandle.capture12()` through a worker message. The `device ecg capture12` command stays rejected (it would have to move 240 KB through the event stream). Measurements are HR and QRS axis only; PR/QRS/QT/QTc go to validation (request R-4b-6).
15. **Trends and the event log live on the main thread** (fed by the events the handle already receives), as `TrendStore` / `EventLog` classes in `engine-core/src/l3/trends`. 22 numerics × 28,800 s × 4 B = 2.53 MB. The graphic trend is a 60-line canvas plot, not uPlot: no new dependency or NOTICES row for v1 [ENG].
16. **Skin plan vs page lanes:** with `skin` the lanes come from the skin (or its page), except when the page passes `lanes`/`waves` (the Stage 1, 2 and 5 demos), which then keep their lanes in the skin's colours. The HR tile keeps the Stage 1 class `pme-tile` (IIFE smoke test).
17. **Pace marks:** a skin that is itself a pacer (`zoll-like`, `lifepak-like`) marks its TCP pulses; implanted-pacemaker spikes are marked only with pace detect ON (skin `ecg.paceDetectDefault`, OFF everywhere), so `saadat-like` and `philips-like` draw none by default. Styles from the skin: `marker-above` 2 mm near the lane top, `vertical-line` 10 mm through the baseline (Saadat-like); sync `line` / `triangle-mid-qrs` / `r-above` (research/05 §2.6).
18. **Auto gain (RR-2):** every 2 s the last 4 s of the lead must fit 60 % of the lane; the largest skin gain option that fits wins, and the lane label shows it (`II  X0.5  NORMAL`) [ENG].
19. **Gate G4a follow-ups:** the `ecg-grid` major line is dimmed to `#F4C4C4` so every trace of every skin keeps ≥ 3:1 against it (tested); `mindray-like` gets the documented boxed alarm numeric (`alarms.numericStyle: 'flash-box'`, research/05 §2.4); `ge-like` and `mindray-like` carry a visible `LAYOUT UNVERIFIED` header badge, because research 05 §2 has no lane/tile layout data for either.
20. **Pages:** the Saadat-like PUMP page (P10) shows the `PUMP` watermark, hides IBP scale numbers and keeps ASYSTOLE on the bar through silence (brief §6.9). No skin documents a big-number page, so none is drawn.
21. **E-4a-2 (HR moving-average-seconds and the AUTO source chain) is deferred** (request R-4b-5): it is not in this stage's acceptance list, it changes Stage 1's `l3/hr.ts`, and the manual's 5 / 6 / 11 s response times do not come out of a plain windowed mean — Ali's stopwatch capture should settle the algorithm first.

## Requests to other stages (not implemented here; repeated in the gate note)

| ID | Owner | Request | Meanwhile |
|---|---|---|---|
| R-4b-1 | Stage 3 | Emit `breath` events / RR so APNEA (always-on on Saadat-like) can raise; a CO2 line/occlusion INOP flag; the EtCO2 jump after ROSC (brief §6.5); SpO2 and EtCO2 numerics — their limit and desat alarms then work with no 4b change | APNEA has no condition; RESP/CO2 lanes and SpO2 tiles show dashes |
| R-4b-2 | Stage 5.1 (`l2/ecg/tcp.ts`) | Demand-mode inhibition counts the pacer's own captured beat (`lastVT` = spike + 20 ms), so demand pacing with capture runs at 68.4 instead of 70 ppm (measured); inhibit only on non-paced beats | Tests use fixed mode for rate checks |
| R-4b-3 | Stage 2 (`l1/state.ts`) | `paceThresholdMa` default is 60 mA; brief §6.5 says 70 mA [ENG]; `validateTarget` rejects stage-4 variables | 4b accepts `setTarget paceThresholdMa` itself; tests set 70 |
| R-4b-4 | 6a controller | Panel tabs are hard-coded in `panel/panel.ts`; a tab-registration API (and `vocabulary()` entries for `applyEvent defib/pacer`, `device alarm/monitor`) so a Device tab can drop in | The demo page carries the device controls |
| R-4b-5 | orchestrator / Stage 4c | E-4a-2: HR `moving-average-seconds` (4/8/16 s) and the HR-source AUTO chain with the PR relabel | HR uses the Stage 1 averager on every skin |
| R-4b-6 | validation | 12-lead fiducial measurements (PR, QRS, QT, QTc; BUILD-PLAN acceptance 7) and the ProSim limb-ratio check on `capture12` output | `capture12` reports HR and axis |
| R-4b-7 | Ali (bedside) | VF recognition delay; the look of sync markers on a real ZOLL/LIFEPAK; what a flashing numeric does during Saadat-like silence (checklist photo 5) | [ENG] values above |

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/types-device.ts` | Device commands and events (additive to brief §7) |
| `packages/engine-core/src/l3/alarms/profile.ts` | `DeviceProfile` from a resolved skin and age band |
| `packages/engine-core/src/l3/alarms/text.ts` | Message texts (IEC-style, Saadat-like) |
| `packages/engine-core/src/l3/alarms/manager.ts` | Alarm life cycle, silence/pause/ack, `alarmStatus` |
| `packages/engine-core/src/l3/alarms/conditions.ts` | Inputs the monitor sees → true conditions |
| `packages/engine-core/src/l3/defib-pacer/{outcome,sync,defib,pacer}.ts` | Post-shock table; sync R detector; defibrillator and pacer state |
| `packages/engine-core/src/l3/device-layer.ts` | The device layer the engine steps (alarms, shocks, sync, pacing, status) |
| `packages/engine-core/src/l3/capture12/capture.ts` | 12-lead capture |
| `packages/engine-core/src/l3/trends/{trend-store,event-log}.ts` | Trends and event log |
| `packages/engine-core/src/{engine.ts,types.ts,index.ts,l3/ecg-filter.ts}` | Additive wiring; ECG filter bands (E-4a-1) |
| `packages/renderer/src/skin-plan.ts` | `ResolvedSkin` → `RenderPlan` (RR-1) |
| `packages/renderer/src/sweep-lane.ts` | Grid painter (RR-4), cursor line (RR-3) |
| `packages/renderer/src/overlays.ts` | Pace, sync, shock and lead-off overlays |
| `packages/renderer/src/monitor-core.ts` | Plan-driven lanes, `setPlan`, auto gain (RR-2), overlays, `capture12` |
| `packages/renderer/src/{protocol,worker-host,engine.worker}.ts` | `plan` and `capture12` messages |
| `packages/renderer/src/alarm-view.ts`, `alarm-audio.ts` | Header/tile views; alarm sound bridge (E-4a-3) |
| `packages/renderer/src/device-ui.ts`, `views.ts` | DOM header and tiles (RR-5); 12-lead and trend canvases |
| `packages/renderer/src/mount.ts` | Skins, `setSkin`, audio (RR-6), capture, trends, event log |
| `packages/skins/**` (5 files + 1 test) | G4a follow-ups |
| `apps/demo/stage4b-device.html`, `apps/demo/src/stage4b/device.ts`, `apps/demo/e2e/stage4b-device.e2e.ts` | Demo page and gate evidence |
| `docs/gates/stage-4b.md`, `docs/gates/stage-4b/` | Gate note, 13 PNGs, `audio-timing.json` |

## Prototype evidence (scratchpad, before this plan was written)

Every block in this plan was run in a scratch copy of `origin/main` 121c3f4 merged with `stage-2-haemodynamics` 52efd04 (one trivial `apps/demo/index.html` conflict, resolved by keeping both links), then extracted from that reference tree mechanically and re-applied to a fresh copy by a script that follows the steps literally; the result was identical to the reference tree (see the gate note for the diff command). Results on the reference tree:

| Check | Result |
|---|---|
| `pnpm -r test` | engine-core **372** (base 305), renderer **54** (base 31), skins **159** (155), audio 58, controller 97, validation 16 — all pass |
| `pnpm -r typecheck` / `build` / `check-notices` | exit 0 / exit 0 (renderer IIFE 628.9 kB) / `OK (3 governed files)` |
| `stage4b-device.e2e.ts` (headless Chrome) | 5 passed in 1.2 min; `iife-smoke`, `stage4a-skins`, `stage6a`, `stage6a-worker`, `stage6a-screens` still pass |
| Alarm timing | philips-like HR>120 raised on the first displayed value over the limit; saadat-like HR raised 1.00 s after the switch (skin delay); asystole 10.0 s (saadat-like) / 4.0 s (philips-like) after the last QRS (±0.2 s); VFIB ≤ 3.3 s; VTAC ≤ 0.1 s after the 5th ventricular beat |
| Defibrillator | lifepak-like 200 J ready 7.0 s after charge, auto-disarm 60 s later; rail on II, V5, V1; baseline < 0.1 mV at +5 s; sync markers within 20 ms of every R (sinus, AVNRT, flutter, AF, VT); sync shock 0–60 ms after R; 10,000 seeded VF shocks within ±2 % of 0.30 / 0.60 / 0.10 |
| Pacer | 40 mA below a 70 mA threshold: > 25 spikes, none captured, the 32 bpm escape unchanged; 90 mA: capture after 100 % of spikes, `pacedV` QRS ≥ 140 ms, ABP systolic peaks at the pacing rate (11 ± 1 in 9.4 s at 70 ppm); demand inhibited by sinus 80; failure to sense 25 ± 2 spikes in 25 s; demand with capture runs at 68.4 ppm for 70 set (R-4b-2) |
| Trends / log | 22 × 28,800 s held in 2.53 MB; CSV rows per kind equal the logged events |
| Audio (live page, zoll-like) | 10 alarm pulses, charge, chargeReady and shock tones handed to Web Audio; maximum alarm-pulse lateness 34 ms |

---

### Task 1: Worktree, branch and the `@pme/skins` dependency

**Files:**
- Modify: `packages/engine-core/package.json`, `packages/renderer/package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `origin/main` with Stage 2 merged.
- Produces: branch `stage-4b-device-layer` in `scratch/wt-stage-4b`; `@pme/skins` importable from `@pme/engine-core` and `@pme/renderer`.

- [x] **Step 1: Check that Stage 2 is on main, then create the worktree**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git ls-tree -r --name-only origin/main -- packages/engine-core/src/l2/hemo/pipeline.ts packages/renderer/src/numerics-hemo.ts
git worktree add ../scratch/wt-stage-4b -b stage-4b-device-layer origin/main
cd ../scratch/wt-stage-4b
npx -y pnpm@9.15.9 install --frozen-lockfile
```
Expected: both paths print (Stage 2 is merged); if they do not, STOP — this plan's edit blocks anchor on Stage 2 code. Then `Preparing worktree (new branch 'stage-4b-device-layer')` and pnpm `Done`. From here on every command runs in the worktree.

- [x] **Step 2: Baseline**

```bash
npx -y pnpm@9.15.9 -r typecheck && npx -y pnpm@9.15.9 -r test 2>&1 | grep -E "Tests "
```
Expected: typecheck exit 0; every package passes (on the plan author's base: engine-core 305, skins 155, audio 58, controller 97, validation 16, renderer 31). Note your numbers in the gate note; later "Expected" counts in this plan are for the NEW test files only, so they do not depend on the base.

- [x] **Step 3: Add the workspace dependency**

```bash
npx -y pnpm@9.15.9 --filter @pme/engine-core add '@pme/skins@workspace:*'
npx -y pnpm@9.15.9 --filter @pme/renderer add '@pme/skins@workspace:*'
sed -i '' 's/"@pme\/skins": "workspace:\^"/"@pme\/skins": "workspace:*"/' packages/engine-core/package.json packages/renderer/package.json
npx -y pnpm@9.15.9 install
grep -n '@pme/skins' packages/engine-core/package.json packages/renderer/package.json
```
Expected: each file has `"@pme/skins": "workspace:*"` (pnpm writes `workspace:^`; the other workspace deps use `*`); `pnpm-lock.yaml` gains the two `link:../skins` entries.

- [x] **Step 4: Commit**

```bash
git add packages/engine-core/package.json packages/renderer/package.json pnpm-lock.yaml
git commit -m "build: engine-core and renderer depend on @pme/skins (stage 4b)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Gate G4a follow-ups in `@pme/skins`: dimmed ECG-paper grid, Mindray-like boxed numerics, "LAYOUT UNVERIFIED" badge

**Files:**
- Modify: `packages/skins/CONTRACT.md`
- Modify: `packages/skins/src/data/skins/ge-like.json`
- Modify: `packages/skins/src/data/skins/mindray-like.json`
- Modify: `packages/skins/src/data/themes/ecg-grid.json`
- Modify: `packages/skins/src/schema.ts`
- Modify: `packages/skins/src/types.ts`
- Test: `packages/skins/test/g4a-followups.test.ts`

**Interfaces:**
- Consumes: `resolveSkin`, `contrastRatio`, `validate` (Stage 4a).
- Produces: optional skin fields `alarms.numericStyle?: 'flash-text' | 'flash-box'` and `layout.badge?: string` (types, schema, CONTRACT.md); `mindray-like` sets both, `ge-like` sets the badge; the `ecg-grid` theme grid is minor `#FAE2E2`, major `#F4C4C4`. Task 20 (device UI) reads `r.skin.alarms.numericStyle ?? 'flash-text'` and `r.skin.layout.badge`.

- [x] **Step 1: Write the failing test**

Create `packages/skins/test/g4a-followups.test.ts`:

```ts
// Gate G4a follow-ups (research/00 G4a): mindray-like and ge-like must not look identical, and a red trace must stay
// readable on the ecg-grid theme's red grid.
import { describe, expect, it } from 'vitest';
import { contrastRatio, PRESET_IDS, resolveSkin, SKIN_IDS } from '../src/index.ts';
import { validate } from '../src/validate.ts';

describe('G4a follow-ups', () => {
  it('ecg-grid: every lane colour of every skin and preset keeps ≥ 3:1 against the major grid line', () => {
    for (const id of [...SKIN_IDS, ...PRESET_IDS]) {
      const r = resolveSkin(id, { theme: 'ecg-grid' });
      const major = r.render.grid?.major as string;
      for (const l of r.render.lanes) expect(contrastRatio(l.color, major), `${id} ${l.lane}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('mindray-like flashes a level-coloured box; the others flash the text', () => {
    expect(resolveSkin('mindray-like').skin.alarms.numericStyle).toBe('flash-box');
    for (const id of ['philips-like', 'saadat-like', 'ge-like', 'zoll-like']) expect(resolveSkin(id).skin.alarms.numericStyle ?? 'flash-text').toBe('flash-text');
  });

  it('ge-like and mindray-like carry the visible "LAYOUT UNVERIFIED" badge; documented layouts do not', () => {
    expect(resolveSkin('ge-like').skin.layout.badge).toBe('LAYOUT UNVERIFIED');
    expect(resolveSkin('mindray-like').skin.layout.badge).toBe('LAYOUT UNVERIFIED');
    for (const id of ['philips-like', 'saadat-like', 'zoll-like', 'lifepak-like']) expect(resolveSkin(id).skin.layout.badge).toBeUndefined();
  });

  it('the new optional fields validate and are rejected when malformed', () => {
    expect(validate('skin', resolveSkin('mindray-like').skin).errors).toEqual([]);
    const bad = structuredClone(resolveSkin('mindray-like').skin) as unknown as { alarms: { numericStyle: string } };
    bad.alarms.numericStyle = 'blink';
    expect(validate('skin', bad).errors.length).toBeGreaterThan(0);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/skins && npx vitest run test/g4a-followups.test.ts; cd -`
Expected: FAIL — the ecg-grid contrast test (`saadat-like IBP1 … expected 1.81 to be greater than or equal to 3`), `numericStyle` undefined for mindray-like, `badge` undefined

- [x] **Step 3: Implement**

In `packages/skins/CONTRACT.md`, replace this block (it occurs exactly once):

```markdown
`prefix`, `rotate`), `numericFlash`, `alarmOffIcon`, `factoryEnabled`, `alwaysOn`, `silence.suppressesVisual`,
`silence.headerCountdown`: consumed by the Stage 4b alarm engine and alarm bar. The 4a preview page draws the
bars and lamps from these fields.

## Limits
```

with:

```markdown
`prefix`, `rotate`), `numericFlash`, `alarmOffIcon`, `factoryEnabled`, `alwaysOn`, `silence.suppressesVisual`,
`silence.headerCountdown`: consumed by the Stage 4b alarm engine and alarm bar. The 4a preview page draws the
bars and lamps from these fields. Stage 4b adds two optional fields: `alarms.numericStyle` (`'flash-text'`, the
default, or `'flash-box'`, Mindray-like) and `layout.badge` (header text such as `LAYOUT UNVERIFIED` for skins whose
layout was not taken from a manual: `ge-like`, `mindray-like`).

## Limits
```

In `packages/skins/src/data/skins/ge-like.json` (edit 1 of 2), replace this block (it occurs exactly once):

```json
  },
  "limits": { "adult": null, "paed": null, "neo": null },
  "provenance": {
    "colors": { "tag": "assumed", "source": "research/05 §2.1 (GE: per-label colours configurable)", "note": "no GE factory colour table retrieved" },
```

with:

```json
  },
  "limits": { "adult": null, "paed": null, "neo": null },
  "layout": { "badge": "LAYOUT UNVERIFIED" },
  "provenance": {
    "colors": { "tag": "assumed", "source": "research/05 §2.1 (GE: per-label colours configurable)", "note": "no GE factory colour table retrieved" },
```

In `packages/skins/src/data/skins/ge-like.json` (edit 2 of 2), replace this block (it occurs exactly once):

```json
    "limits.adult": { "tag": "unverified", "source": "brief §6.8", "note": "GE table not retrieved; not invented" },
    "limits.paed": { "tag": "unverified", "source": "brief §6.8" },
    "limits.neo": { "tag": "unverified", "source": "brief §6.8" }
  }
}
```

with:

```json
    "limits.adult": { "tag": "unverified", "source": "brief §6.8", "note": "GE table not retrieved; not invented" },
    "limits.paed": { "tag": "unverified", "source": "brief §6.8" },
    "limits.neo": { "tag": "unverified", "source": "brief §6.8" },
    "layout.badge": { "tag": "eng", "source": "ENG", "note": "gate G4a: lane/tile layout not retrieved for GE; shown as unverified on screen" }
  }
}
```

In `packages/skins/src/data/skins/mindray-like.json` (edit 1 of 2), replace this block (it occurs exactly once):

```json
    "gainLabel": "mm-per-mV"
  },
  "alarms": { "pause": { "durationS": 120 }, "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } } },
  "provenance": {
    "colors.ECG": { "tag": "documented", "source": "research/05 §2.1 (ECG 'normally green')" },
```

with:

```json
    "gainLabel": "mm-per-mV"
  },
  "layout": { "badge": "LAYOUT UNVERIFIED" },
  "alarms": { "pause": { "durationS": 120 }, "numericStyle": "flash-box", "messageBar": { "L1": { "bg": "#FF0000", "fg": "#FFFFFF" }, "L2": { "bg": "#FFFF00", "fg": "#000000" }, "L3": { "bg": "#00FFFF", "fg": "#000000" } } },
  "provenance": {
    "colors.ECG": { "tag": "documented", "source": "research/05 §2.1 (ECG 'normally green')" },
```

In `packages/skins/src/data/skins/mindray-like.json` (edit 2 of 2), replace this block (it occurs exactly once):

```json
    "ecg.gainLabel": { "tag": "documented", "source": "research/05 §2.2 (mm/mV steps)" },
    "alarms.pause": { "tag": "documented", "source": "research/06 §6 (Mindray pause 2 min)" },
    "alarms.messageBar": { "tag": "documented", "source": "research/05 §2.4-2.5 (white on red, black on yellow, black on cyan)", "note": "hex [ENG]" }
  }
}
```

with:

```json
    "ecg.gainLabel": { "tag": "documented", "source": "research/05 §2.2 (mm/mV steps)" },
    "alarms.pause": { "tag": "documented", "source": "research/06 §6 (Mindray pause 2 min)" },
    "alarms.messageBar": { "tag": "documented", "source": "research/05 §2.4-2.5 (white on red, black on yellow, black on cyan)", "note": "hex [ENG]" },
    "alarms.numericStyle": { "tag": "documented", "source": "research/05 §2.4 (Mindray alarmed numeric: text in a flashing red / yellow / cyan box)" },
    "layout.badge": { "tag": "eng", "source": "ENG", "note": "gate G4a: lane/tile layout not retrieved for Mindray; shown as unverified on screen" }
  }
}
```

In `packages/skins/src/data/themes/ecg-grid.json` (edit 1 of 2), replace this block (it occurs exactly once):

```json
  "chrome": {
    "divider": "#C0A0A0", "windowFrame": "#404040", "pageBox": { "bg": "#000000", "fg": "#FFFFFF" }, "patientCategoryColor": "#000000",
    "grid": { "minorMm": 1, "majorMm": 5, "minor": "#F4C8C8", "major": "#E08888" }
  },
  "colorTransform": { "kind": "darken-to-contrast", "minRatio": 4.5 },
```

with:

```json
  "chrome": {
    "divider": "#C0A0A0", "windowFrame": "#404040", "pageBox": { "bg": "#000000", "fg": "#FFFFFF" }, "patientCategoryColor": "#000000",
    "grid": { "minorMm": 1, "majorMm": 5, "minor": "#FAE2E2", "major": "#F4C4C4" }
  },
  "colorTransform": { "kind": "darken-to-contrast", "minRatio": 4.5 },
```

In `packages/skins/src/data/themes/ecg-grid.json` (edit 2 of 2), replace this block (it occurs exactly once):

```json
    "background": { "tag": "eng", "source": "ENG", "note": "ECG paper tint" },
    "foreground": { "tag": "eng", "source": "ENG" },
    "chrome.grid": { "tag": "documented", "source": "brief §6.6 (25 mm/s, 10 mm/mV paper: 1 mm minor, 5 mm major)", "note": "grid colours [ENG]" },
    "chrome": { "tag": "eng", "source": "ENG" },
    "colorTransform": { "tag": "eng", "source": "ENG" },
```

with:

```json
    "background": { "tag": "eng", "source": "ENG", "note": "ECG paper tint" },
    "foreground": { "tag": "eng", "source": "ENG" },
    "chrome.grid": { "tag": "documented", "source": "brief §6.6 (25 mm/s, 10 mm/mV paper: 1 mm minor, 5 mm major)", "note": "grid colours [ENG]; major dimmed so every trace keeps ≥ 3:1 against it (gate G4a)" },
    "chrome": { "tag": "eng", "source": "ENG" },
    "colorTransform": { "tag": "eng", "source": "ENG" },
```

In `packages/skins/src/schema.ts` (edit 1 of 2), replace this block (it occurs exactly once):

```ts
    recall: nullable(obj({ count: int(1, 1000), windowS: pair })),
  },
  { repeatS: obj({}, { L1: nullable(num(1, 60)), L2: nullable(num(1, 60)), L3: nullable(num(1, 60)) }), lowPulses: en([1, 2]) },
);
```

with:

```ts
    recall: nullable(obj({ count: int(1, 1000), windowS: pair })),
  },
  {
    repeatS: obj({}, { L1: nullable(num(1, 60)), L2: nullable(num(1, 60)), L3: nullable(num(1, 60)) }),
    lowPulses: en([1, 2]),
    numericStyle: en(['flash-text', 'flash-box']),
  },
);
```

In `packages/skins/src/schema.ts` (edit 2 of 2), replace this block (it occurs exactly once):

```ts
      header: arr(en(HEADER_ITEMS), 1),
      messageBars: en(['single-under-header', 'split-technical-physiological']),
    }),
    pages: arr(page, 1),
    defaultPage: { type: 'string', pattern: '^P[0-9]{1,2}$' },
```

with:

```ts
      header: arr(en(HEADER_ITEMS), 1),
      messageBars: en(['single-under-header', 'split-technical-physiological']),
    }, { badge: str }),
    pages: arr(page, 1),
    defaultPage: { type: 'string', pattern: '^P[0-9]{1,2}$' },
```

In `packages/skins/src/types.ts` (edit 1 of 2), replace this block (it occurs exactly once):

```ts
    header: HeaderItem[];
    messageBars: 'single-under-header' | 'split-technical-physiological';
  };
  pages: PageSpec[];
```

with:

```ts
    header: HeaderItem[];
    messageBars: 'single-under-header' | 'split-technical-physiological';
    /** Text drawn in the header when the layout is not taken from the vendor's manual (Stage 4b, gate G4a). */
    badge?: string;
  };
  pages: PageSpec[];
```

In `packages/skins/src/types.ts` (edit 2 of 2), replace this block (it occurs exactly once):

```ts
    messageBar: { L1: MessageBarColors; L2: MessageBarColors; L3: MessageBarColors; idle: MessageBarColors; acknowledged: MessageBarColors; prefix: 'asterisks' | 'none'; rotate: boolean };
    numericFlash: boolean;
    factoryEnabled: boolean;
    alwaysOn: string[];
```

with:

```ts
    messageBar: { L1: MessageBarColors; L2: MessageBarColors; L3: MessageBarColors; idle: MessageBarColors; acknowledged: MessageBarColors; prefix: 'asterisks' | 'none'; rotate: boolean };
    numericFlash: boolean;
    /** How an alarmed numeric flashes: the text ('flash-text', default) or a level-coloured box ('flash-box', Mindray-like). */
    numericStyle?: 'flash-text' | 'flash-box';
    factoryEnabled: boolean;
    alwaysOn: string[];
```

- [x] **Step 3b: Refresh the seven ecg-grid snapshots and read the diff**

```bash
cd packages/skins && npx vitest run -u && cd ../..
git diff --stat packages/skins/test/__snapshots__/resolve.test.ts.snap
git diff packages/skins/test/__snapshots__/resolve.test.ts.snap | grep '^[-+] ' | sort | uniq -c
```
Expected: exactly four distinct changed lines, each 7 times: `-"major": "#E08888"`, `-"minor": "#F4C8C8"`, `+"major": "#F4C4C4"`, `+"minor": "#FAE2E2"` (the seven skin/preset × ecg-grid snapshots). Anything else changed means a data edit went wrong: stop and compare with Step 3.

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/skins && npx vitest run test/g4a-followups.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  4 passed (4)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/skins/CONTRACT.md packages/skins/src/data/skins/ge-like.json packages/skins/src/data/skins/mindray-like.json packages/skins/src/data/themes/ecg-grid.json packages/skins/src/schema.ts packages/skins/src/types.ts packages/skins/test/g4a-followups.test.ts packages/skins/test/__snapshots__/resolve.test.ts.snap
git commit -m "feat(skins): G4a follow-ups — dimmed ecg-grid major line, mindray-like boxed alarm numerics, layout badge for ge/mindray" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Device-layer public types (additive to brief §7.2–§7.3)

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/src/types-device.ts`
- Modify: `packages/engine-core/src/types.ts`
- Test: `packages/engine-core/test/types-device.test.ts`

**Interfaces:**
- Consumes: `types.ts` / `types-hemo.ts` (Stages 1–2).
- Produces (`packages/engine-core/src/types-device.ts`, re-exported from the package): `AlarmLevel = 1|2|3`, `AlarmPriority`, `AgeBand = 'adult'|'paed'|'neo'`, `DefibEvent` `{kind:'defib', action:'selectEnergy'|'charge'|'shock'|'disarm'|'syncOn'|'syncOff'|'preselect', energyJ?, outcome?}`, `PacerEvent` `{kind:'pacer', action:'set', mode:'off'|'demand'|'fixed', ratePpm?, mA?, pause?, fault?:'none'|'failureToSense'|'failureToCapture'}`, `DeviceClinicalEvent`, `AlarmDeviceAction` `{device:'alarm', action:'silence'|'pause'|'ack'|'setLimit'|'setVolume'|'enable'|'enableAll'|'arrhythmiaAnalysis', param?, low?, high?, value?}`, `MonitorDeviceAction` `{device:'monitor', action:'skin'|'ageBand', value}`, `AlarmEntry`, `LimitState`, `DeviceEvent` (`alarmStatus`, `deviceStatus`). In `types.ts`: `DeviceAction` gains the two actions, `Command` gains `{type:'applyEvent'; event: DeviceClinicalEvent}`, the `alarm` event gains `level?: AlarmLevel`, the `tone` event gains `chargeS?`, `EngineEvent` gains `DeviceEvent`. Task 7 adds `volume` to `alarmStatus` and Task 13 extends `deviceStatus`, each with an edit block.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/types-device.test.ts`:

```ts
// Stage 4b public types compile and are exported from the package entry (brief §7.2–§7.3, additive).
import { describe, expect, it } from 'vitest';
import type { AlarmDeviceAction, Command, DeviceEvent, EngineEvent, MonitorDeviceAction } from '../src/index.ts';

describe('Stage 4b types', () => {
  it('commands: applyEvent defib/pacer, device alarm/monitor', () => {
    const cmds: Command[] = [
      { id: 'a', issuedBy: 't', type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 } },
      { id: 'b', issuedBy: 't', type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'demand', ratePpm: 70, mA: 80, fault: 'failureToSense' } },
      { id: 'c', issuedBy: 't', type: 'device', action: { device: 'alarm', action: 'setLimit', param: 'HR', low: 50, high: 120 } satisfies AlarmDeviceAction },
      { id: 'd', issuedBy: 't', type: 'device', action: { device: 'monitor', action: 'skin', value: 'saadat-like' } satisfies MonitorDeviceAction },
    ];
    expect(cmds).toHaveLength(4);
  });

  it('events: alarm carries level, tone carries chargeS, alarmStatus/deviceStatus exist', () => {
    const evs: EngineEvent[] = [
      { type: 'alarm', t: 1, id: 'HR_HIGH', priority: 'medium', category: 'physiological', state: 'raised', text: '**HR 130>120', level: 2 },
      { type: 'tone', t: 1, id: 'defib-charge-1', kind: 'charge', chargeS: 7 },
      { type: 'deviceStatus', t: 1, defib: null, pacer: null } satisfies DeviceEvent,
    ];
    expect(evs.map((e) => e.type)).toEqual(['alarm', 'tone', 'deviceStatus']);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx tsc -p packages/engine-core/tsconfig.json`
Expected: errors — `Module '"../src/index.ts"' has no exported member 'AlarmDeviceAction'` (and the other new names). Vitest alone would pass here because type-only imports are erased.

- [x] **Step 3: Implement**

In `packages/engine-core/src/index.ts`, replace this block (it occurs exactly once):

```ts
export { dominantHz, rms, welch } from './util/dsp.ts';
export * from './types-hemo.ts'; // Stage 2
```

with:

```ts
export { dominantHz, rms, welch } from './util/dsp.ts';
export * from './types-hemo.ts'; // Stage 2
export * from './types-device.ts'; // Stage 4b
```

Create `packages/engine-core/src/types-device.ts`:

```ts
// Stage 4b public types (brief §6.4–§6.7, §7.2–§7.3): the device layer's commands and events. Kept in their own
// file, like types-hemo.ts, so concurrent stages do not collide in types.ts; types.ts adds these to its unions.
import type { NumericId, RhythmId, SimSeconds } from './types.ts';

/** Alarm levels, 1 = highest (brief §3.8 `alarms.levels`; IEC high/medium/low and Saadat 1/2/3 are display names). */
export type AlarmLevel = 1 | 2 | 3;
export type AlarmPriority = 'high' | 'medium' | 'low';
export type AgeBand = 'adult' | 'paed' | 'neo';

/** Brief §7.2 ClinicalEvent `defib` (+ `preselect`, the instructor's "convert" of brief §6.5). */
export type DefibEvent = {
  kind: 'defib';
  action: 'selectEnergy' | 'charge' | 'shock' | 'disarm' | 'syncOn' | 'syncOff' | 'preselect';
  energyJ?: number;
  /** preselect only: the rhythm the NEXT shock produces ('unchanged' = shock does nothing), overriding the table. */
  outcome?: RhythmId | 'unchanged';
};

/** Brief §7.2 ClinicalEvent `pacer` (transcutaneous), plus the instructor fault switch (brief §6.5, 4b ACCEPTANCE). */
export type PacerEvent = {
  kind: 'pacer';
  /** Not in the brief's shape: every device ClinicalEvent names its action (the 6a controller's log reads it). */
  action: 'set';
  mode: 'off' | 'demand' | 'fixed';
  ratePpm?: number;
  mA?: number;
  pause?: boolean;
  /** failureToSense: demand pacing fires asynchronously; failureToCapture: no capture at any mA. */
  fault?: 'none' | 'failureToSense' | 'failureToCapture';
};

export type DeviceClinicalEvent = DefibEvent | PacerEvent;

/** Brief §7.2 DeviceAction `alarm`, plus `enable` (per-parameter switch, brief §6.4.1) and `ageBand`. */
export type AlarmDeviceAction = {
  device: 'alarm';
  action: 'silence' | 'pause' | 'ack' | 'setLimit' | 'setVolume' | 'enable' | 'enableAll' | 'arrhythmiaAnalysis';
  /** Parameter key of the skin's limit table ('HR', 'SpO2', 'NIBP_S', 'ART_M', …) for setLimit / enable. */
  param?: string;
  low?: number;
  high?: number;
  value?: number | boolean;
  /** Never used; keeps every DeviceAction member readable as `.lane` (the 6a controller's command log does). */
  lane?: never;
};

/** Stage 4b: the skin (and age band) the device layer follows; `setSkin` without an engine restart (brief §3.8). */
export type MonitorDeviceAction = { device: 'monitor'; action: 'skin' | 'ageBand'; value: string; lane?: never };

/** One active (or latched) alarm as the renderer shows it. */
export interface AlarmEntry {
  id: string;
  level: AlarmLevel;
  category: 'physiological' | 'technical';
  text: string;
  /** Numeric that is in alarm (limit alarms only), for the flashing tile. */
  numeric?: NumericId;
  since: SimSeconds;
  /** The condition is gone but the alarm is latched (brief §6.4). */
  latched: boolean;
  acked: boolean;
}

/** Brief §6.4 alarm-limit table as the device layer uses it: parameter key → [low, high] (null = no limit). */
export interface LimitState {
  numeric: NumericId;
  low: number | null;
  high: number | null;
  enabled: boolean;
  level: AlarmLevel;
  /** Inherited from another age band (brief §6.8: "marked approximate"). */
  approximate: boolean;
}

/** Stage 4b device events (additive to brief §7.3). */
export type DeviceEvent =
  | {
      /** The alarm manager's whole visible state, on every change and at 1 Hz: the renderer's single source. */
      type: 'alarmStatus'; t: SimSeconds; skin: string; ageBand: AgeBand;
      active: AlarmEntry[];
      silencedUntil: SimSeconds | null;
      pausedUntil: SimSeconds | null;
      /** Per-parameter switch and limits, keyed by the skin's limit keys. */
      limits: Record<string, LimitState>;
      allOff: boolean;
      arrhythmiaAnalysis: boolean;
    }
  | {
      /** Defibrillator and pacer state, on every change and at 1 Hz. */
      type: 'deviceStatus'; t: SimSeconds;
      defib: { energyJ: number; state: 'idle' | 'charging' | 'ready'; sync: boolean; readyAt: SimSeconds | null; shocks: number } | null;
      pacer: { mode: 'off' | 'demand' | 'fixed'; ratePpm: number; mA: number; paused: boolean } | null;
    };
```

In `packages/engine-core/src/types.ts` (edit 1 of 5), replace this block (it occurs exactly once):

```ts
// the remaining Command variants, EngineEvent variants and MonitorEngine members listed in §7.
import type { HemoCommandBody, HemoEvent, NibpDeviceAction, SensorId } from './types-hemo.ts';

export type Tick = number; // integer; 1 tick = 20 ms of sim time
```

with:

```ts
// the remaining Command variants, EngineEvent variants and MonitorEngine members listed in §7.
import type { HemoCommandBody, HemoEvent, NibpDeviceAction, SensorId } from './types-hemo.ts';
import type { AlarmDeviceAction, AlarmLevel, DeviceClinicalEvent, DeviceEvent, MonitorDeviceAction } from './types-device.ts'; // Stage 4b

export type Tick = number; // integer; 1 tick = 20 ms of sim time
```

In `packages/engine-core/src/types.ts` (edit 2 of 5), replace this block (it occurs exactly once):

```ts
      lane?: number;
    }
  | NibpDeviceAction; // Stage 2

export type EcgFilterMode = 'monitor' | 'diagnostic';
```

with:

```ts
      lane?: number;
    }
  | NibpDeviceAction // Stage 2
  | AlarmDeviceAction // Stage 4b
  | MonitorDeviceAction; // Stage 4b

export type EcgFilterMode = 'monitor' | 'diagnostic';
```

In `packages/engine-core/src/types.ts` (edit 3 of 5), replace this block (it occurs exactly once):

```ts
    | { type: 'device'; action: DeviceAction }
    | HemoCommandBody // Stage 2 (types-hemo.ts)
  );
```

with:

```ts
    | { type: 'device'; action: DeviceAction }
    | HemoCommandBody // Stage 2 (types-hemo.ts)
    | { type: 'applyEvent'; event: DeviceClinicalEvent } // Stage 4b (types-device.ts)
  );
```

In `packages/engine-core/src/types.ts` (edit 4 of 5), replace this block (it occurs exactly once):

```ts
      type: 'alarm'; t: SimSeconds; id: string; priority: 'high' | 'medium' | 'low'; category: 'physiological' | 'technical';
      state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'; text: string;
    }
  | { type: 'measurement'; t: SimSeconds; values: Partial<Record<NumericId, Measured>> }
```

with:

```ts
      type: 'alarm'; t: SimSeconds; id: string; priority: 'high' | 'medium' | 'low'; category: 'physiological' | 'technical';
      state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'; text: string;
      /** Stage 4b (request E-4a-3): 1 = highest; set on every alarm the device layer emits. */
      level?: AlarmLevel;
    }
  | { type: 'measurement'; t: SimSeconds; values: Partial<Record<NumericId, Measured>> }
```

In `packages/engine-core/src/types.ts` (edit 5 of 5), replace this block (it occurs exactly once):

```ts
      /** Sim time of the event the tone marks (the detected R for 'qrs'); lets the audio side judge staleness. */
      refT?: SimSeconds;
    }
  /** Revoke tones: those listed in `ids` when present (the engine's normal case), else every tone with t > after. */
  | { type: 'toneCancel'; after: SimSeconds; ids?: string[] }
  | HemoEvent; // Stage 2 (types-hemo.ts)

export type EngineEventType = EngineEvent['type'];
```

with:

```ts
      /** Sim time of the event the tone marks (the detected R for 'qrs'); lets the audio side judge staleness. */
      refT?: SimSeconds;
      /** 'charge' only (request E-4a-3): how long the charge takes, s. */
      chargeS?: number;
    }
  /** Revoke tones: those listed in `ids` when present (the engine's normal case), else every tone with t > after. */
  | { type: 'toneCancel'; after: SimSeconds; ids?: string[] }
  | HemoEvent // Stage 2 (types-hemo.ts)
  | DeviceEvent; // Stage 4b (types-device.ts)

export type EngineEventType = EngineEvent['type'];
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/types-device.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  2 passed (2)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/src/types-device.ts packages/engine-core/src/types.ts packages/engine-core/test/types-device.test.ts
git commit -m "feat(engine-core): stage 4b device types — defib/pacer events, alarm/monitor actions, alarmStatus/deviceStatus, alarm level, charge time" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: ECG filter as any skin band (request E-4a-1)

**Files:**
- Modify: `packages/engine-core/src/engine.ts`
- Modify: `packages/engine-core/src/l3/ecg-filter.ts`
- Modify: `packages/engine-core/src/types.ts`
- Test: `packages/engine-core/test/l3/ecg-filter-bands.test.ts`

**Interfaces:**
- Consumes: `designEcgFilter`, `FILTER_BANDS` (Stage 1 `l3/ecg-filter.ts`).
- Produces: `EcgFilterMode = 'monitor' | 'diagnostic' | \`band:${number}-${number}\``; `filterBand(mode): readonly [lo, hi] | null`; `designEcgFilter` accepts band modes (notch when hi < 100 Hz); the engine accepts `{device:'ecg', action:'filter', value:'band:0.5-24'}`. Task 16 maps skin filter names to these modes.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/ecg-filter-bands.test.ts`:

```ts
// Stage 4b, request E-4a-1: the ECG filter as any skin band (brief §3.8 `ecg.filters`; research/05 §2.2).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { designEcgFilter, filterBand, magnitudeAt, toDb } from '../../src/l3/ecg-filter.ts';

const FS = 500;
/** Frequency (Hz) where the cascade first crosses −3 dB, searching from f0 in steps of df. */
function corner(mode: Parameters<typeof designEcgFilter>[0], f0: number, f1: number, df: number): number {
  const s = designEcgFilter(mode, FS, 50);
  for (let f = f0; df > 0 ? f <= f1 : f >= f1; f += df) if (toDb(magnitudeAt(s, f, FS)) >= -3.01) return f;
  return Number.NaN;
}

describe('ECG filter bands (E-4a-1)', () => {
  it('parses bands and rejects malformed or out-of-range ones', () => {
    expect(filterBand('monitor')).toEqual([0.5, 40]);
    expect(filterBand('band:0.5-24')).toEqual([0.5, 24]);
    expect(filterBand('band:.05-100')).toEqual([0.05, 100]);
    expect(filterBand('band:5-2' as never)).toBeNull();
    expect(filterBand('band:0.5-400')).toBeNull();
    expect(filterBand('bogus' as never)).toBeNull();
  });

  it('saadat-like MONITOR 0.5–24 Hz and EXTENDED 0.05–100 Hz have their −3 dB corners where the skin says', () => {
    expect(corner('band:0.5-24', 0.3, 1, 0.01)).toBeCloseTo(0.5, 1);
    expect(corner('band:0.5-24', 60, 10, -0.1)).toBeCloseTo(24, 0);
    expect(corner('band:0.05-100', 0.02, 0.2, 0.001)).toBeCloseTo(0.05, 2);
    expect(corner('band:0.05-100', 150, 50, -0.1)).toBeCloseTo(100, 0);
  });

  it('bands below 100 Hz get the mains notch, wider ones do not', () => {
    expect(toDb(magnitudeAt(designEcgFilter('band:0.5-24', FS, 50), 50, FS))).toBeLessThan(-40);
    expect(designEcgFilter('band:0.05-100', FS, 50)).toHaveLength(2);
  });

  it('the engine accepts a band filter command and rejects a bad one', () => {
    const e = createEngine({ seed: 1 });
    const ok = e.dispatch({ id: 'f1', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'band:0.5-24' } });
    const bad = e.dispatch({ id: 'f2', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'band:30-20' } });
    expect(ok.accepted).toBe(true);
    expect(bad.accepted).toBe(false);
    e.advanceTo(3);
    const out = new Float32Array(500);
    expect(e.readSamples('ecgII', 1000, out)).toBe(500);
    expect(out.every(Number.isFinite)).toBe(true);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/ecg-filter-bands.test.ts; cd -`
Expected: FAIL — `filterBand` is not exported (`SyntaxError … does not provide an export named 'filterBand'`)

- [x] **Step 3: Implement**

In `packages/engine-core/src/engine.ts` (edit 1 of 2), replace this block (it occurs exactly once):

```ts
import { DEFAULT_FLUTTER_ATRIAL_BPM, RHYTHMS } from './l2/ecg/rhythms.ts';
import { projectLead } from './l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterSample, type Biquad } from './l3/ecg-filter.ts';
import { createHrState, hrMeasure, hrOnQrs, type HrState } from './l3/hr.ts';
import { createQrsState, qrsStep, type QrsState } from './l3/qrs.ts';
```

with:

```ts
import { DEFAULT_FLUTTER_ATRIAL_BPM, RHYTHMS } from './l2/ecg/rhythms.ts';
import { projectLead } from './l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterBand, filterSample, type Biquad } from './l3/ecg-filter.ts';
import { createHrState, hrMeasure, hrOnQrs, type HrState } from './l3/hr.ts';
import { createQrsState, qrsStep, type QrsState } from './l3/qrs.ts';
```

In `packages/engine-core/src/engine.ts` (edit 2 of 2), replace this block (it occurs exactly once):

```ts
        const a = cmd.action;
        if (a.device !== 'ecg') return `device ${String(a.device)} is not implemented until later stages`;
        if (a.action === 'filter') return a.value === 'monitor' || a.value === 'diagnostic' ? undefined : 'filter must be monitor or diagnostic';
        if (a.action === 'lead') {
          if (!LEAD_IDS.includes(a.value as LeadId)) return 'lead must be a LeadId';
```

with:

```ts
        const a = cmd.action;
        if (a.device !== 'ecg') return `device ${String(a.device)} is not implemented until later stages`;
        if (a.action === 'filter') return typeof a.value === 'string' && filterBand(a.value as EcgFilterMode) ? undefined : "filter must be monitor, diagnostic or 'band:<lo>-<hi>' (lo 0.01–10 Hz, hi 10–200 Hz)"; // Stage 4b (E-4a-1)
        if (a.action === 'lead') {
          if (!LEAD_IDS.includes(a.value as LeadId)) return 'lead must be a LeadId';
```

In `packages/engine-core/src/l3/ecg-filter.ts`, replace this block (it occurs exactly once):

```ts
export const notch = (f0: number, fs: number, q = NOTCH_Q): Biquad => rbj('notch', f0, fs, q);

export const FILTER_BANDS: Readonly<Record<EcgFilterMode, readonly [number, number]>> = {
  monitor: [0.5, 40],
  diagnostic: [0.05, 150],
};

/** The section cascade for a mode at sample rate fs. */
export function designEcgFilter(mode: EcgFilterMode, fs: number, mainsHz: 50 | 60 = 50): Biquad[] {
  const [lo, hi] = FILTER_BANDS[mode];
  const sections = [highpass(lo, fs), lowpass(hi, fs)];
  if (mode === 'monitor') sections.push(notch(mainsHz, fs));
  return sections;
}
```

with:

```ts
export const notch = (f0: number, fs: number, q = NOTCH_Q): Biquad => rbj('notch', f0, fs, q);

export const FILTER_BANDS: Readonly<Record<'monitor' | 'diagnostic', readonly [number, number]>> = {
  monitor: [0.5, 40],
  diagnostic: [0.05, 150],
};

/** Band limits accepted for 'band:<lo>-<hi>' (Stage 4b, request E-4a-1): every skin band lies inside [ENG]. */
export const BAND_LO_RANGE = [0.01, 10] as const;
export const BAND_HI_RANGE = [10, 200] as const;
/** A band filter gets the mains notch when its upper corner is below this (research/05 §2.2: Mindray notches the
 * monitor, surgical and ST modes, not diagnostic) [ENG]. */
export const BAND_NOTCH_BELOW_HZ = 100;

/** [lo, hi] Hz of a filter mode ('band:0.5-24' → [0.5, 24]), or null when the band is malformed or out of range. */
export function filterBand(mode: EcgFilterMode): readonly [number, number] | null {
  if (mode === 'monitor' || mode === 'diagnostic') return FILTER_BANDS[mode];
  const m = /^band:([0-9]*\.?[0-9]+)-([0-9]*\.?[0-9]+)$/.exec(String(mode));
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  const ok = lo >= BAND_LO_RANGE[0] && lo <= BAND_LO_RANGE[1] && hi >= BAND_HI_RANGE[0] && hi <= BAND_HI_RANGE[1] && lo < hi;
  return ok ? [lo, hi] : null;
}

/** The section cascade for a mode at sample rate fs. */
export function designEcgFilter(mode: EcgFilterMode, fs: number, mainsHz: 50 | 60 = 50): Biquad[] {
  const band = filterBand(mode);
  if (!band) throw new RangeError(`unknown ECG filter ${String(mode)}`);
  const [lo, hi] = band;
  const sections = [highpass(lo, fs), lowpass(hi, fs)];
  if (mode === 'monitor' || (mode !== 'diagnostic' && hi < BAND_NOTCH_BELOW_HZ)) sections.push(notch(mainsHz, fs));
  return sections;
}
```

In `packages/engine-core/src/types.ts`, replace this block (it occurs exactly once):

```ts
  | MonitorDeviceAction; // Stage 4b

export type EcgFilterMode = 'monitor' | 'diagnostic';

export type Command = CommandBase &
```

with:

```ts
  | MonitorDeviceAction; // Stage 4b

/** 'monitor' 0.5–40 Hz + notch, 'diagnostic' 0.05–150 Hz, or any skin band 'band:<lo>-<hi>' (Stage 4b, request E-4a-1). */
export type EcgFilterMode = 'monitor' | 'diagnostic' | `band:${number}-${number}`;

export type Command = CommandBase &
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/ecg-filter-bands.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  4 passed (4)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/l3/ecg-filter.ts packages/engine-core/src/types.ts packages/engine-core/test/l3/ecg-filter-bands.test.ts
git commit -m "feat(engine-core): ECG filter bands from skins (E-4a-1): band:<lo>-<hi> modes with the mains notch below 100 Hz" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `DeviceProfile`: what the device layer needs from a skin

**Files:**
- Create: `packages/engine-core/src/l3/alarms/profile.ts`
- Test: `packages/engine-core/test/l3/alarms/profile.test.ts`

**Interfaces:**
- Consumes: `resolveSkin`, `LimitTable`, `ResolvedSkin`, `Skin` from `@pme/skins` (Task 1 dependency).
- Produces (`l3/alarms/profile.ts`): `LIMIT_KEYS`, `BAROMETRIC_MMHG = 760`, `PACING_HR_DASHES`, `interface LimitDef {numeric, label, upper, low, high, level, approximate}`, `interface DeviceProfile` (fields listed in the file), `limitGroup(key)`, `skinBand(b)`, `deviceProfile(id, band = 'adult'): DeviceProfile`. Tasks 6–8 add `volume` and `arrhythmiaPvcPerMin` to the profile with edit blocks.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/alarms/profile.test.ts`:

```ts
// DeviceProfile from the skins (brief §6.4.1, §6.8 tables).
import { describe, expect, it } from 'vitest';
import { BAROMETRIC_MMHG, deviceProfile, limitGroup, skinBand } from '../../../src/l3/alarms/profile.ts';

describe('deviceProfile', () => {
  it('saadat-like: factory OFF, the four always-on alarms, 120 s silence that hides visuals, no pause, 10 s asystole', () => {
    const p = deviceProfile('saadat-like');
    expect(p.factoryEnabled).toBe(false);
    expect(p.alwaysOn).toEqual(['ASYSTOLE', 'VFIB', 'VTAC', 'APNEA']);
    expect(p.silence).toEqual({ durationS: 120, suppressesVisual: true, cancelOnNewAlarm: true, technicalActsAsAck: true });
    expect(p.pauseS).toBeNull();
    expect(p.latching).toBe(false);
    expect(p.prefix).toBe('none');
    expect(p.arrhythmia.asystoleS).toBe(10);
    expect(p.arrhythmia.vtacRate).toBe(120);
    expect(p.limits.HR).toMatchObject({ numeric: 'hr', low: 50, high: 150, level: 1 });
    expect(p.limits.EtCO2_pctV?.low).toBeCloseTo((2.6 * BAROMETRIC_MMHG) / 100, 6);
    expect(p.limits.EtCO2_pctV?.level).toBe(2);
    expect(p.defib).toBeNull();
    expect(p.pacer).toBeNull();
  });

  it('philips-like: limits by age band (HR 50–120 / 75–160 / 100–200), desat 80, 4 s / 3 s asystole, 90 s silence, 180 s pause', () => {
    expect(deviceProfile('philips-like', 'adult').limits.HR).toMatchObject({ low: 50, high: 120, level: 2 });
    expect(deviceProfile('philips-like', 'paed').limits.HR).toMatchObject({ low: 75, high: 160 });
    const neo = deviceProfile('philips-like', 'neo');
    expect(neo.limits.HR).toMatchObject({ low: 100, high: 200 });
    expect(neo.arrhythmia.asystoleS).toBe(3);
    const a = deviceProfile('philips-like');
    expect(a.desat).toBe(80);
    expect(a.arrhythmia.asystoleS).toBe(4);
    expect(a.silence.durationS).toBe(90);
    expect(a.silence.suppressesVisual).toBe(false);
    expect(a.pauseS).toBe(180);
    expect(a.latching).toBe(true);
    expect(a.prefix).toBe('asterisks');
  });

  it('saadat-like paediatric band marks inherited limits approximate (brief §6.8)', () => {
    const p = deviceProfile('saadat-like', 'paed');
    expect(p.limits.HR?.approximate).toBe(true);
    expect(p.limits.NIBP_S).toMatchObject({ low: 70, high: 120, approximate: false });
  });

  it('zoll-like: no published limits (never invented), defib 120 J, pacer defaults; lifepak-like dashes HR while pacing', () => {
    const z = deviceProfile('zoll-like');
    expect(z.limits).toEqual({});
    expect(z.defib?.energyAdultJ).toBe(120);
    expect(z.pacer?.rateDefault).toBe(70);
    expect(z.syncMarker).toBe('r-above');
    expect(z.hrDashesWhilePacing).toBe(false);
    expect(deviceProfile('lifepak-like').hrDashesWhilePacing).toBe(true);
  });

  it('presets resolve through their base skin; engine age-band names map to skin bands', () => {
    expect(deviceProfile('iran-icu-as-found').prefix).toBe('none');
    expect(deviceProfile('iran-icu-as-found').switches).toEqual({ HR: false, RR: false, NIBP: true, SpO2: true });
    expect(limitGroup('NIBP_S')).toBe('NIBP');
    expect(skinBand('paediatric')).toBe('paed');
    expect(skinBand('neonatal')).toBe('neo');
    expect(skinBand(undefined)).toBe('adult');
    expect(() => deviceProfile('nope-like')).toThrow();
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/alarms/profile.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../../src/l3/alarms/profile.ts"`

- [x] **Step 3: Implement**

Create `packages/engine-core/src/l3/alarms/profile.ts`:

```ts
// The device layer's view of a skin (brief §3.8, §6.4, §6.4.1, §6.5, §6.8): everything the alarm manager, the
// defibrillator and the pacer need, as plain JSON-safe data built once per skin/age-band switch from @pme/skins.
import { resolveSkin, type LimitTable, type ResolvedSkin, type Skin } from '@pme/skins';
import type { AgeBand, AlarmLevel } from '../../types-device.ts';
import type { NumericId } from '../../types.ts';

/** Skin limit key → the measured numeric it watches and its display labels (IEC-style / Saadat-like). */
export const LIMIT_KEYS: Readonly<Record<string, { numeric: NumericId; label: string; upper: string; gas?: boolean }>> = {
  HR: { numeric: 'hr', label: 'HR', upper: 'HR' },
  SpO2: { numeric: 'spo2', label: 'SpO2', upper: '%SPO2' }, // "%SPO2 LOW" (brief §6.4.1)
  NIBP_S: { numeric: 'nibpSys', label: 'NBPs', upper: 'NIBP SYS' },
  NIBP_D: { numeric: 'nibpDia', label: 'NBPd', upper: 'NIBP DIA' },
  NIBP_M: { numeric: 'nibpMean', label: 'NBPm', upper: 'NIBP MEAN' },
  ART_S: { numeric: 'abpSys', label: 'ABPs', upper: 'ART SYS' },
  ART_D: { numeric: 'abpDia', label: 'ABPd', upper: 'ART DIA' },
  ART_M: { numeric: 'abpMean', label: 'ABPm', upper: 'ART MEAN' },
  CVP_M: { numeric: 'cvpMean', label: 'CVP', upper: 'CVP MEAN' },
  PAP_S: { numeric: 'papSys', label: 'PAPs', upper: 'PAP SYS' },
  PAP_D: { numeric: 'papDia', label: 'PAPd', upper: 'PAP DIA' },
  PAP_M: { numeric: 'papMean', label: 'PAPm', upper: 'PAP MEAN' },
  RR: { numeric: 'rr', label: 'RR', upper: 'RR' },
  AWRR: { numeric: 'awrr', label: 'awRR', upper: 'AWRR', gas: true },
  EtCO2: { numeric: 'etco2', label: 'etCO2', upper: 'ETCO2', gas: true },
  EtCO2_pctV: { numeric: 'etco2', label: 'etCO2', upper: 'ETCO2', gas: true },
  TEMP: { numeric: 'tempCore', label: 'Temp', upper: 'TEMP' },
  T1: { numeric: 'tempCore', label: 'T1', upper: 'T1' },
  T2: { numeric: 'tempSite', label: 'T2', upper: 'T2' },
  ST_mV: { numeric: 'stII', label: 'ST-II', upper: 'ST-II' },
};

/** %V → mmHg at the simulated barometric pressure (brief §6.8: the engine shows CO2 in mmHg, R12) [ENG 760 mmHg]. */
export const BAROMETRIC_MMHG = 760;
/** Skins whose HR reads dashes and whose HR alarms are off while the pacer runs (research/05 §2.6, LIFEPAK 15). */
export const PACING_HR_DASHES: ReadonlySet<string> = new Set(['lifepak-like']);

export interface LimitDef {
  numeric: NumericId;
  label: string;
  upper: string;
  low: number | null;
  high: number | null;
  level: AlarmLevel;
  approximate: boolean;
}

export interface DeviceProfile {
  skin: string;
  ageBand: AgeBand;
  /** 'asterisks' → IEC-style `***HR 130>120`; 'none' → Saadat-like `HR TOO HIGH` (brief §6.4, §6.4.1). */
  prefix: 'asterisks' | 'none';
  factoryEnabled: boolean;
  /** Preset per-parameter switches by limit-key group ('HR', 'NIBP', 'SpO2', …) over factoryEnabled (brief §6.9). */
  switches: Record<string, boolean>;
  alwaysOn: string[];
  latching: boolean;
  delayS: number;
  spo2DelayS: number;
  silence: { durationS: number; suppressesVisual: boolean; cancelOnNewAlarm: boolean; technicalActsAsAck: boolean };
  pauseS: number | null;
  limits: Record<string, LimitDef>;
  /** SpO2 desaturation threshold (%), level 1 (brief §6.4), or null. */
  desat: number | null;
  arrhythmia: {
    defaultOn: boolean;
    asystoleS: number;
    pause: { s: number } | { ratio: number };
    vtacRate: number;
    vtacCount: number;
    tachy: number | null;
    brady: number | null;
  };
  defib: Skin['defib'];
  pacer: Skin['pacer'];
  syncMarker: Skin['syncMarker'];
  nibpDoneTone: boolean;
  hrDashesWhilePacing: boolean;
}

/** Limit-key group a per-parameter switch acts on: 'NIBP_S' → 'NIBP', 'ART_M' → 'ART', 'HR' → 'HR'. */
export const limitGroup = (key: string): string => key.split('_')[0] as string;

/** Engine age bands (brief §7.1 EngineOptions.device.ageBand) → skin bands. */
export function skinBand(b: 'adult' | 'paediatric' | 'neonatal' | AgeBand | undefined): AgeBand {
  return b === 'paediatric' || b === 'paed' ? 'paed' : b === 'neonatal' || b === 'neo' ? 'neo' : 'adult';
}

/** Limit alarm level: Saadat-like parameter alarms default to 1, gas alarms 2 (brief §6.4.1); IEC-style limit
 * alarms are yellow (2) as on the Philips-like `**` messages (research/05 §2.4) [ENG for the IEC mapping]. */
function limitLevel(skin: Skin, gas: boolean): AlarmLevel {
  if (skin.alarms.soundProfile === 'saadat') return gas ? 2 : 1;
  return 2;
}

function limitsFor(r: ResolvedSkin, band: AgeBand): Record<string, LimitDef> {
  const table: LimitTable = r.limits[band] ?? {};
  const out: Record<string, LimitDef> = {};
  for (const [key, v] of Object.entries(table)) {
    const k = LIMIT_KEYS[key];
    if (!k || !Array.isArray(v)) continue;
    const scale = key.endsWith('_pctV') ? BAROMETRIC_MMHG / 100 : 1;
    out[key] = {
      numeric: k.numeric,
      label: k.label,
      upper: k.upper,
      low: v[0] * scale,
      high: v[1] * scale,
      level: limitLevel(r.skin, k.gas === true),
      approximate: r.approximateLimits[band].includes(key),
    };
  }
  return out;
}

/** Build the profile for a skin (or preset) id and an age band. Throws for an unknown id (resolveSkin does). */
export function deviceProfile(id: string, band: AgeBand = 'adult'): DeviceProfile {
  const r = resolveSkin(id);
  const s = r.skin;
  const a = s.alarms;
  const ar = s.arrhythmia;
  const desat = r.limits[band]?.SpO2_desat;
  return {
    skin: id,
    ageBand: band,
    prefix: a.messageBar.prefix,
    factoryEnabled: a.factoryEnabled,
    switches: { ...(r.preset?.alarmSwitches ?? {}) },
    alwaysOn: [...a.alwaysOn],
    latching: a.latching,
    delayS: a.delayS,
    spo2DelayS: a.spo2DelayS ?? a.delayS,
    silence: { durationS: a.silence.durationS, suppressesVisual: a.silence.suppressesVisual, cancelOnNewAlarm: a.silence.cancelOnNewAlarm, technicalActsAsAck: a.silence.technicalActsAsAck },
    pauseS: a.pause ? a.pause.durationS : null,
    limits: limitsFor(r, band),
    desat: typeof desat === 'number' ? desat : null,
    arrhythmia: {
      defaultOn: ar.defaultOn,
      asystoleS: band === 'neo' ? ar.asystoleS.neo : ar.asystoleS.adult,
      pause: 'ratio' in ar.pause ? { ratio: ar.pause.ratio } : { s: band === 'neo' ? ar.pause.neoS : ar.pause.adultS },
      vtacRate: ar.vtac.rate,
      vtacCount: ar.vtac.count,
      tachy: ar.tachy,
      brady: ar.brady,
    },
    defib: s.defib ? structuredClone(s.defib) : null,
    pacer: s.pacer ? structuredClone(s.pacer) : null,
    syncMarker: s.syncMarker,
    nibpDoneTone: s.nibp.doneTone,
    hrDashesWhilePacing: PACING_HR_DASHES.has(r.skinId),
  };
}
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/alarms/profile.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  5 passed (5)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/alarms/profile.ts packages/engine-core/test/l3/alarms/profile.test.ts
git commit -m "feat(engine-core): DeviceProfile from the resolved skin — limits by age band, silence/pause/latching, arrhythmia, defib/pacer" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Alarm message texts (IEC-style asterisks, Saadat-like uppercase)

**Files:**
- Create: `packages/engine-core/src/l3/alarms/text.ts`
- Test: `packages/engine-core/test/l3/alarms/text.test.ts`

**Interfaces:**
- Consumes: `DeviceProfile`, `LimitDef` (Task 5).
- Produces (`l3/alarms/text.ts`): `type FixedAlarmId`, `fixedText(p, id, level, technical)`, `limitText(p, def, 'HIGH'|'LOW', value)`.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/alarms/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import { fixedText, limitText } from '../../../src/l3/alarms/text.ts';

describe('alarm texts', () => {
  const ph = deviceProfile('philips-like');
  const sa = deviceProfile('saadat-like');
  it('IEC-style: asterisks by level and value>limit (brief §6.4)', () => {
    expect(limitText(ph, ph.limits.HR!, 'HIGH', 131)).toBe('**HR 131>120');
    expect(limitText(ph, ph.limits.SpO2!, 'LOW', 88)).toBe('**SpO2 88<90');
    expect(fixedText(ph, 'ASYSTOLE', 1, false)).toBe('***ASYSTOLE');
    expect(fixedText(ph, 'ecgLeadsOff', 3, true)).toBe('ECG LEADS OFF');
  });
  it('Saadat-like: uppercase, no asterisks (brief §6.4.1)', () => {
    expect(limitText(sa, sa.limits.HR!, 'LOW', 40)).toBe('HR TOO LOW');
    expect(limitText(sa, sa.limits.SpO2!, 'LOW', 85)).toBe('%SPO2 LOW');
    expect(fixedText(sa, 'ASYSTOLE', 1, false)).toBe('ECG ASYSTOLE');
    expect(fixedText(sa, 'ecgLeadsOff', 3, true)).toBe('ECG CHECK LA/RA/LL');
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/alarms/text.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../../src/l3/alarms/text.ts"`

- [x] **Step 3: Implement**

Create `packages/engine-core/src/l3/alarms/text.ts`:

```ts
// Alarm message text (brief §6.4 "Message format: `***SpO2 94<96`"; brief §6.4.1: Saadat-like messages are English
// uppercase without asterisks, e.g. "HR TOO LOW", "%SPO2 LOW", "ECG ASYSTOLE"). Texts not quoted by a source are
// [inferred] from those patterns.
import type { AlarmLevel } from '../../types-device.ts';
import type { DeviceProfile, LimitDef } from './profile.ts';

export type FixedAlarmId =
  | 'ASYSTOLE' | 'VFIB' | 'VTAC' | 'EXTREME_BRADY' | 'EXTREME_TACHY' | 'BRADY' | 'TACHY' | 'PAUSE' | 'PVCS' | 'DESAT'
  | 'ecgLeadsOff' | 'spo2SensorOff' | 'nibp-failed';

const IEC_TEXT: Record<FixedAlarmId, string> = {
  ASYSTOLE: 'ASYSTOLE',
  VFIB: 'VFIB/VTACH', // Philips-like red arrhythmia alarm name [inferred]
  VTAC: 'VTACH',
  EXTREME_BRADY: 'EXTREME BRADY',
  EXTREME_TACHY: 'EXTREME TACHY',
  BRADY: 'BRADY',
  TACHY: 'TACHY',
  PAUSE: 'PAUSE',
  PVCS: 'PVCs/min HIGH',
  DESAT: 'DESAT',
  ecgLeadsOff: 'ECG LEADS OFF', // brief §6.2 "LEADS OFF" INOP
  spo2SensorOff: 'SpO2 SENSOR OFF', // brief §6.2
  'nibp-failed': 'NBP MEASUREMENT FAILED', // brief §6.3
};

const SAADAT_TEXT: Record<FixedAlarmId, string> = {
  ASYSTOLE: 'ECG ASYSTOLE', // brief §6.4.1
  VFIB: 'ECG VFIB',
  VTAC: 'ECG VTAC',
  EXTREME_BRADY: 'HR TOO LOW',
  EXTREME_TACHY: 'HR TOO HIGH',
  BRADY: 'ECG BRADY',
  TACHY: 'ECG TACHY',
  PAUSE: 'ECG PAUSE',
  PVCS: 'ECG PVCS HIGH',
  DESAT: '%SPO2 LOW',
  ecgLeadsOff: 'ECG CHECK LA/RA/LL', // brief §6.4.1
  spo2SensorOff: 'SPO2 SENSOR OFF',
  'nibp-failed': 'NIBP MEASUREMENT FAILED',
};

/** IEC-style priority marks: *** high, ** medium, * low (research/05 §2.5). Technical INOPs carry none. */
const stars = (level: AlarmLevel): string => '*'.repeat(4 - level);

export function fixedText(p: DeviceProfile, id: FixedAlarmId, level: AlarmLevel, technical: boolean): string {
  if (p.prefix === 'none') return SAADAT_TEXT[id];
  return `${technical ? '' : stars(level)}${IEC_TEXT[id]}`;
}

const fmt = (v: number): string => (Math.abs(v) >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1));

/** Limit alarm text: IEC-style `**HR 130>120`, Saadat-like `HR TOO HIGH` / `%SPO2 LOW`. */
export function limitText(p: DeviceProfile, d: LimitDef, side: 'HIGH' | 'LOW', value: number): string {
  if (p.prefix === 'none') return d.numeric === 'spo2' ? `${d.upper} ${side}` : `${d.upper} TOO ${side}`;
  const lim = side === 'HIGH' ? (d.high as number) : (d.low as number);
  return `${stars(d.level)}${d.label} ${fmt(value)}${side === 'HIGH' ? '>' : '<'}${fmt(lim)}`;
}
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/alarms/text.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  2 passed (2)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/alarms/text.ts packages/engine-core/test/l3/alarms/text.test.ts
git commit -m "feat(engine-core): alarm message texts — IEC-style ***/**/* with value>limit, Saadat-like uppercase" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Alarm manager: delays, latching, silence, pause, acknowledge, `alarmStatus`

**Files:**
- Create: `packages/engine-core/src/l3/alarms/manager.ts`
- Modify: `packages/engine-core/src/l3/alarms/profile.ts`
- Modify: `packages/engine-core/src/types-device.ts`
- Test: `packages/engine-core/test/l3/alarms/manager.test.ts`

**Interfaces:**
- Consumes: `DeviceProfile`, `limitGroup` (Task 5); `AlarmDeviceAction`, `AlarmEntry`, `LimitState` (Task 3).
- Produces (`l3/alarms/manager.ts`): `interface Condition {id, level, category, text, delayS, numeric?}`, `interface AlarmConfig`, `interface AlarmMgrState`, `LEVEL_PRIORITY`, `defaultConfig(p)`, `createAlarmMgr(p)`, `setProfile(s, p, t, out)`, `limitOf(s, key)`, `isEnabled(s, key)`, `validateAlarmAction(s, a)`, `applyAlarmAction(s, a, t, out)`, `stepAlarms(s, t, conds, out)`, `alarmStatus(s, t)`. `DeviceProfile` gains `volume`; the `alarmStatus` event gains `volume`.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/alarms/manager.test.ts`:

```ts
// Alarm life cycle (brief §6.4, §6.4.1) with synthetic conditions, stepped at the engine's 20 ms tick.
import { describe, expect, it } from 'vitest';
import { applyAlarmAction, createAlarmMgr, stepAlarms, validateAlarmAction, type AlarmMgrState, type Condition } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
type Status = Extract<EngineEvent, { type: 'alarmStatus' }>;
const TICK = 0.02;

/** Step from t0 to t1 with `conds(t)` true; returns every event. */
function run(s: AlarmMgrState, t0: number, t1: number, conds: (t: number) => Condition[]): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = Math.round(t0 / TICK); k <= Math.round(t1 / TICK); k++) stepAlarms(s, k * TICK, conds(k * TICK), out);
  return out;
}
const alarms = (ev: EngineEvent[], state?: Alarm['state']) => ev.filter((e): e is Alarm => e.type === 'alarm' && (!state || e.state === state));
const HR: Condition = { id: 'HR_HIGH', level: 2, category: 'physiological', text: '**HR 130>120', delayS: 0, numeric: 'hr' };
const SPO2: Condition = { id: 'SpO2_LOW', level: 2, category: 'physiological', text: '**SpO2 85<90', delayS: 10, numeric: 'spo2' };
const ASY: Condition = { id: 'ASYSTOLE', level: 1, category: 'physiological', text: '***ASYSTOLE', delayS: 0 };
const LEADS: Condition = { id: 'ecgLeadsOff', level: 3, category: 'technical', text: 'ECG LEADS OFF', delayS: 0 };

describe('alarm manager', () => {
  it('raises after the condition delay (SpO2 10 s) with priority and level', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const ev = run(s, 0, 12, (t) => (t >= 1 ? [SPO2] : []));
    const r = alarms(ev, 'raised');
    expect(r).toHaveLength(1);
    expect(r[0]!.t).toBeCloseTo(11, 6);
    expect(r[0]).toMatchObject({ priority: 'medium', level: 2, category: 'physiological', text: '**SpO2 85<90' });
  });

  it('IEC-style latching: a red alarm stays (latched) after its condition clears until acknowledged', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 2, (t) => (t < 1 ? [ASY] : []));
    expect(s.active.ASYSTOLE?.latched).toBe(true);
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'ack' }, 2.1, out);
    expect(alarms(out, 'cleared').map((a) => a.id)).toEqual(['ASYSTOLE']);
    expect(s.active.ASYSTOLE).toBeUndefined();
  });

  it('Saadat-like does not latch; a medium IEC-style alarm does not latch either', () => {
    const sa = createAlarmMgr(deviceProfile('saadat-like'));
    const ev = run(sa, 0, 2, (t) => (t < 1 ? [ASY] : []));
    expect(alarms(ev, 'cleared').map((a) => a.id)).toEqual(['ASYSTOLE']);
    const ph = createAlarmMgr(deviceProfile('philips-like'));
    expect(alarms(run(ph, 0, 2, (t) => (t < 1 ? [HR] : [])), 'cleared').map((a) => a.id)).toEqual(['HR_HIGH']);
  });

  it('Saadat-like silence: 120 s, technical alarms acknowledged, a NEW alarm ends it, pressing again ends it', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    run(s, 0, 1, () => [ASY, LEADS]);
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, out);
    expect(s.silencedUntil).toBeCloseTo(121, 6);
    expect(alarms(out, 'acked').map((a) => a.id)).toEqual(['ecgLeadsOff']);
    expect(alarms(out, 'silenced').map((a) => a.id)).toEqual(['ASYSTOLE']);
    run(s, 1.02, 30, () => [ASY, LEADS]);
    expect(s.silencedUntil).not.toBeNull();
    const ev = run(s, 30.02, 31, () => [ASY, LEADS, { ...HR, id: 'HR_HIGH', level: 1 }]);
    expect(alarms(ev, 'raised').map((a) => a.id)).toEqual(['HR_HIGH']);
    expect(s.silencedUntil).toBeNull();
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 31, []);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 32, []);
    expect(s.silencedUntil).toBeNull();
  });

  it('Saadat-like silence runs out after 120 s', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    run(s, 0, 1, () => [ASY]);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 120.98, () => [ASY]);
    expect(s.silencedUntil).not.toBeNull();
    run(s, 121, 121, () => [ASY]);
    expect(s.silencedUntil).toBeNull();
  });

  it('IEC-style silence (90 s) is not ended by a new alarm', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 1, () => [HR]);
    applyAlarmAction(s, { device: 'alarm', action: 'silence' }, 1, []);
    run(s, 1.02, 5, () => [HR, ASY]);
    expect(s.silencedUntil).toBeCloseTo(91, 6);
  });

  it('pause (IEC-style 180 s) removes every alarm and raises nothing until it ends; Saadat-like rejects pause', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    run(s, 0, 1, () => [HR]);
    const out: EngineEvent[] = [];
    applyAlarmAction(s, { device: 'alarm', action: 'pause' }, 1, out);
    expect(alarms(out, 'paused').map((a) => a.id)).toEqual(['HR_HIGH']);
    expect(alarms(run(s, 1.02, 180.98, () => [HR, ASY]), 'raised')).toHaveLength(0);
    const after = alarms(run(s, 181, 181.1, () => [HR, ASY]), 'raised');
    expect(after.map((a) => a.id).sort()).toEqual(['ASYSTOLE', 'HR_HIGH']);
    expect(validateAlarmAction(createAlarmMgr(deviceProfile('saadat-like')), { device: 'alarm', action: 'pause' })).toMatch(/no function/);
  });

  it('alarmStatus on every change and at 1 Hz; saadat-like starts all-off, the preset turns NIBP and SpO2 on', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    const st = run(s, 0, 3, () => []).filter((e): e is Status => e.type === 'alarmStatus');
    expect(st.map((e) => e.t)).toEqual([0, 1, 2, 3]);
    expect(st[0]!.allOff).toBe(true);
    expect(st[0]!.limits.HR).toMatchObject({ enabled: false, low: 50, high: 150 });
    const pre = createAlarmMgr(deviceProfile('iran-icu-as-found'));
    const ps = run(pre, 0, 0, () => []).find((e): e is Status => e.type === 'alarmStatus')!;
    expect(ps.limits.NIBP_S?.enabled).toBe(true);
    expect(ps.limits.SpO2?.enabled).toBe(true);
    expect(ps.limits.HR?.enabled).toBe(false);
    expect(ps.allOff).toBe(false);
  });

  it('setLimit / enable / setVolume validate and apply', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    expect(validateAlarmAction(s, { device: 'alarm', action: 'setLimit', param: 'HR', low: 60, high: 50 })).toMatch(/below/);
    expect(validateAlarmAction(s, { device: 'alarm', action: 'setLimit', param: 'XX', low: 1 })).toMatch(/no alarm limit/);
    applyAlarmAction(s, { device: 'alarm', action: 'setLimit', param: 'HR', high: 100 }, 0, []);
    applyAlarmAction(s, { device: 'alarm', action: 'enable', param: 'NIBP', value: false }, 0, []);
    const st = run(s, 0, 0, () => []).find((e): e is Status => e.type === 'alarmStatus')!;
    expect(st.limits.HR).toMatchObject({ low: 50, high: 100, enabled: true });
    expect(st.limits.NIBP_M?.enabled).toBe(false);
    expect(validateAlarmAction(s, { device: 'alarm', action: 'setVolume', value: 11 })).toMatch(/volume/);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/alarms/manager.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../../src/l3/alarms/manager.ts"`

- [x] **Step 3: Implement**

Create `packages/engine-core/src/l3/alarms/manager.ts`:

```ts
// Alarm manager (brief §6.4 IEC-style, §6.4.1 Saadat-like): turns conditions into raised / cleared / acked /
// silenced / paused alarm events with the skin's priorities, delays, latching, silence and pause rules, and keeps
// one `alarmStatus` summary for the renderer. Conditions are computed elsewhere (conditions.ts); this module only
// owns their life cycle. All state is plain JSON-safe data (engine snapshot).
import type { AlarmDeviceAction, AlarmEntry, AlarmLevel, AlarmPriority, LimitState } from '../../types-device.ts';
import type { EngineEvent, NumericId } from '../../types.ts';
import { limitGroup, type DeviceProfile } from './profile.ts';

/** One condition as evaluated this tick. */
export interface Condition {
  id: string;
  level: AlarmLevel;
  category: 'physiological' | 'technical';
  text: string;
  /** Must hold continuously this long before the alarm is raised (s). */
  delayS: number;
  numeric?: NumericId;
}

export interface AlarmConfig {
  /** Per-parameter switch by limit-key group ('HR', 'NIBP', …). */
  enabled: Record<string, boolean>;
  /** Limits edited by `setLimit`, by limit key. */
  limits: Record<string, { low: number | null; high: number | null }>;
  arrhythmia: boolean;
  volume: number;
}

export interface AlarmMgrState {
  profile: DeviceProfile;
  cfg: AlarmConfig;
  /** Condition id → sim time it became true (while not yet raised). */
  pending: Record<string, number>;
  active: Record<string, AlarmEntry>;
  silencedUntil: number | null;
  pausedUntil: number | null;
  lastStatusT: number;
  dirty: boolean;
}

export const LEVEL_PRIORITY: Readonly<Record<AlarmLevel, AlarmPriority>> = { 1: 'high', 2: 'medium', 3: 'low' };
const STATUS_EVERY_S = 1; // alarmStatus at 1 Hz besides every change (brief §3.4 "alarm changes") [ENG]

export function defaultConfig(p: DeviceProfile): AlarmConfig {
  const enabled: Record<string, boolean> = {};
  for (const key of Object.keys(p.limits)) {
    const g = limitGroup(key);
    enabled[g] = p.switches[g] ?? p.factoryEnabled;
  }
  return { enabled, limits: {}, arrhythmia: p.arrhythmia.defaultOn, volume: p.volume.default };
}

export function createAlarmMgr(p: DeviceProfile): AlarmMgrState {
  return { profile: p, cfg: defaultConfig(p), pending: {}, active: {}, silencedUntil: null, pausedUntil: null, lastStatusT: -1, dirty: true };
}

/** Switch skin or age band: the new profile's defaults replace the configuration; active alarms are re-evaluated. */
export function setProfile(s: AlarmMgrState, p: DeviceProfile, t: number, out: EngineEvent[]): void {
  for (const a of Object.values(s.active)) emitAlarm(out, t, a, 'cleared');
  s.profile = p;
  s.cfg = defaultConfig(p);
  s.pending = {};
  s.active = {};
  s.silencedUntil = null;
  s.pausedUntil = null;
  s.dirty = true;
}

/** Effective limit (after setLimit) for a limit key, or null when the skin has none. */
export function limitOf(s: AlarmMgrState, key: string): { low: number | null; high: number | null } | null {
  const d = s.profile.limits[key];
  if (!d) return null;
  return s.cfg.limits[key] ?? { low: d.low, high: d.high };
}

export function isEnabled(s: AlarmMgrState, key: string): boolean {
  return s.cfg.enabled[limitGroup(key)] ?? s.profile.factoryEnabled;
}

function emitAlarm(out: EngineEvent[], t: number, a: AlarmEntry, state: 'raised' | 'cleared' | 'acked' | 'silenced' | 'paused'): void {
  out.push({ type: 'alarm', t, id: a.id, priority: LEVEL_PRIORITY[a.level], category: a.category, state, text: a.text, level: a.level });
}

/** Validation for `device alarm` actions: a reason, or undefined when accepted. */
export function validateAlarmAction(s: AlarmMgrState, a: AlarmDeviceAction): string | undefined {
  switch (a.action) {
    case 'silence':
    case 'ack':
    case 'enableAll':
      return undefined;
    case 'pause':
      return s.profile.pauseS === null ? `alarm pause has no function on ${s.profile.skin}` : undefined;
    case 'setLimit': {
      if (!a.param || !s.profile.limits[a.param]) return `no alarm limit ${String(a.param)} on ${s.profile.skin}`;
      const lo = a.low ?? null;
      const hi = a.high ?? null;
      if ((lo !== null && !Number.isFinite(lo)) || (hi !== null && !Number.isFinite(hi))) return 'limits must be finite numbers';
      return lo !== null && hi !== null && lo >= hi ? 'low must be below high' : undefined;
    }
    case 'enable':
      if (!a.param || !Object.keys(s.profile.limits).some((k) => k === a.param || limitGroup(k) === a.param)) return `no alarm ${String(a.param)} on ${s.profile.skin}`;
      return typeof a.value === 'boolean' ? undefined : 'enable needs value true or false';
    case 'arrhythmiaAnalysis':
      return typeof a.value === 'boolean' ? undefined : 'arrhythmiaAnalysis needs value true or false';
    case 'setVolume': {
      const v = s.profile.volume;
      return typeof a.value === 'number' && Number.isInteger(a.value) && a.value >= v.min && a.value <= v.max ? undefined : `volume must be an integer ${v.min}–${v.max}`;
    }
    default:
      return `unknown alarm action ${String((a as { action: string }).action)}`;
  }
}

/** Apply a validated `device alarm` action at sim time t. */
export function applyAlarmAction(s: AlarmMgrState, a: AlarmDeviceAction, t: number, out: EngineEvent[]): void {
  s.dirty = true;
  const p = s.profile;
  switch (a.action) {
    case 'silence': {
      if (s.silencedUntil !== null) {
        s.silencedUntil = null; // pressing Silence again ends it (brief §6.4.1)
        return;
      }
      s.silencedUntil = t + p.silence.durationS;
      for (const e of Object.values(s.active)) {
        if (e.category === 'technical' && p.silence.technicalActsAsAck) {
          e.acked = true;
          emitAlarm(out, t, e, 'acked');
        } else emitAlarm(out, t, e, 'silenced');
      }
      return;
    }
    case 'pause': {
      s.pausedUntil = t + (p.pauseS as number);
      for (const e of Object.values(s.active)) emitAlarm(out, t, e, 'paused');
      s.active = {};
      s.pending = {};
      return;
    }
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
    case 'setLimit': {
      const key = a.param as string;
      const cur = limitOf(s, key) as { low: number | null; high: number | null };
      s.cfg.limits[key] = { low: a.low !== undefined ? a.low : cur.low, high: a.high !== undefined ? a.high : cur.high };
      return;
    }
    case 'enable':
      s.cfg.enabled[limitGroup(a.param as string)] = a.value as boolean;
      return;
    case 'enableAll':
      for (const g of Object.keys(s.cfg.enabled)) s.cfg.enabled[g] = a.value !== false;
      return;
    case 'arrhythmiaAnalysis':
      s.cfg.arrhythmia = a.value as boolean;
      return;
    case 'setVolume':
      s.cfg.volume = a.value as number;
      return;
  }
}

/**
 * Advance the life cycle to sim time t with this tick's true conditions: raise after the delay, clear when gone
 * (unless latched), end silence/pause on time or on a new alarm (saadat), and emit alarmStatus on change and at 1 Hz.
 */
export function stepAlarms(s: AlarmMgrState, t: number, conds: readonly Condition[], out: EngineEvent[]): void {
  const p = s.profile;
  if (s.pausedUntil !== null && t >= s.pausedUntil) {
    s.pausedUntil = null;
    s.dirty = true;
  }
  if (s.silencedUntil !== null && t >= s.silencedUntil) {
    s.silencedUntil = null;
    s.dirty = true;
  }
  const now = new Set<string>();
  for (const c of conds) {
    now.add(c.id);
    if (s.pausedUntil !== null) continue; // pause: nothing is raised (brief §6.4 "Pause stops all alarms")
    const e = s.active[c.id];
    if (e) {
      if (e.latched) {
        e.latched = false; // the condition came back while latched
        s.dirty = true;
      }
      continue;
    }
    const since = (s.pending[c.id] ??= t);
    if (t - since + 1e-9 < c.delayS) continue;
    delete s.pending[c.id];
    const entry: AlarmEntry = { id: c.id, level: c.level, category: c.category, text: c.text, since: t, latched: false, acked: false };
    if (c.numeric) entry.numeric = c.numeric;
    s.active[c.id] = entry;
    if (s.silencedUntil !== null && p.silence.cancelOnNewAlarm) s.silencedUntil = null; // brief §6.4.1: any new alarm ends silence
    emitAlarm(out, t, entry, 'raised');
    s.dirty = true;
  }
  for (const id of Object.keys(s.pending)) if (!now.has(id)) delete s.pending[id];
  for (const [id, e] of Object.entries(s.active)) {
    if (now.has(id)) continue;
    // High-priority physiological alarms latch until acknowledged (brief §6.4 [ENG]); Saadat-like does not latch.
    if (p.latching && e.level === 1 && e.category === 'physiological' && !e.acked) {
      if (!e.latched) {
        e.latched = true;
        s.dirty = true;
      }
      continue;
    }
    delete s.active[id];
    emitAlarm(out, t, e, 'cleared');
    s.dirty = true;
  }
  if (s.dirty || t - s.lastStatusT >= STATUS_EVERY_S - 1e-9) {
    out.push(alarmStatus(s, t));
    s.lastStatusT = t;
    s.dirty = false;
  }
}

/** The renderer's summary (types-device.ts `alarmStatus`). */
export function alarmStatus(s: AlarmMgrState, t: number): Extract<EngineEvent, { type: 'alarmStatus' }> {
  const p = s.profile;
  const limits: Record<string, LimitState> = {};
  for (const [key, d] of Object.entries(p.limits)) {
    const l = limitOf(s, key) as { low: number | null; high: number | null };
    limits[key] = { numeric: d.numeric, low: l.low, high: l.high, enabled: isEnabled(s, key), level: d.level, approximate: d.approximate };
  }
  const groups = Object.values(s.cfg.enabled);
  return {
    type: 'alarmStatus',
    t,
    skin: p.skin,
    ageBand: p.ageBand,
    active: Object.values(s.active).map((e) => ({ ...e })).sort((a, b) => a.level - b.level || a.since - b.since),
    silencedUntil: s.silencedUntil,
    pausedUntil: s.pausedUntil,
    limits,
    allOff: groups.length > 0 && groups.every((v) => !v),
    arrhythmiaAnalysis: s.cfg.arrhythmia,
    volume: s.cfg.volume,
  };
}
```

In `packages/engine-core/src/l3/alarms/profile.ts` (edit 1 of 2), replace this block (it occurs exactly once):

```ts
  silence: { durationS: number; suppressesVisual: boolean; cancelOnNewAlarm: boolean; technicalActsAsAck: boolean };
  pauseS: number | null;
  limits: Record<string, LimitDef>;
  /** SpO2 desaturation threshold (%), level 1 (brief §6.4), or null. */
```

with:

```ts
  silence: { durationS: number; suppressesVisual: boolean; cancelOnNewAlarm: boolean; technicalActsAsAck: boolean };
  pauseS: number | null;
  volume: { min: number; max: number; default: number };
  limits: Record<string, LimitDef>;
  /** SpO2 desaturation threshold (%), level 1 (brief §6.4), or null. */
```

In `packages/engine-core/src/l3/alarms/profile.ts` (edit 2 of 2), replace this block (it occurs exactly once):

```ts
    silence: { durationS: a.silence.durationS, suppressesVisual: a.silence.suppressesVisual, cancelOnNewAlarm: a.silence.cancelOnNewAlarm, technicalActsAsAck: a.silence.technicalActsAsAck },
    pauseS: a.pause ? a.pause.durationS : null,
    limits: limitsFor(r, band),
    desat: typeof desat === 'number' ? desat : null,
```

with:

```ts
    silence: { durationS: a.silence.durationS, suppressesVisual: a.silence.suppressesVisual, cancelOnNewAlarm: a.silence.cancelOnNewAlarm, technicalActsAsAck: a.silence.technicalActsAsAck },
    pauseS: a.pause ? a.pause.durationS : null,
    volume: { ...a.volume },
    limits: limitsFor(r, band),
    desat: typeof desat === 'number' ? desat : null,
```

In `packages/engine-core/src/types-device.ts`, replace this block (it occurs exactly once):

```ts
      allOff: boolean;
      arrhythmiaAnalysis: boolean;
    }
  | {
```

with:

```ts
      allOff: boolean;
      arrhythmiaAnalysis: boolean;
      /** Alarm volume step (skin range, brief §6.4 / §6.4.1). */
      volume: number;
    }
  | {
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/alarms/manager.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  9 passed (9)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/alarms/manager.ts packages/engine-core/src/l3/alarms/profile.ts packages/engine-core/src/types-device.ts packages/engine-core/test/l3/alarms/manager.test.ts
git commit -m "feat(engine-core): alarm manager — onset delays, IEC-style latching, silence (90/120 s), pause, ack, alarmStatus at 1 Hz" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Alarm conditions from what the monitor sees

**Files:**
- Create: `packages/engine-core/src/l3/alarms/conditions.ts`
- Modify: `packages/engine-core/src/l3/alarms/profile.ts`
- Test: `packages/engine-core/test/l3/alarms/conditions.test.ts`

**Interfaces:**
- Consumes: Tasks 5–7.
- Produces (`l3/alarms/conditions.ts`): `VF_CONFIRM_S = 3`, `DESAT_DELAY_S = 20`, `STALE_S`, `VT_GAP_S`, `EXTREME_OFFSET`, `EXTREME_CLAMP`, `interface AlarmInputs`, `createInputs(t0)`, `observeQrs(inp, tR)`, `observeEvent(inp, e)`, `buildConditions(s, inp, t): Condition[]`. `DeviceProfile` gains `arrhythmiaPvcPerMin`.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/alarms/conditions.test.ts`:

```ts
// Conditions from synthetic monitor inputs (brief §6.4 conditions, §6.4.1 always-on set).
import { describe, expect, it } from 'vitest';
import { buildConditions, createInputs, observeEvent, observeQrs, VF_CONFIRM_S } from '../../../src/l3/alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr } from '../../../src/l3/alarms/manager.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../../src/types.ts';

const ids = (c: { id: string }[]) => c.map((x) => x.id).sort();
const meas = (t: number, values: Record<string, number>): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v, flag: 'valid', at: t }])),
});
const beat = (t: number, origin: 'sinus' | 'ventricular', template = origin === 'sinus' ? 'normal' : 'wide'): EngineEvent => ({
  type: 'beat', t, seq: Math.round(t * 100), origin, template, qrsMs: 90, qtMs: 380, mech: { perfused: true, kSV: 1, svMl: 70, lvetMs: 280 },
});

describe('alarm conditions', () => {
  it('limit alarms need the switch ON (saadat-like factory OFF); fresh values only', () => {
    const s = createAlarmMgr(deviceProfile('saadat-like'));
    const inp = createInputs();
    observeQrs(inp, 9.5);
    observeEvent(inp, meas(10, { hr: 170 }));
    expect(ids(buildConditions(s, inp, 10))).toEqual([]);
    applyAlarmAction(s, { device: 'alarm', action: 'enable', param: 'HR', value: true }, 10, []);
    expect(ids(buildConditions(s, inp, 10))).toEqual(['HR_HIGH']);
    expect(ids(buildConditions(s, inp, 19.5))).toContain('ASYSTOLE'); // saadat-like: 10 s without a QRS … and HR 170 is stale
    expect(ids(buildConditions(s, inp, 19.5))).not.toContain('HR_HIGH');
  });

  it('asystole after the skin interval with leads on; leads off gives the INOP and no asystole', () => {
    const ph = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    observeQrs(inp, 1);
    expect(ids(buildConditions(ph, inp, 4.98))).not.toContain('ASYSTOLE');
    expect(ids(buildConditions(ph, inp, 5))).toContain('ASYSTOLE');
    observeEvent(inp, { type: 'alarm', t: 5, id: 'ecgLeadsOff', priority: 'medium', category: 'technical', state: 'raised', text: 'ECG LEADS OFF' });
    expect(ids(buildConditions(ph, inp, 20))).toEqual(['ecgLeadsOff']);
  });

  it('VF after the confirmation time replaces asystole', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    const inp = createInputs();
    inp.vfSince = 10;
    expect(ids(buildConditions(s, inp, 10 + VF_CONFIRM_S))).toEqual(['VFIB']);
  });

  it('VTAC: a run of ≥ 5 ventricular beats at ≥ the skin rate (100 IEC-style, 120 Saadat-like)', () => {
    const inp = createInputs();
    for (let i = 0; i < 5; i++) observeEvent(inp, beat(10 + i * 0.55, 'ventricular')); // 109 bpm
    observeQrs(inp, 12.2);
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('philips-like')), inp, 12.3))).toContain('VTAC');
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('saadat-like')), inp, 12.3))).not.toContain('VTAC');
    observeEvent(inp, beat(12.8, 'sinus'));
    expect(ids(buildConditions(createAlarmMgr(deviceProfile('philips-like')), inp, 12.9))).not.toContain('VTAC');
  });

  it('extreme brady/tachy (arrhythmia analysis on): HR limit ∓ 20 clamped 40/200', () => {
    const s = createAlarmMgr(deviceProfile('philips-like'));
    applyAlarmAction(s, { device: 'alarm', action: 'arrhythmiaAnalysis', value: true }, 0, []);
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, meas(10, { hr: 141 }));
    expect(ids(buildConditions(s, inp, 10))).toEqual(['EXTREME_TACHY', 'HR_HIGH']);
    observeEvent(inp, meas(10, { hr: 39 }));
    expect(ids(buildConditions(s, inp, 10))).toEqual(['EXTREME_BRADY', 'HR_LOW']);
  });

  it('LIFEPAK-like: no HR alarms while pacing; technical SpO2 and NIBP flags', () => {
    const s = createAlarmMgr(deviceProfile('lifepak-like'));
    const inp = createInputs();
    observeQrs(inp, 9.9);
    observeEvent(inp, meas(10, { hr: 10 }));
    inp.pacing = true;
    inp.spo2Probe = 'off';
    observeEvent(inp, { type: 'alarm', t: 10, id: 'nibp-failed', priority: 'low', category: 'technical', state: 'raised', text: 'x' });
    expect(ids(buildConditions(s, inp, 10))).toEqual(['nibp-failed', 'spo2SensorOff']);
    observeEvent(inp, { type: 'nibp', t: 11, phase: 'inflating', cuffMmHg: 20 });
    expect(ids(buildConditions(s, inp, 11))).toEqual(['spo2SensorOff']);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/alarms/conditions.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../../src/l3/alarms/conditions.ts"`

- [x] **Step 3: Implement**

Create `packages/engine-core/src/l3/alarms/conditions.ts`:

```ts
// Alarm conditions (brief §6.4 "Conditions", §6.4.1, §6.2 sensors; research 03 §1.12, §8.10): what the monitor
// sees — displayed numerics, QRS detections, beat classes, sensor states — turned into this tick's true conditions.
// Inputs are plain JSON-safe data the engine keeps up to date (observe* functions); buildConditions is pure.
import type { EngineEvent, Measured, NumericId } from '../../types.ts';
import { isEnabled, limitOf, type AlarmMgrState, type Condition } from './manager.ts';
import { fixedText, limitText, type FixedAlarmId } from './text.ts';

/** VF is recognised this long after it starts (a monitor needs a few seconds of analysis) [ENG]. */
export const VF_CONFIRM_S = 3;
/** Desaturation alarm delay (brief §6.4: "desaturation (<80%, 20 s)"). */
export const DESAT_DELAY_S = 20;
/** A displayed numeric older than this is stale and raises nothing (NIBP excepted: it is episodic) [ENG]. */
export const STALE_S = 5;
/** A ventricular run ends when no ventricular beat came for this long [ENG]. */
export const VT_GAP_S = 2;
/** Extreme brady/tachy: the HR limit ∓ 20 bpm, clamped at 40/200 (adult) or 50/240 (neonatal) (brief §6.4). */
export const EXTREME_OFFSET = 20;
export const EXTREME_CLAMP = { adult: [40, 200], paed: [40, 200], neo: [50, 240] } as const;
const RR_EMA = 0.2; // mean R-R for the Saadat-like pause ratio (brief §6.4.1 "R-R > 2.1× mean R-R") [ENG weight]

export interface AlarmInputs {
  measured: Partial<Record<NumericId, Measured>>;
  lastQrsT: number | null;
  meanRR: number | null;
  /** ECG leads on since (s); monitoring for asystole starts here. */
  ecgOnSince: number;
  leadsOff: boolean;
  vfSince: number | null;
  vt: { count: number; firstT: number; lastT: number };
  pvcTimes: number[];
  spo2Probe: 'on' | 'off' | 'motion';
  nibpFailed: boolean;
  pacing: boolean;
}

export function createInputs(t0 = 0): AlarmInputs {
  return {
    measured: {}, lastQrsT: null, meanRR: null, ecgOnSince: t0, leadsOff: false, vfSince: null,
    vt: { count: 0, firstT: 0, lastT: -1e9 }, pvcTimes: [], spo2Probe: 'on', nibpFailed: false, pacing: false,
  };
}

/** A QRS detection at R time tR (s). */
export function observeQrs(inp: AlarmInputs, tR: number): void {
  if (inp.lastQrsT !== null) {
    const rr = tR - inp.lastQrsT;
    if (rr > 0.2) inp.meanRR = inp.meanRR === null ? rr : inp.meanRR + RR_EMA * (rr - inp.meanRR);
  }
  inp.lastQrsT = tR;
}

/** An engine event the device layer sees (measurements, beats, NIBP results and the raw technical flags). */
export function observeEvent(inp: AlarmInputs, e: EngineEvent): void {
  if (e.type === 'measurement') {
    for (const [k, m] of Object.entries(e.values)) if (m) inp.measured[k as NumericId] = m;
  } else if (e.type === 'beat') {
    const vent = e.origin === 'ventricular' && e.template !== 'pvc';
    if (e.template === 'pvc') {
      inp.pvcTimes.push(e.t);
      while (inp.pvcTimes.length > 0 && (inp.pvcTimes[0] as number) < e.t - 60) inp.pvcTimes.shift();
    }
    if (vent || e.template === 'pvc') {
      if (inp.vt.count > 0 && e.t - inp.vt.lastT < VT_GAP_S) inp.vt.count++;
      else inp.vt = { count: 1, firstT: e.t, lastT: e.t };
      inp.vt.lastT = e.t;
    } else inp.vt = { count: 0, firstT: e.t, lastT: -1e9 };
  } else if (e.type === 'alarm' && e.level === undefined) {
    // raw technical flags from L2 (lead-off.ts, hemo pipeline): the manager re-issues them with the skin's level
    if (e.id === 'ecgLeadsOff') inp.leadsOff = e.state === 'raised';
    if (e.id === 'nibp-failed') inp.nibpFailed = e.state === 'raised';
  } else if (e.type === 'nibp' && (e.phase === 'inflating' || e.result !== undefined)) {
    inp.nibpFailed = false;
  }
}

function valid(inp: AlarmInputs, id: NumericId, t: number): number | null {
  const m = inp.measured[id];
  if (!m || m.value === null || m.flag === 'invalid') return null;
  if (!id.startsWith('nibp') && t - m.at > STALE_S) return null;
  return m.value;
}

/** Every condition that is true at sim time t (the manager applies delays, switches and silence). */
export function buildConditions(s: AlarmMgrState, inp: AlarmInputs, t: number): Condition[] {
  const p = s.profile;
  const out: Condition[] = [];
  const fixed = (id: FixedAlarmId, level: 1 | 2 | 3, category: 'physiological' | 'technical', delayS = 0): Condition => ({
    id, level, category, text: fixedText(p, id, level, category === 'technical'), delayS,
  });
  const hrSuppressed = inp.pacing && p.hrDashesWhilePacing; // LIFEPAK-like: HR alarms off while pacing (research/05 §2.6)

  // Limit alarms on displayed numerics (brief §6.4), only where the per-parameter switch is ON (brief §6.4.1).
  for (const [key, d] of Object.entries(p.limits)) {
    if (!isEnabled(s, key) || (hrSuppressed && d.numeric === 'hr')) continue;
    const v = valid(inp, d.numeric, t);
    const l = limitOf(s, key);
    if (v === null || !l) continue;
    const delayS = d.numeric === 'spo2' ? p.spo2DelayS : p.delayS;
    const c = { level: d.level, category: 'physiological' as const, delayS, numeric: d.numeric };
    if (l.high !== null && v > l.high) out.push({ id: `${key}_HIGH`, text: limitText(p, d, 'HIGH', v), ...c });
    if (l.low !== null && v < l.low) out.push({ id: `${key}_LOW`, text: limitText(p, d, 'LOW', v), ...c });
  }
  const spo2 = valid(inp, 'spo2', t);
  if (p.desat !== null && spo2 !== null && spo2 < p.desat && isEnabled(s, 'SpO2')) out.push({ ...fixed('DESAT', 1, 'physiological', DESAT_DELAY_S), numeric: 'spo2' });

  // ECG: technical first; lethal arrhythmias whenever leads are on (they cannot be switched off, brief §6.4.1).
  if (inp.leadsOff) out.push(fixed('ecgLeadsOff', 3, 'technical'));
  else {
    const vf = inp.vfSince !== null && t - inp.vfSince >= VF_CONFIRM_S;
    if (vf) out.push(fixed('VFIB', 1, 'physiological'));
    const since = Math.max(inp.lastQrsT ?? -Infinity, inp.ecgOnSince);
    if (!vf && t - since >= p.arrhythmia.asystoleS) out.push(fixed('ASYSTOLE', 1, 'physiological'));
    const v = inp.vt;
    if (v.count >= p.arrhythmia.vtacCount && t - v.lastT < VT_GAP_S) {
      const rate = (60 * (v.count - 1)) / Math.max(1e-3, v.lastT - v.firstT);
      if (rate >= p.arrhythmia.vtacRate) out.push(fixed('VTAC', 1, 'physiological'));
    }
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
      if (inp.pvcTimes.filter((x) => x > t - 60).length >= p.arrhythmiaPvcPerMin) out.push(fixed('PVCS', 2, 'physiological'));
    }
  }
  if (inp.spo2Probe === 'off') out.push(fixed('spo2SensorOff', 3, 'technical'));
  if (inp.nibpFailed) out.push(fixed('nibp-failed', 3, 'technical'));
  return out;
}
```

In `packages/engine-core/src/l3/alarms/profile.ts` (edit 1 of 2), replace this block (it occurs exactly once):

```ts
    brady: number | null;
  };
  defib: Skin['defib'];
  pacer: Skin['pacer'];
```

with:

```ts
    brady: number | null;
  };
  /** PVCs/min alarm threshold (brief §6.4 "PVCs/min (10)"). */
  arrhythmiaPvcPerMin: number;
  defib: Skin['defib'];
  pacer: Skin['pacer'];
```

In `packages/engine-core/src/l3/alarms/profile.ts` (edit 2 of 2), replace this block (it occurs exactly once):

```ts
      brady: ar.brady,
    },
    defib: s.defib ? structuredClone(s.defib) : null,
    pacer: s.pacer ? structuredClone(s.pacer) : null,
```

with:

```ts
      brady: ar.brady,
    },
    arrhythmiaPvcPerMin: ar.freqPvcPerMin,
    defib: s.defib ? structuredClone(s.defib) : null,
    pacer: s.pacer ? structuredClone(s.pacer) : null,
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/alarms/conditions.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  6 passed (6)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/alarms/conditions.ts packages/engine-core/src/l3/alarms/profile.ts packages/engine-core/test/l3/alarms/conditions.test.ts
git commit -m "feat(engine-core): alarm conditions — limits, desat, asystole, VF, VT runs, brady/tachy, pause, PVCs, technical INOPs" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Device layer in the engine: alarms live (skin, age band, sensors, silence)

**Files:**
- Modify: `packages/engine-core/src/engine.ts`
- Modify: `packages/engine-core/src/l3/alarms/conditions.ts`
- Create: `packages/engine-core/src/l3/device-layer.ts`
- Test: `packages/engine-core/test/engine/alarms-engine.test.ts`
- Test: `packages/engine-core/test/helpers/device.ts`

**Interfaces:**
- Consumes: Tasks 3–8; the engine's `flush`, `apply`, `validate`, `snapshot/restore` (Stages 1–2).
- Produces (`l3/device-layer.ts`, first version; Task 13 replaces it): `VF_RHYTHMS`, `DEFAULT_SKIN = 'philips-like'`, `interface DeviceState {alarms, inputs}`, `interface DeviceHost {simT, rhythmId, spo2Probe, setModifiers}`, `createDevice(skin, ageBand)`, `validateDeviceCommand(d, cmd)`, `applyDeviceCommand(d, cmd, host, out)`, `deviceOnQrs(d, tR)`, `stepDevice(d, host, due, out)`. `engine.ts`: `EngineOptions.device.skin` picks the profile; `attachSensor ecg`; `device alarm|monitor` commands; raw L2 technical alarm events are re-issued by the manager with `level`; the snapshot carries `dev`. Test helper `test/helpers/device.ts`: `devRig(skin, opts)`, `alarmsOf`, `beats`, `markers`.

- [x] **Step 1: Write the failing tests**

Create `packages/engine-core/test/engine/alarms-engine.test.ts`:

```ts
// Stage 4b acceptance: the alarm engine inside the running engine (brief §6.4, §6.4.1, §6.8).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { alarmsOf, beats, cmd, devRig } from '../helpers/device.ts';

type Meas = Extract<EngineEvent, { type: 'measurement' }>;
const hrAbove = (ev: EngineEvent[], v: number) => ev.find((x): x is Meas => x.type === 'measurement' && (x.values.hr?.value ?? 0) > v);

describe('alarm engine in the engine', () => {
  it('philips-like: HR above 120 raises **HR at the first displayed value over the limit (no added delay), medium', () => {
    const { e, ev } = devRig('philips-like');
    e.advanceTo(10);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 150 }));
    e.advanceTo(30);
    const first = hrAbove(ev, 120)!;
    const r = alarmsOf(ev, 'HR_HIGH', 'raised')[0]!;
    expect(r.t - first.t).toBeGreaterThanOrEqual(0);
    expect(r.t - first.t).toBeLessThanOrEqual(0.02 + 1e-9);
    expect(r).toMatchObject({ priority: 'medium', level: 2, category: 'physiological' });
    expect(r.text).toMatch(/^\*\*HR \d+>120$/);
  });

  it('saadat-like: nothing is raised for HR 170 while alarms are factory OFF; switched ON, HR TOO HIGH follows after the 1 s delay, level 1', () => {
    const { e, ev } = devRig('saadat-like');
    e.advanceTo(5);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 170 }));
    e.advanceTo(30);
    expect(alarmsOf(ev)).toEqual([]);
    const st = ev.filter((x) => x.type === 'alarmStatus').pop() as Extract<EngineEvent, { type: 'alarmStatus' }>;
    expect(st.allOff).toBe(true);
    e.dispatch(cmd({ type: 'device', action: { device: 'alarm', action: 'enable', param: 'HR', value: true } }));
    const on = e.now().simT + 0.02; // the switch applies on the next tick
    e.advanceTo(40);
    const r = alarmsOf(ev, 'HR_HIGH', 'raised')[0]!;
    expect(r.t - on).toBeCloseTo(1, 6); // skin alarms.delayS = 1 ("less than 1 s", brief §6.4.1); HR was already over 150
    expect(r).toMatchObject({ priority: 'high', level: 1, text: 'HR TOO HIGH' });
  });

  for (const [skin, s] of [['saadat-like', 10], ['philips-like', 4]] as const) {
    it(`${skin}: asystole ${s} s after the last QRS, level 1`, () => {
      const { e, ev } = devRig(skin);
      e.advanceTo(10);
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'asystole' }));
      e.advanceTo(30);
      const lastR = beats(ev).pop()!.t;
      const r = alarmsOf(ev, 'ASYSTOLE', 'raised')[0]!;
      expect(r.t - lastR).toBeGreaterThan(s - 0.2);
      expect(r.t - lastR).toBeLessThan(s + 0.2);
      expect(r.level).toBe(1);
    });
  }

  it('VF raises VFIB (level 1) within 3.1 s, VT raises VTAC after a run of 5, on both profiles', () => {
    for (const skin of ['philips-like', 'saadat-like']) {
      const { e, ev } = devRig(skin);
      e.advanceTo(10);
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
      e.advanceTo(20);
      const vf = alarmsOf(ev, 'VFIB', 'raised')[0]!;
      expect(vf.t - 10).toBeLessThan(3.1 + 0.2);
      expect(vf.priority).toBe('high');
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vtMono' }));
      e.advanceTo(30);
      const vt = alarmsOf(ev, 'VTAC', 'raised')[0]!;
      const vBeats = beats(ev).filter((b) => b.t > 20 && b.origin === 'ventricular');
      expect(vt.t).toBeGreaterThanOrEqual(vBeats[4]!.t);
      expect(vt.t - vBeats[4]!.t).toBeLessThan(0.1);
      expect(alarmsOf(ev, 'VFIB', 'cleared').length + (skin === 'philips-like' ? 1 : 0)).toBeGreaterThanOrEqual(1);
    }
  });

  it('age band switch: HR 140 is HIGH for an adult (50–120) and inside the paediatric window (75–160)', () => {
    const { e, ev } = devRig('philips-like');
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 140 }));
    e.advanceTo(20);
    expect(alarmsOf(ev, 'HR_HIGH', 'raised')).toHaveLength(1);
    e.dispatch(cmd({ type: 'device', action: { device: 'monitor', action: 'ageBand', value: 'paed' } }));
    e.advanceTo(30);
    expect(alarmsOf(ev, 'HR_HIGH', 'cleared')).toHaveLength(1);
    expect(alarmsOf(ev, 'HR_HIGH', 'raised')).toHaveLength(1);
    const st = ev.filter((x) => x.type === 'alarmStatus').pop() as Extract<EngineEvent, { type: 'alarmStatus' }>;
    expect(st.ageBand).toBe('paed');
    expect(st.limits.HR).toMatchObject({ low: 75, high: 160 });
  });

  it('technical alarms on sensor detach: ECG leads off (and no asystole), SpO2 probe off', () => {
    const { e, ev } = devRig('saadat-like');
    e.advanceTo(5);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'ecg', state: 'off' }));
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'off' }));
    e.advanceTo(40);
    const lo = alarmsOf(ev, 'ecgLeadsOff', 'raised')[0]!;
    expect(lo).toMatchObject({ category: 'technical', level: 3, priority: 'low', text: 'ECG CHECK LA/RA/LL' });
    expect(alarmsOf(ev, 'spo2SensorOff', 'raised')[0]).toMatchObject({ category: 'technical', level: 3 });
    expect(alarmsOf(ev, 'ASYSTOLE')).toEqual([]);
    expect(ev.some((x) => x.type === 'alarm' && x.level === undefined)).toBe(false); // raw L2 flags are re-issued, not passed on
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'ecg', state: 'on' }));
    e.advanceTo(45);
    expect(alarmsOf(ev, 'ecgLeadsOff', 'cleared')).toHaveLength(1);
  });

  it('skin switch without restart: the tick keeps counting and the new profile applies', () => {
    const { e, ev } = devRig('saadat-like');
    e.advanceTo(3);
    const r = e.dispatch(cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: 'philips-like' } }));
    expect(r.accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: 'nope-like' } })).accepted).toBe(false);
    e.advanceTo(5);
    expect(e.now().tick).toBe(250);
    const st = ev.filter((x) => x.type === 'alarmStatus').pop() as Extract<EngineEvent, { type: 'alarmStatus' }>;
    expect(st.skin).toBe('philips-like');
    expect(st.allOff).toBe(false);
  });

  it('snapshot/restore carries the alarm state', () => {
    const { e } = devRig('saadat-like');
    e.dispatch(cmd({ type: 'device', action: { device: 'alarm', action: 'enable', param: 'HR', value: true } }));
    e.advanceTo(2);
    const snap = e.snapshot();
    const { e: e2, ev: ev2 } = devRig('philips-like');
    e2.restore(snap);
    e2.advanceTo(3);
    const st = ev2.filter((x) => x.type === 'alarmStatus').pop() as Extract<EngineEvent, { type: 'alarmStatus' }>;
    expect(st.skin).toBe('saadat-like');
    expect(st.limits.HR?.enabled).toBe(true);
  });
});
```

Create `packages/engine-core/test/helpers/device.ts`:

```ts
// Stage 4b test helpers: an engine on a given skin with every event recorded.
import { createEngine } from '../../src/engine.ts';
import type { EngineOptions, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd } from './hemo.ts';

export { cmd };
export type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
export type Marker = Extract<EngineEvent, { type: 'marker' }>;
export type Beat = Extract<EngineEvent, { type: 'beat' }>;

export function devRig(skin: string, opts: Omit<EngineOptions, 'device'> & { ageBand?: 'adult' | 'paediatric' | 'neonatal' } = {}): { e: MonitorEngine; ev: EngineEvent[] } {
  const { ageBand, ...rest } = opts;
  const e = createEngine({ seed: 11, ...rest, device: { skin, ...(ageBand ? { ageBand } : {}) } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return { e, ev };
}

export const alarmsOf = (ev: EngineEvent[], id?: string, state?: Alarm['state']): Alarm[] =>
  ev.filter((x): x is Alarm => x.type === 'alarm' && x.level !== undefined && (!id || x.id === id) && (!state || x.state === state));
export const beats = (ev: EngineEvent[]): Beat[] => ev.filter((x): x is Beat => x.type === 'beat');
export const markers = (ev: EngineEvent[], kind?: Marker['kind']): Marker[] => ev.filter((x): x is Marker => x.type === 'marker' && (!kind || x.kind === kind));
```

- [x] **Step 2: Run them to see them fail**

Run: `cd packages/engine-core && npx vitest run test/engine/alarms-engine.test.ts; cd -`
Expected: FAIL — `alarmsOf(ev, 'HR_HIGH', 'raised')[0]` is undefined (no alarm events yet) and `device monitor` commands are rejected

- [x] **Step 3: Implement**

In `packages/engine-core/src/engine.ts` (edit 1 of 11), replace this block (it occurs exactly once):

```ts
} from './l2/hemo/pipeline.ts'; // Stage 2
import { HEMO_RATE } from './l2/hemo/params.ts'; // Stage 2

export const SAMPLES_PER_TICK = (ECG_RATE * TICK_MS) / 1000; // 10
```

with:

```ts
} from './l2/hemo/pipeline.ts'; // Stage 2
import { HEMO_RATE } from './l2/hemo/params.ts'; // Stage 2
import { applyDeviceCommand, createDevice, deviceOnQrs, stepDevice, validateDeviceCommand, type DeviceHost, type DeviceState } from './l3/device-layer.ts'; // Stage 4b

export const SAMPLES_PER_TICK = (ECG_RATE * TICK_MS) / 1000; // 10
```

In `packages/engine-core/src/engine.ts` (edit 2 of 11), replace this block (it occurs exactly once):

```ts
  private readonly sections = new Map<EcgFilterMode, Biquad[]>();
  private readonly groupTicks = new Map<string, number>(); // Stage 2: stageGroup → tick (brief §4.9)

  constructor(opts: EngineOptions) {
```

with:

```ts
  private readonly sections = new Map<EcgFilterMode, Biquad[]>();
  private readonly groupTicks = new Map<string, number>(); // Stage 2: stageGroup → tick (brief §4.9)
  private dev: DeviceState; // Stage 4b: alarms, defibrillator, pacer (brief §6.4–§6.5)
  private readonly devOpts: EngineOptions['device']; // Stage 4b: for restoring pre-4b snapshots

  constructor(opts: EngineOptions) {
```

In `packages/engine-core/src/engine.ts` (edit 3 of 11), replace this block (it occurs exactly once):

```ts
    }
    this.mainsHz = opts.device?.mainsHz ?? 50;
    const rng = createRngState(this.seed);
    const rhythmId = opts.patient?.rhythm?.id ?? 'sinus';
```

with:

```ts
    }
    this.mainsHz = opts.device?.mainsHz ?? 50;
    this.devOpts = opts.device;
    this.dev = createDevice(opts.device?.skin, opts.device?.ageBand); // Stage 4b (throws for an unknown skin)
    const rng = createRngState(this.seed);
    const rhythmId = opts.patient?.rhythm?.id ?? 'sinus';
```

In `packages/engine-core/src/engine.ts` (edit 4 of 11), replace this block (it occurs exactly once):

```ts
      seed: this.seed,
      tick: this.tick,
      state: structuredClone({ st: this.st, queue: this.queue, mainsHz: this.mainsHz }),
    };
  }
```

with:

```ts
      seed: this.seed,
      tick: this.tick,
      state: structuredClone({ st: this.st, queue: this.queue, mainsHz: this.mainsHz, dev: this.dev }), // Stage 4b: dev
    };
  }
```

In `packages/engine-core/src/engine.ts` (edit 5 of 11), replace this block (it occurs exactly once):

```ts
    // Exact replay is promised only on the same build and the same filter design (review L10).
    if (s.engineVersion !== this.version) throw new Error(`snapshot is from engine version ${s.engineVersion}, this is ${this.version}`);
    const data = structuredClone(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }>; mainsHz?: number };
    if (data.mainsHz !== undefined && data.mainsHz !== this.mainsHz) {
      throw new Error(`snapshot was taken with ${data.mainsHz} Hz mains filtering, this engine uses ${this.mainsHz} Hz`);
```

with:

```ts
    // Exact replay is promised only on the same build and the same filter design (review L10).
    if (s.engineVersion !== this.version) throw new Error(`snapshot is from engine version ${s.engineVersion}, this is ${this.version}`);
    const data = structuredClone(s.state) as { st: PipelineState; queue: Array<{ cmd: Command; tick: number }>; mainsHz?: number; dev?: DeviceState };
    if (data.mainsHz !== undefined && data.mainsHz !== this.mainsHz) {
      throw new Error(`snapshot was taken with ${data.mainsHz} Hz mains filtering, this engine uses ${this.mainsHz} Hz`);
```

In `packages/engine-core/src/engine.ts` (edit 6 of 11), replace this block (it occurs exactly once):

```ts
    this.st = data.st;
    this.queue = data.queue;
    this.tick = s.tick;
    this.syncLaneBuffers();
```

with:

```ts
    this.st = data.st;
    this.queue = data.queue;
    this.dev = data.dev ?? createDevice(this.devOpts?.skin, this.devOpts?.ageBand); // Stage 4b
    this.tick = s.tick;
    this.syncLaneBuffers();
```

In `packages/engine-core/src/engine.ts` (edit 7 of 11), replace this block (it occurs exactly once):

```ts
    for (const p of this.posted.values()) maxPostedN = Math.max(maxPostedN, p.n);
    for (const d of this.st.detections) if (this.dirtyFromN < Infinity || d.n <= maxPostedN) this.committedDet.push(d);
    this.st.detections.length = 0;
    this.flush(simT);
    if (speculate) this.speculate();
  }
```

with:

```ts
    for (const p of this.posted.values()) maxPostedN = Math.max(maxPostedN, p.n);
    for (const d of this.st.detections) if (this.dirtyFromN < Infinity || d.n <= maxPostedN) this.committedDet.push(d);
    for (const d of this.st.detections) deviceOnQrs(this.dev, d.r / ECG_RATE); // Stage 4b
    this.st.detections.length = 0;
    const devOut: EngineEvent[] = []; // Stage 4b
    for (const e of stepDevice(this.dev, this.deviceHost(simT), this.flush(simT), devOut)) this.emit(e);
    for (const e of devOut) this.emit(e);
    if (speculate) this.speculate();
  }
```

In `packages/engine-core/src/engine.ts` (edit 8 of 11), replace this block (it occurs exactly once):

```ts
  }

  /** Emit committed records whose time has come, in time order. */
  private flush(simT: number): void {
    const due: EngineEvent[] = [];
    const keep = (list: EngineEvent[]) =>
```

with:

```ts
  }

  /** Committed records whose time has come, in time order (Stage 4b: returned for the device layer to see first). */
  private flush(simT: number): EngineEvent[] {
    const due: EngineEvent[] = [];
    const keep = (list: EngineEvent[]) =>
```

In `packages/engine-core/src/engine.ts` (edit 9 of 11), replace this block (it occurs exactly once):

```ts
    this.st.hemo.out = keep(this.st.hemo.out); // Stage 2
    due.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
    for (const e of due) this.emit(e);
  }
```

with:

```ts
    this.st.hemo.out = keep(this.st.hemo.out); // Stage 2
    due.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
    return due;
  }

  /** Stage 4b: the committed state as the device layer sees it; its writes invalidate the look-ahead. */
  private deviceHost(simT: number): DeviceHost {
    const ps = this.st;
    return {
      simT,
      rhythmId: ps.rhythm.id,
      spo2Probe: ps.hemo.pleth.state,
      setModifiers: (patch) => {
        ps.mods = mergeModifiers(ps.mods, patch);
        this.dirtyFromN = Math.min(this.dirtyFromN, ps.n);
      },
    };
  }
```

In `packages/engine-core/src/engine.ts` (edit 10 of 11), replace this block (it occurs exactly once):

```ts
    // freeze or poison the pipeline for good (review M5).
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    const hemo = validateHemoCommand(cmd, this.st.hemo); // Stage 2
    if (hemo !== null) return hemo;
```

with:

```ts
    // freeze or poison the pipeline for good (review M5).
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    const dev = validateDeviceCommand(this.dev, cmd); // Stage 4b
    if (dev !== null) return dev;
    const hemo = validateHemoCommand(cmd, this.st.hemo); // Stage 2
    if (hemo !== null) return hemo;
```

In `packages/engine-core/src/engine.ts` (edit 11 of 11), replace this block (it occurs exactly once):

```ts
      ps.hr = retarget(ps.hr, simT, v, r);
    };
    if (applyHemoCommand(ps.hemo, ps.l1, cmd, simT, setHr, ps.rng)) {
      this.syncHemoBuffers(); // Stage 2
```

with:

```ts
      ps.hr = retarget(ps.hr, simT, v, r);
    };
    const devOut: EngineEvent[] = []; // Stage 4b
    if (applyDeviceCommand(this.dev, cmd, this.deviceHost(simT), devOut)) {
      for (const e of devOut) this.emit(e);
      return;
    }
    if (applyHemoCommand(ps.hemo, ps.l1, cmd, simT, setHr, ps.rng)) {
      this.syncHemoBuffers(); // Stage 2
```

In `packages/engine-core/src/l3/alarms/conditions.ts`, replace this block (it occurs exactly once):

```ts
    id, level, category, text: fixedText(p, id, level, category === 'technical'), delayS,
  });
  const hrSuppressed = inp.pacing && p.hrDashesWhilePacing; // LIFEPAK-like: HR alarms off while pacing (research/05 §2.6)

  // Limit alarms on displayed numerics (brief §6.4), only where the per-parameter switch is ON (brief §6.4.1).
```

with:

```ts
    id, level, category, text: fixedText(p, id, level, category === 'technical'), delayS,
  });
  // LIFEPAK-like: HR alarms off while pacing (research/05 §2.6); with the leads off HR is not measured (brief §6.2).
  const hrSuppressed = (inp.pacing && p.hrDashesWhilePacing) || inp.leadsOff;

  // Limit alarms on displayed numerics (brief §6.4), only where the per-parameter switch is ON (brief §6.4.1).
```

Create `packages/engine-core/src/l3/device-layer.ts`:

```ts
// The Stage 4b device layer (brief §3.2 L3 "alarm engine, pacer and defibrillator"): one JSON-safe state object the
// engine keeps beside its pipeline state. The engine calls validate/apply for device commands and step() once per
// committed tick with the events that became due; the layer returns the events it adds (alarm, alarmStatus, …).
// It changes the patient's signals only through the host (modifiers, rhythm, L1 targets), never by editing L2.
import type { AgeBand } from '../types-device.ts';
import type { Command, EngineEvent, RhythmId } from '../types.ts';
import { buildConditions, createInputs, observeEvent, observeQrs, type AlarmInputs } from './alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, setProfile, stepAlarms, validateAlarmAction, type AlarmMgrState } from './alarms/manager.ts';
import { deviceProfile, skinBand } from './alarms/profile.ts';

/** Rhythms a monitor classifies as VF (research 03 §1.8). */
export const VF_RHYTHMS: ReadonlySet<RhythmId> = new Set(['vfCoarse', 'vfFine']);
/** Skin used when EngineOptions.device.skin is absent (the renderer's historical default, brief §3.8). */
export const DEFAULT_SKIN = 'philips-like';

export interface DeviceState {
  alarms: AlarmMgrState;
  inputs: AlarmInputs;
}

/** What the engine exposes to the device layer each tick (committed state only). */
export interface DeviceHost {
  simT: number;
  rhythmId: RhythmId;
  spo2Probe: 'on' | 'off' | 'motion';
  /** Mutate the committed modifiers (ECG artefacts, TCP) and invalidate the look-ahead. */
  setModifiers(patch: import('../types.ts').ModifiersPatch): void;
}

export function createDevice(skin: string | undefined, ageBand: 'adult' | 'paediatric' | 'neonatal' | undefined): DeviceState {
  return { alarms: createAlarmMgr(deviceProfile(skin ?? DEFAULT_SKIN, skinBand(ageBand))), inputs: createInputs(0) };
}

/** A rejection reason, undefined (accepted) or null (not a device-layer command). */
export function validateDeviceCommand(d: DeviceState, cmd: Command): string | undefined | null {
  if (cmd.type === 'attachSensor' && cmd.sensor === 'ecg') {
    return ['on', 'off', 'motion'].includes(cmd.state) ? undefined : 'ecg state must be on, off or motion';
  }
  if (cmd.type !== 'device') return null;
  const a = cmd.action;
  if (a.device === 'alarm') return validateAlarmAction(d.alarms, a);
  if (a.device === 'monitor') {
    if (a.action === 'skin') {
      try {
        deviceProfile(a.value, d.alarms.profile.ageBand);
        return undefined;
      } catch {
        return `unknown skin ${a.value}`;
      }
    }
    if (a.action === 'ageBand') return ['adult', 'paed', 'neo', 'paediatric', 'neonatal'].includes(a.value) ? undefined : 'ageBand must be adult, paed or neo';
    return `unknown monitor action ${String((a as { action: string }).action)}`;
  }
  return null;
}

/** Apply a validated device command at sim time t. Returns true when it was one. */
export function applyDeviceCommand(d: DeviceState, cmd: Command, host: DeviceHost, out: EngineEvent[]): boolean {
  const t = host.simT;
  if (cmd.type === 'attachSensor' && cmd.sensor === 'ecg') {
    // brief §6.2: ecg off → flat dashed trace + LEADS OFF INOP (no asystole); motion → electrode motion artefact [ENG 0.5]
    host.setModifiers({ artefact: { leadOff: cmd.state === 'off', motion: cmd.state === 'motion' ? 0.5 : 0 } });
    if (cmd.state !== 'off') d.inputs.ecgOnSince = t;
    return true;
  }
  if (cmd.type !== 'device') return false;
  const a = cmd.action;
  if (a.device === 'alarm') {
    applyAlarmAction(d.alarms, a, t, out);
    return true;
  }
  if (a.device === 'monitor') {
    const band: AgeBand = a.action === 'ageBand' ? skinBand(a.value as 'adult') : d.alarms.profile.ageBand;
    const skin = a.action === 'skin' ? a.value : d.alarms.profile.skin;
    setProfile(d.alarms, deviceProfile(skin, band), t, out);
    return true;
  }
  return false;
}

/** A committed QRS detection (R time, s). */
export function deviceOnQrs(d: DeviceState, tR: number): void {
  observeQrs(d.inputs, tR);
}

/**
 * One committed tick: observe the events that became due, then run the alarm manager. Returns the due events the
 * engine should still emit (raw L2 technical flags are replaced by the manager's own alarm events).
 */
export function stepDevice(d: DeviceState, host: DeviceHost, due: readonly EngineEvent[], out: EngineEvent[]): EngineEvent[] {
  const t = host.simT;
  const keep: EngineEvent[] = [];
  for (const e of due) {
    observeEvent(d.inputs, e);
    if (e.type === 'alarm' && e.level === undefined) continue;
    keep.push(e);
  }
  const inp = d.inputs;
  const vf = VF_RHYTHMS.has(host.rhythmId);
  if (vf && inp.vfSince === null) inp.vfSince = t;
  if (!vf) inp.vfSince = null;
  inp.spo2Probe = host.spo2Probe;
  stepAlarms(d.alarms, t, buildConditions(d.alarms, inp, t), out);
  return keep;
}
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/engine/alarms-engine.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  9 passed (9)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/l3/alarms/conditions.ts packages/engine-core/src/l3/device-layer.ts packages/engine-core/test/engine/alarms-engine.test.ts packages/engine-core/test/helpers/device.ts
git commit -m "feat(engine-core): device layer wired into the engine — live alarms by skin and age band, ECG sensor, snapshot" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Post-shock outcome table on the `outcome` stream

**Files:**
- Create: `packages/engine-core/src/l3/defib-pacer/outcome.ts`
- Test: `packages/engine-core/test/l3/defib-pacer/outcome.test.ts`

**Interfaces:**
- Consumes: `uniform`, `createRngState` (Stage 1 rng).
- Produces (`l3/defib-pacer/outcome.ts`): `ShockClass`, `ShockOutcome = 'unchanged'|'vf'|'asystole'|'pea'|'rosc'|'sinus'`, the table constants, `T_PEAK_WINDOW_S = 0.04`, `shockClass(id, pulseless)`, `interface ShockContext`, `outcomeProbabilities(c)`, `drawOutcome(c, rng)`.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/defib-pacer/outcome.test.ts`:

```ts
// Brief §6.5 post-shock table, BUILD-PLAN Stage 4 acceptance 6: over 10,000 seeded VF shocks the outcome
// frequencies are within ±2 % of the table.
import { describe, expect, it } from 'vitest';
import { drawOutcome, outcomeProbabilities, shockClass, type ShockContext, type ShockOutcome } from '../../../src/l3/defib-pacer/outcome.ts';
import { createRngState } from '../../../src/rng/sfc32.ts';

const VF: ShockContext = { cls: 'vf', synced: false, energyJ: 200, defaultJ: 200, vfDurationS: 60, onTPeak: false };

function freq(c: ShockContext, n = 10_000): Record<ShockOutcome, number> {
  const out: Record<ShockOutcome, number> = { unchanged: 0, vf: 0, asystole: 0, pea: 0, rosc: 0, sinus: 0 };
  for (let seed = 1; seed <= n; seed++) out[drawOutcome(c, createRngState(seed).outcome)]++;
  for (const k of Object.keys(out) as ShockOutcome[]) out[k] /= n;
  return out;
}

describe('post-shock outcome table', () => {
  it('classifies what is shocked', () => {
    expect(shockClass('vfCoarse', false)).toBe('vf');
    expect(shockClass('vtMono', true)).toBe('vf');
    expect(shockClass('vtMono', false)).toBe('organisedPulse');
    expect(shockClass('svtAvnrt', false)).toBe('organisedPulse');
    expect(shockClass('sinus', false)).toBe('perfusing');
    expect(shockClass('sinus', true)).toBe('arrest');
    expect(shockClass('asystole', false)).toBe('arrest');
  });

  it('VF at the default energy: persistent 0.30, asystole/PEA 0.60, ROSC 0.10 — 10,000 seeded shocks within ±2 %', () => {
    const f = freq(VF);
    expect(Math.abs(f.unchanged - 0.3)).toBeLessThan(0.02);
    expect(Math.abs(f.asystole + f.pea - 0.6)).toBeLessThan(0.02);
    expect(Math.abs(f.rosc - 0.1)).toBeLessThan(0.02);
    expect(f.vf + f.sinus).toBe(0);
  });

  it('VF duration and low energy follow the modifiers', () => {
    const p5 = outcomeProbabilities({ ...VF, vfDurationS: 300 });
    expect(p5.rosc).toBeCloseTo(0.05, 10);
    expect((p5.asystole ?? 0) + (p5.pea ?? 0)).toBeCloseTo(0.65, 10);
    expect(outcomeProbabilities({ ...VF, vfDurationS: 700 }).rosc).toBeCloseTo(0.02, 10);
    const lo = outcomeProbabilities({ ...VF, energyJ: 90 });
    expect(lo.unchanged).toBeCloseTo(0.65, 10);
    const f = freq({ ...VF, energyJ: 90 });
    expect(Math.abs(f.unchanged - 0.65)).toBeLessThan(0.02);
  });

  it('synchronised cardioversion: sinus 0.8; unsynchronised on the T peak of a perfusing rhythm: VF 0.3; asystole: nothing', () => {
    const cv = freq({ ...VF, cls: 'organisedPulse', synced: true });
    expect(Math.abs(cv.sinus - 0.8)).toBeLessThan(0.02);
    const rOnT = freq({ ...VF, cls: 'perfusing', onTPeak: true });
    expect(Math.abs(rOnT.vf - 0.3)).toBeLessThan(0.02);
    expect(outcomeProbabilities({ ...VF, cls: 'perfusing' })).toEqual({ unchanged: 1 });
    expect(outcomeProbabilities({ ...VF, cls: 'arrest' })).toEqual({ unchanged: 1 });
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/defib-pacer/outcome.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../../src/l3/defib-pacer/outcome.ts"`

- [x] **Step 3: Implement**

Create `packages/engine-core/src/l3/defib-pacer/outcome.ts`:

```ts
// Post-shock rhythm (brief §6.5 "Post-shock rhythm" table; research 03 §1.8–§1.9): a scenario rule or the
// instructor's pre-selection wins; otherwise the outcome is drawn from the `outcome` PRNG stream.
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { RhythmId } from '../../types.ts';

export type ShockClass = 'vf' | 'organisedPulse' | 'perfusing' | 'arrest';
export type ShockOutcome = 'unchanged' | 'vf' | 'asystole' | 'pea' | 'rosc' | 'sinus';

/** VF / pulseless VT shocked at ≥ the skin's first-shock energy (brief §6.5). */
export const VF_TABLE = { persistent: 0.3, asystolePea: 0.6, rosc: 0.1 } as const;
/** Share of the asystole/PEA outcome that is asystole (the rest organised PEA) [ENG]. */
export const ASYSTOLE_SHARE = 0.5;
/** Three-phase VF model: ROSC share × 0.5 at 4–10 min and × 0.2 beyond 10 min; the rest goes to asystole/PEA. */
export const VF_DURATION_FACTORS = [
  { fromS: 600, rosc: 0.2 },
  { fromS: 240, rosc: 0.5 },
] as const;
/** Energy below 50 % of the default halves the termination probability [ENG]. */
export const LOW_ENERGY_FRACTION = 0.5;
export const LOW_ENERGY_TERMINATION = 0.5;
/** Synchronised cardioversion of an organised tachyarrhythmia with a pulse: sinus 0.8 [ENG]. */
export const CARDIOVERSION_SINUS = 0.8;
/** Unsynchronised shock on the T peak ± 40 ms of a perfusing rhythm: VF 0.3 [ENG] (teaches sync). */
export const R_ON_T_VF = 0.3;
export const T_PEAK_WINDOW_S = 0.04;

const VF_CLASS: ReadonlySet<RhythmId> = new Set(['vfCoarse', 'vfFine', 'vtPoly', 'torsades']);
const ARREST: ReadonlySet<RhythmId> = new Set(['asystole', 'pWaveAsystole', 'agonal']);
const ORGANISED_TACHY: ReadonlySet<RhythmId> = new Set([
  'svtAvnrt', 'svtAvrt', 'aflutter', 'afib', 'preexcitedAf', 'atrialTach', 'junctionalTachy', 'mat', 'vtMono',
]);

/** What is being shocked (vtPoly/torsades count as pulseless VT: their k_rhythm is ≤ 0.2, brief §4.8) [ENG]. */
export function shockClass(id: RhythmId, pulseless: boolean): ShockClass {
  if (VF_CLASS.has(id) || (pulseless && (id === 'vtMono' || id === 'idioventricular'))) return 'vf';
  if (ARREST.has(id) || pulseless) return 'arrest';
  if (ORGANISED_TACHY.has(id)) return 'organisedPulse';
  return 'perfusing';
}

export interface ShockContext {
  cls: ShockClass;
  synced: boolean;
  energyJ: number;
  /** The skin's first-shock energy (defib.energyAdultJ). */
  defaultJ: number;
  /** How long VF has run (s), for the three-phase model. */
  vfDurationS: number;
  /** An unsynchronised shock landing within ±40 ms of the last beat's T peak. */
  onTPeak: boolean;
}

/** Outcome probabilities for a shock (they sum to 1). */
export function outcomeProbabilities(c: ShockContext): Partial<Record<ShockOutcome, number>> {
  if (c.cls === 'arrest') return { unchanged: 1 };
  if (c.cls === 'vf') {
    let rosc: number = VF_TABLE.rosc;
    let asyPea: number = VF_TABLE.asystolePea;
    const f = VF_DURATION_FACTORS.find((x) => c.vfDurationS >= x.fromS);
    if (f) {
      asyPea += rosc * (1 - f.rosc);
      rosc *= f.rosc;
    }
    if (c.energyJ < LOW_ENERGY_FRACTION * c.defaultJ) {
      rosc *= LOW_ENERGY_TERMINATION;
      asyPea *= LOW_ENERGY_TERMINATION;
    }
    return { unchanged: 1 - rosc - asyPea, asystole: asyPea * ASYSTOLE_SHARE, pea: asyPea * (1 - ASYSTOLE_SHARE), rosc };
  }
  if (!c.synced && c.onTPeak) return { vf: R_ON_T_VF, unchanged: 1 - R_ON_T_VF };
  if (c.cls === 'organisedPulse') return { sinus: CARDIOVERSION_SINUS, unchanged: 1 - CARDIOVERSION_SINUS };
  return { unchanged: 1 };
}

const ORDER: readonly ShockOutcome[] = ['unchanged', 'vf', 'asystole', 'pea', 'rosc', 'sinus'];

/** Draw one outcome from the `outcome` stream (one uniform per shock, so replay is exact). */
export function drawOutcome(c: ShockContext, rng: Sfc32State): ShockOutcome {
  const p = outcomeProbabilities(c);
  const u = uniform(rng);
  let acc = 0;
  for (const k of ORDER) {
    acc += p[k] ?? 0;
    if (u < acc) return k;
  }
  return 'unchanged';
}
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/defib-pacer/outcome.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  4 passed (4)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/defib-pacer/outcome.ts packages/engine-core/test/l3/defib-pacer/outcome.test.ts
git commit -m "feat(engine-core): post-shock outcome table (brief §6.5) with VF-duration and low-energy modifiers; 10,000-shock frequency test" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Defibrillator sync detector (low-latency R on lead II)

**Files:**
- Create: `packages/engine-core/src/l3/defib-pacer/sync.ts`
- Test: `packages/engine-core/test/l3/defib-pacer/sync.test.ts`

**Interfaces:**
- Consumes: `projectLead` (Stage 1 `l2/ecg/vcg.ts`, read-only import).
- Produces (`l3/defib-pacer/sync.ts`): `SYNC_RATE = 500`, `interface SyncState`, `createSyncState(n0)`, `syncStep(st, end, vcg): Array<{r, at}>`.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/defib-pacer/sync.test.ts`:

```ts
// The sync detector marks every R within 20 ms of the true R (4b acceptance) and reports it quickly.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../../src/engine.ts';
import { createSyncState, syncStep } from '../../../src/l3/defib-pacer/sync.ts';
import type { EngineEvent, RhythmId } from '../../../src/types.ts';

function run(rhythm: RhythmId, seconds: number) {
  const e = createEngine({ seed: 3, patient: { rhythm: { id: rhythm } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(seconds);
  const n = Math.round(seconds * 500);
  const X = new Float32Array(n);
  const Y = new Float32Array(n);
  const Z = new Float32Array(n);
  e.readSamples('vcgX', 0, X);
  e.readSamples('vcgY', 0, Y);
  e.readSamples('vcgZ', 0, Z);
  const st = createSyncState(0);
  const det = syncStep(st, n - 1, (i) => [X[i] as number, Y[i] as number, Z[i] as number]);
  const beats = ev.filter((x): x is Extract<EngineEvent, { type: 'beat' }> => x.type === 'beat' && x.t > 2 && x.t < seconds - 0.5);
  return { det, beats };
}

describe('sync detector', () => {
  for (const [rhythm, s] of [['sinus', 20], ['svtAvnrt', 15], ['aflutter', 15], ['afib', 20], ['vtMono', 15]] as const) {
    it(`${rhythm}: one marker per beat, within 20 ms of R, reported ≤ 40 ms after it`, () => {
      const { det, beats } = run(rhythm, s);
      expect(beats.length).toBeGreaterThan(10);
      for (const b of beats) {
        const m = det.find((d) => Math.abs(d.r / 500 - b.t) < 0.1);
        expect(m, `R at ${b.t.toFixed(3)}`).toBeDefined();
        expect(Math.abs(m!.r / 500 - b.t)).toBeLessThanOrEqual(0.02);
        expect((m!.at - m!.r) / 500).toBeLessThanOrEqual(0.04 + 1e-9);
      }
      const inWindow = det.filter((d) => d.r / 500 > 2 && d.r / 500 < s - 0.5);
      expect(inWindow.length).toBe(beats.length);
    });
  }

  it('asystole: no markers', () => {
    expect(run('asystole', 10).det.filter((d) => d.r > 1000)).toEqual([]);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/defib-pacer/sync.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../../src/l3/defib-pacer/sync.ts"`

- [x] **Step 3: Implement**

Create `packages/engine-core/src/l3/defib-pacer/sync.ts`:

```ts
// Defibrillator sync detector (brief §6.5 "Sync": a marker on every detected R; the shock on the next R within
// ≤ 60 ms). A low-latency R detector of its own, separate from the HR detector (which reports 60–120 ms late):
// lead II from the unfiltered VCG, a slow baseline, a peak envelope, and the R reported at the local maximum of
// |lead II − baseline| once the signal has fallen from it. Written from the description above [ENG]; plain data.
import { projectLead } from '../../l2/ecg/vcg.ts';

export const SYNC_RATE = 500;
const BASE_TAU_S = 0.5; // baseline EMA [ENG]
const ENV_TAU_S = 2; // peak-envelope decay [ENG]
const ARM_FRACTION = 0.5; // arm when |v| exceeds half the envelope [ENG]
const FALL_FRACTION = 0.7; // report when |v| has fallen below 70 % of the running maximum [ENG]
const MAX_WAIT_N = 20; // or 40 ms after the maximum at the latest
const REFRACTORY_N = 125; // 250 ms
const ENV_FLOOR_MV = 0.3; // no R below this envelope: the unfiltered VCG carries ±0.17 mV of noise and wander in asystole [ENG]
const kBase = 1 - Math.exp(-1 / (SYNC_RATE * BASE_TAU_S));
const kEnv = Math.exp(-1 / (SYNC_RATE * ENV_TAU_S));

export interface SyncState {
  /** Next absolute ECG sample index to read. */
  n: number;
  base: number;
  env: number;
  lastR: number;
  arm: { max: number; at: number } | null;
}

export function createSyncState(n0 = 0): SyncState {
  return { n: n0, base: 0, env: 0, lastR: -1e9, arm: null };
}

/**
 * Feed samples [st.n, end] read from the VCG X/Y/Z channels; returns the R sample indices detected, each paired
 * with the sample at which it was reported.
 */
export function syncStep(st: SyncState, end: number, vcg: (n: number) => [number, number, number] | null): Array<{ r: number; at: number }> {
  const out: Array<{ r: number; at: number }> = [];
  for (; st.n <= end; st.n++) {
    const s = vcg(st.n);
    if (!s) continue;
    const x = projectLead('ecgII', s[0], s[1], s[2]);
    st.base += (x - st.base) * kBase;
    const a = Math.abs(x - st.base);
    st.env = Math.max(a, st.env * kEnv);
    if (st.arm) {
      if (a > st.arm.max) st.arm = { max: a, at: st.n };
      else if (a < FALL_FRACTION * st.arm.max || st.n - st.arm.at > MAX_WAIT_N) {
        out.push({ r: st.arm.at, at: st.n });
        st.lastR = st.arm.at;
        st.arm = null;
      }
    } else if (st.n - st.lastR > REFRACTORY_N && st.env > ENV_FLOOR_MV && a > ARM_FRACTION * st.env) {
      st.arm = { max: a, at: st.n };
    }
  }
  return out;
}
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/defib-pacer/sync.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  6 passed (6)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/defib-pacer/sync.ts packages/engine-core/test/l3/defib-pacer/sync.test.ts
git commit -m "feat(engine-core): sync R detector — marks every R within 20 ms, reports within 40 ms" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Defibrillator and pacer state machines

**Files:**
- Create: `packages/engine-core/src/l3/defib-pacer/defib.ts`
- Create: `packages/engine-core/src/l3/defib-pacer/pacer.ts`
- Test: `packages/engine-core/test/l3/defib-pacer/defib-pacer-units.test.ts`

**Interfaces:**
- Consumes: `DeviceProfile` (Task 5), `DefibEvent`, `PacerEvent` (Task 3), `RHYTHMS` (Stage 5, read-only), `TcpSpec` (Stage 5 type).
- Produces: `defib.ts` — `DefibSpec`, `FALLBACK_DEFIB` (ZOLL-like), `CHARGE_S_PER_J = 7/200`, `ENERGY_RANGE_J`, `interface DefibState`, `createDefib(spec)`, `chargeTimeS(spec, J)`, `validateDefib(d, ev)`, `applyDefib(d, ev, t, spec, out): 'shock' | null`, `stepDefib(d, t, spec, out)`, `afterShock(d, t, atS, synced, outcome, out)`; `pacer.ts` — `PacerSpec`, `FALLBACK_PACER`, `NO_CAPTURE_MA`, `interface PacerState`, `createPacer(spec)`, `validatePacer(ev, spec)`, `applyPacer(p, ev)`, `tcpSpec(p, spec, thresholdMa, leadsOff): TcpSpec | null`.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/defib-pacer/defib-pacer-units.test.ts`:

```ts
// Charge time and the TCP modifier as pure functions (brief §6.5; research/05 §2.6).
import { describe, expect, it } from 'vitest';
import { chargeTimeS, CHARGE_S_PER_J, FALLBACK_DEFIB } from '../../../src/l3/defib-pacer/defib.ts';
import { createPacer, FALLBACK_PACER, NO_CAPTURE_MA, tcpSpec, validatePacer } from '../../../src/l3/defib-pacer/pacer.ts';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';

describe('defibrillator charge time', () => {
  const lp = deviceProfile('lifepak-like').defib!;
  it('LIFEPAK-like table: 200 J 7 s, 360 J 10 s, interpolated between, proportional below', () => {
    expect(chargeTimeS(lp, 200)).toBe(7);
    expect(chargeTimeS(lp, 360)).toBe(10);
    expect(chargeTimeS(lp, 280)).toBeCloseTo(8.5, 10);
    expect(chargeTimeS(lp, 100)).toBeCloseTo(3.5, 10);
  });
  it('no published table (ZOLL-like, fallback): 7 s per 200 J', () => {
    expect(chargeTimeS(FALLBACK_DEFIB, 120)).toBeCloseTo(120 * CHARGE_S_PER_J, 10);
  });
});

describe('pacer → Modifiers.tcp', () => {
  const p = createPacer(FALLBACK_PACER);
  it('off → null; demand stays demand; failureToSense and leads-off force fixed; failureToCapture sets an unreachable threshold', () => {
    expect(tcpSpec(p, FALLBACK_PACER, 70, false)).toBeNull();
    const on = { ...p, mode: 'demand' as const, mA: 80 };
    expect(tcpSpec(on, FALLBACK_PACER, 70, false)).toEqual({ mode: 'demand', ratePpm: 70, mA: 80, thresholdMa: 70 });
    expect(tcpSpec({ ...on, fault: 'failureToSense' }, FALLBACK_PACER, 70, false)?.mode).toBe('fixed');
    expect(tcpSpec(on, FALLBACK_PACER, 70, true)?.mode).toBe('fixed');
    expect(tcpSpec({ ...on, fault: 'failureToCapture' }, FALLBACK_PACER, 70, false)?.thresholdMa).toBe(NO_CAPTURE_MA);
  });
  it('PAUSE: LIFEPAK-like 25 % of the rate; ZOLL-like output 0 mA', () => {
    const lp = deviceProfile('lifepak-like').pacer!;
    const on = { ...createPacer(lp), mode: 'fixed' as const, ratePpm: 80, mA: 100, paused: true };
    expect(tcpSpec(on, lp, 70, false)).toMatchObject({ ratePpm: 20, mA: 100 });
    expect(tcpSpec(on, FALLBACK_PACER, 70, false)).toMatchObject({ ratePpm: 80, mA: 0 });
  });
  it('validates rate and output against the skin ranges', () => {
    expect(validatePacer({ kind: 'pacer', action: 'set', mode: 'fixed', ratePpm: 200 }, FALLBACK_PACER)).toMatch(/ratePpm/);
    expect(validatePacer({ kind: 'pacer', action: 'set', mode: 'fixed', mA: 150 }, FALLBACK_PACER)).toMatch(/mA/);
    expect(validatePacer({ kind: 'pacer', action: 'set', mode: 'demand', ratePpm: 60, mA: 70 }, FALLBACK_PACER)).toBeUndefined();
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/defib-pacer/defib-pacer-units.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../../src/l3/defib-pacer/defib.ts"`

- [x] **Step 3: Implement**

Create `packages/engine-core/src/l3/defib-pacer/defib.ts`:

```ts
// Defibrillator (brief §6.5 table; research/05 §2.6): energy select, charge with a charge time and tone, ready,
// auto-disarm, sync mode. Shock delivery (artefact, outcome) is in device-layer.ts because it touches the patient.
import type { DefibEvent } from '../../types-device.ts';
import type { EngineEvent, RhythmId } from '../../types.ts';
import { RHYTHMS } from '../../l2/ecg/rhythms.ts';
import type { DeviceProfile } from '../alarms/profile.ts';

export type DefibSpec = NonNullable<DeviceProfile['defib']>;
/** Skins without a defibrillator (saadat-like, philips-like: bedside monitors) still accept shocks as patient
 * commands (brief §6.5 saadat-like note); they use these ZOLL-like values (research/05 §2.6) [ENG choice]. */
export const FALLBACK_DEFIB: DefibSpec = { energyAdultJ: 120, energyPaedJ: 50, aedSequenceJ: null, chargeTimeS: null, readyTimeoutS: 60, toneSet: 'zoll-like' };
/** Charge time when a skin publishes none: LIFEPAK-like 200 J ≤ 7 s scaled linearly (research/05 §2.6) [ENG]. */
export const CHARGE_S_PER_J = 7 / 200;
export const ENERGY_RANGE_J = [1, 360] as const;

export interface DefibState {
  energyJ: number;
  state: 'idle' | 'charging' | 'ready';
  readyAt: number | null;
  disarmAt: number | null;
  sync: boolean;
  /** Shock pressed in sync mode, waiting for the next R. */
  syncArmed: boolean;
  shocks: number;
  seq: number;
  preselect: RhythmId | 'unchanged' | null;
  lastShock: { t: number; energyJ: number; sync: boolean; outcome: string } | null;
}

export function createDefib(spec: DefibSpec): DefibState {
  return { energyJ: spec.energyAdultJ, state: 'idle', readyAt: null, disarmAt: null, sync: false, syncArmed: false, shocks: 0, seq: 0, preselect: null, lastShock: null };
}

/** Charge time (s) for an energy: the skin's table interpolated (proportional below its first point, clamped above). */
export function chargeTimeS(spec: DefibSpec, energyJ: number): number {
  const pts = Object.entries(spec.chargeTimeS ?? {}).map(([j, s]) => [Number(j), s] as const).sort((a, b) => a[0] - b[0]);
  if (pts.length === 0) return energyJ * CHARGE_S_PER_J;
  const [j0, s0] = pts[0] as readonly [number, number];
  if (energyJ <= j0) return (s0 * energyJ) / j0;
  for (let i = 1; i < pts.length; i++) {
    const [ja, sa] = pts[i - 1] as readonly [number, number];
    const [jb, sb] = pts[i] as readonly [number, number];
    if (energyJ <= jb) return sa + ((sb - sa) * (energyJ - ja)) / (jb - ja);
  }
  return (pts[pts.length - 1] as readonly [number, number])[1];
}

export function validateDefib(d: DefibState, ev: DefibEvent): string | undefined {
  switch (ev.action) {
    case 'selectEnergy':
      return ev.energyJ !== undefined && Number.isFinite(ev.energyJ) && ev.energyJ >= ENERGY_RANGE_J[0] && ev.energyJ <= ENERGY_RANGE_J[1] ? undefined : 'energyJ must be 1–360 J';
    case 'charge':
      return ev.energyJ === undefined || (Number.isFinite(ev.energyJ) && ev.energyJ >= ENERGY_RANGE_J[0] && ev.energyJ <= ENERGY_RANGE_J[1]) ? undefined : 'energyJ must be 1–360 J';
    case 'shock':
      return d.state === 'ready' ? undefined : 'defibrillator is not charged';
    case 'preselect':
      return ev.outcome === 'unchanged' || (ev.outcome !== undefined && ev.outcome in RHYTHMS) ? undefined : "outcome must be a rhythm id or 'unchanged'";
    case 'disarm':
    case 'syncOn':
    case 'syncOff':
      return undefined;
    default:
      return `unknown defib action ${String((ev as { action: string }).action)}`;
  }
}

/** Apply a validated action. Returns 'shock' when an unsynchronised shock must be delivered now. */
export function applyDefib(d: DefibState, ev: DefibEvent, t: number, spec: DefibSpec, out: EngineEvent[]): 'shock' | null {
  switch (ev.action) {
    case 'selectEnergy':
      d.energyJ = ev.energyJ as number;
      if (d.state !== 'idle') disarm(d, t, out, false);
      return null;
    case 'charge': {
      if (ev.energyJ !== undefined) d.energyJ = ev.energyJ;
      const chargeS = chargeTimeS(spec, d.energyJ);
      d.state = 'charging';
      d.readyAt = t + chargeS;
      d.disarmAt = null;
      d.syncArmed = false;
      out.push({ type: 'marker', t, kind: 'chargeStart', data: { energyJ: d.energyJ } });
      out.push({ type: 'tone', t, id: `defib-charge-${++d.seq}`, kind: 'charge', chargeS });
      return null;
    }
    case 'shock':
      if (d.sync) {
        d.syncArmed = true; // delivered on the next detected R (device-layer.ts)
        return null;
      }
      return 'shock';
    case 'disarm':
      disarm(d, t, out, false);
      return null;
    case 'syncOn':
      d.sync = true;
      return null;
    case 'syncOff':
      d.sync = false;
      d.syncArmed = false;
      return null;
    case 'preselect':
      d.preselect = ev.outcome as RhythmId | 'unchanged';
      return null;
  }
}

function disarm(d: DefibState, t: number, out: EngineEvent[], auto: boolean): void {
  d.state = 'idle';
  d.readyAt = null;
  d.disarmAt = null;
  d.syncArmed = false;
  out.push({ type: 'marker', t, kind: 'disarm', data: { auto } });
}

/** Timed transitions: charging → ready (marker + ready tone), ready → auto-disarm after readyTimeoutS. */
export function stepDefib(d: DefibState, t: number, spec: DefibSpec, out: EngineEvent[]): boolean {
  if (d.state === 'charging' && d.readyAt !== null && t >= d.readyAt - 1e-9) {
    d.state = 'ready';
    d.disarmAt = d.readyAt + spec.readyTimeoutS;
    out.push({ type: 'marker', t, kind: 'chargeReady', data: { energyJ: d.energyJ } });
    out.push({ type: 'tone', t, id: `defib-ready-${++d.seq}`, kind: 'chargeReady' });
    return true;
  }
  if (d.state === 'ready' && d.disarmAt !== null && t >= d.disarmAt - 1e-9) {
    disarm(d, t, out, true);
    return true;
  }
  return false;
}

/** After a delivered shock (brief §6.5: LIFEPAK-like "Sync After Shock" off; applied to every skin [ENG]). */
export function afterShock(d: DefibState, t: number, atS: number, synced: boolean, outcome: string, out: EngineEvent[]): void {
  out.push({ type: 'marker', t, kind: 'shock', data: { energyJ: d.energyJ, sync: synced, atS } });
  out.push({ type: 'tone', t, id: `defib-shock-${++d.seq}`, kind: 'shock' });
  d.lastShock = { t, energyJ: d.energyJ, sync: synced, outcome };
  d.state = 'idle';
  d.readyAt = null;
  d.disarmAt = null;
  d.syncArmed = false;
  d.sync = false;
  d.shocks++;
  d.preselect = null;
}
```

Create `packages/engine-core/src/l3/defib-pacer/pacer.ts`:

```ts
// Transcutaneous pacer device (brief §6.5 "Pacer (TCP)"; research/05 §2.6): mode, rate, output, pause, and the
// instructor faults. It only decides the Modifiers.tcp the ECG draws (Stage 5 l2/ecg/tcp.ts: spikes, capture iff
// mA ≥ threshold, demand inhibition); captured beats carry k_rhythm 0.9, which Stage 2's haemodynamics ejects.
import type { PacerEvent } from '../../types-device.ts';
import type { TcpSpec } from '../../types.ts';
import type { DeviceProfile } from '../alarms/profile.ts';

export type PacerSpec = NonNullable<DeviceProfile['pacer']>;
/** Skins without a pacer take ZOLL-like values (research/05 §2.6) [ENG choice]. */
export const FALLBACK_PACER: PacerSpec = { rateDefault: 70, rateRange: [30, 180], mADefault: 0, mARange: [0, 140], mAStep: { up: 10, down: 5 }, modeDefault: 'demand', pausePct: null };
/** failureToCapture: a threshold no output reaches. */
export const NO_CAPTURE_MA = 1e6;

export interface PacerState {
  mode: 'off' | 'demand' | 'fixed';
  ratePpm: number;
  mA: number;
  paused: boolean;
  fault: 'none' | 'failureToSense' | 'failureToCapture';
}

export function createPacer(spec: PacerSpec): PacerState {
  return { mode: 'off', ratePpm: spec.rateDefault, mA: spec.mADefault, paused: false, fault: 'none' };
}

export function validatePacer(ev: PacerEvent, spec: PacerSpec): string | undefined {
  if (!['off', 'demand', 'fixed'].includes(ev.mode)) return 'pacer mode must be off, demand or fixed';
  const [r0, r1] = spec.rateRange;
  if (ev.ratePpm !== undefined && !(Number.isFinite(ev.ratePpm) && ev.ratePpm >= r0 && ev.ratePpm <= r1)) return `ratePpm must be ${r0}–${r1}`;
  const [m0, m1] = spec.mARange;
  if (ev.mA !== undefined && !(Number.isFinite(ev.mA) && ev.mA >= m0 && ev.mA <= m1)) return `mA must be ${m0}–${m1}`;
  if (ev.fault !== undefined && !['none', 'failureToSense', 'failureToCapture'].includes(ev.fault)) return 'fault must be none, failureToSense or failureToCapture';
  return undefined;
}

export function applyPacer(p: PacerState, ev: PacerEvent): void {
  p.mode = ev.mode;
  if (ev.ratePpm !== undefined) p.ratePpm = ev.ratePpm;
  if (ev.mA !== undefined) p.mA = ev.mA;
  if (ev.pause !== undefined) p.paused = ev.pause;
  if (ev.fault !== undefined) p.fault = ev.fault;
}

/**
 * The TCP modifier for this pacer state. Demand pacing turns asynchronous with failureToSense or when the ECG leads
 * are off (LIFEPAK-like "leads-off → automatic non-demand", research/05 §2.6). PAUSE paces at pausePct % of the rate
 * (LIFEPAK-like 25 %) or, where the skin has no pause rate, drops the output to 0 mA (ZOLL-like "0 when paused").
 */
export function tcpSpec(p: PacerState, spec: PacerSpec, thresholdMa: number, leadsOff: boolean): TcpSpec | null {
  if (p.mode === 'off') return null;
  const mode = p.fault === 'failureToSense' || leadsOff ? 'fixed' : p.mode;
  let ratePpm = p.ratePpm;
  let mA = p.mA;
  if (p.paused) {
    if (spec.pausePct !== null) ratePpm = (p.ratePpm * spec.pausePct) / 100;
    else mA = 0;
  }
  return { mode, ratePpm, mA, thresholdMa: p.fault === 'failureToCapture' ? NO_CAPTURE_MA : thresholdMa };
}
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/defib-pacer/defib-pacer-units.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  5 passed (5)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/defib-pacer/defib.ts packages/engine-core/src/l3/defib-pacer/pacer.ts packages/engine-core/test/l3/defib-pacer/defib-pacer-units.test.ts
git commit -m "feat(engine-core): defibrillator (energy, charge time, ready, auto-disarm, sync) and TCP pacer (modes, pause, faults) state" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Shock, sync shock, post-shock rhythm and pacing in the engine

**Files:**
- Modify: `packages/engine-core/src/engine.ts`
- Replace: `packages/engine-core/src/l3/device-layer.ts`
- Modify: `packages/engine-core/src/types-device.ts`
- Test: `packages/engine-core/test/engine/defib-engine.test.ts`
- Test: `packages/engine-core/test/engine/device-determinism.test.ts`
- Modify test: `packages/engine-core/test/engine/engine-commands.test.ts`
- Test: `packages/engine-core/test/engine/pacer-engine.test.ts`
- Modify test: `packages/engine-core/test/types-device.test.ts`

**Interfaces:**
- Consumes: Tasks 9–12.
- Produces: `l3/device-layer.ts` replaced — `DeviceState` gains `defib, pacer, sync, pending, lastBeat, tcpKey, statusKey, lastStatusT`; `DeviceHost` gains `pulseless, leadsOff, committedN, vcgAt(n), outcomeRng, l1(v), setRhythm(id, opts), setHr(v, ramp?), setL1(v, value, ramp?)`; constants `SYNC_DELAY_S = 0.02`, `T_PEAK_QT_FRACTION`, `ISO_S`, `ROSC_*`, `CARDIOVERSION_*`. `setTarget paceThresholdMa` and `applyEvent defib|pacer` are device commands. The `deviceStatus` event gains `defib.lastShock` and `hrDashes`; the `shock` marker carries `data.atS`.

- [x] **Step 1: Write the failing tests**

Create `packages/engine-core/test/engine/defib-engine.test.ts`:

```ts
// Stage 4b acceptance: defibrillator and cardioversion in the running engine (brief §6.5).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { beats, cmd, devRig, markers } from '../helpers/device.ts';

type Tone = Extract<EngineEvent, { type: 'tone' }>;
type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } });
const lastStatus = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;

describe('defibrillator', () => {
  it('lifepak-like: 200 J charges in 7 s with the charge tone, then ready tone; auto-disarm after 60 s', () => {
    const { e, ev } = devRig('lifepak-like');
    e.advanceTo(2);
    e.dispatch(defib('charge', { energyJ: 200 }));
    e.advanceTo(12);
    const charge = ev.find((x): x is Tone => x.type === 'tone' && x.kind === 'charge')!;
    expect(charge.chargeS).toBeCloseTo(7, 6);
    expect(charge.t).toBeCloseTo(2.02, 6);
    const ready = markers(ev, 'chargeReady')[0]!;
    expect(ready.t - charge.t).toBeCloseTo(7, 1);
    expect(ev.some((x) => x.type === 'tone' && x.kind === 'chargeReady')).toBe(true);
    expect(lastStatus(ev).defib?.state).toBe('ready');
    e.advanceTo(75);
    const dis = markers(ev, 'disarm')[0]!;
    expect(dis.t - ready.t).toBeCloseTo(60, 1);
    expect(dis.data?.auto).toBe(true);
    expect(e.dispatch(defib('shock')).reason).toMatch(/not charged/);
  });

  it('VF → charge → shock: rail artefact on every displayed lead, baseline back within 0.1 mV in ≤ 5 s', () => {
    const { e, ev } = devRig('zoll-like');
    e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V1', lane: 2 } }));
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    e.advanceTo(10);
    e.dispatch(defib('preselect', { outcome: 'asystole' }));
    e.dispatch(defib('charge'));
    e.advanceTo(16);
    e.dispatch(defib('shock'));
    e.advanceTo(24);
    const sh = markers(ev, 'shock')[0]!;
    const atS = sh.data!.atS as number;
    expect(sh.data?.energyJ).toBe(120); // zoll-like default (research/05 §2.6)
    expect(ev.some((x) => x.type === 'tone' && x.kind === 'shock')).toBe(true);
    for (const lead of ['ecgII', 'V5', 'V1'] as const) {
      const rail = new Float32Array(25);
      e.readSamples(lead, Math.round(atS * 500), rail);
      // the amplifier sits on its 5 mV rail (front-end.ts RAIL_MV); the displayed lane is that step through the monitor filter
      expect(Math.max(...rail.map(Math.abs))).toBeGreaterThan(4);
      const tail = new Float32Array(250);
      e.readSamples(lead, Math.round((atS + 5) * 500), tail);
      expect(Math.abs(tail.reduce((a, b) => a + b, 0) / tail.length)).toBeLessThan(0.1);
    }
    expect(lastStatus(ev).defib?.lastShock?.outcome).toBe('asystole');
  });

  it('post-shock rhythm follows the drawn outcome (8 seeds)', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 8; seed++) {
      const { e, ev } = devRig('zoll-like', { seed });
      e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
      e.dispatch(defib('charge'));
      e.advanceTo(6);
      e.dispatch(defib('shock'));
      e.advanceTo(20);
      const atS = markers(ev, 'shock')[0]!.data!.atS as number;
      const outcome = lastStatus(ev).defib!.lastShock!.outcome;
      seen.add(outcome);
      expect(['unchanged', 'asystole', 'pea', 'rosc']).toContain(outcome);
      const after = beats(ev).filter((b) => b.t > atS);
      if (outcome === 'unchanged' || outcome === 'asystole') expect(after).toEqual([]);
      else {
        expect(after[0]!.t - atS).toBeGreaterThan(1);
        expect(after[0]!.t - atS).toBeLessThan(5.5);
        expect(after.every((b) => b.mech.perfused === (outcome === 'rosc'))).toBe(true);
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('sync: markers on every R within 20 ms; the synchronised shock lands 0–60 ms after the next R', () => {
    const { e, ev } = devRig('zoll-like');
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt' }));
    e.dispatch(defib('syncOn'));
    e.dispatch(defib('charge', { energyJ: 100 }));
    e.advanceTo(8);
    const rs = beats(ev).filter((b) => b.t > 1 && b.t < 7.5);
    const sm = markers(ev, 'syncR');
    for (const b of rs) expect(Math.min(...sm.map((m) => Math.abs(m.t - b.t)))).toBeLessThanOrEqual(0.02);
    e.dispatch(defib('shock'));
    e.advanceTo(12);
    const sh = markers(ev, 'shock')[0]!;
    const atS = sh.data!.atS as number;
    const r = beats(ev).filter((b) => b.t <= atS).pop()!;
    expect(sh.data?.sync).toBe(true);
    expect(atS - r.t).toBeGreaterThanOrEqual(0);
    expect(atS - r.t).toBeLessThanOrEqual(0.06);
    expect(lastStatus(ev).defib?.sync).toBe(false); // "Sync After Shock" off
  });
});
```

Create `packages/engine-core/test/engine/device-determinism.test.ts`:

```ts
// The device layer keeps replay exact (brief §3.3 "Determinism"): same seed + same commands → the same alarm,
// marker, tone and deviceStatus events; a snapshot taken mid-charge resumes identically.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

const DEVICE_TYPES = new Set(['alarm', 'alarmStatus', 'marker', 'deviceStatus', 'beat']);
function script(seed: number, snapAt?: number): EngineEvent[] {
  const { e, ev } = devRig('zoll-like', { seed, patient: { sensors: { abp: 'connected' } } });
  e.dispatch(cmd({ id: 'a', type: 'setRhythm', rhythm: 'vfCoarse' }));
  e.dispatch(cmd({ id: 'b', type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 150 } }));
  e.advanceTo(3);
  if (snapAt !== undefined) {
    const snap = e.snapshot();
    const { e: e2, ev: ev2 } = devRig('zoll-like', { seed, patient: { sensors: { abp: 'connected' } } });
    e2.restore(snap);
    e2.advanceTo(7);
    e2.dispatch(cmd({ id: 'c', type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }));
    e2.advanceTo(25);
    return ev2.filter((x) => DEVICE_TYPES.has(x.type));
  }
  e.advanceTo(7);
  e.dispatch(cmd({ id: 'c', type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }));
  e.advanceTo(25);
  return ev.filter((x) => DEVICE_TYPES.has(x.type) && (x as { t: number }).t > 3);
}

describe('device layer determinism', () => {
  it('same seed and commands → identical device events', () => {
    expect(JSON.stringify(script(21))).toBe(JSON.stringify(script(21)));
  });
  it('a snapshot taken while charging resumes to the same events', () => {
    const whole = script(22);
    const resumed = script(22, 3);
    expect(JSON.stringify(resumed.filter((x) => (x as { t: number }).t > 3.02))).toBe(JSON.stringify(whole.filter((x) => (x as { t: number }).t > 3.02)));
  });
});
```

In `packages/engine-core/test/engine/engine-commands.test.ts`, replace this block (it occurs exactly once):

```ts
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 90 })).accepted).toBe(false); // Stage 3
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'notARhythm' })).reason).toMatch(/unknown rhythm/);
    expect(e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } })).accepted).toBe(false); // Stage 4
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: 'surgical' } })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { bogus: 1 } })).reason).toMatch(/unknown modifiers/);
```

with:

```ts
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 90 })).accepted).toBe(false); // Stage 3
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'notARhythm' })).reason).toMatch(/unknown rhythm/);
    expect(e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } })).reason).toMatch(/not charged/); // Stage 4b
    expect(e.dispatch(cmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: 'surgical' } })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'setModifiers', modifiers: { bogus: 1 } })).reason).toMatch(/unknown modifiers/);
```

Create `packages/engine-core/test/engine/pacer-engine.test.ts`:

```ts
// Stage 4b acceptance: transcutaneous pacing in the running engine (brief §6.5; BUILD-PLAN Stage 4 acceptance 5).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { beats, cmd, devRig, markers } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const pacer = (mode: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode, ...extra } });

/** Systolic peaks in [t0, t1): local maxima over ±0.3 s in the upper half of the range (skips the dicrotic wave). */
function abpPulses(e: ReturnType<typeof devRig>['e'], t0: number, t1: number): number {
  const x = new Float32Array(Math.round((t1 - t0) * 125));
  e.readSamples('abp', Math.round(t0 * 125), x);
  const lo = Math.min(...x);
  const hi = Math.max(...x);
  if (hi - lo < 10) return 0;
  const w = Math.round(0.3 * 125);
  let n = 0;
  for (let i = w; i < x.length - w; i++) {
    const v = x[i] as number;
    if (v < lo + 0.5 * (hi - lo)) continue;
    let top = true;
    for (let j = i - w; j <= i + w && top; j++) if ((x[j] as number) > v) top = false;
    if (top) {
      n++;
      i += w;
    }
  }
  return n;
}

describe('transcutaneous pacer', () => {
  it('below threshold: spikes, no capture, intrinsic rhythm unchanged; at/above: paced wide QRS after every spike and ABP pulses at the pacing rate', () => {
    const { e, ev } = devRig('zoll-like', { patient: { rhythm: { id: 'avb3Wide' }, sensors: { abp: 'connected' } } });
    e.dispatch(cmd({ type: 'setTarget', variable: 'paceThresholdMa', value: 70 })); // brief §6.5 default 70 mA [ENG]
    e.dispatch(pacer('fixed', { ratePpm: 70, mA: 40 }));
    e.advanceTo(30);
    const below = markers(ev, 'paceSpike').filter((m) => m.t > 5 && m.t < 30);
    expect(below.length).toBeGreaterThan(25);
    expect(below.every((m) => m.data?.captured === false && m.data?.tcp === true)).toBe(true);
    expect(beats(ev).filter((b) => b.t > 5 && b.origin === 'paced')).toEqual([]);
    const intrinsic = beats(ev).filter((b) => b.t > 5 && b.t < 30);
    expect(Math.abs((intrinsic.length / 25) * 60 - 32)).toBeLessThan(6); // the avb3Wide escape (32 bpm) goes on

    e.dispatch(pacer('fixed', { ratePpm: 70, mA: 90 }));
    e.advanceTo(95);
    const spikes = markers(ev, 'paceSpike').filter((m) => m.t > 35 && m.t < 95);
    const paced = beats(ev).filter((b) => b.origin === 'paced' && b.t > 35);
    expect(spikes.every((m) => m.data?.captured === true)).toBe(true);
    for (const s of spikes) expect(paced.some((b) => b.t > s.t && b.t - s.t < 0.15)).toBe(true); // capture after 100 % of spikes
    expect(paced.every((b) => b.template === 'pacedV' && b.qrsMs >= 140 && b.mech.perfused)).toBe(true);
    expect(Math.abs(abpPulses(e, 85, 95) - (70 * 9.4) / 60)).toBeLessThanOrEqual(1); // Stage 2 ejects every captured beat
  });

  it('demand mode is inhibited by intrinsic beats; failure to sense paces asynchronously through them', () => {
    const { e, ev } = devRig('zoll-like', { patient: { baseline: { hr: 80 } } });
    e.dispatch(pacer('demand', { ratePpm: 60, mA: 100 }));
    e.advanceTo(30);
    expect(markers(ev, 'paceSpike').filter((m) => m.t > 5)).toEqual([]);
    e.dispatch(pacer('demand', { ratePpm: 60, mA: 100, fault: 'failureToSense' }));
    e.advanceTo(60);
    const asyn = markers(ev, 'paceSpike').filter((m) => m.t > 35 && m.t < 60);
    expect(Math.abs(asyn.length - 25)).toBeLessThanOrEqual(2);
    expect(beats(ev).filter((b) => b.t > 35 && b.origin === 'sinus').length).toBeGreaterThan(10);
  });

  it('failure to capture: spikes at any output, no paced beat; LIFEPAK-like HR dashes and PAUSE at 25 % of the rate', () => {
    const { e, ev } = devRig('lifepak-like', { patient: { rhythm: { id: 'avb3Wide' } } });
    e.dispatch(pacer('fixed', { ratePpm: 80, mA: 140, fault: 'failureToCapture' }));
    e.advanceTo(20);
    expect(markers(ev, 'paceSpike').length).toBeGreaterThan(15);
    expect(beats(ev).filter((b) => b.origin === 'paced')).toEqual([]);
    const st = ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;
    expect(st.hrDashes).toBe(true);
    e.dispatch(pacer('fixed', { ratePpm: 80, mA: 140, fault: 'none', pause: true }));
    e.advanceTo(80);
    const paused = markers(ev, 'paceSpike').filter((m) => m.t > 21 && m.t < 80);
    expect(Math.abs(paused.length - 20 * (59 / 60))).toBeLessThanOrEqual(2); // 80 × 25 % = 20 ppm
  });
});
```

In `packages/engine-core/test/types-device.test.ts`, replace this block (it occurs exactly once):

```ts
      { type: 'alarm', t: 1, id: 'HR_HIGH', priority: 'medium', category: 'physiological', state: 'raised', text: '**HR 130>120', level: 2 },
      { type: 'tone', t: 1, id: 'defib-charge-1', kind: 'charge', chargeS: 7 },
      { type: 'deviceStatus', t: 1, defib: null, pacer: null } satisfies DeviceEvent,
    ];
    expect(evs.map((e) => e.type)).toEqual(['alarm', 'tone', 'deviceStatus']);
```

with:

```ts
      { type: 'alarm', t: 1, id: 'HR_HIGH', priority: 'medium', category: 'physiological', state: 'raised', text: '**HR 130>120', level: 2 },
      { type: 'tone', t: 1, id: 'defib-charge-1', kind: 'charge', chargeS: 7 },
      { type: 'deviceStatus', t: 1, defib: null, pacer: null, hrDashes: false } satisfies DeviceEvent,
    ];
    expect(evs.map((e) => e.type)).toEqual(['alarm', 'tone', 'deviceStatus']);
```

- [x] **Step 2: Run them to see them fail**

Run: `cd packages/engine-core && npx vitest run test/engine/defib-engine.test.ts test/engine/pacer-engine.test.ts test/engine/device-determinism.test.ts; cd -`
Expected: FAIL — `applyEvent defib` is rejected (`command type applyEvent is not implemented`), so no `chargeStart`/`shock` markers; the pacer tests see no `paceSpike`

- [x] **Step 3: Implement**

In `packages/engine-core/src/engine.ts` (edit 1 of 2), replace this block (it occurs exactly once):

```ts
} from './types.ts';
import { version } from './version.ts';
import { createL1State, type L1State } from './l1/state.ts'; // Stage 2
import {
  advanceHemo,
```

with:

```ts
} from './types.ts';
import { version } from './version.ts';
import { createL1State, l1Value, setL1Target, type L1State, type L1Var } from './l1/state.ts'; // Stage 2 (Stage 4b: l1Value, setL1Target)
import {
  advanceHemo,
```

In `packages/engine-core/src/engine.ts` (edit 2 of 2), replace this block (it occurs exactly once):

```ts
  private deviceHost(simT: number): DeviceHost {
    const ps = this.st;
    return {
      simT,
      rhythmId: ps.rhythm.id,
      spo2Probe: ps.hemo.pleth.state,
      setModifiers: (patch) => {
        ps.mods = mergeModifiers(ps.mods, patch);
        this.dirtyFromN = Math.min(this.dirtyFromN, ps.n);
      },
    };
```

with:

```ts
  private deviceHost(simT: number): DeviceHost {
    const ps = this.st;
    const dirty = () => {
      this.dirtyFromN = Math.min(this.dirtyFromN, ps.n);
    };
    const bx = this.bufs.get('vcgX') as RingBuffer;
    const by = this.bufs.get('vcgY') as RingBuffer;
    const bz = this.bufs.get('vcgZ') as RingBuffer;
    return {
      simT,
      rhythmId: ps.rhythm.id,
      pulseless: ps.rhythm.opts.pulseless === true,
      spo2Probe: ps.hemo.pleth.state,
      leadsOff: ps.mods.artefact.leadOff,
      committedN: ps.n,
      vcgAt: (n) => {
        const x = bx.at(n);
        return Number.isNaN(x) ? null : [x, by.at(n), bz.at(n)];
      },
      outcomeRng: ps.rng.outcome,
      l1: (v) => (v === 'hr' ? rampValue(ps.hr, simT) : l1Value(ps.l1, v as L1Var, simT)),
      setModifiers: (patch) => {
        ps.mods = mergeModifiers(ps.mods, patch);
        dirty();
      },
      setRhythm: (id, opts) => {
        ps.hr = constantRamp(startRate(id, opts));
        applyRhythm(ps.rhythm, id, opts, simT, true, rhythmCtx(ps));
        dirty();
      },
      setHr: (value, ramp) => {
        ps.hr = retarget(ps.hr, simT, value, ramp);
        dirty();
      },
      setL1: (v, value, ramp) => {
        if (v === 'hr') ps.hr = retarget(ps.hr, simT, value, ramp);
        else setL1Target(ps.l1, v as L1Var, simT, value, ramp);
        dirty();
      },
    };
```

Replace the whole of `packages/engine-core/src/l3/device-layer.ts` with:

```ts
// The Stage 4b device layer (brief §3.2 L3 "alarm engine, pacer and defibrillator"): one JSON-safe state object the
// engine keeps beside its pipeline state. The engine calls validate/apply for device commands and step() once per
// committed tick with the events that became due; the layer returns the events it adds (alarm, alarmStatus,
// marker, tone, deviceStatus). It changes the patient's signals only through the host (modifiers, rhythm, L1
// targets), never by editing L2.
import { uniform, type Sfc32State } from '../rng/sfc32.ts';
import type { AgeBand, DeviceClinicalEvent } from '../types-device.ts';
import type { Command, EngineEvent, ModifiersPatch, Ramp, RhythmId, RhythmOpts, StateVar } from '../types.ts';
import { buildConditions, createInputs, observeEvent, observeQrs, type AlarmInputs } from './alarms/conditions.ts';
import { applyAlarmAction, createAlarmMgr, setProfile, stepAlarms, validateAlarmAction, type AlarmMgrState } from './alarms/manager.ts';
import { deviceProfile, skinBand } from './alarms/profile.ts';
import { afterShock, applyDefib, createDefib, FALLBACK_DEFIB, stepDefib, validateDefib, type DefibSpec, type DefibState } from './defib-pacer/defib.ts';
import { drawOutcome, shockClass, T_PEAK_WINDOW_S, type ShockOutcome } from './defib-pacer/outcome.ts';
import { applyPacer, createPacer, FALLBACK_PACER, tcpSpec, validatePacer, type PacerSpec, type PacerState } from './defib-pacer/pacer.ts';
import { createSyncState, SYNC_RATE, syncStep, type SyncState } from './defib-pacer/sync.ts';

/** Rhythms a monitor classifies as VF (research 03 §1.8). */
export const VF_RHYTHMS: ReadonlySet<RhythmId> = new Set(['vfCoarse', 'vfFine']);
/** Skin used when EngineOptions.device.skin is absent (the renderer's historical default, brief §3.8). */
export const DEFAULT_SKIN = 'philips-like';
/** Sync shock: delivered this long after the detected R (brief §6.5: on the next R within ≤ 60 ms) [ENG]. */
export const SYNC_DELAY_S = 0.02;
/** T peak ≈ R + 0.65 × QT (the kernel T peak sits ~⅔ into QT at normal rates) [ENG]. */
export const T_PEAK_QT_FRACTION = 0.65;
/** After a terminating shock: 1–5 s isoelectric, then 30–60 bpm accelerating over 10–60 s to ROSC_HR; pressure
 * targets ramp from 50 % to 100 % over 30–120 s (brief §6.5 "After successful termination"; the k_SV 0.2 → 1 ramp is
 * expressed through the MANUAL-mode sbp/dbp targets, which the Stage 2 M2 tracker follows) [ENG where not cited]. */
export const ISO_S = [1, 5] as const;
export const ROSC_START_BPM = [30, 60] as const;
export const ROSC_RAMP_S = [10, 60] as const;
export const ROSC_HR = 80;
export const ROSC_BP_RAMP_S = [30, 120] as const;
export const ROSC_BP_START = 0.5;
/** Cardioversion to sinus: a 1–2 s pause, then sinus at 75 bpm [ENG]. */
export const CARDIOVERSION_PAUSE_S = [1, 2] as const;
export const CARDIOVERSION_HR = 75;
const STATUS_EVERY_S = 1;

interface PendingRhythm {
  atS: number;
  id: RhythmId;
  opts: RhythmOpts;
  hrRamp?: { to: number; durationS: number };
  bpRampS?: number;
}

export interface DeviceState {
  alarms: AlarmMgrState;
  inputs: AlarmInputs;
  defib: DefibState;
  pacer: PacerState;
  sync: SyncState;
  pending: PendingRhythm | null;
  lastBeat: { t: number; qtMs: number } | null;
  tcpKey: string;
  statusKey: string;
  lastStatusT: number;
}

/** What the engine exposes to the device layer each tick (committed state only). */
export interface DeviceHost {
  simT: number;
  rhythmId: RhythmId;
  pulseless: boolean;
  spo2Probe: 'on' | 'off' | 'motion';
  leadsOff: boolean;
  /** First ECG sample index not yet committed. */
  committedN: number;
  /** One committed VCG sample (null when not held). */
  vcgAt(n: number): [number, number, number] | null;
  outcomeRng: Sfc32State;
  l1(v: StateVar): number;
  /** Mutate the committed modifiers (ECG artefacts, TCP) and invalidate the look-ahead. */
  setModifiers(patch: ModifiersPatch): void;
  setRhythm(id: RhythmId, opts: RhythmOpts): void;
  setHr(value: number, ramp?: Ramp): void;
  setL1(v: StateVar, value: number, ramp?: Ramp): void;
}

const defibSpec = (d: DeviceState): DefibSpec => d.alarms.profile.defib ?? FALLBACK_DEFIB;
const pacerSpec = (d: DeviceState): PacerSpec => d.alarms.profile.pacer ?? FALLBACK_PACER;

export function createDevice(skin: string | undefined, ageBand: 'adult' | 'paediatric' | 'neonatal' | undefined): DeviceState {
  const p = deviceProfile(skin ?? DEFAULT_SKIN, skinBand(ageBand));
  return {
    alarms: createAlarmMgr(p),
    inputs: createInputs(0),
    defib: createDefib(p.defib ?? FALLBACK_DEFIB),
    pacer: createPacer(p.pacer ?? FALLBACK_PACER),
    sync: createSyncState(0),
    pending: null,
    lastBeat: null,
    tcpKey: 'null',
    statusKey: '',
    lastStatusT: -1,
  };
}

/** A rejection reason, undefined (accepted) or null (not a device-layer command). */
export function validateDeviceCommand(d: DeviceState, cmd: Command): string | undefined | null {
  if (cmd.type === 'attachSensor' && cmd.sensor === 'ecg') {
    return ['on', 'off', 'motion'].includes(cmd.state) ? undefined : 'ecg state must be on, off or motion';
  }
  if (cmd.type === 'setTarget' && cmd.variable === 'paceThresholdMa') {
    // brief §6.5 capture threshold; PatientState.paceThresholdMa 10–200 mA (l1/state.ts schema)
    if (!(Number.isFinite(cmd.value) && cmd.value >= 10 && cmd.value <= 200)) return 'paceThresholdMa must be 10–200';
    return cmd.ramp && !(cmd.ramp.durationS >= 0 && cmd.ramp.durationS <= 900) ? 'ramp.durationS must be 0–900 s' : undefined;
  }
  if (cmd.type === 'applyEvent') {
    const ev = cmd.event as DeviceClinicalEvent | { kind: string };
    if (ev.kind === 'defib') return validateDefib(d.defib, ev as Extract<DeviceClinicalEvent, { kind: 'defib' }>);
    if (ev.kind === 'pacer') return validatePacer(ev as Extract<DeviceClinicalEvent, { kind: 'pacer' }>, pacerSpec(d));
    return null;
  }
  if (cmd.type !== 'device') return null;
  const a = cmd.action;
  if (a.device === 'alarm') return validateAlarmAction(d.alarms, a);
  if (a.device === 'monitor') {
    if (a.action === 'skin') {
      try {
        deviceProfile(a.value, d.alarms.profile.ageBand);
        return undefined;
      } catch {
        return `unknown skin ${a.value}`;
      }
    }
    if (a.action === 'ageBand') return ['adult', 'paed', 'neo', 'paediatric', 'neonatal'].includes(a.value) ? undefined : 'ageBand must be adult, paed or neo';
    return `unknown monitor action ${String((a as { action: string }).action)}`;
  }
  return null;
}

/** Apply a validated device command at sim time t. Returns true when it was one. */
export function applyDeviceCommand(d: DeviceState, cmd: Command, host: DeviceHost, out: EngineEvent[]): boolean {
  const t = host.simT;
  if (cmd.type === 'attachSensor' && cmd.sensor === 'ecg') {
    // brief §6.2: ecg off → flat dashed trace + LEADS OFF INOP (no asystole); motion → electrode motion artefact [ENG 0.5]
    host.setModifiers({ artefact: { leadOff: cmd.state === 'off', motion: cmd.state === 'motion' ? 0.5 : 0 } });
    if (cmd.state !== 'off') d.inputs.ecgOnSince = t;
    return true;
  }
  if (cmd.type === 'setTarget' && cmd.variable === 'paceThresholdMa') {
    host.setL1('paceThresholdMa', cmd.value, cmd.ramp);
    return true;
  }
  if (cmd.type === 'applyEvent') {
    const ev = cmd.event as DeviceClinicalEvent | { kind: string };
    if (ev.kind === 'defib') {
      if (applyDefib(d.defib, ev as Extract<DeviceClinicalEvent, { kind: 'defib' }>, t, defibSpec(d), out) === 'shock') {
        deliverShock(d, host, host.committedN / SYNC_RATE, false, out);
      }
      return true;
    }
    if (ev.kind === 'pacer') {
      applyPacer(d.pacer, ev as Extract<DeviceClinicalEvent, { kind: 'pacer' }>);
      return true;
    }
    return false;
  }
  if (cmd.type !== 'device') return false;
  const a = cmd.action;
  if (a.device === 'alarm') {
    applyAlarmAction(d.alarms, a, t, out);
    return true;
  }
  if (a.device === 'monitor') {
    const band: AgeBand = a.action === 'ageBand' ? skinBand(a.value as 'adult') : d.alarms.profile.ageBand;
    const skin = a.action === 'skin' ? a.value : d.alarms.profile.skin;
    setProfile(d.alarms, deviceProfile(skin, band), t, out);
    return true;
  }
  return false;
}

const between = (r: Sfc32State, range: readonly [number, number]): number => range[0] + (range[1] - range[0]) * uniform(r);

/** Deliver a shock at atS: ECG artefact on every lead, outcome (pre-selection or the table), markers and tone. */
function deliverShock(d: DeviceState, host: DeviceHost, atS: number, synced: boolean, out: EngineEvent[]): void {
  const t = host.simT;
  host.setModifiers({ artefact: { shock: { atS, energyJ: d.defib.energyJ } } });
  const lb = d.lastBeat;
  const onTPeak = lb !== null && Math.abs(atS - (lb.t + (T_PEAK_QT_FRACTION * lb.qtMs) / 1000)) <= T_PEAK_WINDOW_S;
  const cls = shockClass(host.rhythmId, host.pulseless);
  const rng = host.outcomeRng;
  let outcome: ShockOutcome | RhythmId;
  if (d.defib.preselect !== null) outcome = d.defib.preselect;
  else {
    const vfDurationS = d.inputs.vfSince === null ? 0 : t - d.inputs.vfSince;
    outcome = drawOutcome({ cls, synced, energyJ: d.defib.energyJ, defaultJ: defibSpec(d).energyAdultJ, vfDurationS, onTPeak }, rng);
  }
  d.pending = null;
  switch (outcome) {
    case 'unchanged':
      break;
    case 'vf':
      host.setRhythm('vfCoarse', {});
      break;
    case 'asystole':
      host.setRhythm('asystole', {});
      break;
    case 'pea':
      host.setRhythm('asystole', {});
      d.pending = { atS: atS + between(rng, ISO_S), id: 'sinus', opts: { rateBpm: Math.round(between(rng, ROSC_START_BPM)), pulseless: true } };
      break;
    case 'rosc':
      host.setRhythm('asystole', {});
      d.pending = {
        atS: atS + between(rng, ISO_S), id: 'sinus', opts: { rateBpm: Math.round(between(rng, ROSC_START_BPM)) },
        hrRamp: { to: ROSC_HR, durationS: between(rng, ROSC_RAMP_S) }, bpRampS: between(rng, ROSC_BP_RAMP_S),
      };
      break;
    case 'sinus':
      host.setRhythm('asystole', {});
      d.pending = { atS: atS + between(rng, CARDIOVERSION_PAUSE_S), id: 'sinus', opts: { rateBpm: CARDIOVERSION_HR } };
      break;
    default: // an instructor pre-selection (brief §6.5 "convert"): the chosen rhythm after the isoelectric pause
      host.setRhythm('asystole', {});
      d.pending = { atS: atS + between(rng, ISO_S), id: outcome, opts: {} };
  }
  afterShock(d.defib, t, atS, synced, outcome, out);
}

/** A committed QRS detection (R time, s). */
export function deviceOnQrs(d: DeviceState, tR: number): void {
  observeQrs(d.inputs, tR);
}

/**
 * One committed tick: observe the events that became due, run the defibrillator, pacer and sync detector on the
 * committed samples, then the alarm manager. Returns the due events the engine should still emit (raw L2
 * technical flags are replaced by the manager's own alarm events).
 */
export function stepDevice(d: DeviceState, host: DeviceHost, due: readonly EngineEvent[], out: EngineEvent[]): EngineEvent[] {
  const t = host.simT;
  const p = d.alarms.profile;
  const keep: EngineEvent[] = [];
  for (const e of due) {
    observeEvent(d.inputs, e);
    if (e.type === 'beat') d.lastBeat = { t: e.t, qtMs: e.qtMs };
    if (e.type === 'nibp' && e.result !== undefined && p.nibpDoneTone) out.push({ type: 'tone', t: e.t, id: `nibp-done-${Math.round(e.t * 1000)}`, kind: 'nibpDone' });
    if (e.type === 'alarm' && e.level === undefined) continue;
    keep.push(e);
  }
  // defibrillator: charge → ready → auto-disarm; post-shock rhythm onset
  stepDefib(d.defib, t, defibSpec(d), out);
  const pend = d.pending;
  if (pend && t >= pend.atS) {
    d.pending = null;
    host.setRhythm(pend.id, pend.opts);
    if (pend.hrRamp) host.setHr(pend.hrRamp.to, { durationS: pend.hrRamp.durationS, curve: 'linear' });
    if (pend.bpRampS !== undefined) {
      for (const v of ['sbp', 'dbp'] as const) {
        const target = host.l1(v);
        host.setL1(v, target * ROSC_BP_START);
        host.setL1(v, target, { durationS: pend.bpRampS, curve: 'linear' });
      }
    }
  }
  // sync detector on the committed samples: markers while SYNC is on, the armed shock on the next R
  for (const r of syncStep(d.sync, host.committedN - 1, host.vcgAt)) {
    if (!d.defib.sync) continue;
    const tR = r.r / SYNC_RATE;
    out.push({ type: 'marker', t: tR, kind: 'syncR' });
    if (d.defib.syncArmed && d.defib.state === 'ready') deliverShock(d, host, Math.max(tR + SYNC_DELAY_S, host.committedN / SYNC_RATE), true, out);
  }
  // pacer → Modifiers.tcp (threshold from PatientState.paceThresholdMa, brief §6.5)
  const tcp = tcpSpec(d.pacer, pacerSpec(d), host.l1('paceThresholdMa'), host.leadsOff);
  const key = JSON.stringify(tcp);
  if (key !== d.tcpKey) {
    d.tcpKey = key;
    host.setModifiers({ tcp });
  }
  // alarms
  const inp = d.inputs;
  const vf = VF_RHYTHMS.has(host.rhythmId);
  if (vf && inp.vfSince === null) inp.vfSince = t;
  if (!vf) inp.vfSince = null;
  inp.spo2Probe = host.spo2Probe;
  inp.pacing = d.pacer.mode !== 'off';
  stepAlarms(d.alarms, t, buildConditions(d.alarms, inp, t), out);
  // device status on change and at 1 Hz
  const df = d.defib;
  const status: Extract<EngineEvent, { type: 'deviceStatus' }> = {
    type: 'deviceStatus', t,
    defib: { energyJ: df.energyJ, state: df.state, sync: df.sync, readyAt: df.readyAt, shocks: df.shocks, lastShock: df.lastShock },
    pacer: { mode: d.pacer.mode, ratePpm: d.pacer.ratePpm, mA: d.pacer.mA, paused: d.pacer.paused },
    hrDashes: p.hrDashesWhilePacing && d.pacer.mode !== 'off',
  };
  const sk = JSON.stringify([status.defib, status.pacer]);
  if (sk !== d.statusKey || t - d.lastStatusT >= STATUS_EVERY_S - 1e-9) {
    d.statusKey = sk;
    d.lastStatusT = t;
    out.push(status);
  }
  return keep;
}
```

In `packages/engine-core/src/types-device.ts`, replace this block (it occurs exactly once):

```ts
      /** Defibrillator and pacer state, on every change and at 1 Hz. */
      type: 'deviceStatus'; t: SimSeconds;
      defib: { energyJ: number; state: 'idle' | 'charging' | 'ready'; sync: boolean; readyAt: SimSeconds | null; shocks: number } | null;
      pacer: { mode: 'off' | 'demand' | 'fixed'; ratePpm: number; mA: number; paused: boolean } | null;
    };
```

with:

```ts
      /** Defibrillator and pacer state, on every change and at 1 Hz. */
      type: 'deviceStatus'; t: SimSeconds;
      defib: {
        energyJ: number; state: 'idle' | 'charging' | 'ready'; sync: boolean; readyAt: SimSeconds | null; shocks: number;
        /** outcome: 'unchanged' | 'vf' | 'asystole' | 'pea' | 'rosc' | 'sinus', or the pre-selected rhythm id. */
        lastShock: { t: SimSeconds; energyJ: number; sync: boolean; outcome: string } | null;
      } | null;
      pacer: { mode: 'off' | 'demand' | 'fixed'; ratePpm: number; mA: number; paused: boolean } | null;
      /** HR shows dashes while pacing on this skin (LIFEPAK-like, research/05 §2.6). */
      hrDashes: boolean;
    };
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/engine/defib-engine.test.ts test/engine/pacer-engine.test.ts test/engine/device-determinism.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  9 passed (9)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/l3/device-layer.ts packages/engine-core/src/types-device.ts packages/engine-core/test/engine/defib-engine.test.ts packages/engine-core/test/engine/device-determinism.test.ts packages/engine-core/test/engine/engine-commands.test.ts packages/engine-core/test/engine/pacer-engine.test.ts packages/engine-core/test/types-device.test.ts
git commit -m "feat(engine-core): shocks with rail artefact and outcome table, sync shock on the next R, post-shock rhythm, TCP pacing with capture threshold" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: 12-lead capture from the VCG buffer

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/src/l3/capture12/capture.ts`
- Test: `packages/engine-core/test/l3/capture12.test.ts`

**Interfaces:**
- Consumes: `MonitorEngine.readSamples('vcgX'|'vcgY'|'vcgZ')`, `now()` (public API only), `projectLeads`, `designEcgFilter('diagnostic')`.
- Produces: `capture12(e, endT?): Capture12`, `LAYOUT_3X4`, `CAPTURE_S`, `interface Capture12 {t0, rate, durationS, leads: Record<LeadId, Float32Array>, filter, layout, paper, cal, measurements: {hr, axisDeg}}` — exported from `@pme/engine-core`.

- [x] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/capture12.test.ts`:

```ts
// Stage 4b acceptance: 12-lead capture returns 12 × 10 s arrays, diagnostic-filtered, with the limb identities holding.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { capture12, LAYOUT_3X4 } from '../../src/l3/capture12/capture.ts';
import { LEAD_IDS } from '../../src/types.ts';

describe('capture12', () => {
  it('12 leads × 5000 samples, identities III = II − I, aVR = −(I+II)/2, aVL = I − II/2, aVF = II − I/2', () => {
    const e = createEngine({ seed: 4 });
    e.advanceTo(30);
    const c = capture12(e);
    expect(c.t0).toBeCloseTo(20, 6);
    expect(Object.keys(c.leads)).toEqual([...LEAD_IDS]);
    for (const l of LEAD_IDS) expect(c.leads[l]).toHaveLength(5000);
    const { ecgI: I, ecgII: II, ecgIII: III, aVR, aVL, aVF } = c.leads;
    for (let i = 0; i < 5000; i += 7) {
      expect(III[i]! - (II[i]! - I[i]!)).toBeCloseTo(0, 5);
      expect(aVR[i]! + (I[i]! + II[i]!) / 2).toBeCloseTo(0, 5);
      expect(aVL[i]! - (I[i]! - II[i]! / 2)).toBeCloseTo(0, 5);
      expect(aVF[i]! - (II[i]! - I[i]! / 2)).toBeCloseTo(0, 5);
    }
    expect(c.filter).toEqual([0.05, 150]);
    expect(c.layout.rows).toBe(LAYOUT_3X4);
    expect(c.measurements.hr).toBeGreaterThan(65);
    expect(c.measurements.hr).toBeLessThan(85);
    expect(c.measurements.axisDeg).toBeGreaterThan(0);
    expect(c.measurements.axisDeg).toBeLessThan(90); // normal axis
  });

  it('the diagnostic filter is applied whatever the monitor filter (a band-limited monitor lane differs from the capture)', () => {
    const e = createEngine({ seed: 4 });
    e.dispatch({ id: 'f', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'band:0.5-24' } });
    e.advanceTo(30);
    const a = capture12(e).leads.ecgII;
    const e2 = createEngine({ seed: 4 });
    e2.advanceTo(30);
    const b = capture12(e2).leads.ecgII;
    for (let i = 0; i < 5000; i += 11) expect(a[i]).toBeCloseTo(b[i]!, 6);
  });

  it('needs 10 s of ECG', () => {
    const e = createEngine();
    e.advanceTo(5);
    expect(() => capture12(e)).toThrow(/10 s/);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/capture12.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../src/l3/capture12/capture.ts"`

- [x] **Step 3: Implement**

In `packages/engine-core/src/index.ts`, replace this block (it occurs exactly once):

```ts
export * from './types-hemo.ts'; // Stage 2
export * from './types-device.ts'; // Stage 4b
```

with:

```ts
export * from './types-hemo.ts'; // Stage 2
export * from './types-device.ts'; // Stage 4b
export { capture12, LAYOUT_3X4, CAPTURE_S, type Capture12 } from './l3/capture12/capture.ts'; // Stage 4b
```

Create `packages/engine-core/src/l3/capture12/capture.ts`:

```ts
// 12-lead capture (brief §6.6): the last 10 s from the VCG ring buffer, projected to 12 leads with the DIAGNOSTIC
// 0.05–150 Hz filter whatever the monitor filter is (LIFEPAK prints this way, research/05 §2.6), laid out 3×4 with
// a lead II rhythm strip, 25 mm/s, 10 mm/mV, with calibration pulses. Uses only the public MonitorEngine API.
import { projectLeads } from '../../l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterSample, FILTER_BANDS } from '../ecg-filter.ts';
import { LEAD_IDS, type LeadId, type MonitorEngine } from '../../types.ts';

export const CAPTURE_S = 10;
export const CAPTURE_RATE = 500;
/** Filter pre-roll: up to this much older signal settles the 0.05 Hz high-pass before the window [ENG]. */
export const PREROLL_S = 20;
/** 3×4 layout (brief §6.6 default): columns of 2.5 s, rows I/II/III, aVR/aVL/aVF, V1–V3, V4–V6; lead II rhythm strip. */
export const LAYOUT_3X4: readonly (readonly LeadId[])[] = [
  ['ecgI', 'aVR', 'V1', 'V4'],
  ['ecgII', 'aVL', 'V2', 'V5'],
  ['ecgIII', 'aVF', 'V3', 'V6'],
];

export interface Capture12 {
  /** Sim time of the first sample. */
  t0: number;
  rate: 500;
  durationS: number;
  leads: Record<LeadId, Float32Array>;
  filter: readonly [number, number];
  layout: { kind: '3x4'; rows: readonly (readonly LeadId[])[]; columnS: number; rhythmLead: LeadId };
  paper: { mmPerS: 25; mmPerMv: 10 };
  cal: { mV: 1; ms: 200 };
  /** Heart rate from the rhythm strip's R peaks, and the frontal QRS axis from the net QRS area in I and aVF [ENG]. */
  measurements: { hr: number | null; axisDeg: number | null };
}

/** Capture the 10 s that end at the engine's current committed time (or at `endT`). Throws if < 10 s are held. */
export function capture12(e: MonitorEngine, endT: number = e.now().simT): Capture12 {
  const end = Math.floor(endT * CAPTURE_RATE); // exclusive
  const n = CAPTURE_S * CAPTURE_RATE;
  const start = end - n;
  if (start < 0) throw new RangeError('capture12 needs 10 s of ECG');
  const pre = Math.min(start, PREROLL_S * CAPTURE_RATE);
  const total = pre + n;
  const X = new Float32Array(total);
  const Y = new Float32Array(total);
  const Z = new Float32Array(total);
  if (e.readSamples('vcgX', start - pre, X) < total || e.readSamples('vcgY', start - pre, Y) < total || e.readSamples('vcgZ', start - pre, Z) < total) {
    throw new RangeError('capture12: the VCG buffer does not hold the window');
  }
  // Filter X, Y, Z, then project: the filter is linear, so the Einthoven/Goldberger identities hold exactly.
  const sec = designEcgFilter('diagnostic', CAPTURE_RATE);
  const fs = [createFilterState(sec), createFilterState(sec), createFilterState(sec)];
  const leads = Object.fromEntries(LEAD_IDS.map((l) => [l, new Float32Array(n)])) as Record<LeadId, Float32Array>;
  const tmp = new Float64Array(12);
  for (let i = 0; i < total; i++) {
    const x = filterSample(sec, fs[0] as number[], X[i] as number);
    const y = filterSample(sec, fs[1] as number[], Y[i] as number);
    const z = filterSample(sec, fs[2] as number[], Z[i] as number);
    if (i < pre) continue;
    projectLeads(x, y, z, tmp);
    for (let k = 0; k < 12; k++) (leads[LEAD_IDS[k] as LeadId] as Float32Array)[i - pre] = tmp[k] as number;
  }
  return {
    t0: start / CAPTURE_RATE,
    rate: CAPTURE_RATE,
    durationS: CAPTURE_S,
    leads,
    filter: FILTER_BANDS.diagnostic,
    layout: { kind: '3x4', rows: LAYOUT_3X4, columnS: CAPTURE_S / 4, rhythmLead: 'ecgII' },
    paper: { mmPerS: 25, mmPerMv: 10 },
    cal: { mV: 1, ms: 200 },
    measurements: measure(leads),
  };
}

/** R peaks on lead II: local maxima above 60 % of the strip's maximum, ≥ 250 ms apart [ENG]. */
function rPeaks(x: Float32Array): number[] {
  let mx = 0;
  for (const v of x) mx = Math.max(mx, v);
  const out: number[] = [];
  for (let i = 1; i < x.length - 1; i++) {
    const v = x[i] as number;
    if (v < 0.6 * mx || v < (x[i - 1] as number) || v < (x[i + 1] as number)) continue;
    if (out.length > 0 && i - (out[out.length - 1] as number) < 125) continue;
    out.push(i);
  }
  return out;
}

function measure(leads: Record<LeadId, Float32Array>): Capture12['measurements'] {
  const r = rPeaks(leads.ecgII);
  if (r.length < 2) return { hr: null, axisDeg: null };
  const hr = Math.round((60 * CAPTURE_RATE * (r.length - 1)) / ((r[r.length - 1] as number) - (r[0] as number)));
  let a1 = 0;
  let aF = 0;
  for (const p of r) {
    for (let i = Math.max(0, p - 40); i < Math.min(leads.ecgI.length, p + 40); i++) {
      a1 += leads.ecgI[i] as number; // ±80 ms around R: the QRS [ENG]
      aF += leads.aVF[i] as number;
    }
  }
  return { hr, axisDeg: Math.round((Math.atan2(aF, a1) * 180) / Math.PI) };
}
```

- [x] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/capture12.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  3 passed (3)`; the type check exits 0.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/src/l3/capture12/capture.ts packages/engine-core/test/l3/capture12.test.ts
git commit -m "feat(engine-core): capture12 — 10 s of 12 leads through the diagnostic filter, 3×4 layout data, HR and axis" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Trends (1 Hz × 8 h) and the event log

**Files:**
- Modify: `packages/engine-core/src/index.ts`
- Create: `packages/engine-core/src/l3/trends/event-log.ts`
- Create: `packages/engine-core/src/l3/trends/trend-store.ts`
- Test: `packages/engine-core/test/l3/trends/trends.test.ts`

**Interfaces:**
- Consumes: engine events and commands.
- Produces (exported from `@pme/engine-core`): `class TrendStore {bytes, latestS, oldestS, record(e), series(id, fromS, toS), table(ids, stepS, fromS, toS)}`, `TREND_NUMERICS`, `TREND_SLOTS = 28 800`; `class EventLog {entries, command(cmd, t), event(e), count(kind), toJSON(), toCSV()}`, `LogEntry`, `LogKind`.

- [ ] **Step 1: Write the failing test**

Create `packages/engine-core/test/l3/trends/trends.test.ts`:

```ts
// Stage 4b acceptance: 8 h of 1 Hz values retained at ≤ 3 MB; event-log entries for every command, alarm and shock.
import { describe, expect, it } from 'vitest';
import { EventLog } from '../../../src/l3/trends/event-log.ts';
import { TREND_NUMERICS, TREND_SLOTS, TrendStore } from '../../../src/l3/trends/trend-store.ts';
import type { EngineEvent, Measured, NumericId } from '../../../src/types.ts';
import { cmd, devRig } from '../../helpers/device.ts';

const meas = (t: number, v: number): EngineEvent => ({
  type: 'measurement', t, values: Object.fromEntries(TREND_NUMERICS.map((k) => [k, { value: v, flag: 'valid', at: t } satisfies Measured])) as Partial<Record<NumericId, Measured>>,
});

describe('trend store', () => {
  it('holds 8 h of every numeric at 1 Hz in ≤ 3 MB and drops what is older', () => {
    const s = new TrendStore();
    expect(s.bytes).toBeLessThanOrEqual(3 * 1024 * 1024);
    for (let t = 1; t <= TREND_SLOTS + 10; t++) s.record(meas(t, t % 1000));
    expect(s.latestS).toBe(TREND_SLOTS + 10);
    expect(s.oldestS).toBe(11);
    const first = s.series('hr', 11, 20);
    expect(Array.from(first)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(Number.isNaN(s.series('hr', 5, 5)[0] as number)).toBe(true);
    expect(s.bytes).toBeLessThanOrEqual(3 * 1024 * 1024);
  });

  it('gaps read NaN; the table takes the latest value in each step', () => {
    const s = new TrendStore();
    s.record({ type: 'measurement', t: 10, values: { hr: { value: 70, flag: 'valid', at: 10 } } });
    s.record({ type: 'measurement', t: 40, values: { hr: { value: 90, flag: 'valid', at: 40 }, spo2: { value: 97, flag: 'invalid', at: 40 } } });
    expect(Number.isNaN(s.series('hr', 20, 20)[0] as number)).toBe(true);
    const rows = s.table(['hr', 'spo2'], 30, 0, 59);
    expect(rows).toEqual([{ t: 0, values: { hr: 70 } }, { t: 30, values: { hr: 90 } }]);
  });
});

describe('event log', () => {
  it('logs every accepted command, alarm change and shock; CSV rows per kind match', () => {
    const { e, ev } = devRig('zoll-like');
    const log = new EventLog();
    e.on((x) => log.event(x));
    const send = (c: ReturnType<typeof cmd>) => {
      if (e.dispatch(c).accepted) log.command(c, e.now().simT);
    };
    send(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    send(cmd({ type: 'attachSensor', sensor: 'spo2', state: 'off' }));
    send(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } }));
    e.advanceTo(8);
    send(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }));
    e.advanceTo(8.1);
    send(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } })); // rejected: no longer charged
    e.advanceTo(12);
    const alarmEvents = ev.filter((x) => x.type === 'alarm' && x.level !== undefined).length;
    expect(log.count('alarm')).toBe(alarmEvents);
    expect(log.count('command')).toBe(2);
    expect(log.count('rhythm')).toBe(1);
    expect(log.count('sensor')).toBe(1);
    expect(log.count('defib')).toBe(3); // chargeStart, chargeReady, shock
    const csv = log.toCSV().split('\n');
    expect(csv[0]).toBe('t,kind,issuedBy,text');
    expect(csv.length - 1).toBe(log.entries.length);
    for (const kind of ['alarm', 'command', 'defib'] as const) expect(csv.filter((r) => r.split(',')[1] === kind).length).toBe(log.count(kind));
    expect(log.toJSON()[0]?.issuedBy).toBe('test');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd packages/engine-core && npx vitest run test/l3/trends/trends.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../../../src/l3/trends/event-log.ts"`

- [ ] **Step 3: Implement**

In `packages/engine-core/src/index.ts`, replace this block (it occurs exactly once):

```ts
export * from './types-device.ts'; // Stage 4b
export { capture12, LAYOUT_3X4, CAPTURE_S, type Capture12 } from './l3/capture12/capture.ts'; // Stage 4b
```

with:

```ts
export * from './types-device.ts'; // Stage 4b
export { capture12, LAYOUT_3X4, CAPTURE_S, type Capture12 } from './l3/capture12/capture.ts'; // Stage 4b
export { TrendStore, TREND_NUMERICS, TREND_SLOTS } from './l3/trends/trend-store.ts'; // Stage 4b
export { EventLog, type LogEntry, type LogKind } from './l3/trends/event-log.ts'; // Stage 4b
```

Create `packages/engine-core/src/l3/trends/event-log.ts`:

```ts
// Event log (brief §6.7): every command (with issuedBy), alarm, sensor event, shock and NIBP result, exportable as
// CSV and JSON for the debrief. Fed with commands as they are dispatched and with engine events as they arrive.
import type { Command, EngineEvent } from '../../types.ts';

export type LogKind = 'command' | 'sensor' | 'alarm' | 'defib' | 'nibp' | 'rhythm';

export interface LogEntry {
  t: number;
  kind: LogKind;
  text: string;
  issuedBy?: string;
}

/** Entries kept (oldest dropped first) [ENG]: 8 h of a busy scenario is a few thousand. */
export const LOG_MAX = 20_000;

function describe(c: Command): string {
  switch (c.type) {
    case 'setTarget':
      return `${c.variable} → ${c.value}${c.ramp ? ` over ${c.ramp.durationS} s` : ''}`;
    case 'setRhythm':
      return `rhythm ${c.rhythm}`;
    case 'device':
      return `${c.action.device} ${c.action.action}${'value' in c.action && c.action.value !== undefined ? ` ${String(c.action.value)}` : ''}${'param' in c.action && c.action.param ? ` ${c.action.param}` : ''}`;
    case 'applyEvent':
      return `${c.event.kind} ${'action' in c.event ? c.event.action : ''} ${JSON.stringify(c.event)}`.trim();
    case 'attachSensor':
      return `sensor ${c.sensor} ${c.state}`;
    default:
      return `${c.type} ${JSON.stringify(c)}`;
  }
}

export class EventLog {
  readonly entries: LogEntry[] = [];

  private push(e: LogEntry): void {
    this.entries.push(e);
    if (this.entries.length > LOG_MAX) this.entries.splice(0, this.entries.length - LOG_MAX);
  }

  /** An accepted command, logged at the sim time it was dispatched. */
  command(c: Command, t: number): void {
    const kind: LogKind = c.type === 'attachSensor' ? 'sensor' : c.type === 'setRhythm' ? 'rhythm' : 'command';
    this.push({ t, kind, text: describe(c), issuedBy: c.issuedBy });
  }

  /** An engine event: alarms (every state change), shocks and charge/disarm markers, NIBP results and failures. */
  event(e: EngineEvent): void {
    if (e.type === 'alarm' && e.level !== undefined) this.push({ t: e.t, kind: 'alarm', text: `${e.state} ${e.id} L${e.level} ${e.text}` });
    else if (e.type === 'marker' && (e.kind === 'shock' || e.kind === 'chargeStart' || e.kind === 'chargeReady' || e.kind === 'disarm')) {
      this.push({ t: e.t, kind: 'defib', text: `${e.kind}${e.data ? ` ${JSON.stringify(e.data)}` : ''}` });
    } else if (e.type === 'nibp' && (e.result || e.phase === 'failed')) {
      this.push({ t: e.t, kind: 'nibp', text: e.result ? `NIBP ${e.result.sys}/${e.result.dia} (${e.result.map})` : 'NIBP failed' });
    }
  }

  count(kind: LogKind): number {
    return this.entries.filter((e) => e.kind === kind).length;
  }

  toJSON(): LogEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  /** RFC 4180 CSV: t,kind,issuedBy,text. */
  toCSV(): string {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = this.entries.map((e) => [e.t.toFixed(2), e.kind, q(e.issuedBy ?? ''), q(e.text)].join(','));
    return ['t,kind,issuedBy,text', ...rows].join('\n');
  }
}
```

Create `packages/engine-core/src/l3/trends/trend-store.ts`:

```ts
// Trends (brief §6.7; §3.5 "Trends are stored at 1 Hz for 8 h"): one Float32 ring per numeric, one slot per sim
// second, NaN where nothing was measured. 22 numerics × 28,800 s × 4 B = 2.53 MB (≤ the brief's 2.8 MB budget).
// Fed with `measurement` events wherever they arrive (the renderer keeps one on the main thread).
import type { EngineEvent, NumericId } from '../../types.ts';

export const TREND_NUMERICS: readonly NumericId[] = [
  'hr', 'pr', 'spo2', 'pi', 'abpSys', 'abpDia', 'abpMean', 'cvpMean', 'papSys', 'papDia', 'papMean',
  'nibpSys', 'nibpDia', 'nibpMean', 'etco2', 'imco2', 'awrr', 'rr', 'tempCore', 'tempSite', 'stII', 'qtc',
];
export const TREND_HOURS = 8;
export const TREND_SLOTS = TREND_HOURS * 3600;

export class TrendStore {
  private readonly data = new Map<NumericId, Float32Array>();
  /** Highest second index written (-1: none). */
  private last = -1;

  constructor() {
    for (const k of TREND_NUMERICS) this.data.set(k, new Float32Array(TREND_SLOTS).fill(Number.NaN));
  }

  /** Bytes held by the rings. */
  get bytes(): number {
    let b = 0;
    for (const a of this.data.values()) b += a.byteLength;
    return b;
  }

  /** Newest second held, or -1. */
  get latestS(): number {
    return this.last;
  }

  /** Oldest second still held. */
  get oldestS(): number {
    return Math.max(0, this.last - TREND_SLOTS + 1);
  }

  /** Record the valid values of a measurement event in the slot of its second. */
  record(e: EngineEvent): void {
    if (e.type !== 'measurement') return;
    const s = Math.floor(e.t + 1e-6);
    if (s < this.oldestS) return;
    if (s > this.last) {
      // seconds skipped since the last write hold nothing (clear what the ring still has from 8 h ago)
      for (let k = Math.max(this.last + 1, s - TREND_SLOTS + 1); k <= s; k++) for (const a of this.data.values()) a[k % TREND_SLOTS] = Number.NaN;
      this.last = s;
    }
    for (const [id, m] of Object.entries(e.values)) {
      const a = this.data.get(id as NumericId);
      if (a && m && m.value !== null && m.flag !== 'invalid') a[s % TREND_SLOTS] = m.value;
    }
  }

  /** Values of one numeric for seconds [fromS, toS] (NaN where missing or no longer held). */
  series(id: NumericId, fromS: number, toS: number): Float32Array {
    const out = new Float32Array(Math.max(0, toS - fromS + 1)).fill(Number.NaN);
    const a = this.data.get(id);
    if (!a) return out;
    for (let s = Math.max(fromS, this.oldestS); s <= Math.min(toS, this.last); s++) out[s - fromS] = a[s % TREND_SLOTS] as number;
    return out;
  }

  /** Tabular trend (brief §6.7): one row every stepS seconds, newest last; each value is the latest in its step. */
  table(ids: readonly NumericId[], stepS: number, fromS: number, toS: number): Array<{ t: number; values: Partial<Record<NumericId, number>> }> {
    const rows: Array<{ t: number; values: Partial<Record<NumericId, number>> }> = [];
    for (let t = fromS; t <= toS; t += stepS) {
      const values: Partial<Record<NumericId, number>> = {};
      for (const id of ids) {
        const s = this.series(id, t, Math.min(toS, t + stepS - 1));
        for (let i = s.length - 1; i >= 0; i--) {
          if (!Number.isNaN(s[i] as number)) {
            values[id] = s[i] as number;
            break;
          }
        }
      }
      rows.push({ t, values });
    }
    return rows;
  }
}
```

- [ ] **Step 4: Run the tests and the type check**

```bash
cd packages/engine-core && npx vitest run test/l3/trends/trends.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  3 passed (3)`; the type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/index.ts packages/engine-core/src/l3/trends/event-log.ts packages/engine-core/src/l3/trends/trend-store.ts packages/engine-core/test/l3/trends/trends.test.ts
git commit -m "feat(engine-core): trend store (22 numerics × 8 h ≤ 3 MB) and event log with CSV/JSON export" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Render plan: lanes from the skin (RR-1)

**Files:**
- Create: `packages/renderer/src/skin-plan.ts`
- Test: `packages/renderer/test/skin-plan.test.ts`

**Interfaces:**
- Consumes: `ResolvedSkin`, `engineFilterFor` (`@pme/skins`); `WAVE_STYLE` (Stage 2).
- Produces (`packages/renderer/src/skin-plan.ts`): `interface PlanLane`, `interface RenderPlan`, `LEAD_LABEL`, `filterModeFor(band)`, `leadOf(skinLead)`, `formatGain(mult, gainLabel)`, `ecgLabel(template, lead, mult, gainLabel, filterName)`, `renderPlan(r, page?)`, `legacyPlan(leads, waves)`. Tasks 18 and 21 extend it with edit blocks.

- [ ] **Step 1: Write the failing test**

Create `packages/renderer/test/skin-plan.test.ts`:

```ts
// RR-1: the lane layout from the skin (brief §3.8) and the legacy Stage 1/2 plan.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { ecgLabel, filterModeFor, legacyPlan, renderPlan } from '../src/skin-plan.ts';

describe('renderPlan', () => {
  it('saadat-like: ECG II auto-gain, pleth, IBP1 → abp (ART scale 40–200), IBP2 → cvp, resp at 6 mm/s; 4 px gap; NORMAL filter', () => {
    const p = renderPlan(resolveSkin('saadat-like'));
    expect(p.lanes.map((l) => [l.id, l.channel])).toEqual([['ECG1', 'ecgII'], ['PLETH', 'pleth'], ['IBP1', 'abp'], ['IBP2', 'cvp'], ['RESP', 'resp']]);
    expect(p.lanes[0]).toMatchObject({ autoGain: true, color: '#00F000', mmPerS: 25 });
    expect(p.lanes[2]).toMatchObject({ range: [40, 200], mmPerS: 12.5 });
    expect(p.lanes[4]?.mmPerS).toBe(6);
    expect(p.eraseGapPx).toBe(4);
    expect(p.filterNames.monitor).toBe('NORMAL');
    expect(p.filterNames['band:0.5-24']).toBe('MONITOR');
    expect(ecgLabel(p.lanes[0]!.label, 'ecgII', 2, p.gainLabel, 'NORMAL')).toBe('II  X2  NORMAL');
    expect(p.paceMarker).toEqual({ style: 'vertical-line', heightMm: 10 });
  });

  it('philips-like: II and V1, letter filter, ABP 0–150, CO2 0–40 mmHg; zoll-like r-above sync markers', () => {
    const p = renderPlan(resolveSkin('philips-like'));
    expect(p.lanes.map((l) => l.channel)).toEqual(['ecgII', 'V1', 'abp', 'pleth', 'co2']);
    expect(ecgLabel(p.lanes[1]!.label, 'V1', 1, p.gainLabel, p.filterNames.monitor!)).toBe('V1  M');
    expect(p.lanes[4]?.range).toEqual([0, 40]);
    expect(renderPlan(resolveSkin('zoll-like')).syncMarker).toBe('r-above');
  });

  it('pages: saadat-like P10 (PUMP) hides IBP scale numbers; P7 has its own lanes', () => {
    const r = resolveSkin('saadat-like');
    expect(renderPlan(r, 'P10').hideScaleNumbers).toBe(true);
    expect(renderPlan(r, 'P7').lanes.map((l) => l.id)).toEqual(['ECG1', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'PLETH']);
  });

  it('ecg-grid theme carries the grid; skin bands map to engine filter modes', () => {
    expect(renderPlan(resolveSkin('philips-like', { theme: 'ecg-grid' })).grid).toMatchObject({ minorMm: 1, majorMm: 5 });
    expect(filterModeFor([0.5, 40])).toBe('monitor');
    expect(filterModeFor([1, 20])).toBe('band:1-20');
  });

  it('legacyPlan reproduces the Stage 1/2 lanes', () => {
    const p = legacyPlan(['ecgII', 'V5'], ['abp']);
    expect(p.lanes.map((l) => [l.channel, l.color, l.range])).toEqual([['ecgII', '#00ff66', null], ['V5', '#00ff66', null], ['abp', '#ff3b3b', [0, 150]]]);
    expect(ecgLabel(p.lanes[0]!.label, 'ecgII', 1, p.gainLabel, 'M')).toBe('II  M');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd packages/renderer && npx vitest run test/skin-plan.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../src/skin-plan.ts"`

- [ ] **Step 3: Implement**

Create `packages/renderer/src/skin-plan.ts`:

```ts
// ResolvedSkin → RenderPlan (renderer requests RR-1, RR-2, RR-3): the plain-data lane layout the worker draws from.
// It runs on the main thread (where @pme/skins is resolved) and crosses to the worker as JSON. A plan built from
// the Stage 1/2 options (`legacyPlan`) reproduces the old hard-coded look exactly, so pages without a skin keep it.
import { engineFilterFor, type LaneId, type ResolvedSkin, type Skin } from '@pme/skins';
import type { ChannelId, EcgFilterMode, LeadId } from '@pme/engine-core';
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts';

export interface PlanLane {
  id: LaneId | 'ECG' | WaveLaneId;
  kind: 'ecg' | 'wave';
  /** Engine channel; null for a lane with no signal yet (IBP4). */
  channel: ChannelId | null;
  color: string;
  mmPerS: number;
  gainMmPerMv: number;
  autoGain: boolean;
  /** ECG gain multipliers (of 10 mm/mV) auto-gain may choose from. */
  gainOptions: number[];
  /** Wave scale [lo, hi] (mmHg; CO2 mmHg); null = auto-scale (pleth). */
  range: [number, number] | null;
  /** Static label (waves) or the template for ECG lanes: '{lead}  X{gain}  {FILTER}'. */
  label: string;
}

export interface RenderPlan {
  skin: string;
  background: string;
  foreground: string;
  lineWidth: number;
  eraseGapPx: number;
  cursorLine: boolean;
  grid: { minorMm: number; majorMm: number; minor: string; major: string } | null;
  font: string;
  gainLabel: Skin['ecg']['gainLabel'];
  /** Engine filter mode → the name the lane label shows ('M', 'NORMAL', …). */
  filterNames: Record<string, string>;
  paceMarker: Skin['ecg']['paceMarker'];
  syncMarker: Skin['syncMarker'];
  hideScaleNumbers: boolean;
  lanes: PlanLane[];
}

const LEAD_OF: Record<string, LeadId> = {
  I: 'ecgI', II: 'ecgII', III: 'ecgIII', aVR: 'aVR', aVL: 'aVL', aVF: 'aVF', V: 'V1', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6',
};
export const LEAD_LABEL: Record<LeadId, string> = {
  ecgI: 'I', ecgII: 'II', ecgIII: 'III', aVR: 'aVR', aVL: 'aVL', aVF: 'aVF', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6',
};
/** Skin wave lanes → engine channels (IBP1–3 are the ART/CVP/PAP lines of Stage 2; IBP4 has no line yet). */
const WAVE_CHANNEL: Partial<Record<LaneId, ChannelId | null>> = {
  PLETH: 'pleth', ART: 'abp', CVP: 'cvp', PAP: 'pap', IBP1: 'abp', IBP2: 'cvp', IBP3: 'pap', IBP4: null, RESP: 'resp', CO2: 'co2',
};
const IBP_SCALE_KEY: Partial<Record<LaneId, string>> = { ART: 'ART', IBP1: 'ART', CVP: 'CVP', IBP2: 'CVP', PAP: 'PAP', IBP3: 'PAP', IBP4: 'IBP' };
/** Engine filter-command value for a skin band: the exact engine mode, else 'band:<lo>-<hi>' (E-4a-1). */
export function filterModeFor(band: readonly [number, number]): EcgFilterMode {
  const f = engineFilterFor(band);
  return f.exact ? f.engineMode : `band:${band[0]}-${band[1]}`;
}

export function leadOf(skinLead: string): LeadId {
  return LEAD_OF[skinLead] ?? 'ecgII';
}

/** Gain as the lane label prints it (brief §3.8 `ecg.gainLabel`): X2, 20 (mm/mV) or 2 (cm/mV). */
export function formatGain(mult: number, gainLabel: Skin['ecg']['gainLabel']): string {
  const v = gainLabel === 'mm-per-mV' ? mult * 10 : mult;
  return String(Number(v.toFixed(3)));
}

/** Fill an ECG lane template. */
export function ecgLabel(template: string, lead: LeadId, gainMult: number, gainLabel: Skin['ecg']['gainLabel'], filterName: string): string {
  return template.replace('{lead}', LEAD_LABEL[lead]).replace('{gain}', formatGain(gainMult, gainLabel)).replace('{FILTER}', filterName);
}

export function renderPlan(r: ResolvedSkin, page?: string): RenderPlan {
  const s = r.skin;
  const pg = s.pages.find((p) => p.id === (page ?? s.defaultPage));
  const laneIds = pg?.lanes ?? s.layout.lanes;
  const gainOptions = s.ecg.gainOptions.filter((g): g is number => typeof g === 'number');
  const filterNames: Record<string, string> = {};
  for (const [name, band] of Object.entries(s.ecg.filters)) filterNames[filterModeFor(band)] = s.ecg.filterLabel === 'letter' ? name.charAt(0) : name;
  let ecgIndex = 0;
  const lanes = laneIds.map((id): PlanLane => {
    const rl = r.render.lanes.find((l) => l.lane === id);
    const color = rl?.color ?? s.foreground;
    const mmPerS = rl?.mmPerS ?? s.sweep.ibp.default;
    if (id.startsWith('ECG')) {
      const lead = leadOf(s.ecg.laneLeads[ecgIndex++] ?? s.ecg.laneLeads[0] ?? 'II');
      return { id, kind: 'ecg', channel: lead, color, mmPerS, gainMmPerMv: rl?.gainMmPerMv ?? 10, autoGain: rl?.autoGain ?? false, gainOptions, range: null, label: s.ecg.laneLabel };
    }
    const scaleKey = IBP_SCALE_KEY[id];
    const sc = scaleKey ? s.ibp.scales[scaleKey] : undefined;
    const range: [number, number] | null =
      id === 'PLETH' ? null : id === 'CO2' ? [0, s.co2.scaleUnit === '%' ? (s.co2.scale * 760) / 100 : s.co2.scale] : id === 'RESP' ? [-1, 1] : sc ? [sc[0], sc[2]] : [0, 150];
    return { id, kind: 'wave', channel: WAVE_CHANNEL[id] ?? null, color, mmPerS, gainMmPerMv: 10, autoGain: false, gainOptions: [], range, label: id === 'PLETH' ? 'PLETH' : id };
  });
  return {
    skin: r.id,
    background: r.render.background,
    foreground: r.render.foreground,
    lineWidth: r.render.lineWidth,
    eraseGapPx: r.render.eraseGapPx,
    cursorLine: r.render.cursorLine,
    grid: r.render.grid,
    font: r.render.fontStack,
    gainLabel: s.ecg.gainLabel,
    filterNames,
    paceMarker: s.ecg.paceMarker,
    syncMarker: s.syncMarker,
    hideScaleNumbers: pg?.pump?.hideScaleNumbers ?? false,
    lanes,
  };
}

/** Stage 1/2 look (monitor-core THEME, WAVE_STYLE) for pages that pass `lanes`/`waves` and no skin. */
export function legacyPlan(leads: readonly LeadId[], waves: readonly WaveLaneId[]): RenderPlan {
  const ecg = leads.map((lead): PlanLane => ({
    id: 'ECG', kind: 'ecg', channel: lead, color: '#00ff66', mmPerS: 25, gainMmPerMv: 10, autoGain: false, gainOptions: [], range: null, label: '{lead}  {FILTER}',
  }));
  const wv = waves.map((w): PlanLane => ({
    id: w, kind: 'wave', channel: w, color: WAVE_STYLE[w].color, mmPerS: 25, gainMmPerMv: 10, autoGain: false, gainOptions: [],
    range: WAVE_STYLE[w].range ? [WAVE_STYLE[w].range[0], WAVE_STYLE[w].range[1]] : null, label: WAVE_STYLE[w].label,
  }));
  return {
    skin: 'legacy', background: '#000', foreground: '#00ff66', lineWidth: 1.75, eraseGapPx: 16, cursorLine: false, grid: null,
    font: 'system-ui, sans-serif', gainLabel: 'mm-per-mV', filterNames: { monitor: 'M', diagnostic: 'D' },
    paceMarker: { style: 'marker-above', heightMm: 2 }, syncMarker: 'line', hideScaleNumbers: false, lanes: [...ecg, ...wv],
  };
}
```

- [ ] **Step 4: Run the tests and the type check**

```bash
cd packages/renderer && npx vitest run test/skin-plan.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  5 passed (5)`; the type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/skin-plan.ts packages/renderer/test/skin-plan.test.ts
git commit -m "feat(renderer): render plan from the resolved skin (RR-1) and the legacy Stage 1/2 plan" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Sweep lane: ECG-paper grid under the erase bar (RR-4) and cursor line (RR-3)

**Files:**
- Modify: `packages/renderer/src/sweep-lane.ts`
- Test: `packages/renderer/test/sweep-lane-4b.test.ts`

**Interfaces:**
- Consumes: `SweepLane` (Stage 1).
- Produces: `LaneConfig.grid?`, `LaneConfig.cursorLine?`, `SweepLane.lastDrawnIndex`; the grid is repainted inside every cleared rect.

- [ ] **Step 1: Write the failing test**

Create `packages/renderer/test/sweep-lane-4b.test.ts`:

```ts
// RR-3 cursor line and RR-4 grid painter on the erase bar.
import { describe, expect, it } from 'vitest';
import { SweepLane, type LaneConfig } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const cfg = (extra: Partial<LaneConfig>): LaneConfig => ({
  x: 0, y: 0, width: 400, height: 100, baseline: 0.5, rate: 500, mmPerS: 25, pxPerMm: 4, gainMmPerMv: 10,
  color: '#0f0', background: '#fff8f4', lineWidth: 1.5, eraseGapPx: 16, ...extra,
});
const flat = (_from: number, out: Float32Array) => {
  out.fill(0);
  return out.length;
};

describe('SweepLane 4b options', () => {
  it('grid: every cleared rect is repainted with minor and major lines in the theme colours', () => {
    const ctx = new FakeCtx();
    const lane = new SweepLane(cfg({ grid: { minorMm: 1, majorMm: 5, minor: '#FAE2E2', major: '#F4C4C4' } }), 1);
    lane.reset(ctx);
    const styles = ctx.calls.filter((c) => c.op === 'stroke').map((c) => c.style);
    expect(styles).toEqual(['#FAE2E2', '#F4C4C4']);
    ctx.clear();
    lane.draw(ctx, 0.5, flat);
    lane.draw(ctx, 0.6, flat);
    const strokes = ctx.calls.filter((c) => c.op === 'stroke').map((c) => c.style);
    expect(strokes.filter((s) => s === '#F4C4C4').length).toBeGreaterThanOrEqual(1); // grid inside the new band
    expect(strokes).toContain('#0f0'); // then the trace
  });

  it('no grid: nothing but the background fill (Stage 1 behaviour)', () => {
    const ctx = new FakeCtx();
    new SweepLane(cfg({}), 1).reset(ctx);
    expect(ctx.calls.filter((c) => c.op === 'stroke')).toEqual([]);
  });

  it('cursor line: a 1-px bar in the trace colour at the leading edge of the gap', () => {
    const ctx = new FakeCtx();
    const lane = new SweepLane(cfg({ cursorLine: true }), 1);
    lane.draw(ctx, 0.2, flat);
    ctx.clear();
    lane.draw(ctx, 0.3, flat);
    const bar = ctx.calls.filter((c) => c.op === 'fillRect' && c.style === '#0f0');
    expect(bar).toHaveLength(1);
    expect(bar[0]!.args[0]).toBeCloseTo(((150 / 500) * 100 + 16 - 1) % 400, 6);
    expect(bar[0]!.args[2]).toBe(1);
    expect(lane.lastDrawnIndex).toBe(150);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd packages/renderer && npx vitest run test/sweep-lane-4b.test.ts; cd -`
Expected: FAIL — no grid strokes after `reset` (`expected [] to deeply equal ['#FAE2E2', '#F4C4C4']`) and `lastDrawnIndex` undefined

- [ ] **Step 3: Implement**

In `packages/renderer/src/sweep-lane.ts` (edit 1 of 4), replace this block (it occurs exactly once):

```ts
  lineWidth: number; // 1.5–2 CSS px
  eraseGapPx: number; // 16 CSS px default (brief §3.5)
}
```

with:

```ts
  lineWidth: number; // 1.5–2 CSS px
  eraseGapPx: number; // 16 CSS px default (brief §3.5)
  /** ECG-paper grid painted wherever the lane is cleared, so the erase bar keeps it (request RR-4). */
  grid?: { minorMm: number; majorMm: number; minor: string; major: string } | null;
  /** A 1-px line at the leading edge of the erase gap (request RR-3; every shipped skin says false). */
  cursorLine?: boolean;
}
```

In `packages/renderer/src/sweep-lane.ts` (edit 2 of 4), replace this block (it occurs exactly once):

```ts
    ctx.fillStyle = this.cfg.background;
    ctx.fillRect(this.cfg.x, this.cfg.y, this.cfg.width, this.cfg.height);
  }
```

with:

```ts
    ctx.fillStyle = this.cfg.background;
    ctx.fillRect(this.cfg.x, this.cfg.y, this.cfg.width, this.cfg.height);
    this.paintGrid(ctx, [this.cfg.x, this.cfg.y, this.cfg.width, this.cfg.height]);
  }

  /** Absolute index of the last sample drawn (-1 after a reset). */
  get lastDrawnIndex(): number {
    return this.lastIndex;
  }

  /** Paint the grid inside one cleared rect (RR-4): minor then major lines, anchored to the lane's top-left. */
  private paintGrid(ctx: Ctx2D, r: Rect): void {
    const g = this.cfg.grid;
    if (!g || r[2] <= 0) return;
    const c = this.cfg;
    const step = g.minorMm * c.pxPerMm;
    const every = Math.max(1, Math.round(g.majorMm / g.minorMm));
    ctx.save();
    ctx.beginPath();
    ctx.rect(...r);
    ctx.clip();
    ctx.lineWidth = 1 / this.dpr;
    for (const major of [false, true]) {
      ctx.strokeStyle = major ? g.major : g.minor;
      ctx.beginPath();
      for (let k = Math.ceil((r[0] - c.x) / step); k * step <= r[0] + r[2] - c.x; k++) {
        if ((k % every === 0) !== major) continue;
        ctx.moveTo(c.x + k * step, r[1]);
        ctx.lineTo(c.x + k * step, r[1] + r[3]);
      }
      for (let k = 0; k * step <= c.height; k++) {
        if ((k % every === 0) !== major) continue;
        ctx.moveTo(r[0], c.y + k * step);
        ctx.lineTo(r[0] + r[2], c.y + k * step);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
```

In `packages/renderer/src/sweep-lane.ts` (edit 3 of 4), replace this block (it occurs exactly once):

```ts
      const lb = end - lap * c.width >= c.width ? c.width : this.snap(end - lap * c.width) + 1 / this.dpr;
      const r: Rect = [c.x + la, c.y, Math.max(0, lb - la), c.height];
      ctx.fillRect(...r);
      rects.push(r);
      a = end;
```

with:

```ts
      const lb = end - lap * c.width >= c.width ? c.width : this.snap(end - lap * c.width) + 1 / this.dpr;
      const r: Rect = [c.x + la, c.y, Math.max(0, lb - la), c.height];
      ctx.fillStyle = c.background;
      ctx.fillRect(...r);
      this.paintGrid(ctx, r);
      rects.push(r);
      a = end;
```

In `packages/renderer/src/sweep-lane.ts` (edit 4 of 4), replace this block (it occurs exactly once):

```ts
    this.lastIndex = last;
    this.lastCol = (this.cols[this.cols.length - 1] as Column).col;
    return cursor;
  }
```

with:

```ts
    this.lastIndex = last;
    this.lastCol = (this.cols[this.cols.length - 1] as Column).col;
    if (c.cursorLine) {
      // inside the band the next frame clears, so it moves with the sweep and never leaves a trail
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x + ((this.xOf(last) + c.eraseGapPx - 1) % c.width), c.y, 1 / this.dpr, c.height);
    }
    return cursor;
  }
```

- [ ] **Step 4: Run the tests and the type check**

```bash
cd packages/renderer && npx vitest run test/sweep-lane-4b.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  3 passed (3)`; the type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/sweep-lane.ts packages/renderer/test/sweep-lane-4b.test.ts
git commit -m "feat(renderer): sweep lane grid painter (RR-4) and optional cursor line (RR-3)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: MonitorCore from the plan: skin switch without restart, auto gain, overlays, worker messages

**Files:**
- Modify: `packages/renderer/src/engine.worker.ts`
- Replace: `packages/renderer/src/monitor-core.ts`
- Create: `packages/renderer/src/overlays.ts`
- Modify: `packages/renderer/src/protocol.ts`
- Modify: `packages/renderer/src/skin-plan.ts`
- Modify: `packages/renderer/src/worker-host.ts`
- Test: `packages/renderer/test/monitor-core-4b.test.ts`

**Interfaces:**
- Consumes: Tasks 14, 16, 17.
- Produces: `overlays.ts` — `DRAW_LAG_S`, `interface OverlayMark`, `class Overlays {leadsOff, push(e), due(t), clear()}`, `shows(plan, m)`, `drawMark(ctx, lane, m, plan, pxPerMm)`, `drawLeadOffDashes(ctx, lane, from, to)`; `RenderPlan` gains `paceDetect`, `devicePacer`; `MonitorCore` is replaced (same public API plus `setPlan(plan)`, `capture12()`; constants `AUTO_GAIN_*`); `protocol.ts` — `CoreOptions.plan?`, messages `plan` and `capture12`; `worker-host.ts` — `Host.capture12()`, control `plan`; `engine.worker.ts` handles both.

- [ ] **Step 1: Write the failing test**

Create `packages/renderer/test/monitor-core-4b.test.ts`:

```ts
// Stage 4b MonitorCore: skin layout (RR-1), switch without restart, auto gain (RR-2), event overlays.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { MonitorCore } from '../src/monitor-core.ts';
import { renderPlan } from '../src/skin-plan.ts';
import { FakeCtx } from './fake-ctx.ts';

function make(skin: string, engine: Record<string, unknown> = {}, cssH = 500) {
  const ctx = new FakeCtx();
  const core = new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH, dpr: 1 }, { engine: { seed: 1, device: { skin }, ...engine }, plan: renderPlan(resolveSkin(skin)) }, () => {});
  let f = 0;
  const run = (s: number) => {
    const n = Math.round(s * 60);
    for (let k = 0; k < n; k++) core.frame(1000 + (f++ * 1000) / 60);
  };
  return { core, ctx, run };
}
const cmd = (body: Record<string, unknown>) => ({ id: `c${Math.random()}`, issuedBy: 't', ...body }) as never;

describe('MonitorCore with a skin plan', () => {
  it('saadat-like lanes and chrome: II X1 NORMAL, PLETH, IBP1 200/40, IBP2 30/-10, RESP (auto-scaled, no numbers)', () => {
    const { ctx } = make('saadat-like');
    expect(ctx.texts).toEqual(['II  X1  NORMAL', 'PLETH', 'IBP1', '200', '40', 'IBP2', '30', '-10', 'RESP']);
    expect(ctx.calls.some((c) => c.op === 'fillRect' && c.style === '#000000')).toBe(true);
  });

  it('a skin switch relayouts lanes and chrome without restarting the engine', () => {
    const { core, ctx, run } = make('saadat-like');
    run(2);
    const tick = core.engine.now().tick;
    ctx.texts = [];
    core.setPlan(renderPlan(resolveSkin('philips-like')));
    expect(ctx.texts).toEqual(['II  M', 'V1  M', 'ART', '150', '0', 'PLETH', 'CO2', '40', '0']);
    run(1);
    expect(core.engine.now().tick).toBeGreaterThanOrEqual(tick + 49);
  });

  it('auto gain (RR-2): lead II (~1.4 mV p-p) in a 60 px lane settles on ×0.5 and relabels', () => {
    const { ctx, run } = make('saadat-like', {}, 300);
    ctx.texts = [];
    run(6.5);
    expect(ctx.texts).toContain('II  X0.5  NORMAL');
  });

  it('zoll-like: TCP pace marks and sync markers in the foreground colour, a shock mark with its energy', () => {
    const { core, ctx, run } = make('zoll-like');
    run(1);
    core.command(cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'fixed', ratePpm: 80, mA: 100 } }));
    ctx.clear();
    run(3);
    const white = () => ctx.calls.filter((c) => c.op === 'stroke' && c.style === '#FFFFFF').length;
    expect(white()).toBeGreaterThanOrEqual(3); // 80 ppm for 3 s on the one ECG lane (the last spike may still be in the lag)
    core.command(cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode: 'off' } }));
    core.command(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'syncOn' } }));
    core.command(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } }));
    run(6);
    ctx.clear();
    ctx.texts = [];
    run(2);
    expect(white()).toBeGreaterThanOrEqual(2);
    core.command(cmd({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } }));
    run(1.5);
    expect(ctx.texts).toContain('120 J');
  });

  it('philips-like draws no pace marks for a paced rhythm (pace detect off), lead-off draws a dashed baseline', () => {
    const { core, ctx, run } = make('philips-like', { patient: { rhythm: { id: 'pacedVVI' } } });
    run(2);
    ctx.clear();
    run(2);
    expect(ctx.calls.some((c) => c.op === 'stroke' && c.style === '#FFFFFF')).toBe(false);
    core.command(cmd({ type: 'attachSensor', sensor: 'ecg', state: 'off' }));
    run(1);
    ctx.clear();
    run(1);
    const base = 0.6 * 100; // lane 0: 500 px / 5 lanes, baseline 0.6
    const dashes = ctx.calls.filter((c, i) => {
      const prev = ctx.calls[i - 1];
      return c.op === 'lineTo' && c.args[1] === base && prev?.op === 'moveTo' && (c.args[0] as number) - (prev.args[0] as number) <= 6.01;
    });
    expect(dashes.length).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd packages/renderer && npx vitest run test/monitor-core-4b.test.ts test/monitor-core.test.ts; cd -`
Expected: FAIL — `setPlan` is not a function; `CoreOptions.plan` ignored (the saadat-like texts come out as `II  M`)

- [ ] **Step 3: Implement**

In `packages/renderer/src/engine.worker.ts`, replace this block (it occurs exactly once):

```ts
        else scope.postMessage({ type: 'error', message: 'not initialised' });
        return;
      case 'restore':
        try {
```

with:

```ts
        else scope.postMessage({ type: 'error', message: 'not initialised' });
        return;
      case 'plan': // Stage 4b
        core?.setPlan(m.plan);
        return;
      case 'capture12': // Stage 4b: the 12 lead arrays are transferred, not copied
        try {
          if (!core) throw new Error('not initialised');
          const capture = core.capture12();
          (scope.postMessage as (msg: FromWorker, transfer: Transferable[]) => void)(
            { type: 'capture12', reqId: m.reqId, capture },
            Object.values(capture.leads).map((a) => a.buffer),
          );
        } catch (err) {
          scope.postMessage({ type: 'capture12', reqId: m.reqId, error: err instanceof Error ? err.message : String(err) });
        }
        return;
      case 'restore':
        try {
```

Replace the whole of `packages/renderer/src/monitor-core.ts` with:

```ts
// Engine + sweep lanes + static chrome, driven by frame timestamps. Runs inside the worker (OffscreenCanvas)
// or on the main thread (fallback) unchanged (brief §3.4). The clock is sim time from an accumulator
// (engine-core Clock), and lanes draw at clock.renderT, so sweep speed is independent of frame rate.
// Stage 4b: the layout comes from a RenderPlan (skin-plan.ts; requests RR-1..RR-4), a skin switch relayouts without
// restarting the engine, ECG lanes can auto-gain (RR-2), and event overlays (pace, sync, shock, lead-off) are drawn.
import { capture12, Clock, createEngine, type Capture12, type Command, type DispatchResult, type EngineEvent, type LeadId, type MonitorEngine } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM } from './calibration.ts';
import type { Ctx2D } from './ctx.ts';
import { drawLeadOffDashes, drawMark, Overlays, shows } from './overlays.ts';
import type { ClockAnchor, CoreOptions, Size } from './protocol.ts';
import { ecgLabel, legacyPlan, type PlanLane, type RenderPlan } from './skin-plan.ts';
import { SweepLane } from './sweep-lane.ts';
import { autoRange, scaleFor } from './wave-lanes.ts'; // Stage 2

export const THEME = { background: '#000', ecg: '#00ff66', label: '#00ff66', grid: '#222' } as const; // Stage 1 look (legacyPlan)
export const LABEL_W = 56; // CSS px reserved at the left of each lane for chrome
const EVENT_POST_MS = 250; // post the clock anchor at least this often even without events
/** Auto gain (RR-2) [ENG]: every 2 s the last 4 s of the lead should fill ≤ 60 % of the lane height. */
export const AUTO_GAIN_EVERY_S = 2;
export const AUTO_GAIN_WINDOW_S = 4;
export const AUTO_GAIN_FILL = 0.6;

export interface CanvasTarget {
  width: number;
  height: number;
}

export class MonitorCore {
  readonly engine: MonitorEngine;
  readonly clock = new Clock();
  private lanes: SweepLane[] = [];
  private plan: RenderPlan;
  private waveLive: boolean[] = []; // Stage 2: the channel had samples on the last frame
  private autoRangeT: number[] = []; // Stage 2 (4b: per lane): sim time of the last auto-scale
  private readonly plethScratch = new Float32Array(500); // Stage 2
  private readonly gainScratch = new Float32Array(AUTO_GAIN_WINDOW_S * 500);
  private autoGainT = -Infinity;
  private gainMult: number[] = []; // per lane, ECG gain multiplier (label and auto gain)
  private readonly overlays = new Overlays();
  private size: Size;
  private pxPerMm: number;
  private fps: 60 | 30;
  private filterMode = 'monitor';
  private lastEpoch: number | null = null;
  private parity = 0;
  private batch: EngineEvent[] = [];
  private lastPost = -Infinity;
  private visible = true;
  private readonly canvas: CanvasTarget;
  private readonly ctx: Ctx2D;
  private readonly post: (anchor: ClockAnchor, events: EngineEvent[]) => void;

  constructor(
    canvas: CanvasTarget,
    ctx: Ctx2D,
    size: Size,
    opts: CoreOptions,
    post: (anchor: ClockAnchor, events: EngineEvent[]) => void,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.post = post;
    this.engine = createEngine(opts.engine ?? {});
    this.plan = opts.plan ?? legacyPlan(opts.lanes ?? ['ecgII', 'V5'], opts.waves ?? []);
    this.pxPerMm = opts.pxPerMm ?? DEFAULT_PX_PER_MM;
    this.fps = opts.fps ?? 60;
    this.size = size;
    this.sendLeads();
    this.engine.on((e) => {
      this.batch.push(e);
      this.overlays.push(e);
    });
    this.layout();
  }

  /** The ECG lanes' leads, in order. */
  private get leads(): LeadId[] {
    return this.plan.lanes.filter((l) => l.kind === 'ecg').map((l) => l.channel as LeadId);
  }

  /** The engine computes one filtered buffer per ECG lane (≤ 3). */
  private sendLeads(): void {
    this.leads.slice(0, 3).forEach((lead, lane) =>
      this.engine.dispatch({ id: `init-lead-${lane}-${this.plan.skin}`, issuedBy: 'renderer', type: 'device', action: { device: 'ecg', action: 'lead', value: lead, lane } }),
    );
  }

  /** Stage 4b: switch skin/page/theme: new lanes and chrome, same engine (no restart, tick continuity). */
  setPlan(plan: RenderPlan): void {
    this.plan = plan;
    this.overlays.clear();
    this.sendLeads();
    this.layout();
  }

  /** Stage 4b: the 12-lead capture of the last 10 s (brief §6.6). */
  capture12(): Capture12 {
    return capture12(this.engine);
  }

  /** Apply a command (lane/filter changes also update the chrome). */
  command(cmd: Command): DispatchResult {
    const r = this.engine.dispatch(cmd);
    if (r.accepted && cmd.type === 'device' && cmd.action.device === 'ecg') {
      // Only what changed is redrawn: a filter change touches the chrome, a lead change one lane (review L3).
      const ecgLanes = this.ecgLaneIndices();
      if (cmd.action.action === 'filter') {
        this.filterMode = String(cmd.action.value);
        this.drawChrome(ecgLanes);
      } else if (cmd.action.action === 'lead' && typeof cmd.action.lane === 'number' && cmd.action.lane < ecgLanes.length) {
        const i = ecgLanes[cmd.action.lane] as number;
        (this.plan.lanes[i] as PlanLane).channel = cmd.action.value as LeadId;
        this.lanes[i]?.reset(this.ctx);
        this.drawChrome([i]);
      } else this.layout();
    }
    return r;
  }

  resize(size: Size): void {
    this.size = size;
    this.layout();
  }

  calibrate(pxPerMm: number): void {
    this.pxPerMm = pxPerMm;
    this.layout();
  }

  setFps(fps: 60 | 30): void {
    this.fps = fps;
  }

  setVisible(v: boolean): void {
    this.visible = v;
  }

  /**
   * Hidden tab (brief §3.3): advance sim time by the FULL wall delta (no 250 ms clamp), without drawing.
   * The lanes restart cleanly on the next drawn frame because the jump exceeds one lane.
   */
  catchUp(epochMs: number): void {
    const dt = this.lastEpoch === null ? 0 : Math.max(0, epochMs - this.lastEpoch);
    this.lastEpoch = epochMs;
    if (this.clock.paused || dt === 0) return;
    if (this.clock.advanceUnclamped(dt) > 0) this.engine.advanceTo(this.clock.simT); // remainder carried (review L1)
    // Post what was generated while hidden, so the batch does not grow without frames (review L2).
    this.post({ simT: this.clock.renderT, epochMs, timeScale: this.clock.timeScale }, this.batch);
    this.batch = [];
    this.lastPost = epochMs;
    this.overlays.due(this.clock.renderT); // marks from the hidden stretch are not drawn
  }

  /** One animation frame. `epochMs` = performance.timeOrigin + frame timestamp (ms). */
  frame(epochMs: number): void {
    if (this.fps === 30 && this.parity++ % 2 === 1) return; // 30 fps mode: skip every other frame
    const dt = this.lastEpoch === null ? 0 : epochMs - this.lastEpoch;
    this.lastEpoch = epochMs;
    const ticks = this.clock.advance(dt);
    if (ticks > 0) this.engine.advanceTo(this.clock.simT);
    const t = this.clock.renderT;
    if (this.visible) {
      if (t - this.autoGainT >= AUTO_GAIN_EVERY_S) this.autoGain(t);
      this.plan.lanes.forEach((pl, i) => {
        const lane = this.lanes[i] as SweepLane;
        if (pl.kind === 'wave') return this.drawWave(pl, i, t);
        const before = lane.lastDrawnIndex;
        lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(pl.channel as LeadId, from, out));
        if (this.overlays.leadsOff && before >= 0) drawLeadOffDashes(this.ctx, lane, before, lane.lastDrawnIndex);
      });
      const marks = this.overlays.due(t);
      for (const m of marks) {
        if (!shows(this.plan, m)) continue;
        for (const i of this.ecgLaneIndices()) drawMark(this.ctx, this.lanes[i] as SweepLane, m, this.plan, this.pxPerMm);
      }
    }
    if (this.batch.length > 0 || epochMs - this.lastPost >= EVENT_POST_MS) {
      this.post({ simT: t, epochMs, timeScale: this.clock.timeScale }, this.batch);
      this.batch = [];
      this.lastPost = epochMs;
    }
  }

  private ecgLaneIndices(): number[] {
    const out: number[] = [];
    this.plan.lanes.forEach((l, i) => l.kind === 'ecg' && out.push(i));
    return out;
  }

  /** RR-2: pick the largest skin gain whose last-4-s peak-to-peak fits AUTO_GAIN_FILL of the lane. */
  private autoGain(t: number): void {
    this.autoGainT = t;
    const changed: number[] = [];
    this.plan.lanes.forEach((pl, i) => {
      if (!pl.autoGain || pl.gainOptions.length === 0 || t < AUTO_GAIN_WINDOW_S) return;
      const n = this.engine.readSamples(pl.channel as LeadId, Math.floor((t - AUTO_GAIN_WINDOW_S) * 500), this.gainScratch);
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = 0; k < n; k++) {
        const v = this.gainScratch[k] as number;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (!(hi > lo)) return;
      const lane = this.lanes[i] as SweepLane;
      const fits = pl.gainOptions.filter((g) => (hi - lo) * g * 10 * this.pxPerMm <= AUTO_GAIN_FILL * lane.cfg.height).sort((a, b) => b - a);
      const g = fits[0] ?? Math.min(...pl.gainOptions);
      if (g !== this.gainMult[i]) {
        this.gainMult[i] = g;
        lane.cfg.gainMmPerMv = g * 10;
        changed.push(i);
      }
    });
    if (changed.length > 0) this.drawChrome(changed);
  }

  /** Stage 2 wave lanes (125 Hz; Stage 4b: any channel the plan names), auto-scaled pleth, cleared on 'none'. */
  private drawWave(pl: PlanLane, i: number, t: number): void {
    const lane = this.lanes[i] as SweepLane;
    const ch = pl.channel;
    const live = ch !== null && this.engine.latestSampleIndex(ch) >= 0;
    if (!live || ch === null) {
      if (this.waveLive[i]) lane.reset(this.ctx);
      this.waveLive[i] = false;
      return;
    }
    this.waveLive[i] = true;
    if (pl.range === null && t - (this.autoRangeT[i] ?? -1) >= 1) {
      this.autoRangeT[i] = t;
      const rate = this.engine.sampleRate(ch);
      const n = this.engine.readSamples(ch, Math.floor((t - 4) * rate), this.plethScratch);
      const [lo, hi] = autoRange(this.plethScratch, n);
      Object.assign(lane.cfg, scaleFor(lo, hi, lane.cfg.height, this.pxPerMm));
    }
    lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(ch, from, out));
  }

  private layout(): void {
    const { cssW, cssH, dpr } = this.size;
    const p = this.plan;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = p.background;
    this.ctx.fillRect(0, 0, cssW, cssH);
    const h = cssH / Math.max(1, p.lanes.length);
    this.gainMult = p.lanes.map((l) => l.gainMmPerMv / 10);
    this.lanes = p.lanes.map((pl, i) => {
      const rate = pl.kind === 'ecg' ? 500 : pl.channel ? this.engine.sampleRate(pl.channel) : 125;
      const [lo, hi] = pl.range ?? [-0.5, 3];
      const lane = new SweepLane(
        {
          x: LABEL_W, y: i * h, width: cssW - LABEL_W, height: h, rate, mmPerS: pl.mmPerS, pxPerMm: this.pxPerMm, color: pl.color,
          background: p.background, lineWidth: p.lineWidth, eraseGapPx: p.eraseGapPx, grid: p.grid, cursorLine: p.cursorLine,
          ...(pl.kind === 'ecg' ? { baseline: 0.6, gainMmPerMv: pl.gainMmPerMv } : scaleFor(lo, hi, h, this.pxPerMm)),
        },
        dpr,
      );
      lane.reset(this.ctx, dpr);
      return lane;
    });
    this.waveLive = p.lanes.map(() => false);
    this.autoRangeT = p.lanes.map(() => -1);
    this.autoGainT = -Infinity;
    this.drawChrome(p.lanes.map((_, i) => i));
  }

  /** Static chrome (brief §3.5): ECG lead label + gain + filter and the 1 mV bar; wave label and scale. */
  private drawChrome(lanes: number[]): void {
    const ctx = this.ctx;
    const p = this.plan;
    const h = this.size.cssH / Math.max(1, p.lanes.length);
    for (const i of lanes) {
      ctx.fillStyle = p.background;
      ctx.fillRect(0, i * h, LABEL_W, h);
    }
    ctx.font = `14px ${p.font}`;
    ctx.textBaseline = 'top';
    for (const i of lanes) {
      const pl = p.lanes[i] as PlanLane;
      const y0 = i * h;
      ctx.fillStyle = pl.color;
      ctx.strokeStyle = pl.color;
      if (pl.kind === 'wave') {
        ctx.fillText(pl.label, 6, y0 + 6);
        if (pl.range && !p.hideScaleNumbers) {
          ctx.fillText(String(pl.range[1]), 6, y0 + 24);
          ctx.fillText(String(pl.range[0]), 6, y0 + h - 18);
        }
        continue;
      }
      const filterName = p.filterNames[this.filterMode] ?? this.filterMode.replace('band:', '');
      ctx.fillText(ecgLabel(pl.label, pl.channel as LeadId, this.gainMult[i] ?? 1, p.gainLabel, filterName), 6, y0 + 6);
      const base = y0 + 0.6 * h;
      const mv = Math.min(0.5 * h, (this.gainMult[i] ?? 1) * 10 * this.pxPerMm); // 1 mV at the lane gain
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(14, base);
      ctx.lineTo(24, base);
      ctx.lineTo(24, base - mv);
      ctx.lineTo(36, base - mv);
      ctx.lineTo(36, base);
      ctx.lineTo(46, base);
      ctx.stroke();
    }
  }
}
```

Create `packages/renderer/src/overlays.ts`:

```ts
// Event overlays on the ECG lanes (brief §3.5 step 5; research/05 §2.6): pace marks, sync markers, shock marks and
// lead-off dashes. They are drawn from EVENTS, never from samples, a little behind the cursor (so the next frame's
// erase band does not take them) and the erase bar removes them on the next lap, like the trace.
import type { EngineEvent } from '@pme/engine-core';
import type { Ctx2D } from './ctx.ts';
import type { RenderPlan } from './skin-plan.ts';
import type { SweepLane } from './sweep-lane.ts';

/** Marks are drawn once the render time is this far past them [ENG]: ≥ 4 px behind the cursor at 25 mm/s. */
export const DRAW_LAG_S = 0.05;
const DASH_PX = 6;

export interface OverlayMark {
  t: number;
  kind: 'pace' | 'sync' | 'shock';
  tcp?: boolean;
  label?: string;
}

export class Overlays {
  private queue: OverlayMark[] = [];
  leadsOff = false;

  /** Watch the engine event stream. */
  push(e: EngineEvent): void {
    if (e.type === 'marker') {
      if (e.kind === 'paceSpike') this.add({ t: e.t, kind: 'pace', tcp: e.data?.tcp === true });
      else if (e.kind === 'syncR') this.add({ t: e.t, kind: 'sync' });
      else if (e.kind === 'shock') this.add({ t: (e.data?.atS as number | undefined) ?? e.t, kind: 'shock', label: `${String(e.data?.energyJ ?? '')} J` });
    } else if (e.type === 'alarm' && e.id === 'ecgLeadsOff' && e.level !== undefined) {
      if (e.state === 'raised') this.leadsOff = true;
      if (e.state === 'cleared') this.leadsOff = false;
    }
  }

  private add(m: OverlayMark): void {
    let i = this.queue.length;
    while (i > 0 && (this.queue[i - 1] as OverlayMark).t > m.t) i--;
    this.queue.splice(i, 0, m);
  }

  /** Marks whose time has come at render time t (removed from the queue). */
  due(t: number): OverlayMark[] {
    let n = 0;
    while (n < this.queue.length && (this.queue[n] as OverlayMark).t <= t - DRAW_LAG_S) n++;
    return this.queue.splice(0, n);
  }

  clear(): void {
    this.queue = [];
  }
}

/** Does this plan draw this mark at all? */
export function shows(plan: RenderPlan, m: OverlayMark): boolean {
  if (m.kind === 'pace') return plan.paceDetect || (m.tcp === true && plan.devicePacer);
  if (m.kind === 'sync') return plan.syncMarker !== null;
  return true;
}

function vline(ctx: Ctx2D, x: number, y0: number, y1: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.stroke();
}

/** Draw one mark on one ECG lane (inside the lane rectangle). */
export function drawMark(ctx: Ctx2D, lane: SweepLane, m: OverlayMark, plan: RenderPlan, pxPerMm: number): void {
  const c = lane.cfg;
  const x = c.x + (lane.xOf(m.t * c.rate) % c.width);
  const base = c.y + c.baseline * c.height;
  const clampY = (y: number) => Math.min(c.y + c.height, Math.max(c.y, y));
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x, c.y, c.width, c.height);
  ctx.clip();
  ctx.strokeStyle = plan.foreground;
  ctx.fillStyle = plan.foreground;
  ctx.lineWidth = 1.5;
  if (m.kind === 'pace') {
    const h = plan.paceMarker.heightMm * pxPerMm;
    // vertical-line: a 1 cm line through the baseline (saadat-like); marker-above: a short mark near the lane top
    if (plan.paceMarker.style === 'vertical-line') vline(ctx, x, clampY(base - h / 2), clampY(base + h / 2));
    else vline(ctx, x, c.y + 4, c.y + 4 + h);
  } else if (m.kind === 'sync') {
    const s = 5;
    if (plan.syncMarker === 'line') vline(ctx, x, c.y + 4, c.y + 0.3 * c.height);
    else {
      // triangle-mid-qrs (LIFEPAK-like) at the baseline, r-above (ZOLL-like) near the top: an outlined ▼
      const y = plan.syncMarker === 'triangle-mid-qrs' ? base - s : c.y + 4;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + 1.6 * s);
      ctx.lineTo(x - s, y);
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = 2.5;
    vline(ctx, x, c.y, c.y + c.height);
    ctx.font = `12px ${plan.font}`;
    ctx.textBaseline = 'top';
    ctx.fillText(m.label ?? 'SHOCK', x + 4, c.y + 4);
  }
  ctx.restore();
}

/** Lead-off (brief §6.2 "flat dashed trace"): repaint the samples just drawn as a dashed baseline. */
export function drawLeadOffDashes(ctx: Ctx2D, lane: SweepLane, fromIdx: number, toIdx: number): void {
  if (toIdx <= fromIdx) return;
  const c = lane.cfg;
  const x0 = lane.xOf(fromIdx + 1);
  const x1 = lane.xOf(toIdx) + 1;
  const base = c.y + c.baseline * c.height;
  ctx.save();
  ctx.beginPath();
  ctx.rect(c.x, c.y, c.width, c.height);
  ctx.clip();
  ctx.strokeStyle = c.color;
  ctx.lineWidth = c.lineWidth;
  for (let a = x0; a < x1; ) {
    const lap = Math.floor(a / c.width);
    const end = Math.min(x1, (lap + 1) * c.width);
    ctx.fillStyle = c.background;
    ctx.fillRect(c.x + a - lap * c.width, c.y, end - a, c.height);
    ctx.beginPath();
    for (let d = Math.floor(a / (2 * DASH_PX)) * 2 * DASH_PX; d < end; d += 2 * DASH_PX) {
      const s0 = Math.max(a, d);
      const s1 = Math.min(end, d + DASH_PX);
      if (s1 <= s0) continue;
      ctx.moveTo(c.x + s0 - lap * c.width, base);
      ctx.lineTo(c.x + s1 - lap * c.width, base);
    }
    ctx.stroke();
    a = end;
  }
  ctx.restore();
}
```

In `packages/renderer/src/protocol.ts` (edit 1 of 4), replace this block (it occurs exactly once):

```ts
// Messages between the main thread and the engine+renderer worker (brief §3.4). Raw samples never cross.
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId, PatientSnapshot } from '@pme/engine-core';
import type { WaveLaneId } from './wave-lanes.ts'; // Stage 2
```

with:

```ts
// Messages between the main thread and the engine+renderer worker (brief §3.4). Raw samples never cross.
import type { Capture12, Command, DispatchResult, EngineEvent, EngineOptions, LeadId, PatientSnapshot } from '@pme/engine-core';
import type { RenderPlan } from './skin-plan.ts'; // Stage 4b
import type { WaveLaneId } from './wave-lanes.ts'; // Stage 2
```

In `packages/renderer/src/protocol.ts` (edit 2 of 4), replace this block (it occurs exactly once):

```ts
  pxPerMm?: number;
  fps?: 60 | 30;
}
```

with:

```ts
  pxPerMm?: number;
  fps?: 60 | 30;
  /** Stage 4b: the skin's lane layout (skin-plan.ts); when present, `lanes`/`waves` are ignored. */
  plan?: RenderPlan;
}
```

In `packages/renderer/src/protocol.ts` (edit 3 of 4), replace this block (it occurs exactly once):

```ts
  // Renderer request R-1 (ruling R25): engine snapshot/restore through the worker.
  | { type: 'snapshot'; reqId: number }
  | { type: 'restore'; reqId: number; snapshot: PatientSnapshot };

export type FromWorker =
```

with:

```ts
  // Renderer request R-1 (ruling R25): engine snapshot/restore through the worker.
  | { type: 'snapshot'; reqId: number }
  | { type: 'restore'; reqId: number; snapshot: PatientSnapshot }
  // Stage 4b: skin switch without restart, and the 12-lead capture
  | { type: 'plan'; plan: RenderPlan }
  | { type: 'capture12'; reqId: number };

export type FromWorker =
```

In `packages/renderer/src/protocol.ts` (edit 4 of 4), replace this block (it occurs exactly once):

```ts
  | { type: 'error'; message: string }
  | { type: 'snapshot'; reqId: number; snapshot: PatientSnapshot }
  | { type: 'restored'; reqId: number; error?: string };
```

with:

```ts
  | { type: 'error'; message: string }
  | { type: 'snapshot'; reqId: number; snapshot: PatientSnapshot }
  | { type: 'restored'; reqId: number; error?: string }
  | { type: 'capture12'; reqId: number; capture?: Capture12; error?: string }; // Stage 4b
```

In `packages/renderer/src/skin-plan.ts` (edit 1 of 5), replace this block (it occurs exactly once):

```ts
  /** ECG gain multipliers (of 10 mm/mV) auto-gain may choose from. */
  gainOptions: number[];
  /** Wave scale [lo, hi] (mmHg; CO2 mmHg); null = auto-scale (pleth). */
  range: [number, number] | null;
  /** Static label (waves) or the template for ECG lanes: '{lead}  X{gain}  {FILTER}'. */
```

with:

```ts
  /** ECG gain multipliers (of 10 mm/mV) auto-gain may choose from. */
  gainOptions: number[];
  /** Wave scale [lo, hi] (mmHg; CO2 mmHg); null = auto-scale (pleth, impedance resp). */
  range: [number, number] | null;
  /** Static label (waves) or the template for ECG lanes: '{lead}  X{gain}  {FILTER}'. */
```

In `packages/renderer/src/skin-plan.ts` (edit 2 of 5), replace this block (it occurs exactly once):

```ts
  filterNames: Record<string, string>;
  paceMarker: Skin['ecg']['paceMarker'];
  syncMarker: Skin['syncMarker'];
  hideScaleNumbers: boolean;
```

with:

```ts
  filterNames: Record<string, string>;
  paceMarker: Skin['ecg']['paceMarker'];
  /** Draw implanted-pacemaker spikes (skin `ecg.paceDetectDefault`, brief §6.5 saadat-like PACE DETECT). */
  paceDetect: boolean;
  /** The skin is a defibrillator/pacer, so its own TCP pulses are always marked (research/05 §2.6 LIFEPAK 15). */
  devicePacer: boolean;
  syncMarker: Skin['syncMarker'];
  hideScaleNumbers: boolean;
```

In `packages/renderer/src/skin-plan.ts` (edit 3 of 5), replace this block (it occurs exactly once):

```ts
    const sc = scaleKey ? s.ibp.scales[scaleKey] : undefined;
    const range: [number, number] | null =
      id === 'PLETH' ? null : id === 'CO2' ? [0, s.co2.scaleUnit === '%' ? (s.co2.scale * 760) / 100 : s.co2.scale] : id === 'RESP' ? [-1, 1] : sc ? [sc[0], sc[2]] : [0, 150];
    return { id, kind: 'wave', channel: WAVE_CHANNEL[id] ?? null, color, mmPerS, gainMmPerMv: 10, autoGain: false, gainOptions: [], range, label: id === 'PLETH' ? 'PLETH' : id };
  });
```

with:

```ts
    const sc = scaleKey ? s.ibp.scales[scaleKey] : undefined;
    const range: [number, number] | null =
      id === 'PLETH' || id === 'RESP' ? null : id === 'CO2' ? [0, s.co2.scaleUnit === '%' ? (s.co2.scale * 760) / 100 : s.co2.scale] : sc ? [sc[0], sc[2]] : [0, 150];
    return { id, kind: 'wave', channel: WAVE_CHANNEL[id] ?? null, color, mmPerS, gainMmPerMv: 10, autoGain: false, gainOptions: [], range, label: id === 'PLETH' ? 'PLETH' : id };
  });
```

In `packages/renderer/src/skin-plan.ts` (edit 4 of 5), replace this block (it occurs exactly once):

```ts
    filterNames,
    paceMarker: s.ecg.paceMarker,
    syncMarker: s.syncMarker,
    hideScaleNumbers: pg?.pump?.hideScaleNumbers ?? false,
```

with:

```ts
    filterNames,
    paceMarker: s.ecg.paceMarker,
    paceDetect: s.ecg.paceDetectDefault,
    devicePacer: s.pacer !== null,
    syncMarker: s.syncMarker,
    hideScaleNumbers: pg?.pump?.hideScaleNumbers ?? false,
```

In `packages/renderer/src/skin-plan.ts` (edit 5 of 5), replace this block (it occurs exactly once):

```ts
    skin: 'legacy', background: '#000', foreground: '#00ff66', lineWidth: 1.75, eraseGapPx: 16, cursorLine: false, grid: null,
    font: 'system-ui, sans-serif', gainLabel: 'mm-per-mV', filterNames: { monitor: 'M', diagnostic: 'D' },
    paceMarker: { style: 'marker-above', heightMm: 2 }, syncMarker: 'line', hideScaleNumbers: false, lanes: [...ecg, ...wv],
  };
}
```

with:

```ts
    skin: 'legacy', background: '#000', foreground: '#00ff66', lineWidth: 1.75, eraseGapPx: 16, cursorLine: false, grid: null,
    font: 'system-ui, sans-serif', gainLabel: 'mm-per-mV', filterNames: { monitor: 'M', diagnostic: 'D' },
    paceMarker: { style: 'marker-above', heightMm: 2 }, paceDetect: false, devicePacer: false, syncMarker: null, hideScaleNumbers: false,
    lanes: [...ecg, ...wv],
  };
}
```

In `packages/renderer/src/worker-host.ts` (edit 1 of 7), replace this block (it occurs exactly once):

```ts
// MonitorCore on the main thread otherwise. Frame pump: the worker's own rAF if it has one, else the main
// thread posts every rAF timestamp. While the tab is hidden a 1 s interval advances sim time in bulk.
import type { Command, DispatchResult, EngineEvent, PatientSnapshot } from '@pme/engine-core';
import EngineWorker from './engine.worker.ts?worker&inline';
import type { Ctx2D } from './ctx.ts';
```

with:

```ts
// MonitorCore on the main thread otherwise. Frame pump: the worker's own rAF if it has one, else the main
// thread posts every rAF timestamp. While the tab is hidden a 1 s interval advances sim time in bulk.
import type { Capture12, Command, DispatchResult, EngineEvent, PatientSnapshot } from '@pme/engine-core';
import EngineWorker from './engine.worker.ts?worker&inline';
import type { Ctx2D } from './ctx.ts';
```

In `packages/renderer/src/worker-host.ts` (edit 2 of 7), replace this block (it occurs exactly once):

```ts
export type RenderPath = 'worker-raf' | 'worker-pump' | 'main';
export type EventsHandler = (anchor: ClockAnchor, events: EngineEvent[]) => void;
export type ControlMsg = Extract<ToWorker, { type: 'resize' | 'timeScale' | 'pause' | 'resume' | 'fps' | 'calibrate' }>;

export const READY_TIMEOUT_MS = 2000;
```

with:

```ts
export type RenderPath = 'worker-raf' | 'worker-pump' | 'main';
export type EventsHandler = (anchor: ClockAnchor, events: EngineEvent[]) => void;
export type ControlMsg = Extract<ToWorker, { type: 'resize' | 'timeScale' | 'pause' | 'resume' | 'fps' | 'calibrate' | 'plan' }>; // Stage 4b: plan

export const READY_TIMEOUT_MS = 2000;
```

In `packages/renderer/src/worker-host.ts` (edit 3 of 7), replace this block (it occurs exactly once):

```ts
  /** Restore the engine and put the sim clock at the snapshot's tick (R-1). */
  restore(s: PatientSnapshot): Promise<void>;
  destroy(): void;
}
```

with:

```ts
  /** Restore the engine and put the sim clock at the snapshot's tick (R-1). */
  restore(s: PatientSnapshot): Promise<void>;
  /** Stage 4b: the last 10 s as a 12-lead capture (brief §6.6). */
  capture12(): Promise<Capture12>;
  destroy(): void;
}
```

In `packages/renderer/src/worker-host.ts` (edit 4 of 7), replace this block (it occurs exactly once):

```ts
      else if (m.type === 'resume') core.clock.resume();
      else if (m.type === 'fps') core.setFps(m.fps);
      else core.calibrate(m.pxPerMm);
    },
    destroy: () => {
      cancelAnimationFrame(raf);
```

with:

```ts
      else if (m.type === 'resume') core.clock.resume();
      else if (m.type === 'fps') core.setFps(m.fps);
      else if (m.type === 'plan') core.setPlan(m.plan); // Stage 4b
      else core.calibrate(m.pxPerMm);
    },
    capture12: () => Promise.resolve().then(() => core.capture12()), // Stage 4b
    destroy: () => {
      cancelAnimationFrame(raf);
```

In `packages/renderer/src/worker-host.ts` (edit 5 of 7), replace this block (it occurs exactly once):

```ts
  const snapshots = new Map<number, (s: PatientSnapshot) => void>();
  const restores = new Map<number, { resolve: () => void; reject: (e: Error) => void }>();
  let reqId = 0;
  let raf = 0;
```

with:

```ts
  const snapshots = new Map<number, (s: PatientSnapshot) => void>();
  const restores = new Map<number, { resolve: () => void; reject: (e: Error) => void }>();
  const captures = new Map<number, { resolve: (c: Capture12) => void; reject: (e: Error) => void }>(); // Stage 4b
  let reqId = 0;
  let raf = 0;
```

In `packages/renderer/src/worker-host.ts` (edit 6 of 7), replace this block (it occurs exactly once):

```ts
        if (m.error === undefined) r?.resolve();
        else r?.reject(new Error(m.error));
      } else {
        clearTimeout(timer);
```

with:

```ts
        if (m.error === undefined) r?.resolve();
        else r?.reject(new Error(m.error));
      } else if (m.type === 'capture12') {
        const c = captures.get(m.reqId);
        captures.delete(m.reqId);
        if (m.capture) c?.resolve(m.capture);
        else c?.reject(new Error(m.error ?? 'capture12 failed'));
      } else {
        clearTimeout(timer);
```

In `packages/renderer/src/worker-host.ts` (edit 7 of 7), replace this block (it occurs exactly once):

```ts
      }),
    control: (m) => post(m),
    destroy: () => {
      cancelAnimationFrame(raf);
```

with:

```ts
      }),
    control: (m) => post(m),
    capture12: () =>
      new Promise<Capture12>((resolve, reject) => {
        const id = ++reqId;
        captures.set(id, { resolve, reject });
        post({ type: 'capture12', reqId: id });
      }),
    destroy: () => {
      cancelAnimationFrame(raf);
```

- [ ] **Step 4: Run the tests and the type check**

```bash
cd packages/renderer && npx vitest run test/monitor-core-4b.test.ts test/monitor-core.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  17 passed (17)`; the type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/engine.worker.ts packages/renderer/src/monitor-core.ts packages/renderer/src/overlays.ts packages/renderer/src/protocol.ts packages/renderer/src/skin-plan.ts packages/renderer/src/worker-host.ts packages/renderer/test/monitor-core-4b.test.ts
git commit -m "feat(renderer): MonitorCore draws from the skin plan — setPlan without restart, auto gain (RR-2), pace/sync/shock/lead-off overlays" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: Alarm header/tile views and the alarm-audio bridge (E-4a-3)

**Files:**
- Create: `packages/renderer/src/alarm-audio.ts`
- Create: `packages/renderer/src/alarm-view.ts`
- Test: `packages/renderer/test/alarm-audio.test.ts`
- Test: `packages/renderer/test/alarm-view.test.ts`

**Interfaces:**
- Consumes: `alarmStatus` (Task 7), `ResolvedSkin`, `AlarmSounder`/`ToneScheduler` (Stage 4a).
- Produces: `alarm-view.ts` — `type AlarmStatus`, `ROTATE_S`, `interface BarView`, `visibleAlarms(st, r, t, pump?)`, `barView(st, r, t, pump?)`, `TILE_NUMERICS`, `interface TileAlarmView`, `tileAlarmView(param, st, r, t, pump?)`; `alarm-audio.ts` — `interface SounderLike`, `class AlarmAudioBridge {onStatus(st)}`.

- [ ] **Step 1: Write the failing tests**

Create `packages/renderer/test/alarm-audio.test.ts`:

```ts
// Only the highest-priority alarm is audible (fake audio clock); silence and a new Saadat-like alarm behave as the
// engine says (brief §6.4.1).
import { describe, expect, it } from 'vitest';
import { AlarmSounder, IEC_STYLE, SAADAT, ToneScheduler, type AlarmSoundProfile, type AlarmToneRequest } from '@pme/audio';
import { AlarmAudioBridge } from '../src/alarm-audio.ts';
import type { AlarmStatus } from '../src/alarm-view.ts';

function rig(profile: AlarmSoundProfile) {
  let now = 0;
  const played: AlarmToneRequest[] = [];
  const sched = new ToneScheduler({
    audioNow: () => now,
    perfToAudio: (ms) => ms / 1000,
    outputLatency: () => 0,
    play: (tone) => {
      played.push(tone as AlarmToneRequest);
      return { stop: () => undefined };
    },
  });
  sched.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 1 });
  const sounder = new AlarmSounder(sched, profile);
  const bridge = new AlarmAudioBridge(sounder);
  const run = (t: number) => {
    while (now < t - 1e-9) {
      now = Math.min(t, now + 0.025);
      sounder.pump(now);
      sched.pump();
    }
  };
  return { bridge, played, run };
}
const entry = (id: string, level: 1 | 2 | 3, acked = false) => ({ id, level, category: 'physiological' as const, text: id, since: 0, latched: false, acked });
const st = (t: number, active: ReturnType<typeof entry>[], silencedUntil: number | null = null): AlarmStatus => ({
  type: 'alarmStatus', t, skin: 'x', ageBand: 'adult', active, silencedUntil, pausedUntil: null, limits: {}, allOff: false, arrhythmiaAnalysis: false, volume: 5,
});

describe('alarm audio bridge', () => {
  it('only the highest priority sounds: a medium train stops when a high alarm is raised, and resumes after it clears', () => {
    const r = rig(IEC_STYLE);
    r.bridge.onStatus(st(0, [entry('HR_HIGH', 2)]));
    r.run(5);
    expect(new Set(r.played.map((p) => p.level))).toEqual(new Set([2]));
    const n = r.played.length;
    r.bridge.onStatus(st(5, [entry('HR_HIGH', 2), entry('ASYSTOLE', 1)]));
    r.run(14);
    const during = r.played.slice(n);
    expect(during.length).toBe(10); // one IEC-style high burst (the next is due at 15 s)
    expect(during.every((p) => p.level === 1 && p.id.startsWith('alarm:ASYSTOLE:'))).toBe(true);
    r.bridge.onStatus(st(14.5, [entry('HR_HIGH', 2)]));
    r.run(15);
    expect(r.played[r.played.length - 1]!.id.startsWith('alarm:HR_HIGH:')).toBe(true);
  });

  it('acknowledged alarms are silent; silence stops audio; a new Saadat-like alarm ends the silence', () => {
    const r = rig(SAADAT);
    r.bridge.onStatus(st(0, [entry('ASYSTOLE', 1, true)]));
    r.run(3);
    expect(r.played).toEqual([]);
    r.bridge.onStatus(st(3, [entry('ASYSTOLE', 1)]));
    r.run(4.5);
    expect(r.played.length).toBe(5); // one saadat L1 burst: 5 pulses over 1.35 s
    r.bridge.onStatus(st(4.5, [entry('ASYSTOLE', 1)], 124.5));
    r.run(40);
    expect(r.played.length).toBe(5);
    r.bridge.onStatus(st(40, [entry('ASYSTOLE', 1), entry('VFIB', 1)], null)); // the engine ended the silence (new alarm)
    r.run(41.5);
    expect(r.played.length).toBe(10);
  });
});
```

Create `packages/renderer/test/alarm-view.test.ts`:

```ts
// Alarm header and tile views (brief §6.4 visual table, §6.4.1) as pure functions.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { barView, tileAlarmView, type AlarmStatus } from '../src/alarm-view.ts';

const sa = resolveSkin('saadat-like');
const ph = resolveSkin('philips-like');
function status(over: Partial<AlarmStatus> = {}): AlarmStatus {
  return {
    type: 'alarmStatus', t: 10, skin: 'saadat-like', ageBand: 'adult', active: [], silencedUntil: null, pausedUntil: null,
    limits: { HR: { numeric: 'hr', low: 50, high: 150, enabled: true, level: 1, approximate: false } }, allOff: false, arrhythmiaAnalysis: false, volume: 1, ...over,
  };
}
const asy = { id: 'ASYSTOLE', level: 1 as const, category: 'physiological' as const, text: 'ECG ASYSTOLE', since: 5, latched: false, acked: false };
const hr = { id: 'HR_HIGH', level: 2 as const, category: 'physiological' as const, text: 'HR TOO HIGH', numeric: 'hr' as const, since: 4, latched: false, acked: false };
const leads = { id: 'ecgLeadsOff', level: 3 as const, category: 'technical' as const, text: 'ECG CHECK LA/RA/LL', since: 3, latched: false, acked: false };

describe('barView', () => {
  it('saadat-like idle: grey bar, lamp off; all-off bell when every parameter alarm is OFF', () => {
    expect(barView(status({ allOff: true }), sa, 10)).toMatchObject({ text: '', bg: '#E0E0E0', lamp: 'off', allOffBell: true });
  });
  it('saadat-like levels: L1 red flash 2 Hz, L2 yellow flash 0.6 Hz, L3 cyan bar with a steady yellow lamp, black text', () => {
    expect(barView(status({ active: [hr, asy] }), sa, 10)).toMatchObject({ text: 'ECG ASYSTOLE', bg: '#F00000', fg: '#000000', lamp: 'red-flash', flashHz: 2 });
    expect(barView(status({ active: [hr] }), sa, 10)).toMatchObject({ bg: '#F0F000', lamp: 'yellow-flash', flashHz: 0.6 });
    expect(barView(status({ active: [leads] }), sa, 10)).toMatchObject({ bg: '#00D0D0', fg: '#000000', lamp: 'yellow-steady', flashHz: 0 });
  });
  it('saadat-like silence hides physiological alarms and shows the countdown; the PUMP page keeps ASYSTOLE', () => {
    const s = status({ active: [asy, { ...leads, acked: true }], silencedUntil: 130 });
    expect(barView(s, sa, 10)).toMatchObject({ text: 'ECG CHECK LA/RA/LL', bg: '#E0E0E0', lamp: 'off', countdownS: 120, countdownKind: 'silence' });
    expect(barView(s, sa, 10, true)).toMatchObject({ text: 'ECG ASYSTOLE', bg: '#F00000' });
  });
  it('philips-like silence keeps the visuals (audio only), and same-level messages rotate every 2 s', () => {
    const a2 = { ...asy, id: 'VFIB', text: '***VFIB/VTACH', since: 6 };
    const s = status({ active: [{ ...asy, text: '***ASYSTOLE' }, a2], silencedUntil: 100 });
    expect(barView(s, ph, 12)).toMatchObject({ text: '***ASYSTOLE', bg: '#FF0000', fg: '#FFFFFF', countdownS: 88 });
    expect(barView(s, ph, 14).text).toBe('***VFIB/VTACH');
  });
});

describe('tileAlarmView', () => {
  it('limits shown only when ON; crossed bell when OFF; flash level from the alarm on its numeric', () => {
    expect(tileAlarmView('HR', status({ active: [hr] }), sa, 10)).toEqual({ flash: 2, bellOff: false, limits: '50–150' });
    const off = status({ limits: { HR: { numeric: 'hr', low: 50, high: 150, enabled: false, level: 1, approximate: true } } });
    expect(tileAlarmView('HR', off, sa, 10)).toEqual({ flash: null, bellOff: true, limits: '' });
    expect(tileAlarmView('HR', status({ active: [hr], silencedUntil: 100 }), sa, 10).flash).toBeNull(); // saadat-like silence hides it
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd packages/renderer && npx vitest run test/alarm-view.test.ts test/alarm-audio.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../src/alarm-view.ts"`

- [ ] **Step 3: Implement**

Create `packages/renderer/src/alarm-audio.ts`:

```ts
// Engine alarm state → alarm sound (request E-4a-3; brief §6.4, §6.4.1): the `alarmStatus` event is the single
// source; the bridge raises and clears alarms on the 4a AlarmSounder (which sounds only the highest priority,
// ties first raised) and mirrors the engine's silence/pause. Acknowledged alarms are silent.
import type { AlarmLevel } from '@pme/audio';
import type { AlarmStatus } from './alarm-view.ts';

/** The part of @pme/audio's AlarmSounder the bridge drives (a fake in tests). */
export interface SounderLike {
  raise(id: string, level: AlarmLevel, t: number): void;
  clear(id: string, t: number): void;
  silenceAll(t: number, durationS?: number): void;
  endSilence(t: number): void;
  setVolume(step: number): void;
  readonly silencedUntil: number | null;
}

export class AlarmAudioBridge {
  private audible = new Map<string, AlarmLevel>();
  private quietUntil: number | null = null;
  private readonly sounder: SounderLike;
  private readonly timeScale: () => number;

  constructor(sounder: SounderLike, timeScale: () => number = () => 1) {
    this.sounder = sounder;
    this.timeScale = timeScale;
  }

  /** Apply one alarmStatus event at its sim time. */
  onStatus(st: AlarmStatus): void {
    const t = st.t;
    const want = new Map<string, AlarmLevel>();
    for (const a of st.active) if (!a.acked) want.set(a.id, a.level);
    for (const id of this.audible.keys()) if (!want.has(id)) this.sounder.clear(id, t);
    for (const [id, level] of want) if (this.audible.get(id) !== level) this.sounder.raise(id, level, t);
    this.audible = want;
    const until = st.pausedUntil ?? st.silencedUntil;
    if (until !== null && until !== this.quietUntil) this.sounder.silenceAll(t, (until - t) / this.timeScale());
    if (until === null && this.quietUntil !== null && this.sounder.silencedUntil !== null) this.sounder.endSilence(t);
    this.quietUntil = until;
    this.sounder.setVolume(st.volume);
  }
}
```

Create `packages/renderer/src/alarm-view.ts`:

```ts
// What the alarm header and tiles show (brief §6.4 visual table, §6.4.1 Saadat-like, §6.9 PUMP page) as PURE
// functions of the engine's `alarmStatus` event and the resolved skin, so they are unit-tested in Node; the DOM in
// device-ui.ts only paints them.
import type { AlarmEntry, EngineEvent, NumericId } from '@pme/engine-core';
import type { LampStyle, ResolvedSkin, TileParam } from '@pme/skins';

export type AlarmStatus = Extract<EngineEvent, { type: 'alarmStatus' }>;
/** Same-level messages rotate every this many seconds (brief §6.4.1 "messages rotate") [ENG]. */
export const ROTATE_S = 2;

export interface BarView {
  text: string;
  bg: string;
  fg: string;
  lamp: LampStyle;
  /** Lamp/numeric flash rate (Hz) and duty, 0 = steady. */
  flashHz: number;
  duty: number;
  /** Seconds left of a silence or pause, shown in the header; null when none. */
  countdownS: number | null;
  countdownKind: 'silence' | 'pause' | null;
  /** Red crossed bell in the header: every parameter alarm is OFF (brief §6.4.1). */
  allOffBell: boolean;
}

/** Entries the header shows: saadat-like silence hides physiological alarms (except ASYSTOLE on a PUMP page). */
export function visibleAlarms(st: AlarmStatus, r: ResolvedSkin, t: number, pumpPage = false): AlarmEntry[] {
  if (st.pausedUntil !== null && t < st.pausedUntil) return [];
  const silenced = st.silencedUntil !== null && t < st.silencedUntil;
  return st.active.filter((a) => {
    if (!silenced || !r.skin.alarms.silence.suppressesVisual || a.category === 'technical') return true;
    return pumpPage && a.id === 'ASYSTOLE';
  });
}

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

/** Numerics each tile shows, and the skin limit keys whose switch and limits it displays. */
export const TILE_NUMERICS: Readonly<Record<TileParam, { numerics: NumericId[]; limits: string[] }>> = {
  HR: { numerics: ['hr'], limits: ['HR'] },
  NIBP: { numerics: ['nibpSys', 'nibpDia', 'nibpMean'], limits: ['NIBP_S', 'NIBP_D', 'NIBP_M'] },
  ART: { numerics: ['abpSys', 'abpDia', 'abpMean'], limits: ['ART_S', 'ART_D', 'ART_M'] },
  IBP1: { numerics: ['abpSys', 'abpDia', 'abpMean'], limits: ['ART_S', 'ART_D', 'ART_M'] },
  CVP: { numerics: ['cvpMean'], limits: ['CVP_M'] },
  IBP2: { numerics: ['cvpMean'], limits: ['CVP_M'] },
  PAP: { numerics: ['papSys', 'papDia', 'papMean'], limits: ['PAP_S', 'PAP_D', 'PAP_M'] },
  IBP3: { numerics: ['papSys', 'papDia', 'papMean'], limits: ['PAP_S', 'PAP_D', 'PAP_M'] },
  IBP4: { numerics: [], limits: [] },
  SpO2: { numerics: ['spo2'], limits: ['SpO2'] },
  TEMP: { numerics: ['tempCore'], limits: ['TEMP', 'T1'] },
  RR: { numerics: ['rr'], limits: ['RR', 'AWRR'] },
  CO2: { numerics: ['etco2'], limits: ['EtCO2', 'EtCO2_pctV'] },
  ST: { numerics: ['stII'], limits: ['ST_mV'] },
};

export interface TileAlarmView {
  /** Flash level of the numeric (1 or 2), or null. */
  flash: 1 | 2 | 3 | null;
  /** Red crossed bell: the tile's parameter alarm is OFF (brief §6.4.1). */
  bellOff: boolean;
  /** "50–150" style limits, shown only when the alarm is ON (brief §6.4.1); '~' marks approximate (brief §6.8). */
  limits: string;
}

export function tileAlarmView(param: TileParam, st: AlarmStatus | null, r: ResolvedSkin, t: number, pumpPage = false): TileAlarmView {
  const spec = TILE_NUMERICS[param];
  const keys = spec.limits.filter((k) => st?.limits[k]);
  if (!st || keys.length === 0) return { flash: null, bellOff: false, limits: '' };
  const enabled = keys.some((k) => st.limits[k]?.enabled);
  const shown = r.skin.alarms.numericFlash ? visibleAlarms(st, r, t, pumpPage) : [];
  const mine = shown.filter((a) => !a.acked && a.numeric !== undefined && spec.numerics.includes(a.numeric));
  const flash = mine.length > 0 ? (Math.min(...mine.map((a) => a.level)) as 1 | 2 | 3) : null;
  const l = st.limits[keys[0] as string];
  const fmt = (v: number | null) => (v === null ? '--' : String(Math.round(v * 10) / 10));
  const limits = enabled && l ? `${l.approximate ? '~' : ''}${fmt(l.low)}–${fmt(l.high)}` : '';
  return { flash, bellOff: !enabled, limits };
}
```

- [ ] **Step 4: Run the tests and the type check**

```bash
cd packages/renderer && npx vitest run test/alarm-view.test.ts test/alarm-audio.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  7 passed (7)`; the type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/alarm-audio.ts packages/renderer/src/alarm-view.ts packages/renderer/test/alarm-audio.test.ts packages/renderer/test/alarm-view.test.ts
git commit -m "feat(renderer): alarm bar/lamp/countdown and tile views from alarmStatus; bridge to the AlarmSounder (only the highest priority sounds)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Device UI (header, skin tiles, PUMP watermark) and the 12-lead / trend views

**Files:**
- Create: `packages/renderer/src/device-ui.ts`
- Create: `packages/renderer/src/views.ts`
- Test: `packages/renderer/test/views.test.ts`

**Interfaces:**
- Consumes: Task 19 views, `formatNibp` (Stage 2), `formatDate` (`@pme/skins`), `Capture12`, `TrendStore`.
- Produces: `device-ui.ts` — `flashCss(r)`, `class DeviceUI {header, tiles, setSkin(r, page?), onEvent(e), paint(t), destroy()}`; `views.ts` — `PAPER`, `report12Size(pxPerMm)`, `draw12Lead(ctx, capture, pxPerMm): number`, `interface TrendSeries`, `drawTrend(ctx, store, series, fromS, toS, w, h, style, background?)`.

- [ ] **Step 1: Write the failing test**

Create `packages/renderer/test/views.test.ts`:

```ts
// 12-lead report and trend drawing (brief §6.6, §6.7) on the recording fake.
import { describe, expect, it } from 'vitest';
import { capture12, createEngine, TrendStore } from '@pme/engine-core';
import { draw12Lead, drawTrend, report12Size } from '../src/views.ts';
import { FakeCtx } from './fake-ctx.ts';

describe('views', () => {
  it('12-lead: 3×4 segments plus the rhythm strip, labels for every lead, 4 calibration pulses', () => {
    const e = createEngine({ seed: 2 });
    e.advanceTo(12);
    const ctx = new FakeCtx();
    expect(draw12Lead(ctx, capture12(e), 4)).toBe(13);
    expect(ctx.texts.slice(0, 12)).toEqual(['I', 'aVR', 'V1', 'V4', 'II', 'aVL', 'V2', 'V5', 'III', 'aVF', 'V3', 'V6']);
    expect(ctx.texts[12]).toMatch(/^II {2}25 mm\/s {2}10 mm\/mV {2}0\.05–150 Hz {2}HR \d+/);
    expect(report12Size(4)).toEqual({ widthPx: 1080, heightPx: 540 });
    // one calibration pulse per row: a 10 mm (40 px) rise
    const rises = ctx.calls.filter((c, i) => c.op === 'lineTo' && ctx.calls[i - 1]?.op === 'lineTo' && Math.abs((ctx.calls[i - 1]!.args[1] as number) - (c.args[1] as number) - 40) < 1e-9);
    expect(rises.length).toBe(4);
  });

  it('trend: a line per series, gaps break it, filled-area draws columns', () => {
    const s = new TrendStore();
    for (let t = 0; t < 600; t++) if (t < 200 || t > 300) s.record({ type: 'measurement', t, values: { hr: { value: 70 + (t % 10), flag: 'valid', at: t } } });
    const ctx = new FakeCtx();
    drawTrend(ctx, s, [{ id: 'hr', color: '#0f0', range: [0, 200] }], 0, 599, 600, 100, 'line');
    const moves = ctx.calls.filter((c) => c.op === 'moveTo').length;
    expect(moves).toBe(2); // one run before the gap, one after
    const f = new FakeCtx();
    drawTrend(f, s, [{ id: 'hr', color: '#0f0', range: [0, 200] }], 0, 599, 600, 100, 'filled-area');
    expect(f.calls.filter((c) => c.op === 'moveTo').length).toBe(499);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd packages/renderer && npx vitest run test/views.test.ts; cd -`
Expected: FAIL — `Failed to resolve import "../src/views.ts"`

- [ ] **Step 3: Implement**

Create `packages/renderer/src/device-ui.ts`:

```ts
// Main-thread device chrome (brief §3.1 "DOM numerics tiles (≤1 Hz, CSS flash)"; §6.4 visuals; §6.4.1; §6.9):
// the alarm header (lamp, message bar, silence/pause countdown, all-off bell, layout badge, date), the skin's
// numeric tiles (colours, fonts, glyphs, crossed bells, limits, flashing numerics; request RR-5) and the PUMP
// watermark. What to show comes from alarm-view.ts; this file only paints the DOM.
import type { EngineEvent, Measured, NumericId } from '@pme/engine-core';
import { formatDate, type ResolvedSkin, type TileParam, type TileSpec } from '@pme/skins';
import { barView, tileAlarmView, TILE_NUMERICS, type AlarmStatus } from './alarm-view.ts';
import { formatNibp } from './numerics-hemo.ts';

type NibpEvent = Extract<EngineEvent, { type: 'nibp' }>;
type DeviceStatus = Extract<EngineEvent, { type: 'deviceStatus' }>;

const UNIT: Partial<Record<TileParam, string>> = {
  HR: 'bpm', NIBP: 'mmHg', ART: 'mmHg', CVP: 'mmHg', PAP: 'mmHg', IBP1: 'mmHg', IBP2: 'mmHg', IBP3: 'mmHg', IBP4: 'mmHg', SpO2: '%', TEMP: '°C', RR: 'rpm', CO2: 'mmHg', ST: 'mV',
};
const BELL_OFF_SVG =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-label="alarm off"><path d="M8 2a4 4 0 0 0-4 4v3l-1.5 2h11L12 9V6a4 4 0 0 0-4-4zm-1.5 11a1.5 1.5 0 0 0 3 0" fill="none" stroke="#F00000" stroke-width="1.4"/><path d="M2 14L14 2" stroke="#F00000" stroke-width="1.6"/></svg>';

/** CSS for the flash classes of this skin: 50 % duty (skin `alarms.lamp.duty`), 2.0 / 0.6 Hz (brief §6.4). */
export function flashCss(r: ResolvedSkin): string {
  const l = r.skin.alarms.lamp;
  const pct = Math.round(l.duty * 100);
  return [
    `@keyframes pme-blink{0%{opacity:1}${pct}%{opacity:0.12}}`,
    `.pme-f1{animation:pme-blink ${(1 / l.flashHz.L1).toFixed(5)}s step-end infinite}`,
    `.pme-f2{animation:pme-blink ${(1 / l.flashHz.L2).toFixed(5)}s step-end infinite}`,
    '.pme-hdr{display:flex;align-items:center;gap:10px;height:30px;padding:0 8px;font-size:15px;box-sizing:border-box}',
    '.pme-bar{flex:1;height:22px;line-height:22px;padding:0 8px;border-radius:2px;white-space:nowrap;overflow:hidden;font-weight:600}',
    '.pme-lamp{width:18px;height:18px;border-radius:50%;flex:none}',
    '.pme-cd{min-width:4.5em;font-variant-numeric:tabular-nums}',
    '.pme-badge{font-size:11px;border:1px solid currentColor;padding:1px 4px;opacity:.9}',
    '.pme-stile{padding:4px 10px;line-height:1.05;border-top:1px solid var(--pme-divider)}',
    '.pme-stile .h{display:flex;gap:6px;align-items:center;font-size:13px}',
    '.pme-stile .h .u{margin-left:auto;opacity:.8}',
    '.pme-stile .lim{font-size:11px;opacity:.9;min-height:12px;text-align:right}',
    '.pme-stile .v{font-size:40px;text-align:right;font-variant-numeric:tabular-nums}',
    '.pme-stile.large .v{font-size:60px}',
    '.pme-stile .s{font-size:16px;text-align:right;font-variant-numeric:tabular-nums;min-height:18px}',
    '.pme-watermark{position:absolute;left:30%;top:2%;font-size:64px;font-weight:700;opacity:.25;pointer-events:none}',
  ].join('\n');
}

interface Tile {
  spec: TileSpec;
  el: HTMLDivElement;
  value: HTMLDivElement;
  sub: HTMLDivElement;
  bell: HTMLSpanElement;
  lim: HTMLSpanElement;
}

export class DeviceUI {
  readonly header: HTMLDivElement;
  readonly tiles: HTMLDivElement;
  private readonly style: HTMLStyleElement;
  private readonly watermark: HTMLDivElement;
  private r: ResolvedSkin;
  private pump = false;
  private tileList: Tile[] = [];
  private values: Partial<Record<NumericId, Measured>> = {};
  private nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
  private nibpEv: NibpEvent | undefined;
  private status: AlarmStatus | null = null;
  private dev: DeviceStatus | null = null;
  private readonly lamp: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly cd: HTMLSpanElement;
  private readonly allOff: HTMLSpanElement;
  private readonly badge: HTMLSpanElement;
  private readonly date: HTMLSpanElement;

  constructor(doc: Document, waveArea: HTMLElement, r: ResolvedSkin, page?: string) {
    this.r = r;
    this.style = doc.createElement('style');
    doc.head.append(this.style);
    this.header = doc.createElement('div');
    this.header.className = 'pme-hdr';
    this.header.innerHTML =
      '<div class="pme-lamp" data-pme="lamp"></div><div class="pme-bar" data-pme="bar"></div><span class="pme-cd" data-pme="cd"></span>' +
      '<span data-pme="alloff"></span><span class="pme-badge" data-pme="badge"></span><span data-pme="date"></span>';
    const q = <T extends HTMLElement>(k: string) => this.header.querySelector(`[data-pme="${k}"]`) as T;
    this.lamp = q('lamp');
    this.bar = q('bar');
    this.cd = q('cd');
    this.allOff = q('alloff');
    this.badge = q('badge');
    this.date = q('date');
    this.tiles = doc.createElement('div');
    this.tiles.style.cssText = 'display:flex;flex:none;overflow:hidden;';
    this.watermark = doc.createElement('div');
    this.watermark.className = 'pme-watermark';
    waveArea.append(this.watermark);
    this.setSkin(r, page);
  }

  setSkin(r: ResolvedSkin, page?: string): void {
    this.r = r;
    const pg = r.skin.pages.find((p) => p.id === (page ?? r.skin.defaultPage));
    this.pump = pg?.kind === 'pump';
    this.watermark.textContent = pg?.pump?.watermark ?? '';
    this.watermark.style.color = r.skin.colors.ECG ?? r.render.foreground;
    this.style.textContent = flashCss(r);
    this.header.style.cssText = `background:${r.render.background};color:${r.render.foreground};font-family:${r.render.fontStack};border-bottom:1px solid ${r.skin.chrome.divider};`;
    this.badge.textContent = r.skin.layout.badge ?? '';
    this.badge.style.display = r.skin.layout.badge ? '' : 'none';
    this.tiles.style.background = r.render.background;
    this.tiles.style.setProperty('--pme-divider', r.skin.chrome.divider);
    this.tiles.replaceChildren();
    this.tileList = [];
    const doc = this.tiles.ownerDocument;
    for (const col of r.skin.layout.tiles) {
      const c = doc.createElement('div');
      c.style.cssText = `width:180px;border-left:1px solid ${r.skin.chrome.divider};`;
      for (const spec of col) {
        const el = doc.createElement('div');
        el.className = `pme-stile${spec.size === 'large' ? ' large' : ''}`;
        el.dataset.param = spec.param;
        el.style.color = r.render.tileColors[spec.param] ?? r.render.foreground;
        el.style.fontFamily = r.render.fontStack;
        el.innerHTML = `<div class="h"><span>${spec.param}</span><span data-pme="bell"></span><span class="u">${UNIT[spec.param] ?? ''}</span></div><div class="lim"><span data-pme="lim"></span></div><div class="v" data-pme="v"></div><div class="s" data-pme="s"></div>`;
        const v = el.querySelector('[data-pme="v"]') as HTMLDivElement;
        v.style.fontWeight = String(r.render.numericWeight);
        this.tileList.push({ spec, el, value: v, sub: el.querySelector('[data-pme="s"]') as HTMLDivElement, bell: el.querySelector('[data-pme="bell"]') as HTMLSpanElement, lim: el.querySelector('[data-pme="lim"]') as HTMLSpanElement });
        c.append(el);
      }
      this.tiles.append(c);
    }
    this.paintTiles(this.status?.t ?? 0);
    this.paintHeader(this.status?.t ?? 0);
  }

  onEvent(e: EngineEvent): void {
    if (e.type === 'measurement') {
      Object.assign(this.values, e.values);
      if (e.values.nibpSys?.value != null) this.nibpLast = { sys: e.values.nibpSys.value, dia: e.values.nibpDia?.value ?? 0, map: e.values.nibpMean?.value ?? 0, at: e.t };
    } else if (e.type === 'nibp') this.nibpEv = e;
    else if (e.type === 'alarmStatus') this.status = e;
    else if (e.type === 'deviceStatus') this.dev = e;
  }

  /** Repaint for sim time t (called with every event batch, ≤ 4 Hz). */
  paint(t: number): void {
    this.paintHeader(t);
    this.paintTiles(t);
  }

  private text(m: Measured | undefined, digits = 0): string {
    return m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : this.r.skin.glyphs.noValue;
  }

  private paintTiles(t: number): void {
    const g = this.r.skin.glyphs;
    const box = this.r.skin.alarms.numericStyle === 'flash-box';
    for (const tile of this.tileList) {
      const p = tile.spec.param;
      const v = this.values;
      let main = g.noValue;
      let sub = '';
      if (p === 'HR') main = this.dev?.hrDashes ? g.hrUnavailable : this.text(v.hr);
      else if (p === 'NIBP') {
        const n = formatNibp(this.nibpEv, this.nibpLast);
        main = n.main === '---/---' ? `${g.noValue}/${g.noValue}` : n.main;
        sub = `${n.sub === '(---)' ? '' : n.sub} ${n.status}`.trim();
      } else if (TILE_NUMERICS[p].numerics.length === 3) {
        const [s, d, m] = TILE_NUMERICS[p].numerics.map((k) => v[k]);
        main = `${this.text(s)}/${this.text(d)}`;
        sub = `(${this.text(m)})`;
      } else if (TILE_NUMERICS[p].numerics.length === 1) main = this.text(v[TILE_NUMERICS[p].numerics[0] as NumericId], p === 'TEMP' || p === 'ST' ? 1 : 0);
      if (p === 'SpO2') sub = `PR ${this.text(v.pr)}  PI ${this.text(v.pi, 1)}`;
      tile.value.textContent = main;
      tile.sub.textContent = sub;
      const av = tileAlarmView(p, this.status, this.r, t, this.pump);
      tile.bell.innerHTML = av.bellOff && this.r.skin.alarms.alarmOffIcon === 'crossed-bell-red' ? BELL_OFF_SVG : av.bellOff ? '🔕' : '';
      tile.lim.textContent = av.limits;
      tile.value.className = av.flash === 1 ? 'v pme-f1' : av.flash === 2 ? 'v pme-f2' : 'v';
      const bar = av.flash !== null ? this.r.skin.alarms.messageBar[`L${av.flash}`] : null;
      tile.value.style.background = box && bar ? bar.bg : '';
      tile.value.style.color = box && bar ? bar.fg : '';
    }
  }

  private paintHeader(t: number): void {
    const b = barView(this.status, this.r, t, this.pump);
    this.bar.textContent = b.text;
    this.bar.style.background = b.bg;
    this.bar.style.color = b.fg;
    const lampColor = b.lamp.startsWith('red') ? '#F00000' : b.lamp.startsWith('yellow') ? '#F0F000' : b.lamp.startsWith('cyan') ? '#00D0D0' : 'transparent';
    this.lamp.style.background = lampColor;
    this.lamp.style.border = `1px solid ${this.r.skin.chrome.divider}`;
    this.lamp.className = `pme-lamp${b.flashHz > 0 ? (b.flashHz === this.r.skin.alarms.lamp.flashHz.L1 ? ' pme-f1' : ' pme-f2') : ''}`;
    this.lamp.dataset.lamp = b.lamp;
    this.cd.textContent = b.countdownS !== null ? `${b.countdownKind === 'pause' ? 'PAUSE' : '🔇'} ${b.countdownS}s` : '';
    this.cd.className = `pme-cd${b.countdownKind === 'silence' ? ' pme-f2' : ''}`;
    this.allOff.innerHTML = b.allOffBell ? BELL_OFF_SVG : '';
    const cal = this.r.skin.calendar;
    this.date.textContent = formatDate(new Date(), cal.default, cal.gregorianFormat);
  }

  destroy(): void {
    this.style.remove();
    this.watermark.remove();
  }
}
```

Create `packages/renderer/src/views.ts`:

```ts
// Stage 4b views drawn on a plain canvas: the 12-lead report (brief §6.6: 3×4 + lead II rhythm strip, 25 mm/s,
// 10 mm/mV, calibration pulses, on ECG paper) and the graphic trend (brief §6.7; `trend.style` line or
// filled-area, brief §3.8). Both take a Ctx2D, so they are tested with the recording fake.
import type { Capture12, LeadId, NumericId, TrendStore } from '@pme/engine-core';
import type { Ctx2D } from './ctx.ts';
import { LEAD_LABEL } from './skin-plan.ts';

export const PAPER = { background: '#FFF8F4', minor: '#FAE2E2', major: '#F4C4C4', trace: '#000000' } as const; // ecg-grid theme colours

export interface Report12Geometry {
  widthPx: number;
  heightPx: number;
}

/** Pixel size of the report at pxPerMm: 250 mm of trace + 10 mm margins; 4 rows of 30 mm + 10 mm top. */
export function report12Size(pxPerMm: number): Report12Geometry {
  return { widthPx: Math.round(270 * pxPerMm), heightPx: Math.round(135 * pxPerMm) };
}

function grid(ctx: Ctx2D, w: number, h: number, pxPerMm: number): void {
  ctx.fillStyle = PAPER.background;
  ctx.fillRect(0, 0, w, h);
  for (const major of [false, true]) {
    ctx.strokeStyle = major ? PAPER.major : PAPER.minor;
    ctx.lineWidth = major ? 1 : 0.5;
    ctx.beginPath();
    for (let k = 0; k * pxPerMm <= w; k++) {
      if ((k % 5 === 0) !== major) continue;
      ctx.moveTo(k * pxPerMm, 0);
      ctx.lineTo(k * pxPerMm, h);
    }
    for (let k = 0; k * pxPerMm <= h; k++) {
      if ((k % 5 === 0) !== major) continue;
      ctx.moveTo(0, k * pxPerMm);
      ctx.lineTo(w, k * pxPerMm);
    }
    ctx.stroke();
  }
}

/** Draw the 12-lead report. Returns the number of trace segments drawn (12 + the rhythm strip = 13). */
export function draw12Lead(ctx: Ctx2D, c: Capture12, pxPerMm: number): number {
  const { widthPx, heightPx } = report12Size(pxPerMm);
  grid(ctx, widthPx, heightPx, pxPerMm);
  const mmPerSample = c.paper.mmPerS / c.rate;
  const x0 = 15 * pxPerMm; // after the calibration pulse
  const rowH = 30 * pxPerMm;
  const colN = Math.round(c.layout.columnS * c.rate);
  ctx.font = `${Math.round(3.5 * pxPerMm)}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  let segments = 0;
  const trace = (lead: LeadId, from: number, n: number, x: number, base: number) => {
    const d = c.leads[lead];
    ctx.strokeStyle = PAPER.trace;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + i * mmPerSample * pxPerMm;
      const py = base - (d[from + i] as number) * c.paper.mmPerMv * pxPerMm;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    segments++;
  };
  const cal = (base: number) => {
    const h = c.cal.mV * c.paper.mmPerMv * pxPerMm;
    const w = (c.cal.ms / 1000) * c.paper.mmPerS * pxPerMm;
    const x = 5 * pxPerMm;
    ctx.strokeStyle = PAPER.trace;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 2 * pxPerMm, base);
    ctx.lineTo(x, base);
    ctx.lineTo(x, base - h);
    ctx.lineTo(x + w, base - h);
    ctx.lineTo(x + w, base);
    ctx.lineTo(x + w + 2 * pxPerMm, base);
    ctx.stroke();
  };
  c.layout.rows.forEach((row, r) => {
    const base = 10 * pxPerMm + r * rowH + 0.6 * rowH;
    cal(base);
    row.forEach((lead, col) => {
      const x = x0 + col * c.layout.columnS * c.paper.mmPerS * pxPerMm;
      trace(lead, col * colN, colN, x, base);
      ctx.fillStyle = PAPER.trace;
      ctx.fillText(LEAD_LABEL[lead], x + pxPerMm, 10 * pxPerMm + r * rowH + 2 * pxPerMm);
    });
  });
  const base = 10 * pxPerMm + 3 * rowH + 0.6 * rowH;
  cal(base);
  trace(c.layout.rhythmLead, 0, c.leads[c.layout.rhythmLead].length, x0, base);
  ctx.fillStyle = PAPER.trace;
  ctx.fillText(`${LEAD_LABEL[c.layout.rhythmLead]}  25 mm/s  10 mm/mV  ${c.filter[0]}–${c.filter[1]} Hz  HR ${c.measurements.hr ?? '--'}  axis ${c.measurements.axisDeg ?? '--'}°`, x0, 2 * pxPerMm);
  return segments;
}

export interface TrendSeries {
  id: NumericId;
  color: string;
  range: [number, number];
}

/** Graphic trend of [fromS, toS] in a w×h box: one band per series, `line` or `filled-area` (saadat-like). */
export function drawTrend(ctx: Ctx2D, store: TrendStore, series: readonly TrendSeries[], fromS: number, toS: number, w: number, h: number, style: 'line' | 'filled-area', background = '#000'): void {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  const bandH = h / Math.max(1, series.length);
  const span = Math.max(1, toS - fromS);
  const step = Math.max(1, Math.floor(span / w)); // one point per pixel column at most
  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  series.forEach((s, k) => {
    const y0 = k * bandH;
    const vals = store.series(s.id, fromS, toS);
    const yOf = (v: number) => y0 + bandH - ((v - s.range[0]) / (s.range[1] - s.range[0])) * (bandH - 16);
    ctx.fillStyle = s.color;
    ctx.fillText(`${s.id} ${s.range[0]}–${s.range[1]}`, 4, y0 + 2);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let open = false;
    for (let i = 0; i < vals.length; i += step) {
      const v = vals[i] as number;
      const x = (i / span) * w;
      if (Number.isNaN(v)) {
        open = false;
        continue;
      }
      const y = Math.min(y0 + bandH, Math.max(y0 + 14, yOf(v)));
      if (style === 'filled-area') {
        ctx.moveTo(x, y0 + bandH);
        ctx.lineTo(x, y);
      } else if (open) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      open = true;
    }
    ctx.stroke();
  });
}
```

- [ ] **Step 4: Run the tests and the type check**

```bash
cd packages/renderer && npx vitest run test/views.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  2 passed (2)`; the type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/device-ui.ts packages/renderer/src/views.ts packages/renderer/test/views.test.ts
git commit -m "feat(renderer): device UI (alarm header, skin tiles with bells/limits/flash, PUMP watermark) and 12-lead/trend canvases" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: `mountMonitor` wiring: skins, setSkin, device tones and alarm sound, capture, trends, event log

**Files:**
- Modify: `packages/renderer/src/device-ui.ts`
- Modify: `packages/renderer/src/index.ts`
- Replace: `packages/renderer/src/mount.ts`
- Modify: `packages/renderer/src/skin-plan.ts`
- Modify test: `packages/renderer/test/skin-plan.test.ts`

**Interfaces:**
- Consumes: Tasks 14–20; `createTonePlayer`, `getAlarmProfile`, `AlarmSounder` (Stage 4a, RR-6).
- Produces: `MountOptions.skin` (any `resolveSkin` id), `theme?`, `page?`; `MonitorHandle.setSkin(id, {theme?, page?})`, `.skin`, `.capture12()`, `.trends`, `.eventLog`; `renderPlan(r, page?, only?: LaneOverride)` keeps the lanes a page names; the HR tile keeps the class `pme-tile`; the renderer index exports the Stage 4b modules.

- [ ] **Step 1: Write the failing test**

In `packages/renderer/test/skin-plan.test.ts`, replace this block (it occurs exactly once):

```ts
  });

  it('legacyPlan reproduces the Stage 1/2 lanes', () => {
    const p = legacyPlan(['ecgII', 'V5'], ['abp']);
```

with:

```ts
  });

  it('pages that name their lanes keep them, in the skin colours (Stage 1/2/5 demos)', () => {
    const p = renderPlan(resolveSkin('philips-like'), undefined, { lanes: ['ecgII', 'V5'], waves: ['abp', 'pleth'] });
    expect(p.lanes.map((l) => [l.id, l.channel, l.color])).toEqual([['ECG1', 'ecgII', '#00FF00'], ['ECG2', 'V5', '#00FF00'], ['ART', 'abp', '#FF4040'], ['PLETH', 'pleth', '#00FFFF']]);
  });

  it('legacyPlan reproduces the Stage 1/2 lanes', () => {
    const p = legacyPlan(['ecgII', 'V5'], ['abp']);
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd packages/renderer && npx vitest run test/skin-plan.test.ts; cd -`
Expected: FAIL — the new `renderPlan(…, { lanes, waves })` test: the override is ignored (`expected [ … 'ECG1', 'ecgII' … 'CO2' ] to deeply equal …`)

- [ ] **Step 3: Implement**

In `packages/renderer/src/device-ui.ts`, replace this block (it occurs exactly once):

```ts
      for (const spec of col) {
        const el = doc.createElement('div');
        el.className = `pme-stile${spec.size === 'large' ? ' large' : ''}`;
        el.dataset.param = spec.param;
        el.style.color = r.render.tileColors[spec.param] ?? r.render.foreground;
```

with:

```ts
      for (const spec of col) {
        const el = doc.createElement('div');
        // the HR tile keeps the Stage 1 class `pme-tile`, which the IIFE smoke test (and embedders) look up
        el.className = `${spec.param === 'HR' ? 'pme-tile ' : ''}pme-stile${spec.size === 'large' ? ' large' : ''}`;
        el.dataset.param = spec.param;
        el.style.color = r.render.tileColors[spec.param] ?? r.render.foreground;
```

In `packages/renderer/src/index.ts`, replace this block (it occurs exactly once):

```ts
/** The five transport adapters of @pme/controller (brief §7.5; renderer request R-2, ruling R25). */
export { transports } from '@pme/controller';
```

with:

```ts
/** The five transport adapters of @pme/controller (brief §7.5; renderer request R-2, ruling R25). */
export { transports } from '@pme/controller';
// Stage 4b
export { renderPlan, legacyPlan, filterModeFor, ecgLabel, type RenderPlan, type PlanLane } from './skin-plan.ts';
export { barView, tileAlarmView, visibleAlarms, type AlarmStatus, type BarView, type TileAlarmView } from './alarm-view.ts';
export { AlarmAudioBridge } from './alarm-audio.ts';
export { DeviceUI, flashCss } from './device-ui.ts';
export { draw12Lead, drawTrend, report12Size, PAPER, type TrendSeries } from './views.ts';
export { Overlays, drawMark, drawLeadOffDashes } from './overlays.ts';
```

Replace the whole of `packages/renderer/src/mount.ts` with:

```ts
// mountMonitor (brief §7.6). Stage 1: ECG lanes + HR tile + QRS beep; Stage 2: pressure/pleth lanes and tiles.
// Stage 4b: `skin` takes any resolveSkin id (skin or preset) with an optional theme and page; the lanes, tiles,
// alarm header, alarm sound and device tones follow the skin, `setSkin` switches without restarting the engine,
// and the handle exposes the 12-lead capture, the trends and the event log. Without `skin` the Stage 1/2 look stays.
import {
  AlarmSounder, createTonePlayer, getAlarmProfile, playBeep, ToneScheduler, unlockAudio, type AudioOut, type ToneHandle, type ToneLogEntry, type ToneRequest,
} from '@pme/audio';
import { EventLog, TrendStore, type Capture12, type Command, type DispatchResult, type EngineEvent, type EngineOptions, type LeadId, type PatientSnapshot } from '@pme/engine-core';
import { resolveSkin, type ResolvedSkin } from '@pme/skins';
import { AlarmAudioBridge } from './alarm-audio.ts';
import { DeviceUI } from './device-ui.ts';
import { NumericTile } from './numerics-dom.ts';
import { formatNibp, formatPressure, PressureTile } from './numerics-hemo.ts'; // Stage 2
import { filterModeFor, renderPlan, type LaneOverride } from './skin-plan.ts'; // Stage 4b
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts'; // Stage 2
import type { ClockAnchor, Size } from './protocol.ts';
import { createHost, type Host, type RenderPath } from './worker-host.ts';

export interface MountOptions {
  engine?: EngineOptions;
  /** Stage 4b: any resolveSkin id ('saadat-like', 'iran-icu-as-found', 'philips-like', …). Omitted: the Stage 1/2 look. */
  skin?: string;
  /** Stage 4b: 'projector-light' | 'ecg-grid'. */
  theme?: string;
  /** Stage 4b: a page of the skin ('P1', 'P10' = PUMP on saadat-like). */
  page?: string;
  layout?: string;
  worker?: 'auto' | 'off';
  lanes?: LeadId[];
  /** Stage 2: waveform lanes below the ECG lanes (their tiles appear with them). */
  waves?: WaveLaneId[];
  /** Stage 2: show the NIBP tile. */
  nibp?: boolean;
  fps?: 60 | 30;
  pxPerMm?: number;
  /** The part this monitor plays in a session (brief §7.5; renderer request R-1, ruling R25). Default 'host'. */
  role?: MonitorRole;
}

/** A monitor either owns the simulation ('host') or mirrors one from its snapshot and commands ('viewer'). */
export type MonitorRole = 'host' | 'viewer';

export interface MonitorHandle {
  dispatch(cmd: Command): Promise<DispatchResult>;
  on(fn: (e: EngineEvent) => void): () => void;
  calibrate(pxPerMm: number): void;
  /** Must be called from a user gesture (brief §3.6). */
  enableSound(): Promise<void>;
  setTimeScale(k: number): void;
  pause(): void;
  resume(): void;
  setFps(fps: 60 | 30): void;
  destroy(): void;
  /** Which render path is running (worker rAF, worker with main-thread frame pump, or main thread). */
  readonly renderPath: Promise<RenderPath>;
  /** Scheduled/dropped tones, for diagnostics (beep − R alignment; Stage 4b: alarm pulses and device tones too). */
  readonly audioLog: readonly ToneLogEntry[];
  /** Worker proxy (brief §7.6 `engine`). */
  readonly engine: { dispatch(cmd: Command): Promise<DispatchResult> };
  /** MountOptions.role (R-1). */
  readonly role: MonitorRole;
  /** Engine snapshot, from the worker or the main thread (R-1): a late joiner or a bookmark starts from it. */
  snapshot(): Promise<PatientSnapshot>;
  /** Restore an engine snapshot and move the sim clock to its tick (R-1). */
  restore(s: PatientSnapshot): Promise<void>;
  /** Stage 4b: switch skin, theme or page without restarting the engine (brief §3.8). Needs a skin at mount. */
  setSkin(id: string, opts?: { theme?: string; page?: string }): Promise<void>;
  /** Stage 4b: the resolved skin in use (null without `skin`). */
  readonly skin: ResolvedSkin | null;
  /** Stage 4b: 12 leads × the last 10 s, diagnostic filter (brief §6.6). */
  capture12(): Promise<Capture12>;
  /** Stage 4b: 1 Hz numerics for 8 h (brief §6.7). */
  readonly trends: TrendStore;
  /** Stage 4b: commands, alarms, shocks, NIBP results (brief §6.7), CSV/JSON export. */
  readonly eventLog: EventLog;
}

const TILE_W = 190;
const SOUNDER_PUMP_MS = 100; // alarm bursts are enqueued ≥ 1 s ahead, so 100 ms is plenty [ENG]

export function mountMonitor(el: HTMLElement, opts: MountOptions = {}): MonitorHandle {
  let r: ResolvedSkin | null = opts.skin ? resolveSkin(opts.skin, opts.theme ? { theme: opts.theme } : {}) : null;
  let page = opts.page;
  const doc = el.ownerDocument;
  const outer = doc.createElement('div');
  outer.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;';
  const root = doc.createElement('div');
  root.style.cssText = `display:flex;flex:1;min-height:0;width:100%;background:${r?.render.background ?? '#000'};overflow:hidden;`;
  const wrap = doc.createElement('div');
  wrap.style.cssText = 'flex:1;position:relative;min-width:0;';
  const canvas = doc.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  wrap.append(canvas);
  const tiles = doc.createElement('div');
  tiles.style.cssText = `width:${TILE_W}px;flex:none;border-left:1px solid #222;overflow-y:auto;`; // Stage 2: scroll
  const ui = r ? new DeviceUI(doc, wrap, r, page) : null; // Stage 4b
  root.append(wrap, ui ? ui.tiles : tiles);
  if (ui) outer.append(ui.header);
  outer.append(root);
  el.append(outer);
  const legacy = !ui;
  const hrTile = legacy ? new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' }) : null;
  // Stage 2 tiles (brief §6.1, §6.3)
  const waves = legacy ? (opts.waves ?? []) : [];
  const abpTile = waves.includes('abp') ? new PressureTile(tiles, 'ABP', 'mmHg', WAVE_STYLE.abp.color) : null;
  const papTile = waves.includes('pap') ? new PressureTile(tiles, 'PAP', 'mmHg', WAVE_STYLE.pap.color) : null;
  const cvpTile = waves.includes('cvp') ? new PressureTile(tiles, 'CVP', 'mmHg', WAVE_STYLE.cvp.color) : null;
  const prTile = waves.includes('pleth') ? new PressureTile(tiles, 'PR', 'bpm', WAVE_STYLE.pleth.color) : null;
  const piTile = waves.includes('pleth') ? new PressureTile(tiles, 'PI', '%', WAVE_STYLE.pleth.color) : null;
  const nibpTile = legacy && opts.nibp ? new PressureTile(tiles, 'NBP', 'mmHg', '#ff7ad9') : null;
  let nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
  const single = (m: { value: number | null; flag: string } | undefined, digits = 0) =>
    m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : '---';

  const trends = new TrendStore(); // Stage 4b
  const eventLog = new EventLog(); // Stage 4b
  const listeners = new Set<(e: EngineEvent) => void>();
  let scheduler: ToneScheduler | null = null;
  let audio: AudioOut | null = null;
  let soundP: Promise<void> | null = null;
  let sounder: AlarmSounder | null = null; // Stage 4b
  let bridge: AlarmAudioBridge | null = null; // Stage 4b
  let lastStatus: Extract<EngineEvent, { type: 'alarmStatus' }> | null = null;
  let play: ((tone: ToneRequest, when: number) => ToneHandle | void) | null = null; // Stage 4b: follows the skin
  const playerFor = (out: AudioOut, sk: ResolvedSkin | null) =>
    sk
      ? createTonePlayer(out.ctx, out.master, { profile: getAlarmProfile(sk.audio.alarm.profile), toneSet: sk.skin.defib?.toneSet ?? 'zoll-like' }) // RR-6
      : (tone: ToneRequest, when: number) => playBeep(out.ctx, out.master, when, tone.freqHz ?? 880);
  let anchor: { simT: number; perfMs: number; timeScale: number } = { simT: 0, perfMs: performance.now(), timeScale: 1 };
  const simNow = () => anchor.simT + ((performance.now() - anchor.perfMs) / 1000) * anchor.timeScale;
  const onEvents = (a: ClockAnchor, events: EngineEvent[]) => {
    anchor = { simT: a.simT, perfMs: a.epochMs - performance.timeOrigin, timeScale: a.timeScale };
    scheduler?.clock.setAnchor({ simT: a.simT, perfMs: anchor.perfMs, timeScale: a.timeScale });
    for (const e of events) {
      trends.record(e);
      eventLog.event(e);
      ui?.onEvent(e);
      if (e.type === 'alarmStatus') {
        lastStatus = e;
        bridge?.onStatus(e);
      }
      if (hrTile && e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
      if (legacy && e.type === 'measurement') {
        // Stage 2 tiles
        const v = e.values;
        if (abpTile && v.abpSys) {
          const p = formatPressure(v.abpSys, v.abpDia, v.abpMean);
          abpTile.set(p.main, p.sub);
        }
        if (papTile && v.papSys) {
          const p = formatPressure(v.papSys, v.papDia, v.papMean);
          papTile.set(p.main, p.sub);
        }
        if (cvpTile && v.cvpMean) cvpTile.set(single(v.cvpMean), '');
        if (prTile && v.pr) prTile.set(single(v.pr), '');
        if (piTile && v.pi) piTile.set(single(v.pi, 1), '');
        if (nibpTile && v.nibpSys && v.nibpSys.value !== null) {
          nibpLast = { sys: v.nibpSys.value, dia: v.nibpDia?.value ?? 0, map: v.nibpMean?.value ?? 0, at: e.t };
          const n = formatNibp(undefined, nibpLast);
          nibpTile.set(n.main, n.sub, n.status);
        }
      }
      if (e.type === 'nibp' && nibpTile) {
        const n = formatNibp(e, nibpLast);
        nibpTile.set(n.main, n.sub, n.status);
      }
      if (e.type === 'tone' && (e.kind !== 'qrs' || !r || r.audio.beep.enabled)) {
        scheduler?.enqueue({
          t: e.t, id: e.id, kind: e.kind,
          ...(e.freqHz !== undefined ? { freqHz: e.freqHz } : {}),
          ...(e.refT !== undefined ? { refT: e.refT } : {}),
          ...(e.chargeS !== undefined ? { chargeS: e.chargeS } : {}), // Stage 4b (E-4a-3)
        });
      }
      if (e.type === 'toneCancel') {
        if (e.ids) scheduler?.cancel(e.ids);
        else scheduler?.cancelAfter(e.after);
      }
      for (const fn of listeners) fn(e);
    }
    ui?.paint(a.simT);
    sounder?.pump(a.simT);
  };

  const sizeOf = (): Size => ({
    cssW: Math.max(200, wrap.clientWidth),
    cssH: Math.max(100, wrap.clientHeight),
    dpr: globalThis.devicePixelRatio || 1,
  });
  const only: LaneOverride | undefined = opts.lanes || opts.waves ? { ...(opts.lanes ? { lanes: opts.lanes } : {}), waves: opts.waves ?? [] } : undefined;
  const engineOpts: EngineOptions | undefined = r ? { ...(opts.engine ?? {}), device: { ...(opts.engine?.device ?? {}), skin: opts.skin as string } } : opts.engine;
  const coreOpts = {
    ...(engineOpts ? { engine: engineOpts } : {}),
    ...(opts.lanes ? { lanes: opts.lanes } : {}),
    ...(opts.waves ? { waves: opts.waves } : {}), // Stage 2
    ...(opts.fps ? { fps: opts.fps } : {}),
    ...(opts.pxPerMm ? { pxPerMm: opts.pxPerMm } : {}),
    ...(r ? { plan: renderPlan(r, page, only) } : {}), // Stage 4b
  };
  const hostP: Promise<Host> = createHost(canvas, sizeOf(), coreOpts, opts.worker ?? 'auto', onEvents);
  const skinCmd = (body: Record<string, unknown>) => ({ id: `skin-${Math.random().toString(36).slice(2)}`, issuedBy: 'renderer', ...body }) as Command;
  if (r) void hostP.then((h) => h.command(skinCmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: filterModeFor(r!.render.ecgFilter.band) } })));

  // Resize and DPR changes (brief §3.5: backing store = CSS size × DPR; watch DPR through matchMedia).
  const ro = new ResizeObserver(() => void hostP.then((h) => h.control({ type: 'resize', size: sizeOf() })));
  ro.observe(wrap);
  let mq: MediaQueryList | null = null;
  const watchDpr = () => {
    mq?.removeEventListener('change', onDpr);
    mq = matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`);
    mq.addEventListener('change', onDpr);
  };
  const onDpr = () => {
    void hostP.then((h) => h.control({ type: 'resize', size: sizeOf() }));
    watchDpr();
  };
  watchDpr();
  const pumpTimer = setInterval(() => sounder?.pump(simNow()), SOUNDER_PUMP_MS);

  /** Stage 4b: the alarm voice of the current skin (profile + the skin's cadence overrides, brief §3.8). */
  const makeSounder = () => {
    if (!scheduler || !r) return;
    sounder?.dispose();
    const a = r.audio.alarm;
    sounder = new AlarmSounder(scheduler, getAlarmProfile(a.profile), { overrides: { repeatS: a.repeatS, lowPulses: a.lowPulses, volume: a.volume, silence: a.silence } });
    const s = scheduler;
    bridge = new AlarmAudioBridge(sounder, () => s.clock.timeScale);
    if (lastStatus) bridge.onStatus({ ...lastStatus, t: simNow() });
  };

  const dispatch = (cmd: Command) =>
    hostP.then(async (h) => {
      const res = await h.command(cmd);
      if (res.accepted) eventLog.command(cmd, anchor.simT); // Stage 4b
      return res;
    });
  return {
    dispatch,
    on(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    calibrate: (pxPerMm) => void hostP.then((h) => h.control({ type: 'calibrate', pxPerMm })),
    enableSound() {
      // Idempotent: two quick taps must not create two AudioContexts (iOS caps live contexts; review M7).
      soundP ??= unlockAudio(() => scheduler?.clear()).then((out) => {
        audio = out;
        play = playerFor(out, r);
        scheduler = new ToneScheduler({
          audioNow: () => out.ctx.currentTime,
          perfToAudio: out.perfToAudio,
          outputLatency: out.outputLatency,
          play: (tone, when) => play?.(tone, when),
        });
        scheduler.clock.setAnchor({ simT: anchor.simT, perfMs: anchor.perfMs, timeScale: anchor.timeScale });
        scheduler.start();
        makeSounder();
      });
      return soundP;
    },
    setTimeScale: (k) => void hostP.then((h) => h.control({ type: 'timeScale', k })),
    pause: () => void hostP.then((h) => h.control({ type: 'pause' })),
    resume: () => void hostP.then((h) => h.control({ type: 'resume' })),
    setFps: (fps) => void hostP.then((h) => h.control({ type: 'fps', fps })),
    destroy() {
      ro.disconnect();
      clearInterval(pumpTimer);
      mq?.removeEventListener('change', onDpr);
      sounder?.dispose();
      scheduler?.stop();
      audio?.close();
      ui?.destroy();
      void hostP.then((h) => h.destroy());
      outer.remove();
    },
    renderPath: hostP.then((h) => h.path),
    get audioLog() {
      return scheduler?.log ?? [];
    },
    engine: { dispatch },
    role: opts.role ?? 'host',
    snapshot: () => hostP.then((h) => h.snapshot()),
    restore: (s) => hostP.then((h) => h.restore(s)),
    async setSkin(id, o = {}) {
      if (!ui || !r) throw new Error('setSkin needs a skin at mount (MountOptions.skin)');
      const next = resolveSkin(id, o.theme ? { theme: o.theme } : {});
      const h = await hostP;
      if (next.id !== r.id) await h.command(skinCmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: id } }));
      await h.command(skinCmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: filterModeFor(next.render.ecgFilter.band) } }));
      const soundChanged = next.audio.alarm.profile !== r.audio.alarm.profile || next.skin.defib?.toneSet !== r.skin.defib?.toneSet;
      r = next;
      page = o.page;
      h.control({ type: 'plan', plan: renderPlan(next, page, only) });
      ui.setSkin(next, page);
      root.style.background = next.render.background;
      if (soundChanged && audio) {
        play = playerFor(audio, next);
        makeSounder();
      }
    },
    get skin() {
      return r;
    },
    capture12: () => hostP.then((h) => h.capture12()),
    trends,
    eventLog,
  };
}
```

In `packages/renderer/src/skin-plan.ts` (edit 1 of 2), replace this block (it occurs exactly once):

```ts
}

export function renderPlan(r: ResolvedSkin, page?: string): RenderPlan {
  const s = r.skin;
  const pg = s.pages.find((p) => p.id === (page ?? s.defaultPage));
  const laneIds = pg?.lanes ?? s.layout.lanes;
  const gainOptions = s.ecg.gainOptions.filter((g): g is number => typeof g === 'number');
  const filterNames: Record<string, string> = {};
```

with:

```ts
}

/** Pages that name their lanes (Stage 1/2/5 demos pass `lanes`/`waves`) keep them, in the skin's colours. */
export interface LaneOverride {
  lanes?: readonly LeadId[];
  waves?: readonly WaveLaneId[];
}
const WAVE_LANE: Record<WaveLaneId, LaneId> = { abp: 'ART', pleth: 'PLETH', cvp: 'CVP', pap: 'PAP' };

export function renderPlan(r: ResolvedSkin, page?: string, only?: LaneOverride): RenderPlan {
  const s = r.skin;
  const pg = s.pages.find((p) => p.id === (page ?? s.defaultPage));
  const laneIds: readonly LaneId[] = only
    ? [...(only.lanes ?? ['ecgII']).map((_, i) => `ECG${Math.min(3, i + 1)}` as LaneId), ...(only.waves ?? []).map((w) => WAVE_LANE[w])]
    : (pg?.lanes ?? s.layout.lanes);
  const leadAt = (i: number): LeadId => (only?.lanes ? (only.lanes[i] ?? 'ecgII') : leadOf(s.ecg.laneLeads[i] ?? s.ecg.laneLeads[0] ?? 'II'));
  const gainOptions = s.ecg.gainOptions.filter((g): g is number => typeof g === 'number');
  const filterNames: Record<string, string> = {};
```

In `packages/renderer/src/skin-plan.ts` (edit 2 of 2), replace this block (it occurs exactly once):

```ts
    const mmPerS = rl?.mmPerS ?? s.sweep.ibp.default;
    if (id.startsWith('ECG')) {
      const lead = leadOf(s.ecg.laneLeads[ecgIndex++] ?? s.ecg.laneLeads[0] ?? 'II');
      return { id, kind: 'ecg', channel: lead, color, mmPerS, gainMmPerMv: rl?.gainMmPerMv ?? 10, autoGain: rl?.autoGain ?? false, gainOptions, range: null, label: s.ecg.laneLabel };
    }
```

with:

```ts
    const mmPerS = rl?.mmPerS ?? s.sweep.ibp.default;
    if (id.startsWith('ECG')) {
      const lead = leadAt(ecgIndex++);
      return { id, kind: 'ecg', channel: lead, color, mmPerS, gainMmPerMv: rl?.gainMmPerMv ?? 10, autoGain: rl?.autoGain ?? false, gainOptions, range: null, label: s.ecg.laneLabel };
    }
```

- [ ] **Step 4: Run the tests and the type check**

```bash
cd packages/renderer && npx vitest run test/skin-plan.test.ts; cd -
npx -y pnpm@9.15.9 -r typecheck
```
Expected: `Tests  6 passed (6)`; the type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/device-ui.ts packages/renderer/src/index.ts packages/renderer/src/mount.ts packages/renderer/src/skin-plan.ts packages/renderer/test/skin-plan.test.ts
git commit -m "feat(renderer): mountMonitor follows the skin — lanes, tiles, alarm header, alarm sound and device tones (RR-5, RR-6), setSkin, capture12, trends, event log" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 22: Demo page `stage4b-device.html`

**Files:**
- Modify: `apps/demo/index.html`
- Create: `apps/demo/src/stage4b/device.ts`
- Create: `apps/demo/stage4b-device.html`
- Modify: `apps/demo/vite.config.ts`

**Interfaces:**
- Consumes: `mountMonitor`, `draw12Lead`, `drawTrend` (Tasks 20–21).
- Produces: `apps/demo/stage4b-device.html` with `window.__pme4b = { pm, send, events, ready }` (the e2e hook of Task 23).

- [ ] **Step 1: Implement**

In `apps/demo/index.html`, replace this block (it occurs exactly once):

```html
      <li><a href="./stage4a-skins.html">Stage 4a: skin preview and alarm sound profiles</a></li>
```

with:

```html
      <li><a href="./stage4a-skins.html">Stage 4a: skin preview and alarm sound profiles</a></li>
      <li><a href="./stage4b-device.html">Stage 4b: device layer (alarms, defibrillator, pacer, 12-lead, trends)</a></li>
```

Create `apps/demo/src/stage4b/device.ts`:

```ts
// Stage 4b demo (BUILD-PLAN Stage 4 "Demo"): the live monitor in each skin, alarm test controls, defibrillator and
// pacer controls, the 12-lead report, trends and the event log with export. window.__pme4b is the e2e hook.
import { RHYTHM_IDS, type Capture12, type Command, type EngineEvent, type NumericId, type RhythmId } from '@pme/engine-core';
import { draw12Lead, drawTrend, mountMonitor, type TrendSeries } from '@pme/renderer';

type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const q = new URLSearchParams(location.search);
const skin0 = q.get('skin') ?? 'saadat-like';
const pm = mountMonitor($('monitor'), {
  skin: skin0,
  ...(q.get('theme') ? { theme: q.get('theme') as string } : {}),
  engine: { seed: Number(q.get('seed') ?? 7), patient: { sensors: { abp: 'connected', cvp: 'connected', spo2: 'on', nibp: 'on' } } },
});
let n = 0;
const events: EngineEvent[] = [];
pm.on((e) => {
  if (e.type !== 'measurement' && e.type !== 'beat' && e.type !== 'tone') events.push(e);
  if (events.length > 5000) events.splice(0, 1000);
});
const send = (c: CommandBody) => pm.dispatch({ id: `4b-${++n}`, issuedBy: 'stage4b', ...c } as Command);
let lastCapture: Capture12 | null = null;
(window as unknown as { __pme4b: unknown }).__pme4b = { pm, send, events, ready: true };

$<HTMLSelectElement>('skin').value = skin0;
const reskin = () => void pm.setSkin($<HTMLSelectElement>('skin').value, { ...($<HTMLSelectElement>('theme').value ? { theme: $<HTMLSelectElement>('theme').value } : {}), ...($<HTMLSelectElement>('page').value ? { page: $<HTMLSelectElement>('page').value } : {}) });
for (const id of ['skin', 'theme', 'page']) $(id).addEventListener('change', reskin);
$('age').addEventListener('change', () => void send({ type: 'device', action: { device: 'monitor', action: 'ageBand', value: $<HTMLSelectElement>('age').value } }));
$('sound').addEventListener('click', () => void pm.enableSound());

const rs = $<HTMLSelectElement>('rhythm');
for (const id of RHYTHM_IDS) rs.add(new Option(id, id));
rs.value = 'sinus';
rs.addEventListener('change', () => void send({ type: 'setRhythm', rhythm: rs.value as RhythmId }));
$('hr').addEventListener('input', () => {
  $('hrVal').textContent = $<HTMLInputElement>('hr').value;
  void send({ type: 'setTarget', variable: 'hr', value: Number($<HTMLInputElement>('hr').value) });
});
const toggle = (id: string, fn: (on: boolean) => void) =>
  $(id).addEventListener('click', () => {
    const on = $(id).getAttribute('aria-pressed') !== 'true';
    $(id).setAttribute('aria-pressed', String(on));
    fn(on);
  });
toggle('leads', (on) => void send({ type: 'attachSensor', sensor: 'ecg', state: on ? 'off' : 'on' }));
toggle('probe', (on) => void send({ type: 'attachSensor', sensor: 'spo2', state: on ? 'off' : 'on' }));
$('nibp').addEventListener('click', () => void send({ type: 'device', action: { device: 'nibp', action: 'start' } }));
for (const a of ['silence', 'pause', 'ack'] as const) $(a).addEventListener('click', () => void send({ type: 'device', action: { device: 'alarm', action: a } }));
$('allOn').addEventListener('click', () => void send({ type: 'device', action: { device: 'alarm', action: 'enableAll', value: true } }));
toggle('arr', (on) => void send({ type: 'device', action: { device: 'alarm', action: 'arrhythmiaAnalysis', value: on } }));

const defib = (action: 'charge' | 'shock' | 'disarm' | 'syncOn' | 'syncOff' | 'preselect', extra: Record<string, unknown> = {}) =>
  send({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } } as CommandBody);
$('charge').addEventListener('click', () => void defib('charge', { energyJ: Number($<HTMLInputElement>('energy').value) }));
$('shock').addEventListener('click', () => {
  const pre = $<HTMLSelectElement>('preselect').value;
  void (pre ? defib('preselect', { outcome: pre }) : Promise.resolve()).then(() => defib('shock'));
});
$('disarm').addEventListener('click', () => void defib('disarm'));
toggle('sync', (on) => void defib(on ? 'syncOn' : 'syncOff'));
toggle('ppause', () => undefined);
$('papply').addEventListener('click', () => {
  void send({ type: 'setTarget', variable: 'paceThresholdMa', value: Number($<HTMLInputElement>('pthr').value) });
  void send({
    type: 'applyEvent',
    event: {
      kind: 'pacer', action: 'set', mode: $<HTMLSelectElement>('pmode').value as 'off', ratePpm: Number($<HTMLInputElement>('prate').value), mA: Number($<HTMLInputElement>('pma').value),
      pause: $('ppause').getAttribute('aria-pressed') === 'true', fault: $<HTMLSelectElement>('pfault').value as 'none',
    },
  });
});

// 12-lead report (brief §6.6): dialog with PNG / JSON / print
$('capture').addEventListener('click', async () => {
  lastCapture = await pm.capture12();
  const c = $<HTMLCanvasElement>('ecg12');
  draw12Lead(c.getContext('2d') as unknown as Parameters<typeof draw12Lead>[0], lastCapture, 4);
  $<HTMLDialogElement>('dlg').showModal();
});
$('close').addEventListener('click', () => $<HTMLDialogElement>('dlg').close());
const download = (name: string, href: string) => Object.assign(document.createElement('a'), { download: name, href }).click();
$('png').addEventListener('click', () => download('12-lead.png', $<HTMLCanvasElement>('ecg12').toDataURL('image/png')));
$('cjson').addEventListener('click', () => {
  if (!lastCapture) return;
  const leads = Object.fromEntries(Object.entries(lastCapture.leads).map(([k, v]) => [k, Array.from(v, (x) => +x.toFixed(4))]));
  download('12-lead.json', URL.createObjectURL(new Blob([JSON.stringify({ ...lastCapture, leads })], { type: 'application/json' })));
});

// trends and event log (brief §6.7)
for (const b of document.querySelectorAll<HTMLButtonElement>('#tabs [data-tab]')) {
  b.addEventListener('click', () => {
    for (const x of document.querySelectorAll('#tabs [data-tab]')) x.setAttribute('aria-selected', String(x === b));
    for (const p of document.querySelectorAll<HTMLElement>('[data-pane]')) p.hidden = p.dataset.pane !== b.dataset.tab;
  });
}
$('csv').addEventListener('click', () => download('event-log.csv', URL.createObjectURL(new Blob([pm.eventLog.toCSV()], { type: 'text/csv' }))));
$('json').addEventListener('click', () => download('event-log.json', URL.createObjectURL(new Blob([JSON.stringify(pm.eventLog.toJSON())], { type: 'application/json' }))));
const SERIES: Array<[NumericId, [number, number]]> = [['hr', [0, 200]], ['abpSys', [0, 200]], ['abpDia', [0, 200]], ['spo2', [50, 100]], ['nibpSys', [0, 200]]];
setInterval(() => {
  const s = pm.skin;
  const color = (id: NumericId) => (id === 'hr' ? s?.skin.colors.HR : id.startsWith('abp') ? (s?.skin.colors.ART ?? s?.skin.colors.IBP1) : id === 'spo2' ? s?.skin.colors.SpO2 : s?.skin.colors.NIBP) ?? '#fff';
  const series: TrendSeries[] = SERIES.map(([id, range]) => ({ id, range, color: color(id) }));
  const to = pm.trends.latestS;
  const c = $<HTMLCanvasElement>('trendCanvas');
  drawTrend(c.getContext('2d') as unknown as Parameters<typeof drawTrend>[0], pm.trends, series, Math.max(0, to - Number($<HTMLSelectElement>('span').value)), Math.max(1, to), c.width, c.height, s?.skin.trend.style ?? 'line', s?.render.background ?? '#000');
  $('log').textContent = pm.eventLog.entries.slice(-200).map((e) => `${e.t.toFixed(1).padStart(8)}  ${e.kind.padEnd(7)} ${e.issuedBy ?? ''}  ${e.text}`).join('\n');
}, 1000);
```

Create `apps/demo/stage4b-device.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 4b: device layer</title>
    <style>
      body { background: #111; color: #ccc; font: 14px system-ui, sans-serif; margin: 12px; }
      #monitor { height: 560px; max-width: 1280px; border: 1px solid #333; }
      .controls { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin: 10px 0; max-width: 1280px; }
      fieldset { border: 1px solid #333; padding: 6px 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
      legend { color: #888; }
      button, select, input { font: inherit; }
      button[aria-pressed='true'] { background: #2a2; color: #000; }
      #tabs button[aria-selected='true'] { background: #357; color: #fff; }
      #trendCanvas { width: 1200px; height: 300px; background: #000; display: block; }
      #log { max-height: 260px; overflow: auto; font: 12px ui-monospace, monospace; white-space: pre; background: #000; padding: 6px; }
      dialog { background: #fff; color: #000; max-width: 96vw; }
      #ecg12 { width: 1080px; height: 540px; display: block; }
      @media print { body > *:not(dialog) { display: none; } }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div class="controls">
      <fieldset><legend>Skin</legend>
        <select id="skin">
          <option value="saadat-like">Saadat-like (factory)</option><option value="iran-icu-as-found">Saadat-like: iran-icu-as-found</option>
          <option value="philips-like">Philips-like OR</option><option value="zoll-like">ZOLL-like defib</option>
          <option value="lifepak-like">LIFEPAK-like defib</option><option value="mindray-like">Mindray-like</option><option value="ge-like">GE-like</option>
        </select>
        <select id="theme"><option value="">dark</option><option value="projector-light">projector-light</option><option value="ecg-grid">ecg-grid</option></select>
        <select id="page"><option value="">default page</option><option value="P10">P10 PUMP (saadat-like)</option></select>
        <select id="age"><option value="adult">adult</option><option value="paed">paediatric</option><option value="neo">neonatal</option></select>
        <button id="sound">Enable sound</button>
      </fieldset>
      <fieldset><legend>Patient</legend>
        <select id="rhythm"></select>
        <label>HR <input id="hr" type="range" min="20" max="220" value="75" /> <span id="hrVal">75</span></label>
        <button id="leads" aria-pressed="false">ECG leads off</button>
        <button id="probe" aria-pressed="false">SpO2 probe off</button>
        <button id="nibp">NIBP start</button>
      </fieldset>
      <fieldset><legend>Alarms</legend>
        <button id="silence">Silence</button><button id="pause">Pause</button><button id="ack">Ack</button>
        <button id="allOn">All alarms ON</button><button id="arr" aria-pressed="false">Arrhythmia analysis</button>
      </fieldset>
      <fieldset><legend>Defibrillator</legend>
        <label>J <input id="energy" type="number" min="1" max="360" value="200" style="width:4.5em" /></label>
        <button id="charge">Charge</button><button id="shock">Shock</button><button id="sync" aria-pressed="false">Sync</button><button id="disarm">Disarm</button>
        <select id="preselect"><option value="">outcome: table</option><option value="sinus">convert → sinus</option><option value="asystole">→ asystole</option><option value="unchanged">no change</option></select>
      </fieldset>
      <fieldset><legend>Pacer</legend>
        <select id="pmode"><option>off</option><option>demand</option><option>fixed</option></select>
        <label>ppm <input id="prate" type="number" min="30" max="180" value="70" style="width:4em" /></label>
        <label>mA <input id="pma" type="number" min="0" max="140" value="0" style="width:4em" /></label>
        <label>threshold <input id="pthr" type="number" min="10" max="200" value="70" style="width:4em" /></label>
        <select id="pfault"><option value="none">no fault</option><option value="failureToSense">failure to sense</option><option value="failureToCapture">failure to capture</option></select>
        <button id="ppause" aria-pressed="false">Pause</button><button id="papply">Apply</button>
      </fieldset>
      <fieldset><legend>Records</legend><button id="capture">12-lead</button></fieldset>
    </div>
    <div id="tabs" class="controls"><button data-tab="trends" aria-selected="true">Trends</button><button data-tab="log" aria-selected="false">Event log</button>
      <select id="span"><option value="600">10 min</option><option value="3600">1 h</option><option value="28800">8 h</option></select>
      <button id="csv">Export CSV</button><button id="json">Export JSON</button></div>
    <div data-pane="trends"><canvas id="trendCanvas" width="1200" height="300"></canvas></div>
    <div data-pane="log" hidden><div id="log"></div></div>
    <dialog id="dlg"><canvas id="ecg12" width="1080" height="540"></canvas>
      <p><button id="png">PNG</button> <button id="cjson">JSON</button> <button onclick="window.print()">Print</button> <button id="close">Close</button></p></dialog>
    <script type="module" src="./src/stage4b/device.ts"></script>
  </body>
</html>
```

In `apps/demo/vite.config.ts`, replace this block (it occurs exactly once):

```ts
        'stage4a-skins': page('stage4a-skins'),
```

with:

```ts
        'stage4a-skins': page('stage4a-skins'),
        'stage4b-device': page('stage4b-device'), // Stage 4b
```

- [ ] **Step 2: Type check and look at the page**

```bash
npx -y pnpm@9.15.9 -r typecheck
npx -y pnpm@9.15.9 --filter @pme/demo exec vite --port 5214 --strictPort
```
Expected: the type check exits 0. Open `http://localhost:5214/stage4b-device.html` in Chrome: the saadat-like monitor sweeps with a grey idle alarm bar, red crossed bells and a green ECG; choose "vfCoarse" in the rhythm list and within ~4 s the bar turns red with `ECG VFIB`. Stop the server (Ctrl-C). (If you cannot open a browser, Task 23 checks the same headless.)

- [ ] **Step 3: Commit**

```bash
git add apps/demo/index.html apps/demo/src/stage4b/device.ts apps/demo/stage4b-device.html apps/demo/vite.config.ts
git commit -m "feat(demo): stage4b device page — skins, alarm tests, defibrillator, pacer, 12-lead report, trends and event log" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 23: Playwright gate evidence on the live monitor

**Files:**
- Create: `apps/demo/e2e/stage4b-device.e2e.ts`
- Create (by running it): `docs/gates/stage-4b/{saadat-like,philips-like,zoll-like}--{idle,raised,silenced}.png`, `docs/gates/stage-4b/zoll-like--ecg-grid.png`, `docs/gates/stage-4b/12-lead-3x4.png`, `docs/gates/stage-4b/audio-timing.json`

**Interfaces:**
- Consumes: `window.__pme4b` (Task 22), the `.pme-bar`, `.pme-lamp`, `.pme-cd`, `.pme-stile[data-param]` elements (Task 20), `#skin`, `#theme`, `#capture`, `#ecg12`, `#sound` (Task 22).
- Produces: the gate evidence files above.

- [ ] **Step 1: Write the e2e file**

Create `apps/demo/e2e/stage4b-device.e2e.ts`:

```ts
// Gate 4b evidence on the LIVE monitor: per-skin screenshots with the alarm bar idle / raised / silenced, the CSS
// flash rates, a skin switch without an engine restart, the 12-lead report, and the audio timing log.
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage4b-device.e2e.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/stage-4b');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Hook = { send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; events: Array<{ type: string; t: number; [k: string]: unknown }> };
const send = (page: Page, c: Record<string, unknown>) => page.evaluate((c) => (window as unknown as { __pme4b: Hook }).__pme4b.send(c), c);
const simT = (page: Page) => page.evaluate(() => {
  const ev = (window as unknown as { __pme4b: Hook }).__pme4b.events.filter((e) => e.type === 'alarmStatus');
  return ev.length ? ev[ev.length - 1]!.t : -1;
});

async function open(page: Page, skin: string) {
  await page.goto(`${base}/stage4b-device.html?skin=${skin}`);
  await page.waitForFunction(() => (window as unknown as { __pme4b?: { ready: boolean } }).__pme4b?.ready === true);
  await page.waitForTimeout(3000);
}

test('live monitor per skin: alarm bar idle, raised (VF), silenced', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1300, height: 640 });
  for (const skin of ['saadat-like', 'philips-like', 'zoll-like']) {
    await open(page, skin);
    await page.locator('#monitor').screenshot({ path: resolve(out, `${skin}--idle.png`) });
    await send(page, { type: 'setRhythm', rhythm: 'vfCoarse' });
    await expect(page.locator('.pme-bar')).toContainText(/VFIB/, { timeout: 8000 });
    await page.waitForTimeout(1500);
    await page.locator('#monitor').screenshot({ path: resolve(out, `${skin}--raised.png`) });
    await send(page, { type: 'device', action: { device: 'alarm', action: 'silence' } });
    await expect(page.locator('.pme-cd')).toContainText(/\d+s/, { timeout: 3000 });
    await page.waitForTimeout(1000);
    await page.locator('#monitor').screenshot({ path: resolve(out, `${skin}--silenced.png`) });
    if (skin === 'saadat-like') await expect(page.locator('.pme-bar')).toHaveText(''); // silence hides the visual (brief §6.4.1)
    else await expect(page.locator('.pme-bar')).toContainText(/VFIB/); // IEC-style: audio only
  }
  expect(errors).toEqual([]);
});

test('flash rates: high 2.0 Hz, medium 0.6 Hz, 50 % duty (computed CSS)', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'philips-like');
  await send(page, { type: 'setTarget', variable: 'hr', value: 150 });
  await expect(page.locator('.pme-bar')).toContainText(/\*\*HR/, { timeout: 15_000 });
  const l2 = await page.locator('.pme-lamp').evaluate((e) => getComputedStyle(e).animationDuration);
  expect(parseFloat(l2)).toBeCloseTo(1 / 0.6, 3);
  await send(page, { type: 'setRhythm', rhythm: 'vfCoarse' });
  await expect(page.locator('.pme-bar')).toContainText(/VFIB/, { timeout: 8000 });
  const l1 = await page.locator('.pme-lamp').evaluate((e) => getComputedStyle(e).animationDuration);
  expect(parseFloat(l1)).toBeCloseTo(0.5, 3);
  const css = await page.evaluate(() => [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n'));
  expect(css).toContain('@keyframes pme-blink{0%{opacity:1}50%{opacity:0.12}}');
});

test('skin switch relayouts lanes and tiles without restarting the engine', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'saadat-like');
  const t0 = await simT(page);
  await page.selectOption('#skin', 'zoll-like');
  await page.waitForTimeout(1500);
  const t1 = await simT(page);
  expect(t1).toBeGreaterThan(t0);
  await expect(page.locator('.pme-stile[data-param="CO2"]')).toHaveCount(1);
  await page.selectOption('#theme', 'ecg-grid');
  await page.waitForTimeout(1500);
  await page.locator('#monitor').screenshot({ path: resolve(out, 'zoll-like--ecg-grid.png') });
  expect(await simT(page)).toBeGreaterThan(t1);
});

test('12-lead report: 3×4 + rhythm strip screenshot', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'zoll-like');
  await page.waitForTimeout(8000); // 10 s of ECG
  await page.click('#capture');
  await expect(page.locator('#dlg')).toBeVisible();
  await page.locator('#ecg12').screenshot({ path: resolve(out, '12-lead-3x4.png') });
});

test('audio timing log: alarm pulses, charge / ready / shock tones', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, 'zoll-like');
  await page.click('#sound');
  await send(page, { type: 'setRhythm', rhythm: 'vfCoarse' });
  await send(page, { type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 120 } });
  await page.waitForTimeout(9000);
  await send(page, { type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
  await page.waitForTimeout(3000);
  const log = await page.evaluate(() => (window as unknown as { __pme4b: { pm: { audioLog: Array<{ id: string; kind: string; simT: number; when: number; lateS: number; dropped: boolean }> } } }).__pme4b.pm.audioLog);
  const kinds = new Set(log.map((e) => e.kind));
  for (const k of ['alarm', 'charge', 'chargeReady', 'shock']) expect(kinds.has(k), k).toBe(true);
  const alarm = log.filter((e) => e.kind === 'alarm');
  const late = alarm.map((e) => e.lateS);
  writeFileSync(
    resolve(out, 'audio-timing.json'),
    `${JSON.stringify({ skin: 'zoll-like', counts: Object.fromEntries([...kinds].map((k) => [k, log.filter((e) => e.kind === k).length])), alarmMaxLateS: Math.max(...late), entries: log }, null, 1)}\n`,
  );
  expect(Math.max(...late)).toBeLessThan(0.15);
});
```

- [ ] **Step 2: Run it**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/stage4b-device.e2e.ts
```
Expected: `5 passed` (about 1–2 minutes). Failures and what they mean: the VFIB bar text not appearing within 8 s means the device layer is not stepping (Task 9); a flash duration other than 0.5 s / 1.667 s means `flashCss` or the lamp classes (Task 20); no `alarm` entries in the audio log means `enableSound` did not build the sounder (Task 21).

- [ ] **Step 3: Look at every screenshot** (open them; this is the gate evidence)

Check, and write what you see into the gate note (Task 25):
- `saadat-like--idle.png`: grey idle bar, red crossed bells in the HR, NIBP, IBP1, IBP2, SpO2, TEMP and RR tiles and in the header, a green `II  X…  NORMAL` lane, magenta PLETH, salmon IBP1 (200/40 scale), light-blue IBP2, an empty RESP lane (Stage 3).
- `saadat-like--raised.png`: red bar `ECG VFIB` with black text, VF on the ECG lane, flat pleth and a decaying IBP1 (Stage 2: VF is pulseless). The lamp is red (or dark if the shot caught the off phase of the 2 Hz flash).
- `saadat-like--silenced.png`: the bar is grey and empty (Saadat-like silence hides the visual) and the header shows `🔇 119s`-style countdown.
- `philips-like--raised.png` / `--silenced.png`: red bar `***VFIB/VTACH` with white text in BOTH (IEC-style silence is audio only), the countdown ~`89s` in the silenced one.
- `zoll-like--*.png`: three lanes (ECG, PLETH, CO2), four tiles; same bar behaviour as philips-like with a 90 s countdown.
- `zoll-like--ecg-grid.png`: ECG-paper grid under the traces, readable traces on the dimmed major lines, no black gaps left by the erase bar.
- `12-lead-3x4.png`: 3 rows × 4 columns (I aVR V1 V4 / II aVL V2 V5 / III aVF V3 V6), a lead II rhythm strip, one 1 mV × 200 ms calibration pulse per row, header `II  25 mm/s  10 mm/mV  0.05–150 Hz  HR 75  axis …°`.

- [ ] **Step 4: Commit**

```bash
git add apps/demo/e2e/stage4b-device.e2e.ts docs/gates/stage-4b
git commit -m "test(e2e): stage 4b live-monitor screenshots per skin and alarm state, flash rates, skin switch, 12-lead, audio timing" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 24: Whole-repo verification (nothing to write)

**Files:** none (read-only), except reverting screenshots the older e2e suites rewrite.

**Interfaces:**
- Consumes: everything above.
- Produces: the numbers for the gate note.

- [ ] **Step 1: Type check, unit tests, build, NOTICES**

```bash
npx -y pnpm@9.15.9 -r typecheck
npx -y pnpm@9.15.9 -r test 2>&1 | grep -E "Tests |FAIL"
npx -y pnpm@9.15.9 -r build 2>&1 | grep -E "error|patient-monitor.iife.js|dist/index.js"
npx -y pnpm@9.15.9 check-notices
```
Expected: typecheck exit 0; every package passes — engine-core = base + 67, renderer = base + 23, skins = base + 4, audio / controller / validation unchanged (plan author: 372, 54, 159, 58, 97, 16); build exit 0 (renderer IIFE about 629 kB); `check-notices: OK`.

- [ ] **Step 2: The older browser suites still pass**

```bash
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/iife-smoke.e2e.ts apps/demo/e2e/stage4a-skins.e2e.ts apps/demo/e2e/stage6a.e2e.ts apps/demo/e2e/stage6a-worker.e2e.ts apps/demo/e2e/stage6a-screens.e2e.ts
git status --short docs/gates
git checkout -- docs/gates/stage-4a docs/gates/stage-6a
```
Expected: all pass. Those suites rewrite their own gate screenshots (4a's are palette-shrunk after capture), so the `git checkout` drops the rewritten PNGs; `git status --short` afterwards shows nothing under `docs/gates/stage-4a` or `stage-6a`. If `iife-smoke` fails with a strict-mode `.pme-tile` error, Task 21's HR-only `pme-tile` class is missing.

- [ ] **Step 3: No edits outside the ownership list**

```bash
git diff --name-only origin/main...HEAD | grep -vE '^(packages/engine-core/src/(l3/(alarms|defib-pacer|capture12|trends)/|l3/device-layer.ts|l3/ecg-filter.ts|engine.ts|types.ts|types-device.ts|index.ts)|packages/engine-core/(test/|package.json)|packages/renderer/|packages/skins/|apps/demo/(stage4b-device.html|src/stage4b/|e2e/stage4b-device.e2e.ts|vite.config.ts|index.html)|docs/gates/stage-4b|docs/plans/stage-4b|pnpm-lock.yaml)' || echo "ownership OK"
```
Expected: `ownership OK`.

---

### Task 25: Gate note

**Files:**
- Create: `docs/gates/stage-4b.md`

**Interfaces:**
- Consumes: the numbers from Tasks 1, 23 and 24.
- Produces: the orchestrator's gate evidence.

- [ ] **Step 1: Write the gate note** — create `docs/gates/stage-4b.md` with the text below. Where your measured value differs from the plan author's (in parentheses in the Evidence table), write yours and say so under "Deviations".

```markdown
# Stage 4b gate: the device layer

*Branch `stage-4b-device-layer`. Plan: `docs/plans/stage-4b-device-layer.md`. Base: `origin/main` with Stage 2 merged.*

## What landed

- **Alarm engine** (`packages/engine-core/src/l3/alarms/**`, `l3/device-layer.ts`): conditions (limits on displayed numerics by age band, desaturation, asystole, VF, VT runs, brady/tachy or extreme brady/tachy, pause, PVCs/min, leads off, SpO2 probe off, NIBP failed), the life cycle (onset delay, IEC-style latching, silence, pause, acknowledge) and one `alarmStatus` summary per change and per second; Saadat-like factory OFF with ASYSTOLE/VFIB/VTAC/APNEA always on; skin and age band switchable at run time (`device monitor skin|ageBand`).
- **Defibrillator and pacer** (`l3/defib-pacer/**`): energy, charge time and tones, ready, auto-disarm; sync markers and the sync shock; Stage 5's rail artefact on every lead; the post-shock table on the `outcome` stream with the instructor pre-selection; TCP through Stage 5's `Modifiers.tcp` with the capture threshold from `PatientState.paceThresholdMa`, demand/fixed, pause, failure to sense/capture.
- **12-lead capture, trends, event log** (`l3/capture12`, `l3/trends`).
- **Renderer**: skin plan (RR-1), grid painter (RR-4), cursor line (RR-3), auto gain (RR-2), skin tiles and alarm header (RR-5), `createTonePlayer` + `AlarmSounder` (RR-6), overlays, `setSkin`, `capture12()`, trends and event log on the handle; demo `apps/demo/stage4b-device.html`.
- **Engine requests**: E-4a-1 (filter bands), E-4a-3 (alarm `level`, `chargeS`). E-4a-2 deferred (R-4b-5).
- **G4a follow-ups**: `ecg-grid` major line `#F4C4C4` (every trace ≥ 3:1 against it), `mindray-like` boxed alarm numerics, `LAYOUT UNVERIFIED` badge on `ge-like` and `mindray-like`.

## Evidence

| Check | Result (plan author's value in parentheses) |
|---|---|
| typecheck / build / check-notices | exit 0 / exit 0, renderer IIFE (628.9 kB) / OK |
| unit tests | engine-core (372), renderer (54), skins (159), audio (58), controller (97), validation (16); base was (305, 31, 155, 58, 97, 16) |
| `stage4b-device.e2e.ts` | (5 passed, 1.2 min); older suites iife-smoke, stage4a-skins, stage6a, stage6a-worker, stage6a-screens pass |
| Limit alarm timing | philips-like `**HR n>120` raised on the first displayed HR over 120 (no added delay); saadat-like `HR TOO HIGH` 1.00 s after the switch-on (skin `alarms.delayS`) |
| Asystole | saadat-like 10.0 ± 0.2 s, philips-like 4.0 ± 0.2 s after the last QRS |
| VF / VT | VFIB ≤ 3.3 s after VF starts; VTAC ≤ 0.1 s after the 5th ventricular beat |
| Saadat-like defaults | HR 170 raises nothing for 25 s; asystole and VF still raise at level 1; header all-off bell |
| Silence | saadat-like 120 s, bar grey, countdown, a new alarm ends it; philips-like 90 s, bar stays |
| Only the highest priority sounds | fake audio clock: an L2 train stops when an L1 is raised (10 L1 pulses, 0 L2) and resumes when it clears |
| Technical | ECG leads off → `ECG CHECK LA/RA/LL` level 3, no asystole for 35 s; SpO2 probe off → level 3 |
| Defibrillator | lifepak-like 200 J: ready (7.0 s), auto-disarm (60 s) later; rail on II, V5, V1; baseline < 0.1 mV at +5 s |
| Sync | markers within 20 ms of every R (sinus, AVNRT, flutter, AF, VT); sync shock 0–60 ms after R |
| Outcome table | 10,000 seeded VF shocks: persistent / asystole+PEA / ROSC within ±2 % of 0.30 / 0.60 / 0.10; low energy and VF duration modifiers exact |
| Pacer | below threshold: spikes, no capture, escape unchanged; above: capture after 100 % of spikes, QRS ≥ 140 ms, ABP peaks at the pacing rate (11 ± 1 in 9.4 s); demand inhibited; failure to sense asynchronous (25 ± 2 in 25 s) |
| 12-lead | 12 × 5000 samples; III = II − I, aVR, aVL, aVF identities to 1e-5 mV; diagnostic filter whatever the monitor filter |
| Trends / log | 8 h × 22 numerics in (2.53 MB); CSV rows per kind equal the logged events |
| Flash rates | computed CSS: high (0.5 s = 2.0 Hz), medium (1.66667 s = 0.6 Hz), keyframe at 50 % |
| Audio (live page, zoll-like) | alarm, charge, chargeReady and shock tones in the scheduler log; max alarm-pulse lateness (34 ms) — `docs/gates/stage-4b/audio-timing.json` |

Screenshots (`docs/gates/stage-4b/`): `saadat-like--{idle,raised,silenced}.png`, `philips-like--{idle,raised,silenced}.png`, `zoll-like--{idle,raised,silenced}.png`, `zoll-like--ecg-grid.png`, `12-lead-3x4.png`. What each shows: (write what you saw in Task 23 Step 3).

## Known limits

- VF is recognised from the rhythm truth after 3 s [ENG]; there is no waveform VF detector.
- APNEA, CO2 INOPs and the SpO2/EtCO2 numerics wait for Stage 3 (R-4b-1); their tiles show the skin's no-value glyph.
- Demand TCP with capture paces 2 % slow (R-4b-2).
- The `device ecg capture12` command stays rejected; use `MonitorHandle.capture12()`.
- HR averaging is Stage 1's on every skin (E-4a-2 deferred, R-4b-5).

## Requests

| ID | Owner | Request |
|---|---|---|
| R-4b-1 | Stage 3 | breath events/RR for APNEA; CO2 line INOP; EtCO2 jump after ROSC; SpO2/EtCO2 numerics |
| R-4b-2 | Stage 5.1 | TCP demand inhibition must ignore the pacer's own captured beats (68.4 vs 70 ppm) |
| R-4b-3 | Stage 2 | `paceThresholdMa` default 60 → 70 mA (brief §6.5); accept stage-4 variables in `validateTarget` |
| R-4b-4 | 6a | panel tab registration + vocabulary entries for the device commands |
| R-4b-5 | orchestrator | E-4a-2 HR moving-average-seconds and the AUTO source chain |
| R-4b-6 | validation | 12-lead PR/QRS/QT/QTc fiducials and the ProSim limb ratios on `capture12` |
| R-4b-7 | Ali | VF recognition delay, real sync-marker look, flashing numeric during Saadat-like silence |

## Deviations from the plan

(none, or list them)
```

- [ ] **Step 2: Commit**

```bash
git add docs/gates/stage-4b.md
git commit -m "docs(gates): stage 4b gate note — evidence, screenshots, requests" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 26: Pull request

**Files:** none.

- [ ] **Step 1: Push and open the PR (do not merge; R21)**

```bash
git push -u origin stage-4b-device-layer
gh pr create --base main --head stage-4b-device-layer --title "Stage 4b: device layer — alarm engine, skins live, defibrillator/pacer, 12-lead, trends" --body-file - <<'BODY'
## Stage 4b: device layer

Plan: `docs/plans/stage-4b-device-layer.md`. Gate note: `docs/gates/stage-4b.md` (screenshots in `docs/gates/stage-4b/`).

- Alarm engine in the engine (L3): limits by age band from the skin, asystole / VF / VT / brady-tachy / pause / PVCs, technical INOPs (leads off, SpO2 probe, NIBP failed), IEC-style and Saadat-like levels, delays, latching, silence (90 s audio-only / 120 s with visual suppression and cancel-on-new), pause, acknowledge; `alarmStatus` drives the header, tiles and alarm sound (only the highest priority sounds).
- Defibrillator: energy, charge time and tones, ready, auto-disarm, sync markers and sync shock ≤ 60 ms after R, rail artefact on every lead, post-shock rhythm from the brief's table on the `outcome` stream (10,000-shock frequency test). Pacer: capture threshold, demand/fixed, pause, failure to sense/capture, ABP pulses on capture.
- Renderer: skins live (RR-1…RR-6), `setSkin` without restart, auto gain, ECG-paper grid, pace/sync/shock/lead-off overlays, PUMP page; `capture12`, trends (8 h, 2.5 MB) and event log (CSV/JSON).
- E-4a-1 ECG filter bands; E-4a-3 alarm levels and charge time on events. E-4a-2 deferred (request R-4b-5).
- G4a follow-ups: dimmed ecg-grid major line, Mindray-like boxed alarm numerics, `LAYOUT UNVERIFIED` badge on GE-like / Mindray-like.

Requests to other stages: see the gate note (R-4b-1 … R-4b-7).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
```
Expected: the PR URL. Report it with the gate note path.

---

## Self-review (done while writing this plan)

**Spec coverage** (the Stage 4b brief and acceptance list → task):
- Alarm limit crossing raised after the vendor delay with priority/colour/text → Tasks 7, 9 (engine), 19 (bar colours), 23 (screenshots).
- Asystole 10 s (saadat-like) vs 4 s (philips-like) → Task 9. VF/VT from the rhythm → Tasks 8, 9.
- Silence hides visuals on saadat-like, 120 s countdown, a new alarm cancels → Tasks 7, 19, 23. Only the highest priority audible (fake audio clock) → Task 19.
- Alarms off by default on saadat-like except the four → Tasks 5, 7, 9. Age-band limits switch → Tasks 5, 9. Technical alarms on sensor detach → Tasks 8, 9.
- Defibrillator: charge tone → ready → shock artefact on all leads → post-shock rhythm per table (10,000 seeded draws) → Tasks 10, 12, 13; sync markers within 20 ms and the sync shock within 60 ms → Tasks 11, 13.
- Pacing: below threshold spikes without capture, above paced beats with Stage 5 morphology and Stage 2 ABP pulses, demand inhibition, failure to sense → Tasks 12, 13.
- 12-lead: 12 × 10 s arrays with the Einthoven identities, and a screenshot of the 3×4 layout → Tasks 14, 20, 23.
- Trends: 8 h at 1 Hz ≤ 3 MB; event log entries for every command/alarm/shock → Task 15.
- Renderer: skin switch relayouts without an engine restart; per-skin live screenshots with the alarm bar in each state; audio timing log → Tasks 18, 21, 23.
- G4a: ecg-grid contrast; mindray-like vs ge-like differentiation and the visible "layout unverified" mark → Tasks 2, 20.
- RR-1…RR-6, E-4a-1, E-4a-3 → Tasks 16–18 and 20–21, 4, 3/12; E-4a-2 deferred with a reason (Decision 21, R-4b-5).
- Overlays (pace marks, sync markers, shock marks, lead-off dashes) → Task 18; NBP measuring stays in the NIBP tile (Stage 2 formatter), which the brief's §6.3 describes.
- PUMP page → Tasks 16, 19, 20 (watermark, hidden scale numbers, ASYSTOLE kept through silence).

**Placeholder scan:** every code step carries the full file or an exact old/new block taken from the reference tree; the only fill-ins are the measured numbers of the gate note, which the executor measures in Tasks 23–24.

**Type consistency:** names were checked by compiling the reference tree after every task (`pnpm -r typecheck` exit 0 at each of the 23 prototype commits behind Tasks 1–23) and by running each task's own tests at its commit (the "Expected" counts); the plan was then re-applied to a fresh tree by a script that follows the Create / Replace / edit-block steps literally, and the result was byte-identical to the reference tree (generated screenshots and the gate note excepted).
