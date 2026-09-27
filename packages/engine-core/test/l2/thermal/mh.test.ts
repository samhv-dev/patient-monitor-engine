// MH activity and dantrolene (tables §5.3, §7 check 21). Dantrolene's effect curve is Stage 7g's (R51 §1): the test
// feeds 7g's own row (gamma curve, E = C/(C + 1) in 2.5 mg/kg reference doses) so the fit is the engine's.
import { describe, expect, it } from 'vitest';
import { gammaConc, gammaN } from '../../../src/l2/pk/gamma.ts';
import { hill } from '../../../src/l2/pk/pd.ts';
import { mhActivity, stepMh, type MhState } from '../../../src/l2/thermal/mh.ts';

/** 7g's dantrolene effect `bus.metabolic.dantroleneE` for boluses of `mgKg` at time 0 (rows-other.ts: tp 600 s, t10 6 h). */
const dantE = (mgKg: number, t: number) => hill(gammaConc([{ t: 0, scale: mgKg / 2.5 }], t, 600, gammaN(600, 21_600)), 1, 1);

function course(mgKg: number, seconds: number): MhState {
  const mh: MhState = { severity: 1, t0: -3600 };
  for (let s = 1; s <= seconds; s++) stepMh(mh, dantE(mgKg, s), 1);
  return mh;
}

describe('MH and dantrolene (7g effect curve)', () => {
  it('untreated: Stage 3 ramp — severity × min(1, (t − t0)/900 s); no dantrolene → s stays undefined', () => {
    const mh: MhState = { severity: 1, t0: 600 };
    expect(mhActivity(mh, 600)).toBe(0);
    expect(mhActivity(mh, 1050)).toBeCloseTo(0.5, 9);
    stepMh(mh, 0, 1);
    expect(mh.s).toBeUndefined();
    expect(mhActivity(mh, 5000)).toBe(1);
    expect(mhActivity(null, 5000)).toBe(0);
  });

  it('2.5 mg/kg: activity < 0.7 at 5 min, < 0.4 at 15 min, floor ≈ 0.2 (repeat to response)', () => {
    expect(mhActivity(course(2.5, 300), 0)).toBeLessThan(0.7);
    expect(mhActivity(course(2.5, 900), 0)).toBeLessThan(0.4);
    const late = mhActivity(course(2.5, 3600), 0);
    expect(late).toBeGreaterThan(0.1);
    expect(late).toBeLessThan(0.35);
  });

  it('5 mg/kg suppresses more than 2.5 mg/kg; as 7g’s curve wanes the activity creeps back (recrudescence)', () => {
    expect(mhActivity(course(5, 3600), 0)).toBeLessThan(mhActivity(course(2.5, 3600), 0));
    const mh = course(2.5, 3600);
    const a1 = mhActivity(mh, 0);
    for (let s = 3601; s <= 12 * 3600; s++) stepMh(mh, dantE(2.5, s), 1);
    expect(mhActivity(mh, 0)).toBeGreaterThan(a1 + 0.1);
  });
});
