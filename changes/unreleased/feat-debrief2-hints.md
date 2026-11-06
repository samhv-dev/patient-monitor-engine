### Added

- **The card author's hints for the Debrief (Debrief 2 D8)**: both scenario formats take an optional
  `debriefHints` block: up to four `show` lines ("What this case is built to show") and up to four `openers`, each a
  sentence anchored on an event (`at`: on `pme-scenario/1` a run event, a `state:` one naming a state of the card; on
  `pme-scenario/2` the anchors the report reads: `start`, `pulseLoss`, `rosc`, `phase:<id>`, `action:<id>` of the card).
  Five lines, an empty line, an unknown key or an anchor on a state, phase or action the card does not have is refused
  with its JSON path. No card carries the block yet: the showcase cards' lines are drafted for the owner, and only the
  lines he accepts enter a card.
