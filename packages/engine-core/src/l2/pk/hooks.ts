// Drug → rhythm hooks (Stage 7g decisions 11–12). A PURE decision on the pipeline's bus/concentrations; the engine
// applies the request through the rhythm engine's public applyRhythm (Stage 7g never edits l2/ecg/**).
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { uniform, type Sfc32State } from '../../rng/sfc32.ts'; // FU-4 G7: the repeat-sux draw is seeded
import { concOf, type PkState } from './pipeline.ts';
import { DRUGS } from './data/drugs.ts'; // FU-2 (E-FU2-7)
import { hill } from './pd.ts'; // FU-2 (E-FU2-7)
import type { PdEffect } from './row.ts'; // FU-2 (E-FU2-7)

export interface RhythmHookState {
  aden: { active: boolean; from: string; peak: number };
  lastStage: number; // 0 none, 1 brady, 2 VF
  mgDone: boolean;
  /** FU-4 G7/F10: the repeat-succinylcholine bradyarrhythmia — `drawnFor` is the bolus time already drawn for. */
  sux: { drawnFor: number; until: number; from: RhythmId };
  /** FU-7 (addendum 23): the last conversion-hazard evaluation time (s) — optional: a pre-FU-7 snapshot lacks it (3d). */
  conv?: { lastT: number };
  /** FU-7 (addendum 23 / DI-14c): the accessory-pathway acceleration has fired for this block (reset below 0.3). */
  preexcited?: boolean;
}

export const createHookState = (): RhythmHookState => ({ aden: { active: false, from: 'sinus', peak: 0 }, lastStage: 0, mgDone: false, sux: { drawnFor: -1, until: 0, from: 'sinus' } });

/**
 * FU-4 G7/F10: a SECOND succinylcholine dose given a few minutes after the first, without an anticholinergic, can
 * cause a profound muscarinic bradyarrhythmia — junctional escape, sinus arrest or (reported) asystole. Succinylcholine
 * and its metabolite succinylmonocholine sensitise cardiac muscarinic receptors, which is why the first dose usually
 * does nothing and the second one does, why atropine or glycopyrrolate given first prevents it, and why it is
 * commonest in children (M10 ch. 23 "succinylcholine: bradycardia … especially after a second dose and in children").
 * It is a RISK, not a certainty, so it is a seeded draw on the `outcome` stream, not a deterministic response.
 */
export const SUX_REPEAT_P = 0.35; // adult probability per repeat dose [ENG]
export const SUX_REPEAT_P_CHILD = 0.7; // < 12 y [ENG: "much commoner in children"]
export const SUX_REPEAT_MIN_GAP_S = 90; // a second dose inside the same rapid sequence is one dose
export const SUX_REPEAT_MAX_GAP_S = 1200; // beyond 20 min the sensitisation has gone [ENG]
export const SUX_BRADY_RATE_BPM = 45;
export const SUX_BRADY_S = 60;
export const SUX_MUSC_BLOCK_PROTECT = 0.5; // atropine/glycopyrrolate occupancy that abolishes it

const NODE_DEPENDENT = ['svtAvnrt', 'svtAvrt'];
const ATRIAL = ['afib', 'aflutter', 'atrialTach', 'mat'];
const SINUS_GROUP = ['sinus', 'sinusBrady', 'sinusTachy', 'sinusArrhythmia'];

/** FU-2 (E-FU2-7): adenosine's OWN AV-nodal block (its row's avNode entry). The β-blocker and amiodarone rows feed the
 * bus's avNodeBlock too (AF rate control), and stacked rate control must never fire the adenosine pause/conversion. */
const ADEN_AV = DRUGS.adenosine?.pd.find((e) => e.target === 'avNode') as PdEffect;
const adenosineBlock = (pk: PkState) => hill(concOf(pk, 'adenosine'), ADEN_AV.ec50, ADEN_AV.emax, ADEN_AV.hill ?? 1);

/** FU-7 (addendum 23) conversion hazards, /s, at full occupancy; λ = −ln(1 − p)/T. PROCAMIO (Ortiz 2017, Eur Heart J
 * 38:1329), stable wide-QRS tachycardia, abstract: "Tachycardia terminated within 40 min in 22 (67%) procainamide and
 * 11 (38%) amiodarone patients" — so amiodarone 38 % (Step 3's PROCAMIO check; the plan's 25 % was superseded) and
 * procainamide 67 % at 40 min; Gorgels 1996: lidocaine ≈ 20 % at 20 min; Letelier 2003: amiodarone ≈ 25 % of
 * recent-onset AF within 1 h. */
export const L_AMIO_VT = -Math.log(0.62) / 2400;
export const L_PROC_VT = -Math.log(0.33) / 2400;
export const L_LIDO_VT = -Math.log(0.8) / 1200;
export const L_AMIO_AF = -Math.log(0.75) / 3600;
/** FU-7 (DI-14c): VF on an AV-nodal block of pre-excited AF, per event [ENG — Q10, R44 calibration]. */
export const PREEXCITED_VF_P = 0.2;
const VT_RHYTHMS: readonly string[] = ['vtMono'];

