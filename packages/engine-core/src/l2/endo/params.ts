// Endocrine/metabolic constants (tables §5c, §5e; annex B3 "Take: insulin secretion line, epi/NE basal release and
// clearance"; Clutter 1980 epinephrine thresholds via the tables' [TXT] rows). Tags as in the tables.

// --- sympathetic stress (tables §5c `noxious`, `sympStress`) ----------------------------------------------------
export const SYMP_ON_TAU_S = 25; // onset τ 20–40 s (tables) [TXT pattern; 25 → measured HR τ ≈ 35 s with the epinephrine part]
export const SYMP_OFF_TAU_S = 180; // offset τ 2–4 min (tables)
/** The CENTRAL component of the stress response — NOCICEPTION resets the baroreflex set point upward, so the reflex
 * defends the higher pressure instead of cancelling the surge (without the reset, laryngoscopy after propofol gave +6
 * mmHg). The factor reads the nociceptive state `h.surge` ONLY (never `h.symp`, which carries
 * sepsis/anaphylaxis/MH/hypoglycaemia and the drug model's `sympDrive`). [ENG; fit target: MAP +20–30 mmHg and HR
 * +12–30 for 2–5 min after laryngoscopy (M10 ch. 44; tables §5.3), with the endocrine model's own onset τ 25 s / offset
 * τ 180 s giving the time course. Prototype: 0.25 gives awake ΔMAP +25 / ΔHR +22 and, after propofol 2 mg/kg, ΔMAP
 * +12.8 / ΔHR +15 — after propofol the baroreflex `outF` caps what the reflex can deliver, so the gain has little MAP
 * leverage there (0.5 → +14.2 only); 0.12 gave +12.2 / +11.] */
export const SURGE_SET_PER_NOX = 0.25;
export const SURGE_SET_MAX = 0.25;
/** × on the NOCICEPTIVE share of the noradrenaline spillover readout (NE_BASAL_PG_ML · NE_SPILL_GAIN · h.surge, pg/mL)
 * that circulates and acts through the drug model's noradrenaline row. [ENG; fit target: ΔMAP +20–30 mmHg after
 * propofol 2 mg/kg (Shribman 1987; M10 ch. 44) with the set-point reset above, the awake response and the guard arms
 * unchanged. Direction: plasma noradrenaline rises within 1 min of laryngoscopy (Shribman 1987; Derbyshire 1983).]
 * MEASURED: 0.6 gives ΔMAP +27.1 after propofol 2 mg/kg (band 20–30), ΔHR +18 (12–30), 84 % of the peak still present
 * at +90 s, fentanyl-blunted ratio 0.20 and lidocaine 0.85; 1.0 gave +33.2 (above the band), 0.4 gave +23.7 with the
 * fentanyl ratio 0.18 (below 0.2–0.7). */
export const SURGE_NE_GAIN = 0.6;
export const G_SYMP_HR = 0.18; // neural part of HR +15–25 % at sympStress 1 (tables); with the adrenal epinephrine part: × 1.245 [ENG]
export const G_SYMP_SVR = 0.2; // SVR +15–25 % at sympStress 1 (tables)
export const G_SYMP_EES = 0.15; // contractility [ENG]
export const G_SYMP_V0 = 0.03; // venous unstressed volume −3 % of blood volume at 1 [ENG]
export const SYMP_MAX = 3; // clamp
/** The releasable catecholamine store an INDIRECT sympathomimetic (ephedrine, ketamine) works through. It falls while
 * the endogenous sympathetic drive is high (prolonged shock: the "cold" phase, reserpine-like depletion) and refills
 * slowly. τ_down 20 min at symp 3, τ_up 2 h, floor 0.2 [ENG; direction: M10 ch. 21 (ketamine's depression is unmasked
 * when catecholamines are exhausted), Levy 2018 (adrenergic hyporesponsiveness in prolonged septic shock)]. */
export const CAT_RESERVE_TAU_DOWN_S = 1200;
export const CAT_RESERVE_TAU_UP_S = 7200;
export const CAT_RESERVE_FLOOR = 0.2;
export const CAT_RESERVE_SYMP_REF = 3;
/**
 * Antinociception when the neuro model is absent: general anaesthesia alone blunts ≈ 60 % of the noxious response [ENG,
 * Q48].
 */
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
/**
 * E117: the MH sympathetic drive, in units of stress activity, at full front-loaded drive (`mhSympDrive` 1). The old
 * coupling was 2 × the metabolic activity (kept when `mhSymp` is absent); 2.5 [ENG] so that, with the hypercapnic term
 * below kept small, the MH patient reaches HR ≥ 120 by EtCO2 55 (target E117; measured 126). The stress activity's
 * SYMP_MAX 3 still bounds the sum.
 */
