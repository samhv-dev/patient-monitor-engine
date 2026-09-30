# Gate FU-8 Part A — monitor honesty in arrest, AF and arrest-state fixes, library defects

Plan: `docs/plans/fu-8-followups.md` (Part A = Tasks A0–A29; Part B waits for FU-7). Executed in the cloud (Opus 5.5) on
branch `fu-8-followups`: plan commit `b70bfb5`, V.1 merged in from `origin/main` `2e94f55` before Task A0 (`befbea6`),
`origin/main` merged again before the circulation tasks and the gate (docs-only since). Head: see the PR.

## 0. Gate numbers

| Check | Result |
|---|---|
| `pnpm -r typecheck` | clean |
| fast set, every package (`CI=1`, engine-core `PME_TEST_SET=fast`; 17.3 min wall) | engine-core **271 files / 1 210 passed** (1 skipped); controller 223; renderer 89; skins 179; demo 141; validation 107 + 11 skipped; ventilator 95; audio 58 |
| slow-a (`PME_TEST_SET=slow-a`) | **28 files / 99 passed**, 41.3 min wall |
| slow-b (`PME_TEST_SET=slow-b`) | **45 files / 251 passed**, 53.3 min wall |
| slow groups, note | both ran **concurrently** on this 4-vCPU container, beside the screenshot script and the monitor audit, so the wall times are contended and not comparable with CI's (FU-4: slow-a 21.6, slow-b 37.6 min). FU-8 adds **no** slow-b file (every new slow file is `test/engine/fu8-*.test.ts`, in SLOW and SLOW_A); `pk-longrun` passes on Linux (the macOS-only red is not seen here) |
| `pnpm build` then `CI=1 pnpm test:e2e` | build clean; **60 passed, 21 skipped, 1 flaky, 0 failed** (Chromium + WebKit, 21.7 min): the flaky one was `fu5-latched` philips-like (first attempt read `APNEA live` to 308 s; passed on retry). Cause: the test read the bar's text, `data-latched` and lamp in separate round-trips, so the 2 s rotation could pair the latched APNEA's text with the live message's attribute; fixed in the test (one `page.evaluate` per sample, E-FU8-5, `75ee177`) → 4 of 4 passed under 2 workers with no retries. Only this task's screenshots are committed (`git checkout -- docs/gates` for the rest) |
| tick bench (`tickBench(60)`, Node, same container, base `befbea6` vs FU-8 alternating, 2 × 3 runs each, idle) | p50 base **2.01 ms** (1.91–2.17), FU-8 **2.08 ms** (1.85–2.30): **+3.7 %**, inside the gate's +10 %. This container is ≈ 4× slower than the FU-4 gate's Mac (0.52 ms), so the absolute criterion is compared base-to-branch on one machine |
| **CI on the PR head `d73f460`** | build ✓ 44.2 min, slow-a ✓ 30.6 min, slow-b ✓ **55.8 min** — against main's last run (`2473f0b`, same day): 36.3 / 22.3 / 36.5 min. slow-b holds the same 45 files; every one of them ran slower by a similar factor (×1.35–1.66, median ×1.54 — `endo-acceptance`, `pk-acceptance-pd` and `organs-renal`, which FU-8 does not touch, included), while the engine's own cost on one machine moved +2.5 % (MODELED) / +5.7 % (MANUAL) wall per sim-second, base vs FU-8, 300 sim-s × 6 runs each. So the slow-b growth is the runner, not this branch; the plan's "slow-b under 40 min" is **not met on this run** and is flagged for the orchestrator (a re-run on another runner, or FU-4's split, decides). slow-a +8.3 min includes the 19 new `fu8-*` files; build +7.9 min includes the un-pinned `fu5-latched` e2e (≈ 4 min) |
| monitor audit after (`A1-map-ladder A2-ali-b7 A7-probe B1-rhythms`) | see §2 (A1, A2/A6, A3 rows); no `X<X`/`X>X` text and no `**CVP -…` text in any scenario |
| block checker (`docs/review-inputs/tools/fu-8-check-blocks.py`) | on `b70bfb5` against `origin/main` `2e94f55` (V.1 merged): Part A 146 find/replace + 24 creates, 1 chained, **0 problems**; after the merge (`--base HEAD`) 0 problems — **no block moved, none re-anchored**; Part B 28 + 3 re-checked on the Part A tree at the gate: 0 problems |

