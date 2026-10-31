# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/):
the public API is what the packages export (see the API reference), the `pme-scenario/1`, `pme-snapshot/1`,
`pme-skin/1`, `pme-preset/1` and `pme-theme/1` document formats, and `window.PatientMonitor`.

## [Unreleased]

### Added

- **Instructor v2 (E127) as a second view** beside today's Instructor view, at `#/teach2` ("Instructor v2" on the
  rail, right after Instructor). Today's view is unchanged and stays the default: the scenario deep link, the
  Scenarios view's Load and the other "Instructor view" links still open it; the alarm count and the reveal gesture go
  to the Instructor view used last. Built from the design `docs/plans/instructor-panel-redesign.md` (agreed 29
  October) and its plan `docs/plans/instructor-panel-v2-plan.md`: its own session bar in place of the app's top bar
  (the patient line, MODELED, the case title, the clock pill that pauses and resumes, the speed box, then the top
  bar's Sound switch and Room code with the phone count); the stage strip (hop states folded in; a past stage returns
  to its start through a hidden mark the host places at every stage entry, behind one confirm; a future stage jumps
  behind today's confirm; exactly five chips with full names, the two stages before the current one, the current one
  and the next two ordered from it, branches as "or", the rest behind "‹ n earlier" and "n later ›" arrows that page
  the window, "back to now" recentring it); STATE (the cue box: the stage, the time in it, how it was entered, the
  card's `notes` as the Say line, the values held; a Fast forward box with +2 and +5 min, disabled while paused; the
  learners' monitor at a reduced size, Swap to full size; an alarm line with the count and the sounding alarms that
  opens the alarm list); STATE and ACTION are two lifted panels; ACTION (one list: the card's steps numbered 1–9 in
  the card's order, the judged objectives, the automatic rows with how near their rule is; a step whose condition is
  not met stays pressable, faded; overdue, taken, out of order and failed are looks, never locks); sheets over ACTION
  (Drug, Airway, Defib · CPR, Vitals, Devices, Patient, Log; today's tab bodies inside the frame) with a cache of
  staged items delivered at one engine instant as one log line; marks with kinds (good, bad, discuss) and a note
  field. Keys: 1–9, D, A, F, V, Enter and S inside a sheet, Space, Esc, Shift+S/P/N. Every row sends exactly what
  today's button sends, and the MH and haemorrhage cards give the same course and the same Debrief verdicts through
  either view (kit round A4, Chromium and WebKit). The Debrief gains a "Steps on the card" section (each step's due
  order, time taken, order taken and status, read the way ACTION reads it), the marks' kinds and one timeline line per
  staged delivery; the export stays `pme-debrief/2` with the additive keys `steps`, `judged` and `marks` and the rows'
  `tr`, `by`, `markKind`, `note` and `batch`. `@pme/controller`: `CommandBase.batch` and `StageBuffer.commit(send, {
  batch: true })`, `kind` and `note` on the scenario bookmark, `ScenarioDriver.vitalHolds()` and
  `ScenarioDriver.stageMarks()` (opt-in: the `stageMarks` option or `markStages(true)`, which Instructor v2 calls on
  the host when it is shown). Not built: the phone layout (design §6), the Gas sheet, the CPR takeover and an onset
  ramp for delivered items. The Drug sheet's rule for a dose that differs from the card's step is interim, pending the
  owner's ruling.

### Fixed
- Malignant hyperthermia now warms the core: the MH sympathetic surge constricts the skin. Untreated on the MH card the
  core showed 36.5 °C at 15 min and 36.9 °C at 35 min (the owner's run of 30 October): the 140 W of MH heat was real,
  but under anaesthesia the core-to-skin conductance stayed fully dilated and the periphery took up about as much heat
  as the crisis made. In an MH crisis the circulating catecholamines reach about 20 times normal and constrict the
  skin directly, whatever the anaesthetic has done to the hypothalamic threshold (Sessler, Anesthesiology 2008; Gronert
  et al., Anesthesiology 1978); the skin is mottled (European MH Group, 2024). The conductance now falls with the MH
  sympathetic drive from its anaesthetised value (48.9 W/°C at 70 kg) toward the two-node model's maximally
  constricted value (10.8 W/°C; Gagge et al. 1986), and dantrolene's suppression of the surge re-dilates it. On the
  same path the core is now 37.1 °C at 15 min and 38.0 °C at 35 min; "established" (38.5 °C) comes about 46 min after
  the succinylcholine instead of about 103. Without MH nothing changes (the anaesthetised redistribution, the awake
  patient, the haemorrhage and anaphylaxis cards print the same numbers). Four MH test bands were re-centred for the
  owner's ruling, two expected failures are now met (resp-coupling's > 1 °C in 30 min, heat.test's dantrolene arm) and
  one new one is recorded (the hour after a VF imposed at 40.3 °C cools 2.3 °C against 0.5–1.5); the MH card's story
  text, the run sheet's temperature talk points and the cue cards still describe the old course.

- **MH card: Cool is offered only above 38.5 °C, the saline is refrigerated and the team stops it at 38 °C; the Log
  names the step pressed** (the owner's 120-minute over-treated run on the preview: core 34.4 °C after the Cool button
  had been pressed at any temperature). The card's four Cool steps are a press guarded by `tempCore > 38.5` (an `all`
  of a vital and the manual); the scenario runner now refuses a press whose guarding vital does not hold ("not offered
  now: needs tempCore > 38.5") instead of keeping it to fire later (events in an `all` still latch as before). The
  `fluid` event takes the fluid's own temperature `tempC` (0–42 °C; absent: the theatre's 21 °C, as before) and
  `stopAtCoreC` (30–42 °C), at which the blood model ends the infusion: the card gives 20 mL/kg at 4 °C (EMHG 2024
  "chilled (4-8 °C) crystalloids"; Rosenberg 2015 "normal saline at 4 °C") stopped once the core has fallen to 38 °C
  (MHAUS "Stop cooling when the temperature has decreased to <38°C"). From an established crisis on this build the 4 °C
  line removes 104 kJ in 727 mL and stops at 38.0 °C (the 21 °C line: 115 kJ over the whole 1.6 L, to 37.88 °C). The
  clinical Log's line for a step pressed reads "Scenario event: <the step's label>" (it said "Scenario event" only).
  The demo path never presses Cool: no band or printed number of the MH slow test moved.
- A second socket claiming an existing peer id can no longer block that peer's commands: the host keeps each peer's
  sequence and viewer role per transport, and counts a hello only after its sequence check, so a phone on the relay
  that says hello with the laptop panel's id leaves the panel's commands applied. The relay gives each peer id one live
  socket per session, for every role (it checked only a second host): it pings the socket holding the id and refuses
  the newcomer with a close code the client retries if it answers within 3 s, or closes it and admits the newcomer if
  it does not, so a phone whose network dropped or a reloaded instructor laptop gets back in; a live host can no
  longer be replaced by a socket that claims its id.
- Explore prints its rows in the engine's own unit: Endocrine glucose is the engine's mmol/L value (it showed the
  mg/dL copy as mmol/L) and the lab panel's glucose says mg/dL; Stress response is on its 0–100 scale (was labelled
  0–1); the gas model's awake resting VO₂ is labelled "VO₂ at rest (awake)" beside the actual VO₂, so Gas and Blood no
  longer show two different "VO₂"; a drug's Total is in that drug's amount unit (µg, mg, mL), not "mg, µg", and its
  Cp, Ce (also NMJ, diaphragm, ventilatory), infusion rate and TCI target rows print the drug's own concentration or
  rate unit (ng/mL, µg/mL, × ref dose; µg/min, mg/min) in place of "drug unit" and "per row", CSHT staying in min.
