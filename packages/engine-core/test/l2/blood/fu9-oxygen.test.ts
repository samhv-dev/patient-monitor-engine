// FU-9 Task A2 (F3): extraction rises before VO2 becomes supply-dependent; the regional term makes lactate only.
import { describe, expect, it } from 'vitest';
import { o2Delivery } from '../../../src/l2/blood/oxygen.ts';

describe('FU-9 F3: O2 extraction before supply dependence (Cain 1977; Vincent & De Backer 2013)', () => {
  it('CO 60 % of rest, DO2 above DO2crit: VO2 = demand (ER rises), the regional LACTATE deficit is still there', () => {
    const d = o2Delivery(3.15, 5.25, 197, 245, 70); // DO2 621 > 420
    expect(d.vo2).toBe(245);
    expect(d.er).toBeCloseTo(245 / 621, 2);
    expect(d.deficit).toBeGreaterThan(60);
  });
  it('below DO2crit VO2 falls in proportion (demand·DO2/DO2crit), so ER stays at demand/DO2crit', () => {
    const d = o2Delivery(1.5, 5.25, 197, 245, 70); // DO2 296 < 420
    expect(d.vo2).toBeCloseTo((245 * 296) / 420, 0);
    expect(d.er).toBeCloseTo(245 / 420, 2);
    expect(o2Delivery(0, 5.25, 197, 245, 70).vo2).toBe(0);
  });
});
