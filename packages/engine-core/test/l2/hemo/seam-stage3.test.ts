// The Stage 3 seam in Stage 2's haemodynamics: an injected breath signal replaces the fixed 15/min clock.
import { describe, expect, it } from 'vitest';
import { breathU, respFactor } from '../../../src/l2/hemo/params.ts';
import { createCvpState, cvpAt } from '../../../src/l2/hemo/cvp.ts';

describe('Stage 3 breath-signal seam', () => {
  it('without u, respFactor and cvpAt are unchanged; with u they follow it', () => {
    const phi = 0.7;
    expect(respFactor(3, 0.8, phi, 0.2)).toBe(respFactor(3, 0.8, phi, 0.2, (t) => breathU(t, phi)));
    expect(respFactor(3, 0.8, phi, 0.2, () => 0.5)).toBeCloseTo(1, 12); // apnoea: no respiratory variation
    const st = createCvpState();
    expect(cvpAt(st, 3, 6, phi, [], () => 1)).toBeCloseTo(6 + 1.5, 9);
    expect(cvpAt(st, 3, 6, phi, [])).toBeCloseTo(6 + 3 * (breathU(3, phi) - 0.5), 9);
  });
});
