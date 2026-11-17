### Fixed

- **The learner remote's monitor strip can be read on a phone.** The strip above the Drugs, Infusions and Labs tabs drew
  the whole upright monitor (every lane and every tile) in 40 % of the screen: the tiles took their full height first,
  so the six lanes got 0–8 px each on 375–768 px wide screens and the bottom tiles were cut off; a tablet on its side
  showed the whole device screen scaled to a third. The strip is now the same renderer told to draw a subset
  (`MountOptions.strip`): ECG lane 1 and the pleth, and the HR, NIBP, arterial (IBP1 or ART), SpO2 and CO2 (or RR)
  tiles, in the style's own look and order, upright whichever way the screen is turned, at 340–400 px high (beside the
  tabs on a phone on its side). Each kept lane is the full screen's lane, so the ECG is drawn at the same gain; every
  lane is at least the 40 px a lane needs for its label and sweep speed (`MIN_LANE_PX`); in ventricular fibrillation
  the strip shows the trace, the HR box as the style prints it and the style's alarm message. A strip tile's sub-line
  shows its parts one under another (in a third of a phone's width "awRR ---  imCO2 ---" was cut).
