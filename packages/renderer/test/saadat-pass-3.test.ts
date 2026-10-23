// @vitest-environment happy-dom
// Saadat pass 3 (the owner's 2026-10-23 review of rc.3 on the Instructor view, monitor pane ≈ 1430 × 820): the fit rules
// of a split tile's parts (tile-fit.ts), the split tiles' class names (a host page's `.row{display:flex}` packed the
// parts together: the demo app's app.css), the RR tile set as the EtCO2 part it stands in for (rule O4), and the grid
// rules for the T column, the IBP limits row and the NIBP measuring line.
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { resolveSkin } from '@pme/skins';
import { DeviceUI } from '../src/device-ui.ts';
import { fitPart, fitTile, LIM_MIN_SCALE } from '../src/tile-fit.ts';

const css = () => [...document.head.querySelectorAll('style')].at(-1)?.textContent ?? '';
function mount(id: string, co2 = false, portrait = false) {
  const ui = new DeviceUI(document, document.createElement('div'), resolveSkin(id, { sensors: { co2 } }), undefined, portrait);
  document.body.append(ui.tiles);
  const tile = (p: string) => ui.tiles.querySelector(`.pme-stile[data-param="${p}"]`) as HTMLDivElement;
  return { ui, tile };
}

describe('pass 3: the fit rules of a split part (tile-fit.ts)', () => {
  const etco2 = { label: 62, unit: 33, lim: 17, value: 54 }; // EtCo2 mmHg, 50/30, "36" at the 1430 × 820 pane
  it('a wide part keeps the unit beside the label and the limits at full size', () => {
    expect(fitPart(127, etco2, 'value', 4)).toEqual({ unitUnder: false, limScale: 1, valScale: 1 });
  });
  it('label + gap + unit wider than the part: the unit goes under the label first', () => {
    expect(fitPart(95, etco2, 'value', 4)).toEqual({ unitUnder: true, limScale: 1, valScale: 1 });
  });
  it('then the limits shrink until limits + gap + value fits, never below the floor', () => {
    expect(fitPart(70, etco2, 'value', 4).limScale).toBeCloseTo(12 / 17, 5);
    expect(fitPart(60, etco2, 'value', 4).limScale).toBe(LIM_MIN_SCALE);
  });
  it('limits beside the head (AWRR): the head is the wider of label and unit, the unit always under it', () => {
    const awrr = { label: 55, unit: 33, lim: 17, value: 54 };
    expect(fitPart(127, awrr, 'head', 4)).toEqual({ unitUnder: false, limScale: 1, valScale: 1 });
    expect(fitPart(70, awrr, 'head', 4).limScale).toBeCloseTo(11 / 17, 5);
  });
  it('a part with no limits never scales; a part not laid out (width 0) is left alone', () => {
    expect(fitPart(40, { label: 50, unit: 0, lim: 0, value: 30 }, 'head', 4)).toEqual({ unitUnder: false, limScale: 1, valScale: 1 });
    expect(fitPart(0, etco2, 'value', 4)).toEqual({ unitUnder: false, limScale: 1, valScale: 1 });
  });
  it('review: a 3-digit value that still does not fit at the limits floor shrinks the digits last (EtCO2 100 at a 1000 px pane)', () => {
    const f = fitPart(90, { label: 62, unit: 29, lim: 14, value: 85 }, 'value', 4);
    expect(f.unitUnder).toBe(true);
    expect(f.limScale).toBe(LIM_MIN_SCALE);
    expect(f.valScale).toBeCloseTo((90 - 4 - 14 * LIM_MIN_SCALE) / 85, 5);
    expect(fitPart(127, etco2, 'value', 4).valScale).toBe(1);
    expect(fitPart(40, { label: 30, unit: 20, lim: 0, value: 50 }, 'head', 4).valScale).toBeCloseTo(40 / 50, 5); // a centred value wider than its part
  });
  it('a tile takes the unit under if any part needs it, and one limit scale (the smallest) for all its pairs', () => {
    const f = fitTile(70, [{ widths: etco2, side: 'value' }, { widths: { label: 55, unit: 33, lim: 0, value: 20 }, side: 'head' }, { widths: { label: 55, unit: 33, lim: 17, value: 30 }, side: 'head' }], 4);
    expect(f.unitUnder).toBe(true);
    expect(f.limScale).toBeCloseTo(11 / 17, 5);
  });
});

describe('pass 3: split tiles never use a class a host page may style', () => {
  it('the CO2, T and BFA tiles are split-row / split-column, never "row" or "column" (app.css .row{display:flex})', () => {
    const { ui, tile } = mount('saadat-like', true);
    for (const [p, kind] of [['CO2', 'row'], ['TEMP', 'column'], ['BFA', 'row']] as const) {
      expect(tile(p).classList.contains(`split-${kind}`)).toBe(true);
      expect(tile(p).classList.contains('row')).toBe(false);
      expect(tile(p).classList.contains('column')).toBe(false);
    }
    expect(css()).not.toMatch(/\.split\.(row|column)\b/);
    ui.destroy();
  });
});

