import { describe, expect, it } from 'vitest';
import { intervalsOf } from '../../src/metrics/intervals.ts';

/** Synthetic lead II at 500 Hz: P (Gaussian), QRS (sharp biphasic), T (asymmetric Gaussian); RR 1 s. */
function ecg(pr: number, qrs: number, qt: number): Float64Array {
  const fs = 500;
  const x = new Float64Array(12 * fs);
  const g = (t: number, c: number, s: number, a: number) => a * Math.exp(-((t - c) ** 2) / (2 * s * s));
  for (let i = 0; i < x.length; i++) {
    const t = (i / fs) % 1;
    const q = 0.5; // QRS onset in each second
    let v = g(t, q - pr + 0.045, 0.018, 0.15); // P: onset ≈ centre − 2.5σ
    v += g(t, q + qrs / 2, qrs / 6, 1.2) - g(t, q + qrs * 0.85, qrs / 10, 0.25);
    v += t < q + qt - 0.07 ? g(t, q + qt - 0.07, 0.06, 0.3) : g(t, q + qt - 0.07, 0.03, 0.3);
    x[i] = v;
  }
  return x;
}

describe('ECG intervals on the median beat (brief §9 V5)', () => {
  it('recovers PR, QRS and QT of a synthetic beat within 20 ms', () => {
    const r = intervalsOf(ecg(0.16, 0.09, 0.4));
    expect(r).not.toBeNull();
    expect(Math.abs((r?.prMs ?? 0) - 160)).toBeLessThan(20);
    expect(Math.abs((r?.qrsMs ?? 0) - 90)).toBeLessThan(20);
    expect(Math.abs((r?.qtMs ?? 0) - 400)).toBeLessThan(20);
    expect(r?.rrS).toBeCloseTo(1, 2);
  });
  it('orders a long-QT beat after a normal one', () => {
    expect((intervalsOf(ecg(0.16, 0.09, 0.5))?.qtMs ?? 0) - (intervalsOf(ecg(0.16, 0.09, 0.4))?.qtMs ?? 0)).toBeGreaterThan(70);
  });
});
