import { describe, expect, it } from 'vitest';
import { expm } from '../../../src/l2/pk/linalg.ts';
import { cp, fromClearances, pkStep, pkSystem, zeroState, type PkParams } from '../../../src/l2/pk/compartment.ts';

/** Independent reference: classical RK4 on the ODEs, h = 1e-5 min (0.6 ms). */
function rk4(p: PkParams, x0: number[], rate: number, tMin: number): number[] {
  let x = x0.slice();
  const f = (s: number[]) => [
    -(p.k10 + p.k12 + p.k13) * s[0]! + p.k21 * s[1]! + p.k31 * s[2]! + rate,
    p.k12 * s[0]! - p.k21 * s[1]!,
    p.k13 * s[0]! - p.k31 * s[2]!,
    p.ke0[0]! * (s[0]! / p.v1 - s[3]!),
  ];
  const h = 1e-5;
  for (let t = 0; t < tMin - 1e-12; t += h) {
    const k1 = f(x);
    const k2 = f(x.map((v, i) => v + (h / 2) * k1[i]!));
    const k3 = f(x.map((v, i) => v + (h / 2) * k2[i]!));
    const k4 = f(x.map((v, i) => v + h * k3[i]!));
    x = x.map((v, i) => v + (h / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!));
  }
  return x;
}

const SCHNIDER_53_77: PkParams = fromClearances(4.27, 18.9, 238, 1.89, 1.29, 0.836, [0.456]);

describe('exact compartment step', () => {
  it('expm of a diagonal matrix is the elementwise exponential', () => {
    const e = expm([-1, 0, 0, -3], 2);
    expect(e[0]).toBeCloseTo(Math.exp(-1), 12);
    expect(e[3]).toBeCloseTo(Math.exp(-3), 12);
    expect(e[1]).toBe(0);
  });
  it('bolus: 0.1 s exact steps match RK4 to 1e-5 relative after 5 min', () => {
    const sys = pkSystem(SCHNIDER_53_77, 0.1);
    let x = zeroState(SCHNIDER_53_77);
    x[0] = 154;
    for (let s = 0; s < 3000; s++) x = pkStep(sys, x, 0);
    const ref = rk4(SCHNIDER_53_77, [154, 0, 0, 0], 0, 5);
    for (let i = 0; i < 4; i++) expect(Math.abs(x[i]! - ref[i]!) / Math.abs(ref[i]!)).toBeLessThan(1e-5);
  });
  it('infusion: one 60 s step equals 600 steps of 0.1 s (exact ZOH, no step-size error)', () => {
    const a = pkStep(pkSystem(SCHNIDER_53_77, 60), zeroState(SCHNIDER_53_77), 10);
    let b = zeroState(SCHNIDER_53_77);
    const s = pkSystem(SCHNIDER_53_77, 0.1);
    for (let k = 0; k < 600; k++) b = pkStep(s, b, 10);
    for (let i = 0; i < 4; i++) expect(a[i]!).toBeCloseTo(b[i]!, 9);
  });
  it('steady state of a constant infusion is R/CL in plasma and the effect site', () => {
    const p = fromClearances(10, 20, 0, 1, 2, 0, [0.5]);
    let x = zeroState(p);
    const s = pkSystem(p, 60);
    for (let k = 0; k < 2000; k++) x = pkStep(s, x, 5);
    expect(cp(p, x)).toBeCloseTo(5, 6);
    expect(x[3]).toBeCloseTo(5, 6);
  });
  it('two effect sites carry their own ke0', () => {
    const p = fromClearances(5, 0, 0, 1, 0, 0, [0.16, 0.26]);
    let x = zeroState(p);
    x[0] = 50;
    const s = pkSystem(p, 1);
    for (let k = 0; k < 60; k++) x = pkStep(s, x, 0);
    expect(x.length).toBe(5);
    expect(x[4]!).toBeGreaterThan(x[3]!); // faster site ahead in the first minute
  });
});
