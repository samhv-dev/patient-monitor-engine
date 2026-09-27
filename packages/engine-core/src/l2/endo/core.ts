// Stage 7e endocrine/metabolic core: one engine-independent 1 Hz step that combines stress hormones, glucose–insulin,
// thyroid, system conditions and MH/thermal metabolism into EndoOut — the only thing the adapters read. Plain data.
// Drugs are Stage 7g's (R51 §1–3): dextrose/insulin reach the glucose model through the pipeline's dose observer,
// exogenous epinephrine arrives as a plasma-equivalent input, dantrolene acts in the thermal module. DKA is Stage 7c's
// condition: its severity (7c's `blood.out.dkaSeverity`) is an INPUT here, never an output (no ketone drive back).
import { tempHrF } from '../thermal/metabolic.ts';
import { conditionEffects, createConditions, stepConditions, type ConditionEffects, type ConditionState } from './conditions.ts';
import { stressEffects, type StressEffects } from './effects.ts';
import { createGlucose, stepGlucose, type GlucoseState } from './glucose.ts';
import { createHormones, stepHormones, type HormoneState } from './hormones.ts';
import {
  EPI_BASAL_PG_ML, HYPO_EPI_THRESHOLD_MGDL, IB_UU_ML, INS_K_PER_UU, INS_N_PER_MIN, MGDL_PER_MMOL, MH_K_EFFLUX, NEUROGLYCOPENIA_MGDL,
  SYMP_HYPOGLY_PER_MGDL, VI_ML_KG,
} from './params.ts';
import { thyroidEffects, type ThyroidState } from './thyroid.ts';

export interface EndoProfile {
  diabetes: 'none' | 'type1' | 'type2';
  thyroid: ThyroidState;
  adrenalInsufficiency: boolean;
}

export const DEFAULT_ENDO_PROFILE: EndoProfile = { diabetes: 'none', thyroid: 'normal', adrenalInsufficiency: false };

/** Resolved per-profile glucose parameters (tables §5c SI diabetic 1–3e-4 → × 0.3; type 2 fasting ≈ 8 mmol/L). */
export function glucoseProfile(p: EndoProfile): { gb: number; si: number; beta: number; glucagon: number; basalExo: boolean } {
  if (p.diabetes === 'type1') return { gb: 130, si: 1, beta: 0, glucagon: 0, basalExo: true };
  if (p.diabetes === 'type2') return { gb: 144, si: 0.3, beta: 1, glucagon: 1, basalExo: false };
  return { gb: 100, si: 1, beta: 1, glucagon: 1, basalExo: false };
}

export interface EndoInputs {
  noxious: number;
  antinoc: number;
  mapMmHg: number;
  sao2: number;
  paco2: number;
  tempC: number; // core temperature (the fever HR term)
  mhActivity: number; // thermal (0–1)
  liverF: number; // 7d `organs.liver.glucoseF` (1 normal)
  weightKg: number;
  betaBlock: number; // 7a `prof.betaBlock` (HR)
  betaBlockC: number; // 7a `prof.betaBlockC` (contractility)
  epiExoPgMl: number; // 7g epinephrine as plasma pg/mL
  bronchoDilExt: number; // 7g `bus.airway.bronchodilation` (0–1)
  dkaSeverity: number; // 7c (0–1)
}

export const NEUTRAL_ENDO_INPUTS: EndoInputs = {
  noxious: 0, antinoc: 0, mapMmHg: 85, sao2: 0.97, paco2: 40, tempC: 36.8, mhActivity: 0, liverF: 1, weightKg: 70, betaBlock: 0, betaBlockC: 0,
  epiExoPgMl: 0, bronchoDilExt: 0, dkaSeverity: 0,
};

export interface EndoCore {
  profile: EndoProfile;
  hormones: HormoneState;
  glucose: GlucoseState;
  cond: ConditionState;
  x: EndoInputs; // the last inputs (compose reads the β-block, temperature, MH and 7g's bronchodilation from them)
  out: EndoOut;
}

