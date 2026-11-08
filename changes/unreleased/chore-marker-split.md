### Changed

- **The engineered-value marker is two markers (research/44 L2-61, step 1 of its correction order).** `[ENG: kind]`
  now marks only a number that is not physiology and says which kind (numerics, device, display, ui, network,
  scenario, control, conversion, measurement, texture, unused, test); `[FIT: target; src … | brief …]` marks a value
  fitted to a physiological target and names its source or the mechanism-brief id that will retire it
  (docs/DESIGN-BRIEF.md, "Confidence tags"). Every `[ENG]` and variant tag in `packages/` and `apps/` was re-tagged:
  488 `[ENG: kind]`, 587 `[FIT]` with a brief id (10 of them also with a source), and 70 values picked inside a
  sourced range now carry that citation instead of a tag. `scripts/ci/markers.mjs`, run in CI's `changes` job, fails
  on a bare or variant `[ENG]` and on a `[FIT]` with neither a source nor a brief id, and prints the counts. The model
  docs show the new tags. No numeric value changed.
