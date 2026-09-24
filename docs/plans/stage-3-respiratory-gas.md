# Stage 3: Respiratory, gas exchange and temperature (capnogram, CO2/O2 kinetics, SpO2 chain, RR, temperature) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The breathing side of the monitor — one respiratory driver (spontaneous, BVM, ventilator, external VentFrame, none) feeding a phase-built capnogram at 62.5 Hz with a sidestream/mainstream sampler, a two-compartment CO2 store, an O2 store with dissociation curve and shunt, the SpO2 device chain with R8's lag structure, impedance respiration, a two-compartment heat model with probe sites, the L3 numerics (SpO2, EtCO2, FiCO2, awRR, RR, T1/T2), the R27 ventilator link (`externalDrive` in, `lungState` out), and a `stage3.html` demo.

**Architecture:** A new respiratory pipeline (`src/l2/resp/pipeline.ts`) runs in every engine `advance()` BEFORE Stage 2's haemodynamics (brief §3.3 order). Its driver plans breath cycles 0.6 s ahead; a 10 Hz gas step (O2 store, CO2 compartments, circulatory delay, SpO2 chain) and a 1 Hz heat step run inside the 62.5 Hz sample loop that writes `co2` (airway CO2 through the sampler) and `resp` (impedance) by absolute index. Stage 2's code is only READ (cardiac output from its site beats, pleth feet and PI, cuff, CPR), with two narrow seams: an optional breath signal `u(t)` in `HemoCtx` (replacing Stage 2's fixed 15/min clock, same scale) and L1 "coupled truths" (`L1State.coupled`) through which the gas/temperature models publish SaO2/EtCO2/FiO2/shunt/tempCore truth and the mean-airway-pressure coupling moves CVP/SBP/DBP/volumeStatus — Stage 2's pipeline already reads every target through `l1Value`. All state is plain JSON-safe data (the engine clones it every tick for the 100 ms look-ahead; snapshots travel as JSON). The renderer gains CO2 and RESP lanes (62.5 Hz, 6.25 mm/s) and SpO2/EtCO2/RR/TEMP tiles.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2, Vite 6.4, Canvas 2D / OffscreenCanvas; Playwright (system Chrome) for the headless screenshots. No runtime dependencies.

**Spec:** `docs/DESIGN-BRIEF.md` §3.2–3.3 (rates, tick order, look-ahead, absolute index), §4.3 (pleth/SpO2: oxygen truth, device chain, arrest), §4.4 (capnography: phases, α/β, pattern library, sampling, kinetics, arrest/ROSC, numerics), §4.6 (temperature), §4.7 (respiration and RR), §4.9 (state schema, MANUAL roles, coupling rules M4–M7, "Ventilation → haemodynamics"), §6.1–6.2 (numerics, sensors), §6.8 (colours, limits), §7.1–7.3 and §7.6 (exact names; `VentFrame`; flow > +0.05 L/s). `docs/BUILD-PLAN.md` "Stage 3" (scope, demo, 9 acceptance tests, gate question). Physiology: `../research/03-waveform-physiology-reference.md` §3.5–3.7, §4, §6, §7, §8.7, §8.9 and §11 (verification statuses); `../research/05-rendering-ux-integration.md` §2.3 (CO2 at 62.5 Hz). Rulings: `../research/00-orchestrator-rulings.md` R1, R4, R8, R12 (CO2 in mmHg), R13/R14 (saadat-like first: SpO2 average 8 s, update 1 s), R22–R28 (later modules this design must accept: see "Hooks for later stages"), R27 (the ventilator link contract).

## Global Constraints

- Paths are relative to `/Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo`; run every command from there. **Base: `main` after Stage 2 (PR #4, branch `stage-2-haemodynamics`) has merged.** This plan was prototyped on `main` `121c3f4` (Stages 0–1.1, 6a, 5, 4a) with the Stage 2 branch head `52efd04` merged into it locally; every find/replace block below was checked to occur exactly once in that tree. PR #4's reconciliation may move lines in Stage 2 files: if a find block does not match, locate the same lines by the quoted neighbouring comment and apply the same change; never re-type a Stage 2 line you are not changing.
- **Branch and PR (R20/R21):** work happens on branch `stage-3-respiratory-gas` in the worktree `../scratch/wt-stage-3` (Task 1 creates both from `origin/main`); the last task pushes and opens a pull request with `gh pr create`. Never push to `main`, never merge.
- **Partition (binding).** This stage OWNS `packages/engine-core/src/l2/resp/**`, `src/l2/gas/**`, `src/l2/co2/**`, `src/l2/temp/**`, `src/l3/spo2/**`, `src/l3/co2-numerics/**`, `src/l3/resp/**`, `src/l3/temp/**`, `src/types-resp.ts`, `test/helpers/resp.ts`, the Stage 3 tests, `packages/renderer/src/numerics-resp.ts`, `apps/demo/{stage3.html,src/stage3.ts,scripts/stage3-shots.mjs}`, `docs/gates/stage-3*`. Edits to `engine.ts`, `types.ts`, `index.ts`, `l1/state.ts` and the renderer's `wave-lanes.ts`, `monitor-core.ts`, `mount.ts`, `index.ts` are ADDITIVE and marked `// Stage 3`. **Never edit** `src/l2/ecg/**`, `src/l3/nibp/**`, `packages/skins/**`, `packages/audio/**`. **Declared exceptions (orchestrator request R-S3-1/R-S3-2, see the end of this plan):** (a) Task 14 adds an optional seam to `src/l2/hemo/{params,cvp,pipeline}.ts` (7 lines changed, 1 added) (default behaviour byte-identical when the seam is absent); (b) Task 1 adds two `case`s to `packages/controller/src/session/controller-session.ts`'s log formatter (the grown `Command` union otherwise fails its exhaustive switch), and Task 2 moves one controller test from `spo2` (now accepted) to `k`; (c) Tasks 2 and 16 adapt five Stage 1/2 test assertions that pinned "spo2 is Stage 3", "co2 is Stage 3" and "PPV comes from a fixed 15/min clock". Nothing else outside the owned paths changes.
- Stage 0–2 constraints still apply: strict TS with `noUncheckedIndexedAccess` and `erasableSyntaxOnly` (no enums, no parameter properties); `.ts` import extensions; conventional commits; clean-room (no code from ECGSYN, NeuroKit2, the Python Anesthesia Simulator or any GPL/unlicensed repo) — every equation cites the brief/research section it comes from, or `[ENG]` with the prototype number it was tuned to. **No new NOTICES rows**: nothing is borrowed.
- Commit messages end with the trailer `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (if your harness gives a different attribution line, use that one).
- pnpm is not on PATH: use `npx -y pnpm@9.15.9`. Unit tests: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>` (same with `@pme/renderer`, `@pme/controller`). Full run: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices`.
- Rates and indexing (brief §3.3): `co2` and `resp` at **62.5 Hz**; sample `m` belongs to time `m/62.5`; a pass that ends at ECG index `end` fills 62.5 Hz indices up to `floor(end/8)` inclusive (so `latestSampleIndex('co2')` = 6 at creation); ring buffers 120 s. Gas exchange at 10 Hz, temperature at 1 Hz (brief §3.2).
- Public names are the brief's (§7): `applyEvent` kinds `airway`, `ventilation`, `preoxygenate`, `condition` (`mh`); `externalDrive` with `VentFrame`; `attachSensor` `co2` (`off|warmup|on`, `sampling`) and `temp` (`off|on`, `site`); events `breath`, `lungState` (R27), `measurement`, `alarm`; channels `co2`, `resp`; numerics `spo2`, `etco2`, `imco2`, `awrr`, `rr`, `tempCore`, `tempSite`. Names this plan adds where the brief is silent are listed once in the Interfaces block of the task that creates them.
- Visual checks use **headless system Chrome through Playwright** (`channel: 'chrome'`), not the desktop Browser pane (a hidden pane throttles rAF).
- Long simulations: a test that simulates more than a few minutes sets a timeout (`{ timeout: 30_000 }` on its describe), and the 24 h test advances hour by hour and yields between hours (`await new Promise((r) => setImmediate(r))`) — a synchronous 24 h run starves the Vitest worker RPC on the 2-vCPU CI runner (main's `test/engine/engine-pipeline.test.ts` pattern).

## Decisions this plan makes where the spec was silent, inconsistent or physically unreachable

1. **Replacing Stage 2's breath clock without touching its maths.** Stage 2 computes PPV and the CVP swing from `breathU(t, phi)`, a fixed 15/min sinusoid (its decision 13). Stage 3 passes an optional `u(t)` through `HemoCtx` (Task 14, exception (a)) with the SAME scale: `u = 0.5 + swing`, zero-mean over each cycle, swing 1.0 peak-to-peak for the reference positive-pressure breath (VT 500 mL at C 50 mL/cmH2O = 10 cmH2O). Positive-pressure cycles swing positive with alveolar pressure; spontaneous cycles swing NEGATIVE (pleural pressure falls on inspiration: brief §4.3 "sign reversal is Stage 3"), amplitude 4/10; apnoea gives exactly 0.5 (no respiratory variation). The external drive uses `0.5 + (Paw − mean Paw)/10`. Stage 2's PPV bands then hold on a ventilator (prototype 6.9 % at g 0.05, 22.5 % at g 0.2) — Task 16 moves Stage 2's PPV test onto a ventilator (PPV is a ventilated-patient index, research 03 §2.5). The ECG's RSA stays on Stage 1's clock: `l2/ecg/**` is not ours (request R-S3-3).
2. **MANUAL targets for the gas variables are CALIBRATIONS, not overrides.** The brief makes `spo2` "target SaO2 truth" and `etco2` "target (plateau truth)" in MANUAL while also requiring autoDesat (M5) and apnoea kinetics (M4). So: `setTarget spo2` solves the SHUNT that gives that SaO2 at steady state on the current FiO2/ventilation and places the O2 model there (while ventilated); `setTarget etco2` solves the physiological DEAD SPACE that holds that EtCO2 on the current settings and places the CO2 compartments there; `setTarget tempCore` re-solves the heat balance so the new core is a steady state (a fever is a raised set point). From then on the models run: apnoea desaturates from the current value, hypoventilation raises EtCO2 with its kinetics, FiO2 changes move SaO2. `setTarget shunt` sets the shunt (an input); `spo2` wins when both change in one step. `pin spo2` disables autoDesat (brief M5: SaO2 truth = the pinned value). The truth is published through `L1State.coupled`, so the 1 Hz `state` event shows truth and the `override` flag shows when physiology has moved it away from the target (tolerance 0.5 units; 0.01 for fractions).
3. **CO2 compartments fitted to the apnoea data, not the brief's constants.** The brief's C_f 15–20, C_s 40–45, k_fs = C_s/5 min give an apnoea rise of 9.5 then 4.8 mmHg/min, outside its own acceptance (12 ± 3, then 3.4 ± 0.5). Fitted: C_f 6, C_s 55 mL/mmHg, k_fs 18 mL/min/mmHg at VCO2 200 (scaled per mL/min of anaesthetised VCO2): apnoea +12.0 then 3.34 mmHg/min. Consequence: "halving minute ventilation gives 30–40 % in 2–3 min and > 90 % by 40 min" (BUILD-PLAN 4b) is **physically unreachable** together with the apnoea anchors — the slow mode of a halved-VA step has τ ≈ 80 mmHg / 3.4 mmHg·min⁻¹ ≈ 23.5 min whatever the constants. The acceptance is therefore tested on a **+33 % alveolar-ventilation step** (35.7 % at 2 min, 38 % at 2.5 min, 40.8 % at 3 min, 90 % at 24.4 min: brief "30–40 % in 2–3 min, steady state 20–40 min") and the halving is tested as "slower than raising it" (research 03 §4.4: hypoventilation is slower). Low flow: VCO2 not carried by the blood (fraction 1 − φ, φ = min(1, CO/CO_ref)^0.6) stays in the slow (tissue) compartment, so EtCO2 holds 10–20 mmHg in CPR for the first minutes, then creeps up (research 03 §4.4), and ROSC washes the store out (an emergent ROSC spike, brief §4.4).
4. **O2 store tuned to Benumof and Patel; room air is faster than the brief's "1–2 min".** FRC under GA 20 mL/kg (brief 20–25) and anaesthetised VO2 3.5 × 0.85 mL/kg/min put the preoxygenated 70 kg adult at 90 % after 8.4 min (Benumof 8), obese 127 kg 2.8 min (Benumof 2.7), child 2–5 y (FRC 8 mL/kg under GA) 158 s (Patel 160 ± 31). With the same physics room air reaches 90 % in ≈ 40 s (awake FRC 30 mL/kg gives the same); lengthening it to 60–120 s would need FRC ≥ 3.5 L and would break Benumof's 8 min. The test asserts 30–120 s and the gate note flags it for the orchestrator. The child's time to 90 % in Benumof is an ENG estimate (research 03 §11 #16); Patel is the anchor used.
5. **Sidestream under-reading at RR 60 is small with the specified sampler.** A 2.3 s delay plus a first-order 240/190 ms rise (brief §4.4) under-reads a neonatal RR 60 plateau by ≈ 1 mmHg against mainstream, not "> 3 mmHg" (BUILD-PLAN 2b): with a 0.6 s expiration the plateau is still reached. The test asserts the direction (≥ 0.5 mmHg); a larger effect needs a line-mixing term (research 03 §4.2 "long lines or water traps"), left for the realism review.
6. **Rebreathing and curare cleft have no command in the brief.** Two optional fields on the `ventilation` event: `fico2` (inspired CO2, mmHg) and `effort` (0–1 diaphragmatic effort during mechanical breaths → a 3–15 mmHg cleft).
7. **Mean airway pressure → haemodynamics in MANUAL.** Effective RAP rises by 40 % (brief 30–50 %) of the mean-Paw EXCESS over 10 cmH2O ("High PEEP (> 10–15) … lowers CO and MAP", research 03 §8.7), so ordinary ventilation does not move the instructor's pressures. The venous-return gradient is 4 + 11·volumeStatus mmHg [ENG]; the output factor f = 1 − ΔRAP/gradient scales SBP−CVP, DBP−CVP and volumeStatus (so PPV rises with PEEP in hypovolaemia). Prototype PEEP 5 → 15: CO −9 %, MAP 97 → 83, CVP +2.2 mmHg normovolaemic; CO −23 %, MAP 97 → 68 at volumeStatus 0.3. With a linear lung PEEP moves the CVP MEAN, not its respiratory swing; the swing follows the drive's pressure swing (the acceptance test raises VT 500 → 800 and asserts > 1.3 × — the reading this plan gives the request "CVP swing amplitude change"). MODELED (Stage 7) replaces this with its Guyton solve.
8. **Anaesthesia/thermal state has no command in the brief.** A `thermal` event (`anaesthesia: none|general|neuraxial`, `warming`, `ambientC`) switches FRC (awake 30 → GA 20 mL/kg), metabolism (× 0.85) and the heat model (k_cp × 3, M × 0.8, vasoconstriction plateau; neuraxial k_cp × 1.8 and no plateau). Stage 7's induction drugs will send it.
9. **Patient size for gas exchange.** `PatientProfile` gains the brief §7.4 `ageY`, `weightKg`, `heightCm`, `sex` (optional; adult 70 kg default). IBW by Devine, adjusted weight IBW + 0.4·(W − IBW) for metabolism and blood volume, FRC × (1 − 0.035 per BMI point above 25, floor 40 %). R22's profile table replaces these rules in Stage 7.
10. **Sensors and defaults.** `co2` defaults to `off` (no buffer; like Stage 2's lines), `temp` to `on` (T1 = oesophageal probe → `tempCore`; T2 = the chosen site, default axilla → `tempSite`), `resp` (impedance) is always written (ECG electrodes; the `ecg` sensor is Stage 4). `co2` `warmup` shows a flat 0 and invalid numerics for 10 s.
11. **SpO2 profile.** Averaging 8 s and display update 1 s (Masimo SET / saadat-like, the first skin: R13/R14; brief §6.1). Stage 4b wires the skin choice; the constants live in `SPO2_PROFILE`. Validity: no pleth foot for 4 s → value held and `questionable`; 10 s → `invalid` ("-?-", brief §4.3 arrest: 10–30 s); probe off → invalid at once; same-limb NIBP cuff → the value is HELD valid (brief §4.3); PI < 0.3 → `questionable` (LOW PERF) and the average doubles; motion or CPR → `questionable`; after an invalid spell the value returns only when the average has refilled (ROSC: "valid after 10–20 s"). Device bias: a per-patient offset N(0, 1) % clipped ±2, plus under-reading of 0.1 %/% below 80 % (research 03 §3.6).
12. **awRR, EtCO2 window and apnoea.** EtCO2 = max breath peak of the last 10 s, else the displayed value (so it falls to 0 after airway loss); apnoea timers start at power-on (no alarm in the first 20 s); alarms are `alarm` events `apnoea-co2` / `apnoea-resp` (`high`, `physiological`, raised/cleared) — the alarm engine and audio are Stage 4.
13. **Impedance ripple.** 10 % of a 500 mL breath at each beat (brief 5–20 %) stays under the detector floor (0.08), so impedance apnoea alarms; a 20 % ripple (a parameter of `impedanceSample`) is counted once breaths vanish and postpones it (research 03 §7). Obstructed spontaneous breathing keeps moving the chest: impedance RR continues while the capnograph alarms (obstructive apnoea missed, research 03 §7).
14. **External drive.** Inspiration starts when `flow > 0.05 L/s` (or `phase === 'insp'`); Ti ends when flow turns negative; VT = the largest frame volume of the cycle; mean Paw = the mean of the frames over the last cycle (≤ 6 s), never a running LPF (that ripples within a breath and shows up as a CVP swing); no frame for 5 s → the drive is gone (source `none`). Breath events of external cycles are emitted when their expiration starts (Ti known). FiO2 and PEEP come from the frames.
15. **Tone.** The QRS tone's `freqHz` becomes `880·2^(−(100 − SpO2)·0.1/12)` of the DISPLAYED SpO2 (research 03 §3.6; 90 % → 830.6 Hz), 880 Hz when SpO2 is invalid. One line in `engine.ts`.
16. **CO2 shape constants.** τ_II 0.09 s (brief 0.05–0.10): α 105.6° sidestream, 100.5° mainstream (both in 100–110); phase III +2 mmHg; shark fin τ_II + 0.35 s and +10 mmHg per unit severity (α 157° at severity 1, 131° at 0.5); oesophageal intubation 5 breaths of gastric CO2 0.45 × EtCO2 × 0.6ⁿ, then flat; disconnection decays with τ 0.25 s; after the last expiration the sampled gas returns to baseline with τ 1 s.

## Prototype results (numbers the constants below were tuned to)

Prototyped in a scratch copy of `main` `121c3f4` + the Stage 2 branch head `52efd04` (merged locally) with exactly the code in this plan; the plan was then applied mechanically to a clean copy of that tree and the result compared byte-for-byte with the prototype (Task 25 lists the check). Full run: `typecheck` clean in every package; engine-core 369 tests (35 existing Stage 2 files + 26 new Stage 3 files), renderer 34, controller 97, audio 58, skins 155, validation 16 — all pass; `build` and `check-notices` pass; `stage3.html` runs in headless Chrome (`worker-raf`, no page errors).

| Check | Result |
|---|---|
| α angle (25 mmHg/s axis), ventilated RR 12 | sidestream 105.6°, mainstream 100.5°; phase III +1.4 mmHg; bronchospasm severity 1: 157°, severity 0.5: 131° |
| Sidestream delay (breath event → 10 % downstroke) | 2.342 s (2.332–2.348); step response 10–90 % rise 240 ms adult, 190 ms neonatal; mainstream < 60 ms |
| RR 60 neonate, sidestream − mainstream plateau | −0.94 mmHg (decision 5) |
| Apnoea CO2 (GA, 70 kg) | +12.0 mmHg in the first minute, then 3.34 mmHg/min |
| +33 % VA step / halving | 35.7 % at 2 min, 40.8 % at 3 min, 90 % at 24.4 min / 18.2 % at 2.5 min, PaCO2 → 80 |
| CPR (CO 29 %) / arrest | EtCO2 10–20 mmHg over minutes 1–3 / < 5 mmHg within 30 s |
| First breath after 60 s disconnection (GA, steady state) | +9.3 mmHg over the pre-apnoea EtCO2 |
| Desaturation to SaO2 90 % (GA) | preoxygenated 70 kg adult 501 s (8.4 min); room air 41 s; child 2–5 y (16 kg) 158 s; obese 127 kg/175 cm 170 s (2.8 min) |
| R8: obstructed at SaO2 97 → restored (BVM, FiO2 1) at SaO2 85 | displayed SpO2 was 94 at the restore, kept falling to 86, lowest 20 s after the restore, then recovered; EtCO2 < 5 mmHg 15 s after the loss while SpO2 ≥ 94 |
| SpO2 step 96 → 85 at normal CO | first displayed move at +18 s (finger dead time 15 s + 3 s lag + the 8 s average); 90 % of the change at +28 s, i.e. 13 s after the site step (≤ 20) |
| Pulseless (VF) | SpO2 invalid 11 s after the rhythm change |
| PPV through the driver (ventilator 15/min, VT 500) | 6.9 % at g 0.05, 22.5 % at g 0.2; spontaneous 10.0 % at g 0.2 |
| RR three ways, ventilator 14/min | awRR 14.0, impedance 14.0, pleth-derived 13.9 |
| Vent link (50 Hz VentFrame, RR 12, VT 500, FiO2 0.4, PEEP 5) | 12.0 breaths/min detected; EtCO2 within 2 mmHg of truth and steady; SpO2 ≥ 97 |
| PEEP 5 → 15 (MANUAL, decision 7) | CO −9 %, MAP 97 → 83, CVP 6.0 → 8.2 (normovolaemic); CO −23 %, MAP 97 → 68 (volumeStatus 0.3); the CVP respiratory swing grows > 1.3 × when the drive's VT goes 500 → 800 |
| Temperature (70 kg) | GA: −1.28 °C at 60 min, −0.39 °C in hour 2, plateau 34.65–34.67 °C in hour 8; neuraxial −0.93 °C in hour 1, 32.9 °C at 8 h and still falling 0.27 °C/h; forced-air warming +0.57 °C/h; MH (severity 1): +1.17 °C in minutes 30–45 (heat × 5, VCO2 × 3); engine at fixed ventilation: EtCO2 38 → 124 mmHg and core +1.5 °C in 30 min; rectal probe τ 40.0 min |
| lungState at t = 0 (70 kg adult) | C 50 mL/cmH2O, R 10 cmH2O/L/s, effort 1, autoPEEP 0, shunt 0.04, dead space 154 mL, FRC 2100 mL; bronchospasm → R 40, autoPEEP 0.8 |
| Determinism; 24 h | same seed + script → identical SHA-256 over co2/resp/pleth/abp, other seed differs; after `advanceTo(86400)` `latestSampleIndex('co2')` = 5,400,006 exactly (≈ 71 s under Vitest, yielding hourly) |
| Tone | 90 % → 830.6 Hz |

## Hooks for later stages (R22–R28 must plug in without rewriting Stage 3)

- **R22 profiles:** `gasPatient(profile)` (`l2/gas/params.ts`) is the single place that maps a profile to FRC, VO2, blood volume, dead space, compliance and resistance — the R22 table replaces its age/obesity rules and adds COPD dead space, pregnancy FRC, anaemia Hb.
- **R24 pulmonary oedema / R27 lungState:** shunt, compliance and dead space are read through `extraShunt`, `compliance`, `deadSpace` in `l2/resp/pipeline.ts`; the left-heart module adds its term there, and `lungState` re-emits automatically whenever any of them changes.
- **R26 brain / R28 ECMO:** gas exchange takes `qLpm` (pulmonary flow) separately from the systemic CO ratio used for the SpO2 site delay, and `siteDelay(site, …)` is per probe site — ECMO's differential hypoxaemia (right arm vs lower body) and the EtCO2 fall with pulmonary flow need only new inputs, not a new chain.
- **Stage 7 MODELED:** the L1 `coupled` map is the output port (the Guyton solve writes cvp/sbp/dbp instead of `applyPawCoupling`); drugs send `thermal` and scale `metabolic()`.

## File map

| Path | Responsibility |
|---|---|
| `packages/engine-core/src/types-resp.ts` | Stage 3 public types (VentFrame, events, commands, airway, sources, temp sites) |
| `…/src/types.ts`, `…/src/index.ts` | one-line additions to the unions, `PatientProfile.ageY/weightKg/heightCm/sex`, re-exports |
| `…/src/l1/state.ts` | coupled truths, `l1Target`, Stage 3 variables accepted, `override` on coupled departures |
| `…/src/l2/gas/params.ts` | gas constants and patient scaling |
| `…/src/l2/gas/o2.ts` | ODC, O2 content, O2 store/blood buffer, steady state, shunt solve |
| `…/src/l2/gas/co2.ts` | two-compartment CO2 with low-flow compression |
| `…/src/l2/gas/delay.ts` | circulatory delay lung → probe site |
| `…/src/l2/gas/coupling.ts` | CO read from Stage 2, mean-airway-pressure coupling |
| `…/src/l2/temp/temp.ts` | two-compartment heat model, sites, MH |
| `…/src/l2/resp/driver.ts` | breath scheduler, airway states, external drive, u(t), volumes, VA, mean Paw |
| `…/src/l2/co2/capno.ts` | phase-built airway CO2, pattern library, sampler |
| `…/src/l3/spo2/spo2.ts` | SpO2 device chain, validity, tone pitch |
| `…/src/l3/co2-numerics/co2-numerics.ts` | breath detection, EtCO2, FiCO2, awRR, gas apnoea |
| `…/src/l3/resp/impedance.ts` | impedance signal and detector, RR, pleth-derived RR |
| `…/src/l3/temp/temp-numerics.ts` | T1/T2 probe lags and numerics |
| `…/src/l2/resp/pipeline.ts` | the per-tick Stage 3 work, command hooks, events, coupled truths |
| `…/src/l2/hemo/{params,cvp,pipeline}.ts` | the optional `u(t)` seam (exception (a)) |
| `…/src/engine.ts` | additive wiring (state, advance order, flush, validate/apply hooks, 62.5 Hz buffers, tone pitch) |
| `packages/renderer/src/{wave-lanes,monitor-core,mount,index}.ts`, `numerics-resp.ts` | CO2/RESP lanes and SpO2/EtCO2/RR/TEMP tiles |
| `apps/demo/{stage3.html,src/stage3.ts,scripts/stage3-shots.mjs}` | demo page and gate screenshots |
| `docs/gates/stage-3.md` | gate evidence |

---

### Task 1: Branch, worktree, Stage 3 public types

**Files:**
- Create: `packages/engine-core/src/types-resp.ts`, `packages/engine-core/test/types-resp.test.ts`
- Modify: `packages/engine-core/src/types.ts` (4 additive edits), `packages/controller/src/session/controller-session.ts` (log formatter: exception (b))

**Interfaces:**
- Consumes: Stage 2 `types.ts` (`Command`, `EngineEvent`, `PatientProfile`, `SimSeconds`).
- Produces (exported from `src/types-resp.ts`; re-exported from `@pme/engine-core` in Task 16): `VentFrame`, `AirwayState`, `VentSource`, `BreathKind`, `TempSite`, `RespClinicalEvent` (`airway`, `ventilation` with `fico2?`/`effort?`, `preoxygenate`, `condition` `mh`, `thermal`), `RespCommandBody` (`applyEvent` with a `RespClinicalEvent`, `externalDrive`), `RespEvent` (`breath`, `lungState`). `Command` and `EngineEvent` include them; `PatientProfile` gains `ageY?`, `weightKg?`, `heightCm?`, `sex?`.

- [x] **Step 1: Create the branch and worktree**

```bash
git fetch origin && git worktree add ../scratch/wt-stage-3 -b stage-3-respiratory-gas origin/main
cd ../scratch/wt-stage-3
git log --oneline -1   # must include the Stage 2 merge (PR #4): `git log --oneline origin/main | grep -i "stage-2"`
npx -y pnpm@9.15.9 install --frozen-lockfile
```

From here on every command runs inside `../scratch/wt-stage-3` (the worktree is the repo root for this plan's relative paths).

- [x] **Step 2: Write the failing test**

**Create `packages/engine-core/test/types-resp.test.ts`:**

```ts
// Compile-time contract for the Stage 3 public types (brief §7.2–§7.3, R27): `pnpm typecheck` fails if a variant
// is missing from the unions; the runtime assertions only keep Vitest honest.
import { describe, expect, it } from 'vitest';
import type { RespClinicalEvent, VentFrame } from '../src/types-resp.ts';
import type { Command, EngineEvent, PatientProfile } from '../src/types.ts';

describe('Stage 3 public types', () => {
  it('Command, EngineEvent and PatientProfile carry the Stage 3 variants', () => {
    const frame: VentFrame = { pawCmH2O: 18, flowLps: 0.4, volumeMl: 250, fio2: 0.4, peepCmH2O: 5, phase: 'insp' };
    const airway: RespClinicalEvent = { kind: 'airway', state: 'bronchospasm', severity: 0.5 };
    const cmds: Command[] = [
      { id: '1', issuedBy: 't', type: 'applyEvent', event: airway },
      { id: '2', issuedBy: 't', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.4, peep: 5, fico2: 0, effort: 0 } },
      { id: '3', issuedBy: 't', type: 'applyEvent', event: { kind: 'preoxygenate', fio2: 1, durationS: 180 } },
      { id: '4', issuedBy: 't', type: 'applyEvent', event: { kind: 'condition', id: 'mh', severity: 1 } },
      { id: '5', issuedBy: 't', type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general', warming: true, ambientC: 20 } },
      { id: '6', issuedBy: 't', type: 'externalDrive', source: 'ventilator', frame },
      { id: '7', issuedBy: 't', type: 'attachSensor', sensor: 'co2', state: 'on', sampling: 'mainstream' },
    ];
    const events: EngineEvent[] = [
      { type: 'breath', t: 1, seq: 0, kind: 'mech', tiS: 1.6, teS: 3.4, vtMl: 500, etco2True: 36 },
      { type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 1, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 154, frcMl: 2100 },
    ];
    const profile: PatientProfile = { ageY: 4, weightKg: 16, heightCm: 102, sex: 'F' };
    expect(cmds).toHaveLength(7);
    expect(events.map((e) => e.type)).toEqual(['breath', 'lungState']);
    expect(profile.weightKg).toBe(16);
  });
});
```

- [x] **Step 3: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck`
Expected: FAIL — `Cannot find module '../src/types-resp.ts'`.

- [x] **Step 4: Implement**

**Create `packages/engine-core/src/types-resp.ts`:**

```ts
// Stage 3 public types (brief §7.2–§7.3; ruling R27), in their own file so parallel stages do not collide in
// types.ts. types.ts adds `RespCommandBody` and `RespEvent` to its unions with one line each.
import type { SimSeconds } from './types.ts';

/** Brief §7.2 VentFrame: one ventilator sample, ≤ 50 Hz (R27 vent → engine). */
export type VentFrame = {
  pawCmH2O: number; flowLps: number; volumeMl: number; fio2: number; peepCmH2O: number;
  phase?: 'insp' | 'exp';
};

export type AirwayState = 'patent' | 'obstructed' | 'apnoea' | 'disconnected' | 'oesophageal' | 'endobronchial' | 'bronchospasm';
/** Ventilation sources (brief §4.7). 'external' is set by `externalDrive` frames, never commanded directly. */
export type VentSource = 'spontaneous' | 'bvm' | 'ventilator' | 'none';
export type BreathKind = 'spont' | 'mech' | 'bvm' | 'gasp';
/** Temperature sites (brief §4.6). T1 is always the oesophageal probe; `site` chooses T2. */
export type TempSite = 'oesophageal' | 'nasopharyngeal' | 'tympanic' | 'bladder' | 'rectal' | 'axilla';

/** Brief §7.2 ClinicalEvent members Stage 3 implements, plus two documented extensions (plan decisions 6–7). */
export type RespClinicalEvent =
  | { kind: 'airway'; state: AirwayState; severity?: number }
  | {
      kind: 'ventilation'; source: VentSource; rr?: number; vtMl?: number; fio2?: number; peep?: number; ie?: number;
      /** Stage 3 extension: inspired CO2 in mmHg (exhausted absorbent → rebreathing baseline). */
      fico2?: number;
      /** Stage 3 extension: 0–1 spontaneous diaphragmatic effort during mechanical breaths (curare cleft). */
      effort?: number;
    }
  | { kind: 'preoxygenate'; fio2: number; durationS: number }
  | { kind: 'condition'; id: 'mh'; severity: number }
  /** Stage 3 extension (decision 8): anaesthetic thermal state, forced-air warming and ambient temperature. */
  | { kind: 'thermal'; anaesthesia?: 'none' | 'general' | 'neuraxial'; warming?: boolean; ambientC?: number };

/** Command variants added in Stage 3 (brief §7.2). attachSensor co2/temp reuse Stage 2's attachSensor variant. */
export type RespCommandBody =
  | { type: 'applyEvent'; event: RespClinicalEvent }
  | { type: 'externalDrive'; source: 'ventilator'; frame: VentFrame };

/** Event variants added in Stage 3: brief §7.3 `breath` and R27 `lungState` (engine → ventilator). */
export type RespEvent =
  | { type: 'breath'; t: SimSeconds; seq: number; kind: BreathKind; tiS: number; teS: number; vtMl: number; etco2True: number }
  | {
      type: 'lungState'; t: SimSeconds;
      complianceMlPerCmH2O: number; resistanceCmH2OPerLps: number;
      /** 0–1 spontaneous effort / drive. */
      effort: number;
      /** 0–1 tendency to gas trapping (obstruction). */
      autoPeepTendency: number;
      shunt: number; deadSpaceMl: number; frcMl: number;
    };
```

**Modify `packages/engine-core/src/types.ts`** (1/4) — find:

```ts
import type { HemoCommandBody, HemoEvent, NibpDeviceAction, SensorId } from './types-hemo.ts';

```

replace with:

```ts
import type { HemoCommandBody, HemoEvent, NibpDeviceAction, SensorId } from './types-hemo.ts';
import type { RespCommandBody, RespEvent } from './types-resp.ts'; // Stage 3

```

**Modify `packages/engine-core/src/types.ts`** (2/4) — find:

```ts
  sensors?: Partial<Record<SensorId, string>>; // Stage 2 (brief §7.4 patient.sensors)
}
```

replace with:

```ts
  sensors?: Partial<Record<SensorId, string>>; // Stage 2 (brief §7.4 patient.sensors)
  ageY?: number; // Stage 3 (brief §7.4 patient.ageY): gas-exchange scaling
  weightKg?: number; // Stage 3 (brief §7.4 patient.weightKg)
  heightCm?: number; // Stage 3: ideal body weight and obesity (plan decision 9)
  sex?: 'M' | 'F'; // Stage 3 (brief §7.4 patient.sex)
}
```

**Modify `packages/engine-core/src/types.ts`** (3/4) — find:

```ts
    | HemoCommandBody // Stage 2 (types-hemo.ts)
  );
```

replace with:

```ts
    | HemoCommandBody // Stage 2 (types-hemo.ts)
    | RespCommandBody // Stage 3 (types-resp.ts)
  );
```

**Modify `packages/engine-core/src/types.ts`** (4/4) — find:

```ts
  | { type: 'toneCancel'; after: SimSeconds; ids?: string[] }
  | HemoEvent; // Stage 2 (types-hemo.ts)

```

replace with:

```ts
  | { type: 'toneCancel'; after: SimSeconds; ids?: string[] }
  | HemoEvent // Stage 2 (types-hemo.ts)
  | RespEvent; // Stage 3 (types-resp.ts)

```

The grown `Command` union breaks Stage 6a's exhaustive log formatter (exception (b)):

**Modify `packages/controller/src/session/controller-session.ts`** (1/1) — find:

```ts
      return `mode ${c.mode}`;
    case 'applyEvent': // Stage 2
      return `event ${c.event.kind}${'action' in c.event ? ` ${c.event.action}` : ` ${c.event.active ? 'on' : 'off'}`}`;
    case 'attachSensor': // Stage 2
      return `sensor ${c.sensor} ${c.state}${c.site ? ` @${c.site}` : ''}`;
  }
