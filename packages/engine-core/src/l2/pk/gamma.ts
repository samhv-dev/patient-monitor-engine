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

export function gammaConc(doses: readonly GammaDose[], t: number, tpS: number, n: number, t10S?: number): number {
  let c = 0;
  // FU-7 (R51 addendum 19): a shape with n < 1 rises with an infinite slope (a step onset); such rows use the
  // zero-slope transit chain fitted to the SAME peak time and 10 % time. n ≥ 1 rows keep the gamma (slope 0 at t = 0).
  const chain = t10S !== undefined && n < ONSET_N_MIN ? onsetChain(tpS, t10S) : null;
  for (const d of doses) c += d.scale * (chain ? chainShape(t - d.t, chain) : gammaShape(t - d.t, tpS, n));
  return c;
}

/** Below this gamma exponent the curve's initial slope is infinite (step onset): the transit chain replaces it. */
export const ONSET_N_MIN = 1;

/**
 * FU-7 (R51 addendum 19) zero-slope onset: a dose passes two equal transit compartments (rate ka: injection, mixing,
 * arm–brain circulation) into the effect compartment, which empties at ke (redistribution/elimination):
 *   C(t) ∝ e^{−ke·t} − e^{−ka·t}·(1 + (ka − ke)·t)      (Laplace ka²/((s + ka)²(s + ke)), up to a constant)
 * C(0) = 0 and C′(0) = 0 (no step onset); the tail is mono-exponential. With τ = ke·t and r = ka/ke the shape
 * depends on r only, so r is solved from t10/tp by bisection and ke = τpeak(r)/tp. Normalised to 1 at t = tp.
 */
export interface OnsetChain { ke: number; ka: number; peak: number }

const shapeTau = (tau: number, r: number): number => Math.exp(-tau) - Math.exp(-r * tau) * (1 + (r - 1) * tau);
function tauPeak(r: number): number {
  // dC/dτ = 0: −e^{−τ} + r·e^{−rτ}(1 + (r − 1)τ) − (r − 1)e^{−rτ} = 0 → bisection on (0, 60]
  const g = (x: number) => -Math.exp(-x) + Math.exp(-r * x) * (r * (1 + (r - 1) * x) - (r - 1));
  let lo = 1e-9;
  let hi = 60;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (g(mid) > 0) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}
function tau10(r: number, tp: number): number {
  const pk = shapeTau(tp, r);
  let lo = tp;
  let hi = tp + 60;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (shapeTau(mid, r) > 0.1 * pk) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}
const CHAINS = new Map<string, OnsetChain>();
export function onsetChain(tpS: number, t10S: number): OnsetChain {
  const key = `${tpS}|${t10S}`;
  const hit = CHAINS.get(key);
  if (hit) return hit;
  const want = t10S / tpS;
  let lo = 1.001;
  let hi = 1e5;
  for (let i = 0; i < 200; i++) {
    const r = Math.sqrt(lo * hi);
    const tp = tauPeak(r);
    if (tau10(r, tp) / tp < want) lo = r;
    else hi = r;
  }
  const r = Math.sqrt(lo * hi);
  const tp = tauPeak(r);
  const ke = tp / tpS;
  const out = { ke, ka: r * ke, peak: shapeTau(tp, r) };
  CHAINS.set(key, out);
  return out;
}
export function chainShape(dtS: number, c: OnsetChain): number {
  if (dtS <= 0) return 0;
  return shapeTau(c.ke * dtS, c.ka / c.ke) / c.peak;
}

/** Shape exponent n from time to peak and the time at which the effect has fallen to 10 % (both s). */
export function gammaN(tpS: number, t10S: number): number {
  const x = Math.max(1.05, t10S / tpS);
  // solve x^n·e^{n(1−x)} = 0.1 → n = ln(0.1)/(ln x + 1 − x)
  return Math.log(0.1) / (Math.log(x) + 1 - x);
}
