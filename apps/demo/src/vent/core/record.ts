// The breath record (plan vent-skin-edp-ts.md §4.3, §3.3 GD1, GD2, GD6; piece V1): what a ventilator reports of the
// last COMPLETE breath, from the 5 ms steps: peak inspiratory flow, Ti (with a pause or an inspiratory hold, as a
// ventilator reports it: research/57 R-08), Te, I:E, and the end-expiratory pressure as the EDP-TS measures it, the
// mean airway pressure of the last 50 ms of expiration (research/57 R-23). It is fed on every step, frozen or not:
// freezing the display leaves the numbers live (research/57 K-07). V4 adds VE mandatory and spontaneous.
import type { VentState } from '@pme/ventilator';
import type { BreathRecord } from './types.ts';

/** The window of the end-expiratory pressure, s (research/57 R-23). */
export const PEEP_WINDOW_S = 0.05;

export interface Recorder {
  /** Take one 5 ms step's state. */
  step(vs: Readonly<VentState>): void;
  /** The last complete breath, or null before the first. */
  last(): BreathRecord | null;
}

export function createRecorder(): Recorder {
  let last: BreathRecord | null = null;
  let t0 = NaN; // this breath's inspiration start
  let te0 = NaN; // its expiration start
  let peak = 0;
  let wasInsp = false;
  const tail: Array<[number, number]> = []; // [t, Paw] of the expiration's last 50 ms
  return {
    step(vs) {
      const p = vs.p;
      const insp = vs.circuit !== 'disconnected' && (vs.hold === 'insp' || (vs.hold === null && p.phase !== 'exp'));
      if (insp && !wasInsp) {
        if (Number.isFinite(t0) && Number.isFinite(te0) && tail.length) {
          const ti = te0 - t0;
          const te = p.t - te0;
          last = { t0, peakFlowLpm: peak, ti, te, ie: ti / Math.max(1e-9, te), peepEnd: tail.reduce((s, [, v]) => s + v, 0) / tail.length, tiTtot: ti / (ti + te) };
        }
        t0 = p.t;
        te0 = NaN;
        peak = 0;
        tail.length = 0;
      } else if (!insp && wasInsp) te0 = p.t;
      if (insp) peak = Math.max(peak, p.Q * 60);
      else {
        tail.push([p.t, p.Paw]);
        while (tail.length && p.t - (tail[0] as [number, number])[0] >= PEEP_WINDOW_S - 1e-9) tail.shift();
      }
      wasInsp = insp;
    },
    last: () => last,
  };
}
