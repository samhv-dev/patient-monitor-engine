// The blood model core step (the part of pipeline.ts that does not touch the engine): fluids → solutes → oxygen/lactate
// → pH.
import type { PatientProfile } from '../../types.ts';
import { solvePh, anionGap, type AcidBase } from './acid-base.ts';
import { albGL, bloodMl, createFluids, ecfMl, hbOf, stepFluids, copPlasma, type FluidState } from './fluids.ts';
import { contentDB, type OdcCtx } from './odc.ts';
import { o2Delivery, stepLactate, type O2Out } from './oxygen.ts';
import { bloodPatient, CHRONIC_HCO3_PER_MMHG, HBF_EXP, NORMAL, type BloodPatient } from './params.ts';
import { MANNITOL_KE_PER_MIN } from '../renal/params.ts'; // Renal mannitol clearance, the fallback without the organ model
import { addFluid, calibrateXa, concOf, createSolutes, ionisedCa, K_TBK_MMOL, osmEcf, removePlasma, sidOf, stepSolutes, type Conc, type SoluteState } from './solutes.ts';
import { caMembrane, insulinEffect, INSULIN_K_SHIFT, K_PUMP_GAIN, salbutamolEffect, SALBUTAMOL_K_SHIFT, suxDeltaK, type Dose } from './treatments.ts';
import { anaerobicFactor, createMuscle, muscleActivityKShift, stepMuscle, type MuscleState } from './muscle.ts';

export interface BloodInputs {
  t: number;
  coLpm: number;
  paco2: number;
  pao2: number;
  tempC: number;
  vo2Demand: number; // mL/min
  /** VO2 demand ÷ the awake resting VO2 (the metabolic factor); default vo2Demand ÷ the profile's 3.5 mL/kg/min. */
  demandRel?: number;
  /**
   * E134: the metabolic activity of SKELETAL MUSCLE above rest, mL O2/min (the MH muscle's rate + shivering; the
   * pipeline reads both from the heat model). It drives the potassium of active muscle and the muscle's share of the
   * unpaid ATP that injures it. Absent = 0 (a quiet musculature).
   */
  muscleActivityMlMin?: number;
  /**
   * The drug model's β2-agonist/insulin/epinephrine K shift (`bus.metabolic.kShift`, mmol/L). Given → it is the ONLY
   * β2/insulin-row shift (the blood model's own salbutamol AND insulin–dextrose curves are off); absent → the blood
   * model's own curves (fallback). The `insulinDextrose` row's insulin now carries the drug model's insulin K⁺ PD (the
   * plain insulin row's mechanism), so its empirical curve is retired whenever the drug model is present, exactly as
   * salbutamol's.
   */
  kShiftExt?: number;
}

/**
 * The kidney (`blood.core.renal = { uopAboveBasalMlH, excretion: { k, na, cl, gluconate } }`, rates per hour). When the
 * organ model fills it, the seam REPLACES the fixed volume-receptor elimination and its isotonic solute loss; `null`
 * (the default) = the fixed elimination (K_EL_AWAKE, GA ×0.2). The balance has no intake term, so the seam carries only
 * the urine ABOVE the basal turnover (the kidney's UOP0, 1 mL/kg/h) — the basal urine is taken as replaced by a basal
 * intake, as in the fallback.
 */
export interface RenalSeam {
  uopAboveBasalMlH: number; // mL/h, ≥ 0: urine above the basal 1 mL/kg/h (0 at a resting kidney)
  excretion: { k: number; na: number; cl: number; gluconate: number; mannitol?: number }; // mmol/h (gluconate: Plasma-Lyte's anion, mannitol)
}

/** What other modules read (drugs: hbfRel; organs: hb, albuminGL, bvRel, lactate; lungs: cop). */
export interface BloodOut {
  na: number; k: number; kEcg: number; cl: number; iCa: number; mg: number; lactate: number; hb: number;
  albGL: number; albuminGL: number; // albuminGL = albGL (the name the organ model reads)
  ag: number; osm: number; cop: number; hbfRel: number;
  bvRel: number; // Blood volume ÷ the profile's
  dkaSeverity: number; // Ketoacid drive 0–1 (keto ÷ DKA_KETO_MMOL_L), applied here and read by the endocrine model
}

