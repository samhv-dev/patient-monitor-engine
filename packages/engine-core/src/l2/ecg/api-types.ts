// Public ECG vocabulary (brief §5 rhythm library + modifiers, §7.2 setRhythm/setModifiers). types.ts re-exports
// everything here, so the public surface stays `import { … } from '@pme/engine-core'`. Stage 5 owns this file.
import type { SimSeconds } from '../../types.ts';

/** Every v1 rhythm (brief §5 table, plus `mat`, research 03 §1.5 "MAT"). */
export type RhythmId =
  | 'sinus' | 'sinusBrady' | 'sinusTachy' | 'sinusArrhythmia' | 'sinusPause'
  | 'atrialTach' | 'mat' | 'afib' | 'aflutter'
  | 'svtAvnrt' | 'svtAvrt' | 'wpwSinus' | 'preexcitedAf' | 'junctionalEscape' | 'junctionalAccel' | 'junctionalTachy'
  | 'avb1' | 'avb2Mobitz1' | 'avb2Mobitz2' | 'avb2to1' | 'avbHighGrade' | 'avb3Narrow' | 'avb3Wide'
  | 'idioventricular' | 'aivr' | 'vtMono' | 'vtPoly' | 'torsades' | 'vfCoarse' | 'vfFine'
  | 'asystole' | 'pWaveAsystole' | 'agonal'
  | 'pacedAAI' | 'pacedVVI' | 'pacedDDD';

export type RhythmGroup = 'sinus' | 'atrial' | 'svt' | 'avBlock' | 'ventricular' | 'arrest' | 'paced';

export type PacerFault = 'none' | 'failureToCapture' | 'failureToSense' | 'oversensing' | 'failureToPace';

/** Implanted-pacemaker settings for pacedAAI / pacedVVI / pacedDDD (brief §5 "Paced"; research 03 §1.7). */
export interface PacerOpts {
  /** Lower rate, ppm. Default: the rhythm's 'hr' target (70). */
  ratePpm?: number;
  /** DDD paced/sensed AV delay, ms (brief §5: 120–200). Default 160. */
  avDelayMs?: number;
  /** Default 'none'. */
  fault?: PacerFault;
  /** Fraction of pacing cycles the fault affects, 0–1. Default 1 for failureToSense, 0.3 otherwise [ENG]. */
  faultRate?: number;
  /** What sits under a VVI/DDD pacemaker: 'none' = complete heart block (default); 'conducted' = sinus conducts. */
  intrinsic?: 'none' | 'conducted';
}

/** Per-rhythm options (brief §7.2 names the type; the fields are this project's). */
export interface RhythmOpts {
  /** aflutter conduction ratio (2, 3, 4 or 'variable' = random 2:1/3:1/4:1 mix); avbHighGrade 3 or 4. */
  ratio?: 2 | 3 | 4 | 'variable';
  /** Atrial rate for aflutter (default 300), for dissociated atria (default 80) and under paced rhythms. */
  atrialRateBpm?: number;
  /** avb1 PR (default 280 ms). */
  prMs?: number;
  /** avb2Mobitz1 / avb2Mobitz2 group size in P waves: 4 → 4:3 (default 4). */
  groupSize?: 3 | 4 | 5 | 6;
  /** Sets the 'hr' target when the rhythm starts (default: the rhythm's default rate). */
  rateBpm?: number;
  /** PEA: every beat has mech.perfused = false and kSV = 0 (brief §5 "PEA = pulseless: true on any organised rhythm"). */
  pulseless?: boolean;
  /** sinusPause: pause length (default 3 s) and how often it happens (default every 12 s) [ENG]. */
  pauseS?: number;
  pauseEveryS?: number;
  /** Junctional rhythms: where the retrograde P sits (default 'before'). */
  retroP?: 'before' | 'hidden' | 'after';
  /** torsades: beats per full twist, 5–20 (default 12). */
  twistBeats?: number;
  /** vfCoarse starting amplitude A0, mV peak-to-peak in II (brief §4.1: 0.6–1.0; default 0.8). */
  vfAmplitudeMv?: number;
  /** VF → asystole hazard 0.02/min and forced at A < 0.05 mV (brief §4.1). Default true. */
  autoAsystole?: boolean;
  /** Paced rhythms only. */
  pacer?: PacerOpts;
}

export type PvcPattern = 'single' | 'bigeminy' | 'trigeminy' | 'couplet' | 'triplet' | 'run';

/** PVC ectopy (brief §5 modifiers; research 03 §1.5). */
export interface PvcSpec {
  /** 'single', 'couplet', 'triplet', 'run': chance per supraventricular beat (0–0.9). Ignored for bigeminy/trigeminy. */
  probability: number;
  pattern: PvcPattern;
  /** 'run' length in PVCs (3–30, default 5: a run ≥ 5 at HR ≥ 100 is the monitor's VT alarm, brief §5). */
  runLength?: number;
  /** ≥ 2 distinct PVC morphologies (research 03 §1.5 "Multifocal PVCs"). */
  multifocal?: boolean;
  /** PVC onset on the preceding T peak (coupling < QT). */
  rOnT?: boolean;
}

