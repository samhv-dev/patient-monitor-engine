import { describe, expect, it } from 'vitest';
import { compareWave, CASES, generate } from '../../src/regression/baseline.ts';
import { hashRun } from '../../src/regression/determinism.ts';

describe('2 % per-sample waveform regression (R40, decision 9)', () => {
  const base = [0, 0.5, 1, 0.5, 0, -0.2];
  it('identical → green; a 1.5 % change → green; a 3 % change on one sample of six → red', () => {
    expect(compareWave('c', 'x', base, base).grade).toBe('green');
    expect(compareWave('c', 'x', base, base.map((v) => v * 1.015)).grade).toBe('green');
    expect(compareWave('c', 'x', base, [0, 0.5, 1.03, 0.5, 0, -0.2])).toMatchObject({ failed: 1, grade: 'red' });
  });
  it('near-zero samples use the 5 %-of-peak-to-peak floor', () => {
    expect(compareWave('c', 'x', base, [0.001, 0.5, 1, 0.5, 0.001, -0.2]).failed).toBe(0);
  });
  it('a regenerated case equals itself', { timeout: 30_000 }, async () => {
    const c = CASES[0]!;
    const a = await generate(c);
    const b = await generate(c);
    for (const ch of c.channels) expect(compareWave(c.id, ch, a[ch]!, b[ch]!).grade).toBe('green');
  });
});

describe('V9 determinism', () => {
  it('same rhythm and seed → same hash; another seed → another hash', { timeout: 30_000 }, async () => {
    const a = await hashRun('sinus', 7, 10);
    expect(await hashRun('sinus', 7, 10)).toBe(a);
    expect(await hashRun('sinus', 8, 10)).not.toBe(a);
  });
});
