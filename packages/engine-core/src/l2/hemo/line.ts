// Catheter–tubing–transducer line and display chain (brief §4.2 "Transducer and line"; research 03 §2.6):
//   H(s) = ωn² / (s² + 2ζωn·s + ωn²)  (integrated with RK4 at 2 ms, input linearly interpolated inside a
//   substep), then a 12 Hz display low-pass (RBJ Butterworth biquad at 125 Hz).
// Line modes decide what the transducer sees: the patient (plus 0.74 mmHg/cm levelling offset), the flush
// bag (300 mmHg square wave → ringing at fn on release), air (zero, atmosphere, disconnection, sampling).
import { createFilterState, filterSample, lowpass, type Biquad } from '../../l3/ecg-filter.ts';
import type { HemoClinicalEvent, LineSensorState } from '../../types-hemo.ts';
import {
  DAMP_PRESETS,
  DISPLAY_FILTER_HZ,
  FLUSH_MMHG,
  FLUSH_S,
  HEMO_RATE,
  MMHG_PER_CM,
  SAMPLE_S,
  TRANSDUCER_FN_HZ,
  TRANSDUCER_ZETA,
  ZERO_S,
} from './params.ts';

export const DISPLAY_FILTER: readonly Biquad[] = [lowpass(DISPLAY_FILTER_HZ, HEMO_RATE)];
export const LINE_SENSOR_STATES: readonly LineSensorState[] = ['none', 'atmosphere', 'connected', 'zeroing', 'damped'];

export interface LineState {
  sensor: LineSensorState;
  fnHz: number;
  zeta: number;
  levelCm: number; // transducer below the phlebostatic axis, cm (reads high)
  flushUntil: number;
  zeroUntil: number;
  sampleUntil: number;
  disconnected: boolean;
  x: number; // transducer output (mmHg)
  v: number; // its derivative
  f: number[]; // display filter state
}

export function createLineState(sensor: LineSensorState = 'none'): LineState {
  return {
    sensor,
    fnHz: TRANSDUCER_FN_HZ,
    zeta: TRANSDUCER_ZETA,
    levelCm: 0,
    flushUntil: -1,
    zeroUntil: -1,
    sampleUntil: -1,
    disconnected: false,
    x: 0,
    v: 0,
    f: createFilterState(DISPLAY_FILTER),
  };
}

/** Whether the channel has a trace at all (brief §6.2: 'none' = no trace). */
export function lineActive(ls: LineState): boolean {
  return ls.sensor !== 'none';
}

/** Pressure presented to the transducer at time t, given the patient's pressure at the catheter tip. */
export function lineInput(ls: LineState, pPatient: number, t: number): number {
  if (ls.sensor === 'atmosphere' || ls.sensor === 'zeroing' || t < ls.zeroUntil || t < ls.sampleUntil) return 0;
  if (t < ls.flushUntil) return FLUSH_MMHG;
  if (ls.disconnected) return 0;
  return pPatient + MMHG_PER_CM * ls.levelCm;
}

/** Effective (fn, ζ): the 'damped' sensor state forces the overdamped preset. */
export function lineDynamics(ls: LineState): { fnHz: number; zeta: number } {
  return ls.sensor === 'damped' ? DAMP_PRESETS.over : { fnHz: ls.fnHz, zeta: ls.zeta };
}

/** One RK4 step of the transducer from t to t + h; the input moves linearly from u0 to u1. */
export function stepTransducer(ls: LineState, u0: number, u1: number, h: number): void {
  const { fnHz, zeta } = lineDynamics(ls);
  const w = 2 * Math.PI * fnHz;
  const acc = (x: number, v: number, u: number) => w * w * (u - x) - 2 * zeta * w * v;
  const um = (u0 + u1) / 2;
  const x0 = ls.x;
  const v0 = ls.v;
  const a1 = acc(x0, v0, u0);
  const x2 = x0 + (h / 2) * v0;
  const v2 = v0 + (h / 2) * a1;
  const a2 = acc(x2, v2, um);
  const x3 = x0 + (h / 2) * v2;
  const v3 = v0 + (h / 2) * a2;
  const a3 = acc(x3, v3, um);
  const x4 = x0 + h * v3;
  const v4 = v0 + h * a3;
  const a4 = acc(x4, v4, u1);
  ls.x = x0 + (h / 6) * (v0 + 2 * v2 + 2 * v3 + v4);
  ls.v = v0 + (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
}

/** The displayed sample: transducer output through the 12 Hz display filter. */
export function displaySample(ls: LineState): number {
  return filterSample(DISPLAY_FILTER, ls.f, ls.x);
}

/** Put the transducer and display filter at rest on pressure p (no connection transient). */
export function settleLine(ls: LineState, p: number): void {
  ls.x = p;
  ls.v = 0;
  ls.f = createFilterState(DISPLAY_FILTER);
  for (let i = 0; i < 64; i++) filterSample(DISPLAY_FILTER, ls.f, p);
}

/** attachSensor for abp / cvp / pap (brief §6.2). 'zeroing' returns to 'connected' after ZERO_S. */
export function setLineSensor(ls: LineState, state: LineSensorState, t: number, pNow: number): void {
  const was = ls.sensor;
  ls.sensor = state;
  if (state === 'zeroing') {
    ls.zeroUntil = t + ZERO_S;
    ls.sensor = 'connected';
  }
  if (was === 'none' && state !== 'none') settleLine(ls, state === 'atmosphere' ? 0 : pNow);
}

/** applyEvent { kind: 'line' } (brief §7.2): flush, zero, sample, disconnect, reconnect, damp, level. */
export function applyLineEvent(ls: LineState, ev: Extract<HemoClinicalEvent, { kind: 'line' }>, t: number): void {
  switch (ev.action) {
    case 'flush':
      ls.flushUntil = t + FLUSH_S;
      return;
    case 'zero':
      ls.zeroUntil = t + ZERO_S;
      return;
    case 'sample':
      // stopcock off the patient, then the post-sampling flush (research 03 §2.6)
      ls.sampleUntil = t + SAMPLE_S;
      ls.flushUntil = t + SAMPLE_S + FLUSH_S;
      return;
    case 'disconnect':
      ls.disconnected = true;
      return;
    case 'reconnect':
      ls.disconnected = false;
      return;
    case 'damp':
      ls.zeta = ev.value ?? DAMP_PRESETS.over.zeta;
      if (ev.fnHz !== undefined) ls.fnHz = ev.fnHz;
      return;
    case 'level':
      ls.levelCm = ev.value ?? 0;
      return;
    case 'wedge':
      return; // PAP only; handled by the pipeline
  }
}

/** Validation for a 'line' event (brief §4.2 ranges). */
export function validateLineEvent(ev: Extract<HemoClinicalEvent, { kind: 'line' }>): string | undefined {
  if (!['abp', 'cvp', 'pap'].includes(ev.line)) return 'line must be abp, cvp or pap';
  if (ev.action === 'damp') {
    if (ev.value !== undefined && !(ev.value >= 0.05 && ev.value <= 3)) return 'damp ζ must be 0.05–3';
    if (ev.fnHz !== undefined && !(ev.fnHz >= 5 && ev.fnHz <= 40)) return 'damp fnHz must be 5–40';
  }
  if (ev.action === 'level' && ev.value !== undefined && !(Math.abs(ev.value) <= 60)) return 'level must be within ±60 cm';
  if (ev.action === 'wedge' && ev.line !== 'pap') return 'wedge applies to the pap line only';
  return undefined;
}
