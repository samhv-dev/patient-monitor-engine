// Oxygen truth (brief §4.3 "Oxygen truth"; research 03 §3.5): alveolar O2 store (FRC·F_AO2), pulmonary
// capillary equilibrium, shunt mixing, a mixed-venous blood buffer, apnoeic mass flow, and the Severinghaus
// dissociation curve with a virtual-PO2 shift for temperature and PCO2. Plain data; stepped at 10 Hz.
import { BLOOD_VENOUS_FRACTION, HB_G_DL, MASS_FLOW_DEFICIT_ML_MIN, PB_MMHG, PH2O_MMHG, RQ } from './params.ts';
import { contentDB, satDB, type OdcCtx } from '../blood/odc.ts'; // Stage 7c

const PI_DRY = PB_MMHG - PH2O_MMHG; // 713 mmHg
/** Stage 7c: the ODC context when no blood state is present (Stage 3's patient: Hb 14, pH 7.40, no dyshaemoglobin). */
export const ODC_STAGE3: OdcCtx = { hb: HB_G_DL, ph: 7.4, dpgMmolL: 4.65, cohb: 0, methb: 0 };

/**
 * Severinghaus 1979 (research 03 §3.5, §11 #13 confirmed): SO2 = 1/(23400/(P³ + 150·P) + 1). Shifted through a
 * virtual PO2 = PO2·10^(0.024·(37 − T) + 0.06·log10(40/PCO2)) — Kelman 1966 coefficients, still unverified
 * (research 03 §11 #14); pH is not modelled in v1.
 */
export function odc(po2: number, tempC = 37, pco2 = 40, ctx: OdcCtx = ODC_STAGE3): number {
  return satDB(po2, pco2, tempC, ctx); // Stage 7c: Dash–Bassingthwaighte (N-P09) replaces Severinghaus/Kelman
}

/** O2 content, mL/L: 1.34·Hb·SO2 + 0.003·PO2 per dL (brief §4.3). */
export function content(po2: number, tempC = 37, pco2 = 40, ctx: OdcCtx = ODC_STAGE3): number {
  return contentDB(po2, pco2, tempC, ctx); // Stage 7c: 13.4·Hb·S·(1 − COHb − MetHb) + 0.03·PO2
}

/** PO2 whose content is `c` (bisection; content is monotonic in PO2). */
export function po2ForContent(c: number, tempC = 37, pco2 = 40, ctx: OdcCtx = ODC_STAGE3): number { // Stage 7c: ctx
  let lo = 0;
  let hi = 800;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (content(mid, tempC, pco2, ctx) < c) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface O2Inputs {
  vaLpm: number; // alveolar ventilation reaching gas-exchanging alveoli (L/min BTPS)
  fio2: number; // O2 fraction of that gas
  /** O2 fraction of the gas at a patent airway during apnoea (mass flow), or null (obstructed / no airway). */
  massFlowFio2: number | null;
  qLpm: number; // pulmonary blood flow for gas exchange (L/min)
  vo2: number; // mL/min
  shunt: number; // Qs/Qt
  paco2: number;
  tempC: number;
  frcMl: number;
  bloodL: number;
  /** Stage 7c: Hb, pH, DPG, COHb, MetHb from the blood (absent → ODC_STAGE3). */
  odc?: OdcCtx;
}

export interface O2State {
  fa: number; // alveolar O2 fraction (dry)
  cv: number; // mixed-venous O2 content, mL/L
  sa: number; // pulmonary-arterial SaO2 (0–1) after shunt mixing
  pao2: number;
}

/** Steady state for given inputs and shunt, or null when there is no ventilation to reach one. */
export function o2Steady(x: O2Inputs, shunt: number): O2State | null {
  if (x.vaLpm < 0.3) return null;
  const faco2 = x.paco2 / PI_DRY;
  const fa = Math.max(0.01, x.fio2 - (1 / RQ - 1) * faco2 - x.vo2 / (x.vaLpm * 1000));
  const k = x.odc ?? ODC_STAGE3; // Stage 7c
  const cc = content(fa * PI_DRY, x.tempC, x.paco2, k);
  const d = x.vo2 / Math.max(0.3, x.qLpm);
  const s = Math.min(0.95, Math.max(0, shunt));
  const ca = cc - (s * d) / (1 - s);
  const pao2 = po2ForContent(ca, x.tempC, x.paco2, k);
  return { fa, cv: ca - d, sa: odc(pao2, x.tempC, x.paco2, k), pao2 };
}

/**
 * MANUAL calibration (plan decision 2): the shunt that makes the steady-state SaO2 equal `targetSa` (0–1) at the
 * current FiO2, ventilation and flow. Clamped to [0, 0.6]; a target the clamp cannot reach sets the override flag.
 */
export function solveShunt(x: O2Inputs, targetSa: number): number {
  let lo = 0;
  let hi = 0.6;
  const at = (s: number) => o2Steady(x, s)?.sa ?? 0;
  if (at(lo) <= targetSa) return lo;
  if (at(hi) >= targetSa) return hi;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) > targetSa) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function createO2State(x: O2Inputs): O2State {
  return o2Steady(x, x.shunt) ?? { fa: 0.14, cv: 140, sa: 0.97, pao2: 95 };
}

/**
 * One Euler step of dtS seconds. Lung: V·dF/dt = VA·(FiO2 − F − (1/RQ − 1)·FACO2) − uptake while ventilated;
 * in apnoea V·dF/dt = −uptake·(1 − F) + Q_mf·(F_airway − F), Q_mf = uptake − 20 mL/min when the airway is patent
 * (research 03 §3.5). Blood: V_v·dCv/dt = Q·(Ca − Cv) − VO2. Uptake = Q·(1 − s)·(Cc′ − Cv).
 */
export function stepO2(st: O2State, x: O2Inputs, dtS: number): void {
  const dt = dtS / 60;
  const s = Math.min(0.95, Math.max(0, x.shunt));
  const k = x.odc ?? ODC_STAGE3; // Stage 7c
  const cc = content(st.fa * PI_DRY, x.tempC, x.paco2, k);
  const ca = (1 - s) * cc + s * st.cv;
  const uptake = x.qLpm * (1 - s) * (cc - st.cv);
  let dF: number;
  if (x.vaLpm > 0) {
    dF = x.vaLpm * 1000 * (x.fio2 - st.fa - (1 / RQ - 1) * (x.paco2 / PI_DRY)) - uptake;
  } else {
    dF = -uptake * (1 - st.fa);
    if (x.massFlowFio2 !== null) dF += Math.max(0, uptake - MASS_FLOW_DEFICIT_ML_MIN) * (x.massFlowFio2 - st.fa);
  }
  st.fa = Math.min(1, Math.max(0.001, st.fa + (dF / x.frcMl) * dt));
  const vv = BLOOD_VENOUS_FRACTION * x.bloodL;
  st.cv = Math.max(0, st.cv + ((x.qLpm * (ca - st.cv) - x.vo2) / vv) * dt);
  const caNew = (1 - s) * content(st.fa * PI_DRY, x.tempC, x.paco2, k) + s * st.cv;
  st.pao2 = po2ForContent(caNew, x.tempC, x.paco2, k);
  st.sa = odc(st.pao2, x.tempC, x.paco2, k);
}
