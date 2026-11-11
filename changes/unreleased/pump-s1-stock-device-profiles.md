### Added

- **Stock syringes and the reference pumps' device profiles, as sourced data (pump rack S1).** The formulary gains
  `stock-syringes.json`: the syringes and bags a pump channel can load without the bench, only products used at their
  labelled strength, each from its own monograph (the owner's ruling PQ7 = B): propofol 10 mg/mL in 50 mL and 20 mL,
  and phenylephrine 100 micrograms/mL in 20 mL; no bag, because no formulary product is a drug supplied in a bag. The
  controller gains `pump-devices/` with one profile per reference pump: the JMS SP-500 syringe pump (syringe sizes, a
  flow-rate range per syringe size, the 0.1 mL/h step, the rapid flow rate per size, occlusion levels, alarms), the JMS
  OT-701 drip pump (15, 20 and 60 drops/mL sets with their ranges, the 1 mL/h step, volume limit, purge and KVO rates,
  occlusion pressure, alarms) and the Mindray BeneFusion SP5 TCI (its TCI features; every mechanical number a gap,
  because the maker's public page gives none). Every number cites a row of the new `research/50-pump-reference-devices.md`,
  which gives each its catalogue page, or is a gap naming what the operator manual must give; the formulary's source
  check fails a stock item or a profile number without either. Nothing a learner sees changes yet: the host (C2) and
  the pump page (A1) read them later (docs/plans/pump-rack-tci.md, piece S1).
