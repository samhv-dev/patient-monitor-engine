// Thermoregulation constants (tables §5c; research 09 §7; annex B3). The temperature signal's heat-model constants
// are here unchanged (brief §4.6; research 03 §6), so its numbers are reproduced at the default conditions; the
// other rows are the thermoregulatory thresholds and effectors and the environment terms (annex B3 "Take").
// Tags: [P] primary source read, [TXT] textbook, [ENG] engineering choice (tuned to the prototype number given).

// --- heat model of the temperature signal (unchanged values and meanings) --------------------------------------
export const HEAT_CAP_J_KG_C = 3500; // brief §4.6
export const CORE_FRACTION = 2 / 3; // research 03 §6.2
export const M_AWAKE_W_70 = 80; // metabolic heat ~80 W (brief §4.6), scaled by effective weight
export const PERIPH_GRADIENT_C = 4.3; // awake core − periphery at 21 °C ambient [ENG: gives the 1–1.5 °C redistribution]
export const AMBIENT_C = 21; // operating theatre [ENG]
export const GA_KCP = 3; // k_cp × 2–4 once vasodilated (brief §4.6)
export const GA_M = 0.8; // metabolic heat −15–20 % under GA
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG] — not read (NEURAXIAL_BLOCK_FRAC)
export const NEURAXIAL_H = 1.5; // vasodilated skin below the block loses more heat [ENG]
// The parameter tables' own value (§5c GA vasoconstriction 34.5 ± 0.2 °C; Sessler 2000), not the [ENG] 34.8 the
// heat-model plateau had been fitted with — the depth extrapolation (removed by THR_DEPTH_MAX) had hidden the
// difference by reading 34.55 at sevoflurane's depth 1.06
export const VASOCONSTRICT_C = 34.5; // GA vasoconstriction logistic centre [TXT: tables §5c]
/** k_cp × once constricted (thermoregulatory) [ENG]. For comparison (value unchanged): the two-node model's maximally
 * constricted ÷ neutral core–skin conductance is (5.28 + 1.163·0.5)/(5.28 + 1.163·6.3) = 0.465 (Gagge 1986, below), but
 * in absolute terms 0.5·k0 (4.4 W/m²/°C at 70 kg) lies below that model's tissue conduction alone (5.28) — the MH
 * sympathetic constriction below uses the sourced absolute floor, not this. */
export const VASOCONSTRICT_KCP = 0.5;
/**
 * Neuraxial thermoregulation (Sessler DI, Anesthesiology 2000;92:578 and 2008;109:318; Kurz A, Sessler DI, Schroeder M,
 * Kurz M, Anesth Analg 1993;77:721–726): the block abolishes vasoconstriction AND shivering below its level only;
 * centrally the patient keeps an unsedated patient's thresholds, both cold-defence thresholds ≈ 0.5 °C lower (the warm,
 * vasodilated legs are "felt" as warm). Redistribution is then smaller than general anaesthesia's (Matsukawa T et al.,
 * Anesthesiology 1995;83:961: epidural −0.8 °C in hour 1 [VERIFY the value]). Sedation adds the neuro model's depth.
 * NEURAXIAL_BLOCK_FRAC: the fraction of the vasomotor/shivering effector mass below a T10 block [ENG: legs + lower
 * trunk ≈ ½].
 */
export const NEURAXIAL_BLOCK_FRAC = 0.5;
export const NEURAXIAL_THR_SHIFT_C = -0.5;
export const MH_ONSET_S = 900; // MH reaches its full activity over 15 min (tables 5–30 min) [ENG]
export const SENSOR_TAU_S = 5; // probe time constant < 10 s (research 03 §6.1)

