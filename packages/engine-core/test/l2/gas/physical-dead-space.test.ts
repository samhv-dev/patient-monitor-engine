// FU-4 (orchestrator ruling from the FU-6 review, 2026-09-28): ONE exported physical dead-space function —
// anatomical 2.2 mL/kg IBW, minus the ≈ 1.1 mL/kg IBW extrathoracic share an artificial airway bypasses (floored at 30 %
// of the anatomical value), plus the apparatus volume. Never the MANUAL fit, never alveolar dead space.
import { describe, expect, it } from 'vitest';
import { apparatusDeadSpaceMl, gasPatient, physicalDeadSpace } from '../../../src/l2/gas/params.ts';

describe('physicalDeadSpace (FU-4 / FU-6 ruling)', () => {
  it('70 kg man: 154 mL breathing through his own airway; 154 − 77 + 50 = 127 mL through an ETT (1.8 mL/kg IBW)', () => {
    const p = { deadSpaceMl: 154, ibwKg: 70, weightKg: 70 };
    expect(physicalDeadSpace(p, false)).toBeCloseTo(154, 9);
    expect(physicalDeadSpace(p, true)).toBeCloseTo(127, 9);
  });
  it('4 y child 16 kg: 35.2 → 17.6 behind the tube + 24 mL apparatus = 41.6 mL', () => {
    const p = { deadSpaceMl: 2.2 * 16, ibwKg: 16, weightKg: 16 };
    expect(physicalDeadSpace(p, true)).toBeCloseTo(17.6 + apparatusDeadSpaceMl(16), 9);
  });
  it('the bypass credit never leaves less than 30 % of the anatomical value', () => {
    const p = { deadSpaceMl: 20, ibwKg: 16, weightKg: 16 }; // an artificially small anatomical value: 20 − 17.6 < 6
    expect(physicalDeadSpace(p, true)).toBeCloseTo(6 + apparatusDeadSpaceMl(16), 9);
  });
  it('reads the patient record gasPatient() builds (anatomical 2.2 mL/kg IBW), without the MANUAL fit', () => {
    const pat = gasPatient(undefined);
    expect(physicalDeadSpace(pat, false)).toBeCloseTo(pat.deadSpaceMl, 9);
    expect(physicalDeadSpace(pat, true)).toBeLessThan(pat.deadSpaceMl + apparatusDeadSpaceMl(pat.weightKg));
  });
});
