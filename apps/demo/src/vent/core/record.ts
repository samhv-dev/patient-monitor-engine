// The breath record (plan vent-skin-edp-ts.md §4.3, §3.3 GD1, GD2, GD6, GD16, GD17): what a ventilator reports of the
// last COMPLETE breath, from the 5 ms steps: peak inspiratory flow, Ti (with a pause or an inspiratory hold, as a
// ventilator reports it: research/57 R-08), Te, I:E, the end-expiratory pressure as the EDP-TS measures it (the mean
// airway pressure of the last 50 ms of expiration, R-23); and what the respiratory mechanics read of it: the volume and
// the peak pressure of its inspiratory flow, how long that flow lasted and whether the ventilator gave it at one
// constant rate, the set PEEP it was given at, whether it was a spontaneous breath, and the
// expiratory time constant from its flow–volume curve (N-10). It is fed on every step, frozen or not: freezing the
// display leaves the numbers live (K-07).
import { breathKind, type VentMode, type VentState } from '@pme/ventilator';
import type { BreathRecord } from './types.ts';

/** The window of the end-expiratory pressure, s (research/57 R-23). */
export const PEEP_WINDOW_S = 0.05;

/** The breath in progress once its inspiratory flow has ended (an inspiratory hold reads it before the breath is complete). */
export interface BreathSoFar { t0: number; vtMl: number; pmax: number; tiFlow: number; constFlow: boolean }

export interface RecorderOptions {
  /** How many complete breaths of each kind `breaths()` keeps. */
  perKind: number;
  /** The share of the exhaled volume whose flow–volume slope gives the time constant, [from, to]. */
  tcexpWindow: readonly [number, number];
  /** The fewest samples in that window the slope is read from. */
  tcexpMinSamples: number;
}

export interface Recorder {
  /** Take one 5 ms step's state. */
  step(vs: Readonly<VentState>): void;
  /** The last complete breath, or null before the first. */
  last(): BreathRecord | null;
  /** The last complete breaths of one kind, oldest first. */
  breaths(spont: boolean): readonly BreathRecord[];
  /** The breath in progress, from the end of its inspiratory flow until it is complete; null otherwise. */
  current(): BreathSoFar | null;
  /** Forget every breath (a reset, a new patient); with `kindsOnly`, only the breaths kept by kind (a new mode). */
  clear(kindsOnly?: boolean): void;
}

/** Spontaneous: a breath the patient's effort shapes and ends (a support breath), whatever the mode it came in. */
const SPONT_KINDS: ReadonlySet<VentMode> = new Set(['PSV', 'PAV']);

/**
 * The expiratory time constant (s) from the expiration's [lung volume L, flow L/s] samples: the slope of flow against
 * volume over the window's share of the exhaled volume (a passive lung empties as flow = −volume / τ). NaN when the
 * window holds fewer than `minSamples` samples.
 */
export function timeConstant(samples: ReadonlyArray<readonly [number, number]>, [from, to]: readonly [number, number], minSamples: number): number {
  if (samples.length < minSamples) return Number.NaN;
  const v0 = samples[0]![0];
  const out = v0 - samples[samples.length - 1]![0];
  if (!(out > 0)) return Number.NaN;
  const w = samples.filter(([v]) => (v0 - v) / out >= from && (v0 - v) / out <= to);
  if (w.length < minSamples) return Number.NaN;
  const mv = w.reduce((s, [v]) => s + v, 0) / w.length;
  const mq = w.reduce((s, [, q]) => s + q, 0) / w.length;
  let sxy = 0, sxx = 0;
  for (const [v, q] of w) { sxy += (v - mv) * (q - mq); sxx += (v - mv) ** 2; }
  return sxx > 0 && sxy < 0 ? -sxx / sxy : Number.NaN;
}

