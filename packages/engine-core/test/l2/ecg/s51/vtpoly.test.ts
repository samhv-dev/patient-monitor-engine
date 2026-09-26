import { describe, expect, it } from 'vitest';
import { samples5 } from '../../../helpers/s5.ts';
import { rmsRatio } from '../../../helpers/s51.ts';

// G5-obs / Stage 5 executor: V1 was nearly flat for ~2 s in polymorphic VT (the axis walk parked perpendicular to V1).
describe('Stage 5.1 polymorphic VT visibility', () => {
  it('vtPoly: V1 40–100 % of II over 40 seeds × three 10 s windows', { timeout: 300_000 }, async () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = samples5('vtPoly', 64, ['ecgII', 'V1'], { seed, mods: { artefact: { noise: 0 } } });
      for (const t0 of [4, 30, 54]) {
        const w = (x: Float64Array) => x.subarray(t0 * 500, (t0 + 10) * 500);
        const x = rmsRatio(w(r.lead.V1!), w(r.lead.ecgII!));
        expect(x).toBeGreaterThanOrEqual(0.4);
        expect(x).toBeLessThanOrEqual(1);
      }
      if (seed % 10 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    }
  });
});