/** PACs: premature P′ at 60–85% of PP; resets the SA clock (research 03 §1.5). */
export interface PacSpec {
  probability: number;
  /** P′ not conducted. */
  blocked?: boolean;
  /** Conducted with RBBB-shaped aberrancy. */
  aberrant?: boolean;
}

export interface PjcSpec {
  probability: number;
}

export type StTerritory = 'anterior' | 'septal' | 'lateral' | 'anterolateral' | 'inferior' | 'posterior';
/** STEMI (brief §5): mm = 1–4 (0.1–0.4 mV) in the territory's peak lead; reciprocal change emerges from the VCG. */
export interface StSpec {
  territory: StTerritory;
  mm: number;
}

/** Transcutaneous pacing as seen by the ECG (brief §6.5). Stage 4's pacer device writes this modifier. */
export interface TcpSpec {
  mode: 'demand' | 'fixed';
  ratePpm: number;
  mA: number;
  /** Capture threshold (brief §6.5 default 70 mA). */
  thresholdMa: number;
}

/** CPR compression artefact (brief §4.1, §11 C2). rateCpm 100–120; depth 0–1 → 0.2–2 mV. */
export interface CprSpec {
  rateCpm: number;
  depth: number;
}

/** A defibrillator discharge at sim time atS (brief §6.5 "Shock artefact"). Stage 4's defib writes this. */
export interface ShockSpec {
  atS: SimSeconds;
  energyJ: number;
}

/** A diathermy burst (brief §5: 1–5 s). */
export interface BurstSpec {
  atS: SimSeconds;
  durationS: number;
}

/** Artefact levels (brief §5 "Artefacts"): numbers are 0–1 levels unless stated. */
export interface ArtefactSpec {
  /** Additive white noise: 1 = 0.025 mV SD (Stage 1). */
  noise: number;
  /** Extra baseline wander, 0.05–0.3 mV at 0.1–0.5 Hz. */
  wander: number;
  /** Mains pickup at the device mains frequency + 3rd harmonic, 0.01–0.5 mV. */
  mains: number;
  /** EMG, 20–150 Hz, 0.02–0.2 mV RMS. */
  emg: number;
  /** Shivering: EMG with a 4–8 Hz tremor envelope. */
  shiver: number;
  /** Electrode motion, 0.5–3 Hz, 0.5–5 mV. */
  motion: number;
  /** All ECG electrodes off: flat trace plus a technical alarm event. */
  leadOff: boolean;
  electrosurgery: BurstSpec | null;
  cpr: CprSpec | null;
  shock: ShockSpec | null;
}

export type BbbKind = 'none' | 'rbbb' | 'lbbb';

/** The full modifier set (brief §5 "Modifiers" + "Artefacts"). */
export interface Modifiers {
  pvc: PvcSpec | null;
  pac: PacSpec | null;
  pjc: PjcSpec | null;
  /** RSA depth 0–1 (1 = A_RSA 60 ms at RR 1 s). Default 0.67. */
  rsa: number;
  /** Multiplies every HRV term (0 = HRV off). Default 1. */
  hrvScale: number;
  /** QTc for Fridericia, ms (300–650). Default 400. */
  qtc: number;
  bbb: BbbKind;
  /** Frontal QRS axis target, degrees (−150…180); null = the template's own axis. */
  axisDeg: number | null;
  /** Precordial transition lead, 1.5–5.5; null = the template's own. */
  transitionLead: number | null;
  /** Global voltage scale: 1 = normal, 0.4–0.6 = low voltage. */
  lowVoltage: number;
  lvh: boolean;
  st: StSpec | null;
  /** Diffuse subendocardial ST depression in II/V5, mV (0 or −0.05 … −0.3). */
  ischaemicDepressionMv: number;
  /** T inversion 0–1 (1 = fully inverted T). */
  tInversion: number;
  longQT: boolean;
  brugada1: boolean;
  digoxin: boolean;
  /** Electrical alternans 0 or 0.2–0.4 (fractional QRS/T amplitude drop on alternate beats). */
  alternans: number;
  /** Serum potassium, mmol/L (brief §5 "Electrolytes from state k"; default 4.2). */
  k: number;
  /** Core temperature, °C (drives Osborn J waves; default 37). */
  tempC: number;
  /** Hard overrides of drawn intervals, ms. */
  overrides: { qrsMs?: number; qtMs?: number; prMs?: number };
  /** Stable per-patient morphology fingerprint (brief §5 "Individuality"). */
  patientSeed: number;
  /** 0 = textbook morphology, 1 = full per-patient variation. Default 0. */
  morphologyVariation: number;
  /** Sim time of the last epinephrine dose (VF: +20–40% A, +0.5 Hz for 2–4 min, brief §4.1). */
  epinephrineAtS: SimSeconds | null;
  tcp: TcpSpec | null;
  artefact: ArtefactSpec;
}

/** What `setModifiers` accepts: any subset, with `artefact` and `overrides` merged key by key. */
export type ModifiersPatch = Partial<Omit<Modifiers, 'artefact' | 'overrides'>> & {
  artefact?: Partial<ArtefactSpec>;
  overrides?: Modifiers['overrides'];
};
