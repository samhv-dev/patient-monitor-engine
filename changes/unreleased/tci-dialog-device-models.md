### Changed

- **The TCI dialog says which models the Mindray BeneFusion SP5 TCI holds.** The simulator still offers every model
  it has registered (Eleveld, Modified Marsh and Shafer fentanyl among them), and each model the pump's library
  (`pump-devices/sp5-tci.json`, from its brochure) lacks reads "· not on this pump", with a line naming the models the
  pump holds for that drug. For a model the pump runs on a plasma target only (Marsh), the effect-site choice reads
  "· plasma only on this pump". A patient outside the brochure's age column for a held model sees the pump's stated
  range beside the patient's age. The Log and Debrief line of a pump TCI on a model the pump does not hold ends
  "not a model the Mindray BeneFusion SP5 TCI holds", and one on an effect-site target for a model the pump runs on
  plasma only ends "a model the Mindray BeneFusion SP5 TCI runs on a plasma target only". Nothing is refused: every model and target can still be started.
