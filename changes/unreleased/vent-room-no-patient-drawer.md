### Changed

- **A ventilator linked to a room has no Patient drawer.** The Hamilton-style face's Patient drawer (presets, lung,
  effort and asynchrony examples; opened by the rail's "Patient" and the "Utilities" tab) and the EDP-TS face's
  "Simulator" handle to it are not in the page of a ventilator in a room: the app's Ventilator view, Room setup's
  ventilator window, and the ventilator signed in on another device. The patient there is the room's and the
  instructor's. The stand-alone ventilator page, the ventilator-and-monitor page and the single-file embed keep it.
- **The room's host takes from a ventilator only what a ventilator sends**: its breaths, its own circuit at the
  Y-piece and its settings (`ROOM_VENT_MAY_SEND`, `@pme/ventilator`). Any other command (a profile's stand-in targets
  among them) or link message (a pause or a speed change among them) is refused with its reason and logged.

### Fixed

- On the stand-alone ventilator page, Tab no longer walks into the closed, off-screen Patient drawer: closed, it is
  inert (out of the Tab order and the accessibility tree).
