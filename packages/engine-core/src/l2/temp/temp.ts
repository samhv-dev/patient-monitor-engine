// Temperature (brief §4.6; research 03 §6): a two-compartment heat model (core 2/3 and periphery 1/3 of body
// mass, 3.5 kJ/kg/°C) with core→periphery conductance k_cp that rises at induction (redistribution) and falls
// below the 34.5 °C vasoconstriction threshold (plateau), metabolic heat M (−20 % under GA, × MH), losses to
// ambient, forced-air warming; then per-site first-order lags behind core. Stepped at 1 Hz. Plain data.
import type { TempSite } from '../../types-resp.ts';

export const HEAT_CAP_J_KG_C = 3500; // brief §4.6
export const CORE_FRACTION = 2 / 3; // research 03 §6.2
export const M_AWAKE_W_70 = 80; // metabolic heat ~80 W (brief §4.6), scaled by effective weight
export const PERIPH_GRADIENT_C = 4.3; // awake core − periphery at 21 °C ambient [ENG: gives the 1–1.5 °C redistribution]
export const AMBIENT_C = 21; // operating theatre [ENG]
export const GA_KCP = 3; // k_cp × 2–4 at induction (brief §4.6)
export const GA_M = 0.8; // M −15–20 % under GA
export const NEURAXIAL_KCP = 1.8; // redistribution 0.5–1 °C, no plateau (research 03 §6.2) [ENG]
export const NEURAXIAL_H = 1.5; // vasodilated skin below the block loses more heat [ENG]
export const VASOCONSTRICT_C = 34.8; // GA vasoconstriction (brief §4.6: ~34.5): centre of a 0.1 °C logistic so the plateau lands at 34.6–34.8 [ENG]
export const VASOCONSTRICT_KCP = 0.5; // k_cp once constricted [ENG]
export const WARMING_W_70 = 60; // forced air +0.5–1 °C/h (brief §4.6) [ENG]
export const MH_MAX_FACTOR = 5; // MH heat × 5 at severity 1: ≥ 1 °C per 15 min once established (brief §4.6) [ENG]
/** MH CO2 production × 3 at severity 1 (brief §4.9: VCO2 × 2–5); × 5 would take EtCO2 past the 150 mmHg schema limit in 30 min [ENG]. */
export const MH_VCO2_FACTOR = 3;
export const MH_ONSET_S = 900; // reaches full severity over 15 min (5–30 min) [ENG]
/** Site lag τ (s) and offset (°C) behind core (brief §4.6 table). */
export const SITES: Readonly<Record<TempSite, { tauS: number; offset: number }>> = {
  oesophageal: { tauS: 45, offset: 0 }, // 0.5–1 min
  nasopharyngeal: { tauS: 120, offset: 0 }, // 1–3 min
  tympanic: { tauS: 120, offset: 0 },
  bladder: { tauS: 720, offset: 0 }, // 5–20 min
  rectal: { tauS: 2400, offset: 0 }, // 20–60 min
  axilla: { tauS: 300, offset: -0.5 }, // 5 min, −0.5 °C
};
export const SENSOR_TAU_S = 5; // probe time constant < 10 s (research 03 §6.1)

export interface TempState {
  tc: number;
  tp: number;
  ta: number;
  capCore: number; // J/°C
  capPer: number;
  k0: number; // awake k_cp W/°C
  h: number; // periphery → ambient W/°C
  m0: number; // awake metabolic heat W
  anaesthesia: 'none' | 'general' | 'neuraxial';
  warming: boolean;
  mh: { severity: number; t0: number } | null;
  sites: Record<TempSite, number>;
}

export function createTemp(tCore: number, effKg: number): TempState {
  const m0 = M_AWAKE_W_70 * (effKg / 70);
  const tp = tCore - PERIPH_GRADIENT_C;
  const sites = {} as Record<TempSite, number>;
  for (const s of Object.keys(SITES) as TempSite[]) sites[s] = tCore;
  return {
    tc: tCore, tp, ta: AMBIENT_C,
    capCore: HEAT_CAP_J_KG_C * effKg * CORE_FRACTION, capPer: HEAT_CAP_J_KG_C * effKg * (1 - CORE_FRACTION),
    k0: m0 / PERIPH_GRADIENT_C, h: m0 / (tp - AMBIENT_C), m0,
    anaesthesia: 'none', warming: false, mh: null, sites,
  };
}

/** MH multiplier at time t (1 when absent): heat by default, `max` = MH_VCO2_FACTOR for CO2/O2 production. */
export function mhFactor(st: TempState, t: number, max = MH_MAX_FACTOR): number {
  if (!st.mh) return 1;
  const r = Math.min(1, Math.max(0, (t - st.mh.t0) / MH_ONSET_S));
  return 1 + (max - 1) * st.mh.severity * r;
}

function kcp(st: TempState): number {
  if (st.anaesthesia === 'neuraxial') return st.k0 * NEURAXIAL_KCP;
  if (st.anaesthesia !== 'general') return st.k0;
  const constrict = 1 / (1 + Math.exp((st.tc - VASOCONSTRICT_C) / 0.1)); // 0 warm → 1 below threshold
  return st.k0 * (GA_KCP * (1 - constrict) + VASOCONSTRICT_KCP * constrict);
}

/** One step of dtS seconds (≤ 1 s): Cc·dTc = M − k(Tc − Tp); Cp·dTp = k(Tc − Tp) − h(Tp − Ta) + warming. */
export function stepTemp(st: TempState, t: number, dtS: number): void {
  const m = st.m0 * (st.anaesthesia === 'general' ? GA_M : 1) + st.m0 * (mhFactor(st, t) - 1); // MH heat is muscle, not blunted by GA
  const flux = kcp(st) * (st.tc - st.tp);
  const warm = st.warming ? WARMING_W_70 * (st.capCore / (HEAT_CAP_J_KG_C * 70 * CORE_FRACTION)) : 0;
  st.tc += ((m - flux) / st.capCore) * dtS;
  const h = st.h * (st.anaesthesia === 'neuraxial' ? NEURAXIAL_H : 1);
  st.tp += ((flux - h * (st.tp - st.ta) + warm) / st.capPer) * dtS;
  for (const s of Object.keys(SITES) as TempSite[]) {
    const p = SITES[s];
    st.sites[s] += (st.tc + p.offset - st.sites[s]) * (1 - Math.exp(-dtS / p.tauS));
  }
}

/**
 * MANUAL target (plan decision 2): place the model at a steady state with core = tCore (the periphery and the
 * metabolic heat are re-solved so nothing drifts afterwards; a fever is a raised set point).
 */
export function setCoreTarget(st: TempState, tCore: number): void {
  const k = kcp({ ...st, tc: tCore });
  st.tc = tCore;
  st.tp = (k * tCore + st.h * st.ta) / (k + st.h);
  const gaM = st.anaesthesia === 'general' ? GA_M : 1;
  st.m0 = (k * (tCore - st.tp)) / gaM;
}
