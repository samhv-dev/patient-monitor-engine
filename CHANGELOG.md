# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/):
the public API is what the packages export (see the API reference), the `pme-scenario/1`, `pme-snapshot/1`,
`pme-skin/1`, `pme-preset/1` and `pme-theme/1` document formats, and `window.PatientMonitor`.

## [Unreleased]

### Changed

- Showcase tamponade card (card text only): the monitor alone does not identify a tamponade, so the card now
  narrates the bedside finding. Arrival (where the recognition cues appear, about 1:00, and the instructor ticks *Name
  the tamponade*) and Deteriorating carry the note "Bedside FAST: pericardial fluid, right-ventricular collapse", shown
  under the state on the Scenario tab; the cue cards and the run sheet tell the presenter to read it out. The card's
  states, transitions, timings and objectives are unchanged (the A3 cue-card path, re-measured on Chromium, gives the
  same times).
- Engine (E117): malignant hyperthermia now shows its tachycardia early. The MH sympathetic drive is front-loaded (it
  approaches its full level, 2.5 in stress-activity units, with τ 2 min from the trigger instead of following the
  15-min metabolic ramp, and falls with dantrolene on the same τ); hypercapnia adds a small sympathetic term, 0.03 per
  mmHg of PaCO2 above 45 up to 0.3, gated by brainstem perfusion and by the anaesthetic's sympatholysis; and the hypermetabolic muscle's own vasodilation
  lowers SVR by up to 20 % with the MH activity, so the pressure does not climb with the heart rate (Somers et al.,
  J Appl Physiol 1989; tachycardia as an early MH sign: Miller's Anesthesia 10e; catecholamines in porcine MH: Gronert
  et al., Anesthesiology 1977). The MH potassium efflux is 2.35 (was 2.2) to keep K 5.5–6.5 at 20 min. On the showcase
  MH induction at constant ventilation the HR is rising (80 → 94; 74 without MH) before the EtCO2 leaves its baseline
  and is 126 when the EtCO2 passes 55 mmHg (was 99; target ≥ 120). Without MH, hypoventilation to PaCO2 51 adds 2 bpm
  and to PaCO2 68 adds 16 (was 13). After dantrolene the HR falls ≥ 15 % from its peak by +20 min (target audit row
  133 band (b)); the "HR < 100 by +20 min" known miss is replaced by that band. New known miss: dantrolene's 10-min
  EtCO2 effect in the DI-65 guard is −4.6 mmHg (band ≤ −5; −5.5 before). Showcase MH: HR at the established crisis
  ≈ 166 (was 142–148) and MAP 92 (was 98), the early-treated path's HR peak 119 (was 93), the late path's highest
  systolic 141 (was 158) and MAP at 60 min 107 (was 112). Showcase tamponade: the highest 1-Hz systolic in the minute after ROSC is 199 mmHg (was 155;
  a single-beat transient, 122 at +60 s as before). Every scenario timing (early signs, established crisis, pulse
  loss, drainage, ROSC) is unchanged.
- Engine (E118): severe tamponade now shows pulsus paradoxus. Severe tamponade means 250 mL, spontaneous breathing;
  the inspiratory systolic fall is 10.8 mmHg (was 3.4; target > 10, Spodick, NEJM 2003). Mild tamponade (100 mL)
  gives 4.1 and a healthy patient 2.4 (both ≤ 5). Positive-pressure ventilation keeps its reversed sign and size:
  2.75 mmHg in severe tamponade (2.58 before) and 1.50 healthy (unchanged).
  - **The tamponade's breathing.** Tamponade has its own effort factor, because the chemical drive gives a
    compensated tamponade a normal breath. As the diastolic pericardial pressure rises from 5 to 20 mmHg, the
    spontaneous pleural swing deepens from 4 to 18 cmH2O peak to trough. The extra swing is centred on the breath:
    inspiration falls 12.7 cmH2O below the end-expiratory pressure and an active expiration rises 5.3 cmH2O above it,
    so the mean intrathoracic pressure is unchanged. The effort stops at the arrest. Sources: dyspnoea in Roy et al.,
    JAMA 2007; the depth dependence in Shabetai et al., Am J Cardiol 1970; the deep breaths of the Ramachandran et
    al. model, Theor Biol Med Model 2009.
  - **Ventricular interdependence through the septum.** When the RV fills more than the LV, the septum moves into
    the LV by a share c of the difference, with c = P̄/(P̄ + 10 mmHg): ≈ 0 healthy, 0.7 at 250 mL. The septum is
    passive (c ≤ 1). Sources: the three-wall structure of Smith et al., Med Eng Phys 2004; the pericardial
    amplification in Janicki & Weber 1980 and Santamore & Dell'Italia 1998. Its measured share is 0.7 mmHg, because
    the pericardium already pins the total volume of the slack, underfilled ventricles.
  - **RV coronary balance.** It now averages the beats of the last 6 s instead of the last beat, so the deep breaths'
    pleural swing is no longer sampled into an ischaemic debt.
  - **A3 cue-card path.** Pulse loss is at 464 s (was 471), the PEA state at 473 (472), drainage at 603 (602) and
    ROSC 96 s after drainage (96).
  - **Showcase tamponade bands re-centred, same tolerances.** The card's 1-Hz pulsus is 2.4 / 4.0 mmHg mean / max
    (was 0.9 / 1.6). The post-ROSC single-beat systolic peak is 217 (was 199). In the early-drain branch the systolic
    at drainage is 51 (was 60) and the post-drain peak 138 (was 155); it still keeps its pulse.
  - **Known misses.** The pulsus known miss is removed.
