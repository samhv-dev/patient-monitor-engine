# Patient-Monitor Engine: Staged Build Plan (v1)

*Status: design phase, 2026-09-24. This is the roadmap (R10, R11), not a task plan. Before each stage starts, a writing-plans-format task plan is written for it (`docs/plans/stage-N.md`). Opus executes one bounded stage at a time. At each gate the orchestrator inspects the running demo and the tests, and the next stage starts only on a "yes". Every name here (packages, commands, events, IDs) is defined in `DESIGN-BRIEF.md`, and section references (§) point there.*

## Monorepo layout (target at v1)

```
repo/
├── package.json · pnpm-workspace.yaml · tsconfig.base.json · vitest.workspace.ts · .github/workflows/ci.yml
├── LICENSE (MIT) · NOTICES.md · LICENSES/ (third-party texts) · README.md · docs/ (brief, plan, plans/stage-N.md)
├── packages/
│   ├── engine-core/   @pme/engine-core  src/{clock,rng,buffers,commands,events,scenario}/  src/l1/{state,manual,modeled,backend}.ts
│   │                                    src/l2/{ecg,hemo,pleth,co2,resp,temp}/  src/l3/{ecg-filter,qrs,hr,spo2,nibp,alarms,defib-pacer,capture12}/
│   │                                    templates/ (Int16 VF/AF texture files, NOTICE-ID headers)
│   ├── renderer/      @pme/renderer     sweep-lane.ts, decimate.ts, overlays.ts, calibration.ts, worker-host.ts, numerics-dom.ts, trends.ts, mount.ts
│   ├── audio/         @pme/audio        context.ts (unlock), clock-map.ts, scheduler.ts, tones.ts, iec-bursts.ts, saadat-bursts.ts
│   ├── controller/    @pme/controller   protocol.ts, transport/{in-process,post-message,broadcast-channel,websocket,webrtc}.ts, panel/, remote/, relay/ (Node bin)
│   ├── skins/         @pme/skins        schema.ts, skins/{saadat-like,philips-like,ge-like,mindray-like,zoll-like,lifepak-like}.json, themes/{projector-light,ecg-grid}.json
│   └── validation/    @pme/validation   harness/, metrics/, sanity/, datasets/ (fetch scripts → git-ignored cache), review/ (blind review page), golden/
└── apps/demo/         Vite multi-page app: one page per stage (stage0.html … stage8.html) + index
```

**Toolchain:**
- Node 22 LTS with pnpm workspaces.
- TypeScript 5.x in `strict` mode.
- Vite (library mode for the packages, app mode for the demo).
- Vitest, with Playwright only for the smoke/visual checks.
- **The build emits ESM for every package, plus a single-file IIFE `dist/patient-monitor.iife.js` from `@pme/renderer`** (inline blob worker; global `PatientMonitor`).
- **Runtime dependencies are kept to uPlot and ajv** (both MIT, both in `NOTICES.md`).

## Stage overview

| Stage | Name | Effort (Opus-agent h) | Depends on |
|---|---|---|---|
| 0 | Scaffold, CI, licence, NOTICES | 3 | — |
| 1 | Vertical slice: ECG rhythm engine + sweep renderer + beep | 12 | 0 |
| 2 | Haemodynamics: Windkessel ABP, CVP/PAP, pleth, NIBP cycle, device numerics | 12 | 1 |
| 3 | Respiratory, gas and temperature: capnogram, CO2/O2 kinetics, SpO2 chain, RR, temp | 9 | 2 |
| 4 | Device layer: alarms + IEC-style and Saadat audio, skins (saadat-like first), pacer/defib, 12-lead, trends | 22 | 3 |
| 5 | Full rhythm library, recorded templates, artefacts | 12 | 1, 4 |
| 6 | Controllers, transports, scenario runner | 12 | 4 (and 5 for the ACLS demo) |
| 7 | MODELED physiology: drugs, volume, baroreflex, haemorrhage | 14 | 3, 6 |
| 8 | Validation harness, docs, v1.0, IIFE embed in the ventilator sim | 12 | all |
| | **Total** | **108 h** | |

Stages run strictly in order (R11). Stage 5 depends only on Stages 1 and 4, but it is still scheduled after them rather than in parallel, to keep gates single-threaded.

---

## Stage 0: Scaffold, CI, licence, NOTICES (3 h)

**Goal.** An empty but real monorepo that builds, tests, emits an IIFE and runs a time-correct sweep cursor.

**In scope:**
- Workspace config and the seven package skeletons.
- CI: install, typecheck, test, build; upload the IIFE as an artefact.
- `LICENSE` (MIT, pending Ali), `NOTICES.md`, `LICENSES/`, and a PR template with a "sources consulted" field (brief §8).
- A `check-notices` script that fails CI when a `NOTICE-ID` is missing.
- `clock/` (the accumulator and 20 ms ticks) and `rng/` (sfc32 with named streams).

**Out of scope:** any signal generation.

**Creates:** root configs; `packages/*/package.json` + `src/index.ts`; `packages/engine-core/src/clock/clock.ts`, `src/rng/sfc32.ts`; `scripts/check-notices.ts`; `apps/demo/stage0.html`.

**Demo, `stage0.html`.** A black 1000 px lane with a green cursor sweeping at 25 mm/s from sim time. It has 0.25×/1×/4× and pause buttons, a text readout of `simT`, and a 30 fps throttle toggle.

**Acceptance tests:**
- `pnpm i && pnpm -r typecheck && pnpm -r test && pnpm -r build` passes from a clean clone in CI.
- **Clock:** feed 10,000 random frame intervals of 8–50 ms. Ticks must equal `floor(Σ(wallΔ·scale)/20 ms)` exactly, and the accumulator must stay below 20 ms.
- **Clamp:** a 5 s frame advances at most 250 ms × scale.
- **RNG:** each named stream is reproducible from the seed. Drawing from `noise` does not change the `hrv` sequence.
- **IIFE smoke (Playwright):** `file://…/iife-smoke.html` loads the file and `window.PatientMonitor.version` is defined, in Chromium and WebKit.
- **Visual check:** a stopwatch over 10 s at 1× shows the cursor moving 250 mm ±5% at default calibration, in both the 60 and the 30 fps modes.

