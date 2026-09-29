# UI benchmark: commercial and open-source patient-monitor simulators, instructor-UI focus (2026-09-28)

*Delivered by the UI benchmark study's simulator/open-source sweep after its parent report; filed verbatim by the orchestrator. Companion to `13-ui-benchmarks.md`, `13-ui-design-brief-draft.md`, `13-ui-design-references.md`.*

**Method and limits.** Full primary user guides read as PDFs: REALITi360 User Guide V8, SimPad PLUS User Guide rev E, CAE Maestro (Ares) User Guide v1.3, Gaumard UNI User Guide 15.10.1; also the Laerdal Patient Monitor Help (Rev E) and the Infirmary Integrated source (Control.axaml). Other products from vendor pages, App Store listings and READMEs. Gaps: LLEAP Instructor Application help not public (LLEAP described via the Patient Monitor help, sell sheet and SimPad); Gaumard UNI 3 / Vitals pages behind Cloudflare (search snippets only); no videos watched; "VitalsSim" and "Sim-Anesthesia" not found as distinct products. The user's own project was excluded.

## 1. Laerdal LLEAP and Patient Monitor
**Learner monitor:** configurable wave lanes ("5wave" selector), "BigNum" mode; a bottom soft-key menu line over two pages (alarms, NBP start, zero, C.O., wedge, TOF, trends, 12-lead, radiology/media/labs); waves and parameters blank until a sensor is "attached" (manikin-detected, learner-tapped, scenario-set or instructor-toggled); displayed values jittered up to 5 % so they look natural; profiles set default layout, alarm limits, colours, units; the scenario's initial frame decides which waves the learner may reconfigure. Source: http://laerdalcdn.blob.core.windows.net/downloads/f2139/SimPad_Patient_Monitor_help_file.pdf
**Instructor UI:** Automatic mode (pre-programmed; logged events can drive the scenario) and Manual mode; drop-downs and sliders; "tap to log" event keys; customisable saved layouts (https://cdn.laerdal.com/downloads/f3133/14-14353_LLEAP_SS_final.pdf); an "Instructor's Patient Monitor" with sensor toggles, an Event menu with a clickable manikin, "Common learner events"; every sensor change logged. Scenario authoring (SimDesigner/Scenario Editor): frames + Trends + Handlers (event → response rules); Trends with start/stop/no-change, delay, offset, time-to-stop.
**SimPad PLUS:** a theme is a list of states; a flag marks the start state, a white arrow the last activated; time-in-state and session time; vitals strip with abnormal values called out; collapsible mini-log; **"Set transition time" next to an expanded state showing all queued parameters — tap to activate**; sliders with hold-for-fine adjustment then "Activate"; save back to state or as new; reorder by tap-and-hold. Automatic mode: patient status, scenario clock, intervention categories, last logged event, "Override pre-programmed behaviour". Logs to Log Viewer / Session Viewer / SimCapture with synced video (https://cdn.laerdal.com/downloads/f6691/SimPadPLUSUserGuideENrevE.pdf). Debrief: audio + vitals + log in one file, jump to timestamped events.
**Excellent:** staged "queue, then activate" with visible transition time; start/last-state markers; sensor attachment as first-class state; learner reconfiguration constrained by scenario. **Avoid:** two-page soft-key menu on the learner monitor; many separate authoring tools.

## 2. iSimulate REALITi 360 / REALITi Plus / ALSi
**Learner monitor:** licensed "premium screens" mimicking real devices (Zoll, Lifepak, Corpuls…; 75+ ECG waveforms, dynamic 12-lead); the generic ALSi screen shows every parameter, premium skins only some (V8 guide §4.6: https://lifesupportdistribution.fr/wp-content/uploads/2020/12/REALITi-User-Guide-V8-1.pdf).
**Instructor UI (Control iPad):** five zones — scenario loading/management; physiology dials; checklist/sound/media/labs; CPR and pacing; a lower banner. Each vital is a **rotary dial**; tapping the centre opens the waveform picker; "advanced" opens PVC/PAC, artefact, sinus arrhythmia, damped pleth, SVV, QRS synced to ventilation; an eye toggle hides a parameter (cables not connected); a 12-lead panel removes individual leads. **Every change needs an explicit "send to monitor".** **Trend:** set duration (10 s–15 min), dial targets, start; **a blue arc circles the dial** to show progress; press-and-hold stops. Lower banner: elapsed chronograph, countdown "Alarm" timer, Flag (preset/free text), start/pause/stop, a **"Virtual time" slider** to skip time, a monitor Preview. **Scenarios:** a list of steps (actions and text boxes shown on the monitor), each with a transition time, conditional or manual; the active step highlighted blue; tap any step to jump; duplicate/drag to reorder; shared online.
**Remote:** controller and monitor iPads pair on Wi-Fi; internet remote; Chart iPad; Camera iPad (https://www.3bscientific.com/product-manual/1022862_EN.pdf). **ALSi:** instructor iPad drives a monitor-defibrillator-looking iPad; 50 rhythms; gradual or immediate changes.
**Debrief (V8 §6):** results banner with checklist items (yes/no, critical, graded 0–10); a **timeline with colour-coded trend curves** (HR green, SBP blue, DBP white, SpO2 yellow, EtCO2 purple) with red flag dots; chronological action list with video; PDF export; de-identification.
**Complaints:** App Store 3.8/5; one review: the patient deteriorated without explanation (vendor: unlicensed state). **Avoid:** send-after-every-change; dials for precise numbers; a silent trial mode that looks like physiology.

## 3. SimMon (Castle Andersen)
Two iOS/Android devices (monitor + remote) over Wi-Fi/Bluetooth; **touch a number and drag up/down** to change HR, BP, SpO2, RR; keypad entry, presets from file, rhythms, EtCO2, defib artefacts, CPR; ≈ $23; reviewers prefer it to a $1000 product; complaints about rhythm limits (VT needs HR > 100). **Excellent:** direct manipulation on the value. **Avoid:** no scenario/state model, no documented debrief.

## 4. Gaumard UNI / UNI 3 / Gaumard Vitals
**UNI 15.10** (https://gaumard-downloads.s3.amazonaws.com/manuals/UNI-15.10.1.pdf): Status/Details tab lists vitals by system; slider or keyboard entry with a green check; rhythm and sound libraries with previews. **Changes collect in an "Apply" panel as a list; press "NOW" or pick a trending timer; "instant apply" skips the panel. Vitals that are changing blink yellow.** In Auto (modelled) mode parameters marked "(auto)" follow the model; **tick "Hold" to pin a value**; "Reset" returns to initial. **Palettes** = saved full/partial states with name, description, colour. **Scenarios = a playlist of palette items, each with its own transition time**, plus "Wait" palettes; music-player controls; a position triangle shows stopped/playing/paused. Virtual-monitor tab with a 3D "Body View" and sensor toggles; timestamped event log. **UNI 3:** dark theme, "Smart Scenarios", automated event tracking (not fetched directly). **Gaumard Vitals:** a Layout Designer placing and colouring every wave/numeric to mimic brands; on-demand 12-lead.
**Excellent:** pending-change list + NOW-or-trend; per-parameter Hold vs Auto; yellow blink during transition; palettes as reusable states. **Avoid:** right-click / stylus-button menus on tablets (2015 UI).

## 5. CAE / Elevate Healthcare Maestro (and TouchPro)
**Modes:** Modeled (CAE Physiology) or Manual × SCE (scenario) or On-the-Fly; Manual has a streamlined layout (https://www.aedsuperstore.com/pdf/cae-maestro-ares-user-guide.pdf).
**Run screen:** Patient Status display central; system icons open panels (Cardiovascular, Respiratory, Neuro, Fluids, Sounds, Pulse, Speech) each with Basic/Advanced tabs; Conditions, Treatments, Medications quick-links; Monitor Signals (probe on/off; catheter to Atmosphere → flat line); Records; Intercom (hold to speak as the patient). **Setting a monitored value in Modeled mode overrides the model; tap "Modeled" then "Accept" to return it.** Model inputs shown separately as "factors" (e.g. HR factor 2.0). Values change over time with an **onset** control. Tapping a widget opens a Parameter Editor (slider, text, +/-); **press-and-hold gives Quick Edit +/- overlays.** **Flags:** a blue rotating flag = value in transition; a yellow **System Override** flag = the model forced the value (apnoea, PEA). Scenario panel with per-state Play. **Bottom timeline** with elapsed time, markers, 4:1 fast-forward, pause; **tap a marker → "Revert" restores the physiology from that moment** while the clock keeps running; reset-to-baseline marked. Event Log colour-coded by category; a separate Medications Log in Modeled mode.
**SCE editor:** tabs Details, Patient, Scenario, Checklists, Patient Records, Preparation; typed transitions (medication, treatment, assessment, vitals, drug concentration, fluids, time in scenario, time in state); **Live Scenario Editor** ("Jump to State", "Edit Live", restart).
**TouchPro:** layouts by dragging widgets onto lanes (colour, alarm, scale); saved layouts; NIBP cycling; a critical widget flashes. **Debrief:** History tab (Event Log, physiology, CPR data) with CSV export.
**Excellent:** explicit override semantics with one-tap return to the model; transition and system-override flags; bookmark-revert; typed transitions; live editing. **Avoid:** deep icon → panel → tab nesting; two logs in Modeled mode.

## 6. Other commercial and screen-based products
- **KbPort SimVS:** tablet platform, one instructor drives up to 6 patients / 10 student tablets (no UI detail).
- **Anesoft Anesthesia Simulator:** vitals area + patient image + machine/spirometer + surgeon status; 100+ drugs; automated anaesthetic record; debrief and scoring; light/dark; not for phones. **Mirror Monitor:** a sim tech enters learner actions while a display shows live vitals.
- **UF Virtual Anesthesia Machine:** model-driven web simulation with gas molecules as coloured dots; 23 languages; an Instructor VAM exists (not verified).
- **Body Interact / Full Code:** learner-driven; timestamped reports of actions, untreated conditions, vitals, penalties and scores.

## 7. Open source and free web tools
| Project | Licence / activity | Stack | UI notes |
|---|---|---|---|
| tanjera/infirmary-integrated | Apache-2.0, 79★, pushed 2026-08-27, v2.8.0 | C#/.NET 9, Avalonia | Control window: expanders per system; numeric up-downs, rhythm combos; **Apply / Reset, "Auto-apply changes", pending-changes indicator**; scenario player (prev/play/pause/next, step timer); device launcher (monitor, defib, 12-lead, IABP, EFM); Mirror menu; Dark/Light/Grid; 15 languages. Desktop, not touch-first. |
| samnunn/gasnotes-simulator (sim.gasnotes.net) | MIT, 3★, 2026-05 | Flask + Socket.IO | Anaesthesia-oriented; pair by **SimCode**; **pending changes sent en bloc** with optional gradual transition and per-trace enable; learners pause alarms, toggle sound, review ABG/CXR/echo; server-based. No scenario model, no debrief. |
| BarryRobinson/Vital-Signs-Monitor | GPL-3.0, 8★, 2021 | HTML/JS + PeerJS | P2P controller; timestamped action log with comments; text-file scenarios; NIBP deflates ≈ 2 mmHg/s with sound. Stale. |
| Gareth-Power/Patient-Monitor | AGPL-3.0, 0★, 2026 | JS | not assessed |
| hankersyan/MPSimulator | Apache-2.0, 16★, 2019 | Python | Philips IntelliVue protocol emulator; not a UI |
| BioGearsEngine/ui | no licence, 10★, 2024 | Qt/QML | scenario composer with a timeline; beta |
| Pulse Explorer (Kitware) | Apache-2.0 | Qt | engine explorer with optional vitals monitor; research-oriented |
| Python_Anesthesia_Simulator; open-anesthesia-sim | Python | | PK/PD and volatile-uptake models, no monitor UI |
| fedebarra/open-vent-sim | no licence, 3★ | TypeScript | ventilator / anaesthesia-machine simulator |
| Vital Sign Simulator (SourceForge) | GPL-3.0, 2018 | VB | dual-screen operator/trainee, AED mode, RTF auto-documentation |

**Free but closed web tools:** TrainingMonitor.App (session ID, controller/viewer roles, linear trends 3–300 s, 68 scenarios, always-on log in 11 categories with CSV/print); Medical Monitor Simulator (medicalmonitorsim.com; standalone or multi-device via session ID or **QR**; changes at once or queued with 0–2 min transition; 7 presets; scenarios as JSON); SimCore (separate Monitor and Controller links with an admin key; sessions expire ≈ 4 h).
**UI kits:** no credible open patient-monitor kit; usable foundations NHS.UK frontend (MIT), Medplum React (Apache-2.0 on Mantine MIT), Cerner Terra, IBM Carbon (OpenMRS).

## Top 8 instructor-UI patterns worth copying
1. **Stage changes, then commit with a chosen transition** (pending list, "Now" or "over X s", auto-apply opt-out): Gaumard UNI, SimPad PLUS, Infirmary Integrated, Gas Notes.
2. **Modelled vs overridden per parameter with a one-tap return to the model:** Maestro ("Modeled" → Accept; factors separate from outputs), UNI (Hold vs Auto).
3. **Status flags on the values themselves:** transitioning (Maestro blue rotating flag, UNI yellow blink, REALITi progress arc); system-forced (Maestro yellow override flag).
4. **State list as a playlist with a current-state pointer,** start/last markers, time-in-state, tap-to-jump/next: SimPad, UNI, REALITi, Maestro.
5. **A bottom timeline with bookmarks, flags and time controls:** Maestro (marker, revert, 4:1 fast-forward), REALITi (flag, virtual-time skip, countdown).
6. **Direct manipulation on the value:** SimMon drag-on-number, Maestro tap-widget editor and press-and-hold +/-, SimPad slider with hold-for-fine.
7. **Sensor/probe attachment as explicit state:** blank lane until attached, instructor toggle mirrored in the log (Laerdal, Maestro Monitor Signals, REALITi hide/show).
8. **Pair by code or QR with role-separated links** (Gas Notes, Medical Monitor Simulator, SimCore, TrainingMonitor); a debrief timeline of colour-coded vitals plus a flagged event list with export (REALITi, TrainingMonitor, Maestro).

## Top 5 anti-patterns
1. A mandatory "send" after every single edit with no batching (REALITi).
2. Rotary dials for precise numbers; right-click menus on tablets (REALITi; UNI 2015).
3. Controls buried in deep icon/panel/tab nesting with split logs (Maestro); authoring split across tools (LLEAP).
4. Hidden functions on the learner monitor (Laerdal two-page soft keys; premium skins silently dropping parameters).
5. Unexplained state changes (REALITi unlicensed mode); tools with no state model or log (SimMon, Gas Notes, SimCore).

**Unverified:** LLEAP Instructor Application layout; UNI 3 and Gaumard Vitals detail; Instructor VAM; SimMon trends; video demos. Source dates: REALITi V8 2020, Maestro v1.3 2020, UNI 2015.
