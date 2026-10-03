// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/controller/
// SetupCircuitsAndCompartments.cpp (renal circuit, lines 1316–1720), src/cpp/engine/PulseConfiguration.cpp (renal
// configuration, lines 602–615) and src/cpp/engine/common/system/physiology/RenalModel.cpp, Copyright 2018-2025
// Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.;
// licensed under the Apache License, Version 2.0; modified: re-expressed in TypeScript and simplified for the monitor
// tick (one algebraic kidney at 1 Hz; see NOTICES N-P19).
//
// Stage 7d kidney constants. Pulse values from docs/physiology/pulse-parameter-annex.md B2 (per kidney, mmHg·min/mL,
// all × Pulse's 1.25 calibration); our additions cite tables §5.2 or are [ENG] with the prototype number.
import { ICRP89_FLOW_FRACTIONS_M } from '../circ/params.ts';

export const RENAL_DT_S = 1; // kidney and liver step at 1 Hz (annex B2 "one algebraic kidney at 1 Hz")
// Pulse per-kidney resistances (annex B2 table), both kidneys in parallel → ÷ 2 where used
export const R_ART = 0.025 * 1.25; // renal artery (male value)
export const R_AFF = 0.0417 * 1.25; // afferent arteriole (TGF-controlled)
export const R_GLOM = 0.0019 * 1.25;
export const R_EFF = 0.0763 * 1.25; // efferent arteriole
export const R_PT = 0.0167 * 1.25; // peritubular capillaries
export const R_RV = 0.0066 * 1.25; // renal vein
/** TGF range for R_aff: Pulse 2.2–11.2 mmHg·s/mL = 0.0367–0.187 mmHg·min/mL (CFG 608–609). The upper bound is
 *  raised by the MYOGENIC response Pulse lacks (afferent constriction to stretch, which with TGF holds RBF over RPP
 *  80–180, tables §5.2 `rblLL/rblUL`) [ENG ×MYOGENIC_MAX]: with Pulse's 11.2 alone RBF rose 21 % and GFR doubled at MAP 180. */
export const R_AFF_MIN = 2.2 / 60;
export const MYOGENIC_MAX = 2;
export const R_AFF_MAX = (11.2 / 60) * MYOGENIC_MAX;
/** TGF time constant: Pulse's 0.001-per-beat damping ≈ 60–90 s (annex B2 "Take") → 60 s. */
export const TGF_TAU_S = 60;
export const KF_PER_KIDNEY = 3.67647 * 2.0; // glomerular Lp·A, mL/min/mmHg (CFG 604–605)
export const PI_GLOM0 = 32; // glomerular oncotic pressure, mmHg (SET 1386–1389) at albumin 42 g/L
export const ALBUMIN0_G_L = 42;
/** Bowman's space pressure [ENG]: calibrated so the resting GFR is 125 mL/min (tables/annex reference 180 L/day;
 *  Pulse gives 147.5 L/day, D12). UOP is calibrated separately (ef0), so this only sets GFR and the filtration fraction. */
export const P_BOWMAN = 17.1;
export const RENAL_FLOW_FRAC = ICRP89_FLOW_FRACTIONS_M.kidneys; // 0.17, both kidneys (ICRP-89 via Pulse SET 315, NOTICES N-P10) — audit borrow #7
/** The healthy reference the kidney is calibrated on (createRenal): MAP 93, CVP 5, CO 0.08 L/min/kg (5.6 L/min at 70 kg). */
export const RENAL_REF_MAP = 93;
export const RENAL_REF_CVP = 5;
export const RENAL_REF_CO_L_KG = 0.08;
/** Pressure natriuresis: Pulse's tubular reabsorption permeability vs renal arterial pressure (PH/Renal 1983–2071),
 *  used here as the excreted FRACTION ∝ (Lp(Pref)/Lp(P))^1.74 — the exponent that makes UOP(150)/UOP(100) = 3
 *  (tables U(): Guyton renal output curve); U(80) then equals the tables' 0.67 exactly [ENG fit]. */
export const LP_A = 2.00943e-6;
export const LP_B = -8.09933e-4;
export const LP_C = 9.37727e-2;
export const NATRIURESIS_EXP = 1.74;
export const UOP0_ML_KG_H = 1.0; // awake, tables `UOP0` [TXT]
export const OLIGURIA_ML_KG_H = 0.5; // KDIGO (tables alarm row, Q40)
export const ANURIA_ML_KG_H = 0.05; // [ENG]
/** Efferent (angiotensin II) tone in low-flow states [ENG; Pulse has no RAAS (annex B2 stated limits)]: R_eff × (1 +
 *  ANG_GAIN·a), a = 0–1 from RPP below 80 and blood volume loss — keeps GFR while RBF falls (filtration fraction ↑). */
