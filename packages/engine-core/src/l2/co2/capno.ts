// Capnogram (brief §4.4; research 03 §4.1–4.3): the airway CO2 of each driver cycle built from phases —
// inspiration (phase 0, downstroke τ0 to the inspired baseline), phase I (dead-space gas), phase II
// (exponential upswing τ_II) and phase III (plateau with slope, ending exactly at the breath's true EtCO2) —
// plus the pattern library (shark fin, curare cleft, rebreathing, cardiogenic oscillations, oesophageal
// washout, disconnection, apnoea, CPR oscillations, bifid plateau). The sampler (sidestream/mainstream) is a
// transport delay plus a first-order rise (brief §4.4 "Sampling").
import { cycleAt, lastCycleBefore, type Cycle, type DriverState } from '../resp/driver.ts';

export const CO2_RATE = 62.5; // brief §3.2
export const CO2_SUBSTEPS = 4; // sampler LPF integrated at 250 Hz
export const PHASE_I_S = { mech: 0.1, spont: 0.15 } as const; // dead-space washout at the start of expiration [ENG]
/** Shape constants per family (brief §4.4: τ_II 0.05–0.10 s normal, 0.2–0.5 obstructive; phase III +1–3 mmHg). τ_II 0.09: α 105° sidestream, 100° mainstream (prototype). */
export const SHAPES = {
  mech: { tauII: 0.09, tau0: 0.03, riseIII: 2 },
  spont: { tauII: 0.12, tau0: 0.12, riseIII: 1 }, // rounded (research 03 §4.3)
  shark: { tauII: 0.09, tau0: 0.03, riseIII: 2 }, // τ_II from SHARK_TAU_II and phase III + SHARK_RISE_III per unit severity
  bifid: { tauII: 0.09, tau0: 0.03, riseIII: 2 }, // endobronchial: second, slow half (τ 0.6 s) [ENG]
} as const;
export const APNOEA_DECAY_S = 1.0; // after the last expiration the sampled gas returns to baseline [ENG]
export const CUT_DECAY_S = 0.25; // disconnection: abrupt drop to 0 (research 03 §4.3)
export const CARDIO_MMHG = 1.5; // cardiogenic oscillation 1–3 mmHg at HR (research 03 §4.3)
export const CPR_OSC_MMHG = 3; // compression oscillations × quality [ENG]
/** Sampling (brief §4.4; research 03 §4.2, Philips M3015A / M3014A). */
export const SAMPLING = {
  sidestream: { delayS: 2.3, riseS: 0.24, riseNeoS: 0.19 },
  mainstream: { delayS: 0, riseS: 0.055, riseNeoS: 0.055 },
} as const;

export interface CapnoCtx {
  etco2: number; // current true EtCO2 (mmHg) from the gas model
  beats: readonly number[]; // recent mechanical beat times (s)
  cpr: { active: boolean; rate: number; quality: number; anchor: number };
}

/**
 * Bronchospasm severity → phase II τ (s), piecewise linear (R39-6, research 09 §6). Knots fitted so the α angle
 * measured on the 25 mmHg/s axis scale (brief §4.4; test/helpers/resp.ts capnoAngles) is 105° / 125° / 135° / 145° at
 * severity 0 / 0.5 / 0.8 / 1.0; severity 1.25 is the near-fatal extreme (157°), reachable only on purpose.
 */
export const SHARK_TAU_II: ReadonlyArray<readonly [number, number]> = [[0, 0.09], [0.5, 0.26], [0.8, 0.315], [1, 0.4], [1.25, 0.6]];

/** Phase III rise added per unit bronchospasm severity (mmHg) [ENG, fitted with SHARK_TAU_II; was 10 before R39-6]. */
export const SHARK_RISE_III = 6;

function sharkTauII(sev: number): number {
  const k = SHARK_TAU_II;
  if (sev <= k[0]![0]) return k[0]![1];
  for (let i = 1; i < k.length; i++) {
    const [x1, y1] = k[i]!;
    const [x0, y0] = k[i - 1]!;
    if (sev <= x1) return y0 + ((sev - x0) / (x1 - x0)) * (y1 - y0);
  }
  return k[k.length - 1]![1];
}

function shapeOf(c: Cycle) {
  const s = SHAPES[c.shape];
  if (c.shape !== 'shark') return s;
  return { tauII: sharkTauII(c.severity), tau0: s.tau0, riseIII: s.riseIII + SHARK_RISE_III * c.severity };
}

/** Plateau-end level of a cycle (what its expiration ends at). */
function level(c: Cycle, x: CapnoCtx): number {
  if (c.sampled === 'gastric') return c.gastric;
  return c.sampled === 'alveolar' ? x.etco2 : 0;
}

