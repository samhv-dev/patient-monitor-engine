// Distribution statistics for recorded-vs-generated comparisons (brief §9; decision 7).
export function quantile(xs: ArrayLike<number>, q: number): number {
  const v = Array.from(xs).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return Number.NaN;
  const k = (v.length - 1) * q;
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  return (v[lo] as number) + ((v[hi] as number) - (v[lo] as number)) * (k - lo);
}
export const median = (xs: ArrayLike<number>): number => quantile(xs, 0.5);
export const mean = (xs: ArrayLike<number>): number => {
  const v = Array.from(xs).filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : Number.NaN;
};

/** Two-sample Kolmogorov–Smirnov statistic D (0 = identical empirical CDFs, 1 = disjoint). */
export function ksD(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const x = Array.from(a).filter(Number.isFinite).sort((p, q) => p - q);
  const y = Array.from(b).filter(Number.isFinite).sort((p, q) => p - q);
  if (!x.length || !y.length) return Number.NaN;
  let i = 0;
  let j = 0;
  let d = 0;
  while (i < x.length && j < y.length) {
    const v = Math.min(x[i] as number, y[j] as number);
    while (i < x.length && (x[i] as number) <= v) i++;
    while (j < y.length && (y[j] as number) <= v) j++;
    d = Math.max(d, Math.abs(i / x.length - j / y.length));
  }
  return d;
}

/** 1-Wasserstein (earth mover's) distance between two empirical distributions, in the data's units. */
export function wasserstein1(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const x = Array.from(a).filter(Number.isFinite).sort((p, q) => p - q);
  const y = Array.from(b).filter(Number.isFinite).sort((p, q) => p - q);
  if (!x.length || !y.length) return Number.NaN;
  const n = 200; // quantile grid [ENG]
  let s = 0;
  for (let k = 0; k < n; k++) {
    const q = (k + 0.5) / n;
    s += Math.abs(quantile(x, q) - quantile(y, q));
  }
  return s / n;
}

/** Fraction of `xs` inside [lo, hi] (interval coverage). */
export function coverage(xs: ArrayLike<number>, lo: number, hi: number): number {
  const v = Array.from(xs).filter(Number.isFinite);
  return v.length ? v.filter((x) => x >= lo && x <= hi).length / v.length : Number.NaN;
}

export function pearson(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    ma += a[i] as number;
    mb += b[i] as number;
  }
  ma /= n;
  mb /= n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    const da = (a[i] as number) - ma;
    const db = (b[i] as number) - mb;
    sab += da * db;
    saa += da * da;
    sbb += db * db;
  }
  return sab / Math.sqrt(saa * sbb);
}