- Showcase MH card (E119, E121; card only, no engine change): a real induction sequence, one instructor button per
  step: awake on room air → premedicated (midazolam 2 mg, fentanyl 100 µg) → preoxygenated (100 % O₂ by face mask) →
  induced (propofol 2 mg/kg, then succinylcholine 1.5 mg/kg; the MH condition starts here; the masseter note stays) →
  intubated (ventilator 12 × 500, PEEP 5, FiO₂ 0.5; sevoflurane 2 % at 2 L/min) → surgery (rocuronium) → the
  unchanged early signs … CPR chain. Oxygen is never implicit: induced without "Preoxygenate", SpO₂ is 90 % at the
  induction and 63 % when the tube goes in 60 s later (99 % with it). On the kit-round path (succinylcholine at 4:00)
  the early signs come 4 min 32 s after the succinylcholine (was 6:52: the premedication and the apnoea leave the CO₂
  up), the established crisis at 19:04 and VF at 44:32 after it as before. The fentanyl premedication gates the E117
  sympathetic term: HR at the established crisis 126 (was 166), the early path's HR peak 86 (was 122). Objectives,
  take-home lines and their Persian entries are unchanged; the Explore baseline at 1:00 is now the awake patient (ART
  M, SVR and CMRO₂ read down at the late call).
