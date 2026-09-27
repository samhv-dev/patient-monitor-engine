// FU-3 item 6 (Q-FU2-11): the HR numeric in MANUAL AF against the TRUE mean ventricular rate (60 × beats / elapsed
// time, from the rhythm engine's own 'beat' events). Diagnosis (seed 21, 80–380 s): the QRS detector is exact (its
// detected R count equals the beat count: 489 / 649 / 732 at AF 100 / 130 / 145); the AF generator realises
// 97.6 / 129.7 / 146.3 (−2.4 / −0.2 / +0.9 %, the sampling spread of a 300 s window); the numeric read
// 98.8 / 135.9 / 150.2 (+1.2 / +4.8 / +2.7 % over the TRUE mean). The over-read was the averaging: the engine ran
// EVERY skin on the IEC-default trimmed mean of 12 RR (drop the max and the min), although philips-like declares
// Philips' disclosed plain mean of the 12 most recent RR (research 03 §1.12 [P: MP2 datasheet, AAMI EC13 disclosure];
// skins `hr.method: 'mean-12rr'` → `render.hrMethod.engine: 'mean12'`). On AF's right-skewed RR (a refractory floor
// and a long tail, CV 0.28–0.30 at 130–145) dropping the longest and the shortest RR shortens the mean RR by
// 0.1–0.15 SD, i.e. +3–5 % on the number. The plain mean keeps only the estimator's Jensen bias,
// E[60 / mean of 12 RR] ≈ (60 / mean RR)(1 + CV²/12): +0.3 % at AF 100 (CV 0.20), ≤ +0.75 % at CV 0.30 — the
// tolerance below is twice that ceiling. Skins that DISCLOSE the trimmed mean (the IEC default: ge-, zoll-, mindray-,
// lifepak-like; research 05 [S4], Mindray spec citing IEC 60601-2-27 cl. 201.7.9.2.9.101) keep it and its over-read.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { HrState } from '../../src/l3/hr.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
const A = 80; // measurement window (A, B] s; the rhythm is set at 20 s
const B = 380;

/**
 * MANUAL engine, `rhythm` at `rate` from 20 s. Over (A, B]: the true mean rate (60 × (beats − 1) / span of the
 * 'beat' events), the detected R count (the HR state's R history, read from a snapshot every 20 s), and the mean of
 * the 1 Hz HR numeric.
 */
function hrVsTrue(skin: string, rhythm: string, rate: number): Promise<Run> {
  const key = `${skin} ${rhythm} ${rate}`;
  let r = runs.get(key);
  if (!r) runs.set(key, (r = measure(skin, rhythm, rate)));
  return r;
}
interface Run {
  trueRate: number;
  monitor: number;
  pct: number;
  beats: number;
  detected: number;
}
const runs = new Map<string, Promise<Run>>(); // the philips-like AF runs serve two tests

async function measure(skin: string, rhythm: string, rate: number, seed = 21): Promise<Run> {
  const e = createEngine({ seed, device: { skin } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setRhythm', rhythm, opts: { rateBpm: rate } }));
  const rs = new Set<number>();
  for (let t = 40; t <= B + 20; t += 20) {
    e.advanceTo(t);
    const hrm = (e.snapshot().state as { st: { hrm: HrState } }).st.hrm;
    for (const r of hrm.long?.end ?? []) if (r > A && r <= B) rs.add(r);
    if (t % 60 === 0) await yieldNow();
  }
  const beats = ev.flatMap((x) => (x.type === 'beat' && x.t > A && x.t <= B ? [x.t] : []));
  const trueRate = (60 * (beats.length - 1)) / ((beats.at(-1) as number) - (beats[0] as number));
  const hr = ev.flatMap((x) => (x.type === 'measurement' && x.t > A && x.t <= B && x.values.hr?.value != null ? [x.values.hr.value] : []));
  const monitor = hr.reduce((s, v) => s + v, 0) / hr.length;
  const pct = (100 * (monitor - trueRate)) / trueRate;
  console.log(
    `FU-3 ${skin} ${rhythm} ${rate}: true ${trueRate.toFixed(2)} (${beats.length} beats, ${rs.size} detected R), ` +
      `monitor ${monitor.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)} %)`,
  );
  return { trueRate, monitor, pct, beats: beats.length, detected: rs.size };
}

describe('HR numeric in MANUAL AF vs the true mean ventricular rate (FU-3 item 6, Q-FU2-11)', () => {
  // The generator bound is the sampling spread of the window, not a calibration: SE of the mean RR ≈ CV/√n ≈ 0.20/√489
  // ≈ 0.9 % at AF 100, and ± 3 % ≈ 3 SE (FU-2's ± 2 % AF-mapping gate is on 600 s runRhythm runs at 130–150).
  it('the detector counts every beat, and the AF generator realises its set rate (± 3 %): AF 100 / 130 / 145', async () => {
    for (const rate of [100, 130, 145]) {
      const r = await hrVsTrue('philips-like', 'afib', rate);
      expect(Math.abs(r.detected - r.beats), `AF ${rate}: ${r.detected} R vs ${r.beats} beats`).toBeLessThanOrEqual(1);
      expect(Math.abs(r.trueRate - rate) / rate, `AF ${rate}: true ${r.trueRate.toFixed(2)}`).toBeLessThanOrEqual(0.03);
    }
  }, 300_000);

  it('philips-like (plain mean of 12 RR, its disclosed method): AF 100 / 130 / 145 read the true mean within ± 1.5 %', async () => {
    for (const rate of [100, 130, 145]) {
      const r = await hrVsTrue('philips-like', 'afib', rate);
      expect(Math.abs(r.pct), `AF ${rate}: ${r.pct.toFixed(2)} %`).toBeLessThanOrEqual(1.5);
    }
  }, 300_000);

  it('saadat-like (8 s moving average, FU-2 item 5) is untouched: AF 130 / 145 read the true mean within ± 1.5 %', async () => {
    for (const rate of [130, 145]) {
      const r = await hrVsTrue('saadat-like', 'afib', rate);
      expect(Math.abs(r.pct), `AF ${rate}: ${r.pct.toFixed(2)} %`).toBeLessThanOrEqual(1.5);
    }
  }, 300_000);

  it('mindray-like keeps its disclosed trimmed mean of 12 RR, and with it the over-read on AF 100 / 130 / 145', async () => {
    const lo = { 100: 0.5, 130: 2, 145: 2 } as const; // the trimming bias grows with the RR CV (0.20 at 100, ≈ 0.29 at 130–145)
    for (const rate of [100, 130, 145] as const) {
      const r = await hrVsTrue('mindray-like', 'afib', rate);
      expect(r.pct, `AF ${rate}: ${r.pct.toFixed(2)} %`).toBeGreaterThan(lo[rate]);
    }
  }, 300_000);

  it('philips-like, regular sinus 60 / 100 / 150: the numeric is within 0.5 bpm of the true mean', async () => {
    for (const rate of [60, 100, 150]) {
      const r = await hrVsTrue('philips-like', 'sinus', rate);
      expect(Math.abs(r.monitor - r.trueRate)).toBeLessThanOrEqual(0.5);
    }
  }, 300_000);
});
