// FU-11 Task J1 (external review F02): validation cannot certify an invalid result as green.
import { describe, expect, it } from 'vitest';
import { compareWave } from '../../src/regression/baseline.ts';

describe('FU-11 J1: compareWave grades invalid samples red (F02)', () => {
  const base = [1, 2, 3, 4];
  it.each([
    ['all NaN', [Number.NaN, Number.NaN, Number.NaN, Number.NaN]],
    ['one NaN in the middle', [1, Number.NaN, 3, 4]],
    ['a last Infinity', [1, 2, 3, Infinity]],
    ['empty', []],
  ])('%s → red', (_n, now) => expect(compareWave('c', 'ecg', base, now).grade).toBe('red'));
  it('a non-finite or empty baseline is red; equal finite waves stay green', () => {
    expect(compareWave('c', 'ecg', [Number.NaN, 1], [1, 1]).grade).toBe('red');
    expect(compareWave('c', 'ecg', [], []).grade).toBe('red');
    expect(compareWave('c', 'ecg', base, [1, 2, 3, 4]).grade).toBe('green');
  });
});
