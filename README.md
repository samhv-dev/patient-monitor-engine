# patient-monitor-engine — static site (pre-release 1.0.0-rc.5 line)

The built teaching app of `main` 128917d6 (2026-11-10, "kit J"). This is a teaching simulator: not a medical
device and not clinically validated. Source, release notes and known limitations:
https://github.com/samhv-dev/patient-monitor-engine (see `CHANGELOG.md`, `docs/guides/known-deviations.md` and
`docs/validation/README.md` — the validation gate reports every physiological miss by name).

New since the 9 November site (kit I): the mechanism tree with clinical labels and a readable default view (labels
under the clinical owner's review); the session clock keeps real time under load and says so when the computer falls
behind; the debrief archive is kept in IndexedDB (a full browser storage no longer refuses a save; earlier debriefs
are moved over once); the printed debrief and handout: the run's lanes under the course strip, no minute appendix,
Persian talking points and captions, every symbol from fonts the site ships; a silent ventilator hand-over can no
longer be retaken by a stale cockpit; respiratory drive and effort exist under controlled ventilation, with the
neuromuscular block deciding whether drive becomes effort; RV infarct with pericardial constraint; validation bands
restated to their sources. Earlier: the EEG stack and the depth-of-anaesthesia tile; the coupling registry;
Instructor v2 as the only instructor view; the Room page; the pme-scenario/2 card format; Debrief 2; phone roles
(learner monitor, instructor remote with PIN, learner defibrillator); the ventilator window from a granted remote
cockpit. The classroom relay (phones following the instructor's laptop) is local to the kit and is not on this
site. Developer: samhv-dev.
