// Stage 7e thermoregulation constants (tables §5c; research 09 §7; annex B3). The Stage 3 heat-model constants move
// here unchanged (brief §4.6; research 03 §6) so every Stage 3 number is reproduced at the default conditions;
// the new rows are the thermoregulatory thresholds and effectors and the environment terms (annex B3 "Take").
// Tags: [P] primary source read, [TXT] textbook, [ENG] engineering choice (tuned to the prototype number given).

// --- Stage 3 (unchanged values; the names keep their Stage 3 meaning) --------------------------------------
export const HEAT_CAP_J_KG_C = 3500; // brief §4.6
export const CORE_FRACTION = 2 / 3; // research 03 §6.2
export const M_AWAKE_W_70 = 80; // metabolic heat ~80 W (brief §4.6), scaled by effective weight
export const PERIPH_GRADIENT_C = 4.3; // awake core − periphery at 21 °C ambient [ENG: gives the 1–1.5 °C redistribution]
export const AMBIENT_C = 21; // operating theatre [ENG]
export const GA_KCP = 3; // k_cp × 2–4 once vasodilated (brief §4.6)
export const GA_M = 0.8; // metabolic heat −15–20 % under GA
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG]
export const NEURAXIAL_H = 1.5; // vasodilated skin below the block loses more heat [ENG]
export const VASOCONSTRICT_C = 34.8; // GA vasoconstriction logistic centre (tables 34.5 ± 0.2; plateau 34.6–34.8) [ENG]
export const VASOCONSTRICT_KCP = 0.5; // k_cp × once constricted [ENG]
export const MH_ONSET_S = 900; // MH reaches its full activity over 15 min (tables 5–30 min) [ENG]
export const MH_VCO2_FACTOR = 3; // VCO2 × 3 at activity 1 (tables × 2–5; × 5 passes the 150 mmHg EtCO2 limit) [ENG]
export const SENSOR_TAU_S = 5; // probe time constant < 10 s (research 03 §6.1)

// --- vasomotor tone (Stage 7e) ------------------------------------------------------------------------------
// k_cp = k0·(VASOCONSTRICT_KCP + (GA_KCP − VASOCONSTRICT_KCP)·f), f = 1/(1 + e^{−(Tc − thrVaso)/w}) (0 constricted,
// 1 dilated). Under GA (depth 1) this is exactly Stage 3's formula. Awake, the tone at 36.8 °C must give k0 (Stage 3's
// awake conductance): f = (1 − 0.5)/(3 − 0.5) = 0.2 at 36.8 with the awake threshold 36.9 → w = 0.1/ln 4.
export const THR_VASO_AWAKE = 36.9; // tables §5c awake vasoconstriction threshold [TXT]
export const W_VASO_AWAKE = 0.1 / Math.log(4); // 0.0721 °C [ENG: reproduces Stage 3's awake k0 exactly]
export const W_VASO_GA = 0.1; // Stage 3's logistic width [ENG]
export const T_NORMAL = 36.8; // the default core the thresholds are written for (L1 tempCore default)

// --- shivering and sweating (tables §5c; annex B3 Pulse forms) ---------------------------------------------
export const THR_SHIVER_AWAKE = 36.0; // tables §5c [TXT]; Pulse 36.8 (differs +0.8, annex)
export const THR_SHIVER_GA = 33.5; // tables §5c GA [P] (Sessler: ~1 °C below vasoconstriction)
export const THR_SWEAT_AWAKE = 37.2; // tables §5c [TXT]; Pulse 37.1
export const THR_SWEAT_GA = 38.0; // tables §5c GA [P]
/** Pulse PH/Energy 608–624: summit metabolism 21·W^0.75 W, reached 1.8 °C below the shivering threshold (linear). */
export const SUMMIT_W_PER_KG075 = 21;
export const SHIVER_SPAN_C = 1.8;
/** FU-4 G12: shivering fades out between SHIVER_STOP_C + SHIVER_STOP_SPAN_C and SHIVER_STOP_C core (moderate
 * hypothermia abolishes it: Danzl & Pozos, NEJM 1994;331:1756 [TXT]) [ENG span]. */
