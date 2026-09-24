# Patient-Monitor Engine: Design Brief (v1)

*Rev 2, 2026-09-24: added saadat-like profile (R13), second-round decisions (R12).*

*Status: design phase. Written 2026-09-24 from `research/00`–`05`; Rev 2 adds `research/06`. Audience: an engineer who has read none of the research.*

**Citation convention.** `[05 §3.2]` means `research/05-rendering-ux-integration.md`, section 3.2. The other files are `01-commercial-simulators`, `02-open-source-and-academic`, `03-waveform-physiology-reference`, `04-squiggler-and-web-sims` and `06-saadat-alborz-b9` (whose `[M p.N]` means Saadat manual, PDF page N). `R1`–`R13` are the binding orchestrator rulings in `research/00-orchestrator-rulings.md`.

**Confidence tags** (inherited from report 03):
- **[ENG]** is an engineering choice: tune it, and don't cite it as literature.
- **[VERIFY]** must be checked against the primary source before the stage gate that uses it. The owning stage is named in §10.
- An untagged number carries a report citation.
- Saadat data quoted from report 06 keeps that report's own tags verbatim: **[measured]** (a colour sampled from the manual's native screenshots, not a value Saadat publishes), **[assumed]** (an engineering guess made to fill a skin field), **[unverified]**, **[conflict]** and **[inferred]**.

---

## 1. Purpose, users and non-goals

**Purpose.** The engine is a simulated patient monitor covering:
- ECG (3/5/12-lead);
- IBP (ABP, CVP, PAP), NIBP and PR;
- SpO2 with its pleth;
- EtCO2 with its capnogram;
- temperature and RR.

Every waveform comes from a coupled physiology core and passes through a model of how real monitors *measure, filter, average and alarm*. The engine is a **library first**: an embeddable ES module plus a single-file IIFE (R10). The monitor application (the demo app) comes second.

**Users.**
- *Host software:* Ali's ACLS/BLS simulator, the OR/anaesthesia simulator, the scenario builder, and the sibling `ventilator-simulator` (a static single-file HTML app with a 200 Hz physics loop, `DT = 0.005`).
- *Instructors:* they drive the engine from a hidden same-screen panel or from a separate networked controller (README decision; R7).
- *Learners:* residents in the anaesthesia orientation boot camp, using an iPad, a laptop or a projector.

**v1 scope.**
- **Channels:** every channel above.
- **Physiology modes:** MANUAL and MODELED (R4).
- **Rhythms:** 35 rhythm IDs, plus PEA on any organised rhythm, 4 pacing faults and modifiers (§5).
- **Device behaviour:**
  - device-layer numerics;
  - IEC-style alarms and audio, plus the Saadat alarm sound profile (§6.4.1);
  - pacer and defibrillator overlays;
  - 12-lead capture;
  - trends and an event log.
- **Presentation:** six data-only skins, including `saadat-like` for the monitor Iranian residents actually use (R13; §3.8, §6.9).
- **Control:** same-screen and remote controllers over four transports, plus a scenario state-machine runner.
- **Quality and delivery:**
  - a validation harness;
  - an IIFE embed in the ventilator simulator.

**Non-goals for v1:**
- any diagnostic or medical-device use;
- bit-identical replay across devices [05 §1.1.6];
- pixel-exact vendor trade dress or logos [05 §5.3];
- more than one patient per engine instance (several instances per page are allowed);
- claiming IEC 60601-1-8 compliance (alarms are labelled "IEC-style", §11 C7).

**v2 candidates** (explicitly later):

| Candidate | One line |
|---|---|
| Pulse backend | Pulse (Apache-2.0) behind the `L1Backend` interface, as WASM in the worker. Its web-wasm target is experimental and its iPad size and real-time factor are unmeasured [02 B1; 05 §5.8]. |
| WebGL renderer | A pluggable WebGL2 renderer for a phosphor/glow look or more than 16 lanes. It needs triangle-strip lines, because `lineWidth` is capped at 1 [05 §1.2, §3.1]. |
| Hardware and manikin bridges | VitalsBridge-style physical outputs, BLE CPR sensors and real BVM breath detection [01 §4.19, §5]. |
| Anaesthesia gases, BIS, TOF | Agent %/MAC, BIS/EEG and NMB kinetics. PK/PD comes from the Schnider/Minto/Eleveld papers; volatile uptake from open-anesthesia-sim (Apache-2.0, needs an audit) [02 §4; 01 §6.4]. |
| IABP, PA-catheter insertion, ICP | Uses the Infirmary Integrated vertex tables (Apache-2.0) [02 §4.3; 01 §4.11]. |
| Interop exports | FHIR `SampledData` run export, xAPI learner statements, and an SDC/OpenICE bridge [05 §4.1]. |
| Laerdal `.scx` import | Its format is probably XML **[unverified]** [01 §5]. |
| Volumetric capnography and ventilator loops | On the monitor [03 §4.1]. |
| True-scale paper/PDF strip export | Covers Squiggler's niche [04 §5]. |
| Multi-patient instructor console | SimVS-style, with more than 10 displays [01 §4.26]. |

---

## 2. What we learned

1. **Four market tiers:**
   - manikin-ecosystem monitors (Laerdal, CAE/Elevate, Gaumard);
   - "sim-in-a-bag" emulators (REALITi 360: 29+ device skins, 70–75+ rhythms, instructor-driven vitals);
   - cheap apps and web tools;
   - hardware signal generators.

   **No product combines device-accurate rendering with coupled physiology** [01 §1, §6.1].
2. **CAE Maestro is the only product with both Modeled and Manual modes.** It has per-parameter override, a "return to Modeled" button, factor inputs (e.g. HR ×2.0), onset control, and flags for "in transition" and "system override". This is our pin/release template [01 §2.3, §4.1–4.4].
3. **Rhythm libraries converge on 40–75 entries.** Products differentiate through **modifiers**: PVC probability 0–90%, ectopy patterns, artefact levels, RSA and ST offset [01 §1, §4.14].
4. **Scenario engines converge on state machines with multi-trigger transitions:**
   - CAE SCE: time in scenario or state, vitals, meds, fluids, treatments;
   - Laerdal phases;
   - Infirmary Integrated steps and progressions.

   [01 §1, §2.3; 05 §4.1]
5. **Integration is closed everywhere.** There is no standard sim↔monitor protocol, and SDC (SOAP/DPWS) is too heavy. Pulse's *action + data request + fixed 20 ms step* triad is the best template for a command API [01 §5; 05 §1.1.7, §4.1].
6. **Realism is device behaviour:**
   - HR is a 12-RR average, updated ≤1 Hz, and reaches 80→120 bpm in <11 s;
   - SpO2 responds in ≤20 s;
   - NIBP is a timestamped cuff cycle;
   - pacer spikes and sync markers are overlays, not samples.

   [05 §1.1.1–2]
7. **Almost nobody couples waveforms.**
   - REALITi was still hand-patching the capnogram I:E ratio in 2025.
   - SVV and pleth damping are toggles.
   - Every web monitor draws each channel independently, and one puts the pleth upstroke *before* the R-wave.

   [01 §1, §6.2; 04 §1]
8. **No mature permissive web monitor exists to fork.** Open Sim Lab (MIT, TypeScript, one commit) has the right shape: worker generators, mechanical waves triggered by the R-wave, and an incremental Canvas sweep with a 14 px erase bar. Its constants are unproven [02 §1, A2].
9. **Pulse and BioGears (Apache-2.0) are physiology-grade but not waveform-grade.** Pulse gives a single Lead III template, 10 rhythms, 50 Hz output, no pleth, and an experimental wasm target [02 §1, B1].
10. **Several key signal generators are GPL:** ECGSYN, the PhysioNet ECG/PPG simulator and the Python Anesthesia Simulator. The MIT-labelled ECGSYN ports are licence-doubtful, so we clean-room from papers [02 §1, §4].
11. **Squiggler has the best web ECG model, but it is static, server-side and closed.** Borrow its ideas, not its code or output:
    - the layered atria × AV cadence × ventricle model;
    - axis and wall weights with automatic reciprocity;
    - `patientSeed` + `morphologyVariation`;
    - `respectRefractory`;
    - a public vocabulary schema.

    [04 §1, §5]
12. **Open data covers validation:**
    - VitalDB (CC BY 4.0; 6,388 OR cases with synchronous ECG, ART, PLETH and CO2 at 62.5–500 Hz);
    - MGH/MF (ODC-By, 360 Hz, with CO2);
    - PWDB (PDDL);
    - PTB-XL, MIT-BIH and CUDB.

    CapnoBase and MIMIC are excluded until their licences are confirmed (R6) [02 §D, §4].
13. **Canvas2D is enough.** At 25 mm/s a lane gains ~1.6 CSS px of trace per frame. GPU charting libraries solve full-redraw problems and bring 1 px line caps or licence costs [05 §1.1.3, §3.1].
14. **The web platform has traps, each with a workaround:**

    | Trap | Workaround |
    |---|---|
    | iOS throttles rAF to 30 fps (Low Power Mode, cross-origin iframes) | Take the sweep from sim time |
    | No `AudioContext` in workers; the iOS mute switch silences Web Audio | Run audio on the main thread |
    | No true millimetres | Calibrate |
    | `Math` precision differs between engines | Host-authoritative sync |

    [05 §1.1.4–6, §5]
15. **Report 03 gives equations for every channel,** with confidence tags. Its [VERIFY] list gates particular stages (§10) [03 §0, §10].

---

## 3. Architecture (R1–R3, R7)

### 3.1 Overview

```
 MAIN THREAD                                            WORKER (one per monitor instance)
┌───────────────────────────────────────┐  commands   ┌──────────────────────────────────────────────┐
│ host page (demo / ACLS / OR / vent sim)│ ──────────► │ ENGINE CORE  @pme/engine-core (no DOM; Node-ok) │
│  mountMonitor() → MonitorHandle       │             │  clock: accumulator → fixed 20 ms ticks        │
│ controller: hidden panel | remote UI  │ frame pump  │  L1 patient truth   MANUAL | MODELED | (Pulse) │
│   └ Transport ◄──► network            │ ──────────► │  L2 signal synthesis → Float32 ring buffers    │
│ DOM numerics tiles (≤1 Hz, CSS flash) │ ◄────────── │  L3 device model → measurements, alarms,       │
│ AUDIO  @pme/audio (Web Audio,         │ measurement │      markers, tone events                      │
│   25 ms timer / 100 ms look-ahead)    │ alarm, tone │ RENDERER @pme/renderer on OffscreenCanvas:     │
│ <canvas> (control transferred)        │ state 1 Hz  │   sweep lanes, erase gap, min/max decimation,  │
└───────────────────────────────────────┘             │   event overlays (pace, sync, shock, NBP)      │
      skins @pme/skins = JSON data only               └──────────────────────────────────────────────┘
```

### 3.2 The three layers (R1)

| Layer | Owns | Rate |
|---|---|---|
| **L1 patient truth** | The state vector in §4.9. Ramps, pins, coupling rules (MANUAL) or lumped physiology (MODELED); drug, fluid, bleed and airway effects | Every tick. Gas exchange, reflexes and pharmacology at 10 Hz (every 5 ticks); temperature at 1 Hz [03 §8.1]. Haemodynamics per beat |
| **L2 signal synthesis** | Beat and breath schedulers (rhythm engine §4.1, respiratory driver §4.7) and per-channel generators writing true signals. Artefact injectors are summed *before* L3 filters | ECG as VCG X/Y/Z at **500 Hz**; ABP/CVP/PAP/pleth at **125 Hz**; CO2/resp at **62.5 Hz** (R1) |
| **L3 device model** | Display filters, QRS and pulse detectors, HR/PR/SpO2 averaging, NIBP cuff cycle, sensor states, alarm engine, pacer and defibrillator | Per new sample (filters, detectors); per beat or breath; numerics at 1 Hz |

### 3.3 Tick model

