// FU-11 Task E5 (Stage 9 polish note 4): a pleth lane does not keep a scale taken on the flat first 0.4 s of a new
// engine (the first beat was drawn clamped to the top edge for a second — after every scenario load and restore).
import { describe, expect, it } from 'vitest';
import { MonitorCore } from '../src/monitor-core.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const make = () => new MonitorCore({ width: 0, height: 0 }, new FakeCtx(), { cssW: 1056, cssH: 300, dpr: 1 }, { engine: { seed: 1, patient: { sensors: { spo2: 'on' } } }, waves: ['pleth'] }, () => undefined);
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
const frames = (c: MonitorCore, fromMs: number, toMs: number) => {
  for (let ms = fromMs; ms <= toMs; ms += 1000 / 60) c.frame(1_000_000 + ms);
};

describe('FU-11 E5: the pleth scale is re-taken until a second of signal is in its window', () => {
  it('0.8 s after a start the pleth lane spans the first beat (≈ 1.4), not the flat 0.1 of the first 0.4 s', () => {
    const c = make();
    frames(c, 0, 800);
    const pleth = lanes(c)[lanes(c).length - 1] as SweepLane;
    const span = pleth.cfg.height / (pleth.cfg.gainMmPerMv * pleth.cfg.pxPerMm); // scaleFor's (hi − lo)
    expect(span).toBeGreaterThan(0.5);
  });
});
