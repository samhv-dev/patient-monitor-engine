import { describe, expect, it } from 'vitest';
import { resolveLung, reversibleShare, SMOOTH_MUSCLE } from '../../../src/l2/lung/conditions.ts';

const R = (id: string, s: number, bd = 0, exempt: string[] = []) => resolveLung([{ id: id as never, severity: s }], 70, 1, 0, bd, exempt).lp;
const rL = (lp: ReturnType<typeof R>) => lp.side.map((x) => x.rLung);
const near = (a: number[], b: number[]) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i] as number, 9));

describe('FU-6 R2: one airway-smooth-muscle state (D1)', () => {
  it('bronchospasm: B relaxes every effect to severity s·(1 − 0.85·B)', () => {
    expect(SMOOTH_MUSCLE.bronchospasm?.frac).toBe(0.85);
    near(rL(R('bronchospasm', 1, 1)), rL(R('bronchospasm', 0.15)));
    expect(R('bronchospasm', 1, 1).side[0]?.vdAlv).toBeCloseTo(R('bronchospasm', 0.15).side[0]?.vdAlv as number, 12);
    expect(rL(R('bronchospasm', 1, 0.5))[0]).toBeLessThan(rL(R('bronchospasm', 1))[0] as number);
  });
  it('asthma: only the reversible (airway) keys relax; COPD: only raw, by 20 %', () => {
    const a1 = R('asthma', 1, 1);
    const a3 = R('asthma', 0.3);
    near(rL(a1), rL(a3));
    expect(a1.ccw).toBe(R('asthma', 1).ccw); // chest wall / non-airway keys keep the full severity
    const c = R('copd', 1, 1);
    near(rL(c), rL(R('copd', 0.8))); // raw at 1 − 0.2·B
    expect(c.side[0]?.vdAlv).toBe(R('copd', 1).side[0]?.vdAlv); // emphysema's dead space does not reverse
    expect(rL(c)[0]).toBeLessThan(rL(R('copd', 1))[0] as number);
  });
  it('an exempt condition (7e owns its relief) and a non-smooth-muscle condition ignore B', () => {
    expect(rL(R('anaphylaxis', 1, 1, ['anaphylaxis']))).toEqual(rL(R('anaphylaxis', 1)));
    expect(R('ards', 0.67, 1)).toEqual(R('ards', 0.67));
  });
  it('F6: the reversible share falls with severity (near-fatal 1.25) and with the attack’s age (status asthmaticus)', () => {
    expect(reversibleShare(0.85, 1, 0)).toBe(0.85); // a fresh severe spasm: the full share
    expect(reversibleShare(0.85, 1, 15)).toBeGreaterThanOrEqual(0.95 * 0.85); // every fresh arm of this plan (0.963)
    expect(reversibleShare(0.85, 1.25, 0)).toBeCloseTo(0.85 * 0.4, 12); // near-fatal: oedema and plugging
    expect(reversibleShare(0.7, 1, 720)).toBeLessThanOrEqual(0.35 * 0.7); // a 12 h slow-onset attack
    const aged = resolveLung([{ id: 'asthma', severity: 1 }], 70, 1, 0, 1, [], { asthma: 720 }).lp;
    expect(rL(aged)[0]).toBeGreaterThan(rL(R('asthma', 1, 1))[0] as number); // less relaxed than a fresh attack
  });
});
