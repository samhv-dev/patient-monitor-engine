### Added

- **The card's questions on the learner handout (Debrief 2 D16)**: `debriefHints` takes an optional
  `handoutQuestions` list in both scenario formats: up to three questions, each `{ at, text }` anchored as an opener is
  (on `pme-scenario/1` a run event, a `state:` one naming a state of the card; on `pme-scenario/2` `start`,
  `pulseLoss`, `rosc`, `phase:<id>` or `action:<id>` of the card). Four questions, an empty text, an anchor of the other
  format or on a state, phase or action the card does not have is refused with its JSON path, and so is a question
  over 92 characters: one printed line of the A4 handout after its time label, measured in Chromium and WebKit print
  (a wrapped question pushes the MH handout over one page: 276.4 mm of 267). The learner handout
  prints the card's questions whose events happened on the kept course in place of its first two fixed prompts (at
  most two, in the card's order), each with its anchor's time as a label and three ruled lines, then the third fixed
  prompt; a place no question fills keeps its fixed prompt. No card carries questions yet: only the questions the
  clinical owner has reviewed enter a card.
