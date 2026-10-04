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
/** FU-4 G4 (orchestrator 2026-09-28): the arrest EtCO2 falls over 1–2 min to ≈ 5–10 mmHg, not within seconds — τ 70 s
 * [ENG, fit: 10–20 mmHg at 60 s and 3–10 at 120 s after VF without CPR on the ventilated audit rig; measured 14.5 / 6.6.
 * The plan's first guess τ 40 gave 7.9 / 1.9 — a single exponential needs τ 51–101 s for both bands] (was 5 s). */
export const LOW_FLOW_TAU_S = 70;

export const ANAT_DEAD_SPACE_ML_PER_KG = 2.2; // brief §4.4
/** FU-4 F4 / R1(a): the healthy resting PaCO2 every profile starts from (pregnancy 31 under R10). */
export const PACO2_REST_MMHG = 40;
/**
 * FU-9 F7 (research/22 BF-16b, research/19 C7): a chronic retainer's own resting PaCO2 — tables §1.5 COPD `paco2Set`
 * 40 / 40 / 45 / 55 mmHg at GOLD 1–4 (lung `copd` severity 0.25 / 0.5 / 0.75 / 1, linear between) [TXT]. It is the
 * MODELED drive's set point and the gas compartments' start (as PACO2_REST_MMHG is), and 7c builds the profile's chronic
 * renal compensation on it (blood/pipeline.ts createBloodState).
 */
export const COPD_PACO2_REST: readonly (readonly [number, number])[] = [[0.5, 40], [0.75, 45], [1, 55]];
export function restingPaco2(p: PatientProfile | undefined): number {
  const s = Math.min(1, Math.max(0, p?.lungConditions?.find((c) => c.id === 'copd')?.severity ?? 0));
  const k = COPD_PACO2_REST;
  for (let i = 1; i < k.length; i++) {
    const [x0, y0] = k[i - 1] as readonly [number, number];
    const [x1, y1] = k[i] as readonly [number, number];
    if (s <= x1) return s <= x0 ? PACO2_REST_MMHG : y0 + ((s - x0) / (x1 - x0)) * (y1 - y0);
  }
  return (k[k.length - 1] as readonly [number, number])[1];
}
/** Y-piece + HME on a ventilator or BVM: 50 mL adult [ENG]. */
export const APPARATUS_ADULT_ML = 50;
/**
 * FU-4 F4 / R1(c)(ii): below 33 kg the circuit is a PAEDIATRIC one — low-dead-space connectors and a paediatric/infant
 * HME (manufacturers' stated internal volumes ≈ 1–3 mL infant, ≈ 6–10 mL paediatric [TXT: device IFUs]), so the
 * apparatus scales ≈ 0.5 mL/kg [ENG]. Before this the adult rule's 1.5 mL/kg put 24 mL against a 4 y child's 112 mL
 * breath (a third of it) and the child sat at PaCO2 62–76 on 7 mL/kg.
 */
export const APPARATUS_PAED_ML_PER_KG = 0.5;
export const PAED_CIRCUIT_BELOW_KG = 33;
export function apparatusDeadSpaceMl(weightKg: number): number {
  return weightKg < PAED_CIRCUIT_BELOW_KG ? APPARATUS_PAED_ML_PER_KG * weightKg : APPARATUS_ADULT_ML;
}
/**
 * FU-4 F4 / R1(c)(i): the ventilator's DEFAULT pattern for this patient (used when a `ventilation` command gives no
 * rr/vtMl): lung-protective 7 mL/kg IBW (ARDSNet-era practice for every ventilated patient, 6–8 mL/kg PBW [TXT]) and
 * an age-band rate chosen for normocapnia with the one physical dead space [ENG, fit: PaCO2 35–45 at 30 min, MODELED].
 * Before this every patient, whatever their size, got the adult 12 × 500.
 */
export const VENT_VT_ML_PER_KG_IBW = 7;
export const VENT_RR_BY_AGE: Record<AgeBand, number> = { neonate: 24, infant: 20, child: 17, adult: 12, elderly: 11 };
export function ventDefaults(pat: Pick<GasPatient, 'ibwKg'>, ageY: number): { rr: number; vt: number } {
  return { rr: VENT_RR_BY_AGE[ageBand(ageY)], vt: Math.round(VENT_VT_ML_PER_KG_IBW * pat.ibwKg) };
}
/**
 * FU-4 F4 / R1(b): an ETT or SGA BYPASSES the extrathoracic airway, so the apparatus does not simply add to the
 * anatomical dead space — it REPLACES the part of it the tube bypasses. Of the 2.2 mL/kg IBW anatomical dead space,
 * about 1.0–1.2 mL/kg IBW is extrathoracic (mouth, pharynx, larynx: Nunn's Applied Respiratory Physiology ch. 8) [TXT];
 * an intubated patient loses that and gains the device's internal volume plus the Y-piece and HME.
 * Before this, intubation ADDED 50 mL with no credit for the bypassed upper airway (man 265 mL, woman 329, 4 y child 459
 * with the MANUAL fit — respiratory audit R1).
 */
