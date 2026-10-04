// FU-9 Task B1 (F10): hypokalaemia potentiates the non-depolarisers through 7c's plasma K.
import { describe, expect, it } from 'vitest';
import { HYPOK_FLOOR, hypokalaemiaMult } from '../../../src/l2/neuro/interactions.ts';

describe('FU-9 F10: hypokalaemic potentiation of non-depolarising block (Miller 10e ch. 27)', () => {
  it('EC50 × 1 at K ≥ 3.5 and without 7c; × 0.85 at 2.5; floored', () => {
    expect(hypokalaemiaMult(undefined)).toBe(1);
    expect(hypokalaemiaMult(4.2)).toBe(1);
    expect(hypokalaemiaMult(3.5)).toBe(1);
    expect(hypokalaemiaMult(2.5)).toBeCloseTo(0.85, 9);
    expect(hypokalaemiaMult(0.5)).toBe(HYPOK_FLOOR);
  });
});
