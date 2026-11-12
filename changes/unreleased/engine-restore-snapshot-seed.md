### Fixed

- **A restored engine continues under the snapshot's seed, so a follower shows the host's values (finding N109, brief
  186).** Every random stream is seeded from hash(seed, name); the running ones travel in the snapshot's state, but one
  that starts after a restore (the EEG's signal and artefact streams, created at `device eeg on`) was seeded from the
  restoring engine's own seed. A tablet or phone that followed the host and was created under a different seed drew
  different EEG samples once the EEG was switched on after it joined, and its own snapshot named its own seed.
  `restore()` now adopts the seed the snapshot has always carried; a snapshot without a whole uint32 seed (hand-made
  or damaged) still restores and keeps the restoring engine's seed, because nothing in it names the host's. An engine
  that never restores is unchanged.
