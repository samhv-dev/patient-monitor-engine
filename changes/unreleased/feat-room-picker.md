### Added

- **The device that scans the room's QR chooses what it shows (Room plan PR 2: R3, R2, R4)**: the QR's address now
  ends `#/pick`, which opens an instrument picker built from the owner's mock-up m5 — Learner monitor (first and
  preselected: one tap), Patient monitor (`#/monitor/wide`, landscape), and the Ventilator, Depth of anaesthesia ("Not
  available yet") and intra-aortic balloon pump ("Coming later") cards without an action. The choice is kept on the
  device and preselected next time; "Change" under the monitor goes back to it; `?join=CODE` without a hash opens the
  learner monitor as before. A viewer's `hello` may name what it shows (`show`) and the device's own key (`device`),
  refused on any other role or value; the relay measures each device's ping at its 10-s heartbeat and lists every
  device for the host only (`devices` in the host's `peers` frame: 7.6 KB at 60 devices). The QR grows from version 3
  to version 4 for the kit's usual address (29 → 33 modules).
