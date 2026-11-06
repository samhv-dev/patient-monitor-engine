import { describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from './memory-storage.ts';
import { DEFAULT_SITE, DEFIB_CHOICES, defibDefaults, gas, loadSite, pacerDefaults, parseSite, saveSite } from './site.ts';

describe('site profile', () => {
  it('keeps known values and replaces anything else with the default', () => {
    expect(parseSite({ skin: 'iran-icu-as-found', theme: 'projector-light', fps: 30, panel: 'drawer', gasUnit: 'kPa', sensorsOff: true, drugNames: 'uk', instructor: 'teach2', defibModel: 'generic' })).toEqual({
      schema: 'pme-site/1', skin: 'iran-icu-as-found', theme: 'projector-light', fps: 30, panel: 'drawer', gasUnit: 'kPa', sensorsOff: true, drugNames: 'uk', instructor: 'teach2', defibModel: 'generic',
    });
    expect(DEFAULT_SITE.drugNames).toBe('us'); // "epinephrine / norepinephrine" unless the site chooses
    expect(DEFAULT_SITE.instructor).toBe('teach'); // today's Instructor view unless the site chooses v2
    expect(parseSite({ skin: 'nonsense', fps: 144, theme: 'neon', instructor: 'teach3', defibModel: 'lifepak-like' })).toEqual(DEFAULT_SITE);
    expect(parseSite(null)).toEqual(DEFAULT_SITE);
  });
  it('converts gas pressures for the tables', () => {
    expect(gas(40, 'kPa')).toBeCloseTo(5.33, 2);
    expect(gas(40, 'mmHg')).toBe(40);
  });
});

// Room plan R5b: the room's defibrillator model is the room's, kept with the monitor style (owner's Q6 ruling, 5 November)
describe("the room's defibrillator model", () => {
  it('is not chosen by default (the monitor style\'s own defibrillator values, as before), and is kept per room', () => {
    expect(DEFAULT_SITE.defibModel).toBeNull();
    vi.stubGlobal('localStorage', new MemoryStorage()); // this browser's storage (none is guaranteed under Node)
    saveSite({ ...DEFAULT_SITE, defibModel: 'generic' });
    expect(loadSite().defibModel).toBe('generic');
    saveSite({ ...DEFAULT_SITE });
    expect(loadSite().defibModel).toBeNull();
    vi.unstubAllGlobals();
  });
  it('offers the generic model only (Q6\'s second half): 120 J adult, 50 J paediatric, no ladder; its look is zoll-like', () => {
    expect(DEFIB_CHOICES.map((c) => [c.id, c.look])).toEqual([['generic', 'zoll-like']]);
    expect(defibDefaults('generic')).toEqual({ energyAdultJ: 120, energyPaedJ: 50, ladderJ: [] });
    // no model: the panel's energy as before (200 J), so nothing a press sends changes
    expect(defibDefaults(null)).toEqual({ energyAdultJ: 200, energyPaedJ: null, ladderJ: [] });
    expect(defibDefaults('lifepak-like')).toEqual(defibDefaults(null));
  });
  it('the generic model\'s pacer, for the Room card (row 58): 70 ppm, PAUSE drops the output to 0 mA; no model: none named', () => {
    expect(pacerDefaults('generic')).toEqual({ ratePpm: 70, pausePct: null });
    expect(pacerDefaults(null)).toBeNull();
  });
});