**Gate question.** "Does CI go green from a clean clone, does the IIFE load from `file://` in Safari and Chrome, and is sweep speed unchanged at 30 fps?"

---

## Stage 1: Vertical slice, ECG + sweep + beep (12 h)

**Goal.** A believable single-channel monitor: a real rhythm engine, a real device HR and a real sweep, with a beep.

**In scope:**
- **Buffers:** `buffers/ring.ts` (Float32, absolute sample index).
- **ECG synthesis:**
  - VCG kernel generator with the brief §4.1 seed table;
  - Dower projection plus the Einthoven identities;
  - Fridericia QT and the PR rule;
  - HRV/RSA with a fixed-rate breath clock (the real respiratory driver arrives in Stage 3).
- **Rhythm engine:** atria, AV node (conducted, wenckebach, dissociated, integrateFire) and ventricle with escape.
- **Rhythms** (11 + ectopy): `sinus`, `sinusBrady`, `sinusTachy`, `afib`, `aflutter` (2:1, 4:1, variable), `svtAvnrt`, `avb1`, `avb2Mobitz1`, `avb3Narrow`, `avb3Wide`, `vtMono`, `asystole`, and the `pvc` modifier (single, bigeminy).
- **L3:** `ecg-filter` (Monitor 0.5–40 Hz, Diagnostic 0.05–150 Hz, 50 Hz notch), `qrs` detector and `hr` averaging.
- **Renderer:**
  - `sweep-lane` with erase gap and min/max decimation;
  - DPR handling;
  - worker host with OffscreenCanvas, plus the main-thread fallback and the frame-pump fallback.
- **Numerics:** `numerics-dom` (HR tile).
- **Audio:** `@pme/audio` context unlock, clock map, scheduler and QRS beep (fixed pitch for now).
- **Engine API subset:** `createEngine`, `start`, `pause`, `setTimeScale`, `advanceTo`, `dispatch` (`setRhythm`, `setTarget` for `hr` with `Ramp`, `setModifiers` for `pvc`), `on` (`beat`, `atrial`, `measurement`, `tone`, `toneCancel`), `readSamples`, `snapshot`/`restore` (engine state only).
- **Mount:** `mountMonitor` (minimal).

**Out of scope:** other channels, alarms, skins beyond one hard-coded dark theme, remote control.

**Demo, `stage1.html`:**
- a dark monitor with two ECG lanes (II and V5) at 25 mm/s and 10 mm/mV, with lead labels and a 1 mV calibration bar;
- a green HR tile updating at 1 Hz;
- a rhythm dropdown, and an HR slider with ramp duration (0/10/30 s);
- PVC bigeminy toggle, filter toggle (Monitor/Diagnostic) and an "Enable sound" button;
- beeps on every detected QRS.

**Acceptance tests:**

*Unit tests (Vitest, seeded):*
1. Sinus 60 with HRV off: mean RR is 1.000 ± 0.002 s over 60 beats.
2. QT at 60/120/150 bpm is 400/317/295 ms ±5 ms, measured from kernel timing.
3. At 150 bpm the P-wave peak falls inside the preceding T wave's span.
4. Identities: `III − (II − I)` and `aVR + aVL + aVF` are both < 1e-6 mV at every sample.
5. Mobitz I:
   - PR increments are strictly decreasing within a group;
   - one P is dropped per group;
   - the pause is < 2·PP.
6. `avb3Narrow`: the P–QRS interval is uniformly spread (KS test p > 0.05), and the ventricular rate is 40–60.
7. `afib`: RR CV is 0.15–0.25, lag-1 autocorrelation |r| < 0.1, and there are no P kernels.
8. PVC: coupling + pause = 2·RR ± 10 ms (compensatory pause), and QRS is 120–200 ms.
9. HR averaging on a step from 80 to 120: the displayed HR reaches 118–122 within 5–11 s. It updates at most once per second.
10. Determinism: same seed + same command list gives an identical SHA-256 over 60 s of `ecgII`.
11. No drift: after `advanceTo(86400)`, `latestSampleIndex('ecgII') = 43,200,000 + look-ahead samples` exactly.
12. Sweep maths: x-velocity is 94.5 ± 0.1 CSS px/s at 3.78 px/mm; the decimation keeps the R-peak maximum to within 1 sample.

*Visual checklist (orchestrator + Ali):*
- QRS crisp, no stair-stepping;
- no gap or ghost trail at wrap or at the erase gap;
- same sweep speed at 30 fps (stopwatch);
- beep aligned with the QRS by ear. In the logged audio times, beep minus R is 20–60 ms.
- runs on iPad Safari (worker path or fallback noted);
- a 10-min soak shows no memory growth above 5 MB.

**Gate question.** "At arm's length, do sinus, AF, flutter, CHB and VT look and sound like a monitor on a laptop *and* an iPad, and is the HR number behaving like a real device?"

---

## Stage 2: Haemodynamics (12 h)

**Goal.** ABP, CVP, PAP and pleth driven by mechanical beats from the rhythm engine, with a real NIBP measurement cycle and device-layer pressure numerics.

**In scope:**
- **L1 state:** the `PatientState` schema (brief §4.9) with MANUAL `setTarget`, ramp curves (linear, exp, sigmoid; mid-ramp retarget), control flags, and `stageGroup`.
- **Mechanics:** `k_rhythm`, `f_fill`, PESP; ejection with Weissler LVET/PEP.
- **Arterial chain:**
  - 4-element Windkessel on RK4 at 2 ms substeps;
  - aorta→radial transfer and PTT;
  - transducer 2nd-order model with runtime fn/ζ;
  - 12 Hz display filter.
