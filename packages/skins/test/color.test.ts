import { describe, expect, it } from 'vitest';
import { contrastRatio, darkenToContrast, luminance, parseHex, toHex } from '../src/color.ts';

describe('colour helpers', () => {
  it('parse and print #RRGGBB', () => {
    expect(parseHex('#00F0a0')).toEqual([0, 240, 160]);
    expect(toHex([0, 240, 160])).toBe('#00F0A0');
    expect(() => parseHex('#0f0')).toThrow();
  });
  it('WCAG luminance and contrast: black/white 21, same colour 1, #777 on white ≈ 4.48', () => {
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 9);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 9);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
  it('darkenToContrast keeps the hue, just reaches the ratio, and leaves passing colours alone', () => {
    const d = darkenToContrast('#00FFFF', '#FFFFFF', 4.5);
    expect(contrastRatio(d, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(d, '#FFFFFF')).toBeLessThan(4.7);
    const [r, g, b] = parseHex(d);
    expect(r).toBe(0);
    expect(g).toBe(b);
    expect(darkenToContrast('#000080', '#FFFFFF', 4.5)).toBe('#000080');
  });
});
