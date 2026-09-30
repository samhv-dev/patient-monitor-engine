// Stage 7c constants and patient scaling (tables §1.1–1.5, §5.3, §5b.1–5b.4; annex §5b). Every number cites its
// row, or [ENG] with the prototype number it was tuned to (plan "Prototype results"). Units: mmol/L, g/L albumin,
// g/dL Hb, mL, mmHg, s (see the plan's Global Constraints).
import type { PatientProfile } from '../../types.ts';

export const BLOOD_DT_S = 0.1; // 10 Hz, with Stage 3's gas step (brief §3.2)

/** Molar masses, g/mol (IUPAC). K is 39.098 — Pulse's 31.1 (annex D14) must never appear. */
export const MOLAR_MASS = { na: 22.99, k: 39.098, cl: 35.453, ca: 40.078, mg: 24.305, lactate: 89.07, hco3: 61.017, glucose: 180.16 } as const;
export const mgdlToMmol = (mgdl: number, mm: number): number => (mgdl * 10) / mm;

/** Normal plasma values (tables §5b.1–5b.2; annex §5b rows "same"). */
export const NORMAL = {
  na: 140, k: 4.2, cl: 104, iCa: 1.2, mg: 0.85, lactate: 1.0, albGL: 40, piMmolL: 1.1, hco3: 24.4, paco2: 40,
  dpgMmolL: 4.65, glucoseMgDl: 100, ureaMmolL: 5,
} as const;
/** Ionised share of total Mg for the SID (≈ 0.6 of 0.85 mmol/L) [TXT]. */
export const MG_ION_FRAC = 0.6;

/** Red cells: Hct = Hb·3/100, i.e. MCHC 33.3 g/dL [TXT]. */
export const MCHC_G_PER_ML = 1 / 3;

// --- fluid kinetics (tables §5b.4; annex B1 "tissue fluid branch": vascular → R_t → ECF(C) → lymph) -------------
/**
 * Capillary filtration coefficient, whole body, mL/min/mmHg [ENG, Q47]. Fitted with CISF_PER_ML and K_EL_AWAKE (prototype
 * sweep) to tables §5b.4: 1 L crystalloid over 30 min awake → 51 % intravascular at the end, 16 % 30 min later, total
 * excess halved 30 min after the end; haemorrhage refill 0.16 mL/kg/min early (band 0.1–0.5).
 */
export const KF_ML_MIN_MMHG = 2.0;
/** Reflection coefficient to plasma protein [TXT]. */
export const SIGMA_PROTEIN = 0.9;
/** Capillary hydrostatic change per mL of blood-volume change: half the venous change (C_sys 110 mL/mmHg) [ENG]. */
export const PC_PER_ML = 0.5 / 110;
/** Interstitial compliance, mL/mmHg per mL of baseline ISF volume (≈ 230 mL/mmHg at 11.4 L) [ENG, fitted with Kf]. */
export const CISF_PER_ML = 0.02;
/** Extra lymph flow per mmHg of interstitial pressure rise, mL/min/mmHg [ENG]. */
export const LYMPH_GAIN = 2;
/** Interstitial colloid osmotic pressure at baseline, mmHg [TXT]. */
export const PI_ISF0 = 8;
/**
 * Renal elimination of excess volume, 1/min on the BLOOD-volume excess (plasma is shed): awake 0.03 (total excess t½ ≈ 30 min, fitted), general
 * anaesthesia ×0.2 (t½ ≈ 150 min) — tables `t12El` 30 / 150 [TXT, Q47]. 7d replaces this with its UOP.
 */
export const K_EL_AWAKE = 0.03;
export const K_EL_GA_FACTOR = 0.2;
/** Plasma albumin below its baseline concentration is replenished from the interstitial pool, τ 120 min [ENG]. */
export const ALB_RESTORE_TAU_MIN = 120;
/** Water moves between ISF and cells toward osmotic equilibrium, τ 10 min [ENG]. */
export const OSM_TAU_MIN = 10;
/** ICF effective osmolality at baseline ≈ 2·Na 140 + 10 (glucose, urea) mOsm/kg [TXT]. */
export const OSM0 = 290;

