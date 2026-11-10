### Added

- **A `pme-scenario/2` phase rule can read a drug's concentration in the patient (DC1, the owner's BQ11 = B).** A
  `value`, `slope` or `unchanged` leaf takes `cp:<drugId>` (plasma) or `ce:<drugId>` (effect site) besides the
  `truthVar` names, e.g. "when effect-site propofol falls below 1.5 µg/mL". The value is the patient's own, the drug
  panel row's `cp`/`ce` from the engine's 1 Hz `drugs` event (0 for a drug not given), never a TCI pump's target or
  prediction, in the panel's unit (propofol µg/mL, the opioids and NMB agents ng/mL, the vasoactives µg/kg/min
  rate-equivalents). The validator refuses an unknown drug and a drug with no compartment model (the effect-curve rows
  midazolam, ketamine, dexmedetomidine and the other "× ref dose" rows, the inhaled agents, the blood-model rows), each
  with the reason; the card reader words the leaf ("plasma propofol > 4 µg/mL"). A card whose rules read no
  concentration is fed nothing new: every existing card runs as before.
