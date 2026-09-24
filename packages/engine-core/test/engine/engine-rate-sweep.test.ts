import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { RhythmId } from '../../src/types.ts';

/** Mean displayed HR (the device measurement: detector on lead II + 12-RR averaging) over [from, to] s. */
function measuredHr(rhythm: RhythmId, hr: number, hrvScale: number, seed = 3, from = 30, to = 60): number {
  const e = createEngine({ seed, patient: { rhythm: { id: rhythm }, baseline: { hr } } });
  e.dispatch({ id: 'm', issuedBy: 'test', type: 'setModifiers', modifiers: { hrvScale } });
  const vals: number[] = [];
  e.on((ev) => {
    if (ev.type === 'measurement' && ev.t >= from && ev.values.hr?.value != null) vals.push(ev.values.hr.value);
  }, ['measurement']);
  e.advanceTo(to);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

describe('sinus rate sweep (review H1: sinus above ~180 locked into 2:1)', () => {
  for (const hrvScale of [0, 1]) {
    it(`sinus 40–220 bpm, HRV ${hrvScale ? 'on' : 'off'}: displayed HR within ±3 % of the set rate`, () => {
      for (let hr = 40; hr <= 220; hr += 20) {
        const got = measuredHr('sinus', hr, hrvScale);
        expect({ hr, got: Math.round(got * 10) / 10, ok: Math.abs(got - hr) / hr <= 0.03 }).toEqual({ hr, got: expect.any(Number), ok: true });
      }
    });
  }

  it('sinusTachy 200 reads 200 with and without HRV (3 seeds)', () => {
    for (const seed of [1, 2, 3]) {
      for (const hrvScale of [0, 1]) expect(Math.abs(measuredHr('sinusTachy', 200, hrvScale, seed) - 200)).toBeLessThanOrEqual(6);
    }
  });
});