The research/19 (CM) and research/20 (DV) audit cells could not be re-run: their scripts live in the orchestrator's
workspace (`../research/19-audit-scripts`, `20-audit-scripts`), not in this repository or container. Every cell a task
fixes has an `fu8-*` test that reproduces its rig (named in §2); the rest are listed as not run in §8.

## 1. Tasks

| Task | Commit | Result |
|---|---|---|
| A0 | `473b1dd` | `fu8-*.test.ts` in SLOW and SLOW_A; before-numbers reproduce the plan (A2-ali-b7 `**ABPm 66<70` at 687 s; A7-probe PI 8.21 at 181–185 s; fidelity-lowflow 9 tests with its pins; circ-hypoxic-arrest 8, asphyxial PEA +6.35 min) |
| A1 | `3592d8a` | live limit-alarm text, the limit in force, `held` through the hysteresis |
| A2 | `9841849` | one QRS per agonal complex; agonal hold counts complexes; LOW PERF on-delay; 3 pins flip (E-FU8-1) |
| A3 | `06560bc` | PI/PR restart at motion end |
| A4 | `1df4881` | `fu5-latched` passes (`?bvmAt=210`, E-FU8-5) |
| A5 | — | pointer to A19 |
| A6 | `586ffcd` | agonal rate honest; also lands A2's `fu8-agonal-qrs` (deviation 1) |
| A7 | `0ee2cf1` | AGENTS tile + imCO2 extra (E-FU8-3) |
| A8 | `a073fee` | oliguria needs a completed bin |
| A9 | `6179e48` | 12-lead HR/axis from the monitor detector |
| A10 | `008356d` | coronary supply + demand over 2 s; `TAU_HYP_S` 235 (E-FU8-4; §3) |
| A11 | `aa9241e` | ST follows the filtered deficit |
| A12 | `343eb42` | age bands rest at their set points |
| A13 | `b23a3ea` | `l2/body-size.ts`, one continuous rule |
| A14 | `ba8262d` | `setRhythm` refuses unknown option keys |
| A15 | `930acb3` | Labeller, eleven built-ins, tooltip (E-FU8-2) |
| A16 | `d90b16b` | card fields, `patient.endo`, unlabelled-state warning (E-FU8-2) |
| A17 | `83f9926` | sweep backfill |
| A18 | `26c289e` | PH grade → PVR |
| A19 | `b84dc5f` | outflow limiter + collapse floors (E-FU8-9) |
| A20 | `890c9c4` | IABP: augmented diastole, owed deflation, valve timing |
| A21 | `3efdd8a` | shock/instructor PEA carries the arrest state (PEA only) |
| A22 | `24908be` | EtCO2 under CPR from pulmonary flow (E-FU8-10, E-FU8-11; proposed E-FU8-13, §6) |
| A23 | `2281d83` | CPR artefact on the ECG |
| A24 | `11e058c` | CPR cerebral flow recorded |
| **A25** | **skipped** | **gated on Ali's W18** (the HR numeric in an agonal rhythm): not executed; the flicker stands at 34 invalid samples / 16 flips (`fu8-agonal-qrs`) |
| A26 | `45f50a5` | UNPROTOTYPED → measured, then built (§5) |
| A27 | `17342bb` | UNPROTOTYPED → measured; the cause was not the plan's (§5) |
| A28 | `7c7c734` | drug resting-output reference in L/min (E-FU8-12) |
| A29 | `3136f24` | profile PE → PVR |
| G | this note | screenshots (§7), E-FU8-8 |

## 2. Before → after (plan's prototype = the expected column; this tree = measured)

