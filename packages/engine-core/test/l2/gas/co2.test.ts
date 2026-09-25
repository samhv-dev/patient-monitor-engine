// CO2 kinetics (brief §4.4; BUILD-PLAN Stage 3 acceptance 4) on the model alone, 70 kg adult under GA.
import { describe, expect, it } from 'vitest';
import { createCo2State, etco2True, stepCo2, vaForPaco2 } from '../../../src/l2/gas/co2.ts';
import { GA_METABOLIC, gasPatient } from '../../../src/l2/gas/params.ts';

const pat = gasPatient({ ageY: 40, weightKg: 70, heightCm: 175 });
const vco2 = pat.vco2 * GA_METABOLIC;
const x = (va: number, coRatio = 1) => ({ vaLpm: va, vco2, coRatio, cf: pat.cf, cs: pat.cs, kfs: pat.kfs, extraGradient: 0 });
function run(paco2: number, va: number, minutes: number, coRatio = 1): number[] {
  const st = createCo2State(paco2);
  const out = [st.pf];
  for (let i = 0; i < minutes * 600; i++) {
    stepCo2(st, x(va, coRatio), 0.1);
    if ((i + 1) % 60 === 0) out.push(st.pf); // every 6 s
  }
  return out;
}

describe('two-compartment CO2 kinetics', () => {
  it('apnoea: +12 ± 3 mmHg in the first minute, then 3.4 ± 0.5 mmHg/min (PubMed 2516732)', () => {
    const p = run(40, 0, 6);
    expect(p[10]! - p[0]!).toBeGreaterThanOrEqual(9);
    expect(p[10]! - p[0]!).toBeLessThanOrEqual(15);
    const slope = (p[60]! - p[10]!) / 5;
    expect(slope).toBeGreaterThanOrEqual(2.9);
    expect(slope).toBeLessThanOrEqual(3.9);
  });

  it('a +33 % alveolar-ventilation step: 30–40 % of the change in 2–3 min, 90 % within 20–40 min', () => {
    const va0 = vaForPaco2(vco2, 40);
    const p = run(40, va0 * 1.33, 60);
    const fin = 40 / 1.33;
    const frac = (i: number) => (40 - p[i]!) / (40 - fin);
    expect(frac(20)).toBeGreaterThanOrEqual(0.3); // 2 min
    expect(frac(25)).toBeLessThanOrEqual(0.4); // 2.5 min
    const t90 = p.findIndex((_, i) => frac(i) >= 0.9) / 10;
    expect(t90).toBeGreaterThanOrEqual(20);
    expect(t90).toBeLessThanOrEqual(40);
  });

  it('halving ventilation is slower than raising it (research 03 §4.4), and settles on PaCO2 ≈ 80', () => {
    const va0 = vaForPaco2(vco2, 40);
    const up = run(40, va0 / 2, 180);
    const frac25 = (up[25]! - 40) / 40;
    expect(frac25).toBeLessThan(0.3);
    expect(up[1800]!).toBeGreaterThan(76);
  });

  it('low flow: CPR-level output (CO 29 %) holds EtCO2 at 10–20 mmHg over 1–3 min (then the tissue build-up restores it, research 03 §4.4); arrest (CO 0) < 5 mmHg within 30 s', () => {
    const st = createCo2State(40);
    const va = vaForPaco2(vco2, 40);
    for (let i = 1; i <= 1800; i++) {
      stepCo2(st, x(va, 0.29), 0.1);
      if (i % 600 === 0) {
        expect(etco2True(st, 0)).toBeGreaterThanOrEqual(10);
        expect(etco2True(st, 0)).toBeLessThanOrEqual(20);
      }
    }
    const a = createCo2State(40);
    for (let i = 0; i < 300; i++) stepCo2(a, x(va, 0), 0.1);
    expect(etco2True(a, 0)).toBeLessThan(5);
  });
});
