// Malignant hyperthermia (tables §5.3 `mh`, `dantrolene`; §7 check 21; brief §4.6/§4.9). Pulse has no MH (annex §5.3
// "no Pulse equivalent"): this module is ours. The hypermetabolic ACTIVITY of skeletal muscle is
//   a(t) = severity · r(t) · s,   r = min(1, (t − t0)/MH_ONSET_S)   (Stage 3's ramp, unchanged)
// and s (0–1) is the fraction NOT suppressed by dantrolene. Dantrolene's PK is Stage 7g's (R51 §1): the engine passes
// 7g's effect `bus.metabolic.dantroleneE` (0–1) each step and s relaxes toward max(0, 1 − DANT_GAIN·E) with τ
// MH_RELAX_TAU_S (Ca²⁺ re-sequestration and cell recovery take minutes, tables "VCO2 excess decays τ 10–20 min"), so it
// creeps back up as 7g's curve wanes (recrudescence). Without dantrolene s stays undefined and a(t) is exactly Stage
// 3's MH factor ramp.
import {
  DANT_GAIN, MH_ONSET_S, MH_PROFILE_SEVERITY, MH_RELAX_TAU_S, MH_SUX_LATENCY_S, MH_VOLATILE_LATENCY_DEFAULT_S, MH_VOLATILE_LATENCY_S,
} from './params.ts';

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

/** FU-10 E1: an MH-susceptible patient's trigger exposure (7f `ps.neuro.mhExposure`, times in s). */
export interface MhExposure {
  sux?: number;
  volatile?: number;
  volatileAgent?: string; // the potent volatile that triggered (its latency is agent-specific)
}

/** FU-10 E1: who made the current MH state — the triggers ('auto') or the instructor ('instructor'); absent = nobody yet. */
export type MhOwner = 'auto' | 'instructor';

/** FU-10 E1: the MH onset time the exposure implies (the earliest trigger + its latency), or null (not exposed). */
export function mhOnsetT(x: MhExposure | undefined): number | null {
  const vLat = MH_VOLATILE_LATENCY_S[x?.volatileAgent ?? ''] ?? MH_VOLATILE_LATENCY_DEFAULT_S;
  const ts = [x?.sux !== undefined ? x.sux + MH_SUX_LATENCY_S : Infinity, x?.volatile !== undefined ? x.volatile + vLat : Infinity];
  const t0 = Math.min(...ts);
  return Number.isFinite(t0) ? t0 : null;
}

/**
 * FU-10 E1 (D3): start (or bring forward) the MH of a susceptible patient from its triggers. The exposure is CONSUMED
 * once: if the instructor's MH already exists when the exposure is first seen, the owner becomes 'instructor' and the
 * triggers never create MH afterwards (so `condition mh 0` stays cleared); if the triggers made it ('auto'), a later,
 * faster trigger may bring a still-latent onset forward, and an MH the instructor clears is not restarted.
 */
export function mhFromExposure(mh: MhState | null, x: MhExposure | undefined, owner: MhOwner | undefined, t: number): { mh: MhState | null; owner: MhOwner | undefined } {
  const t0 = mhOnsetT(x);
  if (t0 === null) return { mh, owner };
  if (owner === undefined) return mh === null ? { mh: { severity: MH_PROFILE_SEVERITY, t0 }, owner: 'auto' } : { mh, owner: 'instructor' };
  if (owner === 'auto' && mh !== null && t < mh.t0 && t0 < mh.t0) return { mh: { ...mh, t0 }, owner };
  return { mh, owner };
}

/** 1 Hz (or any dt ≤ 1 s) update of the suppression state from 7g's dantrolene effect `dantE` (0–1). */
export function stepMh(mh: MhState | null, dantE: number, dtS: number): void {
  if (!mh) return;
  if (!(dantE > 0) && mh.s === undefined) return; // untreated: Stage 3 ramp only
  const target = Math.max(0, 1 - DANT_GAIN * Math.min(1, Math.max(0, dantE)));
  const s = mh.s ?? 1;
  mh.s = target + (s - target) * Math.exp(-dtS / MH_RELAX_TAU_S);
}
