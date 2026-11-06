### Fixed

- **"Save and restart the case" restarts a `pme-scenario/2` card, as it does a `/1` card.** Instructor v2's Finish the
  case saved a `/2` run's debrief to the archive and then did nothing: the app's restart hook found the running card
  through `ScenarioDriver.runner`, the `/1` runner only. It now reads the run of either format (the hook is
  `restartSameCard` in `teach2/finish.ts`), so the same card loads again from 0:00 through the app's one load, at its
  first phase with a new phase runner and a fresh record, the room kept. `grade()`, the card formats and the record
  are unchanged.
