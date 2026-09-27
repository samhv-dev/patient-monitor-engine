// Malignant hyperthermia (tables §5.3 `mh`, `dantrolene`; §7 check 21; brief §4.6/§4.9). Pulse has no MH (annex §5.3
// "no Pulse equivalent"): this module is ours. The hypermetabolic ACTIVITY of skeletal muscle is
//   a(t) = severity · r(t) · s,   r = min(1, (t − t0)/MH_ONSET_S)   (Stage 3's ramp, unchanged)
// and s (0–1) is the fraction NOT suppressed by dantrolene. Dantrolene's PK is Stage 7g's (R51 §1): the engine passes
// 7g's effect `bus.metabolic.dantroleneE` (0–1) each step and s relaxes toward max(0, 1 − DANT_GAIN·E) with τ
// MH_RELAX_TAU_S (Ca²⁺ re-sequestration and cell recovery take minutes, tables "VCO2 excess decays τ 10–20 min"), so it
// creeps back up as 7g's curve wanes (recrudescence). Without dantrolene s stays undefined and a(t) is exactly Stage
// 3's MH factor ramp.
import { DANT_GAIN, MH_ONSET_S, MH_RELAX_TAU_S } from './params.ts';

export interface MhState {
  severity: number; // 0–1
  t0: number; // trigger time, s
  s?: number; // unsuppressed fraction (absent = 1)
}

/** MH activity 0–1 at time t (Stage 3's ramp × the dantrolene-unsuppressed fraction). */
export function mhActivity(mh: MhState | null, t: number): number {
  if (!mh) return 0;
  const r = Math.min(1, Math.max(0, (t - mh.t0) / MH_ONSET_S));
  return mh.severity * r * (mh.s ?? 1);
}

/** 1 Hz (or any dt ≤ 1 s) update of the suppression state from 7g's dantrolene effect `dantE` (0–1). */
export function stepMh(mh: MhState | null, dantE: number, dtS: number): void {
  if (!mh) return;
  if (!(dantE > 0) && mh.s === undefined) return; // untreated: Stage 3 ramp only
  const target = Math.max(0, 1 - DANT_GAIN * Math.min(1, Math.max(0, dantE)));
  const s = mh.s ?? 1;
  mh.s = target + (s - target) * Math.exp(-dtS / MH_RELAX_TAU_S);
}
