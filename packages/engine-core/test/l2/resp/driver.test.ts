// Respiratory driver (brief §4.7): cycles by source and airway state, the u(t) seam, VA, external drive.
import { describe, expect, it } from 'vitest';
import { seedStream } from '../../../src/rng/sfc32.ts';
import {
  alveolarVentilation, breathSignal, chestVolume, createDriver, cycleAt, meanAirwayPressure, onVentFrame, planCycles, replan, type DriverCtx,
} from '../../../src/l2/resp/driver.ts';

const ctx: DriverCtx = { rr: 15, vt: 500, fio2: 0.21, etco2: 36, complianceMl: 50 };
const mk = () => createDriver(seedStream(1, 'resp'));

describe('respiratory driver', () => {
  it('ventilator: RR 12, I:E 1:2, u(t) has mean 0.5 and a 1.0 swing for VT 500 at C 50', () => {
    const d = mk();
    d.source = 'ventilator';
    d.vent = { rr: 12, vt: 500, peep: 5, ie: 2 };
    planCycles(d, ctx, 60);
    const c = cycleAt(d, 30)!;
    expect(c.ti + c.te).toBeCloseTo(5, 9);
    expect(c.ti).toBeCloseTo(5 / 3, 9);
    let s = 0;
    let lo = 9;
    let hi = -9;
    for (let t = 30; t < 35; t += 0.01) {
      const u = breathSignal(d, t, 50);
      s += u;
      lo = Math.min(lo, u);
      hi = Math.max(hi, u);
    }
    expect(s / 500).toBeCloseTo(0.5, 2);
    expect(hi - lo).toBeCloseTo(1.0, 1);
    expect(alveolarVentilation(d, 30, 204)).toBeCloseTo((12 * 296) / 1000, 6);
    expect(meanAirwayPressure(d, 30, 50)).toBeGreaterThan(7);
  });

  it('spontaneous apnoea: no cycles, u = 0.5; obstructed: chest efforts without gas exchange', () => {
    const d = mk();
    d.airway = 'apnoea';
    planCycles(d, ctx, 30);
    expect(d.cycles).toHaveLength(0);
    expect(breathSignal(d, 10, 50)).toBe(0.5);
    const o = mk();
    o.airway = 'obstructed';
    planCycles(o, ctx, 30);
    expect(o.cycles.length).toBeGreaterThan(5);
    expect(o.cycles.every((c) => !c.exch && c.sampled === 'none')).toBe(true);
    expect(alveolarVentilation(o, 10, 150)).toBe(0);
    expect(Math.max(...Array.from({ length: 400 }, (_, i) => chestVolume(o, 10 + i / 100)))).toBeGreaterThan(300);
  });

  it('airway loss cuts the running cycle at once and withdraws planned ones', () => {
    const d = mk();
    d.source = 'ventilator';
    planCycles(d, ctx, 12);
    const dropped = replan(d, 10.5, true, false);
    expect(dropped.length).toBeGreaterThanOrEqual(0);
    expect(cycleAt(d, 10.5)!.cutAt).toBe(10.5);
    expect(alveolarVentilation(d, 10.6, 150)).toBe(0);
  });

  it('externalDrive: inspiration at flow > 0.05 L/s makes a cycle with the frame volume; mean Paw is the breath mean', () => {
    const d = mk();
    for (let t = 0.02; t <= 20; t += 0.02) {
      const u = t % 5;
      const insp = u < 1.5;
      const vol = insp ? (500 * u) / 1.5 : 500 * Math.exp(-(u - 1.5) / 0.5);
      onVentFrame(d, { pawCmH2O: 5 + vol / 50, flowLps: insp ? 0.33 : -0.5, volumeMl: vol, fio2: 0.4, peepCmH2O: 5 }, t);
    }
    expect(d.source).toBe('external');
    const done = d.cycles.slice(1, -1);
    expect(done.length).toBeGreaterThanOrEqual(2);
    for (const c of done) {
      expect(c.ti + c.te).toBeCloseTo(5, 1);
      expect(c.vt).toBeGreaterThan(480);
    }
    expect(meanAirwayPressure(d, 20, 50)).toBeGreaterThan(6);
    expect(meanAirwayPressure(d, 20, 50)).toBeLessThan(9);
  });
});
