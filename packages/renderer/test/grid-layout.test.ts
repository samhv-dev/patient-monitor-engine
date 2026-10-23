// @vitest-environment happy-dom
// rc.3 PR-G (plan G3): with layout.grid the DeviceUI PLACES the skin's tiles as on the real unit (research/34 §3 rows 1,
// 4, 8, 16; the owner-approved mock-up NOTES.md): a tile grid with spans and a full-width bottom strip (the SpO2 tile,
// then the pulse-oximetry label fields). Without the key — every other skin, portrait, or the rollback by data — the
// old tile columns come back.
import { describe, expect, it } from 'vitest';
import type { EngineEvent, Measured } from '@pme/engine-core';
import { resolveSkin, type ResolvedSkin } from '@pme/skins';
import { DeviceUI, gridOf } from '../src/device-ui.ts';
import { renderPlan } from '../src/skin-plan.ts';

const m = (value: number | null, t: number): Measured => ({ value, flag: value === null ? 'invalid' : 'valid', at: t });
const meas = (t: number, values: Record<string, Measured>): EngineEvent => ({ type: 'measurement', t, values }) as EngineEvent;
const cellOf = (ui: DeviceUI, p: string) => (ui.tiles.querySelector(`.pme-stile[data-param="${p}"]`) as HTMLElement).parentElement as HTMLElement;
const place = (e: HTMLElement) => [e.style.gridRow.replace(/\s/g, ''), e.style.gridColumn.replace(/\s/g, '')];
const make = (r: ResolvedSkin, portrait = false) => new DeviceUI(document, document.createElement('div'), r, undefined, portrait);