// --- vasomotor tone ----------------------------------------------------------------------------------------
// k_cp = k0·(VASOCONSTRICT_KCP + (GA_KCP − VASOCONSTRICT_KCP)·f), f = 1/(1 + e^{−(Tc − thrVaso)/w}) (0 constricted,
// 1 dilated). Under GA (depth 1) this is exactly the heat model's formula. Awake, the tone at 36.8 °C must give k0 (the
// heat model's awake conductance): f = (1 − 0.5)/(3 − 0.5) = 0.2 at 36.8 with the awake threshold 36.9 → w = 0.1/ln 4.
export const THR_VASO_AWAKE = 36.9; // tables §5c awake vasoconstriction threshold [TXT]
export const W_VASO_AWAKE = 0.1 / Math.log(4); // 0.0721 °C [ENG: reproduces the heat model's awake k0 exactly]
export const W_VASO_GA = 0.1; // The heat model's logistic width [ENG]
export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)
/**
 * The depth the THRESHOLDS read is capped at the GA row. Uncapped, `thresholds()` extrapolates the awake → GA line to
 * depth 1.5 (2.1 °C per depth unit), so 2 % sevoflurane (thermoDepth 1.06) puts the vasoconstriction threshold at
 * 34.55 °C and the plateau at 6.2 h; the tables' and Sessler's GA row IS the row for ordinary clinical anaesthesia
 * (vasoconstriction 34.5 ± 0.2 °C, the plateau at 3–4 h: Sessler DI, Anesthesiology 2000;92:578–596; Kurz A,
 * Plattner O, Sessler DI et al., Anesthesiology 1993;79:465). A deeper anaesthetic lowering the threshold further is a
 * concentration–threshold slope no source in the tables gives, so it is not extrapolated (calibration queue).
 */
export const THR_DEPTH_MAX = 1;
/**
 * Under anaesthesia the cold-defence thresholds are lower in the elderly: vasoconstriction ≈ 1 °C lower at 60–80 y than
 * at 30–50 y under isoflurane/N2O (Kurz A, Plattner O, Sessler DI et al., Anesthesiology 1993;79:465), and the
 * shivering threshold likewise (Vassilieff N, Rosencher N, Sessler DI, Conseiller C, Anesthesiology 1995;83:1162,
 * spinal anaesthesia). The shift is weighted by the thermoregulatory DEPTH: the sources measured it under anaesthesia,
 * so the awake thresholds are unchanged. Linear in age between THR_AGE_FROM_Y and THR_AGE_TO_Y; no sourced age term for
 * sweating.
 */
export const THR_AGE_FROM_Y = 60;
export const THR_AGE_TO_Y = 80;
export const THR_AGE_SHIFT_C = -1;

// --- shivering and sweating (tables §5c; annex B3 Pulse forms) ---------------------------------------------
export const THR_SHIVER_AWAKE = 36.0; // tables §5c [TXT]; Pulse 36.8 (differs +0.8, annex)
export const THR_SHIVER_GA = 33.5; // tables §5c GA [P] (Sessler: ~1 °C below vasoconstriction)
export const THR_SWEAT_AWAKE = 37.2; // tables §5c [TXT]; Pulse 37.1
export const THR_SWEAT_GA = 38.0; // tables §5c GA [P]
/** Pulse PH/Energy 608–624: summit metabolism 21·W^0.75 W, reached 1.8 °C below the shivering threshold (linear). */
export const SUMMIT_W_PER_KG075 = 21;
export const SHIVER_SPAN_C = 1.8;
/** Shivering fades out between SHIVER_STOP_C + SHIVER_STOP_SPAN_C and SHIVER_STOP_C core (moderate hypothermia
 * abolishes it: Danzl & Pozos, NEJM 1994;331:1756 [TXT]) [ENG span]. */
