// Endocrine/metabolic core: one engine-independent 1 Hz step that combines stress hormones, glucose–insulin,
// thyroid, system conditions and MH/thermal metabolism into EndoOut — the only thing the adapters read. Plain data.
// Drugs are the drug model's: dextrose/insulin reach the glucose model through the pipeline's dose observer,
// exogenous epinephrine arrives as a plasma-equivalent input, dantrolene acts in the thermal module. DKA is the blood
// model's condition: its severity (`blood.out.dkaSeverity`) is an INPUT here, never an output (no ketone drive back).
import { acidosisFactor } from '../pk/pd.ts'; // ONE pH → catecholamine-efficacy curve (tables §5b.1, Q44)
import { tempHrF } from '../thermal/metabolic.ts';
import { conditionEffects, createConditions, stepConditions, type ConditionEffects, type ConditionState } from './conditions.ts';
import { stressEffects, type StressEffects } from './effects.ts';
import { createGlucose, stepGlucose, type GlucoseState } from './glucose.ts';
import { createHormones, stepHormones, type HormoneState } from './hormones.ts';
import {
  AI_CORT_BASAL_F, ETOM_SUPPR_MAX, ETOM_SUPPR_T12_S, HYPEROSM_FROM_MGDL, HYPEROSM_K_PER_MGDL, KETO_K_EFFLUX, KETO_MMOL_MIN_MAX,
  KETO_TAU_S, KETO_UTIL_INS_MAX, KETO_UTIL_PER_MIN,
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';
import { thyroidEffects, type ThyroidState } from './thyroid.ts';

export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';
  /** Type 1 only — false omits the long-acting basal insulin (insulin-deficient: ketogenesis, K⁺ efflux). */
  basalInsulin: boolean;
  thyroid: ThyroidState;
  adrenalInsufficiency: boolean;
}

export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false, basalInsulin: true };

/** Resolved per-profile glucose parameters (tables §5c SI diabetic 1–3e-4 → × 0.3; type 2 fasting ≈ 8 mmol/L). */
export function glucoseProfile(p: EndoProfile): { gb: number; si: number; beta: number; glucagon: number; basalExo: boolean } {
  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: p.basalInsulin !== false };
  if (p.diabetes === 'type2') return { gb: 144, si: 0.3, beta: 1, glucagon: 1, basalExo: false };
  return { gb: 100, si: 1, beta: 1, glucagon: 1, basalExo: false };
}

export interface EndoInputs {
  /** The drug model's indirect-sympathomimetic drive (`pk.bus.cns.sympDrive`), 0–3; 0 without the drug model. */
  sympDrug?: number;
  noxious: number;
  antinoc: number;
  /** The OPIOID + lidocaine share of the antinociception — the nociceptive surge state reads it (a hypnotic does not
   * abolish the humoral stress response, Desborough 2000). Absent = the total. */
  antinocOp?: number;
  mapMmHg: number;
  /** The patient's own mean-pressure set point (circulation `baro.set`) — the humoral arm's unloading reference. */
  mapSetMmHg: number;
  sao2: number;
  paco2: number;
  /** Arterial pH (`blood.core.ab.ph`); absent/neutral 7.4. The catecholamine responsiveness reads it. */
  ph?: number;
  tempC: number; // core temperature (the fever HR term)
  mhActivity: number; // thermal (0–1)
  liverF: number; // `organs.liver.glucoseF` (1 normal)
  weightKg: number;
  betaBlock: number; // The circulation's `prof.betaBlock` (HR)
  betaBlockC: number; // `prof.betaBlockC` (contractility)
  epiExoPgMl: number; // drug-model epinephrine as plasma pg/mL
  /** The drug model's exogenous glucocorticoid, cortisol-equivalent nmol/L above basal (0 without the drug model). */
  cortExoNmolL?: number;
  bronchoDilExt: number; // `bus.airway.bronchodilation` (0–1)
  dkaSeverity: number; // 0–1
}

export const NEUTRAL_ENDO_INPUTS: EndoInputs = {
  noxious: 0, antinoc: 0, mapMmHg: 85, mapSetMmHg: 85, sao2: 0.97, paco2: 40, ph: 7.4, tempC: 36.8, mhActivity: 0, liverF: 1, weightKg: 70, betaBlock: 0, betaBlockC: 0,
  epiExoPgMl: 0, bronchoDilExt: 0, dkaSeverity: 0, sympDrug: 0,
};