```

replace with:

```ts
      return `mode ${c.mode}`;
    case 'applyEvent': // Stage 2; Stage 3 kinds fall through to their JSON
      if ('action' in c.event) return `event ${c.event.kind} ${c.event.action}`;
      if (c.event.kind === 'cpr') return `event cpr ${c.event.active ? 'on' : 'off'}`;
      return `event ${JSON.stringify(c.event)}`;
    case 'attachSensor': // Stage 2
      return `sensor ${c.sensor} ${c.state}${c.site ? ` @${c.site}` : ''}`;
    case 'externalDrive': // Stage 3
      return `drive paw ${c.frame.pawCmH2O.toFixed(1)} flow ${c.frame.flowLps.toFixed(2)}`;
  }
```

- [x] **Step 5: Run and verify**

Run: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/types-resp.test.ts`
Expected: typecheck clean in every package; 1 test passes.

- [x] **Step 6: Commit**

```bash
git add packages/engine-core/src/types-resp.ts packages/engine-core/src/types.ts packages/engine-core/test/types-resp.test.ts packages/controller/src/session/controller-session.ts
git commit -m "feat(engine-core): stage 3 public types (VentFrame, breath, lungState, airway/ventilation events)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: L1 coupled truths and the Stage 3 variables

**Files:**
- Create: `packages/engine-core/test/l1/state-coupled.test.ts`
- Modify: `packages/engine-core/src/l1/state.ts` (5 edits), `packages/engine-core/test/l1/state.test.ts`, `packages/engine-core/test/engine/engine-commands.test.ts`, `packages/controller/test/session/host-session.test.ts` (exception (c): these pinned "spo2 is Stage 3")

**Interfaces:**
- Consumes: Stage 2 `L1State`, `STATE_SCHEMA`, `l1Flags`, `rampValue`.
- Produces: `L1State.coupled?: Partial<Record<L1Var, number>>` (a coupled truth replaces the ramp in `l1Value`); `l1Target(st, v, t): number` (the ramp only); `validateTarget` accepts every Stage ≤ 3 variable; `l1Flags` shows `override` when a coupled truth departs from its target by > 0.5 (0.01 for fio2/shunt, 0.02 for volumeStatus).

- [x] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l1/state-coupled.test.ts`:**

```ts
// Stage 3 additions to L1 (brief §4.9): coupled truths, the raw target, Stage 3 variables accepted, 'override'.
import { describe, expect, it } from 'vitest';
import { createL1State, l1Flags, l1Target, l1Value, setL1Target, validateTarget } from '../../src/l1/state.ts';
import { constantRamp } from '../../src/l1/ramp.ts';

describe('l1/state: Stage 3 coupled truths', () => {
  it('spo2, rr, vt, etco2, fio2, shunt and tempCore are accepted; k (Stage 5) is not', () => {
    for (const v of ['spo2', 'rr', 'vt', 'etco2', 'fio2', 'shunt', 'tempCore'] as const) expect(validateTarget(v, undefined, undefined)).toBeUndefined();
    expect(validateTarget('fio2', 0.1, undefined)).toMatch(/0.21/);
    expect(validateTarget('k', 5, undefined)).toMatch(/Stage 5/);
  });

  it('a coupled truth replaces the ramp in l1Value, l1Target still gives the target, and it raises override', () => {
    const st = createL1State();
    setL1Target(st, 'cvp', 0, 8);
    expect(l1Value(st, 'cvp', 1)).toBe(8);
    st.coupled = { cvp: 10.5, spo2: 97.2 };
    expect(l1Value(st, 'cvp', 1)).toBe(10.5);
    expect(l1Target(st, 'cvp', 1)).toBe(8);
    const f = l1Flags(st, 1, constantRamp(75), []);
    expect(f.cvp).toBe('override');
    expect(f.spo2).toBeUndefined(); // 97.2 vs 97: inside the 0.5 tolerance
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l1/state-coupled.test.ts`
Expected: FAIL — `l1Target` is not exported; `spo2 is not implemented until Stage 3`.

- [x] **Step 3: Implement**

**Modify `packages/engine-core/src/l1/state.ts`** (1/5) — find:

```ts
export const STATE_VARS = Object.keys(STATE_SCHEMA) as StateVar[];
export type L1Var = Exclude<StateVar, 'hr'>;
```

replace with:

```ts
export const STATE_VARS = Object.keys(STATE_SCHEMA) as StateVar[];
/** Stage 3: how far a coupled truth may sit from its target before the 'override' flag shows. */
const overrideTol = (v: StateVar): number => (v === 'fio2' || v === 'shunt' ? 0.01 : v === 'volumeStatus' ? 0.02 : 0.5);
export type L1Var = Exclude<StateVar, 'hr'>;
```

**Modify `packages/engine-core/src/l1/state.ts`** (2/5) — find:

```ts
  pinned: StateVar[];
}
```

replace with:

```ts
  pinned: StateVar[];
  /** Stage 3: coupled truths (coupling rules and the gas/temperature models); absent → the ramp is the truth. */
  coupled?: Partial<Record<L1Var, number>>;
}
```

**Modify `packages/engine-core/src/l1/state.ts`** (3/5) — find:

```ts

/** Truth of an L1 variable at time t (sim seconds). */
export function l1Value(st: L1State, v: L1Var, t: number): number {
  return rampValue(st.vars[v], t);
```

replace with:

```ts

/** Truth of an L1 variable at time t (sim seconds): the coupled truth when a coupling rule sets one (Stage 3). */
export function l1Value(st: L1State, v: L1Var, t: number): number {
  const c = st.coupled?.[v];
  return c !== undefined ? c : rampValue(st.vars[v], t);
}

/** Stage 3: the instructor's target (ramp) itself, ignoring couplings. */
export function l1Target(st: L1State, v: L1Var, t: number): number {
  return rampValue(st.vars[v], t);
```

**Modify `packages/engine-core/src/l1/state.ts`** (4/5) — find:

```ts
  if (!spec) return `unknown state variable ${String(variable)}`;
  if (spec.stage > 2) return `${variable} is not implemented until Stage ${spec.stage}`;
  if (spec.manual === 'derived') return `${variable} is derived in MANUAL mode (coupling rule M2)`;
```

replace with:

```ts
  if (!spec) return `unknown state variable ${String(variable)}`;
  if (spec.stage > 3) return `${variable} is not implemented until Stage ${spec.stage}`;
  if (spec.manual === 'derived') return `${variable} is derived in MANUAL mode (coupling rule M2)`;
```

**Modify `packages/engine-core/src/l1/state.ts`** (5/5) — find:

```ts
    const r = v === 'hr' ? hrRamp : st.vars[v];
    if (overrides.includes(v)) out[v] = 'override';
    else if (st.pinned.includes(v)) out[v] = 'pinned';
```

replace with:

```ts
    const r = v === 'hr' ? hrRamp : st.vars[v];
    const c = v === 'hr' ? undefined : st.coupled?.[v]; // Stage 3: a coupled truth away from its target
    if (overrides.includes(v) || (c !== undefined && Math.abs(c - rampValue(r, t)) > overrideTol(v))) out[v] = 'override';
    else if (st.pinned.includes(v)) out[v] = 'pinned';
```

Three existing assertions pinned "spo2 is rejected until Stage 3"; they move to `k` (Stage 5):

**Modify `packages/engine-core/test/l1/state.test.ts`** (1/1) — find:

```ts
    expect(validateTarget('sbp', 400, undefined)).toMatch(/0–300/);
    expect(validateTarget('spo2', 90, undefined)).toMatch(/Stage 3/);
    expect(validateTarget('svr', 1.2, undefined)).toMatch(/derived/);
```

replace with:

```ts
    expect(validateTarget('sbp', 400, undefined)).toMatch(/0–300/);
    expect(validateTarget('k', 5, undefined)).toMatch(/Stage 5/); // Stage 3 accepts spo2
    expect(validateTarget('svr', 1.2, undefined)).toMatch(/derived/);
```

**Modify `packages/engine-core/test/engine/engine-commands.test.ts`** (1/1) — find:

```ts
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib' }))).toEqual({ accepted: true, tick: 1 });
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 90 })).accepted).toBe(false); // Stage 3
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'notARhythm' })).reason).toMatch(/unknown rhythm/);
```

replace with:

```ts
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib' }))).toEqual({ accepted: true, tick: 1 });
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'k', value: 5 })).accepted).toBe(false); // Stage 5 (Stage 3 accepts spo2)
    expect(e.dispatch(cmd({ type: 'setRhythm', rhythm: 'notARhythm' })).reason).toMatch(/unknown rhythm/);
```

**Modify `packages/controller/test/session/host-session.test.ts`** (1/2) — find:

```ts
    const { command, of } = setup();
    command({ type: 'setTarget', variable: 'spo2', value: 90 }); // Stage 2 accepts sbp; spo2 is Stage 3
    command({ type: 'pin', variable: 'hr', value: 60 });
```

replace with:

```ts
    const { command, of } = setup();
    command({ type: 'setTarget', variable: 'k', value: 5 }); // Stage 3 accepts spo2; k is Stage 5
    command({ type: 'pin', variable: 'hr', value: 60 });
```

**Modify `packages/controller/test/session/host-session.test.ts`** (2/2) — find:

```ts
    expect(of('ack').map((a) => a.accepted)).toEqual([false, false, false, false]);
    expect(of('ack')[0]!.reason).toMatch(/Stage 3/);
    expect(of('ack')[1]!.reason).toMatch(/MODELED/);
```

replace with:

```ts
    expect(of('ack').map((a) => a.accepted)).toEqual([false, false, false, false]);
    expect(of('ack')[0]!.reason).toMatch(/Stage 5/);
    expect(of('ack')[1]!.reason).toMatch(/MODELED/);
```

- [x] **Step 4: Run and verify**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l1 test/engine/engine-commands.test.ts && npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run`
Expected: all pass (controller 97).

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l1/state.ts packages/engine-core/test/l1 packages/engine-core/test/engine/engine-commands.test.ts packages/controller/test/session/host-session.test.ts
git commit -m "feat(l1): coupled truths, l1Target, stage 3 state variables accepted, override on coupled departures" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Gas constants and patient scaling

**Files:**
- Create: `packages/engine-core/src/l2/gas/params.ts`, `packages/engine-core/test/l2/gas/params.test.ts`

**Interfaces:**
- Consumes: `PatientProfile` (Task 1).
- Produces: constants `GAS_DT_S` 0.1, `PB_MMHG`, `PH2O_MMHG`, `RQ`, `HB_G_DL`, `K_CO2` 0.863, `PA_ET_GRADIENT` 3, `CMH2O_TO_MMHG`, `CO2_CF_PER_VCO2`, `CO2_CS_PER_VCO2`, `CO2_KFS_PER_VCO2`, `LOW_FLOW_EXP` 0.6, `LOW_FLOW_TAU_S` 5, `ANAT_DEAD_SPACE_ML_PER_KG` 2.2, `MASS_FLOW_DEFICIT_ML_MIN` 20, `BLOOD_VENOUS_FRACTION`, `CO_REF_LPM` 5.25, `CI_LPM_PER_KG` 0.075, `GA_METABOLIC` 0.85, `FRC_AWAKE_ML_KG` 30; `apparatusDeadSpaceMl(weightKg)`, `ageBand(ageY)`, `interface GasPatient { weightKg, ibwKg, effKg, frcMl, frcGaMl, vo2, vco2, bloodL, deadSpaceMl, cf, cs, kfs, complianceMl, resistance }`, `gasPatient(profile)`, `tempFactor(tCore)`.

- [x] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l2/gas/params.test.ts`:**

```ts
// Patient scaling for gas exchange (research 03 §8.9; brief §4.3–§4.4).
import { describe, expect, it } from 'vitest';
import { ageBand, apparatusDeadSpaceMl, gasPatient, tempFactor } from '../../../src/l2/gas/params.ts';

describe('gas patient scaling', () => {
  it('70 kg 175 cm man: IBW 70.6 kg, FRC 30/20 mL/kg awake/GA, VO2 245, VCO2 196, dead space 155 mL', () => {
    const p = gasPatient({ ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' });
    expect(p.ibwKg).toBe(70);
    expect(p.frcMl).toBeCloseTo(2100, 0);
    expect(p.frcGaMl).toBeCloseTo(1400, 0);
    expect(p.vo2).toBeCloseTo(245, 0);
    expect(p.vco2).toBeCloseTo(196, 0);
    expect(p.deadSpaceMl).toBeCloseTo(154, 0);
  });
  it('obesity shrinks FRC 3.5 %/BMI point above 25 and adjusted weight drives VO2; children use their own table', () => {
    const o = gasPatient({ ageY: 40, weightKg: 127, heightCm: 175, sex: 'M' });
    expect(o.frcGaMl / (20 * o.ibwKg)).toBeCloseTo(1 - 0.035 * (127 / 1.75 ** 2 - 25), 6);
    expect(o.effKg).toBeCloseTo(o.ibwKg + 0.4 * (127 - o.ibwKg), 6);
    const c = gasPatient({ ageY: 4, weightKg: 16 });
    expect(ageBand(4)).toBe('child');
    expect(c.frcGaMl).toBeCloseTo(128, 0);
    expect(c.vo2).toBeCloseTo(80, 0);
    expect(apparatusDeadSpaceMl(3.5)).toBeCloseTo(5.25, 6);
  });
  it('VO2/VCO2 fall 7.5 %/°C below 37 °C', () => {
    expect(tempFactor(36)).toBeCloseTo(0.925, 6);
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/gas/params.test.ts`
Expected: FAIL — cannot find `src/l2/gas/params.ts`.

- [x] **Step 3: Implement**

**Create `packages/engine-core/src/l2/gas/params.ts`:**

```ts
// Gas-exchange and respiratory constants scaled to the patient (brief §4.3 "Oxygen truth", §4.4 "Kinetics";
// research 03 §3.5, §4.4, §8.9). Every number cites its source, or [ENG] when the Stage 3 prototype tuned it
// (plan "Prototype results"). R22's profile layer (Stage 7) will replace the age/obesity rules with its table.
import type { PatientProfile } from '../../types.ts';

export const GAS_DT_S = 0.1; // gas exchange at 10 Hz (brief §3.2)
export const PB_MMHG = 760; // barometric pressure (brief §6.8 converts %V at 760) [ENG]
export const PH2O_MMHG = 47; // alveolar water vapour
export const RQ = 0.8; // respiratory quotient (research 03 §3.5)
export const HB_G_DL = 14; // haemoglobin [ENG; anaemia is R22's profile layer]
export const K_CO2 = 0.863; // PaCO2 = 0.863·VCO2/VA (research 03 §4.4)
export const PA_ET_GRADIENT = 3; // Pa − EtCO2, 2–5 mmHg normal (brief §4.4)
export const CMH2O_TO_MMHG = 0.7356;

/**
 * Two-compartment CO2 store (brief §4.4). The brief's C_f 15–20 / C_s 40–45 / k_fs = C_s/5 min give an apnoea
 * rise of 9.5 then 4.8 mmHg/min, outside its own acceptance (12 then 3.4 ± 0.5). Fitted to the apnoea data
 * (PubMed 2516732: +12 in the first minute, then 3.4/min) with C_f 6, C_s 55 mL/mmHg and k_fs 18 mL/min/mmHg at
 * VCO2 200 mL/min, and expressed per mL/min of baseline VCO2 so any body size keeps the anchored rates [ENG]:
 * prototype 12.0 then 3.34 mmHg/min; a +33 % alveolar-ventilation step moves 36 % of the way at 2 min and
 * 90 % at 24.4 min (plan decision 3).
 */
export const CO2_CF_PER_VCO2 = 6 / 200; // (mL/mmHg) per (mL/min)
export const CO2_CS_PER_VCO2 = 55 / 200;
export const CO2_KFS_PER_VCO2 = 18 / 200; // (mL/min/mmHg) per (mL/min)
/** Low-flow compression exponent: EtCO2 ≈ PaCO2·min(1, CO/CO_ref)^0.6 (brief §4.4). */
export const LOW_FLOW_EXP = 0.6;
export const LOW_FLOW_TAU_S = 5; // "falls below 5 mmHg within a few breaths" after arrest [ENG]

export const ANAT_DEAD_SPACE_ML_PER_KG = 2.2; // brief §4.4
/** Y-piece + HME on a ventilator or BVM: 50 mL adult, 1.5 mL/kg below 33 kg (neonatal circuits) [ENG]. */
export function apparatusDeadSpaceMl(weightKg: number): number {
  return Math.min(50, 1.5 * weightKg);
}
export const MASS_FLOW_DEFICIT_ML_MIN = 20; // apnoeic mass flow ≈ VO2 − ~20 mL/min (research 03 §3.5)
export const BLOOD_VENOUS_FRACTION = 0.75; // venous share of blood volume, the O2 buffer [ENG]
export const CO_REF_LPM = 5.25; // Stage 2's SV_REF 70 mL × 75 bpm: CO ratio reference [ENG]
export const CI_LPM_PER_KG = 0.075; // Q for gas exchange = CO ratio × 0.075 L/min/kg × effective weight [ENG]

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adult' | 'elderly';
export function ageBand(ageY: number): AgeBand {
  if (ageY < 28 / 365) return 'neonate';
  if (ageY < 1) return 'infant';
  if (ageY < 12) return 'child';
  return ageY >= 65 ? 'elderly' : 'adult';
}

/** VO2 and CO2 production fall 15–20 % under GA (brief §4.3, research 03 §4.4). */
export const GA_METABOLIC = 0.85;
/** FRC awake supine 30 mL/kg (brief §4.3). */
export const FRC_AWAKE_ML_KG = 30;
/**
 * Research 03 §8.9 (awake VO2 mL/kg/min, blood volume mL/kg) and FRC under GA (mL/kg): adult 20 (brief 20–25)
 * puts the healthy 70 kg adult at 90 % after 8.4 min (Benumof 8 min); children 8: Patel 2–5 y 160 ± 31 s
 * (prototype 158 s) [ENG, tuned].
 */
const BY_AGE: Record<AgeBand, { vo2: number; bv: number; frcGa: number; weight: number; height: number }> = {
  neonate: { vo2: 7, bv: 88, frcGa: 8, weight: 3.5, height: 50 },
  infant: { vo2: 6, bv: 78, frcGa: 8, weight: 7, height: 65 },
  child: { vo2: 5, bv: 72, frcGa: 8, weight: 16, height: 102 },
  adult: { vo2: 3.5, bv: 70, frcGa: 20, weight: 70, height: 175 },
  elderly: { vo2: 3.0, bv: 65, frcGa: 20, weight: 70, height: 170 },
};

export interface GasPatient {
  weightKg: number;
  ibwKg: number;
  /** Adjusted body weight IBW + 0.4·(W − IBW) (obesity) for metabolism and blood volume [ENG]. */
  effKg: number;
  frcMl: number; // awake supine
  frcGaMl: number; // under general anaesthesia
  vo2: number; // awake mL/min at 37 °C (× GA_METABOLIC under GA)
  vco2: number; // awake mL/min = RQ·VO2
  bloodL: number;
  deadSpaceMl: number; // anatomical
  /** CO2 compartments (mL/mmHg) and exchange (mL/min/mmHg). */
  cf: number;
  cs: number;
  kfs: number;
  complianceMl: number; // mL/cmH2O
  resistance: number; // cmH2O/L/s
}

/**
 * Patient scaling from PatientProfile (brief §7.4 patient.ageY/weightKg/heightCm/sex). Ideal body weight by
 * Devine (men 50, women 45.5 kg + 0.91 kg/cm above 152.4 cm). Obesity shrinks FRC by 3.5 % per BMI point above
 * 25, floor 40 %: Benumof's obese 127 kg adult to 90 % in 2.7 min (prototype 2.8 min) [ENG, tuned].
 */
export function gasPatient(p: PatientProfile | undefined): GasPatient {
  const band = ageBand(p?.ageY ?? 40);
  const a = BY_AGE[band];
  const w = p?.weightKg ?? a.weight;
  const h = p?.heightCm ?? a.height;
  const devine = (p?.sex === 'F' ? 45.5 : 50) + 0.91 * (h - 152.4);
  const ibw = band === 'adult' || band === 'elderly' ? Math.max(30, Math.min(w, devine)) : w;
  const eff = ibw + 0.4 * Math.max(0, w - ibw);
  const bmi = w / (h / 100) ** 2;
  const obese = band === 'adult' || band === 'elderly' ? Math.max(0.4, 1 - 0.035 * Math.max(0, bmi - 25)) : 1;
  const vo2 = a.vo2 * eff;
  return {
    weightKg: w, ibwKg: ibw, effKg: eff,
    frcMl: FRC_AWAKE_ML_KG * ibw * obese,
    frcGaMl: a.frcGa * ibw * obese,
    vo2, vco2: RQ * vo2,
    bloodL: (a.bv * eff) / 1000,
    deadSpaceMl: ANAT_DEAD_SPACE_ML_PER_KG * ibw,
    // anchored on the anaesthetised VCO2 (the apnoea data are from anaesthetised patients)
    cf: CO2_CF_PER_VCO2 * RQ * vo2 * GA_METABOLIC, cs: CO2_CS_PER_VCO2 * RQ * vo2 * GA_METABOLIC, kfs: CO2_KFS_PER_VCO2 * RQ * vo2 * GA_METABOLIC,
    complianceMl: 50 * (ibw / 70), // 50 mL/cmH2O intubated adult [ENG]; scales with size
    resistance: band === 'adult' || band === 'elderly' ? 10 : 25, // cmH2O/L/s incl. the tube [ENG]
  };
}

/** VO2/VCO2 temperature factor: −7.5 %/°C below 37 (research 03 §3.5, §4.4: 7–8 %/°C). */
export function tempFactor(tCore: number): number {
  return Math.max(0.3, 1 + 0.075 * (tCore - 37));
}
```

- [x] **Step 4: Run and verify** — same command; expected: 3 tests pass.

- [x] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/gas/params.ts packages/engine-core/test/l2/gas/params.test.ts
git commit -m "feat(gas): gas-exchange constants and patient scaling (IBW, FRC awake/GA, VO2, dead space)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Oxygen model (ODC, content, O2 store, shunt)

**Files:**
- Create: `packages/engine-core/src/l2/gas/o2.ts`, `packages/engine-core/test/l2/gas/o2.test.ts`

**Interfaces:**
- Consumes: Task 3 constants.
- Produces: `odc(po2, tempC?, pco2?)`, `content(po2, tempC?, pco2?)` (mL/L), `po2ForContent(c, …)`, `interface O2Inputs { vaLpm, fio2, massFlowFio2: number | null, qLpm, vo2, shunt, paco2, tempC, frcMl, bloodL }`, `interface O2State { fa, cv, sa, pao2 }`, `o2Steady(x, shunt): O2State | null`, `solveShunt(x, targetSa): number`, `createO2State(x)`, `stepO2(st, x, dtS)`.

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l2/gas/o2.test.ts`:**

```ts
// Oxygen truth (brief §4.3; research 03 §3.5): ODC, content, steady state, shunt calibration, apnoea direction.
import { describe, expect, it } from 'vitest';
import { content, o2Steady, odc, po2ForContent, solveShunt, stepO2, type O2Inputs } from '../../../src/l2/gas/o2.ts';

const x: O2Inputs = { vaLpm: 4.4, fio2: 0.21, massFlowFio2: null, qLpm: 5.25, vo2: 245, shunt: 0.03, paco2: 40, tempC: 37, frcMl: 2100, bloodL: 4.9 };

