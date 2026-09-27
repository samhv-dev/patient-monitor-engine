import { describe, expect, it } from 'vitest';
import { bateman, bicarbCo2MlMin, caMembrane, insulinEffect, salbutamolEffect, suxDeltaK } from '../../../src/l2/blood/treatments.ts';

describe('7c treatment curves (tables §5b.2)', () => {
  it('Bateman curves peak at 1', () => {
    let m = 0;
    for (let t = 0; t < 600; t += 0.5) m = Math.max(m, bateman(t, 1 / 15, 1 / 180));
    expect(m).toBeCloseTo(1, 3);
  });
  it('succinylcholine: +0.5 at 4 min and < 0.15 by 15 min normally; burns severity 1: +6.5 and still > +3 at 20 min', () => {
    expect(suxDeltaK(4, 0)).toBeCloseTo(0.5, 6);
    expect(suxDeltaK(15, 0)).toBeLessThan(0.15);
    expect(suxDeltaK(4, 1)).toBeCloseTo(6.5, 6);
    expect(suxDeltaK(20, 1)).toBeGreaterThan(3);
  });
  it('insulin effect starts within 10–20 min and lasts 4–6 h; salbutamol peaks near 30 min; calcium works in 1–3 min for 30–60 min', () => {
    expect(insulinEffect(15)).toBeGreaterThan(0.3);
    expect(insulinEffect(240)).toBeGreaterThan(0.3); // still a third of the peak at 4 h
    expect(salbutamolEffect(30)).toBeGreaterThan(0.85);
    expect(caMembrane(3)).toBeGreaterThan(0.85);
    expect(caMembrane(60)).toBeLessThan(0.3);
  });
  it('bicarbonate CO2: 25 % of the dose × 22.4 mL, delivered over minutes', () => {
    const d = [{ id: 'sodiumBicarbonate' as const, t0: 0, amount: 50 }];
    let total = 0;
    for (let t = 0; t < 1800; t += 1) total += bicarbCo2MlMin(d, t) / 60;
    expect(total).toBeCloseTo(0.25 * 50 * 22.4, -1);
    expect(bicarbCo2MlMin(d, 60)).toBeGreaterThan(bicarbCo2MlMin(d, 600));
  });
});
