// 12-lead report and trend drawing (brief §6.6, §6.7) on the recording fake.
import { describe, expect, it } from 'vitest';
import { capture12, createEngine, TrendStore } from '@pme/engine-core';
import { draw12Lead, drawTrend, report12Size } from '../src/views.ts';
import { FakeCtx } from './fake-ctx.ts';

describe('views', () => {
  it('12-lead: 3×4 segments plus the rhythm strip, labels for every lead, 4 calibration pulses', () => {
    const e = createEngine({ seed: 2 });
    e.advanceTo(12);
    const ctx = new FakeCtx();
    expect(draw12Lead(ctx, capture12(e), 4)).toBe(13);
    expect(ctx.texts.slice(0, 12)).toEqual(['I', 'aVR', 'V1', 'V4', 'II', 'aVL', 'V2', 'V5', 'III', 'aVF', 'V3', 'V6']);
    expect(ctx.texts[12]).toMatch(/^II {2}25 mm\/s {2}10 mm\/mV {2}0\.05–150 Hz {2}HR \d+/);
    expect(report12Size(4)).toEqual({ widthPx: 1080, heightPx: 540 });
    // one calibration pulse per row: a 10 mm (40 px) rise
    const rises = ctx.calls.filter((c, i) => c.op === 'lineTo' && ctx.calls[i - 1]?.op === 'lineTo' && Math.abs((ctx.calls[i - 1]!.args[1] as number) - (c.args[1] as number) - 40) < 1e-9);
    expect(rises.length).toBe(4);
  });

  it('trend: a line per series, gaps break it, filled-area draws columns', () => {
    const s = new TrendStore();
    for (let t = 0; t < 600; t++) if (t < 200 || t > 300) s.record({ type: 'measurement', t, values: { hr: { value: 70 + (t % 10), flag: 'valid', at: t } } });
    const ctx = new FakeCtx();
    drawTrend(ctx, s, [{ id: 'hr', color: '#0f0', range: [0, 200] }], 0, 599, 600, 100, 'line');
    const moves = ctx.calls.filter((c) => c.op === 'moveTo').length;
    expect(moves).toBe(2); // one run before the gap, one after
    const f = new FakeCtx();
    drawTrend(f, s, [{ id: 'hr', color: '#0f0', range: [0, 200] }], 0, 599, 600, 100, 'filled-area');
    expect(f.calls.filter((c) => c.op === 'moveTo').length).toBe(499);
  });
});
