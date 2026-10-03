// FU-9 Task A10 (H6; research/13 RH): the 7d kidney alone, on the FU-9 renal rig (70 kg, healthy reference inputs).
import { describe, expect, it } from 'vitest';
import { RENAL_BASE, renalHold, uopMlKgH } from '../../helpers/fu9-renal.ts';

describe('FU-9 H6: `aki` severity is nephron loss (research/13 H6)', () => {
  it('aki 0.5 → GFR ≈ 75; aki 1 → GFR 15–30 (KDIGO G4–5) and RBF FALLS (was GFR 125 / 51, RBF rising)', () => {
    const h = renalHold(RENAL_BASE, 1800, 0.5);
    const f = renalHold(RENAL_BASE, 1800, 1);
    console.log(`FU-9 H6: aki 0.5 GFR ${h.gfr.toFixed(0)} RBF ${h.rbf.toFixed(0)}; aki 1 GFR ${f.gfr.toFixed(0)} RBF ${f.rbf.toFixed(0)}`);
    expect(h.gfr).toBeGreaterThan(65);
    expect(h.gfr).toBeLessThan(85);
    expect(f.gfr).toBeGreaterThanOrEqual(15);
    expect(f.gfr).toBeLessThanOrEqual(30);
    expect(f.rbf).toBeLessThan(952);
  });
});
