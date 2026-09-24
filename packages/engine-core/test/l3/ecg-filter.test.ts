import { describe, expect, it } from 'vitest';
import { createFilterState, designEcgFilter, filterSample, magnitudeAt, toDb } from '../../src/l3/ecg-filter.ts';

const FS = 500;

describe('l3/ecg-filter', () => {
  it('monitor mode: −3 dB (±0.5) at 0.5 and 40 Hz, flat (±0.5 dB) at 5–20 Hz, ≥40 dB down at 50 Hz', () => {
    const f = designEcgFilter('monitor', FS, 50);
    expect(toDb(magnitudeAt(f, 0.5, FS))).toBeCloseTo(-3, 0);
    expect(Math.abs(toDb(magnitudeAt(f, 0.5, FS)) + 3.01)).toBeLessThan(0.5);
    expect(Math.abs(toDb(magnitudeAt(f, 40, FS)) + 3.01)).toBeLessThan(0.5);
    for (const hz of [5, 10, 15, 20]) expect(Math.abs(toDb(magnitudeAt(f, hz, FS)))).toBeLessThan(0.5);
    expect(toDb(magnitudeAt(f, 50, FS))).toBeLessThan(-40);
  });

  it('60 Hz mains moves the notch', () => {
    const f = designEcgFilter('monitor', FS, 60);
    expect(toDb(magnitudeAt(f, 60, FS))).toBeLessThan(-40);
    expect(toDb(magnitudeAt(f, 50, FS))).toBeGreaterThan(-15);
  });

  it('diagnostic mode: −3 dB (±0.5) at 0.05 and 150 Hz, flat at 1–40 Hz, no notch', () => {
    const f = designEcgFilter('diagnostic', FS);
    expect(Math.abs(toDb(magnitudeAt(f, 0.05, FS)) + 3.01)).toBeLessThan(0.5);
    expect(Math.abs(toDb(magnitudeAt(f, 150, FS)) + 3.01)).toBeLessThan(0.5);
    for (const hz of [1, 10, 40]) expect(Math.abs(toDb(magnitudeAt(f, hz, FS)))).toBeLessThan(0.5);
    expect(toDb(magnitudeAt(f, 50, FS))).toBeGreaterThan(-1);
  });

  it('time-domain filtering matches the magnitude response for a 10 Hz sine', () => {
    const f = designEcgFilter('monitor', FS);
    const st = createFilterState(f);
    let peak = 0;
    for (let n = 0; n < 20 * FS; n++) {
      const y = filterSample(f, st, Math.sin((2 * Math.PI * 10 * n) / FS));
      if (n > 15 * FS) peak = Math.max(peak, Math.abs(y));
    }
    expect(peak).toBeCloseTo(magnitudeAt(f, 10, FS), 2);
  });

  it('removes a DC offset (high-pass) in monitor mode', () => {
    const f = designEcgFilter('monitor', FS);
    const st = createFilterState(f);
    let y = 0;
    for (let n = 0; n < 10 * FS; n++) y = filterSample(f, st, 1);
    expect(Math.abs(y)).toBeLessThan(1e-3);
  });
});
