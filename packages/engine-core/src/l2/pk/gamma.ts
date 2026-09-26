// The brief §4.9 drug effect curve, kept as the FALLBACK path for drugs without a PK model in v1 (tables §6.1 "kept
// as gamma effect curves"): E(t) = (t/tp)^n·e^{n(1 − t/tp)}, 1 at t = tp. A dose contributes scale·E(t − tGiven),
// where scale = dose/refDose (× tachyphylaxis); the sum is a normalised effect-site "concentration" in reference-dose
// units, fed to the same PD as a Ce (decision 5). n from the row's duration: E falls to 0.1 at t ≈ tp·(1 + 2.3/√n).
export interface GammaDose {
  t: number; // s, given at
  scale: number;
}

export function gammaShape(dtS: number, tpS: number, n: number): number {
  if (dtS <= 0) return 0;
  const r = dtS / tpS;
  return r ** n * Math.exp(n * (1 - r));
}

export function gammaConc(doses: readonly GammaDose[], t: number, tpS: number, n: number): number {
  let c = 0;
  for (const d of doses) c += d.scale * gammaShape(t - d.t, tpS, n);
  return c;
}

/** Shape exponent n from time to peak and the time at which the effect has fallen to 10 % (both s). */
export function gammaN(tpS: number, t10S: number): number {
  const x = Math.max(1.05, t10S / tpS);
  // solve x^n·e^{n(1−x)} = 0.1 → n = ln(0.1)/(ln x + 1 − x)
  return Math.log(0.1) / (Math.log(x) + 1 - x);
}
