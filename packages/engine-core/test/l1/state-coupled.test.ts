// Stage 3 additions to L1 (brief §4.9): coupled truths, the raw target, Stage 3 variables accepted, 'override'.
import { describe, expect, it } from 'vitest';
import { createL1State, l1Flags, l1Target, l1Value, setL1Target, validateTarget } from '../../src/l1/state.ts';
import { constantRamp } from '../../src/l1/ramp.ts';

describe('l1/state: Stage 3 coupled truths', () => {
  it('spo2, rr, vt, etco2, fio2, shunt and tempCore are accepted; k (Stage 5) is not', () => {
    for (const v of ['spo2', 'rr', 'vt', 'etco2', 'fio2', 'shunt', 'tempCore'] as const) expect(validateTarget(v, undefined, undefined)).toBeUndefined();
    expect(validateTarget('fio2', 0.1, undefined)).toMatch(/0.21/);
    expect(validateTarget('k', 5, undefined)).toMatch(/Stage 5/);
  });

  it('a coupled truth replaces the ramp in l1Value, l1Target still gives the target, and it raises override', () => {
    const st = createL1State();
    setL1Target(st, 'cvp', 0, 8);
    expect(l1Value(st, 'cvp', 1)).toBe(8);
    st.coupled = { cvp: 10.5, spo2: 97.2 };
    expect(l1Value(st, 'cvp', 1)).toBe(10.5);
    expect(l1Target(st, 'cvp', 1)).toBe(8);
    const f = l1Flags(st, 1, constantRamp(75), []);
    expect(f.cvp).toBe('override');
    expect(f.spo2).toBeUndefined(); // 97.2 vs 97: inside the 0.5 tolerance
  });
});
