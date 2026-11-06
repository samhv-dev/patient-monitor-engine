### Added

- **The ventilator's wire (Room plan R8a, R8b)**: a `ventilator` role that signs in with the instructor's PIN (a
  ventilator hello without one is refused) and a `vent` message whose body is one of the ventilator link's messages
  (`cmds`, `lungState`, `clock`, `run`, `time`, `control`, and the new `settings`); a `cmds` carries an integer tick and
  at most 6 commands, each the cockpit's VentFrame, the airway or a stand-in target, and a body is at most 4 KB. The
  relay admits ONE ventilator socket pending, as it admits an instructor, under the same per-address PIN limits;
  granted, `vent` runs between it and the host only — never to a learner or an instructor, never cached — and a socket
  past 120 `vent` a second is closed (`too-many-tries`). The host lists the ventilator in its `devices`; learners'
  traffic is unchanged. Nothing sends `vent` yet: the host's side and the cockpit's window follow (R8c, R8d).