/** Established DKA: ketoacid anions 25 mmol/L at `condition dka` severity 1 [ENG]; the scale of `out.dkaSeverity`. */
export const DKA_KETO_MMOL_L = 25;

export interface BloodCore {
  pat: BloodPatient;
  fl: FluidState;
  so: SoluteState;
  ab: AcidBase;
  phNonOrg: number;
  o2: O2Out;
  /** E134: the whole musculature's energetics and injury (muscle.ts) — the glycogen store, the pH/substrate brake on
   * anaerobic metabolism, the unpaid-ATP and thermal injury dose and what necrosis releases. */
  muscle: MuscleState;
  odc: OdcCtx;
  doses: Dose[];
  burns: number;
  /** The neuro model's nm-profile receptor upregulation (burn, denervation), 0–1 — the sux K+ surge. */
  nmUpreg?: number;
  liver: number; // The organ model writes liverFn·tempF (function only); hepatic FLOW is hbfRel here, applied once
  renal: RenalSeam | null; // The organ model fills it (null = fixed elimination)
  co0: number; // Reference CO (L/min): the circuit's settled resting CO, from the circulation's `ref.co` (pipeline), else CI × weight
  ecf0: number;
  k1Hz: number; // next 1 Hz solve time
  bledMl: number; // Haemorrhage accounting: cumulative volume removed by bleed events, mL
  out: BloodOut;
}

/**
 * COHb washout — first order, t½ = 320 min × (95/PaO2)^0.8: 320 min on air, ≈ 74 min on FiO2 1 (Weaver 2009 NEJM
 * 360:1217) [ENG exponent fit to both anchors]. No ongoing exposure (the profile sets the load).
 */
export const COHB_T_HALF_AIR_MIN = 320;
export function cohbWashout(cohb: number, pao2: number, dtS: number): number {
  if (!(cohb > 0)) return cohb;
  const tHalfS = COHB_T_HALF_AIR_MIN * 60 * (95 / Math.max(20, pao2)) ** 0.8;
  return cohb * Math.exp((-Math.LN2 * dtS) / tHalfS);
}

