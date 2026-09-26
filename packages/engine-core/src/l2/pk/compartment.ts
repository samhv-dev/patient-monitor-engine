// Linear mammillary compartment PK with one or more effect sites (Stage 7g; tables §6.1). States (amounts in the
// drug's amount unit, concentrations in amount/L):
//   x = [A1, A2, A3, Ce_1 … Ce_m]
//   dA1/dt = −(k10 + k12 + k13)·A1 + k21·A2 + k31·A3 + R(t)      R: infusion, amount/min
//   dA2/dt = k12·A1 − k21·A2
//   dA3/dt = k13·A1 − k31·A3
//   dCe_i/dt = ke0_i·(A1/V1 − Ce_i)
// A 1- or 2-compartment model sets k13 = k31 = 0 (and k12 = k21 = 0): the unused states stay at zero. Rate constants
// are per MINUTE (the published unit); the step is exact for a piecewise-constant R (zero-order hold): the augmented
// matrix [[A, b], [0, 0]]·dt is exponentiated once per (parameters, dt) and cached, so a step is one 5×5–6×6
// matrix-vector product. A bolus adds to A1 instantaneously (the published models' convention).
import { expm, matVec } from './linalg.ts';

export interface PkParams {
  v1: number; // central volume, L
  k10: number; k12: number; k21: number; k13: number; k31: number; // /min
  ke0: number[]; // /min, one per effect site (≥ 1)
}

export interface PkSystem {
  n: number; // states = 3 + ke0.length
  ad: number[]; // n×n
  bd: number[]; // n: response to R = 1 amount/min over dt
}

/** Microconstants from volumes (L) and clearances (L/min): k10 = CL1/V1, k12 = CL2/V1, k21 = CL2/V2, … */
export function fromClearances(v1: number, v2: number, v3: number, cl1: number, cl2: number, cl3: number, ke0: number[]): PkParams {
  return { v1, k10: cl1 / v1, k12: v2 > 0 ? cl2 / v1 : 0, k21: v2 > 0 ? cl2 / v2 : 0, k13: v3 > 0 ? cl3 / v1 : 0, k31: v3 > 0 ? cl3 / v3 : 0, ke0 };
}

const CACHE = new Map<string, PkSystem>();
const CACHE_MAX = 512;

/** The exact discrete system for step dtS seconds (cached by value: parameters are plain numbers). */
export function pkSystem(p: PkParams, dtS: number): PkSystem {
  const key = `${p.v1}|${p.k10}|${p.k12}|${p.k21}|${p.k13}|${p.k31}|${p.ke0.join(',')}|${dtS}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const m = p.ke0.length;
  const n = 3 + m;
  const N = n + 1; // + the input state
  const a = new Array<number>(N * N).fill(0);
  const set = (i: number, j: number, v: number) => {
    a[i * N + j] = v;
  };
  set(0, 0, -(p.k10 + p.k12 + p.k13));
  set(0, 1, p.k21);
  set(0, 2, p.k31);
  set(1, 0, p.k12);
  set(1, 1, -p.k21);
  set(2, 0, p.k13);
  set(2, 2, -p.k31);
  for (let i = 0; i < m; i++) {
    const k = p.ke0[i] as number;
    set(3 + i, 0, k / p.v1);
    set(3 + i, 3 + i, -k);
  }
  set(0, n, 1); // R enters A1
  const dtMin = dtS / 60;
  const e = expm(a.map((v) => v * dtMin), N);
  const ad: number[] = [];
  const bd: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) ad.push(e[i * N + j] as number);
    bd.push(e[i * N + n] as number);
  }
  const sys = { n, ad, bd };
  if (CACHE.size >= CACHE_MAX) CACHE.clear();
  CACHE.set(key, sys);
  return sys;
}

/** One exact step: x ← Ad·x + Bd·R (R in amount/min, constant over the step). Returns the new state. */
export function pkStep(sys: PkSystem, x: readonly number[], rate: number): number[] {
  const y = matVec(sys.ad, x, sys.n);
  if (rate !== 0) for (let i = 0; i < sys.n; i++) y[i] = (y[i] as number) + (sys.bd[i] as number) * rate;
  return y;
}

export const cp = (p: PkParams, x: readonly number[]): number => (x[0] as number) / p.v1;
export const zeroState = (p: PkParams): number[] => new Array<number>(3 + p.ke0.length).fill(0);