export interface EndoCore {
  profile: EndoProfile;
  hormones: HormoneState;
  glucose: GlucoseState;
  cond: ConditionState;
  x: EndoInputs; // The last inputs (compose reads the β-block, temperature, MH and the drug bronchodilation from them)
  /** 11β-hydroxylase suppression left by an etomidate dose (0–1), recovering with ETOM_SUPPR_T12_S. */
  etomSuppr?: number;
  /** The ketogenic insulin deficit (0–1), the current deficit smoothed with KETO_TAU_S. */
  ketoDef?: number;
  out: EndoOut;
}

export interface EndoOut {
  hrF: number; // Stress × thyroid HR (β-mediated: the circulation and drug models blunt it)
  condHrF: number; // the conditions' HR rows (tables §5e `hrRest +`): the MANUAL composite of their reflex and fever tachycardia
  feverHrF: number; // Core-temperature HR term (NOT β-mediated: applied unblunted) — MODELED
  feverHrFExcess: number; // the same above the endocrine set-point shift (the conditions' fever is in condHrF) — MANUAL
  svrF: number;
  eesF: number;
  dV0Frac: number; // + fraction of BLOOD VOLUME into the unstressed pool (+ = venodilation); circulation's sign is opposite
  /** The HUMORAL arm's venous recruitment, published on its own because it shares the circulation model's ONE
   * unstressed-volume reservoir with the baroreflex and the β-agonists — added to `dV0Frac` it would double-count the
   * splanchnic bed. − = venoconstriction, as a fraction of blood volume. */
  humDV0Frac: number;
  /** The humoral arm's own × on SVR (already inside `svrF`), published so the circulation can withdraw its EFFECT
   * under no-flow ischaemia. */
  humSvrF: number;
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds
  kShift: number; // mmol/L ENDOGENOUS K set-point shift (epinephrine β2, secreted insulin, MH efflux) → the blood
  /** Ketoacid production from the INSULIN DEFICIT, mmol/min → the blood's ketoacid pool
   * (`blood.core.endoKetoMmolMin`). */
  ketoMmolMin: number;
  /** Insulin-dependent ketone utilisation, fraction of the blood model's pool per minute (`blood.core.endoKetoUtilPerMin`). */
  ketoUtilPerMin: number;
  kfMult: number; // → `blood.core.fl.kfMult`
  vasoResp: number; // → `ps.cond.vasoResp`
  anaphLung: number; // `lungCondition anaphylaxis` severity (0–1; grade/5 relieved by β2 bronchodilation)
  glucoseMgDl: number;
  glucoseMmol: number;
  insulinUuMl: number;
  epiPgMl: number; // Total plasma epinephrine (endogenous + the drug model's)
  nePgMl: number;
  cortisolNmolL: number;
  catReserve: number; // Releasable catecholamine store (0–1), scales the drug model's indirect drive
  symp: number;
  /** × on the circulation model's baroreflex set point from the NOCICEPTIVE surge (1 = none). */
  surgeF: number;
  /** The nociceptive circulating catecholamines as drug-model rate-equivalents — the drug model's `PkCtx.endoCat`. */
  surgeCat: { ne: number; epi: number };
  stressIndex: number; // 0–100, instructor only
  neuroglycopenia: number; // 0–1 → neuro BIS/depth
  stress: StressEffects;
  cond: ConditionEffects;
}

export function createEndoCore(profile: EndoProfile = DEFAULT_ENDO_PROFILE, weightKg = 70): EndoCore {
  const gp = glucoseProfile(profile);
  const glucose = createGlucose(gp.gb);
  if (gp.basalExo) {
    glucose.basalExoUuMin = INS_N_PER_MIN * VI_ML_KG * weightKg * IB_UU_ML; // long-acting basal insulin replaces secretion
    glucose.iExo = IB_UU_ML;
  }
  const c: EndoCore = {
    profile, hormones: createHormones(cortBasalF(profile)), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg },
    etomSuppr: 0, out: null as unknown as EndoOut,
  };
  c.out = compose(c);
  return c;
}