export const ANG_GAIN = 3;
/** Angiotensin/efferent response time constant, s [ENG]: an instantaneous term followed 7a's second-to-second CO wobble
 *  (CO 4.9–5.6 in MODELED HFrEF) and swung GFR 27–211 mL/min within seconds; AngII's efferent effect builds over minutes. */
export const ANG_TAU_S = 120;
export const S_GA = 0.6; // surgical stress/ADH under GA, tables `S` [ENG] (0.4–0.8)
export const V_AT_15 = 0.5; // UOP factor at −15 % blood volume (tables V)
export const V_AT_30 = 0.2; // at −30 %
/** FU-9 F1: excreted-fraction gain per unit blood-volume EXPANSION (ANP/ADH suppression) [ENG]: fitted so 1 L of
 *  Ringer's over 30 min, awake, is 20–30 % intravascular 30 min after the end (Hahn 2010; 7c's own fallback t½ 30 min,
 *  tables `t12El`); capped at V_EXP_MAX × (≈ 15 mL/min peak diuresis, Hahn's volunteers). */
export const V_EXP_GAIN = 90;
export const V_EXP_MAX = 12;
/** FU-9 H1: symmetric low-pass of the effective volume before the neurohumoral lag, s [ENG] (research/13 H1: τ ≈ 60 s). */
export const EABV_TAU_S = 60;
export const EABV_EXP = 0.75; // effective volume = min(BV, (CO/CO0)^0.75) [ENG]: HFrEF (CO 3.5) → V 0.21, UOP 0.114 (tables check 20 0.1–0.15)
/** Neurohumoral (ADH/aldosterone) lag on V [ENG]: onset τ 2 min (ADH release is fast), washout τ 45 min. With an
 *  instantaneous V, dobutamine in check 20 gave 0.338 mL/kg/h at 30 min (tables 0.2–0.3 within 30–60 min); with the
 *  washout: 0.233 at 30 min, 0.284 at 60 min. Recovery after fluids is correspondingly gradual (class III → 0.53 at 60 min). */
export const NH_TAU_ON_S = 120;
export const NH_TAU_OFF_S = 2700;
export const PEEP_PER_10 = 0.9; // × per 10 cmH2O mean-airway-pressure excess (tables PEEP row) [ENG]
export const NE_EXCESS_PER_01 = 0.9; // × per 0.1 µg/kg/min α-agonist above need (tables D row) [ENG]
export const SEPSIS_GFR_LOSS = 0.5; // Kf × (1 − 0.5·sepsis) (efferent dilation / microvascular) [ENG]; 7f writes sepsis
export const AKI_KF_LOSS = 0.8; // condition aki severity 1 → Kf × 0.2 [ENG]
// Diuretics (tables §5.2 has none; label-level [TXT], shape [ENG])
export const FUROSEMIDE_EMAX = 9; // excreted fraction × (1 + 9·E): 40 mg → peak UOP ≈ 7× (≈ 8 mL/min)
export const FUROSEMIDE_ED50_MG = 20; // own-depot path (no 7g): E = plasma mg/(mg + 20)
/** With 7g: E = c/(c + 1), c = 7g's furosemide level in reference doses (row `furosemide`: gamma, ref 20 mg, peak
 *  15 min, 10 % at 2 h) — the same ED50 as 20 mg. 40 mg: peak 8.2 mL/min at 15 min, 0.92 L in 4 h (Task 11 test). */
export const FUROSEMIDE_EC50_REF = 1;
export const FUROSEMIDE_KA_PER_MIN = 0.2; // IV: onset ≈ 5 min, peak ≈ 30 min
export const FUROSEMIDE_KE_PER_MIN = 0.0115; // t½ ≈ 1 h (duration ≈ 2 h)
export const MANNITOL_KE_PER_MIN = Math.LN2 / 120; // plasma t½ ≈ 2 h (renal)
export const MANNITOL_ML_PER_G = 14; // obligate water per g excreted at urine osmolality ≈ 400 mOsm/kg [ENG]
export const BLADDER_CAP_ML = 400; // Pulse PH/Renal 1549 (no catheter: auto-void)
