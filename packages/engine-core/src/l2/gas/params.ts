// Gas-exchange and respiratory constants scaled to the patient (brief §4.3 "Oxygen truth", §4.4 "Kinetics";
// research 03 §3.5, §4.4, §8.9). Every number cites its source, or [ENG] when the Stage 3 prototype tuned it
// (plan "Prototype results"). R22's profile layer (Stage 7) will replace the age/obesity rules with its table.
import type { PatientProfile } from '../../types.ts';

export const GAS_DT_S = 0.1; // gas exchange at 10 Hz (brief §3.2)
export const PB_MMHG = 760; // barometric pressure (brief §6.8 converts %V at 760) [ENG]
export const PH2O_MMHG = 47; // alveolar water vapour
export const RQ = 0.8; // respiratory quotient (research 03 §3.5)
export const HB_G_DL = 14; // haemoglobin [ENG; anaemia is R22's profile layer]
export const K_CO2 = 0.863; // PaCO2 = 0.863·VCO2/VA (research 03 §4.4)
export const PA_ET_GRADIENT = 3; // Pa − EtCO2, 2–5 mmHg normal (brief §4.4)
export const CMH2O_TO_MMHG = 0.7356;

/**
 * Two-compartment CO2 store (brief §4.4). The brief's C_f 15–20 / C_s 40–45 / k_fs = C_s/5 min give an apnoea
 * rise of 9.5 then 4.8 mmHg/min, outside its own acceptance (12 then 3.4 ± 0.5). Fitted to the apnoea data
 * (PubMed 2516732: +12 in the first minute, then 3.4/min) with C_f 6, C_s 55 mL/mmHg and k_fs 18 mL/min/mmHg at
 * VCO2 200 mL/min, and expressed per mL/min of baseline VCO2 so any body size keeps the anchored rates [ENG]:
 * prototype 12.0 then 3.34 mmHg/min; a +33 % alveolar-ventilation step moves 36 % of the way at 2 min and
 * 90 % at 24.4 min (plan decision 3).
 */
export const CO2_CF_PER_VCO2 = 6 / 200; // (mL/mmHg) per (mL/min)
export const CO2_CS_PER_VCO2 = 55 / 200;
export const CO2_KFS_PER_VCO2 = 18 / 200; // (mL/min/mmHg) per (mL/min)
/** Low-flow compression exponent: EtCO2 ≈ PaCO2·min(1, CO/CO_ref)^0.6 (brief §4.4). */
export const LOW_FLOW_EXP = 0.6;
export const LOW_FLOW_TAU_S = 5; // "falls below 5 mmHg within a few breaths" after arrest [ENG]

export const ANAT_DEAD_SPACE_ML_PER_KG = 2.2; // brief §4.4
/** Y-piece + HME on a ventilator or BVM: 50 mL adult, 1.5 mL/kg below 33 kg (neonatal circuits) [ENG]. */
export function apparatusDeadSpaceMl(weightKg: number): number {
  return Math.min(50, 1.5 * weightKg);
}
export const MASS_FLOW_DEFICIT_ML_MIN = 20; // apnoeic mass flow ≈ VO2 − ~20 mL/min (research 03 §3.5)
export const BLOOD_VENOUS_FRACTION = 0.75; // venous share of blood volume, the O2 buffer [ENG]
export const CO_REF_LPM = 5.25; // Stage 2's SV_REF 70 mL × 75 bpm: CO ratio reference [ENG]
export const CI_LPM_PER_KG = 0.075; // Q for gas exchange = CO ratio × 0.075 L/min/kg × effective weight [ENG]

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adult' | 'elderly';
export function ageBand(ageY: number): AgeBand {
  if (ageY < 28 / 365) return 'neonate';
  if (ageY < 1) return 'infant';
  if (ageY < 12) return 'child';
  return ageY >= 65 ? 'elderly' : 'adult';
}

/** VO2 and CO2 production fall 15–20 % under GA (brief §4.3, research 03 §4.4). */
export const GA_METABOLIC = 0.85;
/** FRC awake supine 30 mL/kg (brief §4.3). */
export const FRC_AWAKE_ML_KG = 30;
/**
 * Research 03 §8.9 (awake VO2 mL/kg/min, blood volume mL/kg) and FRC under GA (mL/kg): adult 20 (brief 20–25)
 * puts the healthy 70 kg adult at 90 % after 8.4 min (Benumof 8 min); children 8: Patel 2–5 y 160 ± 31 s
 * (prototype 158 s) [ENG, tuned].
 */
