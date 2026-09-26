import { describe, expect, it } from 'vitest';
import { airwayFlow, createMech, mechSubstep } from '../../../src/l2/lung/mechanics.ts';
import { healthyParams, mechParams } from '../../../src/l2/lung/side.ts';

const healthy = () => mechParams(healthyParams(70), [1, 1], [false, false]);
const total = (v: number[]) => v.reduce((a, b) => a + b, 0);

describe('four-unit mechanics (R43, tables §4.3)', () => {
  it('a homogeneous lung behaves as one RC: Paw jumps by R·Q, volume splits 45/55', () => {
    const mp = healthy();
    const ms = createMech();
    mechSubstep(mp, ms, 'flow', 1000);
    expect(ms.paw).toBeCloseTo(10, 0); // R 10 cmH2O·s/L × 1 L/s
    for (let t = 0; t < 0.49; t += 0.004) mechSubstep(mp, ms, 'flow', 1000);
    expect(total(ms.v)).toBeCloseTo(500, -1);
    expect((ms.v[0] as number) / total(ms.v)).toBeCloseTo(0.45, 2);
  });
  it('passive expiration to ZEEP empties with τ ≈ R·C ≈ 0.54 s', () => {
    const mp = healthy();
    const ms = createMech();
    for (let t = 0; t < 0.5; t += 0.004) mechSubstep(mp, ms, 'flow', 1000);
    const v0 = total(ms.v);
    let t = 0;
    while (total(ms.v) > v0 / Math.E) {
      mechSubstep(mp, ms, 'pressure', 0);
      t += 0.004;
    }
    expect(t).toBeGreaterThan(0.45);
    expect(t).toBeLessThan(0.65);
  });
  it('a closed airway conserves volume (pendelluft only) and a blocked lung takes no gas', () => {
    const mp = mechParams(healthyParams(70), [1, 1], [true, false]);
    const ms = createMech();
    for (let t = 0; t < 0.5; t += 0.004) mechSubstep(mp, ms, 'flow', 1000);
    expect(ms.v[0]).toBe(0);
    expect(ms.v[2]).toBeCloseTo(500, -1);
    const v = total(ms.v);
    for (let t = 0; t < 1; t += 0.004) mechSubstep(mp, ms, 'closed', 0);
    expect(total(ms.v)).toBeCloseTo(v, 6);
    expect(airwayFlow(ms)).toBeCloseTo(0, 6);
  });
});
