import { describe, expect, it } from 'vitest';
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

  it('QRS peak-to-peak in I and III is 70% and 30% of II (ProSim ratios ±25%)', () => {
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

  it('precordial morphology: V1 is rS (small r, dominant negative), V5 is dominant positive', () => {
    expect(p('V1', VEC.Q)).toBeGreaterThan(0); // septal r
    expect(p('V1', VEC.R)).toBeLessThan(-Math.abs(p('V1', VEC.Q)));
    expect(p('V5', VEC.R)).toBeGreaterThan(Math.abs(p('V5', VEC.S)));
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