export const MH_SYMP_GAIN = 2.5;
/**
 * E117: the hypermetabolic MH muscle dilates its own vessels (functional, metabolic hyperaemia: local flow follows
 * the tissue's O2 consumption, and skeletal muscle is ≈ 40 % of body mass; MH multiplies whole-body VO2 by 2–3) —
 * SVR × (1 − MH_SVR_DILATION × the metabolic activity), as the thyroid storm's hypermetabolism already lowers SVR
 * (`thyroid.ts`). Direction [TXT, textbook functional hyperaemia; no MH-specific source]; size [ENG]: without it the larger E117 sympathetic
 * drive raised the untreated MAP at +20 min from 99 to 115 against the FU-7.1 band (≤ 104, research/24 P2); with
 * 0.2 it is 101, and the pressure still peaks and falls back as the pH does.
 */
export const MH_SVR_DILATION = 0.2;
/**
 * E117: hypercapnia raises NEURAL sympathetic activity — the chemoreflex. In conscious humans breathing CO2 to raise
 * end-tidal PCO2 by ≈ 10 mmHg, muscle sympathetic nerve activity rose markedly while the pressure rose a few mmHg
 * (Somers VK, Mark AL, Zavala DC, Abboud FM. Contrasting effects of hypoxia and hypercapnia on ventilation and
 * sympathetic activity in humans. J Appl Physiol 1989;67:2101–2106) [P: the direction of the VASCULAR sympathetic
 * outflow, in conscious subjects]. Here `symp` gains SYMP_HYPERCAPNIA_PER_MMHG per mmHg of PaCO2 above
 * SYMP_HYPERCAPNIA_FROM_MMHG, up to SYMP_HYPERCAPNIA_MAX (reached at PaCO2 55). `symp` also acts on HR, contractility
 * and venous tone: those arms, the size, and the size under anaesthesia (volatiles blunt the reflex) are [ENG].
 * The term is deliberately SMALL because it is not alone (KNOWN OVERLAP, owner note): the ADRENAL hypercapnia drive
 * (DRIVE_HYPERCAPNIA_PER_MMHG, above 50) and the circulation's chemoreflex pressor term (circ `chemoFactors`, +1 %/mmHg
 * HR and SVR above 50, capped 20 %) answer the same stimulus. Measured without MH: PaCO2 51 adds 2–3 bpm (limit 10);
 * PaCO2 ≈ 68 adds ≈ 16 bpm where the old engine added 13 (limit 20); an uncapped 0.06/mmHg term gave +30 bpm at 68.
 * (The tamponade showcase's post-ROSC systolic peak, 155 → 199, is NOT changed by the cap: 200 uncapped.)
 * Folding `chemoFactors`' hypercapnic arm into this term
 * is the clean form but re-tunes every hypercapnic MODELED band: not done for rc.4. The metabolic acidaemia is NOT a
 * second input: the central chemoreceptors track PaCO2 (the blood–brain barrier delays a metabolic H+ signal); the
 * carotid bodies do sense metabolic H+, but such a term would move the sourced sepsis/DKA/haemorrhage HR bands the
 * circulation already meets. The term is a CENTRAL chemoreflex: the endocrine adapters scale it by the vasomotor
 * centre's perfusion gate (`brainstemOutF(cbfRel)`, the baroreflex's own), so the CO2 retained during an arrest does
 * not drive it while the brainstem is unperfused — and by the anaesthetic's sympatholysis, the drug model's delivered-
 * output factor (`ext.drug.symp`) that already scales the baroreflex's sympathetic output: propofol and the volatiles
 * suppress muscle sympathetic nerve activity (Ebert TJ, Muzi M, Berens R, Goff D, Kampine JP, Anesthesiology
 * 1992;76:725–733, propofol) [P direction]. Without it the CO2 a fentanyl-premedicated patient retains propped the
 * propofol induction pressure and broke the FU-7.1 opioid-synergy band (ratio 1.13 against ≥ 1.15; main 1.16).
 */
