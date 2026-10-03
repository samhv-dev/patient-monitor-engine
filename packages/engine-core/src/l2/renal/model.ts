// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/physiology/
// RenalModel.cpp (bladder 1549, furosemide TubularPermeabilityChange 1996–1997), Copyright 2018-2025 Kitware, Inc. and
// Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied Research Associates, Inc.; licensed under the
// Apache License, Version 2.0; modified: re-expressed in TypeScript for a 1 Hz algebraic kidney (NOTICES N-P19).
//
// RenalModel (Stage 7d, tables §5.2): the algebraic kidney (kidney.ts) + tubular output → UOP, bladder/urometer,
// cumulative volume, KDIGO-style oliguria/AKI state and the excretion hooks for 7c. Plain JSON-safe state.
import { angiotensin, effFactor, natriuresis, renalHaemo, tgfTarget } from './kidney.ts';
import {
  AKI_KF_LOSS, ALBUMIN0_G_L, ANG_TAU_S, BLADDER_CAP_ML, FUROSEMIDE_EC50_REF, FUROSEMIDE_ED50_MG, FUROSEMIDE_EMAX, FUROSEMIDE_KA_PER_MIN, FUROSEMIDE_KE_PER_MIN,
  EABV_EXP, EABV_TAU_S, MANNITOL_KE_PER_MIN, P_BOWMAN, RENAL_REF_CO_L_KG, RENAL_REF_CVP, RENAL_REF_MAP, MANNITOL_ML_PER_G, NE_EXCESS_PER_01, NH_TAU_OFF_S, NH_TAU_ON_S, OLIGURIA_ML_KG_H, PEEP_PER_10, R_AFF, RENAL_FLOW_FRAC, S_GA,
  SEPSIS_GFR_LOSS, TGF_TAU_S, UOP0_ML_KG_H, V_AT_15, V_AT_30, V_EXP_GAIN, V_EXP_MAX,
} from './params.ts';

export interface RenalInputs {
  map: number; // mmHg (renal arterial ≈ aortic mean)
  cvp: number; // mmHg
  iap: number; // intra-abdominal pressure, mmHg (tables `iap` 5)
  coLpm: number; // cardiac output, L/min
  bvRel: number; // blood volume ÷ the profile's (1 = normovolaemic)
  albuminGL: number;
  anaesthesia: 'none' | 'general' | 'neuraxial';
  pawExcessCmH2O: number; // mean airway pressure above 10 cmH2O (0 when not ventilated)
  alphaExcess: number; // α-agonist µg/kg/min above what the MAP needs (7g/7a; 0 until then)
  sepsis: number; // 0–1 (7e's sepsis stage, organs/inputs.ts)
  /** 7g's furosemide effect-site level in reference doses (1 = the peak of 20 mg); absent → the model's own depot (no 7g). */
  furoCe?: number;
  /** FU-9 H1: the whole-body O2 demand ÷ rest (Stage 3's metabolic factor; GA 0.85, cold lower); absent → 1. */
  demandRel?: number;
  /** FU-9 H2: haematocrit (7c's Hb × 3/100) for the renal plasma flow; absent → HCT_REF. */
  hct?: number;
}
export interface RenalParams { k: number; pRef: number; ef0: number; weightKg: number; gfrSet: number; aki: number; co0: number }
export interface RenalState {
  t: number;
  p: RenalParams;
  rAff: number;
  furoDepot: number; furoE: number; // mg in the depot; effect 0–1 (Bateman through an effect compartment)
  furoPlasma: number;
  vNh: number; // neurohumoral (ADH/aldosterone) volume factor: follows volumeFactor(eabv) with a fast onset, slow washout
  eabvLp?: number; // FU-9 H1: the effective volume low-passed symmetrically (τ EABV_TAU_S) before the neurohumoral lag
  mannitolG: number; // g in plasma
  rbf: number; pgc: number; gfr: number; uopMlMin: number; ang: number;
  cumMl: number; bladderMl: number; bagMl: number; catheter: 'foley' | 'none';
  bins: number[]; // urine per 10 min, newest last, 24 h (144 bins)
  binAcc: number; binT: number;
  oliguriaS: number; // time the rolling 1 h UOP has been < 0.5 mL/kg/h
  akiStage: 0 | 1 | 2 | 3;
  timeScale: number; // KDIGO windows ÷ timeScale (teaching compression, Q40; 1 = real time)
}

