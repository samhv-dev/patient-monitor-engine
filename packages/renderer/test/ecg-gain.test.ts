// The ECG auto-gain's judgement (src/ecg-gain.ts): discrete sizes, a hysteresis band, two consecutive windows, and a
// per-beat median amplitude. The MonitorCore side is in ecg-auto-gain.test.ts.
import { describe, expect, it } from 'vitest';
import { AUTO_GAIN_BAND, AUTO_GAIN_FILL, beatAmplitude, judgeGain, newJudge } from '../src/ecg-gain.ts';

const OPTIONS = [0.25, 0.5, 1, 2, 4];
const PHOTO_MM = 115 / 3.1; // the Saadat-like ECG1 lane on IMG_8113: 115 px at 3.10 px/mm
const limit = (g: number, laneMm = PHOTO_MM) => (AUTO_GAIN_FILL * laneMm) / (g * 10); // mV that fit at gain g

describe('judgeGain: discrete sizes, hysteresis, two consecutive windows', () => {
  it('the first judgement takes the largest size that fits, at once (as Auto Size does when chosen)', () => {
    const j = newJudge(1);
    expect(judgeGain(j, 1.3, 10, OPTIONS, PHOTO_MM)).toBe(1);
    const k = newJudge(1);
    expect(judgeGain(k, 0.5, 10, OPTIONS, PHOTO_MM)).toBe(4);
    const big = newJudge(1);
    expect(judgeGain(big, 50, 10, OPTIONS, PHOTO_MM)).toBe(0.25); // nothing fits: the smallest size
  });

  it('an amplitude inside the band around the current size\'s threshold never changes the size', () => {
    const j = newJudge(1);
    judgeGain(j, 1.3, 0, OPTIONS, PHOTO_MM);
    const inside = limit(1) * (1 + AUTO_GAIN_BAND * 0.5); // over X1's threshold, inside the band
    for (let k = 1; k <= 10; k++) expect(judgeGain(j, inside, k, OPTIONS, PHOTO_MM), `window ${k}`).toBe(1);
    const below = limit(2) * (1 - AUTO_GAIN_BAND * 0.5); // fits X2, but not clearly
    for (let k = 11; k <= 20; k++) expect(judgeGain(j, below, k, OPTIONS, PHOTO_MM), `window ${k}`).toBe(1);
  });

  it('out of the band, the new size is taken only when two consecutive windows ask for it', () => {
    const j = newJudge(1);
    judgeGain(j, 1.3, 0, OPTIONS, PHOTO_MM);
    const over = limit(1) * (1 + AUTO_GAIN_BAND * 1.5);
    expect(judgeGain(j, over, 1, OPTIONS, PHOTO_MM)).toBe(1); // one window: held
    expect(judgeGain(j, over, 2, OPTIONS, PHOTO_MM)).toBe(0.5); // the second consecutive: changed
    const under = limit(1) * (1 - AUTO_GAIN_BAND * 1.5); // fits X1 clearly
    expect(judgeGain(j, under, 3, OPTIONS, PHOTO_MM)).toBe(0.5);
    expect(judgeGain(j, under, 4, OPTIONS, PHOTO_MM)).toBe(1);
  });

  it('windows that are not consecutive (a normal window between, or a skipped one) do not count', () => {
    const j = newJudge(1);
    judgeGain(j, 1.3, 0, OPTIONS, PHOTO_MM);
    const over = limit(1) * 1.5;
    expect(judgeGain(j, over, 1, OPTIONS, PHOTO_MM)).toBe(1);
    expect(judgeGain(j, 1.3, 2, OPTIONS, PHOTO_MM)).toBe(1);
    expect(judgeGain(j, over, 3, OPTIONS, PHOTO_MM)).toBe(1);
    expect(judgeGain(j, over, 5, OPTIONS, PHOTO_MM)).toBe(1); // window 4 was not judged (a hidden tab)
    expect(judgeGain(j, over, 6, OPTIONS, PHOTO_MM)).toBe(0.5);
  });
});

describe('beatAmplitude: the median of the window\'s beats, not its largest excursion', () => {
  const RATE = 500;
  /** 4 s of baseline with a 1.3 mV complex (−0.1 → +1.2 mV) at each beat; `big` beats are 2.6 mV. */
  function strip(beats: number[], big: number[] = []): Float32Array {
    const s = new Float32Array(4 * RATE);
    beats.forEach((b, i) => {
      const amp = big.includes(i) ? 2.6 : 1.3;
      const n = Math.round(b * RATE);
      for (let d = -10; d <= 10; d++) if (n + d >= 0 && n + d < s.length) s[n + d] = (amp - 0.1) * (1 - Math.abs(d) / 10);
      if (n + 25 < s.length) s[n + 25] = -0.1;
    });
    return s;
  }
  const beats = [0.4, 1.2, 2.0, 2.8, 3.6];

  it('one beat twice the size of the others (a PVC) leaves the amplitude at the others\'', () => {
    expect(beatAmplitude(strip(beats, [2]), 4 * RATE, 0, RATE, beats)).toBeCloseTo(1.3, 5);
  });

  it('with no beats in the window (asystole, VF, leads off) it is the window\'s peak to peak', () => {
    expect(beatAmplitude(strip(beats, [2]), 4 * RATE, 0, RATE, [])).toBeCloseTo(2.6, 5);
  });

  it('beats outside the window, or too close to its edges to be whole, are left out', () => {
    const t0 = 100;
    // a tall complex 50 ms into the window (its start is cut off) and one normal beat; neighbours outside the window
    expect(beatAmplitude(strip([0.05, 2.0], [0]), 4 * RATE, t0, RATE, [99.2, 100.05, 102.0, 104.3])).toBeCloseTo(1.3, 5);
  });
});
