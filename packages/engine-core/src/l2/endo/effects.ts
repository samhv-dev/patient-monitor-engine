// Stress hormone → effect multipliers (tables §5c; Clutter 1980 thresholds [TXT]; slopes [ENG], Q48). Pure.
// Haemodynamic outputs are MULTIPLIERS on the circulation (7a set points), combined multiplicatively with the
// baroreflex and drugs there (audit A11). They come from the NEURAL stress path and the ENDOGENOUS epinephrine only:
// exogenous epinephrine's HR/SVR/contractility are Stage 7g's (R51 §1–2), never applied twice. Exogenous epinephrine
// (7g's plasma-equivalent level) adds only to the β2 bronchodilation/mast-cell term and the metabolic effects.
// The profile β-blockade is Stage 7a's (`prof.betaBlock` HR, `prof.betaBlockC` contractility): it removes the β1 part
// of the neural and humoral HR/contractility effects; β2 effects (vasodilation, K, glycolysis) are kept (cardio-
// selective default). Drug β-blockade (7g's `betaBlockAdd`) is applied by 7a's control step (`betaBlunt`), not here.
// The K shift is ENDOGENOUS only (R51 addendum 16): exogenous β2/insulin K shifts are 7g's `bus.metabolic.kShift`.
import {
  CORT_BASAL, CORT_EC50, CORT_EGP_X, CORT_SI_LOSS, CORT_VASO_RESP, EPI_ALPHA_SVR, EPI_BASAL_PG_ML, EPI_BETA1_EES,
  EPI_BETA1_HR, EPI_BETA2_SVR, EPI_EC50_ALPHA, EPI_EC50_BETA1, EPI_EC50_BETA2, EPI_EC50_METAB, EPI_EGP_X, EPI_K_SHIFT,
  EPI_SEC_SUPPRESS, EPI_SI_LOSS, G_SYMP_EES, G_SYMP_HR, G_SYMP_SVR, G_SYMP_V0, HUM_SVR, HUM_V0, SURGE_SET_MAX, SURGE_SET_PER_NOX,
  EPI_ADRENAL_GAIN, EPI_EXO_PG_PER_RATE_EQ, NE_BASAL_PG_ML, NE_CL_ML_MIN_KG, NE_SPILL_GAIN, SURGE_NE_GAIN, // FU-7 (addendum 25)
} from './params.ts';
import type { HormoneState } from './hormones.ts';

export interface StressEffects {
  hrF: number; // × HR set point
  svrF: number; // × systemic resistance
  eesF: number; // × LV/RV contractility
  dV0Frac: number; // + fraction of blood volume moved into the venous unstressed pool (− = venoconstriction)
  egpF: number; // × endogenous (hepatic) glucose production
  siF: number; // × insulin sensitivity
  secF: number; // × insulin secretion
  kShift: number; // mmol/L plasma K set-point shift from ENDOGENOUS epinephrine (β2, into cells)
  vasoResp: number; // × catecholamine/vasopressor responsiveness (cortisol permissive effect)
  bronchoDil: number; // 0–1 β2 bronchodilation of endogenous + exogenous epinephrine
  mastB2: number; // 0–1 β2 mast-cell stabilisation by EXOGENOUS (7g) epinephrine — the anaphylaxis treatment (R51 addendum 16)
  /** FU-4 F2(a): × systemic resistance from the HUMORAL arm alone (AVP V1 + AT1), reported separately so the tables'
   * §7 neural bands stay unchanged and so an anaesthetic's `outF` can be seen not to act on it. */
  humSvrF: number;
  /** FU-4 F2(a): + fraction of blood volume recruited by the humoral arm (− = venoconstriction). */
  humDV0Frac: number;
  /** FU-7 (addendum 22; ruling 1): × on the baroreflex SET POINT (1 = none) — the central reset of the NOCICEPTIVE stress
   * response. Reads `h.surge`, never `h.symp`: a condition's sympathetic activity does not reset the set point. */
  surgeF: number;
  /** FU-7 (R51 addendum 25): the surge's circulating noradrenaline and adrenaline as 7g RATE-EQUIVALENTS (µg/kg/min,
   * Css = rate/CL), acted out by 7g's own adrenergic rows (`PkCtx.endoCat`). 0 without a nociceptive surge. */
  surgeNe: number;
  surgeEpi: number;
}

