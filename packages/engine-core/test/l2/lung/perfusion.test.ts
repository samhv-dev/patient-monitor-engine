import { describe, expect, it } from 'vitest';
import { createHpv, hpvStimulus, perfusion, stepHpv } from '../../../src/l2/lung/perfusion.ts';
import { healthyParams } from '../../../src/l2/lung/side.ts';

describe('per-lung perfusion and HPV (tables §4.2, catalogue §22, Q35)', () => {
  it('healthy: flow follows the 45/55 split, no shunt', () => {
    const p = perfusion(healthyParams(70).side, [0, 0], [100, 100], createHpv(), 0);
    expect(p.f[0]).toBeCloseTo(0.45, 9);
    expect(p.shunt).toEqual([0, 0]);
  });
  it('a collapsed lung: flow halves once HPV is fully active (τ 5 min), PVR doubles', () => {
    const sp = healthyParams(70).side;
    const st = createHpv();
    const p0 = perfusion(sp, [0.98, 0], [40, 100], st, 0);
    for (let t = 0; t < 1800; t += 0.1) stepHpv(st, p0.hypoxic, 0.1);
    const p1 = perfusion(sp, [0.98, 0], [40, 100], st, 0);
    expect(p0.f[0]).toBeCloseTo(0.45, 2);
    expect(p1.f[0]).toBeGreaterThan(0.26);
    expect(p1.f[0]).toBeLessThan(0.32);
    expect(p1.pvrMult[0]).toBeCloseTo(2, 1);
  });
  it('1 MAC of volatile inhibits HPV by 20 %; the stimulus starts below PAO2 100', () => {
    const sp = healthyParams(70).side;
    const st = { a1: [1, 0], a2: [0, 0], stimS: [600, 0] };
    const tiva = perfusion(sp, [0.98, 0], [40, 100], st, 0);
    const vol = perfusion(sp, [0.98, 0], [40, 100], st, 1);
    expect(vol.f[0]).toBeGreaterThan(tiva.f[0] as number);
    expect(hpvStimulus(120)).toBe(0);
    expect(hpvStimulus(40)).toBe(1);
  });
});
