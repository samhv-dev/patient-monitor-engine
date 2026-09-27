import { describe, expect, it } from 'vitest';
import type { PulseBeat } from '../../src/metrics/abp.ts';
import { hrAveragingError, nibpVsAbp, paEtGap } from '../../src/metrics/device.ts';
import { ppgAbp } from '../../src/metrics/ppg.ts';
import { respVariation } from '../../src/metrics/resp-variation.ts';

const beat = (t: number, sys: number, dia: number): PulseBeat => ({ r: t - 0.2, foot: t - 0.1, peak: t, sys, dia, slope: 800 });

describe('respiratory variation (PPV/SPV against the ventilator cycle)', () => {
  it('PP 40 → 50 within each 5 s breath gives PPV 22 %, SPV 10, PPmax early', () => {
    const beats: PulseBeat[] = [];
    for (let b = 0; b < 6; b++) for (let k = 0; k < 5; k++) beats.push(beat(b * 5 + k + 0.5, k === 1 ? 130 : 120, 80));
    const r = respVariation(beats, [0, 5, 10, 15, 20, 25, 30]);
    expect(r.breaths).toBe(6);
    expect(r.ppvPct).toBeCloseTo(22.2, 1);
    expect(r.spvMmHg).toBe(10);
    expect(r.ppMaxPhase).toBeCloseTo(0.3, 5);
  });
});

describe('PPG ↔ ABP', () => {
  it('measures the pleth delay after the arterial foot and a high shape r for the same pulse shape', () => {
    const fs = 125;
    const pulse = (delay: number) => Float64Array.from({ length: 20 * fs }, (_, i) => {
      const t = ((i / fs) - delay) % 1;
      return t < 0 || t > 0.8 ? 0 : t < 0.1 ? t * 10 : Math.exp(-(t - 0.1) / 0.2);
    });
    const rS = Array.from({ length: 19 }, (_, i) => i + 0.5);
    const r = ppgAbp({ fs, x: pulse(0.65) }, { fs, x: pulse(0.72) }, rS);
    expect(Math.abs(Math.round(r.delayMs.reduce((a, b) => a + b, 0) / r.delayMs.length) - 70)).toBeLessThanOrEqual(8);
    expect(r.shapeR).toBeGreaterThan(0.95);
    expect(r.countRatio).toBeGreaterThan(0.9);
  });
});

describe('device metrics', () => {
  it('HR averaging error against 12 RR; NIBP minus 40 s invasive MAP; Pa–Et gap', () => {
    const rS = Array.from({ length: 30 }, (_, i) => i * 0.75); // 80 bpm
    expect(hrAveragingError([[20, 82]], rS)).toEqual([2]);
    const beats = Array.from({ length: 60 }, (_, i) => beat(i, 120, 60)); // MAP 80
    expect(nibpVsAbp([[50, 85]], beats)).toEqual([5]);
    expect(paEtGap([[300, 42]], [[200, 35], [250, 36], [290, 37]])).toEqual([6]);
  });
});
