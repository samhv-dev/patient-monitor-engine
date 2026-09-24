// Stage 5 test helpers: run the rhythm engine (and optionally the sample generator) with a modifier patch.
import { defaultModifiers, mergeModifiers } from '../../src/modifiers.ts';
import { createRngState } from '../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil, type RhythmCtx, type RhythmState } from '../../src/l2/ecg/rhythm-engine.ts';
import { RHYTHMS } from '../../src/l2/ecg/rhythms.ts';
import { ecgFrontEnd, ecgGenInputs, generateEcg } from '../../src/l2/ecg/ecg-gen.ts';
import { pruneEvents } from '../../src/l2/ecg/generator.ts';
import { projectLeads } from '../../src/l2/ecg/vcg.ts';
import { K_STRIDE, WAVE } from '../../src/l2/ecg/kernels.ts';
import { beatKernels } from '../../src/l2/ecg/beat-templates.ts';
import { applyMorphology } from '../../src/l2/ecg/morphology/index.ts';
import { LEAD_IDS, type EngineEvent, type LeadId, type Modifiers, type ModifiersPatch, type RhythmId, type RhythmOpts } from '../../src/types.ts';

export type Beat = Extract<EngineEvent, { type: 'beat' }>;
export type Atrial = Extract<EngineEvent, { type: 'atrial' }>;
export type Marker = Extract<EngineEvent, { type: 'marker' }>;

export interface S5Opts {
  hr?: number;
  seed?: number;
  mods?: ModifiersPatch;
  rhythmOpts?: RhythmOpts;
}

export interface S5Run {
  st: RhythmState;
  ctx: RhythmCtx;
  mods: Modifiers;
  beats: Beat[];
  atrial: Atrial[];
  markers: Marker[];
  records: EngineEvent[];
}

/** Plan `seconds` of rhythm (no samples). HRV and noise stay at their defaults unless the patch changes them. */
export function run5(id: RhythmId, seconds: number, o: S5Opts = {}): S5Run {
  const rng = createRngState(o.seed ?? 1);
  const mods = mergeModifiers(defaultModifiers(), o.mods ?? {});
  const hr = o.hr ?? RHYTHMS[id].defaultRateBpm;
  const ctx: RhythmCtx = { hrAt: () => hr, mods, rng, hrv: drawHrvPhase(rng.hrv) };
  const st = createRhythmState(id, o.rhythmOpts ?? {}, 0, ctx);
  planUntil(st, seconds, ctx);
  const records = st.records;
  return {
    st, ctx, mods, records,
    beats: records.filter((r): r is Beat => r.type === 'beat'),
    atrial: records.filter((r): r is Atrial => r.type === 'atrial'),
    markers: records.filter((r): r is Marker => r.type === 'marker'),
  };
}

/** Plan and generate `seconds` of samples; returns the requested leads (pre-filter, through the front end). */
export function samples5(id: RhythmId, seconds: number, leads: readonly LeadId[], o: S5Opts & { mainsHz?: 50 | 60 } = {}): S5Run & { lead: Record<string, Float64Array> } {
  const rng = createRngState(o.seed ?? 1);
  const mods = mergeModifiers(defaultModifiers(), o.mods ?? {});
  const hr = o.hr ?? RHYTHMS[id].defaultRateBpm;
  const hrv = drawHrvPhase(rng.hrv);
  const ctx: RhythmCtx = { hrAt: () => hr, mods, rng, hrv };
  const st = createRhythmState(id, o.rhythmOpts ?? {}, 0, ctx);
  const n = Math.round(seconds * 500);
  const lead: Record<string, Float64Array> = {};
  for (const l of leads) lead[l] = new Float64Array(n);
  const out = new Float64Array(12);
  const all: EngineEvent[] = [];
  // Generate in 20 ms chunks exactly as the engine does (planning 150 ms ahead of the samples).
  for (let from = 0; from < n; from += 10) {
    const to = Math.min(n - 1, from + 9);
    planUntil(st, to / 500 + 0.15, ctx);
    st.events = pruneEvents(st.events, from / 500);
    all.push(...st.records);
    st.records = [];
    generateEcg(ecgGenInputs({ rhythm: st, mods, hrv, rng }, o.mainsHz ?? 50), from, to, (i, x, y, z) => {
      projectLeads(x, y, z, out);
      for (const l of leads) (lead[l] as Float64Array)[i] = ecgFrontEnd(mods, o.mainsHz ?? 50, l, i, out[LEAD_IDS.indexOf(l)] as number);
    });
  }
  return {
    st, ctx, mods, records: all, lead,
    beats: all.filter((r): r is Beat => r.type === 'beat'),
    atrial: all.filter((r): r is Atrial => r.type === 'atrial'),
    markers: all.filter((r): r is Marker => r.type === 'marker'),
  };
}

/** Lead value of the kernel list k at offset s (seconds from the event time), no noise. */
export function kernelLead(k: readonly number[], lead: LeadId, s: number): number {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < k.length; i += K_STRIDE) {
    const d = s - (k[i] as number);
    const sig = d < 0 ? (k[i + 1] as number) : (k[i + 2] as number);
    const g = Math.exp((-d * d) / (2 * sig * sig));
    x += (k[i + 3] as number) * g;
    y += (k[i + 4] as number) * g;
    z += (k[i + 5] as number) * g;
  }
  const out = new Float64Array(12);
  projectLeads(x, y, z, out);
  return out[LEAD_IDS.indexOf(lead)] as number;
}

/** The kernel lists of events that contain a wave of the given code (e.g. the QRS-T events). */
export function eventsWith(st: RhythmState, wave: number): number[][] {
  return st.events.filter((e) => { for (let i = 0; i < e.k.length; i += K_STRIDE) if (e.k[i + 6] === wave) return true; return false; }).map((e) => e.k);
}

export { WAVE, K_STRIDE };

export function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
export function sd(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
}
export function diffs(xs: readonly number[]): number[] {
  return xs.slice(1).map((x, i) => x - (xs[i] as number));
}

/** T peak (s from QRS onset) of a kernel list: τ of its first T kernel. */
export function tPeakOf(k: readonly number[]): number {
  for (let i = 0; i < k.length; i += K_STRIDE) if (k[i + 6] === WAVE.T) return k[i] as number;
  return Number.NaN;
}

/** One beat's kernels (QRS onset at 0, QT 400 ms) after the morphology pipeline with a modifier patch. */
export function morphBeat(patch: ModifiersPatch, seq = 0, template: 'narrow' | 'wide' = 'narrow'): number[] {
  return applyMorphology(beatKernels(template, 400), { template, supra: template === 'narrow', qtMs: 400, seq }, mergeModifiers(defaultModifiers(), patch));
}
