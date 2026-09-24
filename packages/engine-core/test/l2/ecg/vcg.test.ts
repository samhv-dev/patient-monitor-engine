import { describe, expect, it } from 'vitest';
import { createRngState, normal } from '../../../src/rng/sfc32.ts';
import { projectLead, projectLeads } from '../../../src/l2/ecg/vcg.ts';
import { LEAD_IDS } from '../../../src/types.ts';

describe('l2/ecg/vcg', () => {
  it('Einthoven/Goldberger identities hold to < 1e-6 mV for arbitrary VCG samples (acceptance test 4, part 1)', () => {
    const s = createRngState(4).noise;
    const out = new Float64Array(12);
    for (let i = 0; i < 100_000; i++) {
      const [I, II, III, aVR, aVL, aVF] = projectLeads(3 * normal(s), 3 * normal(s), 3 * normal(s), out) as unknown as number[];
      expect(Math.abs((III as number) - ((II as number) - (I as number)))).toBeLessThan(1e-6);
      expect(Math.abs((aVR as number) + (aVL as number) + (aVF as number))).toBeLessThan(1e-6);
    }
  });

  it('projectLead agrees with projectLeads for every lead', () => {
    const out = new Float64Array(12);
    projectLeads(0.3, -0.7, 0.2, out);
    LEAD_IDS.forEach((lead, i) => expect(projectLead(lead, 0.3, -0.7, 0.2)).toBeCloseTo(out[i] as number, 12));
  });

  it('uses the confirmed Dower row for lead II', () => {
    expect(projectLead('ecgII', 1, 0, 0)).toBe(0.235);
    expect(projectLead('ecgII', 0, 1, 0)).toBe(1.066);
    expect(projectLead('ecgII', 0, 0, 1)).toBe(-0.132);
  });
});
