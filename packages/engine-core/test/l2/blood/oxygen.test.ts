import { describe, expect, it } from 'vitest';
import { o2Delivery, stepLactate } from '../../../src/l2/blood/oxygen.ts';

describe('oxygen delivery and lactate (tables §5b.3, §5.3)', () => {
  it('normal DO2 ≈ 1000 mL/min: no deficit, ER ≈ 0.25', () => {
    const d = o2Delivery(5.25, 5.25, 197, 245, 70);
    expect(d.do2).toBeCloseTo(1034, -1);
    expect(d.deficit).toBe(0);
    expect(d.er).toBeCloseTo(0.24, 1);
  });
  it('regional dependence as CO falls below 88 %; global below DO2crit 6 mL/kg/min; anaemia at normal flow only via DO2crit', () => {
    expect(o2Delivery(3.2, 5.25, 195, 245, 70).deficit).toBeGreaterThan(60); // class III flow
    expect(o2Delivery(0, 5.25, 195, 245, 70).deficit).toBe(245);
    expect(o2Delivery(5.25, 5.25, 92, 245, 70).deficit).toBe(0); // Hb 7 at normal CO: DO2 6.9 mL/kg/min
    expect(o2Delivery(5.25, 5.25, 60, 245, 70).deficit).toBeGreaterThan(20); // Hb ≈ 4.5: below DO2crit
  });
  it('lactate is steady at 1.0 with normal flow; t½ ≈ 30 min after a load (Q41)', () => {
    let m = 42;
    for (let t = 0; t < 3600; t += 0.1) m = stepLactate(m, 42, 0, 1, 1, 0.1);
    expect(m / 42).toBeCloseTo(1, 3);
    m = 5 * 42;
    for (let t = 0; t < 1800; t += 0.1) m = stepLactate(m, 42, 0, 1, 1, 0.1);
    expect(m / 42).toBeGreaterThan(2.8);
    expect(m / 42).toBeLessThan(3.2); // 1 + 4·e^(−ln2) = 3
  });
});
