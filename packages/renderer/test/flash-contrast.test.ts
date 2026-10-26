// @vitest-environment happy-dom
// UI review #17: a flashing value keeps its flash, but its off phase never drops below 3:1 against the monitor's
// background (WCAG 2.2 SC 1.4.3, the large-text minimum; the numerics are ≥ 24 px). The off phase was opacity 0.12 for
// every colour: EtCO2 53, ART 69/33 and HR 40 went almost black (≈ 1.1–1.2:1), and a glance or a photo read a missing
// number. Each value's floor is the lowest opacity that keeps 3:1 for ITS colour (yellow dims further than violet).
import { describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI, FLASH_MIN_CONTRAST, contrastRatio, flashCss, flashFloor } from '../src/device-ui.ts';

const over = (hex: string, a: number) => `rgb(${[1, 3, 5].map((i) => Math.round(a * parseInt(hex.slice(i, i + 2), 16))).join(', ')})`;

describe('UI review #17: the alarm flash never goes below readable contrast', () => {
  const skin = resolveSkin('saadat-like');
  it('every Saadat value colour keeps ≥ 3:1 on black at its floor, and still flashes (floor < 1)', () => {
    expect(FLASH_MIN_CONTRAST).toBe(3);
    for (const [p, c] of Object.entries(skin.render.tileColors)) {
      if (!c?.startsWith('#')) continue;
      const a = flashFloor(c, '#000000');
      expect(contrastRatio(over(c, a), '#000000'), `${p} ${c} at ${a}`).toBeGreaterThanOrEqual(3);
      expect(a, `${p} still flashes`).toBeLessThan(0.85);
      expect(a).toBeGreaterThan(0.12); // the old off phase
    }
  });

  it('a colour that is already below 3:1 keeps a visible flash (capped), never a steady value', () => {
    expect(flashFloor('#202020', '#000000')).toBe(0.85);
    expect(flashFloor('rgb(240, 240, 0)', 'rgb(0, 0, 0)')).toBe(flashFloor('#F0F000', '#000'));
  });

  it('the values blink on their own keyframes to their floor; the lamp keeps the full blink', () => {
    const css = flashCss(skin);
    expect(css).toMatch(/@keyframes pme-blink-v\{0%\{opacity:1\}50%\{opacity:var\(--pme-dim, *0\.5\)\}\}/);
    expect(css).toContain('.v.pme-f1,.v.pme-f2,.pv.pme-f1,.pv.pme-f2{animation-name:pme-blink-v}');
    expect(css).toContain('@keyframes pme-blink{0%{opacity:1}50%{opacity:0.12}}');
  });

  it('a value in alarm carries its colour’s floor (HR TOO HIGH on the PR tile)', () => {
    const e = createEngine({ seed: 3, device: { skin: 'saadat-like' }, patient: { sensors: { abp: 'connected', co2: 'on' } } } as never);
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like', { sensors: { co2: true } }));
    e.on((x) => ui.onEvent(x));
    e.dispatch({ id: 'hr160', issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 160 } as never);
    e.advanceTo(40);
    ui.paint(40);
    const v = ui.tiles.querySelector('[data-param="HR"] [data-pme="v"]') as HTMLElement;
    expect(v.className).toContain('pme-f1');
    const dim = Number(v.style.getPropertyValue('--pme-dim'));
    expect(dim).toBe(flashFloor(skin.render.tileColors.HR as string, skin.render.background));
    expect(dim).toBeGreaterThan(0.12);
    ui.destroy();
  });
});
