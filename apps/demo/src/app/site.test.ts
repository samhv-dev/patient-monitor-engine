import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE, gas, parseSite } from './site.ts';

describe('site profile', () => {
  it('keeps known values and replaces anything else with the default', () => {
    expect(parseSite({ skin: 'iran-icu-as-found', theme: 'projector-light', fps: 30, panel: 'drawer', gasUnit: 'kPa', sensorsOff: true, drugNames: 'uk' })).toEqual({
      schema: 'pme-site/1', skin: 'iran-icu-as-found', theme: 'projector-light', fps: 30, panel: 'drawer', gasUnit: 'kPa', sensorsOff: true, drugNames: 'uk',
    });
    expect(DEFAULT_SITE.drugNames).toBe('us'); // "epinephrine / norepinephrine" unless the site chooses (ruling 5)
    expect(parseSite({ skin: 'nonsense', fps: 144, theme: 'neon' })).toEqual(DEFAULT_SITE);
    expect(parseSite(null)).toEqual(DEFAULT_SITE);
  });
  it('converts gas pressures for the tables', () => {
    expect(gas(40, 'kPa')).toBeCloseTo(5.33, 2);
    expect(gas(40, 'mmHg')).toBe(40);
  });
});
