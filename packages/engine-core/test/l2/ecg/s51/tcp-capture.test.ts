import { describe, expect, it } from 'vitest';
import { beatKernels, fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { LEAD_IDS } from '../../../../src/types.ts';
import { kernelLead, morphBeat } from '../../../helpers/s5.ts';
import { beatQrs } from '../../../helpers/s51.ts';

const maxSlope = (k: number[]) => {
  let m = 0;
  for (const l of LEAD_IDS) for (let t = -0.05; t < 0.3; t += 0.0005) m = Math.max(m, Math.abs(kernelLead(k, l, t + 0.00025) - kernelLead(k, l, t - 0.00025)) / 0.0005);
  return m;
};

describe('Stage 5.1 paced / transcutaneous capture complex (measured)', () => {
  it('capture complex: broad (tangent QRS ≥ 140 ms) and low-slope (steepest limb ≤ 40 % of a sinus beat), LBBB-like QS in V1', () => {
    const k = beatKernels('pacedV', 400);
    expect(beatQrs(k, fiducialOf(k)).ms).toBeGreaterThanOrEqual(140);
    expect(maxSlope(k) / maxSlope(morphBeat({}))).toBeLessThanOrEqual(0.4);
    expect(Math.max(...Array.from({ length: 200 }, (_, i) => kernelLead(k, 'V1', i / 1000)))).toBeLessThan(0.2);
  });
});
