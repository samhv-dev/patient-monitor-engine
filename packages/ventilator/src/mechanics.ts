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
  return p;
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
