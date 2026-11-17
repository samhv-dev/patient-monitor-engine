### Changed

- **The QRS tone in ventricular fibrillation.** The beat detector's tone sounds on coarse VF only until the monitor
  calls VF (the VFIB alarm, 3 s after the onset), then it is silent; on fine VF (below the rhythm library's 0.2 mV
  coarse/fine boundary) it is silent from the onset. Before, the tone kept beeping irregularly through VF (82–94 a
  minute on coarse VF, 4–24 on fine). Every other rhythm, asystole and PEA among them, and the tone's pitch are
  unchanged. Recorded in the style data's `beep.source` note as a clinical ruling and an engineering value until a
  recording of a real monitor in VF is in hand.
