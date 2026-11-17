### Fixed

- **The instructor's "Circuit disconnected" and "Apnoea" now act on a patient ventilated from the ventilator's own
  screen.** The breathing circuit is one: whoever opens it (the instructor, or the ventilator's own disconnection), the
  engine's airway carries it to the ventilator, which reads it with its own sensors. Its delivered and exhaled volumes
  fall to zero, the airway pressure falls to ambient, and it raises its own alarm by its own rules: the EDP-TS's
  "Disconnection" 5 s after it detects it, and the Hamilton-style banner's "Disconnection on patient side". The
  capnograph sees no breath and the saturation falls from the lungs' oxygen store. "Apnoea" stops the patient's own
  effort under any ventilator. In a controlled mode delivery is unchanged. In a spontaneous mode the device's apnoea
  time runs out and its alarm is raised: the EDP-TS starts its backup ventilation, and the Hamilton-style face keeps
  its safety breaths. "Patent" restores both. The instructor's Airway sheet says which airway event acts now.
- **A cockpit that comes back after handing the patient to the engine's own ventilator keeps its own mode.** Before,
  leaving the Ventilator view and returning turned a spontaneous mode into (S)CMV+ with the rate and volume it had
  measured. It now takes the engine's settings only when the instructor or the case changed them in the meantime. A
  cockpit that links again also learns at once of any airway event made while it was not linked.
