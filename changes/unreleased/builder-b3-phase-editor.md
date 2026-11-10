### Added

- **The scenario builder's phase editor (plan `docs/plans/scenario-builder.md` §5.3, piece B3).** The builder's new
  Phases section opens one phase of the card at a time. Its entry rule is a tree an author reads and changes, keyboard
  included: ALL OF / ANY OF / NOT around the schema's five conditions — a measured value against a threshold (with an
  optional "for N s"), a value rising or falling (a rate per minute over a window), a value held unchanged (within ±%
  over a window or since the phase began), after another phase, and a pulse or rhythm signal — each condition picking
  its variable from the format's own list (the schema's truth variables in words with the unit the engine compares in,
  and DC1's plasma and effect-site concentrations of the drugs the validator accepts, in the drug row's own unit; the
  format name shown in `<code>`). Also the phase's hold, label, id (a rename follows every mention in the card), cue,
  Say line and sources; where it may lead, in order, reorderable; a flow line (the phases leading here, this phase, the
  phases it leads to); and, beside every rule, the words Instructor v2 will show, produced by its own `phaseRuleWords`
  and `phaseRowsOf`. A number the schema refuses is not written (the field says what the card keeps), a condition or a
  new phase is added only when complete, and a phase another part of the card names is not removable until those
  change, so no control makes a card the validator refuses. The validator's lines show at the phase, the rule node or
  the `next` row they name; a phase nothing leads to, or one the start cannot reach, is the builder's warning on it.
  Lossless: a card whose phases were opened and left alone exports as its own bytes.