// --- lactate and oxygen (tables §5.3) ------------------------------------------------------------------------------
export const LACTATE_V_L_PER_KG = 0.6; // `vLac` [ENG]
export const K_LAC_PER_H = 1.389; // `kLac` 1400 mmol/day ÷ (1.0 mmol/L · 0.6 L/kg · 70 kg) — t½ 30 min [ENG, Q41]
export const K_ANAER = 0.05; // mmol lactate per mL O2 deficit `kAnaer` (range 0.015–0.06): untreated VF 30 min → 9–10 mmol/L (annex D1 8–12) [ENG, Q41]
export const DO2_CRIT_ML_KG_MIN = 6; // `do2Crit` (4.9–8.2) [TXT, Q42]
export const ER_MAX = 0.7; // `erMax` [TXT]
/**
 * Regional supply dependence [ENG, Q41/Q42]: splanchnic, skin and muscle beds (≈ 60 % of VO2) lose flow first when
 * CARDIAC OUTPUT falls (sympathetic redistribution), so they become supply-dependent as CO/CO0 falls from 0.88 to 0.40
 * — a FLOW criterion, so chronic anaemia at normal flow does not make lactate (its limit is the global DO2crit).
 * Tuned so tables §7 17a (class III: lactate 3–5 by 30 min) holds.
 */
export const REGIONAL_FRAC = 0.6;
export const REGIONAL_FLOW_ON = 0.88;
export const REGIONAL_FLOW_FULL = 0.55;
/** Hepatic blood flow share of CO: ICRP-89 male 0.255 (N-P10; annex §5.3 `hbfFrac` "same"). */
export const HBF_FRAC = 0.255;
/** Splanchnic flow falls faster than CO: hbfRel = (CO/CO0)^2 (tables §5.3 `hbfFactor` ×0.6 on top of CO −40 % in class III) [ENG]. */
export const HBF_EXP = 2;

export type AgeBandB = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';
export function ageBandB(ageY: number): AgeBandB {
  if (ageY < 28 / 365) return 'neonate';
  if (ageY < 1) return 'infant';
  if (ageY < 12) return 'child';
  if (ageY < 18) return 'adolescent';
  return ageY >= 65 ? 'elderly' : 'adult';
}
/** Tables §1.1 blood volume (mL/kg) and Hb (g/dL) by band; §1.2 female values. */
const BAND: Record<AgeBandB, { bvM: number; bvF: number; hbM: number; hbF: number; w: number; h: number }> = {
  neonate: { bvM: 87, bvF: 87, hbM: 17, hbF: 17, w: 3.5, h: 50 },
  infant: { bvM: 78, bvF: 78, hbM: 11.5, hbF: 11.5, w: 7, h: 65 },
  child: { bvM: 72, bvF: 72, hbM: 12.5, hbF: 12.5, w: 16, h: 102 },
  adolescent: { bvM: 70, bvF: 65, hbM: 13.5, hbF: 13, w: 55, h: 165 },
  adult: { bvM: 70, bvF: 65, hbM: 15, hbF: 13.5, w: 70, h: 175 },
  elderly: { bvM: 65, bvF: 60, hbM: 13.5, hbF: 13, w: 70, h: 170 },
};

export interface BloodPatient {
  weightKg: number;
  bvMl: number; // blood volume
  hb: number; // g/dL
  hbRef: number; // FU-6 R11: the band's sex-normal Hb (g/dL), the viscosity reference
  plasmaMl: number;
  isfMl: number;
  icfMl: number;
  vLacL: number;
  vo2Rest: number; // awake mL/min (tables §1.1: 3.5 mL/kg/min adult) — used only when Stage 3 is absent
}

/**
 * Patient scaling. Blood volume by band (tables §1.1) and Lemmens for adults (§1.3: 70/√(BMI/22) mL/kg of actual
 * weight, capped at the band value below BMI 22). TBW 0.6 (M) / 0.5 (F) L/kg; ICF 2/3; ECF 1/3; plasma = BV·(1 − Hct).
 */
export function bloodPatient(p: PatientProfile | undefined): BloodPatient {
  const band = ageBandB(p?.ageY ?? 40);
  const b = BAND[band];
  const female = p?.sex === 'F';
  const w = p?.weightKg ?? b.w;
  const h = p?.heightCm ?? b.h;
  const bmi = w / (h / 100) ** 2;
  let bvKg = female ? b.bvF : b.bvM;
  if ((band === 'adult' || band === 'elderly') && bmi > 22) bvKg = Math.min(bvKg, 70 / Math.sqrt(bmi / 22));
  const bv = bvKg * w;
  const hb = p?.blood?.hb ?? (female ? b.hbF : b.hbM);
  const hct = (hb * 3) / 100;
  const tbw = (female ? 0.5 : 0.6) * w * 1000;
  const ecf = tbw / 3;
  const plasma = bv * (1 - hct);
  return { weightKg: w, bvMl: bv, hb, hbRef: female ? b.hbF : b.hbM, plasmaMl: plasma, isfMl: Math.max(0.5 * ecf, ecf - plasma), icfMl: (2 * tbw) / 3, vLacL: LACTATE_V_L_PER_KG * w, vo2Rest: 3.5 * w };
}

