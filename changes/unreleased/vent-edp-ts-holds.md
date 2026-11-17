### Added

- **The EDP-TS ventilator face: holds and respiratory mechanics.** The Insp/Exp Pause key holds while it is held: in
  inspiration the valves close at its end (at most 7 s), in expiration at its end (at most 20 s), in VCV and PCV; the
  left column shows the plateau. The Respiratory mechanics key opens the device's tests: auto-PEEP (an end-expiratory
  occlusion of 0.75 s), compliance and resistance, trapped volume, and P0.1 (the patient's own effort, not an
  occlusion); slow vital capacity, PV flex, Pimax and VD/VT are drawn and say why they are not simulated. Patient's Data
  (Menu, two pages) shows VE Mandat, VE Spont, F Spont, TCexp, F/VT, Cdyn, Ti/Ttot and, once their hold has been made,
  Cst, Ri, Re and auto-PEEP, by the manual's formulas; what the model does not have shows "---". Also on the face: Manual
  Insp., Freeze (left with Freeze or Esc), Save loop with its reference loop and Ctrl + Graphics, the Graphics window's
  screens (the CO2 one not simulated), the curves' scales and their position with the knob, Autoscale in Tools, the
  "?" key's help for every key and the causes and remedies of the active alarm, and the screen lock (the padlock held
  2 s; an alarm unlocks it).

### Changed

- **The ventilator model's expiratory hold can close at the end of expiration** (`expHoldAt: 'end'`, off unless set):
  on the step the next breath would start, so it holds PEEP total; released, it gives the breath it held back at once.
  The Hamilton-style face keeps v1.9's hold, 0.3 s into expiration.
