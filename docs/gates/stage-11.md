# Gate note — Stage 11: the showcase-2 scenario set

Branch `stage-11` from `origin/main` `26e78308` (FU-7.1 b and FU-11 b merged; FU-11 d not merged — `fu11-follower.e2e.ts`
is not on main, so it was not run). Plan: `docs/plans/stage-11-scenarios.md` (R50 reviewed). Executor: one local session
(Claude Opus 5.5), Tasks 0–7 in order, then this gate. `origin/main` did not move during the run (`git merge origin/main`:
already up to date). Every number is seed 7 on this Mac, shared with other executors (wall times are contended).

## 1. Blocks and commits

- Task 0: the four FU-7.1 b / FU-11 b files exist on main; `blocks.py check` against `origin/main`: **30 blocks, 20 files,
  0 problems**. Every block was applied mechanically, task by task, in plan order; at the end the 20 files are byte-identical
  to `scratch/plans-backup/stage-11-proto-files/` (re-checked with `cmp` and `blocks.py check`). No block was re-cut.
- One commit per task (the plan, T1–T7), each pushed. Red runs as the plan expects: S3 5 of 6 fail on main's card (the
  prompt case passes by design), S2 5 of 5, S4 / S1 "no showcase document", Task 6 `SHOWCASE_ORDER` undefined.
- Files touched: only the plan's declared partition (`apps/demo/src/app/showcase/**`, `scenarios.ts`, `showcase.test.ts`,
  `apps/demo/vite.config.ts`, `.github/workflows/ci.yml`, `scripts/showcase/{rehearsal,sound}.showcase.ts`,
  `scripts/showcase/make-videos.mjs`) plus the plan copy and this gate's docs. No file under `packages/`.

## 2. Suites

| check | result |
|---|---|
| `pnpm -r typecheck` | clean |
| `PME_SHOWCASE_PRINT=1 PME_TEST_SET=showcase vitest run` (apps/demo) | **5 files, 20 passed** (4 min 38 s; S1 105 s, S3 85 s, S2 42 s, S4 21 s, S5 21 s) |
| `PME_TEST_SET=fast vitest run` (apps/demo) | **27 files, 216 passed**; lists no `*.slow.test.ts` |
| `PME_TEST_SET=showcase vitest list` | exactly the five slow files |
| `showcase-cards.test.ts` + `showcase.test.ts` | 12 + 2 passed |
| kit scripts `tsc --strict` / `node --check make-videos.mjs` | clean |
| e2e `showcase-clock`, `fu11-restore`, `fu11-vent-restore` (Chromium + WebKit, `--retries=0`) | **6 passed** |
| kit: `rehearsal` + `sound` + `multiwindow` on the built kit (perl launcher), Chromium + WebKit, 2 workers | **20 passed (30.0 min)** = 8 + 1 + 1 per engine |
| CI `test-slow (showcase)` | passed, 13 min 12 s (§6) |

## 3. Measured numbers (Step 2, `PME_SHOWCASE_PRINT=1`)

Every printed number equals the plan's "Prototype results" (all inside their R45 bands; none at a band edge worth noting).