/** Volume factor V (tables §5.2): 1 at normovolaemia, 0.5 at −15 %, 0.2 at −30 %, floor 0.1. */
export function volumeFactor(bvRel: number): number {
  const loss = 1 - bvRel;
  if (loss <= 0) return 1;
  if (loss <= 0.15) return 1 - ((1 - V_AT_15) * loss) / 0.15;
  return Math.max(0.1, V_AT_15 - ((V_AT_15 - V_AT_30) * (loss - 0.15)) / 0.15);
}

/**
 * FU-9 F1: the expanded circulation is excreted. Atrial stretch (ANP) and ADH suppression raise the excreted fraction
 * with the blood volume ABOVE the profile's (tables §5.2's V covers only depletion): × (1 + V_EXP_GAIN·(bvRel − 1)⁺),
 * capped at V_EXP_MAX. It multiplies the same chain as V, so general anaesthesia (S_GA, lower CO → vNh) and a
 * depleted patient (vNh < 1) retain more — Hahn's context-sensitive volume kinetics (Hahn 2010 Anesthesiology
 * 113:470; Norberg 2007 Anesthesiology 107:24; Drobin & Hahn 1999 Anesthesiology 90:81). 1 at and below normovolaemia.
 */
export function expansionFactor(bvRel: number): number {
  return Math.min(V_EXP_MAX, 1 + V_EXP_GAIN * Math.max(0, bvRel - 1));
}

/** Effective arterial blood volume (0–1+) [ENG]: the smaller of the blood volume and (CO/CO0)^0.75 — a low-output state
 *  activates the same volume receptors as bleeding (tables §7 check 20: HFrEF oliguria at normal blood volume). The
 *  volume factor V acts through `vNh`, which follows V(eabv) with onset τ 2 min and washout τ 45 min (NH_TAU_*).
 *  FU-9 H1 (research/13): the output is referenced to the body's DEMAND (CO0 × demandRel) — general anaesthesia,
 *  hypothermia and sedation lower demand and output together and stay "full" (tables §5.2: intra-operative UOP 0.5–1
 *  with S the only GA term), while HFrEF (a low CO at a normal demand) and haemorrhage (bvRel) are unchanged. */
export function eabv(inp: RenalInputs, co0: number): number {
  return Math.min(inp.bvRel, (Math.max(0, inp.coLpm) / Math.max(0.1, co0 * Math.max(0.3, inp.demandRel ?? 1))) ** EABV_EXP);
}

function pv(inp: RenalInputs): number {
  return Math.max(inp.cvp, inp.iap);
}

/**
 * The kidney is calibrated on the HEALTHY reference (MAP 93, CVP 5, CO 0.08 L/min/kg: tables `UOP0` 1.0 mL/kg/h, RBF
 * 17 % of CO), never on the start state — a profile that starts in shock or HFrEF must start oliguric, not "normal"
 * (a start GFR of 0 also made the set point 0 and UOP NaN) — and then SETTLED at the start inputs (TGF, angiotensin
 * and the neurohumoral factor at their steady state).
 */