/** Without options (a face with no mechanics) no breaths are kept by kind and no time constant is read. */
export function createRecorder(o?: RecorderOptions): Recorder {
  let last: BreathRecord | null = null;
  const kept = { true: [] as BreathRecord[], false: [] as BreathRecord[] };
  let t0 = NaN; // this breath's inspiration start
  let te0 = NaN; // its expiration start
  let peak = 0;
  let wasInsp = false;
  let flowing = false; // the last step ended in inspiratory flow, so this step's sub-steps were inspiratory
  let vStart = 0, pmax = 0, so: BreathSoFar | null = null, kind: VentMode = 'VC', peep = 0;
  // the flow the ventilator set on the breath's first flowing step, and whether every later step kept it
  let qSet = Number.NaN, constFlow = false;
  const tail: Array<[number, number]> = []; // [t, Paw] of the expiration's last 50 ms
  const expSamples: Array<[number, number]> = []; // [V L, Q L/s] of the expiration's passive flow
  return {
    step(vs) {
      const p = vs.p;
      const open = vs.circuit === 'disconnected';
      const insp = !open && (vs.hold === 'insp' || (vs.hold === null && p.phase !== 'exp'));
      const wasFlowing = flowing;
      flowing = !open && vs.hold === null && p.phase === 'insp';
      if (wasFlowing) {
        pmax = Math.max(pmax, p.Paw);
        if (Number.isNaN(qSet)) qSet = vs.flowTarget;
        else if (vs.flowTarget !== qSet) constFlow = false;
        if (!flowing) so = { t0, vtMl: p.V - vStart, pmax, tiFlow: p.t - t0, constFlow };
      }
      if (insp && !wasInsp) {
        if (Number.isFinite(t0) && Number.isFinite(te0) && tail.length) {
          const ti = te0 - t0;
          const te = p.t - te0;
          last = {
            t0, peakFlowLpm: peak, ti, te, ie: ti / Math.max(1e-9, te), peepEnd: tail.reduce((s, [, v]) => s + v, 0) / tail.length, tiTtot: ti / (ti + te),
            vtMl: so?.vtMl ?? Number.NaN, pmax: so?.pmax ?? Number.NaN, tiFlow: so?.tiFlow ?? Number.NaN, constFlow: so?.constFlow ?? false, peep, kind, spont: SPONT_KINDS.has(kind),
            tcexp: o ? timeConstant(expSamples, o.tcexpWindow, o.tcexpMinSamples) : Number.NaN,
          };
          const k = kept[`${last.spont}`];
          k.push(last);
          if (k.length > (o?.perKind ?? 0)) k.shift();
        }
        // from the model's own breath start: a breath given within a step (a hold released) began before this sample
        t0 = p.t - p.breathT;
        te0 = NaN;
        peak = 0;
        tail.length = 0;
        expSamples.length = 0;
        vStart = p.breathVstart;
        pmax = -Infinity;
        so = null;
        kind = breathKind(vs as VentState);
        peep = vs.cfg.peep;
        qSet = Number.NaN;
        // only a volume-controlled breath has a flow the ventilator sets; a pressure-controlled one's follows the lung
        constFlow = kind === 'VC';
      } else if (!insp && wasInsp) te0 = p.t;
      if (insp) peak = Math.max(peak, p.Q * 60);
      else {
        tail.push([p.t, p.Paw]);
        while (tail.length && p.t - (tail[0] as [number, number])[0] >= PEEP_WINDOW_S - 1e-9) tail.shift();
        if (vs.hold === null && !open) expSamples.push([p.V / 1000, p.Q]);
      }
      wasInsp = insp;
    },
    last: () => last,
    breaths: (s) => kept[`${s}`],
    current: () => so,
    clear(kindsOnly = false) {
      kept.true.length = kept.false.length = 0;
      if (kindsOnly) return;
      last = null;
      so = null;
      t0 = te0 = Number.NaN;
      wasInsp = flowing = false;
      tail.length = expSamples.length = 0;
    },
  };
}
