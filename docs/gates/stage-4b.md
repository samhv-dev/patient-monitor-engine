# Stage 4b gate: the device layer

*Branch `stage-4b-device-layer`. Plan: `docs/plans/stage-4b-device-layer.md`, all 26 tasks ticked. Base: `origin/main` 601b410, which includes Stage 2 (final), Stage 6b and the RESUME runbook. The plan was written against 121c3f4 + Stage 2 52efd04. Every edit block of the plan still applied exactly (0 misses). The drift that did matter was Stage 6b: see "Deviations".*

## What landed

- **Alarm engine** (`packages/engine-core/src/l3/alarms/**`, `l3/device-layer.ts`):
  - Conditions: limits on displayed numerics by age band, desaturation, asystole, VF, VT runs, brady/tachy or extreme brady/tachy, pause, PVCs/min, leads off, SpO2 probe off, NIBP failed, and (added at execution, see below) APNEA and the CO2 line INOP.
  - Life cycle: onset delay, IEC-style latching, silence, pause, acknowledge.
  - One `alarmStatus` summary on every change and once a second.
  - Saadat-like alarms are factory OFF, except ASYSTOLE, VFIB, VTAC and APNEA, which are always on.
  - Skin and age band can be switched at run time (`device monitor skin|ageBand`).
- **Defibrillator and pacer** (`l3/defib-pacer/**`):
  - Defibrillator: energy, charge time and tones, ready, auto-disarm; sync markers and the sync shock; Stage 5's rail artefact on every lead.
  - Post-shock rhythm: the table on the `outcome` stream, with the instructor's pre-selection.
  - TCP through Stage 5's `Modifiers.tcp`, with the capture threshold from `PatientState.paceThresholdMa`; demand/fixed, pause, failure to sense/capture.
  - A header readout (`120 J READY SYNC`, `PACER FIXED 70 ppm 90 mA`) was added at execution.
- **12-lead capture, trends, event log** (`l3/capture12`, `l3/trends`).
- **Renderer**:
  - skin plan (RR-1), grid painter (RR-4), cursor line (RR-3), auto gain (RR-2);
  - skin tiles and alarm header (RR-5); `createTonePlayer` + `AlarmSounder` (RR-6); overlays;
  - `setSkin`, `capture12()`, trends and event log on the handle;
  - demo page `apps/demo/stage4b-device.html`.
- **Engine requests**: E-4a-1 (filter bands) and E-4a-3 (alarm `level`, `chargeS`) are done. E-4a-2 is deferred (R-4b-5).
- **G4a follow-ups**:
  - the `ecg-grid` major line is now `#F4C4C4`, and every trace keeps ≥ 3:1 contrast against it;
  - `mindray-like` has boxed alarm numerics;
  - `ge-like` and `mindray-like` carry the `LAYOUT UNVERIFIED` badge.
- **R30 capture threshold**: `paceThresholdMa` defaults to 60 mA (Stage 2 already had 60). The device layer accepts `setTarget paceThresholdMa` itself across 10–200 mA, which covers R30's required 40–200 mA, so Stage 2's `validateTarget` did not need widening. Measured: `setTarget 60` accepted; 65 mA against the default captures 100 % of spikes.

## Evidence

All numbers below were measured on this branch. The plan author's value is in parentheses where the plan gave one.