describe('O2 model', () => {
  it('Severinghaus ODC: P50 ≈ 26.8 mmHg, 90 % near 58 mmHg; hypothermia shifts it left', () => {
    expect(odc(26.8)).toBeCloseTo(0.5, 2);
    expect(odc(58)).toBeGreaterThan(0.89);
    expect(odc(58)).toBeLessThan(0.91);
    expect(odc(40, 33)).toBeGreaterThan(odc(40, 37));
    expect(po2ForContent(content(80))).toBeCloseTo(80, 3);
  });
  it('room-air steady state: PAO2 ≈ 100 mmHg, SaO2 96–98 %; the shunt solve inverts it', () => {
    const ss = o2Steady(x, 0.03)!;
    expect(ss.fa * 713).toBeGreaterThan(95);
    expect(ss.fa * 713).toBeLessThan(105);
    expect(ss.sa).toBeGreaterThan(0.96);
    expect(ss.sa).toBeLessThan(0.98);
    const s = solveShunt(x, 0.9);
    expect(o2Steady(x, s)!.sa).toBeCloseTo(0.9, 3);
    expect(o2Steady({ ...x, vaLpm: 0 }, 0.03)).toBeNull();
  });
  it('apnoea depletes the store; apnoeic oxygenation with O2 at a patent airway slows it', () => {
    const run = (mf: number | null) => {
      const st = o2Steady(x, 0.03)!;
      for (let i = 0; i < 900; i++) stepO2(st, { ...x, vaLpm: 0, massFlowFio2: mf }, 0.1);
      return st.sa;
    };
    expect(run(null)).toBeLessThan(0.9); // room air, 90 s
    expect(run(1)).toBeGreaterThan(run(null));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/gas/o2.test.ts`
Expected: FAIL — cannot find `src/l2/gas/o2.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l2/gas/o2.ts`:**

```ts
// Oxygen truth (brief §4.3 "Oxygen truth"; research 03 §3.5): alveolar O2 store (FRC·F_AO2), pulmonary
// capillary equilibrium, shunt mixing, a mixed-venous blood buffer, apnoeic mass flow, and the Severinghaus
// dissociation curve with a virtual-PO2 shift for temperature and PCO2. Plain data; stepped at 10 Hz.
import { BLOOD_VENOUS_FRACTION, HB_G_DL, MASS_FLOW_DEFICIT_ML_MIN, PB_MMHG, PH2O_MMHG, RQ } from './params.ts';

const PI_DRY = PB_MMHG - PH2O_MMHG; // 713 mmHg
const O2_CAP = 1.34 * HB_G_DL * 10; // mL O2 per L blood at 100 % saturation

/**
 * Severinghaus 1979 (research 03 §3.5, §11 #13 confirmed): SO2 = 1/(23400/(P³ + 150·P) + 1). Shifted through a
 * virtual PO2 = PO2·10^(0.024·(37 − T) + 0.06·log10(40/PCO2)) — Kelman 1966 coefficients, still unverified
 * (research 03 §11 #14); pH is not modelled in v1.
 */
export function odc(po2: number, tempC = 37, pco2 = 40): number {
  const v = Math.max(0, po2) * 10 ** (0.024 * (37 - tempC) + 0.06 * Math.log10(40 / Math.max(5, pco2)));
  return 1 / (23400 / (v * v * v + 150 * v + 1e-9) + 1);
}

/** O2 content, mL/L: 1.34·Hb·SO2 + 0.003·PO2 per dL (brief §4.3). */
export function content(po2: number, tempC = 37, pco2 = 40): number {
  return O2_CAP * odc(po2, tempC, pco2) + 0.03 * Math.max(0, po2);
}

/** PO2 whose content is `c` (bisection; content is monotonic in PO2). */
export function po2ForContent(c: number, tempC = 37, pco2 = 40): number {
  let lo = 0;
  let hi = 800;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (content(mid, tempC, pco2) < c) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface O2Inputs {
  vaLpm: number; // alveolar ventilation reaching gas-exchanging alveoli (L/min BTPS)
  fio2: number; // O2 fraction of that gas
  /** O2 fraction of the gas at a patent airway during apnoea (mass flow), or null (obstructed / no airway). */
  massFlowFio2: number | null;
  qLpm: number; // pulmonary blood flow for gas exchange (L/min)
  vo2: number; // mL/min
  shunt: number; // Qs/Qt
  paco2: number;
  tempC: number;
  frcMl: number;
  bloodL: number;
}

export interface O2State {
  fa: number; // alveolar O2 fraction (dry)
  cv: number; // mixed-venous O2 content, mL/L
  sa: number; // pulmonary-arterial SaO2 (0–1) after shunt mixing
  pao2: number;
}

/** Steady state for given inputs and shunt, or null when there is no ventilation to reach one. */
export function o2Steady(x: O2Inputs, shunt: number): O2State | null {
  if (x.vaLpm < 0.3) return null;
  const faco2 = x.paco2 / PI_DRY;
  const fa = Math.max(0.01, x.fio2 - (1 / RQ - 1) * faco2 - x.vo2 / (x.vaLpm * 1000));
  const cc = content(fa * PI_DRY, x.tempC, x.paco2);
  const d = x.vo2 / Math.max(0.3, x.qLpm);
  const s = Math.min(0.95, Math.max(0, shunt));
  const ca = cc - (s * d) / (1 - s);
  const pao2 = po2ForContent(ca, x.tempC, x.paco2);
  return { fa, cv: ca - d, sa: odc(pao2, x.tempC, x.paco2), pao2 };
}

/**
 * MANUAL calibration (plan decision 2): the shunt that makes the steady-state SaO2 equal `targetSa` (0–1) at the
 * current FiO2, ventilation and flow. Clamped to [0, 0.6]; a target the clamp cannot reach sets the override flag.
 */
export function solveShunt(x: O2Inputs, targetSa: number): number {
  let lo = 0;
  let hi = 0.6;
  const at = (s: number) => o2Steady(x, s)?.sa ?? 0;
  if (at(lo) <= targetSa) return lo;
  if (at(hi) >= targetSa) return hi;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) > targetSa) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function createO2State(x: O2Inputs): O2State {
  return o2Steady(x, x.shunt) ?? { fa: 0.14, cv: 140, sa: 0.97, pao2: 95 };
}

/**
 * One Euler step of dtS seconds. Lung: V·dF/dt = VA·(FiO2 − F − (1/RQ − 1)·FACO2) − uptake while ventilated;
 * in apnoea V·dF/dt = −uptake·(1 − F) + Q_mf·(F_airway − F), Q_mf = uptake − 20 mL/min when the airway is patent
 * (research 03 §3.5). Blood: V_v·dCv/dt = Q·(Ca − Cv) − VO2. Uptake = Q·(1 − s)·(Cc′ − Cv).
 */
export function stepO2(st: O2State, x: O2Inputs, dtS: number): void {
  const dt = dtS / 60;
  const s = Math.min(0.95, Math.max(0, x.shunt));
  const cc = content(st.fa * PI_DRY, x.tempC, x.paco2);
  const ca = (1 - s) * cc + s * st.cv;
  const uptake = x.qLpm * (1 - s) * (cc - st.cv);
  let dF: number;
  if (x.vaLpm > 0) {
    dF = x.vaLpm * 1000 * (x.fio2 - st.fa - (1 / RQ - 1) * (x.paco2 / PI_DRY)) - uptake;
  } else {
    dF = -uptake * (1 - st.fa);
    if (x.massFlowFio2 !== null) dF += Math.max(0, uptake - MASS_FLOW_DEFICIT_ML_MIN) * (x.massFlowFio2 - st.fa);
  }
  st.fa = Math.min(1, Math.max(0.001, st.fa + (dF / x.frcMl) * dt));
  const vv = BLOOD_VENOUS_FRACTION * x.bloodL;
  st.cv = Math.max(0, st.cv + ((x.qLpm * (ca - st.cv) - x.vo2) / vv) * dt);
  const caNew = (1 - s) * content(st.fa * PI_DRY, x.tempC, x.paco2) + s * st.cv;
  st.pao2 = po2ForContent(caNew, x.tempC, x.paco2);
  st.sa = odc(st.pao2, x.tempC, x.paco2);
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/gas/o2.ts packages/engine-core/test/l2/gas/o2.test.ts
git commit -m "feat(gas): O2 store, Severinghaus ODC with virtual-PO2 shift, shunt mixing, venous buffer, shunt solve" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Two-compartment CO2 kinetics

**Files:**
- Create: `packages/engine-core/src/l2/gas/co2.ts`, `packages/engine-core/test/l2/gas/co2.test.ts`

**Interfaces:**
- Consumes: Task 3 constants and `gasPatient`.
- Produces: `interface Co2State { pf, ps, flow, vdExtraMl }`, `interface Co2Inputs { vaLpm, vco2, coRatio, cf, cs, kfs, extraGradient }`, `lowFlowFactor(coRatio)`, `createCo2State(paco2)`, `stepCo2(st, x, dtS)`, `etco2True(st, extraGradient)`, `vaForPaco2(vco2, paco2)`.

- [ ] **Step 1: Write the failing test** (BUILD-PLAN acceptance 4 on the model; decision 3 explains the +33 % step)

**Create `packages/engine-core/test/l2/gas/co2.test.ts`:**

```ts
// CO2 kinetics (brief §4.4; BUILD-PLAN Stage 3 acceptance 4) on the model alone, 70 kg adult under GA.
import { describe, expect, it } from 'vitest';
import { createCo2State, etco2True, stepCo2, vaForPaco2 } from '../../../src/l2/gas/co2.ts';
import { GA_METABOLIC, gasPatient } from '../../../src/l2/gas/params.ts';

const pat = gasPatient({ ageY: 40, weightKg: 70, heightCm: 175 });
const vco2 = pat.vco2 * GA_METABOLIC;
const x = (va: number, coRatio = 1) => ({ vaLpm: va, vco2, coRatio, cf: pat.cf, cs: pat.cs, kfs: pat.kfs, extraGradient: 0 });
function run(paco2: number, va: number, minutes: number, coRatio = 1): number[] {
  const st = createCo2State(paco2);
  const out = [st.pf];
  for (let i = 0; i < minutes * 600; i++) {
    stepCo2(st, x(va, coRatio), 0.1);
    if ((i + 1) % 60 === 0) out.push(st.pf); // every 6 s
  }
  return out;
}

describe('two-compartment CO2 kinetics', () => {
  it('apnoea: +12 ± 3 mmHg in the first minute, then 3.4 ± 0.5 mmHg/min (PubMed 2516732)', () => {
    const p = run(40, 0, 6);
    expect(p[10]! - p[0]!).toBeGreaterThanOrEqual(9);
    expect(p[10]! - p[0]!).toBeLessThanOrEqual(15);
    const slope = (p[60]! - p[10]!) / 5;
    expect(slope).toBeGreaterThanOrEqual(2.9);
    expect(slope).toBeLessThanOrEqual(3.9);
  });

  it('a +33 % alveolar-ventilation step: 30–40 % of the change in 2–3 min, 90 % within 20–40 min', () => {
    const va0 = vaForPaco2(vco2, 40);
    const p = run(40, va0 * 1.33, 60);
    const fin = 40 / 1.33;
    const frac = (i: number) => (40 - p[i]!) / (40 - fin);
    expect(frac(20)).toBeGreaterThanOrEqual(0.3); // 2 min
    expect(frac(25)).toBeLessThanOrEqual(0.4); // 2.5 min
    const t90 = p.findIndex((_, i) => frac(i) >= 0.9) / 10;
    expect(t90).toBeGreaterThanOrEqual(20);
    expect(t90).toBeLessThanOrEqual(40);
  });

  it('halving ventilation is slower than raising it (research 03 §4.4), and settles on PaCO2 ≈ 80', () => {
    const va0 = vaForPaco2(vco2, 40);
    const up = run(40, va0 / 2, 180);
    const frac25 = (up[25]! - 40) / 40;
    expect(frac25).toBeLessThan(0.3);
    expect(up[1800]!).toBeGreaterThan(76);
  });

  it('low flow: CPR-level output (CO 29 %) holds EtCO2 at 10–20 mmHg over 1–3 min (then the tissue build-up restores it, research 03 §4.4); arrest (CO 0) < 5 mmHg within 30 s', () => {
    const st = createCo2State(40);
    const va = vaForPaco2(vco2, 40);
    for (let i = 1; i <= 1800; i++) {
      stepCo2(st, x(va, 0.29), 0.1);
      if (i % 600 === 0) {
        expect(etco2True(st, 0)).toBeGreaterThanOrEqual(10);
        expect(etco2True(st, 0)).toBeLessThanOrEqual(20);
      }
    }
    const a = createCo2State(40);
    for (let i = 0; i < 300; i++) stepCo2(a, x(va, 0), 0.1);
    expect(etco2True(a, 0)).toBeLessThan(5);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/gas/co2.test.ts`
Expected: FAIL — cannot find `src/l2/gas/co2.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l2/gas/co2.ts`:**

```ts
// CO2 kinetics (brief §4.4 "Kinetics"; research 03 §4.4): two compartments (fast: lung gas + blood + well-
// perfused tissue; slow: muscle class), alveolar elimination limited by pulmonary blood flow (low-flow
// compression, so CO2 accumulates in arrest and washes out at ROSC), Pa − EtCO2 gradient.
import { K_CO2, LOW_FLOW_EXP, LOW_FLOW_TAU_S, PA_ET_GRADIENT } from './params.ts';

export interface Co2State {
  pf: number; // fast compartment = PaCO2 (mmHg)
  ps: number; // slow compartment
  flow: number; // lagged low-flow factor min(1, CO/CO_ref)^0.6
  /** MANUAL calibration: physiological dead space beyond anatomical + apparatus (mL), plan decision 2. */
  vdExtraMl: number;
}

export interface Co2Inputs {
  vaLpm: number; // alveolar ventilation (L/min), already net of every dead space
  vco2: number; // mL/min
  coRatio: number; // CO / CO_ref
  cf: number;
  cs: number;
  kfs: number;
  extraGradient: number; // added Pa − Et (bronchospasm) mmHg
}

/** min(1, CO/CO_ref)^0.6 (brief §4.4 low-flow compression). */
export function lowFlowFactor(coRatio: number): number {
  return Math.min(1, Math.max(0, coRatio)) ** LOW_FLOW_EXP;
}

export function createCo2State(paco2: number): Co2State {
  return { pf: paco2, ps: paco2, flow: 1, vdExtraMl: 0 };
}

/**
 * C_f·dPf/dt = φ·VCO2 − φ·VA·Pf/0.863 − k_fs·(Pf − Ps); C_s·dPs/dt = k_fs·(Pf − Ps) + (1 − φ)·VCO2 (brief §4.4 with
 * φ = min(1, CO/CO_ref)^0.6, lagged τ 5 s). φ = 1 is the brief's model exactly.
 */
export function stepCo2(st: Co2State, x: Co2Inputs, dtS: number): void {
  const target = lowFlowFactor(x.coRatio);
  st.flow += (target - st.flow) * (1 - Math.exp(-dtS / LOW_FLOW_TAU_S));
  const dt = dtS / 60;
  const elim = (st.flow * x.vaLpm * st.pf) / K_CO2;
  const ex = x.kfs * (st.pf - st.ps);
  // low flow: CO2 the blood does not carry away stays in the tissues (slow compartment) → ROSC washout [ENG]
  st.pf = Math.max(0, st.pf + ((st.flow * x.vco2 - elim - ex) / x.cf) * dt);
  st.ps = Math.max(0, st.ps + ((ex + (1 - st.flow) * x.vco2) / x.cs) * dt);
}

/** True end-tidal PCO2 of an exchanging breath: (PaCO2 − Δ)·φ (brief §4.4 "EtCO2 = PaCO2 − Δ", low flow). */
export function etco2True(st: Co2State, extraGradient: number): number {
  return Math.max(0, (st.pf - PA_ET_GRADIENT - extraGradient) * st.flow);
}

/** Alveolar ventilation that holds PaCO2 at `paco2` for this VCO2 (steady state of the fast compartment). */
export function vaForPaco2(vco2: number, paco2: number): number {
  return (K_CO2 * vco2) / Math.max(1, paco2);
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 4 tests pass (prototype: apnoea +12.0 then 3.34 mmHg/min; +33 % step 35.7 % at 2 min, 90 % at 24.4 min).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/gas/co2.ts packages/engine-core/test/l2/gas/co2.test.ts
git commit -m "feat(gas): two-compartment CO2 kinetics fitted to the apnoea data, low-flow compression and tissue store" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Circulatory delay lung → probe

**Files:**
- Create: `packages/engine-core/src/l2/gas/delay.ts`, `packages/engine-core/test/l2/gas/delay.test.ts`

**Interfaces:**
- Produces: `DELAY_FINGER_S` 15, `DELAY_EAR_S` 5, `DELAY_MAX_S` 60, `interface DelayLine { hist, k, delay }`, `createDelay(sa0)`, `siteDelay(site, coRatio, pi)`, `delayStep(d, sa, target, dtS): number` (site SaO2).

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l2/gas/delay.test.ts`:**

```ts
// Circulatory delay lung → probe (brief §4.3 step 2; research 03 §3.6).
import { describe, expect, it } from 'vitest';
import { createDelay, delayStep, siteDelay } from '../../../src/l2/gas/delay.ts';

describe('circulatory delay', () => {
  it('finger 15 s and ear 5 s at normal CO; ×CO_ref/CO, longer with vasoconstriction, capped at 60 s', () => {
    expect(siteDelay('leftFinger', 1, 2)).toBe(15);
    expect(siteDelay('ear', 1, 2)).toBe(5);
    expect(siteDelay('leftFinger', 0.5, 2)).toBe(30);
    expect(siteDelay('leftFinger', 0.25, 0.1)).toBe(60);
  });
  it('a step appears at the site after the dead time', () => {
    const d = createDelay(0.97);
    const out: number[] = [];
    for (let k = 0; k < 300; k++) out.push(delayStep(d, k < 50 ? 0.97 : 0.85, 15, 0.1));
    expect(out[50 + 140]).toBeCloseTo(0.97, 6);
    expect(out[50 + 160]).toBeCloseTo(0.85, 6);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/gas/delay.test.ts`
Expected: FAIL — cannot find `src/l2/gas/delay.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l2/gas/delay.ts`:**

```ts
// Circulatory delay lung → probe site (brief §4.3 device chain step 2; research 03 §3.6 item 1): a dead time of
// 15 s at the finger and 5 s at the ear/forehead at normal CO [ENG within 10–20], scaled by CO_ref/CO and by
// vasoconstriction (low PI), reaching 30–60 s in low-output states. History of pulmonary SaO2 at 10 Hz.
export const DELAY_FINGER_S = 15;
export const DELAY_EAR_S = 5;
export const DELAY_MAX_S = 60;
export const DELAY_SMOOTH_S = 5; // the delay itself moves with τ 5 s so the read point never jumps [ENG]
const HIST = 700; // 70 s at 10 Hz

export interface DelayLine {
  hist: number[]; // ring, index k % HIST holds gas step k
  k: number; // next gas step index
  delay: number; // current smoothed delay (s)
}

export function createDelay(sa0: number): DelayLine {
  return { hist: new Array<number>(HIST).fill(sa0), k: 0, delay: DELAY_FINGER_S };
}

/** Target delay for a site, CO ratio and PI (vasoconstriction below PI 1 % lengthens it) [ENG]. */
export function siteDelay(site: string, coRatio: number, pi: number | null): number {
  const base = site === 'ear' || site === 'forehead' ? DELAY_EAR_S : DELAY_FINGER_S;
  const flow = 1 / Math.min(1, Math.max(0.25, coRatio));
  const tone = pi !== null && pi < 1 ? 1 + 0.5 * (1 - Math.max(0, pi)) : 1;
  return Math.min(DELAY_MAX_S, base * flow * tone);
}

/** Push this gas step's pulmonary SaO2 and return the SaO2 at the site (interpolated `delay` seconds back). */
export function delayStep(d: DelayLine, sa: number, target: number, dtS: number): number {
  d.hist[d.k % HIST] = sa;
  d.k++;
  d.delay += (target - d.delay) * (1 - Math.exp(-dtS / DELAY_SMOOTH_S));
  const back = Math.min(HIST - 2, d.delay / dtS);
  const i0 = Math.floor(back);
  const w = back - i0;
  const at = (j: number) => d.hist[(((d.k - 1 - j) % HIST) + HIST) % HIST] as number;
  return at(i0) * (1 - w) + at(i0 + 1) * w;
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/gas/delay.ts packages/engine-core/test/l2/gas/delay.test.ts
git commit -m "feat(gas): circulatory dead time to the SpO2 site, scaled by CO and vasoconstriction" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Temperature model

**Files:**
- Create: `packages/engine-core/src/l2/temp/temp.ts`, `packages/engine-core/test/l2/temp/temp.test.ts`

**Interfaces:**
- Consumes: `TempSite` (Task 1).
- Produces: constants (`GA_KCP`, `VASOCONSTRICT_C`, `MH_MAX_FACTOR` 5, `MH_VCO2_FACTOR` 3, `MH_ONSET_S`, `SITES`, `SENSOR_TAU_S` …), `interface TempState { tc, tp, ta, capCore, capPer, k0, h, m0, anaesthesia, warming, mh, sites }`, `createTemp(tCore, effKg)`, `mhFactor(st, t, max?)`, `stepTemp(st, t, dtS)`, `setCoreTarget(st, tCore)`.

- [ ] **Step 1: Write the failing test** (BUILD-PLAN acceptance 7)

**Create `packages/engine-core/test/l2/temp/temp.test.ts`:**

```ts
// Temperature (brief §4.6; BUILD-PLAN Stage 3 acceptance 7; research 03 §6.2) on the heat model alone, 70 kg.
import { describe, expect, it } from 'vitest';
import { createTemp, MH_VCO2_FACTOR, mhFactor, setCoreTarget, stepTemp, type TempState } from '../../../src/l2/temp/temp.ts';

function run(st: TempState, fromS: number, seconds: number): number[] {
  const out: number[] = [];
  for (let s = 1; s <= seconds; s++) {
    stepTemp(st, fromS + s, 1);
    if (s % 60 === 0) out.push(st.tc); // per minute
  }
  return out;
}

describe('two-compartment heat model', () => {
  it('awake steady state does not drift (24 h)', () => {
    const st = createTemp(36.8, 70);
    run(st, 0, 86_400);
    expect(Math.abs(st.tc - 36.8)).toBeLessThan(0.01);
  });

  it('GA: redistribution −1.0 to −1.5 °C in the first hour, then −0.3 to −0.5 °C/h, then a 34.5–35.5 °C plateau', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'general';
    const tc = run(st, 0, 8 * 3600);
    const drop1 = 36.8 - tc[59]!;
    expect(drop1).toBeGreaterThanOrEqual(1.0);
    expect(drop1).toBeLessThanOrEqual(1.5);
    const rate = tc[59]! - tc[119]!; // °C lost in hour 2
    expect(rate).toBeGreaterThanOrEqual(0.3);
    expect(rate).toBeLessThanOrEqual(0.5);
    const last = tc.slice(-60); // hour 8: plateau
    expect(Math.min(...last)).toBeGreaterThanOrEqual(34.5);
    expect(Math.max(...last)).toBeLessThanOrEqual(35.5);
    expect(Math.max(...last) - Math.min(...last)).toBeLessThan(0.1);
  });

  it('neuraxial: smaller redistribution and no plateau (still falling below 34.5 °C in hour 8)', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'neuraxial';
    const tc = run(st, 0, 8 * 3600);
    expect(36.8 - tc[59]!).toBeLessThan(1.0);
    expect(tc[419]! - tc[479]!).toBeGreaterThan(0.1); // still falling in hour 8, where GA has plateaued
    expect(tc[479]!).toBeLessThan(34.5);
  });

  it('forced-air warming adds +0.5–1 °C/h against the GA linear phase', () => {
    const a = createTemp(36.8, 70);
    const b = createTemp(36.8, 70);
    a.anaesthesia = b.anaesthesia = 'general';
    b.warming = true;
    const ta = run(a, 0, 3 * 3600);
    const tb = run(b, 0, 3 * 3600);
    const gain = tb[179]! - tb[119]! - (ta[179]! - ta[119]!);
    expect(gain).toBeGreaterThanOrEqual(0.5);
    expect(gain).toBeLessThanOrEqual(1.0);
  });

  it('MH: once established the core rises ≥ 1 °C per 15 min, with VCO2 × 2–5', () => {
    const st = createTemp(36.8, 70);
    st.anaesthesia = 'general';
    st.mh = { severity: 1, t0: 600 };
    const tc = run(st, 0, 45 * 60);
    expect(mhFactor(st, 45 * 60, MH_VCO2_FACTOR)).toBeGreaterThanOrEqual(2); // VCO2 × 2–5
    expect(mhFactor(st, 45 * 60, MH_VCO2_FACTOR)).toBeLessThanOrEqual(5);
    expect(tc[44]! - tc[29]!).toBeGreaterThanOrEqual(1.0); // minutes 30 → 45
  });

  it('a rectal probe lags the oesophageal probe with τ 20–60 min (step of core by the MANUAL target)', () => {
    const st = createTemp(36.8, 70);
    setCoreTarget(st, 38.8);
    for (const k of Object.keys(st.sites) as Array<keyof typeof st.sites>) st.sites[k] = 36.8 + (k === 'axilla' ? -0.5 : 0);
    let tauR = 0;
    for (let s = 1; s <= 7200; s++) {
      stepTemp(st, s, 1);
      if (!tauR && st.sites.rectal - 36.8 >= 0.632 * 2) tauR = s;
    }
    expect(st.sites.oesophageal).toBeGreaterThan(38.7);
    expect(tauR / 60).toBeGreaterThanOrEqual(20);
    expect(tauR / 60).toBeLessThanOrEqual(60);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/temp/temp.test.ts`
Expected: FAIL — cannot find `src/l2/temp/temp.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l2/temp/temp.ts`:**

```ts
// Temperature (brief §4.6; research 03 §6): a two-compartment heat model (core 2/3 and periphery 1/3 of body
// mass, 3.5 kJ/kg/°C) with core→periphery conductance k_cp that rises at induction (redistribution) and falls
// below the 34.5 °C vasoconstriction threshold (plateau), metabolic heat M (−20 % under GA, × MH), losses to
// ambient, forced-air warming; then per-site first-order lags behind core. Stepped at 1 Hz. Plain data.
import type { TempSite } from '../../types-resp.ts';

export const HEAT_CAP_J_KG_C = 3500; // brief §4.6
export const CORE_FRACTION = 2 / 3; // research 03 §6.2
export const M_AWAKE_W_70 = 80; // metabolic heat ~80 W (brief §4.6), scaled by effective weight
export const PERIPH_GRADIENT_C = 4.3; // awake core − periphery at 21 °C ambient [ENG: gives the 1–1.5 °C redistribution]
export const AMBIENT_C = 21; // operating theatre [ENG]
export const GA_KCP = 3; // k_cp × 2–4 at induction (brief §4.6)
export const GA_M = 0.8; // M −15–20 % under GA
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG]
export const NEURAXIAL_H = 1.5; // vasodilated skin below the block loses more heat [ENG]
export const VASOCONSTRICT_C = 34.8; // GA vasoconstriction (brief §4.6: ~34.5): centre of a 0.1 °C logistic so the plateau lands at 34.6–34.8 [ENG]
export const VASOCONSTRICT_KCP = 0.5; // k_cp once constricted [ENG]
export const WARMING_W_70 = 60; // forced air +0.5–1 °C/h (brief §4.6) [ENG]
export const MH_MAX_FACTOR = 5; // MH heat × 5 at severity 1: ≥ 1 °C per 15 min once established (brief §4.6) [ENG]
/** MH CO2 production × 3 at severity 1 (brief §4.9: VCO2 × 2–5); × 5 would take EtCO2 past the 150 mmHg schema limit in 30 min [ENG]. */
export const MH_VCO2_FACTOR = 3;
export const MH_ONSET_S = 900; // reaches full severity over 15 min (5–30 min) [ENG]
/** Site lag τ (s) and offset (°C) behind core (brief §4.6 table). */
export const SITES: Readonly<Record<TempSite, { tauS: number; offset: number }>> = {
  oesophageal: { tauS: 45, offset: 0 }, // 0.5–1 min
  nasopharyngeal: { tauS: 120, offset: 0 }, // 1–3 min
  tympanic: { tauS: 120, offset: 0 },
  bladder: { tauS: 720, offset: 0 }, // 5–20 min
  rectal: { tauS: 2400, offset: 0 }, // 20–60 min
  axilla: { tauS: 300, offset: -0.5 }, // 5 min, −0.5 °C
};
export const SENSOR_TAU_S = 5; // probe time constant < 10 s (research 03 §6.1)

export interface TempState {
  tc: number;
  tp: number;
  ta: number;
  capCore: number; // J/°C
  capPer: number;
  k0: number; // awake k_cp W/°C
  h: number; // periphery → ambient W/°C
  m0: number; // awake metabolic heat W
  anaesthesia: 'none' | 'general' | 'neuraxial';
  warming: boolean;
  mh: { severity: number; t0: number } | null;
  sites: Record<TempSite, number>;
}

export function createTemp(tCore: number, effKg: number): TempState {
  const m0 = M_AWAKE_W_70 * (effKg / 70);
  const tp = tCore - PERIPH_GRADIENT_C;
  const sites = {} as Record<TempSite, number>;
  for (const s of Object.keys(SITES) as TempSite[]) sites[s] = tCore;
  return {
    tc: tCore, tp, ta: AMBIENT_C,
    capCore: HEAT_CAP_J_KG_C * effKg * CORE_FRACTION, capPer: HEAT_CAP_J_KG_C * effKg * (1 - CORE_FRACTION),
    k0: m0 / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0,
    anaesthesia: 'none', warming: false, mh: null, sites,
  };
}

/** MH multiplier at time t (1 when absent): heat by default, `max` = MH_VCO2_FACTOR for CO2/O2 production. */
export function mhFactor(st: TempState, t: number, max = MH_MAX_FACTOR): number {
  if (!st.mh) return 1;
  const r = Math.min(1, Math.max(0, (t - st.mh.t0) / MH_ONSET_S));
  return 1 + (max - 1) * st.mh.severity * r;
}

function kcp(st: TempState): number {
  if (st.anaesthesia === 'neuraxial') return st.k0 * NEURAXIAL_KCP;
  if (st.anaesthesia !== 'general') return st.k0;
  const constrict = 1 / (1 + Math.exp((st.tc - VASOCONSTRICT_C) / 0.1)); // 0 warm → 1 below threshold
  return st.k0 * (GA_KCP * (1 - constrict) + VASOCONSTRICT_KCP * constrict);
}

/** One step of dtS seconds (≤ 1 s): Cc·dTc = M − k(Tc − Tp); Cp·dTp = k(Tc − Tp) − h(Tp − Ta) + warming. */
export function stepTemp(st: TempState, t: number, dtS: number): void {
  const m = st.m0 * (st.anaesthesia === 'general' ? GA_M : 1) + st.m0 * (mhFactor(st, t) - 1); // MH heat is muscle, not blunted by GA
  const flux = kcp(st) * (st.tc - st.tp);
  const warm = st.warming ? WARMING_W_70 * (st.capCore / (HEAT_CAP_J_KG_C * 70 * CORE_FRACTION)) : 0;
  st.tc += ((m - flux) / st.capCore) * dtS;
  const h = st.h * (st.anaesthesia === 'neuraxial' ? NEURAXIAL_H : 1);
  st.tp += ((flux - h * (st.tp - st.ta) + warm) / st.capPer) * dtS;
  for (const s of Object.keys(SITES) as TempSite[]) {
    const p = SITES[s];
    st.sites[s] += (st.tc + p.offset - st.sites[s]) * (1 - Math.exp(-dtS / p.tauS));
  }
}

/**
 * MANUAL target (plan decision 2): place the model at a steady state with core = tCore (the periphery and the
 * metabolic heat are re-solved so nothing drifts afterwards; a fever is a raised set point).
 */
export function setCoreTarget(st: TempState, tCore: number): void {
  const k = kcp({ ...st, tc: tCore });
  st.tc = tCore;
  st.tp = (k * tCore + st.h * st.ta) / (k + st.h);
  const gaM = st.anaesthesia === 'general' ? GA_M : 1;
  st.m0 = (k * (tCore - st.tp)) / gaM;
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 6 tests pass (prototype: GA −1.28 °C at 60 min, −0.39 °C in hour 2, plateau 34.65 °C; rectal τ 40 min).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/temp/temp.ts packages/engine-core/test/l2/temp/temp.test.ts
git commit -m "feat(temp): two-compartment heat model (redistribution, linear phase, plateau, neuraxial, warming, MH) and probe sites" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Respiratory driver

**Files:**
- Create: `packages/engine-core/src/l2/resp/driver.ts`, `packages/engine-core/test/l2/resp/driver.test.ts`

**Interfaces:**
- Consumes: `normal`, `Sfc32State` (rng), Task 1 types.
- Produces: constants `INSP_FLOW_LPS` 0.05, `DRIVE_TIMEOUT_S` 5, `U_REF_CMH2O` 10, `NEVER` 1e12, `GASTRIC_BREATHS` 5, `EXP_TAU_S`; types `Sampled`, `Shape`, `interface Cycle { seq, t0, ti, te, vt, kind, mech, exch, sampled, gastric, effort, shape, severity, cleft, fio2, fico2, cutAt, emitted }`, `ExtDrive`, `DriverState`, `DriverCtx { rr, vt, fio2, etco2, complianceMl }`; functions `createDriver(rng)`, `cycleAt(d, t)`, `lastCycleBefore(d, t)`, `preoxActive(d, t)`, `planCycles(d, ctx, until)`, `pruneCycles(d, t)`, `replan(d, t, cut, restartNow): number[]`, `onVentFrame(d, frame, t)`, `checkDrive(d, t)`, `cycleVolume(c, t)`, `chestVolume(d, t)`, `breathSignal(d, t, complianceMl)` (the u(t) seam), `meanAirwayPressure(d, t, complianceMl)`, `alveolarVentilation(d, t, deadSpaceMl)`, `nominalRate(d, ctx)`.

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l2/resp/driver.test.ts`:**

```ts
// Respiratory driver (brief §4.7): cycles by source and airway state, the u(t) seam, VA, external drive.
import { describe, expect, it } from 'vitest';
import { seedStream } from '../../../src/rng/sfc32.ts';
import {
  alveolarVentilation, breathSignal, chestVolume, createDriver, cycleAt, meanAirwayPressure, onVentFrame, planCycles, replan, type DriverCtx,
} from '../../../src/l2/resp/driver.ts';

const ctx: DriverCtx = { rr: 15, vt: 500, fio2: 0.21, etco2: 36, complianceMl: 50 };
const mk = () => createDriver(seedStream(1, 'resp'));

describe('respiratory driver', () => {
  it('ventilator: RR 12, I:E 1:2, u(t) has mean 0.5 and a 1.0 swing for VT 500 at C 50', () => {
    const d = mk();
    d.source = 'ventilator';
    d.vent = { rr: 12, vt: 500, peep: 5, ie: 2 };
    planCycles(d, ctx, 60);
    const c = cycleAt(d, 30)!;
    expect(c.ti + c.te).toBeCloseTo(5, 9);
    expect(c.ti).toBeCloseTo(5 / 3, 9);
    let s = 0;
    let lo = 9;
    let hi = -9;
    for (let t = 30; t < 35; t += 0.01) {
      const u = breathSignal(d, t, 50);
      s += u;
      lo = Math.min(lo, u);
      hi = Math.max(hi, u);
    }
    expect(s / 500).toBeCloseTo(0.5, 2);
    expect(hi - lo).toBeCloseTo(1.0, 1);
    expect(alveolarVentilation(d, 30, 204)).toBeCloseTo((12 * 296) / 1000, 6);
    expect(meanAirwayPressure(d, 30, 50)).toBeGreaterThan(7);
  });

  it('spontaneous apnoea: no cycles, u = 0.5; obstructed: chest efforts without gas exchange', () => {
    const d = mk();
    d.airway = 'apnoea';
    planCycles(d, ctx, 30);
    expect(d.cycles).toHaveLength(0);
    expect(breathSignal(d, 10, 50)).toBe(0.5);
    const o = mk();
    o.airway = 'obstructed';
    planCycles(o, ctx, 30);
    expect(o.cycles.length).toBeGreaterThan(5);
    expect(o.cycles.every((c) => !c.exch && c.sampled === 'none')).toBe(true);
    expect(alveolarVentilation(o, 10, 150)).toBe(0);
    expect(Math.max(...Array.from({ length: 400 }, (_, i) => chestVolume(o, 10 + i / 100)))).toBeGreaterThan(300);
  });

  it('airway loss cuts the running cycle at once and withdraws planned ones', () => {
    const d = mk();
    d.source = 'ventilator';
    planCycles(d, ctx, 12);
    const dropped = replan(d, 10.5, true, false);
    expect(dropped.length).toBeGreaterThanOrEqual(0);
    expect(cycleAt(d, 10.5)!.cutAt).toBe(10.5);
    expect(alveolarVentilation(d, 10.6, 150)).toBe(0);
  });

  it('externalDrive: inspiration at flow > 0.05 L/s makes a cycle with the frame volume; mean Paw is the breath mean', () => {
    const d = mk();
    for (let t = 0.02; t <= 20; t += 0.02) {
      const u = t % 5;
      const insp = u < 1.5;
      const vol = insp ? (500 * u) / 1.5 : 500 * Math.exp(-(u - 1.5) / 0.5);
      onVentFrame(d, { pawCmH2O: 5 + vol / 50, flowLps: insp ? 0.33 : -0.5, volumeMl: vol, fio2: 0.4, peepCmH2O: 5 }, t);
    }
    expect(d.source).toBe('external');
    const done = d.cycles.slice(1, -1);
    expect(done.length).toBeGreaterThanOrEqual(2);
    for (const c of done) {
      expect(c.ti + c.te).toBeCloseTo(5, 1);
      expect(c.vt).toBeGreaterThan(480);
    }
    expect(meanAirwayPressure(d, 20, 50)).toBeGreaterThan(6);
    expect(meanAirwayPressure(d, 20, 50)).toBeLessThan(9);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/resp/driver.test.ts`
Expected: FAIL — cannot find `src/l2/resp/driver.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l2/resp/driver.ts`:**

```ts
// Respiratory driver (brief §4.7; research 03 §7): ONE ground-truth breath scheduler whose cycles feed the
// capnogram, gas exchange, the impedance channel, the haemodynamic breath signal u(t) (coupling rule M6, the
// seam that replaces Stage 2's fixed 15/min clock) and the `breath` events. Sources: spontaneous (rr/vt from
// the L1 targets), BVM, ventilator, external (VentFrame, R27) or none. Airway states change what each cycle
// does: exchange gas, reach the CO2 sampler, move the chest. Plain JSON-safe data.
import { normal, type Sfc32State } from '../../rng/sfc32.ts';
import type { AirwayState, BreathKind, VentFrame, VentSource } from '../../types-resp.ts';

export const INSP_FLOW_LPS = 0.05; // externalDrive: inspiration starts at flow > +0.05 L/s (brief §7.6) [ENG]
export const DRIVE_TIMEOUT_S = 5; // no VentFrame for 5 s → the external drive is gone (apnoea) [ENG]
export const U_REF_CMH2O = 10; // alveolar swing of the Stage 2 reference breath (VT 500 at C 50) → u swing 1.0
export const SPONT_PPL_CMH2O = 4; // spontaneous pleural swing, 3–8 cmH2O negative [ENG]
export const SPONT_TI_FRACTION = 0.38; // spontaneous I:E ≈ 1:1.6 [ENG]
export const SPONT_JITTER = 0.05; // breath-to-breath SD of period and VT, spontaneous [ENG]
export const GASTRIC_BREATHS = 5; // oesophageal: breaths with gastric CO2 before the trace is flat [ENG, < 6]
export const EXP_TAU_S = 0.5; // passive expiration τ = R·C (10 cmH2O/L/s × 0.05 L/cmH2O)
/** JSON-safe 'never' (snapshots travel as JSON: Infinity would become null). */
export const NEVER = 1e12;

/** What the CO2 sampler sees during a cycle: alveolar gas, nothing, or gastric gas (oesophageal intubation). */
export type Sampled = 'alveolar' | 'none' | 'gastric';
/** Capnogram shape family (research 03 §4.3). */
export type Shape = 'mech' | 'spont' | 'shark' | 'bifid';

export interface Cycle {
  seq: number;
  t0: number;
  ti: number;
  te: number;
  vt: number; // mL reaching the lungs
  kind: BreathKind;
  mech: boolean; // positive pressure (true) or negative (spontaneous)
  exch: boolean; // gas exchange happens
  sampled: Sampled;
  gastric: number; // gastric CO2 peak (mmHg) when sampled === 'gastric'
  effort: number; // chest-wall movement for impedance, 0–1.5
  shape: Shape;
  severity: number;
  cleft: number; // curare cleft effort 0–1
  fio2: number;
  fico2: number;
  /** Airway loss mid-cycle: from this time the cycle neither exchanges nor reaches the sampler. */
  cutAt: number;
  emitted: boolean;
}

export interface ExtDrive {
  lastT: number;
  inInsp: boolean;
  frames: number[]; // flattened [t, paw, volumeMl] triples, last 6 s
  meanPaw: number;
  peep: number;
  fio2: number;
  prevTi: number;
  prevTe: number;
}

export interface DriverState {
  source: VentSource | 'external';
  airway: AirwayState;
  severity: number;
  vent: { rr: number; vt: number; peep: number; ie: number };
  fico2: number;
  cleft: number;
  preox: { fio2: number; until: number } | null;
  cycles: Cycle[];
  nextT: number;
  seq: number;
  gastricN: number;
  ext: ExtDrive | null;
  rng: Sfc32State;
}

export interface DriverCtx {
  rr: number; // L1 rr target (spontaneous)
  vt: number; // L1 vt target (spontaneous)
  fio2: number; // L1 fio2 (room air 0.21 by default)
  etco2: number; // current true EtCO2 (gastric washout height)
  complianceMl: number;
}

export function createDriver(rng: Sfc32State): DriverState {
  return {
    source: 'spontaneous', airway: 'patent', severity: 1,
    vent: { rr: 12, vt: 500, peep: 5, ie: 2 },
    fico2: 0, cleft: 0, preox: null, cycles: [], nextT: 0, seq: 0, gastricN: 0, ext: null, rng,
  };
}

const cycleEnd = (c: Cycle) => c.t0 + c.ti + c.te;

/** The cycle containing t (last one starting at or before t), or undefined. */
export function cycleAt(d: DriverState, t: number): Cycle | undefined {
  for (let i = d.cycles.length - 1; i >= 0; i--) {
    const c = d.cycles[i] as Cycle;
    if (c.t0 <= t) return t < cycleEnd(c) ? c : undefined;
  }
  return undefined;
}

/** The last cycle that started at or before t (running or finished). */
export function lastCycleBefore(d: DriverState, t: number): Cycle | undefined {
  for (let i = d.cycles.length - 1; i >= 0; i--) if ((d.cycles[i] as Cycle).t0 <= t) return d.cycles[i];
  return undefined;
}

export function preoxActive(d: DriverState, t: number): boolean {
  return d.preox !== null && t < d.preox.until;
}

/** FiO2 of the gas the next breath brings (brief §7.2 ventilation.fio2, preoxygenate; room air otherwise). */
function fio2For(d: DriverState, ctx: DriverCtx, t: number, mech: boolean): number {
  if (preoxActive(d, t)) return (d.preox as { fio2: number }).fio2;
  if (d.airway === 'disconnected') return 0.21;
  return mech || d.source === 'spontaneous' ? ctx.fio2 : 0.21;
}

/** Build the next cycle from the source and airway state, or null (no breath: apnoea / source none). */
function makeCycle(d: DriverState, ctx: DriverCtx, t: number): { c: Cycle | null; period: number } {
  const src = d.source;
  if (src === 'none' || src === 'external') return { c: null, period: 0.5 };
  const mech = src !== 'spontaneous';
  if (!mech && d.airway === 'apnoea') return { c: null, period: 0.5 };
  let rr: number;
  let vt: number;
  let ti: number;
  if (mech) {
    rr = src === 'bvm' ? Math.max(4, d.vent.rr) : d.vent.rr;
    vt = d.vent.vt;
    ti = 60 / rr / (1 + d.vent.ie);
  } else {
    if (ctx.rr < 1) return { c: null, period: 0.5 };
    rr = ctx.rr;
    vt = ctx.vt * Math.max(0.7, 1 + SPONT_JITTER * normal(d.rng));
    ti = 0;
  }
  let period = 60 / rr;
  if (!mech) {
    period *= Math.max(0.7, 1 + SPONT_JITTER * normal(d.rng));
    ti = SPONT_TI_FRACTION * period;
  }
  const sev = d.severity;
  const c: Cycle = {
    seq: d.seq, t0: t, ti, te: period - ti, vt, kind: src === 'bvm' ? 'bvm' : mech ? 'mech' : 'spont', mech,
    exch: true, sampled: 'alveolar', gastric: 0, effort: mech ? vt / 500 : vt / 500, shape: mech ? 'mech' : 'spont',
    severity: sev, cleft: mech ? d.cleft : 0, fio2: fio2For(d, ctx, t, mech), fico2: d.fico2, cutAt: NEVER, emitted: false,
  };
  switch (d.airway) {
    case 'obstructed': // efforts without flow (spontaneous) or a kinked tube (mechanical)
      c.exch = false;
      c.sampled = 'none';
      c.vt = 0;
      c.effort = mech ? 0 : 1;
      break;
    case 'disconnected': // spontaneous: room air through the open tube; mechanical: nothing reaches the patient
      c.sampled = 'none';
      if (mech) {
        c.exch = false;
        c.vt = 0;
        c.effort = 0;
      }
      break;
    case 'oesophageal': // gastric insufflation: < 6 breaths of decreasing CO2 (research 03 §4.3): 5 here
      c.exch = false;
      c.vt = 0;
      c.effort = 0.3;
      c.sampled = d.gastricN < GASTRIC_BREATHS ? 'gastric' : 'none';
      c.gastric = ctx.etco2 * 0.45 * 0.6 ** d.gastricN; // [ENG] washout heights
      d.gastricN++;
      break;
    case 'bronchospasm':
      c.shape = 'shark';
      c.vt = vt * (1 - 0.2 * sev); // [ENG] less volume behind the obstruction
      break;
    case 'endobronchial':
      c.shape = 'bifid';
      break;
    default:
      break;
  }
  d.seq++;
  return { c, period };
}

/** Plan cycles up to `until` (sim s). */
export function planCycles(d: DriverState, ctx: DriverCtx, until: number): void {
  while (d.nextT <= until) {
    const { c, period } = makeCycle(d, ctx, d.nextT);
    if (c) d.cycles.push(c);
    d.nextT += period;
  }
}

/** Drop cycles that end before `t` (keep enough history for the sidestream delay and u(t − 2·RR)). */
export function pruneCycles(d: DriverState, t: number): void {
  while (d.cycles.length > 1 && cycleEnd(d.cycles[0] as Cycle) < t) d.cycles.shift();
}

/**
 * A command changed the source or airway at time t: planned cycles after t are dropped, and when `cut` the running
 * cycle stops exchanging now (airway loss is immediate: brief §4.9 M4). Returns the seqs whose breath events
 * must be withdrawn.
 */
export function replan(d: DriverState, t: number, cut: boolean, restartNow: boolean): number[] {
  const dropped = d.cycles.filter((c) => c.t0 > t).map((c) => c.seq);
  d.cycles = d.cycles.filter((c) => c.t0 <= t);
  const cur = cycleAt(d, t);
  if (cur && cut) cur.cutAt = Math.min(cur.cutAt, t);
  if (restartNow || !cur) {
    if (cur) cur.te = Math.max(0, t - cur.t0 - cur.ti);
    if (cur && t < cur.t0 + cur.ti) {
      cur.ti = t - cur.t0;
      cur.te = 0;
    }
    d.nextT = t;
  } else d.nextT = cycleEnd(cur);
  return dropped;
}

// --- external drive (R27: VentFrame in) ------------------------------------------------------------------
export function onVentFrame(d: DriverState, f: VentFrame, t: number): void {
  let e = d.ext;
  if (d.source !== 'external' || !e) {
    replan(d, t, false, true);
    d.source = 'external';
    e = { lastT: t, inInsp: false, frames: [], meanPaw: f.pawCmH2O, peep: f.peepCmH2O, fio2: f.fio2, prevTi: 1, prevTe: 3 };
    d.ext = e;
  }
  e.lastT = t;
  e.peep = f.peepCmH2O;
  e.fio2 = f.fio2;
  e.frames.push(t, f.pawCmH2O, f.volumeMl);
  while (e.frames.length > 3 && (e.frames[0] as number) < t - 6) e.frames.splice(0, 3);
  // mean airway pressure over the last breath cycle (≤ 6 s of frames), so it does not ripple within a breath
  const win = Math.min(6, e.prevTi + e.prevTe);
  let sum = 0;
  let n = 0;
  for (let i = e.frames.length - 3; i >= 0 && (e.frames[i] as number) > t - win; i -= 3) {
    sum += e.frames[i + 1] as number;
    n++;
  }
  e.meanPaw = n > 0 ? sum / n : f.pawCmH2O;
  const cur = lastCycleBefore(d, t);
  const insp = f.phase ? f.phase === 'insp' : f.flowLps > INSP_FLOW_LPS;
  if (!e.inInsp && insp) {
    if (cur) {
      cur.te = Math.max(0.05, t - cur.t0 - cur.ti);
      e.prevTe = cur.te;
    }
    const exchange = d.airway !== 'disconnected' && d.airway !== 'obstructed' && d.airway !== 'oesophageal';
    d.cycles.push({
      seq: d.seq++, t0: t, ti: e.prevTi, te: e.prevTe, vt: 0, kind: 'mech', mech: true, exch: exchange,
      sampled: exchange ? 'alveolar' : 'none', gastric: 0, effort: 0, shape: d.airway === 'bronchospasm' ? 'shark' : d.airway === 'endobronchial' ? 'bifid' : 'mech',
      severity: d.severity, cleft: d.cleft, fio2: preoxActive(d, t) ? (d.preox as { fio2: number }).fio2 : f.fio2,
      fico2: d.fico2, cutAt: NEVER, emitted: false,
    });
    e.inInsp = true;
  } else if (e.inInsp && !insp && cur) {
    cur.ti = Math.max(0.05, t - cur.t0);
    e.prevTi = cur.ti;
    e.inInsp = false;
  }
  if (cur && t - cur.t0 < cur.ti + cur.te + 0.1) {
    cur.vt = Math.max(cur.vt, f.volumeMl);
    cur.effort = cur.vt / 500;
  }
  const now = lastCycleBefore(d, t);
  if (now && now.t0 === t) now.vt = Math.max(now.vt, f.volumeMl);
}

/** External drive watchdog: frames stopped → no more breaths (the vent sim was closed or disconnected). */
export function checkDrive(d: DriverState, t: number): void {
  if (d.source === 'external' && d.ext && t - d.ext.lastT > DRIVE_TIMEOUT_S) {
    d.source = 'none';
    d.ext = null;
    d.nextT = t;
  }
}

function frameAt(e: ExtDrive, t: number, k: 1 | 2): number {
  const f = e.frames;
  if (f.length < 3) return 0;
  if (t >= (f[f.length - 3] as number)) return f[f.length - 3 + k] as number;
  for (let i = f.length - 6; i >= 0; i -= 3) {
    const ta = f[i] as number;
    if (ta <= t) {
      const tb = f[i + 3] as number;
      const w = (t - ta) / Math.max(1e-6, tb - ta);
      return (f[i + k] as number) * (1 - w) + (f[i + 3 + k] as number) * w;
    }
  }
  return f[k] as number;
}

/** Lung volume above FRC (mL) at time t within cycle c (constant-flow inspiration, passive expiration). */
export function cycleVolume(c: Cycle, t: number): number {
  const u = t - c.t0;
  if (u < 0) return 0;
  const vt = c.vt > 0 ? c.vt : 500 * c.effort; // obstructed efforts still move the chest
  if (u < c.ti) return c.mech ? (vt * u) / Math.max(1e-3, c.ti) : (vt * (1 - Math.cos((Math.PI * u) / c.ti))) / 2;
  const w = u - c.ti;
  if (c.mech) return vt * Math.exp(-w / EXP_TAU_S);
  const act = 0.6 * c.te;
  return w < act ? (vt * (1 + Math.cos((Math.PI * w) / act))) / 2 : 0;
}

/** Mean over one cycle of cycleVolume (analytic), to centre u(t) on 0.5. */
function meanVolume(c: Cycle): number {
  const vt = c.vt > 0 ? c.vt : 500 * c.effort;
  const T = Math.max(1e-3, c.ti + c.te);
  if (c.mech) return (vt * (c.ti / 2 + EXP_TAU_S * (1 - Math.exp(-c.te / EXP_TAU_S)))) / T;
  return (vt * (c.ti / 2 + 0.3 * c.te)) / T;
}

/** Chest volume (mL above FRC) for the impedance channel: every cycle that moves the chest. */
export function chestVolume(d: DriverState, t: number): number {
  if (d.source === 'external' && d.ext) return Math.max(0, frameAt(d.ext, t, 2));
  const c = cycleAt(d, t);
  return c && c.effort > 0 ? cycleVolume(c, t) : 0;
}

/**
 * The haemodynamic breath signal for Stage 2's respFactor/cvpAt (seam): u(t) = 0.5 + swing, zero-mean over a
 * cycle, swing 1.0 peak-to-peak for the reference positive-pressure breath (VT 500 mL at C 50 → 10 cmH2O), the
 * same scale as Stage 2's breathU. Spontaneous breaths swing NEGATIVE (pleural pressure falls on inspiration).
 * Apnoea → 0.5 (no respiratory variation).
 */
export function breathSignal(d: DriverState, t: number, complianceMl: number): number {
  if (d.source === 'external' && d.ext) return 0.5 + (frameAt(d.ext, t, 1) - d.ext.meanPaw) / U_REF_CMH2O;
  const c = cycleAt(d, t);
  if (!c || !(c.vt > 0) || t >= c.cutAt) return 0.5;
  const dv = cycleVolume(c, t) - meanVolume(c);
  if (c.mech) return 0.5 + dv / complianceMl / U_REF_CMH2O;
  return 0.5 - (dv / Math.max(1, c.vt)) * (SPONT_PPL_CMH2O / U_REF_CMH2O);
}

/** Mean airway pressure (cmH2O) now: PEEP + mean alveolar swing (internal), or the drive's running mean. */
export function meanAirwayPressure(d: DriverState, t: number, complianceMl: number): number {
  if (d.source === 'external' && d.ext) return d.ext.meanPaw;
  if (d.source !== 'ventilator' && d.source !== 'bvm') return 0;
  const c = lastCycleBefore(d, t);
  const peep = d.source === 'ventilator' ? d.vent.peep : 0;
  return c && c.exch ? peep + meanVolume(c) / complianceMl : peep;
}

/** Alveolar ventilation (L/min) delivered at time t: the exchanging cycle's (VT − VD)/period, else 0. */
export function alveolarVentilation(d: DriverState, t: number, deadSpaceMl: number): number {
  const c = cycleAt(d, t);
  if (!c || !c.exch || t >= c.cutAt) return 0;
  const T = c.ti + c.te;
  return T > 0 ? (Math.max(0, c.vt - deadSpaceMl) * 60) / T / 1000 : 0;
}

/** Nominal breaths/min and VT of the current settings (MANUAL calibration and the `state` event). */
export function nominalRate(d: DriverState, ctx: DriverCtx): { rr: number; vt: number } {
  if (d.source === 'ventilator' || d.source === 'bvm') return { rr: d.vent.rr, vt: d.vent.vt };
  if (d.source === 'external') {
    const c = lastCycleBefore(d, Infinity);
    return c ? { rr: 60 / Math.max(0.5, c.ti + c.te), vt: c.vt } : { rr: 0, vt: 0 };
  }
  return { rr: ctx.rr, vt: ctx.vt };
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/resp/driver.ts packages/engine-core/test/l2/resp/driver.test.ts
git commit -m "feat(resp): respiratory driver — sources, airway states, external VentFrame drive, u(t), VA, mean Paw" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Capnogram and sampler

**Files:**
- Create: `packages/engine-core/src/l2/co2/capno.ts`, `packages/engine-core/test/l2/co2/capno.test.ts`

**Interfaces:**
- Consumes: Task 8 `cycleAt`, `lastCycleBefore`, `Cycle`, `DriverState`.
- Produces: `CO2_RATE` 62.5, `SHAPES`, `SAMPLING`, `interface CapnoCtx { etco2, beats, cpr: { active, rate, quality, anchor } }`, `airwayCo2(d, t, x)`, `interface SamplerState { mode, neonatal, y }`, `createSampler(mode?, neonatal?)`, `sampleCo2(s, t, airway)`.

- [ ] **Step 1: Write the failing test** (BUILD-PLAN acceptance 2: delay and rise time)

**Create `packages/engine-core/test/l2/co2/capno.test.ts`:**

```ts
// Capnograph sampling model (brief §4.4 "Sampling (L3)"; research 03 §4.2): step response of the sampler.
import { describe, expect, it } from 'vitest';
import { createSampler, sampleCo2 } from '../../../src/l2/co2/capno.ts';

/** 10–90 % rise time and 10 % onset delay of the displayed signal for a 0 → 40 mmHg airway step at t = 1 s. */
function step(mode: 'sidestream' | 'mainstream', neonatal = false): { rise: number; delay: number } {
  const s = createSampler(mode, neonatal);
  const air = (t: number) => (t >= 1 ? 40 : 0);
  let t10 = 0;
  let t90 = 0;
  for (let m = 0; m < 62.5 * 6; m++) {
    const t = m / 62.5;
    const y = sampleCo2(s, t, air);
    if (!t10 && y >= 4) t10 = t;
    if (!t90 && y >= 36) t90 = t;
  }
  return { rise: t90 - t10, delay: t10 - 1 };
}

describe('capnograph sampler', () => {
  it('sidestream adult: transport delay 2.3 s, 10–90 % rise 240 ± 30 ms (Philips M3015A)', () => {
    const r = step('sidestream');
    expect(r.delay).toBeGreaterThanOrEqual(2.3);
    expect(r.delay).toBeLessThanOrEqual(2.35);
    expect(r.rise).toBeGreaterThanOrEqual(0.21);
    expect(r.rise).toBeLessThanOrEqual(0.27);
  });
  it('sidestream neonatal: rise 190 ± 30 ms; mainstream: no delay, rise < 60 ms + one sample', () => {
    const n = step('sidestream', true);
    expect(n.rise).toBeGreaterThanOrEqual(0.16);
    expect(n.rise).toBeLessThanOrEqual(0.22);
    const m = step('mainstream');
    expect(m.delay).toBeLessThanOrEqual(0.02);
    expect(m.rise).toBeLessThanOrEqual(0.06 + 0.016);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/co2/capno.test.ts`
Expected: FAIL — cannot find `src/l2/co2/capno.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l2/co2/capno.ts`:**

```ts
// Capnogram (brief §4.4; research 03 §4.1–4.3): the airway CO2 of each driver cycle built from phases —
// inspiration (phase 0, downstroke τ0 to the inspired baseline), phase I (dead-space gas), phase II
// (exponential upswing τ_II) and phase III (plateau with slope, ending exactly at the breath's true EtCO2) —
// plus the pattern library (shark fin, curare cleft, rebreathing, cardiogenic oscillations, oesophageal
// washout, disconnection, apnoea, CPR oscillations, bifid plateau). The sampler (sidestream/mainstream) is a
// transport delay plus a first-order rise (brief §4.4 "Sampling").
import { cycleAt, lastCycleBefore, type Cycle, type DriverState } from '../resp/driver.ts';

export const CO2_RATE = 62.5; // brief §3.2
export const CO2_SUBSTEPS = 4; // sampler LPF integrated at 250 Hz
export const PHASE_I_S = { mech: 0.1, spont: 0.15 } as const; // dead-space washout at the start of expiration [ENG]
/** Shape constants per family (brief §4.4: τ_II 0.05–0.10 s normal, 0.2–0.5 obstructive; phase III +1–3 mmHg). τ_II 0.09: α 105° sidestream, 100° mainstream (prototype). */
export const SHAPES = {
  mech: { tauII: 0.09, tau0: 0.03, riseIII: 2 },
  spont: { tauII: 0.12, tau0: 0.12, riseIII: 1 }, // rounded (research 03 §4.3)
  shark: { tauII: 0.15, tau0: 0.03, riseIII: 2 }, // + 0.35 s τ_II and + 10 mmHg phase III per unit severity
  bifid: { tauII: 0.09, tau0: 0.03, riseIII: 2 }, // endobronchial: second, slow half (τ 0.6 s) [ENG]
} as const;
export const APNOEA_DECAY_S = 1.0; // after the last expiration the sampled gas returns to baseline [ENG]
export const CUT_DECAY_S = 0.25; // disconnection: abrupt drop to 0 (research 03 §4.3)
export const CARDIO_MMHG = 1.5; // cardiogenic oscillation 1–3 mmHg at HR (research 03 §4.3)
export const CPR_OSC_MMHG = 3; // compression oscillations × quality [ENG]
/** Sampling (brief §4.4; research 03 §4.2, Philips M3015A / M3014A). */
export const SAMPLING = {
  sidestream: { delayS: 2.3, riseS: 0.24, riseNeoS: 0.19 },
  mainstream: { delayS: 0, riseS: 0.055, riseNeoS: 0.055 },
} as const;

export interface CapnoCtx {
  etco2: number; // current true EtCO2 (mmHg) from the gas model
  beats: readonly number[]; // recent mechanical beat times (s)
  cpr: { active: boolean; rate: number; quality: number; anchor: number };
}

function shapeOf(c: Cycle) {
  const s = SHAPES[c.shape];
  if (c.shape !== 'shark') return s;
  return { tauII: s.tauII + 0.35 * c.severity, tau0: s.tau0, riseIII: s.riseIII + 10 * c.severity };
}

/** Plateau-end level of a cycle (what its expiration ends at). */
function level(c: Cycle, x: CapnoCtx): number {
  if (c.sampled === 'gastric') return c.gastric;
  return c.sampled === 'alveolar' ? x.etco2 : 0;
}

/** Airway CO2 at the end of cycle c (for the next inspiration's downstroke and for apnoea decay). */
function endValue(c: Cycle, x: CapnoCtx): number {
  const end = c.t0 + c.ti + c.te;
  return end > c.cutAt ? 0 : c.te > 0 ? Math.max(c.fico2, level(c, x)) : c.fico2;
}

/** Airway CO2 (mmHg) at time t — the true signal before the sampler. */
export function airwayCo2(d: DriverState, t: number, x: CapnoCtx): number {
  const c = cycleAt(d, t);
  if (!c) {
    const last = lastCycleBefore(d, t);
    if (!last) return 0;
    const end = last.t0 + last.ti + last.te;
    const base = last.fico2;
    return base + (endValue(last, x) - base) * Math.exp(-(t - end) / APNOEA_DECAY_S);
  }
  if (t >= c.cutAt) {
    const v0 = cycleCo2(d, c, c.cutAt, x);
    return v0 * Math.exp(-(t - c.cutAt) / CUT_DECAY_S);
  }
  return cycleCo2(d, c, t, x);
}

function cycleCo2(d: DriverState, c: Cycle, t: number, x: CapnoCtx): number {
  const sh = shapeOf(c);
  const base = c.fico2;
  const u = t - c.t0;
  if (u < c.ti) {
    const i = d.cycles.indexOf(c);
    const prev = i > 0 ? (d.cycles[i - 1] as Cycle) : undefined;
    const contiguous = prev && prev.t0 + prev.ti + prev.te >= c.t0 - 0.02;
    const from = prev ? (contiguous ? endValue(prev, x) : base + (endValue(prev, x) - base) * Math.exp(-(c.t0 - (prev.t0 + prev.ti + prev.te)) / APNOEA_DECAY_S)) : base;
    const tau0 = sh.tau0 * (base > 0 ? 3 : 1); // rebreathing: slanted phase 0, β ↑ (research 03 §4.3)
    return base + (from - base) * Math.exp(-u / tau0);
  }
  const L = level(c, x);
  if (c.sampled === 'none' || L <= base) return base;
  const tI = c.mech ? PHASE_I_S.mech : PHASE_I_S.spont;
  const w = u - c.ti - tI;
  if (w < 0) return base;
  const te = Math.max(0.05, c.te - tI);
  const slope = sh.riseIII / te;
  const rise = (s: number) => (c.shape === 'bifid' ? 0.5 * (1 - Math.exp(-s / sh.tauII)) + 0.5 * (1 - Math.exp(-s / 0.6)) : 1 - Math.exp(-s / sh.tauII));
  const amp = (L - base - sh.riseIII) / Math.max(1e-3, rise(te));
  let v = base + amp * rise(w) + slope * w;
  if (c.cleft > 0) v -= (3 + 12 * c.cleft) * Math.exp(-(((w - 0.55 * te) / 0.12) ** 2)); // curare cleft 3–15 mmHg
  if (te > 2 && w > 0.5 * te) {
    // cardiogenic oscillations on the late plateau at low RR (research 03 §4.3)
    for (const tb of x.beats) {
      const z = (t - tb - 0.25) / 0.07;
      if (z > -4 && z < 4) v += CARDIO_MMHG * (Math.exp(-z * z) - 0.35);
    }
  }
  if (x.cpr.active) {
    const ph = ((((t - x.cpr.anchor) * x.cpr.rate) / 60) % 1 + 1) % 1;
    v += CPR_OSC_MMHG * x.cpr.quality * Math.exp(-(((ph - 0.3) / 0.15) ** 2));
  }
  return Math.max(0, v);
}

export interface SamplerState {
  mode: 'sidestream' | 'mainstream';
  neonatal: boolean;
  y: number; // LPF output
}

export function createSampler(mode: 'sidestream' | 'mainstream' = 'sidestream', neonatal = false): SamplerState {
  return { mode, neonatal, y: 0 };
}

/** Displayed CO2 at 62.5 Hz sample time t: LPF1{airway(t − delay)}, τ = rise(10–90 %)/2.2 (brief §4.4). */
export function sampleCo2(s: SamplerState, t: number, airway: (t: number) => number): number {
  const p = SAMPLING[s.mode];
  const tau = (s.neonatal ? p.riseNeoS : p.riseS) / 2.2;
  const h = 1 / (CO2_RATE * CO2_SUBSTEPS);
  const a = 1 - Math.exp(-h / tau);
  for (let j = CO2_SUBSTEPS - 1; j >= 0; j--) s.y += (airway(t - j * h - p.delayS) - s.y) * a;
  return s.y;
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 2 tests pass. The shapes (α, patterns) are pinned at engine level in Task 17.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/co2/capno.ts packages/engine-core/test/l2/co2/capno.test.ts
git commit -m "feat(co2): phase-built capnogram with the pattern library and a sidestream/mainstream sampler" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: SpO2 device chain and tone pitch

**Files:**
- Create: `packages/engine-core/src/l3/spo2/spo2.ts`, `packages/engine-core/test/l3/spo2/spo2.test.ts`

**Interfaces:**
- Produces: `SPO2_LAG_TAU_S` 3, `SPO2_PROFILE { averagingS: 8, updateS: 1 }`, `PULSE_HOLD_S` 4, `PULSE_LOST_S` 10, `LOW_PERF_PI` 0.3, `interface Spo2Inputs { siteSa, probe, lastFootT, pi, cuffOnLimb, cpr }`, `interface Spo2State { lag, ring, shown, flag, nextUpdate, validSince, bias }`, `createSpo2(sa0, bias)`, `deviceBias(sat, bias)`, `stepSpo2(st, x, t)`, `spo2Measured(st, t): Measured`, `spo2PitchHz(spo2, semitonePerPct?)`.

- [ ] **Step 1: Write the failing test** (BUILD-PLAN acceptance 6c and 9)

**Create `packages/engine-core/test/l3/spo2/spo2.test.ts`:**

```ts
// SpO2 device chain and tone pitch (brief §4.3, research 03 §3.6; BUILD-PLAN Stage 3 acceptance 9).
import { describe, expect, it } from 'vitest';
import { createSpo2, spo2Measured, spo2PitchHz, stepSpo2 } from '../../../src/l3/spo2/spo2.ts';

const ok = { probe: 'on' as const, pi: 2, cuffOnLimb: false, cpr: false };

describe('SpO2 device chain', () => {
  it('pitch: 880·2^(−(100 − SpO2)·0.1/12): 90 % → 830.6 Hz ± 1, 100 % → 880, none → 880', () => {
    expect(Math.abs(spo2PitchHz(90) - 830.6)).toBeLessThanOrEqual(1);
    expect(spo2PitchHz(100)).toBe(880);
    expect(spo2PitchHz(null)).toBe(880);
  });

  it('a site step from 97 to 85 %: lag + 8 s average reach 90 % of the change in ≤ 20 s (brief §6.1 response)', () => {
    const st = createSpo2(0.97, 0);
    let t90 = 0;
    const shown: number[] = [];
    for (let k = 1; k <= 400; k++) {
      const t = k / 10;
      stepSpo2(st, { ...ok, siteSa: 0.85, lastFootT: t }, t);
      if (k % 10 === 0) shown.push(st.shown as number);
      if (!t90 && (st.shown as number) <= 97 - 0.9 * 12) t90 = t;
    }
    expect(t90).toBeGreaterThan(5);
    expect(t90).toBeLessThanOrEqual(20);
    expect(shown[shown.length - 1]).toBe(85); // settled; with bias 0 and ≥ 80 % there is no under-reading
  });

  it('no pulse: held (questionable) after 4 s, invalid after 10 s; probe off: invalid at once; same-limb cuff holds', () => {
    const st = createSpo2(0.97, 0);
    for (let k = 1; k <= 200; k++) stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: k / 10 }, k / 10);
    for (let k = 201; k <= 260; k++) stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: 20 }, k / 10);
    expect(spo2Measured(st, 26).flag).toBe('questionable');
    for (let k = 261; k <= 320; k++) stepSpo2(st, { ...ok, siteSa: 0.97, lastFootT: 20 }, k / 10);
    expect(spo2Measured(st, 32).value).toBeNull();
    const c = createSpo2(0.97, 0);
    for (let k = 1; k <= 400; k++) stepSpo2(c, { ...ok, siteSa: 0.97, lastFootT: 1, cuffOnLimb: true }, k / 10);
    expect(spo2Measured(c, 40)).toMatchObject({ value: 97, flag: 'valid' });
    stepSpo2(c, { ...ok, probe: 'off', siteSa: 0.97, lastFootT: 40 }, 41);
    expect(spo2Measured(c, 41).value).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/spo2/spo2.test.ts`
Expected: FAIL — cannot find `src/l3/spo2/spo2.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l3/spo2/spo2.ts`:**

```ts
// SpO2 device chain (brief §4.3 "Device chain (L3)", §6.1; research 03 §3.6–3.7): site SaO2 (after the
// circulatory dead time, l2/gas/delay.ts) → first-order sensor lag τ 3 s → device bias → moving average →
// display update → validity from the pleth (pulse search, low perfusion, probe off, motion, CPR, same-limb
// cuff). Stepped at 10 Hz with the gas model. Plain data.
import type { Measured } from '../../types.ts';

export const SPO2_LAG_TAU_S = 3; // brief §4.3 step 3 [ENG]
/** Masimo-SET-like default of the first skin (saadat-like, R13/R14): average 8 s, update 1 s (brief §4.3, §6.1). */
export const SPO2_PROFILE = { averagingS: 8, updateS: 1 } as const;
export const SPO2_STEP_S = 0.1;
export const PULSE_HOLD_S = 4; // no pleth foot for 4 s → value held, questionable [ENG]
export const PULSE_LOST_S = 10; // … for 10 s → invalid, "no pulse" (brief §4.3 Arrest: 10–30 s)
export const LOW_PERF_PI = 0.3; // "LOW PERF" below PI 0.3 % (brief §4.3)
export const LOW_PERF_SLOWDOWN = 2; // low perfusion doubles the averaging window [ENG]

export interface Spo2Inputs {
  siteSa: number; // SaO2 at the probe site (0–1)
  probe: 'on' | 'off' | 'motion';
  lastFootT: number; // last detected pleth foot (s), −Infinity if none
  pi: number | null; // measured PI (%), null when invalid
  cuffOnLimb: boolean; // same-limb NIBP cuff inflated: hold the value (brief §4.3 artefacts)
  cpr: boolean;
}

export interface Spo2State {
  lag: number; // %
  ring: number[]; // lagged + biased values at 10 Hz, newest last (≤ 16 s × 2 × 10)
  shown: number | null; // displayed value (integer %)
  flag: Measured['flag'];
  nextUpdate: number;
  validSince: number; // time the pulse returned after an invalid spell (averaging must refill); 1e12 = invalid now
  bias: number; // per-patient device offset (%)
}

export function createSpo2(sa0: number, bias: number): Spo2State {
  return { lag: sa0 * 100, ring: [], shown: Math.round(sa0 * 100 + bias), flag: 'valid', nextUpdate: 0, validSince: -1e12, bias };
}

/** Device bias: the per-patient offset above 80 %, plus under-reading that grows below 80 % (research 03 §3.6). */
export function deviceBias(sat: number, bias: number): number {
  return bias - (sat < 80 ? 0.1 * (80 - sat) : 0);
}

export function stepSpo2(st: Spo2State, x: Spo2Inputs, t: number): void {
  st.lag += (x.siteSa * 100 - st.lag) * (1 - Math.exp(-SPO2_STEP_S / SPO2_LAG_TAU_S));
  const v = Math.min(100, Math.max(0, st.lag + deviceBias(st.lag, st.bias)));
  const lowPerf = x.pi !== null && x.pi < LOW_PERF_PI;
  const win = Math.round((SPO2_PROFILE.averagingS * (lowPerf ? LOW_PERF_SLOWDOWN : 1)) / SPO2_STEP_S);
  st.ring.push(v);
  while (st.ring.length > win) st.ring.shift();
  if (t + 1e-9 < st.nextUpdate) return;
  st.nextUpdate = t + SPO2_PROFILE.updateS;
  const noPulse = t - x.lastFootT;
  if (x.probe === 'off') {
    st.shown = null;
    st.flag = 'invalid';
    st.validSince = 1e12;
    return;
  }
  if (x.cuffOnLimb && st.shown !== null) return; // hold the last value while the cuff occludes the limb
  if (noPulse > PULSE_LOST_S) {
    st.shown = null;
    st.flag = 'invalid';
    st.validSince = 1e12;
    return;
  }
  if (noPulse > PULSE_HOLD_S) {
    st.flag = st.shown === null ? 'invalid' : 'questionable';
    return;
  }
  if (st.validSince === 1e12) st.validSince = t;
  if (t - st.validSince < SPO2_PROFILE.averagingS) return; // the average refills after a pulse returns (ROSC)
  st.shown = Math.round(st.ring.reduce((a, b) => a + b, 0) / st.ring.length);
  st.flag = x.probe === 'motion' || x.cpr || lowPerf ? 'questionable' : 'valid';
}

export function spo2Measured(st: Spo2State, t: number): Measured {
  return { value: st.shown, flag: st.shown === null ? 'invalid' : st.flag, at: t };
}

/**
 * QRS/pulse tone pitch from the displayed SpO2 (research 03 §3.6 item 6): f = 880·2^(−(100 − SpO2)·s/12) with
 * s = 0.1 semitone per % ("standard", ≈ 5 Hz/% near 880 Hz). 90 % → 830.6 Hz (BUILD-PLAN Stage 3 test 9).
 */
export function spo2PitchHz(spo2: number | null, semitonePerPct = 0.1): number {
  return spo2 === null ? 880 : 880 * 2 ** ((-(100 - spo2) * semitonePerPct) / 12);
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/spo2/spo2.ts packages/engine-core/test/l3/spo2/spo2.test.ts
git commit -m "feat(l3): SpO2 device chain (lag, bias, averaging, update, pulse search, low perfusion, cuff hold) and pitch(SpO2)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: CO2 numerics (EtCO2, FiCO2, awRR, gas apnoea)

**Files:**
- Create: `packages/engine-core/src/l3/co2-numerics/co2-numerics.ts`, `packages/engine-core/test/l3/co2-numerics/co2-numerics.test.ts`

**Interfaces:**
- Produces: `GAS_APNOEA_S` 20, `interface Co2Num`, `createCo2Num()`, `co2NumStep(st, t, x, dt): 'breath' | 'apnoea' | 'resumed' | null`, `co2Numerics(st, t, shownNow): { etco2, imco2, awrr }`.

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l3/co2-numerics/co2-numerics.test.ts`:**

```ts
// CO2 numerics (brief §4.4 "Numerics (L3)"): breath detection, EtCO2 max of 10 s, FiCO2, awRR, apnoea at 20 s.
import { describe, expect, it } from 'vitest';
import { co2Numerics, co2NumStep, createCo2Num } from '../../../src/l3/co2-numerics/co2-numerics.ts';

describe('CO2 numerics', () => {
  it('square breaths at 12/min, 38 mmHg over 2 mmHg baseline: EtCO2 38, FiCO2 2, awRR 12; apnoea 20 s after the last breath', () => {
    const st = createCo2Num();
    let apnoeaAt = -1;
    for (let m = 0; m < 62.5 * 80; m++) {
      const t = m / 62.5;
      const x = t < 50 && t % 5 > 2 ? 38 : 2;
      if (co2NumStep(st, t, x, 1 / 62.5) === 'apnoea') apnoeaAt = t;
      if (Math.abs(t - 45) < 1e-9) {
        const n = co2Numerics(st, t, x);
        expect(n.etco2.value).toBe(38);
        expect(n.imco2.value).toBe(2);
        expect(n.awrr.value).toBe(12);
      }
    }
    expect(apnoeaAt - 47).toBeGreaterThanOrEqual(20);
    expect(apnoeaAt - 47).toBeLessThanOrEqual(20.1);
    expect(co2Numerics(st, 80, 2).awrr.value).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/co2-numerics`
Expected: FAIL — cannot find the module.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l3/co2-numerics/co2-numerics.ts`:**

```ts
// CO2 numerics (brief §4.4 "Numerics (L3)"; research 03 §4.5) measured from the DISPLAYED capnogram: breath
// detection on a rising edge above 50 % of the recent peak with hysteresis, EtCO2 = maximum breath peak of the
// last 10 s, FiCO2 (imCO2) = inspiratory minimum, awRR = mean of the last 6 intervals, gas-apnoea timer.
import type { Measured } from '../../types.ts';

export const DETECT_FRACTION = 0.5; // 50 % of the recent peak (brief §4.4)
export const RELEASE_FRACTION = 0.3; // hysteresis [ENG]
export const DETECT_FLOOR_MMHG = 4; // [ENG]
export const ETCO2_WINDOW_S = 10; // brief §4.4 [ENG]
export const AWRR_INTERVALS = 6; // brief §4.4 [ENG 4–8]
export const GAS_APNOEA_S = 20; // Philips default; saadat gas apnoea 20 s (brief §4.4)

export interface Co2Num {
  high: boolean;
  peak: number; // running peak of the current high segment
  low: number; // running minimum of the current low segment
  recentPeak: number; // decaying reference for the threshold
  edges: number[]; // rising-edge times, last 7
  breaths: Array<{ t: number; et: number; fi: number }>;
  apnoea: boolean;
}

export function createCo2Num(): Co2Num {
  return { high: false, peak: 0, low: 1e9, recentPeak: 30, edges: [], breaths: [], apnoea: false };
}

/** Feed one displayed sample. Returns 'breath' on a detected breath, 'apnoea'/'resumed' on apnoea changes. */
export function co2NumStep(st: Co2Num, t: number, x: number, dt: number): 'breath' | 'apnoea' | 'resumed' | null {
  st.recentPeak = Math.max(x, st.recentPeak * Math.exp(-dt / 20)); // forgets over ~20 s
  const up = Math.max(DETECT_FLOOR_MMHG, DETECT_FRACTION * st.recentPeak);
  const down = Math.max(DETECT_FLOOR_MMHG * 0.6, RELEASE_FRACTION * st.recentPeak);
  let ev: 'breath' | 'apnoea' | 'resumed' | null = null;
  if (!st.high) {
    st.low = Math.min(st.low, x);
    if (x > up) {
      st.high = true;
      st.peak = x;
      st.edges.push(t);
      if (st.edges.length > AWRR_INTERVALS + 1) st.edges.shift();
      if (st.apnoea) {
        st.apnoea = false;
        ev = 'resumed';
      }
    }
  } else {
    st.peak = Math.max(st.peak, x);
    if (x < down) {
      st.high = false;
      st.breaths.push({ t, et: st.peak, fi: st.low < 1e9 ? st.low : 0 });
      while (st.breaths.length > 0 && (st.breaths[0] as { t: number }).t < t - 30) st.breaths.shift();
      st.low = x;
      ev = 'breath';
    }
  }
  const last = st.edges[st.edges.length - 1] ?? 0; // the timer starts at power-on
  if (!st.apnoea && t - last > GAS_APNOEA_S && !st.high) {
    st.apnoea = true;
    return 'apnoea';
  }
  return ev;
}

export function co2Numerics(st: Co2Num, t: number, shownNow: number): { etco2: Measured; imco2: Measured; awrr: Measured } {
  const recent = st.breaths.filter((b) => b.t >= t - ETCO2_WINDOW_S);
  const et = recent.length > 0 ? Math.max(...recent.map((b) => b.et)) : Math.max(0, shownNow);
  const fi = recent.length > 0 ? Math.min(...recent.map((b) => b.fi)) : Math.max(0, shownNow);
  const e = st.edges;
  let rr: number | null = null;
  if (st.apnoea) rr = 0;
  else if (e.length >= 3) rr = (60 * (e.length - 1)) / ((e[e.length - 1] as number) - (e[0] as number));
  return {
    etco2: { value: Math.round(et), flag: 'valid', at: t },
    imco2: { value: Math.round(fi), flag: 'valid', at: t },
    awrr: rr === null ? { value: null, flag: 'invalid', at: t } : { value: Math.round(rr), flag: 'valid', at: t },
  };
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/co2-numerics packages/engine-core/test/l3/co2-numerics
git commit -m "feat(l3): capnogram breath detection, EtCO2/FiCO2/awRR and the gas apnoea timer" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Impedance respiration, RR and pleth-derived RR

**Files:**
- Create: `packages/engine-core/src/l3/resp/impedance.ts`, `packages/engine-core/test/l3/resp/impedance.test.ts`

**Interfaces:**
- Produces: `RIPPLE_FRACTION` 0.1, `IMP_APNOEA_S` 20, `interface ImpNum`, `createImpNum()`, `impedanceSample(volMl, t, beats, ripple?)`, `impStep(st, t, x, dt): 'apnoea' | 'resumed' | null`, `impRr(st, t): Measured`, `plethRr(beats: {t, amp}[], t, windowS?): number | null`.

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l3/resp/impedance.test.ts`:**

```ts
// Impedance RR and its cardiogenic-ripple failure mode (brief §4.7; research 03 §7), pleth-derived RR.
import { describe, expect, it } from 'vitest';
import { createImpNum, impedanceSample, impRr, impStep, plethRr } from '../../../src/l3/resp/impedance.ts';

describe('impedance respiration', () => {
  it('counts 15 breaths/min from chest volume, and raises apnoea 20 s after breathing stops', () => {
    const st = createImpNum();
    let apnoea = -1;
    for (let m = 0; m < 62.5 * 90; m++) {
      const t = m / 62.5;
      const vol = t < 50 ? 250 * (1 - Math.cos((2 * Math.PI * t) / 4)) : 0;
      if (impStep(st, t, impedanceSample(vol, t, []), 1 / 62.5) === 'apnoea') apnoea = t;
      if (Math.abs(t - 45) < 1e-9) expect(impRr(st, t).value).toBe(15);
    }
    expect(apnoea).toBeGreaterThan(65);
    expect(apnoea).toBeLessThan(72);
  });
  it('a 20 % cardiogenic ripple at HR 80 is counted once breaths vanish (the apnoea alarm is postponed); 10 % is not', () => {
    const st = createImpNum();
    const beats: number[] = [];
    let apnoea = false;
    for (let m = 0; m < 62.5 * 120; m++) {
      const t = m / 62.5;
      if (beats.length === 0 || t - beats[beats.length - 1]! >= 0.75) beats.push(t);
      const vol = t < 30 ? 250 * (1 - Math.cos((2 * Math.PI * t) / 4)) : 0;
      if (impStep(st, t, impedanceSample(vol, t, beats.slice(-3), 0.2), 1 / 62.5) === 'apnoea') apnoea = true;
    }
    expect(apnoea).toBe(false);
    expect(impRr(st, 120).value).toBeGreaterThan(60);
    const q = createImpNum();
    let alarm = -1;
    for (let m = 0; m < 62.5 * 60; m++) {
      const t = m / 62.5;
      const vol = t < 10 ? 250 * (1 - Math.cos((2 * Math.PI * t) / 4)) : 0;
      if (impStep(q, t, impedanceSample(vol, t, beats.filter((b) => b <= t).slice(-3)), 1 / 62.5) === 'apnoea') alarm = t;
    }
    expect(alarm).toBeGreaterThan(25);
    expect(alarm).toBeLessThan(32);
  });
  it('pleth-derived RR from the pulse-amplitude modulation', () => {
    const beats = Array.from({ length: 80 }, (_, i) => ({ t: i * 0.75, amp: 1 + 0.1 * Math.sin((2 * Math.PI * i * 0.75) / 5) }));
    expect(plethRr(beats, 60)).toBeCloseTo(12, 0);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/resp`
Expected: FAIL — cannot find the module.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l3/resp/impedance.ts`:**

```ts
// Impedance respiration (brief §4.7; research 03 §7): the `resp` channel is chest volume (relative to a 500 mL
// breath) plus a cardiogenic ripple at the heart rate (5–20 % of a normal breath, band 0.3–2.5 Hz) — and its own
// detector: an adaptive threshold on a high-passed signal, so ripple can be counted when breaths are shallow
// (apnoea postponed, as on a real monitor). Also the pleth-derived RR estimator (brief §6.2 fallback source).
import type { Measured } from '../../types.ts';

export const RIPPLE_FRACTION = 0.1; // cardiogenic ripple = 10 % of a 500 mL breath (5–20 %) [ENG]
export const IMP_HP_TAU_S = 4; // high-pass removing drift [ENG]
export const IMP_THRESHOLD = 0.35; // fraction of the recent breath amplitude [ENG]
export const IMP_FLOOR = 0.08; // absolute floor (ripple 0.1 exceeds it once breaths vanish) [ENG]
export const IMP_APNOEA_S = 20; // impedance apnoea 20 s (Philips; saadat 10 s) (brief §4.4)
export const IMP_INTERVALS = 6;

export interface ImpNum {
  mean: number; // high-pass state
  amp: number; // recent breath amplitude (decaying)
  high: boolean;
  peak: number;
  edges: number[];
  apnoea: boolean;
}

export function createImpNum(): ImpNum {
  return { mean: 0, amp: 1, high: false, peak: 0, edges: [], apnoea: false };
}

/**
 * Impedance sample (arbitrary units, 1 = 500 mL breath) from chest volume and beat times. The default 10 %
 * ripple stays under the detector floor; a larger one (20 %: small or obese chests) is counted once breaths are
 * shallow or absent, postponing the apnoea alarm as on a real monitor (research 03 §7).
 */
export function impedanceSample(volMl: number, t: number, beats: readonly number[], ripple = RIPPLE_FRACTION): number {
  let r = 0;
  for (const tb of beats) {
    const z = (t - tb - 0.2) / 0.12;
    if (z > -4 && z < 4) r += Math.exp(-z * z);
  }
  return volMl / 500 + ripple * r;
}

export function impStep(st: ImpNum, t: number, x: number, dt: number): 'apnoea' | 'resumed' | null {
  st.mean += (x - st.mean) * (1 - Math.exp(-dt / IMP_HP_TAU_S));
  const y = x - st.mean;
  st.amp = Math.max(Math.abs(y) * 2, st.amp * Math.exp(-dt / 8));
  const thr = Math.max(IMP_FLOOR, IMP_THRESHOLD * st.amp * 0.5);
  let ev: 'apnoea' | 'resumed' | null = null;
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
    st.apnoea = true;
    ev = 'apnoea';
  }
  return ev;
}

export function impRr(st: ImpNum, t: number): Measured {
  const e = st.edges;
  if (st.apnoea) return { value: 0, flag: 'valid', at: t };
  if (e.length < 3) return { value: null, flag: 'invalid', at: t };
  return { value: Math.round((60 * (e.length - 1)) / ((e[e.length - 1] as number) - (e[0] as number))), flag: 'valid', at: t };
}

/**
 * Pleth-derived RR (research 03 §7 "RRp"): count the respiratory cycles of the pulse-amplitude series (RIAV).
 * `beats` are completed pleth beats {t, amp}; the series is detrended with its mean over the window and the
 * upward zero crossings are counted (≥ 2 needed). Slow by design (a 30–60 s window).
 */
export function plethRr(beats: ReadonlyArray<{ t: number; amp: number }>, t: number, windowS = 60): number | null {
  const w = beats.filter((b) => b.t > t - windowS);
  if (w.length < 8) return null;
  const m = w.reduce((a, b) => a + b.amp, 0) / w.length;
  const s = w.map((b) => b.amp - m);
  // smooth over 3 beats so a single beat's jitter does not make a crossing
  const sm = s.map((_, i) => ((s[i - 1] ?? s[i] as number) + (s[i] as number) + (s[i + 1] ?? s[i] as number)) / 3);
  const cross: number[] = [];
  for (let i = 1; i < sm.length; i++) if ((sm[i - 1] as number) < 0 && (sm[i] as number) >= 0) cross.push((w[i] as { t: number }).t);
  if (cross.length < 3) return null;
  return (60 * (cross.length - 1)) / ((cross[cross.length - 1] as number) - (cross[0] as number));
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/resp packages/engine-core/test/l3/resp
git commit -m "feat(l3): impedance respiration with cardiogenic ripple, its RR detector and apnoea, pleth-derived RR" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Temperature numerics and the couplings (CO read, mean airway pressure)

**Files:**
- Create: `packages/engine-core/src/l3/temp/temp-numerics.ts`, `packages/engine-core/src/l2/gas/coupling.ts`, `packages/engine-core/test/l2/gas/coupling.test.ts`

**Interfaces:**
- Consumes: Task 2 `l1Target`, `L1State.coupled`; Stage 2 `HemoState` (read only: `cpr`, `lastEjT`, `lastRR`, `siteBeats`, `sys.g`), `CPR_SV_FRAC`, `SV_REF_ML`; Task 7 `SENSOR_TAU_S`.
- Produces: `createTempNum(t0)`, `tempNumStep(st, sites, site, dtS)`, `tempMeasured(v, on, t)`; `RAP_FRACTION` 0.4, `PAW_REF_CMH2O` 10, `venousGradient(vs)`, `cardiacOutput(hs, t)` (L/min), `applyPawCoupling(l1, meanPawCmH2O, t): number` (the output factor f).

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l2/gas/coupling.test.ts`:**

```ts
// Ventilation → haemodynamics coupling in MANUAL (brief §4.9; research 03 §8.7) and the CO read from Stage 2.
import { describe, expect, it } from 'vitest';
import { applyPawCoupling, cardiacOutput, venousGradient } from '../../../src/l2/gas/coupling.ts';
import { createL1State, l1Value } from '../../../src/l1/state.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';

describe('coupling', () => {
  it('mean Paw ≤ 10 cmH2O leaves the targets alone; 18 cmH2O raises CVP by 0.4 × 0.7356 × 8 and lowers SBP/DBP/volume', () => {
    const l1 = createL1State();
    expect(applyPawCoupling(l1, 8, 0)).toBe(1);
    expect(l1Value(l1, 'cvp', 0)).toBe(6);
    const f = applyPawCoupling(l1, 18, 0);
    const dRap = 0.4 * 0.7356 * 8;
    expect(l1Value(l1, 'cvp', 0)).toBeCloseTo(6 + dRap, 9);
    expect(f).toBeCloseTo(1 - dRap / venousGradient(1), 9);
    expect(l1Value(l1, 'sbp', 0)).toBeCloseTo(6 + dRap + (120 - 6 - dRap) * f, 9);
    expect(l1Value(l1, 'volumeStatus', 0)).toBeCloseTo(f, 9);
    applyPawCoupling(l1, 5, 1);
    expect(l1Value(l1, 'sbp', 1)).toBe(120);
  });
  it('hypovolaemia makes the same PEEP cost more output (venous gradient 15 → 4 mmHg)', () => {
    expect(venousGradient(1)).toBe(15);
    expect(venousGradient(0)).toBe(4);
  });
  it('cardiac output: 0 when no ejection for 3 s, CPR pump flow when compressing', () => {
    const hs = createHemoState(undefined, createL1State(), 75);
    hs.lastEjT = 0;
    expect(cardiacOutput(hs, 10)).toBe(0);
    hs.cpr = { active: true, rate: 110, quality: 1, nextT: 0 };
    expect(cardiacOutput(hs, 10)).toBeCloseTo((70 * 0.2 * 110) / 1000, 9);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/gas/coupling.test.ts`
Expected: FAIL — cannot find `src/l2/gas/coupling.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l3/temp/temp-numerics.ts`:**

```ts
// Temperature numerics (brief §4.6 "Sensor", §6.1): T1 = oesophageal probe, T2 = the chosen site, each a
// first-order probe lag (< 10 s) behind the site temperature, reported at 1 Hz with 0.1 °C resolution.
import type { TempSite } from '../../types-resp.ts';
import type { Measured } from '../../types.ts';
import { SENSOR_TAU_S } from '../../l2/temp/temp.ts';

export interface TempNum {
  t1: number;
  t2: number;
}

export function createTempNum(t0: number): TempNum {
  return { t1: t0, t2: t0 };
}

export function tempNumStep(st: TempNum, sites: Record<TempSite, number>, site: TempSite, dtS: number): void {
  const a = 1 - Math.exp(-dtS / SENSOR_TAU_S);
  st.t1 += (sites.oesophageal - st.t1) * a;
  st.t2 += (sites[site] - st.t2) * a;
}

export function tempMeasured(v: number, on: boolean, t: number): Measured {
  return on ? { value: Math.round(v * 10) / 10, flag: 'valid', at: t } : { value: null, flag: 'invalid', at: t };
}
```

**Create `packages/engine-core/src/l2/gas/coupling.ts`:**

```ts
// Couplings Stage 3 owns (brief §4.9 M4–M6; §4.9 "Ventilation → haemodynamics"; research 03 §8.7):
//  • cardiac output READ from Stage 2's state (never written): drives gas uptake, low-flow EtCO2, SpO2 delay;
//  • mean airway pressure → effective RAP: CVP truth rises, venous return (so SV/CO) falls, PPV rises. In MANUAL
//    this acts through L1 `coupled` truths on cvp/sbp/dbp/volumeStatus, which Stage 2's pipeline reads through
//    l1Value (its M2 tracker then meets the coupled pressures).
import { l1Target, type L1State } from '../../l1/state.ts';
import { CPR_SV_FRAC, SV_REF_ML } from '../hemo/params.ts';
import type { HemoState } from '../hemo/pipeline.ts';
import { CMH2O_TO_MMHG } from './params.ts';

/** Effective RAP rises by 30–50 % of the mean-airway-pressure change (brief §4.9) → 0.4 [ENG]. */
export const RAP_FRACTION = 0.4;
/** Only mean Paw above 10 cmH2O acts in MANUAL ("High PEEP (> 10–15) … lowers CO and MAP", research 03 §8.7). */
export const PAW_REF_CMH2O = 10;
/**
 * Venous-return driving pressure Pmsf − RAP by volume status [ENG]: 15 mmHg normovolaemic, 4 mmHg empty. PEEP
 * 5 → 15 (mean Paw ≈ 8 → 18) gives f = 0.84 normovolaemic and 0.68 at volumeStatus 0.3 (prototype: CO −9 % and
 * −23 %, MAP 97 → 83 and 97 → 68 mmHg once Stage 2's tracker has met the coupled pressures).
 */
export function venousGradient(vs: number): number {
  return 4 + 11 * Math.min(1, Math.max(0, vs));
}

/** CO (L/min) from Stage 2's completed site beats over the last 10 s; CPR pump flow; 0 in arrest. */
export function cardiacOutput(hs: HemoState, t: number): number {
  if (hs.cpr.active) return (SV_REF_ML * CPR_SV_FRAC * hs.cpr.quality * hs.cpr.rate) / 1000;
  if (t - hs.lastEjT > Math.max(3, 2.2 * hs.lastRR)) return 0;
  const bs = hs.siteBeats.filter((b) => !b.cpr && t - b.t < 10);
  if (bs.length < 2) return (SV_REF_ML * hs.sys.g * 60) / Math.max(0.3, hs.lastRR) / 1000;
  const sv = bs.reduce((a, b) => a + b.sv, 0);
  const dur = bs.reduce((a, b) => a + b.dur, 0);
  return (sv / Math.max(0.1, dur)) * 0.06;
}

/** Apply the mean-airway-pressure coupling to the L1 coupled truths at time t (MANUAL). */
export function applyPawCoupling(l1: L1State, meanPawCmH2O: number, t: number): number {
  const c = (l1.coupled ??= {});
  const excess = Math.max(0, meanPawCmH2O - PAW_REF_CMH2O);
  if (excess <= 0) {
    delete c.cvp;
    delete c.sbp;
    delete c.dbp;
    delete c.volumeStatus;
    return 1;
  }
  const dRap = RAP_FRACTION * CMH2O_TO_MMHG * excess;
  const vs = l1Target(l1, 'volumeStatus', t);
  const f = Math.max(0.3, 1 - dRap / venousGradient(vs));
  const cvp = l1Target(l1, 'cvp', t) + dRap;
  c.cvp = cvp;
  c.sbp = cvp + (l1Target(l1, 'sbp', t) - cvp) * f;
  c.dbp = cvp + (l1Target(l1, 'dbp', t) - cvp) * f;
  c.volumeStatus = vs * f;
  return f;
}
```

- [ ] **Step 4: Run and verify** — same command; expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l3/temp packages/engine-core/src/l2/gas/coupling.ts packages/engine-core/test/l2/gas/coupling.test.ts
git commit -m "feat(gas): CO read from the haemodynamics, mean-airway-pressure coupling (MANUAL), temperature numerics" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: The breath-signal seam in Stage 2's haemodynamics (exception (a))

**Files:**
- Create: `packages/engine-core/test/l2/hemo/seam-stage3.test.ts`
- Modify: `packages/engine-core/src/l2/hemo/params.ts`, `packages/engine-core/src/l2/hemo/cvp.ts`, `packages/engine-core/src/l2/hemo/pipeline.ts` (7 lines changed and 1 added, each marked `Stage 3 seam`)

**Interfaces:**
- Produces: `respFactor(t, rr, phi, g, u?)`, `cvpAt(st, t, pv, phi, thor, u?)`, `HemoCtx.u?: (t: number) => number`. Absent `u` → Stage 2's `breathU(t, phi)` exactly (its tests and hashes are unchanged by this task).

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l2/hemo/seam-stage3.test.ts`:**

```ts
// The Stage 3 seam in Stage 2's haemodynamics: an injected breath signal replaces the fixed 15/min clock.
import { describe, expect, it } from 'vitest';
import { breathU, respFactor } from '../../../src/l2/hemo/params.ts';
import { createCvpState, cvpAt } from '../../../src/l2/hemo/cvp.ts';

describe('Stage 3 breath-signal seam', () => {
  it('without u, respFactor and cvpAt are unchanged; with u they follow it', () => {
    const phi = 0.7;
    expect(respFactor(3, 0.8, phi, 0.2)).toBe(respFactor(3, 0.8, phi, 0.2, (t) => breathU(t, phi)));
    expect(respFactor(3, 0.8, phi, 0.2, () => 0.5)).toBeCloseTo(1, 12); // apnoea: no respiratory variation
    const st = createCvpState();
    expect(cvpAt(st, 3, 6, phi, [], () => 1)).toBeCloseTo(6 + 1.5, 9);
    expect(cvpAt(st, 3, 6, phi, [])).toBeCloseTo(6 + 3 * (breathU(3, phi) - 0.5), 9);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo/seam-stage3.test.ts`
Expected: FAIL — the 5th argument is ignored, so `respFactor(…, () => 0.5)` is not 1.

- [ ] **Step 3: Implement**

**Modify `packages/engine-core/src/l2/hemo/params.ts`** (1/1) — find:

```ts
 */
export function respFactor(t: number, rr: number, phi: number, g: number): number {
  const lagged = breathU(t - 2 * rr, phi);
  return (1 - g * lagged + INSUFFLATION_GAIN * breathU(t, phi)) / (1 - g / 2 + INSUFFLATION_GAIN / 2);
}
```

replace with:

```ts
 */
export function respFactor(t: number, rr: number, phi: number, g: number, u: (t: number) => number = (x) => breathU(x, phi)): number { // Stage 3 seam: u
  const lagged = u(t - 2 * rr);
  return (1 - g * lagged + INSUFFLATION_GAIN * u(t)) / (1 - g / 2 + INSUFFLATION_GAIN / 2);
}
```

**Modify `packages/engine-core/src/l2/hemo/cvp.ts`** (1/1) — find:

```ts
/** CVP at time t: venous mean + waves + positive-pressure respiratory swing + CPR thoracic pulses. */
export function cvpAt(st: CvpState, t: number, pv: number, phi: number, thor: readonly Pulse[]): number {
  return pv + cvpWavesAt(st, t) + CVP_RESP_MMHG * (breathU(t, phi) - 0.5) + pressureAt(thor, t);
}
```

replace with:

```ts
/** CVP at time t: venous mean + waves + positive-pressure respiratory swing + CPR thoracic pulses. */
export function cvpAt(st: CvpState, t: number, pv: number, phi: number, thor: readonly Pulse[], u: (t: number) => number = (x) => breathU(x, phi)): number { // Stage 3 seam: u
  return pv + cvpWavesAt(st, t) + CVP_RESP_MMHG * (u(t) - 0.5) + pressureAt(thor, t);
}
```

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** (1/3) — find:

```ts
  phi: number; // respiratory phase shared with the ECG's RSA (hrv.phi)
}
```

replace with:

```ts
  phi: number; // respiratory phase shared with the ECG's RSA (hrv.phi)
  u?: (t: number) => number; // Stage 3 seam: the respiratory driver's breath signal (replaces breathU when present)
}
```

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** (2/3) — find:

```ts
  const e = ejectionFactor(k);
  const resp = respFactor(t, rr, ctx.phi, gHyp(l1Value(ctx.l1, 'volumeStatus', t))); // M6 (PPV)
  const nominal = SV_REF_ML * hs.sys.g * resp; // what a normal beat would eject now
```

replace with:

```ts
  const e = ejectionFactor(k);
  const resp = respFactor(t, rr, ctx.phi, gHyp(l1Value(ctx.l1, 'volumeStatus', t)), ctx.u); // M6 (PPV); Stage 3 seam: ctx.u
  const nominal = SV_REF_ML * hs.sys.g * resp; // what a normal beat would eject now
```

**Modify `packages/engine-core/src/l2/hemo/pipeline.ts`** (3/3) — find:

```ts
        if (cv.sensor !== 'none') {
          stepTransducer(cv, lineInput(cv, cvpAt(hs.cvp, ta, hs.pv, ctx.phi, hs.thorCen), ta), lineInput(cv, cvpAt(hs.cvp, tb, hs.pv, ctx.phi, hs.thorCen), tb), H_S);
        }
```

replace with:

```ts
        if (cv.sensor !== 'none') {
          stepTransducer(cv, lineInput(cv, cvpAt(hs.cvp, ta, hs.pv, ctx.phi, hs.thorCen, ctx.u), ta), lineInput(cv, cvpAt(hs.cvp, tb, hs.pv, ctx.phi, hs.thorCen, ctx.u), tb), H_S); // Stage 3 seam: ctx.u
        }
```

- [ ] **Step 4: Run and verify**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/hemo test/engine/hemo-acceptance.test.ts`
Expected: all pass (nothing passes `u` yet, so Stage 2 is byte-identical).

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/hemo packages/engine-core/test/l2/hemo/seam-stage3.test.ts
git commit -m "feat(hemo): optional breath-signal seam u(t) for the Stage 3 respiratory driver (default unchanged)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: The respiratory pipeline

**Files:**
- Create: `packages/engine-core/src/l2/resp/pipeline.ts`, `packages/engine-core/test/l2/resp/pipeline.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–14; Stage 2 `HemoState`, `RhythmView`, `piNumeric`.
- Produces: `RESP_CHANNELS = ['co2', 'resp']`, `type RespChannel`, `RESP_RATE` 62.5, `interface RespCtx { l1, hemo, rhythm, hr }`, `interface RespState` (plain data; `num.spo2.shown` is the displayed SpO2), `createRespState(profile, l1, seed)`, `respBreathU(rs, t)`, `advanceResp(rs, ctx, mEnd, write)`, `validateRespCommand(cmd): string | undefined | null`, `applyRespCommand(rs, l1, cmd, t): boolean`. Events pushed to `rs.out`: `breath`, `lungState`, `measurement` (spo2, etco2, imco2, awrr, rr, tempCore, tempSite), `alarm` (`apnoea-co2`, `apnoea-resp`).

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/l2/resp/pipeline.test.ts`:**

```ts
// The Stage 3 pipeline in isolation (engine-free): samples by absolute index, breath events, commands.
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { constantRamp } from '../../../src/l1/ramp.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { advanceResp, applyRespCommand, createRespState, validateRespCommand } from '../../../src/l2/resp/pipeline.ts';
import type { Command } from '../../../src/types.ts';

const c = (b: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', ...b }) as Command;

describe('respiratory pipeline', () => {
  it('writes co2/resp at 62.5 Hz by absolute index, emits breath and lungState events', () => {
    const l1 = createL1State();
    const rs = createRespState({ sensors: { co2: 'on' } }, l1, 1);
    const hemo = createHemoState(undefined, l1, 75);
    const idx: Record<string, number[]> = { co2: [], resp: [] };
    advanceResp(rs, { l1, hemo, rhythm: { id: 'sinus', records: [] }, hr: constantRamp(75) }, 625, (ch, m) => idx[ch]!.push(m));
    expect(idx.co2![0]).toBe(0);
    expect(idx.co2![idx.co2!.length - 1]).toBe(625);
    expect(idx.resp).toHaveLength(626);
    expect(rs.out.filter((e) => e.type === 'breath').length).toBeGreaterThanOrEqual(2);
    expect(rs.out.find((e) => e.type === 'lungState')).toBeDefined();
  });

  it('validates and applies Stage 3 commands; leaves Stage 2 commands alone', () => {
    expect(validateRespCommand(c({ type: 'applyEvent', event: { kind: 'airway', state: 'kinked' } }))).toMatch(/airway state/);
    expect(validateRespCommand(c({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', fio2: 0.1 } }))).toMatch(/fio2/);
    expect(validateRespCommand(c({ type: 'applyEvent', event: { kind: 'condition', id: 'pe', severity: 1 } }))).toMatch(/Stage 7/);
    expect(validateRespCommand(c({ type: 'attachSensor', sensor: 'temp', state: 'on', site: 'rectal' }))).toBeUndefined();
    expect(validateRespCommand(c({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'flush' } }))).toBeNull();
    const l1 = createL1State();
    const rs = createRespState(undefined, l1, 1);
    expect(applyRespCommand(rs, l1, c({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 10, vtMl: 450, fio2: 0.5 } }), 3)).toBe(true);
    expect(rs.driver.vent).toMatchObject({ rr: 10, vt: 450 });
    expect(applyRespCommand(rs, l1, c({ type: 'attachSensor', sensor: 'co2', state: 'warmup', sampling: 'mainstream' }), 3)).toBe(true);
    expect(rs.co2Sensor).toBe('warmup');
    expect(rs.sampler.mode).toBe('mainstream');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/resp/pipeline.test.ts`
Expected: FAIL — cannot find `src/l2/resp/pipeline.ts`.

- [ ] **Step 3: Implement**

**Create `packages/engine-core/src/l2/resp/pipeline.ts`:**

```ts
// Stage 3 respiratory pipeline: the per-tick work the engine calls BEFORE the haemodynamics (brief §3.3 order):
//   driver cycles → 10 Hz gas exchange (O2 store/ODC/shunt, 2-compartment CO2, circulatory delay, SpO2 chain),
//   1 Hz temperature → 62.5 Hz co2 (sampled capnogram) and resp (impedance) samples → L3 numerics → events
//   (breath, lungState, measurement, alarm) and L1 coupled truths (spo2, etco2, rr, vt, fio2, shunt, tempCore,
//   and the mean-airway-pressure coupling on cvp/sbp/dbp/volumeStatus).
// Reads Stage 2's HemoState (CO, pleth feet, PI, cuff, CPR) and never writes it. All state is plain data.
import { l1Target, setL1Target, type L1State } from '../../l1/state.ts';
import type { RampState } from '../../l1/ramp.ts';
import { co2NumStep, co2Numerics, createCo2Num, type Co2Num } from '../../l3/co2-numerics/co2-numerics.ts';
import { createImpNum, impedanceSample, impRr, impStep, type ImpNum } from '../../l3/resp/impedance.ts';
import { createSpo2, spo2Measured, stepSpo2, type Spo2State } from '../../l3/spo2/spo2.ts';
import { createTempNum, tempMeasured, tempNumStep, type TempNum } from '../../l3/temp/temp-numerics.ts';
import { piNumeric } from '../../l3/pressure-numerics/numerics.ts';
import { normal, seedStream } from '../../rng/sfc32.ts';
import type { AirwayState, RespClinicalEvent, TempSite, VentSource } from '../../types-resp.ts';
import type { ChannelId, Command, EngineEvent, NumericId, Measured, PatientProfile } from '../../types.ts';
import { airwayCo2, createSampler, CO2_RATE, sampleCo2, type CapnoCtx, type SamplerState } from '../co2/capno.ts';
import { applyPawCoupling, cardiacOutput } from '../gas/coupling.ts';
import { createCo2State, etco2True, lowFlowFactor, stepCo2, vaForPaco2, type Co2State } from '../gas/co2.ts';
import { createDelay, delayStep, siteDelay, type DelayLine } from '../gas/delay.ts';
import { o2Steady, solveShunt, stepO2, type O2Inputs, type O2State } from '../gas/o2.ts';
import { apparatusDeadSpaceMl, CI_LPM_PER_KG, CO_REF_LPM, GA_METABOLIC, GAS_DT_S, gasPatient, PA_ET_GRADIENT, tempFactor, type GasPatient } from '../gas/params.ts';
import type { HemoState, RhythmView } from '../hemo/pipeline.ts';
import { createTemp, MH_VCO2_FACTOR, mhFactor, setCoreTarget, stepTemp, type TempState } from '../temp/temp.ts';
import {
  alveolarVentilation, breathSignal, chestVolume, checkDrive, createDriver, cycleAt, meanAirwayPressure, nominalRate,
  onVentFrame, planCycles, preoxActive, pruneCycles, replan, type DriverCtx, type DriverState,
} from './driver.ts';

export const RESP_CHANNELS = ['co2', 'resp'] as const satisfies readonly ChannelId[];
export type RespChannel = (typeof RESP_CHANNELS)[number];
export const RESP_RATE = CO2_RATE; // 62.5 Hz
const DT = 1 / RESP_RATE;
const PLAN_AHEAD_S = 0.6; // cycles exist this far ahead: Stage 2 plans beats ≈ 0.25 s ahead and reads u(t)
const KEEP_S = 15; // history kept for the sidestream delay, u(t − 2·RR) and the 10 s EtCO2 window
const CO2_WARMUP_S = 10; // brief §6.2 [ENG]
const AIRWAYS: readonly AirwayState[] = ['patent', 'obstructed', 'apnoea', 'disconnected', 'oesophageal', 'endobronchial', 'bronchospasm'];
const SOURCES: readonly VentSource[] = ['spontaneous', 'bvm', 'ventilator', 'none'];
const TEMP_SITES: readonly TempSite[] = ['oesophageal', 'nasopharyngeal', 'tympanic', 'bladder', 'rectal', 'axilla'];
const LOSS: readonly AirwayState[] = ['obstructed', 'disconnected', 'oesophageal'];

export interface RespCtx {
  l1: L1State;
  hemo: HemoState;
  rhythm: RhythmView;
  hr: RampState;
}

export interface RespState {
  m: number; // next 62.5 Hz sample index
  gasK: number; // next gas step (time gasK·0.1 s)
  pat: GasPatient;
  driver: DriverState;
  o2: O2State;
  co2: Co2State;
  delay: DelayLine;
  temp: TempState;
  shunt: number; // model shunt (MANUAL-calibrated or the `shunt` input)
  etco2: number; // current true EtCO2
  coRatio: number;
  seen: { spo2: number; etco2: number; shunt: number; tempCore: number }; // last targets acted on
  sampler: SamplerState;
  co2Sensor: 'off' | 'warmup' | 'on';
  warmUntil: number;
  tempSensor: 'off' | 'on';
  tempSite: TempSite;
  num: { co2: Co2Num; imp: ImpNum; spo2: Spo2State; temp: TempNum };
  beats: number[];
  beatSeq: number;
  shownCo2: number;
  lungKey: string;
  out: EngineEvent[];
}

export function createRespState(profile: PatientProfile | undefined, l1: L1State, seed: number): RespState {
  const pat = gasPatient(profile);
  const rng = seedStream(seed, 'resp'); // its own stream: drawing here never shifts Stage 1/2 streams (brief §3.3)
  const sens = profile?.sensors ?? {};
  const t0 = l1Target(l1, 'tempCore', 0);
  const rs: RespState = {
    m: 0, gasK: 0, pat, driver: createDriver(rng),
    o2: { fa: 0.14, cv: 140, sa: 0.97, pao2: 95 },
    co2: createCo2State(l1Target(l1, 'etco2', 0) + PA_ET_GRADIENT),
    delay: createDelay(l1Target(l1, 'spo2', 0) / 100),
    temp: createTemp(t0, pat.effKg),
    shunt: l1Target(l1, 'shunt', 0), etco2: l1Target(l1, 'etco2', 0), coRatio: 1,
    seen: { spo2: Number.NaN, etco2: Number.NaN, shunt: l1Target(l1, 'shunt', 0), tempCore: t0 },
    sampler: createSampler('sidestream', (profile?.ageY ?? 40) < 28 / 365),
    co2Sensor: sens.co2 === 'on' || sens.co2 === 'warmup' ? 'on' : 'off', warmUntil: 0,
    tempSensor: sens.temp === 'off' ? 'off' : 'on', tempSite: 'axilla',
    num: {
      co2: createCo2Num(), imp: createImpNum(),
      spo2: createSpo2(l1Target(l1, 'spo2', 0) / 100, Math.max(-2, Math.min(2, normal(rng)))), // bias ±2–3 % RMS [ENG]
      temp: createTempNum(t0),
    },
    beats: [], beatSeq: -1, shownCo2: 0, lungKey: '', out: [],
  };
  return rs;
}

// --- helpers ----------------------------------------------------------------------------------------------
function driverCtx(rs: RespState, l1: L1State, t: number): DriverCtx {
  return { rr: l1Target(l1, 'rr', t), vt: l1Target(l1, 'vt', t), fio2: l1Target(l1, 'fio2', t), etco2: rs.etco2, complianceMl: compliance(rs) };
}
function compliance(rs: RespState): number {
  return rs.pat.complianceMl * (rs.driver.airway === 'endobronchial' ? 0.5 : 1);
}
function deadSpace(rs: RespState): number {
  const mech = rs.driver.source !== 'spontaneous' && rs.driver.source !== 'none';
  return rs.pat.deadSpaceMl + (mech ? apparatusDeadSpaceMl(rs.pat.weightKg) : 0) + rs.co2.vdExtraMl;
}
function extraGradient(rs: RespState): number {
  return rs.driver.airway === 'bronchospasm' ? 8 * rs.driver.severity : 0; // Pa − Et widens with obstruction [ENG]
}
function extraShunt(rs: RespState): number {
  const a = rs.driver.airway;
  return a === 'endobronchial' ? 0.25 : a === 'bronchospasm' ? 0.05 * rs.driver.severity : 0; // research 03 §8.7 [ENG]
}
function currentFio2(rs: RespState, l1: L1State, t: number): number {
  const d = rs.driver;
  if (preoxActive(d, t)) return (d.preox as { fio2: number }).fio2;
  if (d.source === 'external' && d.ext) return d.ext.fio2;
  const c = cycleAt(d, t);
  return c ? c.fio2 : l1Target(l1, 'fio2', t);
}
function sameLimbCuff(h: HemoState): boolean {
  const s = h.pleth.site;
  return h.nibp.cuff > 0 && ((s === 'leftFinger' && h.nibp.site === 'leftArm') || (s === 'rightFinger' && h.nibp.site === 'rightArm'));
}

/** The seam Stage 2 reads: u(t) (see driver.breathSignal). */
export function respBreathU(rs: RespState, t: number): number {
  return breathSignal(rs.driver, t, compliance(rs));
}

/** Metabolic factor: temperature, MH and general anaesthesia (brief §4.3, §4.9 conditions). */
function metabolic(rs: RespState, t: number): number {
  return tempFactor(rs.temp.tc) * mhFactor(rs.temp, t, MH_VCO2_FACTOR) * (rs.temp.anaesthesia === 'general' ? GA_METABOLIC : 1);
}

function o2Inputs(rs: RespState, l1: L1State, t: number, vaLpm: number): O2Inputs {
  const a = rs.driver.airway;
  const open = a === 'patent' || a === 'apnoea' || a === 'disconnected' || a === 'bronchospasm' || a === 'endobronchial';
  const ga = rs.temp.anaesthesia === 'general';
  return {
    vaLpm, fio2: currentFio2(rs, l1, t),
    massFlowFio2: vaLpm > 0 || !open ? null : preoxActive(rs.driver, t) ? (rs.driver.preox as { fio2: number }).fio2 : 0.21,
    qLpm: rs.coRatio * CI_LPM_PER_KG * rs.pat.effKg, vo2: rs.pat.vo2 * metabolic(rs, t), shunt: Math.min(0.9, rs.shunt + extraShunt(rs)),
    paco2: rs.co2.pf, tempC: rs.temp.tc, frcMl: ga ? rs.pat.frcGaMl : rs.pat.frcMl, bloodL: rs.pat.bloodL,
  };
}

/** Nominal alveolar ventilation of the current settings (MANUAL calibration). */
function nominalVa(rs: RespState, l1: L1State, t: number): number {
  const n = nominalRate(rs.driver, driverCtx(rs, l1, t));
  return (n.rr * Math.max(0, n.vt - deadSpace(rs))) / 1000;
}

// --- 10 Hz gas step ----------------------------------------------------------------------------------------
function gasStep(rs: RespState, ctx: RespCtx, t: number): void {
  const l1 = ctx.l1;
  const h = ctx.hemo;
  const d = rs.driver;
  checkDrive(d, t);
  rs.coRatio = cardiacOutput(h, t) / CO_REF_LPM;
  // temperature at 1 Hz; MANUAL tempCore target places the model (plan decision 2)
  if (rs.gasK % 10 === 0) {
    const tc = l1Target(l1, 'tempCore', t);
    if (tc !== rs.seen.tempCore) {
      setCoreTarget(rs.temp, tc);
      rs.seen.tempCore = tc;
    }
    stepTemp(rs.temp, t, 1);
    tempNumStep(rs.num.temp, rs.temp.sites, rs.tempSite, 1);
  }
  const vco2 = rs.pat.vco2 * metabolic(rs, t);
  // MANUAL etco2 target → physiological dead space that holds it at the current settings (decision 2)
  const etT = l1Target(l1, 'etco2', t);
  if (etT !== rs.seen.etco2) {
    rs.seen.etco2 = etT;
    const n = nominalRate(d, driverCtx(rs, l1, t));
    rs.co2.flow = lowFlowFactor(rs.coRatio); // calibrate against the settled low-flow factor
    const pf = etT / Math.max(0.05, rs.co2.flow) + PA_ET_GRADIENT + extraGradient(rs);
    if (n.rr > 0) {
      const base = deadSpace(rs) - rs.co2.vdExtraMl;
      const need = n.vt - (vaForPaco2(vco2, pf) * 1000) / n.rr;
      rs.co2.vdExtraMl = Math.min(0.8 * n.vt, Math.max(-0.5 * rs.pat.deadSpaceMl, need - base));
    }
    rs.co2.pf = pf;
    rs.co2.ps = pf;
  }
  const va = alveolarVentilation(d, t, deadSpace(rs));
  stepCo2(rs.co2, { vaLpm: va, vco2, coRatio: rs.coRatio, cf: rs.pat.cf, cs: rs.pat.cs, kfs: rs.pat.kfs, extraGradient: extraGradient(rs) }, GAS_DT_S);
  rs.etco2 = etco2True(rs.co2, extraGradient(rs));
  // MANUAL shunt input and spo2 target (spo2 wins when both change; decision 2)
  const sh = l1Target(l1, 'shunt', t);
  if (sh !== rs.seen.shunt) {
    rs.seen.shunt = sh;
    rs.shunt = sh;
  }
  const spT = l1Target(l1, 'spo2', t);
  if (spT !== rs.seen.spo2) {
    rs.seen.spo2 = spT;
    const x = o2Inputs(rs, l1, t, Math.max(0.3, nominalVa(rs, l1, t)));
    rs.shunt = Math.max(0, solveShunt(x, spT / 100) - extraShunt(rs));
    const ss = o2Steady({ ...x, shunt: rs.shunt + extraShunt(rs) }, rs.shunt + extraShunt(rs));
    if (ss && (va > 0 || rs.gasK === 0)) Object.assign(rs.o2, ss);
  }
  stepO2(rs.o2, o2Inputs(rs, l1, t, va), GAS_DT_S);
  const pinned = l1.pinned.includes('spo2');
  const sa = pinned ? spT / 100 : rs.o2.sa; // M5: an instructor pin on spo2 disables autoDesat
  const piM = piNumeric(h.num.pleth, t);
  const siteSa = delayStep(rs.delay, sa, siteDelay(h.pleth.site, rs.coRatio, piM.value), GAS_DT_S);
  stepSpo2(rs.num.spo2, {
    siteSa, probe: h.pleth.state, lastFootT: h.num.pleth.feet[h.num.pleth.feet.length - 1] ?? -1e12,
    pi: piM.value, cuffOnLimb: sameLimbCuff(h), cpr: h.cpr.active,
  }, t);
  // coupled truths (brief §4.9: the `state` event shows truth; flags show 'override' when it departs from target)
  applyPawCoupling(l1, meanAirwayPressure(d, t, compliance(rs)), t);
  const c = (l1.coupled ??= {});
  const n = nominalRate(d, driverCtx(rs, l1, t));
  c.spo2 = sa * 100;
  c.etco2 = rs.etco2;
  c.fio2 = currentFio2(rs, l1, t);
  c.shunt = Math.min(0.9, rs.shunt + extraShunt(rs));
  c.tempCore = rs.temp.tc;
  if (d.source === 'spontaneous' && d.airway !== 'apnoea') {
    delete c.rr; // the spontaneous driver breathes at the rr/vt targets
    delete c.vt;
  } else {
    const breathing = d.source !== 'none' && d.source !== 'spontaneous';
    c.rr = breathing ? n.rr : 0;
    c.vt = breathing ? n.vt : 0;
  }
  lungStateEvent(rs, t);
  if (rs.gasK % 10 === 0 && rs.gasK > 0) emitSecond(rs, t);
}

function lungStateEvent(rs: RespState, t: number): void {
  const d = rs.driver;
  const sev = d.severity;
  const ev = {
    complianceMlPerCmH2O: Math.round(compliance(rs)),
    resistanceCmH2OPerLps: Math.round(rs.pat.resistance * (d.airway === 'bronchospasm' ? 1 + 3 * sev : 1)),
    effort: d.source === 'spontaneous' ? 1 : Math.round(d.cleft * 100) / 100,
    autoPeepTendency: d.airway === 'bronchospasm' ? Math.round(80 * sev) / 100 : 0,
    shunt: Math.round(Math.min(0.9, rs.shunt + extraShunt(rs)) * 100) / 100,
    deadSpaceMl: Math.round(deadSpace(rs)),
    frcMl: Math.round(rs.temp.anaesthesia === 'general' ? rs.pat.frcGaMl : rs.pat.frcMl),
  };
  const key = JSON.stringify(ev);
  if (key === rs.lungKey) return;
  rs.lungKey = key;
  rs.out.push({ type: 'lungState', t, ...ev });
}

function emitSecond(rs: RespState, t: number): void {
  const v: Partial<Record<NumericId, Measured>> = { spo2: spo2Measured(rs.num.spo2, t) };
  if (rs.co2Sensor === 'on') Object.assign(v, co2Numerics(rs.num.co2, t, rs.shownCo2));
  else if (rs.co2Sensor === 'warmup') for (const k of ['etco2', 'imco2', 'awrr'] as const) v[k] = { value: null, flag: 'invalid', at: t };
  v.rr = impRr(rs.num.imp, t);
  v.tempCore = tempMeasured(rs.num.temp.t1, rs.tempSensor === 'on', t);
  v.tempSite = tempMeasured(rs.num.temp.t2, rs.tempSensor === 'on', t);
  rs.out.push({ type: 'measurement', t, values: v });
}

function alarm(rs: RespState, t: number, id: string, raised: boolean, text: string): void {
  rs.out.push({ type: 'alarm', t, id, priority: 'high', category: 'physiological', state: raised ? 'raised' : 'cleared', text });
}

// --- the tick ----------------------------------------------------------------------------------------------
/**
 * Generate 62.5 Hz samples up to and including absolute index `mEnd` (= floor(ECG end index / 8)); sample m
 * belongs to time m/62.5 (brief §3.3). `write(ch, m, v)` stores a displayed sample.
 */
export function advanceResp(rs: RespState, ctx: RespCtx, mEnd: number, write: (ch: RespChannel, m: number, v: number) => void): void {
  if (mEnd < rs.m) return;
  for (const r of ctx.rhythm.records) {
    if (r.type === 'beat' && r.seq > rs.beatSeq) {
      rs.beatSeq = r.seq;
      if (r.mech.perfused) rs.beats.push(r.t);
    }
  }
  const tEnd = mEnd / RESP_RATE;
  planCycles(rs.driver, driverCtx(rs, ctx.l1, tEnd), tEnd + PLAN_AHEAD_S);
  for (const c of rs.driver.cycles) {
    const ext = rs.driver.source === 'external' && rs.driver.ext?.inInsp && c === rs.driver.cycles[rs.driver.cycles.length - 1];
    if (!c.emitted && c.exch && c.vt > 0 && !ext) {
      c.emitted = true;
      rs.out.push({ type: 'breath', t: c.t0, seq: c.seq, kind: c.kind, tiS: c.ti, teS: c.te, vtMl: Math.round(c.vt), etco2True: Math.round(rs.etco2 * 10) / 10 });
    }
  }
  const h = ctx.hemo;
  const cap: CapnoCtx = { etco2: rs.etco2, beats: rs.beats, cpr: { active: h.cpr.active, rate: h.cpr.rate, quality: h.cpr.quality, anchor: h.cpr.nextT } };
  const air = (t: number) => airwayCo2(rs.driver, t, cap);
  for (; rs.m <= mEnd; rs.m++) {
    const m = rs.m;
    const t = m / RESP_RATE;
    while (rs.gasK * GAS_DT_S <= t + 1e-9) {
      gasStep(rs, ctx, rs.gasK * GAS_DT_S);
      rs.gasK++;
      cap.etco2 = rs.etco2;
    }
    if (rs.co2Sensor !== 'off') {
      if (rs.co2Sensor === 'warmup' && t >= rs.warmUntil) rs.co2Sensor = 'on';
      const y = sampleCo2(rs.sampler, t, air);
      const shown = rs.co2Sensor === 'on' ? y : 0;
      rs.shownCo2 = shown;
      write('co2', m, shown);
      if (rs.co2Sensor === 'on') {
        const ev = co2NumStep(rs.num.co2, t, shown, DT);
        if (ev === 'apnoea') alarm(rs, t, 'apnoea-co2', true, 'APNEA');
        else if (ev === 'resumed') alarm(rs, t, 'apnoea-co2', false, 'APNEA');
      }
    }
    const imp = impedanceSample(chestVolume(rs.driver, t), t, rs.beats);
    write('resp', m, imp);
    const ie = impStep(rs.num.imp, t, imp, DT);
    if (ie === 'apnoea') alarm(rs, t, 'apnoea-resp', true, 'APNEA (RESP)');
    else if (ie === 'resumed') alarm(rs, t, 'apnoea-resp', false, 'APNEA (RESP)');
  }
  pruneCycles(rs.driver, tEnd - KEEP_S);
  while (rs.beats.length > 0 && (rs.beats[0] as number) < tEnd - 5) rs.beats.shift();
}

// --- commands ----------------------------------------------------------------------------------------------
const num = (name: string, v: number | undefined, lo: number, hi: number) =>
  v === undefined || (Number.isFinite(v) && v >= lo && v <= hi) ? undefined : `${name} must be a finite number in ${lo}–${hi}`;

/** Validation hook. Returns a rejection reason, undefined (accepted) or null (not a Stage 3 command). */
export function validateRespCommand(cmd: Command): string | undefined | null {
  if (cmd.type === 'externalDrive') {
    const f = cmd.frame;
    if (cmd.source !== 'ventilator') return "externalDrive source must be 'ventilator'";
    if (!f) return 'externalDrive needs a frame';
    return num('pawCmH2O', f.pawCmH2O, -30, 150) ?? num('flowLps', f.flowLps, -20, 20) ?? num('volumeMl', f.volumeMl, -100, 4000)
      ?? num('fio2', f.fio2, 0.21, 1) ?? num('peepCmH2O', f.peepCmH2O, 0, 40) ?? (f.pawCmH2O === undefined || f.flowLps === undefined ? 'frame needs pawCmH2O and flowLps' : undefined);
  }
  if (cmd.type === 'attachSensor') {
    if (cmd.sensor === 'co2') {
      if (!['off', 'warmup', 'on'].includes(cmd.state)) return 'co2 state must be off, warmup or on';
      return cmd.sampling === undefined || cmd.sampling === 'sidestream' || cmd.sampling === 'mainstream' ? undefined : 'sampling must be sidestream or mainstream';
    }
    if (cmd.sensor === 'temp') {
      if (!['off', 'on'].includes(cmd.state)) return 'temp state must be off or on';
      return cmd.site === undefined || (TEMP_SITES as readonly string[]).includes(cmd.site) ? undefined : `temp site must be one of ${TEMP_SITES.join(', ')}`;
    }
    return null;
  }
  if (cmd.type !== 'applyEvent') return null;
  const ev = cmd.event as RespClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'airway': {
      const a = ev as Extract<RespClinicalEvent, { kind: 'airway' }>;
      return (AIRWAYS as readonly string[]).includes(a.state) ? num('severity', a.severity, 0, 1) : `airway state must be one of ${AIRWAYS.join(', ')}`;
    }
    case 'ventilation': {
      const v = ev as Extract<RespClinicalEvent, { kind: 'ventilation' }>;
      if (!(SOURCES as readonly string[]).includes(v.source)) return `source must be one of ${SOURCES.join(', ')}`;
      return num('rr', v.rr, 1, 80) ?? num('vtMl', v.vtMl, 10, 1500) ?? num('fio2', v.fio2, 0.21, 1) ?? num('peep', v.peep, 0, 30)
        ?? num('ie', v.ie, 0.5, 4) ?? num('fico2', v.fico2, 0, 30) ?? num('effort', v.effort, 0, 1);
    }
    case 'preoxygenate': {
      const p = ev as Extract<RespClinicalEvent, { kind: 'preoxygenate' }>;
      return num('fio2', p.fio2, 0.21, 1) ?? num('durationS', p.durationS, 1, 3600) ?? (p.fio2 === undefined || p.durationS === undefined ? 'preoxygenate needs fio2 and durationS' : undefined);
    }
    case 'condition': {
      const c = ev as { id: string; severity: number };
      return c.id === 'mh' ? num('severity', c.severity, 0, 1) ?? (c.severity === undefined ? 'severity is required' : undefined) : `condition ${c.id} arrives in Stage 7`;
    }
    case 'thermal': {
      const th = ev as Extract<RespClinicalEvent, { kind: 'thermal' }>;
      if (th.anaesthesia !== undefined && !['none', 'general', 'neuraxial'].includes(th.anaesthesia)) return 'anaesthesia must be none, general or neuraxial';
      return num('ambientC', th.ambientC, 5, 40);
    }
    default:
      return null;
  }
}

/** Apply hook. Returns true when the command was a Stage 3 command. */
export function applyRespCommand(rs: RespState, l1: L1State, cmd: Command, t: number): boolean {
  const d = rs.driver;
  const withdraw = (seqs: number[]) => {
    if (seqs.length) rs.out = rs.out.filter((e) => !(e.type === 'breath' && seqs.includes(e.seq)));
  };
  if (cmd.type === 'externalDrive') {
    const wasExt = d.source === 'external';
    if (!wasExt) withdraw(d.cycles.filter((c) => c.t0 > t).map((c) => c.seq));
    onVentFrame(d, cmd.frame, t);
    return true;
  }
  if (cmd.type === 'attachSensor') {
    if (cmd.sensor === 'co2') {
      if (cmd.sampling) rs.sampler.mode = cmd.sampling;
      rs.co2Sensor = cmd.state === 'warmup' ? 'warmup' : cmd.state === 'on' ? 'on' : 'off';
      rs.warmUntil = t + CO2_WARMUP_S;
      return true;
    }
    if (cmd.sensor === 'temp') {
      rs.tempSensor = cmd.state === 'on' ? 'on' : 'off';
      if (cmd.site) rs.tempSite = cmd.site as TempSite;
      return true;
    }
    return false;
  }
  if (cmd.type !== 'applyEvent') return false;
  const ev = cmd.event as RespClinicalEvent | { kind: string };
  switch (ev.kind) {
    case 'airway': {
      const a = ev as Extract<RespClinicalEvent, { kind: 'airway' }>;
      if (a.state === 'oesophageal' && d.airway !== 'oesophageal') d.gastricN = 0;
      d.airway = a.state;
      d.severity = a.severity ?? 1;
      withdraw(replan(d, t, LOSS.includes(a.state), false));
      return true;
    }
    case 'ventilation': {
      const v = ev as Extract<RespClinicalEvent, { kind: 'ventilation' }>;
      d.source = v.source;
      d.ext = null;
      if (v.source === 'bvm') d.vent = { rr: v.rr ?? 10, vt: v.vtMl ?? 500, peep: 0, ie: v.ie ?? 2 };
      if (v.source === 'ventilator') d.vent = { rr: v.rr ?? d.vent.rr, vt: v.vtMl ?? d.vent.vt, peep: v.peep ?? d.vent.peep, ie: v.ie ?? d.vent.ie };
      if (v.source === 'spontaneous') {
        if (v.rr !== undefined) setL1Target(l1, 'rr', t, v.rr);
        if (v.vtMl !== undefined) setL1Target(l1, 'vt', t, v.vtMl);
      }
      if (v.fio2 !== undefined) setL1Target(l1, 'fio2', t, v.fio2);
      if (v.fico2 !== undefined) d.fico2 = v.fico2;
      if (v.effort !== undefined) d.cleft = v.effort;
      withdraw(replan(d, t, true, true));
      return true;
    }
    case 'preoxygenate': {
      const p = ev as Extract<RespClinicalEvent, { kind: 'preoxygenate' }>;
      d.preox = { fio2: p.fio2, until: t + p.durationS };
      withdraw(replan(d, t, false, false));
      return true;
    }
    case 'condition': {
      const c = ev as { severity: number };
      rs.temp.mh = c.severity > 0 ? { severity: c.severity, t0: t } : null;
      return true;
    }
    case 'thermal': {
      const th = ev as Extract<RespClinicalEvent, { kind: 'thermal' }>;
      if (th.anaesthesia !== undefined) rs.temp.anaesthesia = th.anaesthesia;
      if (th.warming !== undefined) rs.temp.warming = th.warming;
      if (th.ambientC !== undefined) rs.temp.ta = th.ambientC;
      return true;
    }
    default:
      return false;
  }
}

```

- [ ] **Step 4: Run and verify** — same command; expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/l2/resp/pipeline.ts packages/engine-core/test/l2/resp/pipeline.test.ts
git commit -m "feat(resp): per-tick respiratory pipeline — 10 Hz gas, 1 Hz heat, 62.5 Hz co2/resp, L3, events, coupled truths" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Engine wiring, tone pitch, and the Stage 2 tests the driver changes

**Files:**
- Create: `packages/engine-core/test/helpers/resp.ts`, `packages/engine-core/test/engine/resp-engine.test.ts`
- Modify: `packages/engine-core/src/engine.ts` (10 additive edits; one existing line — the tone's `freqHz` — changes), `packages/engine-core/src/index.ts`, `packages/engine-core/test/engine/hemo-engine.test.ts` and `hemo-acceptance.test.ts` (exception (c))

**Interfaces:**
- Consumes: Task 15.
- Produces: `PipelineState.resp`; `advance()` runs `advanceResp` before `advanceHemo` and passes `u: (t) => respBreathU(resp, t)`; `co2`/`resp` 62.5 Hz buffers created on first write, `co2` dropped when the sensor is off; `validateRespCommand` runs BEFORE Stage 2's validation (attachSensor co2/temp); QRS tone `freqHz = spo2PitchHz(displayed SpO2)`. `@pme/engine-core` re-exports `types-resp.ts` and `spo2PitchHz`. Test helpers: `cmd`, `ev3`, `rig3`, `read62`, `stateSeries`, `numSeries`, `firstBelow`, `mean`, `capnoAngles`, `ADULT`, `vent`, `beatsIn`, `breaths`, `hemoOf`, `desatTime`.

- [ ] **Step 1: Write the failing test**

**Create `packages/engine-core/test/helpers/resp.ts`:**

```ts
// Test helpers for Stage 3 (respiratory, gas, temperature): engine set-up, 62.5 Hz reads, state/numeric series
// and the capnogram angle measurement (brief §4.4: α on a declared axis scale of 25 mmHg/s).
import { createEngine } from '../../src/engine.ts';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';
import type { ChannelId, Command, EngineEvent, MonitorEngine, NumericId, PatientProfile, StateVar } from '../../src/types.ts';

let seq = 0;
export function cmd(body: Record<string, unknown>): Command {
  return { id: `r${++seq}`, issuedBy: 'test', ...body } as Command;
}
export const ev3 = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });

export interface Rig3 {
  e: MonitorEngine;
  ev: EngineEvent[];
}

/** Engine with the capnograph on (sidestream unless `sampling`), every event recorded. */
export function rig3(opts: { seed?: number; patient?: PatientProfile; sampling?: 'sidestream' | 'mainstream'; hr?: number } = {}): Rig3 {
  const p = opts.patient ?? {};
  const e = createEngine({ seed: opts.seed ?? 7, patient: { ...p, baseline: { hr: opts.hr ?? 75, ...p.baseline }, sensors: { co2: 'on', ...p.sensors } } });
  if (opts.sampling) e.dispatch(cmd({ type: 'attachSensor', sensor: 'co2', state: 'on', sampling: opts.sampling }));
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return { e, ev };
}

/** Samples of a 62.5 Hz channel for sim times [t0, t1). */
export function read62(e: MonitorEngine, ch: ChannelId, t0: number, t1: number): Float32Array {
  const out = new Float32Array(Math.round((t1 - t0) * 62.5));
  e.readSamples(ch, Math.round(t0 * 62.5), out);
  return out;
}

/** [t, value] of one StateVar from the 1 Hz `state` events. */
export function stateSeries(ev: EngineEvent[], v: StateVar, t0 = -1, t1 = Infinity): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const x of ev) if (x.type === 'state' && x.t >= t0 && x.t <= t1 && x.values[v] !== undefined) out.push([x.t, x.values[v] as number]);
  return out;
}

/** [t, value] of one numeric (null values kept as NaN). */
export function numSeries(ev: EngineEvent[], id: NumericId, t0 = -1, t1 = Infinity): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const x of ev) {
    if (x.type !== 'measurement' || x.t < t0 || x.t > t1) continue;
    const m = x.values[id];
    if (m) out.push([x.t, m.value === null ? Number.NaN : m.value]);
  }
  return out;
}

export const firstBelow = (s: Array<[number, number]>, v: number): number | undefined => s.find(([, y]) => y < v)?.[0];
export const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Capnogram angles per expiration (research 03 §4.1): phase II slope between the 25 % and 75 % crossings of the
 * plateau-end value P, phase III slope by regression from the 90 % crossing + 0.2 s to the plateau end,
 * α = 180° − atan(s_II/25) + atan(s_III/25) on the 25 mmHg/s axis scale (brief §4.4). Also the phase III rise.
 */
export function capnoAngles(x: Float32Array, rate = 62.5): Array<{ alpha: number; riseIII: number; plateau: number }> {
  const out: Array<{ alpha: number; riseIII: number; plateau: number }> = [];
  let i = 0;
  const hi = Math.max(...x);
  const cross = (from: number, lvl: number) => {
    for (let k = from; k < x.length - 1; k++) if (x[k]! < lvl && x[k + 1]! >= lvl) return k + (lvl - x[k]!) / (x[k + 1]! - x[k]!);
    return -1;
  };
  while (i < x.length - 1) {
    const up = cross(i, 0.5 * hi); // an expiration upstroke
    if (up < 0) break;
    let dn = Math.ceil(up);
    while (dn < x.length - 1 && x[dn]! >= 0.5 * hi) dn++; // the inspiratory downstroke crosses 50 % here
    if (dn >= x.length - 2) break;
    let end = dn; // plateau end = the maximum of the last 0.5 s before the downstroke
    for (let k = Math.max(Math.ceil(up), dn - Math.round(0.5 * rate)); k < dn; k++) if (x[k]! >= x[end]!) end = k;
    let s = Math.floor(up);
    while (s > 0 && x[s - 1]! < x[s]!) s--; // the start of the upswing
    const P = x[end]!;
    const t25 = cross(s, 0.25 * P);
    const t75 = cross(s, 0.75 * P);
    const t90 = cross(s, 0.9 * P);
    const a = Math.ceil(t90 + 0.2 * rate);
    if (t25 > 0 && t75 > t25 && end - a > 10) {
      const sII = (0.5 * P) / ((t75 - t25) / rate);
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      const n = end - a + 1;
      for (let k = a; k <= end; k++) {
        const tt = k / rate;
        sx += tt; sy += x[k]!; sxx += tt * tt; sxy += tt * x[k]!;
      }
      const sIII = (n * sxy - sx * sy) / (n * sxx - sx * sx);
      const deg = (r: number) => (r * 180) / Math.PI;
      out.push({ alpha: 180 - deg(Math.atan(sII / 25)) + deg(Math.atan(sIII / 25)), riseIII: sIII * ((end - a) / rate), plateau: P });
    }
    i = dn + 1;
  }
  return out;
}

// --- shared by the Stage 3 acceptance files -------------------------------------------------------------
export const ADULT: PatientProfile = { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' };
export const vent = (rr = 12, vtMl = 500, fio2 = 0.5, peep = 5) => ev3({ kind: 'ventilation', source: 'ventilator', rr, vtMl, fio2, peep });
export type Beat = Extract<EngineEvent, { type: 'beat' }>;
export type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
export const beatsIn = (ev: EngineEvent[], t0: number, t1: number) => ev.filter((b): b is Beat => b.type === 'beat' && b.t > t0 && b.t < t1);
export const breaths = (ev: EngineEvent[], t0 = -1, t1 = Infinity) => ev.filter((x): x is Extract<EngineEvent, { type: 'breath' }> => x.type === 'breath' && x.t > t0 && x.t < t1);
export const hemoOf = (e: MonitorEngine) => (e.snapshot().state as { st: { hemo: HemoState } }).st.hemo;

/** Time of the apnoea desaturation to SaO2 < 90 % (s after the airway event), GA, optional preoxygenation. */
export function desatTime(p: PatientProfile, preox: boolean): number {
  const { e, ev } = rig3({ patient: p });
  e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
  if (preox) e.dispatch(ev3({ kind: 'preoxygenate', fio2: 1, durationS: 180 }));
  e.advanceTo(180);
  e.dispatch(ev3({ kind: 'airway', state: 'apnoea' }));
  e.advanceTo(180 + 900);
  return (firstBelow(stateSeries(ev, 'spo2', 180), 90) ?? Infinity) - 180;
}
```

**Create `packages/engine-core/test/engine/resp-engine.test.ts`:**

```ts
// Stage 3 engine wiring: 62.5 Hz channels by absolute index, command routing, events, snapshot round trip.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { cmd, ev3 } from '../helpers/resp.ts';

describe('engine + Stage 3 pipeline wiring', () => {
  it('co2 and resp run at 62.5 Hz with the 100 ms look-ahead (index 6 at creation); co2 off → no trace', () => {
    const e = createEngine({ seed: 1, patient: { sensors: { co2: 'on' } } });
    expect(e.sampleRate('co2')).toBe(62.5);
    expect(e.latestSampleIndex('co2')).toBe(6);
    expect(e.latestSampleIndex('resp')).toBe(6);
    e.advanceTo(10);
    expect(e.latestSampleIndex('co2')).toBe(631);
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'co2', state: 'off' }));
    e.advanceTo(10.1);
    expect(e.latestSampleIndex('co2')).toBe(-1);
    expect(createEngine({ seed: 1 }).latestSampleIndex('co2')).toBe(-1);
  });

  it('accepts the Stage 3 commands, rejects bad ones with a reason, and emits breath, lungState and the new numerics', () => {
    const e = createEngine({ seed: 2, patient: { sensors: { co2: 'on' } } });
    const got = new Set<string>();
    const nums = new Set<string>();
    e.on((x) => {
      got.add(x.type);
      if (x.type === 'measurement') for (const k of Object.keys(x.values)) nums.add(k);
    });
    expect(e.dispatch(ev3({ kind: 'ventilation', source: 'bvm', rr: 10, vtMl: 600, fio2: 1 })).accepted).toBe(true);
    expect(e.dispatch(ev3({ kind: 'airway', state: 'nowhere' })).accepted).toBe(false);
    expect(e.dispatch(cmd({ type: 'attachSensor', sensor: 'temp', state: 'on', site: 'rectal' })).accepted).toBe(true);
    expect(e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 92, ramp: { durationS: 10 } })).accepted).toBe(true);
    e.advanceTo(15);
    for (const t of ['breath', 'lungState', 'measurement', 'state']) expect(got.has(t)).toBe(true);
    for (const k of ['spo2', 'etco2', 'imco2', 'awrr', 'rr', 'tempCore', 'tempSite']) expect(nums.has(k)).toBe(true);
  });

  it('snapshot → JSON → restore reproduces the same co2 samples', () => {
    const a = createEngine({ seed: 3, patient: { sensors: { co2: 'on' } } });
    a.dispatch(ev3({ kind: 'airway', state: 'obstructed' }));
    a.advanceTo(20);
    const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = createEngine({ seed: 3, patient: { sensors: { co2: 'on' } } });
    b.restore(snap);
    a.advanceTo(30);
    b.advanceTo(30);
    const x = new Float32Array(300);
    const y = new Float32Array(300);
    a.readSamples('resp', 25 * 62.5, x);
    b.readSamples('resp', 25 * 62.5, y);
    expect(Array.from(y)).toEqual(Array.from(x));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-engine.test.ts`
Expected: FAIL — `latestSampleIndex('co2')` is −1 and `applyEvent airway` is rejected.

- [ ] **Step 3: Implement**

**Modify `packages/engine-core/src/engine.ts`** (1/10) — find:

```ts
import { HEMO_RATE } from './l2/hemo/params.ts'; // Stage 2

```

replace with:

```ts
import { HEMO_RATE } from './l2/hemo/params.ts'; // Stage 2
import {
  advanceResp,
  applyRespCommand,
  createRespState,
  respBreathU,
  RESP_RATE,
  validateRespCommand,
  type RespChannel,
  type RespState,
} from './l2/resp/pipeline.ts'; // Stage 3
import { spo2PitchHz } from './l3/spo2/spo2.ts'; // Stage 3

```

**Modify `packages/engine-core/src/engine.ts`** (2/10) — find:

```ts
  hemo: HemoState; // Stage 2: pressures, pleth, NIBP (brief §4.2–§4.5)
}
```

replace with:

```ts
  hemo: HemoState; // Stage 2: pressures, pleth, NIBP (brief §4.2–§4.5)
  resp: RespState; // Stage 3: breathing, gas exchange, SpO2/CO2/RR/temperature (brief §4.3–§4.7)
}
```

**Modify `packages/engine-core/src/engine.ts`** (3/10) — find:

```ts
      hemo: createHemoState(opts.patient, l1, hr0), // Stage 2
    };
```

replace with:

```ts
      hemo: createHemoState(opts.patient, l1, hr0), // Stage 2
      resp: createRespState(opts.patient, l1, this.seed), // Stage 3
    };
```

**Modify `packages/engine-core/src/engine.ts`** (4/10) — find:

```ts
    this.syncHemoBuffers(); // Stage 2
    for (const b of this.bufs.values()) b.clear(); // the discarded timeline's samples are not history (review M4)
```

replace with:

```ts
    this.syncHemoBuffers(); // Stage 2
    this.syncRespBuffers(); // Stage 3
    for (const b of this.bufs.values()) b.clear(); // the discarded timeline's samples are not history (review M4)
```

**Modify `packages/engine-core/src/engine.ts`** (5/10) — find:

```ts
      this.posted.set(id, { t, n: d.n });
      this.emit({ type: 'tone', t, id, kind: 'qrs', freqHz: QRS_TONE_HZ, refT });
    }
```

replace with:

```ts
      this.posted.set(id, { t, n: d.n });
      this.emit({ type: 'tone', t, id, kind: 'qrs', freqHz: spo2PitchHz(this.st.resp.num.spo2.shown), refT }); // Stage 3: pitch(SpO2)
    }
```

**Modify `packages/engine-core/src/engine.ts`** (6/10) — find:

```ts
    );
    advanceHemo(
      ps.hemo,
      { l1: ps.l1, hr: ps.hr, rhythm: ps.rhythm, rng: ps.rng, phi: ps.hrv.phi },
      Math.floor(end / 4),
```

replace with:

```ts
    );
    advanceResp(ps.resp, { l1: ps.l1, hemo: ps.hemo, rhythm: ps.rhythm, hr: ps.hr }, Math.floor(end / 8), (ch, m, v) => this.respWrite(ch, m, v)); // Stage 3
    const resp = ps.resp; // Stage 3
    advanceHemo(
      ps.hemo,
      { l1: ps.l1, hr: ps.hr, rhythm: ps.rhythm, rng: ps.rng, phi: ps.hrv.phi, u: (t) => respBreathU(resp, t) }, // Stage 3: u
      Math.floor(end / 4),
```

**Modify `packages/engine-core/src/engine.ts`** (7/10) — find:

```ts
    this.st.hemo.out = keep(this.st.hemo.out); // Stage 2
    due.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
```

replace with:

```ts
    this.st.hemo.out = keep(this.st.hemo.out); // Stage 2
    this.st.resp.out = keep(this.st.resp.out); // Stage 3
    due.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
```

**Modify `packages/engine-core/src/engine.ts`** (8/10) — find:

```ts
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    const hemo = validateHemoCommand(cmd, this.st.hemo); // Stage 2
```

replace with:

```ts
    if (cmd.atTick !== undefined && !(Number.isInteger(cmd.atTick) && cmd.atTick >= 0)) return 'atTick must be a whole tick ≥ 0';
    const resp = validateRespCommand(cmd); // Stage 3 (before Stage 2: attachSensor co2/temp)
    if (resp !== null) return resp;
    const hemo = validateHemoCommand(cmd, this.st.hemo); // Stage 2
```

**Modify `packages/engine-core/src/engine.ts`** (9/10) — find:

```ts
    };
    if (applyHemoCommand(ps.hemo, ps.l1, cmd, simT, setHr, ps.rng)) {
```

replace with:

```ts
    };
    if (applyRespCommand(ps.resp, ps.l1, cmd, simT)) {
      this.syncRespBuffers(); // Stage 3
      return;
    }
    if (applyHemoCommand(ps.hemo, ps.l1, cmd, simT, setHr, ps.rng)) {
```

**Modify `packages/engine-core/src/engine.ts`** (10/10) — find:

```ts

  /** Stage 2: a channel whose sensor is 'none' has no trace, so its buffer is dropped (brief §6.2). */
```

replace with:

```ts

  /** Stage 3: write one 62.5 Hz sample (co2, resp); the buffer is created on the first write. */
  private respWrite(ch: RespChannel, m: number, v: number): void {
    let b = this.bufs.get(ch);
    if (!b) {
      b = new RingBuffer(RESP_RATE, BUFFER_SECONDS);
      this.bufs.set(ch, b);
    }
    b.write(m, v);
  }

  /** Stage 3: the co2 sensor 'off' has no trace (brief §6.2). */
  private syncRespBuffers(): void {
    if (this.st.resp.co2Sensor === 'off') this.bufs.delete('co2');
  }

  /** Stage 2: a channel whose sensor is 'none' has no trace, so its buffer is dropped (brief §6.2). */
```

**Modify `packages/engine-core/src/index.ts`** (1/1) — find:

```ts
export * from './types-hemo.ts'; // Stage 2
```

replace with:

```ts
export * from './types-hemo.ts'; // Stage 2
export * from './types-resp.ts'; // Stage 3
export { spo2PitchHz } from './l3/spo2/spo2.ts'; // Stage 3
```

Stage 3 now owns `attachSensor co2` (the Stage 2 test expected "Stage 3"), and PPV now comes from the respiratory driver, so Stage 2's PPV test puts its patient on a ventilator at Stage 2's old clock rate (15/min):

**Modify `packages/engine-core/test/engine/hemo-engine.test.ts`** (1/1) — find:

```ts
    expect(r({ type: 'attachSensor', sensor: 'abp', state: 'plugged' }).accepted).toBe(false);
    expect(r({ type: 'attachSensor', sensor: 'co2', state: 'on' }).reason).toMatch(/Stage 3/);
    expect(r({ type: 'applyEvent', event: { kind: 'line', line: 'cvp', action: 'wedge' } }).accepted).toBe(false);
```

replace with:

```ts
    expect(r({ type: 'attachSensor', sensor: 'abp', state: 'plugged' }).accepted).toBe(false);
    expect(r({ type: 'attachSensor', sensor: 'ecg', state: 'off' }).reason).toMatch(/Stage 4/); // Stage 3 took co2/temp
    expect(r({ type: 'applyEvent', event: { kind: 'line', line: 'cvp', action: 'wedge' } }).accepted).toBe(false);
```

**Modify `packages/engine-core/test/engine/hemo-acceptance.test.ts`** (1/1) — find:

```ts
      const { e, ev } = rig({ seed: 11, hrv: false });
      e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: volumeStatusForGHyp(g) }));
```

replace with:

```ts
      const { e, ev } = rig({ seed: 11, hrv: false });
      // Stage 3: PPV is an index of the MECHANICALLY ventilated patient; the respiratory driver now supplies the breath
      e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 15, vtMl: 500, peep: 5 } }));
      e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: volumeStatusForGHyp(g) }));
```

- [ ] **Step 4: Run and verify**

Run: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine`
Expected: typecheck clean; every engine test passes, including all of Stage 2's (prototype: PPV 6.9 % / 22.5 % through the driver) — the 24 h tests take ≈ 70 s each.

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/engine.ts packages/engine-core/src/index.ts packages/engine-core/test/helpers/resp.ts packages/engine-core/test/engine/resp-engine.test.ts packages/engine-core/test/engine/hemo-engine.test.ts packages/engine-core/test/engine/hemo-acceptance.test.ts
git commit -m "feat(engine-core): wire the respiratory pipeline before the haemodynamics, 62.5 Hz buffers, pitch(SpO2) tone" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: Acceptance — capnogram shape, sampling, pattern library

**Files:**
- Create: `packages/engine-core/test/engine/resp-capnogram.test.ts`

**Interfaces:** consumes the Task 16 helpers (`capnoAngles` measures α on the 25 mmHg/s axis: phase II slope between the 25 % and 75 % crossings of the plateau-end value, phase III by regression from the 90 % crossing + 0.2 s).

- [ ] **Step 1: Write the test** (BUILD-PLAN acceptance 1–2; decisions 5, 6, 16)

**Create `packages/engine-core/test/engine/resp-capnogram.test.ts`:**

```ts
// BUILD-PLAN Stage 3 acceptance 1–2 (capnogram shape, sampling, pattern library) at engine level.
import { describe, expect, it } from 'vitest';
import { ADULT, breaths, capnoAngles, ev3, mean, numSeries, read62, rig3, vent } from '../helpers/resp.ts';

describe('Stage 3 acceptance: capnogram', { timeout: 30_000 }, () => {
  it('1. α 100–110° normally and ≥ 120° in bronchospasm (25 mmHg/s axis), phase III +1–3 mmHg', () => {
    const { e } = rig3({ patient: ADULT });
    e.dispatch(vent());
    e.advanceTo(60);
    const n = capnoAngles(read62(e, 'co2', 20, 60));
    expect(n.length).toBeGreaterThanOrEqual(6);
    for (const b of n) {
      expect(b.alpha).toBeGreaterThanOrEqual(100);
      expect(b.alpha).toBeLessThanOrEqual(110);
      expect(b.riseIII).toBeGreaterThanOrEqual(1);
      expect(b.riseIII).toBeLessThanOrEqual(3);
    }
    e.dispatch(ev3({ kind: 'airway', state: 'bronchospasm', severity: 1 }));
    e.advanceTo(120);
    const b = capnoAngles(read62(e, 'co2', 80, 120));
    expect(mean(b.map((x) => x.alpha))).toBeGreaterThanOrEqual(120);
  });

  it('2. sidestream: the trace is 2.3 ± 0.1 s behind the breath; at RR 60 sidestream reads below mainstream (≥ 0.5 mmHg)', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(vent(12));
    e.advanceTo(60);
    const x = read62(e, 'co2', 0, 60);
    const lags: number[] = [];
    for (const b of breaths(ev, 20, 55)) {
      const k0 = Math.round((b.t + 1.5) * 62.5);
      const plateau = x[k0]!;
      let k = k0;
      while (x[k]! > 0.9 * plateau) k++;
      lags.push(k / 62.5 - b.t);
    }
    expect(Math.min(...lags)).toBeGreaterThanOrEqual(2.2);
    expect(Math.max(...lags)).toBeLessThanOrEqual(2.4);
    const peak = (s: 'sidestream' | 'mainstream') => {
      const r = rig3({ patient: { ageY: 0.05, weightKg: 3.5 }, sampling: s });
      r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 60, vtMl: 25, fio2: 0.4, peep: 5, ie: 1.5 }));
      r.e.advanceTo(40);
      const x = read62(r.e, 'co2', 20, 40);
      const p: number[] = [];
      for (let k = 0; k + 62 < x.length; k += 62) p.push(Math.max(...x.subarray(k, k + 62))); // one breath per second
      return mean(p);
    };
    expect(peak('mainstream') - peak('sidestream')).toBeGreaterThanOrEqual(0.5); // plan decision 5: not the > 3 mmHg of BUILD-PLAN
  });

  it('1c. oesophageal intubation: fewer than 6 breaths of decreasing height, then flat', () => {
    const { e } = rig3({ patient: ADULT, sampling: 'mainstream' });
    e.dispatch(vent(12));
    e.advanceTo(30);
    e.dispatch(ev3({ kind: 'airway', state: 'oesophageal' }));
    e.advanceTo(97);
    const x = read62(e, 'co2', 36, 96); // 5 s windows holding one whole expiration each (cycles restart at 35 s)
    const peaks: number[] = [];
    for (let k = 0; k < 12; k++) peaks.push(Math.max(...x.subarray(Math.round(k * 5 * 62.5), Math.round((k + 1) * 5 * 62.5))));
    const visible = peaks.filter((p) => p > 1);
    expect(visible.length).toBeGreaterThanOrEqual(3);
    expect(visible.length).toBeLessThan(6);
    for (let i = 1; i < visible.length; i++) expect(visible[i]!).toBeLessThan(visible[i - 1]!);
    expect(Math.max(...peaks.slice(7))).toBeLessThan(1);
  });

  it('1d. rebreathing raises the inspiratory baseline (FiCO2) and curare-cleft effort notches the plateau', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fico2: 6 }));
    e.advanceTo(40);
    const fi = numSeries(ev, 'imco2', 30, 40).map(([, v]) => v);
    expect(Math.min(...fi)).toBeGreaterThanOrEqual(5);
    const r = rig3({ patient: ADULT, sampling: 'mainstream' });
    r.e.dispatch(ev3({ kind: 'ventilation', source: 'ventilator', rr: 8, vtMl: 500, effort: 0.6 }));
    r.e.advanceTo(40);
    const x = read62(r.e, 'co2', 20, 40);
    let notch = 0; // deepest dip below the running plateau
    for (let k = 20; k < x.length; k++) if (x[k - 20]! > 25 && x[k]! > 5) notch = Math.max(notch, x[k - 20]! - x[k]!);
    expect(notch).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-capnogram.test.ts`
Expected: 4 tests pass (the behaviour was built in Tasks 8–16; this task pins it). Prototype: α 105.6° normal, 157° bronchospasm; lag 2.33–2.35 s. If one fails, fix the module the failure points to (`capno.ts` shape constants, `driver.ts` airway rules) — never widen a band.

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/resp-capnogram.test.ts
git commit -m "test(co2): stage 3 acceptance 1–2 (α angle, phase III, sidestream delay, RR 60, oesophageal, rebreathing, cleft)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Acceptance — airway loss, apnoea detection, accumulated CO2 (M4)

**Files:**
- Create: `packages/engine-core/test/engine/resp-airway.test.ts`

- [ ] **Step 1: Write the test** (BUILD-PLAN acceptance 3; brief M4)

**Create `packages/engine-core/test/engine/resp-airway.test.ts`:**

```ts
// BUILD-PLAN Stage 3 acceptance 3–4 (airway loss, apnoea detection, M4 accumulated CO2) at engine level.
import { describe, expect, it } from 'vitest';
import { ADULT, breaths, cmd, ev3, mean, numSeries, read62, rig3, vent, type Alarm } from '../helpers/resp.ts';

describe('Stage 3 acceptance: airway loss, apnoea and CO2 kinetics', { timeout: 30_000 }, () => {
  it('3. disconnection: breath events stop, the capnogram is flat within one breath, awRR apnoea at 20 ± 1 s', () => {
    const { e, ev } = rig3({ patient: ADULT, sampling: 'mainstream' });
    e.dispatch(vent(12));
    e.advanceTo(60);
    const t0 = e.now().simT;
    e.dispatch(ev3({ kind: 'airway', state: 'disconnected' }));
    e.advanceTo(t0 + 40);
    expect(breaths(ev, t0 + 0.05)).toHaveLength(0);
    const flat = read62(e, 'co2', t0 + 5, t0 + 40);
    expect(Math.max(...flat)).toBeLessThan(1);
    const x = read62(e, 'co2', t0 - 10, t0 + 5);
    let lastEdge = -1;
    for (let k = 1; k < x.length; k++) if (x[k - 1]! < 20 && x[k]! >= 20) lastEdge = t0 - 10 + k / 62.5;
    const alarm = ev.find((a): a is Alarm => a.type === 'alarm' && a.id === 'apnoea-co2' && a.state === 'raised' && a.t > t0);
    expect(alarm).toBeDefined();
    expect(alarm!.t - lastEdge).toBeGreaterThanOrEqual(19.9);
    expect(alarm!.t - lastEdge).toBeLessThanOrEqual(21);
  });

  it('4. M4: the first breath after 60 s of apnoea shows the accumulated CO2 (+9–15 mmHg)', () => {
    const { e, ev } = rig3({ patient: ADULT, sampling: 'mainstream' });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    e.dispatch(cmd({ type: 'setTarget', variable: 'etco2', value: 37 })); // a steady state on these settings
    e.advanceTo(120);
    const before = mean(numSeries(ev, 'etco2', 100, 120).map(([, v]) => v));
    e.dispatch(ev3({ kind: 'airway', state: 'disconnected' }));
    e.advanceTo(180);
    e.dispatch(ev3({ kind: 'airway', state: 'patent' }));
    e.advanceTo(192);
    const first = Math.max(...read62(e, 'co2', 180, 190.5)); // the first breath (it starts at the next 5 s cycle)
    expect(first - before).toBeGreaterThanOrEqual(9);
    expect(first - before).toBeLessThanOrEqual(15);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-airway.test.ts`
Expected: 2 tests pass (prototype: no breath event after the disconnection, trace < 1 mmHg from +5 s, apnoea alarm 20.0 s after the last displayed breath; first breath after 60 s +9.3 mmHg).

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/resp-airway.test.ts
git commit -m "test(resp): stage 3 acceptance 3–4 (airway loss, apnoea at 20 s, first breath after apnoea)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: Acceptance — O2 store (Benumof, Patel) and the R8 lag structure

**Files:**
- Create: `packages/engine-core/test/engine/resp-oxygen.test.ts`

- [ ] **Step 1: Write the test** (BUILD-PLAN acceptance 5–6; R8; brief §4.3 arrest and cuff; decision 4)

**Create `packages/engine-core/test/engine/resp-oxygen.test.ts`:**

```ts
// BUILD-PLAN Stage 3 acceptance 5–6 (O2 store: Benumof, Patel; the R8 SpO2 lag structure) and the SpO2
// validity rules (pulseless, low PI, same-limb cuff) at engine level.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, cmd, desatTime, ev3, numSeries, rig3, stateSeries } from '../helpers/resp.ts';

describe('Stage 3 acceptance: O2 store (Benumof, Patel) and the R8 lag structure', { timeout: 30_000 }, () => {
  it('5. preoxygenated healthy 70 kg adult: SaO2 90 % at 8 ± 1.5 min of apnoea', () => {
    const t = desatTime(ADULT, true) / 60;
    expect(t).toBeGreaterThanOrEqual(6.5);
    expect(t).toBeLessThanOrEqual(9.5);
  });

  it('5b. room air: 90 % within 2 min (model: ≈ 0.7 min, see plan decision 4); children 2–5 y 160 ± 30 s; obese 127 kg ≈ 2.7 min', () => {
    const room = desatTime(ADULT, false);
    expect(room).toBeGreaterThanOrEqual(30);
    expect(room).toBeLessThanOrEqual(120);
    const child = desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true);
    expect(child).toBeGreaterThanOrEqual(130);
    expect(child).toBeLessThanOrEqual(190);
    const obese = desatTime({ ageY: 40, weightKg: 127, heightCm: 175, sex: 'M' }, true) / 60;
    expect(obese).toBeGreaterThanOrEqual(1.7);
    expect(obese).toBeLessThanOrEqual(3.7);
  });

  it('6. R8: EtCO2 vanishes at once on airway loss while SpO2 is still normal; displayed SpO2 KEEPS FALLING 10–30 s after ventilation resumes', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.advanceTo(60);
    e.dispatch(ev3({ kind: 'airway', state: 'obstructed' }));
    e.advanceTo(75);
    expect(numSeries(ev, 'etco2', 74, 75)[0]![1]).toBeLessThan(5); // gone (sidestream + 10 s window)
    expect(numSeries(ev, 'spo2', 74, 75)[0]![1]).toBeGreaterThanOrEqual(94);
    let tRestore = 0;
    for (let t = 76; t < 400; t++) {
      e.advanceTo(t);
      const sa = stateSeries(ev, 'spo2', t - 1.01).pop();
      if (sa && sa[1] <= 85) {
        tRestore = t;
        break;
      }
    }
    expect(tRestore).toBeGreaterThan(0);
    e.dispatch(ev3({ kind: 'airway', state: 'patent' }));
    e.dispatch(ev3({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 600, fio2: 1 }));
    e.advanceTo(tRestore + 90);
    const shown = numSeries(ev, 'spo2', tRestore, tRestore + 90).filter(([, v]) => Number.isFinite(v));
    const minAt = shown.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
    expect(minAt - tRestore).toBeGreaterThanOrEqual(10);
    expect(minAt - tRestore).toBeLessThanOrEqual(30);
    expect(shown[shown.length - 1]![1]).toBeGreaterThan(90); // and then it recovers
  });

  it('6b. finger dead time at normal CO: displayed SpO2 lags a SaO2 step by 15 ± 3 s plus the averaging; site step → 90 % shown ≤ 20 s', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.advanceTo(60);
    const t0 = e.now().simT;
    const base = numSeries(ev, 'spo2', t0 - 1, t0)[0]![1];
    e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 85 }));
    e.advanceTo(t0 + 60);
    const shown = numSeries(ev, 'spo2', t0, t0 + 60);
    const firstMove = shown.find(([, v]) => v <= base - 1)![0] - t0; // dead time 15 s + lag + the start of the average
    expect(firstMove).toBeGreaterThanOrEqual(12);
    expect(firstMove).toBeLessThanOrEqual(18 + 4);
    const final = numSeries(ev, 'spo2', t0 + 55, t0 + 60)[0]![1];
    const t90 = shown.find(([, v]) => v <= base - 0.9 * (base - final))![0] - t0;
    expect(t90 - 15).toBeLessThanOrEqual(20);
  });

  it('9a. pulseless (VF): SpO2 is invalid within 10–30 s; low PI flags it questionable', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }));
    e.advanceTo(70);
    const inv = numSeries(ev, 'spo2', 30, 70).find(([, v]) => Number.isNaN(v));
    expect(inv).toBeDefined();
    expect(inv![0] - 30).toBeGreaterThanOrEqual(10);
    expect(inv![0] - 30).toBeLessThanOrEqual(30);
    const r = rig3({ patient: ADULT });
    r.e.dispatch(cmd({ type: 'setTarget', variable: 'pi', value: 0.2 }));
    r.e.advanceTo(40);
    const last = r.ev.filter((x) => x.type === 'measurement' && x.values.spo2).pop() as Extract<EngineEvent, { type: 'measurement' }>;
    expect(last.values.spo2!.flag).toBe('questionable');
  });

  it('9b. a same-limb NIBP cuff flattens the pleth but SpO2 holds its value (valid) through the cycle', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(cmd({ type: 'attachSensor', sensor: 'nibp', state: 'on', site: 'leftArm' }));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'start' } }));
    e.advanceTo(75);
    const sp = numSeries(ev, 'spo2', 30, 75);
    expect(sp.every(([, v]) => v >= 95 && v <= 99)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-oxygen.test.ts`
Expected: 6 tests pass. Prototype: 501 s preoxygenated adult, 41 s room air, 158 s child, 170 s obese; R8: displayed SpO2 lowest 20 s after the rescue; SpO2 first moves 18 s after a SaO2 step; VF invalid at 11 s.

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/resp-oxygen.test.ts
git commit -m "test(gas): stage 3 acceptance 5–6 (Benumof/Patel desaturation, SpO2 keeps falling after rescue, dead time, pulseless, cuff hold)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: Acceptance — coupling, RR three ways, ventilator link, lungState, tone, MH

**Files:**
- Create: `packages/engine-core/test/engine/resp-coupling.test.ts`

- [ ] **Step 1: Write the test** (brief M6, §4.7, §7.6; R27; BUILD-PLAN acceptance 8–9; decisions 1, 7, 13, 14, 15)

**Create `packages/engine-core/test/engine/resp-coupling.test.ts`:**

```ts
// Stage 3 coupling (M6 PPV through the driver), RR three ways, the R27 ventilator link and lungState, the
// SpO2 tone pitch and MH at engine level.
import { describe, expect, it } from 'vitest';
import { cardiacOutput } from '../../src/l2/gas/coupling.ts';
import { plethRr } from '../../src/l3/resp/impedance.ts';
import type { EngineEvent } from '../../src/types.ts';
import { ADULT, beatsIn, breaths, cmd, ev3, hemoOf, mean, numSeries, rig3, stateSeries, vent } from '../helpers/resp.ts';

describe('Stage 3 acceptance: respiratory coupling, RR, ventilator link', { timeout: 30_000 }, () => {
  it('M6: PPV through the respiratory driver — ventilated 5–10 % (g 0.05) and 15–30 % (g 0.2); spontaneous is smaller', () => {
    const ppv = (g: number, ventilated: boolean) => {
      const { e, ev } = rig3({ patient: { ...ADULT, sensors: { abp: 'connected' } } });
      if (ventilated) e.dispatch(vent(15, 500, 0.5, 5));
      e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
      e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: 1 - (g - 0.04) / 0.21 }));
      e.advanceTo(70);
      const abp = new Float32Array(Math.round(70 * 125));
      e.readSamples('abp', 0, abp);
      const pp = beatsIn(ev, 30, 68).map((b) => {
        const w = abp.subarray(Math.round(b.t * 125), Math.round((b.t + 0.8) * 125));
        return { t: b.t, pp: Math.max(...w) - Math.min(...w) };
      });
      const out: number[] = [];
      for (let t0 = 32; t0 + 4 <= 66; t0 += 4) {
        const s = pp.filter((x) => x.t >= t0 && x.t < t0 + 4).map((x) => x.pp);
        out.push((100 * (Math.max(...s) - Math.min(...s))) / ((Math.max(...s) + Math.min(...s)) / 2));
      }
      return mean(out);
    };
    const lo = ppv(0.05, true);
    const hi = ppv(0.2, true);
    expect(lo).toBeGreaterThanOrEqual(5);
    expect(lo).toBeLessThanOrEqual(10);
    expect(hi).toBeGreaterThanOrEqual(15);
    expect(hi).toBeLessThanOrEqual(30);
    expect(ppv(0.2, false)).toBeLessThan(hi);
  });

  it('RR three ways (impedance, capnogram, pleth) agree within 1/min in sinus on a ventilator at 14/min', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(vent(14, 500, 0.5, 5));
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
    e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: 0.5 }));
    e.advanceTo(120);
    const aw = mean(numSeries(ev, 'awrr', 100, 120).map(([, v]) => v));
    const imp = mean(numSeries(ev, 'rr', 100, 120).map(([, v]) => v));
    const pl = new Float32Array(Math.round(120 * 125));
    e.readSamples('pleth', 0, pl);
    const beats = beatsIn(ev, 55, 118).map((b) => {
      const w = pl.subarray(Math.round((b.t + 0.1) * 125), Math.round((b.t + 0.6) * 125));
      return { t: b.t, amp: Math.max(...w) - Math.min(...w) };
    });
    const pr = plethRr(beats, 118)!;
    for (const v of [aw, imp, pr]) expect(Math.abs(v - 14)).toBeLessThanOrEqual(1);
  });

  it('M5/obstruction: impedance keeps counting chest efforts (obstructive apnoea missed) while the capnograph alarms', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.advanceTo(30);
    e.dispatch(ev3({ kind: 'airway', state: 'obstructed' }));
    e.advanceTo(80);
    expect(ev.some((a) => a.type === 'alarm' && a.id === 'apnoea-co2' && a.state === 'raised' && a.t > 30)).toBe(true);
    expect(ev.some((a) => a.type === 'alarm' && a.id === 'apnoea-resp' && a.state === 'raised' && a.t > 30)).toBe(false);
    expect(mean(numSeries(ev, 'rr', 70, 80).map(([, v]) => v))).toBeGreaterThan(10);
  });

  it('8. ventilator link: a 50 Hz VentFrame stream (RR 12, VT 500, FiO2 0.4, PEEP 5) → 12 ± 0.5 breaths/min, EtCO2/SpO2 steady; PEEP 15 lowers CO and MAP, raises CVP', () => {
    const { e, ev } = rig3({ patient: { ...ADULT, sensors: { abp: 'connected', cvp: 'connected' } } });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    let peep = 5;
    let vt = 500;
    const frameAt = (t: number) => {
      const T = 5;
      const ti = 1.6;
      const u = t % T;
      const C = 50;
      const flow = u < ti ? vt / 1000 / ti : -((vt / 1000) / 0.5) * Math.exp(-(u - ti) / 0.5);
      const vol = u < ti ? (vt * u) / ti : vt * Math.exp(-(u - ti) / 0.5);
      return { pawCmH2O: peep + vol / C + (u < ti ? 10 * flow : 0), flowLps: flow, volumeMl: vol, fio2: 0.4, peepCmH2O: peep };
    };
    const drive = (until: number) => {
      for (let t = e.now().simT + 0.02; t <= until + 1e-9; t += 0.02) {
        e.dispatch(cmd({ type: 'externalDrive', source: 'ventilator', frame: frameAt(t) }));
        e.advanceTo(t);
      }
    };
    drive(600);
    const n = breaths(ev, 300, 600).length / 5;
    expect(Math.abs(n - 12)).toBeLessThanOrEqual(0.5);
    const et = numSeries(ev, 'etco2', 540, 600).map(([, v]) => v);
    expect(Math.max(...et) - Math.min(...et)).toBeLessThanOrEqual(2);
    expect(Math.abs(mean(et) - mean(stateSeries(ev, 'etco2', 540, 600).map(([, v]) => v)))).toBeLessThanOrEqual(2);
    expect(Math.min(...numSeries(ev, 'spo2', 540, 600).map(([, v]) => v))).toBeGreaterThanOrEqual(97);
    const co5 = cardiacOutput(hemoOf(e), e.now().simT);
    const map5 = mean(numSeries(ev, 'abpMean', 560, 600).map(([, v]) => v));
    const cvp5 = mean(numSeries(ev, 'cvpMean', 560, 600).map(([, v]) => v));
    peep = 15;
    drive(720);
    const co15 = cardiacOutput(hemoOf(e), e.now().simT);
    const map15 = mean(numSeries(ev, 'abpMean', 680, 720).map(([, v]) => v));
    const cvp15 = mean(numSeries(ev, 'cvpMean', 680, 720).map(([, v]) => v));
    expect(co15).toBeLessThan(0.92 * co5);
    expect(map15).toBeLessThan(map5 - 5);
    expect(cvp15 - cvp5).toBeGreaterThanOrEqual(0.3 * 0.7356 * 8);
    expect(cvp15 - cvp5).toBeLessThanOrEqual(0.5 * 0.7356 * 10);
    // CVP respiratory swing follows the drive's pressure swing
    const swing = (t0: number) => { // respiratory swing of the 1 s moving average (removes the a/c/v waves)
      const x = new Float32Array(11 * 125);
      e.readSamples('cvp', Math.round(t0 * 125), x);
      const avg: number[] = [];
      for (let k = 0; k + 125 <= x.length; k += 5) avg.push(x.subarray(k, k + 125).reduce((a, b) => a + b, 0) / 125);
      return Math.max(...avg) - Math.min(...avg);
    };
    const s500 = swing(705);
    vt = 800;
    drive(780);
    expect(swing(765)).toBeGreaterThan(1.3 * s500);
  }, 60_000); // 39 000 frames, each a dispatch + a tick with its look-ahead

  it('R27: lungState at start from the profile, again on bronchospasm (resistance ×4, auto-PEEP tendency)', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.advanceTo(1);
    const ls = ev.filter((x): x is Extract<EngineEvent, { type: 'lungState' }> => x.type === 'lungState');
    expect(ls[0]).toMatchObject({ t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 1, autoPeepTendency: 0 });
    expect(ls[0]!.frcMl).toBeGreaterThan(2000);
    e.dispatch(ev3({ kind: 'airway', state: 'bronchospasm', severity: 1 }));
    e.advanceTo(2);
    const b = ev.filter((x): x is Extract<EngineEvent, { type: 'lungState' }> => x.type === 'lungState').pop()!;
    expect(b.resistanceCmH2OPerLps).toBe(40);
    expect(b.autoPeepTendency).toBeGreaterThan(0.5);
  });

  it('9. tone: the QRS beep pitch follows the displayed SpO2 (90 % → 830.6 Hz ± 1)', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(cmd({ type: 'setTarget', variable: 'spo2', value: 89.5 }));
    for (let t = 80; t <= 90; t += 0.02) e.advanceTo(t); // tones are posted from the look-ahead of each tick
    const sp = numSeries(ev, 'spo2', 85, 90).pop()![1];
    const tone = ev.filter((x) => x.type === 'tone' && x.t > 88).pop() as Extract<EngineEvent, { type: 'tone' }>;
    expect(tone.freqHz).toBeCloseTo(880 * 2 ** (-(100 - sp) * 0.1 / 12), 3);
    if (sp === 90) expect(Math.abs(tone.freqHz! - 830.6)).toBeLessThanOrEqual(1);
  });

  it('MH: VCO2 climbs, so EtCO2 rises at a fixed ventilation, and the core temperature rises', () => {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.dispatch(vent(12));
    e.advanceTo(300);
    e.dispatch(ev3({ kind: 'condition', id: 'mh', severity: 1 }));
    e.advanceTo(300 + 30 * 60);
    const et0 = mean(numSeries(ev, 'etco2', 280, 300).map(([, v]) => v));
    const et1 = mean(numSeries(ev, 'etco2', 2080, 2100).map(([, v]) => v));
    expect(et1 - et0).toBeGreaterThan(20);
    expect(et1).toBeLessThan(150); // the schema limit (brief §4.9)
    const tc = stateSeries(ev, 'tempCore');
    expect(tc[tc.length - 1]![1] - tc.find(([t]) => t >= 300)![1]).toBeGreaterThan(1.0); // the rate: l2/temp test
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-coupling.test.ts`
Expected: 7 tests pass; the ventilator-link test takes ≈ 15 s (39 000 frames, each a dispatch plus a tick with its look-ahead).

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/resp-coupling.test.ts
git commit -m "test(resp): PPV through the driver, RR three ways, VentFrame link with PEEP → CO/MAP/CVP, lungState, pitch, MH" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: Determinism hash and 24 h no-drift at 62.5 Hz

**Files:**
- Create: `packages/engine-core/test/engine/resp-longrun.test.ts`

- [ ] **Step 1: Write the test**

**Create `packages/engine-core/test/engine/resp-longrun.test.ts`:**

```ts
// Stage 3 determinism (brief §3.3: same seed + commands → same samples) and 62.5 Hz no-drift over 24 h.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { Command } from '../../src/types.ts';
import { cmd, ev3 } from '../helpers/resp.ts';

describe('Stage 3 determinism and drift', () => {
  it('same seed + same commands → identical SHA-256 over 60 s of co2, resp, pleth and abp; another seed differs', () => {
    const script: Array<[number, Command]> = [
      [5, ev3({ kind: 'preoxygenate', fio2: 1, durationS: 20 })],
      [15, ev3({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 550, fio2: 0.6, peep: 8 })],
      [25, ev3({ kind: 'airway', state: 'bronchospasm', severity: 0.7 })],
      [35, ev3({ kind: 'airway', state: 'disconnected' })],
      [45, ev3({ kind: 'airway', state: 'patent' })],
      [50, cmd({ type: 'setTarget', variable: 'spo2', value: 92, ramp: { durationS: 5 } })],
    ];
    const run = (seed: number) => {
      const e = createEngine({ seed, patient: { sensors: { co2: 'on', abp: 'connected' } } });
      const h = createHash('sha256');
      const from = { co2: 0, resp: 0, pleth: 0, abp: 0 };
      for (let t = 0.5; t <= 60 + 1e-9; t += 0.5) {
        for (const [at, c] of script) if (Math.abs(at - t) < 1e-9) e.dispatch(c);
        e.advanceTo(t);
        for (const ch of ['co2', 'resp', 'pleth', 'abp'] as const) {
          const to = Math.round(t * (ch === 'co2' || ch === 'resp' ? 62.5 : 125));
          const out = new Float32Array(to - from[ch] + 1);
          expect(e.readSamples(ch, from[ch], out)).toBe(out.length);
          h.update(out);
          from[ch] = to + 1;
        }
      }
      return h.digest('hex');
    };
    expect(run(42)).toBe(run(42));
    expect(run(42)).not.toBe(run(43));
  });

  it('no drift at 62.5 Hz: after advanceTo(86400) latestSampleIndex(co2) = latestSampleIndex(resp) = 5,400,000 + 6', { timeout: 300_000 }, async () => {
    const e = createEngine({ seed: 11, patient: { sensors: { co2: 'on' } } });
    // one sim-hour at a time, yielding between chunks (main's CI pattern: a synchronous 24 h run starves the
    // Vitest worker RPC on a 2-vCPU runner)
    for (let h = 1; h <= 24; h++) {
      e.advanceTo(h * 3_600);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(e.latestSampleIndex('co2')).toBe(5_400_000 + 6);
    expect(e.latestSampleIndex('resp')).toBe(5_400_000 + 6);
    expect(e.latestSampleIndex('ecgII')).toBe(43_200_000 + 50);
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/resp-longrun.test.ts`
Expected: 2 tests pass; the 24 h test takes ≈ 70 s.

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/test/engine/resp-longrun.test.ts
git commit -m "test(resp): determinism hash over co2/resp/pleth/abp and 24 h no-drift at 62.5 Hz" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 22: Renderer — CO2 and RESP lanes, SpO2/EtCO2/RR/TEMP tiles

**Files:**
- Create: `packages/renderer/src/numerics-resp.ts`, `packages/renderer/test/numerics-resp.test.ts`
- Modify: `packages/renderer/src/wave-lanes.ts`, `packages/renderer/src/monitor-core.ts` (auto-scale generalised to every range-less lane; lane rate and sweep from the style), `packages/renderer/src/mount.ts`, `packages/renderer/src/index.ts`

**Interfaces:**
- Produces: `WaveLaneId` gains `'co2' | 'resp'`; `WaveStyle.rate?: 125 | 62.5`, `WaveStyle.mmPerS?`; `WAVE_STYLE.co2` (yellow `#f0f030`, 0–50 mmHg, 62.5 Hz, 6.25 mm/s), `WAVE_STYLE.resp` (yellow, auto-scaled over 10 s); `formatSpo2`, `formatEtco2`, `formatRr`, `formatTemp`; `MountOptions.temp?: boolean`. Tiles appear with their lanes: SpO2 (+PI, LOW PERF / NO PULSE) with `pleth`, EtCO2 (+FiCO2, awRR) with `co2`, RR with `resp`, TEMP (T1/T2) with `temp: true`.

- [ ] **Step 1: Write the failing test**

**Create `packages/renderer/test/numerics-resp.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';
import { formatEtco2, formatRr, formatSpo2, formatTemp } from '../src/numerics-resp.ts';
import { WAVE_STYLE } from '../src/wave-lanes.ts';

const v = (value: number | null, flag: 'valid' | 'questionable' | 'invalid' = 'valid') => ({ value, flag, at: 1 });

describe('numerics-resp formatters (brief §6.1) and Stage 3 lanes', () => {
  it('SpO2 with PI, questionable mark, LOW PERF and NO PULSE', () => {
    expect(formatSpo2(v(97), v(2.14))).toEqual({ main: '97', sub: 'PI 2.1', status: '' });
    expect(formatSpo2(v(95, 'questionable'), v(0.21))).toEqual({ main: '95?', sub: 'PI 0.21', status: 'LOW PERF' });
    expect(formatSpo2(v(null, 'invalid'), undefined)).toEqual({ main: '-?-', sub: 'PI ---', status: 'NO PULSE' });
  });
  it('EtCO2 / FiCO2 / awRR with APNEA; RR; temperature T1/T2', () => {
    expect(formatEtco2(v(36.4), v(0), v(12))).toEqual({ main: '36', sub: 'FiCO2 0', status: 'awRR 12' });
    expect(formatEtco2(v(0), v(0), v(0)).status).toBe('awRR 0  APNEA');
    expect(formatEtco2(v(null, 'invalid'), v(null, 'invalid'), v(null, 'invalid'))).toEqual({ main: '---', sub: 'FiCO2 --', status: 'awRR --' });
    expect(formatRr(v(0))).toEqual({ main: '0', status: 'APNEA' });
    expect(formatTemp(v(36.84), v(36.3))).toEqual({ main: '36.8', sub: 'T2 36.3' });
  });
  it('CO2 and RESP lanes run at 62.5 Hz and 6.25 mm/s; CO2 is 0–50 mmHg yellow', () => {
    expect(WAVE_STYLE.co2).toMatchObject({ range: [0, 50], rate: 62.5, mmPerS: 6.25 });
    expect(WAVE_STYLE.resp).toMatchObject({ range: null, rate: 62.5, mmPerS: 6.25 });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run test/numerics-resp.test.ts`
Expected: FAIL — cannot find `src/numerics-resp.ts`.

- [ ] **Step 3: Implement**

**Create `packages/renderer/src/numerics-resp.ts`:**

```ts
// Stage 3 numeric tiles (brief §6.1, §6.8): SpO2 with PI, EtCO2 with FiCO2 and awRR, RR (impedance) and
// temperature T1/T2. Pure formatters are exported for tests (Node has no DOM); the tiles reuse PressureTile.
import type { Measured } from '@pme/engine-core';

const ok = (m: Measured | undefined): m is Measured & { value: number } => !!m && m.value !== null && m.flag !== 'invalid';

/** SpO2: "97", "97?" when questionable (low perfusion, motion, CPR); "-?-" when invalid (saadat-like, brief §6.1). */
export function formatSpo2(spo2: Measured | undefined, pi: Measured | undefined): { main: string; sub: string; status: string } {
  const main = ok(spo2) ? `${Math.round(spo2.value)}${spo2.flag === 'questionable' ? '?' : ''}` : '-?-';
  const sub = ok(pi) ? `PI ${pi.value.toFixed(pi.value < 1 ? 2 : 1)}` : 'PI ---';
  const status = !spo2 || spo2.value === null ? 'NO PULSE' : ok(pi) && pi.value < 0.3 ? 'LOW PERF' : '';
  return { main, sub, status };
}

/** EtCO2 large, "FiCO2 n" and "awRR n" below; dashes while invalid (warm-up). */
export function formatEtco2(et: Measured | undefined, fi: Measured | undefined, awrr: Measured | undefined): { main: string; sub: string; status: string } {
  return {
    main: ok(et) ? String(Math.round(et.value)) : '---',
    sub: `FiCO2 ${ok(fi) ? Math.round(fi.value) : '--'}`,
    status: `awRR ${ok(awrr) ? Math.round(awrr.value) : '--'}${awrr && awrr.value === 0 ? '  APNEA' : ''}`,
  };
}

/** RR (impedance): "15", "0 APNEA". */
export function formatRr(rr: Measured | undefined): { main: string; status: string } {
  if (!ok(rr)) return { main: '---', status: '' };
  return { main: String(Math.round(rr.value)), status: rr.value === 0 ? 'APNEA' : '' };
}

/** T1 (oesophageal) large, T2 (site) below, 0.1 °C. */
export function formatTemp(t1: Measured | undefined, t2: Measured | undefined): { main: string; sub: string } {
  return { main: ok(t1) ? t1.value.toFixed(1) : '--.-', sub: `T2 ${ok(t2) ? t2.value.toFixed(1) : '--.-'}` };
}
```

**Modify `packages/renderer/src/wave-lanes.ts`** (1/3) — find:

```ts
// The pleth is auto-scaled (brief §4.3: "the display is auto-scaled; PI is kept as a number").
export type WaveLaneId = 'abp' | 'pleth' | 'cvp' | 'pap';

```

replace with:

```ts
// The pleth is auto-scaled (brief §4.3: "the display is auto-scaled; PI is kept as a number").
export type WaveLaneId = 'abp' | 'pleth' | 'cvp' | 'pap' | 'co2' | 'resp'; // Stage 3: co2, resp (62.5 Hz)

```

**Modify `packages/renderer/src/wave-lanes.ts`** (2/3) — find:

```ts
  range: readonly [number, number] | null;
}
```

replace with:

```ts
  range: readonly [number, number] | null;
  /** Stage 3: channel sample rate (default 125) and sweep speed in mm/s (default 25). */
  rate?: 125 | 62.5;
  mmPerS?: number;
}
```

**Modify `packages/renderer/src/wave-lanes.ts`** (3/3) — find:

```ts
  pap: { label: 'PAP', color: '#ffe14d', range: [0, 40] },
};
```

replace with:

```ts
  pap: { label: 'PAP', color: '#ffe14d', range: [0, 40] },
  // Stage 3 (brief §6.8; BUILD-PLAN Stage 3 demo): CO2 yellow 0–50 mmHg at 6.25 mm/s; Resp yellow, auto-scaled
  co2: { label: 'CO2', color: '#f0f030', range: [0, 50], rate: 62.5, mmPerS: 6.25 },
  resp: { label: 'RESP', color: '#f0f030', range: null, rate: 62.5, mmPerS: 6.25 },
};
```

**Modify `packages/renderer/src/monitor-core.ts`** (1/4) — find:

```ts
  private waveLive: boolean[] = []; // Stage 2: the channel had samples on the last frame
  private plethRangeT = -1; // Stage 2: sim time of the last pleth auto-scale
  private readonly plethScratch = new Float32Array(500); // Stage 2
  private size: Size;
```

replace with:

```ts
  private waveLive: boolean[] = []; // Stage 2: the channel had samples on the last frame
  private rangeT: number[] = []; // Stage 2/3: sim time of each auto-scaled lane's last rescale (pleth, resp)
  private readonly plethScratch = new Float32Array(1250); // Stage 2 (10 s at 125 Hz)
  private size: Size;
```

**Modify `packages/renderer/src/monitor-core.ts`** (2/4) — find:

```ts
      this.waveLive[j] = true;
      if (w === 'pleth' && t - this.plethRangeT >= 1) {
        this.plethRangeT = t;
        const n = this.engine.readSamples('pleth', Math.floor((t - 4) * 125), this.plethScratch);
        const [lo, hi] = autoRange(this.plethScratch, n);
```

replace with:

```ts
      this.waveLive[j] = true;
      const st = WAVE_STYLE[w];
      if (st.range === null && t - (this.rangeT[j] ?? -1) >= 1) {
        // Stage 3: every auto-scaled lane (pleth over 4 s, resp over 10 s: two or three breaths)
        this.rangeT[j] = t;
        const rate = st.rate ?? 125;
        const n = this.engine.readSamples(w, Math.floor((t - (w === 'resp' ? 10 : 4)) * rate), this.plethScratch.subarray(0, Math.round((w === 'resp' ? 10 : 4) * rate)));
        const [lo, hi] = autoRange(this.plethScratch, n);
```

**Modify `packages/renderer/src/monitor-core.ts`** (3/4) — find:

```ts
        {
          x: LABEL_W, y: (this.leads.length + j) * h, width: cssW - LABEL_W, height: h, rate: 125, mmPerS: 25,
          pxPerMm: this.pxPerMm, ...scaleFor(lo, hi, h, this.pxPerMm), color: st.color, background: THEME.background,
```

replace with:

```ts
        {
          x: LABEL_W, y: (this.leads.length + j) * h, width: cssW - LABEL_W, height: h, rate: st.rate ?? 125, mmPerS: st.mmPerS ?? 25, // Stage 3
          pxPerMm: this.pxPerMm, ...scaleFor(lo, hi, h, this.pxPerMm), color: st.color, background: THEME.background,
```

**Modify `packages/renderer/src/monitor-core.ts`** (4/4) — find:

```ts
    this.waveLive = this.waves.map(() => false);
    this.plethRangeT = -1;
    this.drawChrome(this.leads.map((_, i) => i));
```

replace with:

```ts
    this.waveLive = this.waves.map(() => false);
    this.rangeT = this.waves.map(() => -1);
    this.drawChrome(this.leads.map((_, i) => i));
```

**Modify `packages/renderer/src/mount.ts`** (1/4) — find:

```ts
import { playBeep, ToneScheduler, unlockAudio, type AudioOut, type ToneLogEntry } from '@pme/audio';
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId, PatientSnapshot } from '@pme/engine-core';
import { NumericTile } from './numerics-dom.ts';
import { formatNibp, formatPressure, PressureTile } from './numerics-hemo.ts'; // Stage 2
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts'; // Stage 2
import type { ClockAnchor, Size } from './protocol.ts';
```

replace with:

```ts
import { playBeep, ToneScheduler, unlockAudio, type AudioOut, type ToneLogEntry } from '@pme/audio';
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId, Measured, PatientSnapshot } from '@pme/engine-core';
import { NumericTile } from './numerics-dom.ts';
import { formatNibp, formatPressure, PressureTile } from './numerics-hemo.ts'; // Stage 2
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts'; // Stage 2
import { formatEtco2, formatRr, formatSpo2, formatTemp } from './numerics-resp.ts'; // Stage 3
import type { ClockAnchor, Size } from './protocol.ts';
```

**Modify `packages/renderer/src/mount.ts`** (2/4) — find:

```ts
  nibp?: boolean;
  fps?: 60 | 30;
```

replace with:

```ts
  nibp?: boolean;
  /** Stage 3: show the temperature tile (T1/T2). */
  temp?: boolean;
  fps?: 60 | 30;
```

**Modify `packages/renderer/src/mount.ts`** (3/4) — find:

```ts
  const nibpTile = opts.nibp ? new PressureTile(tiles, 'NBP', 'mmHg', '#ff7ad9') : null;
  let nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
```

replace with:

```ts
  const nibpTile = opts.nibp ? new PressureTile(tiles, 'NBP', 'mmHg', '#ff7ad9') : null;
  // Stage 3 tiles (brief §6.1, §6.8)
  const spo2Tile = waves.includes('pleth') ? new PressureTile(tiles, 'SpO2', '%', WAVE_STYLE.pleth.color) : null;
  const co2Tile = waves.includes('co2') ? new PressureTile(tiles, 'EtCO2', 'mmHg', WAVE_STYLE.co2.color) : null;
  const rrTile = waves.includes('resp') ? new PressureTile(tiles, 'RR', 'rpm', WAVE_STYLE.resp.color) : null;
  const tempTile = opts.temp ? new PressureTile(tiles, 'TEMP', '°C', '#e0e0e0') : null;
  let lastPi: Measured | undefined;
  let nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
```

**Modify `packages/renderer/src/mount.ts`** (4/4) — find:

```ts
        if (piTile && v.pi) piTile.set(single(v.pi, 1), '');
        if (nibpTile && v.nibpSys && v.nibpSys.value !== null) {
```

replace with:

```ts
        if (piTile && v.pi) piTile.set(single(v.pi, 1), '');
        // Stage 3 tiles
        if (v.pi) lastPi = v.pi;
        if (spo2Tile && v.spo2) {
          const f = formatSpo2(v.spo2, lastPi);
          spo2Tile.set(f.main, f.sub, f.status);
        }
        if (co2Tile && (v.etco2 || v.awrr)) {
          const f = formatEtco2(v.etco2, v.imco2, v.awrr);
          co2Tile.set(f.main, f.sub, f.status);
        }
        if (rrTile && v.rr) {
          const f = formatRr(v.rr);
          rrTile.set(f.main, '', f.status);
        }
        if (tempTile && v.tempCore) {
          const f = formatTemp(v.tempCore, v.tempSite);
          tempTile.set(f.main, f.sub);
        }
        if (nibpTile && v.nibpSys && v.nibpSys.value !== null) {
```

**Modify `packages/renderer/src/index.ts`** (1/1) — find:

```ts
export { transports } from '@pme/controller';
```

replace with:

```ts
export { transports } from '@pme/controller';
export { formatEtco2, formatRr, formatSpo2, formatTemp } from './numerics-resp.ts'; // Stage 3
```

- [ ] **Step 4: Run and verify**

Run: `npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 --filter @pme/renderer exec vitest run`
Expected: typecheck clean; renderer 34 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer
git commit -m "feat(renderer): CO2 and RESP lanes at 62.5 Hz and 6.25 mm/s, SpO2/EtCO2/RR/TEMP tiles" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 23: Demo `stage3.html` and the gate screenshot script

**Files:**
- Create: `apps/demo/stage3.html`, `apps/demo/src/stage3.ts`, `apps/demo/scripts/stage3-shots.mjs`
- Modify: `apps/demo/vite.config.ts`, `apps/demo/index.html`

**Interfaces:** consumes `mountMonitor` with `waves: ['abp', 'pleth', 'co2', 'resp']`, `temp: true`. The page: ECG II + ABP + pleth + CO2 + RESP lanes; HR, ABP, PR, PI, SpO2, EtCO2, RR, TEMP tiles; controls — ventilation source (spontaneous/BVM/ventilator/none) with RR, VT, FiO2, PEEP; airway state (patent/obstructed/apnoea/disconnected/oesophageal/bronchospasm/endobronchial); Preoxygenate 3 min; Rebreathing; Curare cleft; GA induction (temperature); Malignant hyperthermia; VF; sensors (CO2 sidestream/mainstream/off, SpO2, Temp + T2 site); speed ×1/×2/×4; the scripted "Apnoea after preoxygenation (×4)" (GA, preoxygenate 3 min, apnoea, BVM FiO2 1 rescue when SaO2 truth ≤ 85 %) and a truth-vs-displayed SpO2 plot of the last 6 min.

- [ ] **Step 1: Implement**

**Create `apps/demo/stage3.html`:**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage 3: respiratory, gas and temperature</title>
    <style>
      body { background: #000; color: #ccc; font: 14px system-ui, sans-serif; margin: 12px; }
      #monitor { height: 680px; max-width: 1240px; border: 1px solid #333; }
      .controls { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; margin: 10px 0; max-width: 1240px; }
      .controls label { display: inline-flex; gap: 6px; align-items: center; }
      fieldset { border: 1px solid #333; padding: 6px 10px; }
      legend { color: #888; }
      button, select, input { font: inherit; }
      input[type='number'] { width: 4.5em; }
      button[aria-pressed='true'] { background: #2a2; color: #000; }
      #lag { background: #050505; border: 1px solid #333; }
      #diag { font: 13px ui-monospace, monospace; white-space: pre; color: #8f8; }
    </style>
  </head>
  <body>
    <div id="monitor"></div>
    <div class="controls">
      <fieldset><legend>Ventilation</legend>
        <select id="source"><option value="spontaneous">spontaneous</option><option value="bvm">BVM</option><option value="ventilator">ventilator</option><option value="none">none</option></select>
        <label>RR <input id="rr" type="number" min="1" max="80" value="15" /></label>
        <label>VT <input id="vt" type="number" min="20" max="1500" value="500" /></label>
        <label>FiO2 <input id="fio2" type="number" min="0.21" max="1" step="0.01" value="0.21" /></label>
        <label>PEEP <input id="peep" type="number" min="0" max="30" value="5" /></label>
        <button id="applyVent">Apply</button>
      </fieldset>
      <fieldset><legend>Airway</legend>
        <select id="airway"><option>patent</option><option>obstructed</option><option>apnoea</option><option>disconnected</option><option>oesophageal</option><option>bronchospasm</option><option>endobronchial</option></select>
        <button id="preox">Preoxygenate 3 min</button>
        <button id="rebreathe" aria-pressed="false">Rebreathing</button>
        <button id="cleft" aria-pressed="false">Curare cleft</button>
      </fieldset>
      <fieldset><legend>Conditions</legend>
        <button id="ga" aria-pressed="false">GA induction (temperature)</button>
        <button id="mh" aria-pressed="false">Malignant hyperthermia</button>
        <button id="vf">VF</button>
      </fieldset>
      <fieldset><legend>Sensors</legend>
        <select id="co2"><option value="sidestream">CO2 sidestream</option><option value="mainstream">CO2 mainstream</option><option value="off">CO2 off</option></select>
        <button id="sSpo2" aria-pressed="true">SpO2</button>
        <button id="sTemp" aria-pressed="true">Temp</button>
        <select id="tsite"><option>axilla</option><option>nasopharyngeal</option><option>tympanic</option><option>bladder</option><option>rectal</option></select>
      </fieldset>
      <fieldset><legend>Teaching</legend>
        <button id="story">Apnoea after preoxygenation (×4)</button>
        <label>Speed <select id="speed"><option value="1">×1</option><option value="2">×2</option><option value="4">×4</option></select></label>
      </fieldset>
      <button id="sound">Enable sound</button>
    </div>
    <canvas id="lag" width="600" height="120" title="SaO2 truth (white) vs displayed SpO2 (cyan), last 6 min"></canvas>
    <div id="diag"></div>
    <script type="module" src="./src/stage3.ts"></script>
  </body>
</html>
```

**Create `apps/demo/src/stage3.ts`:**

```ts
// Stage 3 demo (BUILD-PLAN Stage 3 "Demo"): ECG II + ABP + pleth + CO2 + RESP lanes; SpO2 (PI), EtCO2/FiCO2/awRR,
// RR and TEMP tiles; ventilation source/settings, airway states, preoxygenation, GA temperature, MH, sensors,
// and a scripted "apnoea after preoxygenation" that shows the whole SpO2 lag story (R8) on a truth-vs-displayed plot.
import type { Command } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';

type CommandBody = Command extends infer C ? (C extends Command ? Omit<C, 'id' | 'issuedBy'> : never) : never;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const pm = mountMonitor($('monitor'), {
  skin: 'philips-like',
  engine: { seed: 7, patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', sensors: { abp: 'connected', spo2: 'on', co2: 'on', temp: 'on' } } },
  lanes: ['ecgII'],
  waves: ['abp', 'pleth', 'co2', 'resp'],
  temp: true,
});
let n = 0;
const send = (c: CommandBody) =>
  pm.dispatch({ id: `demo-${++n}`, issuedBy: 'stage3', ...c } as Command).then((r) => {
    if (!r.accepted) console.warn('rejected', c, r.reason);
    return r;
  });
const ev = (event: Record<string, unknown>) => send({ type: 'applyEvent', event } as CommandBody);
const num = (id: string) => Number($<HTMLInputElement>(id).value);
const toggle = (id: string, on: (pressed: boolean) => void) => {
  const b = $<HTMLButtonElement>(id);
  b.addEventListener('click', () => {
    const p = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(p));
    on(p);
  });
};

// Ventilation and airway
const vent = () => ev({ kind: 'ventilation', source: $<HTMLSelectElement>('source').value, rr: num('rr'), vtMl: num('vt'), fio2: num('fio2'), peep: num('peep') });
$('applyVent').addEventListener('click', () => void vent());
$('airway').addEventListener('change', () => void ev({ kind: 'airway', state: $<HTMLSelectElement>('airway').value }));
$('preox').addEventListener('click', () => void ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 }));
toggle('rebreathe', (p) => void ev({ kind: 'ventilation', source: 'ventilator', rr: num('rr'), vtMl: num('vt'), fio2: num('fio2'), peep: num('peep'), fico2: p ? 6 : 0 }));
toggle('cleft', (p) => void ev({ kind: 'ventilation', source: 'ventilator', rr: 8, vtMl: num('vt'), fio2: num('fio2'), peep: num('peep'), effort: p ? 0.6 : 0 }));

// Conditions
toggle('ga', (p) => void ev({ kind: 'thermal', anaesthesia: p ? 'general' : 'none' }));
toggle('mh', (p) => void ev({ kind: 'condition', id: 'mh', severity: p ? 1 : 0 }));
$('vf').addEventListener('click', () => void send({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' } as CommandBody));

// Sensors
$('co2').addEventListener('change', () => {
  const v = $<HTMLSelectElement>('co2').value;
  void send({ type: 'attachSensor', sensor: 'co2', state: v === 'off' ? 'off' : 'on', ...(v === 'off' ? {} : { sampling: v as 'sidestream' | 'mainstream' }) });
});
toggle('sSpo2', (p) => void send({ type: 'attachSensor', sensor: 'spo2', state: p ? 'on' : 'off' }));
toggle('sTemp', (p) => void send({ type: 'attachSensor', sensor: 'temp', state: p ? 'on' : 'off', site: $<HTMLSelectElement>('tsite').value }));
$('tsite').addEventListener('change', () => void send({ type: 'attachSensor', sensor: 'temp', state: 'on', site: $<HTMLSelectElement>('tsite').value }));
$('speed').addEventListener('change', () => pm.setTimeScale(Number($<HTMLSelectElement>('speed').value)));

// Truth vs displayed SpO2 (R8 teaching plot) and the scripted story
const truth: Array<[number, number]> = [];
const shown: Array<[number, number | null]> = [];
let simT = 0;
let story: 'idle' | 'preox' | 'apnoea' | 'rescue' = 'idle';
let storyT = 0;
pm.on((e) => {
  if (e.type === 'state' && e.values.spo2 !== undefined) {
    simT = e.t;
    truth.push([e.t, e.values.spo2]);
    if (story === 'preox' && e.t - storyT >= 180) {
      story = 'apnoea';
      void ev({ kind: 'ventilation', source: 'none' });
      void ev({ kind: 'airway', state: 'apnoea' });
    } else if (story === 'apnoea' && e.values.spo2 <= 85) {
      story = 'rescue';
      void ev({ kind: 'airway', state: 'patent' });
      void ev({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 600, fio2: 1 });
    }
  }
  if (e.type === 'measurement' && e.values.spo2) shown.push([e.t, e.values.spo2.value]);
  while (truth.length > 400) truth.shift();
  while (shown.length > 400) shown.shift();
});
$('story').addEventListener('click', () => {
  story = 'preox';
  storyT = simT;
  pm.setTimeScale(4);
  ($<HTMLSelectElement>('speed')).value = '4';
  void ev({ kind: 'thermal', anaesthesia: 'general' });
  void ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 });
});
const lag = $<HTMLCanvasElement>('lag').getContext('2d')!;
function drawLag(): void {
  const W = 600;
  const H = 120;
  lag.fillStyle = '#050505';
  lag.fillRect(0, 0, W, H);
  const t1 = simT;
  const x = (t: number) => W - ((t1 - t) / 360) * W;
  const y = (v: number) => H - ((v - 50) / 50) * H;
  lag.strokeStyle = '#333';
  for (const v of [60, 70, 80, 90]) {
    lag.beginPath();
    lag.moveTo(0, y(v));
    lag.lineTo(W, y(v));
    lag.stroke();
  }
  const line = (pts: Array<[number, number | null]>, color: string) => {
    lag.strokeStyle = color;
    lag.beginPath();
    let pen = false;
    for (const [t, v] of pts) {
      if (v === null) {
        pen = false;
        continue;
      }
      if (pen) lag.lineTo(x(t), y(v));
      else lag.moveTo(x(t), y(v));
      pen = true;
    }
    lag.stroke();
  };
  line(truth, '#fff');
  line(shown, '#00e5ff');
  lag.fillStyle = '#888';
  lag.fillText('SaO2 truth (white) · displayed SpO2 (cyan) · last 6 min', 6, 12);
}

const soundBtn = $<HTMLButtonElement>('sound');
soundBtn.addEventListener('click', () => void pm.enableSound().then(() => ((soundBtn.textContent = 'Sound on'), (soundBtn.disabled = true))));
let path = '…';
void pm.renderPath.then((p) => (path = p));
let last = '';
pm.on((e) => {
  if (e.type === 'state') last = `truth SaO2 ${e.values.spo2?.toFixed(1)}  EtCO2 ${e.values.etco2?.toFixed(1)}  FiO2 ${e.values.fio2?.toFixed(2)}  shunt ${e.values.shunt?.toFixed(2)}  core ${e.values.tempCore?.toFixed(2)} °C  flags ${JSON.stringify(e.control)}`;
});
setInterval(() => {
  drawLag();
  $('diag').textContent = `render path: ${path}   story: ${story}\n${last}`;
}, 500);
```

**Create `apps/demo/scripts/stage3-shots.mjs`:**

```js
// Gate 3 screenshots (headless system Chrome; a hidden desktop pane throttles rAF — Gate 1 lesson).
// Usage: (cd apps/demo && npx vite preview --port 4817 --strictPort &) then
//        node apps/demo/scripts/stage3-shots.mjs http://localhost:4817 docs/gates/stage-3
import { chromium } from '@playwright/test';

const [base = 'http://localhost:4817', out = 'docs/gates/stage-3'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 1060 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
const shot = (name) => p.screenshot({ path: `${out}/${name}.png` });
const wait = (s) => p.waitForTimeout(s * 1000);
await p.goto(`${base}/stage3.html`);
await wait(14);
await shot('spontaneous');
await p.selectOption('#source', 'ventilator');
await p.fill('#rr', '12');
await p.fill('#fio2', '0.5');
await p.click('#applyVent');
await wait(14);
await shot('ventilated');
await p.selectOption('#airway', 'bronchospasm');
await wait(14);
await shot('bronchospasm');
await p.selectOption('#airway', 'patent');
await p.click('#cleft');
await wait(14);
await shot('curare-cleft');
await p.click('#cleft');
await p.selectOption('#airway', 'oesophageal');
await wait(40);
await shot('oesophageal');
await p.selectOption('#airway', 'patent');
await p.selectOption('#source', 'spontaneous');
await p.fill('#rr', '15');
await p.fill('#fio2', '0.21');
await p.click('#applyVent');
await wait(10);
await p.click('#story'); // preoxygenate 3 min → apnoea → rescue at SaO2 85 %, at ×4
for (let i = 0; i < 40; i++) {
  await wait(10);
  if ((await p.textContent('#diag')).includes('story: rescue')) break;
}
await wait(12); // the displayed SpO2 is still falling here (R8)
await shot('r8-still-falling');
await wait(30);
await shot('r8-recovered');
console.log(await p.textContent('#diag'));
console.log('page errors:', JSON.stringify(errors));
await b.close();
```

**Modify `apps/demo/vite.config.ts`** (1/1) — find:

```ts
        stage2: page('stage2'), // Stage 2
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
```

replace with:

```ts
        stage2: page('stage2'), // Stage 2
        stage3: page('stage3'), // Stage 3
        stage6a: page('stage6a'), 'stage6a-remote': page('stage6a-remote'), 'stage6a-viewer': page('stage6a-viewer'),
```

**Modify `apps/demo/index.html`** (1/1) — find:

```html
      <li><a href="./stage2.html">Stage 2: haemodynamics (ABP, pleth, CVP, NIBP)</a></li>
      <li><a href="./stage4a-skins.html">Stage 4a: skin preview and alarm sound profiles</a></li>
```

replace with:

```html
      <li><a href="./stage2.html">Stage 2: haemodynamics (ABP, pleth, CVP, NIBP)</a></li>
      <li><a href="./stage3.html">Stage 3: respiratory, gas and temperature (CO2, SpO2 lag, RR, temp)</a></li>
      <li><a href="./stage4a-skins.html">Stage 4a: skin preview and alarm sound profiles</a></li>
```

- [ ] **Step 2: Build and look at it**

```bash
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 build
(cd apps/demo && npx vite preview --port 4817 --strictPort &) ; sleep 3
mkdir -p docs/gates/stage-3
node apps/demo/scripts/stage3-shots.mjs http://localhost:4817 docs/gates/stage-3
pkill -f "vite preview --port 4817"
```

Expected: the script prints `render path: worker-raf   story: rescue` (or `idle` if the story has not reached the rescue) and `page errors: []`; seven PNGs in `docs/gates/stage-3/`. Open each: `spontaneous` (rounded capnogram, impedance with small cardiogenic ripple), `ventilated` (square capnogram at 12/min), `bronchospasm` (shark fin), `curare-cleft` (a notch in the plateau at RR 8), `oesophageal` (fading bumps then flat), `r8-still-falling` (the white SaO2 truth already rising while the cyan displayed SpO2 is still going down), `r8-recovered`. The prototype ran this page headless with no page errors (only a favicon 404 in the console).

- [ ] **Step 3: Commit**

```bash
git add apps/demo/stage3.html apps/demo/src/stage3.ts apps/demo/scripts/stage3-shots.mjs apps/demo/vite.config.ts apps/demo/index.html docs/gates/stage-3/*.png
git commit -m "feat(demo): stage3 monitor — CO2/RESP lanes, gas/temperature tiles, airway and ventilation controls, R8 story" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 24: Full verification and the gate note

**Files:**
- Create: `docs/gates/stage-3.md`

- [ ] **Step 1: Run everything from a clean install**

```bash
rm -rf node_modules packages/*/node_modules apps/*/node_modules && npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck && npx -y pnpm@9.15.9 test && npx -y pnpm@9.15.9 build && npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
```

Expected: exit 0; engine-core ≈ 369 tests (the exact count after PR #4's reconciliation may differ), renderer 34, controller 97, audio 58, skins 155, validation 16; `check-notices: OK`; e2e as on `main`.

- [ ] **Step 2: Measure the gate numbers**

Write this scratch probe to `packages/engine-core/test/zz-gate3.test.ts` (it is NOT committed), run it with `npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/zz-gate3.test.ts`, copy the printed lines, then delete the file:

```ts
// Gate 3 measurement probe (NOT committed): prints every number docs/gates/stage-3.md reports.
import { it } from 'vitest';
import { createCo2State, stepCo2, vaForPaco2 } from '../src/l2/gas/co2.ts';
import { cardiacOutput } from '../src/l2/gas/coupling.ts';
import { GA_METABOLIC, gasPatient } from '../src/l2/gas/params.ts';
import { createTemp, setCoreTarget, stepTemp } from '../src/l2/temp/temp.ts';
import { plethRr } from '../src/l3/resp/impedance.ts';
import type { EngineEvent } from '../src/types.ts';
import { ADULT, beatsIn, capnoAngles, cmd, desatTime, ev3, hemoOf, mean, numSeries, read62, rig3, stateSeries, vent } from './helpers/resp.ts';

it('gate 3 numbers', { timeout: 300_000 }, () => {
  const o: string[] = [];
  for (const s of ['sidestream', 'mainstream'] as const) {
    const { e } = rig3({ patient: ADULT, sampling: s });
    e.dispatch(vent());
    e.advanceTo(60);
    const a = capnoAngles(read62(e, 'co2', 20, 60));
    e.dispatch(ev3({ kind: 'airway', state: 'bronchospasm', severity: 1 }));
    e.advanceTo(120);
    const b = capnoAngles(read62(e, 'co2', 80, 120));
    o.push(`${s}: α ${mean(a.map((x) => x.alpha)).toFixed(1)}°, phase III +${mean(a.map((x) => x.riseIII)).toFixed(1)} mmHg, bronchospasm α ${mean(b.map((x) => x.alpha)).toFixed(1)}°`);
  }
  {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(vent(12));
    e.advanceTo(60);
    const x = read62(e, 'co2', 0, 60);
    const lags: number[] = [];
    for (const b of ev.filter((z): z is Extract<EngineEvent, { type: 'breath' }> => z.type === 'breath' && z.t > 20 && z.t < 55)) {
      let k = Math.round((b.t + 1.5) * 62.5);
      const p = x[k]!;
      while (x[k]! > 0.9 * p) k++;
      lags.push(k / 62.5 - b.t);
    }
    o.push(`sidestream lag ${Math.min(...lags).toFixed(3)}–${Math.max(...lags).toFixed(3)} s`);
  }
  const pat = gasPatient(ADULT);
  const vco2 = pat.vco2 * GA_METABOLIC;
  const x = (va: number) => ({ vaLpm: va, vco2, coRatio: 1, cf: pat.cf, cs: pat.cs, kfs: pat.kfs, extraGradient: 0 });
  const ap = createCo2State(40);
  const pa: number[] = [40];
  for (let i = 1; i <= 3600; i++) {
    stepCo2(ap, x(0), 0.1);
    if (i % 600 === 0) pa.push(ap.pf);
  }
  o.push(`apnoea +${(pa[1]! - pa[0]!).toFixed(1)} in min 1, then ${((pa[6]! - pa[1]!) / 5).toFixed(2)} mmHg/min`);
  const up = createCo2State(40);
  const f: number[] = [];
  const va0 = vaForPaco2(vco2, 40);
  for (let i = 1; i <= 36000; i++) {
    stepCo2(up, x(va0 * 1.33), 0.1);
    if (i % 60 === 0) f.push((40 - up.pf) / (40 - 40 / 1.33));
  }
  o.push(`+33 % VA: ${(100 * f[19]!).toFixed(1)} % at 2 min, ${(100 * f[29]!).toFixed(1)} % at 3 min, 90 % at ${(f.findIndex((v) => v >= 0.9) / 10 + 0.1).toFixed(1)} min`);
  o.push(`desaturation to 90 %: adult preox ${desatTime(ADULT, true)} s, room air ${desatTime(ADULT, false)} s, child ${desatTime({ ageY: 4, weightKg: 16, baseline: { rr: 24, vt: 130 } }, true)} s, obese ${desatTime({ ageY: 40, weightKg: 127, heightCm: 175, sex: 'M' }, true)} s`);
  {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
    e.advanceTo(60);
    e.dispatch(ev3({ kind: 'airway', state: 'obstructed' }));
    let tr = 0;
    for (let t = 61; t < 400 && !tr; t++) {
      e.advanceTo(t);
      const sa = stateSeries(ev, 'spo2', t - 1.01).pop();
      if (sa && sa[1] <= 85) tr = t;
    }
    e.dispatch(ev3({ kind: 'airway', state: 'patent' }));
    e.dispatch(ev3({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 600, fio2: 1 }));
    e.advanceTo(tr + 90);
    const sh = numSeries(ev, 'spo2', tr, tr + 90).filter(([, v]) => Number.isFinite(v));
    const mn = sh.reduce((a, b) => (b[1] < a[1] ? b : a));
    o.push(`R8: SaO2 85 at ${tr - 60} s of obstruction, displayed then ${numSeries(ev, 'spo2', tr - 1, tr)[0]![1]}, lowest ${mn[1]} at +${(mn[0] - tr).toFixed(0)} s after the rescue`);
  }
  for (const vs of [1, 0.3]) {
    const q = rig3({ patient: { ...ADULT, sensors: { abp: 'connected', cvp: 'connected' } } });
    q.e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: vs }));
    q.e.dispatch(vent(12, 500, 0.4, 5));
    q.e.advanceTo(120);
    const co5 = cardiacOutput(hemoOf(q.e), 120);
    const m5 = mean(numSeries(q.ev, 'abpMean', 100, 120).map(([, v]) => v));
    const c5 = mean(numSeries(q.ev, 'cvpMean', 100, 120).map(([, v]) => v));
    q.e.dispatch(vent(12, 500, 0.4, 15));
    q.e.advanceTo(240);
    const co15 = cardiacOutput(hemoOf(q.e), 240);
    const m15 = mean(numSeries(q.ev, 'abpMean', 220, 240).map(([, v]) => v));
    const c15 = mean(numSeries(q.ev, 'cvpMean', 220, 240).map(([, v]) => v));
    o.push(`PEEP 5→15 at volumeStatus ${vs}: CO ${co5.toFixed(2)}→${co15.toFixed(2)} L/min, MAP ${m5.toFixed(0)}→${m15.toFixed(0)}, CVP ${c5.toFixed(1)}→${c15.toFixed(1)}`);
  }
  {
    const { e, ev } = rig3({ patient: ADULT });
    e.dispatch(vent(14, 500, 0.5, 5));
    e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
    e.dispatch(cmd({ type: 'setTarget', variable: 'volumeStatus', value: 0.5 }));
    e.advanceTo(120);
    const pl = new Float32Array(120 * 125);
    e.readSamples('pleth', 0, pl);
    const bs = beatsIn(ev, 55, 118).map((b) => {
      const w = pl.subarray(Math.round((b.t + 0.1) * 125), Math.round((b.t + 0.6) * 125));
      return { t: b.t, amp: Math.max(...w) - Math.min(...w) };
    });
    o.push(`RR at 14/min: awRR ${mean(numSeries(ev, 'awrr', 100, 120).map(([, v]) => v)).toFixed(1)}, impedance ${mean(numSeries(ev, 'rr', 100, 120).map(([, v]) => v)).toFixed(1)}, pleth ${plethRr(bs, 118)!.toFixed(1)}`);
  }
  const ga = createTemp(36.8, 70);
  ga.anaesthesia = 'general';
  const tc: number[] = [];
  for (let s = 1; s <= 8 * 3600; s++) {
    stepTemp(ga, s, 1);
    if (s % 60 === 0) tc.push(ga.tc);
  }
  o.push(`GA temperature: −${(36.8 - tc[59]!).toFixed(2)} °C at 60 min, −${(tc[59]! - tc[119]!).toFixed(2)} °C in hour 2, hour-8 plateau ${Math.min(...tc.slice(-60)).toFixed(2)}–${Math.max(...tc.slice(-60)).toFixed(2)} °C`);
  const r = createTemp(36.8, 70);
  setCoreTarget(r, 38.8);
  for (const k of Object.keys(r.sites) as Array<keyof typeof r.sites>) r.sites[k] = 36.8 + (k === 'axilla' ? -0.5 : 0);
  let tau = 0;
  for (let s = 1; s <= 7200 && !tau; s++) {
    stepTemp(r, s, 1);
    if (r.sites.rectal - 36.8 >= 0.632 * 2) tau = s;
  }
  o.push(`rectal probe τ ${(tau / 60).toFixed(1)} min`);
  console.log(o.join('\n'));
});
```

Prototype output (your numbers must fall inside the acceptance bands; small differences from these are expected only if PR #4's reconciliation changed Stage 2 behaviour):

```
sidestream: α 105.6°, phase III +1.4 mmHg, bronchospasm α 157.4°
mainstream: α 100.5°, phase III +1.5 mmHg, bronchospasm α 158.7°
sidestream lag 2.332–2.348 s
apnoea +12.0 in min 1, then 3.34 mmHg/min
+33 % VA: 35.7 % at 2 min, 40.8 % at 3 min, 90 % at 24.4 min
desaturation to 90 %: adult preox 501 s, room air 41 s, child 158 s, obese 170 s
R8: SaO2 85 at 41 s of obstruction, displayed then 94, lowest 86 at +20 s after the rescue
PEEP 5→15 at volumeStatus 1: CO 4.88→4.42 L/min, MAP 97→83, CVP 6.0→8.2
PEEP 5→15 at volumeStatus 0.3: CO 4.87→3.77 L/min, MAP 97→68, CVP 6.0→8.2
RR at 14/min: awRR 14.0, impedance 14.0, pleth 13.9
GA temperature: −1.28 °C at 60 min, −0.39 °C in hour 2, hour-8 plateau 34.65–34.67 °C
rectal probe τ 40.0 min
```

- [ ] **Step 3: Write `docs/gates/stage-3.md`**

Structure it like `docs/gates/stage-2.md`: the gate question ("Does the airway-loss sequence feel right to an anaesthetist — EtCO2 gone at once, SpO2 falling late and still falling after the airway is back — and do the capnogram patterns read correctly at a glance?"), a table with one row per BUILD-PLAN Stage 3 acceptance item (1–9) plus the extra checks of this plan (PPV through the driver, RR three ways, ventilator link and PEEP, lungState, determinism, 24 h), each with the MEASURED value from Step 2 next to the prototype value from this plan's "Prototype results"; then a "Plan decisions needing a ruling" list: decision 3 (CO2 constants; the halving acceptance is unreachable), decision 4 (room-air desaturation ≈ 40 s vs the brief's 1–2 min), decision 5 (RR 60 sidestream under-read ≈ 1 mmHg vs > 3), decision 7 (MANUAL PEEP coupling above 10 cmH2O), decision 2 (MANUAL gas targets as calibrations), and the two partition exceptions; then the screenshots list with one line on what each shows.

- [ ] **Step 4: Commit**

```bash
git add docs/gates/stage-3.md
git commit -m "docs(gates): stage 3 gate evidence" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 25: Pull request

- [ ] **Step 1: Check the partition**

```bash
git diff --stat origin/main...HEAD -- packages/engine-core/src/l2/ecg packages/engine-core/src/l3/nibp packages/skins packages/audio   # must print nothing
git diff origin/main...HEAD -- packages/engine-core/src/l2/hemo | grep '^[+-][^+-]' | wc -l                                  # 15 (7 lines out, 8 in: exception (a))
git diff --stat origin/main...HEAD -- packages/controller                                                                  # 2 files (exception (b)/(c))
```

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin stage-3-respiratory-gas
gh pr create --base main --head stage-3-respiratory-gas --title "Stage 3: respiratory, gas exchange, SpO2 chain, capnography, temperature" --body "$(cat <<'BODY'
Implements docs/plans/stage-3-respiratory-gas.md (25 tasks): respiratory driver (spontaneous/BVM/ventilator/external VentFrame/none) with airway states, phase-built capnogram with sidestream/mainstream sampling and the pattern library, two-compartment CO2, O2 store/ODC/shunt, SpO2 device chain with the R8 lag structure, impedance RR, heat model with probe sites, L3 numerics, the R27 link (externalDrive in, lungState out), CO2/RESP lanes and tiles, and stage3.html.

Gate evidence: docs/gates/stage-3.md (measured values and screenshots).

Needs a ruling: plan decisions 2, 3, 4, 5, 7 and the partition exceptions (a) hemo u(t) seam, (b)/(c) controller formatter and three pinned "Stage 3" assertions.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Expected: the PR URL; CI green.

---

## Requests to other stages and to the orchestrator

- **R-S3-1 (orchestrator / Stage 2 owner):** approve partition exception (a) — the optional `u(t)` seam (7 lines changed, 1 added) in `l2/hemo/{params,cvp,pipeline}.ts`. If PR #4's reconciler prefers, land the same seam in PR #4 before it merges; Task 14 then reduces to its test.
- **R-S3-2 (orchestrator / Stage 6a owner):** approve exception (b)/(c) — two log-formatter cases in `controller-session.ts` (`externalDrive`, JSON for Stage 3 `applyEvent` kinds) and one host test moved from `spo2` to `k`.
- **R-S3-3 (Stage 5.1, ECG owner):** RSA, baseline wander and QRS amplitude modulation still use Stage 1's fixed 15/min clock (`l2/ecg/hrv.ts` `F_RESP_HZ`). To complete M6, the ECG should read the respiratory phase from the driver (an optional `RhythmCtx.u?: (t) => number`, the same signal Task 14 gives the haemodynamics).
- **R-S3-4 (Stage 4b):** the SpO2 profile (`SPO2_PROFILE`: averaging 8 s, update 1 s), apnoea delays (`GAS_APNOEA_S`, `IMP_APNOEA_S`) and the tone preset (`spo2PitchHz` semitone step) are constants here; the skins should set them (philips-like 10 s / 2 s, saadat impedance apnoea 10 s). The `apnoea-co2` / `apnoea-resp` alarm events feed the alarm engine.
- **R-S3-5 (Stage 7):** replace `applyPawCoupling` by the Guyton solve and read `metabolic()` factors from drugs; the `thermal` event should be sent by induction drugs; R22's profile table replaces `gasPatient`'s rules.
