// Lung module constants (tables §4; catalogue §22–§23, §33; R43). Adult 70 kg values; volumes and compliances scale
// with IBW/70, resistances with 70/IBW (tables §2.2 rule). Every number cites its row, or [ENG] with the prototype
// number it was tuned to (plan "Prototype results").
export const L = 0;
export const R = 1;
/** Units: 0 L-fast, 1 L-slow, 2 R-fast, 3 R-slow (side = u >> 1, slow = u & 1). */
export const N_UNITS = 4;
/** Left/right share of lung volume and ventilation (Q94; Pulse right-lung ratio 0.525; catalogue §23 ventFrac R 0.55). */
export const SIDE_SHARE = [0.45, 0.55] as const;
/** Supine perfusion share, left/right (follows volume; catalogue §22 lateral: non-dependent lung 40 %). */
export const PERF_SHARE = [0.45, 0.55] as const;
/** Endotracheal tube + central airway resistance, part of the measured raw (tables §4.3 "R 10 incl. 7.5–8 ETT") [ENG]. */
export const R_TUBE = 4; // cmH2O·s/L
/** Chest-wall compliance (catalogue lead `ccw`; Behazin 2010 normal 223 → 200 rounded). */
export const CCW_ML = 200;
/** TLC and RV, mL/kg IBW (Pulse 4.3.2 standard patient: TLC 80, RV 16; audit 03 §1). */
export const TLC_ML_KG = 80;
export const RV_ML_KG = 16;
/**
 * Venegas sigmoid on the LUNG (audit borrow #8, A9; Venegas, Harris & Simon 1998): V(P) = a + b/(1 + e^(−(P−c)/d)),
 * P = transpulmonary pressure above the FRC state, V above FRC. c = the pressure of maximal compliance: 8 cmH2O puts
 * the tidal range of a normal breath on the steep part [ENG]; d = b/(4·C) so the slope at c equals the unit's
 * compliance; a from V(0) = 0.
 */
export const VENEGAS_C = 8;
/** Integration sub-step for the mechanics (4 per 62.5 Hz sample) [ENG: h/τ ≤ 0.04 for the neonatal τ 0.1 s]. */
export const MECH_H = 0.004;
/** CO2 blood content slope, mL/L/mmHg (0.4–0.5 mL/dL/mmHg in the physiological range) [TXT, West]. */
export const CO2_SLOPE_BLOOD = 4.5;
/** Recruitment: healthy atelectasis opens above 40 cmH2O with τ 2.6 s (Rothen 1999; tables §4.1). */
export const P_OPEN_HEALTHY = 40;
export const TAU_REC_HEALTHY_S = 2.6;
/** Induction atelectasis 6 % of lung at FiO2 1.0 (Edmark 2003; tables §4.1, Q34), FiO2 dependence 1.0/0.8/0.6 → 1/0.1/0.04. */
export const ATEL_IND = 0.06;
/** Absorption re-collapse τ (min) under ventilation: FiO2 1.0 → 5, 0.4 → 120 (Rothen 1995), log-linear between; ×(1 + PEEP/5) (Q34 [ENG]). */
export const TAU_COLLAPSE_F1_MIN = 5;
export const TAU_COLLAPSE_F04_MIN = 120;
/** Blocked bronchus (OLV, endobronchial): collapse τ = 5 + 40·(inert fraction/0.79) min → 5 at FiO2 1.0, ≈ 28 at 0.5, ≈ 37 at 0.3 (catalogue §23: 20–40 min at 0.3–0.5) [ENG]. */
export const TAU_BLOCK_MIN = 5;
export const TAU_BLOCK_N2_MIN = 40;
/** Pressure-driven de-recruitment (ARDS): τ 2 min when PEEP falls below the closing pressure (catalogue §6: 1–5 min) [ENG]. */
export const TAU_DEREC_S = 120;
/** Closing pressure of recruitable ARDS lung: what stays open is linear in PEEP up to 15 cmH2O (catalogue §6 "≈ 10–15") [ENG]. */
export const P_CLOSE = 15;
/** Lowest opening pressure of the recruitable distribution (Dellinger 5e ch. 11 p. 162: recruitability 5 → 45 cmH2O). */
export const P_OPEN_LO = 5;
/** HPV: flow to the hypoxic region × (1 − hpv·a); phase 1 τ 5 min; phase 2 +30 % from 40 min, τ 60 min (tables §4.2, Q35). */
export const TAU_HPV1_S = 300;
export const HPV2_EXTRA = 0.3;
export const HPV2_ONSET_S = 2400;
export const TAU_HPV2_S = 3600;
/** Aerated-region HPV stimulus: none above PAO2 100, full at 40 mmHg [ENG on the Marshall stimulus shape]. */
export const HPV_PAO2_HI = 100;
export const HPV_PAO2_LO = 40;
/** Non-aerated regions get ATEL_PERF × their volume share of flow before HPV. Tables §4.1 proposes 1.2 (dependent regions); 1.0 is used because 1.2 put ARDS shunt 0.05 above the Pulse/Maj 2023 targets 0.2/0.3/0.4 in the prototype [ENG, flagged]. */
export const ATEL_PERF = 1.0;
/** Low-V/Q units have V/Q 0.1 (FiO2-responsive admixture; catalogue lead `vqLow`) [ENG]. */
export const VQ_LOW = 0.1;
/** Healthy unperfused fraction of alveolar ventilation: Pa−EtCO2 = 0.075 × 40 = 3 mmHg (Stage 3's gradient; tables §4.4). */
export const HEALTHY_VDALV = 0.075;
/** Capnogram (decision 9): phase II τ added = min(TAU_II_MAX, K_TAU_II·(τ̄_exp − TAU_EXP_REF)) [ENG, Q72: GOLD 1–4 → 111.6/115.7/124.1/131°]. */
export const K_TAU_II = 0.1;
export const TAU_II_MAX = 0.3;
export const TAU_EXP_REF = 0.54; // healthy ventilation-weighted expiratory τ (prototype)
