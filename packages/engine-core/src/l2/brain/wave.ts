// ICP waveform (tables §5.1 "ICP waveform", Q39): three Gaussians per perfused beat — P1 percussion (arterial),
// P2 tidal (brain compliance), P3 dicrotic — plus a respiratory component, around the ICP mean. Pulse amplitude
// AMP = elastance × arterial pulse volume (≈ 1.6 mL at PP 40), so AMP ≈ 0.1·ICP + 0.5 when compliant and rises
// steeply as compliance is used; P2/P1 = 0.8 compliant → 1.0 at elastance of ICP 20/PVI 25 → 1.4 exhausted [ENG].
export const P_DELAY_S = [0.15, 0.27, 0.4] as const; // after the R wave: upstroke + 30–60 ms, tidal, post-incisura [ENG]
export const P_SIGMA_S = [0.025, 0.035, 0.04] as const;
export const PULSE_VOL_ML = 1.6; // arterial CBV pulse at PP 40 mmHg [ENG]: AMP 1.47 at ICP 10/PVI 25
export const RESP_VOL_ML = 0.6; // venous volume swing of a reference breath (u swing 1.0) [ENG]: 1–3 mmHg at ICP 20
export const P3_REL = 0.55;

/** P2/P1 ratio vs elastance (mmHg/mL): 0.8 up to 0.92 (ICP 10/PVI 25), 1.0 at 1.84 (ICP 20), 1.4 at ≥ 4. */
export function p2p1(elast: number): number {
  if (elast <= 0.92) return 0.8;
  if (elast <= 1.84) return 0.8 + (0.2 * (elast - 0.92)) / 0.92;
  return Math.min(1.4, 1 + (0.4 * (elast - 1.84)) / (4 - 1.84));
}

/** Unit-peak beat shape at time s after the R wave, and its mean over a beat of length rr (for the zero-mean pulse). */
export function beatShape(s: number, ratio: number): number {
  if (s < 0 || s > 0.8) return 0;
  const g = (i: 0 | 1 | 2) => Math.exp(-0.5 * ((s - P_DELAY_S[i]) / P_SIGMA_S[i]) ** 2);
  const peak = Math.max(1, ratio);
  return (g(0) + ratio * g(1) + P3_REL * g(2)) / peak;
}
const SQ2PI = Math.sqrt(2 * Math.PI);
export function beatShapeArea(ratio: number): number {
  return (SQ2PI * (P_SIGMA_S[0] + ratio * P_SIGMA_S[1] + P3_REL * P_SIGMA_S[2])) / Math.max(1, ratio);
}

/** One sample: mean ICP + pulse (zero mean over the beat) + respiratory swing (u − 0.5 from Stage 3's breath signal). */
export function icpSample(icpMean: number, elast: number, pp: number, sinceR: number, rr: number, u: number): number {
  const ratio = p2p1(elast);
  const amp = elast * PULSE_VOL_ML * Math.max(0, pp / 40);
  const pulse = amp * (beatShape(sinceR, ratio) - beatShapeArea(ratio) / Math.max(0.3, rr));
  return icpMean + pulse + elast * RESP_VOL_ML * (u - 0.5);
}
