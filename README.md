# patient-monitor-engine — static site (pre-release 1.0.0-rc.5 line)

The built teaching app of `main` cd1e28c7 (2026-11-09, "kit I"). This is a teaching simulator: not a medical
device and not clinically validated. Source, release notes and known limitations:
https://github.com/samhv-dev/patient-monitor-engine (see `CHANGELOG.md`, `docs/guides/known-deviations.md` and
`docs/validation/README.md` — the validation gate reports every physiological miss by name).

New since the 8 November site (kit H): the EEG stack — a simulated cortical state the physiology reads, a signal
generator with its artefacts, a generic processed-EEG reader and the depth-of-anaesthesia tile; the mechanism tree
page under "Explore the physiology" (`#/explore/mechanisms`), drawn from the coupling registry; the coupling
registry itself (every seam between models named, with its class and source); the validation gate's expected-failure
marks; the owner's name scrubbed from the sources. Earlier: Instructor v2 as the only instructor view; the Room page;
the pme-scenario/2 card format; Debrief 2; phone roles (learner monitor, instructor remote with PIN, learner
defibrillator); the ventilator window from a granted remote cockpit. The classroom relay (phones following the
instructor's laptop) is local to the kit and is not on this site. Developer: samhv-dev.
