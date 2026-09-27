// Pulse ventilator validation targets (audit borrow #2, N-P03: Arnal 2018, Maj 2023, Officer 1998, Karbing 2020),
// reproduced within ±10 % where the catalogue agrees with them (plan Task 21; exclusions listed in the plan).
import { describe, expect, it } from 'vitest';
import { resolveLung } from '../../../src/l2/lung/conditions.ts';
import { createMech } from '../../../src/l2/lung/mechanics.ts';
import { referenceRun } from '../../../src/l2/lung/measure.ts';
import { mechParams } from '../../../src/l2/lung/side.ts';
import type { LungConditionSpec } from '../../../src/types-lung.ts';
import { lungRig, paramsFor, rigOut, runRig } from '../../helpers/lung.ts';

const REF = { vtMl: 420, rr: 16, peep: 5, flowLps: 1, pauseS: 0.3 }; // 60 kg PBW × 7 mL/kg (Pulse's MechanicalVentilator.xlsx patient)
const ok = (x: number, target: number) => expect(Math.abs(x / target - 1)).toBeLessThanOrEqual(0.1);
function mech(specs: LungConditionSpec[]) {
  const { lp } = paramsFor(specs);
  const b = referenceRun(mechParams(lp, lp.side.map((s) => 1 - s.atel - s.consol), [false, false]), createMech(), REF);
  const r = resolveLung(specs, 70).lp;
  const rTot = r.rTube + 1 / (1 / r.side[0]!.rLung + 1 / r.side[1]!.rLung);
  const out = { c: b.cstat, rIn: b.rInsp, rEx: rTot * Math.max(r.side[0]!.rawExp, r.side[1]!.rawExp) };
  console.log(`pulse-targets ${JSON.stringify(specs)}: C ${out.c.toFixed(1)} Rin ${out.rIn.toFixed(1)} Rex ${out.rEx.toFixed(1)}`);
  return out;
}

describe('Pulse ventilator reference values (N-P03) within ±10 %', { timeout: 300_000 }, () => {
  it('healthy: C 54, R 10', () => {
    const m = mech([]);
    ok(m.c, 54);
    ok(m.rIn, 10);
  });
  it('ARDS mild / moderate: C 40 / 35, R 12 (severe C: catalogue 30 vs Pulse 33 — catalogue wins, Q73)', () => {
    const a = mech([{ id: 'ards', severity: 0.33 }]);
    const b = mech([{ id: 'ards', severity: 0.67 }]);
    ok(a.c, 40);
    ok(b.c, 35);
    ok(a.rIn, 12);
    ok(b.rIn, 12);
  });
  it('COPD mild (GOLD 1) / moderate (GOLD 3): Rinsp 12 / 24, Rexp 18 / 36, C 60 / 68', () => {
    const m1 = mech([{ id: 'copd', severity: 0.25 }]);
    const m3 = mech([{ id: 'copd', severity: 0.75 }]);
    ok(m1.rIn, 12);
    ok(m3.rIn, 24);
    ok(m1.rEx, 18);
    ok(m3.rEx, 36);
    ok(m1.c, 60);
    ok(m3.c, 68);
  });
  it('ARDS moderate/severe shunt 0.3 / 0.4 ±10 %; recruitment: PEEP 5 → 15 raises P/F, lowers shunt, PaCO2 within 10 %', () => {
    const sh = (sev: number) => { const r = lungRig([{ id: 'ards', severity: sev }], { vt: 420, rr: 20, peep: 5, ie: 2, fio2: 0.6 }); runRig(r, 600); return r; };
    ok(rigOut(sh(0.67)).shunt, 0.3);
    ok(rigOut(sh(1)).shunt, 0.4);
    console.log(`pulse-targets ARDS shunt ${rigOut(sh(0.67)).shunt.toFixed(3)} / ${rigOut(sh(1)).shunt.toFixed(3)}`);
    const r = sh(0.67);
    const before = rigOut(r);
    r.vent.peep = 15;
    runRig(r, 300);
    const after = rigOut(r);
    expect(after.pao2).toBeGreaterThan(before.pao2);
    expect(after.shunt).toBeLessThan(before.shunt);
    console.log(`pulse-targets PEEP 5→15: PaO2 ${before.pao2.toFixed(0)}→${after.pao2.toFixed(0)} shunt ${before.shunt.toFixed(3)}→${after.shunt.toFixed(3)} PaCO2 ${before.paco2.toFixed(1)}→${after.paco2.toFixed(1)}`);
    ok(after.paco2, before.paco2);
  });
});
