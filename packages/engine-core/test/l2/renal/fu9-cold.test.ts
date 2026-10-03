// FU-9 Task A11 (H10; research/13 RH): the 7d kidney alone, on the FU-9 renal rig (70 kg, healthy reference inputs).
import { describe, expect, it } from 'vitest';
import { coldDiuresis } from '../../../src/l2/renal/model.ts';
import { RENAL_BASE, renalHold, uopMlKgH } from '../../helpers/fu9-renal.ts';

describe('FU-9 H10: cold diuresis (Polderman 2009)', () => {
  it('33 °C → × 1.4 of the excreted fraction; 37 °C unchanged', () => {
    expect(coldDiuresis(37)).toBe(1);
    expect(coldDiuresis(33)).toBeCloseTo(1.4, 9);
    expect(uopMlKgH(renalHold({ ...RENAL_BASE, tempC: 33 }, 1800))).toBeGreaterThan(1.3 * uopMlKgH(renalHold(RENAL_BASE, 1800)));
  });
});
