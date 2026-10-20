// RR-1: the lane layout from the skin (brief §3.8) and the legacy Stage 1/2 plan.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { ecgLabel, filterModeFor, legacyPlan, renderPlan } from '../src/skin-plan.ts';

describe('renderPlan', () => {
  it('saadat-like (research/34 T3, IMG_8113): two ECG II auto-gain, resp at 6 mm/s, IBP1 → abp (ART scale 40–200), IBP2 → cvp, pleth last; 4 px gap; NORMAL filter', () => {
    const p = renderPlan(resolveSkin('saadat-like'));
    expect(p.lanes.map((l) => [l.id, l.channel])).toEqual([['ECG1', 'ecgII'], ['ECG2', 'ecgII'], ['RESP', 'resp'], ['IBP1', 'abp'], ['IBP2', 'cvp'], ['PLETH', 'pleth']]);
    expect(p.lanes[0]).toMatchObject({ autoGain: true, color: '#00F000', mmPerS: 25 });
    expect(p.lanes[1]).toMatchObject({ kind: 'ecg', autoGain: true, color: '#00F000', mmPerS: 25 });
    expect(p.lanes[3]).toMatchObject({ range: [40, 200], mmPerS: 25 }); // IMG_8113: "25 mm/s" on both IBP lanes (D6)
    expect(p.lanes[4]).toMatchObject({ color: '#6C9CF8', range: [-10, 30] }); // T4 mid blue
    // research/34 row 11: dotted lines at the upper, middle and lower scale values, the middle value printed
    expect(p.lanes[3]).toMatchObject({ scaleLines: [200, 120, 40], scaleMid: 120 });
    expect(p.lanes[4]).toMatchObject({ scaleLines: [30, 10, -10], scaleMid: 10 });
    expect(p.lanes[0]!.scaleLines).toBeNull();
    expect(p.lanes[5]!.scaleLines).toBeNull();
    expect(p.scaleLineColor).toBe('#8A8C92');
    expect(p.lanes[2]?.mmPerS).toBe(6);
    expect(p.lanes[5]).toMatchObject({ channel: 'pleth', mmPerS: 25, range: null });
    expect(p.eraseGapPx).toBe(4);
    expect(p.filterNames.monitor).toBe('NORMAL');
    expect(p.filterNames['band:0.5-24']).toBe('MONITOR');
    expect(ecgLabel(p.lanes[0]!.label, 'ecgII', 2, p.gainLabel, 'NORMAL')).toBe('II  X2  NORMAL');
    expect(p.paceMarker).toEqual({ style: 'vertical-line', heightMm: 10 });
  });

  it('saadat-like with the CO2 line attached (showcase hotfix item 4): the capnogram in the RESP lane\'s place', () => {
    const p = renderPlan(resolveSkin('saadat-like', { sensors: { co2: true } }));
    expect(p.lanes.map((l) => [l.id, l.channel])).toEqual([['ECG1', 'ecgII'], ['ECG2', 'ecgII'], ['CO2', 'co2'], ['IBP1', 'abp'], ['IBP2', 'cvp'], ['PLETH', 'pleth']]);
    // research/34 T1/T2: 6 mm/s on a 0–50 mmHg scale, as photographed ("6 mm/s", "50mmHg"); EtCO2 above 50 clips (E63)
    expect(p.lanes[2]).toMatchObject({ label: 'CO2', color: '#F0F030', mmPerS: 6, range: [0, 50] });
    expect(p.lanes[2]).toMatchObject({ fill: true }); // research/34 row 2: the capnogram is filled
    expect(p.lanes.filter((l) => l.id !== 'CO2').every((l) => l.fill === false)).toBe(true);
    // owner correction M2: the drawn capnogram is smoothed over 320 ms (display only); every other lane is not
    expect(p.lanes[2]?.smoothMs).toBe(320);
    expect(p.lanes.filter((l) => l.id !== 'CO2').map((l) => l.smoothMs)).toEqual([0, 0, 0, 0, 0]);
    expect(renderPlan(resolveSkin('philips-like', { sensors: { co2: true } })).lanes.every((l) => l.smoothMs === 0)).toBe(true);
    expect(renderPlan(resolveSkin('philips-like', { sensors: { co2: true } })).lanes.every((l) => l.fill === false)).toBe(true);
    expect(renderPlan(resolveSkin('iran-icu-as-found', { sensors: { co2: true } })).lanes.map((l) => l.id)).toEqual(['ECG1', 'ECG2', 'PLETH', 'CO2']);
  });

  it('philips-like: II and V1, letter filter, ABP 0–150, CO2 0–40 mmHg; zoll-like r-above sync markers', () => {
    const p = renderPlan(resolveSkin('philips-like'));
    expect(p.lanes.map((l) => l.channel)).toEqual(['ecgII', 'V1', 'abp', 'pleth', 'co2']);
    expect(ecgLabel(p.lanes[1]!.label, 'V1', 1, p.gainLabel, p.filterNames.monitor!)).toBe('V1  M');
    expect(p.lanes[4]?.range).toEqual([0, 40]);
    expect(p.lanes.every((l) => l.scaleLines === null && l.scaleMid === null)).toBe(true); // iec-defaults scaleLines "none"
    expect(p.scaleLineColor).toBeNull();
    expect(renderPlan(resolveSkin('zoll-like')).syncMarker).toBe('r-above');
  });

  it('pages: saadat-like P10 (PUMP) hides IBP scale numbers; P7 has its own lanes', () => {
    const r = resolveSkin('saadat-like');
    expect(renderPlan(r, 'P10').hideScaleNumbers).toBe(true);
    expect(renderPlan(r, 'P7').lanes.map((l) => l.id)).toEqual(['ECG1', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'PLETH']);
  });

  it('ecg-grid theme carries the grid; skin bands map to engine filter modes', () => {
    expect(renderPlan(resolveSkin('philips-like', { theme: 'ecg-grid' })).grid).toMatchObject({ minorMm: 1, majorMm: 5 });
    expect(filterModeFor([0.5, 40])).toBe('monitor');
    expect(filterModeFor([1, 20])).toBe('band:1-20');
  });

  it('pages that name their lanes keep them, in the skin colours (the base, haemodynamic and rhythm demos)', () => {
    const p = renderPlan(resolveSkin('philips-like'), undefined, { lanes: ['ecgII', 'V5'], waves: ['abp', 'pleth'] });
    expect(p.lanes.map((l) => [l.id, l.channel, l.color])).toEqual([['ECG1', 'ecgII', '#00FF00'], ['ECG2', 'V5', '#00FF00'], ['ART', 'abp', '#FF4040'], ['PLETH', 'pleth', '#00FFFF']]);
  });

  it('legacyPlan reproduces the base and haemodynamic lanes', () => {
    const p = legacyPlan(['ecgII', 'V5'], ['abp']);
    expect(p.lanes.map((l) => [l.channel, l.color, l.range])).toEqual([['ecgII', '#00ff66', null], ['V5', '#00ff66', null], ['abp', '#ff3b3b', [0, 150]]]);
    expect(ecgLabel(p.lanes[0]!.label, 'ecgII', 1, p.gainLabel, 'M')).toBe('II  M');
  });
});
