// Spectral analysis of generated EEG samples for the EEG tests (plan §7 E3 "a Welch spectrum of 60 s of output"):
// Welch's averaged periodogram (Hann window, 50 % overlap), band power, a log–log slope fit and simple statistics.
// A plain DFT per segment: the tests analyse at most a few minutes at 125 Hz, so speed is not a concern here.

export interface Welch { f: number[]; psd: number[] } // one-sided PSD, µV²/Hz

/** Welch PSD of `x` sampled at `fs`, segments of `segN` samples (default 256 ≈ 2 s at 125 Hz), 50 % overlap. */
export function welch(x: ArrayLike<number>, fs: number, segN = 256): Welch {
  const w = Array.from({ length: segN }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / segN));
  const u = w.reduce((a, b) => a + b * b, 0);
  const half = Math.floor(segN / 2);
  const acc = new Float64Array(half);
  const cos = Array.from({ length: segN }, (_, i) => Math.cos((2 * Math.PI * i) / segN));
  const sin = Array.from({ length: segN }, (_, i) => Math.sin((2 * Math.PI * i) / segN));
  let segs = 0;
  const hop = Math.max(1, Math.floor(segN / 2));
  for (let s = 0; s + segN <= x.length; s += hop) {
    let mean = 0;
    for (let i = 0; i < segN; i++) mean += x[s + i] as number;
    mean /= segN;
    for (let k = 1; k < half; k++) {
      let re = 0;
      let im = 0;
      for (let i = 0; i < segN; i++) {
        const v = ((x[s + i] as number) - mean) * (w[i] as number);
        const j = (k * i) % segN;
        re += v * (cos[j] as number);
        im -= v * (sin[j] as number);
      }
      acc[k] = (acc[k] as number) + (2 * (re * re + im * im)) / (fs * u);
    }
    segs++;
  }
  const f: number[] = [];
  const psd: number[] = [];
  for (let k = 1; k < half; k++) {
    f.push((k * fs) / segN);
    psd.push((acc[k] as number) / Math.max(1, segs));
  }
  return { f, psd };
}

/** Power in [lo, hi) Hz, µV². */
export function band(w: Welch, lo: number, hi: number): number {
  const df = (w.f[1] as number) - (w.f[0] as number);
  let p = 0;
  w.f.forEach((f, i) => {
    if (f >= lo && f < hi) p += (w.psd[i] as number) * df;
  });
  return p;
}

/** Least-squares exponent κ of PSD ∝ f^−κ over [lo, hi] Hz, for any (f, psd) pairs. */
export function slopeFit(f: number[], psd: number[], lo: number, hi: number): number {
  const xs: number[] = [];
  const ys: number[] = [];
  f.forEach((v, i) => {
    if (v >= lo && v <= hi && (psd[i] as number) > 0) {
      xs.push(Math.log10(v));
      ys.push(Math.log10(psd[i] as number));
    }
  });
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * ((ys[i] as number) - my);
    sxx += (x - mx) ** 2;
  });
  return -sxy / sxx;
}

/** The frequency of the largest value of `psd` within [lo, hi] Hz. */
export function argmaxIn(f: number[], psd: number[], lo: number, hi: number): number {
  let best = -Infinity;
  let at = Number.NaN;
  f.forEach((v, i) => {
    if (v >= lo && v <= hi && (psd[i] as number) > best) {
      best = psd[i] as number;
      at = v;
    }
  });
  return at;
}

/** Median frequency of [lo, hi) Hz, Hz. */
export function medianF(w: Welch, lo: number, hi: number): number {
  const half = band(w, lo, hi) / 2;
  const df = (w.f[1] as number) - (w.f[0] as number);
  let p = 0;
  for (let i = 0; i < w.f.length; i++) {
    const f = w.f[i] as number;
    if (f < lo || f >= hi) continue;
    p += (w.psd[i] as number) * df;
    if (p >= half) return f;
  }
  return hi;
}

export const rms = (x: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += (x[i] as number) ** 2;
  return Math.sqrt(s / x.length);
};

/** The q-quantile (0–1) of |x|. */
export function absQuantile(x: ArrayLike<number>, q: number): number {
  const a = Array.from(x, Math.abs).sort((p, r) => p - r);
  return a[Math.min(a.length - 1, Math.floor(q * a.length))] as number;
}

/** Stretches where |x| stays below `uv` for at least `minS` (the suppression criterion), as [start, end) indices. */
export function suppressedRuns(x: ArrayLike<number>, fs: number, uv = 5, minS = 0.5): [number, number][] {
  const out: [number, number][] = [];
  let start = -1;
  for (let i = 0; i <= x.length; i++) {
    const quiet = i < x.length && Math.abs(x[i] as number) < uv;
    if (quiet && start < 0) start = i;
    if (!quiet && start >= 0) {
      if (i - start >= minS * fs) out.push([start, i]);
      start = -1;
    }
  }
  return out;
}

/** dB ratio. */
export const db = (a: number, b: number): number => 10 * Math.log10(a / b);
