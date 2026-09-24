import { describe, expect, it } from 'vitest';
import { BASES, PRESET_IDS, resolveSkin, SKIN_IDS, SKINS } from '../src/index.ts';
import { validate } from '../src/validate.ts';

const ALL = [...SKIN_IDS, ...PRESET_IDS];

describe('shipped skins against the schema', () => {
  it.each(SKIN_IDS)('%s: the source file validates (no unknown fields)', (id) => {
    expect(validate('skinSource', SKINS[id]).errors).toEqual([]);
  });

  it.each(Object.keys(BASES).length ? Object.keys(BASES) : ['(none)'])('base %s validates as a source file', (id) => {
    if (id === '(none)') return;
    expect(validate('skinSource', BASES[id]).errors).toEqual([]);
  });

  it.each(ALL)('%s: the resolved skin is complete (every required field present)', (id) => {
    expect(validate('skin', resolveSkin(id).skin).errors).toEqual([]);
  });

  it('rejects an unknown field anywhere', () => {
    const s = structuredClone(resolveSkin('saadat-like').skin) as unknown as { alarms: Record<string, unknown> };
    s.alarms.volumeCurve = 'log';
    const r = validate('skin', s);
    expect(r.ok).toBe(false);
    expect(r.errors.join('\n')).toContain('(volumeCurve)');
  });

  it('rejects a missing required field', () => {
    const s = structuredClone(resolveSkin('saadat-like').skin) as unknown as { sweep: Record<string, unknown> };
    delete s.sweep.gapPx;
    expect(validate('skin', s).errors.join('\n')).toContain("must have required property 'gapPx'");
  });

  it('rejects a lower-case or short hex colour', () => {
    const s = structuredClone(resolveSkin('saadat-like').skin);
    s.colors.ECG = '#0f0';
    expect(validate('skin', s).ok).toBe(false);
  });

  it('byChannel skins must colour IBP1-4', () => {
    const sa = structuredClone(resolveSkin('saadat-like').skin);
    delete sa.colors.IBP4;
    expect(validate('skin', sa).ok).toBe(false);
  });

  it.each(ALL)('%s: defaults are members of their option lists', (id) => {
    const { skin } = resolveSkin(id);
    expect(Object.keys(skin.ecg.filters)).toContain(skin.ecg.filterDefault);
    expect(skin.pages.map((p) => p.id)).toContain(skin.defaultPage);
    expect(skin.sweep.ecg.options).toContain(skin.sweep.ecg.default);
    expect(skin.ecg.gainOptions).toContain(skin.ecg.gainDefault);
    expect(skin.alarms.volume.default).toBeGreaterThanOrEqual(skin.alarms.volume.min);
    expect(skin.alarms.volume.default).toBeLessThanOrEqual(skin.alarms.volume.max);
  });
});
