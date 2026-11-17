### Added

- **The EDP-TS ventilator face: holds and respiratory mechanics.** The Insp/Exp Pause key holds while it is held: in
  inspiration the valves close at its end (at most 7 s), in expiration at its end (at most 20 s), in VCV and PCV; the
  left column shows the plateau. The Respiratory mechanics key opens the device's tests: auto-PEEP (an end-expiratory
  occlusion of 0.75 s), compliance and resistance, trapped volume, and P0.1 (the held pressure's drop in the first
  100 ms of the patient's next effort, on an end-expiratory occlusion); Esc cancels a test, and one whose valves cannot
  close is stopped; slow vital capacity, PV flex, Pimax and VD/VT are drawn and say why they are not simulated. Patient's Data
  (Menu, two pages) shows VE Mandat, VE Spont, F Spont, TCexp, F/VT, Cdyn, Ti/Ttot and, once their hold has been made,
  Cst, Ri, Re and auto-PEEP, by the manual's formulas; what the model does not have shows "---". Ri shows only for a
  breath the ventilator gave at a constant flow, the only flow the manual's formula reads the resistance of; for a
  descending or pressure-controlled breath it shows "---" and says why. Cdyn reads each breath against its own PEEP. A hold ends with no
  result when the circuit opens, on a reset, or when the mode or the set PEEP changes; a reset or a new patient
  clears every value. Also on the face: Manual
  Insp., Freeze (left with Freeze or Esc), Save loop with its reference loop and Ctrl + Graphics, the Graphics window's
  screens (the CO2 one not simulated), the curves' scales and their position with the knob, Autoscale in Tools, the
  "?" key's help for every key and the causes and remedies of the active alarm, and the screen lock (the padlock held
  2 s; an alarm unlocks it).

### Changed

- **The ventilator model's expiratory hold can close at the end of expiration** (`expHoldAt: 'end'`, off unless set):
  on the step the next breath would start, so it holds PEEP total; released, it gives the breath it held back at once,
  and `cancelHold` ends it giving none. With `holdEffort` (off unless set) a held airway carries the patient's effort,
  PEEP + recoil − Pmus. The Hamilton-style face keeps its hold, 0.3 s into expiration and blind to the effort.
