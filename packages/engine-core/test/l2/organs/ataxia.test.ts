import { describe, expect, it } from 'vitest';
import { createDriver, planCycles } from '../../../src/l2/resp/driver.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';

const ctx = { rr: 15, vt: 500, fio2: 0.21, etco2: 36, complianceMl: 50 };
function cv(ataxia: number): number {
  const d = createDriver(seedStream(7, 'resp'));
  (d as { ataxia?: number }).ataxia = ataxia;
  planCycles(d, ctx, 600);
  const p = d.cycles.map((c) => c.ti + c.te);
  const m = p.reduce((a, x) => a + x, 0) / p.length;
  return Math.sqrt(p.reduce((a, x) => a + (x - m) ** 2, 0) / p.length) / m;
}

describe('ataxic breathing (Cushing, tables §5.1)', () => {
  it('breath-period variability: ≈ 5 % normally, > 25 % at ataxia 1', () => {
    expect(cv(0)).toBeLessThan(0.08);
    expect(cv(1)).toBeGreaterThan(0.25);
  });
});
