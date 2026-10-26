// MH activity and dantrolene (tables §5.3, §7 check 21). Dantrolene's effect curve is Stage 7g's (R51 §1): the test
// feeds 7g's own row (gamma curve, E = C/(C + 1) in 2.5 mg/kg reference doses) so the fit is the engine's.
import { describe, expect, it } from 'vitest';
import { gammaConc, gammaN } from '../../../src/l2/pk/gamma.ts';
import { hill } from '../../../src/l2/pk/pd.ts';
import { mhActivity, mhFromExposure, mhPeakXOf, mhVo2PeakX, stepMh, type MhState } from '../../../src/l2/thermal/mh.ts';
import { MH_PHENOTYPE, MH_VO2_PEAK_X } from '../../../src/l2/thermal/params.ts';

/** 7g's dantrolene effect `bus.metabolic.dantroleneE` for boluses of `mgKg` at time 0 (rows-other.ts: tp 600 s, t10 6 h). */
const dantE = (mgKg: number, t: number) => hill(gammaConc([{ t: 0, scale: mgKg / 2.5 }], t, 600, gammaN(600, 21_600)), 1, 1);

function course(mgKg: number, seconds: number): MhState {
  const mh: MhState = { severity: 1, t0: -3600 };
  for (let s = 1; s <= seconds; s++) stepMh(mh, dantE(mgKg, s), 1);
  return mh;
}

describe('MH and dantrolene (drug effect curve)', () => {
  it('untreated: the ramp — severity × min(1, (t − t0)/900 s); no dantrolene → s stays undefined', () => {
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

  it('5 mg/kg suppresses more than 2.5 mg/kg; as the drug curve wanes the activity creeps back (recrudescence)', () => {
    expect(mhActivity(course(5, 3600), 0)).toBeLessThan(mhActivity(course(2.5, 3600), 0));
    const mh = course(2.5, 3600);
    const a1 = mhActivity(mh, 0);
    for (let s = 3601; s <= 12 * 3600; s++) stepMh(mh, dantE(2.5, s), 1);
    expect(mhActivity(mh, 0)).toBeGreaterThan(a1 + 0.1);
  });
});

describe('E134 MH severity as a scenario input (the phenotype)', () => {
  it('the phenotype names the peak VO2 multiple: typical 2.5 (the default), fulminant 5', () => {
    expect(MH_PHENOTYPE.typical).toBe(MH_VO2_PEAK_X);
    expect(MH_PHENOTYPE.fulminant).toBe(5);
    expect(mhPeakXOf('typical')).toBe(2.5);
    expect(mhPeakXOf('fulminant')).toBe(5);
    expect(mhPeakXOf(undefined)).toBe(MH_VO2_PEAK_X);
    expect(mhPeakXOf('nonsense')).toBe(MH_VO2_PEAK_X); // the validator rejects it; the model takes the typical one
  });

  it('a state without a multiple is the typical one; no MH is no excess', () => {
    expect(mhVo2PeakX(null)).toBe(1);
    expect(mhVo2PeakX({ severity: 1, t0: 0 })).toBe(MH_VO2_PEAK_X);
    expect(mhVo2PeakX({ severity: 1, t0: 0, vo2PeakX: 5 })).toBe(5);
  });

  it("a susceptible patient's own phenotype reaches the MH the triggers start", () => {
    const a = mhFromExposure(null, { sux: 100, phenotype: 'fulminant' }, undefined, 100);
    expect(a.owner).toBe('auto');
    expect(a.mh?.phenotype).toBe('fulminant');
    expect(mhVo2PeakX(a.mh)).toBe(5);
    const b = mhFromExposure(null, { sux: 100 }, undefined, 100);
    expect(mhVo2PeakX(b.mh)).toBe(MH_VO2_PEAK_X);
    expect(b.mh?.phenotype).toBeUndefined();
  });

  it('the severity (the activity) and the phenotype (the gain) are different things', () => {
    const half: MhState = { severity: 0.5, t0: -3600, vo2PeakX: 5 };
    expect(mhActivity(half, 0)).toBe(0.5); // half the calcium leak
    expect(mhVo2PeakX(half)).toBe(5); // of a fulminant phenotype
  });
});
