import { describe, expect, it } from 'vitest';
import { samples5 } from '../../../helpers/s5.ts';
import { acfAtPeriod, rmsRatio, spectralPeak } from '../../../helpers/s51.ts';

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
});
