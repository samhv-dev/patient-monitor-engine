// Lung mechanics of the original simulator (ventilator-sim-hamilton.html v1.9, "ENGINE" block), ported line
// for line: single-compartment equation of motion Paw + Pmus = V/C + R·Q + PEEP with a non-linear recoil
// (airway closure, upper inflection, stress index), expiratory flow limitation and the patient's Pmus waveform.
// Keep the arithmetic in the original order: the fidelity test compares against traces of the original.
import type { Shape, VentConfig, VentState } from './types.ts';

export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);

export function easeShape(x: number, sh: Shape): number {
  x = clamp(x, 0, 1);
  if (sh === 'linear') return x;
  if (sh === 'smoothstep') return x * x * (3 - 2 * x);
  if (sh === 'halfcos') return 0.5 - 0.5 * Math.cos(Math.PI * x);
  if (sh === 'exp') return 1 - Math.exp(-3 * x);
  return x;
}

/** Predicted body weight (kg) from height and sex (Devine; the original's `pbw`). */
export function pbw(c: VentConfig): number {
  const hin = c.height / 2.54;
  const base = c.sex === 'female' ? 45.5 : 50;
  return Math.max(30, base + 2.3 * (hin - 60));
}

/** Elastic recoil (cmH2O above PEEP) at volume v (mL above the PEEP volume). */
export function recoilPressure(c: VentConfig, v: number): number {
  const C = c.compliance;
  let p = v / C;
  if (c.airwayClosure) {
    const vO = c.recruitedVol > 0 ? c.recruitedVol : 150;
    if (v < vO) p = c.openPressure * Math.sqrt(clamp(v / vO, 0, 1));
    else p = c.openPressure + (v - vO) / C;
  }
  if (c.uip) {
    const pU = c.uipThresh - c.peep;
    if (p > pU) p = pU + (p - pU) * 2.2;
  }
  if (c.stressIdx && c.stressB !== 1.0) {
    const f = clamp(v / 700, 0.001, 1.2);
    p *= Math.pow(f, c.stressB - 1);
  }
  return p + pleuralOpening(c, v);
}

/** 7a's resting pleural pressure P_PL0 −4 mmHg (Smith 2004) in cmH2O: the lung stays open while Ppl < PEEP. */
export const PPL_REST_CMH2O = 4 / 0.7356;
/** Volume over which a collapsed lung re-opens (v1.9's airway-closure default recruited volume, 150 mL). */
export const PLEURAL_OPEN_ML = 150;
/**
 * Stage V.1 (G7b ruling 5): with the pleural space above normal by `c.pleural`, the end-expiratory pleural pressure
 * (P_PL0 + pleural) exceeds the alveolar pressure (PEEP) by E = pleural − 5.44 − PEEP; the lung is then collapsed at
 * end-expiration and every breath must first raise the alveolar pressure by E (the v1.9 opening shape over 150 mL)
 * before tidal volume enters. E = 0 for every reference scenario (pleural 0) and for an effusion or a haemothorax at
 * their default size once PEEP ≥ 3 (the lung only loses volume); a 3 L haemothorax (8.2 cmH2O) at ZEEP gives E 2.76 —
 * the same physics, kept [ENG] (plan Decision 1). The expiratory hold reads set PEEP: the collapsed units are closed off.
 */
export function pleuralOpening(c: VentConfig, v: number): number {
  const e = c.pleural - PPL_REST_CMH2O - c.peep;
  return c.pleural > 0 && e > 0 ? e * Math.sqrt(clamp(v / PLEURAL_OPEN_ML, 0, 1)) : 0;
}

const EFL_SEVERITY = { mild: 1.8, moderate: 3.0, severe: 5.0 } as const;

/** Expiratory resistance (cmH2O/L/s): flow limitation multiplies R, PEEP stents it (floor 0.3). */
export function expResistance(c: VentConfig): number {
  let R = c.resistance;
  if (c.efl) {
    const sev = c.eflSeverity === 'custom' ? 1 / Math.max(0.05, c.eflK) : EFL_SEVERITY[c.eflSeverity] || 3;
    const st = 1 - (c.peepStent / 100) * clamp((c.peep - 3) / 12, 0, 1);
    R *= sev * clamp(st, 0.3, 1);
  }
  return R;
}

/** Patient muscle pressure (cmH2O, positive = inspiratory) t seconds into a neural breath. */
export function pmusValue(c: VentConfig, t: number): number {
  const A = c.pmus * (0.4 + 0.6 * (c.responsiveness / 100));
  const tr = c.pmusRise;
  const th = c.pmusHold;
  const td = c.pmusDecay;
  if (t < 0) return 0;
  if (t < tr) return A * easeShape(t / tr, c.riseShape);
  if (t < tr + th) return A;
  if (t < tr + th + td) return A * (1 - easeShape((t - tr - th) / td, c.decayShape));
  return 0;
}
export const pmusDuration = (c: VentConfig): number => c.pmusRise + c.pmusHold + c.pmusDecay;

/**
 * The original's LCG (`simRand`). The float multiply is DELIBERATE: `seed * 1103515245` exceeds 2^53 and the
 * rounding is part of the sequence — Math.imul would give a different stream and break the fidelity traces.
 */
export function simRand(vs: VentState): number {
  vs.seed = (vs.seed * 1103515245 + 12345) & 0x7fffffff;
  return vs.seed / 0x7fffffff;
}
