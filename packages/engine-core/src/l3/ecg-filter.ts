// Monitor ECG filters (brief §4.1 "Measurement chain"; research 03 §1.11, Philips MP2 datasheet):
//   Monitor    0.5–40 Hz  + automatic mains notch (50 Hz default, brief §5 / Ali's decision)
//   Diagnostic 0.05–150 Hz, no notch
// Design function: 2nd-order sections from R. Bristow-Johnson, "Cookbook formulae for audio EQ biquad
// filter coefficients" (bilinear transform with frequency pre-warping, so each Butterworth section is
// exactly −3.01 dB at its corner). Band-pass = Butterworth high-pass (Q = 1/√2) cascaded with a
// Butterworth low-pass (Q = 1/√2). Notch Q = 8 (≈6 Hz wide at 50 Hz) [ENG]. Transposed direct form II.
import type { EcgFilterMode } from '../types.ts';

/** Normalised biquad (a0 = 1): y = b0·x + b1·x₋₁ + b2·x₋₂ − a1·y₋₁ − a2·y₋₂. */
export interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

const BUTTERWORTH_Q = Math.SQRT1_2;
export const NOTCH_Q = 8;

function rbj(kind: 'lp' | 'hp' | 'notch', f0: number, fs: number, q: number): Biquad {
  const w0 = (2 * Math.PI * f0) / fs;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  let b0: number;
  let b1: number;
  let b2: number;
  if (kind === 'lp') {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  } else if (kind === 'hp') {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  } else {
    b0 = 1;
    b1 = -2 * cos;
    b2 = 1;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}

export const lowpass = (f0: number, fs: number, q = BUTTERWORTH_Q): Biquad => rbj('lp', f0, fs, q);
export const highpass = (f0: number, fs: number, q = BUTTERWORTH_Q): Biquad => rbj('hp', f0, fs, q);
export const notch = (f0: number, fs: number, q = NOTCH_Q): Biquad => rbj('notch', f0, fs, q);

export const FILTER_BANDS: Readonly<Record<EcgFilterMode, readonly [number, number]>> = {
  monitor: [0.5, 40],
  diagnostic: [0.05, 150],
};

/** The section cascade for a mode at sample rate fs. */
export function designEcgFilter(mode: EcgFilterMode, fs: number, mainsHz: 50 | 60 = 50): Biquad[] {
  const [lo, hi] = FILTER_BANDS[mode];
  const sections = [highpass(lo, fs), lowpass(hi, fs)];
  if (mode === 'monitor') sections.push(notch(mainsHz, fs));
  return sections;
}

/** Plain-data filter state: two delay values per section. */
export function createFilterState(sections: readonly Biquad[]): number[] {
  return new Array<number>(sections.length * 2).fill(0);
}

/** Filter one sample through the cascade, updating `state` in place. */
export function filterSample(sections: readonly Biquad[], state: number[], x: number): number {
  let v = x;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i] as Biquad;
    const z1 = state[2 * i] as number;
    const z2 = state[2 * i + 1] as number;
    const y = s.b0 * v + z1;
    state[2 * i] = s.b1 * v - s.a1 * y + z2;
    state[2 * i + 1] = s.b2 * v - s.a2 * y;
    v = y;
  }
  return v;
}

/** |H(e^{jω})| of the cascade at frequency f (Hz). */
export function magnitudeAt(sections: readonly Biquad[], f: number, fs: number): number {
  const w = (2 * Math.PI * f) / fs;
  const c1 = Math.cos(w);
  const s1 = Math.sin(w);
  const c2 = Math.cos(2 * w);
  const s2 = Math.sin(2 * w);
  let mag = 1;
  for (const s of sections) {
    const nr = s.b0 + s.b1 * c1 + s.b2 * c2;
    const ni = -(s.b1 * s1 + s.b2 * s2);
    const dr = 1 + s.a1 * c1 + s.a2 * c2;
    const di = -(s.a1 * s1 + s.a2 * s2);
    mag *= Math.hypot(nr, ni) / Math.hypot(dr, di);
  }
  return mag;
}

export const toDb = (m: number): number => 20 * Math.log10(m);
