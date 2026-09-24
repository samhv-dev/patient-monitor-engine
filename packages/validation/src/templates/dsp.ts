// Extraction-only DSP (filters, resampling). Spectral helpers come from engine-core so the template metadata
// (fdomHz) is measured with exactly the estimator the engine's tests use.
export { dominantHz, lowFraction, organisation, rms, welch } from '../../../engine-core/src/util/dsp.ts';

/** Zero-phase first-order high-pass (forward + backward), cut-off fc. */
export function highpassZeroPhase(x: Float64Array, fs: number, fc: number): Float64Array {
  const a = Math.exp((-2 * Math.PI * fc) / fs);
  const run = (v: Float64Array) => {
    const o = new Float64Array(v.length);
    let py = 0;
    let px = v[0] as number;
    for (let i = 0; i < v.length; i++) {
      const y = a * (py + (v[i] as number) - px);
      o[i] = y;
      py = y;
      px = v[i] as number;
    }
    return o;
  };
  return run(run(x).reverse()).reverse();
}

/** Zero-phase band-pass: first-order high-pass (flo) then first-order low-pass (fhi), each forward + backward. */
export function bandpassZeroPhase(x: Float64Array, fs: number, flo: number, fhi: number): Float64Array {
  const hp = highpassZeroPhase(x, fs, flo);
  const a = Math.exp((-2 * Math.PI * fhi) / fs);
  const lp = (v: Float64Array) => {
    const o = new Float64Array(v.length);
    let y = v[0] as number;
    for (let i = 0; i < v.length; i++) {
      y = a * y + (1 - a) * (v[i] as number);
      o[i] = y;
    }
    return o;
  };
  return lp(lp(hp).reverse()).reverse();
}

/** Resample fsIn → fsOut with a Hann-windowed sinc interpolator (±16 input samples, anti-aliased) [ENG]. */
export function resample(x: Float64Array, fsIn: number, fsOut: number): Float64Array {
  const n = Math.floor((x.length * fsOut) / fsIn);
  const out = new Float64Array(n);
  const H = 16;
  const cut = Math.min(1, fsOut / fsIn);
  for (let i = 0; i < n; i++) {
    const t = (i * fsIn) / fsOut;
    const c = Math.floor(t);
    let acc = 0;
    let wsum = 0;
    for (let j = c - H + 1; j <= c + H; j++) {
      if (j < 0 || j >= x.length) continue;
      const d = t - j;
      const sinc = d === 0 ? 1 : Math.sin(Math.PI * d * cut) / (Math.PI * d * cut);
      const w = 0.5 + 0.5 * Math.cos((Math.PI * d) / H);
      acc += (x[j] as number) * sinc * w;
      wsum += sinc * w;
    }
    out[i] = acc / wsum;
  }
  return out;
}

/** Quantise a unit-RMS signal to Int16 (× scale) and base64-encode it little-endian. */
export function toInt16Base64(x: Float64Array, scale: number): string {
  const i16 = Int16Array.from(x, (v) => Math.max(-32767, Math.min(32767, Math.round(v * scale))));
  const bytes = new Uint8Array(i16.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i] as number);
  return btoa(bin);
}