- **MANUAL pressure tracker** (coupling rule M2).
- **Arrest and CPR (MANUAL):** decay to Pmsf, and the CPR pump.
- **Other pressure channels:**
  - CVP (five Gaussians);
  - PAP (Windkessel, R 0.08–0.12, C 3–5).
- **Pleth:** two kernels at `t_R + PAT_finger`, PI scaling, tone morphology.
- **Minimal breath clock** feeding PPV (g_hyp from `volumeStatus`).
- **Line events** (`applyEvent` `line`): flush, zero, damp, disconnect, level, sample.
- **NIBP** (brief §4.5 and §6.3): envelope, Rs/Rd, modes (manual, auto, STAT), failures, same-limb side-effects.
- **L3 numerics:** ABP S/D/M (integral), PR from ABP and from pleth.
- **Sensors:** `attachSensor` for `abp`, `cvp`, `pap`, `spo2` (pleth only) and `nibp`.
- **Events:** `nibp` and `state`.

**Out of scope:** SpO2 numeric dynamics (Stage 3), MODELED physiology (Stage 7).

**Demo, `stage2.html`:**
- lanes ECG II, ABP (red, 0–150), CVP, PAP and pleth;
- tiles HR, ABP S/D (M), CVP, PAP, NIBP (with a live cuff numeric while measuring and an "hh:mm" timestamp), and PR;
- instructor sliders for HR, SBP, DBP and CVP, each with a ramp;
- buttons: NIBP Start/STAT/Auto 5 min, Flush, Zero, Damped line, VF, CPR on/off, AF, PVC bigeminy.

**Acceptance tests:**
1. **Timing:**
   - R → radial foot is 150–220 ms at HR 60/90/120;
   - pleth foot is 200–300 ms after R and 20–100 ms after the radial foot;
   - dicrotic notch at PEP + LVET + PTT ± 20 ms.
2. **MAP by integral:** the displayed MAP is within ±1 mmHg of the time-average of the displayed waveform.
3. **Tracker:** a target of 90/50 with a 30 s linear ramp in sinus 80 gives a displayed ABP within ±3 mmHg of the target 10 beats after the ramp ends. The ramp shape is monotonic.
4. **PP check:** at SV 70 and C 1.5, PP is 40–55 mmHg.
5. **Pulse deficit:**
   - in AF, some beats with RR < 350 ms give PP < 5 mmHg, and PR from pleth is < HR;
   - a PVC at < 45% coupling has no upstroke;
   - the next beat's SBP is +8–15 mmHg.
6. **Arrest:** VF gives ABP within 10–15 mmHg and non-pulsatile within 20 s.
7. **CPR:** at rate 110 and quality 1.0, the arterial trace is 70–110 / 10–30 mmHg; a pause collapses it within 2–5 s.
8. **Transducer:**
   - fn 10, ζ 0.2 raises SBP by 5–30 mmHg with MAP within ±2;
   - an overdamped line (ζ 1.2) lowers SBP, raises DBP, and keeps MAP within ±2;
   - the flush-test ringing period is 1/fn ± 5%.
9. **NIBP:**
   - one adult cycle at HR 75 lasts 25–35 s;
   - over 100 sinus measurements, bias ≤5 mmHg and SD ≤8 mmHg versus the true site pressures;
   - in AF, duration and SD both increase;
   - at SBP 45 the cycle fails with an INOP after 2 attempts;
   - a manual start cancels auto;
   - with the cuff on the same limb, the pleth is flat during the cycle.
10. **PPV:** g_hyp 0.05 gives 5–10%; g_hyp 0.2 gives 15–30%.
11. **CVP:** the a wave peaks 80–100 ms after P onset; there is no a wave in AF.

*Visual:* waveform shapes against Ali's memory of an OR monitor; the NIBP tile states.

*Realism review* (brief §9) for ABP and pleth: a first pass, informative only.

**Gate question.** "Do the ABP and pleth follow the ECG with the right delay and shape, do the numbers always agree with the drawn waves, and does NIBP behave like a cuff rather than a readout?"

---

## Stage 3: Respiratory, gas and temperature (9 h)

**Goal.** The breathing side of the monitor, including R8's critical lag structure: EtCO2 vanishes immediately, SpO2 falls late and keeps falling after ventilation resumes.

**In scope:**
- **Respiratory driver** (patterns, sources) and the `applyEvent` kinds `airway`, `ventilation` and `preoxygenate`.
- **`externalDrive` ingestion** (`VentFrame`, breath detection from flow; a separate 50 Hz drive track for replay).
- **Capnogram:** phase construction, pattern library (brief §4.4), sidestream/mainstream sampling model.
- **CO2:** two-compartment kinetics and low-flow compression.
- **O2:** store, ODC, shunt.
- **SpO2 device chain:** dead time, lag, bias, averaging, update, INOP states.
- **Impedance resp waveform** with cardiogenic ripple, and its own RR detector.
- **L3 numerics:** EtCO2, imCO2, awRR and the apnoea timer.
- **Temperature:** two-compartment model plus site lags.
- **Coupling rules** M4–M7.
- **Tones:** SpO2-pitch beep (`pitch(SpO2)` presets).

**Out of scope:** alarm audio (Stage 4); drugs and MODELED haemodynamics (Stage 7). The O2/CO2/temperature models run in both modes from this stage on.

**Demo, `stage3.html`:**
- Stage 2 lanes, plus CO2 (yellow, 6.25 mm/s, 0–50) and Resp;
- tiles for SpO2 (with PI), EtCO2/imCO2/awRR, RR, and Temp (core and site);
- buttons: Apnoea, Restore ventilation, Preoxygenate 3 min, Bronchospasm, Oesophageal intubation, Disconnect, Rebreathing, Sidestream/Mainstream, Hypoventilate (RR 6), GA-induction temperature;
- a live "truth vs displayed" SpO2 mini-plot for teaching.