- Explore's Drugs page keeps its rows once more than 16 drugs have been given. Past 16, every per-drug row (Cp, Ce,
  rate, TCI target, CSHT, Total) left the page at once: the console dropped any engine list longer than 16, taking it
  for a history, and so dropped the list of drugs given. A list whose every item names its drug or agent is now kept
  at any length; a long list without names is still dropped.
- An IV drug or infusion command for a volatile agent (sevoflurane, isoflurane, desflurane, N₂O) is refused with the
  reason, the agent being given through the vaporiser. The engine used to accept the bolus and then stop with an error
  on the next tick, and to accept the infusion and do nothing with it.
- Explore's Drugs page no longer prints "per row" on five rows (rc.5 candidate round): a drug the engine gives no
  TCI model (dantrolene, midazolam, rocuronium, succinylcholine: only compartment-model drugs take a TCI) has no TCI
  target row, and a drug it refuses as an infusion (dantrolene, a curve row without an infusion reference) has no
  infusion rate row; they printed "—" with the glossary's placeholder unit. The glossary's tooltip for the rate and
  target rows names the units in place of "per row".

## [1.0.0-rc.4] - 2026-10-30

Fourth public **pre-release** (release candidate) of a teaching simulator. It is for education only: it is not a
medical device and it is not clinically validated. It is not the final 1.0.0: the calibration pass and the blind
realism review have not run. The known limitations listed under 1.0.0-rc.3, 1.0.0-rc.2 and 1.0.0-rc.1 still apply,
except where this section says otherwise.

### Added