```
S3 prompt      mapBefore 95.22 hrBefore 71 apnoeaAlarmS 55.54 mapNadir 64.59 @105 s hr 70–79 capnoS 6 etco2At2min 37 spo2Min 99 mapAt4min 72.18
S3 untreated   lastBreathS 47.56 desatStateS 494 bradyStateS 566 hrAtBrady 44 spo2ZeroS 724 mapAtSpo2Zero 76.83 pulseLossS 1200
               sao260ToLossS 634 asystole firstSpontS 923.08 (36 mL, max 41) effortStateS 923 effortLabelLagS -0.08 etco2/awrr during efforts 0/0
S3 induced late inducedS 240 desatStateS 501 bradyStateS 574
S3 bag-mask    no arrest, spo2Over90S 32 hrOver60S 4 mapAt5min 83.4 etco2At5min 48
S3 tube @18min no arrest, mapAtTube 45.13 spo2Over90S 46 mapMax5 98.85 triggeredS 1140
S3 CPR         cprS 1214 pulseBack 0 spo2 99 etco2 34 map 49.73 during CPR
S2 happy       hrAt60 99 sys/dia 106.21/86.72 cvp 17.15 etco2 32 pulsus mean 0.85 max 1.58 deterioratingS 373 (HR 135, CVP 20.12)
               pulseLossS 471 peaStateS 472 drainS 602.1 roscAfterDrainS 95.9 sys/hr/cvp/etco2 +60 s 117.82/63/10.31/35 sysMaxAtRosc 155.39 pulse held
S2 epinephrine roscAfterDrainS 93.9 · undrained: no pulse, cvpMax 31.94, etco2Plus3 9 · ×8 poll: pulseLossS 471.2 peaStateS 472.8 roscAfterDrainS 95.2
S2 early drain no PEA, sysAtDrain 60.32 sysPlus60 122.1 hrPlus60 69 cvpPlus60 6.79 sysMax 154.78
S4 no pressor  mapAt10 95.58 hrAt10 71 mapBefore 89.69 hrBefore 62 awrrBefore 5 etco2Before 48 apnoeaAlarmS 42.56 mapNadir 51.98 @116 s hrAtNadir 56 hrMin5 55 spo2Min 99 mapAt4min 57.67
S4 ephedrine   ephedrineS 115 mapAtDose 52.05 hrAtDose 56 mapPlus60 59.02 mapPlus120 66.96 hrPlus120 59 mapOver65S 96
S4 phenylephr. mapPlus60 73.44 hrPlus60 53 hrMin 52
S1 untreated   earlyMin 6.85 establishedMin 18.77 (EtCO2 81, HR 142, pH 7.09, K 5.7, lactate 4.6, MAP 98.02) hrMax 190 kMax 6.4 lossMin 44.35 VF tc 42.34 K 6.4 arrestStateMin 44.7
S1 early       crisisMin 8.85 recoveringMin 16.97 never established tcMax 38.01 hrMax 93 kMax 4.8 etco2Plus5 47 hrPlus15 85
S1 late        crisisMin 19.77 dantroleneMin 20.77 at the call EtCO2 60 tc 38.71 K 5.8 pH 7.19; etco2Plus2 54 tcMax 39.5 @31.17 min kMax 5.9 lactateMax 7.4
               recoveringMin 30.8 normoMin 38.93; at 60 min HR 91 MAP 112.01 tc 38.7 EtCO2 38 pH 7.38 K 3.8; sysMaxAfterCall 157.52
S1 explore     the 22 asserted "Changed only" rows present at 1180 s (≈ 150 rows change in all)
S5 haemorrhage HR/sys at 2/4/6/8 min 81/113.99 96/107.9 121/98.89 142/75.28 (MAP 65.87) pulseLossS 629 roscIntoCprS 176 sysOver90IntoCprS 178
               1 min after stopping CPR 135.4/90.58 HR 75 EtCO2 35
S5 anaphylaxis hrAt2 139 sys 96.26 MAP 77.68 sysOver110S 11 hrPeak 178 +2 min 118.44 / MAP 96.97 / HR 110 · untreated mapAt3 52.62 pulseLossS 315
```

## 4. The run sheets in the browser (Step 4)

The browser walk was done by the kit rehearsal itself (Task 7's script runs each run sheet's presenter column at ×4 in a
fresh page, both engines, and writes the monitor at each row), plus one Chromium probe of S4's awRR (the rehearsal records
the generic RR channel, not the awRR tile). The full tables and the comparison against this plan's run sheets:
**`docs/gates/stage-11/run-sheet-numbers.md`**. Every monitor number named by the plan's run sheets is inside its R45
tolerance on both engines; nothing to STOP on. The evidence (run-sheet tables, JSON, screenshots, the multi-window and
sound results of this run) is in `docs/gates/stage-11/showcase/`; `docs/showcase` was restored (`git checkout`), the kit
job rebuilds it from the gate folder.

Findings for the orchestrator (none changes a number):

