// EEG devices (plan §7 E5): the spectral analysis every reader shares — the periodogram of one epoch, band power and
// the edge frequency below which a fraction of the power lies (the spectral edge and the median frequency). Pure.
// A plain DFT of the epoch's own length (a 2-s epoch at 125 Hz is 250 samples: 0.5 Hz bins, no padding); its cost is
// N·N/2 multiply-adds per epoch, ≈ 31 000 at 250 samples, once a second.
//   PSD_k = c·|Σ w_i·(x_i − x̄)·e^(−2πik/N)|² / (fs·Σ w_i²), c = 2 except at 0 Hz and fs/2; Hann window w
// so that Σ_k PSD_k·Δf is the epoch's variance (Parseval).

const tables = new Map<number, { w: number[]; u: number; cos: number[]; sin: number[] }>();
function table(n: number) {
  let t = tables.get(n);
  if (!t) {
    const w = Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
    t = {
      w, u: w.reduce((a, b) => a + b * b, 0),
      cos: Array.from({ length: n }, (_, i) => Math.cos((2 * Math.PI * i) / n)),
      sin: Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * i) / n)),
    };
    tables.set(n, t);
  }
  return t;
}

/** One-sided power spectral density of one epoch, µV²/Hz, at k·fs/N for k = 0 … ⌊N/2⌋ (Hann window, mean removed). */
export function psdOf(x: ArrayLike<number>, fs: number): number[] {
  const n = x.length;
  const { w, u, cos, sin } = table(n);
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i] as number;
  mean /= n;
  const v = Array.from({ length: n }, (_, i) => ((x[i] as number) - mean) * (w[i] as number));
  const half = Math.floor(n / 2);
  const out = new Array<number>(half + 1);
  for (let k = 0; k <= half; k++) {
    let re = 0;
    let im = 0;
    for (let i = 0, j = 0; i < n; i++, j = (j + k) % n) {
      re += (v[i] as number) * (cos[j] as number);
      im -= (v[i] as number) * (sin[j] as number);
    }
    const c = k === 0 || 2 * k === n ? 1 : 2;
    out[k] = (c * (re * re + im * im)) / (fs * u);
  }
  return out;
}

/** Power in [lo, hi) Hz, µV² (bins of width dfHz from 0 Hz). */
export function bandPower(psd: readonly number[], dfHz: number, lo: number, hi: number): number {
  let p = 0;
  for (let k = 0; k < psd.length; k++) {
    const f = k * dfHz;
    if (f >= lo && f < hi) p += (psd[k] as number) * dfHz;
  }
  return p;
}

/**
 * The frequency below which a fraction q of the power in [lo, hi) Hz lies, Hz: each bin's power spread evenly over its
 * width, so the edge moves continuously (q 0.5: the median frequency; q 0.95: the 95 % spectral edge). lo when there
 * is no power.
 */
export function edgeFrequency(psd: readonly number[], dfHz: number, lo: number, hi: number, q: number): number {
  const total = bandPower(psd, dfHz, lo, hi);
  if (!(total > 0)) return lo;
  let acc = 0;
  for (let k = 0; k < psd.length; k++) {
    const f = k * dfHz;
    if (f < lo || f >= hi) continue;
    const p = (psd[k] as number) * dfHz;
    if (acc + p >= q * total) return f + (p > 0 ? ((q * total - acc) / p) * dfHz : 0);
    acc += p;
  }
  return hi;
}
