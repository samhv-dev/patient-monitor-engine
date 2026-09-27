// Stage 7e thresholds and effectors (tables §5c; annex B3 Pulse shivering/sweat forms).
import { describe, expect, it } from 'vitest';
import { shiverW, sweatW, thresholds, vasoDilation } from '../../../src/l2/thermal/thresholds.ts';

describe('thermoregulatory thresholds', () => {
  it('awake 37.2/36.9/36.0 and GA 38.0/34.8/33.5 (sweat/vaso/shiver); a fever shifts all three', () => {
    const a = thresholds(0, 0);
    expect([a.sweat, a.vaso, a.shiver]).toEqual([37.2, 36.9, 36.0]);
    const g = thresholds(1, 0);
    expect(g.sweat).toBeCloseTo(38.0, 9);
    expect(g.vaso).toBeCloseTo(34.8, 9);
    expect(g.shiver).toBeCloseTo(33.5, 9);
    expect(thresholds(0, 2).shiver).toBeCloseTo(38.0, 9);
  });

  it('awake tone at 36.8 °C is 0.2 dilated (reproduces Stage 3 k0); GA at 36.8 is fully dilated', () => {
    expect(vasoDilation(36.8, thresholds(0, 0))).toBeCloseTo(0.2, 9);
    expect(vasoDilation(36.8, thresholds(1, 0))).toBeGreaterThan(0.999);
    expect(vasoDilation(34.0, thresholds(1, 0))).toBeLessThan(0.001);
  });

  it('shivering: 0 above threshold, linear to the summit over 1.8 °C, capped at × 5, abolished by NMB', () => {
    const thr = thresholds(0, 0);
    expect(shiverW(36.1, thr, 80, 70, 0)).toBe(0);
    const half = shiverW(35.1, thr, 80, 70, 0);
    const full = shiverW(33.0, thr, 80, 70, 0);
    expect(full).toBeCloseTo(4 * 80, 6); // summit 21·70^0.75 = 508 W > 5 × 80 → capped: extra 4 × m0
    expect(half).toBeCloseTo(320 * (0.9 / 1.8), 6);
    expect(shiverW(33.0, thr, 80, 70, 1)).toBe(0);
  });

  it('sweating starts at the threshold (218 W/°C, Pulse) and is capped at 150 W (70 kg)', () => {
    const thr = thresholds(0, 0);
    expect(sweatW(37.2, thr, 70)).toBe(0);
    expect(sweatW(37.4, thr, 70)).toBeCloseTo(43.6, 6);
    expect(sweatW(39, thr, 70)).toBe(150);
  });
});