- Showcase haemorrhage card (E120, E121; card only): the owner's course, class IV bleeding on room air → oxygen and
  the ventilator from the card's steps → PEA on a junctional rhythm (≈ 11:00) → asystole untreated (≈ 4.5 min later)
  → CPR with bag ventilation, 2 L warmed crystalloid, 2 units of red cells and epinephrine → VF at the first pulse
  check → shock. The card sets the junctional rhythm and VF; the pulse loss, the PEA decay to asystole, the CPP (19 at
  1 min of CPR, 28 at the pulse check), each shock's outcome and the ROSC are the model's. With the app's engine seed
  the first shock ends VF in asystole (the outcome table's draw is the same whatever the timing), so VF returns at the
  second pulse check (card) and the second shock leaves an organised rhythm; the pulse returns 63 s after it. Without
  the ventilator step the patient compensates (systolic ≈ 76) and does not arrest. No take-home lines yet (the owner
  writes them).
- CI: the e2e jobs run in the official Playwright container (`mcr.microsoft.com/playwright:v<version>-noble`, the
  version read from the lockfile), which carries the browsers and their system libraries, so no job runs
  `playwright install --with-deps` (its apt step stalled up to 40 min on the runner's Ubuntu mirror). The
  `@known-flaky` tests run on WebKit in a separate non-blocking job, `e2e-quarantine (webkit)`, whose report is
  uploaded and whose job summary gives their pass / retry-only / failed counts; the gating `e2e (webkit)` job runs
  every other test with the existing retry rule, and `e2e (chromium)` still runs every test, enforced. No test
  changed. See `docs/gates/stage-14.md`, "The known-flaky WebKit quarantine".

### Fixed

- Debrief timeline and log (F29): a bag-mask ventilation event printed "PEEP undefined cmH₂O" (the healthy
  induction's "Bag-mask ventilate, FiO₂ 1.0"). The words now follow what the engine applies: bag-mask ventilation has
  no PEEP in the model, so it prints PEEP 0 whatever the event says; a ventilator event without a PEEP keeps the
  ventilator's previous PEEP, so its line leaves PEEP out. The Persian handout table has the new line (reviewed: false).
- Saadat-like tiles on the Instructor view (pass 3, the owner's 2026-10-23 review at the demo laptop's window, monitor
  pane ≈ 1430 × 820): the split tiles were classed `row`, which the app's own `.row { display: flex }` also styles, so
  the EtCo2/FiCo2/AWRR and BFI%/BS%/SQI%/EMG% parts packed together ("EtCo2 mmHg" ran into "FiCo2", SQI% into EMG%) and
  the AWRR limits printed over the AWRR label. In the grid, split tiles are now `split-row` / `split-column` (a phone in
  portrait keeps its F28 layout); each part is a head over its value with its limits in a narrow column, and a part that
  is short of width puts its unit under the label and then shrinks its limits (and, last, a 3-digit value), measured
  from the part's own width (no text overlaps at the owner's pane, at a 1000 × 800 pane, or at any size from 1024 × 640
  to 1920 × 1080).
- The RR tile (no capnograph) is set, in the grid, exactly as the EtCo2 part that replaces it: same label, digit and
  limit type, colour and place (rule O4).
- The T column: each label over its limits, the value right-aligned beside them, "°C" in the title row. IBP1: the value
  and the bracketed mean in one row; the systolic, the slash and the diastolic each over its own limit pair. NIBP: "mmHg
  NBP inflating" no longer wraps out of the tile while the cuff runs.

## [1.0.0-rc.3] - 2026-10-23

Third public **pre-release** (release candidate) of a teaching simulator. It is for education only: it is not a
medical device and it is not clinically validated. It is not the final 1.0.0: the calibration pass and the blind
realism review have not run. The known limitations listed under 1.0.0-rc.2 and 1.0.0-rc.1 still apply, except where
this section says otherwise.

### Added

- Optional skin keys (`pme-skin/1`; a skin without them draws as before): `co2.fill`, `co2.displaySmoothMs`,
  `ibp.scaleLineColor` and `layout.laneText`. `ibp.scaleLines` is now drawn. See `packages/skins/CONTRACT.md`.
- Optional skin keys for the Saadat-like tiles and header (a skin without them draws as before): `layout.headerStyle`,
  `layout.showAlways`, `alarms.messageBar.rotateS`, `alarms.limitsDisplay`, `alarms.limitsColor`, `hr.statusColor`,
  `nibp.applyAtStart` and the tile keys `label`, `unit`, `weight`, `italic`, `split`, `parts`, `status`, `limitsLayout`;
  `glyphs.noValue` and `glyphs.inop` may be empty. See `packages/skins/CONTRACT.md`.
- Engine: `nibp` events carry the cuff's optional `mode` and `intervalMin`, and a `nibp manual` action turns auto
  cycling off without aborting a running measurement.
- Classroom kit: Windows launchers, `Start Classroom.cmd` and `Start Simulator.cmd` (UNTESTED ON WINDOWS at this
  release; the owner's 10-line test checklist is in the kit's `READ ME FIRST.txt`, section WINDOWS). They need Node.js
  22 or later on the PC and run `server/launch.mjs`, which does what the macOS `.command` launchers do (first free
  port, the address, the browser, Ctrl+C or closing the window stops the server). For Windows, the relay and the kit's
  `serve.mjs` now test "inside the app folder" with `path.relative` (the `'/'` prefix test refused every file on
  Windows paths), and the QR code's address list puts a Windows Mobile hotspot, Wi-Fi and Ethernet before Hyper-V,
  WSL, VirtualBox, VMware and Bluetooth adapters.
- Take-home lines (`takeHome`, three each) on the tamponade, malignant hyperthermia and bronchospasm cards, in the
  owner's confirmed words (2026-10-21): the learner handout prints them instead of the blank lines. Their Persian
  versions are in `docs/showcase/i18n/fa-debrief.json` (group `takeHome`) as unreviewed drafts (`"reviewed": false`) for
  the owner's review; the Persian handout script does not print the learner handout yet.
- Classroom kit `READ ME FIRST.txt`: a "Room network" section (a dedicated travel router in router mode, DHCP on, no WAN
  cable, client/AP isolation off, one network name on both bands; the presenting Mac joins it before "Start
  Classroom"; two suggested units, whose listed client counts are vendor maximums).

### Changed

- The Debrief report and the learner handout print in a bundled font, Inter 4.1 (SIL OFL 1.1; the Latin subset,
  variable weight, 47 KB, NOTICES N-016), so a printed page measures the same on every platform: before, the system
  font stack printed the MH report's page 1 ≈ 5 mm taller on Linux than on macOS. Only the print rules use it (the
  screen is unchanged); the Debrief view loads it on opening, and its two print buttons wait for it.
- The learner handout's course strip prints at the full page width with shorter lanes, so its labels read at 6.4 pt
  (were ≈ 3.2 pt) and the strip is ≈ 40 mm high (was 30 mm); the strip's label column is wider in both copies so
  "ART M / NIBP M" no longer runs into its scale values.
- FX-23 (the owner's review of the fast-forward on rc.2): during a fast-forward the panel shows the double chevron inside
  a ring of the same amber, the ring and the icon blinking together, with no running clock beside it; the progress bar
  no longer shows the start and end times; the muted-sound icon stands alone, without the words "sound muted" (a screen
  reader still hears them). After it, the banner is about 25 % larger (text and padding, same place) and reads on three
  lines: "Fast-forwarded 5 min", "00:08 → 05:08", and the alarms during it with their times or "No alarms"; the
  wording lives in one function, `fastForwardDoneLines` in `apps/demo/src/app/fast-forward.ts`.
- Saadat-like: the area under the capnogram is filled yellow, as on the real unit.
- Saadat-like: the small heartbeat ripple on the capnogram's plateau is drawn softer and fainter (about half its
  height), as the owner asked. Only the drawing changes: the CO2 signal and the EtCO2 number are the same.
- Saadat-like: the IBP lanes have dotted lines at their upper, middle and lower scale values, and print the middle value.
- Saadat-like: the lane text is white; wave labels and the sweep speed of every lane sit at the right of the lane; the
  CO2 scale reads "50mmHg"; the second ECG lane has no label while it shows the same lead as the first.
- Saadat-like: the IBP lanes sweep at 25 mm/s (was 12.5), as in the owner's photo.
- Saadat-like: the colours are those of the owner-approved mock-up of the photo (greener ECG, purer yellow CO2, lighter
  pink IBP1, brighter blue IBP2, violet SpO2 and pleth, slightly blue-white text).
- Saadat-like: every alarm limit the monitor carries is shown in small red beside its value, ON or OFF; the IBP limits
  sit in one row under the value.
- Saadat-like: the tiles carry the photo's labels, units and weights; the CO2 tile is split EtCo2 | FiCo2 | AWRR, the
  temperature tile T1 / T2 / DT and the depth tile BFI% / BS% / SQI% / EMG%; an unconnected probe reads blank, not dashes.
- Saadat-like: the PR tile names its rate source ("(ECG)", "(IBP1)", "(SPO2)") in that channel's colour, with a heart
  that blinks per beat and the PACE / ST / PVCs status lines.
- Saadat-like: the NIBP tile reads "119 / 90" with "(101)", the cuff's mode ("AUTO(5Min)") and the time of the result.
- Saadat-like: a two-row header (page, bed, patient category, date over a real-time clock; the message bar under them),
  and same-level messages rotate every 6 seconds.
- Saadat-like and its "Iranian ICU as found" preset: the NIBP starts on AUTO every 5 minutes with the patient; every
  other skin keeps its idle cuff.
- The free-play patient starts without the CO2 sampling line (RESP and RR shown); the Ventilator view attaches it.
- Saadat-like: the screen layout of the real unit (64 % wave area with the photo's lane heights, the header over the
  waves, a tile grid with the PR tile at the top edge and the narrow T column, and a full-width bottom strip with
  %SPO2, PI and the pulse-oximetry labels) (pre-release). Opt-in by the optional skin key `layout.grid`
  (`packages/skins/CONTRACT.md`); other skins keep their tile columns.
- Persian take-home lines: the owner approved the nine lines of the three showcase-2 cards (2026-10-22, three of them
  with his edits), now `reviewed: true` in `docs/showcase/i18n/fa-debrief.json`. The Persian Debrief handout
  (`scripts/showcase/debrief-fa.mjs`) prints a take-home section after the talking points, before the notes, as the
  English learner handout does: the card's lines in Persian, or three ruled lines when the card has none. Its title
  «نکته‌های کلیدی» is not yet reviewed, so the handout keeps its unreviewed notice.

- Saadat fidelity pass 2: the Saadat-like skin drawn as the owner's photo of a real unit (IMG_8113), row by row from the
  rc.3 photo review. Lanes: 18 px lane text, traces from x 0 (ECG) and x 18 (the others) with the text printed over the
  trace and the CO2 fill (no black boxes), the ECG label's parts and the scale values in their photographed columns,
  the right-hand texts 45 px in, no 1 mV bar, a 10 px erase gap, 2 px traces, the screen's 3.10 px/mm and a dotted
  line at the CO2 scale top. Tiles: bold labels at the photographed sizes (EtCo2 21 px; the PR label 41 px, regular), the rate source
  centred, the PACE/ST/PVCs lines spread down the PR tile, the NIBP mean 30 px and its mode centred, the T column, the
  CO2 parts and units, "( )" for a blank mean, the strip framed, %SpMet and SpHb in their photographed colours.
  Header: the rule under the first row, BED 01 white, the page box the full row high, no grey bar and no lamp while
  nothing alarms. Owner rulings:
  - E114: the Saadat-like parameter alarms are ON at power-on (`alarms.factoryEnabled: true`); a crossed bell shows
    only beside an alarm that is off (ST and PVCs analysis are off). The `iran-icu-as-found` preset keeps them off.
  - E115: limits the tiles print and the alarms honour: HR 150/50, SpO2 90, NIBP 160/90 and 100/50, EtCO2 50/30 mmHg
    (the `EtCO2` key, was `EtCO2_pctV` 6.5/2.6 %V), AWRR 30/5, arterial line 165/70 and 100/35, T1 and T2 39.0/35.0.
  - E116: the second ECG lane repeats lead II (`ecg.laneLeads: ["II", "II"]`).

  New optional skin keys (a skin without them draws as before; a phone in portrait keeps the rc.3 lane chrome):
  `layout.laneText.fontPx`, `gutterPx`, `rightInsetPx`, `ecgLabelX`, `scaleX`, `labels.<lane>.leftInsetPx`; `layout.grid.labelPx`, `labelWeight`;
  `sweep.pxPerMm`; `co2.scaleLineTop`; a strip field's `color` may be a hex. See `packages/skins/CONTRACT.md`.

### Fixed

- README: the classroom kit no longer reads as untested with a real phone. The owner ran it with one real phone over
  his Mac's hotspot through the six showcase cards (2026-10-18); a room full of phones is untested, and the README
  points to the kit's "Room network" section. It also names the Windows launchers (untested on Windows).
- `docs/guides/known-deviations.md`: a section for this week's browser-test evidence, one row each: PR #106 (the FX-24
  follower e2e judged on the phone's own clock), PR #108 (the Debrief and FX-25 e2e on the loaded CI WebKit runner),
  PR #109 (the print-font check waits for the view's own font load), `vent-view-new-patient` (`@known-flaky` on
  WebKit, 3/3 on main `cd9195f8`), the "a retry is not a pass" rule (enforced on Chromium, warn-only on WebKit until
  the demo of 28 October), and the hidden-tab pause (owner ruling E82: kept for the demo, a proper fix later).
- FX-25: attaching the CO2 sampling line (on the instructor's Devices tab, or by the Ventilator view when it starts
  ventilating) painted the CO2 lane, within a second, from its left edge to the sweep cursor with the first moments of
  the capnogram drawn over and over side by side; on a ventilated patient with the Saadat-like fill that was a solid
  yellow block, which stayed until the sweep came round. The engine's CO2 history starts at the attach, and the lane
  read back past that start. The lane now starts blank at the attach point and draws the capnogram from there at the
  sweep speed, filled or not, on every skin; any waveform whose sensor is attached later (an arterial line, say) takes
  the same path. Only the drawing changes: the CO2 signal and the EtCO2 number are the same.
- CI: the two Debrief B browser tests wait, up to 10 s, for the Debrief view's own load of the bundled print font
  before measuring print heights and asserting the font is loaded; the MH test measured 2.6 s in, before that load had
  finished, and passed only on a retry on Chromium (main run 39598457184). The test never loads the font itself.
- CI: the Debrief and FX-25 browser tests hold on the loaded CI WebKit runner, which failed them on all three attempts
  with no product change (PR #97 run 39338820903; PR #105 runs 39524573921 and 39534643448; PR #107 run 39578631031,
  attempts 1–3; Chromium passed every test there). On CI WebKit only, the Debrief's two live runs (the anaphylaxis card
  and the free run) go at ×2 instead of ×4, wait on the page's own clock or for times scaled to the speed, and open the
  Debrief only once the host has acknowledged a pause (the button reads "Resume" before the host answers); the click is
  then checked to have been followed, and the heading to be drawn, within 30 s. FX-25's "drawn within 2 s" and "a breath
  by 4 s" are judged on the page's sim time, each column dated back from the sweep cursor, because that runner's first
  capture came 2.5–3.2 s after the click while the trace had begun ≈ 1 s after it. Every assertion is kept; local WebKit
  and Chromium run as before. See `docs/guides/known-deviations.md`, "Browser tests held on the loaded CI WebKit runner".
