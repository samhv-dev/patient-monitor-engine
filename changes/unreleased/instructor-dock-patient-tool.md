### Changed

- **The Instructor dock as the owner ruled it on 12 November (brief 208).** The tools read Drug, Airway, CPR, Patient,
  Devices, Log (Labs enters after Log with its own piece).
  - "Defib · CPR" is now "CPR", on the tool, on its sheet's title and in the scenario builder's groups. The sheet holds
    what it held (the defibrillator, pacing and CPR) and its group tab still reads "Defib, pacing & CPR".
  - Vitals and Patient are one tool, "Patient": one sheet with two tabs, "Vitals & rhythm" first and "Patient & events".
    The tool, a tap on it and the V key always open it on "Vitals & rhythm". The sheets' tab row now answers the arrow
    keys, Home and End (the WAI-ARIA tabs pattern), so the second tab, and the Drug sheet's groups, are reachable by
    keyboard.
  - Free roam begins with the Patient sheet open over ACTION; it stays until the instructor closes it.
  - No hold in a modelled run, on the laptop: in MODELED a value the model computes shows its live value and how to
    change it (through its cause, or by switching to MANUAL), with no Set and no "Return to model". Values the model
    does not compute (the pacing capture threshold) stay settable; MANUAL is unchanged. A value held from elsewhere (a
    card's script, the instructor's phone) shows "Held" and the release of that row. The instructor phone's panel, the
    engine's hold command, the protocol and the card format are unchanged.

### Fixed

- **At 1280 px the dock's marks no longer slide under "Recognised" while something is staged.** The marks group shrank
  below its three buttons; it now keeps its width, and the note field gives up width first (from 200 px down to 96 px).
