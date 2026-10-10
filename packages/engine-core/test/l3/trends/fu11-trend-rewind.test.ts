// FU-11 Task E2 (external review F05, browser audit BA01): a rewind empties the discarded future of the trend ring.
import { describe, expect, it } from 'vitest';
import { TrendStore, TREND_SLOTS } from '../../../src/l3/trends/trend-store.ts';
import type { EngineEvent } from '../../../src/types.ts';

const hr = (t: number, v: number): EngineEvent => ({ type: 'measurement', t, values: { hr: { value: v, flag: 'valid', at: t } } }) as EngineEvent;

describe('FU-11 E2: TrendStore.rewind', () => {
  it('after a record to 100 s and a rewind to 10 s the future is gone and new seconds are kept', () => {
    const s = new TrendStore();
    for (let t = 0; t <= 100; t++) s.record(hr(t, 120));
    s.rewind(10.4);
    expect(s.latestS).toBe(10);
    expect(Number.isNaN(s.series('hr', 100, 100)[0] as number)).toBe(true);
    s.record(hr(11, 75));
    expect(s.latestS).toBe(11);
    expect(s.series('hr', 10, 11)).toEqual(new Float32Array([120, 75]));
  });
  it('a rewind older than the ring empties it, and a rewind forward is a no-op', () => {
    const s = new TrendStore();
    for (let t = TREND_SLOTS; t < TREND_SLOTS + 5; t++) s.record(hr(t, 90));
    s.rewind(3);
    expect(s.latestS).toBe(3);
    expect(Array.from(s.series('hr', 0, 3)).every(Number.isNaN)).toBe(true);
    s.record(hr(4, 70));
    expect(s.series('hr', 4, 4)[0]).toBe(70);
    s.rewind(50);
    expect(s.latestS).toBe(4);
  });
});
