// Stage 7a circulation constants (R31, R42; tables §2.2 adult 70 kg; audit §1.1 #4, §5 A1–A6). Every number cites
// its source, or [ENG] when it is an engineering choice tuned by the Stage 7a prototype (plan "Prototype results").
// Volumes and compliances scale by W/70, resistances by 70/W, elastances by 70/W (profile.ts does the scaling).

// --- double-Hill activation (Stergiopulos, Meister & Westerhof 1996, Am J Physiol 270:H2050; Pulse CFG 494–498) ---
export const DH_A1 = 0.303;
export const DH_A2 = 0.508;
export const DH_N1 = 1.32;
export const DH_N2 = 21.9;
/**
 * Activation period T as a multiple of Weissler (PEP + LVET)(HR) (audit A3: systolic duration from the LVET–HR
 * regression, not ∝ RR). With 1.25 the emergent aortic-valve open time sits within ±15 ms of Weissler LVET at
 * HR 60–120 (prototype) [ENG].
 */
export const T_ACT_PER_SYSTOLE = 2.1;
/** Electromechanical delay: ventricular activation starts this long after the beat record's R time [ENG]. */
export const EMD_S = 0.0;
/** Atrial activation: starts ATRIAL_DELAY_S after P onset, period ATRIAL_T_S (a wave 80–100 ms after P, B §4.2) [ENG]. */
export const ATRIAL_DELAY_S = 0.0;
export const ATRIAL_T_S = 0.22;
/** Ventricular-origin and paced beats contract dyssynchronously: Emax × 0.85 (B §4.8 k_rhythm for VT/PVC) [ENG]. */
export const DYSSYNC = 0.85;

// --- chambers (tables §2.2; Smith 2004 unless stated) ---
export const EES_LV = 2.3; // mmHg/mL, Emax LV (Q24: 2.3 kept; Pulse 2.49)
export const V0_LV = 5; // mL (Q24)
/**
 * LV EDPVR P = A·(e^{β(V−V0)} − 1). Q24 evidence default: normal-human β 0.01–0.02 /mL (Zile 2004, HFpEF-PV) —
 * β 0.02 is taken (upper end, nearest Smith's 0.033), and A is refitted so LVEDP ≈ 8 at EDV ≈ 120 mL [ENG fit].
 */
export const BETA_LV = 0.02;
export const A_LV = 0.9;
export const EES_RV = 0.585; // mmHg/mL (Smith 2004)
export const V0_RV = 5; // mL [ENG]
export const BETA_RV = 0.023; // /mL (Smith 2004)
export const A_RV = 0.216; // mmHg (Smith 2004)
/** Atria: linear passive elastance + active increment (tables: eRa 0.3, cLa 4 → 0.25) [ENG active]. */
export const EMIN_RA = 0.3;
export const EMAX_RA = 0.55;
export const V0_RA = 10;
export const EMIN_LA = 0.25;
export const EMAX_LA = 0.55;
export const V0_LA = 10;

// --- valves (tables §2.2 Smith 2004 open resistances; Gorlin; ASE 2017 EROA) ---
export const R_TV = 0.024; // mmHg·s/mL
export const R_PV = 0.006;
export const R_MV = 0.016;
export const R_AV = 0.018;
/** Gorlin constants: aortic/pulmonary 44.3, mitral/tricuspid 37.7 (discharge 0.85) → Q (mL/s) = K·A·√ΔP. */
export const GORLIN_AV = 44.3;
export const GORLIN_MV = 37.7;
/** Reference (normal) areas: the stenotic term counts only the EXCESS over a normal orifice [ENG]. */
export const AVA_REF = 3.0; // cm²
export const MVA_REF = 4.5; // cm²
/** Regurgitant orifice: Q = 44.3·EROA·ΔP/√(|ΔP| + ε) — smooth at ΔP = 0 so the solver never chatters [ENG ε]. */
export const REGURG_K = 44.3;
export const REGURG_EPS = 1; // mmHg

// --- vessels ---
/** Systemic veins: compliance 110 mL/mmHg (tables cSv; R03 §8.2), unstressed volume set by stabilisation. */
export const C_SV = 110;
/** Veins → RA resistance. Lumped-venous equivalent of R_vr 1.4 mmHg·min/L once P_sv ≈ Pmsf − 1 [ENG fit]. */
export const R_VR = 0.06;
export const R_VR_BACK = 5; // × for retrograde flow (jugular/caval valves; CPR thoracic pump) [ENG]
export const C_PA = 4; // mL/mmHg (Stage 2 PA_C)
export const Z_PA = 0.02; // mmHg·s/mL (Stage 2 PA_ZC)
export const PVR = 0.1; // mmHg·s/mL total (tables pvr = PA_R0)
export const RIGHT_LUNG_FLOW = 0.55; // share of pulmonary flow to the right lung (R43 exposure; ICRP-style [TXT])
export const C_PV = 10; // mL/mmHg pulmonary veins (tables cPv)
export const R_PVLA = 0.01; // pulmonary veins → LA [ENG]

// --- pericardium and thorax (tables §2.2; audit R-B) ---
export const PERI_A = 0.5; // mmHg (Smith)
export const PERI_LAMBDA = 0.03; // /mL (Smith)
/**
 * v0Peri = 1.0 × (baseline LVEDV + RVEDV) + 0, set by stabilisation. Tables (Q29) propose 1.15 × … + 20; with that
 * reserve 200 mL of fluid raised CVP by only 1.2 mmHg in the prototype, so the reserve is removed [ENG, flagged].
 */
export const PERI_RESERVE = 1.0;
export const PERI_EXTRA_ML = 0;
export const P_PL0 = -4; // mmHg supine resting pleural (Smith 2004 P_th)
/** Fraction of alveolar pressure reaching the pleura (tables tIt 0.4; Q28 default). */
export const T_IT = 0.4;
export const CMH2O_TO_MMHG = 0.7356;
/** Spontaneous inspiratory pleural swing, cmH2O (Stage 3 SPONT_PPL_CMH2O). */
export const SPONT_SWING_CMH2O = 4;

// --- blood volume (tables §1.1; Lemmens 2006) ---
export const BV_ML_KG_M = 70;
export const BV_ML_KG_F = 65;
/** Unstressed arterial volume (not in any state; bookkeeping only) [ENG]. */
export const V0_ART = 600;

// --- CPR (B §4.2; R39-2) ---
/** Direct cardiac compression: chamber pressure added per unit quality, mmHg [ENG, prototype]. */
export const CPR_CARDIAC_MMHG = 60;
/** Thoracic-pump pressure on every intrathoracic compartment and the aortic root per unit quality [ENG]. */
export const CPR_THORACIC_MMHG = 30;

// --- integration ---
export const H_S = 0.002; // RK4 step (R42; Stage 2 H_S)
