// Gate G4a follow-ups (research/00 G4a): mindray-like and ge-like must not look identical, and a red trace must stay
// readable on the ecg-grid theme's red grid.
import { describe, expect, it } from 'vitest';
import { contrastRatio, PRESET_IDS, resolveSkin, SKIN_IDS } from '../src/index.ts';
import { validate } from '../src/validate.ts';

describe('G4a follow-ups', () => {
  it('ecg-grid: every lane colour of every skin and preset keeps ≥ 3:1 against the major grid line', () => {
    for (const id of [...SKIN_IDS, ...PRESET_IDS]) {
      const r = resolveSkin(id, { theme: 'ecg-grid' });
      const major = r.render.grid?.major as string;
      for (const l of r.render.lanes) expect(contrastRatio(l.color, major), `${id} ${l.lane}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('mindray-like flashes a level-coloured box; the others flash the text', () => {
    expect(resolveSkin('mindray-like').skin.alarms.numericStyle).toBe('flash-box');
    for (const id of ['philips-like', 'saadat-like', 'ge-like', 'zoll-like']) expect(resolveSkin(id).skin.alarms.numericStyle ?? 'flash-text').toBe('flash-text');
  });

  it('ge-like and mindray-like carry the visible "LAYOUT UNVERIFIED" badge; documented layouts do not', () => {
    expect(resolveSkin('ge-like').skin.layout.badge).toBe('LAYOUT UNVERIFIED');
    expect(resolveSkin('mindray-like').skin.layout.badge).toBe('LAYOUT UNVERIFIED');
    for (const id of ['philips-like', 'saadat-like', 'zoll-like', 'lifepak-like']) expect(resolveSkin(id).skin.layout.badge).toBeUndefined();
  });

  it('the new optional fields validate and are rejected when malformed', () => {
    expect(validate('skin', resolveSkin('mindray-like').skin).errors).toEqual([]);
    const bad = structuredClone(resolveSkin('mindray-like').skin) as unknown as { alarms: { numericStyle: string } };
    bad.alarms.numericStyle = 'blink';
    expect(validate('skin', bad).errors.length).toBeGreaterThan(0);
  });
});