describe('pass 3: the RR tile is set as the EtCO2 part it stands in for (rule O4)', () => {
  it('without the CO2 line: one part "RR" with "BrPM" beside it, marked as the CO2 tile\'s stand-in, at the CO2 sizes', () => {
    const { ui, tile } = mount('saadat-like');
    const rr = tile('RR');
    expect(rr.classList.contains('split-row')).toBe(true);
    expect(rr.dataset.as).toBe('CO2');
    expect(rr.style.getPropertyValue('--pme-slots')).toBe('3');
    expect([...rr.querySelectorAll('[data-part] .pl')].map((e) => e.textContent)).toEqual(['RR']);
    expect(rr.querySelector('[data-part="0"] .pu')?.textContent).toBe('BrPM');
    const v = rr.querySelector('[data-part="0"] .pv') as HTMLElement;
    expect(v.style.fontSize).toBe('calc(calc(52 * var(--pme-h, 800px) / 800) * var(--pme-val-k, 1))'); // fontPx.CO2
    expect(rr.style.color.toUpperCase()).toBe(resolveSkin('saadat-like', { sensors: { co2: true } }).render.tileColors.CO2?.toUpperCase()); // the digits' colour
    expect(css()).toContain('[data-as="CO2"] .ph .pl{font-size:calc(21 * var(--pme-h, 800px) / 800)}'); // labelPx.CO2
    ui.destroy();
  });

  it('with the CO2 line: the CO2 tile is itself (no stand-in mark)', () => {
    const a = mount('saadat-like', true);
    expect(a.tile('CO2').dataset.as).toBeUndefined();
    a.ui.destroy();
  });

  it('a phone in portrait (no grid, F28) is unchanged: RR is its own tile, split tiles keep their rc.3 classes', () => {
    const b = mount('saadat-like', false, true);
    expect(b.tile('RR').dataset.as).toBeUndefined();
    expect(b.tile('RR').classList.contains('split')).toBe(false);
    expect(b.tile('RR').querySelector('.u')?.textContent).toBe('BrPM');
    expect(b.tile('TEMP').classList.contains('column')).toBe(true);
    b.ui.destroy();
    const c = mount('saadat-like', true, true);
    expect(c.tile('CO2').classList.contains('row')).toBe(true);
    c.ui.destroy();
  });

  it('a skin with no swap rule has no stand-in tiles', () => {
    const { ui } = mount('philips-like');
    expect(ui.tiles.querySelector('[data-as]')).toBeNull();
    ui.destroy();
  });
});

describe('pass 3: grid rules for the T column, the IBP limits row, the NIBP measuring line', () => {
  it('T column: label over its limits, the value right-aligned beside them, "°C" in the title row', () => {
    const { ui } = mount('saadat-like');
    const c = css();
    expect(c).toContain('.pme-grid .pme-stile.split-column .pv{grid-column:2;grid-row:2;text-align:right');
    expect(c).toMatch(/\.pme-grid \.pme-stile\.split-column>\.h\{top:[^;]+;bottom:auto\}/);
    ui.destroy();
  });

  it('IBP with three pairs: value and mean in one row, each pair in the column of its part', () => {
    const { ui } = mount('saadat-like');
    const c = css();
    expect(c).toContain(':has(.limrow [data-lim$="_S"])'); // IBP2 as CVP (CVP_M only) keeps the pass-2 layout
    expect(c).toContain('[data-lim$="_S"]{grid-column:1}');
    expect(c).toContain('[data-lim$="_M"]{grid-column:3}');
    ui.destroy();
  });

  it('review: an IBP value with a systolic pair is drawn as systolic, slash and diastolic, each over its own pair', () => {
    const { ui, tile } = mount('saadat-like');
    const m = (value: number) => ({ value, flag: 'valid', at: 5 });
    ui.onEvent({ type: 'measurement', t: 5, values: { abpSys: m(120), abpDia: m(80), abpMean: m(93) } } as unknown as EngineEvent);
    ui.paint(5);
    const v = tile('IBP1').querySelector('[data-pme="v"]') as HTMLElement;
    expect([...v.children].map((e) => [e.className, e.textContent])).toEqual([['sys', '120'], ['sl', '/'], ['dia', '80']]);
    expect(v.textContent).toBe('120/80');
    expect(css()).toContain('.vrow .v .dia{grid-column:2');
    ui.destroy();
  });

  it('NIBP measuring: the cuff line is marked so the grid sets it on one line at the time size', () => {
    const { ui, tile } = mount('saadat-like');
    ui.onEvent({ type: 'nibp', t: 3, phase: 'inflating', cuffMmHg: 44 } as unknown as EngineEvent);
    ui.paint(3);
    const s = tile('NIBP').querySelector('[data-pme="s"]') as HTMLElement;
    expect(s.textContent).toBe('mmHg NBP inflating');
    expect(s.classList.contains('busy')).toBe(true);
    expect(css()).toContain('[data-param="NIBP"] .srow .s.busy{');
    ui.destroy();
  });
});
