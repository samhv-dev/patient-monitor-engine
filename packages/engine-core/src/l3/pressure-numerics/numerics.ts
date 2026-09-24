// Device pressure numerics (brief §4.2 "Numerics (L3)", §6.1; research 03 §2.2): per-beat SBP/DBP = max/min of
// the DISPLAYED (transducer + 12 Hz filter) waveform between two detected feet; MAP = the INTEGRAL of the
// beat (never a formula); values averaged over the last 6 beats (4–8) and emitted at 1 Hz. Also the pleth
// PI (mean peak-to-trough of the last 6 pulses) and the pulse rate from the chosen source.
import type { Measured } from '../../types.ts';
import { createPulseDet, pulseRate, pulseStep, type PulseDetState } from '../pulse/detector.ts';

export const AVG_BEATS = 6; // 4–8 beats (brief §4.2) [ENG]
const RING = 400; // 3.2 s at 125 Hz: the longest beat measured (HR ≥ 19)
const STALE_S = 6; // no beat for 6 s → non-pulsatile [ENG]

export interface BeatValues {
  t: number; // foot time of the beat's end (s)
  sys: number;
  dia: number;
  mean: number;
  dur: number; // s
}

export interface WaveNumerics {
  det: PulseDetState;
  ring: number[];
  n: number; // absolute index of the next sample
  prevFoot: number;
  beats: BeatValues[];
  feet: number[]; // foot times (s), last 10
}

export function createWaveNumerics(floor: number): WaveNumerics {
  return { det: createPulseDet(floor), ring: new Array<number>(RING).fill(0), n: 0, prevFoot: -1, beats: [], feet: [] };
}

/** Feed one displayed sample (absolute index m, 125 Hz). Returns the completed beat, if any. */
export function numericsStep(wn: WaveNumerics, m: number, x: number): BeatValues | null {
  if (wn.n !== m) {
    // a gap (sensor detached/re-attached): restart detection at m
    wn.det = createPulseDet(wn.det.floor, m);
    wn.prevFoot = -1;
  }
  wn.n = m + 1;
  wn.ring[m % RING] = x;
  const f = pulseStep(wn.det, x);
  if (f < 0) return null;
  wn.feet.push(f / 125);
  if (wn.feet.length > 10) wn.feet.shift();
  const p = wn.prevFoot;
  wn.prevFoot = f;
  if (p < 0 || f - p < 25 || f - p > RING - 16 || m - p >= RING) return null;
  let mx = -Infinity;
  let mn = Infinity;
  let sum = 0;
  for (let k = p; k < f; k++) {
    const v = wn.ring[k % RING] as number;
    if (v > mx) mx = v;
    if (v < mn) mn = v;
    sum += v;
  }
  const b = { t: f / 125, sys: mx, dia: mn, mean: sum / (f - p), dur: (f - p) / 125 };
  wn.beats.push(b);
  if (wn.beats.length > AVG_BEATS) wn.beats.shift();
  return b;
}

/** Sys/dia/mean at time t: beat averages, or the flat-line max/min/mean over 2 s when non-pulsatile. */
export function pressureNumerics(wn: WaveNumerics, t: number): { sys: Measured; dia: Measured; mean: Measured } {
  const last = wn.beats[wn.beats.length - 1];
  if (last && t - last.t <= STALE_S) {
    const avg = (k: 'sys' | 'dia' | 'mean') => wn.beats.reduce((a, b) => a + b[k], 0) / wn.beats.length;
    return {
      sys: { value: avg('sys'), flag: 'valid', at: t },
      dia: { value: avg('dia'), flag: 'valid', at: t },
      mean: { value: avg('mean'), flag: 'valid', at: t },
    };
  }
  let mx = -Infinity;
  let mn = Infinity;
  let sum = 0;
  const n = Math.min(250, wn.n);
  for (let k = wn.n - n; k < wn.n; k++) {
    const v = wn.ring[k % RING] as number;
    mx = Math.max(mx, v);
    mn = Math.min(mn, v);
    sum += v;
  }
  if (n === 0) return { sys: { value: null, flag: 'invalid', at: t }, dia: { value: null, flag: 'invalid', at: t }, mean: { value: null, flag: 'invalid', at: t } };
  return {
    sys: { value: mx, flag: 'questionable', at: t },
    dia: { value: mn, flag: 'questionable', at: t },
    mean: { value: sum / n, flag: 'questionable', at: t },
  };
}

/** PI: mean peak-to-trough of the last beats of a pleth WaveNumerics. */
export function piNumeric(wn: WaveNumerics, t: number): Measured {
  const last = wn.beats[wn.beats.length - 1];
  if (!last || t - last.t > STALE_S) return { value: null, flag: 'invalid', at: t };
  return { value: wn.beats.reduce((a, b) => a + (b.sys - b.dia), 0) / wn.beats.length, flag: 'valid', at: t };
}

/** Pulse rate from a WaveNumerics' feet (brief §6.1 PR: its own average, response ≤ 20 s). */
export function prNumeric(wn: WaveNumerics, t: number): Measured {
  const lastFoot = wn.feet[wn.feet.length - 1];
  const pr = pulseRate(wn.feet);
  if (pr === null || lastFoot === undefined || t - lastFoot > STALE_S) return { value: null, flag: 'invalid', at: t };
  return { value: Math.round(pr), flag: 'valid', at: t };
}
