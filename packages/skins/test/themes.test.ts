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

  it('themes darken the IBP scale-line colour like the lane colours (review L-2); it has its own source', () => {
    for (const t of THEME_IDS) {
      const r = resolveSkin('saadat-like', { theme: t });
      expect(contrastRatio(r.skin.ibp.scaleLineColor!, r.render.background)).toBeGreaterThanOrEqual(THEMES[t]!.colorTransform.minRatio);
    }
    expect(resolveSkin('saadat-like').skin.ibp.scaleLineColor).toBe('#8A8C92');
    expect(resolveSkin('saadat-like').provenance['ibp.scaleLineColor']?.source).toContain('research/34 §8');
    expect(resolveSkin('philips-like', { theme: 'projector-light' }).skin.ibp.scaleLineColor).toBeUndefined();
  });

  it('themes darken the lane-text label colours like the lane colours', () => {
    for (const t of THEME_IDS) {
      const r = resolveSkin('saadat-like', { theme: t });
      expect(contrastRatio(r.skin.layout.laneText!.labels!.PLETH!.color!, r.render.background)).toBeGreaterThanOrEqual(THEMES[t]!.colorTransform.minRatio);
    }
  });

  it('themes darken the limit colour', () => {
    const r = resolveSkin('saadat-like', { theme: 'projector-light' });
    const lim = r.skin.alarms.limitsColor as string;
    expect(lim).toBeDefined();
    expect(lim).not.toBe(resolveSkin('saadat-like').skin.alarms.limitsColor);
    expect(contrastRatio(lim, r.render.background)).toBeGreaterThanOrEqual(THEMES['projector-light']!.colorTransform.minRatio);
  });

  it('themes darken the status-line colour', () => {
    const r = resolveSkin('saadat-like', { theme: 'projector-light' });
    const c = r.skin.hr.statusColor as string;
    expect(c).toBeDefined();
    expect(contrastRatio(c, r.render.background)).toBeGreaterThanOrEqual(THEMES['projector-light']!.colorTransform.minRatio);
    expect(r.provenance['hr.statusColor']?.source).toContain('research/34');
  });

  it('ecg-grid: 1 mm / 5 mm grid on paper', () => {
    expect(resolveSkin('philips-like', { theme: 'ecg-grid' }).render.grid).toMatchObject({ minorMm: 1, majorMm: 5 });
  });
});
