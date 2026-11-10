### Added

- **Learner remote L2: the preparation core, pure** (plan `docs/plans/learner-action-remote.md` §L2, §4 D3 and D5,
  §7). Three modules in `packages/controller/src/formulary/`, with no screen, no clock and no network, that the drugs
  menu (L7), the host's apply step (L4) and the instructor's notice (L9) will stand on. `prepare` turns a learner's
  components (a drug, its stocked product, how many vials, mL or mg of it) and a diluent into each drug's amount and
  concentration in the total volume (a powder reconstituted with its label's volume, then the diluent added), the
  findings, and the ready time (the simulation time plus the longest sourced preparation time; at once, with the
  LQ7 gap named, where no source gives one); it refuses a product not in the drug's file and any component whose
  concentration the label does not give. `findings` reports a wrong diluent (one the stocked product's monograph does
  not list, D5 and LQ11), an incompatible or conditional statement, and "not tested" where no source speaks, for the
  diluent and for every pair of drugs in one preparation. `remaining` reads the fraction still intact at a
  preparation's age from the source's own stability points: 1 at age 0, linear between the points, never
  extrapolated (past the last point, its value, flagged). LQ8 (incompatible with no quantity: the full amount, "loss
  not modelled") and LQ9 ("at least x % for T h": 100 % within T) are one switch each, `RULINGS`, at the owner's
  rulings of 9 November. The tests run on a test-only fixture layer of invented drugs and reach every branch of the
  three files. No shipped formulary entry changes; nothing is exported from the package root yet.
