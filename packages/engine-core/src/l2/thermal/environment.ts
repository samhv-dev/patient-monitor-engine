// SPDX-License-Identifier: Apache-2.0
// Portions derived from the Pulse Physiology Engine 4.3.2 (commit e8a3649), src/cpp/engine/common/system/environment/
// EnvironmentModel.cpp and physiology/EnergyModel.cpp (radiation 4εσ·0.73·T̄³, convection 10.3·v^0.6, respiratory heat
// loss), Copyright 2018-2025 Kitware, Inc. and Contributors, itself a fork of BioGears 6.1.1, Copyright 2015 Applied
// Research Associates, Inc.; licensed under the Apache License, Version 2.0; modified: re-expressed in TypeScript with
// consistent units (Pulse divides area by h); insulation calibrated to Stage 3; forced air, HME and IV terms ours
// (see NOTICES N-P17).
//
// Heat exchange with the environment (annex B3; Pulse EnvironmentModel forms re-expressed with CONSISTENT units —
// the audit found Pulse's resistances "area/h", dimensionally wrong: research/pulse-audit/02 §5). Every term is a
// power in W. The dry skin loss is radiation + convection through an insulation layer (clothes, blankets, drapes):
//   q_dry = A_exposed·(Tp − Ta)/(R_ins + 1/(h_r + h_c)),  h_r = 4·ε·σ·f_rad·T̄³,  h_c = 10.3·v^0.6 (Pulse)
// The insulation R_ins is CALIBRATED at creation so the awake patient at 21 °C loses exactly Stage 3's heat
// (so every Stage 3 number is reproduced), and every later change (ambient, air speed, exposure, forced air,
// ventilation, cold fluid) acts through the physical terms relative to that calibration.

export const SIGMA = 5.670e-8; // W/m²/K⁴
export const EMISSIVITY = 0.95; // skin [TXT]
export const F_RAD = 0.73; // effective radiating fraction of body area, supine (Pulse) [TXT]
export const AIR_SPEED_MS = 0.15; // theatre air speed at the patient [ENG]; laminar-flow theatre 0.3–0.5
export const SKIN_EVAP_W_70 = 10; // insensible skin evaporation, awake [TXT: ≈ 10–15 W]
export const PREP_EVAP_W_70 = 40; // wet skin prep / open body cavity (tables: large wound 10–30 % of loss) [ENG]
export const AIR_J_L_C = 1.21; // ρ·cp of air, J/L/°C
export const LATENT_J_MG = 2.43; // water latent heat at 30–37 °C, J/mg
export const EXHALED_C = 34; // exhaled gas temperature, saturated [TXT]
export const ROOM_RH = 0.5; // theatre relative humidity [ENG]
export const HME_RECOVERY = 0.5; // heat–moisture exchanger returns half the respiratory loss [TXT]
export const FORCED_AIR_C = 43; // "high" setting [TXT]
export const FORCED_AIR_H = 10; // W/m²/°C air-to-skin under the blanket [ENG: fitted to R39-7 warmed −0.9 °C and +0.5–1 °C/h]
/** The blanket, skin and subcutaneous tissue take time to warm: the delivered power follows on/off with this τ [ENG]. */
export const FORCED_AIR_TAU_S = 1800;
export const FORCED_AIR_AREA = 0.35; // upper-body blanket fraction of the body area [ENG]
export const WATER_J_ML_C = 4.18; // IV fluid heat capacity

/** Du Bois body surface area, m² (Pulse's skin-area formula). */
export function bsaM2(weightKg: number, heightCm: number): number {
  return 0.20247 * weightKg ** 0.425 * (heightCm / 100) ** 0.725;
}

export function radiativeH(tp: number, ta: number): number {
  const tm = (tp + ta) / 2 + 273.15;
  return 4 * EMISSIVITY * SIGMA * F_RAD * tm ** 3;
}

export function convectiveH(airMs: number): number {
  return 10.3 * Math.max(0.05, airMs) ** 0.6;
}

export interface Ventilation {
  veLpm: number; // minute ventilation
  dryGas: boolean; // anaesthesia machine / ventilator gas (0 % RH) instead of room air
  hme: boolean;
}