**Acceptance tests:**
1. **Capnogram shape:**
   - α is 100–110° normally and ≥120° with bronchospasm (measured on 25 mmHg/s);
   - the phase III rise is +1–3 mmHg;
   - oesophageal intubation gives <6 breaths of decreasing height, then flat.
2. **Sampling:**
   - sidestream: waveform delayed 2.3 ± 0.1 s from the breath event; 10–90% rise 240 ± 30 ms;
   - at RR 60, sidestream EtCO2 under-reads by more than 3 mmHg against mainstream.
3. **Apnoea:**
   - the apnoea condition is flagged at 20 ± 1 s (audio arrives in Stage 4);
   - the capnogram is flat within one breath period of airway loss.
4. **CO2 kinetics:**
   - during apnoea, PaCO2 rises +12 ± 3 mmHg in the first minute, then 3.4 ± 0.5 mmHg/min;
   - halving minute ventilation gives 30–40% of the final change at 2–3 min and >90% by 40 min.
5. **O2 store:**
   - a 70 kg preoxygenated adult reaches SaO2 90% at 8 ± 1.5 min;
   - on room air, 90% at 1–2 min;
   - a 2–5 y child: 160 ± 30 s.
6. **Lag structure:**
   - after ventilation is restored at SaO2 85%, the *displayed* SpO2 keeps falling for 10–30 s;
   - with the finger dead time at normal CO, SpO2 lags SaO2 by 15 ± 3 s plus averaging;
   - device-chain response from the site SaO2 step to 90% displayed is ≤20 s.
7. **Temperature:** GA induction gives −1.0 to −1.5 °C at 60 min, then −0.3 to −0.5 °C/h, then a plateau at 34.5–35.5. A rectal probe lags oesophageal with τ 20–60 min.
8. **Drive:** with a scripted `VentFrame` stream at RR 14 and VT 500, the detected breaths are 14 ± 0.5/min and EtCO2 converges on the kinetics value.
9. **Tone:** at SpO2 90% (standard preset) the pitch is 880·2^(−10·0.1/12) ≈ 830 Hz ± 1 Hz.

**Gate question.** "Does the airway-loss sequence feel right to an anaesthetist (EtCO2 gone at once, SpO2 falling late and still falling after the airway is back), and do the capnogram patterns read correctly at a glance?"

---

## Stage 4: Device layer (22 h)

**Goal.** Make it behave like a specific device: alarms that sound and look right, skins as data, pacer and defibrillator semantics, 12-lead capture, trends and the event log.

**Effort.** 14 h → **22 h (+8 h)** for the `saadat-like` profile (R13), which has the same depth as `philips-like` and needs engine behaviour the other skins do not: schema fields and the skin file 1.5 h; alarm-engine generalisation (factory-off, always-on list, 3 named levels, steady lamp, non-latching, 120 s silence with visual suppression) 2 h; the `saadat` sound profile and its tests 1 h; the time-window HR averager and the AUTO source chain 1.5 h; filter-name map, gain AUTO, Solar date, glyphs and the NIBP STAT/inflation rules 1 h; PUMP page, docked menus and filled-area trends 1 h **[ENG estimates]**. If Stage 4 overruns, `ge-like`, `mindray-like` and `lifepak-like` slip to v1.1 (R12), which saves about 1.5 h; `saadat-like`, `philips-like` and `zoll-like` do not slip.

**In scope:**
- **Alarm engine** (brief §6.4):
  - conditions, limits by age band, delays, latching;
  - silence (90 s) and pause (3 min);
  - the `saadat` profile (brief §6.4.1): factory-OFF parameter alarms with ASYSTOLE/VFIB/VTAC/APNEA always on, 3 levels named 1/2/3 with a steady-yellow L3 lamp and cyan bar, no latching, and a 120 s silence that also hides visual alarms, shows a header countdown and is cancelled by any new alarm;
  - INOPs, and arrhythmia-analysis on/off.
