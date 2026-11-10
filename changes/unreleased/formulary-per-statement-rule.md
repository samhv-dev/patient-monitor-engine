### Changed

- **Formulary source check: rule 3 per statement** (plan `docs/plans/learner-action-remote.md` §5, brief 127). A
  compatibility, admixture or stability statement may cite Trissel 2013 for a fact Stabilis does not state, in any
  file, instead of only in a file whose `has.stabilis` is false. Such a statement carries its own Trissel source and
  page (its `src` a `trissel` key with a page, its cross-check `agrees` with that same key); any other form is
  refused. The refusals of Trissel text (strings over 200 characters, a PDF or extracted text in the folder) are
  unchanged.

### Added

- **Formulary schema: three fields** (brief 127). A stability row's `concentration` (amount, unit per mL or per L,
  optional `max` for a stated range, with its source); a stability row's `kind: "stable"` for a "stable for T"
  statement; a product's `inUse` times from its label (hours, temperature, the label's condition). `remaining()`
  takes the preparation's concentration and reads the row whose stated concentration covers it (else a row stating
  none, never the nearest); `prepare()` lists, for each drug, the stability rows that describe it at its
  concentration in the chosen diluent and container. Guide: `docs/guides/formulary.md`.
