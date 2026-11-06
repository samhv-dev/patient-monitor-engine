// EEG stage E4: what a real frontal electrode sees besides the brain (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E4,
// D5): muscle (EMG), electrocautery, eye blinks, ECG pickup, electrode impedance and mains. Added to the generator's
// brain signal sample by sample, in µV. Ch36 = Miller 10th ed. chapter 36, printed pages; research/43 =
// research/43-eeg-sources-review.md (P-9 to P-15: the published values where it found them, [ENG] where it did not).
// D5: electrocautery and mains are the ECG model's artefact state (`Modifiers.artefact`, read only), so one diathermy
// press appears on both traces; the EEG has its own gains. The EMG is NOT the ECG's `emg` knob: it is computed from
// the scalp muscle (TOF T1), arousal and the tube (Ch36 p. 1142).
//   emg = t1 · clamp01(EMG_AWAKE·w + EMG_AROUSAL·arousal + EMG_TUBE·tube·w) · EMG_FULL_RMS_UV,  w = 1 − clamp01(lor)
import { normal, uniform, type Sfc32State } from '../../rng/sfc32.ts';
import type { BurstSpec } from '../ecg/api-types.ts';

// --- EMG (research/43 P-9; Ch36 pp. 1142, 1148) ---
/** EMG at full drive, RMS µV [ENG, P-9: no published amplitude; the ceiling is Miller Fig. 36.10's emergence trace,
 * ≈ 200 µV peak-to-peak [FIG], read as ± 3σ, so 200/6]. */
export const EMG_FULL_RMS_UV = 200 / 6;
/** The EMG spectrum's centre: frontalis EMG is broadband, largest at 20–30 Hz frontally (Goncharova 2003, research/43
 * P-9), the mid-point. */
export const EMG_PEAK_HZ = 25;
/** The band-pass's quality factor [ENG: broad — "broadband" (Goncharova 2003), so power reaches the top of the band]. */
export const EMG_Q = 0.5;
/** Resting frontalis tone awake, a fraction of full drive [ENG, P-9: small "fuzzy" waves (Ch36 p. 1142). Chosen so
 * that awake the EMG carries more of the 30–60 Hz power than the brain does (≈ 24 vs 18 µV²), the condition for
 * paralysis to change an awake frontal EEG at all (Ch36 p. 1148), while the raw awake trace stays ≈ 11 µV RMS beside
 * Miller's 5–10 µV EEG (Ch36 p. 1138); 6.7 µV RMS]. */
export const EMG_AWAKE = 0.2;
/** Grimacing under noxious arousal at arousal 1, fraction of full drive [ENG, P-9; Ch36 p. 1142 "a signal of
 * grimacing"]. */
export const EMG_AROUSAL = 0.5;
/** The tube's irritation as responsiveness returns, fraction of full drive [ENG, P-9: emergence with the tube in is the
 * Fig. 36.10 ceiling; Ch36 p. 1133 key points]. */
export const EMG_TUBE = 1;

// --- eye blinks (research/43 P-10; Ch36 p. 1146) ---
/** Blink rate while conscious: 17/min at rest (Bentivoglio 1997, 150 volunteers, research/43 P-10). */
export const BLINK_PER_MIN = 17;
/** Smallest blink, µV [ENG, P-10, anchored on Miller Fig. 36.10: ≈ 50–80 µV against the 75 µV bar [FIG]]. */
export const BLINK_UV_MIN = 50;
/** Largest blink, µV [ENG, P-10; Miller Fig. 36.10 [FIG]]. */
export const BLINK_UV_MAX = 80;
/** Blink deflection length, s [ENG: a large frontal low-frequency deflection, "can be mistaken for delta",
 * Ch36 p. 1146]. */
export const BLINK_S = 0.3;

