// Stage 7e endocrine/metabolic constants (tables §5c, §5e; annex B3 "Take: insulin secretion line, epi/NE basal
// release and clearance"; Clutter 1980 epinephrine thresholds via the tables' [TXT] rows). Tags as in the tables.

// --- sympathetic stress (tables §5c `noxious`, `sympStress`) ----------------------------------------------------
export const SYMP_ON_TAU_S = 25; // onset τ 20–40 s (tables) [TXT pattern; 25 → measured HR τ ≈ 35 s with the epinephrine part]
export const SYMP_OFF_TAU_S = 180; // offset τ 2–4 min (tables)
export const G_SYMP_HR = 0.18; // neural part of HR +15–25 % at sympStress 1 (tables); with the adrenal epinephrine part: × 1.245 [ENG]
export const G_SYMP_SVR = 0.2; // SVR +15–25 % at sympStress 1 (tables)
export const G_SYMP_EES = 0.15; // contractility [ENG]
export const G_SYMP_V0 = 0.03; // venous unstressed volume −3 % of blood volume at 1 [ENG]
export const SYMP_MAX = 3; // clamp
/** Antinociception when 7f is absent: general anaesthesia alone blunts ≈ 60 % of the noxious response [ENG, Q48]. */
export const ANTINOC_GA_FALLBACK = 0.6;

// --- plasma catecholamines (annex B3: Pulse basal release and clearance) --------------------------------------
export const EPI_BASAL_PG_ML = 34; // Pulse initial 0.034 µg/L [code]
export const NE_BASAL_PG_ML = 275; // Pulse 0.275 µg/L [code]
export const EPI_CL_ML_MIN_KG = 68.66; // Pulse sub:Epinephrine [code]
export const NE_CL_ML_MIN_KG = 55; // Pulse sub:Norepinephrine [code]
export const EPI_VD_L_KG = 0.2; // [ENG]: with Pulse's clearance gives t½ ≈ 2.0 min (literature 2–3 min)
export const NE_VD_L_KG = 0.2; // t½ ≈ 2.5 min
export const EPI_ADRENAL_GAIN = 3; // adrenal release × (1 + 3·drive): surgical stress 2–5× basal [TXT]
export const NE_SPILL_GAIN = 1.5; // NE spillover × (1 + 1.5·symp) [ENG]
// adrenal drives (each adds to the drive; [ENG] slopes, tables "catecholamine surge (hypovolaemia, hypoglycaemia, hypercapnia)")
export const DRIVE_HYPOTENSION_PER_MMHG = 0.1; // below MAP 65: +1 per 10 mmHg
export const DRIVE_HYPOXIA_PER_SAT = 10; // below SaO2 0.85: +1 per 10 %
export const DRIVE_HYPERCAPNIA_PER_MMHG = 0.05; // above PaCO2 50: +1 per 20 mmHg
export const HYPO_EPI_THRESHOLD_MGDL = 65; // counter-regulatory epinephrine threshold 3.6–3.9 mmol/L (ADA) [TXT]
export const DRIVE_HYPOGLY_PER_MGDL = 0.4; // 50 mg/dL → epinephrine ≈ 19× basal (hypoglycaemic clamps: 10–20×) [TXT]
export const SYMP_HYPOGLY_PER_MGDL = 0.06; // neural sympathoadrenal activation: 50 mg/dL → symp 0.9 [ENG: with G_SYMP_HR 0.18 keeps the hypoglycaemic HR ≥ × 1.2]

// --- epinephrine effect curves (Clutter 1980 thresholds: HR 50–100, glycaemia 150–200 pg/mL) [TXT; ENG slopes]
export const EPI_EC50_BETA1 = 800; // pg/mL above basal: HR, contractility
export const EPI_BETA1_HR = 0.5;
export const EPI_BETA1_EES = 0.5;
export const EPI_EC50_BETA2 = 300; // vasodilation (low dose), K shift, glycolysis
export const EPI_BETA2_SVR = -0.15;
export const EPI_EC50_ALPHA = 3000; // vasoconstriction (high dose)
export const EPI_ALPHA_SVR = 1.2;
export const EPI_K_SHIFT = -0.8; // mmol/L at full β2 effect (epinephrine infusion −0.5 to −0.8) [TXT]
export const EPI_EC50_METAB = 400; // glucose output, insulin resistance, insulin secretion suppression
export const EPI_EGP_X = 1.5; // hepatic glucose output × (1 + 1.5·E)
export const EPI_SI_LOSS = 0.5; // SI × (1 − 0.5·E)
export const EPI_SEC_SUPPRESS = 0.6; // insulin secretion × (1 − 0.6·E) (α2) [TXT]

