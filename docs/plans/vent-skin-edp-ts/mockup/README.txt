Mock-ups of the EDP-TS-style ventilator face, drawn 2026-11-10 for docs/plans/vent-skin-edp-ts.md (brief 141).

  m1-main.html / .png     the main screen, SIMV(VCV)+PSV, with Exp. Sensitiv. selected (target state after piece V6)
  m2-modes.html / .png    the Mode key: Operative Modes and Other Operative modes (state after piece V1)
  m3-alarms.html / .png   a high-priority alarm and the Alarm Limits window (after V3)
  m4-menu.html / .png     Menu pressed twice: Ventilatory adjuncts, with the controls the model does not honour
  face.css                the proposed tokens of the face's stylesheet (plan §2.12), each with its photograph
  face.js                 draws the device from plain shapes, and an illustrative breath sequence for the traces
  capture.sh              the PNG captures (Chrome headless, 1180 x 870)

Product (what the plan proposes the face shows): the regions and their order (plan §2.2), the device's on-screen words
(§2.13), the keys and lamps (§2.3), the mode and menu rows (§2.4, §2.9), the alarm-limit values of the department's
device (§2.10), the unavailable rows and their reasons (§3, anti-goal A1).

Illustrative, not product: every trace and loop (a breath sequence drawn by face.js, not the simulator's output and
not traced from a photograph), every monitored number in the top row and left column, the date and time, the exact
pixel sizes, the hardware drawn around the screen (positions approximate; the bezel plain, no mark), the "needs piece
Vn" wording. No photograph, video frame or manual page is used or embedded; the colours are measured tokens (face.css).
