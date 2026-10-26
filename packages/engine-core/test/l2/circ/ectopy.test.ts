// E133: the ventricular-ectopy hazard — 0 at rest (no draw), rising with each input from its sourced threshold, the
// catecholamine multiplier, and what a draw produces (single, couplet, non-sustained run).
import { describe, expect, it } from 'vitest';
import { K_HAZARD, T_HAZARD, T_HOT, K_ISCH_ARREST } from '../../../src/l2/circ/arrest.ts';
import { CAT_ALONE, ectopyDrive, ectopyRate, ectopyStep, K_ECT, LAMBDA_1, LAMBDA_MAX, PH_ECT, PH_FULL, RUN_MAX, T_ECT_COLD, T_ECT_HOT, type EctopyInputs } from '../../../src/l2/circ/ectopy.ts';
import { G_ISCH, ST_DEFICIT_MIN } from '../../../src/l2/circ/coronary.ts';

const REST: EctopyInputs = { kEcg: 4.2, tempC: 37, cat: 0, ph: 7.4, kIsch: 1 };
const at = (x: Partial<EctopyInputs>): EctopyInputs => ({ ...REST, ...x });
const counter = (x = 0.5) => {
  const d = { n: 0, u: () => { d.n++; return x; } };
  return d;
};

describe('the ectopy hazard', () => {
  it('is 0 in a healthy resting patient and below every threshold — and takes no draw', () => {
    for (const r of [REST, at({ kEcg: K_ECT }), at({ tempC: T_ECT_HOT }), at({ tempC: T_ECT_COLD }), at({ ph: PH_ECT }), at({ kIsch: 1 - G_ISCH * ST_DEFICIT_MIN + 1e-9 }), at({ cat: CAT_ALONE })]) {
      expect(ectopyRate(r)).toBe(0);
      const d = counter(0);
      for (let i = 0; i < 600; i++) expect(ectopyStep(r, d.u, 1)).toBe(0);
      expect(d.n).toBe(0);
    }
  });
  it('rises with each input from its threshold and reaches drive 1 at the arrest model\'s own threshold', () => {
    const cases: [keyof EctopyInputs, number[], number][] = [
      ['kEcg', [6.8, 7.5, 8.0], K_HAZARD],
      ['tempC', [40.5, 41, 41.5], T_HOT],
      ['tempC', [31, 30, 29], T_HAZARD],
      ['ph', [7.15, 7.1, 7.05], PH_FULL],
      ['kIsch', [0.8, 0.6, 0.4], K_ISCH_ARREST],
    ];
    for (const [k, xs, full] of cases) {
      const rates = xs.map((x) => ectopyRate(at({ [k]: x })));
      expect(rates[0]).toBeGreaterThan(0);
      for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeGreaterThan(rates[i - 1] as number);
      expect(ectopyDrive(at({ [k]: full })).drive).toBeCloseTo(1, 6);
      expect(ectopyRate(at({ [k]: full }))).toBeCloseTo(LAMBDA_1, 6);
    }
  });
  it('catecholamines multiply the substrate and act alone only above CAT_ALONE', () => {
    const sub = at({ ph: 7.1 });
    expect(ectopyRate({ ...sub, cat: 0.5 })).toBeCloseTo(1.5 * ectopyRate(sub), 6);
    expect(ectopyRate(at({ cat: 0.9 }))).toBe(0); // the largest endogenous surge the model makes (MH to its arrest ≈ 0.87)
    expect(ectopyRate(at({ cat: 1.5 }))).toBeGreaterThan(0);
    expect(ectopyRate(at({ kEcg: 9, tempC: 43, ph: 6.8, kIsch: 0.1, cat: 3 }))).toBe(LAMBDA_MAX);
  });
  it('a draw gives a single PVC, a couplet or a non-sustained run (3–30), more complex as the drive rises', () => {
    const r = at({ ph: 7.0, tempC: 42 }); // drive 2
    expect(ectopyStep(r, counter(0.999).u, 1)).toBe(0); // no event this second
    const seq = (xs: number[]) => {
      let i = 0;
      return () => xs[i++] as number;
    };
    expect(ectopyStep(r, seq([0, 0.99]), 1)).toBe(1);
    expect(ectopyStep(r, seq([0, 0.2]), 1)).toBe(2);
    expect(ectopyStep(r, seq([0, 0.01, 0]), 1)).toBe(3);
    expect(ectopyStep(r, seq([0, 0.01, 0.999999999]), 1)).toBe(RUN_MAX);
    // the run share at drive 0.25 is a quarter of drive 2's (capped there)
    const lo = at({ ph: PH_ECT - 0.05 });
    expect(ectopyStep(lo, seq([0, 0.05, 0]), 1)).toBe(2);
  });
  it('the event rate matches λ over a long seeded run (Poisson thinning at 1 Hz)', () => {
    const r = at({ ph: 7.1 }); // drive 0.5 → 3 events/min
    let s = 7;
    const u = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    let ev = 0;
    for (let i = 0; i < 6000; i++) if (ectopyStep(r, u, 1) > 0) ev++;
    expect(ev / 100).toBeGreaterThan(2.6);
    expect(ev / 100).toBeLessThan(3.4);
  });
});
