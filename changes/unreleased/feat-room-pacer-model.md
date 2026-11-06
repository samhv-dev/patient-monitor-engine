### Changed

- **The pacer follows the room's defibrillator model too (research/41 row 58; owner's ruling of 6 November).** With a
  model set (`device {device:'defib', action:'model', value}`), the pacer's default rate and output, its rate and output
  ranges, its PAUSE behaviour and whether HR reads dashes (and its alarms stay off) while it paces are the model's,
  whatever monitor skin the engine wears; a later skin change and a snapshot keep them. The generic model's pacer is the
  fallback's, equal to the Zoll-style skin's block: 70 ppm, 0 mA, PAUSE drops the output to 0 mA, HR shown. Setting the
  model while the pacer is off selects its default rate and output; a running pacer keeps its settings. With no model set
  nothing changes. A window wearing the LIFEPAK-style skin beside a Saadat-style host paced at 25 % of the rate through
  PAUSE where the host was at 0 mA (ECG II 1.33 mV apart) and dashed the HR; with the room's model the two are equal
  (ECG II difference 0, HR shown on both). The Room card's model line names the pacer.
