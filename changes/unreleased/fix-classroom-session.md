### Fixed

- **Classroom defects, the session (post-demo).** "Restart patient" during a case starts the case again from 0:00 on its
  own patient and keeps the bookmarks; a "Return here" brings back the case its mark holds on every controller (and to
  a late joiner), where after a restart they showed "No scenario" (FX-12). A `setTarget hr` sent in MANUAL is released by
  the switch to MODELED, so the reflex owns the rate again (FX-10). A phone's "(paused)" follows the host's own state
  after the instructor reloads, and a Remote's resume while the instructor's tab is hidden is the only resume, with no
  toast (FX-22). The app seeds the engine from the card's `seed` (it always used 7; TCH-11). The host applies a stage
  group in one dispatch to the monitor (`HostTarget.dispatchGroup`, `MonitorHandle.dispatchAll`, the worker's
  `commands` message), so its commands land on one tick under load — the scenario runner's groups and a controller's
  staged delivery, which the host holds until its `batch.n` items are in (`BATCH_HOLD_MS`) (R15).