export const SYMP_HYPERCAPNIA_FROM_MMHG = 45;
export const SYMP_HYPERCAPNIA_PER_MMHG = 0.03;
export const SYMP_HYPERCAPNIA_MAX = 0.3;
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
/**
 * Untreated adrenal insufficiency is a BASAL deficit, not only a blunted stress rise: the resting cortisol is low, so
 * the permissive support of vascular tone is already missing before any stress (Annane D et al., Crit Care Med
 * 2017;45:2078 / Intensive Care Med 2017 (the glucocorticoid-deficiency guidelines: vasopressor-dependent hypotension
 * reversed by hydrocortisone); Miller 10e ch. 35). A `cortResponse` 0.5 that halved only the stress RISE would leave
 * the resting patient exactly normal (research/14). [ENG size: a basal cortisol at half normal, the same fraction the
 * stress response already carried.]
 */
export const AI_CORT_BASAL_F = 0.5;
/**
 * Cortisol is PERMISSIVE for vascular tone: below the basal level the vessels lose part of their resting resistance
 * (the vasoplegia of glucocorticoid deficiency; Annane 2017). × on SVR = 1 − CORT_SVR_PERMISSIVE · (1 −
 * cortisol/basal), applied BELOW basal only (a high cortisol does not raise SVR: the receptor is saturated) [ENG size:
 * the target is a lower resting/post-induction MAP that a vasopressor answers poorly].
 */
export const CORT_SVR_PERMISSIVE = 0.25;
/**
 * One induction dose of etomidate inhibits 11β-hydroxylase, so the adrenal cannot make cortisol for hours (Wagner RL,
 * White PF et al., NEJM 1984;310:1415; Absalom A, Pledger D, Kong A, Anaesthesia 1999;54:861 [VERIFY]). The suppression
 * follows the dose with a first-order recovery (t½ chosen inside the sources' 6–12 h) and multiplies the adrenal's
 * cortisol RESPONSE (`cortResponse`), so the resting level is untouched and the surgical rise is blunted.
 * ETOM_SUPPR_MAX at the 0.3 mg/kg reference dose [ENG: the target is cortisol ≤ 0.8 × propofol's at 4 h].
 */
export const ETOM_SUPPR_MAX = 0.6;
export const ETOM_SUPPR_REF_MG_KG = 0.3;
export const ETOM_SUPPR_T12_S = 8 * 3600;

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
export const INS_K_PER_UU = -0.03; // SECRETED insulin above basal drives K into cells: −0.3 mmol/L per +10 µU/mL [ENG]; exogenous insulin: drug kShift
/**
 * A NET ketone rate. Production follows the CURRENT insulin deficit (lipolysis and hepatic ketogenesis respond within
 * tens of minutes, so the deficit is smoothed with KETO_TAU_S, not with the 3-h `egpDef` of hepatic glucose output);
 * utilisation is insulin-dependent: the blood model's pool is cleared at a fractional rate KETO_UTIL_PER_MIN × the
 * insulin action (insulin ÷ basal, saturating at KETO_UTIL_INS_MAX), so ketones fall once insulin is given and the
 * ketoacidosis is treatable (JBDS DKA 2023 target: ketones falling ≥ 0.5 mmol/L/h on the fixed-rate infusion). Omitted
 * basal insulin in type 1 produces ketosis within hours (JBDS-IP 2023; Kitabchi AE et al., Diabetes Care 2009;32:1335).
 * Sizes [ENG; fit targets: ketosis > 3 mmol/L within the first hours of omission, and the JBDS fall rate on the
 * infusion]. The blood model's established DKA (`DKA_KETO_MMOL_L` 25 mmol/L) is the pool's scale.
 */
export const KETO_MMOL_MIN_MAX = 0.5;
export const KETO_TAU_S = 1800;
export const KETO_UTIL_PER_MIN = 0.0004;
export const KETO_UTIL_INS_MAX = 5;
/** The insulin deficit shifts K OUT of the cells (Kitabchi 2009: insulinopenia is one of DKA's two causes of
 * hyperkalaemia) — mmol/L of K set point at a full deficit [ENG: with the hyperosmolar term, DKA presents ≥ healthy]. */
export const KETO_K_EFFLUX = 1.4;
/** Hyperosmolar hyperglycaemia is the other (water leaves the cells with K): mmol/L of K set point per mg/dL of glucose
 * above HYPEROSM_FROM_MGDL, in the INSULIN-DEFICIENT patient only (× the deficit: a dextrose bolus given to a patient
 * with insulin does not shift K out) [ENG; Kitabchi 2009]. */
