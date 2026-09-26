// Per-lung perfusion with hypoxic pulmonary vasoconstriction (tables §4.2, catalogue §22, Q35). Each side's flow
// divides into its collapsed part (true shunt), an aerated-but-hypoxic part and a normal part; HPV multiplies the
// flow to the first two by (1 − hpv·a). The same factor is that side's PVR multiplier for Stage 7a, and without 7a
// the side flow fractions come from the conductances directly (fallback).
import {
  ATEL_PERF, HPV2_EXTRA, HPV2_ONSET_S, HPV_PAO2_HI, HPV_PAO2_LO, PERF_SHARE, TAU_HPV1_S, TAU_HPV2_S,
} from './params.ts';
import type { SideParams } from './side.ts';

export interface HpvState { a1: number[]; a2: number[]; stimS: number[] }
export interface Perfusion {
  f: number[]; // fraction of pulmonary flow to each side
  pvrMult: number[]; // each side's vascular resistance multiplier (for 7a)
  shunt: number[]; // fraction of the side's flow through its collapsed part
  hypoxic: number[]; // hypoxic fraction of each side (HPV stimulus)
}

export function createHpv(): HpvState {
  return { a1: [0, 0], a2: [0, 0], stimS: [0, 0] };
}

/** Aerated-region hypoxic stimulus 0–1 from the side's alveolar PO2 [ENG]. */
export function hpvStimulus(pao2: number): number {
  return Math.min(1, Math.max(0, (HPV_PAO2_HI - pao2) / (HPV_PAO2_HI - HPV_PAO2_LO)));
}

const relax = (x: number, target: number, tau: number, dt: number) => x + (target - x) * (1 - Math.exp(-dt / tau));

/** HPV activation: phase 1 τ 5 min; phase 2 +30 % after 40 min of stimulus, τ 60 min (tables §4.2). */
export function stepHpv(st: HpvState, hypoxic: number[], dt: number): void {
  for (let s = 0; s < 2; s++) {
    const on = (hypoxic[s] as number) > 0.02;
    st.stimS[s] = on ? (st.stimS[s] as number) + dt : 0;
    st.a1[s] = relax(st.a1[s] as number, on ? 1 : 0, TAU_HPV1_S, dt);
    st.a2[s] = relax(st.a2[s] as number, on && (st.stimS[s] as number) > HPV2_ONSET_S ? HPV2_EXTRA : 0, TAU_HPV2_S, dt);
  }
}

/**
 * Side flows. `nonAer` = non-aerated fraction per side, `pao2` = each side's alveolar PO2, `volatileMac` inhibits
 * HPV ×(1 − 0.2·MAC) (Miller 10e ch. 49 p. 1538, catalogue §22).
 */
export function perfusion(sp: SideParams[], nonAer: number[], pao2: number[], st: HpvState, volatileMac: number): Perfusion {
  const g = [0, 0];
  const out: Perfusion = { f: [0, 0], pvrMult: [1, 1], shunt: [0, 0], hypoxic: [0, 0] };
  for (let s = 0; s < 2; s++) {
    const p = sp[s] as SideParams;
    const act = Math.min(1.3, (st.a1[s] as number) + (st.a2[s] as number)) * Math.max(0, 1 - 0.2 * volatileMac);
    const vaso = Math.max(0.05, 1 - p.hpv * act);
    const c = Math.min(1, ATEL_PERF * (nonAer[s] as number));
    const h = hpvStimulus(pao2[s] as number);
    const wc = c * vaso;
    const wh = (1 - c) * h * vaso;
    const wn = (1 - c) * (1 - h);
    const w = wc + wh + wn;
    g[s] = (PERF_SHARE[s] as number) * p.perf * w;
    out.pvrMult[s] = 1 / Math.max(0.05, w);
    out.shunt[s] = wc / Math.max(1e-6, w);
    out.hypoxic[s] = c + (1 - c) * h;
  }
  const gs = (g[0] as number) + (g[1] as number);
  out.f = [(g[0] as number) / gs, (g[1] as number) / gs];
  return out;
}