| Item | Rig | Before (base) | Plan prototype | Measured here |
|---|---|---|---|---|
| A1 F1 | MANUAL MAP ladder (`fu8-alarm-text`) | text frozen `**ABPm 60<70`, gap 25 mmHg | 470 rows, gap 0, one raise | **470 rows, gap 0 mmHg**, one raise; last text `**ABPm 38<70` |
| A1 F6 | ABPs low 90: 85 → 90 → 92 | — | `**ABPs 85<90` kept | as plan (`held`) |
| A1 | FU-4 page, Ali's tamponade (shot a1) | `**ABPm 66<70` frozen | — | `**ABPm 23<70` at ART 25/22 (23) |
| A2 F3 | fidelity-lowflow Ali's case / 3 L bleed | 3 / 1 EXTREME BRADY cycles | 0 / 0 | **0 / 0** (pins flip) |
| A2 | 3 L bleed LOW PERF | raised 601 s, cleared 602 s | none | **none** (pin flips) |
| A2+A6 | MANUAL agonal 30–300 s (`fu8-agonal-qrs`) | 51 complexes, 125 invalid, **56 flips** | 53 / 34 / 16 | **53 / 34 / 16**; at A2 alone still 56 (deviation 1) |
| A3 F5 | MANUAL motion 120–180 s | PI 8.21/8.21/8.18/8.23, PR 81 at 181–185 s | PI --, 1.95/1.99/2.00/1.91 | **PI -- (179–181), 1.95/1.99/2.00/1.91, PR 73–75** (audit) |
| A4 F4 | `fu5-latched`, Chromium | no APNEA (`test.fail`) | philips live 186–215, latched 216–457; saadat live 191–216 | **philips live 191–219, latched 221–456; saadat live 188–214**; 2 passed, 4.1 min |
| A6 | MANUAL agonal 6/12/18 per min | 11.0/min at every rate | 5.8 / 11.6 / 17.0 | **5.8 / 11.6 / 17.0** |
| A7 | renderer / skins | no agent tile | EtAA/MAC tile; skins 179, renderer 89 | tile drawn (shots a7); skins 179, renderer **85 → 87** at A7 (this base had 85; 89 at the gate with A17's 2) |
| A8 | MODELED 1.75 L bleed | flag 508 s | first flag 1200 s (0.49) | **1200 s (0.49 mL/kg/h)** |
| A9 | 12-lead in asystole / P-wave asystole | HR 93 axis 90° / HR 25 axis 74° | null | **null / null**; sinus, VT, AF unchanged |
| A10 C3 | AF 150, healthy 40 y (`fu8-coronary`) | kIsch 0, arrest | 0.89, no arrest | **0.89, no arrest** |
| A11 C2 | 3-vessel CAD, HR 130 | kIsch 0.65, ST 0 | 0.67 / −0.214 (0.69 / −0.200 after A13) | **0.68 / −0.209** at A11; **0.69 / −0.200** at the gate |
| A12 C5 | MODELED 600 s neonate / infant / child | MAP 97 / 98 / 105; CO 0.30 / 0.55 / 1.62 | 64 / 62 / 79; 0.31 / 0.60 / 1.72 | at A12: **64 / 62 / 79; 0.32 / 0.58 / 1.72**; at the gate: 64 / 61 / 77; 0.31 / 0.58 / 1.64 |
| A13 C4 | 127 kg / 175 cm; BMI 30 crossing | 8 890 mL, CO × 1.85 | 6 600 mL, × 1.33; 5 602 → 5 633; 4 335 → 4 377 | **6 600 mL, CO 7.09 vs 5.34 (× 1.33)**; M 5 602 → 5 633 mL (SV 79.1 → 79.6); F 4 335 → 4 377 (63.7 → 64.9) |
| A14 C12 | `pacedVVI {fault, faultRate}` | accepted, no effect | refused | **refused**; under `opts.pacer` accepted |
| A15/16 | controller | — | 223 | **223** |
| A17 | first frame after a reset | 1 sample back | lane-width backfill | as plan; renderer **89** |
| A18 C8 | PH grades | 4.7 WU at every grade | 2.9 / 4.7 / 9.6 | **2.9 / 4.7 / 9.6** |
| A19 F6 | class IV 2.5 L, no resuscitation | min chamber −274 mL, CVP min −3.5 | 11 mL, −0.1 | **11 mL, −0.1 mmHg**; neonate CO 0.322 at A19 (0.308 at the gate) |
| A19 DV-04a | tamponade + propofol → PEA → CPR q 0.8 | MAP 159.1, 11.95 L/min | 24.3 (VF 48.5), 0.57 | **24.3 (VF 48.5), 0.57 L/min**; shot a19: ART 38/17 (24) |
| A20 DV-13d | HFrEF + recent MI, IABP 1:1, 18 min | IABP arm arrests; CoPP 42.8 vs 55.1 | no arrest, 66.9 vs 55.1 | **no arrest, 66.9 vs 55.1** |
| A20 DV-M5 | MANUAL cardiogenic shock | deflation +283 ms | −113 ms | **−113 ms** (18 cycles) |
| A20 | balloon volume over a cut cycle | net +30 mL | 0 | **< 0.5 mL** |
| A21 DV-01b | shock-made PEA / instructor PEA + CPR / untreated | never a pulse / never decays | pulse 201 / 141; agonal → asystole | **pulse at 201 s / 141 s; agonal → asystole** |
| A22 DV-03 | bled-out 3 L → CPR q 0.8 | EtCO2 17.4 | 7.2 | **7.2** |
| A22 DV-02b | VF + CPR q 1, min 2–8 | 18.5 | 16.8 | **16.8** |
| A22 V.1 D25 | 16 kg child CPR flow | 1.01 L/min = 63 mL/kg/min | 19 | **0.30 L/min = 19 mL/kg/min**; its gas-side coRatio **0.071** (V.1's adult guard, §6) |
| A23 DV-23a | CPR on/off | `artefact.cpr` null | {110, 0.8} | **{110, 0.8}, cleared**; shot a23 |
| A24 DV-02a | VF + CPR q 1 | CBF 0.71 | 0.45 | **0.450** |
| A26 DV-17 | HFrEF + LVAD, bleeds | §5 | UNPROTOTYPED | §5 |
| A27 DV-M3 | MANUAL table ROSC | §5 | UNPROTOTYPED | §5 |
| A28 | 16 kg child propofol 2 mg/kg at 120 s, q | 0.202 | 0.94 | **0.935**; 70 kg bit-identical |
| A29 | profile `lungConditions` pe 1 | PVR × 1.00, mPA 18.1 | × 9.0, 64.8 | **× 9.00, mPA 62.9** at 120 s |

## 3. The τ joint scan (Task A10, E-FU8-4) — on this tree at A10's commit

| τ (s) | 200 | 220 | **235** | 250 | 260 |
|---|---|---|---|---|---|
| asphyxial arrest after SaO2 < 60 % (8 tests) | +9.85 | +10.60 | **+11.17** | +11.73 | ✗ none (3 fail) |
| FiO2 1 reversal, HR ≥ 60 after | 6 s | 36 s | **7 s** | 6 s | 7 s |
| S8 tension PTX PEA ≤ 10 min | ✗ +10.08 | +10.00 | **+10.00** | +9.92 | +9.83 |

Joint plateau 220–250 s, as the plan's; its middle is 235 → kept. **S8 sits on its band edge at A10's commit (+10.00 vs
the plan's +9.92)**; from A19 on it is **+9.83** (plan +9.75), at the gate +9.83. Recorded for R44 with the plan's note.

## 4. The rows FU-8 moves (R50 F3, ruling 4)

| Row (test / rig) | origin/main | after FU-8 (measured) | plan | Task | Kind |
|---|---|---|---|---|---|
| S8 tension PTX, PEA ≤ 10 min (`clinical-suite`) | +9.75 min | +10.00 at A10, **+9.83** from A19 | +9.92 / +9.75 | A10, A19 | passing, band unchanged |
| S4a Ali's tamponade, PEA | +165 s | +175 s at A18, **+170 s** from A19 | +170 s | A2–A19 | passing |
| S13 VF CPR CoPP (`it.fails` 15–25) | 25.1–28.8 | **24.9–28.0** | 24.9–28.0 | A19 | pin holds; title re-stated (E-FU8-9) |
| 10-min VF CPR kIsch < 0.9 | `it.fails`, max 0.91 | **0.89** (end 0.85) | 0.89 | A19 | pin FLIPS (E-FU8-9) |
| class IV ROSC, CPR + 2 L + adrenaline (`circ-lowflow-arrest`) | +119 s (band ≤ 180) | **+260 s** at A19, **+265 s** from A22 | +260 s | A19 | RE-STATED ≤ 300 s (E-FU8-9, ruling 3) |
| 7b CPR trough ≤ 30 (`hemo-acceptance`) | `it.fails`, 30.6 | **25.2** | 25.2 | A19 | pin FLIPS |
| exsanguination volume + adrenaline (E-FU4-19 measurement) | 3 L +180 s, 3.5 L +170 s | **no pulse at 2 / 2.5 / 3 / 3.5 L** in 10 min | none | A19 | measurement (W7) |
| FU-4 page, class IV + "CPR + 2 L + adrenaline" (`fu4-shots` scenario 3) | ROSC (3b shot) | **no pulse in 600 s**: agonal → asystole 91 s into CPR | — (not in the plan) | A19 (+A6) | display; 3b NOT re-taken (deviation 5) |
| asphyxial PEA (`circ-hypoxic-arrest`, 5–14 min) | +6.35 min | **+11.17 min** | +11.2 | A10 | passing; title re-stated (E-FU8-4) |
| asphyxia FiO2 1 reversal | 7 s | **7 s** | 7 s | A10 | passing |
| asphyxial PEA decay: agonal / asystole after the arrest | +2 / +75 s | **+76 / +149 s** | +76 / +149 | A6, A10 | passing |
| af-pulse-deficit non-ejecting beats (MODELED) | 14.4 % | **16.7 %** (MANUAL 11.4 %) | ≈ 16.9 % | A6/A10 | passing (10–20 %) |
| Ali's tamponade on the monitor (`audit:monitor A2-ali-b7`) | `***ASYSTOLE` 936.2 s; EXTREME BRADY 948/989/1000 s cycles | **`***EXTREME BRADY` from 947.0 s, `***ASYSTOLE` 1096.9 s** | 947 / 1097 | A2, A6 | display (W20) |
| arrest-etco2 "≥ 17 at +2 min" | `it.fails`, 16.5 | **18.0** | 18.0 | A22 | pin FLIPS (E-FU8-10) |
| R39-2 quality map; +10 breaths/min (`cpr-etco2`) | 13.2 / 20.3 / 24.8 / 27.4; −3 | **20.5 / 25.2 / 26.6 / 26.6; −4.8** | 20.4 / 25.2 / 26.6 / 26.6; −4.8 | A22 | become `it.fails` (E-FU8-10, W22) |
| V.1 `resp-child-rest` "CPR keeps the adult reference" | child 0.29 = adult 0.29 | **child 0.071, adult 0.363** | not in the plan | A22 | becomes `it.fails` (**proposed E-FU8-13**, §6) |
| AF 150 quiet band kIsch ≥ 0.9 (`fu8-coronary`) | 0 (arrest) | **0.89** | 0.89 | A10 | new `it.fails` (limitation) |
| 16 kg child propofol, q at +60 s (dose at 120 s) | 0.202 | **0.935** | 0.94 | A28 | new test |
| 7f `neuro-engine` DI nadir < 52 | `it.fails`, 52 | **51** | 51 | A28 | pin FLIPS (E-FU8-12) |
| massive PE as a profile `lungConditions` | PVR × 1.00, mPA 18.1 | **× 9.00, 62.9** | × 9.0, 64.8 | A29 | V.1 link-profile rows re-measure (ventilator package 95 passed) |
| 16 kg child CPR gas-exchange flow | 63 mL/kg/min | **19 mL/kg/min**; gas coRatio **0.071** under V.1's adult guard | 19 | A22 | handed to FU-6 (the guard) |
| MANUAL table-ROSC SBP/baseline at +10 s (seed 27) | 1.04 (no ramp) | **0.55** (target 0.55) | — | A27 | new test |
| HFrEF + LVAD, 2 L bleed | suction 573 s, flow min 2.47, no ectopy | **suction 595 s, 1.44, PVCs** | — | A26 | new test |
| adults ≠ 70 kg with no height | sized on their weight | sized on (default height ratio) × √(70·W): 80 kg → 74.8 kg, 5 238 mL | as plan | A13 | every suite green |

## 5. The two unprototyped tasks (measured first; R45)

**A26 — the LVAD depends on filling.** Measured on this branch before the change (HFrEF 60 y 80 kg, ventilated, LVAD
5 400 rpm): resting pump flow 3.99 L/min, PI 6.8, resting LV EDV/ESV 159/100 mL (reference EDV 197); 1.5 L over 5 min →
pump flow 1 Hz minimum 3.70, ESV 73 mL, **never below the absolute 40 mL**, no suction; a normal 70 kg LV (reference EDV
130) already sits at ESV 40 (sucking intermittently). Built: the collapse volume scales with the LV's own resting EDV
(the tables' 40 mL at a 120 mL LV: `LVAD_REF_EDV_ML`), a smooth inlet limitation over `LVAD_INFLOW_MARGIN` 0.25 of it down
to the old ×0.3, suction reported as "any event in the second" (it was the instant of the 1 Hz read), and a consumer: PVCs
(`pvc: single, p 0.2`) through the one-shot modifier seam while suction stands (the seam A23 widened; no Stage 5 file).
All constants [ENG]. Result: rest unchanged (3.99, PI 6.8); **2 L bleed: suction 573 → 595 s, flow minimum 2.47 → 1.44
L/min, PVCs while sucking**; 2.5 L: suction from 536 s, then arrest. **DV-17's own cell (1.5 L: flow ≤ 3.0 and suction)
is NOT reached — 3.68 L/min, no suction — `it.fails` with the numbers**: after 1.5 L the reflexes keep the venous return
at ≈ 4 L/min, the native LV stops ejecting and the pump carries all of it; the pump can only take what returns. DV-16d PI
3–5: `it.fails` at 6.8 (native pulsatility; recorded, not refitted, as the plan said). Limitation recorded: while
suction stands the pipeline's PVC setting replaces an instructor's own PVC setting (the pipeline cannot read the
modifiers). Files: `l2/circ/devices.ts`, `l2/hemo/pipeline.ts` (as the plan expected).

**A27 — the MANUAL post-ROSC ramp.** The plan's diagnosis (the tracker's stale pre-arrest history) was **not** the
cause. Measured (MANUAL, VF 30 s → 200 J at 98 s; seed 27 is the first seed whose table draw is ROSC; a pre-selected
"sinus" takes the cardioversion path, which commands no ramp): the instructor's `sbp` target (`l1Target`) read 0.99 of
baseline at +2, +5, +10 s — **the ramp never existed**. The device layer sets 50 % and then "ramp to 100 %" at the same
instant, and `rampValue` returned a zero-duration step's `from` at its own `t0`, so the second retarget started from the
OLD value: 120 → 120. Fixed at `l1/ramp.ts` (a step takes effect at its instant; a ramp with duration still starts from
`from`) — `l3/device-layer.ts` stays FU-7's, untouched; no tracker change was needed. SBP/baseline at +5/+10/+30/+60/+120 s:
0.58 / **1.04** / 1.00 / 1.00 / 1.01 → 0.49 / **0.55** / 0.64 / 0.76 / 0.99, on the target (0.55 at +10). The fix is in
shared L1 code: fast set 271/1 210, every MANUAL/clinical/low-flow/hemo file, controller, demo and validation green.
`l1/ramp.ts` is not in the plan's file map for A27 (the plan named `hemo/pipeline.ts`): declared here (deviation 4).

## 6. `it.fails` (added, flipped) and exceptions

**Added, with numbers:** A10 `fu8-coronary` AF 150 kIsch ≥ 0.9 — **0.89** (model limitation); A12 `fu8-body-size`
neonate CO ≥ 150 mL/kg/min — **0.31–0.32 L/min = 89–91** (W12); A22 `cpr-etco2` quality map — **20.5 / 25.2 / 26.6 /
26.6**, +10 breaths **−4.8** (W22); A22 `resp-child-rest` (V.1) — **child 0.071, adult 0.363** (proposed E-FU8-13); A24
`fu8-cpr-brain` CBF 0.30–0.40 — **0.450**; A26 `fu8-lvad` DV-17 1.5 L — **3.68 L/min, no suction**; A26 DV-16d PI 3–5 —
**6.8**. **Flipped to `it`:** A2 ×3 (`fidelity-lowflow`: LOW PERF 1 → 0 cycles; EXTREME BRADY 1 → 0 in the 3 L bleed and
3 → 0 in Ali's case); A19 ×2 (`hemo-acceptance` 7b 30.6 → 25.2; `clinical-suite` VF-CPR kIsch 0.91 → 0.89); A22 ×1
(`arrest-etco2` 16.5 → 18.0); A28 ×1 (`neuro-engine` DI nadir 52 → 51). Title re-stated, pin held: S13 (24.9–28.0).

**Exceptions used:** E-FU8-1 (A2), E-FU8-2 (A15, A16), E-FU8-3 (A7; snapshot diff +9 AGENTS lines only), E-FU8-4 (A10),
E-FU8-5 (A4), E-FU8-6 (A6; the plan's darwin hash `d9075744` — the check runs on darwin only, not verifiable here),
E-FU8-8 (G), E-FU8-9 (A19), E-FU8-10 (A22), E-FU8-11 (A22), E-FU8-12 (A28). E-FU8-7 not used (B4, Part B).

**Proposed E-FU8-13 (needs the orchestrator's approval):** V.1 merged into main after the plan was written. Its
`test/engine/resp-child-rest.test.ts` "CPR keeps the adult reference" asserts the premise A22 removes (that
`cardiacOutput()` returns an ADULT-absolute compression flow, so the resp guard `h.cpr.active ? CO_REF_LPM :
coRefLpm(rs.pat)` keeps a child at the adult's 0.29). After A22 the child's CPR flow is its own (19 mL/kg/min) and the
adult guard divides it by the adult reference: child **0.071**, adult **0.363**. The fix is that guard line in
`l2/resp/pipeline.ts` — FU-6's anchor and on FU-8's never-touch list; the plan already hands it to FU-6 ("make it
`coRefLpm(rs.pat)` for both cases"). R45: the test is pinned `it.fails` with both numbers (no band changed); after FU-6's
edit its property (child ≈ adult) will need re-stating by FU-6 too (child 0.30/1.2 = 0.25 vs adult ≈ 0.34).

## 7. Screenshots (`docs/gates/fu-8/`, ≤ 60 KB; Chromium, scale 0.6, a23 at 0.5)

- `a1-ali-tamponade-abpm-live.png` — FU-4 page, Ali's tamponade at MAP 23: `**ABPm 23<70` on the bar, ART 25/22 (23).
- `a4-fu5-latched-{philips,saadat}-like.png` — the fu5-latched e2e pair (A4 run).
- `a7-agents-tile-{philips,saadat}-like.png` — stage7f induction +720 s: EtAA 1.2 %, MAC 0.7 on both skins.
- `a19-tamponade-cpr-arterial.png` — tamponade PEA + CPR q 0.8 (+90 s): ART 38/17 (24).
- `a23-vf-cpr-artefact-lead-ii.png` — VF + CPR q 1 at 130 s: the compression artefact on lead II.
- `docs/gates/fu-4/5a-burns-sux-sine.png` re-taken with E-FU8-8 (+215 s): wide peaked hyperkalaemic complexes at MAP 85,
  6 s before VF (VF at +222 s on this tree, the plan said +225). **3b not re-taken** (deviation 5); the latched APNEA
  presentation D2 describes is shown by the A4 pair.

## 8. Deviations from the plan

1. **A2's `fu8-agonal-qrs` test landed with A6**, not A2: at A2's commit it still read 51 / 125 / 56 (the flicker in that
   rig needs the honest agonal rate); with A6 53 / 34 / 16. A2's own fix is proven by its three flipped pins.
2. **A22: V.1's `resp-child-rest` guard test pinned `it.fails`** — proposed E-FU8-13 (§6).
3. **A22's quality-map title** carries the measured 20.5 (plan 20.4) for quality 0.5.
4. **A27 fixed `l1/ramp.ts`**, not the MANUAL tracker in `hemo/pipeline.ts` (§5): the measured cause.
5. **FU-4 3b not re-taken**: the FU-4 page's class IV "CPR + 2 L + adrenaline" (started 60 s after the page sees the
   agonal PEA) regains no pulse in 600 s on this tree — the agonal rhythm decays to asystole 91 s into CPR, before the
   A19 ROSC time (+260 s) — so there is no ROSC to photograph; the original 3b was restored. Declared as a moved row (§4).
6. **The CM/DV cells** (research/19 §9, research/20 §9) were not run: their scripts are outside the repository (§0).
7. **Slow-group times are contended** (§0); **tick bench** compared base vs FU-8 on the same container (§0), not against
   the FU-4 gate's Mac 0.52 ms. The validation package's local tick bound (p50 < 2 ms without `CI`) fails on this
   container on the unchanged base too (base 1.75–2.31 ms); with `CI=1` (6 ms) it passes.
8. **A1's latched-text test** failed on main as well (the plan said it would pass there): the text was frozen at the raise.
9. Renderer counts differ from the plan's by the base (V.1's main has 85; +2 at A7, +2 at A17 = 89).

## 9. Handed to / Waiting on Ali — numbers that moved

- **FU-6:** V.1's CPR guard (`l2/resp/pipeline.ts`) — now with its test pinned (§6): child CPR coRatio 0.071 on the
  merged tree. Everything else in the plan's "Handed to" table stands.
- **FU-7 Task 0:** re-anchor on FU-8 Part A as listed; additionally `l2/circ/devices.ts`/`l2/hemo/pipeline.ts` (A26 LVAD
  lines) and `l1/ramp.ts` (A27). AF quiet band stays `it.fails` at 0.89 (guard path). Arrest-state precondition (6c)
  holds (shock-made PEA: pulse at 201 s).
- **W7:** no pulse at 2 / 2.5 / 3 / 3.5 L; the class IV ROSC +265 s; the FU-4 page's class IV resuscitation no longer
  gets a pulse (asystole 91 s into CPR).
- **W12:** neonate 0.31 L/min = 89 mL/kg/min at the gate (MAP 64), infant 61 / 0.58, child 77 / 1.64.
- **W18 (A25):** unchanged — 34 invalid samples / 16 flips.
- **W20:** EXTREME BRADY 947.0 s, ASYSTOLE 1096.9 s.
- **W22:** 20.5 / 25.2 / 26.6 / 26.6; −4.8; CBF 0.450.
- **New for the calibration pass (A26):** how much a 1.5 L bleed lowers an HFrEF patient's venous return with an LVAD
  running (DV-17's 1.5 L cell: pump 3.68 L/min, no suction; a 2 L bleed sucks); the LVAD constants `LVAD_REF_EDV_ML`,
  `LVAD_INFLOW_MARGIN`, `LVAD_SUCTION_PVC_P` are [ENG].
