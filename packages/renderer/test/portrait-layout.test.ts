// @vitest-environment happy-dom
// Stage 12: a learner's phone held upright — the skin's tiles flow into one 3-column grid under the waveforms, in the
// skin's order, with every tile kept; the landscape layout (tile columns beside the waveforms) is unchanged.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

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
