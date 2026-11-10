### Added

- **The `/2` card format and its grader know who gave a drug and how it was prepared (plan learner-action-remote.md
  L5, §6).** A give from a learner's device is now recorded as `source: "learner"`, with the device key in `by`.
  A give that names its preparation carries a copy of the host's record of it (`prep`): the product, the diluent,
  the concentration and volume, the formulary's findings, the incompatibility notice, the fraction still intact and the
  active amount. A learner's infusion change records the rate it replaced and who had set it (LQ4). A lab sample is
  recorded as a `sample` with its panel. Cards can use two new optional fields. `drug.diluent` gives the deviation
  line "diluent saline, water asked". `sample.panel` lets a learner's or the instructor's lab sample satisfy a sample
  action. Independent of any card, `grade()` lists the run's `preparations`: a wrong-diluent or incompatible
  preparation is a deviation while staged and a `source: "formulary"` violation once delivered. Its harm is "modelled"
  when the source's figures reduced the active amount. The runner state gains an optional `preps` list. A state
  written before this restores unchanged, and a card that uses none of it grades exactly as before. The host wiring
  (L4) and the Debrief's preparations section (L13) are later pieces.
