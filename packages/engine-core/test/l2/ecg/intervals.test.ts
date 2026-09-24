import { describe, expect, it } from 'vitest';
import { lvetMs, prMs, qtFridericiaMs } from '../../../src/l2/ecg/intervals.ts';

describe('l2/ecg/intervals', () => {
  it('Fridericia QT matches the brief §4.1 table at 40–200 bpm (±1 ms)', () => {
    const table: Array<[number, number]> = [[40, 458], [60, 400], [80, 363], [100, 337], [120, 317], [150, 295], [180, 277], [200, 268]];
    for (const [hr, qt] of table) expect(Math.abs(qtFridericiaMs(60 / hr) - qt)).toBeLessThanOrEqual(1);
  });

  it('PR rule: PR60 = 160 ms (ruling R16) at ≤60 bpm, −0.4 ms/bpm above, floor 110 ms', () => {
    expect(prMs(50)).toBe(160);
    expect(prMs(60)).toBe(160);
    expect(prMs(150)).toBeCloseTo(124, 9);
    expect(prMs(300)).toBe(110);
    expect(prMs(100, 190)).toBeCloseTo(174, 9);
  });

  it('Weissler LVET (men)', () => {
    expect(lvetMs(60)).toBeCloseTo(311, 9);
  });
});
