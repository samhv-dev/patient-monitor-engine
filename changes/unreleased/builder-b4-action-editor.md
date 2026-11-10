### Added

- **The scenario builder's action editor (plan `docs/plans/scenario-builder.md` §5.4, piece B4).** The builder's new
  Actions section (outline, "The team") opens one of the card's actions at a time and makes what it grades editable: its
  kind (the schema's eight, each with the criteria block the validator asks for, a change of kind asking for the new
  kind's criteria first); a drug action's identity (a drug of the engine's library, a class, or alternatives each with its
  dose), its dose (value, tolerance, accepted range, unit from the Drug sheet's own lists), its cumulative ceiling, its
  route set with each route's modelled state for that drug (modelled; modelled with no systemic effect; not modelled, the
  validator's warning) and the preferred route, its rate (a bolus, given over a time, an infusion) and a card's diluent
  criterion; a device's or a decision's settings; a fluid's types, volume and rate; a sample's panels. Also the window
  (its anchor: the start, a phase, an action, each taking of an action, the pulse loss, ROSC or a truth rule; within, not
  before, failed after), the repeat or the conditional repeat, the precondition, the violations (what they match, where and
  when, whether the harm is modelled), the commands a press sends (added from the Drug sheet's own form and builders, so a
  press gives what the sheet would), the switches "not graded" and "preparation step", and the card's recognition. Beside
  the action: the row Instructor v2 draws for it (its own `phaseRowsOf`) and worked examples of how `grade()` grades a few
  gives on a short course the builder writes (as prescribed, under the dose, by an allowed but not preferred route, by a
  route outside the set with the violation it raises, late, never): `grade()`'s own rows, unchanged. The rules
  (precondition, conditional repeat, rule anchor, a violation's condition) are the phase editor's rule tree, now shared.
  A number the schema refuses is not written (the field says what the card keeps), a new block, window, repeat, violation,
  command or action is written only complete, so no control makes a card the validator refuses. The builder warns (never
  blocks) when a press as written is not graded met, when an accepted range has its lowest above its highest, and when an
  action is open in no phase the case can reach. Lossless: an action opened and left alone exports as the card's bytes.