| Check | Result |
|---|---|
| typecheck / build / check-notices | exit 0 / exit 0; renderer IIFE 633.1 kB (628.9) / `OK (3 governed files)` |
| unit tests | engine-core **377** (372), renderer **57** (54), skins **159** (159), audio 58, controller **185** (97; the base now carries 6b), validation 16, for 852 in total. Base: 305 / 31 / 155 / 58 / 185 / 16 |
| browser tests | whole Playwright suite **19 passed** (iife-smoke, stage4a-skins, stage6a ×3, stage6a-worker ×3, stage6a-screens, stage6a-latency, stage6b, stage4b-device ×6). `stage4b-device.e2e.ts` has 6 tests (the plan had 5; one was added for the brief's gate list) |

### Alarm timing per skin (engine, seed 11; `alarmsOf` events)

| Skin | Onset delay | HR limit → raise | Asystole (after last QRS) | VFIB (after VF onset) | VTAC (after 5th ventricular beat, VT 160) | Silence | Pause | Latching |
|---|---|---|---|---|---|---|---|---|
| saadat-like | 1 s | `HR TOO HIGH` L1, **1.000 s** after the first displayed value over 150 (only after `enableAll`; factory OFF) | `ECG ASYSTOLE` L1, **10.017 s** | `ECG VFIB` L1, **3.02 s** | `ECG VTAC` L1, **0.002 s** (rule 5 @ 120) | 120 s, hides the visual, a new alarm ends it | rejected: "alarm pause has no function on saadat-like" | no |
| philips-like | 0 | `**HR 140>120` L2, **0.000 s** (first displayed value over 120) | `***ASYSTOLE` L1, **4.017 s** | `***VFIB/VTACH` L1, **3.02 s** | `***VTACH` L1, **0.002 s** (5 @ 100) | 90 s, audio only | 180 s, removes every alarm | L1 physiological |
| ge-like | 0 | no HR table (brief §6.8) | 4.017 s | 3.02 s | 0.002 s | 90 s | 180 s | yes |
| mindray-like | 0 | no HR table | 4.017 s | 3.02 s | 0.002 s | 90 s | **120 s** | yes |
| zoll-like | 0 | no HR table | 4.017 s | 3.02 s | 0.002 s | 90 s | 180 s | yes |
| lifepak-like | 0 | no HR table | 4.017 s | 3.02 s | 0.002 s | 90 s | 180 s | yes |
| iran-icu-as-found (preset) | 1 s | as saadat-like, 1.000 s | 10.017 s | 3.02 s | 0.002 s | 120 s | rejected | no |

The plan's figures were asystole 10.0 / 4.0 ± 0.2 s, VFIB ≤ 3.3 s and VTAC ≤ 0.1 s. The measured 0.017 s beyond the nominal interval is one 20 ms tick less the R-to-tick offset.

**Silence, pause and priority arbitration** (HR 170 with all alarms ON, then VF):
- philips-like: the status orders the active alarms `VFIB:L1, HR_HIGH:L2`. After Silence the countdown reads 89.02 s one second later, and the bar keeps `***VFIB/VTACH` (IEC-style silence is audio only). Pause is accepted, 180 s, and leaves 0 active alarms.
- saadat-like: after VF only `VFIB:L1` is active (HR is not valid in VF). Silence gives 120 s and the bar is grey and empty in the screenshot. Pause is rejected.
- mindray-like: silence 90 s, pause 120 s.
- Only the highest priority sounds. With a fake audio clock (Task 19 `alarm-audio.test.ts`), an L2 train stops while an L1 is raised and resumes when the L1 clears.

**Flash rates** (computed CSS, e2e): high 0.5 s = 2.0 Hz, medium 1.66667 s = 0.6 Hz, keyframe at 50 %.

**Technical alarms**: ECG leads off gives `ECG CHECK LA/RA/LL` at level 3, with no asystole while the leads are off. SpO2 probe off gives level 3 (Task 9 tests).

### Defibrillator and sync

- lifepak-like 200 J: ready **7.0 s** after charge (7.0), charge tone `chargeS` 7, auto-disarm **60 s** after ready (60). A shock after disarm is rejected: "not charged".
- Shock artefact: rail > 4 mV on II, V5 and V1 at the shock; the mean baseline is < 0.1 mV at +5 s (Task 13 test).
- Sync markers against Stage 5's beat R times (zoll-like, seed 3, 1–7.5 s window). Then a 100 J sync shock was commanded at 8 s:

| Rhythm | Beats | Markers | Max marker error | Sync shock after R | Shock after command |
|---|---|---|---|---|---|
| sinus | 8 | 8 | 2 ms | 28 ms | 362 ms |
| svtAvnrt | 19 | 19 | 5 ms | 21 ms | 252 ms |
| aflutter | 16 | 16 | 2 ms | 20 ms | 70 ms |
| afib | 11 | 11 | 1 ms | 19 ms | 70 ms |
| vtMono | 18 | 18 | 7 ms | 24 ms | 28 ms |

  Every sync shock landed 19–28 ms after R, inside the brief's ≤ 60 ms. "Sync After Shock" is off.

### Post-shock outcome (brief §6.5 table)

10,000 seeded draws per context (`drawOutcome`, the `outcome` stream):

| Context | Brief | Measured |
|---|---|---|
| VF, default energy, 60 s of VF | persistent 0.30 / asystole+PEA 0.60 / ROSC 0.10 | **0.3003 / 0.6044** (asystole 0.3016, PEA 0.3028) **/ 0.0953** |
| VF 4–10 min (300 s) | ROSC × 0.5, rest to asystole/PEA | 0.3003 / 0.6519 / **0.0478** (expected 0.05) |
| VF > 10 min (660 s) | ROSC × 0.2 | 0.3003 / 0.6813 / **0.0184** (expected 0.02) |
| VF, energy < 50 % of default (90 of 200 J) | termination × 0.5 | persistent **0.6519** / 0.3003 / 0.0478 (expected 0.65 / 0.30 / 0.05) |
| organised tachy with pulse, synchronised | sinus 0.8 / unchanged 0.2 | **0.7929 / 0.2071** |
| perfusing, unsynchronised on the T peak ± 40 ms | VF 0.3 | **0.2956** |
| asystole / PEA | artefact only | unchanged 1.000 |

All are within ±2 % of the table (the `outcome.test.ts` bound). As an end-to-end check in the engine, 200 seeded VF shocks on zoll-like gave unchanged 58, asystole 71, PEA 58, ROSC 13 (0.29 / 0.645 / 0.065).

### Pacer (zoll-like unless noted)

- **Below threshold**: threshold set to 70 mA, output 40 mA, fixed 70 ppm, avb3Wide escape. Result: 29 spikes in 5–30 s, **0 captured**; the intrinsic rate stays at **31.2 bpm** (escape 32).
- **Above threshold**: 90 mA gives 70 spikes in 35–95 s with a **100 %** capture fraction and 70 `pacedV` beats. Each paced beat's R comes 75 ms after its spike, QRS is **150 ms** (≥ 140), and every paced beat is perfused.
- **ABP handoff to Stage 2**: **22 systolic peaks in 75–95 s**, against 22.6 expected at 70 ppm; ABP ran 73–136 mmHg. The plan's check (11 ± 1 in 9.4 s) passes in `pacer-engine.test.ts`.
- **Demand**: sinus 80 with the pacer at 60 ppm gives **0 spikes** in 25 s (inhibited). With failure to sense there are **25 spikes in 25 s** (asynchronous), while 22 sinus beats continue.
- **Demand with capture**: set to 70 ppm, it measured **68 ppm** over 60 s (R-4b-2; the plan measured 68.4).
- **Failure to capture** (lifepak-like, 140 mA, 80 ppm): 27 spikes and 0 paced beats in 20 s; HR reads dashes (`hrDashes: true`).
- **LIFEPAK-like PAUSE**: **19 spikes in 59 s** at 80 × 25 % = 20 ppm (19.7 expected).
- **Default threshold 60 mA (R30)**: `setTarget paceThresholdMa 60` is accepted, and 65 mA captures 100 %.

### 12-lead, trends, audio

- `capture12`: 12 leads × **5000** samples (10 s at 500 Hz). The largest error across the III = II − I, aVR, aVL and aVF identities is **6.0e-8 mV**, float32 rounding (the plan's bound was 1e-5 mV). HR 76, QRS axis 36° (seed 4). The diagnostic filter (0.05–150 Hz) applies whatever the monitor filter is.
- Trends: 22 numerics × 28,800 s at 1 Hz = **2,534,400 B = 2.53 MB** (≤ 3 MB). CSV rows per kind equal the logged events (Task 15 test).
- Audio, live page on zoll-like with VF, charge 120 J and shock: the scheduler log has **10 alarm pulses, 1 charge, 1 chargeReady and 1 shock** tone. The largest alarm-pulse lateness is **33.0 ms** (34), under the test's 150 ms bound. See `docs/gates/stage-4b/audio-timing.json`.

### Screenshots (`docs/gates/stage-4b/`, 14 PNGs, all ≤ 34 KB)

- `saadat-like--idle.png`: grey idle bar and red crossed bells in the header and in the HR, NIBP, IBP1, IBP2, SpO2, TEMP and RR tiles. The green `II  X1  NORMAL` lane, magenta PLETH, salmon IBP1 (200/40 scale), light-blue IBP2 (30/−10) and an empty RESP lane (Stage 3).
- `saadat-like--raised.png`: red bar `ECG VFIB` in black text, VF on the ECG lane, a flat pleth and IBP1 decaying to Pmsf (VF is pulseless).
- `saadat-like--silenced.png`: the bar is grey and empty (silence hides the visual) and the header shows the `119s` countdown.
- `philips-like--{idle,raised,silenced}.png`: lanes II, V1, ART 0–150, PLETH and CO2, with tiles that show their limits (`50–120`, `90–160`…). The raised and silenced shots both keep the red `***VFIB/VTACH` bar in white text; the silenced one has the `89s` countdown.
- `zoll-like--{idle,raised,silenced}.png`: three lanes (ECG, PLETH, CO2) and four tiles, with the same bar behaviour as philips-like and a 90 s countdown.
- `zoll-like--ecg-grid.png`: the ECG-paper grid under a full sweep of traces. The traces stay readable on the dimmed major lines, and the erase bar leaves no gaps in the grid.
- `12-lead-3x4.png`: 3 rows × 4 columns (I aVR V1 V4 / II aVL V2 V5 / III aVF V3 V6) plus a lead II rhythm strip, one 1 mV × 200 ms calibration pulse per row, and the header `II  25 mm/s  10 mm/mV  0.05–150 Hz  HR 75  axis 23°`.
- `zoll-like--pacing-capture.png`: avb3Wide paced fixed at 70 ppm, 90 mA. Pace marks sit at the lane top above every captured wide beat, the pleth pulses at the pacing rate, HR reads 70, and the header shows `PACER FIXED 70 ppm 90 mA`.
- `zoll-like--defib-sync-ready.png`: sinus with SYNC on and 120 J charged. A triangle sync marker sits above every R, and the header shows `120 J READY SYNC`.
- `trends.png`: philips-like trend view over about 4 sim-minutes at 4× speed. HR ramps 75 → 130 → 55, and abpSys and abpDia are shown. SpO2 and NIBP rows are empty because there is no Stage 3 SpO2 yet and no NIBP was cycled.

Things seen in the screenshots that belong to other stages (not changed here):
- During VF, the HR tile counts VF deflections (147–172). This is Stage 1's QRS detector.
- The pleth lane, flat in VF, jumps when its auto-range re-scales on the flat signal. This is renderer auto-range, carried over from Stage 2's lanes.

## Known limits

- VF is recognised from the rhythm truth after 3 s [ENG]. There is no waveform VF detector.
- APNEA, the CO2 line INOP and the SpO2/EtCO2 limit and desat alarms are implemented and tested on synthetic events (`stage3-hooks.test.ts`). They go live only when Stage 3 emits `breath` events, its `apnoea-co2`/`apnoea-resp` flags, a `co2Line` flag and the numerics (R-4b-1). Until then their tiles show the skin's no-value glyph.
- Demand TCP with capture paces 2–3 % slow (R-4b-2).
- The `device ecg capture12` command stays rejected; use `MonitorHandle.capture12()`.
- HR averaging is Stage 1's on every skin (E-4a-2 deferred, R-4b-5).
- The e2e run writes full-colour PNGs. To keep each ≤ 60 KB they were palette-quantised afterwards (≤ 256 colours, deflate 9); a rerun has to repeat that step.

## Requests

| ID | Owner | Request |
|---|---|---|
| R-4b-1 | Stage 3 | Emit `breath` events (APNEA follows the skin's apnoea time: saadat-like 10 s, IEC-style 20 s) and keep the raw `apnoea-co2` / `apnoea-resp` ids (4b re-issues them with a level). Add a `co2Line` INOP flag, the EtCO2 jump after ROSC, and the SpO2/EtCO2 numerics |
| R-4b-2 | Stage 5.1 | TCP demand inhibition must ignore the pacer's own captured beats (68 vs 70 ppm) |
| R-4b-3 | Stage 2 | Accept stage-4 variables in `validateTarget` (4b handles `paceThresholdMa` itself meanwhile; R30 set the default at 60 mA, which Stage 2 already has) |
| R-4b-4 | 6a | Panel tab registration plus vocabulary entries for the device commands |
| R-4b-5 | orchestrator | E-4a-2: HR moving-average-seconds and the AUTO source chain |
| R-4b-6 | validation | 12-lead PR/QRS/QT/QTc fiducials and the ProSim limb ratios on `capture12` |
| R-4b-7 | Ali | VF recognition delay, the real sync-marker look, and the flashing numeric during Saadat-like silence |
| R-4b-8 | 6b | While a scenario owns the post-shock path, the driver should `preselect` the scenario's outcome (or `'unchanged'`) before forwarding a learner's shock. Otherwise the engine's §6.5 table and the scenario's transition both act on the same shock |

## Deviations from the plan

- **Base**: the plan was written on 121c3f4 + 52efd04; this branch is on 601b410. Baseline on 601b410: engine-core 305, skins 155, audio 58, controller 185, validation 16, renderer 31, all passing, typecheck exit 0. All the plan's find/replace blocks applied exactly, and the two whole-file replacements (`monitor-core.ts`, `mount.ts`) were byte-identical to the plan's base.
- **Commit trailer**: `Co-Authored-By: Claude Opus 5.5 (1M context)`, which names the model that executed the plan and is the plan's own line, not the Fable line of the executor brief.
- **Task 3 (6b drift)**: `packages/controller/src/protocol.ts` `ClinicalEvent.defib` gains `'preselect'` and `outcome?: string`. This is one additive edit outside the partition. Stage 6b's `scenario/driver.ts` copies engine `applyEvent` events into its `ClinicalEvent`, and without the edit the new `preselect` action did not type-check.
- **Task 13 (CI rule)**: four engine tests run past 60 sim-s: defib auto-disarm to 75 s, and pacer runs to 95, 60 and 80 s. They now advance through `advanceYielding(e, t)` in `test/helpers/device.ts` (≤ 60 sim-s chunks with `setImmediate` between) and take `{ timeout: 300_000 }`. The 10,000-shock test is a pure function run (73 ms) and needs no chunking.
- **Task 13 (6b drift)**: `packages/controller/test/scenario/driver.test.ts` used to shock without charging. The engine had answered "not implemented", which the driver turned into a scenario-only acceptance; now the engine rejects the shock as "not charged". The learner scripts now charge 200 J 9 s before each shock, and the first test is renamed "a charged shock is delivered by the engine and fed to the runner". No controller source changed apart from the Task 3 type widening. This is what raised R-4b-8.
- **Task 23 (renderer fix, own commit b1757fd + test 53e9bbc)**: the Saadat-like label `II  X1  NORMAL` is wider than the 56 px chrome. The erase bar ate its tail, and an auto-gain relabel left the old text under the new one (garbled in the first screenshots). The label tail is now erased on relabel and repainted, clipped to x ≥ 56 px, while the erase bar passes under it. The width is estimated at 8.5 px per character [ENG] because `Ctx2D` has no `measureText`. `test/label-tail.test.ts` fails on the Task 22 code.
- **Task 23 (header readout)**: `DeviceUI` shows `deviceText(deviceStatus)` in the header, tested in `test/device-text.test.ts`. The plan had no on-screen defibrillator or pacer status, and the brief's charge-ready screenshot needs one.
- **Task 23 (e2e)**:
  - The ecg-grid shot waits 9 s (one sweep) instead of 1.5 s, which had shown only 1.5 s of trace after the theme reload.
  - A sixth test writes `zoll-like--pacing-capture.png`, `zoll-like--defib-sync-ready.png` and `trends.png` for the brief's gate list.
  - The PNGs were palette-quantised: the raw 12-lead and ecg-grid shots were 75 and 100 KB.
- **Extra commit bf3678c (executor brief, not in the plan): Stage 3 alarm hooks.**
  - Profile: `DeviceProfile.apneaS` comes from the skin's `apneaS`; it is 20 s (`APNEA_DEFAULT_S`, brief §6.4) when the skin has no table, and `null` when a preset sets APNEA LIMIT OFF (iran-icu-as-found).
  - Inputs: `lastBreathT` from brief §7.3 `breath` events. The event is matched structurally, because `breath` is not in main's `EngineEvent` yet.
  - Inputs: `apnoeaFlags` from Stage 3's raw `apnoea-co2`/`apnoea-resp`. The device layer drops level-less alarms, so without this Stage 3's apnoea alarms would disappear at merge.
  - Inputs: `co2Line` from the raw `co2Line`/`co2-line` flags.
  - Conditions: APNEA at level 1, evaluated whatever the switches say, with the texts `***APNEA` and `RESP APNEA`; and `co2Line` at level 3, technical, with `CO2 LINE` and `CO2 CHECK LINE` [inferred].
  - Tests: `test/l3/alarms/stage3-hooks.test.ts`, 5 tests on synthetic events, including the SpO2/EtCO2 limit and desat alarms.
- **Task 24 (6b drift)**: the Stage 6b ACLS page's learner button "Shock 200 J" also shocked without charging, so `stage6b.e2e.ts` failed. `apps/demo/src/stage6b/actions.ts` gains a "Charge 200 J" learner action. The 6b e2e clicks it, waits 8 s, then shocks, and the scenario still reaches ROSC on seed 42.
  - The ownership check lists four files outside the 4b list, all Stage 6b adaptations: `packages/controller/src/protocol.ts`, `packages/controller/test/scenario/driver.test.ts`, `apps/demo/src/stage6b/actions.ts` and `apps/demo/e2e/stage6b.e2e.ts`.
- **Task 24 (screenshots)**: the older suites rewrite their gate screenshots, so `docs/gates/stage-4a`, `stage-6a` and `stage-6b` were restored. 4a's two ecg-grid shots now render differently because Task 2 dimmed the grid; 4a's originals were kept as its evidence.
- **CI timeouts (6b test)**: GitHub CI failed on `driver.test.ts` "a different runner seed…" at its 30 s timeout. It runs 4 × 320 sim-s tick by tick, about 12 s on a laptop and more than 30 s on the 2-vCPU runner. The same test also fails on main's own CI (runs 36082491476, 36079617326), so this is not a 4b regression. Under the binding CI rule, the file's `SLOW` timeout is now 300 s and applies to that test and to the 2 × 400 sim-s replay-identity test.
- **Environment**: the host ran at a load average of about 90 while Stage 3 ran concurrently. Under that load the controller test "a different runner seed…" (30 s timeout) timed out once, on 601b410 as well as on this branch. It passed in the final run.
