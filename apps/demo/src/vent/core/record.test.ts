// The breath record (core/record.ts, piece V1): Ti with the pause, Te, I:E, peak flow and the end-expiratory pressure of
// the last 50 ms of expiration (research/57 R-08, R-23), and it keeps recording while the display is frozen (K-07).
import { createVentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createCockpit } from './cockpit.ts';
import type { FaceSpec } from './types.ts';

const FACE: FaceSpec = { id: 'test', label: 'Test', ranges: {}, modes: {}, matchMonitorFlow: false };
const run = (d: ReturnType<typeof createVentDriver>, s: number, from = 0) => {
  let ms = from;
  d.frame(ms);
  for (let i = 0; i < s * 10; i++) d.frame((ms += 100));
  return ms;
};

describe('the breath record', () => {
  it('reports PC\'s Ti, Te and I:E from the phases, and PEEP from the end of expiration', () => {
    const d = createVentDriver(null);
    const c = createCockpit(d, FACE, { linked: false });
    expect(c.record()).toBeNull();
    c.write({ mode: 'PC', itime: 1.0, rate: 15, peep: 8, pc: 12, spont: false });
    run(d, 20);
    const r = c.record()!;
    // within the model's 5 ms step
    expect(Math.abs(r.ti - 1.0)).toBeLessThanOrEqual(0.0051);
    expect(Math.abs(r.te - 3.0)).toBeLessThanOrEqual(0.0051);
    expect(r.ie).toBeCloseTo(1 / 3, 2);
    expect(r.tiTtot).toBeCloseTo(0.25, 2);
    expect(r.peepEnd).toBeGreaterThan(7.5);
    expect(r.peepEnd).toBeLessThan(8.5);
    expect(r.peakFlowLpm).toBeGreaterThan(10);
  });

  it('counts VC\'s pause in Ti (research/57 R-08) and keeps recording while frozen', () => {
    const d = createVentDriver(null);
    const c = createCockpit(d, FACE, { linked: false });
    c.write({ mode: 'VC', vt: 500, vcFlow: 30, pause: 0.5, rate: 12, spont: false });
    c.toggleFreeze();
    const t = run(d, 20);
    expect(c.buf.t.length).toBe(0);
    expect(Math.abs(c.record()!.ti - 1.5)).toBeLessThanOrEqual(0.0051);
    c.toggleFreeze();
    run(d, 1, t + 100);
    expect(c.buf.ph.length).toBe(c.buf.t.length);
    expect(c.buf.vb.length).toBe(c.buf.t.length);
  });
});