export interface EndoOut {
  hrF: number; // stress × thyroid HR (β-mediated: 7a/7g blunt it)
  condHrF: number; // the conditions' HR rows (tables §5e `hrRest +`): the MANUAL composite of their reflex and fever tachycardia
  feverHrF: number; // core-temperature HR term (NOT β-mediated: applied unblunted, R51 addendum 16) — MODELED
  feverHrFExcess: number; // the same above the endocrine set-point shift (the conditions' fever is in condHrF) — MANUAL
  svrF: number;
  eesF: number;
  dV0Frac: number; // + fraction of BLOOD VOLUME moved into the unstressed pool (+ = venodilation); 7a's sign is the opposite
  vo2F: number; // endocrine metabolic rate × (thyroid, conditions): VO2, VCO2 and heat (thermal.extraX)
  setShiftC: number; // fever set point added to the thermal thresholds
  kShift: number; // mmol/L ENDOGENOUS K set-point shift (endogenous epinephrine β2, secreted insulin, MH efflux) → 7c
  kfMult: number; // → 7c `blood.core.fl.kfMult`
  vasoResp: number; // → `ps.cond.vasoResp` (7g)
  anaphLung: number; // 7b `lungCondition anaphylaxis` severity (0–1; grade/5 relieved by β2 bronchodilation)
  glucoseMgDl: number;
  glucoseMmol: number;
  insulinUuMl: number;
  epiPgMl: number; // total plasma epinephrine (endogenous + 7g's)
  nePgMl: number;
  cortisolNmolL: number;
  symp: number;
  stressIndex: number; // 0–100, instructor only
  neuroglycopenia: number; // 0–1 → 7f BIS/depth
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
    profile, hormones: createHormones(), glucose, cond: createConditions(), x: { ...NEUTRAL_ENDO_INPUTS, weightKg }, out: null as unknown as EndoOut,
  };
  c.out = compose(c);
  return c;
}

/** β2 bronchodilation of endogenous + 7g epinephrine and 7g's other β2 agonists (independent effects combine). */
const orCombine = (a: number, b: number) => 1 - (1 - a) * (1 - Math.min(1, Math.max(0, b)));

function compose(c: EndoCore): EndoOut {
  const p = c.profile;
  const x = c.x;
  const cortResponse = p.adrenalInsufficiency ? 0.5 : 1;
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, cortResponse);
  const th = thyroidEffects(p.thyroid, c.cond.storm.cur);
  const cd = conditionEffects(c.cond);
  // catecholamine responsiveness (tables §5e `vasoResp`: septic hyporesponsiveness, cortisol's permissive effect) and the
  // thyroid β sensitivity scale the EXCESS of the stress effects (neural and humoral), not the condition rows
  const vr = st.vasoResp * cd.vasoResp;
  const beta = (v: number) => 1 + (v - 1) * th.betaSens * vr;
  const alpha = (v: number) => 1 + (v - 1) * vr;
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
    svrF: alpha(st.svrF) * th.svrF * cd.svrF,
    eesF: beta(st.eesF) * th.eesF * cd.eesF,
    dV0Frac: st.dV0Frac + cd.dV0Frac,
    vo2F: th.vo2F * cd.vo2F,
    setShiftC,
    kShift: st.kShift + INS_K_PER_UU * Math.max(0, g.i - g.iExo - IB_UU_ML) + MH_K_EFFLUX * x.mhActivity,
    kfMult: cd.kfMult,
    vasoResp: vr,
    anaphLung: 0.8 * c.cond.anaph.mediator * (1 - 0.6 * bd), // mediator 0.75 (grade III) → 7b severity 0.6 (its grade III)
    glucoseMgDl: g.g,
    glucoseMmol: g.g / MGDL_PER_MMOL,
    insulinUuMl: g.i,
    epiPgMl: epiTotal,
    nePgMl: h.ne,
    cortisolNmolL: h.cort,
    symp: h.symp,
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
  stepHormones(c.hormones, {
    noxious: x.noxious, antinoc: x.antinoc, extraSymp: cd.extraSymp + hypo + 2 * x.mhActivity,
    glucoseMgDl: g.g, mapMmHg: x.mapMmHg, sao2: x.sao2, paco2: x.paco2,
    cortResponse: c.profile.adrenalInsufficiency ? 0.5 : 1, epiExoPgMl: x.epiExoPgMl,
  }, dtS);
  stepConditions(c.cond, c.out.stress.mastB2, dtS);
  const st = stressEffects(c.hormones, { hr: x.betaBlock, c: x.betaBlockC }, c.profile.adrenalInsufficiency ? 0.5 : 1);
  const gp = glucoseProfile(c.profile);
  const dka = Math.min(1, Math.max(0, x.dkaSeverity));
  stepGlucose(g, {
    weightKg: x.weightKg, egpF: st.egpF * x.liverF * (1 + dka), siF: st.siF * gp.si * cd.siF * (1 - 0.5 * dka), secF: st.secF,
    beta: gp.beta * (1 - dka), glucagon: gp.glucagon, dt: dtS,
  });
  c.out = compose(c);
}
