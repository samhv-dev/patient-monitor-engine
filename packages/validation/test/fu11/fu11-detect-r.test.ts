// FU-11 Task J2 (external review F22): validation cannot certify an invalid result as green.
import { describe, expect, it } from 'vitest';
import { detectR } from '../../src/metrics/ecg.ts';

describe('FU-11 J2: the validation R detector finds no peaks in an absent signal (F22)', () => {
  const fs = 500;
  it.each([
    ['zeros', () => 0],
    ['a constant', () => 0.7],
    ['all NaN', () => Number.NaN],
  ])('%s for 10 s → no peaks', (_n, f) => expect(detectR(Float64Array.from({ length: 10 * fs }, f), fs)).toEqual([]));
  it('a 60/min spike train still gives 10 peaks', () => {
    const x = Float64Array.from({ length: 10 * fs }, (_, i) => (i % fs < 10 ? 1.5 : 0));
    expect(detectR(x, fs).length).toBe(10);
  });
});