- CI: the tick benchmark (`packages/validation/test/perf/tick-bench.test.ts`) runs alone, in its own build-job step
  after `pnpm test` (`PME_TEST_SET=fast` now leaves it out and `PME_TEST_SET=perf` runs only it; a local `pnpm test`
  still runs it), and asserts the 6 ms p50 budget on the best of three 10-s samples. Inside `pnpm test` the other
  suites' load failed it with the engine unchanged (p50 6.56, 7.74 and 8.42 ms on 2026-10-20; 7.26 and 7.20 ms on a
  main run and its re-run). A real engine slowdown raises every sample and still fails; the local 2 ms bound stays on
  one sample.
- FX-24: right after a fast-forward, and when it joined, a learner's phone or second screen drew its waveforms squeezed
  for up to 0.75 s (the first beats after the jump drawn over and over, at 5–24 times the sweep speed) and the ECG gain
  label jumped to X4 for about 2 s. The follower restores the instructor's snapshot at those moments, and a restore
  starts the waveform history afresh; the lanes and the ECG auto-gain read back past its start. The lanes now draw from
  the jump on at the normal speed (the part before it stays blank until the sweep comes round), the ECG gain stays what
  it was (across a resize of the monitor too, which the phone does at the end of a fast-forward; the auto-gain then
  re-judges it), and a monitor that has just joined keeps its skin's gain until it has 4 s of signal to judge, as at any
  start. A bookmark restore on the instructor's own monitor takes the same path and is fixed with it.
