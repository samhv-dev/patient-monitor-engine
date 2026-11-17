// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { faceNum } from './face.ts';

describe('faceNum: a device number in plain notation', () => {
  it('never writes an exponent, however small the number', () => {
    expect(faceNum(3.9e-12)).toBe('0.0000000000039');
    expect(faceNum(-2e-9)).toBe('-0.000000002');
    expect(faceNum(1e-7)).not.toMatch(/e/);
  });
  it('keeps its digits at the edges: two significant below 1, three to 100, whole above; no trailing zero', () => {
    expect([0, -0, 0.5, 0.123, 0.999, 1, 1.25, 9.999, 10, 12.34, 99.99, 100, 1234.6].map(faceNum)).toEqual(['0', '0', '0.5', '0.12', '1', '1', '1.25', '10', '10', '12.3', '100', '100', '1235']);
    expect(faceNum(Number.NaN)).toBe('—');
  });
});
