### Added

- **The scenario builder's page (plan `docs/plans/scenario-builder.md`, piece B2)**, in place of the stub that explained
  the `/1` format at `#/scenarios/builder`. An author opens one of the library's `/2` cards as a copy (it gets an id of
  its own) or imports a card file, and edits three sections: Header and story (title, id, category, physiology, minutes,
  seed, story, take-home lines, notes), Patient and sensors (age, sex, weight, height, age band, and each sensor's state
  at the start, offering only the states the engine accepts), and Case briefing (text with a live count against 4000,
  estimated minutes, how long it shows, language, the Persian text). Every change is written through `docOf` and
  checked by the controller's validator 300 ms after the last keystroke; each refusal or warning shows on the field its
  path names (a take-home line's on its row), with a count in the checks column, and Export waits while any refusal
  stands. A library card's id is refused for a copy. The phases, script, actions, outcomes and debrief hints are kept
  exactly as the card has them until their editors are built.
- **Layer 1 of saving: every draft kept in this browser**, as the Debrief archive keeps debriefs: the card bodies in
  IndexedDB, the index in localStorage, one write queue, a snapshot at creation, after every 2 min of editing, at every
  Export and before a Restore (a restore never loses the draft it replaces), and an honest line when the browser refuses
  a write (full, or a private window): the draft is then as it was and Export stays offered. A change typed in the
  300 ms before a reload or a closed tab is caught synchronously and restored at the next open. Where IndexedDB cannot
  open, the bodies go to localStorage and the page says so.
- **Export and import of a card file**: Export downloads `<id>.json`, exactly the bytes `docOf` writes, in the library's
  own file format (an untouched `/2` library card exports byte for byte as its file); Import opens a `/2` card file as a
  new draft only if the validator accepts it, and lists the validator's lines when it does not. Finding 1 of the plan
  (the stub's Import refused `/2` cards) goes with the stub.
