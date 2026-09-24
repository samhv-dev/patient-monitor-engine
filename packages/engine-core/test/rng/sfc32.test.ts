import { describe, expect, it } from 'vitest';
import { createRng, createRngState, normal, uniform } from '../../src/rng/sfc32.ts';

function draw(n: number, f: () => number): number[] {
  return Array.from({ length: n }, f);
}

describe('rng/sfc32', () => {
  it('reproduces every named stream from the seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (const name of ['hrv', 'ectopy', 'conduction', 'noise'] as const) {
      expect(draw(1000, () => a.stream(name).nextU32())).toEqual(draw(1000, () => b.stream(name).nextU32()));
    }
  });

  it('gives different sequences for different seeds and different stream names', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(draw(10, () => a.stream('hrv').nextU32())).not.toEqual(draw(10, () => b.stream('hrv').nextU32()));
    const c = createRng(1);
    expect(draw(10, () => c.stream('hrv').nextU32())).not.toEqual(draw(10, () => c.stream('noise').nextU32()));
  });

  it('drawing from noise does not change the hrv sequence (stream independence)', () => {
    const quiet = createRng(7);
    const noisy = createRng(7);
    const ref = draw(500, () => quiet.stream('hrv').next());
    const got: number[] = [];
    for (let i = 0; i < 500; i++) {
      for (let k = 0; k < 13; k++) noisy.stream('noise').next();
      got.push(noisy.stream('hrv').next());
    }
    expect(got).toEqual(ref);
  });

  it('uniform() is in [0,1) with mean ~0.5; normal() has mean ~0 and SD ~1', () => {
    const s = createRngState(99).measurement;
    const u = draw(100_000, () => uniform(s));
    expect(Math.min(...u)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...u)).toBeLessThan(1);
    expect(u.reduce((p, x) => p + x, 0) / u.length).toBeCloseTo(0.5, 2);
    const z = draw(100_000, () => normal(s));
    const mean = z.reduce((p, x) => p + x, 0) / z.length;
    const sd = Math.sqrt(z.reduce((p, x) => p + (x - mean) ** 2, 0) / z.length);
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(sd - 1)).toBeLessThan(0.02);
  });

  it('getState() is a plain JSON-safe copy', () => {
    const r = createRng(5);
    const st = r.getState();
    expect(JSON.parse(JSON.stringify(st))).toEqual(st);
    r.stream('hrv').next();
    expect(r.getState().hrv).not.toEqual(st.hrv);
  });
});
