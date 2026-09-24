// Implanted pacemaker (brief §5 "Paced"; research 03 §1.7): AAI, VVI, DDD with demand sensing and the four
// faults. Pace pulses are MARKER events, not sampled spikes: a 0.5 ms spike cannot be sampled at 500 Hz and
// monitors draw a standard marker instead (research 03 §1.7). Captured beats use the 'pacedV' template.
import { uniform } from '../../rng/sfc32.ts';
import { makeEvent } from './kernels.ts';
import { RHYTHMS } from './rhythms.ts';
import { applyPMorphology } from './morphology/index.ts';
import { atrialRate, conductAt } from './atria.ts';
import { pWaveKernels } from './templates.ts';
import { HOOKS, NEVER, pushPending, rhythmRate, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import type { PacerFault } from '../../types.ts';

export const DEFAULT_AV_DELAY_MS = 160; // DDD AV delay 120–200 ms (brief §5)
const PACED_P_DELAY_S = 0.01; // atrial capture latency [ENG]

export interface PacerState {
  nextA: number;
  nextV: number;
}

function interval(st: RhythmState, t: number, ctx: RhythmCtx): number {
  return 60 / (st.opts.pacer?.ratePpm ?? rhythmRate(st, t, ctx));
}

function faultHits(st: RhythmState, f: PacerFault, ctx: RhythmCtx): boolean {
  const p = st.opts.pacer;
  if (!p || p.fault !== f) return false;
  const rate = p.faultRate ?? (f === 'failureToSense' ? 1 : 0.3);
  return uniform(ctx.rng.conduction) < rate;
}

function marker(st: RhythmState, t: number, chamber: 1 | 2, captured: boolean): void {
  st.records.push({ type: 'marker', t, kind: 'paceSpike', data: { chamber, captured, tcp: false } });
}

/** Start or stop the pacemaker when a rhythm is applied. */
function onApply(st: RhythmState, _prev: unknown, t0: number, ctx: RhythmCtx): void {
  const mode = RHYTHMS[st.id].pacing;
  if (mode === 'none') {
    st.pacer = undefined;
    return;
  }
  const iv = interval(st, t0, ctx);
  st.pacer = { nextA: mode === 'VVI' ? NEVER : t0 + 0.1, nextV: mode === 'VVI' ? t0 + iv : NEVER };
}

/** Sensed intrinsic P: AAI/DDD inhibit the atrial output; DDD tracks it with a ventricular output after the AV delay. */
function onSensedP(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const pc = st.pacer;
  const mode = RHYTHMS[st.id].pacing;
  if (!pc || mode === 'VVI' || mode === 'none') return;
  if (faultHits(st, 'failureToSense', ctx)) return;
  pc.nextA = t + interval(st, t, ctx);
  if (mode === 'DDD') pc.nextV = t + (st.opts.pacer?.avDelayMs ?? DEFAULT_AV_DELAY_MS) / 1000;
}

/** Sensed intrinsic ventricular beat: VVI/DDD inhibit (reset) the ventricular output. */
function onBeat(st: RhythmState, p: { origin: string }, ctx: RhythmCtx): void {
  const pc = st.pacer;
  const mode = RHYTHMS[st.id].pacing;
  if (!pc || p.origin === 'paced' || mode === 'AAI' || mode === 'none') return;
  if (faultHits(st, 'failureToSense', ctx)) return;
  const t = st.lastVT;
  if (mode === 'VVI') pc.nextV = t + interval(st, t, ctx);
  else {
    pc.nextV = NEVER;
    pc.nextA = Math.max(pc.nextA, t + interval(st, t, ctx) - (st.opts.pacer?.avDelayMs ?? DEFAULT_AV_DELAY_MS) / 1000);
  }
}

function fireA(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const pc = st.pacer as PacerState;
  const d = RHYTHMS[st.id];
  pc.nextA = t + interval(st, t, ctx);
  if (faultHits(st, 'oversensing', ctx) || faultHits(st, 'failureToPace', ctx)) return; // no spike
  const captured = !faultHits(st, 'failureToCapture', ctx);
  marker(st, t, 1, captured);
  if (!captured) return;
  const tp = t + PACED_P_DELAY_S;
  st.events.push(makeEvent(tp, applyPMorphology(pWaveKernels(), ctx.mods)));
  st.records.push({ type: 'atrial', t: tp, kind: 'paced', conducted: d.pacing === 'AAI' });
  st.atria.lastT = tp;
  st.atria.nextT = tp + 60 / Math.max(20, atrialRate(st, d, tp, ctx)); // atrial capture resets the sinus node
  if (d.pacing === 'AAI') {
    const pr = conductAt(st, tp, atrialRate(st, d, tp, ctx), ctx);
    if (pr !== null) pushPending(st, { t: tp + pr / 1000, origin: 'atrial', template: d.conductedTemplate, prMs: pr, pvc: false, coupling: 0, bypass: false });
  } else {
    pc.nextV = t + (st.opts.pacer?.avDelayMs ?? DEFAULT_AV_DELAY_MS) / 1000;
  }
}

function fireV(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const pc = st.pacer as PacerState;
  const mode = RHYTHMS[st.id].pacing;
  pc.nextV = mode === 'VVI' ? t + interval(st, t, ctx) : NEVER;
  if (faultHits(st, 'oversensing', ctx) || faultHits(st, 'failureToPace', ctx)) return;
  const fault = faultHits(st, 'failureToCapture', ctx);
  const refractory = st.respectRefractory && t < st.refractoryUntil;
  const captured = !fault && !refractory;
  marker(st, t, 2, captured);
  if (captured) HOOKS.activate(st, { t, origin: 'paced', template: 'pacedV', prMs: null, pvc: false, coupling: 0, bypass: false }, ctx);
}

export const pacerClock = {
  next(st: RhythmState): number {
    const pc = st.pacer;
    return pc ? Math.min(pc.nextA, pc.nextV) : NEVER;
  },
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void {
    const pc = st.pacer as PacerState;
    if (t === pc.nextA) fireA(st, t, ctx);
    else fireV(st, t, ctx);
  },
};

HOOKS.onApply.push(onApply);
HOOKS.onP.push(onSensedP);
HOOKS.onBeat.push(onBeat);
