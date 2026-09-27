// Metabolic scaling and the hypothermia/hyperthermia cascade (tables §5c, §5.3 `q10`, `clearTemp`, `macFactor`;
// ICAR 2016 stages [P]). Pure functions of the thermal state; consumers read them through EndoOut (core.ts):
//   VO2/VCO2: Stage 3's tempFactor (7.5 %/°C ≈ Q10 2, gas/params.ts) stays the temperature term; this module adds
//   shivering (heat ∝ VO2: shiverW/m0) and MH (VO2 × 2.5, VCO2 × 3 at activity 1). Heat Q10 is NOT applied to the
//   heat balance (decision 3: it moved the Stage 3 plateau out of its band).
import { mhActivity } from './mh.ts';
import { MH_VCO2_FACTOR, MH_VO2_FACTOR } from './params.ts';
import type { ThermalState } from './heat.ts';

export interface ThermalMetabolic {
  vo2F: number; // × on VO2 beyond Stage 3's tempFactor and GA factor (shivering, MH)
  vco2F: number;
  mhActivity: number;
}

export function thermalMetabolic(st: ThermalState, t: number): ThermalMetabolic {
  const a = mhActivity(st.mh, t);
  const shiver = st.m0 > 0 ? st.out.shiverW / st.m0 : 0;
  return { vo2F: (1 + shiver) * (1 + (MH_VO2_FACTOR - 1) * a), vco2F: (1 + shiver) * (1 + (MH_VCO2_FACTOR - 1) * a), mhActivity: a };
}

export interface Cascade {
  hrF: number; // fever +8–10 bpm/°C above 37.5; hypothermic bradycardia below 35 [TXT]
  clearanceF: number; // drug clearance × (tables clearTemp −10 %/°C below 37) → 7g
  macF: number; // MAC × (tables −5 %/°C) → 7f
  coagF: number; // coagulation function placeholder (< 35 °C: −10 %/°C) → 7c/7h
  stage: 0 | 1 | 2 | 3 | 4; // 0 normothermic, 1 mild 35–32, 2 moderate 32–28, 3 severe < 28, 4 hyperthermic > 40
  shiverLevel: number; // 0–1 ECG/pleth shivering artefact level (Stage 4b `artefact.shiver`)
}

/**
 * HR × from core temperature: fever +12 %/°C above 37.5 (tables §5c "HR +8–10 /°C" = +11–13 % at 75 bpm) and
 * hypothermic bradycardia below 35 °C [TXT]. Not a β effect: drug β-blockade does not blunt it (R51 addendum 16).
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
