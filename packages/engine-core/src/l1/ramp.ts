// Instructor target ramps (brief §7.1 `Ramp`; curves per BUILD-PLAN Stage 2 scope, used by 'hr' from Stage 1).
import type { Ramp } from '../types.ts';

/** Plain-data ramp state: value goes from `from` (at t0 + delay) to `to` over durationS. */
export interface RampState {
  from: number;
  to: number;
  t0: number;
  delayS: number;
  durationS: number;
  curve: 'linear' | 'exp' | 'sigmoid';
}

export function constantRamp(value: number): RampState {
  return { from: value, to: value, t0: 0, delayS: 0, durationS: 0, curve: 'linear' };
}

/** Shape functions on u ∈ [0,1], each 0 at u=0 and exactly 1 at u=1 [ENG]. */
function shape(curve: RampState['curve'], u: number): number {
  if (curve === 'exp') return (1 - Math.exp(-5 * u)) / (1 - Math.exp(-5));
  if (curve === 'sigmoid') {
    const s = (x: number) => 1 / (1 + Math.exp(-10 * (x - 0.5)));
    return (s(u) - s(0)) / (s(1) - s(0));
  }
  return u;
}

export function rampValue(r: RampState, t: number): number {
  const start = r.t0 + r.delayS;
  if (t <= start) return r.from;
  if (r.durationS <= 0 || t >= start + r.durationS) return r.to;
  return r.from + (r.to - r.from) * shape(r.curve, (t - start) / r.durationS);
}

/** Start a new ramp at time t from the CURRENT value (a mid-ramp retarget never jumps). */
export function retarget(r: RampState, t: number, to: number, ramp?: Ramp): RampState {
  return {
    from: rampValue(r, t),
    to,
    t0: t,
    delayS: ramp?.delayS ?? 0,
    durationS: ramp?.durationS ?? 0,
    curve: ramp?.curve ?? 'linear',
  };
}
