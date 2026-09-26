import { describe, expect, it } from 'vitest';
import { createRecruit, fio2AtelFactor, nonAerated, stepRecruit, tauCollapseS } from '../../../src/l2/lung/recruit.ts';
import { healthyParams } from '../../../src/l2/lung/side.ts';

const base = { fio2: 1, faO2: [0.9, 0.9], faCo2: 0.05, peepTot: 0, pInsp: 15, ga: true, indFactor: 1, blocked: [false, false] };
const run = (st: ReturnType<typeof createRecruit>, sp = healthyParams(70).side, x = base, s = 60) => {
  for (let t = 0; t < s; t += 0.1) stepRecruit(st, sp, x, 0.1);
};

describe('atelectasis, recruitment and absorption (tables §4.1, Q34)', () => {
  it('Edmark FiO2 factor and Rothen τ', () => {
    expect(fio2AtelFactor(1)).toBe(1);
    expect(fio2AtelFactor(0.8)).toBeCloseTo(0.1, 9);
    expect(fio2AtelFactor(0.6)).toBeCloseTo(0.04, 9);
    expect(tauCollapseS(1, 0)).toBeCloseTo(300, 6);
    expect(tauCollapseS(0.4, 0)).toBeCloseTo(7200, 6);
    expect(tauCollapseS(1, 5)).toBeCloseTo(600, 6);
  });
  it('FiO2 1.0 under GA builds ≈ 6 % atelectasis within 20 min; a 40 cmH2O manoeuvre opens it in seconds', () => {
    const st = createRecruit();
    run(st, undefined, base, 1200);
    expect(st.ind[0]).toBeGreaterThan(0.05);
    run(st, undefined, { ...base, pInsp: 40 }, 10);
    expect(st.ind[0]).toBeLessThan(0.01);
  });
  it('a blocked lung collapses with τ 5 min at FiO2 1.0 (7.5 min with 5 % inert gas) and ≈ 28 min at FiO2 0.5 (catalogue §23)', () => {
    const st = createRecruit();
    run(st, undefined, { ...base, blocked: [true, false] }, 300);
    expect(st.blk[0]).toBeGreaterThan(0.4); // alveolar O2 0.9 + CO2 0.05 → inert 0.05 → τ 7.5 min
    expect(st.blk[0]).toBeLessThan(0.65);
    const st2 = createRecruit();
    run(st2, undefined, { ...base, faO2: [0.45, 0.45], blocked: [true, false] }, 300);
    expect(st2.blk[0]).toBeLessThan(0.2);
  });
  it('a recruitable condition opens with plateau pressure and closes when PEEP falls', () => {
    const sp = healthyParams(70).side.map((s) => ({ ...s, atel: 0.2, consol: 0.1, pOpen: 45, tauRecS: 20 }));
    const st = createRecruit();
    run(st, sp, { ...base, ga: false, peepTot: 5, pInsp: 17 }, 120);
    const at5 = nonAerated(st, sp)[0] as number;
    run(st, sp, { ...base, ga: false, peepTot: 15, pInsp: 28 }, 120);
    const at15 = nonAerated(st, sp)[0] as number;
    expect(at15).toBeLessThan(at5 - 0.05);
    run(st, sp, { ...base, ga: false, peepTot: 5, pInsp: 17 }, 600);
    expect(nonAerated(st, sp)[0]).toBeCloseTo(at5, 2);
  });
});