// --- electrocautery, mains, ECG pickup (research/43 P-15, P-11; Ch36 pp. 1145–1146) ---
/** Diathermy on the EEG, RMS µV, white [ENG, P-15: no published amplitude. Miller Fig. 36.10 shows ≈ 250 µV
 * peak-to-peak [FIG], "probably clipped by the display" (research/43 P-15), so that is a floor. "Power raised at all
 * frequencies" (Ch36 p. 1146) must hold over the alpha–delta's slow peak too (≈ 250 µV²/Hz at 0.8 Hz, spectra.ts):
 * white noise of 250 µV RMS has 1000 µV²/Hz at 125 Hz sampling, 4× that peak]. */
export const DIATHERMY_RMS_UV = 250;
/** Mains pickup on the EEG at the ECG model's `mains` level 1, µV amplitude at the device mains frequency [ENG: no
 * source gives it; "powerline signals", Ch36 p. 1145]. Its harmonics alias above 62.5 Hz and are left out. */
export const EEG_MAINS_UV = 20;
/** ECG pickup, µV per mV of the heart's aVF projection [ENG, P-11: off unless the patient is flagged (plan default
 * "0 unless flagged"; "thick, short necks", Ch36 p. 1146); when on, a 1 mV R wave gives 8 µV — above the 5 µV
 * suppression criterion, so it shows in burst suppression, "most visible" there (same page)]. */
export const ECG_PICKUP_UV_PER_MV = 8;

// --- electrode impedance (research/43 has no P-13 entry: the plan's value; Ch36 p. 1145) ---
/** Above this the signal is unreliable: Miller Ch36 p. 1145 gives "5 or 8 kΩ" by device; the plan's P-13 default 5. */
export const IMPEDANCE_LIMIT_KOHM = 5;
/** Electrodes differing by more than this are "unequal" (Ch36 p. 1145 names inequality, not a number) [ENG: half the
 * limit]. */
export const IMPEDANCE_UNEQUAL_KOHM = 2.5;
/** Added electrode noise, RMS µV per kΩ over the limit or over the inequality [ENG: no source]. */
export const IMPEDANCE_NOISE_UV_PER_KOHM = 1;

/** What the artefacts read each sample (from the engine: the neuro model, the cortex, the ECG model's artefact state). */
export interface ArtefactInputs {
  tS: number;
  /** Twitch height T1, 0–1 (the neuro model's TOF): the scalp muscle's force. */
  t1: number;
  /** The cortex's loss-of-responsiveness load (1 = unresponsive) and noxious arousal (types-eeg.ts CortexState). */
  lor: number;
  arousal: number;
  /** A tracheal tube in place. */
  tube: boolean;
  /** The ECG model's diathermy burst and mains level (Modifiers.artefact). */
  electrosurgery: BurstSpec | null;
  mains: number;
  mainsHz: 50 | 60;
  impedanceKOhm: number[];
  ecgPickup: boolean;
  /** The heart's aVF projection at this instant, mV. */
  ecgMv: number;
}

