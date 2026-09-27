// FU-3 item 5 (Q-FU2-10): an atrial-sensing pacemaker (AAI, DDD) is INHIBITED by intrinsic atrial activity faster than
// its lower rate (NASPE/BPEG generic code, Bernstein et al., PACE 2002;25:260–4: position III 'I'/'D' = inhibited by a
// sensed event). FU-2 made MODELED AAI/DDD request max(lower rate, reflex rate); these tests pin how those beats are
// DRAWN: above the lower rate AAI shows sinus P waves and conducted QRS with no spike; DDD (complete block under it,
// the row's default) shows sensed P waves, no atrial spike, and a ventricular spike one AV delay after each P; DDD with
// conduction underneath (PacerOpts.intrinsic 'conducted') conducts the sensed P before the AV delay runs out, so the
// sensed QRS inhibits the ventricular output too; at or below the lower rate every beat is paced.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, RhythmId, RhythmOpts } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
type Beat = Extract<EngineEvent, { type: 'beat' }>;
type Atrial = Extract<EngineEvent, { type: 'atrial' }>;
type Marker = Extract<EngineEvent, { type: 'marker' }>;

/** Engine with a rhythm set at 20 s and optional commands; advanced minute by minute with a yield (CI rule). */
async function run(mode: 'manual' | 'modeled', rhythm: RhythmId, opts: RhythmOpts, tEnd: number, extra?: (e: ReturnType<typeof createEngine>) => void) {
  const e = createEngine({ seed: 7, mode, patient: { sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setRhythm', rhythm, opts }));
  extra?.(e);
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  const within = <T extends { t: number }>(xs: T[], a: number, b: number) => xs.filter((x) => x.t > a && x.t <= b);
  const beats = (a: number, b: number) => within(ev.filter((x): x is Beat => x.type === 'beat'), a, b);
  const atrial = (a: number, b: number) => within(ev.filter((x): x is Atrial => x.type === 'atrial'), a, b);
  const spikes = (a: number, b: number, chamber: 1 | 2) => within(ev.filter((x): x is Marker => x.type === 'marker' && x.kind === 'paceSpike' && x.data?.chamber === chamber), a, b);
  const rate = (a: number, b: number) => {
    const t = beats(a, b).map((x) => x.t);
    return (60 * (t.length - 1)) / ((t.at(-1) ?? 0) - (t[0] ?? 0));
  };
  return { beats, atrial, spikes, rate };
}
const PHE = { kind: 'infusion', drugId: 'phenylephrine', rate: 1, unit: 'mcg/kg/min' };
const BLEED = { kind: 'bleed', volumeMl: 1225, overS: 60 }; // FU-2's reflex-tachycardia scenario

describe('atrial-sensing pacemakers above / at the lower rate (Q-FU2-10)', () => {
  it('MODELED AAI 70 after a bleed (≈ 96 at 180–240 s): sinus P waves, conducted QRS, no atrial spike; on phenylephrine every beat is paced', async () => {
    const b = await run('modeled', 'pacedAAI', { rateBpm: 70 }, 240, (e) => e.dispatch(cmd({ type: 'applyEvent', event: BLEED, atTick: 120 * 50 })));
    const n = b.beats(180, 240).length;
    const a = b.spikes(180, 240, 1).length;
    const pacedP = b.atrial(180, 240).filter((x) => x.kind === 'paced').length;
    console.log(`FU-3 AAI bleed 180–240 s: rate ${b.rate(180, 240).toFixed(1)}, beats ${n}, A spikes ${a}, paced P ${pacedP}, sinus beats ${b.beats(180, 240).filter((x) => x.origin === 'sinus').length}`);
    expect(b.rate(180, 240)).toBeGreaterThanOrEqual(80); // the FU-2 rate is kept
    expect(a).toBe(0);
    expect(pacedP).toBe(0);
    expect(b.atrial(180, 240).every((x) => x.kind === 'p' && x.conducted)).toBe(true); // the sinus P
    expect(b.beats(180, 240).every((x) => x.origin === 'sinus' && x.qrsMs < 120)).toBe(true);
    expect(b.spikes(60, 110, 1).length).toBeGreaterThanOrEqual(b.beats(60, 110).length - 1); // before the bleed: paced at 70

    const p = await run('modeled', 'pacedAAI', { rateBpm: 70 }, 240, (e) => e.dispatch(cmd({ type: 'applyEvent', event: PHE, atTick: 120 * 50 })));
    const pb = p.beats(150, 240);
    const pa = p.spikes(150, 240, 1);
    console.log(`FU-3 AAI phenylephrine 150–240 s: rate ${p.rate(150, 240).toFixed(1)}, beats ${pb.length}, A spikes ${pa.length}`);
    expect(Math.abs(p.rate(150, 240) - 70)).toBeLessThanOrEqual(1);
    for (const x of pb.slice(1)) expect(pa.some((s) => x.t - s.t > 0 && x.t - s.t < 0.4)).toBe(true); // a spike before every beat
  }, 600_000);

  it('MODELED DDD 70 (complete block underneath) after a bleed: atrial-sensed, ventricular-paced — V spike only, 160 ms after each P', async () => {
    const b = await run('modeled', 'pacedDDD', { rateBpm: 70 }, 240, (e) => e.dispatch(cmd({ type: 'applyEvent', event: BLEED, atTick: 120 * 50 })));
    const v = b.spikes(180, 240, 2);
    const p = b.atrial(180, 240);
    console.log(`FU-3 DDD bleed 180–240 s: rate ${b.rate(180, 240).toFixed(1)}, beats ${b.beats(180, 240).length}, A spikes ${b.spikes(180, 240, 1).length}, V spikes ${v.length}, paced P ${p.filter((x) => x.kind === 'paced').length}`);
    expect(b.rate(180, 240)).toBeGreaterThanOrEqual(80);
    expect(b.spikes(180, 240, 1).length).toBe(0);
    expect(p.every((x) => x.kind === 'p')).toBe(true);
    expect(b.beats(180, 240).every((x) => x.origin === 'paced')).toBe(true);
    for (const s of v.slice(1)) {
      const prev = b.atrial(0, s.t).at(-1)!;
      expect(s.t - prev.t).toBeCloseTo(0.16, 6);
    }
  }, 600_000);

  it('MODELED DDD 70 with conduction underneath (PacerOpts.intrinsic conducted) after a bleed: atrial- and ventricular-sensed — no spikes, conducted sinus beats', async () => {
    const b = await run('modeled', 'pacedDDD', { rateBpm: 70, pacer: { intrinsic: 'conducted' } }, 240, (e) => e.dispatch(cmd({ type: 'applyEvent', event: BLEED, atTick: 120 * 50 })));
    const beats = b.beats(180, 240);
    console.log(`FU-3 DDD conducted bleed 180–240 s: rate ${b.rate(180, 240).toFixed(1)}, beats ${beats.length}, A spikes ${b.spikes(180, 240, 1).length}, V spikes ${b.spikes(180, 240, 2).length}, sinus beats ${beats.filter((x) => x.origin === 'sinus').length}, PR ${beats[0]?.prMs}`);
    expect(b.rate(180, 240)).toBeGreaterThanOrEqual(80);
    expect(b.spikes(180, 240, 1).length).toBe(0);
    expect(b.spikes(180, 240, 2).length).toBe(0); // the intrinsic PR (≈ 150 ms) is shorter than the 160 ms AV delay: the conducted QRS inhibits the V output
    expect(beats.every((x) => x.origin === 'sinus' && x.qrsMs < 120)).toBe(true);
  }, 600_000);

  it('MANUAL AAI programmed at 60 ppm: paced at 60; an instructor rate of 90 is intrinsic sinus (no spikes); 50 is paced at 60', async () => {
    const r = await run('manual', 'pacedAAI', { pacer: { ratePpm: 60 } }, 180, (e) => {
      e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 90, atTick: 60 * 50 }));
      e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 50, atTick: 120 * 50 }));
    });
    const log = (a: number, b: number) => `${r.rate(a, b).toFixed(1)}/min, ${r.beats(a, b).length} beats, ${r.spikes(a, b, 1).length} A spikes`;
    console.log(`FU-3 MANUAL AAI 60: ${log(25, 60)}; hr 90: ${log(65, 120)}; hr 50: ${log(125, 180)}`);
    expect(Math.abs(r.rate(25, 60) - 60)).toBeLessThanOrEqual(1);
    expect(r.spikes(25, 60, 1).length).toBeGreaterThanOrEqual(r.beats(25, 60).length - 1);
    expect(Math.abs(r.rate(65, 120) - 90)).toBeLessThanOrEqual(3);
    expect(r.spikes(65, 120, 1).length).toBe(0);
    expect(r.beats(65, 120).every((x) => x.origin === 'sinus')).toBe(true);
    expect(Math.abs(r.rate(125, 180) - 60)).toBeLessThanOrEqual(1);
    expect(r.spikes(125, 180, 1).length).toBeGreaterThanOrEqual(r.beats(125, 180).length - 1);
  }, 300_000);
});
