import { describe, expect, it } from 'vitest';
import { capnoAngles } from '../../src/metrics/capno.ts';

/** Trapezoid capnogram at `fs`: 0 baseline, phase II at sII mmHg/s to 36, phase III rising sIII mmHg/s for 2 s, drop. */
function trapezoid(fs: number, sII: number, sIII: number, breaths = 5, hold = 1): Float64Array {
  const x: number[] = [];
  for (let b = 0; b < breaths; b++) {
    for (let i = 0; i < 2 * fs; i++) x.push(0);
    for (let v = 0; v < 36; v += sII / fs) x.push(v);
    for (let i = 0; i < 2 * fs; i++) x.push(36 + (sIII * i) / fs);
  }
  for (let i = 0; i < 2 * fs; i++) x.push(0);
  // sample-and-hold every `hold` samples (hold 1 = smooth)
  return Float64Array.from(x, (_, i) => x[i - (i % hold)] as number);
}

const expected = (sII: number, sIII: number) => 180 - (Math.atan(sII / 25) * 180) / Math.PI + (Math.atan(sIII / 25) * 180) / Math.PI;

describe('capnogram α (R39 item 6: one convention for recorded and generated)', () => {
  it('recovers α of a synthetic trapezoid within 1°', () => {
    const a = capnoAngles(trapezoid(62.5, 90, 1));
    expect(a.length).toBe(5);
    for (const b of a) expect(b.alpha).toBeCloseTo(expected(90, 1), 0);
  });

  it('measures sample-and-hold recorders (VitalDB Primus ≈ 25 Hz inside 62.5 Hz) within 3° of the smooth trace', () => {
    const smooth = capnoAngles(trapezoid(62.5, 60, 1.5));
    const held = capnoAngles(trapezoid(62.5, 60, 1.5, 5, 3));
    expect(held.length).toBe(smooth.length);
    for (let i = 0; i < held.length; i++) expect(Math.abs(held[i]!.alpha - smooth[i]!.alpha)).toBeLessThan(3);
  });

  it('works at 360 Hz (MGH/MF)', () => {
    const a = capnoAngles(trapezoid(360, 90, 1), 360);
    expect(a.length).toBe(5);
    expect(a[2]!.alpha).toBeCloseTo(expected(90, 1), 0);
  });
});
