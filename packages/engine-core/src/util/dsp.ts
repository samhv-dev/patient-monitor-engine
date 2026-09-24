// Small DSP helpers shared by engine tests and the template-extraction scripts (textbook definitions:
// radix-2 FFT, Welch's averaged periodogram with a Hann window). No imports, so dev scripts can load it directly.

/** In-place radix-2 FFT (re, im of equal power-of-two length). */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] as number;
      re[i] = re[j] as number;
      re[j] = tr;
      const ti = im[i] as number;
      im[i] = im[j] as number;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < len / 2; j++) {
        const wr = Math.cos(ang * j);
        const wi = Math.sin(ang * j);
        const a = i + j;
        const b = a + len / 2;
        const xr = (re[b] as number) * wr - (im[b] as number) * wi;
        const xi = (re[b] as number) * wi + (im[b] as number) * wr;
        re[b] = (re[a] as number) - xr;
        im[b] = (im[a] as number) - xi;
        re[a] = (re[a] as number) + xr;
        im[a] = (im[a] as number) + xi;
      }
    }
  }
}

/** Welch PSD (Hann window, 50% overlap, per-segment mean removed). nfft must be a power of two ≤ x.length. */
export function welch(x: ArrayLike<number>, fs: number, nfft = 1024): { f: Float64Array; p: Float64Array } {
  if (x.length < nfft) throw new RangeError(`welch: need ≥ ${nfft} samples, got ${x.length}`);
  const hop = nfft / 2;
  const w = new Float64Array(nfft);
  for (let i = 0; i < nfft; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (nfft - 1));
  const p = new Float64Array(nfft / 2 + 1);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  let segs = 0;
  for (let s = 0; s + nfft <= x.length; s += hop) {
    let m = 0;
    for (let i = 0; i < nfft; i++) m += x[s + i] as number;
    m /= nfft;
    for (let i = 0; i < nfft; i++) {
      re[i] = ((x[s + i] as number) - m) * (w[i] as number);
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= nfft / 2; k++) p[k] = (p[k] as number) + (re[k] as number) ** 2 + (im[k] as number) ** 2;
    segs++;
  }
  const f = new Float64Array(nfft / 2 + 1);
  for (let k = 0; k <= nfft / 2; k++) {
    f[k] = (k * fs) / nfft;
    p[k] = (p[k] as number) / segs;
  }
  return { f, p };
}

/** Frequency of the maximum of the 5-bin-smoothed Welch PSD within [lo, hi] Hz. */
export function dominantHz(x: ArrayLike<number>, fs: number, lo = 1, hi = 12, nfft = 2048): number {
  const { f, p } = welch(x, fs, nfft);
  let best = -1;
  let bf = 0;
  for (let k = 0; k < p.length; k++) {
    const fk = f[k] as number;
    if (fk < lo || fk > hi) continue;
    let s = 0;
    for (let j = -2; j <= 2; j++) s += p[Math.min(p.length - 1, Math.max(0, k + j))] as number;
    if (s > best) {
      best = s;
      bf = fk;
    }
  }
  return bf;
}

export function rms(x: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += (x[i] as number) ** 2;
  return Math.sqrt(s / x.length);
}

/** Fraction of [lo, hi] Hz power within ±halfWidth Hz of the dominant frequency (organisation index) [ENG]. */
export function organisation(x: ArrayLike<number>, fs: number, lo = 1, hi = 12, halfWidth = 1, nfft = 2048): number {
  const { f, p } = welch(x, fs, nfft);
  const fd = dominantHz(x, fs, lo, hi, nfft);
  let tot = 0;
  let near = 0;
  for (let k = 0; k < p.length; k++) {
    const fk = f[k] as number;
    if (fk < lo || fk > hi) continue;
    tot += p[k] as number;
    if (Math.abs(fk - fd) <= halfWidth) near += p[k] as number;
  }
  return near / tot;
}

/** Fraction of [lo, hi] Hz power below `below` Hz. */
export function lowFraction(x: ArrayLike<number>, fs: number, below = 2.5, lo = 1, hi = 12, nfft = 2048): number {
  const { f, p } = welch(x, fs, nfft);
  let tot = 0;
  let low = 0;
  for (let k = 0; k < p.length; k++) {
    const fk = f[k] as number;
    if (fk < lo || fk > hi) continue;
    tot += p[k] as number;
    if (fk < below) low += p[k] as number;
  }
  return low / tot;
}
