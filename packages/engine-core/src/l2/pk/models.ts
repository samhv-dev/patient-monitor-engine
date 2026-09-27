// Published PK(+ke0) models, as functions of the patient (Stage 7g; tables §6.1). Units: volumes L, clearances
// L/min, ke0 /min; amounts in the drug's amount unit (propofol mg → µg/mL; remifentanil/fentanyl µg → ng/mL).
import { ffmAlSallami, lbmJames, type PkPatient } from './covariates.ts';
import { fromClearances, pkStep, pkSystem, zeroState, type PkParams } from './compartment.ts';

export interface ModelOpts {
  /** Eleveld: opioids co-administered (changes CL and V3) */
  opioids?: boolean;
}

const sig = (x: number, e50: number, g: number) => x ** g / (x ** g + e50 ** g);

/**
 * Eleveld 2018 propofol (Br J Anaesth 120:942–959), ARTERIAL PK, Table 2 θ1–θ18, reference 35 y, 70 kg, 170 cm,
 * male, no opioids. ke0 (arterial) 0.146·(W/70)^−0.25 (the same paper's PD part).
 */
export function eleveldPropofol(p: PkPatient, o: ModelOpts = {}): PkParams {
  const ref: PkPatient = { ageY: 35, weightKg: 70, heightCm: 170, sex: 'm' };
  const pma = p.pmaWeeks ?? p.ageY * 52.143 + 40;
  const pmaRef = 35 * 52.143 + 40;
  const fCentral = (w: number) => sig(w, 33.6, 1);
  const fAging = (x: number) => Math.exp(x * (p.ageY - 35));
  const fOpi = (x: number) => (o.opioids ? Math.exp(x * p.ageY) : 1);
  const fClMat = sig(pma, 42.3, 9.06) / sig(pmaRef, 42.3, 9.06);
  const fQ3Mat = (a: number) => sig(a * 52.143 + 40, 68.3, 1);
  const v1 = 6.28 * (fCentral(p.weightKg) / fCentral(70));
  const v2 = 25.5 * (p.weightKg / 70) * fAging(-0.0156);
  const v3 = 273 * (ffmAlSallami(p) / ffmAlSallami(ref)) * fOpi(-0.0138);
  const cl = (p.sex === 'm' ? 1.79 : 2.1) * (p.weightKg / 70) ** 0.75 * fClMat * fOpi(-0.00286);
  const q2 = 1.75 * (v2 / 25.5) ** 0.75 * (1 + 1.3 * (1 - fQ3Mat(p.ageY)));
  const q3 = 1.11 * (v3 / 273) ** 0.75 * (fQ3Mat(p.ageY) / fQ3Mat(35));
  return fromClearances(v1, v2, v3, cl, q2, q3, [0.146 * (p.weightKg / 70) ** -0.25]);
}

/** Schnider 1998/1999 propofol (Anesthesiology 88:1170; 90:1502); ke0 0.456 (TTPE 1.6 min). */
export function schniderPropofol(p: PkPatient): PkParams {
  const lbm = lbmJames(p);
  const v2 = 18.9 - 0.391 * (p.ageY - 53);
  const cl1 = 1.89 + 0.0456 * (p.weightKg - 77) - 0.0681 * (lbm - 59) + 0.0264 * (p.heightCm - 177);
  const cl2 = 1.29 - 0.024 * (p.ageY - 53);
  return fromClearances(4.27, v2, 238, cl1, cl2, 0.836, [0.456]);
}

/** Marsh 1991 propofol (Br J Anaesth 67:41), weight-proportional V1; ke0 0.26 (Diprifusor) or 1.21 (modified) [TXT]. */
export function marshPropofol(p: PkPatient, modified = false): PkParams {
  return { v1: 0.228 * p.weightKg, k10: 0.119, k12: 0.112, k21: 0.055, k13: 0.0419, k31: 0.0033, ke0: [modified ? 1.21 : 0.26] };
}

/** Time to peak effect-site concentration after a bolus (min), 0.1 s resolution, 20 min horizon. */
export function ttpeMin(p: PkParams, site = 0): number {
  const s = pkSystem(p, 0.1);
  let x = zeroState(p);
  x[0] = 1;
  let best = 0;
  let t = 0;
  for (let k = 1; k <= 12000; k++) {
    x = pkStep(s, x, 0);
    const c = x[3 + site] as number;
    if (c > best) {
      best = c;
      t = k / 600;
    }
  }
  return t;
}

/** Minto 1997 remifentanil (Anesthesiology 86:10), LBM (James) and age covariates; ke0 0.595 − 0.007(age − 40). */
export function mintoRemifentanil(p: PkPatient): PkParams {
  const lbm = lbmJames(p);
  const a = p.ageY - 40;
  const l = lbm - 55;
  return fromClearances(
    5.1 - 0.0201 * a + 0.072 * l,
    9.82 - 0.0811 * a + 0.108 * l,
    5.42,
    2.6 - 0.0162 * a + 0.0191 * l,
    2.05 - 0.0301 * a,
    0.076 - 0.00113 * a,
    [0.595 - 0.007 * a],
  );
}

/**
 * ke0 fitted by the time-to-peak-effect method (Minto 2003; Shafer & Varvel 1991): the ke0 for which ttpeMin(p)
 * equals the published TTPE with THIS PK (a ke0 belongs to its PK model). Geometric bisection, 40 iterations.
 */
export function ke0ForTtpe(p: PkParams, ttpe: number): number {
  let lo = 0.01;
  let hi = 5;
  for (let i = 0; i < 40; i++) {
    const m = Math.sqrt(lo * hi);
    if (ttpeMin({ ...p, ke0: [m] }) > ttpe) lo = m;
    else hi = m;
  }
  return Math.sqrt(lo * hi);
}

/** Fentanyl ke0 = ke0ForTtpe(Shafer PK, 3.6 min) — decision 2 / D2 (tables 0.147 was fitted with another PK). */
export const FENTANYL_KE0 = 0.117;
/** Sufentanil ke0 = ke0ForTtpe(Gepts PK, 5.6 min, Shafer & Varvel 1991). */
export const SUFENTANIL_KE0 = 0.176;

/** Shafer 1990 fentanyl (Anesthesiology 73:1091) microconstants [VERIFY against the paper's Table 3]. */
export function shaferFentanyl(): PkParams {
  return { v1: 6.09, k10: 0.0827, k12: 0.471, k21: 0.102, k13: 0.225, k31: 0.006, ke0: [FENTANYL_KE0] };
}

/** Gepts 1995 sufentanil (Anesthesiology 83:1194) microconstants [VERIFY]; CSHT 3 h ≈ 26 min (Hughes 1992: 20–30). */
export function geptsSufentanil(): PkParams {
  return { v1: 14.3, k10: 0.0645, k12: 0.1086, k21: 0.0245, k13: 0.0229, k31: 0.0013, ke0: [SUFENTANIL_KE0] };
}