// --- cortisol (tables §5c: 400 → > 1500 nmol/L, peak 4–6 h after incision) -------------------------------------
export const CORT_BASAL = 400; // nmol/L
export const CORT_GAIN = 2.75; // target × (1 + 2.75·drive): drive 1 → 1500
export const CORT_TAU_S = 1.5 * 3600; // τ 1.5 h → > 1500 nmol/L from 4 h, ≈ 95 % of the rise by 4–6 h (tables "peak 4–6 h") [ENG]
export const CORT_EC50 = 400; // nmol/L above basal for its metabolic effects
export const CORT_SI_LOSS = 0.8; // insulin resistance: SI × 0.42 at cortisol 1500 (tables stress SI × 0.3–0.5)
export const CORT_EGP_X = 0.3; // gluconeogenesis
export const CORT_VASO_RESP = 0.3; // vasopressor responsiveness (adrenal insufficiency: ×0.5 of cortisol) [TXT]

// --- glucose–insulin (Bergman minimal model, tables §5c; Pulse secretion line annex B3) --------------------------
export const GB_MGDL = 100; // 5.5 mmol/L
export const SG_PER_MIN = 0.026;
export const SI_PER_MIN_PER_UU = 8.3e-4; // per µU/mL
export const P2_PER_MIN = 0.025;
export const VG_DL_KG = 1.7;
export const IB_UU_ML = 10; // basal insulin ≈ 60 pmol/L [TXT]
export const INS_N_PER_MIN = 0.14; // plasma insulin t½ ≈ 5 min [TXT]
export const VI_ML_KG = 120; // insulin distribution volume [ENG]
/** Pulse PH/Endocrine 119–134: secretion ∝ (5.357·G − 328.56) for G ≥ 80 mg/dL, normalised to the basal rate. */
export const PULSE_SEC_SLOPE = 5.357;
export const PULSE_SEC_INTERCEPT = -328.56;
export const PULSE_SEC_MIN_MGDL = 80;
export const MGDL_PER_MMOL = 18.016;
export const UU_PER_UNIT = 1e6; // 1 U = 1e6 µU
export const HYPO_L1_MGDL = 70; // ADA level 1 (< 3.9)
export const HYPO_L2_MGDL = 54; // level 2 (< 3.0)
export const NEUROGLYCOPENIA_MGDL = 50; // ~2.8 mmol/L
export const GLUCAGON_EGP_PER_MGDL = 0.03; // counter-regulation: EGP × (1 + 0.03 per mg/dL below 70) [ENG]
export const GUT_TAU_S = 45 * 60; // two-stage gut (stomach → intestine), each τ 45 min: Ra peaks ≈ 45 min at ≈ 6 mg/kg/min for 75 g [ENG]
export const GUT_BIOAVAIL = 0.7; // hepatic first-pass uptake ≈ 30 % [TXT]
export const EGP_INSULIN_SUPP = 2; // hepatic output × (1 + 2·insulin deficit fraction): insulinopenia → 400+ mg/dL over hours [ENG]
export const EGP_DEFICIT_TAU_S = 3 * 3600; // the insulinopenic rise of hepatic output builds over hours (glucagon, gluconeogenesis) [ENG]
export const INS_K_PER_UU = -0.03; // SECRETED insulin above basal drives K into cells: −0.3 mmol/L per +10 µU/mL [ENG]; exogenous insulin is 7g's kShift
export const MH_K_EFFLUX = 2.2; // MH muscle K efflux, kSet +3 mmol/L at activity 1 — net of the endogenous-epinephrine β2 uptake and with 7c's acidosis term: K 5.5–6.5 by 20 min (tables §7 21) [ENG]
/**
 * 7g's epinephrine concentration is a RATE EQUIVALENT (µg/kg/min, the infusion that would hold it). Its plasma level is
 * rate/clearance: 1 µg/kg/min ÷ Pulse's 68.66 mL/min/kg = 14 564 pg/mL (0.05 µg/kg/min → 728 pg/mL) [ENG, units].
 */
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
