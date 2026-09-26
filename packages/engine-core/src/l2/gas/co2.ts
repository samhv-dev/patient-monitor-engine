// CO2 kinetics (brief §4.4 "Kinetics"; research 03 §4.4): two compartments (fast: lung gas + blood + well-
// perfused tissue; slow: muscle class), alveolar elimination limited by pulmonary blood flow (low-flow
// compression, so CO2 accumulates in arrest and washes out at ROSC), Pa − EtCO2 gradient.
import { K_CO2, LOW_FLOW_EXP, LOW_FLOW_TAU_S, PA_ET_GRADIENT } from './params.ts';

export interface Co2State {
  pf: number; // fast compartment = PaCO2 (mmHg)
  ps: number; // slow compartment
  flow: number; // lagged low-flow factor min(1, CO/CO_ref)^0.6
  /** MANUAL calibration: physiological dead space beyond anatomical + apparatus (mL), plan decision 2. */
  vdExtraMl: number;
}

export interface Co2Inputs {
  vaLpm: number; // alveolar ventilation (L/min), already net of every dead space
  vco2: number; // mL/min
  coRatio: number; // CO / CO_ref
  cf: number;
  cs: number;
  kfs: number;
  extraGradient: number; // added Pa − Et (bronchospasm) mmHg
}

/** min(1, CO/CO_ref)^0.6 (brief §4.4 low-flow compression). */
export function lowFlowFactor(coRatio: number): number {
  return Math.min(1, Math.max(0, coRatio)) ** LOW_FLOW_EXP;
}

export function createCo2State(paco2: number): Co2State {
  return { pf: paco2, ps: paco2, flow: 1, vdExtraMl: 0 };
}

/**
 * C_f·dPf/dt = φ·VCO2 − φ·VA·Pf/0.863 − k_fs·(Pf − Ps); C_s·dPs/dt = k_fs·(Pf − Ps) + (1 − φ)·VCO2 (brief §4.4 with
 * φ = min(1, CO/CO_ref)^0.6, lagged τ 5 s). φ = 1 is the brief's model exactly.
 */
export function stepCo2(st: Co2State, x: Co2Inputs, dtS: number): void {
  const target = lowFlowFactor(x.coRatio);
  st.flow += (target - st.flow) * (1 - Math.exp(-dtS / LOW_FLOW_TAU_S));
  const dt = dtS / 60;
  const elim = (st.flow * x.vaLpm * st.pf) / K_CO2;
  const ex = x.kfs * (st.pf - st.ps);
  // low flow: CO2 the blood does not carry away stays in the tissues (slow compartment) → ROSC washout [ENG]
  st.pf = Math.max(0, st.pf + ((st.flow * x.vco2 - elim - ex) / x.cf) * dt);
  st.ps = Math.max(0, st.ps + ((ex + (1 - st.flow) * x.vco2) / x.cs) * dt);
}

/** True end-tidal PCO2 of an exchanging breath: (PaCO2 − Δ)·φ (brief §4.4 "EtCO2 = PaCO2 − Δ", low flow). */
export function etco2True(st: Co2State, extraGradient: number): number {
  return Math.max(0, (st.pf - PA_ET_GRADIENT - extraGradient) * st.flow);
}

/** Alveolar ventilation that holds PaCO2 at `paco2` for this VCO2 (steady state of the fast compartment). */
export function vaForPaco2(vco2: number, paco2: number): number {
  return (K_CO2 * vco2) / Math.max(1, paco2);
}

/**
 * Stage 7b: end-tidal PCO2 from the lung module's mixing point — g = EtCO2/PaCO2 of the unit mix (healthy 0.925 →
 * PaCO2 − 3 at 40, tables §4.4), the bronchospasm term and the low-flow factor φ as etco2True.
 */
export function etco2Mixed(st: Co2State, g: number, extraGradient: number): number {
  return Math.max(0, (st.pf * g - extraGradient) * st.flow);
}
