// FU-9 Task A9 (H2, H4; research/13 RH): the 7d kidney alone, on the FU-9 renal rig (70 kg, healthy reference inputs).
import { describe, expect, it } from 'vitest';
import { RENAL_BASE, renalHold, uopMlKgH } from '../../helpers/fu9-renal.ts';

describe('FU-9 H2: filtration equilibrium (Deen, Robertson & Brenner 1972)', () => {
  it('rest: GFR 125 and FF 0.24 unchanged; low flow (MAP 70, CO 4): GFR falls and FF ≤ 0.35 (was GFR held, FF 0.48 under GA)', () => {
    const r = renalHold(RENAL_BASE, 600);
    expect(r.gfr).toBeCloseTo(125, 0);
    expect(r.gfr / (0.55 * r.rbf)).toBeCloseTo(0.239, 2);
    const lo = renalHold({ ...RENAL_BASE, map: 70, coLpm: 4 }, 1800);
    const ff = lo.gfr / (0.55 * lo.rbf);
    console.log(`FU-9 H2: low flow GFR ${lo.gfr.toFixed(0)}, FF ${ff.toFixed(3)}`);
    expect(lo.gfr).toBeLessThan(115);
    expect(ff).toBeLessThanOrEqual(0.35);
  });
});

describe('FU-9 H4: pressure natriuresis on the renal perfusion pressure (tables §5.2 U(RPP))', () => {
  it('awake UOP–MAP curve at CVP 5 unchanged (MAP 80 0.68); intra-abdominal and venous pressure lower the urine', () => {
    expect(uopMlKgH(renalHold({ ...RENAL_BASE, map: 80 }, 1800))).toBeCloseTo(0.68, 1);
    const u0 = uopMlKgH(renalHold(RENAL_BASE, 1800));
    const u15 = uopMlKgH(renalHold({ ...RENAL_BASE, iap: 15 }, 1800));
    const u25 = uopMlKgH(renalHold({ ...RENAL_BASE, iap: 25 }, 1800));
    const cvp15 = uopMlKgH(renalHold({ ...RENAL_BASE, cvp: 15 }, 1800));
    console.log(`FU-9 H4: IAP 0/15/25 → ${u0.toFixed(2)}/${u15.toFixed(2)}/${u25.toFixed(2)}; CVP 15 → ${cvp15.toFixed(2)}`);
    expect(u15).toBeLessThan(u0);
    expect(u25).toBeLessThan(u15);
    expect(cvp15).toBeLessThan(u0);
  });
  // R45 (research/13 H4 acceptance; research/21 SP-08e): WSACS oliguria from IAP 15 and < 0.1 mL/kg/h near IAP 25 need
  // the circulation's share (IAP → venous return and CO, 7a — handed, R-FU9-8): the kidney alone gives 0.81 / 0.69.
  it.fails('IAP 25: UOP < 0.1 mL/kg/h (WSACS) — measured 0.69 (FU-9 H4; the 7a half is handed)', () => {
    expect(uopMlKgH(renalHold({ ...RENAL_BASE, iap: 25 }, 1800))).toBeLessThan(0.1);
  });
});