/** Saturated water vapour content of air, mg/L (cubic fit, 0–40 °C: 18.3 at 21 °C, 37.7 at 34 °C) [TXT]. */
export function satMgL(tC: number): number {
  return 5.018 + 0.32321 * tC + 8.1847e-3 * tC ** 2 + 3.1243e-4 * tC ** 3;
}

/** Respiratory heat loss, W: warming (sensible) and humidifying (latent) the inspired gas. */
export function respiratoryW(v: Ventilation, ta: number): number {
  const inMg = v.dryGas ? 0 : ROOM_RH * satMgL(ta);
  const perL = AIR_J_L_C * (EXHALED_C - ta) + LATENT_J_MG * Math.max(0, satMgL(EXHALED_C) - inMg);
  return (v.veLpm * perL * (v.hme ? 1 - HME_RECOVERY : 1)) / 60;
}

export interface Envelope {
  bsa: number; // m²
  rIns: number; // insulation, m²·°C/W (calibrated)
}

/** Dry (radiative + convective) loss from the periphery at Tp through the insulation, over `exposed` × BSA. */
export function dryW(env: Envelope, tp: number, ta: number, airMs: number, exposed: number): number {
  const h = radiativeH(tp, ta) + convectiveH(airMs);
  return (env.bsa * exposed * (tp - ta)) / (env.rIns + 1 / h);
}

/** Solve the insulation so the dry loss at (tp, ta) equals `watts` (awake calibration). */
export function calibrateInsulation(bsa: number, tp: number, ta: number, airMs: number, watts: number): number {
  const h = radiativeH(tp, ta) + convectiveH(airMs);
  return Math.max(0, (bsa * (tp - ta)) / Math.max(1, watts) - 1 / h);
}

/** Forced-air warming: heat INTO the periphery, W (the covered area's own dry loss is removed by the caller). */
export function forcedAirW(env: Envelope, tp: number, airC = FORCED_AIR_C): number {
  return FORCED_AIR_H * env.bsa * FORCED_AIR_AREA * (airC - tp); // FU-4 item 1: the blanket's set air temperature
}

/** An IV infusion at `tempC` (warmer: 37) removes heat from the core, W (negative = heat lost). */
export function infusionW(mlPerMin: number, tempC: number, tc: number): number {
  return (-(mlPerMin / 60) * WATER_J_ML_C * (tc - tempC));
}

/** A running IV line as Stage 7c keeps it (duck-typed `blood.core.fl.flows[]`): mL/min, until, volume left, composition. */
export interface IvFlowLike {
  rate: number;
  until: number;
  leftMl?: number;
  comp: { citrate?: number } | null; // null = haemorrhage
}
/** Stored blood products leave the blood bank at ≈ 4 °C [TXT]. */
export const STORED_BLOOD_C = 4;

/**
 * The IV inflow the heat model sees (exception E-7e-1: 7c's pipeline writes it into `rs.temp.iv` every 100 ms instead of
 * its −0.25 °C-per-unit shortcut): every running infusion except haemorrhage; blood-bank (citrated) products at 4 °C
 * while an unwarmed unit is running, else 37 °C (warmed); crystalloids and colloids at room temperature. One unit of
 * RBC (280 mL at 4 °C) then removes 38 kJ ≈ 0.24 °C of a 70 kg core — the tables' 0.25 °C per unit, now physical.
 */
export function ivInflow(flows: readonly IvFlowLike[], coldRunning: boolean, t: number, roomC: number): { mlPerMin: number; tempC: number } {
  let ml = 0;
  let heat = 0;
  for (const f of flows) {
    if (f.comp === null || t >= f.until || (f.leftMl !== undefined && f.leftMl <= 0)) continue;
    const c = (f.comp.citrate ?? 0) > 0 ? (coldRunning ? STORED_BLOOD_C : 37) : roomC;
    ml += f.rate;
    heat += f.rate * c;
  }
  return { mlPerMin: ml, tempC: ml > 0 ? heat / ml : roomC };
}
