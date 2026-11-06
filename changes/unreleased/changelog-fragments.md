### Changed

- **CHANGELOG entries are fragments (research/42 §1.4 c).** A pull request with a user-facing change adds one small
  file under `changes/unreleased/` (lines under the usual `### Added` / `### Changed` / `### Fixed` / … headings,
  each exactly as it will read here) instead of a line in this file's Unreleased section, so two pull requests no
  longer conflict in CHANGELOG.md. At release, `scripts/changelog-assemble.ts <version> <date>` groups the fragments
  by heading into the dated section, moves the compare links and deletes the fragments (RELEASE.md, CONTRIBUTING.md).
  The validation test `changelog-fragments.test.ts` keeps the Unreleased section empty and checks every fragment.

### Fixed

- An escape or accelerated focus no longer fires almost at once on a rhythm switch: on a switch to junctional escape,
  accelerated junctional, idioventricular or AIVR the first focus beat comes one of the focus's own cycles (60/rate)
  after the last ventricular beat (junctional escape 1.28 s, idioventricular 1.72 s after the last sinus beat at 75;
  it came 0.48 / 0.41 s after it and read as a premature beat, then a pause). A row flag in the rhythm table,
  `focusWaitsForInterval`, marks those four foci, and `applyRhythm` starts them at the last ventricular beat + 60/rate;
  VT, polymorphic VT, torsades, AVNRT, AVRT, junctional tachycardia and the AV-block escapes keep their onset.
  The onset moved the haemorrhage showcase's junctional beats 0.34 s against the CPR compressions, and that alone
  turned its IP8 debrief run from "no arrest" into an engine arrest at 661 s and a return of circulation at 781 s: CPR
  over a heart that still beats read its coronary supply from each beat's onset LV pressure, an instant of the
  compression cycle (1.8–13.7 mmHg on consecutive beats, while the relaxation-phase CPP held 17–20), and 5 escape beats
  to 11 compressions locked the pattern (on main, 6 of 9 CPR presses 0.1–0.9 s apart arrested at 661–663 s). Under
  compressions the beating heart's supply is now the relaxation-phase CPP the arrested heart is read by (Paradis 1990),
  with the beats' own demand (`stepCoronary` `compressions`): the myocardium 24 s into CPR is 0.470–0.487 for four
  starts 0.15 s apart (was 0.123–0.250), and the showcase run never arrests (kIsch minimum 0.255–0.286 over eight).