/** Stage 7a's profile β-blockade: fraction of the β1 chronotropic (`hr`) and inotropic (`c`) response removed. */
export interface BetaBlock {
  hr: number;
  c: number;
}

const hill = (x: number, ec50: number) => (x <= 0 ? 0 : x / (x + ec50));
const keep = (b: number) => 1 - Math.min(1, Math.max(0, b));

/** `cortExo` (FU-7, addendum 24): an exogenous glucocorticoid as cortisol-equivalent nmol/L above basal (7g's
 * dexamethasone) — it joins the METABOLIC cortisol term only; `vasoResp` keeps reading endogenous cortisol. */
export function stressEffects(h: HormoneState, bb: BetaBlock, cortResponse: number, cortExo = 0): StressEffects {
  const kHr = keep(bb.hr);
  const kC = keep(bb.c);
  const endo = Math.max(0, h.epi - EPI_BASAL_PG_ML); // endogenous excess
  const all = endo + Math.max(0, h.epiExo);
  // FU-7 (R51 addendum 25): the NOCICEPTIVE share of the adrenal output acts through 7g's adrenaline row (surgeEpi), so
  // 7e's own haemodynamic terms read the rest — each molecule acts once. The metabolic term (`me`) still reads it all.
  const surge = Math.max(0, h.surge ?? 0);
  const epiSurgePg = EPI_BASAL_PG_ML * EPI_ADRENAL_GAIN * surge;
  const endoH = Math.max(0, endo - epiSurgePg);
  const b1 = hill(endoH, EPI_EC50_BETA1);
  const b2 = hill(endoH, EPI_EC50_BETA2);
  const al = hill(endoH, EPI_EC50_ALPHA);
  const me = hill(all, EPI_EC50_METAB);
  const co = hill(h.cort + Math.max(0, cortExo) - CORT_BASAL, CORT_EC50); // FU-7 (addendum 24): + exogenous glucocorticoid
  return {
    hrF: (1 + G_SYMP_HR * h.symp * kHr) * (1 + EPI_BETA1_HR * b1 * kHr),
    svrF: (1 + G_SYMP_SVR * h.symp) * (1 + EPI_BETA2_SVR * b2) * (1 + EPI_ALPHA_SVR * al),
    eesF: (1 + G_SYMP_EES * h.symp * kC) * (1 + EPI_BETA1_EES * b1 * kC),
    dV0Frac: -G_SYMP_V0 * h.symp,
    egpF: (1 + EPI_EGP_X * me) * (1 + CORT_EGP_X * co),
    siF: (1 - EPI_SI_LOSS * me) * (1 - CORT_SI_LOSS * co),
    secF: 1 - EPI_SEC_SUPPRESS * me,
    kShift: EPI_K_SHIFT * b2,
    vasoResp: (1 - CORT_VASO_RESP) + CORT_VASO_RESP * Math.min(1.5, cortResponse * (h.cort / CORT_BASAL)),
    bronchoDil: hill(all, EPI_EC50_BETA2),
    mastB2: hill(Math.max(0, h.epiExo), EPI_EC50_BETA2),
    // FU-4 F2(a): V1/AT1 vasoconstriction is NOT scaled by `vasoResp` (catecholamine responsiveness) — vasopressin
    // keeps working where catecholamines have failed, which is why it is used in vasoplegic shock
    humSvrF: 1 + HUM_SVR * h.hum,
    humDV0Frac: -HUM_V0 * h.hum,
    surgeF: 1 + Math.min(SURGE_SET_MAX, SURGE_SET_PER_NOX * Math.max(0, h.surge ?? 0)), // FU-7 (addendum 22; ruling 1)
    // FU-7 (R51 addendum 25): pg/mL → 7g rate-equivalents (µg/kg/min = pg/mL × CL[mL/kg/min] / 1e6)
    surgeNe: (SURGE_NE_GAIN * NE_BASAL_PG_ML * NE_SPILL_GAIN * surge * NE_CL_ML_MIN_KG) / 1e6,
    surgeEpi: epiSurgePg / EPI_EXO_PG_PER_RATE_EQ,
  };
}
