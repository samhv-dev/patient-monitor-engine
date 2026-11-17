### Fixed

- **The ventilator's alarms reach the instructor.** In "Severe bronchospasm on the ventilator" the ventilator showed
  "High pressure (Pmax)" while the instructor's alarm line and top bar read "No alarms". The ventilator's page now
  reports each alarm its face shows (the face's own words and priority: "High Pressure" on the EDP-TS face) when it is
  raised, changes priority, is silenced on the ventilator or ends, and the host sends it to the instructor's screens.
  The alarm line under the monitor lists them beside the monitor's, by priority, as "Ventilator: …" in their priority's
  colour, "(silenced)" while the ventilator has silenced them; "No alarms" means neither device alarms; its hint says
  that Shift+S silences the monitor only; a new one is announced to a screen reader. The Devices sheet's alarm list,
  the Log ("Ventilator window: High pressure (Pmax) raised, high priority", "… sound silenced on the ventilator",
  "… ended") and the Debrief (each raise with its end, in its own "Ventilator alarms" lane of the swimlane) name the
  ventilator by where it runs: the Ventilator view, the Ventilator window, or the Ventilator signed in on another
  device. A cockpit that no longer drives the patient (handed over to the engine's own ventilator) shows the patient
  no alarm: its alarms end then.