- **Clock.** `simT = tick × 0.020 s` (Pulse's default step [05 §3.2]). Frames feed the clock through an accumulator [05 §3.2; S38]:
  - `acc += min(wallΔ, 250 ms) × timeScale` **[ENG clamp]**;
  - `while (acc ≥ 20 ms) tick()`.
  - `timeScale` ranges 0.25–4. Pause and single-step are also supported.
- **Order of work inside `tick()`:**
  1. Apply the commands stamped for this tick.
  2. Advance L1 ramps and fast state.
  3. L2 extends its schedules and writes samples up to `simT + L`.
  4. L3 consumes the new samples.
  5. Emit events.
- **Look-ahead.** `L` = **100 ms** (see §11 C6).
- **Sample indexing.** Every channel writes by *absolute sample index*: sample `n` belongs to time `n / rate`. A tick fills indices `last+1 … floor((simT+L)·rate)`. This matters because 125 Hz gives 2.5 samples per tick and 62.5 Hz gives 1.25, so per-tick sample counts would drift (§11 C3).
- **Commands that change waveforms** invalidate the not-yet-rendered look-ahead, which is then regenerated. This applies to rhythm changes, shocks, sensor changes and line events. The effect shows on the next frame [05 §3.2]. Tone events already posted after the invalidation point are revoked with `toneCancel`.
- **Hidden tabs.** When the tab is hidden, drawing stops and ticking continues [05 §3.2]. On return the engine catches up in bulk without drawing.
- **Determinism** [05 §3.3; 04 §5]:
  - an sfc32 PRNG with one stream per subsystem (`hrv`, `ectopy`, `conduction`, `artefact`, `noise`, `measurement`, `scenario`, `outcome`), seeded from `hash(seed, name)`;
  - a replay log made of seed + initial snapshot + command list + the external-drive track;
  - replay is exact on the same build.

### 3.4 Worker / main split

- **Worker.** The engine core and renderer share one Worker. It owns an `OffscreenCanvas` obtained through `transferControlToOffscreen()`; 2D is supported from Safari 16.4 [05 §3.2].
- **Main thread.** DOM numerics, audio, controllers and transports.
- **No `SharedArrayBuffer`.** It needs COOP/COEP, which would break embedding in other sims [05 §3.2].
- **Fallback.** The same modules run on the main thread when `Worker` or `OffscreenCanvas` is unavailable, or when the IIFE cannot construct its inline blob worker.
- **Frame pump.** The worker uses its own `requestAnimationFrame` where the browser provides it. Otherwise the main thread posts each rAF timestamp. Worker rAF on iPad Safari is **[unverified]**; test it in Stage 1.
- **Worker → main traffic:**
  - measurements at ≤1 Hz;
  - NIBP cuff pressure at 5 Hz while measuring **[ENG]**;
  - tone events;
  - alarm changes;
  - `state` at 1 Hz.

  Each batch carries a clock anchor `(simT, performance.now())`.

### 3.5 Rendering pipeline (R2)

| Quantity | Value | Source |
|---|---|---|
| Sweep speeds | 6.25 / 12.5 / 25 / 50 mm/s. Defaults: ECG, IBP and pleth **25**; CO2 and resp **6.25**. `saadat-like`: options 3 / 6 / 12.5 / 25 (ECG 12.5 / 25 / 50); ECG and pleth 25, **IBP 12.5**, CO2 12.5, resp 6 | [05 §2.2] (Philips); [06 §3.2] |
| Default calibration | 96 CSS px/in = **3.78 CSS px/mm** until the user matches an on-screen bar to a card (85.6 mm). A "seconds per lane" mode is also offered | [05 §3.1, §5.1] |
| Trace speed at 25 mm/s | **94.5 CSS px/s**: 1.575 px/frame at 60 fps, 3.15 at 30 fps, 0.79 at 120 Hz. At DPR 2 that is 189 device px/s | [05 §3.1] |
| ECG samples per pixel | 5.3 per CSS px, 2.65 per device px (DPR 2) → **min/max decimation per device-pixel column**, which keeps QRS and VF crests | [05 §3.2] |
| 125 Hz lanes | 1.32 samples per CSS px → polyline through every sample | derived |
| CO2 at 6.25 mm/s | 23.6 CSS px/s and 2.6 samples per CSS px | derived |
| Lane x-position | `x = (simT · mm_s · px_mm) mod laneWidth`, **never** from frame counts | [05 §3.2] |
| Erase gap | Default **16 CSS px** (≈4.2 mm ≈170 ms at 25 mm/s); skin range 12–20; snapped to device pixels. Open Sim Lab uses 14 px. No vendor source exists **[unverified]**. `saadat-like`: erase bar left to right, very narrow gap (`gapPx` 4), no cursor line **[inferred from S8; verify]** | [05 §2.7, §3.2; 02 A2; 06 §3.1 F7] |
| Line width | 1.5–2 CSS px (skin); round joins; re-stroke the last 1–2 points each frame | [05 §3.2] |
| ECG gain | 10 mm/mV default. Options 1.25–40 mm/mV and auto. ZOLL-like skin: 1 cm/mV. `saadat-like`: ×0.25 / ×0.5 / ×1 / ×2 / ×4 / **AUTO (default)**, lane label "X4" | [05 §2.2; 06 §3.2] |
| Canvas | `getContext('2d', {alpha:false, desynchronized:true})`; backing store = CSS size × DPR; watch DPR through `matchMedia` | [05 §3.2] |
| Buffer length | **120 s** for freeze and scroll-back (Mindray) | [05 §2.7] |

**Ring buffers (Float32).**

| Buffer | Rate | Samples in 120 s | Bytes |
|---|---|---|---|
| VCG X, Y, Z (unfiltered truth; source for 12-lead capture) | 500 | 3 × 60,000 | 720 KB |
| Displayed ECG leads after the monitor filter (≤3 lanes) | 500 | 3 × 60,000 | 720 KB |
| abp, cvp, pap, pleth | 125 | 4 × 15,000 | 240 KB |
| co2, resp | 62.5 | 2 × 7,500 | 60 KB |
| **Total** | | | **≈1.74 MB** |

Trends are stored at 1 Hz for 8 h: 28,800 × 24 numerics × 4 B = 2.8 MB **[ENG]**.

**Per frame, for each lane** [05 §3.2]:
1. Take the x-range from the last drawn x to the current x, wrapping if needed.
2. Clear the erase-gap rectangle ahead of the cursor.
3. Draw the new samples as a polyline, decimated if the rate needs it.
4. Re-stroke the previous frame's tail.
5. Draw overlays from the event queue. These are never drawn from samples:
   - pace marks: a vertical mark 1–2 mm above the trace [03 §1.7];
   - sync markers: a line (Philips-like), a triangle mid-QRS (LIFEPAK-like) or an R marker above the trace (ZOLL-like) [05 §2.6];
   - shock marks;
   - "NBP measuring";
   - lead-off dashes;
   - lead label, filter letter and 1 mV calibration bar [05 §2.7].

**Power** [05 §3.2]:
- static chrome is never redrawn;
- drawing stops when the tab is hidden;
- a 30 fps projector / low-power mode is available;
- no `shadowBlur`.

### 3.6 Audio (R3)

- **Context.** `AudioContext({latencyHint:'interactive'})`, created *and* resumed inside the first user gesture. An "Enable sound" gate is shown.
- **iOS mute switch.** Use the `<audio>` keep-alive workaround [05 §3.2].
- **Clock mapping.** `wallMs(t) = anchorWall + (t − anchorSim)/timeScale`, then map to the audio clock with `getOutputTimestamp()` [05 §3.2].
- **Scheduler.** A 25 ms timer with 100 ms look-ahead [05 §3.2]. Tone events are also scheduled the moment they arrive. An event up to 30 ms late plays immediately; a later one is dropped **[ENG]**.
- **QRS/pulse beep:**
  - 60 ms long, sine plus 2nd harmonic, 5 ms attack and release **[ENG]**;
  - pitch `f = 880·2^(−(100 − SpO2)·s/12)`, with `s` = 0.1 semitone/% for "Nellcor-like" (≈5 Hz/%) or 0.25–0.5 for "enhanced" [03 §3.6];
  - the beep source (ECG QRS or detected pleth pulse) is a skin setting [05 §2.5];
  - no pulse means no tone;
  - off by default on the ZOLL- and LIFEPAK-like skins [05 §2.5];
  - `saadat-like`: BEAT VOLUME 1–7 or OFF, **default 1**; the tone follows the HR source; SpO2 pitch modulation is not documented **[unverified]**, so `pitchMap: none` until Ali's recording (§10) settles it [06 §4.1].
- **Alarm bursts** are specified in §6.4. Charge and shock tones are in §6.5.
- **When `timeScale ≠ 1`**, beeps follow sim time but alarm bursts keep real-time patterns **[ENG]**.

### 3.7 Transports and authority (R7)

- **One device owns the simulation.** Commands go in; events and low-rate state come out. Raw samples never cross the wire; the `WireMessage` type makes this impossible (§7.5).
- **Viewers** (a second monitor, a projector) run L2 and L3 locally from the event stream:
  - `beat`, `atrial`, `breath`, `rhythmSegment` and `marker` events;
  - `state` at 1 Hz.

  A late joiner receives `snapshot()` and then live events [05 §4.3]. Viewers are *visually equivalent*, not bit-identical [05 §1.1.6].
- **Adapters** [05 §4.3; 05 §4.1 EduSim]:

  | Adapter | Use |
  |---|---|
  | `in-process` | Same page |
  | `postMessage` | Iframe or worker |
  | `broadcastChannel` | Same origin and browser, e.g. an instructor window plus a projector window |
  | `websocket` | Through the relay in `@pme/controller/relay`: rooms, 6-character session codes, a snapshot cache for late joiners |
  | `webrtc` | DataChannel, reliable and ordered, signalled through the relay |

- **MQTT is not in v1.** Its public brokers are unauthenticated [05 §4.1].

### 3.8 Skins as data (R2)

A skin is a JSON document validated by a schema in `@pme/skins`. It sets:
- colours per parameter;
- a scheme: dark, projector-light or ECG-grid [05 §2.7];
- font stack and the layout of lanes and tiles;
- sweep, gain, filter and lead defaults;
- alarm sound profile ("traditional", "ISO" or "saadat", §6.4.1), repeat intervals, silence and pause times;
- alarm-limit tables by age band;
- beep source and pitch-map preset;
- NIBP and SpO2 averaging profiles, and the HR-averaging method;
- sync-marker style;
- defibrillator energy and pacer defaults.

v1 ships `saadat-like`, `philips-like`, `ge-like`, `mindray-like`, `zoll-like` and `lifepak-like`, plus the themes `projector-light` and `ecg-grid`. Skins are "-like" only, with no logos [05 §5.3]; for `saadat-like` that means no Saadat logo or trade dress beyond "-like" (R13).

**Recommended build order** (orchestrator's recommendation, pending Ali's confirmation, §10 question 7): **`saadat-like` → `philips-like` → `zoll-like`**. `saadat-like` goes first because it is the monitor Iranian residents actually see; it is built to the same depth as `philips-like` (R13). `ge-like`, `mindray-like` and `lifepak-like` follow and may slip to v1.1 if Stage 4 overruns (R12).

**Fields added for `saadat-like`** (R13) [06 §3.2, §5, §5.1]. The schema above lacked these. Every existing skin takes the value in the last column, so none of them changes. Field names follow the draft skin in report 06 §5, which becomes the reference instance for the schema.

| Field | Values | `saadat-like` | Default (other skins) |
|---|---|---|---|
| `colorBinding` | `byLabel` \| `byChannel` | `byChannel`: IBP colour follows IBP1–4, not ART/CVP/PAP | `byLabel` |
| `ecgColorLocked` | boolean | `true` (MODULE COLOR excludes ECG) | `false` |
| `chrome.*` | `divider`, `windowFrame`, `focusFill`, `softkeyFrame`, `pageBox`, `patientCategoryColor` | 1-px grey dividers, bright-green window frame, pink focus, yellow soft-key cells, white page box, yellow "ADULT" (§6.8) | vendor-neutral chrome |
| `font.numericWeight` | number | 400 (regular Arial-like; the Alvand variant is condensed bold) | per skin |
| `alarms.levels` / `alarms.levelNames` | count; display names | 3; `"1"`, `"2"`, `"3"` (1 = highest) | 3; high / medium / low |
| `alarms.lamp` | per level `red-flash` \| `yellow-flash` \| `yellow-steady` \| `cyan-steady`, plus `flashHz` | L1 red-flash, L2 yellow-flash, **L3 yellow-steady**; `flashHz` 2.0 / 0.6 **[assumed]** | §6.4 visual table |
| `alarms.messageBar` | per level `{bg, fg}`, plus `idle`, `acknowledged`, `prefix` (`asterisks` \| `none`), `rotate` | black text on red / yellow / cyan; grey when idle or acknowledged; `prefix: none`; `rotate: true` | §6.4 bars; `prefix: asterisks` |
| `alarms.factoryEnabled` | boolean, or a per-parameter map | `false` for every parameter | `true` |
| `alarms.alwaysOn` | alarm IDs that ignore the per-parameter switch | `ASYSTOLE`, `VFIB`, `VTAC`, `APNEA` | `[]` |
| `alarms.alarmOffIcon` | icon ID | `crossed-bell-red` in every tile whose alarm is OFF, and in the header when all are OFF | vendor icon |
| `alarms.soundProfile` | `"traditional"` \| `"iso"` \| `"saadat"` | `saadat` (§6.4.1) | `iso` |
| `alarms.sound` | per level `{pattern, repeatS}` (pattern = pulse slots, `0` = a long gap), plus `pulseMs`, `gapMs`, `longGapMs`, `fundamentalHz` | L1 `[1,1,1,0,1,1]` / 10 s, L2 `[1,1,1]` / 20 s, L3 `[1]` / 30 s; timings and pitch **[assumed]** | derived from the §6.4 burst table |
| `alarms.volume` | `{min, max, default}` | 1–7, default **1** | 0–10 (§6.4) |
| `alarms.silence` | `{durationS, suppressesVisual, cancelOnNewAlarm, headerCountdown, technicalActsAsAck}` | 120 s, `true`, `true`, `true`, `true` | 90 s, audio only (§6.4) |
| `alarms.pause` | `{durationS}` or `null` | `null` (Audio Pause key has "no function") | 180 s |
| `alarms.latching` / `alarms.delayS` | boolean; seconds | `false` **[unverified]**; <1 s | §6.4 |
| `alarms.alarmFreezeOption` / `alarms.recall` | boolean; `{count, windowS}` | available (default **[unverified]**); 20 alarms, ±5 s | `false`; none |
| `hr.method` | `trimmed-mean-12rr` \| `mean-12rr` \| `moving-average-seconds` | `moving-average-seconds` | `trimmed-mean-12rr` (Philips-like `mean-12rr`) |
| `hr.windowOptions` / `hr.windowDefault` | seconds | 4 / 8 / 16; **8** | — |
| `hr.source` / `hr.autoPriority` | `AUTO` or a source; ordered source list | `AUTO`; ECG > IBP1 > IBP2 > IBP3 > IBP4 > SpO2 | `ECG` with fallback (§6.1) |
| `hr.relabelNonEcgAs` | string | `PR`: the tile also takes the source's colour and unit | — |
| `ecg.filters` / `ecg.filterDefault` | map of display name → band in Hz | MONITOR 0.5–24, **NORMAL 0.5–40**, EXTENDED 0.05–100; default NORMAL | the §4.1 names |
| `ecg.gainOptions` / `ecg.gainDefault` | list including `"AUTO"` | ×0.25 … ×4, AUTO; **AUTO** | 10 mm/mV |
| `ecg.laneLabel` | template | `{lead}  X{gain}  {FILTER}` | lead + filter letter |
| `calendar` | `{default, options: gregorian \| solar, dateFormat}` | factory `gregorian`; `solar` option renders Jalali `YYYY/MM/DD` with Latin digits (`Intl.DateTimeFormat` with `ca-persian`) in the header, trend axes and recall list | `gregorian` only |
| `language` | locale or `en-only` | `en-only` | per skin |
| `layout.menuRegion` | `popup` \| `wave-area-bottom` | `wave-area-bottom` (covers 1–6 lanes, green frame, pink focus, EXIT bottom-right) | `popup` |
| `pages` | ordered `{id, kind, …}`; kinds `standard`, `multiEcg`, `dualSpo2`, `ibp`, `bigNumber`, `pump` | P1–P10; **P10 = `pump`** (bypass page, §6.9). No big-number page is documented for the B9 **[unverified]**; the `bigNumber` kind exists for other skins | one `standard` page |
| `trend.style` | `line` \| `filled-area` | `filled-area` | `line` |
| `glyphs` | unavailable-value strings | HR `-?-`, NIBP failure `?`, out of range `--`, IBP PR `---` | dashes |
| `arrhythmia.defaultOn` / `arrhythmia.asystoleS` | boolean; seconds | `false`; **10** (alternative 5 **[conflict: verify]**) | per skin; 4.0 / 3.0 |
| `nibp.modeDefault` / `nibp.stat` / `nibp.nextInflation` | mode; `{count, spacingS, windowS}`; rule | `MANUAL`; 10 × 30 s in 300 s; `prevSys+30` | per skin; back-to-back for 300 s; `prevSys+10` |
| `sweep.style` / `sweep.gapPx` / `sweep.cursorLine` | | `erase-bar`, 4, `false` **[inferred from S8; verify]** | `erase-bar`, 16, `false` |
| `presets` | named partial skins merged over the skin **[ENG]** | `iran-icu-as-found` (§6.9) | none |

---

## 4. Physiology and signal models (R4, R5)

### 4.1 ECG

**Generator.** An event-scheduled sum of Gaussian kernels on a 3-axis VCG [03 §1.2–1.3]:

```
ECG_axis(t) = baseline_axis(t) + Σ_events Σ_waves a_w,axis · exp(−(t − t_event − τ_w)² / (2σ_w²)),   axis ∈ {X,Y,Z}
T wave = two half-Gaussians, rising σ = 1.6 × falling σ      [03 §1.3, ENG]
```

**Seed kernels, lead II at 60 bpm** [03 §1.3, ENG]. Timings are relative to QRS onset.

| Wave | τ (ms) | σ (ms) | a in II (mV) |
|---|---|---|---|
| P | −PR + 45 (e.g. −115) | 22 | 0.15 |
| Q | 12 | 8 | −0.08 |
| R | 40 | 10 | 1.1 |
| S | 62 | 9 | −0.25 |
| T peak | QT − 110 (e.g. 290) | 45 rise / 30 fall | 0.30 |
| U (optional) | QT + 70 | 35 | 0.03 |

**Lead projection** [03 §1.2]:
- Each wave carries a VCG vector `(a_x, a_y, a_z)`.
- Leads I, II and V1–V6 come from the Dower rows below **[VERIFY: Dower 1980 / Edenbrandt & Pahlm 1988]**.
- The other limb leads follow the exact Einthoven/Goldberger identities: `III = II − I`, `aVR = −(I+II)/2`, `aVL = I − II/2`, `aVF = II − I/2`.
- The default wave vectors are fitted in Stage 1 so that the projected normal beat meets two checks:
  - the ProSim lead ratios: I 70%, III 30%, V1 24%, V4 120% of II [01 §4.16];
  - (in Stage 5) the PTB-XL normal median beats.
- Frontal axis (normal −30° to +90°) and precordial transition lead (1.5–5.5) are rotations of those vectors [04 §4].

| Lead | X | Y | Z |
|---|---|---|---|
| I | 0.632 | −0.235 | 0.059 |
| II | 0.235 | 1.066 | −0.132 |
| V1 | −0.515 | 0.157 | −0.917 |
| V2 | 0.044 | 0.164 | −1.387 |
| V3 | 0.882 | 0.098 | −1.277 |
| V4 | 1.213 | 0.127 | −0.601 |
| V5 | 1.125 | 0.127 | −0.086 |
| V6 | 0.831 | 0.076 | 0.230 |

**Rate rules** [03 §1.1]:
- `QT = QTc · RR^(1/3)` (Fridericia), with QTc 400 ms by default. This gives QT 458 / 400 / 363 / 317 / 295 / 268 ms at 40 / 60 / 80 / 120 / 150 / 200 bpm.
- `PR = clamp(PR60 − 0.4·(HR − 60), 110, PR60)`.
- QRS width changes by ≤5% across rates.
- P riding on T at 150 bpm must *emerge* from the timing and never be special-cased.
- Paediatric intervals use the per-age values in [03 §1.1].

**HRV** [03 §1.4]:

```
RR_n = RR_mean + A_RSA·sin(2π·f_resp·t_n + φ) + A_LF·sin(2π·0.1·t_n + ψ) + ε_n
```

| Condition | A_RSA | A_LF | ε SD |
|---|---|---|---|
| Awake adult | 30–60 ms | 20–40 ms | 10–20 ms |
| Under GA | all terms × 0.2–0.4 | | |
| Positive-pressure ventilation | 5–15 ms, slaved to the ventilator phase | | |

Respiration also adds baseline wander of 0.05–0.15 mV at `f_resp` and modulates R amplitude by ±5–15%.

**Rhythm engine.** Separate atrial and ventricular clocks with an AV-node state machine (R5), borrowing Squiggler's atria × cadence × ventricle layering [04 §5]:

```
atria     { mode: sinus|flutter|fib|ectopic|retro|paced|none, rateBpm, nextT }
avNode    { mode: conducted|wenckebach|mobitz2|fixedRatio|variable|dissociated|integrateFire,
            prMs, erpMs, ratio, groupPos }
ventricle { escape: junctional(40–60)|ventricular(20–40)|none, focus: none|vt|torsades|vf|idioventricular,
            ectopy: EctopySpec, refractoryUntil }
pacer     { mode: off|demand|fixed, ratePpm, mA, thresholdMa }

onAtrial(t):        emit atrial kernel; if avNode.conducts(t) → scheduleVentricular(t + PR_n, 'conducted')
onVentricular(t,k): if t < refractoryUntil && respectRefractory → concealed (dropped)
                    else emit QRS-T(template k, VCG by focus); emit mechanical beat (k_rhythm §4.8)
                         refractoryUntil = t + QRS + 0.8·QT [ENG]; reset escape timer
                    (a PVC does not reset the SA clock → full compensatory pause; a PAC does)
escape timeout:     scheduleVentricular(now, 'escape')
per sinus beat:     draw ectopy (PVC coupling 40–80% of RR; PAC 60–85%); patterns use a beat counter
pacer:              demand fires if nothing sensed within 60/rate; fixed always fires;
                    capture iff mA ≥ thresholdMa → scheduleVentricular(t_spike, 'paced')
```

**AV-node sub-models:**
- **Mobitz I:** `PR_n = PR_1 + Δ·(1 − r^(n−1))/(1 − r)`, with Δ = 60–120 ms and r = 0.5 [03 §1.5].
- **AF ventricular response** follows the Lian 2007 integrate-and-fire junction [03 §1.5]:
  - atrial impulses arrive as a Poisson process at 5/s;
  - each impulse adds +15 mV;
  - phase-4 depolarisation is 30 mV/s;
  - threshold, refractoriness and concealed conduction apply;
  - the refractory period is the rate-control knob.

  The statistical fallback uses gamma(shape 8), CV 0.15–0.25 and RR_min 0.25–0.30 s.

**Special generators.** Parameters are in §5.
- **VF** uses a hybrid of templates and an envelope (§11 C1) [03 §1.8]:
  - `f_dom(t) = 5.5 − 1.5·(1 − e^(−t_noCPR/8 min))` Hz; CPR adds 0.5–1 Hz;
  - `A(t) = A0·e^(−t_eff/τ_A)`, with A0 0.6–1.0 mV (coarse), τ_A 6–8 min without CPR and 15–20 min with it;
  - the coarse/fine split is at 0.2 mV;
  - asystole hazard is 0.02/min, forced when A < 0.05 mV;
  - epinephrine adds 20–40% to A and 0.5 Hz to f_dom for 2–4 min.

  Recorded CUDB/MIT-BIH segments give the texture and are time-warped to `f_dom(t)`. The fallback is a sum of four AR(2) resonators at `f_dom·{0.8, 1, 1.25, 1.6}` with 1–2 Hz bandwidth.
- **Torsades:** envelope `cos(2πt/T_twist)`, with T_twist 5–20 beats, at 200–250/min.
- **AF f-waves:** templates, with a fallback of 2–4 random-phase sinusoids at 5–9 Hz and 0.02–0.15 mV.
- **Flutter:** a sawtooth at 250–350/min, 0.1–0.3 mV in II/III/aVF.
- **CPR artefact:** `Σ_{h=1..8} A_h·e^(−0.3(h−1))·sin(2πh·f_c·t + φ_h)`, with f_c 100–120/min ±5% jitter and 0.2–2 mV [03 §1.10].

**Measurement chain (L3)** [05 §2.2; 03 §1.11–1.12]:
- The true broadband ECG plus artefacts passes through the selected IIR band-pass on the 500 Hz stream:

  | Mode | Band |
  |---|---|
  | Monitor | 0.5–40 Hz (adult); 0.5–55 Hz (paediatric/neonatal) |
  | Ext. Monitor | 0.5–150 Hz |
  | Filter | 0.5–20 Hz |
  | Diagnostic | 0.05–150 Hz |
  | Surgical | 1–20 Hz |
  | Maximum | 5–25 Hz |
  | NORMAL (`saadat-like` default) | 0.5–40 Hz |
  | MONITOR (`saadat-like`) | 0.5–24 Hz |
  | EXTENDED (`saadat-like`) | 0.05–100 Hz |

- Filter names are skin data (`ecg.filters`); the engine keys filters by band. On `saadat-like`, **"MONITOR" is the narrow 0.5–24 Hz filter**, the reverse of the Philips-like naming, where Monitor is the 0.5–40 Hz default. Real Iranian ICUs run MONITOR [06 §3.2, §6; 06 §3.1 F7].
- The 50/60 Hz notch is automatic in monitor and surgical modes.
- A Pan–Tompkins-like QRS detector runs on the *displayed* lead and feeds HR averaging (§6.1). It never reads the truth list. Tall T waves, artefact and pacing can therefore cause realistic miscounts.

### 4.2 Arterial, CVP and PAP pressures

**Ejection** [03 §2.1, §2.8]:
- `Q_ej(t) = Qpk·sin(π·t/LVET)^κ`, with κ 1.0–1.3 (≈0.6 plus a longer LVET for aortic stenosis).
- Qpk is set so that ∫Q = SV. For a half-sine, Qpk = π·SV/(2·LVET) ≈ 366 mL/s at SV 70 mL and LVET 0.30 s.
- A 15–25 ms backflow bump at valve closure makes the incisura.
- `LVET = 413 − 1.7·HR` (men) or `418 − 1.6·HR` (women); `PEP ≈ 131 − 0.4·HR` ms **[VERIFY Weissler 1968]**.

**4-element Windkessel** (Stergiopulos) [03 §2.8]:

```
C·dPc/dt = Q − (Pc − P_floor)/R ;   P_aortic = Pc + Zc·Q_Zc ;   L·dQ_L/dt = Zc·Q_Zc ;   Q = Q_Zc + Q_L
P_floor = CVP (beating heart) → Pmsf (arrest)
```

It is integrated with RK4 at 2 ms substeps, four per 125 Hz output sample **[ENG]**, so transducer fn up to ~30 Hz and flush ringing stay stable.

**Adult parameter seeds** [03 §2.8]:

| Parameter | Value |
|---|---|
| R | 1.0–1.1 mmHg·s/mL (0.5 septic; 2+ vasoconstricted) |
| C | 1.4 ± 0.7 mL/mmHg (1.6 in a young adult), falling with P: `C(P) = C0·e^(−k(P−P0))` |
| Zc | 0.03–0.06 (0.10 with a stiff arch) |
| L | 0.005–0.01 mmHg·s²/mL |
| τ = RC | 1.3–2 s |

Paediatric scaling: C × W/70 and R × 70/W.

**Site transfer** [03 §2.3, §2.8]:
- Aorta→radial: a 2nd-order filter with f_r 4–8 Hz and ζ_r 0.2–0.4, delayed by the PTT.
- Its gain is tuned so that radial SBP exceeds aortic SBP by 5–20 mmHg.
- PP amplification is 1.5–1.7 in the young and 1.1–1.2 in the elderly.

**R-wave to upstroke delay** [03 §2.1]:

| Site | Delay from R |
|---|---|
| Aortic root | ≈ PEP (80–110 ms) |
| Femoral | 130–180 ms |
| Radial | **150–220 ms** |
| Finger PPG foot | 200–300 ms |

**Transducer and line** [03 §2.2, §2.6; 05 §2.2]:
- `H(s) = ωn²/(s² + 2ζωn·s + ωn²)`.
- Default fn 20 Hz and ζ 0.45 **[ENG]**. Real ICU lines mostly run fn 10–25 Hz, ζ 0.2–0.4.
- Underdamping adds 5–30 mmHg to SBP with MAP preserved. Overdamping lowers SBP and raises DBP, again with MAP about the same.
- Then a **12 Hz** display filter.
- **Flush test:** a step to ~300 mmHg for 0.5–2 s, then ringing at fn that decays by ζ.
- **Zero:** a flat 0 line with a "zeroing" state.
- **Levelling:** 0.74 mmHg per cm.
- **Other line events:** blood sampling, disconnection (≈0 mmHg with no pulsatility), a dropped transducer (±20–40 mmHg), and an NIBP cuff on the same arm (the trace flattens to cuff pressure for about 30 s).
- **Alarm suppression:** 60 s after zero, flush or sampling.

**Respiratory variation** [03 §2.5]:
- `SV_i = SV_0·(1 − g_hyp·u(t_i − t_lag))`, with t_lag ≈ 2 beats.
- g_hyp is 0.03–0.06 when normovolaemic and 0.15–0.25 when hypovolaemic (PPV 5–10% → 15–30%).
- There is also an in-phase insufflation term of 0.02–0.04.
- Under spontaneous breathing the sign reverses: inspiration lowers SBP by 2–5 mmHg, or more than 10 mmHg in tamponade.

**Arrest and CPR** [03 §2.7–2.8]:
- **Arrest:** `P_art → Pmsf + (P0 − Pmsf)·e^(−t/τ)`, with τ 1.5–3 s. CVP rises toward Pmsf with τ 3–6 s. The trace is flat at 10–15 mmHg by about 20 s.
- **Compressions:** `Q_cpr = SV_cpr·(π/(2T_c))·sin(πt/T_c)` goes into both the arterial and venous compartments. SV_cpr is 15–30% of normal SV, scaled by quality. A thoracic-pump term of 30–80 mmHg is added to both. The target is about 90/20 with good CPR.
- **Pauses:** pressure collapses in 2–5 s and builds up again over several compressions.

**CVP** [03 §2.9]:
- Five Gaussians timed from ECG events:
  - the a wave peaks 80–100 ms after P onset;
  - c comes at the end of the QRS;
  - v comes near the end of the T;
  - x and y are troughs.
- Mean 2–8 mmHg, a 2–4 mmHg, v 1–3 mmHg.
- AF has no a wave. A P wave falling in systole produces a cannon a wave.
- Spontaneous inspiration lowers CVP by 2–5 mmHg; positive-pressure ventilation raises it.

**PAP** [03 §2.10]:
- The same Windkessel with R 0.08–0.12 and C 3–5.
- The PA upstroke leads the radial one by 60–120 ms.
- Normal values: 15–30/4–12 mmHg, mean 9–18.
- Wedge: crossfade within 1–2 beats to a venous a/v waveform at PAWP 6–12.

**Numerics (L3)** [03 §2.2]:
- SBP and DBP are the per-beat maximum and minimum after the display filter.
- MAP is always the **integral** over the beat, never a formula.
- Values are averaged over 4–8 beats and updated at 1 Hz.
- PR from the ABP uses slope-sum upstroke detection.

### 4.3 Pleth and SpO2

**Pleth** [03 §3.1–3.4]:
- One pulse per *mechanical* beat, at `t_R + PAT_finger`. Pulse deficits therefore come for free.
- Two kernels (Tang 2020). "Excellent" pulse: `a1 1.0, θ1 −1.5161, b1 0.6303; a2 0.1999, θ2 0.8186, b2 1.0225`. The diastolic kernel may be log-normal instead.
- Amplitude = `PI × (SV_i/SV_0)^γ`, with γ ≈ 1.
- Vascular tone shapes the pulse:
  - vasodilated: a2/a1 0.4–0.6;
  - vasoconstricted: a2/a1 0.1–0.2 and no notch;
  - elderly: larger b1.
- Respiratory amplitude modulation uses the same g_hyp (PVI ≈ PPV × 1.1–1.3). Spontaneous breathing adds a baseline swing of ±2–5%.
- The display is auto-scaled; PI is kept as a number.
- "LOW PERF" appears below PI 0.3%.
- Artefacts:
  - motion (0.5–5 Hz);
  - NIBP cuff on the same limb (flat for about 30 s while SpO2 holds its value);
  - diathermy;
  - probe off;
  - shivering (4–8 Hz);
  - low-perfusion dropouts.

**Oxygen truth** [03 §3.5]:
- **Dissociation curve:** `SO2 = 1/(23400/(PO2³ + 150·PO2) + 1)`, shifted with virtual PO2 for temperature, pH and PCO2 **[VERIFY coefficients]**.
- **Content and alveolar gas:** `CaO2 = 1.34·Hb·SaO2 + 0.003·PaO2`; `PAO2 = FiO2·(Pb − 47) − PaCO2/0.8`; shunt mixing.
- **Lung O2 store:** `FRC·F_AO2`. FRC is 30 mL/kg awake and supine, and 20–25 mL/kg under GA.
- **VO2:** 3–3.5 mL/kg/min in adults, 6–8 in infants. It falls 15–20% under GA and 7–8% per °C of hypothermia.
- **Apnoeic mass flow** occurs only when the airway is patent and O2 is present at it.

**Device chain (L3)** [03 §3.6], applied in order:
1. SaO2.
2. **Dead time.** Finger 15 s at normal CO **[ENG, within 10–20]**; ear or forehead 5 s **[ENG]**. It scales with `CO_0/CO` and with vasoconstriction, reaching 30–60 s in low-output states.
3. **First-order lag:** τ 3 s **[ENG]**.
4. **Bias:** ±2–3% RMS above 70% saturation; readings diverge below 80%.
5. **Moving average:** Philips-like 10 s (options 5/10/20); Masimo-like 8 s (2–16). `saadat-like` (Masimo SET): options 2–4, 4–6, 8, 10, 12, 14, 16 s, **default 8**; sensitivity NORMAL (default) / MAX / APOD [06 §4.1].
6. **Display update:** every 2 s (`saadat-like`: every 1 s).
7. **Alarm delay:** 10 s for high/low limits; 20 s for the desaturation alarm (below 80%).

**Arrest** [03 §3.7]:
- Pulsatility stops immediately.
- SpO2 freezes, then becomes invalid ("-?-" plus a No-pulse INOP) after 10–30 s.
- During CPR, PR equals the compression rate and SpO2 is flagged questionable.
- At ROSC the reading is valid again after 10–20 s, starts low, then climbs.

### 4.4 Capnography and CO2 kinetics

**Waveform, one per breath** [03 §4.1, §4.3]:

```
expiration:  CO2(t) = P_plat·(1 − e^(−t/τ_II)) + slope_III·t     τ_II 0.05–0.10 s (normal), 0.2–0.5 s (obstructive)
inspiration: CO2(t) = CO2_end·e^(−t/τ_0) + baseline               τ_0 0.02–0.05 s
```

- Normal values: α 100–110°, β ~90°, and a phase III rise of +1–3 mmHg.
- The plateau end equals the true EtCO2.
- The α angle is measured on a declared axis scale of 25 mmHg/s [02 A2].

**Pattern library** [03 §4.3]:

| Pattern | Shape |
|---|---|
| Normal controlled | Rectangular |
| Spontaneous | Rounded |
| Shark fin | α ≥ 120–140° |
| Curare cleft | Notch of 3–15 mmHg |
| Rebreathing | Baseline > 0 |
| Cardiogenic oscillations | 1–3 mmHg ripples at the HR |
| Oesophageal intubation | <6 breaths of decreasing height, then flat |
| Disconnection | Abrupt drop to 0 |
| Apnoea | Flat |
| CPR | Oscillations at the compression rate |
| ROSC | Jump |
| PE | Drop of 5–20 mmHg |
| Endobronchial | Bifid plateau |
| Malignant hyperthermia | Progressive rise |

**Sampling (L3)** [03 §4.2]: `CO2_disp(t) = LPF1{CO2_airway(t − T_delay)}`, with `τ = T_rise/2.2`.
- Sidestream: T_delay **2.3 s** (max 3); rise **240 ms** in adults (190 ms neonatal), so τ ≈ 0.11 s.
- Mainstream: no delay, τ 0.025 s.
- A sample-line leak dilutes the plateau.

**Kinetics** [03 §4.4]:

```
C_f·dPf/dt = VCO2 − VA·Pf/0.863 − k_fs·(Pf − Ps)      C_f 15–20 mL/mmHg
C_s·dPs/dt = k_fs·(Pf − Ps)                            C_s 40–45 mL/mmHg, k_fs = C_s / 5 min
VA = RR·(VT − VD_anat − VD_app),  VD_anat 2.2 mL/kg;   VCO2 ≈ 200 mL/min (2.5–3 mL/kg/min)
EtCO2 = PaCO2 − Δ(a−Et),  Δ 2–5 mmHg;   low flow: EtCO2 ≈ PaCO2_eq·min(1, VCO2_del/VCO2_met)^0.6  (≈0.33 %ΔEtCO2 per %ΔCO)
```

- **Apnoea:** +12 mmHg in the first minute, then +3.4 mmHg/min.
- **Step change in minute ventilation:** 30–40% of the new level in 2–3 min; steady state in 20–40 min.

**Arrest and ROSC** [03 §4.6]:
- Without CPR, EtCO2 falls below 5 mmHg within a few breaths. With good CPR it sits at 10–20 mmHg.
- At ROSC, EtCO2 goes to `min(60, EtCO2_CPR + 15–25)` within 2–4 breaths, then decays with τ 2–5 min.
- Epinephrine lowers EtCO2 by 20–40% for 1–3 min.
- 50 mEq of bicarbonate raises it by 5–15 mmHg, peaking at about 1 min and resolving over 3–5 min.

**Numerics (L3)** [03 §4.5]:
- Breath detection uses a 50%-of-recent-peak threshold with hysteresis.
- EtCO2 is the maximum over the breaths of the last 10 s **[ENG]**.
- awRR is the mean of the last 6 intervals **[ENG, 4–8]**.
- The apnoea alarm fires at 20 s. `saadat-like`: impedance apnoea 10 s (10–40 s or OFF), gas apnoea 20 s (20–60 s or OFF) [06 §4.3].
- CPR oscillations may be miscounted as breaths. That is realistic.

### 4.5 NIBP

A measurement over sim time, never an instantaneous readout [03 §5.1–5.4].

**Cycle:**
1. **Inflate** to 165 mmHg (adult; 130 paediatric, 100 neonatal) at about 20 mmHg/s, so under 10 s **[ENG rate; targets from Philips]**. Later cycles inflate to the previous SBP + 10 mmHg (GE rule). If the envelope turns out incomplete, re-pump to 40 mmHg above the target **[ENG]**.
2. **Step-deflate** in 8 mmHg steps **[ENG]**, holding two matched pulses per step. At HR 75 that is 10–12 steps × 1.6 s, for a total of about 30 s. This matches Philips's typical 30 s adult / 25 s neonatal. STAT uses one pulse per step, about 20 s.
3. **Measure.** The oscillation amplitude at cuff pressure Pc is sampled from the actual ABP-core beats in the window:

   ```
   A(Pc) = Amax·exp(−((Pc − MAP)/w)²)
   w_hi = 0.6–0.8·(SBP − MAP)/sqrt(−ln Rs),   w_lo = (MAP − DBP)/sqrt(−ln Rd)
   ```

   Here Amax is 1–4 mmHg and scales per beat with SV_i/SV_mean. The envelope is then inverted at **Rs 0.50 and Rd 0.80** [ENG within Rs 0.45–0.57, Rd 0.75–0.86], with noise SD 4 mmHg [ENG; AAMI allows mean ±5, SD ≤8]. MAP is the envelope peak.
4. **Report.** Set the result and its timestamp, or fail.

**Timing limits:**
- Maximum measurement time 180 s (adult) and 90 s (neonatal).
- Safety auto-deflate at 170 s (adult) and 85 s (neonatal).

**Modes:**
- Manual (the `saadat-like` default).
- Auto, at 1, 2, 2.5, 3, 5, 10, 15, 20, 30, 45, 60 or 120 min. The default is 15 min (5 min in the OR skin). A manual start turns auto-cycling off (CAE) [01 §4.12].
- STAT: back-to-back measurements for 5 min. `saadat-like`: 10 measurements 30 s apart over 5 min (§6.3).

**Realistic disagreement with IBP** [03 §5.2–5.3]:
- It emerges from sampling the true beats: AF, respiratory variation and motion.
- A "reference" option adds the Pereira auscultatory-vs-invasive regression: SBP `y = 13.9 + 0.81x`, DBP `y = 21.4 + 0.71x`.

**Failures** [03 §5.3]:
- AF and ectopy lengthen the cycle and widen the error.
- Motion, shivering or CPR extend the cycle up to the maximum time and then fail.
- SBP below about 50–60 mmHg, or no pulse, fails after 2 attempts.
- A cuff that is too small reads 5–15 mmHg high.
- Hydrostatic offset is 0.74 mmHg/cm.
- The cuff side-effects on SpO2 and the arterial line are applied.

### 4.6 Temperature

**Sensor** [03 §6.1]:
- `T_disp = LPF1{T_site}` with a sensor time constant under 10 s.
- Site lags behind core:

  | Site | τ |
  |---|---|
  | Oesophageal / PA | 0.5–1 min |
  | Tympanic / nasopharyngeal | 1–3 min |
  | Bladder | 5–20 min (inversely proportional to urine flow) |
  | Rectal | 20–60 min |
  | Axilla | 5 min, with a −0.5 °C offset |

**Core model** (MODELED) [03 §6.2]:
- Two compartments, core and periphery; capacity 3.5 kJ/kg/°C.
- `k_cp` rises 2–4× at induction and drops below a 34.5 °C vasoconstriction threshold.
- M is about 80 W, falling 15–20% under GA.
- **Targets:**
  - redistribution: −1–1.5 °C in the first hour;
  - then a linear fall of 0.3–0.5 °C/h;
  - then a plateau at 34.5–35.5 °C;
  - neuraxial anaesthesia has no plateau;
  - forced-air warming adds +0.5–1 °C/h;
  - malignant hyperthermia climbs +1–2 °C every 5 min.

### 4.7 Respiration and RR

**Driver.** One ground-truth respiratory driver [03 §7] produces breath events with VT, Ti/Te and a pattern: regular, Cheyne–Stokes, ataxic, obstructed, apnoeic, gasping or agonal. The source is spontaneous, BVM, ventilator, `externalDrive`, or none.

**Consumers.** The driver feeds:
- the capnogram;
- the ECG baseline and amplitude modulation;
- ABP, pleth and CVP variation;
- the impedance waveform: a volume-proportional signal plus a cardiogenic ripple of 5–20% at HR, band 0.3–2.5 Hz.

**Detectors.** Each RR source (impedance, awRR, ventilator) has its own detector, so the sources disagree realistically. For example, cardiogenic ripple can postpone the apnoea alarm in impedance mode.

### 4.8 Rhythm → mechanical output (`k_rhythm`), shared by both modes [03 §8.3]

| Beat / rhythm | k_rhythm |
|---|---|
| Sinus, AAI, DDD | 1.0 |
| AF (controlled) | 0.75–0.85, × f_fill(RR_prev) → pulse deficit |
| Flutter 2:1 / 4:1 | 0.8–0.9 |
| Junctional, VVI, AV dissociation | 0.8–0.9 (cannon beat 0.7–0.8) |
| PAC | 0.5–0.9, by prematurity |
| PVC | 0–0.6; no ejection at coupling below ~45% of RR |
| Beat after a PVC | 1.1–1.3 (SBP about +12 mmHg) |
| Complete heart block with a 35/min escape | SV × 1.3–1.5, but CO falls |
| VT 150–180, good LV | 0.4–0.6 |
| VT >200 or poor LV | 0–0.3 |
| Torsades | 0–0.2 |
| VF, asystole, PEA | 0 |
| Post-ROSC stunning | 0.2 → 1 over 30–120 s |

Filling: `f_fill(RR) = 1 − exp(−max(0, RR − t_sys)/τ_fill)`, with `t_sys ≈ LVET + 0.08 s` and `τ_fill ≈ 0.18 s`, normalised to 1 at RR 1 s [03 §8.2].

### 4.9 L1 modes: shared state, MANUAL and MODELED (R4)

**Shared state schema** (`PatientState`; values are the L1 *truth*, not the display):

| Variable | Unit | Range | MANUAL role | MODELED role |
|---|---|---|---|---|
| `rhythm` | RhythmSpec | §5 | set | set; model-driven transitions (hyperK, hypoxic brady, VF→asystole) |
| `hr` | bpm | 0–300 | target (atrial or ventricular rate per rhythm) | output (SA rate × autonomic) |
| `sbp`, `dbp` | mmHg | 0–300 | targets at the arterial site | outputs |
| `map` | mmHg | derived | integral of the waveform | output |
| `cvp` | mmHg | −5–40 | target (mean) | output (RAP where VR = CO) |
| `papSys`, `papDia`, `pawp` | mmHg | 0–120 / 0–60 / 0–40 | targets | outputs **[ENG: scaled from CO and RAP in v1]** |
| `sv`, `co` | mL, L/min | 0–200, 0–25 | derived (tracker) | outputs |
| `svr` | mmHg·s/mL | 0.3–3 | derived (tracker) | state (drugs, baroreflex) |
| `contractility` | × | 0.1–2 | factor (ejection shape, dP/dt) | state |
| `bloodVolume` | mL | 0–120 mL/kg | informational | state; 65–70 mL/kg adult [03 §8.9] |
| `spo2` | % | 0–100 | target SaO2 truth (the device chain still applies) | output of the O2 model |
| `pi` | % | 0.02–20 | target | output (SV, tone) |
| `rr`, `vt` | /min, mL | 0–80, 0–1500 | targets | chemoreflex/drug outputs, or the ventilator |
| `etco2` | mmHg | 0–150 | target (plateau truth) | output (PaCO2 − Δ) |
| `fio2`, `shunt` | fraction | 0.21–1, 0–0.5 | inputs | inputs; shunt 2–5% normal, 10–15% under GA, 30–50% in ARDS or one-lung ventilation [03 §8.7] |
| `tempCore` | °C | 25–43 | target | heat-model output |
| `k` | mEq/L | 2–9 | → ECG modifiers | → ECG modifiers |
| `qtc` | ms | 300–650 | modifier | modifier |
| `volumeStatus` | 0–1 | — | target (sets g_hyp) | derived from stressed volume |
| `paceThresholdMa` | mA | 10–200 | set | set |
| `airway` | enum | patent … oesophageal | input | input |

**Control flags.** Every variable carries a flag, shown in the instructor UI as CAE's blue and yellow flags [01 §4.3]:
- `modeled`
- `pinned`
- `ramping`
- `override`, meaning physiology forced it (e.g. pulseless → no SBP).

**Pin / release semantics** [01 §4.1–4.2]:
- **MANUAL.** Every target is owned by the instructor. `setTarget` ramps it. Coupled quantities come from the coupling rules below and show `override` when they depart from the target.
- **MODELED, `pin(var, value, ramp)`.** Overrides the model's *output* for display and for downstream generators. The model's internals keep running, so a later release is continuous. Pins propagate downstream but are never back-driven into model state.
- **MODELED, `release(var, ramp = 10 s)`** **[ENG]**. Blends from the pinned value to the live model value.
- **MODELED, `setFactor(input, k)`.** Multiplies a model input: `hrFactor`, `svrFactor`, `contractilityFactor`, `vo2Factor` or `vco2Factor`.
- **Mode switches:**
  - MANUAL → MODELED solves for model inputs that reproduce the current outputs. No step may exceed 2 mmHg or 2 bpm.
  - MODELED → MANUAL freezes the current outputs as targets.

**Ramp semantics:**
- `Ramp = { durationS: 0–900, curve: 'linear' | 'exp' | 'sigmoid', delayS }`.
  - 900 s matches the 10 s–15 min onsets in REALITi and CAE [01 §4.4].
  - `exp` uses τ = duration/3. `sigmoid` is logistic, with 10–90% of the change inside the middle 80% of the duration **[ENG]**.
- A new ramp starts from the current value, including a value in mid-ramp, so nothing ever jumps.
- Ramps move **truth**. L3 lags (averaging, NIBP last value, SpO2 dead time) apply on top.
- The panel shows target, truth and displayed values side by side.
- Commands that share a `stageGroup` apply on the same tick ("stage then commit", REALITi) [01 §4.6].

**Coupling rules that apply even in MANUAL** (in MODELED they emerge from the model):

| # | Rule | Effect | Source |
|---|---|---|---|
| M1 | Rhythm → pulse | Per-beat SV = SV_base·k_rhythm·f_fill·PESP (§4.8). Pulseless rhythms give no pulsatility: ABP decays to Pmsf, the pleth goes flat, SpO2 goes invalid after 10–30 s and NIBP fails. SBP/DBP targets are suspended with an `override` flag | [03 §2.7, §3.7, §8.3; 01 §2.3] |
| M2 | Pressure targets are met physically | A per-beat PI tracker adjusts SV (pulse pressure) and R (mean) with τ ≈ 3 beats **[ENG]**, so site SBP/DBP converge on the targets. AF, PVCs, CPR and line faults still act | [02 A2 affine-map alternative rejected, §11 C8] |
| M3 | HR → mechanics | LVET, PEP and f_fill follow HR; above ~150–180 bpm CO plateaus and falls | [03 §2.1, §8.2] |
| M4 | Ventilation → EtCO2 | Airway loss or apnoea flattens the capnogram **immediately** (no breaths). The first breath after apnoea shows the accumulated CO2 (+12 mmHg in the first minute, then 3.4/min) | [03 §3.5, §8.7] |
| M5 | Ventilation → SpO2 | With `autoDesat` on (the default), airway loss drives SaO2 through the O2-store model from its current value. After ventilation resumes, SaO2 recovers but the *displayed* SpO2 keeps falling for 10–30 s. An instructor pin on `spo2` disables this | [03 §3.6, §8.7] (R8) |
| M6 | Respiration → ECG, ABP, pleth, CVP | RSA, baseline wander, R-amplitude modulation, PPV via g_hyp from `volumeStatus`, CVP swings | [03 §1.4, §2.5, §2.9, §3.3] |
| M7 | CPR | ECG artefact, compression pulses on ABP and CVP, a compression pleth, EtCO2 10–20 × quality, possible awRR miscount | [03 §1.10, §2.7, §4.6] |
| M8 | Shock | Artefact, then a post-shock rhythm by rule (§6.5), then stunning (k_SV ramp) and the EtCO2 ROSC jump | [03 §1.9, §4.6] |
| M9 | Pacing | Capture at mA ≥ threshold → paced beats; mechanical capture follows electrical capture unless unset | [03 §1.7] |
| M10 | Potassium and temperature → ECG | `k` drives the hyperK/hypoK modifiers (§5). Temperature below 32 °C adds an Osborn J wave, scaled by degree **[ENG threshold]** | [03 §1.6] |

**MODELED lumped model (summary)** [03 §8]:

```
Vs = V_blood − V0 ;  Pmsf = Vs/C_sys (C_sys 100–130 mL/mmHg → Pmsf 7–12) ;  VR = (Pmsf − RAP)/RVR (RVR 1.2–1.6 mmHg·min/L)
SV = SV_max · k_contr · FS(RAP) · f_fill(RR_prev) · k_rhythm · k_afterload
FS(RAP) = 1 − e^(−(RAP − P0)/K), P0 0–2, K 4–6 ;  k_afterload = 1 − a·(MAP − MAP_ref)/MAP_ref, a 0.1 (normal) / 0.4–0.6 (failing)
CO = HR_mech·SV = VR   (solve RAP each beat, 1–3 fixed-point steps)
Baroreflex: e = MAP_set − LPF_1s(MAP), MAP_set 85–95 (−10–20% under GA)
  vagal: RR += G_v·(−e), delay 0.3 s, τ 0.5–1.5 s, G_v 15 ms/mmHg young / 5–8 elderly / ×0.3–0.6 under GA
  sympathetic: e_s = delay(2–3 s) LPF_τ8–15s(e); HR ×(1+g_hs·e_s), SVR ×(1+g_R·e_s) (g_R 0.01–0.02/mmHg),
               V0 −g_V·e_s (10–20 mL/mmHg), contractility ×(1+g_c·e_s); saturation ±40–60%
Chemoreflex: SaO2 < ~85% → HR↑ (adult) / vagal brady (infant, severe hypoxia); hypercapnia → HR↑, BP↑
Drug effect: E(t) = Emax·(t/tp)^n·e^(n(1 − t/tp)), n = 2 [ENG]; effects are factors on HR set point, contractility, SVR, V0
Ventilation → haemodynamics: effective RAP ↑ by 30–50% of the mean-airway-pressure change [ENG]
```

**v1 drug set** [03 §8.6], with onset / peak / duration:

| Drug | Onset / peak / duration |
|---|---|
| Propofol | 30–60 s / 2–5 min / 5–10 min |
| Ketamine | 30–60 s / 1–3 min / 10–15 min |
| Etomidate | neutral |
| Fentanyl | 1–3 / 3–5 / 30–60 min |
| Remifentanil | τ 1–2 min |
| Phenylephrine | 30–60 s / 1–2 min / 15–20 min |
| Ephedrine | ~1 min / 4–5 min / ~1 h |
| Epinephrine 10–20 µg | <1 / 1–2 / 5–10 min |
| Epinephrine 1 mg (arrest) | — |
| Norepinephrine | τ 1–2 min |
| Vasopressin | minutes |
| Atropine | ~1 / 2–4 / 30–60 min |
| Glycopyrrolate | 2–3 min / 2–4 h |
| Adenosine | AV block for 3–10 s, 10–30 s after the push |
| Esmolol | 1–2 / — / 10–20 min |
| Amiodarone | minutes |
| Nitroglycerin | 1–2 min |
| Calcium chloride | 1–3 min, stabilises the hyperK ECG |
| Bicarbonate | — |
| Succinylcholine | K⁺ +0.5 mEq/L |
| Neostigmine | 1–3 / 7–10 min |

Conditions: anaphylaxis, local anaesthetic toxicity (LAST), malignant hyperthermia (VCO2 ×2–5 over 5–30 min), tamponade, tension pneumothorax and PE.

**Fluids and haemorrhage:**
- `bleed` and `fluid` change `V_blood`.
- In v1, crystalloid has no redistribution; that comes later.
- Paediatric patients maintain SBP until 30–40% blood loss [03 §8.5].

**Sanity checks the model must pass** (Stage 7 acceptance) [03 §8.4–8.5, §3.5, §4.4, §8.8]:
1. **Phenylephrine 100 µg:** MAP +15–25 mmHg and reflex HR −5–15 bpm within 30–60 s.
2. **ATLS class II haemorrhage (15–30% loss):** HR 100–120, SBP near normal, PP narrowed, PPV >13%.
3. **Propofol induction:** MAP about 70% of baseline at 2 min with little HR rise.
4. **ATLS classes I, III and IV** within the table ranges; class IV: HR >140, SBP <90, PP <25.
5. **CO = VR** converges within 3 iterations. Pmsf is 7–12 mmHg at baseline.
6. **Preoxygenated 70 kg apnoea:** SaO2 reaches 90% at 8 ± 1.5 min. On room air, 90% at ≈1–2 min.
7. **Children 2–5 y (Patel):** 160 ± 30 s to 90%.
8. **CO2:** apnoea gives +12 then 3.4 mmHg/min. A ventilation step gives 30–40% of the change in 2–3 min.
9. **Witnessed VF timeline** [03 §8.8 A] and **asphyxial timeline** [03 §8.8 B] reproduced in order and timing.

---

## 5. Rhythm library (v1)

**Generator column:** **P** = parametric (VCG kernels on the clocks); **T** = recorded-template texture under a parametric envelope (§11 C1); **P(T-ready)** = parametric in v1, with a template slot reserved.

| Group | Rhythm IDs | Generator | Key parameters [03 §1.5] |
|---|---|---|---|
| Sinus | `sinus`, `sinusBrady`, `sinusTachy`, `sinusArrhythmia`, `sinusPause` | P | RSA; max HR ≈ 220 − age; phasic PP >120 ms |
| Atrial | `atrialTach`, `afib`, `aflutter` (`ratio`: 2, 3, 4, `variable`) | P; f-waves T | AF: V 60–100 controlled / 110–160+; flutter A 250–350 |
| SVT family | `svtAvnrt`, `svtAvrt`, `wpwSinus`, `preexcitedAf`, `junctionalEscape`, `junctionalAccel`, `junctionalTachy` | P | AVNRT 140–280; AVRT RP >70 ms; WPW PR <120 ms plus a 30–60 ms delta; junctional 40–60 / 60–100 / >100 |
| AV blocks | `avb1`, `avb2Mobitz1`, `avb2Mobitz2`, `avb2to1`, `avbHighGrade`, `avb3Narrow`, `avb3Wide` | P | PR >200 ms; Wenckebach 3:2–6:5; escape 40–60 narrow / 20–40 wide |
| Ventricular | `idioventricular`, `aivr`, `vtMono`, `vtPoly`, `torsades`, `vfCoarse`, `vfFine` | P / T (VF, torsades texture) | VT 120–250, QRS 140–200 ms; torsades 200–250 with a twist over 5–20 beats; VF 4–6 Hz |
| Arrest | `asystole`, `pWaveAsystole`, `agonal`; **PEA = `pulseless: true` on any organised rhythm** | P | noise ±20 µV; agonal <20/min with decaying complexes |
| Paced | `pacedAAI`, `pacedVVI`, `pacedDDD`; TCP through the `pacer` event; faults `failureToCapture`, `failureToSense`, `oversensing`, `failureToPace` | P | VVI QRS 140–180 ms; DDD AV delay 120–200 ms |

**Modifiers** (`setModifiers`), all layered on any rhythm:

| Modifier | Range / numbers | Source |
|---|---|---|
| Ectopy: `pvc` {`probability` 0–0.9, `pattern` single / bigeminy / trigeminy / couplet / triplet / run(n), `multifocal`, `rOnT`}, `pac` {probability, `blocked`, `aberrant`}, `pjc` | PVC coupling 40–80%, QRS 120–200 ms, 1.5–2× amplitude, discordant T; VT alarm threshold = run ≥5 at HR ≥100 | [03 §1.5; 01 §4.14] |
| `rsa` 0–1, `hrvScale` | — | [03 §1.4] |
| Conduction `bbb`: `rbbb` / `lbbb` | QRS ≥120 ms (RBBB 133, LBBB 154 by default) | [03 §1.5; 04 §4] |
| `axisDeg` −150…180, `transitionLead` 1.5–5.5, `lowVoltage` ×0.4–0.6, `lvh` | — | [03 §1.6; 04 §4] |
| `st`: {territory: `anterior` / `septal` / `lateral` / `anterolateral` / `inferior` / `posterior`, `mm` 1–4, `reciprocal` auto}; `ischaemicDepression` −0.05 to −0.3 mV; `tInversion` | STEMI +0.1–0.4 mV | [03 §1.6; 04 §5] |
| `qtc` 300–650 ms; `longQT`; `brugada1`; `digoxin`; `alternans` ±20–40% | — | [03 §1.6] |
| Electrolytes from state `k` | 5.5–6.5 peaked T (σ −30–50%, a_T ×2–3); 6.5–7.5 P flattens, PR↑; ≥7 QRS +20–100%; >8 sine wave → VF/asystole. HypoK: U up to 0.1–0.3 mV. Ca via QTc | [03 §1.6] |
| Temperature | Osborn J σ 15–25 ms, largest in V3–V4 | [03 §1.6] |
| Individuality: `patientSeed`, `morphologyVariation` 0–1 | Stable per-patient fingerprint | [04 §5] |

**Artefacts** (`setModifiers.artefact`), level 0–1 per lead group [03 §1.11]:

| Artefact | Numbers |
|---|---|
| `wander` | 0.05–0.3 mV at 0.1–0.5 Hz |
| `mains` | 50 or 60 Hz + 3rd harmonic, 0.01–0.5 mV. Default **50 Hz** (Iran, per Ali's course location) **[ENG, confirm]** |
| `emg` / `shiver` | 20–150 Hz noise with a 4–8 Hz envelope, 0.02–0.2 mV RMS |
| `motion` | 0.5–3 Hz, 0.5–5 mV |
| `leadContact` | — |
| `electrosurgery` | 1–5 s saturation, pleth corrupted too |
| `cpr` | §4.1 |
| `shock` | §6.5 |
| `tcp` | §6.5 |
| additive white noise | 0.025 mV SD |

Artefacts come from the `artefact` PRNG stream and are summed before the L3 filter.

**Template provenance:**

| Content | Source (licence) |
|---|---|
| VF texture | CUDB (ODC-By, 250 Hz) and MIT-BIH (ODC-By, 360 Hz), resampled to 500 Hz |
| AF f-wave segments | MIT-BIH AF-labelled records |
| 12-lead normal median beats (fit targets only) | PTB-XL (CC BY 4.0) |

Every template file carries a `NOTICE-ID` (§8).

---

## 6. Device-behaviour realism (R8)

### 6.1 Measured numerics

| Numeric | Rule | Source |
|---|---|---|
| HR | Average the last 12 RR, dropping max and min (IEC-style; Philips-like skin: mean of 12). If the last 3 RR are all >1200 ms, use the last 4. During PVC runs, up to 8. Update ≤1/s. Response 80→120 in <11 s (Philips 6.8 s) | [05 §2.4; 03 §1.12] |
| HR source | ECG QRS detector. Falls back to pleth or ABP when leads are off (Philips "Fallback") | [03 §1.12] |
| HR (`saadat-like`) | Time-window average: beat-to-beat values enter an averager every 1 s; window 4 / 8 / 16 s, **default 8 s**. Response 80→120 bpm: 5 / 6 / 11 s; 80→40 bpm: 7 / 8 / 13 s. The manual claims the IEC 60601-2-27 irregular-rhythm tests. One real ICU ran 16 s | [06 §4.1; M p.65–66] |
| HR source (`saadat-like`) | **AUTO (default):** the first connected source in the order ECG > IBP1 > IBP2 > IBP3 > IBP4 > SpO2. A non-ECG source relabels the tile **HR → PR** and gives it the source's colour and unit; the beat tone and heart symbol follow. IBP sources only from ART, PAP, LVP, RVP or IBP labels, 25–240 bpm | [06 §4.1; M p.66–67, 108] |
| PR | Pleth peak detector with its own average. Response ≤20 s | [05 §2.4; 03 §3.6] |
| SpO2 | Device chain §4.3. Refresh ≤1–2 s; response ≤20 s from the SaO2 change *at the site* | [05 §2.4] |
| SpO2 (`saadat-like`) | Masimo SET: average 8 s default, update 1 s, normalised pleth; PI shown by default; MAX/APOD sensitivity labels the pleth lane "MAX SENSE"/"APOD" in yellow | [06 §4.1] |
| ABP S/D/M | Per-beat, 4–8-beat average, 1 Hz | [03 §2.2] |
| NIBP | Last result plus a "hh:mm" timestamp, or a countdown. Shows live cuff pressure while measuring | [05 §2.4; 03 §5.4] |
| EtCO2 / imCO2 / awRR | §4.4 | [03 §4.5] |
| Jitter | Physiological only (beat-to-beat, respiratory), never white noise on numbers | [01 §4.13] |
| Pacing | HR shows dashes and HR alarms are off while pacing (LIFEPAK-like); the skin chooses | [05 §2.6] |
| Unavailable values (`saadat-like`) | HR "-?-"; NIBP failure "?"; out of range "--"; IBP PR not derivable "---" | [06 §3.2] |

### 6.2 Sensors (`attachSensor`)

| Sensor | States | When off or absent |
|---|---|---|
| `ecg` | `on`, `off`, `motion`, plus `leadSet`: 3, 5 or 12 | Flat dashed trace plus a "LEADS OFF" INOP; **no asystole alarm** [03 §1.8] |
| `spo2` | `on`, `off`, `motion`, plus `site`: finger, ear, forehead | Flat pleth, "SpO2 SENSOR OFF", dashes |
| `nibp` | `on`, `off`, plus `limb` | Start command rejected with "cuff not connected" |
| `abp` / `cvp` / `pap` | `none` (no trace), `atmosphere` (flat 0), `connected`, `zeroing`, `damped` | CAE semantics [01 §2.3] |
| `co2` | `off`, `warmup` (10 s **[ENG]**), `on`, plus `sampling`: sidestream or mainstream | No trace |
| `temp` | `off`, `on`, plus `site` | Dashes |

**Derived-signal rules:**
- HR is hidden only when ECG, pleth and ABP are all off.
- RR is hidden only when CO2, impedance and pleth-derived RR are all off.

The attach mode is set by the scenario, the instructor or a learner tap [01 §4.10].

### 6.3 NIBP presentation state machine [03 §5.4]

```
IDLE (last S/D (M), "hh:mm" or "next in mm:ss") → INFLATING (live cuff pressure, 5 Hz) → DEFLATING (stepping cuff, early SBP)
 → RESULT (update S/D (M) + PR; optional done-tone; alarm check on systolic) | FAILED ("NBP measurement failed", "cuff overpressure")
AUTO: schedule next (clock-synchronised optional); STAT: repeat 5 min then revert; manual start cancels AUTO
```

**`saadat-like`** [06 §4.1; M p.128–133, 266]:
- Default mode **MANUAL**. AUTO intervals 1, 2, 3, 5, 10, 15, 20, 30, 45, 60 and 90 min, then 2, 4, 8, 12, 16, 20 and 24 h.
- **STAT = 10 measurements over 5 min, 30 s apart**, stopping on an error (not back-to-back).
- Initial inflation 150 / 140 / 85 mmHg (adult / paediatric / neonatal); later cycles inflate to **previous SYS + 30**. A measurement takes 20–25 s plus inflation; maximum 180 s (adult/paediatric) and 90 s (neonatal).
- The IDLE tile shows mode, **time of the last reading**, live cuff pressure ("RTCP"; the abbreviation is not expanded in the manual **[unverified]**), PR from the cuff and, only when the NIBP alarm is ON, its limits. Failure shows "?", out of range "--".

### 6.4 Alarm model (IEC-style)

This is the default alarm sound profile (`iso`, with the Philips-like `traditional` variant). The `saadat-like` skin uses a second profile, `saadat` (§6.4.1).

- **Conditions.**
  - Physiological:
    - limit alarms on *displayed* numerics;
    - asystole (no QRS for 4.0 s adult / 3.0 s neonatal);
    - pause (2.0 / 1.5 s);
    - VF/VT (run ≥5 at HR ≥100);
    - extreme brady and tachy (limit ∓20 bpm, clamped at 40/200 adult and 50/240 neonatal);
    - apnoea (20 s);
    - desaturation (<80%, 20 s);
    - PVCs/min (10);
    - SVT (HR 180, run 5).

    [03 §1.12, §8.10]
  - Technical INOPs: leads off, SpO2 sensor off, low perfusion, no pulse, NBP failed, CO2 line, ABP zeroing, pacer leads off.
  - Arrhythmia analysis is **off by default on the OR skin**, as in Philips anaesthesia configurations [03 §1.12].
- **Delays.**
  - SpO2 high/low: 10 s.
  - ABP-derived PR: ≤14 s.
  - HR limit: none added, beyond the ~6–7 s the averaging already costs **[ENG]**.
  - Yellow arrhythmia timeouts: 3 and 10 min.
- **Latching and silencing.**
  - High-priority physiological alarms latch until acknowledged **[ENG]**.
  - **Silence** stops audio for 90 s (ZOLL-like) [05 §2.6].
  - **Pause** stops all alarms for 3 min, with a countdown (Laerdal) [01 §4.21].
  - Volume runs 0–10.
- **Audio bursts** [05 §2.5; 03 §8.10]. Values are chosen inside the IEC ranges [ENG]:

  | Priority | Pattern | Timing | Inter-burst | Fundamental [ENG] |
  |---|---|---|---|---|
  | High | 10 pulses: two 5-pulse groups, each a 3+2 rhythm, with gaps x, x, 2x + t_d, x | t_d **150 ms** (75–200), x **100 ms** (50–125), groups 0.6 s apart (0.35–1.30) | **10 s** (Philips ISO red 5/10/15; ZOLL 15; IEC 2.5–15) | 880 Hz |
  | Medium | 3 pulses | t_d **200 ms** (125–250), y **200 ms** (125–250); t_d + y ≥ high t_d + x ✓ | **20 s** (Philips 10/20/30; ZOLL 30; IEC 2.5–30) | 660 Hz |
  | Low / INOP | 1 pulse (2 in the Philips-like INOP) | t_d 200 ms | Not repeated (ZOLL) or >15 s | 523 Hz |

  - Every pulse is a `PeriodicWave` with harmonics 1–5 at 0/−3/−6/−9/−12 dB, which keeps ≥4 peaks in 150–4000 Hz within 15 dB.
  - Rise and fall are 15 ms (Amd 1 requires ≥10 ms).
  - Priorities are 3–6 dB apart [05 §2.5].
  - The Philips-like "Traditional" profile plays high once per second and medium every 2 s.
- **Visual** [05 §2.5; 03 §8.10 VERIFY]:

  | Priority | Colour | Flash | Duty cycle |
  |---|---|---|---|
  | High | Red | **2.0 Hz** (1.4–2.8) | 50% |
  | Medium | Yellow | **0.6 Hz** (0.4–0.8) | 50% |
  | Low | Cyan | Steady | — |

  - The numeric in alarm flashes, and the violated limit is shown brighter.
  - Message format: `***SpO2 94<96`.
  - Message bars: white-on-red, black-on-yellow, black-on-cyan.

#### 6.4.1 Second alarm sound profile: `saadat` [06 §4.2; M p.21, 38–50, 302–305]

Used by the `saadat-like` skin. It replaces the levels, visuals, audio and silence rules above; conditions, sensors and INOP detection are shared. Report 06's tags are kept.

- **Levels.** Three, named 1 / 2 / 3 (1 = highest).
  - Level 1: patient in danger or a serious monitor fault. Level 2: serious warning. Level 3: general warning.
  - Parameter alarms can be set to level 1 or 2 only (default 1; gas alarms default 2).
  - Technical alarms (leads off, sensor off) are level 3. LOW BATTERY escalates 3 → 2 → 1.
- **Factory state: alarms OFF.**
  - Every parameter alarm (HR, RR, SpO2, NIBP, TEMP, IBP, CO2, N2O, AA, O2, ST, BFA) is **OFF by default**. Each such tile shows a **red crossed-bell**; the header shows one when all are off. Limits are drawn inside a tile only when its alarm is ON.
  - **Cannot be disabled:** ASYSTOLE, VFIB and VTAC (always level 1, even with arrhythmia analysis OFF) and APNEA (always level 1; the RR alarm switch does not affect it). APNEA LIMIT itself can be set to OFF, and a real ICU did so [06 §3.1 F7].
  - Arrhythmia analysis, ST and pace detect are OFF by default.
- **Visual:**

  | Level | Lamp | Message bar | Numeric |
  |---|---|---|---|
  | 1 | Red, flashing (2.0 Hz **[assumed]**) | Black text on red | Flashes |
  | 2 | Yellow, flashing (0.6 Hz **[assumed]**) | Black text on yellow | Flashes |
  | 3 | Yellow, **steady** | Black text on **cyan** | — (technical) |
  | None, or acknowledged | Off | Grey | — |

  - Flash rates are not published **[unverified]**; the IEC-typical values above are **[assumed]**.
  - No `***` prefixes. Messages are English uppercase, e.g. "HR TOO LOW", "%SPO2 LOW", "RESP APNEA", "ECG ASYSTOLE", "ECG CHECK LA/RA/LL", "SPO2 LOW PERFUSION", "NIBP SELF TEST FAILED".
  - With mixed levels the lamp shows the highest and messages rotate; same-level messages also rotate.
  - The B9 has one bar under the header. The Alvand variant splits it: technical on the left, physiological on the right.
- **Audio:**

  | Level | Pattern | Repeat | Pulse timing and pitch |
  |---|---|---|---|
  | 1 | "DO-DO-DO--DO-DO": one 3+2 group of 5 pulses (not IEC's 10) | every **10 s** | pulse 150 ms, gap 100 ms, long gap 300 ms, 880 Hz, all **[assumed]**; not published **[unverified]** |
  | 2 | "DO-DO-DO": 3 pulses | every **20 s** | as level 1 **[assumed]** |
  | 3 | "DO": 1 pulse | every **30 s** (it repeats, unlike the IEC-style low) | as level 1 **[assumed]** |

  - Volume 1–7, **factory 1**, 47–69 dB(A) at 1 m. Touch sound 1–3 or OFF (default 1).
  - Pulses reuse the §6.4 `PeriodicWave` **[ENG]** until Ali's recordings (§10) give the real spectrum.
- **Silence.**
  - One key (ALARM SILENCE, also labelled ACKNOWLEDGE) silences the **audio and the visual indication** of all physiological alarms for **120 s**.
  - The header shows a **flashing icon with a 120 s countdown**. Pressing again ends the silence. **Any new alarm ends it.**
  - For technical alarms, Silence acknowledges: the bar turns grey and the fault is ignored until reconnect.
  - On the PUMP page, Silence mutes the asystole audio but the coloured ASYSTOLE message stays.
  - The Audio Pause key has no function (`pause: null`).
- **Timing.**
  - Condition to indication: "less than 1 s", beyond the numeric's own averaging. SpO2 and NIBP limit delays are not stated.
  - **Asystole: 10 s** of zero HR per the ECG chapter, or **5 s** without a valid QRS per the arrhythmia chapter **[conflict: verify]**. The skin default is 10 s with 5 s as the alternative; the IEC-style profile's 4.0 s stays on the other skins, so the difference can be taught.
  - Apnoea 10 s default; pause R-R > 2.1× mean R-R (level 2); VTAC ≥120 bpm and ≥5 beats (§6.8).
- **Latching.** Not described **[unverified]**. The manual implies non-latching, so `saadat` does not latch; this overrides the §6.4 **[ENG]** latch.
- **Also.** Alarm Freeze option: an alarm freezes all waveforms until Freeze is pressed (default **[unverified]**). Alarm recall: the last 20 alarms with numerics and ±5 s of waveforms.
- **No compliance claim.** Saadat claims no IEC 60601-1-8 conformance [06 §2]; the profile is labelled "Saadat-like", as §11 C7 labels the other "IEC-style".

### 6.5 Pacer, defibrillator and cardioversion

**Pacer (TCP)** [05 §2.6; 03 §1.7; 01 §4.17]:
- Rate 30–180 ppm. Output 10–140 mA (steps +10 / −5).
- Demand or fixed mode.
- LIFEPAK-like defaults: 60 ppm, 0 mA, demand. PAUSE paces at 25% of the rate; leads off forces non-demand.
- **Capture threshold** defaults to **70 mA** **[ENG]**. Code Simulator uses 70–100 mA, and adult thresholds are "several tens of mA". The instructor can set it.
- **Artefact:** a wide, blunt deflection of 20–40 ms per pulse, plus a pace marker.
- **Capture:** a wide QRS with a broad T follows every spike. Muscle twitch adds artefact on ABP and pleth at the pacing rate. Mechanical capture is flagged separately.

**Defibrillator** [05 §2.6]:

| Setting | ZOLL-like | LIFEPAK-like |
|---|---|---|
| Energy | 120 J adult, 50 J paediatric | 200 J; AED sequence 200–300–360 |
| Charge time | — | ≤7 s for 200 J, ≤10 s for 360 J (ramping tone) |
| Charged, not delivered | Ready tone; if not delivered, continuous tone for 20 or 50 s, then a higher tone for 10 s, then disarm | Auto-disarm at 60 s |

**Sync** [05 §2.6; 03 §1.9]:
- A marker on every *detected* R.
- The shock goes on the next R, within ≤60 ms.
- LIFEPAK-like "Sync After Shock" is off.

**Shock artefact** [03 §1.9; 04 §4]:
- Rail saturation for 50–500 ms, then exponential recovery (τ 0.5–2 s) with an offset step.
- The baseline is back within ≤5 s **[VERIFY IEC 60601-2-27]**.

**Post-shock rhythm:**
- A scenario rule or an instructor pre-selection ("convert", as on the Code Simulator) always wins [01 §4.17].
- Otherwise the default table applies, drawn from the `outcome` PRNG stream:

| Pre-shock | Condition | Outcome probabilities |
|---|---|---|
| VF / pulseless VT | Energy ≥ skin's first-shock default | Persistent VF **0.30** [ENG]; asystole/PEA **0.60** (≈60% of VF shocks) [03 §1.9]; organised with pulse **0.10** [ENG] |
| VF / pulseless VT | VF duration 4–10 min / >10 min (three-phase model) [03 §1.8] | ROSC share × 0.5 / × 0.2; the difference moves to asystole/PEA **[ENG]** |
| VF / pulseless VT | Energy < 50% of the default | Termination probability × 0.5 **[ENG]** |
| Organised tachyarrhythmia with a pulse | Synchronised | Sinus **0.8**, unchanged 0.2 **[ENG]** |
| Perfusing rhythm | Unsynchronised shock landing on the T-peak ± 40 ms | VF **0.3** **[ENG]** (teaches sync) |
| Asystole / PEA | Any | Artefact only |

- **After successful termination** [03 §1.9]:
  - 1–5 s of isoelectric line;
  - then an organised rhythm at 30–60 bpm, accelerating over 10–60 s;
  - k_SV ramps from 0.2 to 1 over 30–120 s;
  - EtCO2 jumps (§4.4).

**`saadat-like`** [06 §4.2; M p.5, 64, 67, 69, 265]. The B9 is a bedside monitor with no defibrillator or pacer, so the skin sets `defib: null`, `pacer: null` and `syncMarker: null`:
- **PACE DETECT is OFF by default.** When ON, pace spikes are removed from HR counting and drawn as a **1 cm vertical line**, PVC-class arrhythmia detection is disabled, and PNC/PNP (pacer not capturing / not pacing) are enabled. Behaviour with PACE DETECT OFF is not described **[unverified]**.
- **Sync** happens on the defibrillator, fed by the B9's analog ECG OUTPUT (1 V/mV, ≤30 ms delay, 400 samples/s, pace pulse 5 V × 5 ms). There is no on-screen sync marker.
- **After a shock** the ECG may show a flat line that recovers in <5 s (the system within 10 s), consistent with the ≤5 s baseline rule above.
- Pacing and shocks remain patient commands (§7.2). The `saadat-like` screen shows their effect on the ECG, with no energy, charge or pacer UI; an ACLS scenario pairs it with a `zoll-like` view **[ENG]**.

### 6.6 12-lead capture

**Trigger.** `device capture12` takes the last 10 s from the VCG buffer and projects them to 12 leads [05 §2.6]:
- The **diagnostic 0.05–150 Hz** filter is applied, whatever the monitor filter is (LIFEPAK prints this way).
- Layouts: 3×4 (default), 2×6, and 3×4 Cabrera, each with a lead II rhythm strip.
- 25 mm/s, 10 mm/mV, with calibration pulses.

**Measurements** come from the rendered signal with a fiducial detector: HR, PR, QRS, QT, QTc and axis. The display formula is the vendor's (Bazett by default) [03 §9.1].

**Output:**
- a printable page (print CSS);
- a PNG;
- JSON (the samples themselves, for debrief).

### 6.7 Trends and event log

- **Trends:** 1 Hz numerics for 8 h, shown graphically over 10 min–8 h with uPlot (MIT, Canvas) [02 §E] and as tables.
- **Event log:**
  - What it records: every command (with `issuedBy`), alarm, sensor event, drug, shock, CPR start/stop, NIBP result and scenario transition.
  - Exports: CSV and JSON.
  - The debrief timeline shows HR/SBP/DBP/SpO2/EtCO2 traces with flags [01 §4.22].

### 6.8 Vendor defaults (skin data)

**Colours** [05 §2.1]:

| Parameter | Philips-like | Others / notes |
|---|---|---|
| ECG / HR | Green | Mindray: ECG "normally green" |
| SpO2 / pleth | Cyan | — |
| NBP | Red (magenta in some profiles) | Varies by vendor |
| ABP | Red; scale 150 (adult), 100 (paediatric/neonatal) | — |
| CVP | Cyan (Blue in the OR/H30 option) | Varies |
| PAP | Yellow | — |
| CO2 | Yellow, scale 40 (White, scale 50 in OR/H30) | — |
| Resp | Yellow (White in H30) | — |
| Temp | Green (Light green in H30) | Varies |
| Alarms | Red / yellow / light-blue INOP | GE: red / yellow / cyan (low); Mindray lamp: red / yellow / cyan |

**Sweep, gain and filters** [05 §2.2]:
- **Philips-like:** global 25 mm/s and respiratory 6.25 mm/s; monitor filter 0.5–40 Hz; leads II and V1.
- **Mindray-like:** gain 10 mm/mV; surgical filter 1–20 Hz.
- **GE-like:**
  - monitoring filter 0.05–40 Hz (60 Hz mains) or 0.05–32 Hz (50 Hz mains);
  - "Maximum" filter 5–25 Hz, with the warning "alters morphology";
  - CO2 sweep options down to 0.625 mm/s.
- **ZOLL-like:** 1 cm/mV; CO2 sweep 6.25 mm/s.
- **LIFEPAK-like:** CO2 at 12.5 mm/s; print at 25 mm/s; channel 1 is lead II.

**Default alarm limits** (Philips factory) [03 §8.10]. GE and Mindray tables were not retrieved and are not invented.

| Parameter | Adult | Paediatric | Neonatal |
|---|---|---|---|
| HR / pulse | 50–120 | 75–160 | 100–200 |
| SpO2 (desat) | 90–100 (80) | 90–100 (80) | 85–95 (80) |
| NBP S / M / D | 90–160 / 60–110 / 50–90 | 70–120 / 50–90 / 40–70 | 40–90 / 24–70 / 20–60 |
| ABP S / M / D | 90–160 / 70–110 / 50–90 | 70–120 / 50–90 / 40–70 | 55–90 / 35–70 / 20–60 |
| CVP mean | 0–10 | 0–4 | 0–4 |
| PAP S / M / D | 10–35 / 0–20 / 0–16 | 24–60 / 12–26 / −4–4 | same as paediatric |
| RR / awRR, apnoea | 8–30, 20 s | — | 30–100, 20 s |
| EtCO2, imCO2 high | 30–50, 4 | — | — |
| Temperature | 36–39 °C | — | — |
| Asystole / pause | 4.0 / 2.0 s | — | 3.0 / 1.5 s |
| NBP interval | 15 min (OR 5 min) | — | manual |

**`saadat-like` colours** [06 §3.2; M p.308–309]. Saadat publishes colour *names*, not hex values. Hex values are **[measured]** from the manual's native 1368×769 screenshots unless tagged otherwise.

| Parameter | Saadat name, or what the screenshots show | Hex | Tag |
|---|---|---|---|
| ECG / HR / ST / PVCs | Green; not user-changeable | #00F000 | [measured] |
| SpO2 / pleth / PR / PI | **Magenta** | #F000F0 | [measured] |
| NIBP | **White** | #F0F0F0 | [measured] |
| IBP1 | Light red | ≈#D08080 (the report's draft skin uses #E08080) | [measured] |
| IBP2 | Light blue | ≈#B0D0E0 (draft: #B0D0E8) | [measured] |
| IBP3 | Dark orange; the B9 screenshot shows a mid blue ≈#3080F0 | #E07000 | [assumed] from the name; [conflict] |
| IBP4 | Dark cyan; the screenshot shows white | #008C8C | [assumed] from the name; [conflict] |
| ART / CVP / PAP | No per-label colour: colour follows the channel (`colorBinding: byChannel`); any per-label teaching colours are an assumption | — | [assumed] |
| Resp, CO2, EtCO2, AWRR | Yellow | #F0F030 | [measured] |
| Temp T1 / T2 / ΔT | **Cyan** | #00F0F0 | [measured] |
| BFA | White (Alvand screenshot) | #F0F0F0 | [assumed] |
| Agent gases | Not stated | #F0F030 | [unverified] |
| Background / tile and lane dividers | Black / light grey, 1 px | #000000 / #C8C8C8 | [measured] |
| Window frame / focus fill / soft-key frame | Bright green / pink / yellow | #00F000 / #D87090 / #F0F000 | focus [measured]; others from 06 §3.1 F4–F5 |
| "ADULT" category label | Yellow | #F0F000 | 06 §3.1 F1 |
| Alarm bar L1 / L2 / L3 / idle and acknowledged | Red / yellow / cyan with black text; grey | #F00000 / #F0F000 / #00D0D0 / #E0E0E0 | colours per [M p.38, 47]; hex from report 06 §5 draft |
| Alarm lamp | L1 red flashing, L2 yellow flashing, **L3 yellow steady** | — | [M p.47]; flash rates [assumed] |

**`saadat-like` sweep, gain and filters** [06 §3.2; M p.302–306]:
- **Sweeps:** ECG 25 mm/s (12.5 / 25 / 50); pleth 25 (12.5 / 25); **IBP 12.5** (3 / 6 / 12.5 / 25); resp 6; CO2 12.5; SIGMA full disclosure fixed at 8.33 mm/s.
- **ECG:** gain **AUTO** (×0.25–×4); filter **NORMAL 0.5–40 Hz** by default (MONITOR 0.5–24, EXTENDED 0.05–100; §4.1); 3-wire cable, lead II; calibration pulse 1 mV × 0.5 s, off by default.
- **Numerics:** HR average **8 s** (4 / 8 / 16); HR source AUTO; SpO2 average 8 s; NIBP **MANUAL**; arrhythmia, ST and pace detect OFF.
- **IBP:** filter 16 Hz (8 / 16 / 22); grid OFF; three dotted scale lines (upper, middle = (H+L)/2, lower). Scales in mmHg: ART 200 / 120 / 40; IBP 200 / 90 / −20; PAP 80 / 35 / −10; CVP 30 / 10 / −10. CVP, LAP and RAP show mean only.
- **CO2:** scale 10% by default (6% or auto).

**Default alarm limits (Saadat factory, Appendix 1)** [06 §4.3; M p.302–306]. The manual gives single values for most parameters; only NIBP, ICP and AWRR are banded by age. **Every parameter alarm here is OFF at power-on** (§6.4.1). Gaps are marked, not filled.

| Parameter | Adult | Paediatric | Neonatal | Level / factory state |
|---|---|---|---|---|
| HR / PR | 50–150 | not banded **[unverified]** | not banded **[unverified]**; the adult 50–150 is clinically wrong for neonates | L1 / OFF |
| SpO2 | 90–100 | not banded **[unverified]** | not banded **[unverified]** | L1 / OFF |
| NIBP S / D / M | 90–160 / 50–90 / 60–110 | 70–120 / 40–70 / 50–90 | 40–90 / 20–60 / 25–70 | L1 / OFF |
| ART (and the "IBP" label) S / D / M | 80–150 / 50–100 / 60–115 | not banded | not banded | L1 / OFF |
| PAP S / D / M | 5–40 / −5–20 / 0–30 | not banded | not banded | — |
| CVP / RAP / LAP mean | −5–15 / −5–15 / −5–20 | not banded | not banded | — |
| ICP | 0–10 | 0–4 | 0–4 | — |
| RR (impedance); apnoea | 5–25; 10 s (10–40 s or OFF) | not banded **[unverified]** | not banded **[unverified]** | L1 / OFF; apnoea always L1 |
| AWRR; gas apnoea | 5–30; 20 s (20–60 s or OFF) | 5–30 | 15–60 | L2 / OFF |
| EtCO2; FiCO2 high | 2.6–6.5 %V (≈20–49 mmHg at sea level; about 17–43 mmHg at Tehran's ~660 mmHg **[assumed arithmetic]**); 1.3 %V | — | — | L2 / OFF |
| Temp | T1 35–39, T2 36–40, ΔT 1–5 °C | not banded **[unverified]** | not banded **[unverified]** | L1 / OFF |
| ST | −0.2 to +0.2 mV | — | — | OFF |
| Asystole / pause | 10 s (5 s per the arrhythmia chapter **[conflict: verify]**) / R-R > 2.1× mean | — | — | L1, cannot disable / L2 |
| VTAC / tachy / brady | ≥120 bpm and ≥5 beats / ≥120 / ≤50 | — | — | L1, cannot disable / L2 / L2 |
| NIBP interval | MANUAL (STAT 10× in 5 min) | — | — | — |

The engine displays CO2 in mmHg (R12). The skin stores the manual's %V limits and converts them at the simulated barometric pressure, 760 mmHg by default **[ENG]**. Where a band is "not banded", the skin inherits the adult value and the UI marks it approximate until Ali's bedside capture (§10) fills it.

### 6.9 Iranian practice notes [06 §1, §3.1 F7, §4, §7]

What report 06 found about how the B9 is actually used, and what it means for the demo:
- **Language and date.** The UI is **English only**. The only localisation is a **Solar (Jalali) calendar**; the factory setting is Gregorian, but a real ICU unit showed "1402/04/04" [M p.39; S8].
- **An ICU configuration as found** (one Aparat video, so n = 1 [S8]):
  - ECG lead II on two lanes, gain X2 (later "X1.25", which is not in the manual's gain list **[unverified]**), filter **MONITOR** (the narrow 0.5–24 Hz), 25 mm/s;
  - **HR AVERAGE 16**, HR SOURCE ECG, **BEAT VOLUME OFF**, PACE DETECT OFF;
  - NIBP MANUAL with limits shown in-tile, and SpO2 limits shown, so those two alarms were ON;
  - red crossed bells on HR and RR, and **"APNEA LIMIT: OFF"** in red.
- **Bypass PUMP page** (P10) for the open-heart OR: a "PUMP" watermark over the ECG lane, IBP autoscale ON with the scale numbers removed, and the asystole message kept on screen through Silence while its audio is muted [M p.44].
- **Beat tone.** The factory default is volume 1, but the observed ICU had BEAT VOLUME OFF; the beat tone is off in practice.
- **Unknown:** whether Iranian ORs usually turn alarms on [06 §7]. Photo 8 of Ali's checklist (§10) answers it.

**What this means for the default demo configuration** (recommendation, pending Ali):
- `saadat-like` itself stays faithful to Appendix 1: alarms OFF, NORMAL filter, 8 s HR average, beat volume 1. The one exception is that the demo turns on the Solar date, because that is what residents see.
- A preset, `iran-icu-as-found`, reproduces the configuration above: MONITOR filter, HR average 16, beat tone off, pace detect off, crossed bells, APNEA LIMIT OFF. It is the starting screen for the orientation-course scenarios, because "the alarms are off; turning them on is step one" is the most useful teaching point report 06 found [06 §5.1].
- The PUMP page is available as a layout for cardiac-anaesthesia scenarios.

---

## 7. Public API (R7)

Package names are `@pme/engine-core`, `@pme/renderer`, `@pme/audio`, `@pme/controller`, `@pme/skins` and `@pme/validation`. The IIFE global is `PatientMonitor`.

### 7.1 Core types and lifecycle

```ts
export type Tick = number;               // integer; 1 tick = 20 ms of sim time
export type SimSeconds = number;
export type ChannelId = 'ecgI'|'ecgII'|'ecgIII'|'aVR'|'aVL'|'aVF'|'V1'|'V2'|'V3'|'V4'|'V5'|'V6'
                      | 'vcgX'|'vcgY'|'vcgZ'|'abp'|'cvp'|'pap'|'pleth'|'co2'|'resp';
export type NumericId = 'hr'|'pr'|'spo2'|'pi'|'abpSys'|'abpDia'|'abpMean'|'cvpMean'|'papSys'|'papDia'|'papMean'
                      | 'nibpSys'|'nibpDia'|'nibpMean'|'etco2'|'imco2'|'awrr'|'rr'|'tempCore'|'tempSite'|'stII'|'qtc';
export type StateVar = 'hr'|'sbp'|'dbp'|'cvp'|'papSys'|'papDia'|'pawp'|'spo2'|'pi'|'rr'|'vt'|'etco2'|'fio2'
                     | 'shunt'|'tempCore'|'contractility'|'svr'|'k'|'qtc'|'volumeStatus'|'paceThresholdMa';
export type ModelInput = 'hrFactor'|'svrFactor'|'contractilityFactor'|'vo2Factor'|'vco2Factor';
export type Ramp = { durationS: number; curve?: 'linear'|'exp'|'sigmoid'; delayS?: number };

export interface EngineOptions {
  seed?: number;                        // uint32
  mode?: 'manual'|'modeled';            // default 'manual'
  patient?: PatientProfile;             // age, sex, weight, height, baseline, rhythm
  device?: { skin?: string; ageBand?: 'adult'|'paediatric'|'neonatal'; mainsHz?: 50|60 };
  lookaheadS?: number;                  // default 0.100
}
export function createEngine(opts?: EngineOptions): MonitorEngine;

export interface MonitorEngine {
  readonly version: string;
  load(doc: ScenarioDoc | PatientSnapshot): void;
  start(): void;                         // internal wall-clock pump
  pause(): void;
  resume(): void;
  setTimeScale(k: number): void;         // 0.25–4
  step(ticks?: number): void;            // while paused
  advanceTo(simT: SimSeconds): void;     // host-driven clock (worker frame pump, Node, tests)
  now(): { tick: Tick; simT: SimSeconds };
  dispatch(cmd: Command): DispatchResult;               // { accepted, tick, reason? }
  on(fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]): () => void;
  readSamples(ch: ChannelId, fromIndex: number, out: Float32Array): number; // ring-buffer read; returns count
  latestSampleIndex(ch: ChannelId): number;
  sampleRate(ch: ChannelId): 500 | 125 | 62.5;
  snapshot(): PatientSnapshot;           // full JSON state: late joiners, bookmarks
  restore(s: PatientSnapshot): void;
  commandLog(sinceTick?: Tick): Command[];
  vocabulary(): Vocabulary;              // bounds, normals, enums, constraints (Squiggler-style, 04 §5)
  setL1Backend(b: L1Backend): void;      // 'manual' | 'modeled' built in; Pulse adapter later
}

export interface L1Backend {             // the Pulse seam (R4)
  readonly id: string;
  init(profile: PatientProfile, state: PatientState): void;
  update(dtS: number, inputs: L1Inputs): L1Outputs;     // called each tick
  onEvent(ev: ClinicalEvent): void;
  serialize(): unknown;
}
```

### 7.2 Commands

```ts
type CommandBase = { id: string; issuedBy: string; atTick?: Tick; stageGroup?: string };
export type Command = CommandBase & (
  | { type: 'setTarget'; variable: StateVar; value: number; ramp?: Ramp }
  | { type: 'pin'; variable: StateVar; value?: number; ramp?: Ramp }       // MODELED: override the output
  | { type: 'release'; variable: StateVar | 'all'; ramp?: Ramp }           // default ramp 10 s
  | { type: 'setFactor'; input: ModelInput; factor: number; ramp?: Ramp }
  | { type: 'setMode'; mode: 'manual'|'modeled' }
  | { type: 'setRhythm'; rhythm: RhythmId; opts?: RhythmOpts; when?: 'now'|'nextBeat'; respectRefractory?: boolean }
  | { type: 'setModifiers'; modifiers: Partial<Modifiers>; ramp?: Ramp }   // ectopy, ST/T, axis, artefact, rsa...
  | { type: 'applyEvent'; event: ClinicalEvent }
  | { type: 'attachSensor'; sensor: 'ecg'|'spo2'|'nibp'|'abp'|'cvp'|'pap'|'co2'|'temp';
      state: string; site?: string; leadSet?: 3|5|12; sampling?: 'sidestream'|'mainstream' }
  | { type: 'device'; action: DeviceAction }
  | { type: 'externalDrive'; source: 'ventilator'; frame: VentFrame }     // ≤50 Hz, stored in the drive track
  | { type: 'scenario'; action: 'load'|'goto'|'trigger'|'pause'|'resume'|'bookmark'|'restoreBookmark';
      target?: string; doc?: ScenarioDoc }
  | { type: 'time'; action: 'pause'|'resume'|'scale'|'step'|'jump'; value?: number } // remote equivalents of lifecycle
);

export type ClinicalEvent =
  | { kind: 'drug'; drugId: DrugId; dose: number; unit: 'mcg'|'mg'|'mcg/kg'|'mg/kg'|'mEq'|'units'|'mcg/kg/min';
      route: 'iv'|'io'|'im'|'inh'; infusion?: boolean }
  | { kind: 'fluid'; fluid: 'crystalloid'|'colloid'|'blood'; volumeMl: number; overS: number }
  | { kind: 'bleed'; rateMlPerMin?: number; volumeMl?: number; overS?: number }
  | { kind: 'airway'; state: 'patent'|'obstructed'|'apnoea'|'disconnected'|'oesophageal'|'endobronchial'|'bronchospasm';
      severity?: number }
  | { kind: 'ventilation'; source: 'spontaneous'|'bvm'|'ventilator'|'none'; rr?: number; vtMl?: number;
      fio2?: number; peep?: number; ie?: number }
  | { kind: 'preoxygenate'; fio2: number; durationS: number }
  | { kind: 'cpr'; active: boolean; rate?: number; quality?: number; ventilation?: '30:2'|'continuous' }
  | { kind: 'defib'; action: 'selectEnergy'|'charge'|'shock'|'disarm'|'syncOn'|'syncOff'; energyJ?: number }
  | { kind: 'pacer'; mode: 'off'|'demand'|'fixed'; ratePpm?: number; mA?: number; pause?: boolean }
  | { kind: 'line'; line: 'abp'|'cvp'|'pap'; action: 'flush'|'zero'|'sample'|'disconnect'|'reconnect'|'damp'|'level'|'wedge';
      value?: number }
  | { kind: 'surgical'; action: 'diathermy'|'shiver'|'motion'; on: boolean; durationS?: number }
  | { kind: 'condition'; id: 'anaphylaxis'|'mh'|'last'|'tamponade'|'tensionPtx'|'pe'; severity: number };

export type DeviceAction =
  | { device: 'nibp'; action: 'start'|'stat'|'stop'|'auto'; intervalMin?: number }
  | { device: 'alarm'; action: 'silence'|'pause'|'ack'|'setLimit'|'setVolume'; param?: NumericId;
      low?: number; high?: number; value?: number }
  | { device: 'ecg'; action: 'filter'|'lead'|'capture12'|'arrhythmiaAnalysis'; value?: string|boolean; lane?: number }
  | { device: 'display'; action: 'sweep'|'gain'|'freeze'|'layout'; lane?: number; value?: number|string }; // host-local

export type VentFrame = { pawCmH2O: number; flowLps: number; volumeMl: number; fio2: number; peepCmH2O: number;
                          phase?: 'insp'|'exp' };
```

### 7.3 Event stream

```ts
export type Measured = { value: number | null; flag: 'valid'|'questionable'|'invalid'|'stale'; at: SimSeconds };
export type EngineEvent =
  | { type: 'beat'; t: SimSeconds; seq: number; origin: 'sinus'|'atrial'|'junctional'|'ventricular'|'paced'|'fusion'|'aberrant';
      template: string; qrsMs: number; qtMs: number; prMs?: number;
      mech: { perfused: boolean; kSV: number; svMl: number; lvetMs: number } }
  | { type: 'atrial'; t: SimSeconds; kind: 'p'|'flutter'|'fib'|'retrograde'|'paced'; conducted: boolean }
  | { type: 'rhythmSegment'; t: SimSeconds; rhythm: RhythmId; seed: number; templateId?: string } // chaotic rhythms
  | { type: 'breath'; t: SimSeconds; seq: number; kind: 'spont'|'mech'|'bvm'|'gasp'; tiS: number; teS: number;
      vtMl: number; etco2True: number }
  | { type: 'marker'; t: SimSeconds; kind: 'paceSpike'|'syncR'|'shock'|'chargeStart'|'chargeReady'|'disarm';
      data?: Record<string, number|boolean> }
  | { type: 'measurement'; t: SimSeconds; values: Partial<Record<NumericId, Measured>> }        // ≤1 Hz
  | { type: 'nibp'; t: SimSeconds; phase: 'idle'|'inflating'|'deflating'|'done'|'failed'; cuffMmHg?: number;
      nextInS?: number; result?: { sys: number; dia: number; map: number; pr: number } }
  | { type: 'alarm'; t: SimSeconds; id: string; priority: 'high'|'medium'|'low'; category: 'physiological'|'technical';
      state: 'raised'|'cleared'|'acked'|'silenced'|'paused'; text: string }
  | { type: 'tone'; t: SimSeconds; id: string; kind: 'qrs'|'pulse'|'alarmBurst'|'charge'|'chargeReady'|'shock'|'nibpDone';
      freqHz?: number; priority?: 'high'|'medium'|'low' }
  | { type: 'toneCancel'; after: SimSeconds }
  | { type: 'state'; t: SimSeconds; tick: Tick; mode: 'manual'|'modeled'; values: Partial<Record<StateVar, number>>;
      control: Partial<Record<StateVar, 'modeled'|'pinned'|'ramping'|'override'>> }                 // 1 Hz
  | { type: 'scenario'; t: SimSeconds; stateId: string; transitionId?: string }
  | { type: 'commandApplied'; commandId: string; tick: Tick; resolved: unknown; ignored?: string[] }; // resolved-state echo (04 §5)
```

### 7.4 Scenario timeline JSON (`pme-scenario/1`)

This follows CAE's states and transitions, Laerdal's phases and Infirmary Integrated's steps [01 §2.3; 05 §4.2].

```json
{ "schema": "pme-scenario/1", "id": "acls-vf-01", "title": "Witnessed VF in PACU", "seed": 42, "mode": "manual",
  "patient": { "ageY": 58, "sex": "M", "weightKg": 80, "ageBand": "adult",
               "baseline": { "hr": 88, "sbp": 132, "dbp": 78, "spo2": 97, "rr": 16, "etco2": 36, "tempCore": 36.9 },
               "rhythm": { "id": "sinus" },
               "sensors": { "ecg": "on", "spo2": "on", "nibp": "on", "abp": "none", "co2": "off", "temp": "on" } },
  "device": { "skin": "zoll-like", "layout": "acls" },
  "initialState": "stable",
  "states": [
    { "id": "stable", "label": "Stable", "notes": "Handover given",
      "onEnter": [ { "type": "device", "action": { "device": "nibp", "action": "auto", "intervalMin": 5 } } ],
      "transitions": [ { "id": "t1", "to": "vf", "when": { "afterS": 60 } } ] },
    { "id": "vf", "onEnter": [ { "type": "setRhythm", "rhythm": "vfCoarse", "when": "now" } ],
      "transitions": [
        { "id": "shock", "to": "rosc", "when": { "event": { "kind": "defib", "action": "shock", "minJ": 150 } },
          "probability": 0.3, "else": "vf" },
        { "id": "decay", "to": "vfFine", "when": { "afterS": 240 } },
        { "id": "epiCpr", "to": "rosc", "when": { "all": [
            { "event": { "kind": "drug", "drugId": "epinephrine" } },
            { "vital": { "var": "etco2", "op": ">=", "value": 20, "forS": 30 } } ] } } ] },
    { "id": "rosc", "onEnter": [ { "type": "setRhythm", "rhythm": "sinusTachy" },
        { "type": "setTarget", "variable": "sbp", "value": 95, "ramp": { "durationS": 30, "curve": "sigmoid" } } ] } ],
  "bookmarks": [] }
```

**Triggers:**
- `afterS` (time in state) and `atScenarioS`;
- `vital {var, op, value, forS}`;
- `event {kind, …filters}`, e.g. `minJ`, `drugId`, `minDose`;
- `sensor {sensor, state}`;
- `manual {label}`, an instructor button;
- the combinators `all` and `any`;
- `probability` with an `else` target, rolled on the `scenario` PRNG stream.

A JSON Schema is shipped and validated with ajv (MIT).

### 7.5 Transport adapter

```ts
export type WireMessage = { v: 1; session: string; from: string; seq: number; sentAt: number } & (
  | { kind: 'hello'; role: 'host'|'controller'|'viewer' }
  | { kind: 'command'; body: Command }
  | { kind: 'ack'; commandId: string; accepted: boolean; tick: Tick; reason?: string }
  | { kind: 'event'; body: EngineEvent[] }          // batched per frame, never samples
  | { kind: 'snapshot'; body: PatientSnapshot } );
export interface Transport {
  readonly kind: 'in-process'|'postMessage'|'broadcastChannel'|'websocket'|'webrtc';
  send(m: WireMessage): void;
  onMessage(fn: (m: WireMessage) => void): () => void;
  onStatus(fn: (s: 'connecting'|'open'|'closed'|'error') => void): () => void;
  close(): void;
}
```

### 7.6 Embedding contract (ESM and IIFE)

- **ESM:** `import { mountMonitor } from '@pme/renderer'`. The factory `mountMonitor(el, opts): MonitorHandle` exposes:
  - `dispatch(cmd)` and `on(fn)`;
  - `setSkin(s)` and `calibrate(pxPerMm)`;
  - `enableSound(): Promise<void>`, which must be called from a gesture;
  - `showInstructorPanel(b)` and `destroy()`;
  - `engine`, a worker proxy.
- **Options:** `{ engine?: EngineOptions; skin: string | Skin; layout?: string; worker?: 'auto'|'off'; role?: 'host'|'viewer'; transport?: Transport }`.
- **IIFE:** `patient-monitor.iife.js` is one file. It carries an inline blob worker (so it works from `file://`), falls back to the main thread, and exposes `window.PatientMonitor = { mountMonitor, createEngine, transports, version }`.
- **Ventilator simulator.** Its physics runs at 200 Hz (`DT = 0.005`). It decimates to 50 Hz and sends drive frames:

```html
<div id="pm" style="height:420px"></div>
<script src="patient-monitor.iife.js"></script>
<script>
  const pm = PatientMonitor.mountMonitor(document.getElementById('pm'),
    { skin: 'philips-like', layout: 'or-vent', engine: { seed: 7, mode: 'manual' } });
  let n = 0;                                   // inside the vent sim's stepPhysics() loop
  function onPhysicsStep() { if (++n % 4) return;   // 200 Hz → 50 Hz
    pm.dispatch({ id: 'v' + n, issuedBy: 'vent', type: 'externalDrive', source: 'ventilator',
      frame: { pawCmH2O: P.Paw, flowLps: Q, volumeMl: P.V * 1000, fio2: S.fio2 / 100, peepCmH2O: S.peep } }); }
</script>
```

The engine turns flow sign changes into breath events (inspiration starts at flow > +0.05 L/s **[ENG]**). From the drive it derives:
- VA, from VT, RR and dead space;
- intrathoracic pressure, from mean Paw (for PPV and CVP);
- FiO2, for gas exchange.

The vent sim can read `measurement` events to show SpO2 and EtCO2 on its own panel.

---

## 8. Licence and provenance (R6)

**Our code is MIT** (pending Ali's final confirmation in the README). Borrowing is limited to the table below.

| May borrow | Licence | How | Source |
|---|---|---|---|
| Open Sim Lab patterns: sweep renderer, frame budget, R-wave-triggered mechanics, α-angle capnogram | MIT | Ideas and code, keeping the MIT notice. Every constant is re-derived | [02 §4.1–4.2] |
| Infirmary Integrated pressure vertex tables and lead/axis tables | Apache-2.0 | Morphology reference data, with the licence text, NOTICE and a statement of changes | [02 §4.3] |
| NeuroKit2 non-ECGSYN parts (`ppg_simulate` landmarks, artefact parameters) | MIT | Ideas | [02 §4.5] |
| uPlot; ajv; Vite, Vitest and TypeScript (build only) | MIT | Dependencies | [02 §E] |
| Equations from papers: McSharry, Stergiopulos, Severinghaus, Lian, Tang, Weissler, Benumof, Sessler and others | — | Clean-room implementation | [03] |

**Forbidden sources.** Implementers **must not open the source of:**
- ECGSYN (C/Matlab/Java);
- NeuroKit2's `_ecg_simulate_ecgsyn` and other ECGSYN "MIT" ports;
- the PhysioNet ECG/PPG arrhythmia simulator;
- the Python Anesthesia Simulator;
- Barry Robinson's monitor;
- any unlicensed repo (Explain, edusim, emtp-sim, EKGSim).

Each PR's template records the "sources consulted".

**No Squiggler output is used** as a reference or template. Its terms forbid building a competing generator from its output [04 §5].

**Datasets:**
- **Use:** VitalDB (the PhysioNet copy, CC BY 4.0), MGH/MF, MIT-BIH, CUDB and BIDMC (ODC-By 1.0), PTB-XL (CC BY 4.0), PWDB data (PDDL, to be confirmed on Zenodo).
- **Excluded until cleared:** CapnoBase (licence unverified), MIMIC-III/IV (ODbL share-alike; the MIMIC-III listing is unverified), PulseDB (non-commercial) [02 §D, §4].
- **Bundled content is limited to short extracted templates:** VF and AF segments, quantised to Int16 at 500 Hz. Plus derived statistics (medians, distributions).
- **Raw records are never committed.** The validation harness downloads them into a git-ignored cache.

**The NOTICES rule:**
- Every borrowed code file, data table, template file or runtime dependency gets a row in `NOTICES.md` *in the same PR*.
- Files under `packages/*/src/vendor/**` and `packages/engine-core/templates/**` must start with `NOTICE-ID: N-###`, and CI fails if the ID is missing from `NOTICES.md`.
- Apache-2.0 items also need the licence text in `LICENSES/` and a change statement.

---

## 9. Validation strategy (R9)

**The harness** (`@pme/validation`):
- It runs `engine-core` headless in Node (the core has no DOM), with fixed seeds and scripted commands.
- It computes metrics on the generated buffers and compares them with reference statistics derived from the datasets.
- Only the derived statistics are committed.
- It produces an HTML report per run.

| # | Metric | Method | Reference | Pass |
|---|---|---|---|---|
| V1 | R → radial upstroke delay | R peak to ABP foot (intersecting tangent) | VitalDB ECG + ART, binned by HR 50–70 / 70–90 / 90–110; literature 150–220 ms [03 §2.1] | Median within ±20 ms of the VitalDB median per bin **[ENG]** |
| V2 | Dicrotic notch timing | R → notch vs PEP + LVET + PTT | VitalDB and PWDB radial | ±20 ms |
| V3 | PPG vs ABP correspondence | PPG foot − ABP foot; per-beat amplitude correlation under SV perturbation; beat-count equality | VitalDB PLETH + ART | Lag 20–100 ms [03 §3.1]; r ≥0.8 **[ENG]**; PR equal in sinus, PR < HR in AF |
| V4 | Capnogram α angle and phase II | Angle on the 25 mmHg/s scale | VitalDB CO2, MGH/MF CO2 | Normal 100–110°; obstructive ≥120° [03 §4.1] |
| V5 | ECG intervals and morphology | Fiducials on lead II; median-beat correlation per lead | PTB-XL normals | QT on the Fridericia table ±5 ms; r ≥0.9 per lead **[ENG]**; ProSim lead ratios ±25% |
| V6 | VF spectrum | Welch PSD dominant frequency, AMSA | CUDB | 4–6 Hz at onset, declining per f_dom(t) |
| V7 | Device timing | Step tests | IEC / vendor numbers | HR 80→120 <11 s; SpO2 device response ≤20 s; NIBP cycle 25–35 s; sidestream delay 2.3 ± 0.1 s; alarm delays ±1 s |
| V8 | Physiology sanity | §4.9 checks 1–9 | Report 03 §8 | All pass |
| V9 | Determinism | SHA-256 of buffers for 40 seeds × 60 s per rhythm | Golden files | Identical on the same build [04 §7.9] |

**Realism review protocol** (Ali, blind), at the gates of Stages 2, 3, 5 and 8:
1. **Build the clip set.** For each channel (ECG II, ABP, pleth, CO2), take 20 real 10-s segments from VitalDB (PhysioNet copy) and MGH/MF, and 20 synthetic segments matched for HR, BP band and rhythm class. **All are rendered through our renderer and skin**, which removes the display as a confound.
2. **Shuffle.** Order is randomised per session.
3. **Rate each clip.** The tasks are a forced choice ("real or synthetic"), a realism score from 1 to 5, and a comment.
4. **Apply the pass criteria:**
   - identification accuracy ≤60% per channel (n = 40; chance is 50%);
   - mean synthetic realism ≥4.0;
   - synthetic realism not more than 0.5 below real **[ENG]**.
5. **Review device behaviour.** Ali films real OR monitor *screens only* (no identifiers, within hospital policy; filming approved, R12), including **Saadat B9 screens** for the `saadat-like` skin, covering:
   - the NIBP cycle;
   - SpO2 lag at induction;
   - alarm sounds;
   - sweep appearance.

   The engine runs the matching scenario side by side, and each behaviour is scored matches / close / wrong. The videos are private and never committed.
6. **Tooling.** `packages/validation/review` is a static page that plays the clips and saves the answers as JSON.

---

## 10. Risks and open questions

| Risk | Mitigation / owner stage | Source |
|---|---|---|
| iOS audio: unlock must happen inside a gesture, and the mute switch silences Web Audio; AudioSession is Safari-only | "Enable sound" gate, `<audio>` keep-alive, real-iPad test at the Stage 1 gate | [05 §5.5] |
| rAF throttled to 30 fps (Low Power Mode, cross-origin iframes until tap); Safari caps near 60 fps on 120 Hz | Sweep from sim time; 30 fps mode; embeds prompt a tap | [05 §1.1.5, §5.6] |
| Worker `requestAnimationFrame` on Safari **[unverified]** | Main-thread frame pump fallback; test in Stage 1 | this brief |
| No physical mm | Card calibration plus a seconds-per-lane mode | [05 §5.1] |
| IEC 60601-1-8 tables come from patents, not the standard | "IEC-style" label; buy the standard / AMD2 Annex G before any claim | [05 §5.2; 03 §9.14] |
| **Numbers still unverified after the 2026-09-24 verification pass** [03 §11]: Weissler PEP intercept by sex (131 vs 133); Kelman virtual-PO2 coefficients; Benumof child time to 90% (ENG estimate ≈3.2 min); GE CARESCAPE factory alarm defaults (supplemental manual not found); vendor HR-averaging disclosures; full IEC 60601-1-8 text (must be bought); capnography sample-line leak sign. CONFIRMED in that pass: ECGSYN Table I and A = 0.15 mV (default noise is 0, not 0.1 mV), Dower and inverse-Dower matrices, Weissler LVET (413 − 1.7·HR men / 418 − 1.6·HR women), Meaney/Razminia MAP, Severinghaus curve, Benumof adult times, Mindray BeneVision defaults, IEC burst counts/intervals/flash rates (secondary quotations only) | Each stage's plan has a "verify before gate" task | [03 §10–§11]
| SpO2 pitch mappings unpublished | Skin presets, labelled approximate | [05 §5.4] |
| Vendor trade dress | "-like" skins, no logos | [05 §5.3] |
| **Licence items for legal review:** ECGSYN-derived "MIT" ports; ODC-By templates bundled in an MIT package; VitalDB DUA (vitaldb.net) vs the PhysioNet CC BY copy; PWDB PDDL on Zenodo; CapnoBase; MIMIC ODbL share-alike; Apache NOTICE obligations; PTB-XL licence mismatch (§11 C5) | Before the v1.0 tag (Stage 8) | [02 §4] |
| Pulse wasm maturity: no npm package; size and iPad real-time factor unmeasured | v2 only, behind `L1Backend` | [02 B1; 05 §5.8] |
| Open Sim Lab maturity: one commit, likely machine-assisted | Borrow patterns; re-derive constants | [02 A2] |
| No cross-device determinism | Host-authoritative events | [05 §5.7] |
| Latency budget of 70–140 ms is an estimate | Measure in Stage 6 | [05 §3.2] |
| ATLS classes and CPR EtCO2/DBP thresholds are teaching approximations | Default trajectories only; instructor override | [03 §9.5–9.6, §9.13] |
| Performance on older iPads | Frame-budget ladder (Open Sim Lab pattern); Stage 8 performance gate | [02 §4.1] |
| **`saadat-like` open items** [06 §7]: alarm tone frequencies, pulse lengths and gaps (none published); lamp flash rates; erase-gap width and whether a cursor line exists; paediatric and neonatal HR, SpO2, RR and Temp limits (unbanded in the manual); the IBP3/IBP4 colour conflict (manual names vs screenshot); asystole 5 s vs 10 s; the Alarm Freeze default; SpO2 pitch modulation; agent-gas colours | Ship the values tagged [assumed] / [unverified] as report 06 does. Ali's bedside capture (below) closes most of them; the Stage 4 "verify before gate" task records what remains | [06 §1, §7] |

**Action for Ali: Saadat bedside capture** [06 §7]. About 30 minutes at a B9, on a patient simulator or a consenting monitored patient, with no patient identifiers on screen. First run Setup → LOAD DEFAULT (ask biomed) and set the date to Solar.
- **8 photos:** (1) factory main screen P1; (2) the ECG lane at 1/15 s, or a 240 fps clip of about 3 s, for the erase bar; (3) the MODULE COLOR window; (4) each alarm level's message bar and lamp; (5) Silence pressed, with the header countdown; (6) the paediatric and neonatal HR, SpO2 and Resp alarm windows after LOAD DEFAULT; (7) P5 (12-lead) and P10 (PUMP) with IBP connected; (8) an OR monitor and an ICU monitor as found, before changing anything.
- **3 alarm recordings:** 40 s each of levels 1, 2 and 3, phone 30 cm away in a quiet room. Add the QRS beep at volume 3 with SpO2 falling, to settle pitch modulation.
- **2 stopwatch tests:** lead-off with an asystole simulator to the alarm (5 s or 10 s?); HR 80→120 at the 8 s average.
- Also ask Saadat after-sales for the English manual D01112.
- Needed before the Stage 4 gate.

**Open questions for Ali:**
1. Is MIT the final licence? **Answered (R12):** MIT, final.
2. Which skin goes first: Philips-like OR or ZOLL-like defib? **Answered (R12):** Philips-like for the OR, ZOLL-like for ACLS, both in v1. `saadat-like` was then added (R13) and is now recommended first; see question 7.
3. Confirm 50 Hz mains. **Answered (R12):** 50 Hz.
4. mmHg vs kPa for CO2 (default mmHg). **Answered (R12):** mmHg.
5. Will the IEC 60601-1-8 standard be bought? **Answered (R12):** not purchased; alarms stay "IEC-style", with no compliance claim.
6. Does hospital policy allow filming monitor screens? **Answered (R12):** yes, filming is allowed.
7. **New:** confirm the skin order `saadat-like` → `philips-like` → `zoll-like` (the orchestrator's recommendation, §3.8).

---

## 11. Challenges to rulings, and sources

**C1. R5 says VF comes from recorded templates. Proposal: a hybrid.**
- CUDB/MIT-BIH VF segments are short, patient-specific and fixed at 250/360 Hz.
- Report 03 §1.8 requires:
  - amplitude decay over 6–20 min;
  - declining dominant frequency;
  - responses to CPR and epinephrine;
  - an asystole hazard.

  Pure playback cannot evolve that way.
- Templates therefore supply the *texture*, time-warped to `f_dom(t)` and scaled by `A(t)`, with a pure-parametric AR fallback.
- The same hybrid applies to AF f-waves.

**C2. R5 says CPR artefact comes from templates.** None of the licensed datasets in reports 02 and 03 contains CPR artefact recordings. v1 uses the parametric harmonic model [03 §1.10] and keeps a template slot.

**C3. R1's sample rates vs the 20 ms tick.** 125 Hz and 62.5 Hz give 2.5 and 1.25 samples per tick. This does not contradict R1: it is solved by absolute sample indexing (§3.3). The rates are kept because they match the Philips export [05 §2.3]; Open Sim Lab instead picked rates that divide its tick [02 A2]. A Stage 1 test asserts zero drift over 24 h of sim.

**C4. Report 04 §7.8 vs R7.** 04 suggests every learner display runs the physiology locally from targets and ramps. R7 and 05 §1.1.6 (cross-engine `Math` differences) win: the host is authoritative and viewers synthesise L2/L3 from events.

**C5. R6 lists PTB-XL as ODC-By; report 02 §D says CC BY 4.0** (PhysioNet page). Both allow our use. `NOTICES.md` will record CC BY 4.0. VitalDB is used from the PhysioNet copy only.

**C6. Look-ahead.** Report 05 §3.2 proposes 60 ms. This brief uses **100 ms**, which gives the 100 ms audio scheduler real margin. Control latency does not grow, because commands invalidate and regenerate the look-ahead.

**C7. R3's "IEC 60601-1-8 alarm bursts" become "IEC-style"** until the standard is purchased [05 §5.2].

**C8. MANUAL pressure targets.** Report 02 A2 (Open Sim Lab) maps a fixed waveform affinely onto the SBP/DBP targets. This brief rejects that in favour of a per-beat tracker on SV and R (§4.9 M2). The reason is R5's requirement that ABP stay physically coupled to rhythm, CPR and line state.

**Sources:**
- Research reports: `research/00-orchestrator-rulings.md`, `01-commercial-simulators.md`, `02-open-source-and-academic.md`, `03-waveform-physiology-reference.md`, `04-squiggler-and-web-sims.md`, `05-rendering-ux-integration.md`, `06-saadat-alborz-b9.md`.
- Philips IntelliVue Configuration Guide Rel. J: https://www.documents.philips.com/doclib/enc/fetch/2000/4504/577242/577243/577247/582636/582882/MP2-90,_X2,_MX800,_Cableless_Patient_Monitors_Configuration_Guide_Rel._J.0_4535_643_22741_(ENG).pdf
- Mindray BeneVision N Operator's Manual: https://www.mindray.com/content/dam/xpace/en_gb/resources/downloads/education/education-nseries/operators-manual/BeneVision-N-Series-Operators-Manual.pdf
- ZOLL X Series Operator's Guide: https://documents.cdn.ifixit.com/ZOY5FA4FoCEfvPe4.pdf
- Saadat Alborz B9 [06 §8]:
  - Product page (Persian) [S1]: https://saadatco.com/?page_id=2839
  - Product index, vital-signs monitors [S2]: https://saadatco.com/?page_id=3035
  - User manual D01111-12, Mehr 1403, 314 pp., Persian [S3], the primary source: https://saadatco.com/wp-content/uploads/2021/12/D00125-V17.pdf
  - Quick reference D00747-V0, Persian [S4]: https://saadatco.com/wp-content/uploads/2019/08/D00747-V0.pdf
  - English product page [S5]: https://saadatco.com/?lang=en&page_id=4046 ; English manual D01112-V0 (not read): https://saadatco.com/wp-content/uploads/2022/06/D01112-V0.pdf ; English quick reference: https://saadatco.com/wp-content/uploads/2022/06/D00754-V2.pdf
  - Official product photos [S7]: https://saadatco.com/wp-content/uploads/2022/03/1.jpg (and 2, 3, 4, 6, AlBORZ-B9.jpg)
  - ICU video «دستگاه مانیتور سعادت B9» ("Saadat B9 monitor device"), Aparat, frames 0:20, 0:21, 2:30 [S8]: https://www.aparat.com/v/r0009pc
  - Training video (not viewed; the next source for audio) [S9]: https://www.aparat.com/v/b56kgv8
- LIFEPAK 15 Operating Instructions: https://www.stryker.com/content/dam/stryker/ems/resources/operating-instructions/international/3314911-030_int-eng_lifepak_15_operating_instructions.pdf
- IEC 60601-1-8 timing as quoted in US 9,814,817 B2: https://patents.google.com/patent/US9814817B2/en
- IEC AMD1 and AMD2 previews:
  - https://cdn.standards.iteh.ai/samples/59935/58e3f4a16b774421af85d948685a6ae9/IEC-60601-1-8-2006-Amd-1-2012.pdf
  - https://cdn.standards.iteh.ai/samples/100136/a09cd8054a174e70b299680fedfeafeb/IEC-60601-1-8-2006-AMD2-2020.pdf
- Web audio and rendering:
  - "A tale of two clocks": https://web.dev/articles/audio-scheduling
  - OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
  - WebKit rAF throttling: https://bugs.webkit.org/show_bug.cgi?id=168837
  - Fix Your Timestep: https://gafferongames.com/post/fix_your_timestep/
- Physiology engines and reference implementations:
  - Pulse: https://pulse.kitware.com/ · https://gitlab.kitware.com/physiology/engine
  - Open Sim Lab: https://github.com/clay-good/opensimlab
  - Infirmary Integrated: https://github.com/tanjera/infirmary-integrated
- Models:
  - Lian 2007 AV junction: https://pmc.ncbi.nlm.nih.gov/articles/PMC1820785/
  - Tang 2020 PPG: https://pmc.ncbi.nlm.nih.gov/articles/PMC7431427/
  - Stergiopulos 1999: https://journals.physiology.org/doi/full/10.1152/ajpheart.1999.276.1.h81
  - Schipke 2003: https://journals.physiology.org/doi/full/10.1152/ajpheart.00604.2003
- Datasets:
  - VitalDB: https://physionet.org/content/vitaldb/1.0.0/
  - MGH/MF: https://physionet.org/content/mghdb/1.0.0/
  - PTB-XL: https://physionet.org/content/ptb-xl/1.0.3/
  - CUDB: https://physionet.org/content/cudb/1.0.0/
  - MIT-BIH: https://physionet.org/content/mitdb/1.0.0/
  - PWDB: https://zenodo.org/records/2633175
