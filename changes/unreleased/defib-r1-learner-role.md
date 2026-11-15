### Added

- **The learner defibrillator screen's boundary (defibrillator plan R1; DQ6 = A, DQ5 = A)**: `LEARNER_DEFIB_M2`, the
  table of what an admitted learner defibrillator screen may send, exactly the ZOLL M2 controls of plan §5.1 as E0's
  vocabulary carries them, and `learnerDefibM2May`, which checks a command's shape and fields against it (the engine
  validates the values at dispatch). `M2_DEVICE_ACTION_CLASS` classifies every `device defib` action of the vocabulary
  (learner, refused, Room setup), and a test fails on a key added later until it is classified. A `defib` hello may now
  carry the learner PIN; the relay then holds the socket pending until the host's grant, passes only the M2 table once
  granted, at most 7 commands a second (the face's knob, its final value and Shock down and up), and logs every refused
  `defib` command. The window with no PIN keeps exactly its two presses. Until R2 the host grants no `defib` hello, so
  the table is inert in a room.
