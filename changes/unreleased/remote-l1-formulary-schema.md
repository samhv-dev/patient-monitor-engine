### Added

- **Learner remote L1: the formulary layer's schema, loader and source check** (plan
  `docs/plans/learner-action-remote.md` §5 and §L1). `packages/controller/formulary/` holds the JSON Schema, an empty
  `sources.json`, `pending.json` with the library's 61 injectable ids, and an empty `diluents/`. No drug entry is
  written yet; that is batch FS. `checkFormulary` and `loadFormulary` (exported from `@pme/controller`, with the
  layer's types) apply §5's six rules: every number has a `src` that resolves, or is a gap naming an owner question;
  each source kind has its required fields (Trissel by the 17th edition, 2013, and page); every statement cites
  Stabilis (Trissel only where Stabilis has none) and carries Trissel's cross-check, and a `differs` carries a ruling;
  the files and `pending.json` cover the 61 ids exactly; every string is at most 200 characters. The CI check
  (`test/formulary/sources.test.ts`) shows each rule failing on a fixture built to break it. It also refuses a PDF
  anywhere under `packages/`, and any non-JSON or oversized file in the folder. New guide:
  `docs/guides/formulary.md` (how to write an entry, which source answers what, the copyright rule, the `has` field),
  linked from the scenario-authoring guide.
