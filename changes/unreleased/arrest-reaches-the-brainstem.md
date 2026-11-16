### Changed

- **A MANUAL patient stops breathing in a cardiac arrest.** The brainstem-perfusion gate that already stopped the
  MODELED drive (gasps after 30 s without brainstem flow, apnoea by 2 min, the effort withdrawn while pulseless, the
  breathing back over 2 min once the circulation returns) now also acts on the instructor's respiratory rate and tidal
  volume in MANUAL mode. Before, a MANUAL card such as "Witnessed VF in PACU" kept breathing at the set rate, with the
  impedance RESP wave and a capnogram, through ten minutes of no flow. The instructor's rate is kept as the perfused
  patient's own pattern: while the gate holds the breaths below it the rate shows the override flag, and a rate set
  during the arrest takes effect once the brainstem is perfused again. A ventilator's or a bag's breaths are not gated.
  New validation documents check apnoea 6–7 min into untreated VF in both modes (Zuercher 2010; Bobrow 2008) and the
  return of breathing after the circulation returns (Jørgensen 1997).
