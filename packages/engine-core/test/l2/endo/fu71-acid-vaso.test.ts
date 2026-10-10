// FU-7.1 B1: the parameter tables' row "pH → catecholamine response `vasoResp`" (§5b.1, Q44) acts on the patient's OWN
// catecholamines — the vascular arm of the stress response — with the same curve 7g applies to an infused one.
import { describe, expect, it } from 'vitest';
import { createEndoCore, NEUTRAL_ENDO_INPUTS, stepEndoCore } from '../../../src/l2/endo/core.ts';
import { acidosisFactor } from '../../../src/l2/pk/pd.ts';

/** A patient under a standing sympathetic drive (the MH surge's size), stepped to a steady state at this pH. */
function surge(ph: number): { svrF: number; hrF: number; vasoResp: number } {
  const c = createEndoCore();
  for (let i = 0; i < 1800; i++) stepEndoCore(c, { ...NEUTRAL_ENDO_INPUTS, ph, mhActivity: 1, tempC: 39.5 }, 1);
  return { svrF: c.out.svrF, hrF: c.out.hrF, vasoResp: c.out.vasoResp };
}

describe('FU-7.1 B1: acidaemia and the endogenous pressor response', () => {
  it('the SVR excess of the surge falls with the pH by `acidosisFactor`, and is unchanged at 7.4', () => {
    const n = surge(7.4);
    expect(n.svrF).toBeGreaterThan(1);
    for (const ph of [7.3, 7.2, 7.16, 7.0]) {
      const a = surge(ph);
      const want = 1 + (n.svrF - 1) * acidosisFactor(ph);
      // eslint-disable-next-line no-console -- the gate note's numbers
      console.log(`FU-7.1 B1 pH ${ph}: svrF ${a.svrF.toFixed(3)} (expected ${want.toFixed(3)}), hrF ${a.hrF.toFixed(3)}`);
      expect(a.svrF).toBeCloseTo(want, 2);
    }
  });
  it('the chronotropic arm is NOT blunted (the sourced septic HR bands; Q-FU71-1) and `vasoResp` still reports the unblunted value', () => {
    expect(surge(7.0).hrF).toBeCloseTo(surge(7.4).hrF, 3);
    expect(surge(7.0).vasoResp).toBeCloseTo(surge(7.4).vasoResp, 6);
  });
  it('a missing pH is 7.4: an engine without 7c behaves exactly as before', () => {
    const c = createEndoCore();
    const d = createEndoCore();
    for (let i = 0; i < 600; i++) {
      stepEndoCore(c, { ...NEUTRAL_ENDO_INPUTS, mhActivity: 1 }, 1);
      const { ph: _drop, ...noPh } = { ...NEUTRAL_ENDO_INPUTS, mhActivity: 1 };
      stepEndoCore(d, noPh as typeof NEUTRAL_ENDO_INPUTS, 1);
    }
    expect(d.out.svrF).toBe(c.out.svrF);
  });
});
