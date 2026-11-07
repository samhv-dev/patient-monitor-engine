### Added

- **IBP1 / IBP2 lane scales (E130)**: per channel the skin's fixed scale, a range the instructor types within 0–200
  mmHg (lower below upper; anything else refused), or AUTO, set in the Devices tab of today's Instructor view and in
  Instructor v2's Devices sheet, which show the mode and the numbers. AUTO is judged every 30 s of sim time over the
  two 30-s windows before the boundary, never beat by beat: the smallest of 0–60, 0–100, 0–160, 0–200 (arterial) or
  −10–30, 0–60, 0–100, 0–160, 0–200 (venous) that holds the window with 10 % headroom, two outlier seconds ignored,
  stepping down only when two windows in a row fit (no vendor manual read states an interval: Philips IntelliVue's
  Optimum Scale is one-shot, Mindray's Auto gives none; the ranges are GE CARESCAPE's display scales up to the ruled
  200). The dotted scale lines and the printed values follow. The scales travel with the monitor style to the
  second-screen learner monitor and to the phones, which judge AUTO from the same samples at the same boundaries and
  so draw the same range. **Changed:** the Saadat-like arterial lane's fixed scale is the ruled 0–200 (marks
  200 / 100 / 0); the photo-matched 40 / 120 / 200 goes. The Philips-like scales are unchanged. (`@pme/renderer`
  `ibp-scale.ts`, `renderPlan`'s `ibpScales`, `MonitorCore.setIbpScales`, `MonitorHandle.setIbpScales`; the
  controller's `style` event gains `ibp`.)
