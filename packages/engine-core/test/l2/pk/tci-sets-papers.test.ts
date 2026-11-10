// The registered TCI sets against the derived quantities their papers print beyond rule 4's parameters (pump-rack
// plan §13 T2): times to peak effect, half-lives, Vss. Each expectation quotes the paper and page; the tolerance is
// half a unit of the last printed digit, plus the 0.1 s resolution of ttpeMin where a time to peak is checked.
import { describe, expect, it } from 'vitest';
import type { PkParams } from '../../../src/l2/pk/compartment.ts';
import { ttpeMin } from '../../../src/l2/pk/models.ts';
import { tciSet } from '../../../src/l2/pk/tci-sets/index.ts';

const near = (got: number, printed: string, extra = 0) => {
  const dp = printed.split('.')[1]?.length ?? 0;
  expect(Math.abs(got - Number(printed)), `${got} against ${printed}`).toBeLessThanOrEqual(0.5 * 10 ** -dp + extra + 1e-9);
};

/** The three disposition half-lives (min), slowest first, from the eigenvalues of the 3-compartment system. */
function halfLives(p: PkParams): number[] {
  const { k10, k12, k21, k13, k31 } = p;
  const a2 = k10 + k12 + k13 + k21 + k31;
  const a1 = k10 * k21 + k10 * k31 + k21 * k31 + k21 * k13 + k31 * k12;
  const a0 = k10 * k21 * k31;
  // the trigonometric roots of λ³ − a2·λ² + a1·λ − a0 = 0 (three real roots for a mammillary model)
  const q = (a2 * a2 - 3 * a1) / 9;
  const r = (-2 * a2 ** 3 + 9 * a2 * a1 - 27 * a0) / 54;
  const th = Math.acos(r / Math.sqrt(q ** 3));
  const roots = [0, 1, 2].map((i) => -2 * Math.sqrt(q) * Math.cos((th + 2 * Math.PI * i) / 3) + a2 / 3);
  return roots.map((l) => Math.LN2 / l).sort((a, b) => b - a);
}

describe('TCI sets: the derived quantities their papers print', () => {
  it('Minto: t½ke0 and tpeak at 20, 50 and 80 yr with LBM 55 kg (Minto 1997 II, Table 1, p. 28)', () => {
    const minto = tciSet('minto')!;
    const rows: [number, string, string][] = [[20, '0.94', '1.22'], [50, '1.32', '1.57'], [80, '2.20', '2.26']];
    for (const [ageY, t12, tpeak] of rows) {
      const p = minto.params({ ageY, weightKg: 70, heightCm: 168.8, sex: 'm' }); // James LBM 54.99 kg
      near(Math.LN2 / p.ke0[0]!, t12);
      near(ttpeMin(p), tpeak, 1 / 600);
    }
  });
  it('Shafer: half-lives 0.82 and 17.2 min (Shafer 1990, Table 2, p. 1098); the terminal 465.7 against the printed 465 (rounded micro rate constants)', () => {
    const [g, b, a] = halfLives(tciSet('shafer')!.params({ ageY: 50, weightKg: 70, heightCm: 170, sex: 'm' }));
    near(a!, '0.82');
    near(b!, '17.2');
    expect(g).toBeCloseTo(465.7, 1); // printed 465
  });
  it('Gepts: Vss 339 L and t½α 3.3 min (Gepts 1995, Table 3, p. 1201); t½β and t½γ are not reproduced (rounded estimates)', () => {
    const p = tciSet('gepts')!.params({ ageY: 40, weightKg: 70, heightCm: 170, sex: 'm' });
    near(p.v1 + (p.k12 * p.v1) / p.k21 + (p.k13 * p.v1) / p.k31, '339');
    const [g, b, a] = halfLives(p);
    near(a!, '3.3');
    expect(b).toBeCloseTo(66.4, 1); // printed 67
    expect(g).toBeCloseTo(763, 0); // printed 769
  });
  it('Schnider: t½ke0 1.5 min (Schnider 1999, Table 4, p. 1510)', () => {
    near(Math.LN2 / tciSet('schnider')!.params({ ageY: 53, weightKg: 77, heightCm: 177, sex: 'm' }).ke0[0]!, '1.5');
  });
});
