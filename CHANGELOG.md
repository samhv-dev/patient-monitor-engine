# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/):
the public API is what the packages export (see the API reference), the `pme-scenario/1`, `pme-snapshot/1`,
`pme-skin/1`, `pme-preset/1` and `pme-theme/1` document formats, and `window.PatientMonitor`.

## [Unreleased]

## [1.0.0-rc.1] - 2026-10-17

First public **pre-release** (release candidate). It is not the final 1.0.0: the calibration pass and the blind
realism review have not run, and the limits below are known.

### Added

- **ECG and rhythms:** a rhythm engine with 36 rhythms, recorded VF and AF textures (PhysioNet CUDB, MIT-BIH, ODC-By),
  3/5/12-lead display and 12-lead capture, pacing (Stages 1, 5, 5.1).
- **Haemodynamics:** ABP, CVP and PAP waveforms, the NIBP cuff cycle, pleth (Stage 2).
- **Respiration and gas:** capnogram, the SpO2 chain with its lag, respiratory rate, temperature (Stage 3).
- **Device behaviour:** measured numerics with averaging and lags, probe states, IEC-style, traditional and Saadat-style
  alarm sounds, pacer and defibrillator, trends and an event log (Stage 4b).
- **Skins:** six data-only monitor skins (`saadat-like`, `philips-like`, `zoll-like`, `ge-like`, `mindray-like`,
  `lifepak-like`), two themes and one preset, each value with its provenance (Stage 4a).
- **Control:** commands and transports (in-process, postMessage, BroadcastChannel, WebSocket with a relay, WebRTC), an
  instructor panel and the `pme-scenario/1` scenario runner (Stages 6a, 6b).
- **MODELED physiology** (a teaching model; see Known limitations): four-chamber circulation (7a), two-compartment lungs
  and gas exchange (7b, 7k), blood and acid–base (7c), brain, kidney and liver (7d), endocrine and thermal state (7e),
  depth of anaesthesia, ventilatory drive and neuromuscular block (7f), pharmacokinetics and pharmacodynamics of 65
  drugs (7g), and the follow-up rounds FU-1 to FU-11 and FU-7.1 (integration, the drug layer, blood and fluids,
  endocrine and thermal, respiratory integration, hardening).
- **The one-page clinical teaching app** (Stage 9) and **time control** — ×8 and a 2- or 5-minute fast-forward (Stage 10).
- **The Hamilton-style ventilator** and its two-way link with the engine (Stages V, V.1).
- **Validation tooling:** the validation harness and the blind-review tool (Stage 8a).
- **Showcase scenarios:** six Showcase scenario cards (Stage 11).
- **Second screen:** a learner monitor following on a second screen in the same browser (FU-11 d).
- **Learners' phones:** phones follow the instructor over a classroom relay on the instructor's computer (Stage 12; the
  relay needs Node ≥ 22; not yet tested on a real phone, see below).
- **Debrief:** a report of the run, printed to PDF (Stage 13).
- **Fixes:** the Ventilator view after "Return here" on slow WebKit (FX-1), commands always answered or refused (FX-2),
  alarm controls that follow the skin (FX-4), the scenario library staying open until a scenario loads (FX-7).
- The single-file IIFE `patient-monitor.iife.js` (the engine ships once; ≤ 400 KB gzipped, checked in CI) and the
  `file://` ventilator + monitor embed.
- Publishable ES module packages with type declarations; TypeDoc API reference; embedding, scenario-authoring and
  skin-authoring guides; physiology overview, validation summary and known deviations.
- CI: dependency-licence audit (with every shipped licence text in `LICENSES/`), IIFE size budget, pack smoke and
  TypeDoc build; a release workflow that attaches the IIFE, the embed, the API reference and the licence texts to
  GitHub releases.

### Known limitations

- The MODELED physiology is a teaching model with open calibration items: see
  [docs/guides/known-deviations.md](docs/guides/known-deviations.md). Not a medical device; not clinically validated.
- 27 validation rows are outside their evidence band by 30 % or more (the report regenerated on the release tree:
  🟢 96 · 🟡 33 · 🔴 27) and the blind realism review has not been run, so the v1.0 acceptance criteria "V1–V9 pass"
  and "realism review" are not met yet; see [the validation summary](docs/guides/validation-summary.md).
- During compensated haemorrhage the systemic vascular resistance falls instead of rising (the reflex
  vasoconstriction is not reproduced).
- There is no decompensation or reflex-collapse model: shock does not progress by itself to collapse (the autonomic
  hub and the cardiovascular reflexes are v2.0 work, `docs/roadmap/`).
- No sepsis model fit for teaching: the `sepsis` condition exists, but its course is incomplete — under general
  anaesthesia the core temperature stays near 36.6 °C where the band asks for 38.5–41 °C at 90 min (a recorded known
  miss, `fu10-fever.test.ts`); no sepsis scenario ships.
- Pulsus paradoxus is not reproduced (no ventricular interdependence; the optional FU-7.1 c work was not started).
- Adults only: no paediatric or obstetric physiology.
- Browser coverage: five browser tests (the second screen, time control at ×8, two phone tests, the Ventilator view
  after "Return here") are skipped on the 2-vCPU Linux WebKit CI runner, which is too slow for them; they pass on
  macOS WebKit and on Chromium, and the hand checks above cover real Safari. Tests that passed only on a retry are
  listed in [docs/guides/known-deviations.md](docs/guides/known-deviations.md) and the Stage 8b gate note.
- A ventilator window opened on its own (`vent-hamilton.html?link=v<code>`) no longer joins a running session: the
  Ventilator view now links its cockpit over a direct frame port (FX-1). The app's own Ventilator view is unaffected.
- Pairing is for a trusted local network: anyone with the room code can act as a controller, and a peer that knows the
  host's id can take over the relay's host slot. A host-issued controller token and a host reconnect key come with a
  later release. The relay's drop log has no rate limit (a later release).
- Not yet checked by hand at this release (PENDING-OWNER): learners' phones on a real phone (Stage 12 gate step 4,
  hand checks H17 and H21, `docs/gates/stage-12-real-phone.md`); the Debrief's print preview in Safari and Chrome
  (Stage 13); the fast-forward look and the second screen in real Safari (H18, H20); the hidden-tab watchdog (H19);
  the `file://` ventilator embed opened by double-click in real Safari (H22). None of these is verified.
- For education only. Not a medical device; never connect it to a patient or use it for clinical decisions.
- The ES module packages are publishable but not on npm at this release candidate (build from source); the `@pme/*`
  package names are provisional until a first npm publish. No DOI yet (planned for 1.0.0).

[Unreleased]: https://github.com/samhv-dev/patient-monitor-engine/compare/v1.0.0-rc.1...HEAD
[1.0.0-rc.1]: https://github.com/samhv-dev/patient-monitor-engine/releases/tag/v1.0.0-rc.1
