// Coronary supply/demand and ischaemia (R23; tables §3). Stepped at 1 Hz from the last CircBeat:
//   DTF    = (RR − T_sys)/RR with T_sys the beat's emergent valve-open end (avClose) + isovolumic relaxation 60 ms
//            — "diastolic fraction from real valve timing" (not the QS2 regression)
//   CPP    = aortic diastolic pressure − LVEDP (tables §3; the aortic truth, not the radial display)
//   Supply = CFR·((CPP − P_zf)/(CPP_0 − P_zf))·(DTF/DTF_0)                        [normalised; 1 = rest demand]
//   Demand = (HR/HR_0)·(LVSP/LVSP_0)·(kEes)^0.5·(LVEDV/LVEDV_0)^(1/3)            [RPP with a wall-stress term]
//   ratio r = Supply/Demand; deficit δ = max(0, 1 − r); kIsch → 1 − gIsch·δ (τ_down 20 s, τ_up 60 s; Q32)
//   ST: global subendocardial depression −min(0.3, 1.0·δ) mV after a 45 s lag (stLag 30–60 s), applied through the
//       existing Modifiers.ischaemicDepressionMv (0 or −0.05…−0.3 mV); territorial STEMI stays a Stage 5 modifier.
// P_zf 15 mmHg and the CFR mapping are Q31 defaults; the tables' SEVR cross-check is informative only.
import type { CircBeat } from './model.ts';
import type { Stabilised } from './stabilise.ts';

export const P_ZF = 15; // mmHg (tables §3 pZf; Q31)
export const G_ISCH = 1.5; // (Q32)
export const TAU_ISCH_DOWN_S = 20; // (Q32)
export const TAU_ISCH_UP_S = 60; // (Q32)
export const ST_LAG_S = 45; // 30–60 s (tables §3 stLag)
export const IVR_S = 0.06; // isovolumic relaxation after aortic closure [ENG]
/** FU-3 item 16: the resting arterial saturation the O2-content ratio is taken against (the chemoreflex's resting 0.97). */
export const SAO2_REF = 0.97;
/**
 * FU-3 item 16: time constant of the hypoxic myocardial depression while the O2 supply deficit stands [ENG, fitted
 * to the asphyxial arrest window: loss of aortic pulsations 9.5 ± 1.4 min (swine, Varvarousi 2011) and 11.4 ± 2.4 min
 * (dogs, DeBehnke 1995) after the airway is occluded on room air].
 */
export const TAU_HYP_S = 150;

export interface CoronaryState {
  ref: Stabilised['ref'];
  dtf0: number;
  ratio: number;
  delta: number;
  kIsch: number;
  ischT: number; // seconds with δ > 0.1
  stMv: number;
  eesF: number; // current contractility multiplier seen by the demand term (set by the caller)
  hyp: number; // FU-3 item 16: the hypoxic share of the deficit, filtered as kIsch (0–1; MODELED only, 0 in MANUAL)
}

export function createCoronary(ref: Stabilised['ref']): CoronaryState {
  const rr = 60 / ref.hr;
  const tsys = 0.37 + IVR_S; // resting emergent valve closure ≈ 0.37 s after onset at HR 70 (prototype)
  return { ref, dtf0: (rr - tsys) / rr, ratio: 1, delta: 0, kIsch: 1, ischT: 0, stMv: 0, eesF: 1, hyp: 0 };
}

/**
 * One step of dt seconds using the most recent beat(s). `cfr` from the profile; `hr` current rate. `o2Rel` (FU-3
 * item 16, MODELED only): arterial O2 content ÷ its resting value — myocardial O2 delivery is coronary flow × CaO2 and
 * the resting heart already extracts ≈ 70 % of it, so a content fall is a supply fall only the flow reserve can
 * offset (Guyton & Hall, coronary circulation [TXT]); 1 = the flow-only supply of R23.
 */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number, o2Rel = 1): void {
  const b = beats[beats.length - 1];
  if (!b) return;
  const r = c.ref;
  const rr = 60 / Math.max(20, hr);
  const tsys = b.avClose > 0 ? b.avClose + IVR_S : 0.6 * rr;
  const dtf = Math.max(0.05, (rr - tsys) / rr);
  const cpp = b.aoDia - b.lvedp;
  const cpp0 = r.dbp - r.lvedp;
  const flow = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
  const demand = (hr / r.hr) * (Math.max(20, b.lvsp) / r.lvsp) * Math.sqrt(Math.max(0.1, c.eesF)) * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
  c.ratio = (flow * o2Rel) / Math.max(0.05, demand);
  c.delta = Math.max(0, 1 - c.ratio);
  // FU-3 item 16: the hypoxaemic share of the deficit (δ weighted by the content loss 1 − o2Rel), rising with the
  // myocardium's hypoxic tolerance TAU_HYP_S and recovering as kIsch does (τ_up)
  const dHyp = c.delta * (1 - o2Rel);
  c.hyp += (dHyp - c.hyp) * (1 - Math.exp(-dt / (dHyp > c.hyp ? TAU_HYP_S : TAU_ISCH_UP_S)));
  if (c.hyp < 5e-4) c.hyp = 0;
  const target = Math.max(0.2, 1 - G_ISCH * c.delta);
  const tau = target < c.kIsch ? TAU_ISCH_DOWN_S : TAU_ISCH_UP_S;
  c.kIsch += (target - c.kIsch) * (1 - Math.exp(-dt / tau));
  if (c.kIsch > 0.9995) c.kIsch = 1;
  c.ischT = c.delta > 0.1 ? c.ischT + dt : 0;
  const stTarget = c.ischT >= ST_LAG_S ? -Math.min(0.3, c.delta) : 0;
  c.stMv += (stTarget - c.stMv) * (1 - Math.exp(-dt / (stTarget < c.stMv ? 15 : 60)));
}

/** The ST modifier patch for the ECG (null when below the 0.05 mV floor of Modifiers.ischaemicDepressionMv). */
export function stPatchOf(c: CoronaryState): { ischaemicDepressionMv: number } | null {
  return c.stMv <= -0.05 ? { ischaemicDepressionMv: Math.max(-0.3, Math.round(c.stMv * 100) / 100) } : null;
}
