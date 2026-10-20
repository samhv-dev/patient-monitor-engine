# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/):
the public API is what the packages export (see the API reference), the `pme-scenario/1`, `pme-snapshot/1`,
`pme-skin/1`, `pme-preset/1` and `pme-theme/1` document formats, and `window.PatientMonitor`.

## [Unreleased]

### Changed

- FX-23 (the owner's review of the fast-forward on rc.2): during a fast-forward the panel shows the double chevron inside
  a ring of the same amber, the ring and the icon blinking together, with no running clock beside it; the progress bar
  no longer shows the start and end times; the muted-sound icon stands alone, without the words "sound muted" (a screen
  reader still hears them). After it, the banner is about 25 % larger (text and padding, same place) and reads on three
  lines: "Fast-forwarded 5 min", "00:08 → 05:08", and the alarms during it with their times or "No alarms"; the
  wording lives in one function, `fastForwardDoneLines` in `apps/demo/src/app/fast-forward.ts`.

### Fixed

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

[Unreleased]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.2...HEAD
[1.0.0-rc.2]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.1...v1.0.0-rc.2
[1.0.0-rc.1]: https://github.com/samhv-dev/patient-monitor-engine/releases/tag/v1.0.0-rc.1
