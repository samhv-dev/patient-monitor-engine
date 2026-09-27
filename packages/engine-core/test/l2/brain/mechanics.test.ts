import { describe, expect, it } from 'vitest';
import { csfDisplacementRate, elastance, icpOfVolume, volumeOfIcp } from '../../../src/l2/brain/mechanics.ts';

describe('Monro–Kellie mechanics (tables §5.1)', () => {
  it('PVI: +PVI mL multiplies ICP by 10; +1 mL at ICP 10/PVI 25 raises ICP by 9.6 %', () => {
    expect(icpOfVolume(25, 10, 25)).toBeCloseTo(100, 6);
    expect(icpOfVolume(1, 10, 25)).toBeCloseTo(10.965, 3);
    expect(volumeOfIcp(icpOfVolume(7.3, 12, 20), 12, 20)).toBeCloseTo(7.3, 9);
  });
  it('elastance = 2.303·ICP/PVI (0.92 mmHg/mL at 10/25; 4.6 at 40/20)', () => {
    expect(elastance(10, 25)).toBeCloseTo(0.921, 3);
    expect(elastance(40, 20)).toBeCloseTo(4.605, 3);
  });
  it('CSF: no net flow at ICP0, absorption rises with ICP and fades as the reserve is used; refill ≤ production', () => {
    expect(csfDisplacementRate(10, 0, 10, 10)).toBe(0);
    expect(csfDisplacementRate(20, 0, 10, 10)).toBeCloseTo(1, 9);
    expect(csfDisplacementRate(20, 15, 10, 10, 30)).toBeCloseTo(0.75, 9);
    expect(csfDisplacementRate(20, 30, 10, 10, 30)).toBe(0);
    expect(csfDisplacementRate(2, 5, 10, 10)).toBeCloseTo(-0.35, 9);
    expect(csfDisplacementRate(2, 0, 10, 10)).toBe(0);
  });
});
