import { describe, expect, it } from 'vitest';
import { burstDurationS, burstPulses, levelSound, volumeGain } from '../src/alarm-bursts.ts';
import { IEC_STYLE, SAADAT } from '../src/profiles/index.ts';

const diffs = (xs: number[]) => xs.slice(1).map((x, i) => +(x - (xs[i] as number)).toFixed(4));

describe('burst geometry', () => {
  it('iec-style high: 10 pulses, 3+2 rhythm twice, t_d 150, x 100, groups 0.6 s apart', () => {
    const p = burstPulses(levelSound(IEC_STYLE, 1));
    expect(p).toHaveLength(10);
    expect(p.every((x) => x.durS === 0.15 && x.freqHz === 880)).toBe(true);
    expect(diffs(p.map((x) => x.offsetS))).toEqual([0.25, 0.25, 0.5, 0.25, 0.75, 0.25, 0.25, 0.5, 0.25]);
  });

  it('iec-style medium: 3 pulses of 200 ms, y 200 ms; low: 1 pulse (2 with lowPulses 2)', () => {
    expect(diffs(burstPulses(levelSound(IEC_STYLE, 2)).map((x) => x.offsetS))).toEqual([0.4, 0.4]);
    expect(burstPulses(levelSound(IEC_STYLE, 3))).toHaveLength(1);
    expect(burstPulses(levelSound(IEC_STYLE, 3, { lowPulses: 2 })).map((x) => x.offsetS)).toEqual([0, 0.4]);
  });

  it('saadat L1 "DO-DO-DO--DO-DO": 5 pulses, long gap between 3rd and 4th', () => {
    const p = burstPulses(levelSound(SAADAT, 1));
    expect(diffs(p.map((x) => x.offsetS))).toEqual([0.25, 0.25, 0.45, 0.25]);
    expect(burstDurationS(levelSound(SAADAT, 1))).toBeCloseTo(1.35, 9);
  });

  it('medium burst is at least as long per pulse as high (brief §6.4 t_d + y ≥ t_d + x)', () => {
    const hi = IEC_STYLE.levels.L1;
    const me = IEC_STYLE.levels.L2;
    expect(me.pulseMs + (me.gapsMs[0] ?? 0)).toBeGreaterThanOrEqual(hi.pulseMs + (hi.gapsMs[0] ?? 0));
  });
});

describe('volume curve', () => {
  it('saadat 1–7: 22/6 dB per step (47–69 dB(A)), all audible, monotonic', () => {
    const g = [1, 2, 3, 4, 5, 6, 7].map((s) => volumeGain(SAADAT.volume, s));
    expect(g.every((x, i) => i === 0 || x > (g[i - 1] as number))).toBe(true);
    expect(20 * Math.log10((g[6] as number) / (g[0] as number))).toBeCloseTo(22, 9);
    expect(g[6]).toBeCloseTo(0.5, 9);
    expect(volumeGain(SAADAT.volume, 0)).toBeCloseTo(g[0] as number, 12); // clamped to the minimum
  });

  it('iec-style 0–10: 0 is silent, 3 dB per step', () => {
    expect(volumeGain(IEC_STYLE.volume, 0)).toBe(0);
    expect(20 * Math.log10(volumeGain(IEC_STYLE.volume, 10) / volumeGain(IEC_STYLE.volume, 9))).toBeCloseTo(3, 9);
  });

});
