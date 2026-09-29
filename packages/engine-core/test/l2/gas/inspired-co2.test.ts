import { describe, expect, it } from 'vitest';
import { createCo2State, stepCo2 } from '../../../src/l2/gas/co2.ts';

describe('FU-6 R8: inspired CO2 in the CO2 mass balance (Nunn ch. 7)', () => {
  it('at constant VA the steady-state PaCO2 rises by the inspired PCO2', () => {
    const x = { vaLpm: 4, vco2: 200, coRatio: 1, cf: 30, cs: 300, kfs: 20, extraGradient: 0 };
    const a = createCo2State(40);
    const b = createCo2State(40);
    // the slow store equilibrates with τ ≈ cs·(1/kfs + 0.863/VA) ≈ 80 min here: run 12 h (measured: 2 h reaches +6.37)
    for (let i = 0; i < 12 * 36000; i++) { stepCo2(a, x, 0.1); stepCo2(b, { ...x, pico2: 8 }, 0.1); }
    expect(b.pf - a.pf).toBeCloseTo(8, 1);
  });
});