/**
 * The adrenal's cortisol RESPONSE — halved by the adrenal-insufficiency profile and, on top of it, suppressed by an
 * 11β-hydroxylase inhibitor the patient has had (etomidate: `etomSuppr`, 0–1).
 */
export function cortResponseOf(c: EndoCore): number {
  return (c.profile.adrenalInsufficiency ? 0.5 : 1) * Math.max(0, 1 - ETOM_SUPPR_MAX * Math.min(1, Math.max(0, c.etomSuppr ?? 0)));
}

/** The insulinopenia that shifts K⁺ out of the cells — the patient's own (smoothed) insulin deficit, or the
 * instructor's `dka` condition, which IS insulinopenia even though the profile's insulin is normal (research/14). */
export function insulinopenia(c: EndoCore): number {
  return Math.max(c.ketoDef ?? 0, Math.min(1, Math.max(0, c.x.dkaSeverity)));
}

/** The × on the BASAL cortisol of this patient (adrenal insufficiency is a resting deficit too). */
export const cortBasalF = (p: EndoProfile): number => (p.adrenalInsufficiency ? AI_CORT_BASAL_F : 1);

/**
 * β2 bronchodilation of endogenous + drug-model epinephrine and the drug model's other β2 agonists (independent
 * effects combine).
 */
const orCombine = (a: number, b: number) => 1 - (1 - a) * (1 - Math.min(1, Math.max(0, b)));

function compose(c: EndoCore): EndoOut {
  const p = c.profile;
  const x = c.x;
  const cortResponse = cortResponseOf(c);
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponse);
  const th = thyroidEffects(p.thyroid, c.cond.storm.cur);
  const cd = conditionEffects(c.cond);
  // catecholamine responsiveness (tables §5e `vasoResp`: septic hyporesponsiveness, cortisol's permissive effect) and the
  // thyroid β sensitivity scale the EXCESS of the stress effects (neural and humoral), not the condition rows
  const vr = st.vasoResp * cd.vasoResp;
  // Acidaemia blunts the VASCULAR response to the patient's OWN catecholamines exactly as the drug model blunts an
  // infused one — the SAME curve (`acidosisFactor`, pd.ts: ×(1 − 2.5·(7.4 − pH)), floor 0.4), one source for both
  // (research/24; tables §5b.1 row "pH → catecholamine response `vasoResp`", Q44). It scales the EXCESS `alpha()`
  // scales (SVR, venous tone). The chronotropic/inotropic arm `beta()` is NOT scaled: the row names the vasopressor
  // response, and blunting HR as well misses both sourced septic HR bands (tables §5e MANUAL 110–130 → measured 107; §7
  // check 16 MODELED 115–130 → 114.8).
  const vrA = vr * acidosisFactor(x.ph ?? 7.4);
  const beta = (v: number) => 1 + (v - 1) * th.betaSens * vr;
  const alpha = (v: number) => 1 + (v - 1) * vrA;
  const h = c.hormones;
  const g = c.glucose;
  const setShiftC = th.setShiftC + cd.setShiftC;
  const epiTotal = h.epi + h.epiExo;
  const lg = Math.log2(Math.max(1, epiTotal / EPI_BASAL_PG_ML));
  const bd = orCombine(st.bronchoDil, x.bronchoDilExt);
  return {
    hrF: beta(st.hrF) * th.hrF,
    condHrF: cd.hrF,
    feverHrF: tempHrF(x.tempC),
    // MANUAL: the fever tachycardia of a condition is already in its HR row, so the temperature term sees only the core
    // ABOVE the endocrine set-point shift (MH, exogenous heat, a MANUAL target) — prototype: counting it twice gave HR 153
    feverHrFExcess: tempHrF(x.tempC - setShiftC),
    svrF: alpha(st.svrF) * th.svrF * cd.svrF * st.humSvrF, // The humoral arm is outside alpha() (V1/AT1, not catecholamine-responsiveness-scaled)
    eesF: beta(st.eesF) * th.eesF * cd.eesF,
    dV0Frac: st.dV0Frac + cd.dV0Frac,
    humDV0Frac: st.humDV0Frac,
    humSvrF: st.humSvrF,
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,
    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity
      // Insulin deficiency and hyperosmolar hyperglycaemia drive K OUT of the cells (JBDS DKA 2023: K is often
      // high at presentation despite a total-body deficit) — two of the DKA causes of hyperkalaemia. The instructor's
      // `dka` condition (the blood model's severity) IS insulinopenia, so it carries the same efflux even though the
      // patient's own insulin is normal — without this DKA would present HYPOkalaemic (research/14)
      + insulinopenia(c) * (KETO_K_EFFLUX + HYPEROSM_K_PER_MGDL * Math.max(0, g.g - HYPEROSM_FROM_MGDL)),
    ketoMmolMin: KETO_MMOL_MIN_MAX * (c.ketoDef ?? 0) * (x.weightKg / 70),
    ketoUtilPerMin: KETO_UTIL_PER_MIN * Math.min(KETO_UTIL_INS_MAX, g.i / IB_UU_ML),
    kfMult: cd.kfMult,
    vasoResp: vr,
    anaphLung: 0.8 * c.cond.anaph.mediator * (1 - 0.6 * bd), // mediator 0.75 (grade III) → lung 0.6 (its grade III)
    glucoseMgDl: g.g,
    glucoseMmol: g.g / MGDL_PER_MMOL,
    insulinUuMl: g.i,
    epiPgMl: epiTotal,
    nePgMl: h.ne,
    cortisolNmolL: h.cort,
    symp: h.symp,
    surgeF: st.surgeF, // The nociceptive set-point factor the circulation model defends
    surgeCat: { ne: st.surgeNe, epi: st.surgeEpi }, // Acted out by the drug model's adrenergic rows
    catReserve: h.catReserve,
    stressIndex: Math.round(100 * (1 - Math.exp(-(h.symp + lg / 2) / 1.5))),
    neuroglycopenia: Math.min(1, Math.max(0, (NEUROGLYCOPENIA_MGDL + 10 - g.g) / 30)), // 0 at 60 mg/dL, 1 at 30
    stress: st,
    cond: cd,
  };
}

