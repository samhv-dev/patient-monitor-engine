// Circulation constants (tables §2.2 adult 70 kg). Every number cites its source, or carries `[FIT: target; brief id]`
// when the circulation prototype fitted it to a physiological target, or `[ENG: kind]` when it is not physiology. Volumes and compliances scale by W/70, resistances by 70/W, elastances
// by 70/W (profile.ts does the scaling).

// --- double-Hill activation (Stergiopulos, Meister & Westerhof 1996, Am J Physiol 270:H2050; Pulse CFG 494–498) ---
export const DH_A1 = 0.303;
export const DH_A2 = 0.508;
export const DH_N1 = 1.32;
export const DH_N2 = 21.9;
/**
 * Activation period T as a multiple of Weissler (PEP + LVET)(HR) (systolic duration from the LVET–HR regression, not ∝
 * RR). With 1.25 the emergent aortic-valve open time sits within ±15 ms of Weissler LVET at HR 60–120 (prototype)
 * [FIT: emergent aortic-valve open time within ±15 ms of Weissler LVET at HR 60–120; brief research/44 V-01].
 */
export const T_ACT_PER_SYSTOLE = 2.1;
/** Electromechanical delay: ventricular activation starts this long after the beat record's R time [FIT: electromechanical delay (EMD 0); brief research/44 V-01]. */
export const EMD_S = 0.0;
/** Atrial activation: starts ATRIAL_DELAY_S after P onset, period ATRIAL_T_S (a wave 80–100 ms after P, B §4.2) [FIT: unsourced circulation parameter; brief research/44 L2-29]. */
export const ATRIAL_DELAY_S = 0.0;
export const ATRIAL_T_S = 0.22;
/** Ventricular-origin and paced beats contract dyssynchronously: Emax × 0.85 (B §4.8 k_rhythm for VT/PVC) (brief §4.8 k_rhythm). */
export const DYSSYNC = 0.85;

// --- chambers (tables §2.2; Smith 2004 unless stated) ---
export const EES_LV = 2.3; // mmHg/mL, Emax LV (Q24: 2.3 kept; Pulse 2.49)
export const V0_LV = 5; // mL (Q24)
/**
 * LV EDPVR P = A·(e^{β(V−V0)} − 1). Q24 evidence default: normal-human β 0.01–0.02 /mL (Zile 2004, HFpEF-PV) —
 * β 0.02 is taken (upper end, nearest Smith's 0.033), and A is refitted so LVEDP ≈ 8 at EDV ≈ 120 mL [FIT: unnamed; brief research/44 L2-29].
 */
export const BETA_LV = 0.02;
export const A_LV = 0.9;
export const EES_RV = 0.585; // mmHg/mL (Smith 2004)
export const V0_RV = 5; // mL [FIT: unsourced circulation parameter; brief research/44 L2-29]
export const BETA_RV = 0.023; // /mL (Smith 2004)
export const A_RV = 0.216; // mmHg (Smith 2004)
/** Atria: linear passive elastance + active increment (tables: eRa 0.3, cLa 4 → 0.25) [FIT: unsourced circulation parameter; active; brief research/44 L2-29]. */
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
/** Reference (normal) areas: the stenotic term counts only the EXCESS over a normal orifice (ASE normal ranges). */
export const AVA_REF = 3.0; // cm²
export const MVA_REF = 4.5; // cm²
/** Regurgitant orifice: Q = 44.3·EROA·ΔP/√(|ΔP| + ε) — smooth at ΔP = 0 so the solver never chatters [ENG: numerics; ε]. */
export const REGURG_K = 44.3;
export const REGURG_EPS = 1; // mmHg

// --- vessels ---
/**
 * Aortic characteristic impedance for the elastance heart: 0.035 mmHg·s/mL, inside the haemodynamic WK_ZC range
 * 0.03–0.06. With WK_ZC's 0.05 the Zc·Q_peak term dominated the pulse pressure of an ejecting elastance
 * ventricle, the stabiliser had to raise arterial compliance to 3.5 mL/mmHg (C 1.4 ± 0.7) and PP stopped following
 * stroke volume (class II PPV 7 %). At 0.035 the tuned compliance is ≈ 2.1 mL/mmHg and PP ∝ SV again [FIT: PP ∝ SV (class II PPV 7 %), a value inside the sourced WK_ZC range; brief research/44 L2-21].
 */
export const ZC_AO = 0.035;
/** Systemic veins: compliance 110 mL/mmHg (tables cSv), unstressed volume set by stabilisation. */
export const C_SV = 110;
/** Veins → RA resistance. Lumped-venous equivalent of R_vr 1.4 mmHg·min/L once P_sv ≈ Pmsf − 1 [FIT: unnamed; brief research/44 L2-29]. */
export const R_VR = 0.06;
export const R_VR_BACK = 5; // × for retrograde flow (jugular/caval valves; CPR thoracic pump) [ENG: numerics]
export const C_PA = 4; // mL/mmHg (PA_C)
export const Z_PA = 0.02; // mmHg·s/mL (PA_ZC)
export const PVR = 0.1; // mmHg·s/mL total (tables pvr = PA_R0)
export const RIGHT_LUNG_FLOW = 0.55; // share of pulmonary flow to the right lung (ICRP-style [TXT])
export const C_PV = 10; // mL/mmHg pulmonary veins (tables cPv)
export const R_PVLA = 0.01; // pulmonary veins → LA [FIT: unsourced circulation parameter; brief research/44 L2-29]

