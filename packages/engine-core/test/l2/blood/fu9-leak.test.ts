// FU-9 Task A4 (F4): the capillary leak 7e writes also lowers the protein reflection coefficient (two-pore theory).
import { describe, expect, it } from 'vitest';
import { leakSigma, SIGMA_LEAK_FLOOR } from '../../../src/l2/blood/fluids.ts';
import { SIGMA_PROTEIN } from '../../../src/l2/blood/params.ts';
import { writeBlood } from '../../../src/l2/endo/adapters.ts';
import { createEndoState } from '../../../src/l2/endo/pipeline.ts';
import { lungWaterStep } from '../../../src/l2/blood/circ-adapter.ts';

describe('FU-9 F4: septic leak → σ → lung water (Rippe & Haraldsson 1994; Sakka 2002)', () => {
  it('leakSigma: 0.9 at kfMult 1, 0.74 at 2.6, 0.7 at 3, floor 0.3', () => {
    expect(leakSigma(1)).toBeCloseTo(SIGMA_PROTEIN, 9);
    expect(leakSigma(2.6)).toBeCloseTo(0.74, 9);
    expect(leakSigma(3)).toBeCloseTo(0.7, 9);
    expect(leakSigma(10)).toBe(SIGMA_LEAK_FLOOR);
  });
  it('7e writes σ with kfMult, only when kfMult changes', () => {
    const es = createEndoState(undefined, 70);
    const ps = { blood: { core: { fl: { kfMult: 1, sigma: SIGMA_PROTEIN } } as Record<string, unknown> } };
    es.core.out = { ...es.core.out, kfMult: 3 };
    writeBlood(ps, es);
    expect((ps.blood.core.fl as { sigma: number }).sigma).toBeCloseTo(0.7, 9);
  });
  it('at PAWP 16 and COP 22 a normal lung makes no water (threshold 20); the septic σ (kfMult 3: threshold 15.1) does', () => {
    let n = 0;
    let s = 0;
    for (let k = 0; k < 36000; k++) {
      n = lungWaterStep(n, 16, 22, 1, 1, 0.1);
      s = lungWaterStep(s, 16, 22, 3, leakSigma(3) / SIGMA_PROTEIN, 0.1);
    }
    expect(n).toBe(0);
    expect(s).toBeGreaterThan(0);
  });
});
