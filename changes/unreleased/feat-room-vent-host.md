### Added

- **The host drives from a remote cockpit (Room plan R8c)**: a `ventilator` signed in with the instructor's PIN gets
  its own single place on the host (the newest right PIN takes that place over and the first is told; an instructor
  phone's grant is untouched; the PIN change revokes both; its `command` is refused). The host drives its engine from
  the granted cockpit's frames exactly as the Ventilator view does (the engine stays the master clock, frames are
  stamped on the host, mirrored to a same-browser learner monitor, and every phone holds while it drives), one cockpit
  at a time: opening the view or a remote hands the other over first. When the remote's page is hidden, its socket
  closes, its grant is revoked, or it is silent for 1 s, the engine's own ventilator takes the patient with the
  cockpit's last settings, once, and the phones follow. A new relay port (`@pme/ventilator`) sends the cockpit's
  `cmds` of each 20 ms of wall time in one `vent` (400 ticks a second at ×8 went in 38.5 messages a second, under the
  relay's 120), and its settings on every change and once a second. The cockpit's own page over the relay is R8d.
