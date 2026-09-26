// RR-1: the lane layout from the skin (brief §3.8) and the legacy Stage 1/2 plan.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { ecgLabel, filterModeFor, legacyPlan, renderPlan } from '../src/skin-plan.ts';

describe('renderPlan', () => {
  it('saadat-like: ECG II auto-gain, pleth, IBP1 → abp (ART scale 40–200), IBP2 → cvp, resp at 6 mm/s; 4 px gap; NORMAL filter', () => {
    const p = renderPlan(resolveSkin('saadat-like'));
    expect(p.lanes.map((l) => [l.id, l.channel])).toEqual([['ECG1', 'ecgII'], ['PLETH', 'pleth'], ['IBP1', 'abp'], ['IBP2', 'cvp'], ['RESP', 'resp']]);
    expect(p.lanes[0]).toMatchObject({ autoGain: true, color: '#00F000', mmPerS: 25 });
    expect(p.lanes[2]).toMatchObject({ range: [40, 200], mmPerS: 12.5 });
    expect(p.lanes[4]?.mmPerS).toBe(6);
    expect(p.eraseGapPx).toBe(4);
    expect(p.filterNames.monitor).toBe('NORMAL');
    expect(p.filterNames['band:0.5-24']).toBe('MONITOR');
    expect(ecgLabel(p.lanes[0]!.label, 'ecgII', 2, p.gainLabel, 'NORMAL')).toBe('II  X2  NORMAL');
    expect(p.paceMarker).toEqual({ style: 'vertical-line', heightMm: 10 });
  });

  it('philips-like: II and V1, letter filter, ABP 0–150, CO2 0–40 mmHg; zoll-like r-above sync markers', () => {
    const p = renderPlan(resolveSkin('philips-like'));
    expect(p.lanes.map((l) => l.channel)).toEqual(['ecgII', 'V1', 'abp', 'pleth', 'co2']);
    expect(ecgLabel(p.lanes[1]!.label, 'V1', 1, p.gainLabel, p.filterNames.monitor!)).toBe('V1  M');
    expect(p.lanes[4]?.range).toEqual([0, 40]);
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

  it('pages that name their lanes keep them, in the skin colours (Stage 1/2/5 demos)', () => {
    const p = renderPlan(resolveSkin('philips-like'), undefined, { lanes: ['ecgII', 'V5'], waves: ['abp', 'pleth'] });
    expect(p.lanes.map((l) => [l.id, l.channel, l.color])).toEqual([['ECG1', 'ecgII', '#00FF00'], ['ECG2', 'V5', '#00FF00'], ['ART', 'abp', '#FF4040'], ['PLETH', 'pleth', '#00FFFF']]);
  });

  it('legacyPlan reproduces the Stage 1/2 lanes', () => {
    const p = legacyPlan(['ecgII', 'V5'], ['abp']);
    expect(p.lanes.map((l) => [l.channel, l.color, l.range])).toEqual([['ecgII', '#00ff66', null], ['V5', '#00ff66', null], ['abp', '#ff3b3b', [0, 150]]]);
    expect(ecgLabel(p.lanes[0]!.label, 'ecgII', 1, p.gainLabel, 'M')).toBe('II  M');
  });
});
