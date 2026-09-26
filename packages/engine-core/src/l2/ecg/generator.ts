// VCG sample generator at 500 Hz (brief §3.2 L2, §4.1). Sums the scheduled kernel events, AF/flutter waves,
// respiratory baseline wander and additive white noise (brief §5 artefact table: 0.025 mV SD).
// Artefacts are summed BEFORE the L3 monitor filter (brief §3.2).
import { sfc32Next, type Sfc32State } from '../../rng/sfc32.ts';
import { addEventAt, type EcgEvent } from './kernels.ts';
import { respSin, type HrvPhase } from './hrv.ts';
import type { BreathClock } from './breath-clock.ts';
import type { FWave } from './rhythm-engine.ts';
import { WANDER_DIR } from './templates.ts';

export const ECG_RATE = 500;
export const NOISE_SD_MV = 0.025; // additive white noise (brief §5; McSharry 2003 example)
export const WANDER_MV = 0.08; // respiratory baseline wander 0.05–0.15 mV at f_resp (brief §4.1)

/** 4096 fixed standard-normal values (sfc32 seed 0x5eed + Box–Muller) so per-sample noise costs one PRNG draw. */
const NOISE_TABLE: Float64Array = (() => {
  const s: Sfc32State = [0x5eed, 0x1234, 0xbeef, 0xcafe];
  for (let i = 0; i < 15; i++) sfc32Next(s);
  const t = new Float64Array(4096);
  for (let i = 0; i < t.length; i++) {
    const u1 = (sfc32Next(s) + 1) / 4294967297;
    const u2 = sfc32Next(s) / 4294967296;
    t[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  return t;
})();

export function tableNormal(s: Sfc32State): number {
  return NOISE_TABLE[sfc32Next(s) >>> 20] as number;
}

/** Atrial waves (AF f-waves, flutter F-waves) fade in and out over this long, so a rhythm switch leaves no step
 *  (review L8: leaving AF cut the f-waves with a step of up to ~0.15 mV) [ENG]. */
export const FWAVE_FADE_S = 0.08;

/** Add one continuous atrial wave (a sum of sinusoids along its VCG direction) at time s into acc[0..2]. */
export function fwaveAt(fw: FWave, s: number, acc: Float64Array): void {
  if (s < fw.start || s > fw.end) return;
  const g = Math.min(1, (s - fw.start) / FWAVE_FADE_S, (fw.end - s) / FWAVE_FADE_S);
  let v = 0;
  for (let i = 0; i < fw.f.length; i++) v += (fw.a[i] as number) * Math.sin(2 * Math.PI * (fw.f[i] as number) * s + (fw.ph[i] as number));
  v *= g;
  acc[0] = (acc[0] as number) + v * fw.dir[0];
  acc[1] = (acc[1] as number) + v * fw.dir[1];
  acc[2] = (acc[2] as number) + v * fw.dir[2];
}

export interface GenInputs {
  events: EcgEvent[];
  fwaves: FWave[];
  hrv: HrvPhase;
  noiseLevel: number; // Modifiers.artefact.noise
  noise: Sfc32State;
  /** Stage 5.1 (R-S3-3): respiratory clock for the wander; absent = Stage 1's fixed 15/min clock. */
  breath?: BreathClock | undefined;
}

/** Drop events that end before time `t` (they can never contribute again). */
export function pruneEvents(events: EcgEvent[], t: number): EcgEvent[] {
  return events.filter((e) => e.end >= t);
}

/** Generate VCG samples for absolute indices [from, to] (inclusive) and hand each one to `sink`. */
export function generateVcg(
  g: GenInputs,
  from: number,
  to: number,
  sink: (index: number, x: number, y: number, z: number) => void,
): void {
  const t0 = from / ECG_RATE;
  const t1 = to / ECG_RATE;
  const active = g.events.filter((e) => e.start <= t1 && e.end >= t0);
  const acc = new Float64Array(3);
  const sdv = NOISE_SD_MV * g.noiseLevel;
  const fws = g.fwaves.filter((f) => f.start <= t1 && f.end >= t0);
  for (let n = from; n <= to; n++) {
    const s = n / ECG_RATE;
    acc[0] = 0;
    acc[1] = 0;
    acc[2] = 0;
    for (const ev of active) if (s >= ev.start && s <= ev.end) addEventAt(ev, s, acc);
    for (const fw of fws) fwaveAt(fw, s, acc);
    const w = WANDER_MV * respSin(s, g.hrv, g.breath);
    let x = (acc[0] as number) + w * WANDER_DIR[0];
    let y = (acc[1] as number) + w * WANDER_DIR[1];
    let z = (acc[2] as number) + w * WANDER_DIR[2];
    if (sdv > 0) {
      x += sdv * tableNormal(g.noise);
      y += sdv * tableNormal(g.noise);
      z += sdv * tableNormal(g.noise);
    }
    sink(n, x, y, z);
  }
}
