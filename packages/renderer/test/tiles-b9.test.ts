// @vitest-environment happy-dom
// rc.3 PR-T T2 (research/34 §3 rows 4, 8, 12, 14; §8 O1, M1; IMG_8113): the saadat-like tiles — limit pairs always
// shown in small red, high over low; units; per-tile weight; split tiles (EtCo2 | FiCo2 | AWRR, T1/T2/DT, BFI% …);
// blank values where the engine publishes none. Other skins keep the old tile skeleton.
import { describe, expect, it, vi } from 'vitest';
import type { EngineEvent, Measured } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';

const m = (value: number | null, t: number): Measured => ({ value, flag: value === null ? 'invalid' : 'valid', at: t });
const meas = (t: number, values: Record<string, Measured>): EngineEvent => ({ type: 'measurement', t, values }) as EngineEvent;
type Lim = { low: number; high: number; enabled?: boolean };
const status = (t: number, limits: Record<string, Lim>): EngineEvent => ({
  type: 'alarmStatus', t, skin: 'saadat-like', ageBand: 'adult', silencedUntil: null, pausedUntil: null, allOff: false, arrhythmiaAnalysis: false, volume: 1, active: [],
  limits: Object.fromEntries(Object.entries(limits).map(([k, l]) => [k, { numeric: 'hr', low: l.low, high: l.high, enabled: l.enabled ?? false, level: 2, approximate: false }])),
}) as EngineEvent;

function mount(id: string, co2 = false) {
  const ui = new DeviceUI(document, document.createElement('div'), resolveSkin(id, { sensors: { co2 } }));
  document.body.append(ui.tiles);
  const tile = (p: string) => ui.tiles.querySelector(`.pme-stile[data-param="${p}"]`) as HTMLDivElement;
  const all = (p: string, sel: string) => [...tile(p).querySelectorAll(sel)].map((e) => e.textContent);
  return { ui, tile, all };
}