- FX-23: after a fast-forward a thin vertical line with the new time ("05:08") was drawn across every lane, including
  empty ones, each at that lane's own sweep position (so the CO2 and IBP lines sat apart from the ECG and pleth ones).
  The lanes now simply carry on, as a monitor would: no line, no label, no gap. The clinical log keeps its
  fast-forward entries.
- FX-19: the NIBP "next m:ss" countdown could read 'next 3:60' just after a cuff deflation.
- FX-14 / FX-15: when the instructor's tab was hidden, Safari suspended it after about 4 minutes; the phones then said
  "The instructor's monitor is not answering", and on return the hidden minutes were lost (the engine worker's first
  frame clamped the gap to 250 ms before the page's catch-up ran). The instructor's page now pauses the session while its
  tab is hidden (the Pause button's own command, so phones show "(paused)") and resumes it on return with a toast
  "Paused while this tab was hidden (m:ss)". A session the instructor paused stays paused; a reload or a closed tab
  sends no pause; a hide during a fast-forward sends none either (the host refuses commands then); learner pages are
  unchanged. The policy is one switch, `HIDDEN_TAB_POLICY` in `apps/demo/src/app/hidden-tab.ts`, pending the owner's
  question E82: `'pause'` by default; `'continue'` does nothing on hide, and the clock then credits the hidden span in
  full on return, as a jump without a fast-forward banner. The monitor's clock credits a frame gap over 1 s
  (`STALL_MS`) in full, as a hidden stretch, instead of clamping it to 250 ms.

- **F28: the Saadat-like learner monitor on a phone held upright.** At a phone's real visible height (Safari with its
  toolbars, 390 × 664) the six lanes get ≈ 30–41 px each and the owner's photo showed overprinted IBP scale values, lane
  labels ("NORMAL", "IBP", "RESP") erased by the speed text's cleared box, the NIBP header running into IBP1 and an empty
  grey box in the header. Fit guards, measured by the ink of a 14 px glyph: the middle IBP scale value is left out on
  lanes under 60 px and the bottom one moves down to clear the top one under 35 px; a lane's second line goes under
  55 px and its speed text under 40 px, the label always stays; a portrait tile header wider than its tile drops its unit
  and shortens "AUTO(5Min)" to "AUTO 5min"; a phone's message bar is painted only when there is a message. Landscape
  lanes are ≥ 77 px, so the instructor's screen is unchanged (pixel comparison in `docs/gates/f28/`); at 390 × 844 every
  lane text is still drawn.

### Known limitations

- Windows launchers (`.cmd`): untested on Windows at this release.
- The classroom kit (the app, the relay for learners' phones and the launchers) is still built from a source checkout
  with `node scripts/showcase/make-bundle.mjs` (Node.js ≥ 22); it is not a release asset of this release candidate.
- Not run at this release: the two release-checklist runs of `RELEASE.md` — the 600 s tick-cost gate on an idle
  machine (item 8) and the 10-minute soak with a busy Ventilator view and a paired Remote (item 9).
- Browser coverage as for 1.0.0-rc.2: on the WebKit CI runner a test that passes only on a retry is still recorded
  as a warning, not a failure, until the demo of 28 October (docs/gates/stage-14.md, "Temporary relaxation");
  Chromium still fails on it. Tests that passed only on a retry are listed in docs/guides/known-deviations.md.
- A hidden instructor tab pauses the session and resumes it on return (owner ruling E82); this replaces the FX-15
  limitation listed under 1.0.0-rc.2. The proper fix, a session that keeps running while the tab is hidden, is for a
  later release.
- The Persian Debrief handout prints the owner-approved take-home lines; its other terms are drafts marked unreviewed
  until the owner's term review.
- The owner's checks: this release candidate gets a smoke check after the tag, recorded in the repository's gate
  notes.

## [1.0.0-rc.2] - 2026-10-20

Second public **pre-release** (release candidate) of a teaching simulator. It is for education only: it is not a
medical device and it is not clinically validated. It is not the final 1.0.0: the calibration pass and the blind
realism review have not run. The known limitations listed under 1.0.0-rc.1 still apply, except where this section
says otherwise.

### Fixed

- The Persian Debrief handout (`scripts/showcase/debrief-fa.mjs`) prints the release footer in Persian: not a medical
  device and not clinically validated, with the version (new required `--version` flag) and the build.
- FX-13: a Debrief span could read '1 min 60 s'.
- FX-18: single-key shortcuts fired while typing in the Debrief notes (a contenteditable field); the letter i toggled the instructor view.
- FX-16: at ×4 a following phone played only about half of the heartbeat beeps (the beep gate read its steered clock rate, up to 10 % above the session speed); it now reads the session speed, so the phone beeps with the host.
- FX-16 (owner's ruling from the Saadat skin audit): the heartbeat beep is now 1245 Hz at SpO2 100 % (was 880 Hz, the pitch of the alarm pulses), 100 ms long (was 60 ms) and square-like (a 3rd harmonic added), as measured on the real unit; the SpO2 pitch shift is unchanged (0.1 semitone per %), so the beep stays above the 880 Hz alarm pitch down to SpO2 40 %. When beats come fast (a tachycardia at ×4) a beep lasts at most 60 % of the beat interval, so beeps never run together. Alarm tones are unchanged.
- FX-20: notes typed in the Debrief right after opening the app on it were emptied by the next refresh.

### Changed

- `saadat-like` skin matched to the owner's photos of a real unit (research/34 Tuesday set): CO2 lane at 6 mm/s on a 0–50 mmHg scale (values above 50 clip; the number does not), lanes ECG, ECG, CO2/RESP, IBP1, IBP2, pleth, IBP2 mid blue #6C9CF8, technical-message bar pale cyan with grey text; the `iran-icu-as-found` preset inherits the capnogram, IBP2 and message-bar changes (it keeps its own lane order).
- Debrief redesign A: the report opens with a header band (the case, the patient, the simulated and wall-clock spans,
  the date, Run by); the verdicts read ✓ Observed, ✗ Not observed, – Not assessable and ◆ Discuss (a structural lesson,
  `"debrief": "discuss"`), and a rule-less objective ticked by the instructor reads ✓ Observed with its tick time; the
  trend charts carry event marks (■ team, ● patient, │ scenario) with a legend in words; a talking points box (four
  fixed debriefing prompts) sits before the notes; drugs, the timeline and bookmarks share a page and set-up rows print
  grey. The JSON export is `pme-debrief/2` (adds the version, `discuss`, the tick time and the measured interval); the
  Persian handout reads `/1` and `/2`. Scenario objectives may carry
  `"debrief": "recognition" | "discuss"`; the malignant hyperthermia card gains a hand-ticked recognition objective.
- Debrief redesign B: page 1 reads the key times (up to six tiles: the instructor's recognition tick, the start to
  the first team action, each objective's measured interval against the time asked, the pulse loss to CPR, the time
  pulseless), the course (HR, MAP, SpO₂ and EtCO₂ on one time axis with the numbered key moments and the pulseless
  spans) and the objectives with their intervals drawn; page 2 lists the key moments with HR, MAP, SpO₂ and EtCO₂ at
  that second and the alarms since the moment before (SpO₂ prints "–" while there is no pulse: the oximeter has no
  reliable reading then); the trend charts carry the same numbered moments. A learner handout prints on its own page
  from its own button, with no marks: the course, the key moments, three questions to think about and the take-home
  lines. The `pme-debrief/2` export now fills the key times and key moments. Scenarios may carry `takeHome` (up to three
  lines the handout prints as written); no shipped card has them yet.

### Known limitations

- FX-15 (with FX-14): in Safari a hidden host tab is suspended, so the host simulation pauses (the scenario clock does not advance) and a following phone loses the session (owner's hand check H19, 2026-10-18). The fix is for a later release; until then keep the host tab visible and frontmost.
- The classroom kit (the app, the relay for learners' phones and the macOS launchers) is still built from a source
  checkout with `node scripts/showcase/make-bundle.mjs` (Node.js ≥ 22); it is not a release asset of this release
  candidate.
- Not run at this release: the two release-checklist runs of `RELEASE.md` — the 600 s tick-cost gate on an idle
  machine (item 8) and the 10-minute soak with a busy Ventilator view and a paired Remote (item 9).
- Browser coverage as for 1.0.0-rc.1, with one temporary change: on the WebKit CI runner a test that passes only on
  a retry is recorded but no longer fails the run (docs/gates/stage-14.md, "Temporary relaxation"); Chromium still
  fails on it. Tests that passed only on a retry are listed in docs/guides/known-deviations.md.
- The owner's hand checks of 2026-10-18 ran on 1.0.0-rc.1 builds (docs/gates/stage-8b.md §11): the hidden host tab
  failed (above); the others passed. This release candidate gets a shorter smoke check after the tag, recorded in
  the repository's gate notes.

## [1.0.0-rc.1] - 2026-10-18

First public **pre-release** (release candidate) of a teaching simulator. It is for education only: it is not a
medical device and it is not clinically validated. It is not the final 1.0.0: the calibration pass and the blind
realism review have not run, and the limits below are known.

### Added

- **ECG and rhythms:** a rhythm engine with 36 rhythms, recorded VF and AF textures (PhysioNet CUDB and MIT-BIH,
  ODC-By 1.0), 3/5/12-lead display and 12-lead capture, pacing.
- **Haemodynamics:** ABP, CVP and PAP waveforms, the NIBP cuff cycle, pleth.
- **Respiration and gas:** capnogram, the SpO2 chain with its lag, respiratory rate, temperature.
- **Device behaviour:** measured numerics with averaging and lags, probe states, IEC-style, traditional and Saadat-style
  alarm sounds (no IEC 60601-1-8 compliance is claimed), pacer and defibrillator, trends and an event log.
- **Skins:** six data-only monitor skins (`saadat-like`, `philips-like`, `zoll-like`, `ge-like`, `mindray-like`,
  `lifepak-like`), two themes and one preset, each value with its provenance.
- **Control:** commands and transports (in-process, postMessage, BroadcastChannel, WebSocket with a relay, and WebRTC,
  which is tested only against a simulated peer connection and in Chromium), an instructor panel and the
  `pme-scenario/1` scenario runner.
- **MODELED physiology** (a teaching model; see Known limitations): four-chamber circulation, two-compartment lungs and
  gas exchange, blood and acid–base, brain, kidney and liver, endocrine and thermal state, depth of anaesthesia,
  ventilatory drive and neuromuscular block, and the pharmacokinetics and pharmacodynamics of 65 drugs.
- **The one-page clinical teaching app** and **time control**: up to ×8, and a 2- or 5-minute fast-forward.
- **Scenarios:** six Showcase cases and a ventilator bronchospasm case; eleven further cases in the library are marked
  "Draft" (not yet reviewed clinically).
- **The Hamilton-style ventilator** (no affiliation with any manufacturer) and its two-way link with the engine.
- **Validation tooling:** the validation harness and the blind-review tool.
- A script that prints the Debrief's JSON export as a Persian (right-to-left) A4 handout (`scripts/showcase/debrief-fa.mjs`); not an app feature, and its translations are not yet reviewed.
- **Second screen:** a learner monitor following on a second screen in the same browser.
- **Learners' phones:** phones follow the instructor's monitor, read-only, over a classroom relay on the instructor's
  computer. The relay comes in the classroom kit built from a source checkout (`node scripts/showcase/make-bundle.mjs`;
  Node.js ≥ 22; double-click launchers for macOS); it is not a release asset. Not yet tested with a real phone (see
  below). A static copy of the app, for example on GitHub Pages, cannot pair phones.
- **Debrief:** a report of the run, printed to PDF by the browser.
- **Fixes:** the Ventilator view after "Return here" on slow WebKit, commands always answered or refused, alarm
  controls that follow the skin, the scenario library staying open until a scenario loads.
- The single-file IIFE `patient-monitor.iife.js` (the engine ships once; ≤ 400 KB gzipped, checked in CI) and the
  `file://` ventilator + monitor embed.
- Publishable ES module packages with type declarations; TypeDoc API reference; embedding, scenario-authoring and
  skin-authoring guides; physiology overview, validation summary and known deviations.
- CI: dependency-licence audit (with every shipped licence text in `LICENSES/`), IIFE size budget, pack smoke and
  TypeDoc build; a release workflow that attaches the IIFE, the embed, the API reference and the licence texts to
  GitHub releases.

### Changed

- The malignant-hyperthermia scenario's ventilation objective now reads "hyperventilation kept until EtCO2 < 40 for
  2 min, then normalised", checked by a new objective rule kind, `heldThen` (#69).

### Known limitations

- For education only. Not a medical device and not clinically validated; never connect it to a patient or use it for
  clinical decisions.
- The MODELED physiology is a teaching model with open calibration items: see
  [docs/guides/known-deviations.md](docs/guides/known-deviations.md).
- Validation: in the report regenerated on the release tree, 27 of 156 graded rows are outside their evidence band by
  30 % or more (🟢 96 · 🟡 33 · 🔴 27; 60 rows in the calibration queue), and the blind realism review has not been
  run, so the 1.0 acceptance criteria "V1–V9 pass" and "realism review" are not met; see
  [the validation summary](docs/guides/validation-summary.md).
- The evidence bands are themselves under review: an audit of 209 test targets found about one band in five right as
  written (46 of 209); against the evidence, the engine's value was inside in 90, partly inside in 31, uncertain in 13
  and a real miss in 75. Some passing tests hide misses. The bands are corrected in the calibration pass, before the
  model.
- The heart-rate rows of the validation documents (haemorrhage classes, warm septic shock, phenylephrine reflex,
  Cushing) read exactly 75 bpm because the validation runner holds the baseline rate: they do not test the
  heart-rate response (a harness defect, not yet fixed).
- There is no decompensation or reflex-collapse model: shock does not progress by itself to collapse (an awake patient
  who loses half the blood volume settles at a mean pressure of about 63 mmHg), and no reflex takes the heart rate
  below 30/min or stops the heart.
- No sepsis model fit for teaching: the `sepsis` condition exists, but its course is incomplete — under general
  anaesthesia the core temperature stays near 36.6 °C where the band asks for 38.5–41 °C at 90 min; no sepsis scenario
  ships.
- Pulsus paradoxus is not reproduced (no ventricular interdependence).
- No neuraxial (spinal or epidural) block haemodynamics, and drugs are given intravenously only (other routes are
  refused).
- In MANUAL mode the displayed arterial pressure cannot be set below about 65/30 mmHg (a target of 18/10 shows 65/30).
- Adults only: no paediatric or obstetric physiology.
- Snapshots (`pme-snapshot/1`) restore only into the build that saved them; another build refuses them ("snapshot is
  from engine version …"), so every screen of a classroom must come from the same build.
- When the engine runs under Node.js, the environment variables `PME_VAG_EMAX`, `PME_VAG_F` and `PME_VAG_R`, if set,
  change the vagal effect of fentanyl and remifentanil (a tuning hook left in the shipped code; in a browser only a
  page that defines a global `process.env` is affected). It is removed in a later release.
- Browser coverage: automated browser tests run in desktop Chromium and WebKit (Playwright); Firefox is not tested.
  On the WebKit CI runner 38 of 111 browser tests are skipped: five because the 2-vCPU Linux runner is too slow for
  them (the second screen, time control at ×8, two phone tests, the Ventilator view after "Return here"; they passed
  on macOS WebKit when they were written and were not re-run on WebKit for this release), the rest because they are
  long or evidence runs kept to Chromium. Real Safari is left to the hand checks below, which are not done yet. Tests
  that passed only on a retry are listed in [docs/guides/known-deviations.md](docs/guides/known-deviations.md).
- A ventilator window opened on its own (`vent-hamilton.html?link=v<code>`) no longer joins a running session: the
  Ventilator view now links its cockpit over a direct frame port. The app's own Ventilator view is unaffected.
- Pairing is for a trusted local network: anyone with the room code can act as a controller, and a peer that knows the
  host's id can take over the relay's host slot. A host-issued controller token and a host reconnect key come with a
  later release. The relay's drop log has no rate limit (a later release).
- Not yet checked by hand at this release, so not verified: learners' phones on a real phone; the Ventilator view
  keeping a bronchospasm patient ventilated while another view is shown; the Debrief's print preview in Safari and
  Chrome; the fast-forward look and the second screen in real Safari; the hidden-tab watchdog; the `file://`
  ventilator embed opened by double-click in real Safari; and the two release-checklist runs of `RELEASE.md` — the
  600 s tick-cost gate on an idle machine (item 8) and the 10-minute soak with a busy Ventilator view and a paired
  Remote (item 9).
- Licence questions open: whether the attribution in `NOTICES.md` and the build banner is sufficient for the ODC-By 1.0
  ECG templates bundled in this MIT-licensed code has not had a legal review; PTB-XL (used only for a report-only
  comparison, nothing bundled) is recorded as CC BY 4.0 per its PhysioNet page, not yet confirmed by a lawyer.
- The ES module packages are publishable but not on npm at this release candidate (build from source); the `@pme/*`
  package names are provisional until a first npm publish. No DOI yet (planned for 1.0.0).
- Development history (stage and review names) still appears in source comments, test titles, file names and parts of
  the documentation, and a few developer pages are leftovers; a clean-up follows this release candidate, then the
  calibration pass and the realism review.

[Unreleased]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.3...HEAD
[1.0.0-rc.3]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.2...v1.0.0-rc.3
[1.0.0-rc.2]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.1...v1.0.0-rc.2
[1.0.0-rc.1]: https://github.com/samhv-dev/patient-monitor-engine/releases/tag/v1.0.0-rc.1
