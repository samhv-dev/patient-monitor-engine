import { describe, expect, it } from 'vitest';
import { samples5 } from '../../../helpers/s5.ts';
import { acfAtPeriod, detrend, rmsRatio, spectralPeak } from '../../../helpers/s51.ts';
import { dominantHz, rms } from '../../../../src/util/dsp.ts';

// G5-obs: coarse VF looked periodic and was nearly flat in V1. Measured over 20 seeds × four 10 s windows
// (0, 4, 30, 60 s — the strip window is 4–14 s).
describe('Stage 5.1 VF realism', () => {
  it('vfCoarse: no visible periodicity (ACF at the dominant period < 0.6), −3 dB bandwidth ≥ 1.5 Hz in every window and median ≥ 2.2 Hz, V1 and V5 40–100 % of II', { timeout: 300_000 }, async () => {
    let worstAcf = 0;
    const bws: number[] = [];
    const r1: number[] = [];
    const r5: number[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const r = samples5('vfCoarse', 70, ['ecgII', 'V1', 'V5'], { seed, rhythmOpts: { autoAsystole: false } });
      for (const t0 of [0, 4, 30, 60]) {
        const w = (x: Float64Array) => x.subarray(t0 * 500, (t0 + 10) * 500);
        const II = w(r.lead.ecgII!);
        const { fd, bw } = spectralPeak(II, 500);
        worstAcf = Math.max(worstAcf, acfAtPeriod(II, 500, fd));
        bws.push(bw);
        r1.push(rmsRatio(w(r.lead.V1!), II));
        r5.push(rmsRatio(w(r.lead.V5!), II));
      }
      await new Promise<void>((resolve) => setImmediate(resolve)); // CI yielding rule
    }
    expect(worstAcf).toBeLessThan(0.6);
    // the estimator's floor is 1.47 Hz (helpers.test.ts), so the median carries the discrimination: Stage 5 measured 1.78
    bws.sort((a, b) => a - b);
    expect(bws[0]!).toBeGreaterThanOrEqual(1.5);
    expect(bws[bws.length >> 1]!).toBeGreaterThanOrEqual(2.2);
    for (const x of [...r1, ...r5]) {
      expect(x).toBeGreaterThanOrEqual(0.4);
      expect(x).toBeLessThanOrEqual(1);
    }
  });

  // R39 item 3 (research/09-evidence-rulings.md): coarse VF 1.2 mV / 5.5 Hz at onset, 0.9/5.0 at 2 min, 0.7/4.6 at 4,
  // 0.55/4.3 at 6, 0.33/3.9 at 10 min. Measured as the mean of 8 seeds over 20 s windows centred on each time
  // (amplitude = 2√2·RMS of the detrended lead II, as s5/vf.test.ts; frequency = its spectral peak).
  it('R39 course: measured amplitude within ±20 % and dominant frequency within ±0.25 Hz of the ruling at 0/2/4/6/10 min', { timeout: 300_000 }, async () => {
    const course = [[0, 1.2, 5.5], [2, 0.9, 5.0], [4, 0.7, 4.6], [6, 0.55, 4.3], [10, 0.33, 3.9]] as const;
    const a = course.map(() => 0);
    const f = course.map(() => 0);
    const seeds = 16;
    for (let seed = 1; seed <= seeds; seed++) {
      const r = samples5('vfCoarse', 10 * 60 + 11, ['ecgII'], { seed, mods: { artefact: { noise: 0 } }, rhythmOpts: { autoAsystole: false } });
      course.forEach(([m], i) => {
        const t0 = Math.max(0, m * 60 - 10);
        const w = r.lead.ecgII!.subarray(t0 * 500, (t0 + 20) * 500);
        a[i]! += (2 * Math.SQRT2 * rms(detrend(w))) / seeds;
        f[i]! += dominantHz(w, 500) / seeds;
      });
      await new Promise<void>((resolve) => setImmediate(resolve)); // CI yielding rule
    }
    course.forEach(([, amp, hz], i) => {
      expect(Math.abs(a[i]! / amp - 1)).toBeLessThanOrEqual(0.2);
      expect(Math.abs(f[i]! - hz)).toBeLessThanOrEqual(0.25);
    });
  });
});