export const ETT_BYPASS_ML_PER_KG = 1.1;
/** Floor of the anatomical share left behind an artificial airway (fraction of the anatomical value) [ENG]. */
export const ETT_BYPASS_FLOOR_FRAC = 0.3;
/**
 * FU-4 (orchestrator ruling from the FU-6 review, 2026-09-28): THE physical series dead space (mL) for this patient and
 * airway — anatomical 2.2 mL/kg IBW, minus the extrathoracic share an artificial airway bypasses
 * (ETT_BYPASS_ML_PER_KG × IBW, floored at 30 % of the anatomical value), plus the airway device's apparatus volume.
 * CONTRACT: never the MANUAL EtCO2 fit (`co2.vdExtraMl`), never alveolar dead space (7b's V/Q mixing owns that). Every
 * engine consumer that needs a series dead space uses THIS function — gas exchange (`resp/pipeline.ts` `deadSpace()` =
 * this + the MANUAL fit), the capnogram's phase-I washout and the console's "Dead space" label (via the lung-state
 * event) — so no stage computes its own (FU-6 had measured 204 mL against FU-4's 127 mL for the same 70 kg rig).
 */
export function physicalDeadSpace(pat: Pick<GasPatient, 'deadSpaceMl' | 'ibwKg' | 'weightKg'>, artificialAirway: boolean): number {
  if (!artificialAirway) return pat.deadSpaceMl;
  const anat = Math.max(ETT_BYPASS_FLOOR_FRAC * pat.deadSpaceMl, pat.deadSpaceMl - ETT_BYPASS_ML_PER_KG * pat.ibwKg);
  return anat + apparatusDeadSpaceMl(pat.weightKg);
}
export const MASS_FLOW_DEFICIT_ML_MIN = 20; // apnoeic mass flow ≈ VO2 − ~20 mL/min (research 03 §3.5)
export const BLOOD_VENOUS_FRACTION = 0.75; // venous share of blood volume, the O2 buffer [ENG]
export const CO_REF_LPM = 5.25; // Stage 2's SV_REF 70 mL × 75 bpm: CO ratio reference [ENG]
export const CI_LPM_PER_KG = 0.075; // Q for gas exchange = CO ratio × 0.075 L/min/kg × effective weight [ENG]
/**
 * Stage V.1 (E-V1-1): the CO-ratio reference is the PATIENT's own resting flow, CI_LPM_PER_KG × effective weight
 * (= CO_REF_LPM 5.25 at 70 kg). Dividing a 16 kg child's 1.3 L/min by the adult 5.25 read as a low-flow state.
 */
export function coRefLpm(p: { effKg: number }): number {
  return CI_LPM_PER_KG * p.effKg;
}

export type AgeBand = 'neonate' | 'infant' | 'child' | 'adult' | 'elderly';
export function ageBand(ageY: number): AgeBand {
  if (ageY < 28 / 365) return 'neonate';
  if (ageY < 1) return 'infant';
  if (ageY < 12) return 'child';
  return ageY >= 65 ? 'elderly' : 'adult';
}

/** VO2 and CO2 production fall 15–20 % under GA (brief §4.3, research 03 §4.4). */
export const GA_METABOLIC = 0.85;
/**
 * FU-6 R10: term pregnancy — progesterone lowers the chemoreflex set point to PaCO2 28–32 (≈ −9 mmHg) and VO2 rises
 * 20–33 % (Hegewald & Crapo 2011 Clin Chest Med 32:1; McClelland, Bogod & Hardman 2009 Anaesthesia 64:371). Both scale
 * with the `pregnancy` lung condition's severity (0.33 / 0.67 / 1 by trimester) [TXT sizes at term; linear ENG].
 */
export const PREG_PACO2_SHIFT_MMHG = 9;
export const PREG_VO2_TERM = 0.2;
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

/** Stage 7k (E-7k-3): the stature gasPatient assumes when the profile gives none (cm) — the 7k predicted volumes use the same. */
export function defaultHeightCm(ageY = 40): number {
  return BY_AGE[ageBand(ageY)].height;
}

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
  /**
   * FU-4 F4 / R1(a): the patient's OWN resting arterial CO2 (mmHg). In MODELED this is the drive's set point and the
   * gas compartments' starting point, instead of a value back-calculated from L1's adult EtCO2 default of 36 plus a
   * gradient — which made every MODELED patient, whatever their size, sit at an adult's displayed EtCO2.
   */
  paco2Rest: number;
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
    paco2Rest: restingPaco2(p), // FU-4 F4 / R1(a) (pregnancy 31 when R10 lands); FU-9 F7: a COPD retainer's own set point
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