export function stepEndoCore(c: EndoCore, x: EndoInputs, dtS: number): void {
  c.x = x;
  const g = c.glucose;
  const hypo = Math.max(0, HYPO_EPI_THRESHOLD_MGDL - g.g) * SYMP_HYPOGLY_PER_MGDL;
  const cd = c.out.cond;
  // An 11β-hydroxylase inhibitor's suppression recovers first-order (etomidate: 6–12 h)
  if ((c.etomSuppr ?? 0) > 0) c.etomSuppr = (c.etomSuppr ?? 0) * Math.exp((-Math.LN2 * dtS) / ETOM_SUPPR_T12_S);
  // The ketogenic deficit follows the CURRENT insulin deficit within tens of minutes — in a patient with NO β-cell
  // reserve only (type 1). A pancreas that secretes less because glucose fell (after an insulin bolus) is not
  // insulinopenic, and the instructor's `dka` pool is already the ketosis its suppression of secretion stands for
  // (without this gate a non-diabetic would make ketones and a K⁺ rebound after insulin, and `dka 1` would grow
  // unbounded)
  const kd = glucoseProfile(c.profile).beta === 0 ? Math.max(0, 1 - g.i / IB_UU_ML) : 0;
  c.ketoDef = kd + ((c.ketoDef ?? 0) - kd) * Math.exp(-dtS / KETO_TAU_S);
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, antinocOp: x.antinocOp, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity + (x.sympDrug ?? 0) * c.out.catReserve,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, mapSetMmHg: x.mapSetMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: cortResponseOf(c), cortBasalF: cortBasalF(c.profile), epiExoPgMl: x.epiExoPgMl,
  }, dtS);
  stepConditions(c.cond, c.out.stress.mastB2, dtS);
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponseOf(c), x.cortExoNmolL ?? 0);
  const gp = glucoseProfile(c.profile);
  const dka = Math.min(1, Math.max(0, x.dkaSeverity));
  stepGlucose(g, {
    weightKg: x.weightKg, egpF: st.egpF * x.liverF * (1 + dka), siF: st.siF * gp.si * cd.siF * (1 - 0.5 * dka), secF: st.secF,
    beta: gp.beta * (1 - dka), glucagon: gp.glucagon, dt: dtS,
  });
  c.out = compose(c);
}
