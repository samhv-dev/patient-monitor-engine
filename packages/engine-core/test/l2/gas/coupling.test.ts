// Ventilation → haemodynamics coupling in MANUAL (brief §4.9; research 03 §8.7) and the CO read from Stage 2.
import { describe, expect, it } from 'vitest';
import { applyPawCoupling, cardiacOutput, venousGradient } from '../../../src/l2/gas/coupling.ts';
import { createL1State, l1Value } from '../../../src/l1/state.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';

describe('coupling', () => {
  it('mean Paw ≤ 10 cmH2O leaves the targets alone; 18 cmH2O raises CVP by 0.4 × 0.7356 × 8 and lowers SBP/DBP/volume', () => {
    const l1 = createL1State();
    expect(applyPawCoupling(l1, 8, 0)).toBe(1);
    expect(l1Value(l1, 'cvp', 0)).toBe(6);
    const f = applyPawCoupling(l1, 18, 0);
    const dRap = 0.4 * 0.7356 * 8;
    expect(l1Value(l1, 'cvp', 0)).toBeCloseTo(6 + dRap, 9);
    expect(f).toBeCloseTo(1 - dRap / venousGradient(1), 9);
    expect(l1Value(l1, 'sbp', 0)).toBeCloseTo(6 + dRap + (120 - 6 - dRap) * f, 9);
    expect(l1Value(l1, 'volumeStatus', 0)).toBeCloseTo(f, 9);
    applyPawCoupling(l1, 5, 1);
    expect(l1Value(l1, 'sbp', 1)).toBe(120);
  });
  it('hypovolaemia makes the same PEEP cost more output (venous gradient 15 → 4 mmHg)', () => {
    expect(venousGradient(1)).toBe(15);
    expect(venousGradient(0)).toBe(4);
  });
  // Stage 7a: CO is read from the circulation (compressions eject through it), no longer a CPR formula
  it('cardiac output: 0 when the circulation has not ejected for 3 s, else its forward flow', () => {
    const hs = createHemoState(undefined, createL1State(), 75);
    hs.circ.t = 10;
    hs.circ.lastEjT = 0;
    expect(cardiacOutput(hs, 10)).toBe(0);
    hs.circ.lastEjT = 9;
    expect(cardiacOutput(hs, 10)).toBeCloseTo(hs.circ.qFwd * 0.06, 9);
  });
});
