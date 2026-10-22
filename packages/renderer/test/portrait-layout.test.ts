// @vitest-environment happy-dom
// Stage 12: a learner's phone held upright — the skin's tiles flow into one 3-column grid under the waveforms, in the
// skin's order, with every tile kept; the landscape layout (tile columns beside the waveforms) is unchanged.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI, flashCss } from '../src/device-ui.ts';

describe('portrait tiles', () => {
  it('portrait: one grid of three columns, the column wrappers transparent to it, every tile in the skin order', () => {
    const r = resolveSkin('saadat-like');
    const ui = new DeviceUI(document, document.createElement('div'), r, undefined, true);
    expect(ui.tiles.className).toBe('pme-portrait');
    expect(ui.tiles.style.display).toBe('grid');
    expect(ui.tiles.style.gridTemplateColumns.replace(/\s/g, '')).toBe('repeat(3,minmax(0,1fr))');
    for (const c of ui.tiles.children) expect((c as HTMLElement).style.display).toBe('contents');
    const order = [...ui.tiles.querySelectorAll('.pme-stile')].map((e) => (e as HTMLElement).dataset.param);
    expect(order).toEqual(r.skin.layout.tiles.flat().map((t) => t.param));
  });
  it('landscape (the default): tile columns 180 px wide beside the waveforms, as before', () => {
    // philips-like: saadat-like places its tiles in its own grid since rc.3 (layout.grid, grid-layout.test.ts)
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('philips-like'));
    expect(ui.tiles.className).toBe('');
    expect(ui.tiles.style.display).toBe('flex');
    for (const c of ui.tiles.children) expect((c as HTMLElement).style.width).toBe('180px');
  });
  it('a skin switch keeps the portrait grid', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'), undefined, true);
    ui.setSkin(resolveSkin('philips-like'));
    for (const c of ui.tiles.children) expect((c as HTMLElement).style.display).toBe('contents');
  });
});

describe('F28: a portrait tile header fits its tile', () => {
  afterEach(() => vi.restoreAllMocks());
  // happy-dom has no layout: a header is as wide as its text at ≈ 7 px a character, its tile 117 px (a 390 px phone)
  const layout = () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('h') ? 117 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      const shown = [...this.children].filter((c) => !(this.classList.contains('tight') && c.classList.contains('u')));
      return shown.reduce((w, c) => w + (c.textContent ?? '').length * 7, 0);
    });
  };
  const nibp = (ui: DeviceUI) => {
    ui.onEvent({ type: 'nibp', t: 50.5, phase: 'idle', nextInS: 299, mode: 'auto', intervalMin: 5 } as EngineEvent);
    ui.paint(51);
    return ui.tiles.querySelector('.pme-stile[data-param="NIBP"] .h') as HTMLElement;
  };

  it('portrait: "NIBP AUTO(5Min) (mmHg)" is too wide for 117 px, so the mode shortens to "AUTO 5min" and the unit is dropped', () => {
    layout();
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'), undefined, true);
    document.body.append(ui.tiles);
    const h = nibp(ui);
    expect(h.classList.contains('tight')).toBe(true);
    expect(h.querySelector('[data-pme="mode"]')?.textContent).toBe('AUTO 5min');
    expect(h.scrollWidth).toBeLessThanOrEqual(h.clientWidth);
    expect(flashCss(resolveSkin('saadat-like'))).toContain('.pme-portrait .pme-stile .h.tight .u{display:none}');
    ui.destroy();
  });

  it('landscape: the header is never measured or shortened (the rc.3 grid is unchanged)', () => {
    layout();
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'));
    document.body.append(ui.tiles);
    const h = nibp(ui);
    expect(h.classList.contains('tight')).toBe(false);
    expect(h.querySelector('[data-pme="mode"]')?.textContent).toBe('AUTO(5Min)');
    ui.destroy();
  });
});
