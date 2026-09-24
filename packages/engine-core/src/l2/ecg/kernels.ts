// Gaussian wave kernels on a 3-axis VCG (brief §4.1 "Generator"; research 03 §1.3):
//   ECG_axis(t) = Σ_events Σ_waves a_w,axis · exp(−(t − t_event − τ_w)² / (2σ_w²))
// The T wave is two half-Gaussians (rising σ, falling σ) [03 §1.3, ENG].
// Clean-room: written from the equations in the papers/brief, no ECGSYN code consulted.

/** Flat kernel layout, 7 numbers per kernel: [tau, sigmaRise, sigmaFall, ax, ay, az, wave]. Seconds and mV. */
export const K_STRIDE = 7;
/** Kernels contribute nothing beyond ±4σ (exp(−8) ≈ 3.4e-4). */
export const SUPPORT_SIGMAS = 4;

/** Wave codes stored in the 7th slot (used by tests and by QRS-span measurement). */
export const WAVE = { P: 0, Q: 1, R: 2, S: 3, T: 4, U: 5, F: 6, RETRO_P: 7, DELTA: 8, ST: 9, J: 10, ART: 11 } as const;
export type WaveCode = (typeof WAVE)[keyof typeof WAVE];

export function kernel(
  tau: number,
  sigmaRise: number,
  sigmaFall: number,
  a: readonly [number, number, number],
  wave: WaveCode,
  scale = 1,
): number[] {
  return [tau, sigmaRise, sigmaFall, a[0] * scale, a[1] * scale, a[2] * scale, wave];
}

/** One scheduled ECG event: absolute time t (s) plus its kernels, with a precomputed support window. */
export interface EcgEvent {
  t: number;
  start: number; // first time any kernel is non-negligible
  end: number; // last time any kernel is non-negligible
  k: number[];
}

export function makeEvent(t: number, k: number[]): EcgEvent {
  let start = Infinity;
  let end = -Infinity;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const tau = k[i] as number;
    start = Math.min(start, t + tau - SUPPORT_SIGMAS * (k[i + 1] as number));
    end = Math.max(end, t + tau + SUPPORT_SIGMAS * (k[i + 2] as number));
  }
  return { t, start, end, k };
}

/** Add this event's VCG contribution at absolute time s into acc[0..2]. */
export function addEventAt(ev: EcgEvent, s: number, acc: Float64Array): void {
  const k = ev.k;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const d = s - ev.t - (k[i] as number);
    const sigma = d < 0 ? (k[i + 1] as number) : (k[i + 2] as number);
    if (d > SUPPORT_SIGMAS * sigma || d < -SUPPORT_SIGMAS * sigma) continue;
    const g = Math.exp((-d * d) / (2 * sigma * sigma));
    acc[0] = (acc[0] as number) + (k[i + 3] as number) * g;
    acc[1] = (acc[1] as number) + (k[i + 4] as number) * g;
    acc[2] = (acc[2] as number) + (k[i + 5] as number) * g;
  }
}

/** QRS span of a kernel list: from the earliest Q/R/S/delta τ − 2.5σ to the latest τ + 2.5σ, in ms [ENG]. */
export function qrsSpanMs(k: readonly number[]): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const w = k[i + 6];
    if (w !== WAVE.Q && w !== WAVE.R && w !== WAVE.S && w !== WAVE.DELTA) continue;
    lo = Math.min(lo, (k[i] as number) - 2.5 * (k[i + 1] as number));
    hi = Math.max(hi, (k[i] as number) + 2.5 * (k[i + 2] as number));
  }
  return Math.round((hi - lo) * 1000);
}
