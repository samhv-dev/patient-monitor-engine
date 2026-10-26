// Malignant hyperthermia (tables §5.3 `mh`, `dantrolene`; §7 check 21; brief §4.6/§4.9). Pulse has no MH (annex §5.3
// "no Pulse equivalent"): this module is ours. The hypermetabolic ACTIVITY of skeletal muscle is
//   a(t) = severity · r(t) · s,   r = min(1, (t − t0)/MH_ONSET_S)   (the temperature model's ramp)
// and s (0–1) is the fraction NOT suppressed by dantrolene. Dantrolene's PK is the drug model's: the engine passes
// its effect `bus.metabolic.dantroleneE` (0–1) each step and s relaxes toward max(0, 1 − DANT_GAIN·E) with τ
// MH_RELAX_TAU_S (Ca²⁺ re-sequestration and cell recovery take minutes, tables "VCO2 excess decays τ 10–20 min"), so it
// creeps back up as the drug curve wanes (recrudescence). Without dantrolene s stays undefined and a(t) is exactly the
// temperature model's MH factor ramp.
import {
  DANT_GAIN, MH_ONSET_S, MH_PHENOTYPE, MH_PROFILE_SEVERITY, MH_RELAX_TAU_S, MH_SYMP_TAU_S, MH_SUX_LATENCY_S, MH_VO2_PEAK_X,
  MH_VOLATILE_LATENCY_DEFAULT_S, MH_VOLATILE_LATENCY_S, type MhPhenotype,
} from './params.ts';

export interface MhState {
  severity: number; // 0–1
  t0: number; // trigger time, s
  /** E134: this patient's/trigger's peak whole-body VO2 multiple at full activity (the calcium-leak gain). Absent =
   * MH_VO2_PEAK_X, the `typical` phenotype's 2.5. */
  vo2PeakX?: number;
  /** E134: the phenotype the scenario named (words for the card, the log and the Debrief; the number above is what the
   * physiology reads). Absent = `typical`. */
  phenotype?: MhPhenotype;
  s?: number; // unsuppressed fraction (absent = 1)
  /** E117: the unsuppressed fraction as the SYMPATHETIC drive sees it — the same dantrolene target, followed with
   * MH_SYMP_TAU_S (absent = `s`, i.e. 1 untreated; older snapshots have neither). */
  sSymp?: number;
}

/** E134: the peak whole-body VO2 multiple of this MH state (the phenotype's gain; no MH = 1, no excess). */
export function mhVo2PeakX(mh: MhState | null): number {
  return mh ? (mh.vo2PeakX ?? MH_VO2_PEAK_X) : 1;
}

/** The peak VO2 multiple a phenotype name means (an unknown name takes the typical one). */
export const mhPeakXOf = (phenotype: string | undefined): number => MH_PHENOTYPE[phenotype ?? 'typical'] ?? MH_VO2_PEAK_X;

/** MH activity 0–1 at time t (the onset ramp × the dantrolene-unsuppressed fraction). */
export function mhActivity(mh: MhState | null, t: number): number {
  if (!mh) return 0;
  const r = Math.min(1, Math.max(0, (t - mh.t0) / MH_ONSET_S));
  return mh.severity * r * (mh.s ?? 1);
}

/**
 * The MH SYMPATHETIC drive 0–1 at time t (E117): severity × (1 − e^{−(t − t0)/MH_SYMP_TAU_S}) × `sSymp`. The same muscle
 * process as `mhActivity`, but the catecholamine surge follows the muscle's Ca²⁺-driven crisis within minutes both ways:
 * it is front-loaded (τ MH_SYMP_TAU_S, not the 15-min metabolic ramp) and it falls with dantrolene's suppression on the
 * same τ (`sSymp`), whereas the metabolic excess (`s`: VCO2, heat) decays over 10–20 min (MH_RELAX_TAU_S).
 */
export function mhSympDrive(mh: MhState | null, t: number): number {
  if (!mh || t <= mh.t0) return 0;
  return mh.severity * (1 - Math.exp(-(t - mh.t0) / MH_SYMP_TAU_S)) * (mh.sSymp ?? mh.s ?? 1);
}

/** An MH-susceptible patient's trigger exposure (`ps.neuro.mhExposure`, times in s). */
export interface MhExposure {
  sux?: number;
  volatile?: number;
  volatileAgent?: string; // the potent volatile that triggered (its latency is agent-specific)
  /** E134: the susceptible patient's phenotype (`patient.neuro.mhPhenotype`); absent = `typical`. */
  phenotype?: MhPhenotype;
}

/** Who made the current MH state — the triggers ('auto') or the instructor ('instructor'); absent = nobody yet. */
export type MhOwner = 'auto' | 'instructor';

/** The MH onset time the exposure implies (the earliest trigger + its latency), or null (not exposed). */
export function mhOnsetT(x: MhExposure | undefined): number | null {
  const vLat = MH_VOLATILE_LATENCY_S[x?.volatileAgent ?? ''] ?? MH_VOLATILE_LATENCY_DEFAULT_S;
  const ts = [x?.sux !== undefined ? x.sux + MH_SUX_LATENCY_S : Infinity, x?.volatile !== undefined ? x.volatile + vLat : Infinity];
  const t0 = Math.min(...ts);
  return Number.isFinite(t0) ? t0 : null;
}

/**
 * Start (or bring forward) the MH of a susceptible patient from its triggers. The exposure is CONSUMED once: if the
 * instructor's MH already exists when the exposure is first seen, the owner becomes 'instructor' and the triggers never
 * create MH afterwards (so `condition mh 0` stays cleared); if the triggers made it ('auto'), a later, faster trigger
 * may bring a still-latent onset forward, and an MH the instructor clears is not restarted.
 */
export function mhFromExposure(mh: MhState | null, x: MhExposure | undefined, owner: MhOwner | undefined, t: number): { mh: MhState | null; owner: MhOwner | undefined } {
  const t0 = mhOnsetT(x);
  if (t0 === null) return { mh, owner };
  const pheno = x?.phenotype;
  if (owner === undefined) {
    return mh === null
      ? { mh: { severity: MH_PROFILE_SEVERITY, t0, vo2PeakX: mhPeakXOf(pheno), ...(pheno ? { phenotype: pheno } : {}) }, owner: 'auto' }
      : { mh, owner: 'instructor' };
  }
  if (owner === 'auto' && mh !== null && t < mh.t0 && t0 < mh.t0) return { mh: { ...mh, t0 }, owner };
  return { mh, owner };
}

/** 1 Hz (or any dt ≤ 1 s) update of the suppression state from 7g's dantrolene effect `dantE` (0–1). */
export function stepMh(mh: MhState | null, dantE: number, dtS: number): void {
  if (!mh) return;
  if (!(dantE > 0) && mh.s === undefined) return; // Untreated: the temperature model's ramp only
  const target = Math.max(0, 1 - DANT_GAIN * Math.min(1, Math.max(0, dantE)));
  const s = mh.s ?? 1;
  const ss = mh.sSymp ?? s;
  mh.s = target + (s - target) * Math.exp(-dtS / MH_RELAX_TAU_S);
  mh.sSymp = target + (ss - target) * Math.exp(-dtS / MH_SYMP_TAU_S); // E117: the catecholamine share follows faster
}