export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean; pulseless?: boolean }, t: number, outcomeRng?: Sfc32State): { id: RhythmId; opts: RhythmOpts; hold?: boolean } | null {
  if (current.pinned) return null;
  // FU-4 G7/F10: the repeat-succinylcholine bradyarrhythmia (seeded; abolished by an anticholinergic given first)
  const bt = pk.drugs['succinylcholine']?.bolusTimes ?? [];
  if (hs.sux.until > 0) {
    if (t >= hs.sux.until) {
      hs.sux.until = 0;
      return { id: hs.sux.from, opts: {} };
    }
  } else if (bt.length >= 2) {
    const last = bt[bt.length - 1] as number;
    const gap = last - (bt[bt.length - 2] as number);
    if (
      last > hs.sux.drawnFor && gap >= SUX_REPEAT_MIN_GAP_S && gap <= SUX_REPEAT_MAX_GAP_S &&
      (pk.fx.muscBlock ?? 0) < SUX_MUSC_BLOCK_PROTECT && SINUS_GROUP.includes(current.id)
    ) {
      hs.sux.drawnFor = last;
      const p = pk.patient.ageY < 12 ? SUX_REPEAT_P_CHILD : SUX_REPEAT_P;
      if (outcomeRng !== undefined && uniform(outcomeRng) < p) {
        hs.sux.until = t + SUX_BRADY_S;
        hs.sux.from = current.id;
        return { id: 'junctionalEscape', opts: { rateBpm: SUX_BRADY_RATE_BPM }, hold: true }; // the vagal rate is the node's, not the circulation's, for its 60 s
      }
    }
  }
  const block = adenosineBlock(pk); // FU-2 (E-FU2-7): was pk.bus.avNodeBlock
  // adenosine
  if (!hs.aden.active && block >= 0.5 && (NODE_DEPENDENT.includes(current.id) || ATRIAL.includes(current.id) || SINUS_GROUP.includes(current.id))) {
    hs.aden = { active: true, from: current.id, peak: block };
    if (SINUS_GROUP.includes(current.id)) return { id: 'sinusPause', opts: {} };
    // AV-node-dependent SVT: transient ventricular standstill with P waves (Task 23). avb3Narrow cannot carry the
    // intended 20/min escape (its junctional range is 40–60/min, and MODELED mode drives an escape rhythm's rate from
    // the circulation); pWaveAsystole has no escape and no rate drive, so the pause is the block's own duration.
    if (NODE_DEPENDENT.includes(current.id)) return { id: 'pWaveAsystole', opts: { atrialRateBpm: 110 } };
    return { id: 'avb3Narrow', opts: { atrialRateBpm: 110, rateBpm: 20 } };
  }
  if (hs.aden.active) {
    hs.aden.peak = Math.max(hs.aden.peak, block);
    if (block < 0.5) {
      hs.aden.active = false;
      if (NODE_DEPENDENT.includes(hs.aden.from)) return hs.aden.peak >= 0.8 ? { id: 'sinus', opts: { rateBpm: 95 } } : { id: hs.aden.from as RhythmId, opts: {} };
      if (SINUS_GROUP.includes(hs.aden.from)) return { id: 'sinus', opts: {} };
      return { id: hs.aden.from as RhythmId, opts: {} };
    }
    return null;
  }
  // FU-7 (addendum 23 / DI-14c): AV-nodal block in PRE-EXCITED AF favours the accessory pathway — the rate RISES and VF
  // may follow (ALS; M10 ch. 25). The teaching hazard adenosine, verapamil and diltiazem carry. One VF draw per event
  // at PREEXCITED_VF_P [ENG: the direction is the ALS warning; the size has no source — Q10].
  if (hs.preexcited && pk.bus.avNodeBlock < 0.3) hs.preexcited = false;
  if (current.id === 'preexcitedAf' && pk.bus.avNodeBlock >= 0.5 && !hs.preexcited) {
    hs.preexcited = true;
    if (outcomeRng && uniform(outcomeRng) < PREEXCITED_VF_P) return { id: 'vfCoarse', opts: {}, hold: false };
    return { id: 'preexcitedAf', opts: { rateBpm: 220 }, hold: false };
  }
  // FU-7 (addendum 23): antiarrhythmic conversion as a HAZARD per second, scaled by the drug's own occupancy — ONLY in a
  // PERFUSING rhythm (ruling 5): pulseless VT/VF is Task 12's shock path, and amiodarone does not convert VF by itself
  // (ARREST 1999, ALPS 2016: λ_vf = 0). Sources on the constants below.
  hs.conv ??= { lastT: t }; // 3d: a pre-FU-7 snapshot
  const dt = Math.max(0, t - hs.conv.lastT);
  hs.conv.lastT = t;
  if (dt > 0 && outcomeRng && current.pulseless !== true) {
    const u = (id: string, ec50: number) => hill(concOf(pk, id), ec50, 1);
    const lam = VT_RHYTHMS.includes(current.id)
      ? L_AMIO_VT * u('amiodarone', 1) + L_PROC_VT * u('procainamide', 1) + L_LIDO_VT * u('lidocaine', 3)
      : ATRIAL.includes(current.id)
        ? L_AMIO_AF * u('amiodarone', 1) + L_PROC_VT * 0.5 * u('procainamide', 1)
        : 0;
    if (lam > 0 && uniform(outcomeRng) < 1 - Math.exp(-lam * dt)) return { id: 'sinus', opts: { rateBpm: 80 }, hold: false };
  }
  // LAST
  const cv = pk.bus.last.cvE;
  if (cv >= 0.9 && hs.lastStage < 2) {
    hs.lastStage = 2;
    return { id: 'vfCoarse', opts: {} };
  }
  if (cv >= 0.6 && hs.lastStage < 1 && SINUS_GROUP.includes(current.id)) {
    hs.lastStage = 1;
    return { id: 'sinusBrady', opts: { rateBpm: 40 } };
  }
  // magnesium on torsades
  if (current.id === 'torsades' && !hs.mgDone && concOf(pk, 'magnesium') >= 30) {
    hs.mgDone = true;
    return { id: 'sinus', opts: {} };
  }
  return null;
}
