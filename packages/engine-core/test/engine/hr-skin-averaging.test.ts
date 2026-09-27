// FU-2 item 5: saadat-like's declared 8 s moving-average HR is now its default (G-FU1 observation). Pinned numbers:
// a 60 → 120 bpm step (no HRV) read once per second. Before FU-2 saadat-like read the trimmed mean of 12 RR, exactly as
// philips-like: 60, 67, 75, 86, 100, 120 at +2…+7 s (settled at +7 s); now an 8 s window: settled at +10 s.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

/** HR readings at +2 … +10 s after an instant 60 → 120 step at 30 s. */
function stepSeries(skin: string): (number | null)[] {
  const e = createEngine({ seed: 3, device: { skin }, patient: { baseline: { hr: 60 } } });
  e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(30);
  e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 120 }));
  e.advanceTo(41);
  const at = new Map<number, number | null>();
  for (const x of ev) if (x.type === 'measurement' && x.values.hr) at.set(Math.round(x.t), x.values.hr.value);
  return [32, 33, 34, 35, 36, 37, 38, 39, 40].map((t) => at.get(t) ?? null);
}

describe('saadat-like 8 s HR averaging (FU-2 item 5)', () => {
  it('saadat-like: 64, 71, 78, 85, 92, 99, 106, 113, 120 at +2 … +10 s (8 s moving average)', () => {
    expect(stepSeries('saadat-like')).toEqual([64, 71, 78, 85, 92, 99, 106, 113, 120]);
  });
  it('philips-like is unchanged: 60, 67, 75, 86, 100, 120 … (trimmed mean of 12 RR)', () => {
    expect(stepSeries('philips-like')).toEqual([60, 67, 75, 86, 100, 120, 120, 120, 120]);
  });
});
