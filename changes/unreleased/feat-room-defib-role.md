### Added

- **The learner defibrillator role (Room plan R5c)**: a `defib` hello for the defibrillator window, which joins as a
  learner does (no PIN, a learner's place under `--max-peers`, `show`/`device` legal) and follows as a viewer (lean
  copies). `LEARNER_DEFIB_COMMANDS` holds exactly two shapes, `applyEvent defib charge` and `applyEvent defib shock`,
  each bare (no `energyJ`, `outcome` or `atTick`: the room's model sets the energy), and `learnerDefibMay` checks a
  command against them. The relay forwards only those two to the host and routes the host's ack back, answers
  `forbidden` to any other command or a `vent`, closes a `defib` socket past 4 commands a second (`too-many-tries`),
  and answers `forbidden` to a hello as another role on any non-host socket. Learners' traffic is unchanged. Nothing
  sends `defib` yet: the host's re-check and the window's buttons follow (R5d).
