### Added

- **EEG stage, part 2: the cortical state and its spectrum (engine only, not yet shown).** The drug model publishes
  its hypnotic equivalent split by EEG class (`bus.cns.hypByClass`: propofol-type, barbiturate, etomidate,
  benzodiazepine, dissociative — summing to `hypPropEq`) and dexmedetomidine's EEG equivalent (`bus.cns.alpha2Eq`,
  Ce ÷ 2.5 ng/mL, Colin 2017). `l2/eeg/state.ts` maps the bus and the physiology onto mechanism-named variables
  (thalamocortical hyperpolarisation, loss-of-responsiveness level, the alpha-to-delta shift, burst-suppression drive and
  suppression, ketamine's depolarisation, the N2O transient, opioid load, noxious arousal, age, ischaemic/hypoxic and
  hypothermic failure); `l2/eeg/spectra.ts` gives each state its spectrum (1/f background, slow, theta, alpha,
  spindle, beta and gamma peaks, burst suppression and its forme fruste). Volatile burst suppression starts at
  isoflurane 1.3, sevoflurane 1.4 and desflurane ≈ 1.25 age-adjusted MAC (Pilge 2014, Rampil 1991), is established at
  1.5 and near-isoelectric at 2.0 MAC; propofol's starts at 4.9 µg/mL. No physiology number moves (the E0 baseline is
  unchanged) and nothing reads the EEG yet: the signal and the devices are the next pull requests.
