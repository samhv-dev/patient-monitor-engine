// Respiratory drive, work of breathing and fatigue for SPONTANEOUS breathing (tables §4.6, Q36, Q9). Pure functions
// plus one small state (fatigue). Consumed by the resp pipeline in MODELED mode only (MANUAL keeps the rr/vt targets).
//   VE = [S·(PaCO2 − B)]₊ · H(PaO2) · (1 − Dep_opioid) · (1 − Dep_hypnotic) · F + VE_pain + J-receptor term
//   H(PaO2) = 1 + A/(PaO2 − 32) − A/68 (Weil 1970 form, A = hvrA 25 mmHg): ×1.5 at PaO2 60, ×2.6 at 45
//   B = PaCO2_set − VE0/S (apnoeic threshold ≈ 4 below resting PaCO2)
//   pattern: opioid → RR falls first (VT kept); hypnotic → VT falls, RR rises
//   PTI = (P_breath/P_max)·(Ti/Ttot); PTI > 0.15 → fatigue F falls (≈ 45 min to failure), RR ↑, VT ↓
export const CO2_SLOPE = 1.5; // L/min/mmHg (Q36; 1.60 ± 0.19)
export const APNOEA_OFFSET = 4; // mmHg below resting PaCO2 (Q36)
export const HVR_A = 25; // mmHg (Weil form constant, [ENG] Q36)
export const PTI_CRIT = 0.15; // Bellemare & Grassino 1982 (Q36)
export const P_MAX_CMH2O = 90; // 80–100
export const FATIGUE_TAU_S = 45 * 60;
export const PAIN_GAIN = 0.3; // +20–40 % at noxious 1, not anaesthetised [ENG]
export const J_RR_PER_EVLWI = 1.5; // RR +4–10 at EVLWI > 10 → +1.5/min per mL/kg above 10 [ENG]

export interface DriveInputs {
  paco2: number; pao2: number; paco2Set: number; ve0: number; // resting PaCO2 and VE (L/min)
  co2SlopeMult: number; // COPD grade (conditions `co2Slope`)
  opioidDep: number; hypnoticDep: number; // 0–1 (7f supplies them; 0 until then)
  pain: number; // 0–1
  evlwi: number;
  vt0: number; rr0: number; // resting pattern
}
export interface DriveOut { ve: number; rr: number; vt: number }

export function hypoxicFactor(pao2: number): number {
  return Math.min(4, 1 + HVR_A / Math.max(1, pao2 - 32) - HVR_A / 68); // capped ×4 near PaO2 40 [ENG]
}

/** Minute ventilation and its split. Returns rr 0 (apnoea) when the CO2 drive is below threshold. */
export function drive(x: DriveInputs, fatigue = 1): DriveOut {
  const s = CO2_SLOPE * x.co2SlopeMult;
  const b = x.paco2Set - x.ve0 / s;
  const chem = Math.max(0, s * (x.paco2 - b)) * hypoxicFactor(x.pao2);
  let ve = chem * (1 - x.opioidDep) * (1 - x.hypnoticDep) * fatigue;
  if (ve > 0) ve *= 1 + PAIN_GAIN * x.pain;
  if (ve <= 0.2) return { ve: 0, rr: 0, vt: 0 };
  // split: opioids slow the rate, hypnotics shrink the tidal volume; fatigue → rapid shallow
  const rrF = (1 - 0.7 * x.opioidDep) * (1 + 0.5 * x.hypnoticDep) * (1 + 0.6 * (1 - fatigue));
  const rr = Math.max(4, Math.min(45, x.rr0 * rrF * Math.sqrt(ve / x.ve0) + J_RR_PER_EVLWI * Math.max(0, x.evlwi - 10)));
  return { ve, rr, vt: (ve * 1000) / rr };
}

/** Pressure–time index of a spontaneous breath (VT mL, C mL/cmH2O, R cmH2O·s/L, Ti/Ttot). */
export function pti(vt: number, c: number, r: number, ti: number, ttot: number, pMaxMult = 1): number {
  const pBreath = vt / Math.max(1, c) + r * (vt / 1000 / Math.max(0.2, ti));
  return (pBreath / (P_MAX_CMH2O * pMaxMult)) * (ti / Math.max(0.5, ttot));
}

/** Fatigue F (1 fresh → 0.3 exhausted): falls while PTI > PTI_CRIT, recovers with the same τ below it. */
export function stepFatigue(f: number, ptiNow: number, dt: number): number {
  const target = ptiNow > PTI_CRIT ? Math.max(0.3, 1 - 4 * (ptiNow - PTI_CRIT)) : 1;
  return f + (target - f) * (1 - Math.exp(-dt / FATIGUE_TAU_S));
}
