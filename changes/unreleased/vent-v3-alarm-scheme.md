### Added

- **Ventilator: the EDP-TS face's alarm scheme (plan vent-skin-edp-ts.md, piece V3).** The ventilator model gains five
  alarm conditions the EDP-TS has (Low pressure, Continuous high pressure, High PEEP, High and Low O2 concentration),
  each evaluated only when its limit is in the configuration, so the Hamilton-style face and the reference scenarios
  raise exactly what they raised before; `silenceAlarms` takes a duration (120 s by default, as before). The cockpit
  core gains an alarm view that applies a face's alarm profile on sim time: each alarm signalled after the manual's delay
  (Disconnection 5 s, minute volume 10 s, low tidal volume 20 s, O2 30 s, High rate 30 s, Continuous high pressure
  15 s, ...), one message at a time (the highest priority), the lamp of an alarm whose cause has ended staying lit and
  steady until Esc, the silence key's 30 s for one press and 60 s for two (audio only), and every alarm raised and ended
  with its time. On the EDP-TS face the controls that said "needs piece V3" are live: the O2, High PEEP and minimum
  pressure tags and Alarm settings rows, the silence key, Esc's lamp reset, Ctrl + Alarm Limits (the alarm test) and
  Tools → Settings → Sound. The tones' pulse counts are the manual's; their pitch is the simulator's until the owner's
  recording. Drawing the flashing lamps, the latched lamp and the silenced state waits for the face's redraw.
