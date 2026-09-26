// Shared by the link tests: series from engine events, CO from the engine snapshot, and the CI rule's yielding run.
import type { EngineEvent, NumericId, StateVar } from '@pme/engine-core';
import { cardiacOutput } from '../../engine-core/src/l2/gas/coupling.ts';
import type { HemoState } from '../../engine-core/src/l2/hemo/pipeline.ts';
import type { LinkedSim } from '../src/index.ts';

export const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
export const num = (ev: EngineEvent[], id: NumericId, t0: number, t1: number): number[] =>
  ev.flatMap((x) => (x.type === 'measurement' && x.t >= t0 && x.t <= t1 && x.values[id] && x.values[id]!.value !== null ? [x.values[id]!.value as number] : []));
export const truth = (ev: EngineEvent[], v: StateVar, t0: number, t1: number): number[] =>
  ev.flatMap((x) => (x.type === 'state' && x.t >= t0 && x.t <= t1 && x.values[v] !== undefined ? [x.values[v] as number] : []));
export const co = (s: LinkedSim): number => cardiacOutput((s.engine.snapshot().state as { st: { hemo: HemoState } }).st.hemo, s.now());
/** Advance to t one sim-minute at a time, yielding between chunks (CI rule, G2). */
export async function run(s: LinkedSim, t: number): Promise<void> {
  while (s.now() < t - 1e-9) {
    s.advanceTo(Math.min(t, s.now() + 60));
    await new Promise<void>((r) => setImmediate(r));
  }
}
/** Numbers over a window (sim s), for assertions and the gate note. */
export function snap(s: LinkedSim, t0: number, t1: number) {
  const m = s.vs.p.measured;
  return {
    co: co(s), map: mean(num(s.events, 'abpMean', t0, t1)), cvp: mean(num(s.events, 'cvpMean', t0, t1)), spo2: mean(num(s.events, 'spo2', t0, t1)),
    sao2: mean(truth(s.events, 'spo2', t0, t1)), etco2: mean(num(s.events, 'etco2', t0, t1)),
    autoPeep: m.autoPEEP, vte: m.VTE, pip: m.PIP, plat: m.PLAT,
  };
}
export const fmt = (o: Record<string, number>): string => Object.entries(o).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' ');