export function createRenal(inp: RenalInputs, weightKg: number, aki = 0): RenalState {
  const co0 = RENAL_REF_CO_L_KG * weightKg;
  const rbf0 = RENAL_FLOW_FRAC * co0 * 1000;
  const k0 = renalHaemo(RENAL_REF_MAP, RENAL_REF_CVP, 1, R_AFF, 1, 1, ALBUMIN0_G_L).rbf / rbf0; // Pulse's TuneCircuit idea
  const h0 = renalHaemo(RENAL_REF_MAP, RENAL_REF_CVP, k0, R_AFF, 1, 1, ALBUMIN0_G_L);
  const ef0 = (UOP0_ML_KG_H * weightKg) / 60 / h0.gfr;
  const s: RenalState = {
    t: 0, p: { k: k0, pRef: RENAL_REF_MAP, ef0, weightKg, gfrSet: h0.gfr, aki, co0: Math.max(co0, inp.coLpm) }, rAff: R_AFF, furoDepot: 0, furoE: 0, furoPlasma: 0, mannitolG: 0,
    vNh: 1, rbf: h0.rbf, pgc: h0.pgc, gfr: h0.gfr, uopMlMin: 0, ang: 0, cumMl: 0, bladderMl: 0, bagMl: 0, catheter: 'foley',
    bins: [], binAcc: 0, binT: 0, oliguriaS: 0, akiStage: 0, timeScale: 1,
  };
  // settle at the start inputs: controllers at their targets
  const pvn = pv(inp);
  const ev = eabv(inp, s.p.co0);
  s.eabvLp = ev;
  s.ang = angiotensin(inp.map - pvn, ev);
  s.vNh = volumeFactor(ev);
  const kfF = (1 - SEPSIS_GFR_LOSS * inp.sepsis) * (1 - AKI_KF_LOSS * aki);
  const pb = Math.max(P_BOWMAN, inp.iap);
  s.rAff = tgfTarget(inp.map, pvn, k0, effFactor(s.ang), kfF, inp.albuminGL, s.p.gfrSet, pb, inp.hct);
  const h = renalHaemo(inp.map, pvn, k0, s.rAff, effFactor(s.ang), kfF, inp.albuminGL, pb, inp.hct);
  s.rbf = h.rbf;
  s.pgc = h.pgc;
  s.gfr = h.gfr;
  s.uopMlMin = tubularOutput(s, inp);
  return s;
}

function tubularOutput(s: RenalState, inp: RenalInputs): number {
  const stress = inp.anaesthesia === 'general' ? S_GA : 1;
  const peep = PEEP_PER_10 ** (Math.max(0, inp.pawExcessCmH2O) / 10);
  const ne = NE_EXCESS_PER_01 ** (Math.max(0, inp.alphaExcess) / 0.1);
  // FU-9 H4 (research/13): pressure natriuresis reads the renal PERFUSION pressure, MAP − max(CVP, IAP) (tables §5.2 U(RPP)),
  // referred to the reference CVP so the awake UOP–MAP curve at CVP 5 is unchanged: venous congestion and intra-abdominal
  // pressure now lower the urine (WSACS: oliguria from IAP 15)
  const fe = s.p.ef0 * natriuresis(inp.map - pv(inp) + RENAL_REF_CVP, s.p.pRef) * stress * s.vNh * expansionFactor(inp.bvRel) * peep * ne * (1 + FUROSEMIDE_EMAX * s.furoE);
  const mannitol = MANNITOL_ML_PER_G * MANNITOL_KE_PER_MIN * s.mannitolG * Math.min(1, s.gfr / Math.max(1, s.p.gfrSet));
  return Math.min(0.25 * s.gfr, s.gfr * fe) + mannitol;
}

/** Rolling urine output over the last `minutes` (≤ 1440), mL/kg/h. */
export function uopOver(s: RenalState, minutes: number): number {
  const n = Math.max(1, Math.round(minutes / 10));
  const bins = s.bins.slice(-n);
  if (bins.length === 0) return (s.uopMlMin * 60) / s.p.weightKg;
  const mins = bins.length * 10;
  return (bins.reduce((a, b) => a + b, 0) / mins) * (60 / s.p.weightKg);
}

