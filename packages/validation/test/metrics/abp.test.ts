import { describe, expect, it } from 'vitest';
import { pulseBeats } from '../../src/metrics/abp.ts';
import { detectR } from '../../src/metrics/ecg.ts';

const FS = 125;
/** Synthetic radial-like pulses: foot at R + delay, linear upstroke 80 ms, exponential fall with a notch dip. */
function pulses(rs: number[], delayS: number, notchAfterPeakS: number, dur: number): Float64Array {
  const x = new Float64Array(Math.round(dur * FS)).fill(70);
  for (const r of rs) {
    const foot = r + delayS;
    for (let i = Math.round(foot * FS); i < x.length && i < Math.round((foot + 0.75) * FS); i++) {
      const t = i / FS - foot;
      let v = t < 0.08 ? 70 + (50 * t) / 0.08 : 70 + 50 * Math.exp(-(t - 0.08) / 0.25);
      const dn = t - (0.08 + notchAfterPeakS);
      v -= 6 * Math.exp(-(dn * dn) / (2 * 0.012 * 0.012));
      x[i] = Math.max(x[i] as number, v);
    }
  }
  return x;
}

describe('arterial fiducials (brief §9 V1/V2)', () => {
  const rs = Array.from({ length: 20 }, (_, i) => 1 + 0.8 * i);
  const x = pulses(rs, 0.16, 0.2, 18);

  it('finds the foot by intersecting tangent within 1 sample of the true onset', () => {
    const b = pulseBeats(x, FS, rs);
    expect(b.length).toBe(20);
    for (const beat of b) expect(Math.abs(beat.foot - beat.r - 0.16)).toBeLessThan(1.5 / FS);
  });

  it('finds the dicrotic notch as a local minimum at peak + 200 ms', () => {
    const b = pulseBeats(x, FS, rs);
    for (const beat of b) {
      expect(beat.notchKind).toBe('minimum');
      expect(Math.abs((beat.notch as number) - (beat.r + 0.16 + 0.08 + 0.2))).toBeLessThan(2 / FS);
      expect(beat.notchDepth).toBeGreaterThan(0.2);
    }
  });

  it('upstroke slope is the steepest dP/dt (≈ 625 mmHg/s here, blunted by the 15 Hz low-pass)', () => {
    const b = pulseBeats(x, FS, rs);
    for (const beat of b) {
      expect(beat.slope).toBeGreaterThan(450);
      expect(beat.slope).toBeLessThan(640);
    }
  });
});

describe('R detection', () => {
  it('finds every R of a spiky 500 Hz train once', () => {
    const fs = 500;
    const x = new Float64Array(10 * fs);
    const rs = [0.5, 1.3, 2.1, 2.9, 3.7, 4.5, 5.3, 6.1, 6.9, 7.7, 8.5, 9.3];
    for (const r of rs) for (let i = -10; i <= 10; i++) x[Math.round(r * fs) + i] = Math.exp(-(i * i) / 18) * 1.2;
    // a broad T wave that must not count
    for (const r of rs) for (let i = -60; i <= 60; i++) { const k = Math.round((r + 0.3) * fs) + i; if (k < x.length) x[k] = (x[k] as number) + 0.3 * Math.exp(-(i * i) / 800); }
    expect(detectR(x, fs).map((i) => +(i / fs).toFixed(3))).toEqual(rs);
  });
});
