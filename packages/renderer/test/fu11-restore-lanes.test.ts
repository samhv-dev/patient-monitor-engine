// FU-11 Task E2 (external review F05, browser audit BA01): a restore restarts the sweep at the snapshot's tick (the
// lanes waited for the old high-water time).
import { describe, expect, it } from 'vitest';
import { MonitorCore } from '../src/monitor-core.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

const make = () => new MonitorCore({ width: 0, height: 0 }, new FakeCtx(), { cssW: 1056, cssH: 300, dpr: 1 }, { engine: { seed: 1, patient: { sensors: { spo2: 'on' } } }, waves: ['pleth'] }, () => undefined);
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
const frames = (c: MonitorCore, fromMs: number, toMs: number) => {
  for (let ms = fromMs; ms <= toMs; ms += 1000 / 60) c.frame(1_000_000 + ms);
};

describe('FU-11 E2: restore restarts the sweep', () => {
  it('after a restore from 5 s to 1 s every lane draws again within a frame', () => {
    const c = make();
    frames(c, 0, 1000);
    const s = c.engine.snapshot();
    frames(c, 1000, 5000);
    c.restore(s);
    expect(c.engine.now().tick).toBe(s.tick);
    expect(lanes(c).every((l) => l.lastDrawnIndex === -1)).toBe(true);
    frames(c, 5000, 5100);
    expect(lanes(c).every((l) => l.lastDrawnIndex > 0)).toBe(true);
    for (const l of lanes(c)) expect(l.lastDrawnIndex).toBeLessThan(l.cfg.rate * 1.3); // drawn on the restored timeline
  });
});
