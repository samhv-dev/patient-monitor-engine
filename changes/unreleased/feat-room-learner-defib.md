### Added

- **The learner defibrillator window presses Charge and Shock (Room plan R5d)**: the `#/defib` window has two buttons,
  Charge and Shock (44 px, always enabled), and says its hello as `defib`. The host applies a `defib` peer's command
  only if `learnerDefibMay` passes, checked on the host whatever the relay did (a window of the same browser has no
  relay), then through the instructor's own path into the engine: the engine's validation, the room's energy (no
  `energyJ`), the same shock outcome table. It files the press as the learner's (`issuedBy: 'learner'`, the device key
  of the window's hello as the command's new optional `by`). A refusal comes back in the ack and the window shows it in
  the device's words ("Not charged"). Every press is a record row of kind `learner` with the device's key, its name
  from Room setup and the device's energy, and the Debrief's timeline reads "Shock 120 J at 04:12, by Defibrillator
  (bed 2)", else "Defibrillator window n". Room setup's remembered layout keeps a keyed defibrillator window as a
  device that shows the defibrillator.
