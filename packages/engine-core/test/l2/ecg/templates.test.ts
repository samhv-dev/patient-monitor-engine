import { describe, expect, it } from 'vitest';
import { addEventAt, makeEvent } from '../../../src/l2/ecg/kernels.ts';
import { projectLead } from '../../../src/l2/ecg/vcg.ts';
import { VEC, WIDE_VEC, templateQrsMs, narrowKernels, kernelQtMs } from '../../../src/l2/ecg/templates.ts';
import type { LeadId } from '../../../src/types.ts';

const p = (lead: LeadId, v: readonly [number, number, number]) => projectLead(lead, v[0], v[1], v[2]);

describe('l2/ecg/templates', () => {
  it('lead II reproduces the brief §4.1 seed amplitudes (±0.005 mV)', () => {
    expect(p('ecgII', VEC.P)).toBeCloseTo(0.15, 2);
    expect(p('ecgII', VEC.Q)).toBeCloseTo(-0.08, 2);
    expect(p('ecgII', VEC.R)).toBeCloseTo(1.1, 2);
    expect(p('ecgII', VEC.S)).toBeCloseTo(-0.25, 2);
    expect(p('ecgII', VEC.T)).toBeCloseTo(0.3, 2);
    expect(p('ecgII', VEC.U)).toBeCloseTo(0.03, 2);
  });

  it('ruling R17: lead II exact (above), QRS peak-to-peak in I 70% and III 30% of II (±25%; limb leads only)', () => {
    const pp = (lead: LeadId) => {
      const v = [p(lead, VEC.Q), p(lead, VEC.R), p(lead, VEC.S), 0];
      return Math.max(...v) - Math.min(...v);
    };
    const ii = pp('ecgII');
    expect(pp('ecgI') / ii).toBeGreaterThan(0.7 * 0.75);
    expect(pp('ecgI') / ii).toBeLessThan(0.7 * 1.25);
    expect(pp('ecgIII') / ii).toBeGreaterThan(0.3 * 0.75);
    expect(pp('ecgIII') / ii).toBeLessThan(0.3 * 1.25);
  });

  it('ruling R17: chest leads follow a normal R-wave progression (no V-lead ratio target)', () => {
    // Measured on the drawn narrow QRS: r = the largest positive and S = the largest negative deflection.
    const ev = makeEvent(0, narrowKernels(400));
    const rs = (lead: LeadId) => {
      let r = 0;
      let S = 0;
      const acc = new Float64Array(3);
      for (let t = -0.02; t <= 0.12; t += 0.0005) {
        acc.fill(0);
        addEventAt(ev, t, acc);
        const v = projectLead(lead, acc[0]!, acc[1]!, acc[2]!);
        r = Math.max(r, v);
        S = Math.min(S, v);
      }
      return { r, S: -S };
    };
    const v = (['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const).map(rs);
    expect(v[0]!.r).toBeGreaterThanOrEqual(0.1); // V1 rS: a septal r of 0.1–0.3 mV (review §6 ruling 2) ...
    expect(v[0]!.r).toBeLessThanOrEqual(0.3);
    expect(v[0]!.r / v[0]!.S).toBeLessThan(1); // ... and a dominant S
    for (let i = 1; i < 4; i++) expect(v[i]!.r).toBeGreaterThan(v[i - 1]!.r * 0.9); // R grows V1 → V4
    const transition = v.findIndex((x) => x.r >= x.S); // first lead with R ≥ S
    expect([2, 3]).toContain(transition); // V3 or V4
    expect(v[4]!.r).toBeGreaterThan(v[4]!.S); // V5 and V6 dominant R
    expect(v[5]!.r).toBeGreaterThan(v[5]!.S);
  });

  it('narrow QRS 70–100 ms, wide QRS 120–200 ms with a discordant T and 1.5–2× amplitude in II (brief §5; review L12)', () => {
    expect(templateQrsMs('narrow')).toBeGreaterThanOrEqual(70);
    expect(templateQrsMs('narrow')).toBeLessThanOrEqual(100);
    expect(templateQrsMs('wide')).toBeGreaterThanOrEqual(120);
    expect(templateQrsMs('wide')).toBeLessThanOrEqual(200);
    expect(Math.sign(p('ecgII', WIDE_VEC.T))).toBe(-Math.sign(p('ecgII', WIDE_VEC.R)));
    const ratio = p('ecgII', WIDE_VEC.R) / p('ecgII', VEC.R);
    expect(ratio).toBeGreaterThanOrEqual(1.5);
    expect(ratio).toBeLessThanOrEqual(2);
  });

  it('kernel QT equals the requested QT', () => {
    expect(kernelQtMs(narrowKernels(317))).toBeCloseTo(317, 9);
  });
});
