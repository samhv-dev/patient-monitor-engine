// Drug → rhythm hooks (Stage 7g decisions 11–12). A PURE decision on the pipeline's bus/concentrations; the engine
// applies the request through the rhythm engine's public applyRhythm (Stage 7g never edits l2/ecg/**).
import type { RhythmId, RhythmOpts } from '../../types.ts';
import { concOf, type PkState } from './pipeline.ts';

export interface RhythmHookState {
  aden: { active: boolean; from: string; peak: number };
  lastStage: number; // 0 none, 1 brady, 2 VF
  mgDone: boolean;
}

export const createHookState = (): RhythmHookState => ({ aden: { active: false, from: 'sinus', peak: 0 }, lastStage: 0, mgDone: false });

const NODE_DEPENDENT = ['svtAvnrt', 'svtAvrt'];
const ATRIAL = ['afib', 'aflutter', 'atrialTach', 'mat'];
const SINUS_GROUP = ['sinus', 'sinusBrady', 'sinusTachy', 'sinusArrhythmia'];

export function rhythmRequest(pk: PkState, hs: RhythmHookState, current: { id: RhythmId; pinned: boolean }, t: number): { id: RhythmId; opts: RhythmOpts } | null {
  void t;
  if (current.pinned) return null;
  const block = pk.bus.avNodeBlock;
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
