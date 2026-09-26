// Target-controlled infusion (Stage 7g). Every TCI_DT_S the controller chooses ONE rate for the next interval:
//   plasma targeting (Jacobs 1990): the rate that puts Cp exactly on target at the end of the interval;
//   effect-site targeting (Shafer & Gregg 1992): the largest rate for which the predicted Ce never exceeds the
//   target over the horizon, given that the pump stops after this interval. By linearity
//   Ce(k) = Ce_free(k) + r·Ce_unit(k), so r = min_k (target − Ce_free(k)) / Ce_unit(k) over k with Ce_unit(k) > 0 —
//   exact, no search. Both clamp to [0, maxRate] (the pump's limit: 1200 mL/h in the published pumps).
import { pkStep, pkSystem, type PkParams } from './compartment.ts';

export const TCI_DT_S = 10;
export const TCI_HORIZON_STEPS = 90; // 15 min: > 4× the slowest TTPE among TCI drugs (fentanyl 3.6 min)

export type TciMode = 'plasma' | 'effect';

/** Ce response to rate 1 during the first interval, then 0 (cached per parameter set). */
const UNIT = new Map<string, number[]>();
function unitResponse(p: PkParams, site: number): number[] {
  const key = `${p.v1}|${p.k10}|${p.k12}|${p.k21}|${p.k13}|${p.k31}|${p.ke0.join(',')}|${site}`;
  const hit = UNIT.get(key);
  if (hit) return hit;
  const sys = pkSystem(p, TCI_DT_S);
  let x = new Array<number>(sys.n).fill(0);
  const out: number[] = [];
  for (let k = 0; k < TCI_HORIZON_STEPS; k++) {
    x = pkStep(sys, x, k === 0 ? 1 : 0);
    out.push(x[3 + site] as number);
  }
  if (UNIT.size > 256) UNIT.clear();
  UNIT.set(key, out);
  return out;
}

/** The infusion rate (amount/min) for the next TCI_DT_S seconds. `x` is the current state. */
export function tciRate(p: PkParams, x: readonly number[], mode: TciMode, target: number, maxRate: number, site = 0): number {
  const sys = pkSystem(p, TCI_DT_S);
  if (mode === 'plasma') {
    const free = pkStep(sys, x, 0)[0] as number;
    const r = (target * p.v1 - free) / (sys.bd[0] as number);
    return Math.min(maxRate, Math.max(0, r));
  }
  const unit = unitResponse(p, site);
  let xf = x.slice();
  let r = Number.POSITIVE_INFINITY;
  for (let k = 0; k < TCI_HORIZON_STEPS; k++) {
    xf = pkStep(sys, xf, 0);
    const u = unit[k] as number;
    if (u > 1e-12) r = Math.min(r, (target - (xf[3 + site] as number)) / u);
  }
  return Math.min(maxRate, Math.max(0, r));
}