export function stepRenal(s: RenalState, inp: RenalInputs, dt: number): void {
  s.t += dt;
  const pvn = pv(inp);
  const rpp = inp.map - pvn;
  // FU-9 H1: low-pass the effective volume symmetrically first, so a CO that swings ±5 % breath to breath under PPV is
  // not rectified downwards by the fast-onset / slow-washout neurohumoral lag
  s.eabvLp = (s.eabvLp ?? eabv(inp, s.p.co0)) + (eabv(inp, s.p.co0) - (s.eabvLp ?? eabv(inp, s.p.co0))) * (1 - Math.exp(-dt / EABV_TAU_S));
  const ev = s.eabvLp;
  s.ang += (angiotensin(rpp, ev) - s.ang) * (1 - Math.exp(-dt / ANG_TAU_S)); // AngII acts over minutes
  const vT = volumeFactor(ev);
  s.vNh += (vT - s.vNh) * (1 - Math.exp(-dt / (vT < s.vNh ? NH_TAU_ON_S : NH_TAU_OFF_S)));
  const effF = effFactor(s.ang);
  const kfF = (1 - SEPSIS_GFR_LOSS * inp.sepsis) * (1 - AKI_KF_LOSS * s.p.aki);
  const pb = Math.max(P_BOWMAN, inp.iap);
  const target = tgfTarget(inp.map, pvn, s.p.k, effF, kfF, inp.albuminGL, s.p.gfrSet, pb, inp.hct);
  s.rAff += (target - s.rAff) * (1 - Math.exp(-dt / TGF_TAU_S));
  const h = renalHaemo(inp.map, pvn, s.p.k, s.rAff, effF, kfF, inp.albuminGL, pb, inp.hct);
  s.rbf = h.rbf;
  s.pgc = h.pgc;
  s.gfr = h.gfr;
  // furosemide: depot → plasma (ka) → elimination (ke); effect E = Cp/(Cp + ED50-equivalent)
  const m = dt / 60;
  const moved = s.furoDepot * (1 - Math.exp(-FUROSEMIDE_KA_PER_MIN * m));
  s.furoDepot -= moved;
  s.furoPlasma = s.furoPlasma * Math.exp(-FUROSEMIDE_KE_PER_MIN * m) + moved;
  s.furoE = inp.furoCe !== undefined ? inp.furoCe / (inp.furoCe + FUROSEMIDE_EC50_REF) : s.furoPlasma / (s.furoPlasma + FUROSEMIDE_ED50_MG);
  s.mannitolG *= Math.exp(-MANNITOL_KE_PER_MIN * m * Math.min(1, s.gfr / Math.max(1, s.p.gfrSet)));
  s.uopMlMin = tubularOutput(s, inp);
  const ml = s.uopMlMin * m;
  s.cumMl += ml;
  if (s.catheter === 'foley') s.bagMl += ml;
  else {
    s.bladderMl += ml;
    if (s.bladderMl >= BLADDER_CAP_ML) s.bladderMl = 0; // auto-void (Pulse)
  }
  s.binAcc += ml;
  s.binT += dt;
  if (s.binT >= 600 - 1e-9) {
    s.bins.push(s.binAcc);
    if (s.bins.length > 144) s.bins.shift();
    s.binAcc = 0;
    s.binT = 0;
  }
  // KDIGO UOP criteria on real (or teaching-compressed) windows (tables alarm row; Q40)
  const hourly = s.bins.length >= Math.max(1, Math.round(6 / s.timeScale)) ? uopOver(s, 60 / s.timeScale) : (s.uopMlMin * 60) / s.p.weightKg;
  s.oliguriaS = hourly < OLIGURIA_ML_KG_H ? s.oliguriaS + dt : 0;
  const hrs = (s.oliguriaS / 3600) * s.timeScale;
  const stage = hrs >= 24 || (hrs >= 12 && hourly < 0.05) ? 3 : hrs >= 12 ? 2 : hrs >= 6 ? 1 : 0;
  if (stage > s.akiStage) s.akiStage = stage;
}

export function giveFurosemide(s: RenalState, mg: number): void {
  s.furoDepot += mg;
}
export function giveMannitolRenal(s: RenalState, g: number): void {
  s.mannitolG += g;
}
