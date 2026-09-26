import { describe, expect, it } from 'vitest';
import { BANDS, hrBin } from '../../src/morphology/bands.ts';
import { gradeBand, gradePairs, type WindowPair } from '../../src/morphology/suite.ts';
import type { WindowMetrics } from '../../src/metrics/window-metrics.ts';
import type { AnalysisWindow } from '../../src/datasets/signals.ts';

const M = (o: Partial<WindowMetrics>): WindowMetrics => ({
  hr: 80, beats: 3, rToFootMs: [], footToPeakMs: [], rToNotchMs: [], notchDepth: [], notchMinimumFrac: 1, upstrokeSlope: [], sys: [], dia: [],
  alpha: [], slopeIII: [], plateau: [], co2Calibrated: true, resp: null, ppgDelayMs: [], ppgShapeR: Number.NaN, ppgCountRatio: Number.NaN, hrErr: [], nibpMinusAbp: [], ...o,
});
const W: AnalysisWindow = { source: 'vitaldb', record: 'x', fromS: 0, toS: 300, site: 'radial', hr: 80, sbp: 120, dbp: 70, etco2: 35, vent: null, ageY: 50, sex: 'M', tags: [] };
const pair = (rec: Partial<WindowMetrics>, eng: Partial<WindowMetrics>): WindowPair => ({ window: W, recorded: M(rec), engine: M(eng), wallMs: 0 });
const band = (id: string) => BANDS.find((b) => b.id === id) as (typeof BANDS)[number];

describe('morphology grading (R40 grades on evidence bands)', () => {
  it('V1 is graded against the recorded median ± 20 ms', () => {
    expect(gradeBand(band('V1'), [pair({ rToFootMs: [160, 162, 158] }, { rToFootMs: [170, 171, 169] })], 'HR 70–90')?.grade).toBe('green');
    expect(gradeBand(band('V1'), [pair({ rToFootMs: [160, 162, 158] }, { rToFootMs: [190, 191, 189] })], 'HR 70–90')?.grade).toBe('yellow');
  });
  it('absolute bands ignore the recording (V4 α 100–110°)', () => {
    const r = gradeBand(band('V4'), [pair({ alpha: [116, 115] }, { alpha: [105, 106] })], 'all');
    expect(r).toMatchObject({ grade: 'green', expected: '100–110' });
    expect(r?.recorded?.median).toBe(115.5);
  });
  it('ratio bands (upstroke ×0.7–1.3): ×1.5 misses by 15 % → yellow', () => {
    expect(gradeBand(band('upstroke'), [pair({ upstrokeSlope: [800] }, { upstrokeSlope: [1200] })], 'all')?.grade).toBe('yellow');
  });
  it('MGH/MF α is not compared (uncalibrated CO2, decision 11); bands without limits are skipped until filled', () => {
    const p = { ...pair({ alpha: [97], co2Calibrated: false }, { alpha: [106] }), window: { ...W, source: 'mghdb' as const } };
    expect(gradeBand(band('V4-rec'), [p], 'mghdb')).toBeNull();
    expect(gradeBand(band('pwdb-rise'), [pair({ footToPeakMs: [80] }, { footToPeakMs: [80] })], 'all')).toBeNull();
    expect(gradePairs([pair({ footToPeakMs: [100] }, { footToPeakMs: [80] })], { 'pwdb-rise': { min: 94, max: 140 } }).find((r) => r.band === 'pwdb-rise')?.grade).toBe('yellow');
  });
  it('V1/V2 rows are per HR bin', () => {
    expect(hrBin(58)).toBe('HR 50–70');
    const rows = gradePairs([pair({ rToFootMs: [160] }, { rToFootMs: [161] })]);
    expect(rows.filter((r) => r.band === 'V1').map((r) => r.group)).toEqual(['HR 70–90']);
  });
});
