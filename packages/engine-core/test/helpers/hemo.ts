// Test helpers for Stage 2 (haemodynamics): engine set-up, sample reads and waveform fiducials.
import { createEngine } from '../../src/engine.ts';
import type { ChannelId, Command, EngineEvent, MonitorEngine, NumericId, PatientProfile } from '../../src/types.ts';

let seq = 0;
/** A command with a unique id (the body is any Command without id/issuedBy). */
export function cmd(body: Record<string, unknown>): Command {
  return { id: `t${++seq}`, issuedBy: 'test', ...body } as Command;
}

export interface Rig {
  e: MonitorEngine;
  ev: EngineEvent[];
}

/** Engine with the arterial line connected (plus any extra sensors) and every event recorded. */
export function rig(opts: { seed?: number; hr?: number; baseline?: PatientProfile['baseline']; sensors?: PatientProfile['sensors']; hrv?: boolean } = {}): Rig {
  const e = createEngine({
    seed: opts.seed ?? 5,
    patient: { baseline: { hr: opts.hr ?? 75, ...opts.baseline }, sensors: { abp: 'connected', ...opts.sensors } },
  });
  if (opts.hrv === false) e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return { e, ev };
}

/** Samples of a 125 Hz channel for sim times [t0, t1). */
export function read(e: MonitorEngine, ch: ChannelId, t0: number, t1: number): Float32Array {
  const out = new Float32Array(Math.round((t1 - t0) * 125));
  e.readSamples(ch, Math.round(t0 * 125), out);
  return out;
}

export type Beat = Extract<EngineEvent, { type: 'beat' }>;
export const beatsOf = (ev: EngineEvent[], t0 = -1, t1 = Infinity): Beat[] =>
  ev.filter((x): x is Beat => x.type === 'beat' && x.t > t0 && x.t < t1);

/** Values of one numeric from the measurement events in [t0, t1]. */
export function numeric(ev: EngineEvent[], id: NumericId, t0 = -1, t1 = Infinity): number[] {
  const out: number[] = [];
  for (const x of ev) {
    if (x.type !== 'measurement' || x.t < t0 || x.t > t1) continue;
    const m = x.values[id];
    if (m && m.value !== null) out.push(m.value);
  }
  return out;
}

export const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
export const sd = (xs: readonly number[]): number => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

/**
 * Upstroke foot after R (s): the time the signal first crosses min + 10% of (max − min) inside [tR, tR + 0.5 s),
 * searching up from the minimum before the peak (linear interpolation between samples).
 */
export function footAfter(x: Float32Array, t0: number, tR: number): number {
  const i0 = Math.round((tR - t0) * 125);
  const i1 = i0 + 62;
  let imx = i0;
  for (let i = i0; i < i1; i++) if (x[i]! > x[imx]!) imx = i;
  let imn = i0;
  for (let i = i0; i < imx; i++) if (x[i]! <= x[imn]!) imn = i;
  const lvl = x[imn]! + 0.1 * (x[imx]! - x[imn]!);
  for (let i = imn; i < imx; i++) {
    if (x[i]! < lvl && x[i + 1]! >= lvl) return t0 + (i + (lvl - x[i]!) / (x[i + 1]! - x[i]!)) / 125;
  }
  return Number.NaN;
}

/**
 * Dicrotic notch (s): among the local minima in the 320 ms after the systolic peak that follows R, the one
 * followed by the largest rise within 100 ms (the dicrotic wave), which skips the shallow dip before the
 * tidal wave.
 */
export function notchAfter(x: Float32Array, t0: number, tR: number): number {
  const i0 = Math.round((tR - t0) * 125);
  let ip = i0;
  for (let i = i0; i < i0 + 60; i++) if (x[i]! > x[ip]!) ip = i;
  let best = -1;
  let bestRise = 0;
  for (let i = ip + 2; i < ip + 40; i++) {
    if (!(x[i]! < x[i - 1]! && x[i]! <= x[i + 1]!)) continue;
    let mx = x[i]!;
    for (let k = i; k < i + 13; k++) mx = Math.max(mx, x[k]!);
    if (mx - x[i]! > bestRise) {
      bestRise = mx - x[i]!;
      best = i;
    }
  }
  return best < 0 ? Number.NaN : t0 + best / 125;
}

/** Root-mean-square of successive differences (beat-to-beat variability, insensitive to slow respiratory swings). */
export function rmssd(xs: readonly number[]): number {
  let s = 0;
  for (let i = 1; i < xs.length; i++) s += ((xs[i] as number) - (xs[i - 1] as number)) ** 2;
  return Math.sqrt(s / (xs.length - 1));
}

/** Rise of the signal over [tR + 0.12 s, tR + 0.12 + min(0.3, rrNext − 0.02)]: the upstroke a beat produced. */
export function riseAfter(x: Float32Array, t0: number, tR: number, rrNext: number): number {
  const a = Math.round((tR + 0.12 - t0) * 125);
  const b = a + Math.round(Math.min(0.3, rrNext - 0.02) * 125);
  let mx = -Infinity;
  for (let k = a; k <= b; k++) mx = Math.max(mx, x[k]!);
  return mx - x[a]!;
}
