### Fixed

- **A ventilator tablet back from a Wi-Fi drop no longer undoes the instructor's ventilator change made during the
  drop.** When the host handed the patient to the engine's own ventilator after 1 s of silence, frames the tablet's
  browser had held on its old socket could still arrive once the network returned. They came from the same, still
  granted, id, so the host let that cockpit drive again, and when the old socket closed it handed the patient over
  with the cockpit's settings from before the drop (12/500/5 over the instructor's 16/450/6, main run 42570518946).
  A silence hand-over now revokes that cockpit's id (`VENTILATOR_REASONS.silent`, `HostSession.revokeVentilator`).
  A later message from it is refused and never drives, and its end hands nothing over. The tablet signs in again at
  once on a new socket and takes over from the engine's settings at that moment.
