// Neuromuscular blockers, succinylcholine and sugammadex (Stage 7g; tables §5d/§6.1). Per-kg 2-compartment PK with
// TWO effect sites [adductor pollicis, diaphragm/larynx] (Plaud 1995: the diaphragm needs ≈ 1.7× the concentration
// and equilibrates faster). Amount unit µg → concentrations ng/mL. 7f owns the block/TOF PD; `testT1` is its
// formula, used here only to fit and test onset/duration against the labels.
import { fromClearances, type PkParams } from './compartment.ts';

export interface PerKgPk {
  v1: number; v2: number; v3: number; // L/kg
  cl1: number; cl2: number; cl3: number; // L/kg/min
  ke0: number[]; // /min per effect site
}

export function perKg(m: PerKgPk, weightKg: number, clMult = 1): PkParams {
  const w = weightKg;
  return fromClearances(m.v1 * w, m.v2 * w, m.v3 * w, m.cl1 * w * clMult, m.cl2 * w, m.cl3 * w, m.ke0);
}

/** Rocuronium: label CL 0.25 L/kg/h, Vss 0.25 L/kg [P]; V1/Q fitted (task header) [ENG]; ke0 thumb 0.16, diaphragm 0.26 (Plaud 1995) [P]. */
export const ROCURONIUM: PerKgPk = { v1: 0.06, v2: 0.2, v3: 0, cl1: 0.0042, cl2: 0.005, cl3: 0, ke0: [0.16, 0.26] };
/** Vecuronium: label CL 3–5.3 mL/kg/min, Vss 0.3–0.4 L/kg [P]; ke0 0.10 [ENG, fitted 0.1 mg/kg → onset 3.6 / duration 26.8 min]. */
export const VECURONIUM: PerKgPk = { v1: 0.05, v2: 0.3, v3: 0, cl1: 0.0045, cl2: 0.006, cl3: 0, ke0: [0.1, 0.16] };
/** Cisatracurium: Hofmann elimination, CL ≈ 5 mL/kg/min organ-independent, Vss ≈ 0.15 L/kg [P label]; ke0 0.08 [ENG, fitted 0.15 mg/kg → 2.82 / 42.4 min]. */
export const CISATRACURIUM: PerKgPk = { v1: 0.045, v2: 0.11, v3: 0, cl1: 0.0052, cl2: 0.009, cl3: 0, ke0: [0.08, 0.128] };
/**
 * Succinylcholine: plasma-cholinesterase hydrolysis (plasma t½ ≈ 8 s) [TXT]; the block's duration is the slow diffusion
 * away from the junction (no cholinesterase there) → ke0 0.15 [ENG, fitted 1 mg/kg → onset 0.43 / T1 25 % at 7.2 min].
 * CL 0.2 L/kg/min with V1 0.04 L/kg is k10 5/min, plasma t½ ≈ 8 s [TXT]. Phenotypes: PCHE_CL_MULT below.
 */
export const SUCCINYLCHOLINE: PerKgPk = { v1: 0.04, v2: 0, v3: 0, cl1: 0.2, cl2: 0, cl3: 0, ke0: [0.15, 0.24] };
/**
 * Plasma-cholinesterase clearance multipliers — the ONE value 7g and 7f use (R51 addendum 10). Tables §5d give
 * the phenotypes' DURATIONS (Sux-label; Lee 2009: heterozygous ×2, homozygous 4–8 h) but no enzyme-activity value,
 * so both multipliers are [ENG, fitted to those durations]: het 0.5 → 12 min (×1.7), hom 0.003 → 5.2 h.
 */
