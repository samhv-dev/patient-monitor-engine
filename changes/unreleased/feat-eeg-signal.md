### Added

- **EEG stage, part 3: the EEG signal and its artefacts (engine only, not yet shown).** `device eeg on` gives the
  engine a frontal `eeg` channel at 125 Hz in µV; `device eeg off` removes it, and an engine that never switches it on
  computes exactly what it did before. The samples are generated from the cortical state's spectrum (`l2/eeg/synth.ts`:
  2 s blocks of random-phase spectral synthesis, overlap-added so the trace is continuous; burst suppression with
  3.6 s bursts and suppressions of at least 0.5 s, spindle bursts, the forme fruste's drop-outs) and carry what a real
  frontal electrode sees (`l2/eeg/artefacts.ts`): scalp EMG that follows muscle strength (TOF T1), arousal and the tube
  on emergence and vanishes under a relaxant; the ECG model's diathermy bursts and mains; blinks at 17/min while the
  patient responds; ECG spikes from the engine's own heart when `device eeg ecgPickup true`; noise when an electrode's
  impedance (`device eeg impedance <kΩ>`) is above 5 kΩ or the electrodes are unequal. The samples follow from the seed
  and the commands only, so a follower computes the host's trace and no sample crosses the wire. No device reads the
  signal yet: the readers and the monitor tile are the next pull request.
