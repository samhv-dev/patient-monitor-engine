// FU-9 Task A7 (F9): the chemoreflex set point rises in metabolic alkalosis (0.7 mmHg per mmol/L HCO3, cap 55).
import { describe, expect, it } from 'vitest';
import { ALK_DEADBAND, ALK_PACO2_MAX, paco2SetPoint } from '../../../src/l2/neuro/spont.ts';

describe('FU-9 F9: respiratory compensation of metabolic alkalosis (Javaheri & Kazemi 1987)', () => {
  it('HCO3 34 → set point +6.65; resting HCO3 (24.40045 at t = 0) → exactly unchanged; acidosis still Winter; capped at 55', () => {
    expect(paco2SetPoint(40, 34)).toBeCloseTo(40 + 0.7 * (34 - 24.4 - ALK_DEADBAND), 9);
    expect(paco2SetPoint(40, 24.40045)).toBe(40);
    expect(paco2SetPoint(40, 24.4 + ALK_DEADBAND)).toBe(40);
    expect(paco2SetPoint(40, 15)).toBeCloseTo(30.5, 9);
    expect(paco2SetPoint(40, 60)).toBe(ALK_PACO2_MAX);
  });
  it('a chronic hypercapnic set point (45) with its compensated HCO3 (24.4 + 0.35·5) is not read as alkalosis', () => {
    expect(paco2SetPoint(45, 24.4 + 0.35 * 5)).toBe(45);
  });
});