export interface ArtState {
  fs: number;
  rng: Sfc32State;
  /** EMG band-pass: coefficients [b0, b2, a1, a2] (b1 = 0), its state [x1, x2, y1, y2] and the gain to unit RMS. */
  bq: number[];
  z: number[];
  emgNorm: number;
  /** The blink in progress: samples left, its length and peak (µV). */
  blink: { left: number; n: number; uv: number };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The EMG drive, 0–1 of EMG_FULL_RMS_UV: scalp muscle × (resting tone, arousal, the tube on emergence). */
export function emgLevel(x: Pick<ArtefactInputs, 't1' | 'lor' | 'arousal' | 'tube'>): number {
  const w = 1 - clamp01(x.lor);
  return clamp01(x.t1) * clamp01(EMG_AWAKE * w + EMG_AROUSAL * clamp01(x.arousal) + EMG_TUBE * (x.tube ? 1 : 0) * w);
}

/** Electrodes above the limit or unequal: the signal is unreliable (the device raises its flag, E5). */
export function impedanceUnreliable(z: readonly number[]): boolean {
  const hi = Math.max(...z);
  return hi > IMPEDANCE_LIMIT_KOHM || hi - Math.min(...z) > IMPEDANCE_UNEQUAL_KOHM;
}

/** Electrode noise RMS, µV. */
export function impedanceNoiseUv(z: readonly number[]): number {
  const hi = Math.max(...z);
  return IMPEDANCE_NOISE_UV_PER_KOHM * (Math.max(0, hi - IMPEDANCE_LIMIT_KOHM) + Math.max(0, hi - Math.min(...z) - IMPEDANCE_UNEQUAL_KOHM));
}

export function createArtefacts(rng: Sfc32State, fs: number): ArtState {
  // RBJ band-pass (0 dB peak) at EMG_PEAK_HZ
  const w0 = (2 * Math.PI * EMG_PEAK_HZ) / fs;
  const al = Math.sin(w0) / (2 * EMG_Q);
  const a0 = 1 + al;
  const bq = [al / a0, -al / a0, (-2 * Math.cos(w0)) / a0, (1 - al) / a0];
  // its white-noise power gain, from the impulse response
  let e = 0;
  const z = [0, 0, 0, 0];
  for (let n = 0; n < 20 * fs; n++) {
    const y = bqStep(bq, z, n === 0 ? 1 : 0);
    e += y * y;
  }
  return { fs, rng: [...rng] as Sfc32State, bq, z: [0, 0, 0, 0], emgNorm: 1 / Math.sqrt(e), blink: { left: 0, n: 0, uv: 0 } };
}

function bqStep(c: number[], z: number[], x: number): number {
  const y = (c[0] as number) * x + (c[1] as number) * (z[1] as number) - (c[2] as number) * (z[2] as number) - (c[3] as number) * (z[3] as number);
  z[1] = z[0] as number;
  z[0] = x;
  z[3] = z[2] as number;
  z[2] = y;
  return y;
}

/** The artefacts' sum at one sample, µV. Fixed draws per sample, so no artefact shifts another's noise. */
export function artefactSample(a: ArtState, x: ArtefactInputs): number {
  const dt = 1 / a.fs;
  const nEmg = normal(a.rng);
  const nDia = normal(a.rng);
  const nImp = normal(a.rng);
  const uBlink = uniform(a.rng);
  const uSize = uniform(a.rng);
  let v = 0;
  // EMG: broadband, frontal peak 20–30 Hz; the filter runs always, so switching it on is continuous
  const e = bqStep(a.bq, a.z, nEmg) * a.emgNorm;
  const lvl = emgLevel(x);
  if (lvl > 0) v += lvl * EMG_FULL_RMS_UV * e;
  // electrocautery: the ECG model's burst, white
  const b = x.electrosurgery;
  if (b && x.tS >= b.atS && x.tS <= b.atS + b.durationS) v += DIATHERMY_RMS_UV * nDia;
  // blinks: while conscious, while the lids have their muscle (T1) [INF]
  if (a.blink.left > 0) {
    const ph = 1 - a.blink.left / a.blink.n;
    v += a.blink.uv * 0.5 * (1 - Math.cos(2 * Math.PI * ph));
    a.blink.left--;
  } else if (x.lor < 1 && uBlink < (BLINK_PER_MIN / 60) * clamp01(x.t1) * dt) {
    const n = Math.round(BLINK_S * a.fs);
    a.blink = { left: n, n, uv: BLINK_UV_MIN + (BLINK_UV_MAX - BLINK_UV_MIN) * uSize };
  }
  // mains: the ECG model's level at the device mains frequency
  if (x.mains > 0) v += x.mains * EEG_MAINS_UV * Math.sin(2 * Math.PI * x.mainsHz * x.tS);
  // ECG pickup: the engine's own heart
  if (x.ecgPickup) v += ECG_PICKUP_UV_PER_MV * x.ecgMv;
  // electrode impedance
  const zn = impedanceNoiseUv(x.impedanceKOhm);
  if (zn > 0) v += zn * nImp;
  return v;
}
