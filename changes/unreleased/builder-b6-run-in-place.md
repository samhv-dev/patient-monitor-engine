### Added

- **The scenario builder runs a draft in place (plan `docs/plans/scenario-builder.md` §6, piece B6).** "Run in place",
  enabled when the validator has no refusal, saves the draft, keeps it in the kit's folder when the kit runs on Node,
  and loads it into this computer's session as a draft card: the document itself through the session's own load, never
  the library, the imported cards, Recent or a position kept for a reload. Instructor v2 opens with a run panel beside
  it: +2 and +5 min, "To the next phase" (a fast-forward that stops at the first phase change, at most 30 min: a stop
  in the host's own fast-forward loop, called on the laptop only, `HostSession.fastForwardToNextPhase`), "Back to a
  phase's start" (the stage marks), "Apply my edits and restart", and "Apply from this phase's mark" (allowed only when
  the edit keeps the card's id, its patient, every phase and action the run named and every rule's leaves in place; a
  threshold changed in place starts its hold again; otherwise the line under it says why). "What fired, and why" lists
  each phase entry with each leaf of the rule that fired, the value it read and its threshold; each action that opened,
  came due, was given and graded; each script entry. The phase runner records those reads itself at the entry
  (`PhaseEntry.why`, and `firedT` beside `fired`, both optional: a state written before keeps restoring), so the page
  recomputes nothing. `ScenarioDriver.reviseMarks` makes the run's marks hold an edited card.