export const HYPEROSM_K_PER_MGDL = 0.002;
export const HYPEROSM_FROM_MGDL = 200;
export const MH_K_EFFLUX = 2.35; // MH muscle K efflux, kSet + MH_K_EFFLUX mmol/L at activity 1 — net of the endogenous-epinephrine β2 uptake and with the acidosis term: K 5.5–6.5 by 20 min (tables §7 21) [ENG; E117: 2.2 → 2.35, as its larger catecholamine surge takes more K into the cells (DI-65 K 5.57 → 5.45 → 5.58)]
/**
 * The drug model's epinephrine concentration is a RATE EQUIVALENT (µg/kg/min, the infusion that would hold it). Its
 * plasma level is rate/clearance: 1 µg/kg/min ÷ Pulse's 68.66 mL/min/kg = 14 564 pg/mL (0.05 µg/kg/min → 728 pg/mL)
 * [ENG, units].
 */
export const EPI_EXO_PG_PER_RATE_EQ = 1e6 / 68.66;
/** The blood model's `insulinDextrose` row is dosed in insulin units with 25 g dextrose per 10 units (the row's
 * regimen; UK Renal Association 2020 / JBDS: 10 units soluble insulin in 50 mL 50 % glucose) [TXT]. */
export const INSDEX_DEXTROSE_G_PER_UNIT = 2.5;

/**
 * The HUMORAL arm of haemorrhage compensation (vasopressin / angiotensin II / adrenal), which an anaesthetic does NOT
 * suppress. Without it the arterial baroreflex output is the engine's only compensation for blood loss, so propofol's
 * `outF` removes ≈ 100 % of it and class III haemorrhage + 2 mg/kg arrests at +80 s.
 * Schadt JC & Ludbrook J, Am J Physiol 1991;260:H305–H318 (the phases of the response to simple haemorrhage in
 * conscious animals: an early neural phase, then a humoral phase over minutes carried by AVP and angiotensin II).
 * The RAAS/AVP dependence of anaesthetised blood pressure is the ARB/ACE-inhibitor post-induction hypotension
 * literature (Brabant SM et al., Anesth Analg 1999;89:1388–1392).
 * Driven by baroreceptor UNLOADING (the fall of mean pressure below the patient's set point), not by nociception.
 */
export const HUM_ON_TAU_S = 150; // rise τ (Schadt & Ludbrook's humoral phase: minutes) [ENG within 120–300]
export const HUM_OFF_TAU_S = 600; // decay τ — AVP and angiotensin outlast the stimulus [ENG]
/**
 * Saturating (hyperbolic) in unloading: drive = u / (u + EC50), u = the fall of mean pressure below the set point.
 * The form matters. A patient who has been bleeding for fifteen minutes ALREADY carries vasopressin and angiotensin
 * when you induce them, and that pre-existing tone is what the anaesthetic cannot take away; a threshold/sigmoid form
 * that left the compensated class III patient with almost no humoral tone before induction could not catch the crash
 * afterwards, because the arm's own τ is minutes (measured: it arrested at +75 s either way). The healthy patient
 * starts at zero unloading, so the same curve gives them very little.
 */
export const HUM_EC50_MMHG = 30; // half-maximal humoral drive [ENG, fit: class III keeps its ATLS picture and does not arrest on 2 mg/kg]
export const HUM_MAX = 1; // saturation of the arm
/**
 * Unloading below this is the resting pressure's own beat-to-beat and respiratory ripple around the set point, not a
 * haemorrhage — without it the arm is never exactly neutral at rest (SVR × 1.0003 at 5 s: the healthy adult's
 * continuous MAP sits 0.2–2.1 mmHg under its set point in the first seconds), which the endocrine model's "neutral at
 * rest" contract forbids [ENG; 3 mmHg against a class III unloading of ≈ 25–55 mmHg, so the compensated patient's
 * pre-existing humoral tone is essentially unchanged].
 */
export const HUM_DEADBAND_MMHG = 3;
export const HUM_SVR = 0.32; // × systemic resistance at full effect (AVP V1 + AT1) [ENG; 0.55 blunted Ali's tamponade collapse away]
export const HUM_V0 = 0.30; // fraction of blood volume held in the SHARED unstressed reservoir at full effect [ENG; the term that keeps the bleeding patient alive through induction]