/** Airway CO2 at the end of cycle c (for the next inspiration's downstroke and for apnoea decay). */
function endValue(c: Cycle, x: CapnoCtx): number {
  const end = c.t0 + c.ti + c.te;
  return end > c.cutAt ? 0 : c.te > 0 ? Math.max(c.fico2, level(c, x)) : c.fico2;
}

/** Airway CO2 (mmHg) at time t — the true signal before the sampler. */
export function airwayCo2(d: DriverState, t: number, x: CapnoCtx): number {
  const c = cycleAt(d, t);
  if (!c) {
    const last = lastCycleBefore(d, t);
    if (!last) return 0;
    const end = last.t0 + last.ti + last.te;
    const base = last.fico2;
    return base + (endValue(last, x) - base) * Math.exp(-(t - end) / APNOEA_DECAY_S);
  }
  if (t >= c.cutAt) {
    const v0 = cycleCo2(d, c, c.cutAt, x);
    return v0 * Math.exp(-(t - c.cutAt) / CUT_DECAY_S);
  }
  return cycleCo2(d, c, t, x);
}

function cycleCo2(d: DriverState, c: Cycle, t: number, x: CapnoCtx): number {
  const sh = shapeOf(c);
  const base = c.fico2;
  const u = t - c.t0;
  if (u < c.ti) {
    const i = d.cycles.indexOf(c);
    const prev = i > 0 ? (d.cycles[i - 1] as Cycle) : undefined;
    const contiguous = prev && prev.t0 + prev.ti + prev.te >= c.t0 - 0.02;
    const from = prev ? (contiguous ? endValue(prev, x) : base + (endValue(prev, x) - base) * Math.exp(-(c.t0 - (prev.t0 + prev.ti + prev.te)) / APNOEA_DECAY_S)) : base;
    const tau0 = sh.tau0 * (base > 0 ? 3 : 1); // rebreathing: slanted phase 0, β ↑ (research 03 §4.3)
    return base + (from - base) * Math.exp(-u / tau0);
  }
  const L = level(c, x);
  if (c.sampled === 'none' || L <= base) return base;
  const tI = c.mech ? PHASE_I_S.mech : PHASE_I_S.spont;
  const w = u - c.ti - tI;
  if (w < 0) return base;
  const te = Math.max(0.05, c.te - tI);
  const slope = sh.riseIII / te;
  const rise = (s: number) => (c.shape === 'bifid' ? 0.5 * (1 - Math.exp(-s / sh.tauII)) + 0.5 * (1 - Math.exp(-s / 0.6)) : 1 - Math.exp(-s / sh.tauII));
  const amp = (L - base - sh.riseIII) / Math.max(1e-3, rise(te));
  let v = base + amp * rise(w) + slope * w;
  if (c.cleft > 0) v -= (3 + 12 * c.cleft) * Math.exp(-(((w - 0.55 * te) / 0.12) ** 2)); // curare cleft 3–15 mmHg
  if (te > 2 && w > 0.5 * te) {
    // cardiogenic oscillations on the late plateau at low RR (research 03 §4.3)
    for (const tb of x.beats) {
      const z = (t - tb - 0.25) / 0.07;
      if (z > -4 && z < 4) v += CARDIO_MMHG * (Math.exp(-z * z) - 0.35);
    }
  }
  if (x.cpr.active) {
    const ph = ((((t - x.cpr.anchor) * x.cpr.rate) / 60) % 1 + 1) % 1;
    v += CPR_OSC_MMHG * x.cpr.quality * Math.exp(-(((ph - 0.3) / 0.15) ** 2));
  }
  return Math.max(0, v);
}

export interface SamplerState {
  mode: 'sidestream' | 'mainstream';
  neonatal: boolean;
  y: number; // LPF output
  /** The active skin's sidestream module (R39-5): delay (s) and adult 10–90 % rise (s); absent → SAMPLING.sidestream. */
  side?: { delayS: number; riseS: number };
}

export function createSampler(mode: 'sidestream' | 'mainstream' = 'sidestream', neonatal = false): SamplerState {
  return { mode, neonatal, y: 0 };
}

/** Displayed CO2 at 62.5 Hz sample time t: LPF1{airway(t − delay)}, τ = rise(10–90 %)/2.2 (brief §4.4). */
export function sampleCo2(s: SamplerState, t: number, airway: (t: number) => number): number {
  const p = SAMPLING[s.mode];
  const side = s.mode === 'sidestream' ? s.side : undefined; // mainstream has no transport delay on any skin
  const delayS = side ? side.delayS : p.delayS;
  const tau = (s.neonatal ? p.riseNeoS : side ? side.riseS : p.riseS) / 2.2;
  const h = 1 / (CO2_RATE * CO2_SUBSTEPS);
  const a = 1 - Math.exp(-h / tau);
  for (let j = CO2_SUBSTEPS - 1; j >= 0; j--) s.y += (airway(t - j * h - delayS) - s.y) * a;
  return s.y;
}
