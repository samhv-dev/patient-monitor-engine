// Rhythm-engine state and shared helpers (brief §4.1 "Rhythm engine"). All state is plain JSON-safe data so the
// engine can structuredClone it every tick (look-ahead) and snapshot it.
import type { Sfc32State, StreamName } from '../../rng/sfc32.ts';
import type { BeatOrigin, EngineEvent, Modifiers, RhythmId, RhythmOpts } from '../../types.ts';
import type { EcgEvent } from './kernels.ts';
import type { HrvPhase } from './hrv.ts';
import type { BeatTemplateId } from './beat-templates.ts';
import { RHYTHMS, type RhythmDef } from './rhythms.ts';

/** JSON-safe stand-in for ±Infinity. */
export const NEVER = 1e12;

export interface PendingV {
  t: number;
  origin: BeatOrigin;
  template: BeatTemplateId;
  prMs: number | null;
  pvc: boolean;
  coupling: number; // PVC coupling as a fraction of the prevailing RR (0 for non-PVC)
  /** Primary pacemakers that set their own timing (foci, AF junction, PVC runs) skip the refractory check. */
  bypass: boolean;
  /** Amplitude scale (signed) replacing the default; torsades/agonal use it. */
  scale?: number;
  /** Frontal-plane rotation of the QRS-T vectors, radians (polymorphic VT / torsades). */
  twistRad?: number;
  /** Pre-excitation fraction for the 'wpw' template (0.4–1.8). */
  pre?: number;
}

/** A continuous atrial wave: Σ a_i·sin(2π·f_i·s + ph_i) along the VCG direction `dir`, between start and end. */
export interface FWave {
  kind: 'fib' | 'flutter';
  start: number;
  end: number;
  /** Sinusoids (Stage 1.1); empty for an AF wave played from the recorded texture (af-texture.ts). */
  f: number[];
  ph: number[];
  a: number[];
  dir: [number, number, number];
  /** Flutter only: the atrial rate it was built for (bpm). */
  rateBpm?: number;
  /** AF texture seed (af-texture.ts). */
  seed?: number;
}

export interface RhythmState {
  id: RhythmId;
  opts: RhythmOpts;
  respectRefractory: boolean;
  planT: number;
  atria: { nextT: number; groupPos: number; groupRatio: number; lastT: number; pac: { blocked: boolean; aberrant: boolean } | null };
  junction: { refUntil: number; v: number; vT: number };
  pending: PendingV[];
  focusNextT: number;
  /** Focus beat counter since the focus started (torsades twist, agonal decay, polymorphic walk). */
  focusN: number;
  /** Time the current rhythm started (applyRhythm). */
  startT: number;
  /** Polymorphic VT axis random walk (radians). */
  focusAxis: number;
  escapeNextT: number;
  refractoryUntil: number;
  /** The AV node conducts no P before this time (AV_NODE_ERP_S after the last conducted P). */
  avRefUntil: number;
  /** Was the last ventricular activation a conducted supraventricular beat (not a PVC/escape/focus beat)? */
  lastConducted: boolean;
  lastVT: number;
  lastSupraT: number;
  lastWasPvc: boolean;
  /** Supraventricular beats since the last PVC (ectopy pattern counter). */
  ectopyCount: number;
  /** Active and recently ended atrial waves (the generator may still need an ended one for unrendered samples). */
  fwaves: FWave[];
  events: EcgEvent[];
  records: EngineEvent[];
  beatSeq: number;
  pendingSwitch: { id: RhythmId; opts: RhythmOpts; respectRefractory: boolean } | null;
  /** Implanted pacemaker timers (pacing.ts); undefined when the rhythm is not paced. */
  pacer?: { nextA: number; nextV: number } | undefined;
  /** Next transcutaneous pulse (tcp.ts); undefined when TCP is off. */
  tcpNextT?: number | undefined;
}

export interface RhythmCtx {
  /** The L1 'hr' target at time t (bpm, unclamped). */
  hrAt(t: number): number;
  mods: Modifiers;
  rng: Record<StreamName, Sfc32State>;
  hrv: HrvPhase;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function def(st: RhythmState): RhythmDef {
  return RHYTHMS[st.id];
}

/** The rate this rhythm's primary clock runs at, at time t (bpm). */
export function rhythmRate(st: RhythmState, t: number, ctx: RhythmCtx): number {
  const d = RHYTHMS[st.id];
  return clamp(ctx.hrAt(t), d.rateRange[0], d.rateRange[1]);
}

export function pushPending(st: RhythmState, p: PendingV): void {
  let i = st.pending.length;
  while (i > 0 && (st.pending[i - 1] as PendingV).t > p.t) i--;
  st.pending.splice(i, 0, p);
}

export type SenseHook = (st: RhythmState, t: number, ctx: RhythmCtx) => void;
export type BeatHook = (st: RhythmState, p: PendingV, ctx: RhythmCtx) => void;
export type ApplyHook = (st: RhythmState, prev: RhythmId, t0: number, ctx: RhythmCtx) => void;

/**
 * Late-bound hooks so feature modules (pacing, VF, ectopy) never import rhythm-engine.ts (no import cycles):
 * activate / apply = rhythm-engine's activateVentricle / applyRhythm; onP runs after every sinus/ectopic P wave;
 * onBeat runs after every activated ventricular beat; onApply runs at the end of every applyRhythm.
 */
export const HOOKS: {
  activate: (st: RhythmState, p: PendingV, ctx: RhythmCtx) => boolean;
  apply: (st: RhythmState, id: RhythmId, opts: RhythmOpts, at: number, respectRefractory: boolean, ctx: RhythmCtx) => void;
  onP: SenseHook[];
  onBeat: BeatHook[];
  onApply: ApplyHook[];
} = {
  activate: () => false,
  apply: () => undefined,
  onP: [],
  onBeat: [],
  onApply: [],
};
