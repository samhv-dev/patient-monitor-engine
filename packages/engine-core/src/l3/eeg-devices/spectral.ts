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

// ── Shared by the named readers (EEG plan E7–E11) ─────────────────────────────────────────────────────────────────
// Functions a source NAMES without defining (Connor 2022 Table 1 calls MATLAB's `blackman`, `baseline` (its own line
// 57: a least-squares line), `butter`); each is written here from its standard definition, not from any code, and is
// tested against that definition (test/l3/eeg-devices/bis-type.test.ts). Named, not defined, in the source.

/** MATLAB's symmetric Blackman window of n points: 0.42 − 0.5·cos(2πi/(n−1)) + 0.08·cos(4πi/(n−1)) (the window's
 * definition; Connor 2022 Table 1 l. 37 names it, Rampil 1998 p. 1000 says the BIS epoch is Blackman-windowed). */
export function blackman(n: number): number[] {
  return Array.from({ length: n }, (_, i) => 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (n - 1)));
}

/** x minus its least-squares straight line (Connor 2022 Table 1 l. 57 `baseline`: the fit of [1, i] to x). */
export function detrend(x: ArrayLike<number>): number[] {
  const n = x.length;
  let si = 0, sx = 0, sii = 0, six = 0;
  for (let i = 1; i <= n; i++) {
    const v = x[i - 1] as number;
    si += i; sx += v; sii += i * i; six += i * v;
  }
  const den = n * sii - si * si;
  const b = den !== 0 ? (n * six - si * sx) / den : 0;
  const a = (sx - b * si) / n;
  return Array.from({ length: n }, (_, i) => (x[i] as number) - (a + b * (i + 1)));
}

/** The second-order Butterworth high-pass at fcHz for a sample rate fs (MATLAB `butter(2, fc/(fs/2), 'high')`, the
 * bilinear transform with the cut-off pre-warped: |H| = 1/√2 at fc, 0 at 0 Hz, 1 at fs/2): b, a with a0 = 1. */
export function butterHighpass2(fcHz: number, fs: number): { b: [number, number, number]; a: [number, number] } {
  const k = Math.tan((Math.PI * fcHz) / fs);
  const q = Math.SQRT2 * k;
  const n = 1 / (1 + q + k * k);
  return { b: [n, -2 * n, n], a: [2 * (k * k - 1) * n, (1 - q + k * k) * n] };
}

/** The DFT of v (already windowed) at bins 0 … kMax: re, im. Same tables as psdOf; N·(kMax+1) multiply-adds. */
export function dftOf(v: readonly number[], kMax: number): { re: number[]; im: number[] } {
  const n = v.length;
  const { cos, sin } = table(n);
  const re = new Array<number>(kMax + 1);
  const im = new Array<number>(kMax + 1);
  for (let k = 0; k <= kMax; k++) {
    let a = 0;
    let b = 0;
    for (let i = 0, j = 0; i < n; i++, j = (j + k) % n) {
      a += (v[i] as number) * (cos[j] as number);
      b -= (v[i] as number) * (sin[j] as number);
    }
    re[k] = a;
    im[k] = b;
  }
  return { re, im };
}
