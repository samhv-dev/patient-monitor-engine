import { describe, expect, it } from 'vitest';
import { beatKernels, beatQrsMs, fiducialOf, rotateZ, type BeatTemplateId } from '../../../../src/l2/ecg/beat-templates.ts';
import { K_STRIDE, WAVE, qrsSpanMs } from '../../../../src/l2/ecg/kernels.ts';
import { projectLead } from '../../../../src/l2/ecg/vcg.ts';

const rVec = (id: BeatTemplateId) => {
  const k = beatKernels(id, 400);
  const i = k.findIndex((_, j) => j % K_STRIDE === 6 && k[j] === WAVE.R) - 6;
  return [k[i + 3]!, k[i + 4]!, k[i + 5]!] as const;
};

describe('Stage 5 beat templates', () => {
  it('QRS widths: wpw 110–130, aberrant 125–145, pacedV 140–180, pvc2/pvc3 120–200, agonal ≥ 200 ms', () => {
    expect(beatQrsMs('wpw')).toBeGreaterThanOrEqual(110);
    expect(beatQrsMs('wpw')).toBeLessThanOrEqual(130);
    expect(beatQrsMs('aberrant')).toBeGreaterThanOrEqual(125);
    expect(beatQrsMs('aberrant')).toBeLessThanOrEqual(145);
    expect(beatQrsMs('pacedV')).toBeGreaterThanOrEqual(140);
    expect(beatQrsMs('pacedV')).toBeLessThanOrEqual(180);
    for (const id of ['pvc2', 'pvc3'] as const) {
      expect(beatQrsMs(id)).toBeGreaterThanOrEqual(120);
      expect(beatQrsMs(id)).toBeLessThanOrEqual(200);
    }
    expect(beatQrsMs('agonal')).toBeGreaterThanOrEqual(200);
    expect(beatQrsMs('wpw', 0.4)).toBeLessThan(beatQrsMs('wpw', 1.8));
    expect(qrsSpanMs(beatKernels('narrow', 400))).toBe(beatQrsMs('narrow'));
  });

  it('paced QRS has a superior axis (negative in II, positive in I, QS in V1); PVC foci point different ways', () => {
    const p = rVec('pacedV');
    expect(projectLead('ecgII', ...p)).toBeLessThan(-0.5);
    expect(projectLead('ecgI', ...p)).toBeGreaterThan(0.5);
    expect(projectLead('V1', ...p)).toBeLessThan(-0.5);
    expect(projectLead('V1', ...rVec('pvc2'))).toBeGreaterThan(0.5);
    expect(projectLead('ecgII', ...rVec('pvc3'))).toBeLessThan(-0.5);
    expect(projectLead('ecgII', ...rVec('wide'))).toBeGreaterThan(0.5);
  });

  it('fiducialOf is the τ of the largest R; rotateZ keeps vector norms', () => {
    expect(fiducialOf(beatKernels('narrow', 400))).toBeCloseTo(0.04, 9);
    expect(fiducialOf(beatKernels('wpw', 400))).toBeCloseTo(0.075, 9);
    const k = beatKernels('wide', 400);
    const n0 = Math.hypot(k[3]!, k[4]!, k[5]!);
    rotateZ(k, 1.1);
    expect(Math.hypot(k[3]!, k[4]!, k[5]!)).toBeCloseTo(n0, 12);
  });
});