export const SHIVER_STOP_C = 30;
export const SHIVER_STOP_SPAN_C = 2;
/** Tables §5c: shivering VO2 × 2–3 typical, × 5 maximum — the Pulse summit (≈ × 6.3 at 70 kg) is capped here. */
export const SHIVER_MAX_X = 5;
/** Pulse PH/Energy 668–679: sweat evaporative heat 0.25·h_sw = 0.25 × 0.20833 kcal/K/s = 218 W per °C above threshold. */
export const SWEAT_W_PER_C = 218;
/** Evaporation under drapes is limited: cap of the sweat heat loss at 70 kg [ENG: keeps MH ≥ 1 °C per 5–15 min]. */
export const SWEAT_MAX_W_70 = 150;
/** Emergence without 7f: the thermoregulatory depth decays with this τ after `anaesthesia: 'none'` [ENG]. */
export const EMERGE_TAU_S = 600;

// --- MH and dantrolene (tables §5.3, §7 check 21) -----------------------------------------------------------
export const MH_HEAT_X = 8; // muscle heat × m0 added at activity 1: core +1 °C by 15 min of the trigger (tables §7 check 21) [ENG]
export const MH_VO2_FACTOR = 2.5; // VO2 × 2–3 (tables) [TXT]
export const MH_RELAX_TAU_S = 600; // the unsuppressed fraction follows dantrolene with τ 10 min (tables "VCO2 excess decays τ 10–20 min") [ENG]
/**
 * Dantrolene's PK and effect curve are Stage 7g's (R51 §1, addendum 16): `bus.metabolic.dantroleneE` = C/(C + 1) with C
 * in 2.5 mg/kg reference doses (a gamma curve, 90 % of its peak within 1 min, t10 6 h). 7e maps that effect onto the
 * MH activity: the unsuppressed fraction relaxes toward max(0, 1 − DANT_GAIN·E). 2.5 mg/kg (E ≈ 0.5) → floor 0.2,
 * 5 mg/kg (E 0.67) → 0 (tables "repeat to response: average 5 mg/kg") [ENG, fitted in the prototype].
 */
export const DANT_GAIN = 1.6;
/**
 * FU-10 E1 — MH from its triggers in a susceptible patient (7f publishes the exposure times; the MH state is 7e's).
 * Onset latency after each trigger: succinylcholine starts the hypermetabolism at once (the Stage 3 ramp then reaches
 * full activity over MH_ONSET_S, so EtCO2 doubles ≈ 14 min after the dose); a volatile alone starts it later. Direction:
 * Visoiu M, Young MC, Wieland K, Brandom BW, Anesth Analg 2014;118:388–396 (North American MH Registry, 477 cases: onset
 * is shorter after succinylcholine with every volatile; without succinylcholine sevoflurane is faster than isoflurane or
 * desflurane); Larach MG et al., Anesth Analg 2010;110:498–507 (clinical presentation) [VERIFY the medians]. Magnitudes
 * [ENG]: 0 s with succinylcholine; for a volatile alone the agent's registry median (below). Severity 1 = the
 * fulminant course of the instructor's `condition mh 1` (Ali Q2, open: fixed vs a seeded draw; fulminant vs abortive).
 */
export const MH_SUX_LATENCY_S = 0;
/** FU-10 E1 (orchestrator ruling R-8): the volatile-alone latency is agent-specific and deterministic — the registry's
 * median time to the first sign without succinylcholine (Visoiu 2014: sevoflurane ≈ 45 min, desflurane ≈ 114 min, as
 * quoted in secondary sources [VERIFY against the paper]; isoflurane has no median in those sources — the desflurane
 * value is used and flagged [VERIFY]; halothane is not a library agent). Any other agent takes the sevoflurane value. */
export const MH_VOLATILE_LATENCY_S: Readonly<Record<string, number>> = { sevoflurane: 45 * 60, desflurane: 114 * 60, isoflurane: 114 * 60 };
export const MH_VOLATILE_LATENCY_DEFAULT_S = 45 * 60;
export const MH_PROFILE_SEVERITY = 1;
