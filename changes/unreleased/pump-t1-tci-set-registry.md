### Added

- **Engine: the TCI-set registry and its source check (pump-rack plan, T1).** TCI model sets are going to live as data
  with their sources, in `packages/engine-core/src/l2/pk/tci-sets/`. Each set is a function of the patient typed into
  the pump plus a metadata row: the paper with its DOI or PMID, the table, the population, the covariates, the ke0 and
  its source, the sampling site, the paper's worked values and the two readers. A CI check refuses a set that breaks
  any of seven rules, and each rule has a fixture made to break it. The registry ships empty: piece T2 enters the
  engine's six sets. Nothing in the engine reads the registry yet, so behaviour does not change. How to add a set:
  `docs/guides/tci-sets.md`.