- **`iec-bursts.ts`:** `PeriodicWave` pulses, priority patterns, inter-burst scheduling, Philips-like "Traditional" profile.
- **`saadat-bursts.ts`:** the Saadat alarm sound profile (brief §6.4.1): L1 "DO-DO-DO--DO-DO" every 10 s, L2 3 pulses every 20 s, L3 1 pulse every 30 s; volume 1–7, default 1; pulse timing and pitch from the skin (**[assumed]** until Ali's recordings).
- **Visual alarms:** CSS flash rates, message bar, flashing numerics.
- **`@pme/skins`:** JSON schema (including the brief §3.8 `saadat-like` fields) plus the 6 skins and 2 themes (brief §6.8 tables); runtime `setSkin` without restarting the engine. Skins are built in the **recommended order `saadat-like` → `philips-like` → `zoll-like`** (pending Ali's confirmation, brief §10 question 7), then `ge-like`, `mindray-like` and `lifepak-like`.
- **`saadat-like` behaviour** (brief §3.8, §6.1, §6.3, §6.8, §6.9): time-window HR averaging (4/8/16 s, default 8) updated at 1 Hz; HR source AUTO (ECG > IBP1–4 > SpO2) with the HR → PR relabel; ECG gain AUTO; filter-name map (NORMAL 0.5–40 default, MONITOR 0.5–24, EXTENDED 0.05–100); IBP colour by channel; NIBP MANUAL default, STAT 10 × 30 s, next inflation previous SYS + 30; red crossed-bell tiles; unavailable-value glyphs; Solar (Jalali) date; menus docked in the lower wave area; filled-area trends; the PUMP page; the `iran-icu-as-found` preset.
- **Calibration UI** (card, 85.6 mm) with a stored per-device value.
- **Display settings:** sweep, gain, filter and lead menus.
- **Pacer:** demand/fixed, rate, mA, threshold, TCP artefact, pace markers, mechanical capture, twitch artefact on ABP and pleth.
- **Defibrillator:**
  - energy, charge timing and tones, auto-disarm;
  - sync markers, with the shock on the next R within ≤60 ms;
  - shock artefact and recovery;
  - post-shock outcome table (brief §6.5) on the `outcome` stream.
- **`capture12`:** 10 s, diagnostic filter, 3×4 / 2×6 / Cabrera layouts, fiducial measurements, print CSS, PNG and JSON.
- **Trends:** 1 Hz × 8 h, shown with uPlot.
- **Event log:** CSV and JSON export.

**Out of scope:** the full rhythm list (Stage 5); remote control (Stage 6); the Saadat SIGMA full disclosure, OXY-CRG, alarm recall, Alarm Freeze, rainbow tile row and the Alvand variant (v1.1; not required by R13) **[ENG]**.

**Demo, `stage4.html`:**
- a skin switcher (Saadat-like factory and its `iran-icu-as-found` preset, Philips-like OR, GE-like, Mindray-like, ZOLL-like defib, LIFEPAK-like defib, projector-light, ecg-grid);
- an alarm test panel that forces each priority and INOP, and each Saadat level with Silence;
- defibrillator controls (energy, charge, shock, sync) and pacer controls (mode, rate, mA, threshold);
- a 12-lead button that opens a printable report;
- a trends tab and an event-log tab with export.

**Acceptance tests:**
1. **Audio pattern.** Render with `OfflineAudioContext` and detect onsets:
   - high: 10 pulses, t_d 150 ± 5 ms, x 100 ± 5 ms, group gap 0.6 ± 0.01 s;
   - medium: 3 pulses, t_d 200, y 200;
   - inter-burst intervals follow the skin.
2. **Audio spectrum (FFT):** fundamental within 150–1000 Hz; ≥4 peaks in 150–4000 Hz within 15 dB; 10–90% rise ≥10 ms.
3. **Alarm timing:**
   - SpO2 low: raised at limit breach + 10 ± 1 s;
   - asystole: 4.0 ± 0.2 s after the last detected QRS;
   - leads off: INOP raised and **no** asystole alarm;
   - VT alarm at a run ≥5 at HR ≥100;
   - pause mutes everything for 180 ± 1 s with a countdown.
4. **Visual:** computed CSS animation frequencies are 2.0 Hz (high) and 0.6 Hz (medium) at 50% duty.
5. **Pacer:**
   - at mA < threshold, spikes with no capture and unchanged intrinsic rhythm;
   - at mA ≥ threshold, a wide QRS (≥140 ms) after 100% of spikes over 60 s;
   - in demand mode, no spike when an intrinsic beat is sensed within 60/rate;
   - LIFEPAK-like HR shows dashes while pacing.
6. **Defibrillator:**
   - 200 J charge ≤7 s (LIFEPAK-like);
   - auto-disarm at 60 s;
   - sync shock lands 0–60 ms after the next detected R;
   - baseline back within 0.1 mV in ≤5 s;
   - over 10,000 seeded VF shocks, outcome frequencies are within ±2% of the table.
7. **12-lead:**
   - the limb identities hold;
   - the diagnostic filter is applied regardless of the monitor filter;
   - measured QT is within ±10 ms of truth;
   - the ProSim lead ratios hold within ±25%.
8. **Skins:** all 8 JSON files validate. A skin switch changes colours, sweeps, limits and alarm profile in <100 ms with no engine restart (tick continuity).
9. **Log:** an exported CSV row count equals the events of each logged type.
10. **`saadat-like`** (brief §3.8, §6.4.1, §6.8):
    - **Alarms off by default:** after load, every parameter tile shows the red crossed-bell and no limits, and the header shows the all-off bell; an HR outside 50–150 raises nothing; asystole, VF, VT and apnoea still alarm at level 1.
    - **Three-level colours:** forced L1 / L2 / L3 give bars red / yellow / cyan with black text and no asterisks, and lamps red-flash / yellow-flash / yellow-steady; the bar is grey when idle and after a technical acknowledge.
    - **Tone pattern timing** (`OfflineAudioContext` onsets): L1 is 5 pulses grouped 3+2, repeating every 10 ± 0.05 s; L2 is 3 pulses every 20 s; L3 is 1 pulse every 30 s; pulse and gap lengths match the skin values within ±5 ms.
    - **120 s silence:** Silence removes audio and visual indication for 120 ± 1 s with a header countdown; a new alarm during silence ends it at once. What happens to the flashing numeric is **[unverified]** (checklist photo 5).
    - **Filter naming:** the ECG lane label reads NORMAL by default and the measured −3 dB band is 0.5–40 Hz; selecting MONITOR gives 0.5–24 Hz; Philips-like "Monitor" still gives 0.5–40 Hz.
    - **8 s HR averaging:** a step of 80→120 bpm reaches the displayed 120 in 6 ± 1 s (4 s window: 5 s; 16 s window: 11 s), with 1 Hz updates; detaching ECG moves the AUTO source to IBP1, then SpO2, and relabels HR → PR.
    - **Asystole** is raised 10.0 ± 0.2 s after the last QRS (the skin value), and the Solar date renders a fixed test date as Jalali `YYYY/MM/DD` with Latin digits.

**Verify before gate (Saadat).** Ali's bedside capture checklist (brief §10; research/06 §7: 8 photos, 3 alarm recordings, 2 stopwatch tests, about 30 min). Replace the **[assumed]** tone timing and pitch, lamp flash rates, erase gap, IBP3/IBP4 colours, paediatric/neonatal limits and the 5 s vs 10 s asystole value with the captured values. Anything not captured by the gate is listed in `docs/gates/stage-4.md` as still [assumed].

**Gate question.** "Would a resident recognise these alarms, the pacer-capture behaviour and the defib/sync workflow as the device on their unit, and are the default limits and colours right for our OR? Does the `saadat-like` screen read as the B9 on an Iranian ward?"

---

## Stage 5: Full rhythm library, templates and artefacts (12 h)

**Goal.** The complete v1 rhythm library (brief §5), including the recorded-template hybrids and the full artefact model.

**In scope:**
- **Remaining rhythms:** `sinusArrhythmia`, `sinusPause`, `atrialTach`, `svtAvrt`, `wpwSinus`, `preexcitedAf`, `junctionalEscape`, `junctionalAccel`, `junctionalTachy`, `avb2Mobitz2`, `avb2to1`, `avbHighGrade`, `idioventricular`, `aivr`, `vtPoly`, `torsades`, `vfCoarse`, `vfFine`, `pWaveAsystole`, `agonal`, `pacedAAI`, `pacedVVI`, `pacedDDD`, the pacing faults, and `pulseless` PEA on any organised rhythm.
- **All modifiers:** ectopy patterns, BBB, axis/transition, ST territories with reciprocity, QTc/long QT, Brugada, digoxin, alternans, low voltage, LVH, WPW, K-driven hyper/hypoK staging, Osborn.
- **Individuality:** `patientSeed` + `morphologyVariation`.
- **VF and AF hybrids:**
  - template extraction scripts in `packages/validation/datasets/` (CUDB, MIT-BIH via wfdb-python, MIT, dev-only);
  - Int16 templates in `engine-core/templates/` with `NOTICE-ID`s;
  - time-warp and envelope; AR fallback.
- **Artefact library:** `wander`, `mains` (50/60), `emg`/`shiver`, `motion`, `leadContact`, `electrosurgery`, `cpr` (parametric).
- **`vocabulary()`:** bounds, normals, enums, constraints.
- **`commandApplied`:** the resolved/ignored echo.
- **Dower matrix [VERIFY]** against the primary source; refit the default vectors against the PTB-XL normal median beats.

**Demo:**
- **`stage5.html`, a rhythm gallery:** every rhythm in a grid of 10 s two-lead strips, filterable by group, with a modifier playground.
- **An "ACLS strip" sequencer:** sinus → VT → VF coarse → CPR → shock → asystole → ROSC.

**Acceptance tests:**
1. **Rate:** every rhythm's measured rate and regularity fall within its brief §5 range (a table-driven test over 40 seeds).
2. **VF:**
   - Welch dominant frequency is 4–6 Hz at t = 0 and follows `f_dom(t)` within ±0.5 Hz at 4 and 10 min;
   - amplitude decays with τ within ±20% of spec, and more slowly with CPR on;
   - the coarse/fine split is at 0.2 mV;
   - epinephrine gives the specified bump.
3. **Torsades:** envelope period 5–20 beats.
4. **CPR artefact:** spectral lines at f_c·h for h = 1–8.
5. **Mobitz II and 2:1:** constant PR; drops with no PR change.
6. **STEMI anterior:** ST +0.1–0.4 mV in V2–V3, with reciprocal depression in III/aVF.
7. **HyperK:** raising K from 5 to 8.5 reproduces the stage order peaked T → PR↑ → QRS↑ → sine wave.
8. **Pacing faults:** failure to sense puts spikes on T waves; oversensing produces pauses with no spikes.
9. **Provenance:** every template file carries a `NOTICE-ID` present in `NOTICES.md` (CI).
10. **Seeds:** the same `patientSeed` gives identical morphology across scenario steps; different seeds differ (median-beat r < 0.99).

**Blind rhythm check:** Ali names 30 randomly drawn strips; ≥27/30 must match the intended rhythm. The **realism review** (brief §9) for ECG then runs.

**Gate question.** "Can Ali identify every rhythm as intended, and does VF/torsades texture look recorded rather than synthetic?"

---

## Stage 6: Controllers, transports, scenario runner (12 h)

**Goal.** Both control modes (R7): a same-screen hidden panel and a remote controller, speaking one command API over pluggable transports, plus the scenario state-machine runner.

**In scope:**
- **`protocol.ts`:** `WireMessage`, sequence numbers, acks.
- **Transports:** `in-process`, `postMessage`, `broadcastChannel`, `websocket`, `webrtc`.
- **`relay/`:** a Node WebSocket relay with 6-character session codes, rooms, a snapshot cache and WebRTC signalling.
- **Viewer role:** L2 and L3 run from events; late-join snapshot.
- **Instructor UI:**
  - `panel/`, the hidden same-screen panel, opened by a three-finger long-press or `Ctrl+Shift+I`;
  - `remote/`, the controller page, with pin/ramp controls showing target, truth and displayed values, plus stage-then-commit.
- **Scenario runner:** `pme-scenario/1` JSON Schema (ajv), triggers (brief §7.4), probability/else, bookmarks (snapshot/restore), timeline, notes.
- **Command log and replay.** `time` commands for remote pause and scale.

**Demo:**
- `stage6-monitor.html` on an iPad and `stage6-controller.html` on a laptop, paired by session code through the relay on the LAN.
- A sample ACLS scenario (`acls-vf-01.json`) and an OR scenario stub.
- A projector viewer window via BroadcastChannel.

**Acceptance tests:**
1. **Latency:** command → first frame showing the change is p95 ≤150 ms on a LAN websocket and ≤60 ms in-process (in-page instrumentation, 200 samples).
2. **Late join:** a viewer joining mid-scenario shows numerics matching the host within 2 s and waveforms with matching beat timing (±20 ms).
3. **Robustness:** after a relay drop, the monitor keeps running and the controller shows "disconnected"; on reconnect, no duplicate commands are applied (seq/ack test).
4. **Replay:** seed + snapshot + command log + drive track reproduce identical buffers on the same build.
5. **Scenario semantics:**
   - `afterS`, `vital … forS`, `event minJ` and `all`/`any` each fire correctly in unit tests;
   - probability 0.3 over 10,000 seeded trials gives 0.30 ± 0.01;
   - restoring a bookmark resets the state exactly.
6. **Schema:** an invalid scenario is rejected with a path-level error message.

**Gate question.** "Can Ali run a 10-minute ACLS scenario from the laptop without touching the iPad monitor, and recover cleanly from a Wi-Fi drop?"

---

## Stage 7: MODELED physiology (14 h)

**Goal.** The optional physiology layer (R4) for the OR/anaesthesia simulators: volume, drugs, reflexes and ventilation coupling, behind the same state schema.

**In scope:**
- **`l1/modeled`:** Guyton VR/CO, Frank–Starling, afterload, the per-beat RAP solve, baroreflex (vagal and sympathetic, with delays), chemoreflex, `setMode` switching with the continuity solve.
- **Operator controls:** `pin`, `release` (10 s blend) and `setFactor`.
- **Pharmacology:** the v1 drug set with the gamma effect curve (brief §4.9); conditions (anaphylaxis, LAST, MH, tamponade, tension pneumothorax, PE).
- **Volume:** `bleed`, `fluid`.
- **Coupling:** ventilation → effective RAP; CPR as a physiological pump.
- **Timelines:** the arrest/ROSC and asphyxial sequences emerge from the model.
- **Age scaling:** neonate to elderly tables.
- **`L1Backend` seam:** the interface only, for Pulse later.

**Demo, `stage7.html` (OR):**
- a patient profile picker;
- an induction workflow: propofol 2 mg/kg, fentanyl 2 µg/kg, then intubation (the vent sim or a built-in ventilator);
- phenylephrine 100 µg and ephedrine 10 mg buttons;
- a haemorrhage slider (mL/min) and fluid bolus;
- a MANUAL/MODELED toggle, with pin and release on any tile;
- the control flags visible.

**Acceptance tests (the brief §4.9 sanity checks, all automated):**
1. **Phenylephrine 100 µg:** MAP +15–25 mmHg; HR −5–15 bpm within 30–60 s.
2. **Class II haemorrhage** (20% loss over 10 min): HR 100–120, SBP ≥90% of baseline, PP narrowed by ≥15%, PPV >13%.
3. **Propofol 2 mg/kg:** MAP 55–85% of baseline at 2 min (target ~70%), HR change ≤ +10 bpm.
4. **ATLS classes I, III and IV** within the table ranges.
5. **Solver:** Pmsf 7–12 mmHg at baseline; CO = VR residual <1% within 3 iterations every beat.
6. **Rate ceiling:** CO plateaus and then falls above 150–180 bpm (paced sweep).
7. **Timelines:** the witnessed-VF timeline [03 §8.8 A] checkpoints pass, and the asphyxial timeline B ordering holds (tachycardia/hypertension → bradycardia → PEA), with the adult preoxygenated time to PEA at 5–10 min.
8. **Mode switch:** MANUAL↔MODELED produces no step >2 mmHg or 2 bpm.
9. **Pin/release:** release blends over 10 ± 0.5 s without overshoot.
10. **Replay:** determinism holds with MODELED on.

*Clinical review:* Ali runs the induction and haemorrhage scenarios twice each.

**Gate question.** "Does induction, a bleed and a pressor push behave the way an anaesthetist expects, closely enough to teach from, and does pinning a vital behave predictably?"

---

## Stage 8: Validation, docs, v1.0, ventilator-sim embed (12 h)

**Goal.** Prove the realism quantitatively, document the API, tag v1.0, and ship the IIFE inside the ventilator simulator.

**In scope:**
- **Validation harness** (brief §9, V1–V9):
  - dataset fetchers: VitalDB (PhysioNet copy), MGH/MF, PWDB, PTB-XL, CUDB, MIT-BIH, BIDMC → git-ignored cache;
  - metric implementations;
  - committed derived statistics;
  - HTML report;
  - golden files.
- **The blind review tool** and the final realism review.
- **Saadat screens as a capture source.** Ali films Saadat B9 screens (screens only, no identifiers; filming allowed, R12) for the device-behaviour review (brief §9 step 5): alarm sounds per level, Silence and its countdown, the NIBP cycle, and the sweep. The engine plays the matching scenario in the `saadat-like` skin side by side.
- **Performance:**
  - 8 lanes at 60 fps on an iPad (A14 or later);
  - worker ≤6 ms per frame, main thread ≤4 ms;
  - 30 fps mode on a projector PC.
- **Docs:** TypeDoc API reference (Apache-2.0 tool, build-only); an embedding guide; the scenario authoring guide; skin authoring.
- **Release:**
  - licence review items (brief §10) closed or documented;
  - `NOTICES.md` complete;
  - npm packages `@pme/*` 1.0.0;
  - a GitHub release with `patient-monitor.iife.js`.
- **Ventilator-sim embed.** A separate PR in the `ventilator-simulator` repo, following the PR workflow (one piece of work, Ali merges). It adds a monitor panel using the IIFE and `externalDrive` frames (brief §7.6), and shows SpO2 and EtCO2 responding to ventilator changes.

**Demo:**
- `index.html`, the full monitor with scenario loader;
- `validation-report.html`;
- the ventilator simulator with the embedded monitor, opened from `file://`.

**Acceptance tests:**
1. **V1–V9 pass,** e.g. V1 median R→radial within ±20 ms of VitalDB per HR bin, and V4 α normal 100–110°.
2. **Realism review:** identification accuracy ≤60% per channel; mean synthetic realism ≥4.0.
3. **Performance:** the budgets above on the named devices.
4. **Size:** the IIFE is ≤400 KB gzipped including templates **[ENG]**.
5. **Embed:** the ventilator sim loads from `file://` in Safari and Chrome with no console errors. Cutting its FiO2 to 0.21 at shunt 30% visibly lowers SpO2 with the §4.3 lag. Setting RR 6 raises EtCO2 per the kinetics.
6. **Licence:** the `check-notices` CI job passes, and every `LICENSES/` text is present.

**Gate question (v1.0).** "Do the numbers say it's realistic, does Ali's blind review agree, and is it safe (licence-wise) and easy to embed?"

---

## Definition of done for v1

1. All of Stages 0–8 have passed their gates, with the gate notes recorded in `docs/gates/stage-N.md`.
2. Every channel in brief §1 renders through the L1 → L2 → L3 chain, with device-layer numerics. No numeric is read directly from truth.
3. MANUAL and MODELED modes pass their tests; pin, release and ramps behave as specified; the `L1Backend` seam exists.
4. The brief §5 rhythm library and modifiers are complete, and the blind ID is ≥90%.
5. Alarms are IEC-style (labelled so), with correct patterns, spectra, delays and visuals, and the `saadat` profile passes its Stage 4 tests; pacer and defibrillator semantics pass.
6. Six skins (`saadat-like`, `philips-like`, `zoll-like`, `ge-like`, `mindray-like`, `lifepak-like`) and two themes exist as validated JSON; `ge-like`, `mindray-like` and `lifepak-like` may move to v1.1 under R12, but `saadat-like`, `philips-like` and `zoll-like` may not. Calibration works on the iPad.
7. The same-screen and remote controllers work over in-process, BroadcastChannel, WebSocket and WebRTC; the scenario runner passes the schema and trigger tests.
8. Validation V1–V9 pass; the realism review passes; the golden-file regression runs in CI.
9. ESM packages and the single-file IIFE are published; the ventilator-sim PR has been handed to Ali.
10. `NOTICES.md` is complete, the legal-review items are resolved or listed, and README, API docs and authoring guides exist.

## First 3 days (so the next agent can start immediately)

**Day 1: Stage 0 (tasks S0.1–S0.8)**
- **S0.1** Scaffold the workspace:
  - root `package.json` (`"packageManager": "pnpm@9"`, scripts `typecheck`, `test`, `build`, `check-notices`);
  - `pnpm-workspace.yaml` (`packages/*`, `apps/*`);
  - `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`, `target ES2022`, `lib ["ES2022","DOM","WebWorker"]`);
  - `vitest.workspace.ts`.
- **S0.2** Create the 6 packages and `apps/demo` with `package.json` + `src/index.ts` (`export const version = '0.0.0'`). Set up Vite library config for each package, and give `@pme/renderer` an extra IIFE build named `PatientMonitor`.
- **S0.3** `engine-core/src/rng/sfc32.ts`: `createRng(seed)` and `stream(name)` via a string hash (e.g. cyrb53). Tests: reproducibility and stream independence.
- **S0.4** `engine-core/src/clock/clock.ts`: `Clock { tickMs: 20; timeScale; advance(wallDeltaMs): number /* ticks */ }` with a 250 ms clamp. Write the randomised accumulator test first (TDD).
- **S0.5** Add `LICENSE` (MIT, copyright "Ali Mahdavi and contributors") and a `NOTICES.md` row for each build-only dependency.
- **S0.6** Write `scripts/check-notices.ts` plus the PR template (`.github/pull_request_template.md` with "Sources consulted", "NOTICES rows added").
- **S0.7** CI (`.github/workflows/ci.yml`): Node 22, pnpm cache, typecheck/test/build/check-notices, Playwright IIFE smoke, IIFE uploaded as an artefact.
- **S0.8** `apps/demo/stage0.html`: canvas cursor, `x = (simT·25·3.78) mod W`, scale and pause buttons, and the 30 fps toggle (rAF skip). Run the manual stopwatch check, then **Gate 0**.

**Day 2: Stage 1, core synthesis (S1.1–S1.6)**
- **S1.1** `buffers/ring.ts`: `RingBuffer(rate, seconds)` with `write(index, value)`, `read(from, out)` and `latest`. Tests: wrap-around and absolute indexing over 24 h.
- **S1.2** `l2/ecg/kernels.ts` for the Gaussian and half-Gaussian T kernels. `l2/ecg/vcg.ts` projects with the Dower rows and derives the limb leads from the identities. Test: the identities.
- **S1.3** `l2/ecg/intervals.ts`: Fridericia QT and the PR rule. Test: the QT table at 40–200 bpm.
- **S1.4** `l2/ecg/hrv.ts`: RSA + LF + ε on the `hrv` stream.
- **S1.5** `l2/ecg/rhythm-engine.ts`: atria, AV node, ventricle and escape (brief §4.1 pseudo-code). Rhythms `sinus`, `sinusBrady`, `sinusTachy` and `asystole` first, then `avb1`, `avb2Mobitz1` and `avb3Narrow/Wide`. Unit tests 1–6 of Stage 1.
- **S1.6** Add `afib` (integrate-and-fire AV junction), `aflutter`, `svtAvnrt`, `vtMono` and the `pvc` modifier. Tests 7–8.

**Day 3: Stage 1, device and display (S1.7–S1.12)**
- **S1.7** `l3/ecg-filter.ts`: biquad cascade for 0.5–40 and 0.05–150 Hz plus the 50 Hz notch at 500 Hz.
- **S1.8** `l3/qrs.ts`: Pan–Tompkins-style detector. `l3/hr.ts`: IEC-style 12-RR averaging with the 4-RR rule and a 1 Hz update. Test 9.
- **S1.9** `engine.ts`: `createEngine`, `advanceTo` with a 100 ms look-ahead, `dispatch` (`setRhythm`, `setTarget hr` with `Ramp`, `setModifiers pvc`), `on`, `readSamples`, and look-ahead invalidation on `setRhythm`. Tests 10–11.
- **S1.10** `@pme/renderer`:
  - `sweep-lane.ts`: erase gap 16 px, min/max decimation, tail re-stroke;
  - `worker-host.ts`: OffscreenCanvas worker, frame pump and main-thread fallback;
  - `mount.ts`: `mountMonitor`.

  Test 12, plus a Playwright screenshot of a static seeded frame.
- **S1.11** `@pme/audio`: gesture unlock, `clock-map.ts` with `getOutputTimestamp`, a 25 ms/100 ms scheduler, the QRS beep, and `toneCancel` handling.
- **S1.12** `apps/demo/stage1.html`, then the iPad test (note whether the worker path or the fallback ran), then **Gate 1**.