/** Composition of fluids and blood products, per litre (or per unit where stated). mmol/L unless noted [TXT]. */
export interface Composition {
  na: number; k: number; cl: number; ca: number; mg: number;
  lactate: number; // metabolised to bicarbonate (liver)
  metab: number; // acetate (metabolised to bicarbonate, τ 15 min)
  xa: number; // gluconate: an unmeasured anion here (renal excretion is 7d's) [ENG]
  albGL: number; // true albumin g/L (oncotic AND acid–base)
  colloidGL: number; // synthetic colloid, albumin-equivalent oncotic g/L
  osmOther: number; // non-Na effective osmoles (glycine) mOsm/L
  hct: number; // red-cell volume fraction
  citrate: number; // mmol/L
}
const Z: Composition = { na: 0, k: 0, cl: 0, ca: 0, mg: 0, lactate: 0, metab: 0, xa: 0, albGL: 0, colloidGL: 0, osmOther: 0, hct: 0, citrate: 0 };
export const FLUIDS = {
  saline: { ...Z, na: 154, cl: 154 }, // 0.9 % NaCl
  rl: { ...Z, na: 130, k: 4, cl: 109, ca: 1.35, lactate: 28 }, // Ringer's lactate / Hartmann's
  balanced: { ...Z, na: 140, k: 5, cl: 98, mg: 1.5, metab: 27, xa: 23 }, // Plasma-Lyte 148 (acetate 27, gluconate 23)
  albumin5: { ...Z, na: 145, cl: 100, albGL: 50 }, // 5 % albumin [VERIFY Cl]
  gelatin: { ...Z, na: 154, cl: 120, colloidGL: 35 }, // 4 % succinylated gelatin [ENG oncotic equivalent]
  d5w: { ...Z }, // free water once the glucose is taken up
  glycine: { ...Z, osmOther: 200 }, // 1.5 % glycine irrigant (TURP/hysteroscopy absorption)
} as const satisfies Record<string, Composition>;
export type FluidId = keyof typeof FLUIDS;
/** Hypertonic saline of `pct` % NaCl (3 % → 513 mmol/L Na and Cl; NaCl 58.44 g/mol): observed from 7g's dose log (R51 addendum 14). */
export const hypertonicSaline = (pct: number): Composition => {
  const m = (pct * 10 * 1000) / 58.44;
  return { ...FLUIDS.d5w, na: m, cl: m };
};
/** Magnesium sulfate heptahydrate (246.5 g/mol): mmol Mg per gram [TXT]. */
export const MG_MMOL_PER_G = 4.06;

/** Blood products per UNIT (tables §5b.4): volume mL and contents. Citrate ≈ 3 g (15.6 mmol) per unit [TXT, Q46]. */
export const PRODUCTS = {
  rbc: { ml: 280, comp: { ...Z, na: 150, cl: 150, hct: 0.6, citrate: 15.6 / 0.28 } },
  ffp: { ml: 250, comp: { ...Z, na: 165, k: 4, cl: 75, albGL: 40, citrate: 15.6 / 0.25 } },
  platelets: { ml: 250, comp: { ...Z, na: 150, cl: 100, albGL: 40, citrate: 8 / 0.25 } },
  wholeBlood: { ml: 500, comp: { ...Z, na: 150, k: 4, cl: 100, albGL: 40, hct: 0.4, citrate: 15.6 / 0.5 } },
} as const;
export type ProductId = keyof typeof PRODUCTS;
/** Stored-blood supernatant K ≈ storage days mmol/L (tables `kUnit`, StoredK), in the non-cell volume [TXT]. */
export const storedK = (days: number): number => Math.min(50, Math.max(1, days));
/** Unwarmed unit: −0.25 °C core per unit (tables §5b.4) [VERIFY]. */
export const COLD_UNIT_C = 0.25;
/** Synthetic colloid plasma t½: gelatin 150 min (tables `t12Colloid`) [VERIFY]. */
export const COLLOID_T12_MIN = 150;
