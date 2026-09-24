// Small statistics helpers for rhythm tests (written from textbook definitions).

/** One-sample Kolmogorov–Smirnov test against U(0,1). Returns D and the asymptotic p-value
 *  (Kolmogorov distribution with Stephens' small-sample correction λ = (√n + 0.12 + 0.11/√n)·D). */
export function ksUniform(xs: readonly number[]): { d: number; p: number } {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  let d = 0;
  s.forEach((x, i) => {
    d = Math.max(d, (i + 1) / n - x, x - i / n);
  });
  const sq = Math.sqrt(n);
  const lambda = (sq + 0.12 + 0.11 / sq) * d;
  let p = 0;
  for (let k = 1; k <= 100; k++) p += 2 * (-1) ** (k - 1) * Math.exp(-2 * k * k * lambda * lambda);
  return { d, p: Math.min(1, Math.max(0, p)) };
}

/** Lag-1 autocorrelation coefficient. */
export function lag1(xs: readonly number[]): number {
  const n = xs.length;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const d = (xs[i] as number) - m;
    den += d * d;
    if (i > 0) num += d * ((xs[i - 1] as number) - m);
  }
  return num / den;
}