// --- pericardium and thorax (tables §2.2) ---
export const PERI_A = 0.5; // mmHg (Smith)
export const PERI_LAMBDA = 0.03; // /mL (Smith)
/**
 * v0Peri = 1.0 × (baseline LVEDV + RVEDV) + 0, set by stabilisation. Tables (Q29) propose 1.15 × … + 20; with that
 * reserve 200 mL of fluid raised CVP by only 1.2 mmHg in the prototype, so the reserve is removed [FIT: CPR pressure or pericardial reserve fitted to the prototype/Paradis bands; flagged; brief research/44 L2-20].
 */
export const PERI_RESERVE = 1.0;
export const PERI_EXTRA_ML = 0;
export const P_PL0 = -4; // mmHg supine resting pleural (Smith 2004 P_th)
/**
 * Fraction of alveolar pressure reaching the pleura. Tables tIt 0.4 (Q28 default; range 0.2–0.7). Raised to
 * 0.65 toward the evidence value 0.5–0.7 so class II haemorrhage gives PPV > 13 % on the ventilator (0.4 gave
 * 5 % → 7 %) while normovolaemic PPV stays < 10 % [calibration pass].
 */
export const T_IT = 0.65;
export const CMH2O_TO_MMHG = 0.7356;
/** Spontaneous inspiratory pleural swing, cmH2O (SPONT_PPL_CMH2O). */
export const SPONT_SWING_CMH2O = 4;
/**
 * Hypercapnic pulmonary vasoconstriction — PVR × (1 + K·(PaCO2 − 40)₊), K 0.015/mmHg (Balanos 2003
 * J Physiol; k ≈ 0.01–0.02 per mmHg) (a point inside the sourced range; inside the sourced range); PaCO2 from the circulation's 1 Hz chemo input.
 */
export const K_PVR_CO2 = 0.015;

// --- blood volume (tables §1.1; Lemmens 2006) ---
export const BV_ML_KG_M = 70;
export const BV_ML_KG_F = 65;
/** Unstressed arterial volume (not in any state; bookkeeping only) [ENG: numerics]. */
export const V0_ART = 600;

// --- CPR (B §4.2) ---
/** Direct cardiac compression: chamber pressure added per unit quality, mmHg [FIT: CPR pressure or pericardial reserve fitted to the prototype/Paradis bands; plan 60 (not prototyped) → 35 in the
 * engine: 60 gave SBP 95 / DBP 40 / CO 3.5 L/min at quality 0.8; 35/35 gives 73/16 and CO 2.1 (quality 1: 91/21, 2.5); brief research/44 L2-20]. */
export const CPR_CARDIAC_MMHG = 24; // Re-fitted with the volume factor, the release residual and the brainstem withdrawal
/** Thoracic-pump pressure on every intrathoracic compartment and the aortic root per unit quality [FIT: CPR pressure or pericardial reserve fitted to the prototype/Paradis bands; plan 30 → 35; brief research/44 L2-20]. */
export const CPR_THORACIC_MMHG = 24; // Re-fitted with the volume factor and the release residual
/**
 * A compression DISPLACES blood — it is not a pressure source. The pressure it generates scales with the intrathoracic
 * stressed volume it has to displace, so an empty thorax generates none (the exsanguinated heart gets no CPP from
 * compressions alone). Reference stressed intrathoracic volume ≈ 8 % of blood volume (measured resting: adult 382 mL /
 * BV 4 900, woman 370 / 3 900, 4 y child 89 / 1 152) [FIT: CPR pressure or pericardial reserve fitted to the prototype/Paradis bands; brief research/44 L2-20].
 */
export const V_CPR_REF_FRAC = 0.08;
/**
 * The chest does not fully recoil between compressions — a residual intrathoracic pressure stays on the collapsible
 * venous side (RA and the pulmonary compartments) through the decompression phase, which is why Paradis 1990 measured
 * RA relaxation pressures of 15–25 mmHg rather than the ≈ 2 mmHg a full release gives. Fraction of the thoracic-pump
 * amplitude retained during release [FIT: CPR pressure or pericardial reserve fitted to the prototype/Paradis bands; fit to Paradis's RA relaxation band; brief research/44 L2-20].
 */
export const CPR_RELEASE_RESIDUAL = 0.65;

// --- histamine release (morphine, atracurium, mivacurium) ---
/** × (1 − HIST_SVR·histamine) on SVR and + HIST_V0·histamine on the venous unstressed fraction, histamine 0–1 from
 * the drug model's `bus.airway.histamine` [FIT: fast morphine 10 mg lowers SVR 10–20 % (M10 ch. 22) and
 * MAP 8–25 % (T6.3), with the reflex tachycardia EMERGING from the pressure fall (HR +3 to +25); brief research/44 X-10]. */
export const HIST_SVR = 0.22;
export const HIST_V0 = 0.04;

// --- integration ---
export const H_S = 0.002; // RK4 step

/** ICRP 89 reference-adult (male) cardiac-output fractions (N-P10) — used by the organs; the circulation exposes them
 * only. */
export const ICRP89_FLOW_FRACTIONS_M = { brain: 0.12, myocardium: 0.04, kidneys: 0.17, liver: 0.255, muscle: 0.17, skin: 0.05, fat: 0.05, bone: 0.05 } as const;
