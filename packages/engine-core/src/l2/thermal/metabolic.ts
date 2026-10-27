// Metabolic scaling and the hypothermia/hyperthermia cascade (tables §5c, §5.3 `q10`, `clearTemp`, `macFactor`;
// ICAR 2016 stages [P]). Pure functions of the thermal state; consumers read them through EndoOut (core.ts):
//   VO2/VCO2: the gas model's tempFactor (7.5 %/°C ≈ Q10 2, gas/params.ts) stays the temperature term; this module adds
//   shivering (heat ∝ VO2: shiverW/m0) and THE one MH rate (E131):
//   M_mh = a(t)·(peak VO2 multiple − 1)·VO2rest   (mL O2/min; a = mh.ts activity, dantrolene suppresses it; E134: the
//   multiple is the MH state's own — the scenario's phenotype, MH_PHENOTYPE, default MH_VO2_PEAK_X 2.5)
//   VO2 demand = basal + M_mh; MH CO2 = M_mh achieved·MH_RQ (+ the buffered lactate's CO2, blood/pipeline.ts);
//   MH heat = M_mh achieved·Weir(MH_RQ) (heat.ts); lactate from the unmet part (blood/oxygen.ts). "Achieved" = × the
//   blood model's delivered share o2Frac. Heat Q10 is NOT applied to the basal heat balance (it moved the heat model's
//   plateau out of its band).
import { mhActivity, mhVo2PeakX } from './mh.ts';
import { KJ_PER_KCAL, WEIR_KCAL_PER_L_CO2, WEIR_KCAL_PER_L_O2 } from './params.ts';
import type { ThermalState } from './heat.ts';

export interface ThermalMetabolic {
  shiverF: number; // × on VO2 beyond the tempFactor and GA factor (shivering)
  mhX: number; // E131: the MH muscle's O2 demand in units of the resting VO2, a·(MH_VO2_PEAK_X − 1) — ADDED to the factor
  mhActivity: number;
}

export function thermalMetabolic(st: ThermalState, t: number): ThermalMetabolic {
  const a = mhActivity(st.mh, t);
  const shiver = st.m0 > 0 ? st.out.shiverW / st.m0 : 0;
  return { shiverF: 1 + shiver, mhX: a * (mhVo2PeakX(st.mh) - 1), mhActivity: a }; // E134: the peak multiple is the state's (the phenotype)
}

/** E131 — THE one MH rate: the hypermetabolic skeletal muscle's O2 demand, mL/min, for a resting VO2 `vo2Rest` (mL/min). */
export function mhO2Demand(st: ThermalState, t: number, vo2Rest: number): number {
  return thermalMetabolic(st, t).mhX * vo2Rest;
}

/** The caloric equivalent of oxygen at respiratory quotient `rq`, kJ per L O2 (= J per mL; Weir 1949). */
export function oxyKjPerL(rq: number): number {
  return KJ_PER_KCAL * (WEIR_KCAL_PER_L_O2 + WEIR_KCAL_PER_L_CO2 * rq);
}

export interface Cascade {
  hrF: number; // fever +8–10 bpm/°C above 37.5; hypothermic bradycardia below 35 [TXT]
  clearanceF: number; // Drug clearance × (tables clearTemp −10 %/°C below 37) → the drug model
  macF: number; // MAC × (tables −5 %/°C) → the neuro model
  coagF: number; // coagulation function placeholder (< 35 °C: −10 %/°C) → the blood model
  stage: 0 | 1 | 2 | 3 | 4; // 0 normothermic, 1 mild 35–32, 2 moderate 32–28, 3 severe < 28, 4 hyperthermic > 40
  shiverLevel: number; // 0–1 ECG/pleth shivering artefact level (`artefact.shiver`)
}

/**
 * HR × from core temperature: fever +12 %/°C above 37.5 (tables §5c "HR +8–10 /°C" = +11–13 % at 75 bpm) and
 * hypothermic bradycardia below 35 °C [TXT]. Not a β effect: drug β-blockade does not blunt it.
 */
export function tempHrF(t: number): number {
  return t > 37.5 ? 1 + 0.12 * (t - 37.5) : t < 35 ? Math.max(0.4, 1 - 0.07 * (35 - t)) : 1;
}

export function cascade(st: ThermalState): Cascade {
  const t = st.tc;
  const hrF = tempHrF(t);
  const stage = t > 40 ? 4 : t < 28 ? 3 : t < 32 ? 2 : t < 35 ? 1 : 0;
  return {
    hrF,
    clearanceF: Math.min(1.2, Math.max(0.3, 1 - 0.1 * (37 - t))),
    macF: Math.min(1.2, Math.max(0.3, 1 - 0.05 * (37 - t))),
    coagF: t < 35 ? Math.max(0.3, 1 - 0.1 * (35 - t)) : 1,
    stage,
    shiverLevel: st.m0 > 0 ? Math.min(1, st.out.shiverW / (2 * st.m0)) : 0,
  };
}
