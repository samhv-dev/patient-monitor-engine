// EEG stage public types (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E1, E2): the cortical state computed from the
// drug bus and the physiology (l2/eeg/state.ts) and the spectral description each state produces (l2/eeg/spectra.ts).
// The `eeg` channel's device commands (E3/E4: on/off and the electrodes; E6 adds the model choice). No EEG sample is
// published on the wire (D3): a follower computes them from the commands.

/** The drug model's hypnotic equivalent split by EEG class, propofol-equivalent brain Ce (bus: µg/mL; the cortex: ng/mL).
 * The five parts sum to `bus.cns.hypPropEq`. */
export interface HypByClass {
  gabaIv: number; // propofol (and any GABA-ergic IV row without its own class below)
  barbiturate: number; // thiopental
  etomidate: number;
  benzo: number; // midazolam (benzodiazepine rows)
  dissociative: number; // ketamine (rows flagged `dissociative`)
}

/** What the cortex reads each step. Concentrations are brain effect-site values from the drug bus. */
export interface CortexInputs {
  ageY: number;
  /** `bus.cns.hypByClass` in ng/mL propofol-equivalents. */
  hyp: HypByClass;
  /** `bus.cns.alpha2Eq`: dexmedetomidine Ce ÷ its EEG potency (1 = the potency point). */
  alpha2Eq: number;
  /** Brain (VRG) age-adjusted MAC fractions, the hypothermic MAC reduction applied as the depth index applies it. */
  mac: { sevoflurane: number; isoflurane: number; desflurane: number; n2o: number };
  /** `bus.cns.opioidCeFentEq`, fentanyl-equivalent brain Ce, ng/mL (naloxone applied by the drug model). */
  opioidFentEq: number;
  /** Noxious stimulus now, 0–1 (the neuro model's `stim.level`). */
  stimulus: number;
  /** The neuro model's total blunting of a noxious stimulus, 0–1 (`depth().antinoc`). */
  antinoc: number;
  /** Cerebral O2 delivery relative to normal: CBF/CBF0 × CaO2/CaO2(ref); 1 = normal. */
  do2Rel: number;
  /** Core temperature, °C. */
  tempC: number;
}

/** The cortical state (E1): mechanism-named variables, each documented with its source in l2/eeg/state.ts. */
export interface CortexState {
  /** Thalamocortical hyperpolarisation, in hypnotic C50 units (propofol Ce50(age), 1 MAC, the dexmedetomidine point). */
  hyper: number;
  /** The same hyperpolarising load in loss-of-responsiveness units (1 = at the class's own LOR level). */
  lor: number;
  /** How far `hyper` is past the alpha-to-delta shift (MAC units), 0 below it. */
  deep: number;
  /** The volatile (ether) share of `hyper`, 0–1. */
  volShare: number;
  /** The burst-suppression drive normalised to its onset: 1 = onset (50 % of adults show a first silent second). */
  suppressDrive: number;
  /** Cortical suppression, 0–1: the fraction of time suppressed (drug, ischaemic/hypoxic and hypothermic causes). */
  suppress: number;
  /** Ketamine's thalamocortical depolarisation, in ketamine-alone loss-of-responsiveness units. */
  ketDepol: number;
  /** The nitrous-oxide transient, 0–1 (abrupt N2O changes). */
  n2oTransient: number;
  /** The N2O MAC fraction the cortex has adapted to (the transient's reference), MAC fraction. */
  n2oRef: number;
  /** Opioid load at the EEG, fentanyl-eq ÷ the level that slows the EEG alone (1 = 8 ng/mL). */
  opioid: number;
  /** Noxious arousal, 0–1: stimulus × (1 − antinociception). */
  arousal: number;
  /** Aperiodic-slope factor with age (1 young; 0.8 = 20 % flatter). */
  ageSlope: number;
  /** Amplitude factor with age (1 young adult; smaller in the elderly). */
  ageAmp: number;
  /** Ischaemic/hypoxic failure, 0–1: 0 at or above the O2 delivery where the EEG turns abnormal, 1 at the survival limit. */
  metabolic: number;
  /** Hypothermic slowing, 0–1 (0 at 37 °C, 1 at the hypothermic burst-suppression temperature). */
  cold: number;
}

/** The classes whose shares shape the spectrum (fractions of `hyper` or of the suppressing load). */
export interface AgentMix {
  gabaIv: number; barbiturate: number; etomidate: number; benzo: number; alpha2: number;
  sevoflurane: number; isoflurane: number; desflurane: number;
  /** N2O MAC fraction (not a share: N2O does not hyperpolarise). */
  n2oMac: number;
  ageY: number;
}

export type EegPeakName = 'slow' | 'theta' | 'alpha' | 'spindle' | 'beta' | 'gamma';

/** One oscillation above the aperiodic background: a Gaussian in power, height `powerDb` (dB re 1 µV²/Hz). */
export interface EegPeak {
  name: EegPeakName;
  fHz: number;
  widthHz: number; // Gaussian σ, Hz
  powerDb: number;
  /** 0 continuous … 1 fragmented into short bursts (dexmedetomidine spindles; ketamine gamma bursts). */
  burstiness: number;
}

/** The spectral description of one cortical state (E2): what the generator (E3) turns into microvolts. */
export interface EegSpectrum {
  /** Aperiodic 1/f^slope background: PSD(f) = offsetDb − 10·slope·log10(f / 1 Hz), dB re 1 µV²/Hz. */
  aperiodic: { offsetDb: number; slope: number };
  peaks: EegPeak[];
  /** Burst suppression: fraction of time suppressed, burst amplitude and the suppressed level (µV). */
  suppression: { p: number; burstUv: number; suppressedUv: number };
  /** The forme fruste before burst suppression, 0–1: brief drops of power above ≈ 2 Hz with sustained 0.5–2 Hz. */
  formeFruste: number;
}

/** The EEG device commands (plan §7 E3/E4; E6 adds `model`): switch the frontal EEG on or off (the `eeg` channel and
 * its state exist only while on, D4); set the electrode impedances, kΩ, one value for all or one per electrode; flag
 * the ECG pickup (plan P-11: a patient-profile property, default off, set here while the scenario format is not
 * touched). */
export type EegDeviceAction =
  | { device: 'eeg'; action: 'on' | 'off' }
  | { device: 'eeg'; action: 'impedance'; value: number | number[] }
  | { device: 'eeg'; action: 'ecgPickup'; value: boolean };
