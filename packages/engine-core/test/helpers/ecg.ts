// Test helper: synthesise the displayed lead II for a rhythm and run the QRS detector on it.
import { defaultModifiers } from '../../src/modifiers.ts';
import { createRngState } from '../../src/rng/sfc32.ts';
import { drawHrvPhase } from '../../src/l2/ecg/hrv.ts';
import { createRhythmState, planUntil } from '../../src/l2/ecg/rhythm-engine.ts';
import { generateVcg } from '../../src/l2/ecg/generator.ts';
import { projectLead } from '../../src/l2/ecg/vcg.ts';
import { createFilterState, designEcgFilter, filterSample } from '../../src/l3/ecg-filter.ts';
import { createQrsState, qrsStep } from '../../src/l3/qrs.ts';
import type { EcgFilterMode, Modifiers, RhythmId, RhythmOpts } from '../../src/types.ts';

export interface DetectResult {
  beats: number[]; // true R times (beat.t), s
  detections: number[]; // detected R times, s
  latencies: number[]; // detection time − detected R time, s
}

export function detectOn(
  id: RhythmId,
  hr: number,
  seconds: number,
  opts: { mods?: Partial<Modifiers>; rhythmOpts?: RhythmOpts; mode?: EcgFilterMode; seed?: number } = {},
): DetectResult {
  const rng = createRngState(opts.seed ?? 7);
  const mods = { ...defaultModifiers(), ...opts.mods };
  const ctx = { hrAt: () => hr, mods, rng, hrv: drawHrvPhase(rng.hrv) };
  const st = createRhythmState(id, opts.rhythmOpts ?? {}, 0, ctx);
  planUntil(st, seconds + 1, ctx);
  const f = designEcgFilter(opts.mode ?? 'monitor', 500);
  const fs = createFilterState(f);
  const q = createQrsState(0);
  const detections: number[] = [];
  const latencies: number[] = [];
  generateVcg(
    { events: st.events, fwaves: st.fwaves, hrv: ctx.hrv, noiseLevel: mods.artefact.noise, noise: rng.noise },
    0,
    seconds * 500,
    (n, x, y, z) => {
      const r = qrsStep(q, filterSample(f, fs, projectLead('ecgII', x, y, z)));
      if (r >= 0) {
        detections.push(r / 500);
        latencies.push((n - r) / 500);
      }
    },
  );
  const beats = st.records.filter((r) => r.type === 'beat').map((b) => (b as { t: number }).t);
  return { beats, detections, latencies };
}

/**
 * Match detections to beats within ±60 ms, ignoring beats in the first 2.2 s (learning) and the last 0.3 s.
 * Matching uses every detection (and false positives are counted against every beat), so a beat just inside the
 * window whose detection lands just outside it is not scored as a miss.
 */
export function score(r: DetectResult, seconds: number) {
  const inRange = (t: number) => t > 2.2 && t < seconds - 0.3;
  const beats = r.beats.filter(inRange);
  const errors: number[] = [];
  for (const b of beats) {
    const d = r.detections.find((x) => Math.abs(x - b) < 0.06);
    if (d !== undefined) errors.push(d - b);
  }
  const fp = r.detections.filter((d) => inRange(d) && !r.beats.some((b) => Math.abs(d - b) < 0.06)).length;
  return { beats: beats.length, tp: errors.length, fp, errors };
}
