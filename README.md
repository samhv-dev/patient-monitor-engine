# patient-monitor-engine — static site (pre-release 1.0.0-rc.5 line)

The built teaching app of `main` 23e2e24c (2026-11-08 morning, "kit H"). This is a teaching simulator: not a medical
device and not clinically validated. Source, release notes and known limitations:
https://github.com/samhv-dev/patient-monitor-engine (see `CHANGELOG.md`, `docs/guides/known-deviations.md` and
`docs/validation/README.md` — the validation gate now reports every physiological miss by name).

New since the 2 November site: Instructor v2 is the only instructor view (the old one is retired); the Room page
(device table with the relay's pings, status box, instrument openers, room code); the pme-scenario/2 card format;
Debrief 2 (moments, hints, the pressures panel, Persian handout); phone roles (learner monitor, instructor remote with
PIN, learner defibrillator); the ventilator window driven from a granted remote cockpit; IBP scales; monitor scaling
as one unit. The classroom relay (phones following the instructor's laptop) is local to the kit and is not on this
site. Developer: samhv-dev.
