### Changed

- **Validation: the five waveform-regression baselines are re-recorded, and each drift is named (brief 73).** The
  pleth and CO2 baselines dated from 2026-09-27. A first-parent bisect of main attributes every changed sample to
  four merged engine pull requests: #24, #25 and #138 for the pleth, #25 and #28 for the CO2. Main reproduces the
  last of them exactly. Only those five arrays changed. The 2 % limit, the other eight channels and the golden
  hashes are untouched. A physiology check of each drift (brief 76) accepts four and withdraws one: sinus-75 pleth
  keeps its 27 September baseline and stays outside it (an expected failure since brief 84), because its pulses grew against the physiology (the PI reference
  SV₀ is not the patient's settled resting stroke volume).
