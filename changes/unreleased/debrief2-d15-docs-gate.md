### Added

- **Debrief 2 (Option C) is complete; its gate note is `docs/gates/debrief-2.md`.** It lists every piece with the
  pull request that built it: the record keeps systolic, diastolic and CVP, the alarm end and acknowledgement times
  and the CPR stop (D1–D3, #282); "who" from the record, one recognition reading with the `/1` Recognised press, and
  key moments with the new columns (D4–D6, #293); the swimlane with every timed action's expected window (D7a–D7b,
  #291); the card author's hints and openers (D8–D10, #286); the Debrief, the learner handout and the Case briefing in
  Persian (D11, #290; D12, D13, D13b, #325, #326); the card's questions on the learner handout (D16, #312). The PEARLS
  mode table (D14) was withdrawn by the owner's ruling. Still pending, and not claimed: the owner's hand print in
  Safari (the procedure is in the note) and his reading of the Persian entries (all marked unread). No card carries
  hints, questions or a Persian briefing yet.
- **The kit-round reader reads the Debrief 2 page** (`scripts/showcase/kit-round-a.kitround.ts`): each key-time tile
  by its key and state, the swimlane's lanes with their words and the expected windows with their verdict words, the
  hints shown and left out and the handout's card questions; the A3.1 tamponade round also saves the JSON export, and
  both Debrief rounds print the page in Persian by its own switch (Chromium PDFs, WebKit screenshots).
- **The scenario authoring guide documents `debriefHints`** (`show`, `openers`, `handoutQuestions`, their anchors and
  limits) and the recognition (`recognition: true` on a `/2` action; the `/1` tick or Recognised press).