export function createBloodCore(profile: PatientProfile | undefined, co0: number, paco2: number): BloodCore {
  const pat = bloodPatient(profile);
  const b = profile?.blood ?? {};
  const fl = createFluids(pat, b.albuminGL ?? NORMAL.albGL);
  const e0 = ecfMl(fl);
  // ONE magnesium state — a neuro-profile Mg (the neuro model's `neuroProfile.mgMmolL`) is the blood model's baseline
  // when the blood profile gives none
  const mg0 = b.mg ?? (profile as { neuro?: { mgMmolL?: number } } | undefined)?.neuro?.mgMmolL ?? NORMAL.mg;
  const so = createSolutes({ na: b.na ?? NORMAL.na, k: b.k ?? NORMAL.k, cl: b.cl ?? NORMAL.cl, iCa: b.iCa ?? NORMAL.iCa, mg: mg0, lactate: b.lactate ?? NORMAL.lactate }, e0, pat.vLacL, pat.icfMl);
  const odc: OdcCtx = { hb: pat.hb, ph: 7.4, dpgMmolL: b.dpgMmolL ?? NORMAL.dpgMmolL, cohb: b.cohb ?? 0, methb: b.methb ?? 0 };
  // calibrate the unmeasured anions so the profile's HCO3 (default 24.4) holds at PaCO2 40 (tables §5b.1 normal row).
  // Without a profile HCO3 the calibration uses the NORMAL albumin, so a profile hypoalbuminaemia keeps its weak-acid
  // deficit — the Figge picture (low AG, mild alkalosis) that the same albumin reached by dilution shows (Figge 1998
  // Crit Care Med 26:1807; Fencl 2000 AJRCCM 162:2246); a given profile HCO3 is honoured as measured.
  // A chronic hypercapnic profile (resting PaCO2 above 40) starts with its chronic renal compensation, +0.35 mmol/L
  // HCO3 per mmHg (tables §5b.1 "chronic (profile only): +0.35–0.4 per mmHg … set by the profile"; Brackett 1965,
  // Schwartz 1965), calibrated at that PaCO2; a given profile HCO3 is honoured
  const hco3 = b.hco3 ?? NORMAL.hco3 + CHRONIC_HCO3_PER_MMHG * Math.max(0, paco2 - NORMAL.paco2);
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * Math.max(NORMAL.paco2, paco2)));
  const c = concOf(so, e0, pat.vLacL, e0);
  const alb = albGL(fl);
  const albCal = b.hco3 === undefined && b.albuminGL !== undefined ? NORMAL.albGL : alb; // On the profile's fields, not floats
  const sidNeed = hco3 + albCal * (0.123 * ph0 - 0.631) + c.pi * (0.309 * ph0 - 0.469) + ((1.43 * pat.hb) / 3) * (ph0 - 7.4);
  calibrateXa(so, e0, sidOf(c, ionisedCa(c, ph0)), sidNeed);
  const ab = solvePh(paco2, { sid: sidNeed, albGL: alb, piMmolL: c.pi, hb: pat.hb });
  so.set.ph = albCal === alb ? ph0 : ab.ph; // the K reference is the patient's own resting pH
  return {
    pat, fl, so, ab, phNonOrg: so.set.ph,
    o2: { cao2: 0, do2: 0, vo2: 0, demand: 0, deficit: 0, er: 0, svo2: 0.75 }, muscle: createMuscle(pat.weightKg, profile?.sex === 'F'),
    odc, doses: [], burns: b.burns ?? 0, liver: 1, renal: null,
    co0, ecf0: e0, k1Hz: 0, bledMl: 0,
    out: { na: 0, k: 0, kEcg: 0, cl: 0, iCa: 0, mg: 0, lactate: 0, hb: 0, albGL: 0, albuminGL: 0, ag: 0, osm: 0, cop: 0, hbfRel: 1, bvRel: 1, dkaSeverity: 0 },
  };
}

function effects(bc: BloodCore, t: number): { ins: number; salb: number; sux: number; caMem: number } {
  let ins = 0;
  let salb = 0;
  let sux = 0;
  let caMem = 0;
  for (const d of bc.doses) {
    const tm = (t - d.t0) / 60;
    if (d.id === 'insulinDextrose') ins += insulinEffect(tm);
    else if (d.id === 'salbutamol') salb += salbutamolEffect(tm);
    else if (d.id === 'succinylcholine') sux += suxDeltaK(tm, Math.max(bc.burns, bc.nmUpreg ?? 0));
    else if (d.id === 'calciumChloride' || d.id === 'calciumGluconate') caMem = Math.max(caMem, caMembrane(tm));
  }
  return { ins, salb, sux, caMem };
}