const BY_AGE: Record<AgeBand, { vo2: number; bv: number; frcGa: number; weight: number; height: number }> = {
  neonate: { vo2: 7, bv: 88, frcGa: 8, weight: 3.5, height: 50 },
  infant: { vo2: 6, bv: 78, frcGa: 8, weight: 7, height: 65 },
  child: { vo2: 5, bv: 72, frcGa: 8, weight: 16, height: 102 },
  adult: { vo2: 3.5, bv: 70, frcGa: 20, weight: 70, height: 175 },
  elderly: { vo2: 3.0, bv: 65, frcGa: 20, weight: 70, height: 170 },
};

export interface GasPatient {
  weightKg: number;
  ibwKg: number;
  /** Adjusted body weight IBW + 0.4·(W − IBW) (obesity) for metabolism and blood volume [ENG]. */
  effKg: number;
  frcMl: number; // awake supine
  frcGaMl: number; // under general anaesthesia
  vo2: number; // awake mL/min at 37 °C (× GA_METABOLIC under GA)
  vco2: number; // awake mL/min = RQ·VO2
  bloodL: number;
  deadSpaceMl: number; // anatomical
  /** CO2 compartments (mL/mmHg) and exchange (mL/min/mmHg). */
  cf: number;
  cs: number;
  kfs: number;
  complianceMl: number; // mL/cmH2O
  resistance: number; // cmH2O/L/s
}

/**
 * Patient scaling from PatientProfile (brief §7.4 patient.ageY/weightKg/heightCm/sex). Ideal body weight by
 * Devine (men 50, women 45.5 kg + 0.91 kg/cm above 152.4 cm). Obesity shrinks FRC by 3.5 % per BMI point above
 * 25, floor 40 %: Benumof's obese 127 kg adult to 90 % in 2.7 min (prototype 2.8 min) [ENG, tuned].
 */
export function gasPatient(p: PatientProfile | undefined): GasPatient {
  const band = ageBand(p?.ageY ?? 40);
  const a = BY_AGE[band];
  const w = p?.weightKg ?? a.weight;
  const h = p?.heightCm ?? a.height;
  const devine = (p?.sex === 'F' ? 45.5 : 50) + 0.91 * (h - 152.4);
  const ibw = band === 'adult' || band === 'elderly' ? Math.max(30, Math.min(w, devine)) : w;
  const eff = ibw + 0.4 * Math.max(0, w - ibw);
  const bmi = w / (h / 100) ** 2;
  const obese = band === 'adult' || band === 'elderly' ? Math.max(0.4, 1 - 0.035 * Math.max(0, bmi - 25)) : 1;
  const vo2 = a.vo2 * eff;
  return {
    weightKg: w, ibwKg: ibw, effKg: eff,
    frcMl: FRC_AWAKE_ML_KG * ibw * obese,
    frcGaMl: a.frcGa * ibw * obese,
    vo2, vco2: RQ * vo2,
    bloodL: (a.bv * eff) / 1000,
    deadSpaceMl: ANAT_DEAD_SPACE_ML_PER_KG * ibw,
    // anchored on the anaesthetised VCO2 (the apnoea data are from anaesthetised patients)
    cf: CO2_CF_PER_VCO2 * RQ * vo2 * GA_METABOLIC, cs: CO2_CS_PER_VCO2 * RQ * vo2 * GA_METABOLIC, kfs: CO2_KFS_PER_VCO2 * RQ * vo2 * GA_METABOLIC,
    complianceMl: 50 * (ibw / 70), // 50 mL/cmH2O intubated adult [ENG]; scales with size
    resistance: band === 'adult' || band === 'elderly' ? 10 : 25, // cmH2O/L/s incl. the tube [ENG]
  };
}

/** VO2/VCO2 temperature factor: −7.5 %/°C below 37 (research 03 §3.5, §4.4: 7–8 %/°C). */
export function tempFactor(tCore: number): number {
  return Math.max(0.3, 1 + 0.075 * (tCore - 37));
}
