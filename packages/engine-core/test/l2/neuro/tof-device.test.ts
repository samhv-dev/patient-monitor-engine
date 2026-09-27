import { describe, expect, it } from 'vitest';
import { seedStream } from '../../../src/rng/sfc32.ts';
import type { EngineEvent } from '../../../src/types.ts';
import { tofFrom } from '../../../src/l2/neuro/nmb.ts';
import { createTofDevice, tofAction, tofStep, validateTofAction } from '../../../src/l2/neuro/tof-device.ts';

const tofs = (out: EngineEvent[]) => out.filter((e): e is Extract<EngineEvent, { type: 'tof' }> => e.type === 'tof');

describe('TOF stimulator (decision 13)', () => {
  it('validates actions and intervals', () => {
    expect(validateTofAction('start', 15)).toBeUndefined();
    expect(validateTofAction('start', 5)).toMatch(/12–60/);
    expect(validateTofAction('tetanus', undefined)).toMatch(/start, stop/);
  });
  it('start → a train at once, then every intervalS; stop ends them; ratio only at count 4', () => {
    const d = createTofDevice(seedStream(1, 'neuro-tof'));
    const out: EngineEvent[] = [];
    tofAction(d, 'start', 10, 20);
    for (let t = 10; t < 70.05; t += 0.1) tofStep(d, Math.round(t * 10) / 10, tofFrom(0.85, 1, 0), out);
    expect(tofs(out).map((e) => e.t)).toEqual([10, 30, 50, 70]);
    expect(tofs(out)[0]?.ratio).toBeNull();
    tofAction(d, 'stop', 71);
    const out2: EngineEvent[] = [];
    for (let t = 71; t < 120; t += 0.1) tofStep(d, t, tofFrom(0.02, 1, 0), out2);
    expect(tofs(out2)).toEqual([]);
    tofAction(d, 'train', 120);
    tofStep(d, 120, tofFrom(0.02, 1, 0), out2);
    const one = tofs(out2)[0];
    expect(one?.count).toBe(4);
    expect(one?.ratio).toBeGreaterThan(0.85);
    expect(one?.ratio).toBeLessThanOrEqual(1.05);
    const m = out2.find((e) => e.type === 'measurement') as Extract<EngineEvent, { type: 'measurement' }>;
    expect(m.values.tofCount?.value).toBe(4);
  });
  it('PTC reports 23 s later (count 0 only) and locks TOF out for 60 s', () => {
    const d = createTofDevice(seedStream(2, 'neuro-tof'));
    const out: EngineEvent[] = [];
    tofAction(d, 'start', 0, 15);
    tofStep(d, 0, tofFrom(0.99, 1, 0), out);
    tofAction(d, 'ptc', 5);
    for (let t = 5; t < 80; t += 0.1) tofStep(d, Math.round(t * 10) / 10, tofFrom(0.985, 1, 0), out);
    const ptc = tofs(out).find((e) => e.mode === 'ptc');
    expect(ptc?.t).toBe(5);
    expect(ptc?.ptc).toBeGreaterThan(0);
    expect(tofs(out).filter((e) => e.mode === 'tof' && e.t > 5 && e.t < 65)).toEqual([]);
  });
});
