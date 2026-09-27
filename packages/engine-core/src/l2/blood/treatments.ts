// Drug and product kinetics owned by 7c (tables §5b.2 rows: succinylcholine, insulin–dextrose, salbutamol, calcium,
// citrate; §5b.1 bicarbonate; Mg). Each dose is plain data {id, t0, amount}; effects are closed-form curves of time
// since the dose, so snapshots and the look-ahead clone need nothing else. With Stage 7g in the engine the doses come
// from 7g's `bus.doses` (pipeline.ts `observeDoses`, R51 §3) and the β2/insulin K shift from `bus.metabolic.kShift`;
// 7g declined to replace these shapes (its decision 10: they are mass-balance kinetics).
export type BloodDrugId = 'succinylcholine' | 'insulinDextrose' | 'salbutamol' | 'calciumChloride' | 'calciumGluconate' | 'sodiumBicarbonate' | 'magnesium';
export const BLOOD_DRUGS: readonly BloodDrugId[] = ['succinylcholine', 'insulinDextrose', 'salbutamol', 'calciumChloride', 'calciumGluconate', 'sodiumBicarbonate', 'magnesium'];

export interface Dose {
  id: BloodDrugId;
  t0: number;
  amount: number; // mmol for Ca/HCO3/Mg; units of insulin; mg for sux/salbutamol (only presence matters)
}

/** Bateman curve normalised to a peak of 1 (ka, ke in 1/min). */
export function bateman(tMin: number, ka: number, ke: number): number {
  if (tMin <= 0) return 0;
  const tp = Math.log(ka / ke) / (ka - ke);
  const peak = Math.exp(-ke * tp) - Math.exp(-ka * tp);
  return (Math.exp(-ke * tMin) - Math.exp(-ka * tMin)) / peak;
}

/**
 * Succinylcholine K release (tables: +0.5 normally; burns/denervation/immobilisation > 72 h +5–7) as an additive
 * plasma K pulse: linear rise to the peak at 4 min, then exponential decay τ 5 min (normal: back within ~15 min) or
 * 5·(1 + 5·burns) min [ENG]. Insulin and β2 agonists act on the K set point only (no unsourced second effect on the
 * pulse's decay; R50 review F13).
 */
export function suxDeltaK(tMin: number, burns: number): number {
  if (tMin <= 0) return 0;
  const peak = 0.5 + 6 * burns;
  const tp = 4;
  if (tMin <= tp) return (peak * tMin) / tp;
  return peak * Math.exp(-(tMin - tp) / (5 * (1 + 5 * burns)));
}

/** Insulin–dextrose effect 0–1: onset 10–20 min, peak ≈ 45–60 min, lasts 4–6 h (tables) [TXT shape, ENG rates]. */
export const insulinEffect = (tMin: number): number => bateman(tMin, 1 / 15, 1 / 180);
/** Nebulised salbutamol effect 0–1: peak ≈ 30 min, ≈ 2 h (tables). */
export const salbutamolEffect = (tMin: number): number => bateman(tMin, 1 / 10, 1 / 60);
/**
 * K set-point shifts at full effect (mmol/L) [ENG]: with the pump term below, insulin–dextrose gives K −0.54 at 30 min
 * and −0.87 at 60 min (tables −0.6 to −1.0 over 30–60 min); 7c's own salbutamol (fallback without 7g) −0.7 at 30 min
 * (tables −0.5 to −1.0).
 */
export const INSULIN_K_SHIFT = -1.0;
export const SALBUTAMOL_K_SHIFT = -1.0;
/**
 * Insulin and β2 agonists drive K into cells through Na/K-ATPase: the uptake rate rises by K_PUMP_GAIN per mmol/L of
 * drug-driven set-point shift, so the tables' drug time courses (−0.5 to −1.0 within 30 min) hold, which the passive
 * redistribution τ of a K load (43 min, `vK`) alone cannot reach [ENG, fitted; R50 F13]. 7g's salbutamol kShift −0.8
 * → K −0.55 at 30 min.
 */
export const K_PUMP_GAIN = 1.5;
/** Calcium membrane stabilisation 0–1: ECG effect in 1–3 min, lasting 30–60 min (tables) [TXT shape]. */
export const caMembrane = (tMin: number): number => (tMin <= 0 ? 0 : (1 - Math.exp(-tMin / 1)) * Math.exp(-tMin / 45));
/** Calcium salts: mmol Ca per gram (CaCl2·2H2O 147 g/mol → 6.8; Ca gluconate 430 g/mol → 2.3) [TXT]. */
export const CA_MMOL_PER_G = { calciumChloride: 6.8, calciumGluconate: 2.3 } as const;
/**
 * Sodium bicarbonate: Na enters the ECF at once (SID ↑); a fraction of the dose appears as extra CO2 to exhale,
 * delivered as a Bateman pulse (peak ≈ 1 min) into Stage 3's CO2 production [ENG, tuned: 50 mmol under constant
 * ventilation → EtCO2 +5–8 mmHg peak within 1–3 min, back within ~10 min].
 */
export const BICARB_CO2_FRAC = 0.25;
export const MMOL_CO2_ML = 22.4;
export function bicarbCo2MlMin(doses: readonly Dose[], t: number): number {
  let r = 0;
  for (const d of doses) {
    if (d.id !== 'sodiumBicarbonate') continue;
    const tm = (t - d.t0) / 60;
    if (tm <= 0 || tm > 30) continue;
    // Bateman with ka 1/0.5, ke 1/2 min, integral normalised to 1 → mL/min
    const ka = 2;
    const ke = 0.5;
    const shape = ((ka * ke) / (ka - ke)) * (Math.exp(-ke * tm) - Math.exp(-ka * tm));
    r += BICARB_CO2_FRAC * d.amount * MMOL_CO2_ML * shape;
  }
  return r;
}
