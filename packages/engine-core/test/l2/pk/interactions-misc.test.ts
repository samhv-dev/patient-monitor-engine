// FU-7: the drug rows that act on one target each (Task 12 Step 6 sugammadex bradycardia; Task 18 adds the inert rows).
// Driven through 7g's REAL PK (the 7f rig: one simulated second per step, neutral context).
import { describe, expect, it } from 'vitest';
import { give, rig, runTo } from '../../helpers/neuro.ts';

/** The largest fractional fall of 7g's HR multiplier over `min` minutes after a bolus. */
function hrFall(drugId: string, dose: number, unit = 'mg/kg', min = 10): number {
  const r = rig();
  give(r, drugId, dose, unit);
  let lo = 1;
  runTo(r, min, () => { lo = Math.min(lo, r.pk.fx.hr); });
  return 1 - lo;
}

describe('FU-7: single-target rows', () => {
  it('sugammadex (DI-45): 16 mg/kg gives a 15–30 % HR fall (MHRA/EMA; M10 ch. 24)', () => {
    const f16 = hrFall('sugammadex', 16);
    console.log(`FU-7 T12: sugammadex HR fall 16 mg/kg ${(100 * f16).toFixed(1)} %`);
    expect(f16).toBeGreaterThanOrEqual(0.15);
    expect(f16).toBeLessThanOrEqual(0.3);
  });
  // R45: with the plan's Hill of 1 on a linear PK no EC50 gives both bands — 4 mg/kg < 5 % needs c4 < 0.25·EC50 and
  // 16 mg/kg ≥ 15 % needs c4 ≥ 0.375·EC50. The row (emax −0.25, ec50 12) is kept as written; Ali's calibration item.
  it.fails('sugammadex (DI-45): 4 mg/kg gives < 5 % HR fall — measured 13.4 % (16 mg/kg 20.5 %)', () => {
    expect(hrFall('sugammadex', 4)).toBeLessThan(0.05);
  });
});
