// Venegas sigmoid P–V on the lung (audit borrow #8; Venegas, Harris & Simon 1998, J Appl Physiol 84:389). Pulse puts
// the sigmoid on the chest wall; here it is on the lung and the chest wall is linear and shared (A9). Pure functions.
import { VENEGAS_C } from './params.ts';

export interface Sigmoid {
  a: number; // lower asymptote (mL, relative to the FRC state)
  b: number; // range (mL)
  c: number; // pressure of maximal compliance (cmH2O)
  d: number; // width (cmH2O)
}

/** A unit whose volume range is `rangeMl` and whose compliance at P = c is `cMl` (mL/cmH2O); V(0) = 0. */
export function sigmoidFor(rangeMl: number, cMl: number, c = VENEGAS_C): Sigmoid {
  const b = Math.max(1, rangeMl);
  const d = b / (4 * Math.max(1e-3, cMl));
  return { a: -b / (1 + Math.exp(c / d)), b, c, d };
}

export function volumeAt(s: Sigmoid, p: number): number {
  return s.a + s.b / (1 + Math.exp(-(p - s.c) / s.d));
}

/** Transpulmonary pressure for volume v (inverse), clamped 0.1 % inside the asymptotes. */
export function pressureAt(s: Sigmoid, v: number): number {
  const x = Math.min(0.999, Math.max(0.001, (v - s.a) / s.b));
  return s.c - s.d * Math.log(1 / x - 1);
}

/** Compliance dV/dP at volume v (mL/cmH2O). */
export function complianceAt(s: Sigmoid, v: number): number {
  const x = Math.min(0.999, Math.max(0.001, (v - s.a) / s.b));
  return (s.b * x * (1 - x)) / s.d;
}
