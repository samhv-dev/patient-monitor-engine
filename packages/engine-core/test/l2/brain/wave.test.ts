import { describe, expect, it } from 'vitest';
import { elastance } from '../../../src/l2/brain/mechanics.ts';
import { icpSample, p2p1 } from '../../../src/l2/brain/wave.ts';

function beat(icp: number, pvi: number) {
  const e = elastance(icp, pvi);
  let mx = -1e9;
  let mn = 1e9;
  let sum = 0;
  const v: number[] = [];
  for (let k = 0; k < 100; k++) {
    const x = icpSample(icp, e, 40, k / 125, 0.8, 0.5);
    v.push(x);
    mx = Math.max(mx, x);
    mn = Math.min(mn, x);
    sum += x;
  }
  return { amp: mx - mn, mean: sum / 100, p1: (v[19] as number) - mn, p2: (v[34] as number) - mn };
}

describe('ICP waveform (tables §5.1, Q39)', () => {
  it('pulse amplitude ≈ 0.1·ICP + 0.5 when compliant and rises steeply with elastance; the mean is the ICP', () => {
    const a = beat(10, 25);
    expect(a.amp).toBeCloseTo(1.5, 0);
    expect(a.mean).toBeCloseTo(10, 6);
    expect(beat(40, 20).amp).toBeGreaterThan(6);
  });
  it('P2/P1: 0.8 compliant, 1.0 at ICP 20/PVI 25, > 1 (P2 > P1) from ICP 20/PVI 20, 1.3–1.5 exhausted', () => {
    const r = (icp: number, pvi: number) => {
      const b = beat(icp, pvi);
      return b.p2 / b.p1;
    };
    expect(r(10, 25)).toBeCloseTo(0.8, 1);
    expect(r(20, 25)).toBeCloseTo(1.0, 1);
    expect(r(20, 20)).toBeGreaterThan(1);
    expect(r(40, 20)).toBeGreaterThan(1.3);
    expect(p2p1(10)).toBe(1.4);
  });
});
