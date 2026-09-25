// Test helpers for Stage 3 (respiratory, gas, temperature): engine set-up, 62.5 Hz reads, state/numeric series
// and the capnogram angle measurement (brief §4.4: α on a declared axis scale of 25 mmHg/s).
import { createEngine } from '../../src/engine.ts';
import type { HemoState } from '../../src/l2/hemo/pipeline.ts';
import type { ChannelId, Command, EngineEvent, MonitorEngine, NumericId, PatientProfile, StateVar } from '../../src/types.ts';

let seq = 0;
export function cmd(body: Record<string, unknown>): Command {
  return { id: `r${++seq}`, issuedBy: 'test', ...body } as Command;
}
export const ev3 = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });

export interface Rig3 {
  e: MonitorEngine;
  ev: EngineEvent[];
}

/** Engine with the capnograph on (sidestream unless `sampling`), every event recorded. */
export function rig3(opts: { seed?: number; patient?: PatientProfile; sampling?: 'sidestream' | 'mainstream'; hr?: number } = {}): Rig3 {
  const p = opts.patient ?? {};
  const e = createEngine({ seed: opts.seed ?? 7, patient: { ...p, baseline: { hr: opts.hr ?? 75, ...p.baseline }, sensors: { co2: 'on', ...p.sensors } } });
  if (opts.sampling) e.dispatch(cmd({ type: 'attachSensor', sensor: 'co2', state: 'on', sampling: opts.sampling }));
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return { e, ev };
}

/** Samples of a 62.5 Hz channel for sim times [t0, t1). */
export function read62(e: MonitorEngine, ch: ChannelId, t0: number, t1: number): Float32Array {
  const out = new Float32Array(Math.round((t1 - t0) * 62.5));
  e.readSamples(ch, Math.round(t0 * 62.5), out);
  return out;
}

/** [t, value] of one StateVar from the 1 Hz `state` events. */
export function stateSeries(ev: EngineEvent[], v: StateVar, t0 = -1, t1 = Infinity): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const x of ev) if (x.type === 'state' && x.t >= t0 && x.t <= t1 && x.values[v] !== undefined) out.push([x.t, x.values[v] as number]);
  return out;
}

/** [t, value] of one numeric (null values kept as NaN). */
export function numSeries(ev: EngineEvent[], id: NumericId, t0 = -1, t1 = Infinity): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const x of ev) {
    if (x.type !== 'measurement' || x.t < t0 || x.t > t1) continue;
    const m = x.values[id];
    if (m) out.push([x.t, m.value === null ? Number.NaN : m.value]);
  }
  return out;
}

export const firstBelow = (s: Array<[number, number]>, v: number): number | undefined => s.find(([, y]) => y < v)?.[0];
export const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Capnogram angles per expiration (research 03 §4.1): phase II slope between the 25 % and 75 % crossings of the
 * plateau-end value P, phase III slope by regression from the 90 % crossing + 0.2 s to the plateau end,
 * α = 180° − atan(s_II/25) + atan(s_III/25) on the 25 mmHg/s axis scale (brief §4.4). Also the phase III rise.
 */
export function capnoAngles(x: Float32Array, rate = 62.5): Array<{ alpha: number; riseIII: number; plateau: number }> {
  const out: Array<{ alpha: number; riseIII: number; plateau: number }> = [];
  let i = 0;
  const hi = Math.max(...x);
  const cross = (from: number, lvl: number) => {
    for (let k = from; k < x.length - 1; k++) if (x[k]! < lvl && x[k + 1]! >= lvl) return k + (lvl - x[k]!) / (x[k + 1]! - x[k]!);
    return -1;
  };
  while (i < x.length - 1) {
    const up = cross(i, 0.5 * hi); // an expiration upstroke
    if (up < 0) break;
    let dn = Math.ceil(up);
    while (dn < x.length - 1 && x[dn]! >= 0.5 * hi) dn++; // the inspiratory downstroke crosses 50 % here
    if (dn >= x.length - 2) break;
    let end = dn; // plateau end = the maximum of the last 0.5 s before the downstroke
    for (let k = Math.max(Math.ceil(up), dn - Math.round(0.5 * rate)); k < dn; k++) if (x[k]! >= x[end]!) end = k;
    let s = Math.floor(up);
    while (s > 0 && x[s - 1]! < x[s]!) s--; // the start of the upswing
    const P = x[end]!;
    const t25 = cross(s, 0.25 * P);
    const t75 = cross(s, 0.75 * P);
    const t90 = cross(s, 0.9 * P);
    const a = Math.ceil(t90 + 0.2 * rate);
    if (t25 > 0 && t75 > t25 && end - a > 10) {
      const sII = (0.5 * P) / ((t75 - t25) / rate);
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      const n = end - a + 1;
      for (let k = a; k <= end; k++) {
        const tt = k / rate;
        sx += tt; sy += x[k]!; sxx += tt * tt; sxy += tt * x[k]!;
      }
      const sIII = (n * sxy - sx * sy) / (n * sxx - sx * sx);
      const deg = (r: number) => (r * 180) / Math.PI;
      out.push({ alpha: 180 - deg(Math.atan(sII / 25)) + deg(Math.atan(sIII / 25)), riseIII: sIII * ((end - a) / rate), plateau: P });
    }
    i = dn + 1;
  }
  return out;
}

// --- shared by the Stage 3 acceptance files -------------------------------------------------------------
export const ADULT: PatientProfile = { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' };
export const vent = (rr = 12, vtMl = 500, fio2 = 0.5, peep = 5) => ev3({ kind: 'ventilation', source: 'ventilator', rr, vtMl, fio2, peep });
export type Beat = Extract<EngineEvent, { type: 'beat' }>;
export type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
export const beatsIn = (ev: EngineEvent[], t0: number, t1: number) => ev.filter((b): b is Beat => b.type === 'beat' && b.t > t0 && b.t < t1);
export const breaths = (ev: EngineEvent[], t0 = -1, t1 = Infinity) => ev.filter((x): x is Extract<EngineEvent, { type: 'breath' }> => x.type === 'breath' && x.t > t0 && x.t < t1);
export const hemoOf = (e: MonitorEngine) => (e.snapshot().state as { st: { hemo: HemoState } }).st.hemo;

/** Time of the apnoea desaturation to SaO2 < 90 % (s after the airway event), GA, optional preoxygenation. */
export function desatTime(p: PatientProfile, preox: boolean): number {
  const { e, ev } = rig3({ patient: p });
  e.dispatch(ev3({ kind: 'thermal', anaesthesia: 'general' }));
  if (preox) e.dispatch(ev3({ kind: 'preoxygenate', fio2: 1, durationS: 180 }));
  e.advanceTo(180);
  e.dispatch(ev3({ kind: 'airway', state: 'apnoea' }));
  e.advanceTo(180 + 900);
  return (firstBelow(stateSeries(ev, 'spo2', 180), 90) ?? Infinity) - 180;
}
