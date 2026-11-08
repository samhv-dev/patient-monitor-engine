### Fixed

- **The Ventilator view's cockpit ventilates again when the view is opened a second time.** Leaving the view hands the
  patient over to the engine's ventilator (the cockpit is paused and its link detached); coming back links it through a
  new link, which learns the cockpit's tick offset from its next frame. A cockpit paused at its clock limit (on a slow
  machine the engine's events come late and the cockpit waits at its limit) sent no frame, so the new link published no
  clock and stepped no fast-forward: the patient was not ventilated while the cockpit's screen looked normal (CI saw a
  2-minute fast-forward with no cockpit frame in 7 runs of 6–7 November). The resume that links the cockpit again now
  lets it run 2·LEAD_TICKS (0.2 s) past its own tick, as before its first clock, so the new link learns its offset.