1. **Limit alarms are off in the app's factory state.** The plan's run sheets quote the ENGINE's limit alarm texts
   (`**RR 7<8` S4 1:24, `**SpO2 86<90` S3 11:46, `**HR 44<50` S3 12:36, `**etCO2 0<30`, `**CVP 14>10` S2). In the browser
   the top bar says "Limit alarms off" (FU-11 H3) and none of these sounds; only the always-on ones do (`CO2 APNEA`,
   `SPO2 LOW PERFUSION`, `IBP1 STATIC PRESSURE`, `SPO2 NO PULSE`). **S4's first objective ("Acknowledge the
   respiratory-rate alarm … within 30 s") cannot be met unless the presenter turns limit alarms on first.** Decide: a
   run-sheet line ("turn limit alarms on before loading S3/S4/S2"), or re-word the objective.
2. **Haemorrhage "pulse lost": monitor vs engine truth.** The plan's 10:29 is the engine's arrest (truth). On the monitor
   the arterial line goes static at **10:01** (`IBP1 STATIC PRESSURE`) and `SPO2 NO PULSE` sounds at **10:36**, both
   engines. The old run sheet's 10:03–10:08 matches the monitor's static line, so Q3's "pulse lost 10:03–10:08 → 10:29"
   compares two different definitions; the ROSC change (≈ 255 s → 176 s, same criterion: systolic > 90 from the CPR
   press) is real. The card's story ("about 10½ minutes") fits the `NO PULSE` alarm the presenter acts on.
3. Haemorrhage at "Pulse back: stop CPR": a transient arterial overshoot, 159/85 (Chromium) and 183/82 (WebKit) in the
   second after the press, 135/90 a minute later on both. Not a run-sheet number; noted for the presenter.
4. The browser's generic RR channel reads 0 for ≈ 4 s between the slow breaths of S4's premedication (the awRR tile, which
   is what the skin shows, stays 9 → 5 exactly as the plan). Not a tile on the default skin.

## 5. Owner questions, rulings and follow-ups

| Q | Ruling | Applied |
|---|---|---|
| Q1 six Showcase cards | accepted | `SHOWCASE_ORDER` (Task 6) |
| Q2 bronchospasm leaves Showcase | accepted | `category` "Airway and breathing" (Task 4); still in the library |
| Q3 haemorrhage story numbers | update the prose | Task 3. **Kit run sheet old → new: pulse lost 10:03–10:08 → 10:29 (engine truth; the monitor's static line is still 10:01, finding 2); ROSC 254.5–257.5 s → 176 s into CPR (178 s to systolic > 90); the story now says "about 10½ minutes" and "about three minutes".** |
| Q4 S3's asystole does not come back | keep; story says so | S3 story; the CPR case pins it |
| Q5 manual "Induce now", FiO2 1.0 held | applied (D-4) | S3 / S4 |
| Q6 MH active cooling / dantrolene infusion | not this stage | **F-1**: `pme-scenario/1` gains `thermal` and `infusion` event kinds (a later stage) |
| Q7 untreated MH ends in VF from hyperthermia | accepted | **C-2** (owner, calibration pass): does K keep rising in untreated MH? The engine plateaus at 6.4 (hazard 8.5) |
| Q8 post-MH hypertension | calibration queue | **Known miss C-1**: after the treated MH (run-sheet path) MAP 112–120 at HR 85–97 for > 30 min (145–156/96–105; browser 40:00 151/99 (116), both engines). Most likely FU-7.1 B1's acidaemic blunting ending as pH normalises while MH activity decays (τ 600 s). Not fixed here |
| Q9 no rocuronium top-up in MH | accepted | — |
| Q10 both vasopressor buttons in S4 | accepted | S4 |
| Q11 the 30-minute programme and order | accepted | "Order and durations" |
| Q12 the kit's scripts follow the six cards | applied | Task 7; this gate's rehearsal and `run-sheet-numbers.md` |
| Q13–Q15 (new, R50) | open, gate nothing | as in the plan |

## 6. CI

The new `test-slow (showcase)` job (an eighth `test-slow` matrix entry, its own step, `PME_TEST_SET=showcase`), PR #48's
first CI run (run 38100631999, head `46ca3f55`): **passed in 13 min 12 s**, of which the `vitest run` step took 12 min 58 s
(5 files, 20 cases, one file at a time; 4 min 38 s on this Mac). It runs in parallel with slow-a … slow-g, all started
together, so it adds no wall time while it stays under the longest engine-core group.