- Instructor panel (E121b): an **Oxygen** control on the Airway & ventilation tab for the spontaneously breathing
  patient, since oxygen is never assumed (E121). Off (room air, the default), nasal cannula 1–6 L/min or face mask 5, 6,
  8 or 10 L/min, staged like every panel action (Stage, then Commit). It sends one `ventilation` event (source
  spontaneous) whose `fio2` follows the classic approximation of about 4 % per L/min, FiO₂ = 0.20 + 0.04 × flow
  (nasal cannula 24–44 %, face mask 40–60 %; Off = 0.21). The device and flow ride along as two new optional fields
  that are words only, `o2Device` ('none' | 'nasal' | 'mask') and `o2FlowLpm` (0–15; the engine validates them and
  the physiology reads `fio2` alone). The log and the Debrief's timeline print "Oxygen by face mask 10 L/min (FiO₂
  60 %)" and "Oxygen off: room air (FiO₂ 21 %)". A card's spontaneous breathing with a FiO₂ now prints it too
  ("Breathing spontaneously, FiO₂ 50 %" at the tamponade's arrival). The Vitals tab shows the patient's FiO₂ follow
  it. On a hypoxaemic patient (severe pneumonia) the face mask at 10 L/min raises SpO₂ from 78 to 84 % in 5 min.
  Persian Debrief entries added (reviewed: false). The control acts only while the patient breathes spontaneously with
  no airway device: on the bag, a ventilator (or the Ventilator view) or with a tracheal tube or supraglottic airway it
  is disabled ("FiO₂ is set on the ventilator / bag"), an oxygen already staged is taken back, and its spontaneous
  event is never sent (it would have taken the patient off the tube or the bag). For this the engine's 1 Hz `state`
  event carries a new optional `breathing: { source, device }` (source spontaneous / bvm / ventilator / none /
  external; device none / ett / sga).
- App pages (E123, owner ruling 2026-10-25: "the simulator should launch into a starting page"; E125, the owner's
  mockups and rulings of 2026-10-26): the simulator opens on **Home**, not on the monitor, and the monitor appears once
  a case is loaded or the Monitor view is opened. Home has the name, the line "Version ‹version› · pre-release · build
  ‹commit›", one paragraph, one **Start here** button (to the Room), the repository address, links to the
  documentation, the licence and the release notes, and three live tiles: CPU (this page's main-thread busy share over
  the last 5 s, from long tasks and frame overruns; the monitor's engine worker is not in it), Memory (this page's
  JavaScript heap, Chromium only, "—" elsewhere) and Engine (the median of one 20-ms tick of the same engine build,
  timed in a background worker every 5 s while Home shows). **Room** holds the app's only QR code, the session code,
  the join address, "n phones following", a Stable / Weak / Disconnected status (Weak: a phone joined or resynced in
  the last 2 s; the relay gives no round-trip time) and the windows and phones connected now; the top bar's Phones
  sheet is gone, and the Monitor view's **Phones** button opens the Room. **Scenarios** has the library (the two
  demonstration cards first, then the others by category, one sentence each, the case details opening in place), a
  builder page whose **Import a scenario file** validates a `pme-scenario/1` file and loads it, and the last three
  cards loaded; **Load** opens the Instructor view with the case loaded. **Patient** has the patient controls (presets,
  age, weight and conditions, MODELED or MANUAL, the sensors-off start). A workflow rail (Home | Room, Scenarios,
  Patient | Instructor, Monitor, Ventilator | Debrief | Explore physiology, Tools, Settings) replaces the top bar's
  tabs: an icon strip on the Instructor view and below 900 px, absent on the Monitor view, a learner's window, a phone
  and a Remote. Its foot has a light/dark switch (the site's Screen theme, saved as Settings saves it) and a clock with
  the Persian date where the browser has that calendar. The four pages and the rail are set in IBM Plex Sans and Plex
  Mono (SIL OFL 1.1, NOTICES N-017); the monitor skins' fonts are unchanged. Every page but the monitor screens carries
  the owner's disclaimer as its footer line, "For educational use only; Not to be used in patient care.", which
  Settings → About and the Debrief's print footer also print. The views behind the rail are unchanged inside.
- Monitor (the owner, 2026-10-26: every monitor surface says it is a simulator): "SIMULATION · not a clinical monitor"
  at the top of the Monitor view, a learner's monitor window and a learner's phone, and on no other view (the same
  monitor on the Instructor view has none). On a skin with a two-row header (Saadat-like) it sits in the header's free
  centre, where a real monitor prints the patient's name, in the header's font; on a one-row header, a 16-px strip
  above the monitor; on a phone held upright, two lines of 11 px in the header's message area while no message shows
  (an alarm message replaces it), so the phone's lanes lose no height. The renderer gains
  `MonitorHandle.setHeaderNote(text)` (see `docs/guides/embedding.md`).
- Engine (E133, owner ruling 2026-10-26): ventricular ectopy from the physiology. A beating heart in MODELED now has a
  hazard of PVCs, couplets and non-sustained runs of VT, stepped at 1 Hz after the arrest model and read from the same
  inputs: drive D = (sK + sT + spH + sIsch) × (1 + cat) + sCat, each substrate term a ramp from 0 at its threshold to 1
  at the arrest model's own threshold for that input: potassium 6.5 → `K_HAZARD` 8.5 mmol/L (Durfey 2017: 15 % of ED
  patients with K ≥ 6.5 had an event within 6 h, mostly bradycardic, so K never weighs more than another input); core
  temperature 40 → `T_HOT` 42 °C (MH grading scale, Larach 1994; heat stroke, Akhtar 1993) and 32 → `T_HAZARD` 28 °C
  (Mattu 2002); arterial pH 7.20 → 7.00 (severe acidaemia, Jung 2011; afterdepolarisations, Orchard & Cingolani 1994);
  the coronary ischaemia from where the monitor shows ST depression to the low-flow arrest (reperfusion arrhythmias,
  Nakata 1990; Lown grading 1971). Catecholamines (`riskOf`'s inotropy above 1, the endogenous surge plus drugs)
  multiply the substrate (Tang 1995; MH pigs, Jönsson 1989) and act alone only at overdose level, sCat = ramp(cat, 1,
  2) (Campbell 2015). Events come at 6 × D per minute (at most 30); a run is 3 beats plus a geometric excess (mean 2),
  at most 30 (NSVT, Katritsis 2012). The rate, the weights and the shares are [ENG]; the thresholds are sourced.
  Sustained VT is never drawn by the physiology, and VF still comes only from the arrest model, whose timings are
  unchanged (the ectopy does not feed it). MANUAL keeps the instructor's rhythm; the instructor's PVC setting draws
  first. The draws come from their own seeded stream, `ectopyHazard`, so no escape rhythm or shock outcome moves when
  a PVC is drawn, and a healthy resting patient takes no draw at all (no PVC, the streams as seeded). The Debrief
  makes one timeline row of each run of ≥ 3 PVCs ("Run of ventricular tachycardia (n beats)", run event `vtRun`).
  Measured on the cards (engine seed 7): untreated MH, first PVC 10.95 min after the succinylcholine, 346 ectopic
  events and 35 runs in 51 min, the acidaemia term times the MH catecholamines (the core stays under 40 °C since E131);
  the treated early path, none; the haemorrhage card, 4 events before the pulse loss, none while pulseless and 3 after
  the ROSC, with its state, rhythm and pulse identical every second. The monitor's HR averages a run's beats: the
  untreated MH's highest displayed HR is 160 within 10 s of a run and 138 on the sinus tachycardia. The tamponade
  card's highest systolic after ROSC is 208.5 mmHg (was 196.5): a run of 4 PVCs as the tamponade takes the pulse moves
  the pulse loss by 1 s and the phase of the later beats against the compressions; the drainage and the ROSC keep
  their seconds.

### Changed

- Monitor (E126, owner ruling 2026-10-26: mimic the real monitor): SpO₂ and the pleth in cardiac arrest and during
  chest compressions. Pulseless with no compressions, the oximeter shows no value (blank on the Saadat-style skin,
  dashes on the others) with its no-pulse message 4 s after the last pleth pulse; the held, marked "99?" is gone, and
  the "?" mark is no longer printed on any tile (`glyphs.questionable` is empty on every shipped skin). During
  compressions the pleth carries one pulse per compression from the circuit's own forward aortic-valve volume (the
  beat rule, PI × SV/SV₀; it was a fixed 20 % of the resting PI × quality), the value is the model's saturation read
  through that signal, flagged questionable, with a low-signal message — SPO2 LOW PERFUSION, or the new SPO2 LOW SIGNAL
  IQ (Masimo "Low Signal IQ") when the perfusion index is not low — and never a desaturation alarm. When the pulse
  returns, the reading comes back after the oximeter's 8 s average. The Debrief, its export and the Persian handout
  print the SpO₂ the monitor showed (a number during CPR, "–" where it showed none) and the footnote under the key
  moments says so. The haemorrhage demonstration card pauses compressions at each pulse check until the shock (the ALS
  rhythm check), so the strip shows clean VF; its course is otherwise unchanged.
  Owner rulings on the Saadat B9, same day: in VF the monitor finds no QRS, so once its VF analysis stands (3 s, the
  VFIB alarm) the HR field is empty — no left-over 8 s average, no count of fibrillation waves or compressions — while
  ECG VFIB stays; the SpO₂ field is blank when pulseless; and a pulseless pleth is not a flat line but the sensor's own
  noise, unorganised and small (half the pulse detector's floor, so it is never counted as a pulse). With these, the
  low-flow guard "at MAP < 30 the SpO₂ is never shown valid" in Ali's case now passes (was SpO₂ 99 at 760–765 s).
  (Persian entries for the new footnote and alarm words added untranslated, `reviewed: false`.)
- Engine (E131): malignant hyperthermia runs on ONE skeletal-muscle metabolic rate, and the heat model follows the
  blood flow. The hypermetabolic muscle adds an oxygen demand of activity × 1.5 × the resting VO2 (whole-body VO2 × 2.5
  at full fulminant activity: tables §5.3 "×2–3"; swine ≈ × 2, Gronert 1976/1977/1986). The VO2 demand, the CO2 (the
  achieved part at the muscle RQ 0.97, Cooper 1992, plus 22 mL per mmol of the MH muscle's anaerobic lactate,
  Beaver 1986), the heat (the achieved part × 21.1 kJ/L O2, Weir 1949), the lactate (the unmet demand) and the K efflux
  all derive from it; dantrolene lowers them together. `MH_HEAT_X` (8), `MH_VO2_FACTOR` (2.5) and `MH_VCO2_FACTOR` (3)
  are deleted: they made 640–705 W of heat from oxygen worth about 120–180 W. Heat is oxidative, so the basal,
  endocrine, shivering and MH heat follow the blood model's delivered share of the oxygen demand; the core–skin
  conductance above tissue conduction (5.28 W/m²/°C, Gagge 1971) follows a skin-perfusion flow fraction; sweating and
  shivering need a perfused brain (the baroreflex's perfusion gate). The MH card moves (owner-accepted): EtCO2 95 at
  +15 min (was 72), the MH heat is ≈ 140 W, the core rises ≈ 0.12 °C per 5 min and plateaus near 38.6 °C, so the
  untreated card reaches neither its "established" state (+103 min) nor a hyperthermic VF; a body in arrest cools
  ≈ 1 °C/h (was 3.8 °C/h). Ten bands are now recorded misses (it.fails; the known-deviations page), two
  flip back to passing (dantrolene's 10-min EtCO2 effect −7.5; EtCO2 ≥ 60 by 10 min, 64). The healthy and premedicated
  inductions are bit-identical; the haemorrhage card keeps every state time, its core is up to 0.18 °C lower after the
  arrest.

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
- Engine (E118, not met): pulsus paradoxus in severe tamponade stays a known miss (3.4 mmHg against ≥ 10, Spodick
  2003). The measured candidate mechanisms and why none was added for this release are in `docs/model/circulation.md`.
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
- CI (release, validation): the release workflow's browser tests (`iife-smoke`, `vent-embed`, Chromium and WebKit,
  on the files the release job built) and the validation workflow's Chromium soak run in the same Playwright
  container (`docker run`, the lockfile's version), so neither runs `playwright install --with-deps` or depends on the
  runner's apt mirror. What the release builds and publishes, and the job timeouts, are unchanged.
- Fast-forward (owner rulings 2026-10-26, mockups m12 and m13): during the jump the panel leaves one blank line, the
  title's own line height, between the ringed chevrons and "FAST FORWARD · N MIN"; after it the banner reads two lines
  only, "Fast-forwarded N min" and the alarm line ("No alarms" or the alarms with their times). The "00:08 → 05:08"
  line that FX-23 added at rc.3 is gone. The banner's 8-s life, its amber style and its place are unchanged.
- Showcase MH and haemorrhage cards (E132; the clinical review of the two demo cards, 13 findings, accepted in full by
  the owner on 2026-10-26; card text and steps only, no engine change). The cards script what the instructor presses
  and what the engine is told; no volume or constant was tuned to a time.
  - MH: the crisis step is "MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 % at 10 L/min,
    hyperventilate" (vaporiser 0 % at 10 L/min, ventilator 20 × 600 at FiO₂ 1.0, propofol infusion 100 µg/kg/min;
    charcoal filters are not modelled, and the run sheet says so). Objective 4 asks for a second dose of dantrolene
    2.5 mg/kg when the EtCO₂ climbs back at normal ventilation; it is met by any dantrolene dose after ventilation
    back, untimed (a timed rule added a key-times tile and pushed the report's page 1 past its 267-mm bound). Cooling
    is "Cool: refrigerated saline 20 mL/kg (1.6 L)", pressed only above 38.5 °C, so not on the early-call path; the
    engine has no cold-fluid input, so the saline enters at the room's 21 °C and "refrigerated" is a label. The early
    signs are worded as EtCO₂ rising at unchanged ventilation when it should be falling, with a rising heart rate
    blunted by fentanyl. Take-home line 3 is rewritten and a fourth (aftercare) added: `takeHome` in `pme-scenario/1`
    now takes up to four lines (was three), and the schema lists the `infusion` event kind.
  - Haemorrhage: the resuscitation step is "Surgeon controls the bleeding; massive transfusion: 1 L warmed
    crystalloid, then red cells and plasma by rapid infuser; TXA 1 g" (the bleed set to 0, 1000 mL balanced
    crystalloid over 90 s, 1200 mL of the engine's whole blood over 144 s, tranexamic acid 1 g, which is logged and
    has no monitor effect: there is no coagulation model). It was 2 L crystalloid over 3 min and 600 mL of blood; the
    crystalloid enters at 21 °C, since the schema has no fluid-warmer event. "Pulse check" is "Rhythm check" in every
    button and state, so in the Debrief too; epinephrine is offered in every CPR state; after the second shock the card
    keeps CPR to the 2-min rhythm check ("Rhythm check: pulse back, stop CPR"). The objectives are rewritten to the
    course with every "draft, owner to confirm" removed (objective 3: the return of circulation recognised and CPR
    stopped within 150 s; 120 s since the owner's ruling of 28 October, below), and the card has the owner's three
    take-home lines. This replaces the E120 entry's resuscitation volumes and its "no take-home lines yet".
  - Measured on kit round A4 (Chromium, kit 503caeab, three phones). MH: early signs 8:14, the call 8:16, dantrolene
    8:37, ventilation back 13:56, the EtCO₂ above 45 again at 14:10, the second dantrolene 19:14 at EtCO₂ 65; at the
    end (24:31) EtCO₂ 64, HR 85, ART 96/64, core 36.4 °C; Debrief report 8 A4 pages, learner handout 1 page.
    Haemorrhage: pulse loss 11:00, asystole 15:34, CPR and transfusion 15:38, shock 1 at 17:46 (asystole), shock 2 at
    19:53 (an organised rhythm), ROSC 20:57, 64 s after shock 2 as before; CPR stopped at the rhythm check, 21:54; a
    minute later ART 141/93, HR 74, EtCO₂ 54. Its Debrief has 21 key moments and prints 9 A4 pages; the learner
    handout stays on 1 page, its long key-moments table set smaller. The new card words are in
    `docs/showcase/i18n/fa-debrief.json` as English keys awaiting the owner's Persian (`"fa": null`, `reviewed:
    false`).
- Showcase cards, the owner's rulings of 2026-10-28 (rc.4; card text and steps only, no engine change).
  - MH: the second dantrolene at normal ventilation ("Dantrolene 2.5 mg/kg; hyperventilate again (20 × 600, O₂
    100 %)", offered in "Ventilation back to 12 × 500") enters a new state that gives the dose and the trigger-off
    step's ventilator command (20 × 600, PEEP 5, FiO₂ 1.0), then returns to the crisis checklist. Ventilation goes back
    to 12 × 500 only from Recovering, by the same button and on the same rule as the first time (EtCO₂ below 40 for
    2 min), never on a timer. Objective 4 names the hyperventilation; the Debrief still judges the first return only
    (objective 6). No new `pme-scenario/1` kind. On the talk path (second dose 19:14) the EtCO₂ held at 64–66 at
    12 × 500 before and was below 40 for good only from 51:59; now it falls to 50 a minute after the dose and to 41 at
    the talk's end (24:31, Recovering, HR 70, ART M 67, still 20 × 600), is below 40 from 25:15, ventilation goes back
    again at 27:15, and it is below 40 for good from 42:38 (headless; kit round A4 on Chromium agrees to the talk's end).
  - Haemorrhage: the return-of-circulation objective asks for CPR stopped within 120 s (was 150 s); the measured 57 s
    stays met, and the course is unchanged. The pseudo-PEA objective and the card's notes name the measured "ART about
    20/14" (was 19/13; 20/14 and 21/14 on two kit rounds, at the PEA-state row).
  - The pause for the shock is "under 10 s" in the cue cards and the run sheet (was "under 5 s"; 8 s measured on the
    rc.4 round).

### Fixed
- The MH card's story text said the untreated patient passes 38.5 °C at about 19 min and arrests in VF at 42 °C at about 45 min; on this build (E131) the untreated core is about 37.3 °C at 51 min, the established state comes after about 100 min and no hyperthermic VF occurs. The text now says so (found 2026-10-29 while writing the speaker's reference).

- Validation harness: the MODELED sanity documents and the Pulse oracle's MODELED scenarios no longer send a baseline
  heart rate. In MODELED a `setTarget hr` is the instructor's held rate, so the haemorrhage, sepsis, phenylephrine and
  Cushing rows read exactly 75 bpm and the oracle's haemorrhage HR rise read 0: they tested nothing (Q-FU3-9a). With
  the rate free, on main `458903cc`: s4 class III/IV, t16 and t17a heart rates 104 / 127 / 87 / 94 (yellow, were red);
  t17b SBP 104 against 65–80 (red, was yellow); t10's phenylephrine rescue MAP 69 against > 85 (yellow, was green);
  the oracle's haemorrhage HR rise +13.5 against Pulse's +47.7 and the propofol MAP fall 26.9 against 27.9 (green).
  No band changed; engine code untouched. The committed validation report is not regenerated (it needs the dataset
  cache).
- A learner's phone (or a second-screen monitor) applies every mirrored command on the tick the instructor's monitor
  applied it. The follower also passed the command's stage group to its own engine, which then pulled a command the
  instructor's monitor had applied a tick or two after its group's first (a group its engine had already passed) back
  onto the group's first tick. Since E126 the haemorrhage rhythm check is such a group (compressions off, then VF): on a
  phone VF could start a tick early, the first shock could then end that VF differently, and nothing noticed it (no
  beats in arrest). Kit round, 3 phones: one phone kept VF and a blank HR for 33 s of post-shock CPR while the
  instructor's monitor showed 155 then 110. The follower now dispatches the host-resolved command without its group.

- Instructor page (UI review 2026-10-24 #1): a reload in the middle of a card came back as "No scenario" with the
  default patient, and the phones followed that. The page now comes back to the card, its state and its clock: every
  second the tab keeps the run's position in its session storage (what a bookmark holds, the engine snapshot and the
  scenario runner's state, plus the card, the speed, the pause, the learner controls and the Debrief's record), and on
  load under the same session code, the same build and within 6 hours it loads the card again and returns to that
  position like "Return here" (the phones re-follow the same way). A toast says so ("Restored after reload: Malignant
  hyperthermia, 05:12"). A reload comes back at most one second of wall time behind (× the speed). Restart patient
  and loading another card forget the position; another session code in the address restores nothing. Not kept: the
  Log tab's lines and the bookmarks from before the reload. `ScenarioDriver` gains `position()` and `hold()`.
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
- Debrief (UI review 2026-10-24 #3, #18). The report's and the learner handout's Key moments tables stopped at 12 rows
  without saying so: the haemorrhage handout stopped before both shocks and the return of circulation. There is no cap now; the tables have one row per marker on the course strip. A handout with more than
  12 moments prints its table compact, so the haemorrhage handout's 21 moments still fit one A4 page; a longer table
  continues on page 2 under a repeated header. "Recognition (instructor's tick)" counted from 00:00; it now counts from
  the state the card's own timed rules count from (MH: the early signs; anaphylaxis: the reaction), when the patient
  reached it by the tick, and the tile names both ends ("‹time› · ‹mm:ss› early signs → ‹mm:ss› ticked"). Cards whose
  signs are present from Load (tamponade, bronchospasm) count from the start. The export's key time carries the
  start's name as an optional `fromLabel` (an addition to `pme-debrief/2`).
- Instructor and phones (UI review 2026-10-24 #2, #5, #8, #9, #10). One visit to the Ventilator view held every phone
  ("The ventilator is on the main screen") for the rest of the case: the host now sends its cockpit notices only while
  the view is on screen, and leaving it releases the phones at once (187 ms in the browser test). The long "What
  happens next" buttons, cut 27–38 px past the panel at 1280 px, wrap inside it. The toasts no longer cover the
  monitor: on the Instructor view they sit at the top of the panel, under the bars and the panel's tab strip; on the
  Monitor view only the alerts (a stopped monitor, a scenario that did not load, the hidden-tab pause, the reload
  restore, a refused bookmark or fast-forward) and the learner controls' own feedback show. The fast-forward banner
  and the toasts never print, the banner does not show on the Debrief, and it no longer covers the bars. Saadat-like:
  the BFI / EtAA row no longer runs its labels together or clips "MAC 0.x" (NMT and AGENTS take their content's width,
  their digits at the IBP mean's 30 px; on a phone a four-part row wraps into two lines of two): 8 layout faults at
  1280, 2 at 1920 and 2 on a phone before, 0 on Chromium and WebKit after.
- Instructor (E128, the owner's test of the E125 kit with his phone, 2026-10-26). **Load** opens the panel's
  **Scenario** tab, with the case's next-step buttons, whatever tab was open and wherever the load came from (the
  Scenarios library, the panel's own library, a deep link, a reload's restore, a Remote); a new patient with no case
  leaves the tab alone. On the Instructor view the toasts sit under the panel's tab strip, so the Log tab stays
  pressable. Leaving the Ventilator view hands the patient to the engine's ventilator: the cockpit's settings (rate,
  VT, PEEP, FiO₂, I:E, Pmax; the last measured volume and rate in a pressure or spontaneous mode) go to the engine as
  one `ventilation` event on the tick after the cockpit's last applied frame, and the hidden cockpit is paused and
  unlinked. Before, it went on ventilating off screen with frames that never reach a phone, so every phone drifted
  and resynced about every 4 s for the rest of the case (7 resyncs in 30 s on the owner's repro); now 0 in 30 s, and
  60 s after the hand-over EtCO₂ 35, SpO₂ 99 and Ppeak 16.8 against 37, 98 and 16.8 with the cockpit still driving.
  Going back to the view restarts the cockpit at the engine's current ventilator settings; a refused hand-over leaves
  the cockpit ventilating as before; the hand-over adds no Debrief row.
- Engine (E129): after a hyperthermic arrest the malignant-hyperthermia muscle no longer heats the body (the owner saw
  94 °C on the untreated card). Its heat was a fixed source, about 8 × the basal heat, that ran on with no blood flow;
  the excess muscle heat is oxidative, so it is limited by the share of its oxygen demand the circulation delivers,
  none with no flow. E131 (under Changed) builds on this: every metabolic heat now follows the delivered oxygen.
- Instructor and monitor (UI review 2026-10-24 #13, #15, #17, #19, #24–#28, #32). The Oxygen control, with a tube, a
  bag or a ventilator in use, is disabled with nothing pressed, and says what is true ("Airway device in use
  (tracheal tube): FiO₂ 50 % from the ventilator.", "Bag-mask in use: FiO₂ 100 % from the bag.") with the FiO₂ the
  engine reports. Saadat-like NIBP: while the cuff runs, the cuff pressure shows small (the mean's 30 px; 20 px on a
  phone) over "NBP inflating" / "NBP measuring", without the last result's time. A flashing value dims to no less than
  3:1 against the background (WCAG 2.2 SC 1.4.3, large text; it went to ≈ 1.1–1.2:1). The course chart's key-moment badges
  no longer collide or leave the plot. The Saadat-like T1/T2 limits never shrink below 9 px (6.71 px measured at
  1280 × 800), and a new monitor height refits them. The Monitor view's hover strip sits under the monitor's header,
  following the header's real box, never over the date, the time or the HR label. Each panel tab keeps its own scroll
  position (the top on first open). Devices & alarms shows the sensors the monitor has (a card's CO₂ line and arterial
  line attached) and its alarm list as the tab opens, and says "Alarm sound on at the monitor; this window is muted
  (Sound off, top right)" when this window's sound is off. A paused session puts **PAUSED** over the monitor on the Instructor and Monitor
  views and on every phone until Resume; it is never printed.
- Monitor (oximeter): a detected pleth pulse's amplitude is its own beat's. The perfusion index is the mean amplitude
  of the last six pulses, each taken between two feet the pulse detector found; when the detector missed a foot, that
  interval held two pulses and its max − min was neither's. An interval longer than 166 % of the median of the recent
  intervals now holds a missed pulse (the RR-missed limit of Pan & Tompkins, IEEE Trans Biomed Eng 1985), and the
  pulse is measured over one median period from its own foot, PI as AC/DC per pulse (Lima et al., Crit Care Med 2002);
  the median rather than Pan & Tompkins' range-limited mean is [ENG]. In Ali's low-flow case the highest PI after the
  onset is 0.232 (the row asks < 0.3; it read 0.336, a merged pulse). Across the fidelity and SpO₂ runs, 17 of 56 runs
  changed some 1-Hz PI rows (at most by 0.20), no PI or SpO₂ flag or pulse rate changed, and no band moved. The
  pressure lines (ABP, PAP) keep their foot-to-foot beat.
- CI: the reload browser test holds on the loaded CI WebKit runner, which failed it on all three attempts with no
  product change (run 40180609451: the phone took longer than 5 s to match, and the 4-s toast had gone before the test
  looked). It now reads the restore from the Log tab's line ("Restored after reload: Malignant hyperthermia, mm:ss")
  and allows the phone 20 s on CI and on WebKit (5 s on local Chromium, as before); the 10-s clock bound is unchanged.

### Known limitations

- Windows launchers (`.cmd`): untested on Windows at this release.
- Pulsus paradoxus in severe tamponade is not reproduced: the systolic swing is 3.4 mmHg against the target of at
  least 10 mmHg (Spodick 2003; `docs/model/circulation.md`). The work on it (E118) follows the demo of 3 November.
- A hidden instructor tab pauses the session and resumes it on return (owner ruling E82). The proper fix, a session
  that keeps running while the tab is hidden, is for a later release.
- Browser coverage (replaces the browser line of 1.0.0-rc.3): the WebKit tests tagged `@known-flaky` run in a separate
  CI job that does not block (docs/gates/stage-14.md, "The known-flaky WebKit quarantine"); on the gating WebKit job a
  test that passes only on a retry is still recorded as a warning, not a failure, until the demo of 3 November
  (docs/gates/stage-14.md, "Temporary relaxation"). Chromium runs every test and still fails on a retry-only pass.
- The Persian Debrief handout prints in English every line its Persian table does not hold, so some lines of the two
  demo cards print in English: 26 entries of `docs/showcase/i18n/fa-debrief.json` have no Persian yet. Persian drafts
  for 21 of them are in PR #161 and await the clinical owner's review; the other 5 have no draft (one is held there
  for his wording ruling, and four changed their English in #163, after that PR was written).
- The classroom kit (the app, the relay for learners' phones and the launchers) is still built from a source checkout
  with `node scripts/showcase/make-bundle.mjs` (Node.js ≥ 22); it is not a release asset of this release candidate.
- Not run at this release: the two release-checklist runs of `RELEASE.md` — the 600 s tick-cost gate on an idle
  machine (item 8) and the 10-minute soak with a busy Ventilator view and a paired Remote (item 9).
- The Persian Debrief handout's terms, other than the take-home lines the owner approved, are drafts marked unreviewed
  until the owner's term review.
- The owner's checks: this release candidate gets a smoke check after the tag, recorded in the repository's gate
  notes.

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

[Unreleased]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.4...HEAD
[1.0.0-rc.4]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.3...v1.0.0-rc.4
[1.0.0-rc.3]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.2...v1.0.0-rc.3
[1.0.0-rc.2]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.1...v1.0.0-rc.2
[1.0.0-rc.1]: https://github.com/samhv-dev/patient-monitor-engine/releases/tag/v1.0.0-rc.1