describe('the saadat-like screen layout (layout.grid)', () => {
  it('saadat-like: the tile grid has six rows and two columns; HR spans both columns; TEMP spans rows 2–3; BFA, NMT, AGENTS share row 6', () => {
    const ui = make(resolveSkin('saadat-like'));
    expect(ui.tiles.style.display).toBe('grid');
    expect(ui.tiles.classList.contains('pme-grid')).toBe(true);
    expect(ui.tiles.style.gridTemplateColumns.replace(/\s/g, '')).toBe('minmax(0,362fr)minmax(0,97fr)');
    expect(ui.tiles.style.gridTemplateRows.replace(/\s/g, '')).toBe('minmax(0,175fr)minmax(0,138fr)minmax(0,101fr)minmax(0,97fr)minmax(0,96fr)minmax(0,77fr)');
    expect(place(cellOf(ui, 'HR'))).toEqual(['1/span1', '1/span2']);
    expect(place(cellOf(ui, 'NIBP'))).toEqual(['2/span1', '1/span1']);
    expect(place(cellOf(ui, 'TEMP'))).toEqual(['2/span2', '2/span1']);
    expect(place(cellOf(ui, 'RR'))).toEqual(['3/span1', '1/span1']);
    expect(place(cellOf(ui, 'IBP1'))).toEqual(['4/span1', '1/span2']);
    expect(place(cellOf(ui, 'IBP2'))).toEqual(['5/span1', '1/span2']);
    const foot = cellOf(ui, 'BFA');
    expect(place(foot)).toEqual(['6/span1', '1/span2']);
    expect([...foot.children].map((e) => (e as HTMLElement).dataset.param)).toEqual(['BFA', 'NMT', 'AGENTS']);
    expect(ui.tiles.querySelector('.pme-stile[data-param="SpO2"]')).toBeNull(); // the SpO2 tile is in the strip
  });

  it('the strip holds the SpO2 tile, then PI, PVI, SpOC, %SpCo, %SpMet, SpHb; PI prints the engine numeric, the others are blank', () => {
    const ui = make(resolveSkin('saadat-like'));
    expect(ui.strip.className).toBe('pme-strip');
    expect(ui.strip.style.display).toBe('flex');
    expect(ui.strip.style.flex.replace(/\s/g, '')).toBe('0014.5%');
    const tile = ui.strip.firstElementChild as HTMLElement;
    expect(tile.dataset.param).toBe('SpO2');
    expect(tile.style.flex.replace(/\s/g, '')).toBe('0021.7%');
    expect(tile.querySelector('[data-pme="lbl"]')?.textContent).toBe('%SPO2');
    const fields = [...ui.strip.querySelectorAll('.pme-sfield')] as HTMLElement[];
    expect(fields.map((f) => f.dataset.field)).toEqual(['PI', 'PVI', 'SpOC', '%SpCo', '%SpMet', 'SpHb']);
    expect(fields.map((f) => f.querySelector('.pl')?.textContent)).toEqual(['PI', 'PVI', 'SpOC', '%SpCo', '%SpMet', 'SpHb']);
    expect(fields[5]?.querySelector('.u')?.textContent).toBe('g/dL');
    ui.onEvent(meas(3, { spo2: m(98, 3), pi: m(2.8, 3), pr: m(76, 3) }));
    ui.paint(3);
    expect(tile.querySelector('[data-pme="v"]')?.textContent).toBe('98');
    expect(tile.querySelector('[data-pme="s"]')?.textContent).toBe(''); // the strip tile has no extras: PI has its own field
    expect(fields.map((f) => f.querySelector('[data-pme="fv"]')?.textContent)).toEqual(['2.8', '', '', '', '', '']);
    expect(fields.every((f) => f.querySelector('[data-lim]') === null)).toBe(true); // no limits the status does not carry (E100)
    const c = resolveSkin('saadat-like').skin.colors;
    // pass 2 (C5, C6): %SpMet in its own #ECE84A, SpHb white (the NIBP key)
    expect(fields.map((f) => f.style.color.toUpperCase())).toEqual([c.PI, c.PI, c.PI, c.IBP1, '#ECE84A', c.NIBP]); // happy-dom keeps the hex
  });

  it('the RR cell swaps to the CO2 tile in place', () => {
    const ui = make(resolveSkin('saadat-like'));
    const order = () => [...ui.tiles.children].map((c) => [...c.children].map((e) => (e as HTMLElement).dataset.param).join('+'));
    expect(order()).toEqual(['HR', 'NIBP', 'TEMP', 'RR', 'IBP1', 'IBP2', 'BFA+NMT+AGENTS']);
    ui.setSkin(resolveSkin('saadat-like', { sensors: { co2: true } }));
    expect(order()).toEqual(['HR', 'NIBP', 'TEMP', 'CO2', 'IBP1', 'IBP2', 'BFA+NMT+AGENTS']);
    expect(place(cellOf(ui, 'CO2'))).toEqual(['3/span1', '1/span1']);
    expect((ui.strip.firstElementChild as HTMLElement).dataset.param).toBe('SpO2');
    ui.setSkin(resolveSkin('saadat-like'));
    expect(order()).toEqual(['HR', 'NIBP', 'TEMP', 'RR', 'IBP1', 'IBP2', 'BFA+NMT+AGENTS']);
  });

  it('grid ↔ columns switch leaves no strip and no grid tile', () => {
    const ui = make(resolveSkin('saadat-like'));
    ui.setSkin(resolveSkin('philips-like'));
    expect(ui.strip.style.display).toBe('none');
    expect(ui.strip.children).toHaveLength(0);
    expect(ui.tiles.style.display).toBe('flex');
    expect(ui.tiles.classList.contains('pme-grid')).toBe(false);
    expect(ui.tiles.style.gridTemplateColumns).toBe('');
    for (const c of ui.tiles.children) expect((c as HTMLElement).style.width).toBe('180px');
    expect(document.querySelectorAll('.pme-sfield')).toHaveLength(0);
    ui.setSkin(resolveSkin('iran-icu-as-found', { theme: 'projector-light' }));
    expect(ui.tiles.style.display).toBe('grid');
    expect(ui.strip.style.display).toBe('flex');
    ui.setSkin(resolveSkin('saadat-like'));
    expect(ui.tiles.querySelectorAll('.pme-stile[data-param="HR"]')).toHaveLength(1);
    expect(ui.strip.querySelectorAll('.pme-stile')).toHaveLength(1);
  });

  it('rollback by data: saadat-like without layout.grid renders the old 180 px columns and equal lanes', () => {
    const copy = structuredClone(resolveSkin('saadat-like'));
    delete copy.skin.layout.grid;
    expect(gridOf(copy, false)).toBeNull();
    const ui = make(copy);
    expect(ui.tiles.style.display).toBe('flex');
    expect(ui.strip.style.display).toBe('none');
    for (const c of ui.tiles.children) expect((c as HTMLElement).style.width).toBe('180px');
    expect(ui.tiles.querySelector('.pme-stile[data-param="SpO2"]')).not.toBeNull();
    expect(renderPlan(copy).laneWeights).toBeNull();
  });

  it('grid font sizes scale with the monitor height', () => {
    const ui = make(resolveSkin('saadat-like', { sensors: { co2: true } }));
    const v = (root: Element, p: string) => (root.querySelector(`.pme-stile[data-param="${p}"] [data-pme="v"]`) as HTMLElement).style.fontSize.replace(/\s/g, '');
    expect(v(ui.tiles, 'HR')).toBe('calc(109*var(--pme-h,800px)/800)');
    expect(v(ui.tiles, 'NIBP')).toBe('calc(57*var(--pme-h,800px)/800)');
    expect(v(ui.tiles, 'IBP1')).toBe('calc(46*var(--pme-h,800px)/800)');
    const parts = [...ui.tiles.querySelectorAll('.pme-stile[data-param="CO2"] .pv')] as HTMLElement[];
    expect(parts.map((e) => e.style.fontSize.replace(/\s/g, ''))).toEqual(Array(3).fill('calc(calc(52*var(--pme-h,800px)/800)*var(--pme-val-k,1))')); // pass 3: × the fit's value step
    expect(v(ui.strip, 'SpO2')).toBe('calc(78*var(--pme-h,800px)/800)');
    expect((ui.strip.querySelector('[data-pme="fv"]') as HTMLElement).style.fontSize.replace(/\s/g, '')).toBe('calc(57*var(--pme-h,800px)/800)');
    // the columns' shrink of long values is not applied in the grid
    ui.onEvent(meas(3, { nibpSys: m(119, 3), nibpDia: m(90, 3), nibpMean: m(101, 3) }));
    ui.paint(3);
    expect(v(ui.tiles, 'NIBP')).toBe('calc(57*var(--pme-h,800px)/800)');
    // the header's message bar spans the wave column only
    expect(ui.header.style.getPropertyValue('--pme-tiles-w')).toBe('0px');
  });

  it('portrait ignores the grid', () => {
    const r = resolveSkin('saadat-like');
    expect(gridOf(r, true)).toBeNull();
    const ui = make(r, true);
    expect(ui.tiles.className).toBe('pme-portrait');
    expect(ui.tiles.style.display).toBe('grid');
    expect(ui.tiles.style.gridTemplateColumns.replace(/\s/g, '')).toBe('repeat(3,minmax(0,1fr))');
    const order = [...ui.tiles.querySelectorAll('.pme-stile')].map((e) => (e as HTMLElement).dataset.param);
    expect(order).toEqual(r.skin.layout.tiles.flat().map((t) => t.param));
    expect(ui.strip.style.display).toBe('none');
  });
});
