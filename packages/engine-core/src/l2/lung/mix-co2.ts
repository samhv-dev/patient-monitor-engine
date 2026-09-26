// The mixing point, CO2 side (R43; tables §4.4): every ventilated unit's alveolar PCO2 from its own V/Q
// (PA = Q·S·Pv / (VA_perfused/K + Q·S)), the arterial PCO2 as the perfusion-weighted mix (+ shunt at Pv), the
// end-tidal PCO2 as the EXPIRATORY-FLOW-weighted mix at end-expiration (slow units empty last), unperfused alveolar
// ventilation (vdAlv) diluting the expired gas. Stage 3's two-compartment store keeps PaCO2 kinetics; this module
// hands it two RATIOS so healthy lungs reproduce Stage 3 exactly: efficiency e (effective / delivered alveolar
// ventilation) and g = EtCO2/PaCO2; plus the capnogram's phase III rise from the time-constant spread.
import { K_CO2 } from '../gas/params.ts';
import { CO2_SLOPE_BLOOD, HEALTHY_VDALV, VQ_LOW } from './params.ts';

export interface Co2MixInputs {
  va: number; // delivered alveolar ventilation (L/min), Stage 3's alveolarVentilation
  vent: number[]; // share of `va` per unit (sums to 1 over ventilated units)
  perf: number[]; // pulmonary flow per unit through gas-exchanging capillaries (L/min)
  qLow: number; // flow through low-V/Q units (L/min)
  qShunt: number; // true shunt flow (L/min)
  vdAlv: number[]; // unperfused fraction of each unit's alveolar ventilation
  tauEx: number[]; // expiratory time constant of each unit (s)
  teS: number; // expiratory time of the current breath (s)
  paco2: number; // Stage 3 fast compartment (the arterial PCO2)
  vco2: number; // mL/min
}
export interface Co2Mix {
  pA: number[]; // unit alveolar PCO2 on Stage 3's scale (mmHg)
  pv: number; // mixed venous PCO2
  e: number; // elimination efficiency 0–1
  g: number; // EtCO2 / PaCO2
  riseIII: number; // phase III rise from heterogeneity (mmHg, late minus early expiration)
  faCo2: number; // mean alveolar CO2 fraction (for the O2 side)
}

/** Expiratory-flow-weighted expired PCO2 at time w into expiration. */
function expiredAt(x: Co2MixInputs, pExp: number[], w: number): number {
  let num = 0;
  let den = 0;
  for (let u = 0; u < pExp.length; u++) {
    const v = x.vent[u] as number;
    if (v <= 0) continue;
    const tau = Math.max(0.05, x.tauEx[u] as number);
    const fl = (v / tau) * Math.exp(-w / tau);
    num += fl * (pExp[u] as number);
    den += fl;
  }
  return den > 0 ? num / den : 0;
}

export function mixCo2(x: Co2MixInputs): Co2Mix {
  const q = x.perf.reduce((a, b) => a + b, 0) + x.qLow + x.qShunt;
  const S = CO2_SLOPE_BLOOD;
  const pv = x.paco2 + x.vco2 / Math.max(0.3, q * S);
  const n = x.vent.length;
  const pA: number[] = new Array<number>(n).fill(0);
  const pExp: number[] = new Array<number>(n).fill(0);
  let elim = 0;
  let paNum = x.qShunt * pv;
  let vaSum = 0;
  for (let u = 0; u < n; u++) {
    const vau = x.va * (x.vent[u] as number);
    const vaP = vau * (1 - (x.vdAlv[u] as number));
    const qu = x.perf[u] as number;
    const p = qu > 0 || vaP > 0 ? (qu * S * pv) / (vaP / K_CO2 + qu * S + 1e-9) : 0;
    pA[u] = p;
    pExp[u] = p * (1 - (x.vdAlv[u] as number));
    elim += (vaP * p) / K_CO2;
    paNum += qu * p;
    vaSum += vau;
  }
  // low-V/Q units: V/Q = VQ_LOW, their ventilation is part of `va` already (small), CO2 near Pv
  const pLow = (x.qLow * S * pv) / ((VQ_LOW * x.qLow) / K_CO2 + x.qLow * S + 1e-9);
  paNum += x.qLow * pLow;
  const paModel = paNum / Math.max(1e-6, q);
  const scale = x.paco2 / Math.max(1e-6, paModel);
  const et = expiredAt(x, pExp, x.teS);
  const early = expiredAt(x, pExp, 0.25 * x.teS);
  const mixedA = vaSum > 0 ? pA.reduce((a, p, u) => a + p * (x.vent[u] as number), 0) : x.paco2;
  return {
    pA: pA.map((p) => p * scale), pv,
    // normalised by the healthy alveolar dead space, which Stage 3's anatomic + apparatus dead space already holds (decision 7)
    e: x.va > 0 ? Math.min(1.5, (elim * K_CO2) / (paModel * x.va) / (1 - HEALTHY_VDALV)) : 1,
    g: x.va > 0 ? Math.min(1, et / paModel) : 1,
    riseIII: x.va > 0 ? Math.max(0, (et - early) * scale) : 0,
    faCo2: (mixedA * scale) / 713,
  };
}
