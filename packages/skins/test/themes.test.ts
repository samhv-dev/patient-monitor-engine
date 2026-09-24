import { describe, expect, it } from 'vitest';
import { contrastRatio, provenanceGaps, resolveSkin, SKIN_IDS, THEME_IDS, THEMES, type Provenance } from '../src/index.ts';
import { validate } from '../src/validate.ts';

describe('themes', () => {
  it.each(THEME_IDS)('%s validates and every field is sourced', (id) => {
    expect(validate('theme', THEMES[id]).errors).toEqual([]);
    const t = THEMES[id] as unknown as Record<string, unknown> & { provenance: Provenance };
    expect(provenanceGaps(t, t.provenance)).toEqual({ uncovered: [], dangling: [] });
  });

  it.each(THEME_IDS.flatMap((t) => SKIN_IDS.map((s) => [s, t] as const)))('%s + %s still validates', (s, t) => {
    expect(validate('skin', resolveSkin(s, { theme: t }).skin).errors).toEqual([]);
  });

  it('projector-light: white background, every colour darkened to ≥ 4.5:1, bars grey', () => {
    const r = resolveSkin('saadat-like', { theme: 'projector-light' });
    expect(r.render.background).toBe('#FFFFFF');
    expect(r.themeId).toBe('projector-light');
    for (const c of Object.values(r.skin.colors)) expect(contrastRatio(c as string, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(r.skin.alarms.messageBar.idle).toEqual({ bg: '#E0E0E0', fg: '#000000' });
    expect(r.provenance.colors?.source).toContain('projector-light');
  });

  it('ecg-grid: 1 mm / 5 mm grid on paper', () => {
    expect(resolveSkin('philips-like', { theme: 'ecg-grid' }).render.grid).toMatchObject({ minorMm: 1, majorMm: 5 });
  });
});
