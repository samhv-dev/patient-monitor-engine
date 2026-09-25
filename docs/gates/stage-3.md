# Gate 3 — Respiratory, gas exchange and temperature (date: 2026-09-25)

Gate question: "Does the airway-loss sequence feel right to an anaesthetist — EtCO2 gone at once, SpO2 falling late and still falling after the airway is back — and do the capnogram patterns read correctly at a glance?"

Branch `stage-3-respiratory-gas`, based on `main` `f88175d` (Stage 2 merged, Stage 6b merged), built task by task from `docs/plans/stage-3-respiratory-gas.md` (25 tasks, every step ticked). Tasks 1–13 were executed before a usage cap; Tasks 14–25 were executed by a resumed session from commit `6d27b81`. The numbers below were measured on the finished branch by re-running each acceptance test's own computation with the values printed (a scratch Vitest file, not committed). Every one is inside its acceptance band, and every one equals the plan's prototype value (the plan's "Prototype results") except where noted.

| Check | Result (prototype in brackets where it differs) |
|---|---|
| Clean install typecheck / `pnpm -r test` / build / check-notices | `exit 0` on all four. engine-core **369** (77 files; 305 before this stage + 64 new), renderer **35** (34 + 1 added with the RESP auto-scale fix), controller **185**, audio **58**, skins **155**, validation **16** — 818 in total. `check-notices: OK (3 governed files)`. `PW_SYSTEM_CHROME=1 test:e2e`: **13 passed** (1.7 min) |
| Acceptance 1: capnogram α on the 25 mmHg/s axis; phase III rise; bronchospasm | Ventilated RR 12: sidestream α **105.6°** (105.3–105.7 over 7 breaths), mainstream **100.5°** (100.2–100.8); phase III **+1.4 / +1.5 mmHg** (band 1–3). Bronchospasm severity 1: α **157.4° / 158.7°**; severity 0.5: **131.1° / 130.7°** (must be ≥ 120°) |
| Acceptance 2: sidestream delay and rise; RR 60 under-read | Breath event → 10 % downstroke **2.332–2.348 s** (mean 2.342; band 2.3 ± 0.1). Sampler step response: sidestream delay 2.312 s, 10–90 % rise **240 ms** adult, **192 ms** neonatal; mainstream **48 ms** (< 60). Neonate RR 60, VT 25: plateau mainstream 43.91, sidestream 42.96 mmHg, i.e. sidestream **−0.94 mmHg** (plan decision 5; BUILD-PLAN guessed > 3; R29 accepted) |
| Acceptance 1c/1d: oesophageal, rebreathing, curare cleft | Oesophageal intubation: 3–5 visible breaths of decreasing height, then flat (< 1 mmHg). Rebreathing (fico2 6): FiCO2 numeric ≥ 5 throughout. Cleft (effort 0.6, RR 8): notch ≥ 3 mmHg |
| Acceptance 3: disconnection | No breath event after the disconnection; trace < 1 mmHg from +5 s; `apnoea-co2` alarm raised **+16.9 s after the event**, which is **20.0 s after the last displayed breath** (band 20 ± 1) |
| Acceptance 4 / M4: first breath after 60 s apnoea | EtCO2 36.0 before → first breath **45.3 mmHg (+9.3)** (band +9 to +15) |
| EtCO2 kinetics (model, GA 70 kg) | Apnoea PaCO2 **+12.0 mmHg in minute 1, then 3.34 mmHg/min**. +33 % alveolar ventilation: **35.7 % at 2 min, 38.3 % at 2.5 min, 40.8 % at 3 min, 90 % at 24.4 min**. VA halved: 18.2 % of the rise at 2.5 min, PaCO2 79.6 after 2 h (target 80) — the halving is slower, as research 03 §4.4 says (plan decision 3, R29) |
| Arrest / CPR EtCO2 (engine) | VF without CPR: EtCO2 < 5 mmHg at **+19 s** (limit 30 s). CPR quality 1 (CO ratio 0.31): EtCO2 **21.0, 22.9, 24.1 mmHg** in minutes 1–3 — slowly creeping up as the tissue store fills (prototype band 10–20 was a demo estimate, not an acceptance; see "Needs a ruling" 6) |
| Acceptance 5: desaturation to SaO2 90 % (GA, apnoea) | Preoxygenated 70 kg adult **501 s (8.4 min)** (Benumof 8; band 6.5–9.5 min). Room air **41 s** (R29 band 40–90 s, pending Ali — see "Needs a ruling"). Child 4 y / 16 kg preoxygenated **158 s** (Patel 160 ± 31). Obese 127 kg / 175 cm **170 s (2.8 min)** (Benumof 2.7) |
| Acceptance 6 / R8: the lag structure | 15 s after airway obstruction: EtCO2 **0**, displayed SpO2 **97**. SaO2 truth reached 85 at **41 s** of obstruction while the display still read **94**. After the BVM rescue (FiO2 1) the displayed SpO2 kept falling to **86**, lowest **+20 s** after the rescue (band 10–30), back ≥ 90 at +26 s |
| SpO2 dead time at normal CO | SaO2 target step 96 → 85: first displayed move **+19 s** [18], 90 % of the change **+29 s** [28], i.e. 14 s after the site step (limit 20). The 1 s difference is the perf fix (see Notes) |
| SpO2 validity | VF: SpO2 invalid **+11 s** after the rhythm change (band 10–30). PI 0.2 → `questionable` (LOW PERF). Same-limb NIBP cuff: SpO2 held valid 95–99 through the whole cycle |
| M6 PPV through the respiratory driver | Ventilator 15/min, VT 500: **6.9 %** at g 0.05 (band 5–10), **22.5 %** at g 0.2 (band 15–30). Spontaneous at g 0.2: **10.0 %** (smaller, as required). Stage 2's PPV test now runs on the ventilator (exception (c)) and still passes |
| PEEP → haemodynamics (MANUAL, plan decision 7) | Ventilator command PEEP 5 → 15, volumeStatus 1: CO **4.88 → 4.42 L/min (−9 %)**, MAP **97 → 83**, CVP **6.0 → 8.2**. volumeStatus 0.3: CO **4.87 → 3.77 (−23 %)**, MAP **97 → 68**, CVP 6.0 → 8.2 |
| RR three ways (ventilator 14/min, sinus) | awRR **14.0**, impedance **14.0**, pleth-derived **13.9** (all within 1/min) |
| Obstructive apnoea | Obstructed spontaneous breathing: `apnoea-co2` raised, `apnoea-resp` NOT raised; impedance RR > 10 (the chest keeps moving; research 03 §7) |
| Acceptance 8 / R27 ventilator link (50 Hz VentFrame, RR 12, VT 500, FiO2 0.4, PEEP 5) | **11.8 breaths/min** over minutes 5–10 (band 12 ± 0.5); breath events VT **500 mL**, Ti **1.60 s**; EtCO2 displayed **45–46** vs truth 45.3 (steady, within 2); SpO2 **99**. Frames' PEEP 5 → 15: CO **4.93 → 4.34**, MAP **97 → 81**, CVP **6.0 → 8.5**. CVP respiratory swing (1 s moving average) VT 500 **3.53** → VT 800 **5.45 mmHg (×1.55)**, must be > 1.3× |
| lungState (R27) contents | t = 0 (70 kg adult): `{ complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 1, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 215, frcMl: 2100 }` (dead space = 154 mL anatomical + 61 mL added by the MANUAL etco2 calibration at start-up, plan decision 2; the plan's prototype table quoted the anatomical 154 alone — the engine-core source is byte-identical to the plan author's reference tree, so this is the prototype's behaviour too). Bronchospasm severity 1: resistance **40**, autoPeepTendency **0.8**, shunt 0.09. Endobronchial: compliance **25**, shunt **0.29**. Re-emitted only on change |
| Acceptance 9: tone | pitch(90) **830.6 Hz**, pitch(100) 880.0, pitch(80) 784.0, invalid 880.0. Engine: the QRS tone's `freqHz` equals pitch(displayed SpO2) to 3 decimals |
| Acceptance 7: temperature (model, 70 kg) | GA: **−1.28 °C at 60 min**, **−0.39 °C in hour 2**, −0.25 in hour 3, hour-8 plateau **34.65–34.67 °C**. Neuraxial: −0.93 °C in hour 1, 32.94 °C at 8 h, still falling 0.27 °C/h in hour 8. Forced-air warming **+0.57 °C/h** vs GA. Probe 63 % times after a +2 °C core step: oesophageal 45 s, nasopharyngeal/tympanic 120 s, axilla 300 s, bladder 12 min, **rectal 40.0 min** |
| MH | Heat model (severity 1, onset 10 min): core **+1.17 °C in minutes 30–45**, VCO2 × **3.00**. Engine at fixed ventilation (RR 12, VT 500): EtCO2 **38 → 124 mmHg** and core **36.52 → 37.99 °C** in 30 min |
| Determinism hash | SHA-256 over 60 s of co2/resp/pleth/abp with a scripted command list (preoxygenate, ventilator, bronchospasm, disconnection, reconnection, spo2 ramp): seed 42 → `cfacb8da84e6d6a6…` on two runs; seed 43 → `a96201c74db0c3f2…` (differs) |
| 24 h no drift at 62.5 Hz | After `advanceTo(86400)`: `latestSampleIndex('co2')` = `latestSampleIndex('resp')` = **5,400,006** and `ecgII` = 43,200,050, exact. 94 s under Vitest in the full run (yields each sim-minute, 300 s timeout). Stage 2's 125 Hz and main's ECG 24 h tests pass alongside (103 s and 90 s) |
| Demo (`stage3.html`) | Headless system Chrome, render path `worker-raf`, `page errors: []` |

## Screenshots (`docs/gates/stage-3/`, 900 px wide, 45–58 KB each)

- **spontaneous** — rounded spontaneous capnogram (the trace starts 2.3 s late: sidestream), impedance with small cardiogenic ripple; RR 15.
- **ventilated** — the ventilator at 12/min: square capnogram, α ≈ 105°; compare with *spontaneous* (ventilator vs spontaneous).
- **shark-fin** — bronchospasm: slow phase II upstroke and sloping plateau; EtCO2 lower.
- **curare-cleft** — RR 8 with diaphragmatic effort 0.6: the notch in the plateau.
- **rebreathing** — inspiratory baseline off zero, FiCO2 6 on the tile.
- **oesophageal** — fading gastric-CO2 bumps, then flat.
- **sensor-off** — CO2 line and SpO2 probe off: no CO2 trace, EtCO2 0 / awRR 0 APNEA, SpO2 `-?-` NO PULSE, pleth flat.
- **r8-desaturating** (1/3) — apnoea after preoxygenation at ×4: CO2 flat, RR 0 APNEA (the impedance shows only the small cardiogenic ripple), SpO2 still 96 while the white truth line bends down.
- **r8-still-falling** (2/3) — ≈ 10 s after the BVM rescue: the first breath shows the accumulated CO2, the white SaO2 truth is already rising, the cyan displayed SpO2 is still going down (89).
- **r8-recovered** (3/3) — both lines back up.
- **mh** — MH at fixed ventilation (×4, ≈ 8 sim-min): EtCO2 68 and rising (the trace clips at the 50 mmHg lane top), core temperature rising.

## Needs a ruling (for Ali / the orchestrator)

1. **Room-air apnoea to SaO2 90 % in 41 s** (plan decision 4; R29 set the band to 40–90 s pending Ali). The brief says 1–2 min; the literature says desaturation *begins* at ≈ 45–60 s. Lengthening it would need FRC ≥ 3.5 L and would break Benumof's 8 min.
2. **CO2 constants refitted** (decision 3, accepted in R29): the brief's §4.4 constants should be updated to C_f 6, C_s 55 mL/mmHg, k_fs 18 mL/min/mmHg; the "halve MV → 30–40 % in 2–3 min" acceptance is tested as a +33 % VA step.
3. **Sidestream under-read at RR 60 ≈ 1 mmHg** (decision 5, accepted in R29).
4. **MANUAL PEEP coupling only above mean airway pressure 10 cmH2O** (decision 7, accepted in R29; Stage 7 replaces it).
5. **MANUAL gas targets are calibrations; `pin` stays a hard override** (decision 2, R29).
6. **CPR EtCO2 21–24 mmHg in minutes 1–3 at quality 1.** The plan's prototype line said "10–20 mmHg over minutes 1–3"; it was never an acceptance test. Measured with the plan's code, a quality-1 CPR gives CO ratio 0.31 and EtCO2 ≈ 21–24 mmHg — within the range good CPR produces clinically (> 20 mmHg is the quality target), so no change was made.

## Deviations from the plan (all recorded; none widens an acceptance band)

- **CI rule (binding, G2):** every Stage 3 engine test goes through a new `run(e, t)` helper in `test/helpers/resp.ts` that advances one sim-minute at a time and yields (`setImmediate`); describes take `{ timeout: 300_000 }`; `desatTime` is async. The ventilator-link test yields once per sim-minute inside its frame loop and its own timeout is 300 s (the plan had 60 s). The determinism test's local `run` was renamed `hashRun`.
- **Room-air band 40–90 s** (R29) instead of the plan's 30–120 s.
- **Renderer fix (not in the plan):** the RESP lane's auto-scale keeps a 0.5-unit minimum span. On the first gate screenshots the 10 % cardiogenic ripple in apnoea was gained to full height and read as tachypnoea. `autoRange` gained an optional `minSpan` (default unchanged, so the pleth is untouched); one renderer test added.
- **Perf fix (not in the plan):** the circulatory delay history (`l2/gas/delay.ts`) is kept at 1 Hz (72 points) instead of 10 Hz (700). The engine structured-clones its whole state every tick; the 700-number ring was two thirds of the respiratory state and made tick-by-tick runs (the scenario driver, the worker loop) ≈ 35 % slower than main. Now ≈ 10 % (5 sim-min tick by tick: main 3.0 s, before 4.1 s, after 3.3 s). Effect on numbers: the SpO2 step's first move 18 → 19 s, 90 % point 28 → 29 s; nothing else moved.
- **Screenshot script:** extended to the gate list (rebreathing, sensor-off, three R8 frames, MH; the plan had seven shots), 900 px viewport, monitor-only clips, the controls hidden for the frames that show the truth-vs-displayed plot, so every PNG is ≤ 60 KB.
- **Base drift:** every find/replace block of Tasks 14–23 matched `main` `f88175d` exactly once; none needed the reference tree. The previous session (Task 1) added a `ClinicalEvent` cast in `packages/controller/src/scenario/driver.ts` because Stage 6b (merged after the plan was written) forwards `applyEvent` events typed as the brief's `ClinicalEvent`; engine-core's union now also carries `thermal` and ventilation `fico2`/`effort`.
- **Commit trailer:** the plan's `Co-Authored-By: Claude Opus 5.5 (1M context)` line was used throughout (the harness's attribution line), consistently with Tasks 1–13.

## Partition

- Nothing changed under `src/l2/ecg/**`, `src/l3/nibp/**`, `templates/`, `packages/skins`, `packages/audio`, `l3/alarms`, `l3/defib-pacer`, `l3/capture12`, `l3/trends`.
- `src/l2/hemo/**`: **15 changed lines** (7 out, 8 in) — exactly exception (a), the optional `u(t)` seam (R-S3-1, authorized in R29).
- `packages/controller`: `controller-session.ts` (+2, the log-formatter cases), `host-session.test.ts` (the `spo2` → `k` test move) — exception (b)/(c), authorized in R29 — plus the one-line `ClinicalEvent` cast in `scenario/driver.ts` noted above.
- Renderer edits are additive and marked `// Stage 3` (`wave-lanes.ts`, `monitor-core.ts`, `mount.ts`, `index.ts`, new `numerics-resp.ts`); the layout wiring is untouched apart from the new lanes/tiles appearing when requested.
- No new NOTICES rows (nothing borrowed).

## Notes

- **Local timing.** The first full run on this machine hit Stage 2's 300 s timeout on its 24 h test and 30 s timeouts in the controller's scenario-driver tests while an unrelated emscripten build held the load average above 100. After the load dropped (and after the perf fix) the whole suite passed, with the three 24 h tests at 90–103 s. Stage 3 adds ≈ 7 % to a single long `advanceTo` (profiled: `advanceResp` 7.5 % of CPU) and ≈ 10 % to tick-by-tick runs.
- **For Stage 4b (R30):** Stage 3 now supplies `breath` events, `apnoea-co2` / `apnoea-resp` alarm events (`high`, `physiological`), SpO2/EtCO2/imco2/awrr/rr/tempCore/tempSite numerics, and the ROSC EtCO2 wash-out. There is no separate CO2-line technical alarm yet: `attachSensor co2 off|warmup` gives invalid numerics, which 4b can map.
- Follow-ups logged in R29 stand: R-S3-3 (ECG RSA reads the breath driver, Stage 5.1), R-S3-4 (skins carry SpO2 averaging / apnoea delay / tone step, Stage 4b), R-S3-5 (venous-return model and an induction `thermal` event, Stage 7).
