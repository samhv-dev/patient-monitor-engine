### Added

- **EEG stage, part 4: the generic processed-EEG monitor on the BFA tile.** With `device eeg on`, a device reads the
  frontal EEG the way a monitor does, from the samples and the electrode impedance only (`l3/eeg-devices/`, labelled
  "Processed EEG (generic)"; no maker's algorithm): the spectral edge frequency (95 %, the owner's placeholder P-14),
  the median frequency and the band powers of Miller's Table 36.1 from 2-s epochs once a second; the suppression ratio
  (time below 5 µV for at least 0.5 s over the last 60 s); the impedance. Its numbers are "questionable" while an
  electrode is above 5 kΩ or the electrodes are unequal, and blanked as "invalid" during a diathermy burst, which it
  detects from the signal's own high-frequency power. They are published as `sef`, `mf`, `eegSr` and `eegImp`; the
  BFA tile shows SEF and SR while the EEG device publishes and the present depth index (`device depth`) otherwise,
  and the Saadat-like module's SQI% and EMG% stay blank. `device eeg model <id>` chooses the device (only `generic`
  exists; any other id is refused with the list). The depth-and-neuromuscular developer page draws the raw trace
  (8 s) and the spectrogram strip (0–50 Hz, about the last hour, red high, blue low). The physiology still reads the
  present index, unchanged.
