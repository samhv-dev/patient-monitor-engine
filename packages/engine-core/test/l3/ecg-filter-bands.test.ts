// Stage 4b, request E-4a-1: the ECG filter as any skin band (brief §3.8 `ecg.filters`; research/05 §2.2).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { designEcgFilter, filterBand, magnitudeAt, toDb } from '../../src/l3/ecg-filter.ts';

const FS = 500;
/** Frequency (Hz) where the cascade first crosses −3 dB, searching from f0 in steps of df. */
function corner(mode: Parameters<typeof designEcgFilter>[0], f0: number, f1: number, df: number): number {
  const s = designEcgFilter(mode, FS, 50);
  for (let f = f0; df > 0 ? f <= f1 : f >= f1; f += df) if (toDb(magnitudeAt(s, f, FS)) >= -3.01) return f;
  return Number.NaN;
}

describe('ECG filter bands (E-4a-1)', () => {
  it('parses bands and rejects malformed or out-of-range ones', () => {
    expect(filterBand('monitor')).toEqual([0.5, 40]);
    expect(filterBand('band:0.5-24')).toEqual([0.5, 24]);
    expect(filterBand('band:.05-100')).toEqual([0.05, 100]);
    expect(filterBand('band:5-2' as never)).toBeNull();
    expect(filterBand('band:0.5-400')).toBeNull();
    expect(filterBand('bogus' as never)).toBeNull();
  });

  it('saadat-like MONITOR 0.5–24 Hz and EXTENDED 0.05–100 Hz have their −3 dB corners where the skin says', () => {
    expect(corner('band:0.5-24', 0.3, 1, 0.01)).toBeCloseTo(0.5, 1);
    expect(corner('band:0.5-24', 60, 10, -0.1)).toBeCloseTo(24, 0);
    expect(corner('band:0.05-100', 0.02, 0.2, 0.001)).toBeCloseTo(0.05, 2);
    expect(corner('band:0.05-100', 150, 50, -0.1)).toBeCloseTo(100, 0);
  });

  it('bands below 100 Hz get the mains notch, wider ones do not', () => {
    expect(toDb(magnitudeAt(designEcgFilter('band:0.5-24', FS, 50), 50, FS))).toBeLessThan(-40);
    expect(designEcgFilter('band:0.05-100', FS, 50)).toHaveLength(2);
  });

  it('the engine accepts a band filter command and rejects a bad one', () => {
    const e = createEngine({ seed: 1 });
    const ok = e.dispatch({ id: 'f1', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'band:0.5-24' } });
    const bad = e.dispatch({ id: 'f2', issuedBy: 't', type: 'device', action: { device: 'ecg', action: 'filter', value: 'band:30-20' } });
    expect(ok.accepted).toBe(true);
    expect(bad.accepted).toBe(false);
    e.advanceTo(3);
    const out = new Float32Array(500);
    expect(e.readSamples('ecgII', 1000, out)).toBe(500);
    expect(out.every(Number.isFinite)).toBe(true);
  });
});
