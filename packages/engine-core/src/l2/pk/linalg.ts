// Small dense linear algebra for the compartment models (Stage 7g). Matrices are row-major number[] of size n×n.
// The PK systems are at most 3 + 2 effect sites + 1 input = 6 states, so an O(n³) scaling-and-squaring exponential
// is exact to machine precision and costs microseconds; it runs only when a drug's parameters change.

/** C = A·B (n×n). */
export function matMul(a: readonly number[], b: readonly number[], n: number): number[] {
  const c = new Array<number>(n * n).fill(0);
  for (let i = 0; i < n; i++)
    for (let k = 0; k < n; k++) {
      const aik = a[i * n + k] as number;
      if (aik === 0) continue;
      for (let j = 0; j < n; j++) c[i * n + j] = (c[i * n + j] as number) + aik * (b[k * n + j] as number);
    }
  return c;
}

/** y = A·x. */
export function matVec(a: readonly number[], x: readonly number[], n: number): number[] {
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += (a[i * n + j] as number) * (x[j] as number);
    y[i] = s;
  }
  return y;
}

/**
 * e^A by scaling and squaring with an 18-term Taylor series (Moler & Van Loan 2003, method 3). The 1-norm is scaled
 * below 0.5, where 18 terms reach ≈ 1e-20 relative truncation — far below the float64 rounding of the squarings.
 */
export function expm(a: readonly number[], n: number): number[] {
  let norm = 0;
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += Math.abs(a[i * n + j] as number);
    norm = Math.max(norm, s);
  }
  const sq = norm > 0.5 ? Math.ceil(Math.log2(norm / 0.5)) : 0;
  const f = 2 ** -sq;
  const as = a.map((v) => v * f);
  const id = (i: number): number => (Math.floor(i / n) === i % n ? 1 : 0);
  let term = as.map((_, i) => id(i));
  let sum = term.slice();
  for (let k = 1; k <= 18; k++) {
    term = matMul(term, as, n).map((v) => v / k);
    for (let i = 0; i < n * n; i++) sum[i] = (sum[i] as number) + (term[i] as number);
  }
  for (let s = 0; s < sq; s++) sum = matMul(sum, sum, n);
  return sum;
}
