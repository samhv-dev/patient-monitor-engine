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

### Added

- **The Debrief reads what the record now keeps (Debrief 2, D4–D6)**: "who" of each scenario state comes from the
  record's own account (the instructor's press: the team; the state's rule, every `pme-scenario/2` phase: the patient;
  a jump: the scenario), falling back to the card's transitions for an older record. Recognition has one reading: on a
  `pme-scenario/2` card the timed action the card marks `recognition: true` (new optional field, at most one per card;
  set on "name MH" and "recognise the return of circulation"), with its window, press and grade; on a
  `pme-scenario/1` card the recognition objective's tick, or else the new "Recognised" button (session bar and
  Instructor v2 dock, `/1` cards and free runs only), which writes a `recognised` note. The key-moments table gains
  SBP/DBP (a cuff value printed with its age, "98/60 (cuff, 2 min 10 s before)") and CVP, and each alarm under a
  moment its end and acknowledgement ("▸ cleared 07:40 · acknowledged 06:20", or "(still on)"); the minute table gains
  SBP, DBP and CVP. A file made before prints "·" and "not recorded in this file" there. No schema change.

### Added

- **`pme-scenario/2`, the format as a whole, and its authoring guide (plan F10).** A `/2` card is a teaching case whose
  course is a set of phases, each entered by its own rule on the engine's truth and never by a press. The team's work
  is a set of actions, each carrying its acceptance criteria: a drug with its dose, route set and rate; a device or a
  decision with its settings; a fluid; a procedure, sample or communication recorded by its own taking or by the
  scenario `record` command. An action may have a window, anchored on the start, a phase entry, another action,
  the pulse loss or the return of circulation, a truth rule, each taking of another action, a rule on the
  displayed numerics, or the earliest of several. An action may also have a fail limit (`failAfterS`), an unconditional or
  conditional repeat, a precondition and violations. A card may also have outcomes and a card-set script. The new
  guide documents all of this, together with the owner's authoring rules of 5 November:
  - a card names its bleeding source and orders haemostasis against compressions accordingly;
  - the operating-room CPR trigger, as the haemorrhage card writes it, and when it does not apply;
  - VF comes from the physiology;
  - one remote.

  The guide is the `/2` section of `docs/guides/scenario-authoring.md`. Its one example card is checked by
  `docs-examples.test.ts`, which now knows the `<!-- example: pme-scenario/2 -->` tag. The route models (IM dantrolene,
  F = 0) and the Debrief's `pme-debrief/3` export are the entries below and under 1.0.0-rc.5. No product code changed.
