import { describe, expect, it } from 'vitest';
import { pleuralPressureMmHg } from '../../../src/l2/circ/pleural.ts';
import { createDriver, onVentFrame, planCycles, type DriverState } from '../../../src/l2/resp/driver.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';
import { P_PL0, T_IT, CMH2O_TO_MMHG } from '../../../src/l2/circ/params.ts';

function drv(source: DriverState['source'], peep = 5): DriverState {
  const d = createDriver(seedStream(1, 'resp'));
  d.source = source;
  d.vent = { rr: 12, vt: 500, peep, ie: 2 };
  planCycles(d, { rr: 12, vt: 500, fio2: 0.21, etco2: 36, complianceMl: 50 }, 30);
  return d;
}

describe('pleural pressure (audit R-B)', () => {
  it('apnoea / no source: the resting supine value', () => {
    expect(pleuralPressureMmHg(drv('none'), 10, 50)).toBe(P_PL0);
  });
  it('ventilator: end-expiration = P_PL0 + T_IT·PEEP, end-inspiration ≈ + T_IT·VT/C more', () => {
    const d = drv('ventilator', 5);
    let lo = Infinity;
    let hi = -Infinity;
    for (let t = 10; t < 20; t += 0.01) {
      const p = pleuralPressureMmHg(d, t, 50);
      lo = Math.min(lo, p);
      hi = Math.max(hi, p);
    }
    expect(lo).toBeCloseTo(P_PL0 + T_IT * 5 * CMH2O_TO_MMHG, 0);
    expect(hi - lo).toBeGreaterThan(0.9 * T_IT * 10 * CMH2O_TO_MMHG);
  });
  it('spontaneous: inspiration makes the pleura MORE negative (reverse sign)', () => {
    const d = drv('spontaneous');
    let lo = Infinity;
    for (let t = 10; t < 20; t += 0.01) lo = Math.min(lo, pleuralPressureMmHg(d, t, 50));
    expect(lo).toBeLessThan(P_PL0 - 2);
  });
  it('external drive: follows the stored frame pressure (Stage V stores alveolar pressure there)', () => {
    const d = drv('none');
    onVentFrame(d, { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.21, peepCmH2O: 5 }, 1);
    onVentFrame(d, { pawCmH2O: 20, flowLps: 0.5, volumeMl: 300, fio2: 0.21, peepCmH2O: 5 }, 1.02);
    expect(pleuralPressureMmHg(d, 1.02, 50)).toBeCloseTo(P_PL0 + T_IT * 20 * CMH2O_TO_MMHG, 6);
  });
});
