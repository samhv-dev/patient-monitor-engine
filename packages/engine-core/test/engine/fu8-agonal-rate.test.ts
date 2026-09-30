// FU-8 Task A6 (review pack, rhythm R33): the agonal rhythm runs at its rate setting.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A6: the agonal rhythm runs at its rate', () => {
  it.each([6, 12, 18])('MANUAL agonal rateBpm %i: complexes per minute over 300 s within ± 15 % (before FU-8: 11.4/min at every rate)', async (rate) => {
    const e = createEngine({ seed: 7, mode: 'manual', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
    const beats: number[] = [];
    e.on((x) => {
      if (x.type === 'beat' && x.template === 'agonal') beats.push(x.t);
    }, ['beat']);
    e.advanceTo(10);
    e.dispatch({ id: 'r', issuedBy: 'test', type: 'setRhythm', rhythm: 'agonal', opts: { rateBpm: rate } } as never);
    for (let t = 60; t <= 310; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    const perMin = (beats.filter((t) => t > 10 && t <= 310).length / 300) * 60;
    console.log(`fu8 A6: agonal ${rate}/min → ${perMin.toFixed(1)}/min`);
    expect(Math.abs(perMin - rate) / rate).toBeLessThanOrEqual(0.15);
  }, 60_000);
});
