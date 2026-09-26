import { describe, expect, it } from 'vitest';
import { bolusScale, drugEffect, pruneBoluses, type Bolus } from '../../../src/l2/circ/drugs.ts';

describe('7a bolus effect curves', () => {
  it('phenylephrine 100 µg peaks at ×1.8 SVR 70–80 s after the bolus and is < 10 % of peak by 15 min', () => {
    const list: Bolus[] = [{ drug: 'phenylephrine', t: 0, scale: bolusScale('phenylephrine', 0.1, 70, []) }];
    let best = { t: 0, svr: 1 };
    for (let t = 0; t < 600; t += 1) {
      const e = drugEffect(list, t, 0);
      if (e.svr > best.svr) best = { t, svr: e.svr };
    }
    expect(best.svr).toBeCloseTo(1.8, 3);
    expect(best.t).toBeGreaterThanOrEqual(70);
    expect(best.t).toBeLessThanOrEqual(80);
    expect(drugEffect(list, 900, 0).svr - 1).toBeLessThan(0.08);
    expect(drugEffect(list, 60, 0).hr).toBe(1); // no direct chronotropy: bradycardia is reflex (A11)
  });
  it('ephedrine peaks at 4–5 min, β-blockade halves-plus its HR/contractility effect, repeats show tachyphylaxis', () => {
    const one: Bolus[] = [{ drug: 'ephedrine', t: 0, scale: bolusScale('ephedrine', 10, 70, []) }];
    let tp = 0;
    let best = 0;
    for (let t = 0; t < 900; t += 5) {
      const e = drugEffect(one, t, 0).ees;
      if (e > best) {
        best = e;
        tp = t;
      }
    }
    expect(tp).toBeGreaterThanOrEqual(240);
    expect(tp).toBeLessThanOrEqual(300);
    expect(drugEffect(one, tp, 0.6).hr - 1).toBeCloseTo((drugEffect(one, tp, 0).hr - 1) * 0.4, 6);
    expect(bolusScale('ephedrine', 10, 70, one)).toBeCloseTo(0.7, 9);
  });
  it('effects on one multiplier combine multiplicatively; old boluses are pruned', () => {
    const list: Bolus[] = [
      { drug: 'propofol', t: 0, scale: 1 },
      { drug: 'phenylephrine', t: 0, scale: 1 },
    ];
    const a = drugEffect([list[0]!], 75, 0).svr;
    const b = drugEffect([list[1]!], 75, 0).svr;
    expect(drugEffect(list, 75, 0).svr).toBeCloseTo(a * b, 9);
    expect(pruneBoluses(list, 1e5)).toEqual([]);
  });
});
