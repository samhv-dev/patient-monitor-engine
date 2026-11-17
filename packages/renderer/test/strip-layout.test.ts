// @vitest-environment happy-dom
// A strip of the monitor (MountOptions.strip): only the named lanes and tiles of the skin, each exactly as the skin's full
// upright screen draws it, in the skin's order.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { DeviceUI, flashCss } from '../src/device-ui.ts';
import { MIN_LANE_PX } from '../src/lane-metrics.ts';
import { renderPlan, type StripLayout } from '../src/skin-plan.ts';

const STRIP: StripLayout = { lanes: ['PLETH', 'ECG1'], tiles: ['SpO2', 'HR', 'NIBP', 'IBP1', 'ART', 'CO2', 'RR'] };
const SKINS = ['saadat-like', 'philips-like', 'ge-like', 'mindray-like', 'lifepak-like', 'zoll-like'];

describe('strip plan', () => {
  it.each(SKINS)('%s: the strip keeps ECG1 and PLETH in the skin order, each lane equal to the full screen\'s', (id) => {
    const r = resolveSkin(id);
    const full = renderPlan(r, undefined, undefined, true);
    const strip = renderPlan(r, undefined, undefined, true, {}, STRIP);
    expect(strip.lanes.map((l) => l.id)).toEqual(['ECG1', 'PLETH']);
    for (const l of strip.lanes) expect(l).toEqual(full.lanes.find((f) => f.id === l.id));
    expect(strip.laneText).toEqual(full.laneText);
  });
  it('saadat-like: the kept lanes keep their own weights from the measured screen', () => {
    const r = resolveSkin('saadat-like');
    const full = renderPlan(r, undefined, undefined, true);
    const strip = renderPlan(r, undefined, undefined, true, {}, STRIP);
    const at = (id: string) => full.laneWeights?.[full.lanes.findIndex((l) => l.id === id)];
    expect(strip.laneWeights).toEqual([at('ECG1'), at('PLETH')]);
  });
  it('no strip: every lane, as before', () => {
    const r = resolveSkin('saadat-like');
    expect(renderPlan(r, undefined, undefined, true).lanes.map((l) => l.id)).toEqual(r.skin.layout.lanes);
  });
  it('the lane height a label and its sweep speed need', () => expect(MIN_LANE_PX).toBe(40));
});

describe('strip tiles', () => {
  it.each(SKINS)('%s: only the strip\'s tiles, in the skin order, in the upright grid', (id) => {
    const r = resolveSkin(id, { sensors: { co2: true } });
    const ui = new DeviceUI(document, document.createElement('div'), r, undefined, true, undefined, STRIP.tiles);
    expect(ui.tiles.className).toBe('pme-portrait pme-subset');
    const want = r.skin.layout.tiles.flat().map((t) => t.param).filter((p) => STRIP.tiles.includes(p));
    expect([...ui.tiles.querySelectorAll('.pme-stile')].map((e) => (e as HTMLElement).dataset.param)).toEqual(want);
    expect(want).toContain('CO2');
  });
  it('a sub-line wraps between its parts only: one unbreakable span per part, the same text', () => {
    const r = resolveSkin('philips-like', { sensors: { co2: true } });
    const ui = new DeviceUI(document, document.createElement('div'), r, undefined, true, undefined, STRIP.tiles);
    ui.paint(1);
    const sub = ui.tiles.querySelector('.pme-stile[data-param="CO2"] .s') as HTMLElement;
    expect(sub.textContent).toBe('awRR ---  imCO2 ---');
    expect([...sub.querySelectorAll('span')].map((s) => s.textContent)).toEqual(['awRR ---', 'imCO2 ---']);
    expect(flashCss(r)).toContain('.pme-subset .pme-stile .s>span{white-space:nowrap}');
  });
  it('a skin switch keeps the strip\'s tiles', () => {
    const ui = new DeviceUI(document, document.createElement('div'), resolveSkin('saadat-like'), undefined, true, undefined, STRIP.tiles);
    ui.setSkin(resolveSkin('philips-like'));
    expect([...ui.tiles.querySelectorAll('.pme-stile')].map((e) => (e as HTMLElement).dataset.param)).toEqual(['HR', 'ART', 'NIBP', 'SpO2', 'CO2']);
  });
});
