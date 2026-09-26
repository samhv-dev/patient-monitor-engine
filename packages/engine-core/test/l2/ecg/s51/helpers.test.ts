import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { morphBeat } from '../../../helpers/s5.ts';
import { acfAtPeriod, beatQrs, rmsRatio, spectralPeak } from '../../../helpers/s51.ts';

describe('Stage 5.1 measurement helpers', () => {
  const tone = Float64Array.from({ length: 5000 }, (_, i) => Math.sin((2 * Math.PI * 5 * i) / 500));
  it('a pure 5 Hz tone: dominant 5 Hz, ACF at its period ≈ 1, and the bandwidth estimator\'s own floor (Hann window + 3-bin smoothing) is ≈ 1.47 Hz', () => {
    const { fd, bw } = spectralPeak(tone, 500);
    expect(Math.abs(fd - 5)).toBeLessThanOrEqual(0.5);
    expect(bw).toBeGreaterThan(1.4);
    expect(bw).toBeLessThan(1.55);
    expect(acfAtPeriod(tone, 500, fd)).toBeGreaterThan(0.95);
  });
  it('rmsRatio of a half-scaled copy is 0.5', () => {
    expect(rmsRatio(tone.map((v) => v / 2), tone)).toBeCloseTo(0.5, 6);
  });
  it('tangent QRS of the textbook narrow beat is 80–100 ms', () => {
    const k = morphBeat({});
    const ms = beatQrs(k, fiducialOf(k)).ms;
    expect(ms).toBeGreaterThanOrEqual(80);
    expect(ms).toBeLessThanOrEqual(100);
  });
});