export const SHIVER_STOP_C = 30;
export const SHIVER_STOP_SPAN_C = 2;
/** Tables §5c: shivering VO2 × 2–3 typical, × 5 maximum — the Pulse summit (≈ × 6.3 at 70 kg) is capped here. */
export const SHIVER_MAX_X = 5;
/** Pulse PH/Energy 668–679: sweat evaporative heat 0.25·h_sw = 0.25 × 0.20833 kcal/K/s = 218 W per °C above threshold. */
export const SWEAT_W_PER_C = 218;
/** Evaporation under drapes is limited: cap of the sweat heat loss at 70 kg [ENG: keeps MH ≥ 1 °C per 5–15 min]. */
export const SWEAT_MAX_W_70 = 150;
/**
 * Emergence without the neuro model: the thermoregulatory depth decays with this τ after `anaesthesia: 'none'` [ENG].
 */
export const EMERGE_TAU_S = 600;

// --- MH and dantrolene (tables §5.3, §7 check 21) -----------------------------------------------------------
/**
 * E131: THE one MH rate. The hypermetabolic skeletal muscle adds an O2 demand of a(t)·(MH_VO2_PEAK_X − 1)·VO2rest
 * (metabolic.ts `mhO2Demand`); oxygen demand, CO2, heat and lactate all derive from it (the old three independent
 * factors MH_HEAT_X 8, MH_VO2_FACTOR 2.5 and MH_VCO2_FACTOR 3 are gone: 640 W of heat came from oxygen worth ≈ 120 W).
 * MH_VO2_PEAK_X is the whole-body VO2 at full fulminant activity ÷ the resting VO2. Range 2–3 (tables §5.3 "VO2 ×2–3"
 * [TXT]); the centre 2.5 is taken. Measured in swine with constant ventilation and no treatment: whole-body VO2 "almost
 * twofold", hind-limb muscle VO2 almost threefold (Gronert GA, Theye RA, Anesthesiology 1976;44:36–43); 6.5 → 11.6
 * mL/kg/min, × 1.8 (Gronert GA et al., Anesthesiology 1986;64:24–28); the muscle's increase extrapolated to the whole
 * musculature ≈ the whole-body increase, ≈ 6 mL/kg/min (Gronert GA, Heffron JJ, Milde JH, Theye RA, Can Anaesth Soc J
 * 1977;24:103–109) — on a human 3.5 mL/kg/min resting VO2 that is × 2.7. A review gives "5-fold" as the upper extreme
 * (Nelson TE, Biosci Rep 2001;21:169–179) [P abstracts; no human calorimetry found].
 */
export const MH_VO2_PEAK_X = 2.5;
/**
 * E131: respiratory quotient of the hypermetabolic muscle's oxidation. The muscle substrate RQ during exercise with
 * glycogen available is 0.95 (ramp V-slope below the threshold) to 0.99 (steady state) (Cooper CB, Beaver WL, Cooper DM,
 * Wasserman K, Exp Physiol 1992;77:51–64); centre 0.97. MH muscle is glycogenolytic (lactate rises first and is
 * non-hypoxic in origin: Gronert & Theye 1976) [P abstracts].
 */
export const MH_RQ = 0.97;
/**
 * E131: the caloric equivalent of oxygen, Weir JB de V, J Physiol 1949;109:1–9: energy (kcal) = 3.941·VO2 + 1.106·VCO2
 * (L), i.e. 4.184·(3.941 + 1.106·RQ) kJ per L O2 — 20.2 kJ/L at the resting RQ 0.8, 21.1 at MH_RQ. The MH muscle heat
 * is the ACHIEVED MH VO2 × this (heat.ts). Anaerobic glycolysis is not counted: per ATP it releases about as much heat
 * as oxidation (glycogenolysis 65 vs oxidation 72 kJ/mol ATP, Curtin & Woledge 1978 and Woledge & Reilly 1988 as cited
 * in muscle-energetics work), but it makes only 1.5 ATP per lactate, ≈ 98 kJ/mol lactate (di Prampero 1999's in-vivo
 * estimate 84 kJ/mol) — and the blood model's lactate production has no substrate or pH limit, so counting it would heat
 * a body with no flow without end. A known under-count (Hall GM et al., Br J Anaesth 1976;48:305–308: in porcine MH the
 * heat is largely aerobic early; terminally aerobic metabolism accounts for about half of the muscle's temperature rise).
 */
