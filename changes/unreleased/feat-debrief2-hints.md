### Added

- **The card author's hints on the Debrief (Debrief 2 D8, D9)**: both scenario formats take an optional
  `debriefHints` block: up to four `show` lines and up to four `openers`, each a sentence anchored on an event (`at`:
  on `pme-scenario/1` a run event, a `state:` one naming a state of the card; on `pme-scenario/2` the anchors the report
  reads: `start`, `pulseLoss`, `rosc`, `phase:<id>`, `action:<id>` of the card). Five lines, an empty line, an unknown
  key or an anchor on a state, phase or action the card does not have is refused with its JSON path. The Debrief prints
  the block on page 2 after the key moments, under "From the card's author": "What this case is built to show" (the
  lines as written) and "Openers for the analysis" (each opener as written, its anchor's time and key-moment number
  beside it as a separate label, e.g. "08:03 · moment 7"; an opener whose event did not happen on the kept course is
  left out and counted: "1 opener not shown: its event did not happen in this run"). The section is absent when the card
  has no hints, does not split across pages, and never appears on the learner handout. No card carries the block yet:
  only the lines the owner accepts enter a card.
