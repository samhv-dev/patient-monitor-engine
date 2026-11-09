### Fixed

- **The session clock keeps real time on a busy computer (brief 105, defects N25 and N26).** Each frame's wall time
  used to be clamped to 250 ms, so every slower frame lost the rest in silence: with frames every ≈ 400 ms (a starved
  laptop or CI runner) the body ran at 0.6 of real time, and every drug onset, phase rule and debrief moment ran late
  with it. The whole wall time is now owed and run in the engine's own 20-ms ticks within a 50-ms budget per frame; what
  the budget leaves runs on the next frames. When the computer cannot keep up even so, the monitor says so: the
  Instructor view's clock pill reads BEHIND, a toast names how far, and the session log records when the engine fell
  behind and when it caught up. The monitor's clock starts at its mount, so a worker's start-up no longer delays the
  body behind the session clock, and a staged delivery's onset bar runs from the tick the engine applied it at.
