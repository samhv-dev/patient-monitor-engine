// Stage 7c core step (the part of pipeline.ts that does not touch the engine): fluids → solutes → oxygen/lactate → pH.
import type { PatientProfile } from '../../types.ts';
import { solvePh, anionGap, type AcidBase } from './acid-base.ts';
import { albGL, bloodMl, createFluids, ecfMl, hbOf, stepFluids, copPlasma, type FluidState } from './fluids.ts';
import { contentDB, type OdcCtx } from './odc.ts';
import { o2Delivery, stepLactate, type O2Out } from './oxygen.ts';
import { bloodPatient, HBF_EXP, NORMAL, type BloodPatient } from './params.ts';
import { addFluid, calibrateXa, concOf, createSolutes, ionisedCa, osmEcf, removePlasma, sidOf, stepSolutes, type Conc, type SoluteState } from './solutes.ts';
import { caMembrane, insulinEffect, INSULIN_K_SHIFT, K_PUMP_GAIN, salbutamolEffect, SALBUTAMOL_K_SHIFT, suxDeltaK, type Dose } from './treatments.ts';

export interface BloodInputs {
  t: number;
  coLpm: number;
  paco2: number;
  pao2: number;
  tempC: number;
  vo2Demand: number; // mL/min
  /** VO2 demand ÷ the awake resting VO2 (Stage 3's metabolic factor); default vo2Demand ÷ the profile's 3.5 mL/kg/min. */
  demandRel?: number;
  /**
   * Stage 7g's β2-agonist/insulin/epinephrine K shift (`bus.metabolic.kShift`, mmol/L). Given → it is the ONLY
   * β2/insulin-row shift (7c's own salbutamol curve is off); absent → 7c's own salbutamol curve (fallback, R50 F2).
   * 7c's `insulinDextrose` row carries no 7g PD, so its curve always stays 7c's.
   */
  kShiftExt?: number;
}

/**
 * 7d's kidney (R51 addendum 14: `blood.core.renal = { uopMlH, excretion: { k, na, cl, gluconate } }`, rates per
 * hour). When 7d fills it, urine REPLACES the fixed volume-receptor elimination and its isotonic solute loss; `null`
 * (the default) = the fixed elimination (K_EL_AWAKE, GA ×0.2) until 7d.
 */
export interface RenalSeam {
  uopMlH: number;
  excretion: { k: number; na: number; cl: number; gluconate: number }; // mmol/h (gluconate: Plasma-Lyte's anion, decision 3)
}

/** What other stages read (7g: hbfRel; 7d: hb, albuminGL, bvRel, lactate; 7b: cop). */
export interface BloodOut {
  na: number; k: number; kEcg: number; cl: number; iCa: number; mg: number; lactate: number; hb: number;
  albGL: number; albuminGL: number; // albuminGL = albGL (the name 7d reads)
  ag: number; osm: number; cop: number; hbfRel: number;
  bvRel: number; // blood volume ÷ the profile's (7d)
  dkaSeverity: number; // R51 addendum 16: ketoacid drive 0–1 (keto ÷ DKA_KETO_MMOL_L) that 7c applies; Stage 7e reads it
}

/** Established DKA: ketoacid anions 25 mmol/L at `condition dka` severity 1 [ENG]; the scale of `out.dkaSeverity` (R51 addendum 16). */
export const DKA_KETO_MMOL_L = 25;

export interface BloodCore {
  pat: BloodPatient;
  fl: FluidState;
  so: SoluteState;
  ab: AcidBase;
  phNonOrg: number;
  o2: O2Out;
  odc: OdcCtx;
  doses: Dose[];
  burns: number;
  liver: number; // 7d writes liverFn·tempF (function only, R51 addendum 14); hepatic FLOW is 7c's hbfRel, applied once
  renal: RenalSeam | null; // 7d fills it (null = fixed elimination)
  co0: number; // reference CO (L/min): 7a's resting reference `circ.ref.co` (pipeline), else CI × weight
  ecf0: number;
  k1Hz: number; // next 1 Hz solve time
  out: BloodOut;
}