export const WEIR_KCAL_PER_L_O2 = 3.941;
export const WEIR_KCAL_PER_L_CO2 = 1.106;
export const KJ_PER_KCAL = 4.184;
/**
 * E131: core-to-skin conduction through tissue with no skin blood flow, W/m²/°C: the two-node model's K (Gagge AP,
 * Stolwijk JAJ, Nishi Y, ASHRAE Trans 1971;77(1):247–262: core–skin heat flow = (5.28 + c_bl·SKBF)·(Tcr − Tsk)). The
 * heat model's k_cp is the blood-borne part above this floor scaled by the perfusion fraction (heat.ts); at full
 * perfusion it is unchanged.
 */
export const TISSUE_K_W_M2_C = 5.28;
/**
 * The MH sympathetic surge constricts the skin, so the heat the crisis makes stays in the core (heat.ts `kcp`). In
 * porcine MH the circulating catecholamines reach ≈ 20 × normal (Gronert GA, Theye RA, Milde JH, Tinker JH,
 * Anesthesiology 1978;49:330–337), and Sessler (Anesthesiology 2008;109:318–338, "Hyperthermia") names the "intense
 * peripheral vasoconstriction resulting from circulating catecholamine concentrations 20 times normal" as what impairs
 * heat loss in an MH crisis; the skin is mottled (European MH Group, Glahn K, Girard T, Hellblom A, Hopkins P et al.,
 * "Recognising and managing a malignant hyperthermia crisis" v2024, Box 1: "profuse sweating and mottling of skin"
 * among the early metabolic signs). The surge acts on the α-adrenergic cutaneous vessel (Sessler 2008: the
 * thermoregulatory vessels "are under alpha adrenergic control and are constricted by norepinephrine"), not through the
 * hypothalamus whose vasoconstriction threshold the anaesthetic has lowered to ≈ 34.5 °C — so it constricts a skin the
 * GA keeps dilated. Its floor is the two-node model's maximally constricted core–skin conductance:
 *   k_min = (TISSUE_K_W_M2_C + BLOOD_HEAT_WH_L_C·SKBF_MIN_L_H_M2)·BSA = 5.86 W/m²/°C·BSA (10.8 W/°C at 70 kg, 175 cm)
 * against today's GA-dilated 3·k0 (48.9 W/°C, ≈ 18 L/h/m² of skin blood, ≈ 0.56 L/min) — Gagge AP, Fobelets AP,
 * Berglund LG, ASHRAE Trans 1986;92(2B):709–731: skin blood flow neutral 6.3, bounded 0.5–90 L/h/m², core–skin heat
 * flow (5.28 + 1.163·SKBF)·(Tcr − Tsk) [P as implemented in pythermalcomfort `two_nodes_gagge` (Tartarini F, Schiavon
 * S, SoftwareX 2020;12:100578); the 1986 original not reached — VERIFY]. Magnitudes the other sources give: resting
 * normothermic skin blood flow ≈ 250 mL/min (Charkoudian N, J Appl Physiol 2010;109:1221–1228), 6–8 L/min in
 * hyperthermia (Charkoudian N, Mayo Clin Proc 2003;78:603–612); ≈ 10 % of cardiac output crosses the acral
 * arteriovenous shunts, which tonic sympathetic activity keeps nearly closed at room temperature (Sessler 2008).
 * The constriction is linear in the MH sympathetic drive `mhSympDrive` (mh.ts, 0–1; 1 = the fulminant surge, the
 * ≈ 20 × catecholamines): k = k_v − drive·max(0, k_v − k_min) [ENG shape: linear between the two sourced ends; no
 * fitted value]. It never raises a conductance already below the floor.
 */
