import { describe, expect, it } from 'vitest';
import { contrastRatio, resolveSkin, SKIN_IDS, PRESET_IDS, THEME_IDS } from '../src/index.ts';

const combos = [undefined, ...THEME_IDS].flatMap((theme) => [...SKIN_IDS, ...PRESET_IDS].map((id) => [id, theme ?? '(none)'] as const));

describe('colour contrast (WCAG ratio) of every skin × theme', () => {
  it.each(combos)('%s (theme %s): every parameter colour is ≥ 3:1 on the background', (id, theme) => {
    const { skin } = resolveSkin(id, theme === '(none)' ? {} : { theme });
    const low = Object.entries(skin.colors)
      .map(([k, c]) => [k, +contrastRatio(c as string, skin.background).toFixed(2)] as const)
      .filter(([, r]) => r < 3);
    expect(low).toEqual([]);
  });

  it.each(combos)('%s (theme %s): labels ≥ 4.5:1; alarm-bar text ≥ 3:1 on its bar', (id, theme) => {
    const { skin } = resolveSkin(id, theme === '(none)' ? {} : { theme });
    expect(contrastRatio(skin.foreground, skin.background)).toBeGreaterThanOrEqual(4.5);
    const mb = skin.alarms.messageBar;
    for (const bar of [mb.L1, mb.L2, mb.L3, mb.idle, mb.acknowledged]) expect(contrastRatio(bar.fg, bar.bg)).toBeGreaterThanOrEqual(3);
  });
});
