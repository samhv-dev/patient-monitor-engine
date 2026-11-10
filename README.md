# patient-monitor-engine — static site (pre-release 1.0.0-rc.5 line)

The built teaching app of `main` 218c7d5b (2026-11-11, "kit K"). This is a teaching simulator: not a medical
device and not clinically validated. Source, release notes and known limitations:
https://github.com/samhv-dev/patient-monitor-engine (see `CHANGELOG.md`, `docs/guides/known-deviations.md` and
`docs/validation/README.md` — the validation gate reports every physiological miss by name).

New since the 10 November site (kit J): the scenario builder's first pieces at Scenarios → builder (a card's header,
patient and briefing, its phases with their entry rules in clinical words, and its expected actions with worked
grading examples; drafts are kept in this browser with snapshots, and travel as exported card files; a card the
validator refuses is never produced); phase rules can read a drug's plasma or effect-site concentration; every
number of the two pme-scenario/2 demo cards carries a source line or a marked placeholder; a long fast-forward no
longer freezes the page, and a late monitor worker is waited for and said; hypothermia slows hepatic drug clearance
from its sources; the formulary (fourteen drugs and their diluents, each statement with its source) and the
preparation core behind the learner's remote; pump channels and the TCI model sets in the drug layer (no pump screen
yet). In the offline kit only, not on this site: the learner's remote (a phone signs in with the learner PIN and
prepares and gives drugs from a bench and a tray; the laptop computes every amount and records which phone gave it),
and the kit's own `user-data` folder, where scenario cards and debriefs are also kept as plain files. Earlier: the
mechanism tree with clinical labels; the session clock that says when the computer falls behind; the debrief archive
in IndexedDB; the EEG stack and the depth-of-anaesthesia tile; Instructor v2; the Room page; Debrief 2; phone roles
(learner monitor, instructor remote with PIN, learner defibrillator); the ventilator window from a granted remote
cockpit. The classroom relay (phones following the instructor's laptop) is local to the kit and is not on this
site. Developer: samhv-dev.