export function createBloodCore(profile: PatientProfile | undefined, co0: number, paco2: number): BloodCore {
  const pat = bloodPatient(profile);
  const b = profile?.blood ?? {};
  const fl = createFluids(pat, b.albuminGL ?? NORMAL.albGL);
  const e0 = ecfMl(fl);
  const so = createSolutes({ na: b.na ?? NORMAL.na, k: b.k ?? NORMAL.k, cl: b.cl ?? NORMAL.cl, iCa: b.iCa ?? NORMAL.iCa, mg: b.mg ?? NORMAL.mg, lactate: b.lactate ?? NORMAL.lactate }, e0, pat.vLacL, pat.icfMl);
  const odc: OdcCtx = { hb: pat.hb, ph: 7.4, dpgMmolL: b.dpgMmolL ?? NORMAL.dpgMmolL, cohb: b.cohb ?? 0, methb: b.methb ?? 0 };
  // calibrate the unmeasured anions so the profile's HCO3 (default 24.4) holds at PaCO2 40 (tables §5b.1 normal row)
  const hco3 = b.hco3 ?? NORMAL.hco3;
  const ph0 = 6.1 + Math.log10(hco3 / (0.0307 * NORMAL.paco2));
  const c = concOf(so, e0, pat.vLacL, e0);
  const alb = albGL(fl);
  const sidNeed = hco3 + alb * (0.123 * ph0 - 0.631) + c.pi * (0.309 * ph0 - 0.469) + ((1.43 * pat.hb) / 3) * (ph0 - 7.4);
  calibrateXa(so, e0, sidOf(c, ionisedCa(c, ph0)), sidNeed);
  so.set.ph = ph0;
  return {
    pat, fl, so, ab: solvePh(paco2, { sid: sidNeed, albGL: alb, piMmolL: c.pi, hb: pat.hb }), phNonOrg: ph0,
    o2: { cao2: 0, do2: 0, vo2: 0, demand: 0, deficit: 0, er: 0, svo2: 0.75 }, odc, doses: [], burns: b.burns ?? 0, liver: 1, renal: null,
    co0, ecf0: e0, k1Hz: 0,
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
    else if (d.id === 'succinylcholine') sux += suxDeltaK(tm, bc.burns);
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
  const r = stepFluids(fl, x.t, dtS, osmEcf(c0) > 0 ? 290 / osmEcf(c0) : 1, rn ? Math.max(0, rn.uopMlH) / 60 : undefined);
  if (r.bledPlasmaMl > 0) removePlasma(so, r.bledPlasmaMl, ecfBefore, c0);
  if (rn) {
    // 7d's urine: each solute at the kidney's own rate (mmol/h)
    const dtH = dtS / 3600;
    so.na = Math.max(0, so.na - rn.excretion.na * dtH);
    so.k = Math.max(0, so.k - rn.excretion.k * dtH);
    so.cl = Math.max(0, so.cl - rn.excretion.cl * dtH);
    so.xa -= rn.excretion.gluconate * dtH;
  } else if (r.elimMl > 0) {
    // eliminated volume leaves as ISOTONIC fluid at the ECF composition (a solute-free loss concentrates Na: the Pulse
    // oracle O3b caught Na +2.0 vs Pulse +0.9 after 1 L saline) [ENG until 7d's urine composition]
    removePlasma(so, r.elimMl, ecfBefore, c0);
  }
  for (const g of r.given) addFluid(so, g.ml, g.comp);
  // 2. homeostasis / transcellular shifts
  const hbfRel = Math.min(1.5, Math.max(0, x.coLpm / bc.co0) ** HBF_EXP);
  const ef = effects(bc, x.t);
  const beta = x.kShiftExt ?? SALBUTAMOL_K_SHIFT * ef.salb; // ONE β2/insulin-row source (R50 F2)
  const drug = INSULIN_K_SHIFT * ef.ins + beta;
  const kSet = so.set.k - 4.0 * (bc.phNonOrg - so.set.ph) + drug; // Q45
  stepSolutes(so, ecfMl(fl), dtS, kSet, hbfRel * bc.liver, 1 + K_PUMP_GAIN * Math.abs(drug)); // flow × function, each once
  // 3. oxygen delivery → lactate
  bc.odc.hb = hbOf(fl);
  bc.odc.ph = bc.ab.ph;
  const cao2 = contentDB(x.pao2, x.paco2, x.tempC, bc.odc);
  const d = o2Delivery(x.coLpm, bc.co0, cao2, x.vo2Demand, pat.weightKg, x.demandRel ?? x.vo2Demand / pat.vo2Rest);
  so.lac = stepLactate(so.lac, pat.vLacL, d.deficit, hbfRel, bc.liver, dtS);
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
    dkaSeverity: Math.min(1, Math.max(0, c.keto / DKA_KETO_MMOL_L)), // R51 addendum 16
  };
}
export type { Conc };