describe('saadat-like tile skeleton', () => {
  it('(a) limit pairs always shown, high over low, in the limit red; the crossed bell when OFF; philips-like unchanged', () => {
    const { ui, tile } = mount('saadat-like');
    ui.onEvent(status(5, { HR: { low: 50, high: 150 } }));
    ui.paint(5);
    const lim = tile('HR').querySelector('[data-lim="HR"]') as HTMLElement;
    expect([...lim.children].map((e) => e.textContent)).toEqual(['150', '50']);
    expect(getComputedStyle(lim).color).toMatch(/^(rgb\(240, 90, 60\)|#F05A3C)$/i); // happy-dom keeps the hex
    expect(tile('HR').querySelector('[data-pme="bell"]')?.innerHTML).toContain('svg');
    const ph = mount('philips-like');
    ph.ui.onEvent(status(5, { HR: { low: 50, high: 150 } }));
    ph.ui.paint(5);
    expect(ph.tile('HR').querySelector('[data-lim]')).toBeNull();
    expect(ph.tile('HR').querySelector('.lim')?.textContent).toBe('');
  });

  it('(b) units from the tile spec', () => {
    const { tile } = mount('saadat-like');
    expect(tile('HR').querySelector('.u')?.textContent).toBe('BPM');
    expect(tile('NIBP').querySelector('.u')?.textContent).toBe('(mmHg)');
    expect(tile('RR').querySelector('.u')?.textContent).toBe('BrPM');
  });

  it('(c) weights: HR upright bold (D11), NIBP regular', () => {
    const { tile } = mount('saadat-like');
    const v = (p: string) => tile(p).querySelector('[data-pme="v"]') as HTMLElement;
    expect(getComputedStyle(v('HR')).fontWeight).toBe('700');
    expect(getComputedStyle(v('HR')).fontStyle).not.toBe('italic');
    expect(getComputedStyle(v('NIBP')).fontWeight).toBe('400');
  });

  it('owner correction M1: the EtCo2, FiCo2 and AWRR digits are normal weight, like NIBP', () => {
    const { ui, tile } = mount('saadat-like', true);
    ui.onEvent(meas(20, { etco2: m(36, 20), imco2: m(0, 20), awrr: m(12, 20) }));
    ui.paint(20);
    const nibpW = getComputedStyle(tile('NIBP').querySelector('[data-pme="v"]') as HTMLElement).fontWeight;
    const pv = [...tile('CO2').querySelectorAll('[data-part] .pv')] as HTMLElement[];
    expect(pv).toHaveLength(3);
    for (const e of pv) expect(getComputedStyle(e).fontWeight).toBe(nibpW);
    const spec = resolveSkin('saadat-like', { sensors: { co2: true } }).skin.layout.tiles.flat().find((t) => t.param === 'CO2');
    expect(spec?.weight).toBeUndefined();
  });

  it('(d) the split CO2 tile: three parts, one element for the main value (no "36" twice), whole-mmHg limits', () => {
    const { ui, tile, all } = mount('saadat-like', true);
    ui.onEvent(meas(20, { etco2: m(36, 20), imco2: m(0, 20), awrr: m(12, 20) }));
    ui.onEvent(status(20, { EtCO2_pctV: { low: 19.76, high: 49.4 }, AWRR: { low: 5, high: 30 } }));
    ui.paint(20);
    expect(all('CO2', '[data-part] .pl')).toEqual(['EtCo2', 'FiCo2', 'AWRR']);
    expect(all('CO2', '[data-part] .pv')).toEqual(['36', '0', '12']);
    expect(tile('CO2').querySelector('[data-pme="v"]')?.textContent).toBe('36');
    expect(tile('CO2').querySelector('[data-pme="lbl"]')?.textContent).toBe('EtCo2');
    expect(tile('CO2').querySelectorAll('[data-pme="v"]')).toHaveLength(1);
    expect((tile('CO2').textContent ?? '').match(/36/g)).toHaveLength(1);
    expect(all('CO2', '[data-part="0"] [data-lim="EtCO2_pctV"] span')).toEqual(['49', '20']);
    expect(all('CO2', '[data-part="2"] [data-lim="AWRR"] span')).toEqual(['30', '5']);
  });

  it('(e) O1: nothing measured — HR blank, IBP1 "/" and "()", NIBP "/", the BFA tile shown with blank parts', () => {
    const { ui, tile, all } = mount('saadat-like');
    ui.paint(1);
    const v = (p: string, k = 'v') => tile(p).querySelector(`[data-pme="${k}"]`)?.textContent;
    expect(v('HR')).toBe('');
    expect(v('IBP1')).toBe('/');
    expect(v('IBP1', 's')).toBe('()');
    expect(v('NIBP')).toBe('/');
    expect(tile('BFA').style.display).toBe('');
    expect(all('BFA', '[data-part] .pl')).toEqual(['BFI%', 'BS%', 'SQI%', 'EMG%']);
    expect(all('BFA', '[data-part] .pv')).toEqual(['', '', '', '']);
  });

  it('the IBP limit pairs sit in one row under the value, low then high, in key order (IMG_8113)', () => {
    const { ui, tile } = mount('saadat-like');
    ui.onEvent(status(5, { ART_S: { low: 80, high: 150 }, ART_D: { low: 50, high: 100 }, ART_M: { low: 60, high: 115 } }));
    ui.paint(5);
    const row = tile('IBP1').querySelector('.limrow') as HTMLElement;
    expect([...row.querySelectorAll('[data-lim]')].map((e) => [e.getAttribute('data-lim'), [...e.children].map((c) => c.textContent)])).toEqual([
      ['ART_S', ['80', '150']], ['ART_D', ['50', '100']], ['ART_M', ['60', '115']],
    ]);
  });

  it('the NIBP pairs: S left of the value, D right of it, M under the left', () => {
    const { ui, tile } = mount('saadat-like');
    ui.onEvent(status(5, { NIBP_S: { low: 90, high: 160 }, NIBP_D: { low: 50, high: 90 }, NIBP_M: { low: 60, high: 110 } }));
    ui.paint(5);
    expect(tile('NIBP').querySelector('.lim.a [data-lim="NIBP_S"]')).not.toBeNull();
    expect(tile('NIBP').querySelector('.lim.b [data-lim="NIBP_D"]')).not.toBeNull();
    expect(tile('NIBP').querySelector('.lim.c [data-lim="NIBP_M"]')).not.toBeNull();
  });

  it('the heart lights for 200 ms on each beat tone and the timer dies with destroy()', () => {
    vi.useFakeTimers();
    try {
      const { ui, tile } = mount('saadat-like');
      const heart = tile('HR').querySelector('[data-pme="heart"]') as HTMLElement;
      expect(heart.classList.contains('on')).toBe(false);
      ui.onEvent({ type: 'tone', t: 1, id: 'q1', kind: 'qrs' } as EngineEvent);
      expect(heart.classList.contains('on')).toBe(true);
      vi.advanceTimersByTime(199);
      expect(heart.classList.contains('on')).toBe(true);
      vi.advanceTimersByTime(2);
      expect(heart.classList.contains('on')).toBe(false);
      ui.onEvent({ type: 'tone', t: 2, id: 'q2', kind: 'qrs' } as EngineEvent);
      ui.destroy();
      expect(vi.getTimerCount()).toBe(0);
      expect(mount('philips-like').tile('HR').querySelector('[data-pme="heart"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('the PR tile status lines: PACE, ST, PVCs in the status colour, crossed bells on ST and PVCs', () => {
    const { ui, tile } = mount('saadat-like');
    ui.onEvent(status(5, { HR: { low: 50, high: 150 } }));
    ui.paint(5);
    const lines = [...tile('HR').querySelectorAll('[data-pme="st"] .stl')] as HTMLElement[];
    expect(lines.map((l) => l.querySelector('.stt')?.textContent)).toEqual(['PACE: OFF', 'ST: OFF', 'PVCs: OFF']);
    expect(lines.map((l) => l.querySelector('svg') !== null)).toEqual([false, true, true]);
    expect(lines[0]?.style.color).toMatch(/^(rgb\(68, 221, 85\)|#44DD55)$/i);
    expect(mount('philips-like').tile('HR').querySelector('[data-pme="st"]')).toBeNull();
  });
});
