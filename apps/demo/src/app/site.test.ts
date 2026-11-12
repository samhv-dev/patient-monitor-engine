import { describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from './memory-storage.ts';
import { DEFAULT_SITE, DEFIB_CHOICES, defibDefaults, EEG_CHOICES, gas, loadSite, pacerDefaults, parseSite, saveSite } from './site.ts';

describe('site profile', () => {
  it('keeps known values and replaces anything else with the default', () => {
    expect(parseSite({ skin: 'iran-icu-as-found', theme: 'projector-light', fps: 30, gasUnit: 'kPa', sensorsOff: true, drugNames: 'uk', defibModel: 'generic', eegModel: 'generic', pumpRack: ['drip', 'syringe'] })).toEqual({
      schema: 'pme-site/1', skin: 'iran-icu-as-found', theme: 'projector-light', fps: 30, gasUnit: 'kPa', sensorsOff: true, drugNames: 'uk', defibModel: 'generic', eegModel: 'generic', pumpRack: ['drip', 'syringe'],
    });
    expect(DEFAULT_SITE.drugNames).toBe('us'); // "epinephrine / norepinephrine" unless the site chooses
    expect(parseSite({ skin: 'nonsense', fps: 144, theme: 'neon', defibModel: 'lifepak-like', eegModel: 'bis' })).toEqual(DEFAULT_SITE); // E12: an unbuilt reader is no choice
  });
  it('a stored `instructor: \'teach\'` (or `panel`) is ignored: an older site file still imports, without the two-view keys (retire-instructor-v1 decision 5)', () => {
    const older = { schema: 'pme-site/1', skin: 'philips-like', theme: '', fps: 60, panel: 'drawer', gasUnit: 'mmHg', sensorsOff: false, drugNames: 'us', instructor: 'teach', defibModel: null };
    expect(parseSite(older)).toEqual({ ...DEFAULT_SITE, skin: 'philips-like' });
    expect(parseSite(older)).not.toHaveProperty('instructor');
    expect(parseSite(older)).not.toHaveProperty('panel');
    expect(parseSite(null)).toEqual(DEFAULT_SITE);
  });
  it('converts gas pressures for the tables', () => {
    expect(gas(40, 'kPa')).toBeCloseTo(5.33, 2);
    expect(gas(40, 'mmHg')).toBe(40);
  });
});

// Plan pump-rack-tci.md A1 (§5; PQ1 = C, "1–8, default 4"; PQ2 = B): the room's pump rack, each channel's kind, kept
// with the room's other choices so it survives a restart of the instructor's computer
describe("the room's pump rack", () => {
  it('is four syringe channels by default (a TIVA tower is syringes, §5)', () => {
    expect(DEFAULT_SITE.pumpRack).toEqual(['syringe', 'syringe', 'syringe', 'syringe']);
  });
  it('keeps 1 to 8 channels of the two kinds, and falls back to the default for anything else', () => {
    expect(parseSite({ pumpRack: ['drip'] }).pumpRack).toEqual(['drip']);
    expect(parseSite({ pumpRack: Array(8).fill('drip') }).pumpRack).toHaveLength(8);
    for (const bad of [[], Array(9).fill('syringe'), ['syringe', 'tci'], 'syringe', null, [1]]) expect(parseSite({ pumpRack: bad }).pumpRack, JSON.stringify(bad)).toEqual(DEFAULT_SITE.pumpRack);
  });
  it('survives a restart', () => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    saveSite({ ...DEFAULT_SITE, pumpRack: ['syringe', 'drip', 'drip'] });
    expect(loadSite().pumpRack).toEqual(['syringe', 'drip', 'drip']);
    vi.unstubAllGlobals();
  });
});

// EEG plan E12: the room's depth-of-anaesthesia device, from the engine's EEG registry (built readers only)
describe("the room's depth-of-anaesthesia device", () => {
  it('is off by default (no EEG: the engine computes none, D4), offers the registry\'s built readers, and is kept per room', () => {
    expect(DEFAULT_SITE.eegModel).toBeNull();
    expect(EEG_CHOICES).toEqual([{ id: 'generic', label: 'Processed EEG (generic)' }, { id: 'bisType', label: 'BIS-type index, computed from published components' }, { id: 'entropy', label: 'Entropy-type SE and RE, computed from published components' }]); // E7 adds the BIS-type reader, E8 the Entropy reader
    vi.stubGlobal('localStorage', new MemoryStorage());
    saveSite({ ...DEFAULT_SITE, eegModel: 'generic' });
    expect(loadSite().eegModel).toBe('generic');
    saveSite({ ...DEFAULT_SITE });
    expect(loadSite().eegModel).toBeNull();
    vi.unstubAllGlobals();
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
