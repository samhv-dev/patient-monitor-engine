// PD primitives (Stage 7g decision 6/7). Pure functions; every constant is cited where it is used.

/** Sigmoid Emax: emax·c^n/(c^n + ec50^n); emax may be negative (depressant). */
export function hill(c: number, ec50: number, emax: number, n = 1): number {
  if (!(c > 0)) return 0;
  const cn = c ** n;
  return (emax * cn) / (cn + ec50 ** n);
}

/** Competitive antagonism: EC50·(1 + Cant/Ki), written with receptor occupancy o = Cant/(Cant + Ki) (capped 0.95). */
export function competitiveEc50(ec50: number, occupancy: number): number {
  const o = Math.min(0.95, Math.max(0, occupancy));
  return ec50 * (1 + o / (1 - o));
}

/** Catecholamine efficacy under acidaemia (tables §5b.1/§6.2): ×(1 − 2.5·(7.4 − pH)), 0.4–1 [ENG, Q44]. */
export function acidosisFactor(ph: number): number {
  if (!(ph < 7.4)) return 1;
  return Math.max(0.4, 1 - 2.5 * (7.4 - ph));
}

/** Greco/Minto response surface, simplest form: U = Uh + Uo + α·Uh·Uo (α 1.5 [ENG within Bouillon 2004]). */
export const SURFACE_ALPHA = 1.5;
export const responseSurface = (uh: number, uo: number, alpha = SURFACE_ALPHA): number => uh + uo + alpha * uh * uo;

/** Tachyphylaxis multiplier after n recent repeats (ephedrine 0.7 per repeat within 60 min, tables §6.2 [ENG]). */
export const tachy = (nRecent: number, f: number): number => f ** Math.max(0, nRecent);

/**
 * β-receptor occupancy by a β-blocker drug blunts the RISE of a catecholamine-driven multiplier (7e's surge
 * `endoHrF`/`endoEesF`, R51 addendum 11): 1 + (f − 1)·(1 − occupancy) for f > 1; a fall passes unchanged [ENG:
 * the same competitive picture as the β-agonist EC50 shift, collapsed to the fraction of receptors left].
 */
export function betaBlunt(f: number, occupancy: number): number {
  if (!(f > 1)) return f;
  return 1 + (f - 1) * (1 - Math.min(1, Math.max(0, occupancy)));
}

/** Eleveld BIS Ce50 age slope: Ce50(age) = Ce50(35)·e^(−0.00635·(age − 35)) (tables §5d, R51 addendum 11). */
export const ELEVELD_CE50_AGE_K = 0.00635;
