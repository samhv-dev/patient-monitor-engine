import { describe, expect, it } from 'vitest';
import { bloodMl, copPlasma, createFluids, hbOf, stepFluids, type FluidState } from '../../../src/l2/blood/fluids.ts';
import { bloodPatient, FLUIDS, PRODUCTS } from '../../../src/l2/blood/params.ts';

const ADULT = bloodPatient({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 });
function simulate(f: FluidState, fromS: number, toS: number): void {
  for (let t = fromS; t < toS - 1e-9; t += 0.1) stepFluids(f, t, 0.1, 1);
}

describe('fluid compartments (tables §5b.4; annex B1 tissue branch)', () => {
  it('70 kg man: BV 4.8 L, plasma 2.6 L, ISF 11.4 L, ICF 28 L, Hb 15, COP ≈ 22 mmHg (Landis–Pappenheimer at TP 6.4)', () => {
    const f = createFluids(ADULT, 40);
    expect(bloodMl(f)).toBeCloseTo(4807, -1);
    expect(f.vp).toBeCloseTo(2644, -1);
    expect(f.visf).toBeCloseTo(11356, -1);
    expect(f.vicf).toBeCloseTo(28000, -1);
    expect(hbOf(f)).toBeCloseTo(15, 6);
    expect(copPlasma(f)).toBeCloseTo(22.4, 0);
  });
  it('at rest nothing moves for 24 h (no drift)', () => {
    const f = createFluids(ADULT, 40);
    simulate(f, 0, 86_400);
    expect(Math.abs(f.vp - 2644)).toBeLessThan(1);
    expect(Math.abs(f.visf - 11356)).toBeLessThan(1);
  });
  it('1 L crystalloid over 30 min, awake: 50–60 % intravascular at the end, 15–25 % 30 min later (Hahn, Q47)', () => {
    const f = createFluids(ADULT, 40);
    f.flows.push({ rate: 1000 / 30, until: 1800, comp: FLUIDS.rl });
    simulate(f, 0, 1800);
    const end = (f.vp - f.ref.vp) / 1000;
    simulate(f, 1800, 3600);
    const later = (f.vp - f.ref.vp) / 1000;
    expect(end).toBeGreaterThanOrEqual(0.48);
    expect(end).toBeLessThanOrEqual(0.6);
    expect(later).toBeGreaterThanOrEqual(0.13);
    expect(later).toBeLessThanOrEqual(0.25);
  });
  it('general anaesthesia keeps the fluid (elimination ×0.2): more retained 30 min after the end', () => {
    const run = (ga: boolean) => {
      const f = createFluids(ADULT, 40);
      f.anaesthesia = ga;
      f.flows.push({ rate: 1000 / 30, until: 1800, comp: FLUIDS.rl });
      simulate(f, 0, 3600);
      return f.vp + f.visf - f.ref.vp - f.ref.visf;
    };
    expect(run(true)).toBeGreaterThan(run(false) + 150);
  });
  it('haemorrhage removes whole blood (Hb unchanged at first), then refill 0.1–0.5 mL/kg/min dilutes Hb', () => {
    const f = createFluids(ADULT, 40);
    f.flows.push({ rate: 175, until: 600, comp: null });
    simulate(f, 0, 600);
    expect(bloodMl(f)).toBeLessThan(4807 - 1600);
    expect(hbOf(f)).toBeGreaterThan(14.4); // only the refill during the bleed dilutes
    expect(f.refill / 70).toBeGreaterThanOrEqual(0.1);
    expect(f.refill / 70).toBeLessThanOrEqual(0.5);
    simulate(f, 600, 5400);
    expect(hbOf(f)).toBeLessThan(14.0);
  });
  it('one RBC unit raises Hb by 0.7–1.2 g/dL in a 70 kg adult once the extra volume has been excreted (4 h awake; tables row)', () => {
    const f = createFluids(ADULT, 40);
    f.flows.push({ rate: PRODUCTS.rbc.ml / 10, until: 600, comp: PRODUCTS.rbc.comp });
    simulate(f, 0, 14_400);
    expect(hbOf(f) - 15).toBeGreaterThanOrEqual(0.7);
    expect(hbOf(f) - 15).toBeLessThanOrEqual(1.2);
  });
  it('hypotonic fluid swells the cells (glycine absorption)', () => {
    const f = createFluids(ADULT, 40);
    for (let t = 0; t < 1800; t += 0.1) stepFluids(f, t, 0.1, 290 / 275);
    expect(f.vicf).toBeGreaterThan(28000 + 800);
  });
});
