### Added

- **Tests: the infusion-pump rack's baseline (pump-rack plan, S0).** Four engine tests pin how infusion and TCI behave
  today, so that each later piece changes them knowingly: a `tci` event's `model` replaces the patient's own PK model;
  two `infusion` events of one drug leave one rate (the second wins); the TCI maximum rate uses the drug row's default
  syringe, not the one last loaded; and the TCI controller reads the patient's own clearance, so a halved liver flow
  lowers its rate and the patient's effect site stays on target (the oracle the plan's §1.3 describes). No behaviour
  changes.