export const PCHE_CL_MULT = { normal: 1, het: 0.5, hom: 0.003 } as const;
/**
 * Sugammadex: Vss 11–14 L, CL 88 mL/min, t½ 2 h (label) [P]; one compartment per kg. Two effect sites [thumb,
 * diaphragm] through which it reaches the junction and binds there (R51 §5): ke0 0.095 / 0.152 [ENG, fitted, D7:
 * 2 mg/kg at T2 → TOFR 0.9 in 2.11 min (label 2.2); 4 mg/kg at T1 ≥ 1 % → 2.22 (label 2.7, IQR 2.1–4.3);
 * 16 mg/kg 3 min after roc 1.2 → T1 10 % at 1.80 (label 1.2)]. Rocuronium's own 0.16/0.26 reverses in 1.4 min.
 */
export const SUGAMMADEX: PerKgPk = { v1: 0.17, v2: 0, v3: 0, cl1: 0.00126, cl2: 0, cl3: 0, ke0: [0.095, 0.152] };

/** EC50 (ng/mL) and Hill γ per site. Rocuronium Plaud 1995 [P] (γ 4.8 [VERIFY]); others ED95-scaled [ENG] (Miller 10e ch. 24 Table 24.3: ED95 roc 0.305, vec 0.043, cis 0.04 mg/kg). */
export const NMB_PD = {
  rocuronium: { thumb: { ec50: 823, gamma: 4.8 }, dia: { ec50: 1424, gamma: 4.8 } },
  vecuronium: { thumb: { ec50: 150, gamma: 4.5 }, dia: { ec50: 255, gamma: 4.5 } },
  cisatracurium: { thumb: { ec50: 230, gamma: 6.9 }, dia: { ec50: 390, gamma: 6.9 } },
  succinylcholine: { thumb: { ec50: 200, gamma: 4 }, dia: { ec50: 340, gamma: 4 } }, // effect-site fit, not a plasma EC50 [ENG]
} as const;

/** Molar masses (g/mol) of the salts as dosed: rocuronium bromide, vecuronium bromide, sugammadex sodium. */
export const MW = { rocuronium: 609.7, vecuronium: 637.7, sugammadex: 2178 } as const;

/** 7f's block formula (tables §5d): T1 = 1 − Ce^γ/(Ce^γ + EC50^γ). */
export const testT1 = (ce: number, ec50: number, gamma: number): number => 1 - ce ** gamma / (ce ** gamma + ec50 ** gamma);

/**
 * Instant 1:1 molar binding in the central compartment (tables §5d "Sugammadex mechanism"; Ka ≈ 1.8·10⁷ M⁻¹ makes
 * it complete at clinical doses). Mutates the two state vectors (roc/vec in µg, sugammadex in mg).
 */
export function bindSugammadex(nmb: number[], sgx: number[], mwNmb: number = MW.rocuronium): { boundUmol: number } {
  const nmbUmol = (nmb[0] as number) / mwNmb;
  const sgxUmol = ((sgx[0] as number) * 1000) / MW.sugammadex;
  const b = Math.min(nmbUmol, sgxUmol);
  nmb[0] = (nmb[0] as number) - b * mwNmb;
  sgx[0] = (sgx[0] as number) - (b * MW.sugammadex) / 1000;
  return { boundUmol: b };
}

/**
 * The same 1:1 molar binding at both effect sites (x[3] thumb, x[4] diaphragm; R51 §5), in concentration terms:
 * the NMB's Ce in ng/mL = µg/L → µmol/L = Ce/MW; sugammadex's Ce in mg/L → µmol/L = Ce·1000/MW. The effect sites are
 * the model's hypothetical compartments, so binding there is [ENG] (tables §5d "Ce washout via rocuronium ke0" is
 * the plasma-only form; D7). Mutates both vectors.
 */
export function bindSugammadexSites(nmb: number[], sgx: number[], mwNmb: number = MW.rocuronium): void {
  for (const i of [3, 4]) {
    const n = (nmb[i] ?? 0) / mwNmb;
    const s = ((sgx[i] ?? 0) * 1000) / MW.sugammadex;
    const b = Math.min(n, s);
    if (!(b > 0)) continue;
    nmb[i] = (nmb[i] as number) - b * mwNmb;
    sgx[i] = (sgx[i] as number) - (b * MW.sugammadex) / 1000;
  }
}
