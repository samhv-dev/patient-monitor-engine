// CO2 numerics (brief §4.4 "Numerics (L3)"): breath detection, EtCO2 max of 10 s, FiCO2, awRR, apnoea at 20 s.
import { describe, expect, it } from 'vitest';
import { co2Numerics, co2NumStep, createCo2Num } from '../../../src/l3/co2-numerics/co2-numerics.ts';

describe('CO2 numerics', () => {
  it('square breaths at 12/min, 38 mmHg over 2 mmHg baseline: EtCO2 38, FiCO2 2, awRR 12; apnoea 20 s after the last breath', () => {
    const st = createCo2Num();
    let apnoeaAt = -1;
    for (let m = 0; m < 62.5 * 80; m++) {
      const t = m / 62.5;
      const x = t < 50 && t % 5 > 2 ? 38 : 2;
      if (co2NumStep(st, t, x, 1 / 62.5) === 'apnoea') apnoeaAt = t;
      if (Math.abs(t - 45) < 1e-9) {
        const n = co2Numerics(st, t, x);
        expect(n.etco2.value).toBe(38);
        expect(n.imco2.value).toBe(2);
        expect(n.awrr.value).toBe(12);
      }
    }
    expect(apnoeaAt - 47).toBeGreaterThanOrEqual(20);
    expect(apnoeaAt - 47).toBeLessThanOrEqual(20.1);
    expect(co2Numerics(st, 80, 2).awrr.value).toBe(0);
  });
});
