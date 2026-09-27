import { describe, expect, it } from 'vitest';
import { hillBlock, NMB_PD, phase2Fraction, siteBlock, tofFrom } from '../../../src/l2/neuro/nmb.ts';

const ONE = { rocuronium: 1, vecuronium: 1, cisatracurium: 1, succinylcholine: 1 };
const Z = { rocuronium: 0, vecuronium: 0, cisatracurium: 0, succinylcholine: 0 };
describe('NMB PD (tables §5d)', () => {
  it('Hill block: 50 % at EC50, steep with γ 4.8', () => {
    expect(hillBlock(823, 823, 4.8)).toBeCloseTo(0.5, 9);
    expect(hillBlock(2 * 823, 823, 4.8)).toBeGreaterThan(0.96);
    expect(hillBlock(0, 823, 4.8)).toBe(0);
  });
  it('TOF count thresholds: T1 > 3 / 10 / 20 / 25 % → 1 / 2 / 3 / 4 twitches', () => {
    expect([0.02, 0.05, 0.15, 0.22, 0.3].map((t1) => tofFrom(1 - t1, 1, 0).count)).toEqual([0, 1, 2, 3, 4]);
  });
  it('fade: TOFR = T1^2.5 for a non-depolariser (0.9 at T1 0.959), none for succinylcholine phase I, back in phase II', () => {
    expect(tofFrom(1 - 0.959, 1, 0).ratio).toBeCloseTo(0.9, 2);
    expect(tofFrom(1 - 0.5, 0, 0).ratio).toBe(1);
    expect(tofFrom(1 - 0.5, 0, 1).ratio).toBeCloseTo(0.5 ** 2.5, 9);
    expect(phase2Fraction(2)).toBe(0);
    expect(phase2Fraction(5)).toBeCloseTo(0.5, 9);
  });
  it('PTC appears only at TOF count 0 once B < 0.99 (tables §5d); twitch heights fall T1 → T4', () => {
    expect(tofFrom(1 - 0.005, 1, 0).ptc).toBe(0);
    expect(tofFrom(1 - 0.011, 1, 0).ptc).toBeGreaterThanOrEqual(1);
    expect(tofFrom(1 - 0.02, 1, 0).ptc).toBeGreaterThan(5);
    const r = tofFrom(1 - 0.6, 1, 0);
    expect(r.twitches[0]).toBeGreaterThan(r.twitches[3]);
  });
  it('rocuronium and vecuronium add as equipotent fractions; the diaphragm needs ~1.7× the concentration', () => {
    const half = siteBlock({ ...Z, rocuronium: NMB_PD.rocuronium.ec50Thumb / 2, vecuronium: NMB_PD.vecuronium.ec50Thumb / 2 }, 'thumb', ONE);
    expect(half.b).toBeCloseTo(0.5, 6);
    expect(siteBlock({ ...Z, rocuronium: 1000 }, 'dia', ONE).b).toBeLessThan(siteBlock({ ...Z, rocuronium: 1000 }, 'thumb', ONE).b);
  });
});