export const SKBF_MIN_L_H_M2 = 0.5;
/** Blood's heat capacity per litre, W·h/L/°C (4.187 kJ/kg/°C ÷ 3600 at ≈ 1 kg/L): Gagge 1986's c_bl 1.163 [P, as above]. */
export const BLOOD_HEAT_WH_L_C = 1.163;
/**
 * E117: the SYMPATHETIC share of MH (its `extraSymp`, endo/core.ts) is front-loaded — it approaches severity × the
 * unsuppressed fraction with this τ from the trigger instead of following the 15-min metabolic ramp, so the heart rate
 * is rising before the EtCO2 leaves its baseline. Tachycardia is among the earliest and most consistent signs of MH
 * (Miller's Anesthesia 10e, malignant hyperthermia chapter; Larach MG et al., Anesth Analg 2010;110:498–507), and in
 * porcine MH the plasma catecholamines rise many-fold, as a consequence of the hypermetabolism rather than its cause
 * (Gronert GA, Milde JH, Theye RA, Anesthesiology 1977;47:411–415) [TXT direction]. The 2-min τ is [ENG]: chosen in
 * the brief's 2–4 min order to meet the owner's target E117, not taken from a source.
 */
export const MH_SYMP_TAU_S = 120;
export const MH_RELAX_TAU_S = 600; // the unsuppressed fraction follows dantrolene with τ 10 min (tables "VCO2 excess decays τ 10–20 min") [ENG]
/**
 * Dantrolene's PK and effect curve are the drug model's: `bus.metabolic.dantroleneE` = C/(C + 1) with C in 2.5 mg/kg
 * reference doses (a gamma curve peaking at 10 min, t10 6 h: `gammaPk(2.5, true, 600, 21600)`). The endocrine model maps that effect onto
 * the MH activity: the unsuppressed fraction relaxes toward max(0, 1 − DANT_GAIN·E). 2.5 mg/kg (E ≈ 0.5) → floor 0.2, 5
 * mg/kg (E 0.67) → 0 (tables "repeat to response: average 5 mg/kg") [ENG, fitted in the prototype].
 */
export const DANT_GAIN = 1.6;
/**
 * MH from its triggers in a susceptible patient (the neuro model publishes the exposure times; the MH state is the
 * endocrine model's). Onset latency after each trigger: succinylcholine starts the hypermetabolism at once (the MH
 * ramp then reaches full activity over MH_ONSET_S, so EtCO2 doubles ≈ 14 min after the dose); a volatile alone starts
 * it later. Direction: Visoiu M, Young MC, Wieland K, Brandom BW, Anesth Analg 2014;118:388–396 (North American MH
 * Registry, 477 cases: onset is shorter after succinylcholine with every volatile; without succinylcholine sevoflurane
 * is faster than isoflurane or desflurane); Larach MG et al., Anesth Analg 2010;110:498–507 (clinical presentation)
 * [VERIFY the medians]. Magnitudes [ENG]: 0 s with succinylcholine; for a volatile alone the agent's registry median
 * (below). Severity 1 = the fulminant course of the instructor's `condition mh 1` (open: fixed vs a seeded draw;
 * fulminant vs abortive).
 */
export const MH_SUX_LATENCY_S = 0;
/** The volatile-alone latency is agent-specific and deterministic — the registry's median time to the first sign
 * without succinylcholine (Visoiu 2014: sevoflurane ≈ 45 min, desflurane ≈ 114 min, as quoted in secondary sources
 * [VERIFY against the paper]; isoflurane has no median in those sources — the desflurane value is used and flagged
 * [VERIFY]; halothane is not a library agent). Any other agent takes the sevoflurane value. */
export const MH_VOLATILE_LATENCY_S: Readonly<Record<string, number>> = { sevoflurane: 45 * 60, desflurane: 114 * 60, isoflurane: 114 * 60 };
export const MH_VOLATILE_LATENCY_DEFAULT_S = 45 * 60;
export const MH_PROFILE_SEVERITY = 1;
