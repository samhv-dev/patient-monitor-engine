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

export interface CoronaryState {
  ref: Stabilised['ref'];
  dtf0: number;
  ratio: number;
  delta: number;
  kIsch: number;
  ischT: number; // seconds with δ > 0.1
  stMv: number;
  eesF: number; // current contractility multiplier seen by the demand term (set by the caller)
}

export function createCoronary(ref: Stabilised['ref']): CoronaryState {
  const rr = 60 / ref.hr;
  const tsys = 0.37 + IVR_S; // resting emergent valve closure ≈ 0.37 s after onset at HR 70 (prototype)
  return { ref, dtf0: (rr - tsys) / rr, ratio: 1, delta: 0, kIsch: 1, ischT: 0, stMv: 0, eesF: 1 };
}

/** One step of dt seconds using the most recent beat(s). `cfr` from the profile; `hr` current rate. */
export function stepCoronary(c: CoronaryState, beats: readonly CircBeat[], cfr: number, dt: number, hr: number): void {
  const b = beats[beats.length - 1];
  if (!b) return;
  const r = c.ref;
  const rr = 60 / Math.max(20, hr);
  const tsys = b.avClose > 0 ? b.avClose + IVR_S : 0.6 * rr;
  const dtf = Math.max(0.05, (rr - tsys) / rr);
  const cpp = b.aoDia - b.lvedp;
  const cpp0 = r.dbp - r.lvedp;
  const supply = cfr * Math.max(0, (cpp - P_ZF) / Math.max(5, cpp0 - P_ZF)) * (dtf / c.dtf0);
  const demand = (hr / r.hr) * (Math.max(20, b.lvsp) / r.lvsp) * Math.sqrt(Math.max(0.1, c.eesF)) * Math.cbrt(Math.max(10, b.lvedv) / r.lvedv);
  c.ratio = supply / Math.max(0.05, demand);
  c.delta = Math.max(0, 1 - c.ratio);
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
