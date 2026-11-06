### Added

- **Instructor v2 opens a card file.** "Open a card file…" on Instructor v2's start menu reads one JSON card, checks it
  with the controller's `validateScenario` (`pme-scenario/2`, or `/1`) and, if it fails, lists the validator's errors
  and keeps nothing; an id a built-in card has is refused with the reason. A card that passes is kept in this
  browser's storage and listed under "Imported" at the end of the case list, removable, and offered to start; it loads
  through the app's one load, as a library card does. Nothing new is
  sent to the phones and the card format is unchanged. The Scenarios page's own "Import a scenario file" is unchanged.
