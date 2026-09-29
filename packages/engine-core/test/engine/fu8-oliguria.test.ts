// FU-8 Task A8 (review pack; R-FU5-8): the OLIGURIA flag needs a completed 10-min urine bin.
// Seed 7. SLOW_A (plan Global Constraints: slow-b has 2.4 min of margin).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';

describe('FU-8 A8: the oliguria flag waits for measured urine', () => {
  it('MODELED 1.75 L bleed over 10 min from 60 s: no OLIGURIA flag before the first 10-min urine bin (before FU-8: at 508 s from the instantaneous rate, off at 600 s, on again at 1200 s); from 1200 s the flag is the hourly UOP < 0.5', async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { abp: 'connected' } } });
    const flags: Array<{ t: number; on: boolean; h: number }> = [];
    e.on((x) => {
      if (x.type === 'organs') flags.push({ t: x.t, on: x.kidney.oliguria, h: x.kidney.uop1hMlKgH });
    }, ['organs']);
    e.advanceTo(60);
    e.dispatch({ id: 'b', issuedBy: 'test', type: 'applyEvent', event: { kind: 'bleed', volumeMl: 1750, overS: 600 } } as never);
    for (let t = 120; t <= 4800; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    const first = flags.find((f) => f.on);
    console.log(`fu8 A8: first OLIGURIA flag ${first ? `${first.t.toFixed(0)} s (1 h ${first.h.toFixed(2)} mL/kg/h)` : 'never'}`);
    expect(flags.filter((f) => f.t < 600 && f.on).map((f) => f.t)).toEqual([]);
    expect(flags.filter((f) => f.t >= 1200).every((f) => f.on === f.h < 0.5)).toBe(true);
    expect(flags.filter((f) => f.t >= 600 && f.t < 1200 && f.on).length).toBe(0); // the first bin still holds pre-bleed urine (0.83)
  }, 120_000);
});
