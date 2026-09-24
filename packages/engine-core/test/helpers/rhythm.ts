// Test helper: run the rhythm engine alone (no samples) and collect its records.
import { defaultModifiers } from '../../src/modifiers.ts';
import { createRngState } from '../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil, type RhythmCtx, type RhythmState } from '../../src/l2/ecg/rhythm-engine.ts';
import { RHYTHMS } from '../../src/l2/ecg/rhythms.ts';
import type { EngineEvent, Modifiers, RhythmId, RhythmOpts } from '../../src/types.ts';

export type Beat = Extract<EngineEvent, { type: 'beat' }>;
export type Atrial = Extract<EngineEvent, { type: 'atrial' }>;

export interface RunResult {
  st: RhythmState;
  beats: Beat[];
  atrial: Atrial[];
}

export function runRhythm(
  id: RhythmId,
  seconds: number,
  opts: { hr?: number; seed?: number; mods?: Partial<Modifiers>; rhythmOpts?: RhythmOpts } = {},
): RunResult {
  const rng = createRngState(opts.seed ?? 1);
  const mods = { ...defaultModifiers(), ...opts.mods };
  const hr = opts.hr;
  const ctx: RhythmCtx = { hrAt: () => hr ?? RHYTHMS[id].defaultRateBpm, mods, rng, hrv: drawHrvPhase(rng.hrv) };
  const st = createRhythmState(id, opts.rhythmOpts ?? {}, 0, ctx);
  planUntil(st, seconds, ctx);
  const beats = st.records.filter((r): r is Beat => r.type === 'beat');
  const atrial = st.records.filter((r): r is Atrial => r.type === 'atrial');
  return { st, beats, atrial };
}

export function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function sd(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function diffs(xs: readonly number[]): number[] {
  return xs.slice(1).map((x, i) => x - (xs[i] as number));
}