export function stepBloodCore(bc: BloodCore, x: BloodInputs, dtS: number): void {
  const { fl, so, pat } = bc;
  // 1. fluids (water) with bleeding/infusions; solutes follow the volumes
  const c0 = concOf(so, ecfMl(fl), pat.vLacL, bc.ecf0);
  const ecfBefore = ecfMl(fl);
  const rn = bc.renal;
  const r = stepFluids(fl, x.t, dtS, osmEcf(c0) > 0 ? 290 / osmEcf(c0) : 1, rn ? Math.max(0, rn.uopAboveBasalMlH) / 60 : undefined);
  bc.bledMl += r.bledMl;
  if (r.bledPlasmaMl > 0) removePlasma(so, r.bledPlasmaMl, ecfBefore, c0);
  if (rn) {
    // The organ model's urine: each solute at the kidney's own rate (mmol/h)
    const dtH = dtS / 3600;
    so.na = Math.max(0, so.na - rn.excretion.na * dtH);
    so.k = Math.max(0, so.k - rn.excretion.k * dtH);
    so.cl = Math.max(0, so.cl - rn.excretion.cl * dtH);
    so.xa -= rn.excretion.gluconate * dtH;
    if (so.mannitol) so.mannitol = Math.max(0, so.mannitol - (rn.excretion.mannitol ?? 0) * dtH); // The kidney clears it
  } else if (r.elimMl > 0) {
    // eliminated volume leaves as ISOTONIC fluid at the ECF composition (a solute-free loss concentrates Na: the Pulse
    // oracle O3b caught Na +2.0 vs Pulse +0.9 after 1 L saline) [ENG until 7d's urine composition]
    removePlasma(so, r.elimMl, ecfBefore, c0);
  }
  if (!rn && so.mannitol) so.mannitol *= Math.exp((-MANNITOL_KE_PER_MIN * dtS) / 60); // No organ model — the kidney's own t½ 2 h
  for (const g of r.given) addFluid(so, g.ml, g.comp);
  // 2. homeostasis / transcellular shifts
  // With the organ model, hepatic flow = CO/CO0 × the organ model's splanchnic/outflow factor (sympathetic, α-agonist,
  // volatile, CVP/IAP); without the organ model, the (CO/CO0)^HBF_EXP fallback (research/13)
  const coRel = Math.max(0, x.coLpm / bc.co0);
  const hf = (bc as { hbfFactor?: number }).hbfFactor;
  const hbfRel = Math.min(1.5, hf === undefined ? coRel ** HBF_EXP : coRel * hf);
  const ef = effects(bc, x.t);
  const beta = x.kShiftExt ?? SALBUTAMOL_K_SHIFT * ef.salb; // ONE β2/insulin-row source
  const insCurve = x.kShiftExt === undefined ? INSULIN_K_SHIFT * ef.ins : 0; // Drug model present → its insulin PD is the source
  const drug = insCurve + beta + ((bc as { endoKShift?: number }).endoKShift ?? 0); // Endogenous epinephrine β2, secreted insulin, MH K efflux
  // The endocrine model's NET ketone rate — production from the insulin deficit minus its insulin-dependent utilisation
  // of the blood model's pool (which the blood model owns, the instructor's `condition dka` pool included): the
  // acidaemia, the anion gap, `out.dkaSeverity` and the Kussmaul drive emerge from it, and insulin treats it
  const kx = bc as { endoKetoMmolMin?: number; endoKetoUtilPerMin?: number };
  so.keto = Math.max(0, so.keto + (Math.max(0, kx.endoKetoMmolMin ?? 0) - so.keto * Math.max(0, kx.endoKetoUtilPerMin ?? 0)) * (dtS / 60));
  // Q45; the set point follows the total-body K — an external K loss (or gain) is shared by the cells instead of being
  // refilled from an unlimited store: plasma K falls 1 mmol/L per K_TBK_MMOL of total-body deficit (Sterns 1981)
  // E134: ACTIVE muscle (MH, shivering) loses K in proportion to its metabolic activity (muscle.ts; Medbo & Sejersted
  // 1990). It is added to the set point like the hormonal terms but NOT to `drug`, because it is a leak and not a
  // stimulated pump — the pump's gain below follows the β2/insulin terms alone. Necrotic muscle's K is a mass transfer
  // into the pool instead (step 3), not a set-point shift.
  const muscleK = muscleActivityKShift(bc.muscle, x.muscleActivityMlMin ?? 0, pat.vo2Rest);
  const kSet = so.set.k + (so.kIcf + so.k - (so.set.kIcf + so.set.k * (bc.ecf0 / 1000))) / K_TBK_MMOL - 4.0 * (bc.phNonOrg - so.set.ph) + drug + muscleK;
  // Citrate and acetate are metabolised by the liver AND by muscle/kidney (Kramer 2003 Crit Care Med 31:2450), so their
  // clearance follows whole-body flow (CO/CO0), not the splanchnic (CO/CO0)² that lactate's hepatic uptake uses
  const flowRel = Math.min(1.5, Math.max(0, x.coLpm / bc.co0));
  stepSolutes(so, ecfMl(fl), dtS, kSet, flowRel * bc.liver, 1 + K_PUMP_GAIN * Math.abs(drug)); // flow × function, each once
  // 3. oxygen delivery → lactate
  bc.odc.hb = hbOf(fl);
  bc.odc.cohb = cohbWashout(bc.odc.cohb, x.pao2, dtS);
  bc.odc.ph = bc.ab.ph;
  const cao2 = contentDB(x.pao2, x.paco2, x.tempC, bc.odc);
  const d = o2Delivery(x.coLpm, bc.co0, cao2, x.vo2Demand, pat.weightKg, x.demandRel ?? x.vo2Demand / pat.vo2Rest);
  // E134: the deficit's lactate is what GLYCOLYSIS can actually make — the pH (phosphofructokinase) brake, the glycogen
  // store and the surviving muscle mass (muscle.ts). What it cannot make is ATP the cell never gets: that dose is what
  // injures the muscle, and the necrosis hands its potassium to the ECF pool out of the cells (mass-conserving, so the
  // set point above does not move; the single cellular pool then takes part of it back — a conservative deviation,
  // dead fibres cannot).
  const fac = anaerobicFactor(bc.muscle, bc.ab.ph);
  so.lac = stepLactate(so.lac, pat.vLacL, d.deficit * fac, hbfRel, bc.liver, dtS);
  const kRelease = stepMuscle(bc.muscle, {
    ph: bc.ab.ph, tempC: x.tempC, deficitMlMin: d.deficit, factor: fac,
    activityMlMin: x.muscleActivityMlMin ?? 0, restVo2MlMin: pat.vo2Rest, demandMlMin: x.vo2Demand,
  }, dtS);
  if (kRelease > 0) {
    so.k += kRelease;
    so.kIcf = Math.max(0, so.kIcf - kRelease);
  }
  const cv = Math.max(0, cao2 - d.vo2 / Math.max(0.05, x.coLpm));
  bc.o2 = { ...d, cao2, svo2: Math.min(1, cv / Math.max(1, 13.4 * bc.odc.hb * (1 - bc.odc.cohb - bc.odc.methb))) };
  // 4. acid–base (dynamic SID)
  const c = concOf(so, ecfMl(fl), pat.vLacL, bc.ecf0);
  const iCa = ionisedCa(c, bc.ab.ph);
  const chem = { sid: sidOf(c, iCa), albGL: albGL(fl), piMmolL: c.pi, hb: bc.odc.hb };
  bc.ab = solvePh(x.paco2, chem);
  if (x.t >= bc.k1Hz) {
    bc.k1Hz = x.t + 1;
    // pH without the organic (lactate/keto) excess: drives the K shift only for mineral/respiratory acidosis (Q45)
    const org = Math.max(0, c.lactate - NORMAL.lactate) + c.keto;
    bc.phNonOrg = solvePh(x.paco2, { ...chem, sid: chem.sid + org }).ph;
  }
  const k = c.k + ef.sux;
  bc.out = {
    na: c.na, k, kEcg: k - 0.5 * ef.caMem * Math.max(0, k - 5), cl: c.cl, iCa, mg: c.mg, lactate: c.lactate, hb: bc.odc.hb,
    albGL: chem.albGL, albuminGL: chem.albGL, ag: anionGap(c.na, c.cl, bc.ab.hco3), osm: osmEcf(c), cop: copPlasma(fl), hbfRel,
    bvRel: bloodMl(fl) / fl.ref.bv,
    dkaSeverity: Math.min(1, Math.max(0, c.keto / DKA_KETO_MMOL_L)),
  };
}
export type { Conc };
