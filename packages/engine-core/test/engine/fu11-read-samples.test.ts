// FU-11 Task J6 (external review F20, R50 M8): a sample index is a whole number. A fractional `fromIndex` (time × 62.5 Hz)
// used to read past the ring's slots and return NaN — the root of F20's always-equal test. It now reads from the sample
// at or before that index; a non-finite index reads nothing.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

describe('FU-11 J6: readSamples takes whole sample indices (F20, R50 M8)', () => {
  it('a fractional index reads from the sample before it; NaN or Infinity reads nothing', () => {
    const e = createEngine({ seed: 3, patient: { sensors: { co2: 'on' } } });
    e.advanceTo(10);
    const at = new Float32Array(50);
    const frac = new Float32Array(50);
    expect(e.readSamples('co2', 100, at)).toBe(50);
    expect(e.readSamples('co2', 100.5, frac)).toBe(50);
    expect(Array.from(frac).every(Number.isFinite)).toBe(true);
    expect(Array.from(frac)).toEqual(Array.from(at));
    expect(e.readSamples('co2', Number.NaN, frac)).toBe(0);
    expect(e.readSamples('co2', Number.POSITIVE_INFINITY, frac)).toBe(0);
  });
});
